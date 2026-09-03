import { ModuleSnapshotAreaRepository } from "../../src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";

type SupportedField =
  | { label: string; type: "byte"; value: number }
  | { label: string; type: "word"; value: number }
  | { label: string; type: "short"; value: number }
  | { label: string; type: "dword"; value: number }
  | { label: string; type: "int"; value: number }
  | { label: string; type: "float"; value: number }
  | { label: string; type: "cexostring"; value: string }
  | { label: string; type: "resref"; value: string }
  | { label: string; type: "cexolocstring"; value: string; strRef?: number }
  | { label: string; type: "struct"; value: number }
  | { label: string; type: "list"; value: number[] };

interface StructDef {
  typeId?: number;
  fields: SupportedField[];
}

const FIELD_TYPE = {
  BYTE: 0,
  WORD: 2,
  SHORT: 3,
  DWORD: 4,
  INT: 5,
  FLOAT: 8,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  STRUCT: 14,
  LIST: 15
} as const;

const HEADER_SIZE = 56;
const STRUCT_ENTRY_SIZE = 12;
const FIELD_ENTRY_SIZE = 12;
const LABEL_ENTRY_SIZE = 16;

describe("ModuleSnapshotAreaRepository", () => {
  function createRuntimeSettingsApplicationService() {
    return {
      syncModuleAreaSourceFiles: jest.fn().mockResolvedValue({ uploadedFiles: 0 }),
      syncVanillaTilesetSetSources: jest.fn().mockResolvedValue({ uploadedFiles: 0 }),
      syncVanillaTileModelSources: jest.fn().mockResolvedValue({ uploadedFiles: 0 })
    } as any;
  }

  function createRuntimeSettingsRepository(): jest.Mocked<RuntimeSettingsRepositoryPort> {
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
          modulePrefix: "modules/current",
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

  it("fails closed when optional effective placeables.2da resolution throws", async () => {
    const repository = new ModuleSnapshotAreaRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage(),
      createRuntimeSettingsApplicationService(),
      undefined,
      undefined,
      {
        listByKind: jest.fn(),
        findByKindAndId: jest.fn(),
        findByKindAndResref: jest.fn(),
        resolveEffectivePlaceablesTwoDaDescriptor: jest.fn().mockRejectedValue(new Error("catalog unavailable")),
      },
    );

    await expect(
      (repository as unknown as {
        resolveEffectivePlaceablesTwoDaDescriptor(): Promise<unknown>;
      }).resolveEffectivePlaceablesTwoDaDescriptor(),
    ).resolves.toBeNull();
  });

  function createModuleBlobStorage(): jest.Mocked<ModuleBlobStoragePort> {
    return {
      replaceModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-v1",
        totalFiles: 3,
        totalBytes: 2200,
        truncated: false,
        continuationToken: undefined,
        objects: [
          {
            key: "modules/current/areas/market_district.are",
            size: 1000,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "a1"
          },
          {
            key: "modules/current/areas/swamp_crossing.are",
            size: 800,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "a2"
          },
          {
            key: "modules/current/readme.txt",
            size: 20,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "x1"
          }
        ]
      })
    };
  }

  it("lists and resolves areas from module snapshot", async () => {
    const repository = new ModuleSnapshotAreaRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage(),
      createRuntimeSettingsApplicationService()
    );

    const list = await repository.list({
      limit: 20,
      offset: 0
    });
    expect(list.total).toBe(2);
    expect(list.items[0].objectCounts.total).toBe(0);
    expect(list.items.some((item) => item.biome === "urban")).toBe(true);

    const first = list.items[0];
    await expect(repository.findById(first.areaId)).resolves.toMatchObject({
      areaId: first.areaId
    });
    expect(repository.getPrecomputedAreaProcessing(first.areaId)).toEqual({
      cacheKey: expect.stringMatching(/^[a-f0-9]{64}$/u),
      composition: {
        placeables: 0,
        doors: 0,
        creatures: 0,
        encounters: 0,
        items: 0,
        sounds: 0,
        stores: 0,
        triggers: 0,
        waypoints: 0,
        total: 0
      }
    });
  });

  it("attaches the exact canonical module.ifo Start Location and digest to every Area", async () => {
    const moduleBlobStorage = createModuleBlobStorage();
    const object = (key: string, size: number, etag: string) => ({
      key,
      size,
      lastModified: "2026-08-22T10:00:00.000Z",
      etag,
    });
    const are = buildNestedGffBuffer([{
      fields: [
        { label: "Name", type: "cexolocstring", value: "Start Probe" },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
      ],
    }], "ARE ");
    const ifo = buildNestedGffBuffer([
      {
        fields: [
          { label: "Mod_Entry_Area", type: "resref", value: "start_probe" },
          { label: "Mod_Entry_X", type: "float", value: 1.25 },
          { label: "Mod_Entry_Y", type: "float", value: 2.5 },
          { label: "Mod_Entry_Z", type: "float", value: 3.75 },
          { label: "Mod_Entry_Dir_X", type: "float", value: 0 },
          { label: "Mod_Entry_Dir_Y", type: "float", value: 1 },
          { label: "Mod_Area_list", type: "list", value: [1, 2] },
        ],
      },
      {
        typeId: 6,
        fields: [{ label: "Area_Name", type: "resref", value: "start_probe" }],
      },
      {
        typeId: 6,
        fields: [{ label: "Area_Name", type: "resref", value: "other_probe" }],
      },
    ], "IFO ");
    moduleBlobStorage.listModuleSnapshot.mockResolvedValueOnce({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-start-location",
      totalFiles: 3,
      totalBytes: (are.length * 2) + ifo.length,
      truncated: false,
      continuationToken: undefined,
      objects: [
        object("modules/current/areas/start_probe.are", are.length, "are-start"),
        object("modules/current/areas/other_probe.are", are.length, "are-other"),
        object("modules/current/module.ifo", ifo.length, "ifo-start"),
      ],
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      const bytes = key.endsWith("module.ifo") ? ifo : are;
      return {
        key,
        size: bytes.length,
        contentType: "application/octet-stream",
        bytes,
        etag: key.endsWith("module.ifo") ? "ifo-start" : "are-start",
        lastModified: "2026-08-22T10:00:00.000Z",
      };
    });
    const repository = new ModuleSnapshotAreaRepository(
      createRuntimeSettingsRepository(),
      moduleBlobStorage,
      createRuntimeSettingsApplicationService(),
    );

    const list = await repository.list({ limit: 20, offset: 0 });
    const area = await repository.findById("area_start_probe");

    expect(area?.moduleStartLocation).toEqual({
      areaResRef: "start_probe",
      x: Math.fround(1.25),
      y: Math.fround(2.5),
      z: Math.fround(3.75),
      directionX: Math.fround(0),
      directionY: Math.fround(1),
    });
    expect(area?.moduleStartLocationTargets).toEqual(["other_probe", "start_probe"]);
    expect(area?.sourceResources).toEqual({
      areSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      ifoSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      expect.anything(),
      "modules/current/module.ifo",
    );
  });

  it("keeps heavyweight catalogs out of the list index and resolves them only for area detail", async () => {
    const resolveEffectivePlaceablesTwoDaDescriptor = jest.fn().mockResolvedValue(null);
    const resolveEffectiveTrapsTwoDaTable = jest.fn().mockResolvedValue(null);
    const resolveEffectiveBodyBagTwoDaTable = jest.fn().mockResolvedValue(null);
    const resolveEffectivePortraitsTwoDaTable = jest.fn().mockResolvedValue(null);
    const resolveEffectiveCreaturePortraitsTwoDaTable = jest.fn().mockResolvedValue(null);
    const resolveEffectiveAreaAudioCatalogs = jest.fn().mockResolvedValue(
      createEffectiveAreaAudioCatalogBundle(),
    );
    const resolveEffectiveAreaVisualEnvironmentCatalogs = jest.fn().mockResolvedValue(
      createEffectiveAreaVisualEnvironmentCatalogBundle(),
    );
    const resolveEffectiveAreaLoadingScreenCatalog = jest.fn().mockResolvedValue(
      createEffectiveAreaLoadingScreenCatalog(),
    );
    const resolveModuleFactionCatalog = jest.fn().mockResolvedValue(null);
    const repository = new ModuleSnapshotAreaRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage(),
      createRuntimeSettingsApplicationService(),
      undefined,
      undefined,
      {
        listByKind: jest.fn(),
        findByKindAndId: jest.fn(),
        findByKindAndResref: jest.fn(),
        resolveEffectivePlaceablesTwoDaDescriptor,
        resolveEffectiveTrapsTwoDaTable,
        resolveEffectiveBodyBagTwoDaTable,
        resolveEffectivePortraitsTwoDaTable,
        resolveEffectiveCreaturePortraitsTwoDaTable,
        resolveEffectiveAreaAudioCatalogs,
        resolveEffectiveAreaVisualEnvironmentCatalogs,
        resolveEffectiveAreaLoadingScreenCatalog,
        resolveModuleFactionCatalog,
      },
    );

    const list = await repository.list({ limit: 20, offset: 0 });

    expect(list.total).toBe(2);
    expect(resolveEffectivePlaceablesTwoDaDescriptor).not.toHaveBeenCalled();
    expect(resolveEffectiveTrapsTwoDaTable).not.toHaveBeenCalled();
    expect(resolveEffectiveBodyBagTwoDaTable).not.toHaveBeenCalled();
    expect(resolveEffectivePortraitsTwoDaTable).not.toHaveBeenCalled();
    expect(resolveEffectiveCreaturePortraitsTwoDaTable).not.toHaveBeenCalled();
    expect(resolveEffectiveAreaAudioCatalogs).not.toHaveBeenCalled();
    expect(resolveEffectiveAreaVisualEnvironmentCatalogs).not.toHaveBeenCalled();
    expect(resolveEffectiveAreaLoadingScreenCatalog).not.toHaveBeenCalled();
    expect(resolveModuleFactionCatalog).not.toHaveBeenCalled();

    const detail = await repository.findById(list.items[0]!.areaId);
    expect(detail).toMatchObject({
      areaId: list.items[0]!.areaId,
      audioEnvironmentCatalogs: createEffectiveAreaAudioCatalogBundle(),
      visualEnvironmentCatalogs: createEffectiveAreaVisualEnvironmentCatalogBundle(),
      loadingScreenCatalog: createEffectiveAreaLoadingScreenCatalog(),
    });
    expect(resolveEffectivePlaceablesTwoDaDescriptor).toHaveBeenCalledTimes(1);
    expect(resolveEffectiveTrapsTwoDaTable).toHaveBeenCalledTimes(1);
    expect(resolveEffectiveBodyBagTwoDaTable).toHaveBeenCalledTimes(1);
    expect(resolveEffectivePortraitsTwoDaTable).toHaveBeenCalledTimes(1);
    expect(resolveEffectiveCreaturePortraitsTwoDaTable).toHaveBeenCalledTimes(1);
    expect(resolveEffectiveAreaAudioCatalogs).toHaveBeenCalledTimes(1);
    expect(resolveEffectiveAreaVisualEnvironmentCatalogs).toHaveBeenCalledTimes(1);
    expect(resolveEffectiveAreaLoadingScreenCatalog).toHaveBeenCalledTimes(1);
    expect(resolveModuleFactionCatalog).toHaveBeenCalledTimes(1);
  });

  it("reads the exact paired GIC companion and merges editor comments by Placeable ordinal", async () => {
    const runtimeSettings = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const object = (key: string, size: number, etag: string) => ({
      key,
      size,
      lastModified: "2026-08-17T10:00:00.000Z",
      etag,
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValueOnce({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-gic-pair",
      totalFiles: 4,
      totalBytes: 4096,
      truncated: false,
      continuationToken: undefined,
      objects: [
        object("modules/current/areas/comment_probe.are", 1000, "are"),
        object("modules/current/areas/comment_probe.git", 900, "git"),
        object("modules/current/areas/comment_probe.gic", 100, "gic-exact"),
        object("modules/current/decoy/comment_probe.gic", 2000, "gic-decoy"),
      ],
    });
    const are = buildNestedGffBuffer([{
      fields: [
        { label: "Name", type: "cexolocstring", value: "Comment Probe" },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
      ],
    }], "ARE ");
    const git = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [1] },
        { label: "StoreList", type: "list", value: [2] },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_watertrough" },
        { label: "Tag", type: "cexostring", value: "WaterTrough" },
        { label: "LocName", type: "cexolocstring", value: "Water Trough" },
        { label: "Description", type: "cexolocstring", value: "Stone basin" },
        { label: "Appearance", type: "dword", value: 104 },
        { label: "TrapType", type: "byte", value: 3 },
        { label: "BodyBag", type: "byte", value: 2 },
        { label: "PortraitId", type: "word", value: 462 },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
      ] },
      { typeId: 11, fields: [
        { label: "TemplateResRef", type: "resref", value: "sto_blacksmith" },
        { label: "Tag", type: "cexostring", value: "MerchantStore" },
        { label: "MarkUp", type: "int", value: 100 },
        { label: "MarkDown", type: "int", value: 65 },
        { label: "BlackMarket", type: "byte", value: 0 },
        { label: "BM_MarkDown", type: "int", value: 25 },
        { label: "IdentifyPrice", type: "int", value: 100 },
        { label: "MaxBuyPrice", type: "int", value: -1 },
        { label: "StoreGold", type: "int", value: -1 },
        { label: "OnOpenStore", type: "resref", value: "store_open" },
        { label: "OnStoreClosed", type: "resref", value: "store_closed" },
        { label: "WillNotBuy", type: "list", value: [3, 4, 5] },
        { label: "WillOnlyBuy", type: "list", value: [6] },
        { label: "XPosition", type: "float", value: 15 },
        { label: "YPosition", type: "float", value: 25 },
      ] },
      { typeId: 0x0001_7e4d, fields: [{ label: "BaseItem", type: "int", value: 2 }] },
      { typeId: 0x0001_7e4d, fields: [{ label: "BaseItem", type: "int", value: 1 }] },
      { typeId: 0x0001_7e4d, fields: [{ label: "BaseItem", type: "int", value: 2 }] },
      { typeId: 0x0001_7e4d, fields: [{ label: "BaseItem", type: "int", value: 0 }] },
    ], "GIT ");
    const gic = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [1] },
        { label: "StoreList", type: "list", value: [2] },
      ] },
      { typeId: 9, fields: [{ label: "Comment", type: "cexostring", value: "Water Trough" }] },
      { typeId: 11, fields: [{ label: "Comment", type: "cexostring", value: "  Native store note  " }] },
    ], "GIC ");
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      const bytes = key.endsWith(".are") ? are : key.endsWith(".git") ? git : gic;
      return {
        key,
        size: bytes.length,
        contentType: "application/octet-stream",
        bytes,
        etag: key.endsWith(".gic") ? "gic-exact" : undefined,
        lastModified: "2026-08-17T10:00:00.000Z",
      };
    });
    const repository = new ModuleSnapshotAreaRepository(
      runtimeSettings,
      moduleBlobStorage,
      createRuntimeSettingsApplicationService(),
      undefined,
      undefined,
      {
        listByKind: jest.fn(),
        findByKindAndId: jest.fn(),
        findByKindAndResref: jest.fn(),
        resolveEffectivePlaceablesTwoDaDescriptor: jest.fn().mockResolvedValue({
          resourceName: "placeables.2da",
          sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
          sourceLayer: "hak",
          sha256: "a".repeat(64),
          sizeBytes: 8192,
          rowCount: 16500,
        }),
        resolveEffectiveTrapsTwoDaTable: jest.fn().mockResolvedValue({
          descriptor: {
            resourceName: "traps.2da",
            sourceObjectKey: "modules/current/traps.2da",
            sourceLayer: "module",
            sha256: "b".repeat(64),
            sizeBytes: 2048,
            rowCount: 4,
          },
          rows: [
            {
              rowIndex: 0,
              label: "MinorSpike",
              trapNameStrRef: 1000,
              setDc: 10,
              detectDcMod: 0,
              disarmDcMod: 3,
              displayName: "Minor Spike Trap",
              displaySource: "strref",
            },
            {
              rowIndex: 1,
              setDc: 11,
              detectDcMod: 1,
              disarmDcMod: 4,
              displayName: "Row 1",
              displaySource: "row_index",
            },
            {
              rowIndex: 2,
              label: "StrongSpike",
              setDc: 12,
              detectDcMod: 2,
              disarmDcMod: 5,
              displayName: "StrongSpike",
              displaySource: "label",
            },
            {
              rowIndex: 3,
              label: "DeadlySpike",
              setDc: 13,
              detectDcMod: 3,
              disarmDcMod: 6,
              displayName: "Deadly Spike Trap",
              displaySource: "strref",
            },
          ],
        }),
        resolveEffectiveBodyBagTwoDaTable: jest.fn().mockResolvedValue({
          descriptor: {
            resourceName: "bodybag.2da",
            sourceObjectKey: "modules/current/bodybag.2da",
            sourceLayer: "module",
            sha256: "c".repeat(64),
            sizeBytes: 502,
            rowCount: 7,
          },
          rows: Array.from({ length: 7 }, (_, rowIndex) => ({
            rowIndex,
            nameStrRef: 6671 + rowIndex,
            displayName: `Body bag ${rowIndex}`,
            displaySource: "row_index" as const,
          })),
        }),
        resolveEffectivePortraitsTwoDaTable: jest.fn().mockResolvedValue({
          descriptor: {
            resourceName: "portraits.2da",
            sourceObjectKey: "modules/current/portraits.2da",
            sourceLayer: "module",
            sha256: "d".repeat(64),
            sizeBytes: 4096,
            rowCount: 700,
          },
          rows: [
            { rowIndex: 462, baseResRef: "po_hu_m_01_" },
            { rowIndex: 463, baseResRef: "po_hu_m_02_" },
          ],
        }),
        resolveEffectiveItemBaseItemsTwoDaTable: jest.fn().mockResolvedValue({
          descriptor: {
            resourceName: "baseitems.2da",
            sourceObjectKey: "modules/current/baseitems.2da",
            sourceLayer: "module",
            sha256: "e".repeat(64),
            sizeBytes: 1024,
            rowCount: 4,
          },
          rows: [
            { rowIndex: 0, modelType: 0, displayName: "Short sword" },
            { rowIndex: 1, modelType: 1, displayName: "Potion" },
            { rowIndex: 2, modelType: 2, displayName: "Double axe" },
            { rowIndex: 3, modelType: 3, displayName: "Armor" },
          ],
        }),
      },
    );

    const area = await repository.findById("area_comment_probe");

    expect(area?.objects).toEqual([
      expect.objectContaining({
        kind: "placeable",
        resRef: "plc_watertrough",
        placeableBasicIdentity: {
          tag: { present: true, value: "WaterTrough" },
          appearance: {
            present: true,
            nativeType: "dword",
            value: 104,
            table: {
              resourceName: "placeables.2da",
              sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
              sourceLayer: "hak",
              sha256: "a".repeat(64),
              sizeBytes: 8192,
              rowCount: 16500,
              rowIndex: 104,
            },
          },
        },
        placeableTrapType: { present: true, nativeType: "byte", value: 3 },
        placeableBodyBag: { present: true, nativeType: "byte", value: 2 },
        placeablePortraitId: { present: true, nativeType: "word", value: 462 },
        placeableLocalizedStrings: {
          locName: {
            present: true,
            strRef: 0,
            entries: [{ languageId: 0, textBytesBase64: "V2F0ZXIgVHJvdWdo" }],
          },
          description: {
            present: true,
            strRef: 0,
            entries: [{ languageId: 0, textBytesBase64: "U3RvbmUgYmFzaW4=" }],
          },
        },
        placeableMetadata: expect.objectContaining({ editorComment: "Water Trough" }),
      }),
      expect.objectContaining({
        kind: "store",
        resRef: "sto_blacksmith",
        tag: "MerchantStore",
        storeMetadata: {
          editorComment: "  Native store note  ",
          scriptResRefs: {
            onOpenStore: "store_open",
            onStoreClosed: "store_closed",
          },
          commerce: {
            markUp: 100,
            markDown: 65,
            blackMarket: false,
            blackMarketMarkDown: 25,
            identifyPrice: 100,
            maxBuyPrice: -1,
            storeGold: -1,
          },
          variables: { expectedEntries: [] },
          restrictions: {
            expectedValue: {
              willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
              willOnlyBuy: { present: true, baseItemIds: [0] },
            },
            tableSha256: "e".repeat(64),
            tableRowCount: 4,
          },
        },
      }),
    ]);
    expect(area?.placeableTrapTypeCatalog).toEqual({
      descriptor: {
        resourceName: "traps.2da",
        sourceObjectKey: "modules/current/traps.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 2048,
        rowCount: 4,
      },
      rows: expect.arrayContaining([
        expect.objectContaining({
          rowIndex: 3,
          setDc: 13,
          detectDcMod: 3,
          disarmDcMod: 6,
          displayName: "Deadly Spike Trap",
        }),
      ]),
    });
    expect(area?.placeableBodyBagCatalog).toEqual({
      descriptor: {
        resourceName: "bodybag.2da",
        sourceObjectKey: "modules/current/bodybag.2da",
        sourceLayer: "module",
        sha256: "c".repeat(64),
        sizeBytes: 502,
        rowCount: 7,
      },
      rows: expect.arrayContaining([
        expect.objectContaining({ rowIndex: 2, displayName: "Body bag 2" }),
      ]),
    });
    expect(area?.placeablePortraitCatalog).toEqual({
      descriptor: {
        resourceName: "portraits.2da",
        sourceObjectKey: "modules/current/portraits.2da",
        sourceLayer: "module",
        sha256: "d".repeat(64),
        sizeBytes: 4096,
        rowCount: 700,
      },
      rows: [
        { rowIndex: 462, baseResRef: "po_hu_m_01_" },
        { rowIndex: 463, baseResRef: "po_hu_m_02_" },
      ],
    });
    expect(area?.sourceResources).toEqual({
      areSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      gitSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      gicSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(moduleBlobStorage.getModuleObject)
      .toHaveBeenCalledWith(expect.anything(), "modules/current/areas/comment_probe.gic");
    expect(moduleBlobStorage.getModuleObject)
      .not.toHaveBeenCalledWith(expect.anything(), "modules/current/decoy/comment_probe.gic");
  });

  it("parses ARE/GIT object placements from blob payloads", async () => {
    const runtimeSettings = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();

    moduleBlobStorage.listModuleSnapshot.mockResolvedValueOnce({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-v2",
      totalFiles: 8,
      totalBytes: 4096,
      truncated: false,
      continuationToken: undefined,
      objects: [
        {
          key: "modules/current/areas/market_district.are",
          size: 1024,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "a1"
        },
        {
          key: "modules/current/areas/market_district.git",
          size: 1024,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "g1"
        },
        {
          key: "modules/current/tiles/tno01.set",
          size: 180,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "set1"
        },
        {
          key: "modules/current/__aurora/sources/vanilla/lightcolor.2da",
          size: 96,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "lightcolor1"
        },
        {
          key: "modules/current/__aurora/sources/vanilla/tilecolor.2da",
          size: 96,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "tilecolor1"
        },
        {
          key: "modules/current/__aurora/sources/vanilla/fx_flame01.mdl",
          size: 320,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "fxflame1"
        },
        {
          key: "modules/current/__aurora/sources/vanilla/tno01_a01_01.mdl",
          size: 420,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "tilemdl1"
        },
        {
          key: "modules/current/sounds/ambient/amb_city_day_41.wav",
          size: 1024,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "s1"
        },
        {
          key: "modules/current/sounds/music/mus_city_day_11.bmu",
          size: 1024,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "s2"
        }
      ]
    });

    const areBytes = buildNestedGffBuffer(
      [
        {
          fields: [
            {
              label: "Name",
              type: "cexolocstring",
              value: "Market District",
              strRef: 0xffff_ffff,
            },
            { label: "Tag", type: "cexostring", value: "MARKET_DISTRICT" },
            { label: "Comments", type: "cexostring", value: " exact repository note " },
            { label: "OnEnter", type: "resref", value: "area_enter" },
            { label: "OnExit", type: "resref", value: "" },
            { label: "Flags", type: "dword", value: 5 },
            { label: "PlayerVsPlayer", type: "byte", value: 1 },
            { label: "NoRest", type: "byte", value: 1 },
            { label: "ModListenCheck", type: "int", value: -8 },
            { label: "ModSpotCheck", type: "int", value: 11 },
            { label: "Width", type: "dword", value: 24 },
            { label: "Height", type: "dword", value: 20 },
            { label: "Tileset", type: "resref", value: "tno01" },
            { label: "Tile_List", type: "list", value: [1, 2, 3] },
            { label: "AmbientSndDay", type: "dword", value: 41 },
            { label: "MusicDay", type: "dword", value: 11 }
          ]
        },
        {
          fields: [
            { label: "Tile_ID", type: "dword", value: 101 },
            { label: "Tile_MainLight1", type: "dword", value: 3 },
            { label: "Tile_SrcLight1", type: "dword", value: 5 },
            { label: "Tile_SrcLight2", type: "dword", value: 5 }
          ]
        },
        { fields: [{ label: "Tile_ID", type: "dword", value: 102 }] },
        { fields: [{ label: "Tile_ID", type: "dword", value: 103 }] }
      ],
      "ARE "
    );

    const gitBytes = buildNestedGffBuffer(
      [
        {
          fields: [
            { label: "Placeable List", type: "list", value: [1, 14] },
            { label: "Door List", type: "list", value: [2] },
            { label: "Creature List", type: "list", value: [3] },
            { label: "Encounter List", type: "list", value: [8] },
            { label: "Item List", type: "list", value: [4] },
            { label: "SoundList", type: "list", value: [6] },
            { label: "StoreList", type: "list", value: [9] },
            { label: "TriggerList", type: "list", value: [10] },
            { label: "WaypointList", type: "list", value: [13] },
            { label: "AreaProperties", type: "struct", value: 16 },
            { label: "VarTable", type: "list", value: [17, 18] }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_crate_01" },
            { label: "OnUsed", type: "resref", value: "" },
            { label: "XPosition", type: "float", value: 12.5 },
            { label: "YPosition", type: "float", value: 6.25 },
            { label: "Static", type: "dword", value: 0 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "utd_city_gate_01" },
            { label: "XPosition", type: "float", value: 20 },
            { label: "YPosition", type: "float", value: 10 },
            { label: "XOrientation", type: "float", value: 0 },
            { label: "YOrientation", type: "float", value: 1 }
          ]
        },
        {
          typeId: 4,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "cre_guard_01" },
            { label: "Tag", type: "cexostring", value: "guard_git_tag" },
            { label: "ChallengeRating", type: "float", value: 11.5 },
            { label: "NaturalAC", type: "byte", value: 2 },
            { label: "fortbonus", type: "short", value: 3 },
            { label: "refbonus", type: "short", value: 1 },
            { label: "willbonus", type: "short", value: 2 },
            { label: "GoodEvil", type: "byte", value: 50 },
            { label: "LawfulChaotic", type: "byte", value: 100 },
            { label: "Conversation", type: "resref", value: "Guard_Dialog" },
            { label: "Interruptable", type: "byte", value: 1 },
            { label: "Disarmable", type: "byte", value: 1 },
            { label: "Plot", type: "byte", value: 1 },
            { label: "IsImmortal", type: "byte", value: 0 },
            { label: "Lootable", type: "byte", value: 1 },
            { label: "NoPermDeath", type: "byte", value: 0 },
            { label: "FactionID", type: "word", value: 1 },
            { label: "Subrace", type: "cexostring", value: "Moon Elf" },
            { label: "Deity", type: "cexostring", value: "Mystra" },
            { label: "FirstName", type: "cexolocstring", value: "GIT Guard" },
            { label: "Appearance_Type", type: "dword", value: 42 },
            { label: "Gender", type: "byte", value: 4 },
            { label: "Wings_New", type: "dword", value: 1 },
            { label: "Wings", type: "byte", value: 2 },
            { label: "Tail_New", type: "dword", value: 3 },
            {
              label: "SpecAbilityList",
              type: "list",
              value: [26],
            },
            { label: "PerceptionRange", type: "byte", value: 11 },
            { label: "WalkRate", type: "int", value: 4 },
            { label: "Race", type: "byte", value: 6 },
            { label: "PortraitId", type: "word", value: 10 },
            { label: "Str", type: "byte", value: 15 },
            { label: "Dex", type: "byte", value: 13 },
            { label: "Con", type: "byte", value: 16 },
            { label: "Int", type: "byte", value: 10 },
            { label: "Wis", type: "byte", value: 12 },
            { label: "Cha", type: "byte", value: 8 },
            { label: "ScriptSpawn", type: "resref", value: "nw_c2_guardspawn" },
            { label: "XPosition", type: "float", value: 7.75 },
            { label: "YPosition", type: "float", value: 8.5 }
          ]
        },
        {
          typeId: 0,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "itm_potion_01" },
            {
              label: "LocalizedName",
              type: "cexolocstring",
              value: "Potion",
              strRef: 0xffff_ffff,
            },
            {
              label: "Description",
              type: "cexolocstring",
              value: "Unknown potion",
              strRef: 0xffff_ffff,
            },
            {
              label: "DescIdentified",
              type: "cexolocstring",
              value: "Known potion",
              strRef: 7,
            },
            { label: "BaseItem", type: "int", value: 24 },
            { label: "ModelPart1", type: "word", value: 66 },
            { label: "Charges", type: "byte", value: 7 },
            { label: "Cost", type: "dword", value: 4_294_967_295 },
            { label: "Stolen", type: "byte", value: 1 },
            { label: "StackSize", type: "word", value: 65_535 },
            { label: "Plot", type: "byte", value: 0 },
            { label: "AddCost", type: "dword", value: 99 },
            { label: "Identified", type: "byte", value: 1 },
            { label: "Cursed", type: "byte", value: 0 },
            {
              label: "PropertiesList",
              type: "list",
              value: [24],
            },
            {
              label: "ItemList",
              type: "list",
              value: [25],
            },
            { label: "Position", type: "struct", value: 5 }
          ]
        },
        {
          fields: [
            { label: "X", type: "float", value: 1.5 },
            { label: "Y", type: "float", value: 2.5 },
            { label: "Z", type: "float", value: 0 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "snd_forge_loop" },
            { label: "Tag", type: "cexostring", value: "forge_sound" },
            { label: "XPosition", type: "float", value: 9.5 },
            { label: "YPosition", type: "float", value: 10.5 },
            { label: "Active", type: "dword", value: 1 },
            { label: "Looping", type: "dword", value: 1 },
            { label: "Positional", type: "dword", value: 1 },
            { label: "MaxDistance", type: "float", value: 16 },
            { label: "MinDistance", type: "float", value: 2 },
            { label: "Sounds", type: "list", value: [7] }
          ]
        },
        {
          fields: [{ label: "Sound", type: "resref", value: "forge_loop_a" }]
        },
        {
          typeId: 7,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "enc_city_patrol" },
            { label: "Tag", type: "cexostring", value: "enc_patrol_tag" },
            { label: "XPosition", type: "float", value: 3 },
            { label: "YPosition", type: "float", value: 4 },
            { label: "Geometry", type: "list", value: [21, 22, 23] },
            { label: "SpawnPointList", type: "list", value: [] }
          ]
        },
        {
          fields: [
            { label: "ResRef", type: "resref", value: "sto_blacksmith" },
            { label: "Tag", type: "cexostring", value: "merchant_store" },
            { label: "XPosition", type: "float", value: 5 },
            { label: "YPosition", type: "float", value: 6 }
          ]
        },
        {
          typeId: 1,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "trg_transition" },
            { label: "Tag", type: "cexostring", value: "exit_trigger" },
            { label: "Geometry", type: "list", value: [11, 12, 19, 20] }
          ]
        },
        {
          typeId: 3,
          fields: [
            { label: "PointX", type: "float", value: 0 },
            { label: "PointY", type: "float", value: 0 },
            { label: "PointZ", type: "float", value: 0 }
          ]
        },
        {
          typeId: 3,
          fields: [
            { label: "PointX", type: "float", value: 4 },
            { label: "PointY", type: "float", value: 0 },
            { label: "PointZ", type: "float", value: 0 }
          ]
        },
        {
          typeId: 5,
          fields: [
            { label: "Tag", type: "cexostring", value: "wp_market_entry" },
            { label: "Appearance", type: "byte", value: 1 },
            { label: "XPosition", type: "float", value: 8 },
            { label: "YPosition", type: "float", value: 9 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_vt_floor_board" },
            { label: "Tag", type: "cexostring", value: "vt_floor_board" },
            { label: "XPosition", type: "float", value: 18.12 },
            { label: "YPosition", type: "float", value: 22.13 },
            { label: "ZPosition", type: "float", value: 1.95 },
            { label: "Bearing", type: "float", value: Math.PI / 2 },
            { label: "Static", type: "dword", value: 1 },
            { label: "VisTransformList", type: "list", value: [15] }
          ]
        },
        {
          fields: [
            { label: "Scope", type: "dword", value: 0 },
            { label: "ScaleX", type: "float", value: 0.5 },
            { label: "ScaleY", type: "float", value: 0.75 },
            { label: "ScaleZ", type: "float", value: 1.25 },
            { label: "RotateX", type: "float", value: 270 },
            { label: "RotateY", type: "float", value: 90 },
            { label: "RotateZ", type: "float", value: 45 },
            { label: "TranslateX", type: "float", value: 1 },
            { label: "TranslateY", type: "float", value: -2 },
            { label: "TranslateZ", type: "float", value: 3 }
          ]
        },
        {
          typeId: 100,
          fields: [
            { label: "AmbientSndDay", type: "int", value: 41 },
            { label: "AmbientSndNight", type: "int", value: 42 },
            { label: "AmbientSndDayVol", type: "int", value: 101 },
            { label: "AmbientSndNitVol", type: "int", value: 102 },
            { label: "EnvAudio", type: "int", value: 7 },
            { label: "MusicBattle", type: "int", value: 13 },
            { label: "MusicDay", type: "int", value: 11 },
            { label: "MusicNight", type: "int", value: 12 },
            { label: "MusicDelay", type: "int", value: 3000 }
          ]
        },
        {
          typeId: 0,
          fields: [
            { label: "Name", type: "cexostring", value: "PLG_AREA_FREEZE_DISEASE" },
            { label: "Type", type: "dword", value: 1 },
            { label: "Value", type: "int", value: 1 }
          ]
        },
        {
          typeId: 0,
          fields: [
            { label: "Name", type: "cexostring", value: "AreaNote" },
            { label: "Type", type: "dword", value: 3 },
            { label: "Value", type: "cexostring", value: "Market" }
          ]
        },
        {
          typeId: 3,
          fields: [
            { label: "PointX", type: "float", value: 4 },
            { label: "PointY", type: "float", value: 2 },
            { label: "PointZ", type: "float", value: 2 }
          ]
        },
        {
          typeId: 3,
          fields: [
            { label: "PointX", type: "float", value: 0 },
            { label: "PointY", type: "float", value: 2 },
            { label: "PointZ", type: "float", value: 2 }
          ]
        },
        {
          typeId: 1,
          fields: [
            { label: "X", type: "float", value: -1 },
            { label: "Y", type: "float", value: -1 },
            { label: "Z", type: "float", value: 0.25 }
          ]
        },
        {
          typeId: 1,
          fields: [
            { label: "X", type: "float", value: 2 },
            { label: "Y", type: "float", value: -1 },
            { label: "Z", type: "float", value: 0.25 }
          ]
        },
        {
          typeId: 1,
          fields: [
            { label: "X", type: "float", value: 0 },
            { label: "Y", type: "float", value: 2 },
            { label: "Z", type: "float", value: 0.25 }
          ]
        },
        {
          typeId: 0,
          fields: [
            { label: "PropertyName", type: "word", value: 1 },
            { label: "Subtype", type: "word", value: 0xffff },
            { label: "CostTable", type: "byte", value: 2 },
            { label: "CostValue", type: "word", value: 3 },
            { label: "Param1", type: "byte", value: 0xff },
            { label: "Param1Value", type: "byte", value: 0 },
            { label: "ChanceAppear", type: "byte", value: 100 }
          ]
        },
        {
          typeId: 0,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "nested_potion" },
            { label: "Repos_PosX", type: "word", value: 6 },
            { label: "Repos_Posy", type: "word", value: 7 },
            { label: "Cost", type: "dword", value: 123 }
          ]
        },
        {
          typeId: 4,
          fields: [
            { label: "Spell", type: "word", value: 2 },
            { label: "SpellFlags", type: "byte", value: 1 },
            { label: "SpellCasterLevel", type: "byte", value: 0 }
          ]
        }
      ],
      "GIT "
    );
    const setBytes = Buffer.from(
      [
        "[TILE101]",
        "Model=tno01_a01_01",
        "[TILE102]",
        "Model=tno01_a01_02",
        "[TILE103]",
        "Model=tno01_a01_03"
      ].join("\n"),
      "utf-8"
    );
    const lightColorBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "    RED  GREEN BLUE",
        "0   0.0  0.0   0.0",
        "3   1.0  0.75  0.25"
      ].join("\n"),
      "utf-8"
    );
    const tileColorBytes = Buffer.from(
      [
        "2DA V2.0",
        "",
        "    RED  GREEN BLUE",
        "0   0.0  0.0   0.0",
        "5   0.25 0.5   1.0"
      ].join("\n"),
      "utf-8"
    );
    const sourceLightModelBytes = Buffer.from(
      [
        "newmodel fx_flame01",
        "beginmodelgeom fx_flame01",
        "node light AuroraLight01",
        "  parent fx_flame01",
        "  color 1 0.42 0.42",
        "  radius 7",
        "  shadowradius 15",
        "  verticaldisplacement 2",
        "  lightpriority 4",
        "endnode",
        "newanim 5 fx_flame01",
        "  length 0.5",
        "  transtime 0.25",
        "  node light AuroraLight01",
        "    colorkey 2",
        "      0 1.4 1.8 1.4",
        "      0.5 1.4 1.8 1.4",
        "  endnode",
        "doneanim",
        "endmodelgeom fx_flame01"
      ].join("\n"),
      "latin1"
    );
    const tileModelBytes = Buffer.from(
      [
        "newmodel tno01_a01_01",
        "beginmodelgeom tno01_a01_01",
        "node light tno01_a01_01ml1",
        "  parent tno01_a01_01",
        "  position 1.5 -2.5 4",
        "  radius 5",
        "  multiplier 1.25",
        "  ambientonly 0",
        "  affectdynamic 1",
        "  shadow 0",
        "  lightpriority 5",
        "endnode",
        "node light tno01_a01_01ml2",
        "  parent tno01_a01_01",
        "  position 0 0 5",
        "  radius 14",
        "  multiplier 1",
        "  ambientonly 0",
        "  affectdynamic 1",
        "  shadow 0",
        "  lightpriority 5",
        "endnode",
        "node dummy tno01_a01_01sl1",
        "  parent tno01_a01_01",
        "  position -1.25 1.5 1",
        "endnode",
        "endmodelgeom tno01_a01_01"
      ].join("\n"),
      "latin1"
    );

    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key.endsWith(".are")) {
        return {
          key,
          size: areBytes.length,
          contentType: "application/octet-stream",
          bytes: areBytes,
          etag: "a1",
          lastModified: "2026-05-25T10:00:00.000Z"
        };
      }
      if (key.endsWith(".set")) {
        return {
          key,
          size: setBytes.length,
          contentType: "text/plain",
          bytes: setBytes,
          etag: "set1",
          lastModified: "2026-05-25T10:00:00.000Z"
        };
      }
      if (key.endsWith("lightcolor.2da")) {
        return {
          key,
          size: lightColorBytes.length,
          contentType: "text/plain",
          bytes: lightColorBytes,
          etag: "lightcolor1",
          lastModified: "2026-05-25T10:00:00.000Z"
        };
      }
      if (key.endsWith("tilecolor.2da")) {
        return {
          key,
          size: tileColorBytes.length,
          contentType: "text/plain",
          bytes: tileColorBytes,
          etag: "tilecolor1",
          lastModified: "2026-05-25T10:00:00.000Z"
        };
      }
      if (key.endsWith("fx_flame01.mdl")) {
        return {
          key,
          size: sourceLightModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceLightModelBytes,
          etag: "fxflame1",
          lastModified: "2026-05-25T10:00:00.000Z"
        };
      }
      if (key.endsWith("tno01_a01_01.mdl")) {
        return {
          key,
          size: tileModelBytes.length,
          contentType: "application/octet-stream",
          bytes: tileModelBytes,
          etag: "tilemdl1",
          lastModified: "2026-05-25T10:00:00.000Z"
        };
      }
      if (key.endsWith(".git")) {
        return {
          key,
          size: gitBytes.length,
          contentType: "application/octet-stream",
          bytes: gitBytes,
          etag: "g1",
          lastModified: "2026-05-25T10:00:00.000Z"
        };
      }
      return null;
    });

    const runtimeSettingsApplicationService = createRuntimeSettingsApplicationService();
    runtimeSettingsApplicationService.syncVanillaTileModelSources.mockImplementation(
      () => new Promise(() => undefined)
    );
    const itemBaseItemCatalog = {
      descriptor: {
        resourceName: "baseitems.2da" as const,
        sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
        sourceLayer: "hak" as const,
        sha256: "b".repeat(64),
        sizeBytes: 4096,
        rowCount: 64,
      },
      rows: Array.from({ length: 64 }, (_, rowIndex) => ({
        rowIndex,
        modelType: 0 as const,
        displayName: `Base item ${rowIndex}`,
      })),
    };
    const repository = new ModuleSnapshotAreaRepository(
      runtimeSettings,
      moduleBlobStorage,
      runtimeSettingsApplicationService,
      undefined,
      undefined,
      {
        listEffectiveWaypointTwoDaRows: jest.fn().mockResolvedValue({
          descriptor: {
            resourceName: "waypoint.2da",
            sourceObjectKey: "modules/current/__aurora/sources/vanilla/waypoint.2da",
            sourceLayer: "vanilla",
            sha256: "a".repeat(64),
            sizeBytes: 272,
            rowCount: 5,
          },
          items: [{
            rowIndex: 1,
            modelResRef: "gi_waypoint01",
            strRef: 67281,
            label: "blue",
            displayName: "Blue",
            displaySource: "strref",
          }],
          total: 1,
          limit: 256,
          offset: 0,
        }),
        resolveEffectiveCreatureGenderTwoDaDescriptor: jest.fn().mockResolvedValue({
          resourceName: "gender.2da",
          sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/gender.2da",
          sourceLayer: "hak",
          sha256: "c".repeat(64),
          sizeBytes: 250,
          rowCount: 5,
        }),
        resolveEffectiveCreatureAppendageTwoDaDescriptor: jest.fn(
          async (resourceName: "wingmodel.2da" | "tailmodel.2da") => ({
            resourceName,
            sourceObjectKey:
              `modules/current/__aurora/sources/hak/lc_2da/${resourceName}`,
            sourceLayer: "hak",
            sha256: resourceName === "wingmodel.2da" ? "1".repeat(64) : "2".repeat(64),
            sizeBytes: resourceName === "wingmodel.2da" ? 1_024 : 2_048,
            rowCount: 8,
          }),
        ),
        resolveEffectiveCreatureSpecialAbilitiesTwoDaTable: jest.fn().mockResolvedValue({
          descriptor: {
            resourceName: "spells.2da",
            sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/spells.2da",
            sourceLayer: "hak",
            sha256: "3".repeat(64),
            sizeBytes: 8_192,
            rowCount: 5,
          },
          rows: [{
            rowIndex: 2,
            nameStrRef: 102,
            userType: 2,
            displayName: "Aura of Cold",
            displaySource: "strref",
          }],
        }),
        resolveEffectiveCreaturePerceptionRangesTwoDaTable: jest.fn().mockResolvedValue({
          descriptor: {
            resourceName: "ranges.2da",
            sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/ranges.2da",
            sourceLayer: "hak",
            sha256: "d".repeat(64),
            sizeBytes: 1220,
            rowCount: 13,
          },
          rows: [
            { rowIndex: 8, displayName: "Short", displaySource: "strref", nameStrRef: 6668 },
            { rowIndex: 9, displayName: "Medium", displaySource: "strref", nameStrRef: 6669 },
            { rowIndex: 10, displayName: "Long", displaySource: "strref", nameStrRef: 6670 },
            { rowIndex: 11, displayName: "Default", displaySource: "strref", nameStrRef: 6671 },
          ],
        }),
        resolveEffectiveCreatureWalkRatesTwoDaTable: jest.fn().mockResolvedValue({
          descriptor: {
            resourceName: "creaturespeed.2da",
            sourceObjectKey:
              "modules/current/__aurora/sources/hak/lc_2da/creaturespeed.2da",
            sourceLayer: "hak",
            sha256: "e".repeat(64),
            sizeBytes: 4_096,
            rowCount: 9,
          },
          rows: Array.from({ length: 8 }, (_, index) => ({
            rowIndex: index + 1,
            displayName: `WalkRate ${index + 1}`,
            displaySource: "strref_id",
            nameStrRef: 1001 + index,
            twoDaName: `RATE_${index + 1}`,
          })),
        }),
        resolveEffectiveCreaturePortraitsTwoDaTable: jest.fn().mockResolvedValue({
          descriptor: {
            resourceName: "portraits.2da",
            sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/portraits.2da",
            sourceLayer: "hak",
            sha256: "f".repeat(64),
            sizeBytes: 100_000,
            rowCount: 16_001,
          },
          rows: [{
            rowIndex: 10,
            baseResRef: "po_guard",
            sex: 4,
            race: 6,
            plot: 0,
          }],
        }),
        resolveEffectiveItemBaseItemsTwoDaTable: jest.fn().mockResolvedValue(itemBaseItemCatalog),
      } as any,
    );

    // A cold CEP/HAK WOK sync may take minutes.  It is collision enrichment,
    // not a prerequisite for reading the ARE or editing its Tile_List.
    const list = await repository.list({ limit: 20, offset: 0 });
    expect(list.total).toBe(1);
    expect(runtimeSettingsApplicationService.syncVanillaTileModelSources).toHaveBeenCalledWith(
      "areas-vfx-wok-background-sync",
      ["tno01_a01_01", "tno01_a01_02", "tno01_a01_03"]
    );

    const area = await repository.findById(list.items[0].areaId);
    expect(area).not.toBeNull();
    expect(area?.name).toBe("Market District");
    expect(area?.comments).toBe(" exact repository note ");
    expect(area?.eventScripts).toEqual({ onEnter: "area_enter", onExit: "" });
    expect(area?.basicIdentity).toEqual({
      name: "Market District",
      nameProfile: "simple_inline_ascii",
      nameEntries: [{ languageId: 0, text: "Market District" }],
      tag: "MARKET_DISTRICT",
    });
    expect(area?.advancedFlags).toEqual({
      terrainType: { interior: true, natural: true, subterranean: false },
      playerVsPlayer: 1,
      noRest: true,
      listenCheckModifier: -8,
      spotCheckModifier: 11,
    });
    expect(area?.itemBaseItemCatalog).toEqual(itemBaseItemCatalog);
    expect(area?.itemBaseItemCatalog).not.toBe(itemBaseItemCatalog);
    expect(area?.itemBaseItemCatalog?.rows).not.toBe(itemBaseItemCatalog.rows);
    expect(area?.width).toBe(24);
    expect(area?.height).toBe(20);
    expect(area?.textureAtlasId).toBe("atlas_tno01_v1");
    expect(area?.tiles).toEqual([
      expect.objectContaining({
        tileInstanceId: "area_market_district:tile:0",
        tilesetResRef: "tno01",
        row: 0,
        col: 0,
        tileIndex: 0,
        tileId: 101,
        modelResRef: "tno01_a01_01",
        modelSource: "set-tile-section",
        mainLight1: 3,
        mainLight1Color: {
          rowId: 3,
          red: 1,
          green: 0.75,
          blue: 0.25,
          sourceKey: "modules/current/__aurora/sources/vanilla/lightcolor.2da",
          nativeNode: {
            status: "main-native-node-resolved",
            name: "tno01_a01_01ml1",
            position: [1.5, -2.5, 4],
            coordinateSpace: "model-local-aurora-z-up",
            radius: 5,
            multiplier: 1.25,
            lightPriority: 5,
            ambientOnly: false,
            affectDynamic: true,
            shadow: false,
            sourceModelFileName: "tno01_a01_01.mdl",
            sourceModelObjectKey:
              "modules/current/__aurora/sources/vanilla/tno01_a01_01.mdl",
            sourceModelHash: expect.any(String),
            proofStatus: "source-backed-tile-mdl-native-main-light"
          }
        },
        sourceLight1: 5,
        sourceLight1Color: {
          rowId: 5,
          red: 1.4,
          green: 1.8,
          blue: 1.4,
          sourceKey: "modules/current/__aurora/sources/vanilla/fx_flame01.mdl",
          sourceAnimationName: "5",
          sourceModelFileName: "fx_flame01.mdl",
          sourceModelHash: expect.any(String),
          sourceMultiplier: 1,
          sourceMultiplierSource: expect.stringContaining(
            "PartLight::PartLight"
          ),
          sourceProofStatus:
            "source-backed-fx_flame01-animation-color-partlight-multiplier",
          sourceNode: {
            status: "source-node-resolved",
            slotIndex: 1,
            sourceNodeCount: 1,
            name: "tno01_a01_01sl1",
            position: [-1.25, 1.5, 1],
            coordinateSpace: "model-local-aurora-z-up",
            sourceModelFileName: "tno01_a01_01.mdl",
            sourceModelObjectKey:
              "modules/current/__aurora/sources/vanilla/tno01_a01_01.mdl",
            sourceModelHash: expect.any(String),
            proofStatus: "source-backed-tile-mdl-source-light-slot-count"
          }
        },
        sourceLight2: 5,
        sourceLight2Color: {
          rowId: 5,
          red: 1.4,
          green: 1.8,
          blue: 1.4,
          sourceKey: "modules/current/__aurora/sources/vanilla/fx_flame01.mdl",
          sourceAnimationName: "5",
          sourceModelFileName: "fx_flame01.mdl",
          sourceModelHash: expect.any(String),
          sourceMultiplier: 1,
          sourceMultiplierSource: expect.stringContaining(
            "PartLight::PartLight"
          ),
          sourceProofStatus:
            "source-backed-fx_flame01-animation-color-partlight-multiplier",
          sourceNode: {
            status: "source-node-absent-by-aurora-slot-count",
            slotIndex: 2,
            sourceNodeCount: 1,
            sourceModelFileName: "tno01_a01_01.mdl",
            sourceModelObjectKey:
              "modules/current/__aurora/sources/vanilla/tno01_a01_01.mdl",
            sourceModelHash: expect.any(String),
            proofStatus: "source-backed-tile-mdl-source-light-slot-count"
          }
        },
        source: "are-tile-list"
      }),
      expect.objectContaining({
        tileInstanceId: "area_market_district:tile:1",
        tileId: 102,
        modelResRef: "tno01_a01_02",
        modelSource: "set-tile-section"
      }),
      expect.objectContaining({
        tileInstanceId: "area_market_district:tile:2",
        tileId: 103,
        modelResRef: "tno01_a01_03",
        modelSource: "set-tile-section"
      })
    ]);
    expect(area?.creaturePortraitCatalog).toEqual({
      descriptor: {
        resourceName: "portraits.2da",
        sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/portraits.2da",
        sourceLayer: "hak",
        sha256: "f".repeat(64),
        sizeBytes: 100_000,
        rowCount: 16_001,
      },
      rows: [{ rowIndex: 10, baseResRef: "po_guard", sex: 4, race: 6, plot: 0 }],
    });
    expect(area?.objects).toHaveLength(10);
    expect(area?.objects.filter((entry) => entry.kind === "door")).toHaveLength(1);
    expect(area?.objects.filter((entry) => entry.kind === "encounter")).toHaveLength(1);
    expect(area?.objects.filter((entry) => entry.kind === "sound")).toHaveLength(1);
    expect(area?.objects.filter((entry) => entry.kind === "store")).toHaveLength(1);
    expect(area?.objects.filter((entry) => entry.kind === "trigger")).toHaveLength(1);
    expect(area?.objects.filter((entry) => entry.kind === "waypoint")).toHaveLength(1);
    expect((area?.objects.find((entry) => entry.kind === "item") as any)?.itemVisualTransform)
      .toEqual({ present: false });
    expect(area?.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "placeable",
          templateId: "plc_crate_01",
          isStatic: false,
          placeableMetadata: expect.objectContaining({ "script.onUsed": "" })
        }),
        expect.objectContaining({
          kind: "placeable",
          templateId: "plc_vt_floor_board",
          tag: "vt_floor_board",
          isStatic: true,
          x: 1.812,
          y: 2.213,
          z: 0.195,
          bearing: expect.closeTo(90, 4),
          visualTransform: {
            scale: expect.closeTo(0.8333, 4),
            scaleX: 0.5,
            scaleY: 0.75,
            scaleZ: 1.25,
            offsetX: 0.1,
            offsetY: -0.2,
            offsetZ: 0.3,
            pitch: expect.closeTo((Math.PI * 3) / 2, 6),
            yaw: expect.closeTo(Math.PI / 4, 6),
            roll: expect.closeTo(Math.PI / 2, 6)
          }
        }),
        expect.objectContaining({
          kind: "door",
          templateId: "utd_city_gate_01"
        }),
        expect.objectContaining({
          kind: "item",
          templateId: "itm_potion_01",
          itemLocalizedStrings: {
            localizedName: {
              present: true,
              strRef: 0xffff_ffff,
              entries: [{ languageId: 0, textBytesBase64: "UG90aW9u" }],
            },
            description: {
              present: true,
              strRef: 0xffff_ffff,
              entries: [{ languageId: 0, textBytesBase64: "VW5rbm93biBwb3Rpb24=" }],
            },
            identifiedDescription: {
              present: true,
              strRef: 7,
              entries: [{ languageId: 0, textBytesBase64: "S25vd24gcG90aW9u" }],
            },
          },
          itemInstanceState: {
            presentFields: [
              "charges",
              "cost",
              "stolen",
              "stackSize",
              "plot",
              "addCost",
              "identified",
              "cursed"
            ],
            values: {
              charges: 7,
              cost: 4_294_967_295,
              stolen: true,
              stackSize: 65_535,
              plot: false,
              addCost: 99,
              identified: true,
              cursed: false
            }
          },
          itemVariables: { expectedEntries: [] },
          itemPropertyList: {
            present: true,
            expectedEntries: [{
              sourceIndex: 0,
              propertyName: 1,
              subtype: 0xffff,
              costTable: 2,
              costValue: 3,
              param1: 0xff,
              param1Value: 0,
              chanceAppear: 100,
            }],
          },
          itemInventoryItems: [{
            sourceIndex: 0,
            resRef: "nested_potion",
            x: 6,
            y: 7,
          }],
          itemVisualTransform: { present: false },
          itemBaseAppearance: {
            expectedValue: {
              baseItem: 24,
              modelType: 0,
              appearance: { modelPart1: 66 },
            },
            tableSha256: "b".repeat(64),
            tableRowCount: 64,
          },
        }),
        expect.objectContaining({
          kind: "sound",
          templateId: "snd_forge_loop",
          soundPositioning: expect.objectContaining({
            mode: "specific",
            maxVolumeDistance: 0.2,
            cutoffDistance: 1.6,
            preserve: expect.objectContaining({
              playStyle: "loop",
              extra: {
                auroraSoundList: "forge_loop_a"
              }
            })
          })
        }),
        expect.objectContaining({
          kind: "encounter",
          templateId: "enc_city_patrol",
          tag: "enc_patrol_tag",
          polygonGeometry: {
            coordinateSpace: "native_local",
            points: [
              { x: -1, y: -1, z: 0.25 },
              { x: 2, y: -1, z: 0.25 },
              { x: 0, y: 2, z: 0.25 }
            ]
          }
        }),
        expect.objectContaining({
          kind: "store",
          templateId: "sto_blacksmith",
          tag: "merchant_store"
        }),
        expect.objectContaining({
          kind: "trigger",
          templateId: "trg_transition",
          tag: "exit_trigger",
          x: 0.2,
          y: 0.1,
          z: 0.1,
          polygonGeometry: {
            coordinateSpace: "native_local",
            points: [
              { x: 0, y: 0, z: 0 },
              { x: 4, y: 0, z: 0 },
              { x: 4, y: 2, z: 2 },
              { x: 0, y: 2, z: 2 }
            ]
          }
        }),
        expect.objectContaining({
          kind: "waypoint",
          tag: "wp_market_entry",
          waypointAppearance: {
            present: true,
            nativeType: "byte",
            value: 1,
            table: {
              resourceName: "waypoint.2da",
              sourceObjectKey: "modules/current/__aurora/sources/vanilla/waypoint.2da",
              sourceLayer: "vanilla",
              sha256: "a".repeat(64),
              sizeBytes: 272,
              rowCount: 5,
              rowIndex: 1,
            },
          },
        }),
        expect.objectContaining({
          kind: "creature",
          templateId: "cre_guard_01",
          resRef: "cre_guard_01",
          tag: "guard_git_tag",
          appearanceType: 42,
          creatureChallengeRating: {
            present: true,
            nativeType: "float",
            value: 11.5,
          },
          creatureNaturalArmorClass: {
            present: true,
            nativeType: "byte",
            value: 2,
          },
          creatureSavingThrowBonuses: {
            fortitude: { present: true, nativeType: "short", value: 3 },
            reflex: { present: true, nativeType: "short", value: 1 },
            will: { present: true, nativeType: "short", value: 2 },
          },
          creatureAlignment: {
            goodEvil: { present: true, nativeType: "byte", value: 50 },
            lawfulChaotic: { present: true, nativeType: "byte", value: 100 },
          },
          creatureAbilityScores: {
            strength: { present: true, nativeType: "byte", value: 15 },
            dexterity: { present: true, nativeType: "byte", value: 13 },
            constitution: { present: true, nativeType: "byte", value: 16 },
            intelligence: { present: true, nativeType: "byte", value: 10 },
            wisdom: { present: true, nativeType: "byte", value: 12 },
            charisma: { present: true, nativeType: "byte", value: 8 },
          },
          creatureGender: {
            present: true,
            nativeType: "byte",
            value: 4,
            table: {
              resourceName: "gender.2da",
              sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/gender.2da",
              sourceLayer: "hak",
              sha256: "c".repeat(64),
              sizeBytes: 250,
              rowCount: 5,
              rowIndex: 4,
            },
          },
          creatureAppendages: {
            wings: {
              present: true,
              value: 1,
              modernDword: {
                present: true,
                nativeType: "dword",
                value: 1,
                table: {
                  resourceName: "wingmodel.2da",
                  sourceObjectKey:
                    "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da",
                  sourceLayer: "hak",
                  sha256: "1".repeat(64),
                  sizeBytes: 1_024,
                  rowCount: 8,
                  rowIndex: 1,
                },
              },
              legacyByte: { present: true, nativeType: "byte", value: 2 },
            },
            tail: {
              present: true,
              value: 3,
              modernDword: {
                present: true,
                nativeType: "dword",
                value: 3,
                table: {
                  resourceName: "tailmodel.2da",
                  sourceObjectKey:
                    "modules/current/__aurora/sources/hak/lc_2da/tailmodel.2da",
                  sourceLayer: "hak",
                  sha256: "2".repeat(64),
                  sizeBytes: 2_048,
                  rowCount: 8,
                  rowIndex: 3,
                },
              },
              legacyByte: { present: false },
            },
          },
          creatureSpecialAbilityList: {
            present: true,
            nativeType: "list",
            structTypeId: 4,
            entries: [{
              spellId: 2,
              spellFlags: 1,
              casterLevel: 0,
              opaqueSiblingFieldCount: 0,
            }],
            table: {
              resourceName: "spells.2da",
              sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/spells.2da",
              sourceLayer: "hak",
              sha256: "3".repeat(64),
              sizeBytes: 8_192,
              rowCount: 5,
            },
          },
          creaturePerceptionRange: {
            present: true,
            nativeType: "byte",
            value: 11,
            table: {
              resourceName: "ranges.2da",
              sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/ranges.2da",
              sourceLayer: "hak",
              sha256: "d".repeat(64),
              sizeBytes: 1220,
              rowCount: 13,
              rowIndex: 11,
            },
          },
          creatureWalkRate: {
            present: true,
            nativeType: "int",
            value: 4,
            table: {
              resourceName: "creaturespeed.2da",
              sourceObjectKey:
                "modules/current/__aurora/sources/hak/lc_2da/creaturespeed.2da",
              sourceLayer: "hak",
              sha256: "e".repeat(64),
              sizeBytes: 4_096,
              rowCount: 9,
              rowIndex: 4,
              twoDaName: "RATE_4",
            },
          },
          creaturePortrait: {
            present: true,
            nativeType: "word",
            value: 10,
            selectorContext: { genderValue: 4, raceValue: 6 },
            table: {
              resourceName: "portraits.2da",
              sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/portraits.2da",
              sourceLayer: "hak",
              sha256: "f".repeat(64),
              sizeBytes: 100_000,
              rowCount: 16_001,
              rowIndex: 10,
              baseResRef: "po_guard",
            },
          },
          creatureTag: { present: true, value: "guard_git_tag" },
          creatureConversation: { present: true, value: "Guard_Dialog" },
          creatureInterruptable: { present: true, value: 1 },
          creatureFaction: { present: true, nativeType: "word", value: 1 },
          creatureTemplateResRef: {
            present: true,
            nativeType: "resref",
            value: "cre_guard_01",
          },
          creatureSpecialIdentityStrings: {
            subrace: {
              present: true,
              nativeType: "cexostring",
              value: "Moon Elf",
            },
            deity: {
              present: true,
              nativeType: "cexostring",
              value: "Mystra",
            },
          },
          creatureScriptResRefs: {
            onHeartbeat: { present: false },
            onPerception: { present: false },
            onSpellCastAt: { present: false },
            onPhysicalAttacked: { present: false },
            onDamaged: { present: false },
            onDisturbed: { present: false },
            onCombatRoundEnd: { present: false },
            onConversation: { present: false },
            onSpawn: {
              present: true,
              nativeType: "resref",
              value: "nw_c2_guardspawn",
            },
            onRested: { present: false },
            onDeath: { present: false },
            onUserDefined: { present: false },
            onBlocked: { present: false },
          },
          creatureAdvancedFlags: {
            disarmable: { present: true, value: 1 },
            plot: { present: true, value: 1 },
            immortal: { present: true, value: 0 },
            lootable: { present: true, value: 1 },
            noPermanentDeath: { present: true, value: 0 },
          },
          creatureMetadata: expect.objectContaining({
            firstName: "GIT Guard",
            race: 6,
            plot: true,
            strength: 15,
            "script.scriptspawn": "nw_c2_guardspawn"
          })
        })
      ])
    );
    expect(area?.audioEnvironment).toEqual({
      ambientSoundDayId: 41,
      ambientSoundNightId: 42,
      ambientSoundDayVolume: 101,
      ambientSoundNightVolume: 102,
      environmentAudioId: 7,
      musicBattleId: 13,
      musicDayId: 11,
      musicNightId: 12,
      musicDelayMilliseconds: 3000
    });
    expect(area?.variables).toEqual({
      expectedEntries: [
        {
          sourceIndex: 0,
          name: "PLG_AREA_FREEZE_DISEASE",
          type: "int",
          value: 1
        },
        { sourceIndex: 1, name: "AreaNote", type: "string", value: "Market" }
      ]
    });
    expect(area?.soundscape).toEqual({
      bindingKeys: {
        areaKey: "GI_sound_area",
        randomKey: "GI_sound_rndm",
        positionalKey: "GI_sound_pos"
      },
      area: [],
      random: [],
      positional: []
    });

    const composition = repository.getPrecomputedAreaProcessing(list.items[0].areaId);
    expect(composition?.composition).toEqual({
      placeables: 2,
      doors: 1,
      creatures: 1,
      encounters: 1,
      items: 1,
      sounds: 1,
      stores: 1,
      triggers: 1,
      waypoints: 1,
      total: 10
    });
    expect(moduleBlobStorage.getModuleObject)
      .not.toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it("falls back to static repository when no area files found", async () => {
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
    const repository = new ModuleSnapshotAreaRepository(
      runtimeSettings,
      moduleBlobStorage,
      createRuntimeSettingsApplicationService()
    );

    const list = await repository.list({
      limit: 20,
      offset: 0
    });
    expect(list.total).toBeGreaterThan(0);
  });
});

