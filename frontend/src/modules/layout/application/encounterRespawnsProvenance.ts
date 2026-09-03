import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingEncounterRespawns,
  cloneEncounterRespawnsStorage,
  ENCOUNTER_RESPAWNS_INFINITE,
  readEncounterRespawnsStorage,
  type EncounterRespawnsStorage,
} from "../../scene/domain/encounterRespawns";

export { canEditExistingEncounterRespawns } from
  "../../scene/domain/encounterRespawns";

export function reduceExistingEncounterRespawnsFinite(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number,
  candidateValue: unknown,
  resetEnabled: boolean,
  spawnOptionContinuous: boolean,
  infinite: boolean,
): number {
  if (
    !canEditExistingEncounterRespawns(source)
    || !resetEnabled
    || !spawnOptionContinuous
    || infinite
  ) return currentValue;
  const admitted = readEncounterRespawnsStorage({ respawns: candidateValue });
  return admitted && admitted.respawns !== ENCOUNTER_RESPAWNS_INFINITE
    ? admitted.respawns
    : currentValue;
}

export function reduceExistingEncounterRespawnsInfinite(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: boolean,
  candidateValue: unknown,
  resetEnabled: boolean,
  spawnOptionContinuous: boolean,
): boolean {
  if (
    !canEditExistingEncounterRespawns(source)
    || !resetEnabled
    || !spawnOptionContinuous
    || typeof candidateValue !== "boolean"
  ) return currentValue;
  return candidateValue;
}

export function materializeExistingEncounterRespawns(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: EncounterRespawnsStorage,
  draftFiniteValue: unknown,
  draftInfinite: unknown,
): EncounterRespawnsStorage {
  const current = readEncounterRespawnsStorage(currentValue);
  if (!current) throw new Error("Malformed current Encounter Respawns storage.");
  if (!canEditExistingEncounterRespawns(source) || typeof draftInfinite !== "boolean") {
    return cloneEncounterRespawnsStorage(current);
  }
  if (draftInfinite) {
    return Object.freeze({ respawns: ENCOUNTER_RESPAWNS_INFINITE });
  }
  const target = readEncounterRespawnsStorage({ respawns: draftFiniteValue });
  return target && target.respawns !== ENCOUNTER_RESPAWNS_INFINITE
    ? target
    : cloneEncounterRespawnsStorage(current);
}
