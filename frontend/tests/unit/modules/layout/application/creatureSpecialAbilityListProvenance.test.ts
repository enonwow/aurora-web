import { describe, expect, it, vi } from "vitest";
import {
  isExistingCreatureSpecialAbilityCatalogAdmitted,
  loadExistingCreatureSpecialAbilityCatalog,
  materializeExistingCreatureSpecialAbilities,
  readExistingCreatureSpecialAbilityListProvenance,
  reduceCreatureSpecialAbilityEntry,
} from "../../../../../src/modules/layout/application/creatureSpecialAbilityListProvenance";

const TABLE_SHA256 = "e".repeat(64);

function exactSource(rowCount = 257) {
  return {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creatureSpecialAbilityList: {
      present: true as const,
      nativeType: "list" as const,
      structTypeId: 4 as const,
      entries: [
        { spellId: 0, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
        { spellId: 0, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
        { spellId: 256, spellFlags: 1, casterLevel: 0, opaqueSiblingFieldCount: 0 },
      ],
      table: {
        resourceName: "spells.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/spells.2da",
        sourceLayer: "vanilla" as const,
        sha256: TABLE_SHA256,
        sizeBytes: 456_789,
        rowCount,
      },
    },
  };
}

function row(rowIndex: number) {
  return {
    rowIndex,
    nameStrRef: 10_000 + rowIndex,
    userType: rowIndex === 256 ? 2 as const : 1 as const,
    displayName: `Ability ${rowIndex}`,
  };
}

describe("existing Creature SpecAbilityList provenance", () => {
  it("loads all visible pages and requires every retained physical row", async () => {
    const rows = [...Array.from({ length: 256 }, (_, index) => row(index)), row(256)];
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "spells.2da", sha256: TABLE_SHA256, rowCount: 257,
        items: rows.slice(0, 256), total: 257, limit: 256, offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "spells.2da", sha256: TABLE_SHA256, rowCount: 257,
        items: rows.slice(256), total: 257, limit: 256, offset: 256,
      });

    const catalog = await loadExistingCreatureSpecialAbilityCatalog(
      { queries: { listRows } }, "token", exactSource(),
    );

    expect(readExistingCreatureSpecialAbilityListProvenance(exactSource())).toEqual({
      tableSha256: TABLE_SHA256,
      rowCount: 257,
      sourceEntries: [
        { spellId: 0, uses: 2, casterLevel: 3 },
        { spellId: 256, uses: 1, casterLevel: 0 },
      ],
    });
    expect(catalog.items.at(-1)?.rowIndex).toBe(256);
    expect(isExistingCreatureSpecialAbilityCatalogAdmitted(exactSource(), catalog)).toBe(true);
  });

  it("fails closed when a retained row is absent or violates UserType caster semantics", async () => {
    const listRows = vi.fn().mockResolvedValue({
      resourceName: "spells.2da", sha256: TABLE_SHA256, rowCount: 257,
      items: [row(0)], total: 1, limit: 256, offset: 0,
    });
    await expect(loadExistingCreatureSpecialAbilityCatalog(
      { queries: { listRows } }, "token", exactSource(),
    )).rejects.toMatchObject({ code: "CREATURE_SPECIAL_ABILITY_CATALOG_INCOMPLETE" });

    const invalidSource = exactSource();
    invalidSource.creatureSpecialAbilityList.entries[2] = {
      ...invalidSource.creatureSpecialAbilityList.entries[2], casterLevel: 1,
    };
    expect(isExistingCreatureSpecialAbilityCatalogAdmitted(invalidSource, {
      tableSha256: TABLE_SHA256, rowCount: 257, items: [row(0), row(256)],
    })).toBe(false);
  });

  it("materializes a complete physical catalog while preserving grouped uses and levels", () => {
    const current = [
      { spellId: 0, name: "Ability 0", type: "Spells", casterLevel: 3, uses: 2 },
      { spellId: 256, name: "Ability 256", type: "Monster Abilities", casterLevel: 0, uses: 1 },
    ];
    const candidate = [
      { spellId: 0, name: "Ability 0", type: "Spells", casterLevel: 5, uses: 3 },
      { spellId: 5, name: "Ability 5", type: "Spells", casterLevel: 2, uses: 1 },
      { spellId: 256, name: "Ability 256", type: "Monster Abilities", casterLevel: 0, uses: 0 },
    ];
    const catalog = {
      tableSha256: TABLE_SHA256,
      rowCount: 257,
      items: [row(0), row(5), row(256)],
    };
    expect(materializeExistingCreatureSpecialAbilities(exactSource(), current, candidate, catalog))
      .toEqual([
        { spellId: 0, name: "Ability 0", type: "Spells", casterLevel: 5, uses: 3 },
        { spellId: 5, name: "Ability 5", type: "Spells", casterLevel: 2, uses: 1 },
        { spellId: 256, name: "Ability 256", type: "Monster Abilities", casterLevel: 0, uses: 0 },
      ]);
    expect(materializeExistingCreatureSpecialAbilities(exactSource(), current, candidate, null))
      .toEqual(current);
  });

  it("applies Toolset uses/caster coupling and the native bounds", () => {
    const spell = {
      spellId: 0, name: "Ability 0", type: "Spells", casterLevel: 3, uses: 2,
    };
    expect(reduceCreatureSpecialAbilityEntry(spell, "uses", 0))
      .toEqual({ ...spell, casterLevel: 0, uses: 0 });
    expect(reduceCreatureSpecialAbilityEntry({ ...spell, casterLevel: 0 }, "uses", 300))
      .toEqual({ ...spell, casterLevel: 1, uses: 255 });
    expect(reduceCreatureSpecialAbilityEntry({ ...spell, uses: 0 }, "casterLevel", 5))
      .toEqual({ ...spell, casterLevel: 5, uses: 1 });
    expect(reduceCreatureSpecialAbilityEntry(spell, "casterLevel", 0))
      .toEqual({ ...spell, casterLevel: 1, uses: 2 });
    const monster = {
      spellId: 2, name: "Aura", type: "Monster Abilities", casterLevel: 0, uses: 1,
    };
    expect(reduceCreatureSpecialAbilityEntry(monster, "casterLevel", 12))
      .toEqual(monster);
  });
});
