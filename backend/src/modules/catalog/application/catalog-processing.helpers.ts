import { createHash } from "node:crypto";
import type { ModuleBlobSnapshotSummary } from "../../runtime-settings/application/ports/module-blob-storage.port";
import type {
  BenchmarkDurationSummary,
  CreatureRuntimeProjection,
  CreatureValidationIssue,
  PlaceableAssetEntry,
  PlaceableAssetManifest,
  PlaceableAssetRole,
  PlaceableBenchmarkRunQuery,
  PlaceableRenderContract,
  PlaceableSubtype,
  TemplateProcessingResult,
  TemplateRenderContract
} from "../domain/template.types";
import type { PlaceableProcessingResult } from "./ports/placeable-processing-cache.port";

export interface ModuleSnapshotIndex {
  moduleHash?: string;
  byBasename: Map<string, PlaceableAssetEntry[]>;
  byPrefix: Map<string, PlaceableAssetEntry[]>;
  candidatesScanned: number;
}

export interface PlaceableAssetLookupInput {
  templateId: string;
  resref: string;
  subtype: PlaceableSubtype;
  metadata: Record<string, string | number | boolean>;
}

export interface PlaceableClassification {
  source: "template" | "hint";
  inputSubtype?: string;
  normalizedSubtype: PlaceableSubtype;
  mismatchWithTemplate: boolean;
}

const ROLE_BY_EXTENSION: Record<string, PlaceableAssetRole> = {
  mdl: "model",
  mdb: "model",
  plt: "model",
  dwk: "metadata",
  pwk: "metadata",
  wok: "metadata",
  dds: "texture",
  tga: "texture",
  txi: "material",
  mtr: "material",
  vis: "vfx",
  pfx: "vfx"
};

export function buildModuleSnapshotIndex(
  snapshot: ModuleBlobSnapshotSummary
): ModuleSnapshotIndex {
  const byBasename = new Map<string, PlaceableAssetEntry[]>();
  const byPrefix = new Map<string, PlaceableAssetEntry[]>();

  for (const object of snapshot.objects) {
    const fileName = extractFileName(object.key);
    const extension = extractExtension(fileName);
    const basename = extractBasename(fileName);
    if (!basename) {
      continue;
    }

    const entry: PlaceableAssetEntry = {
      assetId: buildAssetId(object.key, object.etag, object.size),
      role: ROLE_BY_EXTENSION[extension] ?? "unknown",
      fileName,
      objectKey: object.key,
      extension,
      sizeBytes: object.size,
      contentType: inferContentTypeForExtension(extension),
      etag: object.etag
    };

    const byBasenameBucket = byBasename.get(basename) ?? [];
    byBasenameBucket.push(entry);
    byBasename.set(basename, byBasenameBucket);

    const prefixKey = basename.slice(0, 4);
    const byPrefixBucket = byPrefix.get(prefixKey) ?? [];
    byPrefixBucket.push(entry);
    byPrefix.set(prefixKey, byPrefixBucket);
  }

  return {
    moduleHash: snapshot.moduleHash,
    byBasename,
    byPrefix,
    candidatesScanned: snapshot.objects.length
  };
}

export function collectPlaceableAssetsFromSnapshot(
  index: ModuleSnapshotIndex,
  input: PlaceableAssetLookupInput
): PlaceableAssetEntry[] {
  const seeds = buildLookupSeeds(input);
  const uniqueByObjectKey = new Map<string, PlaceableAssetEntry>();

  for (const seed of seeds) {
    const prefixBucket = index.byPrefix.get(seed.slice(0, 4)) ?? [];
    for (const asset of prefixBucket) {
      const assetBasename = extractBasename(asset.fileName);
      if (assetBasename.startsWith(seed)) {
        uniqueByObjectKey.set(asset.objectKey, asset);
      }
    }
  }

  const ordered = [...uniqueByObjectKey.values()].sort((left, right) => {
    const roleDelta = compareAssetRole(left.role, right.role);
    if (roleDelta !== 0) {
      return roleDelta;
    }
    if (left.fileName !== right.fileName) {
      return left.fileName.localeCompare(right.fileName);
    }
    return left.objectKey.localeCompare(right.objectKey);
  });

  return ordered.slice(0, 200);
}

