import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingEncounterSpawnOption,
  cloneEncounterSpawnOptionStorage,
  readEncounterSpawnOptionStorage,
  type EncounterSpawnOption,
  type EncounterSpawnOptionStorage,
} from "../../scene/domain/encounterSpawnOption";

export { canEditExistingEncounterSpawnOption } from
  "../../scene/domain/encounterSpawnOption";

export function reduceExistingEncounterSpawnOption(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: EncounterSpawnOption,
  candidateValue: unknown,
): EncounterSpawnOption {
  if (!canEditExistingEncounterSpawnOption(source)) return currentValue;
  return readEncounterSpawnOptionStorage({ spawnOption: candidateValue })?.spawnOption
    ?? currentValue;
}

export function materializeExistingEncounterSpawnOption(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: EncounterSpawnOptionStorage,
  draftValue: unknown,
): EncounterSpawnOptionStorage {
  const current = readEncounterSpawnOptionStorage(currentValue);
  if (!current) throw new Error("Malformed current Encounter SpawnOption storage.");
  if (!canEditExistingEncounterSpawnOption(source)) {
    return cloneEncounterSpawnOptionStorage(current);
  }
  return readEncounterSpawnOptionStorage({ spawnOption: draftValue })
    ?? cloneEncounterSpawnOptionStorage(current);
}
