import {
  MAX_AURORA_OBJECT_TAG_CODE_UNITS,
  hasExactRecordKeys,
  isEditableAuroraObjectTag,
  isPlainRecord,
} from "./auroraObjectTag";
import type { SceneObjectSourceMetadata } from "../contracts";

export const MAX_CREATURE_TAG_CODE_UNITS = MAX_AURORA_OBJECT_TAG_CODE_UNITS;

export type CreatureTagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export const isEditableCreatureTag = isEditableAuroraObjectTag;

export function readCreatureTagStorage(input: unknown): CreatureTagStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "value"]) &&
    input.present === true &&
    isEditableCreatureTag(input.value)
  ) {
    return Object.freeze({ present: true, value: input.value });
  }
  return null;
}

export function canEditExistingCreatureTag(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const tag = readCreatureTagStorage(source?.creatureTag);
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    tag?.present === true;
}
