import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import type { SceneObject } from "../contracts";
import {
  resolveItemArmorParts,
  resolveItemMaterialColorHex,
  resolveItemMaterialColors,
  resolveItemModelParts,
  summarizeItemAssembly
} from "../../items/application/itemPresentation";
import {
  composeItemIconPreview,
  resolveDecodedItemIconPreview,
  type ItemIconComposition
} from "../../items/application/itemIconComposer";
import { resolveItemVisualSupportInfo } from "../../items/application/itemVisualSupport";
import {
  resolveItemArmorPartModelResolutions,
  resolveItemModelPartResolutions
} from "../../items/application/itemRenderAssetResolver";
import { shouldPreferItemModelThumbnailOverIcon } from "../../items/application/itemThumbnailModelPreference";
import {
  createItemPropertyDraftFromOption,
  createDuplicateItemWizardDraftFromSceneObject,
  createEmptyItemPropertyDraft,
  createItemSceneObjectFromWizardDraft,
  createItemWizardDraft,
  createItemWizardDraftFromSceneObject,
  ITEM_CREATION_ARMOR_CONTEXT_PRESETS,
  ITEM_CREATION_ARMOR_PART_FIELDS,
  ITEM_CREATION_MATERIAL_COLOR_FIELDS,
  ITEM_CREATION_WIZARD_STEPS,
  isItemCreationWizardSceneObject,
  resolveItemCreationBaseOptions,
  resolveItemCreationPropertyOptions,
  resolveItemCreationVisualMode,
  sanitizeItemCreationNumberInput,
  validateItemCreationDraft,
  type ItemCreationPropertyChoiceOption,
  type ItemCreationPropertyDraft,
  type ItemCreationPropertyOption,
  type ItemCreationWizardDraft,
  type ItemCreationWizardStep
} from "../../items/application/itemCreationWizard";
import {
  collectItemPaletteFilterOptions,
  formatItemPaletteFilterLabel
} from "../../items/application/itemPaletteTreeFilter";
import type {
  ItemApiCustomPaletteWritePayload,
  ItemApiGeneratorSupportResult,
  ItemApiPaletteTreeResult,
  ItemApiPropertyDictionaryEntry
} from "../../items/contracts";
import {
  buildStoreBlueprintCreatePayloadFromDraft,
  createDuplicateStoreWizardDraftFromStore,
  createEmptyStoreBucketItemDraft,
  createStoreWizardDraft,
  createStoreWizardDraftFromStore,
  sanitizeStoreCreationNumberInput,
  sanitizeStoreCreationResRef,
  sanitizeStoreCreationSignedIntInput,
  sanitizeStoreCreationTag,
  STORE_CREATION_BUCKET_COUNT,
  type StoreCreationEmbeddedItemSummary,
  type StoreCreationBucketItemDraft,
  type StoreCreationWizardDraft
} from "../../stores/application/storeCreationWizard";
import type { StoreApiBlueprintCreatePayload, StoreApiListItem } from "../../stores/contracts";
import { SceneObjectThumbnail } from "./SceneObjectThumbnail";

interface ItemsModePanelProps {
  objects: SceneObject[];
  total: number;
  activeObjectId: string | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onResetFilters: () => void;
  onObjectClick: (object: SceneObject) => void;
  onCreateItem?: (
    object: SceneObject,
    options?: { overwrite?: boolean }
  ) => void | Promise<void>;
  onUpdateItem?: (resRef: string, object: SceneObject) => void | Promise<void>;
  onCreateStore?: (payload: StoreApiBlueprintCreatePayload) => void | Promise<void>;
  onUpdateStore?: (
    resRef: string,
    payload: StoreApiBlueprintCreatePayload
  ) => void | Promise<void>;
  onDeleteStore?: (store: StoreApiListItem) => void | Promise<void>;
  onWriteCustomPalette?: (payload: ItemApiCustomPaletteWritePayload) => void | Promise<void>;
  onDeleteItem?: (object: SceneObject) => void | Promise<void>;
  creationBaseObjects?: SceneObject[];
  stores?: StoreApiListItem[];
  propertyDictionary?: ItemApiPropertyDictionaryEntry[];
  paletteTree?: ItemApiPaletteTreeResult | null;
  generatorSupport?: ItemApiGeneratorSupportResult | null;
  processedPreviewObjectsById?: Record<string, SceneObject>;
  previewThumbnailUrlsByObjectId?: Record<string, string>;
  createSequence?: number;
  storeCreateSequence?: number;
  storeCreatorStatus?: "idle" | "applying";
  storeCreatorErrorMessage?: string | null;
  backendAccessToken?: string | null;
  isLoading: boolean;
  loadErrorMessage: string | null;
}

const ITEMS_MODE_VISIBLE_BATCH_SIZE = 250;
const ITEM_ICON_DECODE_RETRY_LIMIT = 8;
const ITEM_ICON_DECODE_RETRY_DELAY_MS = 900;

type ItemCreationNumericPropertyDraftKey =
  | "subtype"
  | "costTable"
  | "costValue"
  | "param1"
  | "param1Value"
  | "chanceAppear";

type ItemIconDecodeStatus = {
  status: "loading" | "retrying" | "decoded" | "failed";
  message: string;
};

const ITEM_CREATION_PROPERTY_NUMBER_FIELDS: ReadonlyArray<{
  key: ItemCreationNumericPropertyDraftKey;
  label: string;
  max: number;
}> = [
  { key: "subtype", label: "Subtype", max: 65535 },
  { key: "costTable", label: "Cost Table", max: 255 },
  { key: "costValue", label: "Cost Value", max: 65535 },
  { key: "param1", label: "Param 1", max: 255 },
  { key: "param1Value", label: "Param 1 Value", max: 255 },
  { key: "chanceAppear", label: "Chance", max: 100 }
];

function trimWorkspacePreviewLabel(label: string): string {
  return label.slice(0, 8).toUpperCase();
}

function formatItemDetail(object: SceneObject): string {
  const properties = object.itemProperties;
  const cost = typeof properties?.cost === "number" ? `Cost ${properties.cost}` : "";
  return [summarizeItemAssembly(object), cost].filter((value) => value.length > 0).join(" | ");
}

function formatEmbeddedStoreItemLabel(
  embeddedItem: StoreCreationEmbeddedItemSummary | undefined
): string | null {
  if (!embeddedItem) {
    return null;
  }
  const identifier =
    embeddedItem.templateResRef ?? embeddedItem.tag ?? embeddedItem.localizedName ?? "Item";
  const details = [
    embeddedItem.localizedName && embeddedItem.localizedName !== identifier
      ? embeddedItem.localizedName
      : undefined,
    typeof embeddedItem.baseItem === "number" ? `Base ${embeddedItem.baseItem}` : undefined,
    typeof embeddedItem.itemPropertyListCount === "number"
      ? `${embeddedItem.itemPropertyListCount} props`
      : undefined
  ].filter((value): value is string => Boolean(value));
  return details.length > 0
    ? `Embedded ${identifier} (${details.join(", ")})`
    : `Embedded ${identifier}`;
}

function sanitizeResRefInput(value: string): string {
  return value
    .trimStart()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "_")
    .replace(/_{2,}/gu, "_")
    .slice(0, 16);
}

function normalizeItemResRefKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeStoreResRefKey(value: string): string {
  return value.trim().toLowerCase();
}

function resolveItemIconPreviewCacheKey(preview: ItemIconComposition): string {
  return `${preview.iconResRef}:${preview.assetId ?? preview.rawAssetUrl ?? preview.source}`;
}

function resolvePersistedBackendAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem("aurora_web.auth_session.v1");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {
      session?: {
        accessToken?: unknown;
      };
    };
    const token = parsed.session?.accessToken;
    return typeof token === "string" && token.trim().length > 0 ? token.trim() : null;
  } catch {
    return null;
  }
}

function resolveItemInventoryIconStyle(
  grid: ItemIconComposition["inventoryGrid"]
): CSSProperties {
  const maxFrameSize = 44;
  const minFrameSize = 18;
  const maxSlots = Math.max(grid.widthSlots, grid.heightSlots, 1);
  const frameWidth = Math.max(
    minFrameSize,
    Math.round((maxFrameSize * grid.widthSlots) / maxSlots)
  );
  const frameHeight = Math.max(
    minFrameSize,
    Math.round((maxFrameSize * grid.heightSlots) / maxSlots)
  );
  return {
    "--item-inventory-frame-width": `${frameWidth}px`,
    "--item-inventory-frame-height": `${frameHeight}px`,
    "--item-inventory-grid-columns": String(grid.widthSlots),
    "--item-inventory-grid-rows": String(grid.heightSlots)
  } as CSSProperties;
}

function isShieldItemThumbnailSource(object: SceneObject): boolean {
  const modelType = object.itemProperties?.baseItemModelType?.trim().toLowerCase() ?? "";
  const label = object.itemProperties?.baseItemLabel?.trim().toLowerCase() ?? "";
  const resRefs = object.itemProperties?.modelPartResRefs ?? [];
  return (
    modelType.startsWith("ash") ||
    label.includes("shield") ||
    resRefs.some((resRef) => resRef.trim().toLowerCase().startsWith("ash"))
  );
}

function resolveNextAvailableItemResRef(
  currentValue: string,
  existingResRefs: ReadonlySet<string>,
  sequence: number
): string {
  const sanitizedCurrent = sanitizeResRefInput(currentValue) || "item";
  const stemSource =
    sanitizedCurrent.replace(/_?\d{1,3}$/u, "").replace(/_+$/u, "") || "item";

  for (let offset = 0; offset < 1000; offset += 1) {
    const suffix = `_${String(sequence + offset).padStart(3, "0").slice(-3)}`;
    const stem = stemSource.slice(0, 16 - suffix.length).replace(/_+$/u, "") || "item";
    const candidate = sanitizeResRefInput(`${stem}${suffix}`);
    if (candidate && !existingResRefs.has(candidate)) {
      return candidate;
    }
  }

  return sanitizedCurrent;
}

function resolveNextAvailableStoreResRef(
  currentValue: string,
  existingResRefs: ReadonlySet<string>,
  sequence: number
): string {
  const sanitizedCurrent = sanitizeStoreCreationResRef(currentValue) || "store";
  const stemSource =
    sanitizedCurrent.replace(/_?\d{1,3}$/u, "").replace(/_+$/u, "") || "store";

  for (let offset = 0; offset < 1000; offset += 1) {
    const suffix = `_${String(sequence + offset).padStart(3, "0").slice(-3)}`;
    const stem = stemSource.slice(0, 16 - suffix.length).replace(/_+$/u, "") || "store";
    const candidate = sanitizeStoreCreationResRef(`${stem}${suffix}`);
    if (candidate && !existingResRefs.has(candidate)) {
      return candidate;
    }
  }

  return sanitizedCurrent;
}

