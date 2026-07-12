import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ModuleSnapshotTemplateCatalogRepository } from "../../src/modules/catalog/adapters/outbound/blob/module-snapshot-template-catalog.repository";
import {
  buildLookupSeeds,
  buildModuleSnapshotIndex,
  collectPlaceableAssetsFromSnapshot,
  compareAssetRole
} from "../../src/modules/catalog/application/catalog-processing.helpers";
import type {
  ModuleBlobObjectSummary,
  ModuleBlobObjectPayload,
  ModuleBlobSnapshotSummary,
  ModuleBlobStoragePort
} from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import {
  NwnKeyBifResourceReader,
  NWN_KEY_BIF_RESOURCE_TYPES
} from "../../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { RuntimeSettingsApplicationService } from "../../src/modules/runtime-settings/application/runtime-settings.application.service";

describe("catalog-processing helpers (placeable asset lookup)", () => {
  it("buildLookupSeeds normalizes template/model/dependency metadata into deterministic seeds", () => {
    const seeds = buildLookupSeeds({
      templateId: "plc_plc_anchor_generic",
      resref: "plc_anchor_generic",
      subtype: "generic",
      metadata: {
        modelResRef: "models/placeables/fx_fire_anchor.mdl",
        templateResRef: "PLC_ANCHOR_GENERIC",
        dependencyRefs:
          '["textures/fx_fire_anchor_d.tga","textures\\\\fx_fire_anchor_n.dds","materials/fx_fire_anchor.mtr","vfx/fx_fire_anchor.vis"]'
      }
    });

    expect(seeds).toEqual([...seeds].sort((left, right) => left.localeCompare(right)));
    expect(seeds).toContain("plc_anchor_generic");
    expect(seeds).toContain("fx_fire_anchor");
    expect(seeds).toContain("fx_fire_anchor_d");
    expect(seeds).toContain("fx_fire_anchor_n");
  });

  it("collectPlaceableAssetsFromSnapshot returns model/texture/material/vfx contracts with deterministic order", () => {
    const snapshot: ModuleBlobSnapshotSummary = {
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-placeable-assets",
      totalFiles: 9,
      totalBytes: 1024,
      truncated: false,
      continuationToken: undefined,
      objects: [
        {
          key: "modules/current/blueprints/placeables/plc_anchor_generic.utp",
          size: 220,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "bp-1"
        },
        {
          key: "modules/current/models/fx_fire_anchor.mdl",
          size: 640,
          lastModified: "2026-05-25T10:00:01.000Z",
          etag: "mdl-1"
        },
        {
          key: "modules/current/models/fx_fire_anchor.mdb",
          size: 384,
          lastModified: "2026-05-25T10:00:02.000Z",
          etag: "mdb-1"
        },
        {
          key: "modules/current/textures/fx_fire_anchor_d.tga",
          size: 512,
          lastModified: "2026-05-25T10:00:03.000Z",
          etag: "tga-1"
        },
        {
          key: "modules/current/textures/fx_fire_anchor_n.dds",
          size: 490,
          lastModified: "2026-05-25T10:00:04.000Z",
          etag: "dds-1"
        },
        {
          key: "modules/current/materials/fx_fire_anchor.mtr",
          size: 160,
          lastModified: "2026-05-25T10:00:05.000Z",
          etag: "mtr-1"
        },
        {
          key: "modules/current/materials/fx_fire_anchor.txi",
          size: 120,
          lastModified: "2026-05-25T10:00:06.000Z",
          etag: "txi-1"
        },
        {
          key: "modules/current/vfx/fx_fire_anchor.vis",
          size: 98,
          lastModified: "2026-05-25T10:00:07.000Z",
          etag: "vis-1"
        },
        {
          key: "modules/current/notes/readme.txt",
          size: 40,
          lastModified: "2026-05-25T10:00:08.000Z",
          etag: "txt-1"
        }
      ]
    };

    const index = buildModuleSnapshotIndex(snapshot);
    const assets = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_plc_anchor_generic",
      resref: "plc_anchor_generic",
      subtype: "vfx",
      metadata: {
        modelResRef: "fx_fire_anchor",
        templateResRef: "plc_anchor_generic",
        dependencyRefs:
          "fx_fire_anchor_d.tga|fx_fire_anchor_n.dds|fx_fire_anchor.mtr|fx_fire_anchor.txi|fx_fire_anchor.vis"
      }
    });

    expect(assets.some((asset) => asset.role === "model")).toBe(true);
    expect(assets.some((asset) => asset.role === "texture")).toBe(true);
    expect(assets.some((asset) => asset.role === "material")).toBe(true);
    expect(assets.some((asset) => asset.role === "vfx")).toBe(true);

    expect(assets.map((asset) => asset.objectKey)).toEqual([
      ...new Set(assets.map((asset) => asset.objectKey))
    ]);

    const observedRoles = assets.map((asset) => asset.role);
    const sortedRoles = [...observedRoles].sort((left, right) => compareAssetRole(left, right));
    expect(observedRoles).toEqual(sortedRoles);

    expect(assets.map((asset) => asset.objectKey)).toEqual(
      expect.arrayContaining([
        "modules/current/models/fx_fire_anchor.mdl",
        "modules/current/textures/fx_fire_anchor_d.tga",
        "modules/current/materials/fx_fire_anchor.mtr",
        "modules/current/vfx/fx_fire_anchor.vis"
      ])
    );
  });
});

