import {
  materializeExistingTriggerTag,
  reduceExistingTriggerTag,
} from "../../../../../src/modules/layout/application/triggerTagProvenance";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "trigger" as const,
  sourceIndex: 0,
  triggerTag: { present: true as const, value: "GenericTrigger" },
};

describe("retained Trigger Tag provenance", () => {
  it("reduces only an exact valid retained edit", () => {
    expect(reduceExistingTriggerTag(exactSource, "GenericTrigger", "  AREA_EXIT  "))
      .toBe("  AREA_EXIT  ");
    expect(reduceExistingTriggerTag(exactSource, "GenericTrigger", ""))
      .toBe("");
    expect(reduceExistingTriggerTag(
      { ...exactSource, triggerTag: { present: false } },
      "GenericTrigger",
      "AREA_EXIT",
    )).toBe("GenericTrigger");
    expect(reduceExistingTriggerTag(
      exactSource,
      "GenericTrigger",
      "x".repeat(33),
    )).toBe("GenericTrigger");
  });

  it("materializes only a source-bound value", () => {
    expect(materializeExistingTriggerTag(
      exactSource,
      "GenericTrigger",
      "AREA_EXIT",
    )).toBe("AREA_EXIT");
    expect(materializeExistingTriggerTag(
      { ...exactSource, sourceKind: "encounter" },
      "GenericTrigger",
      "AREA_EXIT",
    )).toBe("GenericTrigger");
  });
});
