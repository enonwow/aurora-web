import {
  MAX_AREA_OBJECT_TAG_CODE_UNITS,
  isEditableAreaObjectTag,
  readExistingAreaObjectTagMutation,
  type ExistingAreaObjectTagMutation,
} from "./area-object-tag";

export const MAX_AREA_PLACEABLE_TAG_CODE_UNITS = MAX_AREA_OBJECT_TAG_CODE_UNITS;

export type ExistingAreaPlaceableTagMutation = ExistingAreaObjectTagMutation;

export const isEditableAreaPlaceableTag = isEditableAreaObjectTag;

export const readExistingAreaPlaceableTagMutation = readExistingAreaObjectTagMutation;
