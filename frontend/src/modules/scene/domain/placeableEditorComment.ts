import {
  AREA_EDITOR_COMMENT_MAX_CODE_UNITS,
  isAreaEditorComment,
  readAreaEditorComment,
} from "./editorComment";

export const PLACEABLE_EDITOR_COMMENT_MAX_CODE_UNITS =
  AREA_EDITOR_COMMENT_MAX_CODE_UNITS;

export function isPlaceableEditorComment(value: unknown): value is string {
  return isAreaEditorComment(value);
}

export function readPlaceableEditorComment(
  metadata: Readonly<Record<string, unknown>> | undefined,
): string | undefined {
  return readAreaEditorComment(metadata);
}
