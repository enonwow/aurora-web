import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingEncounterCreatureCounts,
  cloneEncounterCreatureCountStorage,
  readEncounterCreatureCountStorage,
  type EncounterCreatureCountStorage,
} from "../../scene/domain/encounterCreatureCounts";

export { canEditExistingEncounterCreatureCounts } from
  "../../scene/domain/encounterCreatureCounts";

export function materializeExistingEncounterCreatureCounts(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: EncounterCreatureCountStorage,
  draftValue: EncounterCreatureCountStorage,
): EncounterCreatureCountStorage {
  const current = readEncounterCreatureCountStorage(currentValue);
  if (!current) throw new Error("Malformed current Encounter creature-count storage.");
  const draft = readEncounterCreatureCountStorage(draftValue);
  if (!canEditExistingEncounterCreatureCounts(source) || !draft) {
    return cloneEncounterCreatureCountStorage(current);
  }
  return cloneEncounterCreatureCountStorage(draft);
}

export function reduceExistingEncounterMaximumCreatures(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: EncounterCreatureCountStorage,
  candidateValue: unknown,
): EncounterCreatureCountStorage {
  const current = readEncounterCreatureCountStorage(currentValue);
  if (!current) throw new Error("Malformed current Encounter creature-count storage.");
  if (!canEditExistingEncounterCreatureCounts(source)) {
    return cloneEncounterCreatureCountStorage(current);
  }
  const candidate = readCount(candidateValue);
  if (candidate === null) return cloneEncounterCreatureCountStorage(current);
  return Object.freeze({
    maxCreatures: candidate,
    recCreatures: Math.min(current.recCreatures, candidate),
  });
}

export function reduceExistingEncounterMinimumCreatures(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: EncounterCreatureCountStorage,
  candidateValue: unknown,
): EncounterCreatureCountStorage {
  const current = readEncounterCreatureCountStorage(currentValue);
  if (!current) throw new Error("Malformed current Encounter creature-count storage.");
  if (!canEditExistingEncounterCreatureCounts(source)) {
    return cloneEncounterCreatureCountStorage(current);
  }
  const candidate = readCount(candidateValue);
  if (candidate === null) return cloneEncounterCreatureCountStorage(current);
  return Object.freeze({
    maxCreatures: Math.max(current.maxCreatures, candidate),
    recCreatures: candidate,
  });
}

function readCount(value: unknown): number | null {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 8) return null;
  return Number(value);
}
