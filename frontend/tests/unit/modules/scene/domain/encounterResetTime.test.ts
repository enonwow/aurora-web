import {
  canEditExistingEncounterResetTime,
  readEncounterResetTimeStorage,
} from "../../../../../src/modules/scene/domain/encounterResetTime";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterResetTimeStorage: { resetTime: 60 },
};

describe("retained Encounter ResetTime domain", () => {
  it.each([1, 60, 32_000])("admits exact bounded INT %i", (resetTime) => {
    const result = readEncounterResetTimeStorage({ resetTime });
    expect(result).toEqual({ resetTime });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    {},
    { resetTime: 0 },
    { resetTime: 32_001 },
    { resetTime: 1.5 },
    { resetTime: "60" },
    { resetTime: 60, extra: true },
  ])("rejects malformed storage %#", (candidate) => {
    expect(readEncounterResetTimeStorage(candidate)).toBeNull();
  });

  it("activates only for exact retained Encounter provenance", () => {
    expect(canEditExistingEncounterResetTime(exactSource)).toBe(true);
    expect(canEditExistingEncounterResetTime({ ...exactSource, sourceKind: "trigger" }))
      .toBe(false);
    expect(canEditExistingEncounterResetTime({ ...exactSource, sourceIndex: undefined }))
      .toBe(false);
    expect(canEditExistingEncounterResetTime({
      ...exactSource,
      encounterResetTimeStorage: { resetTime: 32_001 },
    })).toBe(false);
  });
});
