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
  entries: string[];
}

type ParsedGffValue = string | number | boolean | ParsedCExoLocString;

type ParsedGffFieldMap = Map<string, ParsedGffValue>;

export interface ParsedTemplateBlueprint {
  sourceFileType: string;
  sourceFileVersion: string;
  sourceStructTypeId: number;
  templateResRef?: string;
  displayName?: string;
  description?: string;
  tag?: string;
  conversation?: string;
  appearanceId?: number;
  modelResRef?: string;
  hasInventory?: boolean;
  useable?: boolean;
  isStatic?: boolean;
  lightState?: number;
  scripts: Record<string, string>;
  dependencyRefs: string[];
  dependencyFingerprint: string;
  vfxEvidence: string[];
}

const GFF_HEADER_SIZE_BYTES = 56;
const GFF_STRUCT_ENTRY_SIZE_BYTES = 12;
const GFF_FIELD_ENTRY_SIZE_BYTES = 12;
const GFF_LABEL_ENTRY_SIZE_BYTES = 16;

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

const SCRIPT_FIELD_LABELS = [
  "onopen",
  "onclosed",
  "onused",
  "onheartbeat",
  "onuserdefined",
  "oninvdisturbed",
  "onlocked",
  "onunlock",
  "onfailtoclose",
  "onfailtoopen",
  "onclick",
  "ondamaged",
  "ondeath",
  "ondialog",
  "onspellcastat",
  "onmeleedamaged",
  "ondisarm",
  "ontraptriggered",
  "ontrapdisarmed",
  "oninventorydisturbed"
] as const;

const VFX_TEXT_PATTERN = /(vfx|vvx|emit|emitter|particle|fx_)/iu;

