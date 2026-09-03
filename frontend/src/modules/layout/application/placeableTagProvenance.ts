import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import { isEditablePlaceableTag } from "../../scene/domain/placeableTag";

export function canEditExistingPlaceableTag(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const tag = source?.placeableBasicIdentity?.tag;
  return source?.type === "aurora_git" &&
    source.sourceKind === "placeable" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    tag?.present === true &&
    isEditablePlaceableTag(tag.value);
}

export function reduceExistingPlaceableTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: unknown,
): string {
  return canEditExistingPlaceableTag(source) && isEditablePlaceableTag(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingPlaceableTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  draftValue: unknown,
): string {
  return reduceExistingPlaceableTag(source, currentValue, draftValue);
}
