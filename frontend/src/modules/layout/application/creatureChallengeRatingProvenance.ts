import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  normalizeCreatureChallengeRating,
  readCreatureChallengeRatingStorage,
} from "../../scene/domain/creatureChallengeRating";

export function canEditExistingCreatureChallengeRating(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readCreatureChallengeRatingStorage(source?.creatureChallengeRating);
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    storage?.present === true;
}

export function reduceExistingCreatureChallengeRating(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number,
  candidateValue: unknown,
): number {
  return canEditExistingCreatureChallengeRating(source) &&
    normalizeCreatureChallengeRating(candidateValue) !== null
    ? candidateValue as number
    : currentValue;
}

export function materializeExistingCreatureChallengeRating(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number,
  draftValue: unknown,
): number {
  if (!canEditExistingCreatureChallengeRating(source)) return currentValue;
  return normalizeCreatureChallengeRating(draftValue) ?? currentValue;
}
