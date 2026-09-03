export const MAX_EFFECTIVE_BODYBAG_TWO_DA_ROWS = 256;

export interface ExistingAreaPlaceableBodyBagMutation {
  readonly expectedValue: number;
  readonly value: number;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}

export interface ExistingAreaPlaceableBodyBagProvenance {
  readonly expectedValue: number;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isPhysicalRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xff &&
    Number(value) < rowCount;
}

export function readExistingAreaPlaceableBodyBagProvenance(
  value: unknown,
): ExistingAreaPlaceableBodyBagProvenance | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "expectedValue", "tableSha256", "tableRowCount",
  ]) || typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.tableRowCount) || Number(value.tableRowCount) < 1 ||
    Number(value.tableRowCount) > MAX_EFFECTIVE_BODYBAG_TWO_DA_ROWS ||
    !isPhysicalRow(value.expectedValue, Number(value.tableRowCount))) return null;
  return Object.freeze({
    expectedValue: value.expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  }) as ExistingAreaPlaceableBodyBagProvenance;
}

export function readExistingAreaPlaceableBodyBagMutation(
  value: unknown,
): ExistingAreaPlaceableBodyBagMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "expectedValue", "value", "tableSha256", "tableRowCount",
  ])) return null;
  const provenance = readExistingAreaPlaceableBodyBagProvenance({
    expectedValue: value.expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
  if (!provenance || !isPhysicalRow(value.value, provenance.tableRowCount) ||
    provenance.expectedValue === value.value) return null;
  return Object.freeze({
    expectedValue: provenance.expectedValue,
    value: value.value,
    tableSha256: provenance.tableSha256,
    tableRowCount: provenance.tableRowCount,
  });
}
