export const MAX_AREA_COMMENTS_CODE_UNITS = 4096;

export interface ExistingAreaCommentsMutation {
  readonly expectedValue: string;
  readonly value: string;
}

export function isAreaCommentsValue(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= MAX_AREA_COMMENTS_CODE_UNITS
    && !value.includes("\0");
}
