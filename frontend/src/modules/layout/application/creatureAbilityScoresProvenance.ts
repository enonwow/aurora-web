import type {
  SceneObjectCreatureAbilityScores,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  CREATURE_ABILITY_SCORE_FIELDS,
  normalizeCreatureAbilityScore,
  readCreatureAbilityScoresStorage,
  type CreatureAbilityScoreKey,
} from "../../scene/domain/creatureAbilityScores";
import { isPlainRecord } from "../../scene/domain/auroraObjectTag";
import { readExistingCreatureHitPointState } from "./creatureHitPointsProvenance";

export function canEditExistingCreatureAbilityScore(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureAbilityScoreKey,
): boolean {
  const storage = readCreatureAbilityScoresStorage(source?.creatureAbilityScores);
  const member = storage?.[key];
  if (!(source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    member?.present === true)) return false;
  if (key !== "constitution") return true;
  const hitPoints = readExistingCreatureHitPointState(source);
  return hitPoints !== null && hitPoints.constitution.value === member.value;
}

export function reduceExistingCreatureAbilityScore(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureAbilityScoreKey,
  currentValue: number,
  candidateValue: unknown,
): number {
  const value = normalizeCreatureAbilityScore(candidateValue);
  if (value === null) return currentValue;
  if (source?.type !== "aurora_git") return value;
  return canEditExistingCreatureAbilityScore(source, key) ? value : currentValue;
}

export function materializeExistingCreatureAbilityScores(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectCreatureAbilityScores,
  draft: unknown,
): SceneObjectCreatureAbilityScores {
  const result: SceneObjectCreatureAbilityScores = { ...current };
  if (!isPlainRecord(draft)) return result;
  for (const definition of CREATURE_ABILITY_SCORE_FIELDS) {
    if (
      source?.type === "aurora_git" &&
      !canEditExistingCreatureAbilityScore(source, definition.key)
    ) continue;
    const value = normalizeCreatureAbilityScore(draft[definition.key]);
    if (value !== null) result[definition.key] = value;
  }
  return result;
}
