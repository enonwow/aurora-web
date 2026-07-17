import { createHash } from "node:crypto";
import {
  AreaEditingApplicationService,
  __areaEditingApplicationServiceInternals
} from "../../src/modules/areas/application/area-editing.application.service";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type { AreaEditingExportDraftRequest } from "../../src/modules/areas/adapters/inbound/http/area-editing.schemas";
import type { AuroraTilesetEditingDefinition } from "../../src/modules/areas/adapters/outbound/blob/aurora-set-tileset-parser";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { AreasApplicationService } from "../../src/modules/areas/application/areas.application.service";

describe("AreaEditingApplicationService snapshot object cache", () => {
  it("shares one snapshot listing across concurrent and repeated tileset reads", async () => {
    const setBytes = Buffer.from(
      [
        "[TILES]",
        "Count=1",
        "[TILE0]",
        "Model=test_model",
        "TopLeft=grass",
        "TopRight=grass",
        "BottomRight=grass",
        "BottomLeft=grass"
      ].join("\n"),
      "utf8"
    );
    const sourceKey = "modules/current/__aurora/sources/vanilla/tilesets/testset.set";
    const moduleBlobStorage = {
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "test",
        prefix: "modules/current",
        totalFiles: 1,
        totalBytes: setBytes.length,
        objects: [{ key: sourceKey, size: setBytes.length }],
        truncated: false
      }),
      getModuleObject: jest.fn().mockResolvedValue({
        key: sourceKey,
        size: setBytes.length,
        contentType: "text/plain",
        bytes: setBytes
      })
    } as unknown as ModuleBlobStoragePort;
    const runtimeSettingsRepository = {
      get: jest.fn().mockResolvedValue({
        blobStorage: {
          endpoint: "http://blob.test",
          region: "test",
          bucket: "test",
          modulePrefix: "modules/current",
          accessKeyId: "test",
          secretAccessKey: "test",
          forcePathStyle: true
        }
      })
    } as unknown as RuntimeSettingsRepositoryPort;
    const service = new AreaEditingApplicationService(
      {} as AreasApplicationService,
      moduleBlobStorage,
      runtimeSettingsRepository
    );

    const [left, right] = await Promise.all([
      service.getTilesetDefinition("testset"),
      service.getTilesetDefinition("testset")
    ]);
    const repeated = await service.getTilesetDefinition("testset");

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(1);
    expect(left.tiles[0]).toMatchObject({ tileId: 0, modelResRef: "test_model" });
    expect(right.tiles[0]).toMatchObject({ tileId: 0, modelResRef: "test_model" });
    expect(repeated.tiles[0]).toMatchObject({ tileId: 0, modelResRef: "test_model" });
  });

  it("normalizes and deduplicates layered SET resrefs using deterministic Aurora source priority", async () => {
    const objects = [
      {
        key: "modules/current/__aurora/sources/vanilla/tilesets/TESTSET.SET",
        size: 101,
        etag: "vanilla"
      },
      {
        key: "modules/current/__aurora/sources/hak/z_tiles/testset.set",
        size: 202,
        etag: "hak"
      },
      {
        key: "modules/current/TestSet.set",
        size: 303,
        etag: "module"
      },
      {
        key: "modules/current/__aurora/sources/vanilla/tilesets/second.set",
        size: 404,
        etag: "second"
      }
    ];
    const moduleBlobStorage = {
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "test",
        prefix: "modules/current",
        totalFiles: objects.length,
        totalBytes: objects.reduce((sum, object) => sum + object.size, 0),
        objects: objects.slice().reverse(),
        truncated: false
      }),
      getModuleObject: jest.fn()
    } as unknown as ModuleBlobStoragePort;
    const runtimeSettingsRepository = {
      get: jest.fn().mockResolvedValue({ blobStorage: { modulePrefix: "modules/current" } })
    } as unknown as RuntimeSettingsRepositoryPort;
    const service = new AreaEditingApplicationService(
      {} as AreasApplicationService,
      moduleBlobStorage,
      runtimeSettingsRepository
    );

    await expect(service.listTilesets()).resolves.toEqual([
      {
        tilesetResRef: "second",
        sourceKey: "modules/current/__aurora/sources/vanilla/tilesets/second.set",
        sourceSize: 404,
        etag: "second"
      },
      {
        tilesetResRef: "testset",
        sourceKey: "modules/current/TestSet.set",
        sourceSize: 303,
        etag: "module"
      }
    ]);
  });
});

