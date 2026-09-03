import type {
  StoreApiBlueprintBucketEntry,
  StoreApiBlueprintCreatePayload,
  StoreApiBlueprintEmbeddedItemEntry,
  StoreApiBlueprintItemEntry,
  StoreApiListItem
} from "../contracts";
import type { SceneObjectEmbeddedItemSummary } from "../../scene/contracts";

export const STORE_CREATION_BUCKET_COUNT = 5;
export const STORE_CREATION_BUCKET_TYPE_IDS = [0, 4, 2, 3, 1] as const;
const STORE_CREATION_SIGNED_INT_MIN = -0x80000000;
const STORE_CREATION_SIGNED_INT_MAX = 0x7fffffff;

export interface StoreCreationEmbeddedItemSummary extends SceneObjectEmbeddedItemSummary {}

export interface StoreCreationBucketItemDraft {
  resRef: string;
  randomResRef: string;
  randomList: string;
  embeddedItem?: StoreCreationEmbeddedItemSummary;
  x: string;
  y: string;
  infinite: boolean;
}

export interface StoreCreationBucketDraft {
  bucketTypeId: string;
  itemListEntries: StoreCreationBucketItemDraft[];
}

export interface StoreCreationWizardDraft {
  name: string;
  resRef: string;
  tag: string;
  overwriteExisting: boolean;
  comments: string;
  markUp: string;
  markDown: string;
  blackMarket: boolean;
  bmMarkDown: string;
  identifyPrice: string;
  maxBuyPrice: string;
  storeGold: string;
  onOpenStore: string;
  onStoreClosed: string;
  storeId: string;
  buckets: StoreCreationBucketDraft[];
  willNotBuyBaseItems: string;
  willOnlyBuyBaseItems: string;
}

export function createStoreWizardDraft(sequence: number): StoreCreationWizardDraft {
  const suffix = String(Math.max(1, sequence)).padStart(3, "0").slice(-3);
  return {
    name: `Custom Store ${suffix}`,
    resRef: `custom_store_${suffix}`.slice(0, 16),
    tag: `CUSTOM_STORE_${suffix}`.slice(0, 32),
    overwriteExisting: false,
    comments: "",
    markUp: "0",
    markDown: "0",
    blackMarket: false,
    bmMarkDown: "0",
    identifyPrice: "100",
    maxBuyPrice: "-1",
    storeGold: "-1",
    onOpenStore: "",
    onStoreClosed: "",
    storeId: "255",
    buckets: STORE_CREATION_BUCKET_TYPE_IDS.map((bucketTypeId) => ({
      bucketTypeId: String(bucketTypeId),
      itemListEntries: [createEmptyStoreBucketItemDraft()]
    })),
    willNotBuyBaseItems: "",
    willOnlyBuyBaseItems: ""
  };
}

export function createStoreWizardDraftFromStore(
  store: StoreApiListItem
): StoreCreationWizardDraft {
  const metadata = store.metadata;
  const resRef = readStringMetadata(metadata, "templateResRef") ?? store.resref;
  const tag = readStringMetadata(metadata, "tag") ?? resRef.toUpperCase();
  const storeListEntries = readJsonMetadata<ParsedStoreBucketMetadata[]>(
    metadata,
    "storeListEntries"
  );
  return {
    name: readStringMetadata(metadata, "localizedName") ?? store.name,
    resRef: sanitizeStoreCreationResRef(resRef),
    tag: sanitizeStoreCreationTag(tag),
    overwriteExisting: false,
    comments: readStringMetadata(metadata, "comments") ?? "",
    markUp: formatOptionalNumber(readNumberMetadata(metadata, "markUp")),
    markDown: formatOptionalNumber(readNumberMetadata(metadata, "markDown")),
    blackMarket: readBooleanMetadata(metadata, "blackMarket") ?? false,
    bmMarkDown: formatOptionalNumber(readNumberMetadata(metadata, "bmMarkDown")),
    identifyPrice: formatOptionalNumber(readNumberMetadata(metadata, "identifyPrice")),
    maxBuyPrice: formatOptionalNumber(readNumberMetadata(metadata, "maxBuyPrice")),
    storeGold: formatOptionalNumber(readNumberMetadata(metadata, "storeGold")),
    onOpenStore: sanitizeStoreCreationResRef(readStringMetadata(metadata, "onOpenStore") ?? ""),
    onStoreClosed: sanitizeStoreCreationResRef(
      readStringMetadata(metadata, "onStoreClosed") ?? ""
    ),
    storeId: formatOptionalNumber(readNumberMetadata(metadata, "storeId")),
    buckets: buildStoreBucketsDraftFromMetadata(storeListEntries),
    willNotBuyBaseItems: formatBaseItemList(
      readJsonMetadata<number[]>(metadata, "willNotBuyBaseItems")
    ),
    willOnlyBuyBaseItems: formatBaseItemList(
      readJsonMetadata<number[]>(metadata, "willOnlyBuyBaseItems")
    )
  };
}

