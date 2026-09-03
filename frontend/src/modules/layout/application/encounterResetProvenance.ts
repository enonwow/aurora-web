import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingEncounterReset,
  cloneEncounterResetStorage,
  encounterResetStorageFromPresentation,
  readEncounterResetStorage,
  type EncounterResetStorage,
} from "../../scene/domain/encounterReset";

export { canEditExistingEncounterReset } from "../../scene/domain/encounterReset";

export function reduceExistingEncounterReset(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: boolean,
  candidateValue: unknown,
): boolean {
  return canEditExistingEncounterReset(source) && typeof candidateValue === "boolean"
    ? candidateValue
    : currentValue;
}

export function materializeExistingEncounterReset(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: EncounterResetStorage,
  draftValue: unknown,
): EncounterResetStorage {
  const current = readEncounterResetStorage(currentValue);
  if (!current) throw new Error("Malformed current Encounter Reset storage.");
  if (!canEditExistingEncounterReset(source) || typeof draftValue !== "boolean") {
    return cloneEncounterResetStorage(current);
  }
  return encounterResetStorageFromPresentation({ reset: draftValue })
    ?? cloneEncounterResetStorage(current);
}
