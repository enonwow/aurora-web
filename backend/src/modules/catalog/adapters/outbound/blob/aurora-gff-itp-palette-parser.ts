interface GffHeader {
  fileType: string;
  fileVersion: string;
  structOffset: number;
  structCount: number;
  fieldOffset: number;
  fieldCount: number;
  labelOffset: number;
  labelCount: number;
  fieldDataOffset: number;
  fieldDataCount: number;
  fieldIndicesOffset: number;
  fieldIndicesCount: number;
  listIndicesOffset: number;
  listIndicesCount: number;
}

interface GffStructEntry {
  typeId: number;
  dataOrOffset: number;
  fieldCount: number;
}

interface ParsedCExoLocString {
  strRef: number;
  text: string;
}

interface ParsedGffListSummary {
  count: number;
  entries: ParsedGffFieldMap[];
}

type ParsedGffValue = string | number | ParsedCExoLocString | ParsedGffListSummary;
type ParsedGffFieldMap = Map<string, ParsedGffValue>;

export type ParsedAuroraItpPaletteNodeKind = "folder" | "leaf" | "category";

export interface ParsedAuroraItpPaletteNode {
  nodeId: string;
  kind: ParsedAuroraItpPaletteNodeKind;
  depth: number;
  label: string;
  strRef?: number;
  id?: number;
  resRef?: string;
  name?: string;
  leafCount: number;
  folderCount: number;
  categoryLeafCount: number;
  children: ParsedAuroraItpPaletteNode[];
}

export interface ParsedAuroraItpPalette {
  sourceFileType: string;
  sourceFileVersion: string;
  rootCount: number;
  leafCount: number;
  folderCount: number;
  categoryLeafCount: number;
  maxDepth: number;
  roots: ParsedAuroraItpPaletteNode[];
}

const GFF_HEADER_SIZE_BYTES = 56;
const GFF_STRUCT_ENTRY_SIZE_BYTES = 12;
const GFF_FIELD_ENTRY_SIZE_BYTES = 12;
const GFF_LABEL_ENTRY_SIZE_BYTES = 16;
const MAX_ITP_LIST_DEPTH = 16;

const FIELD_TYPE = {
  BYTE: 0,
  CHAR: 1,
  WORD: 2,
  SHORT: 3,
  DWORD: 4,
  INT: 5,
  FLOAT: 8,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  LIST: 15
} as const;

export function parseAuroraItpPalette(bytes: Buffer): ParsedAuroraItpPalette | null {
  try {
    const header = parseHeader(bytes);
    if (!header || header.fileType !== "ITP ") {
      return null;
    }

    const labels = parseLabels(bytes, header);
    const structs = parseStructs(bytes, header);
    const rootStruct = structs[0];
    if (!rootStruct) {
      return null;
    }

    const rootFieldIndices = resolveStructFieldIndices(bytes, header, rootStruct);
    if (!rootFieldIndices) {
      return null;
    }

    const rootFields = parseStructFields(bytes, header, labels, structs, rootFieldIndices, 0);
    const mainList = readListField(rootFields, ["main"]);
    if (!mainList) {
      return {
        sourceFileType: header.fileType,
        sourceFileVersion: header.fileVersion,
        rootCount: 0,
        leafCount: 0,
        folderCount: 0,
        categoryLeafCount: 0,
        maxDepth: 0,
        roots: []
      };
    }

    const roots = mainList.entries.map((entry, index) =>
      mapItpNode(entry, String(index), 0)
    );
    const totals = summarizeNodes(roots);

    return {
      sourceFileType: header.fileType,
      sourceFileVersion: header.fileVersion,
      rootCount: roots.length,
      leafCount: totals.leafCount,
      folderCount: totals.folderCount,
      categoryLeafCount: totals.categoryLeafCount,
      maxDepth: roots.length > 0 ? totals.maxDepth + 1 : 0,
      roots
    };
  } catch {
    return null;
  }
}

