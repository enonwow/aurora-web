import {
  MAX_AREA_OBJECT_TAG_CODE_UNITS,
  isEditableAreaObjectTag,
  readExistingAreaObjectTagMutation,
  readExistingAreaObjectTagStorage,
  type AreaObjectTagStorage,
  type ExistingAreaObjectTagMutation,
} from "./area-object-tag";

export const MAX_AREA_ITEM_TAG_CODE_UNITS = MAX_AREA_OBJECT_TAG_CODE_UNITS;

export type AreaItemTagStorage = AreaObjectTagStorage;

export type ExistingAreaItemTagMutation = ExistingAreaObjectTagMutation;

export const isEditableAreaItemTag = isEditableAreaObjectTag;

export function readExistingAreaItemTagStorage(
  input: unknown,
): AreaItemTagStorage | null {
  return readExistingAreaObjectTagStorage(input);
}

export function readExistingAreaItemTagMutation(
  input: unknown,
): ExistingAreaItemTagMutation | null {
  return readExistingAreaObjectTagMutation(input);
}
