import { describe, expect, it } from "vitest";
import {
  STORE_EDITOR_COMMENT_MAX_CODE_UNITS,
  isStoreEditorComment,
  readStoreEditorComment,
} from "../../../../../src/modules/scene/domain/storeEditorComment";

describe("storeEditorComment", () => {
  it("preserves exact admitted strings", () => {
    expect(readStoreEditorComment({ editorComment: "  west store  " }))
      .toBe("  west store  ");
    expect(readStoreEditorComment({ editorComment: "" })).toBe("");
    expect(isStoreEditorComment("x".repeat(STORE_EDITOR_COMMENT_MAX_CODE_UNITS))).toBe(true);
  });

  it("rejects malformed provenance", () => {
    expect(readStoreEditorComment({ editorComment: 7 })).toBeUndefined();
    expect(isStoreEditorComment("bad\0comment")).toBe(false);
    expect(isStoreEditorComment("x".repeat(STORE_EDITOR_COMMENT_MAX_CODE_UNITS + 1)))
      .toBe(false);
  });
});
