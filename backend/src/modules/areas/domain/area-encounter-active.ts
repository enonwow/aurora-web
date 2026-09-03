export const AREA_ENCOUNTER_ACTIVE_STORAGE_REVISION =
  "aurora-area-encounter-active-storage.v1" as const;

const STORAGE_KEYS = Object.freeze(["activeByte"]);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"]);

export interface AreaEncounterActiveStorage {
  readonly activeByte: 0 | 1;
}

export interface ExistingAreaEncounterActiveMutation {
  readonly expectedValue: AreaEncounterActiveStorage;
  readonly value: AreaEncounterActiveStorage;
}

export function readAreaEncounterActiveStorage(
  value: unknown,
): AreaEncounterActiveStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isActiveByte(value.activeByte)) return null;
  return Object.freeze({ activeByte: value.activeByte });
}

export function areaEncounterActiveStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readAreaEncounterActiveStorage(left);
  const admittedRight = readAreaEncounterActiveStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.activeByte === admittedRight.activeByte;
}

export function readExistingAreaEncounterActiveMutation(
  value: unknown,
): ExistingAreaEncounterActiveMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  const expectedValue = readAreaEncounterActiveStorage(value.expectedValue);
  const targetValue = readAreaEncounterActiveStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaEncounterActiveStoragesEqual(expectedValue, targetValue)
  ) {
    return null;
  }
  return Object.freeze({ expectedValue, value: targetValue });
}

function isActiveByte(value: unknown): value is 0 | 1 {
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
