import type { SceneObjectSourceMetadata } from "../contracts";

export const ENCOUNTER_CREATURE_COUNTS_STORAGE_REVISION =
  "aurora-area-encounter-creature-counts-storage.v1" as const;

export const ENCOUNTER_CREATURE_COUNT_MIN = 1;
export const ENCOUNTER_CREATURE_COUNT_MAX = 8;

const STORAGE_KEYS = Object.freeze(["maxCreatures", "recCreatures"]);

export interface EncounterCreatureCountStorage {
  readonly maxCreatures: number;
  readonly recCreatures: number;
}

export function readEncounterCreatureCountStorage(
  value: unknown,
): EncounterCreatureCountStorage | null {
  if (
    !isExactRecord(value, STORAGE_KEYS)
    || !isCreatureCount(value.maxCreatures)
    || !isCreatureCount(value.recCreatures)
    || Number(value.recCreatures) > Number(value.maxCreatures)
  ) return null;
  return Object.freeze({
    maxCreatures: Number(value.maxCreatures),
    recCreatures: Number(value.recCreatures),
  });
}

export function cloneEncounterCreatureCountStorage(
  value: EncounterCreatureCountStorage,
): EncounterCreatureCountStorage {
  const admitted = readEncounterCreatureCountStorage(value);
  if (!admitted) throw new Error("Malformed retained Encounter creature-count storage.");
  return admitted;
}

export function encounterCreatureCountStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readEncounterCreatureCountStorage(left);
  const admittedRight = readEncounterCreatureCountStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.maxCreatures === admittedRight.maxCreatures
    && admittedLeft.recCreatures === admittedRight.recCreatures;
}

export function canEditExistingEncounterCreatureCounts(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "encounter"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && readEncounterCreatureCountStorage(source.encounterCreatureCountsStorage) !== null;
}

function isCreatureCount(value: unknown): value is number {
  return Number.isInteger(value)
    && Number(value) >= ENCOUNTER_CREATURE_COUNT_MIN
    && Number(value) <= ENCOUNTER_CREATURE_COUNT_MAX;
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
