import {
  canEditExistingTriggerEditorComment,
  materializeExistingTriggerEditorComment,
  reduceExistingTriggerEditorComment,
} from "../../../../../src/modules/layout/application/triggerEditorCommentProvenance";

const source = {
  type: "aurora_git" as const,
  areaId: "area_demo",
  sourceObjectId: "trigger:0",
  sourceKind: "trigger" as const,
  sourceIndex: 0,
  triggerEditorComment: " source ",
};

describe("Trigger editor Comment provenance", () => {
  it("reduces and materializes exact admitted candidates", () => {
    expect(canEditExistingTriggerEditorComment(source)).toBe(true);
    expect(reduceExistingTriggerEditorComment(source, "current", " target "))
      .toBe(" target ");
    expect(materializeExistingTriggerEditorComment(source, "current", " target "))
      .toBe(" target ");
  });

  it.each([
    ["missing", { ...source, triggerEditorComment: undefined }],
    ["wrong family", { ...source, sourceKind: "encounter" as const }],
    ["NUL", { ...source, triggerEditorComment: "bad\0value" }],
  ])("keeps the current value for %s provenance", (_label, invalidSource) => {
    expect(canEditExistingTriggerEditorComment(invalidSource)).toBe(false);
    expect(reduceExistingTriggerEditorComment(invalidSource, "current", "target"))
      .toBe("current");
    expect(materializeExistingTriggerEditorComment(invalidSource, "current", "target"))
      .toBe("current");
  });
});
