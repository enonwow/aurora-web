import {
  isExactEffectiveCreatureClassesTwoDaTable,
  type EffectiveCreatureClassesTwoDaTable,
} from "../../catalog/domain/effective-creature-classes-two-da";

const INT_MAX = 0x7fff_ffff;
const BYTE_MAX = 0xff;
const MAX_CLASS_SLOTS = 8;
const MAX_CLASS_LEVEL = 60;
const MAX_TOTAL_LEVEL = 180;
const MAX_CLASS_ROWS = 65_536;
const MAX_PACKAGE_ROWS = 256;
const MAX_FIELDS = 65_535;
const MAX_SPELL_ENTRIES = 65_535;

const BASE_KEYS = [
  "present", "nativeType", "structTypeId", "classNativeType", "levelNativeType",
  "classListGraphSha256", "entries",
] as const;
const ENTRY_KEYS = [
  "classId", "level", "opaqueSiblingFieldCount", "canonicalSpellListFieldCount",
  "spellEntryCount",
] as const;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const MUTATION_KEYS = [
  "expectedClassIds", "classIds", "expectedLevels", "levels", "classListGraphSha256",
  "destructiveSpellClearConfirmed", "expectedStartingPackage", "startingPackage",
  "classesTableSha256", "classesRowCount", "packagesTableSha256", "packagesRowCount",
] as const;

export interface AreaCreatureClassIdentityEntry {
  readonly classId: number;
  readonly level: number;
  readonly opaqueSiblingFieldCount: number;
  readonly canonicalSpellListFieldCount: number;
  readonly spellEntryCount: number;
}

export interface AreaCreatureClassesTableBinding {
  readonly resourceName: "classes.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export type AreaCreatureClassIdentityState =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 2;
      classNativeType: "int";
      levelNativeType: "short";
      classListGraphSha256: string;
      entries: readonly AreaCreatureClassIdentityEntry[];
      classesTable?: AreaCreatureClassesTableBinding;
    }>;

export interface ExistingAreaCreatureClassIdentityMutation {
  readonly expectedClassIds: readonly number[];
  readonly classIds: readonly number[];
  readonly expectedLevels: readonly number[];
  readonly levels: readonly number[];
  readonly classListGraphSha256: string;
  readonly destructiveSpellClearConfirmed: true;
  readonly expectedStartingPackage: number;
  readonly startingPackage: number;
  readonly classesTableSha256: string;
  readonly classesRowCount: number;
  readonly packagesTableSha256: string;
  readonly packagesRowCount: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

function readIds(value: unknown, count?: number, rowCount?: number): readonly number[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CLASS_SLOTS ||
    count !== undefined && value.length !== count || value.some((entry) =>
      !isBoundedInteger(entry, 0, INT_MAX) || rowCount !== undefined && Number(entry) >= rowCount)) {
    return null;
  }
  const ids = value.map(Number);
  return new Set(ids).size === ids.length ? Object.freeze(ids) : null;
}

function readLevels(value: unknown, count: number): readonly number[] | null {
  if (!Array.isArray(value) || value.length !== count || value.some((entry) =>
    !isBoundedInteger(entry, 1, MAX_CLASS_LEVEL))) return null;
  const levels = value.map(Number);
  return levels.reduce((sum, level) => sum + level, 0) <= MAX_TOTAL_LEVEL
    ? Object.freeze(levels)
    : null;
}

function readTable(value: unknown): AreaCreatureClassesTableBinding | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, TABLE_KEYS) ||
    value.resourceName !== "classes.2da" || typeof value.sourceObjectKey !== "string" ||
    value.sourceObjectKey.length < 1 || value.sourceObjectKey.length > 2048 ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") || !isSha256(value.sha256) ||
    !isBoundedInteger(value.sizeBytes, 1, 16 * 1024 * 1024) ||
    !isBoundedInteger(value.rowCount, 1, MAX_CLASS_ROWS)) return null;
  return Object.freeze({
    resourceName: "classes.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
  });
}

