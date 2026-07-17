import { createHash } from "node:crypto";
import type { ModuleBlobSnapshotSummary } from "../../runtime-settings/application/ports/module-blob-storage.port";
import type {
  BenchmarkDurationSummary,
  CreatureAppearanceProcessOverride,
  CreatureRenderPackage,
  CreatureRuntimeProjection,
  CreatureValidationIssue,
  EncounterRuntimeProjection,
  EncounterValidationIssue,
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

type EmbeddedItemMetadataRecord = Record<string, string | number | boolean>;
type CreatureInventoryItemRuntimeEntry =
  NonNullable<CreatureRuntimeProjection["lists"]["inventoryItems"]>[number];
type CreatureEquippedItemRuntimeEntry =
  NonNullable<CreatureRuntimeProjection["lists"]["equippedItems"]>[number];
type CreatureInventoryItemMetadataEntry = Omit<
  CreatureInventoryItemRuntimeEntry,
  "itemRuntime"
> & {
  itemTemplateMetadata?: unknown;
};
type CreatureEquippedItemMetadataEntry = Omit<
  CreatureEquippedItemRuntimeEntry,
  "itemRuntime"
> & {
  itemTemplateMetadata?: unknown;
};

const CREATURE_DECOMPILED_PLT_MATERIAL_PIPELINE_EVIDENCE = {
  source: "decompiled-aurora" as const,
  pltVertexShaderName: "vs_pltgen",
  pltFragmentShaderName: "fs_pltgen",
  pltSchemeUniformPattern: "PLTscheme[%d]",
  pltSchemeUniformCount: 15,
  pltReplacementUniformName: "pltreplacement",
  skinPaletteResRef: "pal_skin01"
};

const CREATURE_DECOMPILED_SKELETON_PIPELINE_EVIDENCE = {
  source: "decompiled-aurora" as const,
  supermodelCommandName: "setsupermodel",
  animationScaleCommandName: "setanimationscale",
  skinnedMeshNodeType: "skinmesh",
  requiresComposedSkeleton: true
};

const CREATURE_EQUIPMENT_SLOT_DEFINITIONS: ReadonlyArray<{
  mask: number;
  label: string;
  attachmentTargets: string[];
}> = [
  { mask: 0x000001, label: "head", attachmentTargets: ["head_g"] },
  { mask: 0x000002, label: "chest", attachmentTargets: ["torso_g"] },
  { mask: 0x000004, label: "boots", attachmentTargets: ["lfoot_g", "rfoot_g"] },
  { mask: 0x000008, label: "arms", attachmentTargets: ["lforearm_g", "rforearm_g"] },
  { mask: 0x000010, label: "right hand", attachmentTargets: ["rhand_g"] },
  { mask: 0x000020, label: "left hand", attachmentTargets: ["lhand_g"] },
  { mask: 0x000040, label: "cloak", attachmentTargets: ["torso_g"] },
  { mask: 0x000080, label: "right ring", attachmentTargets: ["rhand_g"] },
  { mask: 0x000100, label: "left ring", attachmentTargets: ["lhand_g"] },
  { mask: 0x000200, label: "neck", attachmentTargets: ["neck_g"] },
  { mask: 0x000400, label: "belt", attachmentTargets: ["belt_g"] },
  { mask: 0x000800, label: "arrows", attachmentTargets: ["rootdummy"] },
  { mask: 0x001000, label: "bullets", attachmentTargets: ["rootdummy"] },
  { mask: 0x002000, label: "bolts", attachmentTargets: ["rootdummy"] },
  { mask: 0x004000, label: "creature right weapon", attachmentTargets: ["rhand_g"] },
  { mask: 0x008000, label: "creature left weapon", attachmentTargets: ["lhand_g"] },
  { mask: 0x010000, label: "creature bite", attachmentTargets: ["head_g"] },
  { mask: 0x020000, label: "creature armor", attachmentTargets: ["torso_g"] }
];
const CREATURE_AMMUNITION_SLOT_LABELS = new Set(["arrows", "bullets", "bolts"]);
const CREATURE_AMMUNITION_MODEL_TYPES = new Set(["wamar", "wambo", "wambu"]);
const CREATURE_HANDHELD_BOW_MODEL_TYPES = new Set([
  "wbwln",
  "wbwsh"
]);

const CREATURE_SYNTHETIC_CAPART_SOURCE_KEY =
  "modules/current/__aurora/sources/hak/lc_2da/capart.2da";
const CREATURE_OVERRIDE_HEAD_SOURCE_KEY = "creature-process.override.Appearance_Head";
const CREATURE_EQUIPPED_ARMOR_PART_SOURCE_KEY_PREFIX =
  "creature-equipment-armor-part";
const CREATURE_PLAYER_BODY_PART_MODEL_RESREF_FORMAT = "p%c%c%s_%s_%03d";
const ITEM_ARMOR_PREVIEW_MODEL_PREFIX = "pmh0_";
const ITEM_ARMOR_PREVIEW_CONTEXT_LABEL = "human-male-phenotype0";
const ITEM_ARMOR_PREVIEW_SOURCE_KEY =
  "item-armor-preview.human-male-phenotype0.ArmorPart";
const ITEM_ARMOR_PREVIEW_MODEL_PREFIX_PATTERN = /^p[fm][a-z][0-9]_$/u;
const CREATURE_BODY_PART_CANDIDATE_DEFINITIONS: ReadonlyArray<{
  slot: CreatureRenderPackage["partModelCandidates"][number]["slot"];
  bodyPartKey: keyof CreatureRuntimeProjection["bodyParts"];
  partModelName: string;
  nodeName: string;
  source2daRow: number;
}> = [
  { slot: "rFoot", bodyPartKey: "rFoot", partModelName: "footr", nodeName: "rfoot_g", source2daRow: 0 },
  { slot: "lFoot", bodyPartKey: "lFoot", partModelName: "footl", nodeName: "lfoot_g", source2daRow: 1 },
  { slot: "rShin", bodyPartKey: "rShin", partModelName: "shinr", nodeName: "rshin_g", source2daRow: 2 },
  { slot: "lShin", bodyPartKey: "lShin", partModelName: "shinl", nodeName: "lshin_g", source2daRow: 3 },
  { slot: "lThigh", bodyPartKey: "lThigh", partModelName: "legl", nodeName: "lthigh_g", source2daRow: 4 },
  { slot: "rThigh", bodyPartKey: "rThigh", partModelName: "legr", nodeName: "rthigh_g", source2daRow: 5 },
  { slot: "pelvis", bodyPartKey: "pelvis", partModelName: "pelvis", nodeName: "pelvis_g", source2daRow: 6 },
  { slot: "torso", bodyPartKey: "torso", partModelName: "chest", nodeName: "torso_g", source2daRow: 7 },
  { slot: "belt", bodyPartKey: "belt", partModelName: "belt", nodeName: "belt_g", source2daRow: 8 },
  { slot: "neck", bodyPartKey: "neck", partModelName: "neck", nodeName: "neck_g", source2daRow: 9 },
  { slot: "rFArm", bodyPartKey: "rFArm", partModelName: "forer", nodeName: "rforearm_g", source2daRow: 10 },
  { slot: "lFArm", bodyPartKey: "lFArm", partModelName: "forel", nodeName: "lforearm_g", source2daRow: 11 },
  { slot: "rBicep", bodyPartKey: "rBicep", partModelName: "bicepr", nodeName: "rbicep_g", source2daRow: 12 },
  { slot: "lBicep", bodyPartKey: "lBicep", partModelName: "bicepl", nodeName: "lbicep_g", source2daRow: 13 },
  { slot: "rShoul", bodyPartKey: "rShoul", partModelName: "shor", nodeName: "rshoulder_g", source2daRow: 14 },
  { slot: "lShoul", bodyPartKey: "lShoul", partModelName: "shol", nodeName: "lshoulder_g", source2daRow: 15 },
  { slot: "rHand", bodyPartKey: "rHand", partModelName: "handr", nodeName: "rhand_g", source2daRow: 16 },
  { slot: "lHand", bodyPartKey: "lHand", partModelName: "handl", nodeName: "lhand_g", source2daRow: 17 },
  { slot: "robe", bodyPartKey: "robe", partModelName: "robe", nodeName: "root", source2daRow: 18 }
];

const CREATURE_BODY_PART_CANDIDATE_DEFINITION_BY_KEY = new Map(
  CREATURE_BODY_PART_CANDIDATE_DEFINITIONS.map((definition) => [
    definition.bodyPartKey,
    definition
  ])
);

type CreatureRuntimeEquippedItemEntry =
  NonNullable<CreatureRuntimeProjection["lists"]["equippedItems"]>[number];

const ITEM_MODEL_PART_ROLES = ["blade", "middle", "top"] as const;
const ITEM_MODEL_PART_RESREF_SUFFIXES = ["b", "m", "t"] as const;
const ITEM_CLOAK_MODEL_TYPE = "cloak";
const DEFAULT_MODEL_ITEM_MODEL_TYPES = new Set(["it_potion"]);
const SINGLE_PIECE_ITEM_MODEL_TYPES = new Set([
  "ashlw",
  "ashsw",
  "ashto",
  "cloak",
  "helm",
  "it_bag",
  "it_belt",
  "it_bigbox",
  "it_book",
  "it_bracer",
  "it_cr_bite",
  "it_cr_blud",
  "it_cr_item",
  "it_cr_prc",
  "it_cr_sla",
  "it_encamp",
  "it_gem",
  "it_glove",
  "it_gold",
  "it_horn",
  "it_medkit",
  "it_misc",
  "it_midmisc",
  "it_moon",
  "it_neck",
  "it_picks",
  "it_ring",
  "it_sbox",
  "it_scroll",
  "it_smlmisc",
  "it_spscroll",
  "it_smlmis3",
  "it_talmisc",
  "it_thnmisc",
  "it_torch",
  "it_trap",
  "it_x1_gren",
  "wambu",
  "wbwsl",
  "wlcfg",
  "wthdt",
  "wthsh"
]);
const CREATURE_INTERNAL_EQUIPMENT_SLOT_LABELS = new Set([
  "creature right weapon",
  "creature left weapon",
  "creature bite",
  "creature armor"
]);

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
  dwk: "metadata",
  pwk: "metadata",
  wok: "metadata",
  dds: "texture",
  tga: "texture",
  plt: "texture",
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
  "creaturedirectmodelrefs",
  "creatureskeletonmodelrefs",
  "creaturepartmodelrefs",
  "creaturesupermodelrefs",
  "creatureequipmentmodelrefs",
  "itemmodelrefs",
  "itemiconrefs",
  "itemtexturerefs",
  "modeltexturereferences"
]);

