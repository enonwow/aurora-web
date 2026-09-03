import { MAX_MODULE_FACTION_COUNT } from "../../catalog/domain/module-faction-catalog";

export const AREA_ENCOUNTER_FACTION_STORAGE_REVISION =
  "aurora-area-encounter-faction-storage.v1" as const;

export type AreaEncounterFactionStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "dword"; value: number }>;

export interface ExistingAreaEncounterFactionProvenance {
  readonly expectedValue: number;
  readonly catalogSha256: string;
  readonly catalogFactionCount: number;
}

export interface ExistingAreaEncounterFactionMutation
  extends ExistingAreaEncounterFactionProvenance {
  readonly value: number;
}

export function readAreaEncounterFactionStorage(
  input: unknown,
): AreaEncounterFactionStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"])
    && input.present === true
    && input.nativeType === "dword"
    && isDword(input.value)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "dword",
      value: Number(input.value),
    });
  }
  return null;
}

export function readExistingAreaEncounterFactionProvenance(
  input: unknown,
): Readonly<ExistingAreaEncounterFactionProvenance> | null {
  if (
    !isPlainRecord(input)
    || !hasExactKeys(input, ["expectedValue", "catalogSha256", "catalogFactionCount"])
    || !isFactionCount(input.catalogFactionCount)
    || !isSelectableEncounterFactionId(input.expectedValue, input.catalogFactionCount)
    || !isCatalogSha256(input.catalogSha256)
  ) return null;
  return Object.freeze({
    expectedValue: Number(input.expectedValue),
    catalogSha256: String(input.catalogSha256),
    catalogFactionCount: Number(input.catalogFactionCount),
  });
}

export function readExistingAreaEncounterFactionMutation(
  input: unknown,
): Readonly<ExistingAreaEncounterFactionMutation> | null {
  if (
    !isPlainRecord(input)
    || !hasExactKeys(input, [
      "expectedValue", "value", "catalogSha256", "catalogFactionCount",
    ])
  ) return null;
  const provenance = readExistingAreaEncounterFactionProvenance({
    expectedValue: input.expectedValue,
    catalogSha256: input.catalogSha256,
    catalogFactionCount: input.catalogFactionCount,
  });
  if (
    !provenance
    || !isSelectableEncounterFactionId(input.value, provenance.catalogFactionCount)
    || input.value === provenance.expectedValue
  ) return null;
  return Object.freeze({ ...provenance, value: Number(input.value) });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isDword(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xffffffff;
}

function isFactionCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 2
    && Number(value) <= MAX_MODULE_FACTION_COUNT;
}

function isSelectableEncounterFactionId(value: unknown, count: unknown): value is number {
  return isFactionCount(count) && Number.isSafeInteger(value)
    && Number(value) >= 1 && Number(value) < Number(count);
}

function isCatalogSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}