export function createDuplicateStoreWizardDraftFromStore(
  store: StoreApiListItem,
  sequence: number
): StoreCreationWizardDraft {
  const draft = createStoreWizardDraftFromStore(store);
  const suffix = String(Math.max(1, sequence)).padStart(3, "0").slice(-3);
  const duplicateResRef = buildSuffixedIdentifier(draft.resRef || store.resref, suffix, 16);
  const duplicateTag = buildSuffixedIdentifier(draft.tag || draft.resRef || store.resref, suffix, 32);
  return {
    ...draft,
    name: `${draft.name || store.name} Copy`.slice(0, 128),
    resRef: sanitizeStoreCreationResRef(duplicateResRef),
    tag: sanitizeStoreCreationTag(duplicateTag),
    overwriteExisting: false
  };
}

export function createEmptyStoreBucketItemDraft(): StoreCreationBucketItemDraft {
  return {
    resRef: "",
    randomResRef: "",
    randomList: "",
    x: "0",
    y: "0",
    infinite: false
  };
}

export function sanitizeStoreCreationNumberInput(value: string, max: number): string {
  const digits = value.replace(/[^0-9]/gu, "");
  if (!digits) {
    return "";
  }
  return String(Math.max(0, Math.min(max, Number.parseInt(digits, 10))));
}

export function sanitizeStoreCreationSignedIntInput(value: string): string {
  const trimmed = value.trimStart();
  const negative = trimmed.startsWith("-");
  const digits = trimmed.replace(/[^0-9]/gu, "");
  if (!digits) {
    return negative ? "-" : "";
  }
  const parsed = Number.parseInt(`${negative ? "-" : ""}${digits}`, 10);
  return String(
    Math.max(STORE_CREATION_SIGNED_INT_MIN, Math.min(STORE_CREATION_SIGNED_INT_MAX, parsed))
  );
}

export function sanitizeStoreCreationResRef(value: string): string {
  return value
    .trimStart()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "_")
    .replace(/_{2,}/gu, "_")
    .slice(0, 16);
}

export function sanitizeStoreCreationTag(value: string): string {
  return value
    .trimStart()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/gu, "_")
    .replace(/_{2,}/gu, "_")
    .slice(0, 32);
}