function parseHeader(bytes: Buffer): GffHeader | null {
  if (bytes.length < GFF_HEADER_SIZE_BYTES) {
    return null;
  }

  const header: GffHeader = {
    fileType: bytes.toString("ascii", 0, 4),
    fileVersion: bytes.toString("ascii", 4, 8),
    structOffset: bytes.readUInt32LE(8),
    structCount: bytes.readUInt32LE(12),
    fieldOffset: bytes.readUInt32LE(16),
    fieldCount: bytes.readUInt32LE(20),
    labelOffset: bytes.readUInt32LE(24),
    labelCount: bytes.readUInt32LE(28),
    fieldDataOffset: bytes.readUInt32LE(32),
    fieldDataCount: bytes.readUInt32LE(36),
    fieldIndicesOffset: bytes.readUInt32LE(40),
    fieldIndicesCount: bytes.readUInt32LE(44),
    listIndicesOffset: bytes.readUInt32LE(48),
    listIndicesCount: bytes.readUInt32LE(52)
  };

  if (
    !isRangeWithinBuffer(bytes, header.structOffset, header.structCount * GFF_STRUCT_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.fieldOffset, header.fieldCount * GFF_FIELD_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.labelOffset, header.labelCount * GFF_LABEL_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.fieldDataOffset, header.fieldDataCount) ||
    !isRangeWithinBuffer(bytes, header.fieldIndicesOffset, header.fieldIndicesCount) ||
    !isRangeWithinBuffer(bytes, header.listIndicesOffset, header.listIndicesCount)
  ) {
    return null;
  }

  return header;
}

function parseLabels(bytes: Buffer, header: GffHeader): string[] {
  const labels: string[] = [];
  for (let index = 0; index < header.labelCount; index += 1) {
    const offset = header.labelOffset + index * GFF_LABEL_ENTRY_SIZE_BYTES;
    const raw = bytes.subarray(offset, offset + GFF_LABEL_ENTRY_SIZE_BYTES);
    const nullByteIndex = raw.indexOf(0);
    const usedLength = nullByteIndex >= 0 ? nullByteIndex : raw.length;
    labels.push(raw.subarray(0, usedLength).toString("ascii").trim());
  }
  return labels;
}

function parseStructs(bytes: Buffer, header: GffHeader): GffStructEntry[] {
  const structs: GffStructEntry[] = [];
  for (let index = 0; index < header.structCount; index += 1) {
    const offset = header.structOffset + index * GFF_STRUCT_ENTRY_SIZE_BYTES;
    structs.push({
      typeId: bytes.readUInt32LE(offset),
      dataOrOffset: bytes.readUInt32LE(offset + 4),
      fieldCount: bytes.readUInt32LE(offset + 8)
    });
  }
  return structs;
}

function resolveStructFieldIndices(
  bytes: Buffer,
  header: GffHeader,
  entry: GffStructEntry
): number[] | null {
  if (entry.fieldCount === 0) {
    return [];
  }

  if (entry.fieldCount === 1) {
    return [entry.dataOrOffset];
  }

  const start = header.fieldIndicesOffset + entry.dataOrOffset;
  const expectedSize = entry.fieldCount * 4;
  if (!isRangeWithinBuffer(bytes, start, expectedSize)) {
    return null;
  }

  const indices: number[] = [];
  for (let index = 0; index < entry.fieldCount; index += 1) {
    indices.push(bytes.readUInt32LE(start + index * 4));
  }
  return indices;
}

function parseStructFields(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  structs: GffStructEntry[],
  fieldIndices: number[],
  depth: number
): ParsedGffFieldMap {
  const fields = new Map<string, ParsedGffValue>();
  for (const fieldIndex of fieldIndices) {
    if (fieldIndex < 0 || fieldIndex >= header.fieldCount) {
      continue;
    }

    const fieldOffset = header.fieldOffset + fieldIndex * GFF_FIELD_ENTRY_SIZE_BYTES;
    const typeId = bytes.readUInt32LE(fieldOffset);
    const labelIndex = bytes.readUInt32LE(fieldOffset + 4);
    const dataOrOffset = bytes.readUInt32LE(fieldOffset + 8);
    const label = (labels[labelIndex] ?? `field_${labelIndex}`).trim();
    if (!label) {
      continue;
    }

    const value = parseFieldValue(bytes, header, labels, structs, typeId, dataOrOffset, depth);
    if (value !== undefined) {
      fields.set(normalizeLabel(label), value);
    }
  }
  return fields;
}

