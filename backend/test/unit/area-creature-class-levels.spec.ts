import {
  readAreaCreatureClassLevelState,
  readExistingAreaCreatureClassLevelMutation,
} from "../../src/modules/areas/domain/area-creature-class-levels";

describe("Existing Area Creature same-roster class levels", () => {
  const storage = {
    present: true as const,
    nativeType: "list" as const,
    structTypeId: 2 as const,
    classNativeType: "int" as const,
    levelNativeType: "short" as const,
    entries: [
      { classId: 1, level: 3, opaqueSiblingFieldCount: 4 },
      { classId: 9, level: 2, opaqueSiblingFieldCount: 1 },
    ],
  };

  it("accepts exact ordered roster provenance and distinguishes absence", () => {
    expect(readAreaCreatureClassLevelState({ present: false })).toEqual({ present: false });
    expect(readAreaCreatureClassLevelState(storage)).toEqual(storage);
    expect(Object.isFrozen(readAreaCreatureClassLevelState(storage))).toBe(true);
  });

  it.each([
    { ...storage, structTypeId: 1 },
    { ...storage, classNativeType: "word" },
    { ...storage, levelNativeType: "byte" },
    { ...storage, entries: [] },
    { ...storage, entries: [{ classId: 1, level: 0, opaqueSiblingFieldCount: 0 }] },
    { ...storage, entries: [{ classId: 1, level: 61, opaqueSiblingFieldCount: 0 }] },
    { ...storage, entries: [{ classId: -1, level: 1, opaqueSiblingFieldCount: 0 }] },
    { ...storage, entries: [{ classId: 1, level: 1, opaqueSiblingFieldCount: -1 }] },
    { ...storage, entries: [
      { classId: 1, level: 60, opaqueSiblingFieldCount: 0 },
      { classId: 2, level: 60, opaqueSiblingFieldCount: 0 },
      { classId: 3, level: 60, opaqueSiblingFieldCount: 0 },
      { classId: 4, level: 1, opaqueSiblingFieldCount: 0 },
    ] },
    { ...storage, entries: [
      { classId: 1, level: 1, opaqueSiblingFieldCount: 0 },
      { classId: 1, level: 2, opaqueSiblingFieldCount: 0 },
    ] },
    { ...storage, extra: true },
  ])("rejects malformed, ambiguous, or Toolset-invalid storage %#", (value) => {
    expect(readAreaCreatureClassLevelState(value)).toBeNull();
  });

  it("accepts only a changed same-roster target", () => {
    const mutation = {
      expectedClassIds: [1, 9],
      expectedLevels: [3, 2],
      levels: [4, 2],
      opaqueSiblingFieldCounts: [4, 1],
    };
    expect(readExistingAreaCreatureClassLevelMutation(mutation)).toEqual(mutation);
  });

  it.each([
    { expectedClassIds: [1], expectedLevels: [3], levels: [3], opaqueSiblingFieldCounts: [0] },
    { expectedClassIds: [1], expectedLevels: [3], levels: [4, 2], opaqueSiblingFieldCounts: [0] },
    { expectedClassIds: [1, 1], expectedLevels: [3, 2], levels: [4, 2], opaqueSiblingFieldCounts: [0, 0] },
    { expectedClassIds: [1], expectedLevels: [3], levels: [0], opaqueSiblingFieldCounts: [0] },
    { expectedClassIds: [1], expectedLevels: [3], levels: [61], opaqueSiblingFieldCounts: [0] },
    { expectedClassIds: [1], expectedLevels: [3], levels: [4], opaqueSiblingFieldCounts: [-1] },
    { expectedClassIds: [1], expectedLevels: [3], levels: [4], opaqueSiblingFieldCounts: [0], extra: true },
  ])("rejects no-op or structurally unsafe target %#", (value) => {
    expect(readExistingAreaCreatureClassLevelMutation(value)).toBeNull();
  });
});