export function buildStoreBlueprintCreatePayloadFromDraft(
  draft: StoreCreationWizardDraft
): StoreApiBlueprintCreatePayload | null {
  const resRef = draft.resRef.trim();
  const name = draft.name.trim();
  if (!resRef || !name) {
    return null;
  }

  const storeListEntries = draft.buckets.map(buildStoreBucketPayload);
  const payload: StoreApiBlueprintCreatePayload = {
    resRef,
    name,
    tag: optionalString(draft.tag),
    comments: optionalString(draft.comments),
    markUp: optionalNumber(draft.markUp),
    markDown: optionalNumber(draft.markDown),
    blackMarket: draft.blackMarket,
    bmMarkDown: optionalNumber(draft.bmMarkDown),
    identifyPrice: optionalNumber(draft.identifyPrice),
    maxBuyPrice: optionalNumber(draft.maxBuyPrice),
    storeGold: optionalNumber(draft.storeGold),
    onOpenStore: optionalString(draft.onOpenStore),
    onStoreClosed: optionalString(draft.onStoreClosed),
    storeId: optionalNumber(draft.storeId),
    storeListEntries,
    willNotBuyBaseItems: parseBaseItemList(draft.willNotBuyBaseItems),
    willOnlyBuyBaseItems: parseBaseItemList(draft.willOnlyBuyBaseItems),
    overwrite: draft.overwriteExisting
  };

  return payload;
}

function buildStoreBucketPayload(
  bucket: StoreCreationBucketDraft,
  index: number
): StoreApiBlueprintBucketEntry {
  const itemListEntries = bucket.itemListEntries
    .map(buildStoreItemPayload)
    .filter((entry): entry is StoreApiBlueprintItemEntry => Boolean(entry));
  return {
    bucketTypeId: optionalNumber(bucket.bucketTypeId) ?? STORE_CREATION_BUCKET_TYPE_IDS[index],
    itemListEntries
  };
}

interface ParsedStoreBucketMetadata {
  bucketIndex?: number;
  bucketTypeId?: number;
  itemListEntries?: ParsedStoreBucketItemMetadata[];
}

interface ParsedStoreBucketItemMetadata {
  resRef?: string;
  randomResRef?: string;
  randomList?: string;
  embeddedItem?: StoreCreationEmbeddedItemSummary;
  x?: number;
  y?: number;
  infinite?: boolean;
}

function buildStoreBucketsDraftFromMetadata(
  entries: ParsedStoreBucketMetadata[] | undefined
): StoreCreationBucketDraft[] {
  const byIndex = new Map<number, ParsedStoreBucketMetadata>();
  (entries ?? []).forEach((entry, fallbackIndex) => {
    const index =
      typeof entry.bucketIndex === "number" && Number.isInteger(entry.bucketIndex)
        ? entry.bucketIndex
        : fallbackIndex;
    if (index >= 0 && index < STORE_CREATION_BUCKET_COUNT) {
      byIndex.set(index, entry);
    }
  });

  return Array.from({ length: STORE_CREATION_BUCKET_COUNT }, (_entry, index) => {
    const source = byIndex.get(index);
    const items = (source?.itemListEntries ?? [])
      .map(buildStoreBucketItemDraftFromMetadata)
      .filter((item): item is StoreCreationBucketItemDraft => Boolean(item));
    return {
      bucketTypeId:
        formatOptionalNumber(source?.bucketTypeId) || String(STORE_CREATION_BUCKET_TYPE_IDS[index]),
      itemListEntries: items.length > 0 ? items : [createEmptyStoreBucketItemDraft()]
    };
  });
}

function buildStoreBucketItemDraftFromMetadata(
  item: ParsedStoreBucketItemMetadata
): StoreCreationBucketItemDraft | null {
  const resRef = sanitizeStoreCreationResRef(item.resRef ?? "");
  const randomResRef = sanitizeStoreCreationResRef(item.randomResRef ?? "");
  const randomList = sanitizeStoreCreationResRef(item.randomList ?? "");
  const embeddedItem = normalizeEmbeddedItemSummary(item.embeddedItem);
  if (!resRef && !randomResRef && !randomList && !embeddedItem) {
    return null;
  }
  return {
    resRef,
    randomResRef,
    randomList,
    ...(embeddedItem ? { embeddedItem } : {}),
    x: formatOptionalNumber(item.x) || "0",
    y: formatOptionalNumber(item.y) || "0",
    infinite: item.infinite === true
  };
}

