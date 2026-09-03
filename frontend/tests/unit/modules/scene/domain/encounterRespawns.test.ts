import {
  encounterRespawnsFinitePresentationFromStorage,
  encounterRespawnsInfinitePresentationFromStorage,
  readEncounterRespawnsStorage,
} from "../../../../../src/modules/scene/domain/encounterRespawns";

describe("Encounter Respawns storage", () => {
  it.each([-1, 0, 1, 32_000])("admits exact Toolset storage %i", (respawns) => {
    const result = readEncounterRespawnsStorage({ respawns });
    expect(result).toEqual({ respawns });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([-2, 32_001, 0.5, "-1"])("rejects noncanonical storage %p", (respawns) => {
    expect(readEncounterRespawnsStorage({ respawns })).toBeNull();
  });

  it("maps the Infinite sentinel to the exact Toolset presentation", () => {
    expect(encounterRespawnsInfinitePresentationFromStorage({ respawns: -1 })).toBe(true);
    expect(encounterRespawnsFinitePresentationFromStorage({ respawns: -1 })).toBe(0);
    expect(encounterRespawnsInfinitePresentationFromStorage({ respawns: 12 })).toBe(false);
    expect(encounterRespawnsFinitePresentationFromStorage({ respawns: 12 })).toBe(12);
  });
});