function createEffectiveAreaAudioCatalogBundle() {
  const descriptor = (
    resourceName: "ambientsound.2da" | "ambientmusic.2da" | "soundeax.2da",
    sha256: string,
  ) => ({
    resourceName,
    sourceObjectKey: `modules/current/${resourceName}`,
    sourceLayer: "module" as const,
    sha256,
    sizeBytes: 64,
    rowCount: 1,
  });
  return {
    schemaVersion: "area-audio-environment-catalogs.v1" as const,
    ambientSound: {
      descriptor: descriptor("ambientsound.2da", "a".repeat(64)),
      rows: [{ rowIndex: 41, displayName: "Forest day", displaySource: "strref" as const }],
    },
    ambientMusic: {
      descriptor: descriptor("ambientmusic.2da", "b".repeat(64)),
      rows: [{
        rowIndex: 11,
        battleEligible: false,
        displayName: "Rural day",
        displaySource: "display_name" as const,
      }],
    },
    environmentalAudio: {
      descriptor: descriptor("soundeax.2da", "c".repeat(64)),
      rows: [{
        rowIndex: 7,
        label: "EAX_CAVE",
        displayName: "Cave",
        displaySource: "label" as const,
      }],
    },
  };
}

function createEffectiveAreaVisualEnvironmentCatalogBundle() {
  return {
    schemaVersion: "area-visual-environment-catalogs.v1" as const,
    lightingSchemes: {
      descriptor: {
        resourceName: "environment.2da" as const,
        sourceObjectKey: "modules/current/environment.2da",
        sourceLayer: "module" as const,
        sha256: "f".repeat(64),
        sizeBytes: 512,
        rowCount: 1,
      },
      rows: [{
        rowIndex: 0,
        label: "ExteriorProbe",
        displayName: "Exterior Probe",
        displaySource: "label" as const,
        visualEnvironment: {
          dayNightMode: "cycle" as const,
          shadowOpacity: 65,
          chanceRain: 4,
          chanceSnow: 3,
          chanceLightning: 5,
          sun: {
            ambientColor: 0x030201,
            diffuseColor: 0x060504,
            fogColor: 0x0f0e0d,
            fogAmount: 7,
            shadows: true,
          },
          moon: {
            ambientColor: 0x090807,
            diffuseColor: 0x0c0b0a,
            fogColor: 0x121110,
            fogAmount: 8,
            shadows: false,
          },
        },
        visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
        skyBoxRowIndex: 1,
      }],
    },
    skyBoxes: {
      descriptor: {
        resourceName: "skyboxes.2da" as const,
        sourceObjectKey: "modules/current/skyboxes.2da",
        sourceLayer: "module" as const,
        sha256: "1".repeat(64),
        sizeBytes: 256,
        rowCount: 2,
      },
      rows: [
        { rowIndex: 0, label: "None", displayName: "None", displaySource: "label" as const },
        {
          rowIndex: 1,
          label: "Grass_Clear",
          stringRef: 456,
          displayName: "Clear Grass",
          displaySource: "strref" as const,
        },
      ],
    },
  };
}

