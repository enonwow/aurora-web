import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingEncounterPlayerOnly,
  cloneEncounterPlayerOnlyStorage,
  encounterPlayerOnlyStorageFromPresentation,
  readEncounterPlayerOnlyStorage,
  type EncounterPlayerOnlyStorage,
} from "../../scene/domain/encounterPlayerOnly";

export { canEditExistingEncounterPlayerOnly } from
  "../../scene/domain/encounterPlayerOnly";

export function reduceExistingEncounterPlayerOnly(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: boolean,
  candidateValue: unknown,
): boolean {
  return canEditExistingEncounterPlayerOnly(source) && typeof candidateValue === "boolean"
    ? candidateValue
    : currentValue;
}

export function materializeExistingEncounterPlayerOnly(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: EncounterPlayerOnlyStorage,
  draftValue: unknown,
): EncounterPlayerOnlyStorage {
  const current = readEncounterPlayerOnlyStorage(currentValue);
  if (!current) throw new Error("Malformed current Encounter PlayerOnly storage.");
  if (!canEditExistingEncounterPlayerOnly(source) || typeof draftValue !== "boolean") {
    return cloneEncounterPlayerOnlyStorage(current);
  }
  return encounterPlayerOnlyStorageFromPresentation({ playerOnly: draftValue })
    ?? cloneEncounterPlayerOnlyStorage(current);
}
