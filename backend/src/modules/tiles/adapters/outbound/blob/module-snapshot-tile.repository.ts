import { Inject, Injectable, Logger } from "@nestjs/common";
import type {
  ModuleBlobObjectSummary,
  ModuleBlobSnapshotSummary,
  ModuleBlobStoragePort
} from "../../../../runtime-settings/application/ports/module-blob-storage.port";
import { MODULE_BLOB_STORAGE } from "../../../../runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../../../runtime-settings/application/ports/runtime-settings-repository.port";
import { RUNTIME_SETTINGS_REPOSITORY } from "../../../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../../../runtime-settings/domain/runtime-settings.types";
import type { TileRepositoryPort } from "../../../application/ports/tile-repository.port";
import { buildTileProcessCacheKey } from "../../../domain/tile-processing.builders";
import type {
  TileListItem,
  TileListQuery,
  TileListResult,
  TileMetrics,
  TileRecord,
  TileWalkmeshKind
} from "../../../domain/tile.types";
import { StaticTileRepository } from "../memory/static-tile.repository";

interface IndexedTile {
  record: TileRecord;
  listItem: TileListItem;
  searchable: string;
  tilesetLower: string;
  tagsLower: Set<string>;
  processingCacheKey: string;
}

interface SnapshotIndex {
  fetchedAtMs: number;
  byId: Map<string, TileRecord>;
  processingById: Map<string, { cacheKey: string }>;
  items: IndexedTile[];
}

interface TileCandidate {
  resref: string;
  sourceKey: string;
  extension: string;
  sourceSize: number;
  updatedAt: string;
}

const CANDIDATE_EXTENSIONS = new Set(["set", "itp", "mdl", "wok"]);

@Injectable()
export class ModuleSnapshotTileRepository implements TileRepositoryPort {
  private readonly logger = new Logger(ModuleSnapshotTileRepository.name);
  private readonly fallback = new StaticTileRepository();
  private snapshotIndex: SnapshotIndex | null = null;

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort
  ) {}

  async list(query: TileListQuery): Promise<TileListResult> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return this.fallback.list(query);
    }

    const normalizedQuery = query.query?.toLowerCase().trim();
    const normalizedTileset = query.tileset?.toLowerCase().trim();
    const normalizedTag = query.tag?.toLowerCase().trim();

    const filtered = index.items
      .filter((tile) => {
        if (!query.query) {
          return true;
        }
        return tile.searchable.includes(normalizedQuery ?? "");
      })
      .filter((tile) => {
        if (!query.tileset) {
          return true;
        }
        return tile.tilesetLower === normalizedTileset;
      })
      .filter((tile) => {
        if (!query.tag) {
          return true;
        }
        return tile.tagsLower.has(normalizedTag ?? "");
      })
      .filter((tile) => {
        if (typeof query.benchmark !== "boolean") {
          return true;
        }
        return tile.record.benchmark === query.benchmark;
      });

    const items = filtered
      .slice(query.offset, query.offset + query.limit)
      .map((tile) => tile.listItem);

    return {
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    };
  }

  async findById(tileId: string): Promise<TileRecord | null> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return this.fallback.findById(tileId);
    }
    return index.byId.get(tileId) ?? null;
  }

  getPrecomputedTileProcessing(tileId: string): { cacheKey: string } | null {
    if (!this.snapshotIndex) {
      return this.fallback.getPrecomputedTileProcessing?.(tileId) ?? null;
    }
    return this.snapshotIndex.processingById.get(tileId) ?? null;
  }

  private async getSnapshotIndex(): Promise<SnapshotIndex | null> {
    const now = Date.now();
    if (this.snapshotIndex && now - this.snapshotIndex.fetchedAtMs < 30_000) {
      return this.snapshotIndex;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
    const records = buildTilesFromSnapshot(snapshot.objects);
    if (records.length === 0) {
      this.logger.warn(
        "No tile candidates detected in module snapshot (expected tile-like set/itp/mdl/wok files). Falling back to static repository."
      );
      this.snapshotIndex = null;
      return null;
    }

    const benchmarkIds = pickBenchmarkIds(records);
    const indexed = records
      .map((record) => mapCandidateToTileRecord(record, benchmarkIds))
      .sort((left, right) => left.tileId.localeCompare(right.tileId))
      .map((record) => ({
        record,
        listItem: mapTileToListItem(record),
        searchable: buildTileSearchableText(record),
        tilesetLower: record.tileset.toLowerCase(),
        tagsLower: new Set(record.tags.map((tag) => tag.toLowerCase())),
        processingCacheKey: buildTileProcessCacheKey(record)
      }));

    this.snapshotIndex = {
      fetchedAtMs: now,
      items: indexed,
      byId: new Map(indexed.map((entry) => [entry.record.tileId, entry.record])),
      processingById: new Map(
        indexed.map((entry) => [entry.record.tileId, { cacheKey: entry.processingCacheKey }])
      )
    };
    return this.snapshotIndex;
  }

  private async listAllModuleSnapshotObjects(
    settings: BlobStorageSettings
  ): Promise<ModuleBlobSnapshotSummary> {
    const objects: ModuleBlobObjectSummary[] = [];
    let continuationToken: string | undefined;
    let moduleHash: string | undefined;
    let prefix = normalizePrefixForLookup(settings.modulePrefix);

    do {
      const page = await this.moduleBlobStorage.listModuleSnapshot(settings, {
        limit: 1000,
        continuationToken
      });
      moduleHash = moduleHash ?? page.moduleHash;
      prefix = page.prefix;
      objects.push(...page.objects);
      continuationToken = page.continuationToken;
      if (!page.truncated || !continuationToken) {
        break;
      }
    } while (true);

    const totalBytes = objects.reduce((sum, object) => sum + object.size, 0);
    return {
      bucket: settings.bucket,
      prefix,
      moduleHash,
      totalFiles: objects.length,
      totalBytes,
      objects,
      truncated: false
    };
  }
}

