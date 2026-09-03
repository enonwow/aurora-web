import {
  areaEncounterPlayerOnlyStoragesEqual,
  readAreaEncounterPlayerOnlyStorage,
  readExistingAreaEncounterPlayerOnlyMutation,
} from "../../src/modules/areas/domain/area-encounter-player-only";

describe("existing Area Encounter PlayerOnly contract", () => {
  it.each([0, 1])("admits exact canonical byte %i", (playerOnlyByte) => {
    const result = readAreaEncounterPlayerOnlyStorage({ playerOnlyByte });
    expect(result).toEqual({ playerOnlyByte });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ["negative", { playerOnlyByte: -1 }],
    ["noncanonical byte", { playerOnlyByte: 2 }],
    ["boolean alias", { playerOnlyByte: true }],
    ["missing", {}],
    ["unexpected key", { playerOnlyByte: 1, extra: true }],
  ])("rejects %s storage", (_label, value) => {
    expect(readAreaEncounterPlayerOnlyStorage(value)).toBeNull();
  });

  it("compares only admitted exact storage", () => {
    expect(areaEncounterPlayerOnlyStoragesEqual(
      { playerOnlyByte: 1 },
      { playerOnlyByte: 1 },
    )).toBe(true);
    expect(areaEncounterPlayerOnlyStoragesEqual(
      { playerOnlyByte: 1 },
      { playerOnlyByte: 0 },
    )).toBe(false);
    expect(areaEncounterPlayerOnlyStoragesEqual(
      { playerOnlyByte: 1 },
      { playerOnlyByte: 1, extra: true },
    )).toBe(false);
  });

  it("admits one complete changed compare-and-swap pair", () => {
    const result = readExistingAreaEncounterPlayerOnlyMutation({
      expectedValue: { playerOnlyByte: 1 },
      value: { playerOnlyByte: 0 },
    });
    expect(result).toEqual({
      expectedValue: { playerOnlyByte: 1 },
      value: { playerOnlyByte: 0 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.expectedValue)).toBe(true);
    expect(Object.isFrozen(result?.value)).toBe(true);
  });

  it.each([
    ["unchanged", {
      expectedValue: { playerOnlyByte: 1 }, value: { playerOnlyByte: 1 },
    }],
    ["invalid expected", {
      expectedValue: { playerOnlyByte: 2 }, value: { playerOnlyByte: 1 },
    }],
    ["invalid target", {
      expectedValue: { playerOnlyByte: 1 }, value: { playerOnlyByte: 2 },
    }],
    ["unexpected key", {
      expectedValue: { playerOnlyByte: 1 },
      value: { playerOnlyByte: 0 },
      extra: true,
    }],
  ])("rejects %s mutation", (_label, value) => {
    expect(readExistingAreaEncounterPlayerOnlyMutation(value)).toBeNull();
  });
});
