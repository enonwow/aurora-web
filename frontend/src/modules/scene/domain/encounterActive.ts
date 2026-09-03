import type { SceneObjectSourceMetadata } from "../contracts";

export const ENCOUNTER_ACTIVE_STORAGE_REVISION =
  "aurora-area-encounter-active-storage.v1" as const;

const STORAGE_KEYS = Object.freeze(["activeByte"]);

export interface EncounterActiveStorage {
  readonly activeByte: 0 | 1;
}

export interface EncounterActivePresentation {
  readonly active: boolean;
}

export function readEncounterActiveStorage(value: unknown): EncounterActiveStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isActiveByte(value.activeByte)) return null;
  return Object.freeze({ activeByte: value.activeByte });
}

export function cloneEncounterActiveStorage(
  value: EncounterActiveStorage,
): EncounterActiveStorage {
  const admitted = readEncounterActiveStorage(value);
  if (!admitted) throw new Error("Malformed retained Encounter Active storage.");
  return admitted;
}

export function encounterActiveStoragesEqual(left: unknown, right: unknown): boolean {
  const admittedLeft = readEncounterActiveStorage(left);
  const admittedRight = readEncounterActiveStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.activeByte === admittedRight.activeByte;
}

export function encounterActivePresentationFromStorage(
  value: EncounterActiveStorage,
): EncounterActivePresentation {
  const admitted = cloneEncounterActiveStorage(value);
  return Object.freeze({ active: admitted.activeByte === 1 });
}

export function encounterActiveStorageFromPresentation(
  value: EncounterActivePresentation,
): EncounterActiveStorage | null {
  if (typeof value.active !== "boolean") return null;
  return readEncounterActiveStorage({ activeByte: value.active ? 1 : 0 });
}

export function canEditExistingEncounterActive(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "encounter"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && readEncounterActiveStorage(source.encounterActiveStorage) !== null;
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
