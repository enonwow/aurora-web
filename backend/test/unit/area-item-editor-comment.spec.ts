import {
  MAX_AREA_ITEM_EDITOR_COMMENT_CODE_UNITS,
  isAreaItemEditorComment,
} from "../../src/modules/areas/domain/area-item-editor-comment";

describe("Area ground-item editor Comment", () => {
  it("admits exact bounded strings without trimming", () => {
    expect(isAreaItemEditorComment("  west wall item  ")).toBe(true);
    expect(isAreaItemEditorComment("")).toBe(true);
    expect(isAreaItemEditorComment("x".repeat(MAX_AREA_ITEM_EDITOR_COMMENT_CODE_UNITS))).toBe(true);
  });

  it("rejects non-strings, NUL and over-budget values", () => {
    expect(isAreaItemEditorComment(null)).toBe(false);
    expect(isAreaItemEditorComment("bad\0comment")).toBe(false);
    expect(isAreaItemEditorComment(
      "x".repeat(MAX_AREA_ITEM_EDITOR_COMMENT_CODE_UNITS + 1),
    )).toBe(false);
  });
});
