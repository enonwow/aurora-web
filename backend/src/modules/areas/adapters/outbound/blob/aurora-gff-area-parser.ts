import { createHash } from "node:crypto";

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

interface GffFieldRef {
  typeId: number;
  dataOrOffset: number;
}

interface ParsedAreaSoundIds {
  ambientDay?: number;
  ambientNight?: number;
  musicDay?: number;
  musicNight?: number;
  musicBattle?: number;
}

export interface ParsedAreaMetadataBlueprint {
  sourceFileType: string;
  sourceFileVersion: string;
  sourceStructTypeId: number;
  name?: string;
  tag?: string;
  width?: number;
  height?: number;
  tileSet?: string;
  tileCount?: number;
  soundIds: ParsedAreaSoundIds;
  dependencyFingerprint: string;
}

export interface ParsedAreaPlacementBlueprint {
  listKind: "placeable" | "door" | "creature" | "item";
  templateResRef?: string;
  tag?: string;
  x: number;
  y: number;
  z: number;
  bearing: number;
}

export interface ParsedAreaObjectBlueprint {
  sourceFileType: string;
  sourceFileVersion: string;
  sourceStructTypeId: number;
  placeables: ParsedAreaPlacementBlueprint[];
  doors: ParsedAreaPlacementBlueprint[];
  creatures: ParsedAreaPlacementBlueprint[];
  items: ParsedAreaPlacementBlueprint[];
  dependencyFingerprint: string;
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
  FLOAT: 8,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  STRUCT: 14,
  LIST: 15
} as const;

class GffView {
  private constructor(
    private readonly bytes: Buffer,
    readonly header: GffHeader,
    readonly labels: string[],
    readonly structs: GffStructEntry[]
  ) {}

  static fromBuffer(bytes: Buffer): GffView | null {
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
      return new GffView(bytes, header, labels, structs);
    } catch {
      return null;
    }
  }

  getStructFields(structIndex: number): Map<string, GffFieldRef> {
    if (structIndex < 0 || structIndex >= this.structs.length) {
      return new Map();
    }

    const struct = this.structs[structIndex];
    const indices = resolveStructFieldIndices(this.bytes, this.header, struct);
    if (!indices) {
      return new Map();
    }

    const fields = new Map<string, GffFieldRef>();
    for (const fieldIndex of indices) {
      if (fieldIndex < 0 || fieldIndex >= this.header.fieldCount) {
        continue;
      }
      const fieldOffset = this.header.fieldOffset + fieldIndex * GFF_FIELD_ENTRY_SIZE_BYTES;
      const typeId = this.bytes.readUInt32LE(fieldOffset);
      const labelIndex = this.bytes.readUInt32LE(fieldOffset + 4);
      const dataOrOffset = this.bytes.readUInt32LE(fieldOffset + 8);
      const label = normalizeLabel(this.labels[labelIndex] ?? `field_${labelIndex}`);
      if (!label) {
        continue;
      }
      fields.set(label, {
        typeId,
        dataOrOffset
      });
    }

    return fields;
  }

  readNumber(field: GffFieldRef | undefined): number | undefined {
    if (!field) {
      return undefined;
    }

    if (field.typeId === FIELD_TYPE.BYTE || field.typeId === FIELD_TYPE.CHAR) {
      return field.dataOrOffset & 0xff;
    }
    if (field.typeId === FIELD_TYPE.WORD || field.typeId === FIELD_TYPE.SHORT) {
      return field.dataOrOffset & 0xffff;
    }
    if (field.typeId === FIELD_TYPE.DWORD || field.typeId === FIELD_TYPE.INT) {
      return field.dataOrOffset | 0;
    }
    if (field.typeId === FIELD_TYPE.FLOAT) {
      const inline = Buffer.allocUnsafe(4);
      inline.writeUInt32LE(field.dataOrOffset, 0);
      return inline.readFloatLE(0);
    }

    return undefined;
  }

  readString(field: GffFieldRef | undefined): string | undefined {
    if (!field) {
      return undefined;
    }

    if (field.typeId === FIELD_TYPE.CEXOSTRING) {
      return readCExoString(this.bytes, this.header, field.dataOrOffset);
    }
    if (field.typeId === FIELD_TYPE.RESREF) {
      return readResRef(this.bytes, this.header, field.dataOrOffset);
    }
    if (field.typeId === FIELD_TYPE.CEXOLOCSTRING) {
      const loc = readCExoLocString(this.bytes, this.header, field.dataOrOffset);
      if (!loc) {
        return undefined;
      }
      return sanitizeUtf8(loc.text);
    }

    return undefined;
  }

  readLocString(field: GffFieldRef | undefined): ParsedCExoLocString | undefined {
    if (!field || field.typeId !== FIELD_TYPE.CEXOLOCSTRING) {
      return undefined;
    }
    return readCExoLocString(this.bytes, this.header, field.dataOrOffset);
  }

  readListStructIndices(field: GffFieldRef | undefined): number[] {
    if (!field || field.typeId !== FIELD_TYPE.LIST) {
      return [];
    }

    const offset = this.header.listIndicesOffset + field.dataOrOffset;
    if (!isRangeWithinBuffer(this.bytes, offset, 4)) {
      return [];
    }

    const count = this.bytes.readUInt32LE(offset);
    const bodyOffset = offset + 4;
    if (!isRangeWithinBuffer(this.bytes, bodyOffset, count * 4)) {
      return [];
    }

    const indices: number[] = [];
    for (let index = 0; index < count; index += 1) {
      indices.push(this.bytes.readUInt32LE(bodyOffset + index * 4));
    }
    return indices;
  }

  readStructIndex(field: GffFieldRef | undefined): number | undefined {
    if (!field || field.typeId !== FIELD_TYPE.STRUCT) {
      return undefined;
    }
    return field.dataOrOffset;
  }
}

