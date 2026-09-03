import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  normalizeCreatureAlignmentLabel,
  readCreatureAlignmentStorage,
  resolveCreatureAlignmentLabel,
  type CreatureAlignmentLabel,
} from "../../scene/domain/creatureAlignment";

export function canEditExistingCreatureAlignment(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readCreatureAlignmentStorage(source?.creatureAlignment);
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    storage?.goodEvil.present === true &&
    storage.lawfulChaotic.present === true &&
    resolveCreatureAlignmentLabel(
      storage.goodEvil.value,
      storage.lawfulChaotic.value,
    ) !== null;
}

export function reduceExistingCreatureAlignment(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: unknown,
): string {
  const value = normalizeCreatureAlignmentLabel(candidateValue);
  if (value === null) return currentValue;
  if (source?.type !== "aurora_git") return value;
  return canEditExistingCreatureAlignment(source) ? value : currentValue;
}

export function materializeExistingCreatureAlignment(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  draftValue: unknown,
): string {
  const value: CreatureAlignmentLabel | null = normalizeCreatureAlignmentLabel(draftValue);
  if (value === null) return currentValue;
  if (source?.type !== "aurora_git") return value;
  return canEditExistingCreatureAlignment(source) ? value : currentValue;
}
