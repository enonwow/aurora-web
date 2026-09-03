import {
  materializeExistingEncounterCreatureCounts,
  reduceExistingEncounterMaximumCreatures,
  reduceExistingEncounterMinimumCreatures,
} from "../../../../../src/modules/layout/application/encounterCreatureCountsProvenance";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterCreatureCountsStorage: { maxCreatures: 4, recCreatures: 2 },
};

describe("retained Encounter creature-count provenance", () => {
  it("lowers Minimum when Maximum is edited below it", () => {
    expect(reduceExistingEncounterMaximumCreatures(
      exactSource,
      { maxCreatures: 4, recCreatures: 2 },
      1,
    )).toEqual({ maxCreatures: 1, recCreatures: 1 });
  });

  it("raises Maximum when Minimum is edited above it", () => {
    expect(reduceExistingEncounterMinimumCreatures(
      exactSource,
      { maxCreatures: 4, recCreatures: 2 },
      6,
    )).toEqual({ maxCreatures: 6, recCreatures: 6 });
  });

  it("preserves current target for invalid input or malformed provenance", () => {
    const current = { maxCreatures: 4, recCreatures: 2 };
    expect(reduceExistingEncounterMaximumCreatures(exactSource, current, 9)).toEqual(current);
    expect(reduceExistingEncounterMinimumCreatures(exactSource, current, 0)).toEqual(current);
    expect(reduceExistingEncounterMaximumCreatures(
      { ...exactSource, encounterCreatureCountsStorage: { maxCreatures: 2, recCreatures: 3 } },
      current,
      3,
    )).toEqual(current);
  });

  it("materializes only a valid exact pair backed by immutable provenance", () => {
    expect(materializeExistingEncounterCreatureCounts(
      exactSource,
      { maxCreatures: 4, recCreatures: 2 },
      { maxCreatures: 6, recCreatures: 5 },
    )).toEqual({ maxCreatures: 6, recCreatures: 5 });
    expect(materializeExistingEncounterCreatureCounts(
      { ...exactSource, encounterCreatureCountsStorage: undefined },
      { maxCreatures: 4, recCreatures: 2 },
      { maxCreatures: 6, recCreatures: 5 },
    )).toEqual({ maxCreatures: 4, recCreatures: 2 });
    expect(materializeExistingEncounterCreatureCounts(
      exactSource,
      { maxCreatures: 4, recCreatures: 2 },
      { maxCreatures: 2, recCreatures: 3 },
    )).toEqual({ maxCreatures: 4, recCreatures: 2 });
  });
});
