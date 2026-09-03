import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingWaypointEditorComment as canEditExactWaypointEditorComment,
  isWaypointEditorComment,
} from "../../scene/domain/waypointEditorComment";

export function canEditExistingWaypointEditorComment(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return canEditExactWaypointEditorComment(source);
}

export function reduceExistingWaypointEditorComment(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown,
): string {
  return canEditExistingWaypointEditorComment(source) &&
    isWaypointEditorComment(candidate)
    ? candidate
    : current;
}

export function materializeExistingWaypointEditorComment(
  source: SceneObjectSourceMetadata | undefined,
  current: string | undefined,
  candidate: unknown,
): string | undefined {
  return canEditExistingWaypointEditorComment(source) &&
    isWaypointEditorComment(candidate)
    ? candidate
    : current;
}
