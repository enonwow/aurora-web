import type {
  SceneObjectPlaceableDurabilitySaveBytes,
  SceneObjectSourceMetadata
} from "../../scene/contracts";
import {
  PLACEABLE_DURABILITY_SAVE_BYTE_FIELDS,
  isPlaceableDurabilitySaveByte,
  type PlaceableDurabilitySaveByteField
} from "../../scene/domain/placeableDurabilitySaveBytes";

export type PlaceableDurabilitySaveByteValues = Record<
  PlaceableDurabilitySaveByteField,
  number
>;

export function canEditExistingPlaceableDurabilitySaveByte(
  source: SceneObjectSourceMetadata | undefined,
  field: PlaceableDurabilitySaveByteField
): boolean {
  return (
    source?.type === "aurora_git" &&
    source.sourceKind === "placeable" &&
    isPlaceableDurabilitySaveByte(source.placeableDurabilitySaveBytes?.[field])
  );
}

export function reduceExistingPlaceableDurabilitySaveByte(
  source: SceneObjectSourceMetadata | undefined,
  field: PlaceableDurabilitySaveByteField,
  currentValue: number,
  nextValue: number
): number {
  return canEditExistingPlaceableDurabilitySaveByte(source, field) &&
    isPlaceableDurabilitySaveByte(nextValue)
    ? nextValue
    : currentValue;
}

export function materializeExistingPlaceableDurabilitySaveBytes(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableDurabilitySaveBytes,
  draft: PlaceableDurabilitySaveByteValues
): SceneObjectPlaceableDurabilitySaveBytes {
  const result: SceneObjectPlaceableDurabilitySaveBytes = { ...current };
  for (const field of PLACEABLE_DURABILITY_SAVE_BYTE_FIELDS) {
    if (
      canEditExistingPlaceableDurabilitySaveByte(source, field) &&
      isPlaceableDurabilitySaveByte(draft[field])
    ) {
      (result as Record<PlaceableDurabilitySaveByteField, number>)[field] = draft[field];
    }
  }
  return result;
}
