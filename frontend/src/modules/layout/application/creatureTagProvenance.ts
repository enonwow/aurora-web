import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingCreatureTag,
  isEditableCreatureTag,
  MAX_CREATURE_TAG_CODE_UNITS,
} from "../../scene/domain/creatureTag";

export { canEditExistingCreatureTag, MAX_CREATURE_TAG_CODE_UNITS };

export function reduceExistingCreatureTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: unknown,
): string {
  return canEditExistingCreatureTag(source) && isEditableCreatureTag(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingCreatureTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  draftValue: unknown,
): string {
  return reduceExistingCreatureTag(source, currentValue, draftValue);
}