export function buildLookupSeeds(input: PlaceableAssetLookupInput): string[] {
  const seeds = new Set<string>();
  addSeed(seeds, input.resref);
  addSeed(seeds, input.templateId);

  const metadataKeys = [
    "modelResref",
    "appearanceResref",
    "model",
    "texturePrefix",
    "materialPrefix",
    "vfxPreset"
  ];

  for (const key of metadataKeys) {
    const value = input.metadata[key];
    if (typeof value === "string") {
      addSeed(seeds, value);
    }
  }

  if (input.subtype === "vfx") {
    addSeed(seeds, `${input.resref}_vfx`);
  }

  return [...seeds];
}

export function addSeed(target: Set<string>, value: string): void {
  const normalized = extractBasename(value);
  if (normalized.length < 3) {
    return;
  }
  target.add(normalized);
}

export function buildAssetId(
  objectKey: string,
  etag: string | undefined,
  size: number
): string {
  return createHash("sha256")
    .update(`${objectKey}|${etag ?? ""}|${size}`)
    .digest("hex")
    .slice(0, 24);
}

export function extractFileName(key: string): string {
  const normalized = key.replace(/\\/gu, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] ?? normalized;
}

export function extractExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");
  if (index <= 0) {
    return "";
  }
  return normalized.slice(index + 1);
}

export function extractBasename(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");
  if (index <= 0) {
    return normalized;
  }
  return normalized.slice(0, index);
}

export function inferContentTypeForExtension(extension: string): string {
  if (extension === "dds") {
    return "image/vnd-ms.dds";
  }
  if (extension === "tga") {
    return "image/x-tga";
  }
  return "application/octet-stream";
}

export function compareAssetRole(left: PlaceableAssetRole, right: PlaceableAssetRole): number {
  const order: Record<PlaceableAssetRole, number> = {
    model: 0,
    texture: 1,
    material: 2,
    vfx: 3,
    metadata: 4,
    unknown: 5
  };

  return order[left] - order[right];
}

export function normalizePrefixForLookup(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}

export function resolvePlaceableClassification(
  templateSubtype: PlaceableSubtype | undefined,
  hint: string | undefined
): PlaceableClassification {
  const normalizedHint = normalizePlaceableSubtypeHint(hint);

  if (templateSubtype) {
    return {
      source: "template",
      inputSubtype: hint,
      normalizedSubtype: templateSubtype,
      mismatchWithTemplate: Boolean(normalizedHint && normalizedHint !== templateSubtype)
    };
  }

  return {
    source: "hint",
    inputSubtype: hint,
    normalizedSubtype: normalizedHint ?? "generic",
    mismatchWithTemplate: false
  };
}

export function normalizePlaceableSubtypeHint(
  hint: string | undefined
): PlaceableSubtype | null {
  if (!hint) {
    return null;
  }

  const normalized = hint.trim().toLowerCase();
  if (normalized === "vvx" || normalized === "vvxy") {
    return "vfx";
  }

  if (
    normalized === "generic" ||
    normalized === "door" ||
    normalized === "vfx" ||
    normalized === "container" ||
    normalized === "light_source" ||
    normalized === "trigger_proxy"
  ) {
    return normalized;
  }

  return null;
}

