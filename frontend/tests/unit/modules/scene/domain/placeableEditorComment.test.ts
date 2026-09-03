import { describe, expect, it } from "vitest";
import {
  PLACEABLE_EDITOR_COMMENT_MAX_CODE_UNITS,
  isPlaceableEditorComment,
  readPlaceableEditorComment
} from "../../../../../src/modules/scene/domain/placeableEditorComment";

describe("Placeable editor Comments domain", () => {
  it("accepts exact strings from zero through 4096 ECMAScript code units", () => {
    expect(PLACEABLE_EDITOR_COMMENT_MAX_CODE_UNITS).toBe(4096);
    expect(isPlaceableEditorComment("")).toBe(true);
    expect(isPlaceableEditorComment("  Water\r\nTrough  ")).toBe(true);
    expect(isPlaceableEditorComment("🧪".repeat(2048))).toBe(true);
    expect(isPlaceableEditorComment(`${"🧪".repeat(2048)}x`)).toBe(false);
  });

  it("rejects non-strings and every string containing U+0000 without normalizing", () => {
    expect(isPlaceableEditorComment(0)).toBe(false);
    expect(isPlaceableEditorComment(false)).toBe(false);
    expect(isPlaceableEditorComment(null)).toBe(false);
    expect(isPlaceableEditorComment("before\u0000after")).toBe(false);
    expect(isPlaceableEditorComment("\u0000")).toBe(false);
  });

  it("reads present exact metadata including empty and preserves code units verbatim", () => {
    expect(readPlaceableEditorComment({ editorComment: "" })).toBe("");
    expect(readPlaceableEditorComment({ editorComment: "  A\r\ne\u0301  " }))
      .toBe("  A\r\ne\u0301  ");
    expect(readPlaceableEditorComment({})).toBeUndefined();
    expect(readPlaceableEditorComment({ editorComment: "bad\u0000value" })).toBeUndefined();
    expect(readPlaceableEditorComment({ editorComment: "x".repeat(4097) })).toBeUndefined();
  });
});
