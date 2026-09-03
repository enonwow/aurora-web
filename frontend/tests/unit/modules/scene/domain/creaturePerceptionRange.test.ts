import { describe, expect, it } from "vitest";
import {
  canEditExistingCreaturePerceptionRange,
  readCreaturePerceptionRangeStorage,
} from "../../../../../src/modules/scene/domain/creaturePerceptionRange";

const table = {
  resourceName: "ranges.2da" as const,
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key/ranges.2da",
  sourceLayer: "vanilla" as const,
  sha256: "c".repeat(64),
  sizeBytes: 1220,
  rowCount: 12,
  rowIndex: 11 as const,
};

describe("Creature PerceptionRange provenance", () => {
  it("reads one exact digest-bound native Byte", () => {
    const input = { present: true as const, nativeType: "byte" as const, value: 11, table };
    expect(readCreaturePerceptionRangeStorage(input)).toEqual(input);
  });

  it.each([
    undefined,
    { present: false, value: 11 },
    { present: true, nativeType: "word", value: 11, table },
    { present: true, nativeType: "byte", value: 7, table: { ...table, rowIndex: 7 } },
    { present: true, nativeType: "byte", value: 11, table: { ...table, rowIndex: 10 } },
    { present: true, nativeType: "byte", value: 11, table: { ...table, sha256: "C".repeat(64) } },
  ])("rejects malformed or non-Toolset-bound storage %#", (input) => {
    expect(readCreaturePerceptionRangeStorage(input)).toBeNull();
  });

  it("authorizes only an exact retained Creature source", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceIndex: 0,
      creaturePerceptionRange: {
        present: true as const,
        nativeType: "byte" as const,
        value: 11,
        table,
      },
    };
    expect(canEditExistingCreaturePerceptionRange(source)).toBe(true);
    expect(canEditExistingCreaturePerceptionRange({ ...source, sourceIndex: undefined }))
      .toBe(false);
    expect(canEditExistingCreaturePerceptionRange({
      ...source,
      creaturePerceptionRange: { present: true, nativeType: "byte", value: 11 },
    })).toBe(false);
  });
});
