import { createHash } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ModuleBlobObjectSummary } from "../../../../runtime-settings/application/ports/module-blob-storage.port";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobSnapshotSummary,
  type ModuleBlobStoragePort
} from "../../../../runtime-settings/application/ports/module-blob-storage.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../../../runtime-settings/domain/runtime-settings.types";
import type { SoundRepositoryPort } from "../../../application/ports/sound-repository.port";
import { buildSoundProcessCacheKey } from "../../../domain/sound-processing.builders";
import type {
  SoundCategory,
  SoundFormat,
  SoundListItem,
  SoundListQuery,
  SoundListResult,
  SoundPlaybackMode,
  SoundAuroraUsageHint,
  SoundRecord,
  SoundReverseMapping,
  SoundSourceLayer
} from "../../../domain/sound.types";

interface IndexedSound {
  record: SoundRecord;
  listItem: SoundListItem;
  processingCacheKey: string;
  searchable: string;
  categoryLower: string;
  formatLower: string;
  spatialModeLower: string;
  bindingKeyLower: string;
  sourceFieldLower: string;
  defaultsTableLower: string | null;
  tagsLower: Set<string>;
}

interface SnapshotIndex {
  cacheKey: string;
  fetchedAtMs: number;
  items: IndexedSound[];
  byId: Map<string, SoundRecord>;
  processingById: Map<string, { cacheKey: string }>;
}

interface SoundCandidate {
  soundId: string;
  resref: string;
  name: string;
  category: SoundCategory;
  tags: string[];
  previewWaveformUrl: string;
  audioAssetId: string;
  sourceObjectKey: string;
  sourceContentType: string;
  sourceSizeBytes: number;
  sourceEtag?: string;
  sourceFingerprint: string;
  format: SoundFormat;
  sampleRateHz: number;
  channels: 1 | 2;
  spatialMode: "2d" | "3d";
  loop: boolean;
  playback: {
    mode: SoundPlaybackMode;
    intervalSeconds?: number;
    ambientOnly: boolean;
  };
  auroraUsage: SoundAuroraUsageHint;
  reverseMapping: SoundReverseMapping;
  durationMs: number;
  cues: number;
  emitters: number;
  sourceSize: number;
  updatedAt: string;
}

const SUPPORTED_EXTENSIONS = new Set(["wav", "ogg", "bmu", "mp3"]);
const AREA_BINDING = {
  areaKey: "GI_sound_area" as const,
  randomKey: "GI_sound_rndm" as const,
  positionalKey: "GI_sound_pos" as const
};

