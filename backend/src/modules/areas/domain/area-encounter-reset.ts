export const AREA_ENCOUNTER_RESET_STORAGE_REVISION =
  "aurora-area-encounter-reset-storage.v1" as const;

const STORAGE_KEYS = Object.freeze(["resetByte"]);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"]);

export interface AreaEncounterResetStorage {
  readonly resetByte: 0 | 1;
}

export interface ExistingAreaEncounterResetMutation {
  readonly expectedValue: AreaEncounterResetStorage;
  readonly value: AreaEncounterResetStorage;
}

export function readAreaEncounterResetStorage(
  value: unknown,
): AreaEncounterResetStorage | null {
  if (
    !isExactRecord(value, STORAGE_KEYS)
    || !isResetByte(value.resetByte)
  ) {
    return null;
  }
  return Object.freeze({ resetByte: value.resetByte });
}

export function areaEncounterResetStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readAreaEncounterResetStorage(left);
  const admittedRight = readAreaEncounterResetStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.resetByte === admittedRight.resetByte;
}

export function readExistingAreaEncounterResetMutation(
  value: unknown,
): ExistingAreaEncounterResetMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  const expectedValue = readAreaEncounterResetStorage(value.expectedValue);
  const targetValue = readAreaEncounterResetStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaEncounterResetStoragesEqual(expectedValue, targetValue)
  ) {
    return null;
  }
  return Object.freeze({ expectedValue, value: targetValue });
}

function isResetByte(value: unknown): value is 0 | 1 {
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