function readStoreMetadataString(store: StoreApiListItem, key: string): string {
  const value = store.metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function isModuleBackedStoreBlueprint(store: StoreApiListItem): boolean {
  if (store.category === "custom" && store.tags.includes("wizard")) {
    return true;
  }
  if (store.metadata?.createdByStoreWizard === true) {
    return true;
  }
  if (readStoreMetadataString(store, "sourceGeneratedBy") === "aurora-web-store-wizard") {
    return true;
  }
  const sourceObjectKey = readStoreMetadataString(store, "sourceObjectKey")
    .replace(/\\/gu, "/")
    .toLowerCase();
  return sourceObjectKey.startsWith("modules/current/");
}

function resolveStoreSourceStatus(store: StoreApiListItem): {
  moduleBacked: boolean;
  label: string;
  detail: string;
} {
  const moduleBacked = isModuleBackedStoreBlueprint(store);
  if (moduleBacked) {
    return {
      moduleBacked,
      label: "MODULE UTM",
      detail: "Module-backed UTM can be edited, overwritten, and deleted directly."
    };
  }
  return {
    moduleBacked,
    label: "SOURCE UTM",
    detail:
      "Retail or non-module UTM is source-backed; edit creates a module shadow copy instead of overwriting the source."
  };
}

function sanitizeTagInput(value: string): string {
  return value
    .trimStart()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/gu, "_")
    .replace(/_{2,}/gu, "_")
    .slice(0, 32);
}

function sanitizeArmorContextPrefixInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "")
    .slice(0, 5);
}

function sanitizeArmorContextRaceInput(value: string): string {
  return value
    .trimStart()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "")
    .slice(0, 32);
}

function resolveColorValue(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(255, parsed)) : 0;
}

function resolveStepIndex(step: ItemCreationWizardStep): number {
  return Math.max(
    0,
    ITEM_CREATION_WIZARD_STEPS.findIndex((entry) => entry.id === step)
  );
}

function stripPropertyDefinitionDraft(entry: ItemCreationPropertyDraft): ItemCreationPropertyDraft {
  return {
    propertyName: entry.propertyName,
    subtype: entry.subtype,
    costTable: entry.costTable,
    costValue: entry.costValue,
    param1: entry.param1,
    param1Value: entry.param1Value,
    chanceAppear: entry.chanceAppear
  };
}

function formatPropertyChoiceLabel(option: ItemCreationPropertyChoiceOption): string {
  return `${option.value} - ${option.label}`;
}

function resolvePropertyFieldChoices(
  option: ItemCreationPropertyOption | undefined,
  key: ItemCreationNumericPropertyDraftKey
): ItemCreationPropertyChoiceOption[] {
  if (!option) {
    return [];
  }
  if (key === "subtype") {
    return option.subtypeOptions ?? [];
  }
  if (key === "costValue") {
    return option.costValueOptions ?? [];
  }
  if (key === "param1Value") {
    return option.param1Options ?? [];
  }
  if (key === "costTable" && option.sampleCostTable !== undefined) {
    return [
      {
        value: option.sampleCostTable,
        label:
          option.costTableLabel ??
          option.costTableDefinition ??
          `Cost table ${option.sampleCostTable}`
      }
    ];
  }
  if (key === "param1" && option.sampleParam1 !== undefined && option.param1Table) {
    return [
      {
        value: option.sampleParam1,
        label:
          option.param1TableLabel ??
          option.param1Table ??
          `Param table ${option.sampleParam1}`
      }
    ];
  }
  return [];
}

const CUSTOM_PALETTE_CATEGORY_ORDER = [
  "Armor",
  "Weapons",
  "Potions / Scrolls",
  "Magic Items",
  "Miscellaneous"
] as const;

function resolveCustomPaletteCategory(object: SceneObject): string {
  const storePanel = object.itemProperties?.baseItemStorePanel;
  if (storePanel === 0) {
    return "Armor";
  }
  if (storePanel === 1) {
    return "Weapons";
  }
  if (storePanel === 2) {
    return "Potions / Scrolls";
  }
  if (storePanel === 3) {
    return "Magic Items";
  }
  return "Miscellaneous";
}

function buildCustomPalettePayloadFromObjects(
  objects: readonly SceneObject[]
): ItemApiCustomPaletteWritePayload {
  const seenResRefs = new Set<string>();
  const byCategory = new Map<string, Array<{ label: string; resRef: string }>>();
  for (const object of objects) {
    const resRef = object.resRef.trim().toLowerCase();
    if (!resRef || seenResRefs.has(resRef)) {
      continue;
    }
    seenResRefs.add(resRef);
    const category = resolveCustomPaletteCategory(object);
    const items = byCategory.get(category) ?? [];
    items.push({
      label: object.name?.trim() || object.tag.trim() || resRef,
      resRef
    });
    byCategory.set(category, items);
  }

  return {
    roots: [
      {
        label: "Custom Items",
        children: CUSTOM_PALETTE_CATEGORY_ORDER.flatMap((category) => {
          const items = byCategory.get(category) ?? [];
          if (items.length === 0) {
            return [];
          }
          return [
            {
              label: category,
              children: items
                .slice()
                .sort((left, right) => left.resRef.localeCompare(right.resRef))
                .map((item) => ({
                  label: item.label,
                  resRef: item.resRef
                }))
            }
          ];
        })
      }
    ]
  };
}

function resolveGeneratorStatusLabel(
  generatorSupport: ItemApiGeneratorSupportResult
): string {
  if (generatorSupport.status === "ready") {
    return "Item Generator Ready";
  }
  if (generatorSupport.status === "no-sources") {
    return "Item Generator: No Sources";
  }
  return "Item Generator Unsupported";
}

function resolveGeneratorStatusDetail(
  generatorSupport: ItemApiGeneratorSupportResult
): string {
  return (
    generatorSupport.notes[0] ??
    "No item-generator support evidence is available for the current source set."
  );
}

