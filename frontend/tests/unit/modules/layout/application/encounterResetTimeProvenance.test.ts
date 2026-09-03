import {
  materializeExistingEncounterResetTime,
  reduceExistingEncounterResetTime,
} from "../../../../../src/modules/layout/application/encounterResetTimeProvenance";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterResetTimeStorage: { resetTime: 60 },
};

describe("retained Encounter ResetTime provenance", () => {
  it("reduces only a bounded integer while Reset is enabled", () => {
    expect(reduceExistingEncounterResetTime(exactSource, 60, 90, true, true)).toBe(90);
    expect(reduceExistingEncounterResetTime(exactSource, 60, 90, false, true)).toBe(60);
    expect(reduceExistingEncounterResetTime(exactSource, 60, 90, true, false)).toBe(60);
    expect(reduceExistingEncounterResetTime(exactSource, 60, 0, true, true)).toBe(60);
    expect(reduceExistingEncounterResetTime(
      { ...exactSource, sourceKind: "trigger" },
      60,
      90,
      true,
      true,
    )).toBe(60);
  });

  it("materializes exact storage without rewriting it when Reset becomes disabled", () => {
    expect(materializeExistingEncounterResetTime(
      exactSource,
      { resetTime: 60 },
      90,
    )).toEqual({ resetTime: 90 });
    expect(materializeExistingEncounterResetTime(
      { ...exactSource, encounterResetTimeStorage: { resetTime: 32_001 } },
      { resetTime: 60 },
      90,
    )).toEqual({ resetTime: 60 });
  });
});
