import { MAX_MODULE_FACTION_COUNT } from "../../catalog/domain/module-faction-catalog";

export interface ExistingAreaPlaceableFactionProvenance {
  expectedValue: number;
  catalogSha256: string;
  catalogFactionCount: number;
}

export interface ExistingAreaPlaceableFactionMutation
  extends ExistingAreaPlaceableFactionProvenance {
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

function isFactionCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 &&
    Number(value) <= MAX_MODULE_FACTION_COUNT;
}

function isCatalogSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function isFactionId(value: unknown, count: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) < count;
}

export function readExistingAreaPlaceableFactionProvenance(
  value: unknown,
): Readonly<ExistingAreaPlaceableFactionProvenance> | null {
  if (!isPlainRecord(value) ||
    !hasExactKeys(value, ["expectedValue", "catalogSha256", "catalogFactionCount"]) ||
    !isFactionCount(value.catalogFactionCount) ||
    !isFactionId(value.expectedValue, value.catalogFactionCount) ||
    !isCatalogSha256(value.catalogSha256)) return null;
  return Object.freeze({
    expectedValue: value.expectedValue,
    catalogSha256: value.catalogSha256,
    catalogFactionCount: value.catalogFactionCount,
  });
}

export function readExistingAreaPlaceableFactionMutation(
  value: unknown,
): Readonly<ExistingAreaPlaceableFactionMutation> | null {
  if (!isPlainRecord(value) ||
    !hasExactKeys(value, ["expectedValue", "value", "catalogSha256", "catalogFactionCount"]) ||
    !isFactionCount(value.catalogFactionCount) ||
    !isFactionId(value.expectedValue, value.catalogFactionCount) ||
    !isFactionId(value.value, value.catalogFactionCount) ||
    !isCatalogSha256(value.catalogSha256) || value.expectedValue === value.value) return null;
  return Object.freeze({
    expectedValue: value.expectedValue,
    value: value.value,
    catalogSha256: value.catalogSha256,
    catalogFactionCount: value.catalogFactionCount,
  });
}
