import {
  AreaEncounterSpawnPointListValidationError,
  areaEncounterSpawnPointSourceEntriesEqual,
  areaEncounterSpawnPointTargetEntriesEqual,
  parseAreaEncounterSpawnPointListMutation,
  parseAreaEncounterSpawnPointListProvenance,
  parseAreaEncounterSpawnPointTargetEntries,
  projectAreaEncounterSpawnPointListMutation,
  projectAreaEncounterSpawnPointSourceEntries,
} from "../../src/modules/areas/domain/area-encounter-spawn-point-list";

describe("Area Encounter SpawnPointList domain", () => {
  const expectedEntries = Object.freeze([
    Object.freeze({
      sourceIndex: 0,
      nativeX: Math.fround(22.5),
      nativeY: Math.fround(45.25),
      nativeZ: Math.fround(0),
      orientation: Math.fround(1.5),
    }),
    Object.freeze({
      sourceIndex: 1,
      nativeX: Math.fround(-3.75),
      nativeY: Math.fround(9.5),
      nativeZ: Math.fround(0.125),
      orientation: Math.fround(-2.25),
    }),
  ]);

  const targetEntries = expectedEntries.map(({ sourceIndex: _, ...entry }) => ({ ...entry }));

  it("admits the exact ordered native-float provenance and detached target", () => {
    expect(parseAreaEncounterSpawnPointListProvenance({ expectedEntries }))
      .toEqual({ expectedEntries });
    expect(parseAreaEncounterSpawnPointTargetEntries(targetEntries)).toEqual(targetEntries);
    expect(projectAreaEncounterSpawnPointSourceEntries(expectedEntries)).toEqual(targetEntries);
  });

  it("projects an edit as one complete source-to-target CAS pair", () => {
    const entries = [
      { ...targetEntries[0]!, nativeX: Math.fround(23.5) },
      targetEntries[1]!,
    ];
    const mutation = projectAreaEncounterSpawnPointListMutation(
      { expectedEntries },
      entries,
    );
    expect(mutation).toEqual({ expectedEntries, entries });
    expect(parseAreaEncounterSpawnPointListMutation(mutation)).toEqual(mutation);
  });

  it("admits add, remove, and reorder structural targets", () => {
    const added = [
      targetEntries[1]!,
      targetEntries[0]!,
      { nativeX: 1, nativeY: 2, nativeZ: 3, orientation: 0 },
    ];
    expect(projectAreaEncounterSpawnPointListMutation(
      { expectedEntries },
      added,
    )).toEqual({ expectedEntries, entries: added });
    expect(projectAreaEncounterSpawnPointListMutation(
      { expectedEntries },
      [targetEntries[1]!],
    )).toEqual({ expectedEntries, entries: [targetEntries[1]] });
    expect(projectAreaEncounterSpawnPointListMutation(
      { expectedEntries },
      [],
    )).toEqual({ expectedEntries, entries: [] });
  });

  it("returns undefined for an unchanged detached target", () => {
    expect(projectAreaEncounterSpawnPointListMutation(
      { expectedEntries },
      targetEntries,
    )).toBeUndefined();
  });

  it("compares source and target vectors without coercion", () => {
    expect(areaEncounterSpawnPointSourceEntriesEqual(expectedEntries, expectedEntries)).toBe(true);
    expect(areaEncounterSpawnPointTargetEntriesEqual(targetEntries, targetEntries)).toBe(true);
    expect(areaEncounterSpawnPointTargetEntriesEqual(targetEntries, [
      { ...targetEntries[0]!, orientation: Math.fround(2.5) },
      targetEntries[1]!,
    ])).toBe(false);
  });

  it.each([
    { expectedEntries: [{ ...expectedEntries[0]!, sourceIndex: 1 }] },
    { expectedEntries: [{ ...expectedEntries[0]!, nativeX: 0.1 }] },
    { expectedEntries: [{ ...expectedEntries[0]!, nativeY: Number.NaN }] },
    { expectedEntries: [{ ...expectedEntries[0]!, orientation: Number.POSITIVE_INFINITY }] },
    { expectedEntries, extra: true },
  ])("rejects malformed source provenance %#", (value) => {
    expect(() => parseAreaEncounterSpawnPointListProvenance(value))
      .toThrow(AreaEncounterSpawnPointListValidationError);
  });

  it("rejects malformed targets, unchanged wire mutations, and unknown keys", () => {
    expect(() => parseAreaEncounterSpawnPointTargetEntries([
      { ...targetEntries[0]!, nativeZ: 0.1 },
    ])).toThrow(AreaEncounterSpawnPointListValidationError);
    expect(() => parseAreaEncounterSpawnPointTargetEntries([
      { ...targetEntries[0]!, extra: true },
    ])).toThrow(AreaEncounterSpawnPointListValidationError);
    expect(() => parseAreaEncounterSpawnPointListMutation({
      expectedEntries,
      entries: targetEntries,
    })).toThrow(/unchanged/u);
  });

  it("enforces the bounded entry count", () => {
    const overBudget = Array.from({ length: 1025 }, () => ({
      nativeX: 0,
      nativeY: 0,
      nativeZ: 0,
      orientation: 0,
    }));
    expect(() => parseAreaEncounterSpawnPointTargetEntries(overBudget))
      .toThrow(/count/u);
  });
});