export function parseTemplateBlueprintFromGff(
  bytes: Buffer
): ParsedTemplateBlueprint | null {
  try {
    const header = parseHeader(bytes);
    if (!header) {
      return null;
    }

    const labels = parseLabels(bytes, header);
    const structs = parseStructs(bytes, header);
    if (structs.length === 0) {
      return null;
    }

    const rootStruct = structs[0];
    const rootFieldIndices = resolveStructFieldIndices(bytes, header, rootStruct);
    if (!rootFieldIndices) {
      return null;
    }

    const fields = parseRootFields(bytes, header, labels, rootFieldIndices);
    return mapFieldsToTemplateBlueprint(header, rootStruct.typeId, fields);
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

function parseRootFields(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  fieldIndices: number[]
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

    const normalizedLabel = normalizeLabel(label);
    const value = parseFieldValue(bytes, header, typeId, dataOrOffset);
    if (value !== undefined) {
      fields.set(normalizedLabel, value);
    }
  }
  return fields;
}

function parseFieldValue(
  bytes: Buffer,
  header: GffHeader,
  typeId: number,
  dataOrOffset: number
): ParsedGffValue | undefined {
  if (typeId === FIELD_TYPE.BYTE || typeId === FIELD_TYPE.CHAR) {
    return (dataOrOffset & 0xff) > 0 ? 1 : 0;
  }
  if (typeId === FIELD_TYPE.WORD || typeId === FIELD_TYPE.SHORT) {
    return dataOrOffset & 0xffff;
  }
  if (typeId === FIELD_TYPE.DWORD || typeId === FIELD_TYPE.INT) {
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

  return sanitizeUtf8(bytes.subarray(valueOffset, valueOffset + length).toString("utf-8"));
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

  return sanitizeAscii(bytes.subarray(valueOffset, valueOffset + length).toString("ascii"));
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
    // language id (u32) is currently not used by backend contract.
    cursor += 4;
    const textLength = bytes.readUInt32LE(cursor);
    cursor += 4;
    if (!isRangeWithinBuffer(bytes, cursor, textLength)) {
      break;
    }
    const text = sanitizeUtf8(bytes.subarray(cursor, cursor + textLength).toString("utf-8"));
    cursor += textLength;
    if (text.length > 0) {
      entries.push(text);
    }
  }

  return {
    strRef,
    text: entries[0] ?? "",
    entries
  };
}

function mapFieldsToTemplateBlueprint(
  header: GffHeader,
  rootStructTypeId: number,
  fields: ParsedGffFieldMap
): ParsedTemplateBlueprint {
  const templateResRef = readStringField(fields, [
    "templateresref",
    "resref",
    "tagresref"
  ]);
  const displayName = readNameField(fields, [
    "locname",
    "name",
    "displayname"
  ]);
  const description = readNameField(fields, ["description", "desc"]);
  const tag = readStringField(fields, ["tag"]);
  const conversation = readStringField(fields, ["conversation", "conv"]);
  const modelResRef = readStringField(fields, ["modelname", "modelresref", "model"]);
  const appearanceId = readNumberField(fields, ["appearance", "appearance_type"]);
  const hasInventory = readBooleanField(fields, ["hasinventory", "inventory"]);
  const useable = readBooleanField(fields, ["useable", "usable"]);
  const isStatic = readBooleanField(fields, ["static"]);
  const lightState = readNumberField(fields, ["lightstate", "light"]);
  const scripts = readScriptFields(fields);

  const dependencyRefs = dedupeStrings([
    modelResRef,
    conversation,
    ...Object.values(scripts),
    templateResRef,
    tag
  ].filter((value): value is string => Boolean(value && value.length > 0)));

  const vfxEvidence = collectVfxEvidence({
    tag,
    modelResRef,
    templateResRef,
    dependencyRefs
  });

  const dependencyFingerprint = buildDependencyFingerprint(dependencyRefs);

  return {
    sourceFileType: header.fileType,
    sourceFileVersion: header.fileVersion,
    sourceStructTypeId: rootStructTypeId,
    templateResRef,
    displayName,
    description,
    tag,
    conversation,
    appearanceId: Number.isFinite(appearanceId ?? Number.NaN) ? appearanceId : undefined,
    modelResRef,
    hasInventory,
    useable,
    isStatic,
    lightState: Number.isFinite(lightState ?? Number.NaN) ? lightState : undefined,
    scripts,
    dependencyRefs,
    dependencyFingerprint,
    vfxEvidence
  };
}

function readStringField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): string | undefined {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (typeof raw === "string") {
      const normalized = sanitizeAscii(raw);
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
      const normalized = sanitizeUtf8(raw);
      if (normalized.length > 0) {
        return normalized;
      }
      continue;
    }
    if (raw && typeof raw === "object") {
      const loc = raw as ParsedCExoLocString;
      if (typeof loc.text === "string" && loc.text.trim().length > 0) {
        return sanitizeUtf8(loc.text);
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

function readBooleanField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): boolean | undefined {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (typeof raw === "number") {
      return raw !== 0;
    }
    if (typeof raw === "boolean") {
      return raw;
    }
  }
  return undefined;
}

function readScriptFields(fields: ParsedGffFieldMap): Record<string, string> {
  const scripts: Record<string, string> = {};
  for (const label of SCRIPT_FIELD_LABELS) {
    const value = fields.get(label);
    if (typeof value !== "string") {
      continue;
    }
    const normalized = sanitizeAscii(value);
    if (!normalized) {
      continue;
    }
    scripts[label] = normalized;
  }
  return scripts;
}

function collectVfxEvidence(input: {
  tag?: string;
  modelResRef?: string;
  templateResRef?: string;
  dependencyRefs: string[];
}): string[] {
  const evidence: string[] = [];
  if (input.modelResRef && VFX_TEXT_PATTERN.test(input.modelResRef)) {
    evidence.push("modelResRef");
  }
  if (input.tag && VFX_TEXT_PATTERN.test(input.tag)) {
    evidence.push("tag");
  }
  if (input.templateResRef && VFX_TEXT_PATTERN.test(input.templateResRef)) {
    evidence.push("templateResRef");
  }
  if (input.dependencyRefs.some((entry) => VFX_TEXT_PATTERN.test(entry))) {
    evidence.push("dependencyRefs");
  }
  return dedupeStrings(evidence);
}

function buildDependencyFingerprint(dependencies: string[]): string {
  if (dependencies.length === 0) {
    return "none";
  }
  return dependencies.join("|");
}

function isRangeWithinBuffer(bytes: Buffer, offset: number, length: number): boolean {
  if (!Number.isFinite(offset) || !Number.isFinite(length)) {
    return false;
  }
  if (offset < 0 || length < 0) {
    return false;
  }
  if (offset > bytes.length) {
    return false;
  }
  if (offset + length > bytes.length) {
    return false;
  }
  return true;
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeAscii(value: string): string {
  return value.replace(/\0/gu, "").trim();
}

function sanitizeUtf8(value: string): string {
  return value.replace(/\0/gu, "").trim();
}

function dedupeStrings(values: readonly string[]): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}