const PLACEABLE_TEMPLATE_ID_PREFIXES = ["plc_", "cre_", "itm_"] as const;
const TEXTURE_LOOKUP_ROLES = new Set<PlaceableAssetRole>(["texture", "material"]);
const MATERIAL_LOOKUP_ROLES = new Set<PlaceableAssetRole>(["material"]);
const MODEL_LOOKUP_ROLES = new Set<PlaceableAssetRole>(["model", "unknown"]);
const AURORA_CREATURE_DEFAULT_CHALLENGE_RATING = 1;
const AURORA_CREATURE_DEFAULT_FACTION_ID = 0;
const AURORA_CREATURE_DEFAULT_ALIGNMENT = 50;
const AURORA_CREATURE_DEFAULT_PERCEPTION_RANGE = 11;
const AURORA_CREATURE_DEFAULT_DISARMABLE = true;
const AURORA_CREATURE_DEFAULT_INTERRUPTABLE = true;
const AURORA_CREATURE_DEFAULT_FALSE_FLAG = false;
const AURORA_CREATURE_DEFAULT_DECAY_TIME = 0;

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
      if (
        !matchesLookupSeedRoles(asset, descriptor) &&
        !matchesExactModelTextureCompanion(asset, descriptor)
      ) {
        continue;
      }
      uniqueByObjectKey.set(asset.objectKey, asset);
    }

    const prefixBucket = index.byPrefix.get(seed.slice(0, 4)) ?? [];
    if (!isExactModelLookupSeed(descriptor)) {
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
    case "modelresref":
    case "appearanceresref":
    case "model":
    case "lookupmodelresref":
      return MODEL_LOOKUP_ROLES;
    case "modeltexturereferences":
    case "textureprefix":
    case "itemiconrefs":
    case "itemtexturerefs":
      return TEXTURE_LOOKUP_ROLES;
    case "materialprefix":
      return MATERIAL_LOOKUP_ROLES;
    case "chunkmodelreferences":
    case "creaturedirectmodelrefs":
    case "creatureskeletonmodelrefs":
    case "creaturepartmodelrefs":
    case "creaturesupermodelrefs":
    case "creatureequipmentmodelrefs":
    case "itemmodelrefs":
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

function matchesExactModelTextureCompanion(
  asset: PlaceableAssetEntry,
  descriptor: PlaceableLookupSeedDescriptor
): boolean {
  return isExactModelLookupSeed(descriptor) && asset.role === "texture";
}

function isExactModelLookupSeed(descriptor: PlaceableLookupSeedDescriptor): boolean {
  return Boolean(
    descriptor.roles &&
      descriptor.roles.size === MODEL_LOOKUP_ROLES.size &&
      [...MODEL_LOOKUP_ROLES].every((role) => descriptor.roles!.has(role))
  );
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
    getPlaceableAssetSourceRank(leftSource, sourcePriority) -
    getPlaceableAssetSourceRank(rightSource, sourcePriority);
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

function getPlaceableAssetSourceRank(
  source: PlaceableAssetSourceDescriptor,
  sourcePriority?: PlaceableAssetSourcePriority
): number {
  if (source.layer === "module") {
    return 0;
  }
  if (source.layer === "hak") {
    if (!sourcePriority) {
      return 1;
    }
    return getPlaceableHakRank(source.hakName, sourcePriority) < Number.MAX_SAFE_INTEGER
      ? 1
      : 3;
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
  kind: "creature" | "item" | "encounter"
): TemplateRenderContract {
  if (kind === "creature") {
    return {
      backendType: "creature",
      frontendType: "creature",
      rendererPreset: "creature-standard"
    };
  }
  if (kind === "encounter") {
    return {
      backendType: "encounter",
      frontendType: "encounter",
      rendererPreset: "encounter-standard"
    };
  }

  return {
    backendType: "item",
    frontendType: "item",
    rendererPreset: "item-standard"
  };
}

export function buildCreatureRenderPackage(
  runtime: CreatureRuntimeProjection
): CreatureRenderPackage {
  const appearanceProfile = buildCreatureRenderAppearanceProfile(runtime);
  const sourceModelCandidates = buildCreatureRenderSourceModelCandidates(appearanceProfile);
  const partModelCandidates = buildCreatureRuntimePartModelCandidates(
    runtime,
    appearanceProfile
  );
  const skeletonModelCandidates = buildCreatureRenderSkeletonModelCandidates(
    partModelCandidates
  );
  const equipmentModelCandidates = buildCreatureRenderEquipmentModelCandidates(runtime);
  const diagnostics: CreatureRenderPackage["diagnostics"] = [];
  const hasColorPayload = hasCreatureColorPayload(runtime);
  const hasEquipmentArmorPartOverrides = partModelCandidates.some((candidate) =>
    candidate.sourceKey.startsWith(CREATURE_EQUIPPED_ARMOR_PART_SOURCE_KEY_PREFIX)
  );
  const hasSkeletonPipelinePayload =
    appearanceProfile?.modelType?.toUpperCase() === "P" ||
    hasCreatureBodyPartPayload(runtime) ||
    partModelCandidates.length > 0;

  if (equipmentModelCandidates.length > 0) {
    diagnostics.push({
      code: "CREATURE_RENDER_EQUIPMENT_CANDIDATES_READY",
      severity: "warn",
      message:
        "Creature Equip_ItemList item candidates were preserved for source-backed equipment attachment; item model GLB handoff is still pending."
    });
  }

  if (hasEquipmentArmorPartOverrides) {
    diagnostics.push({
      code: "CREATURE_RENDER_EQUIPPED_ARMOR_PART_OVERRIDES_READY",
      severity: "warn",
      message:
        "Equipped armor/clothing body-part overrides were applied to the part-based creature model package."
    });
  }

  if (!appearanceProfile || !hasCreatureAppearanceTwoDaProfile(runtime)) {
    diagnostics.push({
      code: "CREATURE_RENDER_PROFILE_MISSING",
      severity: "error",
      message:
        "Creature renderer requires a source-backed appearance.2da profile before model assembly can be selected."
    });
    return {
      status: "missing_profile",
      diagnostics,
      rendererPreset: "creature-standard",
      sourceModelCandidates: [],
      skeletonModelCandidates: [],
      partModelCandidates: [],
      equipmentModelCandidates,
      bodyParts: { ...runtime.bodyParts },
      colors: { ...runtime.colors }
    };
  }

  if (sourceModelCandidates.length > 0) {
    diagnostics.push({
      code: "CREATURE_RENDER_SOURCE_MODEL_CANDIDATE_READY",
      severity: "warn",
      message:
        "appearance.2da RACE is available as the source model candidate; derived creature GLB assembly is still pending."
    });
  }

  diagnostics.push({
    code: "CREATURE_RENDER_SKINNED_GLB_MISSING",
    severity: "error",
    message:
      "Creature appearance profile is available, but no composed skinned/body-part GLB render package is produced yet."
  });

  if (
    appearanceProfile.modelType?.toUpperCase() === "P" ||
    hasCreatureBodyPartPayload(runtime)
  ) {
    if (partModelCandidates.length > 0) {
      diagnostics.push({
        code: "CREATURE_RENDER_CAPART_PART_MODELS_READY",
        severity: "warn",
        message:
          "Creature part/accessory model candidates were resolved from source rows; composed skinned GLB assembly is still pending."
      });
    } else {
      diagnostics.push({
        code: "CREATURE_RENDER_PART_BASED_ASSEMBLY_PENDING",
        severity: "warn",
        message:
          "Part-based creature appearance data is preserved; source-backed part/accessory model assembly is still pending."
      });
    }
  }

  if (skeletonModelCandidates.length > 0) {
    diagnostics.push({
      code: "CREATURE_RENDER_BASE_SKELETON_CANDIDATE_READY",
      severity: "warn",
      message:
        "Creature part model prefix was resolved into a base skeleton model candidate for future skeleton attachment."
    });
  }

  if (hasColorPayload) {
    diagnostics.push({
      code: "CREATURE_RENDER_MATERIAL_TINT_BRIDGE_READY",
      severity: "warn",
      message:
        "Creature palette/color channels are preserved and can drive the frontend material tint bridge."
    });
    diagnostics.push({
      code: "CREATURE_RENDER_RETAIL_PLT_SHADER_PENDING",
      severity: "warn",
      message:
        "Exact retail PLT shader palette lookup remains pending beyond the material tint bridge."
    });
  }

  return {
    status: "missing_derived",
    diagnostics,
    rendererPreset: "creature-standard",
    appearanceProfile,
    sourceModelCandidates,
    skeletonModelCandidates,
    partModelCandidates,
    equipmentModelCandidates,
    bodyParts: { ...runtime.bodyParts },
    colors: { ...runtime.colors },
    ...(hasColorPayload
      ? { materialPipelineEvidence: CREATURE_DECOMPILED_PLT_MATERIAL_PIPELINE_EVIDENCE }
      : {}),
    ...(hasSkeletonPipelinePayload
      ? { skeletonPipelineEvidence: CREATURE_DECOMPILED_SKELETON_PIPELINE_EVIDENCE }
      : {})
  };
}

export function applyCreatureRuntimeAppearanceOverride(
  runtime: CreatureRuntimeProjection,
  override: CreatureAppearanceProcessOverride | undefined
): CreatureRuntimeProjection {
  if (!override) {
    return runtime;
  }

  let didChange = false;
  const next: CreatureRuntimeProjection = {
    ...runtime,
    appearance: { ...runtime.appearance },
    bodyParts: { ...runtime.bodyParts },
    colors: { ...runtime.colors },
    partModelCandidates: [...runtime.partModelCandidates]
  };
  const appearanceProfile = buildCreatureRenderAppearanceProfile(next);
  const modelPrefix =
    appearanceProfile?.modelType?.trim().toUpperCase() === "P"
      ? buildCreatureRuntimeBodyPartModelPrefix(next, appearanceProfile)
      : undefined;

  const appearanceHead = normalizeCreatureAppearanceOverrideNumber(
    override.appearanceHead
  );
  if (appearanceHead !== undefined) {
    next.appearance.appearanceHead = appearanceHead;
    didChange = true;
    if (modelPrefix) {
      next.partModelCandidates = upsertCreatureRuntimePartModelCandidate(
        next.partModelCandidates,
        buildCreatureRuntimeHeadModelCandidate(next, modelPrefix, appearanceHead)
      );
    }
  }

  const wingsNew = normalizeCreatureAppearanceOverrideNumber(override.wingsNew);
  if (wingsNew !== undefined) {
    next.appearance.wingsNew = wingsNew;
    didChange = true;
  }

  const tailNew = normalizeCreatureAppearanceOverrideNumber(override.tailNew);
  if (tailNew !== undefined) {
    next.appearance.tailNew = tailNew;
    didChange = true;
  }

  for (const key of Object.keys(next.bodyParts) as Array<
    keyof CreatureRuntimeProjection["bodyParts"]
  >) {
    const partId = normalizeCreatureAppearanceOverrideNumber(
      override.bodyParts?.[key]
    );
    if (partId === undefined) {
      continue;
    }
    next.bodyParts[key] = partId;
    didChange = true;
    if (!modelPrefix) {
      continue;
    }
    const definition = CREATURE_BODY_PART_CANDIDATE_DEFINITION_BY_KEY.get(key);
    if (!definition) {
      continue;
    }
    const renderablePartId = resolveCreatureRuntimeBodyPartId(
      partId,
      definition.slot
    );
    next.partModelCandidates =
      renderablePartId === undefined
        ? removeCreatureRuntimePartModelCandidate(next.partModelCandidates, definition.slot)
        : upsertCreatureRuntimePartModelCandidate(
            next.partModelCandidates,
            buildCreatureRuntimeBodyPartCandidate(definition, modelPrefix, renderablePartId)
          );
  }

  for (const key of Object.keys(next.colors) as Array<
    keyof CreatureRuntimeProjection["colors"]
  >) {
    const colorId = normalizeCreatureAppearanceOverrideNumber(override.colors?.[key]);
    if (colorId === undefined) {
      continue;
    }
    next.colors[key] = colorId;
    didChange = true;
  }

  return didChange ? next : runtime;
}

function normalizeCreatureAppearanceOverrideNumber(
  value: number | undefined
): number | undefined {
  if (!Number.isInteger(value ?? Number.NaN) || value === undefined) {
    return undefined;
  }
  return Math.max(0, Math.trunc(value));
}

function buildCreatureRuntimeHeadModelCandidate(
  runtime: CreatureRuntimeProjection,
  modelPrefix: string,
  partId: number
): CreatureRenderPackage["partModelCandidates"][number] {
  const previousHead = runtime.partModelCandidates.find(
    (candidate) => candidate.slot === "head"
  );
  return {
    slot: "head",
    partId,
    partModelName: "head",
    modelPrefix,
    modelResRef: `${modelPrefix}head${String(partId).padStart(3, "0")}`.toLowerCase(),
    modelResRefPattern: "aurora-player-body-part",
    modelResRefPatternFormat:
      previousHead?.modelResRefPatternFormat ?? CREATURE_PLAYER_BODY_PART_MODEL_RESREF_FORMAT,
    source: "utc.Appearance_Head",
    sourceKey:
      previousHead?.sourceKey ||
      runtime.source.modelResRef ||
      runtime.identity.templateResRef ||
      CREATURE_OVERRIDE_HEAD_SOURCE_KEY
  };
}

function buildCreatureRuntimeBodyPartCandidate(
  definition: (typeof CREATURE_BODY_PART_CANDIDATE_DEFINITIONS)[number],
  modelPrefix: string,
  partId: number
): CreatureRenderPackage["partModelCandidates"][number] {
  return {
    slot: definition.slot,
    partId,
    partModelName: definition.partModelName,
    nodeName: definition.nodeName,
    modelPrefix,
    modelResRef: `${modelPrefix}${definition.partModelName}${String(partId).padStart(
      3,
      "0"
    )}`.toLowerCase(),
    modelResRefPattern: "aurora-player-body-part",
    modelResRefPatternFormat: CREATURE_PLAYER_BODY_PART_MODEL_RESREF_FORMAT,
    source: "capart.2da.MDLNAME",
    source2daRow: definition.source2daRow,
    sourceKey: CREATURE_SYNTHETIC_CAPART_SOURCE_KEY
  };
}

function upsertCreatureRuntimePartModelCandidate(
  candidates: CreatureRenderPackage["partModelCandidates"],
  replacement: CreatureRenderPackage["partModelCandidates"][number]
): CreatureRenderPackage["partModelCandidates"] {
  const next = candidates.filter((candidate) => candidate.slot !== replacement.slot);
  next.push(replacement);
  return next;
}

function removeCreatureRuntimePartModelCandidate(
  candidates: CreatureRenderPackage["partModelCandidates"],
  slot: CreatureRenderPackage["partModelCandidates"][number]["slot"]
): CreatureRenderPackage["partModelCandidates"] {
  return candidates.filter((candidate) => candidate.slot !== slot);
}

export function buildPlaceableRuntimeProjection(
  metadata: Record<string, string | number | boolean>
): PlaceableRuntimeProjection {
  const scripts = extractScriptMap(metadata);
  const sourceLightState = readMetadataNumber(metadata, "lightState");
  const hasSourceLightState =
    typeof sourceLightState === "number" && Number.isFinite(sourceLightState);

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
      lightState: hasSourceLightState ? sourceLightState : 1,
      lightStateSource: hasSourceLightState
        ? "utp.LightState"
        : "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwserver.exe .pdata function 0x1404484d0..0x14044a2ec contains LightState xref at 0x140448ed0 and mov [rbx+0x368],1 at 0x140448eb5 before the optional LightState read",
      lightStateProofStatus: hasSourceLightState
        ? "source-backed-utp-lightstate"
        : "retail-binary-backed-nwserver-lightstate-default-on-xref",
      lightStateDefaulted: !hasSourceLightState
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
      const hasNoGeometrySourceModel = manifest.assets.some(isUnrenderableSourceModelAsset);
      diagnostics.push({
        code: hasNoGeometrySourceModel
          ? "PLACEABLE_RENDER_SOURCE_MODEL_NO_GEOMETRY"
          : "PLACEABLE_RENDER_UNSUPPORTED_ASSET_SET",
        severity: "warn",
        message: hasNoGeometrySourceModel
          ? "Source model assets were found, but conversion reported no renderable mesh geometry; treating this as an invisible/helper placeable."
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
  const factionId = readMetadataNumber(metadata, "factionId");
  const challengeRating = readMetadataNumber(metadata, "challengeRating");
  const perceptionRange = readMetadataNumber(metadata, "perceptionRange");
  const goodEvil = readMetadataNumber(metadata, "goodEvil");
  const lawfulChaotic = readMetadataNumber(metadata, "lawfulChaotic");
  const plot = readMetadataBoolean(metadata, "plot");
  const disarmable = readMetadataBoolean(metadata, "disarmable");
  const isPc = readMetadataBoolean(metadata, "isPc");
  const isImmortal = readMetadataBoolean(metadata, "isImmortal");
  const lootable = readMetadataBoolean(metadata, "lootable");
  const interruptable = readMetadataBoolean(metadata, "interruptable");
  const noPermDeath = readMetadataBoolean(metadata, "noPermDeath");
  const bodyBag = readMetadataBoolean(metadata, "bodyBag");
  const startingPackage = readMetadataBoolean(metadata, "startingPackage");
  const decayTime = readMetadataNumber(metadata, "decayTime");
  const walkRate = readMetadataNumber(metadata, "walkRate");
  const walkRateEffective = readMetadataNumber(metadata, "walkRateEffective");
  const inventoryItems = buildCreatureInventoryItemRuntimeEntries(
    readMetadataJsonArray<CreatureInventoryItemMetadataEntry>(
      metadata,
      "inventoryItemListEntries"
    )
  );
  const equippedItems = buildCreatureEquippedItemRuntimeEntries(
    readMetadataJsonArray<CreatureEquippedItemMetadataEntry>(
      metadata,
      "equipItemListEntries"
    )
  );

  return {
    source: {
      etag: readMetadataString(metadata, "sourceEtag"),
      fileType: readMetadataString(metadata, "sourceFileType"),
      fileVersion: readMetadataString(metadata, "sourceFileVersion"),
      structTypeId: readMetadataNumber(metadata, "sourceStructTypeId"),
      modelResRef: readMetadataString(metadata, "modelResRef")
    },
    identity: {
      templateResRef: readMetadataString(metadata, "templateResRef"),
      firstName: readMetadataString(metadata, "firstName"),
      firstNameStrRef: readMetadataNumber(metadata, "firstNameStrRef"),
      lastName: readMetadataString(metadata, "lastName"),
      lastNameStrRef: readMetadataNumber(metadata, "lastNameStrRef"),
      localizedName: readMetadataString(metadata, "localizedName"),
      localizedNameStrRef: readMetadataNumber(metadata, "localizedNameStrRef"),
      displayName: readMetadataString(metadata, "displayName"),
      description: readMetadataString(metadata, "description"),
      descriptionStrRef: readMetadataNumber(metadata, "descriptionStrRef"),
      identifiedDescription: readMetadataString(metadata, "identifiedDescription"),
      identifiedDescriptionStrRef: readMetadataNumber(metadata, "identifiedDescriptionStrRef"),
      comments: readMetadataString(metadata, "comments"),
      paletteId: readMetadataNumber(metadata, "paletteId"),
      tag: readMetadataString(metadata, "tag"),
      conversation: readMetadataString(metadata, "conversation"),
      gender: readMetadataNumber(metadata, "gender"),
      genderLabel: readMetadataString(metadata, "genderLabel"),
      genderLabelSource2daRow: readMetadataNumber(metadata, "genderLabelSource2daRow"),
      genderLabelSourceKey: readMetadataString(metadata, "genderLabelSourceKey"),
      race: readMetadataNumber(metadata, "race"),
      raceLabel: readMetadataString(metadata, "raceLabel"),
      raceLabelSource2daRow: readMetadataNumber(metadata, "raceLabelSource2daRow"),
      raceLabelSourceKey: readMetadataString(metadata, "raceLabelSourceKey"),
      raceAppearanceId: readMetadataNumber(metadata, "raceAppearanceId"),
      subrace: readMetadataString(metadata, "subrace"),
      subraceStrRef: readMetadataNumber(metadata, "subraceStrRef"),
      deity: readMetadataString(metadata, "deity"),
      deityStrRef: readMetadataNumber(metadata, "deityStrRef"),
      phenotype: readMetadataNumber(metadata, "phenotype"),
      phenotypeLabel: readMetadataString(metadata, "phenotypeLabel"),
      phenotypeLabelSource2daRow: readMetadataNumber(metadata, "phenotypeLabelSource2daRow"),
      phenotypeLabelSourceKey: readMetadataString(metadata, "phenotypeLabelSourceKey")
    },
    appearance: {
      appearanceType: readMetadataNumber(metadata, "appearanceId"),
      appearanceLabel: readMetadataString(metadata, "appearanceLabel"),
      appearanceLabelSource2daRow: readMetadataNumber(metadata, "appearanceLabelSource2daRow"),
      appearanceLabelSourceKey: readMetadataString(metadata, "appearanceLabelSourceKey"),
      appearanceModelType: readMetadataString(metadata, "appearanceModelType"),
      appearanceRaceModel: readMetadataString(metadata, "appearanceRaceModel"),
      appearancePortrait2da: readMetadataString(metadata, "appearancePortrait2da"),
      appearanceEnvMap: readMetadataString(metadata, "appearanceEnvMap"),
      appearanceDefaultPhenotype: readMetadataString(
        metadata,
        "appearanceDefaultPhenotype"
      ),
      appearanceBloodColor: readMetadataString(metadata, "appearanceBloodColor"),
      appearanceWeaponScale: readMetadataNumber(metadata, "appearanceWeaponScale"),
      appearanceSizeCategory: readMetadataNumber(metadata, "appearanceSizeCategory"),
      appearanceSizeCategoryLabel: readMetadataString(
        metadata,
        "appearanceSizeCategoryLabel"
      ),
      appearanceSizeCategorySource2daRow: readMetadataNumber(
        metadata,
        "appearanceSizeCategorySource2daRow"
      ),
      appearanceSizeCategorySourceKey: readMetadataString(
        metadata,
        "appearanceSizeCategorySourceKey"
      ),
      portraitId: readMetadataNumber(metadata, "portraitId"),
      portraitIdEffective: readMetadataNumber(metadata, "portraitIdEffective"),
      portraitResRef: readMetadataString(metadata, "portraitResRef"),
      portraitResolvedResRef: readMetadataString(metadata, "portraitResolvedResRef"),
      portraitResolvedSource2daRow: readMetadataNumber(metadata, "portraitResolvedSource2daRow"),
      portraitResolvedSourceKey: readMetadataString(metadata, "portraitResolvedSourceKey"),
      soundSetFile: readMetadataNumber(metadata, "soundSetFile"),
      soundSetLabel: readMetadataString(metadata, "soundSetLabel"),
      soundSetResRef: readMetadataString(metadata, "soundSetResRef"),
      soundSetSource2daRow: readMetadataNumber(metadata, "soundSetSource2daRow"),
      soundSetSourceKey: readMetadataString(metadata, "soundSetSourceKey"),
      appearanceHead: readMetadataNumber(metadata, "appearanceHead"),
      wingsNew: readMetadataNumber(metadata, "wingsNew"),
      tailNew: readMetadataNumber(metadata, "tailNew")
    },
    state: {
      plot,
      isPc,
      isImmortal,
      lootable,
      interruptable,
      noPermDeath,
      bodyBag,
      startingPackage,
      decayTime,
      walkRate,
      walkRateSource2daRow: readMetadataNumber(metadata, "walkRateSource2daRow"),
      walkRateSource2daName: readMetadataString(metadata, "walkRateSource2daName"),
      walkRateSpeed2daRow: readMetadataNumber(metadata, "walkRateSpeed2daRow"),
      walkRateAppearance2daSourceKey: readMetadataString(
        metadata,
        "walkRateAppearance2daSourceKey"
      ),
      walkRateSpeed2daSourceKey: readMetadataString(metadata, "walkRateSpeed2daSourceKey"),
      animationState: readMetadataNumber(metadata, "animationState")
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
    partModelCandidates: readCreatureRenderPartModelCandidates(metadata),
    faction: {
      factionId
    },
    stats: {
      challengeRating,
      crAdjust: readMetadataNumber(metadata, "crAdjust"),
      perceptionRange,
      naturalAc: readMetadataNumber(metadata, "naturalAc"),
      hitPoints: readMetadataNumber(metadata, "hitPoints"),
      currentHitPoints: readMetadataNumber(metadata, "currentHitPoints"),
      maxHitPoints: readMetadataNumber(metadata, "maxHitPoints"),
      reflexBonus: readMetadataNumber(metadata, "reflexBonus"),
      willBonus: readMetadataNumber(metadata, "willBonus"),
      fortitudeBonus: readMetadataNumber(metadata, "fortitudeBonus"),
      strength: readMetadataNumber(metadata, "strength"),
      dexterity: readMetadataNumber(metadata, "dexterity"),
      constitution: readMetadataNumber(metadata, "constitution"),
      intelligence: readMetadataNumber(metadata, "intelligence"),
      wisdom: readMetadataNumber(metadata, "wisdom"),
      charisma: readMetadataNumber(metadata, "charisma"),
      strengthAdjust: readMetadataNumber(metadata, "strengthAdjust"),
      dexterityAdjust: readMetadataNumber(metadata, "dexterityAdjust"),
      constitutionAdjust: readMetadataNumber(metadata, "constitutionAdjust"),
      intelligenceAdjust: readMetadataNumber(metadata, "intelligenceAdjust"),
      wisdomAdjust: readMetadataNumber(metadata, "wisdomAdjust"),
      charismaAdjust: readMetadataNumber(metadata, "charismaAdjust"),
      goodEvil,
      lawfulChaotic
    },
    combat: {
      disarmable
    },
    effective: {
      challengeRating: challengeRating ?? AURORA_CREATURE_DEFAULT_CHALLENGE_RATING,
      factionId: factionId ?? AURORA_CREATURE_DEFAULT_FACTION_ID,
      goodEvil: goodEvil ?? AURORA_CREATURE_DEFAULT_ALIGNMENT,
      lawfulChaotic: lawfulChaotic ?? AURORA_CREATURE_DEFAULT_ALIGNMENT,
      perceptionRange: perceptionRange ?? AURORA_CREATURE_DEFAULT_PERCEPTION_RANGE,
      disarmable: disarmable ?? AURORA_CREATURE_DEFAULT_DISARMABLE,
      plot: plot ?? AURORA_CREATURE_DEFAULT_FALSE_FLAG,
      isPc: isPc ?? AURORA_CREATURE_DEFAULT_FALSE_FLAG,
      isImmortal: isImmortal ?? AURORA_CREATURE_DEFAULT_FALSE_FLAG,
      lootable: lootable ?? AURORA_CREATURE_DEFAULT_FALSE_FLAG,
      interruptable: interruptable ?? AURORA_CREATURE_DEFAULT_INTERRUPTABLE,
      noPermDeath: noPermDeath ?? AURORA_CREATURE_DEFAULT_FALSE_FLAG,
      bodyBag: bodyBag ?? AURORA_CREATURE_DEFAULT_FALSE_FLAG,
      startingPackage: startingPackage ?? AURORA_CREATURE_DEFAULT_FALSE_FLAG,
      decayTime: decayTime ?? AURORA_CREATURE_DEFAULT_DECAY_TIME,
      ...((walkRate ?? walkRateEffective) !== undefined
        ? { walkRate: walkRate ?? walkRateEffective }
        : {})
    },
    lists: {
      classListCount: readMetadataNumber(metadata, "classListCount"),
      skillListCount: readMetadataNumber(metadata, "skillListCount"),
      featListCount: readMetadataNumber(metadata, "featListCount"),
      templateListCount: readMetadataNumber(metadata, "templateListCount"),
      specAbilityListCount: readMetadataNumber(metadata, "specAbilityListCount"),
      inventoryItemListCount: readMetadataNumber(metadata, "inventoryItemListCount"),
      equipItemListCount: readMetadataNumber(metadata, "equipItemListCount"),
      classes: readMetadataJsonArray<{
        classId?: number;
        classLabel?: string;
        classLabelSource2daRow?: number;
        classLabelSourceKey?: string;
        level?: number;
        knownSpellCount?: number;
        memorizedSpellCount?: number;
          knownSpells?: Array<{
            spellId?: number;
            spellLevel?: number;
            metaMagic?: number;
            flags?: number;
            spellLabel?: string;
            spellLabelSource2daRow?: number;
            spellLabelSourceKey?: string;
          }>;
          memorizedSpells?: Array<{
            spellId?: number;
            spellLevel?: number;
            metaMagic?: number;
            flags?: number;
            spellLabel?: string;
            spellLabelSource2daRow?: number;
            spellLabelSourceKey?: string;
          }>;
      }>(metadata, "classListEntries"),
      feats: readMetadataJsonArray<{
        featId?: number;
        featLabel?: string;
        featLabelSource2daRow?: number;
        featLabelSourceKey?: string;
      }>(metadata, "featListEntries"),
      templates: readMetadataJsonArray<{ templateId?: number }>(
        metadata,
        "templateListEntries"
      ),
      specialAbilities: readMetadataJsonArray<{
        spellId?: number;
        flags?: number;
        casterLevel?: number;
        spellLabel?: string;
        spellLabelSource2daRow?: number;
        spellLabelSourceKey?: string;
      }>(metadata, "specAbilityListEntries"),
      inventoryItems,
      equippedItems,
      skills: readMetadataJsonArray<{
        skillId?: number;
        skillLabel?: string;
        skillLabelSource2daRow?: number;
        skillLabelSourceKey?: string;
        rank?: number;
      }>(metadata, "skillListEntries")
    },
    scripts
  };
}

function buildCreatureInventoryItemRuntimeEntries(
  entries: CreatureInventoryItemMetadataEntry[] | undefined
): CreatureInventoryItemRuntimeEntry[] | undefined {
  return entries?.map(({ itemTemplateMetadata, ...entry }) => {
    const itemRuntime = buildEmbeddedItemRuntimeProjection(itemTemplateMetadata);
    return itemRuntime ? { ...entry, itemRuntime } : entry;
  });
}

function buildCreatureEquippedItemRuntimeEntries(
  entries: CreatureEquippedItemMetadataEntry[] | undefined
): CreatureEquippedItemRuntimeEntry[] | undefined {
  return entries?.map(({ itemTemplateMetadata, ...entry }) => {
    const itemRuntime = buildEmbeddedItemRuntimeProjection(itemTemplateMetadata);
    return itemRuntime ? { ...entry, itemRuntime } : entry;
  });
}

function buildEmbeddedItemRuntimeProjection(
  metadata: unknown
): ItemRuntimeProjection | undefined {
  if (!isEmbeddedItemMetadataRecord(metadata)) {
    return undefined;
  }
  return buildItemRuntimeProjection(metadata);
}

function isEmbeddedItemMetadataRecord(
  value: unknown
): value is EmbeddedItemMetadataRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(
    (entry) =>
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean"
  );
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

  if (
    typeof runtime.stats.goodEvil !== "number" ||
    typeof runtime.stats.lawfulChaotic !== "number"
  ) {
    issues.push({
      code: "CREATURE_ALIGNMENT_DEFAULTED",
      severity: "warn",
      message:
        "GoodEvil/LawfulChaotic is missing; Aurora treats missing creature alignment as neutral 50."
    });
  }

  if (runtime.appearance.appearanceType !== undefined && runtime.appearance.appearanceHead === undefined) {
    issues.push({
      code: "CREATURE_APPEARANCE_HEAD_MISSING",
      severity: "warn",
      message: "Appearance_Head is missing while appearance data is present."
    });
  }

  if (
    typeof runtime.appearance.appearanceType === "number" &&
    !hasCreatureAppearanceTwoDaProfile(runtime)
  ) {
    issues.push({
      code: "CREATURE_APPEARANCE_ROW_MISSING",
      severity: "warn",
      message:
        "Appearance_Type is present but was not resolved to an appearance.2da source profile."
    });
  }

  if (
    (typeof runtime.appearance.portraitId === "number" ||
      typeof runtime.appearance.portraitIdEffective === "number") &&
    !runtime.appearance.portraitResRef &&
    !runtime.appearance.portraitResolvedResRef
  ) {
    issues.push({
      code: "CREATURE_PORTRAIT_LOOKUP_MISSING",
      severity: "warn",
      message:
        "PortraitId is present but no Portrait resref or portraits.2da BaseResRef lookup was resolved."
    });
  }

  const unresolvedWingsTail =
    (typeof runtime.appearance.wingsNew === "number" &&
      !runtime.partModelCandidates.some((candidate) => candidate.slot === "wings")) ||
    (typeof runtime.appearance.tailNew === "number" &&
      !runtime.partModelCandidates.some((candidate) => candidate.slot === "tail"));
  if (unresolvedWingsTail) {
    issues.push({
      code: "CREATURE_WINGS_TAIL_RUNTIME_GAP",
      severity: "warn",
      message:
        "Wings_New/Tail_New is preserved from source metadata, but no source-backed wing/tail model candidate was resolved."
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

  if (!hasAnyCreatureOptionalListPayload(runtime)) {
    issues.push({
      code: "CREATURE_OPTIONAL_LIST_ABSENT",
      severity: "warn",
      message:
        "No creature ClassList, SkillList, FeatList, TemplateList, SpecAbilityList, ItemList, or Equip_ItemList payload was extracted."
    });
  }

  const unresolvedItemReferences = [
    ...(runtime.lists.inventoryItems ?? []),
    ...(runtime.lists.equippedItems ?? [])
  ].filter((entry) => entry.resRef && !entry.itemTemplateId);
  if (unresolvedItemReferences.length > 0) {
    issues.push({
      code: "CREATURE_ITEM_REFERENCE_UNRESOLVED",
      severity: "warn",
      message:
        "Creature ItemList/Equip_ItemList contains item resrefs that could not be linked to UTI templates."
    });
  }

  return issues;
}

function hasAnyCreatureOptionalListPayload(runtime: CreatureRuntimeProjection): boolean {
  const listArrays = [
    runtime.lists.classes,
    runtime.lists.skills,
    runtime.lists.feats,
    runtime.lists.templates,
    runtime.lists.specialAbilities,
    runtime.lists.inventoryItems,
    runtime.lists.equippedItems
  ];
  if (listArrays.some((entries) => Array.isArray(entries) && entries.length > 0)) {
    return true;
  }

  return [
    runtime.lists.classListCount,
    runtime.lists.skillListCount,
    runtime.lists.featListCount,
    runtime.lists.templateListCount,
    runtime.lists.specAbilityListCount,
    runtime.lists.inventoryItemListCount,
    runtime.lists.equipItemListCount
  ].some((count) => typeof count === "number");
}

function hasCreatureAppearanceTwoDaProfile(runtime: CreatureRuntimeProjection): boolean {
  return (
    typeof runtime.appearance.appearanceLabelSource2daRow === "number" ||
    Boolean(
      runtime.appearance.appearanceLabel ||
        runtime.appearance.appearanceModelType ||
        runtime.appearance.appearanceRaceModel ||
        runtime.appearance.appearancePortrait2da ||
        runtime.appearance.appearanceEnvMap ||
        runtime.appearance.appearanceDefaultPhenotype ||
        runtime.appearance.appearanceBloodColor ||
        runtime.appearance.appearanceWeaponScale !== undefined ||
        runtime.appearance.appearanceSizeCategoryLabel ||
        runtime.appearance.appearanceSizeCategory !== undefined
    )
  );
}

function buildCreatureRenderAppearanceProfile(
  runtime: CreatureRuntimeProjection
): CreatureRenderPackage["appearanceProfile"] {
  const profile: NonNullable<CreatureRenderPackage["appearanceProfile"]> = {
    ...(runtime.appearance.appearanceType !== undefined
      ? { appearanceType: runtime.appearance.appearanceType }
      : {}),
    ...(runtime.appearance.appearanceLabel
      ? { appearanceLabel: runtime.appearance.appearanceLabel }
      : {}),
    ...(runtime.appearance.appearanceLabelSource2daRow !== undefined
      ? { appearanceSource2daRow: runtime.appearance.appearanceLabelSource2daRow }
      : {}),
    ...(runtime.appearance.appearanceLabelSourceKey
      ? { appearanceSourceKey: runtime.appearance.appearanceLabelSourceKey }
      : {}),
    ...(runtime.appearance.appearanceModelType
      ? { modelType: runtime.appearance.appearanceModelType }
      : {}),
    ...(runtime.appearance.appearanceRaceModel
      ? { raceModel: runtime.appearance.appearanceRaceModel }
      : {}),
    ...(runtime.identity.phenotype !== undefined ? { phenotype: runtime.identity.phenotype } : {}),
    ...(runtime.identity.phenotypeLabel ? { phenotypeLabel: runtime.identity.phenotypeLabel } : {}),
    ...(runtime.appearance.appearanceDefaultPhenotype
      ? { defaultPhenotype: runtime.appearance.appearanceDefaultPhenotype }
      : {}),
    ...(runtime.identity.raceAppearanceId !== undefined
      ? { raceAppearanceId: runtime.identity.raceAppearanceId }
      : {}),
    ...(runtime.appearance.appearanceBloodColor
      ? { bloodColor: runtime.appearance.appearanceBloodColor }
      : {}),
    ...(runtime.appearance.appearanceWeaponScale !== undefined
      ? { weaponScale: runtime.appearance.appearanceWeaponScale }
      : {}),
    ...(runtime.appearance.appearanceSizeCategory !== undefined
      ? { sizeCategory: runtime.appearance.appearanceSizeCategory }
      : {}),
    ...(runtime.appearance.appearanceSizeCategoryLabel
      ? { sizeCategoryLabel: runtime.appearance.appearanceSizeCategoryLabel }
      : {}),
    ...(runtime.appearance.appearanceSizeCategorySource2daRow !== undefined
      ? {
          sizeCategorySource2daRow:
            runtime.appearance.appearanceSizeCategorySource2daRow
        }
      : {}),
    ...(runtime.appearance.appearanceSizeCategorySourceKey
      ? { sizeCategorySourceKey: runtime.appearance.appearanceSizeCategorySourceKey }
      : {})
  };

  return Object.values(profile).some((value) => value !== undefined)
    ? profile
    : undefined;
}

function buildCreatureRenderSourceModelCandidates(
  appearanceProfile: CreatureRenderPackage["appearanceProfile"]
): CreatureRenderPackage["sourceModelCandidates"] {
  const raceModel = appearanceProfile?.raceModel?.trim();
  if (!raceModel) {
    return [];
  }
  return [
    {
      resref: raceModel,
      role: "appearance-race-model",
      source: "appearance.2da.RACE",
      confidence:
        appearanceProfile?.modelType?.trim().toUpperCase() === "P"
          ? "assembly-prefix"
          : "direct-model"
    }
  ];
}

function buildCreatureRuntimePartModelCandidates(
  runtime: CreatureRuntimeProjection,
  appearanceProfile: CreatureRenderPackage["appearanceProfile"]
): CreatureRenderPackage["partModelCandidates"] {
  const candidates = [...runtime.partModelCandidates];
  const modelPrefix = buildCreatureRuntimeBodyPartModelPrefix(runtime, appearanceProfile);
  if (!modelPrefix || appearanceProfile?.modelType?.trim().toUpperCase() !== "P") {
    return candidates;
  }

  const existingSlots = new Set(candidates.map((candidate) => candidate.slot));
  const existingResRefs = new Set(
    candidates
      .map((candidate) => candidate.modelResRef?.trim().toLowerCase() ?? "")
      .filter(Boolean)
  );
  for (const definition of CREATURE_BODY_PART_CANDIDATE_DEFINITIONS) {
    if (existingSlots.has(definition.slot)) {
      continue;
    }
    const partId = resolveCreatureRuntimeBodyPartId(
      runtime.bodyParts[definition.bodyPartKey],
      definition.slot
    );
    if (partId === undefined) {
      continue;
    }
    const modelResRef = `${modelPrefix}${definition.partModelName}${String(partId).padStart(
      3,
      "0"
    )}`.toLowerCase();
    if (existingResRefs.has(modelResRef)) {
      continue;
    }
    existingSlots.add(definition.slot);
    existingResRefs.add(modelResRef);
    candidates.push({
      slot: definition.slot,
      partId,
      partModelName: definition.partModelName,
      nodeName: definition.nodeName,
      modelPrefix,
      modelResRef,
      modelResRefPattern: "aurora-player-body-part",
      modelResRefPatternFormat: "p%c%c%s_%s_%03d",
      source: "capart.2da.MDLNAME",
      source2daRow: definition.source2daRow,
      sourceKey: CREATURE_SYNTHETIC_CAPART_SOURCE_KEY
    });
  }
  return applyCreatureEquippedArmorPartOverrides(candidates, runtime, modelPrefix);
}

function applyCreatureEquippedArmorPartOverrides(
  candidates: CreatureRenderPackage["partModelCandidates"],
  runtime: CreatureRuntimeProjection,
  modelPrefix: string
): CreatureRenderPackage["partModelCandidates"] {
  let nextCandidates = candidates;
  const equippedItems = runtime.lists.equippedItems ?? [];

  for (const entry of equippedItems) {
    const explicitArmorParts = entry.itemRuntime?.visual.armorParts ?? {};
    const hasExplicitArmorParts = hasPositiveItemArmorPart(explicitArmorParts);
    const slotSummary = resolveCreatureEquipmentSlotSummary(entry.slotMask);
    const itemModelType = entry.itemRuntime?.visual.baseItemModelType;
    const itemClassification = entry.itemRuntime?.classification;
    if (
      !isCreatureBodyArmorEquipment(slotSummary, itemModelType, hasExplicitArmorParts)
    ) {
      continue;
    }

    const fallbackPartId = hasExplicitArmorParts
      ? undefined
      : resolveCreatureArmorFallbackPartId(entry);
    if (!hasExplicitArmorParts && fallbackPartId === undefined) {
      continue;
    }
    const materialColors = resolveCreatureEquippedArmorPartMaterialColors(entry);
    const robePartId = hasExplicitArmorParts
      ? resolveCreatureRuntimeBodyPartId(explicitArmorParts.robe, "robe")
      : undefined;
    const robeHiddenSlots =
      robePartId !== undefined
        ? new Set<string>(entry.itemRuntime?.visual.armorRobeHiddenSlots ?? [])
        : new Set<string>();
    if (robeHiddenSlots.size > 0) {
      nextCandidates = nextCandidates.filter(
        (candidate) => candidate.slot === "robe" || !robeHiddenSlots.has(candidate.slot)
      );
    }

    const existingSlots = new Set(nextCandidates.map((candidate) => candidate.slot));
    for (const definition of CREATURE_BODY_PART_CANDIDATE_DEFINITIONS) {
      if (
        definition.slot !== "robe" &&
        robeHiddenSlots.has(definition.bodyPartKey as string)
      ) {
        continue;
      }
      const rawPartId = hasExplicitArmorParts
        ? explicitArmorParts[definition.bodyPartKey as keyof ItemArmorParts]
        : fallbackPartId;
      const partId = resolveCreatureRuntimeBodyPartId(rawPartId, definition.slot);
      if (partId === undefined) {
        continue;
      }

      if (!hasExplicitArmorParts && !existingSlots.has(definition.slot)) {
        continue;
      }

      nextCandidates = upsertCreatureRuntimePartModelCandidate(nextCandidates, {
        slot: definition.slot,
        partId,
        partModelName: definition.partModelName,
        nodeName: definition.nodeName,
        modelPrefix,
        modelResRef: `${modelPrefix}${definition.partModelName}${String(partId).padStart(
          3,
          "0"
        )}`.toLowerCase(),
        modelResRefPattern: "aurora-player-body-part",
        modelResRefPatternFormat: CREATURE_PLAYER_BODY_PART_MODEL_RESREF_FORMAT,
        source: "capart.2da.MDLNAME",
        source2daRow: definition.source2daRow,
        ...(materialColors ? { materialColors } : {}),
        sourceKey: buildCreatureEquippedArmorPartSourceKey(
          entry,
          hasExplicitArmorParts ? "ArmorPart" : "resref-fallback",
          definition.bodyPartKey
        )
      });
    }
  }

  return nextCandidates;
}

function resolveCreatureEquippedArmorPartMaterialColors(
  entry: CreatureRuntimeEquippedItemEntry
): NonNullable<CreatureRenderPackage["partModelCandidates"][number]["materialColors"]> | undefined {
  const colors = entry.itemRuntime?.visual.materialColors;
  if (!colors) {
    return undefined;
  }
  const materialColors = {
    leather1: colors.leather1,
    leather2: colors.leather2,
    cloth1: colors.cloth1,
    cloth2: colors.cloth2,
    metal1: colors.metal1,
    metal2: colors.metal2
  };
  return Object.values(materialColors).some((value) => Number.isInteger(value))
    ? materialColors
    : undefined;
}

function isCreatureBodyArmorEquipment(
  slotSummary: { slotLabels: string[]; attachmentTargets: string[] },
  itemModelType: string | undefined,
  hasExplicitArmorParts: boolean
): boolean {
  const isBodyArmorSlot = slotSummary.slotLabels.some(
    (label) => label === "chest" || label === "creature armor"
  );
  if (!isBodyArmorSlot) {
    return false;
  }
  if (hasExplicitArmorParts) {
    return true;
  }
  const normalizedModelType = normalizeItemModelType(itemModelType);
  return Boolean(normalizedModelType?.startsWith("aar"));
}

function hasPositiveItemArmorPart(armorParts: ItemArmorParts): boolean {
  return Object.values(armorParts).some(
    (value) => Number.isInteger(value ?? Number.NaN) && value !== undefined && value > 0
  );
}

function resolveCreatureArmorFallbackPartId(
  entry: CreatureRuntimeEquippedItemEntry
): number | undefined {
  const normalizedModelType = normalizeItemModelType(
    entry.itemRuntime?.visual.baseItemModelType
  );
  if (!normalizedModelType?.startsWith("aar")) {
    return undefined;
  }

  const identifiers = [
    entry.itemRuntime?.identity.templateResRef,
    entry.itemResref,
    entry.resRef,
    entry.itemTemplateId,
    entry.itemRuntime?.identity.tag,
    entry.itemRuntime?.identity.localizedName
  ];
  for (const identifier of identifiers) {
    const parsed = parseCreatureArmorFallbackPartId(identifier);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

function parseCreatureArmorFallbackPartId(value: string | undefined): number | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  const match = normalized.match(/(?:^|[^a-z0-9])a?ar[a-z]*?0*(\d{1,3})$/iu);
  const fallbackMatch = match ?? normalized.match(/a?ar[a-z]*?0*(\d{1,3})$/iu);
  if (!fallbackMatch) {
    return undefined;
  }
  const parsed = Number.parseInt(fallbackMatch[1] ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function buildCreatureEquippedArmorPartSourceKey(
  entry: CreatureRuntimeEquippedItemEntry,
  sourceKind: "ArmorPart" | "resref-fallback",
  bodyPartKey: keyof ItemArmorParts
): string {
  const resref =
    normalizeCreatureEquipmentText(entry.itemRuntime?.identity.templateResRef) ??
    normalizeCreatureEquipmentText(entry.itemResref) ??
    normalizeCreatureEquipmentText(entry.resRef) ??
    normalizeCreatureEquipmentText(entry.itemTemplateId) ??
    "unknown";
  return `${CREATURE_EQUIPPED_ARMOR_PART_SOURCE_KEY_PREFIX}:${resref}:${sourceKind}:${bodyPartKey}`;
}

function resolveCreatureRuntimeBodyPartId(
  value: number | undefined,
  _slot: string
): number | undefined {
  if (Number.isInteger(value ?? Number.NaN) && value !== undefined) {
    const explicitPartId = Math.trunc(value);
    return explicitPartId > 0 ? explicitPartId : undefined;
  }
  return undefined;
}

function buildCreatureRuntimeBodyPartModelPrefix(
  runtime: CreatureRuntimeProjection,
  appearanceProfile: CreatureRenderPackage["appearanceProfile"]
): string | undefined {
  const raceToken = normalizeCreatureBodyPartRaceToken(appearanceProfile?.raceModel);
  if (!raceToken) {
    return undefined;
  }
  const genderToken = normalizeCreatureBodyPartGenderToken(
    runtime.identity.genderLabel,
    runtime.identity.gender
  );
  const phenotypeToken = normalizeCreatureBodyPartPhenotypeToken(
    runtime.identity.phenotype,
    appearanceProfile?.defaultPhenotype
  );
  return `p${genderToken}${raceToken}${phenotypeToken}_`.toLowerCase();
}

function normalizeCreatureBodyPartRaceToken(value: string | undefined): string | undefined {
  const normalized = normalizeMetadataToken(value);
  if (!normalized) {
    return undefined;
  }
  const compact = normalized.replace(/[^a-z0-9]+/giu, "");
  if (compact.length === 1) {
    return compact.toLowerCase();
  }
  const knownRaceTokens = new Map([
    ["human", "h"],
    ["elf", "e"],
    ["dwarf", "d"],
    ["gnome", "g"],
    ["halfling", "l"],
    ["halforc", "o"],
    ["halfelf", "h"]
  ]);
  return knownRaceTokens.get(compact.toLowerCase());
}

function normalizeCreatureBodyPartGenderToken(
  label: string | undefined,
  gender: number | undefined
): string {
  const normalized = normalizeMetadataToken(label);
  if (normalized?.toLowerCase().startsWith("f")) {
    return "f";
  }
  if (normalized?.toLowerCase().startsWith("m")) {
    return "m";
  }
  return gender === 1 ? "f" : "m";
}

function normalizeCreatureBodyPartPhenotypeToken(
  phenotype: number | undefined,
  defaultPhenotype: string | undefined
): number {
  if (Number.isInteger(phenotype ?? Number.NaN) && phenotype !== undefined) {
    return Math.max(0, Math.trunc(phenotype));
  }
  const parsedDefault = parseCreatureIntegerToken(defaultPhenotype);
  return parsedDefault === undefined ? 0 : Math.max(0, parsedDefault);
}

function parseCreatureIntegerToken(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim();
  if (!/^-?\d+$/u.test(normalized)) {
    return undefined;
  }
  return Number.parseInt(normalized, 10);
}

function normalizeMetadataToken(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function buildCreatureRenderSkeletonModelCandidates(
  partModelCandidates: CreatureRenderPackage["partModelCandidates"]
): CreatureRenderPackage["skeletonModelCandidates"] {
  const seen = new Set<string>();
  const candidates: CreatureRenderPackage["skeletonModelCandidates"] = [];
  partModelCandidates.forEach((candidate) => {
    const skeletonResRef = resolveCreatureBaseSkeletonResRef(candidate);
    if (!skeletonResRef || seen.has(skeletonResRef)) {
      return;
    }
    const modelPrefix = candidate.modelPrefix?.trim() ?? "";
    if (!modelPrefix) {
      return;
    }
    seen.add(skeletonResRef);
    candidates.push({
      resref: skeletonResRef,
      role: "base-skeleton",
      source: "part-model-prefix",
      modelPrefix,
      confidence: "prefix-derived"
    });
  });
  return candidates;
}

function buildCreatureRenderEquipmentModelCandidates(
  runtime: CreatureRuntimeProjection
): CreatureRenderPackage["equipmentModelCandidates"] {
  const equippedItems = runtime.lists.equippedItems ?? [];
  const candidates: CreatureRenderPackage["equipmentModelCandidates"] = [];
  equippedItems.forEach((entry) => {
    const resref =
      normalizeCreatureEquipmentText(entry.resRef) ??
      normalizeCreatureEquipmentText(entry.itemResref) ??
      normalizeCreatureEquipmentText(entry.itemRuntime?.identity.templateResRef) ??
      normalizeCreatureEquipmentText(entry.itemTemplateId);
    if (!resref) {
      return;
    }
    const slotSummary = resolveCreatureEquipmentSlotSummary(entry.slotMask);
    const itemName =
      normalizeCreatureEquipmentText(entry.itemRuntime?.identity.localizedName) ??
      normalizeCreatureEquipmentText(entry.itemRuntime?.identity.tag) ??
      normalizeCreatureEquipmentText(entry.itemRuntime?.identity.templateResRef);
    const itemModelType = entry.itemRuntime?.visual.baseItemModelType;
    const itemClassification = entry.itemRuntime?.classification;
    const isInternalCreatureEquipment = isCreatureInternalEquipmentModel(
      slotSummary,
      itemModelType
    );
    const exposesModelPartCandidates =
      !isInternalCreatureEquipment &&
      isCreatureVisibleEquipmentModel(itemModelType, itemClassification?.weaponWield);
    const itemModelParts = exposesModelPartCandidates
      ? (entry.itemRuntime?.visual.modelParts ?? [])
      : [];
    const itemModelPartRoles = exposesModelPartCandidates
      ? (entry.itemRuntime?.visual.modelPartRoles ?? [])
      : [];
    const itemModelPartResRefs = exposesModelPartCandidates
      ? (entry.itemRuntime?.visual.modelPartResRefs ?? [])
      : [];
    const itemModelPartResRefRoles = exposesModelPartCandidates
      ? (entry.itemRuntime?.visual.modelPartResRefRoles ?? [])
      : [];
    const itemProperties = entry.itemRuntime?.itemProperties ?? [];
    const itemModelPartCandidates = itemModelPartResRefs.map((partResRef, index) => ({
      resref: partResRef,
      ...(itemModelPartResRefRoles[index] ? { role: itemModelPartResRefRoles[index] } : {}),
      ...(itemModelParts[index] !== undefined ? { partId: itemModelParts[index] } : {})
    }));
    const sourceModelStatus =
      itemModelPartResRefs.length > 0
        ? "model-resrefs-ready"
        : itemModelParts.length > 0
          ? "model-parts-ready"
          : "metadata-only";
    candidates.push({
      resref,
      ...(entry.itemTemplateId ? { itemTemplateId: entry.itemTemplateId } : {}),
      ...(entry.itemResref ? { itemResref: entry.itemResref } : {}),
      ...(entry.itemSourceObjectKey ? { itemSourceObjectKey: entry.itemSourceObjectKey } : {}),
      ...(entry.slotMask !== undefined ? { slotMask: entry.slotMask } : {}),
      slotLabels: slotSummary.slotLabels,
      attachmentTargets: resolveCreatureEquipmentAttachmentTargets(
        slotSummary,
        itemModelType,
        itemClassification?.weaponWield
      ),
      ...(resolveCreatureEquipmentPrimaryAttachmentTarget(
        slotSummary,
        itemModelType,
        itemClassification?.weaponWield
      )
        ? {
            primaryAttachmentTarget: resolveCreatureEquipmentPrimaryAttachmentTarget(
              slotSummary,
              itemModelType,
              itemClassification?.weaponWield
            )
          }
        : {}),
      ...(entry.itemRuntime?.classification.baseItem !== undefined
        ? { baseItem: entry.itemRuntime.classification.baseItem }
        : {}),
      ...(itemClassification?.equipableSlots
        ? { baseItemEquipableSlots: itemClassification.equipableSlots }
        : {}),
      ...(itemClassification?.weaponWield !== undefined
        ? { weaponWield: itemClassification.weaponWield }
        : {}),
      ...(itemClassification?.weaponType !== undefined
        ? { weaponType: itemClassification.weaponType }
        : {}),
      ...(itemClassification?.weaponSize !== undefined
        ? { weaponSize: itemClassification.weaponSize }
        : {}),
      ...(itemClassification?.rangedWeapon !== undefined
        ? { rangedWeapon: itemClassification.rangedWeapon }
        : {}),
      ...(itemClassification?.rotateOnGround !== undefined
        ? { rotateOnGround: itemClassification.rotateOnGround }
        : {}),
      ...(itemClassification?.ammunitionType !== undefined
        ? { ammunitionType: itemClassification.ammunitionType }
        : {}),
      ...(itemName ? { itemName } : {}),
      ...(itemModelType ? { itemModelType } : {}),
      ...(itemModelParts.length > 0 ? { itemModelParts } : {}),
      ...(itemModelPartRoles.length > 0 ? { itemModelPartRoles } : {}),
      ...(itemModelPartResRefs.length > 0 ? { itemModelPartResRefs } : {}),
      ...(itemModelPartCandidates.length > 0 ? { itemModelPartCandidates } : {}),
      ...(entry.itemRuntime?.visual.baseItemModelSourceKey
        ? { itemModelPartSourceKey: entry.itemRuntime.visual.baseItemModelSourceKey }
        : {}),
      ...(itemProperties.length > 0 ? { itemProperties } : {}),
      source: "utc.Equip_ItemList",
      sourceModelStatus
    });
  });
  return candidates;
}

function resolveCreatureEquipmentSlotSummary(
  slotMask: number | undefined
): { slotLabels: string[]; attachmentTargets: string[] } {
  if (typeof slotMask !== "number" || !Number.isFinite(slotMask)) {
    return { slotLabels: ["unknown"], attachmentTargets: ["rootdummy"] };
  }
  const normalizedMask = Math.trunc(slotMask);
  const slotLabels: string[] = [];
  const attachmentTargets = new Set<string>();
  CREATURE_EQUIPMENT_SLOT_DEFINITIONS.forEach((definition) => {
    if ((normalizedMask & definition.mask) === 0) {
      return;
    }
    slotLabels.push(definition.label);
    definition.attachmentTargets.forEach((target) => attachmentTargets.add(target));
  });
  if (slotLabels.length === 0) {
    slotLabels.push(`slot:${normalizedMask}`);
    attachmentTargets.add("rootdummy");
  }
  return {
    slotLabels,
    attachmentTargets: Array.from(attachmentTargets)
  };
}

function isCreatureInternalEquipmentModel(
  slotSummary: { slotLabels: string[]; attachmentTargets: string[] },
  itemModelType: string | undefined
): boolean {
  return (
    normalizeItemModelType(itemModelType) === "it_cr_item" &&
    slotSummary.slotLabels.some((label) => CREATURE_INTERNAL_EQUIPMENT_SLOT_LABELS.has(label))
  );
}

function isCreatureWeaponEquipmentModel(itemModelType: string | undefined): boolean {
  const normalizedModelType = normalizeItemModelType(itemModelType);
  return Boolean(normalizedModelType && normalizedModelType.startsWith("w"));
}

function isCreatureShieldEquipmentModel(
  itemModelType: string | undefined,
  weaponWield?: number
): boolean {
  if (weaponWield === 7) {
    return true;
  }
  const normalizedModelType = normalizeItemModelType(itemModelType);
  return Boolean(normalizedModelType && normalizedModelType.startsWith("ash"));
}

function isCreatureVisibleEquipmentModel(
  itemModelType: string | undefined,
  weaponWield?: number
): boolean {
  return (
    isCreatureWeaponEquipmentModel(itemModelType) ||
    isCreatureShieldEquipmentModel(itemModelType, weaponWield)
  );
}

function isCreatureAmmunitionEquipmentModel(
  slotSummary: { slotLabels: string[]; attachmentTargets: string[] },
  itemModelType: string | undefined
): boolean {
  const normalizedModelType = normalizeItemModelType(itemModelType);
  return (
    Boolean(normalizedModelType && CREATURE_AMMUNITION_MODEL_TYPES.has(normalizedModelType)) ||
    slotSummary.slotLabels.some((label) => CREATURE_AMMUNITION_SLOT_LABELS.has(label))
  );
}

function isCreatureHandheldBowEquipmentModel(
  itemModelType: string | undefined,
  weaponWield?: number
): boolean {
  if (weaponWield === 5) {
    return true;
  }
  const normalizedModelType = normalizeItemModelType(itemModelType);
  return Boolean(normalizedModelType && CREATURE_HANDHELD_BOW_MODEL_TYPES.has(normalizedModelType));
}

function resolveCreatureEquipmentPrimaryAttachmentTarget(
  slotSummary: { slotLabels: string[]; attachmentTargets: string[] },
  itemModelType: string | undefined,
  weaponWield?: number
): string | undefined {
  if (isCreatureShieldEquipmentModel(itemModelType, weaponWield)) {
    if (slotSummary.attachmentTargets.includes("lhand_g")) {
      return "lhand_g";
    }
    if (slotSummary.attachmentTargets.includes("rhand_g")) {
      return "rhand_g";
    }
  }
  if (isCreatureWeaponEquipmentModel(itemModelType)) {
    if (
      isCreatureHandheldBowEquipmentModel(itemModelType, weaponWield) &&
      (slotSummary.attachmentTargets.includes("lhand_g") ||
        slotSummary.attachmentTargets.includes("rhand_g"))
    ) {
      return "lhand_g";
    }
    if (slotSummary.attachmentTargets.includes("rhand_g")) {
      return "rhand_g";
    }
    if (slotSummary.attachmentTargets.includes("lhand_g")) {
      return "lhand_g";
    }
  }
  if (
    isCreatureHandheldBowEquipmentModel(itemModelType, weaponWield) &&
    slotSummary.attachmentTargets.includes("rhand_g")
  ) {
    return "lhand_g";
  }
  return slotSummary.attachmentTargets[0];
}

function resolveCreatureEquipmentAttachmentTargets(
  slotSummary: { slotLabels: string[]; attachmentTargets: string[] },
  itemModelType: string | undefined,
  weaponWield?: number
): string[] {
  const primaryAttachmentTarget = resolveCreatureEquipmentPrimaryAttachmentTarget(
    slotSummary,
    itemModelType,
    weaponWield
  );
  if (!primaryAttachmentTarget) {
    return slotSummary.attachmentTargets;
  }
  const orderedTargets: string[] = [];
  const pushTarget = (target: string | undefined): void => {
    if (!target || orderedTargets.includes(target)) {
      return;
    }
    orderedTargets.push(target);
  };
  pushTarget(primaryAttachmentTarget);
  slotSummary.attachmentTargets.forEach(pushTarget);
  return orderedTargets;
}

function normalizeCreatureEquipmentText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function resolveCreatureBaseSkeletonResRef(
  candidate: CreatureRenderPackage["partModelCandidates"][number]
): string | null {
  const prefix = candidate.modelPrefix?.trim();
  if (prefix) {
    const skeletonResRef = prefix.replace(/_+$/u, "").toLowerCase();
    if (/^p[mf][a-z]\d$/iu.test(skeletonResRef)) {
      return skeletonResRef;
    }
  }
  const modelResRef = candidate.modelResRef?.trim().toLowerCase();
  const modelResRefMatch = modelResRef?.match(/^(p[mf][a-z]\d)_/iu);
  return modelResRefMatch?.[1] ?? null;
}

function readCreatureRenderPartModelCandidates(
  metadata: Record<string, string | number | boolean>
): CreatureRenderPackage["partModelCandidates"] {
  const raw = readMetadataString(metadata, "partModelCandidates");
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => normalizeCreatureRenderPartModelCandidate(entry))
      .filter((entry): entry is CreatureRenderPackage["partModelCandidates"][number] =>
        Boolean(entry)
      );
  } catch {
    return [];
  }
}

function normalizeCreatureRenderPartModelCandidate(
  value: unknown
): CreatureRenderPackage["partModelCandidates"][number] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const slot = typeof record.slot === "string" ? record.slot : undefined;
  const partId = typeof record.partId === "number" ? record.partId : undefined;
  const partModelName =
    typeof record.partModelName === "string" ? record.partModelName.trim() : undefined;
  const source2daRow =
    typeof record.source2daRow === "number" ? record.source2daRow : undefined;
  const sourceKey = typeof record.sourceKey === "string" ? record.sourceKey.trim() : undefined;
  const source =
    record.source === "capart.2da.MDLNAME" ||
    record.source === "utc.Appearance_Head" ||
    record.source === "wingmodel.2da.MODEL" ||
    record.source === "tailmodel.2da.MODEL"
      ? record.source
      : undefined;
  if (
    !isCreatureRenderPartSlot(slot) ||
    !Number.isInteger(partId) ||
    !partModelName ||
    !source ||
    (source !== "utc.Appearance_Head" && !Number.isInteger(source2daRow)) ||
    !sourceKey
  ) {
    return null;
  }
  const nodeName = typeof record.nodeName === "string" ? record.nodeName.trim() : undefined;
  const modelPrefix =
    typeof record.modelPrefix === "string" ? record.modelPrefix.trim() : undefined;
  const modelResRef =
    typeof record.modelResRef === "string" ? record.modelResRef.trim() : undefined;
  const assetId = typeof record.assetId === "string" ? record.assetId.trim() : undefined;
  const modelUrl = typeof record.modelUrl === "string" ? record.modelUrl.trim() : undefined;
  const glbUrl = typeof record.glbUrl === "string" ? record.glbUrl.trim() : undefined;
  const modelResRefPattern =
    record.modelResRefPattern === "aurora-player-body-part"
      ? "aurora-player-body-part"
      : undefined;
  const modelResRefPatternFormat =
    typeof record.modelResRefPatternFormat === "string"
      ? record.modelResRefPatternFormat.trim()
      : undefined;
  const materialColors = normalizeCreatureRenderPartModelMaterialColors(
    record.materialColors
  );
  const resolvedPartId = partId as number;
  return {
    slot,
    partId: resolvedPartId,
    partModelName,
    ...(nodeName ? { nodeName } : {}),
    ...(modelPrefix ? { modelPrefix } : {}),
    ...(modelResRef ? { modelResRef } : {}),
    ...(modelResRefPattern ? { modelResRefPattern } : {}),
    ...(modelResRefPatternFormat ? { modelResRefPatternFormat } : {}),
    ...(assetId ? { assetId } : {}),
    ...(modelUrl ? { modelUrl } : {}),
    ...(glbUrl ? { glbUrl } : {}),
    source,
    ...(Number.isInteger(source2daRow)
      ? { source2daRow: source2daRow as number }
      : {}),
    ...(materialColors ? { materialColors } : {}),
    sourceKey
  };
}

function normalizeCreatureRenderPartModelMaterialColors(
  value: unknown
): NonNullable<CreatureRenderPackage["partModelCandidates"][number]["materialColors"]> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const materialColors = {
    leather1: normalizeCreatureRenderPartModelMaterialColor(record.leather1),
    leather2: normalizeCreatureRenderPartModelMaterialColor(record.leather2),
    cloth1: normalizeCreatureRenderPartModelMaterialColor(record.cloth1),
    cloth2: normalizeCreatureRenderPartModelMaterialColor(record.cloth2),
    metal1: normalizeCreatureRenderPartModelMaterialColor(record.metal1),
    metal2: normalizeCreatureRenderPartModelMaterialColor(record.metal2)
  };
  return Object.values(materialColors).some((color) => color !== undefined)
    ? materialColors
    : undefined;
}

function normalizeCreatureRenderPartModelMaterialColor(
  value: unknown
): number | undefined {
  return Number.isInteger(value) ? (value as number) : undefined;
}

function isCreatureRenderPartSlot(value: string | undefined): value is CreatureRenderPackage["partModelCandidates"][number]["slot"] {
  return Boolean(
    value &&
      [
        "head",
        "wings",
        "tail",
        "rFoot",
        "lFoot",
        "rShin",
        "lShin",
        "lThigh",
        "rThigh",
        "pelvis",
        "torso",
        "belt",
        "neck",
        "rFArm",
        "lFArm",
        "rBicep",
        "lBicep",
        "rShoul",
        "lShoul",
        "rHand",
        "lHand",
        "robe"
      ].includes(value)
  );
}

function hasCreatureBodyPartPayload(runtime: CreatureRuntimeProjection): boolean {
  return Object.values(runtime.bodyParts).some((value) => typeof value === "number");
}

function hasCreatureColorPayload(runtime: CreatureRuntimeProjection): boolean {
  return Object.values(runtime.colors).some((value) => typeof value === "number");
}

type ItemArmorParts = ItemRuntimeProjection["visual"]["armorParts"];
type ItemArmorPreviewContext = NonNullable<
  ItemRuntimeProjection["visual"]["armorPreviewContext"]
>;

const ITEM_ARMOR_ROBE_HIDE_METADATA_SLOTS: ReadonlyArray<keyof ItemArmorParts> = [
  "rFoot",
  "lFoot",
  "rShin",
  "lShin",
  "rThigh",
  "lThigh",
  "pelvis",
  "torso",
  "belt",
  "neck",
  "rFArm",
  "lFArm",
  "rBicep",
  "lBicep",
  "rShoul",
  "lShoul",
  "rHand",
  "lHand"
];

function normalizeItemArmorPreviewModelPrefix(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return ITEM_ARMOR_PREVIEW_MODEL_PREFIX_PATTERN.test(normalized) ? normalized : undefined;
}

function buildItemArmorPreviewContext(
  metadata: Record<string, string | number | boolean>
): ItemArmorPreviewContext {
  const modelPrefix =
    normalizeItemArmorPreviewModelPrefix(
      readMetadataString(metadata, "itemArmorPreviewModelPrefix")
    ) ?? ITEM_ARMOR_PREVIEW_MODEL_PREFIX;
  const label = readMetadataString(metadata, "itemArmorPreviewContextLabel");
  const sourceLabel = label ?? ITEM_ARMOR_PREVIEW_CONTEXT_LABEL;
  const gender = readMetadataNumber(metadata, "itemArmorPreviewGender");
  const phenotype = readMetadataNumber(metadata, "itemArmorPreviewPhenotype");
  const raceModel = readMetadataString(metadata, "itemArmorPreviewRaceModel");

  return {
    modelPrefix,
    sourceKey:
      modelPrefix === ITEM_ARMOR_PREVIEW_MODEL_PREFIX && !label
        ? ITEM_ARMOR_PREVIEW_SOURCE_KEY
        : `item-armor-preview.${sourceLabel}.ArmorPart`,
    ...(label ? { label } : {}),
    ...(gender !== undefined ? { gender } : {}),
    ...(phenotype !== undefined ? { phenotype } : {}),
    ...(raceModel ? { raceModel } : {})
  };
}

function buildItemArmorPartModelCandidates(
  armorParts: ItemArmorParts,
  armorRobeHiddenSlots: readonly string[] = [],
  armorPreviewContext: ItemArmorPreviewContext
): ItemRuntimeProjection["visual"]["armorPartModelCandidates"] {
  const candidates: ItemRuntimeProjection["visual"]["armorPartModelCandidates"] = [];
  const seenResRefs = new Set<string>();
  const hiddenSlots = new Set(armorRobeHiddenSlots);

  for (const definition of CREATURE_BODY_PART_CANDIDATE_DEFINITIONS) {
    if (hiddenSlots.has(definition.bodyPartKey as keyof ItemArmorParts)) {
      continue;
    }
    const rawPartId = armorParts[definition.bodyPartKey as keyof ItemArmorParts];
    if (!Number.isInteger(rawPartId ?? Number.NaN) || rawPartId === undefined) {
      continue;
    }
    const partId = Math.trunc(rawPartId);
    if (partId <= 0) {
      continue;
    }
    const modelResRef =
      `${armorPreviewContext.modelPrefix}${definition.partModelName}${String(partId).padStart(
        3,
        "0"
      )}`.toLowerCase();
    if (seenResRefs.has(modelResRef)) {
      continue;
    }
    seenResRefs.add(modelResRef);
    candidates.push({
      slot: definition.slot,
      partId,
      partModelName: definition.partModelName,
      nodeName: definition.nodeName,
      modelPrefix: armorPreviewContext.modelPrefix,
      modelResRef,
      modelResRefPattern: "aurora-player-body-part",
      modelResRefPatternFormat: CREATURE_PLAYER_BODY_PART_MODEL_RESREF_FORMAT,
      source2daRow: definition.source2daRow,
      sourceKey: armorPreviewContext.sourceKey
    });
  }

  return candidates;
}

function buildItemCloakModelResRef(
  modelId: number,
  modelPrefix = ITEM_ARMOR_PREVIEW_MODEL_PREFIX
): string {
  const normalizedModelPrefix =
    normalizeItemArmorPreviewModelPrefix(modelPrefix) ?? ITEM_ARMOR_PREVIEW_MODEL_PREFIX;
  return `${normalizedModelPrefix}cloak_${Math.max(0, Math.trunc(modelId))
    .toString()
    .padStart(3, "0")}`;
}

function buildItemCloakTextureResRef(
  textureId: number,
  modelPrefix = ITEM_ARMOR_PREVIEW_MODEL_PREFIX
): string {
  return buildItemCloakModelResRef(textureId, modelPrefix);
}

function buildItemCloakIconResRef(iconId: number): string {
  return `icloak_m_${Math.max(0, Math.trunc(iconId)).toString().padStart(3, "0")}`;
}

export function buildItemRuntimeProjection(
  metadata: Record<string, string | number | boolean>
): ItemRuntimeProjection {
  const scripts = extractScriptMap(metadata);
  const baseItemModelType = readMetadataString(metadata, "baseItemModelType");
  const baseItemDefaultModel = readMetadataString(metadata, "baseItemDefaultModel");
  const baseItemModelSourceKey = readMetadataString(metadata, "baseItem2daSourceKey");
  const modelPart1 = readMetadataNumber(metadata, "modelPart1");
  const modelPart2 = readMetadataNumber(metadata, "modelPart2");
  const modelPart3 = readMetadataNumber(metadata, "modelPart3");
  const modelPartValues = [modelPart1, modelPart2, modelPart3];
  const normalizedBaseItemModelType = normalizeItemModelType(baseItemModelType);
  const cloakModel = readMetadataNumber(metadata, "cloakModel");
  const cloakTexture = readMetadataNumber(metadata, "cloakTexture");
  const cloakIcon = readMetadataNumber(metadata, "cloakIcon");
  const armorPreviewContext = buildItemArmorPreviewContext(metadata);
  const cloakModelResRef =
    readMetadataString(metadata, "cloakModelResRef") ??
    (cloakModel !== undefined
      ? buildItemCloakModelResRef(cloakModel, armorPreviewContext.modelPrefix)
      : undefined);
  const cloakTextureResRef =
    readMetadataString(metadata, "cloakTextureResRef") ??
    (cloakTexture !== undefined
      ? buildItemCloakTextureResRef(cloakTexture, armorPreviewContext.modelPrefix)
      : undefined);
  const cloakIconResRef =
    readMetadataString(metadata, "cloakIconResRef") ??
    (cloakIcon !== undefined ? buildItemCloakIconResRef(cloakIcon) : undefined);
  const cloakHiddenSlots = readMetadataStringList(metadata, "cloakHiddenSlots");
  const modelParts = modelPartValues.filter(
    (value): value is number => typeof value === "number"
  );
  const modelPartRoles =
    normalizedBaseItemModelType === ITEM_CLOAK_MODEL_TYPE && typeof modelPart1 === "number"
      ? ["cloak"]
      : modelPartValues.flatMap((value, index) =>
          typeof value === "number" ? [ITEM_MODEL_PART_ROLES[index] ?? `part${index + 1}`] : []
        );
  const modelPartResRefEntries = buildItemModelPartResRefEntries(
    baseItemModelType,
    modelPartValues,
    cloakModelResRef,
    baseItemDefaultModel
  );
  const itemProperties = readItemRuntimePropertyEntries(metadata);
  const armorParts: ItemArmorParts = {
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
  };
  const armorRobeHiddenSlots = readMetadataStringList(metadata, "armorRobeHiddenSlots").filter(
    (slot) => ITEM_ARMOR_ROBE_HIDE_METADATA_SLOTS.includes(slot as keyof ItemArmorParts)
  );
  const armorPartCostModifiers: ItemArmorParts = {
    rFoot: readMetadataNumber(metadata, "armorPartCostModifierRFoot"),
    lFoot: readMetadataNumber(metadata, "armorPartCostModifierLFoot"),
    rShin: readMetadataNumber(metadata, "armorPartCostModifierRShin"),
    lShin: readMetadataNumber(metadata, "armorPartCostModifierLShin"),
    lThigh: readMetadataNumber(metadata, "armorPartCostModifierLThigh"),
    rThigh: readMetadataNumber(metadata, "armorPartCostModifierRThigh"),
    pelvis: readMetadataNumber(metadata, "armorPartCostModifierPelvis"),
    torso: readMetadataNumber(metadata, "armorPartCostModifierTorso"),
    belt: readMetadataNumber(metadata, "armorPartCostModifierBelt"),
    neck: readMetadataNumber(metadata, "armorPartCostModifierNeck"),
    rFArm: readMetadataNumber(metadata, "armorPartCostModifierRFArm"),
    lFArm: readMetadataNumber(metadata, "armorPartCostModifierLFArm"),
    rBicep: readMetadataNumber(metadata, "armorPartCostModifierRBicep"),
    lBicep: readMetadataNumber(metadata, "armorPartCostModifierLBicep"),
    rShoul: readMetadataNumber(metadata, "armorPartCostModifierRShoul"),
    lShoul: readMetadataNumber(metadata, "armorPartCostModifierLShoul"),
    rHand: readMetadataNumber(metadata, "armorPartCostModifierRHand"),
    lHand: readMetadataNumber(metadata, "armorPartCostModifierLHand"),
    robe: readMetadataNumber(metadata, "armorPartCostModifierRobe")
  };
  const armorPartModelCandidates = buildItemArmorPartModelCandidates(
    armorParts,
    armorRobeHiddenSlots,
    armorPreviewContext
  );

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
      baseItem: readMetadataNumber(metadata, "baseItem"),
      baseItemLabel: readMetadataString(metadata, "baseItem2daLabel"),
      baseItemSourceKey: readMetadataString(metadata, "baseItem2daSourceKey"),
      itemClass: readMetadataString(metadata, "baseItem2daItemClass"),
      defaultIcon: readMetadataString(metadata, "baseItemDefaultIcon"),
      invSlotWidth: readMetadataNumber(metadata, "baseItemInvSlotWidth"),
      invSlotHeight: readMetadataNumber(metadata, "baseItemInvSlotHeight"),
      canRotateIcon: readMetadataNumber(metadata, "baseItemCanRotateIcon"),
      equipableSlots: readMetadataString(metadata, "baseItemEquipableSlots"),
      baseCost: readMetadataNumber(metadata, "baseItemBaseCost"),
      stacking: readMetadataNumber(metadata, "baseItemStacking"),
      itemMultiplier: readMetadataNumber(metadata, "baseItemItemMultiplier"),
      maxProps: readMetadataNumber(metadata, "baseItemMaxProps"),
      minProps: readMetadataNumber(metadata, "baseItemMinProps"),
      propColumn: readMetadataString(metadata, "baseItemPropColumn"),
      storePanel: readMetadataNumber(metadata, "baseItemStorePanel"),
      storePanelSort: readMetadataNumber(metadata, "baseItemStorePanelSort"),
      chargesStarting: readMetadataNumber(metadata, "baseItemChargesStarting"),
      ilrStackSize: readMetadataNumber(metadata, "baseItemIlrStackSize"),
      weaponWield: readMetadataNumber(metadata, "baseItemWeaponWield"),
      weaponType: readMetadataNumber(metadata, "baseItemWeaponType"),
      weaponSize: readMetadataNumber(metadata, "baseItemWeaponSize"),
      rangedWeapon: readMetadataNumber(metadata, "baseItemRangedWeapon"),
      rotateOnGround: readMetadataNumber(metadata, "baseItemRotateOnGround"),
      weaponMatType: readMetadataNumber(metadata, "baseItemWeaponMatType"),
      ammunitionType: readMetadataNumber(metadata, "baseItemAmmunitionType"),
      arcaneSpellFailure: readMetadataNumber(metadata, "baseItemArcaneSpellFailure")
    },
    visual: {
      ...(baseItemModelType ? { baseItemModelType } : {}),
      ...(baseItemDefaultModel ? { baseItemDefaultModel } : {}),
      ...(baseItemModelSourceKey ? { baseItemModelSourceKey } : {}),
      ...(modelPart1 !== undefined ? { modelPart1 } : {}),
      ...(modelPart2 !== undefined ? { modelPart2 } : {}),
      ...(modelPart3 !== undefined ? { modelPart3 } : {}),
      ...(readMetadataNumber(metadata, "cloakModelRow") !== undefined
        ? { cloakModelRow: readMetadataNumber(metadata, "cloakModelRow") }
        : {}),
      ...(cloakModel !== undefined ? { cloakModel } : {}),
      ...(cloakTexture !== undefined ? { cloakTexture } : {}),
      ...(cloakIcon !== undefined ? { cloakIcon } : {}),
      ...(cloakModelResRef ? { cloakModelResRef } : {}),
      ...(cloakTextureResRef ? { cloakTextureResRef } : {}),
      ...(cloakIconResRef ? { cloakIconResRef } : {}),
      cloakHiddenSlots,
      ...(readMetadataString(metadata, "cloakSourceKey")
        ? { cloakSourceKey: readMetadataString(metadata, "cloakSourceKey") }
        : {}),
      armorPreviewContext,
      modelParts,
      modelPartRoles,
      modelPartResRefs: modelPartResRefEntries.map((entry) => entry.resref),
      modelPartResRefRoles: modelPartResRefEntries.map((entry) => entry.role),
      armorRobeHiddenSlots,
      armorPartModelCandidates,
      armorParts,
      materialColors: {
        leather1: readMetadataNumber(metadata, "leather1Color"),
        leather2: readMetadataNumber(metadata, "leather2Color"),
        cloth1: readMetadataNumber(metadata, "cloth1Color"),
        cloth2: readMetadataNumber(metadata, "cloth2Color"),
        metal1: readMetadataNumber(metadata, "metal1Color"),
        metal2: readMetadataNumber(metadata, "metal2Color")
      }
    },
    pricing: {
      cost: readMetadataNumber(metadata, "cost"),
      addCost: readMetadataNumber(metadata, "addCost"),
      costTable: readMetadataNumber(metadata, "costTable"),
      costValue: readMetadataNumber(metadata, "costValue"),
      ...(Object.values(armorPartCostModifiers).some((value) => value !== undefined)
        ? { armorPartCostModifiers }
        : {}),
      armorPartCostModifierTotal: readMetadataNumber(metadata, "armorPartCostModifierTotal"),
      armorPartCostModifierResolvedCount: readMetadataNumber(
        metadata,
        "armorPartCostModifierResolvedCount"
      ),
      armorPartCostModifierUnresolvedCount: readMetadataNumber(
        metadata,
        "armorPartCostModifierUnresolvedCount"
      )
    },
    state: {
      plot: readMetadataBoolean(metadata, "plot"),
      cursed: readMetadataBoolean(metadata, "cursed"),
      charges: readMetadataNumber(metadata, "charges"),
      stackSize: readMetadataNumber(metadata, "stackSize"),
      identified: readMetadataBoolean(metadata, "identified"),
      stolen: readMetadataBoolean(metadata, "stolen")
    },
    palette: {
      comments: readMetadataString(metadata, "comments"),
      paletteId: readMetadataNumber(metadata, "paletteId")
    },
    itemProperties,
    scripts
  };
}

function readItemRuntimePropertyEntries(
  metadata: Record<string, string | number | boolean>
): ItemRuntimeProjection["itemProperties"] {
  return (
    readMetadataJsonArray<Record<string, unknown>>(metadata, "itemPropertyListEntries") ?? []
  )
    .filter((entry): entry is Record<string, unknown> =>
      typeof entry === "object" && entry !== null && !Array.isArray(entry)
    )
    .map((entry) => ({
      propertyName: readUnknownNumber(entry.propertyName),
      propertyLabel: readUnknownString(entry.propertyLabel),
      subtype: readUnknownNumber(entry.subtype),
      costTable: readUnknownNumber(entry.costTable),
      costValue: readUnknownNumber(entry.costValue),
      param1: readUnknownNumber(entry.param1),
      param1Value: readUnknownNumber(entry.param1Value),
      chanceAppear: readUnknownNumber(entry.chanceAppear),
      propertyDefinitionSource2daRow: readUnknownNumber(entry.propertyDefinitionSource2daRow),
      propertyDefinitionSourceKey: readUnknownString(entry.propertyDefinitionSourceKey),
      subTypeTable: readUnknownString(entry.subTypeTable),
      costTableDefinition: readUnknownString(entry.costTableDefinition),
      param1Table: readUnknownString(entry.param1Table),
      nameStrRef: readUnknownNumber(entry.nameStrRef),
      gameStrRef: readUnknownNumber(entry.gameStrRef),
      descriptionStrRef: readUnknownNumber(entry.descriptionStrRef)
    }))
    .filter((entry) => Object.values(entry).some((value) => value !== undefined));
}

function readUnknownString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readUnknownNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function buildItemModelPartResRefEntries(
  modelType: string | undefined,
  modelPartValues: Array<number | undefined>,
  cloakModelResRef?: string,
  defaultModelResRef?: string
): Array<{ resref: string; role: string }> {
  const normalizedModelType = normalizeItemModelType(modelType);
  if (!normalizedModelType) {
    return [];
  }

  if (normalizedModelType === ITEM_CLOAK_MODEL_TYPE) {
    const partId = modelPartValues[0];
    if (typeof partId !== "number" || !Number.isFinite(partId)) {
      return [];
    }
    return [
      {
        resref: cloakModelResRef ?? buildItemCloakModelResRef(partId),
        role: "cloak"
      }
    ];
  }

  const normalizedDefaultModelResRef = normalizeItemModelType(defaultModelResRef);
  if (
    normalizedDefaultModelResRef &&
    DEFAULT_MODEL_ITEM_MODEL_TYPES.has(normalizedModelType)
  ) {
    return [
      {
        resref: normalizedDefaultModelResRef,
        role: "default"
      }
    ];
  }

  return modelPartValues.flatMap((partId, index) => {
    if (typeof partId !== "number" || !Number.isFinite(partId)) {
      return [];
    }
    const suffix = ITEM_MODEL_PART_RESREF_SUFFIXES[index] ?? `p${index + 1}`;
    const role = ITEM_MODEL_PART_ROLES[index] ?? `part${index + 1}`;
    const normalizedPartId = Math.max(0, Math.trunc(partId)).toString().padStart(3, "0");
    if (isSinglePieceItemModelType(normalizedModelType)) {
      return [
        {
          resref: `${normalizedModelType}_${normalizedPartId}`,
          role
        }
      ];
    }
    const separator = normalizedModelType.length > 3 ? "_" : "";
    return [
      {
        resref: `${normalizedModelType}${separator}${suffix}_${normalizedPartId}`,
        role
      }
    ];
  });
}

function isSinglePieceItemModelType(modelType: string): boolean {
  return SINGLE_PIECE_ITEM_MODEL_TYPES.has(modelType);
}

function normalizeItemModelType(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9_-]+/gu, "_");
  if (!normalized || !/[a-z0-9]/u.test(normalized)) {
    return undefined;
  }
  return normalized.slice(0, 16);
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

  runtime.itemProperties.forEach((property, index) => {
    if (property.costTable !== undefined && property.costValue === undefined) {
      issues.push({
        code: "ITEM_PROPERTY_COST_VALUE_MISSING",
        severity: "warn",
        message: `PropertiesList[${index}] has CostTable but no CostValue.`
      });
    }
  });

  return issues;
}

export function buildEncounterRuntimeProjection(
  metadata: Record<string, string | number | boolean>
): EncounterRuntimeProjection {
  const scripts = extractScriptMap(metadata);

  return {
    source: {
      etag: readMetadataString(metadata, "sourceEtag"),
      fileType: readMetadataString(metadata, "sourceFileType"),
      fileVersion: readMetadataString(metadata, "sourceFileVersion"),
      structTypeId: readMetadataNumber(metadata, "sourceStructTypeId")
    },
    identity: {
      templateResRef: readMetadataString(metadata, "templateResRef"),
      localizedName:
        readMetadataString(metadata, "localizedName") ??
        readMetadataString(metadata, "displayName"),
      tag: readMetadataString(metadata, "tag"),
      description: readMetadataString(metadata, "description")
    },
    settings: {
      active: readMetadataBoolean(metadata, "active"),
      difficulty: readMetadataNumber(metadata, "difficulty"),
      difficultyIndex: readMetadataNumber(metadata, "difficultyIndex"),
      factionId: readMetadataNumber(metadata, "factionId"),
      maxCreatures: readMetadataNumber(metadata, "maxCreatures"),
      recCreatures: readMetadataNumber(metadata, "recCreatures"),
      playerOnly: readMetadataBoolean(metadata, "playerOnly"),
      reset: readMetadataBoolean(metadata, "reset"),
      resetTime: readMetadataNumber(metadata, "resetTime"),
      respawns: readMetadataNumber(metadata, "respawns"),
      spawnOption: readMetadataNumber(metadata, "spawnOption")
    },
    creatureList: readMetadataJsonArray<{
      resRef?: string;
      appearance?: number;
      challengeRating?: number;
      singleSpawn?: boolean;
    }>(metadata, "encounterCreatureListEntries"),
    scripts
  };
}

export function buildEncounterValidationIssues(
  runtime: EncounterRuntimeProjection
): EncounterValidationIssue[] {
  const issues: EncounterValidationIssue[] = [];

  if (!runtime.identity.templateResRef) {
    issues.push({
      code: "ENCOUNTER_TEMPLATE_RESREF_MISSING",
      severity: "warn",
      message: "TemplateResRef is missing in encounter source metadata."
    });
  }

  if (!runtime.creatureList || runtime.creatureList.length === 0) {
    issues.push({
      code: "ENCOUNTER_CREATURE_LIST_EMPTY",
      severity: "warn",
      message: "CreatureList is empty; encounter has no spawn candidates."
    });
  }

  if (
    typeof runtime.settings.maxCreatures === "number" &&
    typeof runtime.settings.recCreatures === "number" &&
    runtime.settings.maxCreatures < runtime.settings.recCreatures
  ) {
    issues.push({
      code: "ENCOUNTER_MAX_BELOW_RECOMMENDED",
      severity: "warn",
      message: "MaxCreatures is lower than RecCreatures."
    });
  }

  if (Object.keys(runtime.scripts).length === 0) {
    issues.push({
      code: "ENCOUNTER_SCRIPTS_EMPTY",
      severity: "warn",
      message: "No encounter scripts were extracted from source metadata."
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

function readMetadataStringList(
  metadata: Record<string, string | number | boolean>,
  key: string
): string[] {
  const raw = readMetadataString(metadata, key);
  if (!raw) {
    return [];
  }
  const seen = new Set<string>();
  return raw
    .split(/[|,;\n\r\t ]+/u)
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry || seen.has(entry)) {
        return false;
      }
      seen.add(entry);
      return true;
    });
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

function readMetadataJsonArray<T>(
  metadata: Record<string, string | number | boolean>,
  key: string
): T[] | undefined {
  const raw = metadata[key];
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
  } catch {
    return undefined;
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