describe("ModuleSnapshotTemplateCatalogRepository", () => {
  function createRuntimeSettingsRepository(
    modulePrefix = "modules/current",
    pathOverrides: Partial<{ tlkBasePath: string; tlkCustomPath: string }> = {}
  ): jest.Mocked<RuntimeSettingsRepositoryPort> {
    return {
      get: jest.fn().mockResolvedValue({
        revision: 1,
        updatedAt: "2026-05-25T00:00:00.000Z",
        updatedBy: "test",
        paths: {
          vanillaDataPath: "",
          hakDirectoryPath: "",
          moduleDecompiledPath: "",
          modulePackedPath: "",
          tlkBasePath: pathOverrides.tlkBasePath ?? "",
          tlkCustomPath: pathOverrides.tlkCustomPath ?? ""
        },
        blobStorage: {
          endpoint: "http://seaweedfs:8333",
          region: "us-east-1",
          bucket: "aurora-module-assets",
          modulePrefix,
          accessKeyId: "seaweedfs",
          secretAccessKey: "secret",
          forcePathStyle: true
        },
        telemetryDebugMode: "off",
        hakProfiles: {},
        sources: {
          placeable: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          },
          tile: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          },
          area: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          },
          sound: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          }
        },
        benchmarkCandidates: {
          placeableHeavyNoVfx: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          placeableHeavyVfx: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          placeableVfxPlcAlternative: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          doorHeavyInstance: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          doorHeavySingleMesh: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          }
        }
      }),
      save: jest.fn()
    };
  }

  interface CreateModuleBlobStorageOptions {
    snapshotObjects?: ModuleBlobObjectSummary[];
    payloadOverrides?: Map<string, ModuleBlobObjectPayload>;
    throwOnGetKeys?: Set<string>;
    pageSize?: number;
    moduleHash?: string;
    prefix?: string;
  }

  function buildDefaultSnapshotObjects(etagSeed = "v1"): ModuleBlobObjectSummary[] {
    return [
      {
        key: "modules/current/blueprints/placeables/plc_city_gate.utd",
        size: 220,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: `p1-${etagSeed}`
      },
      {
        key: "modules/current/blueprints/placeables/plc_anchor_generic.utp",
        size: 200,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: `p2-${etagSeed}`
      },
      {
        key: "modules/current/blueprints/creatures/cre_guard.utc",
        size: 180,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "c1"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "appearance-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/classes.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "classes-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/feat.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "feat-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "racialtypes-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/gender.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "gender-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/skills.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "skills-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/spells.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "spells-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/phenotype.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "phenotype-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/capart.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "capart-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "wingmodel-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/tailmodel.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "tailmodel-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/creaturesize.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "creaturesize-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/portraits.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "portraits-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/soundset.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "soundset-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "baseitems-2da"
      },
      {
        key: "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da",
        size: 96,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "itempropdef-2da"
      },
      {
        key: "modules/current/blueprints/items/itm_scroll_fire.utI",
        size: 160,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "i1"
      },
      {
        key: "modules/current/blueprints/encounters/enc_forest_ambush.ute",
        size: 150,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "e1"
      },
      {
        key: "modules/current/readme.txt",
        size: 80,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "x1"
      }
    ];
  }

  function createModuleBlobStorage(
    etagSeed = "v1",
    options: CreateModuleBlobStorageOptions = {}
  ): jest.Mocked<ModuleBlobStoragePort> {
    const vfxBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_anchor_generic" },
      { label: "LocName", type: "cexolocstring", value: "Anchor Generic" },
      { label: "Tag", type: "cexostring", value: "vvx_anchor_fire" },
      { label: "ModelName", type: "resref", value: "fx_fire_anchor" },
      { label: "OnUsed", type: "resref", value: "script_anchor_use" }
    ]);

    const doorBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_city_gate" },
      { label: "LocName", type: "cexolocstring", value: "City Gate" },
      { label: "Tag", type: "cexostring", value: "city_gate_main" },
      { label: "KeyName", type: "resref", value: "key_city_gate" },
      { label: "Lockable", type: "byte", value: 1 },
      { label: "Locked", type: "byte", value: 1 },
      { label: "OpenLockDC", type: "dword", value: 22 },
      { label: "CloseLockDC", type: "dword", value: 20 },
      { label: "OnLock", type: "resref", value: "script_city_gate_lock" }
    ], "UTD ");

    const creatureBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "cre_guard" },
      { label: "FirstName", type: "cexolocstring", value: "City" },
      { label: "LastName", type: "cexolocstring", value: "Guard" },
      { label: "LocName", type: "cexolocstring", value: "Guard" },
      { label: "Comment", type: "cexostring", value: "Palette guard comment" },
      { label: "PaletteID", type: "byte", value: 9 },
      { label: "Appearance_Type", type: "dword", value: 17 },
      { label: "Race", type: "dword", value: 6 },
      { label: "Phenotype", type: "dword", value: 2 },
      { label: "Gender", type: "dword", value: 1 },
      { label: "Portrait", type: "resref", value: "po_hm_guard" },
      { label: "SoundSetFile", type: "word", value: 55 },
      { label: "Appearance_Head", type: "dword", value: 22 },
      { label: "ArmorPart_RFoot", type: "word", value: 4 },
      { label: "Color_Skin", type: "dword", value: 8 },
      { label: "Wings", type: "byte", value: 4 },
      { label: "Tail", type: "byte", value: 5 },
      { label: "Plot", type: "byte", value: 1 },
      { label: "IsPC", type: "byte", value: 1 },
      { label: "FactionID", type: "dword", value: 3 },
      { label: "ChallengeRating", type: "dword", value: 6 },
      { label: "Str", type: "byte", value: 16 },
      { label: "Dex", type: "byte", value: 14 },
      { label: "Con", type: "byte", value: 13 },
      { label: "Int", type: "byte", value: 10 },
      { label: "Wis", type: "byte", value: 12 },
      { label: "Cha", type: "byte", value: 8 },
      {
        label: "ClassList",
        type: "list",
        value: [[
          { label: "Class", type: "dword", value: 4 },
          { label: "ClassLevel", type: "dword", value: 5 },
          {
            label: "KnownList0",
            type: "list",
            value: [[
              { label: "Spell", type: "word", value: 101 },
              { label: "SpellMetaMagic", type: "byte", value: 1 },
              { label: "SpellFlags", type: "byte", value: 2 }
            ]]
          },
          {
            label: "MemorizedList0",
            type: "list",
            value: [[
              { label: "Spell", type: "word", value: 202 },
              { label: "SpellMetaMagic", type: "byte", value: 4 },
              { label: "SpellFlags", type: "byte", value: 8 }
            ]]
          }
        ]]
      },
      {
        label: "SkillList",
        type: "list",
        value: [
          [{ label: "Rank", type: "byte", value: 4 }],
          [{ label: "Rank", type: "byte", value: 2 }]
        ]
      },
      {
        label: "FeatList",
        type: "list",
        value: [[{ label: "Feat", type: "word", value: 12 }]]
      },
      {
        label: "SpecAbilityList",
        type: "list",
        value: [[
          { label: "Spell", type: "word", value: 44 },
          { label: "SpellFlags", type: "byte", value: 2 },
          { label: "SpellCasterLevel", type: "byte", value: 9 }
        ]]
      },
      { label: "ScriptHeartbeat", type: "resref", value: "hb_guard" }
    ], "UTC ");

    const appearance2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label MOVERATE MODELTYPE RACE PORTRAIT ENVMAP DefaultPhenoType BLOODCOLR WEAPONSCALE SIZECATEGORY",
        "0 Invalid WALK **** **** **** **** **** N 1.0 0",
        "17 Guard_Human WALK P Human po_hm_guard default_env 2 R 0.65 4"
      ].join("\n"),
      "utf-8"
    );

    const classes2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label Name Lower Plural",
        "0 Barbarian 0 0 0",
        "4 Fighter 4 4 4"
      ].join("\n"),
      "utf-8"
    );

    const feat2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label Name Description",
        "0 Invalid **** ****",
        "12 Weapon_Focus 12 12"
      ].join("\n"),
      "utf-8"
    );

    const racialtypes2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label Name Plural Appearance",
        "0 Invalid 0 0 ****",
        "6 Human 6 6 17"
      ].join("\n"),
      "utf-8"
    );

    const gender2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label Name",
        "0 Male 0",
        "1 Female 1"
      ].join("\n"),
      "utf-8"
    );

    const skills2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label Name Description",
        "0 Animal_Empathy 0 0",
        "1 Concentration 1 1"
      ].join("\n"),
      "utf-8"
    );

    const spells2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label Name SpellName",
        "44 Flame_Weapon 44 44",
        "101 Magic_Missile 101 101",
        "202 Cure_Light_Wounds 202 202"
      ].join("\n"),
      "utf-8"
    );

    const phenotype2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label Name",
        "0 Normal 0",
        "2 Large 2"
      ].join("\n"),
      "utf-8"
    );

    const capart2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "MDLNAME NODENAME",
        "0 rfoot rfoot_g",
        "2 rshin rshin_g"
      ].join("\n"),
      "utf-8"
    );

    const wingModel2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label MODEL",
        "0 **** ****",
        "4 Guard_Wings wing_guard04"
      ].join("\n"),
      "utf-8"
    );

    const tailModel2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label MODEL",
        "0 **** ****",
        "5 Guard_Tail tail_guard05"
      ].join("\n"),
      "utf-8"
    );

    const creatureSize2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label Name",
        "0 Tiny 0",
        "4 Large 4"
      ].join("\n"),
      "utf-8"
    );

    const portraits2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "BaseResRef Sex Race",
        "0 po_invalid **** ****",
        "41 po_hm_guard 0 6"
      ].join("\n"),
      "utf-8"
    );

    const soundSet2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label ResRef StrRef",
        "0 Invalid **** ****",
        "55 Guard ss_guard 1234"
      ].join("\n"),
      "utf-8"
    );

    const baseItems2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label ModelType ItemClass DefaultModel DefaultIcon InvSlotWidth InvSlotHeight EquipableSlots BaseCost Stacking ItemMultiplier MaxProps MinProps PropColumn StorePanel StorePanelSort ChargesStarting ILRStackSize WeaponMatType AmmunitionType ArcaneSpellFailure",
        "0 **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** ****",
        "6 Longsword 6 WSwLs **** iiw_sword 1 3 0x10 15 1 1.0 8 0 Weapon 1 6 0 1 1 0 0",
        "75 Scroll 75 ISc **** iit_scroll 1 1 0x0 0 1 1.0 3 0 Scroll 4 75 1 10 0 0 0"
      ].join("\n"),
      "utf-8"
    );

    const itemPropDef2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label Name SubTypeResRef CostTableResRef Param1ResRef GameStrRef Description",
        "0 **** **** **** **** **** **** ****",
        "15 CastSpell 1234 iprp_spells iprp_spellcost iprp_paramtable 4321 4322"
      ].join("\n"),
      "utf-8"
    );

    const itemBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "itm_scroll_fire" },
      { label: "LocName", type: "cexolocstring", value: { text: "Scroll of Fire", strRef: 12840 } },
      { label: "Description", type: "cexolocstring", value: { text: "Unknown scroll", strRef: 2001 } },
      {
        label: "DescIdentified",
        type: "cexolocstring",
        value: { text: "Identified fire scroll", strRef: 2002 }
      },
      { label: "BaseItem", type: "dword", value: 75 },
      { label: "CostTable", type: "dword", value: 3 },
      { label: "CostValue", type: "dword", value: 11 },
      { label: "StackSize", type: "dword", value: 5 },
      { label: "Charges", type: "dword", value: 8 },
      { label: "Identified", type: "byte", value: 0 },
      { label: "Stolen", type: "byte", value: 1 },
      {
        label: "PropertiesList",
        type: "list",
        value: [
          [
            { label: "PropertyName", type: "word", value: 15 },
            { label: "Subtype", type: "word", value: 66 },
            { label: "CostTable", type: "byte", value: 3 },
            { label: "CostValue", type: "word", value: 1 },
            { label: "Param1", type: "byte", value: 255 },
            { label: "Param1Value", type: "byte", value: 255 },
            { label: "ChanceAppear", type: "byte", value: 100 }
          ]
        ]
      }
    ], "UTI ");

    const encounterBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "enc_forest_ambush" },
      { label: "LocalizedName", type: "cexolocstring", value: "Forest Ambush" },
      { label: "Tag", type: "cexostring", value: "enc_forest_ambush_tag" },
      { label: "Description", type: "cexolocstring", value: "Hidden ambush trigger" },
      { label: "Active", type: "byte", value: 1 },
      { label: "Difficulty", type: "dword", value: 2 },
      { label: "DifficultyIndex", type: "dword", value: 1 },
      { label: "Faction", type: "dword", value: 5 },
      { label: "MaxCreatures", type: "dword", value: 6 },
      { label: "PlayerOnly", type: "byte", value: 1 },
      { label: "RecCreatures", type: "dword", value: 3 },
      { label: "Reset", type: "byte", value: 1 },
      { label: "ResetTime", type: "dword", value: 120 },
      { label: "Respawns", type: "dword", value: 2 },
      { label: "SpawnOption", type: "dword", value: 1 },
      { label: "OnEntered", type: "resref", value: "enc_enter" },
      { label: "OnExit", type: "resref", value: "enc_exit" },
      { label: "OnExhausted", type: "resref", value: "enc_empty" },
      {
        label: "CreatureList",
        type: "list",
        value: [
          [
            { label: "ResRef", type: "resref", value: "nw_wolf001" },
            { label: "Appearance", type: "dword", value: 11 },
            { label: "CR", type: "dword", value: 1 },
            { label: "SingleSpawn", type: "byte", value: 0 }
          ],
          [
            { label: "ResRef", type: "resref", value: "nw_bandit001" },
            { label: "Appearance", type: "dword", value: 22 },
            { label: "CR", type: "dword", value: 2 },
            { label: "SingleSpawn", type: "byte", value: 1 }
          ]
        ]
      }
    ], "UTE ");

    const byKey = new Map<string, ModuleBlobObjectPayload>([
      [
        "modules/current/blueprints/placeables/plc_city_gate.utd",
        {
          key: "modules/current/blueprints/placeables/plc_city_gate.utd",
          size: doorBytes.length,
          contentType: "application/octet-stream",
          etag: `door-${etagSeed}`,
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: doorBytes
        }
      ],
      [
        "modules/current/blueprints/placeables/plc_anchor_generic.utp",
        {
          key: "modules/current/blueprints/placeables/plc_anchor_generic.utp",
          size: vfxBytes.length,
          contentType: "application/octet-stream",
          etag: `vfx-${etagSeed}`,
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: vfxBytes
        }
      ],
      [
        "modules/current/blueprints/creatures/cre_guard.utc",
        {
          key: "modules/current/blueprints/creatures/cre_guard.utc",
          size: creatureBytes.length,
          contentType: "application/octet-stream",
          etag: `creature-${etagSeed}`,
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: creatureBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
          size: appearance2daBytes.length,
          contentType: "text/plain",
          etag: "appearance-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: appearance2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/classes.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/classes.2da",
          size: classes2daBytes.length,
          contentType: "text/plain",
          etag: "classes-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: classes2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/feat.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/feat.2da",
          size: feat2daBytes.length,
          contentType: "text/plain",
          etag: "feat-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: feat2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da",
          size: racialtypes2daBytes.length,
          contentType: "text/plain",
          etag: "racialtypes-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: racialtypes2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/gender.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/gender.2da",
          size: gender2daBytes.length,
          contentType: "text/plain",
          etag: "gender-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: gender2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/skills.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/skills.2da",
          size: skills2daBytes.length,
          contentType: "text/plain",
          etag: "skills-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: skills2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/spells.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/spells.2da",
          size: spells2daBytes.length,
          contentType: "text/plain",
          etag: "spells-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: spells2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/phenotype.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/phenotype.2da",
          size: phenotype2daBytes.length,
          contentType: "text/plain",
          etag: "phenotype-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: phenotype2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/capart.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/capart.2da",
          size: capart2daBytes.length,
          contentType: "text/plain",
          etag: "capart-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: capart2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da",
          size: wingModel2daBytes.length,
          contentType: "text/plain",
          etag: "wingmodel-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: wingModel2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/tailmodel.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/tailmodel.2da",
          size: tailModel2daBytes.length,
          contentType: "text/plain",
          etag: "tailmodel-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: tailModel2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/creaturesize.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/creaturesize.2da",
          size: creatureSize2daBytes.length,
          contentType: "text/plain",
          etag: "creaturesize-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: creatureSize2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/portraits.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/portraits.2da",
          size: portraits2daBytes.length,
          contentType: "text/plain",
          etag: "portraits-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: portraits2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/soundset.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/soundset.2da",
          size: soundSet2daBytes.length,
          contentType: "text/plain",
          etag: "soundset-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: soundSet2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
          size: baseItems2daBytes.length,
          contentType: "text/plain",
          etag: "baseitems-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: baseItems2daBytes
        }
      ],
      [
        "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da",
        {
          key: "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da",
          size: itemPropDef2daBytes.length,
          contentType: "text/plain",
          etag: "itempropdef-2da",
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: itemPropDef2daBytes
        }
      ],
      [
        "modules/current/blueprints/items/itm_scroll_fire.utI",
        {
          key: "modules/current/blueprints/items/itm_scroll_fire.utI",
          size: itemBytes.length,
          contentType: "application/octet-stream",
          etag: `item-${etagSeed}`,
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: itemBytes
        }
      ],
      [
        "modules/current/blueprints/encounters/enc_forest_ambush.ute",
        {
          key: "modules/current/blueprints/encounters/enc_forest_ambush.ute",
          size: encounterBytes.length,
          contentType: "application/octet-stream",
          etag: `enc-${etagSeed}`,
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: encounterBytes
        }
      ]
    ]);

    for (const [key, payload] of options.payloadOverrides ?? []) {
      byKey.set(key, payload);
    }

    const snapshotObjects = options.snapshotObjects ?? buildDefaultSnapshotObjects(etagSeed);
    const pageSize = Math.max(1, options.pageSize ?? snapshotObjects.length);
    const prefix = options.prefix ?? "modules/current/";

    return {
      replaceModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(async (_settings, key) => {
        if (options.throwOnGetKeys?.has(key)) {
          throw new Error(`cannot read ${key}`);
        }
        return byKey.get(key) ?? null;
      }),
      listModuleSnapshot: jest.fn().mockImplementation(async (_settings, query) => {
        const start = query.continuationToken ? Number(query.continuationToken) : 0;
        const safeStart = Number.isFinite(start) && start >= 0 ? start : 0;
        const limit = Math.max(1, Math.min(query.limit, pageSize));
        const objects = snapshotObjects.slice(safeStart, safeStart + limit);
        const nextToken =
          safeStart + limit < snapshotObjects.length ? String(safeStart + limit) : undefined;

        return {
          bucket: "aurora-module-assets",
          prefix,
          moduleHash: options.moduleHash ?? `hash-${etagSeed}`,
          totalFiles: snapshotObjects.length,
          totalBytes: snapshotObjects.reduce((sum, object) => sum + object.size, 0),
          truncated: Boolean(nextToken),
          continuationToken: nextToken,
          objects
        };
      })
    };
  }

  it("lists templates by kind and query filters using snapshot data", async () => {
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage()
    );

    const placeables = await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });
    const creatures = await repository.listByKind("creature", {
      limit: 20,
      offset: 0
    });
    const items = await repository.listByKind("item", {
      query: "scroll",
      limit: 20,
      offset: 0
    });
    const encounters = await repository.listByKind("encounter", {
      limit: 20,
      offset: 0
    });

    expect(placeables.total).toBe(2);
    expect(creatures.total).toBe(1);
    expect(items.total).toBe(1);
    expect(encounters.total).toBe(1);
    expect(placeables.items.some((item) => item.placeableSubtype === "door")).toBe(true);
    expect(placeables.items.some((item) => item.placeableSubtype === "vfx")).toBe(true);
    const door = placeables.items.find((item) => item.placeableSubtype === "door");
    const vfx = placeables.items.find((item) => item.resref === "plc_anchor_generic");
    expect(door?.metadata?.keyName).toBe("key_city_gate");
    expect(door?.metadata?.lockable).toBe(true);
    expect(door?.metadata?.locked).toBe(true);
    expect(door?.metadata?.openLockDc).toBe(22);
    expect(door?.metadata?.closeLockDc).toBe(20);
    expect(door?.metadata?.["script.onlock"]).toBe("script_city_gate_lock");
    expect(door?.metadata?.lookupTemplateResRef).toBe("plc_city_gate");
    expect(door?.metadata?.lookupDependencyCount).toBe(3);
    expect(String(door?.metadata?.lookupDependencyRefs).split("|")).toEqual([
      "script_city_gate_lock",
      "plc_city_gate",
      "city_gate_main"
    ]);
    expect(vfx?.metadata?.lookupTemplateResRef).toBe("plc_anchor_generic");
    expect(vfx?.metadata?.lookupModelResRef).toBe("fx_fire_anchor");
    expect(vfx?.metadata?.lookupDependencyCount).toBe(4);
    expect(String(vfx?.metadata?.lookupDependencyRefs).split("|")).toEqual([
      "fx_fire_anchor",
      "script_anchor_use",
      "plc_anchor_generic",
      "vvx_anchor_fire"
    ]);
    expect(creatures.items[0]?.metadata?.appearanceId).toBe(17);
    expect(creatures.items[0]?.metadata?.appearanceHead).toBe(22);
    expect(creatures.items[0]?.metadata?.firstName).toBe("City");
    expect(creatures.items[0]?.metadata?.lastName).toBe("Guard");
    expect(creatures.items[0]?.metadata?.comments).toBe("Palette guard comment");
    expect(creatures.items[0]?.metadata?.paletteId).toBe(9);
    expect(creatures.items[0]?.metadata?.bodyPartRFoot).toBe(4);
    expect(JSON.parse(String(creatures.items[0]?.metadata?.partModelCandidates))).toEqual([
      {
        slot: "head",
        partId: 22,
        partModelName: "head",
        modelPrefix: "pfh2_",
        modelResRef: "pfh2_head022",
        modelResRefPattern: "aurora-player-body-part",
        modelResRefPatternFormat: "p%c%c%s_%s_%03d",
        source: "utc.Appearance_Head",
        sourceKey: "modules/current/blueprints/creatures/cre_guard.utc"
      },
      {
        slot: "rFoot",
        partId: 4,
        partModelName: "rfoot",
        nodeName: "rfoot_g",
        modelPrefix: "pfh2_",
        modelResRef: "pfh2_rfoot004",
        modelResRefPattern: "aurora-player-body-part",
        modelResRefPatternFormat: "p%c%c%s_%s_%03d",
        source: "capart.2da.MDLNAME",
        source2daRow: 0,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
      },
      {
        slot: "rShin",
        partId: 1,
        partModelName: "rshin",
        nodeName: "rshin_g",
        modelPrefix: "pfh2_",
        modelResRef: "pfh2_rshin001",
        modelResRefPattern: "aurora-player-body-part",
        modelResRefPatternFormat: "p%c%c%s_%s_%03d",
        source: "capart.2da.MDLNAME",
        source2daRow: 2,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
      },
      {
        slot: "wings",
        partId: 4,
        partModelName: "Guard_Wings",
        modelResRef: "wing_guard04",
        source: "wingmodel.2da.MODEL",
        source2daRow: 4,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da"
      },
      {
        slot: "tail",
        partId: 5,
        partModelName: "Guard_Tail",
        modelResRef: "tail_guard05",
        source: "tailmodel.2da.MODEL",
        source2daRow: 5,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/tailmodel.2da"
      }
    ]);
    expect(creatures.items[0]?.metadata?.colorSkin).toBe(8);
    expect(creatures.items[0]?.metadata?.wingsNew).toBe(4);
    expect(creatures.items[0]?.metadata?.tailNew).toBe(5);
    expect(creatures.items[0]?.metadata?.plot).toBe(true);
    expect(creatures.items[0]?.metadata?.isPc).toBe(true);
    expect(creatures.items[0]?.metadata?.factionId).toBe(3);
    expect(creatures.items[0]?.metadata?.gender).toBe(1);
    expect(creatures.items[0]?.metadata?.genderLabel).toBe("Female");
    expect(creatures.items[0]?.metadata?.genderLabelSource2daRow).toBe(1);
    expect(creatures.items[0]?.metadata?.genderLabelSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/gender.2da"
    );
    expect(creatures.items[0]?.metadata?.appearanceLabel).toBe("Guard_Human");
    expect(creatures.items[0]?.metadata?.appearanceLabelSource2daRow).toBe(17);
    expect(creatures.items[0]?.metadata?.appearanceLabelSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/appearance.2da"
    );
    expect(creatures.items[0]?.metadata?.appearanceModelType).toBe("P");
    expect(creatures.items[0]?.metadata?.appearanceRaceModel).toBe("Human");
    expect(creatures.items[0]?.metadata?.appearancePortrait2da).toBe("po_hm_guard");
    expect(creatures.items[0]?.metadata?.appearanceEnvMap).toBe("default_env");
    expect(creatures.items[0]?.metadata?.appearanceDefaultPhenotype).toBe("2");
    expect(creatures.items[0]?.metadata?.appearanceBloodColor).toBe("R");
    expect(creatures.items[0]?.metadata?.appearanceWeaponScale).toBe(0.65);
    expect(creatures.items[0]?.metadata?.appearanceSizeCategory).toBe(4);
    expect(creatures.items[0]?.metadata?.appearanceSizeCategoryLabel).toBe("Large");
    expect(creatures.items[0]?.metadata?.appearanceSizeCategorySource2daRow).toBe(4);
    expect(creatures.items[0]?.metadata?.appearanceSizeCategorySourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/creaturesize.2da"
    );
    expect(creatures.items[0]?.metadata?.raceLabel).toBe("Human");
    expect(creatures.items[0]?.metadata?.raceLabelSource2daRow).toBe(6);
    expect(creatures.items[0]?.metadata?.raceLabelSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da"
    );
    expect(creatures.items[0]?.metadata?.raceAppearanceId).toBe(17);
    expect(creatures.items[0]?.metadata?.phenotypeLabel).toBe("Large");
    expect(creatures.items[0]?.metadata?.phenotypeLabelSource2daRow).toBe(2);
    expect(creatures.items[0]?.metadata?.phenotypeLabelSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/phenotype.2da"
    );
    expect(creatures.items[0]?.metadata?.portraitResRef).toBe("po_hm_guard");
    expect(creatures.items[0]?.metadata?.portraitIdEffective).toBe(41);
    expect(creatures.items[0]?.metadata?.portraitResolvedResRef).toBe("po_hm_guard");
    expect(creatures.items[0]?.metadata?.portraitResolvedSource2daRow).toBe(41);
    expect(creatures.items[0]?.metadata?.portraitResolvedSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/portraits.2da"
    );
    expect(creatures.items[0]?.metadata?.soundSetLabel).toBe("Guard");
    expect(creatures.items[0]?.metadata?.soundSetResRef).toBe("ss_guard");
    expect(creatures.items[0]?.metadata?.soundSetSource2daRow).toBe(55);
    expect(creatures.items[0]?.metadata?.soundSetSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/soundset.2da"
    );
    expect(creatures.items[0]?.metadata?.challengeRating).toBe(6);
    expect(creatures.items[0]?.metadata?.strength).toBe(16);
    expect(creatures.items[0]?.metadata?.dexterity).toBe(14);
    expect(creatures.items[0]?.metadata?.constitution).toBe(13);
    expect(creatures.items[0]?.metadata?.intelligence).toBe(10);
    expect(creatures.items[0]?.metadata?.wisdom).toBe(12);
    expect(creatures.items[0]?.metadata?.charisma).toBe(8);
    expect(creatures.items[0]?.metadata?.["script.scriptheartbeat"]).toBe("hb_guard");
    expect(JSON.parse(String(creatures.items[0]?.metadata?.classListEntries))).toEqual([
      {
        classId: 4,
        level: 5,
        memorizedSpellCount: 1,
        memorizedSpells: [
          {
            spellId: 202,
            spellLevel: 0,
            metaMagic: 4,
            flags: 9,
            spellLabel: "Cure_Light_Wounds",
            spellLabelSource2daRow: 202,
            spellLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/spells.2da"
          }
        ],
        classLabel: "Fighter",
        classLabelSource2daRow: 4,
        classLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/classes.2da"
      }
    ]);
    const skillListEntries = JSON.parse(String(creatures.items[0]?.metadata?.skillListEntries));
    expect(skillListEntries).toHaveLength(28);
    expect(skillListEntries.slice(0, 3)).toEqual([
      {
        rank: 4,
        skillId: 0,
        skillLabel: "Animal_Empathy",
        skillLabelSource2daRow: 0,
        skillLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/skills.2da"
      },
      {
        rank: 2,
        skillId: 1,
        skillLabel: "Concentration",
        skillLabelSource2daRow: 1,
        skillLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/skills.2da"
      },
      {
        rank: 0,
        skillId: 2
      }
    ]);
    expect(JSON.parse(String(creatures.items[0]?.metadata?.featListEntries))).toEqual([
      {
        featId: 12,
        featLabel: "Weapon_Focus",
        featLabelSource2daRow: 12,
        featLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/feat.2da"
      }
    ]);
    expect(JSON.parse(String(creatures.items[0]?.metadata?.specAbilityListEntries))).toEqual([
      {
        spellId: 44,
        flags: 3,
        casterLevel: 9,
        spellLabel: "Flame_Weapon",
        spellLabelSource2daRow: 44,
        spellLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/spells.2da"
      }
    ]);
    expect(items.items[0]?.metadata?.baseItem).toBe(75);
    expect(items.items[0]?.metadata?.localizedName).toBe("Scroll of Fire");
    expect(items.items[0]?.metadata?.localizedNameStrRef).toBe(12840);
    expect(items.items[0]?.metadata?.descriptionStrRef).toBe(2001);
    expect(items.items[0]?.metadata?.identifiedDescription).toBe("Identified fire scroll");
    expect(items.items[0]?.metadata?.identifiedDescriptionStrRef).toBe(2002);
    expect(items.items[0]?.metadata?.costTable).toBe(3);
    expect(items.items[0]?.metadata?.costValue).toBe(11);
    expect(items.items[0]?.metadata?.stackSize).toBe(5);
    expect(items.items[0]?.metadata?.identified).toBe(false);
    expect(items.items[0]?.metadata?.stolen).toBe(true);
    expect(items.items[0]?.metadata).toMatchObject({
      baseItem2daRow: 75,
      baseItem2daLabel: "Scroll",
      baseItem2daItemClass: "isc",
      baseItemDefaultIcon: "iit_scroll",
      baseItemInvSlotWidth: 1,
      baseItemInvSlotHeight: 1,
      baseItemEquipableSlots: "0x0",
      baseItemBaseCost: 0,
      baseItemStacking: 1,
      baseItemItemMultiplier: 1,
      baseItemMaxProps: 3,
      baseItemMinProps: 0,
      baseItemPropColumn: "Scroll",
      baseItemStorePanel: 4,
      baseItemStorePanelSort: 75,
      baseItemChargesStarting: 1,
      baseItemIlrStackSize: 10,
      baseItemWeaponMatType: 0,
      baseItemAmmunitionType: 0,
      baseItemArcaneSpellFailure: 0
    });
    expect(JSON.parse(String(items.items[0]?.metadata?.itemPropertyListEntries))).toEqual([
      {
        propertyName: 15,
        subtype: 66,
        costTable: 3,
        costValue: 1,
        param1: 255,
        param1Value: 255,
        chanceAppear: 100,
        propertyLabel: "CastSpell",
        propertyDefinitionSource2daRow: 15,
        propertyDefinitionSourceKey:
          "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da",
        subTypeTable: "iprp_spells",
        costTableDefinition: "iprp_spellcost",
        param1Table: "iprp_paramtable",
        nameStrRef: 1234,
        gameStrRef: 4321,
        descriptionStrRef: 4322
      }
    ]);

    const encounter = encounters.items[0];
    expect(encounter?.templateId).toBe("enc_enc_forest_ambush");
    expect(encounter?.kind).toBe("encounter");
    expect(encounter?.category).toBe("encounter");
    expect(encounter?.metadata?.sourceFileType).toBe("UTE ");
    expect(encounter?.metadata?.localizedName).toBe("Forest Ambush");
    expect(encounter?.metadata?.active).toBe(true);
    expect(encounter?.metadata?.difficulty).toBe(2);
    expect(encounter?.metadata?.difficultyIndex).toBe(1);
    expect(encounter?.metadata?.factionId).toBe(5);
    expect(encounter?.metadata?.maxCreatures).toBe(6);
    expect(encounter?.metadata?.playerOnly).toBe(true);
    expect(encounter?.metadata?.recCreatures).toBe(3);
    expect(encounter?.metadata?.reset).toBe(true);
    expect(encounter?.metadata?.resetTime).toBe(120);
    expect(encounter?.metadata?.respawns).toBe(2);
    expect(encounter?.metadata?.spawnOption).toBe(1);
    expect(encounter?.metadata?.encounterCreatureListCount).toBe(2);
    expect(JSON.parse(String(encounter?.metadata?.encounterCreatureListEntries))).toEqual([
      {
        resRef: "nw_wolf001",
        appearance: 11,
        challengeRating: 1,
        singleSpawn: false
      },
      {
        resRef: "nw_bandit001",
        appearance: 22,
        challengeRating: 2,
        singleSpawn: true
      }
    ]);
    expect(encounter?.metadata?.["script.onentered"]).toBe("enc_enter");
    expect(encounter?.metadata?.["script.onexit"]).toBe("enc_exit");
    expect(encounter?.metadata?.["script.onexhausted"]).toBe("enc_empty");
  });

  it("syncs source-backed creature UTC templates before building a creature catalog index", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const baseSettings = await runtimeSettingsRepository.get();
    runtimeSettingsRepository.get.mockResolvedValue({
      ...baseSettings,
      sources: {
        ...baseSettings.sources,
        creature: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: false,
          includeVanilla: true,
          hakProfileId: "",
          hakPriorityList: []
        }
      }
    });

    const snapshotObjects = buildDefaultSnapshotObjects("creature-source-sync");
    const syncedCreatureKey =
      "modules/current/__aurora/sources/vanilla/creatures/nw_goblin001.utc";
    const syncedCreatureBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "nw_goblin001" },
      { label: "LocName", type: "cexolocstring", value: "Goblin Scout" },
      { label: "Tag", type: "cexostring", value: "nw_goblin001" },
      { label: "Appearance_Type", type: "dword", value: 17 },
      { label: "Race", type: "dword", value: 6 }
    ], "UTC ");
    const moduleBlobStorage = createModuleBlobStorage("creature-source-sync", {
      snapshotObjects
    });
    const defaultGetModuleObject =
      moduleBlobStorage.getModuleObject.getMockImplementation();
    moduleBlobStorage.getModuleObject.mockImplementation(async (settings, key) => {
      if (key === syncedCreatureKey) {
        return {
          key: syncedCreatureKey,
          size: syncedCreatureBytes.length,
          contentType: "application/octet-stream",
          etag: "synced-goblin",
          lastModified: "2026-06-29T12:00:00.000Z",
          bytes: syncedCreatureBytes
        };
      }
      return defaultGetModuleObject?.(settings, key) ?? null;
    });

    const syncCreatureTemplateSources = jest.fn(async () => {
      snapshotObjects.push({
        key: syncedCreatureKey,
        size: syncedCreatureBytes.length,
        lastModified: "2026-06-29T12:00:00.000Z",
        etag: "synced-goblin"
      });
      return {
        mode: "creature-template-source-sync",
        settingsRevision: 1,
        triggeredBy: "catalog-creature-template-auto-sync",
        triggeredAt: "2026-06-29T12:00:00.000Z",
        enabled: true,
        source: {
          vanillaDataPath: "",
          hakPaths: [],
          missingHakPaths: []
        },
        discoveredHakTemplates: 0,
        discoveredVanillaTemplates: 1,
        uploadedFiles: 1,
        uploadedBytes: syncedCreatureBytes.length,
        files: [
          {
            fileName: "__aurora/sources/vanilla/creatures/nw_goblin001.utc",
            objectKey: syncedCreatureKey,
            size: syncedCreatureBytes.length,
            resourceType: 2027,
            etag: "synced-goblin"
          }
        ]
      };
    });
    const runtimeSettingsApplicationService = {
      syncCreatureTemplateSources,
      syncPlaceableModelSources: jest.fn(async () => ({ uploadedFiles: 0 })),
      getRuntimeSettings: jest.fn(async () => runtimeSettingsRepository.get()),
      getResolvedHakSettings: jest.fn(async () => ({
        creature: { hakPaths: [], hakPriorityList: [] },
        placeable: { hakPaths: [], hakPriorityList: [] },
        tile: { hakPaths: [], hakPriorityList: [] },
        area: { hakPaths: [], hakPriorityList: [] },
        vfx: { hakPaths: [], hakPriorityList: [] },
        sound: { hakPaths: [], hakPriorityList: [] }
      }))
    } as unknown as RuntimeSettingsApplicationService;
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      runtimeSettingsRepository,
      moduleBlobStorage,
      runtimeSettingsApplicationService
    );

    const creatures = await repository.listByKind("creature", { limit: 20, offset: 0 });

    expect(syncCreatureTemplateSources).toHaveBeenCalledTimes(1);
    expect(creatures.total).toBe(2);
    expect(new Set(creatures.items.map((item) => item.resref))).toEqual(
      new Set(["cre_guard", "nw_goblin001"])
    );
    expect(
      creatures.items.find((item) => item.resref === "nw_goblin001")?.metadata?.sourceObjectKey
    ).toBe(syncedCreatureKey);
  });

  it("syncs missing HAK creature UTC templates even when vanilla creature sources already exist", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const baseSettings = await runtimeSettingsRepository.get();
    runtimeSettingsRepository.get.mockResolvedValue({
      ...baseSettings,
      sources: {
        ...baseSettings.sources,
        creature: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: true,
          includeVanilla: true,
          hakProfileId: "lc_creatures",
          hakPriorityList: []
        }
      }
    });

    const snapshotObjects = buildDefaultSnapshotObjects("creature-hak-source-sync");
    const vanillaCreatureKey =
      "modules/current/__aurora/sources/vanilla/creatures/tm_cr_hlfdragred.utc";
    const hakCreatureKey =
      "modules/current/__aurora/sources/hak/cep3_core2/tm_cr_hlfdragred.utc";
    const vanillaCreatureBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "tm_cr_hlfdragred" },
      { label: "LocName", type: "cexolocstring", value: "Vanilla Half Dragon Red" },
      { label: "Appearance_Type", type: "dword", value: 17 }
    ], "UTC ");
    const hakCreatureBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "tm_cr_hlfdragred" },
      { label: "LocName", type: "cexolocstring", value: "Half Dragon Red" },
      { label: "Appearance_Type", type: "dword", value: 17 }
    ], "UTC ");
    snapshotObjects.push({
      key: vanillaCreatureKey,
      size: vanillaCreatureBytes.length,
      lastModified: "2026-06-29T12:00:00.000Z",
      etag: "vanilla-half-dragon"
    });

    const moduleBlobStorage = createModuleBlobStorage("creature-hak-source-sync", {
      snapshotObjects
    });
    const defaultGetModuleObject =
      moduleBlobStorage.getModuleObject.getMockImplementation();
    moduleBlobStorage.getModuleObject.mockImplementation(async (settings, key) => {
      if (key === vanillaCreatureKey) {
        return {
          key: vanillaCreatureKey,
          size: vanillaCreatureBytes.length,
          contentType: "application/octet-stream",
          etag: "vanilla-half-dragon",
          lastModified: "2026-06-29T12:00:00.000Z",
          bytes: vanillaCreatureBytes
        };
      }
      if (key === hakCreatureKey) {
        return {
          key: hakCreatureKey,
          size: hakCreatureBytes.length,
          contentType: "application/octet-stream",
          etag: "hak-half-dragon",
          lastModified: "2026-06-29T12:00:01.000Z",
          bytes: hakCreatureBytes
        };
      }
      return defaultGetModuleObject?.(settings, key) ?? null;
    });

    const syncCreatureTemplateSources = jest.fn(async () => {
      snapshotObjects.push({
        key: hakCreatureKey,
        size: hakCreatureBytes.length,
        lastModified: "2026-06-29T12:00:01.000Z",
        etag: "hak-half-dragon"
      });
      return {
        mode: "creature-template-source-sync",
        settingsRevision: 1,
        triggeredBy: "catalog-creature-template-auto-sync",
        triggeredAt: "2026-06-29T12:00:01.000Z",
        enabled: true,
        source: {
          vanillaDataPath: "",
          hakPaths: ["cep3_core2.hak"],
          missingHakPaths: []
        },
        discoveredHakTemplates: 1,
        discoveredVanillaTemplates: 1,
        uploadedFiles: 1,
        uploadedBytes: hakCreatureBytes.length,
        files: [
          {
            fileName: "__aurora/sources/hak/cep3_core2/tm_cr_hlfdragred.utc",
            objectKey: hakCreatureKey,
            size: hakCreatureBytes.length,
            resourceType: 2027,
            etag: "hak-half-dragon"
          }
        ]
      };
    });
    const runtimeSettingsApplicationService = {
      syncCreatureTemplateSources,
      syncPlaceableModelSources: jest.fn(async () => ({ uploadedFiles: 0 })),
      getRuntimeSettings: jest.fn(async () => runtimeSettingsRepository.get()),
      getResolvedHakSettings: jest.fn(async () => ({
        creature: { hakPaths: ["cep3_core2.hak"], hakPriorityList: ["cep3_core2.hak"] },
        placeable: { hakPaths: [], hakPriorityList: [] },
        tile: { hakPaths: [], hakPriorityList: [] },
        area: { hakPaths: [], hakPriorityList: [] },
        vfx: { hakPaths: [], hakPriorityList: [] },
        sound: { hakPaths: [], hakPriorityList: [] }
      }))
    } as unknown as RuntimeSettingsApplicationService;
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      runtimeSettingsRepository,
      moduleBlobStorage,
      runtimeSettingsApplicationService
    );

    const creatures = await repository.listByKind("creature", { limit: 20, offset: 0 });

    expect(syncCreatureTemplateSources).toHaveBeenCalledTimes(1);
    expect(creatures.total).toBe(2);
    expect(new Set(creatures.items.map((item) => item.resref))).toEqual(
      new Set(["cre_guard", "tm_cr_hlfdragred"])
    );
    expect(
      creatures.items.find((item) => item.resref === "tm_cr_hlfdragred")?.metadata?.sourceObjectKey
    ).toBe(hakCreatureKey);
  });

  it("adds normalized lookup hints for placeable asset references", async () => {
    const lookupKey = "modules/current/blueprints/placeables/plc_lookup_case.utp";
    const lookupBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "PLC_LOOKUP_CASE" },
      { label: "Tag", type: "cexostring", value: "Tag With Space" },
      { label: "ModelName", type: "resref", value: "FX Fire Anchor" },
      { label: "OnUsed", type: "resref", value: "Script Use Case" }
    ]);

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("lookup", {
        snapshotObjects: [
          {
            key: lookupKey,
            size: lookupBytes.length,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "lookup-case"
          }
        ],
        payloadOverrides: new Map([
          [
            lookupKey,
            {
              key: lookupKey,
              size: lookupBytes.length,
              contentType: "application/octet-stream",
              etag: "lookup-case",
              lastModified: "2026-05-25T10:00:00.000Z",
              bytes: lookupBytes
            }
          ]
        ])
      })
    );

    const placeables = await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });

    expect(placeables.total).toBe(1);
    const [record] = placeables.items;
    expect(record.resref).toBe("plc_lookup_case");
    expect(record.metadata?.templateResRef).toBe("PLC_LOOKUP_CASE");
    expect(record.metadata?.lookupTemplateResRef).toBe("plc_lookup_case");
    expect(record.metadata?.lookupModelResRef).toBe("fx_fire_anchor");
    expect(record.metadata?.lookupDependencyCount).toBe(4);
    expect(String(record.metadata?.lookupDependencyRefs).split("|")).toEqual([
      "fx_fire_anchor",
      "script_use_case",
      "plc_lookup_case",
      "tag_with_space"
    ]);
  });

  it("maps appearanceId to lookup modelResRef when UTP omits model and placeables.2da is present", async () => {
    const placeableKey = "modules/current/blueprints/placeables/plc_appearance_lookup.utp";
    const placeableBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_appearance_lookup" },
      { label: "Tag", type: "cexostring", value: "appearance_lookup" },
      { label: "Appearance", type: "dword", value: 42 }
    ]);

    const placeables2daKey = "modules/current/two-da/placeables.2da";
    const placeables2daBytes = Buffer.from(
      ["2DA V2.0", "", "  MODELNAME", "0 ****", "42 plc_lookup_model"].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("appearance-lookup", {
        snapshotObjects: [
          {
            key: placeableKey,
            size: placeableBytes.length,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "appearance-utp"
          },
          {
            key: placeables2daKey,
            size: placeables2daBytes.length,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "appearance-2da"
          }
        ],
        payloadOverrides: new Map([
          [
            placeableKey,
            {
              key: placeableKey,
              size: placeableBytes.length,
              contentType: "application/octet-stream",
              etag: "appearance-utp",
              lastModified: "2026-05-25T10:00:00.000Z",
              bytes: placeableBytes
            }
          ],
          [
            placeables2daKey,
            {
              key: placeables2daKey,
              size: placeables2daBytes.length,
              contentType: "text/plain",
              etag: "appearance-2da",
              lastModified: "2026-05-25T10:00:00.000Z",
              bytes: placeables2daBytes
            }
          ]
        ])
      })
    );

    const placeables = await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });

    expect(placeables.total).toBe(2);
    const record = placeables.items.find((item) => item.resref === "plc_appearance_lookup");
    expect(record).toBeDefined();
    expect(record!.metadata?.appearanceId).toBe(42);
    expect(record!.metadata?.modelResRef).toBeUndefined();
    expect(record!.metadata?.lookupModelResRef).toBe("plc_lookup_model");
    expect(record!.metadata?.lookupDependencyCount).toBe(3);
    expect(String(record!.metadata?.lookupDependencyRefs).split("|")).toEqual([
      "plc_appearance_lookup",
      "appearance_lookup",
      "plc_lookup_model"
    ]);
  });

  it("maps creature missing WalkRate through appearance.2da MOVERATE and creaturespeed.2da 2DAName", async () => {
    const creatureKey = "modules/current/blueprints/creatures/cre_speed_lookup.utc";
    const creatureBytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "cre_speed_lookup" },
        { label: "Appearance_Type", type: "dword", value: 42 }
      ],
      "UTC "
    );

    const appearance2daKey = "modules/current/__aurora/sources/hak/lc_2da/appearance.2da";
    const appearance2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label MOVERATE MODELTYPE RACE PORTRAIT ENVMAP DefaultPhenoType BLOODCOLR WEAPONSCALE SIZECATEGORY",
        "0 **** **** **** **** **** **** **** **** **** ****",
        "42 Guard NORM P Human po_hm_guard default_env 2 R 0.75 4"
      ].join("\n"),
      "utf-8"
    );
    const speed2daKey = "modules/current/__aurora/sources/hak/lc_2da/creaturespeed.2da";
    const speed2daBytes = Buffer.from(
      ["2DA V2.0", "", "  2DAName", "0 ****", "7 NORM"].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("creature-walkrate-lookup", {
        snapshotObjects: [
          {
            key: creatureKey,
            size: creatureBytes.length,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "creature-utc"
          },
          {
            key: appearance2daKey,
            size: appearance2daBytes.length,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "appearance-2da"
          },
          {
            key: speed2daKey,
            size: speed2daBytes.length,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "creaturespeed-2da"
          }
        ],
        payloadOverrides: new Map([
          [
            creatureKey,
            {
              key: creatureKey,
              size: creatureBytes.length,
              contentType: "application/octet-stream",
              etag: "creature-utc",
              lastModified: "2026-05-25T10:00:00.000Z",
              bytes: creatureBytes
            }
          ],
          [
            appearance2daKey,
            {
              key: appearance2daKey,
              size: appearance2daBytes.length,
              contentType: "text/plain",
              etag: "appearance-2da",
              lastModified: "2026-05-25T10:00:00.000Z",
              bytes: appearance2daBytes
            }
          ],
          [
            speed2daKey,
            {
              key: speed2daKey,
              size: speed2daBytes.length,
              contentType: "text/plain",
              etag: "creaturespeed-2da",
              lastModified: "2026-05-25T10:00:00.000Z",
              bytes: speed2daBytes
            }
          ]
        ])
      })
    );

    const creatures = await repository.listByKind("creature", {
      limit: 20,
      offset: 0
    });

    expect(creatures.total).toBe(1);
    const [record] = creatures.items;
    expect(record.metadata?.appearanceId).toBe(42);
    expect(record.metadata?.walkRate).toBeUndefined();
    expect(record.metadata?.walkRateEffective).toBe(7);
    expect(record.metadata?.walkRateSource2daRow).toBe(42);
    expect(record.metadata?.walkRateSource2daName).toBe("NORM");
    expect(record.metadata?.walkRateSpeed2daRow).toBe(7);
    expect(record.metadata?.walkRateAppearance2daSourceKey).toBe(appearance2daKey);
    expect(record.metadata?.walkRateSpeed2daSourceKey).toBe(speed2daKey);
    expect(record.metadata?.appearanceModelType).toBe("P");
    expect(record.metadata?.appearanceRaceModel).toBe("Human");
    expect(record.metadata?.appearancePortrait2da).toBe("po_hm_guard");
    expect(record.metadata?.appearanceEnvMap).toBe("default_env");
    expect(record.metadata?.appearanceDefaultPhenotype).toBe("2");
    expect(record.metadata?.appearanceBloodColor).toBe("R");
    expect(record.metadata?.appearanceWeaponScale).toBe(0.75);
    expect(record.metadata?.appearanceSizeCategory).toBe(4);
  });

  it("changes creature process cache keys when appearance.2da metadata changes", async () => {
    const creatureKey = "modules/current/blueprints/creatures/cre_profile_cache.utc";
    const creatureBytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "cre_profile_cache" },
        { label: "Appearance_Type", type: "dword", value: 42 }
      ],
      "UTC "
    );
    const appearance2daKey = "modules/current/__aurora/sources/hak/lc_2da/appearance.2da";

    const createRepository = (raceModel: string) => {
      const appearance2daBytes = Buffer.from(
        [
          "2DA V2.0",
          "",
          "  Label MOVERATE MODELTYPE RACE PORTRAIT ENVMAP DefaultPhenoType BLOODCOLR WEAPONSCALE SIZECATEGORY",
          "0 **** **** **** **** **** **** **** **** **** ****",
          `42 Guard NORM P ${raceModel} po_hm_guard default_env 2 R 0.75 4`
        ].join("\n"),
        "utf-8"
      );

      return new ModuleSnapshotTemplateCatalogRepository(
        createRuntimeSettingsRepository(),
        createModuleBlobStorage(`creature-profile-cache-${raceModel}`, {
          snapshotObjects: [
            {
              key: creatureKey,
              size: creatureBytes.length,
              lastModified: "2026-05-25T10:00:00.000Z",
              etag: "creature-utc"
            },
            {
              key: appearance2daKey,
              size: appearance2daBytes.length,
              lastModified: "2026-05-25T10:00:00.000Z",
              etag: `appearance-${raceModel}`
            }
          ],
          payloadOverrides: new Map([
            [
              creatureKey,
              {
                key: creatureKey,
                size: creatureBytes.length,
                contentType: "application/octet-stream",
                etag: "creature-utc",
                lastModified: "2026-05-25T10:00:00.000Z",
                bytes: creatureBytes
              }
            ],
            [
              appearance2daKey,
              {
                key: appearance2daKey,
                size: appearance2daBytes.length,
                contentType: "text/plain",
                etag: `appearance-${raceModel}`,
                lastModified: "2026-05-25T10:00:00.000Z",
                bytes: appearance2daBytes
              }
            ]
          ])
        })
      );
    };

    const repositoryA = createRepository("Human");
    const creaturesA = await repositoryA.listByKind("creature", { limit: 20, offset: 0 });
    const keyA = repositoryA.getPrecomputedTemplateCacheKey("creature", "cre_cre_profile_cache");
    const repositoryB = createRepository("Elf");
    const creaturesB = await repositoryB.listByKind("creature", { limit: 20, offset: 0 });
    const keyB = repositoryB.getPrecomputedTemplateCacheKey("creature", "cre_cre_profile_cache");

    expect(creaturesA.items[0]?.metadata?.appearanceRaceModel).toBe("Human");
    expect(creaturesB.items[0]?.metadata?.appearanceRaceModel).toBe("Elf");
    expect(keyA).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/u));
    expect(keyB).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/u));
    expect(keyA).not.toBe(keyB);
  });

  it("resolves empty creature locstring StringRefs through base and custom TLK", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "aurora-creature-tlk-"));
    const tlkBasePath = join(tempDir, "dialog.tlk");
    const tlkCustomPath = join(tempDir, "custom.tlk");

    try {
      await writeFile(
        tlkBasePath,
        buildTlkBuffer({
          123: "TLK City",
          124: "Guard",
          125: "TLK description",
          126: "TLK deity"
        })
      );
      await writeFile(tlkCustomPath, buildTlkBuffer({ 7: "Custom Elf" }));

      const creatureKey = "modules/current/blueprints/creatures/cre_tlk_guard.utc";
      const creatureBytes = buildGffBuffer(
        [
          { label: "TemplateResRef", type: "resref", value: "cre_tlk_guard" },
          { label: "FirstName", type: "cexolocstring", value: { strRef: 123 } },
          { label: "LastName", type: "cexolocstring", value: { strRef: 124 } },
          { label: "Description", type: "cexolocstring", value: { strRef: 125 } },
          {
            label: "Deity",
            type: "cexolocstring",
            value: { text: "Local Deity", strRef: 126 }
          },
          { label: "Subrace", type: "cexolocstring", value: { strRef: 0x01000007 } }
        ],
        "UTC "
      );

      const repository = new ModuleSnapshotTemplateCatalogRepository(
        createRuntimeSettingsRepository("modules/current", { tlkBasePath, tlkCustomPath }),
        createModuleBlobStorage("creature-tlk", {
          snapshotObjects: [
            {
              key: creatureKey,
              size: creatureBytes.length,
              lastModified: "2026-05-25T10:00:00.000Z",
              etag: "creature-tlk-utc"
            }
          ],
          payloadOverrides: new Map([
            [
              creatureKey,
              {
                key: creatureKey,
                size: creatureBytes.length,
                contentType: "application/octet-stream",
                etag: "creature-tlk-utc",
                lastModified: "2026-05-25T10:00:00.000Z",
                bytes: creatureBytes
              }
            ]
          ])
        })
      );

      const creatures = await repository.listByKind("creature", {
        limit: 20,
        offset: 0
      });

      expect(creatures.total).toBe(1);
      const [record] = creatures.items;
      expect(record.name).toBe("TLK City Guard");
      expect(record.metadata?.firstName).toBe("TLK City");
      expect(record.metadata?.firstNameStrRef).toBe(123);
      expect(record.metadata?.lastName).toBe("Guard");
      expect(record.metadata?.lastNameStrRef).toBe(124);
      expect(record.metadata?.description).toBe("TLK description");
      expect(record.metadata?.descriptionStrRef).toBe(125);
      expect(record.metadata?.deity).toBe("Local Deity");
      expect(record.metadata?.deityStrRef).toBe(126);
      expect(record.metadata?.subrace).toBe("Custom Elf");
      expect(record.metadata?.subraceStrRef).toBe(0x01000007);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("resolves creature class labels from classes.2da Name TLK StringRefs", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "aurora-class-tlk-"));
    const tlkBasePath = join(tempDir, "dialog.tlk");

    try {
      await writeFile(tlkBasePath, buildTlkBuffer({ 444: "TLK Fighter" }));

      const creatureKey = "modules/current/blueprints/creatures/cre_class_tlk.utc";
      const classes2daKey = "modules/current/__aurora/sources/hak/lc_2da/classes.2da";
      const creatureBytes = buildGffBuffer(
        [
          { label: "TemplateResRef", type: "resref", value: "cre_class_tlk" },
          {
            label: "ClassList",
            type: "list",
            value: [[
              { label: "Class", type: "dword", value: 4 },
              { label: "ClassLevel", type: "dword", value: 5 }
            ]]
          }
        ],
        "UTC "
      );
      const classes2daBytes = Buffer.from(
        [
          "2DA V2.0",
          "",
          "Label Name Lower Plural",
          "0 Invalid **** **** ****",
          "4 Fallback_Fighter 444 **** ****"
        ].join("\n"),
        "utf-8"
      );

      const repository = new ModuleSnapshotTemplateCatalogRepository(
        createRuntimeSettingsRepository("modules/current", { tlkBasePath }),
        createModuleBlobStorage("class-tlk", {
          snapshotObjects: [
            {
              key: creatureKey,
              size: creatureBytes.length,
              lastModified: "2026-05-25T10:00:00.000Z",
              etag: "creature-class-tlk-utc"
            },
            {
              key: classes2daKey,
              size: classes2daBytes.length,
              lastModified: "2026-05-25T10:00:00.000Z",
              etag: "classes-tlk-2da"
            }
          ],
          payloadOverrides: new Map([
            [
              creatureKey,
              {
                key: creatureKey,
                size: creatureBytes.length,
                contentType: "application/octet-stream",
                etag: "creature-class-tlk-utc",
                lastModified: "2026-05-25T10:00:00.000Z",
                bytes: creatureBytes
              }
            ],
            [
              classes2daKey,
              {
                key: classes2daKey,
                size: classes2daBytes.length,
                contentType: "text/plain",
                etag: "classes-tlk-2da",
                lastModified: "2026-05-25T10:00:00.000Z",
                bytes: classes2daBytes
              }
            ]
          ])
        })
      );

      const creatures = await repository.listByKind("creature", {
        limit: 20,
        offset: 0
      });

      expect(creatures.total).toBe(1);
      expect(JSON.parse(String(creatures.items[0]?.metadata?.classListEntries))).toEqual([
        {
          classId: 4,
          level: 5,
          classLabel: "TLK Fighter",
          classLabelSource2daRow: 4,
          classLabelSourceKey: classes2daKey
        }
      ]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("links creature inventory and equipped references to item templates and cache fingerprints", async () => {
    const creatureKey = "modules/current/blueprints/creatures/cre_inventory_link.utc";
    const creatureBytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "cre_inventory_link" },
        {
          label: "ItemList",
          type: "list",
          value: [
            [
              { label: "InventoryRes", type: "resref", value: "itm_potion_link" },
              { label: "Repos_PosX", type: "dword", value: 1 },
              { label: "Repos_Posy", type: "dword", value: 2 }
            ]
          ]
        },
        {
          label: "Equip_ItemList",
          type: "list",
          value: [
            {
              typeId: 0x10,
              fields: [
                { label: "EquippedRes", type: "resref", value: "itm_sword_link" },
                { label: "Dropable", type: "byte", value: 1 }
              ]
            }
          ]
        }
      ],
      "UTC "
    );
    const potionKey = "modules/current/blueprints/items/itm_potion_link.uti";
    const potionBytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "itm_potion_link" },
        { label: "LocName", type: "cexolocstring", value: "Linked Potion" },
        { label: "BaseItem", type: "dword", value: 46 },
        { label: "CostValue", type: "dword", value: 11 },
        { label: "StackSize", type: "word", value: 3 },
        { label: "Identified", type: "byte", value: 1 },
        { label: "OnUsed", type: "resref", value: "it_potion_use" }
      ],
      "UTI "
    );
    const swordKey = "modules/current/blueprints/items/itm_sword_link.uti";
    const swordBytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "itm_sword_link" },
        { label: "LocName", type: "cexolocstring", value: "Linked Sword" },
        { label: "BaseItem", type: "dword", value: 6 },
        { label: "ModelPart1", type: "byte", value: 2 },
        { label: "ModelPart2", type: "byte", value: 1 },
        { label: "ModelPart3", type: "byte", value: 3 },
        { label: "Charges", type: "dword", value: 0 },
        { label: "Stolen", type: "byte", value: 0 }
      ],
      "UTI "
    );
    const baseItems2daKey = "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da";
    const baseItems2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "Label ModelType ItemClass DefaultModel DefaultIcon InvSlotWidth InvSlotHeight EquipableSlots BaseCost Stacking ItemMultiplier MaxProps MinProps PropColumn StorePanel StorePanelSort ChargesStarting ILRStackSize WeaponMatType AmmunitionType ArcaneSpellFailure",
        "0 **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** ****",
        "6 Longsword 6 WSwLs **** iiw_sword 1 3 0x10 15 1 1.0 8 0 Weapon 1 6 0 1 1 0 0"
      ].join("\n"),
      "utf-8"
    );

    const createRepository = (itemVersion: string) =>
      new ModuleSnapshotTemplateCatalogRepository(
        createRuntimeSettingsRepository(),
        createModuleBlobStorage(`creature-item-links-${itemVersion}`, {
          snapshotObjects: [
            {
              key: creatureKey,
              size: creatureBytes.length,
              lastModified: "2026-05-25T10:00:00.000Z",
              etag: "creature-utc"
            },
            {
              key: potionKey,
              size: potionBytes.length + itemVersion.length,
              lastModified: `2026-05-25T10:00:0${itemVersion}.000Z`,
              etag: `potion-${itemVersion}`
            },
            {
              key: swordKey,
              size: swordBytes.length,
              lastModified: "2026-05-25T10:00:00.000Z",
              etag: "sword-uti"
            },
            {
              key: baseItems2daKey,
              size: baseItems2daBytes.length,
              lastModified: "2026-05-25T10:00:00.000Z",
              etag: "baseitems-2da"
            }
          ],
          payloadOverrides: new Map([
            [
              creatureKey,
              {
                key: creatureKey,
                size: creatureBytes.length,
                contentType: "application/octet-stream",
                etag: "creature-utc",
                lastModified: "2026-05-25T10:00:00.000Z",
                bytes: creatureBytes
              }
            ],
            [
              potionKey,
              {
                key: potionKey,
                size: potionBytes.length + itemVersion.length,
                contentType: "application/octet-stream",
                etag: `potion-${itemVersion}`,
                lastModified: `2026-05-25T10:00:0${itemVersion}.000Z`,
                bytes: potionBytes
              }
            ],
            [
              swordKey,
              {
                key: swordKey,
                size: swordBytes.length,
                contentType: "application/octet-stream",
                etag: "sword-uti",
                lastModified: "2026-05-25T10:00:00.000Z",
                bytes: swordBytes
              }
            ],
            [
              baseItems2daKey,
              {
                key: baseItems2daKey,
                size: baseItems2daBytes.length,
                contentType: "text/plain",
                etag: "baseitems-2da",
                lastModified: "2026-05-25T10:00:00.000Z",
                bytes: baseItems2daBytes
              }
            ]
          ])
        })
      );

    const repositoryA = createRepository("1");
    const creatures = await repositoryA.listByKind("creature", {
      limit: 20,
      offset: 0
    });

    const [record] = creatures.items;
    const inventoryItems = JSON.parse(String(record.metadata.inventoryItemListEntries));
    const equippedItems = JSON.parse(String(record.metadata.equipItemListEntries));

    expect(inventoryItems).toEqual([
      expect.objectContaining({
        resRef: "itm_potion_link",
        itemTemplateId: "itm_itm_potion_link",
        itemResref: "itm_potion_link",
        itemSourceObjectKey: potionKey,
        itemTemplateMetadata: expect.objectContaining({
          sourceFileType: "UTI ",
          templateResRef: "itm_potion_link",
          localizedName: "Linked Potion",
          baseItem: 46,
          costValue: 11,
          stackSize: 3,
          identified: true,
          "script.onused": "it_potion_use"
        }),
        x: 1,
        y: 2
      })
    ]);
    expect(equippedItems).toEqual([
      expect.objectContaining({
        resRef: "itm_sword_link",
        itemTemplateId: "itm_itm_sword_link",
        itemResref: "itm_sword_link",
        itemSourceObjectKey: swordKey,
        itemTemplateMetadata: expect.objectContaining({
          templateResRef: "itm_sword_link",
          localizedName: "Linked Sword",
          baseItem: 6,
          baseItem2daRow: 6,
          baseItem2daLabel: "Longsword",
          baseItem2daSourceKey: "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
          baseItem2daItemClass: "wswls",
          baseItemModelType: "wswls",
          baseItemDefaultIcon: "iiw_sword",
          baseItemInvSlotWidth: 1,
          baseItemInvSlotHeight: 3,
          baseItemEquipableSlots: "0x10",
          baseItemBaseCost: 15,
          baseItemStorePanel: 1,
          baseItemStorePanelSort: 6,
          modelPart1: 2,
          modelPart2: 1,
          modelPart3: 3,
          charges: 0,
          stolen: false
        }),
        slotMask: 0x10,
        dropable: true
      })
    ]);

    const cacheKeyA = repositoryA.getPrecomputedTemplateCacheKey(
      "creature",
      "cre_cre_inventory_link"
    );
    const repositoryB = createRepository("2");
    await repositoryB.listByKind("creature", { limit: 20, offset: 0 });
    const cacheKeyB = repositoryB.getPrecomputedTemplateCacheKey(
      "creature",
      "cre_cre_inventory_link"
    );

    expect(cacheKeyA).toBeTruthy();
    expect(cacheKeyB).toBeTruthy();
    expect(cacheKeyA).not.toBe(cacheKeyB);
  });

  it("reuses parsed placeables.2da rows for synthetic candidates and appearance lookup", async () => {
    const placeableKey = "modules/current/blueprints/placeables/plc_appearance_lookup.utp";
    const placeableBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_appearance_lookup" },
      { label: "Appearance", type: "dword", value: 42 }
    ]);

    const placeables2daKey = "modules/current/__aurora/sources/vanilla/placeables.2da";
    const placeables2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label ModelName",
        "0 **** ****",
        "42 Lookup plc_lookup_model",
        "43 Chair plc_chair01"
      ].join("\n"),
      "utf-8"
    );
    const moduleBlobStorage = createModuleBlobStorage("appearance-cache", {
      snapshotObjects: [
        {
          key: placeableKey,
          size: placeableBytes.length,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "appearance-utp"
        },
        {
          key: placeables2daKey,
          size: placeables2daBytes.length,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "appearance-2da"
        }
      ],
      payloadOverrides: new Map([
        [
          placeableKey,
          {
            key: placeableKey,
            size: placeableBytes.length,
            contentType: "application/octet-stream",
            etag: "appearance-utp",
            lastModified: "2026-05-25T10:00:00.000Z",
            bytes: placeableBytes
          }
        ],
        [
          placeables2daKey,
          {
            key: placeables2daKey,
            size: placeables2daBytes.length,
            contentType: "text/plain",
            etag: "appearance-2da",
            lastModified: "2026-05-25T10:00:00.000Z",
            bytes: placeables2daBytes
          }
        ]
      ])
    });
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      moduleBlobStorage
    );

    const placeables = await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });
    const lookup = await repository.resolvePlaceableAppearanceModel(42);

    expect(placeables.items.map((item) => item.resref)).toEqual(
      expect.arrayContaining(["plc_appearance_lookup", "plc_chair01"])
    );
    expect(lookup).toEqual({
      modelResRef: "plc_lookup_model",
      source2da: "placeables.2da",
      rowId: 42
    });
    expect(
      moduleBlobStorage.getModuleObject.mock.calls.filter(([, key]) => key === placeables2daKey)
    ).toHaveLength(1);
  });

  it("uses the highest-priority placeables.2da as a whole for Aurora appearance lookup", async () => {
    const vanillaTwoDaKey = "modules/current/__aurora/sources/vanilla/placeables.2da";
    const lcTwoDaKey = "modules/current/__aurora/sources/hak/lc_2da/placeables.2da";
    const witcherTwoDaKey = "modules/current/__aurora/sources/hak/witcher/placeables.2da";
    const vanillaTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "12301 Vanilla **** plc_vanilla 1"
      ].join("\n"),
      "utf-8"
    );
    const lcTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "12301 \"[Q]Fence 1, Hill Crosser (open end) A\" **** pms_z21 1"
      ].join("\n"),
      "utf-8"
    );
    const witcherTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "12301 \"Witcher: Flask 3\" **** plc_wt302 1"
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("hak-placeables-2da-override", {
        snapshotObjects: [
          {
            key: vanillaTwoDaKey,
            size: vanillaTwoDaBytes.length,
            lastModified: "2026-06-01T00:00:00.000Z",
            etag: "vanilla-placeables"
          },
          {
            key: lcTwoDaKey,
            size: lcTwoDaBytes.length,
            lastModified: "2026-06-25T13:24:44.000Z",
            etag: "lc-2da-placeables"
          },
          {
            key: witcherTwoDaKey,
            size: witcherTwoDaBytes.length,
            lastModified: "2026-06-16T15:28:46.000Z",
            etag: "witcher-placeables"
          }
        ],
        payloadOverrides: new Map([
          [
            vanillaTwoDaKey,
            {
              key: vanillaTwoDaKey,
              size: vanillaTwoDaBytes.length,
              contentType: "text/plain",
              etag: "vanilla-placeables",
              lastModified: "2026-06-01T00:00:00.000Z",
              bytes: vanillaTwoDaBytes
            }
          ],
          [
            lcTwoDaKey,
            {
              key: lcTwoDaKey,
              size: lcTwoDaBytes.length,
              contentType: "text/plain",
              etag: "lc-2da-placeables",
              lastModified: "2026-06-25T13:24:44.000Z",
              bytes: lcTwoDaBytes
            }
          ],
          [
            witcherTwoDaKey,
            {
              key: witcherTwoDaKey,
              size: witcherTwoDaBytes.length,
              contentType: "text/plain",
              etag: "witcher-placeables",
              lastModified: "2026-06-16T15:28:46.000Z",
              bytes: witcherTwoDaBytes
            }
          ]
        ])
      })
    );

    await repository.listByKind("placeable", { limit: 20, offset: 0 });

    await expect(repository.resolvePlaceableAppearanceModel(12301)).resolves.toEqual({
      modelResRef: "pms_z21",
      source2da: "placeables.2da",
      rowId: 12301
    });
  });

  it("uses Area GIT identity to resolve renderable custom rows shifted by 100", async () => {
    const lcTwoDaKey = "modules/current/__aurora/sources/hak/lc_2da/placeables.2da";
    const lcTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "4642 Tapestry **** plc_tapestry 1",
        "4742 \"Basket, Bread\" **** nw2breadbasket 1",
        "8489 \"TableObj: Bread Oval\" **** zlc_mgs_sbl1 1",
        "8589 \"Crystal: Wall Large 6\" **** bhp_crys6f 1",
        "8710 \"Craft: Scaffold Segment V2\" **** zlc_fky_b15 1",
        "8810 \"Rock: Desert 04\" **** zlc_fky_c24 1",
        "12185 \"[Q]Pallet, Empty\" **** pms_z03 1",
        "12201 \"[Q]Bowl 2, Wood (w/ food)\" **** pms_z12 1",
        "12285 \"[Q]Fence 1, Long (open end)\" **** pms_z16 1",
        "12301 \"[Q]Fence 1, Hill Crosser (open end) A\" **** pms_z21 1",
        "26374 \"VALE - Barrel 01\" **** plc_core_0374 1",
        "26389 \"VALE - Campsite, Metal Jar 01\" **** plc_core_0389 1",
        "26392 \"VALE - Campsite, Box 01\" **** plc_core_0392 1",
        "26474 \"VALE - Plant, Grey Willow 04\" **** plc_core_0474 1",
        "26489 \"VALE - Plant, Knapweed 01\" **** plc_core_0489 1",
        "26492 \"VALE - Plant, Chamomile 02\" **** plc_core_0492 1",
        "6904 \"Witcher: Shield 1\" **** plc_wt904 1",
        "7004 wit2_0004 **** wit2_0004 1"
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("area-git-instance-row-offset", {
        snapshotObjects: [
          {
            key: lcTwoDaKey,
            size: lcTwoDaBytes.length,
            lastModified: "2026-06-26T00:00:00.000Z",
            etag: "area-git-instance-row-offset-2da"
          }
        ],
        payloadOverrides: new Map([
          [
            lcTwoDaKey,
            {
              key: lcTwoDaKey,
              size: lcTwoDaBytes.length,
              contentType: "text/plain",
              etag: "area-git-instance-row-offset-2da",
              lastModified: "2026-06-26T00:00:00.000Z",
              bytes: lcTwoDaBytes
            }
          ]
        ])
      })
    );

    await repository.listByKind("placeable", { limit: 20, offset: 0 });

    await expect(repository.resolvePlaceableAppearanceModel(8589)).resolves.toEqual({
      modelResRef: "bhp_crys6f",
      source2da: "placeables.2da",
      rowId: 8589
    });
    await expect(
      repository.resolvePlaceableAppearanceModel(8589, {
        tag: "TableObjBreadOval",
        resref: "nwn2_chleb"
      })
    ).resolves.toEqual({
      modelResRef: "zlc_mgs_sbl1",
      requestedRowId: 8589,
      resolutionPath: "placeables-instance-row-minus-100",
      rowId: 8489,
      source2da: "placeables.2da",
      sourceKey: lcTwoDaKey
    });
    await expect(
      repository.resolvePlaceableAppearanceModel(8810, {
        tag: "scaffold_segment",
        resref: "other_001"
      })
    ).resolves.toEqual({
      modelResRef: "zlc_fky_b15",
      requestedRowId: 8810,
      resolutionPath: "placeables-instance-row-minus-100",
      rowId: 8710,
      source2da: "placeables.2da",
      sourceKey: lcTwoDaKey
    });
    await expect(
      repository.resolvePlaceableAppearanceModel(12301, {
        tag: "q_bowl_3",
        resref: "q_060"
      })
    ).resolves.toEqual({
      modelResRef: "pms_z12",
      requestedRowId: 12301,
      resolutionPath: "placeables-instance-row-minus-100",
      rowId: 12201,
      source2da: "placeables.2da",
      sourceKey: lcTwoDaKey
    });
    await expect(
      repository.resolvePlaceableAppearanceModel(12285, {
        tag: "QFoodBins",
        resref: "witcher290",
        localizedName: "[W] Balustrada",
        description: "[Q]Pallet, Empty"
      })
    ).resolves.toEqual({
      modelResRef: "pms_z03",
      requestedRowId: 12285,
      resolutionPath: "placeables-instance-row-minus-100",
      rowId: 12185,
      source2da: "placeables.2da",
      sourceKey: lcTwoDaKey
    });
    await expect(
      repository.resolvePlaceableAppearanceModel(7004, {
        tag: "witcher2_Dywan",
        resref: "witcher217"
      })
    ).resolves.toEqual({
      modelResRef: "wit2_0004",
      source2da: "placeables.2da",
      rowId: 7004
    });
    await expect(
      repository.resolvePlaceableAppearanceModel(26474, {
        tag: "mtt_v2_059",
        resref: "mtt_v2_060",
        localizedName: "[MTT] Beczka 1",
        description: "A simple object of the sort you would find in a bathroom."
      })
    ).resolves.toEqual({
      modelResRef: "plc_core_0374",
      requestedRowId: 26474,
      resolutionPath: "placeables-instance-row-minus-100",
      rowId: 26374,
      source2da: "placeables.2da",
      sourceKey: lcTwoDaKey
    });
    await expect(
      repository.resolvePlaceableAppearanceModel(26489, {
        tag: "mtt_v2_233",
        resref: "mtt_v2_234",
        localizedName: "[MTT] Miska polowa 2"
      })
    ).resolves.toEqual({
      modelResRef: "plc_core_0389",
      requestedRowId: 26489,
      resolutionPath: "placeables-instance-row-minus-100",
      rowId: 26389,
      source2da: "placeables.2da",
      sourceKey: lcTwoDaKey
    });
    await expect(
      repository.resolvePlaceableAppearanceModel(26492, {
        tag: "mtt_v2_229",
        resref: "mtt_v2_230",
        localizedName: "[MTT] Skrzynka 1"
      })
    ).resolves.toEqual({
      modelResRef: "plc_core_0392",
      requestedRowId: 26492,
      resolutionPath: "placeables-instance-row-minus-100",
      rowId: 26392,
      source2da: "placeables.2da",
      sourceKey: lcTwoDaKey
    });
  });

  it("prefers physical placeables.2da row index over USER alias rows for malformed shifted tables", async () => {
    const lcTwoDaKey = "modules/current/__aurora/sources/hak/lc_2da/placeables.2da";
    const fillerRows = Array.from(
      { length: 110 },
      (_, index) => `${index} "Filler ${index}" **** filler_${index} 1`
    );
    const lcTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        ...fillerRows,
        "10 \"Food Good Physical Row\" **** d_good 1",
        "10 \"Food Wrong Duplicate Label\" **** d_wrong 1",
        "110 **** **** USER 1"
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("placeables-physical-row-index-direct", {
        snapshotObjects: [
          {
            key: lcTwoDaKey,
            size: lcTwoDaBytes.length,
            lastModified: "2026-07-08T00:00:00.000Z",
            etag: "placeables-physical-row-index-direct"
          }
        ],
        payloadOverrides: new Map([
          [
            lcTwoDaKey,
            {
              key: lcTwoDaKey,
              size: lcTwoDaBytes.length,
              contentType: "text/plain",
              etag: "placeables-physical-row-index-direct",
              lastModified: "2026-07-08T00:00:00.000Z",
              bytes: lcTwoDaBytes
            }
          ]
        ])
      })
    );

    await repository.listByKind("placeable", { limit: 20, offset: 0 });

    await expect(repository.resolvePlaceableAppearanceModel(110)).resolves.toEqual({
      modelResRef: "d_good",
      source2da: "placeables.2da",
      rowId: 110
    });
    await expect(
      repository.resolvePlaceableAppearanceModel(110, {
        tag: "food_wrong_duplicate_label",
        resref: "food_wrong_duplicate_label",
        localizedName: "Food Wrong Duplicate Label"
      })
    ).resolves.toEqual({
      modelResRef: "d_good",
      source2da: "placeables.2da",
      rowId: 110
    });
  });

  it("keeps direct renderable placeables.2da rows when Area GIT identity matches direct row better", async () => {
    const lcTwoDaKey = "modules/current/__aurora/sources/hak/lc_2da/placeables.2da";
    const lcTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "4642 Tapestry **** plc_tapestry 1",
        "4742 \"Basket, Bread\" **** nw2breadbasket 1"
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("area-git-direct-row", {
        snapshotObjects: [
          {
            key: lcTwoDaKey,
            size: lcTwoDaBytes.length,
            lastModified: "2026-06-26T00:00:00.000Z",
            etag: "area-git-direct-row-2da"
          }
        ],
        payloadOverrides: new Map([
          [
            lcTwoDaKey,
            {
              key: lcTwoDaKey,
              size: lcTwoDaBytes.length,
              contentType: "text/plain",
              etag: "area-git-direct-row-2da",
              lastModified: "2026-06-26T00:00:00.000Z",
              bytes: lcTwoDaBytes
            }
          ]
        ])
      })
    );

    await repository.listByKind("placeable", { limit: 20, offset: 0 });

    await expect(
      repository.resolvePlaceableAppearanceModel(4742, {
        tag: "nwn_bread",
        resref: "nwn_bread"
      })
    ).resolves.toEqual({
      modelResRef: "nw2breadbasket",
      source2da: "placeables.2da",
      rowId: 4742
    });
  });

  it("does not offset direct renderable rows on numeric-only Area GIT label matches", async () => {
    const lcTwoDaKey = "modules/current/__aurora/sources/hak/lc_2da/placeables.2da";
    const lcTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "5746 \"Floor: Tile 3 1x1*\" **** zlc_flr_tile3_x1 1",
        "5846 \"Source Light: Orange - Light (no ambient)*\" **** zlc_srclight_28 1"
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("area-git-direct-row-numeric-only", {
        snapshotObjects: [
          {
            key: lcTwoDaKey,
            size: lcTwoDaBytes.length,
            lastModified: "2026-07-02T00:00:00.000Z",
            etag: "area-git-direct-row-numeric-only-2da"
          }
        ],
        payloadOverrides: new Map([
          [
            lcTwoDaKey,
            {
              key: lcTwoDaKey,
              size: lcTwoDaBytes.length,
              contentType: "text/plain",
              etag: "area-git-direct-row-numeric-only-2da",
              lastModified: "2026-07-02T00:00:00.000Z",
              bytes: lcTwoDaBytes
            }
          ]
        ])
      })
    );

    await repository.listByKind("placeable", { limit: 20, offset: 0 });

    await expect(
      repository.resolvePlaceableAppearanceModel(5846, {
        localizedName: "[W] Kuchnia 3",
        resref: "ke_plomien017",
        templateId: "plc_ke_plomien017"
      })
    ).resolves.toEqual({
      modelResRef: "zlc_srclight_28",
      source2da: "placeables.2da",
      rowId: 5846
    });
  });

  it("does not merge later HAK placeables.2da alias rows into the selected table", async () => {
    const lcTwoDaKey = "modules/current/__aurora/sources/hak/lc_2da/placeables.2da";
    const witcherTwoDaKey = "modules/current/__aurora/sources/hak/witcher/placeables.2da";
    const lcTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "100 Early **** pms_z21 1",
        "200 **** **** USER 1"
      ].join("\n"),
      "utf-8"
    );
    const witcherTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "100 Later **** plc_wt999 1",
        "200 **** **** USER 1"
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("hak-placeables-2da-alias-override", {
        snapshotObjects: [
          {
            key: lcTwoDaKey,
            size: lcTwoDaBytes.length,
            lastModified: "2026-06-25T13:24:44.000Z",
            etag: "lc-2da-placeables"
          },
          {
            key: witcherTwoDaKey,
            size: witcherTwoDaBytes.length,
            lastModified: "2026-06-16T15:28:46.000Z",
            etag: "witcher-placeables"
          }
        ],
        payloadOverrides: new Map([
          [
            lcTwoDaKey,
            {
              key: lcTwoDaKey,
              size: lcTwoDaBytes.length,
              contentType: "text/plain",
              etag: "lc-2da-placeables",
              lastModified: "2026-06-25T13:24:44.000Z",
              bytes: lcTwoDaBytes
            }
          ],
          [
            witcherTwoDaKey,
            {
              key: witcherTwoDaKey,
              size: witcherTwoDaBytes.length,
              contentType: "text/plain",
              etag: "witcher-placeables",
              lastModified: "2026-06-16T15:28:46.000Z",
              bytes: witcherTwoDaBytes
            }
          ]
        ])
      })
    );

    await repository.listByKind("placeable", { limit: 20, offset: 0 });

    await expect(repository.resolvePlaceableAppearanceModel(200)).resolves.toEqual({
      modelResRef: "pms_z21",
      requestedRowId: 200,
      resolutionPath: "placeables-user-row-minus-100",
      rowId: 100,
      source2da: "placeables.2da",
      sourceKey: lcTwoDaKey
    });
  });

  it("keeps direct placeables.2da rows when later HAK rows only supply USER aliases", async () => {
    const vanillaTwoDaKey = "modules/current/__aurora/sources/vanilla/placeables.2da";
    const lcTwoDaKey = "modules/current/__aurora/sources/hak/lc_2da/placeables.2da";
    const witcherTwoDaKey = "modules/current/__aurora/sources/hak/witcher/placeables.2da";
    const vanillaTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "6098 **** **** USER 1"
      ].join("\n"),
      "utf-8"
    );
    const lcTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "6098 \"Witcher: Candle 2\" **** plc_wit98 1"
      ].join("\n"),
      "utf-8"
    );
    const witcherTwoDaBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "5998 \"Floor: Steam 4x4\" **** zlc_flr_steam_x4 1",
        "6098 **** **** USER 1"
      ].join("\n"),
      "utf-8"
    );
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const baseSettings = await runtimeSettingsRepository.get();
    runtimeSettingsRepository.get.mockResolvedValue({
      ...baseSettings,
      hakProfiles: {
        lc_models: ["lc_2da.hak"]
      },
      sources: {
        ...baseSettings.sources,
        placeable: {
          ...baseSettings.sources.placeable,
          includeHaks: true,
          includeVanilla: true,
          hakProfileId: "lc_models",
          hakPriorityList: ["lc_2da.hak"]
        }
      }
    });

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      runtimeSettingsRepository,
      createModuleBlobStorage("hak-placeables-2da-active-profile", {
        snapshotObjects: [
          {
            key: vanillaTwoDaKey,
            size: vanillaTwoDaBytes.length,
            lastModified: "2026-06-01T00:00:00.000Z",
            etag: "vanilla-placeables"
          },
          {
            key: lcTwoDaKey,
            size: lcTwoDaBytes.length,
            lastModified: "2026-06-25T13:24:44.000Z",
            etag: "lc-2da-placeables"
          },
          {
            key: witcherTwoDaKey,
            size: witcherTwoDaBytes.length,
            lastModified: "2026-06-16T15:28:46.000Z",
            etag: "witcher-placeables"
          }
        ],
        payloadOverrides: new Map([
          [
            vanillaTwoDaKey,
            {
              key: vanillaTwoDaKey,
              size: vanillaTwoDaBytes.length,
              contentType: "text/plain",
              etag: "vanilla-placeables",
              lastModified: "2026-06-01T00:00:00.000Z",
              bytes: vanillaTwoDaBytes
            }
          ],
          [
            lcTwoDaKey,
            {
              key: lcTwoDaKey,
              size: lcTwoDaBytes.length,
              contentType: "text/plain",
              etag: "lc-2da-placeables",
              lastModified: "2026-06-25T13:24:44.000Z",
              bytes: lcTwoDaBytes
            }
          ],
          [
            witcherTwoDaKey,
            {
              key: witcherTwoDaKey,
              size: witcherTwoDaBytes.length,
              contentType: "text/plain",
              etag: "witcher-placeables",
              lastModified: "2026-06-16T15:28:46.000Z",
              bytes: witcherTwoDaBytes
            }
          ]
        ])
      })
    );

    await repository.listByKind("placeable", { limit: 20, offset: 0 });

    await expect(repository.resolvePlaceableAppearanceModel(6098)).resolves.toEqual({
      modelResRef: "plc_wit98",
      source2da: "placeables.2da",
      rowId: 6098
    });
  });

  it("resolves NWIC USER appearance rows through the source-backed minus-100 model row", async () => {
    const placeables2daKey = "modules/current/__aurora/sources/hak/lc_2da/placeables.2da";
    const placeables2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "7360 \"NWIC: Garden, Desert, Plant 07\" **** nwp_gades_07 1",
        "7460 **** **** USER 1",
        "7560 **** **** USER 1"
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("nwic-user-row-offset", {
        snapshotObjects: [
          {
            key: placeables2daKey,
            size: placeables2daBytes.length,
            lastModified: "2026-06-23T00:00:00.000Z",
            etag: "nwic-user-row-offset-2da"
          }
        ],
        payloadOverrides: new Map([
          [
            placeables2daKey,
            {
              key: placeables2daKey,
              size: placeables2daBytes.length,
              contentType: "text/plain",
              etag: "nwic-user-row-offset-2da",
              lastModified: "2026-06-23T00:00:00.000Z",
              bytes: placeables2daBytes
            }
          ]
        ])
      })
    );

    await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });

    await expect(repository.resolvePlaceableAppearanceModel(7460)).resolves.toEqual({
      modelResRef: "nwp_gades_07",
      requestedRowId: 7460,
      resolutionPath: "nwic-user-row-minus-100",
      rowId: 7360,
      source2da: "placeables.2da",
      sourceKey: placeables2daKey
    });
    await expect(repository.resolvePlaceableAppearanceModel(7560)).resolves.toEqual({
      modelResRef: "nwp_gades_07",
      requestedRowId: 7560,
      resolutionPath: "placeables-user-row-minus-100-chain",
      rowId: 7360,
      source2da: "placeables.2da",
      sourceKey: placeables2daKey
    });
  });

  it("resolves custom USER, reserved, and trailing appearance rows through minus-100 model rows", async () => {
    const placeables2daKey = "modules/current/__aurora/sources/hak/lc_2da/placeables.2da";
    const placeables2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "200 Source **** plc_source 1",
        "300 Direct **** plc_direct 1",
        "1069 \"[Q]Grain Bin 2\" **** ptr_d08 1",
        "1169 **** **** USER 1",
        "15381 \"Door - Wooden 4\" **** ptm_wooddoor03 1",
        "15481 **** **** OS_RESERVED 1",
        "24263 \"D2: Rock, Crystal Ice 017\" **** d_div272 1",
        "24363 **** **** USER 1",
        "25676 \"Hogwarts Legacy: Food: Pear\" **** d_hp040 1",
        "25776 **** **** USER 1",
        "25876 **** **** USER 1",
        "25688 \"Hogwarts Legacy: Food: Desert 02\" **** d_hp052 1",
        "25788 **** **** USER 1",
        "27113 \"VALE-2 - Mountain Caves, Rock Group 14\" **** plc_core_1112 1"
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("custom-user-row-offset", {
        snapshotObjects: [
          {
            key: placeables2daKey,
            size: placeables2daBytes.length,
            lastModified: "2026-06-24T00:00:00.000Z",
            etag: "custom-user-row-offset-2da"
          }
        ],
        payloadOverrides: new Map([
          [
            placeables2daKey,
            {
              key: placeables2daKey,
              size: placeables2daBytes.length,
              contentType: "text/plain",
              etag: "custom-user-row-offset-2da",
              lastModified: "2026-06-24T00:00:00.000Z",
              bytes: placeables2daBytes
            }
          ]
        ])
      })
    );

    await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });

    await expect(repository.resolvePlaceableAppearanceModel(300)).resolves.toEqual({
      modelResRef: "plc_direct",
      rowId: 300,
      source2da: "placeables.2da"
    });
    await expect(repository.resolvePlaceableAppearanceModel(1169)).resolves.toEqual({
      modelResRef: "ptr_d08",
      requestedRowId: 1169,
      resolutionPath: "placeables-user-row-minus-100",
      rowId: 1069,
      source2da: "placeables.2da",
      sourceKey: placeables2daKey
    });
    await expect(repository.resolvePlaceableAppearanceModel(15481)).resolves.toEqual({
      modelResRef: "ptm_wooddoor03",
      requestedRowId: 15481,
      resolutionPath: "placeables-user-row-minus-100",
      rowId: 15381,
      source2da: "placeables.2da",
      sourceKey: placeables2daKey
    });
    await expect(repository.resolvePlaceableAppearanceModel(24363)).resolves.toEqual({
      modelResRef: "d_div272",
      requestedRowId: 24363,
      resolutionPath: "placeables-user-row-minus-100",
      rowId: 24263,
      source2da: "placeables.2da",
      sourceKey: placeables2daKey
    });
    await expect(repository.resolvePlaceableAppearanceModel(25788)).resolves.toEqual({
      modelResRef: "d_hp052",
      requestedRowId: 25788,
      resolutionPath: "placeables-user-row-minus-100",
      rowId: 25688,
      source2da: "placeables.2da",
      sourceKey: placeables2daKey
    });
    await expect(repository.resolvePlaceableAppearanceModel(25876)).resolves.toEqual({
      modelResRef: "d_hp040",
      requestedRowId: 25876,
      resolutionPath: "placeables-user-row-minus-100-chain",
      rowId: 25676,
      source2da: "placeables.2da",
      sourceKey: placeables2daKey
    });
    await expect(repository.resolvePlaceableAppearanceModel(27213)).resolves.toEqual({
      modelResRef: "plc_core_1112",
      requestedRowId: 27213,
      resolutionPath: "placeables-user-row-minus-100",
      rowId: 27113,
      source2da: "placeables.2da",
      sourceKey: placeables2daKey
    });
  });

  it("builds synthetic vanilla placeables from placeables.2da rows when no UTP exists", async () => {
    const placeables2daKey = "modules/current/__aurora/sources/vanilla/placeables.2da";
    const placeables2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label ModelName",
        "0 **** ****",
        '1 "Wood Chair" plc_chair01',
        "2 Crate plc_crate01",
        "3 Duplicate plc_chair01",
        '4 "VFX: Magic Sparks, White" plc_u03'
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("vanilla-2da", {
        snapshotObjects: [
          {
            key: placeables2daKey,
            size: placeables2daBytes.length,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "vanilla-placeables-2da"
          }
        ],
        payloadOverrides: new Map([
          [
            placeables2daKey,
            {
              key: placeables2daKey,
              size: placeables2daBytes.length,
              contentType: "text/plain",
              etag: "vanilla-placeables-2da",
              lastModified: "2026-05-25T10:00:00.000Z",
              bytes: placeables2daBytes
            }
          ]
        ])
      })
    );

    const placeables = await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });

    expect(placeables.total).toBe(3);
    const byResref = new Map(placeables.items.map((item) => [item.resref, item]));
    const chair = byResref.get("plc_chair01");
    const crate = byResref.get("plc_crate01");
    expect(chair?.name).toBe("Wood Chair");
    expect(chair?.templateId).toBe("plc_plc_chair01");
    expect(chair?.metadata?.sourceExtension).toBe("2da");
    expect(chair?.metadata?.sourceKind).toBe("2da");
    expect(chair?.metadata?.source2daRow).toBe(1);
    expect(chair?.metadata?.appearanceId).toBe(1);
    expect(chair?.metadata?.lookupModelResRef).toBe("plc_chair01");
    expect(chair?.metadata?.lookupDependencyRefs).toBe("plc_chair01");
    expect(crate?.name).toBe("Crate");
    expect(crate?.metadata?.sourceObjectKey).toBe(`${placeables2daKey}#row=2`);
    expect(byResref.get("plc_u03")?.placeableSubtype).toBe("vfx");
    expect(byResref.get("plc_u03")?.category).toBe("effects");
  });

  it("builds synthetic placeables from fixed-width 2DA rows without deriving model from label words", async () => {
    const placeables2daKey = "modules/current/__aurora/sources/hak/lc_2da/placeables.2da";
    const placeables2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "      Label                                                                  StrRef   ModelName           LightColor LightOffsetX LightOffsetY LightOffsetZ SoundAppType ShadowSize Body  LowGore        Reflection    Static ",
        "26096      SVALE - kull                                               ****   plc_core_0096    ****       ****         ****         ****         ****         ****       ****    ****    ****        1      ****          205             ",
        "26133      LVALE - adder                                              ****   plc_core_0133    ****       ****         ****         ****         ****         ****       ****    ****    ****        1      ****          111             ",
        "26177      PVALE - archment                                           ****   plc_core_0177    ****       ****         ****         ****         ****         ****       ****    ****    ****        1      ****          101             ",
        "26685      *VALE - ***                                                ****   plc_core_0685    ****       ****         ****         ****         ****         ****       ****    ****    ****        1      ****          205             "
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("fixed-width-placeables-2da", {
        snapshotObjects: [
          {
            key: placeables2daKey,
            size: placeables2daBytes.length,
            lastModified: "2026-06-16T18:10:00.000Z",
            etag: "lc-2da-placeables"
          }
        ],
        payloadOverrides: new Map([
          [
            placeables2daKey,
            {
              key: placeables2daKey,
              size: placeables2daBytes.length,
              contentType: "text/plain",
              etag: "lc-2da-placeables",
              lastModified: "2026-06-16T18:10:00.000Z",
              bytes: placeables2daBytes
            }
          ]
        ])
      })
    );

    const placeables = await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });

    expect(placeables.total).toBe(4);
    const byResref = new Map(placeables.items.map((item) => [item.resref, item]));
    const skull = byResref.get("plc_core_0096");
    const adder = byResref.get("plc_core_0133");
    const archment = byResref.get("plc_core_0177");
    const starred = byResref.get("plc_core_0685");
    expect(skull).toMatchObject({
      templateId: "plc_plc_core_0096",
      resref: "plc_core_0096",
      name: "SVALE - kull",
      category: "placeable",
      placeableSubtype: "generic"
    });
    expect(adder).toMatchObject({
      templateId: "plc_plc_core_0133",
      resref: "plc_core_0133",
      name: "LVALE - adder",
      category: "placeable",
      placeableSubtype: "generic"
    });
    expect(archment).toMatchObject({
      templateId: "plc_plc_core_0177",
      resref: "plc_core_0177",
      name: "PVALE - archment",
      category: "placeable",
      placeableSubtype: "generic"
    });
    expect(starred).toMatchObject({
      templateId: "plc_plc_core_0685",
      resref: "plc_core_0685",
      name: "*VALE - ***",
      category: "placeable",
      placeableSubtype: "generic"
    });
    expect(skull?.metadata?.source2daRow).toBe(26096);
    expect(skull?.metadata?.source2daLabel).toBe("SVALE - kull");
    expect(skull?.metadata?.lookupModelResRef).toBe("plc_core_0096");
    expect(skull?.metadata?.lookupDependencyRefs).toBe("plc_core_0096");
    expect(adder?.metadata?.source2daRow).toBe(26133);
    expect(adder?.metadata?.source2daLabel).toBe("LVALE - adder");
    expect(adder?.metadata?.lookupModelResRef).toBe("plc_core_0133");
    expect(adder?.metadata?.lookupDependencyRefs).toBe("plc_core_0133");
    expect(archment?.metadata?.source2daRow).toBe(26177);
    expect(archment?.metadata?.source2daLabel).toBe("PVALE - archment");
    expect(archment?.metadata?.lookupModelResRef).toBe("plc_core_0177");
    expect(archment?.metadata?.lookupDependencyRefs).toBe("plc_core_0177");
    expect(starred?.metadata?.source2daRow).toBe(26685);
    expect(starred?.metadata?.source2daLabel).toBe("*VALE - ***");
    expect(starred?.metadata?.lookupModelResRef).toBe("plc_core_0685");
    expect(starred?.metadata?.lookupDependencyRefs).toBe("plc_core_0685");
  });

  it("preserves placeables.2da light and shadow fields as light-source metadata", async () => {
    const placeables2daKey = "modules/current/__aurora/sources/vanilla/placeables.2da";
    const lightColor2daKey = "modules/current/__aurora/sources/vanilla/lightcolor.2da";
    const placeables2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName LightColor LightOffsetX LightOffsetY LightOffsetZ SoundAppType ShadowSize Body LowGore Reflection Static",
        "100 PlainLamp 123 plc_plain_lamp 7 0.25 -0.50 1.75 **** 2 **** **** **** 1",
        "101 PlainCrate 124 plc_plain_crate **** **** **** **** **** 1 **** **** **** 1"
      ].join("\n"),
      "utf-8"
    );
    const lightColor2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  RED GREEN BLUE LABEL TOOLSETRED TOOLSETGREEN TOOLSETBLUE",
        "7 1.90 1.70 0.06 Yellow 0.96 0.87 0.03"
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("placeables-2da-light-fields", {
        snapshotObjects: [
          {
            key: lightColor2daKey,
            size: lightColor2daBytes.length,
            lastModified: "2026-06-28T13:44:00.000Z",
            etag: "vanilla-lightcolor"
          },
          {
            key: placeables2daKey,
            size: placeables2daBytes.length,
            lastModified: "2026-06-28T13:45:00.000Z",
            etag: "vanilla-placeables-light-fields"
          }
        ],
        payloadOverrides: new Map([
          [
            lightColor2daKey,
            {
              key: lightColor2daKey,
              size: lightColor2daBytes.length,
              contentType: "text/plain",
              etag: "vanilla-lightcolor",
              lastModified: "2026-06-28T13:44:00.000Z",
              bytes: lightColor2daBytes
            }
          ],
          [
            placeables2daKey,
            {
              key: placeables2daKey,
              size: placeables2daBytes.length,
              contentType: "text/plain",
              etag: "vanilla-placeables-light-fields",
              lastModified: "2026-06-28T13:45:00.000Z",
              bytes: placeables2daBytes
            }
          ]
        ])
      })
    );

    const placeables = await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });

    const byResref = new Map(placeables.items.map((item) => [item.resref, item]));
    const lamp = byResref.get("plc_plain_lamp");
    const crate = byResref.get("plc_plain_crate");

    expect(lamp).toMatchObject({
      templateId: "plc_plc_plain_lamp",
      resref: "plc_plain_lamp",
      name: "PlainLamp",
      placeableSubtype: "light_source"
    });
    expect(lamp?.metadata).toMatchObject({
      source2daRow: 100,
      source2daLightColorRaw: "7",
      source2daLightColorRow: 7,
      source2daLightColorLabel: "Yellow",
      source2daLightColorSourceKey: lightColor2daKey,
      source2daLightRed: 1.9,
      source2daLightGreen: 1.7,
      source2daLightBlue: 0.06,
      source2daToolsetRed: 0.96,
      source2daToolsetGreen: 0.87,
      source2daToolsetBlue: 0.03,
      source2daLightOffsetX: 0.25,
      source2daLightOffsetY: -0.5,
      source2daLightOffsetZ: 1.75,
      source2daShadowSize: 2,
      source2daStatic: true
    });
    expect(crate).toMatchObject({
      templateId: "plc_plc_plain_crate",
      resref: "plc_plain_crate",
      name: "PlainCrate",
      placeableSubtype: "container"
    });
    expect(crate?.metadata?.source2daLightColorRow).toBeUndefined();
  });

  it("falls back to vanilla runtime placeables.2da for light-source metadata when snapshot rows are unavailable", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const baseSettings = await runtimeSettingsRepository.get();
    runtimeSettingsRepository.get.mockResolvedValue({
      ...baseSettings,
      paths: {
        ...baseSettings.paths,
        vanillaDataPath: "C:\\NeverwinterNights\\NWN"
      },
      sources: {
        ...baseSettings.sources,
        placeable: {
          ...baseSettings.sources.placeable,
          includeVanilla: true
        }
      }
    });

    const placeables2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName LightColor LightOffsetX LightOffsetY LightOffsetZ SoundAppType ShadowSize Body LowGore Reflection Static",
        "6 Brazier 123 plc_brazier 6 0.15 -0.25 1.10 **** 3 **** **** **** 1"
      ].join("\n"),
      "utf-8"
    );
    const lightColor2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  RED GREEN BLUE LABEL TOOLSETRED TOOLSETGREEN TOOLSETBLUE",
        "6 1.53 1.26 0.35 PaleYellow 0.77 0.63 0.18"
      ].join("\n"),
      "utf-8"
    );
    const readResource = jest.fn(async (resref: string, resourceType: number) => {
      if (resourceType !== NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA) {
        return null;
      }
      if (resref === "lightcolor") {
        return lightColor2daBytes;
      }
      if (resref === "placeables") {
        return placeables2daBytes;
      }
      return null;
    });
    const openSpy = jest.spyOn(NwnKeyBifResourceReader, "open").mockResolvedValue({
      read: readResource
    } as unknown as NwnKeyBifResourceReader);
    const runtimeSettingsApplicationService = {
      syncPlaceableModelSources: jest.fn(async () => ({ uploadedFiles: 0 })),
      getRuntimeSettings: jest.fn(async () => runtimeSettingsRepository.get()),
      getResolvedHakSettings: jest.fn(async () => ({
        creature: { hakPaths: [], hakPriorityList: [] },
        placeable: { hakPaths: [], hakPriorityList: [] },
        tile: { hakPaths: [], hakPriorityList: [] },
        area: { hakPaths: [], hakPriorityList: [] },
        vfx: { hakPaths: [], hakPriorityList: [] },
        sound: { hakPaths: [], hakPriorityList: [] }
      }))
    } as unknown as RuntimeSettingsApplicationService;
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      runtimeSettingsRepository,
      createModuleBlobStorage("runtime-placeables-2da-fallback", { snapshotObjects: [] }),
      runtimeSettingsApplicationService
    );

    try {
      const placeables = await repository.listByKind("placeable", {
        limit: 20,
        offset: 0
      });

      const brazier = placeables.items.find((item) => item.resref === "plc_brazier");
      expect(brazier).toMatchObject({
        templateId: "plc_plc_brazier",
        resref: "plc_brazier",
        name: "Brazier",
        placeableSubtype: "light_source"
      });
      expect(brazier?.metadata).toMatchObject({
        source2da: "placeables.2da",
        source2daRow: 6,
        source2daLightColorRaw: "6",
        source2daLightColorRow: 6,
        source2daLightColorLabel: "PaleYellow",
        source2daLightColorSourceKey: "runtime-source/vanilla/nwn_base.key/lightcolor.2da",
        source2daLightRed: 1.53,
        source2daLightGreen: 1.26,
        source2daLightBlue: 0.35,
        source2daToolsetRed: 0.77,
        source2daToolsetGreen: 0.63,
        source2daToolsetBlue: 0.18,
        source2daLightOffsetX: 0.15,
        source2daLightOffsetY: -0.25,
        source2daLightOffsetZ: 1.1,
        source2daShadowSize: 3,
        source2daStatic: true,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/placeables.2da#row=6"
      });
      expect(openSpy).toHaveBeenCalledWith(
        "C:\\NeverwinterNights\\NWN\\nwn_base.key",
        "C:\\NeverwinterNights\\NWN"
      );
      expect(readResource).toHaveBeenCalledWith(
        "placeables",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA
      );
    } finally {
      openSpy.mockRestore();
    }
  });

  it("marks reserved placeables.2da rows as non-renderable placeholders without changing subtype", async () => {
    const placeables2daKey = "modules/current/__aurora/sources/hak/vale-c_and_m/placeables.2da";
    const placeables2daBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "  Label StrRef ModelName Static",
        "847 **** **** BD_RESERVED 1",
        "848 **** **** OS_RESERVED 1",
        "849 Crate 123 PLC_CRATE01 1"
      ].join("\n"),
      "utf-8"
    );

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("reserved-placeables-2da", {
        snapshotObjects: [
          {
            key: placeables2daKey,
            size: placeables2daBytes.length,
            lastModified: "2026-06-16T21:05:00.000Z",
            etag: "reserved-placeables-2da"
          }
        ],
        payloadOverrides: new Map([
          [
            placeables2daKey,
            {
              key: placeables2daKey,
              size: placeables2daBytes.length,
              contentType: "text/plain",
              etag: "reserved-placeables-2da",
              lastModified: "2026-06-16T21:05:00.000Z",
              bytes: placeables2daBytes
            }
          ]
        ])
      })
    );

    const placeables = await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });

    const byResref = new Map(placeables.items.map((item) => [item.resref, item]));
    const bdReserved = byResref.get("bd_reserved");
    const osReserved = byResref.get("os_reserved");
    const crate = byResref.get("plc_crate01");
    expect(bdReserved).toMatchObject({
      templateId: "plc_bd_reserved",
      resref: "bd_reserved",
      placeableSubtype: "generic"
    });
    expect(bdReserved?.metadata).toMatchObject({
      nonRenderablePlaceholder: true,
      placeholderKind: "reserved_placeables_2da_row",
      renderAuditEligibility: "non_renderable_placeholder",
      renderAuditExcludeReason: "reserved_placeables_2da_model",
      reservedModelResRef: "bd_reserved",
      lookupModelResRef: "bd_reserved"
    });
    expect(osReserved?.metadata?.reservedModelResRef).toBe("os_reserved");
    expect(crate?.metadata?.nonRenderablePlaceholder).toBeUndefined();
    expect(crate?.metadata?.renderAuditEligibility).toBeUndefined();
  });

  it("applies category, tag, subtype and benchmark filters for placeables", async () => {
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage()
    );

    const benchmarkDoor = await repository.listByKind("placeable", {
      category: "door",
      tag: "door",
      subtype: "door",
      benchmark: true,
      limit: 20,
      offset: 0
    });

    const nonBenchmarkVfx = await repository.listByKind("placeable", {
      category: "effects",
      tag: "vfx",
      subtype: "vfx",
      benchmark: false,
      limit: 20,
      offset: 0
    });

    expect(benchmarkDoor.total).toBe(1);
    expect(benchmarkDoor.items[0]?.placeableSubtype).toBe("door");
    expect(nonBenchmarkVfx.total).toBe(1);
    expect(nonBenchmarkVfx.items[0]?.placeableSubtype).toBe("vfx");
  });

  it("resolves by id and resref and returns precomputed cache keys", async () => {
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage()
    );

    const placeables = await repository.listByKind("placeable", { limit: 20, offset: 0 });
    const first = placeables.items[0];

    await expect(
      repository.findByKindAndId("placeable", first.templateId)
    ).resolves.toMatchObject({
      templateId: first.templateId
    });
    await expect(repository.findByKindAndResref("item", "itm_scroll_fire")).resolves.toMatchObject({
      kind: "item"
    });

    expect(repository.getPrecomputedPlaceableCacheKey(first.templateId, "generic")).toEqual(
      expect.stringMatching(/^[a-f0-9]{64}$/u)
    );
    expect(repository.getPrecomputedTemplateCacheKey("creature", "cre_cre_guard")).toEqual(
      expect.stringMatching(/^[a-f0-9]{64}$/u)
    );
  });

  it("changes precomputed cache keys when source etag changes", async () => {
    const repositoryA = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("a")
    );
    const repositoryB = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("b")
    );

    await repositoryA.listByKind("placeable", { limit: 20, offset: 0 });
    await repositoryB.listByKind("placeable", { limit: 20, offset: 0 });

    const keyA = repositoryA.getPrecomputedPlaceableCacheKey("plc_plc_anchor_generic", "vfx");
    const keyB = repositoryB.getPrecomputedPlaceableCacheKey("plc_plc_anchor_generic", "vfx");

    expect(keyA).toBeDefined();
    expect(keyB).toBeDefined();
    expect(keyA).not.toBe(keyB);
  });

  it("returns null lookups and null cache keys when snapshot has no templates", async () => {
    const runtimeSettings = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage("fallback", {
      snapshotObjects: [
        {
          key: "modules/current/readme",
          size: 20,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "x3"
        }
      ]
    });
    const repository = new ModuleSnapshotTemplateCatalogRepository(runtimeSettings, moduleBlobStorage);

    await expect(
      repository.findByKindAndId("placeable", "plc_missing_template")
    ).resolves.toBeNull();
    await expect(
      repository.findByKindAndResref("item", "missing_item_template")
    ).resolves.toBeNull();
    expect(repository.getPrecomputedPlaceableCacheKey("plc_missing_template", "generic")).toBeNull();
    expect(repository.getPrecomputedTemplateCacheKey("creature", "cre_missing_template")).toBeNull();
  });

  it("walks paged snapshots and keeps best duplicate candidate by size then timestamp", async () => {
    const snapshotObjects: ModuleBlobObjectSummary[] = [
      {
        key: "modules/current/chunk-a/plc_dupe_size.utp",
        size: 120,
        lastModified: "2026-05-25T09:00:00.000Z",
        etag: "dup-small"
      },
      {
        key: "modules/current/chunk-b/plc_dupe_size.utp",
        size: 140,
        lastModified: "2026-05-25T08:00:00.000Z",
        etag: "dup-large"
      },
      {
        key: "modules/current/chunk-a/plc_dupe_time.utp",
        size: 90,
        lastModified: "2026-05-25T09:00:00.000Z",
        etag: "dup-time-old"
      },
      {
        key: "modules/current/chunk-b/plc_dupe_time.utp",
        size: 90,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "dup-time-new"
      },
      {
        key: "modules/current/chunk-z/a.utp",
        size: 50,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "short-resref"
      },
      {
        key: "modules/current/chunk-z/readme",
        size: 12,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "no-extension"
      }
    ];

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(""),
      createModuleBlobStorage("dupes", {
        snapshotObjects,
        pageSize: 2
      })
    );

    const placeables = await repository.listByKind("placeable", { limit: 20, offset: 0 });

    const byResref = new Map(placeables.items.map((item) => [item.resref, item]));
    expect(byResref.get("plc_dupe_size")?.metadata?.sourceObjectKey).toBe(
      "modules/current/chunk-b/plc_dupe_size.utp"
    );
    expect(byResref.get("plc_dupe_time")?.metadata?.sourceObjectKey).toBe(
      "modules/current/chunk-b/plc_dupe_time.utp"
    );
    expect(placeables.items.some((item) => item.resref === "a")).toBe(false);
  });

  it("infers advanced placeable subtypes and creature/item categories", async () => {
    const snapshotObjects: ModuleBlobObjectSummary[] = [
      {
        key: "modules/current/blueprints/placeables/city/plc_urban_statue.utp",
        size: 500,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "urban"
      },
      {
        key: "modules/current/blueprints/placeables/fx/plc_vfx_fire.utp",
        size: 700,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "vfx"
      },
      {
        key: "modules/current/blueprints/placeables/dungeon/plc_dungeon_statue.utp",
        size: 300,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "dungeon"
      },
      {
        key: "modules/current/blueprints/placeables/forest/plc_forest_statue.utp",
        size: 280,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "forest"
      },
      {
        key: "modules/current/blueprints/placeables/misc/plc_plain_statue.utp",
        size: 260,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "plain"
      },
      {
        key: "modules/current/blueprints/placeables/misc/plc_magicdoor_prop.utp",
        size: 250,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "door-by-pattern"
      },
      {
        key: "modules/current/blueprints/placeables/misc/plc_container_crate.utp",
        size: 240,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "container"
      },
      {
        key: "modules/current/blueprints/placeables/misc/plc_invis_corpse_bdy.utp",
        size: 235,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "corpse"
      },
      {
        key: "modules/current/blueprints/placeables/misc/plc_lantern_post.utp",
        size: 230,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "light"
      },
      {
        key: "modules/current/blueprints/placeables/misc/plc_arf_floor190.utp",
        size: 225,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "tweedlight"
      },
      {
        key: "modules/current/blueprints/placeables/misc/plc_d_div178.utp",
        size: 224,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "lavander"
      },
      {
        key: "modules/current/blueprints/placeables/misc/plc_trigger_proxy.utp",
        size: 220,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "trigger"
      },
      {
        key: "modules/current/blueprints/creatures/undead/cre_ghoul.utc",
        size: 210,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "cre-undead"
      },
      {
        key: "modules/current/blueprints/creatures/beast/cre_wolf.utc",
        size: 205,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "cre-beast"
      },
      {
        key: "modules/current/blueprints/items/weapon/itm_sword.uti",
        size: 195,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "itm-weapon"
      },
      {
        key: "modules/current/blueprints/items/armor/itm_mail.uti",
        size: 185,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "itm-armor"
      }
    ];

    const payloadOverrides = new Map<string, ModuleBlobObjectPayload>();

    const vfxKey = "modules/current/blueprints/placeables/fx/plc_vfx_fire.utp";
    const vfxBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_vfx_fire" },
      { label: "ModelName", type: "resref", value: "fx_fire_anchor" }
    ]);
    payloadOverrides.set(vfxKey, {
      key: vfxKey,
      size: vfxBytes.length,
      contentType: "application/octet-stream",
      etag: "vfx-bytes",
      lastModified: "2026-05-25T10:00:00.000Z",
      bytes: vfxBytes
    });

    const containerKey = "modules/current/blueprints/placeables/misc/plc_container_crate.utp";
    const containerBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_container_crate" },
      { label: "HasInventory", type: "byte", value: 1 }
    ]);
    payloadOverrides.set(containerKey, {
      key: containerKey,
      size: containerBytes.length,
      contentType: "application/octet-stream",
      etag: "container-bytes",
      lastModified: "2026-05-25T10:00:00.000Z",
      bytes: containerBytes
    });

    const corpseKey = "modules/current/blueprints/placeables/misc/plc_invis_corpse_bdy.utp";
    const corpseBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_invis_corpse_bdy" },
      { label: "LocalizedName", type: "cexostring", value: "corpse" },
      { label: "HasInventory", type: "byte", value: 1 },
      { label: "BodyBag", type: "byte", value: 1 },
      { label: "OnOpen", type: "resref", value: "spawn_onopencrp" },
      { label: "OnClosed", type: "resref", value: "spawn_oncloscrp" },
      { label: "OnInvDisturbed", type: "resref", value: "spawn_dist_corps" }
    ]);
    payloadOverrides.set(corpseKey, {
      key: corpseKey,
      size: corpseBytes.length,
      contentType: "application/octet-stream",
      etag: "corpse-bytes",
      lastModified: "2026-05-25T10:00:00.000Z",
      bytes: corpseBytes
    });

    const lightKey = "modules/current/blueprints/placeables/misc/plc_lantern_post.utp";
    const lightBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_lantern_post" },
      { label: "LightState", type: "dword", value: 2 }
    ]);
    payloadOverrides.set(lightKey, {
      key: lightKey,
      size: lightBytes.length,
      contentType: "application/octet-stream",
      etag: "light-bytes",
      lastModified: "2026-05-25T10:00:00.000Z",
      bytes: lightBytes
    });

    const tweedLightKey = "modules/current/blueprints/placeables/misc/plc_arf_floor190.utp";
    const tweedLightBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_arf_floor190" },
      {
        label: "LocalizedName",
        type: "cexostring",
        value: "FloorCover: RugL_tweedlight (ARF)"
      }
    ]);
    payloadOverrides.set(tweedLightKey, {
      key: tweedLightKey,
      size: tweedLightBytes.length,
      contentType: "application/octet-stream",
      etag: "tweedlight-bytes",
      lastModified: "2026-05-25T10:00:00.000Z",
      bytes: tweedLightBytes
    });

    const lavanderKey = "modules/current/blueprints/placeables/misc/plc_d_div178.utp";
    const lavanderBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_d_div178" },
      { label: "LocalizedName", type: "cexostring", value: "D2: Vegetation, Lavander" }
    ]);
    payloadOverrides.set(lavanderKey, {
      key: lavanderKey,
      size: lavanderBytes.length,
      contentType: "application/octet-stream",
      etag: "lavander-bytes",
      lastModified: "2026-05-25T10:00:00.000Z",
      bytes: lavanderBytes
    });

    const triggerKey = "modules/current/blueprints/placeables/misc/plc_trigger_proxy.utp";
    const triggerBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_trigger_proxy" },
      { label: "OnTrapTriggered", type: "resref", value: "script_trigger_proxy" }
    ]);
    payloadOverrides.set(triggerKey, {
      key: triggerKey,
      size: triggerBytes.length,
      contentType: "application/octet-stream",
      etag: "trigger-bytes",
      lastModified: "2026-05-25T10:00:00.000Z",
      bytes: triggerBytes
    });

    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("rich", { snapshotObjects, payloadOverrides })
    );

    const placeables = await repository.listByKind("placeable", { limit: 60, offset: 0 });
    const creatures = await repository.listByKind("creature", { limit: 20, offset: 0 });
    const items = await repository.listByKind("item", { limit: 20, offset: 0 });

    const placeablesByResref = new Map(placeables.items.map((item) => [item.resref, item]));

    expect(placeablesByResref.get("plc_magicdoor_prop")?.placeableSubtype).toBe("door");
    expect(placeablesByResref.get("plc_vfx_fire")?.placeableSubtype).toBe("vfx");
    expect(placeablesByResref.get("plc_container_crate")?.placeableSubtype).toBe("container");
    expect(placeablesByResref.get("plc_invis_corpse_bdy")?.placeableSubtype).toBe("generic");
    expect(placeablesByResref.get("plc_lantern_post")?.placeableSubtype).toBe("light_source");
    expect(placeablesByResref.get("plc_arf_floor190")?.placeableSubtype).toBe("generic");
    expect(placeablesByResref.get("plc_d_div178")?.placeableSubtype).toBe("generic");
    expect(placeablesByResref.get("plc_trigger_proxy")?.placeableSubtype).toBe("trigger_proxy");

    expect(placeablesByResref.get("plc_urban_statue")?.category).toBe("urban");
    expect(placeablesByResref.get("plc_dungeon_statue")?.category).toBe("dungeon");
    expect(placeablesByResref.get("plc_forest_statue")?.category).toBe("forest");
    expect(placeablesByResref.get("plc_plain_statue")?.category).toBe("placeable");
    expect(placeablesByResref.get("plc_vfx_fire")?.category).toBe("effects");

    expect(placeablesByResref.get("plc_vfx_fire")?.benchmarkBucket).toBe(
      "placeable_vfx_candidate"
    );
    expect(placeablesByResref.get("plc_urban_statue")?.benchmarkBucket).toBe(
      "placeable_heavy_candidate"
    );

    const creatureCategories = new Set(creatures.items.map((item) => item.category));
    expect(creatureCategories.has("undead")).toBe(true);
    expect(creatureCategories.has("beast")).toBe(true);

    const itemCategories = new Set(items.items.map((item) => item.category));
    expect(itemCategories.has("weapon")).toBe(true);
    expect(itemCategories.has("armor")).toBe(true);
  });

  it("returns empty catalog when snapshot has no template files", async () => {
    const runtimeSettings = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    moduleBlobStorage.listModuleSnapshot.mockResolvedValueOnce({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-v2",
      totalFiles: 1,
      totalBytes: 20,
      truncated: false,
      continuationToken: undefined,
      objects: [
        {
          key: "modules/current/readme.txt",
          size: 20,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "x2"
        }
      ]
    });
    const repository = new ModuleSnapshotTemplateCatalogRepository(runtimeSettings, moduleBlobStorage);

    const placeables = await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });
    expect(placeables.total).toBe(0);
    expect(placeables.items).toEqual([]);
  });
});

