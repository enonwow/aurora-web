import { parseRawGffDocument } from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  areaModuleStartLocationsEqual,
  isAreaModuleStartLocation,
  type AreaModuleStartLocation,
  type ExistingAreaModuleStartLocationMutation,
} from "../../../domain/area-module-start-location";

const MODULE_AREA_LIST_LABEL = "Mod_Area_list";
const MODULE_AREA_NAME_LABEL = "Area_Name";
const MODULE_HAK_LIST_LABEL = "Mod_HakList";
const MODULE_HAK_NAME_LABEL = "Mod_Hak";
const TOOLSET_AREA_STRUCT_TYPE_ID = 6;
const TOOLSET_HAK_STRUCT_TYPE_ID = 8;

export interface PatchedModuleIfoAreaList {
  bytes: Buffer;
  areaCount: number;
  alreadyPresent: boolean;
}

export interface RemovedModuleIfoAreaList {
  bytes: Buffer;
  areaCount: number;
  removedCount: number;
}

export interface EnsuredModuleIfoHak {
  bytes: Buffer;
  hakCount: number;
  alreadyPresent: boolean;
  orderedHakResRefs: string[];
}

export interface UpdatedModuleIfoStartLocation {
  readonly bytes: Buffer;
  readonly startLocation: AreaModuleStartLocation;
}

/**
 * Appends one exact HAK ResRef to Mod_HakList while preserving the existing
 * order and every supported sibling field. Aurora resolves HAK resources in
 * reverse list order, so appending is deliberate and makes the admitted HAK
 * the highest-priority member without reordering the source module's list.
 */
