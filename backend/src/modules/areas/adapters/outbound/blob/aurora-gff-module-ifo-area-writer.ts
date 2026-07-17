import { parseRawGffDocument } from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const MODULE_AREA_LIST_LABEL = "Mod_Area_list";
const MODULE_AREA_NAME_LABEL = "Area_Name";
const TOOLSET_AREA_STRUCT_TYPE_ID = 6;

export interface PatchedModuleIfoAreaList {
  bytes: Buffer;
  areaCount: number;
  alreadyPresent: boolean;
}

/**
 * Adds an Area ResRef to module.ifo while semantically preserving every other
 * supported root/nested GFF field and struct type. This is intentionally not a
 * byte-identical patch: Mod_Area_list is emitted first so the generic GFF
 * writer assigns its child structs the Toolset-observed contiguous range
 * immediately after the root struct. Other root fields keep their values and
 * nested order, but root field/table offsets are canonically rebuilt.
 */
export function patchModuleIfoAreaList(
  sourceBytes: Buffer,
  areaResRef: string
): PatchedModuleIfoAreaList {
  const document = parseRawGffDocument(sourceBytes);
  if (!document || document.fileType !== "IFO ") {
    throw new Error("module.ifo is not a readable IFO GFF document.");
  }
  if (document.fileVersion !== "V3.2") {
    throw new Error(`Unsupported module.ifo GFF version ${document.fileVersion}.`);
  }

  const normalizedResRef = normalizeResRef(areaResRef);
  const areaListIndex = document.fields.findIndex(
    (field) => field.label.toLowerCase() === MODULE_AREA_LIST_LABEL.toLowerCase()
  );
  const existingAreaList = areaListIndex >= 0 ? document.fields[areaListIndex] : undefined;
  if (existingAreaList && existingAreaList.type !== "list") {
    throw new Error("module.ifo Mod_Area_list is not a GFF list.");
  }

  const entries = existingAreaList?.type === "list"
    ? existingAreaList.value.map((entry) => ({
        typeId: entry.typeId,
        fields: cloneFields(entry.fields)
      }))
    : [];
  const alreadyPresent = entries.some((entry) =>
    entry.fields.some(
      (field) =>
        field.label.toLowerCase() === MODULE_AREA_NAME_LABEL.toLowerCase() &&
        (field.type === "resref" || field.type === "cexostring") &&
        normalizeResRef(field.value) === normalizedResRef
    )
  );
  if (!alreadyPresent) {
    entries.push({
      typeId: entries[0]?.typeId ?? TOOLSET_AREA_STRUCT_TYPE_ID,
      fields: [{ label: MODULE_AREA_NAME_LABEL, type: "resref", value: normalizedResRef }]
    });
  }

  const areaList: SupportedGffField = {
    label: existingAreaList?.label ?? MODULE_AREA_LIST_LABEL,
    type: "list",
    value: entries
  };
  const remainingFields = document.fields
    .filter((_field, index) => index !== areaListIndex)
    .map(cloneField);
  const fields = [areaList, ...remainingFields];
  return {
    bytes: alreadyPresent
      ? Buffer.from(sourceBytes)
      : buildGffBuffer(fields, document.fileType, document.rootStructTypeId),
    areaCount: entries.length,
    alreadyPresent
  };
}

/** Verifies the persisted semantic registration after a canonical IFO rebuild. */
export function moduleIfoContainsArea(sourceBytes: Buffer, areaResRef: string): boolean {
  const document = parseRawGffDocument(sourceBytes);
  if (!document || document.fileType !== "IFO " || document.fileVersion !== "V3.2") {
    return false;
  }
  const normalizedResRef = normalizeResRef(areaResRef);
  const areaList = document.fields.find(
    (field) => field.label.toLowerCase() === MODULE_AREA_LIST_LABEL.toLowerCase()
  );
  return areaList?.type === "list" && areaList.value.some((entry) =>
    entry.fields.some(
      (field) =>
        field.label.toLowerCase() === MODULE_AREA_NAME_LABEL.toLowerCase() &&
        (field.type === "resref" || field.type === "cexostring") &&
        normalizeResRef(field.value) === normalizedResRef
    )
  );
}

function cloneFields(fields: SupportedGffField[]): SupportedGffField[] {
  return fields.map(cloneField);
}

function cloneField(field: SupportedGffField): SupportedGffField {
  if (field.type === "void") {
    return { ...field, value: Buffer.from(field.value) };
  }
  if (field.type === "struct") {
    return {
      ...field,
      value: { typeId: field.value.typeId, fields: cloneFields(field.value.fields) }
    };
  }
  if (field.type === "list") {
    return {
      ...field,
      value: field.value.map((entry) => ({
        typeId: entry.typeId,
        fields: cloneFields(entry.fields)
      }))
    };
  }
  if (field.type === "cexolocstring") {
    return {
      ...field,
      value: {
        ...field.value,
        ...(field.value.entries
          ? { entries: field.value.entries.map((entry) => ({ ...entry })) }
          : {})
      }
    };
  }
  return { ...field };
}

function normalizeResRef(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/gu, "").slice(0, 16);
}

export const __moduleIfoAreaWriterInternals = {
  TOOLSET_AREA_STRUCT_TYPE_ID
};
