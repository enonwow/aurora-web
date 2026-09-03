import type {
  SceneObjectPlaceableTrapSettings,
  SceneObjectSourceMetadata
} from "../../scene/contracts";
import {
  PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS,
  isPlaceableTrapByteField,
  isPlaceableTrapTargetValue,
  type PlaceableTrapByteField
} from "../../scene/domain/placeableTrapByteFields";

function isExactExistingGitPlaceable(source: SceneObjectSourceMetadata | undefined): boolean {
  return source?.type === "aurora_git" && source.sourceKind === "placeable";
}

export function canEditExistingPlaceableTrapByteField(
  source: SceneObjectSourceMetadata | undefined,
  field: PlaceableTrapByteField
): boolean {
  if (!isExactExistingGitPlaceable(source)) return false;
  const settings = source?.placeableTrapSettings;
  return settings !== undefined &&
    Object.prototype.hasOwnProperty.call(settings, field) &&
    isPlaceableTrapTargetValue(field, settings[field]);
}

export function reduceExistingPlaceableTrapByteField<TValue extends boolean | number>(
  source: SceneObjectSourceMetadata | undefined,
  field: PlaceableTrapByteField,
  current: TValue,
  candidate: unknown
): TValue {
  return canEditExistingPlaceableTrapByteField(source, field) &&
    isPlaceableTrapTargetValue(field, candidate)
    ? candidate as TValue
    : current;
}

export function materializeExistingPlaceableTrapByteSettings(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableTrapSettings | undefined,
  draft: Readonly<SceneObjectPlaceableTrapSettings>
): SceneObjectPlaceableTrapSettings | undefined {
  if (!current) return undefined;
  const result = { ...current };
  for (const mapping of PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS) {
    if (!canEditExistingPlaceableTrapByteField(source, mapping.slot)) continue;
    const value = draft[mapping.slot];
    if (isPlaceableTrapTargetValue(mapping.slot, value)) {
      result[mapping.slot] = value as never;
    }
  }
  return result;
}

export { isPlaceableTrapByteField };
