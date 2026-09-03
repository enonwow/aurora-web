import type {
  SceneObjectCreatureVariableTargetEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  MAX_CREATURE_VARIABLE_ENTRIES,
  readCreatureVariableProvenance,
  readCreatureVariableTargetEntries,
} from "../../scene/domain/creatureVariableTable";

function admitted(source: SceneObjectSourceMetadata | undefined) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature") return null;
  return readCreatureVariableProvenance(source.creatureVariables);
}

function canMutate(source: SceneObjectSourceMetadata | undefined): boolean {
  if (source?.type !== "aurora_git") return true;
  return source.sourceKind === "creature" && admitted(source) !== null;
}

export function canEditExistingCreatureVariables(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return admitted(source) !== null;
}

export function appendExistingCreatureVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectCreatureVariableTargetEntry[],
): readonly SceneObjectCreatureVariableTargetEntry[] {
  if (!canMutate(source) || current.length >= MAX_CREATURE_VARIABLE_ENTRIES) return current;
  return [...current, { name: "", type: "int", value: 0 }];
}

export function updateExistingCreatureVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectCreatureVariableTargetEntry[],
  index: number,
  candidate: unknown,
): readonly SceneObjectCreatureVariableTargetEntry[] {
  if (!canMutate(source) || !Number.isSafeInteger(index) || index < 0 || index >= current.length) {
    return current;
  }
  const entry = readCreatureVariableTargetEntries([candidate])?.[0];
  if (!entry) return current;
  return current.map((value, currentIndex) => currentIndex === index ? entry : value);
}

export function removeExistingCreatureVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectCreatureVariableTargetEntry[],
  index: number,
): readonly SceneObjectCreatureVariableTargetEntry[] {
  if (!canMutate(source) || !Number.isSafeInteger(index) || index < 0 || index >= current.length) {
    return current;
  }
  return current.filter((_entry, currentIndex) => currentIndex !== index);
}

export function moveExistingCreatureVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectCreatureVariableTargetEntry[],
  index: number,
  direction: "up" | "down",
): readonly SceneObjectCreatureVariableTargetEntry[] {
  if (!canMutate(source) || !Number.isSafeInteger(index)) return current;
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= current.length || target < 0 || target >= current.length) return current;
  const next = [...current];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
