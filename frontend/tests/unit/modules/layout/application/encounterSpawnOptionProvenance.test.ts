import {
  materializeExistingEncounterSpawnOption,
  reduceExistingEncounterSpawnOption,
} from "../../../../../src/modules/layout/application/encounterSpawnOptionProvenance";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterSpawnOptionStorage: { spawnOption: 0 as const },
};

describe("retained Encounter SpawnOption provenance", () => {
  it("reduces only an exact Toolset combo index", () => {
    expect(reduceExistingEncounterSpawnOption(exactSource, 0, 1)).toBe(1);
    expect(reduceExistingEncounterSpawnOption(exactSource, 0, 2)).toBe(0);
    expect(reduceExistingEncounterSpawnOption(
      { ...exactSource, sourceKind: "trigger" },
      0,
      1,
    )).toBe(0);
  });

  it("materializes exact storage and preserves malformed provenance", () => {
    expect(materializeExistingEncounterSpawnOption(
      exactSource,
      { spawnOption: 0 },
      1,
    )).toEqual({ spawnOption: 1 });
    expect(materializeExistingEncounterSpawnOption(
      { ...exactSource, encounterSpawnOptionStorage: { spawnOption: 2 } },
      { spawnOption: 0 },
      1,
    )).toEqual({ spawnOption: 0 });
  });
});
