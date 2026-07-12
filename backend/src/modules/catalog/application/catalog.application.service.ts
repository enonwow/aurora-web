import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { readFile, readdir, stat } from "node:fs/promises";
import { basename, isAbsolute, resolve } from "node:path";
import { executeInFlight } from "../../../common/async/in-flight.helpers";
import { buildS3ObjectUrl } from "../../../common/blob/blob-url.helpers";
import { AppException } from "../../../common/http/app-exception";
import { AppConfigService } from "../../../common/config/app-config.service";
import {
  BLANK_CELL,
  parseAuroraTwoDaTable
} from "../../../common/aurora/two-da/aurora-two-da-table";
import {
  PLACEABLE_PROCESSING_CACHE,
  type PlaceableProcessingCachePort,
  type PlaceableProcessingResult
} from "./ports/placeable-processing-cache.port";
import {
  TEMPLATE_CATALOG_REPOSITORY,
  type TemplateCatalogRepositoryPort
} from "./ports/template-catalog-repository.port";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectSummary,
  type ModuleBlobObjectPayload,
  type ModuleBlobSnapshotSummary,
  type ModuleBlobStoragePort
} from "../../runtime-settings/application/ports/module-blob-storage.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import type {
  BlobStorageSettings,
  RuntimePathSettings,
  RuntimeSettingsRecord
} from "../../runtime-settings/domain/runtime-settings.types";
import type {
  BenchmarkDurationSummary,
  PlaceableAssetEntry,
  PlaceableAssetManifest,
  PlaceableAssetRole,
  PlaceableBenchmarkResult,
  PlaceableBenchmarkRunQuery,
  PlaceableProcessQuery,
  PlaceableRenderPackage,
  CreatureRenderPackage,
  CreatureRuntimeProjection,
  ItemRuntimeProjection,
  PlaceableRenderPackageAuroraEmitterSource,
  PlaceableRenderPackageAuroraLightSource,
  PlaceableSubtype,
  TemplateProcessQuery,
  TemplateProcessingResult,
  TemplateKind,
  TemplateRecord,
  TemplateListQuery,
  TemplateListResult
} from "../domain/template.types";
import {
  buildPlaceableProcessCacheKey,
  buildTemplateProcessCacheKey
} from "../domain/cache-key.builders";
import {
  buildPlaceableThumbnailPayload,
  withPlaceablePreviewImageUrl
} from "../domain/template-thumbnail";
import {
  buildPlaceableRuntimeProjection,
  buildPlaceableValidationIssues,
  buildPlaceableRenderPackage as buildRenderPackageFromManifest,
  applyCreatureRuntimeAppearanceOverride,
  buildCreatureRenderPackage,
  buildCreatureRuntimeProjection,
  buildCreatureValidationIssues,
  buildEncounterRuntimeProjection,
  buildEncounterValidationIssues,
  buildItemRuntimeProjection,
  buildItemValidationIssues,
  buildBenchmarkFingerprint,
  buildAssetId,
  buildModuleSnapshotIndex,
  buildRenderContract,
  buildTemplateRenderContract,
  buildEmptyPlaceableAssetManifest,
  collectPlaceableAssetsFromSnapshot,
  compareAssetSourcePriority,
  extractBasename,
  extractExtension,
  extractFileName,
  inferContentTypeForExtension,
  maybeStripBenchmarkMetadata,
  maybeStripTemplateBenchmarkMetadata,
  normalizePrefixForLookup,
  resolvePlaceableClassification,
  summarizeDurations,
  type ModuleSnapshotIndex,
  type PlaceableAssetLookupInput,
  type PlaceableAssetSourcePriority
} from "./catalog-processing.helpers";
import { resolveHostLocalMountedPath } from "../../../common/host/host-local-paths";
import {
  DERIVED_ASSET_GENERATOR,
  type DerivedAssetGeneratorPort
} from "../../runtime-settings/application/ports/derived-asset-generator.port";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../../runtime-settings/domain/derived-asset-versions";
import {
  readModuleIfOHakList,
  resolveHakSettingsByAsset
} from "../../runtime-settings/application/runtime-settings.application.service";
import {
  NWN_KEY_BIF_RESOURCE_TYPES,
  NwnKeyBifResourceReader
} from "../../runtime-settings/application/nwn-key-bif-resource-reader";
import { inspectAuroraMdlSource } from "../../runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";
import {
  buildNwnErfResourceIndexKey,
  readNwnErfResource,
  readNwnErfResourceFromIndex,
  readNwnErfResourceIndex,
  type NwnErfResourceIndex
} from "../../runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
import {
  parseRawGffDocument,
  parseTemplateBlueprintFromGff,
  type ParsedItemPropertyListEntry,
  type ParsedTemplateBlueprint
} from "../adapters/outbound/blob/aurora-gff-template-parser";
import {
  parseAuroraItpPalette,
  type ParsedAuroraItpPalette,
  type ParsedAuroraItpPaletteNode,
  type ParsedAuroraItpPaletteNodeKind
} from "../adapters/outbound/blob/aurora-gff-itp-palette-parser";
import {
  serializeItemPaletteToItpGff,
  type SerializableItpPaletteNode
} from "../adapters/outbound/blob/aurora-gff-itp-palette-writer";
import {
  serializeItemBlueprintToUtiGff,
  type SerializableEmbeddedItemBlueprint
} from "../adapters/outbound/blob/aurora-gff-uti-writer";
import { serializeStoreBlueprintToUtmGff } from "../adapters/outbound/blob/aurora-gff-utm-writer";
import {
  serializePlaceableBlueprintToUtpGff,
  type SerializablePlaceableBlueprint
} from "../adapters/outbound/blob/aurora-gff-utp-writer";
import {
  serializeCreatureBlueprintToUtcGff,
  type SerializableCreatureBlueprint
} from "../adapters/outbound/blob/aurora-gff-utc-writer";
import {
  parseAuroraMdlVfxSource,
  type AuroraMdlVfxParseOptions
} from "../../vfx/domain/aurora-mdl-vfx-source.parser";

export interface ProcessingCacheDescriptor {
  key: string;
  hit: boolean;
  storedAt: string;
  hits: number;
}

export interface PlaceableProcessingEnvelope {
  cache: ProcessingCacheDescriptor;
  placeable: PlaceableProcessingResult;
}

export interface TemplateProcessingEnvelope {
  cache: ProcessingCacheDescriptor;
  value: TemplateProcessingResult;
}

export type TemplateProcessingKind = "creature" | "item" | "encounter";

export type TemplateProcessingResultByKind<TKind extends TemplateProcessingKind> =
  TKind extends "creature"
    ? { cache: ProcessingCacheDescriptor; creature: TemplateProcessingResult }
    : TKind extends "item"
      ? { cache: ProcessingCacheDescriptor; item: TemplateProcessingResult }
      : { cache: ProcessingCacheDescriptor; encounter: TemplateProcessingResult };

export interface CreatureBlueprintCreateCommand {
  templateResRef: string;
  name: string;
  blueprint?: Omit<SerializableCreatureBlueprint, "templateResRef" | "sourceStructTypeId">;
  overwrite: boolean;
}

export interface CreatureBlueprintCreateDescriptor {
  templateId: string;
  resref: string;
  name: string;
  objectKey: string;
  sizeBytes: number;
  etag?: string;
  sourceFileType: string;
  sourceFileVersion: string;
}

export type CreatureBlueprintCreateResult = TemplateProcessingResultByKind<"creature"> & {
  blueprint: CreatureBlueprintCreateDescriptor;
};

export type CreatureBlueprintRenameResult = CreatureBlueprintCreateResult & {
  previousResRef: string;
  previousObjectKey: string;
};

export interface CreatureBlueprintDeleteResult {
  resref: string;
  objectKey: string;
  deleted: boolean;
}

export type CreatureResourceOptionKind = "conversation" | "portrait" | "script" | "soundset";

export interface CreatureResourceOption {
  resRef: string;
  label: string;
  soundSetFile?: number;
}

export interface CreatureResourceOptionsResult {
  kind: CreatureResourceOptionKind;
  items: CreatureResourceOption[];
  total: number;
}

export interface ItemBlueprintCreatePropertyEntry {
  propertyName: number;
  subtype?: number;
  costTable?: number;
  costValue?: number;
  param1?: number;
  param1Value?: number;
  chanceAppear?: number;
}

export interface ItemBlueprintCreateCommand {
  templateResRef: string;
  name: string;
  localizedNameStrRef?: number;
  tag?: string;
  description?: string;
  descriptionStrRef?: number;
  identifiedDescription?: string;
  identifiedDescriptionStrRef?: number;
  comments?: string;
  paletteId?: number;
  baseItem: number;
  modelPart1?: number;
  modelPart2?: number;
  modelPart3?: number;
  cost?: number;
  addCost?: number;
  costTable?: number;
  costValue?: number;
  charges?: number;
  stackSize?: number;
  identified?: boolean;
  stolen?: boolean;
  plot?: boolean;
  cursed?: boolean;
  armorContext?: NonNullable<TemplateProcessQuery["itemVisualOverride"]>["armorContext"];
  armorParts?: Partial<Record<ArmorBodyPartSlot, number>>;
  materialColors?: Partial<Record<ItemMaterialColorSlot, number>>;
  propertyList?: ItemBlueprintCreatePropertyEntry[];
  scripts?: Record<string, string>;
  overwrite: boolean;
}

export interface ItemBlueprintCreateDescriptor {
  templateId: string;
  resref: string;
  name: string;
  objectKey: string;
  sizeBytes: number;
  etag?: string;
  sourceFileType: string;
  sourceFileVersion: string;
}

export type ItemBlueprintCreateResult = TemplateProcessingResultByKind<"item"> & {
  blueprint: ItemBlueprintCreateDescriptor;
};

export interface ItemBlueprintDeleteResult {
  resref: string;
  objectKey: string;
  deleted: boolean;
}

export interface ItemGeneratorSupportSource {
  objectKey: string;
  fileName: string;
  sizeBytes: number;
  source: "module-snapshot" | "local-retail-extract";
  header: string;
  classification: "gff-candidate" | "ltr-lexicon" | "unknown";
  supported: boolean;
  parseable: boolean;
  reason: string;
}

export interface ItemGeneratorSupportResult {
  generatedAt: string;
  supported: boolean;
  status: "ready" | "unsupported" | "no-sources";
  sourceCount: number;
  gffCandidateCount: number;
  parseableGffCount: number;
  ltrLexiconCount: number;
  parserImplemented: boolean;
  sources: ItemGeneratorSupportSource[];
  notes: string[];
}

export interface StoreBlueprintItemEntry {
  resRef?: string;
  embeddedItem?: SerializableEmbeddedItemBlueprint;
  randomResRef?: string;
  randomList?: string;
  x?: number;
  y?: number;
  infinite?: boolean;
}

export interface StoreBlueprintBucketEntry {
  bucketTypeId?: number;
  itemListEntries?: StoreBlueprintItemEntry[];
}

export interface StoreBlueprintCreateCommand {
  resRef: string;
  name: string;
  tag?: string;
  comments?: string;
  markUp?: number;
  markDown?: number;
  blackMarket?: boolean;
  bmMarkDown?: number;
  onOpenStore?: string;
  storeId?: number;
  storeListEntries?: StoreBlueprintBucketEntry[];
  willNotBuyBaseItems?: number[];
  willOnlyBuyBaseItems?: number[];
  overwrite: boolean;
}

export interface StoreBlueprintCreateDescriptor {
  templateId: string;
  resref: string;
  name: string;
  objectKey: string;
  sizeBytes: number;
  etag?: string;
  sourceFileType: string;
  sourceFileVersion: string;
}

export interface StoreBlueprintCreateResult {
  blueprint: StoreBlueprintCreateDescriptor;
  store: TemplateRecord;
}

export interface StoreBlueprintDeleteResult {
  resref: string;
  objectKey: string;
  deleted: boolean;
}

export interface PlaceableBlueprintInventoryItemEntry {
  resRef?: string;
  embeddedItem?: SerializableEmbeddedItemBlueprint;
  randomResRef?: string;
  randomList?: string;
  x?: number;
  y?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
  infinite?: boolean;
}

export interface PlaceableBlueprintCreateCommand {
  templateResRef: string;
  name: string;
  tag?: string;
  comments?: string;
  plot?: boolean;
  useable?: boolean;
  hasInventory?: boolean;
  appearanceId?: number;
  isStatic?: boolean;
  inventoryItemListEntries?: PlaceableBlueprintInventoryItemEntry[];
  overwrite: boolean;
}

export interface PlaceableBlueprintCreateDescriptor {
  templateId: string;
  resref: string;
  name: string;
  objectKey: string;
  sizeBytes: number;
  etag?: string;
  sourceFileType: string;
  sourceFileVersion: string;
}

export interface PlaceableBlueprintCreateResult {
  blueprint: PlaceableBlueprintCreateDescriptor;
  placeable: TemplateRecord;
}

export interface PlaceableBlueprintDeleteResult {
  resref: string;
  objectKey: string;
  deleted: boolean;
}

export interface ItemPropertyDictionaryOption {
  rowId: number;
  label?: string;
  nameStrRef?: number;
  value?: number;
  cost?: number;
  potionCost?: number;
  wandCost?: number;
  casterLevel?: number;
  innateLevel?: number;
  spellIndex?: number;
  potionUse?: boolean;
  wandUse?: boolean;
  generalUse?: boolean;
  icon?: string;
  sourceKey: string;
}

export interface ItemPropertyDictionaryEntry {
  propertyName: number;
  label: string;
  propertyLabel?: string;
  cost?: number;
  nameStrRef?: number;
  gameStrRef?: number;
  descriptionStrRef?: number;
  subTypeTable?: string;
  costTableIndex?: number;
  costTableLabel?: string;
  costTableDefinition?: string;
  param1TableIndex?: number;
  param1TableLabel?: string;
  param1Table?: string;
  subtypeOptions: ItemPropertyDictionaryOption[];
  costValueOptions: ItemPropertyDictionaryOption[];
  param1Options: ItemPropertyDictionaryOption[];
}

export interface ItemPropertyDictionaryResult {
  generatedAt: string;
  properties: ItemPropertyDictionaryEntry[];
}

export interface ItemBaseItemEntry {
  baseItem: number;
  sourceKey: string;
  label?: string;
  nameStrRef?: number;
  itemClass?: string;
  modelType?: string;
  defaultModel?: string;
  defaultIcon?: string;
  invSlotWidth?: number;
  invSlotHeight?: number;
  canRotateIcon?: number;
  equipableSlots?: string;
  baseCost?: number;
  stacking?: number;
  itemMultiplier?: number;
  maxProps?: number;
  minProps?: number;
  propColumn?: string;
  storePanel?: number;
  storePanelSort?: number;
  chargesStarting?: number;
  ilrStackSize?: number;
  weaponWield?: number;
  weaponType?: number;
  weaponSize?: number;
  rangedWeapon?: number;
  rotateOnGround?: number;
  weaponMatType?: number;
  ammunitionType?: number;
  arcaneSpellFailure?: number;
  reqFeats?: number[];
}

export interface ItemBaseItemsResult {
  generatedAt: string;
  sourceKey?: string;
  count: number;
  items: ItemBaseItemEntry[];
}

export type ItemPaletteTreeNodeKind = ParsedAuroraItpPaletteNodeKind;

export interface ItemPaletteTreeNode {
  nodeId: string;
  kind: ItemPaletteTreeNodeKind;
  depth: number;
  label: string;
  strRef?: number;
  id?: number;
  resRef?: string;
  name?: string;
  leafCount: number;
  folderCount: number;
  categoryLeafCount: number;
  children: ItemPaletteTreeNode[];
}

export interface ItemPaletteTreeSource {
  resref: string;
  objectKey: string;
  fileName: string;
  sourceFileType: string;
  sourceFileVersion: string;
  rootCount: number;
  leafCount: number;
  folderCount: number;
  categoryLeafCount: number;
  maxDepth: number;
  selected: boolean;
}

export interface ItemPaletteTreeResult {
  generatedAt: string;
  activeSource?: string;
  sources: ItemPaletteTreeSource[];
  rootCount: number;
  leafCount: number;
  folderCount: number;
  categoryLeafCount: number;
  maxDepth: number;
  roots: ItemPaletteTreeNode[];
}

export interface ItemPaletteCustomNodeCommand {
  label?: string;
  strRef?: number;
  id?: number;
  resRef?: string;
  children?: ItemPaletteCustomNodeCommand[];
}

export interface ItemPaletteCustomWriteCommand {
  roots: ItemPaletteCustomNodeCommand[];
}

export interface ItemPaletteCustomWriteDescriptor {
  resref: "itempalcus";
  objectKey: string;
  fileName: string;
  sizeBytes: number;
  etag?: string;
  sourceFileType: string;
  sourceFileVersion: string;
  rootCount: number;
  leafCount: number;
  folderCount: number;
  categoryLeafCount: number;
  maxDepth: number;
}

export interface ItemPaletteCustomWriteResult {
  palette: ItemPaletteCustomWriteDescriptor;
  tree: ItemPaletteTreeResult;
}

interface ItemPaletteTalkTableResolvedString {
  text: string;
  strRef: number;
  sourceKind: "base" | "custom";
  sourcePath: string;
}

interface ItemPaletteTalkTableLookup {
  resolve(strRef: number | undefined): ItemPaletteTalkTableResolvedString | undefined;
}

interface OnDemandResourceCandidate {
  extension: string;
  resourceType: number;
  vanillaDirectory: string;
}

type CreatureRuntimeItemListEntry = {
  resRef?: string;
  itemTemplateId?: string;
  itemResref?: string;
  itemSourceFingerprint?: string;
  itemSourceObjectKey?: string;
  itemRuntime?: ItemRuntimeProjection;
};
type PlaceableManifestSourceAssetKind = "placeable" | "creature" | "item";

const CREATURE_APPEARANCE_OVERRIDE_BODY_KEYS = [
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
] as const;
const CREATURE_APPEARANCE_OVERRIDE_COLOR_KEYS = [
  "skin",
  "hair",
  "tattoo1",
  "tattoo2"
] as const;
const ITEM_VISUAL_OVERRIDE_MODEL_PART_KEYS = [
  "modelPart1",
  "modelPart2",
  "modelPart3"
] as const;
const ITEM_VISUAL_OVERRIDE_ARMOR_PART_METADATA_KEYS = [
  ["rFoot", "bodyPartRFoot"],
  ["lFoot", "bodyPartLFoot"],
  ["rShin", "bodyPartRShin"],
  ["lShin", "bodyPartLShin"],
  ["lThigh", "bodyPartLThigh"],
  ["rThigh", "bodyPartRThigh"],
  ["pelvis", "bodyPartPelvis"],
  ["torso", "bodyPartTorso"],
  ["belt", "bodyPartBelt"],
  ["neck", "bodyPartNeck"],
  ["rFArm", "bodyPartRFArm"],
  ["lFArm", "bodyPartLFArm"],
  ["rBicep", "bodyPartRBicep"],
  ["lBicep", "bodyPartLBicep"],
  ["rShoul", "bodyPartRShoul"],
  ["lShoul", "bodyPartLShoul"],
  ["rHand", "bodyPartRHand"],
  ["lHand", "bodyPartLHand"],
  ["robe", "bodyPartRobe"]
] as const;
const ITEM_ARMOR_PART_COST_METADATA_KEYS = [
  ["rFoot", "bodyPartRFoot", "armorPartCostModifierRFoot", "parts_foot"],
  ["lFoot", "bodyPartLFoot", "armorPartCostModifierLFoot", "parts_foot"],
  ["rShin", "bodyPartRShin", "armorPartCostModifierRShin", "parts_shin"],
  ["lShin", "bodyPartLShin", "armorPartCostModifierLShin", "parts_shin"],
  ["lThigh", "bodyPartLThigh", "armorPartCostModifierLThigh", "parts_legs"],
  ["rThigh", "bodyPartRThigh", "armorPartCostModifierRThigh", "parts_legs"],
  ["pelvis", "bodyPartPelvis", "armorPartCostModifierPelvis", "parts_pelvis"],
  ["torso", "bodyPartTorso", "armorPartCostModifierTorso", "parts_chest"],
  ["belt", "bodyPartBelt", "armorPartCostModifierBelt", "parts_belt"],
  ["neck", "bodyPartNeck", "armorPartCostModifierNeck", "parts_neck"],
  ["rFArm", "bodyPartRFArm", "armorPartCostModifierRFArm", "parts_forearm"],
  ["lFArm", "bodyPartLFArm", "armorPartCostModifierLFArm", "parts_forearm"],
  ["rBicep", "bodyPartRBicep", "armorPartCostModifierRBicep", "parts_bicep"],
  ["lBicep", "bodyPartLBicep", "armorPartCostModifierLBicep", "parts_bicep"],
  ["rShoul", "bodyPartRShoul", "armorPartCostModifierRShoul", "parts_shoulder"],
  ["lShoul", "bodyPartLShoul", "armorPartCostModifierLShoul", "parts_shoulder"],
  ["rHand", "bodyPartRHand", "armorPartCostModifierRHand", "parts_hand"],
  ["lHand", "bodyPartLHand", "armorPartCostModifierLHand", "parts_hand"],
  ["robe", "bodyPartRobe", "armorPartCostModifierRobe", "parts_robe"]
] as const;
const ITEM_ARMOR_ROBE_HIDE_METADATA_KEYS = [
  ["rFoot", "HIDEFOOTR"],
  ["lFoot", "HIDEFOOTL"],
  ["rShin", "HIDESHINR"],
  ["lShin", "HIDESHINL"],
  ["rThigh", "HIDELEGR"],
  ["lThigh", "HIDELEGL"],
  ["pelvis", "HIDEPELVIS"],
  ["torso", "HIDECHEST"],
  ["belt", "HIDEBELT"],
  ["neck", "HIDENECK"],
  ["rFArm", "HIDEFORER"],
  ["lFArm", "HIDEFOREL"],
  ["rBicep", "HIDEBICEPR"],
  ["lBicep", "HIDEBICEPL"],
  ["rShoul", "HIDESHOR"],
  ["lShoul", "HIDESHOL"],
  ["rHand", "HIDEHANDR"],
  ["lHand", "HIDEHANDL"]
] as const;
const ITEM_CLOAK_HIDE_METADATA_KEYS = [
  ["wing", "HIDEWING"],
  ["tail", "HIDETAIL"],
  ["lShoul", "HIDESHOL"],
  ["rShoul", "HIDESHOR"]
] as const;
const ITEM_CLOAK_MODEL_TYPE = "cloak";
const ITEM_CLOAK_BASE_ITEM = 80;
const ITEM_CLOAK_DEFAULT_MODEL_ROW = 1;
const ITEM_ARMOR_PREVIEW_MODEL_PREFIX_PATTERN = /^p[fm][a-z][0-9]_$/u;
const ITEM_VISUAL_OVERRIDE_MATERIAL_COLOR_METADATA_KEYS = [
  ["leather1", "leather1Color"],
  ["leather2", "leather2Color"],
  ["cloth1", "cloth1Color"],
  ["cloth2", "cloth2Color"],
  ["metal1", "metal1Color"],
  ["metal2", "metal2Color"]
] as const;

type ArmorBodyPartSlot = (typeof ITEM_VISUAL_OVERRIDE_ARMOR_PART_METADATA_KEYS)[number][0];
type ItemMaterialColorSlot =
  (typeof ITEM_VISUAL_OVERRIDE_MATERIAL_COLOR_METADATA_KEYS)[number][0];

function normalizeItemArmorPreviewModelPrefix(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return ITEM_ARMOR_PREVIEW_MODEL_PREFIX_PATTERN.test(normalized) ? normalized : undefined;
}

function normalizeItemArmorPreviewContextText(
  value: string | undefined,
  maximumLength: number
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, maximumLength) : undefined;
}

function normalizeItemBlueprintResref(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{1,16}$/u.test(normalized)) {
    throw new AppException({
      status: 422,
      code: "VALIDATION_FAILED",
      message: "Item template resref must contain 1-16 letters, numbers, or underscores."
    });
  }
  return normalized;
}

function normalizeCreatureBlueprintResref(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{1,16}$/u.test(normalized)) {
    throw new AppException({
      status: 422,
      code: "VALIDATION_FAILED",
      message: "Creature template resref must contain 1-16 letters, numbers, or underscores."
    });
  }
  return normalized;
}

function parseCreatureResourceObjectKey(
  objectKey: string
): { resRef: string; extension: string } | null {
  const fileName = objectKey.trim().split(/[\\/]/u).pop() ?? "";
  const match = /^([A-Za-z0-9_]{1,16})\.([A-Za-z0-9_]+)$/u.exec(fileName);
  if (!match) {
    return null;
  }
  return {
    resRef: match[1]!.toLowerCase(),
    extension: match[2]!.toLowerCase()
  };
}

function normalizeStoreBlueprintResref(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{1,16}$/u.test(normalized)) {
    throw new AppException({
      status: 422,
      code: "VALIDATION_FAILED",
      message: "Store template resref must contain 1-16 letters, numbers, or underscores."
    });
  }
  return normalized;
}

function normalizePlaceableBlueprintResref(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{1,16}$/u.test(normalized)) {
    throw new AppException({
      status: 422,
      code: "VALIDATION_FAILED",
      message: "Placeable template resref must contain 1-16 letters, numbers, or underscores."
    });
  }
  return normalized;
}

function normalizeItemPaletteResref(value: string, path: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{1,16}$/u.test(normalized)) {
    throw new AppException({
      status: 422,
      code: "VALIDATION_FAILED",
      message: `Item palette resref at ${path} must contain 1-16 letters, numbers, or underscores.`
    });
  }
  return normalized;
}

function normalizeItemPaletteCustomNode(
  node: ItemPaletteCustomNodeCommand,
  path: string
): SerializableItpPaletteNode {
  const label =
    typeof node.label === "string" && node.label.trim().length > 0
      ? node.label.trim().slice(0, 128)
      : undefined;
  const strRef = normalizeOptionalUInt32(node.strRef, `${path}.strRef`);
  const id = normalizeOptionalUInt32(node.id, `${path}.id`);
  const resRef =
    typeof node.resRef === "string" && node.resRef.trim().length > 0
      ? normalizeItemPaletteResref(node.resRef, `${path}.resRef`)
      : undefined;
  const children = (node.children ?? []).map((child, index) =>
    normalizeItemPaletteCustomNode(child, `${path}.children.${index}`)
  );

  if (resRef && children.length > 0) {
    throw new AppException({
      status: 422,
      code: "VALIDATION_FAILED",
      message: `Item palette leaf at ${path} cannot contain child nodes.`
    });
  }
  if (!label && strRef === undefined && id === undefined && !resRef && children.length === 0) {
    throw new AppException({
      status: 422,
      code: "VALIDATION_FAILED",
      message: `Item palette node at ${path} must contain label, strRef, id, resRef, or children.`
    });
  }

  return {
    ...(label ? { label } : {}),
    ...(strRef !== undefined ? { strRef } : {}),
    ...(id !== undefined ? { id } : {}),
    ...(resRef ? { resRef } : {}),
    ...(children.length > 0 ? { children } : {})
  };
}

function normalizeOptionalUInt32(value: number | undefined, path: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new AppException({
      status: 422,
      code: "VALIDATION_FAILED",
      message: `Item palette numeric field ${path} must be an unsigned 32-bit integer.`
    });
  }
  return value;
}

function buildSerializableCreatureBlueprintFromCreateCommand(
  command: CreatureBlueprintCreateCommand,
  resref: string
): SerializableCreatureBlueprint {
  const supplied = command.blueprint ?? {};
  return {
    ...supplied,
    sourceStructTypeId: 0xffffffff,
    templateResRef: resref,
    firstName: supplied.firstName?.trim() || command.name.trim(),
    tag: supplied.tag?.trim() || resref,
    paletteId: supplied.paletteId ?? 3,
    scripts: supplied.scripts ?? {}
  };
}

function buildSerializableItemBlueprintFromCreateCommand(
  command: ItemBlueprintCreateCommand,
  resref: string
): ParsedTemplateBlueprint {
  const blueprint: ParsedTemplateBlueprint = {
    sourceFileType: "UTI ",
    sourceFileVersion: "V3.2",
    sourceStructTypeId: 0xffffffff,
    templateResRef: resref,
    localizedName: command.name.trim(),
    localizedNameStrRef: command.localizedNameStrRef,
    tag: command.tag?.trim() || resref,
    paletteId: command.paletteId ?? 3,
    baseItem: command.baseItem,
    identified: command.identified ?? true,
    stolen: command.stolen ?? false,
    plot: command.plot ?? false,
    cursed: command.cursed ?? false,
    scripts: {},
    dependencyRefs: [],
    dependencyFingerprint: "",
    vfxEvidence: []
  };

  setOptionalParsedBlueprintValue(blueprint, "description", command.description);
  setOptionalParsedBlueprintValue(blueprint, "descriptionStrRef", command.descriptionStrRef);
  setOptionalParsedBlueprintValue(
    blueprint,
    "identifiedDescription",
    command.identifiedDescription ?? command.description
  );
  setOptionalParsedBlueprintValue(
    blueprint,
    "identifiedDescriptionStrRef",
    command.identifiedDescriptionStrRef
  );
  setOptionalParsedBlueprintValue(blueprint, "comments", command.comments);
  setOptionalParsedBlueprintValue(blueprint, "modelPart1", command.modelPart1);
  setOptionalParsedBlueprintValue(blueprint, "modelPart2", command.modelPart2);
  setOptionalParsedBlueprintValue(blueprint, "modelPart3", command.modelPart3);
  setOptionalParsedBlueprintValue(blueprint, "cost", command.cost);
  setOptionalParsedBlueprintValue(blueprint, "addCost", command.addCost);
  setOptionalParsedBlueprintValue(blueprint, "costTable", command.costTable);
  setOptionalParsedBlueprintValue(blueprint, "costValue", command.costValue);
  setOptionalParsedBlueprintValue(blueprint, "charges", command.charges);
  setOptionalParsedBlueprintValue(blueprint, "stackSize", command.stackSize);
  setOptionalParsedBlueprintValue(
    blueprint,
    "itemArmorPreviewModelPrefix",
    normalizeItemArmorPreviewModelPrefix(command.armorContext?.modelPrefix)
  );
  setOptionalParsedBlueprintValue(
    blueprint,
    "itemArmorPreviewContextLabel",
    normalizeItemArmorPreviewContextText(command.armorContext?.label, 64)
  );
  setOptionalParsedBlueprintValue(
    blueprint,
    "itemArmorPreviewGender",
    command.armorContext?.gender
  );
  setOptionalParsedBlueprintValue(
    blueprint,
    "itemArmorPreviewPhenotype",
    command.armorContext?.phenotype
  );
  setOptionalParsedBlueprintValue(
    blueprint,
    "itemArmorPreviewRaceModel",
    normalizeItemArmorPreviewContextText(command.armorContext?.raceModel, 32)
  );

  for (const [slot, metadataKey] of ITEM_VISUAL_OVERRIDE_ARMOR_PART_METADATA_KEYS) {
    setOptionalParsedBlueprintValue(
      blueprint,
      metadataKey as keyof ParsedTemplateBlueprint,
      command.armorParts?.[slot]
    );
  }
  for (const [slot, metadataKey] of ITEM_VISUAL_OVERRIDE_MATERIAL_COLOR_METADATA_KEYS) {
    setOptionalParsedBlueprintValue(
      blueprint,
      metadataKey as keyof ParsedTemplateBlueprint,
      command.materialColors?.[slot]
    );
  }

  const propertyEntries = (command.propertyList ?? [])
    .map(normalizeItemBlueprintPropertyEntry)
    .filter((entry) => entry.propertyName !== undefined);
  if (propertyEntries.length > 0) {
    blueprint.itemPropertyListEntries = propertyEntries;
  }
  const scripts = normalizeItemBlueprintScripts(command.scripts);
  if (Object.keys(scripts).length > 0) {
    blueprint.scripts = scripts;
  }

  return blueprint;
}

function normalizeItemBlueprintScripts(scripts: Record<string, string> | undefined): Record<string, string> {
  if (!scripts) {
    return {};
  }
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(scripts)) {
    const normalizedKey = normalizeItemBlueprintScriptLabel(key);
    const normalizedValue = value.trim();
    if (!normalizedKey || !normalizedValue) {
      continue;
    }
    normalized[normalizedKey] = normalizedValue;
  }
  return normalized;
}

function normalizeItemBlueprintScriptLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "oninventorydisturbed") {
    return "oninvdisturbed";
  }
  return normalized;
}

function applyItemBlueprintPreviewMetadataFromCreateCommand(
  blueprint: ParsedTemplateBlueprint,
  command: ItemBlueprintCreateCommand
): ParsedTemplateBlueprint {
  setOptionalParsedBlueprintValue(
    blueprint,
    "itemArmorPreviewModelPrefix",
    normalizeItemArmorPreviewModelPrefix(command.armorContext?.modelPrefix)
  );
  setOptionalParsedBlueprintValue(
    blueprint,
    "itemArmorPreviewContextLabel",
    normalizeItemArmorPreviewContextText(command.armorContext?.label, 64)
  );
  setOptionalParsedBlueprintValue(
    blueprint,
    "itemArmorPreviewGender",
    command.armorContext?.gender
  );
  setOptionalParsedBlueprintValue(
    blueprint,
    "itemArmorPreviewPhenotype",
    command.armorContext?.phenotype
  );
  setOptionalParsedBlueprintValue(
    blueprint,
    "itemArmorPreviewRaceModel",
    normalizeItemArmorPreviewContextText(command.armorContext?.raceModel, 32)
  );
  return blueprint;
}

function buildSerializableStoreBlueprintFromCreateCommand(
  command: StoreBlueprintCreateCommand,
  resref: string
) {
  return {
    resRef: resref,
    localizedName: command.name.trim(),
    tag: command.tag?.trim() || resref,
    comments: command.comments,
    markUp: command.markUp ?? 100,
    markDown: command.markDown ?? 100,
    blackMarket: command.blackMarket ?? false,
    bmMarkDown: command.bmMarkDown ?? 100,
    onOpenStore: command.onOpenStore,
    storeId: command.storeId ?? 0,
    storeListEntries: command.storeListEntries,
    willNotBuyBaseItems: command.willNotBuyBaseItems,
    willOnlyBuyBaseItems: command.willOnlyBuyBaseItems,
    sourceStructTypeId: 0xffffffff
  };
}

function buildSerializablePlaceableBlueprintFromCreateCommand(
  command: PlaceableBlueprintCreateCommand,
  resref: string
): SerializablePlaceableBlueprint {
  const inventoryItemListEntries = command.inventoryItemListEntries?.map((entry) => ({
    resRef: entry.resRef,
    embeddedItem: entry.embeddedItem,
    randomResRef: entry.randomResRef,
    randomList: entry.randomList,
    x: entry.x,
    y: entry.y,
    dropable: entry.dropable,
    pickpocketable: entry.pickpocketable,
    infinite: entry.infinite
  }));
  return {
    templateResRef: resref,
    localizedName: command.name.trim(),
    tag: command.tag?.trim() || resref,
    comments: command.comments,
    plot: command.plot ?? false,
    useable: command.useable ?? true,
    hasInventory:
      command.hasInventory ?? Boolean(inventoryItemListEntries && inventoryItemListEntries.length > 0),
    appearanceId: command.appearanceId,
    isStatic: command.isStatic ?? false,
    inventoryItemListEntries,
    sourceStructTypeId: 0xffffffff
  };
}

function normalizeItemBlueprintPropertyEntry(
  entry: ItemBlueprintCreatePropertyEntry
): ParsedItemPropertyListEntry {
  const normalized: ParsedItemPropertyListEntry = {
    propertyName: entry.propertyName
  };
  setOptionalItemPropertyValue(normalized, "subtype", entry.subtype);
  setOptionalItemPropertyValue(normalized, "costTable", entry.costTable);
  setOptionalItemPropertyValue(normalized, "costValue", entry.costValue);
  setOptionalItemPropertyValue(normalized, "param1", entry.param1);
  setOptionalItemPropertyValue(normalized, "param1Value", entry.param1Value);
  setOptionalItemPropertyValue(normalized, "chanceAppear", entry.chanceAppear);
  return normalized;
}

function setOptionalParsedBlueprintValue(
  blueprint: ParsedTemplateBlueprint,
  key: keyof ParsedTemplateBlueprint,
  value: string | number | boolean | ParsedItemPropertyListEntry[] | undefined
): void {
  if (value !== undefined) {
    (blueprint as unknown as Record<string, unknown>)[key] = value;
  }
}

function setOptionalItemPropertyValue(
  entry: ParsedItemPropertyListEntry,
  key: keyof ParsedItemPropertyListEntry,
  value: number | undefined
): void {
  if (value !== undefined) {
    entry[key] = value;
  }
}

function setOptionalStoreMetadata(
  metadata: TemplateRecord["metadata"],
  key: string,
  value: string | number | boolean | undefined
): void {
  if (value !== undefined) {
    metadata[key] = value;
  }
}

function setOptionalStoreJsonMetadata(
  metadata: TemplateRecord["metadata"],
  key: string,
  value: unknown[] | undefined
): void {
  if (value && value.length > 0) {
    metadata[key] = JSON.stringify(value);
  }
}

interface OnDemandPlaceableSourceResource extends OnDemandResourceCandidate {
  resref: string;
  fileName: string;
  bytes: Buffer;
}

type ItemMetadataPrimitiveRecord = Record<string, string | number | boolean>;

interface OnDemandItemPropertyDefinitionMetadata {
  propertyLabel?: string;
  propertyDefinitionSource2daRow?: number;
  propertyDefinitionSourceKey?: string;
  cost?: number;
  subTypeTable?: string;
  costTableDefinition?: string;
  param1Table?: string;
  nameStrRef?: number;
  gameStrRef?: number;
  descriptionStrRef?: number;
}

const ON_DEMAND_MODEL_RESOURCE_CANDIDATES: OnDemandResourceCandidate[] = [
  {
    extension: "mdl",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MDL,
    vanillaDirectory: "models"
  }
];

const ON_DEMAND_TEXTURE_RESOURCE_CANDIDATES: OnDemandResourceCandidate[] = [
  {
    extension: "dds",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.DDS,
    vanillaDirectory: "textures"
  },
  {
    extension: "tga",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TGA,
    vanillaDirectory: "textures"
  },
  {
    extension: "bmp",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.BMP,
    vanillaDirectory: "textures"
  },
  {
    extension: "plt",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.PLT,
    vanillaDirectory: "textures"
  }
];
const PLACEABLE_FAST_SHADOW_TEXTURE_RESREF = "fxpa_dot01";

const ON_DEMAND_MATERIAL_RESOURCE_CANDIDATES: OnDemandResourceCandidate[] = [
  {
    extension: "mtr",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MTR,
    vanillaDirectory: "materials"
  },
  {
    extension: "txi",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TXI,
    vanillaDirectory: "textures"
  }
];

const ON_DEMAND_ITEM_TEMPLATE_RESOURCE_CANDIDATES: OnDemandResourceCandidate[] = [
  {
    extension: "uti",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTI,
    vanillaDirectory: "templates"
  }
];

const ON_DEMAND_TWO_DA_RESOURCE_CANDIDATES: OnDemandResourceCandidate[] = [
  {
    extension: "2da",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
    vanillaDirectory: "2da"
  }
];

const ON_DEMAND_ITP_RESOURCE_CANDIDATES: OnDemandResourceCandidate[] = [
  {
    extension: "itp",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.ITP,
    vanillaDirectory: "itp"
  }
];

const LOCAL_ITEM_RETAIL_BASEITEMS_2DA_PATH =
  "C:\\Projects\\New Folder\\item-retail-extract\\2da\\baseitems.2da";
const LOCAL_ITEM_RETAIL_ITEMPROPDEF_2DA_PATH =
  "C:\\Projects\\New Folder\\item-retail-extract\\2da\\itempropdef.2da";
const LOCAL_ITEM_RETAIL_TWO_DA_DIR =
  "C:\\Projects\\New Folder\\item-retail-extract\\2da";
const LOCAL_ITEM_RETAIL_ITP_DIR =
  "C:\\Projects\\New Folder\\item-retail-extract\\itp";
const LOCAL_ITEM_RETAIL_COST_FALLBACK_TWO_DA_RESREFS = new Set([
  "iprp_chargecost",
  "iprp_damagecost",
  "iprp_immuncost",
  "iprp_meleecost",
  "iprp_soakcost",
  "iprp_spellcost",
  "iprp_spelllvcost",
  "iprp_spelllvlimm",
  "iprp_trapcost",
  "iprp_spells",
  "armor",
  "parts_belt",
  "parts_bicep",
  "parts_chest",
  "parts_foot",
  "parts_forearm",
  "parts_hand",
  "parts_legs",
  "parts_neck",
  "parts_pelvis",
  "parts_robe",
  "parts_shin",
  "parts_shoulder"
]);
const DEFAULT_ITEM_GENERATOR_SOURCE_DIRS = [
  "C:\\Projects\\New Folder\\item-retail-extract\\utg",
  "/host/aurora-reference/item-retail-extract/utg"
];
let localItemRetailBaseitemsTwoDaCache:
  | Promise<OnDemandPlaceableSourceResource | null>
  | null = null;
let localItemRetailItemPropDefTwoDaCache:
  | Promise<OnDemandPlaceableSourceResource | null>
  | null = null;
const localItemRetailTwoDaCache = new Map<
  string,
  Promise<OnDemandPlaceableSourceResource | null>
>();
const localItemRetailItpCache = new Map<
  string,
  Promise<OnDemandPlaceableSourceResource | null>
>();

function readItemGeneratorHeader(bytes: Buffer): string {
  const rawHeader = bytes.subarray(0, 16).toString("ascii").replace(/\0.*$/u, "");
  const knownSignature = rawHeader.match(/^(?:UTG|LTR)\s+V[0-9.]+/iu);
  if (knownSignature) {
    return knownSignature[0].trim();
  }
  return rawHeader.replace(/[^\x20-\x7e].*$/u, "").trim();
}

function classifyItemGeneratorHeader(
  header: string
): Pick<ItemGeneratorSupportSource, "classification" | "supported" | "parseable" | "reason"> {
  const normalized = header.trim().toUpperCase();
  if (normalized.startsWith("UTG ")) {
    return {
      classification: "gff-candidate",
      supported: false,
      parseable: false,
      reason:
        "GFF-style UTG header detected, but Aurora Web does not yet have a verified TNWItemGenerator parser/serializer."
    };
  }
  if (normalized.startsWith("LTR ")) {
    return {
      classification: "ltr-lexicon",
      supported: false,
      parseable: false,
      reason: "LTR V1.0 resource, not a GFF item-generator blueprint."
    };
  }
  return {
    classification: "unknown",
    supported: false,
    parseable: false,
    reason: "Unknown .utg header; no safe item-generator parser can be selected."
  };
}

function buildItemGeneratorSupportSource(input: {
  objectKey: string;
  fileName: string;
  sizeBytes: number;
  source: ItemGeneratorSupportSource["source"];
  bytes: Buffer;
}): ItemGeneratorSupportSource {
  const header = readItemGeneratorHeader(input.bytes);
  const classification = classifyItemGeneratorHeader(header);
  return {
    objectKey: input.objectKey,
    fileName: input.fileName,
    sizeBytes: input.sizeBytes,
    source: input.source,
    header,
    ...classification
  };
}

function dedupeItemGeneratorSupportSources(
  sources: readonly ItemGeneratorSupportSource[]
): ItemGeneratorSupportSource[] {
  const byKey = new Map<string, ItemGeneratorSupportSource>();
  for (const source of sources) {
    const key = `${source.source}:${source.objectKey.toLowerCase()}`;
    if (!byKey.has(key)) {
      byKey.set(key, source);
    }
  }
  return [...byKey.values()].sort((left, right) => left.objectKey.localeCompare(right.objectKey));
}

function mergeItemPropertyDefinitionMetadata(
  existing: OnDemandItemPropertyDefinitionMetadata,
  fallback: OnDemandItemPropertyDefinitionMetadata
): OnDemandItemPropertyDefinitionMetadata {
  return {
    ...existing,
    ...(existing.propertyLabel === undefined && fallback.propertyLabel !== undefined
      ? { propertyLabel: fallback.propertyLabel }
      : {}),
    ...(fallback.cost !== undefined &&
    (existing.cost === undefined || (existing.cost === 0 && fallback.cost !== 0))
      ? { cost: fallback.cost }
      : {}),
    ...(existing.nameStrRef === undefined && fallback.nameStrRef !== undefined
      ? { nameStrRef: fallback.nameStrRef }
      : {}),
    ...(existing.subTypeTable === undefined && fallback.subTypeTable !== undefined
      ? { subTypeTable: fallback.subTypeTable }
      : {}),
    ...(existing.costTableDefinition === undefined && fallback.costTableDefinition !== undefined
      ? { costTableDefinition: fallback.costTableDefinition }
      : {}),
    ...(existing.param1Table === undefined && fallback.param1Table !== undefined
      ? { param1Table: fallback.param1Table }
      : {}),
    ...(existing.gameStrRef === undefined && fallback.gameStrRef !== undefined
      ? { gameStrRef: fallback.gameStrRef }
      : {}),
    ...(existing.descriptionStrRef === undefined && fallback.descriptionStrRef !== undefined
      ? { descriptionStrRef: fallback.descriptionStrRef }
      : {})
  };
}

const ITEM_PROPERTY_COST_VALUE_TABLE_BY_COST_TABLE_INDEX = new Map<number, string>([
  [2, "iprp_meleecost"],
  [3, "iprp_chargecost"],
  [4, "iprp_damagecost"],
  [5, "iprp_immuncost"],
  [6, "iprp_soakcost"],
  [13, "iprp_spelllvcost"],
  [14, "iprp_ammotype"],
  [16, "iprp_spellcost"],
  [17, "iprp_trapcost"],
  [23, "iprp_spelllvlimm"]
]);

const VANILLA_KEY_FILE_CANDIDATES = ["nwn_base.key", "nwn_retail.key"] as const;

const ON_DEMAND_SOURCE_FILE_EXISTS_CACHE = new Map<string, Promise<boolean>>();
const ON_DEMAND_MODULE_IFO_HAK_LIST_CACHE = new Map<string, Promise<string[]>>();
const ON_DEMAND_HAK_RESOURCE_INDEX_CACHE = new Map<
  string,
  Promise<NwnErfResourceIndex | null>
>();
const ON_DEMAND_VANILLA_READER_CACHE = new Map<
  string,
  Promise<NwnKeyBifResourceReader | null>
>();

function buildOnDemandTemplateId(kind: TemplateKind, resref: string): string {
  if (kind === "placeable") {
    return `plc_${resref}`.slice(0, 80);
  }
  if (kind === "creature") {
    return `cre_${resref}`.slice(0, 80);
  }
  if (kind === "encounter") {
    return `enc_${resref}`.slice(0, 80);
  }
  if (kind === "store") {
    return `str_${resref}`.slice(0, 80);
  }
  return `itm_${resref}`.slice(0, 80);
}

export interface PlaceableAssetBlobEnvelope {
  cacheKey: string;
  asset: PlaceableAssetEntry;
  moduleHash?: string;
  payload: ModuleBlobObjectPayload;
}

export interface PlaceableAssetDeliveryContract {
  assetId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  deliveryPath: string;
  deliveryUrl: string;
  s3Url?: string;
}

export interface PlaceableAssetDeliveryEnvelope {
  cacheKey: string;
  moduleHash?: string;
  assets: PlaceableAssetDeliveryContract[];
}

export interface PlaceableAssetDeliveryBatchQuery {
  cacheKey: string;
  assetIds?: string[];
}

export interface PlaceableAssetDeliveryBatchEnvelope {
  items: PlaceableAssetDeliveryEnvelope[];
}

export interface PlaceableViewportRenderPayloadEnvelope {
  templateId: string;
  cacheKey: string;
  cacheHit: boolean;
  storedAt: string;
  hits: number;
  placeable: PlaceableProcessingResult;
  renderPackage?: PlaceableProcessingResult["renderPackage"];
  assetContracts: PlaceableAssetDeliveryEnvelope;
}

export interface PlaceableViewportRenderPayloadBatchEnvelope {
  items: PlaceableViewportRenderPayloadEnvelope[];
}

const MODULE_HASH_PROBE_TTL_MS = 30_000;
const MODULE_SNAPSHOT_INDEX_TTL_MS = 5 * 60_000;
const MODULE_SNAPSHOT_INDEX_FAILURE_TTL_MS = 30_000;
const TEMPLATE_LOOKUP_TTL_MS = 60_000;
const TEMPLATE_LIST_CACHE_TTL_MS = 60_000;
const PLACEABLE_MANIFEST_VALIDATION_TTL_MS = 30_000;
const DEFAULT_TEMPLATE_LOOKUP_CACHE_MAX_ENTRIES = 2_500;
const DEFAULT_MANIFEST_VALIDATION_CACHE_MAX_ENTRIES = 5_000;
const DEFAULT_TEMPLATE_LIST_CACHE_MAX_ENTRIES = 256;
const MODULE_BLOB_OBJECT_CACHE_TTL_MS = 10 * 60_000;
const MODULE_BLOB_OBJECT_CACHE_MAX_BYTES = 512 * 1024 * 1024;
const MODULE_BLOB_OBJECT_CACHE_MAX_ENTRY_BYTES = 32 * 1024 * 1024;
const PLACEABLE_ASSET_BLOB_CACHE_PRIME_CONCURRENCY = 2;
// Peak memory during a render-payload batch scales with how many on-demand
// MDL->GLB conversions run at once. 24 concurrent conversions can OOM-kill the
// Node process on placeable-dense Areas (e.g. enon_bakery: 196 placeables).
// High concurrency also starves ordinary auth/health requests, which surfaces
// as a white or disappearing viewport while the backend is still grinding.
// Default to a responsive 4 and allow tuning via env without a rebuild.
// Set AURORA_PLACEABLE_BATCH_CONCURRENCY to override.
function resolvePlaceableBatchConcurrency(): number {
  const raw = Number(process.env.AURORA_PLACEABLE_BATCH_CONCURRENCY);
  if (Number.isInteger(raw) && raw >= 1 && raw <= 64) {
    return raw;
  }
  return 4;
}
const PLACEABLE_PROCESS_BATCH_GLOBAL_CONCURRENCY = resolvePlaceableBatchConcurrency();
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK_TYPE = 0x4e4f534a;

interface TemplateLookupCacheEntry {
  template: TemplateRecord;
  expiresAtMs: number;
}

interface TemplateListCacheEntry {
  result: TemplateListResult;
  expiresAtMs: number;
}

interface PlaceableManifestValidationEntry {
  moduleHash?: string;
  expiresAtMs: number;
}

interface ModuleBlobObjectCacheEntry {
  payload: ModuleBlobObjectPayload;
  expiresAtMs: number;
  sizeBytes: number;
}

interface DerivedPlaceableModelGenerationResult {
  derivedAssets: PlaceableAssetEntry[];
  noRenderableGeometry: boolean;
}

interface PlaceableProcessingOptions {
  allowOnDemandDerivedModelGeneration?: boolean;
  allowExpensiveSourceReferenceScans?: boolean;
  allowOnDemandTextureLookup?: boolean;
}

@Injectable()
export class CatalogApplicationService {
  private readonly logger = new Logger(CatalogApplicationService.name);

  private readonly inFlightPlaceableProcessing = new Map<
    string,
    Promise<PlaceableProcessingEnvelope>
  >();

  private readonly inFlightTemplateProcessing = new Map<
    string,
    Promise<TemplateProcessingEnvelope>
  >();
  private readonly inFlightDerivedPlaceableModelAssets = new Map<
    string,
    Promise<DerivedPlaceableModelGenerationResult>
  >();

  private moduleSnapshotIndexCache:
    | {
        key: string;
        index: ModuleSnapshotIndex;
        fetchedAtMs: number;
      }
    | null = null;
  private moduleSnapshotIndexFailureCache:
    | {
        expiresAtMs: number;
      }
    | null = null;
  private readonly inFlightModuleSnapshotIndex = new Map<
    string,
    Promise<ModuleSnapshotIndex | null>
  >();
  private moduleHashProbeCache:
    | {
        value: string | undefined;
        fetchedAtMs: number;
      }
    | null = null;
  private moduleHashProbeInFlight: Promise<string | undefined> | null = null;
  private readonly templateByIdCache = new Map<string, TemplateLookupCacheEntry>();
  private readonly templateByResrefCache = new Map<string, TemplateLookupCacheEntry>();
  private readonly templateListCache = new Map<string, TemplateListCacheEntry>();
  private readonly templateListInFlight = new Map<string, Promise<TemplateListResult>>();
  private readonly placeableManifestValidationCache = new Map<
    string,
    PlaceableManifestValidationEntry
  >();
  private readonly moduleBlobObjectCache = new Map<string, ModuleBlobObjectCacheEntry>();
  private readonly inFlightModuleBlobObjectReads = new Map<
    string,
    Promise<ModuleBlobObjectPayload | null>
  >();
  private readonly placeableBatchProcessWaitQueue: Array<() => void> = [];
  private moduleBlobObjectCacheBytes = 0;
  private placeableBatchProcessActiveCount = 0;
  private readonly templateLookupCacheMaxEntries: number;
  private readonly manifestValidationCacheMaxEntries: number;

  constructor(
    @Inject(TEMPLATE_CATALOG_REPOSITORY)
    private readonly repository: TemplateCatalogRepositoryPort,
    @Inject(PLACEABLE_PROCESSING_CACHE)
    private readonly placeableCache: PlaceableProcessingCachePort,
    private readonly appConfig?: AppConfigService,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository?: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage?: ModuleBlobStoragePort,
    @Optional()
    @Inject(DERIVED_ASSET_GENERATOR)
    private readonly derivedAssetGenerator?: DerivedAssetGeneratorPort
  ) {
    const configuredBase =
      this.appConfig?.processingCacheL1CatalogMaxEntries ??
      DEFAULT_TEMPLATE_LOOKUP_CACHE_MAX_ENTRIES;
    this.templateLookupCacheMaxEntries = Math.max(500, configuredBase * 2);
    this.manifestValidationCacheMaxEntries = Math.max(1000, configuredBase * 4);
  }

  private logPlaceablePipelineStep(
    step: string,
    startedAtMs: number,
    details: Record<string, string | number | boolean | null | undefined> = {}
  ): void {
    this.logger.log(
      JSON.stringify({
        event: "placeablePipelineStep",
        step,
        elapsedMs: Math.round(Date.now() - startedAtMs),
        ...details
      })
    );
  }

  listPlaceables(query: TemplateListQuery) {
    return this.listTemplatesByKind("placeable", query);
  }

  listTemplateKind<TKind extends TemplateProcessingKind>(
    kind: TKind,
    query: TemplateListQuery
  ) {
    return this.listTemplatesByKind(kind, query);
  }

  listCreatures(query: TemplateListQuery) {
    return this.listTemplateKind("creature", query);
  }

  async listCreatureResourceOptions(input: {
    kind: CreatureResourceOptionKind;
    query?: string;
    limit: number;
  }): Promise<CreatureResourceOptionsResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return { kind: input.kind, items: [], total: 0 };
    }

    const settings = await this.runtimeSettingsRepository.get();
    const snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
    const candidates =
      input.kind === "soundset"
        ? await this.listCreatureSoundSetOptions(snapshot, settings)
        : this.listCreatureSnapshotResourceOptions(snapshot, input.kind);
    const query = input.query?.trim().toLowerCase() ?? "";
    const filtered = query.length === 0
      ? candidates
      : candidates.filter(
          (entry) =>
            entry.resRef.toLowerCase().includes(query) || entry.label.toLowerCase().includes(query)
        );
    const items = filtered
      .sort((left, right) =>
        left.label.localeCompare(right.label) || left.resRef.localeCompare(right.resRef)
      )
      .slice(0, input.limit);
    return { kind: input.kind, items, total: filtered.length };
  }

  listItems(query: TemplateListQuery) {
    return this.listTemplateKind("item", query);
  }

  listEncounters(query: TemplateListQuery) {
    return this.listTemplateKind("encounter", query);
  }

  listStores(query: TemplateListQuery) {
    return this.listTemplatesByKind("store", query);
  }

  private listTemplatesByKind(
    kind: TemplateKind,
    query: TemplateListQuery
  ): Promise<TemplateListResult> {
    const cacheKey = buildTemplateListCacheKey(kind, query);
    const now = Date.now();
    const cached = this.templateListCache.get(cacheKey);
    if (cached && cached.expiresAtMs > now) {
      this.templateListCache.delete(cacheKey);
      this.templateListCache.set(cacheKey, cached);
      return Promise.resolve(cached.result);
    }
    if (cached) {
      this.templateListCache.delete(cacheKey);
    }

    const inFlight = this.templateListInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const request = this.repository
      .listByKind(kind, query)
      .then((result) => this.withTemplateListPreviewImageUrls(kind, result))
      .then((result) => this.withTemplateListItemModelMetadata(kind, result))
      .then((result) => {
        this.templateListCache.set(cacheKey, {
          result,
          expiresAtMs: Date.now() + TEMPLATE_LIST_CACHE_TTL_MS
        });
        this.pruneOverflow(this.templateListCache, DEFAULT_TEMPLATE_LIST_CACHE_MAX_ENTRIES);
        return result;
      })
      .finally(() => {
        this.templateListInFlight.delete(cacheKey);
      });
    this.templateListInFlight.set(cacheKey, request);
    return request;
  }

  async getPlaceablePreview(templateId: string) {
    return this.getPreviewByKind("placeable", templateId);
  }

  async getPlaceableThumbnail(templateId: string) {
    const template = await this.repository.findByKindAndId("placeable", templateId);
    if (!template) {
      throw new AppException({
        status: 404,
        code: "TEMPLATE_NOT_FOUND",
        message: "placeable template was not found."
      });
    }

    return buildPlaceableThumbnailPayload(template);
  }

  async getTemplateKindPreview<TKind extends TemplateProcessingKind>(
    kind: TKind,
    templateId: string
  ) {
    return this.getPreviewByKind(kind, templateId);
  }

  async getCreaturePreview(templateId: string) {
    return this.getTemplateKindPreview("creature", templateId);
  }

  async getItemPreview(templateId: string) {
    return this.getTemplateKindPreview("item", templateId);
  }

  async getEncounterPreview(templateId: string) {
    return this.getTemplateKindPreview("encounter", templateId);
  }

  async getStorePreview(templateId: string) {
    return this.getPreviewByKind("store", templateId);
  }

  async processPlaceable(
    query: PlaceableProcessQuery,
    options: PlaceableProcessingOptions = {}
  ) {
    try {
      return await this.processPlaceableCore(query, options);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException({
        status: 500,
        code: "PLACEABLE_PROCESS_UNEXPECTED",
        message: "Unexpected placeable processing failure.",
        details: [
          {
            path: "processPlaceable",
            reason: formatUnexpectedError(error)
          }
        ]
      });
    }
  }

  private async processPlaceableCore(
    query: PlaceableProcessQuery,
    options: PlaceableProcessingOptions = {}
  ) {
    const template = await this.resolvePlaceableTemplate(query);
    const areaInstanceSubtypeForClassification = isAreaInstanceRenderQuery(query)
      ? resolveAreaInstanceRenderSubtype(query, template.placeableSubtype)
      : null;
    const templateSubtypeForClassification =
      areaInstanceSubtypeForClassification ?? template.placeableSubtype;
    const classification = resolvePlaceableClassification(
      templateSubtypeForClassification,
      query.subtypeHint
    );
    const instanceRenderMetadata = await this.resolveAreaInstancePlaceableRenderMetadata(
      query,
      classification.normalizedSubtype,
      template
    );
    const metadata = {
      ...template.metadata,
      ...instanceRenderMetadata.metadata
    };
    const instanceFingerprint = buildAreaInstanceRenderFingerprint(
      query,
      classification.normalizedSubtype
    );
    const areaInstanceRenderCacheIdentity = buildAreaInstanceRenderCacheIdentity(
      query,
      classification.normalizedSubtype,
      metadata
    );
    const areaInstanceRenderFactsCacheIdentity =
      areaInstanceRenderCacheIdentity?.identityKind === "model"
        ? buildAreaInstanceRenderFactsCacheIdentity(query, classification.normalizedSubtype)
        : null;
    const cacheTemplateId = areaInstanceRenderCacheIdentity?.templateId ?? template.templateId;
    const cacheResRef = areaInstanceRenderCacheIdentity?.resref ?? template.resref;
    const cacheFingerprintBase =
      areaInstanceRenderCacheIdentity?.fingerprint ?? instanceFingerprint ?? "stable";
    const cacheFingerprint = buildPlaceableProcessCacheFingerprint(
      cacheFingerprintBase,
      options
    );
    const cacheKey =
      (areaInstanceRenderCacheIdentity ||
      instanceFingerprint ||
      !isDefaultPlaceableProcessingOptions(options)
        ? null
        : this.repository.getPrecomputedPlaceableCacheKey?.(
            template.templateId,
            classification.normalizedSubtype
          )) ??
      buildPlaceableProcessCacheKey(
        cacheTemplateId,
        cacheResRef,
        classification.normalizedSubtype,
        cacheFingerprint
      );
    const areaInstanceLegacyCacheKeys = dedupeText([
      areaInstanceRenderCacheIdentity && instanceFingerprint
        ? buildPlaceableProcessCacheKey(
            template.templateId,
            template.resref,
            classification.normalizedSubtype,
            buildPlaceableProcessCacheFingerprint(instanceFingerprint, options)
          )
        : undefined,
      areaInstanceRenderFactsCacheIdentity
        ? buildPlaceableProcessCacheKey(
            areaInstanceRenderFactsCacheIdentity.templateId,
            areaInstanceRenderFactsCacheIdentity.resref,
            classification.normalizedSubtype,
            buildPlaceableProcessCacheFingerprint(
              areaInstanceRenderFactsCacheIdentity.fingerprint,
              options
            )
          )
        : undefined
    ]).filter((legacyCacheKey) => legacyCacheKey !== cacheKey);

    if (!query.bypassCache) {
      const cached = await this.placeableCache.get<PlaceableProcessingResult>(cacheKey);
      if (cached) {
        const hydrated = await this.ensurePlaceableManifest(cacheKey, cached.value);
        const rebound = await this.rebindAreaInstancePlaceableResultForCacheKey(
          cacheKey,
          query,
          template,
          metadata,
          classification,
          hydrated
        );
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          placeable: maybeStripBenchmarkMetadata(rebound, query.includeBenchmarkMetadata)
        };
      }

      for (const legacyCacheKey of areaInstanceLegacyCacheKeys) {
        const legacyCached = await this.placeableCache.get<PlaceableProcessingResult>(
          legacyCacheKey
        );
        if (legacyCached) {
          const hydrated = await this.ensurePlaceableManifest(cacheKey, legacyCached.value);
          const rebound = await this.rebindAreaInstancePlaceableResultForCacheKey(
            cacheKey,
            query,
            template,
            metadata,
            classification,
            hydrated
          );
          const stored = await this.placeableCache.set<PlaceableProcessingResult>(
            cacheKey,
            rebound
          );
          this.rememberManifestValidation(cacheKey, rebound.assetManifest.moduleHash);
          return {
            cache: {
              key: cacheKey,
              hit: true,
              storedAt: stored.storedAt,
              hits: stored.hits
            },
            placeable: maybeStripBenchmarkMetadata(rebound, query.includeBenchmarkMetadata)
          };
        }
      }
    }

    const processMiss = async (): Promise<PlaceableProcessingEnvelope> => {
      const missStartedAtMs = Date.now();
      const placeableRuntime = buildPlaceableRuntimeProjection(metadata);
      const placeableValidationIssues = buildPlaceableValidationIssues(placeableRuntime);
      const areaInstanceMissingModel = isAreaInstanceMissingRenderableModel(metadata);
      const assetManifest = areaInstanceMissingModel
        ? buildEmptyPlaceableAssetManifest()
        : await this.buildPlaceableAssetManifest({
            templateId: template.templateId,
            resref: template.resref,
            subtype: classification.normalizedSubtype,
            metadata,
            processingOptions: options
          });
      this.logPlaceablePipelineStep("processPlaceable.assetManifest", missStartedAtMs, {
        cacheKey,
        templateId: template.templateId,
        resref: template.resref,
        subtype: classification.normalizedSubtype,
        areaInstance: Boolean(areaInstanceRenderCacheIdentity),
        assetCount: assetManifest.assetCount,
        candidatesScanned: assetManifest.candidatesScanned
      });
      const renderPackage = areaInstanceMissingModel
        ? buildAreaInstanceMissingModelRenderPackage(metadata)
        : await this.buildPlaceableRenderPackageForCacheEntry(
            cacheKey,
            assetManifest,
            classification.normalizedSubtype,
            metadata
          );
      this.logPlaceablePipelineStep("processPlaceable.renderPackage", missStartedAtMs, {
        cacheKey,
        templateId: template.templateId,
        resref: template.resref,
        subtype: classification.normalizedSubtype,
        status: renderPackage.status
      });

      const processed: PlaceableProcessingResult = {
        templateId: template.templateId,
        resref: template.resref,
        name: template.name,
        category: template.category,
        placeableSubtype: classification.normalizedSubtype,
        render: buildRenderContract(classification.normalizedSubtype),
        benchmarkCandidate: template.benchmarkCandidate ?? false,
        benchmarkBucket: template.benchmarkBucket,
        metadata,
        placeableRuntime,
        placeableValidationIssues,
        assetManifest,
        renderPackage,
        classification,
        processedAt: new Date().toISOString()
      };

      const stored = await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, processed);
      this.rememberManifestValidation(cacheKey, processed.assetManifest.moduleHash);
      this.logPlaceablePipelineStep("processPlaceable.cacheStore", missStartedAtMs, {
        cacheKey,
        templateId: template.templateId,
        resref: template.resref,
        subtype: classification.normalizedSubtype,
        storedHits: stored.hits
      });
      return {
        cache: {
          key: cacheKey,
          hit: false,
          storedAt: stored.storedAt,
          hits: stored.hits
        },
        placeable: processed
      };
    };

    const result = await executeInFlight(
      this.inFlightPlaceableProcessing,
      cacheKey,
      processMiss
    );

    const rebound = await this.rebindAreaInstancePlaceableResultForCacheKey(
      cacheKey,
      query,
      template,
      metadata,
      classification,
      result.placeable
    );

    return {
      cache: result.cache,
      placeable: maybeStripBenchmarkMetadata(
        rebound,
        query.includeBenchmarkMetadata
      )
    };
  }

  async processPlaceablesBatch(queries: PlaceableProcessQuery[]) {
    const batchStartedAtMs = Date.now();
    const results: Awaited<ReturnType<CatalogApplicationService["processPlaceable"]>>[] = [];
    const groupsByKey = new Map<
      string,
      {
        query: PlaceableProcessQuery;
        queries: PlaceableProcessQuery[];
        indexes: number[];
      }
    >();

    const keyedQueries = await Promise.all(
      queries.map(async (query, index) => ({
        query,
        index,
        key: await this.resolvePlaceableBatchRenderFactsKey(query)
      }))
    );
    this.logPlaceablePipelineStep("processPlaceablesBatch.resolveKeys", batchStartedAtMs, {
      queryCount: queries.length
    });

    keyedQueries.forEach(({ query, index, key }) => {
      const existing = groupsByKey.get(key);
      if (existing) {
        existing.queries.push(query);
        existing.indexes.push(index);
        return;
      }
      groupsByKey.set(key, {
        query,
        queries: [query],
        indexes: [index]
      });
    });

    const groups = [...groupsByKey.values()];
    this.logPlaceablePipelineStep("processPlaceablesBatch.group", batchStartedAtMs, {
      queryCount: queries.length,
      groupCount: groups.length
    });
    let cursor = 0;
    const workerCount = Math.min(PLACEABLE_PROCESS_BATCH_GLOBAL_CONCURRENCY, groups.length);

    const runWorker = async () => {
      while (cursor < groups.length) {
        const index = cursor;
        cursor += 1;
        const group = groups[index];
        if (!group) {
          continue;
        }
        const shouldGenerateAreaInstanceModel = isAreaInstanceRenderQuery(group.query);
        const result = await this.withPlaceableBatchProcessSlot(() =>
          this.processPlaceable(group.query, {
            allowOnDemandDerivedModelGeneration: shouldGenerateAreaInstanceModel,
            allowExpensiveSourceReferenceScans: false,
            allowOnDemandTextureLookup: true
          })
        );
        for (let indexInGroup = 0; indexInGroup < group.indexes.length; indexInGroup += 1) {
          const queryIndex = group.indexes[indexInGroup];
          const query = group.queries[indexInGroup];
          if (queryIndex === undefined || !query) {
            continue;
          }
          results[queryIndex] = await this.rebindAreaInstanceBatchResult(query, result);
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    this.logPlaceablePipelineStep("processPlaceablesBatch.complete", batchStartedAtMs, {
      queryCount: queries.length,
      groupCount: groups.length,
      workerCount
    });
    return { items: results };
  }

  private async resolvePlaceableBatchRenderFactsKey(
    query: PlaceableProcessQuery
  ): Promise<string> {
    const areaInstanceRenderModelKey = await this.resolveAreaInstanceBatchRenderModelKey(query);
    if (areaInstanceRenderModelKey) {
      return [
        AREA_INSTANCE_PLACEABLE_BATCH_CACHE_KEY_VERSION,
        areaInstanceRenderModelKey,
        query.bypassCache === true ? "bypass" : "cache",
        query.includeBenchmarkMetadata === false ? "benchmark-stripped" : "benchmark-included"
      ].join("|");
    }
    return buildPlaceableBatchRenderFactsKey(query);
  }

  private async resolveAreaInstanceBatchRenderModelKey(
    query: PlaceableProcessQuery
  ): Promise<string | null> {
    if (!isAreaInstanceRenderQuery(query)) {
      return null;
    }

    const subtype = resolveAreaInstanceRenderSubtype(query);
    if (subtype === "light_source" && isAreaInstanceLightNodeHelperQuery(query)) {
      return null;
    }

    if (subtype === "door") {
      const lookup = await this.repository.resolveDoorAppearanceModel?.({
        appearanceType: query.appearanceType,
        genericType: query.genericType,
        templateId: query.templateId,
        resref: query.resref
      });
      return buildAreaInstanceRenderModelFactsKey(lookup?.modelResRef, subtype);
    }

    if (!Number.isInteger(query.appearanceType ?? Number.NaN) || query.appearanceType === undefined) {
      return null;
    }

    const lookup = await this.repository.resolvePlaceableAppearanceModel?.(
      Math.trunc(query.appearanceType),
      buildPlaceableAppearanceLookupContext(query)
    );
    return buildAreaInstanceRenderModelFactsKey(lookup?.modelResRef, subtype);
  }

  private async rebindAreaInstanceBatchResult(
    query: PlaceableProcessQuery,
    result: PlaceableProcessingEnvelope
  ): Promise<PlaceableProcessingEnvelope> {
    if (!isAreaInstanceRenderQuery(query)) {
      return result;
    }

    const template = await this.resolvePlaceableTemplate(query);
    const areaInstanceSubtypeForClassification = resolveAreaInstanceRenderSubtype(
      query,
      template.placeableSubtype
    );
    const classification = resolvePlaceableClassification(
      areaInstanceSubtypeForClassification,
      query.subtypeHint
    );
    const instanceRenderMetadata = await this.resolveAreaInstancePlaceableRenderMetadata(
      query,
      classification.normalizedSubtype,
      template
    );
    const metadata = {
      ...template.metadata,
      ...instanceRenderMetadata.metadata
    };

    return {
      cache: result.cache,
      placeable: maybeStripBenchmarkMetadata(
        await this.rebindAreaInstancePlaceableResultForCacheKey(
          result.cache.key,
          query,
          template,
          metadata,
          classification,
          result.placeable
        ),
        query.includeBenchmarkMetadata
      )
    };
  }

  private async withPlaceableBatchProcessSlot<T>(work: () => Promise<T>): Promise<T> {
    await this.acquirePlaceableBatchProcessSlot();
    try {
      return await work();
    } finally {
      this.releasePlaceableBatchProcessSlot();
    }
  }

  private acquirePlaceableBatchProcessSlot(): Promise<void> {
    if (this.placeableBatchProcessActiveCount < PLACEABLE_PROCESS_BATCH_GLOBAL_CONCURRENCY) {
      this.placeableBatchProcessActiveCount += 1;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.placeableBatchProcessWaitQueue.push(resolve);
    });
  }

  private releasePlaceableBatchProcessSlot() {
    const next = this.placeableBatchProcessWaitQueue.shift();
    if (next) {
      next();
      return;
    }
    this.placeableBatchProcessActiveCount = Math.max(0, this.placeableBatchProcessActiveCount - 1);
  }

  private async resolveAreaInstancePlaceableRenderMetadata(
    query: PlaceableProcessQuery,
    subtype: PlaceableSubtype,
    template: TemplateRecord
  ): Promise<{ metadata: Record<string, string | number | boolean> }> {
    const appearanceType =
      Number.isInteger(query.appearanceType ?? Number.NaN) && query.appearanceType !== undefined
        ? query.appearanceType
        : undefined;
    const genericType =
      Number.isInteger(query.genericType ?? Number.NaN) && query.genericType !== undefined
        ? query.genericType
        : undefined;
    if (appearanceType === undefined && genericType === undefined) {
      return { metadata: {} };
    }

    const baseMetadata: Record<string, string | number | boolean> = {
      areaInstanceRenderSource: "git",
      areaInstanceModelLookupStatus: "blocked",
      ...(query.tag ? { areaInstanceTag: query.tag } : {}),
      ...(query.localizedName ? { areaInstanceLocalizedName: query.localizedName } : {}),
      ...(query.description ? { areaInstanceDescription: query.description } : {}),
      ...(appearanceType !== undefined ? { appearanceId: appearanceType, areaInstanceAppearanceType: appearanceType } : {}),
      ...(genericType !== undefined ? { genericType, areaInstanceGenericType: genericType } : {})
    };

    if (subtype === "light_source" && isAreaInstanceLightNodeHelperQuery(query)) {
      return {
        metadata: {
          ...baseMetadata,
          areaInstanceModelLookupStatus: "blocked",
          areaInstanceHelperRenderSuppressed: true,
          areaInstanceHelperKind: "light_node",
          lookupDependencyRefs: dedupeText([template.resref, query.tag]).join("|"),
          lookupDependencyCount: dedupeText([template.resref, query.tag]).length
        }
      };
    }

    if (subtype === "door") {
      const lookup = await this.repository.resolveDoorAppearanceModel?.({
        appearanceType,
        genericType,
        templateId: template.templateId,
        resref: template.resref
      });
      if (!lookup) {
        return { metadata: baseMetadata };
      }
      return {
        metadata: {
          ...baseMetadata,
          areaInstanceModelLookupStatus: lookup.modelResRef ? "ready" : "blocked",
          doorLookupPath: "git-instance-appearance-generic-type>doortypes2da>genericdoors2da>modelAsset",
          doortypes2daAvailable: lookup.doortypesAvailable,
          genericdoors2daAvailable: lookup.genericdoorsAvailable,
          ...(lookup.doortypesSourceKey ? { doortypes2daSource: "doortypes.2da", doortypes2daSourceKey: lookup.doortypesSourceKey } : {}),
          ...(lookup.doortypesRowId !== undefined ? { doortypes2daRow: lookup.doortypesRowId } : {}),
          ...(lookup.doortypesLabel ? { doortypes2daLabel: lookup.doortypesLabel } : {}),
          ...(lookup.doortypesModelResRef ? { doortypes2daModelResRef: lookup.doortypesModelResRef } : {}),
          ...(lookup.genericdoorsSourceKey ? { genericdoors2daSource: "genericdoors.2da", genericdoors2daSourceKey: lookup.genericdoorsSourceKey } : {}),
          ...(lookup.genericdoorsRowId !== undefined ? { genericdoors2daRow: lookup.genericdoorsRowId } : {}),
          ...(lookup.genericdoorsLabel ? { genericdoors2daLabel: lookup.genericdoorsLabel } : {}),
          ...(lookup.genericdoorsModelResRef ? { genericdoors2daModelResRef: lookup.genericdoorsModelResRef } : {}),
          ...(lookup.modelResRef
            ? {
                modelResRef: lookup.modelResRef,
                lookupModelResRef: lookup.modelResRef,
                doorLookupModelResRef: lookup.modelResRef,
                lookupDependencyRefs: dedupeText([template.resref, lookup.modelResRef]).join("|"),
                lookupDependencyCount: dedupeText([template.resref, lookup.modelResRef]).length
              }
            : {})
        }
      };
    }

    if (appearanceType === undefined) {
      return { metadata: baseMetadata };
    }
    const lookup = await this.repository.resolvePlaceableAppearanceModel?.(
      appearanceType,
      buildPlaceableAppearanceLookupContext(query)
    );
    if (!lookup) {
      return { metadata: baseMetadata };
    }
    const dependencyRefs = dedupeText([template.resref, lookup.modelResRef]);
    return {
      metadata: {
        ...baseMetadata,
        areaInstanceModelLookupStatus: "ready",
        sourceKind: "2da",
        source2da: lookup.source2da,
        source2daRow: lookup.rowId,
        ...(lookup.sourceKey ? { source2daSourceKey: lookup.sourceKey } : {}),
        ...(lookup.requestedRowId !== undefined ? { lookupRequestedAppearanceType: lookup.requestedRowId } : {}),
        ...(lookup.resolutionPath ? { lookupResolutionPath: lookup.resolutionPath } : {}),
        modelResRef: lookup.modelResRef,
        lookupModelResRef: lookup.modelResRef,
        lookupTemplateResRef: template.resref,
        lookupDependencyRefs: dependencyRefs.join("|"),
        lookupDependencyCount: dependencyRefs.length
      }
    };
  }

  private rebindAreaInstancePlaceableResult(
    query: PlaceableProcessQuery,
    template: TemplateRecord,
    metadata: Record<string, string | number | boolean>,
    classification: PlaceableProcessingResult["classification"],
    value: PlaceableProcessingResult
  ): PlaceableProcessingResult {
    if (!isAreaInstanceRenderQuery(query)) {
      return value;
    }

    const placeableRuntime = buildPlaceableRuntimeProjection(metadata);
    return {
      ...value,
      templateId: template.templateId,
      resref: template.resref,
      name: template.name,
      category: template.category,
      placeableSubtype: classification.normalizedSubtype,
      render: buildRenderContract(classification.normalizedSubtype),
      benchmarkCandidate: template.benchmarkCandidate ?? false,
      benchmarkBucket: template.benchmarkBucket,
      metadata,
      placeableRuntime,
      placeableValidationIssues: buildPlaceableValidationIssues(placeableRuntime),
      classification,
      processedAt: new Date().toISOString()
    };
  }

  private async rebindAreaInstancePlaceableResultForCacheKey(
    cacheKey: string,
    query: PlaceableProcessQuery,
    template: TemplateRecord,
    metadata: Record<string, string | number | boolean>,
    classification: PlaceableProcessingResult["classification"],
    value: PlaceableProcessingResult
  ): Promise<PlaceableProcessingResult> {
    const rebound = this.rebindAreaInstancePlaceableResult(
      query,
      template,
      metadata,
      classification,
      value
    );
    if (
      !isAreaInstanceRenderQuery(query) ||
      !this.shouldRefreshManifestForExactModelLookupMismatch(rebound)
    ) {
      return rebound;
    }

    return this.ensurePlaceableManifest(cacheKey, rebound);
  }

  async getProcessedPlaceable(cacheKey: string) {
    const cached = await this.placeableCache.get<PlaceableProcessingResult>(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_CACHE_NOT_FOUND",
        message: "Placeable cache entry was not found."
      });
    }

    const hydrated = await this.ensurePlaceableManifest(cacheKey, cached.value);

    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      placeable: hydrated
    };
  }

  async getProcessedPlaceableAsset(
    cacheKey: string,
    assetId: string
  ): Promise<PlaceableAssetBlobEnvelope> {
    const cached =
      await this.placeableCache.get<PlaceableProcessingResult | TemplateProcessingResult>(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_CACHE_NOT_FOUND",
        message: "Placeable cache entry was not found."
      });
    }

    const hydrated = await this.ensureCachedAssetManifestForDelivery(cacheKey, cached.value);
    const normalizedAssetId = assetId.trim().toLowerCase();
    const asset = hydrated.assetManifest.assets.find(
      (entry) => entry.assetId.toLowerCase() === normalizedAssetId
    );
    if (!asset) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_ASSET_NOT_FOUND",
        message: "Placeable asset was not found in cached manifest."
      });
    }

    const payload = await this.readModuleBlobObject(asset.objectKey);
    if (!payload) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_ASSET_BLOB_NOT_FOUND",
        message: "Placeable asset blob object was not found."
      });
    }

    const deliveryPayload = normalizePlaceableAssetPayloadForDelivery(asset, payload);

    return {
      cacheKey,
      asset,
      moduleHash: hydrated.assetManifest.moduleHash,
      payload: deliveryPayload
    };
  }

  async getProcessedPlaceableAssetDelivery(
    cacheKey: string,
    assetIds?: string[]
  ): Promise<PlaceableAssetDeliveryEnvelope> {
    const cached =
      await this.placeableCache.get<PlaceableProcessingResult | TemplateProcessingResult>(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_CACHE_NOT_FOUND",
        message: "Placeable cache entry was not found."
      });
    }

    const hydrated = await this.ensureCachedAssetManifestForDelivery(cacheKey, cached.value);
    const selectedAssets = this.selectAssetsForDelivery(
      hydrated.assetManifest.assets,
      assetIds
    );
    const blobSettings = await this.getBlobStorageSettings();

    return {
      cacheKey,
      moduleHash: hydrated.assetManifest.moduleHash,
      assets: selectedAssets.map((asset) => {
        const deliveryPath = buildPlaceableAssetDeliveryPath(cacheKey, asset);
        const directDeliveryUrl =
          blobSettings && !this.appConfig?.hostLocalRuntime
            ? buildBrowserDirectBlobObjectDeliveryUrl(blobSettings, asset.objectKey)
            : null;
        return {
          assetId: asset.assetId,
          objectKey: asset.objectKey,
          contentType: asset.contentType,
          sizeBytes: asset.sizeBytes,
          deliveryPath,
          deliveryUrl: directDeliveryUrl ?? deliveryPath,
          s3Url: blobSettings ? buildS3ObjectUrl(blobSettings.bucket, asset.objectKey) : undefined
        };
      })
    };
  }

  async getProcessedPlaceableAssetDeliveryBatch(
    queries: PlaceableAssetDeliveryBatchQuery[]
  ): Promise<PlaceableAssetDeliveryBatchEnvelope> {
    const results: PlaceableAssetDeliveryEnvelope[] = [];
    let cursor = 0;
    const workerCount = Math.min(8, queries.length);

    const runWorker = async () => {
      while (cursor < queries.length) {
        const index = cursor;
        cursor += 1;
        const query = queries[index];
        if (!query) {
          continue;
        }
        try {
          results[index] = await this.getProcessedPlaceableAssetDelivery(
            query.cacheKey,
            query.assetIds
          );
        } catch (error) {
          if (isNotFoundAppException(error)) {
            results[index] = {
              cacheKey: query.cacheKey,
              assets: []
            };
            continue;
          }
          throw error;
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    this.primePlaceableAssetBlobCache(results);
    return { items: results };
  }

  async getPlaceableViewportRenderPayloadBatch(
    queries: PlaceableProcessQuery[]
  ): Promise<PlaceableViewportRenderPayloadBatchEnvelope> {
    const batchStartedAtMs = Date.now();
    const processedBatch = await this.processPlaceablesBatch(queries);
    this.logPlaceablePipelineStep("renderPayloadBatch.processPlaceables", batchStartedAtMs, {
      queryCount: queries.length,
      processedCount: processedBatch.items.length
    });
    const assetContractQueriesByCacheKey = new Map<string, { cacheKey: string }>();
    processedBatch.items.forEach((item) => {
      const cacheKey = item.cache.key;
      if (!assetContractQueriesByCacheKey.has(cacheKey)) {
        assetContractQueriesByCacheKey.set(cacheKey, { cacheKey });
      }
    });
    const assetContractsBatch = await this.getProcessedPlaceableAssetDeliveryBatch(
      [...assetContractQueriesByCacheKey.values()]
    );
    this.logPlaceablePipelineStep("renderPayloadBatch.assetContracts", batchStartedAtMs, {
      queryCount: queries.length,
      cacheKeyCount: assetContractQueriesByCacheKey.size,
      assetContractCount: assetContractsBatch.items.length
    });
    const assetContractsByCacheKey = new Map(
      assetContractsBatch.items.map((item) => [item.cacheKey, item])
    );

    const envelope = {
      items: processedBatch.items.map((item) => {
        const cacheKey = item.cache.key;
        return {
          templateId: item.placeable.templateId,
          cacheKey,
          cacheHit: item.cache.hit,
          storedAt: item.cache.storedAt,
          hits: item.cache.hits,
          placeable: item.placeable,
          renderPackage: item.placeable.renderPackage,
          assetContracts: assetContractsByCacheKey.get(cacheKey) ?? {
            cacheKey,
            assets: []
          }
        };
      })
    };
    this.logPlaceablePipelineStep("renderPayloadBatch.complete", batchStartedAtMs, {
      queryCount: queries.length,
      itemCount: envelope.items.length
    });
    return envelope;
  }

  async processCreature(query: TemplateProcessQuery) {
    return this.processTemplateKind("creature", query);
  }

  async getProcessedCreature(cacheKey: string) {
    return this.getProcessedTemplateKind("creature", cacheKey);
  }

  async processItem(query: TemplateProcessQuery) {
    return this.processTemplateKind("item", query);
  }

  async getProcessedItem(cacheKey: string) {
    return this.getProcessedTemplateKind("item", cacheKey);
  }

  async processEncounter(query: TemplateProcessQuery) {
    return this.processTemplateKind("encounter", query);
  }

  async getProcessedEncounter(cacheKey: string) {
    return this.getProcessedTemplateKind("encounter", cacheKey);
  }

  async processTemplateKind<TKind extends TemplateProcessingKind>(
    kind: TKind,
    query: TemplateProcessQuery
  ): Promise<TemplateProcessingResultByKind<TKind>> {
    const data = await this.processTemplateByKind(kind, query);
    return this.mapTemplateResultByKind(kind, data);
  }

  async createCreatureBlueprint(
    command: CreatureBlueprintCreateCommand,
    preservation?: {
      fields: import("../adapters/outbound/blob/aurora-gff-uti-writer").SupportedGffField[];
      rootStructTypeId: number;
    }
  ): Promise<CreatureBlueprintCreateResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.putModuleObject) {
      throw new AppException({
        status: 503,
        code: "CREATURE_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for creature blueprint creation."
      });
    }

    const resref = normalizeCreatureBlueprintResref(command.templateResRef);
    const fileName = `${resref}.utc`;
    const bytes = serializeCreatureBlueprintToUtcGff(
      buildSerializableCreatureBlueprintFromCreateCommand(command, resref),
      preservation
    );
    const blueprint = parseTemplateBlueprintFromGff(bytes);
    if (!blueprint || blueprint.sourceFileType !== "UTC ") {
      throw new AppException({
        status: 500,
        code: "CREATURE_BLUEPRINT_SERIALIZATION_FAILED",
        message: "Created creature blueprint could not be parsed as UTC GFF."
      });
    }

    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${fileName}`;
    if (!command.overwrite) {
      const existing = await this.moduleBlobStorage.getModuleObject(
        settings.blobStorage,
        objectKey
      );
      if (existing) {
        throw new AppException({
          status: 409,
          code: "CREATURE_BLUEPRINT_ALREADY_EXISTS",
          message: `Creature blueprint '${resref}' already exists in module storage.`
        });
      }
    }

    const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, {
      fileName,
      resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTC,
      bytes
    });
    this.invalidateTemplateSnapshotCaches();

    const template = this.buildCreatedCreatureTemplateRecord({
      resref,
      stored,
      blueprint,
      requestedName: command.name
    });
    this.cacheTemplateLookup(template);

    const processed = await this.processTemplateRecordByKind(
      "creature",
      {
        templateId: template.templateId,
        resref,
        bypassCache: true,
        includeBenchmarkMetadata: true
      },
      template
    );
    const result = this.mapTemplateResultByKind("creature", processed);
    return {
      blueprint: {
        templateId: template.templateId,
        resref,
        name: template.name,
        objectKey: stored.key,
        sizeBytes: stored.size,
        ...(stored.etag ? { etag: stored.etag } : {}),
        sourceFileType: blueprint.sourceFileType,
        sourceFileVersion: blueprint.sourceFileVersion
      },
      ...result
    };
  }

  async updateCreatureBlueprint(
    resRef: string,
    command: CreatureBlueprintCreateCommand
  ): Promise<CreatureBlueprintCreateResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.putModuleObject) {
      throw new AppException({
        status: 503,
        code: "CREATURE_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for creature blueprint updates."
      });
    }

    const normalizedResref = normalizeCreatureBlueprintResref(resRef);
    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${normalizedResref}.utc`;
    const existing = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, objectKey);
    if (!existing) {
      throw new AppException({
        status: 404,
        code: "CREATURE_BLUEPRINT_NOT_FOUND",
        message: `Creature blueprint '${normalizedResref}' was not found in module storage.`
      });
    }

    const preserved = parseRawGffDocument(existing.bytes);
    if (!preserved || preserved.fileType !== "UTC ") {
      throw new AppException({
        status: 422,
        code: "CREATURE_BLUEPRINT_PRESERVE_UNAVAILABLE",
        message:
          "Creature blueprint could not be read losslessly, so Aurora Web refused an update that could discard its GFF fields."
      });
    }

    return this.createCreatureBlueprint({
      ...command,
      templateResRef: normalizedResref,
      overwrite: true
    }, {
      fields: preserved.fields,
      rootStructTypeId: preserved.rootStructTypeId
    });
  }

  async renameCreatureBlueprint(
    resRef: string,
    nextResRef: string
  ): Promise<CreatureBlueprintRenameResult> {
    if (
      !this.runtimeSettingsRepository ||
      !this.moduleBlobStorage?.putModuleObject ||
      !this.moduleBlobStorage.deleteModuleObject
    ) {
      throw new AppException({
        status: 503,
        code: "CREATURE_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for creature blueprint rename."
      });
    }

    const previousResRef = normalizeCreatureBlueprintResref(resRef);
    const renamedResRef = normalizeCreatureBlueprintResref(nextResRef);
    if (previousResRef === renamedResRef) {
      throw new AppException({
        status: 422,
        code: "CREATURE_BLUEPRINT_RENAME_NOOP",
        message: "Creature blueprint rename requires a different resref."
      });
    }

    const settings = await this.runtimeSettingsRepository.get();
    const prefix = normalizePrefixForLookup(settings.blobStorage.modulePrefix);
    const previousObjectKey = `${prefix}${previousResRef}.utc`;
    const renamedObjectKey = `${prefix}${renamedResRef}.utc`;
    const existing = await this.moduleBlobStorage.getModuleObject(
      settings.blobStorage,
      previousObjectKey
    );
    if (!existing) {
      throw new AppException({
        status: 404,
        code: "CREATURE_BLUEPRINT_NOT_FOUND",
        message: `Creature blueprint '${previousResRef}' was not found in module storage.`
      });
    }

    const target = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, renamedObjectKey);
    if (target) {
      throw new AppException({
        status: 409,
        code: "CREATURE_BLUEPRINT_ALREADY_EXISTS",
        message: `Creature blueprint '${renamedResRef}' already exists in module storage.`
      });
    }

    const preserved = parseRawGffDocument(existing.bytes);
    if (!preserved || preserved.fileType !== "UTC ") {
      throw new AppException({
        status: 422,
        code: "CREATURE_BLUEPRINT_PRESERVE_UNAVAILABLE",
        message:
          "Creature blueprint could not be read losslessly, so Aurora Web refused a rename that could discard its GFF fields."
      });
    }

    const bytes = serializeCreatureBlueprintToUtcGff(
      { templateResRef: renamedResRef },
      {
        preservedFields: preserved.fields,
        rootStructTypeId: preserved.rootStructTypeId
      }
    );
    const blueprint = parseTemplateBlueprintFromGff(bytes);
    if (!blueprint || blueprint.sourceFileType !== "UTC ") {
      throw new AppException({
        status: 500,
        code: "CREATURE_BLUEPRINT_SERIALIZATION_FAILED",
        message: "Renamed creature blueprint could not be parsed as UTC GFF."
      });
    }

    let stored: ModuleBlobObjectSummary;
    try {
      stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, {
        fileName: `${renamedResRef}.utc`,
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTC,
        bytes
      });
    } catch (error) {
      throw new AppException({
        status: 500,
        code: "CREATURE_BLUEPRINT_RENAME_FAILED",
        message: "Creature blueprint rename could not create the new UTC resource.",
        details: [
          {
            path: "storage.putModuleObject",
            reason: error instanceof Error ? error.message : "Unknown storage failure."
          }
        ]
      });
    }

    try {
      const deleted = await this.moduleBlobStorage.deleteModuleObject(
        settings.blobStorage,
        previousObjectKey
      );
      if (!deleted) {
        throw new Error("Storage reported that the previous UTC resource was not deleted.");
      }
    } catch (error) {
      let rollbackSucceeded = false;
      try {
        rollbackSucceeded = await this.moduleBlobStorage.deleteModuleObject(
          settings.blobStorage,
          renamedObjectKey
        );
      } catch {
        rollbackSucceeded = false;
      }
      this.invalidateTemplateSnapshotCaches();
      throw new AppException({
        status: 500,
        code: rollbackSucceeded
          ? "CREATURE_BLUEPRINT_RENAME_ROLLED_BACK"
          : "CREATURE_BLUEPRINT_RENAME_ROLLBACK_FAILED",
        message: rollbackSucceeded
          ? "Creature blueprint rename was rolled back after the previous UTC could not be deleted."
          : "Creature blueprint rename could not delete the previous UTC and automatic rollback also failed.",
        details: [
          {
            path: "storage.deleteModuleObject",
            reason: error instanceof Error ? error.message : "Unknown storage failure."
          }
        ]
      });
    }

    this.invalidateTemplateSnapshotCaches();
    const template = this.buildCreatedCreatureTemplateRecord({
      resref: renamedResRef,
      stored,
      blueprint,
      requestedName: blueprint.firstName ?? blueprint.localizedName ?? renamedResRef
    });
    this.cacheTemplateLookup(template);
    const processed = await this.processTemplateRecordByKind(
      "creature",
      {
        templateId: template.templateId,
        resref: renamedResRef,
        bypassCache: true,
        includeBenchmarkMetadata: true
      },
      template
    );

    return {
      previousResRef,
      previousObjectKey,
      blueprint: {
        templateId: template.templateId,
        resref: renamedResRef,
        name: template.name,
        objectKey: stored.key,
        sizeBytes: stored.size,
        ...(stored.etag ? { etag: stored.etag } : {}),
        sourceFileType: blueprint.sourceFileType,
        sourceFileVersion: blueprint.sourceFileVersion
      },
      ...this.mapTemplateResultByKind("creature", processed)
    };
  }

  async deleteCreatureBlueprint(resRef: string): Promise<CreatureBlueprintDeleteResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.deleteModuleObject) {
      throw new AppException({
        status: 503,
        code: "CREATURE_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for creature blueprint deletion."
      });
    }

    const normalizedResref = normalizeCreatureBlueprintResref(resRef);
    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${normalizedResref}.utc`;
    const existing = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, objectKey);
    if (!existing) {
      throw new AppException({
        status: 404,
        code: "CREATURE_BLUEPRINT_NOT_FOUND",
        message: `Creature blueprint '${normalizedResref}' was not found in module storage.`
      });
    }

    const deleted = await this.moduleBlobStorage.deleteModuleObject(settings.blobStorage, objectKey);
    this.invalidateTemplateSnapshotCaches();
    return {
      resref: normalizedResref,
      objectKey,
      deleted
    };
  }

  async createItemBlueprint(
    command: ItemBlueprintCreateCommand
  ): Promise<ItemBlueprintCreateResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.putModuleObject) {
      throw new AppException({
        status: 503,
        code: "ITEM_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for item blueprint creation."
      });
    }

    const resref = normalizeItemBlueprintResref(command.templateResRef);
    const fileName = `${resref}.uti`;
    const bytes = serializeItemBlueprintToUtiGff(
      buildSerializableItemBlueprintFromCreateCommand(command, resref)
    );
    const parsedBlueprint = parseTemplateBlueprintFromGff(bytes);
    if (!parsedBlueprint || parsedBlueprint.sourceFileType !== "UTI ") {
      throw new AppException({
        status: 500,
        code: "ITEM_BLUEPRINT_SERIALIZATION_FAILED",
        message: "Created item blueprint could not be parsed as UTI GFF."
      });
    }
    const blueprint = applyItemBlueprintPreviewMetadataFromCreateCommand(
      parsedBlueprint,
      command
    );

    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${fileName}`;
    if (!command.overwrite) {
      const existing = await this.moduleBlobStorage.getModuleObject(
        settings.blobStorage,
        objectKey
      );
      if (existing) {
        throw new AppException({
          status: 409,
          code: "ITEM_BLUEPRINT_ALREADY_EXISTS",
          message: `Item blueprint '${resref}' already exists in module storage.`
        });
      }
    }

    const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, {
      fileName,
      resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTI,
      bytes
    });
    this.invalidateTemplateSnapshotCaches();

    const template = await this.buildCreatedItemTemplateRecord({
      resref,
      fileName,
      bytes,
      stored,
      blueprint,
      requestedName: command.name,
      settings
    });
    this.cacheTemplateLookup(template);

    const processed = await this.processTemplateRecordByKind(
      "item",
      {
        templateId: template.templateId,
        resref,
        bypassCache: true,
        includeBenchmarkMetadata: true
      },
      template
    );
    const result = this.mapTemplateResultByKind("item", processed);
    return {
      blueprint: {
        templateId: template.templateId,
        resref,
        name: template.name,
        objectKey: stored.key,
        sizeBytes: stored.size,
        ...(stored.etag ? { etag: stored.etag } : {}),
        sourceFileType: blueprint.sourceFileType,
        sourceFileVersion: blueprint.sourceFileVersion
      },
      ...result
    };
  }

  async updateItemBlueprint(
    resRef: string,
    command: ItemBlueprintCreateCommand
  ): Promise<ItemBlueprintCreateResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.putModuleObject) {
      throw new AppException({
        status: 503,
        code: "ITEM_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for item blueprint updates."
      });
    }

    const normalizedResref = normalizeItemBlueprintResref(resRef);
    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${normalizedResref}.uti`;
    const existing = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, objectKey);
    if (!existing) {
      throw new AppException({
        status: 404,
        code: "ITEM_BLUEPRINT_NOT_FOUND",
        message: `Item blueprint '${normalizedResref}' was not found in module storage.`
      });
    }

    return this.createItemBlueprint({
      ...command,
      templateResRef: normalizedResref,
      overwrite: true
    });
  }

  async deleteItemBlueprint(resRef: string): Promise<ItemBlueprintDeleteResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.deleteModuleObject) {
      throw new AppException({
        status: 503,
        code: "ITEM_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for item blueprint deletion."
      });
    }

    const normalizedResref = normalizeItemBlueprintResref(resRef);
    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${normalizedResref}.uti`;
    const existing = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, objectKey);
    if (!existing) {
      throw new AppException({
        status: 404,
        code: "ITEM_BLUEPRINT_NOT_FOUND",
        message: `Item blueprint '${normalizedResref}' was not found in module storage.`
      });
    }

    const deleted = await this.moduleBlobStorage.deleteModuleObject(settings.blobStorage, objectKey);
    this.invalidateTemplateSnapshotCaches();
    return {
      resref: normalizedResref,
      objectKey,
      deleted
    };
  }

  async createStoreBlueprint(
    command: StoreBlueprintCreateCommand
  ): Promise<StoreBlueprintCreateResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.putModuleObject) {
      throw new AppException({
        status: 503,
        code: "STORE_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for store blueprint creation."
      });
    }

    const resref = normalizeStoreBlueprintResref(command.resRef);
    const fileName = `${resref}.utm`;
    const bytes = serializeStoreBlueprintToUtmGff(
      buildSerializableStoreBlueprintFromCreateCommand(command, resref)
    );
    const blueprint = parseTemplateBlueprintFromGff(bytes);
    if (!blueprint || blueprint.sourceFileType !== "UTM ") {
      throw new AppException({
        status: 500,
        code: "STORE_BLUEPRINT_SERIALIZATION_FAILED",
        message: "Created store blueprint could not be parsed as UTM GFF."
      });
    }

    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${fileName}`;
    if (!command.overwrite) {
      const existing = await this.moduleBlobStorage.getModuleObject(
        settings.blobStorage,
        objectKey
      );
      if (existing) {
        throw new AppException({
          status: 409,
          code: "STORE_BLUEPRINT_ALREADY_EXISTS",
          message: `Store blueprint '${resref}' already exists in module storage.`
        });
      }
    }

    const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, {
      fileName,
      resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTM,
      bytes
    });
    this.invalidateTemplateSnapshotCaches();

    const template = this.buildCreatedStoreTemplateRecord({
      resref,
      stored,
      blueprint,
      requestedName: command.name
    });
    this.cacheTemplateLookup(template);

    return {
      blueprint: {
        templateId: template.templateId,
        resref,
        name: template.name,
        objectKey: stored.key,
        sizeBytes: stored.size,
        ...(stored.etag ? { etag: stored.etag } : {}),
        sourceFileType: blueprint.sourceFileType,
        sourceFileVersion: blueprint.sourceFileVersion
      },
      store: template
    };
  }

  async updateStoreBlueprint(
    resRef: string,
    command: StoreBlueprintCreateCommand
  ): Promise<StoreBlueprintCreateResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.putModuleObject) {
      throw new AppException({
        status: 503,
        code: "STORE_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for store blueprint updates."
      });
    }

    const normalizedResref = normalizeStoreBlueprintResref(resRef);
    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${normalizedResref}.utm`;
    const existing = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, objectKey);
    if (!existing) {
      throw new AppException({
        status: 404,
        code: "STORE_BLUEPRINT_NOT_FOUND",
        message: `Store blueprint '${normalizedResref}' was not found in module storage.`
      });
    }

    return this.createStoreBlueprint({
      ...command,
      resRef: normalizedResref,
      overwrite: true
    });
  }

  async deleteStoreBlueprint(resRef: string): Promise<StoreBlueprintDeleteResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.deleteModuleObject) {
      throw new AppException({
        status: 503,
        code: "STORE_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for store blueprint deletion."
      });
    }

    const normalizedResref = normalizeStoreBlueprintResref(resRef);
    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${normalizedResref}.utm`;
    const existing = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, objectKey);
    if (!existing) {
      throw new AppException({
        status: 404,
        code: "STORE_BLUEPRINT_NOT_FOUND",
        message: `Store blueprint '${normalizedResref}' was not found in module storage.`
      });
    }

    const deleted = await this.moduleBlobStorage.deleteModuleObject(settings.blobStorage, objectKey);
    this.invalidateTemplateSnapshotCaches();
    return {
      resref: normalizedResref,
      objectKey,
      deleted
    };
  }

  async createPlaceableBlueprint(
    command: PlaceableBlueprintCreateCommand
  ): Promise<PlaceableBlueprintCreateResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.putModuleObject) {
      throw new AppException({
        status: 503,
        code: "PLACEABLE_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for placeable blueprint creation."
      });
    }

    const resref = normalizePlaceableBlueprintResref(command.templateResRef);
    const fileName = `${resref}.utp`;
    const bytes = serializePlaceableBlueprintToUtpGff(
      buildSerializablePlaceableBlueprintFromCreateCommand(command, resref)
    );
    const blueprint = parseTemplateBlueprintFromGff(bytes);
    if (!blueprint || blueprint.sourceFileType !== "UTP ") {
      throw new AppException({
        status: 500,
        code: "PLACEABLE_BLUEPRINT_SERIALIZATION_FAILED",
        message: "Created placeable blueprint could not be parsed as UTP GFF."
      });
    }

    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${fileName}`;
    if (!command.overwrite) {
      const existing = await this.moduleBlobStorage.getModuleObject(
        settings.blobStorage,
        objectKey
      );
      if (existing) {
        throw new AppException({
          status: 409,
          code: "PLACEABLE_BLUEPRINT_ALREADY_EXISTS",
          message: `Placeable blueprint '${resref}' already exists in module storage.`
        });
      }
    }

    const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, {
      fileName,
      resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTP,
      bytes
    });
    this.invalidateTemplateSnapshotCaches();

    const template = this.buildCreatedPlaceableTemplateRecord({
      resref,
      stored,
      blueprint,
      requestedName: command.name
    });
    this.cacheTemplateLookup(template);

    return {
      blueprint: {
        templateId: template.templateId,
        resref,
        name: template.name,
        objectKey: stored.key,
        sizeBytes: stored.size,
        ...(stored.etag ? { etag: stored.etag } : {}),
        sourceFileType: blueprint.sourceFileType,
        sourceFileVersion: blueprint.sourceFileVersion
      },
      placeable: template
    };
  }

  async updatePlaceableBlueprint(
    resRef: string,
    command: PlaceableBlueprintCreateCommand
  ): Promise<PlaceableBlueprintCreateResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.putModuleObject) {
      throw new AppException({
        status: 503,
        code: "PLACEABLE_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for placeable blueprint updates."
      });
    }

    const normalizedResref = normalizePlaceableBlueprintResref(resRef);
    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${normalizedResref}.utp`;
    const existing = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, objectKey);
    if (!existing) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_BLUEPRINT_NOT_FOUND",
        message: `Placeable blueprint '${normalizedResref}' was not found in module storage.`
      });
    }

    return this.createPlaceableBlueprint({
      ...command,
      templateResRef: normalizedResref,
      overwrite: true
    });
  }

  async deletePlaceableBlueprint(resRef: string): Promise<PlaceableBlueprintDeleteResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.deleteModuleObject) {
      throw new AppException({
        status: 503,
        code: "PLACEABLE_BLUEPRINT_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for placeable blueprint deletion."
      });
    }

    const normalizedResref = normalizePlaceableBlueprintResref(resRef);
    const settings = await this.runtimeSettingsRepository.get();
    const objectKey = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${normalizedResref}.utp`;
    const existing = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, objectKey);
    if (!existing) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_BLUEPRINT_NOT_FOUND",
        message: `Placeable blueprint '${normalizedResref}' was not found in module storage.`
      });
    }

    const deleted = await this.moduleBlobStorage.deleteModuleObject(settings.blobStorage, objectKey);
    this.invalidateTemplateSnapshotCaches();
    return {
      resref: normalizedResref,
      objectKey,
      deleted
    };
  }

  async getItemPropertyDictionary(): Promise<ItemPropertyDictionaryResult> {
    if (!this.runtimeSettingsRepository) {
      return {
        generatedAt: new Date().toISOString(),
        properties: []
      };
    }

    const settings = await this.runtimeSettingsRepository.get();
    const definitions = await this.resolveCreatureRuntimeItemPropertyDefinitionLookup(settings);
    const entries = await Promise.all(
      [...definitions.entries()].map(async ([propertyName, definition]) =>
        this.buildItemPropertyDictionaryEntry(settings, propertyName, definition)
      )
    );

    return {
      generatedAt: new Date().toISOString(),
      properties: entries
        .filter((entry): entry is ItemPropertyDictionaryEntry => Boolean(entry))
        .sort((left, right) => left.propertyName - right.propertyName)
    };
  }

  async getItemBaseItems(): Promise<ItemBaseItemsResult> {
    const candidates: OnDemandPlaceableSourceResource[] = [];
    if (this.runtimeSettingsRepository) {
      const settings = await this.runtimeSettingsRepository.get();
      const runtimeFound = await resolvePlaceableSourceResource(
        settings,
        "baseitems",
        ON_DEMAND_TWO_DA_RESOURCE_CANDIDATES
      );
      if (runtimeFound) {
        candidates.push(runtimeFound);
      }
    }
    const localFound = await this.resolveLocalItemRetailBaseitemsTwoDa();
    if (localFound) {
      candidates.push(localFound);
    }

    for (const found of candidates) {
      try {
        const table = parseAuroraTwoDaTable(found.bytes, {
          tableName: "baseitems.2da",
          profile: "aurora-item-baseitems",
          sourceObjectKey: found.fileName
        });
        const items = table.rows
          .map((row) => this.buildItemBaseItemEntry(row, found.fileName))
          .filter((entry): entry is ItemBaseItemEntry => Boolean(entry));
        return {
          generatedAt: new Date().toISOString(),
          sourceKey: found.fileName,
          count: items.length,
          items
        };
      } catch {
        continue;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      count: 0,
      items: []
    };
  }

  async getItemPaletteTree(): Promise<ItemPaletteTreeResult> {
    if (!this.runtimeSettingsRepository) {
      return this.buildEmptyItemPaletteTreeResult();
    }

    const settings = await this.runtimeSettingsRepository.get();
    const parsedSources = (
      await Promise.all(
        ["itempalstd", "itempal", "itempalcus"].map((resref) =>
          this.parseItemPaletteSource(settings, resref)
        )
      )
    ).filter(
      (source): source is {
        resource: OnDemandPlaceableSourceResource;
        palette: ParsedAuroraItpPalette;
      } => Boolean(source)
    );

    const modulePrefix = normalizePrefixForLookup(settings.blobStorage.modulePrefix);
    const selectedSource =
      parsedSources.find(
        ({ resource, palette }) =>
          resource.resref === "itempalcus" &&
          palette.leafCount > 0 &&
          resource.fileName.toLowerCase().startsWith(modulePrefix)
      ) ??
      parsedSources
        .slice()
        .sort((left, right) => {
          const leafDelta = right.palette.leafCount - left.palette.leafCount;
          if (leafDelta !== 0) {
            return leafDelta;
          }
          return right.palette.rootCount - left.palette.rootCount;
        })[0] ??
      null;
    const talkTableLookup = await this.buildItemPaletteTalkTableLookup(
      settings.paths,
      parsedSources.flatMap(({ palette }) => collectItemPaletteTalkTableStrRefs(palette.roots))
    );

    return {
      generatedAt: new Date().toISOString(),
      ...(selectedSource ? { activeSource: selectedSource.resource.resref } : {}),
      sources: parsedSources.map(({ resource, palette }) => ({
        resref: resource.resref,
        objectKey: resource.fileName,
        fileName: resource.fileName,
        sourceFileType: palette.sourceFileType,
        sourceFileVersion: palette.sourceFileVersion,
        rootCount: palette.rootCount,
        leafCount: palette.leafCount,
        folderCount: palette.folderCount,
        categoryLeafCount: palette.categoryLeafCount,
        maxDepth: palette.maxDepth,
        selected: resource === selectedSource?.resource
      })),
      rootCount: selectedSource?.palette.rootCount ?? 0,
      leafCount: selectedSource?.palette.leafCount ?? 0,
      folderCount: selectedSource?.palette.folderCount ?? 0,
      categoryLeafCount: selectedSource?.palette.categoryLeafCount ?? 0,
      maxDepth: selectedSource?.palette.maxDepth ?? 0,
      roots:
        selectedSource?.palette.roots.map((node) =>
          this.mapItemPaletteNode(node, talkTableLookup)
        ) ?? []
    };
  }

  async getItemGeneratorSupport(): Promise<ItemGeneratorSupportResult> {
    const sources: ItemGeneratorSupportSource[] = [];

    if (this.runtimeSettingsRepository && this.moduleBlobStorage) {
      const settings = await this.runtimeSettingsRepository.get();
      const snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
      const utgObjects = snapshot.objects.filter((object) =>
        object.key.trim().toLowerCase().endsWith(".utg")
      );
      for (const object of utgObjects) {
        const payload = await this.moduleBlobStorage.getModuleObject(
          settings.blobStorage,
          object.key
        );
        if (!payload) {
          continue;
        }
        sources.push(
          buildItemGeneratorSupportSource({
            objectKey: payload.key,
            fileName: basename(payload.key),
            sizeBytes: payload.size,
            source: "module-snapshot",
            bytes: payload.bytes
          })
        );
      }
    }

    sources.push(...(await this.readLocalItemGeneratorSupportSources()));
    const dedupedSources = dedupeItemGeneratorSupportSources(sources);
    const gffCandidateCount = dedupedSources.filter(
      (source) => source.classification === "gff-candidate"
    ).length;
    const parseableGffCount = dedupedSources.filter((source) => source.parseable).length;
    const ltrLexiconCount = dedupedSources.filter(
      (source) => source.classification === "ltr-lexicon"
    ).length;
    const parserImplemented = false;
    const status: ItemGeneratorSupportResult["status"] =
      parserImplemented && parseableGffCount > 0
        ? "ready"
        : dedupedSources.length > 0
          ? "unsupported"
          : "no-sources";
    const notes =
      status === "ready"
        ? [
            "At least one .utg source has been parsed as a supported Aurora item-generator blueprint."
          ]
        : [
            "Aurora decompilation exposes TNWItemGeneratorTemplate/TNWItemGenerator/TdlgItemGeneratorEdit, but the current source set has no parseable GFF item-generator sample.",
            gffCandidateCount > 0
              ? "GFF-style UTG headers were detected, but parser/serializer support is intentionally gated until implemented and round-trip verified."
              : "No GFF-style UTG headers were detected in the current source set.",
            ltrLexiconCount > 0
              ? "Detected .utg resources are LTR V1.0 lexicons, not item-generator blueprints."
              : "No .utg resources were found in the current module snapshot or local retail extract."
          ];

    return {
      generatedAt: new Date().toISOString(),
      supported: status === "ready",
      status,
      sourceCount: dedupedSources.length,
      gffCandidateCount,
      parseableGffCount,
      ltrLexiconCount,
      parserImplemented,
      sources: dedupedSources,
      notes
    };
  }

  async writeCustomItemPalette(
    command: ItemPaletteCustomWriteCommand
  ): Promise<ItemPaletteCustomWriteResult> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.putModuleObject) {
      throw new AppException({
        status: 503,
        code: "ITEM_PALETTE_STORAGE_UNAVAILABLE",
        message: "Module object storage is not available for custom item palette writes."
      });
    }

    const roots = command.roots.map((node, index) =>
      normalizeItemPaletteCustomNode(node, `roots.${index}`)
    );
    const bytes = serializeItemPaletteToItpGff({
      roots,
      sourceStructTypeId: 0xffffffff
    });
    const palette = parseAuroraItpPalette(bytes);
    if (!palette || palette.sourceFileType !== "ITP ") {
      throw new AppException({
        status: 500,
        code: "ITEM_PALETTE_SERIALIZATION_FAILED",
        message: "Custom item palette could not be parsed as ITP GFF."
      });
    }

    const settings = await this.runtimeSettingsRepository.get();
    const fileName = "itempalcus.itp";
    const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, {
      fileName,
      resourceType: NWN_KEY_BIF_RESOURCE_TYPES.ITP,
      bytes
    });
    this.invalidateTemplateSnapshotCaches();

    const talkTableLookup = await this.buildItemPaletteTalkTableLookup(
      settings.paths,
      collectItemPaletteTalkTableStrRefs(palette.roots)
    );
    const mappedRoots = palette.roots.map((node) => this.mapItemPaletteNode(node, talkTableLookup));

    return {
      palette: {
        resref: "itempalcus",
        objectKey: stored.key,
        fileName,
        sizeBytes: stored.size,
        ...(stored.etag ? { etag: stored.etag } : {}),
        sourceFileType: palette.sourceFileType,
        sourceFileVersion: palette.sourceFileVersion,
        rootCount: palette.rootCount,
        leafCount: palette.leafCount,
        folderCount: palette.folderCount,
        categoryLeafCount: palette.categoryLeafCount,
        maxDepth: palette.maxDepth
      },
      tree: {
        generatedAt: new Date().toISOString(),
        activeSource: "itempalcus",
        sources: [
          {
            resref: "itempalcus",
            objectKey: stored.key,
            fileName: stored.key,
            sourceFileType: palette.sourceFileType,
            sourceFileVersion: palette.sourceFileVersion,
            rootCount: palette.rootCount,
            leafCount: palette.leafCount,
            folderCount: palette.folderCount,
            categoryLeafCount: palette.categoryLeafCount,
            maxDepth: palette.maxDepth,
            selected: true
          }
        ],
        rootCount: palette.rootCount,
        leafCount: palette.leafCount,
        folderCount: palette.folderCount,
        categoryLeafCount: palette.categoryLeafCount,
        maxDepth: palette.maxDepth,
        roots: mappedRoots
      }
    };
  }

  private buildCreatedCreatureTemplateRecord(input: {
    resref: string;
    stored: ModuleBlobObjectSummary;
    blueprint: ParsedTemplateBlueprint;
    requestedName: string;
  }): TemplateRecord {
    const metadata: TemplateRecord["metadata"] = {
      sourceFileType: input.blueprint.sourceFileType,
      sourceFileVersion: input.blueprint.sourceFileVersion,
      sourceStructTypeId: input.blueprint.sourceStructTypeId,
      templateResRef: input.blueprint.templateResRef ?? input.resref,
      sourceObjectKey: input.stored.key,
      sourceSizeBytes: input.stored.size,
      sourceExtension: "utc",
      sourceGeneratedBy: "aurora-web-creature-wizard",
      createdByCreatureWizard: true
    };

    for (const [key, value] of Object.entries(input.blueprint)) {
      if (key === "scripts" || value === undefined) {
        continue;
      }
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        metadata[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        metadata[key] = JSON.stringify(value);
      }
    }
    for (const [label, scriptResref] of Object.entries(input.blueprint.scripts ?? {})) {
      if (scriptResref) {
        metadata[`script.${label}`] = scriptResref;
      }
    }
    if (input.stored.etag) {
      metadata.sourceEtag = input.stored.etag;
    }

    const templateId = buildOnDemandTemplateId("creature", input.resref);
    const name =
      input.blueprint.firstName ??
      input.blueprint.localizedName ??
      input.blueprint.displayName ??
      input.blueprint.templateResRef ??
      input.requestedName;
    return {
      templateId,
      kind: "creature",
      resref: input.resref,
      name,
      category: "custom",
      tags: ["custom", "wizard", "source-backed"],
      previewImageUrl: `/api/v1/catalog/creatures/${templateId}/thumbnail`,
      metadata
    };
  }

  private async buildCreatedItemTemplateRecord(input: {
    resref: string;
    fileName: string;
    bytes: Buffer;
    stored: ModuleBlobObjectSummary;
    blueprint: ParsedTemplateBlueprint;
    requestedName: string;
    settings: RuntimeSettingsRecord;
  }): Promise<TemplateRecord> {
    const baseItemMetadata = await this.resolveCreatureRuntimeItemBaseItemMetadata(
      input.settings,
      input.blueprint.baseItem
    );
    const itemPropertyDefinitionLookup =
      await this.resolveCreatureRuntimeItemPropertyDefinitionLookup(input.settings);
    const metadata = this.buildCreatureRuntimeItemTemplateMetadataFromSource(
      input.resref,
      {
        resref: input.resref,
        fileName: input.stored.key,
        bytes: input.bytes,
        extension: "uti",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTI,
        vanillaDirectory: ""
      },
      input.blueprint,
      baseItemMetadata,
      itemPropertyDefinitionLookup
    );
    metadata.sourceObjectKey = input.stored.key;
    metadata.sourceSizeBytes = input.stored.size;
    metadata.sourceExtension = "uti";
    metadata.sourceGeneratedBy = "aurora-web-item-wizard";
    metadata.createdByItemWizard = true;
    if (input.stored.etag) {
      metadata.sourceEtag = input.stored.etag;
    }

    const templateId = buildOnDemandTemplateId("item", input.resref);
    return {
      templateId,
      kind: "item",
      resref: input.resref,
      name:
        input.blueprint.localizedName ??
        input.blueprint.displayName ??
        input.blueprint.templateResRef ??
        input.requestedName,
      category: "custom",
      tags: ["custom", "wizard", "source-backed"],
      previewImageUrl: `/api/v1/catalog/items/${templateId}/thumbnail`,
      metadata
    };
  }

  private buildCreatedStoreTemplateRecord(input: {
    resref: string;
    stored: ModuleBlobObjectSummary;
    blueprint: ParsedTemplateBlueprint;
    requestedName: string;
  }): TemplateRecord {
    const metadata: TemplateRecord["metadata"] = {
      sourceFileType: input.blueprint.sourceFileType,
      sourceFileVersion: input.blueprint.sourceFileVersion,
      sourceStructTypeId: input.blueprint.sourceStructTypeId,
      templateResRef: input.blueprint.templateResRef ?? input.resref,
      localizedName:
        input.blueprint.localizedName ?? input.blueprint.displayName ?? input.requestedName,
      sourceObjectKey: input.stored.key,
      sourceSizeBytes: input.stored.size,
      sourceExtension: "utm",
      sourceGeneratedBy: "aurora-web-store-wizard",
      createdByStoreWizard: true
    };

    setOptionalStoreMetadata(metadata, "tag", input.blueprint.tag);
    setOptionalStoreMetadata(metadata, "comments", input.blueprint.comments);
    setOptionalStoreMetadata(metadata, "markUp", input.blueprint.markUp);
    setOptionalStoreMetadata(metadata, "markDown", input.blueprint.markDown);
    setOptionalStoreMetadata(metadata, "blackMarket", input.blueprint.blackMarket);
    setOptionalStoreMetadata(metadata, "bmMarkDown", input.blueprint.bmMarkDown);
    setOptionalStoreMetadata(metadata, "onOpenStore", input.blueprint.onOpenStore);
    setOptionalStoreMetadata(metadata, "storeId", input.blueprint.storeId);
    setOptionalStoreMetadata(metadata, "storeListCount", input.blueprint.storeListCount);
    setOptionalStoreMetadata(metadata, "storeItemListTotal", input.blueprint.storeItemListTotal);
    setOptionalStoreMetadata(metadata, "willNotBuyCount", input.blueprint.willNotBuyCount);
    setOptionalStoreMetadata(metadata, "willOnlyBuyCount", input.blueprint.willOnlyBuyCount);
    setOptionalStoreJsonMetadata(metadata, "storeListEntries", input.blueprint.storeListEntries);
    setOptionalStoreJsonMetadata(
      metadata,
      "willNotBuyBaseItems",
      input.blueprint.willNotBuyBaseItems
    );
    setOptionalStoreJsonMetadata(
      metadata,
      "willOnlyBuyBaseItems",
      input.blueprint.willOnlyBuyBaseItems
    );
    if (input.stored.etag) {
      metadata.sourceEtag = input.stored.etag;
    }

    const templateId = buildOnDemandTemplateId("store", input.resref);
    return {
      templateId,
      kind: "store",
      resref: input.resref,
      name:
        input.blueprint.localizedName ??
        input.blueprint.displayName ??
        input.blueprint.templateResRef ??
        input.requestedName,
      category: "custom",
      tags: ["custom", "wizard", "source-backed"],
      previewImageUrl: `/api/v1/catalog/stores/${templateId}/thumbnail`,
      metadata
    };
  }

  private buildCreatedPlaceableTemplateRecord(input: {
    resref: string;
    stored: ModuleBlobObjectSummary;
    blueprint: ParsedTemplateBlueprint;
    requestedName: string;
  }): TemplateRecord {
    const inventoryItemListCount =
      input.blueprint.inventoryItemListEntries?.length ??
      input.blueprint.inventoryItemListCount ??
      0;
    const hasInventory = input.blueprint.hasInventory ?? inventoryItemListCount > 0;
    const metadata: TemplateRecord["metadata"] = {
      sourceFileType: input.blueprint.sourceFileType,
      sourceFileVersion: input.blueprint.sourceFileVersion,
      sourceStructTypeId: input.blueprint.sourceStructTypeId,
      templateResRef: input.blueprint.templateResRef ?? input.resref,
      localizedName:
        input.blueprint.localizedName ?? input.blueprint.displayName ?? input.requestedName,
      sourceObjectKey: input.stored.key,
      sourceSizeBytes: input.stored.size,
      sourceExtension: "utp",
      sourceGeneratedBy: "aurora-web-placeable-wizard",
      createdByPlaceableWizard: true,
      inventoryItemListCount
    };

    setOptionalStoreMetadata(metadata, "tag", input.blueprint.tag);
    setOptionalStoreMetadata(metadata, "comments", input.blueprint.comments);
    setOptionalStoreMetadata(metadata, "plot", input.blueprint.plot);
    setOptionalStoreMetadata(metadata, "useable", input.blueprint.useable);
    setOptionalStoreMetadata(metadata, "hasInventory", hasInventory);
    setOptionalStoreMetadata(metadata, "appearanceId", input.blueprint.appearanceId);
    setOptionalStoreMetadata(metadata, "isStatic", input.blueprint.isStatic);
    setOptionalStoreJsonMetadata(
      metadata,
      "inventoryItemListEntries",
      input.blueprint.inventoryItemListEntries
    );
    if (input.stored.etag) {
      metadata.sourceEtag = input.stored.etag;
    }

    const templateId = buildOnDemandTemplateId("placeable", input.resref);
    const tags = ["custom", "wizard", "source-backed"];
    if (hasInventory) {
      tags.push("container");
    }
    return {
      templateId,
      kind: "placeable",
      resref: input.resref,
      name:
        input.blueprint.localizedName ??
        input.blueprint.displayName ??
        input.blueprint.templateResRef ??
        input.requestedName,
      category: "custom",
      tags,
      previewImageUrl: `/api/v1/catalog/placeables/${templateId}/thumbnail`,
      metadata
    };
  }

  private invalidateTemplateSnapshotCaches(): void {
    this.repository.invalidateSnapshotIndex?.();
    this.moduleSnapshotIndexCache = null;
    this.moduleSnapshotIndexFailureCache = null;
    this.inFlightModuleSnapshotIndex.clear();
    this.moduleHashProbeCache = null;
    this.moduleHashProbeInFlight = null;
    this.templateByIdCache.clear();
    this.templateByResrefCache.clear();
    this.templateListCache.clear();
    this.templateListInFlight.clear();
    this.moduleBlobObjectCache.clear();
    this.inFlightModuleBlobObjectReads.clear();
    this.moduleBlobObjectCacheBytes = 0;
  }

  async getProcessedTemplateKind<TKind extends TemplateProcessingKind>(
    kind: TKind,
    cacheKey: string
  ): Promise<TemplateProcessingResultByKind<TKind>> {
    const data = await this.getProcessedTemplateByKind(kind, cacheKey);
    return this.mapTemplateResultByKind(kind, data);
  }

  async benchmarkPlaceables(
    query: PlaceableBenchmarkRunQuery
  ): Promise<PlaceableBenchmarkResult> {
    const candidates = await this.resolveBenchmarkCandidates(query.templateIds);
    const perCandidate: Array<{
      templateId: string;
      resref: string;
      placeableSubtype: PlaceableSubtype;
      metrics: BenchmarkDurationSummary;
    }> = [];
    const allDurations: number[] = [];
    const startedAt = new Date().toISOString();

    for (const candidate of candidates) {
      for (let warmup = 0; warmup < query.warmupIterations; warmup += 1) {
        await this.processPlaceable({
          templateId: candidate.templateId,
          subtypeHint: candidate.placeableSubtype,
          bypassCache: true,
          includeBenchmarkMetadata: true
        });
      }

      const durations: number[] = [];
      for (let iteration = 0; iteration < query.iterations; iteration += 1) {
        const started = process.hrtime.bigint();
        await this.processPlaceable({
          templateId: candidate.templateId,
          subtypeHint: candidate.placeableSubtype,
          bypassCache: query.bypassCache,
          includeBenchmarkMetadata: true
        });
        const ended = process.hrtime.bigint();
        const elapsedMs = Number(ended - started) / 1_000_000;
        durations.push(elapsedMs);
        allDurations.push(elapsedMs);
      }

      const candidateSubtype = candidate.placeableSubtype ?? "generic";
      perCandidate.push({
        templateId: candidate.templateId,
        resref: candidate.resref,
        placeableSubtype: candidateSubtype,
        metrics: summarizeDurations(durations)
      });
    }

    const finishedAt = new Date().toISOString();
    return {
      datasetFingerprint: buildBenchmarkFingerprint(candidates, query),
      config: {
        iterations: query.iterations,
        warmupIterations: query.warmupIterations,
        bypassCache: query.bypassCache,
        candidates: candidates.length
      },
      timing: {
        startedAt,
        finishedAt
      },
      metrics: {
        overall: summarizeDurations(allDurations),
        perCandidate
      }
    };
  }

  private withTemplateListPreviewImageUrls(
    kind: TemplateKind,
    result: TemplateListResult
  ): TemplateListResult {
    if (kind !== "placeable") {
      return result;
    }

    return {
      ...result,
      items: result.items.map(withPlaceablePreviewImageUrl)
    };
  }

  private async withTemplateListItemModelMetadata(
    kind: TemplateKind,
    result: TemplateListResult
  ): Promise<TemplateListResult> {
    if (kind !== "item" || result.items.length === 0) {
      return result;
    }

    return {
      ...result,
      items: await Promise.all(
        result.items.map((template) => this.withItemModelMetadata(template))
      )
    };
  }

  private async withItemModelMetadata<TTemplate extends TemplateRecord>(
    template: TTemplate
  ): Promise<TTemplate> {
    if (template.kind !== "item") {
      return template;
    }
    const sourceMetadata = await this.ensureCreatureRuntimeItemMetadata(template.metadata);
    const itemRuntime = buildItemRuntimeProjection(sourceMetadata);
    const metadata = this.mergeItemRuntimeVisualMetadata(sourceMetadata, itemRuntime);
    const metadataWithAssetCandidates =
      await this.withItemListAssetCandidateMetadata(template, metadata, itemRuntime);
    return metadataWithAssetCandidates === template.metadata
      ? template
      : ({ ...template, metadata: metadataWithAssetCandidates } as TTemplate);
  }

  private async withItemListAssetCandidateMetadata(
    template: TemplateRecord,
    metadata: TemplateRecord["metadata"],
    itemRuntime: ItemRuntimeProjection
  ): Promise<TemplateRecord["metadata"]> {
    const cacheKey =
      this.repository.getPrecomputedTemplateCacheKey?.("item", template.templateId) ??
      buildTemplateProcessCacheKey("item", template.templateId, template.resref);
    const cached = await this.placeableCache.get<TemplateProcessingResult>(cacheKey);
    const assetDelivery =
      cached?.value.kind === "item" &&
      cached.value.assetManifest &&
      this.itemListAssetManifestCoversRuntimeModels(itemRuntime, cached.value.assetManifest)
        ? { cacheKey, assetManifest: cached.value.assetManifest }
        : await this.ensureItemListAssetManifestCacheEntry({
            template,
            metadata,
            runtime: itemRuntime
          });

    const assetCandidates = assetDelivery
      ? this.buildItemListModelAssetCandidateMetadata(
          assetDelivery.cacheKey,
          assetDelivery.assetManifest
        )
      : [];
    const metadataWithCandidates =
      assetCandidates.length > 0
        ? {
            ...metadata,
            modelAssetCandidates: JSON.stringify(assetCandidates)
          }
        : metadata;

    return metadataWithCandidates;
  }

  private async ensureItemListAssetManifestCacheEntry(input: {
    template: TemplateRecord;
    metadata: TemplateRecord["metadata"];
    runtime: ItemRuntimeProjection;
  }): Promise<{ cacheKey: string; assetManifest: PlaceableAssetManifest } | undefined> {
    const itemModelRefs = this.collectItemListModelRefs(input.runtime);
    const itemIconRefs = this.collectItemListIconRefs(input.runtime);
    const itemTextureRefs = this.collectItemListTextureRefs(input.runtime);
    if (
      itemModelRefs.length === 0 &&
      itemIconRefs.length === 0 &&
      itemTextureRefs.length === 0
    ) {
      return undefined;
    }

    const iconCacheKey = buildTemplateProcessCacheKey(
      "item",
      input.template.templateId,
      input.template.resref,
      [
        "stable|item-list-assets:v2",
        `models:${itemModelRefs.join("|")}`,
        `icons:${itemIconRefs.join("|")}`,
        `textures:${itemTextureRefs.join("|")}`
      ].join("|")
    );
    const cached = await this.placeableCache.get<TemplateProcessingResult>(iconCacheKey);
    if (
      cached?.value.kind === "item" &&
      cached.value.assetManifest &&
      this.itemListAssetManifestCoversRuntimeModels(input.runtime, cached.value.assetManifest)
    ) {
      return { cacheKey: iconCacheKey, assetManifest: cached.value.assetManifest };
    }

    const assetManifest = await this.buildItemListAssetManifest({
      templateId: input.template.templateId,
      resref: input.template.resref,
      metadata: input.metadata,
      runtime: input.runtime,
      itemModelRefs,
      itemIconRefs,
      itemTextureRefs
    });
    if (!assetManifest) {
      return undefined;
    }

    await this.placeableCache.set<TemplateProcessingResult>(iconCacheKey, {
      templateId: input.template.templateId,
      kind: "item",
      resref: input.template.resref,
      name: input.template.name,
      category: input.template.category,
      benchmarkCandidate: input.template.benchmarkCandidate ?? false,
      benchmarkBucket: input.template.benchmarkBucket,
      metadata: {
        ...input.metadata,
        ...(itemModelRefs.length > 0 ? { itemModelRefs: itemModelRefs.join("|") } : {}),
        ...(itemIconRefs.length > 0 ? { itemIconRefs: itemIconRefs.join("|") } : {}),
        ...(itemTextureRefs.length > 0 ? { itemTextureRefs: itemTextureRefs.join("|") } : {})
      },
      render: buildTemplateRenderContract("item"),
      assetManifest,
      itemRuntime: input.runtime,
      itemValidationIssues: buildItemValidationIssues(input.runtime),
      processedAt: new Date().toISOString()
    });

    return { cacheKey: iconCacheKey, assetManifest };
  }

  private collectItemListModelRefs(itemRuntime: ItemRuntimeProjection): string[] {
    const modelPartFallbackResRefs = this.buildItemModelPartSiblingFallbackResRefs(
      itemRuntime.visual.modelPartResRefs,
      itemRuntime.visual.modelPartResRefRoles,
      itemRuntime.visual.modelParts
    );
    const armorPartFallbackModelResRefs = itemRuntime.visual.armorPartModelCandidates.flatMap(
      (candidate) => {
        const modelPrefix = candidate.modelPrefix?.trim().toLowerCase();
        const partModelName = candidate.partModelName?.trim().toLowerCase();
        if (
          modelPrefix !== "pmh0_" ||
          !partModelName ||
          !Number.isInteger(candidate.partId) ||
          candidate.partId <= 1
        ) {
          return [];
        }
        return [`${modelPrefix}${partModelName}001`];
      }
    );
    return deduplicateOrdered(
      [
        ...itemRuntime.visual.modelPartResRefs,
        ...modelPartFallbackResRefs,
        ...itemRuntime.visual.armorPartModelCandidates.map(
          (candidate) => candidate.modelResRef
        ),
        ...armorPartFallbackModelResRefs
      ].filter((resref) => resref.trim().length > 0)
    );
  }

  private collectItemListIconRefs(itemRuntime: ItemRuntimeProjection): string[] {
    return deduplicateOrdered(
      [itemRuntime.classification.defaultIcon, itemRuntime.visual.cloakIconResRef]
        .filter((resref): resref is string => typeof resref === "string")
        .map((resref) => resref.trim())
        .filter((resref) => resref.length > 0)
    );
  }

  private collectItemListTextureRefs(itemRuntime: ItemRuntimeProjection): string[] {
    return deduplicateOrdered(
      [itemRuntime.visual.cloakTextureResRef]
        .filter((resref): resref is string => typeof resref === "string")
        .map((resref) => resref.trim())
        .filter((resref) => resref.length > 0)
    );
  }

  private itemListAssetManifestCoversRuntimeModels(
    itemRuntime: ItemRuntimeProjection,
    assetManifest: PlaceableAssetManifest
  ): boolean {
    const requiredModelRefs = deduplicateOrdered([
      ...itemRuntime.visual.modelPartResRefs,
      ...itemRuntime.visual.armorPartModelCandidates.map((candidate) => candidate.modelResRef)
    ])
      .map((resref) => extractBasename(resref))
      .filter(Boolean);
    if (requiredModelRefs.length === 0) {
      return true;
    }

    const deliveredModelRefs = new Set(
      assetManifest.assets
        .filter((asset) => {
          const extension = asset.extension.trim().toLowerCase();
          return asset.role === "model" && (extension === "glb" || extension === "gltf");
        })
        .map((asset) => extractBasename(asset.fileName || asset.objectKey))
        .filter(Boolean)
    );

    return requiredModelRefs.every((resref) =>
      hasAuroraResourceBasename(deliveredModelRefs, resref)
    );
  }

  private async buildItemListAssetManifest(input: {
    templateId: string;
    resref: string;
    metadata: TemplateRecord["metadata"];
    runtime: ItemRuntimeProjection;
    itemModelRefs?: string[];
    itemIconRefs?: string[];
    itemTextureRefs?: string[];
  }): Promise<PlaceableAssetManifest | undefined> {
    const itemModelRefs = input.itemModelRefs ?? this.collectItemListModelRefs(input.runtime);
    const itemIconRefs = input.itemIconRefs ?? this.collectItemListIconRefs(input.runtime);
    const itemTextureRefs =
      input.itemTextureRefs ?? this.collectItemListTextureRefs(input.runtime);
    if (
      itemModelRefs.length === 0 &&
      itemIconRefs.length === 0 &&
      itemTextureRefs.length === 0
    ) {
      return undefined;
    }

    return this.buildPlaceableAssetManifest({
      templateId: input.templateId,
      resref: input.resref,
      subtype: "generic",
      sourceAssetKind: "item",
      metadata: {
        ...input.metadata,
        ...(itemModelRefs.length > 0 ? { itemModelRefs: itemModelRefs.join("|") } : {}),
        ...(itemIconRefs.length > 0 ? { itemIconRefs: itemIconRefs.join("|") } : {}),
        ...(itemTextureRefs.length > 0 ? { itemTextureRefs: itemTextureRefs.join("|") } : {})
      }
    });
  }

  private buildItemListModelAssetCandidateMetadata(
    cacheKey: string,
    assetManifest: PlaceableAssetManifest
  ): Array<{
    assetId: string;
    role: string;
    fileName: string;
    objectKey: string;
    extension: string;
    reference: string;
    assetUrl: string;
  }> {
    return assetManifest.assets
      .map((asset) => {
        const reference = extractBasename(asset.fileName || asset.objectKey);
        if (!reference || !asset.assetId) {
          return null;
        }
        return {
          assetId: asset.assetId,
          role: asset.role,
          fileName: asset.fileName,
          objectKey: asset.objectKey,
          extension: asset.extension.trim().toLowerCase(),
          reference,
          assetUrl: buildPlaceableAssetDeliveryPath(cacheKey, asset)
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }

  private async getPreviewByKind(kind: TemplateKind, templateId: string) {
    const template = await this.repository.findByKindAndId(kind, templateId);
    if (!template) {
      throw new AppException({
        status: 404,
        code: "TEMPLATE_NOT_FOUND",
        message: `${kind} template was not found.`
      });
    }

    const templateWithMetadata =
      kind === "item" ? await this.withItemModelMetadata(template) : template;

    return {
      templateId: template.templateId,
      kind: template.kind,
      placeableSubtype: template.placeableSubtype,
      benchmarkCandidate: template.benchmarkCandidate ?? false,
      benchmarkBucket: template.benchmarkBucket,
      resref: template.resref,
      name: template.name,
      category: template.category,
      previewImageUrl:
        template.kind === "placeable"
          ? withPlaceablePreviewImageUrl(template).previewImageUrl
          : template.previewImageUrl,
      metadata: templateWithMetadata.metadata
    };
  }

  private async resolvePlaceableTemplate(query: PlaceableProcessQuery) {
    if (query.templateId) {
      const cachedById = this.getTemplateLookupById("placeable", query.templateId);
      if (cachedById) {
        return cachedById;
      }

      const byId = await this.repository.findByKindAndId("placeable", query.templateId);
      if (byId) {
        this.cacheTemplateLookup(byId);
        return byId;
      }
    }

    if (query.resref) {
      const cachedByResref = this.getTemplateLookupByResref("placeable", query.resref);
      if (cachedByResref) {
        return cachedByResref;
      }

      const byResref = await this.repository.findByKindAndResref("placeable", query.resref);
      if (byResref) {
        this.cacheTemplateLookup(byResref);
        return byResref;
      }
    }

    const areaInstanceTemplate = buildAreaInstancePlaceableTemplate(query);
    if (areaInstanceTemplate) {
      this.cacheTemplateLookup(areaInstanceTemplate);
      return areaInstanceTemplate;
    }

    throw new AppException({
      status: 404,
      code: "TEMPLATE_NOT_FOUND",
      message: "placeable template was not found."
    });
  }

  private async resolveBenchmarkCandidates(templateIds?: string[]) {
    if (templateIds && templateIds.length > 0) {
      const resolved = await Promise.all(
        templateIds.map((templateId) =>
          this.repository.findByKindAndId("placeable", templateId)
        )
      );
      const candidates = resolved.filter((value): value is NonNullable<typeof value> =>
        Boolean(value)
      );
      if (candidates.length !== templateIds.length) {
        throw new AppException({
          status: 422,
          code: "VALIDATION_FAILED",
          message:
            "Benchmark payload references unknown placeable template ids."
        });
      }
      return candidates;
    }

    const benchmarkList = await this.repository.listByKind("placeable", {
      benchmark: true,
      limit: 200,
      offset: 0
    });

    if (benchmarkList.items.length === 0) {
      throw new AppException({
        status: 422,
        code: "VALIDATION_FAILED",
        message: "No benchmark placeables are configured."
      });
    }

    return benchmarkList.items;
  }

  private async processTemplateByKind(
    kind: TemplateProcessingKind,
    query: TemplateProcessQuery
  ): Promise<TemplateProcessingEnvelope> {
    const template = await this.resolveTemplateByKind(kind, query);
    return this.processTemplateRecordByKind(kind, query, template);
  }

  private async processTemplateRecordByKind(
    kind: TemplateProcessingKind,
    query: TemplateProcessQuery,
    template: TemplateRecord
  ): Promise<TemplateProcessingEnvelope> {
    const creatureAppearanceOverrideFingerprint =
      kind === "creature"
        ? buildCreatureAppearanceOverrideCacheFingerprint(query.creatureAppearanceOverride)
        : undefined;
    const creatureMetadataFingerprint =
      kind === "creature"
        ? buildCreatureMetadataProcessFingerprint(query.creatureMetadata)
        : undefined;
    const itemVisualOverrideFingerprint =
      kind === "item"
        ? buildItemVisualOverrideCacheFingerprint(query.itemVisualOverride)
        : undefined;
    const templateOverrideFingerprint = [
      creatureMetadataFingerprint,
      creatureAppearanceOverrideFingerprint,
      itemVisualOverrideFingerprint
    ]
      .filter((value): value is string => Boolean(value))
      .join("|");
    const defaultTemplateCacheKey = buildTemplateProcessCacheKey(
      kind,
      template.templateId,
      template.resref
    );
    const precomputedTemplateCacheKey =
      kind === "encounter"
        ? this.repository.getPrecomputedTemplateCacheKey?.(kind, template.templateId)
        : undefined;
    const cacheKey = templateOverrideFingerprint
      ? buildTemplateProcessCacheKey(
          kind,
          template.templateId,
          template.resref,
          `stable|${templateOverrideFingerprint}`
        )
      : precomputedTemplateCacheKey ?? defaultTemplateCacheKey;

    if (!query.bypassCache) {
      const cached = await this.placeableCache.get<TemplateProcessingResult>(cacheKey);
      if (cached) {
        const hydrated = await this.ensureTemplateProjection(kind, cacheKey, cached.value);
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          value: maybeStripTemplateBenchmarkMetadata(
            hydrated,
            query.includeBenchmarkMetadata
          )
        };
      }
    }

    const processMiss = async (): Promise<TemplateProcessingEnvelope> => {
      const itemSourceMetadata =
        kind === "item"
          ? applyItemVisualProcessOverrideToMetadata(
              template.metadata,
              query.itemVisualOverride
            )
          : undefined;
      const creatureProcessMetadata =
        kind === "creature"
          ? applyCreatureMetadataProcessOverrideToMetadata(
              template.metadata,
              query.creatureMetadata
            )
          : undefined;
      const creatureSourceMetadata =
        kind === "creature"
          ? await this.applyCreatureAppearanceTypeProcessOverrideToMetadata(
              creatureProcessMetadata ?? template.metadata,
              query.creatureAppearanceOverride
            )
          : undefined;
      const creatureRuntime =
        kind === "creature"
          ? await this.hydrateCreatureRuntimeItemTemplates(
              applyCreatureRuntimeAppearanceOverride(
                buildCreatureRuntimeProjection(creatureSourceMetadata ?? template.metadata),
                query.creatureAppearanceOverride
              )
            )
          : undefined;
      const creatureValidationIssues =
        kind === "creature" && creatureRuntime
          ? buildCreatureValidationIssues(creatureRuntime)
          : undefined;
      const creatureAssetManifest =
        kind === "creature" && creatureRuntime
          ? await this.buildCreatureAssetManifest({
              templateId: template.templateId,
              resref: template.resref,
              metadata: creatureSourceMetadata ?? template.metadata,
              runtime: creatureRuntime
            })
          : undefined;
      const creatureRenderPackage =
        kind === "creature" && creatureRuntime
          ? await this.buildCreatureRenderPackageForCacheEntry(
              cacheKey,
              creatureRuntime,
              creatureAssetManifest
            )
          : undefined;
      const itemHydratedMetadata =
        kind === "item"
          ? await this.ensureCreatureRuntimeItemMetadata(itemSourceMetadata ?? template.metadata)
          : undefined;
      const itemRuntime =
        kind === "item" && itemHydratedMetadata
          ? buildItemRuntimeProjection(itemHydratedMetadata)
          : undefined;
      const itemMetadata =
        kind === "item" && itemRuntime
          ? this.mergeItemRuntimeVisualMetadata(
              itemHydratedMetadata ?? itemSourceMetadata ?? template.metadata,
              itemRuntime
            )
          : undefined;
      const itemValidationIssues =
        kind === "item" && itemRuntime
          ? buildItemValidationIssues(itemRuntime)
          : undefined;
      const itemAssetManifest =
        kind === "item" && itemRuntime
          ? await this.buildItemAssetManifest({
              templateId: template.templateId,
              resref: template.resref,
              metadata: itemMetadata ?? template.metadata,
              runtime: itemRuntime
            })
          : undefined;
      const encounterRuntime =
        kind === "encounter"
          ? buildEncounterRuntimeProjection(template.metadata)
          : undefined;
      const encounterValidationIssues =
        kind === "encounter" && encounterRuntime
          ? buildEncounterValidationIssues(encounterRuntime)
          : undefined;

      const processed: TemplateProcessingResult = {
        templateId: template.templateId,
        kind,
        resref: template.resref,
        name: template.name,
        category: template.category,
        benchmarkCandidate: template.benchmarkCandidate ?? false,
        benchmarkBucket: template.benchmarkBucket,
        metadata: creatureSourceMetadata ?? itemMetadata ?? template.metadata,
        render: buildTemplateRenderContract(kind),
        assetManifest: creatureAssetManifest ?? itemAssetManifest,
        creatureRenderPackage,
        creatureRuntime,
        creatureValidationIssues,
        itemRuntime,
        itemValidationIssues,
        encounterRuntime,
        encounterValidationIssues,
        processedAt: new Date().toISOString()
      };

      const stored = await this.placeableCache.set<TemplateProcessingResult>(
        cacheKey,
        processed
      );
      return {
        cache: {
          key: cacheKey,
          hit: false,
          storedAt: stored.storedAt,
          hits: stored.hits
        },
        value: processed
      };
    };

    const result = query.bypassCache
      ? await processMiss()
      : await executeInFlight(
          this.inFlightTemplateProcessing,
          cacheKey,
          processMiss
        );

    return {
      cache: result.cache,
      value: maybeStripTemplateBenchmarkMetadata(
        result.value,
        query.includeBenchmarkMetadata
      )
    };
  }

  private async applyCreatureAppearanceTypeProcessOverrideToMetadata(
    metadata: TemplateRecord["metadata"],
    override: TemplateProcessQuery["creatureAppearanceOverride"] | undefined
  ): Promise<TemplateRecord["metadata"]> {
    const overrideAppearanceType =
      override &&
      Number.isInteger(override.appearanceType ?? Number.NaN) &&
      override.appearanceType !== undefined
        ? override.appearanceType
        : undefined;
    const metadataAppearanceType =
      typeof metadata.appearanceId === "number" &&
      Number.isInteger(metadata.appearanceId)
        ? metadata.appearanceId
        : undefined;
    const rawAppearanceType = overrideAppearanceType ?? metadataAppearanceType;
    if (!Number.isInteger(rawAppearanceType ?? Number.NaN) || rawAppearanceType === undefined) {
      return metadata;
    }
    const appearanceType = Math.max(0, Math.trunc(rawAppearanceType));
    const appearanceProfile =
      (await this.repository.resolveCreatureAppearanceProfile?.(appearanceType)) ?? null;
    if (!appearanceProfile) {
      return {
        ...metadata,
        appearanceId: appearanceType
      };
    }
    const nextMetadata: TemplateRecord["metadata"] = {
      ...metadata,
      appearanceId: appearanceType,
      appearanceLabelSource2daRow: appearanceProfile.appearanceSource2daRow
    };
    const optionalEntries: Array<[string, string | number | undefined]> = [
      ["appearanceLabel", appearanceProfile.appearanceLabel],
      ["appearanceLabelSourceKey", appearanceProfile.appearanceSourceKey],
      ["appearanceModelType", appearanceProfile.modelType],
      ["appearanceRaceModel", appearanceProfile.raceModel],
      ["appearancePortrait2da", appearanceProfile.portrait2da],
      ["appearanceEnvMap", appearanceProfile.envMap],
      ["appearanceDefaultPhenotype", appearanceProfile.defaultPhenotype],
      ["appearanceBloodColor", appearanceProfile.bloodColor],
      ["appearanceWeaponScale", appearanceProfile.weaponScale],
      ["appearanceSizeCategory", appearanceProfile.sizeCategory]
    ];
    optionalEntries.forEach(([key, value]) => {
      if (value !== undefined) {
        nextMetadata[key] = value;
      }
    });
    return nextMetadata;
  }

  private async hydrateCreatureRuntimeItemTemplates(
    runtime: CreatureRuntimeProjection
  ): Promise<CreatureRuntimeProjection> {
    const lookupCache = new Map<string, Promise<TemplateRecord | null>>();
    const inventoryItems = await this.hydrateCreatureRuntimeItemTemplateEntries(
      runtime.lists.inventoryItems,
      lookupCache
    );
    const equippedItems = await this.hydrateCreatureRuntimeItemTemplateEntries(
      runtime.lists.equippedItems,
      lookupCache
    );

    if (
      inventoryItems === runtime.lists.inventoryItems &&
      equippedItems === runtime.lists.equippedItems
    ) {
      return runtime;
    }

    return {
      ...runtime,
      lists: {
        ...runtime.lists,
        ...(inventoryItems ? { inventoryItems } : {}),
        ...(equippedItems ? { equippedItems } : {})
      }
    };
  }

  private async hydrateCreatureRuntimeItemTemplateEntries<
    TEntry extends CreatureRuntimeItemListEntry
  >(
    entries: TEntry[] | undefined,
    lookupCache: Map<string, Promise<TemplateRecord | null>>
  ): Promise<TEntry[] | undefined> {
    if (!entries || entries.length === 0) {
      return entries;
    }

    let changed = false;
    const hydrated = await Promise.all(
      entries.map(async (entry) => {
        if (entry.itemRuntime) {
          const itemRuntime = await this.ensureCreatureRuntimeItemProjectionMetadata(
            entry.itemRuntime
          );
          if (itemRuntime === entry.itemRuntime) {
            return entry;
          }
          changed = true;
          return {
            ...entry,
            itemRuntime
          } as TEntry;
        }

        const template = await this.resolveCreatureRuntimeItemTemplate(entry, lookupCache);
        if (!template) {
          return entry;
        }

        const itemRuntime = await this.buildItemRuntimeProjectionFromTemplateMetadata(
          template.metadata
        );
        changed = true;
        return {
          ...entry,
          itemTemplateId: entry.itemTemplateId ?? template.templateId,
          itemResref: entry.itemResref ?? template.resref,
          itemRuntime
        } as TEntry;
      })
    );

    return changed ? hydrated : entries;
  }

  private async buildItemRuntimeProjectionFromTemplateMetadata(
    metadata: TemplateRecord["metadata"]
  ): Promise<ItemRuntimeProjection> {
    return buildItemRuntimeProjection(await this.ensureCreatureRuntimeItemMetadata(metadata));
  }

  private async ensureCreatureRuntimeItemMetadata(
    metadata: TemplateRecord["metadata"]
  ): Promise<TemplateRecord["metadata"]> {
    const withBaseItemMetadata =
      await this.ensureCreatureRuntimeItemBaseModelTypeMetadata(metadata);
    const withCloakMetadata =
      await this.ensureCreatureRuntimeItemCloakModelMetadata(withBaseItemMetadata);
    const withRobeHideMetadata =
      await this.ensureCreatureRuntimeItemRobeHideMetadata(withCloakMetadata);
    const withArmorCostMetadata =
      await this.ensureCreatureRuntimeItemArmorPartCostMetadata(withRobeHideMetadata);
    return this.ensureCreatureRuntimeItemPropertyDefinitionMetadata(withArmorCostMetadata);
  }

  private mergeItemRuntimeVisualMetadata(
    metadata: TemplateRecord["metadata"],
    itemRuntime: ItemRuntimeProjection
  ): TemplateRecord["metadata"] {
    let nextMetadata = metadata;
    const setOptionalMetadata = (
      key: string,
      value: string | number | boolean | undefined
    ) => {
      if (value === undefined || metadata[key] === value || nextMetadata[key] === value) {
        return;
      }
      if (nextMetadata === metadata) {
        nextMetadata = { ...metadata };
      }
      nextMetadata[key] = value;
    };

    const classification = itemRuntime.classification;
    setOptionalMetadata("baseItem2daLabel", classification.baseItemLabel);
    setOptionalMetadata("baseItem2daSourceKey", classification.baseItemSourceKey);
    setOptionalMetadata("baseItem2daItemClass", classification.itemClass);
    setOptionalMetadata("baseItemDefaultIcon", classification.defaultIcon);
    setOptionalMetadata("baseItemInvSlotWidth", classification.invSlotWidth);
    setOptionalMetadata("baseItemInvSlotHeight", classification.invSlotHeight);
    setOptionalMetadata("baseItemCanRotateIcon", classification.canRotateIcon);
    setOptionalMetadata("baseItemEquipableSlots", classification.equipableSlots);
    setOptionalMetadata("baseItemBaseCost", classification.baseCost);
    setOptionalMetadata("baseItemStacking", classification.stacking);
    setOptionalMetadata("baseItemItemMultiplier", classification.itemMultiplier);
    setOptionalMetadata("baseItemMaxProps", classification.maxProps);
    setOptionalMetadata("baseItemMinProps", classification.minProps);
    setOptionalMetadata("baseItemPropColumn", classification.propColumn);
    setOptionalMetadata("baseItemStorePanel", classification.storePanel);
    setOptionalMetadata("baseItemStorePanelSort", classification.storePanelSort);
    setOptionalMetadata("baseItemChargesStarting", classification.chargesStarting);
    setOptionalMetadata("baseItemIlrStackSize", classification.ilrStackSize);
    setOptionalMetadata("baseItemWeaponWield", classification.weaponWield);
    setOptionalMetadata("baseItemWeaponType", classification.weaponType);
    setOptionalMetadata("baseItemWeaponSize", classification.weaponSize);
    setOptionalMetadata("baseItemRangedWeapon", classification.rangedWeapon);
    setOptionalMetadata("baseItemRotateOnGround", classification.rotateOnGround);
    setOptionalMetadata("baseItemWeaponMatType", classification.weaponMatType);
    setOptionalMetadata("baseItemAmmunitionType", classification.ammunitionType);
    setOptionalMetadata("baseItemArcaneSpellFailure", classification.arcaneSpellFailure);

    const visual = itemRuntime.visual;
    setOptionalMetadata("baseItemModelType", visual.baseItemModelType);
    setOptionalMetadata("baseItemDefaultModel", visual.baseItemDefaultModel);
    setOptionalMetadata("baseItem2daSourceKey", visual.baseItemModelSourceKey);
    setOptionalMetadata("modelPart1", visual.modelPart1);
    setOptionalMetadata("modelPart2", visual.modelPart2);
    setOptionalMetadata("modelPart3", visual.modelPart3);
    setOptionalMetadata("cloakModelRow", visual.cloakModelRow);
    setOptionalMetadata("cloakModel", visual.cloakModel);
    setOptionalMetadata("cloakTexture", visual.cloakTexture);
    setOptionalMetadata("cloakIcon", visual.cloakIcon);
    setOptionalMetadata("cloakModelResRef", visual.cloakModelResRef);
    setOptionalMetadata("cloakTextureResRef", visual.cloakTextureResRef);
    setOptionalMetadata("cloakIconResRef", visual.cloakIconResRef);
    if (visual.cloakHiddenSlots.length > 0) {
      setOptionalMetadata("cloakHiddenSlots", visual.cloakHiddenSlots.join("|"));
    }
    setOptionalMetadata("cloakSourceKey", visual.cloakSourceKey);
    visual.modelPartResRefs.forEach((resref, index) => {
      setOptionalMetadata(`modelPartResRef${index + 1}`, resref);
    });
    visual.modelPartResRefRoles.forEach((role, index) => {
      setOptionalMetadata(`modelPartResRefRole${index + 1}`, role);
    });
    if (visual.armorRobeHiddenSlots.length > 0) {
      setOptionalMetadata("armorRobeHiddenSlots", visual.armorRobeHiddenSlots.join("|"));
    }
    const itemModelRefs = deduplicateOrdered([
      ...visual.modelPartResRefs,
      ...visual.armorPartModelCandidates.map((candidate) => candidate.modelResRef)
    ]);
    if (itemModelRefs.length > 0) {
      setOptionalMetadata(
        "itemModelRefs",
        itemModelRefs.join("|")
      );
    }
    const itemTextureRefs = deduplicateOrdered([visual.cloakTextureResRef].filter(
      (resref): resref is string => typeof resref === "string" && resref.trim().length > 0
    ));
    if (itemTextureRefs.length > 0) {
      setOptionalMetadata("itemTextureRefs", itemTextureRefs.join("|"));
    }
    const itemIconRefs = deduplicateOrdered(
      [classification.defaultIcon, visual.cloakIconResRef].filter(
        (resref): resref is string => typeof resref === "string" && resref.trim().length > 0
      )
    );
    if (itemIconRefs.length > 0) {
      setOptionalMetadata("itemIconRefs", itemIconRefs.join("|"));
    }

    return nextMetadata;
  }

  private async ensureCreatureRuntimeItemBaseModelTypeMetadata(
    metadata: TemplateRecord["metadata"]
  ): Promise<TemplateRecord["metadata"]> {
    if (!this.runtimeSettingsRepository || this.hasCreatureRuntimeItemBaseMetadata(metadata)) {
      return metadata;
    }

    const baseItem = this.readCreatureRuntimeMetadataNumber(metadata, "baseItem");
    if (!Number.isInteger(baseItem ?? Number.NaN)) {
      return metadata;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const baseItemMetadata = await this.resolveCreatureRuntimeItemBaseItemMetadata(
      settings,
      baseItem
    );
    return baseItemMetadata ? { ...baseItemMetadata, ...metadata } : metadata;
  }

  private async ensureCreatureRuntimeItemCloakModelMetadata(
    metadata: TemplateRecord["metadata"]
  ): Promise<TemplateRecord["metadata"]> {
    const baseItem = this.readCreatureRuntimeMetadataNumber(metadata, "baseItem");
    const modelType = this.readCreatureRuntimeMetadataString(metadata, "baseItemModelType")
      ?.trim()
      .toLowerCase();
    const isCloak =
      modelType === ITEM_CLOAK_MODEL_TYPE || Math.trunc(baseItem ?? -1) === ITEM_CLOAK_BASE_ITEM;

    if (!isCloak) {
      return this.clearCreatureRuntimeItemCloakModelMetadata(metadata);
    }

    const rawModelPart = this.readCreatureRuntimeMetadataNumber(metadata, "modelPart1");
    const cloakModelRow =
      Number.isInteger(rawModelPart ?? Number.NaN) && rawModelPart !== undefined && rawModelPart > 0
        ? Math.trunc(rawModelPart)
        : ITEM_CLOAK_DEFAULT_MODEL_ROW;
    const currentRow = this.readCreatureRuntimeMetadataNumber(metadata, "cloakModelRow");
    const currentResRef = this.readCreatureRuntimeMetadataString(metadata, "cloakModelResRef");
    if (currentRow === cloakModelRow && currentResRef) {
      return metadata;
    }
    if (!this.runtimeSettingsRepository) {
      return metadata;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const table = await this.parseItemPropertyTwoDaTable(settings, "cloakmodel");
    const row = table?.rows.find((candidate) => candidate.rowId === cloakModelRow);
    if (!table || !row) {
      return metadata;
    }

    const model = this.readCreatureRuntimeTwoDaNumber(row, ["model"]) ?? cloakModelRow;
    const texture = this.readCreatureRuntimeTwoDaNumber(row, ["texture"]);
    const icon = this.readCreatureRuntimeTwoDaNumber(row, ["icon"]);
    const hiddenSlots = ITEM_CLOAK_HIDE_METADATA_KEYS
      .filter(([, column]) => this.readCreatureRuntimeTwoDaBoolean(row, [column]) === true)
      .map(([slot]) => slot);
    const nextMetadata = { ...metadata };
    nextMetadata.modelPart1 =
      this.readCreatureRuntimeMetadataNumber(nextMetadata, "modelPart1") ??
      cloakModelRow;
    nextMetadata.cloakModelRow = cloakModelRow;
    nextMetadata.cloakModel = Math.trunc(model);
    nextMetadata.cloakModelResRef = this.buildCreatureRuntimeItemCloakModelResRef(model);
    if (texture !== undefined) {
      nextMetadata.cloakTexture = Math.trunc(texture);
      nextMetadata.cloakTextureResRef = this.buildCreatureRuntimeItemCloakTextureResRef(texture);
    } else {
      delete nextMetadata.cloakTexture;
      delete nextMetadata.cloakTextureResRef;
    }
    if (icon !== undefined) {
      nextMetadata.cloakIcon = Math.trunc(icon);
      nextMetadata.cloakIconResRef = this.buildCreatureRuntimeItemCloakIconResRef(icon);
    } else {
      delete nextMetadata.cloakIcon;
      delete nextMetadata.cloakIconResRef;
    }
    if (hiddenSlots.length > 0) {
      nextMetadata.cloakHiddenSlots = hiddenSlots.join("|");
    } else {
      delete nextMetadata.cloakHiddenSlots;
    }
    nextMetadata.cloakSource2daRow = cloakModelRow;
    if (table.source?.objectKey) {
      nextMetadata.cloakSourceKey = table.source.objectKey;
    }
    return nextMetadata;
  }

  private clearCreatureRuntimeItemCloakModelMetadata(
    metadata: TemplateRecord["metadata"]
  ): TemplateRecord["metadata"] {
    if (
      !this.readCreatureRuntimeMetadataString(metadata, "cloakModelResRef") &&
      this.readCreatureRuntimeMetadataNumber(metadata, "cloakModelRow") === undefined
    ) {
      return metadata;
    }
    const nextMetadata = { ...metadata };
    delete nextMetadata.cloakModelRow;
    delete nextMetadata.cloakModel;
    delete nextMetadata.cloakTexture;
    delete nextMetadata.cloakIcon;
    delete nextMetadata.cloakModelResRef;
    delete nextMetadata.cloakTextureResRef;
    delete nextMetadata.cloakIconResRef;
    delete nextMetadata.cloakHiddenSlots;
    delete nextMetadata.cloakSource2daRow;
    delete nextMetadata.cloakSourceKey;
    return nextMetadata;
  }

  private async ensureCreatureRuntimeItemRobeHideMetadata(
    metadata: TemplateRecord["metadata"]
  ): Promise<TemplateRecord["metadata"]> {
    const robePart = this.readCreatureRuntimeMetadataNumber(metadata, "bodyPartRobe");
    const currentHiddenSlots = this.readCreatureRuntimeMetadataString(
      metadata,
      "armorRobeHiddenSlots"
    );
    const currentSourceRow = this.readCreatureRuntimeMetadataNumber(
      metadata,
      "armorRobeHideSource2daRow"
    );

    if (!Number.isInteger(robePart ?? Number.NaN) || robePart === undefined || robePart <= 0) {
      if (!currentHiddenSlots && currentSourceRow === undefined) {
        return metadata;
      }
      const nextMetadata = { ...metadata };
      delete nextMetadata.armorRobeHiddenSlots;
      delete nextMetadata.armorRobeHiddenSlotCount;
      delete nextMetadata.armorRobeHideSource2daRow;
      delete nextMetadata.armorRobeHideSourceKey;
      return nextMetadata;
    }

    const robePartId = Math.trunc(robePart);
    if (currentSourceRow === robePartId && currentHiddenSlots) {
      return metadata;
    }
    const robeHide = await this.resolveCreatureRuntimeItemRobeHideSlots(robePartId);
    if (!robeHide) {
      return metadata;
    }

    const nextMetadata = { ...metadata };
    if (robeHide.hiddenSlots.length > 0) {
      nextMetadata.armorRobeHiddenSlots = robeHide.hiddenSlots.join("|");
    } else {
      delete nextMetadata.armorRobeHiddenSlots;
    }
    nextMetadata.armorRobeHiddenSlotCount = robeHide.hiddenSlots.length;
    nextMetadata.armorRobeHideSource2daRow = robePartId;
    if (robeHide.sourceKey) {
      nextMetadata.armorRobeHideSourceKey = robeHide.sourceKey;
    }
    return nextMetadata;
  }

  private async resolveCreatureRuntimeItemRobeHideSlots(
    robePartId: number
  ): Promise<{ hiddenSlots: string[]; sourceKey?: string } | null> {
    if (!this.runtimeSettingsRepository) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const table = await this.parseItemPropertyTwoDaTable(settings, "parts_robe");
    if (!table) {
      return null;
    }
    const row = table.rows.find((candidate) => candidate.rowId === robePartId);
    if (!row) {
      return null;
    }

    const hiddenSlots = ITEM_ARMOR_ROBE_HIDE_METADATA_KEYS
      .filter(([, column]) => this.readCreatureRuntimeTwoDaBoolean(row, [column]) === true)
      .map(([slot]) => slot);
    return {
      hiddenSlots,
      ...(table.source?.objectKey ? { sourceKey: table.source.objectKey } : {})
    };
  }

  private async ensureCreatureRuntimeItemArmorPartCostMetadata(
    metadata: TemplateRecord["metadata"]
  ): Promise<TemplateRecord["metadata"]> {
    if (!this.runtimeSettingsRepository) {
      return metadata;
    }

    const requestedParts = ITEM_ARMOR_PART_COST_METADATA_KEYS
      .map(([, partMetadataKey, costMetadataKey, tableResRef]) => ({
        partMetadataKey,
        costMetadataKey,
        tableResRef,
        partId: this.readCreatureRuntimeMetadataNumber(metadata, partMetadataKey)
      }))
      .filter((entry) => Number.isInteger(entry.partId ?? Number.NaN));
    if (requestedParts.length === 0) {
      return metadata;
    }

    const missingCost = requestedParts.some(
      (entry) => this.readCreatureRuntimeMetadataNumber(metadata, entry.costMetadataKey) === undefined
    );
    const missingArmorBaseCost =
      this.readCreatureRuntimeMetadataNumber(metadata, "baseItemBaseCost") === undefined &&
      requestedParts.some((entry) => entry.partMetadataKey === "bodyPartTorso");
    if (
      !missingCost &&
      !missingArmorBaseCost &&
      this.readCreatureRuntimeMetadataNumber(metadata, "armorPartCostModifierTotal") !== undefined
    ) {
      return metadata;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const tableCache = new Map<string, Awaited<ReturnType<typeof this.parseItemPropertyTwoDaTable>>>();
    let nextMetadata = metadata;
    let resolvedCount = 0;
    let unresolvedCount = 0;
    let total = 0;

    const setCostMetadata = (key: string, value: number): void => {
      if (nextMetadata === metadata) {
        nextMetadata = { ...metadata };
      }
      nextMetadata[key] = value;
    };

    for (const entry of requestedParts) {
      let table = tableCache.get(entry.tableResRef);
      if (table === undefined) {
        table = await this.parseItemPropertyTwoDaTable(settings, entry.tableResRef);
        tableCache.set(entry.tableResRef, table);
      }
      const row = table?.rows.find((candidate) => candidate.rowId === Math.trunc(entry.partId ?? -1));
      const costModifier = row
        ? this.readCreatureRuntimeTwoDaNumber(row, ["costmodifier", "cost"])
        : undefined;
      if (typeof costModifier === "number" && Number.isFinite(costModifier)) {
        const normalizedCost = Number(costModifier.toFixed(4));
        setCostMetadata(entry.costMetadataKey, normalizedCost);
        total += normalizedCost;
        resolvedCount += 1;
      } else {
        unresolvedCount += 1;
      }
    }

    if (missingArmorBaseCost) {
      const torsoEntry = requestedParts.find(
        (entry) => entry.partMetadataKey === "bodyPartTorso"
      );
      let chestTable = tableCache.get("parts_chest");
      if (chestTable === undefined) {
        chestTable = await this.parseItemPropertyTwoDaTable(settings, "parts_chest");
        tableCache.set("parts_chest", chestTable);
      }
      const torsoRow = chestTable?.rows.find(
        (candidate) => candidate.rowId === Math.trunc(torsoEntry?.partId ?? -1)
      );
      const torsoAcBonus = torsoRow
        ? this.readCreatureRuntimeTwoDaNumber(torsoRow, ["acbonus"])
        : undefined;
      const armorRowId =
        typeof torsoAcBonus === "number" && Number.isFinite(torsoAcBonus)
          ? Math.round(torsoAcBonus)
          : undefined;
      const armorTable = await this.parseItemPropertyTwoDaTable(settings, "armor");
      const armorRow = armorTable?.rows.find((candidate) => candidate.rowId === armorRowId);
      const armorBaseCost = armorRow
        ? this.readCreatureRuntimeTwoDaNumber(armorRow, ["cost"])
        : undefined;
      if (typeof armorBaseCost === "number" && Number.isFinite(armorBaseCost)) {
        const normalizedBaseCost = Number(armorBaseCost.toFixed(4));
        setCostMetadata("baseItemBaseCost", normalizedBaseCost);
        setCostMetadata("armorBaseCost", normalizedBaseCost);
        if (typeof armorRowId === "number") {
          setCostMetadata("armorBaseCostRow", armorRowId);
        }
        if (typeof torsoAcBonus === "number" && Number.isFinite(torsoAcBonus)) {
          setCostMetadata("armorBaseCostTorsoAcBonus", Number(torsoAcBonus.toFixed(4)));
        }
      }
    }

    if (resolvedCount > 0) {
      setCostMetadata("armorPartCostModifierTotal", Number(total.toFixed(4)));
      setCostMetadata("armorPartCostModifierResolvedCount", resolvedCount);
    }
    if (unresolvedCount > 0) {
      setCostMetadata("armorPartCostModifierUnresolvedCount", unresolvedCount);
    }

    return nextMetadata;
  }

  private async ensureCreatureRuntimeItemPropertyDefinitionMetadata(
    metadata: TemplateRecord["metadata"]
  ): Promise<TemplateRecord["metadata"]> {
    if (!this.runtimeSettingsRepository) {
      return metadata;
    }

    const entries = this.readCreatureRuntimeItemPropertyMetadataEntries(metadata);
    if (!entries || entries.length === 0) {
      return metadata;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const itemPropertyDefinitionLookup =
      await this.resolveCreatureRuntimeItemPropertyDefinitionLookup(settings);
    if (itemPropertyDefinitionLookup.size === 0) {
      return metadata;
    }

    const enrichedEntries = this.enrichCreatureRuntimeItemPropertyEntries(
      entries,
      itemPropertyDefinitionLookup
    );
    const currentValue = typeof metadata.itemPropertyListEntries === "string"
      ? metadata.itemPropertyListEntries
      : "";
    const enrichedValue = JSON.stringify(enrichedEntries);
    return enrichedValue === currentValue
      ? metadata
      : { ...metadata, itemPropertyListEntries: enrichedValue };
  }

  private async ensureCreatureRuntimeItemProjectionMetadata(
    itemRuntime: ItemRuntimeProjection
  ): Promise<ItemRuntimeProjection> {
    const withBaseModelType =
      await this.ensureCreatureRuntimeItemProjectionBaseModelType(itemRuntime);
    const robePart = withBaseModelType.visual.armorParts.robe;
    if (!Number.isInteger(robePart ?? Number.NaN) || robePart === undefined || robePart <= 0) {
      if (withBaseModelType.visual.armorRobeHiddenSlots.length === 0) {
        return withBaseModelType;
      }
      return {
        ...withBaseModelType,
        visual: {
          ...withBaseModelType.visual,
          armorRobeHiddenSlots: []
        }
      };
    }

    const robeHide = await this.resolveCreatureRuntimeItemRobeHideSlots(Math.trunc(robePart));
    if (!robeHide) {
      return withBaseModelType;
    }
    const current = withBaseModelType.visual.armorRobeHiddenSlots;
    if (
      current.length === robeHide.hiddenSlots.length &&
      current.every((slot, index) => slot === robeHide.hiddenSlots[index])
    ) {
      return withBaseModelType;
    }
    return {
      ...withBaseModelType,
      visual: {
        ...withBaseModelType.visual,
        armorRobeHiddenSlots: robeHide.hiddenSlots
      }
    };
  }

  private async ensureCreatureRuntimeItemProjectionBaseModelType(
    itemRuntime: ItemRuntimeProjection
  ): Promise<ItemRuntimeProjection> {
    if (
      !this.runtimeSettingsRepository ||
      itemRuntime.visual.baseItemModelType ||
      itemRuntime.visual.modelPartResRefs.length > 0
    ) {
      return itemRuntime;
    }

    const baseItem = itemRuntime.classification.baseItem;
    if (typeof baseItem !== "number" || !Number.isInteger(baseItem)) {
      return itemRuntime;
    }

    const modelPart1 = itemRuntime.visual.modelPart1 ?? itemRuntime.visual.modelParts[0];
    const modelPart2 = itemRuntime.visual.modelPart2 ?? itemRuntime.visual.modelParts[1];
    const modelPart3 = itemRuntime.visual.modelPart3 ?? itemRuntime.visual.modelParts[2];
    if (![modelPart1, modelPart2, modelPart3].some((value) => value !== undefined)) {
      return itemRuntime;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const baseItemMetadata = await this.resolveCreatureRuntimeItemBaseItemMetadata(
      settings,
      baseItem
    );
    const baseItemModelType = this.readCreatureRuntimeMetadataString(
      baseItemMetadata ?? {},
      "baseItemModelType"
    );
    if (!baseItemMetadata || !baseItemModelType) {
      return itemRuntime;
    }

    const resolvedRuntime = buildItemRuntimeProjection({
      baseItem,
      ...baseItemMetadata,
      ...(modelPart1 !== undefined ? { modelPart1 } : {}),
      ...(modelPart2 !== undefined ? { modelPart2 } : {}),
      ...(modelPart3 !== undefined ? { modelPart3 } : {})
    });
    return {
      ...itemRuntime,
      classification: {
        ...itemRuntime.classification,
        ...resolvedRuntime.classification
      },
      visual: {
        ...itemRuntime.visual,
        baseItemModelType,
        ...(modelPart1 !== undefined ? { modelPart1 } : {}),
        ...(modelPart2 !== undefined ? { modelPart2 } : {}),
        ...(modelPart3 !== undefined ? { modelPart3 } : {}),
        modelParts: resolvedRuntime.visual.modelParts,
        modelPartRoles: resolvedRuntime.visual.modelPartRoles,
        modelPartResRefs: resolvedRuntime.visual.modelPartResRefs,
        modelPartResRefRoles: resolvedRuntime.visual.modelPartResRefRoles
      }
    };
  }

  private hasCreatureRuntimeItemBaseModelType(metadata: TemplateRecord["metadata"]): boolean {
    const value = metadata.baseItemModelType;
    return typeof value === "string" && value.trim().length > 0;
  }

  private hasCreatureRuntimeItemBaseMetadata(metadata: TemplateRecord["metadata"]): boolean {
    return this.hasCreatureRuntimeItemBaseModelType(metadata) &&
      typeof metadata.baseItem2daSourceKey === "string" &&
      metadata.baseItem2daSourceKey.trim().length > 0;
  }

  private readCreatureRuntimeMetadataNumber(
    metadata: TemplateRecord["metadata"] | ItemMetadataPrimitiveRecord,
    key: string
  ): number | undefined {
    const value = metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && /^-?\d+$/u.test(value.trim())) {
      return Number.parseInt(value.trim(), 10);
    }
    return undefined;
  }

  private readCreatureRuntimeMetadataString(
    metadata: TemplateRecord["metadata"] | ItemMetadataPrimitiveRecord,
    key: string
  ): string | undefined {
    const value = metadata[key];
    if (typeof value !== "string") {
      return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private buildCreatureRuntimeItemCloakModelResRef(modelId: number): string {
    return `pmh0_cloak_${Math.max(0, Math.trunc(modelId)).toString().padStart(3, "0")}`;
  }

  private buildCreatureRuntimeItemCloakTextureResRef(textureId: number): string {
    return this.buildCreatureRuntimeItemCloakModelResRef(textureId);
  }

  private buildCreatureRuntimeItemCloakIconResRef(iconId: number): string {
    return `icloak_m_${Math.max(0, Math.trunc(iconId)).toString().padStart(3, "0")}`;
  }

  private async resolveCreatureRuntimeItemTemplate(
    entry: CreatureRuntimeItemListEntry,
    lookupCache: Map<string, Promise<TemplateRecord | null>>
  ): Promise<TemplateRecord | null> {
    const templateId = entry.itemTemplateId?.trim();
    const resref = (entry.itemResref ?? entry.resRef)?.trim();
    const cacheKey = templateId ? `id:${templateId}` : resref ? `resref:${resref}` : "";
    if (!cacheKey) {
      return null;
    }

    const cached = lookupCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const lookup = (async () => {
      if (templateId) {
        const byId = await this.repository.findByKindAndId("item", templateId);
        if (byId) {
          this.cacheTemplateLookup(byId);
          return byId;
        }
      }
      if (resref) {
        const cachedByResref = this.getTemplateLookupByResref("item", resref);
        if (cachedByResref) {
          return cachedByResref;
        }
        const byResref = await this.repository.findByKindAndResref("item", resref);
        if (byResref) {
          this.cacheTemplateLookup(byResref);
          return byResref;
        }
        const bySourceResource = await this.resolveCreatureRuntimeItemTemplateFromSourceResource(
          resref
        );
        if (bySourceResource) {
          return bySourceResource;
        }
      }
      return null;
    })();
    lookupCache.set(cacheKey, lookup);
    return lookup;
  }

  private async resolveCreatureRuntimeItemTemplateFromSourceResource(
    resref: string
  ): Promise<TemplateRecord | null> {
    if (!this.runtimeSettingsRepository) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const found = await resolvePlaceableSourceResource(
      settings,
      resref,
      ON_DEMAND_ITEM_TEMPLATE_RESOURCE_CANDIDATES
    );
    if (!found) {
      return null;
    }

    const blueprint = parseTemplateBlueprintFromGff(found.bytes);
    if (!blueprint) {
      return null;
    }

    const templateId = buildOnDemandTemplateId("item", resref);
    const baseItemMetadata = await this.resolveCreatureRuntimeItemBaseItemMetadata(
      settings,
      blueprint.baseItem
    );
    const itemPropertyDefinitionLookup =
      await this.resolveCreatureRuntimeItemPropertyDefinitionLookup(settings);
    const metadata = this.buildCreatureRuntimeItemTemplateMetadataFromSource(
      resref,
      found,
      blueprint,
      baseItemMetadata,
      itemPropertyDefinitionLookup
    );
    return {
      templateId,
      kind: "item",
      resref,
      name:
        blueprint.localizedName ??
        blueprint.displayName ??
        blueprint.templateResRef ??
        resref,
      category: "source",
      tags: ["source-backed"],
      previewImageUrl: `/api/v1/catalog/items/${templateId}/thumbnail`,
      metadata
    };
  }

  private buildItemBaseItemEntry(
    row: ReturnType<typeof parseAuroraTwoDaTable>["rows"][number],
    sourceKey: string
  ): ItemBaseItemEntry | null {
    const itemClass = this.normalizeCreatureRuntimeItemModelType(
      this.readCreatureRuntimeTwoDaCell(row, [
        "itemclass",
        "item_class",
        "itemmodeltype",
        "item_model_type"
      ])
    );
    const modelType =
      itemClass ??
      this.normalizeCreatureRuntimeItemModelType(
        this.readCreatureRuntimeTwoDaCell(row, [
          "modelprefix",
          "model_prefix",
          "model",
          "mdltype",
          "modeltype",
          "model_type"
        ])
      );
    const entry: ItemBaseItemEntry = {
      baseItem: row.rowId,
      sourceKey
    };
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "label",
      this.readCreatureRuntimeTwoDaDisplayLabel(row)
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "nameStrRef",
      this.readCreatureRuntimeTwoDaInteger(row, ["name", "namestrref"])
    );
    this.setOptionalCreatureRuntimeObjectValue(entry, "itemClass", itemClass);
    this.setOptionalCreatureRuntimeObjectValue(entry, "modelType", modelType);
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "defaultModel",
      this.readCreatureRuntimeTwoDaLookupRef(row, [
        "defaultmodel",
        "default_model",
        "defaultmdl",
        "defaultresref"
      ])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "defaultIcon",
      this.readCreatureRuntimeTwoDaLookupRef(row, ["defaulticon", "default_icon", "icon"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "invSlotWidth",
      this.readCreatureRuntimeTwoDaInteger(row, ["invslotwidth", "inventorywidth"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "invSlotHeight",
      this.readCreatureRuntimeTwoDaInteger(row, ["invslotheight", "inventoryheight"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "canRotateIcon",
      this.readCreatureRuntimeTwoDaInteger(row, ["canrotateicon", "rotateicon"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "equipableSlots",
      this.readCreatureRuntimeTwoDaString(row, ["equipableslots", "equipslots", "equipmask"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "baseCost",
      this.readCreatureRuntimeTwoDaInteger(row, ["basecost", "cost"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "stacking",
      this.readCreatureRuntimeTwoDaInteger(row, ["stacking", "stackable"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "itemMultiplier",
      this.readCreatureRuntimeTwoDaNumber(row, ["itemmultiplier", "multiplier"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "maxProps",
      this.readCreatureRuntimeTwoDaInteger(row, ["maxprops", "maxproperties"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "minProps",
      this.readCreatureRuntimeTwoDaInteger(row, ["minprops", "minproperties"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "propColumn",
      this.readCreatureRuntimeTwoDaString(row, ["propcolumn", "propertycolumn"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "storePanel",
      this.readCreatureRuntimeTwoDaInteger(row, ["storepanel"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "storePanelSort",
      this.readCreatureRuntimeTwoDaInteger(row, ["storepanelsort"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "chargesStarting",
      this.readCreatureRuntimeTwoDaInteger(row, ["chargesstarting", "startingcharges"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "ilrStackSize",
      this.readCreatureRuntimeTwoDaInteger(row, ["ilrstacksize"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "weaponWield",
      this.readCreatureRuntimeTwoDaInteger(row, ["weaponwield"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "weaponType",
      this.readCreatureRuntimeTwoDaInteger(row, ["weapontype"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "weaponSize",
      this.readCreatureRuntimeTwoDaInteger(row, ["weaponsize"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "rangedWeapon",
      this.readCreatureRuntimeTwoDaInteger(row, ["rangedweapon"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "rotateOnGround",
      this.readCreatureRuntimeTwoDaInteger(row, ["rotateonground"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "weaponMatType",
      this.readCreatureRuntimeTwoDaInteger(row, ["weaponmattype"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "ammunitionType",
      this.readCreatureRuntimeTwoDaInteger(row, ["ammunitiontype", "ammotype"])
    );
    this.setOptionalCreatureRuntimeObjectValue(
      entry,
      "arcaneSpellFailure",
      this.readCreatureRuntimeTwoDaInteger(row, ["arcanespellfailure", "spellfailure"])
    );
    const reqFeats = [0, 1, 2, 3, 4]
      .map((index) =>
        this.readCreatureRuntimeTwoDaInteger(row, [
          `reqfeat${index}`,
          `req_feat_${index}`,
          `requiredfeat${index}`
        ])
      )
      .filter((value): value is number => Number.isInteger(value));
    if (reqFeats.length > 0) {
      entry.reqFeats = reqFeats;
    }
    return entry;
  }

  private async resolveCreatureRuntimeItemBaseItemMetadata(
    settings: RuntimeSettingsRecord,
    baseItem: number | undefined
  ): Promise<ItemMetadataPrimitiveRecord | undefined> {
    if (!Number.isInteger(baseItem ?? Number.NaN)) {
      return undefined;
    }

    const runtimeFound = await resolvePlaceableSourceResource(
      settings,
      "baseitems",
      ON_DEMAND_TWO_DA_RESOURCE_CANDIDATES
    );
    const localFound = await this.resolveLocalItemRetailBaseitemsTwoDa();
    const candidates = [runtimeFound, localFound].filter(
      (candidate): candidate is OnDemandPlaceableSourceResource => Boolean(candidate)
    );

    for (const found of candidates) {
      try {
        const table = parseAuroraTwoDaTable(found.bytes, {
          tableName: "baseitems.2da",
          profile: "aurora-creature",
          sourceObjectKey: found.fileName
        });
        const row = table.rows.find((entry) => entry.rowId === Math.trunc(baseItem ?? -1));
        if (!row) {
          continue;
        }
        const itemClass = this.normalizeCreatureRuntimeItemModelType(
          this.readCreatureRuntimeTwoDaCell(row, [
            "itemclass",
            "item_class",
            "itemmodeltype",
            "item_model_type"
          ])
        );
        const modelType =
          itemClass ??
          this.normalizeCreatureRuntimeItemModelType(
            this.readCreatureRuntimeTwoDaCell(row, [
              "modelprefix",
              "model_prefix",
              "model",
              "mdltype",
              "modeltype",
              "model_type"
            ])
          );
        const metadata: ItemMetadataPrimitiveRecord = {
          baseItem2daRow: row.rowId,
          baseItem2daSourceKey: found.fileName
        };
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItem2daLabel",
          this.readCreatureRuntimeTwoDaDisplayLabel(row)
        );
        this.setOptionalCreatureRuntimeMetadata(metadata, "baseItem2daItemClass", itemClass);
        this.setOptionalCreatureRuntimeMetadata(metadata, "baseItemModelType", modelType);
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemDefaultModel",
          this.readCreatureRuntimeTwoDaLookupRef(row, [
            "defaultmodel",
            "default_model",
            "defaultmdl",
            "defaultresref"
          ])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemDefaultIcon",
          this.readCreatureRuntimeTwoDaLookupRef(row, ["defaulticon", "default_icon", "icon"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemInvSlotWidth",
          this.readCreatureRuntimeTwoDaInteger(row, ["invslotwidth", "inventorywidth"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemInvSlotHeight",
          this.readCreatureRuntimeTwoDaInteger(row, ["invslotheight", "inventoryheight"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemCanRotateIcon",
          this.readCreatureRuntimeTwoDaInteger(row, ["canrotateicon", "rotateicon"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemEquipableSlots",
          this.readCreatureRuntimeTwoDaString(row, [
            "equipableslots",
            "equipslots",
            "equipmask"
          ])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemBaseCost",
          this.readCreatureRuntimeTwoDaInteger(row, ["basecost", "cost"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemStacking",
          this.readCreatureRuntimeTwoDaInteger(row, ["stacking", "stackable"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemItemMultiplier",
          this.readCreatureRuntimeTwoDaNumber(row, ["itemmultiplier", "multiplier"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemMaxProps",
          this.readCreatureRuntimeTwoDaInteger(row, ["maxprops", "maxproperties"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemMinProps",
          this.readCreatureRuntimeTwoDaInteger(row, ["minprops", "minproperties"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemPropColumn",
          this.readCreatureRuntimeTwoDaString(row, ["propcolumn", "propertycolumn"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemStorePanel",
          this.readCreatureRuntimeTwoDaInteger(row, ["storepanel"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemStorePanelSort",
          this.readCreatureRuntimeTwoDaInteger(row, ["storepanelsort"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemChargesStarting",
          this.readCreatureRuntimeTwoDaInteger(row, ["chargesstarting", "startingcharges"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemIlrStackSize",
          this.readCreatureRuntimeTwoDaInteger(row, ["ilrstacksize"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemWeaponWield",
          this.readCreatureRuntimeTwoDaInteger(row, ["weaponwield"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemWeaponType",
          this.readCreatureRuntimeTwoDaInteger(row, ["weapontype"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemWeaponSize",
          this.readCreatureRuntimeTwoDaInteger(row, ["weaponsize"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemRangedWeapon",
          this.readCreatureRuntimeTwoDaInteger(row, ["rangedweapon"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemRotateOnGround",
          this.readCreatureRuntimeTwoDaInteger(row, ["rotateonground"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemWeaponMatType",
          this.readCreatureRuntimeTwoDaInteger(row, ["weaponmattype"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemAmmunitionType",
          this.readCreatureRuntimeTwoDaInteger(row, ["ammunitiontype", "ammotype"])
        );
        this.setOptionalCreatureRuntimeMetadata(
          metadata,
          "baseItemArcaneSpellFailure",
          this.readCreatureRuntimeTwoDaInteger(row, [
            "arcanespellfailure",
            "spellfailure"
          ])
        );
        return metadata;
      } catch {
        continue;
      }
    }

    return undefined;
  }

  private buildEmptyItemPaletteTreeResult(): ItemPaletteTreeResult {
    return {
      generatedAt: new Date().toISOString(),
      sources: [],
      rootCount: 0,
      leafCount: 0,
      folderCount: 0,
      categoryLeafCount: 0,
      maxDepth: 0,
      roots: []
    };
  }

  private async buildItemPaletteTalkTableLookup(
    paths: RuntimePathSettings,
    strRefs: number[]
  ): Promise<ItemPaletteTalkTableLookup> {
    const uniqueStrRefs = Array.from(new Set(strRefs.filter(isValidItemPaletteTalkTableStrRef)));
    if (uniqueStrRefs.length === 0) {
      return EMPTY_ITEM_PALETTE_TALK_TABLE_LOOKUP;
    }

    const baseRequests = uniqueStrRefs
      .filter((strRef) => strRef < ITEM_PALETTE_CUSTOM_TLK_STRREF_BASE)
      .map((strRef) => ({ strRef, index: strRef }));
    const customRequests = uniqueStrRefs
      .filter((strRef) => strRef >= ITEM_PALETTE_CUSTOM_TLK_STRREF_BASE)
      .map((strRef) => ({
        strRef,
        index: strRef - ITEM_PALETTE_CUSTOM_TLK_STRREF_BASE
      }));
    const [baseStrings, customStrings] = await Promise.all([
      readItemPaletteTalkTableStrings(
        paths.tlkBasePath,
        baseRequests,
        "base",
        this.logger
      ),
      readItemPaletteTalkTableStrings(
        paths.tlkCustomPath,
        customRequests,
        "custom",
        this.logger
      )
    ]);

    return {
      resolve(strRef: number | undefined) {
        if (!isValidItemPaletteTalkTableStrRef(strRef)) {
          return undefined;
        }
        if (strRef >= ITEM_PALETTE_CUSTOM_TLK_STRREF_BASE) {
          return customStrings.get(strRef);
        }
        return baseStrings.get(strRef);
      }
    };
  }

  private mapItemPaletteNode(
    node: ParsedAuroraItpPaletteNode,
    talkTableLookup: ItemPaletteTalkTableLookup
  ): ItemPaletteTreeNode {
    const resolvedLabel = talkTableLookup.resolve(node.strRef)?.text ?? node.label;
    return {
      nodeId: node.nodeId,
      kind: node.kind,
      depth: node.depth,
      label: resolvedLabel,
      ...(node.strRef !== undefined ? { strRef: node.strRef } : {}),
      ...(node.id !== undefined ? { id: node.id } : {}),
      ...(node.resRef ? { resRef: node.resRef } : {}),
      ...(node.name ? { name: node.name } : {}),
      leafCount: node.leafCount,
      folderCount: node.folderCount,
      categoryLeafCount: node.categoryLeafCount,
      children: node.children.map((child) => this.mapItemPaletteNode(child, talkTableLookup))
    };
  }

  private async parseItemPaletteSource(
    settings: RuntimeSettingsRecord,
    resref: string
  ): Promise<{
    resource: OnDemandPlaceableSourceResource;
    palette: ParsedAuroraItpPalette;
  } | null> {
    const resource = await this.resolveItemPaletteResource(settings, resref);
    if (!resource) {
      return null;
    }
    const palette = parseAuroraItpPalette(resource.bytes);
    if (!palette) {
      return null;
    }
    return { resource, palette };
  }

  private async resolveItemPaletteResource(
    settings: RuntimeSettingsRecord,
    resref: string
  ): Promise<OnDemandPlaceableSourceResource | null> {
    const normalizedResref = this.normalizeCreatureRuntimeLookupRef(resref);
    if (!normalizedResref) {
      return null;
    }

    const moduleFound = await this.resolveModuleItemPaletteResource(
      settings,
      normalizedResref
    );
    if (moduleFound) {
      return moduleFound;
    }

    const runtimeFound = await resolvePlaceableSourceResource(
      settings,
      normalizedResref,
      ON_DEMAND_ITP_RESOURCE_CANDIDATES,
      "item"
    );
    return runtimeFound ?? this.resolveLocalItemRetailItp(normalizedResref);
  }

  private async resolveModuleItemPaletteResource(
    settings: RuntimeSettingsRecord,
    resref: string
  ): Promise<OnDemandPlaceableSourceResource | null> {
    if (!this.moduleBlobStorage) {
      return null;
    }
    const key = `${normalizePrefixForLookup(settings.blobStorage.modulePrefix)}${resref}.itp`;
    const payload = await this.moduleBlobStorage.getModuleObject(settings.blobStorage, key);
    if (!payload) {
      return null;
    }
    return {
      extension: "itp",
      resourceType: NWN_KEY_BIF_RESOURCE_TYPES.ITP,
      vanillaDirectory: "",
      resref,
      fileName: payload.key,
      bytes: payload.bytes
    };
  }

  private async resolveLocalItemRetailItp(
    resref: string
  ): Promise<OnDemandPlaceableSourceResource | null> {
    const normalizedResref = this.normalizeCreatureRuntimeLookupRef(resref);
    if (!normalizedResref) {
      return null;
    }
    const existing = localItemRetailItpCache.get(normalizedResref);
    if (existing) {
      return existing;
    }
    const fileName = `${LOCAL_ITEM_RETAIL_ITP_DIR}\\${normalizedResref}.itp`;
    const request = readFile(fileName)
      .then((bytes) => ({
        extension: "itp",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.ITP,
        vanillaDirectory: "itp",
        resref: normalizedResref,
        fileName,
        bytes
      }))
      .catch(() => null);
    localItemRetailItpCache.set(normalizedResref, request);
    return request;
  }

  private async readLocalItemGeneratorSupportSources(): Promise<ItemGeneratorSupportSource[]> {
    const sources: ItemGeneratorSupportSource[] = [];
    const configuredDirs = this.appConfig?.itemGeneratorSourceDirs ?? [];
    const sourceDirs = Array.from(
      new Set(
        [...configuredDirs, ...DEFAULT_ITEM_GENERATOR_SOURCE_DIRS]
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      )
    );

    for (const sourceDir of sourceDirs) {
      let fileNames: string[];
      try {
        fileNames = await readdir(sourceDir);
      } catch {
        continue;
      }

      for (const fileName of fileNames.filter((entry) => entry.toLowerCase().endsWith(".utg"))) {
        const objectKey = resolve(sourceDir, fileName);
        try {
          const bytes = await readFile(objectKey);
          sources.push(
            buildItemGeneratorSupportSource({
              objectKey,
              fileName,
              sizeBytes: bytes.length,
              source: "local-retail-extract",
              bytes
            })
          );
        } catch {
          continue;
        }
      }
    }
    return sources;
  }

  private async resolveLocalItemRetailBaseitemsTwoDa(): Promise<OnDemandPlaceableSourceResource | null> {
    localItemRetailBaseitemsTwoDaCache ??= readFile(LOCAL_ITEM_RETAIL_BASEITEMS_2DA_PATH)
      .then((bytes) => ({
        extension: "2da",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
        vanillaDirectory: "2da",
        resref: "baseitems",
        fileName: LOCAL_ITEM_RETAIL_BASEITEMS_2DA_PATH,
        bytes
      }))
      .catch(() => null);
    return localItemRetailBaseitemsTwoDaCache;
  }

  private async resolveLocalItemRetailItemPropDefTwoDa(): Promise<OnDemandPlaceableSourceResource | null> {
    localItemRetailItemPropDefTwoDaCache ??= readFile(LOCAL_ITEM_RETAIL_ITEMPROPDEF_2DA_PATH)
      .then((bytes) => ({
        extension: "2da",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
        vanillaDirectory: "2da",
        resref: "itempropdef",
        fileName: LOCAL_ITEM_RETAIL_ITEMPROPDEF_2DA_PATH,
        bytes
      }))
      .catch(() => null);
    return localItemRetailItemPropDefTwoDaCache;
  }

  private async resolveLocalItemRetailTwoDa(
    resref: string
  ): Promise<OnDemandPlaceableSourceResource | null> {
    const normalizedResref = this.normalizeCreatureRuntimeLookupRef(resref);
    if (!normalizedResref) {
      return null;
    }
    const existing = localItemRetailTwoDaCache.get(normalizedResref);
    if (existing) {
      return existing;
    }
    const request = readFile(`${LOCAL_ITEM_RETAIL_TWO_DA_DIR}\\${normalizedResref}.2da`)
      .then((bytes) => ({
        extension: "2da",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
        vanillaDirectory: "2da",
        resref: normalizedResref,
        fileName: `${LOCAL_ITEM_RETAIL_TWO_DA_DIR}\\${normalizedResref}.2da`,
        bytes
      }))
      .catch(() => null);
    localItemRetailTwoDaCache.set(normalizedResref, request);
    return request;
  }

  private async resolveItemPropertyTwoDaResource(
    settings: RuntimeSettingsRecord,
    resref: string
  ): Promise<OnDemandPlaceableSourceResource | null> {
    const normalizedResref = this.normalizeCreatureRuntimeLookupRef(resref);
    if (!normalizedResref || /^\d+$/u.test(normalizedResref)) {
      return null;
    }
    const runtimeFound = await resolvePlaceableSourceResource(
      settings,
      normalizedResref,
      ON_DEMAND_TWO_DA_RESOURCE_CANDIDATES
    );
    return runtimeFound ?? this.resolveLocalItemRetailTwoDa(normalizedResref);
  }

  private async buildItemPropertyDictionaryEntry(
    settings: RuntimeSettingsRecord,
    propertyName: number,
    definition: OnDemandItemPropertyDefinitionMetadata
  ): Promise<ItemPropertyDictionaryEntry | null> {
    const costTable = await this.resolveItemPropertyCostTable(settings, definition);
    const param1Table = await this.resolveItemPropertyParam1Table(settings, definition);
    const subTypeTable = this.normalizeCreatureRuntimeLookupRef(definition.subTypeTable ?? "");
    const subtypeOptions = subTypeTable
      ? await this.resolveItemPropertyOptionTable(settings, subTypeTable)
      : [];
    const costValueOptions = costTable.tableResRef
      ? await this.resolveItemPropertyOptionTable(settings, costTable.tableResRef)
      : [];
    const param1Options = param1Table.tableResRef
      ? await this.resolveItemPropertyOptionTable(settings, param1Table.tableResRef)
      : [];
    const label = definition.propertyLabel ?? `Property ${propertyName}`;

    return {
      propertyName,
      label,
      ...(definition.propertyLabel ? { propertyLabel: definition.propertyLabel } : {}),
      ...(definition.cost !== undefined ? { cost: definition.cost } : {}),
      ...(definition.nameStrRef !== undefined ? { nameStrRef: definition.nameStrRef } : {}),
      ...(definition.gameStrRef !== undefined ? { gameStrRef: definition.gameStrRef } : {}),
      ...(definition.descriptionStrRef !== undefined
        ? { descriptionStrRef: definition.descriptionStrRef }
        : {}),
      ...(subTypeTable ? { subTypeTable } : {}),
      ...(costTable.index !== undefined ? { costTableIndex: costTable.index } : {}),
      ...(costTable.label ? { costTableLabel: costTable.label } : {}),
      ...(costTable.tableResRef ? { costTableDefinition: costTable.tableResRef } : {}),
      ...(param1Table.index !== undefined ? { param1TableIndex: param1Table.index } : {}),
      ...(param1Table.label ? { param1TableLabel: param1Table.label } : {}),
      ...(param1Table.tableResRef ? { param1Table: param1Table.tableResRef } : {}),
      subtypeOptions,
      costValueOptions,
      param1Options
    };
  }

  private async resolveItemPropertyCostTable(
    settings: RuntimeSettingsRecord,
    definition: OnDemandItemPropertyDefinitionMetadata
  ): Promise<{ index?: number; label?: string; tableResRef?: string }> {
    const raw = definition.costTableDefinition;
    const index = raw && /^\d+$/u.test(raw) ? Number.parseInt(raw, 10) : undefined;
    const directTable = raw && index === undefined
      ? this.normalizeCreatureRuntimeLookupRef(raw)
      : undefined;
    const table = await this.parseItemPropertyTwoDaTable(settings, "iprp_costtable");
    const row = index !== undefined ? table?.rows.find((entry) => entry.rowId === index) : undefined;
    const rowName = row ? this.readCreatureRuntimeTwoDaLookupRef(row, ["name"]) : undefined;
    const rowLabel = row ? this.readCreatureRuntimeTwoDaString(row, ["label"]) : undefined;
    const tableResRef =
      directTable ??
      (index !== undefined
        ? ITEM_PROPERTY_COST_VALUE_TABLE_BY_COST_TABLE_INDEX.get(index)
        : undefined) ??
      this.normalizeItemPropertyCostTableNameToExistingResref(rowName);
    return {
      ...(index !== undefined ? { index } : {}),
      ...(rowLabel ? { label: rowLabel } : {}),
      ...(tableResRef ? { tableResRef } : {})
    };
  }

  private async resolveItemPropertyParam1Table(
    settings: RuntimeSettingsRecord,
    definition: OnDemandItemPropertyDefinitionMetadata
  ): Promise<{ index?: number; label?: string; tableResRef?: string }> {
    const raw = definition.param1Table;
    const index = raw && /^\d+$/u.test(raw) ? Number.parseInt(raw, 10) : undefined;
    const directTable = raw && index === undefined
      ? this.normalizeCreatureRuntimeLookupRef(raw)
      : undefined;
    const table = await this.parseItemPropertyTwoDaTable(settings, "iprp_paramtable");
    const row = index !== undefined ? table?.rows.find((entry) => entry.rowId === index) : undefined;
    const tableResRef =
      directTable ?? (row ? this.readCreatureRuntimeTwoDaLookupRef(row, ["tableresref"]) : undefined);
    const rowLabel = row
      ? this.readCreatureRuntimeTwoDaString(row, ["label", "lable"])
      : undefined;
    return {
      ...(index !== undefined ? { index } : {}),
      ...(rowLabel ? { label: rowLabel } : {}),
      ...(tableResRef ? { tableResRef } : {})
    };
  }

  private normalizeItemPropertyCostTableNameToExistingResref(
    value: string | undefined
  ): string | undefined {
    const normalized = this.normalizeCreatureRuntimeLookupRef(value ?? "");
    if (!normalized) {
      return undefined;
    }
    const candidate = normalized
      .replace(/^iprp_/u, "iprp_")
      .replace(/cost$/u, "cost");
    return candidate.startsWith("iprp_") ? candidate : undefined;
  }

  private async resolveItemPropertyOptionTable(
    settings: RuntimeSettingsRecord,
    resref: string
  ): Promise<ItemPropertyDictionaryOption[]> {
    const table = await this.parseItemPropertyTwoDaTable(settings, resref);
    if (!table) {
      return [];
    }
    return table.rows
      .map((row): ItemPropertyDictionaryOption | null => {
        const option: ItemPropertyDictionaryOption = {
          rowId: row.rowId,
          sourceKey: table.source?.objectKey ?? resref
        };
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "label",
          this.readCreatureRuntimeTwoDaString(row, ["label", "lable"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "nameStrRef",
          this.readCreatureRuntimeTwoDaInteger(row, ["name", "namestrref"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "value",
          this.readCreatureRuntimeTwoDaInteger(row, ["value"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "cost",
          this.readCreatureRuntimeTwoDaNumber(row, ["cost"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "potionCost",
          this.readCreatureRuntimeTwoDaNumber(row, ["potioncost"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "wandCost",
          this.readCreatureRuntimeTwoDaNumber(row, ["wandcost"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "casterLevel",
          this.readCreatureRuntimeTwoDaNumber(row, ["casterlvl", "casterlevel"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "innateLevel",
          this.readCreatureRuntimeTwoDaNumber(row, ["innatelvl", "innatelevel"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "spellIndex",
          this.readCreatureRuntimeTwoDaInteger(row, ["spellindex"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "potionUse",
          this.readCreatureRuntimeTwoDaBoolean(row, ["potionuse"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "wandUse",
          this.readCreatureRuntimeTwoDaBoolean(row, ["wanduse"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "generalUse",
          this.readCreatureRuntimeTwoDaBoolean(row, ["generaluse"])
        );
        this.setOptionalItemPropertyDictionaryOptionValue(
          option,
          "icon",
          this.readCreatureRuntimeTwoDaLookupRef(row, ["icon"])
        );
        return option.label ||
          option.nameStrRef !== undefined ||
          option.value !== undefined ||
          option.cost !== undefined ||
          option.potionCost !== undefined ||
          option.wandCost !== undefined ||
          option.casterLevel !== undefined ||
          option.innateLevel !== undefined ||
          option.spellIndex !== undefined ||
          option.potionUse !== undefined ||
          option.wandUse !== undefined ||
          option.generalUse !== undefined ||
          option.icon
          ? option
          : null;
      })
      .filter((entry): entry is ItemPropertyDictionaryOption => Boolean(entry));
  }

  private async parseItemPropertyTwoDaTable(
    settings: RuntimeSettingsRecord,
    resref: string
  ): Promise<ReturnType<typeof parseAuroraTwoDaTable> | null> {
    const normalizedResref = this.normalizeCreatureRuntimeLookupRef(resref);
    if (!normalizedResref || /^\d+$/u.test(normalizedResref)) {
      return null;
    }
    const runtimeFound = await resolvePlaceableHakResource(
      settings,
      normalizedResref,
      ON_DEMAND_TWO_DA_RESOURCE_CANDIDATES
    );
    const vanillaFound = await resolvePlaceableVanillaResource(
      settings,
      normalizedResref,
      ON_DEMAND_TWO_DA_RESOURCE_CANDIDATES
    );
    const localFound = await this.resolveLocalItemRetailTwoDa(normalizedResref);
    const runtimeTable = runtimeFound
      ? this.parseItemPropertyTwoDaResource(runtimeFound)
      : null;
    const vanillaTable = vanillaFound
      ? this.parseItemPropertyTwoDaResource(vanillaFound)
      : null;
    const localTable = localFound ? this.parseItemPropertyTwoDaResource(localFound) : null;
    return this.selectItemPropertyTwoDaTable(
      normalizedResref,
      runtimeTable,
      localTable,
      vanillaTable
    );
  }

  private parseItemPropertyTwoDaResource(
    found: OnDemandPlaceableSourceResource
  ): ReturnType<typeof parseAuroraTwoDaTable> | null {
    try {
      return parseAuroraTwoDaTable(found.bytes, {
        tableName: `${found.resref}.2da`,
        profile: "aurora-item",
        sourceObjectKey: found.fileName
      });
    } catch {
      return null;
    }
  }

  private selectItemPropertyTwoDaTable(
    resref: string,
    runtimeTable: ReturnType<typeof parseAuroraTwoDaTable> | null,
    localTable: ReturnType<typeof parseAuroraTwoDaTable> | null,
    vanillaTable: ReturnType<typeof parseAuroraTwoDaTable> | null
  ): ReturnType<typeof parseAuroraTwoDaTable> | null {
    if (
      LOCAL_ITEM_RETAIL_COST_FALLBACK_TWO_DA_RESREFS.has(resref) &&
      runtimeTable &&
      this.tableHasOnlyEmptyCosts(runtimeTable)
    ) {
      if (localTable && this.tableHasAnyNonZeroCost(localTable)) {
        return localTable;
      }
      if (vanillaTable && this.tableHasAnyNonZeroCost(vanillaTable)) {
        return vanillaTable;
      }
    }
    return runtimeTable ?? localTable ?? vanillaTable;
  }

  private tableHasOnlyEmptyCosts(table: ReturnType<typeof parseAuroraTwoDaTable>): boolean {
    let sawCostColumn = false;
    for (const row of table.rows) {
      const value = this.readCreatureRuntimeTwoDaNumber(row, ["cost", "costmodifier"]);
      if (value === undefined) {
        continue;
      }
      sawCostColumn = true;
      if (value !== 0) {
        return false;
      }
    }
    return sawCostColumn;
  }

  private tableHasAnyNonZeroCost(table: ReturnType<typeof parseAuroraTwoDaTable>): boolean {
    return table.rows.some((row) => {
      const value = this.readCreatureRuntimeTwoDaNumber(row, ["cost", "costmodifier"]);
      return value !== undefined && value !== 0;
    });
  }

  private setOptionalItemPropertyDictionaryOptionValue<
    TKey extends keyof ItemPropertyDictionaryOption
  >(
    target: ItemPropertyDictionaryOption,
    key: TKey,
    value: ItemPropertyDictionaryOption[TKey] | undefined
  ): void {
    if (value !== undefined) {
      target[key] = value;
    }
  }

  private async resolveCreatureRuntimeItemPropertyDefinitionLookup(
    settings: RuntimeSettingsRecord
  ): Promise<Map<number, OnDemandItemPropertyDefinitionMetadata>> {
    const runtimeFound = await resolvePlaceableHakResource(
      settings,
      "itempropdef",
      ON_DEMAND_TWO_DA_RESOURCE_CANDIDATES
    );
    const vanillaFound = await resolvePlaceableVanillaResource(
      settings,
      "itempropdef",
      ON_DEMAND_TWO_DA_RESOURCE_CANDIDATES
    );
    const localFound = await this.resolveLocalItemRetailItemPropDefTwoDa();
    const candidates = [runtimeFound, localFound, vanillaFound].filter(
      (candidate): candidate is OnDemandPlaceableSourceResource => Boolean(candidate)
    );
    const lookup = new Map<number, OnDemandItemPropertyDefinitionMetadata>();

    for (const found of candidates) {
      try {
        const table = parseAuroraTwoDaTable(found.bytes, {
          tableName: "itempropdef.2da",
          profile: "aurora-item",
          sourceObjectKey: found.fileName
        });
        for (const row of table.rows) {
          const entry: OnDemandItemPropertyDefinitionMetadata = {
            propertyDefinitionSource2daRow: row.rowId,
            propertyDefinitionSourceKey: found.fileName
          };
          this.setOptionalCreatureRuntimeObjectValue(
            entry,
            "propertyLabel",
            this.readCreatureRuntimeTwoDaString(row, ["label"])
          );
          this.setOptionalCreatureRuntimeObjectValue(
            entry,
            "cost",
            this.readCreatureRuntimeTwoDaNumber(row, ["cost"])
          );
          this.setOptionalCreatureRuntimeObjectValue(
            entry,
            "nameStrRef",
            this.readCreatureRuntimeTwoDaInteger(row, ["name", "namestrref"])
          );
          this.setOptionalCreatureRuntimeObjectValue(
            entry,
            "subTypeTable",
            this.readCreatureRuntimeTwoDaLookupRef(row, [
              "subtyperesref",
              "subtypetable",
              "subtype"
            ])
          );
          this.setOptionalCreatureRuntimeObjectValue(
            entry,
            "costTableDefinition",
            this.readCreatureRuntimeTwoDaLookupRef(row, [
              "costtableresref",
              "costtable",
              "costtable2da"
            ])
          );
          this.setOptionalCreatureRuntimeObjectValue(
            entry,
            "param1Table",
            this.readCreatureRuntimeTwoDaLookupRef(row, [
              "param1resref",
              "param1table",
              "param1"
            ])
          );
          this.setOptionalCreatureRuntimeObjectValue(
            entry,
            "gameStrRef",
            this.readCreatureRuntimeTwoDaInteger(row, ["gamestrref"])
          );
          this.setOptionalCreatureRuntimeObjectValue(
            entry,
            "descriptionStrRef",
            this.readCreatureRuntimeTwoDaInteger(row, [
              "description",
              "descriptionstrref",
              "descstrref"
            ])
          );
          if (Object.keys(entry).length > 2) {
            const existing = lookup.get(row.rowId);
            lookup.set(row.rowId, existing ? mergeItemPropertyDefinitionMetadata(existing, entry) : entry);
          }
        }
      } catch {
        continue;
      }
    }

    return lookup;
  }

  private buildCreatureRuntimeItemTemplateMetadataFromSource(
    resref: string,
    found: OnDemandPlaceableSourceResource,
    blueprint: NonNullable<ReturnType<typeof parseTemplateBlueprintFromGff>>,
    baseItemMetadata: ItemMetadataPrimitiveRecord | undefined,
    itemPropertyDefinitionLookup: ReadonlyMap<number, OnDemandItemPropertyDefinitionMetadata>
  ): Record<string, string | number | boolean> {
    const metadata: Record<string, string | number | boolean> = {
      sourceObjectKey: found.fileName,
      sourceSizeBytes: found.bytes.length,
      sourceExtension: found.extension
    };
    const optionalValues: Record<string, string | number | boolean | undefined> = {
      sourceFileType: blueprint.sourceFileType,
      sourceFileVersion: blueprint.sourceFileVersion,
      sourceStructTypeId: blueprint.sourceStructTypeId,
      templateResRef: blueprint.templateResRef ?? resref,
      localizedName: blueprint.localizedName,
      displayName: blueprint.displayName,
      description: blueprint.description,
      identifiedDescription: blueprint.identifiedDescription,
      comments: blueprint.comments,
      paletteId: blueprint.paletteId,
      tag: blueprint.tag,
      plot: blueprint.plot,
      baseItem: blueprint.baseItem,
      baseItemModelType:
        this.readCreatureRuntimeMetadataString(baseItemMetadata ?? {}, "baseItemModelType") ??
        this.inferCreatureRuntimeItemModelType(resref),
      modelPart1: blueprint.modelPart1,
      modelPart2: blueprint.modelPart2,
      modelPart3: blueprint.modelPart3,
      bodyPartRFoot: blueprint.bodyPartRFoot,
      bodyPartLFoot: blueprint.bodyPartLFoot,
      bodyPartRShin: blueprint.bodyPartRShin,
      bodyPartLShin: blueprint.bodyPartLShin,
      bodyPartLThigh: blueprint.bodyPartLThigh,
      bodyPartRThigh: blueprint.bodyPartRThigh,
      bodyPartPelvis: blueprint.bodyPartPelvis,
      bodyPartTorso: blueprint.bodyPartTorso,
      bodyPartBelt: blueprint.bodyPartBelt,
      bodyPartNeck: blueprint.bodyPartNeck,
      bodyPartRFArm: blueprint.bodyPartRFArm,
      bodyPartLFArm: blueprint.bodyPartLFArm,
      bodyPartRBicep: blueprint.bodyPartRBicep,
      bodyPartLBicep: blueprint.bodyPartLBicep,
      bodyPartRShoul: blueprint.bodyPartRShoul,
      bodyPartLShoul: blueprint.bodyPartLShoul,
      bodyPartRHand: blueprint.bodyPartRHand,
      bodyPartLHand: blueprint.bodyPartLHand,
      bodyPartRobe: blueprint.bodyPartRobe,
      leather1Color: blueprint.leather1Color,
      leather2Color: blueprint.leather2Color,
      cloth1Color: blueprint.cloth1Color,
      cloth2Color: blueprint.cloth2Color,
      metal1Color: blueprint.metal1Color,
      metal2Color: blueprint.metal2Color,
      cost: blueprint.cost,
      addCost: blueprint.addCost,
      costTable: blueprint.costTable,
      costValue: blueprint.costValue,
      charges: blueprint.charges,
      stackSize: blueprint.stackSize,
      identified: blueprint.identified,
      stolen: blueprint.stolen,
      cursed: blueprint.cursed,
      itemArmorPreviewModelPrefix: blueprint.itemArmorPreviewModelPrefix,
      itemArmorPreviewContextLabel: blueprint.itemArmorPreviewContextLabel,
      itemArmorPreviewGender: blueprint.itemArmorPreviewGender,
      itemArmorPreviewPhenotype: blueprint.itemArmorPreviewPhenotype,
      itemArmorPreviewRaceModel: blueprint.itemArmorPreviewRaceModel,
      itemPropertyListCount: blueprint.itemPropertyListCount
    };
    Object.entries(baseItemMetadata ?? {}).forEach(([key, value]) => {
      metadata[key] = value;
    });
    Object.entries(optionalValues).forEach(([key, value]) => {
      if (value !== undefined) {
        metadata[key] = value;
      }
    });
    const itemPropertyListEntries = this.enrichCreatureRuntimeItemPropertyEntries(
      blueprint.itemPropertyListEntries?.map((entry) => ({ ...entry })),
      itemPropertyDefinitionLookup
    );
    if (itemPropertyListEntries.length > 0) {
      metadata.itemPropertyListEntries = JSON.stringify(itemPropertyListEntries);
    }
    for (const [label, scriptResref] of Object.entries(blueprint.scripts ?? {})) {
      if (scriptResref) {
        metadata[`script.${label}`] = scriptResref;
      }
    }
    return metadata;
  }

  private enrichCreatureRuntimeItemPropertyEntries(
    entries: ReadonlyArray<
      Record<string, string | number | boolean | undefined>
    > | undefined,
    itemPropertyDefinitionLookup: ReadonlyMap<number, OnDemandItemPropertyDefinitionMetadata>
  ): ItemMetadataPrimitiveRecord[] {
    return (entries ?? []).map((entry) => {
      const enriched: ItemMetadataPrimitiveRecord = {};
      Object.entries(entry).forEach(([key, value]) => {
        if (value !== undefined) {
          enriched[key] = value;
        }
      });
      const propertyName = this.readCreatureRuntimeMetadataNumber(enriched, "propertyName");
      if (!Number.isInteger(propertyName ?? Number.NaN)) {
        return enriched;
      }
      const definition = itemPropertyDefinitionLookup.get(Math.trunc(propertyName ?? -1));
      Object.entries(definition ?? {}).forEach(([key, value]) => {
        if (value !== undefined) {
          enriched[key] = value;
        }
      });
      return enriched;
    });
  }

  private readCreatureRuntimeItemPropertyMetadataEntries(
    metadata: TemplateRecord["metadata"]
  ): Array<Record<string, string | number | boolean | undefined>> | undefined {
    const value = metadata.itemPropertyListEntries;
    if (typeof value !== "string" || value.trim().length === 0) {
      return undefined;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      return undefined;
    }
    if (!Array.isArray(parsed)) {
      return undefined;
    }

    const entries = parsed
      .filter((entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
      )
      .map((entry) => {
        const normalized: Record<string, string | number | boolean | undefined> = {};
        Object.entries(entry).forEach(([key, candidate]) => {
          if (
            typeof candidate === "string" ||
            typeof candidate === "number" ||
            typeof candidate === "boolean"
          ) {
            normalized[key] = candidate;
          }
        });
        return normalized;
      })
      .filter((entry) => Object.keys(entry).length > 0);

    return entries.length > 0 ? entries : undefined;
  }

  private setOptionalCreatureRuntimeMetadata(
    metadata: ItemMetadataPrimitiveRecord,
    key: string,
    value: string | number | boolean | undefined
  ): void {
    if (value !== undefined) {
      metadata[key] = value;
    }
  }

  private setOptionalCreatureRuntimeObjectValue<T extends object>(
    target: T,
    key: string,
    value: string | number | boolean | undefined
  ): void {
    if (value !== undefined) {
      (target as Record<string, string | number | boolean>)[key] = value;
    }
  }

  private readCreatureRuntimeTwoDaString(
    row: ReturnType<typeof parseAuroraTwoDaTable>["rows"][number],
    columnAliases: string[]
  ): string | undefined {
    const value = this.readCreatureRuntimeTwoDaCell(row, columnAliases);
    return value && value.trim().length > 0 ? value.trim() : undefined;
  }

  private readCreatureRuntimeTwoDaDisplayLabel(
    row: ReturnType<typeof parseAuroraTwoDaTable>["rows"][number]
  ): string | undefined {
    const explicitLabel = this.readCreatureRuntimeTwoDaString(row, [
      "label",
      "description"
    ]);
    if (explicitLabel) {
      return explicitLabel;
    }
    const name = this.readCreatureRuntimeTwoDaString(row, ["name"]);
    return name && !/^\d+$/u.test(name) ? name : undefined;
  }

  private readCreatureRuntimeTwoDaLookupRef(
    row: ReturnType<typeof parseAuroraTwoDaTable>["rows"][number],
    columnAliases: string[]
  ): string | undefined {
    return this.normalizeCreatureRuntimeLookupRef(
      this.readCreatureRuntimeTwoDaCell(row, columnAliases)
    );
  }

  private readCreatureRuntimeTwoDaInteger(
    row: ReturnType<typeof parseAuroraTwoDaTable>["rows"][number],
    columnAliases: string[]
  ): number | undefined {
    const value = this.readCreatureRuntimeTwoDaCell(row, columnAliases);
    if (!value || !/^-?\d+$/u.test(value.trim())) {
      return undefined;
    }
    return Number.parseInt(value.trim(), 10);
  }

  private readCreatureRuntimeTwoDaNumber(
    row: ReturnType<typeof parseAuroraTwoDaTable>["rows"][number],
    columnAliases: string[]
  ): number | undefined {
    const value = this.readCreatureRuntimeTwoDaCell(row, columnAliases);
    if (!value) {
      return undefined;
    }
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private readCreatureRuntimeTwoDaBoolean(
    row: ReturnType<typeof parseAuroraTwoDaTable>["rows"][number],
    columnAliases: string[]
  ): boolean | undefined {
    const value = this.readCreatureRuntimeTwoDaCell(row, columnAliases);
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "n"].includes(normalized)) {
      return false;
    }
    return undefined;
  }

  private readCreatureRuntimeTwoDaCell(
    row: ReturnType<typeof parseAuroraTwoDaTable>["rows"][number],
    columnAliases: string[]
  ): string | undefined {
    const normalizedAliases = new Set(
      columnAliases.map((alias) => this.normalizeCreatureRuntimeTwoDaColumn(alias))
    );
    for (const cell of row.cells) {
      if (!normalizedAliases.has(this.normalizeCreatureRuntimeTwoDaColumn(cell.column))) {
        continue;
      }
      const value = cell.value.trim();
      if (!value || value === BLANK_CELL || cell.blank || cell.missing) {
        return undefined;
      }
      return value;
    }
    return undefined;
  }

  private normalizeCreatureRuntimeTwoDaColumn(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
  }

  private normalizeCreatureRuntimeLookupRef(value: string | undefined): string | undefined {
    const normalized = value?.trim().toLowerCase();
    if (!normalized || normalized === BLANK_CELL.toLowerCase()) {
      return undefined;
    }
    return normalized.replace(/[^a-z0-9_-]+/gu, "_").slice(0, 16);
  }

  private normalizeCreatureRuntimeItemModelType(
    value: string | undefined
  ): string | undefined {
    const normalized = this.normalizeCreatureRuntimeLookupRef(value);
    if (!normalized || /^\d+$/u.test(normalized)) {
      return undefined;
    }
    return normalized;
  }

  private inferCreatureRuntimeItemModelType(resref: string): string | undefined {
    const normalized = resref.trim().toLowerCase();
    const withoutNwPrefix = normalized.startsWith("nw_")
      ? normalized.slice(3)
      : normalized;
    const match = /^([a-z]{3})[a-z0-9_]*$/u.exec(withoutNwPrefix);
    return match?.[1];
  }

  private async getProcessedTemplateByKind(
    kind: TemplateProcessingKind,
    cacheKey: string
  ) {
    const cached = await this.placeableCache.get<TemplateProcessingResult>(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: `${kind.toUpperCase()}_CACHE_NOT_FOUND`,
        message: `${kind} cache entry was not found.`
      });
    }

    const hydrated = await this.ensureTemplateProjection(kind, cacheKey, cached.value);

    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      value: hydrated
    };
  }

  private async resolveTemplateByKind(kind: TemplateProcessingKind, query: TemplateProcessQuery) {
    if (query.templateId) {
      const cachedById = this.getTemplateLookupById(kind, query.templateId);
      if (cachedById) {
        return cachedById;
      }

      const byId = await this.repository.findByKindAndId(kind, query.templateId);
      if (byId) {
        this.cacheTemplateLookup(byId);
        return byId;
      }
    }

    if (query.resref) {
      const cachedByResref = this.getTemplateLookupByResref(kind, query.resref);
      if (cachedByResref) {
        return cachedByResref;
      }

      const byResref = await this.repository.findByKindAndResref(kind, query.resref);
      if (byResref) {
        this.cacheTemplateLookup(byResref);
        return byResref;
      }
    }

    if (kind === "creature") {
      const areaInstanceTemplate = buildAreaInstanceCreatureTemplate(query);
      if (areaInstanceTemplate) {
        return areaInstanceTemplate;
      }
    }

    throw new AppException({
      status: 404,
      code: "TEMPLATE_NOT_FOUND",
      message: `${kind} template was not found.`
    });
  }

  private async buildCreatureAssetManifest(input: {
    templateId: string;
    resref: string;
    metadata: Record<string, string | number | boolean>;
    runtime: CreatureRuntimeProjection;
  }): Promise<PlaceableAssetManifest | undefined> {
    const baseRenderPackage = buildCreatureRenderPackage(input.runtime);
    const directModelResRefs = resolveCreatureDirectModelCandidateResRefs(baseRenderPackage);
    const skeletonModelResRefs =
      resolveCreatureSkeletonModelCandidateResRefs(baseRenderPackage);
    const skeletonSupermodelResRefs =
      resolveCreatureSkeletonSupermodelCandidateResRefs(baseRenderPackage);
    const partModelResRefs = resolveCreaturePartModelCandidateResRefs(baseRenderPackage);
    const equipmentModelResRefs =
      resolveCreatureEquipmentModelCandidateResRefs(baseRenderPackage);
    const lookupRefs = deduplicateOrdered([
      ...directModelResRefs,
      ...skeletonModelResRefs,
      ...skeletonSupermodelResRefs,
      ...partModelResRefs,
      ...equipmentModelResRefs
    ]);
    if (lookupRefs.length === 0) {
      return undefined;
    }

    return this.buildPlaceableAssetManifest({
      templateId: input.templateId,
      resref: input.resref,
      subtype: "generic",
      sourceAssetKind: "creature",
      metadata: {
        ...input.metadata,
        ...(directModelResRefs.length > 0
          ? { creatureDirectModelRefs: directModelResRefs.join("|") }
          : {}),
        ...(skeletonModelResRefs.length > 0
          ? { creatureSkeletonModelRefs: skeletonModelResRefs.join("|") }
          : {}),
        ...(skeletonSupermodelResRefs.length > 0
          ? { creatureSupermodelRefs: skeletonSupermodelResRefs.join("|") }
          : {}),
        ...(partModelResRefs.length > 0
          ? { creaturePartModelRefs: partModelResRefs.join("|") }
          : {}),
        ...(equipmentModelResRefs.length > 0
          ? { creatureEquipmentModelRefs: equipmentModelResRefs.join("|") }
          : {})
      }
    });
  }

  private async buildItemAssetManifest(input: {
    templateId: string;
    resref: string;
    metadata: Record<string, string | number | boolean>;
    runtime: ItemRuntimeProjection;
  }): Promise<PlaceableAssetManifest | undefined> {
    const modelPartFallbackResRefs = this.buildItemModelPartSiblingFallbackResRefs(
      input.runtime.visual.modelPartResRefs,
      input.runtime.visual.modelPartResRefRoles,
      input.runtime.visual.modelParts
    );
    const armorPartFallbackModelResRefs = input.runtime.visual.armorPartModelCandidates.flatMap(
      (candidate) => {
        const modelPrefix = candidate.modelPrefix?.trim().toLowerCase();
        const partModelName = candidate.partModelName?.trim().toLowerCase();
        if (
          modelPrefix !== "pmh0_" ||
          !partModelName ||
          !Number.isInteger(candidate.partId) ||
          candidate.partId <= 1
        ) {
          return [];
        }
        return [`${modelPrefix}${partModelName}001`];
      }
    );
    const modelPartResRefs = deduplicateOrdered(
      [
        ...input.runtime.visual.modelPartResRefs,
        ...modelPartFallbackResRefs,
        ...input.runtime.visual.armorPartModelCandidates.map(
          (candidate) => candidate.modelResRef
        ),
        ...armorPartFallbackModelResRefs
      ].filter((resref) => resref.trim().length > 0)
    );
    const itemIconRefs = deduplicateOrdered(
      [input.runtime.classification.defaultIcon]
        .filter((resref): resref is string => typeof resref === "string")
        .map((resref) => resref.trim())
        .filter((resref) => resref.length > 0)
    );
    const itemTextureRefs = deduplicateOrdered(
      [input.runtime.visual.cloakTextureResRef]
        .filter((resref): resref is string => typeof resref === "string")
        .map((resref) => resref.trim())
        .filter((resref) => resref.length > 0)
    );
    const allItemIconRefs = deduplicateOrdered(
      [
        ...itemIconRefs,
        input.runtime.visual.cloakIconResRef
      ]
        .filter((resref): resref is string => typeof resref === "string")
        .map((resref) => resref.trim())
        .filter((resref) => resref.length > 0)
    );
    if (
      modelPartResRefs.length === 0 &&
      allItemIconRefs.length === 0 &&
      itemTextureRefs.length === 0
    ) {
      return undefined;
    }

    return this.buildPlaceableAssetManifest({
      templateId: input.templateId,
      resref: input.resref,
      subtype: "generic",
      sourceAssetKind: "item",
      metadata: {
        ...input.metadata,
        ...(modelPartResRefs.length > 0
          ? { itemModelRefs: deduplicateOrdered(modelPartResRefs).join("|") }
          : {}),
        ...(allItemIconRefs.length > 0 ? { itemIconRefs: allItemIconRefs.join("|") } : {}),
        ...(itemTextureRefs.length > 0 ? { itemTextureRefs: itemTextureRefs.join("|") } : {})
      }
    });
  }

  private buildItemModelPartSiblingFallbackResRefs(
    modelPartResRefs: string[],
    modelPartResRefRoles: string[],
    modelParts: number[]
  ): string[] {
    if (modelPartResRefs.length <= 1 || modelParts.length <= 1) {
      return [];
    }

    const multiPartRoles = new Set(["blade", "middle", "top"]);
    return deduplicateOrdered(
      modelPartResRefs.flatMap((resref, index) => {
        const normalized = resref.trim().toLowerCase();
        const role = modelPartResRefRoles[index]?.trim().toLowerCase();
        const originalPartId = modelParts[index];
        const separatorIndex = normalized.lastIndexOf("_");
        if (
          !normalized ||
          !role ||
          !multiPartRoles.has(role) ||
          !Number.isInteger(originalPartId) ||
          separatorIndex <= 0
        ) {
          return [];
        }
        const prefix = normalized.slice(0, separatorIndex + 1);
        const suffix = normalized.slice(separatorIndex + 1);
        if (!/^\d{3}$/u.test(suffix)) {
          return [];
        }
        return modelParts
          .filter((partId, siblingIndex) => {
            return (
              siblingIndex !== index &&
              Number.isInteger(partId) &&
              partId > 0 &&
              partId !== originalPartId
            );
          })
          .map((partId) => `${prefix}${Math.trunc(partId).toString().padStart(3, "0")}`);
      })
    );
  }

  private async buildCreatureRenderPackageForCacheEntry(
    cacheKey: string,
    runtime: CreatureRuntimeProjection,
    assetManifest?: PlaceableAssetManifest
  ): Promise<CreatureRenderPackage> {
    const baseRenderPackage = buildCreatureRenderPackage(runtime);
    const directModelResRefs = resolveCreatureDirectModelCandidateResRefs(baseRenderPackage);
    const skeletonModelResRefs =
      resolveCreatureSkeletonModelCandidateResRefs(baseRenderPackage);
    const partModelResRefs = resolveCreaturePartModelCandidateResRefs(baseRenderPackage);
    const equipmentModelResRefs =
      resolveCreatureEquipmentModelCandidateResRefs(baseRenderPackage);
    if (
      !assetManifest ||
      (directModelResRefs.length === 0 &&
        skeletonModelResRefs.length === 0 &&
        partModelResRefs.length === 0 &&
        equipmentModelResRefs.length === 0)
    ) {
      return baseRenderPackage;
    }

    const placeableLikeRenderPackage = buildRenderPackageFromManifest(assetManifest);
    const blobSettings = await this.getBlobStorageSettings();
    const deliveryPackageWithPaths = this.decorateRenderPackageWithDeliveryPaths(
      cacheKey,
      assetManifest,
      placeableLikeRenderPackage,
      blobSettings
    );
    const deliveryPackageWithTextureState =
      await this.decorateRenderPackageWithAuroraTextureState(
        assetManifest,
        deliveryPackageWithPaths
      );
    const deliveryPackage = await this.decorateRenderPackageWithAuroraMaterial(
      assetManifest,
      deliveryPackageWithTextureState
    );
    const sourceMdlInspection =
      await this.collectCreatureSourceMdlInspectionFromSourceModels(assetManifest.assets);
    const sourceMdlInspectionDiagnostics: CreatureRenderPackage["diagnostics"] =
      sourceMdlInspection
        ? [
            ...(sourceMdlInspection.models.length > 0
              ? [
                  {
                    code: "CREATURE_SOURCE_MDL_INSPECTION_READY",
                    severity: "warn" as const,
                    message:
                      "Source MDL scene graph and animation summaries were attached to the creature render package."
                  }
                ]
              : []),
            ...sourceMdlInspection.diagnostics
          ]
        : [];
    const sourceCreatureAuroraEmitter =
      await this.collectAuroraEmitterPayloadFromSourceModels(assetManifest.assets);
    const creatureAuroraEmitterBinding = sourceCreatureAuroraEmitter
      ? bindAuroraEmitterChunkModelAssets(assetManifest, sourceCreatureAuroraEmitter)
      : null;
    const creatureAuroraEmitter = creatureAuroraEmitterBinding?.auroraEmitter;
    const creatureAuroraEmitterDiagnostics: CreatureRenderPackage["diagnostics"] =
      creatureAuroraEmitter
        ? [
            {
              code: "CREATURE_AURORA_MDL_EMITTER_PAYLOAD_READY",
              severity: "warn",
              message:
                "Source MDL emitter nodes were parsed and attached to the creature render package."
            },
            {
              code: "CREATURE_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL",
              severity: "warn",
              message:
                "Source MDL emitter payload is rendered through the viewport particle preview adapter while exact Aurora particle simulation parity remains pending."
            },
            ...((creatureAuroraEmitterBinding?.diagnostics ?? []).map((diagnostic) => ({
              ...diagnostic,
              code: diagnostic.code.replace(/^VFX_/u, "CREATURE_")
            })) as CreatureRenderPackage["diagnostics"])
          ]
        : [];
    const creatureDeliveryAssetRefs =
      creatureAuroraEmitterBinding?.chunkModelAssetIds.length
        ? {
            ...deliveryPackage.assetRefs,
            chunkModelAssetIds: creatureAuroraEmitterBinding.chunkModelAssetIds
          }
        : deliveryPackage.assetRefs;
    const creatureAuroraLight = await this.collectAuroraLightPayloadFromSourceModels(
      assetManifest.assets
    );
    const creatureAuroraLightDiagnostics: CreatureRenderPackage["diagnostics"] =
      creatureAuroraLight
        ? [
            {
              code: "CREATURE_AURORA_MDL_LIGHT_PAYLOAD_READY",
              severity: "warn",
              message:
                "Source MDL light nodes were parsed and attached to the creature render package."
            },
            {
              code: "CREATURE_AURORA_MDL_LIGHT_PREVIEW_NON_CANONICAL",
              severity: "warn",
              message:
                "Source MDL light-node payload is rendered as a viewport preview while exact Aurora dynamic-light parity remains pending."
            }
          ]
        : [];
    const decoratedPartModelCandidates = decorateCreaturePartModelCandidatesWithDeliveryPaths(
      cacheKey,
      assetManifest,
      baseRenderPackage.partModelCandidates,
      blobSettings
    );
    const renderableFallbackPartModelCandidates =
      decorateCreaturePartModelCandidatesWithDeliveryPaths(
        cacheKey,
        assetManifest,
        buildCreaturePhenotypeZeroPartModelFallbackCandidates(
          decoratedPartModelCandidates.filter(
            (candidate) => !hasCreatureModelCandidateDeliveryUrl(candidate)
          )
        ),
        blobSettings
      ).filter(hasCreatureModelCandidateDeliveryUrl);
    const partModelCandidates = mergeCreaturePartModelCandidatesWithFallbacks(
      decoratedPartModelCandidates,
      renderableFallbackPartModelCandidates
    );
    const supermodelRefsByModelResRef =
      await this.collectSupermodelReferencesByDerivedModelResRef(assetManifest.assets);
    const animatedSupermodelRefsByModelResRef =
      buildCreatureAnimatedSupermodelRefsByModelResRef(sourceMdlInspection);
    const equipmentModelCandidates = decorateCreatureEquipmentModelCandidatesWithDeliveryPaths(
      cacheKey,
      assetManifest,
      baseRenderPackage.equipmentModelCandidates,
      blobSettings,
      supermodelRefsByModelResRef,
      animatedSupermodelRefsByModelResRef
    );
    const sourceModelCandidates = decorateCreatureSourceModelCandidatesWithDeliveryPaths(
      cacheKey,
      assetManifest,
      baseRenderPackage.sourceModelCandidates,
      blobSettings,
      supermodelRefsByModelResRef,
      animatedSupermodelRefsByModelResRef
    );
    const skeletonModelCandidates =
      decorateCreatureSkeletonModelCandidatesWithDeliveryPaths(
        cacheKey,
        assetManifest,
        mergeCreatureSkeletonModelCandidatesWithPartModels(
          baseRenderPackage.skeletonModelCandidates,
          partModelCandidates
        ),
        blobSettings,
        supermodelRefsByModelResRef
      );
    const partModelUrlReadyCount = partModelCandidates.filter(
      hasCreatureModelCandidateDeliveryUrl
    ).length;
    const fallbackPartModelUrlReadyCount = renderableFallbackPartModelCandidates.length;
    const renderableEquipmentModelCandidateCount = equipmentModelCandidates.filter(
      (candidate) => (candidate.itemModelPartCandidates?.length ?? 0) > 0
    ).length;
    const equipmentModelUrlReadyCount = equipmentModelCandidates.filter(
      (candidate) =>
        candidate.itemModelPartCandidates?.some((part) => part.glbUrl || part.modelUrl)
    ).length;
    const skeletonModelUrlReadyCount = skeletonModelCandidates.filter(
      (candidate) => candidate.glbUrl || candidate.modelUrl
    ).length;
    const allPartModelUrlsReady =
      partModelCandidates.length > 0 &&
      partModelUrlReadyCount === partModelCandidates.length;
    const skeletonModelDiagnostics: CreatureRenderPackage["diagnostics"] =
      skeletonModelCandidates.length > 0 && skeletonModelUrlReadyCount > 0
        ? [
            {
              code:
                skeletonModelUrlReadyCount === skeletonModelCandidates.length
                  ? "CREATURE_RENDER_BASE_SKELETON_MODEL_ASSETS_READY"
                  : "CREATURE_RENDER_BASE_SKELETON_MODEL_ASSETS_PARTIAL",
              severity: "warn",
              message:
                skeletonModelUrlReadyCount === skeletonModelCandidates.length
                  ? "Creature base skeleton model assets have web delivery URLs for future skinned assembly."
                  : "Some creature base skeleton model assets have web delivery URLs; remaining skeleton candidates still need source assets or derived GLB/Gltf output."
            }
          ]
        : [];
    const fallbackPartModelDiagnostics: CreatureRenderPackage["diagnostics"] =
      fallbackPartModelUrlReadyCount > 0
        ? [
            {
              code: "CREATURE_RENDER_PART_MODEL_FALLBACK_READY",
              severity: "warn" as const,
              message:
                "Exact creature part model is unavailable, but a phenotype-zero/default part fallback has a web delivery URL for visible viewport rendering."
            }
          ]
        : [];
    const equipmentModelDiagnostics: CreatureRenderPackage["diagnostics"] =
      renderableEquipmentModelCandidateCount > 0 && equipmentModelUrlReadyCount > 0
        ? [
            {
              code:
                equipmentModelUrlReadyCount === renderableEquipmentModelCandidateCount
                  ? "CREATURE_RENDER_EQUIPMENT_MODEL_ASSETS_READY"
                  : "CREATURE_RENDER_EQUIPMENT_MODEL_ASSETS_PARTIAL",
              severity: "warn",
              message:
                equipmentModelUrlReadyCount === renderableEquipmentModelCandidateCount
                  ? "Creature equipment model part assets have web delivery URLs for skeleton attachment."
                  : "Some creature equipment model part assets have web delivery URLs; remaining model-backed equipped items still need source assets or derived GLB/Gltf output."
            }
          ]
        : [];
    const directModelDelivery = resolveCreatureDirectModelDeliveryUrl(
      sourceModelCandidates,
      directModelResRefs
    );
    const modelUrlReady =
      typeof directModelDelivery.glbUrl === "string" ||
      typeof directModelDelivery.modelUrl === "string";
    const hasCreatureAuroraEmitterPreview =
      (creatureAuroraEmitter?.emitters.length ?? 0) > 0;

    if (directModelResRefs.length > 0 && deliveryPackage.status === "ready" && modelUrlReady) {
      return {
        ...baseRenderPackage,
        status: "ready",
        diagnostics: [
          ...baseRenderPackage.diagnostics.filter(
            (diagnostic) => diagnostic.code !== "CREATURE_RENDER_SKINNED_GLB_MISSING"
          ),
          ...skeletonModelDiagnostics,
          ...equipmentModelDiagnostics,
          ...sourceMdlInspectionDiagnostics,
          ...creatureAuroraEmitterDiagnostics,
          ...creatureAuroraLightDiagnostics,
          {
            code: "CREATURE_RENDER_DIRECT_MODEL_READY",
            severity: "warn",
            message:
              "Direct appearance source model has a web-renderable GLB/Gltf delivery URL."
          }
        ],
        sourceModelCandidates,
        skeletonModelCandidates,
        partModelCandidates,
        equipmentModelCandidates,
        assetRefs: creatureDeliveryAssetRefs,
        modelUrl: directModelDelivery.modelUrl,
        glbUrl: directModelDelivery.glbUrl,
        textureUrls: deliveryPackage.textureUrls,
        textureBindings: deliveryPackage.textureBindings,
        auroraEmitter: creatureAuroraEmitter,
        auroraMaterial: deliveryPackage.auroraMaterial,
        auroraLight: creatureAuroraLight,
        sourceMdlInspection
      };
    }

    if (directModelResRefs.length > 0 && !modelUrlReady && hasCreatureAuroraEmitterPreview) {
      return {
        ...baseRenderPackage,
        status: "ready",
        diagnostics: [
          ...baseRenderPackage.diagnostics.filter(
            (diagnostic) => diagnostic.code !== "CREATURE_RENDER_SKINNED_GLB_MISSING"
          ),
          ...skeletonModelDiagnostics,
          ...equipmentModelDiagnostics,
          ...sourceMdlInspectionDiagnostics,
          ...creatureAuroraEmitterDiagnostics,
          ...creatureAuroraLightDiagnostics,
          {
            code: "CREATURE_RENDER_EMITTER_PREVIEW_READY",
            severity: "warn",
            message:
              "Direct creature source model has no GLB/Gltf delivery URL, but source MDL emitter payload is ready for visible viewport preview."
          }
        ],
        sourceModelCandidates,
        skeletonModelCandidates,
        partModelCandidates,
        equipmentModelCandidates,
        assetRefs: creatureDeliveryAssetRefs,
        textureUrls: deliveryPackage.textureUrls,
        textureBindings: deliveryPackage.textureBindings,
        auroraEmitter: creatureAuroraEmitter,
        auroraMaterial: deliveryPackage.auroraMaterial,
        auroraLight: creatureAuroraLight,
        sourceMdlInspection
      };
    }

    if (assetManifest.assetCount > 0) {
      const partModelDiagnostics: CreatureRenderPackage["diagnostics"] =
        partModelUrlReadyCount > 0
          ? [
              {
                code:
                  partModelUrlReadyCount === partModelCandidates.length
                    ? "CREATURE_RENDER_CAPART_PART_MODEL_ASSETS_READY"
                    : "CREATURE_RENDER_CAPART_PART_MODEL_ASSETS_PARTIAL",
                severity: "warn",
                message:
                  partModelUrlReadyCount === partModelCandidates.length
                    ? "Creature part/accessory model assets have web delivery URLs; composed skinned GLB assembly is still pending."
                    : "Some creature part/accessory model assets have web delivery URLs; remaining parts still need source assets or derived GLB/Gltf output."
              }
            ]
          : [];
      if (allPartModelUrlsReady) {
        return {
          ...baseRenderPackage,
          status: "ready",
          partModelCandidates,
          equipmentModelCandidates,
          diagnostics: [
            ...baseRenderPackage.diagnostics.filter(
              (diagnostic) => diagnostic.code !== "CREATURE_RENDER_SKINNED_GLB_MISSING"
            ),
            ...skeletonModelDiagnostics,
            ...partModelDiagnostics,
            ...equipmentModelDiagnostics,
            ...fallbackPartModelDiagnostics,
            ...sourceMdlInspectionDiagnostics,
            ...creatureAuroraEmitterDiagnostics,
            ...creatureAuroraLightDiagnostics,
            {
              code: "CREATURE_RENDER_PART_MODEL_GROUP_READY",
              severity: "warn",
              message:
                "Creature part/accessory model delivery URLs are ready for grouped viewport rendering."
            },
            {
              code: "CREATURE_RENDER_SKINNED_GLB_ASSEMBLY_PENDING",
              severity: "warn",
              message:
                "Grouped creature model rendering is available; exact skinned skeleton/animation assembly remains pending."
            }
          ],
          sourceModelCandidates,
          skeletonModelCandidates,
          assetRefs: creatureDeliveryAssetRefs,
          textureUrls: deliveryPackage.textureUrls,
          textureBindings: deliveryPackage.textureBindings,
          auroraEmitter: creatureAuroraEmitter,
          auroraMaterial: deliveryPackage.auroraMaterial,
          auroraLight: creatureAuroraLight,
          sourceMdlInspection
        };
      }
      if (partModelUrlReadyCount > 0) {
        return {
          ...baseRenderPackage,
          status: "ready",
          partModelCandidates,
          equipmentModelCandidates,
          diagnostics: [
            ...baseRenderPackage.diagnostics.filter(
              (diagnostic) => diagnostic.code !== "CREATURE_RENDER_SKINNED_GLB_MISSING"
            ),
            ...skeletonModelDiagnostics,
            ...partModelDiagnostics,
            ...equipmentModelDiagnostics,
            ...fallbackPartModelDiagnostics,
            ...sourceMdlInspectionDiagnostics,
            ...creatureAuroraEmitterDiagnostics,
            ...creatureAuroraLightDiagnostics,
            {
              code: "CREATURE_RENDER_PART_MODEL_GROUP_PARTIAL_READY",
              severity: "warn",
              message:
                "Creature part/accessory model delivery URLs are partially ready for grouped viewport rendering."
            },
            {
              code: "CREATURE_RENDER_SKINNED_GLB_ASSEMBLY_PENDING",
              severity: "warn",
              message:
                "Grouped creature model rendering is available; exact skinned skeleton/animation assembly remains pending."
            }
          ],
          sourceModelCandidates,
          skeletonModelCandidates,
          assetRefs: creatureDeliveryAssetRefs,
          textureUrls: deliveryPackage.textureUrls,
          textureBindings: deliveryPackage.textureBindings,
          auroraEmitter: creatureAuroraEmitter,
          auroraMaterial: deliveryPackage.auroraMaterial,
          auroraLight: creatureAuroraLight,
          sourceMdlInspection
        };
      }
      return {
        ...baseRenderPackage,
        skeletonModelCandidates,
        partModelCandidates,
        equipmentModelCandidates,
        diagnostics: [
          ...baseRenderPackage.diagnostics,
          ...skeletonModelDiagnostics,
          ...partModelDiagnostics,
          ...equipmentModelDiagnostics,
          ...sourceMdlInspectionDiagnostics,
          ...creatureAuroraEmitterDiagnostics,
          ...creatureAuroraLightDiagnostics,
          {
            code:
              directModelResRefs.length > 0
                ? "CREATURE_RENDER_DIRECT_MODEL_DERIVED_MISSING"
                : "CREATURE_RENDER_PART_MODEL_DERIVED_MISSING",
            severity: "error",
            message:
              directModelResRefs.length > 0
                ? "Direct creature source model assets were found, but no derived GLB/Gltf delivery URL is available yet."
                : "Creature part/accessory source model assets were found, but no composed skinned GLB render package is available yet."
          }
        ],
        sourceModelCandidates,
        assetRefs: creatureDeliveryAssetRefs,
        textureUrls: deliveryPackage.textureUrls,
        textureBindings: deliveryPackage.textureBindings,
        auroraEmitter: creatureAuroraEmitter,
        auroraMaterial: deliveryPackage.auroraMaterial,
        auroraLight: creatureAuroraLight,
        sourceMdlInspection
      };
    }

    return baseRenderPackage;
  }

  private async ensureCachedAssetManifestForDelivery(
    cacheKey: string,
    value: PlaceableProcessingResult | TemplateProcessingResult
  ): Promise<{ assetManifest: PlaceableAssetManifest }> {
    if (isTemplateProcessingResult(value)) {
      if (hasCachedAssetManifest(value)) {
        return value;
      }

      const hydrated = await this.ensureTemplateProjection(value.kind, cacheKey, value);
      if (hasCachedAssetManifest(hydrated)) {
        return hydrated;
      }

      throw new AppException({
        status: 404,
        code: "PLACEABLE_ASSET_NOT_FOUND",
        message: "Cached template result does not expose an asset manifest."
      });
    }

    return this.ensurePlaceableManifest(cacheKey, value, { inspectSourceModels: false });
  }

  private async ensurePlaceableManifest(
    cacheKey: string,
    value: PlaceableProcessingResult,
    options: { inspectSourceModels?: boolean } = {}
  ): Promise<PlaceableProcessingResult> {
    const inspectSourceModels = options.inspectSourceModels !== false;
    const withProjection = await this.ensurePlaceableProjection(cacheKey, value, {
      inspectSourceModels
    });
    if (isAreaInstanceHelperRenderSuppressed(withProjection.metadata)) {
      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: buildEmptyPlaceableAssetManifest(),
        renderPackage: buildAreaInstanceMissingModelRenderPackage(withProjection.metadata)
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      return refreshed;
    }

    const hasManifest = withProjection.assetManifest?.version === "placeable-asset-manifest/v1";
    if (!hasManifest) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: withProjection.templateId,
        resref: withProjection.resref,
        subtype: withProjection.placeableSubtype,
        metadata: withProjection.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: manifest,
        renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
          cacheKey,
          manifest,
          withProjection.placeableSubtype,
          withProjection.metadata,
          { inspectSourceModels }
        )
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    const manifestModuleHash = withProjection.assetManifest.moduleHash;
    const shouldRefreshForExactModelLookup =
      this.shouldRefreshManifestForExactModelLookupMismatch(withProjection);
    if (shouldRefreshForExactModelLookup) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: withProjection.templateId,
        resref: withProjection.resref,
        subtype: withProjection.placeableSubtype,
        metadata: withProjection.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: manifest,
        renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
          cacheKey,
          manifest,
          withProjection.placeableSubtype,
          withProjection.metadata,
          { inspectSourceModels }
        )
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    if (this.isManifestValidationFresh(cacheKey, manifestModuleHash)) {
      return this.ensureRenderPackageDeliveryPaths(cacheKey, withProjection, {
        inspectSourceModels
      });
    }

    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
      this.rememberManifestValidation(cacheKey, manifestModuleHash);
      return this.ensureRenderPackageDeliveryPaths(cacheKey, withProjection, {
        inspectSourceModels
      });
    }

    const hasEmptyPlaceholderManifest =
      Boolean(this.runtimeSettingsRepository && this.moduleBlobStorage) &&
      !manifestModuleHash &&
      withProjection.assetManifest.assetCount === 0 &&
      withProjection.assetManifest.candidatesScanned === 0 &&
      withProjection.assetManifest.assets.length === 0;
    if (hasEmptyPlaceholderManifest) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: withProjection.templateId,
        resref: withProjection.resref,
        subtype: withProjection.placeableSubtype,
        metadata: withProjection.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: manifest,
        renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
          cacheKey,
          manifest,
          withProjection.placeableSubtype,
          withProjection.metadata,
          { inspectSourceModels }
        )
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    const shouldRefreshForLegacyModelRoleRecovery =
      this.shouldRefreshManifestForLegacyModelRoleRecovery(withProjection);
    if (shouldRefreshForLegacyModelRoleRecovery) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: withProjection.templateId,
        resref: withProjection.resref,
        subtype: withProjection.placeableSubtype,
        metadata: withProjection.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: manifest,
        renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
          cacheKey,
          manifest,
          withProjection.placeableSubtype,
          withProjection.metadata,
          { inspectSourceModels }
        )
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    const shouldRefreshForVfxChunkModelRecovery =
      this.shouldRefreshManifestForVfxChunkModelRecovery(withProjection);
    if (shouldRefreshForVfxChunkModelRecovery) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: withProjection.templateId,
        resref: withProjection.resref,
        subtype: withProjection.placeableSubtype,
        metadata: withProjection.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: manifest,
        renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
          cacheKey,
          manifest,
          withProjection.placeableSubtype,
          withProjection.metadata,
          { inspectSourceModels }
        )
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    const shouldRefreshForTextureRecovery =
      inspectSourceModels &&
      (await this.shouldRefreshManifestForTextureRecovery(withProjection));
    if (shouldRefreshForTextureRecovery) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: withProjection.templateId,
        resref: withProjection.resref,
        subtype: withProjection.placeableSubtype,
        metadata: withProjection.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: manifest,
        renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
          cacheKey,
          manifest,
          withProjection.placeableSubtype,
          withProjection.metadata,
          { inspectSourceModels }
        )
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    const currentModuleHash = await this.getCurrentModuleHash();
    const shouldRefreshManifest =
      typeof currentModuleHash === "string" &&
        currentModuleHash.length > 0 &&
        manifestModuleHash !== currentModuleHash;

    if (!shouldRefreshManifest) {
      this.rememberManifestValidation(cacheKey, manifestModuleHash);
      return this.ensureRenderPackageDeliveryPaths(cacheKey, withProjection, {
        inspectSourceModels
      });
    }

    const manifest = await this.buildPlaceableAssetManifest({
      templateId: withProjection.templateId,
      resref: withProjection.resref,
      subtype: withProjection.placeableSubtype,
      metadata: withProjection.metadata
    });

    const refreshed: PlaceableProcessingResult = {
      ...withProjection,
      assetManifest: manifest,
      renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
        cacheKey,
        manifest,
        withProjection.placeableSubtype,
        withProjection.metadata,
        { inspectSourceModels }
      )
    };
    await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
    this.rememberManifestValidation(cacheKey, manifest.moduleHash);
    return refreshed;
  }

  private shouldRefreshManifestForLegacyModelRoleRecovery(
    value: PlaceableProcessingResult
  ): boolean {
    const assets = value.assetManifest?.assets ?? [];
    const hasLegacySourceModel = assets.some(
      (asset) => asset.role === "unknown" && isAuroraSourceModelAssetEntry(asset)
    );
    if (!hasLegacySourceModel) {
      return false;
    }

    const renderPackage = value.renderPackage;
    return (
      !renderPackage ||
      renderPackage.status === "unsupported" ||
      (renderPackage.assetRefs.modelAssetIds?.length ?? 0) === 0
    );
  }

  private shouldRefreshManifestForExactModelLookupMismatch(
    value: PlaceableProcessingResult
  ): boolean {
    const exactModelResRef = resolvePrimaryPlaceableModelLookupResRef(value.metadata);
    if (!exactModelResRef || !value.renderPackage) {
      return false;
    }

    const primaryModelAssetIds = [
      ...(value.renderPackage.assetRefs.derivedModelAssetIds ?? []),
      ...(value.renderPackage.assetRefs.modelAssetIds ?? [])
    ];
    if (primaryModelAssetIds.length === 0) {
      return false;
    }

    const assetsById = new Map(
      (value.assetManifest?.assets ?? []).map((asset) => [asset.assetId, asset])
    );
    return primaryModelAssetIds.some((assetId) => {
      const asset = assetsById.get(assetId);
      if (!asset) {
        return true;
      }
      const basename = extractBasename(asset.fileName);
      return !basename || !hasAuroraResourceBasename(new Set([basename]), exactModelResRef);
    });
  }

  private shouldRefreshManifestForVfxChunkModelRecovery(
    value: PlaceableProcessingResult
  ): boolean {
    const emitters = value.renderPackage?.auroraEmitter?.emitters ?? [];
    const hasChunkName = emitters.some((emitter) =>
      Boolean(normalizeAuroraModelResourceReference(emitter.chunkName))
    );
    if (!hasChunkName) {
      return false;
    }
    const hasResolvedChunkModel = emitters.some(
      (emitter) =>
        typeof emitter.chunkModelAssetId === "string" &&
        emitter.chunkModelAssetId.trim().length > 0
    );
    if (hasResolvedChunkModel) {
      return false;
    }
    return (value.renderPackage?.diagnostics ?? []).some(
      (diagnostic) =>
        diagnostic.code === "VFX_CHUNK_MODEL_MISSING" ||
        diagnostic.code === "VFX_CHUNK_MODEL_DERIVED_MISSING" ||
        diagnostic.code === "VFX_CHUNK_MODEL_RESOLVER_REQUIRED"
    );
  }

  private async shouldRefreshManifestForTextureRecovery(
    value: PlaceableProcessingResult
  ): Promise<boolean> {
    const renderStatus = value.renderPackage?.status;
    if (renderStatus !== "ready" && renderStatus !== "missing_derived") {
      return false;
    }

    const assets = value.assetManifest?.assets ?? [];
    const hasTextureAsset = assets.some((asset) => asset.role === "texture");
    if (hasTextureAsset) {
      return false;
    }

    const referencedTextures = deduplicateOrdered([
      ...(await this.collectTextureReferencesFromDerivedModels(assets)),
      ...(await this.collectTextureReferencesFromSourceModels(assets))
    ]);
    return referencedTextures.length > 0;
  }

  private async ensurePlaceableProjection(
    cacheKey: string,
    value: PlaceableProcessingResult,
    options: { inspectSourceModels?: boolean } = {}
  ): Promise<PlaceableProcessingResult> {
    const inspectSourceModels = options.inspectSourceModels !== false;
    const hasCurrentRuntimeProjection = this.hasCurrentPlaceableRuntimeLightStateProjection(value);
    if (
      hasCurrentRuntimeProjection &&
      value.placeableValidationIssues &&
      value.renderPackage
    ) {
      return this.ensureRenderPackageDeliveryPaths(cacheKey, value, {
        inspectSourceModels
      });
    }

    const placeableRuntime = hasCurrentRuntimeProjection
      ? value.placeableRuntime!
      : buildPlaceableRuntimeProjection(value.metadata);
    const placeableValidationIssues =
      hasCurrentRuntimeProjection && value.placeableValidationIssues
        ? value.placeableValidationIssues
        : buildPlaceableValidationIssues(placeableRuntime);
    const assetManifest = value.assetManifest ?? buildEmptyPlaceableAssetManifest();
    const renderPackage =
      value.renderPackage ??
      (await this.buildPlaceableRenderPackageForCacheEntry(
        cacheKey,
        assetManifest,
        value.placeableSubtype,
        value.metadata,
        { inspectSourceModels }
      ));

    const refreshed: PlaceableProcessingResult = {
      ...value,
      assetManifest,
      placeableRuntime,
      placeableValidationIssues,
      renderPackage
    };
    return refreshed;
  }

  private hasCurrentPlaceableRuntimeLightStateProjection(
    value: PlaceableProcessingResult
  ): value is PlaceableProcessingResult & {
    placeableRuntime: NonNullable<PlaceableProcessingResult["placeableRuntime"]>;
  } {
    const state = value.placeableRuntime?.state;
    return Boolean(
      state &&
        typeof state.lightState === "number" &&
        typeof state.lightStateSource === "string" &&
        state.lightStateSource.trim().length > 0 &&
        typeof state.lightStateProofStatus === "string" &&
        state.lightStateProofStatus.trim().length > 0 &&
        typeof state.lightStateDefaulted === "boolean"
    );
  }

  private async buildPlaceableRenderPackageForCacheEntry(
    cacheKey: string,
    assetManifest: PlaceableAssetManifest,
    subtype?: PlaceableSubtype,
    metadata?: Record<string, string | number | boolean>,
    options: { inspectSourceModels?: boolean } = {}
  ): Promise<PlaceableRenderPackage> {
    const inspectSourceModels = options.inspectSourceModels !== false;
    const renderManifest =
      buildPrimaryModelRenderManifestForExactLookup(assetManifest, metadata);
    const renderPackage = this.decorateVfxRenderPackageDiagnostics(
      buildRenderPackageFromManifest(renderManifest),
      subtype
    );
    const textureDiagnosticPackage =
      await this.decorateRenderPackageWithMissingTextureDiagnostics(
        assetManifest,
        renderPackage,
        { inspectSourceModels }
      );
    const blobSettings = await this.getBlobStorageSettings();
    const deliveryPackage = this.decorateRenderPackageWithDeliveryPaths(
      cacheKey,
      assetManifest,
      textureDiagnosticPackage,
      blobSettings
    );
    const textureStatePackage = await this.decorateRenderPackageWithAuroraTextureState(
      assetManifest,
      deliveryPackage
    );
    const materialRenderPackage = await this.decorateRenderPackageWithAuroraMaterial(
      assetManifest,
      textureStatePackage,
      subtype
    );
    const emitterRenderPackage = await this.decorateRenderPackageWithAuroraEmitter(
      assetManifest,
      materialRenderPackage,
      subtype,
      { parseSourceModels: inspectSourceModels }
    );
    return this.decorateRenderPackageWithAuroraLight(
      assetManifest,
      emitterRenderPackage,
      subtype
    );
  }

  private decorateVfxRenderPackageDiagnostics(
    renderPackage: PlaceableRenderPackage,
    subtype?: PlaceableSubtype
  ): PlaceableRenderPackage {
    if (subtype !== "vfx") {
      return renderPackage;
    }

    const diagnostics = [...renderPackage.diagnostics];
    const addDiagnostic = (diagnostic: PlaceableRenderPackage["diagnostics"][number]) => {
      if (diagnostics.some((entry) => entry.code === diagnostic.code)) {
        return;
      }
      diagnostics.push(diagnostic);
    };

    addDiagnostic({
      code: "VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT",
      severity: "warn",
      message:
        "Placeable VFX is catalog/source-list data; it is not an EffectVisualEffect instance."
    });

    if ((renderPackage.assetRefs.derivedModelAssetIds?.length ?? 0) > 0) {
      addDiagnostic({
        code: "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY",
        severity: "warn",
        message:
          "Derived model delivery is preview provenance only; Aurora VFX phase scheduling is not mapped yet."
      });
    }

    return {
      ...renderPackage,
      diagnostics
    };
  }

  private async ensureRenderPackageDeliveryPaths(
    cacheKey: string,
    value: PlaceableProcessingResult,
    options: { inspectSourceModels?: boolean } = {}
  ): Promise<PlaceableProcessingResult> {
    if (!value.renderPackage) {
      return value;
    }
    const inspectSourceModels = options.inspectSourceModels !== false;

    const textureDiagnosticPackage =
      await this.decorateRenderPackageWithMissingTextureDiagnostics(
        value.assetManifest,
        this.decorateVfxRenderPackageDiagnostics(value.renderPackage, value.placeableSubtype),
        { inspectSourceModels }
      );
    const blobSettings = await this.getBlobStorageSettings();
    const deliveryPackage = this.decorateRenderPackageWithDeliveryPaths(
      cacheKey,
      value.assetManifest,
      textureDiagnosticPackage,
      blobSettings
    );
    const textureStatePackage = await this.decorateRenderPackageWithAuroraTextureState(
      value.assetManifest,
      deliveryPackage
    );
    const materialRenderPackage = await this.decorateRenderPackageWithAuroraMaterial(
      value.assetManifest,
      textureStatePackage,
      value.placeableSubtype
    );
    const emitterRenderPackage = await this.decorateRenderPackageWithAuroraEmitter(
      value.assetManifest,
      materialRenderPackage,
      value.placeableSubtype,
      { parseSourceModels: inspectSourceModels }
    );
    const renderPackage = await this.decorateRenderPackageWithAuroraLight(
      value.assetManifest,
      emitterRenderPackage,
      value.placeableSubtype
    );
    return {
      ...value,
      renderPackage
    };
  }

  private async decorateRenderPackageWithAuroraTextureState(
    assetManifest: PlaceableAssetManifest,
    renderPackage: PlaceableRenderPackage
  ): Promise<PlaceableRenderPackage> {
    if (!renderPackage.textureBindings || renderPackage.textureBindings.length === 0) {
      return renderPackage;
    }

    const txiStateByReference =
      await this.collectAuroraTextureStatePayloadFromMaterialAssets(assetManifest.assets);
    if (txiStateByReference.size === 0) {
      return renderPackage;
    }

    let didAttachState = false;
    const textureBindings = renderPackage.textureBindings.map((binding) => {
      const reference = extractBasename(binding.reference || binding.fileName);
      const txi = txiStateByReference.get(reference);
      if (!txi) {
        return binding;
      }
      didAttachState = true;
      return {
        ...binding,
        txi
      };
    });

    return didAttachState
      ? {
          ...renderPackage,
          textureBindings
        }
      : renderPackage;
  }

  private async collectAuroraTextureStatePayloadFromMaterialAssets(
    assets: PlaceableAssetEntry[]
  ): Promise<
    Map<string, NonNullable<PlaceableRenderPackage["textureBindings"]>[number]["txi"]>
  > {
    const txiStateByReference = new Map<
      string,
      NonNullable<PlaceableRenderPackage["textureBindings"]>[number]["txi"]
    >();
    const txiAssets = assets.filter(
      (asset) => asset.role === "material" && asset.extension === "txi"
    );
    for (const asset of txiAssets) {
      const reference = extractBasename(asset.fileName);
      if (!reference || txiStateByReference.has(reference)) {
        continue;
      }

      let payload: ModuleBlobObjectPayload | null = null;
      try {
        payload = await this.readModuleBlobObject(asset.objectKey);
      } catch {
        payload = null;
      }
      if (!payload || payload.bytes.length === 0) {
        continue;
      }

      const state = collectAuroraTextureTxiState(payload.bytes);
      if (state) {
        txiStateByReference.set(reference, state);
      }
    }
    return txiStateByReference;
  }

  private async decorateRenderPackageWithAuroraMaterial(
    assetManifest: PlaceableAssetManifest,
    renderPackage: PlaceableRenderPackage,
    subtype?: PlaceableSubtype
  ): Promise<PlaceableRenderPackage> {
    void subtype;
    if (renderPackage.auroraMaterial) {
      return renderPackage;
    }

    const auroraMaterial = await this.collectAuroraMaterialPayloadFromMaterialAssets(
      assetManifest.assets
    );
    if (!auroraMaterial) {
      return renderPackage;
    }

    return {
      ...renderPackage,
      diagnostics: mergeRenderPackageDiagnostics(renderPackage.diagnostics, [
        {
          code: "PLACEABLE_AURORA_MTR_MATERIAL_STATE_PRESERVED",
          severity: "warn",
          message:
            "Aurora MTR source state was parsed and attached to the backend render contract."
        }
      ]),
      auroraMaterial
    };
  }

  private async collectAuroraMaterialPayloadFromMaterialAssets(
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableRenderPackage["auroraMaterial"] | undefined> {
    const materialAssets = assets.filter(
      (asset) => asset.role === "material" && asset.extension === "mtr"
    );
    if (materialAssets.length === 0) {
      return undefined;
    }

    const materials: NonNullable<PlaceableRenderPackage["auroraMaterial"]>["materials"] =
      [];
    const diagnostics: PlaceableRenderPackage["diagnostics"] = [];
    for (const asset of materialAssets) {
      let payload: ModuleBlobObjectPayload | null = null;
      try {
        payload = await this.readModuleBlobObject(asset.objectKey);
      } catch {
        payload = null;
      }
      if (!payload || payload.bytes.length === 0) {
        diagnostics.push({
          code: "VFX_AURORA_MTR_SOURCE_UNREADABLE",
          severity: "warn",
          message: `Material ${asset.fileName} could not be read for Aurora MTR state parsing.`
        });
        continue;
      }

      const state = collectAuroraMaterialState(payload.bytes);
      if (!state) {
        continue;
      }
      materials.push({
        source: "aurora-mtr",
        materialAssetId: asset.assetId,
        materialFileName: asset.fileName,
        materialObjectKey: asset.objectKey,
        state
      });
    }

    if (materials.length === 0) {
      return undefined;
    }

    return {
      source: "mtr",
      materials,
      diagnostics
    };
  }

  private async decorateRenderPackageWithMissingTextureDiagnostics(
    assetManifest: PlaceableAssetManifest,
    renderPackage: PlaceableRenderPackage,
    options: { inspectSourceModels?: boolean } = {}
  ): Promise<PlaceableRenderPackage> {
    if (renderPackage.status !== "ready" && renderPackage.status !== "missing_derived") {
      return renderPackage;
    }

    const textureBasenames = new Set(
      assetManifest.assets
        .filter((asset) => asset.role === "texture")
        .map((asset) => extractBasename(asset.fileName))
        .filter((value) => value.length > 0)
    );
    if (textureBasenames.size > 0) {
      return renderPackage;
    }

    const materialBasenames = new Set(
      assetManifest.assets
        .filter((asset) => asset.role === "material" && asset.extension === "mtr")
        .map((asset) => extractBasename(asset.fileName))
        .filter((value) => value.length > 0)
    );
    const referencedTextures = deduplicateOrdered([
      ...(await this.collectTextureReferencesFromDerivedModels(assetManifest.assets)),
      ...(options.inspectSourceModels === false
        ? []
        : await this.collectTextureReferencesFromSourceModels(assetManifest.assets)),
      ...(await this.collectTextureReferencesFromMaterialAssets(assetManifest.assets))
    ]).filter((reference) => !hasAuroraResourceBasename(materialBasenames, reference));
    const missingTextureRefs = referencedTextures.filter(
      (reference) => !hasAuroraResourceBasename(textureBasenames, reference)
    );

    if (missingTextureRefs.length === 0) {
      return renderPackage;
    }

    const sample = missingTextureRefs.slice(0, 8).join(", ");
    const suffix =
      missingTextureRefs.length > 8 ? `, +${missingTextureRefs.length - 8} more` : "";
    return {
      ...renderPackage,
      diagnostics: mergeRenderPackageDiagnostics(renderPackage.diagnostics, [
        {
          code: "PLACEABLE_RENDER_TEXTURES_MISSING",
          severity: "warn",
          message:
            `Placeable model references texture resources that are absent from the current module/HAK/vanilla sources: ${sample}${suffix}.`
        }
      ])
    };
  }

  private async decorateRenderPackageWithAuroraEmitter(
    assetManifest: PlaceableAssetManifest,
    renderPackage: PlaceableRenderPackage,
    subtype?: PlaceableSubtype,
    options: { parseSourceModels?: boolean } = {}
  ): Promise<PlaceableRenderPackage> {
    const isVfxPlaceable = subtype === "vfx";

    if (renderPackage.auroraEmitter) {
      const chunkBindingResult = bindAuroraEmitterChunkModelAssets(
        assetManifest,
        renderPackage.auroraEmitter
      );

      return promoteAuroraEmitterRenderPackage({
        ...renderPackage,
        assetRefs: {
          ...renderPackage.assetRefs,
          ...(chunkBindingResult.chunkModelAssetIds.length > 0
            ? {
                chunkModelAssetIds: chunkBindingResult.chunkModelAssetIds
              }
            : {})
        },
        diagnostics: mergeRenderPackageDiagnostics(
          renderPackage.diagnostics,
          buildAuroraEmitterRenderPackageDiagnostics(
            isVfxPlaceable,
            chunkBindingResult.diagnostics
          )
        ),
        auroraEmitter: chunkBindingResult.auroraEmitter
      });
    }

    if (options.parseSourceModels === false) {
      return renderPackage;
    }

    const auroraEmitter = await this.collectAuroraEmitterPayloadFromSourceModels(
      assetManifest.assets
    );
    if (!auroraEmitter) {
      return isVfxPlaceable
        ? {
            ...renderPackage,
            diagnostics: mergeRenderPackageDiagnostics(renderPackage.diagnostics, [
              {
                code: "VFX_AURORA_MDL_EMITTER_PAYLOAD_MISSING",
                severity: "warn",
                message:
                  "No source MDL emitter node could be parsed for this VFX placeable."
              }
            ])
          }
        : renderPackage;
    }

    const chunkBindingResult = bindAuroraEmitterChunkModelAssets(
      assetManifest,
      auroraEmitter
    );

    return promoteAuroraEmitterRenderPackage({
      ...renderPackage,
      assetRefs: {
        ...renderPackage.assetRefs,
        ...(chunkBindingResult.chunkModelAssetIds.length > 0
          ? {
              chunkModelAssetIds: chunkBindingResult.chunkModelAssetIds
            }
        : {})
      },
      diagnostics: mergeRenderPackageDiagnostics(
        renderPackage.diagnostics,
        buildAuroraEmitterRenderPackageDiagnostics(
          isVfxPlaceable,
          chunkBindingResult.diagnostics
        )
      ),
      auroraEmitter: chunkBindingResult.auroraEmitter
    });
  }

  private async collectAuroraEmitterPayloadFromSourceModels(
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableRenderPackage["auroraEmitter"] | undefined> {
    const sourceModelAssets = selectAuroraEmitterSourceModelAssets(
      assets.filter(isAuroraSourceModelAssetEntry)
    );
    if (sourceModelAssets.length === 0) {
      return undefined;
    }

    const emitters: NonNullable<PlaceableRenderPackage["auroraEmitter"]>["emitters"] = [];
    const diagnostics: PlaceableRenderPackage["diagnostics"] = [];

    for (const asset of sourceModelAssets) {
      let payload: ModuleBlobObjectPayload | null = null;
      try {
        payload = await this.readModuleBlobObject(asset.objectKey);
      } catch {
        payload = null;
      }
      if (!payload || payload.bytes.length === 0) {
        diagnostics.push({
          code: "VFX_AURORA_MDL_SOURCE_UNREADABLE",
          severity: "warn",
          message: `Source model ${asset.fileName} could not be read for emitter parsing.`
        });
        continue;
      }

      const parsed = collectAuroraSourceModelEmitters(payload.bytes, {
        sourceModelObjectKey: asset.objectKey,
        sourceModelFileName: asset.fileName,
        sourceModelHash: asset.etag
      });
      for (const emitter of parsed.emitters) {
        emitters.push({
          source: parsed.source,
          sourceModelAssetId: asset.assetId,
          sourceModelFileName: asset.fileName,
          sourceModelObjectKey: asset.objectKey,
          nodeName: emitter.nodeName,
          texture: emitter.texture,
          chunkName: emitter.chunkName,
          emitterType: emitter.emitterType,
          renderMode: emitter.renderMode,
          blendMode: emitter.blendMode,
          atlas: emitter.atlas,
          simulation: emitter.simulation,
          transform: emitter.transform,
          referenceNodes: emitter.referenceNodes,
          events: emitter.events,
          animations: emitter.animations,
          sourceState: emitter.sourceState
        });
      }
    }

    if (emitters.length === 0) {
      return undefined;
    }

    return {
      source: "source-mdl",
      emitters,
      diagnostics
    };
  }

  private async decorateRenderPackageWithAuroraLight(
    assetManifest: PlaceableAssetManifest,
    renderPackage: PlaceableRenderPackage,
    subtype?: PlaceableSubtype
  ): Promise<PlaceableRenderPackage> {
    if (subtype !== "vfx" && subtype !== "light_source") {
      return renderPackage;
    }
    if (renderPackage.auroraLight) {
      return promoteAuroraLightRenderPackage(renderPackage);
    }
    const hasEmitterPayload =
      renderPackage.auroraEmitter?.emitters.some((emitter) =>
        Boolean(
          emitter.renderMode ||
            emitter.emitterType ||
            emitter.texture ||
            emitter.chunkName ||
            emitter.simulation
        )
      ) === true;
    if (hasEmitterPayload) {
      return renderPackage;
    }

    const auroraLight = await this.collectAuroraLightPayloadFromSourceModels(
      assetManifest.assets
    );
    if (!auroraLight) {
      return renderPackage;
    }

    return promoteAuroraLightRenderPackage({
      ...renderPackage,
      diagnostics: mergeRenderPackageDiagnostics(renderPackage.diagnostics, [
        ...(subtype === "light_source"
          ? [
              {
                code: "PLACEABLE_AURORA_MDL_LIGHT_PAYLOAD_READY",
                severity: "warn" as const,
                message:
                  "Source MDL light nodes were parsed and attached to the light-source placeable render package."
              }
            ]
          : []),
        {
          code: "VFX_AURORA_MDL_LIGHT_PAYLOAD_READY",
          severity: "warn",
          message:
            "Source MDL light nodes were parsed and attached to the render package."
        },
        {
          code: "VFX_AURORA_MDL_LIGHT_PREVIEW_NON_CANONICAL",
          severity: "warn",
          message:
            "Source MDL light-node payload is preview-only; canonical VFX runtime still requires source rows and effect-instance context."
        }
      ]),
      auroraLight
    });
  }

  private async collectAuroraLightPayloadFromSourceModels(
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableRenderPackage["auroraLight"] | undefined> {
    const sourceModelAssets = selectAuroraEmitterSourceModelAssets(
      assets.filter(isAuroraSourceModelAssetEntry)
    );
    if (sourceModelAssets.length === 0) {
      return undefined;
    }

    const lights: NonNullable<PlaceableRenderPackage["auroraLight"]>["lights"] = [];
    const diagnostics: PlaceableRenderPackage["diagnostics"] = [];

    for (const asset of sourceModelAssets) {
      let payload: ModuleBlobObjectPayload | null = null;
      try {
        payload = await this.readModuleBlobObject(asset.objectKey);
      } catch {
        payload = null;
      }
      if (!payload || payload.bytes.length === 0) {
        diagnostics.push({
          code: "VFX_AURORA_MDL_SOURCE_UNREADABLE",
          severity: "warn",
          message: `Source model ${asset.fileName} could not be read for light-node parsing.`
        });
        continue;
      }

      const parsed = collectAuroraSourceModelLights(payload.bytes, {
        sourceModelObjectKey: asset.objectKey,
        sourceModelFileName: asset.fileName,
        sourceModelHash: asset.etag
      });
      for (const light of parsed.lights) {
        lights.push({
          source: parsed.source,
          sourceModelAssetId: asset.assetId,
          sourceModelFileName: asset.fileName,
          sourceModelObjectKey: asset.objectKey,
          nodeName: light.nodeName,
          ...(light.sourceNodeKind ? { sourceNodeKind: light.sourceNodeKind } : {}),
          ...(light.parentNodeName ? { parentNodeName: light.parentNodeName } : {}),
          ...(light.transform ? { transform: light.transform } : {}),
          ...(light.radius !== undefined ? { radius: light.radius } : {}),
          ...(light.shadowRadius !== undefined ? { shadowRadius: light.shadowRadius } : {}),
          ...(light.verticalDisplacement !== undefined
            ? { verticalDisplacement: light.verticalDisplacement }
            : {}),
          ...(light.multiplier !== undefined ? { multiplier: light.multiplier } : {}),
          ...(light.color ? { color: light.color } : {}),
          ...(light.ambientOnly !== undefined ? { ambientOnly: light.ambientOnly } : {}),
          ...(light.dynamicType !== undefined ? { dynamicType: light.dynamicType } : {}),
          ...(light.affectDynamic !== undefined ? { affectDynamic: light.affectDynamic } : {}),
          ...(light.shadow !== undefined ? { shadow: light.shadow } : {}),
          ...(light.lightPriority !== undefined ? { lightPriority: light.lightPriority } : {}),
          ...(light.generateFlare !== undefined ? { generateFlare: light.generateFlare } : {}),
          ...(light.textureNames?.length ? { textureNames: light.textureNames } : {}),
          ...(light.flareSizes?.length ? { flareSizes: light.flareSizes } : {}),
          ...(light.flarePositions?.length ? { flarePositions: light.flarePositions } : {}),
          ...(light.flareColorShifts?.length
            ? { flareColorShifts: light.flareColorShifts }
            : {}),
          ...(light.flareRadius !== undefined ? { flareRadius: light.flareRadius } : {}),
          ...(light.lensFlares !== undefined ? { lensFlares: light.lensFlares } : {}),
          ...(light.fadingLight !== undefined ? { fadingLight: light.fadingLight } : {}),
          ...(light.animations && light.animations.length > 0
            ? { animations: light.animations }
            : {})
        });
      }
    }

    if (lights.length === 0) {
      return undefined;
    }

    if (lights.some(hasAuroraMdlLightFlarePayload)) {
      diagnostics.push({
        code: "VFX_MDL_LIGHT_FLARE_PAYLOAD_PRESERVED",
        severity: "info",
        message:
          "MDL light-node flare fields were preserved from source model tokens without converting them into emitter particles."
      });
    }
    if (lights.some(hasAuroraMdlLightFlareListCardinalityMismatch)) {
      diagnostics.push({
        code: "VFX_MDL_LIGHT_FLARE_LIST_CARDINALITY_REQUIRED",
        severity: "warn",
        message:
          "MDL light-node flare lists have mismatched cardinality; source arrays are preserved for Aurora-first inspection."
      });
    }
    if (lights.some((light) => light.flareRadius !== undefined)) {
      diagnostics.push({
        code: "VFX_MDL_LIGHT_FLARERADIUS_WRITE_UNVERIFIED",
        severity: "warn",
        message:
          "MDL light-node flareradius token is preserved, but the inspected Aurora parser fragment did not expose the same direct write-target pattern as neighboring light fields."
      });
    }

    return {
      source: "source-mdl",
      lights,
      diagnostics
    };
  }

  private async collectCreatureSourceMdlInspectionFromSourceModels(
    assets: PlaceableAssetEntry[]
  ): Promise<CreatureRenderPackage["sourceMdlInspection"] | undefined> {
    const sourceModelAssets = assets.filter(isAuroraSourceModelAssetEntry);
    if (sourceModelAssets.length === 0) {
      return undefined;
    }

    const models: NonNullable<CreatureRenderPackage["sourceMdlInspection"]>["models"] =
      [];
    const diagnostics: CreatureRenderPackage["diagnostics"] = [];
    for (const asset of sourceModelAssets) {
      let payload: ModuleBlobObjectPayload | null = null;
      try {
        payload = await this.readModuleBlobObject(asset.objectKey);
      } catch {
        payload = null;
      }
      if (!payload || payload.bytes.length === 0) {
        diagnostics.push({
          code: "CREATURE_SOURCE_MDL_INSPECTION_SOURCE_UNREADABLE",
          severity: "warn",
          message: `Source model ${asset.fileName} could not be read for MDL scene inspection.`
        });
        continue;
      }

      try {
        const inspection = inspectAuroraMdlSource(payload.bytes);
        const animations = (inspection.sourceAnimations ?? []).map((animation) => ({
          name: animation.name,
          ...(animation.targetModel ? { targetModel: animation.targetModel } : {}),
          ...(animation.animRoot ? { animRoot: animation.animRoot } : {}),
          ...(typeof animation.animationScale === "number"
            ? { animationScale: animation.animationScale }
            : {}),
          lengthSeconds: animation.length,
          transitionSeconds: animation.transitionTime,
          ...(animation.events && animation.events.length > 0
            ? {
                events: animation.events.map((event) => ({
                  timeSeconds: event.time,
                  name: event.name
                }))
              }
            : {}),
          nodeCount: animation.nodeCount,
          nodeNames: animation.nodeNames,
          positionKeyCount: animation.positionKeyCount,
          orientationKeyCount: animation.orientationKeyCount,
          scaleKeyCount: animation.scaleKeyCount,
          ...(typeof animation.alphaKeyCount === "number"
            ? { alphaKeyCount: animation.alphaKeyCount }
            : {}),
          danglyNodeCount: animation.nodes.filter(
            (node) =>
              typeof node.danglyDisplacement === "number" ||
              typeof node.danglyPeriod === "number" ||
              typeof node.danglyTightness === "number"
          ).length,
          animmeshNodeCount: animation.nodes.filter(
            (node) =>
              typeof node.samplePeriod === "number" ||
              typeof node.animVertCount === "number" ||
              typeof node.animTvertCount === "number"
          ).length
        }));
        const sourceHierarchy = inspection.sourceHierarchy ?? [];
        models.push({
          source: inferAuroraSourceModelFormat(payload.bytes),
          sourceModelAssetId: asset.assetId,
          sourceModelFileName: asset.fileName,
          sourceModelObjectKey: asset.objectKey,
          modelName: inspection.modelName,
          ...(inspection.supermodel ? { supermodel: inspection.supermodel } : {}),
          ...(typeof inspection.animationScale === "number"
            ? { animationScale: inspection.animationScale }
            : {}),
          nodeCount: sourceHierarchy.length,
          rootNodeNames: inspection.sourceHierarchyRootNodeNames,
          nodeTypes: inspection.sourceHierarchyNodeTypes,
          nodeTypeCounts: inspection.sourceHierarchyNodeTypeCounts,
          nodes: sourceHierarchy.map((node) => ({
            name: node.name,
            nodeType: node.nodeType,
            ...(node.parentName ? { parentName: node.parentName } : {}),
            position: node.position,
            ...(node.orientation ? { orientation: node.orientation } : {}),
            ...(node.orientationFormat
              ? { orientationFormat: node.orientationFormat }
              : {}),
            ...(typeof node.scale === "number" ? { scale: node.scale } : {})
          })),
          animationCount: animations.length,
          animationNames: animations.map((animation) => animation.name),
          animations,
          meshCount: inspection.meshCount,
          textureReferences: inspection.textureReferences
        });
      } catch {
        diagnostics.push({
          code: "CREATURE_SOURCE_MDL_INSPECTION_PARSE_FAILED",
          severity: "warn",
          message: `Source model ${asset.fileName} could not be parsed for MDL scene inspection.`
        });
      }
    }

    if (models.length === 0 && diagnostics.length === 0) {
      return undefined;
    }

    return {
      source: "source-mdl",
      models,
      diagnostics
    };
  }

  private decorateRenderPackageWithDeliveryPaths(
    cacheKey: string,
    assetManifest: PlaceableAssetManifest,
    renderPackage: PlaceableRenderPackage,
    blobSettings?: BlobStorageSettings | null
  ): PlaceableRenderPackage {
    const assetById = new Map(assetManifest.assets.map((asset) => [asset.assetId, asset]));
    let glbUrl = renderPackage.glbUrl;
    let modelUrl = renderPackage.modelUrl;

    if (renderPackage.status === "ready") {
      const derivedModelAssets = (renderPackage.assetRefs.derivedModelAssetIds ?? [])
        .map((assetId) => assetById.get(assetId))
        .filter((asset): asset is PlaceableAssetEntry => Boolean(asset));
      const derivedModelAsset =
        derivedModelAssets.find((asset) => asset.extension.toLowerCase() === "glb") ??
        derivedModelAssets.find((asset) => asset.extension.toLowerCase() === "gltf");
      if (derivedModelAsset) {
        const extension = derivedModelAsset.extension.toLowerCase();
        const deliveryUrl = buildPlaceableAssetBrowserDeliveryUrl(
          cacheKey,
          derivedModelAsset,
          blobSettings,
          !this.appConfig?.hostLocalRuntime
        );
        if (extension === "glb") {
          glbUrl = deliveryUrl;
        } else if (extension === "gltf") {
          modelUrl = deliveryUrl;
        }
      }
    }

    const textureBindings = renderPackage.assetRefs.textureAssetIds
      ?.flatMap((assetId) => {
        const asset = assetById.get(assetId);
        if (!asset) {
          return [];
        }
        const reference = extractBasename(asset.fileName);
        if (reference.trim().length === 0) {
          return [];
        }
        return {
          reference,
          assetId: asset.assetId,
          fileName: asset.fileName,
          objectKey: asset.objectKey,
          deliveryUrl: buildPlaceableAssetBrowserDeliveryUrl(
            cacheKey,
            asset,
            blobSettings,
            !this.appConfig?.hostLocalRuntime
          )
        };
      });
    const textureUrls = textureBindings?.map((binding) => binding.deliveryUrl);

    return {
      ...renderPackage,
      glbUrl,
      modelUrl,
      textureUrls: textureUrls && textureUrls.length > 0 ? textureUrls : undefined,
      textureBindings:
        textureBindings && textureBindings.length > 0 ? textureBindings : undefined
    };
  }

  private async buildPlaceableAssetManifest(input: {
    templateId: string;
    resref: string;
    subtype: PlaceableSubtype;
    sourceAssetKind?: PlaceableManifestSourceAssetKind;
    metadata: Record<string, string | number | boolean>;
    processingOptions?: PlaceableProcessingOptions;
  }): Promise<PlaceableAssetManifest> {
    const manifestStartedAtMs = Date.now();
    let stageStartedAtMs = manifestStartedAtMs;
    const logManifestStage = (
      stage: string,
      details: Record<string, string | number | boolean | null | undefined> = {}
    ) => {
      this.logPlaceablePipelineStep(`buildPlaceableAssetManifest.${stage}`, stageStartedAtMs, {
        templateId: input.templateId,
        resref: input.resref,
        subtype: input.subtype,
        totalElapsedMs: Math.round(Date.now() - manifestStartedAtMs),
        ...details
      });
      stageStartedAtMs = Date.now();
    };

    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
      return buildEmptyPlaceableAssetManifest();
    }

    const index = await this.getModuleSnapshotIndex();
    if (!index) {
      return buildEmptyPlaceableAssetManifest();
    }

    const sourceAssetKind = input.sourceAssetKind ?? "placeable";
    const sourcePriority = await this.getPlaceableAssetSourcePriority(sourceAssetKind);
    const lookupInput = {
      ...input,
      ...(sourcePriority ? { sourcePriority } : {})
    };
    logManifestStage("snapshotAndPriority", {
      candidatesScanned: index.candidatesScanned,
      sourcePriorityHakCount: sourcePriority?.hakNames.length ?? 0
    });
    const collectedAssets = collectPlaceableAssetsFromSnapshot(index, lookupInput);
    const initialAssets =
      input.subtype === "vfx"
        ? collectedAssets.filter((asset) => !isDerivedModelAssetEntry(asset))
        : collectedAssets;
    logManifestStage("collectInitial", {
      collectedAssetCount: collectedAssets.length,
      initialAssetCount: initialAssets.length
    });
    const assetsWithOnDemandModels =
      await this.ensureOnDemandPlaceableSourceModelAssets(input, initialAssets);
    logManifestStage("onDemandModels", {
      assetCount: assetsWithOnDemandModels.length
    });
    const assetsWithDerived =
      input.subtype === "vfx"
        ? assetsWithOnDemandModels
        : await this.ensureDerivedPlaceableModelAssets(
            input,
            assetsWithOnDemandModels,
            input.processingOptions
          );
    logManifestStage("derivedModels", {
      assetCount: assetsWithDerived.length,
      derivedModelCount: assetsWithDerived.filter(isDerivedModelAssetEntry).length
    });
    const assetsWithCreatureSupermodels =
      input.subtype === "vfx"
        ? assetsWithDerived
        : await this.ensureCreatureSupermodelModelAssets(
            input,
            index,
            lookupInput,
            assetsWithDerived
          );
    logManifestStage("creatureSupermodels", {
      assetCount: assetsWithCreatureSupermodels.length
    });
    const derivedTextureReferences =
      await this.collectTextureReferencesFromDerivedModels(assetsWithCreatureSupermodels);
    logManifestStage("derivedTextureReferences", {
      referenceCount: derivedTextureReferences.length
    });
    const sourceModelChunkReferences =
      input.processingOptions?.allowExpensiveSourceReferenceScans === false
        ? []
        : await this.collectChunkModelReferencesFromSourceModels(
            assetsWithCreatureSupermodels
          );
    logManifestStage("sourceChunkReferences", {
      referenceCount: sourceModelChunkReferences.length,
      sourceReferenceScanEnabled:
        input.processingOptions?.allowExpensiveSourceReferenceScans !== false
    });
    const assetsWithChunkModels =
      sourceModelChunkReferences.length > 0
        ? dedupePlaceableAssets([
            ...collectPlaceableAssetsFromSnapshot(index, {
              ...lookupInput,
              metadata: {
                ...input.metadata,
                chunkModelReferences: sourceModelChunkReferences.join("|")
              }
            }).filter(isAuroraSourceModelAssetEntry),
            ...assetsWithCreatureSupermodels
          ])
        : assetsWithCreatureSupermodels;
    const assetsWithOnDemandChunkModels =
      await this.ensureOnDemandPlaceableChunkModelAssets(
        sourceModelChunkReferences,
        assetsWithChunkModels,
        sourceAssetKind
      );
    logManifestStage("onDemandChunkModels", {
      assetCount: assetsWithOnDemandChunkModels.length
    });
    const assetsWithDerivedChunkModels =
      await this.ensureDerivedPlaceableChunkModelAssets(
        sourceModelChunkReferences,
        assetsWithOnDemandChunkModels
      );
    logManifestStage("derivedChunkModels", {
      assetCount: assetsWithDerivedChunkModels.length
    });
    const derivedChunkTextureReferences =
      assetsWithDerivedChunkModels === assetsWithDerived
        ? derivedTextureReferences
        : await this.collectTextureReferencesFromDerivedModels(assetsWithDerivedChunkModels);
    const shouldScanSourceModelTextureReferences =
      input.processingOptions?.allowExpensiveSourceReferenceScans !== false ||
      (derivedTextureReferences.length === 0 &&
        derivedChunkTextureReferences.length === 0);
    const sourceModelTextureReferences = shouldScanSourceModelTextureReferences
      ? await this.collectTextureReferencesFromSourceModels(assetsWithDerivedChunkModels)
      : [];
    logManifestStage("sourceTextureReferences", {
      referenceCount: sourceModelTextureReferences.length,
      scanEnabled: shouldScanSourceModelTextureReferences
    });
    const initialTextureReferences = deduplicateOrdered([
      ...resolveItemTextureLookupResRefs(input.metadata),
      ...resolvePlaceableFastShadowTextureLookupResRefs(input.metadata),
      ...derivedTextureReferences,
      ...derivedChunkTextureReferences,
      ...sourceModelTextureReferences,
      ...resolveCreaturePartModelDerivedResRefs(input.metadata)
    ]);
    const assetsWithReferencedMaterials =
      initialTextureReferences.length > 0
        ? dedupePlaceableAssets([
            ...collectPlaceableAssetsFromSnapshot(index, {
              ...lookupInput,
              metadata: {
                ...input.metadata,
                modelTextureReferences: initialTextureReferences.join("|")
              }
            }),
            ...assetsWithDerivedChunkModels
          ])
        : assetsWithDerivedChunkModels;
    logManifestStage("referencedMaterials", {
      initialTextureReferenceCount: initialTextureReferences.length,
      assetCount: assetsWithReferencedMaterials.length
    });
    const assetsWithOnDemandMaterials =
      input.processingOptions?.allowOnDemandTextureLookup === false
        ? assetsWithReferencedMaterials
        : await this.ensureOnDemandPlaceableMaterialAssets(
            initialTextureReferences,
            assetsWithReferencedMaterials,
            sourceAssetKind
          );
    logManifestStage("onDemandMaterials", {
      assetCount: assetsWithOnDemandMaterials.length,
      onDemandTextureLookupEnabled:
        input.processingOptions?.allowOnDemandTextureLookup !== false
    });
    const materialTextureReferences =
      await this.collectTextureReferencesFromMaterialAssets(assetsWithOnDemandMaterials);
    logManifestStage("materialTextureReferences", {
      referenceCount: materialTextureReferences.length
    });
    const materialBasenames = new Set(
      assetsWithOnDemandMaterials
        .filter((asset) => asset.role === "material" && asset.extension === "mtr")
        .map((asset) => extractBasename(asset.fileName))
    );
    const textureReferences = deduplicateOrdered([
      ...initialTextureReferences.filter(
        (reference) => !hasAuroraResourceBasename(materialBasenames, reference)
      ),
      ...materialTextureReferences
    ]);
    const assetsWithSnapshotTextures =
      textureReferences.length > 0
        ? dedupePlaceableAssets([
            ...collectPlaceableAssetsFromSnapshot(index, {
              ...lookupInput,
              metadata: {
                ...input.metadata,
                modelTextureReferences: textureReferences.join("|")
              }
            }),
            ...assetsWithOnDemandMaterials
          ])
        : assetsWithOnDemandMaterials;
    logManifestStage("snapshotTextures", {
      textureReferenceCount: textureReferences.length,
      assetCount: assetsWithSnapshotTextures.length
    });
    const assetsWithOnDemandTextures =
      input.processingOptions?.allowOnDemandTextureLookup === false
        ? assetsWithSnapshotTextures
        : await this.ensureOnDemandPlaceableTextureAssets(
            textureReferences,
            assetsWithSnapshotTextures,
            sourceAssetKind
          );
    logManifestStage("onDemandTextures", {
      assetCount: assetsWithOnDemandTextures.length,
      onDemandTextureLookupEnabled:
        input.processingOptions?.allowOnDemandTextureLookup !== false
    });
    let uniqueAssets = preferPlaceableTextureAssetVariants(
      dedupePlaceableAssets(assetsWithOnDemandTextures),
      sourcePriority
    );

    // Safety net: if no texture assets were produced, force one more pass using
    // material references discovered from the finalized asset set.
    if (!uniqueAssets.some((asset) => asset.role === "texture")) {
      const fallbackTextureReferences =
        await this.collectTextureReferencesFromMaterialAssets(uniqueAssets);
      if (fallbackTextureReferences.length > 0) {
        if (input.processingOptions?.allowOnDemandTextureLookup !== false) {
          const withFallbackOnDemandTextures =
            await this.ensureOnDemandPlaceableTextureAssets(
              fallbackTextureReferences,
              uniqueAssets,
              sourceAssetKind
            );
          uniqueAssets = preferPlaceableTextureAssetVariants(
            dedupePlaceableAssets(withFallbackOnDemandTextures),
            sourcePriority
          );
        }
      }
    }
    logManifestStage("fallbackTextures", {
      assetCount: uniqueAssets.length,
      textureAssetCount: uniqueAssets.filter((asset) => asset.role === "texture").length
    });
    uniqueAssets = await this.preferCurrentDerivedPlaceableModelAssets(uniqueAssets);
    if (input.subtype === "vfx") {
      const chunkModelBasenames = new Set(sourceModelChunkReferences.map(extractBasename));
      uniqueAssets = uniqueAssets.filter(
        (asset) =>
          !isDerivedModelAssetEntry(asset) || chunkModelBasenames.has(extractBasename(asset.fileName))
      );
    }
    this.logPlaceablePipelineStep("buildPlaceableAssetManifest.complete", manifestStartedAtMs, {
      templateId: input.templateId,
      resref: input.resref,
      subtype: input.subtype,
      assetCount: uniqueAssets.length,
      textureAssetCount: uniqueAssets.filter((asset) => asset.role === "texture").length,
      modelAssetCount: uniqueAssets.filter((asset) => asset.role === "model").length,
      candidatesScanned: index.candidatesScanned
    });

    return {
      version: "placeable-asset-manifest/v1",
      source: "module-blob-snapshot",
      generatedAt: new Date().toISOString(),
      moduleHash: index.moduleHash,
      assetCount: uniqueAssets.length,
      candidatesScanned: index.candidatesScanned,
      assets: uniqueAssets
    };
  }

  private async ensureDerivedPlaceableModelAssets(
    input: {
      templateId: string;
      resref: string;
      metadata: Record<string, string | number | boolean>;
    },
    assets: PlaceableAssetEntry[],
    options: PlaceableProcessingOptions = {}
  ): Promise<PlaceableAssetEntry[]> {
    if (!this.derivedAssetGenerator || !this.moduleBlobStorage?.putModuleObject) {
      return assets;
    }

    const assetsWithCurrentDerivedPreferred =
      await this.preferCurrentDerivedPlaceableModelAssets(assets);
    const sourceModelAssets = selectSourceModelAssetsForDerived(
      input,
      assetsWithCurrentDerivedPreferred
    );
    if (sourceModelAssets.length === 0) {
      return assetsWithCurrentDerivedPreferred;
    }
    let sourceModelAssetsNeedingDerived = selectSourceModelAssetsNeedingDerived(
      input,
      assetsWithCurrentDerivedPreferred,
      sourceModelAssets
    );
    if (sourceModelAssetsNeedingDerived.length === 0) {
      sourceModelAssetsNeedingDerived =
        await this.selectSourceModelAssetsWithStaleDerivedModels(
          assetsWithCurrentDerivedPreferred,
          sourceModelAssets
        );
    }
    if (sourceModelAssetsNeedingDerived.length === 0) {
      return assetsWithCurrentDerivedPreferred;
    }

    if (options.allowOnDemandDerivedModelGeneration === false) {
      return assetsWithCurrentDerivedPreferred;
    }

    const settings = await this.runtimeSettingsRepository?.get();
    if (!settings) {
      return assetsWithCurrentDerivedPreferred;
    }

    const sourceFiles: Array<{ asset: PlaceableAssetEntry; bytes: Buffer }> = [];
    for (const asset of sourceModelAssetsNeedingDerived) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload || payload.bytes.length === 0) {
        continue;
      }
      sourceFiles.push({ asset, bytes: payload.bytes });
    }

    if (sourceFiles.length === 0) {
      return assetsWithCurrentDerivedPreferred;
    }

    const generationKey = buildPlaceableDerivedGenerationKey(sourceFiles);
    const generation = await executeInFlight(
      this.inFlightDerivedPlaceableModelAssets,
      generationKey,
      async (): Promise<DerivedPlaceableModelGenerationResult> => {
        const generated = await this.derivedAssetGenerator!.generateDerivedAssets({
          settingsRevision: settings.revision,
          modulePrefix: settings.blobStorage.modulePrefix,
          sourceFiles: sourceFiles.map(({ asset, bytes }) => ({
            fileName: asset.objectKey,
            resourceType: 0,
            bytes
          }))
        });

        if (generated.files.length === 0) {
          return {
            derivedAssets: [],
            noRenderableGeometry: isNoRenderableGeometryDerivedFailure(
              generated.summary.failureReasons
            )
          };
        }

        const derivedAssets: PlaceableAssetEntry[] = [];
        for (const file of generated.files) {
          const stored = await this.moduleBlobStorage!.putModuleObject!(
            settings.blobStorage,
            file
          );
          this.deleteCachedModuleBlobObjectByKey(settings.blobStorage, stored.key);
          const fileName = extractFileName(stored.key);
          const extension = extractExtension(fileName);
          derivedAssets.push({
            assetId: buildAssetId(stored.key, stored.etag, stored.size),
            role: "model",
            fileName,
            objectKey: stored.key,
            extension,
            sizeBytes: stored.size,
            contentType: inferContentTypeForExtension(extension),
            etag: stored.etag
          });
        }

        return {
          derivedAssets,
          noRenderableGeometry: false
        };
      }
    );

    if (generation.derivedAssets.length === 0) {
      if (generation.noRenderableGeometry) {
        const noGeometryAssetIds = new Set(
          sourceModelAssetsNeedingDerived.map((asset) => asset.assetId)
        );
        return assetsWithCurrentDerivedPreferred.map((asset) =>
          noGeometryAssetIds.has(asset.assetId) ? { ...asset, role: "unknown" } : asset
        );
      }
      return assetsWithCurrentDerivedPreferred;
    }

    const refreshedDerivedBasenames = new Set(
      generation.derivedAssets
        .map((asset) => extractBasename(asset.fileName))
        .filter(Boolean)
    );
    const assetsWithoutReplacedDerived = assetsWithCurrentDerivedPreferred.filter((asset) => {
      if (!isDerivedModelAssetEntry(asset)) {
        return true;
      }
      const basename = extractBasename(asset.fileName);
      return !basename || !refreshedDerivedBasenames.has(basename);
    });
    return dedupePlaceableAssets([
      ...assetsWithoutReplacedDerived,
      ...generation.derivedAssets
    ]);
  }

  private async preferCurrentDerivedPlaceableModelAssets(
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableAssetEntry[]> {
    const derivedByBasename = new Map<string, PlaceableAssetEntry[]>();
    assets.filter(isDerivedModelAssetEntry).forEach((asset) => {
      const basename = extractBasename(asset.fileName);
      if (!basename) {
        return;
      }
      const bucket = derivedByBasename.get(basename) ?? [];
      bucket.push(asset);
      derivedByBasename.set(basename, bucket);
    });

    const staleAssetIds = new Set<string>();
    for (const bucket of derivedByBasename.values()) {
      if (bucket.length < 2) {
        continue;
      }
      const currentEntries = await Promise.all(
        bucket.map(async (asset) => ({
          asset,
          current: await this.isDerivedPlaceableModelConverterCurrent(asset)
        }))
      );
      if (!currentEntries.some((entry) => entry.current)) {
        continue;
      }
      currentEntries
        .filter((entry) => !entry.current)
        .forEach((entry) => staleAssetIds.add(entry.asset.assetId));
    }

    if (staleAssetIds.size === 0) {
      return assets;
    }
    return assets.filter((asset) => !staleAssetIds.has(asset.assetId));
  }

  private async ensureCreatureSupermodelModelAssets(
    input: {
      templateId: string;
      resref: string;
      subtype: PlaceableSubtype;
      sourceAssetKind?: PlaceableManifestSourceAssetKind;
      metadata: Record<string, string | number | boolean>;
      processingOptions?: PlaceableProcessingOptions;
    },
    index: ModuleSnapshotIndex,
    lookupInput: PlaceableAssetLookupInput,
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableAssetEntry[]> {
    if (resolveCreatureModelDerivedResRefs(input.metadata).length === 0) {
      return assets;
    }

    let currentAssets = assets;
    const seenRefs = new Set<string>();
    for (let pass = 0; pass < 3; pass += 1) {
      const derivedSupermodelRefs =
        await this.collectSupermodelReferencesFromDerivedModels(currentAssets);
      const sourceSupermodelRefs =
        await this.collectSupermodelReferencesFromSourceModels(currentAssets);
      const supermodelRefs = deduplicateOrdered([
        ...derivedSupermodelRefs,
        ...sourceSupermodelRefs
      ]);
      const newRefs = supermodelRefs.filter((ref) => !seenRefs.has(ref));
      if (newRefs.length === 0) {
        return currentAssets;
      }
      newRefs.forEach((ref) => seenRefs.add(ref));

      const supermodelMetadata = {
        ...input.metadata,
        creatureSupermodelRefs: supermodelRefs.join("|")
      };
      const withSnapshotSupermodels = dedupePlaceableAssets([
        ...currentAssets,
        ...collectPlaceableAssetsFromSnapshot(index, {
          ...lookupInput,
          metadata: supermodelMetadata
        }).filter((asset) => asset.role === "model" || asset.role === "unknown")
      ]);
      const withOnDemandSupermodels =
        await this.ensureOnDemandPlaceableSourceModelAssets(
          { ...input, metadata: supermodelMetadata },
          withSnapshotSupermodels
        );
      currentAssets = await this.ensureDerivedPlaceableModelAssets(
        { ...input, metadata: supermodelMetadata },
        withOnDemandSupermodels,
        input.processingOptions
      );
    }

    return currentAssets;
  }

  private async selectSourceModelAssetsWithStaleDerivedModels(
    assets: PlaceableAssetEntry[],
    sourceModelAssets: PlaceableAssetEntry[]
  ): Promise<PlaceableAssetEntry[]> {
    const derivedByBasename = new Map<string, PlaceableAssetEntry[]>();
    assets.filter(isDerivedModelAssetEntry).forEach((asset) => {
      const basename = extractBasename(asset.fileName);
      if (!basename) {
        return;
      }
      const bucket = derivedByBasename.get(basename) ?? [];
      bucket.push(asset);
      bucket.sort(compareDerivedChunkModelAssetPriority);
      derivedByBasename.set(basename, bucket);
    });

    if (derivedByBasename.size === 0) {
      return [];
    }

    const staleSources: PlaceableAssetEntry[] = [];
    for (const sourceAsset of sourceModelAssets) {
      const basename = extractBasename(sourceAsset.fileName);
      const derived = basename ? derivedByBasename.get(basename)?.[0] : undefined;
      if (!derived) {
        continue;
      }
      const isCurrent = await this.isDerivedPlaceableModelConverterCurrent(derived);
      if (!isCurrent) {
        staleSources.push(sourceAsset);
      }
    }
    return staleSources;
  }

  private async isDerivedPlaceableModelConverterCurrent(
    asset: PlaceableAssetEntry
  ): Promise<boolean> {
    const payload = await this.readModuleBlobObject(asset.objectKey);
    if (!payload || payload.bytes.length === 0) {
      return false;
    }
    const modelJson = parseDerivedModelJsonPayload(asset, payload.bytes);
    return resolveDerivedModelConverterVersion(modelJson) ===
      AURORA_MDL_TO_GLB_CONVERTER_VERSION;
  }

  private async ensureOnDemandPlaceableSourceModelAssets(
    input: {
      templateId: string;
      resref: string;
      sourceAssetKind?: PlaceableManifestSourceAssetKind;
      metadata: Record<string, string | number | boolean>;
    },
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableAssetEntry[]> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage?.putModuleObject) {
      return assets;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const sourceAssetKind = input.sourceAssetKind ?? "placeable";
    const creatureModelResRefs = resolveCreatureModelDerivedResRefs(input.metadata);
    if (creatureModelResRefs.length > 0) {
      const missingCreatureModelResRefs = selectMissingAuroraModelSourceResRefs(
        creatureModelResRefs,
        assets
      );
      if (missingCreatureModelResRefs.length === 0) {
        return assets;
      }

      const onDemandAssets: PlaceableAssetEntry[] = [];
      for (const resref of missingCreatureModelResRefs) {
        let found: OnDemandPlaceableSourceResource | null = null;
        for (const lookupSourceAssetKind of resolveOnDemandModelSourceAssetKindsForRef(
          input,
          resref
        )) {
          found = await resolvePlaceableSourceResource(
            settings,
            resref,
            ON_DEMAND_MODEL_RESOURCE_CANDIDATES,
            lookupSourceAssetKind
          );
          if (found) {
            break;
          }
        }
        if (!found) {
          continue;
        }

        const stored = await this.storeOnDemandPlaceableAsset(settings, found);
        if (stored) {
          onDemandAssets.push(stored);
        }
      }

      return onDemandAssets.length > 0
        ? dedupePlaceableAssets([...assets, ...onDemandAssets])
        : assets;
    }

    const itemModelResRefs = resolveItemModelDerivedResRefs(input.metadata);
    if (itemModelResRefs.length > 0) {
      const missingItemModelResRefs = selectMissingAuroraModelSourceResRefs(
        itemModelResRefs,
        assets
      );
      if (missingItemModelResRefs.length === 0) {
        return assets;
      }

      const onDemandAssets: PlaceableAssetEntry[] = [];
      for (const resref of missingItemModelResRefs) {
        const found = await resolvePlaceableSourceResource(
          settings,
          resref,
          ON_DEMAND_MODEL_RESOURCE_CANDIDATES,
          sourceAssetKind
        );
        if (!found) {
          continue;
        }

        const stored = await this.storeOnDemandPlaceableAsset(settings, found);
        if (stored) {
          onDemandAssets.push(stored);
        }
      }

      return onDemandAssets.length > 0
        ? dedupePlaceableAssets([...assets, ...onDemandAssets])
        : assets;
    }

    if (
      hasDerivedModelAssetForExactLookup(input, assets) ||
      selectSourceModelAssetsForDerived(input, assets).length > 0
    ) {
      return assets;
    }

    const candidates = buildPlaceableModelResRefCandidates(input);
    for (const resref of candidates) {
      const found = await resolvePlaceableSourceResource(
        settings,
        resref,
        ON_DEMAND_MODEL_RESOURCE_CANDIDATES,
        sourceAssetKind
      );
      if (!found) {
        continue;
      }

      const stored = await this.storeOnDemandPlaceableAsset(settings, found);
      return stored ? dedupePlaceableAssets([...assets, stored]) : assets;
    }

    return assets;
  }

  private async ensureOnDemandPlaceableTextureAssets(
    textureReferences: string[],
    assets: PlaceableAssetEntry[],
    sourceAssetKind: PlaceableManifestSourceAssetKind = "placeable"
  ): Promise<PlaceableAssetEntry[]> {
    if (
      textureReferences.length === 0 ||
      !this.runtimeSettingsRepository ||
      !this.moduleBlobStorage?.putModuleObject
    ) {
      return assets;
    }

    const existingTextureAssetsByRef = buildTextureAssetsByReference(assets);
    const missingTextureRefs = textureReferences
      .map(buildAuroraResourceLookupBasenameCandidates)
      .filter(
        (candidates) =>
          candidates.length > 0 &&
          !candidates.some((candidate) =>
            hasPreferredTextureVariant(existingTextureAssetsByRef, candidate)
          )
      )
      .flat();
    if (missingTextureRefs.length === 0) {
      return assets;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const onDemandAssets: PlaceableAssetEntry[] = [];
    const textureResolveStartedAtMs = Date.now();
    const dedupedMissingTextureRefs = deduplicateOrdered(missingTextureRefs);
    const unresolvedTextureRefs: string[] = [];
    for (const resref of dedupedMissingTextureRefs) {
      const found = await resolvePlaceableSourceResource(
        settings,
        resref,
        ON_DEMAND_TEXTURE_RESOURCE_CANDIDATES,
        sourceAssetKind
      );
      if (!found) {
        // Texture reference could not be resolved from haks or vanilla key/bif.
        // Record it so the runtime capture can distinguish an absent source file
        // from a name mismatch instead of failing silently (white/gray material).
        unresolvedTextureRefs.push(resref);
        continue;
      }

      const stored = await this.storeOnDemandPlaceableAsset(settings, found);
      if (stored) {
        onDemandAssets.push(stored);
      }
    }

    if (unresolvedTextureRefs.length > 0) {
      this.logPlaceablePipelineStep("texture.onDemand.unresolved", textureResolveStartedAtMs, {
        sourceAssetKind,
        requestedCount: dedupedMissingTextureRefs.length,
        resolvedCount: onDemandAssets.length,
        unresolvedCount: unresolvedTextureRefs.length,
        unresolvedSample: unresolvedTextureRefs.slice(0, 40).join("|")
      });
    }

    return onDemandAssets.length > 0
      ? dedupePlaceableAssets([...assets, ...onDemandAssets])
      : assets;
  }

  private async ensureOnDemandPlaceableMaterialAssets(
    materialReferences: string[],
    assets: PlaceableAssetEntry[],
    sourceAssetKind: PlaceableManifestSourceAssetKind = "placeable"
  ): Promise<PlaceableAssetEntry[]> {
    if (
      materialReferences.length === 0 ||
      !this.runtimeSettingsRepository ||
      !this.moduleBlobStorage?.putModuleObject
    ) {
      return assets;
    }

    const existingMaterialRefs = new Set(
      assets
        .filter((asset) => asset.role === "material")
        .map((asset) => extractBasename(asset.fileName))
    );
    const missingMaterialRefs = materialReferences
      .map(extractBasename)
      .filter((value) => value && !existingMaterialRefs.has(value));
    if (missingMaterialRefs.length === 0) {
      return assets;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const onDemandAssets: PlaceableAssetEntry[] = [];
    for (const resref of deduplicateOrdered(missingMaterialRefs)) {
      const found = await resolvePlaceableSourceResource(
        settings,
        resref,
        ON_DEMAND_MATERIAL_RESOURCE_CANDIDATES,
        sourceAssetKind
      );
      if (!found) {
        continue;
      }

      const stored = await this.storeOnDemandPlaceableAsset(settings, found);
      if (stored) {
        onDemandAssets.push(stored);
      }
    }

    return onDemandAssets.length > 0
      ? dedupePlaceableAssets([...assets, ...onDemandAssets])
      : assets;
  }

  private async ensureOnDemandPlaceableChunkModelAssets(
    chunkModelReferences: string[],
    assets: PlaceableAssetEntry[],
    sourceAssetKind: PlaceableManifestSourceAssetKind = "placeable"
  ): Promise<PlaceableAssetEntry[]> {
    if (
      chunkModelReferences.length === 0 ||
      !this.runtimeSettingsRepository ||
      !this.moduleBlobStorage?.putModuleObject
    ) {
      return assets;
    }

    const existingModelRefs = new Set(
      assets
        .filter(isAuroraSourceModelAssetEntry)
        .map((asset) => extractBasename(asset.fileName))
    );
    const missingModelRefs = chunkModelReferences
      .map(extractBasename)
      .filter((value) => value && !existingModelRefs.has(value));
    if (missingModelRefs.length === 0) {
      return assets;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const onDemandAssets: PlaceableAssetEntry[] = [];
    for (const resref of deduplicateOrdered(missingModelRefs)) {
      const found = await resolvePlaceableSourceResource(
        settings,
        resref,
        ON_DEMAND_MODEL_RESOURCE_CANDIDATES,
        sourceAssetKind
      );
      if (!found) {
        continue;
      }

      const stored = await this.storeOnDemandPlaceableAsset(settings, found);
      if (stored) {
        onDemandAssets.push(stored);
      }
    }

    return onDemandAssets.length > 0
      ? dedupePlaceableAssets([...assets, ...onDemandAssets])
      : assets;
  }

  private async ensureDerivedPlaceableChunkModelAssets(
    chunkModelReferences: string[],
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableAssetEntry[]> {
    if (
      chunkModelReferences.length === 0 ||
      !this.derivedAssetGenerator ||
      !this.moduleBlobStorage?.putModuleObject
    ) {
      return assets;
    }

    const chunkModelRefSet = new Set(
      chunkModelReferences
        .map(extractBasename)
        .filter((value) => value.length > 0)
    );
    if (chunkModelRefSet.size === 0) {
      return assets;
    }

    const existingDerivedRefs = new Set(
      assets
        .filter(isDerivedModelAssetEntry)
        .map((asset) => extractBasename(asset.fileName))
        .filter((value) => value.length > 0)
    );
    const sourceModelAssets = assets.filter((asset) => {
      if (!isAuroraSourceModelAssetEntry(asset)) {
        return false;
      }
      const basename = extractBasename(asset.fileName);
      return chunkModelRefSet.has(basename) && !existingDerivedRefs.has(basename);
    });
    if (sourceModelAssets.length === 0) {
      return assets;
    }

    const settings = await this.runtimeSettingsRepository?.get();
    if (!settings) {
      return assets;
    }

    const sourceFiles: Array<{ asset: PlaceableAssetEntry; bytes: Buffer }> = [];
    for (const asset of sourceModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload || payload.bytes.length === 0) {
        continue;
      }
      sourceFiles.push({ asset, bytes: payload.bytes });
    }
    if (sourceFiles.length === 0) {
      return assets;
    }

    const generated = await this.derivedAssetGenerator.generateDerivedAssets({
      settingsRevision: settings.revision,
      modulePrefix: settings.blobStorage.modulePrefix,
      sourceFiles: sourceFiles.map(({ asset, bytes }) => ({
        fileName: asset.objectKey,
        resourceType: 0,
        bytes
      }))
    });
    if (generated.files.length === 0) {
      return assets;
    }

    const derivedAssets: PlaceableAssetEntry[] = [];
    for (const file of generated.files) {
      const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, file);
      const fileName = extractFileName(stored.key);
      const extension = extractExtension(fileName);
      derivedAssets.push({
        assetId: buildAssetId(stored.key, stored.etag, stored.size),
        role: "model",
        fileName,
        objectKey: stored.key,
        extension,
        sizeBytes: stored.size,
        contentType: inferContentTypeForExtension(extension),
        etag: stored.etag
      });
    }

    return derivedAssets.length > 0
      ? dedupePlaceableAssets([...assets, ...derivedAssets])
      : assets;
  }

  private async storeOnDemandPlaceableAsset(
    settings: RuntimeSettingsRecord,
    resource: OnDemandPlaceableSourceResource
  ): Promise<PlaceableAssetEntry | null> {
    if (!this.moduleBlobStorage?.putModuleObject) {
      return null;
    }

    const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, {
      fileName: resource.fileName,
      resourceType: resource.resourceType,
      bytes: normalizeOnDemandPlaceableSourceResourceBytes(resource)
    });
    const fileName = extractFileName(stored.key);
    const extension = extractExtension(fileName);
    return {
      assetId: buildAssetId(stored.key, stored.etag, stored.size),
      role: inferOnDemandAssetRole(extension),
      fileName,
      objectKey: stored.key,
      extension,
      sizeBytes: stored.size,
      contentType: inferContentTypeForExtension(extension),
      etag: stored.etag
    };
  }

  private async collectTextureReferencesFromDerivedModels(
    assets: PlaceableAssetEntry[]
  ): Promise<string[]> {
    const references = new Set<string>();
    const materialBasenames = new Set(
      assets
        .filter((asset) => asset.role === "material" && asset.extension === "mtr")
        .map((asset) => extractBasename(asset.fileName))
        .filter((value) => value.length > 0)
    );
    const derivedModelAssets = assets.filter(isDerivedModelAssetEntry);

    for (const asset of derivedModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }

      const parsed = parseDerivedModelJsonPayload(asset, payload.bytes);
      if (!parsed) {
        continue;
      }

      collectAuroraTextureReferences(parsed).forEach((reference) => {
        references.add(reference);
      });
    }

    const materialTextureReferences = await this.collectTextureReferencesFromMaterialAssets(
      assets
    );
    if (materialTextureReferences.length > 0) {
      for (const reference of [...references]) {
        if (materialBasenames.has(reference)) {
          references.delete(reference);
        }
      }
      materialTextureReferences.forEach((reference) => references.add(reference));
    }

    return [...references].sort((left, right) => left.localeCompare(right));
  }

  private async collectTextureReferencesFromSourceModels(
    assets: PlaceableAssetEntry[]
  ): Promise<string[]> {
    const references = new Set<string>();
    const sourceModelAssets = assets.filter(isAuroraSourceModelAssetEntry);
    for (const asset of sourceModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }
      collectAuroraSourceModelTextureReferences(payload.bytes).forEach((reference) => {
        references.add(reference);
      });
    }
    return [...references].sort((left, right) => left.localeCompare(right));
  }

  private async collectChunkModelReferencesFromSourceModels(
    assets: PlaceableAssetEntry[]
  ): Promise<string[]> {
    const references = new Set<string>();
    const sourceModelAssets = assets.filter(isAuroraSourceModelAssetEntry);
    for (const asset of sourceModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }
      collectAuroraSourceModelEmitters(payload.bytes).emitters.forEach((emitter) => {
        const chunkName = normalizeAuroraModelResourceReference(emitter.chunkName);
        if (chunkName) {
          references.add(chunkName);
        }
      });
    }
    return [...references].sort((left, right) => left.localeCompare(right));
  }

  private async collectSupermodelReferencesFromDerivedModels(
    assets: PlaceableAssetEntry[]
  ): Promise<string[]> {
    const references = new Set<string>();
    const derivedModelAssets = assets.filter(isDerivedModelAssetEntry);
    for (const asset of derivedModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }
      const parsed = parseDerivedModelJsonPayload(asset, payload.bytes);
      if (!parsed) {
        continue;
      }
      collectAuroraSupermodelReferences(parsed).forEach((reference) =>
        references.add(reference)
      );
    }
    return [...references].sort((left, right) => left.localeCompare(right));
  }

  private async collectSupermodelReferencesFromSourceModels(
    assets: PlaceableAssetEntry[]
  ): Promise<string[]> {
    const references = new Set<string>();
    const sourceModelAssets = assets.filter(isAuroraSourceModelAssetEntry);
    for (const asset of sourceModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }
      collectAuroraSourceModelSupermodelReferences(payload.bytes).forEach((reference) => {
        references.add(reference);
      });
    }
    return [...references].sort((left, right) => left.localeCompare(right));
  }

  private async collectSupermodelReferencesByDerivedModelResRef(
    assets: PlaceableAssetEntry[]
  ): Promise<Map<string, string>> {
    const referencesByModelRef = new Map<string, string>();
    const derivedModelAssets = assets.filter(isDerivedModelAssetEntry);
    for (const asset of derivedModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }
      const parsed = parseDerivedModelJsonPayload(asset, payload.bytes);
      if (!parsed) {
        continue;
      }
      const supermodelRef = collectAuroraSupermodelReferences(parsed)[0];
      if (!supermodelRef) {
        continue;
      }
      const sourceModelRefs = collectAuroraSourceModelReferences(parsed);
      const fallbackSourceRef = normalizeCreatureRenderModelRef(asset.fileName);
      deduplicateOrdered([
        ...sourceModelRefs,
        ...(fallbackSourceRef ? [fallbackSourceRef] : [])
      ]).forEach((sourceRef) => {
        const modelRef = normalizeCreatureRenderModelRef(sourceRef);
        if (modelRef && !referencesByModelRef.has(modelRef)) {
          referencesByModelRef.set(modelRef, supermodelRef);
        }
      });
    }
    const sourceModelAssets = assets.filter(isAuroraSourceModelAssetEntry);
    for (const asset of sourceModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }
      const sourceModelRef = normalizeCreatureRenderModelRef(asset.fileName);
      const supermodelRef = collectAuroraSourceModelSupermodelReferences(payload.bytes)[0];
      if (sourceModelRef && supermodelRef && !referencesByModelRef.has(sourceModelRef)) {
        referencesByModelRef.set(sourceModelRef, supermodelRef);
      }
    }
    return referencesByModelRef;
  }

  private async collectTextureReferencesFromMaterialAssets(
    assets: PlaceableAssetEntry[]
  ): Promise<string[]> {
    const references = new Set<string>();
    const materialAssets = assets.filter((asset) => asset.role === "material");
    for (const asset of materialAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }
      collectAuroraMaterialTextureReferences(payload.bytes).forEach((reference) =>
        references.add(reference)
      );
    }
    return [...references].sort((left, right) => left.localeCompare(right));
  }

  private async getPlaceableAssetSourcePriority(
    sourceAssetKind: PlaceableManifestSourceAssetKind = "placeable"
  ): Promise<PlaceableAssetSourcePriority | null> {
    if (!this.runtimeSettingsRepository) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const moduleIfoHakList = await readModuleIfOHakList(settings.paths.moduleDecompiledPath);
    return buildPlaceableAssetSourcePriority(settings, moduleIfoHakList, sourceAssetKind);
  }

  private async getModuleSnapshotIndex(): Promise<ModuleSnapshotIndex | null> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return null;
    }

    const now = Date.now();
    if (
      this.moduleSnapshotIndexCache &&
      now - this.moduleSnapshotIndexCache.fetchedAtMs < MODULE_SNAPSHOT_INDEX_TTL_MS
    ) {
      return this.moduleSnapshotIndexCache.index;
    }
    if (
      this.moduleSnapshotIndexFailureCache &&
      this.moduleSnapshotIndexFailureCache.expiresAtMs > now
    ) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const inFlightKey = [
      settings.blobStorage.bucket,
      normalizePrefixForLookup(settings.blobStorage.modulePrefix)
    ].join("|");

    return executeInFlight(this.inFlightModuleSnapshotIndex, inFlightKey, async () => {
      const refreshNow = Date.now();
      if (
        this.moduleSnapshotIndexCache &&
        refreshNow - this.moduleSnapshotIndexCache.fetchedAtMs < MODULE_SNAPSHOT_INDEX_TTL_MS
      ) {
        return this.moduleSnapshotIndexCache.index;
      }
      if (
        this.moduleSnapshotIndexFailureCache &&
        this.moduleSnapshotIndexFailureCache.expiresAtMs > refreshNow
      ) {
        return null;
      }

      try {
        const snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
        const cacheKey = [
          settings.blobStorage.bucket,
          snapshot.prefix,
          snapshot.moduleHash ?? "unknown",
          String(snapshot.objects.length)
        ].join("|");

        if (this.moduleSnapshotIndexCache?.key === cacheKey) {
          this.moduleSnapshotIndexFailureCache = null;
          return this.moduleSnapshotIndexCache.index;
        }

        const index = buildModuleSnapshotIndex(snapshot);
        this.moduleSnapshotIndexCache = {
          key: cacheKey,
          index,
          fetchedAtMs: refreshNow
        };
        this.moduleSnapshotIndexFailureCache = null;
        return index;
      } catch {
        this.moduleSnapshotIndexFailureCache = {
          expiresAtMs: refreshNow + MODULE_SNAPSHOT_INDEX_FAILURE_TTL_MS
        };
        return null;
      }
    });
  }

  private async getCurrentModuleHash(): Promise<string | undefined> {
    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
      return undefined;
    }

    const now = Date.now();
    if (
      this.moduleHashProbeCache &&
      now - this.moduleHashProbeCache.fetchedAtMs < MODULE_HASH_PROBE_TTL_MS
    ) {
      return this.moduleHashProbeCache.value;
    }

    if (this.moduleHashProbeInFlight) {
      return this.moduleHashProbeInFlight;
    }

    this.moduleHashProbeInFlight = (async () => {
      try {
        const value = await this.probeCurrentModuleHash();
        this.moduleHashProbeCache = {
          value,
          fetchedAtMs: Date.now()
        };
        return value;
      } catch {
        this.moduleHashProbeCache = {
          value: undefined,
          fetchedAtMs: Date.now()
        };
        return undefined;
      } finally {
        this.moduleHashProbeInFlight = null;
      }
    })();

    return this.moduleHashProbeInFlight;
  }

  private async probeCurrentModuleHash(): Promise<string | undefined> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return undefined;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const snapshot = await this.moduleBlobStorage.listModuleSnapshot(settings.blobStorage, {
      limit: 1
    });
    return snapshot.moduleHash;
  }

  private getTemplateLookupById(
    kind: TemplateKind,
    templateId: string
  ): TemplateRecord | null {
    return this.getTemplateLookup(this.templateByIdCache, `${kind}|${templateId}`);
  }

  private getTemplateLookupByResref(
    kind: TemplateKind,
    resref: string
  ): TemplateRecord | null {
    return this.getTemplateLookup(this.templateByResrefCache, `${kind}|${resref}`);
  }

  private getTemplateLookup(
    store: Map<string, TemplateLookupCacheEntry>,
    key: string
  ): TemplateRecord | null {
    const normalizedKey = normalizeLookupKey(key);
    this.pruneExpiredTimedEntries(store);
    const entry = store.get(normalizedKey);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (entry.expiresAtMs <= now) {
      store.delete(normalizedKey);
      return null;
    }

    store.delete(normalizedKey);
    store.set(normalizedKey, {
      template: entry.template,
      expiresAtMs: now + TEMPLATE_LOOKUP_TTL_MS
    });

    return entry.template;
  }

  private cacheTemplateLookup(template: TemplateRecord): void {
    const expiresAtMs = Date.now() + TEMPLATE_LOOKUP_TTL_MS;
    this.upsertTimedEntry(this.templateByIdCache,
      normalizeLookupKey(`${template.kind}|${template.templateId}`),
      { template, expiresAtMs }
    );
    this.upsertTimedEntry(this.templateByResrefCache,
      normalizeLookupKey(`${template.kind}|${template.resref}`),
      { template, expiresAtMs }
    );
    this.pruneOverflow(this.templateByIdCache, this.templateLookupCacheMaxEntries);
    this.pruneOverflow(this.templateByResrefCache, this.templateLookupCacheMaxEntries);
  }

  private isManifestValidationFresh(cacheKey: string, moduleHash?: string): boolean {
    const normalizedCacheKey = normalizeLookupKey(cacheKey);
    this.pruneExpiredTimedEntries(this.placeableManifestValidationCache);
    const entry = this.placeableManifestValidationCache.get(normalizedCacheKey);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (entry.expiresAtMs <= now) {
      this.placeableManifestValidationCache.delete(normalizedCacheKey);
      return false;
    }

    if ((entry.moduleHash ?? "") !== (moduleHash ?? "")) {
      this.placeableManifestValidationCache.delete(normalizedCacheKey);
      return false;
    }

    this.upsertTimedEntry(this.placeableManifestValidationCache, normalizedCacheKey, {
      moduleHash: entry.moduleHash,
      expiresAtMs: now + PLACEABLE_MANIFEST_VALIDATION_TTL_MS
    });
    return true;
  }

  private rememberManifestValidation(cacheKey: string, moduleHash?: string): void {
    const normalizedCacheKey = normalizeLookupKey(cacheKey);
    this.upsertTimedEntry(this.placeableManifestValidationCache, normalizedCacheKey, {
      moduleHash,
      expiresAtMs: Date.now() + PLACEABLE_MANIFEST_VALIDATION_TTL_MS
    });
    this.pruneOverflow(
      this.placeableManifestValidationCache,
      this.manifestValidationCacheMaxEntries
    );
  }

  private upsertTimedEntry<TValue>(
    store: Map<string, TValue>,
    key: string,
    value: TValue
  ): void {
    store.delete(key);
    store.set(key, value);
  }

  private pruneOverflow<TValue>(store: Map<string, TValue>, maxEntries: number): void {
    while (store.size > maxEntries) {
      const oldestKey = store.keys().next().value;
      if (!oldestKey) {
        return;
      }
      store.delete(oldestKey);
    }
  }

  private pruneExpiredTimedEntries<TValue extends { expiresAtMs: number }>(
    store: Map<string, TValue>
  ): void {
    if (store.size === 0) {
      return;
    }

    const now = Date.now();
    for (const [key, value] of store) {
      if (value.expiresAtMs <= now) {
        store.delete(key);
      }
    }
  }

  private listCreatureSnapshotResourceOptions(
    snapshot: ModuleBlobSnapshotSummary,
    kind: Exclude<CreatureResourceOptionKind, "soundset">
  ): CreatureResourceOption[] {
    const extensionByKind: Record<Exclude<CreatureResourceOptionKind, "soundset">, string[]> = {
      conversation: ["dlg"],
      portrait: ["dds", "tga"],
      script: ["ncs", "nss"]
    };
    const prefixByKind: Partial<Record<CreatureResourceOptionKind, string>> = {
      portrait: "po_"
    };
    const extensions = new Set(extensionByKind[kind]);
    const requiredPrefix = prefixByKind[kind];
    const byResRef = new Map<string, CreatureResourceOption>();
    for (const object of snapshot.objects) {
      const parsed = parseCreatureResourceObjectKey(object.key);
      if (!parsed || !extensions.has(parsed.extension)) {
        continue;
      }
      if (requiredPrefix && !parsed.resRef.startsWith(requiredPrefix)) {
        continue;
      }
      if (!byResRef.has(parsed.resRef)) {
        byResRef.set(parsed.resRef, { resRef: parsed.resRef, label: parsed.resRef });
      }
    }
    return [...byResRef.values()];
  }

  private async listCreatureSoundSetOptions(
    snapshot: ModuleBlobSnapshotSummary,
    settings: RuntimeSettingsRecord
  ): Promise<CreatureResourceOption[]> {
    const soundSetTables = snapshot.objects.filter((object) => {
      const parsed = parseCreatureResourceObjectKey(object.key);
      return parsed?.resRef === "soundset" && parsed.extension === "2da";
    });
    const byResRef = new Map<string, CreatureResourceOption>();
    for (const object of soundSetTables) {
      const payload = await this.readModuleBlobObject(object.key, settings.blobStorage);
      if (!payload) {
        continue;
      }
      let table: ReturnType<typeof parseAuroraTwoDaTable>;
      try {
        table = parseAuroraTwoDaTable(payload.bytes, {
          tableName: "soundset.2da",
          profile: "aurora-creature-soundset",
          sourceObjectKey: object.key
        });
      } catch {
        continue;
      }
      for (const row of table.rows) {
        const resRef = this.readCreatureRuntimeTwoDaLookupRef(row, [
          "resref",
          "resource",
          "soundset"
        ]);
        if (!resRef || row.rowId < 0 || row.rowId > 65535 || byResRef.has(resRef)) {
          continue;
        }
        byResRef.set(resRef, {
          resRef,
          label: this.readCreatureRuntimeTwoDaDisplayLabel(row) ?? resRef,
          soundSetFile: row.rowId
        });
      }
    }
    return [...byResRef.values()];
  }

  private async listAllModuleSnapshotObjects(
    settings: BlobStorageSettings
  ): Promise<ModuleBlobSnapshotSummary> {
    if (!this.moduleBlobStorage) {
      return {
        bucket: settings.bucket,
        prefix: settings.modulePrefix,
        moduleHash: undefined,
        totalFiles: 0,
        totalBytes: 0,
        objects: [],
        truncated: false
      };
    }

    const objects: ModuleBlobObjectSummary[] = [];
    let continuationToken: string | undefined;
    let moduleHash: string | undefined;
    let prefix = normalizePrefixForLookup(settings.modulePrefix);

    do {
      const page = await this.moduleBlobStorage.listModuleSnapshot(settings, {
        limit: 50_000,
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

  private async readModuleBlobObject(
    key: string,
    blobSettings?: BlobStorageSettings
  ): Promise<ModuleBlobObjectPayload | null> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return null;
    }

    const settings = blobSettings ?? (await this.getBlobStorageSettings());
    if (!settings) {
      return null;
    }

    const cacheKey = buildModuleBlobObjectCacheKey(settings, key);
    const cached = this.getCachedModuleBlobObject(cacheKey);
    if (cached) {
      return cached;
    }

    return executeInFlight(this.inFlightModuleBlobObjectReads, cacheKey, async () => {
      const inFlightCached = this.getCachedModuleBlobObject(cacheKey);
      if (inFlightCached) {
        return inFlightCached;
      }

      const payload = await this.moduleBlobStorage!.getModuleObject(settings, key);
      if (payload) {
        this.setCachedModuleBlobObject(cacheKey, payload);
      }
      return payload;
    });
  }

  private async getBlobStorageSettings(): Promise<BlobStorageSettings | null> {
    if (!this.runtimeSettingsRepository) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    return settings.blobStorage;
  }

  private primePlaceableAssetBlobCache(results: PlaceableAssetDeliveryEnvelope[]) {
    const objectKeys = Array.from(
      new Set(
        results.flatMap((result) =>
          result.assets
            .filter(isCriticalPlaceableViewportPrimeAsset)
            .map((asset) => asset.objectKey)
            .filter((objectKey) => objectKey.trim().length > 0)
        )
      )
    );
    if (objectKeys.length === 0) {
      return;
    }

    void this.primeModuleBlobObjectCache(objectKeys).catch(() => undefined);
  }

  private async primeModuleBlobObjectCache(objectKeys: string[]): Promise<void> {
    const settings = await this.getBlobStorageSettings();
    if (!settings) {
      return;
    }

    let cursor = 0;
    const workerCount = Math.min(PLACEABLE_ASSET_BLOB_CACHE_PRIME_CONCURRENCY, objectKeys.length);
    const runWorker = async () => {
      while (cursor < objectKeys.length) {
        const index = cursor;
        cursor += 1;
        const objectKey = objectKeys[index];
        if (!objectKey) {
          continue;
        }
        await this.readModuleBlobObject(objectKey, settings);
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  }

  private getCachedModuleBlobObject(cacheKey: string): ModuleBlobObjectPayload | null {
    const cached = this.moduleBlobObjectCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (cached.expiresAtMs <= Date.now()) {
      this.deleteCachedModuleBlobObject(cacheKey);
      return null;
    }

    this.moduleBlobObjectCache.delete(cacheKey);
    this.moduleBlobObjectCache.set(cacheKey, cached);
    return cached.payload;
  }

  private setCachedModuleBlobObject(cacheKey: string, payload: ModuleBlobObjectPayload) {
    if (payload.size > MODULE_BLOB_OBJECT_CACHE_MAX_ENTRY_BYTES) {
      return;
    }

    this.deleteCachedModuleBlobObject(cacheKey);
    const sizeBytes = payload.bytes.byteLength;
    this.moduleBlobObjectCache.set(cacheKey, {
      payload,
      expiresAtMs: Date.now() + MODULE_BLOB_OBJECT_CACHE_TTL_MS,
      sizeBytes
    });
    this.moduleBlobObjectCacheBytes += sizeBytes;
    this.trimModuleBlobObjectCache();
  }

  private deleteCachedModuleBlobObject(cacheKey: string) {
    const cached = this.moduleBlobObjectCache.get(cacheKey);
    if (!cached) {
      return;
    }

    this.moduleBlobObjectCache.delete(cacheKey);
    this.moduleBlobObjectCacheBytes = Math.max(
      0,
      this.moduleBlobObjectCacheBytes - cached.sizeBytes
    );
  }

  private deleteCachedModuleBlobObjectByKey(settings: BlobStorageSettings, key: string) {
    this.deleteCachedModuleBlobObject(buildModuleBlobObjectCacheKey(settings, key));
  }

  private trimModuleBlobObjectCache() {
    const now = Date.now();
    for (const [cacheKey, cached] of this.moduleBlobObjectCache) {
      if (cached.expiresAtMs <= now) {
        this.deleteCachedModuleBlobObject(cacheKey);
      }
    }

    while (this.moduleBlobObjectCacheBytes > MODULE_BLOB_OBJECT_CACHE_MAX_BYTES) {
      const oldestCacheKey = this.moduleBlobObjectCache.keys().next().value as string | undefined;
      if (!oldestCacheKey) {
        break;
      }
      this.deleteCachedModuleBlobObject(oldestCacheKey);
    }
  }

  private selectAssetsForDelivery(
    assets: PlaceableAssetEntry[],
    assetIds?: string[]
  ): PlaceableAssetEntry[] {
    if (!assetIds || assetIds.length === 0) {
      return assets;
    }

    const byId = new Map<string, PlaceableAssetEntry>();
    for (const asset of assets) {
      byId.set(asset.assetId.toLowerCase(), asset);
    }

    return assetIds.map((assetId) => {
      const found = byId.get(assetId.trim().toLowerCase());
      if (found) {
        return found;
      }

      throw new AppException({
        status: 404,
        code: "PLACEABLE_ASSET_NOT_FOUND",
        message: "Placeable asset was not found in cached manifest."
      });
    });
  }

  private async ensureTemplateProjection(
    kind: TemplateProcessingKind,
    cacheKey: string,
    value: TemplateProcessingResult
  ): Promise<TemplateProcessingResult> {
    if (kind === "creature") {
      const cachedCreatureAssetManifestIsCurrent =
        value.assetManifest
          ? !(await this.hasStaleDerivedPlaceableModelAssets(value.assetManifest.assets))
          : false;
      if (
        value.creatureRuntime &&
        value.creatureValidationIssues &&
        value.creatureRenderPackage &&
        (!hasCreatureAssetManifestCandidate(value.creatureRenderPackage) ||
          cachedCreatureAssetManifestIsCurrent)
      ) {
        return value;
      }

      const creatureRuntime = buildCreatureRuntimeProjection(value.metadata);
      const creatureValidationIssues = buildCreatureValidationIssues(creatureRuntime);
      const assetManifest =
        cachedCreatureAssetManifestIsCurrent
          ? value.assetManifest
          : await this.buildCreatureAssetManifest({
              templateId: value.templateId,
              resref: value.resref,
              metadata: value.metadata,
              runtime: creatureRuntime
            });
      const creatureRenderPackage = await this.buildCreatureRenderPackageForCacheEntry(
        cacheKey,
        creatureRuntime,
        assetManifest
      );
      const refreshed: TemplateProcessingResult = {
        ...value,
        assetManifest,
        creatureRenderPackage,
        creatureRuntime,
        creatureValidationIssues
      };

      await this.placeableCache.set<TemplateProcessingResult>(cacheKey, refreshed);
      return refreshed;
    }

    if (kind === "encounter") {
      if (value.encounterRuntime && value.encounterValidationIssues) {
        return value;
      }

      const encounterRuntime = buildEncounterRuntimeProjection(value.metadata);
      const encounterValidationIssues = buildEncounterValidationIssues(encounterRuntime);
      const refreshed: TemplateProcessingResult = {
        ...value,
        encounterRuntime,
        encounterValidationIssues
      };

      await this.placeableCache.set<TemplateProcessingResult>(cacheKey, refreshed);
      return refreshed;
    }

    if (kind === "item") {
      const sourceMetadata = await this.ensureCreatureRuntimeItemMetadata(value.metadata);
      const itemRuntime = buildItemRuntimeProjection(sourceMetadata);
      const metadata = this.mergeItemRuntimeVisualMetadata(sourceMetadata, itemRuntime);
      const itemValidationIssues = buildItemValidationIssues(itemRuntime);
      const cachedAssetManifestCoversRuntime =
        hasCachedAssetManifest(value) &&
        this.itemListAssetManifestCoversRuntimeModels(itemRuntime, value.assetManifest);
      const needsAssetManifest =
        hasItemAssetManifestCandidate(itemRuntime) && !cachedAssetManifestCoversRuntime;
      const assetManifest = needsAssetManifest
        ? await this.buildItemAssetManifest({
            templateId: value.templateId,
            resref: value.resref,
            metadata,
            runtime: itemRuntime
          })
        : value.assetManifest;

      if (
        value.itemRuntime &&
        value.itemValidationIssues &&
        value.metadata === metadata &&
        (!hasItemAssetManifestCandidate(itemRuntime) || cachedAssetManifestCoversRuntime)
      ) {
        return value;
      }

      const refreshed: TemplateProcessingResult = {
        ...value,
        metadata,
        assetManifest,
        itemRuntime,
        itemValidationIssues
      };

      await this.placeableCache.set<TemplateProcessingResult>(cacheKey, refreshed);
      return refreshed;
    }

    if (value.itemRuntime && value.itemValidationIssues) {
      return value;
    }

    const itemRuntime = await this.buildItemRuntimeProjectionFromTemplateMetadata(
      value.metadata
    );
    const itemValidationIssues = buildItemValidationIssues(itemRuntime);
    const refreshed: TemplateProcessingResult = {
      ...value,
      itemRuntime,
      itemValidationIssues
    };

    await this.placeableCache.set<TemplateProcessingResult>(cacheKey, refreshed);
    return refreshed;
  }

  private async hasStaleDerivedPlaceableModelAssets(
    assets: PlaceableAssetEntry[]
  ): Promise<boolean> {
    const derivedAssets = assets.filter(isDerivedModelAssetEntry);
    if (derivedAssets.length === 0) {
      return false;
    }
    for (const asset of derivedAssets) {
      if (!(await this.isDerivedPlaceableModelConverterCurrent(asset))) {
        return true;
      }
    }
    return false;
  }

  private mapTemplateResultByKind<TKind extends TemplateProcessingKind>(
    kind: TKind,
    data: TemplateProcessingEnvelope
  ): TemplateProcessingResultByKind<TKind> {
    if (kind === "creature") {
      return {
        cache: data.cache,
        creature: data.value
      } as TemplateProcessingResultByKind<TKind>;
    }

    if (kind === "encounter") {
      return {
        cache: data.cache,
        encounter: data.value
      } as TemplateProcessingResultByKind<TKind>;
    }

    return {
      cache: data.cache,
      item: data.value
    } as TemplateProcessingResultByKind<TKind>;
  }
}

async function resolvePlaceableSourceResource(
  settings: RuntimeSettingsRecord,
  resref: string,
  candidates: OnDemandResourceCandidate[],
  sourceAssetKind: PlaceableManifestSourceAssetKind = "placeable"
): Promise<OnDemandPlaceableSourceResource | null> {
  const hakResource = await resolvePlaceableHakResource(
    settings,
    resref,
    candidates,
    sourceAssetKind
  );
  if (hakResource) {
    return hakResource;
  }

  return resolvePlaceableVanillaResource(settings, resref, candidates, sourceAssetKind);
}

async function resolvePlaceableHakResource(
  settings: RuntimeSettingsRecord,
  resref: string,
  candidates: OnDemandResourceCandidate[],
  sourceAssetKind: PlaceableManifestSourceAssetKind = "placeable"
): Promise<OnDemandPlaceableSourceResource | null> {
  const source = resolveRuntimeSourceSettingsForManifest(settings, sourceAssetKind);
  if (!source.includeHaks) {
    return null;
  }

  const moduleIfoHakList = await getOnDemandModuleIfoHakList(
    settings.paths.moduleDecompiledPath
  );
  const hakPaths = resolveHakSettingsByAsset(
    settings,
    moduleIfoHakList
  )[sourceAssetKind].hakPaths;

  if (shouldPreferResourceCandidateOrderAcrossHaks(candidates)) {
    for (const candidate of candidates) {
      for (const hakPath of hakPaths) {
        const found = await resolvePlaceableHakResourceCandidate(
          hakPath,
          resref,
          candidate
        );
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  for (const hakPath of hakPaths) {
    for (const candidate of candidates) {
      const found = await resolvePlaceableHakResourceCandidate(
        hakPath,
        resref,
        candidate
      );
      if (found) {
        return found;
      }
    }
  }

  return null;
}

async function resolvePlaceableHakResourceCandidate(
  hakPath: string,
  resref: string,
  candidate: OnDemandResourceCandidate
): Promise<OnDemandPlaceableSourceResource | null> {
  const resolvedHakPath = resolveFileSystemPath(hakPath);
  if (!(await existsAsFileCached(resolvedHakPath))) {
    return null;
  }

  const resourceIndex = await getOnDemandHakResourceIndex(resolvedHakPath);
  if (!resourceIndex) {
    return null;
  }

  if (!resourceIndex.has(buildNwnErfResourceIndexKey(resref, candidate.resourceType))) {
    return null;
  }

  let bytes: Buffer | null;
  try {
    bytes = await readNwnErfResourceFromIndex(
      resolvedHakPath,
      resourceIndex,
      resref,
      candidate.resourceType
    );
  } catch {
    bytes = null;
  }
  if (!bytes) {
    return null;
  }

  const hakName = normalizeHakNameForBlobSource(resolvedHakPath);
  return {
    ...candidate,
    resref,
    fileName: normalizePlaceableSourceFileName(
      `__aurora/sources/hak/${hakName}/${resref}.${candidate.extension}`
    ),
    bytes
  };
}

async function resolvePlaceableVanillaResource(
  settings: RuntimeSettingsRecord,
  resref: string,
  candidates: OnDemandResourceCandidate[],
  sourceAssetKind: PlaceableManifestSourceAssetKind = "placeable"
): Promise<OnDemandPlaceableSourceResource | null> {
  const source = resolveRuntimeSourceSettingsForManifest(settings, sourceAssetKind);
  if (!source.includeVanilla) {
    return null;
  }

  const vanillaRoot = resolveFileSystemPath(settings.paths.vanillaDataPath.trim());
  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return null;
  }

  let reader: NwnKeyBifResourceReader | null;
  try {
    reader = await getOnDemandVanillaResourceReader(vanillaRoot, keyPath);
  } catch {
    return null;
  }
  if (!reader) {
    return null;
  }

  for (const candidate of candidates) {
    const bytes = await reader.read(resref, candidate.resourceType);
    if (!bytes) {
      continue;
    }

    return {
      ...candidate,
      resref,
      fileName: normalizePlaceableSourceFileName(
        `__aurora/sources/vanilla/${candidate.vanillaDirectory}/${resref}.${candidate.extension}`
      ),
      bytes
    };
  }

  return null;
}

async function getOnDemandModuleIfoHakList(moduleDecompiledPath: string): Promise<string[]> {
  const cacheKey = moduleDecompiledPath.trim();
  if (!cacheKey) {
    return [];
  }

  const cached = ON_DEMAND_MODULE_IFO_HAK_LIST_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const lookup = readModuleIfOHakList(moduleDecompiledPath).catch(() => []);
  ON_DEMAND_MODULE_IFO_HAK_LIST_CACHE.set(cacheKey, lookup);
  return lookup;
}

async function getOnDemandHakResourceIndex(
  resolvedHakPath: string
): Promise<NwnErfResourceIndex | null> {
  const cacheKey = resolvedHakPath.trim().toLowerCase();
  if (!cacheKey) {
    return null;
  }

  const cached = ON_DEMAND_HAK_RESOURCE_INDEX_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const lookup = readNwnErfResourceIndex(resolvedHakPath).catch(() => null);
  ON_DEMAND_HAK_RESOURCE_INDEX_CACHE.set(cacheKey, lookup);
  return lookup;
}

async function getOnDemandVanillaResourceReader(
  vanillaRoot: string,
  keyPath: string
): Promise<NwnKeyBifResourceReader | null> {
  const cacheKey = `${vanillaRoot.trim().toLowerCase()}|${keyPath.trim().toLowerCase()}`;
  const cached = ON_DEMAND_VANILLA_READER_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const lookup = NwnKeyBifResourceReader.open(keyPath, vanillaRoot).catch(() => null);
  ON_DEMAND_VANILLA_READER_CACHE.set(cacheKey, lookup);
  return lookup;
}

function resolveRuntimeSourceSettingsForManifest(
  settings: RuntimeSettingsRecord,
  sourceAssetKind: PlaceableManifestSourceAssetKind
) {
  return settings.sources[sourceAssetKind] ?? settings.sources.placeable;
}

function resolveOnDemandModelSourceAssetKindsForRef(
  input: {
    sourceAssetKind?: PlaceableManifestSourceAssetKind;
    metadata: Record<string, string | number | boolean>;
  },
  resref: string
): PlaceableManifestSourceAssetKind[] {
  const primary = input.sourceAssetKind ?? "placeable";
  const kinds: PlaceableManifestSourceAssetKind[] = [primary];
  const normalizedResRef = extractBasename(resref);
  if (primary === "creature" && normalizedResRef) {
    const equipmentRefs = new Set(
      resolveCreatureEquipmentModelDerivedResRefs(input.metadata)
        .map((value) => extractBasename(value))
        .filter(Boolean)
    );
    if (equipmentRefs.has(normalizedResRef)) {
      kinds.push("item");
    }
  }
  return kinds.filter((kind, index) => kinds.indexOf(kind) === index);
}

function buildPlaceableModelResRefCandidates(input: {
  templateId: string;
  resref: string;
  metadata: Record<string, string | number | boolean>;
}): string[] {
  const rawCandidates = [
    ...resolveItemModelDerivedResRefs(input.metadata),
    asMetadataString(input.metadata.lookupModelResRef),
    asMetadataString(input.metadata.modelResRef),
    input.templateId,
    stripPlaceableTemplatePrefix(input.templateId),
    input.resref,
    stripPlaceableTemplatePrefix(input.resref)
  ];
  return deduplicateOrdered(
    rawCandidates
      .map((value) => (value ? extractBasename(value) : ""))
      .filter(Boolean)
  );
}

function isNoRenderableGeometryDerivedFailure(
  failureReasons: string[] | undefined
): boolean {
  return (
    Array.isArray(failureReasons) &&
    failureReasons.length > 0 &&
    failureReasons.every((reason) =>
      /contains no renderable (?:mesh|trimesh) geometry/iu.test(reason)
    )
  );
}

function asMetadataString(value: string | number | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stripPlaceableTemplatePrefix(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("plc_") ? normalized.slice(4) : normalized;
}

function inferOnDemandAssetRole(extension: string): PlaceableAssetRole {
  const normalized = extension.trim().toLowerCase();
  if (normalized === "mdl" || normalized === "mdb") {
    return "model";
  }
  if (normalized === "bmp" || normalized === "dds" || normalized === "tga" || normalized === "plt") {
    return "texture";
  }
  if (normalized === "mtr" || normalized === "txi") {
    return "material";
  }
  return "unknown";
}

function normalizeOnDemandPlaceableSourceResourceBytes(
  resource: OnDemandPlaceableSourceResource
): Buffer {
  if (resource.extension.trim().toLowerCase() !== "dds") {
    return resource.bytes;
  }
  return wrapNwnRawDxtTextureAsDds(resource.bytes) ?? resource.bytes;
}

function normalizePlaceableAssetPayloadForDelivery(
  asset: PlaceableAssetEntry,
  payload: ModuleBlobObjectPayload
): ModuleBlobObjectPayload {
  if (asset.extension.trim().toLowerCase() !== "dds") {
    return payload;
  }
  const normalizedBytes = wrapNwnRawDxtTextureAsDds(payload.bytes);
  if (!normalizedBytes) {
    return payload;
  }
  return {
    ...payload,
    bytes: normalizedBytes,
    size: normalizedBytes.length,
    contentType: inferContentTypeForExtension("dds")
  };
}

function wrapNwnRawDxtTextureAsDds(bytes: Buffer): Buffer | null {
  if (bytes.length < 28) {
    return null;
  }
  if (bytes.subarray(0, 4).toString("ascii") === "DDS ") {
    return null;
  }

  const width = bytes.readUInt32LE(0);
  const height = bytes.readUInt32LE(4);
  const encoding = bytes.readUInt32LE(8);
  const mip0ByteLength = bytes.readUInt32LE(12);
  const fourCc = encoding === 3 ? "DXT1" : encoding === 4 ? "DXT5" : null;
  const blockByteLength = encoding === 3 ? 8 : encoding === 4 ? 16 : 0;
  if (
    !fourCc ||
    !isValidNwnRawDxtDimension(width) ||
    !isValidNwnRawDxtDimension(height) ||
    mip0ByteLength !== computeDxtMipByteLength(width, height, blockByteLength)
  ) {
    return null;
  }

  const payload = bytes.subarray(20);
  const mipLayout = resolveDxtMipLayout(width, height, blockByteLength, payload.length);
  if (!mipLayout) {
    return null;
  }

  return Buffer.concat([
    buildDdsHeader({
      width,
      height,
      mipMapCount: mipLayout.mipMapCount,
      linearSize: mip0ByteLength,
      fourCc
    }),
    payload
  ]);
}

function isValidNwnRawDxtDimension(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= 8192;
}

function resolveDxtMipLayout(
  width: number,
  height: number,
  blockByteLength: number,
  payloadByteLength: number
): { mipMapCount: number } | null {
  let remaining = payloadByteLength;
  let mipWidth = width;
  let mipHeight = height;
  let mipMapCount = 0;

  while (remaining > 0) {
    const mipByteLength = computeDxtMipByteLength(
      mipWidth,
      mipHeight,
      blockByteLength
    );
    if (remaining < mipByteLength) {
      return null;
    }
    remaining -= mipByteLength;
    mipMapCount += 1;
    if (mipWidth === 1 && mipHeight === 1) {
      break;
    }
    mipWidth = Math.max(1, Math.floor(mipWidth / 2));
    mipHeight = Math.max(1, Math.floor(mipHeight / 2));
  }

  return remaining === 0 && mipMapCount > 0 ? { mipMapCount } : null;
}

function computeDxtMipByteLength(
  width: number,
  height: number,
  blockByteLength: number
): number {
  return Math.max(1, Math.ceil(width / 4)) *
    Math.max(1, Math.ceil(height / 4)) *
    blockByteLength;
}

function buildDdsHeader(input: {
  width: number;
  height: number;
  mipMapCount: number;
  linearSize: number;
  fourCc: "DXT1" | "DXT5";
}): Buffer {
  const header = Buffer.alloc(128);
  const DDSD_CAPS = 0x1;
  const DDSD_HEIGHT = 0x2;
  const DDSD_WIDTH = 0x4;
  const DDSD_PITCH_OR_LINEAR_SIZE = 0x80000;
  const DDSD_PIXELFORMAT = 0x1000;
  const DDSD_MIPMAPCOUNT = 0x20000;
  const DDPF_FOURCC = 0x4;
  const DDSCAPS_COMPLEX = 0x8;
  const DDSCAPS_TEXTURE = 0x1000;
  const DDSCAPS_MIPMAP = 0x400000;
  const hasMipMaps = input.mipMapCount > 1;

  header.write("DDS ", 0, 4, "ascii");
  header.writeUInt32LE(124, 4);
  header.writeUInt32LE(
    DDSD_CAPS |
      DDSD_HEIGHT |
      DDSD_WIDTH |
      DDSD_PIXELFORMAT |
      DDSD_PITCH_OR_LINEAR_SIZE |
      (hasMipMaps ? DDSD_MIPMAPCOUNT : 0),
    8
  );
  header.writeUInt32LE(input.height, 12);
  header.writeUInt32LE(input.width, 16);
  header.writeUInt32LE(input.linearSize, 20);
  header.writeUInt32LE(0, 24);
  header.writeUInt32LE(input.mipMapCount, 28);
  header.writeUInt32LE(32, 76);
  header.writeUInt32LE(DDPF_FOURCC, 80);
  header.write(input.fourCc, 84, 4, "ascii");
  header.writeUInt32LE(
    DDSCAPS_TEXTURE | (hasMipMaps ? DDSCAPS_COMPLEX | DDSCAPS_MIPMAP : 0),
    108
  );
  return header;
}

async function resolveFirstExistingVanillaKeyFile(
  vanillaRoot: string
): Promise<string | null> {
  if (!vanillaRoot) {
    return null;
  }
  for (const fileName of VANILLA_KEY_FILE_CANDIDATES) {
    const candidate = resolveFileSystemPath(resolve(vanillaRoot, fileName));
    if (await existsAsFileCached(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveFileSystemPath(pathValue: string): string {
  const hostLocalPath = resolveHostLocalMountedPath(pathValue);
  return hostLocalPath ?? (isAbsolute(pathValue) ? pathValue : resolve(process.cwd(), pathValue));
}

async function existsAsFile(pathValue: string): Promise<boolean> {
  try {
    const metadata = await stat(pathValue);
    return metadata.isFile();
  } catch {
    return false;
  }
}

async function existsAsFileCached(pathValue: string): Promise<boolean> {
  const cacheKey = pathValue.trim().toLowerCase();
  const cached = ON_DEMAND_SOURCE_FILE_EXISTS_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const lookup = existsAsFile(pathValue);
  ON_DEMAND_SOURCE_FILE_EXISTS_CACHE.set(cacheKey, lookup);
  return lookup;
}

function normalizePlaceableSourceFileName(value: string): string {
  return value.replace(/\\/gu, "/").replace(/\/+/gu, "/");
}

function buildAuroraResourceLookupBasenameCandidates(value: string): string[] {
  const basename = extractBasename(value);
  if (!basename) {
    return [];
  }
  const maxResRef = basename.length > 16 ? basename.slice(0, 16) : "";
  return deduplicateOrdered([basename, maxResRef]);
}

function hasAuroraResourceBasename(
  basenames: ReadonlySet<string>,
  reference: string
): boolean {
  return buildAuroraResourceLookupBasenameCandidates(reference).some((candidate) =>
    basenames.has(candidate)
  );
}

function shouldPreferResourceCandidateOrderAcrossHaks(
  candidates: OnDemandResourceCandidate[]
): boolean {
  return candidates === ON_DEMAND_TEXTURE_RESOURCE_CANDIDATES;
}

function buildTextureAssetsByReference(
  assets: PlaceableAssetEntry[]
): Map<string, PlaceableAssetEntry[]> {
  const assetsByReference = new Map<string, PlaceableAssetEntry[]>();
  for (const asset of assets) {
    if (asset.role !== "texture") {
      continue;
    }
    const reference = extractBasename(asset.fileName);
    if (!reference) {
      continue;
    }
    const bucket = assetsByReference.get(reference) ?? [];
    bucket.push(asset);
    assetsByReference.set(reference, bucket);
  }
  return assetsByReference;
}

function hasPreferredTextureVariant(
  assetsByReference: ReadonlyMap<string, PlaceableAssetEntry[]>,
  reference: string
): boolean {
  const assets = assetsByReference.get(extractBasename(reference)) ?? [];
  return assets.some(
    (asset) =>
      getTextureVariantExtensionRank(asset.extension) <= getTextureVariantExtensionRank("dds") &&
      !isNormalizableHakDdsTextureAsset(asset)
  );
}

function isNormalizableHakDdsTextureAsset(asset: PlaceableAssetEntry): boolean {
  return (
    asset.extension.trim().toLowerCase() === "dds" &&
    asset.objectKey.replace(/\\/gu, "/").toLowerCase().includes("/__aurora/sources/hak/")
  );
}

function preferPlaceableTextureAssetVariants(
  assets: PlaceableAssetEntry[],
  _sourcePriority?: PlaceableAssetSourcePriority | null
): PlaceableAssetEntry[] {
  const bestRankByReference = new Map<string, number>();
  for (const asset of assets) {
    if (asset.role !== "texture") {
      continue;
    }
    const reference = extractBasename(asset.fileName);
    if (!reference) {
      continue;
    }
    const rank = getTextureVariantExtensionRank(asset.extension);
    const currentRank = bestRankByReference.get(reference);
    if (currentRank === undefined || rank < currentRank) {
      bestRankByReference.set(reference, rank);
    }
  }

  if (bestRankByReference.size === 0) {
    return assets;
  }

  return assets.filter((asset) => {
    if (asset.role !== "texture") {
      return true;
    }
    const reference = extractBasename(asset.fileName);
    if (!reference) {
      return true;
    }
    return getTextureVariantExtensionRank(asset.extension) === bestRankByReference.get(reference);
  });
}

function getTextureVariantExtensionRank(extension: string): number {
  const normalized = extension.trim().toLowerCase();
  if (normalized === "dds") {
    return 0;
  }
  if (normalized === "tga") {
    return 1;
  }
  if (normalized === "bmp") {
    return 2;
  }
  if (normalized === "plt") {
    return 3;
  }
  return 4;
}

function dedupePlaceableAssets(assets: PlaceableAssetEntry[]): PlaceableAssetEntry[] {
  const byObjectKey = new Map<string, PlaceableAssetEntry>();
  for (const asset of assets) {
    byObjectKey.set(asset.objectKey, asset);
  }
  return [...byObjectKey.values()];
}

function buildPlaceableDerivedGenerationKey(
  sourceFiles: Array<{ asset: PlaceableAssetEntry; bytes: Buffer }>
): string {
  return [
    "placeable-derived-generation/v2",
    AURORA_MDL_TO_GLB_CONVERTER_VERSION,
    ...sourceFiles
      .map(({ asset, bytes }) =>
        [
          normalizeLookupKey(asset.objectKey),
          normalizeLookupKey(asset.assetId),
          normalizeLookupKey(asset.etag ?? ""),
          String(asset.sizeBytes),
          String(bytes.length)
        ].join("#")
      )
      .sort()
  ].join("|");
}

function bindAuroraEmitterChunkModelAssets(
  assetManifest: PlaceableAssetManifest,
  auroraEmitter: NonNullable<PlaceableRenderPackage["auroraEmitter"]>
): {
  auroraEmitter: NonNullable<PlaceableRenderPackage["auroraEmitter"]>;
  chunkModelAssetIds: string[];
  diagnostics: PlaceableRenderPackage["diagnostics"];
} {
  const chunkModelAssetIds: string[] = [];
  const diagnostics: PlaceableRenderPackage["diagnostics"] = [];
  const sourceModelAssetsByBasename = new Map<string, PlaceableAssetEntry[]>();
  const derivedModelAssetsByBasename = new Map<string, PlaceableAssetEntry[]>();

  assetManifest.assets.filter(isAuroraSourceModelAssetEntry).forEach((asset) => {
    const basename = extractBasename(asset.fileName);
    if (!basename) {
      return;
    }
    const bucket = sourceModelAssetsByBasename.get(basename) ?? [];
    bucket.push(asset);
    sourceModelAssetsByBasename.set(basename, bucket);
  });
  assetManifest.assets.filter(isDerivedModelAssetEntry).forEach((asset) => {
    const basename = extractBasename(asset.fileName);
    if (!basename) {
      return;
    }
    const bucket = derivedModelAssetsByBasename.get(basename) ?? [];
    bucket.push(asset);
    bucket.sort(compareDerivedChunkModelAssetPriority);
    derivedModelAssetsByBasename.set(basename, bucket);
  });

  const emitters = auroraEmitter.emitters.map((emitter) => {
    const chunkName = normalizeAuroraModelResourceReference(emitter.chunkName);
    if (!chunkName) {
      return emitter;
    }

    if (typeof emitter.texture === "string" && emitter.texture.trim().length > 0) {
      diagnostics.push({
        code: "VFX_CHUNKNAME_OVERRIDES_TEXTURE",
        severity: "warn",
        message:
          "Emitter has both texture and chunkName; Aurora chunkName selects the model-particle lane while texture remains preserved."
      });
    }

    const chunkModelAsset = derivedModelAssetsByBasename.get(chunkName)?.[0];
    if (!chunkModelAsset) {
      const sourceModelAsset = sourceModelAssetsByBasename.get(chunkName)?.[0];
      if (sourceModelAsset) {
        diagnostics.push({
          code: "VFX_CHUNK_MODEL_DERIVED_MISSING",
          severity: "warn",
          message: `Chunk model '${chunkName}' was found as ${sourceModelAsset.fileName}, but no derived GLB/GLTF asset is available for browser rendering.`
        });
        return emitter;
      }
      diagnostics.push({
        code: "VFX_CHUNK_MODEL_MISSING",
        severity: "warn",
        message: `Chunk model '${chunkName}' was referenced by an emitter but was not found as an MDL/MDB or derived GLB/GLTF asset.`
      });
      return emitter;
    }

    if (!chunkModelAssetIds.includes(chunkModelAsset.assetId)) {
      chunkModelAssetIds.push(chunkModelAsset.assetId);
    }
    diagnostics.push({
      code: "VFX_CHUNK_MODEL_RESOURCE_READY",
      severity: "warn",
      message:
        "Emitter chunkName was resolved to a renderable derived model asset for the chunk-particle lane."
    });

    return {
      ...emitter,
      chunkModelAssetId: chunkModelAsset.assetId,
      chunkModelFileName: chunkModelAsset.fileName,
      chunkModelObjectKey: chunkModelAsset.objectKey
    };
  });

  return {
    auroraEmitter: {
      ...auroraEmitter,
      emitters
    },
    chunkModelAssetIds,
    diagnostics
  };
}

function compareDerivedChunkModelAssetPriority(
  left: PlaceableAssetEntry,
  right: PlaceableAssetEntry
): number {
  const leftExtension = left.extension.trim().toLowerCase();
  const rightExtension = right.extension.trim().toLowerCase();
  const extensionDelta =
    (leftExtension === "glb" ? 0 : leftExtension === "gltf" ? 1 : 2) -
    (rightExtension === "glb" ? 0 : rightExtension === "gltf" ? 1 : 2);
  if (extensionDelta !== 0) {
    return extensionDelta;
  }
  const converterVersionDelta =
    getDerivedModelConverterPathPriority(left) - getDerivedModelConverterPathPriority(right);
  if (converterVersionDelta !== 0) {
    return converterVersionDelta;
  }
  return left.fileName.localeCompare(right.fileName);
}

function buildPrimaryModelRenderManifestForExactLookup(
  manifest: PlaceableAssetManifest,
  metadata: Record<string, string | number | boolean> | undefined
): PlaceableAssetManifest {
  const exactModelResRef = metadata
    ? resolvePrimaryPlaceableModelLookupResRef(metadata)
    : undefined;
  if (!exactModelResRef) {
    return manifest;
  }

  const assets = manifest.assets.filter((asset) => {
    if (!isPlaceableModelRenderCandidateAsset(asset)) {
      return true;
    }
    const basename = extractBasename(asset.fileName);
    return Boolean(
      basename && hasAuroraResourceBasename(new Set([basename]), exactModelResRef)
    );
  });

  return assets.length === manifest.assets.length
    ? manifest
    : {
        ...manifest,
        assetCount: assets.length,
        assets
      };
}

function isPlaceableModelRenderCandidateAsset(asset: PlaceableAssetEntry): boolean {
  const extension = asset.extension.trim().toLowerCase();
  return extension === "mdl" || extension === "mdb" || extension === "glb" || extension === "gltf";
}

function selectSourceModelAssetsForDerived(
  input: {
    resref: string;
    metadata: Record<string, string | number | boolean>;
  },
  assets: PlaceableAssetEntry[]
): PlaceableAssetEntry[] {
  const exactModelResRef = resolvePrimaryPlaceableModelLookupResRef(input.metadata);
  const fallbackResRef = extractBasename(input.resref);
  const modelAssets = assets.filter((asset) => {
    const extension = asset.extension.trim().toLowerCase();
    return asset.role === "model" && (extension === "mdl" || extension === "mdb");
  });
  const creatureModelResRefs = resolveCreatureModelDerivedResRefs(input.metadata);
  if (creatureModelResRefs.length > 0) {
    const creaturePartBasenames = new Set(creatureModelResRefs);
    const creaturePartAssets = modelAssets.filter((asset) => {
      const basename = extractBasename(asset.fileName);
      return Boolean(basename && hasAuroraResourceBasename(creaturePartBasenames, basename));
    });
    if (creaturePartAssets.length > 0) {
      return creaturePartAssets;
    }
  }
  const itemModelResRefs = resolveItemModelDerivedResRefs(input.metadata);
  if (itemModelResRefs.length > 0) {
    const itemPartBasenames = new Set(itemModelResRefs);
    const itemPartAssets = modelAssets.filter((asset) => {
      const basename = extractBasename(asset.fileName);
      return Boolean(basename && hasAuroraResourceBasename(itemPartBasenames, basename));
    });
    if (itemPartAssets.length > 0) {
      return itemPartAssets;
    }
  }

  const preferred = modelAssets.filter((asset) => {
    const basename = extractBasename(asset.fileName);
    return Boolean(
      basename &&
        (exactModelResRef
          ? hasAuroraResourceBasename(new Set([basename]), exactModelResRef)
          : basename === fallbackResRef)
    );
  });

  if (preferred.length > 0 || exactModelResRef) {
    return preferred;
  }

  return modelAssets.slice(0, 1);
}

function hasDerivedModelAssetForExactLookup(
  input: {
    metadata: Record<string, string | number | boolean>;
  },
  assets: PlaceableAssetEntry[]
): boolean {
  const itemModelResRefs = resolveItemModelDerivedResRefs(input.metadata);
  if (itemModelResRefs.length > 0) {
    const derivedModelBasenames = new Set(
      assets
        .filter(isDerivedModelAssetEntry)
        .map((asset) => extractBasename(asset.fileName))
        .filter(Boolean)
    );
    return itemModelResRefs.every((resref) =>
      hasAuroraResourceBasename(derivedModelBasenames, resref)
    );
  }

  const exactModelResRef = resolvePrimaryPlaceableModelLookupResRef(input.metadata);
  if (!exactModelResRef) {
    return assets.some(isDerivedModelAssetEntry);
  }

  return assets.some((asset) => {
    if (!isDerivedModelAssetEntry(asset)) {
      return false;
    }
    const basename = extractBasename(asset.fileName);
    return Boolean(
      basename && hasAuroraResourceBasename(new Set([basename]), exactModelResRef)
    );
  });
}

function resolvePrimaryPlaceableModelLookupResRef(
  metadata: Record<string, string | number | boolean>
): string | undefined {
  return (
    normalizeAuroraModelResourceReference(metadata.lookupModelResRef) ??
    normalizeAuroraModelResourceReference(metadata.modelResRef) ??
    undefined
  );
}

function selectSourceModelAssetsNeedingDerived(
  input: {
    metadata: Record<string, string | number | boolean>;
  },
  assets: PlaceableAssetEntry[],
  sourceModelAssets: PlaceableAssetEntry[]
): PlaceableAssetEntry[] {
  const itemModelResRefs = resolveItemModelDerivedResRefs(input.metadata);
  if (itemModelResRefs.length > 0) {
    const itemPartBasenames = new Set(itemModelResRefs);
    const itemSourceModelAssets = sourceModelAssets.filter((asset) => {
      const basename = extractBasename(asset.fileName);
      return Boolean(basename && hasAuroraResourceBasename(itemPartBasenames, basename));
    });
    const derivedModelBasenames = new Set(
      assets
        .filter(isDerivedModelAssetEntry)
        .map((asset) => extractBasename(asset.fileName))
        .filter(Boolean)
    );
    if (derivedModelBasenames.size === 0) {
      return itemSourceModelAssets;
    }

    return itemSourceModelAssets.filter((asset) => {
      const basename = extractBasename(asset.fileName);
      return Boolean(basename && !hasAuroraResourceBasename(derivedModelBasenames, basename));
    });
  }

  const creatureModelResRefs = resolveCreatureModelDerivedResRefs(input.metadata);
  if (creatureModelResRefs.length === 0) {
    return assets.some(isDerivedModelAssetEntry) ? [] : sourceModelAssets;
  }

  const derivedModelBasenames = new Set(
    assets
      .filter(isDerivedModelAssetEntry)
      .map((asset) => extractBasename(asset.fileName))
      .filter(Boolean)
  );
  if (derivedModelBasenames.size === 0) {
    return sourceModelAssets;
  }

  return sourceModelAssets.filter((asset) => {
    const basename = extractBasename(asset.fileName);
    return Boolean(basename && !hasAuroraResourceBasename(derivedModelBasenames, basename));
  });
}

function selectMissingAuroraModelSourceResRefs(
  modelResRefs: string[],
  assets: PlaceableAssetEntry[]
): string[] {
  const existingSourceModelBasenames = new Set(
    assets
      .filter(isAuroraSourceModelAssetEntry)
      .map((asset) => extractBasename(asset.fileName))
      .filter(Boolean)
  );
  const existingDerivedModelBasenames = new Set(
    assets
      .filter(isDerivedModelAssetEntry)
      .map((asset) => extractBasename(asset.fileName))
      .filter(Boolean)
  );

  return modelResRefs.filter(
    (resref) =>
      !hasAuroraResourceBasename(existingSourceModelBasenames, resref) &&
      !hasAuroraResourceBasename(existingDerivedModelBasenames, resref)
  );
}

function resolveCreaturePartModelDerivedResRefs(
  metadata: Record<string, string | number | boolean>
): string[] {
  const raw = asMetadataString(metadata.creaturePartModelRefs);
  if (!raw) {
    return [];
  }
  return deduplicateOrdered(
    raw
      .split("|")
      .map((value) => extractBasename(value))
      .filter(Boolean)
  );
}

function resolveCreatureSkeletonModelDerivedResRefs(
  metadata: Record<string, string | number | boolean>
): string[] {
  const raw = asMetadataString(metadata.creatureSkeletonModelRefs);
  if (!raw) {
    return [];
  }
  return deduplicateOrdered(
    raw
      .split("|")
      .map((value) => extractBasename(value))
      .filter(Boolean)
  );
}

function resolveCreatureModelDerivedResRefs(
  metadata: Record<string, string | number | boolean>
): string[] {
  return deduplicateOrdered([
    ...resolveCreatureDirectModelDerivedResRefs(metadata),
    ...resolveCreatureSkeletonModelDerivedResRefs(metadata),
    ...resolveCreaturePartModelDerivedResRefs(metadata),
    ...resolveCreatureEquipmentModelDerivedResRefs(metadata),
    ...resolveCreatureSupermodelDerivedResRefs(metadata),
    ...resolveItemModelDerivedResRefs(metadata)
  ]);
}

function resolveCreatureDirectModelDerivedResRefs(
  metadata: Record<string, string | number | boolean>
): string[] {
  const raw = asMetadataString(metadata.creatureDirectModelRefs);
  if (!raw) {
    return [];
  }
  return deduplicateOrdered(
    raw
      .split("|")
      .map((value) => extractBasename(value))
      .filter(Boolean)
  );
}

function resolveCreatureSupermodelDerivedResRefs(
  metadata: Record<string, string | number | boolean>
): string[] {
  const raw = asMetadataString(metadata.creatureSupermodelRefs);
  if (!raw) {
    return [];
  }
  return deduplicateOrdered(
    raw
      .split("|")
      .map((value) => extractBasename(value))
      .filter(Boolean)
  );
}

function resolveCreatureEquipmentModelDerivedResRefs(
  metadata: Record<string, string | number | boolean>
): string[] {
  const raw = asMetadataString(metadata.creatureEquipmentModelRefs);
  if (!raw) {
    return [];
  }
  return deduplicateOrdered(
    raw
      .split("|")
      .map((value) => extractBasename(value))
      .filter(Boolean)
  );
}

function resolveItemModelDerivedResRefs(
  metadata: Record<string, string | number | boolean>
): string[] {
  const raw = asMetadataString(metadata.itemModelRefs);
  if (!raw) {
    return [];
  }
  return deduplicateOrdered(
    raw
      .split("|")
      .map((value) => extractBasename(value))
      .filter(Boolean)
  );
}

function resolveItemTextureLookupResRefs(
  metadata: Record<string, string | number | boolean>
): string[] {
  return deduplicateOrdered([
    ...splitMetadataResourceRefs(metadata.itemIconRefs),
    ...splitMetadataResourceRefs(metadata.itemTextureRefs)
  ]);
}

function resolvePlaceableFastShadowTextureLookupResRefs(
  metadata: Record<string, string | number | boolean>
): string[] {
  const rawShadowSize = metadata.source2daShadowSize;
  const shadowSize =
    typeof rawShadowSize === "number"
      ? rawShadowSize
      : typeof rawShadowSize === "string"
        ? Number(rawShadowSize.trim())
        : Number.NaN;
  return Number.isFinite(shadowSize) ? [PLACEABLE_FAST_SHADOW_TEXTURE_RESREF] : [];
}

function splitMetadataResourceRefs(value: string | number | boolean | undefined): string[] {
  const raw = asMetadataString(value);
  if (!raw) {
    return [];
  }
  return raw
    .split("|")
    .map((entry) => extractBasename(entry))
    .filter(Boolean);
}

function selectAuroraEmitterSourceModelAssets(
  assets: PlaceableAssetEntry[]
): PlaceableAssetEntry[] {
  const byBasename = new Map<
    string,
    Array<{ asset: PlaceableAssetEntry; originalIndex: number }>
  >();

  assets.forEach((asset, originalIndex) => {
    const basename = extractBasename(asset.fileName);
    const key = basename || `${asset.objectKey}#${originalIndex}`;
    const bucket = byBasename.get(key) ?? [];
    bucket.push({ asset, originalIndex });
    byBasename.set(key, bucket);
  });

  return Array.from(byBasename.values()).map((bucket) => {
    bucket.sort((left, right) => {
      const sourceDelta = compareAssetSourcePriority(left.asset, right.asset);
      if (sourceDelta !== 0) {
        return sourceDelta;
      }
      return left.originalIndex - right.originalIndex;
    });
    return bucket[0]!.asset;
  });
}

function isDerivedModelAssetEntry(asset: PlaceableAssetEntry): boolean {
  const extension = asset.extension.trim().toLowerCase();
  return extension === "glb" || extension === "gltf";
}

function isAuroraSourceModelAssetEntry(asset: PlaceableAssetEntry): boolean {
  const extension = asset.extension.trim().toLowerCase();
  return extension === "mdl" || extension === "mdb";
}

type AuroraMdlLightPayloadNode = NonNullable<
  PlaceableRenderPackage["auroraLight"]
>["lights"][number];

function hasAuroraMdlLightFlarePayload(light: AuroraMdlLightPayloadNode): boolean {
  return (
    light.generateFlare !== undefined ||
    (light.textureNames?.length ?? 0) > 0 ||
    (light.flareSizes?.length ?? 0) > 0 ||
    (light.flarePositions?.length ?? 0) > 0 ||
    (light.flareColorShifts?.length ?? 0) > 0 ||
    light.flareRadius !== undefined
  );
}

function hasAuroraMdlLightFlareListCardinalityMismatch(
  light: AuroraMdlLightPayloadNode
): boolean {
  const counts = [
    light.textureNames?.length,
    light.flareSizes?.length,
    light.flarePositions?.length,
    light.flareColorShifts?.length
  ].filter((value): value is number => typeof value === "number" && value > 0);
  return counts.length > 1 && counts.some((value) => value !== counts[0]);
}

function inferAuroraSourceModelFormat(
  bytes: Buffer
): PlaceableRenderPackageAuroraEmitterSource {
  return bytes.length >= 12 && bytes.readUInt32LE(0) === 0
    ? "aurora-mdl-binary"
    : "aurora-mdl-ascii";
}

function resolveCreatureDirectModelCandidateResRefs(
  renderPackage: CreatureRenderPackage | undefined
): string[] {
  return deduplicateOrdered(
    renderPackage?.sourceModelCandidates
      ?.filter((candidate) => candidate.confidence === "direct-model")
      .map((candidate) => candidate.resref)
      .filter((resref) => resref.trim().length > 0) ?? []
  );
}

function resolveCreaturePartModelCandidateResRefs(
  renderPackage: CreatureRenderPackage | undefined
): string[] {
  const candidates = renderPackage?.partModelCandidates ?? [];
  return deduplicateOrdered(
    [
      ...candidates.map((candidate) => candidate.modelResRef),
      ...buildCreaturePhenotypeZeroPartModelFallbackCandidates(candidates).map(
        (candidate) => candidate.modelResRef
      )
    ].filter((resref): resref is string => Boolean(resref && resref.trim().length > 0))
  );
}

function buildCreaturePhenotypeZeroPartModelFallbackCandidates(
  candidates: CreatureRenderPackage["partModelCandidates"]
): CreatureRenderPackage["partModelCandidates"] {
  if (candidates.length === 0) {
    return [];
  }

  const existingResRefs = new Set(
    candidates
      .map((candidate) =>
        candidate.modelResRef ? extractBasename(candidate.modelResRef).toLowerCase() : ""
      )
      .filter(Boolean)
  );
  const fallbackCandidates: CreatureRenderPackage["partModelCandidates"] = [];

  for (const candidate of candidates) {
    if (!candidate.modelPrefix || !isCreaturePhenotypeZeroPartFallbackCandidate(candidate)) {
      continue;
    }

    const prefixMatch = /^(p[fm][a-z])([1-9])_$/u.exec(candidate.modelPrefix.toLowerCase());
    if (!prefixMatch) {
      continue;
    }

    const phenotypeZeroPrefix = `${prefixMatch[1]}0_`;
    const fallbackPartIds = dedupeCreaturePartIds([candidate.partId, 1]);
    for (const partId of fallbackPartIds) {
      const modelResRef = `${phenotypeZeroPrefix}${candidate.partModelName
        .trim()
        .toLowerCase()}${String(partId).padStart(3, "0")}`;
      if (existingResRefs.has(modelResRef)) {
        continue;
      }
      existingResRefs.add(modelResRef);
      fallbackCandidates.push({
        slot: candidate.slot,
        partId,
        partModelName: candidate.partModelName,
        ...(candidate.nodeName ? { nodeName: candidate.nodeName } : {}),
        modelPrefix: phenotypeZeroPrefix,
        modelResRef,
        modelResRefPattern: "aurora-player-body-part",
        modelResRefPatternFormat:
          candidate.modelResRefPatternFormat ?? "p%c%c%s_%s_%03d",
        source: candidate.source,
        ...(candidate.source2daRow !== undefined ? { source2daRow: candidate.source2daRow } : {}),
        ...(candidate.materialColors ? { materialColors: candidate.materialColors } : {}),
        sourceKey: candidate.sourceKey
      });
    }
  }

  return fallbackCandidates;
}

function isCreaturePhenotypeZeroPartFallbackCandidate(
  candidate: CreatureRenderPackage["partModelCandidates"][number]
): boolean {
  if (!candidate.modelResRefPattern && !candidate.modelResRef) {
    return false;
  }
  const partName = candidate.partModelName.trim().toLowerCase();
  if (candidate.source === "utc.Appearance_Head") {
    return candidate.slot === "head" && partName === "head";
  }
  return candidate.source === "capart.2da.MDLNAME" && candidate.slot !== "robe";
}

function dedupeCreaturePartIds(values: number[]): number[] {
  const seen = new Set<number>();
  const ordered: number[] = [];
  for (const value of values) {
    if (!Number.isInteger(value) || value < 0 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    ordered.push(value);
  }
  return ordered;
}

function hasCreatureModelCandidateDeliveryUrl(candidate: {
  glbUrl?: string;
  modelUrl?: string;
}): boolean {
  return Boolean(candidate.glbUrl || candidate.modelUrl);
}

function resolveCreatureDirectModelDeliveryUrl(
  candidates: CreatureRenderPackage["sourceModelCandidates"],
  preferredResRefs: string[]
): { glbUrl?: string; modelUrl?: string } {
  const directCandidates = candidates.filter(
    (candidate) => candidate.confidence === "direct-model" && hasCreatureModelCandidateDeliveryUrl(candidate)
  );
  const preferredKeys = preferredResRefs
    .map((resref) => normalizeCreatureRenderModelRef(resref))
    .filter((resref) => resref.length > 0);
  const preferredCandidate =
    preferredKeys
      .map((resref) =>
        directCandidates.find(
          (candidate) => normalizeCreatureRenderModelRef(candidate.resref) === resref
        )
      )
      .find((candidate): candidate is CreatureRenderPackage["sourceModelCandidates"][number] =>
        Boolean(candidate)
      ) ?? directCandidates[0];

  return preferredCandidate
    ? {
        ...(preferredCandidate.glbUrl ? { glbUrl: preferredCandidate.glbUrl } : {}),
        ...(preferredCandidate.modelUrl ? { modelUrl: preferredCandidate.modelUrl } : {})
      }
    : {};
}

function mergeCreaturePartModelCandidatesWithFallbacks(
  candidates: CreatureRenderPackage["partModelCandidates"],
  fallbackCandidates: CreatureRenderPackage["partModelCandidates"]
): CreatureRenderPackage["partModelCandidates"] {
  if (fallbackCandidates.length === 0) {
    return candidates;
  }

  const existingResRefs = new Set(
    candidates
      .map((candidate) =>
        candidate.modelResRef ? extractBasename(candidate.modelResRef).toLowerCase() : ""
      )
      .filter(Boolean)
  );
  const renderableFallbacks = fallbackCandidates.filter((candidate) => {
    const resref = candidate.modelResRef ? extractBasename(candidate.modelResRef).toLowerCase() : "";
    if (!resref || existingResRefs.has(resref)) {
      return false;
    }
    existingResRefs.add(resref);
    return true;
  });

  if (renderableFallbacks.length === 0) {
    return candidates;
  }

  const preferredFallbacks = selectPreferredCreaturePartFallbacksBySlot(
    renderableFallbacks
  );
  const fallbackSlots = new Set(preferredFallbacks.map((candidate) => candidate.slot));
  const candidatesWithCoveredMissingSlotsRemoved = candidates.filter(
    (candidate) => hasCreatureModelCandidateDeliveryUrl(candidate) || !fallbackSlots.has(candidate.slot)
  );
  return [...candidatesWithCoveredMissingSlotsRemoved, ...preferredFallbacks];
}

function selectPreferredCreaturePartFallbacksBySlot(
  candidates: CreatureRenderPackage["partModelCandidates"]
): CreatureRenderPackage["partModelCandidates"] {
  const bySlot = new Map<
    CreatureRenderPackage["partModelCandidates"][number]["slot"],
    CreatureRenderPackage["partModelCandidates"][number]
  >();
  for (const candidate of candidates) {
    const current = bySlot.get(candidate.slot);
    if (!current || shouldPreferCreaturePartFallbackCandidate(candidate, current)) {
      bySlot.set(candidate.slot, candidate);
    }
  }
  return Array.from(bySlot.values());
}

function shouldPreferCreaturePartFallbackCandidate(
  candidate: CreatureRenderPackage["partModelCandidates"][number],
  current: CreatureRenderPackage["partModelCandidates"][number]
): boolean {
  const candidateKeepsRequestedPart = (candidate.partId ?? 1) !== 1;
  const currentKeepsRequestedPart = (current.partId ?? 1) !== 1;
  return candidateKeepsRequestedPart && !currentKeepsRequestedPart;
}

function mergeCreatureSkeletonModelCandidatesWithPartModels(
  candidates: CreatureRenderPackage["skeletonModelCandidates"],
  partModelCandidates: CreatureRenderPackage["partModelCandidates"]
): CreatureRenderPackage["skeletonModelCandidates"] {
  const partDerivedCandidates =
    buildCreatureSkeletonModelCandidatesFromPartModels(partModelCandidates);
  if (partDerivedCandidates.length === 0) {
    return candidates;
  }
  const seen = new Set<string>();
  const merged: CreatureRenderPackage["skeletonModelCandidates"] = [];
  [...partDerivedCandidates, ...candidates].forEach((candidate) => {
    const key = candidate.resref.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(candidate);
  });
  return merged;
}

function buildCreatureSkeletonModelCandidatesFromPartModels(
  partModelCandidates: CreatureRenderPackage["partModelCandidates"]
): CreatureRenderPackage["skeletonModelCandidates"] {
  const seen = new Set<string>();
  const candidates: CreatureRenderPackage["skeletonModelCandidates"] = [];
  partModelCandidates.forEach((partCandidate) => {
    const skeletonResRef = resolveCreatureSkeletonResRefFromPartModelCandidate(partCandidate);
    if (!skeletonResRef || seen.has(skeletonResRef)) {
      return;
    }
    seen.add(skeletonResRef);
    candidates.push({
      resref: skeletonResRef,
      role: "base-skeleton",
      source: "part-model-prefix",
      modelPrefix: `${skeletonResRef}_`,
      confidence: "prefix-derived"
    });
  });
  return candidates;
}

function resolveCreatureSkeletonResRefFromPartModelCandidate(
  candidate: CreatureRenderPackage["partModelCandidates"][number]
): string | null {
  const prefix = candidate.modelPrefix?.trim().toLowerCase();
  if (prefix) {
    const skeletonResRef = prefix.replace(/_+$/u, "");
    if (/^p[mf][a-z]\d$/iu.test(skeletonResRef)) {
      return skeletonResRef;
    }
  }
  const modelResRef = candidate.modelResRef?.trim().toLowerCase();
  const modelResRefMatch = modelResRef?.match(/^(p[mf][a-z]\d)_/iu);
  return modelResRefMatch?.[1] ?? null;
}

function resolveCreatureSkeletonModelCandidateResRefs(
  renderPackage: CreatureRenderPackage | undefined
): string[] {
  return deduplicateOrdered(
    renderPackage?.skeletonModelCandidates
      ?.map((candidate) => candidate.resref)
      .filter((resref) => resref.trim().length > 0) ?? []
  );
}

function resolveCreatureSkeletonSupermodelCandidateResRefs(
  renderPackage: CreatureRenderPackage | undefined
): string[] {
  return deduplicateOrdered(
    renderPackage?.skeletonModelCandidates.flatMap((candidate) =>
      resolveCreatureSkeletonAnimationSupermodelCandidateResRefs(candidate)
    ) ?? []
  );
}

function resolveCreatureEquipmentModelCandidateResRefs(
  renderPackage: CreatureRenderPackage | undefined
): string[] {
  return deduplicateOrdered(
    renderPackage?.equipmentModelCandidates
      ?.flatMap((candidate) => candidate.itemModelPartResRefs ?? [])
      .filter((resref) => resref.trim().length > 0) ?? []
  );
}

function decorateCreaturePartModelCandidatesWithDeliveryPaths(
  cacheKey: string,
  assetManifest: PlaceableAssetManifest,
  candidates: CreatureRenderPackage["partModelCandidates"],
  blobSettings?: BlobStorageSettings | null
): CreatureRenderPackage["partModelCandidates"] {
  if (candidates.length === 0 || assetManifest.assets.length === 0) {
    return candidates;
  }

  const assetsByBasename = collectCreatureModelDeliveryAssetsByBasename(assetManifest);

  return candidates.map((candidate) => {
    const modelResRef = normalizeCreatureRenderModelRef(candidate.modelResRef);
    const asset = modelResRef ? assetsByBasename.get(modelResRef)?.[0] : undefined;
    if (!asset) {
      return candidate;
    }
    const extension = asset.extension.toLowerCase();
    const deliveryUrl = buildPlaceableAssetBrowserDeliveryUrl(
      cacheKey,
      asset,
      blobSettings,
      false
    );
    return {
      ...candidate,
      assetId: asset.assetId,
      ...(extension === "glb" ? { glbUrl: deliveryUrl } : {}),
      ...(extension === "gltf" ? { modelUrl: deliveryUrl } : {})
    };
  });
}

function decorateCreatureEquipmentModelCandidatesWithDeliveryPaths(
  cacheKey: string,
  assetManifest: PlaceableAssetManifest,
  candidates: CreatureRenderPackage["equipmentModelCandidates"],
  blobSettings?: BlobStorageSettings | null,
  supermodelRefsByModelResRef: Map<string, string> = new Map(),
  animatedSupermodelRefsByModelResRef: Map<string, string> = new Map()
): CreatureRenderPackage["equipmentModelCandidates"] {
  if (candidates.length === 0 || assetManifest.assets.length === 0) {
    return candidates;
  }

  const assetsByBasename = collectCreatureModelDeliveryAssetsByBasename(assetManifest);

  return candidates.map((candidate) => {
    const partCandidates = candidate.itemModelPartCandidates ?? [];
    if (partCandidates.length === 0) {
      return candidate;
    }
    const decoratedPartCandidates = partCandidates.map((partCandidate) => {
      const partResRef = normalizeCreatureRenderModelRef(partCandidate.resref);
      const asset = partResRef ? assetsByBasename.get(partResRef)?.[0] : undefined;
      if (!asset) {
        return partCandidate;
      }
      const extension = asset.extension.toLowerCase();
      const deliveryUrl = buildPlaceableAssetBrowserDeliveryUrl(
        cacheKey,
        asset,
        blobSettings,
        false
      );
      const supermodelResRef = partResRef
        ? animatedSupermodelRefsByModelResRef.get(partResRef) ??
          supermodelRefsByModelResRef.get(partResRef)
        : undefined;
      const supermodelModelRef = normalizeCreatureRenderModelRef(supermodelResRef);
      const supermodelAsset = supermodelModelRef
        ? assetsByBasename.get(supermodelModelRef)?.[0]
        : undefined;
      const supermodelExtension = supermodelAsset?.extension.toLowerCase();
      const supermodelDeliveryUrl = supermodelAsset
        ? buildPlaceableAssetBrowserDeliveryUrl(cacheKey, supermodelAsset, blobSettings, false)
        : undefined;
      const supermodelChain = collectCreatureSupermodelDeliveryChain(
        cacheKey,
        supermodelResRef,
        assetsByBasename,
        blobSettings,
        supermodelRefsByModelResRef
      );
      return {
        ...partCandidate,
        assetId: asset.assetId,
        ...(extension === "glb" ? { glbUrl: deliveryUrl } : {}),
        ...(extension === "gltf" ? { modelUrl: deliveryUrl } : {}),
        ...(supermodelResRef ? { supermodelResRef } : {}),
        ...(supermodelAsset ? { supermodelAssetId: supermodelAsset.assetId } : {}),
        ...(supermodelExtension === "glb" && supermodelDeliveryUrl
          ? { supermodelGlbUrl: supermodelDeliveryUrl }
          : {}),
        ...(supermodelExtension === "gltf" && supermodelDeliveryUrl
          ? { supermodelModelUrl: supermodelDeliveryUrl }
          : {}),
        ...(supermodelChain.resRefs.length > 0
          ? { supermodelChainResRefs: supermodelChain.resRefs }
          : {}),
        ...(supermodelChain.assetIds.length > 0
          ? { supermodelChainAssetIds: supermodelChain.assetIds }
          : {}),
        ...(supermodelChain.glbUrls.length > 0
          ? { supermodelChainGlbUrls: supermodelChain.glbUrls }
          : {}),
        ...(supermodelChain.modelUrls.length > 0
          ? { supermodelChainModelUrls: supermodelChain.modelUrls }
          : {})
      };
    });
    const deliverablePartCandidates = decoratedPartCandidates.filter(
      (partCandidate) => partCandidate.glbUrl || partCandidate.modelUrl
    );
    if (deliverablePartCandidates.length === partCandidates.length) {
      return {
        ...candidate,
        itemModelPartCandidates: decoratedPartCandidates
      };
    }
    if (deliverablePartCandidates.length === 0) {
      const strippedCandidate = { ...candidate };
      delete strippedCandidate.itemModelParts;
      delete strippedCandidate.itemModelPartRoles;
      delete strippedCandidate.itemModelPartResRefs;
      delete strippedCandidate.itemModelPartCandidates;
      delete strippedCandidate.itemModelPartSourceKey;
      strippedCandidate.sourceModelStatus = "metadata-only";
      return strippedCandidate;
    }

    const deliveredPartIds = deliverablePartCandidates
      .map((partCandidate) => partCandidate.partId)
      .filter((partId): partId is number => typeof partId === "number");
    const deliveredPartRoles = deliverablePartCandidates
      .map((partCandidate) => partCandidate.role)
      .filter((role): role is string => typeof role === "string" && role.length > 0);
    return {
      ...candidate,
      ...(deliveredPartIds.length > 0 ? { itemModelParts: deliveredPartIds } : {}),
      ...(deliveredPartRoles.length > 0 ? { itemModelPartRoles: deliveredPartRoles } : {}),
      itemModelPartResRefs: deliverablePartCandidates.map((partCandidate) => partCandidate.resref),
      itemModelPartCandidates: deliverablePartCandidates,
      sourceModelStatus: "model-resrefs-ready"
    };
  });
}

function normalizeCreatureRenderModelRef(value: string | undefined): string {
  return value ? (extractBasename(value)?.toLowerCase() ?? "") : "";
}

function buildCreatureAnimatedSupermodelRefsByModelResRef(
  sourceMdlInspection: CreatureRenderPackage["sourceMdlInspection"] | undefined
): Map<string, string> {
  const result = new Map<string, string>();
  const models = sourceMdlInspection?.models ?? [];
  if (models.length === 0) {
    return result;
  }

  const modelsByName = new Map(
    models
      .map((model) => [normalizeCreatureRenderModelRef(model.modelName), model] as const)
      .filter(([modelName]) => modelName.length > 0)
  );
  models.forEach((model) => {
    const modelName = normalizeCreatureRenderModelRef(model.modelName);
    if (!modelName || result.has(modelName)) {
      return;
    }
    const animatedSupermodelRef = resolveFirstAnimatedCreatureSupermodelRef(
      model.supermodel,
      modelsByName
    );
    if (animatedSupermodelRef) {
      result.set(modelName, animatedSupermodelRef);
      return;
    }
    const declaredSupermodelRef = normalizeCreatureRenderModelRef(model.supermodel);
    if (declaredSupermodelRef) {
      result.set(modelName, declaredSupermodelRef);
    }
  });
  return result;
}

function resolveFirstAnimatedCreatureSupermodelRef(
  firstSupermodel: string | undefined,
  modelsByName: Map<
    string,
    NonNullable<CreatureRenderPackage["sourceMdlInspection"]>["models"][number]
  >
): string | undefined {
  let current = normalizeCreatureRenderModelRef(firstSupermodel);
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    visited.add(current);
    const model = modelsByName.get(current);
    if (!model) {
      return undefined;
    }
    if (model.animationCount > 0) {
      return model.modelName;
    }
    current = normalizeCreatureRenderModelRef(model.supermodel);
  }
  return undefined;
}

function decorateCreatureSourceModelCandidatesWithDeliveryPaths(
  cacheKey: string,
  assetManifest: PlaceableAssetManifest,
  candidates: CreatureRenderPackage["sourceModelCandidates"],
  blobSettings?: BlobStorageSettings | null,
  supermodelRefsByModelResRef: Map<string, string> = new Map(),
  animatedSupermodelRefsByModelResRef: Map<string, string> = new Map()
): CreatureRenderPackage["sourceModelCandidates"] {
  if (candidates.length === 0 || assetManifest.assets.length === 0) {
    return candidates;
  }

  const assetsByBasename = collectCreatureModelDeliveryAssetsByBasename(assetManifest);

  return candidates.map((candidate) => {
    const modelResRef = normalizeCreatureRenderModelRef(candidate.resref);
    const asset = modelResRef ? assetsByBasename.get(modelResRef)?.[0] : undefined;
    if (!asset) {
      return candidate;
    }
    const extension = asset.extension.toLowerCase();
    const deliveryUrl = buildPlaceableAssetBrowserDeliveryUrl(
      cacheKey,
      asset,
      blobSettings,
      false
    );
    const supermodelResRef = modelResRef
      ? animatedSupermodelRefsByModelResRef.get(modelResRef) ??
        supermodelRefsByModelResRef.get(modelResRef)
      : undefined;
    const supermodelModelRef = normalizeCreatureRenderModelRef(supermodelResRef);
    const supermodelAsset = supermodelModelRef
      ? assetsByBasename.get(supermodelModelRef)?.[0]
      : undefined;
    const supermodelExtension = supermodelAsset?.extension.toLowerCase();
    const supermodelDeliveryUrl = supermodelAsset
      ? buildPlaceableAssetBrowserDeliveryUrl(cacheKey, supermodelAsset, blobSettings, false)
      : undefined;
    const supermodelChain = collectCreatureSupermodelDeliveryChain(
      cacheKey,
      supermodelResRef,
      assetsByBasename,
      blobSettings,
      supermodelRefsByModelResRef
    );
    return {
      ...candidate,
      assetId: asset.assetId,
      ...(extension === "glb" ? { glbUrl: deliveryUrl } : {}),
      ...(extension === "gltf" ? { modelUrl: deliveryUrl } : {}),
      ...(supermodelResRef ? { supermodelResRef } : {}),
      ...(supermodelAsset ? { supermodelAssetId: supermodelAsset.assetId } : {}),
      ...(supermodelExtension === "glb" && supermodelDeliveryUrl
        ? { supermodelGlbUrl: supermodelDeliveryUrl }
        : {}),
      ...(supermodelExtension === "gltf" && supermodelDeliveryUrl
        ? { supermodelModelUrl: supermodelDeliveryUrl }
        : {}),
      ...(supermodelChain.resRefs.length > 0
        ? { supermodelChainResRefs: supermodelChain.resRefs }
        : {}),
      ...(supermodelChain.assetIds.length > 0
        ? { supermodelChainAssetIds: supermodelChain.assetIds }
        : {}),
      ...(supermodelChain.glbUrls.length > 0
        ? { supermodelChainGlbUrls: supermodelChain.glbUrls }
        : {}),
      ...(supermodelChain.modelUrls.length > 0
        ? { supermodelChainModelUrls: supermodelChain.modelUrls }
        : {})
    };
  });
}

function collectCreatureSupermodelDeliveryChain(
  cacheKey: string,
  firstSupermodelResRef: string | undefined,
  assetsByBasename: Map<string, PlaceableAssetEntry[]>,
  blobSettings: BlobStorageSettings | null | undefined,
  supermodelRefsByModelResRef: Map<string, string>
): {
  resRefs: string[];
  assetIds: string[];
  glbUrls: string[];
  modelUrls: string[];
} {
  const resRefs: string[] = [];
  const assetIds: string[] = [];
  const glbUrls: string[] = [];
  const modelUrls: string[] = [];
  const visited = new Set<string>();
  let current = normalizeCreatureRenderModelRef(firstSupermodelResRef);

  for (let depth = 0; current && depth < 8 && !visited.has(current); depth += 1) {
    visited.add(current);
    const asset = assetsByBasename.get(current)?.[0];
    if (!asset) {
      break;
    }
    const extension = asset.extension.toLowerCase();
    const deliveryUrl = buildPlaceableAssetBrowserDeliveryUrl(
      cacheKey,
      asset,
      blobSettings,
      false
    );
    resRefs.push(current);
    assetIds.push(asset.assetId);
    if (extension === "glb") {
      glbUrls.push(deliveryUrl);
    } else if (extension === "gltf") {
      modelUrls.push(deliveryUrl);
    }
    current = normalizeCreatureRenderModelRef(supermodelRefsByModelResRef.get(current));
  }

  return { resRefs, assetIds, glbUrls, modelUrls };
}

function decorateCreatureSkeletonModelCandidatesWithDeliveryPaths(
  cacheKey: string,
  assetManifest: PlaceableAssetManifest,
  candidates: CreatureRenderPackage["skeletonModelCandidates"],
  blobSettings?: BlobStorageSettings | null,
  supermodelRefsByModelResRef: Map<string, string> = new Map()
): CreatureRenderPackage["skeletonModelCandidates"] {
  if (candidates.length === 0 || assetManifest.assets.length === 0) {
    return candidates;
  }

  const assetsByBasename = collectCreatureModelDeliveryAssetsByBasename(assetManifest);

  return candidates.map((candidate) => {
    const modelResRef = normalizeCreatureRenderModelRef(candidate.resref);
    const asset = modelResRef ? assetsByBasename.get(modelResRef)?.[0] : undefined;
    if (!asset) {
      return candidate;
    }
    const extension = asset.extension.toLowerCase();
    const deliveryUrl = buildPlaceableAssetBrowserDeliveryUrl(
      cacheKey,
      asset,
      blobSettings,
      false
    );
    const supermodelResRef =
      supermodelRefsByModelResRef.get(modelResRef) ??
      resolveAvailableCreatureSkeletonAnimationSupermodelResRef(candidate, assetsByBasename);
    const supermodelModelRef = normalizeCreatureRenderModelRef(supermodelResRef);
    const supermodelAsset = supermodelModelRef
      ? assetsByBasename.get(supermodelModelRef)?.[0]
      : undefined;
    const supermodelExtension = supermodelAsset?.extension.toLowerCase();
    const supermodelDeliveryUrl = supermodelAsset
      ? buildPlaceableAssetBrowserDeliveryUrl(cacheKey, supermodelAsset, blobSettings, false)
      : undefined;
    const supermodelChain = collectCreatureSupermodelDeliveryChain(
      cacheKey,
      supermodelResRef,
      assetsByBasename,
      blobSettings,
      supermodelRefsByModelResRef
    );
    return {
      ...candidate,
      assetId: asset.assetId,
      ...(extension === "glb" ? { glbUrl: deliveryUrl } : {}),
      ...(extension === "gltf" ? { modelUrl: deliveryUrl } : {}),
      ...(supermodelResRef ? { supermodelResRef } : {}),
      ...(supermodelAsset ? { supermodelAssetId: supermodelAsset.assetId } : {}),
      ...(supermodelExtension === "glb" && supermodelDeliveryUrl
        ? { supermodelGlbUrl: supermodelDeliveryUrl }
        : {}),
      ...(supermodelExtension === "gltf" && supermodelDeliveryUrl
        ? { supermodelModelUrl: supermodelDeliveryUrl }
        : {}),
      ...(supermodelChain.resRefs.length > 0
        ? { supermodelChainResRefs: supermodelChain.resRefs }
        : {}),
      ...(supermodelChain.assetIds.length > 0
        ? { supermodelChainAssetIds: supermodelChain.assetIds }
        : {}),
      ...(supermodelChain.glbUrls.length > 0
        ? { supermodelChainGlbUrls: supermodelChain.glbUrls }
        : {}),
      ...(supermodelChain.modelUrls.length > 0
        ? { supermodelChainModelUrls: supermodelChain.modelUrls }
        : {})
    };
  });
}

function resolveAvailableCreatureSkeletonAnimationSupermodelResRef(
  candidate: CreatureRenderPackage["skeletonModelCandidates"][number],
  assetsByBasename: Map<string, PlaceableAssetEntry[]>
): string | undefined {
  return resolveCreatureSkeletonAnimationSupermodelCandidateResRefs(candidate).find((resref) =>
    assetsByBasename.has(normalizeCreatureRenderModelRef(resref))
  );
}

function resolveCreatureSkeletonAnimationSupermodelCandidateResRefs(
  candidate: CreatureRenderPackage["skeletonModelCandidates"][number]
): string[] {
  const explicit = candidate.supermodelResRef ? [candidate.supermodelResRef] : [];
  const modelPrefix = candidate.modelPrefix?.trim().toLowerCase() ?? "";
  const skeletonRef = candidate.resref.trim().toLowerCase();
  const tokenSource = modelPrefix || skeletonRef;
  const match = /^p([mf])([a-z])(\d+)/u.exec(tokenSource);
  if (!match) {
    return explicit;
  }

  const [, genderToken, , phenotypeToken] = match;
  const fallbackRefs =
    genderToken === "f"
      ? ["a_fa", "a_ba"]
      : [
          "a_ma",
          ...(phenotypeToken === "0" ? ["a_oldm"] : []),
          "a_ba"
        ];
  return deduplicateOrdered([...explicit, ...fallbackRefs]);
}

function collectCreatureModelDeliveryAssetsByBasename(
  assetManifest: PlaceableAssetManifest
): Map<string, PlaceableAssetEntry[]> {
  const assetsByBasename = new Map<string, PlaceableAssetEntry[]>();
  for (const asset of assetManifest.assets) {
    if (asset.role !== "model" && asset.role !== "unknown") {
      continue;
    }
    const basename = normalizeCreatureRenderModelRef(asset.fileName);
    if (!basename) {
      continue;
    }
    const bucket = assetsByBasename.get(basename) ?? [];
    bucket.push(asset);
    assetsByBasename.set(basename, bucket);
  }

  assetsByBasename.forEach((bucket) => bucket.sort(compareCreaturePartModelDeliveryAsset));

  return assetsByBasename;
}

function compareCreaturePartModelDeliveryAsset(
  left: PlaceableAssetEntry,
  right: PlaceableAssetEntry
): number {
  const leftExtension = left.extension.toLowerCase();
  const rightExtension = right.extension.toLowerCase();
  const extensionDelta =
    (leftExtension === "glb" ? 0 : leftExtension === "gltf" ? 1 : 2) -
    (rightExtension === "glb" ? 0 : rightExtension === "gltf" ? 1 : 2);
  if (extensionDelta !== 0) {
    return extensionDelta;
  }
  const converterVersionDelta =
    getDerivedModelConverterPathPriority(left) - getDerivedModelConverterPathPriority(right);
  if (converterVersionDelta !== 0) {
    return converterVersionDelta;
  }
  if (left.fileName !== right.fileName) {
    return left.fileName.localeCompare(right.fileName);
  }
  return left.objectKey.localeCompare(right.objectKey);
}

function getDerivedModelConverterPathPriority(asset: PlaceableAssetEntry): number {
  if (!isDerivedModelAssetEntry(asset)) {
    return 2;
  }
  const normalizedObjectKey = asset.objectKey.replace(/\\/gu, "/").toLowerCase();
  const currentVersionSegment = AURORA_MDL_TO_GLB_CONVERTER_VERSION.replace(
    /[^a-zA-Z0-9._-]+/gu,
    "_"
  ).toLowerCase();
  if (normalizedObjectKey.includes(`/__aurora/derived/models/${currentVersionSegment}/`)) {
    return 0;
  }
  if (normalizedObjectKey.includes("/__aurora/derived/models/")) {
    return 1;
  }
  return 2;
}

function hasCreatureAssetManifestCandidate(
  renderPackage: CreatureRenderPackage | undefined
): boolean {
  return (
    resolveCreatureDirectModelCandidateResRefs(renderPackage).length > 0 ||
    resolveCreatureSkeletonModelCandidateResRefs(renderPackage).length > 0 ||
    resolveCreaturePartModelCandidateResRefs(renderPackage).length > 0 ||
    resolveCreatureEquipmentModelCandidateResRefs(renderPackage).length > 0
  );
}

function hasItemAssetManifestCandidate(itemRuntime: ItemRuntimeProjection | undefined): boolean {
  return (
    (itemRuntime?.visual.modelPartResRefs.length ?? 0) > 0 ||
    (itemRuntime?.visual.armorPartModelCandidates.length ?? 0) > 0 ||
    Boolean(itemRuntime?.classification.defaultIcon?.trim())
  );
}

function buildCreatureAppearanceOverrideCacheFingerprint(
  override: TemplateProcessQuery["creatureAppearanceOverride"] | undefined
): string | undefined {
  if (!override) {
    return undefined;
  }

  const entries: Array<[string, number | string]> = [];
  addCreatureAppearanceOverrideFingerprintEntry(
    entries,
    "appearanceType",
    override.appearanceType
  );
  addCreatureAppearanceOverrideFingerprintEntry(
    entries,
    "appearanceHead",
    override.appearanceHead
  );
  addCreatureAppearanceOverrideFingerprintEntry(entries, "wingsNew", override.wingsNew);
  addCreatureAppearanceOverrideFingerprintEntry(entries, "tailNew", override.tailNew);
  CREATURE_APPEARANCE_OVERRIDE_BODY_KEYS.forEach((key) => {
    addCreatureAppearanceOverrideFingerprintEntry(
      entries,
      `bodyParts.${key}`,
      override.bodyParts?.[key]
    );
  });
  CREATURE_APPEARANCE_OVERRIDE_COLOR_KEYS.forEach((key) => {
    addCreatureAppearanceOverrideFingerprintEntry(
      entries,
      `colors.${key}`,
      override.colors?.[key]
    );
  });
  if (entries.length === 0) {
    return undefined;
  }
  return `creature-appearance-override:${JSON.stringify(entries)}`;
}

function buildItemVisualOverrideCacheFingerprint(
  override: TemplateProcessQuery["itemVisualOverride"] | undefined
): string | undefined {
  if (!override) {
    return undefined;
  }

  const entries: Array<[string, number | string]> = [];
  ITEM_VISUAL_OVERRIDE_MODEL_PART_KEYS.forEach((key) => {
    addCreatureAppearanceOverrideFingerprintEntry(entries, key, override[key]);
  });
  addItemVisualOverrideStringFingerprintEntry(
    entries,
    "armorContext.modelPrefix",
    normalizeItemArmorPreviewModelPrefix(override.armorContext?.modelPrefix)
  );
  addItemVisualOverrideStringFingerprintEntry(
    entries,
    "armorContext.label",
    normalizeItemArmorPreviewContextText(override.armorContext?.label, 64)
  );
  addCreatureAppearanceOverrideFingerprintEntry(
    entries,
    "armorContext.gender",
    override.armorContext?.gender,
    1
  );
  addCreatureAppearanceOverrideFingerprintEntry(
    entries,
    "armorContext.phenotype",
    override.armorContext?.phenotype,
    9
  );
  addItemVisualOverrideStringFingerprintEntry(
    entries,
    "armorContext.raceModel",
    normalizeItemArmorPreviewContextText(override.armorContext?.raceModel, 32)
  );
  ITEM_VISUAL_OVERRIDE_ARMOR_PART_METADATA_KEYS.forEach(([key]) => {
    addCreatureAppearanceOverrideFingerprintEntry(
      entries,
      `armorParts.${key}`,
      override.armorParts?.[key]
    );
  });
  ITEM_VISUAL_OVERRIDE_MATERIAL_COLOR_METADATA_KEYS.forEach(([key]) => {
    addCreatureAppearanceOverrideFingerprintEntry(
      entries,
      `materialColors.${key}`,
      override.materialColors?.[key],
      255
    );
  });
  if (entries.length === 0) {
    return undefined;
  }
  return `item-visual-override:${JSON.stringify(entries)}`;
}

function buildCreatureMetadataProcessFingerprint(
  metadata: TemplateProcessQuery["creatureMetadata"] | undefined
): string | undefined {
  const normalized = normalizeAreaInstanceCreatureMetadata(metadata);
  if (!normalized) {
    return undefined;
  }
  const entries = Object.entries(normalized).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  return `creature-metadata:${JSON.stringify(entries)}`;
}

function applyCreatureMetadataProcessOverrideToMetadata(
  metadata: TemplateRecord["metadata"],
  override: TemplateProcessQuery["creatureMetadata"] | undefined
): TemplateRecord["metadata"] {
  const normalized = normalizeAreaInstanceCreatureMetadata(override);
  if (!normalized) {
    return metadata;
  }
  return {
    ...metadata,
    ...normalized
  };
}

function addCreatureAppearanceOverrideFingerprintEntry(
  entries: Array<[string, number | string]>,
  key: string,
  value: number | undefined,
  maximum = Number.POSITIVE_INFINITY
) {
  if (!Number.isInteger(value ?? Number.NaN) || value === undefined) {
    return;
  }
  entries.push([key, Math.max(0, Math.min(maximum, Math.trunc(value)))]);
}

function addItemVisualOverrideStringFingerprintEntry(
  entries: Array<[string, number | string]>,
  key: string,
  value: string | undefined
) {
  if (value === undefined) {
    return;
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    return;
  }
  entries.push([key, normalized]);
}

function applyItemVisualProcessOverrideToMetadata(
  metadata: TemplateRecord["metadata"],
  override: TemplateProcessQuery["itemVisualOverride"] | undefined
): TemplateRecord["metadata"] {
  if (!override) {
    return metadata;
  }

  let nextMetadata = metadata;
  const setPartMetadata = (
    key: string,
    value: number | undefined,
    maximum = Number.POSITIVE_INFINITY
  ) => {
    if (!Number.isInteger(value ?? Number.NaN) || value === undefined) {
      return;
    }
    const normalizedValue = Math.max(0, Math.min(maximum, Math.trunc(value)));
    if (nextMetadata[key] === normalizedValue) {
      return;
    }
    if (nextMetadata === metadata) {
      nextMetadata = { ...metadata };
    }
    nextMetadata[key] = normalizedValue;
  };
  const setStringMetadata = (key: string, value: string | undefined) => {
    if (value === undefined || value.trim().length === 0) {
      return;
    }
    const normalizedValue = value.trim();
    if (nextMetadata[key] === normalizedValue) {
      return;
    }
    if (nextMetadata === metadata) {
      nextMetadata = { ...metadata };
    }
    nextMetadata[key] = normalizedValue;
  };

  ITEM_VISUAL_OVERRIDE_MODEL_PART_KEYS.forEach((key) => {
    setPartMetadata(key, override[key]);
  });
  setStringMetadata(
    "itemArmorPreviewModelPrefix",
    normalizeItemArmorPreviewModelPrefix(override.armorContext?.modelPrefix)
  );
  setStringMetadata(
    "itemArmorPreviewContextLabel",
    normalizeItemArmorPreviewContextText(override.armorContext?.label, 64)
  );
  setPartMetadata("itemArmorPreviewGender", override.armorContext?.gender, 1);
  setPartMetadata("itemArmorPreviewPhenotype", override.armorContext?.phenotype, 9);
  setStringMetadata(
    "itemArmorPreviewRaceModel",
    normalizeItemArmorPreviewContextText(override.armorContext?.raceModel, 32)
  );
  ITEM_VISUAL_OVERRIDE_ARMOR_PART_METADATA_KEYS.forEach(([key, metadataKey]) => {
    setPartMetadata(metadataKey, override.armorParts?.[key]);
  });
  ITEM_VISUAL_OVERRIDE_MATERIAL_COLOR_METADATA_KEYS.forEach(([key, metadataKey]) => {
    setPartMetadata(metadataKey, override.materialColors?.[key], 255);
  });

  return nextMetadata;
}

function hasCachedAssetManifest(
  value: PlaceableProcessingResult | TemplateProcessingResult
): value is (PlaceableProcessingResult | TemplateProcessingResult) & {
  assetManifest: PlaceableAssetManifest;
} {
  return value.assetManifest?.version === "placeable-asset-manifest/v1";
}

function isTemplateProcessingResult(
  value: PlaceableProcessingResult | TemplateProcessingResult
): value is TemplateProcessingResult {
  return (
    "kind" in value &&
    (value.kind === "creature" || value.kind === "item" || value.kind === "encounter")
  );
}

function parseDerivedModelJsonPayload(
  asset: PlaceableAssetEntry,
  bytes: Buffer
): unknown | null {
  const extension = asset.extension.trim().toLowerCase();
  if (extension === "glb") {
    return parseGlbJson(bytes);
  }
  if (extension === "gltf") {
    return parseGltfJson(bytes);
  }
  return null;
}

function collectAuroraSupermodelReferences(modelJson: unknown): string[] {
  return collectAuroraModelMetadataStringReferences(modelJson, "supermodel");
}

function collectAuroraSourceModelReferences(modelJson: unknown): string[] {
  return collectAuroraModelMetadataStringReferences(modelJson, "sourceModel");
}

function collectAuroraModelMetadataStringReferences(
  modelJson: unknown,
  metadataKey: string
): string[] {
  const references = new Set<string>();
  collectAuroraModelMetadataRecords(modelJson).forEach((aurora) => {
    const reference = normalizeAuroraModelResourceReference(aurora[metadataKey]);
    if (reference) {
      references.add(reference);
    }
  });
  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectAuroraModelMetadataRecords(modelJson: unknown): Array<Record<string, unknown>> {
  const root = asRecord(modelJson);
  if (!root) {
    return [];
  }
  const records: Array<Record<string, unknown>> = [];
  addAuroraModelMetadataRecord(records, root);
  ["scenes", "nodes", "meshes", "materials"].forEach((key) => {
    const entries = root[key];
    if (!Array.isArray(entries)) {
      return;
    }
    entries.forEach((entry) => {
      const record = asRecord(entry);
      if (record) {
        addAuroraModelMetadataRecord(records, record);
      }
    });
  });
  return records;
}

function addAuroraModelMetadataRecord(
  target: Array<Record<string, unknown>>,
  record: Record<string, unknown>
): void {
  const extras = asRecord(record.extras);
  const aurora = asRecord(extras?.aurora);
  if (aurora) {
    target.push(aurora);
  }
}

function parseGlbJson(bytes: Buffer): unknown | null {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== GLB_MAGIC) {
    return null;
  }

  const jsonLength = bytes.readUInt32LE(12);
  const jsonType = bytes.readUInt32LE(16);
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLength;
  if (jsonType !== GLB_JSON_CHUNK_TYPE || jsonLength <= 0 || jsonEnd > bytes.length) {
    return null;
  }

  try {
    const jsonText = bytes
      .subarray(jsonStart, jsonEnd)
      .toString("utf-8")
      .replace(/\0+$/u, "")
      .trimEnd();
    return JSON.parse(jsonText) as unknown;
  } catch {
    return null;
  }
}

function parseGltfJson(bytes: Buffer): unknown | null {
  try {
    return JSON.parse(bytes.toString("utf-8")) as unknown;
  } catch {
    return null;
  }
}

function resolveDerivedModelConverterVersion(modelJson: unknown): string | null {
  const root = asRecord(modelJson);
  const extras = root ? asRecord(root["extras"]) : null;
  const aurora = extras ? asRecord(extras["aurora"]) : null;
  const converterVersion = aurora ? aurora["converterVersion"] : undefined;
  if (typeof converterVersion === "string" && converterVersion.trim().length > 0) {
    return converterVersion.trim();
  }

  const asset = root ? asRecord(root["asset"]) : null;
  const generator = asset ? asset["generator"] : undefined;
  if (
    typeof generator === "string" &&
    generator.includes(AURORA_MDL_TO_GLB_CONVERTER_VERSION)
  ) {
    return AURORA_MDL_TO_GLB_CONVERTER_VERSION;
  }
  return null;
}

function collectAuroraTextureReferences(modelJson: unknown): string[] {
  const references = new Set<string>();
  collectAuroraTextureReferencesFromObject(modelJson, references);

  const root = asRecord(modelJson);
  collectGltfImageTextureReferences(root, references);
  const materials = root ? root["materials"] : undefined;
  if (Array.isArray(materials)) {
    materials.forEach((material) =>
      collectAuroraTextureReferencesFromObject(material, references)
    );
  }
  const meshes = root ? root["meshes"] : undefined;
  if (Array.isArray(meshes)) {
    meshes.forEach((mesh) => {
      const meshRecord = asRecord(mesh);
      const primitives = meshRecord ? meshRecord["primitives"] : undefined;
      if (!Array.isArray(primitives)) {
        return;
      }
      primitives.forEach((primitive) =>
        collectAuroraTextureReferencesFromObject(primitive, references)
      );
    });
  }

  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectGltfImageTextureReferences(
  root: Record<string, unknown> | null,
  target: Set<string>
): void {
  const images = root ? root["images"] : undefined;
  if (!Array.isArray(images)) {
    return;
  }

  for (const image of images) {
    const imageRecord = asRecord(image);
    const uriReference = normalizeGltfImageTextureReference(imageRecord?.["uri"]);
    if (uriReference) {
      target.add(uriReference);
    }
    const nameReference = normalizeGltfImageTextureReference(imageRecord?.["name"]);
    if (nameReference) {
      target.add(nameReference);
    }
  }
}

function normalizeGltfImageTextureReference(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || /^(data|blob):/iu.test(trimmed)) {
    return null;
  }
  return normalizeModelTextureReference(trimmed);
}

function collectAuroraTextureReferencesFromObject(
  value: unknown,
  target: Set<string>
): void {
  const record = asRecord(value);
  const extras = asRecord(record?.["extras"]);
  const aurora = asRecord(extras?.["aurora"]);
  const singleReference = normalizeModelTextureReference(aurora?.["textureReference"]);
  if (singleReference) {
    target.add(singleReference);
  }
  const rawReferences = aurora?.["textureReferences"];
  if (!Array.isArray(rawReferences)) {
    return;
  }

  for (const rawReference of rawReferences) {
    const reference = normalizeModelTextureReference(rawReference);
    if (reference) {
      target.add(reference);
    }
  }
}

function collectAuroraMaterialTextureReferences(bytes: Buffer): string[] {
  const references = new Set<string>();
  const source = bytes.toString("utf-8");
  const lines = source.split(/\r?\n/u);
  lines.forEach((line) => {
    const withoutComments = line
      .replace(/\/\/.*$/u, "")
      .replace(/;.*$/u, "")
      .trim();
    if (!withoutComments) {
      return;
    }
    const tokens = withoutComments.split(/\s+/u);
    if (tokens.length < 2) {
      return;
    }
    const key = tokens[0].toLowerCase();
    if (!isAuroraMaterialTextureKey(key)) {
      return;
    }
    const reference = normalizeModelTextureReference(tokens[1]);
    if (reference) {
      references.add(reference);
    }
  });
  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectAuroraTextureTxiState(
  bytes: Buffer
): NonNullable<PlaceableRenderPackage["textureBindings"]>[number]["txi"] | null {
  const state: NonNullable<PlaceableRenderPackage["textureBindings"]>[number]["txi"] = {};
  const source = bytes.toString("utf-8");
  const lines = source.split(/\r?\n/u);
  for (const line of lines) {
    const withoutComments = line
      .replace(/\/\/.*$/u, "")
      .replace(/;.*$/u, "")
      .trim();
    if (!withoutComments) {
      continue;
    }

    const tokens = withoutComments.split(/\s+/u);
    if (tokens.length < 2) {
      continue;
    }
    const key = tokens[0]?.toLowerCase();
    const rawValue = tokens.slice(1).join(" ");

    if (key === "decal") {
      const decal = readAuroraBooleanValue(rawValue);
      if (decal !== undefined) {
        state.decal = decal;
      }
      continue;
    }
    if (key === "clamp") {
      const clamp = readAuroraTextureClampValue(rawValue);
      if (clamp !== undefined) {
        state.clamp = clamp;
      }
      continue;
    }
    if (key === "blending") {
      const blending = readAuroraMaterialBlendingValue(rawValue);
      if (blending) {
        state.blending = blending;
      }
      continue;
    }
    if (key === "mipmap") {
      const mipmap = readAuroraBooleanValue(rawValue);
      if (mipmap !== undefined) {
        state.mipmap = mipmap;
      }
      continue;
    }
    if (key === "filter") {
      const filter = readAuroraBooleanValue(rawValue);
      if (filter !== undefined) {
        state.filter = filter;
      }
      continue;
    }
    if (key === "bumpmaptexture" || key === "bumpmap") {
      const bumpmaptexture = normalizeModelTextureReference(rawValue);
      if (bumpmaptexture) {
        state.bumpmaptexture = bumpmaptexture;
      }
      continue;
    }
    if (key === "envmaptexture" || key === "envmap") {
      const envmaptexture = normalizeModelTextureReference(rawValue);
      if (envmaptexture) {
        state.envmaptexture = envmaptexture;
      }
      continue;
    }
    if (key === "proceduretype") {
      const proceduretype = rawValue.trim().split(/\s+/u)[0]?.toLowerCase();
      if (proceduretype) {
        state.proceduretype = proceduretype;
      }
      continue;
    }
    if (key === "numx") {
      const numx = readAuroraIntegerValue(rawValue);
      if (numx !== undefined && numx > 0) {
        state.numx = numx;
      }
      continue;
    }
    if (key === "numy") {
      const numy = readAuroraIntegerValue(rawValue);
      if (numy !== undefined && numy > 0) {
        state.numy = numy;
      }
      continue;
    }
    if (key === "fps") {
      const fps = readAuroraNumberValue(rawValue);
      if (fps !== undefined && fps >= 0) {
        state.fps = fps;
      }
      continue;
    }
  }

  return hasAuroraTextureTxiState(state) ? state : null;
}

function readAuroraTextureClampValue(value: string): 0 | 1 | 2 | 3 | undefined {
  const normalized = Number.parseInt(value.trim().split(/\s+/u)[0] ?? "", 10);
  if (normalized === 0 || normalized === 1 || normalized === 2 || normalized === 3) {
    return normalized;
  }
  return undefined;
}

function hasAuroraTextureTxiState(
  state: NonNullable<PlaceableRenderPackage["textureBindings"]>[number]["txi"]
): boolean {
  return (
    state?.decal !== undefined ||
    state?.clamp !== undefined ||
    state?.blending !== undefined ||
    state?.mipmap !== undefined ||
    state?.filter !== undefined ||
    state?.bumpmaptexture !== undefined ||
    state?.envmaptexture !== undefined ||
    state?.proceduretype !== undefined ||
    state?.numx !== undefined ||
    state?.numy !== undefined ||
    state?.fps !== undefined
  );
}

function collectAuroraMaterialState(
  bytes: Buffer
): NonNullable<PlaceableRenderPackage["auroraMaterial"]>["materials"][number]["state"] | null {
  const state: NonNullable<
    PlaceableRenderPackage["auroraMaterial"]
  >["materials"][number]["state"] = {};
  const source = bytes.toString("utf-8");
  const lines = source.split(/\r?\n/u);
  for (const line of lines) {
    const withoutComments = line
      .replace(/\/\/.*$/u, "")
      .replace(/;.*$/u, "")
      .trim();
    if (!withoutComments) {
      continue;
    }
    const tokens = withoutComments.split(/\s+/u);
    if (tokens.length < 2) {
      continue;
    }
    const key = tokens[0]?.toLowerCase();
    const rawValue = tokens.slice(1).join(" ");
    const textureSlot = readAuroraTextureSlotKey(key);
    if (textureSlot !== null) {
      const reference = normalizeModelTextureReference(rawValue);
      if (reference) {
        upsertAuroraMaterialTextureSlot(state, textureSlot, reference);
      }
      continue;
    }
    if (key === "bitmap") {
      const reference = normalizeModelTextureReference(rawValue);
      if (reference && !state.textureSlots?.some((slot) => slot.slot === 0)) {
        upsertAuroraMaterialTextureSlot(state, 0, reference);
      }
      continue;
    }
    if (key === "blending") {
      const blending = readAuroraMaterialBlendingValue(rawValue);
      if (!blending) {
        continue;
      }
      state.blending = blending;
      if (blending === "additive") {
        state.auroraBlendField48 = 0;
        state.auroraBlendField4c = 2;
      } else {
        state.auroraBlendField48 = 2;
        state.auroraBlendField4c = 3;
      }
      continue;
    }
    if (key === "decal") {
      const decal = readAuroraBooleanValue(rawValue);
      if (decal !== undefined) {
        state.decal = decal;
      }
      continue;
    }
    if (key === "transparency") {
      const transparency = readAuroraBooleanValue(rawValue);
      if (transparency !== undefined) {
        state.transparency = transparency;
      }
      continue;
    }
    if (key === "twosided") {
      const twoSided = readAuroraBooleanValue(rawValue);
      if (twoSided !== undefined) {
        state.twoSided = twoSided;
      }
      continue;
    }
    if (key === "renderhint" || key === "render_hint") {
      const renderHint = normalizeAuroraEmitterValue(rawValue);
      if (renderHint) {
        state.renderHint = renderHint;
      }
      continue;
    }
    if (key === "customshadervs" || key === "custom_shader_vs") {
      const shader = normalizeAuroraEmitterValue(rawValue);
      if (shader) {
        state.customShaderVS = shader;
      }
      continue;
    }
    if (key === "customshaderfs" || key === "custom_shader_fs") {
      const shader = normalizeAuroraEmitterValue(rawValue);
      if (shader) {
        state.customShaderFS = shader;
      }
      continue;
    }
    if (key === "customshadergs" || key === "custom_shader_gs") {
      const shader = normalizeAuroraEmitterValue(rawValue);
      if (shader) {
        state.customShaderGS = shader;
      }
      continue;
    }
    if (key === "parameter") {
      applyAuroraMaterialParameter(state, tokens.slice(1));
      continue;
    }
  }

  return hasAuroraMaterialState(state) ? state : null;
}

function applyAuroraMaterialParameter(
  state: NonNullable<PlaceableRenderPackage["auroraMaterial"]>["materials"][number]["state"],
  tokens: string[]
): void {
  if (tokens.length < 3) {
    return;
  }
  const parameterName = tokens[1]?.trim().toLowerCase();
  const parsedValue = Number.parseFloat(tokens[2] ?? "");
  if (!parameterName || !Number.isFinite(parsedValue)) {
    return;
  }
  if (parameterName === "roughness") {
    state.roughness = parsedValue;
  } else if (parameterName === "specularity") {
    state.specularity = parsedValue;
  }
}

function readAuroraMaterialBlendingValue(
  value: string
): NonNullable<
  NonNullable<PlaceableRenderPackage["auroraMaterial"]>["materials"][number]["state"]["blending"]
> | null {
  const normalized = value.trim().split(/\s+/u)[0]?.toLowerCase();
  if (normalized === "additive" || normalized === "punchthrough") {
    return normalized;
  }
  return null;
}

function hasAuroraMaterialState(
  state: NonNullable<PlaceableRenderPackage["auroraMaterial"]>["materials"][number]["state"]
): boolean {
  return (
    state.blending !== undefined ||
    state.auroraBlendField48 !== undefined ||
    state.auroraBlendField4c !== undefined ||
    state.decal !== undefined ||
    state.transparency !== undefined ||
    state.twoSided !== undefined ||
    state.renderHint !== undefined ||
    state.customShaderVS !== undefined ||
    state.customShaderFS !== undefined ||
    state.customShaderGS !== undefined ||
    state.roughness !== undefined ||
    state.specularity !== undefined ||
    Boolean(state.textureSlots && state.textureSlots.length > 0)
  );
}

function readAuroraTextureSlotKey(key: string | undefined): number | null {
  const match = key?.match(/^texture(\d+)$/u);
  if (!match?.[1]) {
    return null;
  }
  const slot = Number.parseInt(match[1], 10);
  return Number.isInteger(slot) && slot >= 0 ? slot : null;
}

function upsertAuroraMaterialTextureSlot(
  state: NonNullable<PlaceableRenderPackage["auroraMaterial"]>["materials"][number]["state"],
  slot: number,
  reference: string
): void {
  const textureSlot = {
    slot,
    role: AURORA_TEXTURE_SLOT_ROLES[slot] ?? "unknown",
    reference
  };
  const textureSlots = [...(state.textureSlots ?? [])];
  const existingIndex = textureSlots.findIndex((entry) => entry.slot === slot);
  if (existingIndex >= 0) {
    textureSlots[existingIndex] = textureSlot;
  } else {
    textureSlots.push(textureSlot);
  }
  state.textureSlots = textureSlots.sort((left, right) => left.slot - right.slot);
}

const AURORA_MODEL_TEXTURE_REFERENCE_KEYS = new Set([
  "bitmap",
  "texture",
  "texture0",
  "texture1",
  "texture2",
  "texture3",
  "basetexture",
  "diffusemap",
  "bumpmaptexture",
  "bumpyshinytexture",
  "envmaptexture",
  "bumpreplacementtexture",
  "normalmap",
  "specularmap",
  "roughnessmap"
]);
const AURORA_TEXTURE_SLOT_ROLES = [
  "diffuse",
  "normal",
  "specular",
  "roughness",
  "height",
  "emissive"
] as const;
const AURORA_EMBEDDED_TEXTURE_REFERENCE_PATTERN = /[a-z0-9_]{3,32}/giu;

interface ParsedAuroraMdlEmitterNumberKeyframe {
  time: number;
  value: number;
}

interface ParsedAuroraMdlEmitterColorKeyframe {
  time: number;
  value: [number, number, number];
}

interface ParsedAuroraMdlEmitterVector3Keyframe {
  time: number;
  value: [number, number, number];
}

interface ParsedAuroraMdlEmitterOrientationKeyframe {
  time: number;
  value: {
    axis: [number, number, number];
    angleRadians: number;
  };
}

interface ParsedAuroraMdlEmitterAnimationEvent {
  time: number;
  type: string;
  animationName?: string;
}

const AURORA_EMITTER_SIMULATION_TIMELINE_KEYS = [
  "xSize",
  "ySize",
  "birthrate",
  "lifeExp",
  "mass",
  "velocity",
  "randvel",
  "spread",
  "particleRot",
  "bounceCoefficient",
  "blastRadius",
  "blastLength",
  "blurLength",
  "detonate",
  "fps",
  "frameStart",
  "frameEnd",
  "lightningScale",
  "lightningDelay",
  "lightningRadius",
  "p2pBezier2",
  "p2pBezier3",
  "combineTime",
  "grav",
  "drag",
  "threshold",
  "sizeStart",
  "sizeMid",
  "sizeEnd",
  "sizeStartY",
  "sizeMidY",
  "sizeEndY",
  "percentStart",
  "percentMid",
  "percentEnd",
  "alphaStart",
  "alphaMid",
  "alphaEnd"
] as const;

type ParsedAuroraMdlEmitterSimulationTimelineKey =
  (typeof AURORA_EMITTER_SIMULATION_TIMELINE_KEYS)[number];

type ParsedAuroraMdlEmitterSimulationTimeline = Partial<
  Record<ParsedAuroraMdlEmitterSimulationTimelineKey, ParsedAuroraMdlEmitterNumberKeyframe[]>
>;

type ParsedAuroraMdlEmitterColorTimelineKey = "colorStart" | "colorMid" | "colorEnd";

type ParsedAuroraMdlEmitterColorTimeline = Partial<
  Record<ParsedAuroraMdlEmitterColorTimelineKey, ParsedAuroraMdlEmitterColorKeyframe[]>
>;

const AURORA_EMITTER_SIMULATION_NON_NEGATIVE_TIMELINE_KEYS = new Set<
  ParsedAuroraMdlEmitterSimulationTimelineKey
>([
  "xSize",
  "ySize",
  "birthrate",
  "lifeExp",
  "randvel",
  "spread",
  "blastRadius",
  "blastLength",
  "blurLength",
  "detonate",
  "fps",
  "frameStart",
  "frameEnd",
  "lightningScale",
  "lightningDelay",
  "lightningRadius",
  "p2pBezier2",
  "p2pBezier3",
  "combineTime",
  "threshold",
  "sizeStart",
  "sizeMid",
  "sizeEnd",
  "sizeStartY",
  "sizeMidY",
  "sizeEndY",
  "percentStart",
  "percentMid",
  "percentEnd",
  "alphaStart",
  "alphaMid",
  "alphaEnd"
]);

const AURORA_EMITTER_SIMULATION_TIMELINE_KEY_SET = new Set<
  ParsedAuroraMdlEmitterSimulationTimelineKey
>(AURORA_EMITTER_SIMULATION_TIMELINE_KEYS);

function isAuroraEmitterSimulationTimelineKey(
  key: string | undefined
): key is ParsedAuroraMdlEmitterSimulationTimelineKey {
  return Boolean(key) && AURORA_EMITTER_SIMULATION_TIMELINE_KEY_SET.has(
    key as ParsedAuroraMdlEmitterSimulationTimelineKey
  );
}

interface ParsedAuroraMdlEmitter {
  nodeName: string;
  texture?: string;
  chunkName?: string;
  emitterType?: string;
  renderMode?: string;
  blendMode?: string;
  atlas?: {
    xGridRaw?: number;
    yGridRaw?: number;
    effectiveXGrid: number;
    effectiveYGrid: number;
    fps?: number;
    frameStart?: number;
    frameEnd?: number;
    random?: boolean;
  };
  simulation?: {
    xSize?: number;
    ySize?: number;
    spawnType?: number;
    birthrate?: number;
    lifeExp?: number;
    mass?: number;
    velocity?: number;
    randvel?: number;
    spread?: number;
    particleRot?: number;
    bounce?: boolean;
    bounceCoefficient?: number;
    blastRadius?: number;
    blastLength?: number;
    blurLength?: number;
    detonate?: number;
    fps?: number;
    frameStart?: number;
    frameEnd?: number;
    lightningScale?: number;
    lightningDelay?: number;
    lightningRadius?: number;
    deadspace?: number;
    p2p?: boolean;
    p2pType?: string;
    p2pBezier2?: number;
    p2pBezier3?: number;
    p2pSource?: number;
    p2pTarget?: number;
    combineTime?: number;
    grav?: number;
    drag?: number;
    threshold?: number;
    inherit?: boolean;
    inheritVel?: boolean;
    inheritLocal?: boolean;
    inheritPart?: boolean;
    affectedByWind?: boolean;
    sizeStart?: number;
    sizeMid?: number;
    sizeEnd?: number;
    sizeStartY?: number;
    sizeMidY?: number;
    sizeEndY?: number;
    alphaStart?: number;
    alphaMid?: number;
    alphaEnd?: number;
    colorStart?: [number, number, number];
    colorMid?: [number, number, number];
    colorEnd?: [number, number, number];
    percentStart?: number;
    percentMid?: number;
    percentEnd?: number;
    timeline?: ParsedAuroraMdlEmitterSimulationTimeline;
    colorTimeline?: ParsedAuroraMdlEmitterColorTimeline;
  };
  transform?: {
    position?: [number, number, number];
    positionTimeline?: ParsedAuroraMdlEmitterVector3Keyframe[];
    orientation?: {
      axis: [number, number, number];
      angleRadians: number;
    };
    orientationTimeline?: ParsedAuroraMdlEmitterOrientationKeyframe[];
    scale?: number;
    scaleTimeline?: ParsedAuroraMdlEmitterNumberKeyframe[];
  };
  referenceNodes?: ParsedAuroraMdlReferenceNode[];
  events?: ParsedAuroraMdlEmitterAnimationEvent[];
  animations?: ParsedAuroraMdlEmitterAnimation[];
  sourceState?: {
    renderOrder?: number;
    renderHintRaw?: string;
    renderHintMode?: 0 | 1 | 2 | 3;
    customShaderVS?: string;
    customShaderFS?: string;
    customShaderGS?: string;
    transparency?: boolean;
    twoSidedMaterial?: boolean;
    twoSidedTexture?: boolean;
    sampleFramebuffer?: number;
    volumetric?: boolean;
    loop?: boolean;
    isTinted?: boolean;
    splat?: boolean;
    rotateTexture?: boolean;
  };
}

interface ParsedAuroraMdlEmitterAnimation {
  animationName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  simulation?: ParsedAuroraMdlEmitter["simulation"];
  transform?: ParsedAuroraMdlEmitter["transform"];
}

interface ParsedAuroraMdlReferenceNode {
  nodeName: string;
  parentNodeName?: string;
  transform?: {
    position?: [number, number, number];
    positionTimeline?: ParsedAuroraMdlEmitterVector3Keyframe[];
    orientation?: {
      axis: [number, number, number];
      angleRadians: number;
    };
    orientationTimeline?: ParsedAuroraMdlEmitterOrientationKeyframe[];
    scale?: number;
    scaleTimeline?: ParsedAuroraMdlEmitterNumberKeyframe[];
  };
}

interface ParsedAuroraMdlEmitters {
  source: PlaceableRenderPackageAuroraEmitterSource;
  emitters: ParsedAuroraMdlEmitter[];
}

interface ParsedAuroraMdlLightNumberKeyframe {
  time: number;
  value: number;
}

interface ParsedAuroraMdlLightColorKeyframe {
  time: number;
  value: [number, number, number];
}

interface ParsedAuroraMdlLightVector3Keyframe {
  time: number;
  value: [number, number, number];
}

interface ParsedAuroraMdlLightAnimation {
  animationName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  positionTimeline?: ParsedAuroraMdlLightVector3Keyframe[];
  colorTimeline?: ParsedAuroraMdlLightColorKeyframe[];
  radiusTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
  shadowRadiusTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
  verticalDisplacementTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
  multiplierTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
}

interface ParsedAuroraMdlLight {
  nodeName: string;
  sourceNodeKind?: string;
  parentNodeName?: string;
  transform?: ParsedAuroraMdlReferenceNode["transform"];
  radius?: number;
  shadowRadius?: number;
  verticalDisplacement?: number;
  multiplier?: number;
  color?: [number, number, number];
  ambientOnly?: boolean;
  dynamicType?: number;
  affectDynamic?: boolean;
  shadow?: boolean;
  lightPriority?: number;
  generateFlare?: boolean;
  textureNames?: string[];
  flareSizes?: number[];
  flarePositions?: number[];
  flareColorShifts?: [number, number, number][];
  flareRadius?: number;
  lensFlares?: boolean;
  fadingLight?: boolean;
  animations?: ParsedAuroraMdlLightAnimation[];
}

interface ParsedAuroraMdlLights {
  source: PlaceableRenderPackageAuroraLightSource;
  lights: ParsedAuroraMdlLight[];
}

const AURORA_BINARY_MODEL_BASE = 12;
const AURORA_BINARY_MODEL_ANIMATIONS_OFFSET = 120;
const AURORA_BINARY_NODE_HEADER_SIZE = 0x70;
const AURORA_BINARY_NODE_NAME_OFFSET = 32;
const AURORA_BINARY_NODE_CHILDREN_OFFSET = 72;
const AURORA_BINARY_NODE_CONTROLLER_KEYS_OFFSET = 84;
const AURORA_BINARY_NODE_CONTROLLER_DATA_OFFSET = 96;
const AURORA_BINARY_NODE_FLAGS_OFFSET = 108;
const AURORA_BINARY_NODE_FLAG_EMITTER = 0x0004;
const AURORA_BINARY_NODE_FLAG_MESH = 0x0020;
const AURORA_ASCII_LIGHT_NODE_KINDS = new Set([
  "light",
  "sourcelight",
  "placeablelight",
  "fx_light"
]);
const AURORA_BINARY_CONTROLLER_RECORD_SIZE = 12;
const AURORA_BINARY_CONTROLLER_POSITION = 8;
const AURORA_BINARY_CONTROLLER_ORIENTATION = 20;
const AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_END = 80;
const AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_START = 84;
const AURORA_BINARY_CONTROLLER_EMITTER_BIRTHRATE = 88;
const AURORA_BINARY_CONTROLLER_EMITTER_BOUNCE_COEFFICIENT = 92;
const AURORA_BINARY_CONTROLLER_EMITTER_COLOR_END = 96;
const AURORA_BINARY_CONTROLLER_EMITTER_COLOR_START = 108;
const AURORA_BINARY_CONTROLLER_EMITTER_COMBINE_TIME = 120;
const AURORA_BINARY_CONTROLLER_EMITTER_DRAG = 124;
const AURORA_BINARY_CONTROLLER_EMITTER_FPS = 128;
const AURORA_BINARY_CONTROLLER_EMITTER_FRAME_END = 132;
const AURORA_BINARY_CONTROLLER_EMITTER_FRAME_START = 136;
const AURORA_BINARY_CONTROLLER_EMITTER_GRAV = 140;
const AURORA_BINARY_CONTROLLER_EMITTER_LIFE_EXP = 144;
const AURORA_BINARY_CONTROLLER_EMITTER_MASS = 148;
const AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER2 = 152;
const AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER3 = 156;
const AURORA_BINARY_CONTROLLER_EMITTER_PARTICLE_ROT = 160;
const AURORA_BINARY_CONTROLLER_EMITTER_RAND_VEL = 164;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START = 168;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END = 172;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START_Y = 176;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END_Y = 180;
const AURORA_BINARY_CONTROLLER_EMITTER_SPREAD = 184;
const AURORA_BINARY_CONTROLLER_EMITTER_THRESHOLD = 188;
const AURORA_BINARY_CONTROLLER_EMITTER_VELOCITY = 192;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_X = 196;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_Y = 200;
const AURORA_BINARY_CONTROLLER_EMITTER_BLUR_LENGTH = 204;
const AURORA_BINARY_CONTROLLER_EMITTER_DETONATE = 228;
const AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_MID = 468;
const AURORA_BINARY_CONTROLLER_EMITTER_COLOR_MID = 472;
const AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_START = 484;
const AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_MID = 485;
const AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_END = 486;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID = 488;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID_Y = 492;
const AURORA_BINARY_MESH_TEXTURES_OFFSET = 232;
const AURORA_BINARY_EMITTER_DEAD_SPACE_OFFSET = 0x70;
const AURORA_BINARY_EMITTER_XGRID_OFFSET = 0x7c;
const AURORA_BINARY_EMITTER_YGRID_OFFSET = 0x80;
const AURORA_BINARY_EMITTER_SPAWN_TYPE_OFFSET = 0x84;
const AURORA_BINARY_EMITTER_TYPE_OFFSET = 0x88;
const AURORA_BINARY_EMITTER_RENDER_MODE_OFFSET = 0xa8;
const AURORA_BINARY_EMITTER_BLEND_MODE_OFFSET = 0xc8;
const AURORA_BINARY_EMITTER_TEXTURE_OFFSET = 232;
const AURORA_BINARY_EMITTER_CHUNK_NAME_OFFSET = 0x128;
const AURORA_BINARY_EMITTER_CHUNK_NAME_LENGTH = 0x10;
const AURORA_BINARY_EMITTER_TWO_SIDED_TEX_OFFSET = 0x138;
const AURORA_BINARY_EMITTER_LOOP_OFFSET = 0x13c;
const AURORA_BINARY_EMITTER_RENDER_ORDER_OFFSET = 0x140;
const AURORA_BINARY_EMITTER_FLAGS_OFFSET = 0x144;
const AURORA_BINARY_EMITTER_FLAG_P2P = 0x1;
const AURORA_BINARY_EMITTER_FLAG_P2P_BEZIER = 0x2;
const AURORA_BINARY_EMITTER_FLAG_AFFECTED_BY_WIND = 0x4;
const AURORA_BINARY_EMITTER_FLAG_IS_TINTED = 0x8;
const AURORA_BINARY_EMITTER_FLAG_BOUNCE = 0x10;
const AURORA_BINARY_EMITTER_FLAG_RANDOM_ATLAS_FRAME = 0x20;
const AURORA_BINARY_EMITTER_FLAG_INHERIT = 0x40;
const AURORA_BINARY_EMITTER_FLAG_INHERIT_VEL = 0x80;
const AURORA_BINARY_EMITTER_FLAG_INHERIT_LOCAL = 0x100;
const AURORA_BINARY_EMITTER_FLAG_SPLAT = 0x200;
const AURORA_BINARY_EMITTER_FLAG_INHERIT_PART = 0x400;
const AURORA_BINARY_ANIMATION_NAME_OFFSET = 8;
const AURORA_BINARY_ANIMATION_NAME_LENGTH = 64;
const AURORA_BINARY_ANIMATION_ROOT_NODE_OFFSET = 72;

function collectAuroraSourceModelTextureReferences(bytes: Buffer): string[] {
  if (isLikelyAuroraBinaryModel(bytes)) {
    const binaryReferences = collectAuroraBinaryModelTextureReferences(bytes);
    if (binaryReferences.length > 0) {
      return binaryReferences;
    }
  }

  const references = new Set<string>();
  const source = bytes.toString("latin1");
  const tokens = source
    .split(/[\u0000-\u0020,;:"'`()[\]{}<>]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  for (let index = 0; index < tokens.length; index += 1) {
    const key = tokens[index]?.toLowerCase();
    if (!key || !AURORA_MODEL_TEXTURE_REFERENCE_KEYS.has(key)) {
      continue;
    }
    const candidate = tokens[index + 1];
    const normalized = normalizeModelTextureReference(candidate);
    if (normalized) {
      references.add(normalized);
    }
  }

  if (references.size === 0) {
    collectAuroraEmbeddedTextureReferences(bytes).forEach((reference) => {
      references.add(reference);
    });
  }

  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectAuroraSourceModelSupermodelReferences(bytes: Buffer): string[] {
  if (isLikelyAuroraBinaryModel(bytes)) {
    return [];
  }

  const references = new Set<string>();
  const source = bytes.toString("latin1");
  const tokens = source
    .split(/[\u0000-\u0020,;:"'`()[\]{}<>]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index]?.toLowerCase() !== "setsupermodel") {
      continue;
    }
    const normalized = normalizeAuroraModelResourceReference(tokens[index + 2]);
    if (normalized) {
      references.add(normalized);
    }
  }

  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectAuroraEmbeddedTextureReferences(bytes: Buffer): string[] {
  const references = new Set<string>();
  const source = bytes.toString("latin1");
  for (const match of source.matchAll(AURORA_EMBEDDED_TEXTURE_REFERENCE_PATTERN)) {
    const normalized = normalizeModelTextureReference(match[0]);
    if (normalized && isLikelyAuroraEmbeddedTextureReference(normalized)) {
      references.add(normalized);
    }
  }
  return [...references].sort((left, right) => left.localeCompare(right));
}

function isLikelyAuroraEmbeddedTextureReference(value: string): boolean {
  return (
    /^tx_/u.test(value) ||
    /^tex_/u.test(value) ||
    /^mtr_/u.test(value) ||
    (/^(nw2|plc)_/u.test(value) && /_(mc|mr)_/u.test(value))
  );
}

function collectAuroraSourceModelEmitters(
  bytes: Buffer,
  options: AuroraMdlVfxParseOptions = {}
): ParsedAuroraMdlEmitters {
  const parsed = parseAuroraMdlVfxSource(bytes, options);
  return {
    source: parsed.source,
    emitters: parsed.emitters
  };
}

function collectAuroraSourceModelLights(
  bytes: Buffer,
  options: AuroraMdlVfxParseOptions = {}
): ParsedAuroraMdlLights {
  const parsed = parseAuroraMdlVfxSource(bytes, options);
  return {
    source: parsed.source,
    lights: parsed.lights
  };
}

function isLikelyAuroraBinaryModel(bytes: Buffer): boolean {
  return bytes.length >= AURORA_BINARY_MODEL_BASE && bytes.readUInt32LE(0) === 0;
}

function collectAuroraBinaryModelTextureReferences(bytes: Buffer): string[] {
  const references = new Set<string>();
  const rootNodeOffset = readAuroraBinaryUInt32(bytes, AURORA_BINARY_MODEL_BASE + 72);
  if (rootNodeOffset === null) {
    return [];
  }

  const visitedOffsets = new Set<number>();
  const walkNode = (nodeOffset: number, depth: number): void => {
    if (depth > 256 || visitedOffsets.has(nodeOffset)) {
      return;
    }
    visitedOffsets.add(nodeOffset);

    const absOffset = AURORA_BINARY_MODEL_BASE + nodeOffset;
    if (absOffset < AURORA_BINARY_MODEL_BASE) {
      return;
    }
    if (absOffset + AURORA_BINARY_NODE_HEADER_SIZE > bytes.length) {
      return;
    }

    const flags = readAuroraBinaryUInt32(bytes, absOffset + AURORA_BINARY_NODE_FLAGS_OFFSET);
    if (flags === null) {
      return;
    }

    if ((flags & AURORA_BINARY_NODE_FLAG_MESH) !== 0) {
      for (let index = 0; index < 3; index += 1) {
        const textureToken = readAuroraBinaryCString(
          bytes,
          absOffset + AURORA_BINARY_MESH_TEXTURES_OFFSET + index * 64,
          64
        );
        const normalized = normalizeModelTextureReference(textureToken);
        if (normalized) {
          references.add(normalized);
        }
      }
    }

    if ((flags & AURORA_BINARY_NODE_FLAG_EMITTER) !== 0) {
      const textureToken = readAuroraBinaryCString(
        bytes,
        absOffset + AURORA_BINARY_EMITTER_TEXTURE_OFFSET,
        64
      );
      const normalized = normalizeModelTextureReference(textureToken);
      if (normalized) {
        references.add(normalized);
      }
    }

    const childrenOffset = readAuroraBinaryUInt32(
      bytes,
      absOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET
    );
    const childrenCount = readAuroraBinaryUInt32(
      bytes,
      absOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET + 4
    );
    if (childrenOffset === null || childrenCount === null || childrenCount === 0) {
      return;
    }

    for (let index = 0; index < childrenCount; index += 1) {
      const childPosition =
        AURORA_BINARY_MODEL_BASE + childrenOffset + index * 4;
      const childOffset = readAuroraBinaryUInt32(bytes, childPosition);
      if (childOffset === null || childOffset === nodeOffset) {
        continue;
      }
      walkNode(childOffset, depth + 1);
    }
  };

  walkNode(rootNodeOffset, 0);
  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectAuroraBinaryModelEmitters(bytes: Buffer): ParsedAuroraMdlEmitter[] {
  const rootNodeOffset = readAuroraBinaryUInt32(bytes, AURORA_BINARY_MODEL_BASE + 72);
  if (rootNodeOffset === null) {
    return [];
  }

  const emitters = collectAuroraBinaryEmitterNodesFromRoot(bytes, rootNodeOffset);
  return attachAuroraBinaryAnimationEmittersToBaseEmitters(
    emitters,
    collectAuroraBinaryModelAnimationEmitters(bytes)
  );
}

function collectAuroraBinaryEmitterNodesFromRoot(
  bytes: Buffer,
  rootNodeOffset: number,
  options: {
    implicitTimelineDurationSeconds?: number;
  } = {}
): ParsedAuroraMdlEmitter[] {
  const emitters: ParsedAuroraMdlEmitter[] = [];
  const visitedOffsets = new Set<number>();
  const walkNode = (nodeOffset: number, depth: number): void => {
    if (depth > 256 || visitedOffsets.has(nodeOffset)) {
      return;
    }
    visitedOffsets.add(nodeOffset);

    const absOffset = AURORA_BINARY_MODEL_BASE + nodeOffset;
    if (absOffset < AURORA_BINARY_MODEL_BASE) {
      return;
    }
    if (absOffset + AURORA_BINARY_NODE_HEADER_SIZE > bytes.length) {
      return;
    }

    const flags = readAuroraBinaryUInt32(bytes, absOffset + AURORA_BINARY_NODE_FLAGS_OFFSET);
    if (flags === null) {
      return;
    }

    if ((flags & AURORA_BINARY_NODE_FLAG_EMITTER) !== 0) {
      const texture = normalizeModelTextureReference(
        readAuroraBinaryCString(
          bytes,
          absOffset + AURORA_BINARY_EMITTER_TEXTURE_OFFSET,
          64
        )
      );
      const chunkName = normalizeAuroraModelResourceReference(
        readAuroraBinaryCString(
          bytes,
          absOffset + AURORA_BINARY_EMITTER_CHUNK_NAME_OFFSET,
          AURORA_BINARY_EMITTER_CHUNK_NAME_LENGTH
        )
      );
      const emitter: ParsedAuroraMdlEmitter = {
        nodeName:
          normalizeAuroraEmitterValue(
            readAuroraBinaryCString(
              bytes,
              absOffset + AURORA_BINARY_NODE_NAME_OFFSET,
              32
            )
          ) ?? `emitter_${emitters.length + 1}`
      };
      const emitterType = normalizeAuroraEmitterValue(
        readAuroraBinaryCString(bytes, absOffset + AURORA_BINARY_EMITTER_TYPE_OFFSET, 64)
      );
      const renderMode = normalizeAuroraEmitterValue(
        readAuroraBinaryCString(bytes, absOffset + AURORA_BINARY_EMITTER_RENDER_MODE_OFFSET, 64)
      );
      const blendMode = normalizeAuroraEmitterValue(
        readAuroraBinaryCString(bytes, absOffset + AURORA_BINARY_EMITTER_BLEND_MODE_OFFSET, 64)
      );
      if (texture) {
        emitter.texture = texture;
      }
      if (chunkName) {
        emitter.chunkName = chunkName;
      }
      if (emitterType) {
        emitter.emitterType = emitterType;
      }
      if (renderMode) {
        emitter.renderMode = renderMode;
      }
      if (blendMode) {
        emitter.blendMode = blendMode;
      }
      const atlas = readAuroraBinaryEmitterAtlas(bytes, absOffset);
      if (atlas) {
        emitter.atlas = atlas;
      }
      const simulation = readAuroraBinaryEmitterSimulation(bytes, absOffset, {
        implicitTimelineDurationSeconds: options.implicitTimelineDurationSeconds
      });
      if (simulation) {
        emitter.simulation = simulation;
      }
      const emitterFlags =
        readAuroraBinaryUInt32(bytes, absOffset + AURORA_BINARY_EMITTER_FLAGS_OFFSET) ?? 0;
      const sourceState = buildAuroraEmitterSourceState({
        twoSidedTexture:
          (readAuroraBinaryUInt32(
            bytes,
            absOffset + AURORA_BINARY_EMITTER_TWO_SIDED_TEX_OFFSET
          ) ?? 0) !== 0,
        loop:
          (readAuroraBinaryUInt32(bytes, absOffset + AURORA_BINARY_EMITTER_LOOP_OFFSET) ?? 0) !==
          0,
        renderOrder: readAuroraBinaryInt16(
          bytes,
          absOffset + AURORA_BINARY_EMITTER_RENDER_ORDER_OFFSET
        ) ?? undefined,
        isTinted: (emitterFlags & AURORA_BINARY_EMITTER_FLAG_IS_TINTED) !== 0,
        splat: (emitterFlags & AURORA_BINARY_EMITTER_FLAG_SPLAT) !== 0
      });
      if (sourceState) {
        emitter.sourceState = sourceState;
      }
      const transform = readAuroraBinaryEmitterTransform(bytes, absOffset);
      if (transform) {
        emitter.transform = transform;
      }
      const referenceNodes = readAuroraBinaryEmitterReferenceNodes(bytes, absOffset, emitter.nodeName);
      if (referenceNodes.length > 0) {
        emitter.referenceNodes = referenceNodes;
      }
      emitters.push(emitter);
    }

    const childrenOffset = readAuroraBinaryUInt32(
      bytes,
      absOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET
    );
    const childrenCount = readAuroraBinaryUInt32(
      bytes,
      absOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET + 4
    );
    if (childrenOffset === null || childrenCount === null || childrenCount === 0) {
      return;
    }

    for (let index = 0; index < childrenCount; index += 1) {
      const childPosition =
        AURORA_BINARY_MODEL_BASE + childrenOffset + index * 4;
      const childOffset = readAuroraBinaryUInt32(bytes, childPosition);
      if (childOffset === null || childOffset === nodeOffset) {
        continue;
      }
      walkNode(childOffset, depth + 1);
    }
  };

  walkNode(rootNodeOffset, 0);
  return emitters;
}

interface AuroraBinaryModelAnimationEmitterTrack {
  nodeName: string;
  emitter: ParsedAuroraMdlEmitter;
  animation: ParsedAuroraMdlEmitterAnimation;
}

function collectAuroraBinaryModelAnimationEmitters(
  bytes: Buffer
): AuroraBinaryModelAnimationEmitterTrack[] {
  const animations = readAuroraBinaryArrayHeader(
    bytes,
    AURORA_BINARY_MODEL_BASE + AURORA_BINARY_MODEL_ANIMATIONS_OFFSET
  );
  if (!animations || animations.count < 1) {
    return [];
  }

  const emitterAnimations: AuroraBinaryModelAnimationEmitterTrack[] = [];
  for (let index = 0; index < animations.count; index += 1) {
    const animationOffsetPosition =
      AURORA_BINARY_MODEL_BASE + animations.offset + index * 4;
    const animationOffset = readAuroraBinaryUInt32(bytes, animationOffsetPosition);
    if (animationOffset === null) {
      continue;
    }
    const animationAbsOffset = AURORA_BINARY_MODEL_BASE + animationOffset;
    if (
      animationAbsOffset < AURORA_BINARY_MODEL_BASE ||
      animationAbsOffset + AURORA_BINARY_ANIMATION_ROOT_NODE_OFFSET + 4 > bytes.length
    ) {
      continue;
    }

    const animationName = normalizeAuroraEmitterValue(
      readAuroraBinaryCString(
        bytes,
        animationAbsOffset + AURORA_BINARY_ANIMATION_NAME_OFFSET,
        AURORA_BINARY_ANIMATION_NAME_LENGTH
      )
    );
    if (!animationName) {
      continue;
    }
    const lengthSeconds = sanitizeAuroraEmitterNonNegativeNumber(
      readAuroraBinaryFloat32(bytes, animationAbsOffset)
    );
    const transitionSeconds = sanitizeAuroraEmitterNonNegativeNumber(
      readAuroraBinaryFloat32(bytes, animationAbsOffset + 4)
    );
    const rootNodeOffset = readAuroraBinaryUInt32(
      bytes,
      animationAbsOffset + AURORA_BINARY_ANIMATION_ROOT_NODE_OFFSET
    );
    if (rootNodeOffset === null) {
      continue;
    }

    const animationEmitters = collectAuroraBinaryEmitterNodesFromRoot(bytes, rootNodeOffset, {
      implicitTimelineDurationSeconds: lengthSeconds
    });
    animationEmitters.forEach((emitter) => {
      const animation = buildAuroraBinaryEmitterAnimationTrack({
        animationName,
        lengthSeconds,
        transitionSeconds,
        emitter
      });
      if (animation) {
        emitterAnimations.push({
          nodeName: emitter.nodeName,
          emitter,
          animation
        });
      }
    });
  }
  return emitterAnimations;
}

function buildAuroraBinaryEmitterAnimationTrack(input: {
  animationName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  emitter: ParsedAuroraMdlEmitter;
}): ParsedAuroraMdlEmitterAnimation | undefined {
  const animationName = sanitizeAuroraEmitterString(input.animationName);
  if (!animationName || (!input.emitter.simulation && !input.emitter.transform)) {
    return undefined;
  }

  const lengthSeconds = sanitizeAuroraEmitterNonNegativeNumber(input.lengthSeconds);
  const transitionSeconds = sanitizeAuroraEmitterNonNegativeNumber(input.transitionSeconds);
  return {
    animationName,
    ...(lengthSeconds !== undefined ? { lengthSeconds } : {}),
    ...(transitionSeconds !== undefined ? { transitionSeconds } : {}),
    ...(input.emitter.simulation ? { simulation: input.emitter.simulation } : {}),
    ...(input.emitter.transform ? { transform: input.emitter.transform } : {})
  };
}

function attachAuroraBinaryAnimationEmittersToBaseEmitters(
  emitters: ParsedAuroraMdlEmitter[],
  animationEmitters: AuroraBinaryModelAnimationEmitterTrack[]
): ParsedAuroraMdlEmitter[] {
  if (animationEmitters.length === 0) {
    return emitters;
  }

  const emittersByName = new Map(
    emitters
      .map((emitter): [string, ParsedAuroraMdlEmitter] | null => {
        const key = normalizeAuroraNodeLookupName(emitter.nodeName);
        return key ? [key, emitter] : null;
      })
      .filter((entry): entry is [string, ParsedAuroraMdlEmitter] => Boolean(entry))
  );
  const promotedAnimationEmitters = new Map<string, ParsedAuroraMdlEmitter>();

  animationEmitters.forEach((animationEmitter) => {
    const key = normalizeAuroraNodeLookupName(animationEmitter.nodeName);
    const targetEmitter = key ? emittersByName.get(key) : undefined;
    if (targetEmitter) {
      targetEmitter.animations = [
        ...(targetEmitter.animations ?? []),
        animationEmitter.animation
      ];
      return;
    }

    const promotedKey = key ?? `animation_emitter_${promotedAnimationEmitters.size + 1}`;
    const promotedEmitter =
      promotedAnimationEmitters.get(promotedKey) ?? animationEmitter.emitter;
    promotedEmitter.animations = [
      ...(promotedEmitter.animations ?? []),
      animationEmitter.animation
    ];
    promotedAnimationEmitters.set(promotedKey, promotedEmitter);
  });

  return [...emitters, ...promotedAnimationEmitters.values()];
}

function collectAuroraAsciiModelEmitters(bytes: Buffer): ParsedAuroraMdlEmitter[] {
  const emitters: ParsedAuroraMdlEmitter[] = [];
  const referenceNodes: ParsedAuroraMdlReferenceNode[] = [];
  const animationEvents: ParsedAuroraMdlEmitterAnimationEvent[] = [];
  const lines = bytes.toString("latin1").split(/\r?\n/u);
  const nodeStack: Array<
    | { kind: "emitter"; emitter: ParsedAuroraMdlEmitter }
    | { kind: "reference"; reference: ParsedAuroraMdlReferenceNode }
    | { kind: "other" }
  > = [];
  let currentAnimationName: string | undefined;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    const withoutComments = line
      .replace(/\/\/.*$/u, "")
      .replace(/;.*$/u, "")
      .trim();
    if (!withoutComments) {
      continue;
    }

    const tokens = withoutComments.split(/\s+/u);
    const key = tokens[0]?.toLowerCase();
    if (!key) {
      continue;
    }

    if (key === "newanim") {
      currentAnimationName = normalizeAuroraEmitterValue(tokens[1] ?? "");
      continue;
    }

    if (key === "doneanim") {
      currentAnimationName = undefined;
      continue;
    }

    if (key === "event") {
      const eventTime = readAuroraNumberValue(tokens[1] ?? "");
      const eventType = normalizeAuroraEmitterValue(tokens.slice(2).join(" "));
      const event = buildAuroraEmitterAnimationEvent({
        time: eventTime,
        type: eventType,
        animationName: currentAnimationName
      });
      if (event) {
        animationEvents.push(event);
      }
      continue;
    }

    if (key === "node" && tokens[1]?.toLowerCase() === "emitter") {
      nodeStack.push({
        kind: "emitter",
        emitter: {
          nodeName: normalizeAuroraEmitterValue(tokens.slice(2).join(" ")) ??
            `emitter_${emitters.length + 1}`
        }
      });
      continue;
    }

    if (key === "node" && tokens[1]?.toLowerCase() === "reference") {
      nodeStack.push({
        kind: "reference",
        reference: {
          nodeName: normalizeAuroraEmitterValue(tokens.slice(2).join(" ")) ??
            `reference_${referenceNodes.length + 1}`,
          parentNodeName: resolveNearestOpenAuroraAsciiEmitterName(nodeStack)
        }
      });
      continue;
    }

    if (key === "node") {
      nodeStack.push({ kind: "other" });
      continue;
    }

    if (key === "endnode" || (key === "end" && tokens[1]?.toLowerCase() === "node")) {
      const currentNode = nodeStack.pop();
      if (currentNode?.kind === "emitter") {
        emitters.push(currentNode.emitter);
      } else if (currentNode?.kind === "reference") {
        const referenceNode = buildAuroraEmitterReferenceNode(currentNode.reference);
        if (referenceNode) {
          referenceNodes.push(referenceNode);
        }
      }
      continue;
    }

    const currentNode = nodeStack[nodeStack.length - 1];
    if (!currentNode) {
      continue;
    }

    const rawValue = tokens.slice(1).join(" ");
    if (!rawValue) {
      continue;
    }

    if (currentNode.kind === "reference") {
      if (key === "parent") {
        const parentNodeName = normalizeAuroraEmitterValue(rawValue);
        if (parentNodeName) {
          currentNode.reference.parentNodeName = parentNodeName;
        }
        continue;
      }

      if (key === "position") {
        setAuroraReferenceTransformDraftValue(
          currentNode.reference,
          "position",
          readAuroraVector3Value(rawValue)
        );
        continue;
      }

      if (key === "orientation") {
        setAuroraReferenceTransformDraftValue(
          currentNode.reference,
          "orientation",
          readAuroraOrientationValue(rawValue)
        );
      }
      continue;
    }

    if (currentNode.kind !== "emitter") {
      continue;
    }

    const current = currentNode.emitter;

    const colorTimelineKey = toAuroraEmitterSimulationColorTimelineKey(key);
    if (colorTimelineKey) {
      const timelineParse = readAuroraAsciiColorTimeline(lines, lineIndex, rawValue);
      if (timelineParse.frames.length > 0) {
        setAuroraEmitterSimulationDraftValue(
          current,
          colorTimelineKey,
          timelineParse.frames[0]?.value
        );
        setAuroraEmitterSimulationColorTimelineDraftValue(
          current,
          colorTimelineKey,
          timelineParse.frames
        );
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    const simulationTimelineKey = toAuroraEmitterSimulationTimelineKey(key);
    if (simulationTimelineKey) {
      const timelineParse = readAuroraAsciiNumberTimeline(lines, lineIndex, rawValue);
      if (timelineParse.frames.length > 0) {
        setAuroraEmitterSimulationDraftValue(
          current,
          simulationTimelineKey,
          timelineParse.frames[0]?.value
        );
        setAuroraEmitterSimulationTimelineDraftValue(
          current,
          simulationTimelineKey,
          timelineParse.frames
        );
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    if (key === "texture" || key === "bitmap") {
      const texture = normalizeModelTextureReference(rawValue);
      if (texture) {
        current.texture = texture;
      }
      continue;
    }

    if (key === "chunkname" || key === "chunk_name") {
      const chunkName = normalizeAuroraModelResourceReference(rawValue);
      if (chunkName) {
        current.chunkName = chunkName;
      }
      continue;
    }

    if (key === "position") {
      setAuroraEmitterTransformDraftValue(
        current,
        "position",
        readAuroraVector3Value(rawValue)
      );
      continue;
    }

    if (key === "orientation") {
      setAuroraEmitterTransformDraftValue(
        current,
        "orientation",
        readAuroraOrientationValue(rawValue)
      );
      continue;
    }

    if (key === "render" || key === "rendermode" || key === "render_mode") {
      const renderMode = normalizeAuroraEmitterValue(rawValue);
      if (renderMode) {
        current.renderMode = renderMode;
      }
      continue;
    }

    if (key === "blend" || key === "blendmode" || key === "blend_mode") {
      const blendMode = normalizeAuroraEmitterValue(rawValue);
      if (blendMode) {
        current.blendMode = blendMode;
      }
      continue;
    }

    if (
      key === "type" ||
      key === "emittertype" ||
      key === "emitter_type" ||
      key === "update"
    ) {
      const emitterType = normalizeAuroraEmitterValue(rawValue);
      if (emitterType) {
        current.emitterType = emitterType;
      }
      continue;
    }

    if (key === "xgrid" || key === "x_grid") {
      setAuroraEmitterAtlasDraftValue(current, "xGridRaw", readAuroraIntegerValue(rawValue));
      continue;
    }

    if (key === "ygrid" || key === "y_grid") {
      setAuroraEmitterAtlasDraftValue(current, "yGridRaw", readAuroraIntegerValue(rawValue));
      continue;
    }

    if (key === "fps") {
      setAuroraEmitterAtlasDraftValue(current, "fps", readAuroraNumberValue(rawValue));
      continue;
    }

    if (key === "framestart" || key === "frame_start") {
      setAuroraEmitterAtlasDraftValue(current, "frameStart", readAuroraIntegerValue(rawValue));
      continue;
    }

    if (key === "frameend" || key === "frame_end") {
      setAuroraEmitterAtlasDraftValue(current, "frameEnd", readAuroraIntegerValue(rawValue));
      continue;
    }

    if (key === "random") {
      setAuroraEmitterAtlasDraftValue(current, "random", readAuroraBooleanValue(rawValue));
      continue;
    }

    if (key === "renderorder" || key === "render_order") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "renderOrder",
        readAuroraIntegerValue(rawValue)
      );
      continue;
    }

    if (key === "renderhint" || key === "render_hint") {
      const renderHintRaw = normalizeAuroraEmitterValue(rawValue);
      setAuroraEmitterSourceStateDraftValue(current, "renderHintRaw", renderHintRaw);
      if (renderHintRaw) {
        setAuroraEmitterSourceStateDraftValue(
          current,
          "renderHintMode",
          resolveAuroraRenderHintMode(renderHintRaw)
        );
      }
      continue;
    }

    if (key === "customshadervs" || key === "custom_shader_vs") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "customShaderVS",
        normalizeAuroraEmitterValue(rawValue)
      );
      continue;
    }

    if (key === "customshaderfs" || key === "custom_shader_fs") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "customShaderFS",
        normalizeAuroraEmitterValue(rawValue)
      );
      continue;
    }

    if (key === "customshadergs" || key === "custom_shader_gs") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "customShaderGS",
        normalizeAuroraEmitterValue(rawValue)
      );
      continue;
    }

    if (key === "transparency") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "transparency",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    if (key === "twosided") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "twoSidedMaterial",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    if (key === "twosidedtex" || key === "two_sided_tex") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "twoSidedTexture",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    if (key === "sample_framebuffer") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "sampleFramebuffer",
        readAuroraSampleFramebufferValue(rawValue)
      );
      continue;
    }

    if (key === "volumetric") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "volumetric",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    if (key === "loop") {
      setAuroraEmitterSourceStateDraftValue(current, "loop", readAuroraBooleanValue(rawValue));
      continue;
    }

    if (key === "m_istinted" || key === "istinted" || key === "is_tinted") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "isTinted",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    if (key === "splat") {
      setAuroraEmitterSourceStateDraftValue(current, "splat", readAuroraBooleanValue(rawValue));
      continue;
    }

    if (key === "rotatetexture" || key === "rotate_texture") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "rotateTexture",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    const simulationBooleanKey = toAuroraEmitterSimulationBooleanKey(key);
    if (simulationBooleanKey) {
      setAuroraEmitterSimulationDraftValue(
        current,
        simulationBooleanKey,
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    const simulationStringKey = toAuroraEmitterSimulationStringKey(key);
    if (simulationStringKey) {
      setAuroraEmitterSimulationDraftValue(
        current,
        simulationStringKey,
        normalizeAuroraEmitterValue(rawValue)
      );
      continue;
    }

    const simulationKey = toAuroraEmitterSimulationNumberKey(key);
    if (simulationKey) {
      setAuroraEmitterSimulationDraftValue(
        current,
        simulationKey,
        readAuroraNumberValue(rawValue)
      );
      continue;
    }

    const simulationColorKey = toAuroraEmitterSimulationColorKey(key);
    if (simulationColorKey) {
      setAuroraEmitterSimulationDraftValue(
        current,
        simulationColorKey,
        readAuroraVector3Value(rawValue)
      );
    }
  }

  while (nodeStack.length > 0) {
    const currentNode = nodeStack.pop();
    if (currentNode?.kind === "emitter") {
      emitters.push(currentNode.emitter);
    } else if (currentNode?.kind === "reference") {
      const referenceNode = buildAuroraEmitterReferenceNode(currentNode.reference);
      if (referenceNode) {
        referenceNodes.push(referenceNode);
      }
    }
  }

  return attachAuroraAnimationEventsToEmitters(
    attachAuroraReferenceNodesToEmitters(emitters, referenceNodes),
    animationEvents
  );
}

function collectAuroraAsciiModelLights(bytes: Buffer): ParsedAuroraMdlLight[] {
  type LightNodeDraft = ParsedAuroraMdlLight & {
    animationName?: string;
    lengthSeconds?: number;
    transitionSeconds?: number;
    positionTimeline?: ParsedAuroraMdlLightVector3Keyframe[];
    colorTimeline?: ParsedAuroraMdlLightColorKeyframe[];
    radiusTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
    shadowRadiusTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
    verticalDisplacementTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
    multiplierTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
  };

  const lights: ParsedAuroraMdlLight[] = [];
  const animationTracks: Array<{ nodeName: string; animation: ParsedAuroraMdlLightAnimation }> = [];
  const lines = bytes.toString("latin1").split(/\r?\n/u);
  const nodeStack: Array<{ kind: "light"; light: LightNodeDraft } | { kind: "other" }> = [];
  let currentAnimation:
    | {
        animationName: string;
        lengthSeconds?: number;
        transitionSeconds?: number;
      }
    | undefined;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const withoutComments = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!withoutComments) {
      continue;
    }

    const tokens = withoutComments.split(/\s+/u);
    const key = tokens[0]?.toLowerCase();
    if (!key) {
      continue;
    }

    if (key === "newanim") {
      const animationName = normalizeAuroraEmitterValue(tokens[1] ?? "");
      currentAnimation = animationName ? { animationName } : undefined;
      continue;
    }

    if (key === "doneanim") {
      currentAnimation = undefined;
      continue;
    }

    if (currentAnimation && key === "length") {
      const lengthSeconds = sanitizeAuroraEmitterNonNegativeNumber(
        readAuroraNumberValue(tokens.slice(1).join(" "))
      );
      if (lengthSeconds !== undefined) {
        currentAnimation.lengthSeconds = lengthSeconds;
      }
      continue;
    }

    if (currentAnimation && key === "transtime") {
      const transitionSeconds = sanitizeAuroraEmitterNonNegativeNumber(
        readAuroraNumberValue(tokens.slice(1).join(" "))
      );
      if (transitionSeconds !== undefined) {
        currentAnimation.transitionSeconds = transitionSeconds;
      }
      continue;
    }

    if (key === "node" && isAuroraAsciiLightNodeKind(tokens[1]?.toLowerCase())) {
      nodeStack.push({
        kind: "light",
        light: {
          sourceNodeKind: tokens[1]?.toLowerCase(),
          nodeName:
            normalizeAuroraEmitterValue(tokens.slice(2).join(" ")) ??
            `light_${lights.length + animationTracks.length + 1}`,
          ...(currentAnimation?.animationName
            ? { animationName: currentAnimation.animationName }
            : {}),
          ...(currentAnimation?.lengthSeconds !== undefined
            ? { lengthSeconds: currentAnimation.lengthSeconds }
            : {}),
          ...(currentAnimation?.transitionSeconds !== undefined
            ? { transitionSeconds: currentAnimation.transitionSeconds }
            : {})
        }
      });
      continue;
    }

    if (key === "node") {
      nodeStack.push({ kind: "other" });
      continue;
    }

    if (key === "endnode" || (key === "end" && tokens[1]?.toLowerCase() === "node")) {
      const currentNode = nodeStack.pop();
      if (currentNode?.kind === "light") {
        const animation = buildAuroraLightAnimationTrack(currentNode.light);
        if (animation && currentNode.light.animationName) {
          animationTracks.push({
            nodeName: currentNode.light.nodeName,
            animation
          });
        } else {
          lights.push(buildAuroraLightNode(currentNode.light));
        }
      }
      continue;
    }

    const currentNode = nodeStack[nodeStack.length - 1];
    if (currentNode?.kind !== "light") {
      continue;
    }

    const rawValue = tokens.slice(1).join(" ");
    const current = currentNode.light;

    if (key === "parent") {
      const parentNodeName = normalizeAuroraEmitterValue(rawValue);
      if (parentNodeName) {
        current.parentNodeName = parentNodeName;
      }
      continue;
    }

    if (key === "position") {
      setAuroraLightTransformDraftValue(current, "position", readAuroraVector3Value(rawValue));
      continue;
    }

    if (key === "orientation") {
      setAuroraLightTransformDraftValue(
        current,
        "orientation",
        readAuroraOrientationValue(rawValue)
      );
      continue;
    }

    if (key === "positionkey") {
      const timelineParse = readAuroraAsciiVector3KeyframesUntilEndList(
        lines,
        lineIndex,
        rawValue
      );
      if (timelineParse.frames.length > 0) {
        current.positionTimeline = timelineParse.frames;
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    if (key === "colorkey" || key === "colorbezierkey") {
      const timelineParse = readAuroraAsciiColorKeyframesUntilEndList(
        lines,
        lineIndex,
        rawValue
      );
      if (timelineParse.frames.length > 0) {
        current.colorTimeline = timelineParse.frames;
        current.color = timelineParse.frames[0]?.value ?? current.color;
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    if (key === "radiuskey" || key === "radiusbezierkey") {
      const timelineParse = readAuroraAsciiNumberKeyframesUntilEndList(
        lines,
        lineIndex,
        rawValue
      );
      if (timelineParse.frames.length > 0) {
        current.radiusTimeline = timelineParse.frames;
        current.radius = timelineParse.frames[0]?.value ?? current.radius;
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    if (key === "shadowradiuskey" || key === "shadowradiusbezierkey") {
      const timelineParse = readAuroraAsciiNumberKeyframesUntilEndList(
        lines,
        lineIndex,
        rawValue
      );
      if (timelineParse.frames.length > 0) {
        current.shadowRadiusTimeline = timelineParse.frames;
        current.shadowRadius = timelineParse.frames[0]?.value ?? current.shadowRadius;
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    if (key === "verticaldisplacementkey" || key === "verticaldisplacementbezierkey") {
      const timelineParse = readAuroraAsciiNumberKeyframesUntilEndList(
        lines,
        lineIndex,
        rawValue
      );
      if (timelineParse.frames.length > 0) {
        current.verticalDisplacementTimeline = timelineParse.frames;
        current.verticalDisplacement =
          timelineParse.frames[0]?.value ?? current.verticalDisplacement;
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    if (key === "multiplierkey" || key === "multiplierbezierkey") {
      const timelineParse = readAuroraAsciiNumberKeyframesUntilEndList(
        lines,
        lineIndex,
        rawValue
      );
      if (timelineParse.frames.length > 0) {
        current.multiplierTimeline = timelineParse.frames;
        current.multiplier = timelineParse.frames[0]?.value ?? current.multiplier;
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    if (key === "radius") {
      const radius = sanitizeAuroraEmitterFiniteNumber(readAuroraNumberValue(rawValue));
      if (radius !== undefined) {
        current.radius = radius;
      }
      continue;
    }

    if (key === "shadowradius") {
      const shadowRadius = sanitizeAuroraEmitterFiniteNumber(readAuroraNumberValue(rawValue));
      if (shadowRadius !== undefined) {
        current.shadowRadius = shadowRadius;
      }
      continue;
    }

    if (key === "verticaldisplacement") {
      const verticalDisplacement = sanitizeAuroraEmitterFiniteNumber(
        readAuroraNumberValue(rawValue)
      );
      if (verticalDisplacement !== undefined) {
        current.verticalDisplacement = verticalDisplacement;
      }
      continue;
    }

    if (key === "multiplier") {
      const multiplier = sanitizeAuroraEmitterFiniteNumber(readAuroraNumberValue(rawValue));
      if (multiplier !== undefined) {
        current.multiplier = multiplier;
      }
      continue;
    }

    if (key === "color") {
      const color = sanitizeAuroraEmitterColor(readAuroraVector3Value(rawValue));
      if (color) {
        current.color = color;
      }
      continue;
    }

    if (key === "ambientonly") {
      const ambientOnly = sanitizeAuroraEmitterBoolean(readAuroraBooleanValue(rawValue));
      if (ambientOnly !== undefined) {
        current.ambientOnly = ambientOnly;
      }
      continue;
    }

    if (key === "isdynamic" || key === "ndynamictype" || key === "dynamictype") {
      const dynamicType = sanitizeAuroraEmitterNonNegativeInteger(
        readAuroraIntegerValue(rawValue)
      );
      if (dynamicType !== undefined) {
        current.dynamicType = dynamicType;
      }
      continue;
    }

    if (key === "affectdynamic") {
      const affectDynamic = sanitizeAuroraEmitterBoolean(readAuroraBooleanValue(rawValue));
      if (affectDynamic !== undefined) {
        current.affectDynamic = affectDynamic;
      }
      continue;
    }

    if (key === "shadow") {
      const shadow = sanitizeAuroraEmitterBoolean(readAuroraBooleanValue(rawValue));
      if (shadow !== undefined) {
        current.shadow = shadow;
      }
      continue;
    }

    if (key === "lightpriority") {
      const lightPriority = sanitizeAuroraEmitterNonNegativeInteger(
        readAuroraIntegerValue(rawValue)
      );
      if (lightPriority !== undefined) {
        current.lightPriority = lightPriority;
      }
      continue;
    }

    if (key === "generateflare") {
      const generateFlare = sanitizeAuroraEmitterBoolean(readAuroraBooleanValue(rawValue));
      if (generateFlare !== undefined) {
        current.generateFlare = generateFlare;
      }
      continue;
    }

    if (key === "texturenames") {
      const listParse = readAuroraAsciiStringListUntilEndList(lines, lineIndex, rawValue);
      if (listParse.values.length > 0) {
        current.textureNames = listParse.values;
        lineIndex = listParse.endLineIndex;
      }
      continue;
    }

    if (key === "flaresizes") {
      const listParse = readAuroraAsciiNumberListUntilEndList(lines, lineIndex, rawValue);
      if (listParse.values.length > 0) {
        current.flareSizes = listParse.values;
        lineIndex = listParse.endLineIndex;
      }
      continue;
    }

    if (key === "flarepositions") {
      const listParse = readAuroraAsciiNumberListUntilEndList(lines, lineIndex, rawValue);
      if (listParse.values.length > 0) {
        current.flarePositions = listParse.values;
        lineIndex = listParse.endLineIndex;
      }
      continue;
    }

    if (key === "flarecolorshifts") {
      const listParse = readAuroraAsciiVector3ListUntilEndList(lines, lineIndex, rawValue);
      if (listParse.values.length > 0) {
        current.flareColorShifts = listParse.values;
        lineIndex = listParse.endLineIndex;
      }
      continue;
    }

    if (key === "flareradius") {
      const flareRadius = sanitizeAuroraEmitterFiniteNumber(readAuroraNumberValue(rawValue));
      if (flareRadius !== undefined) {
        current.flareRadius = flareRadius;
      }
      continue;
    }

    if (key === "lensflares") {
      const lensFlares = sanitizeAuroraEmitterBoolean(readAuroraBooleanValue(rawValue));
      if (lensFlares !== undefined) {
        current.lensFlares = lensFlares;
      }
      continue;
    }

    if (key === "fadinglight") {
      const fadingLight = sanitizeAuroraEmitterBoolean(readAuroraBooleanValue(rawValue));
      if (fadingLight !== undefined) {
        current.fadingLight = fadingLight;
      }
    }
  }

  while (nodeStack.length > 0) {
    const currentNode = nodeStack.pop();
    if (currentNode?.kind !== "light") {
      continue;
    }
    const animation = buildAuroraLightAnimationTrack(currentNode.light);
    if (animation && currentNode.light.animationName) {
      animationTracks.push({
        nodeName: currentNode.light.nodeName,
        animation
      });
    } else {
      lights.push(buildAuroraLightNode(currentNode.light));
    }
  }

  return attachAuroraLightAnimationsToLights(lights, animationTracks);
}

function buildAuroraLightNode(light: ParsedAuroraMdlLight): ParsedAuroraMdlLight {
  return {
    nodeName: light.nodeName,
    ...(light.sourceNodeKind ? { sourceNodeKind: light.sourceNodeKind } : {}),
    ...(light.parentNodeName ? { parentNodeName: light.parentNodeName } : {}),
    ...(light.transform ? { transform: light.transform } : {}),
    ...(light.radius !== undefined ? { radius: light.radius } : {}),
    ...(light.shadowRadius !== undefined ? { shadowRadius: light.shadowRadius } : {}),
    ...(light.verticalDisplacement !== undefined
      ? { verticalDisplacement: light.verticalDisplacement }
      : {}),
    ...(light.multiplier !== undefined ? { multiplier: light.multiplier } : {}),
    ...(light.color ? { color: light.color } : {}),
    ...(light.ambientOnly !== undefined ? { ambientOnly: light.ambientOnly } : {}),
    ...(light.dynamicType !== undefined ? { dynamicType: light.dynamicType } : {}),
    ...(light.affectDynamic !== undefined ? { affectDynamic: light.affectDynamic } : {}),
    ...(light.shadow !== undefined ? { shadow: light.shadow } : {}),
    ...(light.lightPriority !== undefined ? { lightPriority: light.lightPriority } : {}),
    ...(light.generateFlare !== undefined ? { generateFlare: light.generateFlare } : {}),
    ...(light.textureNames?.length ? { textureNames: light.textureNames } : {}),
    ...(light.flareSizes?.length ? { flareSizes: light.flareSizes } : {}),
    ...(light.flarePositions?.length ? { flarePositions: light.flarePositions } : {}),
    ...(light.flareColorShifts?.length ? { flareColorShifts: light.flareColorShifts } : {}),
    ...(light.flareRadius !== undefined ? { flareRadius: light.flareRadius } : {}),
    ...(light.lensFlares !== undefined ? { lensFlares: light.lensFlares } : {}),
    ...(light.fadingLight !== undefined ? { fadingLight: light.fadingLight } : {}),
    ...(light.animations && light.animations.length > 0 ? { animations: light.animations } : {})
  };
}

function isAuroraAsciiLightNodeKind(nodeKind: string | undefined): nodeKind is string {
  return typeof nodeKind === "string" && AURORA_ASCII_LIGHT_NODE_KINDS.has(nodeKind);
}

function buildAuroraLightAnimationTrack(input: {
  animationName?: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  positionTimeline?: ParsedAuroraMdlLightVector3Keyframe[];
  colorTimeline?: ParsedAuroraMdlLightColorKeyframe[];
  radiusTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
  shadowRadiusTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
  verticalDisplacementTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
  multiplierTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
}): ParsedAuroraMdlLightAnimation | undefined {
  const animationName = sanitizeAuroraEmitterString(input.animationName);
  if (
    !animationName ||
    (!input.positionTimeline &&
      !input.colorTimeline &&
      !input.radiusTimeline &&
      !input.shadowRadiusTimeline &&
      !input.verticalDisplacementTimeline &&
      !input.multiplierTimeline)
  ) {
    return undefined;
  }
  const lengthSeconds = sanitizeAuroraEmitterNonNegativeNumber(input.lengthSeconds);
  const transitionSeconds = sanitizeAuroraEmitterNonNegativeNumber(input.transitionSeconds);
  return {
    animationName,
    ...(lengthSeconds !== undefined ? { lengthSeconds } : {}),
    ...(transitionSeconds !== undefined ? { transitionSeconds } : {}),
    ...(input.positionTimeline ? { positionTimeline: input.positionTimeline } : {}),
    ...(input.colorTimeline ? { colorTimeline: input.colorTimeline } : {}),
    ...(input.radiusTimeline ? { radiusTimeline: input.radiusTimeline } : {}),
    ...(input.shadowRadiusTimeline ? { shadowRadiusTimeline: input.shadowRadiusTimeline } : {}),
    ...(input.verticalDisplacementTimeline
      ? { verticalDisplacementTimeline: input.verticalDisplacementTimeline }
      : {}),
    ...(input.multiplierTimeline ? { multiplierTimeline: input.multiplierTimeline } : {})
  };
}

function attachAuroraLightAnimationsToLights(
  lights: ParsedAuroraMdlLight[],
  animationTracks: Array<{ nodeName: string; animation: ParsedAuroraMdlLightAnimation }>
): ParsedAuroraMdlLight[] {
  if (animationTracks.length === 0) {
    return lights;
  }
  const lightsByName = new Map(
    lights
      .map((light): [string, ParsedAuroraMdlLight] | null => {
        const key = normalizeAuroraNodeLookupName(light.nodeName);
        return key ? [key, light] : null;
      })
      .filter((entry): entry is [string, ParsedAuroraMdlLight] => Boolean(entry))
  );

  animationTracks.forEach((track) => {
    const key = normalizeAuroraNodeLookupName(track.nodeName);
    const targetLight = key ? lightsByName.get(key) : undefined;
    if (!targetLight) {
      return;
    }
    targetLight.animations = [
      ...(targetLight.animations ?? []),
      track.animation
    ];
  });

  return lights;
}

function resolveNearestOpenAuroraAsciiEmitterName(
  nodeStack: Array<
    | { kind: "emitter"; emitter: ParsedAuroraMdlEmitter }
    | { kind: "reference"; reference: ParsedAuroraMdlReferenceNode }
    | { kind: "other" }
  >
): string | undefined {
  for (let index = nodeStack.length - 1; index >= 0; index -= 1) {
    const node = nodeStack[index];
    if (node?.kind === "emitter") {
      return node.emitter.nodeName;
    }
  }
  return undefined;
}

function attachAuroraReferenceNodesToEmitters(
  emitters: ParsedAuroraMdlEmitter[],
  referenceNodes: ParsedAuroraMdlReferenceNode[]
): ParsedAuroraMdlEmitter[] {
  if (referenceNodes.length === 0 || emitters.length === 0) {
    return emitters;
  }
  const emittersByName = new Map(
    emitters
      .map((emitter): [string, ParsedAuroraMdlEmitter] | null => {
        const key = normalizeAuroraNodeLookupName(emitter.nodeName);
        return key ? [key, emitter] : null;
      })
      .filter((entry): entry is [string, ParsedAuroraMdlEmitter] => Boolean(entry))
  );

  referenceNodes.forEach((referenceNode) => {
    const parentKey = normalizeAuroraNodeLookupName(referenceNode.parentNodeName);
    const targetEmitter =
      (parentKey ? emittersByName.get(parentKey) : undefined) ??
      (emitters.length === 1 ? emitters[0] : undefined);
    if (!targetEmitter) {
      return;
    }
    targetEmitter.referenceNodes = [
      ...(targetEmitter.referenceNodes ?? []),
      referenceNode
    ];
  });

  return emitters;
}

function attachAuroraAnimationEventsToEmitters(
  emitters: ParsedAuroraMdlEmitter[],
  events: ParsedAuroraMdlEmitterAnimationEvent[]
): ParsedAuroraMdlEmitter[] {
  if (events.length === 0 || emitters.length === 0) {
    return emitters;
  }
  emitters.forEach((emitter) => {
    const mergedEvents = sanitizeAuroraEmitterAnimationEvents([
      ...(emitter.events ?? []),
      ...events
    ]);
    if (mergedEvents) {
      emitter.events = mergedEvents;
    }
  });
  return emitters;
}

function buildAuroraEmitterAnimationEvent(input: {
  time?: number;
  type?: string;
  animationName?: string;
}): ParsedAuroraMdlEmitterAnimationEvent | undefined {
  const time = sanitizeAuroraEmitterNonNegativeNumber(input.time);
  const type = sanitizeAuroraEmitterString(input.type);
  const animationName = sanitizeAuroraEmitterString(input.animationName);
  if (time === undefined || !type) {
    return undefined;
  }
  return {
    time,
    type,
    ...(animationName ? { animationName } : {})
  };
}

function sanitizeAuroraEmitterAnimationEvents(
  value: unknown
): ParsedAuroraMdlEmitterAnimationEvent[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const events = value
    .map((entry): ParsedAuroraMdlEmitterAnimationEvent | undefined => {
      if (typeof entry !== "object" || entry === null) {
        return undefined;
      }
      const candidate = entry as { time?: unknown; type?: unknown; animationName?: unknown };
      return buildAuroraEmitterAnimationEvent({
        time: typeof candidate.time === "number" ? candidate.time : undefined,
        type: typeof candidate.type === "string" ? candidate.type : undefined,
        animationName:
          typeof candidate.animationName === "string" ? candidate.animationName : undefined
      });
    })
    .filter((event): event is ParsedAuroraMdlEmitterAnimationEvent => Boolean(event))
    .sort((left, right) => left.time - right.time);
  return events.length > 0 ? events : undefined;
}

function stripAuroraAsciiLineComments(line: string): string {
  return line
    .replace(/\/\/.*$/u, "")
    .replace(/;.*$/u, "")
    .trim();
}

function readAuroraNumberList(value: string): number[] {
  return value
    .trim()
    .split(/[\s,]+/u)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));
}

function readAuroraAsciiNumberTimeline(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: ParsedAuroraMdlEmitterNumberKeyframe[]; endLineIndex: number } {
  const headerValues = readAuroraNumberList(rawValue);
  const declaredFrameCount = Math.max(0, Math.trunc(headerValues[0] ?? 0));
  const frames: ParsedAuroraMdlEmitterNumberKeyframe[] = [];

  const appendFrameValues = (values: number[]): void => {
    if (values.length < 2) {
      return;
    }
    frames.push({
      time: values[0]!,
      value: values[1]!
    });
  };

  for (let index = 1; index + 1 < headerValues.length; index += 2) {
    appendFrameValues([headerValues[index]!, headerValues[index + 1]!]);
  }

  let lineIndex = keyLineIndex;
  while (
    frames.length < declaredFrameCount &&
    lineIndex + 1 < lines.length
  ) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    const values = readAuroraNumberList(candidate);
    if (values.length < 2) {
      lineIndex -= 1;
      break;
    }
    appendFrameValues(values);
  }

  return {
    frames,
    endLineIndex: lineIndex
  };
}

function readAuroraAsciiColorTimeline(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: ParsedAuroraMdlEmitterColorKeyframe[]; endLineIndex: number } {
  const headerValues = readAuroraNumberList(rawValue);
  const declaredFrameCount = Math.max(0, Math.trunc(headerValues[0] ?? 0));
  const frames: ParsedAuroraMdlEmitterColorKeyframe[] = [];

  const appendFrameValues = (values: number[]): void => {
    if (values.length < 4) {
      return;
    }
    frames.push({
      time: values[0]!,
      value: [values[1]!, values[2]!, values[3]!]
    });
  };

  for (let index = 1; index + 3 < headerValues.length; index += 4) {
    appendFrameValues([
      headerValues[index]!,
      headerValues[index + 1]!,
      headerValues[index + 2]!,
      headerValues[index + 3]!
    ]);
  }

  let lineIndex = keyLineIndex;
  while (
    frames.length < declaredFrameCount &&
    lineIndex + 1 < lines.length
  ) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    const values = readAuroraNumberList(candidate);
    if (values.length < 4) {
      lineIndex -= 1;
      break;
    }
    appendFrameValues(values);
  }

  return {
    frames,
    endLineIndex: lineIndex
  };
}

function readAuroraAsciiStringListUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { values: string[]; endLineIndex: number } {
  const parts = rawValue.trim().split(/\s+/u).filter((part) => part.length > 0);
  const declaredCount = Math.max(0, Math.trunc(Number.parseFloat(parts[0] ?? "0")));
  const values: string[] = [];
  parts.slice(1).forEach((part) => {
    const normalized = normalizeModelTextureReference(part);
    if (normalized) {
      values.push(normalized);
    }
  });

  let lineIndex = keyLineIndex;
  while ((declaredCount === 0 || values.length < declaredCount) && lineIndex + 1 < lines.length) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    if (/^endlist\b/iu.test(candidate)) {
      break;
    }
    candidate.split(/\s+/u).forEach((part) => {
      const normalized = normalizeModelTextureReference(part);
      if (normalized) {
        values.push(normalized);
      }
    });
  }

  return {
    values: declaredCount > 0 ? values.slice(0, declaredCount) : values,
    endLineIndex: lineIndex
  };
}

function readAuroraAsciiNumberListUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { values: number[]; endLineIndex: number } {
  const headerValues = readAuroraNumberList(rawValue);
  const declaredCount = Math.max(0, Math.trunc(headerValues[0] ?? 0));
  const values = headerValues.slice(1);

  let lineIndex = keyLineIndex;
  while ((declaredCount === 0 || values.length < declaredCount) && lineIndex + 1 < lines.length) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    if (/^endlist\b/iu.test(candidate)) {
      break;
    }
    values.push(...readAuroraNumberList(candidate));
  }

  return {
    values: declaredCount > 0 ? values.slice(0, declaredCount) : values,
    endLineIndex: lineIndex
  };
}

function readAuroraAsciiVector3ListUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { values: [number, number, number][]; endLineIndex: number } {
  const headerValues = readAuroraNumberList(rawValue);
  const declaredCount = Math.max(0, Math.trunc(headerValues[0] ?? 0));
  const numbers = headerValues.slice(1);
  let lineIndex = keyLineIndex;
  while (
    (declaredCount === 0 || numbers.length < declaredCount * 3) &&
    lineIndex + 1 < lines.length
  ) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    if (/^endlist\b/iu.test(candidate)) {
      break;
    }
    numbers.push(...readAuroraNumberList(candidate));
  }

  const values: [number, number, number][] = [];
  for (let index = 0; index + 2 < numbers.length; index += 3) {
    const vector = sanitizeAuroraEmitterColor([
      numbers[index],
      numbers[index + 1],
      numbers[index + 2]
    ]);
    if (vector) {
      values.push(vector);
    }
  }
  return {
    values: declaredCount > 0 ? values.slice(0, declaredCount) : values,
    endLineIndex: lineIndex
  };
}

function readAuroraAsciiKeyframeRowsUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string,
  columnCount: number
): { rows: number[][]; endLineIndex: number } {
  const headerValues = readAuroraNumberList(rawValue);
  const declaredFrameCount =
    headerValues.length > 0 && headerValues.length % columnCount !== 0
      ? Math.max(0, Math.trunc(headerValues[0] ?? 0))
      : undefined;
  const startIndex = declaredFrameCount === undefined ? 0 : 1;
  const rows: number[][] = [];
  const appendChunks = (values: number[], start = 0): void => {
    for (let index = start; index + columnCount - 1 < values.length; index += columnCount) {
      rows.push(values.slice(index, index + columnCount));
    }
  };

  appendChunks(headerValues, startIndex);

  let lineIndex = keyLineIndex;
  while (
    lineIndex + 1 < lines.length &&
    (declaredFrameCount === undefined || rows.length < declaredFrameCount)
  ) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    if (/^endlist\b/iu.test(candidate)) {
      break;
    }
    const values = readAuroraNumberList(candidate);
    if (values.length < columnCount) {
      lineIndex -= 1;
      break;
    }
    appendChunks(values);
  }

  return {
    rows,
    endLineIndex: lineIndex
  };
}

function readAuroraAsciiNumberKeyframesUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: ParsedAuroraMdlLightNumberKeyframe[]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRowsUntilEndList(lines, keyLineIndex, rawValue, 2);
  const frames = parsed.rows
    .map((row): ParsedAuroraMdlLightNumberKeyframe | null => {
      const time = sanitizeAuroraEmitterNonNegativeNumber(row[0]);
      const value = sanitizeAuroraEmitterFiniteNumber(row[1]);
      return time !== undefined && value !== undefined ? { time, value } : null;
    })
    .filter((frame): frame is ParsedAuroraMdlLightNumberKeyframe => frame !== null);
  return {
    frames,
    endLineIndex: parsed.endLineIndex
  };
}

function readAuroraAsciiColorKeyframesUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: ParsedAuroraMdlLightColorKeyframe[]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRowsUntilEndList(lines, keyLineIndex, rawValue, 4);
  const frames = parsed.rows
    .map((row): ParsedAuroraMdlLightColorKeyframe | null => {
      const time = sanitizeAuroraEmitterNonNegativeNumber(row[0]);
      const color = sanitizeAuroraEmitterColor([row[1], row[2], row[3]]);
      return time !== undefined && color ? { time, value: color } : null;
    })
    .filter((frame): frame is ParsedAuroraMdlLightColorKeyframe => frame !== null);
  return {
    frames,
    endLineIndex: parsed.endLineIndex
  };
}

function readAuroraAsciiVector3KeyframesUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: ParsedAuroraMdlLightVector3Keyframe[]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRowsUntilEndList(lines, keyLineIndex, rawValue, 4);
  const frames = parsed.rows
    .map((row): ParsedAuroraMdlLightVector3Keyframe | null => {
      const time = sanitizeAuroraEmitterNonNegativeNumber(row[0]);
      const vector = sanitizeAuroraEmitterColor([row[1], row[2], row[3]]);
      return time !== undefined && vector ? { time, value: vector } : null;
    })
    .filter((frame): frame is ParsedAuroraMdlLightVector3Keyframe => frame !== null);
  return {
    frames,
    endLineIndex: parsed.endLineIndex
  };
}

function toAuroraEmitterSimulationNumberKey(
  key: string
):
  | "birthrate"
  | "xSize"
  | "ySize"
  | "spawnType"
  | "lifeExp"
  | "mass"
  | "velocity"
  | "randvel"
  | "spread"
  | "particleRot"
  | "bounceCoefficient"
  | "blastRadius"
  | "blastLength"
  | "blurLength"
  | "detonate"
  | "fps"
  | "frameStart"
  | "frameEnd"
  | "lightningScale"
  | "lightningDelay"
  | "lightningRadius"
  | "deadspace"
  | "p2pBezier2"
  | "p2pBezier3"
  | "p2pSource"
  | "p2pTarget"
  | "combineTime"
  | "grav"
  | "drag"
  | "threshold"
  | "sizeStart"
  | "sizeMid"
  | "sizeEnd"
  | "sizeStartY"
  | "sizeMidY"
  | "sizeEndY"
  | "percentStart"
  | "percentMid"
  | "percentEnd"
  | "alphaStart"
  | "alphaMid"
  | "alphaEnd"
  | undefined {
  switch (key) {
    case "xsize":
    case "x_size":
      return "xSize";
    case "ysize":
    case "y_size":
      return "ySize";
    case "spawntype":
    case "spawn_type":
      return "spawnType";
    case "birthrate":
      return "birthrate";
    case "lifeexp":
    case "life_exp":
      return "lifeExp";
    case "mass":
      return "mass";
    case "velocity":
      return "velocity";
    case "randvel":
    case "rand_vel":
      return "randvel";
    case "spread":
      return "spread";
    case "particlerot":
    case "particle_rot":
      return "particleRot";
    case "bounceco":
    case "bounce_co":
      return "bounceCoefficient";
    case "blastradius":
    case "blast_radius":
      return "blastRadius";
    case "blastlength":
    case "blast_length":
      return "blastLength";
    case "blurlength":
    case "blur_length":
      return "blurLength";
    case "detonate":
      return "detonate";
    case "fps":
      return "fps";
    case "framestart":
    case "frame_start":
      return "frameStart";
    case "frameend":
    case "frame_end":
      return "frameEnd";
    case "lightningscale":
    case "lightning_scale":
      return "lightningScale";
    case "lightningdelay":
    case "lightning_delay":
      return "lightningDelay";
    case "lightningradius":
    case "lightning_radius":
      return "lightningRadius";
    case "deadspace":
    case "dead_space":
      return "deadspace";
    case "p2pbezier2":
    case "p2p_bezier2":
      return "p2pBezier2";
    case "p2pbezier3":
    case "p2p_bezier3":
      return "p2pBezier3";
    case "src":
    case "p2psrc":
    case "p2p_src":
      return "p2pSource";
    case "target":
    case "p2ptarget":
    case "p2p_target":
      return "p2pTarget";
    case "combinetime":
    case "combine_time":
      return "combineTime";
    case "grav":
      return "grav";
    case "drag":
      return "drag";
    case "threshold":
      return "threshold";
    case "sizestart":
    case "size_start":
      return "sizeStart";
    case "sizemid":
    case "size_mid":
      return "sizeMid";
    case "sizeend":
    case "size_end":
      return "sizeEnd";
    case "sizestart_y":
    case "size_start_y":
      return "sizeStartY";
    case "sizemid_y":
    case "size_mid_y":
      return "sizeMidY";
    case "sizeend_y":
    case "size_end_y":
      return "sizeEndY";
    case "percentstart":
    case "percent_start":
      return "percentStart";
    case "percentmid":
    case "percent_mid":
      return "percentMid";
    case "percentend":
    case "percent_end":
      return "percentEnd";
    case "alphastart":
    case "alpha_start":
      return "alphaStart";
    case "alphamid":
    case "alpha_mid":
      return "alphaMid";
    case "alphaend":
    case "alpha_end":
      return "alphaEnd";
    default:
      return undefined;
  }
}

function toAuroraEmitterSimulationTimelineKey(
  key: string
): ParsedAuroraMdlEmitterSimulationTimelineKey | undefined {
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/gu, "_");
  const withoutSuffix = normalized.endsWith("bezierkey")
    ? normalized.slice(0, -"bezierkey".length)
    : normalized.endsWith("key")
      ? normalized.slice(0, -"key".length)
      : undefined;
  if (!withoutSuffix) {
    return undefined;
  }
  const simulationKey = toAuroraEmitterSimulationNumberKey(withoutSuffix);
  return isAuroraEmitterSimulationTimelineKey(simulationKey)
    ? simulationKey
    : undefined;
}

function toAuroraEmitterSimulationColorTimelineKey(
  key: string
): ParsedAuroraMdlEmitterColorTimelineKey | undefined {
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/gu, "_");
  const withoutSuffix = normalized.endsWith("bezierkey")
    ? normalized.slice(0, -"bezierkey".length)
    : normalized.endsWith("key")
      ? normalized.slice(0, -"key".length)
      : undefined;
  if (!withoutSuffix) {
    return undefined;
  }
  return toAuroraEmitterSimulationColorKey(withoutSuffix);
}

function toAuroraEmitterSimulationBooleanKey(
  key: string
):
  | "bounce"
  | "p2p"
  | "inherit"
  | "inheritVel"
  | "inheritLocal"
  | "inheritPart"
  | "affectedByWind"
  | undefined {
  switch (key) {
    case "bounce":
      return "bounce";
    case "p2p":
      return "p2p";
    case "inherit":
      return "inherit";
    case "inheritvel":
    case "inherit_vel":
      return "inheritVel";
    case "inheritlocal":
    case "inherit_local":
      return "inheritLocal";
    case "inheritpart":
    case "inherit_part":
      return "inheritPart";
    case "affectedbywind":
    case "affected_by_wind":
      return "affectedByWind";
    default:
      return undefined;
  }
}

function toAuroraEmitterSimulationStringKey(key: string): "p2pType" | undefined {
  switch (key) {
    case "p2psel":
    case "p2p_sel":
      return "p2pType";
    default:
      return undefined;
  }
}

function toAuroraEmitterSimulationColorKey(
  key: string
): "colorStart" | "colorMid" | "colorEnd" | undefined {
  switch (key) {
    case "colorstart":
    case "color_start":
      return "colorStart";
    case "colormid":
    case "color_mid":
      return "colorMid";
    case "colorend":
    case "color_end":
      return "colorEnd";
    default:
      return undefined;
  }
}

function setAuroraEmitterSimulationDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: keyof NonNullable<ParsedAuroraMdlEmitter["simulation"]>,
  value: number | boolean | string | [number, number, number] | undefined
): void {
  if (value === undefined) {
    return;
  }
  const simulation = buildAuroraEmitterSimulation({
    ...emitter.simulation,
    [key]: value
  });
  if (simulation) {
    emitter.simulation = simulation;
  }
}

function setAuroraEmitterSimulationTimelineDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: ParsedAuroraMdlEmitterSimulationTimelineKey,
  frames: ParsedAuroraMdlEmitterNumberKeyframe[]
): void {
  const simulation = buildAuroraEmitterSimulation({
    ...emitter.simulation,
    timeline: {
      ...emitter.simulation?.timeline,
      [key]: frames
    }
  });
  if (simulation) {
    emitter.simulation = simulation;
  }
}

function setAuroraEmitterSimulationColorTimelineDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: ParsedAuroraMdlEmitterColorTimelineKey,
  frames: ParsedAuroraMdlEmitterColorKeyframe[]
): void {
  const simulation = buildAuroraEmitterSimulation({
    ...emitter.simulation,
    colorTimeline: {
      ...emitter.simulation?.colorTimeline,
      [key]: frames
    }
  });
  if (simulation) {
    emitter.simulation = simulation;
  }
}

function buildAuroraEmitterSimulation(
  input: NonNullable<ParsedAuroraMdlEmitter["simulation"]>
): ParsedAuroraMdlEmitter["simulation"] {
  const xSize = sanitizeAuroraEmitterNonNegativeNumber(input.xSize);
  const ySize = sanitizeAuroraEmitterNonNegativeNumber(input.ySize);
  const spawnType = sanitizeAuroraEmitterNonNegativeInteger(input.spawnType);
  const birthrate = sanitizeAuroraEmitterNonNegativeNumber(input.birthrate);
  const lifeExp = sanitizeAuroraEmitterNonNegativeNumber(input.lifeExp);
  const mass = sanitizeAuroraEmitterFiniteNumber(input.mass);
  const velocity = sanitizeAuroraEmitterFiniteNumber(input.velocity);
  const randvel = sanitizeAuroraEmitterNonNegativeNumber(input.randvel);
  const spread = sanitizeAuroraEmitterNonNegativeNumber(input.spread);
  const particleRot = sanitizeAuroraEmitterFiniteNumber(input.particleRot);
  const bounce = sanitizeAuroraEmitterBoolean(input.bounce);
  const bounceCoefficient = sanitizeAuroraEmitterFiniteNumber(input.bounceCoefficient);
  const blastRadius = sanitizeAuroraEmitterNonNegativeNumber(input.blastRadius);
  const blastLength = sanitizeAuroraEmitterNonNegativeNumber(input.blastLength);
  const blurLength = sanitizeAuroraEmitterNonNegativeNumber(input.blurLength);
  const detonate = sanitizeAuroraEmitterNonNegativeNumber(input.detonate);
  const fps = sanitizeAuroraEmitterNonNegativeNumber(input.fps);
  const frameStart = sanitizeAuroraEmitterNonNegativeNumber(input.frameStart);
  const frameEnd = sanitizeAuroraEmitterNonNegativeNumber(input.frameEnd);
  const lightningScale = sanitizeAuroraEmitterNonNegativeNumber(input.lightningScale);
  const lightningDelay = sanitizeAuroraEmitterNonNegativeNumber(input.lightningDelay);
  const lightningRadius = sanitizeAuroraEmitterNonNegativeNumber(input.lightningRadius);
  const deadspace = sanitizeAuroraEmitterFiniteNumber(input.deadspace);
  const p2p = sanitizeAuroraEmitterBoolean(input.p2p);
  const p2pType = sanitizeAuroraEmitterString(input.p2pType);
  const p2pBezier2 = sanitizeAuroraEmitterNonNegativeNumber(input.p2pBezier2);
  const p2pBezier3 = sanitizeAuroraEmitterNonNegativeNumber(input.p2pBezier3);
  const p2pSource = sanitizeAuroraEmitterNonNegativeNumber(input.p2pSource);
  const p2pTarget = sanitizeAuroraEmitterNonNegativeNumber(input.p2pTarget);
  const combineTime = sanitizeAuroraEmitterNonNegativeNumber(input.combineTime);
  const grav = sanitizeAuroraEmitterFiniteNumber(input.grav);
  const drag = sanitizeAuroraEmitterFiniteNumber(input.drag);
  const threshold = sanitizeAuroraEmitterNonNegativeNumber(input.threshold);
  const inherit = sanitizeAuroraEmitterBoolean(input.inherit);
  const inheritVel = sanitizeAuroraEmitterBoolean(input.inheritVel);
  const inheritLocal = sanitizeAuroraEmitterBoolean(input.inheritLocal);
  const inheritPart = sanitizeAuroraEmitterBoolean(input.inheritPart);
  const affectedByWind = sanitizeAuroraEmitterBoolean(input.affectedByWind);
  const sizeStart = sanitizeAuroraEmitterNonNegativeNumber(input.sizeStart);
  const sizeMid = sanitizeAuroraEmitterNonNegativeNumber(input.sizeMid);
  const sizeEnd = sanitizeAuroraEmitterNonNegativeNumber(input.sizeEnd);
  const sizeStartY = sanitizeAuroraEmitterNonNegativeNumber(input.sizeStartY);
  const sizeMidY = sanitizeAuroraEmitterNonNegativeNumber(input.sizeMidY);
  const sizeEndY = sanitizeAuroraEmitterNonNegativeNumber(input.sizeEndY);
  const alphaStart = sanitizeAuroraEmitterNonNegativeNumber(input.alphaStart);
  const alphaMid = sanitizeAuroraEmitterNonNegativeNumber(input.alphaMid);
  const alphaEnd = sanitizeAuroraEmitterNonNegativeNumber(input.alphaEnd);
  const colorStart = sanitizeAuroraEmitterColor(input.colorStart);
  const colorMid = sanitizeAuroraEmitterColor(input.colorMid);
  const colorEnd = sanitizeAuroraEmitterColor(input.colorEnd);
  const percentStart = sanitizeAuroraEmitterNonNegativeNumber(input.percentStart);
  const percentMid = sanitizeAuroraEmitterNonNegativeNumber(input.percentMid);
  const percentEnd = sanitizeAuroraEmitterNonNegativeNumber(input.percentEnd);
  const timeline = sanitizeAuroraEmitterSimulationTimeline(input.timeline);
  const colorTimeline = sanitizeAuroraEmitterColorTimeline(input.colorTimeline);
  if (
    xSize === undefined &&
    ySize === undefined &&
    spawnType === undefined &&
    birthrate === undefined &&
    lifeExp === undefined &&
    mass === undefined &&
    velocity === undefined &&
    randvel === undefined &&
    spread === undefined &&
    particleRot === undefined &&
    bounce === undefined &&
    bounceCoefficient === undefined &&
    blastRadius === undefined &&
    blastLength === undefined &&
    blurLength === undefined &&
    detonate === undefined &&
    fps === undefined &&
    frameStart === undefined &&
    frameEnd === undefined &&
    lightningScale === undefined &&
    lightningDelay === undefined &&
    lightningRadius === undefined &&
    deadspace === undefined &&
    p2p === undefined &&
    p2pType === undefined &&
    p2pBezier2 === undefined &&
    p2pBezier3 === undefined &&
    p2pSource === undefined &&
    p2pTarget === undefined &&
    combineTime === undefined &&
    grav === undefined &&
    drag === undefined &&
    threshold === undefined &&
    inherit === undefined &&
    inheritVel === undefined &&
    inheritLocal === undefined &&
    inheritPart === undefined &&
    affectedByWind === undefined &&
    sizeStart === undefined &&
    sizeMid === undefined &&
    sizeEnd === undefined &&
    sizeStartY === undefined &&
    sizeMidY === undefined &&
    sizeEndY === undefined &&
    alphaStart === undefined &&
    alphaMid === undefined &&
    alphaEnd === undefined &&
    colorStart === undefined &&
    colorMid === undefined &&
    colorEnd === undefined &&
    percentStart === undefined &&
    percentMid === undefined &&
    percentEnd === undefined &&
    timeline === undefined &&
    colorTimeline === undefined
  ) {
    return undefined;
  }

  return {
    ...(xSize !== undefined ? { xSize } : {}),
    ...(ySize !== undefined ? { ySize } : {}),
    ...(spawnType !== undefined ? { spawnType } : {}),
    ...(birthrate !== undefined ? { birthrate } : {}),
    ...(lifeExp !== undefined ? { lifeExp } : {}),
    ...(mass !== undefined ? { mass } : {}),
    ...(velocity !== undefined ? { velocity } : {}),
    ...(randvel !== undefined ? { randvel } : {}),
    ...(spread !== undefined ? { spread } : {}),
    ...(particleRot !== undefined ? { particleRot } : {}),
    ...(bounce !== undefined ? { bounce } : {}),
    ...(bounceCoefficient !== undefined ? { bounceCoefficient } : {}),
    ...(blastRadius !== undefined ? { blastRadius } : {}),
    ...(blastLength !== undefined ? { blastLength } : {}),
    ...(blurLength !== undefined ? { blurLength } : {}),
    ...(detonate !== undefined ? { detonate } : {}),
    ...(fps !== undefined ? { fps } : {}),
    ...(frameStart !== undefined ? { frameStart } : {}),
    ...(frameEnd !== undefined ? { frameEnd } : {}),
    ...(lightningScale !== undefined ? { lightningScale } : {}),
    ...(lightningDelay !== undefined ? { lightningDelay } : {}),
    ...(lightningRadius !== undefined ? { lightningRadius } : {}),
    ...(deadspace !== undefined ? { deadspace } : {}),
    ...(p2p !== undefined ? { p2p } : {}),
    ...(p2pType !== undefined ? { p2pType } : {}),
    ...(p2pBezier2 !== undefined ? { p2pBezier2 } : {}),
    ...(p2pBezier3 !== undefined ? { p2pBezier3 } : {}),
    ...(p2pSource !== undefined ? { p2pSource } : {}),
    ...(p2pTarget !== undefined ? { p2pTarget } : {}),
    ...(combineTime !== undefined ? { combineTime } : {}),
    ...(grav !== undefined ? { grav } : {}),
    ...(drag !== undefined ? { drag } : {}),
    ...(threshold !== undefined ? { threshold } : {}),
    ...(inherit !== undefined ? { inherit } : {}),
    ...(inheritVel !== undefined ? { inheritVel } : {}),
    ...(inheritLocal !== undefined ? { inheritLocal } : {}),
    ...(inheritPart !== undefined ? { inheritPart } : {}),
    ...(affectedByWind !== undefined ? { affectedByWind } : {}),
    ...(sizeStart !== undefined ? { sizeStart } : {}),
    ...(sizeMid !== undefined ? { sizeMid } : {}),
    ...(sizeEnd !== undefined ? { sizeEnd } : {}),
    ...(sizeStartY !== undefined ? { sizeStartY } : {}),
    ...(sizeMidY !== undefined ? { sizeMidY } : {}),
    ...(sizeEndY !== undefined ? { sizeEndY } : {}),
    ...(alphaStart !== undefined ? { alphaStart } : {}),
    ...(alphaMid !== undefined ? { alphaMid } : {}),
    ...(alphaEnd !== undefined ? { alphaEnd } : {}),
    ...(colorStart !== undefined ? { colorStart } : {}),
    ...(colorMid !== undefined ? { colorMid } : {}),
    ...(colorEnd !== undefined ? { colorEnd } : {}),
    ...(percentStart !== undefined ? { percentStart } : {}),
    ...(percentMid !== undefined ? { percentMid } : {}),
    ...(percentEnd !== undefined ? { percentEnd } : {}),
    ...(timeline !== undefined ? { timeline } : {}),
    ...(colorTimeline !== undefined ? { colorTimeline } : {})
  };
}

function sanitizeAuroraEmitterFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sanitizeAuroraEmitterNonNegativeNumber(value: unknown): number | undefined {
  const finite = sanitizeAuroraEmitterFiniteNumber(value);
  return finite !== undefined && finite >= 0 ? finite : undefined;
}

function sanitizeAuroraEmitterNonNegativeInteger(value: unknown): number | undefined {
  const nonNegative = sanitizeAuroraEmitterNonNegativeNumber(value);
  return nonNegative !== undefined ? Math.trunc(nonNegative) : undefined;
}

function sanitizeAuroraEmitterBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function sanitizeAuroraEmitterString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function sanitizeAuroraEmitterColor(
  value: unknown
): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 3) {
    return undefined;
  }
  const [red, green, blue] = value;
  if (
    typeof red !== "number" ||
    typeof green !== "number" ||
    typeof blue !== "number" ||
    !Number.isFinite(red) ||
    !Number.isFinite(green) ||
    !Number.isFinite(blue)
  ) {
    return undefined;
  }
  return [red, green, blue];
}

function sanitizeAuroraEmitterNumberKeyframes(
  value: unknown,
  options: { nonNegativeValue?: boolean } = {}
): ParsedAuroraMdlEmitterNumberKeyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const frames = value
    .map((entry): ParsedAuroraMdlEmitterNumberKeyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      if (
        typeof candidate.time !== "number" ||
        typeof candidate.value !== "number" ||
        !Number.isFinite(candidate.time) ||
        !Number.isFinite(candidate.value) ||
        candidate.time < 0 ||
        (options.nonNegativeValue === true && candidate.value < 0)
      ) {
        return null;
      }
      return {
        time: candidate.time,
        value: candidate.value
      };
    })
    .filter((frame): frame is ParsedAuroraMdlEmitterNumberKeyframe => frame !== null)
    .sort((left, right) => left.time - right.time);

  const uniqueFrames: ParsedAuroraMdlEmitterNumberKeyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({ ...frame });
  });

  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function sanitizeAuroraEmitterSimulationTimeline(
  value: unknown
): ParsedAuroraMdlEmitterSimulationTimeline | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const source = value as Partial<Record<keyof ParsedAuroraMdlEmitterSimulationTimeline, unknown>>;
  const timeline: ParsedAuroraMdlEmitterSimulationTimeline = {};
  AURORA_EMITTER_SIMULATION_TIMELINE_KEYS.forEach((key) => {
    const frames = sanitizeAuroraEmitterNumberKeyframes(source[key], {
      nonNegativeValue: AURORA_EMITTER_SIMULATION_NON_NEGATIVE_TIMELINE_KEYS.has(key)
    });
    if (frames) {
      timeline[key] = frames;
    }
  });
  return Object.keys(timeline).length > 0 ? timeline : undefined;
}

function sanitizeAuroraEmitterColorKeyframes(
  value: unknown
): ParsedAuroraMdlEmitterColorKeyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const frames = value
    .map((entry): ParsedAuroraMdlEmitterColorKeyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      const color = sanitizeAuroraEmitterColor(candidate.value);
      if (
        typeof candidate.time !== "number" ||
        !Number.isFinite(candidate.time) ||
        candidate.time < 0 ||
        !color
      ) {
        return null;
      }
      return {
        time: candidate.time,
        value: color
      };
    })
    .filter((frame): frame is ParsedAuroraMdlEmitterColorKeyframe => frame !== null)
    .sort((left, right) => left.time - right.time);

  const uniqueFrames: ParsedAuroraMdlEmitterColorKeyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({ time: frame.time, value: [...frame.value] });
  });

  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function sanitizeAuroraEmitterColorTimeline(
  value: unknown
): ParsedAuroraMdlEmitterColorTimeline | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const source = value as Partial<Record<ParsedAuroraMdlEmitterColorTimelineKey, unknown>>;
  const timeline: ParsedAuroraMdlEmitterColorTimeline = {};
  (["colorStart", "colorMid", "colorEnd"] as const).forEach((key) => {
    const frames = sanitizeAuroraEmitterColorKeyframes(source[key]);
    if (frames) {
      timeline[key] = frames;
    }
  });
  return Object.keys(timeline).length > 0 ? timeline : undefined;
}

function setAuroraEmitterSourceStateDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: keyof NonNullable<ParsedAuroraMdlEmitter["sourceState"]>,
  value: number | boolean | string | undefined
): void {
  if (value === undefined) {
    return;
  }
  const sourceState = buildAuroraEmitterSourceState({
    ...emitter.sourceState,
    [key]: value
  });
  if (sourceState) {
    emitter.sourceState = sourceState;
  }
}

function buildAuroraEmitterSourceState(
  input: NonNullable<ParsedAuroraMdlEmitter["sourceState"]>
): ParsedAuroraMdlEmitter["sourceState"] {
  const renderOrder =
    typeof input.renderOrder === "number" && Number.isFinite(input.renderOrder)
      ? Math.trunc(input.renderOrder)
      : undefined;
  const renderHintRaw =
    typeof input.renderHintRaw === "string" && input.renderHintRaw.trim()
      ? input.renderHintRaw.trim()
      : undefined;
  const renderHintMode =
    typeof input.renderHintMode === "number" && Number.isFinite(input.renderHintMode)
      ? sanitizeAuroraRenderHintMode(input.renderHintMode)
      : renderHintRaw
        ? resolveAuroraRenderHintMode(renderHintRaw)
        : undefined;
  const customShaderVS = sanitizeAuroraEmitterString(input.customShaderVS);
  const customShaderFS = sanitizeAuroraEmitterString(input.customShaderFS);
  const customShaderGS = sanitizeAuroraEmitterString(input.customShaderGS);
  const transparency = typeof input.transparency === "boolean" ? input.transparency : undefined;
  const twoSidedMaterial =
    typeof input.twoSidedMaterial === "boolean" ? input.twoSidedMaterial : undefined;
  const twoSidedTexture =
    typeof input.twoSidedTexture === "boolean" ? input.twoSidedTexture : undefined;
  const sampleFramebuffer = sanitizeAuroraSampleFramebufferValue(input.sampleFramebuffer);
  const volumetric = typeof input.volumetric === "boolean" ? input.volumetric : undefined;
  const loop = typeof input.loop === "boolean" ? input.loop : undefined;
  const isTinted = typeof input.isTinted === "boolean" ? input.isTinted : undefined;
  const splat = typeof input.splat === "boolean" ? input.splat : undefined;
  const rotateTexture =
    typeof input.rotateTexture === "boolean" ? input.rotateTexture : undefined;
  if (
    renderOrder === undefined &&
    renderHintRaw === undefined &&
    renderHintMode === undefined &&
    customShaderVS === undefined &&
    customShaderFS === undefined &&
    customShaderGS === undefined &&
    transparency === undefined &&
    twoSidedMaterial === undefined &&
    twoSidedTexture === undefined &&
    sampleFramebuffer === undefined &&
    volumetric === undefined &&
    loop === undefined &&
    isTinted === undefined &&
    splat === undefined &&
    rotateTexture === undefined
  ) {
    return undefined;
  }

  return {
    ...(renderOrder !== undefined ? { renderOrder } : {}),
    ...(renderHintRaw !== undefined ? { renderHintRaw } : {}),
    ...(renderHintMode !== undefined ? { renderHintMode } : {}),
    ...(customShaderVS !== undefined ? { customShaderVS } : {}),
    ...(customShaderFS !== undefined ? { customShaderFS } : {}),
    ...(customShaderGS !== undefined ? { customShaderGS } : {}),
    ...(transparency !== undefined ? { transparency } : {}),
    ...(twoSidedMaterial !== undefined ? { twoSidedMaterial } : {}),
    ...(twoSidedTexture !== undefined ? { twoSidedTexture } : {}),
    ...(sampleFramebuffer !== undefined ? { sampleFramebuffer } : {}),
    ...(volumetric !== undefined ? { volumetric } : {}),
    ...(loop !== undefined ? { loop } : {}),
    ...(isTinted !== undefined ? { isTinted } : {}),
    ...(splat !== undefined ? { splat } : {}),
    ...(rotateTexture !== undefined ? { rotateTexture } : {})
  };
}

function resolveAuroraRenderHintMode(rawToken: string): 0 | 1 | 2 | 3 {
  const token = rawToken.trim().toLowerCase();
  if (token === "normalandspecmapped") {
    return 2;
  }
  if (token === "normaltangents") {
    return 3;
  }
  return 0;
}

function sanitizeAuroraRenderHintMode(value: number): 0 | 1 | 2 | 3 {
  const mode = Math.trunc(value);
  return mode === 1 || mode === 2 || mode === 3 ? mode : 0;
}

function setAuroraEmitterTransformDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: keyof NonNullable<ParsedAuroraMdlEmitter["transform"]>,
  value:
    | [number, number, number]
    | { axis: [number, number, number]; angleRadians: number }
    | undefined
): void {
  if (value === undefined) {
    return;
  }
  const transform = buildAuroraEmitterTransform({
    ...emitter.transform,
    [key]: value
  });
  if (transform) {
    emitter.transform = transform;
  }
}

function setAuroraLightTransformDraftValue(
  light: ParsedAuroraMdlLight,
  key: keyof NonNullable<ParsedAuroraMdlLight["transform"]>,
  value:
    | [number, number, number]
    | { axis: [number, number, number]; angleRadians: number }
    | undefined
): void {
  if (value === undefined) {
    return;
  }
  const transform = buildAuroraEmitterTransform({
    ...light.transform,
    [key]: value
  });
  if (transform) {
    light.transform = transform;
  }
}

function setAuroraReferenceTransformDraftValue(
  referenceNode: ParsedAuroraMdlReferenceNode,
  key: keyof NonNullable<ParsedAuroraMdlReferenceNode["transform"]>,
  value:
    | [number, number, number]
    | { axis: [number, number, number]; angleRadians: number }
    | undefined
): void {
  if (value === undefined) {
    return;
  }
  const transform = buildAuroraEmitterTransform({
    ...referenceNode.transform,
    [key]: value
  });
  if (transform) {
    referenceNode.transform = transform;
  }
}

function buildAuroraEmitterTransform(
  input: NonNullable<ParsedAuroraMdlEmitter["transform"]>
): ParsedAuroraMdlEmitter["transform"] {
  const position = sanitizeAuroraEmitterVector3(input.position);
  const orientation = sanitizeAuroraEmitterOrientation(input.orientation);
  if (position === undefined && orientation === undefined) {
    return undefined;
  }

  return {
    ...(position !== undefined ? { position } : {}),
    ...(orientation !== undefined ? { orientation } : {})
  };
}

function buildAuroraEmitterReferenceNode(
  input: ParsedAuroraMdlReferenceNode
): ParsedAuroraMdlReferenceNode | undefined {
  const nodeName = normalizeAuroraEmitterValue(input.nodeName);
  if (!nodeName) {
    return undefined;
  }
  const parentNodeName = normalizeAuroraEmitterValue(input.parentNodeName);
  const transform = input.transform ? buildAuroraEmitterTransform(input.transform) : undefined;
  return {
    nodeName,
    ...(parentNodeName ? { parentNodeName } : {}),
    ...(transform ? { transform } : {})
  };
}

function sanitizeAuroraEmitterVector3(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 3) {
    return undefined;
  }
  const [x, y, z] = value;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof z !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(z)
  ) {
    return undefined;
  }
  return [x, y, z];
}

function sanitizeAuroraEmitterOrientation(value: unknown):
  | {
      axis: [number, number, number];
      angleRadians: number;
    }
  | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = value as {
    axis?: unknown;
    angleRadians?: unknown;
  };
  const axis = sanitizeAuroraEmitterVector3(candidate.axis);
  const angleRadians = candidate.angleRadians;
  if (!axis || typeof angleRadians !== "number" || !Number.isFinite(angleRadians)) {
    return undefined;
  }
  const axisLengthSq = axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2];
  if (axisLengthSq <= 1e-12) {
    return undefined;
  }
  return {
    axis,
    angleRadians
  };
}

function setAuroraEmitterAtlasDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: "xGridRaw" | "yGridRaw" | "fps" | "frameStart" | "frameEnd" | "random",
  value: number | boolean | undefined
): void {
  if (value === undefined) {
    return;
  }
  const atlas = buildAuroraEmitterAtlas({
    ...emitter.atlas,
    [key]: value
  });
  if (atlas) {
    emitter.atlas = atlas;
  }
}

function buildAuroraEmitterAtlas(input: {
  xGridRaw?: number;
  yGridRaw?: number;
  fps?: number;
  frameStart?: number;
  frameEnd?: number;
  random?: boolean;
}): ParsedAuroraMdlEmitter["atlas"] {
  const xGridRaw = sanitizeAuroraAtlasInteger(input.xGridRaw);
  const yGridRaw = sanitizeAuroraAtlasInteger(input.yGridRaw);
  const fps = sanitizeAuroraAtlasNumber(input.fps);
  const frameStart = sanitizeAuroraAtlasInteger(input.frameStart);
  const frameEnd = sanitizeAuroraAtlasInteger(input.frameEnd);
  const random = typeof input.random === "boolean" ? input.random : undefined;
  if (
    xGridRaw === undefined &&
    yGridRaw === undefined &&
    fps === undefined &&
    frameStart === undefined &&
    frameEnd === undefined &&
    random === undefined
  ) {
    return undefined;
  }

  return {
    ...(xGridRaw !== undefined ? { xGridRaw } : {}),
    ...(yGridRaw !== undefined ? { yGridRaw } : {}),
    effectiveXGrid: xGridRaw && xGridRaw > 0 ? xGridRaw : 1,
    effectiveYGrid: yGridRaw && yGridRaw > 0 ? yGridRaw : 1,
    ...(fps !== undefined ? { fps } : {}),
    ...(frameStart !== undefined ? { frameStart } : {}),
    ...(frameEnd !== undefined ? { frameEnd } : {}),
    ...(random !== undefined ? { random } : {})
  };
}

function sanitizeAuroraAtlasInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.trunc(value));
}

function sanitizeAuroraAtlasNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value >= 0 ? value : undefined;
}

function readAuroraIntegerValue(value: string): number | undefined {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readAuroraNumberValue(value: string): number | undefined {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readAuroraVector3Value(value: string): [number, number, number] | undefined {
  const values = value
    .trim()
    .split(/[\s,]+/u)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));
  if (values.length < 3) {
    return undefined;
  }
  return [values[0]!, values[1]!, values[2]!];
}

function readAuroraOrientationValue(value: string):
  | {
      axis: [number, number, number];
      angleRadians: number;
    }
  | undefined {
  const values = value
    .trim()
    .split(/[\s,]+/u)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));
  if (values.length < 4) {
    return undefined;
  }
  return {
    axis: [values[0]!, values[1]!, values[2]!],
    angleRadians: values[3]!
  };
}

function readAuroraBooleanValue(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return undefined;
}

function readAuroraSampleFramebufferValue(value: string): number | undefined {
  const integerValue = readAuroraIntegerValue(value);
  if (integerValue !== undefined) {
    return integerValue;
  }
  const booleanValue = readAuroraBooleanValue(value);
  return booleanValue === undefined ? undefined : booleanValue ? 1 : 0;
}

function sanitizeAuroraSampleFramebufferValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string") {
    return readAuroraSampleFramebufferValue(value);
  }
  return undefined;
}

interface AuroraBinaryArrayHeader {
  offset: number;
  count: number;
}

interface AuroraBinaryControllerValue {
  type: number;
  rows: number;
  columns: number;
  values: number[];
  keyframes: number[][];
}

function resolveAuroraBinaryControllerScalarValue(
  controller: AuroraBinaryControllerValue
): number | undefined {
  if (controller.rows > 1 && controller.columns >= 2) {
    return controller.keyframes[0]?.[1];
  }
  return controller.values[0];
}

function buildAuroraBinaryControllerNumberTimeline(
  controller: AuroraBinaryControllerValue,
  options: { nonNegativeValue?: boolean; implicitDurationSeconds?: number } = {}
): ParsedAuroraMdlEmitterNumberKeyframe[] | undefined {
  if (controller.rows >= 2 && controller.columns >= 2) {
    return sanitizeAuroraEmitterNumberKeyframes(
      controller.keyframes.map((row) => ({
        time: row[0],
        value: row[1]
      })),
      options
    );
  }

  const duration = sanitizeAuroraEmitterNonNegativeNumber(options.implicitDurationSeconds);
  if (controller.rows < 2 || controller.columns !== 1 || duration === undefined) {
    return undefined;
  }

  return sanitizeAuroraEmitterNumberKeyframes(
    controller.keyframes.map((row, index) => ({
      time: controller.rows === 1 ? 0 : (duration * index) / (controller.rows - 1),
      value: row[0]
    })),
    options
  );
}

function buildAuroraBinaryControllerColorTimeline(
  controller: AuroraBinaryControllerValue
): ParsedAuroraMdlEmitterColorKeyframe[] | undefined {
  if (controller.rows < 2 || controller.columns < 4) {
    return undefined;
  }

  return sanitizeAuroraEmitterColorKeyframes(
    controller.keyframes
      .filter((row) => row.length >= 4)
      .map((row) => ({
        time: row[0]!,
        value: [row[1]!, row[2]!, row[3]!]
      }))
  );
}

function resolveAuroraBinaryControllerColorValue(
  controller: AuroraBinaryControllerValue
): [number, number, number] | undefined {
  const row = controller.keyframes[0] ?? controller.values;
  if (!row) {
    return undefined;
  }
  const offset = controller.rows > 1 && controller.columns >= 4 ? 1 : 0;
  if (row.length < offset + 3) {
    return undefined;
  }
  return sanitizeAuroraEmitterColor([
    row[offset]!,
    row[offset + 1]!,
    row[offset + 2]!
  ]);
}

function resolveAuroraBinaryEmitterSimulationTimelineKey(
  controllerType: number
): ParsedAuroraMdlEmitterSimulationTimelineKey | undefined {
  switch (controllerType) {
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_X:
      return "xSize";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_Y:
      return "ySize";
    case AURORA_BINARY_CONTROLLER_EMITTER_BIRTHRATE:
      return "birthrate";
    case AURORA_BINARY_CONTROLLER_EMITTER_LIFE_EXP:
      return "lifeExp";
    case AURORA_BINARY_CONTROLLER_EMITTER_MASS:
      return "mass";
    case AURORA_BINARY_CONTROLLER_EMITTER_VELOCITY:
      return "velocity";
    case AURORA_BINARY_CONTROLLER_EMITTER_RAND_VEL:
      return "randvel";
    case AURORA_BINARY_CONTROLLER_EMITTER_SPREAD:
      return "spread";
    case AURORA_BINARY_CONTROLLER_EMITTER_PARTICLE_ROT:
      return "particleRot";
    case AURORA_BINARY_CONTROLLER_EMITTER_BOUNCE_COEFFICIENT:
      return "bounceCoefficient";
    case AURORA_BINARY_CONTROLLER_EMITTER_BLUR_LENGTH:
      return "blurLength";
    case AURORA_BINARY_CONTROLLER_EMITTER_DETONATE:
      return "detonate";
    case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER2:
      return "p2pBezier2";
    case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER3:
      return "p2pBezier3";
    case AURORA_BINARY_CONTROLLER_EMITTER_COMBINE_TIME:
      return "combineTime";
    case AURORA_BINARY_CONTROLLER_EMITTER_GRAV:
      return "grav";
    case AURORA_BINARY_CONTROLLER_EMITTER_DRAG:
      return "drag";
    case AURORA_BINARY_CONTROLLER_EMITTER_THRESHOLD:
      return "threshold";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START:
      return "sizeStart";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID:
      return "sizeMid";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END:
      return "sizeEnd";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START_Y:
      return "sizeStartY";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID_Y:
      return "sizeMidY";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END_Y:
      return "sizeEndY";
    case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_START:
      return "percentStart";
    case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_MID:
      return "percentMid";
    case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_END:
      return "percentEnd";
    case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_START:
      return "alphaStart";
    case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_MID:
      return "alphaMid";
    case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_END:
      return "alphaEnd";
    default:
      return undefined;
  }
}

function readAuroraBinaryEmitterAtlas(
  bytes: Buffer,
  nodeAbsOffset: number
): ParsedAuroraMdlEmitter["atlas"] {
  const flags = readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_FLAGS_OFFSET) ?? 0;
  const atlasDraft: Parameters<typeof buildAuroraEmitterAtlas>[0] = {
    xGridRaw:
      readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_XGRID_OFFSET) ??
      undefined,
    yGridRaw:
      readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_YGRID_OFFSET) ??
      undefined,
    random: (flags & AURORA_BINARY_EMITTER_FLAG_RANDOM_ATLAS_FRAME) !== 0
  };

  collectAuroraBinaryControllerValues(bytes, nodeAbsOffset).forEach((controller) => {
    const value = controller.values[0];
    if (value === undefined) {
      return;
    }
    switch (controller.type) {
      case AURORA_BINARY_CONTROLLER_EMITTER_FPS:
        atlasDraft.fps = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_FRAME_START:
        atlasDraft.frameStart = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_FRAME_END:
        atlasDraft.frameEnd = value;
        break;
      default:
        break;
    }
  });

  return buildAuroraEmitterAtlas(atlasDraft);
}

function readAuroraBinaryEmitterSimulation(
  bytes: Buffer,
  nodeAbsOffset: number,
  options: {
    implicitTimelineDurationSeconds?: number;
  } = {}
): ParsedAuroraMdlEmitter["simulation"] {
  const flags = readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_FLAGS_OFFSET) ?? 0;
  const simulationDraft: NonNullable<ParsedAuroraMdlEmitter["simulation"]> = {
    spawnType:
      readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_SPAWN_TYPE_OFFSET) ??
      undefined,
    deadspace:
      readAuroraBinaryFloat32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_DEAD_SPACE_OFFSET) ??
      undefined,
    ...((flags & AURORA_BINARY_EMITTER_FLAG_BOUNCE) !== 0 ? { bounce: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_P2P) !== 0
      ? {
          p2p: true,
          p2pType:
            (flags & AURORA_BINARY_EMITTER_FLAG_P2P_BEZIER) !== 0 ? "bezier" : "gravity"
        }
      : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT) !== 0 ? { inherit: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT_VEL) !== 0 ? { inheritVel: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT_LOCAL) !== 0 ? { inheritLocal: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT_PART) !== 0 ? { inheritPart: true } : {}),
    affectedByWind: (flags & AURORA_BINARY_EMITTER_FLAG_AFFECTED_BY_WIND) !== 0
  };

  collectAuroraBinaryControllerValues(bytes, nodeAbsOffset).forEach((controller) => {
    const value = resolveAuroraBinaryControllerScalarValue(controller);
    switch (controller.type) {
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_X:
        simulationDraft.xSize = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_Y:
        simulationDraft.ySize = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_BIRTHRATE:
        simulationDraft.birthrate = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_LIFE_EXP:
        simulationDraft.lifeExp = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_MASS:
        simulationDraft.mass = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_VELOCITY:
        simulationDraft.velocity = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_RAND_VEL:
        simulationDraft.randvel = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SPREAD:
        simulationDraft.spread = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PARTICLE_ROT:
        simulationDraft.particleRot = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_BOUNCE_COEFFICIENT:
        simulationDraft.bounceCoefficient = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_BLUR_LENGTH:
        simulationDraft.blurLength = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_DETONATE:
        simulationDraft.detonate = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER2:
        simulationDraft.p2pBezier2 = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER3:
        simulationDraft.p2pBezier3 = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_COMBINE_TIME:
        simulationDraft.combineTime = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_GRAV:
        simulationDraft.grav = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_DRAG:
        simulationDraft.drag = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_THRESHOLD:
        simulationDraft.threshold = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START:
        simulationDraft.sizeStart = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID:
        simulationDraft.sizeMid = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END:
        simulationDraft.sizeEnd = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START_Y:
        simulationDraft.sizeStartY = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID_Y:
        simulationDraft.sizeMidY = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END_Y:
        simulationDraft.sizeEndY = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_START:
        simulationDraft.percentStart = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_MID:
        simulationDraft.percentMid = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_END:
        simulationDraft.percentEnd = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_START:
        simulationDraft.alphaStart = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_MID:
        simulationDraft.alphaMid = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_END:
        simulationDraft.alphaEnd = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_COLOR_START:
        {
          const color = resolveAuroraBinaryControllerColorValue(controller);
          if (color) {
            simulationDraft.colorStart = color;
          }
        }
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_COLOR_MID:
        {
          const color = resolveAuroraBinaryControllerColorValue(controller);
          if (color) {
            simulationDraft.colorMid = color;
          }
        }
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_COLOR_END:
        {
          const color = resolveAuroraBinaryControllerColorValue(controller);
          if (color) {
            simulationDraft.colorEnd = color;
          }
        }
        break;
      default:
        break;
    }
    const timelineKey = resolveAuroraBinaryEmitterSimulationTimelineKey(controller.type);
    if (timelineKey) {
      const timeline = buildAuroraBinaryControllerNumberTimeline(controller, {
        nonNegativeValue: AURORA_EMITTER_SIMULATION_NON_NEGATIVE_TIMELINE_KEYS.has(timelineKey),
        implicitDurationSeconds: options.implicitTimelineDurationSeconds
      });
      if (timeline) {
        simulationDraft.timeline = {
          ...simulationDraft.timeline,
          [timelineKey]: timeline
        };
      }
    }
    if (
      controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_START ||
      controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_MID ||
      controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_END
    ) {
      const colorTimeline = buildAuroraBinaryControllerColorTimeline(controller);
      if (colorTimeline) {
        simulationDraft.colorTimeline = {
          ...simulationDraft.colorTimeline,
          [controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_START
            ? "colorStart"
            : controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_MID
              ? "colorMid"
              : "colorEnd"]: colorTimeline
        };
      }
    }
  });

  return buildAuroraEmitterSimulation(simulationDraft);
}

function readAuroraBinaryEmitterTransform(
  bytes: Buffer,
  nodeAbsOffset: number
): ParsedAuroraMdlEmitter["transform"] {
  const transformDraft: NonNullable<ParsedAuroraMdlEmitter["transform"]> = {};
  collectAuroraBinaryControllerValues(bytes, nodeAbsOffset).forEach((controller) => {
    if (controller.type === AURORA_BINARY_CONTROLLER_POSITION && controller.values.length >= 3) {
      transformDraft.position = [
        controller.values[0]!,
        controller.values[1]!,
        controller.values[2]!
      ];
      return;
    }

    if (
      controller.type === AURORA_BINARY_CONTROLLER_ORIENTATION &&
      controller.values.length >= 4
    ) {
      const orientation = buildAuroraQuaternionOrientation([
        controller.values[0]!,
        controller.values[1]!,
        controller.values[2]!,
        controller.values[3]!
      ]);
      if (orientation) {
        transformDraft.orientation = orientation;
      }
    }
  });

  return buildAuroraEmitterTransform(transformDraft);
}

function readAuroraBinaryEmitterReferenceNodes(
  bytes: Buffer,
  emitterNodeAbsOffset: number,
  emitterNodeName: string
): ParsedAuroraMdlReferenceNode[] {
  const childrenOffset = readAuroraBinaryUInt32(
    bytes,
    emitterNodeAbsOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET
  );
  const childrenCount = readAuroraBinaryUInt32(
    bytes,
    emitterNodeAbsOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET + 4
  );
  if (childrenOffset === null || childrenCount === null || childrenCount === 0) {
    return [];
  }

  const references: ParsedAuroraMdlReferenceNode[] = [];
  for (let index = 0; index < childrenCount; index += 1) {
    const childPosition = AURORA_BINARY_MODEL_BASE + childrenOffset + index * 4;
    const childOffset = readAuroraBinaryUInt32(bytes, childPosition);
    if (childOffset === null) {
      continue;
    }
    const childAbsOffset = AURORA_BINARY_MODEL_BASE + childOffset;
    if (
      childAbsOffset < AURORA_BINARY_MODEL_BASE ||
      childAbsOffset + AURORA_BINARY_NODE_HEADER_SIZE > bytes.length
    ) {
      continue;
    }
    const flags = readAuroraBinaryUInt32(bytes, childAbsOffset + AURORA_BINARY_NODE_FLAGS_OFFSET);
    if (
      flags === null ||
      (flags & (AURORA_BINARY_NODE_FLAG_EMITTER | AURORA_BINARY_NODE_FLAG_MESH)) !== 0
    ) {
      continue;
    }
    const nodeName =
      normalizeAuroraEmitterValue(
        readAuroraBinaryCString(
          bytes,
          childAbsOffset + AURORA_BINARY_NODE_NAME_OFFSET,
          32
        )
      ) ?? `reference_${references.length + 1}`;
    const transform = readAuroraBinaryEmitterTransform(bytes, childAbsOffset);
    const referenceNode = buildAuroraEmitterReferenceNode({
      nodeName,
      parentNodeName: emitterNodeName,
      transform
    });
    if (referenceNode) {
      references.push(referenceNode);
    }
  }
  return references;
}

function collectAuroraBinaryControllerValues(
  bytes: Buffer,
  nodeAbsOffset: number
): AuroraBinaryControllerValue[] {
  const controllerKeys = readAuroraBinaryArrayHeader(
    bytes,
    nodeAbsOffset + AURORA_BINARY_NODE_CONTROLLER_KEYS_OFFSET
  );
  const controllerData = readAuroraBinaryArrayHeader(
    bytes,
    nodeAbsOffset + AURORA_BINARY_NODE_CONTROLLER_DATA_OFFSET
  );
  if (!controllerKeys || !controllerData || controllerKeys.count < 1 || controllerData.count < 1) {
    return [];
  }

  const controllers: AuroraBinaryControllerValue[] = [];
  const dataBase = AURORA_BINARY_MODEL_BASE + controllerData.offset;

  for (let index = 0; index < controllerKeys.count; index += 1) {
    const keyOffset =
      AURORA_BINARY_MODEL_BASE +
      controllerKeys.offset +
      index * AURORA_BINARY_CONTROLLER_RECORD_SIZE;
    if (keyOffset + AURORA_BINARY_CONTROLLER_RECORD_SIZE > bytes.length) {
      break;
    }

    const type = readAuroraBinaryUInt32(bytes, keyOffset);
    const rows = readAuroraBinaryUInt16(bytes, keyOffset + 4);
    const dataStart = readAuroraBinaryUInt16(bytes, keyOffset + 8);
    const columns = readAuroraBinaryUInt8(bytes, keyOffset + 10);
    if (
      type === null ||
      rows === null ||
      dataStart === null ||
      columns === null ||
      rows < 1 ||
      columns <= 0
    ) {
      continue;
    }

    const controllerValueCount = rows * columns;
    const valueOffset = dataBase + dataStart * 4;
    if (
      dataStart + controllerValueCount > controllerData.count ||
      valueOffset < AURORA_BINARY_MODEL_BASE ||
      valueOffset + controllerValueCount * 4 > bytes.length
    ) {
      continue;
    }

    const keyframes: number[][] = [];
    for (let row = 0; row < rows; row += 1) {
      const values: number[] = [];
      for (let column = 0; column < columns; column += 1) {
        const value = readAuroraBinaryFloat32(
          bytes,
          valueOffset + (row * columns + column) * 4
        );
        if (value === null) {
          values.length = 0;
          break;
        }
        values.push(value);
      }
      if (values.length !== columns) {
        keyframes.length = 0;
        break;
      }
      keyframes.push(values);
    }
    const values = keyframes[0] ?? [];
    if (keyframes.length === rows && values.length === columns) {
      controllers.push({ type, rows, columns, values, keyframes });
    }
  }

  return controllers;
}

function readAuroraBinaryVector3(
  bytes: Buffer,
  offset: number
): [number, number, number] | undefined {
  const x = readAuroraBinaryFloat32(bytes, offset);
  const y = readAuroraBinaryFloat32(bytes, offset + 4);
  const z = readAuroraBinaryFloat32(bytes, offset + 8);
  if (x === null || y === null || z === null) {
    return undefined;
  }
  return [x, y, z];
}

function readAuroraBinaryQuaternionOrientation(
  bytes: Buffer,
  offset: number
): NonNullable<ParsedAuroraMdlEmitter["transform"]>["orientation"] | undefined {
  const x = readAuroraBinaryFloat32(bytes, offset);
  const y = readAuroraBinaryFloat32(bytes, offset + 4);
  const z = readAuroraBinaryFloat32(bytes, offset + 8);
  const w = readAuroraBinaryFloat32(bytes, offset + 12);
  if (x === null || y === null || z === null || w === null) {
    return undefined;
  }

  return buildAuroraQuaternionOrientation([x, y, z, w]);
}

function buildAuroraQuaternionOrientation(
  value: [number, number, number, number]
): NonNullable<ParsedAuroraMdlEmitter["transform"]>["orientation"] | undefined {
  const [x, y, z, w] = value;
  const length = Math.hypot(x, y, z, w);
  if (length <= 1e-12) {
    return undefined;
  }

  const qx = x / length;
  const qy = y / length;
  const qz = z / length;
  const qw = w / length;
  const vectorLength = Math.hypot(qx, qy, qz);
  if (vectorLength <= 1e-12) {
    return undefined;
  }

  return {
    axis: [qx / vectorLength, qy / vectorLength, qz / vectorLength],
    angleRadians: 2 * Math.atan2(vectorLength, qw)
  };
}

function readAuroraBinaryArrayHeader(
  bytes: Buffer,
  offset: number
): AuroraBinaryArrayHeader | null {
  const arrayOffset = readAuroraBinaryUInt32(bytes, offset);
  const count = readAuroraBinaryUInt32(bytes, offset + 4);
  if (arrayOffset === null || count === null) {
    return null;
  }
  return {
    offset: arrayOffset,
    count
  };
}

function readAuroraBinaryUInt32(bytes: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) {
    return null;
  }
  return bytes.readUInt32LE(offset);
}

function readAuroraBinaryUInt16(bytes: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) {
    return null;
  }
  return bytes.readUInt16LE(offset);
}

function readAuroraBinaryUInt8(bytes: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 1 > bytes.length) {
    return null;
  }
  return bytes.readUInt8(offset);
}

function readAuroraBinaryInt16(bytes: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) {
    return null;
  }
  return bytes.readInt16LE(offset);
}

function readAuroraBinaryFloat32(bytes: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) {
    return null;
  }
  const value = bytes.readFloatLE(offset);
  return Number.isFinite(value) ? value : null;
}

function readAuroraBinaryCString(bytes: Buffer, offset: number, length: number): string {
  if (offset < 0 || length <= 0 || offset >= bytes.length) {
    return "";
  }
  const end = Math.min(bytes.length, offset + length);
  const slice = bytes.subarray(offset, end);
  const nullIndex = slice.indexOf(0);
  const used = nullIndex >= 0 ? slice.subarray(0, nullIndex) : slice;
  return used.toString("ascii").trim();
}

function normalizeAuroraEmitterValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim().replace(/^['"]+|['"]+$/gu, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeAuroraNodeLookupName(value: unknown): string | undefined {
  const normalized = normalizeAuroraEmitterValue(value);
  return normalized ? normalized.toLowerCase() : undefined;
}

function isAuroraMaterialTextureKey(key: string): boolean {
  if (key.startsWith("texture")) {
    return true;
  }
  return (
    key === "basetexture" ||
    key === "diffusemap" ||
    key === "bumpmaptexture" ||
    key === "bumpyshinytexture" ||
    key === "envmaptexture" ||
    key === "bumpreplacementtexture" ||
    key === "normalmap" ||
    key === "specularmap" ||
    key === "roughnessmap"
  );
}

function normalizeModelTextureReference(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/^['"]+|['"]+$/gu, "");
  if (!trimmed || /^(null|none)$/iu.test(trimmed)) {
    return null;
  }

  const basename = extractBasename(extractFileName(trimmed));
  if (!/[a-z0-9]/u.test(basename)) {
    return null;
  }

  return basename;
}

function normalizeAuroraModelResourceReference(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/^['"]+|['"]+$/gu, "");
  if (!trimmed || /^(null|none)$/iu.test(trimmed)) {
    return null;
  }

  const basename = extractBasename(extractFileName(trimmed));
  if (!/[a-z0-9]/u.test(basename)) {
    return null;
  }

  return basename;
}

function mergeRenderPackageDiagnostics(
  baseDiagnostics: PlaceableRenderPackage["diagnostics"],
  diagnosticsToAdd: PlaceableRenderPackage["diagnostics"]
): PlaceableRenderPackage["diagnostics"] {
  const merged = [...baseDiagnostics];
  for (const diagnostic of diagnosticsToAdd) {
    if (merged.some((entry) => entry.code === diagnostic.code)) {
      continue;
    }
    merged.push(diagnostic);
  }
  return merged;
}

function buildAuroraEmitterRenderPackageDiagnostics(
  isVfxPlaceable: boolean,
  chunkDiagnostics: PlaceableRenderPackage["diagnostics"]
): PlaceableRenderPackage["diagnostics"] {
  return [
    ...(!isVfxPlaceable
      ? [
          {
            code: "PLACEABLE_AURORA_MDL_EMITTER_PAYLOAD_READY",
            severity: "warn" as const,
            message:
              "Source MDL emitter nodes were parsed and attached to the placeable render package."
          }
        ]
      : []),
    {
      code: "VFX_AURORA_MDL_EMITTER_PAYLOAD_READY",
      severity: "warn",
      message:
        "Source MDL emitter nodes were parsed and attached to the render package."
    },
    {
      code: "VFX_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL",
      severity: "warn",
      message:
        isVfxPlaceable
          ? "Source MDL emitter payload is preview-only; canonical VFX runtime still requires source rows and effect-instance context."
          : "Source MDL emitter payload is rendered as a placeable model preview overlay while exact Aurora particle simulation parity remains pending."
    },
    ...chunkDiagnostics
  ];
}

function promoteAuroraEmitterRenderPackage(
  renderPackage: PlaceableRenderPackage
): PlaceableRenderPackage {
  const hasEmitterPayload = (renderPackage.auroraEmitter?.emitters.length ?? 0) > 0;
  const hasDerivedModelAsset = (renderPackage.assetRefs.derivedModelAssetIds?.length ?? 0) > 0;
  const hasRenderableVfxAsset =
    (renderPackage.assetRefs.textureAssetIds?.length ?? 0) > 0 ||
    (renderPackage.assetRefs.chunkModelAssetIds?.length ?? 0) > 0;
  if (!hasEmitterPayload || !hasRenderableVfxAsset) {
    return renderPackage;
  }

  return {
    ...renderPackage,
    status: "ready",
    diagnostics: mergeRenderPackageDiagnostics(
      renderPackage.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code !== "PLACEABLE_RENDER_DERIVED_MISSING" &&
          (hasDerivedModelAsset ||
            diagnostic.code !== "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY")
      ),
      [
        {
          code: "PLACEABLE_RENDER_READY",
          severity: "warn",
          message:
            "Aurora source MDL emitter payload and render assets are available for VFX preview."
        },
        {
          code: "VFX_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL",
          severity: "warn",
          message:
            "Source MDL emitter payload is preview-only; canonical VFX runtime still requires source rows and effect-instance context."
        }
      ]
    )
  };
}

function promoteAuroraLightRenderPackage(
  renderPackage: PlaceableRenderPackage
): PlaceableRenderPackage {
  const hasLightPayload = (renderPackage.auroraLight?.lights.length ?? 0) > 0;
  if (!hasLightPayload) {
    return renderPackage;
  }

  return {
    ...renderPackage,
    status: "ready",
    diagnostics: mergeRenderPackageDiagnostics(
      renderPackage.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code !== "PLACEABLE_RENDER_DERIVED_MISSING" &&
          diagnostic.code !== "VFX_AURORA_MDL_EMITTER_PAYLOAD_MISSING" &&
          diagnostic.code !== "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY"
      ),
      [
        {
          code: "PLACEABLE_RENDER_READY",
          severity: "warn",
          message:
            "Aurora source MDL light nodes are available for VFX light-node preview."
        },
        {
          code: "VFX_AURORA_MDL_LIGHT_PREVIEW_NON_CANONICAL",
          severity: "warn",
          message:
            "Source MDL light-node payload is preview-only; canonical VFX runtime still requires source rows and effect-instance context."
        },
        ...(renderPackage.auroraLight?.diagnostics ?? [])
      ]
    )
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function buildPlaceableAssetSourcePriority(
  settings: RuntimeSettingsRecord,
  moduleIfoHakList: string[] = [],
  sourceAssetKind: PlaceableManifestSourceAssetKind = "placeable"
): PlaceableAssetSourcePriority {
  const sourceHakEntries = resolveHakSettingsByAsset(
    settings,
    moduleIfoHakList
  )[sourceAssetKind].hakPriorityList;
  const hakNames = deduplicateOrdered(
    sourceHakEntries.map(normalizeHakNameForBlobSource).filter(Boolean)
  );
  return { hakNames };
}

function normalizeHakNameForBlobSource(value: string): string {
  const basename = extractBasename(extractFileName(value));
  return sanitizeBlobSourceSegment(basename);
}

function sanitizeBlobSourceSegment(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._-]/gu, "_");
  return normalized || "source";
}

function deduplicateOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    ordered.push(normalized);
  }
  return ordered;
}

function dedupeText(values: Array<string | undefined>): string[] {
  return deduplicateOrdered(values.filter((value): value is string => Boolean(value)));
}

const AREA_INSTANCE_LIGHT_NODE_HELPER_PATTERN =
  /(?:lightnode|light_node|placeablelight|light_source|light-source)/iu;
const AREA_INSTANCE_VFX_PATTERN =
  /(?:^|[^a-z0-9])(?:vfx|vvx|vvxy)(?:[^a-z0-9]|$)|vfx[a-z0-9_]*/iu;

function isAreaInstanceRenderQuery(query: PlaceableProcessQuery): boolean {
  return (
    (Number.isInteger(query.appearanceType ?? Number.NaN) && query.appearanceType !== undefined) ||
    (Number.isInteger(query.genericType ?? Number.NaN) && query.genericType !== undefined)
  );
}

function normalizeAreaInstanceTemplateText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function buildAreaInstanceTemplateId(rawTemplateId: string | null, rawResRef: string): string {
  if (rawTemplateId?.startsWith("plc_")) {
    return rawTemplateId.slice(0, 80);
  }
  if (rawResRef.startsWith("plc_")) {
    return rawResRef.slice(0, 80);
  }
  return `plc_${rawResRef}`.slice(0, 80);
}

function normalizeAreaInstanceRenderSubtype(
  subtype: PlaceableProcessQuery["subtypeHint"] | PlaceableSubtype | undefined
): PlaceableSubtype {
  if (subtype === "vvx" || subtype === "vvxy") {
    return "vfx";
  }
  if (
    subtype === "door" ||
    subtype === "vfx" ||
    subtype === "container" ||
    subtype === "light_source" ||
    subtype === "trigger_proxy"
  ) {
    return subtype;
  }
  return "generic";
}

function isAreaInstanceLightNodeHelperQuery(query: PlaceableProcessQuery): boolean {
  const searchable = [
    query.tag,
    query.templateId,
    query.resref
  ]
    .filter((value): value is string => Boolean(value))
    .join("|")
    .toLowerCase();
  return AREA_INSTANCE_LIGHT_NODE_HELPER_PATTERN.test(searchable);
}

function isAreaInstanceVfxQuery(query: PlaceableProcessQuery): boolean {
  const searchable = [
    query.tag,
    query.templateId,
    query.resref
  ]
    .filter((value): value is string => Boolean(value))
    .join("|")
    .toLowerCase();
  return AREA_INSTANCE_VFX_PATTERN.test(searchable);
}

function resolveAreaInstanceRenderSubtype(
  query: PlaceableProcessQuery,
  templateSubtype?: PlaceableSubtype
): PlaceableSubtype {
  const hintedSubtype = normalizeAreaInstanceRenderSubtype(query.subtypeHint);
  if (query.subtypeHint && hintedSubtype !== "generic") {
    return hintedSubtype;
  }
  if (isAreaInstanceLightNodeHelperQuery(query)) {
    return "light_source";
  }
  if (isAreaInstanceVfxQuery(query)) {
    return "vfx";
  }
  if (query.subtypeHint === "generic") {
    return "generic";
  }
  return templateSubtype ?? "generic";
}

function buildAreaInstancePlaceableTemplate(query: PlaceableProcessQuery): TemplateRecord | null {
  if (!isAreaInstanceRenderQuery(query)) {
    return null;
  }

  const queryTemplateId = normalizeAreaInstanceTemplateText(query.templateId);
  const queryResRef = normalizeAreaInstanceTemplateText(query.resref);
  const fallbackResRef = `area_instance_${query.appearanceType ?? "none"}_${query.genericType ?? "none"}`;
  const resref = queryResRef ?? queryTemplateId ?? fallbackResRef;
  const templateId = buildAreaInstanceTemplateId(queryTemplateId, resref);
  const appearanceType =
    Number.isInteger(query.appearanceType ?? Number.NaN) && query.appearanceType !== undefined
      ? Math.trunc(query.appearanceType)
      : undefined;
  const genericType =
    Number.isInteger(query.genericType ?? Number.NaN) && query.genericType !== undefined
      ? Math.trunc(query.genericType)
      : undefined;
  const placeableSubtype = resolveAreaInstanceRenderSubtype(query);

  return {
    templateId,
    kind: "placeable",
    placeableSubtype,
    benchmarkCandidate: false,
    benchmarkBucket: "area-git-instance",
    resref,
    name: templateId,
    category: "Area GIT Placeables",
    tags: dedupeText([
      "area-git-instance",
      "aurora-git",
      appearanceType !== undefined ? `appearance-${appearanceType}` : undefined,
      genericType !== undefined ? `generic-${genericType}` : undefined,
      query.tag ?? undefined,
      queryTemplateId ?? undefined,
      queryResRef ?? undefined
    ]),
    previewImageUrl: `/assets/previews/placeables/${templateId}.webp`,
    metadata: {
      areaInstanceTemplateSource: "git",
      areaInstanceTemplateSynthesized: true,
      templateResRef: resref,
      resref,
      ...(query.tag ? { tag: query.tag } : {}),
      ...(queryTemplateId ? { requestedTemplateId: queryTemplateId } : {}),
      ...(queryResRef ? { requestedResRef: queryResRef } : {}),
      ...(appearanceType !== undefined ? { appearanceId: appearanceType } : {}),
      ...(genericType !== undefined ? { genericType } : {})
    }
  };
}

function normalizeAreaInstanceCreatureMetadata(
  metadata: TemplateProcessQuery["creatureMetadata"] | undefined
): Record<string, string | number | boolean> | undefined {
  const entries = Object.entries(metadata ?? {})
    .map(([key, value]) => [key.trim(), value] as const)
    .filter(([key, value]) => {
      if (!key) {
        return false;
      }
      if (typeof value === "number") {
        return Number.isFinite(value);
      }
      return typeof value === "string" || typeof value === "boolean";
    });
  if (entries.length < 1) {
    return undefined;
  }
  return Object.fromEntries(entries);
}

function readAreaInstanceCreatureMetadataString(
  metadata: Record<string, string | number | boolean> | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readAreaInstanceCreatureMetadataNumber(
  metadata: Record<string, string | number | boolean> | undefined,
  key: string
): number | undefined {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function resolveAreaInstanceCreatureAppearanceType(
  query: TemplateProcessQuery,
  metadata: Record<string, string | number | boolean> | undefined
): number | undefined {
  const value =
    readAreaInstanceCreatureMetadataNumber(metadata, "appearanceId") ??
    readAreaInstanceCreatureMetadataNumber(metadata, "appearanceType") ??
    readAreaInstanceCreatureMetadataNumber(metadata, "appearance") ??
    query.creatureAppearanceOverride?.appearanceType;
  return Number.isInteger(value ?? Number.NaN) && value !== undefined
    ? Math.max(0, Math.trunc(value))
    : undefined;
}

function buildAreaInstanceCreatureTemplateId(rawTemplateId: string | null, rawResRef: string): string {
  if (rawTemplateId?.startsWith("cre_")) {
    return rawTemplateId.slice(0, 80);
  }
  if (rawResRef.startsWith("cre_")) {
    return rawResRef.slice(0, 80);
  }
  return `cre_${rawResRef}`.slice(0, 80);
}

function buildAreaInstanceCreatureTemplate(query: TemplateProcessQuery): TemplateRecord | null {
  const metadata = normalizeAreaInstanceCreatureMetadata(query.creatureMetadata);
  const appearanceType = resolveAreaInstanceCreatureAppearanceType(query, metadata);
  if (!metadata && appearanceType === undefined) {
    return null;
  }

  const queryTemplateId = normalizeAreaInstanceTemplateText(query.templateId);
  const metadataTemplateResRef = normalizeAreaInstanceTemplateText(
    readAreaInstanceCreatureMetadataString(metadata, "templateResRef")
  );
  const metadataResRef = normalizeAreaInstanceTemplateText(
    readAreaInstanceCreatureMetadataString(metadata, "resref")
  );
  const queryResRef = normalizeAreaInstanceTemplateText(query.resref);
  const fallbackResRef = `area_creature_${appearanceType ?? "none"}`;
  const resref = queryResRef ?? metadataTemplateResRef ?? metadataResRef ?? queryTemplateId ?? fallbackResRef;
  const templateId = buildAreaInstanceCreatureTemplateId(queryTemplateId, resref);
  const name =
    readAreaInstanceCreatureMetadataString(metadata, "firstName") ??
    readAreaInstanceCreatureMetadataString(metadata, "localizedName") ??
    readAreaInstanceCreatureMetadataString(metadata, "displayName") ??
    templateId;
  const tag = readAreaInstanceCreatureMetadataString(metadata, "tag");

  return {
    templateId,
    kind: "creature",
    benchmarkCandidate: false,
    benchmarkBucket: "area-git-instance",
    resref,
    name,
    category: "Area GIT Creatures",
    tags: dedupeText([
      "area-git-instance",
      "aurora-git",
      appearanceType !== undefined ? `appearance-${appearanceType}` : undefined,
      tag,
      queryTemplateId ?? undefined,
      queryResRef ?? undefined,
      metadataTemplateResRef ?? undefined,
      metadataResRef ?? undefined
    ]),
    previewImageUrl: `/assets/previews/creatures/${templateId}.webp`,
    metadata: {
      ...(metadata ?? {}),
      areaInstanceTemplateSource: "git",
      areaInstanceTemplateSynthesized: true,
      templateResRef: metadataTemplateResRef ?? metadataResRef ?? resref,
      resref,
      ...(tag ? { tag } : {}),
      ...(queryTemplateId ? { requestedTemplateId: queryTemplateId } : {}),
      ...(queryResRef ? { requestedResRef: queryResRef } : {}),
      ...(appearanceType !== undefined ? { appearanceId: appearanceType } : {})
    }
  };
}

function buildAreaInstanceRenderFingerprint(
  query: PlaceableProcessQuery,
  subtype?: PlaceableSubtype
): string | null {
  const parts: string[] = [];
  if (query.appearanceType !== undefined) {
    parts.push(`appearance:${Math.trunc(query.appearanceType)}`);
  }
  if (query.genericType !== undefined) {
    parts.push(`generic:${Math.trunc(query.genericType)}`);
  }
  if (parts.length === 0) {
    return null;
  }
  parts.push(`subtype:${normalizeAreaInstanceRenderSubtype(subtype ?? query.subtypeHint)}`);
  if (query.tag) {
    parts.push(`tag:${normalizeLookupKey(query.tag)}`);
  }
  if (query.localizedName) {
    parts.push(`localized:${normalizeLookupKey(query.localizedName)}`);
  }
  if (query.description) {
    parts.push(`description:${normalizeLookupKey(query.description)}`);
  }
  return `area-instance|${parts.join("|")}`;
}

const AREA_INSTANCE_RENDER_FACTS_CACHE_KEY_VERSION =
  "area-instance-render-facts/v5-instance-alias-box-tokens";
const AREA_INSTANCE_RENDER_MODEL_CACHE_KEY_VERSION =
  "area-instance-render-model/v5-instance-alias-box-tokens";
const AREA_INSTANCE_PLACEABLE_BATCH_CACHE_KEY_VERSION =
  "placeable-process-batch/v5-instance-alias-box-tokens";

function buildAreaInstanceRenderFactsKey(
  query: PlaceableProcessQuery,
  subtype: PlaceableProcessQuery["subtypeHint"] | PlaceableSubtype = resolveAreaInstanceRenderSubtype(query)
): string | null {
  const appearanceType =
    Number.isInteger(query.appearanceType ?? Number.NaN) && query.appearanceType !== undefined
      ? String(Math.trunc(query.appearanceType))
      : "none";
  const genericType =
    Number.isInteger(query.genericType ?? Number.NaN) && query.genericType !== undefined
      ? String(Math.trunc(query.genericType))
      : "none";
  if (appearanceType === "none" && genericType === "none") {
    return null;
  }
  return [
    AREA_INSTANCE_RENDER_FACTS_CACHE_KEY_VERSION,
    normalizeAreaInstanceRenderSubtype(subtype),
    `appearance:${appearanceType}`,
    `generic:${genericType}`,
    `tag:${normalizeLookupKey(query.tag ?? "") || "none"}`,
    `localized:${normalizeLookupKey(query.localizedName ?? "") || "none"}`,
    `description:${normalizeLookupKey(query.description ?? "") || "none"}`
  ].join("|");
}

function buildPlaceableAppearanceLookupContext(query: PlaceableProcessQuery): {
  tag?: string;
  templateId?: string;
  resref?: string;
  localizedName?: string;
  description?: string;
} {
  return {
    ...(query.tag ? { tag: query.tag } : {}),
    ...(query.templateId ? { templateId: query.templateId } : {}),
    ...(query.resref ? { resref: query.resref } : {}),
    ...(query.localizedName ? { localizedName: query.localizedName } : {}),
    ...(query.description ? { description: query.description } : {})
  };
}

function buildAreaInstanceRenderModelFactsKey(
  modelResRef: unknown,
  subtype: PlaceableProcessQuery["subtypeHint"] | PlaceableSubtype
): string | null {
  const normalizedModelResRef = normalizeAuroraModelResourceReference(modelResRef);
  if (!normalizedModelResRef) {
    return null;
  }
  return [
    AREA_INSTANCE_RENDER_MODEL_CACHE_KEY_VERSION,
    normalizeAreaInstanceRenderSubtype(subtype),
    `model:${normalizeLookupKey(normalizedModelResRef)}`
  ].join("|");
}

function buildAreaInstanceRenderFactsCacheIdentity(
  query: PlaceableProcessQuery,
  subtype: PlaceableSubtype
): { templateId: string; resref: string; fingerprint: string; identityKind: "facts" } | null {
  const renderFactsKey = buildAreaInstanceRenderFactsKey(query, subtype);
  if (!renderFactsKey) {
    return null;
  }
  const appearanceType =
    Number.isInteger(query.appearanceType ?? Number.NaN) && query.appearanceType !== undefined
      ? String(Math.trunc(query.appearanceType))
      : "none";
  const genericType =
    Number.isInteger(query.genericType ?? Number.NaN) && query.genericType !== undefined
      ? String(Math.trunc(query.genericType))
      : "none";
  const normalizedSubtype = normalizeAreaInstanceRenderSubtype(subtype);
  const visualIdentity = `${normalizedSubtype}_appearance_${appearanceType}_generic_${genericType}`;
  return {
    templateId: `area_instance_${visualIdentity}`.slice(0, 80),
    resref: `area_instance_${visualIdentity}`.slice(0, 80),
    fingerprint: renderFactsKey,
    identityKind: "facts"
  };
}

function buildAreaInstanceRenderCacheIdentity(
  query: PlaceableProcessQuery,
  subtype: PlaceableSubtype,
  metadata: Record<string, string | number | boolean>
): { templateId: string; resref: string; fingerprint: string; identityKind: "model" | "facts" } | null {
  const normalizedSubtype = normalizeAreaInstanceRenderSubtype(subtype);
  const modelResRef =
    normalizeAuroraModelResourceReference(metadata.lookupModelResRef) ??
    normalizeAuroraModelResourceReference(metadata.modelResRef);
  const modelFactsKey = buildAreaInstanceRenderModelFactsKey(modelResRef, subtype);
  if (modelFactsKey && modelResRef) {
    const visualIdentity = `${normalizedSubtype}_model_${normalizeLookupKey(modelResRef)}`;
    return {
      templateId: `area_instance_${visualIdentity}`.slice(0, 80),
      resref: `area_instance_${visualIdentity}`.slice(0, 80),
      fingerprint: modelFactsKey,
      identityKind: "model"
    };
  }

  const factsIdentity = buildAreaInstanceRenderFactsCacheIdentity(query, subtype);
  if (!factsIdentity) {
    return null;
  }
  return {
    ...factsIdentity,
    identityKind: "facts"
  };
}

function isAreaInstanceMissingRenderableModel(
  metadata: Record<string, string | number | boolean>
): boolean {
  if (metadata.areaInstanceRenderSource !== "git") {
    return false;
  }
  if (metadata.areaInstanceModelLookupStatus !== "blocked") {
    return false;
  }
  return (
    !normalizeAuroraModelResourceReference(metadata.modelResRef) &&
    !normalizeAuroraModelResourceReference(metadata.lookupModelResRef)
  );
}

function isAreaInstanceHelperRenderSuppressed(
  metadata: Record<string, string | number | boolean>
): boolean {
  return (
    metadata.areaInstanceRenderSource === "git" &&
    metadata.areaInstanceHelperRenderSuppressed === true
  );
}

function buildAreaInstanceMissingModelRenderPackage(
  metadata: Record<string, string | number | boolean>
): PlaceableRenderPackage {
  if (metadata.areaInstanceHelperRenderSuppressed === true) {
    const helperKind =
      typeof metadata.areaInstanceHelperKind === "string"
        ? metadata.areaInstanceHelperKind
        : "helper";
    return {
      status: "unsupported",
      diagnostics: [
        {
          code: "PLACEABLE_RENDER_AREA_INSTANCE_HELPER_NO_GEOMETRY",
          severity: "warn",
          message: `Area GIT ${helperKind} instance is an Aurora helper without renderable mesh geometry.`
        }
      ],
      assetRefs: {}
    };
  }

  const appearanceType =
    typeof metadata.areaInstanceAppearanceType === "number"
      ? metadata.areaInstanceAppearanceType
      : typeof metadata.appearanceId === "number"
        ? metadata.appearanceId
        : null;
  const genericType =
    typeof metadata.areaInstanceGenericType === "number"
      ? metadata.areaInstanceGenericType
      : typeof metadata.genericType === "number"
        ? metadata.genericType
        : null;
  const sourceHint =
    appearanceType !== null
      ? `appearanceType ${appearanceType}`
      : genericType !== null
        ? `genericType ${genericType}`
        : "GIT instance";

  return {
    status: "unsupported",
    diagnostics: [
      {
        code: "PLACEABLE_RENDER_AREA_INSTANCE_MODEL_UNRESOLVED",
        severity: "warn",
        message: `${sourceHint} did not resolve to a renderable Aurora model resource.`
      }
    ],
    assetRefs: {}
  };
}

function buildPlaceableAssetDeliveryPath(
  cacheKey: string,
  asset: Pick<PlaceableAssetEntry, "assetId" | "extension" | "fileName">
): string {
  const encodedCacheKey = encodeURIComponent(cacheKey);
  const extension = normalizeDeliveryExtension(asset.extension || asset.fileName);
  const assetIdWithExtension = extension ? `${asset.assetId}.${extension}` : asset.assetId;
  const encodedAssetId = encodeURIComponent(assetIdWithExtension);
  return `/api/v1/catalog/placeables/cache/${encodedCacheKey}/assets/${encodedAssetId}`;
}

function buildPlaceableAssetBrowserDeliveryUrl(
  cacheKey: string,
  asset: Pick<PlaceableAssetEntry, "assetId" | "extension" | "fileName" | "objectKey">,
  blobSettings?: BlobStorageSettings | null,
  allowDirectBlobDelivery = true
): string {
  const deliveryPath = buildPlaceableAssetDeliveryPath(cacheKey, asset);
  return blobSettings && allowDirectBlobDelivery
    ? buildBrowserDirectBlobObjectDeliveryUrl(blobSettings, asset.objectKey) ?? deliveryPath
    : deliveryPath;
}

function isCriticalPlaceableViewportPrimeAsset(asset: PlaceableAssetDeliveryContract): boolean {
  const objectKey = asset.objectKey.trim().toLowerCase();
  const deliveryPath = asset.deliveryPath.trim().toLowerCase();
  const contentType = asset.contentType.trim().toLowerCase();
  return (
    contentType === "model/gltf-binary" ||
    objectKey.endsWith(".glb") ||
    deliveryPath.endsWith(".glb")
  );
}

function buildBrowserDirectBlobObjectDeliveryUrl(
  settings: BlobStorageSettings,
  objectKey: string
): string | null {
  const endpoint = settings.endpoint.trim();
  if (!endpoint) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "seaweedfs") {
    return null;
  }

  const encodedBucket = encodeURIComponent(settings.bucket);
  const encodedObjectKey = objectKey
    .replace(/^\/+|\/+$/gu, "")
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  if (!encodedObjectKey) {
    return null;
  }
  return `http://127.0.0.1:8888/buckets/${encodedBucket}/${encodedObjectKey}`;
}

function buildModuleBlobObjectCacheKey(settings: BlobStorageSettings, key: string): string {
  return [
    settings.bucket.trim().toLowerCase(),
    settings.modulePrefix.trim().toLowerCase(),
    key.trim().toLowerCase()
  ].join("|");
}

const EMPTY_ITEM_PALETTE_TALK_TABLE_LOOKUP: ItemPaletteTalkTableLookup = {
  resolve: () => undefined
};

const ITEM_PALETTE_CUSTOM_TLK_STRREF_BASE = 0x01000000;
const ITEM_PALETTE_TLK_HEADER_SIZE = 20;
const ITEM_PALETTE_TLK_ENTRY_SIZE = 40;

function collectItemPaletteTalkTableStrRefs(nodes: ParsedAuroraItpPaletteNode[]): number[] {
  const refs: number[] = [];
  const visit = (node: ParsedAuroraItpPaletteNode) => {
    if (isValidItemPaletteTalkTableStrRef(node.strRef)) {
      refs.push(node.strRef);
    }
    for (const child of node.children) {
      visit(child);
    }
  };
  for (const node of nodes) {
    visit(node);
  }
  return refs;
}

async function readItemPaletteTalkTableStrings(
  filePath: string | undefined,
  requests: Array<{ strRef: number; index: number }>,
  sourceKind: "base" | "custom",
  logger: Logger
): Promise<Map<number, ItemPaletteTalkTableResolvedString>> {
  const resolved = new Map<number, ItemPaletteTalkTableResolvedString>();
  const configuredPath = filePath?.trim();
  if (!configuredPath || requests.length === 0) {
    return resolved;
  }
  const normalizedPath = resolveHostLocalMountedPath(configuredPath) ?? configuredPath;

  let bytes: Buffer;
  try {
    bytes = await readFile(normalizedPath);
  } catch (error) {
    logger.warn(`Unable to read ${sourceKind} TLK at ${normalizedPath}: ${String(error)}`);
    return resolved;
  }

  if (!isItemPaletteBufferRangeReadable(bytes, 0, ITEM_PALETTE_TLK_HEADER_SIZE)) {
    logger.warn(`Unable to read ${sourceKind} TLK at ${normalizedPath}: header is truncated.`);
    return resolved;
  }
  const signature = bytes.subarray(0, 8).toString("ascii");
  if (signature !== "TLK V3.0") {
    logger.warn(`Unable to read ${sourceKind} TLK at ${normalizedPath}: unsupported signature.`);
    return resolved;
  }

  const stringCount = bytes.readUInt32LE(12);
  const stringDataOffset = bytes.readUInt32LE(16);
  for (const request of requests) {
    if (request.index < 0 || request.index >= stringCount) {
      continue;
    }
    const entryOffset =
      ITEM_PALETTE_TLK_HEADER_SIZE + request.index * ITEM_PALETTE_TLK_ENTRY_SIZE;
    if (!isItemPaletteBufferRangeReadable(bytes, entryOffset, ITEM_PALETTE_TLK_ENTRY_SIZE)) {
      continue;
    }
    const textOffset = bytes.readUInt32LE(entryOffset + 28);
    const textSize = bytes.readUInt32LE(entryOffset + 32);
    const textStart = stringDataOffset + textOffset;
    if (!isItemPaletteBufferRangeReadable(bytes, textStart, textSize)) {
      continue;
    }
    const text = sanitizeItemPaletteTalkTableText(
      bytes.subarray(textStart, textStart + textSize)
    );
    if (!text) {
      continue;
    }
    resolved.set(request.strRef, {
      text,
      strRef: request.strRef,
      sourceKind,
      sourcePath: normalizedPath
    });
  }

  return resolved;
}

function isValidItemPaletteTalkTableStrRef(value: number | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value !== 0xffffffff
  );
}

function isItemPaletteBufferRangeReadable(
  bytes: Buffer,
  offset: number,
  length: number
): boolean {
  return Number.isInteger(offset) && Number.isInteger(length) && offset >= 0 && length >= 0
    ? offset + length <= bytes.length
    : false;
}

function sanitizeItemPaletteTalkTableText(bytes: Buffer): string | undefined {
  const text = bytes.toString("latin1").replace(/\0/gu, "").trim();
  return text.length > 0 ? text : undefined;
}

function isNotFoundAppException(error: unknown): boolean {
  return error instanceof AppException && error.getStatus() === 404;
}

function formatUnexpectedError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown non-error exception.";
}

function normalizeDeliveryExtension(value: string): string {
  const normalized = value.trim().toLowerCase();
  const extension = normalized.includes(".")
    ? normalized.slice(normalized.lastIndexOf(".") + 1)
    : normalized;
  if (!/^[a-z0-9]{1,12}$/u.test(extension)) {
    return "";
  }
  return extension;
}

function buildPlaceableBatchRenderFactsKey(query: PlaceableProcessQuery): string {
  const areaInstanceRenderFactsKey = buildAreaInstanceRenderFactsKey(query);
  if (areaInstanceRenderFactsKey) {
    return [
      AREA_INSTANCE_PLACEABLE_BATCH_CACHE_KEY_VERSION,
      areaInstanceRenderFactsKey,
      query.bypassCache === true ? "bypass" : "cache",
      query.includeBenchmarkMetadata === false ? "benchmark-stripped" : "benchmark-included"
    ].join("|");
  }

  const appearanceType =
    Number.isInteger(query.appearanceType ?? Number.NaN) && query.appearanceType !== undefined
      ? String(Math.trunc(query.appearanceType))
      : "";
  const genericType =
    Number.isInteger(query.genericType ?? Number.NaN) && query.genericType !== undefined
      ? String(Math.trunc(query.genericType))
      : "";

  return [
    "placeable-process-batch/v1",
    normalizeLookupKey(query.templateId ?? ""),
    normalizeLookupKey(query.resref ?? ""),
    normalizeLookupKey(query.tag ?? ""),
    normalizeLookupKey(query.subtypeHint ?? ""),
    appearanceType,
    genericType,
    query.bypassCache === true ? "bypass" : "cache",
    query.includeBenchmarkMetadata === false ? "benchmark-stripped" : "benchmark-included"
  ].join("|");
}

function buildPlaceableProcessCacheFingerprint(
  fingerprint: string,
  options: PlaceableProcessingOptions
): string {
  const normalizedFingerprint = fingerprint.trim().length > 0 ? fingerprint : "stable";
  return [
    normalizedFingerprint,
    options.allowOnDemandDerivedModelGeneration === false ? "derived:off" : "derived:on",
    options.allowExpensiveSourceReferenceScans === false
      ? "source-scan:off"
      : "source-scan:on",
    options.allowOnDemandTextureLookup === false
      ? "texture-lookup:off"
      : "texture-lookup:on"
  ].join("|");
}

function isDefaultPlaceableProcessingOptions(options: PlaceableProcessingOptions): boolean {
  return (
    options.allowOnDemandDerivedModelGeneration !== false &&
    options.allowExpensiveSourceReferenceScans !== false &&
    options.allowOnDemandTextureLookup !== false
  );
}

function buildTemplateListCacheKey(kind: TemplateKind, query: TemplateListQuery): string {
  return [
    kind,
    normalizeLookupKey(query.query ?? ""),
    normalizeLookupKey(query.category ?? ""),
    normalizeLookupKey(query.tag ?? ""),
    normalizeLookupKey(query.subtype ?? ""),
    typeof query.benchmark === "boolean" ? String(query.benchmark) : "",
    String(query.limit),
    String(query.offset)
  ].join("|");
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}
