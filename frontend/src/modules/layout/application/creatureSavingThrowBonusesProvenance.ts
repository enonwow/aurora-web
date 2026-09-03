import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  CREATURE_SAVING_THROW_BONUS_FIELDS,
  normalizeCreatureSavingThrowBonus,
  readCreatureSavingThrowBonusesStorage,
  type CreatureSavingThrowBonusKey,
} from "../../scene/domain/creatureSavingThrowBonuses";
import { isPlainRecord } from "../../scene/domain/auroraObjectTag";

export type CreatureSavingThrowBonusValues = Readonly<
  Record<CreatureSavingThrowBonusKey, number>
>;

export function canEditExistingCreatureSavingThrowBonus(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureSavingThrowBonusKey,
): boolean {
  const storage = readCreatureSavingThrowBonusesStorage(
    source?.creatureSavingThrowBonuses,
  );
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    storage?.[key].present === true;
}

export function reduceExistingCreatureSavingThrowBonus(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureSavingThrowBonusKey,
  currentValue: number,
  candidateValue: unknown,
): number {
  const value = normalizeCreatureSavingThrowBonus(candidateValue);
  if (value === null) return currentValue;
  if (source?.type !== "aurora_git") return value;
  return canEditExistingCreatureSavingThrowBonus(source, key) ? value : currentValue;
}

export function materializeExistingCreatureSavingThrowBonuses(
  source: SceneObjectSourceMetadata | undefined,
  current: CreatureSavingThrowBonusValues,
  draft: unknown,
): CreatureSavingThrowBonusValues {
  const result: Record<CreatureSavingThrowBonusKey, number> = { ...current };
  if (!isPlainRecord(draft)) return result;
  for (const definition of CREATURE_SAVING_THROW_BONUS_FIELDS) {
    if (
      source?.type === "aurora_git" &&
      !canEditExistingCreatureSavingThrowBonus(source, definition.key)
    ) continue;
    const value = normalizeCreatureSavingThrowBonus(draft[definition.key]);
    if (value !== null) result[definition.key] = value;
  }
  return result;
}
