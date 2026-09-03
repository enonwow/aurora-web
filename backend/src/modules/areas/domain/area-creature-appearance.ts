const WORD_MAX = 0xffff;
const MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_ROWS = 1_000_000;
const MUTATION_KEYS = [
  "expectedValue",
  "value",
  "tableSha256",
  "rowCount",
] as const;
const TABLE_KEYS = [
  "resourceName",
  "sourceObjectKey",
  "sourceLayer",
  "sha256",
  "sizeBytes",
  "rowCount",
] as const;
const BOUND_TABLE_KEYS = [...TABLE_KEYS, "rowIndex"] as const;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;

export interface AreaCreatureAppearanceTable {
  readonly resourceName: "appearance.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type AreaCreatureAppearanceStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "word";
      value: number;
      table?: AreaCreatureAppearanceTable;
    }>;

export interface ExistingAreaCreatureAppearanceMutation {
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

function hasExactMutationKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length === MUTATION_KEYS.length && MUTATION_KEYS.every((key) => keys.includes(key));
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

export function readAreaCreatureAppearanceStorage(
  value: unknown,
): AreaCreatureAppearanceStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const hasUnboundKeys = hasExactKeys(value, ["present", "nativeType", "value"]);
  const hasBoundKeys = hasExactKeys(value, ["present", "nativeType", "value", "table"]);
  if (
    (!hasUnboundKeys && !hasBoundKeys) ||
    value.present !== true ||
    value.nativeType !== "word" ||
    !Number.isSafeInteger(value.value) ||
    (value.value as number) < 0 ||
    (value.value as number) > WORD_MAX
  ) {
    return null;
  }
  const base = {
    present: true,
    nativeType: "word" as const,
    value: value.value as number,
  };
  if (!hasBoundKeys) return Object.freeze(base);
  const tableRecord = value.table;
  if (!isPlainRecord(tableRecord) || !hasExactKeys(tableRecord, BOUND_TABLE_KEYS)) return null;
  const descriptor = readTableDescriptor(Object.fromEntries(
    TABLE_KEYS.map((key) => [key, tableRecord[key]]),
  ));
  if (
    !descriptor ||
    !Number.isSafeInteger(tableRecord.rowIndex) ||
    tableRecord.rowIndex !== base.value ||
    (tableRecord.rowIndex as number) < 0 ||
    (tableRecord.rowIndex as number) > WORD_MAX ||
    (tableRecord.rowIndex as number) >= descriptor.rowCount
  ) {
    return null;
  }
  return Object.freeze({
    ...base,
    table: Object.freeze({ ...descriptor, rowIndex: tableRecord.rowIndex as number }),
  });
}

function readTableDescriptor(
  value: unknown,
): Omit<AreaCreatureAppearanceTable, "rowIndex"> | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, TABLE_KEYS)) return null;
  if (
    value.resourceName !== "appearance.2da" ||
    typeof value.sourceObjectKey !== "string" ||
    value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") ||
    typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) ||
    !Number.isSafeInteger(value.sizeBytes) ||
    (value.sizeBytes as number) < 1 ||
    (value.sizeBytes as number) > MAX_TABLE_BYTES ||
    !Number.isSafeInteger(value.rowCount) ||
    (value.rowCount as number) < 1 ||
    (value.rowCount as number) > MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_ROWS
  ) {
    return null;
  }
  return {
    resourceName: "appearance.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: value.sizeBytes as number,
    rowCount: value.rowCount as number,
  };
}

export function bindEffectiveAppearanceTwoDaToCreatureAppearance(
  storage: AreaCreatureAppearanceStorage,
  descriptor: unknown,
): AreaCreatureAppearanceStorage {
  if (!storage.present || storage.nativeType !== "word") return storage;
  const table = readTableDescriptor(descriptor);
  if (!table || storage.value >= table.rowCount) return storage;
  return Object.freeze({
    ...storage,
    table: Object.freeze({
      ...table,
      rowIndex: storage.value,
    }),
  });
}

function isWordRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= WORD_MAX &&
    (value as number) < rowCount;
}

export function readExistingAreaCreatureAppearanceMutation(
  value: unknown,
): ExistingAreaCreatureAppearanceMutation | null {
  if (!isPlainRecord(value) || !hasExactMutationKeys(value)) return null;
  if (
    typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.rowCount) ||
    (value.rowCount as number) < 1 ||
    (value.rowCount as number) > MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_ROWS ||
    !isWordRow(value.expectedValue, value.rowCount as number) ||
    !isWordRow(value.value, value.rowCount as number) ||
    value.expectedValue === value.value
  ) {
    return null;
  }
  return Object.freeze({
    expectedValue: value.expectedValue,
    value: value.value,
    tableSha256: value.tableSha256,
    rowCount: value.rowCount as number,
  });
}
