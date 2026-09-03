import type {
  ItemApiBlueprintCreatePayload,
  ItemApiBlueprintPropertyEntry,
  ItemApiPropertyDictionaryEntry,
  ItemApiPropertyDictionaryOption,
  ItemApiVisualOverride
} from "../contracts";
import type {
  SceneObject,
  SceneObjectItemArmorPreviewContext,
  SceneObjectItemArmorParts,
  SceneObjectItemMaterialColors,
  SceneObjectItemProperties,
  SceneObjectItemPropertyEntry
} from "../../scene/contracts";
import { createNewSceneObject } from "../../scene/domain/sceneFactory";
import { readItemVariableTargetEntries } from "../../scene/domain/itemVariableTable";
import { readItemBlueprintReferenceLists } from
  "../../scene/domain/itemBlueprintInventory";
import { calculateAuroraItemCostBreakdown } from "./itemCostCalculator";
import { formatItemEquipSlotMask } from "./itemEquipSlots";

export type ItemCreationWizardStep = "type" | "identity" | "visual" | "properties" | "finish";

export interface ItemCreationBaseOption {
  baseObjectId: string;
  baseItem: number;
  label: string;
  modelType: string;
  defaultModel: string;
  sampleResRef: string;
}

export interface ItemCreationPropertyDraft {
  propertyName: string;
  propertyLabel?: string;
  subtype: string;
  costTable: string;
  costValue: string;
  param1: string;
  param1Value: string;
  chanceAppear: string;
  propertyDefinitionSource2daRow?: number;
  propertyDefinitionSourceKey?: string;
  subTypeTable?: string;
  costTableDefinition?: string;
  param1Table?: string;
  nameStrRef?: number;
  gameStrRef?: number;
  descriptionStrRef?: number;
}

export interface ItemCreationPropertyOption {
  propertyName: number;
  label: string;
  propertyLabel?: string;
  cost?: number;
  sampleSubtype?: number;
  sampleCostTable?: number;
  sampleCostValue?: number;
  sampleParam1?: number;
  sampleParam1Value?: number;
  sampleChanceAppear?: number;
  propertyDefinitionSource2daRow?: number;
  propertyDefinitionSourceKey?: string;
  subTypeTable?: string;
  costTableDefinition?: string;
  param1Table?: string;
  nameStrRef?: number;
  gameStrRef?: number;
  descriptionStrRef?: number;
  subtypeOptions?: ItemCreationPropertyChoiceOption[];
  costValueOptions?: ItemCreationPropertyChoiceOption[];
  param1Options?: ItemCreationPropertyChoiceOption[];
  costTableLabel?: string;
  param1TableLabel?: string;
}

export interface ItemCreationPropertyChoiceOption {
  value: number;
  label: string;
  nameStrRef?: number;
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
  sourceKey?: string;
}

export interface ItemCreationWizardDraft {
  baseObjectId: string;
  name: string;
  resRef: string;
  tag: string;
  description: string;
  identifiedDescription: string;
  modelPart1: string;
  modelPart2: string;
  modelPart3: string;
  armorContext: {
    modelPrefix: string;
    label: string;
    gender: string;
    phenotype: string;
    raceModel: string;
  };
  armorParts: Record<keyof SceneObjectItemArmorParts, string>;
  materialColors: Record<keyof SceneObjectItemMaterialColors, string>;
  stackSize: string;
  charges: string;
  addCost: string;
  identified: boolean;
  plot: boolean;
  stolen: boolean;
  cursed: boolean;
  overwriteExisting: boolean;
  propertyList: ItemCreationPropertyDraft[];
}

export interface ItemCreationValidationIssue {
  code:
    | "STACK_SIZE_EXCEEDS_BASEITEM_STACKING"
    | "CHARGES_ON_BASEITEM_WITHOUT_STARTING_CHARGES"
    | "PROPERTY_COUNT_EXCEEDS_BASEITEM_MAX_PROPS"
    | "PROPERTY_COUNT_BELOW_BASEITEM_MIN_PROPS"
    | "BASEITEM_REQUIRES_FEATS"
    | "BASEITEM_EQUIPABLE_SLOTS_CONTEXT"
    | "STACK_SIZE_EXCEEDS_BASEITEM_ILR_STACK_SIZE"
    | "BASEITEM_COST_CONTEXT"
    | "PROPERTY_CASTSPELL_REQUIRES_SPELL_AND_USES"
    | "PROPERTY_LIGHT_REQUIRES_BRIGHTNESS"
    | "PROPERTY_LIGHT_REQUIRES_COLOR"
    | "PROPERTY_ONHIT_REQUIRES_SUBTYPE"
    | "PROPERTY_UNLIMITED_AMMO_REQUIRES_AMMO_TYPE"
    | "PROPERTY_POISON_REQUIRES_POISON_TYPE"
    | "PROPERTY_COST_VALUE_MISSING"
    | "PROPERTY_COST_TABLE_MISSING"
    | "PROPERTY_ONHIT_COST_TABLE_FORCED"
    | "PROPERTY_COST_CONTEXT"
    | "PROPERTY_COST_UNRESOLVED"
    | "ARMOR_CONTEXT_INVALID"
    | "ARMOR_PART_SOURCE_MISSING";
  severity: "error" | "warn" | "info";
  message: string;
}

const ITEM_CREATION_MODEL_PART_KEYS = ["modelPart1", "modelPart2", "modelPart3"] as const;
const AURORA_ONHIT_PROPERTY_NAME = 48;
const AURORA_ONHIT_COST_TABLE = 24;

export const ITEM_CREATION_ARMOR_CONTEXT_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  modelPrefix: string;
  gender: string;
  phenotype: string;
  raceModel: string;
}> = [
  {
    id: "pmh0",
    label: "Human Male P0",
    modelPrefix: "pmh0_",
    gender: "0",
    phenotype: "0",
    raceModel: "human"
  },
  {
    id: "pmh2",
    label: "Human Male P2",
    modelPrefix: "pmh2_",
    gender: "0",
    phenotype: "2",
    raceModel: "human"
  },
  {
    id: "pfh0",
    label: "Human Female P0",
    modelPrefix: "pfh0_",
    gender: "1",
    phenotype: "0",
    raceModel: "human"
  },
  {
    id: "pfh2",
    label: "Human Female P2",
    modelPrefix: "pfh2_",
    gender: "1",
    phenotype: "2",
    raceModel: "human"
  }
];

const ITEM_CREATION_ARMOR_PART_MODEL_NAMES: Record<keyof SceneObjectItemArmorParts, string> = {
  rFoot: "footr",
  lFoot: "footl",
  rShin: "shinr",
  lShin: "shinl",
  rThigh: "legr",
  lThigh: "legl",
  pelvis: "pelvis",
  torso: "chest",
  belt: "belt",
  neck: "neck",
  rFArm: "forer",
  lFArm: "forel",
  rBicep: "bicepr",
  lBicep: "bicepl",
  rShoul: "shor",
  lShoul: "shol",
  rHand: "handr",
  lHand: "handl",
  robe: "robe"
};

export const ITEM_CREATION_ARMOR_PART_FIELDS: ReadonlyArray<{
  key: keyof SceneObjectItemArmorParts;
  label: string;
}> = [
  { key: "rFoot", label: "R Foot" },
  { key: "lFoot", label: "L Foot" },
  { key: "rShin", label: "R Shin" },
  { key: "lShin", label: "L Shin" },
  { key: "lThigh", label: "L Thigh" },
  { key: "rThigh", label: "R Thigh" },
  { key: "pelvis", label: "Pelvis" },
  { key: "torso", label: "Torso" },
  { key: "belt", label: "Belt" },
  { key: "neck", label: "Neck" },
  { key: "rFArm", label: "R Forearm" },
  { key: "lFArm", label: "L Forearm" },
  { key: "rBicep", label: "R Bicep" },
  { key: "lBicep", label: "L Bicep" },
  { key: "rShoul", label: "R Shoulder" },
  { key: "lShoul", label: "L Shoulder" },
  { key: "rHand", label: "R Hand" },
  { key: "lHand", label: "L Hand" },
  { key: "robe", label: "Robe" }
];