function buildTilesFromSnapshot(objects: ModuleBlobObjectSummary[]): TileCandidate[] {
  const byResref = new Map<string, TileCandidate>();

  for (const object of objects) {
    const fileName = extractFileName(object.key);
    const extension = extractExtension(fileName);
    if (!CANDIDATE_EXTENSIONS.has(extension)) {
      continue;
    }

    const basename = normalizeResref(extractBasename(fileName));
    if (!looksLikeTileResref(basename, object.key)) {
      continue;
    }

    const current = byResref.get(basename);
    const next: TileCandidate = {
      resref: basename,
      sourceKey: object.key,
      extension,
      sourceSize: object.size,
      updatedAt: object.lastModified ?? new Date().toISOString()
    };

    if (!current) {
      byResref.set(basename, next);
      continue;
    }

    const scoreDelta = extensionScore(next.extension) - extensionScore(current.extension);
    if (scoreDelta > 0) {
      byResref.set(basename, next);
      continue;
    }
    if (scoreDelta === 0 && next.sourceSize > current.sourceSize) {
      byResref.set(basename, next);
      continue;
    }
    if (
      scoreDelta === 0 &&
      next.sourceSize === current.sourceSize &&
      next.updatedAt > current.updatedAt
    ) {
      byResref.set(basename, next);
    }
  }

  return [...byResref.values()];
}

function mapCandidateToTileRecord(candidate: TileCandidate, benchmarkIds: Set<string>): TileRecord {
  const tileset = inferTileset(candidate);
  const variant = inferVariant(candidate.resref);
  const walkmesh = inferWalkmesh(candidate);
  const metrics = estimateMetrics(candidate);
  const benchmark = benchmarkIds.has(candidate.resref);

  return {
    tileId: `tile_${candidate.resref}`.slice(0, 80),
    resref: candidate.resref,
    name: humanizeName(candidate.resref),
    tileset,
    variant,
    tags: buildTags(candidate, tileset, variant, walkmesh),
    benchmark,
    previewImageUrl: `/assets/previews/tiles/${candidate.resref}.webp`,
    textureAtlasId: `atlas_tile_${tileset}_v1`,
    walkmesh,
    metrics,
    updatedAt: candidate.updatedAt
  };
}

