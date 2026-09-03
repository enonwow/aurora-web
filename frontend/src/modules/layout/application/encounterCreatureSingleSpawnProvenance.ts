import type {
  SceneObjectEncounterCreatureListBlueprintTargetEntry,
  SceneObjectEncounterCreatureListTargetEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  MAX_ENCOUNTER_CREATURE_LIST_ENTRIES,
  normalizeEncounterCreatureListTargetEntries,
  readEncounterCreatureListProvenance,
  readEncounterCreatureListTargetEntries,
} from "../../scene/domain/encounterCreatureSingleSpawn";

export function canEditExistingEncounterCreatureSingleSpawn(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "encounter"
    && readEncounterCreatureListProvenance(source.encounterCreatureList) !== null;
}

export function updateExistingEncounterCreatureSingleSpawn(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectEncounterCreatureListTargetEntry[],
  index: number,
  singleSpawn: boolean,
): readonly SceneObjectEncounterCreatureListTargetEntry[] {
  const provenance = readEncounterCreatureListProvenance(source?.encounterCreatureList);
  const admitted = provenance
    ? normalizeEncounterCreatureListTargetEntries(provenance.expectedEntries, current)
    : null;
  if (
    !canEditExistingEncounterCreatureSingleSpawn(source)
    || !admitted
    || !Number.isInteger(index)
    || index < 0
    || index >= admitted.length
  ) return current;
  return Object.freeze(admitted.map((entry, candidateIndex) => Object.freeze(
    candidateIndex === index ? { ...entry, singleSpawn } : { ...entry },
  )));
}

export function appendExistingEncounterCreatureListEntry(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectEncounterCreatureListTargetEntry[],
  entry: SceneObjectEncounterCreatureListBlueprintTargetEntry,
): readonly SceneObjectEncounterCreatureListTargetEntry[] {
  const admitted = admitStructuralTarget(source, current);
  const exactEntry = readBlueprintEntry(entry);
  if (!admitted || !exactEntry
    || admitted.length >= MAX_ENCOUNTER_CREATURE_LIST_ENTRIES) return current;
  return Object.freeze([
    ...admitted.map((candidate) => Object.freeze({ ...candidate })),
    Object.freeze({ ...exactEntry }),
  ]);
}

export function replaceExistingEncounterCreatureListEntry(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectEncounterCreatureListTargetEntry[],
  index: number,
  entry: SceneObjectEncounterCreatureListBlueprintTargetEntry,
): readonly SceneObjectEncounterCreatureListTargetEntry[] {
  const admitted = admitStructuralTarget(source, current);
  const exactEntry = readBlueprintEntry(entry);
  if (!admitted || !exactEntry || !isTargetIndex(index, admitted.length)) return current;
  return Object.freeze(admitted.map((candidate, candidateIndex) => Object.freeze(
    candidateIndex === index ? { ...exactEntry } : { ...candidate },
  )));
}

export function removeExistingEncounterCreatureListEntry(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectEncounterCreatureListTargetEntry[],
  index: number,
): readonly SceneObjectEncounterCreatureListTargetEntry[] {
  const admitted = admitStructuralTarget(source, current);
  if (!admitted || !isTargetIndex(index, admitted.length)) return current;
  return Object.freeze(admitted
    .filter((_, candidateIndex) => candidateIndex !== index)
    .map((entry) => Object.freeze({ ...entry })));
}

export function moveExistingEncounterCreatureListEntry(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectEncounterCreatureListTargetEntry[],
  index: number,
  direction: -1 | 1,
): readonly SceneObjectEncounterCreatureListTargetEntry[] {
  const admitted = admitStructuralTarget(source, current);
  const targetIndex = index + direction;
  if (!admitted || (direction !== -1 && direction !== 1)
    || !isTargetIndex(index, admitted.length)
    || !isTargetIndex(targetIndex, admitted.length)) return current;
  const next = admitted.map((entry) => ({ ...entry }));
  [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
  return Object.freeze(next.map((entry) => Object.freeze(entry)));
}

function admitStructuralTarget(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectEncounterCreatureListTargetEntry[],
) {
  if (!canEditExistingEncounterCreatureSingleSpawn(source)) return null;
  const provenance = readEncounterCreatureListProvenance(source?.encounterCreatureList);
  return provenance
    ? normalizeEncounterCreatureListTargetEntries(provenance.expectedEntries, current)
    : null;
}

function readBlueprintEntry(value: unknown) {
  const admitted = readEncounterCreatureListTargetEntries([value]);
  const entry = admitted?.[0];
  return entry && "entryKind" in entry && entry.entryKind === "effective_blueprint"
    ? entry
    : null;
}

function isTargetIndex(index: number, length: number): boolean {
  return Number.isSafeInteger(index) && index >= 0 && index < length;
}
