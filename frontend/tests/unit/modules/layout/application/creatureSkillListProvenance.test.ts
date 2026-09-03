import { describe, expect, it, vi } from "vitest";
import {
  isExistingCreatureSkillCatalogAdmitted,
  loadExistingCreatureSkillCatalog,
  materializeExistingCreatureSkills,
  readExistingCreatureSkillListProvenance,
  resolveCreatureSkillDisplayName,
} from "../../../../../src/modules/layout/application/creatureSkillListProvenance";

const TABLE_SHA256 = "d".repeat(64);

function exactSource(rowCount = 3) {
  return {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creatureSkillList: {
      present: true as const,
      nativeType: "list" as const,
      structTypeId: 0 as const,
      rankNativeType: "byte" as const,
      ranks: [4, 0],
      opaqueSiblingFieldCounts: [1, 0],
      table: {
        resourceName: "skills.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/skills.2da",
        sourceLayer: "vanilla" as const,
        sha256: TABLE_SHA256,
        sizeBytes: 12_345,
        rowCount,
      },
    },
  };
}

describe("existing Creature SkillList provenance", () => {
  it("loads every visible page without renumbering omitted physical rows", async () => {
    const rows = Array.from({ length: 129 }, (_, rowIndex) => ({
      rowIndex: rowIndex === 128 ? 130 : rowIndex,
      nameStrRef: 10_000 + rowIndex,
      displayName: `Skill ${rowIndex}`,
    }));
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "skills.2da",
        sha256: TABLE_SHA256,
        rowCount: 131,
        items: rows.slice(0, 128),
        total: 129,
        limit: 128,
        offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "skills.2da",
        sha256: TABLE_SHA256,
        rowCount: 131,
        items: rows.slice(128),
        total: 129,
        limit: 128,
        offset: 128,
      });

    const catalog = await loadExistingCreatureSkillCatalog(
      { queries: { listRows } },
      "token",
      exactSource(131),
    );

    expect(readExistingCreatureSkillListProvenance(exactSource(131))).toEqual({
      tableSha256: TABLE_SHA256,
      rowCount: 131,
      sourceRanks: [4, 0],
    });
    expect(catalog.items).toHaveLength(129);
    expect(catalog.items.at(-1)?.rowIndex).toBe(130);
    expect(isExistingCreatureSkillCatalogAdmitted(exactSource(131), catalog)).toBe(true);
    expect(resolveCreatureSkillDisplayName(130, catalog, "Skill 131")).toBe("Skill 128");
    expect(listRows).toHaveBeenNthCalledWith(2, "token", {
      tableSha256: TABLE_SHA256,
      limit: 128,
      offset: 128,
    });
  });

  it("fails closed when a later page has a different skills.2da identity", async () => {
    const firstPage = Array.from({ length: 128 }, (_, rowIndex) => ({
      rowIndex,
      nameStrRef: 20_000 + rowIndex,
      displayName: `Skill ${rowIndex}`,
    }));
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "skills.2da",
        sha256: TABLE_SHA256,
        rowCount: 131,
        items: firstPage,
        total: 129,
        limit: 128,
        offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "skills.2da",
        sha256: "e".repeat(64),
        rowCount: 131,
        items: [{ rowIndex: 130, nameStrRef: 30_000, displayName: "Hidden gap retained" }],
        total: 129,
        limit: 128,
        offset: 128,
      });

    await expect(loadExistingCreatureSkillCatalog(
      { queries: { listRows } },
      "token",
      exactSource(131),
    )).rejects.toMatchObject({ code: "CREATURE_SKILL_CATALOG_STALE" });
  });

  it("does not admit a catalog with a mismatched physical row count", () => {
    expect(isExistingCreatureSkillCatalogAdmitted(exactSource(), {
      tableSha256: TABLE_SHA256,
      rowCount: 4,
      items: [],
    })).toBe(false);
  });

  it("applies visible ranks only and preserves omitted physical rows", () => {
    const current = [
      { skillId: 0, skill: "Skill 1", rank: 4 },
      { skillId: 1, skill: "Skill 2", rank: 0 },
      { skillId: 2, skill: "Skill 3", rank: 0 },
    ];
    const candidate = [
      { skillId: 0, skill: "Skill 1", rank: 7 },
      { skillId: 1, skill: "Hidden", rank: 9 },
      { skillId: 2, skill: "Skill 3", rank: 2 },
    ];
    const catalog = {
      tableSha256: TABLE_SHA256,
      rowCount: 3,
      items: [
        { rowIndex: 0, nameStrRef: 100, displayName: "Visible zero" },
        { rowIndex: 2, nameStrRef: 102, displayName: "Visible two" },
      ],
    };

    expect(materializeExistingCreatureSkills(exactSource(), current, candidate, catalog))
      .toEqual([
        { skillId: 0, skill: "Visible zero", rank: 7 },
        { skillId: 1, skill: "Skill 2", rank: 0 },
        { skillId: 2, skill: "Visible two", rank: 2 },
      ]);
    expect(materializeExistingCreatureSkills(exactSource(), current, candidate, null))
      .toEqual(current);
  });
});
