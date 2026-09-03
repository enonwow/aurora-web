import type {
  SceneObject,
  SceneObjectItemVariableTargetEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  MAX_ITEM_VARIABLE_ENTRIES,
  readItemVariableProvenance,
  readItemVariableTargetEntries,
} from "../../scene/domain/itemVariableTable";
import { isItemWizardBlueprintEditorObject } from "./itemBlueprintPropertiesApplyRouting";

function admitted(source: SceneObjectSourceMetadata | undefined) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "item") return null;
  return readItemVariableProvenance(source.itemVariables);
}

export function canEditExistingItemVariables(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return admitted(source) !== null;
}

export function canEditItemVariables(object: SceneObject): boolean {
  return isItemWizardBlueprintEditorObject(object) || canEditExistingItemVariables(object.source);
}

function appendAdmittedItemVariable(
  current: readonly SceneObjectItemVariableTargetEntry[],
): readonly SceneObjectItemVariableTargetEntry[] {
  if (current.length >= MAX_ITEM_VARIABLE_ENTRIES) return current;
  return [...current, { name: "", type: "int", value: 0 }];
}

export function appendExistingItemVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemVariableTargetEntry[],
): readonly SceneObjectItemVariableTargetEntry[] {
  return admitted(source) ? appendAdmittedItemVariable(current) : current;
}

export function appendItemVariable(
  object: SceneObject,
  current: readonly SceneObjectItemVariableTargetEntry[],
): readonly SceneObjectItemVariableTargetEntry[] {
  return canEditItemVariables(object) ? appendAdmittedItemVariable(current) : current;
}

function updateAdmittedItemVariable(
  current: readonly SceneObjectItemVariableTargetEntry[],
  index: number,
  candidate: unknown,
): readonly SceneObjectItemVariableTargetEntry[] {
  if (!Number.isSafeInteger(index) || index < 0 || index >= current.length) return current;
  const entry = readItemVariableTargetEntries([candidate])?.[0];
  if (!entry) return current;
  return current.map((value, currentIndex) => currentIndex === index ? entry : value);
}

export function updateExistingItemVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemVariableTargetEntry[],
  index: number,
  candidate: unknown,
): readonly SceneObjectItemVariableTargetEntry[] {
  return admitted(source) ? updateAdmittedItemVariable(current, index, candidate) : current;
}

export function updateItemVariable(
  object: SceneObject,
  current: readonly SceneObjectItemVariableTargetEntry[],
  index: number,
  candidate: unknown,
): readonly SceneObjectItemVariableTargetEntry[] {
  return canEditItemVariables(object)
    ? updateAdmittedItemVariable(current, index, candidate)
    : current;
}

function removeAdmittedItemVariable(
  current: readonly SceneObjectItemVariableTargetEntry[],
  index: number,
): readonly SceneObjectItemVariableTargetEntry[] {
  if (!Number.isSafeInteger(index) || index < 0 || index >= current.length) return current;
  return current.filter((_entry, currentIndex) => currentIndex !== index);
}

export function removeExistingItemVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemVariableTargetEntry[],
  index: number,
): readonly SceneObjectItemVariableTargetEntry[] {
  return admitted(source) ? removeAdmittedItemVariable(current, index) : current;
}

export function removeItemVariable(
  object: SceneObject,
  current: readonly SceneObjectItemVariableTargetEntry[],
  index: number,
): readonly SceneObjectItemVariableTargetEntry[] {
  return canEditItemVariables(object) ? removeAdmittedItemVariable(current, index) : current;
}

function moveAdmittedItemVariable(
  current: readonly SceneObjectItemVariableTargetEntry[],
  index: number,
  direction: "up" | "down",
): readonly SceneObjectItemVariableTargetEntry[] {
  if (!Number.isSafeInteger(index)) return current;
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= current.length || target < 0 || target >= current.length) return current;
  const next = [...current];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function moveExistingItemVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemVariableTargetEntry[],
  index: number,
  direction: "up" | "down",
): readonly SceneObjectItemVariableTargetEntry[] {
  return admitted(source) ? moveAdmittedItemVariable(current, index, direction) : current;
}

export function moveItemVariable(
  object: SceneObject,
  current: readonly SceneObjectItemVariableTargetEntry[],
  index: number,
  direction: "up" | "down",
): readonly SceneObjectItemVariableTargetEntry[] {
  return canEditItemVariables(object)
    ? moveAdmittedItemVariable(current, index, direction)
    : current;
}

function materializeAdmittedItemVariables(
  current: readonly SceneObjectItemVariableTargetEntry[] | undefined,
  candidate: unknown,
): SceneObjectItemVariableTargetEntry[] | undefined {
  const entries = readItemVariableTargetEntries(candidate);
  return entries ? entries.map((entry) => ({ ...entry })) :
    current ? current.map((entry) => ({ ...entry })) : current;
}

export function materializeExistingItemVariables(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectItemVariableTargetEntry[] | undefined,
  candidate: unknown,
): SceneObjectItemVariableTargetEntry[] | undefined {
  return admitted(source)
    ? materializeAdmittedItemVariables(current, candidate)
    : current ? current.map((entry) => ({ ...entry })) : current;
}

export function materializeItemVariables(
  object: SceneObject,
  current: readonly SceneObjectItemVariableTargetEntry[] | undefined,
  candidate: unknown,
): SceneObjectItemVariableTargetEntry[] | undefined {
  return canEditItemVariables(object)
    ? materializeAdmittedItemVariables(current, candidate)
    : current ? current.map((entry) => ({ ...entry })) : current;
}
