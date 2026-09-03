import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingEncounterActive,
  cloneEncounterActiveStorage,
  encounterActiveStorageFromPresentation,
  readEncounterActiveStorage,
  type EncounterActiveStorage,
} from "../../scene/domain/encounterActive";

export { canEditExistingEncounterActive } from "../../scene/domain/encounterActive";

export function reduceExistingEncounterActive(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: boolean,
  candidateValue: unknown,
): boolean {
  return canEditExistingEncounterActive(source) && typeof candidateValue === "boolean"
    ? candidateValue
    : currentValue;
}

export function materializeExistingEncounterActive(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: EncounterActiveStorage,
  draftValue: unknown,
): EncounterActiveStorage {
  const current = readEncounterActiveStorage(currentValue);
  if (!current) throw new Error("Malformed current Encounter Active storage.");
  if (!canEditExistingEncounterActive(source) || typeof draftValue !== "boolean") {
    return cloneEncounterActiveStorage(current);
  }
  return encounterActiveStorageFromPresentation({ active: draftValue })
    ?? cloneEncounterActiveStorage(current);
}
