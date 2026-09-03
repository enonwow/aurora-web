import {
  materializeExistingEncounterReset,
  reduceExistingEncounterReset,
} from "../../../../../src/modules/layout/application/encounterResetProvenance";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterResetStorage: { resetByte: 1 as const },
};

describe("retained Encounter Reset provenance", () => {
  it("reduces only a source-bound boolean presentation", () => {
    expect(reduceExistingEncounterReset(exactSource, true, false)).toBe(false);
    expect(reduceExistingEncounterReset(exactSource, false, true)).toBe(true);
    expect(reduceExistingEncounterReset(exactSource, true, 0)).toBe(true);
    expect(reduceExistingEncounterReset(
      { ...exactSource, sourceKind: "trigger" },
      true,
      false,
    )).toBe(true);
  });

  it("materializes an exact byte only from admitted provenance", () => {
    expect(materializeExistingEncounterReset(
      exactSource,
      { resetByte: 1 },
      false,
    )).toEqual({ resetByte: 0 });
    expect(materializeExistingEncounterReset(
      { ...exactSource, encounterResetStorage: { resetByte: 2 } },
      { resetByte: 1 },
      false,
    )).toEqual({ resetByte: 1 });
  });
});