export function buildRenderContract(subtype: PlaceableSubtype): PlaceableRenderContract {
  if (subtype === "door") {
    return {
      backendType: subtype,
      frontendType: "door",
      rendererPreset: "door-standard",
      isDoor: true,
      isVfx: false
    };
  }

  if (subtype === "vfx") {
    return {
      backendType: subtype,
      frontendType: "vfx",
      rendererPreset: "vfx-emitter",
      isDoor: false,
      isVfx: true
    };
  }

  if (subtype === "container") {
    return {
      backendType: subtype,
      frontendType: "placeable",
      rendererPreset: "placeable-container",
      isDoor: false,
      isVfx: false
    };
  }

  if (subtype === "light_source") {
    return {
      backendType: subtype,
      frontendType: "placeable",
      rendererPreset: "placeable-light",
      isDoor: false,
      isVfx: false
    };
  }

  if (subtype === "trigger_proxy") {
    return {
      backendType: subtype,
      frontendType: "placeable",
      rendererPreset: "placeable-trigger-proxy",
      isDoor: false,
      isVfx: false
    };
  }

  return {
    backendType: subtype,
    frontendType: "placeable",
    rendererPreset: "placeable-generic",
    isDoor: false,
    isVfx: false
  };
}

export function maybeStripBenchmarkMetadata(
  value: PlaceableProcessingResult,
  includeBenchmarkMetadata: boolean
): PlaceableProcessingResult {
  if (includeBenchmarkMetadata) {
    return value;
  }

  if (typeof value.benchmarkBucket === "undefined") {
    return value;
  }

  return {
    ...value,
    benchmarkBucket: undefined
  };
}

export function maybeStripTemplateBenchmarkMetadata(
  value: TemplateProcessingResult,
  includeBenchmarkMetadata: boolean
): TemplateProcessingResult {
  if (includeBenchmarkMetadata) {
    return value;
  }

  if (typeof value.benchmarkBucket === "undefined") {
    return value;
  }

  return {
    ...value,
    benchmarkBucket: undefined
  };
}

export function buildTemplateRenderContract(
  kind: "creature" | "item"
): TemplateRenderContract {
  if (kind === "creature") {
    return {
      backendType: "creature",
      frontendType: "creature",
      rendererPreset: "creature-standard"
    };
  }

  return {
    backendType: "item",
    frontendType: "item",
    rendererPreset: "item-standard"
  };
}

export function buildCreatureRuntimeProjection(
  metadata: Record<string, string | number | boolean>
): CreatureRuntimeProjection {
  const scripts = extractScriptMap(metadata);

  return {
    source: {
      fileType: readMetadataString(metadata, "sourceFileType"),
      fileVersion: readMetadataString(metadata, "sourceFileVersion"),
      structTypeId: readMetadataNumber(metadata, "sourceStructTypeId")
    },
    identity: {
      templateResRef: readMetadataString(metadata, "templateResRef"),
      tag: readMetadataString(metadata, "tag"),
      conversation: readMetadataString(metadata, "conversation"),
      gender: readMetadataNumber(metadata, "gender"),
      race: readMetadataNumber(metadata, "race"),
      subrace: readMetadataString(metadata, "subrace"),
      deity: readMetadataString(metadata, "deity"),
      phenotype: readMetadataNumber(metadata, "phenotype")
    },
    appearance: {
      appearanceType: readMetadataNumber(metadata, "appearanceId"),
      portraitId: readMetadataNumber(metadata, "portraitId"),
      portraitResRef: readMetadataString(metadata, "portraitResRef"),
      soundSetFile: readMetadataNumber(metadata, "soundSetFile"),
      wingsNew: readMetadataNumber(metadata, "wingsNew"),
      tailNew: readMetadataNumber(metadata, "tailNew")
    },
    faction: {
      factionId: readMetadataNumber(metadata, "factionId")
    },
    stats: {
      challengeRating: readMetadataNumber(metadata, "challengeRating"),
      crAdjust: readMetadataNumber(metadata, "crAdjust"),
      perceptionRange: readMetadataNumber(metadata, "perceptionRange"),
      naturalAc: readMetadataNumber(metadata, "naturalAc"),
      hitPoints: readMetadataNumber(metadata, "hitPoints"),
      currentHitPoints: readMetadataNumber(metadata, "currentHitPoints"),
      maxHitPoints: readMetadataNumber(metadata, "maxHitPoints"),
      reflexBonus: readMetadataNumber(metadata, "reflexBonus"),
      willBonus: readMetadataNumber(metadata, "willBonus"),
      fortitudeBonus: readMetadataNumber(metadata, "fortitudeBonus"),
      goodEvil: readMetadataNumber(metadata, "goodEvil"),
      lawfulChaotic: readMetadataNumber(metadata, "lawfulChaotic")
    },
    lists: {
      classListCount: readMetadataNumber(metadata, "classListCount"),
      skillListCount: readMetadataNumber(metadata, "skillListCount"),
      featListCount: readMetadataNumber(metadata, "featListCount"),
      templateListCount: readMetadataNumber(metadata, "templateListCount"),
      specAbilityListCount: readMetadataNumber(metadata, "specAbilityListCount")
    },
    scripts
  };
}

