import { describe, expect, it } from "vitest";
import {
  canEditExistingItemEditorComment,
  materializeExistingItemComments,
  reduceExistingItemEditorComment,
} from "../../../../../src/modules/layout/application/itemEditorCommentProvenance";

const exactSource = {
  type: "aurora_git",
  sourceKind: "item",
  sourceIndex: 0,
  sourceObjectId: "itm:0",
  itemEditorComment: " source ",
} as const;

describe("itemEditorCommentProvenance", () => {
  it("edits and materializes only exact retained Item provenance", () => {
    expect(canEditExistingItemEditorComment(exactSource)).toBe(true);
    expect(reduceExistingItemEditorComment(exactSource, " source ", " target "))
      .toBe(" target ");
    expect(materializeExistingItemComments(exactSource, " source ", " target "))
      .toBe(" target ");
  });

  it("preserves retained values without exact provenance", () => {
    const missing = { ...exactSource, itemEditorComment: undefined };
    expect(canEditExistingItemEditorComment(missing)).toBe(false);
    expect(reduceExistingItemEditorComment(missing, "current", "target")).toBe("current");
    expect(materializeExistingItemComments(missing, "current", "target")).toBe("current");
  });
});
