const BYTE_MAX = 0xff;
const MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_ROWS = 1_000_000;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;
const MUTATION_KEYS = ["expectedValue", "value", "tableSha256", "rowCount"] as const;
const TABLE_KEYS = [
  "resourceName",
  "sourceObjectKey",
  "sourceLayer",
  "sha256",
  "sizeBytes",
  "rowCount",
] as const;
const BOUND_TABLE_KEYS = [...TABLE_KEYS, "rowIndex"] as const;

export interface AreaCreatureGenderTable {
  readonly resourceName: "gender.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type AreaCreatureGenderStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: number;
      table?: AreaCreatureGenderTable;
    }>;

export interface ExistingAreaCreatureGenderMutation {
  readonly expectedValue: number;
  readonly value: number;
  readonly tableSha256: string;
  readonly rowCount: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isByteRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) &&
    Number(value) >= 0 &&
    Number(value) <= BYTE_MAX &&
    Number(value) < rowCount;
}

function readTableDescriptor(
  value: unknown,
): Omit<AreaCreatureGenderTable, "rowIndex"> | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, TABLE_KEYS)) return null;
  if (
    value.resourceName !== "gender.2da" ||
    typeof value.sourceObjectKey !== "string" ||
    value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") ||
    typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) ||
    !Number.isSafeInteger(value.sizeBytes) ||
    Number(value.sizeBytes) < 1 ||
    Number(value.sizeBytes) > MAX_TABLE_BYTES ||
    !Number.isSafeInteger(value.rowCount) ||
    Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_ROWS
  ) return null;
  return {
    resourceName: "gender.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
  };
}

export function readAreaCreatureGenderStorage(value: unknown): AreaCreatureGenderStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const hasUnboundKeys = hasExactKeys(value, ["present", "nativeType", "value"]);
  const hasBoundKeys = hasExactKeys(value, ["present", "nativeType", "value", "table"]);
  if (
    (!hasUnboundKeys && !hasBoundKeys) ||
    value.present !== true ||
    value.nativeType !== "byte" ||
    !Number.isSafeInteger(value.value) ||
    Number(value.value) < 0 ||
    Number(value.value) > BYTE_MAX
  ) return null;
  const base = Object.freeze({
    present: true as const,
    nativeType: "byte" as const,
    value: Number(value.value),
  });
  if (!hasBoundKeys) return base;
  const table = value.table;
  if (!isPlainRecord(table) || !hasExactKeys(table, BOUND_TABLE_KEYS)) return null;
  const descriptor = readTableDescriptor(Object.fromEntries(
    TABLE_KEYS.map((key) => [key, table[key]]),
  ));
  if (
    !descriptor ||
    !Number.isSafeInteger(table.rowIndex) ||
    Number(table.rowIndex) !== base.value ||
    !isByteRow(table.rowIndex, descriptor.rowCount)
  ) return null;
  return Object.freeze({
    ...base,
    table: Object.freeze({ ...descriptor, rowIndex: Number(table.rowIndex) }),
  });
}

export function bindEffectiveGenderTwoDaToCreatureGender(
  storage: AreaCreatureGenderStorage,
  descriptor: unknown,
): AreaCreatureGenderStorage {
  if (!storage.present || storage.nativeType !== "byte") return storage;
  const table = readTableDescriptor(descriptor);
  if (!table || !isByteRow(storage.value, table.rowCount)) return storage;
  return Object.freeze({
    ...storage,
    table: Object.freeze({ ...table, rowIndex: storage.value }),
  });
}

export function readExistingAreaCreatureGenderMutation(
  value: unknown,
): ExistingAreaCreatureGenderMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS)) return null;
  if (
    typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.rowCount) ||
    Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_EFFECTIVE_CREATURE_GENDER_TWO_DA_ROWS ||
    !isByteRow(value.expectedValue, Number(value.rowCount)) ||
    !isByteRow(value.value, Number(value.rowCount)) ||
    value.expectedValue === value.value
  ) return null;
  return Object.freeze({
    expectedValue: Number(value.expectedValue),
    value: Number(value.value),
    tableSha256: value.tableSha256,
    rowCount: Number(value.rowCount),
  });
}
