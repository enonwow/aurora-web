import type {
  SceneObjectEncounterVariableTargetEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  MAX_ENCOUNTER_VARIABLE_ENTRIES,
  readEncounterVariableProvenance,
  readEncounterVariableTargetEntries,
} from "../../scene/domain/encounterVariableTable";

function admitted(source: SceneObjectSourceMetadata | undefined) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "encounter") return null;
  return readEncounterVariableProvenance(source.encounterVariables);
}

export function canEditExistingEncounterVariables(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return admitted(source) !== null;
}

export function appendExistingEncounterVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectEncounterVariableTargetEntry[],
): readonly SceneObjectEncounterVariableTargetEntry[] {
  if (!canEditExistingEncounterVariables(source) ||
      current.length >= MAX_ENCOUNTER_VARIABLE_ENTRIES) return current;
  return [...current, { name: "", type: "int", value: 0 }];
}

export function updateExistingEncounterVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectEncounterVariableTargetEntry[],
  index: number,
  candidate: unknown,
): readonly SceneObjectEncounterVariableTargetEntry[] {
  if (!canEditExistingEncounterVariables(source) || !Number.isSafeInteger(index) ||
      index < 0 || index >= current.length) return current;
  const entry = readEncounterVariableTargetEntries([candidate])?.[0];
  if (!entry) return current;
  return current.map((value, currentIndex) => currentIndex === index ? entry : value);
}

export function removeExistingEncounterVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectEncounterVariableTargetEntry[],
  index: number,
): readonly SceneObjectEncounterVariableTargetEntry[] {
  if (!canEditExistingEncounterVariables(source) || !Number.isSafeInteger(index) ||
      index < 0 || index >= current.length) return current;
  return current.filter((_entry, currentIndex) => currentIndex !== index);
}

export function moveExistingEncounterVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectEncounterVariableTargetEntry[],
  index: number,
  direction: "up" | "down",
): readonly SceneObjectEncounterVariableTargetEntry[] {
  if (!canEditExistingEncounterVariables(source) || !Number.isSafeInteger(index)) {
    return current;
  }
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= current.length || target < 0 || target >= current.length) {
    return current;
  }
  const next = [...current];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