@Injectable()
export class ModuleSnapshotSoundRepository implements SoundRepositoryPort {
  private readonly logger = new Logger(ModuleSnapshotSoundRepository.name);
  private snapshotIndex: SnapshotIndex | null = null;

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort
  ) {}

  async list(query: SoundListQuery): Promise<SoundListResult> {
    const index = await this.getSnapshotIndex();
    const normalizedQuery = query.query?.toLowerCase().trim();
    const normalizedCategory = query.category?.toLowerCase().trim();
    const normalizedFormat = query.format?.toLowerCase().trim();
    const normalizedSpatialMode = query.spatialMode?.toLowerCase().trim();
    const normalizedBindingKey = query.bindingKey?.toLowerCase().trim();
    const normalizedSourceField = query.sourceField?.toLowerCase().trim();
    const normalizedDefaultsTable = query.defaultsTable?.toLowerCase().trim();
    const normalizedTag = query.tag?.toLowerCase().trim();

    const filtered = index.items.filter((entry) => {
      if (!query.query) {
        return true;
      }
      return entry.searchable.includes(normalizedQuery ?? "");
    })
      .filter((entry) => {
        if (!query.category) {
          return true;
        }
        return entry.categoryLower === normalizedCategory;
      })
      .filter((entry) => {
        if (!query.format) {
          return true;
        }
        return entry.formatLower === normalizedFormat;
      })
      .filter((entry) => {
        if (!query.spatialMode) {
          return true;
        }
        return entry.spatialModeLower === normalizedSpatialMode;
      })
      .filter((entry) => {
        if (!query.bindingKey) {
          return true;
        }
        return entry.bindingKeyLower === normalizedBindingKey;
      })
      .filter((entry) => {
        if (!query.sourceField) {
          return true;
        }
        return entry.sourceFieldLower === normalizedSourceField;
      })
      .filter((entry) => {
        if (!query.defaultsTable) {
          return true;
        }
        return entry.defaultsTableLower === normalizedDefaultsTable;
      })
      .filter((entry) => {
        if (!query.tag) {
          return true;
        }
        return entry.tagsLower.has(normalizedTag ?? "");
      })
      .filter((entry) => {
        if (typeof query.benchmark !== "boolean") {
          return true;
        }
        return entry.record.benchmark === query.benchmark;
      });

    const items = filtered
      .slice(query.offset, query.offset + query.limit)
      .map((entry) => entry.listItem);

    return {
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    };
  }

  async findById(soundId: string): Promise<SoundRecord | null> {
    const index = await this.getSnapshotIndex();
    return index.byId.get(soundId) ?? null;
  }

  async getPrecomputedSoundProcessing(soundId: string): Promise<{ cacheKey: string } | null> {
    const index = await this.getSnapshotIndex();
    return index.processingById.get(soundId) ?? null;
  }

  private async getSnapshotIndex(): Promise<SnapshotIndex> {
    const now = Date.now();
    if (this.snapshotIndex && now - this.snapshotIndex.fetchedAtMs < 30_000) {
      return this.snapshotIndex;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
    const records = buildSoundRecordsFromSnapshot(snapshot.objects);
    const benchmarkCount = records.length > 0 ? Math.min(10, Math.max(1, Math.ceil(records.length * 0.2))) : 0;
    const benchmarkIds = new Set(
      records
        .slice()
        .sort((left, right) => right.sourceSize - left.sourceSize)
        .slice(0, benchmarkCount)
        .map((record) => record.soundId)
    );

    const items: IndexedSound[] = records
      .map((record) => ({
        ...record,
        benchmark: benchmarkIds.has(record.soundId)
      }))
      .sort((left, right) => left.soundId.localeCompare(right.soundId))
      .map((record) => {
        const sound: SoundRecord = {
          soundId: record.soundId,
          resref: record.resref,
          name: record.name,
          category: record.category,
          tags: record.tags,
          benchmark: record.benchmark,
          previewWaveformUrl: record.previewWaveformUrl,
          audioAssetId: record.audioAssetId,
          sourceObjectKey: record.sourceObjectKey,
          sourceContentType: record.sourceContentType,
          sourceSizeBytes: record.sourceSizeBytes,
          sourceEtag: record.sourceEtag,
          sourceFingerprint: record.sourceFingerprint,
          format: record.format,
          sampleRateHz: record.sampleRateHz,
          channels: record.channels,
          spatialMode: record.spatialMode,
          loop: record.loop,
          playback: record.playback,
          auroraUsage: record.auroraUsage,
          reverseMapping: record.reverseMapping,
          metrics: {
            durationMs: record.durationMs,
            cues: record.cues,
            emitters: record.emitters
          },
          updatedAt: record.updatedAt
        };

        return {
          record: sound,
          listItem: mapSoundToListItem(sound),
          processingCacheKey: buildSoundProcessCacheKey(sound),
          searchable: buildSoundSearchableText(sound),
          categoryLower: sound.category.toLowerCase(),
          formatLower: sound.format.toLowerCase(),
          spatialModeLower: sound.spatialMode.toLowerCase(),
          bindingKeyLower: sound.auroraUsage.bindingKey.toLowerCase(),
          sourceFieldLower: sound.auroraUsage.sourceField.toLowerCase(),
          defaultsTableLower: sound.auroraUsage.defaultsTable?.toLowerCase() ?? null,
          tagsLower: new Set(sound.tags.map((tag) => tag.toLowerCase()))
        };
      });

    const cacheKey = [
      settings.blobStorage.bucket,
      snapshot.prefix,
      snapshot.moduleHash ?? "unknown",
      String(snapshot.objects.length),
      String(items.length)
    ].join("|");

    if (items.length === 0) {
      this.logger.warn(
        "No sound assets detected in module snapshot (supported: wav, ogg, bmu, mp3)."
      );
    }

    this.snapshotIndex = {
      cacheKey,
      fetchedAtMs: now,
      items,
      byId: new Map(items.map((entry) => [entry.record.soundId, entry.record])),
      processingById: new Map(
        items.map((entry) => [entry.record.soundId, { cacheKey: entry.processingCacheKey }])
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

function buildSoundRecordsFromSnapshot(objects: ModuleBlobObjectSummary[]): SoundCandidate[] {
  const bySoundId = new Map<string, SoundCandidate[]>();

  for (const object of objects) {
    const fileName = extractFileName(object.key);
    const extension = extractExtension(fileName);
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      continue;
    }

    const basename = extractBasename(fileName);
    if (basename.length < 2) {
      continue;
    }

    const normalizedResref = normalizeResref(basename);
    const category = classifyCategory(object.key, normalizedResref, extension);
    const format = toSoundFormat(extension);
    const sampleRateHz = inferSampleRate(category, format);
    const channels = inferChannels(category);
    const spatialMode = inferSpatialMode(category, object.key, normalizedResref);
    const loop = inferLoop(category, object.key, normalizedResref);
    const playback = inferPlayback(category, spatialMode, loop, object.key, normalizedResref);
    const auroraUsage = inferAuroraUsage(category, spatialMode, playback.mode, object.key, normalizedResref);
    const durationMs = estimateDurationMs(object.size, format, sampleRateHz, channels, category);
    const tags = buildTags(category, extension, object.key, normalizedResref, loop, spatialMode);
    const soundId = buildSoundId(normalizedResref);
    const sourceContentType = inferSourceContentType(extension);

    const candidate: SoundCandidate = {
      soundId,
      resref: normalizedResref,
      name: humanizeName(normalizedResref),
      category,
      tags,
      previewWaveformUrl: `/assets/previews/sounds/${normalizedResref}.webp`,
      audioAssetId: normalizeAudioAssetId(object.key, normalizedResref),
      sourceObjectKey: object.key,
      sourceContentType,
      sourceSizeBytes: object.size,
      sourceEtag: object.etag,
      sourceFingerprint: buildSourceFingerprint({
        objectKey: object.key,
        size: object.size,
        lastModified: object.lastModified,
        etag: object.etag,
        category,
        format,
        spatialMode,
        loop,
        playbackMode: playback.mode,
        playbackIntervalSeconds: playback.intervalSeconds,
        ambientOnly: playback.ambientOnly
      }),
      format,
      sampleRateHz,
      channels,
      spatialMode,
      loop,
      playback,
      auroraUsage,
      reverseMapping: buildReverseMapping(object.key),
      durationMs,
      cues: category === "effect" ? 2 : 1,
      emitters: spatialMode === "3d" ? 1 : 0,
      sourceSize: object.size,
      updatedAt: object.lastModified ?? new Date().toISOString()
    };

    const bucket = bySoundId.get(soundId) ?? [];
    bucket.push(candidate);
    bySoundId.set(soundId, bucket);
  }

  const selected: SoundCandidate[] = [];
  for (const candidates of bySoundId.values()) {
    selected.push(selectBestCandidate(candidates));
  }
  return selected;
}

function selectBestCandidate(candidates: SoundCandidate[]): SoundCandidate {
  return candidates
    .slice()
    .sort((left, right) => {
      const formatScoreDelta = formatScore(right.format) - formatScore(left.format);
      if (formatScoreDelta !== 0) {
        return formatScoreDelta;
      }

      if (left.sourceSize !== right.sourceSize) {
        return right.sourceSize - left.sourceSize;
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    })[0];
}

function formatScore(format: SoundFormat): number {
  if (format === "wav") {
    return 4;
  }
  if (format === "ogg") {
    return 3;
  }
  if (format === "bmu") {
    return 2;
  }
  return 1;
}

function classifyCategory(objectKey: string, resref: string, extension: string): SoundCategory {
  const normalizedKey = objectKey.toLowerCase();
  if (
    extension === "bmu" ||
    normalizedKey.includes("/music/") ||
    normalizedKey.includes("/mus/") ||
    resref.startsWith("mus_")
  ) {
    return "music";
  }

  if (
    normalizedKey.includes("/ambient/") ||
    normalizedKey.includes("/amb/") ||
    resref.startsWith("amb_")
  ) {
    return "ambient";
  }

  return "effect";
}

function inferSampleRate(category: SoundCategory, format: SoundFormat): number {
  if (category === "music") {
    return 48000;
  }
  if (format === "ogg" || format === "mp3" || format === "bmu") {
    return 48000;
  }
  return 44100;
}

function toSoundFormat(extension: string): SoundFormat {
  if (extension === "wav") {
    return "wav";
  }
  if (extension === "mp3") {
    return "mp3";
  }
  if (extension === "bmu") {
    return "bmu";
  }
  return "ogg";
}

function inferChannels(category: SoundCategory): 1 | 2 {
  return category === "effect" ? 1 : 2;
}

function inferSpatialMode(category: SoundCategory, objectKey: string, resref: string): "2d" | "3d" {
  if (category !== "effect") {
    return "2d";
  }

  const normalized = `${objectKey}|${resref}`.toLowerCase();
  if (
    normalized.includes("2d") ||
    normalized.includes("gui") ||
    normalized.includes("ui") ||
    normalized.includes("voice")
  ) {
    return "2d";
  }
  return "3d";
}

function inferLoop(category: SoundCategory, objectKey: string, resref: string): boolean {
  if (category === "music" || category === "ambient") {
    return true;
  }

  const normalized = `${objectKey}|${resref}`.toLowerCase();
  return normalized.includes("loop");
}

function inferPlayback(
  category: SoundCategory,
  spatialMode: "2d" | "3d",
  loop: boolean,
  objectKey: string,
  resref: string
): { mode: SoundPlaybackMode; intervalSeconds?: number; ambientOnly: boolean } {
  const normalized = `${objectKey}|${resref}`.toLowerCase();

  if (category === "music") {
    return {
      mode: "continuous",
      ambientOnly: false
    };
  }

  if (category === "ambient") {
    const intervalSeconds = normalized.includes("night") ? 45 : 30;
    return {
      mode: "interval",
      intervalSeconds,
      ambientOnly: true
    };
  }

  if (!loop) {
    return {
      mode: "random",
      ambientOnly: false
    };
  }

  if (spatialMode === "3d") {
    return {
      mode: "looping",
      ambientOnly: false
    };
  }

  return {
    mode: "continuous",
    ambientOnly: false
  };
}

function inferAuroraUsage(
  category: SoundCategory,
  spatialMode: "2d" | "3d",
  playbackMode: SoundPlaybackMode,
  objectKey: string,
  resref: string
): SoundAuroraUsageHint {
  const normalized = `${objectKey}|${resref}`.toLowerCase();

  if (category === "ambient") {
    return {
      bindingKey: "GI_sound_area",
      sourceField: normalized.includes("night") ? "AmbientSoundNight" : "AmbientSoundDay"
    };
  }

  if (category === "music") {
    if (normalized.includes("battle") || normalized.includes("combat")) {
      return {
        bindingKey: "GI_sound_area",
        sourceField: "MusicBattle"
      };
    }
    return {
      bindingKey: "GI_sound_area",
      sourceField: normalized.includes("night") ? "MusicNight" : "MusicDay"
    };
  }

  if (playbackMode === "random") {
    return {
      bindingKey: "GI_sound_rndm",
      sourceField: "RandomSound",
      defaultsTable: "sounddefaultstim"
    };
  }

  if (spatialMode === "3d") {
    return {
      bindingKey: "GI_sound_pos",
      sourceField: "PlacedSound",
      defaultsTable: "sounddefaultspos"
    };
  }

  return {
    bindingKey: "GI_sound_pos",
    sourceField: "PlacedSound",
    defaultsTable: "sounddefaultspos"
  };
}

function buildReverseMapping(objectKey: string): SoundReverseMapping {
  const normalizedKey = objectKey.toLowerCase();
  const customPalette =
    normalizedKey.includes("/hak/") ||
    normalizedKey.includes("/custom/") ||
    normalizedKey.includes("cus");

  return {
    palette: customPalette ? "soundpalcus.itp" : "soundpalstd",
    soundPalette: "soundpal",
    soundSetTable: "soundset",
    soundSetTypeTable: "soundsettype",
    soundTypesTable: "soundtypes",
    categoryFilterTable: "soundcatfilters",
    areaBinding: AREA_BINDING,
    soundDefaultsTimingTable: "sounddefaultstim",
    soundDefaultsPositionTable: "sounddefaultspos"
  };
}

function inferSourceContentType(extension: string): string {
  if (extension === "wav") {
    return "audio/wav";
  }
  if (extension === "mp3" || extension === "bmu") {
    return "audio/mpeg";
  }
  return "audio/ogg";
}

function buildSourceFingerprint(input: {
  objectKey: string;
  size: number;
  lastModified?: string;
  etag?: string;
  category: SoundCategory;
  format: SoundFormat;
  spatialMode: "2d" | "3d";
  loop: boolean;
  playbackMode: SoundPlaybackMode;
  playbackIntervalSeconds?: number;
  ambientOnly: boolean;
}): string {
  return createHash("sha256")
    .update(
      [
        input.objectKey,
        String(input.size),
        input.lastModified ?? "",
        input.etag ?? "",
        input.category,
        input.format,
        input.spatialMode,
        String(input.loop),
        input.playbackMode,
        String(input.playbackIntervalSeconds ?? "none"),
        String(input.ambientOnly)
      ].join("|")
    )
    .digest("hex");
}

function estimateDurationMs(
  sizeBytes: number,
  format: SoundFormat,
  sampleRateHz: number,
  channels: 1 | 2,
  category: SoundCategory
): number {
  if (format === "wav") {
    const bytesPerSecond = sampleRateHz * channels * 2;
    return clampDurationMs(Math.round((sizeBytes / Math.max(bytesPerSecond, 1)) * 1000));
  }

  const bitrateKbps = category === "music" ? 160 : category === "ambient" ? 128 : 96;
  const seconds = (sizeBytes * 8) / (bitrateKbps * 1000);
  return clampDurationMs(Math.round(seconds * 1000));
}

function clampDurationMs(value: number): number {
  if (!Number.isFinite(value) || value < 250) {
    return 250;
  }
  if (value > 600000) {
    return 600000;
  }
  return value;
}

function buildTags(
  category: SoundCategory,
  extension: string,
  objectKey: string,
  resref: string,
  loop: boolean,
  spatialMode: "2d" | "3d"
): string[] {
  const tags = new Set<string>();
  tags.add(category);
  tags.add(extension === "bmu" ? "bmu" : extension);
  tags.add(spatialMode);
  if (loop) {
    tags.add("loop");
  }
  if (category === "ambient") {
    tags.add("ambientonly");
  }
  if (category === "music") {
    tags.add("soundset");
    tags.add("soundtypes");
  }

  const normalizedKey = objectKey.replace(/\\/gu, "/").toLowerCase();
  const segments = normalizedKey.split("/").filter((segment) => segment.length > 0);
  for (const segment of segments) {
    if (segment === "music" || segment === "mus" || segment === "ambient" || segment === "amb") {
      continue;
    }
    if (segment.length >= 3 && segment.length <= 24 && /^[a-z0-9_-]+$/u.test(segment)) {
      tags.add(segment);
    }
  }

  for (const token of resref.split(/[_-]+/u)) {
    if (token.length >= 3 && token.length <= 24) {
      tags.add(token);
    }
  }

  return [...tags].slice(0, 16);
}

function mapSoundToListItem(sound: SoundRecord): SoundListItem {
  return {
    soundId: sound.soundId,
    resref: sound.resref,
    name: sound.name,
    category: sound.category,
    format: sound.format,
    tags: sound.tags,
    benchmark: sound.benchmark,
    previewWaveformUrl: sound.previewWaveformUrl,
    spatialMode: sound.spatialMode,
    playbackMode: sound.playback.mode,
    source: {
      layer: resolveSoundSourceLayer(sound.sourceObjectKey)
    },
    auroraUsage: sound.auroraUsage,
    metrics: sound.metrics,
    updatedAt: sound.updatedAt
  };
}

function resolveSoundSourceLayer(objectKey: string): SoundSourceLayer {
  const normalizedKey = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (normalizedKey.includes("/__aurora/sources/vanilla/")) {
    return "vanilla";
  }
  if (normalizedKey.includes("/__aurora/sources/hak/")) {
    return "hak";
  }
  if (normalizedKey.startsWith("modules/current/") || normalizedKey.includes("/__aurora/sources/module/")) {
    return "module";
  }
  return "other";
}

function buildSoundSearchableText(sound: SoundRecord): string {
  return [sound.name, sound.soundId, sound.resref, ...sound.tags].join("|").toLowerCase();
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
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gu, "_");
  return normalized.slice(0, 64);
}

function buildSoundId(resref: string): string {
  if (resref.startsWith("sound_")) {
    return resref.slice(0, 72);
  }
  return `sound_${resref}`.slice(0, 72);
}

function humanizeName(resref: string): string {
  return resref
    .split(/[_-]+/u)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeAudioAssetId(objectKey: string, resref: string): string {
  const normalizedKey = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (normalizedKey.startsWith("audio/")) {
    return normalizedKey.slice(0, 128);
  }
  return `audio/module/${resref}`.slice(0, 128);
}

function normalizePrefixForLookup(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}