function createEffectiveAreaLoadingScreenCatalog() {
  return {
    schemaVersion: "area-loading-screen-catalog.v1" as const,
    descriptor: {
      resourceName: "loadscreens.2da" as const,
      sourceObjectKey: "modules/current/loadscreens.2da",
      sourceLayer: "module" as const,
      sha256: "d".repeat(64),
      sizeBytes: 96,
      rowCount: 1,
    },
    rows: [{
      rowIndex: 0,
      sourceRowId: 0,
      imageResRef: "ls_default",
      displayName: "Default",
      displaySource: "area_default_strref" as const,
      toolsetSelectable: true,
      imageAsset: {
        resourceName: "ls_default.tga",
        sourceObjectKey: "modules/current/ls_default.tga",
        sourceLayer: "module" as const,
        sha256: "e".repeat(64),
        sizeBytes: 1024,
      },
    }],
  };
}

function buildNestedGffBuffer(structs: StructDef[], fileType: string): Buffer {
  const uniqueLabels = [
    ...new Set(structs.flatMap((struct) => struct.fields.map((field) => field.label)))
  ];
  const labelIndexByName = new Map(uniqueLabels.map((label, index) => [label, index]));

  const fieldDataChunks: Buffer[] = [];
  const listIndicesChunks: Buffer[] = [];
  const fieldEntries: Array<{ typeId: number; labelIndex: number; dataOrOffset: number }> = [];
  const structFieldIndices: number[][] = structs.map(() => []);

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

  structs.forEach((struct, structIndex) => {
    struct.fields.forEach((field) => {
      const labelIndex = labelIndexByName.get(field.label);
      if (labelIndex === undefined) {
        throw new Error(`Unknown label index for ${field.label}`);
      }

      let entry: { typeId: number; labelIndex: number; dataOrOffset: number };

      if (field.type === "byte") {
        entry = {
          typeId: FIELD_TYPE.BYTE,
          labelIndex,
          dataOrOffset: field.value & 0xff,
        };
      } else if (field.type === "word") {
        entry = {
          typeId: FIELD_TYPE.WORD,
          labelIndex,
          dataOrOffset: field.value & 0xffff,
        };
      } else if (field.type === "short") {
        entry = {
          typeId: FIELD_TYPE.SHORT,
          labelIndex,
          dataOrOffset: field.value & 0xffff,
        };
      } else if (field.type === "dword") {
        entry = {
          typeId: FIELD_TYPE.DWORD,
          labelIndex,
          dataOrOffset: field.value >>> 0
        };
      } else if (field.type === "int") {
        entry = {
          typeId: FIELD_TYPE.INT,
          labelIndex,
          dataOrOffset: field.value >>> 0
        };
      } else if (field.type === "float") {
        const inline = Buffer.allocUnsafe(4);
        inline.writeFloatLE(field.value, 0);
        entry = {
          typeId: FIELD_TYPE.FLOAT,
          labelIndex,
          dataOrOffset: inline.readUInt32LE(0)
        };
      } else if (field.type === "cexostring") {
        const valueBytes = Buffer.from(field.value, "utf-8");
        const payload = Buffer.alloc(4 + valueBytes.length);
        payload.writeUInt32LE(valueBytes.length, 0);
        valueBytes.copy(payload, 4);
        entry = {
          typeId: FIELD_TYPE.CEXOSTRING,
          labelIndex,
          dataOrOffset: pushFieldData(payload)
        };
      } else if (field.type === "resref") {
        const valueBytes = Buffer.from(field.value, "ascii");
        const payload = Buffer.alloc(1 + valueBytes.length);
        payload.writeUInt8(valueBytes.length, 0);
        valueBytes.copy(payload, 1);
        entry = {
          typeId: FIELD_TYPE.RESREF,
          labelIndex,
          dataOrOffset: pushFieldData(payload)
        };
      } else if (field.type === "cexolocstring") {
        const valueBytes = Buffer.from(field.value, "utf-8");
        const entryPayload = Buffer.alloc(8 + valueBytes.length);
        entryPayload.writeUInt32LE(0, 0);
        entryPayload.writeUInt32LE(valueBytes.length, 4);
        valueBytes.copy(entryPayload, 8);

        const locPayload = Buffer.alloc(12 + entryPayload.length);
        const totalSize = 8 + entryPayload.length;
        locPayload.writeUInt32LE(totalSize, 0);
        locPayload.writeUInt32LE(field.strRef ?? 0, 4);
        locPayload.writeUInt32LE(1, 8);
        entryPayload.copy(locPayload, 12);

        entry = {
          typeId: FIELD_TYPE.CEXOLOCSTRING,
          labelIndex,
          dataOrOffset: pushFieldData(locPayload)
        };
      } else if (field.type === "struct") {
        entry = {
          typeId: FIELD_TYPE.STRUCT,
          labelIndex,
          dataOrOffset: field.value >>> 0
        };
      } else {
        const payload = Buffer.alloc(4 + field.value.length * 4);
        payload.writeUInt32LE(field.value.length, 0);
        field.value.forEach((structIndexFromList, index) => {
          payload.writeUInt32LE(structIndexFromList >>> 0, 4 + index * 4);
        });
        entry = {
          typeId: FIELD_TYPE.LIST,
          labelIndex,
          dataOrOffset: pushListIndicesData(payload)
        };
      }

      const fieldIndex = fieldEntries.length;
      fieldEntries.push(entry);
      structFieldIndices[structIndex].push(fieldIndex);
    });
  });

  const fieldData = Buffer.concat(fieldDataChunks);
  const listIndices = Buffer.concat(listIndicesChunks);

  const fieldIndicesChunks: Buffer[] = [];
  const structEntries: Array<{ typeId: number; dataOrOffset: number; fieldCount: number }> = [];

  structs.forEach((struct, index) => {
    const indices = structFieldIndices[index];
    if (indices.length === 0) {
      structEntries.push({
        typeId: struct.typeId ?? 1,
        dataOrOffset: 0,
        fieldCount: 0
      });
      return;
    }

    if (indices.length === 1) {
      structEntries.push({
        typeId: struct.typeId ?? 1,
        dataOrOffset: indices[0],
        fieldCount: 1
      });
      return;
    }

    const currentOffset = fieldIndicesChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const chunk = Buffer.alloc(indices.length * 4);
    indices.forEach((fieldIndex, fieldPos) => {
      chunk.writeUInt32LE(fieldIndex >>> 0, fieldPos * 4);
    });
    fieldIndicesChunks.push(chunk);

    structEntries.push({
      typeId: struct.typeId ?? 1,
      dataOrOffset: currentOffset,
      fieldCount: indices.length
    });
  });

  const fieldIndices = Buffer.concat(fieldIndicesChunks);

  const structTable = Buffer.alloc(structEntries.length * STRUCT_ENTRY_SIZE);
  structEntries.forEach((entry, index) => {
    const offset = index * STRUCT_ENTRY_SIZE;
    structTable.writeUInt32LE(entry.typeId >>> 0, offset);
    structTable.writeUInt32LE(entry.dataOrOffset >>> 0, offset + 4);
    structTable.writeUInt32LE(entry.fieldCount >>> 0, offset + 8);
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
