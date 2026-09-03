import { describe, expect, it } from "vitest";
import {
  clearTerrainMesh,
  resolveTerrainRenderStatus,
  resolveTerrainScenePackageReadiness,
  resolveTerrainTileModelAssetRequestIdentity
} from "../../../../src/modules/layout/adapters/three/workspaceTerrainMesh";
import * as THREE from "three";
import type { AreaScene } from "../../../../src/modules/scene/contracts";
import {
  createAuroraAreaEditingState,
  type AuroraAreaTilesetDefinition
} from "../../../../src/modules/scene/domain/auroraAreaEditing";
import { applyAuroraAreaEditingStateToScene } from "../../../../src/modules/scene/domain/auroraAreaEditingSceneMapper";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspaceTerrainMesh tile model asset request identity", () => {
  it("removes every stale terrain model layer after a rapid Area switch", () => {
    const scene = new THREE.Scene();
    for (const name of ["old-area", "new-area"]) {
      const layer = new THREE.Group();
      layer.name = "terrain-backend-tile-models";
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      mesh.name = name;
      layer.add(mesh);
      scene.add(layer);
    }
    const runtime = {
      scene,
      container: document.createElement("div"),
      tileMesh: null,
      tileIdByInstance: []
    } as unknown as Parameters<typeof clearTerrainMesh>[0];

    clearTerrainMesh(runtime);

    expect(scene.children.filter((child) => child.name === "terrain-backend-tile-models")).toEqual([]);
  });

  it("does not report missing model refs after every unique tile contract is ready", () => {
    const scene = {
      ...createSeedAreaScene(),
      sceneId: "runtime-ready",
      source: "aurora_area",
      width: 2,
      height: 2,
      tileSource: { type: "aurora_tile_list", tilesetResRef: "tni01", tileCount: 2 },
      tiles: [
        { id: "runtime-ready:r0:c0", row: 0, col: 0, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list", modelResRef: "tni01_o20_01" },
        { id: "runtime-ready:r0:c1", row: 0, col: 1, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list", modelResRef: "gin11_s01_02" }
      ]
    } as AreaScene;
    const readiness = {
      entries: [
        { status: "ready", modelResRef: "tni01_o20_01", modelDeliveryStatus: "ready", renderLoaderHandoffStatus: "ready" },
        { status: "ready", modelResRef: "gin11_s01_02", modelDeliveryStatus: "ready", renderLoaderHandoffStatus: "ready" }
      ]
    } as Parameters<typeof resolveTerrainScenePackageReadiness>[2];

    const result = resolveTerrainScenePackageReadiness(
      scene,
      resolveTerrainRenderStatus(scene, readiness),
      readiness
    );

    expect(result.status).toBe("ready");
    expect(result.blockers).toEqual([]);
  });

  it("treats typed excluded definitions as represented without inspecting model names", () => {
    const scene = {
      ...createSeedAreaScene(),
      sceneId: "runtime-padding-ready",
      source: "aurora_area",
      width: 2,
      height: 1,
      tileSource: { type: "aurora_tile_list", tilesetResRef: "tdc01", tileCount: 2 },
      tiles: [
        { id: "runtime-padding-ready:r0:c0", row: 0, col: 0, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list", modelResRef: "tdc01_a01_01" },
        { id: "runtime-padding-ready:r0:c1", row: 0, col: 1, tileId: 364, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list", modelResRef: "arbitrary_excluded_name", imageMap2D: "mztall_black" }
      ]
    } as AreaScene;
    const readiness = {
      entries: [
        { status: "ready", modelResRef: "tdc01_a01_01", modelDeliveryStatus: "ready", renderLoaderHandoffStatus: "ready" }
      ],
      excludedTileDefinitionIds: [364]
    } as Parameters<typeof resolveTerrainScenePackageReadiness>[2];
    const renderStatus = resolveTerrainRenderStatus(scene, readiness);
    const packageReadiness = resolveTerrainScenePackageReadiness(
      scene,
      renderStatus,
      readiness
    );

    expect(renderStatus.label).toBe("Aurora tile models loaded (2/2 tile cells)");
    expect(packageReadiness.status).toBe("ready");
    expect(packageReadiness.uniqueModelResRefCount).toBe(1);
    expect(packageReadiness.blockers).toEqual([]);
  });

  it("fails closed when a multi-cell group member has no source model contract", () => {
    const scene = {
      ...createSeedAreaScene(),
      sceneId: "runtime-atj02-group-ready",
      source: "aurora_area",
      width: 2,
      height: 1,
      tileSource: { type: "aurora_tile_list", tilesetResRef: "atj02", tileCount: 2 },
      tiles: [
        { id: "runtime-atj02-group-ready:r0:c0", row: 0, col: 0, terrain: "grass", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list", modelResRef: "atj01_e17_01", imageMap2D: "atjm11_e17" },
        { id: "runtime-atj02-group-ready:r0:c1", row: 0, col: 1, terrain: "grass", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list", modelResRef: "atj01_f17_01", imageMap2D: "atjm11_f17" }
      ]
    } as AreaScene;
    const readiness = {
      entries: [
        { status: "ready", modelResRef: "atj01_f17_01", modelDeliveryStatus: "ready", renderLoaderHandoffStatus: "ready" }
      ]
    } as Parameters<typeof resolveTerrainScenePackageReadiness>[2];
    const renderStatus = resolveTerrainRenderStatus(scene, readiness);
    const packageReadiness = resolveTerrainScenePackageReadiness(
      scene,
      renderStatus,
      readiness
    );

    expect(renderStatus.label).toBe(
      "Aurora tile models restoring (1/2 unique models ready)"
    );
    expect(renderStatus.renderGenericMesh).toBe(true);
    expect(packageReadiness.status).toBe("partial_tile_model_contracts_ready");
    expect(packageReadiness.uniqueModelResRefCount).toBe(2);
    expect(packageReadiness.modelResRefsSample).toBe(
      "atj01_e17_01|atj01_f17_01"
    );
    expect(packageReadiness.blockers).toContain(
      "blocked_tile_model_geometry_loader_missing"
    );
  });

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
