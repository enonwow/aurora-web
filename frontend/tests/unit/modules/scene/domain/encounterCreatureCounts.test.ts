import {
  readEncounterCreatureCountStorage,
} from "../../../../../src/modules/scene/domain/encounterCreatureCounts";

describe("Encounter creature-count storage", () => {
  it.each([[1, 1], [4, 2], [8, 8]])(
    "admits exact coherent Toolset pair max=%i min=%i",
    (maxCreatures, recCreatures) => {
      const result = readEncounterCreatureCountStorage({ maxCreatures, recCreatures });
      expect(result).toEqual({ maxCreatures, recCreatures });
      expect(Object.isFrozen(result)).toBe(true);
    },
  );

  it.each([
    { maxCreatures: 0, recCreatures: 1 },
    { maxCreatures: 9, recCreatures: 1 },
    { maxCreatures: 4, recCreatures: 0 },
    { maxCreatures: 8, recCreatures: 9 },
    { maxCreatures: 2, recCreatures: 3 },
    { maxCreatures: 4.5, recCreatures: 2 },
    { maxCreatures: "4", recCreatures: 2 },
    { maxCreatures: 4 },
    { maxCreatures: 4, recCreatures: 2, extra: true },
  ])("rejects noncanonical storage %p", (value) => {
    expect(readEncounterCreatureCountStorage(value)).toBeNull();
  });
});
