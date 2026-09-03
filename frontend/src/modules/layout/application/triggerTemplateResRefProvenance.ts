import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingTriggerTemplateResRef,
  isTriggerTemplateResRef,
  TRIGGER_TEMPLATE_RESREF_MAX_CODE_UNITS,
} from "../../scene/domain/triggerTemplateResRef";

export {
  canEditExistingTriggerTemplateResRef,
  TRIGGER_TEMPLATE_RESREF_MAX_CODE_UNITS,
};

export function reduceExistingTriggerTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string | undefined,
  candidateValue: unknown,
): string | undefined {
  return canEditExistingTriggerTemplateResRef(source) &&
    isTriggerTemplateResRef(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingTriggerTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string | undefined,
  draftValue: unknown,
): string | undefined {
  return reduceExistingTriggerTemplateResRef(source, currentValue, draftValue);
}
