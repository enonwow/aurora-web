import {
  materializeExistingEncounterRespawns,
  reduceExistingEncounterRespawnsFinite,
  reduceExistingEncounterRespawnsInfinite,
} from "../../../../../src/modules/layout/application/encounterRespawnsProvenance";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterRespawnsStorage: { respawns: 4 },
};

describe("retained Encounter Respawns provenance", () => {
  it("edits finite value only while Continuous, Reset and finite mode are active", () => {
    expect(reduceExistingEncounterRespawnsFinite(
      exactSource, 4, 8, true, true, false,
    )).toBe(8);
    expect(reduceExistingEncounterRespawnsFinite(
      exactSource, 4, 8, false, true, false,
    )).toBe(4);
    expect(reduceExistingEncounterRespawnsFinite(
      exactSource, 4, 8, true, false, false,
    )).toBe(4);
    expect(reduceExistingEncounterRespawnsFinite(
      exactSource, 4, 8, true, true, true,
    )).toBe(4);
    expect(reduceExistingEncounterRespawnsFinite(
      exactSource, 4, 32_001, true, true, false,
    )).toBe(4);
  });

  it("edits Infinite only while Continuous and Reset are active", () => {
    expect(reduceExistingEncounterRespawnsInfinite(
      exactSource, false, true, true, true,
    )).toBe(true);
    expect(reduceExistingEncounterRespawnsInfinite(
      exactSource, false, true, false, true,
    )).toBe(false);
    expect(reduceExistingEncounterRespawnsInfinite(
      exactSource, false, true, true, false,
    )).toBe(false);
    expect(reduceExistingEncounterRespawnsInfinite(
      exactSource, false, "true", true, true,
    )).toBe(false);
  });

  it("materializes sentinel or current finite value without erasing the finite draft", () => {
    expect(materializeExistingEncounterRespawns(
      exactSource, { respawns: 4 }, 9, true,
    )).toEqual({ respawns: -1 });
    expect(materializeExistingEncounterRespawns(
      exactSource, { respawns: 4 }, 9, false,
    )).toEqual({ respawns: 9 });
    expect(materializeExistingEncounterRespawns(
      { ...exactSource, encounterRespawnsStorage: { respawns: -2 } },
      { respawns: 4 },
      9,
      true,
    )).toEqual({ respawns: 4 });
  });
});
