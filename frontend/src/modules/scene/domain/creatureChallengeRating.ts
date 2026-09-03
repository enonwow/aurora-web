import type { SceneObjectCreatureChallengeRatingStorage } from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export const CREATURE_CHALLENGE_RATING_MAX = 1_000;

export function normalizeCreatureChallengeRating(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Object.is(value, -0) ||
    value < 0 ||
    value > CREATURE_CHALLENGE_RATING_MAX
  ) return null;
  const normalized = Math.fround(value);
  if (
    !Number.isFinite(normalized) ||
    Object.is(normalized, -0) ||
    normalized < 0 ||
    normalized > CREATURE_CHALLENGE_RATING_MAX
  ) return null;
  return normalized;
}

export function readCreatureChallengeRatingStorage(
  input: unknown,
): SceneObjectCreatureChallengeRatingStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    !hasExactRecordKeys(input, ["present", "nativeType", "value"]) ||
    input.present !== true ||
    input.nativeType !== "float"
  ) return null;
  const value = normalizeCreatureChallengeRating(input.value);
  return value === null
    ? null
    : Object.freeze({ present: true, nativeType: "float", value });
}