function parseFieldValue(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  structs: GffStructEntry[],
  typeId: number,
  dataOrOffset: number,
  depth: number
): ParsedGffValue | undefined {
  if (typeId === FIELD_TYPE.BYTE || typeId === FIELD_TYPE.CHAR) {
    return dataOrOffset & 0xff;
  }
  if (typeId === FIELD_TYPE.WORD || typeId === FIELD_TYPE.SHORT) {
    return dataOrOffset & 0xffff;
  }
  if (typeId === FIELD_TYPE.DWORD) {
    return dataOrOffset >>> 0;
  }
  if (typeId === FIELD_TYPE.INT) {
    return dataOrOffset | 0;
  }
  if (typeId === FIELD_TYPE.FLOAT) {
    const inline = Buffer.allocUnsafe(4);
    inline.writeUInt32LE(dataOrOffset, 0);
    return inline.readFloatLE(0);
  }
  if (typeId === FIELD_TYPE.CEXOSTRING) {
    return readCExoString(bytes, header, dataOrOffset);
  }
  if (typeId === FIELD_TYPE.RESREF) {
    return readResRef(bytes, header, dataOrOffset);
  }
  if (typeId === FIELD_TYPE.CEXOLOCSTRING) {
    return readCExoLocString(bytes, header, dataOrOffset);
  }
  if (typeId === FIELD_TYPE.LIST) {
    return readListSummary(bytes, header, labels, structs, dataOrOffset, depth);
  }
  return undefined;
}

function readCExoString(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): string | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 4)) {
    return undefined;
  }

  const length = bytes.readUInt32LE(offset);
  const valueOffset = offset + 4;
  if (!isRangeWithinBuffer(bytes, valueOffset, length)) {
    return undefined;
  }

  return sanitizeText(bytes.subarray(valueOffset, valueOffset + length).toString("utf-8"));
}

function readResRef(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): string | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 1)) {
    return undefined;
  }

  const length = bytes.readUInt8(offset);
  const valueOffset = offset + 1;
  if (!isRangeWithinBuffer(bytes, valueOffset, length)) {
    return undefined;
  }

  return sanitizeResRef(bytes.subarray(valueOffset, valueOffset + length).toString("ascii"));
}

function readCExoLocString(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): ParsedCExoLocString | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 12)) {
    return undefined;
  }

  const totalSize = bytes.readUInt32LE(offset);
  const strRef = bytes.readUInt32LE(offset + 4);
  const stringCount = bytes.readUInt32LE(offset + 8);
  if (!isRangeWithinBuffer(bytes, offset + 12, Math.max(totalSize - 8, 0))) {
    return undefined;
  }

  let cursor = offset + 12;
  const entries: string[] = [];
  for (let index = 0; index < stringCount; index += 1) {
    if (!isRangeWithinBuffer(bytes, cursor, 8)) {
      break;
    }
    cursor += 4;
    const textLength = bytes.readUInt32LE(cursor);
    cursor += 4;
    if (!isRangeWithinBuffer(bytes, cursor, textLength)) {
      break;
    }
    const text = sanitizeText(bytes.subarray(cursor, cursor + textLength).toString("utf-8"));
    cursor += textLength;
    if (text.length > 0) {
      entries.push(text);
    }
  }

  return {
    strRef,
    text: entries[0] ?? ""
  };
}

function readListSummary(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  structs: GffStructEntry[],
  dataOrOffset: number,
  depth: number
): ParsedGffListSummary | undefined {
  const offset = header.listIndicesOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 4)) {
    return undefined;
  }

  const count = bytes.readUInt32LE(offset);
  const bodyOffset = offset + 4;
  if (!isRangeWithinBuffer(bytes, bodyOffset, count * 4)) {
    return undefined;
  }

  const entries: ParsedGffFieldMap[] = [];
  if (depth >= MAX_ITP_LIST_DEPTH) {
    return { count, entries };
  }

  for (let index = 0; index < count; index += 1) {
    const structIndex = bytes.readUInt32LE(bodyOffset + index * 4);
    const struct = structs[structIndex];
    if (!struct) {
      continue;
    }
    const fieldIndices = resolveStructFieldIndices(bytes, header, struct);
    if (!fieldIndices) {
      continue;
    }
    entries.push(parseStructFields(bytes, header, labels, structs, fieldIndices, depth + 1));
  }

  return { count, entries };
}

