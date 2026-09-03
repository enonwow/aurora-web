import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingEncounterTemplateResRef,
  ENCOUNTER_TEMPLATE_RESREF_MAX_CODE_UNITS,
  isEncounterTemplateResRef,
} from "../../scene/domain/encounterTemplateResRef";

export {
  canEditExistingEncounterTemplateResRef,
  ENCOUNTER_TEMPLATE_RESREF_MAX_CODE_UNITS,
};

export function reduceExistingEncounterTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string | undefined,
  candidateValue: unknown,
): string | undefined {
  return canEditExistingEncounterTemplateResRef(source) &&
    isEncounterTemplateResRef(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingEncounterTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string | undefined,
  draftValue: unknown,
): string | undefined {
  return reduceExistingEncounterTemplateResRef(source, currentValue, draftValue);
}