export function parseAreaMetadataFromAreGff(
  bytes: Buffer
): ParsedAreaMetadataBlueprint | null {
  const view = GffView.fromBuffer(bytes);
  if (!view) {
    return null;
  }
  if (view.header.fileType.trim() !== "ARE") {
    return null;
  }

  const root = view.getStructFields(0);

  const name = readNameByAliases(view, root, ["name", "locname", "displayname"]);
  const tag = readStringByAliases(view, root, ["tag"]);
  const width = readNumberByAliases(view, root, ["width"]);
  const height = readNumberByAliases(view, root, ["height"]);
  const tileSet = readStringByAliases(view, root, ["tileset", "tilesetresref", "tilesetname"]);
  const tileCount = readListCountByAliases(view, root, ["tilelist"]);

  const soundIds: ParsedAreaSoundIds = {
    ambientDay: readNumberByAliases(view, root, ["ambientsndday", "ambientsoundday"]),
    ambientNight: readNumberByAliases(view, root, ["ambientsndnight", "ambientsoundnight"]),
    musicDay: readNumberByAliases(view, root, ["musicday"]),
    musicNight: readNumberByAliases(view, root, ["musicnight"]),
    musicBattle: readNumberByAliases(view, root, ["musicbattle"])
  };

  const dependencyFingerprint = createHash("sha256")
    .update(
      [
        name ?? "",
        tag ?? "",
        String(width ?? -1),
        String(height ?? -1),
        tileSet ?? "",
        String(tileCount ?? -1),
        String(soundIds.ambientDay ?? -1),
        String(soundIds.ambientNight ?? -1),
        String(soundIds.musicDay ?? -1),
        String(soundIds.musicNight ?? -1),
        String(soundIds.musicBattle ?? -1)
      ].join("|")
    )
    .digest("hex");

  return {
    sourceFileType: view.header.fileType,
    sourceFileVersion: view.header.fileVersion,
    sourceStructTypeId: view.structs[0]?.typeId ?? 0,
    name,
    tag,
    width,
    height,
    tileSet,
    tileCount,
    soundIds,
    dependencyFingerprint
  };
}

export function parseAreaObjectsFromGitGff(
  bytes: Buffer
): ParsedAreaObjectBlueprint | null {
  const view = GffView.fromBuffer(bytes);
  if (!view) {
    return null;
  }
  if (view.header.fileType.trim() !== "GIT") {
    return null;
  }

  const root = view.getStructFields(0);

  const placeables = parsePlacementList(view, root, ["placeablelist"], "placeable");
  const doors = parsePlacementList(view, root, ["doorlist"], "door");
  const creatures = parsePlacementList(view, root, ["creaturelist"], "creature");
  const items = parsePlacementList(view, root, ["itemlist"], "item");

  const dependencyFingerprint = createHash("sha256")
    .update(
      [
        ...placeables.map((entry) => stringifyPlacement(entry)),
        ...doors.map((entry) => stringifyPlacement(entry)),
        ...creatures.map((entry) => stringifyPlacement(entry)),
        ...items.map((entry) => stringifyPlacement(entry))
      ].join("|")
    )
    .digest("hex");

  return {
    sourceFileType: view.header.fileType,
    sourceFileVersion: view.header.fileVersion,
    sourceStructTypeId: view.structs[0]?.typeId ?? 0,
    placeables,
    doors,
    creatures,
    items,
    dependencyFingerprint
  };
}

