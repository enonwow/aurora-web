import { createHash } from "node:crypto";
import type { ModuleBlobSnapshotSummary } from "../../runtime-settings/application/ports/module-blob-storage.port";
import type {
  BenchmarkDurationSummary,
  CreatureRuntimeProjection,
  CreatureValidationIssue,
  ItemRuntimeProjection,
  ItemValidationIssue,
  PlaceableAssetEntry,
  PlaceableAssetManifest,
  PlaceableAssetRole,
  PlaceableBenchmarkRunQuery,
  PlaceableRenderPackage,
  PlaceableRenderPackageAssetRefs,
  PlaceableRenderPackageStatus,
  PlaceableRenderContract,
  PlaceableRuntimeProjection,
  PlaceableSubtype,
  PlaceableValidationIssue,
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
  sourcePriority?: PlaceableAssetSourcePriority;
}

export interface PlaceableClassification {
  source: "template" | "hint";
  inputSubtype?: string;
  normalizedSubtype: PlaceableSubtype;
  mismatchWithTemplate: boolean;
}

export interface PlaceableAssetSourcePriority {
  hakNames: string[];
}

type PlaceableAssetSourceLayer = "module" | "hak" | "vanilla";

interface PlaceableAssetSourceDescriptor {
  layer: PlaceableAssetSourceLayer;
  hakName?: string;
}

interface PlaceableLookupSeedDescriptor {
  seed: string;
  roles?: Set<PlaceableAssetRole>;
}

const ROLE_BY_EXTENSION: Record<string, PlaceableAssetRole> = {
  mdl: "model",
  mdb: "model",
  glb: "model",
  gltf: "model",
  plt: "model",
  dwk: "metadata",
  pwk: "metadata",
  wok: "metadata",
  dds: "texture",
  tga: "texture",
  png: "texture",
  jpg: "texture",
  jpeg: "texture",
  webp: "texture",
  txi: "material",
  mtr: "material",
  vis: "vfx",
  pfx: "vfx"
};

const DERIVED_MODEL_EXTENSIONS = new Set(["glb", "gltf"]);

const PLACEABLE_LOOKUP_METADATA_KEYS = new Set([
  "modelresref",
  "appearanceresref",
  "model",
  "textureprefix",
  "materialprefix",
  "vfxpreset",
  "templateresref",
  "resref",
  "sourceobjectkey",
  "dependencyrefs",
  "dependencyref",
  "lookuptemplateresref",
  "lookupmodelresref",
  "lookupdependencyrefs",
  "chunkmodelreferences",
  "modeltexturereferences"
]);

const PLACEABLE_TEMPLATE_ID_PREFIXES = ["plc_", "cre_", "itm_"] as const;
const TEXTURE_LOOKUP_ROLES = new Set<PlaceableAssetRole>(["texture", "material"]);
const MATERIAL_LOOKUP_ROLES = new Set<PlaceableAssetRole>(["material"]);
const MODEL_LOOKUP_ROLES = new Set<PlaceableAssetRole>(["model", "unknown"]);

function isModelAsset(entry: PlaceableAssetEntry): boolean {
  return entry.role === "model" && !isDerivedModelAsset(entry);
}

function isDerivedModelAsset(entry: PlaceableAssetEntry): boolean {
  return (
    (entry.role === "model" || entry.role === "unknown") &&
    DERIVED_MODEL_EXTENSIONS.has(entry.extension)
  );
}

function isUnrenderableSourceModelAsset(entry: PlaceableAssetEntry): boolean {
  const extension = entry.extension.trim().toLowerCase();
  return entry.role === "unknown" && (extension === "mdl" || extension === "mdb");
}

function rankDerivedModelAsset(entry: PlaceableAssetEntry | undefined): number {
  const extension = entry?.extension.toLowerCase();
  if (extension === "glb") {
    return 0;
  }
  if (extension === "gltf") {
    return 1;
  }
  return 2;
}