export function ItemsModePanel({
  objects,
  total,
  activeObjectId,
  searchQuery,
  onSearchQueryChange,
  onResetFilters,
  onObjectClick,
  onCreateItem,
  onUpdateItem,
  onCreateStore,
  onUpdateStore,
  onDeleteStore,
  onWriteCustomPalette,
  onDeleteItem,
  creationBaseObjects,
  stores = [],
  propertyDictionary,
  paletteTree,
  generatorSupport,
  processedPreviewObjectsById = {},
  previewThumbnailUrlsByObjectId = {},
  createSequence,
  storeCreateSequence,
  storeCreatorStatus = "idle",
  storeCreatorErrorMessage = null,
  backendAccessToken = null,
  isLoading,
  loadErrorMessage
}: ItemsModePanelProps) {
  const [visibleLimit, setVisibleLimit] = useState(ITEMS_MODE_VISIBLE_BATCH_SIZE);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isStoreWizardOpen, setIsStoreWizardOpen] = useState(false);
  const [itemWizardMode, setItemWizardMode] = useState<"create" | "edit">("create");
  const [editingItemResRef, setEditingItemResRef] = useState<string | null>(null);
  const [storeWizardMode, setStoreWizardMode] = useState<"create" | "edit">("create");
  const [editingStoreResRef, setEditingStoreResRef] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<ItemCreationWizardStep>("type");
  const [selectedPaletteNodeId, setSelectedPaletteNodeId] = useState("all");
  const [storeFilterQuery, setStoreFilterQuery] = useState("");
  const paletteOptions = useMemo(
    () => collectItemPaletteFilterOptions(paletteTree?.roots ?? []),
    [paletteTree]
  );
  const selectedPaletteOption = useMemo(
    () => paletteOptions.find((option) => option.nodeId === selectedPaletteNodeId) ?? null,
    [paletteOptions, selectedPaletteNodeId]
  );
  const paletteFilteredObjects = useMemo(() => {
    if (!selectedPaletteOption) {
      return objects;
    }
    const allowedResRefs = new Set(selectedPaletteOption.resRefs);
    return objects.filter((object) => allowedResRefs.has(object.resRef.trim().toLowerCase()));
  }, [objects, selectedPaletteOption]);
  const hasSearchFilter = searchQuery.trim().length > 0;
  const hasPaletteFilter = Boolean(selectedPaletteOption);
  const hasActiveFilters = hasSearchFilter || hasPaletteFilter;
  const shouldShowEmpty =
    !isLoading && !loadErrorMessage && paletteFilteredObjects.length === 0;
  const loadingMessage =
    paletteFilteredObjects.length > 0 ? "Loading more items..." : "Loading items from backend...";
  const resultLabel = hasActiveFilters
    ? `${paletteFilteredObjects.length}/${total}`
    : String(total);
  const wizardSequence = createSequence ?? total + 1;
  const storeWizardSequence = storeCreateSequence ?? wizardSequence;
  const wizardBaseObjects = useMemo(() => {
    const candidates =
      creationBaseObjects && creationBaseObjects.length > 0
        ? [...creationBaseObjects, ...objects]
        : objects;
    const byId = new Map<string, SceneObject>();
    candidates.forEach((object) => {
      if (!byId.has(object.id)) {
        byId.set(object.id, object);
      }
    });
    return [...byId.values()];
  }, [creationBaseObjects, objects]);
  const baseOptions = useMemo(
    () => resolveItemCreationBaseOptions(wizardBaseObjects),
    [wizardBaseObjects]
  );
  const propertyOptions = useMemo(
    () => resolveItemCreationPropertyOptions(wizardBaseObjects, propertyDictionary ?? []),
    [propertyDictionary, wizardBaseObjects]
  );
  const defaultWizardBaseObject = useMemo(() => {
    const activeBase = activeObjectId
      ? wizardBaseObjects.find((object) => object.id === activeObjectId)
      : undefined;
    if (activeBase && !isItemCreationWizardSceneObject(activeBase)) {
      return activeBase;
    }
    const firstOption = baseOptions[0];
    return firstOption
      ? wizardBaseObjects.find((object) => object.id === firstOption.baseObjectId) ?? null
      : null;
  }, [activeObjectId, baseOptions, wizardBaseObjects]);
  const [wizardDraft, setWizardDraft] = useState<ItemCreationWizardDraft | null>(() =>
    defaultWizardBaseObject
      ? createItemWizardDraft(defaultWizardBaseObject, wizardSequence)
      : null
  );
  const [storeWizardDraft, setStoreWizardDraft] = useState<StoreCreationWizardDraft>(() =>
    createStoreWizardDraft(storeWizardSequence)
  );
  const selectedWizardBaseObject = useMemo(() => {
    if (!wizardDraft) {
      return defaultWizardBaseObject;
    }
    return (
      wizardBaseObjects.find((object) => object.id === wizardDraft.baseObjectId) ??
      defaultWizardBaseObject
    );
  }, [defaultWizardBaseObject, wizardBaseObjects, wizardDraft]);
  const wizardExistingResRefs = useMemo(() => {
    const entries = new Map<string, SceneObject>();
    wizardBaseObjects.forEach((object) => {
      const key = normalizeItemResRefKey(object.resRef);
      if (key && !entries.has(key)) {
        entries.set(key, object);
      }
    });
    return entries;
  }, [wizardBaseObjects]);
  const wizardResRefConflict = useMemo(() => {
    if (!wizardDraft || itemWizardMode !== "create") {
      return null;
    }
    const key = normalizeItemResRefKey(wizardDraft.resRef);
    return key ? wizardExistingResRefs.get(key) ?? null : null;
  }, [itemWizardMode, wizardDraft, wizardExistingResRefs]);
  const nextAvailableWizardResRef = useMemo(() => {
    if (!wizardDraft) {
      return "";
    }
    return resolveNextAvailableItemResRef(
      wizardDraft.resRef,
      new Set(wizardExistingResRefs.keys()),
      wizardSequence
    );
  }, [wizardDraft, wizardExistingResRefs, wizardSequence]);
  const storeExistingResRefs = useMemo(() => {
    const entries = new Map<string, StoreApiListItem>();
    stores.forEach((store) => {
      const key = normalizeStoreResRefKey(store.resref);
      if (key && !entries.has(key)) {
        entries.set(key, store);
      }
    });
    return entries;
  }, [stores]);
  const storeResRefConflict = useMemo(() => {
    if (storeWizardMode !== "create") {
      return null;
    }
    const key = normalizeStoreResRefKey(storeWizardDraft.resRef);
    return key ? storeExistingResRefs.get(key) ?? null : null;
  }, [storeExistingResRefs, storeWizardDraft.resRef, storeWizardMode]);
  const nextAvailableStoreResRef = useMemo(
    () =>
      resolveNextAvailableStoreResRef(
        storeWizardDraft.resRef,
        new Set(storeExistingResRefs.keys()),
      storeWizardSequence
    ),
    [storeExistingResRefs, storeWizardDraft.resRef, storeWizardSequence]
  );
  const editingStoreBlueprint = useMemo(() => {
    if (!editingStoreResRef) {
      return null;
    }
    const key = normalizeStoreResRefKey(editingStoreResRef);
    return storeExistingResRefs.get(key) ?? null;
  }, [editingStoreResRef, storeExistingResRefs]);
  const canSubmitStoreAction =
    storeWizardMode === "edit"
      ? Boolean(
          editingStoreResRef &&
            (editingStoreBlueprint && !isModuleBackedStoreBlueprint(editingStoreBlueprint)
              ? onCreateStore
              : onUpdateStore)
        )
      : Boolean(onCreateStore);
  const wizardVisualMode = resolveItemCreationVisualMode(selectedWizardBaseObject);
  const wizardArmorPresetId = useMemo(() => {
    if (!wizardDraft) {
      return "custom";
    }
    const context = wizardDraft.armorContext;
    return (
      ITEM_CREATION_ARMOR_CONTEXT_PRESETS.find(
        (preset) =>
          preset.modelPrefix === context.modelPrefix &&
          preset.gender === context.gender &&
          preset.phenotype === context.phenotype &&
          preset.raceModel === context.raceModel
      )?.id ?? "custom"
    );
  }, [
    wizardDraft?.armorContext.gender,
    wizardDraft?.armorContext.modelPrefix,
    wizardDraft?.armorContext.phenotype,
    wizardDraft?.armorContext.raceModel
  ]);
  const activeWizardStepIndex = resolveStepIndex(wizardStep);
  const wizardValidationIssues = useMemo(
    () =>
      wizardDraft && selectedWizardBaseObject
        ? validateItemCreationDraft(wizardDraft, selectedWizardBaseObject, propertyOptions)
        : [],
    [propertyOptions, selectedWizardBaseObject, wizardDraft]
  );
  const hasBlockingWizardValidationIssue = wizardValidationIssues.some(
    (issue) => issue.severity === "error"
  );
  const hasBlockingWizardResRefConflict = Boolean(
    wizardResRefConflict && !wizardDraft?.overwriteExisting
  );
  const hasBlockingStoreResRefConflict = Boolean(
    storeResRefConflict && !storeWizardDraft.overwriteExisting
  );
  const canSubmitItem = Boolean(
    (itemWizardMode === "edit" ? onUpdateItem && editingItemResRef : onCreateItem) &&
      storeCreatorStatus !== "applying" &&
      wizardDraft &&
      selectedWizardBaseObject &&
      !hasBlockingWizardValidationIssue &&
      !hasBlockingWizardResRefConflict
  );
  const canSubmitStore = Boolean(
    canSubmitStoreAction &&
      storeCreatorStatus !== "applying" &&
      storeWizardDraft.name.trim().length > 0 &&
      storeWizardDraft.resRef.trim().length > 0 &&
      !hasBlockingStoreResRefConflict
  );
  const canWriteCustomPalette = Boolean(
    onWriteCustomPalette &&
      storeCreatorStatus !== "applying" &&
      paletteFilteredObjects.length > 0
  );
  const assembledCount = useMemo(
    () => paletteFilteredObjects.filter((object) => resolveItemModelParts(object).length > 0).length,
    [paletteFilteredObjects]
  );
  const coloredCount = useMemo(
    () =>
      paletteFilteredObjects.filter((object) => resolveItemMaterialColors(object).length > 0)
        .length,
    [paletteFilteredObjects]
  );
  const armorCount = useMemo(
    () =>
      paletteFilteredObjects.filter((object) => resolveItemArmorParts(object).length > 0).length,
    [paletteFilteredObjects]
  );
  const customCount = useMemo(
    () => paletteFilteredObjects.filter(isItemCreationWizardSceneObject).length,
    [paletteFilteredObjects]
  );
  const visibleStores = useMemo(() => {
    const normalizedQuery = storeFilterQuery.trim().toLowerCase();
    const candidates = normalizedQuery
      ? stores.filter((store) => {
          const metadata = store.metadata ?? {};
          const searchable = [
            store.name,
            store.resref,
            store.category,
            ...store.tags,
            String(metadata.tag ?? ""),
            String(metadata.templateResRef ?? ""),
            String(metadata.localizedName ?? "")
          ]
            .join(" ")
            .toLowerCase();
          return searchable.includes(normalizedQuery);
        })
      : stores;
    return candidates.slice(0, 8);
  }, [storeFilterQuery, stores]);
  const visibleObjects = useMemo(
    () => paletteFilteredObjects.slice(0, visibleLimit),
    [paletteFilteredObjects, visibleLimit]
  );
  const hasMoreVisibleObjects = visibleObjects.length < paletteFilteredObjects.length;
  const visibleIconPreviews = useMemo(() => {
    const previews = new Map<string, ItemIconComposition>();
    visibleObjects.forEach((object) => {
      const preview = composeItemIconPreview(object);
      if (preview) {
        previews.set(object.id, preview);
      }
    });
    return previews;
  }, [visibleObjects]);
  const itemThumbnailAssetAccessToken = useMemo(
    () => backendAccessToken?.trim() || resolvePersistedBackendAccessToken(),
    [backendAccessToken]
  );
  const authenticatedIconFetch = useMemo<typeof fetch | undefined>(() => {
    const token = itemThumbnailAssetAccessToken;
    if (!token || typeof fetch === "undefined") {
      return undefined;
    }
    return (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    };
  }, [itemThumbnailAssetAccessToken]);
  const [decodedItemIconPreviews, setDecodedItemIconPreviews] = useState<
    Record<string, ItemIconComposition>
  >({});
  const [itemIconDecodeAttempts, setItemIconDecodeAttempts] = useState<Record<string, number>>(
    {}
  );
  const [itemIconDecodeStatuses, setItemIconDecodeStatuses] = useState<
    Record<string, ItemIconDecodeStatus>
  >({});

  useEffect(() => {
    setVisibleLimit(ITEMS_MODE_VISIBLE_BATCH_SIZE);
  }, [searchQuery, selectedPaletteNodeId]);

  useEffect(() => {
    const rawPreviews = [...visibleIconPreviews.values()]
      .filter((preview) => preview.source === "raw-texture")
      .filter((preview) => !decodedItemIconPreviews[resolveItemIconPreviewCacheKey(preview)])
      .filter(
        (preview) =>
          (itemIconDecodeAttempts[resolveItemIconPreviewCacheKey(preview)] ?? 0) <
          ITEM_ICON_DECODE_RETRY_LIMIT
      )
      .slice(0, 16);
    if (rawPreviews.length < 1) {
      return;
    }

    let cancelled = false;
    const retryTimers: number[] = [];
    const recordDecodeStatus = (
      cacheKey: string,
      status: ItemIconDecodeStatus["status"],
      message: string
    ) => {
      setItemIconDecodeStatuses((current) => {
        const existing = current[cacheKey];
        if (existing?.status === status && existing.message === message) {
          return current;
        }
        return { ...current, [cacheKey]: { status, message } };
      });
    };
    const scheduleRetry = (cacheKey: string, message: string) => {
      recordDecodeStatus(cacheKey, "retrying", message);
      const timer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        setItemIconDecodeAttempts((current) => ({
          ...current,
          [cacheKey]: (current[cacheKey] ?? 0) + 1
        }));
      }, ITEM_ICON_DECODE_RETRY_DELAY_MS);
      retryTimers.push(timer);
    };
    rawPreviews.forEach((preview) => {
      const cacheKey = resolveItemIconPreviewCacheKey(preview);
      recordDecodeStatus(cacheKey, "loading", preview.rawAssetUrl ?? preview.iconResRef);
      void resolveDecodedItemIconPreview(preview, authenticatedIconFetch)
        .then((decoded) => {
          if (cancelled) {
            return;
          }
          if (!decoded) {
            scheduleRetry(cacheKey, "decode returned no image");
            return;
          }
          recordDecodeStatus(cacheKey, "decoded", decoded.previewImageUrl ? "ok" : "missing data url");
          setDecodedItemIconPreviews((current) =>
            current[cacheKey]?.previewImageUrl === decoded.previewImageUrl
              ? current
              : { ...current, [cacheKey]: decoded }
          );
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            scheduleRetry(
              cacheKey,
              error instanceof Error ? error.message : "raw icon decode failed"
            );
          }
        });
    });

    return () => {
      cancelled = true;
      retryTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [
    authenticatedIconFetch,
    decodedItemIconPreviews,
    itemIconDecodeAttempts,
    visibleIconPreviews
  ]);

  useEffect(() => {
    if (
      selectedPaletteNodeId !== "all" &&
      !paletteOptions.some((option) => option.nodeId === selectedPaletteNodeId)
    ) {
      setSelectedPaletteNodeId("all");
    }
  }, [paletteOptions, selectedPaletteNodeId]);

  useEffect(() => {
    if (!isWizardOpen || !defaultWizardBaseObject) {
      return;
    }
    setWizardDraft((current) => {
      if (current && wizardBaseObjects.some((object) => object.id === current.baseObjectId)) {
        return current;
      }
      return createItemWizardDraft(defaultWizardBaseObject, wizardSequence);
    });
  }, [defaultWizardBaseObject, isWizardOpen, wizardBaseObjects, wizardSequence]);

  const handleOpenWizard = () => {
    if (!defaultWizardBaseObject) {
      return;
    }
    setItemWizardMode("create");
    setEditingItemResRef(null);
    setWizardDraft(createItemWizardDraft(defaultWizardBaseObject, wizardSequence));
    setWizardStep("type");
    setIsWizardOpen(true);
  };

  const handleEditItemWizard = (object: SceneObject) => {
    setItemWizardMode("edit");
    setEditingItemResRef(object.resRef);
    setWizardDraft(createItemWizardDraftFromSceneObject(object));
    setWizardStep("identity");
    setIsWizardOpen(true);
  };

  const handleDuplicateItemWizard = (object: SceneObject) => {
    setItemWizardMode("create");
    setEditingItemResRef(null);
    setWizardDraft(createDuplicateItemWizardDraftFromSceneObject(object, wizardSequence));
    setWizardStep("identity");
    setIsWizardOpen(true);
  };

  const handleOpenStoreWizard = () => {
    setStoreWizardMode("create");
    setEditingStoreResRef(null);
    setStoreWizardDraft(createStoreWizardDraft(storeWizardSequence));
    setIsStoreWizardOpen(true);
  };

  const handleEditStoreWizard = (store: StoreApiListItem) => {
    setStoreWizardMode("edit");
    setEditingStoreResRef(store.resref);
    setStoreWizardDraft(createStoreWizardDraftFromStore(store));
    setIsStoreWizardOpen(true);
  };

  const handleDuplicateStoreWizard = (store: StoreApiListItem) => {
    setStoreWizardMode("create");
    setEditingStoreResRef(null);
    setStoreWizardDraft(createDuplicateStoreWizardDraftFromStore(store, storeWizardSequence));
    setIsStoreWizardOpen(true);
  };

  const updateWizardDraft = (patch: Partial<ItemCreationWizardDraft>) => {
    setWizardDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const updateStoreWizardDraft = (patch: Partial<StoreCreationWizardDraft>) => {
    setStoreWizardDraft((current) => ({ ...current, ...patch }));
  };

  const handleStoreBucketChange = (
    index: number,
    key: "bucketTypeId",
    value: string
  ) => {
    setStoreWizardDraft((current) => ({
      ...current,
      buckets: current.buckets.map((bucket, bucketIndex) =>
        bucketIndex === index ? { ...bucket, [key]: value } : bucket
      )
    }));
  };

  const handleStoreBucketItemChange = (
    bucketIndex: number,
    itemIndex: number,
    key: keyof StoreCreationBucketItemDraft,
    value: string | boolean
  ) => {
    setStoreWizardDraft((current) => ({
      ...current,
      buckets: current.buckets.map((bucket, currentBucketIndex) =>
        currentBucketIndex === bucketIndex
          ? {
              ...bucket,
              itemListEntries: bucket.itemListEntries.map((item, currentItemIndex) =>
                currentItemIndex === itemIndex ? { ...item, [key]: value } : item
              )
            }
          : bucket
      )
    }));
  };

  const handleAddStoreBucketItem = (bucketIndex: number) => {
    setStoreWizardDraft((current) => ({
      ...current,
      buckets: current.buckets.map((bucket, currentBucketIndex) =>
        currentBucketIndex === bucketIndex
          ? {
              ...bucket,
              itemListEntries: [...bucket.itemListEntries, createEmptyStoreBucketItemDraft()]
            }
          : bucket
      )
    }));
  };

  const handleRemoveStoreBucketItem = (bucketIndex: number, itemIndex: number) => {
    setStoreWizardDraft((current) => ({
      ...current,
      buckets: current.buckets.map((bucket, currentBucketIndex) =>
        currentBucketIndex === bucketIndex
          ? {
              ...bucket,
              itemListEntries:
                bucket.itemListEntries.length > 1
                  ? bucket.itemListEntries.filter(
                      (_, currentItemIndex) => currentItemIndex !== itemIndex
                    )
                  : [createEmptyStoreBucketItemDraft()]
            }
          : bucket
      )
    }));
  };

  const handleBaseObjectChange = (baseObjectId: string) => {
    const nextBaseObject =
      wizardBaseObjects.find((object) => object.id === baseObjectId) ?? defaultWizardBaseObject;
    if (!nextBaseObject) {
      return;
    }
    setWizardDraft(createItemWizardDraft(nextBaseObject, wizardSequence));
  };

  const handleArmorPartChange = (
    key: keyof ItemCreationWizardDraft["armorParts"],
    value: string
  ) => {
    setWizardDraft((current) =>
      current
        ? {
            ...current,
            armorParts: {
              ...current.armorParts,
              [key]: sanitizeItemCreationNumberInput(value, 999)
            }
          }
        : current
    );
  };

  const handleArmorContextPresetChange = (presetId: string) => {
    const preset = ITEM_CREATION_ARMOR_CONTEXT_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }
    setWizardDraft((current) =>
      current
        ? {
            ...current,
            armorContext: {
              modelPrefix: preset.modelPrefix,
              label: preset.label,
              gender: preset.gender,
              phenotype: preset.phenotype,
              raceModel: preset.raceModel
            }
          }
        : current
    );
  };

  const handleArmorContextChange = (
    key: keyof ItemCreationWizardDraft["armorContext"],
    value: string
  ) => {
    setWizardDraft((current) => {
      if (!current) {
        return current;
      }
      const sanitized =
        key === "modelPrefix"
          ? sanitizeArmorContextPrefixInput(value)
          : key === "gender"
            ? sanitizeItemCreationNumberInput(value, 1)
            : key === "phenotype"
              ? sanitizeItemCreationNumberInput(value, 9)
              : key === "raceModel"
                ? sanitizeArmorContextRaceInput(value)
                : value.trimStart().slice(0, 64);
      return {
        ...current,
        armorContext: {
          ...current.armorContext,
          [key]: sanitized
        }
      };
    });
  };

  const handleMaterialColorChange = (
    key: keyof ItemCreationWizardDraft["materialColors"],
    value: string
  ) => {
    setWizardDraft((current) =>
      current
        ? {
            ...current,
            materialColors: {
              ...current.materialColors,
              [key]: sanitizeItemCreationNumberInput(value, 255)
            }
          }
        : current
    );
  };

  const handlePropertyChange = (
    index: number,
    key: keyof ItemCreationPropertyDraft,
    value: string,
    max: number
  ) => {
    setWizardDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        propertyList: current.propertyList.map((entry, entryIndex) =>
          entryIndex === index
            ? key === "propertyName"
              ? {
                  ...stripPropertyDefinitionDraft(entry),
                  propertyName: sanitizeItemCreationNumberInput(value, max)
                }
              : { ...entry, [key]: sanitizeItemCreationNumberInput(value, max) }
            : entry
        )
      };
    });
  };

  const handlePropertyOptionChange = (index: number, value: string) => {
    const option = propertyOptions.find(
      (entry) => String(entry.propertyName) === value.trim()
    );
    setWizardDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        propertyList: current.propertyList.map((entry, entryIndex) => {
          if (entryIndex !== index) {
            return entry;
          }
          if (!option) {
            return {
              ...stripPropertyDefinitionDraft(entry),
              propertyName: sanitizeItemCreationNumberInput(value, 65535)
            };
          }
          return createItemPropertyDraftFromOption(option);
        })
      };
    });
  };

  const handleAddProperty = () => {
    setWizardDraft((current) =>
      current
        ? {
            ...current,
            propertyList: [...current.propertyList, createEmptyItemPropertyDraft()]
          }
        : current
    );
  };

  const handleRemoveProperty = (index: number) => {
    setWizardDraft((current) =>
      current
        ? {
            ...current,
            propertyList: current.propertyList.filter((_, entryIndex) => entryIndex !== index)
          }
        : current
    );
  };

  const handleSubmitWizard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitItem || !wizardDraft || !selectedWizardBaseObject) {
      return;
    }
    const createdObject = createItemSceneObjectFromWizardDraft(
      wizardDraft,
      selectedWizardBaseObject,
      wizardSequence,
      propertyOptions
    );
    try {
      if (itemWizardMode === "edit" && editingItemResRef && onUpdateItem) {
        await onUpdateItem(editingItemResRef, createdObject);
      } else if (onCreateItem) {
        if (wizardDraft.overwriteExisting) {
          await onCreateItem(createdObject, { overwrite: true });
        } else {
          await onCreateItem(createdObject);
        }
      }
      setIsWizardOpen(false);
      setItemWizardMode("create");
      setEditingItemResRef(null);
      setWizardStep("type");
    } catch {
      // The workspace owns the visible error message.
    }
  };

  const handleSubmitStoreWizard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitStore) {
      return;
    }
    const payload = buildStoreBlueprintCreatePayloadFromDraft(storeWizardDraft);
    if (!payload) {
      return;
    }
    try {
      if (storeWizardMode === "edit" && editingStoreResRef) {
        const overwritePayload = {
          ...payload,
          overwrite: true
        };
        if (
          editingStoreBlueprint &&
          !isModuleBackedStoreBlueprint(editingStoreBlueprint) &&
          onCreateStore
        ) {
          await onCreateStore(overwritePayload);
        } else if (onUpdateStore) {
          await onUpdateStore(editingStoreResRef, overwritePayload);
        }
      } else if (onCreateStore) {
        await onCreateStore(payload);
      }
      setIsStoreWizardOpen(false);
    } catch {
      // The workspace owns the visible error message.
    }
  };

  const goToPreviousWizardStep = () => {
    const previousStep = ITEM_CREATION_WIZARD_STEPS[Math.max(0, activeWizardStepIndex - 1)];
    setWizardStep(previousStep?.id ?? wizardStep);
  };

  const goToNextWizardStep = () => {
    const nextStep =
      ITEM_CREATION_WIZARD_STEPS[
        Math.min(ITEM_CREATION_WIZARD_STEPS.length - 1, activeWizardStepIndex + 1)
      ];
    setWizardStep(nextStep?.id ?? wizardStep);
  };

  return (
    <article
      className="sidebar-section workspace-mode-panel items-mode-panel scene-objects-section scene-object-add-panel"
      aria-label="items mode section"
    >
      <header className="scene-objects-header scene-object-add-panel-header">
        <h2>Items</h2>
        <span
          className="scene-objects-total"
          title={hasActiveFilters ? "Filtered loaded items / total items" : "Total items"}
        >
          {resultLabel}
        </span>
      </header>
      <div className="items-mode-create-actions">
        <button
          type="button"
          className="items-mode-create-button"
          disabled={!defaultWizardBaseObject || storeCreatorStatus === "applying"}
          onClick={handleOpenWizard}
        >
          New Item
        </button>
        <button
          type="button"
          className="items-mode-create-button items-mode-create-store-button"
          disabled={!onCreateStore || storeCreatorStatus === "applying"}
          onClick={handleOpenStoreWizard}
        >
          New Store
        </button>
      </div>
      {isWizardOpen && wizardDraft ? (
        <form
          className="items-mode-creation-wizard"
          aria-label="item creation wizard"
          onSubmit={handleSubmitWizard}
        >
          <div className="items-mode-wizard-tabs" role="tablist" aria-label="item creation steps">
            {ITEM_CREATION_WIZARD_STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={wizardStep === step.id}
                className={`items-mode-wizard-tab${wizardStep === step.id ? " is-active" : ""}`}
                onClick={() => setWizardStep(step.id)}
              >
                {step.label}
              </button>
            ))}
          </div>

          {wizardStep === "type" ? (
            <div className="items-mode-wizard-page">
              <label className="items-mode-wizard-wide-field">
                <span>Base Item</span>
                <select
                  aria-label="Base Item"
                  value={wizardDraft.baseObjectId}
                  disabled={itemWizardMode === "edit"}
                  onChange={(event) => handleBaseObjectChange(event.target.value)}
                >
                  {baseOptions.map((option) => (
                    <option key={option.baseObjectId} value={option.baseObjectId}>
                      {option.baseItem} - {option.label} - {option.modelType} -{" "}
                      {option.sampleResRef}
                    </option>
                  ))}
                </select>
              </label>
              {selectedWizardBaseObject ? (
                <dl className="items-mode-wizard-summary">
                  <div>
                    <dt>Template</dt>
                    <dd>{selectedWizardBaseObject.id}</dd>
                  </div>
                  <div>
                    <dt>ResRef</dt>
                    <dd>{selectedWizardBaseObject.resRef}</dd>
                  </div>
                  <div>
                    <dt>Assembly</dt>
                    <dd>{summarizeItemAssembly(selectedWizardBaseObject)}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
          ) : null}

          {wizardStep === "identity" ? (
            <div className="items-mode-wizard-page">
              <label>
                <span>Name</span>
                <input
                  aria-label="Name"
                  value={wizardDraft.name}
                  onChange={(event) => updateWizardDraft({ name: event.target.value })}
                />
              </label>
              <div className="items-mode-wizard-grid">
                <label>
                  <span>ResRef</span>
                  <input
                    aria-label="ResRef"
                    maxLength={16}
                    value={wizardDraft.resRef}
                    disabled={itemWizardMode === "edit"}
                    onChange={(event) =>
                      updateWizardDraft({ resRef: sanitizeResRefInput(event.target.value) })
                    }
                  />
                </label>
                <label>
                  <span>Tag</span>
                  <input
                    aria-label="Tag"
                    maxLength={32}
                    value={wizardDraft.tag}
                    onChange={(event) =>
                      updateWizardDraft({ tag: sanitizeTagInput(event.target.value) })
                    }
                  />
                </label>
              </div>
              {wizardResRefConflict ? (
                <div className="items-mode-wizard-resref-conflict" role="status">
                  <strong>ResRef already exists</strong>
                  <span>
                    {wizardDraft.resRef} is already used by{" "}
                    {wizardResRefConflict.name?.trim() ||
                      wizardResRefConflict.tag ||
                      wizardResRefConflict.resRef}
                    .
                  </span>
                  <div className="items-mode-wizard-resref-actions">
                    <button
                      type="button"
                      onClick={() =>
                        updateWizardDraft({
                          resRef: nextAvailableWizardResRef,
                          overwriteExisting: false
                        })
                      }
                    >
                      Use {nextAvailableWizardResRef}
                    </button>
                    <label className="items-mode-wizard-inline-check">
                      <input
                        type="checkbox"
                        aria-label="Overwrite existing ResRef"
                        checked={wizardDraft.overwriteExisting}
                        onChange={(event) =>
                          updateWizardDraft({ overwriteExisting: event.target.checked })
                        }
                      />
                      <span>Overwrite existing blueprint</span>
                    </label>
                  </div>
                </div>
              ) : null}
              <label className="items-mode-wizard-wide-field">
                <span>Description</span>
                <textarea
                  aria-label="Description"
                  value={wizardDraft.description}
                  onChange={(event) => updateWizardDraft({ description: event.target.value })}
                />
              </label>
              <label className="items-mode-wizard-wide-field">
                <span>Identified Description</span>
                <textarea
                  aria-label="Identified Description"
                  value={wizardDraft.identifiedDescription}
                  onChange={(event) =>
                    updateWizardDraft({ identifiedDescription: event.target.value })
                  }
                />
              </label>
            </div>
          ) : null}

          {wizardStep === "visual" ? (
            <div className="items-mode-wizard-page">
              {wizardVisualMode === "armor" ? (
                <>
                  <div
                    className="items-mode-wizard-grid"
                    aria-label="item armor mannequin editor"
                  >
                    <label>
                      <span>Mannequin</span>
                      <select
                        aria-label="Armor Mannequin"
                        value={wizardArmorPresetId}
                        onChange={(event) => handleArmorContextPresetChange(event.target.value)}
                      >
                        {wizardArmorPresetId === "custom" ? (
                          <option value="custom">Custom</option>
                        ) : null}
                        {ITEM_CREATION_ARMOR_CONTEXT_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Armor Prefix</span>
                      <input
                        type="text"
                        inputMode="text"
                        maxLength={5}
                        aria-label="Armor Prefix"
                        value={wizardDraft.armorContext.modelPrefix}
                        onChange={(event) =>
                          handleArmorContextChange("modelPrefix", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      <span>Gender</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={1}
                        aria-label="Armor Gender"
                        value={wizardDraft.armorContext.gender}
                        onChange={(event) =>
                          handleArmorContextChange("gender", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      <span>Phenotype</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={9}
                        aria-label="Armor Phenotype"
                        value={wizardDraft.armorContext.phenotype}
                        onChange={(event) =>
                          handleArmorContextChange("phenotype", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      <span>Race Model</span>
                      <input
                        type="text"
                        inputMode="text"
                        maxLength={32}
                        aria-label="Armor Race Model"
                        value={wizardDraft.armorContext.raceModel}
                        onChange={(event) =>
                          handleArmorContextChange("raceModel", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <div className="items-mode-wizard-parts" aria-label="item armor part editor">
                    {ITEM_CREATION_ARMOR_PART_FIELDS.map((field) => (
                      <label key={field.key}>
                        <span>{field.label}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={999}
                          aria-label={field.label}
                          value={wizardDraft.armorParts[field.key]}
                          onChange={(event) =>
                            handleArmorPartChange(field.key, event.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <div className="items-mode-wizard-grid" aria-label="item model part editor">
                  <label>
                    <span>Part 1</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={999}
                      aria-label="Part 1"
                      value={wizardDraft.modelPart1}
                      onChange={(event) =>
                        updateWizardDraft({
                          modelPart1: sanitizeItemCreationNumberInput(event.target.value, 999)
                        })
                      }
                    />
                  </label>
                  {wizardVisualMode === "threePart" ? (
                    <>
                      <label>
                        <span>Part 2</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={999}
                          aria-label="Part 2"
                          value={wizardDraft.modelPart2}
                          onChange={(event) =>
                            updateWizardDraft({
                              modelPart2: sanitizeItemCreationNumberInput(
                                event.target.value,
                                999
                              )
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Part 3</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={999}
                          aria-label="Part 3"
                          value={wizardDraft.modelPart3}
                          onChange={(event) =>
                            updateWizardDraft({
                              modelPart3: sanitizeItemCreationNumberInput(
                                event.target.value,
                                999
                              )
                            })
                          }
                        />
                      </label>
                    </>
                  ) : null}
                </div>
              )}

              <div className="items-mode-wizard-colors" aria-label="item material color editor">
                {ITEM_CREATION_MATERIAL_COLOR_FIELDS.map((field) => (
                  <label key={field.key}>
                    <span>{field.label}</span>
                    <div className="items-mode-wizard-color-value">
                      <i
                        aria-hidden="true"
                        className="items-mode-wizard-color-current"
                        style={{
                          backgroundColor: resolveItemMaterialColorHex(
                            field.key,
                            resolveColorValue(wizardDraft.materialColors[field.key])
                          )
                        }}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={255}
                        aria-label={field.label}
                        value={wizardDraft.materialColors[field.key]}
                        onChange={(event) =>
                          handleMaterialColorChange(field.key, event.target.value)
                        }
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {wizardStep === "properties" ? (
            <div className="items-mode-wizard-page">
              <div className="items-mode-wizard-grid">
                <label>
                  <span>Stack Size</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={999}
                    aria-label="Stack Size"
                    value={wizardDraft.stackSize}
                    onChange={(event) =>
                      updateWizardDraft({
                        stackSize: sanitizeItemCreationNumberInput(event.target.value, 999)
                      })
                    }
                  />
                </label>
                <label>
                  <span>Charges</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={255}
                    aria-label="Charges"
                    value={wizardDraft.charges}
                    onChange={(event) =>
                      updateWizardDraft({
                        charges: sanitizeItemCreationNumberInput(event.target.value, 255)
                      })
                    }
                  />
                </label>
                <label>
                  <span>Add Cost</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={999999}
                    aria-label="Add Cost"
                    value={wizardDraft.addCost}
                    onChange={(event) =>
                      updateWizardDraft({
                        addCost: sanitizeItemCreationNumberInput(event.target.value, 999999)
                      })
                    }
                  />
                </label>
              </div>
              <div className="items-mode-wizard-flags">
                {(["identified", "plot", "stolen", "cursed"] as const).map((flag) => (
                  <label key={flag}>
                    <input
                      type="checkbox"
                      aria-label={flag[0].toUpperCase() + flag.slice(1)}
                      checked={wizardDraft[flag]}
                      onChange={(event) => updateWizardDraft({ [flag]: event.target.checked })}
                    />
                    <span>{flag[0].toUpperCase() + flag.slice(1)}</span>
                  </label>
                ))}
              </div>
              <section className="items-mode-wizard-properties" aria-label="item property list">
                {wizardDraft.propertyList.map((entry, index) => (
                  <div key={index} className="items-mode-wizard-property-row">
                    <label>
                      <span>Property</span>
                      {propertyOptions.length > 0 ? (
                        <select
                          aria-label={`Property ${index + 1}`}
                          value={entry.propertyName}
                          onChange={(event) =>
                            handlePropertyOptionChange(index, event.target.value)
                          }
                        >
                          <option value="">Custom property</option>
                          {entry.propertyName &&
                          !propertyOptions.some(
                            (option) => String(option.propertyName) === entry.propertyName
                          ) ? (
                            <option value={entry.propertyName}>
                              Property {entry.propertyName}
                            </option>
                          ) : null}
                          {propertyOptions.map((option) => (
                            <option key={option.propertyName} value={option.propertyName}>
                              {option.propertyName} - {option.label}
                              {option.subTypeTable ? ` - ${option.subTypeTable}` : ""}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={65535}
                          aria-label={`Property ${index + 1}`}
                          value={entry.propertyName}
                          onChange={(event) =>
                            handlePropertyChange(
                              index,
                              "propertyName",
                              event.target.value,
                              65535
                            )
                          }
                        />
                      )}
                    </label>
                    {entry.propertyLabel ||
                    entry.subTypeTable ||
                    entry.costTableDefinition ||
                    entry.param1Table ? (
                      <small className="items-mode-wizard-property-definition">
                        {[entry.propertyLabel, entry.subTypeTable, entry.costTableDefinition, entry.param1Table]
                          .filter((value): value is string => Boolean(value))
                          .join(" / ")}
                      </small>
                    ) : null}
                    {ITEM_CREATION_PROPERTY_NUMBER_FIELDS.map((field) => {
                      const selectedPropertyOption = propertyOptions.find(
                        (option) => String(option.propertyName) === entry.propertyName
                      );
                      const choices = resolvePropertyFieldChoices(
                        selectedPropertyOption,
                        field.key
                      );
                      return (
                        <label key={field.key}>
                          <span>{field.label}</span>
                          {choices.length > 0 ? (
                            <select
                              aria-label={`${field.label} ${index + 1}`}
                              value={entry[field.key]}
                              onChange={(event) =>
                                handlePropertyChange(
                                  index,
                                  field.key,
                                  event.target.value,
                                  field.max
                                )
                              }
                            >
                              <option value="">Custom {field.label}</option>
                              {choices.map((choice) => (
                                <option key={choice.value} value={choice.value}>
                                  {formatPropertyChoiceLabel(choice)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={field.max}
                              aria-label={`${field.label} ${index + 1}`}
                              value={entry[field.key]}
                              onChange={(event) =>
                                handlePropertyChange(
                                  index,
                                  field.key,
                                  event.target.value,
                                  field.max
                                )
                              }
                            />
                          )}
                        </label>
                      );
                    })}
                    <button
                      type="button"
                      className="items-mode-wizard-remove-property"
                      aria-label={`Remove property ${index + 1}`}
                      onClick={() => handleRemoveProperty(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="items-mode-wizard-add-property"
                  onClick={handleAddProperty}
                >
                  Add Property
                </button>
              </section>
            </div>
          ) : null}

          {wizardStep === "finish" ? (
            <div className="items-mode-wizard-page">
              <dl className="items-mode-wizard-summary">
                <div>
                  <dt>Name</dt>
                  <dd>{wizardDraft.name || "-"}</dd>
                </div>
                <div>
                  <dt>ResRef</dt>
                  <dd>{wizardDraft.resRef || "-"}</dd>
                </div>
                <div>
                  <dt>Base</dt>
                  <dd>
                    {selectedWizardBaseObject?.itemProperties?.baseItemLabel ??
                      selectedWizardBaseObject?.itemProperties?.baseItem ??
                      "-"}
                  </dd>
                </div>
                <div>
                  <dt>Parts</dt>
                  <dd>
                    {wizardVisualMode === "armor"
                      ? Object.values(wizardDraft.armorParts).filter(
                          (value) => value.trim().length > 0
                        ).length
                      : [wizardDraft.modelPart1, wizardDraft.modelPart2, wizardDraft.modelPart3]
                          .filter((value) => value.trim().length > 0)
                          .join(" / ") || "-"}
                  </dd>
                </div>
                <div>
                  <dt>Properties</dt>
                  <dd>{wizardDraft.propertyList.length}</dd>
                </div>
                <div>
                  <dt>Save Mode</dt>
                  <dd>
                    {itemWizardMode === "edit"
                      ? "Update existing"
                      : wizardDraft.overwriteExisting
                        ? "Overwrite existing"
                        : "Create new"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {wizardValidationIssues.length > 0 ? (
            <ul className="items-mode-wizard-validation" aria-label="item creation validation">
              {wizardValidationIssues.map((issue) => (
                <li key={issue.code} data-severity={issue.severity}>
                  {issue.message}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="items-mode-wizard-actions">
            <button
              type="button"
              disabled={activeWizardStepIndex === 0}
              onClick={goToPreviousWizardStep}
            >
              Back
            </button>
            <button
              type="button"
              disabled={activeWizardStepIndex >= ITEM_CREATION_WIZARD_STEPS.length - 1}
              onClick={goToNextWizardStep}
            >
              Next
            </button>
            <button type="submit" disabled={!canSubmitItem}>
              {itemWizardMode === "edit" ? "Update Item" : "Create Item"}
            </button>
          </div>
        </form>
      ) : null}

      {isStoreWizardOpen ? (
        <form
          className="items-mode-creation-wizard items-mode-store-wizard"
          aria-label="store creation wizard"
          onSubmit={handleSubmitStoreWizard}
        >
          <div className="items-mode-wizard-grid">
            <label>
              <span>Name</span>
              <input
                aria-label="Store Name"
                value={storeWizardDraft.name}
                onChange={(event) => updateStoreWizardDraft({ name: event.target.value })}
              />
            </label>
            <label>
              <span>ResRef</span>
              <input
                aria-label="Store ResRef"
                maxLength={16}
                disabled={storeWizardMode === "edit"}
                    value={storeWizardDraft.resRef}
                    onChange={(event) =>
                      updateStoreWizardDraft({
                        resRef: sanitizeStoreCreationResRef(event.target.value),
                        overwriteExisting: false
                      })
                    }
                  />
                </label>
            <label>
              <span>Tag</span>
              <input
                aria-label="Store Tag"
                maxLength={32}
                value={storeWizardDraft.tag}
                onChange={(event) =>
                  updateStoreWizardDraft({
                    tag: sanitizeStoreCreationTag(event.target.value)
                  })
                }
              />
            </label>
            <label>
              <span>Store ID</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Store ID"
                value={storeWizardDraft.storeId}
                onChange={(event) =>
                  updateStoreWizardDraft({
                    storeId: sanitizeStoreCreationNumberInput(event.target.value, 255)
                  })
                }
              />
              </label>
            </div>
            {storeResRefConflict ? (
              <div className="items-mode-wizard-resref-conflict" role="status">
                <strong>Store ResRef already exists</strong>
                <span>
                  {storeWizardDraft.resRef} is already used by {storeResRefConflict.name}.
                </span>
                <div className="items-mode-wizard-resref-actions">
                  <button
                    type="button"
                    onClick={() =>
                      updateStoreWizardDraft({
                        resRef: nextAvailableStoreResRef,
                        overwriteExisting: false
                      })
                    }
                  >
                    Use {nextAvailableStoreResRef}
                  </button>
                  <label className="items-mode-wizard-inline-check">
                    <input
                      type="checkbox"
                      aria-label="Overwrite existing store ResRef"
                      checked={storeWizardDraft.overwriteExisting}
                      onChange={(event) =>
                        updateStoreWizardDraft({ overwriteExisting: event.target.checked })
                      }
                    />
                    <span>Save as module shadow-copy</span>
                  </label>
                </div>
              </div>
            ) : null}
          <div className="items-mode-wizard-grid">
            <label>
              <span>Mark Up</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Mark Up"
                value={storeWizardDraft.markUp}
                onChange={(event) =>
                  updateStoreWizardDraft({
                    markUp: sanitizeStoreCreationSignedIntInput(event.target.value)
                  })
                }
              />
            </label>
            <label>
              <span>Mark Down</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Mark Down"
                value={storeWizardDraft.markDown}
                onChange={(event) =>
                  updateStoreWizardDraft({
                    markDown: sanitizeStoreCreationSignedIntInput(event.target.value)
                  })
                }
              />
            </label>
            <label>
              <span>BM Mark Down</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="BM Mark Down"
                value={storeWizardDraft.bmMarkDown}
                onChange={(event) =>
                  updateStoreWizardDraft({
                    bmMarkDown: sanitizeStoreCreationSignedIntInput(event.target.value)
                  })
                }
              />
            </label>
            <label>
              <span>Identify Price</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Identify Price"
                value={storeWizardDraft.identifyPrice}
                onChange={(event) =>
                  updateStoreWizardDraft({
                    identifyPrice: sanitizeStoreCreationSignedIntInput(event.target.value)
                  })
                }
              />
            </label>
            <label>
              <span>Max Buy Price</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Max Buy Price"
                value={storeWizardDraft.maxBuyPrice}
                onChange={(event) =>
                  updateStoreWizardDraft({
                    maxBuyPrice: sanitizeStoreCreationSignedIntInput(event.target.value)
                  })
                }
              />
            </label>
            <label>
              <span>Store Gold</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Store Gold"
                value={storeWizardDraft.storeGold}
                onChange={(event) =>
                  updateStoreWizardDraft({
                    storeGold: sanitizeStoreCreationSignedIntInput(event.target.value)
                  })
                }
              />
            </label>
            <label>
              <span>On Open Store</span>
              <input
                aria-label="On Open Store"
                maxLength={16}
                value={storeWizardDraft.onOpenStore}
                onChange={(event) =>
                  updateStoreWizardDraft({
                    onOpenStore: sanitizeStoreCreationResRef(event.target.value)
                  })
                }
              />
            </label>
            <label>
              <span>On Store Closed</span>
              <input
                aria-label="On Store Closed"
                maxLength={16}
                value={storeWizardDraft.onStoreClosed}
                onChange={(event) =>
                  updateStoreWizardDraft({
                    onStoreClosed: sanitizeStoreCreationResRef(event.target.value)
                  })
                }
              />
            </label>
          </div>
          <div className="items-mode-wizard-flags">
            <label>
              <input
                type="checkbox"
                aria-label="Black Market"
                checked={storeWizardDraft.blackMarket}
                onChange={(event) =>
                  updateStoreWizardDraft({ blackMarket: event.target.checked })
                }
              />
              <span>Black Market</span>
            </label>
          </div>
          <label className="items-mode-wizard-wide-field">
            <span>Comment</span>
            <textarea
              aria-label="Store Comment"
              value={storeWizardDraft.comments}
              onChange={(event) => updateStoreWizardDraft({ comments: event.target.value })}
            />
          </label>
          <section className="items-mode-store-buckets" aria-label="store bucket list">
            {storeWizardDraft.buckets.map((bucket, index) => (
              <div key={index} className="items-mode-store-bucket-row">
                <strong>Bucket {index + 1}</strong>
                <label>
                  <span>Type</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    aria-label={`Bucket ${index + 1} type`}
                    value={bucket.bucketTypeId}
                    onChange={(event) =>
                      handleStoreBucketChange(
                        index,
                        "bucketTypeId",
                        sanitizeStoreCreationNumberInput(event.target.value, 0xffffffff)
                      )
                    }
                  />
                </label>
                <div className="items-mode-store-bucket-items">
                  {bucket.itemListEntries.map((item, itemIndex) => (
                    <div key={itemIndex} className="items-mode-store-bucket-item-row">
                      <label>
                        <span>Item ResRef</span>
                        <input
                          aria-label={`Bucket ${index + 1} item ${itemIndex + 1} resref`}
                          maxLength={16}
                          value={item.resRef}
                          onChange={(event) =>
                            handleStoreBucketItemChange(
                              index,
                              itemIndex,
                              "resRef",
                              sanitizeStoreCreationResRef(event.target.value)
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Random ResRef</span>
                        <input
                          aria-label={`Bucket ${index + 1} item ${itemIndex + 1} random resref`}
                          maxLength={16}
                          value={item.randomResRef}
                          onChange={(event) =>
                            handleStoreBucketItemChange(
                              index,
                              itemIndex,
                              "randomResRef",
                              sanitizeStoreCreationResRef(event.target.value)
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Random List</span>
                        <input
                          aria-label={`Bucket ${index + 1} item ${itemIndex + 1} random list`}
                          maxLength={16}
                          value={item.randomList}
                          onChange={(event) =>
                            handleStoreBucketItemChange(
                              index,
                              itemIndex,
                              "randomList",
                              sanitizeStoreCreationResRef(event.target.value)
                            )
                          }
                        />
                      </label>
                      {formatEmbeddedStoreItemLabel(item.embeddedItem) ? (
                        <span className="items-mode-store-embedded-item">
                          {formatEmbeddedStoreItemLabel(item.embeddedItem)}
                        </span>
                      ) : null}
                      <label>
                        <span>X</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          aria-label={`Bucket ${index + 1} item ${itemIndex + 1} x`}
                          value={item.x}
                          onChange={(event) =>
                            handleStoreBucketItemChange(
                              index,
                              itemIndex,
                              "x",
                              sanitizeStoreCreationNumberInput(event.target.value, 65535)
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Y</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          aria-label={`Bucket ${index + 1} item ${itemIndex + 1} y`}
                          value={item.y}
                          onChange={(event) =>
                            handleStoreBucketItemChange(
                              index,
                              itemIndex,
                              "y",
                              sanitizeStoreCreationNumberInput(event.target.value, 65535)
                            )
                          }
                        />
                      </label>
                      <label className="items-mode-store-inline-check">
                        <input
                          type="checkbox"
                          aria-label={`Bucket ${index + 1} item ${itemIndex + 1} infinite`}
                          checked={item.infinite}
                          onChange={(event) =>
                            handleStoreBucketItemChange(
                              index,
                              itemIndex,
                              "infinite",
                              event.target.checked
                            )
                          }
                        />
                        <span>Infinite</span>
                      </label>
                      <button
                        type="button"
                        className="items-mode-store-remove-item"
                        aria-label={`Remove bucket ${index + 1} item ${itemIndex + 1}`}
                        onClick={() => handleRemoveStoreBucketItem(index, itemIndex)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="items-mode-store-add-item"
                    aria-label={`Add bucket ${index + 1} item`}
                    onClick={() => handleAddStoreBucketItem(index)}
                  >
                    Add Item
                  </button>
                </div>
              </div>
            ))}
          </section>
          <div className="items-mode-wizard-grid">
            <label>
              <span>Will Not Buy</span>
              <input
                aria-label="Will Not Buy"
                value={storeWizardDraft.willNotBuyBaseItems}
                onChange={(event) =>
                  updateStoreWizardDraft({ willNotBuyBaseItems: event.target.value })
                }
              />
            </label>
            <label>
              <span>Will Only Buy</span>
              <input
                aria-label="Will Only Buy"
                value={storeWizardDraft.willOnlyBuyBaseItems}
                onChange={(event) =>
                  updateStoreWizardDraft({ willOnlyBuyBaseItems: event.target.value })
                }
              />
            </label>
          </div>
          {storeCreatorErrorMessage ? (
            <p className="scene-objects-empty" role="alert">
              {storeCreatorErrorMessage}
            </p>
          ) : null}
          <div className="items-mode-wizard-actions">
            <button type="button" onClick={() => setIsStoreWizardOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={!canSubmitStore}>
              {storeWizardMode === "edit" ? "Update Store" : "Create Store"}
            </button>
          </div>
          <small className="items-mode-store-bucket-count">
            {STORE_CREATION_BUCKET_COUNT} StoreList buckets
          </small>
        </form>
      ) : null}

      {stores.length > 0 ? (
        <section className="items-mode-store-management" aria-label="store blueprints">
          <header className="items-mode-store-management-header">
            <h3>Stores</h3>
            <span>{visibleStores.length}/{stores.length}</span>
          </header>
          <input
            aria-label="Filter stores"
            className="items-mode-store-management-filter"
            type="search"
            value={storeFilterQuery}
            onChange={(event) => setStoreFilterQuery(event.target.value)}
          />
          <ul className="items-mode-store-management-list">
            {visibleStores.map((store) => {
              const sourceStatus = resolveStoreSourceStatus(store);
              return (
                <li key={store.templateId} className="items-mode-store-management-row">
                  <span className="items-mode-store-management-meta">
                    <strong>{store.name}</strong>
                    <small>{store.resref}</small>
                    <small
                      className={`scene-object-row-source ${
                        sourceStatus.moduleBacked ? "is-module-backed" : "is-source-backed"
                      }`}
                      title={sourceStatus.detail}
                    >
                      {sourceStatus.label}
                    </small>
                  </span>
                  <span className="items-mode-store-management-actions">
                    <button
                      type="button"
                      disabled={
                        (!onUpdateStore && sourceStatus.moduleBacked) ||
                        (!onCreateStore && !sourceStatus.moduleBacked) ||
                        storeCreatorStatus === "applying"
                      }
                      aria-label={`Edit store ${store.resref}`}
                      onClick={() => handleEditStoreWizard(store)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={!onCreateStore || storeCreatorStatus === "applying"}
                      aria-label={`Duplicate store ${store.resref}`}
                      onClick={() => handleDuplicateStoreWizard(store)}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      disabled={
                        !onDeleteStore || !sourceStatus.moduleBacked || storeCreatorStatus === "applying"
                      }
                      aria-label={`Delete store ${store.resref}`}
                      onClick={() => {
                        void onDeleteStore?.(store);
                      }}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          {visibleStores.length === 0 ? (
            <p className="scene-objects-empty">No stores match the current filter.</p>
          ) : null}
        </section>
      ) : null}

      {generatorSupport ? (
        <section
          className={`items-mode-generator-status is-${generatorSupport.status}`}
          aria-label="item generator support"
          role="status"
        >
          <header>
            <strong>{resolveGeneratorStatusLabel(generatorSupport)}</strong>
            <span>
              {generatorSupport.parseableGffCount}/{generatorSupport.gffCandidateCount} GFF ready /{" "}
              {generatorSupport.ltrLexiconCount} LTR
            </span>
          </header>
          <p>{resolveGeneratorStatusDetail(generatorSupport)}</p>
          {generatorSupport.sources[0] ? (
            <small title={generatorSupport.sources[0].objectKey}>
              {generatorSupport.sources[0].fileName}: {generatorSupport.sources[0].header || "-"}
            </small>
          ) : null}
        </section>
      ) : null}

      <div className="items-mode-summary" aria-label="items catalog summary">
        <span title="Wizard-created item blueprints">{customCount} custom</span>
        <span title="Items with model part metadata">{assembledCount} assembled</span>
        <span title="Items with armor body-part metadata">{armorCount} armor</span>
        <span title="Items with material color metadata">{coloredCount} colored</span>
      </div>

      {paletteOptions.length > 0 ? (
        <div className="items-mode-palette-filter" aria-label="item palette tree">
          <label>
            <span>Palette</span>
            <select
              aria-label="Item palette category"
              value={selectedPaletteNodeId}
              onChange={(event) => setSelectedPaletteNodeId(event.target.value)}
            >
              <option value="all">
                All palette items ({paletteTree?.leafCount ?? paletteOptions.length})
              </option>
              {paletteOptions.map((option) => (
                <option key={option.nodeId} value={option.nodeId}>
                {formatItemPaletteFilterLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <small>
            {selectedPaletteOption
              ? `${selectedPaletteOption.resRefs.length} resrefs from ${paletteTree?.activeSource ?? "itempal"}`
              : `${paletteTree?.rootCount ?? 0} roots / ${paletteTree?.leafCount ?? 0} leaves`}
          </small>
          <button
            type="button"
            disabled={!canWriteCustomPalette}
            aria-label="Write custom item palette"
            onClick={() => {
              const payload = buildCustomPalettePayloadFromObjects(paletteFilteredObjects);
              void onWriteCustomPalette?.(payload);
            }}
          >
            Save Custom
          </button>
        </div>
      ) : null}

      <div className="scene-objects-search">
        <input
          type="search"
          aria-label="Filter items"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Filter by id / resref"
        />
        {searchQuery ? (
          <button
            type="button"
            className="scene-objects-search-clear"
            aria-label="Clear items filter"
            title="Clear filter"
            onClick={() => onSearchQueryChange("")}
          >
            X
          </button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <button
          type="button"
          className="scene-objects-filter-reset"
          aria-label="Reset items filters"
          onClick={() => {
            setSelectedPaletteNodeId("all");
            onResetFilters();
          }}
        >
          Reset filters
        </button>
      ) : null}

      {isLoading ? (
        <p className="scene-objects-empty" role="status">
          {loadingMessage}
        </p>
      ) : null}
      {loadErrorMessage ? (
        <p className="scene-objects-empty" role="alert">
          {loadErrorMessage}
        </p>
      ) : null}

      {shouldShowEmpty ? (
        <p className="scene-objects-empty">No items available.</p>
      ) : (
        <>
          <ul className="scene-object-list scene-object-add-list" aria-label="items mode list">
            {visibleObjects.map((object) => {
              const isSelected = object.id === activeObjectId;
              const thumbnailSourceObject = processedPreviewObjectsById[object.id] ?? object;
              const isCustomItem = isItemCreationWizardSceneObject(object);
              const modelParts = resolveItemModelParts(thumbnailSourceObject);
              const resourceLabel =
                object.id.trim().toLowerCase() === object.resRef.trim().toLowerCase()
                  ? object.resRef
                  : `${object.id} / ${object.resRef}`;
              const detail = formatItemDetail(object);
              const baseIconPreview = visibleIconPreviews.get(object.id);
              const iconPreviewCacheKey = baseIconPreview
                ? resolveItemIconPreviewCacheKey(baseIconPreview)
                : "";
              const decodedIconPreview = baseIconPreview
                ? decodedItemIconPreviews[iconPreviewCacheKey]
                : undefined;
              const iconPreview = decodedIconPreview ?? baseIconPreview;
              const iconDecodeStatus = iconPreviewCacheKey
                ? itemIconDecodeStatuses[iconPreviewCacheKey]
                : undefined;
              const visualSupportInfo = resolveItemVisualSupportInfo(thumbnailSourceObject);
              const shouldSuppressUnsupportedThumbnail =
                visualSupportInfo?.tone === "warning";
              const armorThumbnailResolutions =
                resolveItemArmorPartModelResolutions(thumbnailSourceObject);
              const modelThumbnailResolutions =
                resolveItemModelPartResolutions(thumbnailSourceObject);
              const has3dModelThumbnailSource =
                !shouldSuppressUnsupportedThumbnail &&
                (armorThumbnailResolutions.length > 0 || modelThumbnailResolutions.length > 0);
              const hasAuroraIconSource = Boolean(baseIconPreview);
              const hasIconPreviewImage = Boolean(iconPreview?.previewImageUrl);
              const shouldPrefer3dModelThumbnailOverIcon =
                has3dModelThumbnailSource &&
                shouldPreferItemModelThumbnailOverIcon(thumbnailSourceObject);
              const shouldRender3dThumbnail =
                has3dModelThumbnailSource &&
                (!hasAuroraIconSource || shouldPrefer3dModelThumbnailOverIcon);
              const isShieldThumbnailSource =
                isShieldItemThumbnailSource(thumbnailSourceObject);
              const capturedPreviewImageUrl = previewThumbnailUrlsByObjectId[object.id] ?? "";
              const hasCapturedPreviewImage =
                capturedPreviewImageUrl.startsWith("data:image/") &&
                !isShieldThumbnailSource &&
                !shouldSuppressUnsupportedThumbnail;
              const shouldUseCapturedPreviewImage =
                hasCapturedPreviewImage && !has3dModelThumbnailSource && !hasAuroraIconSource;
              const thumbnailObject = hasIconPreviewImage && !shouldPrefer3dModelThumbnailOverIcon
                ? { ...thumbnailSourceObject, previewImageUrl: iconPreview?.previewImageUrl ?? "" }
                : shouldUseCapturedPreviewImage
                  ? { ...thumbnailSourceObject, previewImageUrl: capturedPreviewImageUrl }
                  : thumbnailSourceObject;
              const inventoryGrid = iconPreview?.inventoryGrid ?? {
                widthSlots: 1,
                heightSlots: 1,
                cellCount: 1,
                aspectRatio: 1
              };
              const shouldShowInventoryThumbnail =
                !shouldSuppressUnsupportedThumbnail &&
                (shouldRender3dThumbnail ||
                  hasAuroraIconSource ||
                  hasIconPreviewImage ||
                  shouldUseCapturedPreviewImage);
              return (
                <li key={object.id}>
                  <div className="items-mode-row">
                    <button
                      type="button"
                      className={`scene-object-row scene-object-add-row ${isSelected ? "is-selected" : ""}`}
                      aria-selected={isSelected}
                      data-scene-object-id={object.id}
                      data-res-ref={object.resRef}
                      onClick={() => onObjectClick(object)}
                    >
                      {shouldShowInventoryThumbnail ? (
                        <span
                          className={`items-mode-inventory-icon ${
                            shouldRender3dThumbnail || shouldUseCapturedPreviewImage
                              ? "items-mode-inventory-icon-model"
                              : ""
                          }`}
                          aria-label={`${object.tag} inventory icon grid ${inventoryGrid.widthSlots} x ${inventoryGrid.heightSlots}`}
                          title={`${iconPreview?.iconResRef ?? object.resRef} inventory ${inventoryGrid.widthSlots} x ${inventoryGrid.heightSlots}`}
                          data-grid-width={inventoryGrid.widthSlots}
                          data-grid-height={inventoryGrid.heightSlots}
                          data-grid-cells={inventoryGrid.cellCount}
                          style={resolveItemInventoryIconStyle(inventoryGrid)}
                        >
                          <span
                            className={`items-mode-inventory-icon-frame ${
                              shouldRender3dThumbnail ? "items-mode-inventory-icon-frame-model" : ""
                            }`}
                          >
                            <SceneObjectThumbnail
                              object={thumbnailObject}
                              fallbackLabel={trimWorkspacePreviewLabel(object.tag)}
                              placeableAssetAccessToken={itemThumbnailAssetAccessToken}
                              thumbnailRenderEnabled={shouldRender3dThumbnail}
                              allowGeneratedFallback={false}
                              preferModelPreview={shouldPrefer3dModelThumbnailOverIcon}
                              forceRender={isSelected}
                            />
                            {!shouldRender3dThumbnail && !shouldUseCapturedPreviewImage ? (
                              <span
                                className="items-mode-inventory-icon-grid"
                                aria-hidden="true"
                              >
                                {Array.from({ length: inventoryGrid.cellCount }, (_, cellIndex) => (
                                  <span key={cellIndex} />
                                ))}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      ) : null}
                      <span className="scene-object-row-meta scene-object-add-row-meta">
                        <strong title={object.tag}>{object.tag}</strong>
                        <small title={resourceLabel}>{resourceLabel}</small>
                        {isCustomItem ? (
                          <small className="scene-object-row-source">CUSTOM UTI</small>
                        ) : null}
                        {iconPreview ? (
                          <small
                            className="scene-object-row-source"
                            title={`${iconPreview.iconResRef} / ${iconPreview.source}`}
                          >
                            ICON {iconPreview.iconResRef}
                          </small>
                        ) : null}
                        {baseIconPreview ? (
                          <span
                            className="items-mode-icon-decode-status"
                            hidden
                            data-icon-decode-status={iconDecodeStatus?.status ?? "pending"}
                            data-icon-decode-message={iconDecodeStatus?.message ?? ""}
                            data-icon-cache-key={iconPreviewCacheKey}
                          />
                        ) : null}
                        {visualSupportInfo ? (
                          <small
                            className={`items-mode-visual-status is-${visualSupportInfo.tone}`}
                            title={visualSupportInfo.detail}
                            data-visual-support-code={visualSupportInfo.code}
                            data-visual-support-kind={visualSupportInfo.kind}
                            data-visual-support-tone={visualSupportInfo.tone}
                          >
                            {visualSupportInfo.label}
                          </small>
                        ) : null}
                        {detail ? <small title={detail}>{detail}</small> : null}
                        {modelParts.length > 0 ? (
                          <span className="items-mode-part-strip" aria-label="item model parts">
                            {modelParts.map((part) => (
                              <span
                                key={part.slot}
                                className="items-mode-part-chip"
                                title={
                                  part.resRef
                                    ? `${part.label}: ${part.value} (${part.resRef})`
                                    : `${part.label}: ${part.value}`
                                }
                              >
                                {part.slot.replace("part", "P")}
                                <b>{part.value}</b>
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    {isCustomItem || onCreateItem ? (
                      <span className="items-mode-item-actions">
                        {isCustomItem && onUpdateItem ? (
                          <button
                            type="button"
                            className="items-mode-item-action"
                            disabled={storeCreatorStatus === "applying"}
                            aria-label={`Edit custom item ${object.tag}`}
                            title="Edit custom item"
                            onClick={() => handleEditItemWizard(object)}
                          >
                            Edit
                          </button>
                        ) : null}
                        {onCreateItem ? (
                          <button
                            type="button"
                            className="items-mode-item-action"
                            disabled={storeCreatorStatus === "applying"}
                            aria-label={`Duplicate item ${object.tag}`}
                            title="Duplicate item"
                            onClick={() => handleDuplicateItemWizard(object)}
                          >
                            Duplicate
                          </button>
                        ) : null}
                        {isCustomItem && onDeleteItem ? (
                          <button
                            type="button"
                            className="items-mode-item-action is-danger"
                            disabled={storeCreatorStatus === "applying"}
                            aria-label={`Delete custom item ${object.tag}`}
                            title="Delete custom item"
                            onClick={() => {
                              void onDeleteItem(object);
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {hasMoreVisibleObjects ? (
            <button
              type="button"
              className="scene-objects-filter-reset"
              aria-label="Show more items"
              onClick={() => setVisibleLimit((current) => current + ITEMS_MODE_VISIBLE_BATCH_SIZE)}
            >
              More
            </button>
          ) : null}
        </>
      )}
    </article>
  );
}
