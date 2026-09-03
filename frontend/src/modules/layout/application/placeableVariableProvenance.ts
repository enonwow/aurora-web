import type {
  SceneObjectPlaceableVariableTargetEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  MAX_PLACEABLE_VARIABLE_ENTRIES,
  readPlaceableVariableProvenance,
  readPlaceableVariableTargetEntries,
} from "../../scene/domain/placeableVariableTable";

function admitted(source: SceneObjectSourceMetadata | undefined) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "placeable") return null;
  return readPlaceableVariableProvenance(source.placeableVariables);
}

export function canEditExistingPlaceableVariables(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return admitted(source) !== null;
}

export function appendExistingPlaceableVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectPlaceableVariableTargetEntry[],
): readonly SceneObjectPlaceableVariableTargetEntry[] {
  if (!admitted(source) || current.length >= MAX_PLACEABLE_VARIABLE_ENTRIES) return current;
  return [...current, { name: "", type: "int", value: 0 }];
}

export function updateExistingPlaceableVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectPlaceableVariableTargetEntry[],
  index: number,
  candidate: unknown,
): readonly SceneObjectPlaceableVariableTargetEntry[] {
  if (!admitted(source) || !Number.isSafeInteger(index) || index < 0 || index >= current.length) {
    return current;
  }
  const entry = readPlaceableVariableTargetEntries([candidate])?.[0];
  if (!entry) return current;
  return current.map((value, currentIndex) => currentIndex === index ? entry : value);
}

export function removeExistingPlaceableVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectPlaceableVariableTargetEntry[],
  index: number,
): readonly SceneObjectPlaceableVariableTargetEntry[] {
  if (!admitted(source) || !Number.isSafeInteger(index) || index < 0 || index >= current.length) {
    return current;
  }
  return current.filter((_entry, currentIndex) => currentIndex !== index);
}

export function moveExistingPlaceableVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectPlaceableVariableTargetEntry[],
  index: number,
  direction: "up" | "down",
): readonly SceneObjectPlaceableVariableTargetEntry[] {
  if (!admitted(source) || !Number.isSafeInteger(index)) return current;
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= current.length || target < 0 || target >= current.length) return current;
  const next = [...current];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function materializeExistingPlaceableVariables(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectPlaceableVariableTargetEntry[] | undefined,
  candidate: unknown,
): SceneObjectPlaceableVariableTargetEntry[] | undefined {
  if (!admitted(source)) return current ? current.map((entry) => ({ ...entry })) : current;
  const entries = readPlaceableVariableTargetEntries(candidate);
  return entries ? entries.map((entry) => ({ ...entry })) :
    current ? current.map((entry) => ({ ...entry })) : current;
}