function addAssetRef(
  refs: PlaceableRenderPackageAssetRefs,
  key: keyof PlaceableRenderPackageAssetRefs,
  value: string
) {
  const current = (refs[key] ??= []);
  current.push(value);
}

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
  const seeds = buildLookupSeedDescriptors(input);
  const uniqueByObjectKey = new Map<string, PlaceableAssetEntry>();

  for (const descriptor of seeds) {
    const { seed } = descriptor;
    const basenameBucket = index.byBasename.get(seed) ?? [];
    for (const asset of basenameBucket) {
      if (!matchesLookupSeedRoles(asset, descriptor)) {
        continue;
      }
      uniqueByObjectKey.set(asset.objectKey, asset);
    }

    const prefixBucket = index.byPrefix.get(seed.slice(0, 4)) ?? [];
    for (const asset of prefixBucket) {
      if (!matchesLookupSeedRoles(asset, descriptor)) {
        continue;
      }
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
    const leftBasename = extractBasename(left.fileName);
    const rightBasename = extractBasename(right.fileName);
    if (leftBasename === rightBasename) {
      const sourceDelta = compareAssetSourcePriority(
        left,
        right,
        input.sourcePriority
      );
      if (sourceDelta !== 0) {
        return sourceDelta;
      }
    }
    if (left.fileName !== right.fileName) {
      return left.fileName.localeCompare(right.fileName);
    }
    return left.objectKey.localeCompare(right.objectKey);
  });

  return ordered.slice(0, 200);
}

export function buildLookupSeeds(input: PlaceableAssetLookupInput): string[] {
  return buildLookupSeedDescriptors(input).map((descriptor) => descriptor.seed);
}

function buildLookupSeedDescriptors(input: PlaceableAssetLookupInput): PlaceableLookupSeedDescriptor[] {
  const seeds = new Map<string, Set<PlaceableAssetRole> | null>();
  addLookupSeed(seeds, input.resref);
  addLookupSeed(seeds, input.templateId);
  addLookupTemplateIdSeeds(seeds, input.templateId);

  for (const [rawKey, rawValue] of Object.entries(input.metadata)) {
    if (typeof rawValue !== "string") {
      continue;
    }
    const key = rawKey.trim().toLowerCase();
    const isExplicitLookupKey = PLACEABLE_LOOKUP_METADATA_KEYS.has(key);
    const isDependencyLookupKey =
      key.startsWith("dependencyref") || key.startsWith("dependency.");
    if (!isExplicitLookupKey && !isDependencyLookupKey) {
      continue;
    }
    addSeedFromMetadataValue(seeds, rawValue, resolveLookupSeedRolesForMetadataKey(key));
  }

  if (input.subtype === "vfx") {
    addLookupSeed(seeds, `${input.resref}_vfx`);
  }

  return [...seeds.entries()]
    .map(([seed, roles]) => ({
      seed,
      ...(roles ? { roles } : {})
    }))
    .sort((left, right) => left.seed.localeCompare(right.seed));
}

export function addSeed(target: Set<string>, value: string): void {
  const normalized = normalizeSeedValue(value);
  if (normalized.length < 3) {
    return;
  }
  target.add(normalized);
  addTemplateIdSeeds(target, normalized);
}

function addSeedFromMetadataValue(
  target: Map<string, Set<PlaceableAssetRole> | null>,
  value: string,
  roles?: Set<PlaceableAssetRole>
): void {
  const normalized = value.trim();
  if (!normalized) {
    return;
  }

  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    try {
      const parsed = JSON.parse(normalized) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((entry) => {
          if (typeof entry === "string") {
            addLookupSeed(target, entry, roles);
          }
        });
        return;
      }
    } catch {
      // Fall through to tokenized parsing when JSON parsing fails.
    }
  }

  normalized
    .split(/[|,;\n\r\t ]+/u)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .forEach((entry) => addLookupSeed(target, entry, roles));
}

