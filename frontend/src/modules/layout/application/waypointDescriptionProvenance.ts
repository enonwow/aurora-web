import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingWaypointDescription as canEditExactWaypointDescription,
  isWaypointDescriptionInlineAsciiText,
  readExistingWaypointDescriptionSourceValue,
} from "../../scene/domain/waypointDescription";

export function readExistingWaypointDescription(
  source: SceneObjectSourceMetadata | undefined,
): string | undefined {
  return readExistingWaypointDescriptionSourceValue(source);
}

export function canEditExistingWaypointDescription(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return canEditExactWaypointDescription(source);
}

export function reduceExistingWaypointDescription(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown,
): string {
  return canEditExistingWaypointDescription(source) &&
    isWaypointDescriptionInlineAsciiText(candidate)
    ? candidate
    : current;
}

export function materializeExistingWaypointDescription(
  source: SceneObjectSourceMetadata | undefined,
  current: string | undefined,
  candidate: unknown,
): string | undefined {
  return canEditExistingWaypointDescription(source) &&
    isWaypointDescriptionInlineAsciiText(candidate)
    ? candidate
    : current;
}
