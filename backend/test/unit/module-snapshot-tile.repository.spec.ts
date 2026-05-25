import { ModuleSnapshotTileRepository } from "../../src/modules/tiles/adapters/outbound/blob/module-snapshot-tile.repository";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";

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
});
