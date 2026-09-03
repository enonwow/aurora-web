import type { SceneObjectSourceMetadata } from "../contracts";

export const ENCOUNTER_RESPAWNS_STORAGE_REVISION =
  "aurora-area-encounter-respawns-storage.v1" as const;

export const ENCOUNTER_RESPAWNS_INFINITE = -1 as const;
export const ENCOUNTER_RESPAWNS_FINITE_MIN = 0;
export const ENCOUNTER_RESPAWNS_FINITE_MAX = 32_000;

const STORAGE_KEYS = Object.freeze(["respawns"]);

export interface EncounterRespawnsStorage {
  readonly respawns: number;
}

export function readEncounterRespawnsStorage(
  value: unknown,
): EncounterRespawnsStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isRespawns(value.respawns)) {
    return null;
  }
  return Object.freeze({ respawns: value.respawns });
}

export function cloneEncounterRespawnsStorage(
  value: EncounterRespawnsStorage,
): EncounterRespawnsStorage {
  const admitted = readEncounterRespawnsStorage(value);
  if (!admitted) throw new Error("Malformed retained Encounter Respawns storage.");
  return admitted;
}

export function encounterRespawnsStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readEncounterRespawnsStorage(left);
  const admittedRight = readEncounterRespawnsStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.respawns === admittedRight.respawns;
}

export function encounterRespawnsInfinitePresentationFromStorage(
  value: EncounterRespawnsStorage,
): boolean {
  const admitted = readEncounterRespawnsStorage(value);
  if (!admitted) throw new Error("Malformed retained Encounter Respawns storage.");
  return admitted.respawns === ENCOUNTER_RESPAWNS_INFINITE;
}

export function encounterRespawnsFinitePresentationFromStorage(
  value: EncounterRespawnsStorage,
): number {
  const admitted = readEncounterRespawnsStorage(value);
  if (!admitted) throw new Error("Malformed retained Encounter Respawns storage.");
  return admitted.respawns === ENCOUNTER_RESPAWNS_INFINITE ? 0 : admitted.respawns;
}

export function canEditExistingEncounterRespawns(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "encounter"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && readEncounterRespawnsStorage(source.encounterRespawnsStorage) !== null;
}

function isRespawns(value: unknown): value is number {
  return Number.isInteger(value)
    && (
      Number(value) === ENCOUNTER_RESPAWNS_INFINITE
      || (
        Number(value) >= ENCOUNTER_RESPAWNS_FINITE_MIN
        && Number(value) <= ENCOUNTER_RESPAWNS_FINITE_MAX
      )
    );
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
