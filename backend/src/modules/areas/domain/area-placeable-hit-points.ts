export const MIN_AREA_PLACEABLE_HIT_POINTS = 1;
export const MAX_AREA_PLACEABLE_HIT_POINTS = 10_000;
export const MIN_AURORA_SHORT = -0x8000;
export const MAX_AURORA_SHORT = 0x7fff;

export interface AreaPlaceableHitPointState {
  readonly hitPoints: number;
  readonly currentHitPoints: number;
}

export interface ExistingAreaPlaceableHitPointMutation {
  readonly expectedHitPoints: number;
  readonly hitPoints: number;
  readonly expectedCurrentHitPoints: number;
  readonly currentHitPoints: number;
}

interface AreaPlaceableHitPointDerivationInput {
  readonly expectedHitPoints: number;
  readonly expectedCurrentHitPoints: number;
  readonly hitPoints: number;
}

const MUTATION_KEYS = [
  "expectedHitPoints",
  "hitPoints",
  "expectedCurrentHitPoints",
  "currentHitPoints",
] as const;

function isExactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

export function isEditableAreaPlaceableHitPoints(value: unknown): value is number {
  return Number.isInteger(value) &&
    Number(value) >= MIN_AREA_PLACEABLE_HIT_POINTS &&
    Number(value) <= MAX_AREA_PLACEABLE_HIT_POINTS;
}

export function isAuroraShort(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= MIN_AURORA_SHORT && Number(value) <= MAX_AURORA_SHORT;
}

function toAuroraSignedShort(value: number): number {
  const unsigned = ((value % 0x1_0000) + 0x1_0000) % 0x1_0000;
  return unsigned >= 0x8000 ? unsigned - 0x1_0000 : unsigned;
}

function readAreaPlaceableHitPointDerivationInput(input: {
  readonly expectedHitPoints: unknown;
  readonly expectedCurrentHitPoints: unknown;
  readonly hitPoints: unknown;
}): AreaPlaceableHitPointDerivationInput | null {
  const expectedHitPoints = input.expectedHitPoints;
  const expectedCurrentHitPoints = input.expectedCurrentHitPoints;
  const hitPoints = input.hitPoints;
  if (!isEditableAreaPlaceableHitPoints(expectedHitPoints) ||
      !isEditableAreaPlaceableHitPoints(hitPoints) ||
      !isAuroraShort(expectedCurrentHitPoints)) {
    return null;
  }
  return { expectedHitPoints, expectedCurrentHitPoints, hitPoints };
}

function deriveValidatedAreaPlaceableCurrentHitPoints(
  input: AreaPlaceableHitPointDerivationInput,
): number {
  const multiplier = Math.trunc(input.expectedCurrentHitPoints / input.expectedHitPoints);
  if (multiplier <= 0) return input.expectedCurrentHitPoints;

  const narrowed = toAuroraSignedShort(Math.round(input.hitPoints * multiplier));
  return Math.max(1, narrowed);
}

export function deriveAreaPlaceableCurrentHitPoints(
  input: AreaPlaceableHitPointDerivationInput,
): number | null {
  const admitted = readAreaPlaceableHitPointDerivationInput(input);
  return admitted ? deriveValidatedAreaPlaceableCurrentHitPoints(admitted) : null;
}

export function readExistingAreaPlaceableHitPointMutation(
  value: unknown,
): ExistingAreaPlaceableHitPointMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  const expectedHitPoints = value.expectedHitPoints;
  const hitPoints = value.hitPoints;
  const expectedCurrentHitPoints = value.expectedCurrentHitPoints;
  const currentHitPoints = value.currentHitPoints;
  const derivationInput = readAreaPlaceableHitPointDerivationInput({
    expectedHitPoints,
    expectedCurrentHitPoints,
    hitPoints,
  });
  if (!derivationInput || derivationInput.expectedHitPoints === derivationInput.hitPoints) return null;
  const derived = deriveValidatedAreaPlaceableCurrentHitPoints(derivationInput);
  if (derived !== currentHitPoints) return null;

  return Object.freeze({
    ...derivationInput,
    currentHitPoints,
  });
}
