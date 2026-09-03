import type {
  SceneObjectPlaceableAdvancedSettings,
  SceneObjectSourceMetadata
} from "../../scene/contracts";
import {
  isPlaceableAnimationState,
  isPlaceableAnimationStateToken,
  type PlaceableAnimationStateToken
} from "../../scene/domain/placeableAnimationState";

export function canEditExistingPlaceableAnimationState(
  source: SceneObjectSourceMetadata | undefined
): boolean {
  return source?.type === "aurora_git" &&
    source.sourceKind === "placeable" &&
    isPlaceableAnimationState(source.placeableAnimationState);
}

export function reduceExistingPlaceableInitialState(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown
): string {
  return canEditExistingPlaceableAnimationState(source) &&
    isPlaceableAnimationStateToken(candidate)
    ? candidate
    : current;
}

export function materializeExistingPlaceableAnimationState(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableAdvancedSettings | undefined,
  draft: Readonly<SceneObjectPlaceableAdvancedSettings>
): SceneObjectPlaceableAdvancedSettings | undefined {
  if (!current) return undefined;
  const result = { ...current };
  if (
    canEditExistingPlaceableAnimationState(source) &&
    isPlaceableAnimationStateToken(draft.initialState)
  ) {
    result.initialState = draft.initialState as PlaceableAnimationStateToken;
  }
  return result;
}
