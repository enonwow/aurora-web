import type { SceneObjectSourceMetadata } from "../contracts";

export const ENCOUNTER_RESET_TIME_STORAGE_REVISION =
  "aurora-area-encounter-reset-time-storage.v1" as const;
export const ENCOUNTER_RESET_TIME_MIN = 1;
export const ENCOUNTER_RESET_TIME_MAX = 32_000;

const STORAGE_KEYS = Object.freeze(["resetTime"]);

export interface EncounterResetTimeStorage {
  readonly resetTime: number;
}

export function readEncounterResetTimeStorage(
  value: unknown,
): EncounterResetTimeStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isResetTime(value.resetTime)) {
    return null;
  }
  return Object.freeze({ resetTime: value.resetTime });
}

export function cloneEncounterResetTimeStorage(
  value: EncounterResetTimeStorage,
): EncounterResetTimeStorage {
  const admitted = readEncounterResetTimeStorage(value);
  if (!admitted) throw new Error("Malformed retained Encounter ResetTime storage.");
  return admitted;
}

export function encounterResetTimeStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readEncounterResetTimeStorage(left);
  const admittedRight = readEncounterResetTimeStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.resetTime === admittedRight.resetTime;
}

export function canEditExistingEncounterResetTime(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "encounter"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && readEncounterResetTimeStorage(source.encounterResetTimeStorage) !== null;
}

function isResetTime(value: unknown): value is number {
  return Number.isInteger(value)
    && Number(value) >= ENCOUNTER_RESET_TIME_MIN
    && Number(value) <= ENCOUNTER_RESET_TIME_MAX;
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