function addTemplateIdSeeds(target: Set<string>, value: string): void {
  const normalized = normalizeSeedValue(value);
  if (normalized.length < 3) {
    return;
  }
  for (const prefix of PLACEABLE_TEMPLATE_ID_PREFIXES) {
    if (!normalized.startsWith(prefix)) {
      continue;
    }
    const trimmed = normalized.slice(prefix.length);
    if (trimmed.length >= 3) {
      target.add(trimmed);
    }
  }
}

function addLookupSeed(
  target: Map<string, Set<PlaceableAssetRole> | null>,
  value: string,
  roles?: Set<PlaceableAssetRole>
): void {
  const normalized = normalizeSeedValue(value);
  if (normalized.length < 3) {
    return;
  }
  addLookupSeedValue(target, normalized, roles);
  addLookupTemplateIdSeeds(target, normalized, roles);
}

function addLookupTemplateIdSeeds(
  target: Map<string, Set<PlaceableAssetRole> | null>,
  value: string,
  roles?: Set<PlaceableAssetRole>
): void {
  const normalized = normalizeSeedValue(value);
  if (normalized.length < 3) {
    return;
  }
  for (const prefix of PLACEABLE_TEMPLATE_ID_PREFIXES) {
    if (!normalized.startsWith(prefix)) {
      continue;
    }
    const trimmed = normalized.slice(prefix.length);
    if (trimmed.length >= 3) {
      addLookupSeedValue(target, trimmed, roles);
    }
  }
}

function addLookupSeedValue(
  target: Map<string, Set<PlaceableAssetRole> | null>,
  seed: string,
  roles?: Set<PlaceableAssetRole>
): void {
  if (!roles) {
    target.set(seed, null);
    return;
  }
  if (target.get(seed) === null) {
    return;
  }
  const existing = target.get(seed);
  if (existing) {
    roles.forEach((role) => existing.add(role));
    return;
  }
  target.set(seed, new Set(roles));
}

function resolveLookupSeedRolesForMetadataKey(
  key: string
): Set<PlaceableAssetRole> | undefined {
  switch (key) {
    case "modeltexturereferences":
    case "textureprefix":
      return TEXTURE_LOOKUP_ROLES;
    case "materialprefix":
      return MATERIAL_LOOKUP_ROLES;
    case "chunkmodelreferences":
      return MODEL_LOOKUP_ROLES;
    default:
      return undefined;
  }
}

function matchesLookupSeedRoles(
  asset: PlaceableAssetEntry,
  descriptor: PlaceableLookupSeedDescriptor
): boolean {
  return !descriptor.roles || descriptor.roles.has(asset.role);
}

