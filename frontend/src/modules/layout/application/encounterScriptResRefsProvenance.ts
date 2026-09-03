import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingEncounterScriptResRefs,
  cloneEncounterScriptResRefsStorage,
  encounterScriptResRefsStoragesEqual,
  isEncounterScriptTargetResRef,
  readEncounterScriptResRefsStorage,
  readEncounterScriptResRefsTargetStorage,
  type EncounterScriptResRefField,
  type EncounterScriptResRefsStorage,
} from "../../scene/domain/encounterScriptResRefs";

export function reduceExistingEncounterScriptResRef(
  source: SceneObjectSourceMetadata | undefined,
  current: EncounterScriptResRefsStorage,
  field: EncounterScriptResRefField,
  value: unknown,
): EncounterScriptResRefsStorage {
  const admittedCurrent = readEncounterScriptResRefsStorage(current);
  if (
    !admittedCurrent
    || !canEditExistingEncounterScriptResRefs(source)
    || !isEncounterScriptTargetResRef(value)
  ) return current;
  const target = readEncounterScriptResRefsStorage({
    ...admittedCurrent,
    [field]: value,
  });
  return target ?? current;
}

export function materializeExistingEncounterScriptResRefs(
  source: SceneObjectSourceMetadata | undefined,
  current: EncounterScriptResRefsStorage,
  draft: EncounterScriptResRefsStorage,
): EncounterScriptResRefsStorage {
  const admittedCurrent = readEncounterScriptResRefsStorage(current);
  const admittedDraft = readEncounterScriptResRefsTargetStorage(draft);
  if (
    !admittedCurrent
    || !admittedDraft
    || !canEditExistingEncounterScriptResRefs(source)
  ) return cloneEncounterScriptResRefsStorage(current);
  return encounterScriptResRefsStoragesEqual(admittedCurrent, admittedDraft)
    ? cloneEncounterScriptResRefsStorage(current)
    : admittedDraft;
}

export { canEditExistingEncounterScriptResRefs };
