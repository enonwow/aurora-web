export const MAX_AREA_PLACEABLE_EDITOR_COMMENT_CODE_UNITS = 4096;

export interface ExistingAreaPlaceableEditorCommentMutation {
  readonly expectedValue: string;
  readonly value: string;
}

export function isAreaPlaceableEditorComment(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= MAX_AREA_PLACEABLE_EDITOR_COMMENT_CODE_UNITS &&
    !value.includes("\0");
}
