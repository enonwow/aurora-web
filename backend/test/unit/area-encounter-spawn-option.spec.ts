import {
  areaEncounterSpawnOptionStoragesEqual,
  readAreaEncounterSpawnOptionStorage,
  readExistingAreaEncounterSpawnOptionMutation,
} from "../../src/modules/areas/domain/area-encounter-spawn-option";

describe("existing Area Encounter SpawnOption contract", () => {
  it.each([0, 1])("admits exact Toolset combo index %i", (spawnOption) => {
    const result = readAreaEncounterSpawnOptionStorage({ spawnOption });
    expect(result).toEqual({ spawnOption });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ["below range", { spawnOption: -1 }],
    ["above range", { spawnOption: 2 }],
    ["fraction", { spawnOption: 0.5 }],
    ["string alias", { spawnOption: "0" }],
    ["missing", {}],
    ["unexpected key", { spawnOption: 0, extra: true }],
  ])("rejects %s storage", (_label, value) => {
    expect(readAreaEncounterSpawnOptionStorage(value)).toBeNull();
  });

  it("compares only admitted exact storage", () => {
    expect(areaEncounterSpawnOptionStoragesEqual(
      { spawnOption: 0 },
      { spawnOption: 0 },
    )).toBe(true);
    expect(areaEncounterSpawnOptionStoragesEqual(
      { spawnOption: 0 },
      { spawnOption: 1 },
    )).toBe(false);
    expect(areaEncounterSpawnOptionStoragesEqual(
      { spawnOption: 0 },
      { spawnOption: 0, extra: true },
    )).toBe(false);
  });

  it("admits one complete changed compare-and-swap pair", () => {
    const result = readExistingAreaEncounterSpawnOptionMutation({
      expectedValue: { spawnOption: 0 },
      value: { spawnOption: 1 },
    });
    expect(result).toEqual({
      expectedValue: { spawnOption: 0 },
      value: { spawnOption: 1 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.expectedValue)).toBe(true);
    expect(Object.isFrozen(result?.value)).toBe(true);
  });

  it.each([
    ["unchanged", {
      expectedValue: { spawnOption: 0 }, value: { spawnOption: 0 },
    }],
    ["invalid expected", {
      expectedValue: { spawnOption: -1 }, value: { spawnOption: 0 },
    }],
    ["invalid target", {
      expectedValue: { spawnOption: 0 }, value: { spawnOption: 2 },
    }],
    ["unexpected key", {
      expectedValue: { spawnOption: 0 },
      value: { spawnOption: 1 },
      extra: true,
    }],
  ])("rejects %s mutation", (_label, value) => {
    expect(readExistingAreaEncounterSpawnOptionMutation(value)).toBeNull();
  });
});
