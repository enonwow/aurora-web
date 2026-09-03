import { ModuleSnapshotTileRepository } from "../../src/modules/tiles/adapters/outbound/blob/module-snapshot-tile.repository";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../../src/modules/runtime-settings/domain/derived-asset-versions";

describe("ModuleSnapshotTileRepository", () => {
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

  function createModuleBlobStorage(): jest.Mocked<ModuleBlobStoragePort> {
    return {
      replaceModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-v1",
        totalFiles: 4,
        totalBytes: 2200,
        truncated: false,
        continuationToken: undefined,
        objects: [
          {
            key: "modules/current/tiles/tcn01_city_street.mdl",
            size: 1000,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "t1"
          },
          {
            key: "modules/current/tiles/tdn01_blocked.wok",
            size: 700,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "t2"
          },
          {
            key: "modules/current/tiles/tss01_swamp_water.set",
            size: 500,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "t3"
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

  it("lists and resolves tiles from module snapshot", async () => {
    const repository = new ModuleSnapshotTileRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage()
    );

    const list = await repository.list({
      limit: 20,
      offset: 0
    });
    expect(list.total).toBe(3);
    expect(list.items.some((item) => item.walkmesh === "water")).toBe(true);
    expect(list.items.some((item) => item.walkmesh === "blocked")).toBe(true);

    const first = list.items[0];
    await expect(repository.findById(first.tileId)).resolves.toMatchObject({
      tileId: first.tileId
    });
    expect(repository.getPrecomputedTileProcessing(first.tileId)).toEqual({
      cacheKey: expect.stringMatching(/^[a-f0-9]{64}$/u)
    });
  });

  it("supports variant and walkmesh filtering", async () => {
    const repository = new ModuleSnapshotTileRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage()
    );

    const waterOnly = await repository.list({
      walkmesh: "water",
      variant: "swamp",
      limit: 20,
      offset: 0
    });

    expect(waterOnly.total).toBe(1);
    expect(waterOnly.items[0]).toMatchObject({
      walkmesh: "water"
    });
  });

  it("indexes legacy transition tile models synced from a HAK", async () => {
    const moduleBlobStorage = createModuleBlobStorage();
    moduleBlobStorage.listModuleSnapshot.mockResolvedValueOnce({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "legacy-transition-v1",
      totalFiles: 2,
      totalBytes: 1200,
      truncated: false,
      continuationToken: undefined,
      objects: [
        {
          key: "modules/current/__aurora/sources/tiles/hak/lc_legacy_tiles/gi_a01_01.mdl",
          size: 1000,
          lastModified: "2026-07-18T13:00:00.000Z",
          etag: "legacy-mdl"
        },
        {
          key: "modules/current/__aurora/sources/tiles/hak/lc_legacy_tiles/gi_a01_01.wok",
          size: 200,
          lastModified: "2026-07-18T13:00:00.000Z",
          etag: "legacy-wok"
        }
      ]
    });
    const repository = new ModuleSnapshotTileRepository(
      createRuntimeSettingsRepository(),
      moduleBlobStorage
    );

    await expect(repository.findById("tile_gi_a01_01")).resolves.toMatchObject({
      resref: "gi_a01_01",
      sourceAssetExtension: "mdl"
    });
  });

  it("falls back to static repository when no tile candidates found", async () => {
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
    const repository = new ModuleSnapshotTileRepository(runtimeSettings, moduleBlobStorage);

    const list = await repository.list({
      limit: 20,
      offset: 0
    });
    expect(list.total).toBeGreaterThan(0);
  });

  it.each([
    ["old-first", false],
    ["current-first", true]
  ])(
    "prefers the current versioned derived model over a larger obsolete model (%s)",
    async (_label, currentFirst) => {
      const moduleBlobStorage = createModuleBlobStorage();
      const currentVersionSegment = AURORA_MDL_TO_GLB_CONVERTER_VERSION.replace(
        /[^a-zA-Z0-9._-]+/gu,
        "_"
      );
      const source = {
        key: "modules/current/__aurora/sources/vanilla/models/tdc01_p11_01.mdl",
        size: 109490,
        lastModified: "2026-07-19T01:00:00.000Z",
        etag: "source"
      };
      const obsolete = {
        key: "modules/current/__aurora/derived/models/aurora-mdl-to-glb_v17/tdc01_p11_01.glb",
        size: 900000,
        lastModified: "2026-07-19T01:01:00.000Z",
        etag: "obsolete"
      };
      const current = {
        key: `modules/current/__aurora/derived/models/${currentVersionSegment}/tdc01_p11_01.glb`,
        size: 156896,
        lastModified: "2026-07-19T01:02:00.000Z",
        etag: "current"
      };
      moduleBlobStorage.listModuleSnapshot.mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "version-choice-v1",
        totalFiles: 3,
        totalBytes: source.size + obsolete.size + current.size,
        truncated: false,
        continuationToken: undefined,
        objects: [
          source,
          ...(currentFirst ? [current, obsolete] : [obsolete, current])
        ]
      });
      const repository = new ModuleSnapshotTileRepository(
        createRuntimeSettingsRepository(),
        moduleBlobStorage
      );

      await expect(repository.findById("tile_tdc01_p11_01")).resolves.toMatchObject({
        renderModelObjectKey: current.key,
        renderModelSizeBytes: current.size,
        renderModelEtag: current.etag
      });
    }
  );
});
