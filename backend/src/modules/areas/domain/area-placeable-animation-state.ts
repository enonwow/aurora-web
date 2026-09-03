export type ExistingAreaPlaceableAnimationState = 0 | 1 | 2;

export interface ExistingAreaPlaceableAnimationStateMutation {
  readonly expectedValue: ExistingAreaPlaceableAnimationState;
  readonly value: ExistingAreaPlaceableAnimationState;
}

export function isAreaPlaceableAnimationState(
  value: unknown,
): value is ExistingAreaPlaceableAnimationState {
  return value === 0 || value === 1 || value === 2;
}