export const ITEM_CREATION_MATERIAL_COLOR_FIELDS: ReadonlyArray<{
  key: keyof SceneObjectItemMaterialColors;
  label: string;
}> = [
  { key: "leather1", label: "Leather 1" },
  { key: "leather2", label: "Leather 2" },
  { key: "cloth1", label: "Cloth 1" },
  { key: "cloth2", label: "Cloth 2" },
  { key: "metal1", label: "Metal 1" },
  { key: "metal2", label: "Metal 2" }
];

export const ITEM_CREATION_WIZARD_STEPS: ReadonlyArray<{
  id: ItemCreationWizardStep;
  label: string;
}> = [
  { id: "type", label: "Type" },
  { id: "identity", label: "Identity" },
  { id: "visual", label: "Visual" },
  { id: "properties", label: "Properties" },
  { id: "finish", label: "Finish" }
];

function readModelPartValue(
  properties: SceneObjectItemProperties | undefined,
  key: (typeof ITEM_CREATION_MODEL_PART_KEYS)[number],
  index: number
): number | undefined {
  return properties?.[key] ?? properties?.modelParts?.[index];
}

function formatDraftNumber(value: number | undefined, fallback = ""): string {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.max(0, Math.trunc(value)))
    : fallback;
}

function parseIntegerDraft(
  value: string,
  min: number,
  max: number
): number | undefined {
  const normalized = value.trim();
  if (!/^\d{1,6}$/u.test(normalized)) {
    return undefined;
  }
  return Math.max(min, Math.min(max, Number.parseInt(normalized, 10)));
}

type SpecialItemPropertyKind = "castSpell" | "light" | "onHit" | "unlimitedAmmo" | "poison";

function normalizePropertyRuleText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function resolveSpecialItemPropertyKind(
  entry: ItemCreationPropertyDraft
): SpecialItemPropertyKind | null {
  const tokens = [
    entry.propertyLabel,
    entry.subTypeTable,
    entry.costTableDefinition,
    entry.param1Table
  ].map(normalizePropertyRuleText);
  const joined = tokens.join(" ");
  if (joined.includes("castspell") || joined.includes("iprp_spells")) {
    return "castSpell";
  }
  if (joined.includes("unlimitedammo")) {
    return "unlimitedAmmo";
  }
  if (joined.includes("onhit")) {
    return "onHit";
  }
  if (joined.includes("poison")) {
    return "poison";
  }
  if (joined.includes("light")) {
    return "light";
  }
  return null;
}

function resolveDraftPropertyName(entry: ItemCreationPropertyDraft): number | undefined {
  return parseIntegerDraft(entry.propertyName, 0, 65535);
}

function resolveDraftCostValue(entry: ItemCreationPropertyDraft): number | undefined {
  return parseIntegerDraft(entry.costValue, 0, 65535);
}

function resolveDraftCostTable(entry: ItemCreationPropertyDraft): number | undefined {
  const propertyName = resolveDraftPropertyName(entry);
  if (propertyName === AURORA_ONHIT_PROPERTY_NAME) {
    return AURORA_ONHIT_COST_TABLE;
  }
  return parseIntegerDraft(entry.costTable, 0, 255);
}

function sanitizeIdentifier(value: string, fallback: string, maxLength: number): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/_{2,}/gu, "_")
    .slice(0, maxLength);
  return normalized.length > 0 ? normalized : fallback.slice(0, maxLength);
}

function sanitizeTag(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/_{2,}/gu, "_")
    .slice(0, 32);
  return normalized.length > 0 ? normalized : fallback.slice(0, 32).toUpperCase();
}

function cloneItemProperties(
  properties: SceneObjectItemProperties | undefined
): SceneObjectItemProperties {
  return {
    ...properties,
    baseItemReqFeats: properties?.baseItemReqFeats
      ? [...properties.baseItemReqFeats]
      : undefined,
    modelParts: properties?.modelParts ? [...properties.modelParts] : undefined,
    modelPartResRefs: properties?.modelPartResRefs ? [...properties.modelPartResRefs] : undefined,
    modelPartResRefRoles: properties?.modelPartResRefRoles
      ? [...properties.modelPartResRefRoles]
      : undefined,
    cloakHiddenSlots: properties?.cloakHiddenSlots ? [...properties.cloakHiddenSlots] : undefined,
    armorRobeHiddenSlots: properties?.armorRobeHiddenSlots
      ? [...properties.armorRobeHiddenSlots]
      : undefined,
    armorPreviewContext: properties?.armorPreviewContext
      ? { ...properties.armorPreviewContext }
      : undefined,
    modelPartCandidates: properties?.modelPartCandidates
      ? properties.modelPartCandidates.map((entry) => ({ ...entry }))
      : undefined,
    armorPartModelCandidates: properties?.armorPartModelCandidates
      ? properties.armorPartModelCandidates.map((entry) => ({ ...entry }))
      : undefined,
    modelAssetCandidates: properties?.modelAssetCandidates
      ? properties.modelAssetCandidates.map((entry) => ({ ...entry }))
      : undefined,
    armorParts: properties?.armorParts ? { ...properties.armorParts } : undefined,
    armorPartCostModifiers: properties?.armorPartCostModifiers
      ? { ...properties.armorPartCostModifiers }
      : undefined,
    materialColors: properties?.materialColors ? { ...properties.materialColors } : undefined,
    propertyList: properties?.propertyList
      ? properties.propertyList.map((entry) => ({ ...entry }))
      : undefined,
    inventoryItems: properties?.inventoryItems
      ? properties.inventoryItems.map((entry) => ({ ...entry }))
      : undefined,
    blueprintInventoryItems: properties?.blueprintInventoryItems
      ? properties.blueprintInventoryItems.map((entry) => ({ ...entry }))
      : undefined,
    blueprintEquippedItems: properties?.blueprintEquippedItems
      ? properties.blueprintEquippedItems.map((entry) => ({ ...entry }))
      : undefined,
    variables: properties?.variables
      ? properties.variables.map((entry) => ({ ...entry }))
      : undefined,
    scripts: properties?.scripts ? { ...properties.scripts } : undefined
  };
}

function buildEmptyArmorPartsDraft(): Record<keyof SceneObjectItemArmorParts, string> {
  return ITEM_CREATION_ARMOR_PART_FIELDS.reduce(
    (draft, field) => {
      draft[field.key] = "";
      return draft;
    },
    {} as Record<keyof SceneObjectItemArmorParts, string>
  );
}

function buildEmptyMaterialColorsDraft(): Record<keyof SceneObjectItemMaterialColors, string> {
  return ITEM_CREATION_MATERIAL_COLOR_FIELDS.reduce(
    (draft, field) => {
      draft[field.key] = "";
      return draft;
    },
    {} as Record<keyof SceneObjectItemMaterialColors, string>
  );
}

function buildArmorContextDraft(
  properties: SceneObjectItemProperties | undefined
): ItemCreationWizardDraft["armorContext"] {
  const source = properties?.armorPreviewContext;
  const fallback = ITEM_CREATION_ARMOR_CONTEXT_PRESETS[0];
  return {
    modelPrefix: source?.modelPrefix ?? fallback.modelPrefix,
    label: source?.label ?? fallback.label,
    gender: source?.gender !== undefined ? formatDraftNumber(source.gender) : fallback.gender,
    phenotype:
      source?.phenotype !== undefined ? formatDraftNumber(source.phenotype) : fallback.phenotype,
    raceModel: source?.raceModel ?? fallback.raceModel
  };
}

function normalizeArmorPrefix(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "")
    .slice(0, 5);
}

function parseArmorContext(
  draft: ItemCreationWizardDraft
): SceneObjectItemArmorPreviewContext | undefined {
  const modelPrefix = normalizeArmorPrefix(draft.armorContext.modelPrefix);
  if (!/^p[fm][a-z][0-9]_$/u.test(modelPrefix)) {
    return undefined;
  }
  const gender = parseIntegerDraft(draft.armorContext.gender, 0, 1);
  const phenotype = parseIntegerDraft(draft.armorContext.phenotype, 0, 9);
  const raceModel = draft.armorContext.raceModel
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "")
    .slice(0, 32);
  const label = draft.armorContext.label.trim().slice(0, 64);
  return {
    modelPrefix,
    ...(label ? { label } : {}),
    ...(gender !== undefined ? { gender } : {}),
    ...(phenotype !== undefined ? { phenotype } : {}),
    ...(raceModel ? { raceModel } : {})
  };
}