type SupportedField =
  | { label: string; type: "byte"; value: number }
  | { label: string; type: "word"; value: number }
  | { label: string; type: "dword"; value: number }
  | { label: string; type: "cexostring"; value: string }
  | { label: string; type: "resref"; value: string }
  | {
      label: string;
      type: "cexolocstring";
      value: string | { text?: string; strRef?: number };
    }
  | {
      label: string;
      type: "list";
      value:
        | number
        | Array<SupportedField[] | { typeId: number; fields: SupportedField[] }>;
    };

const FIELD_TYPE = {
  BYTE: 0,
  WORD: 2,
  DWORD: 4,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  LIST: 15
} as const;

const HEADER_SIZE = 56;
const STRUCT_ENTRY_SIZE = 12;
const FIELD_ENTRY_SIZE = 12;
const LABEL_ENTRY_SIZE = 16;
const TLK_HEADER_SIZE = 20;
const TLK_ENTRY_SIZE = 40;

function buildTlkBuffer(entries: Record<number, string>): Buffer {
  const entryIndices = Object.keys(entries)
    .map((key) => Number(key))
    .filter((index) => Number.isInteger(index) && index >= 0)
    .sort((left, right) => left - right);
  const stringCount = entryIndices.length > 0 ? Math.max(...entryIndices) + 1 : 0;
  const stringDataOffset = TLK_HEADER_SIZE + stringCount * TLK_ENTRY_SIZE;
  const header = Buffer.alloc(TLK_HEADER_SIZE);
  header.write("TLK V3.0", 0, "ascii");
  header.writeUInt32LE(0, 8);
  header.writeUInt32LE(stringCount, 12);
  header.writeUInt32LE(stringDataOffset, 16);

  const table = Buffer.alloc(stringCount * TLK_ENTRY_SIZE);
  const stringChunks: Buffer[] = [];
  let textOffset = 0;

  for (const index of entryIndices) {
    const text = entries[index];
    if (text === undefined) {
      continue;
    }
    const textBytes = Buffer.from(text, "latin1");
    const entryOffset = index * TLK_ENTRY_SIZE;
    table.writeUInt32LE(1, entryOffset);
    table.writeUInt32LE(textOffset, entryOffset + 28);
    table.writeUInt32LE(textBytes.length, entryOffset + 32);
    stringChunks.push(textBytes);
    textOffset += textBytes.length;
  }

  return Buffer.concat([header, table, ...stringChunks]);
}

