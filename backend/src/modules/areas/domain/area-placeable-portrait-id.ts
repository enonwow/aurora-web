import { MAX_EFFECTIVE_PORTRAITS_TWO_DA_ROWS } from "../../catalog/domain/effective-portraits-two-da";

export interface ExistingAreaPlaceablePortraitProvenance {
  expectedValue: number;
  tableSha256: string;
  tableRowCount: number;
}

export interface ExistingAreaPlaceablePortraitMutation
  extends ExistingAreaPlaceablePortraitProvenance {
  value: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isWord(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff;
}

function isTableRowCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 &&
    Number(value) <= MAX_EFFECTIVE_PORTRAITS_TWO_DA_ROWS;
}

function isTableSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

export function readExistingAreaPlaceablePortraitProvenance(
  value: unknown,
): Readonly<ExistingAreaPlaceablePortraitProvenance> | null {
  if (!isPlainRecord(value) ||
    !hasExactKeys(value, ["expectedValue", "tableSha256", "tableRowCount"]) ||
    !isWord(value.expectedValue) || !isTableSha256(value.tableSha256) ||
    !isTableRowCount(value.tableRowCount) || value.expectedValue >= value.tableRowCount) return null;
  return Object.freeze({
    expectedValue: value.expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
}

export function readExistingAreaPlaceablePortraitMutation(
  value: unknown,
): Readonly<ExistingAreaPlaceablePortraitMutation> | null {
  if (!isPlainRecord(value) ||
    !hasExactKeys(value, ["expectedValue", "value", "tableSha256", "tableRowCount"]) ||
    !isWord(value.expectedValue) || !isWord(value.value) ||
    !isTableSha256(value.tableSha256) || !isTableRowCount(value.tableRowCount) ||
    value.expectedValue >= value.tableRowCount || value.value >= value.tableRowCount ||
    value.expectedValue === value.value) return null;
  return Object.freeze({
    expectedValue: value.expectedValue,
    value: value.value,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
}