function parsePlacementList(
  view: GffView,
  root: Map<string, GffFieldRef>,
  aliases: readonly string[],
  kind: ParsedAreaPlacementBlueprint["listKind"]
): ParsedAreaPlacementBlueprint[] {
  const listField = findFieldByAliases(root, aliases);
  const structIndices = view.readListStructIndices(listField);
  const placements: ParsedAreaPlacementBlueprint[] = [];

  for (const structIndex of structIndices) {
    const fields = view.getStructFields(structIndex);

    const positionStructIndex = view.readStructIndex(
      findFieldByAliases(fields, ["position", "location"])
    );
    const positionStruct =
      positionStructIndex === undefined ? new Map<string, GffFieldRef>() : view.getStructFields(positionStructIndex);

    const x =
      readNumberByAliases(view, fields, ["xposition", "x", "xpos"]) ??
      readNumberByAliases(view, positionStruct, ["x"]);
    const y =
      readNumberByAliases(view, fields, ["yposition", "y", "ypos"]) ??
      readNumberByAliases(view, positionStruct, ["y"]);
    const z =
      readNumberByAliases(view, fields, ["zposition", "z", "zpos"]) ??
      readNumberByAliases(view, positionStruct, ["z"]) ??
      0;

    const xOrientation =
      readNumberByAliases(view, fields, ["xorientation"]) ??
      readNumberByAliases(view, positionStruct, ["xorientation"]);
    const yOrientation =
      readNumberByAliases(view, fields, ["yorientation"]) ??
      readNumberByAliases(view, positionStruct, ["yorientation"]);

    const explicitBearing = readNumberByAliases(view, fields, ["bearing", "facing", "orientation"]);
    const derivedBearing =
      explicitBearing ??
      deriveBearingFromOrientation(xOrientation, yOrientation) ??
      0;

    const templateResRef = readStringByAliases(view, fields, [
      "templateresref",
      "resref",
      "template"
    ]);
    const tag = readStringByAliases(view, fields, ["tag"]);

    if (!Number.isFinite(x ?? Number.NaN) || !Number.isFinite(y ?? Number.NaN)) {
      continue;
    }

    placements.push({
      listKind: kind,
      templateResRef,
      tag,
      x: clampNumber(x ?? 0),
      y: clampNumber(y ?? 0),
      z: clampNumber(z),
      bearing: normalizeBearing(derivedBearing)
    });
  }

  return placements;
}

function stringifyPlacement(entry: ParsedAreaPlacementBlueprint): string {
  return [
    entry.listKind,
    entry.templateResRef ?? "",
    entry.tag ?? "",
    entry.x,
    entry.y,
    entry.z,
    entry.bearing
  ].join("|");
}

function deriveBearingFromOrientation(
  xOrientation: number | undefined,
  yOrientation: number | undefined
): number | undefined {
  if (!Number.isFinite(xOrientation ?? Number.NaN) || !Number.isFinite(yOrientation ?? Number.NaN)) {
    return undefined;
  }
  if ((xOrientation ?? 0) === 0 && (yOrientation ?? 0) === 0) {
    return undefined;
  }
  const radians = Math.atan2(yOrientation ?? 0, xOrientation ?? 0);
  return (radians * 180) / Math.PI;
}

function normalizeBearing(value: number): number {
  const normalized = ((value % 360) + 360) % 360;
  return clampNumber(normalized);
}

function readNameByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): string | undefined {
  const field = findFieldByAliases(fields, aliases);
  const loc = view.readLocString(field);
  if (loc?.text && loc.text.trim().length > 0) {
    return sanitizeUtf8(loc.text);
  }
  const value = view.readString(field);
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return sanitizeUtf8(value);
}

function readStringByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): string | undefined {
  const field = findFieldByAliases(fields, aliases);
  const value = view.readString(field);
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return sanitizeAscii(value);
}

function readNumberByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const field = findFieldByAliases(fields, aliases);
  const value = view.readNumber(field);
  if (!Number.isFinite(value ?? Number.NaN)) {
    return undefined;
  }
  return value;
}

function readListCountByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const field = findFieldByAliases(fields, aliases);
  if (!field) {
    return undefined;
  }
  return view.readListStructIndices(field).length;
}

function findFieldByAliases(
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): GffFieldRef | undefined {
  for (const alias of aliases) {
    const found = fields.get(normalizeLabel(alias));
    if (found) {
      return found;
    }
  }
  return undefined;
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

function readResRef(bytes: Buffer, header: GffHeader, dataOrOffset: number): string | undefined {
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
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function sanitizeAscii(value: string): string {
  return value.replace(/\0/gu, "").trim();
}

function sanitizeUtf8(value: string): string {
  return value.replace(/\0/gu, "").trim();
}

function clampNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(4));
}

export const __auroraGffAreaParserInternals = {
  deriveBearingFromOrientation,
  normalizeBearing,
  normalizeLabel,
  sanitizeAscii,
  sanitizeUtf8,
  isRangeWithinBuffer
} as const;
