import { createHash } from "node:crypto";
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
  AreaRecord,
  AreaSoundReference
} from "../../../domain/area.types";
import {
  type ParsedAreaMetadataBlueprint,
  type ParsedAreaObjectBlueprint,
  type ParsedAreaPlacementBlueprint,
  parseAreaMetadataFromAreGff,
  parseAreaObjectsFromGitGff
} from "./aurora-gff-area-parser";
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
  areSourceKey: string;
  areSourceSize: number;
  areSourceEtag?: string;
  areUpdatedAt: string;
  gitSourceKey?: string;
  gitSourceSize?: number;
  gitSourceEtag?: string;
  gitUpdatedAt?: string;
  parsedArea?: ParsedAreaMetadataBlueprint;
  parsedObjects?: ParsedAreaObjectBlueprint;
  sourceFingerprint: string;
}

const DEFAULT_SOUND_BINDING_KEYS = {
  areaKey: "GI_sound_area" as const,
  randomKey: "GI_sound_rndm" as const,
  positionalKey: "GI_sound_pos" as const
};

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
    const candidates = buildAreaCandidatesFromSnapshot(snapshot.objects);
    await this.enrichAreaCandidatesFromSnapshot(settings.blobStorage, candidates);

    if (candidates.length === 0) {
      this.logger.warn(
        "No area files detected in module snapshot (expected: *.are). Falling back to static repository."
      );
      this.snapshotIndex = null;
      return null;
    }

    const benchmarkIds = pickBenchmarkIds(candidates);
    const indexed = candidates
      .map((candidate) => mapCandidateToAreaRecord(candidate, benchmarkIds))
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

  private async enrichAreaCandidatesFromSnapshot(
    settings: BlobStorageSettings,
    candidates: AreaCandidate[]
  ): Promise<void> {
    await mapWithConcurrency(candidates, 6, async (candidate) => {
      try {
        const arePayload = await this.moduleBlobStorage.getModuleObject(settings, candidate.areSourceKey);
        if (arePayload) {
          candidate.areSourceSize = arePayload.size;
          candidate.areSourceEtag = arePayload.etag ?? candidate.areSourceEtag;
          candidate.areUpdatedAt = arePayload.lastModified ?? candidate.areUpdatedAt;
          candidate.parsedArea = parseAreaMetadataFromAreGff(arePayload.bytes) ?? undefined;
        }
      } catch {
        // Keep heuristics if binary payload is unavailable.
      }

      if (candidate.gitSourceKey) {
        try {
          const gitPayload = await this.moduleBlobStorage.getModuleObject(
            settings,
            candidate.gitSourceKey
          );
          if (gitPayload) {
            candidate.gitSourceSize = gitPayload.size;
            candidate.gitSourceEtag = gitPayload.etag ?? candidate.gitSourceEtag;
            candidate.gitUpdatedAt = gitPayload.lastModified ?? candidate.gitUpdatedAt;
            candidate.parsedObjects = parseAreaObjectsFromGitGff(gitPayload.bytes) ?? undefined;
          }
        } catch {
          // Keep heuristics if binary payload is unavailable.
        }
      }

      candidate.sourceFingerprint = buildSourceFingerprint(candidate);
    });
  }
}

function buildAreaCandidatesFromSnapshot(objects: ModuleBlobObjectSummary[]): AreaCandidate[] {
  const byResref = new Map<string, AreaCandidate>();

  for (const object of objects) {
    const fileName = extractFileName(object.key);
    const extension = extractExtension(fileName);
    if (extension !== "are" && extension !== "git") {
      continue;
    }

    const resref = normalizeResref(extractBasename(fileName));
    if (resref.length < 2) {
      continue;
    }

    const current = byResref.get(resref) ?? createEmptyAreaCandidate(resref);
    if (extension === "are") {
      updateAreaSource(current, object);
    } else {
      updateGitSource(current, object);
    }
    current.sourceFingerprint = buildSourceFingerprint(current);
    byResref.set(resref, current);
  }

  return [...byResref.values()].filter((candidate) => candidate.areSourceKey.length > 0);
}

function createEmptyAreaCandidate(resref: string): AreaCandidate {
  return {
    resref,
    areSourceKey: "",
    areSourceSize: 0,
    areUpdatedAt: new Date().toISOString(),
    sourceFingerprint: ""
  };
}

