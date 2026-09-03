import {
  areaEncounterCreatureCountStoragesEqual,
  readAreaEncounterCreatureCountStorage,
  readExistingAreaEncounterCreatureCountMutation,
} from "../../src/modules/areas/domain/area-encounter-creature-counts";

describe("existing Area Encounter creature-count pair contract", () => {
  it.each([
    [1, 1],
    [4, 2],
    [8, 8],
  ])("admits exact coherent Toolset pair max=%i min=%i", (maxCreatures, recCreatures) => {
    const result = readAreaEncounterCreatureCountStorage({ maxCreatures, recCreatures });
    expect(result).toEqual({ maxCreatures, recCreatures });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ["maximum below range", { maxCreatures: 0, recCreatures: 1 }],
    ["maximum above range", { maxCreatures: 9, recCreatures: 1 }],
    ["minimum below range", { maxCreatures: 4, recCreatures: 0 }],
    ["minimum above range", { maxCreatures: 8, recCreatures: 9 }],
    ["minimum above maximum", { maxCreatures: 3, recCreatures: 4 }],
    ["fraction", { maxCreatures: 4.5, recCreatures: 2 }],
    ["string alias", { maxCreatures: "4", recCreatures: 2 }],
    ["partial", { maxCreatures: 4 }],
    ["unexpected key", { maxCreatures: 4, recCreatures: 2, extra: true }],
  ])("rejects %s storage", (_label, value) => {
    expect(readAreaEncounterCreatureCountStorage(value)).toBeNull();
  });

  it("compares only admitted exact storage", () => {
    expect(areaEncounterCreatureCountStoragesEqual(
      { maxCreatures: 4, recCreatures: 2 },
      { maxCreatures: 4, recCreatures: 2 },
    )).toBe(true);
    expect(areaEncounterCreatureCountStoragesEqual(
      { maxCreatures: 4, recCreatures: 2 },
      { maxCreatures: 5, recCreatures: 2 },
    )).toBe(false);
    expect(areaEncounterCreatureCountStoragesEqual(
      { maxCreatures: 4, recCreatures: 2 },
      { maxCreatures: 4, recCreatures: 2, extra: true },
    )).toBe(false);
  });

  it("admits one complete changed pair compare-and-swap", () => {
    const result = readExistingAreaEncounterCreatureCountMutation({
      expectedValue: { maxCreatures: 4, recCreatures: 2 },
      value: { maxCreatures: 3, recCreatures: 3 },
    });
    expect(result).toEqual({
      expectedValue: { maxCreatures: 4, recCreatures: 2 },
      value: { maxCreatures: 3, recCreatures: 3 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.expectedValue)).toBe(true);
    expect(Object.isFrozen(result?.value)).toBe(true);
  });

  it.each([
    ["unchanged", {
      expectedValue: { maxCreatures: 4, recCreatures: 2 },
      value: { maxCreatures: 4, recCreatures: 2 },
    }],
    ["invalid expected", {
      expectedValue: { maxCreatures: 2, recCreatures: 3 },
      value: { maxCreatures: 4, recCreatures: 2 },
    }],
    ["invalid target", {
      expectedValue: { maxCreatures: 4, recCreatures: 2 },
      value: { maxCreatures: 9, recCreatures: 2 },
    }],
    ["unexpected key", {
      expectedValue: { maxCreatures: 4, recCreatures: 2 },
      value: { maxCreatures: 3, recCreatures: 3 },
      extra: true,
    }],
  ])("rejects %s mutation", (_label, value) => {
    expect(readExistingAreaEncounterCreatureCountMutation(value)).toBeNull();
  });
});
