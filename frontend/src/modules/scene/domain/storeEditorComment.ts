import {
  AREA_EDITOR_COMMENT_MAX_CODE_UNITS,
  isAreaEditorComment,
  readAreaEditorComment,
} from "./editorComment";

export const STORE_EDITOR_COMMENT_MAX_CODE_UNITS =
  AREA_EDITOR_COMMENT_MAX_CODE_UNITS;

export function isStoreEditorComment(value: unknown): value is string {
  return isAreaEditorComment(value);
}

export function readStoreEditorComment(
  metadata: Readonly<{ editorComment?: unknown }> | undefined,
): string | undefined {
  return readAreaEditorComment(metadata as Readonly<Record<string, unknown>> | undefined);
}
