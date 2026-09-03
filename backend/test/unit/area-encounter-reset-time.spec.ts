import {
  areaEncounterResetTimeStoragesEqual,
  readAreaEncounterResetTimeStorage,
  readExistingAreaEncounterResetTimeMutation,
} from "../../src/modules/areas/domain/area-encounter-reset-time";

describe("existing Area Encounter ResetTime contract", () => {
  it.each([1, 60, 32_000])("admits exact bounded INT %i", (resetTime) => {
    const result = readAreaEncounterResetTimeStorage({ resetTime });
    expect(result).toEqual({ resetTime });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ["below minimum", { resetTime: 0 }],
    ["above maximum", { resetTime: 32_001 }],
    ["fraction", { resetTime: 1.5 }],
    ["string alias", { resetTime: "60" }],
    ["missing", {}],
    ["unexpected key", { resetTime: 60, extra: true }],
  ])("rejects %s storage", (_label, value) => {
    expect(readAreaEncounterResetTimeStorage(value)).toBeNull();
  });

  it("compares only admitted exact storage", () => {
    expect(areaEncounterResetTimeStoragesEqual(
      { resetTime: 60 },
      { resetTime: 60 },
    )).toBe(true);
    expect(areaEncounterResetTimeStoragesEqual(
      { resetTime: 60 },
      { resetTime: 90 },
    )).toBe(false);
    expect(areaEncounterResetTimeStoragesEqual(
      { resetTime: 60 },
      { resetTime: 60, extra: true },
    )).toBe(false);
  });

  it("admits one complete changed compare-and-swap pair", () => {
    const result = readExistingAreaEncounterResetTimeMutation({
      expectedValue: { resetTime: 60 },
      value: { resetTime: 90 },
    });
    expect(result).toEqual({
      expectedValue: { resetTime: 60 },
      value: { resetTime: 90 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.expectedValue)).toBe(true);
    expect(Object.isFrozen(result?.value)).toBe(true);
  });

  it.each([
    ["unchanged", {
      expectedValue: { resetTime: 60 }, value: { resetTime: 60 },
    }],
    ["invalid expected", {
      expectedValue: { resetTime: 0 }, value: { resetTime: 60 },
    }],
    ["invalid target", {
      expectedValue: { resetTime: 60 }, value: { resetTime: 32_001 },
    }],
    ["unexpected key", {
      expectedValue: { resetTime: 60 },
      value: { resetTime: 90 },
      extra: true,
    }],
  ])("rejects %s mutation", (_label, value) => {
    expect(readExistingAreaEncounterResetTimeMutation(value)).toBeNull();
  });
});
