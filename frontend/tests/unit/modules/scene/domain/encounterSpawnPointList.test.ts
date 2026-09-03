import { describe, expect, it } from "vitest";
import {
  encounterSpawnPointTargetEntriesEqual,
  readEncounterSpawnPointListProvenance,
  readEncounterSpawnPointTargetEntries,
  sourceEncounterSpawnPointsToTarget,
} from "../../../../../src/modules/scene/domain/encounterSpawnPointList";

describe("Encounter SpawnPointList domain", () => {
  const expectedEntries = [
    { sourceIndex: 0, nativeX: 22.5, nativeY: 45.25, nativeZ: 0, orientation: 1.5 },
    { sourceIndex: 1, nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
  ];

  it("reads exact source provenance and projects a detached target", () => {
    const source = readEncounterSpawnPointListProvenance({ expectedEntries });
    expect(source).toEqual({ expectedEntries });
    const target = sourceEncounterSpawnPointsToTarget(source!.expectedEntries);
    expect(target).toEqual(expectedEntries.map(({ sourceIndex: _, ...entry }) => entry));
    expect(target[0]).not.toBe(source!.expectedEntries[0]);
  });

  it("admits structural target changes and compares exact values", () => {
    const target = readEncounterSpawnPointTargetEntries([
      { nativeX: 1, nativeY: 2, nativeZ: 3, orientation: 0 },
    ]);
    expect(target).toEqual([{ nativeX: 1, nativeY: 2, nativeZ: 3, orientation: 0 }]);
    expect(encounterSpawnPointTargetEntriesEqual(target, target!)).toBe(true);
    expect(encounterSpawnPointTargetEntriesEqual([], target!)).toBe(false);
  });

  it("rejects non-binary32, non-contiguous, unknown-key, and over-budget input", () => {
    expect(readEncounterSpawnPointListProvenance({
      expectedEntries: [{ ...expectedEntries[0], sourceIndex: 1 }],
    })).toBeNull();
    expect(readEncounterSpawnPointTargetEntries([
      { nativeX: 0.1, nativeY: 0, nativeZ: 0, orientation: 0 },
    ])).toBeNull();
    expect(readEncounterSpawnPointTargetEntries([
      { nativeX: 0, nativeY: 0, nativeZ: 0, orientation: 0, extra: true },
    ])).toBeNull();
    expect(readEncounterSpawnPointTargetEntries(Array.from({ length: 1025 }, () => ({
      nativeX: 0,
      nativeY: 0,
      nativeZ: 0,
      orientation: 0,
    })))).toBeNull();
  });
});
