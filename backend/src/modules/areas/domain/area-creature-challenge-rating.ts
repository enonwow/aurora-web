export const AREA_CREATURE_CHALLENGE_RATING_MAX = 1000;

const STORAGE_KEYS = ["present", "nativeType", "value"] as const;
const MUTATION_KEYS = ["expectedValue", "value"] as const;

export type AreaCreatureChallengeRatingStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "float";
      value: number;
    }>;

export interface ExistingAreaCreatureChallengeRatingMutation {
  readonly expectedValue: number;
  readonly value: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

export function normalizeAreaCreatureChallengeRating(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Object.is(value, -0) ||
    value < 0 ||
    value > AREA_CREATURE_CHALLENGE_RATING_MAX
  ) return null;
  const normalized = Math.fround(value);
  if (
    !Number.isFinite(normalized) ||
    Object.is(normalized, -0) ||
    normalized < 0 ||
    normalized > AREA_CREATURE_CHALLENGE_RATING_MAX
  ) return null;
  return normalized;
}

export function readAreaCreatureChallengeRatingStorage(
  value: unknown,
): AreaCreatureChallengeRatingStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    !hasExactKeys(value, STORAGE_KEYS) ||
    value.present !== true ||
    value.nativeType !== "float"
  ) return null;
  const normalized = normalizeAreaCreatureChallengeRating(value.value);
  if (normalized === null) return null;
  return Object.freeze({
    present: true,
    nativeType: "float",
    value: normalized,
  });
}

export function readExistingAreaCreatureChallengeRatingMutation(
  value: unknown,
): ExistingAreaCreatureChallengeRatingMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS)) return null;
  const expectedValue = normalizeAreaCreatureChallengeRating(value.expectedValue);
  const targetValue = normalizeAreaCreatureChallengeRating(value.value);
  if (
    expectedValue === null ||
    targetValue === null ||
    Object.is(expectedValue, targetValue)
  ) return null;
  return Object.freeze({ expectedValue, value: targetValue });
}