function updateAreaSource(candidate: AreaCandidate, object: ModuleBlobObjectSummary): void {
  if (!candidate.areSourceKey) {
    candidate.areSourceKey = object.key;
    candidate.areSourceSize = object.size;
    candidate.areSourceEtag = object.etag;
    candidate.areUpdatedAt = object.lastModified ?? candidate.areUpdatedAt;
    return;
  }

  const candidateUpdatedAt = object.lastModified ?? candidate.areUpdatedAt;
  if (object.size > candidate.areSourceSize) {
    candidate.areSourceKey = object.key;
    candidate.areSourceSize = object.size;
    candidate.areSourceEtag = object.etag;
    candidate.areUpdatedAt = candidateUpdatedAt;
    return;
  }
  if (object.size === candidate.areSourceSize && candidateUpdatedAt > candidate.areUpdatedAt) {
    candidate.areSourceKey = object.key;
    candidate.areSourceEtag = object.etag;
    candidate.areUpdatedAt = candidateUpdatedAt;
  }
}

function updateGitSource(candidate: AreaCandidate, object: ModuleBlobObjectSummary): void {
  if (!candidate.gitSourceKey) {
    candidate.gitSourceKey = object.key;
    candidate.gitSourceSize = object.size;
    candidate.gitSourceEtag = object.etag;
    candidate.gitUpdatedAt = object.lastModified ?? candidate.areUpdatedAt;
    return;
  }

  const currentSize = candidate.gitSourceSize ?? 0;
  const currentUpdated = candidate.gitUpdatedAt ?? candidate.areUpdatedAt;
  const nextUpdated = object.lastModified ?? currentUpdated;

  if (object.size > currentSize) {
    candidate.gitSourceKey = object.key;
    candidate.gitSourceSize = object.size;
    candidate.gitSourceEtag = object.etag;
    candidate.gitUpdatedAt = nextUpdated;
    return;
  }
  if (object.size === currentSize && nextUpdated > currentUpdated) {
    candidate.gitSourceKey = object.key;
    candidate.gitSourceEtag = object.etag;
    candidate.gitUpdatedAt = nextUpdated;
  }
}

function mapCandidateToAreaRecord(candidate: AreaCandidate, benchmarkIds: Set<string>): AreaRecord {
  const biome = inferBiome(candidate);
  const dimensions = resolveDimensions(candidate);
  const areaId = `area_${candidate.resref}`.slice(0, 80);
  const objects = buildAreaObjects(candidate);
  const updatedAt = chooseUpdatedAt(candidate);

  return {
    areaId,
    name: resolveAreaName(candidate),
    biome,
    width: dimensions.width,
    height: dimensions.height,
    tags: buildTags(candidate, biome),
    benchmark: benchmarkIds.has(candidate.resref),
    previewImageUrl: `/assets/previews/areas/${candidate.resref}.webp`,
    textureAtlasId: buildTextureAtlasId(candidate, biome),
    textureAtlasObjectKey: candidate.areSourceKey,
    textureAtlasContentType: "application/octet-stream",
    textureAtlasSizeBytes: candidate.areSourceSize,
    textureAtlasEtag: candidate.areSourceEtag,
    textureAtlasFingerprint: buildAtlasFingerprint(candidate),
    objects,
    soundscape: buildAreaSoundscape(candidate, biome),
    updatedAt
  };
}

function pickBenchmarkIds(records: AreaCandidate[]): Set<string> {
  const scored = records
    .slice()
    .sort((left, right) => scoreCandidate(right) - scoreCandidate(left));
  const count = scored.length === 0 ? 0 : Math.min(10, Math.max(1, Math.ceil(scored.length * 0.2)));
  return new Set(scored.slice(0, count).map((entry) => entry.resref));
}

function scoreCandidate(candidate: AreaCandidate): number {
  const objectCount =
    (candidate.parsedObjects?.placeables.length ?? 0) +
    (candidate.parsedObjects?.doors.length ?? 0) +
    (candidate.parsedObjects?.creatures.length ?? 0) +
    (candidate.parsedObjects?.items.length ?? 0);
  return candidate.areSourceSize + (candidate.gitSourceSize ?? 0) + objectCount * 1024;
}

