import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Logger } from "@nestjs/common";
import {
  RuntimeSettingsApplicationService,
  resolveHakSettingsByAsset
} from "../../src/modules/runtime-settings/application/runtime-settings.application.service";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { PackedModuleExtractorPort } from "../../src/modules/runtime-settings/application/ports/packed-module-extractor.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { RuntimeSettingsRecord } from "../../src/modules/runtime-settings/domain/runtime-settings.types";

const POC_PATHS = {
  vanillaDataPath:
    "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data",
  hakDirectoryPath: "C:/Users/enonw/Documents/Neverwinter Nights/hak",
  moduleDecompiledPath:
    "C:/Users/enonw/Documents/Neverwinter Nights/LC-Decompiled/temp0",
  modulePackedPath: "C:/Users/enonw/Documents/Neverwinter Nights/modules/the_last_city.mod",
  tlkBasePath:
    "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/lang/en/data/dialog.tlk",
  tlkCustomPath: ""
} as const;

describe("RuntimeSettingsApplicationService", () => {
  let repository: jest.Mocked<RuntimeSettingsRepositoryPort>;
  let packedModuleExtractor: jest.Mocked<PackedModuleExtractorPort>;
  let moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort>;
  let service: RuntimeSettingsApplicationService;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      save: jest.fn()
    };
    packedModuleExtractor = {
      extractFromPackedModule: jest.fn()
    };
    moduleBlobStorage = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    service = new RuntimeSettingsApplicationService(
      repository,
      packedModuleExtractor,
      moduleBlobStorage
    );
  });

  it("returns runtime settings from repository", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);

    const response = await service.getRuntimeSettings();

    expect(repository.get).toHaveBeenCalledTimes(1);
    expect(response).toEqual(current);
  });

  it("replaces settings and bumps revision metadata", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    repository.save.mockResolvedValue();

    const {
      revision: _revision,
      updatedAt: _updatedAt,
      updatedBy: _updatedBy,
      ...basePayload
    } = current;
    const nextPayload = {
      ...basePayload,
      telemetryDebugMode: "basic" as const
    };

    const saved = await service.replaceRuntimeSettings(nextPayload, "admin.user");

    expect(saved.revision).toBe(current.revision + 1);
    expect(saved.updatedBy).toBe("admin.user");
    expect(saved.telemetryDebugMode).toBe("basic");
    expect(saved.updatedAt).toEqual(expect.any(String));
    expect(repository.save).toHaveBeenCalledWith(saved);
  });

  it("returns resolved hak settings by source", async () => {
    const current = buildSettingsRecord();
    current.sources.placeable.hakProfileId = "lc_models";
    current.sources.tile.hakPriorityList = ["custom_tiles.hak", "custom_tiles.hak"];
    current.sources.sound.includeHaks = false;
    repository.get.mockResolvedValue(current);

    const resolved = await service.getResolvedHakSettings();

    expect(resolved.placeable.mode).toBe("profile");
    expect(resolved.placeable.hakPriorityList).toEqual([
      "lc_placeables.hak",
      "lc_creatures.hak"
    ]);
    expect(resolved.tile.mode).toBe("inline");
    expect(resolved.tile.hakPriorityList).toEqual(["custom_tiles.hak"]);
    expect(resolved.sound.mode).toBe("disabled");
    expect(resolved.sound.hakPriorityList).toEqual([]);
  });

  it("resolves profile and absolute hak entries into hak paths", () => {
    const current = buildSettingsRecord();
    current.paths.hakDirectoryPath = POC_PATHS.hakDirectoryPath;
    current.sources.area.hakProfileId = "mixed";
    current.hakProfiles.mixed = ["relative/one.hak", "D:/external/two.hak"];

    const resolved = resolveHakSettingsByAsset(current);

    expect(resolved.area.hakPaths).toEqual([
      "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\hak\\relative\\one.hak",
      "D:/external/two.hak"
    ]);
  });

  it("returns module cache summary from blob storage", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-v1",
      totalFiles: 2,
      totalBytes: 42,
      objects: [
        {
          key: "modules/current/module.ifo",
          size: 10
        },
        {
          key: "modules/current/areas/test.are",
          size: 32
        }
      ],
      truncated: false
    });

    const summary = await service.getModuleBlobCacheSummary(200);

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledWith(
      current.blobStorage,
      { limit: 200 }
    );
    expect(summary.totalFiles).toBe(2);
    expect(summary.moduleHash).toBe("hash-v1");
  });

  it("returns texture index metadata and supports case-insensitive resref query", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/__aurora/meta/texture-index.v1.json",
      size: 123,
      contentType: "application/json",
      bytes: Buffer.from(
        JSON.stringify({
          version: "texture-index/v1",
          generatedAt: "2026-05-25T12:00:00.000Z",
          settingsRevision: 7,
          modulePrefix: "modules/current/",
          totalTextures: 3,
          totalBytes: 30,
          entries: [
            {
              textureId: "id-module",
              resref: "M_Module",
              extension: "dds",
              objectKey: "modules/current/textures/m_module.dds",
              sizeBytes: 10,
              sha256: "a".repeat(64),
              source: "module",
              sourcePath: "textures/m_module.dds"
            },
            {
              textureId: "id-hak",
              resref: "h_fire",
              extension: "dds",
              objectKey: "modules/current/__aurora/sources/hak/lc_core/h_fire.dds",
              sizeBytes: 9,
              sha256: "b".repeat(64),
              source: "hak",
              sourcePath: "lc_core.hak"
            },
            {
              textureId: "id-vanilla",
              resref: "v_stone",
              extension: "tga",
              objectKey: "modules/current/__aurora/sources/vanilla/textures/v_stone.tga",
              sizeBytes: 11,
              sha256: "c".repeat(64),
              source: "vanilla",
              sourcePath: "textures/v_stone.tga"
            }
          ],
          byResref: {}
        }),
        "utf-8"
      )
    });

    const summary = await service.getTextureIndexMetadataSummary();
    const filtered = await service.queryTextureIndex({
      resref: "M_MODULE",
      limit: 50,
      offset: 0
    });
    const paged = await service.queryTextureIndex({
      limit: 1,
      offset: 1
    });

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      current.blobStorage,
      "modules/current/__aurora/meta/texture-index.v1.json"
    );
    expect(summary).toEqual({
      indexObjectKey: "modules/current/__aurora/meta/texture-index.v1.json",
      available: true,
      version: "texture-index/v1",
      generatedAt: "2026-05-25T12:00:00.000Z",
      settingsRevision: 7,
      modulePrefix: "modules/current/",
      totalTextures: 3,
      totalBytes: 30
    });
    expect(filtered.available).toBe(true);
    expect(filtered.totalEntries).toBe(1);
    expect(filtered.entries).toHaveLength(1);
    expect(filtered.entries[0]!.resref).toBe("M_Module");
    expect(filtered.query.resref).toBe("m_module");
    expect(paged.totalEntries).toBe(3);
    expect(paged.entries).toHaveLength(1);
    expect(paged.entries[0]!.resref).toBe("h_fire");
  });

  it("returns empty texture index response when index object does not exist", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);

    const summary = await service.getTextureIndexMetadataSummary();
    const query = await service.queryTextureIndex({ resref: "missing", limit: 20, offset: 0 });

    expect(summary).toEqual({
      indexObjectKey: "modules/current/__aurora/meta/texture-index.v1.json",
      available: false
    });
    expect(query.available).toBe(false);
    expect(query.totalEntries).toBe(0);
    expect(query.entries).toEqual([]);
  });

  it("falls back to unavailable texture index when payload contains invalid json", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/__aurora/meta/texture-index.v1.json",
      size: 1,
      contentType: "application/json",
      bytes: Buffer.from("{", "utf-8")
    });

    const summary = await service.getTextureIndexMetadataSummary();
    const query = await service.queryTextureIndex({ limit: 10, offset: 0 });

    expect(summary).toEqual({
      indexObjectKey: "modules/current/__aurora/meta/texture-index.v1.json",
      available: false
    });
    expect(query.available).toBe(false);
    expect(query.totalEntries).toBe(0);
    expect(query.entries).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Texture index payload is malformed JSON; falling back to unavailable index.")
    );
    warnSpy.mockRestore();
  });

  it("falls back to unavailable texture index when payload has invalid schema", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/__aurora/meta/texture-index.v1.json",
      size: 64,
      contentType: "application/json",
      bytes: Buffer.from(
        JSON.stringify({
          version: "texture-index/v1",
          generatedAt: "2026-05-25T12:00:00.000Z",
          settingsRevision: 7,
          modulePrefix: "modules/current/",
          totalTextures: 1,
          totalBytes: 10,
          entries: [
            {
              textureId: "id-module",
              resref: "m_module",
              extension: "dds",
              objectKey: "modules/current/textures/m_module.dds",
              sizeBytes: "invalid-size",
              sha256: "a".repeat(64),
              source: "module",
              sourcePath: "textures/m_module.dds"
            }
          ]
        }),
        "utf-8"
      )
    });

    const summary = await service.getTextureIndexMetadataSummary();
    const query = await service.queryTextureIndex({ limit: 10, offset: 0 });

    expect(summary).toEqual({
      indexObjectKey: "modules/current/__aurora/meta/texture-index.v1.json",
      available: false
    });
    expect(query.available).toBe(false);
    expect(query.totalEntries).toBe(0);
    expect(query.entries).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Texture index payload has invalid schema; falling back to unavailable index.")
    );
    warnSpy.mockRestore();
  });

  it("rebuilds module cache from decompiled directory when path is configured", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-cache-"));
    const nestedDir = join(tempRoot, "areas");
    await mkdir(nestedDir, { recursive: true });
    await writeFile(join(tempRoot, "module.ifo"), "ifo", "utf-8");
    await writeFile(join(nestedDir, "test.are"), "are", "utf-8");

    try {
      const current = buildSettingsRecord();
      current.paths.moduleDecompiledPath = tempRoot;
      current.paths.modulePackedPath = "C:/ignored.mod";
      repository.get.mockResolvedValue(current);
      moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-new",
        previousModuleHash: "hash-old",
        status: "updated",
        uploadedFiles: 2,
        uploadedBytes: 6,
        deletedFiles: 0,
        deletedBytes: 0,
        unchangedFiles: 0,
        totalFiles: 2
      });

      const result = await service.rebuildModuleBlobCache("admin.user");

      expect(result.mode).toBe("incremental");
      expect(result.source.type).toBe("decompiled");
      expect(result.sync.uploadedFiles).toBe(2);
      expect(moduleBlobStorage.replaceModuleSnapshot).toHaveBeenCalledWith(
        current.blobStorage,
        expect.arrayContaining([
          expect.objectContaining({ fileName: "module.ifo" }),
          expect.objectContaining({ fileName: "areas/test.are" })
        ]),
        { forceFull: false }
      );
      expect(packedModuleExtractor.extractFromPackedModule).not.toHaveBeenCalled();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("rebuilds module cache from packed module when decompiled path is empty", async () => {
    const current = buildSettingsRecord();
    current.paths.moduleDecompiledPath = "";
    current.paths.modulePackedPath = "C:/modules/the_last_city.mod";
    repository.get.mockResolvedValue(current);
    packedModuleExtractor.extractFromPackedModule.mockResolvedValue([
      {
        fileName: "module.ifo",
        resourceType: 2014,
        bytes: Buffer.from("ifo")
      }
    ]);
    moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-new",
      previousModuleHash: "hash-old",
      status: "updated",
      uploadedFiles: 1,
      uploadedBytes: 3,
      deletedFiles: 0,
      deletedBytes: 0,
      unchangedFiles: 0,
      totalFiles: 1
    });

    const result = await service.rebuildModuleBlobCache("admin.user");

    expect(result.mode).toBe("incremental");
    expect(result.source.type).toBe("packed");
    expect(packedModuleExtractor.extractFromPackedModule).toHaveBeenCalledWith(
      "C:/modules/the_last_city.mod"
    );
    expect(moduleBlobStorage.replaceModuleSnapshot).toHaveBeenCalledWith(
      current.blobStorage,
      expect.arrayContaining([expect.objectContaining({ fileName: "module.ifo" })]),
      { forceFull: false }
    );
  });

  it("supports full mode sync when rebuild is forced", async () => {
    const current = buildSettingsRecord();
    current.paths.moduleDecompiledPath = "";
    current.paths.modulePackedPath = "C:/modules/the_last_city.mod";
    repository.get.mockResolvedValue(current);
    packedModuleExtractor.extractFromPackedModule.mockResolvedValue([
      {
        fileName: "module.ifo",
        resourceType: 2014,
        bytes: Buffer.from("ifo")
      }
    ]);
    moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-new",
      previousModuleHash: "hash-old",
      status: "updated",
      uploadedFiles: 1,
      uploadedBytes: 3,
      deletedFiles: 2,
      deletedBytes: 64,
      unchangedFiles: 0,
      totalFiles: 1
    });

    const result = await service.rebuildModuleBlobCache("admin.user", {
      forceFull: true
    });

    expect(result.mode).toBe("full");
    expect(moduleBlobStorage.replaceModuleSnapshot).toHaveBeenCalledWith(
      current.blobStorage,
      expect.arrayContaining([expect.objectContaining({ fileName: "module.ifo" })]),
      { forceFull: true }
    );
  });

  it("syncs hak and vanilla textures and writes texture index metadata", async () => {
    const moduleRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-module-"));
    const hakRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-haks-"));
    const vanillaRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-vanilla-"));
    const hakPath = join(hakRoot, "lc_core.hak");
    await mkdir(join(moduleRoot, "textures"), { recursive: true });
    await mkdir(join(vanillaRoot, "textures", "city"), { recursive: true });
    await writeFile(join(moduleRoot, "module.ifo"), "ifo", "utf-8");
    await writeFile(join(moduleRoot, "textures", "m_module.dds"), Buffer.from([1, 2, 3]));
    await writeFile(hakPath, "hak", "utf-8");
    await writeFile(
      join(vanillaRoot, "textures", "city", "v_stone.tga"),
      Buffer.from([4, 5])
    );

    try {
      const current = buildSettingsRecord();
      current.paths.moduleDecompiledPath = moduleRoot;
      current.paths.modulePackedPath = "";
      current.paths.hakDirectoryPath = hakRoot;
      current.paths.vanillaDataPath = vanillaRoot;
      repository.get.mockResolvedValue(current);
      packedModuleExtractor.extractFromPackedModule.mockImplementation(
        async (modulePackedPath) => {
          if (modulePackedPath !== hakPath) {
            throw new Error(`Unexpected packed source: ${modulePackedPath}`);
          }
          return [
            {
              fileName: "h_fire.dds",
              resourceType: 2033,
              bytes: Buffer.from([7, 8, 9])
            },
            {
              fileName: "readme.txt",
              resourceType: 10,
              bytes: Buffer.from("ignored", "utf-8")
            }
          ];
        }
      );
      moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-new",
        previousModuleHash: "hash-old",
        status: "updated",
        uploadedFiles: 6,
        uploadedBytes: 1000,
        deletedFiles: 0,
        deletedBytes: 0,
        unchangedFiles: 0,
        totalFiles: 6
      });

      const result = await service.syncModuleBlobCache("admin.user");

      expect(packedModuleExtractor.extractFromPackedModule).toHaveBeenCalledWith(hakPath);
      expect(moduleBlobStorage.replaceModuleSnapshot).toHaveBeenCalledTimes(1);
      const uploadedFiles = moduleBlobStorage.replaceModuleSnapshot.mock.calls[0]![1];
      const uploadedNames = uploadedFiles.map((entry) => entry.fileName);
      expect(uploadedNames).toEqual(
        expect.arrayContaining([
          "module.ifo",
          "textures/m_module.dds",
          "__aurora/sources/hak/lc_core/h_fire.dds",
          "__aurora/sources/vanilla/textures/city/v_stone.tga",
          "__aurora/meta/texture-index.v1.json"
        ])
      );

      const textureIndexFile = uploadedFiles.find(
        (entry) => entry.fileName === "__aurora/meta/texture-index.v1.json"
      );
      expect(textureIndexFile).toBeDefined();
      const parsed = JSON.parse(
        textureIndexFile!.bytes.toString("utf-8")
      ) as {
        totalTextures: number;
        entries: Array<{ source: string; resref: string; objectKey: string }>;
        byResref: Record<string, Array<{ source: string }>>;
      };

      expect(parsed.totalTextures).toBe(3);
      expect(parsed.entries.map((entry) => entry.source).sort()).toEqual([
        "hak",
        "module",
        "vanilla"
      ]);
      expect(parsed.byResref["m_module"]![0]!.source).toBe("module");
      expect(parsed.byResref["h_fire"]![0]!.source).toBe("hak");
      expect(parsed.byResref["v_stone"]![0]!.source).toBe("vanilla");
      expect(parsed.entries.every((entry) => entry.objectKey.startsWith("modules/current/"))).toBe(
        true
      );

      expect(result.textures.uploadedTextureFiles).toBe(3);
      expect(result.textures.uploadedTextureBytes).toBe(8);
      expect(result.textures.moduleTextures).toBe(1);
      expect(result.textures.hakTextures).toBe(1);
      expect(result.textures.vanillaTextures).toBe(1);
      expect(result.textures.textureIndexObjectKey).toBe(
        "modules/current/__aurora/meta/texture-index.v1.json"
      );
    } finally {
      await rm(moduleRoot, { recursive: true, force: true });
      await rm(hakRoot, { recursive: true, force: true });
      await rm(vanillaRoot, { recursive: true, force: true });
    }
  });
});

