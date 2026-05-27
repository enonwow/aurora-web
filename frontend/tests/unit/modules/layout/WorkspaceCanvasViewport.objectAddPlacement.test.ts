import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";
import { resolveObjectAddDropPlacement } from "../../../../src/modules/layout/components/WorkspaceCanvasViewport";

describe("resolveObjectAddDropPlacement", () => {
  const scene = createSeedAreaScene();
  const payload = {
    id: "plc_barrel_01",
    kind: "placeables" as const,
    tag: "PLC_BARREL_01",
    resRef: "plc_a01",
    name: "PLC_BARREL_01"
  };

  it("prefers matching preview placement over cache and drop point", () => {
    const result = resolveObjectAddDropPlacement({
      payload,
      scene,
      preview: {
        payload,
        placementX: 1.25,
        placementY: 0.25
      },
      cachedPlacement: {
        payloadKey: "placeables::plc_a01::plc_barrel_01",
        placementX: 0.1,
        placementY: 0.1,
        tileId: "tile_cached",
        updatedAtUnixMs: 1_000
      },
      dropPlacement: { x: 0.5, y: 0.5, tileId: "tile_drop" },
      nowUnixMs: 2_000
    });

    expect(result?.x).toBeCloseTo(1.25);
    expect(result?.y).toBeCloseTo(0.25);
    expect(result?.tileId).toBe(scene.tiles.find((tile) => tile.col === 1 && tile.row === 0)?.id ?? null);
  });

  it("uses recent cached placement when preview is unavailable", () => {
    const result = resolveObjectAddDropPlacement({
      payload,
      scene,
      preview: null,
      cachedPlacement: {
        payloadKey: "placeables::plc_a01::plc_barrel_01",
        placementX: 0.75,
        placementY: 1.5,
        tileId: "tile_cached",
        updatedAtUnixMs: 4_500
      },
      dropPlacement: null,
      nowUnixMs: 5_000
    });

    expect(result).toEqual({
      x: 0.75,
      y: 1.5,
      tileId: "tile_cached"
    });
  });

  it("ignores stale cache and falls back to drop placement", () => {
    const result = resolveObjectAddDropPlacement({
      payload,
      scene,
      preview: null,
      cachedPlacement: {
        payloadKey: "placeables::plc_a01::plc_barrel_01",
        placementX: 0.75,
        placementY: 1.5,
        tileId: "tile_cached",
        updatedAtUnixMs: 1_000
      },
      dropPlacement: { x: 1.9, y: 1.9, tileId: "tile_drop" },
      nowUnixMs: 4_500
    });

    expect(result).toEqual({
      x: 1.9,
      y: 1.9,
      tileId: "tile_drop"
    });
  });

  it("ignores preview payload mismatch", () => {
    const result = resolveObjectAddDropPlacement({
      payload,
      scene,
      preview: {
        payload: {
          ...payload,
          resRef: "plc_other",
          tag: "PLC_OTHER_01"
        },
        placementX: 1.25,
        placementY: 0.25
      },
      cachedPlacement: null,
      dropPlacement: { x: 0.33, y: 0.44, tileId: "tile_drop" },
      nowUnixMs: 10_000
    });

    expect(result).toEqual({
      x: 0.33,
      y: 0.44,
      tileId: "tile_drop"
    });
  });
});
