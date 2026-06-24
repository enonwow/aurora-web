import { describe, expect, it } from "vitest";
import { mapBackendAreaToScene } from "../../../../src/modules/areas/application/areaSceneMapper";
import type { AreaApiDetail } from "../../../../src/modules/areas/contracts";
import type { SceneObjectKind } from "../../../../src/modules/scene/contracts";

function countSceneObjectsByKind(objects: Array<{ kind: SceneObjectKind }>) {
  return objects.reduce(
    (counts, object) => {
      counts[object.kind] += 1;
      counts.total += 1;
      return counts;
    },
    {
      placeables: 0,
      doors: 0,
      creatures: 0,
      items: 0,
      sounds: 0,
      total: 0
    }
  );
}

describe("mapBackendAreaToScene", () => {
  it("maps backend area payload without synthesizing placeholder terrain when tiles are missing", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_city_001",
      name: "City Square",
      biome: "urban",
      width: 2,
      height: 2,
      tags: ["market"],
      benchmark: false,
      previewImageUrl: "/assets/previews/areas/area_city_001.webp",
      textureAtlas: {
        atlasId: "atlas_city_001",
        cacheKey: "atlas_city_001:2x2",
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_city_001.webp",
        contentType: "image/webp",
        sizeBytes: 4096,
        etag: "atlas-city-001"
      },
      composition: {
        placeables: 1,
        doors: 1,
        creatures: 1,
        items: 1,
        sounds: 1,
        total: 5
      },
      updatedAt: "2026-05-27T10:00:00.000Z",
      objects: [
        {
          objectId: "plc_001",
          kind: "placeable",
          templateId: "plc_market_stall_001",
          x: 1,
          y: 2,
          z: 0,
          bearing: 90
        },
        {
          objectId: "dr_001",
          kind: "door",
          templateId: "nw_door_ttr_11",
          x: 2,
          y: 3,
          z: 0,
          bearing: 45
        },
        {
          objectId: "crt_001",
          kind: "creature",
          templateId: "nw_hguard",
          x: 3,
          y: 4,
          z: 0,
          bearing: 180
        },
        {
          objectId: "itm_001",
          kind: "item",
          templateId: "nw_it_mpotion001",
          x: 5,
          y: 6,
          z: 0,
          bearing: 270
        },
        {
          objectId: "snd_001",
          kind: "sound",
          templateId: "sfx_forge_loop_heavy",
          x: 7,
          y: 8,
          z: 1.25,
          bearing: 0,
          soundPositioning: {
            mode: "random",
            elevation: 1.25,
            maxVolumeDistance: 2,
            cutoffDistance: 14,
            randomRangeWestEast: 3,
            randomRangeNorthSouth: 4,
            preserve: {
              timeWindow: "",
              hourMask: "",
              active: true,
              whenToPlay: "always",
              dayNight: "both",
              playStyle: "loop",
              playOrder: "random",
              intervalMs: 8000,
              intervalVariationMs: 1200,
              volume: 0.8,
              volumeVariation: 0.15,
              pitchVariation: 0.1,
              priority: 2,
              flags: {
                active: true,
                looping: true,
                random: true,
                positional: true,
                randomPosition: true
              },
              extra: {
                auroraSoundList: "forge_loop_a\nforge_loop_b"
              }
            }
          }
        }
      ]
    };
    const now = () => 1770000000000;

    const scene = mapBackendAreaToScene(backendArea, now);

    expect(scene.sceneId).toBe("area_city_001");
    expect(scene.areaName).toBe("City Square");
    expect(scene.width).toBe(2);
    expect(scene.height).toBe(2);
    expect(scene.biome).toBe("urban");
    expect(scene.tags).toEqual(["market"]);
    expect(scene.benchmark).toBe(false);
    expect(scene.previewImageUrl).toBe("/assets/previews/areas/area_city_001.webp");
    expect(scene.textureAtlas).toEqual({
      atlasId: "atlas_city_001",
      cacheKey: "atlas_city_001:2x2",
      strategy: "blob-cache",
      objectKey: "modules/current/areas/atlases/atlas_city_001.webp",
      contentType: "image/webp",
      sizeBytes: 4096,
      etag: "atlas-city-001"
    });
    expect(scene.composition).toEqual({
      placeables: 1,
      doors: 1,
      creatures: 1,
      items: 1,
      sounds: 1,
      total: 5
    });
    expect(scene.backendUpdatedAt).toBe("2026-05-27T10:00:00.000Z");
    expect(scene.tiles).toEqual([]);
    expect(scene.tileSource).toEqual({
      type: "blocked_missing_tile_data",
      tileCount: 0,
      fallbackReason: "area-api-tile-list-missing"
    });
    expect(scene.source).toBe("aurora_area");
    expect(scene.updatedAtUnixMs).toBe(1770000000000);
    expect(scene.objects).toHaveLength(5);
    expect(scene.objects[0]).toMatchObject({
      id: "area_city_001:plc_001",
      kind: "placeables",
      isStatic: true,
      x: 1,
      y: 2,
      z: 0,
      bearing: 90
    });
    expect(scene.objects[1]).toMatchObject({
      id: "area_city_001:dr_001",
      kind: "doors",
      isStatic: false,
      x: 2,
      y: 3,
      z: 0,
      bearing: 45
    });
    expect(scene.objects[2]).toMatchObject({
      id: "area_city_001:crt_001",
      kind: "creatures",
      isStatic: false,
      x: 3,
      y: 4,
      z: 0,
      bearing: 180
    });
    expect(scene.objects[3]).toMatchObject({
      id: "area_city_001:itm_001",
      kind: "items",
      isStatic: false,
      x: 5,
      y: 6,
      z: 0,
      bearing: 270
    });
    expect(scene.objects[4]).toMatchObject({
      id: "area_city_001:snd_001",
      kind: "sounds",
      isStatic: false,
      resRef: "sfx_forge_loop_heavy",
      x: 7,
      y: 8,
      z: 1.25,
      bearing: 0,
      soundPositioning: {
        mode: "random",
        elevation: 1.25,
        maxVolumeDistance: 2,
        cutoffDistance: 14,
        randomRangeWestEast: 3,
        randomRangeNorthSouth: 4,
        preserve: expect.objectContaining({
          active: true,
          playStyle: "loop",
          playOrder: "random",
          extra: {
            auroraSoundList: "forge_loop_a\nforge_loop_b"
          }
        })
      }
    });
  });

  it("keeps public area scene snapshot counts traceable to mapped objects", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_snapshot_count_guard",
      name: "Snapshot Count Guard",
      biome: "interior",
      width: 3,
      height: 2,
      tags: ["snapshot", "count-fidelity"],
      benchmark: true,
      previewImageUrl: "/assets/previews/areas/area_snapshot_count_guard.webp",
      textureAtlas: {
        atlasId: "atlas_snapshot_count_guard",
        cacheKey: "atlas_snapshot_count_guard:3x2",
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_snapshot_count_guard.webp",
        contentType: "image/webp",
        sizeBytes: 16384,
        etag: "snapshot-count-guard"
      },
      tileSet: "tno01",
      tiles: [
        {
          tileInstanceId: "area_snapshot_count_guard:tile:0",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 0,
          col: 0,
          tileIndex: 0,
          tileId: 101,
          modelResRef: "tno01_a01_01",
          modelSource: "set-tile-section",
          orientation: 1,
          height: 0.5,
          source: "are-tile-list"
        },
        {
          tileInstanceId: "area_snapshot_count_guard:tile:1",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 0,
          col: 1,
          tileIndex: 1,
          tileId: 102,
          orientation: 2,
          source: "are-tile-list",
          fallbackReason: "tile-model-reference-missing"
        },
        {
          tileInstanceId: "area_snapshot_count_guard:tile:2",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 0,
          col: 2,
          tileIndex: 2,
          tileId: 103,
          orientation: 3,
          source: "are-tile-list",
          fallbackReason: "tile-model-reference-missing"
        },
        {
          tileInstanceId: "area_snapshot_count_guard:tile:3",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 1,
          col: 0,
          tileIndex: 3,
          tileId: 104,
          orientation: 0,
          source: "are-tile-list",
          fallbackReason: "tile-model-reference-missing"
        },
        {
          tileInstanceId: "area_snapshot_count_guard:tile:4",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 1,
          col: 1,
          tileIndex: 4,
          tileId: 105,
          orientation: 1,
          source: "are-tile-list",
          fallbackReason: "tile-model-reference-missing"
        },
        {
          tileInstanceId: "area_snapshot_count_guard:tile:5",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 1,
          col: 2,
          tileIndex: 5,
          tileId: 106,
          orientation: 2,
          source: "are-tile-list",
          fallbackReason: "tile-model-reference-missing"
        }
      ],
      composition: {
        placeables: 2,
        doors: 1,
        creatures: 1,
        items: 1,
        sounds: 2,
        total: 7
      },
      updatedAt: "2026-06-17T01:07:38.361Z",
      objects: [
        {
          objectId: "plc_altar_01",
          kind: "placeable",
          templateId: "plc_altar_01",
          x: 0,
          y: 1,
          z: 0,
          bearing: 0
        },
        {
          objectId: "plc_chest_01",
          kind: "placeable",
          templateId: "plc_chest_01",
          x: 1,
          y: 1,
          z: 0,
          bearing: 45
        },
        {
          objectId: "door_exit_01",
          kind: "door",
          templateId: "nw_door_ttr_11",
          x: 2,
          y: 1,
          z: 0,
          bearing: 90
        },
        {
          objectId: "creature_guard_01",
          kind: "creature",
          templateId: "nw_hguard",
          x: 1,
          y: 0,
          z: 0,
          bearing: 180
        },
        {
          objectId: "item_potion_01",
          kind: "item",
          templateId: "nw_it_mpotion001",
          x: 2,
          y: 0,
          z: 0,
          bearing: 270
        },
        {
          objectId: "sound_room_01",
          kind: "sound",
          templateId: "amb_room_low",
          x: 0,
          y: 0,
          z: 0.5,
          bearing: 0,
          soundPositioning: {
            mode: "specific",
            elevation: 0.5,
            maxVolumeDistance: 3,
            cutoffDistance: 12,
            randomRangeWestEast: 0,
            randomRangeNorthSouth: 0,
            preserve: {
              timeWindow: "",
              hourMask: "",
              active: true,
              whenToPlay: "always",
              dayNight: "both",
              playStyle: "loop",
              playOrder: "sequential",
              intervalMs: 0,
              intervalVariationMs: 0,
              volume: 0.6,
              volumeVariation: 0,
              pitchVariation: 0,
              priority: 1,
              flags: {
                active: true,
                looping: true,
                random: false,
                positional: true,
                randomPosition: false
              },
              extra: {
                backendSoundId: "sound_room_01",
                soundTemplateSource: "area-payload"
              }
            }
          }
        },
        {
          objectId: "sound_room_02",
          kind: "sound",
          templateId: "amb_room_high",
          x: 2,
          y: 0,
          z: 1,
          bearing: 0,
          soundPositioning: {
            mode: "random",
            elevation: 1,
            maxVolumeDistance: 4,
            cutoffDistance: 16,
            randomRangeWestEast: 2,
            randomRangeNorthSouth: 1,
            preserve: {
              timeWindow: "",
              hourMask: "",
              active: true,
              whenToPlay: "always",
              dayNight: "both",
              playStyle: "repeat",
              playOrder: "random",
              intervalMs: 5000,
              intervalVariationMs: 500,
              volume: 0.5,
              volumeVariation: 0.1,
              pitchVariation: 0.05,
              priority: 2,
              flags: {
                active: true,
                looping: false,
                random: true,
                positional: true,
                randomPosition: true
              },
              extra: {
                backendSoundId: "sound_room_02",
                soundTemplateSource: "area-payload"
              }
            }
          }
        }
      ]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000001234);

    expect(scene).toMatchObject({
      sceneId: "area_snapshot_count_guard",
      areaName: "Snapshot Count Guard",
      width: 3,
      height: 2,
      biome: "interior",
      tags: ["snapshot", "count-fidelity"],
      benchmark: true,
      previewImageUrl: "/assets/previews/areas/area_snapshot_count_guard.webp",
      textureAtlas: {
        atlasId: "atlas_snapshot_count_guard",
        cacheKey: "atlas_snapshot_count_guard:3x2",
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_snapshot_count_guard.webp",
        contentType: "image/webp",
        sizeBytes: 16384,
        etag: "snapshot-count-guard"
      },
      composition: {
        placeables: 2,
        doors: 1,
        creatures: 1,
        items: 1,
        sounds: 2,
        total: 7
      },
      backendUpdatedAt: "2026-06-17T01:07:38.361Z",
      tileSource: {
        type: "aurora_tile_list",
        tilesetResRef: "tno01",
        tileCount: 6,
        fallbackReason: "tile-metadata-incomplete"
      },
      updatedAtUnixMs: 1770000001234
    });
    expect(scene.tiles).toHaveLength(6);
    expect(scene.source).toBe("aurora_area");
    expect(scene.tiles[0]).toMatchObject({
      id: "area_snapshot_count_guard:tile:0",
      source: "aurora_tile_list",
      areaId: "area_snapshot_count_guard",
      tilesetResRef: "tno01",
      row: 0,
      col: 0,
      tileIndex: 0,
      tileId: 101,
      modelResRef: "tno01_a01_01",
      modelSource: "set-tile-section",
      orientation: 1,
      height: 0.5
    });
    expect(scene.tiles[1]).toMatchObject({
      id: "area_snapshot_count_guard:tile:1",
      source: "aurora_tile_list",
      fallbackReason: "tile-model-reference-missing"
    });
    expect(scene.objects).toHaveLength(scene.composition?.total);
    expect(countSceneObjectsByKind(scene.objects)).toEqual(scene.composition);
    expect(scene.objects.map((object) => object.kind)).toEqual([
      "placeables",
      "placeables",
      "doors",
      "creatures",
      "items",
      "sounds",
      "sounds"
    ]);
    expect(scene.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "area_snapshot_count_guard:plc_altar_01", kind: "placeables" }),
        expect.objectContaining({ id: "area_snapshot_count_guard:plc_chest_01", kind: "placeables" }),
        expect.objectContaining({ id: "area_snapshot_count_guard:door_exit_01", kind: "doors" }),
        expect.objectContaining({ id: "area_snapshot_count_guard:creature_guard_01", kind: "creatures" }),
        expect.objectContaining({ id: "area_snapshot_count_guard:item_potion_01", kind: "items" })
      ])
    );
    expect(
      scene.objects.find((object) => object.id === "area_snapshot_count_guard:sound_room_02")
        ?.soundPositioning
    ).toEqual({
      mode: "random",
      elevation: 1,
      maxVolumeDistance: 4,
      cutoffDistance: 16,
      randomRangeWestEast: 2,
      randomRangeNorthSouth: 1,
      preserve: {
        timeWindow: "",
        hourMask: "",
        active: true,
        whenToPlay: "always",
        dayNight: "both",
        hoursStart: 0,
        hoursEnd: 23,
        playStyle: "repeat",
        playOrder: "random",
        intervalMs: 5000,
        intervalVariationMs: 500,
        volume: 0.5,
        volumeVariation: 0.1,
        pitchVariation: 0.05,
        priority: 2,
        flags: {
          active: true,
          looping: false,
          random: true,
          positional: true,
          randomPosition: true
        },
        extra: {
          backendSoundId: "sound_room_02",
          soundTemplateSource: "area-payload"
        }
      }
    });
  });
});
