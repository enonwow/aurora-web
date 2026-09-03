import {
  MAX_AURORA_OBJECT_TAG_CODE_UNITS,
  isEditableAuroraObjectTag,
  readAuroraObjectTagStorage,
  type AuroraObjectTagStorage,
} from "./auroraObjectTag";
import type { SceneObjectSourceMetadata } from "../contracts";

export const MAX_TRIGGER_TAG_CODE_UNITS = MAX_AURORA_OBJECT_TAG_CODE_UNITS;

export type TriggerTagStorage = AuroraObjectTagStorage;

export const isEditableTriggerTag = isEditableAuroraObjectTag;

export function readTriggerTagStorage(input: unknown): TriggerTagStorage | null {
  return readAuroraObjectTagStorage(input);
}

export function canEditExistingTriggerTag(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const tag = readTriggerTagStorage(source?.triggerTag);
  return source?.type === "aurora_git" &&
    source.sourceKind === "trigger" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    tag?.present === true;
}
