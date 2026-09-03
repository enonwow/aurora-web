import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingEncounterTag,
  isEditableEncounterTag,
} from "../../scene/domain/encounterTag";

export { canEditExistingEncounterTag, MAX_ENCOUNTER_TAG_CODE_UNITS } from
  "../../scene/domain/encounterTag";

export function reduceExistingEncounterTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: unknown,
): string {
  return canEditExistingEncounterTag(source) && isEditableEncounterTag(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingEncounterTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  draftValue: unknown,
): string {
  return reduceExistingEncounterTag(source, currentValue, draftValue);
}
