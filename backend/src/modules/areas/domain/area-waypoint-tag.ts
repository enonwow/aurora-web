import {
  MAX_AREA_OBJECT_TAG_CODE_UNITS,
  isEditableAreaObjectTag,
  readExistingAreaObjectTagMutation,
  readExistingAreaObjectTagStorage,
  type AreaObjectTagStorage,
  type ExistingAreaObjectTagMutation,
} from "./area-object-tag";

export const MAX_AREA_WAYPOINT_TAG_CODE_UNITS = MAX_AREA_OBJECT_TAG_CODE_UNITS;

export type AreaWaypointTagStorage = AreaObjectTagStorage;

export type ExistingAreaWaypointTagMutation = ExistingAreaObjectTagMutation;

export const isEditableAreaWaypointTag = isEditableAreaObjectTag;

export function readExistingAreaWaypointTagStorage(
  input: unknown,
): AreaWaypointTagStorage | null {
  return readExistingAreaObjectTagStorage(input);
}

export function readExistingAreaWaypointTagMutation(
  input: unknown,
): ExistingAreaWaypointTagMutation | null {
  return readExistingAreaObjectTagMutation(input);
}