function inferBiome(candidate: AreaCandidate): string {
  const normalized = [
    candidate.resref,
    candidate.areSourceKey,
    candidate.gitSourceKey ?? "",
    candidate.parsedArea?.tileSet ?? ""
  ]
    .join("|")
    .toLowerCase();

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

function resolveDimensions(candidate: AreaCandidate): { width: number; height: number } {
  const parsedWidth = candidate.parsedArea?.width;
  const parsedHeight = candidate.parsedArea?.height;

  if (isPositiveInt(parsedWidth) && isPositiveInt(parsedHeight)) {
    return {
      width: clamp(parsedWidth, 1, 256),
      height: clamp(parsedHeight, 1, 256)
    };
  }

  const tileCount = candidate.parsedArea?.tileCount;
  if (isPositiveInt(tileCount)) {
    const base = clamp(Math.round(Math.sqrt(tileCount)), 8, 64);
    return {
      width: base,
      height: clamp(Math.ceil(tileCount / base), 8, 64)
    };
  }

  return estimateDimensions(candidate.areSourceSize);
}

function resolveAreaName(candidate: AreaCandidate): string {
  const parsedName = candidate.parsedArea?.name;
  if (parsedName && parsedName.trim().length > 0) {
    return parsedName.trim();
  }
  return humanizeName(candidate.resref);
}

function buildTextureAtlasId(candidate: AreaCandidate, biome: string): string {
  const tileSet = normalizeResref(candidate.parsedArea?.tileSet ?? "");
  if (tileSet.length > 0) {
    return `atlas_${tileSet}_v1`.slice(0, 80);
  }
  return `atlas_${biome}_v1`;
}

function buildAreaObjects(candidate: AreaCandidate): AreaRecord["objects"] {
  const placements = candidate.parsedObjects;
  if (!placements) {
    return [];
  }

  const usedIds = new Set<string>();
  const objects: AreaRecord["objects"] = [];

  appendPlacements(objects, usedIds, placements.placeables, "placeable");
  appendPlacements(objects, usedIds, placements.doors, "placeable");
  appendPlacements(objects, usedIds, placements.creatures, "creature");
  appendPlacements(objects, usedIds, placements.items, "item");

  return objects;
}

function appendPlacements(
  output: AreaRecord["objects"],
  usedIds: Set<string>,
  placements: ParsedAreaPlacementBlueprint[],
  kind: AreaRecord["objects"][number]["kind"]
): void {
  const prefix = kind === "creature" ? "cre" : kind === "item" ? "itm" : "plc";

  placements.forEach((placement, index) => {
    const templateResRef = normalizeResref(placement.templateResRef ?? "");
    const templateId = templateResRef
      ? `${prefix}_${templateResRef}`.slice(0, 80)
      : `${prefix}_unknown_${String(index + 1).padStart(3, "0")}`;

    const objectId = buildStableObjectId(usedIds, {
      tag: placement.tag,
      templateResRef,
      kind,
      index
    });

    output.push({
      objectId,
      kind,
      templateId,
      x: clampCoordinate(placement.x),
      y: clampCoordinate(placement.y),
      z: clampCoordinate(placement.z),
      bearing: clampBearing(placement.bearing)
    });
  });
}

function buildStableObjectId(
  usedIds: Set<string>,
  input: { tag?: string; templateResRef?: string; kind: "placeable" | "creature" | "item"; index: number }
): string {
  const kindPrefix = input.kind === "creature" ? "cre" : input.kind === "item" ? "itm" : "plc";
  const baseToken = normalizeResref(input.tag ?? "") || input.templateResRef || `entry_${input.index + 1}`;
  const base = `obj_${kindPrefix}_${baseToken}`.slice(0, 72);

  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }

  let suffix = 2;
  while (suffix < 9999) {
    const candidate = `${base}_${suffix}`.slice(0, 80);
    if (!usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
    suffix += 1;
  }

  const fallback = `obj_${kindPrefix}_${input.index + 1}_${Date.now()}`.slice(0, 80);
  usedIds.add(fallback);
  return fallback;
}

function chooseUpdatedAt(candidate: AreaCandidate): string {
  const git = candidate.gitUpdatedAt ?? "";
  return git > candidate.areUpdatedAt ? git : candidate.areUpdatedAt;
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

  const parsedTag = normalizeResref(candidate.parsedArea?.tag ?? "");
  if (parsedTag.length > 0) {
    for (const token of parsedTag.split(/[_-]+/u)) {
      if (token.length >= 3 && token.length <= 24) {
        tags.add(token);
      }
    }
  }

  const tileSet = normalizeResref(candidate.parsedArea?.tileSet ?? "");
  if (tileSet.length > 0) {
    tags.add(tileSet);
  }

  const objectCount =
    (candidate.parsedObjects?.placeables.length ?? 0) +
    (candidate.parsedObjects?.doors.length ?? 0) +
    (candidate.parsedObjects?.creatures.length ?? 0) +
    (candidate.parsedObjects?.items.length ?? 0);
  if (objectCount > 0) {
    tags.add("git");
    tags.add("objects");
  }

  return [...tags].slice(0, 16);
}

function buildAreaSoundscape(
  candidate: AreaCandidate,
  biome: string
): AreaRecord["soundscape"] {
  const ids = candidate.parsedArea?.soundIds;
  const area: AreaSoundReference[] = [];

  if (isPositiveInt(ids?.ambientDay)) {
    area.push({
      soundId: `sound_ambient_day_${ids!.ambientDay}`,
      resref: `ambient_day_${ids!.ambientDay}`,
      category: "ambient",
      playbackMode: "interval",
      ambientOnly: true
    });
  }
  if (isPositiveInt(ids?.ambientNight)) {
    area.push({
      soundId: `sound_ambient_night_${ids!.ambientNight}`,
      resref: `ambient_night_${ids!.ambientNight}`,
      category: "ambient",
      playbackMode: "interval",
      ambientOnly: true
    });
  }
  if (isPositiveInt(ids?.musicDay)) {
    area.push({
      soundId: `sound_music_day_${ids!.musicDay}`,
      resref: `music_day_${ids!.musicDay}`,
      category: "music",
      playbackMode: "continuous",
      ambientOnly: true
    });
  }
  if (isPositiveInt(ids?.musicNight)) {
    area.push({
      soundId: `sound_music_night_${ids!.musicNight}`,
      resref: `music_night_${ids!.musicNight}`,
      category: "music",
      playbackMode: "continuous",
      ambientOnly: true
    });
  }
  if (isPositiveInt(ids?.musicBattle)) {
    area.push({
      soundId: `sound_music_battle_${ids!.musicBattle}`,
      resref: `music_battle_${ids!.musicBattle}`,
      category: "music",
      playbackMode: "continuous",
      ambientOnly: false
    });
  }

  if (area.length === 0) {
    const normalized = `${candidate.resref}|${candidate.areSourceKey}|${biome}`.toLowerCase();
    const areaAmbientResref = normalized.includes("city")
      ? "amb_city_market_day"
      : normalized.includes("swamp")
        ? "amb_swamp_night"
        : "amb_forest_day";

    area.push({
      soundId: `sound_${areaAmbientResref}`.slice(0, 72),
      resref: areaAmbientResref,
      category: "ambient",
      playbackMode: "interval",
      ambientOnly: true
    });
  }

  const random: AreaRecord["soundscape"]["random"] = [
    {
      soundId: "sound_sfx_door_creak_long",
      resref: "sfx_door_creak_long",
      category: "effect",
      playbackMode: "random",
      ambientOnly: false
    }
  ];

  const positional: AreaRecord["soundscape"]["positional"] =
    biome === "urban"
      ? [
          {
            soundId: "sound_sfx_forge_loop_heavy",
            resref: "sfx_forge_loop_heavy",
            category: "effect",
            playbackMode: "looping",
            ambientOnly: false
          }
        ]
      : [];

  return {
    bindingKeys: DEFAULT_SOUND_BINDING_KEYS,
    area,
    random,
    positional
  };
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

function buildAtlasFingerprint(candidate: AreaCandidate): string {
  return createHash("sha256")
    .update(
      [
        candidate.resref,
        candidate.areSourceKey,
        String(candidate.areSourceSize),
        candidate.areSourceEtag ?? "",
        candidate.areUpdatedAt,
        candidate.gitSourceKey ?? "",
        String(candidate.gitSourceSize ?? 0),
        candidate.gitSourceEtag ?? "",
        candidate.gitUpdatedAt ?? "",
        candidate.parsedArea?.dependencyFingerprint ?? "",
        candidate.parsedObjects?.dependencyFingerprint ?? ""
      ].join("|")
    )
    .digest("hex");
}

function buildSourceFingerprint(candidate: AreaCandidate): string {
  return createHash("sha256")
    .update(
      [
        candidate.resref,
        candidate.areSourceKey,
        String(candidate.areSourceSize),
        candidate.areSourceEtag ?? "",
        candidate.areUpdatedAt,
        candidate.gitSourceKey ?? "",
        String(candidate.gitSourceSize ?? 0),
        candidate.gitSourceEtag ?? "",
        candidate.gitUpdatedAt ?? "",
        candidate.parsedArea?.sourceFileType ?? "",
        candidate.parsedArea?.sourceFileVersion ?? "",
        String(candidate.parsedArea?.sourceStructTypeId ?? -1),
        candidate.parsedArea?.dependencyFingerprint ?? "",
        candidate.parsedObjects?.sourceFileType ?? "",
        candidate.parsedObjects?.sourceFileVersion ?? "",
        String(candidate.parsedObjects?.sourceStructTypeId ?? -1),
        candidate.parsedObjects?.dependencyFingerprint ?? ""
      ].join("|")
    )
    .digest("hex");
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

function isPositiveInt(value: number | undefined): value is number {
  return Number.isInteger(value) && (value ?? 0) > 0;
}

function clampCoordinate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(4));
}

function clampBearing(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const normalized = ((value % 360) + 360) % 360;
  return Number(normalized.toFixed(4));
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

function normalizePrefixForLookup(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<void>
): Promise<void> {
  if (values.length === 0) {
    return;
  }

  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, values.length)) }, () =>
    (async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= values.length) {
          return;
        }
        await mapper(values[index], index);
      }
    })()
  );

  await Promise.all(workers);
}
