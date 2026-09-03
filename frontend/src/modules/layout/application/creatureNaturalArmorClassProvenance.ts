import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  normalizeCreatureNaturalArmorClass,
  readCreatureNaturalArmorClassStorage,
} from "../../scene/domain/creatureNaturalArmorClass";

export function canEditExistingCreatureNaturalArmorClass(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readCreatureNaturalArmorClassStorage(
    source?.creatureNaturalArmorClass,
  );
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    storage?.present === true;
}

export function reduceExistingCreatureNaturalArmorClass(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number,
  candidateValue: unknown,
): number {
  const value = normalizeCreatureNaturalArmorClass(candidateValue);
  if (value === null) return currentValue;
  if (source?.type !== "aurora_git") return value;
  return canEditExistingCreatureNaturalArmorClass(source) ? value : currentValue;
}

export function materializeExistingCreatureNaturalArmorClass(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number,
  draftValue: unknown,
): number {
  const value = normalizeCreatureNaturalArmorClass(draftValue);
  if (value === null) return currentValue;
  if (source?.type !== "aurora_git") return value;
  return canEditExistingCreatureNaturalArmorClass(source) ? value : currentValue;
}
