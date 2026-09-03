import {
  MAX_AURORA_OBJECT_TAG_CODE_UNITS,
  isEditableAuroraObjectTag,
  readAuroraObjectTagStorage,
  type AuroraObjectTagStorage,
} from "./auroraObjectTag";
import type { SceneObjectSourceMetadata } from "../contracts";

export const MAX_ENCOUNTER_TAG_CODE_UNITS = MAX_AURORA_OBJECT_TAG_CODE_UNITS;

export type EncounterTagStorage = AuroraObjectTagStorage;

export const isEditableEncounterTag = isEditableAuroraObjectTag;

export function readEncounterTagStorage(input: unknown): EncounterTagStorage | null {
  return readAuroraObjectTagStorage(input);
}

export function canEditExistingEncounterTag(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const tag = readEncounterTagStorage(source?.encounterTag);
  return source?.type === "aurora_git" &&
    source.sourceKind === "encounter" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    tag?.present === true;
}
