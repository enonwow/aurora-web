import type { RuntimeSettingsRecord } from "./runtime-settings.types";

export function buildDefaultRuntimeSettings(
  nowIso = new Date().toISOString()
): RuntimeSettingsRecord {
  return {
    revision: 1,
    updatedAt: nowIso,
    updatedBy: "system.bootstrap",
    paths: {
      nwnUserDir: "C:/Users/enonw/Documents/Neverwinter Nights",
      nwnInstallDir: "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights",
      auroraReferenceDir: "C:/Projects/New Folder",
      hakDirectories: ["C:/Users/enonw/Documents/Neverwinter Nights/hak"],
      itemGeneratorSourceDirectories: [
        "C:/Projects/New Folder/item-retail-extract/utg"
      ],
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
      // CEP tilesets (for example atj02 -> atj01_*) resolve their MDL assets
      // from this archive. Keep it in the default profile so a new local
      // runtime has the same source layer as the Area tileset catalog.
      lc_tiles: ["medieval.hak", "+sic11.hak", "cep3_tiles.hak"],
      lc_audio: ["lc_music.hak", "lc_sounds.hak", "npc_sounds.hak"],
      lc_vfx: ["lc_2da.hak", "lc_vfx.hak", "cep3_vfx.hak"],
      lc_items: [
        "lc_2da.hak",
        "lc_icons.hak",
        "bdhd_items.hak",
        "cep3_core0.hak",
        "cep3_core1.hak",
        "cep3_core2.hak",
        "cep3_reforge.hak",
        "cep3_armor.hak",
        "vale-c_and_m.hak",
        "witcher.hak",
        "witcher2.hak"
      ],
      lc_creatures: [
        "lc_2da.hak",
        "lc_appearance.hak",
        "lc_heads.hak",
        "lc_character.hak",
        "lc_hd_animals.hak",
        "lc_ccc.hak",
        "bdhd_pheno_other.hak",
        "bdhd_pheno_chest.hak",
        "bdhd_items.hak",
        "cep3_core0.hak",
        "cep3_core1.hak",
        "cep3_core2.hak",
        "cep3_facelift.hak",
        "cep3_heads.hak",
        "cep3_phenos.hak",
        "cep3_reforge.hak",
        "cep3_armor.hak",
        "cep3_portraits.hak",
        "vale-c_and_m.hak",
        "witcher.hak",
        "witcher2.hak"
      ]
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
        includeVanilla: true,
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
      },
      creature: {
        includeModuleTemp0: true,
        includeModulePacked: false,
        includeHaks: true,
        includeVanilla: true,
        hakProfileId: "lc_creatures",
        hakPriorityList: []
      },
      item: {
        includeModuleTemp0: true,
        includeModulePacked: false,
        includeHaks: true,
        includeVanilla: true,
        hakProfileId: "lc_items",
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
