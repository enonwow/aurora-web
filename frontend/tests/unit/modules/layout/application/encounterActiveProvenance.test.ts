import {
  materializeExistingEncounterActive,
  reduceExistingEncounterActive,
} from "../../../../../src/modules/layout/application/encounterActiveProvenance";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterActiveStorage: { activeByte: 1 as const },
};

describe("retained Encounter Active provenance", () => {
  it("reduces only a source-bound boolean presentation", () => {
    expect(reduceExistingEncounterActive(exactSource, true, false)).toBe(false);
    expect(reduceExistingEncounterActive(exactSource, false, true)).toBe(true);
    expect(reduceExistingEncounterActive(exactSource, true, 0)).toBe(true);
    expect(reduceExistingEncounterActive(
      { ...exactSource, sourceKind: "trigger" },
      true,
      false,
    )).toBe(true);
  });

  it("materializes an exact byte only from admitted provenance", () => {
    expect(materializeExistingEncounterActive(exactSource, { activeByte: 1 }, false))
      .toEqual({ activeByte: 0 });
    expect(materializeExistingEncounterActive(
      { ...exactSource, encounterActiveStorage: { activeByte: 2 } },
      { activeByte: 1 },
      false,
    )).toEqual({ activeByte: 1 });
  });
});
