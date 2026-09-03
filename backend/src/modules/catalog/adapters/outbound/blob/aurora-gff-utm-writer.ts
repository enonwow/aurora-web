import {
  buildGffBuffer,
  pushEmbeddedItemStruct,
  type SerializableEmbeddedItemBlueprint,
  type SupportedGffField
} from "./aurora-gff-uti-writer";

export interface SerializableStoreItemEntry {
  resRef?: string;
  embeddedItem?: SerializableEmbeddedItemBlueprint;
  randomResRef?: string;
  randomList?: string;
  x?: number;
  y?: number;
  infinite?: boolean;
}

export interface SerializableStoreListBucket {
  bucketTypeId?: number;
  itemListEntries?: SerializableStoreItemEntry[];
}

export interface SerializableStoreBlueprint {
  resRef: string;
  localizedName?: string;
  localizedNameStrRef?: number;
  tag?: string;
  comments?: string;
  markUp?: number;
  markDown?: number;
  blackMarket?: boolean;
  bmMarkDown?: number;
  identifyPrice?: number;
  maxBuyPrice?: number;
  storeGold?: number;
  onOpenStore?: string;
  onStoreClosed?: string;
  storeId?: number;
  storeListEntries?: SerializableStoreListBucket[];
  willNotBuyBaseItems?: number[];
  willOnlyBuyBaseItems?: number[];
  sourceStructTypeId?: number;
}

const UTM_FILE_TYPE = "UTM ";
const ROOT_STRUCT_TYPE_ID = 0xffffffff;
const STORE_BUCKET_COUNT = 5;
const STORE_BUCKET_TYPE_IDS = Object.freeze([0, 4, 2, 3, 1] as const);
const STORE_ITEM_STRUCT_TYPE_ID = 0;
const STORE_RESTRICTED_BASE_ITEM_STRUCT_TYPE_ID = 0;

export function serializeStoreBlueprintToUtmGff(input: SerializableStoreBlueprint): Buffer {
  return buildGffBuffer(
    buildStoreBlueprintFields(input),
    UTM_FILE_TYPE,
    normalizeUInt32(input.sourceStructTypeId ?? ROOT_STRUCT_TYPE_ID)
  );
}

function buildStoreBlueprintFields(input: SerializableStoreBlueprint): SupportedGffField[] {
  const fields: SupportedGffField[] = [];

  pushResRef(fields, "ResRef", input.resRef);
  pushLocString(fields, "LocName", input.localizedName, input.localizedNameStrRef);
  pushCExoString(fields, "Tag", input.tag);
  pushInt(fields, "MarkUp", input.markUp ?? 0);
  pushInt(fields, "MarkDown", input.markDown ?? 0);
  pushByte(fields, "BlackMarket", booleanToByte(input.blackMarket ?? false));
  pushInt(fields, "BM_MarkDown", input.bmMarkDown ?? 0);
  pushInt(fields, "IdentifyPrice", input.identifyPrice ?? 100);
  pushInt(fields, "MaxBuyPrice", input.maxBuyPrice ?? -1);
  pushInt(fields, "StoreGold", input.storeGold ?? -1);
  pushResRef(fields, "OnOpenStore", input.onOpenStore ?? "", true);
  pushResRef(fields, "OnStoreClosed", input.onStoreClosed ?? "", true);

  fields.push({
    label: "WillNotBuy",
    type: "list",
    value: buildRestrictedBaseItemEntries(input.willNotBuyBaseItems)
  });
  fields.push({
    label: "WillOnlyBuy",
    type: "list",
    value: buildRestrictedBaseItemEntries(input.willOnlyBuyBaseItems)
  });

  fields.push({
    label: "StoreList",
    type: "list",
    value: normalizeStoreBuckets(input.storeListEntries).map((bucket, index) => ({
      typeId: normalizeUInt32(bucket.bucketTypeId ?? STORE_BUCKET_TYPE_IDS[index]!),
      fields: buildStoreBucketFields(bucket)
    }))
  });

  pushByte(fields, "ID", input.storeId ?? 0xff);
  pushCExoString(fields, "Comment", input.comments ?? "", true);

  return fields;
}

function normalizeStoreBuckets(
  buckets: SerializableStoreListBucket[] | undefined
): SerializableStoreListBucket[] {
  return Array.from({ length: STORE_BUCKET_COUNT }, (_entry, index) => buckets?.[index] ?? {});
}

