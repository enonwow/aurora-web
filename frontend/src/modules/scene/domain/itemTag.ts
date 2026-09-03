import {
  MAX_AURORA_OBJECT_TAG_CODE_UNITS,
  hasExactRecordKeys,
  isEditableAuroraObjectTag,
  isPlainRecord,
} from "./auroraObjectTag";
import type { SceneObjectSourceMetadata } from "../contracts";

export const MAX_ITEM_TAG_CODE_UNITS = MAX_AURORA_OBJECT_TAG_CODE_UNITS;

export type ItemTagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export const isEditableItemTag = isEditableAuroraObjectTag;

export function readItemTagStorage(input: unknown): ItemTagStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "value"]) &&
    input.present === true &&
    isEditableItemTag(input.value)
  ) {
    return Object.freeze({ present: true, value: input.value });
  }
  return null;
}

export function canEditExistingItemTag(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const tag = readItemTagStorage(source?.itemTag);
  return source?.type === "aurora_git" &&
    source.sourceKind === "item" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    tag?.present === true;
}
