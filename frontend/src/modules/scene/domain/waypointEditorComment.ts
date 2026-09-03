import type { SceneObjectSourceMetadata } from "../contracts";
import {
  AREA_EDITOR_COMMENT_MAX_CODE_UNITS,
  isAreaEditorComment,
  readAreaEditorComment,
} from "./editorComment";

export const WAYPOINT_EDITOR_COMMENT_MAX_CODE_UNITS =
  AREA_EDITOR_COMMENT_MAX_CODE_UNITS;

export function isWaypointEditorComment(value: unknown): value is string {
  return isAreaEditorComment(value);
}

export function readWaypointEditorComment(
  metadata: Readonly<{ editorComment?: unknown }> | undefined,
): string | undefined {
  return readAreaEditorComment(metadata as Readonly<Record<string, unknown>> | undefined);
}

export function canEditExistingWaypointEditorComment(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git" &&
    source.sourceKind === "waypoint" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    isWaypointEditorComment(source.waypointEditorComment);
}
