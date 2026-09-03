import type {
  SceneEncounterDifficultyCatalog,
  SceneEncounterDifficultyPair,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  encounterDifficultyPairsEqual,
  readEncounterDifficultyCatalogBinding,
  readEncounterDifficultyTarget,
} from "../../scene/domain/encounterDifficulty";

export function canEditExistingEncounterDifficulty(
  source: SceneObjectSourceMetadata | undefined,
  catalog: SceneEncounterDifficultyCatalog | null | undefined,
): boolean {
  return readEncounterDifficultyCatalogBinding(source, catalog) !== null;
}

export function materializeExistingEncounterDifficulty(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneEncounterDifficultyPair | undefined,
  candidate: unknown,
  catalog: SceneEncounterDifficultyCatalog | null | undefined,
): SceneEncounterDifficultyPair | undefined {
  const binding = readEncounterDifficultyCatalogBinding(source, catalog);
  const exactCurrent = readEncounterDifficultyTarget(current, binding?.catalog);
  const exactCandidate = readEncounterDifficultyTarget(candidate, binding?.catalog);
  if (!binding || !exactCurrent || !exactCandidate) return current;
  return encounterDifficultyPairsEqual(exactCurrent, exactCandidate)
    ? current
    : Object.freeze({ ...exactCandidate });
}
