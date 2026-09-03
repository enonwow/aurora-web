export const AREA_EDITOR_COMMENT_MAX_CODE_UNITS = 4096;

export function isAreaEditorComment(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= AREA_EDITOR_COMMENT_MAX_CODE_UNITS &&
    !value.includes("\u0000");
}

export function readAreaEditorComment(
  metadata: Readonly<Record<string, unknown>> | undefined,
): string | undefined {
  const value = metadata?.editorComment;
  return isAreaEditorComment(value) ? value : undefined;
}
