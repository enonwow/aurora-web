export const AREA_ENCOUNTER_CREATURE_COUNTS_STORAGE_REVISION =
  "aurora-area-encounter-creature-counts-storage.v1" as const;

export const AREA_ENCOUNTER_CREATURE_COUNT_MIN = 1;
export const AREA_ENCOUNTER_CREATURE_COUNT_MAX = 8;

const STORAGE_KEYS = Object.freeze(["maxCreatures", "recCreatures"]);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"]);

export interface AreaEncounterCreatureCountStorage {
  readonly maxCreatures: number;
  readonly recCreatures: number;
}

export interface ExistingAreaEncounterCreatureCountMutation {
  readonly expectedValue: AreaEncounterCreatureCountStorage;
  readonly value: AreaEncounterCreatureCountStorage;
}

export function readAreaEncounterCreatureCountStorage(
  value: unknown,
): AreaEncounterCreatureCountStorage | null {
  if (
    !isExactRecord(value, STORAGE_KEYS)
    || !isCreatureCount(value.maxCreatures)
    || !isCreatureCount(value.recCreatures)
    || Number(value.recCreatures) > Number(value.maxCreatures)
  ) return null;
  return Object.freeze({
    maxCreatures: Number(value.maxCreatures),
    recCreatures: Number(value.recCreatures),
  });
}

export function areaEncounterCreatureCountStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readAreaEncounterCreatureCountStorage(left);
  const admittedRight = readAreaEncounterCreatureCountStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.maxCreatures === admittedRight.maxCreatures
    && admittedLeft.recCreatures === admittedRight.recCreatures;
}

export function readExistingAreaEncounterCreatureCountMutation(
  value: unknown,
): ExistingAreaEncounterCreatureCountMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  const expectedValue = readAreaEncounterCreatureCountStorage(value.expectedValue);
  const targetValue = readAreaEncounterCreatureCountStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaEncounterCreatureCountStoragesEqual(expectedValue, targetValue)
  ) return null;
  return Object.freeze({ expectedValue, value: targetValue });
}

function isCreatureCount(value: unknown): value is number {
  return Number.isInteger(value)
    && Number(value) >= AREA_ENCOUNTER_CREATURE_COUNT_MIN
    && Number(value) <= AREA_ENCOUNTER_CREATURE_COUNT_MAX;
}

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
