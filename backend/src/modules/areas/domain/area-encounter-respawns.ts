export const AREA_ENCOUNTER_RESPAWNS_STORAGE_REVISION =
  "aurora-area-encounter-respawns-storage.v1" as const;

export const AREA_ENCOUNTER_RESPAWNS_INFINITE = -1 as const;
export const AREA_ENCOUNTER_RESPAWNS_FINITE_MIN = 0;
export const AREA_ENCOUNTER_RESPAWNS_FINITE_MAX = 32_000;

const STORAGE_KEYS = Object.freeze(["respawns"]);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"]);

export interface AreaEncounterRespawnsStorage {
  readonly respawns: number;
}

export interface ExistingAreaEncounterRespawnsMutation {
  readonly expectedValue: AreaEncounterRespawnsStorage;
  readonly value: AreaEncounterRespawnsStorage;
}

export function readAreaEncounterRespawnsStorage(
  value: unknown,
): AreaEncounterRespawnsStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS) || !isRespawns(value.respawns)) {
    return null;
  }
  return Object.freeze({ respawns: value.respawns });
}

export function areaEncounterRespawnsStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readAreaEncounterRespawnsStorage(left);
  const admittedRight = readAreaEncounterRespawnsStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && admittedLeft.respawns === admittedRight.respawns;
}

export function readExistingAreaEncounterRespawnsMutation(
  value: unknown,
): ExistingAreaEncounterRespawnsMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  const expectedValue = readAreaEncounterRespawnsStorage(value.expectedValue);
  const targetValue = readAreaEncounterRespawnsStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaEncounterRespawnsStoragesEqual(expectedValue, targetValue)
  ) {
    return null;
  }
  return Object.freeze({ expectedValue, value: targetValue });
}

function isRespawns(value: unknown): value is number {
  return Number.isInteger(value)
    && (
      Number(value) === AREA_ENCOUNTER_RESPAWNS_INFINITE
      || (
        Number(value) >= AREA_ENCOUNTER_RESPAWNS_FINITE_MIN
        && Number(value) <= AREA_ENCOUNTER_RESPAWNS_FINITE_MAX
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
