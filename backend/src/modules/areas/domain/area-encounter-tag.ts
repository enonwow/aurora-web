import {
  MAX_AREA_OBJECT_TAG_CODE_UNITS,
  isEditableAreaObjectTag,
  readExistingAreaObjectTagMutation,
  readExistingAreaObjectTagStorage,
  type AreaObjectTagStorage,
  type ExistingAreaObjectTagMutation,
} from "./area-object-tag";

export const MAX_AREA_ENCOUNTER_TAG_CODE_UNITS = MAX_AREA_OBJECT_TAG_CODE_UNITS;

export type AreaEncounterTagStorage = AreaObjectTagStorage;

export type ExistingAreaEncounterTagMutation = ExistingAreaObjectTagMutation;

export const isEditableAreaEncounterTag = isEditableAreaObjectTag;

export function readExistingAreaEncounterTagStorage(
  input: unknown,
): AreaEncounterTagStorage | null {
  return readExistingAreaObjectTagStorage(input);
}

export function readExistingAreaEncounterTagMutation(
  input: unknown,
): ExistingAreaEncounterTagMutation | null {
  return readExistingAreaObjectTagMutation(input);
}
