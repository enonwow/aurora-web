import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingWaypointTag,
  isEditableWaypointTag,
} from "../../scene/domain/waypointTag";

export { canEditExistingWaypointTag, MAX_WAYPOINT_TAG_CODE_UNITS } from
  "../../scene/domain/waypointTag";

export function reduceExistingWaypointTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: unknown,
): string {
  return canEditExistingWaypointTag(source) && isEditableWaypointTag(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingWaypointTag(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  draftValue: unknown,
): string {
  return reduceExistingWaypointTag(source, currentValue, draftValue);
}
