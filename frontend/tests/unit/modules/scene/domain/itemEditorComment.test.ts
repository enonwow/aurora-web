import { describe, expect, it } from "vitest";
import {
  ITEM_EDITOR_COMMENT_MAX_CODE_UNITS,
  isItemEditorComment,
  readItemEditorComment,
} from "../../../../../src/modules/scene/domain/itemEditorComment";

describe("itemEditorComment", () => {
  it("preserves exact admitted strings", () => {
    expect(readItemEditorComment({ editorComment: "  west item  " })).toBe("  west item  ");
    expect(readItemEditorComment({ editorComment: "" })).toBe("");
    expect(isItemEditorComment("x".repeat(ITEM_EDITOR_COMMENT_MAX_CODE_UNITS))).toBe(true);
  });

  it("rejects malformed provenance", () => {
    expect(readItemEditorComment({ editorComment: 7 })).toBeUndefined();
    expect(isItemEditorComment("bad\0comment")).toBe(false);
    expect(isItemEditorComment("x".repeat(ITEM_EDITOR_COMMENT_MAX_CODE_UNITS + 1))).toBe(false);
  });
});
