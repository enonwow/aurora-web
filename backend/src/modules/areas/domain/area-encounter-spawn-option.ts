export const AREA_ENCOUNTER_SPAWN_OPTION_STORAGE_REVISION =
  "aurora-area-encounter-spawn-option-storage.v1" as const;

export const AREA_ENCOUNTER_SPAWN_OPTION_CONTINUOUS = 0 as const;
export const AREA_ENCOUNTER_SPAWN_OPTION_SINGLE_SHOT = 1 as const;

const STORAGE_KEYS = Object.freeze(["spawnOption"]);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"]);

export type AreaEncounterSpawnOption =
  | typeof AREA_ENCOUNTER_SPAWN_OPTION_CONTINUOUS
  | typeof AREA_ENCOUNTER_SPAWN_OPTION_SINGLE_SHOT;

export interface AreaEncounterSpawnOptionStorage {
  readonly spawnOption: AreaEncounterSpawnOption;
}

export interface ExistingAreaEncounterSpawnOptionMutation {
  readonly expectedValue: AreaEncounterSpawnOptionStorage;
  readonly value: AreaEncounterSpawnOptionStorage;
}

export function readAreaEncounterSpawnOptionStorage(
  value: unknown,
): AreaEncounterSpawnOptionStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isSpawnOption(value.spawnOption)) {
    return null;
  }
  return Object.freeze({ spawnOption: value.spawnOption });
}

export function areaEncounterSpawnOptionStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readAreaEncounterSpawnOptionStorage(left);
  const admittedRight = readAreaEncounterSpawnOptionStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.spawnOption === admittedRight.spawnOption;
}

export function readExistingAreaEncounterSpawnOptionMutation(
  value: unknown,
): ExistingAreaEncounterSpawnOptionMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  const expectedValue = readAreaEncounterSpawnOptionStorage(value.expectedValue);
  const targetValue = readAreaEncounterSpawnOptionStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaEncounterSpawnOptionStoragesEqual(expectedValue, targetValue)
  ) {
    return null;
  }
  return Object.freeze({ expectedValue, value: targetValue });
}

function isSpawnOption(value: unknown): value is AreaEncounterSpawnOption {
  return value === AREA_ENCOUNTER_SPAWN_OPTION_CONTINUOUS
    || value === AREA_ENCOUNTER_SPAWN_OPTION_SINGLE_SHOT;
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
