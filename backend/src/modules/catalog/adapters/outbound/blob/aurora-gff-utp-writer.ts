import {
  buildGffBuffer,
  pushEmbeddedItemStruct,
  type SerializableEmbeddedItemBlueprint,
  type SupportedGffField
} from "./aurora-gff-uti-writer";

export interface SerializablePlaceableInventoryItemEntry {
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

export interface SerializablePlaceableBlueprint {
  templateResRef?: string;
  localizedName?: string;
  localizedNameStrRef?: number;
  tag?: string;
  comments?: string;
  plot?: boolean;
  useable?: boolean;
  hasInventory?: boolean;
  appearanceId?: number;
  isStatic?: boolean;
  inventoryItemListEntries?: SerializablePlaceableInventoryItemEntry[];
  sourceStructTypeId?: number;
}

const UTP_FILE_TYPE = "UTP ";
const ROOT_STRUCT_TYPE_ID = 0xffffffff;
const PLACEABLE_INVENTORY_STRUCT_TYPE_ID = 0;

export function serializePlaceableBlueprintToUtpGff(
  input: SerializablePlaceableBlueprint
): Buffer {
  return buildGffBuffer(
    buildPlaceableBlueprintFields(input),
    UTP_FILE_TYPE,
    normalizeUInt32(input.sourceStructTypeId ?? ROOT_STRUCT_TYPE_ID)
  );
}

function buildPlaceableBlueprintFields(input: SerializablePlaceableBlueprint): SupportedGffField[] {
  const fields: SupportedGffField[] = [];
  pushResRef(fields, "TemplateResRef", input.templateResRef);
  pushLocString(fields, "LocName", input.localizedName, input.localizedNameStrRef);
  pushCExoString(fields, "Tag", input.tag);
  pushCExoString(fields, "Comment", input.comments);
  pushByte(fields, "Plot", booleanToByte(input.plot));
  pushByte(fields, "Useable", booleanToByte(input.useable));
  pushByte(fields, "HasInventory", booleanToByte(input.hasInventory));
  pushDword(fields, "Appearance", input.appearanceId);
  pushByte(fields, "Static", booleanToByte(input.isStatic));

  const inventoryEntries = (input.inventoryItemListEntries ?? [])
    .map(buildInventoryItemFields)
    .filter((entry) => entry.fields.length > 0);
  if (inventoryEntries.length > 0) {
    fields.push({ label: "ItemList", type: "list", value: inventoryEntries });
  }

  return fields;
}

function buildInventoryItemFields(entry: SerializablePlaceableInventoryItemEntry): {
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
  pushByte(fields, "Dropable", booleanToByte(entry.dropable));
  pushByte(fields, "Pickpocketable", booleanToByte(entry.pickpocketable));
  pushByte(fields, "Infinite", booleanToByte(entry.infinite));
  return { typeId: PLACEABLE_INVENTORY_STRUCT_TYPE_ID, fields };
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

function pushCExoString(fields: SupportedGffField[], label: string, value: unknown): void {
  const normalized = normalizeString(value);
  if (normalized) {
    fields.push({ label, type: "cexostring", value: normalized });
  }
}

function pushResRef(fields: SupportedGffField[], label: string, value: unknown): void {
  const normalized = normalizeResRef(value);
  if (normalized) {
    fields.push({ label, type: "resref", value: normalized });
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