export function buildCreatureValidationIssues(
  runtime: CreatureRuntimeProjection
): CreatureValidationIssue[] {
  const issues: CreatureValidationIssue[] = [];

  if (typeof runtime.appearance.appearanceType !== "number") {
    issues.push({
      code: "CREATURE_APPEARANCE_MISSING",
      severity: "warn",
      message: "Appearance_Type is missing in creature source metadata."
    });
  }

  if (typeof runtime.stats.challengeRating !== "number") {
    issues.push({
      code: "CREATURE_CHALLENGE_RATING_MISSING",
      severity: "warn",
      message: "ChallengeRating is missing; Aurora palette flow falls back to CR=1."
    });
  }

  if (typeof runtime.faction.factionId !== "number") {
    issues.push({
      code: "CREATURE_FACTION_MISSING",
      severity: "warn",
      message: "FactionID is missing; Aurora palette flow falls back to Faction=0."
    });
  }

  if (Object.keys(runtime.scripts).length === 0) {
    issues.push({
      code: "CREATURE_SCRIPTS_EMPTY",
      severity: "warn",
      message: "No creature scripts were extracted from source metadata."
    });
  }

  return issues;
}

function readMetadataString(
  metadata: Record<string, string | number | boolean>,
  key: string
): string | undefined {
  const raw = metadata[key];
  if (typeof raw !== "string") {
    return undefined;
  }
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readMetadataNumber(
  metadata: Record<string, string | number | boolean>,
  key: string
): number | undefined {
  const raw = metadata[key];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function extractScriptMap(
  metadata: Record<string, string | number | boolean>
): Record<string, string> {
  const scripts: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!key.startsWith("script.") || typeof value !== "string") {
      continue;
    }
    const scriptKey = key.slice("script.".length);
    if (!scriptKey) {
      continue;
    }
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }
    scripts[scriptKey] = normalized;
  }
  return scripts;
}

export function summarizeDurations(values: number[]): BenchmarkDurationSummary {
  if (values.length === 0) {
    return {
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    minMs: roundMetric(sorted[0]),
    maxMs: roundMetric(sorted[sorted.length - 1]),
    avgMs: roundMetric(total / sorted.length),
    p50Ms: roundMetric(percentile(sorted, 0.5)),
    p95Ms: roundMetric(percentile(sorted, 0.95)),
    p99Ms: roundMetric(percentile(sorted, 0.99))
  };
}

export function percentile(sorted: number[], ratio: number): number {
  const index = Math.ceil(sorted.length * ratio) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
}

export function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

export function buildBenchmarkFingerprint(
  candidates: Array<{
    templateId: string;
    resref: string;
    placeableSubtype?: PlaceableSubtype;
  }>,
  query: PlaceableBenchmarkRunQuery
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        type: "placeable-benchmark/v1",
        iterations: query.iterations,
        warmupIterations: query.warmupIterations,
        bypassCache: query.bypassCache,
        candidates: candidates.map((candidate) => ({
          templateId: candidate.templateId,
          resref: candidate.resref,
          placeableSubtype: candidate.placeableSubtype ?? "generic"
        }))
      })
    )
    .digest("hex");
}

export function buildEmptyPlaceableAssetManifest(): PlaceableAssetManifest {
  return {
    version: "placeable-asset-manifest/v1",
    source: "module-blob-snapshot",
    generatedAt: new Date().toISOString(),
    moduleHash: undefined,
    assetCount: 0,
    candidatesScanned: 0,
    assets: []
  };
}
