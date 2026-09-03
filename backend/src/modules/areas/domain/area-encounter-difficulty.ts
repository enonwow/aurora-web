import {
  MAX_EFFECTIVE_AREA_ENCOUNTER_DIFFICULTY_ROWS,
  isExactEffectiveAreaEncounterDifficultyCatalog,
  type EffectiveAreaEncounterDifficultyCatalog,
} from "../../catalog/domain/effective-area-encounter-difficulty-two-da";

export const AREA_ENCOUNTER_DIFFICULTY_STORAGE_REVISION =
  "aurora-area-encounter-difficulty-storage.v1" as const;

export type AreaEncounterDifficultyIntStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "int"; value: number }>;

export interface AreaEncounterDifficultyStorage {
  readonly difficulty: AreaEncounterDifficultyIntStorage;
  readonly difficultyIndex: AreaEncounterDifficultyIntStorage;
}

export interface AreaEncounterDifficultyPair {
  readonly difficulty: number;
  readonly difficultyIndex: number;
}

export interface ExistingAreaEncounterDifficultyProvenance {
  readonly expectedValue: AreaEncounterDifficultyPair;
  readonly catalogSha256: string;
  readonly catalogRowCount: number;
}

export interface ExistingAreaEncounterDifficultyMutation
  extends ExistingAreaEncounterDifficultyProvenance {
  readonly value: AreaEncounterDifficultyPair;
}

export function readAreaEncounterDifficultyStorage(
  input: unknown,
): Readonly<AreaEncounterDifficultyStorage> | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, [
    "difficulty", "difficultyIndex",
  ])) return null;
  const difficulty = readIntStorage(input.difficulty);
  const difficultyIndex = readIntStorage(input.difficultyIndex);
  if (!difficulty || !difficultyIndex) return null;
  return Object.freeze({ difficulty, difficultyIndex });
}

export function bindAreaEncounterDifficultyStorageToCatalog(
  storage: AreaEncounterDifficultyStorage,
  catalog: EffectiveAreaEncounterDifficultyCatalog,
): Readonly<ExistingAreaEncounterDifficultyProvenance> | null {
  const exactStorage = readAreaEncounterDifficultyStorage(storage);
  if (!exactStorage || !isExactEffectiveAreaEncounterDifficultyCatalog(catalog) ||
      !exactStorage.difficulty.present || !exactStorage.difficultyIndex.present) {
    return null;
  }
  const difficulty = exactStorage.difficulty.value;
  const difficultyIndex = exactStorage.difficultyIndex.value;
  const row = catalog.rows[difficultyIndex];
  if (!row || row.rowIndex !== difficultyIndex || row.value !== difficulty) return null;
  return Object.freeze({
    expectedValue: freezePair({ difficulty, difficultyIndex }),
    catalogSha256: catalog.descriptor.sha256,
    catalogRowCount: catalog.descriptor.rowCount,
  });
}

export function readExistingAreaEncounterDifficultyProvenance(
  input: unknown,
): Readonly<ExistingAreaEncounterDifficultyProvenance> | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, [
    "expectedValue", "catalogSha256", "catalogRowCount",
  ]) || !isCatalogSha256(input.catalogSha256) ||
      !isCatalogRowCount(input.catalogRowCount)) return null;
  const expectedValue = readPair(input.expectedValue, input.catalogRowCount);
  if (!expectedValue) return null;
  return Object.freeze({
    expectedValue,
    catalogSha256: input.catalogSha256,
    catalogRowCount: Number(input.catalogRowCount),
  });
}

export function readExistingAreaEncounterDifficultyMutation(
  input: unknown,
): Readonly<ExistingAreaEncounterDifficultyMutation> | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, [
    "expectedValue", "value", "catalogSha256", "catalogRowCount",
  ])) return null;
  const provenance = readExistingAreaEncounterDifficultyProvenance({
    expectedValue: input.expectedValue,
    catalogSha256: input.catalogSha256,
    catalogRowCount: input.catalogRowCount,
  });
  if (!provenance) return null;
  const value = readPair(input.value, provenance.catalogRowCount);
  if (!value || pairsEqual(value, provenance.expectedValue)) return null;
  return Object.freeze({ ...provenance, value });
}

function readIntStorage(input: unknown): AreaEncounterDifficultyIntStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (hasExactKeys(input, ["present", "nativeType", "value"]) &&
      input.present === true && input.nativeType === "int" && isInt32(input.value)) {
    return Object.freeze({ present: true, nativeType: "int", value: Number(input.value) });
  }
  return null;
}

function readPair(input: unknown, rowCount: unknown): Readonly<AreaEncounterDifficultyPair> | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, [
    "difficulty", "difficultyIndex",
  ]) || !isDifficulty(input.difficulty) || !isCatalogRowCount(rowCount) ||
      !Number.isSafeInteger(input.difficultyIndex) || Number(input.difficultyIndex) < 0 ||
      Number(input.difficultyIndex) >= Number(rowCount)) return null;
  return freezePair({
    difficulty: Number(input.difficulty),
    difficultyIndex: Number(input.difficultyIndex),
  });
}

function freezePair(value: AreaEncounterDifficultyPair): Readonly<AreaEncounterDifficultyPair> {
  return Object.freeze({
    difficulty: value.difficulty,
    difficultyIndex: value.difficultyIndex,
  });
}

function pairsEqual(left: AreaEncounterDifficultyPair, right: AreaEncounterDifficultyPair): boolean {
  return left.difficulty === right.difficulty &&
    left.difficultyIndex === right.difficultyIndex;
}

function isInt32(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= -0x8000_0000 &&
    Number(value) <= 0x7fff_ffff;
}

function isDifficulty(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= -20 && Number(value) <= 20;
}

function isCatalogRowCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 &&
    Number(value) <= MAX_EFFECTIVE_AREA_ENCOUNTER_DIFFICULTY_ROWS;
}

function isCatalogSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}
