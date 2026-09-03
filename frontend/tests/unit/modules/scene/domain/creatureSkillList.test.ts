import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureSkillList,
  readCreatureSkillListStorage,
} from "../../../../../src/modules/scene/domain/creatureSkillList";

const table = {
  resourceName: "skills.2da" as const,
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key/skills.2da",
  sourceLayer: "vanilla" as const,
  sha256: "d".repeat(64),
  sizeBytes: 12_345,
  rowCount: 3,
};

describe("Creature SkillList provenance", () => {
  const exact = {
    present: true as const,
    nativeType: "list" as const,
    structTypeId: 0 as const,
    rankNativeType: "byte" as const,
    ranks: [4, 0, 7],
    opaqueSiblingFieldCounts: [1, 0, 2],
    table,
  };

  it("reads one exact full physical rank vector", () => {
    expect(readCreatureSkillListStorage(exact)).toEqual(exact);
    expect(readCreatureSkillListStorage(exact)?.present &&
      readCreatureSkillListStorage(exact)?.ranks).not.toBe(exact.ranks);
  });

  it.each([
    { ...exact, structTypeId: 1 },
    { ...exact, rankNativeType: "word" },
    { ...exact, ranks: [4, 256, 7] },
    { ...exact, opaqueSiblingFieldCounts: [0] },
    { ...exact, table: { ...table, resourceName: "packages.2da" } },
    { ...exact, extra: true },
  ])("rejects malformed provenance %#", (value) => {
    expect(readCreatureSkillListStorage(value)).toBeNull();
  });

  it("authorizes only exact retained Creature identity with a table binding", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceIndex: 0,
      creatureSkillList: exact,
    };
    expect(canEditExistingCreatureSkillList(source)).toBe(true);
    expect(canEditExistingCreatureSkillList({ ...source, sourceIndex: undefined })).toBe(false);
    expect(canEditExistingCreatureSkillList({
      ...source,
      creatureSkillList: { ...exact, table: undefined },
    })).toBe(false);
  });
});