function buildGffBuffer(fields: SupportedField[], fileType = "UTP "): Buffer {
  const uniqueLabels = [...new Set(collectFieldLabels(fields))];
  const labelIndexByName = new Map(uniqueLabels.map((label, index) => [label, index]));

  const fieldDataChunks: Buffer[] = [];
  const listIndicesChunks: Buffer[] = [];
  const fieldIndicesChunks: Buffer[] = [];
  const structEntries: Array<{ typeId: number; dataOrOffset: number; fieldCount: number }> = [];
  const fieldEntries: Array<{ typeId: number; labelIndex: number; dataOrOffset: number }> = [];

  const pushFieldData = (chunk: Buffer): number => {
    const offset = fieldDataChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldDataChunks.push(chunk);
    return offset;
  };

  const pushListIndicesData = (chunk: Buffer): number => {
    const offset = listIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    listIndicesChunks.push(chunk);
    return offset;
  };

  const pushFieldIndicesData = (indices: number[]): number => {
    const payload = Buffer.alloc(indices.length * 4);
    indices.forEach((fieldIndex, index) => {
      payload.writeUInt32LE(fieldIndex, index * 4);
    });
    const offset = fieldIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldIndicesChunks.push(payload);
    return offset;
  };

  const addStruct = (structFields: SupportedField[], typeId = 1): number => {
    const structIndex = structEntries.length;
    structEntries.push({
      typeId,
      dataOrOffset: 0,
      fieldCount: 0
    });
    const fieldIndices = structFields.map((field) => addField(field));
    structEntries[structIndex] = {
      typeId,
      dataOrOffset:
        fieldIndices.length <= 1 ? fieldIndices[0] ?? 0 : pushFieldIndicesData(fieldIndices),
      fieldCount: fieldIndices.length
    };
    return structIndex;
  };

  const addField = (field: SupportedField): number => {
    const labelIndex = labelIndexByName.get(field.label);
    if (labelIndex === undefined) {
      throw new Error(`Unknown label index for ${field.label}`);
    }

    if (field.type === "byte") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.BYTE,
        labelIndex,
        dataOrOffset: field.value & 0xff
      });
    }

    if (field.type === "word") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.WORD,
        labelIndex,
        dataOrOffset: field.value & 0xffff
      });
    }

    if (field.type === "dword") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.DWORD,
        labelIndex,
        dataOrOffset: field.value >>> 0
      });
    }

    if (field.type === "cexostring") {
      const valueBytes = Buffer.from(field.value, "utf-8");
      const payload = Buffer.alloc(4 + valueBytes.length);
      payload.writeUInt32LE(valueBytes.length, 0);
      valueBytes.copy(payload, 4);
      return pushFieldEntry({
        typeId: FIELD_TYPE.CEXOSTRING,
        labelIndex,
        dataOrOffset: pushFieldData(payload)
      });
    }

    if (field.type === "resref") {
      const valueBytes = Buffer.from(field.value, "ascii");
      const payload = Buffer.alloc(1 + valueBytes.length);
      payload.writeUInt8(valueBytes.length, 0);
      valueBytes.copy(payload, 1);
      return pushFieldEntry({
        typeId: FIELD_TYPE.RESREF,
        labelIndex,
        dataOrOffset: pushFieldData(payload)
      });
    }

    if (field.type === "list") {
      const childStructIndices = Array.isArray(field.value)
        ? field.value.map((entry) =>
            Array.isArray(entry)
              ? addStruct(entry, 0)
              : addStruct(entry.fields, entry.typeId)
          )
        : Array.from({ length: field.value }, () => 0xffffffff);
      const payload = Buffer.alloc(4 + childStructIndices.length * 4);
      payload.writeUInt32LE(childStructIndices.length, 0);
      childStructIndices.forEach((structIndex, index) => {
        payload.writeUInt32LE(structIndex >>> 0, 4 + index * 4);
      });
      return pushFieldEntry({
        typeId: FIELD_TYPE.LIST,
        labelIndex,
        dataOrOffset: pushListIndicesData(payload)
      });
    }

    const locStringValue =
      typeof field.value === "string"
        ? { text: field.value, strRef: 0xffffffff }
        : { text: field.value.text ?? "", strRef: field.value.strRef ?? 0xffffffff };
    const valueBytes = Buffer.from(locStringValue.text, "utf-8");
    const hasLocalText = locStringValue.text.length > 0;
    const entryPayload = hasLocalText ? Buffer.alloc(8 + valueBytes.length) : Buffer.alloc(0);
    if (hasLocalText) {
      entryPayload.writeUInt32LE(0, 0);
      entryPayload.writeUInt32LE(valueBytes.length, 4);
      valueBytes.copy(entryPayload, 8);
    }

    const locPayload = Buffer.alloc(12 + entryPayload.length);
    const totalSize = 8 + entryPayload.length;
    locPayload.writeUInt32LE(totalSize, 0);
    locPayload.writeUInt32LE(locStringValue.strRef >>> 0, 4);
    locPayload.writeUInt32LE(hasLocalText ? 1 : 0, 8);
    entryPayload.copy(locPayload, 12);

    return pushFieldEntry({
      typeId: FIELD_TYPE.CEXOLOCSTRING,
      labelIndex,
      dataOrOffset: pushFieldData(locPayload)
    });
  };

  const pushFieldEntry = (entry: {
    typeId: number;
    labelIndex: number;
    dataOrOffset: number;
  }): number => {
    const index = fieldEntries.length;
    fieldEntries.push(entry);
    return index;
  };

  addStruct(fields, 1);

  const fieldData = Buffer.concat(fieldDataChunks);
  const listIndices = Buffer.concat(listIndicesChunks);
  const fieldIndices = Buffer.concat(fieldIndicesChunks);

  const structTable = Buffer.alloc(structEntries.length * STRUCT_ENTRY_SIZE);
  structEntries.forEach((entry, index) => {
    const offset = index * STRUCT_ENTRY_SIZE;
    structTable.writeUInt32LE(entry.typeId, offset);
    structTable.writeUInt32LE(entry.dataOrOffset, offset + 4);
    structTable.writeUInt32LE(entry.fieldCount, offset + 8);
  });

  const fieldTable = Buffer.alloc(fieldEntries.length * FIELD_ENTRY_SIZE);
  fieldEntries.forEach((entry, index) => {
    const offset = index * FIELD_ENTRY_SIZE;
    fieldTable.writeUInt32LE(entry.typeId, offset);
    fieldTable.writeUInt32LE(entry.labelIndex, offset + 4);
    fieldTable.writeUInt32LE(entry.dataOrOffset, offset + 8);
  });

  const labels = Buffer.alloc(uniqueLabels.length * LABEL_ENTRY_SIZE);
  uniqueLabels.forEach((label, index) => {
    const offset = index * LABEL_ENTRY_SIZE;
    const bytes = Buffer.from(label.slice(0, LABEL_ENTRY_SIZE), "ascii");
    bytes.copy(labels, offset);
  });

  const structOffset = HEADER_SIZE;
  const fieldOffset = structOffset + structTable.length;
  const labelOffset = fieldOffset + fieldTable.length;
  const fieldDataOffset = labelOffset + labels.length;
  const fieldIndicesOffset = fieldDataOffset + fieldData.length;
  const listIndicesOffset = fieldIndicesOffset + fieldIndices.length;

  const header = Buffer.alloc(HEADER_SIZE);
  header.write(fileType, 0, "ascii");
  header.write("V3.2", 4, "ascii");
  header.writeUInt32LE(structOffset, 8);
  header.writeUInt32LE(structEntries.length, 12);
  header.writeUInt32LE(fieldOffset, 16);
  header.writeUInt32LE(fieldEntries.length, 20);
  header.writeUInt32LE(labelOffset, 24);
  header.writeUInt32LE(uniqueLabels.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.length, 36);
  header.writeUInt32LE(fieldIndicesOffset, 40);
  header.writeUInt32LE(fieldIndices.length, 44);
  header.writeUInt32LE(listIndicesOffset, 48);
  header.writeUInt32LE(listIndices.length, 52);

  return Buffer.concat([
    header,
    structTable,
    fieldTable,
    labels,
    fieldData,
    fieldIndices,
    listIndices
  ]);
}

function collectFieldLabels(fields: SupportedField[]): string[] {
  const labels: string[] = [];
  for (const field of fields) {
    labels.push(field.label);
    if (field.type === "list" && Array.isArray(field.value)) {
      for (const entry of field.value) {
        labels.push(...collectFieldLabels(Array.isArray(entry) ? entry : entry.fields));
      }
    }
  }
  return labels;
}
