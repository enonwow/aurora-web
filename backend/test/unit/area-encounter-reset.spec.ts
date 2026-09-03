import {
  areaEncounterResetStoragesEqual,
  readAreaEncounterResetStorage,
  readExistingAreaEncounterResetMutation,
} from "../../src/modules/areas/domain/area-encounter-reset";

describe("existing Area Encounter Reset contract", () => {
  it.each([0, 1])("admits exact canonical byte %i", (resetByte) => {
    const result = readAreaEncounterResetStorage({ resetByte });
    expect(result).toEqual({ resetByte });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ["negative", { resetByte: -1 }],
    ["noncanonical byte", { resetByte: 2 }],
    ["boolean alias", { resetByte: true }],
    ["missing", {}],
    ["unexpected key", { resetByte: 1, extra: true }],
  ])("rejects %s storage", (_label, value) => {
    expect(readAreaEncounterResetStorage(value)).toBeNull();
  });

  it("compares only admitted exact storage", () => {
    expect(areaEncounterResetStoragesEqual(
      { resetByte: 1 },
      { resetByte: 1 },
    )).toBe(true);
    expect(areaEncounterResetStoragesEqual(
      { resetByte: 1 },
      { resetByte: 0 },
    )).toBe(false);
    expect(areaEncounterResetStoragesEqual(
      { resetByte: 1 },
      { resetByte: 1, extra: true },
    )).toBe(false);
  });

  it("admits one complete changed compare-and-swap pair", () => {
    const result = readExistingAreaEncounterResetMutation({
      expectedValue: { resetByte: 1 },
      value: { resetByte: 0 },
    });
    expect(result).toEqual({
      expectedValue: { resetByte: 1 },
      value: { resetByte: 0 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.expectedValue)).toBe(true);
    expect(Object.isFrozen(result?.value)).toBe(true);
  });

  it.each([
    ["unchanged", {
      expectedValue: { resetByte: 1 }, value: { resetByte: 1 },
    }],
    ["invalid expected", {
      expectedValue: { resetByte: 2 }, value: { resetByte: 1 },
    }],
    ["invalid target", {
      expectedValue: { resetByte: 1 }, value: { resetByte: 2 },
    }],
    ["unexpected key", {
      expectedValue: { resetByte: 1 },
      value: { resetByte: 0 },
      extra: true,
    }],
  ])("rejects %s mutation", (_label, value) => {
    expect(readExistingAreaEncounterResetMutation(value)).toBeNull();
  });
});
