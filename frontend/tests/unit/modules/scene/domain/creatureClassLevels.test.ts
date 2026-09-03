import { describe, expect, it } from "vitest";
import {
  readCreatureClassLevelState,
} from "../../../../../src/modules/scene/domain/creatureClassLevels";

describe("Creature ClassLevel provenance", () => {
  const exact = {
    present: true as const,
    nativeType: "list" as const,
    structTypeId: 2 as const,
    classNativeType: "int" as const,
    levelNativeType: "short" as const,
    entries: [
      { classId: 4, level: 3, opaqueSiblingFieldCount: 2 },
      { classId: 7, level: 2, opaqueSiblingFieldCount: 1 },
    ],
  };

  it("reads one detached exact same-roster ClassList state", () => {
    const parsed = readCreatureClassLevelState(exact);
    expect(parsed).toEqual(exact);
    expect(parsed).not.toBe(exact);
    expect(parsed?.present && parsed.entries).not.toBe(exact.entries);
  });

  it("reads the exact absent state", () => {
    expect(readCreatureClassLevelState({ present: false })).toEqual({ present: false });
  });

  it.each([
    { ...exact, structTypeId: 0 },
    { ...exact, levelNativeType: "byte" },
    { ...exact, entries: [{ classId: 4, level: 0, opaqueSiblingFieldCount: 0 }] },
    { ...exact, entries: [{ classId: 4, level: 61, opaqueSiblingFieldCount: 0 }] },
    { ...exact, entries: [
      { classId: 4, level: 1, opaqueSiblingFieldCount: 0 },
      { classId: 4, level: 2, opaqueSiblingFieldCount: 0 },
    ] },
    { ...exact, entries: [
      { classId: 4, level: 60, opaqueSiblingFieldCount: 0 },
      { classId: 7, level: 60, opaqueSiblingFieldCount: 0 },
      { classId: 8, level: 60, opaqueSiblingFieldCount: 0 },
      { classId: 9, level: 1, opaqueSiblingFieldCount: 0 },
    ] },
    { ...exact, extra: true },
  ])("rejects malformed or unsafe provenance %#", (value) => {
    expect(readCreatureClassLevelState(value)).toBeNull();
  });
});
