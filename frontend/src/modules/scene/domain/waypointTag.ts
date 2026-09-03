import {
  MAX_AURORA_OBJECT_TAG_CODE_UNITS,
  isEditableAuroraObjectTag,
  readAuroraObjectTagStorage,
  type AuroraObjectTagStorage,
} from "./auroraObjectTag";
import type { SceneObjectSourceMetadata } from "../contracts";

export const MAX_WAYPOINT_TAG_CODE_UNITS = MAX_AURORA_OBJECT_TAG_CODE_UNITS;

export type WaypointTagStorage = AuroraObjectTagStorage;

export const isEditableWaypointTag = isEditableAuroraObjectTag;

export function readWaypointTagStorage(input: unknown): WaypointTagStorage | null {
  return readAuroraObjectTagStorage(input);
}

export function canEditExistingWaypointTag(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const tag = readWaypointTagStorage(source?.waypointTag);
  return source?.type === "aurora_git" &&
    source.sourceKind === "waypoint" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    tag?.present === true;
}
