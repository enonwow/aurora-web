import type {
  SceneObjectCreatureAppearanceSettings,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  CREATURE_BODY_PART_FIELDS,
  maximumCreatureBodyPartTarget,
  readCreatureBodyPartsStorage,
  type CreatureBodyPartKey,
} from "../../scene/domain/creatureBodyParts";
import { isPlainRecord } from "../../scene/domain/auroraObjectTag";

const SOURCE_ONLY_KEYS = new Set<CreatureBodyPartKey>([
  "belt",
  "rightShoulder",
  "leftShoulder",
]);

export function canEditExistingCreatureBodyPart(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureBodyPartKey,
): boolean {
  const storage = readCreatureBodyPartsStorage(source?.creatureBodyParts);
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    storage?.[key].present === true;
}

export function maximumExistingCreatureBodyPartTarget(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureBodyPartKey,
): number | null {
  const storage = readCreatureBodyPartsStorage(source?.creatureBodyParts);
  if (
    source?.type !== "aurora_git" ||
    source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) ||
    Number(source.sourceIndex) < 0
  ) return null;
  return maximumCreatureBodyPartTarget(storage?.[key]);
}

export function reduceExistingCreatureBodyPart(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureBodyPartKey,
  currentValue: string,
  candidateValue: unknown,
): string {
  const maximum = source?.type === "aurora_git"
    ? maximumExistingCreatureBodyPartTarget(source, key)
    : 0xffff;
  if (maximum === null) return currentValue;
  const value = normalizeBodyPartDraft(candidateValue, maximum);
  if (value === null) return currentValue;
  return source?.type === "aurora_git" && !canEditExistingCreatureBodyPart(source, key)
    ? currentValue
    : String(value);
}

export function materializeExistingCreatureBodyParts(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectCreatureAppearanceSettings,
  draftParts: unknown,
  draftSourceOnlyParts: unknown,
): SceneObjectCreatureAppearanceSettings {
  const result: SceneObjectCreatureAppearanceSettings = {
    ...current,
    sourceOnlyParts: current.sourceOnlyParts ? { ...current.sourceOnlyParts } : undefined,
  };
  const direct = isPlainRecord(draftParts) ? draftParts : {};
  const sourceOnly = isPlainRecord(draftSourceOnlyParts) ? draftSourceOnlyParts : {};
  for (const definition of CREATURE_BODY_PART_FIELDS) {
    if (source?.type === "aurora_git" &&
      !canEditExistingCreatureBodyPart(source, definition.key)) continue;
    const maximum = source?.type === "aurora_git"
      ? maximumExistingCreatureBodyPartTarget(source, definition.key)
      : 0xffff;
    if (maximum === null) continue;
    const target = SOURCE_ONLY_KEYS.has(definition.key) ? sourceOnly : direct;
    if (!Object.prototype.hasOwnProperty.call(target, definition.key)) continue;
    const value = normalizeBodyPartDraft(target[definition.key], maximum);
    if (value === null) continue;
    if (SOURCE_ONLY_KEYS.has(definition.key)) {
      if (result.sourceOnlyParts) {
        result.sourceOnlyParts[definition.key as "belt" | "rightShoulder" | "leftShoulder"] =
          String(value);
      }
    } else {
      result[definition.key as Exclude<CreatureBodyPartKey,
        "belt" | "rightShoulder" | "leftShoulder">] = String(value);
    }
  }
  return result;
}

function normalizeBodyPartDraft(value: unknown, maximum: number): number | null {
  if (typeof value === "string") {
    if (!/^(?:0|[1-9]\d{0,4})$/u.test(value)) return null;
    const parsed = Number(value);
    return parsed <= maximum ? parsed : null;
  }
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= maximum
    ? Number(value)
    : null;
}
