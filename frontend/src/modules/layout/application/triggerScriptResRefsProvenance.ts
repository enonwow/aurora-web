import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingTriggerScriptResRefs,
  cloneTriggerScriptResRefsStorage,
  isTriggerScriptTargetResRef,
  readTriggerScriptResRefsStorage,
  readTriggerScriptResRefsTargetStorage,
  triggerScriptResRefsStoragesEqual,
  type TriggerScriptResRefField,
  type TriggerScriptResRefsStorage,
} from "../../scene/domain/triggerScriptResRefs";

export function reduceExistingTriggerScriptResRef(
  source: SceneObjectSourceMetadata | undefined,
  current: TriggerScriptResRefsStorage,
  field: TriggerScriptResRefField,
  value: unknown,
): TriggerScriptResRefsStorage {
  const admittedCurrent = readTriggerScriptResRefsStorage(current);
  if (
    !admittedCurrent
    || !canEditExistingTriggerScriptResRefs(source)
    || !isTriggerScriptTargetResRef(value)
  ) return current;
  const canonicalTarget = Object.fromEntries(
    Object.entries(admittedCurrent).map(([key, entry]) => [
      key,
      key === field ? value : entry.toLowerCase(),
    ]),
  );
  return readTriggerScriptResRefsTargetStorage(canonicalTarget) ?? current;
}

export function materializeExistingTriggerScriptResRefs(
  source: SceneObjectSourceMetadata | undefined,
  current: TriggerScriptResRefsStorage,
  draft: TriggerScriptResRefsStorage,
): TriggerScriptResRefsStorage {
  const admittedCurrent = readTriggerScriptResRefsStorage(current);
  const admittedDraft = readTriggerScriptResRefsTargetStorage(draft);
  if (
    !admittedCurrent
    || !admittedDraft
    || !canEditExistingTriggerScriptResRefs(source)
  ) return cloneTriggerScriptResRefsStorage(current);
  return triggerScriptResRefsStoragesEqual(admittedCurrent, admittedDraft)
    ? cloneTriggerScriptResRefsStorage(current)
    : admittedDraft;
}

export { canEditExistingTriggerScriptResRefs };
