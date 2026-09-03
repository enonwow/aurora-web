// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import * as THREE from "three";
import {
  clearTerrainMesh,
  rebuildTerrainMesh,
  resolveTerrainRenderStatus,
  resolveTerrainScenePackageReadiness,
  resolveTerrainTileModelAssetRequestIdentity
} from "../../../../src/modules/layout/adapters/three/workspaceTerrainMesh";
import type { AreaScene } from "../../../../src/modules/scene/contracts";
import type { AreaTileProcessContractReadiness } from "../../../../src/modules/tiles/application/areaTileProcessContractReadiness";
import { resolvePlaceableAssetDeliveryUrl } from "../../../../src/modules/placeables/application/placeableRenderAssetResolver";

function createRuntime() {
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

function createDebugState(
  overrides: Partial<Parameters<typeof rebuildTerrainMesh>[3]> = {}
): Parameters<typeof rebuildTerrainMesh>[3] {
  return {
    textureCompression: "uastc",
    hiddenMeshes: false,
    ceilingMeshes: true,
    wireframe: false,
    textures: true,
    displayFog: true,
    useAreaLighting: true,
    walkmeshOverlay: false,
    ...overrides
  };
}

function createScene(): AreaScene {
  return {
    sceneId: "area_tile_light_test",
    areaName: "Tile Light Test",
    width: 2,
    height: 1,
    source: "aurora_area",
    updatedAtUnixMs: 0,
    tileSource: {
      type: "aurora_tile_list",
      tilesetResRef: "tst01",
      tileCount: 2
    },
    tiles: [
      {
        id: "tile-dark",
        row: 0,
        col: 0,
        terrain: "corridor",
        orientation: 0,
        rotateTexture: false,
        plot: false
      },
      {
        id: "tile-lit",
        row: 0,
        col: 1,
        terrain: "corridor",
        orientation: 0,
        rotateTexture: false,
        plot: false,
        mainLight1: 3,
        mainLight1Color: {
          rowId: 3,
          red: 0.6,
          green: 0.7,
          blue: 1,
          sourceKey: "lightcolor.2da"
        },
        sourceLight1: 3,
        sourceLight1Color: {
          rowId: 3,
          red: 0.49,
          green: 0.29,
          blue: 0.07,
          sourceKey: "tilecolor.2da",
          sourceNode: {
            status: "source-node-resolved",
            slotIndex: 1,
            sourceNodeCount: 1,
            name: "tst01_a01_01sl1",
            position: [-1.25, 1.5, 1],
            coordinateSpace: "model-local-aurora-z-up",
            sourceModelFileName: "tst01_a01_01.mdl",
            sourceModelObjectKey: "modules/current/tiles/tst01_a01_01.mdl",
            sourceModelHash: "tile-model-sha256",
            proofStatus: "source-backed-tile-mdl-source-light-slot-count"
          }
        }
      }
    ],
    objects: []
  };
}

function createWalkmeshCollision(): NonNullable<AreaScene["auroraVfxCollision"]> {
  return {
    version: "aurora-area-vfx-collision/v1",
    coordinateSpace: "aurora-area-z-up",
    unitsPerTile: 10,
    status: "ready",
    fingerprint: "f".repeat(64),
    resources: [
      {
        resourceId: "walkmesh-square",
        modelResRef: "tst01_square",
        sourceObjectKey: "base/tst01_square.wok",
        sourceLayer: "vanilla",
        sourceHash: "a".repeat(64),
        walkmesh: {
          version: "aurora-wok-walkmesh/v1",
          sourceFormat: "aurora-wok-ascii",
          nodes: [
            {
              nodeName: "walkmesh",
              vertices: [
                { x: -5, y: -5, z: 0 },
                { x: 5, y: -5, z: 0 },
                { x: 5, y: 5, z: 0 },
                { x: -5, y: 5, z: 0 }
              ],
              faces: [
                { vertexIndices: [0, 1, 2], rawTokens: [0, 1, 2], sourceLineNumber: 1 },
                { vertexIndices: [0, 2, 3], rawTokens: [0, 2, 3], sourceLineNumber: 2 }
              ],
              aabbRecords: []
            }
          ],
          diagnostics: []
        }
      }
    ],
    instances: [
      {
        instanceId: "tile-dark",
        resourceId: "walkmesh-square",
        translation: { x: 5, y: 5, z: 0 },
        orientationQuarterTurns: 0
      },
      {
        instanceId: "tile-lit",
        resourceId: "walkmesh-square",
        translation: { x: 15, y: 5, z: 0 },
        orientationQuarterTurns: 0
      }
    ],
    diagnostics: []
  };
}

function createTileLightBudgetScene(tileCount: number): AreaScene {
  return {
    sceneId: "area_tile_light_budget_test",
    areaName: "Tile Light Budget Test",
    width: tileCount,
    height: 1,
    source: "aurora_area",
    updatedAtUnixMs: 0,
    tileSource: {
      type: "aurora_tile_list",
      tilesetResRef: "tst01",
      tileCount
    },
    tiles: Array.from({ length: tileCount }, (_, index) => ({
      id: `tile-light-budget-${String(index).padStart(3, "0")}`,
      row: 0,
      col: index,
      terrain: "corridor",
      orientation: 0,
      rotateTexture: false,
      plot: false,
      sourceLight1: index + 1,
      sourceLight1Color: {
        rowId: index + 1,
        red: 1,
        green: 0.8,
        blue: 0.6,
        sourceKey: "tilecolor.2da",
        sourceNode: {
          status: "source-node-resolved" as const,
          slotIndex: 1 as const,
          sourceNodeCount: 1,
          name: `tst01_a01_${String(index).padStart(2, "0")}sl1`,
          position: [0, 0, 1] as [number, number, number],
          coordinateSpace: "model-local-aurora-z-up" as const,
          sourceModelFileName: `tst01_a01_${String(index).padStart(2, "0")}.mdl`,
          sourceModelObjectKey: `modules/current/tiles/tst01_a01_${String(index).padStart(2, "0")}.mdl`,
          sourceModelHash: `tile-model-sha256-${index}`,
          proofStatus: "source-backed-tile-mdl-source-light-slot-count" as const
        }
      }
    })),
    objects: []
  };
}

function createReadyTileProcessReadiness(
  modelResRef: string,
  deliveryUrl: string
): AreaTileProcessContractReadiness {
  return {
    status: "ready",
    areaId: "area_tile_shadow_receiver_test",
    checkedCandidateCount: 1,
    readyCandidateCount: 1,
    blockedCandidateCount: 0,
    candidateSample: modelResRef,
    readySample: modelResRef,
    sourceObjectKeySample: "tiles/tst01.mdl",
    sourceAssetContractSample: "ready",
    blockerSummary: "none",
    sourceAssetReadyCount: 1,
    sourceAssetBlockedCount: 0,
    mdlSourceReadyCount: 1,
    mdlSourceBlockedCount: 0,
    glbGeometryReadyCount: 1,
    glbGeometryBlockedCount: 0,
    materialTextureContractReadyCount: 0,
    materialBindingBlockedCount: 0,
    renderLoaderReadyCount: 1,
    renderLoaderBlockedCount: 0,
    textureMaterialBlockerSummary: "none",
    renderAssetContractBlockerSummary: "none",
    mdlGlbMaterialBlockerSummary: "none",
    entries: [
      {
        modelResRef,
        tileId: "tile-shadow-receiver",
        status: "ready",
        processStatus: "ready",
        textureContractStatus: "not_checked",
        mdlSourceAssetStatus: "mdl_source_object_key_proven",
        glbGeometryStatus: "ready",
        materialReadinessStatus: "ready",
        sourceAssetContractStatus: "ready",
        renderLoaderHandoffStatus: "ready",
        modelDeliveryStatus: "ready",
        modelDeliveryUrl: deliveryUrl,
        modelAssetObjectKey: "tiles/tst01.glb",
        modelAssetExtension: "glb",
        renderAssetContractBlockers: "none",
        mdlGlbMaterialBlockers: "none"
      }
    ]
  };
}

function terrainModelCacheKey(modelResRef: string, deliveryUrl: string): string {
  return `${resolveTerrainTileModelAssetRequestIdentity(
    { modelResRef },
    { modelResRef, deliveryUrl: resolvePlaceableAssetDeliveryUrl(deliveryUrl) }
  ).runtimeCacheKey}|sourceHierarchy:preserve-loaded`;
}

afterEach(() => {
  vi.restoreAllMocks();
});

function mockCanvasContext(): void {
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
}

describe("workspaceTerrainMesh tile lights", () => {
  it("reports ready GLB geometry only after the matching tile contract is proven", () => {
    const modelResRef = "tst01_a01_02";
    const deliveryUrl = "http://localhost:3000/api/v1/render-assets/tile-status.glb";
    const scene: AreaScene = {
      ...createScene(),
      width: 1,
      height: 1,
      tiles: [{
        id: "tile-status",
        row: 0,
        col: 0,
        terrain: "corridor",
        orientation: 0,
        rotateTexture: false,
        plot: false,
        modelResRef,
        modelSource: "set"
      }]
    };
    const readiness = createReadyTileProcessReadiness(modelResRef, deliveryUrl);
    const status = resolveTerrainRenderStatus(scene, readiness);
    const packageReadiness = resolveTerrainScenePackageReadiness(scene, status, readiness);

    expect(status.renderGenericMesh).toBe(false);
    expect(status.label).toContain("Aurora tile models loaded");
    expect(packageReadiness.status).toBe("ready");
    expect(packageReadiness.glbAvailabilityStatus).toBe("ready_glb_contracts_proven");
    expect(packageReadiness.tileRenderGeometryMode).toBe("glb_models");
    expect(packageReadiness.blockers).not.toContain("tile_glb_contract_missing");
  });

  it("renders tile main/source light colors as runtime PointLights", () => {
    mockCanvasContext();
    const runtime = createRuntime();

    rebuildTerrainMesh(runtime, createScene(), null, createDebugState());

    const layer = runtime.scene.getObjectByName("terrain-tile-light-sources");
    expect(layer).toBeDefined();
    expect(runtime.scene.userData.auroraTerrainTileLightSourceCount).toBe(2);
    expect(runtime.scene.userData.auroraTerrainTileLightTileCount).toBe(1);
    expect(runtime.scene.userData.auroraTerrainTileLightChannels).toContain(
      "tile-lit:mainLight1:3"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightChannels).toContain(
      "tile-lit:sourceLight1:3"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightColorSample).toContain(
      "tile-lit:mainLight1:3:0.6:0.7:1"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightColorSample).toContain(
      "tile-lit:sourceLight1:3:1.9:1.9:1"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightSourceKeySample).toContain(
      "tile-lit:mainLight1:lightcolor.2da"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightSourceKeySample).toContain(
      "tile-lit:sourceLight1:fx_flame01.mdl"
    );

    const pointLights: THREE.PointLight[] = [];
    const sourceGroups: THREE.Object3D[] = [];
    const diagnosticMarkers: THREE.Object3D[] = [];
    layer?.traverse((node) => {
      if (node instanceof THREE.PointLight) {
        pointLights.push(node);
      }
      if (node.userData?.auroraTerrainTileLightChannel === "sourceLight1") {
        sourceGroups.push(node);
      }
      if (node.userData?.auroraTerrainTileLightMarker === true) {
        diagnosticMarkers.push(node);
      }
    });

    expect(pointLights).toHaveLength(1);
    expect(diagnosticMarkers).toHaveLength(0);
    const mainGroup = layer?.getObjectByName("terrain-tile-light-tile-lit-mainLight1");
    expect(mainGroup?.userData.auroraTerrainTileLightRendererMode).toBe(
      "static-tile-lightcolor-table-diagnostic"
    );
    expect(mainGroup?.userData.auroraTerrainTileLightRadiusProofStatus).toBe(
      "source-backed-tile-main-lightcolor-static-no-point-radius"
    );
    expect(mainGroup?.userData.auroraTerrainTileLightFalloffFormula).toBe(
      "not-applicable-static-tile-lightcolor"
    );
    expect(mainGroup?.userData.auroraTerrainTileLightFalloffProofStatus).toBe(
      "source-backed-tile-main-lightcolor-static-no-point-radius"
    );
    expect(mainGroup?.userData.auroraTerrainTileLightFalloffRendererProofStatus).toBeUndefined();
    expect(mainGroup?.userData.auroraTerrainTileLightDistanceSource).toContain(
      "resolves RGB channels for Tile_MainLight1/Tile_MainLight2"
    );
    const sourceLight = pointLights.find(
      (light) => light.userData.auroraTerrainTileLightChannel === "sourceLight1"
    );
    expect(sourceLight).toBeDefined();
    expect(sourceLight?.userData.auroraTerrainTileLightColor).toEqual([
      Math.fround(1.9),
      Math.fround(1.9),
      1
    ]);
    expect(sourceLight?.userData.auroraTerrainTileLightPreviewColor).toEqual([
      1,
      1,
      1 / Math.fround(1.9)
    ]);
    expect(sourceLight?.userData.auroraTerrainTileLightIntensity).toBeCloseTo(
      Math.fround(1.9),
      5
    );
    expect(sourceLight?.intensity).toBeCloseTo(Math.fround(1.9), 5);
    expect(sourceLight?.userData.auroraTerrainTileLightIntensitySource).toContain(
      "color * max(0,1-distance/radius) * multiplier"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightIntensityProofStatus).toBe(
      "source-backed-fx_flame01-animation-color-partlight-default-multiplier"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightSourceMultiplier).toBe(1);
    expect(sourceLight?.userData.auroraTerrainTileLightSourceMultiplierSource).toContain(
      "PartLight::PartLight"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightSourceAnimationName).toBe("3");
    expect(sourceLight?.userData.auroraTerrainTileLightColorSource).toContain(
      "fx_flame01.mdl"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightStaleColorCorrectionStatus).toBe(
      "corrected-stale-tilecolor-source"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightDistance).toBeCloseTo(0.7, 5);
    expect(sourceLight?.distance).toBeCloseTo(0.7, 5);
    expect(sourceLight?.decay).toBe(1);
    expect(sourceLight?.userData.auroraTerrainTileLightDistanceSource).toContain(
      "fx_flame01.mdl AuroraLight01 controller radius 0x58 = 7"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightRadiusProofStatus).toBe(
      "source-backed-fx_flame01-auroralight01-radius-controller"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightFalloffFormula).toBe(
      "1/(1+4.5*(distance/radius)^2)"
    );
    expect(["installed", "already-installed"]).toContain(
      sourceLight?.userData.auroraTerrainTileLightFalloffRendererPatchStatus
    );
    expect(sourceLight?.userData.auroraTerrainTileLightFalloffRendererProofStatus).toBe(
      "source-backed-gamma0-quadratic-surface-falloff-profile-parity-pending"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightFalloffRendererSource).toContain(
      "lightQuadraticAtten=9/(max(radius,0.1)^2*2)"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightSourceModelFileName).toBe(
      "fx_flame01.mdl"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightSourceRadius).toBe(7);
    expect(sourceLight?.userData.auroraTerrainTileLightSourceRadiusUnits).toBe(
      "aurora-model-units"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightSourceUnitScale).toBe(0.1);
    expect(
      sourceLight?.userData.auroraTerrainTileLightSourceUnitScaleSource
    ).toBe("tile MDL Aurora model units scaled by TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE");
    expect(
      sourceLight?.userData.auroraTerrainTileLightSourceRadiusWorldDistance
    ).toBeCloseTo(0.7, 5);
    expect(
      sourceLight?.userData.auroraTerrainTileLightSourceRadiusWorldDistanceSource
    ).toBe(
      "fx_flame01.mdl source radius multiplied by TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightSourceShadowRadius).toBe(15);
    expect(sourceLight?.userData.auroraTerrainTileLightSourceVerticalDisplacement).toBe(
      2
    );
    expect(sourceLight?.userData.auroraTerrainTileLightRetailScoreSource).toContain(
      "FUN_00a41850"
    );
    expect(
      sourceLight?.userData.auroraTerrainTileLightRetailScoreActiveSelectionRadiusOverride
    ).toBeCloseTo(1.5, 5);
    expect(
      sourceLight?.userData.auroraTerrainTileLightRetailScoreActiveSelectionRadiusLimit
    ).toBeCloseTo(1.5, 5);
    expect(
      sourceLight?.userData.auroraTerrainTileLightRetailScoreActiveSelectionRadiusEnforced
    ).toBe(false);
    expect(sourceLight?.userData.auroraTerrainTileLightRetailScoreActiveSelectionRadiusSource).toContain(
      "FUN_00a42728"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightRendererMode).toBe(
      "point-light-preview"
    );
    expect(sourceLight?.color.r).toBeCloseTo(1, 5);
    expect(sourceLight?.color.g).toBeCloseTo(1, 5);
    expect(sourceLight?.color.b).toBeCloseTo(1 / Math.fround(1.9), 5);
    expect(runtime.scene.userData.auroraTerrainTileLightPreviewColorSample).toContain(
      "tile-lit:sourceLight1:3:1:1:0.526"
    );

    const sourceGroup = sourceGroups.find(
      (node) => node.userData?.auroraTerrainTileLightPreviewStatus === "active"
    );
    expect(sourceGroup?.position.x).toBeCloseTo(1.375, 5);
    expect(sourceGroup?.position.y).toBeCloseTo(0.1, 5);
    expect(sourceGroup?.position.z).toBeCloseTo(0.65, 5);
    expect(sourceGroup?.userData.auroraTerrainTileLightRendererMode).toBe(
      "point-light-preview"
    );
    expect(sourceGroup?.userData.auroraTerrainTileLightPositionSource).toBe(
      "nwtoolset.exe FUN_007125ec 0x007131d9..0x00713351 creates fx_flame01 sourcelight1/2 carriers only when tile model vcall +0x74 reports slot count >0/>1"
    );
    expect(sourceGroup?.userData.auroraTerrainTileLightRadiusProofStatus).toBe(
      "source-backed-fx_flame01-auroralight01-radius-controller"
    );
  });

  it("renders a main light from its source MDL native node contract", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const scene = createScene();
    scene.tiles[1] = {
      ...scene.tiles[1],
      mainLight1Color: {
        ...scene.tiles[1].mainLight1Color!,
        nativeNode: {
          status: "main-native-node-resolved",
          name: "tst01_a01_01ml1",
          position: [0, 0, 5],
          coordinateSpace: "model-local-aurora-z-up",
          radius: 14,
          multiplier: 1,
          lightPriority: 5,
          ambientOnly: false,
          affectDynamic: true,
          shadow: false,
          sourceModelFileName: "tst01_a01_01.mdl",
          sourceModelObjectKey: "modules/current/tiles/tst01_a01_01.mdl",
          sourceModelHash: "tile-model-sha256",
          proofStatus: "source-backed-tile-mdl-native-main-light"
        }
      }
    };

    rebuildTerrainMesh(runtime, scene, null, createDebugState());

    const layer = runtime.scene.getObjectByName("terrain-tile-light-sources");
    const mainLight = layer?.getObjectByName(
      "terrain-tile-light-tile-lit-mainLight1-point"
    ) as THREE.PointLight | undefined;
    expect(mainLight).toBeInstanceOf(THREE.PointLight);
    expect(mainLight?.position.toArray()).toEqual([
      expect.closeTo(0, 8),
      expect.closeTo(0, 8),
      expect.closeTo(0, 8)
    ]);
    const mainGroup = layer?.getObjectByName(
      "terrain-tile-light-tile-lit-mainLight1"
    );
    expect(mainGroup?.position.toArray()).toEqual([
      expect.closeTo(1.5, 8),
      expect.closeTo(0.5, 8),
      expect.closeTo(0.5, 8)
    ]);
    expect(mainLight?.distance).toBeCloseTo(1.4, 8);
    expect(mainLight?.decay).toBe(1);
    expect(mainLight?.intensity).toBeCloseTo(1, 8);
    expect(mainLight?.userData.auroraTerrainTileLightRendererMode).toBe(
      "native-tile-mdl-point-light"
    );
    expect(mainLight?.userData.auroraTerrainTileLightSourceNodeName).toBe(
      "tst01_a01_01ml1"
    );
    expect(mainLight?.userData.auroraTerrainTileLightSourceModelHash).toBe(
      "tile-model-sha256"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightResolvedMainCount).toBe(1);
    expect(runtime.scene.userData.auroraTerrainTileLightUnresolvedMainCount).toBe(0);
  });

  it("keeps procedural tile-light markers behind the non-render debug toggle", () => {
    mockCanvasContext();
    const runtime = createRuntime();

    rebuildTerrainMesh(
      runtime,
      createScene(),
      null,
      createDebugState({ showNonRenderMeshes: true })
    );

    const markers: THREE.Object3D[] = [];
    runtime.scene.traverse((node) => {
      if (node.userData?.auroraTerrainTileLightMarker === true) {
        markers.push(node);
      }
    });

    expect(markers).toHaveLength(2);
  });

  it("uses the source-precedence MDL sourcelight slot contract without a GLB fallback", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const scene = createScene();

    rebuildTerrainMesh(runtime, scene, null, createDebugState());

    const layer = runtime.scene.getObjectByName("terrain-tile-light-sources");
    const sourceGroup = layer?.getObjectByName("terrain-tile-light-tile-lit-sourceLight1");
    expect(sourceGroup).toBeDefined();
    expect(sourceGroup?.userData.auroraTerrainTileLightPositionSource).toBe(
      "nwtoolset.exe FUN_007125ec 0x007131d9..0x00713351 creates fx_flame01 sourcelight1/2 carriers only when tile model vcall +0x74 reports slot count >0/>1"
    );
    expect(sourceGroup?.position.x).toBeCloseTo(1.375, 5);
    expect(sourceGroup?.position.y).toBeCloseTo(0.1, 5);
    expect(sourceGroup?.position.z).toBeCloseTo(0.65, 5);
    expect(sourceGroup?.userData.auroraTerrainTileLightPositionSource).toBe(
      "nwtoolset.exe FUN_007125ec 0x007131d9..0x00713351 creates fx_flame01 sourcelight1/2 carriers only when tile model vcall +0x74 reports slot count >0/>1"
    );
    expect(sourceGroup?.userData.auroraTerrainTileLightPositionProofStatus).toBe(
      "source-backed-tile-mdl-source-light-slot-count"
    );
    expect(sourceGroup?.userData.auroraTerrainTileLightSourceNodeKind).toBe(
      "tst01_a01_01sl1"
    );
    expect(sourceGroup?.userData.auroraTerrainTileLightHostNodeStatus).toBe(
      "source-node-resolved"
    );
  });

  it("does not synthesize a source light when Aurora reports no tile source slot", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const scene = createScene();
    scene.tiles[1] = {
      ...scene.tiles[1],
      sourceLight1Color: {
        ...scene.tiles[1].sourceLight1Color!,
        sourceNode: {
          status: "source-node-absent-by-aurora-slot-count",
          slotIndex: 1,
          sourceNodeCount: 0,
          sourceModelFileName: "tst01_a01_01.mdl",
          sourceModelObjectKey: "modules/current/tiles/tst01_a01_01.mdl",
          sourceModelHash: "tile-model-sha256",
          proofStatus: "source-backed-tile-mdl-source-light-slot-count"
        }
      }
    };

    rebuildTerrainMesh(runtime, scene, null, createDebugState());

    const pointLights: THREE.PointLight[] = [];
    runtime.scene.traverse((node) => {
      if (node instanceof THREE.PointLight) pointLights.push(node);
    });
    expect(pointLights).toHaveLength(0);
    expect(runtime.scene.userData.auroraTerrainTileLightResolvedSourceCount).toBe(0);
    expect(runtime.scene.userData.auroraTerrainTileLightSourceNodeAbsentCount).toBe(1);
    expect(runtime.scene.userData.auroraTerrainTileLightUnresolvedSourceCount).toBe(0);
    expect(runtime.scene.userData.auroraTerrainTileLightSourceReferenceCount).toBe(1);
  });

  it("marks loaded terrain tile meshes as Three shadow receivers for ARE global shadows", async () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const modelResRef = "tst01_a01_01";
    const deliveryUrl = "http://localhost:3000/api/v1/render-assets/tile-shadow.glb";
    const cachedModel = new THREE.Group();
    const terrainMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.1, 1),
      new THREE.MeshStandardMaterial({ name: "terrain-stone" })
    );
    terrainMesh.name = "tile-shadow-ground";
    cachedModel.add(terrainMesh);
    runtime.placeableModelCacheByUrl.set(
      terrainModelCacheKey(modelResRef, deliveryUrl),
      cachedModel
    );

    const scene: AreaScene = {
      ...createScene(),
      width: 1,
      height: 1,
      tiles: [
        {
          id: "tile-shadow-receiver",
          row: 0,
          col: 0,
          terrain: "corridor",
          orientation: 0,
          rotateTexture: false,
          plot: false,
          modelResRef,
          modelSource: "set"
        }
      ]
    };

    rebuildTerrainMesh(
      runtime,
      scene,
      null,
      createDebugState(),
      createReadyTileProcessReadiness(modelResRef, deliveryUrl)
    );
    const layer = runtime.scene.getObjectByName("terrain-backend-tile-models");
    await waitFor(() =>
      expect(layer?.getObjectByName("tile-shadow-ground")).toBeInstanceOf(THREE.Mesh)
    );
    const loadedMesh = layer?.getObjectByName("tile-shadow-ground") as THREE.Mesh;
    const snapshot = runtime.scene.userData
      .auroraTerrainTileModelRuntimeSnapshot as
      | { shadowReceiverMeshCount?: number; shadowReceiverSample?: string }
      | undefined;

    expect(loadedMesh).toBeInstanceOf(THREE.Mesh);
    expect(loadedMesh?.receiveShadow).toBe(true);
    expect(loadedMesh?.userData.auroraTerrainTileShadowReceiver).toBe(true);
    expect(loadedMesh?.userData.auroraTerrainTileShadowReceiverStatus).toBe(
      "three-preview-terrain-receiveShadow-enabled"
    );
    expect(snapshot?.shadowReceiverMeshCount).toBe(1);
    expect(snapshot?.shadowReceiverSample).toContain(
      "tile-shadow-receiver:tile-shadow-ground:receiveShadow=1"
    );
    expect(runtime.container?.dataset.areaTerrainTileShadowReceiverMeshCount).toBe(
      "1"
    );
    expect(runtime.container?.dataset.areaTerrainTileShadowReceiverStatus).toBe(
      "three-preview-terrain-receiveShadow-enabled"
    );
    expect(runtime.container?.dataset.areaTerrainTileShadowReceiverSource).toBe(
      "ARE SunShadows/MoonShadows directional-light preview receiver; retail shadow-plane projection not recovered"
    );
  });

  it("places loaded tile models with ARE orientation instead of adding loader root yaw", async () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const modelResRef = "tst01_a01_02";
    const deliveryUrl = "http://localhost:3000/api/v1/render-assets/tile-yaw.glb";
    const cachedModel = new THREE.Group();
    cachedModel.rotation.y = Math.PI / 4;
    runtime.placeableModelCacheByUrl.set(
      terrainModelCacheKey(modelResRef, deliveryUrl),
      cachedModel
    );
    const scene: AreaScene = {
      ...createScene(),
      width: 1,
      height: 1,
      tiles: [
        {
          id: "tile-yaw-placement",
          row: 0,
          col: 0,
          terrain: "corridor",
          orientation: 1,
          rotateTexture: false,
          plot: false,
          modelResRef,
          modelSource: "set"
        }
      ]
    };

    rebuildTerrainMesh(
      runtime,
      scene,
      null,
      createDebugState(),
      createReadyTileProcessReadiness(modelResRef, deliveryUrl)
    );
    const layer = runtime.scene.getObjectByName("terrain-backend-tile-models");
    await waitFor(() =>
      expect(
        layer?.getObjectByName("terrain-backend-tile-model-tile-yaw-placement")
      ).toBeDefined()
    );
    const loadedModel = layer?.getObjectByName(
      "terrain-backend-tile-model-tile-yaw-placement"
    );

    expect(loadedModel?.rotation.y).toBeCloseTo((3 * Math.PI) / 2);
    expect(loadedModel?.rotation.y).not.toBeCloseTo((7 * Math.PI) / 4);
  });

  it("renders ARE global sun lighting and fog as runtime scene lighting", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const scene: AreaScene = {
      ...createScene(),
      lighting: {
        source: "are-root-fields",
        fields: [
          { field: "IsNight", value: 0 },
          { field: "MoonShadows", value: 0 },
          { field: "SunShadows", value: 1 },
          { field: "SunAmbientColor", value: 0x112233 },
          { field: "SunDiffuseColor", value: 0x445566 },
          { field: "SunFogColor", value: 0x778899 },
          { field: "SunFogAmount", value: 12 },
          { field: "FogClipDist", value: 80 },
          { field: "ShadowOpacity", value: 50 }
        ]
      }
    };

    rebuildTerrainMesh(runtime, scene, null, createDebugState());

    const layer = runtime.scene.getObjectByName("terrain-area-global-lighting");
    expect(layer).toBeDefined();
    expect(runtime.scene.userData.auroraTerrainAreaGlobalLightingStatus).toBe(
      "active"
    );
    expect(runtime.scene.userData.auroraTerrainAreaGlobalLightingPhase).toBe(
      "sun"
    );
    expect(runtime.scene.userData.auroraTerrainAreaGlobalLightingFieldCount).toBe(9);
    expect(runtime.scene.userData.auroraTerrainAreaGlobalLightingFields).toContain(
      "SunAmbientColor:1122867"
    );

    const ambient = layer?.getObjectByName("terrain-area-global-ambient-light");
    const directional = layer?.getObjectByName("terrain-area-global-diffuse-light");
    expect(ambient).toBeInstanceOf(THREE.AmbientLight);
    expect(directional).toBeInstanceOf(THREE.DirectionalLight);
    const ambientLight = ambient as THREE.AmbientLight;
    const directionalLight = directional as THREE.DirectionalLight;
    expect(ambientLight.color.r).toBeCloseTo(Math.pow(0x33 / 255, 2.2), 8);
    expect(ambientLight.color.g).toBeCloseTo(Math.pow(0x22 / 255, 2.2), 8);
    expect(ambientLight.color.b).toBeCloseTo(Math.pow(0x11 / 255, 2.2), 8);
    expect(ambientLight.userData.auroraTerrainAreaGlobalLightColor).toEqual([
      0x33 / 255,
      0x22 / 255,
      0x11 / 255
    ]);
    expect(ambientLight.userData.auroraTerrainAreaGlobalRenderedLightColorLinear).toEqual([
      Math.pow(0x33 / 255, 2.2),
      Math.pow(0x22 / 255, 2.2),
      Math.pow(0x11 / 255, 2.2)
    ]);
    expect(ambientLight.intensity).toBeCloseTo(1, 5);
    expect(ambientLight.userData.auroraTerrainAreaGlobalLightIntensitySource).toBe(
      "C:/Projects/New Folder/export/decompiled_all.c:256239-256303 selects Sun/Moon ambient+diffuse fields by IsNight, unpacks packed channels as byte0/byte1/byte2 divided by 255.0, then sends controlpart gidy_sun_amb/gidy_sun_diff color commands; Aurora Web uses Three intensity 1.0 so the source color carries the scalar"
    );
    expect(directionalLight.color.r).toBeCloseTo(Math.pow(0x66 / 255, 2.2), 8);
    expect(directionalLight.color.g).toBeCloseTo(Math.pow(0x55 / 255, 2.2), 8);
    expect(directionalLight.color.b).toBeCloseTo(Math.pow(0x44 / 255, 2.2), 8);
    expect(directionalLight.userData.auroraTerrainAreaGlobalLightColor).toEqual([
      0x66 / 255,
      0x55 / 255,
      0x44 / 255
    ]);
    expect(directionalLight.userData.auroraTerrainAreaGlobalRenderedLightColorLinear).toEqual([
      Math.pow(0x66 / 255, 2.2),
      Math.pow(0x55 / 255, 2.2),
      Math.pow(0x44 / 255, 2.2)
    ]);
    expect(directionalLight.intensity).toBeCloseTo(1, 5);
    expect(directionalLight.castShadow).toBe(true);
    expect(directionalLight.userData.auroraTerrainAreaGlobalLightIntensitySource).toBe(
      "C:/Projects/New Folder/export/decompiled_all.c:256239-256303 selects Sun/Moon ambient+diffuse fields by IsNight, unpacks packed channels as byte0/byte1/byte2 divided by 255.0, then sends controlpart gidy_sun_amb/gidy_sun_diff color commands; Aurora Web uses Three intensity 1.0 so the source color carries the scalar"
    );
    expect(directionalLight.userData.auroraTerrainAreaGlobalShadowOpacity).toBe(50);
    expect(directionalLight.userData.auroraTerrainAreaGlobalShadowOpacitySource).toBe(
      "ARE.ShadowOpacity read/write at decompiled_all.c:255224/255904; normalized to shadowOpacity/100 at decompiled_all.c:256306"
    );
    expect(directionalLight.userData.auroraTerrainAreaGlobalShadowOpacityFactor).toBeCloseTo(
      0.5,
      5
    );
    expect(directionalLight.userData.auroraTerrainAreaGlobalShadowOpacityFactorSource).toBe(
      "decompiled_all.c:256306 stores ShadowOpacity/100, then shadow plane alpha multiplies that factor at decompiled_all.c:910844"
    );
    expect(directionalLight.userData.auroraTerrainAreaGlobalShadowStatus).toBe(
      "enabled"
    );
    expect(directionalLight.userData.auroraTerrainAreaGlobalShadowSourceField).toBe(
      "SunShadows"
    );
    expect(directionalLight.userData.auroraTerrainAreaGlobalShadowStatusSource).toBe(
      "decompiled ARE SunShadows/MoonShadows/IsNight fields at decompiled_all.c:255208-255218 and decompiled_all.c:255894-255901"
    );
    expect(directionalLight.userData.auroraTerrainAreaGlobalShadowImplementationStatus).toBe(
      "three-directional-shadow-map-calibrated-shadow-volume-not-ported"
    );
    expect(directionalLight.shadow.bias).toBe(-0.0005);
    expect(directionalLight.shadow.normalBias).toBe(0.02);
    expect(directionalLight.shadow.mapSize.x).toBe(2048);
    expect(directionalLight.shadow.mapSize.y).toBe(2048);
    expect(directionalLight.shadow.radius).toBe(2);
    expect(directionalLight.userData.auroraTerrainAreaGlobalShadowMapPreviewSource).toBe(
      "Three directional-shadow preview calibrated against bci01 Plane07 runtime proof; retail Aurora shadow-volume projection is not ported"
    );
    expect(runtime.scene.userData.auroraTerrainAreaGlobalShadowStatus).toBe(
      "enabled"
    );
    expect(runtime.scene.userData.auroraTerrainAreaGlobalShadowSourceField).toBe(
      "SunShadows"
    );

    expect(runtime.scene.fog).toBeInstanceOf(THREE.Fog);
    const fog = runtime.scene.fog as THREE.Fog;
    expect(fog.color.r).toBeCloseTo(0x99 / 255, 5);
    expect(fog.color.g).toBeCloseTo(0x88 / 255, 5);
    expect(fog.color.b).toBeCloseTo(0x77 / 255, 5);
    expect(fog.near).toBeCloseTo(0.5, 5);
    expect(fog.far).toBeCloseTo(8, 5);
    expect(layer?.userData.auroraTerrainAreaGlobalFogStatus).toBe("active");
    expect(layer?.userData.auroraTerrainAreaGlobalFogClipDistance).toBe(80);
    expect(layer?.userData.auroraTerrainAreaGlobalFogAmount).toBe(12);
    expect(layer?.userData.auroraTerrainAreaGlobalFogRangeSource).toBe(
      "C:/Projects/New Folder/export/decompiled_all.c:368987-369024 enables scene fog, selects Sun/Moon FogAmount/FogColor by IsNight, unpacks color as byte0/byte1/byte2 divided by 255.0, computes fog start as 25 - FogAmount*25/15, and reads FogClipDist from area offset +0x100 for fog end; Aurora Web scales those Aurora metre values to tile space for Three.Fog"
    );
  });

  it("suppresses workspace preview lights while source-backed ARE lighting is active", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const previewAmbient = new THREE.AmbientLight(0xffffff, 0.68);
    previewAmbient.name = "workspace-default-preview-ambient-light";
    previewAmbient.userData.auroraWorkspaceDefaultPreviewLight = true;
    const previewDirectional = new THREE.DirectionalLight(0xffffff, 0.78);
    previewDirectional.name = "workspace-default-preview-directional-light";
    previewDirectional.userData.auroraWorkspaceDefaultPreviewLight = true;
    runtime.scene.add(previewAmbient, previewDirectional);
    const scene: AreaScene = {
      ...createScene(),
      lighting: {
        source: "are-root-fields",
        fields: [
          { field: "IsNight", value: 1 },
          { field: "MoonAmbientColor", value: 0x3c3c3c },
          { field: "MoonDiffuseColor", value: 0xaaaaaa }
        ]
      }
    };

    rebuildTerrainMesh(runtime, scene, null, createDebugState());

    expect(previewAmbient.visible).toBe(false);
    expect(previewDirectional.visible).toBe(false);
    expect(runtime.scene.userData.auroraWorkspaceDefaultPreviewLightingStatus).toBe(
      "suppressed-source-backed-are-lighting-active"
    );
    expect(runtime.scene.userData.auroraWorkspaceDefaultPreviewLightingSource).toContain(
      "not an Aurora runtime light"
    );

    clearTerrainMesh(runtime);

    expect(previewAmbient.visible).toBe(true);
    expect(previewDirectional.visible).toBe(true);
    expect(runtime.scene.userData.auroraWorkspaceDefaultPreviewLightingStatus).toBe(
      "active-no-source-backed-are-lighting"
    );
  });

  it("clears ARE ShadowOpacity factor diagnostics with the terrain lighting layer", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const scene: AreaScene = {
      ...createScene(),
      lighting: {
        source: "are-root-fields",
        fields: [
          { field: "IsNight", value: 0 },
          { field: "SunShadows", value: 1 },
          { field: "SunAmbientColor", value: 0x112233 },
          { field: "SunDiffuseColor", value: 0x445566 },
          { field: "ShadowOpacity", value: 50 }
        ]
      }
    };

    rebuildTerrainMesh(runtime, scene, null, createDebugState());
    expect(runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactor).toBe(0.5);
    expect(runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactorSource).toBe(
      "decompiled_all.c:256306 stores ShadowOpacity/100, then shadow plane alpha multiplies that factor at decompiled_all.c:910844"
    );

    clearTerrainMesh(runtime);

    expect(
      runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactor
    ).toBeUndefined();
    expect(
      runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactorSource
    ).toBeUndefined();
  });

  it("renders and disposes a real source-WOK debug line layer instead of recoloring tile bridges", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const scene: AreaScene = {
      ...createScene(),
      auroraVfxCollision: createWalkmeshCollision()
    };

    rebuildTerrainMesh(runtime, scene, null, createDebugState({ walkmeshOverlay: true }));

    const layer = runtime.scene.getObjectByName("terrain-source-wok-overlay");
    const lines = layer?.getObjectByName("terrain-source-wok-lines");
    expect(layer).toBeInstanceOf(THREE.Group);
    expect(lines).toBeInstanceOf(THREE.LineSegments);
    expect((lines as THREE.LineSegments).geometry.getAttribute("position").count).toBe(24);
    expect(layer?.userData).toMatchObject({
      auroraTerrainWokOverlayStatus: "ready",
      auroraTerrainWokOverlayInstanceCount: 2,
      auroraTerrainWokOverlaySegmentCount: 12,
      auroraTerrainWokOverlayEvidenceBoundary:
        "source-wok-geometry-only-no-path-connect-or-traversability-claim"
    });
    expect(runtime.scene.userData.auroraTerrainWokOverlayStatus).toBe("ready");

    clearTerrainMesh(runtime);

    expect(runtime.scene.getObjectByName("terrain-source-wok-overlay")).toBeUndefined();
    expect(runtime.scene.userData.auroraTerrainWokOverlayStatus).toBeUndefined();
  });

  it("keeps lighting evidence but suppresses tile/global lights when Use Area Lighting is off", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const scene: AreaScene = {
      ...createScene(),
      lighting: {
        source: "are-root-fields",
        fields: [
          { field: "IsNight", value: 0 },
          { field: "SunAmbientColor", value: 0x112233 },
          { field: "SunDiffuseColor", value: 0x445566 }
        ]
      }
    };

    rebuildTerrainMesh(runtime, scene, null, {
      ...createDebugState(),
      useAreaLighting: false
    });

    expect(runtime.scene.getObjectByName("terrain-tile-light-sources")).toBeUndefined();
    expect(runtime.scene.getObjectByName("terrain-area-global-lighting")).toBeUndefined();
    expect(runtime.scene.userData.auroraTerrainTileLightCandidateCount).toBe(1);
    expect(runtime.scene.userData.auroraTerrainTileLightAcceptedCount).toBe(1);
    expect(runtime.scene.userData.auroraTerrainTileLightStaticMainCount).toBe(1);
    expect(runtime.scene.userData.auroraTerrainTileLightDynamicSourceCount).toBe(1);
    expect(runtime.scene.userData.auroraTerrainTileLightStatus).toBe("available_disabled");
    expect(runtime.scene.userData.auroraTerrainAreaGlobalLightingStatus).toBe(
      "available_disabled"
    );
  });

  it("does not render a guessed white tile light when 2DA RGB metadata is missing", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const scene: AreaScene = {
      ...createScene(),
      tiles: [
        {
          id: "tile-missing-rgb",
          row: 0,
          col: 0,
          terrain: "corridor",
          orientation: 0,
          rotateTexture: false,
          plot: false,
          mainLight1: 3
        }
      ]
    };

    rebuildTerrainMesh(runtime, scene, null, createDebugState());

    expect(runtime.scene.getObjectByName("terrain-tile-light-sources")).toBeUndefined();
    expect(runtime.scene.userData.auroraTerrainTileLightSourceCount).toBe(0);
    expect(runtime.scene.userData.auroraTerrainTileLightCandidateCount).toBe(0);
    expect(runtime.scene.userData.auroraTerrainTileLightStatus).toBe("missing");
  });

  it("keeps ARE lights active while suppressing fog when Display Fog is off", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const scene: AreaScene = {
      ...createScene(),
      lighting: {
        source: "are-root-fields",
        fields: [
          { field: "IsNight", value: 0 },
          { field: "SunAmbientColor", value: 0x112233 },
          { field: "SunDiffuseColor", value: 0x445566 },
          { field: "SunFogColor", value: 0x778899 },
          { field: "SunFogAmount", value: 40 },
          { field: "FogClipDist", value: 80 }
        ]
      }
    };

    rebuildTerrainMesh(runtime, scene, null, {
      ...createDebugState(),
      displayFog: false
    });

    const layer = runtime.scene.getObjectByName("terrain-area-global-lighting");
    expect(layer?.getObjectByName("terrain-area-global-ambient-light")).toBeInstanceOf(
      THREE.AmbientLight
    );
    expect(layer?.getObjectByName("terrain-area-global-diffuse-light")).toBeInstanceOf(
      THREE.DirectionalLight
    );
    expect(runtime.scene.fog).toBeNull();
    expect(runtime.scene.userData.auroraTerrainAreaGlobalLightingStatus).toBe(
      "active"
    );
    expect(runtime.scene.userData.auroraTerrainAreaGlobalFogStatus).toBe(
      "available_disabled"
    );
    expect(layer?.userData.auroraTerrainAreaGlobalFogStatus).toBe("available_disabled");
  });

  it("caps tile light runtime PointLights at the decompiled active light slot clamp", () => {
    mockCanvasContext();
    const runtime = createRuntime();

    rebuildTerrainMesh(runtime, createTileLightBudgetScene(130), null, createDebugState());

    const layer = runtime.scene.getObjectByName("terrain-tile-light-sources");
    const pointLights: THREE.PointLight[] = [];
    layer?.traverse((node) => {
      if (node instanceof THREE.PointLight) {
        pointLights.push(node);
      }
    });

    expect(pointLights).toHaveLength(128);
    expect(runtime.scene.userData.auroraTerrainTileLightCandidateCount).toBe(130);
    expect(runtime.scene.userData.auroraTerrainTileLightAcceptedCount).toBe(128);
    expect(runtime.scene.userData.auroraTerrainTileLightDroppedCount).toBe(2);
    expect(runtime.scene.userData.auroraTerrainTileLightBudgetCap).toBe(128);
    expect(runtime.scene.userData.auroraTerrainTileLightBudgetSource).toBe(
      "decompiled FUN_00a41e30 active light slot clamp min(configured, 0x80)"
    );
    expect(layer?.userData.auroraTerrainTileLightCandidateCount).toBe(130);
    expect(layer?.userData.auroraTerrainTileLightAcceptedCount).toBe(128);
    expect(layer?.userData.auroraTerrainTileLightDroppedCount).toBe(2);
    expect(pointLights[0]?.userData.auroraTerrainTileLightBudgetRank).toBe(1);
    expect(pointLights[127]?.userData.auroraTerrainTileLightBudgetRank).toBe(128);
    expect(pointLights[0]?.userData.auroraTerrainTileLightBudgetSource).toBe(
      "decompiled FUN_00a41e30 active light slot clamp min(configured, 0x80)"
    );
  });

  it("respects a lower configured runtime tile light cap before the Aurora hard cap", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLights = 16;

    rebuildTerrainMesh(runtime, createTileLightBudgetScene(130), null, createDebugState());

    const layer = runtime.scene.getObjectByName("terrain-tile-light-sources");
    const pointLights: THREE.PointLight[] = [];
    layer?.traverse((node) => {
      if (node instanceof THREE.PointLight) {
        pointLights.push(node);
      }
    });

    expect(pointLights).toHaveLength(16);
    expect(runtime.scene.userData.auroraTerrainTileLightCandidateCount).toBe(130);
    expect(runtime.scene.userData.auroraTerrainTileLightAcceptedCount).toBe(16);
    expect(runtime.scene.userData.auroraTerrainTileLightDroppedCount).toBe(114);
    expect(runtime.scene.userData.auroraTerrainTileLightBudgetCap).toBe(16);
    expect(runtime.scene.userData.auroraTerrainTileLightBudgetHardCap).toBe(128);
    expect(runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLights).toBe(16);
    expect(layer?.userData.auroraTerrainTileLightAcceptedCount).toBe(16);
    expect(layer?.userData.auroraTerrainTileLightDroppedCount).toBe(114);
    expect(pointLights[15]?.userData.auroraTerrainTileLightBudgetRank).toBe(16);
    expect(pointLights[15]?.userData.auroraTerrainTileLightBudgetCap).toBe(16);
    expect(pointLights[15]?.userData.auroraTerrainTileLightBudgetHardCap).toBe(128);
    expect(pointLights[15]?.userData.auroraTerrainTileLightConfiguredMaxLights).toBe(16);
  });
});
