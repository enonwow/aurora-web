import type {
  ParsedItemPropertyListEntry,
  ParsedTemplateBlueprint
} from "./aurora-gff-template-parser";
import { SCRIPT_FIELD_LABELS } from "./aurora-gff-template-parser";

type SerializableItemBlueprint = Pick<
  ParsedTemplateBlueprint,
  | "templateResRef"
  | "localizedName"
  | "localizedNameStrRef"
  | "description"
  | "descriptionStrRef"
  | "identifiedDescription"
  | "identifiedDescriptionStrRef"
  | "comments"
  | "paletteId"
  | "tag"
  | "plot"
  | "baseItem"
  | "modelPart1"
  | "modelPart2"
  | "modelPart3"
  | "cost"
  | "addCost"
  | "costTable"
  | "costValue"
  | "charges"
  | "stackSize"
  | "identified"
  | "stolen"
  | "cursed"
  | "bodyPartRFoot"
  | "bodyPartLFoot"
  | "bodyPartRShin"
  | "bodyPartLShin"
  | "bodyPartLThigh"
  | "bodyPartRThigh"
  | "bodyPartPelvis"
  | "bodyPartTorso"
  | "bodyPartBelt"
  | "bodyPartNeck"
  | "bodyPartRFArm"
  | "bodyPartLFArm"
  | "bodyPartRBicep"
  | "bodyPartLBicep"
  | "bodyPartRShoul"
  | "bodyPartLShoul"
  | "bodyPartRHand"
  | "bodyPartLHand"
  | "bodyPartRobe"
  | "leather1Color"
  | "leather2Color"
  | "cloth1Color"
  | "cloth2Color"
  | "metal1Color"
  | "metal2Color"
  | "scripts"
> & {
  itemPropertyListEntries?: ParsedItemPropertyListEntry[];
  sourceStructTypeId?: number;
};

export type SerializableEmbeddedItemBlueprint = Partial<
  Omit<
    SerializableItemBlueprint,
    | "sourceStructTypeId"
    | "templateResRef"
    | "localizedName"
    | "localizedNameStrRef"
    | "tag"
    | "baseItem"
    | "itemPropertyListEntries"
  >
> & {
  sourceStructTypeId?: number;
  templateResRef?: string;
  localizedName?: string;
  localizedNameStrRef?: number;
  tag?: string;
  baseItem?: number;
  itemPropertyListEntries?: ParsedItemPropertyListEntry[];
};

export type SupportedGffField =
  | { label: string; type: "byte"; value: number }
  | { label: string; type: "char"; value: number }
  | { label: string; type: "word"; value: number }
  | { label: string; type: "short"; value: number }
  | { label: string; type: "dword"; value: number }
  | { label: string; type: "int"; value: number }
  | { label: string; type: "dword64"; value: bigint }
  | { label: string; type: "int64"; value: bigint }
  | { label: string; type: "float"; value: number }
  | { label: string; type: "double"; value: number }
  | { label: string; type: "cexostring"; value: string }
  | { label: string; type: "resref"; value: string }
  | { label: string; type: "void"; value: Buffer }
  | { label: string; type: "struct"; value: { typeId: number; fields: SupportedGffField[] } }
  | {
      label: string;
      type: "cexolocstring";
      value: {
        text?: string;
        strRef?: number;
        entries?: Array<{ languageId: number; text: string }>;
      };
    }
  | { label: string; type: "list"; value: Array<{ typeId: number; fields: SupportedGffField[] }> };

const FIELD_TYPE = {
  BYTE: 0,
  CHAR: 1,
  WORD: 2,
  SHORT: 3,
  DWORD: 4,
  INT: 5,
  DWORD64: 6,
  INT64: 7,
  FLOAT: 8,
  DOUBLE: 9,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  VOID: 13,
  STRUCT: 14,
  LIST: 15
} as const;