function normalizeSeedValue(value: string): string {
  const withoutQuotes = value.trim().replace(/^['"]+|['"]+$/gu, "");
  if (!withoutQuotes) {
    return "";
  }
  const withoutQuery = withoutQuotes.split(/[?#]/u, 1)[0] ?? "";
  const fileName = extractFileName(withoutQuery);
  return extractBasename(fileName);
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
  if (extension === "glb") {
    return "model/gltf-binary";
  }
  if (extension === "gltf") {
    return "model/gltf+json";
  }
  if (extension === "dds") {
    return "image/vnd-ms.dds";
  }
  if (extension === "tga") {
    return "image/x-tga";
  }
  if (extension === "bmp") {
    return "image/bmp";
  }
  if (extension === "png") {
    return "image/png";
  }
  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }
  if (extension === "webp") {
    return "image/webp";
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

export function compareAssetSourcePriority(
  left: PlaceableAssetEntry,
  right: PlaceableAssetEntry,
  sourcePriority?: PlaceableAssetSourcePriority
): number {
  const leftSource = classifyPlaceableAssetSource(left.objectKey);
  const rightSource = classifyPlaceableAssetSource(right.objectKey);
  const layerDelta =
    getPlaceableAssetSourceLayerRank(leftSource.layer) -
    getPlaceableAssetSourceLayerRank(rightSource.layer);
  if (layerDelta !== 0) {
    return layerDelta;
  }

  if (leftSource.layer === "hak" && rightSource.layer === "hak") {
    const hakDelta =
      getPlaceableHakRank(leftSource.hakName, sourcePriority) -
      getPlaceableHakRank(rightSource.hakName, sourcePriority);
    if (hakDelta !== 0) {
      return hakDelta;
    }
  }

  return 0;
}

function classifyPlaceableAssetSource(objectKey: string): PlaceableAssetSourceDescriptor {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  const hakMarker = "/__aurora/sources/hak/";
  const hakIndex = normalized.indexOf(hakMarker);
  if (hakIndex >= 0) {
    const hakNameStart = hakIndex + hakMarker.length;
    const hakName = normalized.slice(hakNameStart).split("/", 1)[0] ?? "";
    return {
      layer: "hak",
      hakName
    };
  }

  if (normalized.includes("/__aurora/sources/vanilla/")) {
    return {
      layer: "vanilla"
    };
  }

  return {
    layer: "module"
  };
}

function getPlaceableAssetSourceLayerRank(layer: PlaceableAssetSourceLayer): number {
  if (layer === "module") {
    return 0;
  }
  if (layer === "hak") {
    return 1;
  }
  return 2;
}

function getPlaceableHakRank(
  hakName: string | undefined,
  sourcePriority: PlaceableAssetSourcePriority | undefined
): number {
  if (!hakName || !sourcePriority) {
    return Number.MAX_SAFE_INTEGER;
  }
  const index = sourcePriority.hakNames.indexOf(hakName);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
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

export function buildPlaceableRuntimeProjection(
  metadata: Record<string, string | number | boolean>
): PlaceableRuntimeProjection {
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
      keyName: readMetadataString(metadata, "keyName")
    },
    interaction: {
      useable: readMetadataBoolean(metadata, "useable"),
      hasInventory: readMetadataBoolean(metadata, "hasInventory"),
      bodyBag: readMetadataBoolean(metadata, "bodyBag"),
      isStatic: readMetadataBoolean(metadata, "isStatic"),
      autoRemoveKey: readMetadataBoolean(metadata, "autoRemoveKey"),
      interruptable: readMetadataBoolean(metadata, "interruptable")
    },
    locking: {
      factionId: readMetadataNumber(metadata, "factionId"),
      keyRequired: readMetadataBoolean(metadata, "keyRequired"),
      lockable: readMetadataBoolean(metadata, "lockable"),
      locked: readMetadataBoolean(metadata, "locked"),
      closeLockDc: readMetadataNumber(metadata, "closeLockDc"),
      openLockDc: readMetadataNumber(metadata, "openLockDc"),
      invulnerable: readMetadataBoolean(metadata, "invulnerable")
    },
    trap: {
      trapDetectable: readMetadataBoolean(metadata, "trapDetectable"),
      trapDetectDc: readMetadataNumber(metadata, "trapDetectDc"),
      trapDisarmable: readMetadataBoolean(metadata, "trapDisarmable"),
      disarmDc: readMetadataNumber(metadata, "disarmDc"),
      trapFlag: readMetadataBoolean(metadata, "trapFlag"),
      trapOneShot: readMetadataBoolean(metadata, "trapOneShot"),
      trapType: readMetadataNumber(metadata, "trapType")
    },
    state: {
      appearanceType: readMetadataNumber(metadata, "appearanceId"),
      animationState: readMetadataNumber(metadata, "animationState"),
      portraitId: readMetadataNumber(metadata, "portraitId"),
      portraitResRef: readMetadataString(metadata, "portraitResRef"),
      currentHitPoints: readMetadataNumber(metadata, "currentHitPoints"),
      hardness: readMetadataNumber(metadata, "hardness"),
      lightState: readMetadataNumber(metadata, "lightState")
    },
    scripts
  };
}

export function buildPlaceableValidationIssues(
  runtime: PlaceableRuntimeProjection
): PlaceableValidationIssue[] {
  const issues: PlaceableValidationIssue[] = [];

  if (runtime.locking.lockable && typeof runtime.locking.openLockDc !== "number") {
    issues.push({
      code: "PLACEABLE_OPEN_LOCK_DC_MISSING",
      severity: "warn",
      message: "Lockable placeable is missing OpenLockDC."
    });
  }

  if (runtime.locking.lockable && typeof runtime.locking.closeLockDc !== "number") {
    issues.push({
      code: "PLACEABLE_CLOSE_LOCK_DC_MISSING",
      severity: "warn",
      message: "Lockable placeable is missing CloseLockDC."
    });
  }

  if (runtime.locking.keyRequired && !runtime.identity.keyName) {
    issues.push({
      code: "PLACEABLE_KEY_REQUIRED_WITHOUT_KEYNAME",
      severity: "warn",
      message: "KeyRequired is enabled but KeyName is missing."
    });
  }

  if (runtime.trap.trapFlag && typeof runtime.trap.trapType !== "number") {
    issues.push({
      code: "PLACEABLE_TRAP_TYPE_MISSING",
      severity: "warn",
      message: "TrapFlag is enabled but TrapType is missing."
    });
  }

  if (runtime.interaction.useable && !runtime.scripts.onused) {
    issues.push({
      code: "PLACEABLE_ONUSED_SCRIPT_MISSING",
      severity: "warn",
      message: "Useable placeable is missing OnUsed script."
    });
  }

  return issues;
}

export function buildPlaceableRenderPackage(
  manifest: PlaceableAssetManifest
): PlaceableRenderPackage {
  const diagnostics: Array<{ code: string; severity: "warn" | "error"; message: string }> = [];
  const assetRefs: PlaceableRenderPackageAssetRefs = {};
  const modelAssets: string[] = [];
  const derivedModelAssets: string[] = [];

  for (const asset of manifest.assets) {
    if (isDerivedModelAsset(asset)) {
      addAssetRef(assetRefs, "derivedModelAssetIds", asset.assetId);
      addAssetRef(assetRefs, "otherAssetIds", asset.assetId);
      derivedModelAssets.push(asset.assetId);
      continue;
    }

    if (isModelAsset(asset)) {
      addAssetRef(assetRefs, "modelAssetIds", asset.assetId);
      addAssetRef(assetRefs, "otherAssetIds", asset.assetId);
      modelAssets.push(asset.assetId);
      continue;
    }

    if (asset.role === "texture") {
      addAssetRef(assetRefs, "textureAssetIds", asset.assetId);
      addAssetRef(assetRefs, "otherAssetIds", asset.assetId);
      continue;
    }

    if (asset.role === "material") {
      addAssetRef(assetRefs, "materialAssetIds", asset.assetId);
      addAssetRef(assetRefs, "otherAssetIds", asset.assetId);
      continue;
    }

    if (asset.role === "metadata") {
      addAssetRef(assetRefs, "metadataAssetIds", asset.assetId);
      addAssetRef(assetRefs, "otherAssetIds", asset.assetId);
      continue;
    }

    addAssetRef(assetRefs, "otherAssetIds", asset.assetId);
  }

  if (assetRefs.derivedModelAssetIds && assetRefs.derivedModelAssetIds.length > 1) {
    const assetById = new Map(manifest.assets.map((asset) => [asset.assetId, asset]));
    const manifestIndexById = new Map(
      manifest.assets.map((asset, index) => [asset.assetId, index])
    );
    assetRefs.derivedModelAssetIds = [...assetRefs.derivedModelAssetIds].sort(
      (leftId, rightId) => {
        const rankDiff =
          rankDerivedModelAsset(assetById.get(leftId)) -
          rankDerivedModelAsset(assetById.get(rightId));
        if (rankDiff !== 0) {
          return rankDiff;
        }
        return (
          (manifestIndexById.get(leftId) ?? Number.MAX_SAFE_INTEGER) -
          (manifestIndexById.get(rightId) ?? Number.MAX_SAFE_INTEGER)
        );
      }
    );
  }

  const hasDerived = derivedModelAssets.length > 0;
  const hasRawModel = modelAssets.length > 0;
  const hasAnyModel = hasDerived || hasRawModel;

  if (!hasAnyModel) {
    const status: PlaceableRenderPackageStatus = manifest.assets.length === 0
      ? "missing_assets"
      : "unsupported";

    if (manifest.assets.length === 0) {
      diagnostics.push({
        code: "PLACEABLE_RENDER_ASSETS_MISSING",
        severity: "error",
        message: "No model assets were discovered for this placeable."
      });
    } else {
      const hasUnrenderableSourceModel = manifest.assets.some(isUnrenderableSourceModelAsset);
      diagnostics.push({
        code: hasUnrenderableSourceModel
          ? "PLACEABLE_RENDER_SOURCE_MODEL_UNRENDERABLE"
          : "PLACEABLE_RENDER_UNSUPPORTED_ASSET_SET",
        severity: "warn",
        message: hasUnrenderableSourceModel
          ? "Source model assets were found but no derived GLB/GLTF is available for web rendering."
          : "Placeable assets were found but no recognized source model asset exists."
      });
    }

    return {
      status,
      diagnostics,
      assetRefs
    };
  }

  if (hasDerived) {
    diagnostics.push({
      code: "PLACEABLE_RENDER_READY",
      severity: "warn",
      message: "Derived model asset exists; backend render package can be produced."
    });
    return {
      status: "ready",
      diagnostics,
      assetRefs
    };
  }

  diagnostics.push({
    code: "PLACEABLE_RENDER_DERIVED_MISSING",
    severity: "error",
    message:
      "Placeable exposes raw model assets but no derived GLB/Gltf is available yet."
  });

  return {
    status: "missing_derived",
    diagnostics,
    assetRefs,
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
      firstName: readMetadataString(metadata, "firstName"),
      lastName: readMetadataString(metadata, "lastName"),
      description: readMetadataString(metadata, "description"),
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
      appearanceHead: readMetadataNumber(metadata, "appearanceHead"),
      wingsNew: readMetadataNumber(metadata, "wingsNew"),
      tailNew: readMetadataNumber(metadata, "tailNew")
    },
    bodyParts: {
      rFoot: readMetadataNumber(metadata, "bodyPartRFoot"),
      lFoot: readMetadataNumber(metadata, "bodyPartLFoot"),
      rShin: readMetadataNumber(metadata, "bodyPartRShin"),
      lShin: readMetadataNumber(metadata, "bodyPartLShin"),
      lThigh: readMetadataNumber(metadata, "bodyPartLThigh"),
      rThigh: readMetadataNumber(metadata, "bodyPartRThigh"),
      pelvis: readMetadataNumber(metadata, "bodyPartPelvis"),
      torso: readMetadataNumber(metadata, "bodyPartTorso"),
      belt: readMetadataNumber(metadata, "bodyPartBelt"),
      neck: readMetadataNumber(metadata, "bodyPartNeck"),
      rFArm: readMetadataNumber(metadata, "bodyPartRFArm"),
      lFArm: readMetadataNumber(metadata, "bodyPartLFArm"),
      rBicep: readMetadataNumber(metadata, "bodyPartRBicep"),
      lBicep: readMetadataNumber(metadata, "bodyPartLBicep"),
      rShoul: readMetadataNumber(metadata, "bodyPartRShoul"),
      lShoul: readMetadataNumber(metadata, "bodyPartLShoul"),
      rHand: readMetadataNumber(metadata, "bodyPartRHand"),
      lHand: readMetadataNumber(metadata, "bodyPartLHand"),
      robe: readMetadataNumber(metadata, "bodyPartRobe")
    },
    colors: {
      skin: readMetadataNumber(metadata, "colorSkin"),
      hair: readMetadataNumber(metadata, "colorHair"),
      tattoo1: readMetadataNumber(metadata, "colorTattoo1"),
      tattoo2: readMetadataNumber(metadata, "colorTattoo2")
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
      specAbilityListCount: readMetadataNumber(metadata, "specAbilityListCount"),
      equipItemListCount: readMetadataNumber(metadata, "equipItemListCount")
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

  if (runtime.appearance.appearanceType !== undefined && runtime.appearance.appearanceHead === undefined) {
    issues.push({
      code: "CREATURE_APPEARANCE_HEAD_MISSING",
      severity: "warn",
      message: "Appearance_Head is missing while appearance data is present."
    });
  }

  const colorValues = [
    runtime.colors.skin,
    runtime.colors.hair,
    runtime.colors.tattoo1,
    runtime.colors.tattoo2
  ];
  const hasAnyColor = colorValues.some((value) => typeof value === "number");
  const hasAllColors = colorValues.every((value) => typeof value === "number");
  if (hasAnyColor && !hasAllColors) {
    issues.push({
      code: "CREATURE_COLORS_PARTIAL",
      severity: "warn",
      message: "Color_Skin/Hair/Tattoo fields are only partially populated."
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

export function buildItemRuntimeProjection(
  metadata: Record<string, string | number | boolean>
): ItemRuntimeProjection {
  const scripts = extractScriptMap(metadata);

  return {
    source: {
      fileType: readMetadataString(metadata, "sourceFileType"),
      fileVersion: readMetadataString(metadata, "sourceFileVersion"),
      structTypeId: readMetadataNumber(metadata, "sourceStructTypeId")
    },
    identity: {
      templateResRef: readMetadataString(metadata, "templateResRef"),
      localizedName:
        readMetadataString(metadata, "localizedName") ??
        readMetadataString(metadata, "displayName"),
      description: readMetadataString(metadata, "description"),
      identifiedDescription: readMetadataString(metadata, "identifiedDescription"),
      tag: readMetadataString(metadata, "tag")
    },
    classification: {
      baseItem: readMetadataNumber(metadata, "baseItem")
    },
    pricing: {
      addCost: readMetadataNumber(metadata, "addCost"),
      costTable: readMetadataNumber(metadata, "costTable"),
      costValue: readMetadataNumber(metadata, "costValue")
    },
    state: {
      charges: readMetadataNumber(metadata, "charges"),
      stackSize: readMetadataNumber(metadata, "stackSize"),
      identified: readMetadataBoolean(metadata, "identified"),
      stolen: readMetadataBoolean(metadata, "stolen")
    },
    scripts
  };
}

export function buildItemValidationIssues(runtime: ItemRuntimeProjection): ItemValidationIssue[] {
  const issues: ItemValidationIssue[] = [];

  if (typeof runtime.classification.baseItem !== "number") {
    issues.push({
      code: "ITEM_BASE_ITEM_MISSING",
      severity: "warn",
      message: "BaseItem is missing in item source metadata."
    });
  }

  if (
    typeof runtime.state.stackSize === "number" &&
    (!Number.isInteger(runtime.state.stackSize) || runtime.state.stackSize < 1)
  ) {
    issues.push({
      code: "ITEM_STACK_SIZE_INVALID",
      severity: "warn",
      message: "StackSize should be an integer >= 1."
    });
  }

  if (
    typeof runtime.state.charges === "number" &&
    (!Number.isInteger(runtime.state.charges) || runtime.state.charges < 0)
  ) {
    issues.push({
      code: "ITEM_CHARGES_INVALID",
      severity: "warn",
      message: "Charges should be an integer >= 0."
    });
  }

  if (runtime.state.identified === false && !runtime.identity.identifiedDescription) {
    issues.push({
      code: "ITEM_IDENTIFIED_DESC_MISSING",
      severity: "warn",
      message: "DescIdentified is missing while item is marked as not identified."
    });
  }

  if (
    runtime.pricing.costTable !== undefined &&
    runtime.pricing.costValue === undefined
  ) {
    issues.push({
      code: "ITEM_COST_VALUE_MISSING",
      severity: "warn",
      message: "CostTable is present but CostValue is missing."
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

function readMetadataBoolean(
  metadata: Record<string, string | number | boolean>,
  key: string
): boolean | undefined {
  const raw = metadata[key];
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw !== 0;
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed !== 0;
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
