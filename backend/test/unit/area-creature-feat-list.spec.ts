import {
  bindEffectiveCreatureFeatsTwoDaToCreatureFeatList,
  readAreaCreatureFeatListStorage,
  readExistingAreaCreatureFeatListMutation,
} from "../../src/modules/areas/domain/area-creature-feat-list";
import { parseEffectiveCreatureFeatsTwoDa } from
  "../../src/modules/catalog/domain/effective-creature-feats-two-da";
import {
  admitCreatureFeatListCatalogMutations,
  AreaCreatureFeatListCatalogAdmissionError,
} from "../../src/modules/areas/application/area-creature-feat-list-catalog-admission";
import { readExistingAreaCreatureHitPointMutation } from
  "../../src/modules/areas/domain/area-creature-hit-points";
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

describe("Area Creature FeatList", () => {
  const table = parseEffectiveCreatureFeatsTwoDa({
    bytes: Buffer.from([
      "2DA V2.0",
      "",
      "LABEL FEAT DESCRIPTION ToolsCategories",
      "0 Alertness 100 200 1",
      "1 Hidden **** 201 2",
      "2 Toughness 102 **** 3",
      "3 Metamagic 140 240 4",
      "",
    ].join("\n"), "ascii"),
    sourceObjectKey: "runtime-source/module/feat.2da",
    sourceLayer: "module",
    resolveStrRef: (strRef) => ({
      100: "Alertness",
      102: "Toughness",
      140: "Metamagic",
    })[strRef],
  })!;

  it("parses only Toolset-visible physical feat rows with immutable provenance", () => {
    expect(table.descriptor).toMatchObject({
      resourceName: "feat.2da",
      sourceObjectKey: "runtime-source/module/feat.2da",
      sourceLayer: "module",
      sizeBytes: expect.any(Number),
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      rowCount: 4,
    });
    expect(table.rows).toEqual([
      {
        rowIndex: 0,
        featNameStrRef: 100,
        descriptionStrRef: 200,
        toolsCategory: 1,
        displayName: "Alertness",
        displaySource: "strref",
      },
      {
        rowIndex: 2,
        featNameStrRef: 102,
        toolsCategory: 3,
        displayName: "Toughness",
        displaySource: "strref",
      },
      {
        rowIndex: 3,
        featNameStrRef: 140,
        descriptionStrRef: 240,
        toolsCategory: 4,
        displayName: "Metamagic",
        displaySource: "strref",
      },
    ]);
  });

  it("accepts presence-sensitive retained storage without normalizing source order", () => {
    expect(readAreaCreatureFeatListStorage({ present: false })).toEqual({ present: false });
    expect(readAreaCreatureFeatListStorage({
      present: true,
      nativeType: "list",
      structTypeId: 1,
      featNativeType: "word",
      featIds: [40, 0, 40],
      opaqueSiblingFieldCounts: [0, 2, 0],
    })).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 1,
      featNativeType: "word",
      featIds: [40, 0, 40],
      opaqueSiblingFieldCounts: [0, 2, 0],
    });
    expect(readAreaCreatureFeatListStorage({
      present: true,
      nativeType: "list",
      structTypeId: 1,
      featNativeType: "word",
      featIds: [],
      opaqueSiblingFieldCounts: [],
    })).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 1,
      featNativeType: "word",
      featIds: [],
      opaqueSiblingFieldCounts: [],
    });
  });

  it("binds retained storage to one exact effective feat.2da descriptor", () => {
    expect(bindEffectiveCreatureFeatsTwoDaToCreatureFeatList({
      present: true,
      nativeType: "list",
      structTypeId: 1,
      featNativeType: "word",
      featIds: [40, 0],
      opaqueSiblingFieldCounts: [0, 0],
    }, table)).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 1,
      featNativeType: "word",
      featIds: [40, 0],
      opaqueSiblingFieldCounts: [0, 0],
      table: table.descriptor,
    });
  });

  it.each([
    { present: true, nativeType: "list", structTypeId: 0, featNativeType: "word", featIds: [1], opaqueSiblingFieldCounts: [0] },
    { present: true, nativeType: "list", structTypeId: 1, featNativeType: "dword", featIds: [1], opaqueSiblingFieldCounts: [0] },
    { present: true, nativeType: "list", structTypeId: 1, featNativeType: "word", featIds: [-1], opaqueSiblingFieldCounts: [0] },
    { present: true, nativeType: "list", structTypeId: 1, featNativeType: "word", featIds: [65_536], opaqueSiblingFieldCounts: [0] },
    { present: true, nativeType: "list", structTypeId: 1, featNativeType: "word", featIds: [1], opaqueSiblingFieldCounts: [] },
    { present: true, nativeType: "list", structTypeId: 1, featNativeType: "word", featIds: [1], opaqueSiblingFieldCounts: [-1] },
    { present: true, nativeType: "list", structTypeId: 1, featNativeType: "word", featIds: [1], opaqueSiblingFieldCounts: [0], extra: true },
  ])("rejects malformed retained storage %#", (value) => {
    expect(readAreaCreatureFeatListStorage(value)).toBeNull();
  });

  it.each([
    {
      expectedFeatIds: [0, 2], featIds: [0, 2, 40], opaqueSiblingFieldCounts: [0, 0],
      tableSha256: "a".repeat(64), rowCount: 41, row40Transition: "added",
    },
    {
      expectedFeatIds: [0, 40], featIds: [0], opaqueSiblingFieldCounts: [0, 0],
      tableSha256: "a".repeat(64), rowCount: 41, row40Transition: "removed",
    },
    {
      expectedFeatIds: [0], featIds: [2], opaqueSiblingFieldCounts: [0],
      tableSha256: "a".repeat(64), rowCount: 41, row40Transition: "unchanged",
    },
  ])("accepts exact canonical full-vector CAS %#", (value) => {
    expect(readExistingAreaCreatureFeatListMutation(value)).toEqual(value);
  });

  it.each([
    { expectedFeatIds: [0], featIds: [0], opaqueSiblingFieldCounts: [0], tableSha256: "a".repeat(64), rowCount: 41, row40Transition: "unchanged" },
    { expectedFeatIds: [0, 0], featIds: [0, 2], opaqueSiblingFieldCounts: [0, 0], tableSha256: "a".repeat(64), rowCount: 41, row40Transition: "unchanged" },
    { expectedFeatIds: [0], featIds: [2, 2], opaqueSiblingFieldCounts: [0], tableSha256: "a".repeat(64), rowCount: 41, row40Transition: "unchanged" },
    { expectedFeatIds: [0], featIds: [2], opaqueSiblingFieldCounts: [1], tableSha256: "a".repeat(64), rowCount: 41, row40Transition: "unchanged" },
    { expectedFeatIds: [0], featIds: [41], opaqueSiblingFieldCounts: [0], tableSha256: "a".repeat(64), rowCount: 41, row40Transition: "unchanged" },
    { expectedFeatIds: [0], featIds: [40], opaqueSiblingFieldCounts: [0], tableSha256: "a".repeat(64), rowCount: 41, row40Transition: "unchanged" },
    { expectedFeatIds: [40], featIds: [0], opaqueSiblingFieldCounts: [0], tableSha256: "bad", rowCount: 41, row40Transition: "removed" },
  ])("rejects unsafe, stale-shaped, or no-op mutation %#", (value) => {
    expect(readExistingAreaCreatureFeatListMutation(value)).toBeNull();
  });

  it("parses exact GIT FeatList presence, entry shape, order, duplicates, and siblings", () => {
    expect(parseGitCreatureFeatList({
      label: "FeatList",
      type: "list",
      value: [
        { typeId: 1, fields: [
          { label: "Feat", type: "word", value: 40 },
          { label: "Opaque", type: "cexostring", value: "preserve" },
        ] },
        { typeId: 1, fields: [{ label: "Feat", type: "word", value: 7 }] },
        { typeId: 1, fields: [{ label: "Feat", type: "word", value: 40 }] },
      ],
    })).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 1,
      featNativeType: "word",
      featIds: [40, 7, 40],
      opaqueSiblingFieldCounts: [1, 0, 0],
    });
    expect(parseGitCreatureFeatList()).toEqual({ present: false });
    expect(parseGitCreatureFeatList({
      label: "FeatList", type: "list", value: [],
    })).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 1,
      featNativeType: "word",
      featIds: [],
      opaqueSiblingFieldCounts: [],
    });
  });

  it.each([
    { label: "Featlist", type: "list", value: [
      { typeId: 1, fields: [{ label: "Feat", type: "word", value: 1 }] },
    ] },
    { label: "FeatList", type: "list", value: [
      { typeId: 0, fields: [{ label: "Feat", type: "word", value: 1 }] },
    ] },
    { label: "FeatList", type: "list", value: [
      { typeId: 1, fields: [{ label: "Feat", type: "dword", value: 1 }] },
    ] },
    { label: "FeatList", type: "list", value: [
      { typeId: 1, fields: [
        { label: "Feat", type: "word", value: 1 },
        { label: "Feat", type: "word", value: 2 },
      ] },
    ] },
  ] satisfies SupportedGffField[])("suppresses malformed exact GIT provenance %#", (field) => {
    expect(parseGitCreatureFeatList(field)).toBeUndefined();
  });

  it("admits only visible current feat rows and blocks category-4 removals", async () => {
    const catalog = { resolveEffectiveCreatureFeatsTwoDaTable: async () => table };
    await expect(admitCreatureFeatListCatalogMutations([{
      kind: "creature",
      featList: {
        expectedFeatIds: [0],
        featIds: [0, 2],
        tableSha256: table.descriptor.sha256,
        rowCount: table.descriptor.rowCount,
      },
    }], catalog)).resolves.toBeUndefined();
    await expect(admitCreatureFeatListCatalogMutations([{
      kind: "creature",
      featList: {
        expectedFeatIds: [0],
        featIds: [0, 1],
        tableSha256: table.descriptor.sha256,
        rowCount: table.descriptor.rowCount,
      },
    }], catalog)).rejects.toEqual(
      expect.objectContaining<Partial<AreaCreatureFeatListCatalogAdmissionError>>({
        reason: "row_missing",
      }),
    );
    await expect(admitCreatureFeatListCatalogMutations([{
      kind: "creature",
      featList: {
        expectedFeatIds: [0, 3],
        featIds: [0],
        tableSha256: table.descriptor.sha256,
        rowCount: table.descriptor.rowCount,
      },
    }], catalog)).rejects.toEqual(
      expect.objectContaining<Partial<AreaCreatureFeatListCatalogAdmissionError>>({
        reason: "metamagic_coupling_required",
      }),
    );
  });

  it("validates a reopen-consistent HP triplet for an added feat row 40", () => {
    const mutation = {
      expectedHitPoints: 10,
      expectedCurrentHitPoints: 10,
      expectedMaxHitPoints: 10,
      hitPoints: 10,
      currentHitPoints: 7,
      maxHitPoints: 13,
      expectedConstitution: 10,
      constitution: 10,
      race: 0,
      classLevels: [3],
      featRow40Present: false,
      targetFeatRow40Present: true,
      racialConstitutionAdjust: 0,
      racialTypesSha256: "b".repeat(64),
      racialTypesRowCount: 1,
    };
    expect(readExistingAreaCreatureHitPointMutation(mutation)).toEqual(mutation);
    expect(readExistingAreaCreatureHitPointMutation({
      ...mutation,
      targetFeatRow40Present: false,
    })).toBeNull();
  });

  it("rewrites a canonical FeatList and its coupled HP triplet while preserving GIC", () => {
    const pair = creatureAreaObjectPair([
      {
        label: "FeatList",
        type: "list",
        value: [{ typeId: 1, fields: [{ label: "Feat", type: "word", value: 0 }] }],
      },
      { label: "HitPoints", type: "short", value: 10 },
      { label: "CurrentHitPoints", type: "short", value: 10 },
      { label: "MaxHitPoints", type: "short", value: 10 },
      { label: "Con", type: "byte", value: 10 },
      { label: "Race", type: "byte", value: 0 },
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        featList: {
          expectedFeatIds: [0],
          featIds: [0, 40],
          opaqueSiblingFieldCounts: [0],
          tableSha256: "a".repeat(64),
          rowCount: 41,
          row40Transition: "added",
        },
        hitPoints: {
          expectedHitPoints: 10,
          expectedCurrentHitPoints: 10,
          expectedMaxHitPoints: 10,
          hitPoints: 10,
          currentHitPoints: 7,
          maxHitPoints: 13,
          expectedConstitution: 10,
          constitution: 10,
          race: 0,
          classLevels: [3],
          featRow40Present: false,
          targetFeatRow40Present: true,
          racialConstitutionAdjust: 0,
          racialTypesSha256: "b".repeat(64),
          racialTypesRowCount: 1,
        },
      }],
    });
    const fields = gffList(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!.fields;
    expect(fields.find((field) => field.label === "FeatList")).toEqual({
      label: "FeatList",
      type: "list",
      value: [
        { typeId: 1, fields: [{ label: "Feat", type: "word", value: 0 }] },
        { typeId: 1, fields: [{ label: "Feat", type: "word", value: 40 }] },
      ],
    });
    expect(fields.find((field) => field.label === "CurrentHitPoints"))
      .toEqual({ label: "CurrentHitPoints", type: "short", value: 7 });
    expect(fields.find((field) => field.label === "MaxHitPoints"))
      .toEqual({ label: "MaxHitPoints", type: "short", value: 13 });
    expect(result.gicBytes).toEqual(pair.gic);
  });
});

function parseGitCreatureFeatList(featList?: SupportedGffField) {
  const bytes = buildGffBuffer([{
    label: "Creature List",
    type: "list",
    value: [{
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_guard" },
        ...(featList ? [featList] : []),
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    }],
  }], "GIT ", 0xffff_ffff);
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureFeatList;
}
