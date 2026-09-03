import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureEditorComment,
  materializeExistingCreatureComments,
  reduceExistingCreatureEditorComment,
} from "../../../../../src/modules/layout/application/creatureEditorCommentProvenance";

describe("existing Creature editor Comments provenance", () => {
  const source = {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceObjectId: "creature:0:nw_chicken:source",
    sourceIndex: 0,
    creatureEditorComment: "",
  };

  it("admits exact retained empty provenance without normalization", () => {
    expect(canEditExistingCreatureEditorComment(source)).toBe(true);
    expect(reduceExistingCreatureEditorComment(source, "", "  west\r\ne\u0301  "))
      .toBe("  west\r\ne\u0301  ");
    expect(materializeExistingCreatureComments(source, "", " exact "))
      .toBe(" exact ");
  });

  it.each([
    ["absent", { ...source, creatureEditorComment: undefined }],
    ["wrong family", { ...source, sourceKind: "placeable" as const }],
    ["NUL", { ...source, creatureEditorComment: "bad\u0000value" }],
    ["over budget", { ...source, creatureEditorComment: "x".repeat(4097) }],
  ])("keeps retained Comments preserve-only for %s provenance", (_label, candidate) => {
    expect(canEditExistingCreatureEditorComment(candidate)).toBe(false);
    expect(reduceExistingCreatureEditorComment(candidate, "preserved", "changed"))
      .toBe("preserved");
    expect(materializeExistingCreatureComments(candidate, "preserved", "changed"))
      .toBe("preserved");
  });
});