const HEADER_SIZE = 56;
const STRUCT_ENTRY_SIZE = 12;
const FIELD_ENTRY_SIZE = 12;
const LABEL_ENTRY_SIZE = 16;
const UTI_FILE_TYPE = "UTI ";
const GFF_VERSION = "V3.2";
const ROOT_STRUCT_TYPE_ID = 0xffffffff;
const ITEM_PROPERTY_STRUCT_TYPE_ID = 0;
const INVALID_STRREF = 0xffffffff;

export function serializeItemBlueprintToUtiGff(input: SerializableItemBlueprint): Buffer {
  return buildGffBuffer(
    buildItemBlueprintFields(input),
    UTI_FILE_TYPE,
    normalizeUInt32(input.sourceStructTypeId ?? ROOT_STRUCT_TYPE_ID)
  );
}

function buildItemBlueprintFields(input: SerializableItemBlueprint): SupportedGffField[] {
  return buildSharedItemBlueprintFields(input);
}

function buildSharedItemBlueprintFields(input: Partial<SerializableItemBlueprint>): SupportedGffField[] {
  const fields: SupportedGffField[] = [];

  pushResRef(fields, "TemplateResRef", input.templateResRef);
  pushLocString(fields, "LocName", input.localizedName, input.localizedNameStrRef);
  pushLocString(fields, "Description", input.description, input.descriptionStrRef);
  pushLocString(
    fields,
    "DescIdentified",
    input.identifiedDescription,
    input.identifiedDescriptionStrRef
  );
  pushCExoString(fields, "Comment", input.comments);
  pushByte(fields, "PaletteID", input.paletteId);
  pushCExoString(fields, "Tag", input.tag);
  pushByte(fields, "Plot", booleanToByte(input.plot));

  pushDword(fields, "BaseItem", input.baseItem);
  pushByte(fields, "ModelPart1", input.modelPart1);
  pushByte(fields, "ModelPart2", input.modelPart2);
  pushByte(fields, "ModelPart3", input.modelPart3);
  pushDword(fields, "Cost", input.cost);
  pushDword(fields, "AddCost", input.addCost);
  pushDword(fields, "CostTable", input.costTable);
  pushDword(fields, "CostValue", input.costValue);
  pushDword(fields, "Charges", input.charges);
  pushWord(fields, "StackSize", input.stackSize);
  pushByte(fields, "Identified", booleanToByte(input.identified));
  pushByte(fields, "Stolen", booleanToByte(input.stolen));
  pushByte(fields, "Cursed", booleanToByte(input.cursed));

  pushByte(fields, "ArmorPart_RFoot", input.bodyPartRFoot);
  pushByte(fields, "ArmorPart_LFoot", input.bodyPartLFoot);
  pushByte(fields, "ArmorPart_RShin", input.bodyPartRShin);
  pushByte(fields, "ArmorPart_LShin", input.bodyPartLShin);
  pushByte(fields, "ArmorPart_LThigh", input.bodyPartLThigh);
  pushByte(fields, "ArmorPart_RThigh", input.bodyPartRThigh);
  pushByte(fields, "ArmorPart_Pelvis", input.bodyPartPelvis);
  pushByte(fields, "ArmorPart_Torso", input.bodyPartTorso);
  pushByte(fields, "ArmorPart_Belt", input.bodyPartBelt);
  pushByte(fields, "ArmorPart_Neck", input.bodyPartNeck);
  pushByte(fields, "ArmorPart_RFArm", input.bodyPartRFArm);
  pushByte(fields, "ArmorPart_LFArm", input.bodyPartLFArm);
  pushByte(fields, "ArmorPart_RBicep", input.bodyPartRBicep);
  pushByte(fields, "ArmorPart_LBicep", input.bodyPartLBicep);
  pushByte(fields, "ArmorPart_RShoul", input.bodyPartRShoul);
  pushByte(fields, "ArmorPart_LShoul", input.bodyPartLShoul);
  pushByte(fields, "ArmorPart_RHand", input.bodyPartRHand);
  pushByte(fields, "ArmorPart_LHand", input.bodyPartLHand);
  pushByte(fields, "ArmorPart_Robe", input.bodyPartRobe);

  pushByte(fields, "Leather1Color", input.leather1Color);
  pushByte(fields, "Leather2Color", input.leather2Color);
  pushByte(fields, "Cloth1Color", input.cloth1Color);
  pushByte(fields, "Cloth2Color", input.cloth2Color);
  pushByte(fields, "Metal1Color", input.metal1Color);
  pushByte(fields, "Metal2Color", input.metal2Color);

  const propertyEntries = (input.itemPropertyListEntries ?? [])
    .map(buildItemPropertyFields)
    .filter((entry) => entry.fields.length > 0);
  if (propertyEntries.length > 0) {
    fields.push({ label: "PropertiesList", type: "list", value: propertyEntries });
  }
  pushScriptFields(fields, input.scripts);

  return fields;
}

