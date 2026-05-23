import { RuntimeSettingsBootstrapService } from "../../src/modules/runtime-settings/application/runtime-settings-bootstrap.service";
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

describe("RuntimeSettingsBootstrapService", () => {
  let repository: jest.Mocked<RuntimeSettingsRepositoryPort>;
  let packedModuleExtractor: jest.Mocked<PackedModuleExtractorPort>;
  let moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort>;
  let service: RuntimeSettingsBootstrapService;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      save: jest.fn()
    };
    packedModuleExtractor = {
      extractFromPackedModule: jest.fn()
    };
    moduleBlobStorage = {
      replaceModuleSnapshot: jest.fn()
    };

    service = new RuntimeSettingsBootstrapService(
      repository,
      packedModuleExtractor,
      moduleBlobStorage
    );
  });

  it("fails startup when both module paths are missing", async () => {
    repository.get.mockResolvedValue(
      buildSettingsRecord({
        moduleDecompiledPath: "",
        modulePackedPath: ""
      })
    );

    await expect(service.onApplicationBootstrap()).rejects.toThrow(
      "either paths.moduleDecompiledPath or paths.modulePackedPath"
    );
    expect(packedModuleExtractor.extractFromPackedModule).not.toHaveBeenCalled();
    expect(moduleBlobStorage.replaceModuleSnapshot).not.toHaveBeenCalled();
  });

  it("skips packed-module sync when modulePackedPath is empty", async () => {
    repository.get.mockResolvedValue(
      buildSettingsRecord({
        moduleDecompiledPath: POC_PATHS.moduleDecompiledPath,
        modulePackedPath: ""
      })
    );

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(packedModuleExtractor.extractFromPackedModule).not.toHaveBeenCalled();
    expect(moduleBlobStorage.replaceModuleSnapshot).not.toHaveBeenCalled();
  });

  it("prefers decompiled module path when both paths are configured", async () => {
    repository.get.mockResolvedValue(
      buildSettingsRecord({
        moduleDecompiledPath: POC_PATHS.moduleDecompiledPath,
        modulePackedPath: POC_PATHS.modulePackedPath
      })
    );

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(packedModuleExtractor.extractFromPackedModule).not.toHaveBeenCalled();
    expect(moduleBlobStorage.replaceModuleSnapshot).not.toHaveBeenCalled();
  });

  it("extracts packed module and uploads snapshot to blob storage", async () => {
    const settings = buildSettingsRecord({
      moduleDecompiledPath: "",
      modulePackedPath: POC_PATHS.modulePackedPath
    });
    repository.get.mockResolvedValue(settings);
    packedModuleExtractor.extractFromPackedModule.mockResolvedValue([
      {
        fileName: "module.ifo",
        resourceType: 2014,
        bytes: Buffer.from("module-data")
      }
    ]);
    moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      uploadedFiles: 1,
      uploadedBytes: 11
    });

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(packedModuleExtractor.extractFromPackedModule).toHaveBeenCalledWith(
      POC_PATHS.modulePackedPath
    );
    expect(moduleBlobStorage.replaceModuleSnapshot).toHaveBeenCalledWith(
      settings.blobStorage,
      expect.arrayContaining([
        expect.objectContaining({ fileName: "module.ifo", resourceType: 2014 })
      ])
    );
  });
});

function buildSettingsRecord(paths: {
  moduleDecompiledPath: string;
  modulePackedPath: string;
}): RuntimeSettingsRecord {
  return {
    revision: 1,
    updatedAt: "2026-05-23T12:00:00.000Z",
    updatedBy: "admin.user",
    paths: {
      vanillaDataPath: POC_PATHS.vanillaDataPath,
      hakDirectoryPath: POC_PATHS.hakDirectoryPath,
      moduleDecompiledPath: paths.moduleDecompiledPath,
      modulePackedPath: paths.modulePackedPath,
      tlkBasePath: POC_PATHS.tlkBasePath,
      tlkCustomPath: POC_PATHS.tlkCustomPath
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
