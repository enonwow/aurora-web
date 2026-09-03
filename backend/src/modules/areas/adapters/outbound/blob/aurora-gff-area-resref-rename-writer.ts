import { parseRawGffDocument } from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  cloneSupportedGffField,
} from "./aurora-gff-supported-field-cloner";

const CANONICAL_RESREF = /^[a-z0-9_]{1,16}$/u;

export interface RenamedAreaRootResRef {
  readonly bytes: Buffer;
  readonly expectedResRef: string;
  readonly resRef: string;
}

export interface ExactModuleAreaIdentity {
  readonly areaCount: number;
  readonly membershipCount: number;
  readonly entryAreaResRef: string;
}

export interface RenamedModuleAreaIdentity extends ExactModuleAreaIdentity {
  readonly bytes: Buffer;
  readonly expectedResRef: string;
  readonly resRef: string;
  readonly entryAreaUpdated: boolean;
}

/** Reads the single canonical root ResRef admitted by an Aurora ARE V3.2. */
export function readExactAreaRootResRef(bytes: Buffer): string | null {
  const document = parseRawGffDocument(bytes);
  if (!document || document.fileType !== "ARE " || document.fileVersion !== "V3.2") {
    return null;
  }
  const matches = semanticFields(document.fields, "ResRef");
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== "ResRef" || field.type !== "resref") {
    return null;
  }
  return isCanonicalResRef(field.value) ? field.value : null;
}

/**
 * Replaces only the root ARE identity. The caller is responsible for moving
 * the logical ARE/GIT/GIC keys in the surrounding snapshot transaction.
 */
export function renameAreaRootResRef(
  sourceBytes: Buffer,
  expectedResRef: string,
  resRef: string,
): RenamedAreaRootResRef {
  assertRenamePair(expectedResRef, resRef);
  if (readExactAreaRootResRef(sourceBytes) !== expectedResRef) {
    throw new Error("Area ARE root ResRef is missing, malformed, or stale.");
  }
  const document = parseRawGffDocument(sourceBytes);
  if (!document) {
    throw new Error("Area ARE is not a readable GFF document.");
  }
  const fields = document.fields.map((field): SupportedGffField =>
    field.label === "ResRef" && field.type === "resref"
      ? { ...field, value: resRef }
      : cloneSupportedGffField(field),
  );
  const bytes = buildGffBuffer(fields, document.fileType, document.rootStructTypeId);
  if (readExactAreaRootResRef(bytes) !== resRef) {
    throw new Error("Renamed Area ARE failed independent identity readback.");
  }
  return Object.freeze({ bytes, expectedResRef, resRef });
}

/**
 * Strictly reads the module entry Area and ordered Area membership list.
 * Any case drift, duplicate semantic label, wrong type, or noncanonical
 * ResRef makes the whole identity shape inadmissible.
 */
export function readExactModuleAreaIdentity(
  bytes: Buffer,
  targetResRef: string,
): ExactModuleAreaIdentity | null {
  if (!isCanonicalResRef(targetResRef)) {
    return null;
  }
  const shape = parseExactModuleAreaShape(bytes);
  if (!shape) {
    return null;
  }
  return Object.freeze({
    areaCount: shape.areaList.value.length,
    membershipCount: shape.memberships.filter((value) => value === targetResRef).length,
    entryAreaResRef: shape.entryArea.value,
  });
}

