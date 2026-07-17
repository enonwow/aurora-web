import { describe, expect, it } from "vitest";
import { resolveTerrainTileModelAssetRequestIdentity } from "../../../../src/modules/layout/adapters/three/workspaceTerrainMesh";
import {
  createAuroraAreaEditingState,
  type AuroraAreaTilesetDefinition
} from "../../../../src/modules/scene/domain/auroraAreaEditing";
import { applyAuroraAreaEditingStateToScene } from "../../../../src/modules/scene/domain/auroraAreaEditingSceneMapper";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspaceTerrainMesh tile model asset request identity", () => {
  it("maps an edited Tile_ID to its new modelResRef and a different loader request", () => {
    const terrain = {
      topLeft: "grass",
      topRight: "grass",
      bottomRight: "grass",
      bottomLeft: "grass"
    };
    const definition: AuroraAreaTilesetDefinition = {
      tilesetResRef: "sic11",
      fingerprint: "a".repeat(64),
      defaultTerrain: "grass",
      transitionRules: [],
      groups: [],
      tiles: [
        { tileId: 0, modelResRef: "sic11_a00_00", terrain, crossers: {}, cornerHeights: {} },
        { tileId: 1, modelResRef: "sic11_a01_02", terrain, crossers: {}, cornerHeights: {} }
      ]
    };
    const created = createAuroraAreaEditingState({
      areaResRef: "new_area",
      width: 2,
      height: 2,
      definition,
      selector: () => 0
    });
    if (!created.ok) {
      throw new Error(created.message);
    }
    const initialScene = applyAuroraAreaEditingStateToScene(
      createSeedAreaScene(),
      created.state,
      definition,
      "grass"
    );
    const changedScene = applyAuroraAreaEditingStateToScene(
      initialScene,
      {
        ...created.state,
        tiles: created.state.tiles.map((tile) => ({ ...tile, tileId: 1 }))
      },
      definition,
      "grass"
    );

    expect(initialScene.tiles[0]?.modelResRef).toBe("sic11_a00_00");
    expect(changedScene.tiles[0]?.modelResRef).toBe("sic11_a01_02");

    const initialRequest = resolveTerrainTileModelAssetRequestIdentity(
      initialScene.tiles[0]!,
      {
        modelResRef: "sic11_a00_00",
        cacheKey: "tile-model/sic11_a00_00/v1",
        deliveryUrl: "/api/tiles/tile_sic11_a00_00/model"
      }
    );
    const changedRequest = resolveTerrainTileModelAssetRequestIdentity(
      changedScene.tiles[0]!,
      {
        modelResRef: "sic11_a01_02",
        cacheKey: "tile-model/sic11_a01_02/v1",
        deliveryUrl: "/api/tiles/tile_sic11_a01_02/model"
      }
    );

    expect(changedRequest).not.toEqual(initialRequest);
  });

  it("replaces the visible model request identity when an edited Tile_ID resolves another model", () => {
    const initial = resolveTerrainTileModelAssetRequestIdentity(
      { modelResRef: "sic11_a00_00" },
      {
        modelResRef: "sic11_a00_00",
        cacheKey: "tile-model/sic11_a00_00/v1",
        deliveryUrl: "/api/tiles/tile_sic11_a00_00/model"
      }
    );
    const changed = resolveTerrainTileModelAssetRequestIdentity(
      { modelResRef: "sic11_a01_02" },
      {
        modelResRef: "sic11_a01_02",
        cacheKey: "tile-model/sic11_a01_02/v1",
        deliveryUrl: "/api/tiles/tile_sic11_a01_02/model"
      }
    );

    expect(changed.deliveryUrl).not.toBe(initial.deliveryUrl);
    expect(changed.runtimeCacheKey).not.toBe(initial.runtimeCacheKey);
    expect(changed.runtimeCacheKey).toContain("sic11_a01_02");
  });

  it("invalidates a cached model when the backend contract version changes", () => {
    const v1 = resolveTerrainTileModelAssetRequestIdentity(
      { modelResRef: "sic11_a00_00" },
      {
        modelResRef: "sic11_a00_00",
        cacheKey: "tile-model/sic11_a00_00/v1",
        deliveryUrl: "/api/tiles/tile_sic11_a00_00/model"
      }
    );
    const v2 = resolveTerrainTileModelAssetRequestIdentity(
      { modelResRef: "sic11_a00_00" },
      {
        modelResRef: "sic11_a00_00",
        cacheKey: "tile-model/sic11_a00_00/v2",
        deliveryUrl: "/api/tiles/tile_sic11_a00_00/model"
      }
    );

    expect(v2.deliveryUrl).toBe(v1.deliveryUrl);
    expect(v2.runtimeCacheKey).not.toBe(v1.runtimeCacheKey);
  });

  it("shares one cache identity across cells that use the same model contract", () => {
    const contract = {
      modelResRef: "sic11_a00_00",
      cacheKey: "tile-model/sic11_a00_00/v1",
      deliveryUrl: "/api/tiles/tile_sic11_a00_00/model"
    };

    expect(
      resolveTerrainTileModelAssetRequestIdentity(
        { modelResRef: "SIC11_A00_00" },
        contract
      )
    ).toEqual(
      resolveTerrainTileModelAssetRequestIdentity(
        { modelResRef: "sic11_a00_00" },
        contract
      )
    );
  });
});
