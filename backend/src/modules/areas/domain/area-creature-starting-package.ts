import {
  isCreatureStartingPackageRowIndex,
  isExactEffectiveCreatureStartingPackagesTwoDaTable,
  type EffectiveCreatureStartingPackagesTwoDaTable,
} from "../../catalog/domain/effective-creature-starting-packages-two-da";

const BYTE_MAX = 0xff;
const INT_MAX = 0x7fff_ffff;
const MAX_CLASS_IDS = 8;
const MAX_ROWS = 256;
const MAX_TABLE_BYTES = 16 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;
const MUTATION_KEYS = [
  "expectedValue", "value", "expectedClassIds", "tableSha256", "rowCount",
] as const;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const BOUND_TABLE_KEYS = [...TABLE_KEYS, "rowIndex", "classId"] as const;

export interface AreaCreatureStartingPackageTable {
  readonly resourceName: "packages.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly classId: number;
}

export type AreaCreatureStartingPackageStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: number;
      classIds?: readonly number[];
      table?: AreaCreatureStartingPackageTable;
    }>;

export interface ExistingAreaCreatureStartingPackageMutation {
  readonly expectedValue: number;
  readonly value: number;
  readonly expectedClassIds: readonly number[];
  readonly tableSha256: string;
  readonly rowCount: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isByte(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= BYTE_MAX;
}

function readClassIds(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CLASS_IDS ||
    value.some((entry) => !Number.isSafeInteger(entry) || Number(entry) < 0 ||
      Number(entry) > INT_MAX)) return null;
  const classIds = value.map(Number);
  if (new Set(classIds).size !== classIds.length) return null;
  return Object.freeze(classIds);
}

function readDescriptor(
  value: unknown,
): Omit<AreaCreatureStartingPackageTable, "rowIndex" | "classId"> | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, TABLE_KEYS)) return null;
  if (value.resourceName !== "packages.2da" ||
    typeof value.sourceObjectKey !== "string" || value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") || typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) || !Number.isSafeInteger(value.sizeBytes) ||
    Number(value.sizeBytes) < 1 || Number(value.sizeBytes) > MAX_TABLE_BYTES ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_ROWS) return null;
  return {
    resourceName: "packages.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
  };
}

export function readAreaCreatureStartingPackageStorage(
  value: unknown,
): AreaCreatureStartingPackageStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactKeys(value, ["present", "nativeType", "value"]);
  const withClasses = hasExactKeys(value, ["present", "nativeType", "value", "classIds"]);
  const bound = hasExactKeys(value, ["present", "nativeType", "value", "classIds", "table"]);
  if ((!unbound && !withClasses && !bound) || value.present !== true ||
    value.nativeType !== "byte" || !isByte(value.value)) return null;
  const base = Object.freeze({
    present: true as const,
    nativeType: "byte" as const,
    value: Number(value.value),
  });
  if (unbound) return base;
  const classIds = readClassIds(value.classIds);
  if (!classIds) return null;
  const withClassIds = Object.freeze({ ...base, classIds });
  if (!bound) return withClassIds;
  const rawTable = value.table;
  if (!isPlainRecord(rawTable) || !hasExactKeys(rawTable, BOUND_TABLE_KEYS)) return null;
  const descriptor = readDescriptor(Object.fromEntries(
    TABLE_KEYS.map((key) => [key, rawTable[key]]),
  ));
  if (!descriptor || !isCreatureStartingPackageRowIndex(rawTable.rowIndex, descriptor.rowCount) ||
    rawTable.rowIndex !== base.value || !Number.isSafeInteger(rawTable.classId) ||
    Number(rawTable.classId) < 0 || Number(rawTable.classId) > INT_MAX ||
    !classIds.includes(Number(rawTable.classId))) return null;
  return Object.freeze({
    ...withClassIds,
    table: Object.freeze({
      ...descriptor,
      rowIndex: Number(rawTable.rowIndex),
      classId: Number(rawTable.classId),
    }),
  });
}

export function bindEffectiveCreatureStartingPackagesTwoDaToCreatureStartingPackage(
  storage: AreaCreatureStartingPackageStorage,
  tableInput: unknown,
): AreaCreatureStartingPackageStorage {
  if (!storage.present || !storage.classIds ||
    !isExactEffectiveCreatureStartingPackagesTwoDaTable(tableInput)) return storage;
  const table: EffectiveCreatureStartingPackagesTwoDaTable = tableInput;
  const row = table.rows.find((candidate) =>
    candidate.rowIndex === storage.value && storage.classIds!.includes(candidate.classId));
  if (!row) return storage;
  return Object.freeze({
    ...storage,
    classIds: Object.freeze([...storage.classIds]),
    table: Object.freeze({ ...table.descriptor, rowIndex: row.rowIndex, classId: row.classId }),
  });
}

export function readExistingAreaCreatureStartingPackageMutation(
  value: unknown,
): ExistingAreaCreatureStartingPackageMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    typeof value.tableSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_ROWS ||
    !isCreatureStartingPackageRowIndex(value.expectedValue, Number(value.rowCount)) ||
    !isCreatureStartingPackageRowIndex(value.value, Number(value.rowCount)) ||
    value.expectedValue === value.value) return null;
  const expectedClassIds = readClassIds(value.expectedClassIds);
  if (!expectedClassIds) return null;
  return Object.freeze({
    expectedValue: Number(value.expectedValue),
    value: Number(value.value),
    expectedClassIds,
    tableSha256: value.tableSha256,
    rowCount: Number(value.rowCount),
  });
}