function normalizeLookupText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function resolveArmorPartModelResRef(
  armorContext: SceneObjectItemArmorPreviewContext | undefined,
  slot: keyof SceneObjectItemArmorParts,
  partId: number
): string | null {
  const modelName = ITEM_CREATION_ARMOR_PART_MODEL_NAMES[slot];
  const prefix = normalizeLookupText(armorContext?.modelPrefix);
  if (!prefix || !modelName) {
    return null;
  }
  return `${prefix}${modelName}${String(partId).padStart(3, "0")}`;
}

function hasArmorPartSourceCandidate(
  properties: SceneObjectItemProperties | undefined,
  slot: keyof SceneObjectItemArmorParts,
  partId: number,
  modelResRef: string | null
): boolean {
  const normalizedModelResRef = normalizeLookupText(modelResRef ?? undefined);
  const candidates = properties?.armorPartModelCandidates ?? [];
  if (
    candidates.some((candidate) => {
      const candidateSlot = normalizeLookupText(candidate.slot);
      const candidateModelResRef = normalizeLookupText(candidate.modelResRef);
      return (
        candidateSlot === slot.toLowerCase() &&
        candidate.partId === partId &&
        (!normalizedModelResRef || candidateModelResRef === normalizedModelResRef)
      );
    })
  ) {
    return true;
  }

  if (!normalizedModelResRef) {
    return false;
  }
  return (properties?.modelAssetCandidates ?? []).some((asset) => {
    if (normalizeLookupText(asset.role) !== "model") {
      return false;
    }
    const reference = normalizeLookupText(asset.reference);
    const fileName = normalizeLookupText(asset.fileName).replace(/\.(glb|gltf|mdl)$/u, "");
    return reference === normalizedModelResRef || fileName === normalizedModelResRef;
  });
}

function collectMissingArmorPartSourceLabels(
  draft: ItemCreationWizardDraft,
  baseObject: SceneObject
): string[] {
  if (resolveItemCreationVisualMode(baseObject) !== "armor") {
    return [];
  }
  const properties = baseObject.itemProperties;
  const hasKnownSourceCatalog =
    (properties?.armorPartModelCandidates?.length ?? 0) > 0 ||
    (properties?.modelAssetCandidates ?? []).some(
      (asset) => normalizeLookupText(asset.role) === "model"
    );
  if (!hasKnownSourceCatalog) {
    return [];
  }
  const armorContext = parseArmorContext(draft);
  const labels: string[] = [];
  ITEM_CREATION_ARMOR_PART_FIELDS.forEach((field) => {
    const partId = parseIntegerDraft(draft.armorParts[field.key], 0, 999);
    if (partId === undefined || partId <= 0) {
      return;
    }
    const modelResRef = resolveArmorPartModelResRef(armorContext, field.key, partId);
    if (!hasArmorPartSourceCandidate(properties, field.key, partId, modelResRef)) {
      labels.push(`${field.label} ${partId}${modelResRef ? ` (${modelResRef})` : ""}`);
    }
  });
  return labels;
}

function parseArmorParts(
  draft: ItemCreationWizardDraft
): SceneObjectItemArmorParts | undefined {
  const armorParts: SceneObjectItemArmorParts = {};
  ITEM_CREATION_ARMOR_PART_FIELDS.forEach((field) => {
    const parsed = parseIntegerDraft(draft.armorParts[field.key], 0, 999);
    if (parsed !== undefined) {
      armorParts[field.key] = parsed;
    }
  });
  return Object.values(armorParts).some((value) => value !== undefined)
    ? armorParts
    : undefined;
}

function resolveDraftArmorPartCostModifiers(
  baseProperties: SceneObjectItemProperties | undefined,
  draftArmorParts: SceneObjectItemArmorParts | undefined
): SceneObjectItemArmorParts | undefined {
  if (!baseProperties?.armorPartCostModifiers || !draftArmorParts) {
    return undefined;
  }
  const modifiers: SceneObjectItemArmorParts = {};
  ITEM_CREATION_ARMOR_PART_FIELDS.forEach((field) => {
    const draftPart = draftArmorParts[field.key];
    if (draftPart === undefined || draftPart !== baseProperties.armorParts?.[field.key]) {
      return;
    }
    const modifier = baseProperties.armorPartCostModifiers?.[field.key];
    if (modifier !== undefined) {
      modifiers[field.key] = modifier;
    }
  });
  return Object.values(modifiers).some((value) => value !== undefined)
    ? modifiers
    : undefined;
}

function parseMaterialColors(
  draft: ItemCreationWizardDraft
): SceneObjectItemMaterialColors | undefined {
  const materialColors: SceneObjectItemMaterialColors = {};
  ITEM_CREATION_MATERIAL_COLOR_FIELDS.forEach((field) => {
    const parsed = parseIntegerDraft(draft.materialColors[field.key], 0, 255);
    if (parsed !== undefined) {
      materialColors[field.key] = parsed;
    }
  });
  return Object.values(materialColors).some((value) => value !== undefined)
    ? materialColors
    : undefined;
}

function parsePropertyList(draft: ItemCreationWizardDraft): SceneObjectItemPropertyEntry[] {
  return draft.propertyList
    .map((entry) => {
      const property: SceneObjectItemPropertyEntry = {};
      const propertyName = parseIntegerDraft(entry.propertyName, 0, 65535);
      const subtype = parseIntegerDraft(entry.subtype, 0, 65535);
      const parsedCostTable = parseIntegerDraft(entry.costTable, 0, 255);
      const costTable =
        propertyName === AURORA_ONHIT_PROPERTY_NAME
          ? AURORA_ONHIT_COST_TABLE
          : parsedCostTable;
      const costValue = parseIntegerDraft(entry.costValue, 0, 65535);
      const param1 = parseIntegerDraft(entry.param1, 0, 255);
      const param1Value = parseIntegerDraft(entry.param1Value, 0, 255);
      const chanceAppear = parseIntegerDraft(entry.chanceAppear, 0, 100);
      if (propertyName !== undefined) {
        property.propertyName = propertyName;
      }
      if (entry.propertyLabel) {
        property.propertyLabel = entry.propertyLabel;
      }
      if (subtype !== undefined) {
        property.subtype = subtype;
      }
      if (costTable !== undefined) {
        property.costTable = costTable;
      }
      if (costValue !== undefined) {
        property.costValue = costValue;
      }
      if (param1 !== undefined) {
        property.param1 = param1;
      }
      if (param1Value !== undefined) {
        property.param1Value = param1Value;
      }
      if (chanceAppear !== undefined) {
        property.chanceAppear = chanceAppear;
      }
      if (entry.propertyDefinitionSource2daRow !== undefined) {
        property.propertyDefinitionSource2daRow = entry.propertyDefinitionSource2daRow;
      }
      if (entry.propertyDefinitionSourceKey) {
        property.propertyDefinitionSourceKey = entry.propertyDefinitionSourceKey;
      }
      if (entry.subTypeTable) {
        property.subTypeTable = entry.subTypeTable;
      }
      if (entry.costTableDefinition) {
        property.costTableDefinition = entry.costTableDefinition;
      }
      if (entry.param1Table) {
        property.param1Table = entry.param1Table;
      }
      if (entry.nameStrRef !== undefined) {
        property.nameStrRef = entry.nameStrRef;
      }
      if (entry.gameStrRef !== undefined) {
        property.gameStrRef = entry.gameStrRef;
      }
      if (entry.descriptionStrRef !== undefined) {
        property.descriptionStrRef = entry.descriptionStrRef;
      }
      return property;
    })
    .filter((entry) => entry.propertyName !== undefined);
}

function compactModelParts(parts: Array<number | undefined>): number[] {
  return parts.filter((part): part is number => typeof part === "number" && Number.isFinite(part));
}

export function sanitizeItemCreationNumberInput(value: string, max = 999): string {
  const digits = value.replace(/\D/gu, "").slice(0, String(max).length);
  if (digits.length < 1) {
    return "";
  }
  return String(Math.max(0, Math.min(max, Number.parseInt(digits, 10))));
}

