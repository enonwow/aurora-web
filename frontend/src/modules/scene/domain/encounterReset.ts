import type { SceneObjectSourceMetadata } from "../contracts";

export const ENCOUNTER_RESET_STORAGE_REVISION =
  "aurora-area-encounter-reset-storage.v1" as const;

const STORAGE_KEYS = Object.freeze(["resetByte"]);

export interface EncounterResetStorage {
  readonly resetByte: 0 | 1;
}

export interface EncounterResetPresentation {
  readonly reset: boolean;
}

export function readEncounterResetStorage(
  value: unknown,
): EncounterResetStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isResetByte(value.resetByte)) {
    return null;
  }
  return Object.freeze({ resetByte: value.resetByte });
}

export function cloneEncounterResetStorage(
  value: EncounterResetStorage,
): EncounterResetStorage {
  const admitted = readEncounterResetStorage(value);
  if (!admitted) throw new Error("Malformed retained Encounter Reset storage.");
  return admitted;
}

export function encounterResetStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readEncounterResetStorage(left);
  const admittedRight = readEncounterResetStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.resetByte === admittedRight.resetByte;
}

export function encounterResetPresentationFromStorage(
  value: EncounterResetStorage,
): EncounterResetPresentation {
  const admitted = cloneEncounterResetStorage(value);
  return Object.freeze({ reset: admitted.resetByte === 1 });
}

export function encounterResetStorageFromPresentation(
  value: EncounterResetPresentation,
): EncounterResetStorage | null {
  if (typeof value.reset !== "boolean") return null;
  return readEncounterResetStorage({ resetByte: value.reset ? 1 : 0 });
}

export function canEditExistingEncounterReset(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "encounter"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && readEncounterResetStorage(source.encounterResetStorage) !== null;
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