function pushScriptFields(fields: SupportedGffField[], scripts: Record<string, string> | undefined): void {
  if (!scripts) {
    return;
  }
  const scriptLabels = new Set(SCRIPT_FIELD_LABELS.filter((label) => label.length <= LABEL_ENTRY_SIZE));
  for (const [key, value] of Object.entries(scripts)) {
    const normalizedKey = normalizeScriptFieldLabel(key);
    if (!scriptLabels.has(normalizedKey as (typeof SCRIPT_FIELD_LABELS)[number])) {
      continue;
    }
    pushResRef(fields, normalizedKey, value);
  }
}

function normalizeScriptFieldLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "oninventorydisturbed") {
    return "oninvdisturbed";
  }
  return normalized;
}

function buildItemPropertyFields(entry: ParsedItemPropertyListEntry): {
  typeId: number;
  fields: SupportedGffField[];
} {
  const fields: SupportedGffField[] = [];
  pushWord(fields, "PropertyName", entry.propertyName);
  pushWord(fields, "Subtype", entry.subtype);
  pushByte(fields, "CostTable", entry.costTable);
  pushWord(fields, "CostValue", entry.costValue);
  pushByte(fields, "Param1", entry.param1);
  pushByte(fields, "Param1Value", entry.param1Value);
  pushByte(fields, "ChanceAppear", entry.chanceAppear);
  return { typeId: ITEM_PROPERTY_STRUCT_TYPE_ID, fields };
}

export function pushEmbeddedItemStruct(
  fields: SupportedGffField[],
  label: string,
  input: SerializableEmbeddedItemBlueprint | undefined
): void {
  if (!input) {
    return;
  }

  fields.push({
    label,
    type: "struct",
    value: {
      typeId: normalizeUInt32(input.sourceStructTypeId ?? ROOT_STRUCT_TYPE_ID),
      fields: buildEmbeddedItemFields(input)
    }
  });
}

function buildEmbeddedItemFields(input: SerializableEmbeddedItemBlueprint): SupportedGffField[] {
  return buildSharedItemBlueprintFields(input);
}