function normalizeEmbeddedItemSummary(
  value: StoreCreationEmbeddedItemSummary | undefined
): StoreCreationEmbeddedItemSummary | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const normalized: StoreCreationEmbeddedItemSummary = {
    sourceStructTypeId: normalizeEmbeddedItemNumber(value.sourceStructTypeId),
    templateResRef: optionalString(value.templateResRef ?? ""),
    tag: optionalString(value.tag ?? ""),
    localizedName: optionalString(value.localizedName ?? ""),
    localizedNameStrRef: normalizeEmbeddedItemNumber(value.localizedNameStrRef),
    description: optionalString(value.description ?? ""),
    descriptionStrRef: normalizeEmbeddedItemNumber(value.descriptionStrRef),
    identifiedDescription: optionalString(value.identifiedDescription ?? ""),
    identifiedDescriptionStrRef: normalizeEmbeddedItemNumber(value.identifiedDescriptionStrRef),
    comments: optionalString(value.comments ?? ""),
    paletteId: normalizeEmbeddedItemNumber(value.paletteId),
    plot: typeof value.plot === "boolean" ? value.plot : undefined,
    baseItem: normalizeEmbeddedItemNumber(value.baseItem),
    modelPart1: normalizeEmbeddedItemNumber(value.modelPart1),
    modelPart2: normalizeEmbeddedItemNumber(value.modelPart2),
    modelPart3: normalizeEmbeddedItemNumber(value.modelPart3),
    cost: normalizeEmbeddedItemNumber(value.cost),
    addCost: normalizeEmbeddedItemNumber(value.addCost),
    costTable: normalizeEmbeddedItemNumber(value.costTable),
    costValue: normalizeEmbeddedItemNumber(value.costValue),
    charges: normalizeEmbeddedItemNumber(value.charges),
    stackSize: normalizeEmbeddedItemNumber(value.stackSize),
    identified: typeof value.identified === "boolean" ? value.identified : undefined,
    stolen: typeof value.stolen === "boolean" ? value.stolen : undefined,
    cursed: typeof value.cursed === "boolean" ? value.cursed : undefined,
    bodyPartRFoot: normalizeEmbeddedItemNumber(value.bodyPartRFoot),
    bodyPartLFoot: normalizeEmbeddedItemNumber(value.bodyPartLFoot),
    bodyPartRShin: normalizeEmbeddedItemNumber(value.bodyPartRShin),
    bodyPartLShin: normalizeEmbeddedItemNumber(value.bodyPartLShin),
    bodyPartLThigh: normalizeEmbeddedItemNumber(value.bodyPartLThigh),
    bodyPartRThigh: normalizeEmbeddedItemNumber(value.bodyPartRThigh),
    bodyPartPelvis: normalizeEmbeddedItemNumber(value.bodyPartPelvis),
    bodyPartTorso: normalizeEmbeddedItemNumber(value.bodyPartTorso),
    bodyPartBelt: normalizeEmbeddedItemNumber(value.bodyPartBelt),
    bodyPartNeck: normalizeEmbeddedItemNumber(value.bodyPartNeck),
    bodyPartRFArm: normalizeEmbeddedItemNumber(value.bodyPartRFArm),
    bodyPartLFArm: normalizeEmbeddedItemNumber(value.bodyPartLFArm),
    bodyPartRBicep: normalizeEmbeddedItemNumber(value.bodyPartRBicep),
    bodyPartLBicep: normalizeEmbeddedItemNumber(value.bodyPartLBicep),
    bodyPartRShoul: normalizeEmbeddedItemNumber(value.bodyPartRShoul),
    bodyPartLShoul: normalizeEmbeddedItemNumber(value.bodyPartLShoul),
    bodyPartRHand: normalizeEmbeddedItemNumber(value.bodyPartRHand),
    bodyPartLHand: normalizeEmbeddedItemNumber(value.bodyPartLHand),
    bodyPartRobe: normalizeEmbeddedItemNumber(value.bodyPartRobe),
    leather1Color: normalizeEmbeddedItemNumber(value.leather1Color),
    leather2Color: normalizeEmbeddedItemNumber(value.leather2Color),
    cloth1Color: normalizeEmbeddedItemNumber(value.cloth1Color),
    cloth2Color: normalizeEmbeddedItemNumber(value.cloth2Color),
    metal1Color: normalizeEmbeddedItemNumber(value.metal1Color),
    metal2Color: normalizeEmbeddedItemNumber(value.metal2Color),
    itemPropertyListCount: normalizeEmbeddedItemNumber(value.itemPropertyListCount),
    itemPropertyListEntries: value.itemPropertyListEntries?.map((entry) => ({ ...entry })),
    scripts: normalizeEmbeddedItemScripts(value.scripts),
    fieldCount: normalizeEmbeddedItemNumber(value.fieldCount)
  };
  return Object.values(normalized).some((entry) => entry !== undefined && entry !== "")
    ? normalized
    : undefined;
}

