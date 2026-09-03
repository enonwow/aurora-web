import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureFeatList,
  readCreatureFeatListStorage,
} from "../../../../../src/modules/scene/domain/creatureFeatList";

const table = {
  resourceName: "feat.2da" as const,
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key/feat.2da",
  sourceLayer: "vanilla" as const,
  sha256: "d".repeat(64),
  sizeBytes: 98_765,
  rowCount: 131,
};

describe("Creature FeatList provenance", () => {
  const exact = {
    present: true as const,
    nativeType: "list" as const,
    structTypeId: 1 as const,
    featNativeType: "word" as const,
    featIds: [0, 40, 130],
    opaqueSiblingFieldCounts: [0, 0, 0],
    table,
  };

  it("reads one exact ordered Word vector", () => {
    expect(readCreatureFeatListStorage(exact)).toEqual(exact);
    expect(readCreatureFeatListStorage(exact)?.present &&
      readCreatureFeatListStorage(exact)?.featIds).not.toBe(exact.featIds);
  });

  it.each([
    { ...exact, structTypeId: 0 },
    { ...exact, featNativeType: "int" },
    { ...exact, featIds: [0, 65_536] },
    { ...exact, opaqueSiblingFieldCounts: [0] },
    { ...exact, table: { ...table, resourceName: "skills.2da" } },
    { ...exact, extra: true },
  ])("rejects malformed provenance %#", (value) => {
    expect(readCreatureFeatListStorage(value)).toBeNull();
  });

  it("authorizes only a bound, unique, sibling-free retained Creature list", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceIndex: 0,
      creatureFeatList: exact,
    };
    expect(canEditExistingCreatureFeatList(source)).toBe(true);
    expect(canEditExistingCreatureFeatList({
      ...source,
      creatureFeatList: { ...exact, featIds: [40, 40, 130] },
    })).toBe(false);
    expect(canEditExistingCreatureFeatList({
      ...source,
      creatureFeatList: { ...exact, opaqueSiblingFieldCounts: [0, 1, 0] },
    })).toBe(false);
  });
});
