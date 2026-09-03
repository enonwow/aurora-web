const INT_MIN = -0x8000_0000;
const INT_MAX = 0x7fff_ffff;
const BYTE_MAX = 0xff;
const WORD_MAX = 0xffff;
const MAX_EFFECTIVE_TWO_DA_ROWS = 1_000_000;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_LENGTH = 2048;
const MUTATION_KEYS = [
  "expectedValue",
  "value",
  "tableSha256",
  "rowCount",
  "appearanceExpectedValue",
  "appearanceTableSha256",
  "appearanceRowCount",
] as const;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const BOUND_TABLE_KEYS = [...TABLE_KEYS, "rowIndex"] as const;

export interface AreaCreaturePhenotypeTable {
  readonly resourceName: "phenotype.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type AreaCreaturePhenotypeStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "int";
      value: number;
      table?: AreaCreaturePhenotypeTable;
    }>;

export interface ExistingAreaCreaturePhenotypeMutation {
  readonly expectedValue: number;
  readonly value: number;
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly appearanceExpectedValue: number;
  readonly appearanceTableSha256: string;
  readonly appearanceRowCount: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function isNativeInt(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= INT_MIN && Number(value) <= INT_MAX;
}

function isPhenotypeRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= BYTE_MAX &&
    Number(value) !== 1 && Number(value) < rowCount;
}

function isAppearanceRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= WORD_MAX &&
    Number(value) < rowCount;
}

function readTableDescriptor(
  value: unknown,
): Omit<AreaCreaturePhenotypeTable, "rowIndex"> | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, TABLE_KEYS)) return null;
  if (
    value.resourceName !== "phenotype.2da" ||
    typeof value.sourceObjectKey !== "string" ||
    value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_LENGTH ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") ||
    !isSha256(value.sha256) ||
    !Number.isSafeInteger(value.sizeBytes) ||
    Number(value.sizeBytes) < 1 ||
    Number(value.sizeBytes) > MAX_TABLE_BYTES ||
    !Number.isSafeInteger(value.rowCount) ||
    Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_EFFECTIVE_TWO_DA_ROWS
  ) return null;
  return {
    resourceName: "phenotype.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
  };
}

export function readAreaCreaturePhenotypeStorage(
  value: unknown,
): AreaCreaturePhenotypeStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const hasUnboundKeys = hasExactKeys(value, ["present", "nativeType", "value"]);
  const hasBoundKeys = hasExactKeys(value, ["present", "nativeType", "value", "table"]);
  if (
    (!hasUnboundKeys && !hasBoundKeys) ||
    value.present !== true ||
    value.nativeType !== "int" ||
    !isNativeInt(value.value)
  ) return null;
  const base = Object.freeze({
    present: true as const,
    nativeType: "int" as const,
    value: Number(value.value),
  });
  if (!hasBoundKeys) return base;
  const table = value.table;
  if (!isPlainRecord(table) || !hasExactKeys(table, BOUND_TABLE_KEYS)) return null;
  const descriptor = readTableDescriptor(Object.fromEntries(
    TABLE_KEYS.map((key) => [key, table[key]]),
  ));
  if (!descriptor || Number(table.rowIndex) !== base.value ||
    !isPhenotypeRow(table.rowIndex, descriptor.rowCount)) return null;
  return Object.freeze({
    ...base,
    table: Object.freeze({ ...descriptor, rowIndex: Number(table.rowIndex) }),
  });
}

export function bindEffectivePhenotypeTwoDaToCreaturePhenotype(
  storage: AreaCreaturePhenotypeStorage,
  descriptor: unknown,
): AreaCreaturePhenotypeStorage {
  if (!storage.present || storage.nativeType !== "int") return storage;
  const table = readTableDescriptor(descriptor);
  if (!table || !isPhenotypeRow(storage.value, table.rowCount)) return storage;
  return Object.freeze({
    ...storage,
    table: Object.freeze({ ...table, rowIndex: storage.value }),
  });
}

export function readExistingAreaCreaturePhenotypeMutation(
  value: unknown,
): ExistingAreaCreaturePhenotypeMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS)) return null;
  if (
    !isSha256(value.tableSha256) ||
    !isSha256(value.appearanceTableSha256) ||
    !Number.isSafeInteger(value.rowCount) ||
    Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_EFFECTIVE_TWO_DA_ROWS ||
    !Number.isSafeInteger(value.appearanceRowCount) ||
    Number(value.appearanceRowCount) < 1 ||
    Number(value.appearanceRowCount) > MAX_EFFECTIVE_TWO_DA_ROWS ||
    !isPhenotypeRow(value.expectedValue, Number(value.rowCount)) ||
    !isPhenotypeRow(value.value, Number(value.rowCount)) ||
    !isAppearanceRow(value.appearanceExpectedValue, Number(value.appearanceRowCount)) ||
    value.expectedValue === value.value
  ) return null;
  return Object.freeze({
    expectedValue: Number(value.expectedValue),
    value: Number(value.value),
    tableSha256: value.tableSha256,
    rowCount: Number(value.rowCount),
    appearanceExpectedValue: Number(value.appearanceExpectedValue),
    appearanceTableSha256: value.appearanceTableSha256,
    appearanceRowCount: Number(value.appearanceRowCount),
  });
}