export function buildGffBuffer(
  fields: SupportedGffField[],
  fileType: string,
  rootStructTypeId: number
): Buffer {
  const uniqueLabels = [...new Set(collectFieldLabels(fields))];
  const labelIndexByName = new Map(uniqueLabels.map((label, index) => [label, index]));

  const fieldDataChunks: Buffer[] = [];
  const listIndicesChunks: Buffer[] = [];
  const fieldIndicesChunks: Buffer[] = [];
  const structEntries: Array<{ typeId: number; dataOrOffset: number; fieldCount: number }> = [];
  const fieldEntries: Array<{ typeId: number; labelIndex: number; dataOrOffset: number }> = [];

  const pushFieldData = (chunk: Buffer): number => {
    const offset = fieldDataChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldDataChunks.push(chunk);
    return offset;
  };

  const pushListIndicesData = (chunk: Buffer): number => {
    const offset = listIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    listIndicesChunks.push(chunk);
    return offset;
  };

  const pushFieldIndicesData = (indices: number[]): number => {
    const payload = Buffer.alloc(indices.length * 4);
    indices.forEach((fieldIndex, index) => {
      payload.writeUInt32LE(fieldIndex, index * 4);
    });
    const offset = fieldIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldIndicesChunks.push(payload);
    return offset;
  };

  const pushFieldEntry = (entry: {
    typeId: number;
    labelIndex: number;
    dataOrOffset: number;
  }): number => {
    const index = fieldEntries.length;
    fieldEntries.push(entry);
    return index;
  };

  const addStruct = (structFields: SupportedGffField[], typeId: number): number => {
    const structIndex = structEntries.length;
    structEntries.push({ typeId, dataOrOffset: 0, fieldCount: 0 });
    const fieldIndices = structFields.map((field) => addField(field));
    structEntries[structIndex] = {
      typeId,
      dataOrOffset:
        fieldIndices.length <= 1 ? fieldIndices[0] ?? 0 : pushFieldIndicesData(fieldIndices),
      fieldCount: fieldIndices.length
    };
    return structIndex;
  };

  const addField = (field: SupportedGffField): number => {
    const labelIndex = labelIndexByName.get(field.label);
    if (labelIndex === undefined) {
      throw new Error(`Unknown GFF label index for ${field.label}`);
    }

    if (field.type === "byte") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.BYTE,
        labelIndex,
        dataOrOffset: normalizeByte(field.value)
      });
    }

    if (field.type === "char") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.CHAR,
        labelIndex,
        dataOrOffset: normalizeChar(field.value)
      });
    }

    if (field.type === "word") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.WORD,
        labelIndex,
        dataOrOffset: normalizeWord(field.value)
      });
    }

    if (field.type === "short") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.SHORT,
        labelIndex,
        dataOrOffset: normalizeShort(field.value)
      });
    }

    if (field.type === "dword") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.DWORD,
        labelIndex,
        dataOrOffset: normalizeUInt32(field.value)
      });
    }

    if (field.type === "int") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.INT,
        labelIndex,
        dataOrOffset: normalizeInt32(field.value)
      });
    }

    if (field.type === "dword64") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.DWORD64,
        labelIndex,
        dataOrOffset: pushFieldData(encodeDword64(field.value))
      });
    }

    if (field.type === "int64") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.INT64,
        labelIndex,
        dataOrOffset: pushFieldData(encodeInt64(field.value))
      });
    }

    if (field.type === "float") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.FLOAT,
        labelIndex,
        dataOrOffset: encodeFloatInline(field.value)
      });
    }

    if (field.type === "double") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.DOUBLE,
        labelIndex,
        dataOrOffset: pushFieldData(encodeDouble(field.value))
      });
    }

    if (field.type === "cexostring") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.CEXOSTRING,
        labelIndex,
        dataOrOffset: pushFieldData(encodeCExoString(field.value))
      });
    }

    if (field.type === "resref") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.RESREF,
        labelIndex,
        dataOrOffset: pushFieldData(encodeResRef(field.value))
      });
    }

    if (field.type === "void") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.VOID,
        labelIndex,
        dataOrOffset: pushFieldData(encodeVoid(field.value))
      });
    }

    if (field.type === "cexolocstring") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.CEXOLOCSTRING,
        labelIndex,
        dataOrOffset: pushFieldData(encodeCExoLocString(field.value))
      });
    }

    if (field.type === "struct") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.STRUCT,
        labelIndex,
        dataOrOffset: addStruct(field.value.fields, field.value.typeId)
      });
    }

    const childStructIndices = field.value.map((entry) => addStruct(entry.fields, entry.typeId));
    const payload = Buffer.alloc(4 + childStructIndices.length * 4);
    payload.writeUInt32LE(childStructIndices.length, 0);
    childStructIndices.forEach((structIndex, index) => {
      payload.writeUInt32LE(structIndex >>> 0, 4 + index * 4);
    });
    return pushFieldEntry({
      typeId: FIELD_TYPE.LIST,
      labelIndex,
      dataOrOffset: pushListIndicesData(payload)
    });
  };

  addStruct(fields, rootStructTypeId);

  const fieldData = Buffer.concat(fieldDataChunks);
  const listIndices = Buffer.concat(listIndicesChunks);
  const fieldIndices = Buffer.concat(fieldIndicesChunks);

  const structTable = Buffer.alloc(structEntries.length * STRUCT_ENTRY_SIZE);
  structEntries.forEach((entry, index) => {
    const offset = index * STRUCT_ENTRY_SIZE;
    structTable.writeUInt32LE(entry.typeId >>> 0, offset);
    structTable.writeUInt32LE(entry.dataOrOffset >>> 0, offset + 4);
    structTable.writeUInt32LE(entry.fieldCount >>> 0, offset + 8);
  });

  const fieldTable = Buffer.alloc(fieldEntries.length * FIELD_ENTRY_SIZE);
  fieldEntries.forEach((entry, index) => {
    const offset = index * FIELD_ENTRY_SIZE;
    fieldTable.writeUInt32LE(entry.typeId >>> 0, offset);
    fieldTable.writeUInt32LE(entry.labelIndex >>> 0, offset + 4);
    fieldTable.writeUInt32LE(entry.dataOrOffset >>> 0, offset + 8);
  });

  const labels = Buffer.alloc(uniqueLabels.length * LABEL_ENTRY_SIZE);
  uniqueLabels.forEach((label, index) => {
    Buffer.from(label.slice(0, LABEL_ENTRY_SIZE), "ascii").copy(
      labels,
      index * LABEL_ENTRY_SIZE
    );
  });

  const structOffset = HEADER_SIZE;
  const fieldOffset = structOffset + structTable.length;
  const labelOffset = fieldOffset + fieldTable.length;
  const fieldDataOffset = labelOffset + labels.length;
  const fieldIndicesOffset = fieldDataOffset + fieldData.length;
  const listIndicesOffset = fieldIndicesOffset + fieldIndices.length;

  const header = Buffer.alloc(HEADER_SIZE);
  header.write(fileType, 0, "ascii");
  header.write(GFF_VERSION, 4, "ascii");
  header.writeUInt32LE(structOffset, 8);
  header.writeUInt32LE(structEntries.length, 12);
  header.writeUInt32LE(fieldOffset, 16);
  header.writeUInt32LE(fieldEntries.length, 20);
  header.writeUInt32LE(labelOffset, 24);
  header.writeUInt32LE(uniqueLabels.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.length, 36);
  header.writeUInt32LE(fieldIndicesOffset, 40);
  header.writeUInt32LE(fieldIndices.length, 44);
  header.writeUInt32LE(listIndicesOffset, 48);
  header.writeUInt32LE(listIndices.length, 52);

  return Buffer.concat([
    header,
    structTable,
    fieldTable,
    labels,
    fieldData,
    fieldIndices,
    listIndices
  ]);
}

