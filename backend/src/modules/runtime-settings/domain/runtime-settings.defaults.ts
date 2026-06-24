import type { RuntimeSettingsRecord } from "./runtime-settings.types";

export function buildDefaultRuntimeSettings(
  nowIso = new Date().toISOString()
): RuntimeSettingsRecord {
  return {
    revision: 1,
    updatedAt: nowIso,
    updatedBy: "system.bootstrap",
    paths: {
      vanillaDataPath: "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data",
      hakDirectoryPath: "C:/Users/enonw/Documents/Neverwinter Nights/hak",
      moduleDecompiledPath: "C:/Users/enonw/Documents/Neverwinter Nights/LC-Decompiled/temp0",
      modulePackedPath: "",
      tlkBasePath:
        "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/lang/en/data/dialog.tlk",
      tlkCustomPath: ""
    },
    blobStorage: {
      endpoint: "http://seaweedfs:8333",
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
      lc_models: [
        "lc_2da.hak",
        "lc_placeable.hak",
        "lc_placeable_cust.hak",
        "lc_hd_plcbls.hak",
        "q_placeables.hak",
        "cep3_core0.hak",
        "nwic_placeables.hak"
      ],
      lc_tiles: ["medieval.hak"],
      lc_audio: ["lc_music.hak", "lc_sounds.hak", "npc_sounds.hak"],
      lc_vfx: ["lc_2da.hak", "lc_vfx.hak", "cep3_vfx.hak"]
    },
    sources: {
      placeable: {
        includeModuleTemp0: true,
        includeModulePacked: false,
        includeHaks: true,
        includeVanilla: true,
        hakProfileId: "lc_models",
        hakPriorityList: []
      },
      tile: {
        includeModuleTemp0: true,
        includeModulePacked: false,
        includeHaks: true,
        includeVanilla: true,
        hakProfileId: "lc_tiles",
        hakPriorityList: []
      },
      area: {
        includeModuleTemp0: true,
        includeModulePacked: false,
        includeHaks: true,
        includeVanilla: true,
        hakProfileId: "lc_core",
        hakPriorityList: []
      },
      sound: {
        includeModuleTemp0: true,
        includeModulePacked: false,
        includeHaks: true,
        includeVanilla: false,
        hakProfileId: "lc_audio",
        hakPriorityList: []
      },
      vfx: {
        includeModuleTemp0: true,
        includeModulePacked: false,
        includeHaks: true,
        includeVanilla: true,
        hakProfileId: "lc_vfx",
        hakPriorityList: []
      }
    },
    benchmarkCandidates: {
      placeableHeavyNoVfx: {
        resref: "c_wingsmeph",
        metrics: {
          triangles: 659,
          meshes: 16,
          emitters: 0
        },
        context: {
          source: "scene.json",
          note: "Heavy placeable without VFX emitters."
        }
      },
      placeableHeavyVfx: {
        resref: "ad_top_lion_1",
        metrics: {
          triangles: 798,
          meshes: 28,
          emitters: 1
        },
        context: {
          source: "scene.json",
          note: "Heaviest VFX candidate in current generated dataset."
        }
      },
      placeableVfxPlcAlternative: {
        resref: "plc_x02",
        metrics: {
          triangles: 112,
          meshes: 5,
          emitters: 3
        },
        context: {
          source: "scene.json",
          note: "Alternative classic PLC with stronger emitter load."
        }
      },
      doorHeavyInstance: {
        resref: "tn_sdoor_14",
        metrics: {
          triangles: 250,
          meshes: 10,
          emitters: 0
        },
        context: {
          source: "area-data",
          areaResref: "wnd_slms_swamp__with_placeables",
          doorIndex: 12,
          note: "Heaviest door by instance total."
        }
      },
      doorHeavySingleMesh: {
        resref: "tn_gdoor_05",
        metrics: {
          triangles: 190,
          meshes: 6,
          emitters: 0,
          maxSingleMeshTriangles: 102
        },
        context: {
          source: "area-data",
          areaResref: "wnd_slms_swamp__with_placeables",
          doorIndex: 8,
          note: "Door with highest single-mesh triangle peak."
        }
      }
    }
  };
}
