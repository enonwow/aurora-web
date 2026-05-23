import {
  RuntimeSettingsApplicationService,
  resolveHakSettingsByAsset
} from "../../src/modules/runtime-settings/application/runtime-settings.application.service";
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
  let service: RuntimeSettingsApplicationService;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      save: jest.fn()
    };
    service = new RuntimeSettingsApplicationService(repository);
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
