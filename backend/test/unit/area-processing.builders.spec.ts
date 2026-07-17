import type { AreaRecord } from "../../src/modules/areas/domain/area.types";
import {
  AREA_PROCESS_CACHE_KEY_VERSION,
  buildAreaProcessCacheKey,
  countAreaObjectsByKind
} from "../../src/modules/areas/domain/area-processing.builders";

describe("area-processing.builders", () => {
  it("counts area object kinds", () => {
    expect(
      countAreaObjectsByKind([
        buildAreaObject({ kind: "placeable" }),
        buildAreaObject({ kind: "door" }),
        buildAreaObject({ kind: "creature" }),
        buildAreaObject({ kind: "encounter" }),
        buildAreaObject({ kind: "item" }),
        buildAreaObject({ kind: "sound" }),
        buildAreaObject({ kind: "store" }),
        buildAreaObject({ kind: "trigger" }),
        buildAreaObject({ kind: "waypoint" })
      ])
    ).toEqual({
      placeables: 1,
      doors: 1,
      creatures: 1,
      encounters: 1,
      items: 1,
      sounds: 1,
      stores: 1,
      triggers: 1,
      waypoints: 1,
      total: 9
    });
  });

  it("uses object localized text in the process cache key", () => {
    const area = buildAreaRecord({
      objects: [
        buildAreaObject({
          tag: "QFoodBins",
          localizedName: "[W] Balustrada",
          description: "[Q]Pallet, Empty"
        })
      ]
    });
    const relabeledArea = buildAreaRecord({
      objects: [
        buildAreaObject({
          tag: "QFoodBins",
          localizedName: "[W] Balustrada",
          description: "[Q]Fence 1, Long (open end)"
        })
      ]
    });

    expect(AREA_PROCESS_CACHE_KEY_VERSION).toBe("area-process/v14-global-lighting");
    expect(buildAreaProcessCacheKey(area)).toMatch(/^[a-f0-9]{64}$/u);
    expect(buildAreaProcessCacheKey(area)).not.toBe(buildAreaProcessCacheKey(relabeledArea));
  });

  it("uses area tile light flags in the process cache key", () => {
    const area = buildAreaRecord({
      tiles: [
        buildAreaTile({
          mainLight1: 3,
          mainLight2: 4,
          sourceLight1: 5,
          sourceLight2: 6,
          animLoop1: 1,
          animLoop2: 0,
          animLoop3: 1
        })
      ]
    });
    const relitArea = buildAreaRecord({
      tiles: [
        buildAreaTile({
          mainLight1: 9,
          mainLight2: 4,
          sourceLight1: 5,
          sourceLight2: 6,
          animLoop1: 1,
          animLoop2: 0,
          animLoop3: 1
        })
      ]
    });

    expect(buildAreaProcessCacheKey(area)).toMatch(/^[a-f0-9]{64}$/u);
    expect(buildAreaProcessCacheKey(area)).not.toBe(buildAreaProcessCacheKey(relitArea));
  });

  it("uses resolved area tile light colors in the process cache key", () => {
    const area = buildAreaRecord({
      tiles: [
        buildAreaTile({
          mainLight1: 3,
          mainLight1Color: {
            rowId: 3,
            red: 1,
            green: 0.75,
            blue: 0.25,
            sourceKey: "modules/current/__aurora/sources/vanilla/tilecolor.2da"
          }
        })
      ]
    });
    const recoloredArea = buildAreaRecord({
      tiles: [
        buildAreaTile({
          mainLight1: 3,
          mainLight1Color: {
            rowId: 3,
            red: 0.5,
            green: 0.5,
            blue: 1,
            sourceKey: "modules/current/__aurora/sources/vanilla/tilecolor.2da"
          }
        })
      ]
    });

    expect(buildAreaProcessCacheKey(area)).toMatch(/^[a-f0-9]{64}$/u);
    expect(buildAreaProcessCacheKey(area)).not.toBe(buildAreaProcessCacheKey(recoloredArea));
  });

  it("uses area global lighting fields in the process cache key", () => {
    const area = buildAreaRecord({
      lighting: {
        source: "are-root-fields",
        fields: [
          { field: "IsNight", value: 0 },
          { field: "SunShadows", value: 1 },
          { field: "MoonShadows", value: 0 },
          { field: "ShadowOpacity", value: 50 }
        ]
      }
    });
    const reshadedArea = buildAreaRecord({
      lighting: {
        source: "are-root-fields",
        fields: [
          { field: "IsNight", value: 1 },
          { field: "SunShadows", value: 1 },
          { field: "MoonShadows", value: 1 },
          { field: "ShadowOpacity", value: 25 }
        ]
      }
    });

    expect(buildAreaProcessCacheKey(area)).toMatch(/^[a-f0-9]{64}$/u);
    expect(buildAreaProcessCacheKey(area)).not.toBe(buildAreaProcessCacheKey(reshadedArea));
  });
});

function buildAreaRecord(overrides: Partial<AreaRecord> = {}): AreaRecord {
  return {
    areaId: "area_test_001",
    name: "Test Area",
    biome: "urban",
    width: 2,
    height: 2,
    tags: ["area", "urban"],
    benchmark: false,
    previewImageUrl: "/api/v1/areas/area_test_001/thumbnail",
    textureAtlasId: "atlas_urban_v1",
    textureAtlasObjectKey: "modules/current/areas/atlases/atlas_urban_v1.webp",
    textureAtlasContentType: "image/webp",
    textureAtlasSizeBytes: 1024,
    textureAtlasEtag: "atlas-urban-v1",
    textureAtlasFingerprint: "atlas-fingerprint",
    tileSet: "tno01",
    tiles: [],
    objects: [buildAreaObject()],
    soundscape: {
      bindingKeys: {
        areaKey: "GI_sound_area",
        randomKey: "GI_sound_rndm",
        positionalKey: "GI_sound_pos"
      },
      area: [],
      random: [],
      positional: []
    },
    updatedAt: "2026-06-27T00:00:00.000Z",
    ...overrides
  };
}

function buildAreaObject(
  overrides: Partial<AreaRecord["objects"][number]> = {}
): AreaRecord["objects"][number] {
  return {
    objectId: "obj_plc_qfoodbins",
    kind: "placeable",
    templateId: "plc_qfoodbins",
    resRef: "qfoodbins",
    tag: "QFoodBins",
    x: 1,
    y: 1,
    z: 0,
    bearing: 0,
    ...overrides
  };
}

function buildAreaTile(
  overrides: Partial<NonNullable<AreaRecord["tiles"]>[number]> = {}
): NonNullable<AreaRecord["tiles"]>[number] {
  return {
    tileInstanceId: "area_test_001:tile:0",
    areaId: "area_test_001",
    tilesetResRef: "tno01",
    row: 0,
    col: 0,
    tileIndex: 0,
    tileId: 101,
    modelResRef: "tno01_a01_01",
    modelSource: "set-tile-section",
    orientation: 1,
    source: "are-tile-list",
    ...overrides
  };
}
