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
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";

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
    modulePrefix = "modules/current"
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
          tlkBasePath: "",
          tlkCustomPath: ""
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
        key: "modules/current/blueprints/items/itm_scroll_fire.utI",
        size: 160,
        lastModified: "2026-05-25T10:00:00.000Z",
        etag: "i1"
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
      { label: "Appearance_Type", type: "dword", value: 17 },
      { label: "Appearance_Head", type: "dword", value: 22 },
      { label: "Color_Skin", type: "dword", value: 8 },
      { label: "FactionID", type: "dword", value: 3 },
      { label: "ChallengeRating", type: "dword", value: 6 },
      { label: "ScriptHeartbeat", type: "resref", value: "hb_guard" }
    ], "UTC ");

    const itemBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "itm_scroll_fire" },
      { label: "LocName", type: "cexolocstring", value: "Scroll of Fire" },
      { label: "Description", type: "cexolocstring", value: "Unknown scroll" },
      { label: "DescIdentified", type: "cexolocstring", value: "Identified fire scroll" },
      { label: "BaseItem", type: "dword", value: 75 },
      { label: "CostTable", type: "dword", value: 3 },
      { label: "CostValue", type: "dword", value: 11 },
      { label: "StackSize", type: "dword", value: 5 },
      { label: "Charges", type: "dword", value: 8 },
      { label: "Identified", type: "byte", value: 0 },
      { label: "Stolen", type: "byte", value: 1 }
    ], "UTI ");

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
        "modules/current/blueprints/items/itm_scroll_fire.utI",
        {
          key: "modules/current/blueprints/items/itm_scroll_fire.utI",
          size: itemBytes.length,
          contentType: "application/octet-stream",
          etag: `item-${etagSeed}`,
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: itemBytes
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

    expect(placeables.total).toBe(2);
    expect(creatures.total).toBe(1);
    expect(items.total).toBe(1);
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
    expect(creatures.items[0]?.metadata?.colorSkin).toBe(8);
    expect(creatures.items[0]?.metadata?.factionId).toBe(3);
    expect(creatures.items[0]?.metadata?.challengeRating).toBe(6);
    expect(creatures.items[0]?.metadata?.["script.scriptheartbeat"]).toBe("hb_guard");
    expect(items.items[0]?.metadata?.baseItem).toBe(75);
    expect(items.items[0]?.metadata?.localizedName).toBe("Scroll of Fire");
    expect(items.items[0]?.metadata?.identifiedDescription).toBe("Identified fire scroll");
    expect(items.items[0]?.metadata?.costTable).toBe(3);
    expect(items.items[0]?.metadata?.costValue).toBe(11);
    expect(items.items[0]?.metadata?.stackSize).toBe(5);
    expect(items.items[0]?.metadata?.identified).toBe(false);
    expect(items.items[0]?.metadata?.stolen).toBe(true);
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
    await expect(repository.resolvePlaceableAppearanceModel(7560)).resolves.toBeNull();
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
  | { label: string; type: "dword"; value: number }
  | { label: string; type: "cexostring"; value: string }
  | { label: string; type: "resref"; value: string }
  | { label: string; type: "cexolocstring"; value: string };

const FIELD_TYPE = {
  BYTE: 0,
  DWORD: 4,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12
} as const;

const HEADER_SIZE = 56;
const STRUCT_ENTRY_SIZE = 12;
const FIELD_ENTRY_SIZE = 12;
const LABEL_ENTRY_SIZE = 16;

function buildGffBuffer(fields: SupportedField[], fileType = "UTP "): Buffer {
  const uniqueLabels = [...new Set(fields.map((field) => field.label))];
  const labelIndexByName = new Map(uniqueLabels.map((label, index) => [label, index]));

  const fieldDataChunks: Buffer[] = [];
  const fieldEntries: Array<{ typeId: number; labelIndex: number; dataOrOffset: number }> = [];

  const pushFieldData = (chunk: Buffer): number => {
    const offset = fieldDataChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldDataChunks.push(chunk);
    return offset;
  };

  for (const field of fields) {
    const labelIndex = labelIndexByName.get(field.label);
    if (labelIndex === undefined) {
      throw new Error(`Unknown label index for ${field.label}`);
    }

    if (field.type === "byte") {
      fieldEntries.push({
        typeId: FIELD_TYPE.BYTE,
        labelIndex,
        dataOrOffset: field.value & 0xff
      });
      continue;
    }

    if (field.type === "dword") {
      fieldEntries.push({
        typeId: FIELD_TYPE.DWORD,
        labelIndex,
        dataOrOffset: field.value >>> 0
      });
      continue;
    }

    if (field.type === "cexostring") {
      const valueBytes = Buffer.from(field.value, "utf-8");
      const payload = Buffer.alloc(4 + valueBytes.length);
      payload.writeUInt32LE(valueBytes.length, 0);
      valueBytes.copy(payload, 4);
      fieldEntries.push({
        typeId: FIELD_TYPE.CEXOSTRING,
        labelIndex,
        dataOrOffset: pushFieldData(payload)
      });
      continue;
    }

    if (field.type === "resref") {
      const valueBytes = Buffer.from(field.value, "ascii");
      const payload = Buffer.alloc(1 + valueBytes.length);
      payload.writeUInt8(valueBytes.length, 0);
      valueBytes.copy(payload, 1);
      fieldEntries.push({
        typeId: FIELD_TYPE.RESREF,
        labelIndex,
        dataOrOffset: pushFieldData(payload)
      });
      continue;
    }

    const valueBytes = Buffer.from(field.value, "utf-8");
    const entryPayload = Buffer.alloc(8 + valueBytes.length);
    entryPayload.writeUInt32LE(0, 0);
    entryPayload.writeUInt32LE(valueBytes.length, 4);
    valueBytes.copy(entryPayload, 8);

    const locPayload = Buffer.alloc(12 + entryPayload.length);
    const totalSize = 8 + entryPayload.length;
    locPayload.writeUInt32LE(totalSize, 0);
    locPayload.writeUInt32LE(0, 4);
    locPayload.writeUInt32LE(1, 8);
    entryPayload.copy(locPayload, 12);

    fieldEntries.push({
      typeId: FIELD_TYPE.CEXOLOCSTRING,
      labelIndex,
      dataOrOffset: pushFieldData(locPayload)
    });
  }

  const fieldData = Buffer.concat(fieldDataChunks);

  const structTable = Buffer.alloc(STRUCT_ENTRY_SIZE);
  structTable.writeUInt32LE(1, 0);
  structTable.writeUInt32LE(fields.length <= 1 ? 0 : 0, 4);
  structTable.writeUInt32LE(fields.length, 8);

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

  const fieldIndices = Buffer.alloc(fields.length > 1 ? fields.length * 4 : 0);
  if (fields.length > 1) {
    for (let index = 0; index < fields.length; index += 1) {
      fieldIndices.writeUInt32LE(index, index * 4);
    }
  }

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
  header.writeUInt32LE(1, 12);
  header.writeUInt32LE(fieldOffset, 16);
  header.writeUInt32LE(fieldEntries.length, 20);
  header.writeUInt32LE(labelOffset, 24);
  header.writeUInt32LE(uniqueLabels.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.length, 36);
  header.writeUInt32LE(fieldIndicesOffset, 40);
  header.writeUInt32LE(fieldIndices.length, 44);
  header.writeUInt32LE(listIndicesOffset, 48);
  header.writeUInt32LE(0, 52);

  return Buffer.concat([header, structTable, fieldTable, labels, fieldData, fieldIndices]);
}
