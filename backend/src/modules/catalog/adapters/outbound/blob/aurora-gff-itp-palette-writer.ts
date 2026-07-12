import {
  buildGffBuffer,
  type SupportedGffField
} from "./aurora-gff-uti-writer";

export interface SerializableItpPaletteNode {
  label?: string;
  strRef?: number;
  id?: number;
  resRef?: string;
  children?: SerializableItpPaletteNode[];
}

export interface SerializableItpPalette {
  roots: SerializableItpPaletteNode[];
  sourceStructTypeId?: number;
}

const ITP_FILE_TYPE = "ITP ";
const ROOT_STRUCT_TYPE_ID = 0xffffffff;
const PALETTE_NODE_STRUCT_TYPE_ID = 0;

export function serializeItemPaletteToItpGff(input: SerializableItpPalette): Buffer {
  return buildGffBuffer(
    [
      {
        label: "MAIN",
        type: "list",
        value: input.roots.map((node) => buildPaletteNodeStruct(node))
      }
    ],
    ITP_FILE_TYPE,
    normalizeUInt32(input.sourceStructTypeId ?? ROOT_STRUCT_TYPE_ID)
  );
}

function buildPaletteNodeStruct(node: SerializableItpPaletteNode): {
  typeId: number;
  fields: SupportedGffField[];
} {
  const fields: SupportedGffField[] = [];
  pushCExoLocString(fields, "NAME", node.label, node.strRef);
  pushWord(fields, "STRREF", node.strRef);
  pushDword(fields, "ID", node.id);
  pushResRef(fields, "RESREF", node.resRef);

  const children = node.children ?? [];
  if (children.length > 0) {
    fields.push({
      label: "LIST",
      type: "list",
      value: children.map((child) => buildPaletteNodeStruct(child))
    });
  }

  return { typeId: PALETTE_NODE_STRUCT_TYPE_ID, fields };
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

function pushResRef(fields: SupportedGffField[], label: string, value: unknown): void {
  if (typeof value === "string") {
    const normalized = normalizeResRef(value);
    if (normalized) {
      fields.push({ label, type: "resref", value: normalized });
    }
  }
}

function pushCExoLocString(
  fields: SupportedGffField[],
  label: string,
  text: unknown,
  strRef: unknown
): void {
  if (typeof text !== "string" && !isFiniteNumber(strRef)) {
    return;
  }
  fields.push({
    label,
    type: "cexolocstring",
    value: {
      ...(typeof text === "string" && text.trim().length > 0 ? { text: text.trim() } : {}),
      ...(isFiniteNumber(strRef) ? { strRef } : {})
    }
  });
}

function normalizeResRef(value: string): string | undefined {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_]+/gu, "_").slice(0, 16);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeUInt32(value: number): number {
  if (!Number.isFinite(value)) {
    return ROOT_STRUCT_TYPE_ID;
  }
  return Math.max(0, Math.min(0xffffffff, Math.trunc(value))) >>> 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