function normalizeEmbeddedItemScripts(
  value: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const normalized = Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key.trim(), entry.trim()] as const)
      .filter(([key, entry]) => key.length > 0 && entry.length > 0)
  );
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeEmbeddedItemNumber(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;
}

function readStringMetadata(
  metadata: StoreApiListItem["metadata"] | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumberMetadata(
  metadata: StoreApiListItem["metadata"] | undefined,
  key: string
): number | undefined {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBooleanMetadata(
  metadata: StoreApiListItem["metadata"] | undefined,
  key: string
): boolean | undefined {
  const value = metadata?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function readJsonMetadata<TValue>(
  metadata: StoreApiListItem["metadata"] | undefined,
  key: string
): TValue | undefined {
  const value = metadata?.[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(value) as TValue;
  } catch {
    return undefined;
  }
}

function formatBaseItemList(entries: number[] | undefined): string {
  if (!entries || entries.length === 0) {
    return "";
  }
  return entries
    .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 65535)
    .join(", ");
}

function formatOptionalNumber(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(Math.trunc(value)) : "";
}

function buildSuffixedIdentifier(value: string, suffix: string, maxLength: number): string {
  const normalized = value.replace(/_+$/gu, "");
  const availableBaseLength = Math.max(1, maxLength - suffix.length - 1);
  return `${normalized.slice(0, availableBaseLength)}_${suffix}`;
}

function buildStoreItemPayload(
  item: StoreCreationBucketItemDraft
): StoreApiBlueprintItemEntry | null {
  const resRef = optionalString(item.resRef);
  const randomResRef = optionalString(item.randomResRef);
  const randomList = optionalString(item.randomList);
  const embeddedItem = buildStoreEmbeddedItemPayload(item.embeddedItem);
  if (!resRef && !randomResRef && !randomList && !embeddedItem) {
    return null;
  }
  return {
    ...(resRef ? { resRef } : {}),
    ...(embeddedItem ? { embeddedItem } : {}),
    ...(randomResRef ? { randomResRef } : {}),
    ...(randomList ? { randomList } : {}),
    x: optionalNumber(item.x) ?? 0,
    y: optionalNumber(item.y) ?? 0,
    infinite: item.infinite
  };
}

function buildStoreEmbeddedItemPayload(
  embeddedItem: StoreCreationEmbeddedItemSummary | undefined
): StoreApiBlueprintEmbeddedItemEntry | undefined {
  const normalized = normalizeEmbeddedItemSummary(embeddedItem);
  if (!normalized) {
    return undefined;
  }

  const payload: StoreApiBlueprintEmbeddedItemEntry = {
    ...normalized
  };
  return Object.values(payload).some((entry) => entry !== undefined && entry !== "")
    ? payload
    : undefined;
}

function parseBaseItemList(value: string): number[] | undefined {
  const entries = value
    .split(/[,\s]+/u)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => Number.parseInt(entry, 10))
    .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 65535);
  return entries.length > 0 ? Array.from(new Set(entries)) : undefined;
}

function optionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
