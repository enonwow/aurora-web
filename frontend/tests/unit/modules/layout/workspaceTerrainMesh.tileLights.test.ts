// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import * as THREE from "three";
import {
  clearTerrainMesh,
  rebuildTerrainMesh,
  syncTerrainTileSourceLightNodePositionsFromLoadedModelForTests
} from "../../../../src/modules/layout/adapters/three/workspaceTerrainMesh";
import type { AreaScene } from "../../../../src/modules/scene/contracts";
import type { AreaTileProcessContractReadiness } from "../../../../src/modules/tiles/application/areaTileProcessContractReadiness";

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

function createDebugState(): Parameters<typeof rebuildTerrainMesh>[3] {
  return {
    textureCompression: "uastc",
    hiddenMeshes: false,
    ceilingMeshes: true,
    wireframe: false,
    textures: true,
    displayFog: true,
    useAreaLighting: true,
    walkmeshOverlay: false
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
        sourceLight1: 6,
        sourceLight1Color: {
          rowId: 6,
          red: 1.9,
          green: 1.9,
          blue: 1,
          sourceKey: "tilecolor.2da"
        }
      }
    ],
    objects: []
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
        sourceKey: "tilecolor.2da"
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
      "tile-lit:sourceLight1:6"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightColorSample).toContain(
      "tile-lit:mainLight1:3:0.6:0.7:1"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightColorSample).toContain(
      "tile-lit:sourceLight1:6:1.9:1.9:1"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightSourceKeySample).toContain(
      "tile-lit:mainLight1:lightcolor.2da"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightSourceKeySample).toContain(
      "tile-lit:sourceLight1:tilecolor.2da"
    );

    const pointLights: THREE.PointLight[] = [];
    const sourceGroups: THREE.Object3D[] = [];
    layer?.traverse((node) => {
      if (node instanceof THREE.PointLight) {
        pointLights.push(node);
      }
      if (node.userData?.auroraTerrainTileLightChannel === "sourceLight1") {
        sourceGroups.push(node);
      }
    });

    expect(pointLights).toHaveLength(1);
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
    expect(sourceLight?.userData.auroraTerrainTileLightColor).toEqual([1.9, 1.9, 1]);
    expect(sourceLight?.userData.auroraTerrainTileLightPreviewColor).toEqual([
      1,
      1,
      1 / 1.9
    ]);
    expect(sourceLight?.userData.auroraTerrainTileLightIntensity).toBeCloseTo(
      1.9,
      5
    );
    expect(sourceLight?.intensity).toBeCloseTo(1.9, 5);
    expect(sourceLight?.userData.auroraTerrainTileLightIntensitySource).toContain(
      "color * max(0,1-distance/radius) * multiplier"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightIntensityProofStatus).toBe(
      "source-backed-tile-source-lightcolor-rgb-preserved-multiplier-neutral-fallback"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightSourceMultiplier).toBe(1);
    expect(sourceLight?.userData.auroraTerrainTileLightSourceMultiplierSource).toContain(
      "multiplier is not recovered"
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
      "max(0,1-distance/radius)"
    );
    expect(["installed", "already-installed"]).toContain(
      sourceLight?.userData.auroraTerrainTileLightFalloffRendererPatchStatus
    );
    expect(sourceLight?.userData.auroraTerrainTileLightFalloffRendererProofStatus).toBe(
      "source-backed-linear-radius-falloff-preview-shaderchunk-adapter"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightFalloffRendererSource).toContain(
      "max(0,1-distance/radius)*color*fade"
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
    expect(sourceLight?.color.b).toBeCloseTo(1 / 1.9, 5);
    expect(runtime.scene.userData.auroraTerrainTileLightPreviewColorSample).toContain(
      "tile-lit:sourceLight1:6:1:1:0.526"
    );

    const sourceGroup = sourceGroups.find(
      (node) => node.userData?.auroraTerrainTileLightPreviewStatus === "active"
    );
    expect(sourceGroup?.position.x).toBeCloseTo(1.5, 5);
    expect(sourceGroup?.position.y).toBeCloseTo(0.28, 5);
    expect(sourceGroup?.position.z).toBeCloseTo(0.5, 5);
    expect(sourceGroup?.userData.auroraTerrainTileLightRendererMode).toBe(
      "point-light-preview"
    );
    expect(sourceGroup?.userData.auroraTerrainTileLightPositionSource).toBe(
      "tile-center-preview-not-sourcelight-node-transform"
    );
    expect(sourceGroup?.userData.auroraTerrainTileLightRadiusProofStatus).toBe(
      "source-backed-fx_flame01-auroralight01-radius-controller"
    );
  });

  it("moves tile source lights to loaded MDL sourcelight node transforms", () => {
    mockCanvasContext();
    const runtime = createRuntime();
    const scene = createScene();

    rebuildTerrainMesh(runtime, scene, null, createDebugState());

    const layer = runtime.scene.getObjectByName("terrain-tile-light-sources");
    const sourceGroup = layer?.getObjectByName("terrain-tile-light-tile-lit-sourceLight1");
    expect(sourceGroup).toBeDefined();
    expect(sourceGroup?.userData.auroraTerrainTileLightPositionSource).toBe(
      "tile-center-preview-not-sourcelight-node-transform"
    );

    const loadedModel = new THREE.Group();
    loadedModel.name = "terrain-backend-tile-model-tile-lit";
    loadedModel.position.set(-0.5, 1.25, 2.5);
    const sourceNode = new THREE.Object3D();
    sourceNode.name = "sourcelight1";
    sourceNode.position.set(0.33, 0.44, 0.55);
    loadedModel.add(sourceNode);
    runtime.scene.add(loadedModel);
    runtime.scene.updateMatrixWorld(true);

    const syncedCount = syncTerrainTileSourceLightNodePositionsFromLoadedModelForTests(
      runtime.scene,
      scene.tiles[1],
      loadedModel
    );

    expect(syncedCount).toBe(1);
    expect(sourceGroup?.position.x).toBeCloseTo(-0.17, 5);
    expect(sourceGroup?.position.y).toBeCloseTo(1.69, 5);
    expect(sourceGroup?.position.z).toBeCloseTo(3.05, 5);
    expect(sourceGroup?.userData.auroraTerrainTileLightPositionSource).toBe(
      "C:/Projects/New Folder/export/decompiled_all.c:453567-453602 creates fx_flame01 at sourcelight1/sourcelight2 tile source-light nodes"
    );
    expect(sourceGroup?.userData.auroraTerrainTileLightPositionProofStatus).toBe(
      "source-backed-tile-mdl-sourcelight-node-transform"
    );
    expect(sourceGroup?.userData.auroraTerrainTileLightSourceNodeKind).toBe(
      "sourcelight1"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightSourceNodePositionCount).toBe(1);
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
      `${deliveryUrl}|sourceHierarchy:preserve-loaded`,
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
      `${deliveryUrl}|sourceHierarchy:preserve-loaded`,
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
    expect(ambientLight.color.r).toBeCloseTo(0x33 / 255, 5);
    expect(ambientLight.color.g).toBeCloseTo(0x22 / 255, 5);
    expect(ambientLight.color.b).toBeCloseTo(0x11 / 255, 5);
    expect(ambientLight.intensity).toBeCloseTo(1, 5);
    expect(ambientLight.userData.auroraTerrainAreaGlobalLightIntensitySource).toBe(
      "C:/Projects/New Folder/export/decompiled_all.c:256239-256303 selects Sun/Moon ambient+diffuse fields by IsNight, unpacks packed channels as byte0/byte1/byte2 divided by 255.0, then sends controlpart gidy_sun_amb/gidy_sun_diff color commands; Aurora Web uses Three intensity 1.0 so the source color carries the scalar"
    );
    expect(directionalLight.color.r).toBeCloseTo(0x66 / 255, 5);
    expect(directionalLight.color.g).toBeCloseTo(0x55 / 255, 5);
    expect(directionalLight.color.b).toBeCloseTo(0x44 / 255, 5);
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
      "three-directional-castShadow-flag-only-shadow-volume-not-ported"
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
