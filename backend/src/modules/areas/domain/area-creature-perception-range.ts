import {
  isCreaturePerceptionRangeRowIndex,
  isExactEffectiveCreaturePerceptionRangesTwoDaTable,
  type EffectiveCreaturePerceptionRangesTwoDaTable,
} from "../../catalog/domain/effective-creature-perception-ranges-two-da";

const BYTE_MAX = 0xff;
const MAX_ROWS = 1_000_000;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;
const MUTATION_KEYS = ["expectedValue", "value", "tableSha256", "rowCount"] as const;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const BOUND_TABLE_KEYS = [...TABLE_KEYS, "rowIndex"] as const;

export interface AreaCreaturePerceptionRangeTable {
  readonly resourceName: "ranges.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: 8 | 9 | 10 | 11;
}

export type AreaCreaturePerceptionRangeStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: number;
      table?: AreaCreaturePerceptionRangeTable;
    }>;

export interface ExistingAreaCreaturePerceptionRangeMutation {
  readonly expectedValue: 8 | 9 | 10 | 11;
  readonly value: 8 | 9 | 10 | 11;
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

function readTableDescriptor(
  value: unknown,
): Omit<AreaCreaturePerceptionRangeTable, "rowIndex"> | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, TABLE_KEYS)) return null;
  if (value.resourceName !== "ranges.2da" ||
    typeof value.sourceObjectKey !== "string" || value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") ||
    typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.sha256) ||
    !Number.isSafeInteger(value.sizeBytes) || Number(value.sizeBytes) < 1 ||
    Number(value.sizeBytes) > MAX_TABLE_BYTES || !Number.isSafeInteger(value.rowCount) ||
    Number(value.rowCount) < 1 || Number(value.rowCount) > MAX_ROWS) return null;
  return {
    resourceName: "ranges.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
  };
}

export function readAreaCreaturePerceptionRangeStorage(
  value: unknown,
): AreaCreaturePerceptionRangeStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactKeys(value, ["present", "nativeType", "value"]);
  const bound = hasExactKeys(value, ["present", "nativeType", "value", "table"]);
  if ((!unbound && !bound) || value.present !== true || value.nativeType !== "byte" ||
    !isByte(value.value)) return null;
  const base = Object.freeze({
    present: true as const,
    nativeType: "byte" as const,
    value: Number(value.value),
  });
  if (!bound) return base;
  const rawTable = value.table;
  if (!isPlainRecord(rawTable) || !hasExactKeys(rawTable, BOUND_TABLE_KEYS)) return null;
  const descriptor = readTableDescriptor(Object.fromEntries(
    TABLE_KEYS.map((key) => [key, rawTable[key]]),
  ));
  if (!descriptor || !isCreaturePerceptionRangeRowIndex(rawTable.rowIndex) ||
    rawTable.rowIndex !== base.value || Number(rawTable.rowIndex) >= descriptor.rowCount) {
    return null;
  }
  return Object.freeze({
    ...base,
    table: Object.freeze({ ...descriptor, rowIndex: rawTable.rowIndex }),
  });
}

export function bindEffectiveRangesTwoDaToCreaturePerceptionRange(
  storage: AreaCreaturePerceptionRangeStorage,
  tableInput: unknown,
): AreaCreaturePerceptionRangeStorage {
  if (!storage.present || !isCreaturePerceptionRangeRowIndex(storage.value) ||
    !isExactEffectiveCreaturePerceptionRangesTwoDaTable(tableInput)) return storage;
  const table: EffectiveCreaturePerceptionRangesTwoDaTable = tableInput;
  if (!table.rows.some((row) => row.rowIndex === storage.value)) return storage;
  return Object.freeze({
    ...storage,
    table: Object.freeze({ ...table.descriptor, rowIndex: storage.value }),
  });
}

export function readExistingAreaCreaturePerceptionRangeMutation(
  value: unknown,
): ExistingAreaCreaturePerceptionRangeMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS)) return null;
  if (typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_ROWS ||
    !isCreaturePerceptionRangeRowIndex(value.expectedValue) ||
    !isCreaturePerceptionRangeRowIndex(value.value) ||
    Number(value.expectedValue) >= Number(value.rowCount) ||
    Number(value.value) >= Number(value.rowCount) || value.expectedValue === value.value) return null;
  return Object.freeze({
    expectedValue: value.expectedValue,
    value: value.value,
    tableSha256: value.tableSha256,
    rowCount: Number(value.rowCount),
  });
}
