import {
  areaEncounterRespawnsStoragesEqual,
  readAreaEncounterRespawnsStorage,
  readExistingAreaEncounterRespawnsMutation,
} from "../../src/modules/areas/domain/area-encounter-respawns";

describe("existing Area Encounter Respawns contract", () => {
  it.each([-1, 0, 1, 32_000])(
    "admits exact finite-or-Infinite Toolset INT %i",
    (respawns) => {
      const result = readAreaEncounterRespawnsStorage({ respawns });
      expect(result).toEqual({ respawns });
      expect(Object.isFrozen(result)).toBe(true);
    },
  );

  it.each([
    ["below sentinel", { respawns: -2 }],
    ["above finite range", { respawns: 32_001 }],
    ["fraction", { respawns: 0.5 }],
    ["string alias", { respawns: "-1" }],
    ["missing", {}],
    ["unexpected key", { respawns: 0, infinite: false }],
  ])("rejects %s storage", (_label, value) => {
    expect(readAreaEncounterRespawnsStorage(value)).toBeNull();
  });

  it("compares only admitted exact storage", () => {
    expect(areaEncounterRespawnsStoragesEqual(
      { respawns: -1 },
      { respawns: -1 },
    )).toBe(true);
    expect(areaEncounterRespawnsStoragesEqual(
      { respawns: -1 },
      { respawns: 0 },
    )).toBe(false);
    expect(areaEncounterRespawnsStoragesEqual(
      { respawns: 0 },
      { respawns: 0, extra: true },
    )).toBe(false);
  });

  it("admits one complete changed compare-and-swap pair", () => {
    const result = readExistingAreaEncounterRespawnsMutation({
      expectedValue: { respawns: 0 },
      value: { respawns: -1 },
    });
    expect(result).toEqual({
      expectedValue: { respawns: 0 },
      value: { respawns: -1 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.expectedValue)).toBe(true);
    expect(Object.isFrozen(result?.value)).toBe(true);
  });

  it.each([
    ["unchanged", {
      expectedValue: { respawns: 0 }, value: { respawns: 0 },
    }],
    ["invalid expected", {
      expectedValue: { respawns: -2 }, value: { respawns: 0 },
    }],
    ["invalid target", {
      expectedValue: { respawns: 0 }, value: { respawns: 32_001 },
    }],
    ["unexpected key", {
      expectedValue: { respawns: 0 },
      value: { respawns: -1 },
      extra: true,
    }],
  ])("rejects %s mutation", (_label, value) => {
    expect(readExistingAreaEncounterRespawnsMutation(value)).toBeNull();
  });
});
