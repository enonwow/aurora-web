import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingTriggerTag,
  isEditableTriggerTag,
} from "../../scene/domain/triggerTag";

export { canEditExistingTriggerTag, MAX_TRIGGER_TAG_CODE_UNITS } from
  "../../scene/domain/triggerTag";

export function reduceExistingTriggerTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: unknown,
): string {
  return canEditExistingTriggerTag(source) && isEditableTriggerTag(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingTriggerTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  draftValue: unknown,
): string {
  return reduceExistingTriggerTag(source, currentValue, draftValue);
}
