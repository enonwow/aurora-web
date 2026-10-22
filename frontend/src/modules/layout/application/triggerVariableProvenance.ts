import type {
  SceneObjectSourceMetadata,
  SceneObjectTriggerVariableTargetEntry,
} from "../../scene/contracts";
import {
  MAX_TRIGGER_VARIABLE_ENTRIES,
  readTriggerVariableProvenance,
  readTriggerVariableTargetEntries,
} from "../../scene/domain/triggerVariableTable";

function admitted(source: SceneObjectSourceMetadata | undefined) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "trigger" ||
      !Number.isSafeInteger(source.sourceIndex)) return null;
  return readTriggerVariableProvenance(source.triggerVariables);
}

export function canEditExistingTriggerVariables(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return admitted(source) !== null;
}

export function readExistingTriggerVariables(
  source: SceneObjectSourceMetadata | undefined,
): readonly SceneObjectTriggerVariableTargetEntry[] | undefined {
  return admitted(source)?.expectedEntries.map(({ sourceIndex: _, ...entry }) => ({ ...entry }));
}

export function appendExistingTriggerVariable(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectTriggerVariableTargetEntry[],
): readonly SceneObjectTriggerVariableTargetEntry[] {
  if (!canEditExistingTriggerVariables(source) ||
      current.length >= MAX_TRIGGER_VARIABLE_ENTRIES) return current;
  return [...current, { name: "", type: "int", value: 0 }];
}

export function reduceExistingTriggerVariables(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectTriggerVariableTargetEntry[],
  candidate: unknown,
): readonly SceneObjectTriggerVariableTargetEntry[] {
  if (!canEditExistingTriggerVariables(source)) return current;
  const parsed = readTriggerVariableTargetEntries(candidate);
  return parsed?.map((entry) => ({ ...entry })) ?? current;
}

export function materializeExistingTriggerVariables(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectTriggerVariableTargetEntry[] | undefined,
  draft: unknown,
): SceneObjectTriggerVariableTargetEntry[] | undefined {
  if (!canEditExistingTriggerVariables(source)) return current?.map((entry) => ({ ...entry }));
  const parsed = readTriggerVariableTargetEntries(draft);
  return parsed?.map((entry) => ({ ...entry })) ?? current?.map((entry) => ({ ...entry }));
}
