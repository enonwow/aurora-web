export const PLACEABLE_ANIMATION_STATE_TOKENS = Object.freeze([
  "Closed",
  "Opened 1",
  "Opened 2"
] as const);

export type PlaceableAnimationState = 0 | 1 | 2;
export type PlaceableAnimationStateToken = (typeof PLACEABLE_ANIMATION_STATE_TOKENS)[number];

export function isPlaceableAnimationState(value: unknown): value is PlaceableAnimationState {
  return value === 0 || value === 1 || value === 2;
}

export function isPlaceableAnimationStateToken(
  value: unknown
): value is PlaceableAnimationStateToken {
  return PLACEABLE_ANIMATION_STATE_TOKENS.some((token) => token === value);
}

export function projectPlaceableAnimationStateToken(
  value: PlaceableAnimationState
): PlaceableAnimationStateToken {
  return PLACEABLE_ANIMATION_STATE_TOKENS[value];
}

export function projectPlaceableAnimationState(
  token: PlaceableAnimationStateToken
): PlaceableAnimationState {
  return PLACEABLE_ANIMATION_STATE_TOKENS.indexOf(token) as PlaceableAnimationState;
}

export function readPlaceableAnimationState(
  metadata: Readonly<Record<string, unknown>> | undefined
): PlaceableAnimationState | undefined {
  const value = metadata?.animationState;
  return isPlaceableAnimationState(value) ? value : undefined;
}
