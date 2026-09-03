export const AREA_ENCOUNTER_RESET_TIME_STORAGE_REVISION =
  "aurora-area-encounter-reset-time-storage.v1" as const;

export const AREA_ENCOUNTER_RESET_TIME_MIN = 1;
export const AREA_ENCOUNTER_RESET_TIME_MAX = 32_000;

const STORAGE_KEYS = Object.freeze(["resetTime"]);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"]);

export interface AreaEncounterResetTimeStorage {
  readonly resetTime: number;
}

export interface ExistingAreaEncounterResetTimeMutation {
  readonly expectedValue: AreaEncounterResetTimeStorage;
  readonly value: AreaEncounterResetTimeStorage;
}

export function readAreaEncounterResetTimeStorage(
  value: unknown,
): AreaEncounterResetTimeStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isResetTime(value.resetTime)) {
    return null;
  }
  return Object.freeze({ resetTime: value.resetTime });
}

export function areaEncounterResetTimeStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readAreaEncounterResetTimeStorage(left);
  const admittedRight = readAreaEncounterResetTimeStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.resetTime === admittedRight.resetTime;
}

export function readExistingAreaEncounterResetTimeMutation(
  value: unknown,
): ExistingAreaEncounterResetTimeMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  const expectedValue = readAreaEncounterResetTimeStorage(value.expectedValue);
  const targetValue = readAreaEncounterResetTimeStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaEncounterResetTimeStoragesEqual(expectedValue, targetValue)
  ) {
    return null;
  }
  return Object.freeze({ expectedValue, value: targetValue });
}

function isResetTime(value: unknown): value is number {
  return Number.isInteger(value)
    && Number(value) >= AREA_ENCOUNTER_RESET_TIME_MIN
    && Number(value) <= AREA_ENCOUNTER_RESET_TIME_MAX;
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
