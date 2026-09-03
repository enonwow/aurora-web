import {
  materializeExistingEncounterPlayerOnly,
  reduceExistingEncounterPlayerOnly,
} from "../../../../../src/modules/layout/application/encounterPlayerOnlyProvenance";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterPlayerOnlyStorage: { playerOnlyByte: 1 as const },
};

describe("retained Encounter PlayerOnly provenance", () => {
  it("reduces only a source-bound boolean presentation", () => {
    expect(reduceExistingEncounterPlayerOnly(exactSource, true, false)).toBe(false);
    expect(reduceExistingEncounterPlayerOnly(exactSource, false, true)).toBe(true);
    expect(reduceExistingEncounterPlayerOnly(exactSource, true, 0)).toBe(true);
    expect(reduceExistingEncounterPlayerOnly(
      { ...exactSource, sourceKind: "trigger" },
      true,
      false,
    )).toBe(true);
  });

  it("materializes an exact byte only from admitted provenance", () => {
    expect(materializeExistingEncounterPlayerOnly(
      exactSource,
      { playerOnlyByte: 1 },
      false,
    )).toEqual({ playerOnlyByte: 0 });
    expect(materializeExistingEncounterPlayerOnly(
      { ...exactSource, encounterPlayerOnlyStorage: { playerOnlyByte: 2 } },
      { playerOnlyByte: 1 },
      false,
    )).toEqual({ playerOnlyByte: 1 });
  });
});
