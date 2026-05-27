import { describe, expect, it } from "vitest";
import { mapBackendAreaToScene } from "../../../../src/modules/areas/application/areaSceneMapper";
import type { AreaApiDetail } from "../../../../src/modules/areas/contracts";

describe("mapBackendAreaToScene", () => {
  it("maps backend area payload into runtime area scene", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_city_001",
      name: "City Square",
      biome: "urban",
      width: 2,
      height: 2,
      tags: ["market"],
      benchmark: false,
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
        }
      ]
    };
    const now = () => 1770000000000;

    const scene = mapBackendAreaToScene(backendArea, now);

    expect(scene.sceneId).toBe("area_city_001");
    expect(scene.areaName).toBe("City Square");
    expect(scene.width).toBe(2);
    expect(scene.height).toBe(2);
    expect(scene.tiles).toHaveLength(4);
    expect(scene.source).toBe("seed");
    expect(scene.updatedAtUnixMs).toBe(1770000000000);
    expect(scene.objects).toHaveLength(3);
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
      id: "area_city_001:crt_001",
      kind: "creatures",
      isStatic: false,
      x: 3,
      y: 4,
      z: 0,
      bearing: 180
    });
    expect(scene.objects[2]).toMatchObject({
      id: "area_city_001:itm_001",
      kind: "items",
      isStatic: false,
      x: 5,
      y: 6,
      z: 0,
      bearing: 270
    });
  });
});
