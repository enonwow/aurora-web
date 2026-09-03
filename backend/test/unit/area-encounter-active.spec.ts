import {
  areaEncounterActiveStoragesEqual,
  readAreaEncounterActiveStorage,
  readExistingAreaEncounterActiveMutation,
} from "../../src/modules/areas/domain/area-encounter-active";

describe("existing Area Encounter Active contract", () => {
  it.each([0, 1])("admits exact canonical byte %i", (activeByte) => {
    const result = readAreaEncounterActiveStorage({ activeByte });
    expect(result).toEqual({ activeByte });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ["negative", { activeByte: -1 }],
    ["noncanonical byte", { activeByte: 2 }],
    ["boolean alias", { activeByte: true }],
    ["missing", {}],
    ["unexpected key", { activeByte: 1, extra: true }],
  ])("rejects %s storage", (_label, value) => {
    expect(readAreaEncounterActiveStorage(value)).toBeNull();
  });

  it("compares only admitted exact storage", () => {
    expect(areaEncounterActiveStoragesEqual({ activeByte: 1 }, { activeByte: 1 })).toBe(true);
    expect(areaEncounterActiveStoragesEqual({ activeByte: 1 }, { activeByte: 0 })).toBe(false);
    expect(areaEncounterActiveStoragesEqual(
      { activeByte: 1 },
      { activeByte: 1, extra: true },
    )).toBe(false);
  });

  it("admits one complete changed compare-and-swap pair", () => {
    const result = readExistingAreaEncounterActiveMutation({
      expectedValue: { activeByte: 1 },
      value: { activeByte: 0 },
    });
    expect(result).toEqual({
      expectedValue: { activeByte: 1 },
      value: { activeByte: 0 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.expectedValue)).toBe(true);
    expect(Object.isFrozen(result?.value)).toBe(true);
  });

  it.each([
    ["unchanged", { expectedValue: { activeByte: 1 }, value: { activeByte: 1 } }],
    ["invalid expected", { expectedValue: { activeByte: 2 }, value: { activeByte: 1 } }],
    ["invalid target", { expectedValue: { activeByte: 1 }, value: { activeByte: 2 } }],
    ["unexpected key", {
      expectedValue: { activeByte: 1 }, value: { activeByte: 0 }, extra: true,
    }],
  ])("rejects %s mutation", (_label, value) => {
    expect(readExistingAreaEncounterActiveMutation(value)).toBeNull();
  });
});
