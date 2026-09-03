import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingItemTag,
  isEditableItemTag,
  MAX_ITEM_TAG_CODE_UNITS,
} from "../../scene/domain/itemTag";

export { canEditExistingItemTag, MAX_ITEM_TAG_CODE_UNITS };

export function reduceExistingItemTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: unknown,
): string {
  return canEditExistingItemTag(source) && isEditableItemTag(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingItemTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  draftValue: unknown,
): string {
  return reduceExistingItemTag(source, currentValue, draftValue);
}