function collectFieldLabels(fields: SupportedGffField[]): string[] {
  const labels: string[] = [];
  fields.forEach((field) => {
    labels.push(field.label);
    if (field.type === "list") {
      field.value.forEach((entry) => {
        labels.push(...collectFieldLabels(entry.fields));
      });
    } else if (field.type === "struct") {
      labels.push(...collectFieldLabels(field.value.fields));
    }
  });
  return labels;
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

function encodeFloatInline(value: number): number {
  const payload = Buffer.alloc(4);
  payload.writeFloatLE(value, 0);
  return payload.readUInt32LE(0);
}

function encodeDword64(value: bigint): Buffer {
  const payload = Buffer.alloc(8);
  payload.writeBigUInt64LE(BigInt.asUintN(64, value), 0);
  return payload;
}

function encodeInt64(value: bigint): Buffer {
  const payload = Buffer.alloc(8);
  payload.writeBigInt64LE(BigInt.asIntN(64, value), 0);
  return payload;
}

function encodeDouble(value: number): Buffer {
  const payload = Buffer.alloc(8);
  payload.writeDoubleLE(value, 0);
  return payload;
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

function encodeCExoString(value: string): Buffer {
  const valueBytes = Buffer.from(value, "utf-8");
  const payload = Buffer.alloc(4 + valueBytes.length);
  payload.writeUInt32LE(valueBytes.length, 0);
  valueBytes.copy(payload, 4);
  return payload;
}

function encodeResRef(value: string): Buffer {
  const normalized = normalizeResRef(value) ?? "";
  const valueBytes = Buffer.from(normalized.slice(0, 16), "ascii");
  const payload = Buffer.alloc(1 + valueBytes.length);
  payload.writeUInt8(valueBytes.length, 0);
  valueBytes.copy(payload, 1);
  return payload;
}

function encodeCExoLocString(value: {
  text?: string;
  strRef?: number;
  entries?: Array<{ languageId: number; text: string }>;
}): Buffer {
  const preservedEntries = (value.entries ?? [])
    .map((entry) => ({
      languageId: normalizeUInt32(entry.languageId),
      text: typeof entry.text === "string" ? entry.text : ""
    }));
  const text = normalizeString(value.text);
  const strRef = isFiniteNumber(value.strRef) ? normalizeUInt32(value.strRef) : INVALID_STRREF;
  const entries =
    preservedEntries.length > 0
      ? preservedEntries
      : text
        ? [{ languageId: 0, text }]
        : [];
  if (entries.length === 0) {
    const payload = Buffer.alloc(12);
    payload.writeUInt32LE(8, 0);
    payload.writeUInt32LE(strRef, 4);
    payload.writeUInt32LE(0, 8);
    return payload;
  }

  const entryBuffers = entries.map((entry) => {
    const textBytes = Buffer.from(entry.text, "utf-8");
    const payload = Buffer.alloc(8 + textBytes.length);
    payload.writeUInt32LE(entry.languageId, 0);
    payload.writeUInt32LE(textBytes.length, 4);
    textBytes.copy(payload, 8);
    return payload;
  });
  const entriesLength = entryBuffers.reduce((total, entry) => total + entry.length, 0);
  const payload = Buffer.alloc(12 + entriesLength);
  payload.writeUInt32LE(8 + entriesLength, 0);
  payload.writeUInt32LE(strRef, 4);
  payload.writeUInt32LE(entries.length, 8);
  let cursor = 12;
  entryBuffers.forEach((entry) => {
    entry.copy(payload, cursor);
    cursor += entry.length;
  });
  return payload;
}

function encodeVoid(value: Buffer): Buffer {
  const payload = Buffer.alloc(4 + value.length);
  payload.writeUInt32LE(value.length, 0);
  value.copy(payload, 4);
  return payload;
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

function normalizeByte(value: number): number {
  return Math.max(0, Math.min(255, Math.trunc(value))) & 0xff;
}

function normalizeChar(value: number): number {
  return Math.max(-128, Math.min(127, Math.trunc(value))) & 0xff;
}

function normalizeWord(value: number): number {
  return Math.max(0, Math.min(0xffff, Math.trunc(value))) & 0xffff;
}

function normalizeShort(value: number): number {
  return Math.max(-0x8000, Math.min(0x7fff, Math.trunc(value))) & 0xffff;
}

function normalizeUInt32(value: number): number {
  return Math.max(0, Math.min(0xffffffff, Math.trunc(value))) >>> 0;
}

function normalizeInt32(value: number): number {
  return Math.max(-0x80000000, Math.min(0x7fffffff, Math.trunc(value))) >>> 0;
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
