// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { rebuildTerrainMesh } from "../../../../src/modules/layout/adapters/three/workspaceTerrainMesh";
import type { AreaScene } from "../../../../src/modules/scene/contracts";
import { buildAreaTileStateDigest } from "../../../../src/modules/tiles/application/areaTileMutationTelemetry";

function createRuntime(): Parameters<typeof rebuildTerrainMesh>[0] {
  return {
    scene: new THREE.Scene(),
    container: document.createElement("div"),
    tileMesh: null,
    tileIdByInstance: [],
    placeableModelLoader: { load: () => undefined },
    placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
    placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
    placeableTextureLoader: { load: () => undefined },
    placeableDdsTextureLoader: { load: () => undefined },
    placeableTgaTextureLoader: { load: () => undefined },
    placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
    placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>()
  } as unknown as Parameters<typeof rebuildTerrainMesh>[0];
}

function createScene(orientation: 0 | 1 | 2 | 3): AreaScene {
  return {
    sceneId: "area-mutation-identity",
    areaName: "Mutation identity",
    width: 1,
    height: 1,
    source: "local_draft",
    updatedAtUnixMs: orientation,
    tileSource: {
      type: "aurora_tile_list",
      tilesetResRef: "tst01",
      tileCount: 1
    },
    tiles: [
      {
        id: "tile-0-0",
        row: 0,
        col: 0,
        terrain: "corridor",
        orientation,
        rotateTexture: false,
        plot: false,
        tileId: 1,
        modelResRef: "tst01_a01_01"
      }
    ],
    objects: []
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("workspaceTerrainMesh mutation identity", () => {
  it("publishes a new terrain build bound to the full tile-state digest", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () =>
        ({
          clearRect: vi.fn(),
          fillRect: vi.fn(),
          fillStyle: "",
          fillText: vi.fn(),
          font: "",
          lineWidth: 0,
          measureText: vi.fn((text: string) => ({ width: text.length * 14 })),
          strokeRect: vi.fn(),
          strokeStyle: "",
          strokeText: vi.fn(),
          textAlign: "center",
          textBaseline: "middle"
        }) as unknown as CanvasRenderingContext2D
    );
    const runtime = createRuntime();
    const firstScene = createScene(0);
    const secondScene = createScene(1);

    rebuildTerrainMesh(runtime, firstScene, null, {
      textureCompression: "uastc",
      hiddenMeshes: false,
      ceilingMeshes: true,
      wireframe: false,
      textures: true,
      displayFog: true,
      useAreaLighting: true,
      walkmeshOverlay: false
    });
    const firstSnapshot = JSON.parse(
      runtime.container?.dataset.areaTerrainTileModelRuntimeSnapshot ?? "{}"
    ) as Record<string, unknown>;

    rebuildTerrainMesh(runtime, secondScene, null, {
      textureCompression: "uastc",
      hiddenMeshes: false,
      ceilingMeshes: true,
      wireframe: false,
      textures: true,
      displayFog: true,
      useAreaLighting: true,
      walkmeshOverlay: false
    });
    const secondSnapshot = JSON.parse(
      runtime.container?.dataset.areaTerrainTileModelRuntimeSnapshot ?? "{}"
    ) as Record<string, unknown>;

    expect(firstSnapshot.tileStateDigest).toBe(buildAreaTileStateDigest(firstScene));
    expect(secondSnapshot.tileStateDigest).toBe(buildAreaTileStateDigest(secondScene));
    expect(firstSnapshot.terrainBuildId).not.toBe(secondSnapshot.terrainBuildId);
    expect(runtime.container?.dataset.areaTerrainTileStateDigest).toBe(
      buildAreaTileStateDigest(secondScene)
    );
  });
});
