import {
  bindEffectiveCreatureSpecialAbilitiesTwoDaToList,
  readAreaCreatureSpecialAbilityListStorage,
  readExistingAreaCreatureSpecialAbilityListMutation,
} from "../../src/modules/areas/domain/area-creature-special-ability-list";
import {
  admitCreatureSpecialAbilityListCatalogMutations,
  AreaCreatureSpecialAbilityListCatalogAdmissionError,
} from "../../src/modules/areas/application/area-creature-special-ability-list-catalog-admission";
import { parseEffectiveCreatureSpecialAbilitiesTwoDa } from
  "../../src/modules/catalog/domain/effective-creature-special-abilities-two-da";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { mutateExistingAreaObjectsInGitGic } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import { parseRawGffDocument } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { buildGffBuffer, type SupportedGffField } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { creatureAreaObjectPair, gffList } from
  "../support/area-object-pair-writer-fixture";
import { CatalogApplicationService } from
  "../../src/modules/catalog/application/catalog.application.service";

describe("Area Creature SpecAbilityList", () => {
  const table = parseEffectiveCreatureSpecialAbilitiesTwoDa({
    bytes: Buffer.from([
      "2DA V2.0",
      "",
      "LABEL NAME SpellDesc UserType Master",
      "0 AcidFog 100 200 1 ****",
      "1 HiddenType 101 201 3 ****",
      "2 AuraCold 102 **** 2 ****",
      "3 ChildSpell 103 203 1 0",
      "4 MissingName **** 204 1 ****",
      "",
    ].join("\n"), "ascii"),
    sourceObjectKey: "runtime-source/module/spells.2da",
    sourceLayer: "module",
    resolveStrRef: (strRef) => ({ 100: "Acid Fog", 102: "Aura of Cold" })[strRef],
  })!;

  it("parses only Toolset-selectable physical spell rows with immutable provenance", () => {
    expect(table.descriptor).toMatchObject({
      resourceName: "spells.2da",
      sourceObjectKey: "runtime-source/module/spells.2da",
      sourceLayer: "module",
      sizeBytes: expect.any(Number),
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      rowCount: 5,
    });
    expect(table.rows).toEqual([
      {
        rowIndex: 0,
        nameStrRef: 100,
        spellDescStrRef: 200,
        userType: 1,
        displayName: "Acid Fog",
        displaySource: "strref",
      },
      {
        rowIndex: 2,
        nameStrRef: 102,
        userType: 2,
        displayName: "Aura of Cold",
        displaySource: "strref",
      },
    ]);
  });

  it("retains exact list presence, physical order, duplicates, flags, levels, and siblings", () => {
    expect(readAreaCreatureSpecialAbilityListStorage({ present: false }))
      .toEqual({ present: false });
    expect(readAreaCreatureSpecialAbilityListStorage({
      present: true,
      nativeType: "list",
      structTypeId: 4,
      entries: [
        { spellId: 2, spellFlags: 1, casterLevel: 0, opaqueSiblingFieldCount: 0 },
        { spellId: 0, spellFlags: 5, casterLevel: 3, opaqueSiblingFieldCount: 1 },
        { spellId: 0, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
      ],
    })).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 4,
      entries: [
        { spellId: 2, spellFlags: 1, casterLevel: 0, opaqueSiblingFieldCount: 0 },
        { spellId: 0, spellFlags: 5, casterLevel: 3, opaqueSiblingFieldCount: 1 },
        { spellId: 0, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
      ],
    });
  });

  it("binds retained storage to one exact effective spells.2da descriptor", () => {
    expect(bindEffectiveCreatureSpecialAbilitiesTwoDaToList({
      present: true,
      nativeType: "list",
      structTypeId: 4,
      entries: [
        { spellId: 0, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
      ],
    }, table)).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 4,
      entries: [
        { spellId: 0, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
      ],
      table: table.descriptor,
    });
  });

  it.each([
    { present: true, nativeType: "list", structTypeId: 3, entries: [] },
    { present: true, nativeType: "list", structTypeId: 4, entries: [{ spellId: -1, spellFlags: 1, casterLevel: 1, opaqueSiblingFieldCount: 0 }] },
    { present: true, nativeType: "list", structTypeId: 4, entries: [{ spellId: 65_536, spellFlags: 1, casterLevel: 1, opaqueSiblingFieldCount: 0 }] },
    { present: true, nativeType: "list", structTypeId: 4, entries: [{ spellId: 1, spellFlags: 256, casterLevel: 1, opaqueSiblingFieldCount: 0 }] },
    { present: true, nativeType: "list", structTypeId: 4, entries: [{ spellId: 1, spellFlags: 1, casterLevel: 256, opaqueSiblingFieldCount: 0 }] },
    { present: true, nativeType: "list", structTypeId: 4, entries: [{ spellId: 1, spellFlags: 1, casterLevel: 1, opaqueSiblingFieldCount: -1 }] },
    { present: true, nativeType: "list", structTypeId: 4, entries: [], extra: true },
  ])("rejects malformed retained storage %#", (value) => {
    expect(readAreaCreatureSpecialAbilityListStorage(value)).toBeNull();
  });

  it("accepts a changed complete grouped profile and rejects no-op or duplicate groups", () => {
    const mutation = {
      expectedEntries: [
        { spellId: 0, uses: 2, casterLevel: 3 },
        { spellId: 2, uses: 1, casterLevel: 0 },
      ],
      entries: [
        { spellId: 0, uses: 4, casterLevel: 5 },
        { spellId: 2, uses: 1, casterLevel: 0 },
      ],
      tableSha256: "a".repeat(64),
      rowCount: 5,
    };
    expect(readExistingAreaCreatureSpecialAbilityListMutation(mutation)).toEqual(mutation);
    expect(readExistingAreaCreatureSpecialAbilityListMutation({
      ...mutation,
      entries: mutation.expectedEntries,
    })).toBeNull();
    expect(readExistingAreaCreatureSpecialAbilityListMutation({
      ...mutation,
      entries: [mutation.entries[0], mutation.entries[0]],
    })).toBeNull();
    expect(readExistingAreaCreatureSpecialAbilityListMutation({
      ...mutation,
      entries: [{ spellId: 0, uses: 256, casterLevel: 5 }],
    })).toBeNull();
  });

  it("parses exact GIT SpecAbilityList storage without normalized metadata authority", () => {
    expect(parseGitCreatureSpecialAbilityList({
      label: "SpecAbilityList",
      type: "list",
      value: [
        { typeId: 4, fields: [
          { label: "Spell", type: "word", value: 0 },
          { label: "SpellFlags", type: "byte", value: 5 },
          { label: "SpellCasterLevel", type: "byte", value: 22 },
          { label: "Opaque", type: "cexostring", value: "preserve" },
        ] },
        { typeId: 4, fields: [
          { label: "Spell", type: "word", value: 2 },
          { label: "SpellFlags", type: "byte", value: 1 },
          { label: "SpellCasterLevel", type: "byte", value: 0 },
        ] },
      ],
    })).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 4,
      entries: [
        { spellId: 0, spellFlags: 5, casterLevel: 22, opaqueSiblingFieldCount: 1 },
        { spellId: 2, spellFlags: 1, casterLevel: 0, opaqueSiblingFieldCount: 0 },
      ],
    });
    expect(parseGitCreatureSpecialAbilityList()).toEqual({ present: false });
    expect(parseGitCreatureSpecialAbilityList({
      label: "SpecAbilityList", type: "list", value: [],
    })).toEqual({ present: true, nativeType: "list", structTypeId: 4, entries: [] });
  });

  it.each([
    { label: "SpecabilityList", type: "list", value: [] },
    { label: "SpecAbilityList", type: "list", value: [
      { typeId: 3, fields: [
        { label: "Spell", type: "word", value: 0 },
        { label: "SpellFlags", type: "byte", value: 1 },
        { label: "SpellCasterLevel", type: "byte", value: 1 },
      ] },
    ] },
    { label: "SpecAbilityList", type: "list", value: [
      { typeId: 4, fields: [
        { label: "Spell", type: "dword", value: 0 },
        { label: "SpellFlags", type: "byte", value: 1 },
        { label: "SpellCasterLevel", type: "byte", value: 1 },
      ] },
    ] },
    { label: "SpecAbilityList", type: "list", value: [
      { typeId: 4, fields: [
        { label: "Spell", type: "word", value: 0 },
        { label: "SpellFlags", type: "byte", value: 1 },
      ] },
    ] },
  ] satisfies SupportedGffField[])("suppresses malformed exact GIT provenance %#", (field) => {
    expect(parseGitCreatureSpecialAbilityList(field)).toBeUndefined();
  });

  it("admits only exact current catalog rows and UserType-specific caster profiles", async () => {
    const catalog = { resolveEffectiveCreatureSpecialAbilitiesTwoDaTable: async () => table };
    const base = {
      kind: "creature",
      specialAbilityList: {
        expectedEntries: [{ spellId: 0, uses: 1, casterLevel: 3 }],
        entries: [
          { spellId: 0, uses: 2, casterLevel: 5 },
          { spellId: 2, uses: 1, casterLevel: 0 },
        ],
        tableSha256: table.descriptor.sha256,
        rowCount: table.descriptor.rowCount,
      },
    };
    await expect(admitCreatureSpecialAbilityListCatalogMutations([base], catalog))
      .resolves.toBeUndefined();
    await expect(admitCreatureSpecialAbilityListCatalogMutations([{
      ...base,
      specialAbilityList: {
        ...base.specialAbilityList,
        entries: [{ spellId: 2, uses: 1, casterLevel: 1 }],
      },
    }], catalog)).rejects.toEqual(
      expect.objectContaining<Partial<AreaCreatureSpecialAbilityListCatalogAdmissionError>>({
        reason: "profile_invalid",
      }),
    );
    await expect(admitCreatureSpecialAbilityListCatalogMutations([{
      ...base,
      specialAbilityList: {
        ...base.specialAbilityList,
        entries: [{ spellId: 3, uses: 1, casterLevel: 1 }],
      },
    }], catalog)).rejects.toEqual(
      expect.objectContaining<Partial<AreaCreatureSpecialAbilityListCatalogAdmissionError>>({
        reason: "row_missing",
      }),
    );
  });

  it("serves only localized Toolset-selectable rows through the digest-bound catalog", async () => {
    const service = new CatalogApplicationService({
      resolveEffectiveCreatureSpecialAbilitiesTwoDaTable: async () => table,
    } as never, {} as never);

    await expect(service.listCreatureSpecialAbilityRows({
      tableSha256: table.descriptor.sha256,
      query: "aura",
      limit: 256,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "spells.2da",
      sha256: table.descriptor.sha256,
      rowCount: 5,
      items: [{
        rowIndex: 2,
        nameStrRef: 102,
        userType: 2,
        displayName: "Aura of Cold",
      }],
      total: 1,
      limit: 256,
      offset: 0,
    });
    await expect(service.listCreatureSpecialAbilityRows({
      tableSha256: "f".repeat(64),
      limit: 1,
      offset: 0,
    })).rejects.toEqual(expect.objectContaining({ code: "CREATURE_SPECIAL_ABILITIES_TABLE_STALE" }));
  });

  it("rewrites canonical repeated type-4 entries and preserves paired GIC", () => {
    const pair = creatureAreaObjectPair([{
      label: "SpecAbilityList",
      type: "list",
      value: [
        { typeId: 4, fields: [
          { label: "Spell", type: "word", value: 0 },
          { label: "SpellFlags", type: "byte", value: 1 },
          { label: "SpellCasterLevel", type: "byte", value: 3 },
        ] },
      ],
    }]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        specialAbilityList: {
          expectedEntries: [{ spellId: 0, uses: 1, casterLevel: 3 }],
          entries: [
            { spellId: 0, uses: 2, casterLevel: 5 },
            { spellId: 2, uses: 1, casterLevel: 0 },
          ],
          tableSha256: "a".repeat(64),
          rowCount: 3,
        },
      }],
    });
    const fields = gffList(parseRawGffDocument(result.gitBytes), "Creature List")!
      .value[0]!.fields;
    expect(fields.find((field) => field.label === "SpecAbilityList")).toEqual({
      label: "SpecAbilityList",
      type: "list",
      value: [
        { typeId: 4, fields: [
          { label: "Spell", type: "word", value: 0 },
          { label: "SpellFlags", type: "byte", value: 1 },
          { label: "SpellCasterLevel", type: "byte", value: 5 },
        ] },
        { typeId: 4, fields: [
          { label: "Spell", type: "word", value: 0 },
          { label: "SpellFlags", type: "byte", value: 1 },
          { label: "SpellCasterLevel", type: "byte", value: 5 },
        ] },
        { typeId: 4, fields: [
          { label: "Spell", type: "word", value: 2 },
          { label: "SpellFlags", type: "byte", value: 1 },
          { label: "SpellCasterLevel", type: "byte", value: 0 },
        ] },
      ],
    });
    expect(result.gicBytes).toEqual(pair.gic);
  });
});

function parseGitCreatureSpecialAbilityList(specAbilityList?: SupportedGffField) {
  const bytes = buildGffBuffer([{
    label: "Creature List",
    type: "list",
    value: [{
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_guard" },
        ...(specAbilityList ? [specAbilityList] : []),
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    }],
  }], "GIT ", 0xffff_ffff);
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureSpecialAbilityList;
}