function mapItpNode(
  fields: ParsedGffFieldMap,
  nodeId: string,
  depth: number
): ParsedAuroraItpPaletteNode {
  const list = readListField(fields, ["list"]);
  const children = (list?.entries ?? []).map((entry, index) =>
    mapItpNode(entry, `${nodeId}/${index}`, depth + 1)
  );
  const resRef = readStringField(fields, ["resref"]);
  const strRef = readNumberField(fields, ["strref"]);
  const id = readNumberField(fields, ["id"]);
  const name = readNameField(fields, ["name"]);
  const kind: ParsedAuroraItpPaletteNodeKind = resRef
    ? "leaf"
    : children.length > 0
      ? "folder"
      : "category";
  const childTotals = summarizeNodes(children);
  const leafCount = (kind === "leaf" ? 1 : 0) + childTotals.leafCount;
  const folderCount = (kind === "folder" ? 1 : 0) + childTotals.folderCount;
  const categoryLeafCount =
    (kind === "category" ? 1 : 0) + childTotals.categoryLeafCount;

  return {
    nodeId,
    kind,
    depth,
    label: name ?? resRef ?? (strRef !== undefined ? `StrRef ${strRef}` : `Node ${nodeId}`),
    ...(strRef !== undefined ? { strRef } : {}),
    ...(id !== undefined ? { id } : {}),
    ...(resRef ? { resRef } : {}),
    ...(name ? { name } : {}),
    leafCount,
    folderCount,
    categoryLeafCount,
    children
  };
}

function summarizeNodes(nodes: ParsedAuroraItpPaletteNode[]): {
  leafCount: number;
  folderCount: number;
  categoryLeafCount: number;
  maxDepth: number;
} {
  return nodes.reduce(
    (summary, node) => {
      const childSummary = summarizeNodes(node.children);
      return {
        leafCount: summary.leafCount + node.leafCount,
        folderCount: summary.folderCount + node.folderCount,
        categoryLeafCount: summary.categoryLeafCount + node.categoryLeafCount,
        maxDepth: Math.max(summary.maxDepth, node.depth, childSummary.maxDepth)
      };
    },
    { leafCount: 0, folderCount: 0, categoryLeafCount: 0, maxDepth: 0 }
  );
}

function readStringField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): string | undefined {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (typeof raw === "string") {
      const normalized = sanitizeText(raw);
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }
  return undefined;
}

function readNameField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): string | undefined {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (typeof raw === "string") {
      const normalized = sanitizeText(raw);
      if (normalized.length > 0) {
        return normalized;
      }
      continue;
    }
    if (isParsedLocString(raw)) {
      const normalized = sanitizeText(raw.text);
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }
  return undefined;
}

function readNumberField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): number | undefined {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
  }
  return undefined;
}

function readListField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): ParsedGffListSummary | undefined {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (isParsedListSummary(raw)) {
      return raw;
    }
  }
  return undefined;
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function sanitizeText(value: string): string {
  return value.replace(/\0/gu, "").trim();
}

function sanitizeResRef(value: string): string | undefined {
  const normalized = sanitizeText(value).toLowerCase().replace(/[^a-z0-9_]+/gu, "_");
  return normalized.length > 0 ? normalized.slice(0, 16) : undefined;
}

function isParsedLocString(value: ParsedGffValue | undefined): value is ParsedCExoLocString {
  return (
    typeof value === "object" &&
    value !== null &&
    "strRef" in value &&
    "text" in value &&
    !("entries" in value)
  );
}

function isParsedListSummary(value: ParsedGffValue | undefined): value is ParsedGffListSummary {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    "entries" in value &&
    Array.isArray((value as ParsedGffListSummary).entries)
  );
}

function isRangeWithinBuffer(bytes: Buffer, offset: number, length: number): boolean {
  return (
    Number.isInteger(offset) &&
    Number.isInteger(length) &&
    offset >= 0 &&
    length >= 0 &&
    offset <= bytes.length &&
    offset + length <= bytes.length
  );
}
