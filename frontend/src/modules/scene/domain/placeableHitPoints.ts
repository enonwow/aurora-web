export const MIN_PLACEABLE_HIT_POINTS = 1;
export const MAX_PLACEABLE_HIT_POINTS = 10_000;
export const MIN_AURORA_SHORT = -0x8000;
export const MAX_AURORA_SHORT = 0x7fff;

export interface PlaceableHitPointState {
  readonly hitPoints: number;
  readonly currentHitPoints: number;
}

export interface PlaceableHitPointDerivationInput {
  readonly expectedHitPoints: number;
  readonly expectedCurrentHitPoints: number;
  readonly hitPoints: number;
}

export function isEditablePlaceableHitPoints(value: unknown): value is number {
  return Number.isInteger(value) &&
    Number(value) >= MIN_PLACEABLE_HIT_POINTS &&
    Number(value) <= MAX_PLACEABLE_HIT_POINTS;
}

export function isAuroraShort(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= MIN_AURORA_SHORT && Number(value) <= MAX_AURORA_SHORT;
}

export function readPlaceableHitPointState(value: unknown): Readonly<PlaceableHitPointState> | null {
  if (!isRecord(value) || !hasExactKeys(value, ["hitPoints", "currentHitPoints"]) ||
    !isEditablePlaceableHitPoints(value.hitPoints) || !isAuroraShort(value.currentHitPoints)) {
    return null;
  }
  return Object.freeze({
    hitPoints: value.hitPoints,
    currentHitPoints: value.currentHitPoints
  });
}

export function derivePlaceableCurrentHitPoints(
  input: PlaceableHitPointDerivationInput
): number | null {
  if (!isEditablePlaceableHitPoints(input.expectedHitPoints) ||
    !isEditablePlaceableHitPoints(input.hitPoints) ||
    !isAuroraShort(input.expectedCurrentHitPoints)) {
    return null;
  }
  const multiplier = Math.trunc(input.expectedCurrentHitPoints / input.expectedHitPoints);
  if (multiplier <= 0) return input.expectedCurrentHitPoints;
  const narrowed = toAuroraSignedShort(Math.round(input.hitPoints * multiplier));
  return Math.max(1, narrowed);
}

function toAuroraSignedShort(value: number): number {
  const unsigned = ((value % 0x1_0000) + 0x1_0000) % 0x1_0000;
  return unsigned >= 0x8000 ? unsigned - 0x1_0000 : unsigned;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}
