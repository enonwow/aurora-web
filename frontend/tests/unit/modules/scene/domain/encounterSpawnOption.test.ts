import {
  ENCOUNTER_SPAWN_OPTION_ROWS,
  canEditExistingEncounterSpawnOption,
  readEncounterSpawnOptionStorage,
} from "../../../../../src/modules/scene/domain/encounterSpawnOption";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterSpawnOptionStorage: { spawnOption: 0 as const },
};

describe("retained Encounter SpawnOption domain", () => {
  it.each([0, 1] as const)("admits exact Toolset combo index %i", (spawnOption) => {
    const result = readEncounterSpawnOptionStorage({ spawnOption });
    expect(result).toEqual({ spawnOption });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("freezes the decomp/TLK-bound ordered labels", () => {
    expect(ENCOUNTER_SPAWN_OPTION_ROWS).toEqual([
      { spawnOption: 0, label: "Continuous" },
      { spawnOption: 1, label: "Single Shot" },
    ]);
    expect(Object.isFrozen(ENCOUNTER_SPAWN_OPTION_ROWS)).toBe(true);
  });

  it.each([
    {},
    { spawnOption: -1 },
    { spawnOption: 2 },
    { spawnOption: 0.5 },
    { spawnOption: "0" },
    { spawnOption: 0, extra: true },
  ])("rejects malformed storage %#", (candidate) => {
    expect(readEncounterSpawnOptionStorage(candidate)).toBeNull();
  });

  it("activates only for exact retained Encounter provenance", () => {
    expect(canEditExistingEncounterSpawnOption(exactSource)).toBe(true);
    expect(canEditExistingEncounterSpawnOption({ ...exactSource, sourceKind: "trigger" }))
      .toBe(false);
    expect(canEditExistingEncounterSpawnOption({ ...exactSource, sourceIndex: undefined }))
      .toBe(false);
    expect(canEditExistingEncounterSpawnOption({
      ...exactSource,
      encounterSpawnOptionStorage: { spawnOption: 2 },
    })).toBe(false);
  });
});
