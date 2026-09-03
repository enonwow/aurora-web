import { describe, expect, it } from "vitest";
import {
  canEditExistingEncounterEditorComment,
  materializeExistingEncounterEditorComment,
  reduceExistingEncounterEditorComment,
} from "../../../../../src/modules/layout/application/encounterEditorCommentProvenance";

describe("existing Encounter editor Comment provenance", () => {
  const source = {
    type: "aurora_git" as const,
    sourceKind: "encounter" as const,
    sourceObjectId: "encounter:0:x2_gnoll001:source",
    sourceIndex: 0,
    encounterEditorComment: " source ",
  };

  it("keeps source immutable and materializes an exact changed target", () => {
    expect(canEditExistingEncounterEditorComment(source)).toBe(true);
    expect(reduceExistingEncounterEditorComment(source, " source ", " target "))
      .toBe(" target ");
    expect(materializeExistingEncounterEditorComment(source, " source ", " target "))
      .toBe(" target ");
    expect(source.encounterEditorComment).toBe(" source ");
  });

  it.each([
    ["missing", { ...source, encounterEditorComment: undefined }],
    ["wrong family", { ...source, sourceKind: "trigger" as const }],
    ["NUL", { ...source, encounterEditorComment: "bad\0value" }],
  ])("keeps %s provenance preserve-only", (_label, candidate) => {
    expect(canEditExistingEncounterEditorComment(candidate)).toBe(false);
    expect(reduceExistingEncounterEditorComment(candidate, "preserved", "changed"))
      .toBe("preserved");
  });
});