function buildStoreBucketFields(bucket: SerializableStoreListBucket): SupportedGffField[] {
  const itemListEntries = (bucket.itemListEntries ?? [])
    .map(buildStoreItemFields)
    .filter((entry) => entry.fields.length > 0);
  if (itemListEntries.length === 0) {
    return [];
  }

  return [{ label: "ItemList", type: "list", value: itemListEntries }];
}

function buildStoreItemFields(entry: SerializableStoreItemEntry): {
  typeId: number;
  fields: SupportedGffField[];
} {
  const fields: SupportedGffField[] = [];
  pushResRef(fields, "InventoryRes", entry.resRef);
  pushEmbeddedItemStruct(fields, "Item", entry.embeddedItem);
  pushResRef(fields, "RandomResRef", entry.randomResRef);
  pushResRef(fields, "RandomList", entry.randomList);
  pushWord(fields, "Repos_PosX", entry.x);
  pushWord(fields, "Repos_Posy", entry.y);
  pushByte(fields, "Infinite", booleanToByte(entry.infinite));
  return { typeId: STORE_ITEM_STRUCT_TYPE_ID, fields };
}

function buildRestrictedBaseItemEntries(
  baseItems: number[] | undefined
): Array<{ typeId: number; fields: SupportedGffField[] }> {
  return (baseItems ?? []).map((baseItem) => ({
    typeId: STORE_RESTRICTED_BASE_ITEM_STRUCT_TYPE_ID,
    fields: [{ label: "BaseItem", type: "dword", value: baseItem }]
  }));
}

function pushByte(fields: SupportedGffField[], label: string, value: unknown): void {
  if (isFiniteNumber(value)) {
    fields.push({ label, type: "byte", value });
  }
}

function pushWord(fields: SupportedGffField[], label: string, value: unknown): void {
  if (isFiniteNumber(value)) {
    fields.push({ label, type: "word", value });
  }
}

function pushDword(fields: SupportedGffField[], label: string, value: unknown): void {
  if (isFiniteNumber(value)) {
    fields.push({ label, type: "dword", value });
  }
}

function pushInt(fields: SupportedGffField[], label: string, value: unknown): void {
  if (isFiniteNumber(value)) {
    fields.push({ label, type: "int", value: normalizeInt32(value) });
  }
}

function pushCExoString(
  fields: SupportedGffField[],
  label: string,
  value: unknown,
  retainEmpty = false
): void {
  const normalized = normalizeString(value);
  if (normalized !== undefined || retainEmpty) {
    fields.push({ label, type: "cexostring", value: normalized ?? "" });
  }
}

function pushResRef(
  fields: SupportedGffField[],
  label: string,
  value: unknown,
  retainEmpty = false
): void {
  const normalized = normalizeResRef(value);
  if (normalized !== undefined || retainEmpty) {
    fields.push({ label, type: "resref", value: normalized ?? "" });
  }
}

function pushLocString(
  fields: SupportedGffField[],
  label: string,
  text: unknown,
  strRef: unknown
): void {
  const normalizedText = normalizeString(text);
  const normalizedStrRef = isFiniteNumber(strRef) ? normalizeUInt32(strRef) : undefined;
  if (normalizedText || normalizedStrRef !== undefined) {
    fields.push({
      label,
      type: "cexolocstring",
      value: { ...(normalizedText ? { text: normalizedText } : {}), strRef: normalizedStrRef }
    });
  }
}

function booleanToByte(value: boolean | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value ? 1 : 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeUInt32(value: number): number {
  return Math.max(0, Math.min(0xffffffff, Math.trunc(value))) >>> 0;
}

function normalizeInt32(value: number): number {
  const normalized = Math.trunc(value);
  if (!Number.isSafeInteger(normalized) || normalized < -0x8000_0000 || normalized > 0x7fff_ffff) {
    throw new RangeError("Expected a signed 32-bit Store value.");
  }
  return normalized;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeResRef(value: unknown): string | undefined {
  const normalized = normalizeString(value)?.replace(/[^a-z0-9_]/giu, "_").slice(0, 16);
  return normalized && /[a-z0-9]/iu.test(normalized) ? normalized : undefined;
}