export function isItemCreationWizardSceneObject(object: SceneObject): boolean {
  return object.kind === "items" && object.id.startsWith("itm_wizard_");
}

export function resolveItemCreationVisualMode(
  object: SceneObject | null | undefined
): "armor" | "threePart" | "singlePart" {
  const baseLabel = object?.itemProperties?.baseItemLabel?.trim().toLowerCase() ?? "";
  const modelType = [
    object?.itemProperties?.baseItemModelType,
    object?.itemProperties?.baseItemItemClass
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .trim()
    .toLowerCase();
  if (
    object?.itemProperties?.baseItem === 16 ||
    baseLabel === "armor" ||
    (object?.itemProperties?.armorPartModelCandidates?.length ?? 0) > 0
  ) {
    return "armor";
  }
  if ((object?.itemProperties?.modelParts?.length ?? 0) > 1) {
    return "threePart";
  }
  if (/^w[a-z0-9_]/u.test(modelType)) {
    return "threePart";
  }
  return "singlePart";
}

export function resolveItemCreationBaseOptions(objects: readonly SceneObject[]): ItemCreationBaseOption[] {
  const byBaseItem = new Map<number, ItemCreationBaseOption>();
  objects.forEach((object) => {
    if (object.kind !== "items") {
      return;
    }
    const baseItem = object.itemProperties?.baseItem;
    if (typeof baseItem !== "number" || !Number.isFinite(baseItem)) {
      return;
    }
    if (byBaseItem.has(baseItem)) {
      return;
    }
    byBaseItem.set(baseItem, {
      baseObjectId: object.id,
      baseItem,
      label: object.itemProperties?.baseItemLabel ?? `Base ${baseItem}`,
      modelType: object.itemProperties?.baseItemModelType ?? "-",
      defaultModel: object.itemProperties?.baseItemDefaultModel ?? "-",
      sampleResRef: object.resRef
    });
  });
  return [...byBaseItem.values()].sort((left, right) => {
    if (left.baseItem !== right.baseItem) {
      return left.baseItem - right.baseItem;
    }
    return left.label.localeCompare(right.label);
  });
}

export function resolveItemCreationPropertyOptions(
  objects: readonly SceneObject[],
  dictionary: readonly ItemApiPropertyDictionaryEntry[] = []
): ItemCreationPropertyOption[] {
  const byPropertyName = new Map<number, ItemCreationPropertyOption>();
  dictionary.forEach((entry) => {
    byPropertyName.set(entry.propertyName, {
      propertyName: entry.propertyName,
      label: entry.propertyLabel ?? entry.label,
      ...(entry.propertyLabel ? { propertyLabel: entry.propertyLabel } : {}),
      ...(entry.cost !== undefined ? { cost: entry.cost } : {}),
      ...(entry.costTableIndex !== undefined ? { sampleCostTable: entry.costTableIndex } : {}),
      ...(entry.param1TableIndex !== undefined ? { sampleParam1: entry.param1TableIndex } : {}),
      ...(entry.nameStrRef !== undefined ? { nameStrRef: entry.nameStrRef } : {}),
      ...(entry.gameStrRef !== undefined ? { gameStrRef: entry.gameStrRef } : {}),
      ...(entry.descriptionStrRef !== undefined
        ? { descriptionStrRef: entry.descriptionStrRef }
        : {}),
      ...(entry.subTypeTable ? { subTypeTable: entry.subTypeTable } : {}),
      ...(entry.costTableDefinition ? { costTableDefinition: entry.costTableDefinition } : {}),
      ...(entry.param1Table ? { param1Table: entry.param1Table } : {}),
      ...(entry.costTableLabel ? { costTableLabel: entry.costTableLabel } : {}),
      ...(entry.param1TableLabel ? { param1TableLabel: entry.param1TableLabel } : {}),
      ...(entry.subtypeOptions.length > 0
        ? { subtypeOptions: entry.subtypeOptions.map(mapDictionaryChoiceOption) }
        : {}),
      ...(entry.costValueOptions.length > 0
        ? { costValueOptions: entry.costValueOptions.map(mapDictionaryChoiceOption) }
        : {}),
      ...(entry.param1Options.length > 0
        ? { param1Options: entry.param1Options.map(mapDictionaryChoiceOption) }
        : {})
    });
  });
  objects.forEach((object) => {
    if (object.kind !== "items") {
      return;
    }
    (object.itemProperties?.propertyList ?? []).forEach((entry) => {
      if (typeof entry.propertyName !== "number" || !Number.isFinite(entry.propertyName)) {
        return;
      }
      const existing = byPropertyName.get(entry.propertyName);
      if (existing) {
        byPropertyName.set(entry.propertyName, {
          ...existing,
          ...(entry.subtype !== undefined && existing.sampleSubtype === undefined
            ? { sampleSubtype: entry.subtype }
            : {}),
          ...(entry.costTable !== undefined && existing.sampleCostTable === undefined
            ? { sampleCostTable: entry.costTable }
            : {}),
          ...(entry.costValue !== undefined && existing.sampleCostValue === undefined
            ? { sampleCostValue: entry.costValue }
            : {}),
          ...(entry.param1 !== undefined && existing.sampleParam1 === undefined
            ? { sampleParam1: entry.param1 }
            : {}),
          ...(entry.param1Value !== undefined && existing.sampleParam1Value === undefined
            ? { sampleParam1Value: entry.param1Value }
            : {}),
          ...(entry.chanceAppear !== undefined && existing.sampleChanceAppear === undefined
            ? { sampleChanceAppear: entry.chanceAppear }
            : {})
        });
        return;
      }
      byPropertyName.set(entry.propertyName, {
        propertyName: entry.propertyName,
        label: entry.propertyLabel ?? `Property ${entry.propertyName}`,
        ...(entry.propertyLabel ? { propertyLabel: entry.propertyLabel } : {}),
        ...(entry.subtype !== undefined ? { sampleSubtype: entry.subtype } : {}),
        ...(entry.costTable !== undefined ? { sampleCostTable: entry.costTable } : {}),
        ...(entry.costValue !== undefined ? { sampleCostValue: entry.costValue } : {}),
        ...(entry.param1 !== undefined ? { sampleParam1: entry.param1 } : {}),
        ...(entry.param1Value !== undefined ? { sampleParam1Value: entry.param1Value } : {}),
        ...(entry.chanceAppear !== undefined ? { sampleChanceAppear: entry.chanceAppear } : {}),
        ...(entry.propertyDefinitionSource2daRow !== undefined
          ? { propertyDefinitionSource2daRow: entry.propertyDefinitionSource2daRow }
          : {}),
        ...(entry.propertyDefinitionSourceKey
          ? { propertyDefinitionSourceKey: entry.propertyDefinitionSourceKey }
          : {}),
        ...(entry.subTypeTable ? { subTypeTable: entry.subTypeTable } : {}),
        ...(entry.costTableDefinition ? { costTableDefinition: entry.costTableDefinition } : {}),
        ...(entry.param1Table ? { param1Table: entry.param1Table } : {}),
        ...(entry.nameStrRef !== undefined ? { nameStrRef: entry.nameStrRef } : {}),
        ...(entry.gameStrRef !== undefined ? { gameStrRef: entry.gameStrRef } : {}),
        ...(entry.descriptionStrRef !== undefined
          ? { descriptionStrRef: entry.descriptionStrRef }
          : {})
      });
    });
  });
  return [...byPropertyName.values()].sort((left, right) => {
    if (left.propertyName !== right.propertyName) {
      return left.propertyName - right.propertyName;
    }
    return left.label.localeCompare(right.label);
  });
}

function mapDictionaryChoiceOption(
  option: ItemApiPropertyDictionaryOption
): ItemCreationPropertyChoiceOption {
  const labelParts = [
    option.label,
    option.nameStrRef !== undefined ? `strref ${option.nameStrRef}` : undefined,
    option.spellIndex !== undefined ? `spell ${option.spellIndex}` : undefined,
    option.cost !== undefined ? `cost ${option.cost}` : undefined
  ].filter((value): value is string => Boolean(value));
  return {
    value: option.rowId,
    label: labelParts.length > 0 ? labelParts.join(" / ") : `Row ${option.rowId}`,
    ...(option.nameStrRef !== undefined ? { nameStrRef: option.nameStrRef } : {}),
    ...(option.cost !== undefined ? { cost: option.cost } : {}),
    ...(option.potionCost !== undefined ? { potionCost: option.potionCost } : {}),
    ...(option.wandCost !== undefined ? { wandCost: option.wandCost } : {}),
    ...(option.casterLevel !== undefined ? { casterLevel: option.casterLevel } : {}),
    ...(option.innateLevel !== undefined ? { innateLevel: option.innateLevel } : {}),
    ...(option.spellIndex !== undefined ? { spellIndex: option.spellIndex } : {}),
    ...(option.potionUse !== undefined ? { potionUse: option.potionUse } : {}),
    ...(option.wandUse !== undefined ? { wandUse: option.wandUse } : {}),
    ...(option.generalUse !== undefined ? { generalUse: option.generalUse } : {}),
    ...(option.icon ? { icon: option.icon } : {}),
    ...(option.sourceKey ? { sourceKey: option.sourceKey } : {})
  };
}

export function createItemPropertyDraftFromOption(
  option: ItemCreationPropertyOption
): ItemCreationPropertyDraft {
  return {
    propertyName: String(option.propertyName),
    ...(option.propertyLabel ? { propertyLabel: option.propertyLabel } : {}),
    subtype: formatDraftNumber(option.sampleSubtype),
    costTable: formatDraftNumber(option.sampleCostTable),
    costValue: formatDraftNumber(option.sampleCostValue),
    param1: formatDraftNumber(option.sampleParam1),
    param1Value: formatDraftNumber(option.sampleParam1Value),
    chanceAppear: formatDraftNumber(option.sampleChanceAppear, "100"),
    ...(option.propertyDefinitionSource2daRow !== undefined
      ? { propertyDefinitionSource2daRow: option.propertyDefinitionSource2daRow }
      : {}),
    ...(option.propertyDefinitionSourceKey
      ? { propertyDefinitionSourceKey: option.propertyDefinitionSourceKey }
      : {}),
    ...(option.subTypeTable ? { subTypeTable: option.subTypeTable } : {}),
    ...(option.costTableDefinition ? { costTableDefinition: option.costTableDefinition } : {}),
    ...(option.param1Table ? { param1Table: option.param1Table } : {}),
    ...(option.nameStrRef !== undefined ? { nameStrRef: option.nameStrRef } : {}),
    ...(option.gameStrRef !== undefined ? { gameStrRef: option.gameStrRef } : {}),
    ...(option.descriptionStrRef !== undefined
      ? { descriptionStrRef: option.descriptionStrRef }
      : {})
  };
}

export function createEmptyItemPropertyDraft(): ItemCreationPropertyDraft {
  return {
    propertyName: "",
    subtype: "",
    costTable: "",
    costValue: "",
    param1: "",
    param1Value: "",
    chanceAppear: "100"
  };
}

export function createItemWizardDraft(
  baseObject: SceneObject,
  sequence: number
): ItemCreationWizardDraft {
  const properties = baseObject.itemProperties;
  const sequenceLabel = String(sequence).padStart(3, "0");
  const baseLabel = properties?.baseItemLabel ?? baseObject.resRef;
  const baseResRef = sanitizeIdentifier(baseObject.resRef, "item", 10);
  const armorParts = buildEmptyArmorPartsDraft();
  ITEM_CREATION_ARMOR_PART_FIELDS.forEach((field) => {
    armorParts[field.key] = formatDraftNumber(properties?.armorParts?.[field.key]);
  });
  const materialColors = buildEmptyMaterialColorsDraft();
  ITEM_CREATION_MATERIAL_COLOR_FIELDS.forEach((field) => {
    materialColors[field.key] = formatDraftNumber(properties?.materialColors?.[field.key]);
  });

  return {
    baseObjectId: baseObject.id,
    name: `Custom ${baseLabel}`,
    resRef: sanitizeIdentifier(`it_${baseResRef}_${sequenceLabel}`, `item_${sequenceLabel}`, 16),
    tag: sanitizeTag(`IT_${baseResRef}_${sequenceLabel}`, `ITEM_${sequenceLabel}`),
    description: properties?.description ?? "",
    identifiedDescription: properties?.identifiedDescription ?? "",
    modelPart1: formatDraftNumber(readModelPartValue(properties, "modelPart1", 0), "1"),
    modelPart2: formatDraftNumber(readModelPartValue(properties, "modelPart2", 1)),
    modelPart3: formatDraftNumber(readModelPartValue(properties, "modelPart3", 2)),
    armorContext: buildArmorContextDraft(properties),
    armorParts,
    materialColors,
    stackSize: formatDraftNumber(properties?.stackSize, "1"),
    charges: formatDraftNumber(properties?.charges, "0"),
    addCost: formatDraftNumber(properties?.addCost, "0"),
    identified: properties?.identified ?? true,
    plot: properties?.plot ?? false,
    stolen: properties?.stolen ?? false,
    cursed: properties?.cursed ?? false,
    overwriteExisting: false,
    propertyList: []
  };
}

export function createItemWizardDraftFromSceneObject(
  object: SceneObject
): ItemCreationWizardDraft {
  const properties = object.itemProperties;
  const armorParts = buildEmptyArmorPartsDraft();
  ITEM_CREATION_ARMOR_PART_FIELDS.forEach((field) => {
    armorParts[field.key] = formatDraftNumber(properties?.armorParts?.[field.key]);
  });
  const materialColors = buildEmptyMaterialColorsDraft();
  ITEM_CREATION_MATERIAL_COLOR_FIELDS.forEach((field) => {
    materialColors[field.key] = formatDraftNumber(properties?.materialColors?.[field.key]);
  });

  return {
    baseObjectId: object.id,
    name: object.name?.trim() || properties?.localizedName?.trim() || object.tag,
    resRef: sanitizeIdentifier(object.resRef, "item", 16),
    tag: sanitizeTag(object.tag, object.resRef),
    description: properties?.description ?? "",
    identifiedDescription: properties?.identifiedDescription ?? "",
    modelPart1: formatDraftNumber(readModelPartValue(properties, "modelPart1", 0), "1"),
    modelPart2: formatDraftNumber(readModelPartValue(properties, "modelPart2", 1)),
    modelPart3: formatDraftNumber(readModelPartValue(properties, "modelPart3", 2)),
    armorContext: buildArmorContextDraft(properties),
    armorParts,
    materialColors,
    stackSize: formatDraftNumber(properties?.stackSize, "1"),
    charges: formatDraftNumber(properties?.charges, "0"),
    addCost: formatDraftNumber(properties?.addCost, "0"),
    identified: properties?.identified ?? true,
    plot: properties?.plot ?? false,
    stolen: properties?.stolen ?? false,
    cursed: properties?.cursed ?? false,
    overwriteExisting: false,
    propertyList: (properties?.propertyList ?? []).map(createItemPropertyDraftFromSceneEntry)
  };
}

export function createDuplicateItemWizardDraftFromSceneObject(
  object: SceneObject,
  sequence: number
): ItemCreationWizardDraft {
  const sequenceLabel = String(sequence).padStart(3, "0");
  const baseResRef = sanitizeIdentifier(object.resRef, "item", 10);
  const baseTag = sanitizeTag(object.tag, object.resRef);
  return {
    ...createItemWizardDraftFromSceneObject(object),
    name: `${object.name?.trim() || object.tag} Copy`,
    resRef: sanitizeIdentifier(`${baseResRef}_${sequenceLabel}`, `item_${sequenceLabel}`, 16),
    tag: sanitizeTag(`${baseTag}_COPY_${sequenceLabel}`, `ITEM_${sequenceLabel}`)
  };
}

function createItemPropertyDraftFromSceneEntry(
  entry: SceneObjectItemPropertyEntry
): ItemCreationPropertyDraft {
  return {
    propertyName: formatDraftNumber(entry.propertyName),
    ...(entry.propertyLabel ? { propertyLabel: entry.propertyLabel } : {}),
    subtype: formatDraftNumber(entry.subtype),
    costTable: formatDraftNumber(entry.costTable),
    costValue: formatDraftNumber(entry.costValue),
    param1: formatDraftNumber(entry.param1),
    param1Value: formatDraftNumber(entry.param1Value),
    chanceAppear: formatDraftNumber(entry.chanceAppear, "100"),
    ...(entry.propertyDefinitionSource2daRow !== undefined
      ? { propertyDefinitionSource2daRow: entry.propertyDefinitionSource2daRow }
      : {}),
    ...(entry.propertyDefinitionSourceKey
      ? { propertyDefinitionSourceKey: entry.propertyDefinitionSourceKey }
      : {}),
    ...(entry.subTypeTable ? { subTypeTable: entry.subTypeTable } : {}),
    ...(entry.costTableDefinition ? { costTableDefinition: entry.costTableDefinition } : {}),
    ...(entry.param1Table ? { param1Table: entry.param1Table } : {}),
    ...(entry.nameStrRef !== undefined ? { nameStrRef: entry.nameStrRef } : {}),
    ...(entry.gameStrRef !== undefined ? { gameStrRef: entry.gameStrRef } : {}),
    ...(entry.descriptionStrRef !== undefined
      ? { descriptionStrRef: entry.descriptionStrRef }
      : {})
  };
}

export function createItemSceneObjectFromWizardDraft(
  draft: ItemCreationWizardDraft,
  baseObject: SceneObject,
  sequence: number,
  propertyOptions: readonly ItemCreationPropertyOption[] = []
): SceneObject {
  const object = createNewSceneObject("items", baseObject.x, baseObject.y, sequence);
  const resRef = sanitizeIdentifier(draft.resRef, `item_${sequence}`, 16);
  const tag = sanitizeTag(draft.tag, resRef);
  const name = draft.name.trim() || tag;
  const visualMode = resolveItemCreationVisualMode(baseObject);
  const modelPart1 = visualMode === "armor" ? undefined : parseIntegerDraft(draft.modelPart1, 0, 999);
  const modelPart2 = visualMode === "armor" ? undefined : parseIntegerDraft(draft.modelPart2, 0, 999);
  const modelPart3 = visualMode === "armor" ? undefined : parseIntegerDraft(draft.modelPart3, 0, 999);
  const modelParts =
    visualMode === "armor" ? [] : compactModelParts([modelPart1, modelPart2, modelPart3]);
  const armorPreviewContext = visualMode === "armor" ? parseArmorContext(draft) : undefined;
  const armorParts = parseArmorParts(draft);
  const materialColors = parseMaterialColors(draft);
  const propertyList = parsePropertyList(draft);
  const baseProperties = cloneItemProperties(baseObject.itemProperties);
  const stackSize = parseIntegerDraft(draft.stackSize, 1, 999);
  const charges = parseIntegerDraft(draft.charges, 0, 255);
  const addCost = parseIntegerDraft(draft.addCost, 0, 999999);
  const armorPartCostModifiers = resolveDraftArmorPartCostModifiers(
    baseObject.itemProperties,
    armorParts
  );
  const costBreakdown = calculateAuroraItemCostBreakdown(
    {
      ...baseProperties,
      ...(armorParts ? { armorParts } : {}),
      ...(armorPartCostModifiers ? { armorPartCostModifiers } : {}),
      ...(propertyList.length > 0 ? { propertyList } : {}),
      ...(stackSize !== undefined ? { stackSize } : {}),
      ...(addCost !== undefined ? { addCost } : {})
    },
    propertyOptions
  );

  return {
    ...object,
    id: `itm_wizard_${resRef}_${sequence}`,
    name,
    resRef,
    tag,
    previewImageUrl: baseObject.previewImageUrl,
    isStatic: false,
    source: {
      ...baseObject.source,
      type: "aurora_git",
      sourceObjectId: baseObject.source?.sourceObjectId ?? baseObject.id,
      sourceKind: "item",
      templateId: baseObject.source?.templateId ?? baseObject.id,
      sourceModelResRef: baseObject.resRef,
      localizedName: name,
      description: draft.description
    },
    itemProperties: {
      ...baseProperties,
      localizedName: name,
      description: draft.description,
      identifiedDescription: draft.identifiedDescription,
      baseItem: baseObject.itemProperties?.baseItem,
      baseItemLabel: baseObject.itemProperties?.baseItemLabel,
      baseItemSourceKey: baseObject.itemProperties?.baseItemSourceKey,
      baseItemModelType: baseObject.itemProperties?.baseItemModelType,
      baseItemDefaultModel: baseObject.itemProperties?.baseItemDefaultModel,
      modelPart1,
      modelPart2,
      modelPart3,
      ...(modelParts.length > 0 ? { modelParts } : {}),
      ...(armorPreviewContext ? { armorPreviewContext } : {}),
      ...(armorParts ? { armorParts } : {}),
      ...(armorPartCostModifiers ? { armorPartCostModifiers } : {}),
      ...(materialColors ? { materialColors } : {}),
      ...(propertyList.length > 0 ? { propertyList } : {}),
      cost: costBreakdown.finalCost,
      ...(stackSize !== undefined ? { stackSize } : {}),
      ...(charges !== undefined ? { charges } : {}),
      ...(addCost !== undefined ? { addCost } : {}),
      identified: draft.identified,
      plot: draft.plot,
      stolen: draft.stolen,
      cursed: draft.cursed
    }
  };
}

function validateSpecialItemPropertyDrafts(
  entries: readonly ItemCreationPropertyDraft[]
): ItemCreationValidationIssue[] {
  const issues: ItemCreationValidationIssue[] = [];
  entries.forEach((entry, index) => {
    const label = entry.propertyLabel?.trim() || `Property ${index + 1}`;
    const propertyName = resolveDraftPropertyName(entry);
    const subtype = parseIntegerDraft(entry.subtype, 0, 65535);
    const costTable = resolveDraftCostTable(entry);
    const rawCostTable = parseIntegerDraft(entry.costTable, 0, 255);
    const costValue = resolveDraftCostValue(entry);
    const kind = resolveSpecialItemPropertyKind(entry);

    if (kind === "castSpell" && (subtype === undefined || costTable === undefined || costValue === undefined)) {
      issues.push({
        code: "PROPERTY_CASTSPELL_REQUIRES_SPELL_AND_USES",
        severity: "error",
        message: "CastSpell requires a spell subtype plus cost table/value uses."
      });
    }
    if (kind === "light" && costValue === undefined) {
      issues.push({
        code: "PROPERTY_LIGHT_REQUIRES_BRIGHTNESS",
        severity: "warn",
        message: `${label} should select a light brightness from iprp_lightcost.`
      });
    }
    if (kind === "light" && parseIntegerDraft(entry.param1Value, 0, 255) === undefined) {
      issues.push({
        code: "PROPERTY_LIGHT_REQUIRES_COLOR",
        severity: "warn",
        message: `${label} should select a light color from iprp_color.`
      });
    }
    if (kind === "onHit" && subtype === undefined) {
      issues.push({
        code: "PROPERTY_ONHIT_REQUIRES_SUBTYPE",
        severity: "warn",
        message: `${label} should select an OnHit subtype before saving.`
      });
    }
    if (kind === "unlimitedAmmo" && subtype === undefined) {
      issues.push({
        code: "PROPERTY_UNLIMITED_AMMO_REQUIRES_AMMO_TYPE",
        severity: "warn",
        message: `${label} should select an ammunition subtype before saving.`
      });
    }
    if (kind === "poison" && subtype === undefined) {
      issues.push({
        code: "PROPERTY_POISON_REQUIRES_POISON_TYPE",
        severity: "warn",
        message: `${label} should select a poison subtype before saving.`
      });
    }
    if (
      propertyName === AURORA_ONHIT_PROPERTY_NAME &&
      rawCostTable !== AURORA_ONHIT_COST_TABLE
    ) {
      issues.push({
        code: "PROPERTY_ONHIT_COST_TABLE_FORCED",
        severity: "info",
        message: `OnHit uses Aurora CostTable ${AURORA_ONHIT_COST_TABLE}; the wizard will serialize that value.`
      });
    }
    if (costTable !== undefined && costValue === undefined) {
      issues.push({
        code: "PROPERTY_COST_VALUE_MISSING",
        severity: "warn",
        message: `${label} has a cost table but no cost value.`
      });
    }
    if (costValue !== undefined && costTable === undefined) {
      issues.push({
        code: "PROPERTY_COST_TABLE_MISSING",
        severity: "warn",
        message: `${label} has a cost value but no cost table.`
      });
    }
  });
  return issues;
}

export function validateItemCreationDraft(
  draft: ItemCreationWizardDraft,
  baseObject: SceneObject,
  propertyOptions: readonly ItemCreationPropertyOption[] = []
): ItemCreationValidationIssue[] {
  const properties = baseObject.itemProperties;
  const issues: ItemCreationValidationIssue[] = [];
  const stackSize = parseIntegerDraft(draft.stackSize, 1, 999);
  const charges = parseIntegerDraft(draft.charges, 0, 255);
  const addCost = parseIntegerDraft(draft.addCost, 0, 999999);
  const maxStacking =
    typeof properties?.baseItemStacking === "number" && Number.isFinite(properties.baseItemStacking)
      ? Math.max(0, Math.trunc(properties.baseItemStacking))
      : undefined;
  const chargesStarting =
    typeof properties?.baseItemChargesStarting === "number" &&
    Number.isFinite(properties.baseItemChargesStarting)
      ? Math.max(0, Math.trunc(properties.baseItemChargesStarting))
      : undefined;
  const maxProps =
    typeof properties?.baseItemMaxProps === "number" && Number.isFinite(properties.baseItemMaxProps)
      ? Math.max(0, Math.trunc(properties.baseItemMaxProps))
      : undefined;
  const minProps =
    typeof properties?.baseItemMinProps === "number" && Number.isFinite(properties.baseItemMinProps)
      ? Math.max(0, Math.trunc(properties.baseItemMinProps))
      : undefined;
  const baseCost =
    typeof properties?.baseItemBaseCost === "number" && Number.isFinite(properties.baseItemBaseCost)
      ? Math.max(0, Math.trunc(properties.baseItemBaseCost))
      : undefined;
  const equipableSlots = formatItemEquipSlotMask(properties?.baseItemEquipableSlots);
  const parsedPropertyList = parsePropertyList(draft);
  const propertyCount = parsedPropertyList.length;
  const parsedArmorParts = parseArmorParts(draft);
  const armorPreviewContext = parseArmorContext(draft);
  const armorPartCostModifiers = resolveDraftArmorPartCostModifiers(properties, parsedArmorParts);
  const costBreakdown = calculateAuroraItemCostBreakdown(
    {
      ...(properties ?? {}),
      ...(parsedArmorParts ? { armorParts: parsedArmorParts } : {}),
      ...(armorPartCostModifiers ? { armorPartCostModifiers } : {}),
      ...(parsedPropertyList.length > 0 ? { propertyList: parsedPropertyList } : {}),
      ...(stackSize !== undefined ? { stackSize } : {}),
      ...(addCost !== undefined ? { addCost } : {})
    },
    propertyOptions
  );

  if (stackSize !== undefined && maxStacking !== undefined && maxStacking > 0 && stackSize > maxStacking) {
    issues.push({
      code: "STACK_SIZE_EXCEEDS_BASEITEM_STACKING",
      severity: "error",
      message: `Stack size ${stackSize} exceeds baseitems.2da Stacking ${maxStacking}.`
    });
  }
  if (charges !== undefined && charges > 0 && chargesStarting === 0) {
    issues.push({
      code: "CHARGES_ON_BASEITEM_WITHOUT_STARTING_CHARGES",
      severity: "warn",
      message: "Charges are set, but baseitems.2da ChargesStarting is 0 for this type."
    });
  }
  if (maxProps !== undefined && propertyCount > maxProps) {
    issues.push({
      code: "PROPERTY_COUNT_EXCEEDS_BASEITEM_MAX_PROPS",
      severity: "error",
      message: `Property count ${propertyCount} exceeds baseitems.2da MaxProps ${maxProps}.`
    });
  }
  if (minProps !== undefined && minProps > 0 && propertyCount < minProps) {
    issues.push({
      code: "PROPERTY_COUNT_BELOW_BASEITEM_MIN_PROPS",
      severity: "info",
      message: `Property count ${propertyCount} is below baseitems.2da MinProps ${minProps}.`
    });
  }
  if (equipableSlots) {
    issues.push({
      code: "BASEITEM_EQUIPABLE_SLOTS_CONTEXT",
      severity: "info",
      message: `Base item equipable slots: ${equipableSlots}.`
    });
  }
  if (costBreakdown.ilrStackStatus === "exceeds-limit") {
    issues.push({
      code: "STACK_SIZE_EXCEEDS_BASEITEM_ILR_STACK_SIZE",
      severity: "warn",
      message: `Stack size ${costBreakdown.stackSize} exceeds baseitems.2da ILRStackSize ${costBreakdown.ilrStackSize}.`
    });
  }
  if (baseCost !== undefined && addCost !== undefined && addCost > 0) {
    issues.push({
      code: "BASEITEM_COST_CONTEXT",
      severity: "info",
      message: `Base item cost ${baseCost}, item multiplier ${costBreakdown.itemMultiplier}, AddCost ${addCost}.`
    });
  }
  if (
    costBreakdown.resolvedPropertyCount > 0 ||
    costBreakdown.resolvedArmorPartCount > 0 ||
    baseCost !== undefined
  ) {
    issues.push({
      code: "PROPERTY_COST_CONTEXT",
      severity: "info",
      message: `Aurora cost estimate ${costBreakdown.finalCost}: BaseCost ${costBreakdown.baseCost}, armor modifiers ${costBreakdown.armorPartCostModifierTotal} from ${costBreakdown.resolvedArmorPartCount} part(s), property subtotal ${costBreakdown.propertyCostSubtotal}, CastSpell subtotal ${costBreakdown.castSpellPropertyCostSubtotal}, ItemMultiplier ${costBreakdown.itemMultiplier}, StackSize ${costBreakdown.costStackSize}, AddCost ${costBreakdown.addCost}.`
    });
  }
  if (
    costBreakdown.unresolvedPropertyCount > 0 ||
    costBreakdown.unresolvedArmorPartCount > 0
  ) {
    issues.push({
      code: "PROPERTY_COST_UNRESOLVED",
      severity: "warn",
      message: `${costBreakdown.unresolvedPropertyCount} property cost value(s) and ${costBreakdown.unresolvedArmorPartCount} armor part modifier(s) are unresolved.`
    });
  }
  if (resolveItemCreationVisualMode(baseObject) === "armor" && !armorPreviewContext) {
    issues.push({
      code: "ARMOR_CONTEXT_INVALID",
      severity: "error",
      message:
        "Armor mannequin prefix must use Aurora player body format, for example pmh0_ or pfh2_."
    });
  }
  const missingArmorSources = collectMissingArmorPartSourceLabels(draft, baseObject);
  if (missingArmorSources.length > 0) {
    const visible = missingArmorSources.slice(0, 6);
    const hiddenCount = Math.max(0, missingArmorSources.length - visible.length);
    issues.push({
      code: "ARMOR_PART_SOURCE_MISSING",
      severity: "warn",
      message: `No delivered CAPART/parts_* model source is known for ${visible.join(", ")}${
        hiddenCount > 0 ? ` and ${hiddenCount} more` : ""
      }.`
    });
  }
  if ((properties?.baseItemReqFeats?.length ?? 0) > 0) {
    issues.push({
      code: "BASEITEM_REQUIRES_FEATS",
      severity: "info",
      message: `Base item requires feat rows ${properties?.baseItemReqFeats?.join(", ")}.`
    });
  }
  issues.push(...validateSpecialItemPropertyDrafts(draft.propertyList));
  return issues;
}

export function buildItemBlueprintCreatePayloadFromWizardSceneObject(
  object: SceneObject,
  options: { overwrite?: boolean } = {}
): ItemApiBlueprintCreatePayload | null {
  const properties = object.itemProperties;
  if (!properties || typeof properties.baseItem !== "number") {
    return null;
  }

  const resRef = sanitizeIdentifier(object.resRef, "item", 16);
  const tag = sanitizeTag(object.tag, resRef);
  const propertyList = (properties.propertyList ?? [])
    .map(mapSceneObjectItemPropertyEntryToBlueprintPayload)
    .filter((entry): entry is ItemApiBlueprintPropertyEntry => Boolean(entry));
  const variableListEntries = readItemVariableTargetEntries(properties.variables ?? []);
  if (!variableListEntries) {
    return null;
  }
  const blueprintReferenceLists = readItemBlueprintReferenceLists(
    properties.blueprintInventoryItems ?? [],
    properties.blueprintEquippedItems ?? [],
    resRef,
  );
  if (!blueprintReferenceLists) {
    return null;
  }
  const payload: ItemApiBlueprintCreatePayload = {
    templateResRef: resRef,
    name: properties.localizedName?.trim() || (object.name ?? "").trim() || tag,
    localizedNameStrRef: properties.localizedNameStrRef,
    tag,
    baseItem: properties.baseItem,
    identified: properties.identified ?? true,
    plot: properties.plot ?? false,
    stolen: properties.stolen ?? false,
    cursed: properties.cursed ?? false,
    overwrite: options.overwrite ?? false
  };

  setOptionalBlueprintPayloadValue(payload, "description", properties.description);
  setOptionalBlueprintPayloadValue(payload, "descriptionStrRef", properties.descriptionStrRef);
  setOptionalBlueprintPayloadValue(
    payload,
    "identifiedDescription",
    properties.identifiedDescription
  );
  setOptionalBlueprintPayloadValue(
    payload,
    "identifiedDescriptionStrRef",
    properties.identifiedDescriptionStrRef
  );
  setOptionalBlueprintPayloadValue(payload, "comments", properties.comments);
  setOptionalBlueprintPayloadValue(payload, "paletteId", properties.paletteId);
  setOptionalBlueprintPayloadValue(payload, "modelPart1", resolveBlueprintModelPart1(properties));
  setOptionalBlueprintPayloadValue(payload, "modelPart2", properties.modelPart2);
  setOptionalBlueprintPayloadValue(payload, "modelPart3", properties.modelPart3);
  setOptionalBlueprintPayloadValue(payload, "cost", properties.cost);
  setOptionalBlueprintPayloadValue(payload, "addCost", properties.addCost);
  setOptionalBlueprintPayloadValue(payload, "charges", properties.charges);
  setOptionalBlueprintPayloadValue(payload, "stackSize", properties.stackSize);
  if (properties.armorParts) {
    payload.armorParts = { ...properties.armorParts };
  }
  if (properties.armorPreviewContext?.modelPrefix) {
    payload.armorContext = { ...properties.armorPreviewContext };
  }
  if (properties.materialColors) {
    payload.materialColors = { ...properties.materialColors };
  }
  if (propertyList.length > 0) {
    payload.propertyList = propertyList;
  }
  if (variableListEntries.length > 0) {
    payload.variableListEntries = variableListEntries.map((entry) => ({ ...entry }));
  }
  if (blueprintReferenceLists.inventory.length > 0) {
    payload.inventoryItemListEntries = blueprintReferenceLists.inventory.map((entry) => ({
      ...entry,
    }));
  }
  if (blueprintReferenceLists.equipment.length > 0) {
    payload.equipItemListEntries = blueprintReferenceLists.equipment.map((entry) => ({
      ...entry,
    }));
  }

  return payload;
}

function resolveBlueprintModelPart1(
  properties: SceneObjectItemProperties
): number | undefined {
  return properties.modelPart1 ?? properties.modelParts?.[0] ?? properties.cloakModelRow;
}

function mapSceneObjectItemPropertyEntryToBlueprintPayload(
  entry: SceneObjectItemPropertyEntry
): ItemApiBlueprintPropertyEntry | null {
  if (typeof entry.propertyName !== "number") {
    return null;
  }
  const payload: ItemApiBlueprintPropertyEntry = {
    propertyName: entry.propertyName
  };
  setOptionalItemPropertyPayloadValue(payload, "subtype", entry.subtype);
  setOptionalItemPropertyPayloadValue(payload, "costTable", entry.costTable);
  setOptionalItemPropertyPayloadValue(payload, "costValue", entry.costValue);
  setOptionalItemPropertyPayloadValue(payload, "param1", entry.param1);
  setOptionalItemPropertyPayloadValue(payload, "param1Value", entry.param1Value);
  setOptionalItemPropertyPayloadValue(payload, "chanceAppear", entry.chanceAppear);
  return payload;
}

function setOptionalBlueprintPayloadValue(
  payload: ItemApiBlueprintCreatePayload,
  key: keyof ItemApiBlueprintCreatePayload,
  value: string | number | undefined
): void {
  if (value !== undefined && (typeof value !== "string" || value.trim().length > 0)) {
    (payload as unknown as Record<string, unknown>)[key] = value;
  }
}

function setOptionalItemPropertyPayloadValue(
  payload: ItemApiBlueprintPropertyEntry,
  key: keyof ItemApiBlueprintPropertyEntry,
  value: number | undefined
): void {
  if (value !== undefined) {
    payload[key] = value;
  }
}

export function buildItemVisualOverrideFromSceneObjectItem(
  object: SceneObject
): ItemApiVisualOverride | undefined {
  const properties = object.itemProperties;
  if (!properties) {
    return undefined;
  }
  const override: ItemApiVisualOverride = {};
  const modelPart1 = resolveBlueprintModelPart1(properties);
  const modelPart2 = properties.modelPart2 ?? properties.modelParts?.[1];
  const modelPart3 = properties.modelPart3 ?? properties.modelParts?.[2];
  if (typeof modelPart1 === "number") {
    override.modelPart1 = modelPart1;
  }
  if (typeof modelPart2 === "number") {
    override.modelPart2 = modelPart2;
  }
  if (typeof modelPart3 === "number") {
    override.modelPart3 = modelPart3;
  }
  if (properties.armorParts) {
    override.armorParts = { ...properties.armorParts };
  }
  if (properties.armorPreviewContext?.modelPrefix) {
    override.armorContext = { ...properties.armorPreviewContext };
  }
  if (properties.materialColors) {
    override.materialColors = { ...properties.materialColors };
  }
  return Object.keys(override).length > 0 ? override : undefined;
}

export function mergeProcessedItemWizardSceneObject(
  sourceObject: SceneObject,
  processedObject: SceneObject
): SceneObject {
  const sourceProperties = cloneItemProperties(sourceObject.itemProperties);
  const processedProperties = cloneItemProperties(processedObject.itemProperties);
  return {
    ...processedObject,
    id: sourceObject.id,
    name: sourceObject.name,
    resRef: sourceObject.resRef,
    tag: sourceObject.tag,
    source: sourceObject.source,
    previewImageUrl: sourceObject.previewImageUrl ?? processedObject.previewImageUrl,
    itemProperties: {
      ...processedProperties,
      ...sourceProperties,
      modelPartCandidates:
        processedProperties.modelPartCandidates ?? sourceProperties.modelPartCandidates,
      armorPartModelCandidates:
        processedProperties.armorPartModelCandidates ??
        sourceProperties.armorPartModelCandidates,
      armorPreviewContext:
        processedProperties.armorPreviewContext ?? sourceProperties.armorPreviewContext,
      modelAssetCandidates:
        processedProperties.modelAssetCandidates ?? sourceProperties.modelAssetCandidates,
      modelPartResRefs:
        processedProperties.modelPartResRefs ?? sourceProperties.modelPartResRefs,
      modelPartResRefRoles:
        processedProperties.modelPartResRefRoles ?? sourceProperties.modelPartResRefRoles,
      cloakModelRow: processedProperties.cloakModelRow,
      cloakModel: processedProperties.cloakModel,
      cloakTexture: processedProperties.cloakTexture,
      cloakIcon: processedProperties.cloakIcon,
      cloakModelResRef: processedProperties.cloakModelResRef,
      cloakTextureResRef: processedProperties.cloakTextureResRef,
      cloakIconResRef: processedProperties.cloakIconResRef,
      cloakHiddenSlots: processedProperties.cloakHiddenSlots,
      cloakSourceKey: processedProperties.cloakSourceKey,
      armorRobeHiddenSlots: processedProperties.armorRobeHiddenSlots
    }
  };
}
