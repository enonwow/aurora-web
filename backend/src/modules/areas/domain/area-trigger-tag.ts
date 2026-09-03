import {
  MAX_AREA_OBJECT_TAG_CODE_UNITS,
  isEditableAreaObjectTag,
  readExistingAreaObjectTagMutation,
  readExistingAreaObjectTagStorage,
  type ExistingAreaObjectTagMutation,
  type AreaObjectTagStorage,
} from "./area-object-tag";

export const MAX_AREA_TRIGGER_TAG_CODE_UNITS = MAX_AREA_OBJECT_TAG_CODE_UNITS;

export type AreaTriggerTagStorage = AreaObjectTagStorage;

export type ExistingAreaTriggerTagMutation = ExistingAreaObjectTagMutation;

export const isEditableAreaTriggerTag = isEditableAreaObjectTag;

export function readExistingAreaTriggerTagStorage(
  input: unknown,
): AreaTriggerTagStorage | null {
  return readExistingAreaObjectTagStorage(input);
}

export function readExistingAreaTriggerTagMutation(
  input: unknown,
): ExistingAreaTriggerTagMutation | null {
  return readExistingAreaObjectTagMutation(input);
}