function buildSettingsRecord(): RuntimeSettingsRecord {
  return {
    revision: 7,
    updatedAt: "2026-05-23T12:00:00.000Z",
    updatedBy: "admin.user",
    paths: {
      ...POC_PATHS
    },
    blobStorage: {
      endpoint: "http://localhost:8333",
      region: "us-east-1",
      bucket: "aurora-module-assets",
      modulePrefix: "modules/current",
      accessKeyId: "seaweedfs",
      secretAccessKey: "seaweedfs-secret",
      forcePathStyle: true
    },
    telemetryDebugMode: "full",
    hakProfiles: {
      lc_core: ["lc_core.hak"],
      lc_models: ["lc_placeables.hak", "lc_creatures.hak"],
      lc_tiles: ["lc_tiles.hak"],
      lc_audio: ["lc_sounds.hak"]
    },
    sources: {
      placeable: baseSource(),
      tile: baseSource(),
      area: baseSource(),
      sound: {
        ...baseSource(),
        includeVanilla: false
      }
    },
    benchmarkCandidates: {
      placeableHeavyNoVfx: baseCandidate("c_wingsmeph", 659, 16, 0),
      placeableHeavyVfx: baseCandidate("ad_top_lion_1", 798, 28, 1),
      placeableVfxPlcAlternative: baseCandidate("plc_x02", 112, 5, 3),
      doorHeavyInstance: baseCandidate(
        "tn_sdoor_14",
        250,
        10,
        0,
        "wnd_slms_swamp__with_placeables",
        12
      ),
      doorHeavySingleMesh: {
        ...baseCandidate(
          "tn_gdoor_05",
          190,
          6,
          0,
          "wnd_slms_swamp__with_placeables",
          8
        ),
        metrics: {
          triangles: 190,
          meshes: 6,
          emitters: 0,
          maxSingleMeshTriangles: 102
        }
      }
    }
  };
}

function baseSource() {
  return {
    includeModuleTemp0: true,
    includeModulePacked: false,
    includeHaks: true,
    includeVanilla: true,
    hakProfileId: "lc_core",
    hakPriorityList: []
  };
}

function baseCandidate(
  resref: string,
  triangles: number,
  meshes: number,
  emitters: number,
  areaResref?: string,
  doorIndex?: number
) {
  return {
    resref,
    metrics: {
      triangles,
      meshes,
      emitters
    },
    context: {
      source: areaResref ? "area-data" : "scene.json",
      areaResref,
      doorIndex
    }
  };
}
