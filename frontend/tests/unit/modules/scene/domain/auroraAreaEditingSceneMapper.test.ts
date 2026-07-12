import { describe, expect, it } from "vitest";
import {
  applyAuroraAreaEditingStateToScene,
  applyAuroraAreaEraser
} from "../../../../../src/modules/scene/domain/auroraAreaEditingSceneMapper";
import {
  createAuroraAreaEditingState,
  type AuroraAreaTilesetDefinition
} from "../../../../../src/modules/scene/domain/auroraAreaEditing";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";
import { resolveTerrainRenderStatus } from "../../../../../src/modules/layout/adapters/three/workspaceTerrainMesh";

const allCorners = (terrain: string) => ({
  topLeft: terrain,
  topRight: terrain,
  bottomRight: terrain,
  bottomLeft: terrain
});

describe("auroraAreaEditingSceneMapper terrain projection", () => {
  it("routes an ambiguous scene Eraser through the editor-local Aurora RNG", () => {
    const definition: AuroraAreaTilesetDefinition = {
      tilesetResRef: "rng_scene",
      fingerprint: "c".repeat(64),
      defaultTerrain: "floor",
      transitionRules: [],
      tiles: [0, 1].map((tileId) => ({
        tileId,
        modelResRef: `rng_floor_${tileId}`,
        terrain: allCorners("floor"),
        crossers: {},
        cornerHeights: {}
      })),
      groups: []
    };
    const created = createAuroraAreaEditingState({
      areaResRef: "rng_scene_area",
      width: 2,
      height: 2,
      definition,
      selector: () => 0
    });
    if (!created.ok) throw new Error(created.message);
    const mapped = applyAuroraAreaEditingStateToScene(
      createSeedAreaScene(2, 2),
      created.state,
      definition,
      "floor"
    );
    const next = applyAuroraAreaEraser(mapped, mapped.tiles[0]!.id);

    expect(next).not.toBe(mapped);
    expect(next.auroraAreaEditing?.state.randomSeed).not.toBe(
      mapped.auroraAreaEditing?.state.randomSeed
    );
  });

  it("publishes the actual SET topology terrain instead of preserving the stale seed terrain", () => {
    const definition: AuroraAreaTilesetDefinition = {
      tilesetResRef: "terrain_projection",
      fingerprint: "a".repeat(64),
      defaultTerrain: "grass",
      transitionRules: [],
      tiles: [
        {
          tileId: 0,
          modelResRef: "grass_tile",
          terrain: allCorners("grass"),
          crossers: {},
          cornerHeights: {}
        }
      ],
      groups: []
    };
    const created = createAuroraAreaEditingState({
      areaResRef: "terrain_area",
      width: 2,
      height: 2,
      definition,
      selector: () => 0
    });
    if (!created.ok) throw new Error(created.message);

    const previous = {
      ...createSeedAreaScene(),
      tiles: createSeedAreaScene().tiles.slice(0, 4).map((tile, index) => ({
        ...tile,
        row: Math.floor(index / 2),
        col: index % 2,
        terrain: "corridor" as const
      }))
    };
    const mapped = applyAuroraAreaEditingStateToScene(
      previous,
      created.state,
      definition,
      "grass"
    );

    expect(mapped.tiles).toHaveLength(4);
    expect(mapped.tiles.map((tile) => tile.terrain)).toEqual(["grass", "grass", "grass", "grass"]);
  });

  it("promotes a local SET draft from seed_placeholder to the real Aurora tile render contract", () => {
    const definition: AuroraAreaTilesetDefinition = {
      tilesetResRef: "sic11",
      fingerprint: "b".repeat(64),
      defaultTerrain: "corridor",
      transitionRules: [],
      tiles: [
        {
          tileId: 0,
          modelResRef: "sic11_a00_00",
          orientation: 0,
          terrain: allCorners("corridor"),
          crossers: {},
          cornerHeights: {}
        }
      ],
      groups: []
    };
    const created = createAuroraAreaEditingState({
      areaResRef: "local_sic11",
      width: 4,
      height: 4,
      definition,
      selector: () => 0
    });
    if (!created.ok) throw new Error(created.message);
    const blank = createSeedAreaScene(4, 4);
    expect(blank.tileSource).toMatchObject({
      type: "seed_placeholder",
      fallbackReason: "seed-scene-placeholder"
    });

    const mapped = applyAuroraAreaEditingStateToScene(
      blank,
      created.state,
      definition,
      "corridor"
    );

    expect(mapped.source).toBe("local_draft");
    expect(mapped.tileSource).toEqual({
      type: "aurora_tile_list",
      tilesetResRef: "sic11",
      tileCount: 16
    });
    expect(mapped.tiles).toHaveLength(16);
    expect(mapped.tiles.every((tile) =>
      tile.source === "aurora_tile_list" &&
      tile.modelResRef === "sic11_a00_00" &&
      tile.modelSource === "set-tile-section" &&
      tile.tilesetResRef === "sic11" &&
      tile.fallbackReason === undefined
    )).toBe(true);
    expect(mapped.tiles.map((tile) => tile.tileIndex)).toEqual(
      Array.from({ length: 16 }, (_value, index) => index)
    );
    expect(resolveTerrainRenderStatus(mapped)).not.toMatchObject({
      code: "generic_mesh",
      label: "generic terrain mesh"
    });
  });
});