const tileset: AuroraTilesetEditingDefinition = {
  schemaVersion: 1,
  tilesetResRef: "testset",
  fingerprint: "a".repeat(64),
  defaults: {},
  terrainTypes: [],
  crosserTypes: [],
  transitionRules: [],
  tiles: [
    { tileId: 0, terrain: {}, crossers: {}, cornerHeights: {} },
    { tileId: 2, orientation: 0, terrain: {}, crossers: {}, cornerHeights: {}, groupId: "group0" },
    { tileId: 3, orientation: 1, terrain: {}, crossers: {}, cornerHeights: {}, groupId: "group0" }
  ],
  groups: [{ id: "group0", name: "Two tile building", rows: 1, columns: 2, tileIds: [2, 3] }],
  diagnostics: []
};

function makeDraft(
  tiles: AreaEditingExportDraftRequest["tiles"]
): AreaEditingExportDraftRequest {
  return {
    areaResRef: "area_test",
    name: "Area test",
    width: 2,
    height: 2,
    tilesetResRef: "testset",
    tilesetFingerprint: "a".repeat(64),
    tiles
  };
}

describe("AreaEditingApplicationService topology validation", () => {
  it("accepts a complete group laid out with its SET order and rotation", () => {
    const draft = makeDraft([
      { row: 0, col: 0, tileId: 2, orientation: 1, height: 0 },
      { row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 0, tileId: 3, orientation: 2, height: 0 },
      { row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
    ]);

    expect(() => __areaEditingApplicationServiceInternals.validateDraft(draft, tileset)).not.toThrow();
  });

  it("rejects a same-count group whose cells cannot be restored from the ARE tile list", () => {
    const draft = makeDraft([
      { row: 0, col: 0, tileId: 2, orientation: 1, height: 0 },
      { row: 0, col: 1, tileId: 3, orientation: 2, height: 0 },
      { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
    ]);

    expect(() => __areaEditingApplicationServiceInternals.validateDraft(draft, tileset)).toThrow(
      "complete positioned group instances"
    );
  });
});

describe("AreaEditingApplicationService safe export source contract", () => {
  function createService(objects: Array<{ key: string; size: number }>, sourceBytes?: Buffer) {
    const moduleBlobStorage = {
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "test",
        prefix: "snapshot",
        totalFiles: objects.length,
        totalBytes: objects.reduce((sum, object) => sum + object.size, 0),
        objects,
        truncated: false
      }),
      getModuleObject: jest.fn().mockResolvedValue(
        sourceBytes
          ? {
              key: "module/area_test.are",
              size: sourceBytes.length,
              contentType: "application/octet-stream",
              bytes: sourceBytes
            }
          : null
      )
    } as unknown as ModuleBlobStoragePort;
    const runtimeSettingsRepository = {
      get: jest.fn().mockResolvedValue({ blobStorage: {} })
    } as unknown as RuntimeSettingsRepositoryPort;
    const service = new AreaEditingApplicationService(
      {} as AreasApplicationService,
      moduleBlobStorage,
      runtimeSettingsRepository
    );
    jest.spyOn(service, "getTilesetDefinition").mockResolvedValue(tileset);
    return { service, moduleBlobStorage };
  }

  it("rejects an existing-area draft when its fingerprinted source ARE is missing", async () => {
    const { service, moduleBlobStorage } = createService([]);
    const draft = {
      ...makeDraft([
        { row: 0, col: 0, tileId: 0, orientation: 0, height: 0 },
        { row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
        { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
        { row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
      ]),
      areaFingerprint: "b".repeat(64)
    };

    await expect(service.exportAre(draft)).rejects.toMatchObject({
      status: 409,
      code: "AREA_SOURCE_MISSING"
    });
    expect(moduleBlobStorage.getModuleObject).not.toHaveBeenCalled();
  });

  it("rejects a new-area draft that collides with an existing ARE ResRef", async () => {
    const { service, moduleBlobStorage } = createService([
      { key: "module/area_test.are", size: 128 }
    ]);
    const draft = makeDraft([
      { row: 0, col: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
    ]);

    await expect(service.exportAre(draft)).rejects.toMatchObject({
      status: 409,
      code: "AREA_SOURCE_COLLISION"
    });
    expect(moduleBlobStorage.getModuleObject).not.toHaveBeenCalled();
  });

  it("round-trips unknown fields and struct types on every source Tile_List element", async () => {
    const sourceBytes = buildGffBuffer(
      [
        { label: "Name", type: "cexolocstring", value: { text: "Original" } },
        { label: "Tag", type: "cexostring", value: "original_tag" },
        { label: "Width", type: "dword", value: 2 },
        { label: "Height", type: "dword", value: 2 },
        { label: "Tileset", type: "resref", value: "testset" },
        {
          label: "Tile_List",
          type: "list",
          value: [0, 1, 2, 3].map((index) => ({
            typeId: 80 + index,
            fields: [
              { label: "Tile_ID", type: "dword" as const, value: 0 },
              { label: "Tile_Orientation", type: "byte" as const, value: 0 },
              { label: "Tile_Height", type: "float" as const, value: 0 },
              { label: "Tile_AnimLoop1", type: "byte" as const, value: index },
              { label: "Tile_Unknown", type: "int" as const, value: 900 + index }
            ]
          }))
        }
      ],
      "ARE ",
      51
    );
    const { service } = createService(
      [{ key: "module/area_test.are", size: sourceBytes.length }],
      sourceBytes
    );
    const draft = {
      ...makeDraft([
        { row: 0, col: 0, sourceRow: 1, sourceCol: 0, tileId: 0, orientation: 1, height: 10, animLoop1: 11 },
        { row: 0, col: 1, sourceRow: 1, sourceCol: 1, tileId: 0, orientation: 2, height: 20, animLoop1: 12 },
        { row: 1, col: 0, sourceRow: 0, sourceCol: 0, tileId: 0, orientation: 3, height: 30, animLoop1: 13 },
        { row: 1, col: 1, sourceRow: 0, sourceCol: 1, tileId: 0, orientation: 0, height: 40, animLoop1: 14 }
      ]),
      areaFingerprint: createHash("sha256").update(sourceBytes).digest("hex")
    };

    const exported = await service.exportAre(draft);
    const document = parseRawGffDocument(exported.bytes);
    expect(document?.rootStructTypeId).toBe(51);
    expect(document?.fields.find((field) => field.label === "Name")).toMatchObject({
      type: "cexolocstring",
      value: { entries: [{ languageId: 0, text: "Original" }] }
    });
    const tileList = document?.fields.find((field) => field.label === "Tile_List");
    expect(tileList).toMatchObject({ type: "list" });
    if (!tileList || tileList.type !== "list") return;
    expect(tileList.value.map((tile) => tile.typeId)).toEqual([82, 83, 80, 81]);
    expect(tileList.value.map((tile) => tile.fields.find((field) => field.label === "Tile_Unknown")?.value)).toEqual([
      902,
      903,
      900,
      901
    ]);
    expect(tileList.value.map((tile) => tile.fields.find((field) => field.label === "Tile_Orientation")?.value)).toEqual([
      1,
      2,
      3,
      0
    ]);
    expect(tileList.value.map((tile) => tile.fields.find((field) => field.label === "Tile_AnimLoop1")?.value)).toEqual([
      11,
      12,
      13,
      14
    ]);
  });

  it("rejects source provenance outside the original ARE Tile_List instead of dropping unknown fields", async () => {
    const sourceBytes = buildGffBuffer(
      [
        { label: "Width", type: "dword", value: 2 },
        { label: "Height", type: "dword", value: 2 },
        { label: "Tileset", type: "resref", value: "testset" },
        {
          label: "Tile_List",
          type: "list",
          value: [0, 1, 2, 3].map((index) => ({
            typeId: 80 + index,
            fields: [
              { label: "Tile_ID", type: "dword" as const, value: 0 },
              { label: "Tile_Unknown", type: "int" as const, value: 900 + index }
            ]
          }))
        }
      ],
      "ARE ",
      51
    );
    const { service } = createService(
      [{ key: "module/area_test.are", size: sourceBytes.length }],
      sourceBytes
    );
    const draft = {
      ...makeDraft([
        { row: 0, col: 0, sourceRow: 2, sourceCol: 0, tileId: 0, orientation: 0, height: 0 },
        { row: 0, col: 1, sourceRow: 0, sourceCol: 1, tileId: 0, orientation: 0, height: 0 },
        { row: 1, col: 0, sourceRow: 1, sourceCol: 0, tileId: 0, orientation: 0, height: 0 },
        { row: 1, col: 1, sourceRow: 1, sourceCol: 1, tileId: 0, orientation: 0, height: 0 }
      ]),
      areaFingerprint: createHash("sha256").update(sourceBytes).digest("hex")
    };

    await expect(service.exportAre(draft)).rejects.toMatchObject({
      status: 422,
      code: "INVALID_AREA_TOPOLOGY",
      message: "Tile (0,0) references missing source tile (2,0)."
    });
  });
});

describe("AreaEditingApplicationService Verify Area and New Area persistence", () => {
  const validTiles = [
    { row: 0, col: 0, tileId: 0, orientation: 0 as const, height: 2 },
    { row: 0, col: 1, tileId: 0, orientation: 0 as const, height: 2 },
    { row: 1, col: 0, tileId: 0, orientation: 0 as const, height: 3 },
    { row: 1, col: 1, tileId: 0, orientation: 0 as const, height: 3 }
  ];

  function createWritableService(options?: {
    failExtension?: string;
    deletable?: boolean;
    objects?: Array<{ key: string; size: number }>;
    moduleAreas?: string[];
    deleteReturnsFalseFor?: string;
    corruptIfoRestore?: boolean;
    corruptWrittenExtension?: string;
    dropWrittenExtension?: string;
  }) {
    const stored = new Map<string, Buffer>();
    const originalModuleIfo = buildGffBuffer(
      [
        {
          label: "Mod_Area_list",
          type: "list",
          value: (options?.moduleAreas ?? ["existing_area"]).map((areaResRef, index) => ({
            typeId: 6,
            fields: [
              { label: "Area_Name", type: "resref" as const, value: areaResRef },
              { label: "AreaCustom", type: "int" as const, value: 700 + index }
            ]
          }))
        },
        {
          label: "Mod_Description",
          type: "cexolocstring",
          value: { strRef: 0xffffffff, entries: [{ languageId: 10, text: "" }] }
        },
        { label: "Mod_CustomField", type: "cexostring", value: "preserve-module-root" },
        {
          label: "Mod_HakList",
          type: "list",
          value: [{
            typeId: 8,
            fields: [{ label: "Mod_Hak", type: "cexostring", value: "custom_hak" }]
          }]
        }
      ],
      "IFO ",
      0xffffffff
    );
    stored.set("snapshot/module.ifo", originalModuleIfo);
    const objects = [
      { key: "snapshot/module.ifo", size: originalModuleIfo.length },
      ...(options?.objects ?? [])
    ];
    let moduleIfoPutCount = 0;
    const moduleBlobStorage = {
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "test",
        prefix: "snapshot",
        totalFiles: objects.length,
        totalBytes: objects.reduce((sum, object) => sum + object.size, 0),
        objects,
        truncated: false
      }),
      getModuleObject: jest.fn().mockImplementation(async (_settings, key) => {
        const bytes = stored.get(key);
        return bytes
          ? { key, size: bytes.length, contentType: "application/octet-stream", bytes }
          : null;
      }),
      putModuleObject: jest.fn().mockImplementation(async (_settings, file) => {
        if (file.fileName.endsWith(options?.failExtension ?? "\0")) {
          throw new Error("storage failure");
        }
        const key = `snapshot/${file.fileName}`;
        if (file.fileName === "module.ifo") moduleIfoPutCount += 1;
        if (!file.fileName.endsWith(options?.dropWrittenExtension ?? "\0")) {
          stored.set(
            key,
            options?.corruptIfoRestore && file.fileName === "module.ifo" && moduleIfoPutCount > 1
              ? Buffer.from("corrupt-restored-ifo")
              : file.fileName.endsWith(options?.corruptWrittenExtension ?? "\0")
                ? Buffer.from(`corrupt-${file.fileName}`)
                : file.bytes
          );
        }
        return { key, size: file.bytes.length, etag: "stored-etag" };
      }),
      ...(options?.deletable === false
        ? {}
        : {
            deleteModuleObject: jest.fn().mockImplementation(async (_settings, key) => {
              if (key.endsWith(options?.deleteReturnsFalseFor ?? "\0")) return false;
              stored.delete(key);
              return true;
            })
          })
    } as unknown as ModuleBlobStoragePort;
    const runtimeSettingsRepository = {
      get: jest.fn().mockResolvedValue({ blobStorage: { modulePrefix: "snapshot" } })
    } as unknown as RuntimeSettingsRepositoryPort;
    const service = new AreaEditingApplicationService(
      {} as AreasApplicationService,
      moduleBlobStorage,
      runtimeSettingsRepository
    );
    jest.spyOn(service, "getTilesetDefinition").mockResolvedValue({
      ...tileset,
      tiles: tileset.tiles.map((tile) =>
        tile.tileId === 0 ? { ...tile, modelResRef: "test_tile" } : tile
      )
    });
    return { service, moduleBlobStorage, stored, originalModuleIfo };
  }

  it("reports useful stats and all independently detectable tile issues", async () => {
    const { service } = createWritableService();
    const report = await service.verifyArea({
      ...makeDraft([
        { row: 0, col: 0, tileId: 999, orientation: 0, height: 1 },
        { row: 0, col: 0, tileId: 0, orientation: 0, height: 2 },
        { row: 1, col: 0, tileId: 2, orientation: 0, height: 3 },
        { row: 1, col: 1, tileId: 0, orientation: 0, height: 4 }
      ]),
      tilesetFingerprint: "a".repeat(64)
    });

    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["UNKNOWN_TILE_ID", "DUPLICATE_TILE_CELL", "INCOMPLETE_GROUP_INSTANCE"])
    );
    expect(report.stats).toMatchObject({
      expectedTileCount: 4,
      tileCount: 4,
      uniqueTileIds: 3,
      groupTileCount: 1,
      modelResolvedTileCount: 2,
      minHeight: 1,
      maxHeight: 4
    });
  });

  it("persists a new parseable ARE/GIT/GIC triplet and losslessly registers it in module.ifo", async () => {
    const { service, moduleBlobStorage, stored, originalModuleIfo } = createWritableService();
    const result = await service.persistNewArea({
      ...makeDraft(validTiles),
      tilesetFingerprint: "a".repeat(64)
    });

    expect(result).toMatchObject({ areaResRef: "area_test", created: true });
    expect(result.resources.map((resource) => resource.extension)).toEqual(["are", "git", "gic"]);
    expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledTimes(4);
    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledTimes(5);
    expect(moduleBlobStorage.getModuleObject).toHaveBeenNthCalledWith(
      2,
      { modulePrefix: "snapshot" },
      "snapshot/module.ifo"
    );
    expect(moduleBlobStorage.getModuleObject).toHaveBeenNthCalledWith(
      5,
      { modulePrefix: "snapshot" },
      "snapshot/area_test.gic"
    );
    expect(parseRawGffDocument(stored.get("snapshot/area_test.are")!)).toMatchObject({ fileType: "ARE " });
    const git = parseRawGffDocument(stored.get("snapshot/area_test.git")!);
    expect(git).toMatchObject({ fileType: "GIT " });
    expect(git?.fields.map((field) => field.label)).toEqual(expect.arrayContaining([
      "Creature List",
      "Door List",
      "Encounter List",
      "ItemList",
      "Placeable List",
      "SoundList",
      "StoreList",
      "TriggerList",
      "WaypointList",
      "AreaProperties"
    ]));
    expect(parseRawGffDocument(stored.get("snapshot/area_test.gic")!)).toMatchObject({ fileType: "GIC " });
    expect(result.moduleIfo).toMatchObject({
      key: "snapshot/module.ifo",
      areaCount: 2
    });
    const moduleIfo = parseRawGffDocument(stored.get("snapshot/module.ifo")!);
    const originalParsedModuleIfo = parseRawGffDocument(originalModuleIfo);
    expect(moduleIfo).toMatchObject({ fileType: "IFO ", rootStructTypeId: 0xffffffff });
    expect(moduleIfo?.fields[0]?.label).toBe("Mod_Area_list");
    expect(moduleIfo?.fields.find((field) => field.label === "Mod_CustomField")).toEqual({
      label: "Mod_CustomField",
      type: "cexostring",
      value: "preserve-module-root"
    });
    expect(moduleIfo?.fields.find((field) => field.label === "Mod_Description")).toEqual({
      label: "Mod_Description",
      type: "cexolocstring",
      value: { strRef: 0xffffffff, entries: [{ languageId: 10, text: "" }] }
    });
    const areaList = moduleIfo?.fields.find((field) => field.label === "Mod_Area_list");
    expect(areaList).toMatchObject({ type: "list" });
    if (!areaList || areaList.type !== "list") return;
    expect(areaList.value.map((entry) => entry.typeId)).toEqual([6, 6]);
    expect(areaList.value.map((entry) =>
      entry.fields.find((field) => field.label === "Area_Name")?.value
    )).toEqual(["existing_area", "area_test"]);
    expect(areaList.value[0].fields).toContainEqual({
      label: "AreaCustom",
      type: "int",
      value: 700
    });
    expect(moduleIfo?.fields.find((field) => field.label === "Mod_HakList")).toMatchObject({
      type: "list",
      value: [{ typeId: 8, fields: [{ label: "Mod_Hak", type: "cexostring", value: "custom_hak" }] }]
    });
    if (!moduleIfo || !originalParsedModuleIfo) return;
    const patchedWithoutNewArea = moduleIfo.fields.map((field) =>
      field.label === "Mod_Area_list" && field.type === "list"
        ? {
            ...field,
            value: field.value.filter((entry) =>
              entry.fields.every(
                (child) => child.label !== "Area_Name" || child.value !== "area_test"
              )
            )
          }
        : field
    );
    const sortRootOnly = <T extends { label: string; type: string }>(fields: T[]) =>
      fields.slice().sort((left, right) =>
        left.label.localeCompare(right.label) || left.type.localeCompare(right.type)
      );
    // Canonical rebuild deliberately changes only root field order/table
    // offsets; all values, nested field order and struct type IDs stay equal.
    expect(sortRootOnly(patchedWithoutNewArea)).toEqual(
      sortRootOnly(originalParsedModuleIfo.fields)
    );
  });

  it("rolls back partial writes when a companion resource fails", async () => {
    const { service, moduleBlobStorage, stored, originalModuleIfo } = createWritableService({ failExtension: ".git" });
    await expect(
      service.persistNewArea({
        ...makeDraft(validTiles),
        tilesetFingerprint: "a".repeat(64)
      })
    ).rejects.toThrow("storage failure");
    expect(moduleBlobStorage.deleteModuleObject).toHaveBeenCalledWith(
      { modulePrefix: "snapshot" },
      "snapshot/area_test.are"
    );
    expect(stored.has("snapshot/area_test.are")).toBe(false);
    expect(stored.has("snapshot/area_test.git")).toBe(false);
    expect(stored.has("snapshot/area_test.gic")).toBe(false);
    expect(stored.get("snapshot/module.ifo")).toEqual(originalModuleIfo);
    expect(moduleBlobStorage.putModuleObject).toHaveBeenLastCalledWith(
      { modulePrefix: "snapshot" },
      expect.objectContaining({ fileName: "module.ifo", resourceType: 2014, bytes: originalModuleIfo })
    );
  });

  it("rolls back all resources when durable read-back detects silently corrupted bytes", async () => {
    const { service, stored, originalModuleIfo } = createWritableService({
      corruptWrittenExtension: ".git"
    });
    await expect(
      service.persistNewArea({
        ...makeDraft(validTiles),
        tilesetFingerprint: "a".repeat(64)
      })
    ).rejects.toMatchObject({ code: "AREA_PERSISTENCE_VERIFICATION_FAILED" });
    expect(stored.has("snapshot/area_test.are")).toBe(false);
    expect(stored.has("snapshot/area_test.git")).toBe(false);
    expect(stored.has("snapshot/area_test.gic")).toBe(false);
    expect(stored.get("snapshot/module.ifo")).toEqual(originalModuleIfo);
  });

  it("rolls back all resources when durable read-back detects a silently missing write", async () => {
    const { service, stored, originalModuleIfo } = createWritableService({
      dropWrittenExtension: ".gic"
    });
    await expect(
      service.persistNewArea({
        ...makeDraft(validTiles),
        tilesetFingerprint: "a".repeat(64)
      })
    ).rejects.toMatchObject({ code: "AREA_PERSISTENCE_VERIFICATION_FAILED" });
    expect(stored.has("snapshot/area_test.are")).toBe(false);
    expect(stored.has("snapshot/area_test.git")).toBe(false);
    expect(stored.has("snapshot/area_test.gic")).toBe(false);
    expect(stored.get("snapshot/module.ifo")).toEqual(originalModuleIfo);
  });

  it("keeps rollback failure authoritative after read-back verification fails", async () => {
    const { service, stored } = createWritableService({
      corruptWrittenExtension: ".git",
      deleteReturnsFalseFor: ".are"
    });
    await expect(
      service.persistNewArea({
        ...makeDraft(validTiles),
        tilesetFingerprint: "a".repeat(64)
      })
    ).rejects.toMatchObject({ code: "AREA_PERSISTENCE_ROLLBACK_FAILED" });
    expect(stored.has("snapshot/area_test.are")).toBe(true);
  });

  it("reports named rollback failure when deletion returns false for a confirmed write", async () => {
    const { service, stored } = createWritableService({
      failExtension: ".git",
      deleteReturnsFalseFor: ".are"
    });
    await expect(
      service.persistNewArea({
        ...makeDraft(validTiles),
        tilesetFingerprint: "a".repeat(64)
      })
    ).rejects.toMatchObject({ code: "AREA_PERSISTENCE_ROLLBACK_FAILED" });
    expect(stored.has("snapshot/area_test.are")).toBe(true);
  });

  it("reports named rollback failure when restored module.ifo bytes fail read-back equality", async () => {
    const { service, stored, originalModuleIfo } = createWritableService({
      failExtension: ".git",
      corruptIfoRestore: true
    });
    await expect(
      service.persistNewArea({
        ...makeDraft(validTiles),
        tilesetFingerprint: "a".repeat(64)
      })
    ).rejects.toMatchObject({ code: "AREA_PERSISTENCE_ROLLBACK_FAILED" });
    expect(stored.get("snapshot/module.ifo")).not.toEqual(originalModuleIfo);
  });

  it("rejects a duplicate Mod_Area_list ResRef before changing module.ifo or creating resources", async () => {
    const { service, moduleBlobStorage, originalModuleIfo, stored } = createWritableService({
      moduleAreas: ["existing_area", "AREA_TEST"]
    });
    await expect(
      service.persistNewArea({
        ...makeDraft(validTiles),
        tilesetFingerprint: "a".repeat(64)
      })
    ).rejects.toMatchObject({ code: "MODULE_IFO_AREA_DUPLICATE" });
    expect(moduleBlobStorage.putModuleObject).not.toHaveBeenCalled();
    expect(stored.get("snapshot/module.ifo")).toEqual(originalModuleIfo);
  });

  it("rejects a companion GIT/GIC collision before writing any resource", async () => {
    const { service, moduleBlobStorage } = createWritableService({
      objects: [{ key: "snapshot/area_test.gic", size: 64 }]
    });
    await expect(
      service.persistNewArea({
        ...makeDraft(validTiles),
        tilesetFingerprint: "a".repeat(64)
      })
    ).rejects.toMatchObject({ code: "AREA_RESOURCE_COLLISION" });
    expect(moduleBlobStorage.putModuleObject).not.toHaveBeenCalled();
  });

  it("refuses multi-resource persistence when rollback is unavailable", async () => {
    const { service, moduleBlobStorage } = createWritableService({ deletable: false });
    await expect(
      service.persistNewArea({
        ...makeDraft(validTiles),
        tilesetFingerprint: "a".repeat(64)
      })
    ).rejects.toMatchObject({ code: "MODULE_SNAPSHOT_WRITE_UNAVAILABLE" });
    expect(moduleBlobStorage.putModuleObject).not.toHaveBeenCalled();
  });
});
