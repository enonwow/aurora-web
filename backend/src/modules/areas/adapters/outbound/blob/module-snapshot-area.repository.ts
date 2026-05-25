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
import type { AreaRepositoryPort } from "../../../application/ports/area-repository.port";
import { buildAreaProcessCacheKey, countAreaObjectsByKind } from "../../../domain/area-processing.builders";
import type {
  AreaListItem,
  AreaListQuery,
  AreaListResult,
  AreaObjectCounts,
  AreaRecord
} from "../../../domain/area.types";
import { StaticAreaRepository } from "../memory/static-area.repository";

interface IndexedArea {
  record: AreaRecord;
  listItem: AreaListItem;
  composition: AreaObjectCounts;
  processingCacheKey: string;
  searchable: string;
  biomeLower: string;
  tagsLower: Set<string>;
}

interface SnapshotIndex {
  fetchedAtMs: number;
  byId: Map<string, AreaRecord>;
  processingById: Map<string, { cacheKey: string; composition: AreaObjectCounts }>;
  items: IndexedArea[];
}

interface AreaCandidate {
  resref: string;
  sourceKey: string;
  sourceSize: number;
  updatedAt: string;
}

@Injectable()
export class ModuleSnapshotAreaRepository implements AreaRepositoryPort {
  private readonly logger = new Logger(ModuleSnapshotAreaRepository.name);
  private readonly fallback = new StaticAreaRepository();
  private snapshotIndex: SnapshotIndex | null = null;

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort
  ) {}

  async list(query: AreaListQuery): Promise<AreaListResult> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return this.fallback.list(query);
    }

    const normalizedQuery = query.query?.toLowerCase().trim();
    const normalizedBiome = query.biome?.toLowerCase().trim();
    const normalizedTag = query.tag?.toLowerCase().trim();

    const filtered = index.items
      .filter((area) => {
        if (!query.query) {
          return true;
        }
        return area.searchable.includes(normalizedQuery ?? "");
      })
      .filter((area) => {
        if (!query.biome) {
          return true;
        }
        return area.biomeLower === normalizedBiome;
      })
      .filter((area) => {
        if (!query.tag) {
          return true;
        }
        return area.tagsLower.has(normalizedTag ?? "");
      })
      .filter((area) => {
        if (typeof query.benchmark !== "boolean") {
          return true;
        }
        return area.record.benchmark === query.benchmark;
      });

    const items = filtered
      .slice(query.offset, query.offset + query.limit)
      .map((area) => area.listItem);
    return {
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    };
  }

  async findById(areaId: string): Promise<AreaRecord | null> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return this.fallback.findById(areaId);
    }
    return index.byId.get(areaId) ?? null;
  }

  getPrecomputedAreaProcessing(
    areaId: string
  ): { cacheKey: string; composition: AreaObjectCounts } | null {
    if (!this.snapshotIndex) {
      return this.fallback.getPrecomputedAreaProcessing?.(areaId) ?? null;
    }
    return this.snapshotIndex.processingById.get(areaId) ?? null;
  }

  private async getSnapshotIndex(): Promise<SnapshotIndex | null> {
    const now = Date.now();
    if (this.snapshotIndex && now - this.snapshotIndex.fetchedAtMs < 30_000) {
      return this.snapshotIndex;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
    const records = buildAreasFromSnapshot(snapshot.objects);
    if (records.length === 0) {
      this.logger.warn(
        "No area files detected in module snapshot (expected: *.are). Falling back to static repository."
      );
      this.snapshotIndex = null;
      return null;
    }

    const benchmarkIds = pickBenchmarkIds(records);
    const indexed = records
      .map((record) => mapCandidateToAreaRecord(record, benchmarkIds))
      .sort((left, right) => left.areaId.localeCompare(right.areaId))
      .map((record) => {
        const composition = countAreaObjectsByKind(record.objects);
        return {
          record,
          listItem: mapAreaToListItem(record, composition),
          composition,
          processingCacheKey: buildAreaProcessCacheKey(record),
          searchable: buildAreaSearchableText(record),
          biomeLower: record.biome.toLowerCase(),
          tagsLower: new Set(record.tags.map((tag) => tag.toLowerCase()))
        };
      });

    this.snapshotIndex = {
      fetchedAtMs: now,
      items: indexed,
      byId: new Map(indexed.map((entry) => [entry.record.areaId, entry.record])),
      processingById: new Map(
        indexed.map((entry) => [
          entry.record.areaId,
          {
            cacheKey: entry.processingCacheKey,
            composition: entry.composition
          }
        ])
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

function buildAreasFromSnapshot(objects: ModuleBlobObjectSummary[]): AreaCandidate[] {
  const byResref = new Map<string, AreaCandidate>();

  for (const object of objects) {
    const fileName = extractFileName(object.key);
    const extension = extractExtension(fileName);
    if (extension !== "are") {
      continue;
    }

    const resref = normalizeResref(extractBasename(fileName));
    if (resref.length < 2) {
      continue;
    }

    const current = byResref.get(resref);
    const next: AreaCandidate = {
      resref,
      sourceKey: object.key,
      sourceSize: object.size,
      updatedAt: object.lastModified ?? new Date().toISOString()
    };

    if (!current) {
      byResref.set(resref, next);
      continue;
    }

    if (next.sourceSize > current.sourceSize) {
      byResref.set(resref, next);
      continue;
    }
    if (next.sourceSize === current.sourceSize && next.updatedAt > current.updatedAt) {
      byResref.set(resref, next);
    }
  }

  return [...byResref.values()];
}

function mapCandidateToAreaRecord(candidate: AreaCandidate, benchmarkIds: Set<string>): AreaRecord {
  const biome = inferBiome(candidate);
  const dimensions = estimateDimensions(candidate.sourceSize);
  const areaId = `area_${candidate.resref}`.slice(0, 80);

  return {
    areaId,
    name: humanizeName(candidate.resref),
    biome,
    width: dimensions.width,
    height: dimensions.height,
    tags: buildTags(candidate, biome),
    benchmark: benchmarkIds.has(candidate.resref),
    previewImageUrl: `/assets/previews/areas/${candidate.resref}.webp`,
    textureAtlasId: `atlas_${biome}_v1`,
    objects: [],
    updatedAt: candidate.updatedAt
  };
}

function pickBenchmarkIds(records: AreaCandidate[]): Set<string> {
  const sorted = records.slice().sort((left, right) => right.sourceSize - left.sourceSize);
  const count = sorted.length === 0 ? 0 : Math.min(10, Math.max(1, Math.ceil(sorted.length * 0.2)));
  return new Set(sorted.slice(0, count).map((entry) => entry.resref));
}

function inferBiome(candidate: AreaCandidate): string {
  const normalized = `${candidate.resref}|${candidate.sourceKey}`.toLowerCase();
  if (/(city|urban|market)/u.test(normalized)) {
    return "urban";
  }
  if (/(dungeon|crypt|cave)/u.test(normalized)) {
    return "dungeon";
  }
  if (/(swamp|marsh)/u.test(normalized)) {
    return "swamp";
  }
  if (/(forest|wood)/u.test(normalized)) {
    return "forest";
  }
  if (/(desert|sand)/u.test(normalized)) {
    return "desert";
  }
  return "generic";
}

function estimateDimensions(size: number): { width: number; height: number } {
  const base = clamp(Math.round(Math.sqrt(Math.max(size, 256)) / 8), 8, 64);
  const width = base % 2 === 0 ? base : base + 1;
  const height = clamp(width, 8, 64);
  return {
    width,
    height
  };
}

function buildTags(candidate: AreaCandidate, biome: string): string[] {
  const tags = new Set<string>();
  tags.add("area");
  tags.add(biome);

  for (const token of candidate.resref.split(/[_-]+/u)) {
    if (token.length >= 3 && token.length <= 24) {
      tags.add(token);
    }
  }

  return [...tags].slice(0, 12);
}

function mapAreaToListItem(area: AreaRecord, composition: AreaObjectCounts): AreaListItem {
  return {
    areaId: area.areaId,
    name: area.name,
    biome: area.biome,
    width: area.width,
    height: area.height,
    tags: area.tags,
    benchmark: area.benchmark,
    previewImageUrl: area.previewImageUrl,
    textureAtlasId: area.textureAtlasId,
    objectCounts: composition,
    updatedAt: area.updatedAt
  };
}

function buildAreaSearchableText(area: AreaRecord): string {
  return [area.name, area.areaId, ...area.tags].join("|").toLowerCase();
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
