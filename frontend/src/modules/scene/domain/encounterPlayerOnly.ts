import type { SceneObjectSourceMetadata } from "../contracts";

export const ENCOUNTER_PLAYER_ONLY_STORAGE_REVISION =
  "aurora-area-encounter-player-only-storage.v1" as const;

const STORAGE_KEYS = Object.freeze(["playerOnlyByte"]);

export interface EncounterPlayerOnlyStorage {
  readonly playerOnlyByte: 0 | 1;
}

export interface EncounterPlayerOnlyPresentation {
  readonly playerOnly: boolean;
}

export function readEncounterPlayerOnlyStorage(
  value: unknown,
): EncounterPlayerOnlyStorage | null {
  if (
    !isExactRecord(value, STORAGE_KEYS)
    || !isPlayerOnlyByte(value.playerOnlyByte)
  ) {
    return null;
  }
  return Object.freeze({ playerOnlyByte: value.playerOnlyByte });
}

export function cloneEncounterPlayerOnlyStorage(
  value: EncounterPlayerOnlyStorage,
): EncounterPlayerOnlyStorage {
  const admitted = readEncounterPlayerOnlyStorage(value);
  if (!admitted) throw new Error("Malformed retained Encounter PlayerOnly storage.");
  return admitted;
}

export function encounterPlayerOnlyStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readEncounterPlayerOnlyStorage(left);
  const admittedRight = readEncounterPlayerOnlyStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.playerOnlyByte === admittedRight.playerOnlyByte;
}

export function encounterPlayerOnlyPresentationFromStorage(
  value: EncounterPlayerOnlyStorage,
): EncounterPlayerOnlyPresentation {
  const admitted = cloneEncounterPlayerOnlyStorage(value);
  return Object.freeze({ playerOnly: admitted.playerOnlyByte === 1 });
}

export function encounterPlayerOnlyStorageFromPresentation(
  value: EncounterPlayerOnlyPresentation,
): EncounterPlayerOnlyStorage | null {
  if (typeof value.playerOnly !== "boolean") return null;
  return readEncounterPlayerOnlyStorage({ playerOnlyByte: value.playerOnly ? 1 : 0 });
}

export function canEditExistingEncounterPlayerOnly(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "encounter"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && readEncounterPlayerOnlyStorage(source.encounterPlayerOnlyStorage) !== null;
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
