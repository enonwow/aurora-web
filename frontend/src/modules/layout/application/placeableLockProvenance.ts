import type {
  SceneObjectPlaceableLockSettings,
  SceneObjectSourceMetadata
} from "../../scene/contracts";
import {
  PLACEABLE_LOCK_FIELD_MAPPINGS,
  isPlaceableLockFieldValue,
  type PlaceableLockByteField
} from "../../scene/domain/placeableLockFields";
import { isPlaceableKeyName } from "../../scene/domain/placeableKeyName";

export type PlaceableLockEditableField = PlaceableLockByteField | "keyTag";

export function canEditExistingPlaceableLockField(
  source: SceneObjectSourceMetadata | undefined,
  field: PlaceableLockEditableField
): boolean {
  if (source?.type !== "aurora_git" || source.sourceKind !== "placeable") return false;
  if (field === "keyTag") return isPlaceableKeyName(source.placeableLockSettings?.keyTag);
  const mapping = PLACEABLE_LOCK_FIELD_MAPPINGS.find((entry) => entry.slot === field)!;
  return isPlaceableLockFieldValue(
    mapping.valueKind,
    source.placeableLockSettings?.[field]
  );
}

export function materializeExistingPlaceableLockSettings(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableLockSettings | undefined,
  draft: SceneObjectPlaceableLockSettings
): SceneObjectPlaceableLockSettings | undefined {
  if (!current) return undefined;
  const materialized: SceneObjectPlaceableLockSettings = { ...current };
  for (const mapping of PLACEABLE_LOCK_FIELD_MAPPINGS) {
    if (canEditExistingPlaceableLockField(source, mapping.slot)) {
      materialized[mapping.slot] = draft[mapping.slot] as never;
    }
  }
  if (
    canEditExistingPlaceableLockField(source, "keyTag") &&
    isPlaceableKeyName(draft.keyTag)
  ) {
    materialized.keyTag = draft.keyTag;
  }
  return materialized;
}
