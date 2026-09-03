import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingEncounterResetTime,
  cloneEncounterResetTimeStorage,
  readEncounterResetTimeStorage,
  type EncounterResetTimeStorage,
} from "../../scene/domain/encounterResetTime";

export { canEditExistingEncounterResetTime } from
  "../../scene/domain/encounterResetTime";

export function reduceExistingEncounterResetTime(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number,
  candidateValue: unknown,
  resetEnabled: boolean,
  spawnOptionContinuous: boolean,
): number {
  if (
    !canEditExistingEncounterResetTime(source)
    || !resetEnabled
    || !spawnOptionContinuous
  ) return currentValue;
  return readEncounterResetTimeStorage({ resetTime: candidateValue })?.resetTime
    ?? currentValue;
}

export function materializeExistingEncounterResetTime(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: EncounterResetTimeStorage,
  draftValue: unknown,
): EncounterResetTimeStorage {
  const current = readEncounterResetTimeStorage(currentValue);
  if (!current) throw new Error("Malformed current Encounter ResetTime storage.");
  if (!canEditExistingEncounterResetTime(source)) {
    return cloneEncounterResetTimeStorage(current);
  }
  return readEncounterResetTimeStorage({ resetTime: draftValue })
    ?? cloneEncounterResetTimeStorage(current);
}
