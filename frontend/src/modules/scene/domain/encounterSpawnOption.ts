import type { SceneObjectSourceMetadata } from "../contracts";

export const ENCOUNTER_SPAWN_OPTION_STORAGE_REVISION =
  "aurora-area-encounter-spawn-option-storage.v1" as const;

export const ENCOUNTER_SPAWN_OPTION_CONTINUOUS = 0 as const;
export const ENCOUNTER_SPAWN_OPTION_SINGLE_SHOT = 1 as const;

const STORAGE_KEYS = Object.freeze(["spawnOption"]);

export type EncounterSpawnOption =
  | typeof ENCOUNTER_SPAWN_OPTION_CONTINUOUS
  | typeof ENCOUNTER_SPAWN_OPTION_SINGLE_SHOT;

export interface EncounterSpawnOptionStorage {
  readonly spawnOption: EncounterSpawnOption;
}

export interface EncounterSpawnOptionRow {
  readonly spawnOption: EncounterSpawnOption;
  readonly label: "Continuous" | "Single Shot";
}

export const ENCOUNTER_SPAWN_OPTION_ROWS: readonly EncounterSpawnOptionRow[] =
  Object.freeze([
    Object.freeze({ spawnOption: ENCOUNTER_SPAWN_OPTION_CONTINUOUS, label: "Continuous" }),
    Object.freeze({ spawnOption: ENCOUNTER_SPAWN_OPTION_SINGLE_SHOT, label: "Single Shot" }),
  ]);

export function readEncounterSpawnOptionStorage(
  value: unknown,
): EncounterSpawnOptionStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isSpawnOption(value.spawnOption)) {
    return null;
  }
  return Object.freeze({ spawnOption: value.spawnOption });
}

export function cloneEncounterSpawnOptionStorage(
  value: EncounterSpawnOptionStorage,
): EncounterSpawnOptionStorage {
  const admitted = readEncounterSpawnOptionStorage(value);
  if (!admitted) throw new Error("Malformed retained Encounter SpawnOption storage.");
  return admitted;
}

export function encounterSpawnOptionStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readEncounterSpawnOptionStorage(left);
  const admittedRight = readEncounterSpawnOptionStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.spawnOption === admittedRight.spawnOption;
}

export function canEditExistingEncounterSpawnOption(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "encounter"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && readEncounterSpawnOptionStorage(source.encounterSpawnOptionStorage) !== null;
}

function isSpawnOption(value: unknown): value is EncounterSpawnOption {
  return value === ENCOUNTER_SPAWN_OPTION_CONTINUOUS
    || value === ENCOUNTER_SPAWN_OPTION_SINGLE_SHOT;
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
