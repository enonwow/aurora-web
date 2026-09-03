import { describe, expect, it } from "vitest";
import {
  canEditExistingPlaceableEditorComment,
  materializeExistingPlaceableComments,
  reduceExistingPlaceableEditorComment
} from "../../../../../src/modules/layout/application/placeableEditorCommentProvenance";

describe("existing Placeable editor Comments provenance", () => {
  const source = {
    type: "aurora_git" as const,
    sourceKind: "placeable" as const,
    placeableEditorComment: "Water Trough"
  };

  it("admits only an exact existing GIT Placeable with valid present provenance", () => {
    expect(canEditExistingPlaceableEditorComment(source)).toBe(true);
    expect(canEditExistingPlaceableEditorComment({
      ...source,
      placeableEditorComment: ""
    })).toBe(true);
    expect(canEditExistingPlaceableEditorComment({
      type: "aurora_git",
      sourceKind: "placeable"
    })).toBe(false);
    expect(canEditExistingPlaceableEditorComment({
      ...source,
      placeableEditorComment: "bad\u0000value"
    })).toBe(false);
    expect(canEditExistingPlaceableEditorComment({ ...source, type: "seed" })).toBe(false);
    expect(canEditExistingPlaceableEditorComment({ ...source, sourceKind: "door" })).toBe(false);
  });

  it("reduces valid candidates verbatim and otherwise preserves the current value", () => {
    expect(reduceExistingPlaceableEditorComment(source, "old", "  New\r\ne\u0301  "))
      .toBe("  New\r\ne\u0301  ");
    expect(reduceExistingPlaceableEditorComment(source, "old", "")).toBe("");
    expect(reduceExistingPlaceableEditorComment(source, "old", "x".repeat(4097))).toBe("old");
    expect(reduceExistingPlaceableEditorComment(source, "old", "bad\u0000value")).toBe("old");
    expect(reduceExistingPlaceableEditorComment({ ...source, type: "seed" }, "old", "new"))
      .toBe("old");
  });

  it("materializes only proven Comments while preserving Description and absent members", () => {
    const current = {
      description: "Localized gameplay description",
      comments: "Water Trough"
    };
    expect(materializeExistingPlaceableComments(
      source,
      current,
      "  beside west wall\r\n  "
    )).toEqual({
      description: "Localized gameplay description",
      comments: "  beside west wall\r\n  "
    });
    expect(materializeExistingPlaceableComments(
      source,
      current,
      "bad\u0000value"
    )).toEqual(current);
    expect(materializeExistingPlaceableComments(
      { ...source, type: "seed" },
      current,
      "must not apply"
    )).toEqual(current);
    expect(materializeExistingPlaceableComments(
      source,
      { description: "keep only" },
      "must not materialize"
    )).toEqual({ description: "keep only" });
    expect(materializeExistingPlaceableComments(source, undefined, "must not materialize"))
      .toEqual({});
  });
});
