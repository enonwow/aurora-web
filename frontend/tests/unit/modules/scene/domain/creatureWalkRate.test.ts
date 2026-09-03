import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureWalkRate,
  readCreatureWalkRateStorage,
} from "../../../../../src/modules/scene/domain/creatureWalkRate";

const table = {
  resourceName: "creaturespeed.2da" as const,
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key/creaturespeed.2da",
  sourceLayer: "vanilla" as const,
  sha256: "d".repeat(64),
  sizeBytes: 4_096,
  rowCount: 9,
  rowIndex: 4,
  twoDaName: "NORM",
};

describe("Creature WalkRate provenance", () => {
  it("reads one exact digest-bound native Int", () => {
    const input = { present: true as const, nativeType: "int" as const, value: 4, table };
    expect(readCreatureWalkRateStorage(input)).toEqual(input);
  });

  it.each([
    undefined,
    { present: false, value: 4 },
    { present: true, nativeType: "byte", value: 4, table },
    { present: true, nativeType: "int", value: 0, table: { ...table, rowIndex: 0 } },
    { present: true, nativeType: "int", value: 4, table: { ...table, rowIndex: 3 } },
    { present: true, nativeType: "int", value: 4, table: { ...table, twoDaName: "****" } },
    { present: true, nativeType: "int", value: 4, table: { ...table, sha256: "D".repeat(64) } },
  ])("rejects malformed or non-Toolset-bound storage %#", (input) => {
    expect(readCreatureWalkRateStorage(input)).toBeNull();
  });

  it("authorizes only an exact retained Creature source", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceIndex: 0,
      creatureWalkRate: {
        present: true as const,
        nativeType: "int" as const,
        value: 4,
        table,
      },
    };
    expect(canEditExistingCreatureWalkRate(source)).toBe(true);
    expect(canEditExistingCreatureWalkRate({ ...source, sourceIndex: undefined })).toBe(false);
    expect(canEditExistingCreatureWalkRate({
      ...source,
      creatureWalkRate: { present: true, nativeType: "int", value: 4 },
    })).toBe(false);
  });
});
