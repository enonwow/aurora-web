export const MAX_EFFECTIVE_TRAPS_TWO_DA_ROWS = 256;

const MUTATION_KEYS = [
  "expectedValue",
  "value",
  "tableSha256",
  "tableRowCount",
] as const;

export interface ExistingAreaPlaceableTrapTypeMutation {
  readonly expectedValue: number;
  readonly value: number;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}

export interface ExistingAreaPlaceableTrapTypeProvenance {
  readonly expectedValue: number;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isPhysicalTrapRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= 0xff &&
    (value as number) < rowCount;
}

export function readExistingAreaPlaceableTrapTypeProvenance(
  value: unknown,
): ExistingAreaPlaceableTrapTypeProvenance | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "expectedValue", "tableSha256", "tableRowCount",
  ]) || typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.tableRowCount) ||
    (value.tableRowCount as number) < 1 ||
    (value.tableRowCount as number) > MAX_EFFECTIVE_TRAPS_TWO_DA_ROWS ||
    !isPhysicalTrapRow(value.expectedValue, value.tableRowCount as number)) return null;
  return Object.freeze({
    expectedValue: value.expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount as number,
  });
}

export function readExistingAreaPlaceableTrapTypeMutation(
  value: unknown,
): ExistingAreaPlaceableTrapTypeMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS)) return null;
  const provenance = readExistingAreaPlaceableTrapTypeProvenance({
    expectedValue: value.expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
  if (!provenance || !isPhysicalTrapRow(value.value, provenance.tableRowCount) ||
    provenance.expectedValue === value.value) return null;
  return Object.freeze({
    expectedValue: provenance.expectedValue,
    value: value.value,
    tableSha256: provenance.tableSha256,
    tableRowCount: provenance.tableRowCount,
  });
}
