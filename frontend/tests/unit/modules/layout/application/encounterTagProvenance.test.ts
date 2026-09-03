import {
  materializeExistingEncounterTag,
  reduceExistingEncounterTag,
} from "../../../../../src/modules/layout/application/encounterTagProvenance";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterTag: { present: true as const, value: "X2_GNOLL001" },
};

describe("retained Encounter Tag provenance", () => {
  it("reduces only an exact valid retained edit", () => {
    expect(reduceExistingEncounterTag(exactSource, "X2_GNOLL001", "  GNOLL_AMBUSH  "))
      .toBe("  GNOLL_AMBUSH  ");
    expect(reduceExistingEncounterTag(exactSource, "X2_GNOLL001", ""))
      .toBe("");
    expect(reduceExistingEncounterTag(
      { ...exactSource, encounterTag: { present: false } },
      "X2_GNOLL001",
      "GNOLL_AMBUSH",
    )).toBe("X2_GNOLL001");
    expect(reduceExistingEncounterTag(
      exactSource,
      "X2_GNOLL001",
      "x".repeat(33),
    )).toBe("X2_GNOLL001");
  });

  it("materializes only a source-bound value", () => {
    expect(materializeExistingEncounterTag(
      exactSource,
      "X2_GNOLL001",
      "GNOLL_AMBUSH",
    )).toBe("GNOLL_AMBUSH");
    expect(materializeExistingEncounterTag(
      { ...exactSource, sourceKind: "trigger" },
      "X2_GNOLL001",
      "GNOLL_AMBUSH",
    )).toBe("X2_GNOLL001");
  });
});
