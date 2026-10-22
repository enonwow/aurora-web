import {
  admitCreatureClassSpellReplacementCatalogMutations,
  AreaCreatureClassSpellReplacementCatalogAdmissionError,
} from "../../src/modules/areas/application/area-creature-class-spell-replacement-catalog-admission";

describe("Area Creature class-spell replacement catalog admission", () => {
  const mutation = {
    kind: "creature",
    classSpellReplacement: {
      expectedClassIds: [1],
      expectedLevels: [3],
      classListGraphSha256: "c".repeat(64),
      classesTableSha256: "a".repeat(64),
      classesRowCount: 11,
      spellsTableSha256: "b".repeat(64),
      spellsRowCount: 100,
      replacements: [{
        classSlotIndex: 0,
        listKind: "known" as const,
        spellLevel: 1,
        entryIndex: 0,
        expectedSpellId: 12,
        targetSpellId: 13,
      }],
      spellReplacementConfirmed: true as const,
    },
  };

  const table = {
    descriptor: {
      resourceName: "spells.2da" as const,
      sourceObjectKey: "runtime-source/module/spells.2da",
      sourceLayer: "module" as const,
      sha256: "b".repeat(64),
      sizeBytes: 200,
      rowCount: 100,
    },
    classesDescriptor: {
      resourceName: "classes.2da" as const,
      sourceObjectKey: "runtime-source/module/classes.2da",
      sourceLayer: "module" as const,
      sha256: "a".repeat(64),
      sizeBytes: 100,
      rowCount: 11,
    },
    rows: [{
      classId: 1,
      rowIndex: 13,
      spellLevel: 1,
      nameStrRef: 1000,
      displayName: "Replacement",
      displaySource: "strref" as const,
    }],
  };

  it("admits an eligible same-level target against both current table descriptors", async () => {
    await expect(admitCreatureClassSpellReplacementCatalogMutations(
      [mutation],
      { resolveEffectiveCreatureClassSpellsTwoDaTable: async () => table },
    )).resolves.toBeUndefined();
  });

  it.each([
    [{ ...table, descriptor: { ...table.descriptor, sha256: "d".repeat(64) } }, "draft_source_changed"],
    [{ ...table, rows: [] }, "target_row_missing"],
    [{ ...table, rows: [{ ...table.rows[0], spellLevel: 2 }] }, "target_level_mismatch"],
  ] as const)("fails closed for stale or ineligible target %#", async (candidate, reason) => {
    await expect(admitCreatureClassSpellReplacementCatalogMutations(
      [mutation],
      { resolveEffectiveCreatureClassSpellsTwoDaTable: async () => candidate },
    )).rejects.toEqual(expect.objectContaining<Partial<
      AreaCreatureClassSpellReplacementCatalogAdmissionError
    >>({ reason }));
  });
});