function pickBenchmarkIds(records: TileCandidate[]): Set<string> {
  const sorted = records.slice().sort((left, right) => right.sourceSize - left.sourceSize);
  const count = sorted.length === 0 ? 0 : Math.min(10, Math.max(1, Math.ceil(sorted.length * 0.2)));
  return new Set(sorted.slice(0, count).map((entry) => entry.resref));
}

function looksLikeTileResref(resref: string, sourceKey: string): boolean {
  if (resref.length < 4) {
    return false;
  }
  const normalizedKey = sourceKey.replace(/\\/gu, "/").toLowerCase();
  if (normalizedKey.includes("/tile/") || normalizedKey.includes("/tiles/")) {
    return true;
  }
  return /^t[a-z0-9_]+$/u.test(resref);
}

function extensionScore(extension: string): number {
  switch (extension) {
    case "set":
      return 4;
    case "mdl":
      return 3;
    case "wok":
      return 2;
    case "itp":
      return 1;
    default:
      return 0;
  }
}

function inferTileset(candidate: TileCandidate): string {
  const normalized = candidate.sourceKey.replace(/\\/gu, "/").toLowerCase();
  const known = ["city", "forest", "dungeon", "swamp", "rural", "desert"];
  for (const value of known) {
    if (normalized.includes(value) || candidate.resref.includes(value)) {
      return value;
    }
  }

  const token = candidate.resref.split(/[_-]+/u)[0] ?? "generic";
  return token.slice(0, 12) || "generic";
}

function inferVariant(resref: string): string {
  const tokens = resref.split(/[_-]+/u).filter((token) => token.length > 0);
  if (tokens.length <= 1) {
    return "standard";
  }
  return tokens[1].slice(0, 24);
}

function inferWalkmesh(candidate: TileCandidate): TileWalkmeshKind {
  const normalized = `${candidate.resref}|${candidate.sourceKey}`.toLowerCase();
  if (/(water|river|swamp|shore)/u.test(normalized)) {
    return "water";
  }
  if (/(block|blocked|wall|rubble|closed)/u.test(normalized)) {
    return "blocked";
  }
  return "walkable";
}

function estimateMetrics(candidate: TileCandidate): TileMetrics {
  const meshes = clamp(Math.round(candidate.sourceSize / 12000), 1, 64);
  const triangles = clamp(Math.round(candidate.sourceSize / 180), 64, 20000);
  const emitters = /(vfx|emit|particle|fire|smoke)/u.test(candidate.sourceKey.toLowerCase())
    ? 1
    : 0;
  return {
    triangles,
    meshes,
    emitters
  };
}

function buildTags(
  candidate: TileCandidate,
  tileset: string,
  variant: string,
  walkmesh: TileWalkmeshKind
): string[] {
  const tags = new Set<string>();
  tags.add("tile");
  tags.add(tileset);
  tags.add(variant);
  tags.add(walkmesh);
  tags.add(candidate.extension);

  for (const token of candidate.resref.split(/[_-]+/u)) {
    if (token.length >= 3 && token.length <= 24) {
      tags.add(token);
    }
  }

  return [...tags].slice(0, 12);
}

function mapTileToListItem(tile: TileRecord): TileListItem {
  return {
    tileId: tile.tileId,
    resref: tile.resref,
    name: tile.name,
    tileset: tile.tileset,
    variant: tile.variant,
    tags: tile.tags,
    benchmark: tile.benchmark,
    previewImageUrl: tile.previewImageUrl,
    walkmesh: tile.walkmesh,
    metrics: tile.metrics,
    updatedAt: tile.updatedAt
  };
}

function buildTileSearchableText(tile: TileRecord): string {
  return [tile.name, tile.tileId, tile.resref, ...tile.tags].join("|").toLowerCase();
}

function extractFileName(key: string): string {
  const normalized = key.replace(/\\/gu, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] ?? normalized;
}

function extractExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");
  if (index <= 0) {
    return "";
  }
  return normalized.slice(index + 1);
}

function extractBasename(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");
  if (index <= 0) {
    return normalized;
  }
  return normalized.slice(0, index);
}

function normalizeResref(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gu, "_").slice(0, 64);
}

function humanizeName(resref: string): string {
  return resref
    .split(/[_-]+/u)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizePrefixForLookup(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}
