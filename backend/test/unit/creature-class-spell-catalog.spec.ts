import { CatalogApplicationService } from
  "../../src/modules/catalog/application/catalog.application.service";
import { parseCreatureClassSpellRowsQuery } from
  "../../src/modules/catalog/adapters/inbound/http/catalog.schemas";

describe("Creature class-spell catalog HTTP contract", () => {
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
    rows: [
      {
        classId: 1, rowIndex: 13, spellLevel: 1, nameStrRef: 1000,
        spellDescStrRef: 2000, displayName: "Replacement", displaySource: "strref" as const,
      },
      {
        classId: 1, rowIndex: 14, spellLevel: 2, nameStrRef: 1001,
        displayName: "Other level", displaySource: "strref" as const,
      },
      {
        classId: 2, rowIndex: 15, spellLevel: 1, nameStrRef: 1002,
        displayName: "Other class", displaySource: "strref" as const,
      },
      {
        classId: 1, rowIndex: 16, spellLevel: 1, nameStrRef: 1003,
        displayName: "StringRef 1003", displaySource: "strref_id" as const,
      },
    ],
  };

  it("strictly parses both digests plus class and native spell level", () => {
    expect(parseCreatureClassSpellRowsQuery({
      tableSha256: "b".repeat(64),
      classesTableSha256: "a".repeat(64),
      classId: "1",
      spellLevel: "1",
    })).toEqual({
      tableSha256: "b".repeat(64),
      classesTableSha256: "a".repeat(64),
      classId: 1,
      spellLevel: 1,
      limit: 100,
      offset: 0,
    });
    expect(() => parseCreatureClassSpellRowsQuery({
      tableSha256: "b".repeat(64),
      classesTableSha256: "a".repeat(64),
      classId: 1,
      spellLevel: 1,
      query: "x",
      rowIndex: 13,
    })).toThrow("Creature class spell row query validation failed");
  });

  it("serves only localized rows for the exact class and level", async () => {
    const service = new CatalogApplicationService({
      resolveEffectiveCreatureClassSpellsTwoDaTable: async () => table,
    } as never, {} as never);
    await expect(service.listCreatureClassSpellRows({
      tableSha256: "b".repeat(64),
      classesTableSha256: "a".repeat(64),
      classId: 1,
      spellLevel: 1,
      query: "replace",
      limit: 100,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "spells.2da",
      sha256: "b".repeat(64),
      rowCount: 100,
      classesSha256: "a".repeat(64),
      classesRowCount: 11,
      classId: 1,
      spellLevel: 1,
      items: [{
        rowIndex: 13,
        nameStrRef: 1000,
        spellDescStrRef: 2000,
        displayName: "Replacement",
      }],
      total: 1,
      limit: 100,
      offset: 0,
    });
  });

  it("rejects either stale digest", async () => {
    const service = new CatalogApplicationService({
      resolveEffectiveCreatureClassSpellsTwoDaTable: async () => table,
    } as never, {} as never);
    await expect(service.listCreatureClassSpellRows({
      tableSha256: "c".repeat(64),
      classesTableSha256: "a".repeat(64),
      classId: 1,
      spellLevel: 1,
      limit: 1,
      offset: 0,
    })).rejects.toEqual(expect.objectContaining({
      code: "CREATURE_CLASS_SPELLS_TABLE_STALE",
    }));
  });
});
