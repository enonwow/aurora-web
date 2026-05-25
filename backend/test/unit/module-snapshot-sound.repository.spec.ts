import { ModuleSnapshotSoundRepository } from "../../src/modules/sounds/adapters/outbound/blob/module-snapshot-sound.repository";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";

describe("ModuleSnapshotSoundRepository", () => {
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
            includeHaks: true,
            includeVanilla: false,
            hakProfileId: "lc_audio",
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
        totalBytes: 170000,
        truncated: false,
        continuationToken: undefined,
        objects: [
          {
            key: "modules/current/audio/music/mus_city_theme.bmu",
            size: 96000,
            lastModified: "2026-05-24T10:00:00.000Z",
            etag: "m1"
          },
          {
            key: "modules/current/audio/ambient/amb_market_day.ogg",
            size: 42000,
            lastModified: "2026-05-24T11:00:00.000Z",
            etag: "a1"
          },
          {
            key: "modules/current/audio/effects/door_creak.ogg",
            size: 8000,
            lastModified: "2026-05-24T12:00:00.000Z",
            etag: "e1"
          },
          {
            key: "modules/current/audio/effects/door_creak.wav",
            size: 24000,
            lastModified: "2026-05-24T12:10:00.000Z",
            etag: "e2"
          }
        ]
      })
    };
  }

  it("builds sounds list from module snapshot objects", async () => {
    const runtimeSettings = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const repository = new ModuleSnapshotSoundRepository(runtimeSettings, moduleBlobStorage);

    const result = await repository.list({
      limit: 50,
      offset: 0
    });

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(3);
    expect(result.items.map((item) => item.soundId)).toEqual([
      "sound_amb_market_day",
      "sound_door_creak",
      "sound_mus_city_theme"
    ]);
  });

  it("classifies sound category and supports filtering", async () => {
    const runtimeSettings = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const repository = new ModuleSnapshotSoundRepository(runtimeSettings, moduleBlobStorage);

    const music = await repository.list({
      category: "music",
      limit: 20,
      offset: 0
    });
    expect(music.total).toBe(1);
    expect(music.items[0].soundId).toBe("sound_mus_city_theme");
  });

  it("findById returns a mapped record", async () => {
    const runtimeSettings = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const repository = new ModuleSnapshotSoundRepository(runtimeSettings, moduleBlobStorage);

    const sound = await repository.findById("sound_door_creak");
    expect(sound).not.toBeNull();
    expect(sound?.format).toBe("wav");
    expect(sound?.category).toBe("effect");
    expect(sound?.spatialMode).toBe("3d");
  });

  it("provides precomputed processing cache key", async () => {
    const runtimeSettings = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const repository = new ModuleSnapshotSoundRepository(runtimeSettings, moduleBlobStorage);

    const precomputed = await repository.getPrecomputedSoundProcessing?.("sound_amb_market_day");
    expect(precomputed).not.toBeNull();
    expect(precomputed?.cacheKey).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/u));
  });
});
