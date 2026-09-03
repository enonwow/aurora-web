import type {
  SceneObjectCreatureAppearanceSettings,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  CREATURE_APPEARANCE_COLOR_FIELDS,
  normalizeCreatureAppearanceColor,
  readCreatureAppearanceColorsStorage,
  type CreatureAppearanceColorKey,
} from "../../scene/domain/creatureAppearanceColors";
import { isPlainRecord } from "../../scene/domain/auroraObjectTag";

function normalizeCreatureAppearanceColorDraft(value: unknown): number | null {
  if (typeof value === "string") {
    if (!/^(?:0|[1-9]\d{0,2})$/u.test(value)) return null;
    return normalizeCreatureAppearanceColor(Number(value));
  }
  return normalizeCreatureAppearanceColor(value);
}

export function canEditExistingCreatureAppearanceColor(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureAppearanceColorKey,
): boolean {
  const storage = readCreatureAppearanceColorsStorage(
    source?.creatureAppearanceColors,
  );
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    storage?.[key].present === true;
}

export function reduceExistingCreatureAppearanceColor(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureAppearanceColorKey,
  currentValue: string,
  candidateValue: unknown,
): string {
  const value = normalizeCreatureAppearanceColorDraft(candidateValue);
  if (value === null) return currentValue;
  if (source?.type !== "aurora_git") return String(value);
  return canEditExistingCreatureAppearanceColor(source, key)
    ? String(value)
    : currentValue;
}

export function materializeExistingCreatureAppearanceColors(
  source: SceneObjectSourceMetadata | undefined,
  current: NonNullable<SceneObjectCreatureAppearanceSettings["colors"]>,
  draft: unknown,
): NonNullable<SceneObjectCreatureAppearanceSettings["colors"]> {
  const result = { ...current };
  if (!isPlainRecord(draft)) return result;
  for (const definition of CREATURE_APPEARANCE_COLOR_FIELDS) {
    if (
      source?.type === "aurora_git" &&
      !canEditExistingCreatureAppearanceColor(source, definition.key)
    ) continue;
    const value = normalizeCreatureAppearanceColorDraft(draft[definition.key]);
    if (value !== null) result[definition.key] = String(value);
  }
  return result;
}