/** Replaces one ordered IFO membership and the entry Area only when it matches. */
export function renameModuleAreaIdentity(
  sourceBytes: Buffer,
  expectedResRef: string,
  resRef: string,
): RenamedModuleAreaIdentity {
  assertRenamePair(expectedResRef, resRef);
  const shape = parseExactModuleAreaShape(sourceBytes);
  if (!shape) {
    throw new Error("Module IFO Area identity shape is missing or malformed.");
  }
  const expectedCount = shape.memberships.filter((value) => value === expectedResRef).length;
  if (expectedCount !== 1) {
    throw new Error(`Module IFO must contain exactly one ${expectedResRef} Area membership.`);
  }
  if (shape.memberships.includes(resRef)) {
    throw new Error(`Module IFO already contains target Area membership ${resRef}.`);
  }

  const entryAreaUpdated = shape.entryArea.value === expectedResRef;
  const fields = shape.document.fields.map((field): SupportedGffField => {
    if (field === shape.entryArea && field.type === "resref") {
      return { ...field, value: entryAreaUpdated ? resRef : field.value };
    }
    if (field !== shape.areaList || field.type !== "list") {
      return cloneSupportedGffField(field);
    }
    return {
      ...field,
      value: field.value.map((entry) => ({
        typeId: entry.typeId,
        fields: entry.fields.map((nested): SupportedGffField =>
          nested.label === "Area_Name" && nested.type === "resref" && nested.value === expectedResRef
            ? { ...nested, value: resRef }
            : cloneSupportedGffField(nested),
        ),
      })),
    };
  });
  const bytes = buildGffBuffer(fields, shape.document.fileType, shape.document.rootStructTypeId);
  const oldReadback = readExactModuleAreaIdentity(bytes, expectedResRef);
  const newReadback = readExactModuleAreaIdentity(bytes, resRef);
  const expectedEntry = entryAreaUpdated ? resRef : shape.entryArea.value;
  if (!oldReadback || !newReadback ||
      oldReadback.membershipCount !== 0 || newReadback.membershipCount !== 1 ||
      newReadback.areaCount !== shape.areaList.value.length ||
      newReadback.entryAreaResRef !== expectedEntry) {
    throw new Error("Renamed module IFO failed independent identity readback.");
  }
  return Object.freeze({
    bytes,
    expectedResRef,
    resRef,
    areaCount: newReadback.areaCount,
    membershipCount: newReadback.membershipCount,
    entryAreaUpdated,
    entryAreaResRef: newReadback.entryAreaResRef,
  });
}

interface ExactModuleAreaShape {
  readonly document: NonNullable<ReturnType<typeof parseRawGffDocument>>;
  readonly areaList: Extract<SupportedGffField, { type: "list" }>;
  readonly entryArea: Extract<SupportedGffField, { type: "resref" }>;
  readonly memberships: readonly string[];
}

function parseExactModuleAreaShape(bytes: Buffer): ExactModuleAreaShape | null {
  const document = parseRawGffDocument(bytes);
  if (!document || document.fileType !== "IFO " || document.fileVersion !== "V3.2") {
    return null;
  }
  const areaListMatches = semanticFields(document.fields, "Mod_Area_list");
  const areaList = areaListMatches[0];
  if (areaListMatches.length !== 1 ||
      areaList?.label !== "Mod_Area_list" || areaList.type !== "list") {
    return null;
  }
  const entryMatches = semanticFields(document.fields, "Mod_Entry_Area");
  const entryArea = entryMatches[0];
  if (entryMatches.length !== 1 ||
      entryArea?.label !== "Mod_Entry_Area" || entryArea.type !== "resref" ||
      !isCanonicalResRef(entryArea.value)) {
    return null;
  }
  const memberships: string[] = [];
  for (const entry of areaList.value) {
    const nameMatches = semanticFields(entry.fields, "Area_Name");
    const areaName = nameMatches[0];
    if (nameMatches.length !== 1 ||
        areaName?.label !== "Area_Name" || areaName.type !== "resref" ||
        !isCanonicalResRef(areaName.value)) {
      return null;
    }
    memberships.push(areaName.value);
  }
  return {
    document,
    areaList,
    entryArea,
    memberships: Object.freeze(memberships),
  };
}

function semanticFields(
  fields: readonly SupportedGffField[],
  label: string,
): SupportedGffField[] {
  const normalized = label.toLowerCase();
  return fields.filter((field) => field.label.toLowerCase() === normalized);
}

function assertRenamePair(expectedResRef: string, resRef: string): void {
  if (!isCanonicalResRef(expectedResRef) || !isCanonicalResRef(resRef)) {
    throw new Error("Area ResRefs must be canonical lowercase ASCII identifiers of 1-16 characters.");
  }
  if (expectedResRef === resRef) {
    throw new Error("Area rename must change the ResRef.");
  }
}

function isCanonicalResRef(value: string): boolean {
  return CANONICAL_RESREF.test(value);
}