export function readAreaCreatureClassIdentityState(
  value: unknown,
): AreaCreatureClassIdentityState | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactKeys(value, BASE_KEYS);
  const bound = hasExactKeys(value, [...BASE_KEYS, "classesTable"]);
  if ((!unbound && !bound) || value.present !== true || value.nativeType !== "list" ||
    value.structTypeId !== 2 || value.classNativeType !== "int" ||
    value.levelNativeType !== "short" || !isSha256(value.classListGraphSha256) ||
    !Array.isArray(value.entries) || value.entries.length < 1 ||
    value.entries.length > MAX_CLASS_SLOTS) return null;

  const entries: AreaCreatureClassIdentityEntry[] = [];
  for (const candidate of value.entries) {
    if (!isPlainRecord(candidate) || !hasExactKeys(candidate, ENTRY_KEYS) ||
      !isBoundedInteger(candidate.classId, 0, INT_MAX) ||
      !isBoundedInteger(candidate.level, 1, MAX_CLASS_LEVEL) ||
      !isBoundedInteger(candidate.opaqueSiblingFieldCount, 0, MAX_FIELDS) ||
      !isBoundedInteger(candidate.canonicalSpellListFieldCount, 0, 28) ||
      !isBoundedInteger(candidate.spellEntryCount, 0, MAX_SPELL_ENTRIES)) return null;
    entries.push(Object.freeze({
      classId: Number(candidate.classId),
      level: Number(candidate.level),
      opaqueSiblingFieldCount: Number(candidate.opaqueSiblingFieldCount),
      canonicalSpellListFieldCount: Number(candidate.canonicalSpellListFieldCount),
      spellEntryCount: Number(candidate.spellEntryCount),
    }));
  }
  if (new Set(entries.map((entry) => entry.classId)).size !== entries.length ||
    entries.reduce((sum, entry) => sum + entry.level, 0) > MAX_TOTAL_LEVEL) return null;
  const base = Object.freeze({
    present: true as const,
    nativeType: "list" as const,
    structTypeId: 2 as const,
    classNativeType: "int" as const,
    levelNativeType: "short" as const,
    classListGraphSha256: value.classListGraphSha256,
    entries: Object.freeze(entries),
  });
  if (!bound) return base;
  const classesTable = readTable(value.classesTable);
  if (!classesTable || entries.some((entry) => entry.classId >= classesTable.rowCount)) return null;
  return Object.freeze({ ...base, classesTable });
}

export function bindEffectiveCreatureClassesTwoDaToCreatureClassIdentity(
  stateInput: unknown,
  tableInput: unknown,
): AreaCreatureClassIdentityState {
  const state = readAreaCreatureClassIdentityState(stateInput);
  if (!state) return Object.freeze({ present: false });
  if (!state.present || !isExactEffectiveCreatureClassesTwoDaTable(tableInput)) return state;
  const table: EffectiveCreatureClassesTwoDaTable = tableInput;
  const admitted = new Set(table.rows.map((row) => row.rowIndex));
  if (state.entries.some((entry) => !admitted.has(entry.classId))) return state;
  return Object.freeze({
    ...state,
    entries: Object.freeze(state.entries.map((entry) => Object.freeze({ ...entry }))),
    classesTable: Object.freeze({ ...table.descriptor }),
  });
}

export function readExistingAreaCreatureClassIdentityMutation(
  value: unknown,
): ExistingAreaCreatureClassIdentityMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    value.destructiveSpellClearConfirmed !== true || !isSha256(value.classListGraphSha256) ||
    !isSha256(value.classesTableSha256) || !isSha256(value.packagesTableSha256) ||
    !isBoundedInteger(value.classesRowCount, 1, MAX_CLASS_ROWS) ||
    !isBoundedInteger(value.packagesRowCount, 1, MAX_PACKAGE_ROWS) ||
    !isBoundedInteger(value.expectedStartingPackage, 0, BYTE_MAX) ||
    !isBoundedInteger(value.startingPackage, 0, BYTE_MAX) ||
    Number(value.expectedStartingPackage) >= Number(value.packagesRowCount) ||
    Number(value.startingPackage) >= Number(value.packagesRowCount)) return null;
  const expectedClassIds = readIds(value.expectedClassIds, undefined, Number(value.classesRowCount));
  if (!expectedClassIds) return null;
  const classIds = readIds(value.classIds, expectedClassIds.length, Number(value.classesRowCount));
  const expectedLevels = readLevels(value.expectedLevels, expectedClassIds.length);
  const levels = readLevels(value.levels, expectedClassIds.length);
  if (!classIds || !expectedLevels || !levels ||
    classIds.every((classId, index) => classId === expectedClassIds[index])) return null;
  return Object.freeze({
    expectedClassIds,
    classIds,
    expectedLevels,
    levels,
    classListGraphSha256: value.classListGraphSha256,
    destructiveSpellClearConfirmed: true,
    expectedStartingPackage: Number(value.expectedStartingPackage),
    startingPackage: Number(value.startingPackage),
    classesTableSha256: value.classesTableSha256,
    classesRowCount: Number(value.classesRowCount),
    packagesTableSha256: value.packagesTableSha256,
    packagesRowCount: Number(value.packagesRowCount),
  });
}