export function ensureModuleIfoHak(
  sourceBytes: Buffer,
  hakResRef: string,
): EnsuredModuleIfoHak {
  const document = parseRawGffDocument(sourceBytes);
  if (!document || document.fileType !== "IFO ") {
    throw new Error("module.ifo is not a readable IFO GFF document.");
  }
  if (document.fileVersion !== "V3.2") {
    throw new Error(`Unsupported module.ifo GFF version ${document.fileVersion}.`);
  }
  const normalizedTarget = normalizeHakResRef(hakResRef);
  if (hakResRef !== normalizedTarget) {
    throw new Error("HAK ResRef must be an exact lowercase Aurora ResRef.");
  }

  const hakListIndexes = document.fields
    .map((field, index) => field.label.toLowerCase() === MODULE_HAK_LIST_LABEL.toLowerCase()
      ? index
      : -1)
    .filter((index) => index >= 0);
  if (hakListIndexes.length > 1) {
    throw new Error("module.ifo contains duplicate Mod_HakList fields.");
  }
  const hakListIndex = hakListIndexes[0] ?? -1;
  const existingHakList = hakListIndex >= 0 ? document.fields[hakListIndex] : undefined;
  if (existingHakList && existingHakList.type !== "list") {
    throw new Error("module.ifo Mod_HakList is not a GFF list.");
  }

  const entries = existingHakList?.type === "list"
    ? existingHakList.value.map((entry) => ({
        typeId: entry.typeId,
        fields: cloneFields(entry.fields),
      }))
    : [];
  const orderedHakResRefs = entries.map((entry, index) => {
    const matches = entry.fields.filter(
      (field) => field.label.toLowerCase() === MODULE_HAK_NAME_LABEL.toLowerCase(),
    );
    if (matches.length !== 1 || matches[0].type !== "cexostring") {
      throw new Error(`module.ifo Mod_HakList[${index}] must contain exactly one CExoString Mod_Hak.`);
    }
    return normalizeHakResRef(matches[0].value);
  });
  if (new Set(orderedHakResRefs).size !== orderedHakResRefs.length) {
    throw new Error("module.ifo Mod_HakList contains duplicate normalized HAK ResRefs.");
  }
  const alreadyPresent = orderedHakResRefs.includes(normalizedTarget);
  if (alreadyPresent) {
    return {
      bytes: Buffer.from(sourceBytes),
      hakCount: entries.length,
      alreadyPresent: true,
      orderedHakResRefs,
    };
  }

  entries.push({
    typeId: entries[0]?.typeId ?? TOOLSET_HAK_STRUCT_TYPE_ID,
    fields: [{ label: MODULE_HAK_NAME_LABEL, type: "cexostring", value: normalizedTarget }],
  });
  const hakList: SupportedGffField = {
    label: existingHakList?.label ?? MODULE_HAK_LIST_LABEL,
    type: "list",
    value: entries,
  };
  const fields = document.fields.map((field, index) =>
    index === hakListIndex ? hakList : cloneField(field));
  if (hakListIndex < 0) fields.push(hakList);
  orderedHakResRefs.push(normalizedTarget);
  return {
    bytes: buildGffBuffer(fields, document.fileType, document.rootStructTypeId),
    hakCount: entries.length,
    alreadyPresent: false,
    orderedHakResRefs,
  };
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

/** Counts exact, case-insensitive target memberships or returns -1 for an unreadable IFO/list. */
export function moduleIfoAreaMembershipCount(
  sourceBytes: Buffer,
  areaResRef: string,
): number {
  const document = parseRawGffDocument(sourceBytes);
  if (!document || document.fileType !== "IFO " || document.fileVersion !== "V3.2") {
    return -1;
  }
  const areaList = document.fields.find(
    (field) => field.label.toLowerCase() === MODULE_AREA_LIST_LABEL.toLowerCase(),
  );
  if (!areaList || areaList.type !== "list") return -1;
  const normalizedResRef = normalizeResRef(areaResRef);
  return areaList.value.filter((entry) => entry.fields.some(
    (field) => isAreaName(field, normalizedResRef),
  )).length;
}

/** Reads the native module entry Area identity without inferring a fallback. */
export function readModuleIfoEntryArea(sourceBytes: Buffer): string | null {
  const document = parseRawGffDocument(sourceBytes);
  if (!document || document.fileType !== "IFO " || document.fileVersion !== "V3.2") {
    return null;
  }
  const field = document.fields.find(
    (candidate) => candidate.label.toLowerCase() === "mod_entry_area",
  );
  if (!field || (field.type !== "resref" && field.type !== "cexostring")) return null;
  const normalized = normalizeResRef(field.value);
  return normalized.length > 0 ? normalized : null;
}

/** Reads only one exact, complete, membership-bound native module entry tuple. */
export function readModuleIfoStartLocation(
  sourceBytes: Buffer,
): AreaModuleStartLocation | null {
  const document = parseRawGffDocument(sourceBytes);
  if (!document || document.fileType !== "IFO " || document.fileVersion !== "V3.2") {
    return null;
  }
  const area = exactRootField(document.fields, "Mod_Entry_Area", "resref");
  const x = exactRootField(document.fields, "Mod_Entry_X", "float");
  const y = exactRootField(document.fields, "Mod_Entry_Y", "float");
  const z = exactRootField(document.fields, "Mod_Entry_Z", "float");
  const directionX = exactRootField(document.fields, "Mod_Entry_Dir_X", "float");
  const directionY = exactRootField(document.fields, "Mod_Entry_Dir_Y", "float");
  if (!area || !x || !y || !z || !directionX || !directionY) return null;
  const startLocation = Object.freeze({
    areaResRef: area.value,
    x: canonicalFloatZero(x.value),
    y: canonicalFloatZero(y.value),
    z: canonicalFloatZero(z.value),
    directionX: canonicalFloatZero(directionX.value),
    directionY: canonicalFloatZero(directionY.value),
  });
  if (!isAreaModuleStartLocation(startLocation)) return null;
  return exactModuleAreaMembershipCount(document.fields, startLocation.areaResRef) === 1
    ? startLocation
    : null;
}

/** Replaces exactly the retained six-field tuple and preserves all other IFO values. */
export function updateModuleIfoStartLocation(
  sourceBytes: Buffer,
  mutation: ExistingAreaModuleStartLocationMutation,
): UpdatedModuleIfoStartLocation {
  if (!isAreaModuleStartLocation(mutation.expectedValue) ||
      !isAreaModuleStartLocation(mutation.value)) {
    throw new Error("Module start-location mutation must contain exact binary32 tuples.");
  }
  if (areaModuleStartLocationsEqual(mutation.expectedValue, mutation.value)) {
    throw new Error("Module start-location mutation must change the retained tuple.");
  }
  const document = parseRawGffDocument(sourceBytes);
  if (!document || document.fileType !== "IFO ") {
    throw new Error("module.ifo is not a readable IFO GFF document.");
  }
  if (document.fileVersion !== "V3.2") {
    throw new Error(`Unsupported module.ifo GFF version ${document.fileVersion}.`);
  }
  const current = readModuleIfoStartLocation(sourceBytes);
  if (!current || !areaModuleStartLocationsEqual(current, mutation.expectedValue)) {
    throw new Error("module.ifo start-location source provenance is missing or stale.");
  }
  if (exactModuleAreaMembershipCount(document.fields, mutation.value.areaResRef) !== 1) {
    throw new Error("module.ifo start-location target must be exactly one Area membership.");
  }
  const replacements = new Map<string, string | number>([
    ["Mod_Entry_Area", mutation.value.areaResRef],
    ["Mod_Entry_X", mutation.value.x],
    ["Mod_Entry_Y", mutation.value.y],
    ["Mod_Entry_Z", mutation.value.z],
    ["Mod_Entry_Dir_X", mutation.value.directionX],
    ["Mod_Entry_Dir_Y", mutation.value.directionY],
  ]);
  const fields = document.fields.map((field) => {
    const replacement = replacements.get(field.label);
    return replacement === undefined
      ? cloneField(field)
      : { ...field, value: replacement } as SupportedGffField;
  });
  const bytes = buildGffBuffer(fields, document.fileType, document.rootStructTypeId);
  const readback = readModuleIfoStartLocation(bytes);
  if (!readback || !areaModuleStartLocationsEqual(readback, mutation.value)) {
    throw new Error("module.ifo start-location candidate failed independent readback.");
  }
  return Object.freeze({ bytes, startLocation: readback });
}

/**
 * Removes exactly one target membership and semantically preserves every other
 * supported IFO field, nested value, struct type, and Area-list entry order.
 */
export function removeAreaFromModuleIfoAreaList(
  sourceBytes: Buffer,
  areaResRef: string,
): RemovedModuleIfoAreaList {
  const document = parseRawGffDocument(sourceBytes);
  if (!document || document.fileType !== "IFO ") {
    throw new Error("module.ifo is not a readable IFO GFF document.");
  }
  if (document.fileVersion !== "V3.2") {
    throw new Error(`Unsupported module.ifo GFF version ${document.fileVersion}.`);
  }
  const areaListIndex = document.fields.findIndex(
    (field) => field.label.toLowerCase() === MODULE_AREA_LIST_LABEL.toLowerCase(),
  );
  const areaList = areaListIndex >= 0 ? document.fields[areaListIndex] : undefined;
  if (!areaList || areaList.type !== "list") {
    throw new Error("module.ifo Mod_Area_list is not a GFF list.");
  }
  const normalizedResRef = normalizeResRef(areaResRef);
  const matching = areaList.value.filter((entry) => entry.fields.some(
    (field) => isAreaName(field, normalizedResRef),
  ));
  if (matching.length !== 1) {
    throw new Error("module.ifo must contain exactly one target Area membership.");
  }
  const retainedEntries = areaList.value
    .filter((entry) => !entry.fields.some((field) => isAreaName(field, normalizedResRef)))
    .map((entry) => ({ typeId: entry.typeId, fields: cloneFields(entry.fields) }));
  const rebuiltAreaList: SupportedGffField = {
    label: areaList.label,
    type: "list",
    value: retainedEntries,
  };
  const remainingFields = document.fields
    .filter((_field, index) => index !== areaListIndex)
    .map(cloneField);
  return {
    bytes: buildGffBuffer(
      [rebuiltAreaList, ...remainingFields],
      document.fileType,
      document.rootStructTypeId,
    ),
    areaCount: retainedEntries.length,
    removedCount: 1,
  };
}

function isAreaName(field: SupportedGffField, normalizedResRef: string): boolean {
  return (
    field.label.toLowerCase() === MODULE_AREA_NAME_LABEL.toLowerCase() &&
    (field.type === "resref" || field.type === "cexostring") &&
    normalizeResRef(field.value) === normalizedResRef
  );
}

function exactRootField<TType extends SupportedGffField["type"]>(
  fields: readonly SupportedGffField[],
  label: string,
  type: TType,
): Extract<SupportedGffField, { type: TType }> | null {
  const semanticMatches = fields.filter(
    (field) => field.label.toLowerCase() === label.toLowerCase(),
  );
  if (semanticMatches.length !== 1) return null;
  const field = semanticMatches[0];
  return field.label === label && field.type === type
    ? field as Extract<SupportedGffField, { type: TType }>
    : null;
}

function exactModuleAreaMembershipCount(
  fields: readonly SupportedGffField[],
  areaResRef: string,
): number {
  const areaLists = fields.filter(
    (field) => field.label.toLowerCase() === MODULE_AREA_LIST_LABEL.toLowerCase(),
  );
  if (areaLists.length !== 1 || areaLists[0].label !== MODULE_AREA_LIST_LABEL ||
      areaLists[0].type !== "list") return -1;
  let count = 0;
  for (const entry of areaLists[0].value) {
    const names = entry.fields.filter(
      (field) => field.label.toLowerCase() === MODULE_AREA_NAME_LABEL.toLowerCase(),
    );
    if (names.length !== 1 || names[0].label !== MODULE_AREA_NAME_LABEL ||
        names[0].type !== "resref") return -1;
    if (names[0].value.toLowerCase() === areaResRef) count += 1;
  }
  return count;
}

function canonicalFloatZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
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

function normalizeHakResRef(value: string): string {
  const normalized = value.toLowerCase();
  if (!/^[a-z0-9_]{1,16}$/u.test(normalized)) {
    throw new Error("HAK ResRef must match [a-z0-9_]{1,16}.");
  }
  return normalized;
}

export const __moduleIfoAreaWriterInternals = {
  TOOLSET_AREA_STRUCT_TYPE_ID,
  TOOLSET_HAK_STRUCT_TYPE_ID,
};
