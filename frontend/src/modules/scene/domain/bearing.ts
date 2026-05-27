const FULL_TURN_DEGREES = 360;
const FULL_TURN_RADIANS = Math.PI * 2;

export function normalizeBearingDegrees(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  let normalized = value % FULL_TURN_DEGREES;
  if (normalized < 0) {
    normalized += FULL_TURN_DEGREES;
  }
  return normalized;
}

export function normalizeBearingRadians(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  let normalized = value % FULL_TURN_RADIANS;
  if (normalized < 0) {
    normalized += FULL_TURN_RADIANS;
  }
  return normalized;
}
