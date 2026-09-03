export const AREA_ENCOUNTER_PLAYER_ONLY_STORAGE_REVISION =
  "aurora-area-encounter-player-only-storage.v1" as const;

const STORAGE_KEYS = Object.freeze(["playerOnlyByte"]);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"]);

export interface AreaEncounterPlayerOnlyStorage {
  readonly playerOnlyByte: 0 | 1;
}

export interface ExistingAreaEncounterPlayerOnlyMutation {
  readonly expectedValue: AreaEncounterPlayerOnlyStorage;
  readonly value: AreaEncounterPlayerOnlyStorage;
}

export function readAreaEncounterPlayerOnlyStorage(
  value: unknown,
): AreaEncounterPlayerOnlyStorage | null {
  if (
    !isExactRecord(value, STORAGE_KEYS)
    || !isPlayerOnlyByte(value.playerOnlyByte)
  ) {
    return null;
  }
  return Object.freeze({ playerOnlyByte: value.playerOnlyByte });
}

export function areaEncounterPlayerOnlyStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readAreaEncounterPlayerOnlyStorage(left);
  const admittedRight = readAreaEncounterPlayerOnlyStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.playerOnlyByte === admittedRight.playerOnlyByte;
}

export function readExistingAreaEncounterPlayerOnlyMutation(
  value: unknown,
): ExistingAreaEncounterPlayerOnlyMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  const expectedValue = readAreaEncounterPlayerOnlyStorage(value.expectedValue);
  const targetValue = readAreaEncounterPlayerOnlyStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaEncounterPlayerOnlyStoragesEqual(expectedValue, targetValue)
  ) {
    return null;
  }
  return Object.freeze({ expectedValue, value: targetValue });
}

function isPlayerOnlyByte(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
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
