import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  applyWorkspaceRuntimeLightBudget,
  applyPlaceableAssetRequestHeaders,
  filterObjectsByRenderObjectIds,
  formatAreaSharedRendererIssueSummary,
  formatCanvasLoadOverlayProgress,
  formatTerrainTileModelRuntimeStatus,
  isObjectVisibleWithRenderFilter,
  AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT,
  limitAreaRuntimeIdList,
  readPlaceablesVfxPreviewDrawMetrics,
  refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidenceForTests,
  resolveAreaRenderFrameMirrorSnapshotForTests,
  resolveTerrainTileModelOverlayState,
  normalizeWorkspaceRuntimeMaxLights,
  resolveAreaObjectRuntimeEvidenceDatasetLimit,
  resolveAreaOracleRenderPriorityObjectIdsForTests,
  resolveRenderObjectIdsSet,
  resolveSceneGridVisibility,
  resolveSceneObjectRenderScale,
  shouldConsumeCanvasWheelForCamera,
  shouldRenderAreaGeometry
} from "../../../../src/modules/layout/components/WorkspaceCanvasViewport";
import {
  AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT,
  rebuildObjectMeshes,
  resolveSceneObjectRenderBaseY,
  resolveSoundRenderDiagnostics,
  updateObjectMeshSelectionState,
  writeSoundRenderDiagnostics
} from "../../../../src/modules/layout/adapters/three/workspaceObjectMeshLayer";
import {
  rebuildTerrainMesh,
  resolveTerrainRenderStatus
} from "../../../../src/modules/layout/adapters/three/workspaceTerrainMesh";
import { isRuntimeSoundPreviewEligible } from "../../../../src/modules/layout/application/useRuntimeSoundPreview";
import {
  filterVisibleSelectableCommandObjects,
  filterSelectedObjectIdsForVisibleSelectableObjects,
  filterUnlockedVisibleSelectedObjects,
  resolveInvertSelectionObjectIds,
  resolveCreatedObjectSelectionIds,
  resolveMovableVisibleSelection,
  resolveRadiusSelectionObjectIds,
  resolveSidebarSelectionIds,
  resolveSelectSameResRefObjectIds,
  resolveVisibleSelectedObjects,
  resolveVisibleObjectForSidebarSignal,
  resolveVisibleObjectForPropertiesSignal,
  isObjectVisibleWithRenderFilterState
} from "../../../../src/modules/layout/application/workspaceSceneInteraction";
import { createDefaultToolbarState } from "../../../../src/modules/layout/roleTopbarPolicy";
import type { SceneObject } from "../../../../src/modules/layout/contracts";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";
import {
  createPlaceableFallbackGeometry,
  createPlaceableGeometryFromPayload,
  resolvePlaceableVfxColor
} from "../../../../src/modules/layout/adapters/three/workspacePlaceableModelPresentation";
import {
  resolveBackendDeliveryOriginFromConfig,
  resolvePlaceableModelResolution,
  resolvePlaceableTextureDeliveryUrl,
  resolvePlaceableTextureDeliveryUrlsByReference,
  resolveUnsupportedModelCandidateReason
} from "../../../../src/modules/placeables/application/placeableRenderAssetResolver";
import { decodeAuroraTpcTexture } from "../../../../src/modules/placeables/adapters/aurora/auroraTpcTextureDecoder";
import {
  applyPlaceableTextureToModel,
  applyPlaceableTexturesToModel,
  clearPlaceableModelLoadQueue,
  ensurePlaceableModel,
  ensurePlaceableTexture,
  normalizePlaceableModelToObjectRadius,
  PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT,
  PLACEABLE_MODEL_BULK_LOAD_QUEUE_THRESHOLD,
  PLACEABLE_MODEL_BULK_LOAD_STARTS_PER_FRAME_LIMIT,
  PLACEABLE_MODEL_LOAD_CONCURRENCY_LIMIT,
  PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT,
  PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT,
  PLACEABLE_MODEL_LOAD_TIMEOUT_MS,
  type PlaceableModelLoadQueueProgressDetail
} from "../../../../src/modules/placeables/adapters/three/placeableThreeAssetLoader";
import type { PlaceableViewportRenderPayload } from "../../../../src/modules/placeables/application/placeableRenderPayloadResolver";

function installCanvasMeasureTextShim(): void {
  const context = document.createElement("canvas").getContext("2d");
  if (!context || typeof context.measureText === "function") {
    return;
  }
  context.measureText = vi.fn(
    (text: string) =>
      ({
        width: Math.max(1, text.length * 7)
      }) as TextMetrics
  );
}

installCanvasMeasureTextShim();

function createPlaceableViewportPayload(
  overrides: Partial<PlaceableViewportRenderPayload["renderPackage"]>
): PlaceableViewportRenderPayload {
  return {
    templateId: "template-id",
    cacheKey: "cache-key",
    cacheHit: false,
    storedAt: "2026-01-01T00:00:00.000Z",
    hits: 0,
    placeable: {
      assetManifest: { assets: [] },
      placeableSubtype: "generic",
      render: {
        backendType: "generic",
        frontendType: "placeable",
        rendererPreset: "generic",
        isDoor: false,
        isVfx: false
      }
    } as unknown as PlaceableViewportRenderPayload["placeable"],
    renderPackage: {
      status: "ready",
      diagnostics: [],
      assetRefs: {},
      ...overrides
    } as unknown as PlaceableViewportRenderPayload["renderPackage"],
    assetContracts: {
      assets: []
    } as unknown as PlaceableViewportRenderPayload["assetContracts"]
  } as unknown as PlaceableViewportRenderPayload;
}

function createAssetContract(
  assetId: string,
  deliveryUrl: string
): PlaceableViewportRenderPayload["assetContracts"]["assets"][number] {
  return {
    assetId,
    objectKey: `objects/${assetId}`,
    contentType: "model/gltf-binary",
    sizeBytes: 1024,
    deliveryPath: `/assets/${assetId}`,
    deliveryUrl
  } as unknown as PlaceableViewportRenderPayload["assetContracts"]["assets"][number];
}

function createAssetManifestEntry(
  assetId: string,
  role: string,
  fileName = `${assetId}.glb`
): PlaceableViewportRenderPayload["placeable"]["assetManifest"]["assets"][number] {
  return {
    assetId,
    role,
    fileName
  } as unknown as PlaceableViewportRenderPayload["placeable"]["assetManifest"]["assets"][number];
}

function firstMeshMaterial(model: THREE.Object3D): THREE.Material {
  let material: THREE.Material | null = null;
  model.traverse((node) => {
    if (material || !(node instanceof THREE.Mesh)) {
      return;
    }
    material = Array.isArray(node.material) ? node.material[0] : node.material;
  });
  if (!material) {
    throw new Error("Expected model to contain a mesh material");
  }
  return material;
}

function createWheelCameraRuntime(
  options: {
    distance?: number;
    minDistance?: number;
    maxDistance?: number;
    enabled?: boolean;
    enableZoom?: boolean;
  } = {}
): Parameters<typeof shouldConsumeCanvasWheelForCamera>[0] {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(options.distance ?? 5, 0, 0);
  return {
    camera,
    controls: {
      enabled: options.enabled ?? true,
      enableZoom: options.enableZoom ?? true,
      minDistance: options.minDistance ?? 1,
      maxDistance: options.maxDistance ?? 10,
      target: new THREE.Vector3()
    }
  } as unknown as Parameters<typeof shouldConsumeCanvasWheelForCamera>[0];
}

describe("readPlaceablesVfxPreviewDrawMetrics", () => {
  it("counts visible app VFX preview particles, vertices, and Aurora source draw lanes", () => {
    const root = new THREE.Group();
    root.userData.auroraEmitterPackageSource = "source-mdl";
    root.userData.auroraEmitterType = "Fountain";
    const material = new THREE.MeshBasicMaterial();
    material.userData.auroraEmitterBlendMode = "Lighten";
    material.userData.auroraEmitterRenderMode = "Normal";
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
        1, 1, 0,
        2, 1, 0,
        1, 2, 0
      ], 3)
    );
    root.add(new THREE.Mesh(geometry, material));
    const hiddenMesh = new THREE.Mesh(geometry, material);
    hiddenMesh.visible = false;
    root.add(hiddenMesh);

    expect(readPlaceablesVfxPreviewDrawMetrics(root)).toEqual({
      drawParticles: 1,
      renderedVertices: 6,
      drawLanes: ["source-mdl", "Fountain", "Lighten", "Normal"],
      auroraLightNodes: [],
      auroraLightSourceNodeCount: 0,
      auroraLightAcceptedNodeCount: 0,
      auroraLightFlarePayloadNodeCount: 0,
      auroraLightFlareRadiusWriteUnverified: false,
      auroraLightBudgetStrategy: null,
      auroraLightBudgetStrategySource: null,
      auroraLightBudgetStrategyProofStatus: null,
      auroraLightPreviewMode: null
    });
  });

  it("exposes source MDL light-node preview diagnostics", () => {
    const root = new THREE.Group();
    root.userData.auroraLightNodes = ["pulsing_light03"];
    root.userData.auroraLightSourceNodeCount = 1;
    root.userData.auroraLightAcceptedNodeCount = 1;
    root.userData.auroraLightFlarePayloadNodeCount = 1;
    root.userData.auroraLightFlareRadiusWriteUnverified = true;
    root.userData.auroraLightBudgetStrategy =
      "source-backed-retail-score-ascending-global-budget-preview-camera-fallback";
    root.userData.auroraLightBudgetStrategySource =
      "C:/Projects/New Folder/export/decompiled_all.c:865838-865929 FUN_00a41850 computes retail MDL light score at +0x84";
    root.userData.auroraLightBudgetStrategyProofStatus =
      "source-backed-retail-score-sort-slot-cap-preview-camera-field-fallback";
    root.userData.auroraLightPreviewMode = "source-mdl-light-node-preview";

    const lightCore = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    lightCore.userData.auroraLightNodeName = "pulsing_light03";
    root.add(lightCore);

    expect(readPlaceablesVfxPreviewDrawMetrics(root)).toEqual({
      drawParticles: 1,
      renderedVertices: 24,
      drawLanes: [],
      auroraLightNodes: ["pulsing_light03"],
      auroraLightSourceNodeCount: 1,
      auroraLightAcceptedNodeCount: 1,
      auroraLightFlarePayloadNodeCount: 1,
      auroraLightFlareRadiusWriteUnverified: true,
      auroraLightBudgetStrategy: "source-backed-retail-score-ascending-global-budget-preview-camera-fallback",
      auroraLightBudgetStrategySource:
        "C:/Projects/New Folder/export/decompiled_all.c:865838-865929 FUN_00a41850 computes retail MDL light score at +0x84",
      auroraLightBudgetStrategyProofStatus:
        "source-backed-retail-score-sort-slot-cap-preview-camera-field-fallback",
      auroraLightPreviewMode: "source-mdl-light-node-preview"
    });
  });
});

describe("shouldConsumeCanvasWheelForCamera", () => {
  it("consumes wheel only while zoom can still move the camera", () => {
    const runtime = createWheelCameraRuntime({ distance: 5, minDistance: 1, maxDistance: 10 });

    expect(shouldConsumeCanvasWheelForCamera(runtime, -120)).toBe(true);
    expect(shouldConsumeCanvasWheelForCamera(runtime, 120)).toBe(true);
    expect(
      shouldConsumeCanvasWheelForCamera(
        createWheelCameraRuntime({ distance: 1, minDistance: 1, maxDistance: 10 }),
        -120
      )
    ).toBe(false);
    expect(
      shouldConsumeCanvasWheelForCamera(
        createWheelCameraRuntime({ distance: 10, minDistance: 1, maxDistance: 10 }),
        120
      )
    ).toBe(false);
  });

  it("passes wheel through when camera controls cannot handle it", () => {
    expect(
      shouldConsumeCanvasWheelForCamera(createWheelCameraRuntime({ enabled: false }), 120)
    ).toBe(false);
    expect(
      shouldConsumeCanvasWheelForCamera(createWheelCameraRuntime({ enableZoom: false }), 120)
    ).toBe(false);
    expect(
      shouldConsumeCanvasWheelForCamera(createWheelCameraRuntime(), 120, { loading: true })
    ).toBe(false);
  });
});

describe("applyWorkspaceRuntimeLightBudget", () => {
  it("writes the workspace max-lights cap to object and tile light runtime channels", () => {
    const runtime = { scene: new THREE.Scene() };

    expect(normalizeWorkspaceRuntimeMaxLights(999)).toBe(128);
    expect(normalizeWorkspaceRuntimeMaxLights(-4)).toBe(0);
    expect(normalizeWorkspaceRuntimeMaxLights(16.8)).toBe(16);

    const normalized = applyWorkspaceRuntimeLightBudget(runtime, 16.8);

    expect(normalized).toBe(16);
    expect(runtime.scene.userData.auroraLightConfiguredMaxLights).toBe(16);
    expect(runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLights).toBe(16);
    expect(runtime.scene.userData.auroraLightConfiguredMaxLightsSource).toBe(
      "workspace-options-runtime-max-lights"
    );
    expect(runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLightsSource).toBe(
      "workspace-options-runtime-max-lights"
    );
  });
});

describe("WorkspaceCanvasViewport loading evidence labels", () => {
  it("formats model loading progress with completed, in-flight, and queued counts", () => {
    expect(
      formatCanvasLoadOverlayProgress({
        visible: true,
        completed: 0,
        total: 1123,
        inFlight: 4,
        queued: 1119,
        source: "placeables",
        variant: "loading",
        title: "Modele PLC/DOR",
        currentLabel: "plc_0.glb"
      })
    ).toBe("Completed 0 / 1123 / In flight 4 / Queued 1119");
  });

  it("does not label unresolved payloads as final missing while requests are in flight", () => {
    const diagnostics = {
      total: 1136,
      primitiveFallbackCount: 1136,
      primitiveFallbackRenderLimit: 256,
      primitiveFallbackSuppressedCount: 880,
      missingPayloadIds: "plc_a|plc_b|plc_c"
    } as Parameters<typeof formatAreaSharedRendererIssueSummary>[0];

    expect(
      formatAreaSharedRendererIssueSummary(diagnostics, {
        payloadRequestsInFlight: true
      })
    ).toBe("1136/1136 primitive fallback / render capped 256, skipped 880 / payloads pending/in flight 3");
    expect(formatAreaSharedRendererIssueSummary(diagnostics)).toContain("missing payloads 3");
  });

  it("names blocked SET model resrefs instead of presenting an unexplained terrain hole", () => {
    const overlay = resolveTerrainTileModelOverlayState({
      contractTileCount: 12,
      loadedTileCount: 12,
      failedTileCount: 0,
      bridgeTileCount: 4,
      pendingTileCount: 0,
      tileCount: 16,
      blockedTileSample: "twl01_g04_21_01|twl01_g04_21_02"
    } as Parameters<typeof resolveTerrainTileModelOverlayState>[0]);

    expect(overlay).toMatchObject({
      visible: true,
      variant: "blocked",
      title: "Niepełny runtime kafli Areas"
    });
    expect(overlay.currentLabel).toContain("twl01_g04_21_01");
    expect(overlay.currentLabel).toContain("Brak modelu w aktywnych źródłach");
  });

  it("keeps the terrain loading overlay active while material textures are pending", () => {
    const overlay = resolveTerrainTileModelOverlayState({
      status: "loading",
      contractTileCount: 4,
      loadedTileCount: 4,
      failedTileCount: 0,
      bridgeTileCount: 0,
      pendingTileCount: 0,
      tileCount: 4,
      materialTextureContractTileCount: 4,
      materialTextureAppliedTileCount: 3,
      materialTextureFailedTileCount: 0,
      materialTexturePendingTileCount: 1
    } as Parameters<typeof resolveTerrainTileModelOverlayState>[0]);

    expect(overlay).toMatchObject({
      visible: true,
      variant: "loading",
      completed: 7,
      total: 8,
      inFlight: 1,
      title: "Modele i materiały kafli Areas"
    });
  });

  it("keeps the terrain loading overlay active while companion surfaces are pending", () => {
    const snapshot = {
      status: "loading",
      contractTileCount: 4,
      loadedTileCount: 4,
      failedTileCount: 0,
      bridgeTileCount: 0,
      pendingTileCount: 0,
      tileCount: 4,
      materialTextureContractTileCount: 3,
      materialTextureAppliedTileCount: 3,
      materialTextureFailedTileCount: 0,
      materialTexturePendingTileCount: 0,
      supplementalSurfaceContractCount: 2,
      supplementalSurfaceLoadedCount: 1,
      supplementalSurfaceFailedCount: 0,
      supplementalSurfacePendingCount: 1,
      materialMapCount: 46,
      blockerSummary: "none"
    } as Parameters<typeof resolveTerrainTileModelOverlayState>[0];

    expect(resolveTerrainTileModelOverlayState(snapshot)).toMatchObject({
      visible: true,
      variant: "loading",
      completed: 8,
      total: 9,
      inFlight: 1
    });
    expect(formatTerrainTileModelRuntimeStatus(snapshot)).toContain(
      "loading / models 4/4 / textures 3/3 / maps 46 / surfaces 1/2"
    );
  });

  it("blocks completion when runtime material binding failed despite a ready contract", () => {
    const snapshot = {
      status: "partial",
      contractTileCount: 4,
      loadedTileCount: 4,
      failedTileCount: 0,
      bridgeTileCount: 0,
      pendingTileCount: 0,
      tileCount: 4,
      materialCount: 16,
      materialMapCount: 0,
      materialTextureContractTileCount: 4,
      materialTextureAppliedTileCount: 3,
      materialTextureFailedTileCount: 1,
      materialTexturePendingTileCount: 0,
      materialTextureFailedTileSample: "gin11_s01_02",
      blockedTileSample: "none",
      blockerSummary: "tile_material_texture_loader_failed:gin11_s01_02"
    } as Parameters<typeof resolveTerrainTileModelOverlayState>[0];

    expect(resolveTerrainTileModelOverlayState(snapshot)).toMatchObject({
      visible: true,
      variant: "blocked",
      currentLabel: "Nie udało się przypiąć materiałów: gin11_s01_02"
    });
    expect(formatTerrainTileModelRuntimeStatus(snapshot)).toContain(
      "partial / models 4/4 / textures 3/4 / maps 0"
    );
  });
});

describe("WorkspaceCanvasViewport runtime evidence datasets", () => {
  it("caps full visible-object evidence rows while reporting truncated count", () => {
    expect(resolveAreaObjectRuntimeEvidenceDatasetLimit(12, 5)).toEqual({
      rowCount: 5,
      truncatedCount: 7
    });
    expect(
      resolveAreaObjectRuntimeEvidenceDatasetLimit(
        AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT + 3
      )
    ).toEqual({
      rowCount: AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT,
      truncatedCount: 3
    });
  });

  it("caps runtime id lists used by diagnostics snapshots", () => {
    const ids = Array.from(
      { length: AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT + 2 },
      (_, index) => `plc_${index}`
    );

    const capped = limitAreaRuntimeIdList(ids);

    expect(ids).toHaveLength(AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT + 2);
    expect(capped).toHaveLength(AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT);
    expect(capped.at(-1)).toBe(`plc_${AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT - 1}`);
  });

  it("normalizes clean-canvas render priority object ids", () => {
    expect(
      resolveAreaOracleRenderPriorityObjectIdsForTests(
        "area_enon_bakery:obj_a|obj_b,obj_b; obj_c "
      )
    ).toEqual(["area_enon_bakery:obj_a", "obj_b", "obj_c"]);
    expect(resolveAreaOracleRenderPriorityObjectIdsForTests(["obj_a", " obj_a ", "obj_b"])).toEqual([
      "obj_a",
      "obj_b"
    ]);
  });

  it("keeps VisualTransform root evidence even when fallback proxies have no model bounds", () => {
    const container = document.createElement("div");
    const objectId = "area_enon_bakery:obj_plc_q_floorwooden_1";
    const sourceId = "obj_plc_q_floorwooden_1";
    const placeholderReasons = [
      "none",
      "missing-payload",
      "payload-missing-model-url",
      "asset-contract-blocked",
      "model-load-failed",
      "still-loading",
      "not-applicable"
    ];
    const placeholderReasonCounts = Object.fromEntries(
      placeholderReasons.map((reason) => [reason, reason === "missing-payload" ? 1 : 0])
    );
    const placeholderReasonIds = Object.fromEntries(
      placeholderReasons.map((reason) => [reason, reason === "missing-payload" ? [objectId] : []])
    );
    container.dataset.areaObjectSharedRendererSnapshot = JSON.stringify({
      version: "aurora-areas-shared-renderer-runtime/v1",
      path: "shared-placeables-renderer",
      status: "blocked",
      placeholderStatus: "blocked",
      total: 1,
      payloadBoundCount: 0,
      modelReadyCount: 0,
      uniqueModelUrlCount: 0,
      uniqueModelCacheKeyCount: 0,
      modelUrlSample: [],
      modelCacheKeySample: [],
      primitiveFallbackCount: 1,
      primitiveFallbackRenderLimit: AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT,
      primitiveFallbackSuppressedCount: 0,
      placeholderReasonCounts,
      placeholderReasonIds,
      missingPayloadIds: [objectId],
      payloadMissingModelUrlIds: [],
      assetContractBlockedIds: [],
      modelLoadFailedIds: [],
      modelLoadFailedModelUrls: [],
      modelLoadFailedModelCacheKeys: [],
      stillLoadingIds: [],
      primitiveFallbackIds: [objectId],
      textureStatusCounts: {},
      texturePendingIds: [],
      textureIssueIds: [],
      textureMissingIds: [],
      textureFallbackIds: [],
      textureSkippedIds: [],
      toolsetPhysicalHiddenIds: [],
      toolsetPhysicalHiddenReasons: [],
      blockedIds: [objectId],
      areaRenderFrameMirror: {
        status: "disabled",
        enabled: false,
        objectLayer: { mirror: null, mirrorWidth: null, positionX: 0, scaleX: 1 },
        boundsLayer: { mirror: null, mirrorWidth: null, positionX: 0, scaleX: 1 }
      },
      visualTransformSample: [],
      objectVisualTransformRootCount: 0,
      objectVisualTransformAppliedCount: 0,
      objectVisualTransformAppliedIds: [],
      objectVisualTransformSample: [],
      modelBoundsSample: []
    });
    const root = new THREE.Object3D();
    root.position.set(1, 0.5, 2);
    root.rotation.set(0, Math.PI / 2, 0);
    root.scale.set(0.5, 0.5, 0.5);
    root.userData = {
      auroraAreaObjectSharedRendererRuntimeMarker: "shared-placeables-renderer",
      objectId,
      objectKind: "placeables",
      auroraAreaObjectSourceId: sourceId,
      auroraAreaObjectTemplateId: "plc_q_floorwooden_1",
      auroraAreaObjectSharedRendererPayloadStatus: "missing-payload",
      auroraAreaObjectSharedRendererGeometryStatus: "primitive-fallback",
      auroraAreaObjectSharedRendererPlaceholderReason: "missing-payload",
      auroraAreaObjectVisualTransform:
        "scale=0.5,scaleX=0.5,scaleY=0.5,scaleZ=0.5,offsetX=0,offsetY=0,offsetZ=0,pitch=0,yaw=1.570796,roll=0",
      auroraAreaObjectEffectiveVisualTransform:
        "scale=0.5,scaleX=0.5,scaleY=0.5,scaleZ=0.5,offsetX=0,offsetY=0,offsetZ=0,pitch=0,yaw=1.570796,roll=0",
      auroraAreaObjectVisualTransformApplied: true,
      auroraAreaObjectRenderTransformSourceBearing: 0,
      auroraAreaObjectRenderTransformSourceYaw: Math.PI / 2,
      auroraAreaObjectRenderTransformRenderYaw: -Math.PI / 2,
      auroraAreaObjectRenderTransformScaleX: 0.5,
      auroraAreaObjectRenderTransformScaleY: 0.5,
      auroraAreaObjectRenderTransformScaleZ: 0.5,
      auroraAreaObjectRenderTransformYawComposition:
        "placementMatrix * visualTransformMatrix"
    };
    const soundObjectId = "area_enon_bakery:obj_snd_fireplace";
    const soundRoot = new THREE.Object3D();
    soundRoot.position.set(3, 0.1, 4);
    soundRoot.scale.set(1.2, 1.2, 1.2);
    soundRoot.userData = {
      objectId: soundObjectId,
      objectKind: "sounds",
      auroraAreaObjectSourceId: "obj_snd_fireplace",
      auroraAreaObjectTemplateId: "snd_fireplace",
      auroraAreaObjectPayloadStatus: "object-layer",
      auroraAreaObjectVisualTransform:
        "scale=1.2,scaleX=1.2,scaleY=1.2,scaleZ=1.2,offsetX=0,offsetY=0,offsetZ=0,pitch=0,yaw=0,roll=0",
      auroraAreaObjectEffectiveVisualTransform:
        "scale=1.2,scaleX=1.2,scaleY=1.2,scaleZ=1.2,offsetX=0,offsetY=0,offsetZ=0,pitch=0,yaw=0,roll=0",
      auroraAreaObjectVisualTransformApplied: true,
      auroraAreaObjectRenderTransformScaleX: 1.2,
      auroraAreaObjectRenderTransformScaleY: 1.2,
      auroraAreaObjectRenderTransformScaleZ: 1.2
    };
    const runtime = {
      container,
      objectLayer: new THREE.Group(),
      boundsLayer: new THREE.Group(),
      objectMeshById: new Map([
        [objectId, root],
        [soundObjectId, soundRoot]
      ])
    } as unknown as Parameters<
      typeof refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidenceForTests
    >[0];

    refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidenceForTests(runtime);

    const snapshot = JSON.parse(
      container.dataset.areaObjectSharedRendererSnapshot ?? "{}"
    );
    expect(snapshot.modelBoundsSample).toEqual([]);
    expect(snapshot.visualTransformSample).toHaveLength(1);
    expect(snapshot.objectVisualTransformSample).toHaveLength(2);
    expect(snapshot.objectVisualTransformRootCount).toBe(2);
    expect(snapshot.objectVisualTransformAppliedCount).toBe(2);
    expect(snapshot.visualTransformSample[0]).toMatchObject({
      objectId,
      objectKind: "placeables",
      rendererPath: "shared-placeables-renderer",
      sourceId,
      placeholderReason: "missing-payload",
      geometryStatus: "primitive-fallback",
      visualTransformApplied: true
    });
    expect(container.dataset.areaObjectSharedRendererVisualTransformSampleCount).toBe("1");
    expect(container.dataset.areaObjectVisualTransformSampleCount).toBe("2");
    expect(container.dataset.areaObjectVisualTransformRootCount).toBe("2");
    expect(container.dataset.areaObjectVisualTransformAppliedCount).toBe("2");
  });

  it("reports Area object-layer X mirror evidence for runtime captures", () => {
    const objectLayer = new THREE.Group();
    const boundsLayer = new THREE.Group();
    objectLayer.position.x = 4;
    objectLayer.scale.x = -1;
    objectLayer.userData.auroraAreaRenderFrameMirror = "coordinate-x";
    objectLayer.userData.auroraAreaRenderFrameMirrorWidth = 4;
    boundsLayer.position.x = 4;
    boundsLayer.scale.x = -1;
    boundsLayer.userData.auroraAreaRenderFrameMirror = "coordinate-x";
    boundsLayer.userData.auroraAreaRenderFrameMirrorWidth = 4;

    const snapshot = resolveAreaRenderFrameMirrorSnapshotForTests({
      objectLayer,
      boundsLayer
    } as never);

    expect(snapshot).toMatchObject({
      status: "coordinate-x",
      enabled: true,
      objectLayer: {
        mirror: "coordinate-x",
        mirrorWidth: 4,
        positionX: 4,
        scaleX: -1
      },
      boundsLayer: {
        mirror: "coordinate-x",
        mirrorWidth: 4,
        positionX: 4,
        scaleX: -1
      }
    });
  });
});

describe("WorkspaceCanvasViewport render filter state", () => {
  it("filters objects from narrow visibility and isolation state", () => {
    const object = {
      id: "plc_visible",
      kind: "placeables"
    } as unknown as Parameters<typeof isObjectVisibleWithRenderFilterState>[0];

    expect(
      isObjectVisibleWithRenderFilterState(
        object,
        {
          visibility: {
            placeables: true,
            creatures: true,
            doors: true,
            items: true,
            sounds: true
          },
          isolateKind: "none"
        },
        null
      )
    ).toBe(true);
    expect(
      isObjectVisibleWithRenderFilterState(
        object,
        {
          visibility: {
            placeables: true,
            creatures: true,
            doors: true,
            items: true,
            sounds: true
          },
          isolateKind: "sounds"
        },
        null
      )
    ).toBe(false);
  });
});

function buildMultiMaterialGlbFixture(): ArrayBuffer {
  const positions = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0
  ]);
  const indices = new Uint16Array([0, 1, 2]);
  const byteLength = 44;
  const buffer = Buffer.alloc(byteLength);
  Buffer.from(positions.buffer).copy(buffer, 0);
  Buffer.from(indices.buffer).copy(buffer, 36);

  const json = Buffer.from(JSON.stringify({
    asset: {
      version: "2.0",
      generator: "WorkspaceCanvasViewport test"
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    buffers: [
      {
        byteLength
      }
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 36,
        target: 34962
      },
      {
        buffer: 0,
        byteOffset: 36,
        byteLength: 6,
        target: 34963
      }
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 0]
      },
      {
        bufferView: 1,
        componentType: 5123,
        count: 3,
        type: "SCALAR"
      }
    ],
    materials: [
      {
        name: "Aurora material tx_wood",
        extras: { aurora: { textureReference: "tx_wood" } }
      },
      {
        name: "Aurora material tx_metal",
        extras: { aurora: { textureReference: "tx_metal" } }
      }
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            material: 0
          },
          {
            attributes: { POSITION: 0 },
            indices: 1,
            material: 1
          }
        ]
      }
    ]
  }), "utf-8");
  const jsonPadding = (4 - (json.length % 4)) % 4;
  const binPadding = (4 - (buffer.length % 4)) % 4;
  const jsonChunk = Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]);
  const binChunk = Buffer.concat([buffer, Buffer.alloc(binPadding, 0)]);
  const glb = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binChunk.length);
  let offset = 0;
  glb.writeUInt32LE(0x46546c67, offset);
  offset += 4;
  glb.writeUInt32LE(2, offset);
  offset += 4;
  glb.writeUInt32LE(glb.length, offset);
  offset += 4;
  glb.writeUInt32LE(jsonChunk.length, offset);
  offset += 4;
  glb.writeUInt32LE(0x4e4f534a, offset);
  offset += 4;
  jsonChunk.copy(glb, offset);
  offset += jsonChunk.length;
  glb.writeUInt32LE(binChunk.length, offset);
  offset += 4;
  glb.writeUInt32LE(0x004e4942, offset);
  offset += 4;
  binChunk.copy(glb, offset);
  const arrayBuffer = new ArrayBuffer(glb.byteLength);
  new Uint8Array(arrayBuffer).set(glb);
  return arrayBuffer;
}

async function parseGltfFixture(gltf: string | ArrayBuffer): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(
      gltf,
      "",
      (result) => resolve(result.scene),
      (error) => reject(error)
    );
  });
}

describe("WorkspaceCanvasViewport render filter helpers", () => {
  it("returns null for undefined, empty, and blank-only renderObjectIds", () => {
    expect(resolveRenderObjectIdsSet()).toBeNull();
    expect(resolveRenderObjectIdsSet(null)).toBeNull();
    expect(resolveRenderObjectIdsSet([])).toBeNull();
    expect(resolveRenderObjectIdsSet(["", "   "])).toBeNull();
  });

  it("normalizes renderObjectIds by trimming values", () => {
    const set = resolveRenderObjectIdsSet(["  a  ", "b", "a"]);
    expect(set).not.toBeNull();
    expect(set ? [...set].sort() : []).toEqual(["a", "b"]);
  });

  it("keeps all objects when filter is disabled", () => {
    const objects = [{ id: "one" }, { id: "two" }, { id: "three" }];
    const result = filterObjectsByRenderObjectIds(objects, null);
    expect(result).toEqual(objects);
  });

  it("returns only objects listed in renderObjectIds", () => {
    const objects = [{ id: "one" }, { id: "two" }, { id: "three" }];
    const result = filterObjectsByRenderObjectIds(objects, ["two", "three"]);
    expect(result.map((entry) => entry.id)).toEqual(["two", "three"]);
  });

  it("keeps area geometry for areas mode style filters", () => {
    expect(shouldRenderAreaGeometry()).toBe(true);
    expect(shouldRenderAreaGeometry(null)).toBe(true);
    expect(shouldRenderAreaGeometry([])).toBe(true);
    expect(shouldRenderAreaGeometry(["   "])).toBe(true);
  });

  it("hides area geometry when renderObjectIds select explicit preview objects", () => {
    expect(shouldRenderAreaGeometry(["preview:plc_barrel_01"])).toBe(false);
    expect(shouldRenderAreaGeometry(["__placeables_mode_render_none__"])).toBe(false);
    expect(shouldRenderAreaGeometry(["__creatures_mode_render_none__"])).toBe(false);
    expect(shouldRenderAreaGeometry([" one ", " two "])).toBe(false);
  });

  it("keeps scene grid visible while hiding area geometry for object-only previews", () => {
    expect(
      resolveSceneGridVisibility({
        renderObjectIds: ["preview:plc_barrel_01"],
        gridEnabled: true,
        tileOverlayEnabled: true
      })
    ).toEqual({
      renderAreaGeometry: false,
      renderGridLayer: true,
      renderTileOverlayLayer: true
    });
  });

  it("keeps a readable bridge mesh while Aurora tile model contracts are restoring", () => {
    const scene = new THREE.Scene();
    const runtime: {
      scene: THREE.Scene;
      tileMesh: THREE.InstancedMesh | null;
      tileIdByInstance: string[];
    } = {
      scene,
      tileMesh: null,
      tileIdByInstance: []
    };

    rebuildTerrainMesh(
      runtime,
      {
        sceneId: "area_tileset_rendering_p0",
        areaName: "Tileset Rendering P0",
        width: 2,
        height: 1,
        tileSource: {
          type: "aurora_tile_list",
          tilesetResRef: "tno01",
          tileCount: 2
        },
        tiles: [
          {
            id: "area_tileset_rendering_p0:tile:0",
            row: 0,
            col: 0,
            terrain: "corridor",
            orientation: 1,
            rotateTexture: true,
            plot: false,
            source: "aurora_tile_list",
            areaId: "area_tileset_rendering_p0",
            tilesetResRef: "tno01",
            tileIndex: 0,
            tileId: 101,
            modelResRef: "tno01_a01_01",
            modelSource: "set-tile-section",
            height: 0.5
          },
          {
            id: "area_tileset_rendering_p0:tile:1",
            row: 0,
            col: 1,
            terrain: "doorway",
            orientation: 2,
            rotateTexture: false,
            plot: false,
            source: "aurora_tile_list",
            areaId: "area_tileset_rendering_p0",
            tilesetResRef: "tno01",
            tileIndex: 1,
            tileId: 102,
            modelResRef: "tno01_a01_02",
            modelSource: "set-tile-section"
          }
        ],
        objects: [],
        updatedAtUnixMs: 1770000001234,
        source: "aurora_area"
      },
      null,
      {
        textureCompression: "uastc",
        hiddenMeshes: false,
        wireframe: false,
        textures: true,
        walkmeshOverlay: false
      }
    );

    expect(runtime.tileMesh).toBeInstanceOf(THREE.InstancedMesh);
    expect(runtime.tileMesh?.count).toBe(2);
    expect(scene.children).toContain(runtime.tileMesh);
    expect(scene.userData).toMatchObject({
      auroraTerrainRenderStatus: "source_backed_tile_model_bridge",
      auroraTerrainRenderLabel: "Aurora tile models restoring (0/2 unique models ready)",
      auroraTerrainTileCount: 2,
      auroraTerrainModelResolvedCount: 2,
      auroraTerrainModelSourceCounts: {
        "set-tile-section": 2
      }
    });
    expect(runtime.tileIdByInstance).toEqual([
      "area_tileset_rendering_p0:tile:0",
      "area_tileset_rendering_p0:tile:1"
    ]);
    expect(
      resolveTerrainRenderStatus({
        sceneId: "area_tileset_rendering_p0",
        areaName: "Tileset Rendering P0",
        width: 2,
        height: 1,
        tileSource: {
          type: "aurora_tile_list",
          tilesetResRef: "tno01",
          tileCount: 2
        },
        tiles: runtime.tileIdByInstance.map((id, index) => ({
          id,
          row: 0,
          col: index,
          terrain: index === 0 ? "corridor" : "doorway",
          orientation: index === 0 ? 1 : 2,
          rotateTexture: index === 0,
          plot: false,
          source: "aurora_tile_list",
          areaId: "area_tileset_rendering_p0",
          tilesetResRef: "tno01",
          tileIndex: index,
          tileId: 101 + index,
          modelResRef: index === 0 ? "tno01_a01_01" : "tno01_a01_02",
          modelSource: "set-tile-section"
        })),
        objects: [],
        updatedAtUnixMs: 1770000001234,
        source: "aurora_area"
      }).label
    ).toBe("Aurora tile models restoring (0/2 unique models ready)");
  });

  it("uses full object scale for object-only previews instead of inherited area scale", () => {
    expect(resolveSceneObjectRenderScale(0.08, false)).toBe(1);
    expect(resolveSceneObjectRenderScale(0.08, true)).toBe(0.08);
  });

  it("resolves backend delivery origin to API host instead of frontend dev host", () => {
    expect(resolveBackendDeliveryOriginFromConfig(undefined, "http://localhost:3000")).toBe(
      "http://localhost:3000"
    );
    expect(
      resolveBackendDeliveryOriginFromConfig(
        "http://backend.internal:3000/api/v1",
        "http://localhost:3000"
      )
    ).toBe("http://backend.internal:3000");
  });

  it("resolves relative backend delivery config against the current frontend origin", () => {
    const originalLocation = globalThis.location;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: new URL("http://127.0.0.1:5175/app")
    });

    try {
      expect(resolveBackendDeliveryOriginFromConfig("/_aurora/v1", "http://localhost:3000")).toBe(
        "http://127.0.0.1:5175"
      );
    } finally {
      Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: originalLocation
      });
    }
  });

  it("routes dev model delivery through the Vite proxy when that origin is selected", () => {
    const originalLocation = globalThis.location;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: new URL("http://127.0.0.1:5173/app")
    });

    try {
      const resolution = resolvePlaceableModelResolution(
        createPlaceableViewportPayload({
          status: "ready",
          glbUrl: "/api/v1/catalog/placeables/cache/cache_001/assets/model_001.glb"
        }),
        "http://127.0.0.1:5173"
      );

      expect(resolution.modelUrl).toBe(
        "http://127.0.0.1:5173/_aurora/v1/catalog/placeables/cache/cache_001/assets/model_001.glb"
      );
    } finally {
      Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: originalLocation
      });
    }
  });

  it("prefers glbUrl over modelUrl when both are present", () => {
    const resolution = resolvePlaceableModelResolution(
      createPlaceableViewportPayload({
        glbUrl: "/assets/placeable.glb",
        modelUrl: "/assets/fallback.gltf"
      })
    );
    expect(resolution.modelUrl).toBe("http://127.0.0.1:3000/assets/placeable.glb");
    expect(resolution.ready).toBe(true);
    expect(resolution.fallbackReason).toBeNull();
  });

  it("uses the selected direct loopback backend identity for absolute delivery URLs", () => {
    const resolution = resolvePlaceableModelResolution(
      createPlaceableViewportPayload({
        glbUrl: "http://localhost:3000/assets/placeable.glb"
      }),
      "http://127.0.0.1:3000"
    );

    expect(resolution.modelUrl).toBe("http://127.0.0.1:3000/assets/placeable.glb");
  });

  it("falls back when renderPackage model URL is unsupported", () => {
    const resolution = resolvePlaceableModelResolution(
      createPlaceableViewportPayload({ modelUrl: "/assets/placeable.mdl" })
    );
    expect(resolution.ready).toBe(false);
    expect(resolution.fallbackReason).toContain("unsupported extension");
    expect(resolution.modelUrl).toBeNull();
  });

  it("falls back when renderPackage status is not ready", () => {
    const resolution = resolvePlaceableModelResolution(
      createPlaceableViewportPayload({ status: "missing_assets" })
    );
    expect(resolution.ready).toBe(false);
    expect(resolution.fallbackReason).toBe("renderPackage.status is \"missing_assets\"");
    expect(resolution.modelUrl).toBeNull();
  });

  it("resolves model URL from derived model asset contracts when renderPackage URL fields are missing", () => {
    const payload = createPlaceableViewportPayload({
      status: "ready",
      assetRefs: {
        derivedModelAssetIds: ["derived-model-1"]
      }
    });
    payload.assetContracts.assets = [createAssetContract("derived-model-1", "/assets/derived.glb")];

      const resolution = resolvePlaceableModelResolution(payload, "http://127.0.0.1:3000");
    expect(resolution.ready).toBe(true);
    expect(resolution.modelUrl).toBe("http://127.0.0.1:3000/assets/derived.glb");
    expect(resolution.fallbackReason).toBeNull();
  });

  it("prefers the browser-safe backend path over direct SeaweedFS model delivery", () => {
    const originalLocation = globalThis.location;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: new URL("http://127.0.0.1:5324/app")
    });

    try {
      const payload = createPlaceableViewportPayload({
        status: "ready",
        assetRefs: {
          derivedModelAssetIds: ["derived-model-1"]
        }
      });
      payload.assetContracts.assets = [
        {
          ...createAssetContract(
            "derived-model-1",
            "http://127.0.0.1:8888/buckets/aurora-module-assets/modules/current/derived.glb"
          ),
          deliveryPath:
            "/api/v1/catalog/placeables/cache/cache-key/assets/derived-model-1.glb"
        }
      ];

      const resolution = resolvePlaceableModelResolution(payload, "http://127.0.0.1:3000");

      expect(resolution.ready).toBe(true);
      expect(resolution.modelUrl).toBe(
        "http://127.0.0.1:5324/_aurora/v1/catalog/placeables/cache/cache-key/assets/derived-model-1.glb"
      );
      expect(resolution.modelCacheKey).toBe("objectKey:objects/derived-model-1");
    } finally {
      Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: originalLocation
      });
    }
  });

  it("uses derived model asset contract when renderPackage status is stale non-ready", () => {
    const payload = createPlaceableViewportPayload({
      status: "missing_derived",
      assetRefs: {
        derivedModelAssetIds: ["derived-model-1"]
      }
    });
    payload.assetContracts.assets = [createAssetContract("derived-model-1", "/assets/derived.glb")];

      const resolution = resolvePlaceableModelResolution(payload, "http://127.0.0.1:3000");
    expect(resolution.ready).toBe(true);
    expect(resolution.status).toBe("missing_derived");
    expect(resolution.modelUrl).toBe("http://127.0.0.1:3000/assets/derived.glb");
    expect(resolution.fallbackReason).toBeNull();
  });

  it("falls back when derived model asset contract has no deliveryUrl", () => {
    const payload = createPlaceableViewportPayload({
      status: "ready",
      assetRefs: {
        derivedModelAssetIds: ["derived-model-1"]
      }
    });
    payload.assetContracts.assets = [createAssetContract("derived-model-1", "   ")];

    const resolution = resolvePlaceableModelResolution(payload);
    expect(resolution.ready).toBe(false);
    expect(resolution.modelUrl).toBeNull();
    expect(resolution.fallbackReason).toBe("renderPackage has no model URL");
  });

  it("prefers asset contract texture URL over renderPackage textureUrls", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.placeable = {
      ...payload.placeable,
      assetManifest: {
        assets: [
          createAssetManifestEntry("texture-role-asset", "texture"),
          createAssetManifestEntry("model-role-asset", "model")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.renderPackage = {
      ...payload.renderPackage,
      textureUrls: ["/assets/fallback.dds"]
    } as PlaceableViewportRenderPayload["renderPackage"];
    payload.assetContracts = {
      assets: [
        createAssetContract("texture-role-asset", "/assets/contract.dds"),
        createAssetContract("model-role-asset", "/assets/contract.glb")
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const textureUrl = resolvePlaceableTextureDeliveryUrl(payload);

    expect(textureUrl).toBe("http://127.0.0.1:3000/assets/contract.dds");
  });

  it("prefers diffuse texture contracts over normal and roughness maps for fallback material binding", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.placeable = {
      ...payload.placeable,
      assetManifest: {
        assets: [
          createAssetManifestEntry("normal-texture", "texture", "tex_core_0106_n.dds"),
          createAssetManifestEntry("roughness-texture", "texture", "tex_core_0106_r.dds"),
          createAssetManifestEntry("diffuse-texture", "texture", "tex_core_0106_d.dds")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.assetContracts = {
      assets: [
        createAssetContract("normal-texture", "/assets/tex_core_0106_n.dds"),
        createAssetContract("roughness-texture", "/assets/tex_core_0106_r.dds"),
        createAssetContract("diffuse-texture", "/assets/tex_core_0106_d.dds")
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const textureUrl = resolvePlaceableTextureDeliveryUrl(payload);

    expect(textureUrl).toBe("http://127.0.0.1:3000/assets/tex_core_0106_d.dds");
  });

  it("falls back to renderPackage.textureUrls when texture role contract is missing", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.placeable = {
      ...payload.placeable,
      assetManifest: {
        assets: [createAssetManifestEntry("model-role-asset", "model")]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.renderPackage = {
      ...payload.renderPackage,
      textureUrls: ["  ", "/assets/fallback.dds", "/assets/ignore.tga"]
    } as PlaceableViewportRenderPayload["renderPackage"];
    payload.assetContracts = {
      assets: [createAssetContract("model-role-asset", "/assets/contract.glb")]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const textureUrl = resolvePlaceableTextureDeliveryUrl(payload);

    expect(textureUrl).toBe("http://127.0.0.1:3000/assets/fallback.dds");
  });

  it("maps texture asset contracts to Aurora texture references by manifest file name", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.placeable = {
      ...payload.placeable,
      assetManifest: {
        assets: [
          createAssetManifestEntry("wood-texture", "texture", "tx_wood.dds"),
          createAssetManifestEntry("metal-texture", "texture", "tx_metal.tga")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.assetContracts = {
      assets: [
        createAssetContract("wood-texture", "/assets/wood.dds"),
        createAssetContract("metal-texture", "/assets/metal.tga")
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const urlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(payload);

    expect([...urlsByReference.entries()]).toEqual([
      ["tx_wood", "http://127.0.0.1:3000/assets/wood.dds"],
      ["tx_metal", "http://127.0.0.1:3000/assets/metal.tga"]
    ]);
  });

  it("omits non-color texture maps from runtime texture reference loading", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.placeable = {
      ...payload.placeable,
      assetManifest: {
        assets: [
          createAssetManifestEntry("diffuse-texture", "texture", "tex_core_0234_d.dds"),
          createAssetManifestEntry("normal-texture", "texture", "tex_core_0234_n.dds"),
          createAssetManifestEntry("roughness-texture", "texture", "tex_core_0234_r.dds"),
          createAssetManifestEntry("stain-texture", "texture", "waterstain.dds")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.renderPackage = {
      ...payload.renderPackage,
      textureUrls: [
        "/assets/tex_core_0235_s.dds",
        "/assets/tex_core_0235_d.dds",
        "/assets/tex_core_0235_n.dds"
      ]
    } as PlaceableViewportRenderPayload["renderPackage"];
    payload.assetContracts = {
      assets: [
        createAssetContract("diffuse-texture", "/assets/tex_core_0234_d.dds"),
        createAssetContract("normal-texture", "/assets/tex_core_0234_n.dds"),
        createAssetContract("roughness-texture", "/assets/tex_core_0234_r.dds"),
        createAssetContract("stain-texture", "/assets/waterstain.dds")
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const urlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(payload);

    expect([...urlsByReference.entries()]).toEqual([
      ["tex_core_0234_d", "http://127.0.0.1:3000/assets/tex_core_0234_d.dds"],
      ["waterstain", "http://127.0.0.1:3000/assets/waterstain.dds"],
      ["tex_core_0235_d", "http://127.0.0.1:3000/assets/tex_core_0235_d.dds"]
    ]);
  });

  it("does not infer _b material texture references from legacy texture assets", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.placeable = {
      ...payload.placeable,
      assetManifest: {
        assets: [
          createAssetManifestEntry("witcher-rug-base", "texture", "wit2_0004_b.dds"),
          createAssetManifestEntry("witcher-rug-base-alt", "texture", "wit2_0004b_b.dds"),
          createAssetManifestEntry("witcher-rug-normal", "texture", "wit2_0004_n.tga"),
          createAssetManifestEntry("witcher-rug-specular", "texture", "wit2_0004_s.dds")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.assetContracts = {
      assets: [
        createAssetContract("witcher-rug-base", "/assets/wit2_0004_b.dds"),
        createAssetContract("witcher-rug-base-alt", "/assets/wit2_0004b_b.dds"),
        createAssetContract("witcher-rug-normal", "/assets/wit2_0004_n.tga"),
        createAssetContract("witcher-rug-specular", "/assets/wit2_0004_s.dds")
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const urlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(payload);

    expect([...urlsByReference.entries()]).toEqual([]);
  });

  it("uses backend textureBindings as authoritative material reference contracts", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.renderPackage = {
      ...payload.renderPackage,
      textureBindings: [
        {
          reference: "wit2_0004_b",
          assetId: "texture-binding-1",
          fileName: "wit2_0004_b.dds",
          objectKey: "modules/current/__aurora/sources/hak/witcher2/wit2_0004_b.dds",
          deliveryUrl: "/assets/backend-contract/wit2_0004_b.dds"
        }
      ]
    } as PlaceableViewportRenderPayload["renderPackage"];
    payload.placeable = {
      ...payload.placeable,
      assetManifest: {
        assets: [
          createAssetManifestEntry("wrong-fallback", "texture", "fxpa_smoke01.tga")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.assetContracts = {
      assets: [
        createAssetContract("wrong-fallback", "/assets/wrong/fxpa_smoke01.tga")
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const urlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(payload);

    expect(urlsByReference.get("wit2_0004_b")).toBe(
      "http://127.0.0.1:3000/assets/backend-contract/wit2_0004_b.dds"
    );
    expect(urlsByReference.get("fxpa_smoke01")).toBe(
      "http://127.0.0.1:3000/assets/wrong/fxpa_smoke01.tga"
    );
  });

  it("keeps the first backend texture binding for source-MDL emitters with duplicate flame textures", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.templateId = "plc_plc_i06";
    payload.placeable = {
      ...payload.placeable,
      templateId: "plc_plc_i06",
      resref: "plc_i06",
      assetManifest: {
        assets: [
          createAssetManifestEntry("hak-flame", "texture", "fxpa_flame00.tga"),
          createAssetManifestEntry("vanilla-flame", "texture", "fxpa_flame00.tga")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.renderPackage = {
      ...payload.renderPackage,
      textureBindings: [
        {
          reference: "fxpa_flame00",
          assetId: "hak-flame",
          fileName: "fxpa_flame00.tga",
          objectKey: "modules/current/__aurora/sources/hak/cep3_vfx/fxpa_flame00.tga",
          deliveryUrl: "/assets/hak/fxpa_flame00.tga"
        },
        {
          reference: "fxpa_flame00",
          assetId: "vanilla-flame",
          fileName: "fxpa_flame00.tga",
          objectKey: "modules/current/__aurora/sources/vanilla/textures/fxpa_flame00.tga",
          deliveryUrl: "/assets/vanilla/fxpa_flame00.tga"
        }
      ],
      auroraEmitter: {
        source: "source-mdl",
        diagnostics: [],
        emitters: [
          {
            sourceModelFileName: "plc_i06.mdl",
            nodeName: "OmenEmitter250",
            texture: "fxpa_flame00",
            emitterType: "Fountain",
            renderMode: "Normal",
            blendMode: "Lighten",
            simulation: {
              birthrate: 8,
              lifeExp: 1.5,
              sizeStart: 0.5,
              sizeEnd: 1,
              alphaStart: 0.8,
              alphaEnd: 0.1
            }
          }
        ]
      }
    } as unknown as PlaceableViewportRenderPayload["renderPackage"];
    payload.assetContracts = {
      assets: [
        createAssetContract("hak-flame", "/assets/hak/fxpa_flame00.tga"),
        createAssetContract("vanilla-flame", "/assets/vanilla/fxpa_flame00.tga")
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const urlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(payload);

    expect(urlsByReference.get("fxpa_flame00")).toBe(
      "http://127.0.0.1:3000/assets/hak/fxpa_flame00.tga"
    );
  });

  it("keeps backend source texture bindings for data-classified source-MDL emitters", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.templateId = "plc_custom_fire";
    payload.placeable = {
      ...payload.placeable,
      templateId: "plc_custom_fire",
      resref: "custom_fire",
      assetManifest: {
        assets: [
          createAssetManifestEntry("hak-flame", "texture", "fxpa_flame00.tga"),
          createAssetManifestEntry("vanilla-flame", "texture", "fxpa_flame00.tga"),
          createAssetManifestEntry("vanilla-smoke", "texture", "fxpa_smoke01.tga")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.renderPackage = {
      ...payload.renderPackage,
      textureBindings: [
        {
          reference: "fxpa_flame00",
          assetId: "hak-flame",
          fileName: "fxpa_flame00.tga",
          objectKey: "modules/current/__aurora/sources/hak/cep3_vfx/fxpa_flame00.tga",
          deliveryUrl: "/assets/hak/fxpa_flame00.tga"
        },
        {
          reference: "fxpa_flame00",
          assetId: "vanilla-flame",
          fileName: "fxpa_flame00.tga",
          objectKey: "modules/current/__aurora/sources/vanilla/textures/fxpa_flame00.tga",
          deliveryUrl: "/assets/vanilla/fxpa_flame00.tga"
        },
        {
          reference: "fxpa_smoke01",
          assetId: "vanilla-smoke",
          fileName: "fxpa_smoke01.tga",
          objectKey: "modules/current/__aurora/sources/vanilla/textures/fxpa_smoke01.tga",
          deliveryUrl: "/assets/vanilla/fxpa_smoke01.tga"
        }
      ],
      auroraEmitter: {
        source: "source-mdl",
        diagnostics: [],
        emitters: [
          {
            sourceModelFileName: "custom_fire_holder.mdl",
            sourceModelAssetId: "custom-fire-model",
            sourceModelObjectKey: "modules/current/models/custom_fire_holder.mdl",
            nodeName: "sourceFireA",
            texture: "fxpa_flame00",
            emitterType: "Fountain",
            renderMode: "Normal",
            blendMode: "Lighten",
            simulation: {
              birthrate: 6,
              lifeExp: 2,
              sizeStart: 2,
              sizeEnd: 4,
              alphaStart: 0.75,
              alphaEnd: 0.1
            },
            transform: {
              position: [0, 0, 0.2]
            }
          },
          {
            sourceModelFileName: "custom_fire_holder.mdl",
            sourceModelAssetId: "custom-fire-model",
            sourceModelObjectKey: "modules/current/models/custom_fire_holder.mdl",
            nodeName: "sourceSmokeA",
            texture: "fxpa_smoke01",
            emitterType: "Fountain",
            renderMode: "Normal",
            blendMode: "Normal",
            simulation: {
              birthrate: 5,
              lifeExp: 2,
              sizeStart: 2,
              sizeEnd: 4,
              alphaStart: 0.1,
              alphaEnd: 0
            },
            transform: {
              position: [0, 0, 1.7]
            }
          }
        ]
      }
    } as unknown as PlaceableViewportRenderPayload["renderPackage"];
    payload.assetContracts = {
      assets: [
        createAssetContract("hak-flame", "/assets/hak/fxpa_flame00.tga"),
        createAssetContract("vanilla-flame", "/assets/vanilla/fxpa_flame00.tga"),
        createAssetContract("vanilla-smoke", "/assets/vanilla/fxpa_smoke01.tga")
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const urlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(payload);

    expect(urlsByReference.get("fxpa_flame00")).toBe(
      "http://127.0.0.1:3000/assets/hak/fxpa_flame00.tga"
    );
    expect(urlsByReference.get("fxpa_smoke01")).toBe(
      "http://127.0.0.1:3000/assets/vanilla/fxpa_smoke01.tga"
    );
  });

  it("exposes neutral source-MDL emitter texture URLs from backend bindings", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.templateId = "plc_generic_source_emitter";
    payload.placeable = {
      ...payload.placeable,
      templateId: "plc_generic_source_emitter",
      resref: "generic_source_emitter",
      metadata: {
        lookupModelResRef: "generic_source_emitter"
      },
      assetManifest: {
        assets: [
          createAssetManifestEntry("neutral-texture", "texture", "fxpa_arcane01.tga")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.renderPackage = {
      ...payload.renderPackage,
      textureBindings: [
        {
          reference: "fxpa_arcane01",
          assetId: "neutral-texture",
          fileName: "fxpa_arcane01.tga",
          objectKey: "modules/current/__aurora/sources/vanilla/textures/fxpa_arcane01.tga",
          deliveryUrl: "/assets/vanilla/fxpa_arcane01.tga"
        }
      ],
      auroraEmitter: {
        source: "source-mdl",
        diagnostics: [],
        emitters: [
          {
            sourceModelFileName: "generic_source_emitter.mdl",
            sourceModelAssetId: "generic-source-model",
            sourceModelObjectKey: "modules/current/models/generic_source_emitter.mdl",
            nodeName: "genericEmitter",
            texture: "fxpa_arcane01",
            emitterType: "Fountain",
            renderMode: "Normal",
            blendMode: "Normal",
            simulation: {
              birthrate: 3,
              lifeExp: 2,
              sizeStart: 0.8,
              sizeEnd: 1.2,
              alphaStart: 0.9,
              alphaEnd: 0.1
            },
            transform: {
              position: [0.25, -0.5, 1.25]
            }
          }
        ]
      }
    } as unknown as PlaceableViewportRenderPayload["renderPackage"];
    payload.assetContracts = {
      assets: [
        createAssetContract("neutral-texture", "/assets/vanilla/fxpa_arcane01.tga")
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const urlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(payload);

    expect(urlsByReference.get("fxpa_arcane01")).toBe(
      "http://127.0.0.1:3000/assets/vanilla/fxpa_arcane01.tga"
    );
  });

  it("keeps first texture binding for duplicate fxpa_flame00 resources", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.placeable = {
      ...payload.placeable,
      assetManifest: {
        assets: [
          createAssetManifestEntry("hak-flame", "texture", "fxpa_flame00.tga"),
          createAssetManifestEntry("vanilla-flame", "texture", "fxpa_flame00.tga")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.renderPackage = {
      ...payload.renderPackage,
      textureBindings: [
        {
          reference: "fxpa_flame00",
          assetId: "hak-flame",
          fileName: "fxpa_flame00.tga",
          objectKey: "modules/current/__aurora/sources/hak/cep3_vfx/fxpa_flame00.tga",
          deliveryUrl: "/assets/hak/fxpa_flame00.tga"
        },
        {
          reference: "fxpa_flame00",
          assetId: "vanilla-flame",
          fileName: "fxpa_flame00.tga",
          objectKey: "modules/current/__aurora/sources/vanilla/textures/fxpa_flame00.tga",
          deliveryUrl: "/assets/vanilla/fxpa_flame00.tga"
        }
      ]
    } as PlaceableViewportRenderPayload["renderPackage"];
    payload.assetContracts = {
      assets: [
        createAssetContract("hak-flame", "/assets/hak/fxpa_flame00.tga"),
        createAssetContract("vanilla-flame", "/assets/vanilla/fxpa_flame00.tga")
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const urlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(payload);

    expect(urlsByReference.get("fxpa_flame00")).toBe(
      "http://127.0.0.1:3000/assets/hak/fxpa_flame00.tga"
    );
  });

  it("uses asset delivery paths for bucket-backed texture bindings so TPC fetch can decode", () => {
    const originalLocation = globalThis.location;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: new URL("http://127.0.0.1:5173/app")
    });
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.renderPackage = {
      ...payload.renderPackage,
      textureBindings: [
        {
          reference: "qp_barrel_02",
          assetId: "barrel-texture",
          fileName: "qp_barrel_02.dds",
          objectKey: "modules/current/__aurora/sources/hak/q_placeables/qp_barrel_02.dds",
          deliveryUrl:
            "http://127.0.0.1:8888/buckets/aurora-module-assets/modules/current/__aurora/sources/hak/q_placeables/qp_barrel_02.dds"
        }
      ]
    } as PlaceableViewportRenderPayload["renderPackage"];
    payload.placeable = {
      ...payload.placeable,
      assetManifest: {
        assets: [
          createAssetManifestEntry("barrel-texture", "texture", "qp_barrel_02.dds")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.assetContracts = {
      assets: [
        {
          ...createAssetContract(
            "barrel-texture",
            "http://127.0.0.1:8888/buckets/aurora-module-assets/modules/current/__aurora/sources/hak/q_placeables/qp_barrel_02.dds"
          ),
          deliveryPath:
            "/api/v1/catalog/placeables/cache/cache_key/assets/barrel-texture.dds"
        }
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    try {
      const urlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(payload);

      expect(urlsByReference.get("qp_barrel_02")).toBe(
        "http://127.0.0.1:5173/_aurora/v1/catalog/placeables/cache/cache_key/assets/barrel-texture.dds"
      );
    } finally {
      Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: originalLocation
      });
    }
  });

  it("maps renderPackage textureUrls to Aurora texture references when contracts omit textures", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.renderPackage = {
      ...payload.renderPackage,
      textureUrls: ["  ", "/assets/u_grim.dds?cache=1", "/assets/u_metal.tga"]
    } as PlaceableViewportRenderPayload["renderPackage"];
    payload.assetContracts = {
      assets: [createAssetContract("model-role-asset", "/assets/contract.glb")]
    } as PlaceableViewportRenderPayload["assetContracts"];

    const urlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(payload);

    expect([...urlsByReference.entries()]).toEqual([
      ["u_grim", "http://127.0.0.1:3000/assets/u_grim.dds?cache=1"],
      ["u_metal", "http://127.0.0.1:3000/assets/u_metal.tga"]
    ]);
  });

  it("exposes fxpa_dot01 by reference without selecting it as the model diffuse fallback", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.placeable = {
      ...payload.placeable,
      assetManifest: {
        assets: [
          createAssetManifestEntry("shadow-texture", "texture", "fxpa_dot01.tga")
        ]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.assetContracts = {
      assets: [
        createAssetContract(
          "shadow-texture",
          "/api/v1/catalog/placeables/cache/cache_key/assets/shadow-texture.tga"
        )
      ]
    } as PlaceableViewportRenderPayload["assetContracts"];

    expect(resolvePlaceableTextureDeliveryUrl(payload)).toBeNull();
    expect(resolvePlaceableTextureDeliveryUrlsByReference(payload).get("fxpa_dot01")).toBe(
      "http://127.0.0.1:3000/api/v1/catalog/placeables/cache/cache_key/assets/shadow-texture.tga"
    );
  });

  it("returns null when no texture URL can be resolved from contract or renderPackage", () => {
    const payload = createPlaceableViewportPayload({ status: "ready" });
    payload.placeable = {
      ...payload.placeable,
      assetManifest: {
        assets: [createAssetManifestEntry("model-role-asset", "model")]
      }
    } as PlaceableViewportRenderPayload["placeable"];
    payload.renderPackage = {
      ...payload.renderPackage,
      textureUrls: ["   ", ""]
    } as PlaceableViewportRenderPayload["renderPackage"];
    payload.assetContracts = {
      assets: [createAssetContract("model-role-asset", "/assets/contract.glb")]
    } as PlaceableViewportRenderPayload["assetContracts"];

    expect(resolvePlaceableTextureDeliveryUrl(payload)).toBeNull();
  });

  it("does not treat raw model asset IDs as GLTF candidates", () => {
    const payload = createPlaceableViewportPayload({
      status: "ready",
      assetRefs: {
        modelAssetIds: ["raw-model-1"]
      }
    });
    payload.assetContracts.assets = [createAssetContract("raw-model-1", "/assets/raw-model.glb")];

    const resolution = resolvePlaceableModelResolution(payload);
    expect(resolution.ready).toBe(false);
    expect(resolution.modelUrl).toBeNull();
    expect(resolution.fallbackReason).toBe("renderPackage has no model URL");
  });

  it("resolves supported/unsupported model candidate formats", () => {
    expect(resolveUnsupportedModelCandidateReason("/assets/door.gltf")).toBeNull();
    expect(resolveUnsupportedModelCandidateReason("/assets/door.glb")).toBeNull();
    expect(resolveUnsupportedModelCandidateReason("/assets/door.mdb")).toBe(
      "model URL resolves to unsupported extension .mdb"
    );
    expect(resolveUnsupportedModelCandidateReason("/assets/door.txt")).toBe(
      "model URL has unsupported extension .txt"
    );
    expect(resolveUnsupportedModelCandidateReason("")).toBe("model URL is empty");
  });

  it("falls back when renderPackage payload is unavailable", () => {
    const payloadWithoutRenderPackage = {
      ...createPlaceableViewportPayload({ status: "ready" }),
      renderPackage: undefined
    };
    const resolution = resolvePlaceableModelResolution(payloadWithoutRenderPackage);
    expect(resolution.ready).toBe(false);
    expect(resolution.modelUrl).toBeNull();
  });
});

describe("WorkspaceCanvasViewport placeable texture loader cache", () => {
  function createTextureRuntime(loaders: {
    defaultLoader?: ReturnType<typeof vi.fn>;
    ddsLoader?: ReturnType<typeof vi.fn>;
    tgaLoader?: ReturnType<typeof vi.fn>;
    textureFetch?: ReturnType<typeof vi.fn>;
  }) {
    const fallbackLoader =
      loaders.defaultLoader ??
      vi.fn((_url: string, onLoad: (texture: THREE.Texture) => void) => {
        onLoad(new THREE.Texture());
      });
    const ddsLoader =
      loaders.ddsLoader ??
      vi.fn((_url: string, onLoad: (texture: THREE.Texture) => void) => {
        onLoad(new THREE.Texture());
      });
    const tgaLoader =
      loaders.tgaLoader ??
      vi.fn((_url: string, onLoad: (texture: THREE.Texture) => void) => {
        onLoad(new THREE.Texture());
      });
    return {
      runtime: {
        placeableTextureLoader: { load: fallbackLoader },
        placeableDdsTextureLoader: { load: ddsLoader },
        placeableTgaTextureLoader: { load: tgaLoader },
        placeableTextureFetch: loaders.textureFetch,
        placeableTextureRequestHeader: {},
        placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
        placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>()
      },
      fallbackLoader,
      ddsLoader,
      tgaLoader
    };
  }

  function buildTpcDxt1Fixture(): ArrayBuffer {
    const bytes = new ArrayBuffer(28);
    const view = new DataView(bytes);
    view.setUint32(0, 4, true);
    view.setUint32(4, 4, true);
    view.setUint32(8, 3, true);
    view.setUint32(12, 8, true);
    view.setFloat32(16, 1, true);
    view.setUint16(20, 0xf800, true);
    view.setUint16(22, 0x07e0, true);
    view.setUint32(24, 0x000000e4, true);
    return bytes;
  }

  function buildTpcDxt5Fixture(): ArrayBuffer {
    const bytes = new ArrayBuffer(36);
    const view = new DataView(bytes);
    view.setUint32(0, 4, true);
    view.setUint32(4, 4, true);
    view.setUint32(8, 4, true);
    view.setUint32(12, 16, true);
    view.setFloat32(16, 1, true);
    view.setUint8(20, 255);
    view.setUint8(21, 0);
    view.setUint8(22, 2);
    view.setUint8(23, 0);
    view.setUint8(24, 0);
    view.setUint8(25, 0);
    view.setUint8(26, 0);
    view.setUint8(27, 0);
    view.setUint16(28, 0xf800, true);
    view.setUint16(30, 0x07e0, true);
    view.setUint32(32, 0, true);
    return bytes;
  }

  function writeFourCc(bytes: Uint8Array, offset: number, fourCc: string): void {
    fourCc.split("").forEach((character, index) => {
      bytes[offset + index] = character.charCodeAt(0);
    });
  }

  function buildStandardDdsAti1Fixture(): ArrayBuffer {
    const bytes = new Uint8Array(128 + 8);
    const view = new DataView(bytes.buffer);
    writeFourCc(bytes, 0, "DDS ");
    view.setUint32(4, 124, true);
    view.setUint32(12, 4, true);
    view.setUint32(16, 4, true);
    view.setUint32(76, 32, true);
    view.setUint32(80, 4, true);
    writeFourCc(bytes, 84, "ATI1");
    bytes[128] = 96;
    bytes[129] = 0;
    return bytes.buffer;
  }

  function buildStandardDdsAti2Fixture(): ArrayBuffer {
    const bytes = new Uint8Array(128 + 16);
    const view = new DataView(bytes.buffer);
    writeFourCc(bytes, 0, "DDS ");
    view.setUint32(4, 124, true);
    view.setUint32(12, 4, true);
    view.setUint32(16, 4, true);
    view.setUint32(76, 32, true);
    view.setUint32(80, 4, true);
    writeFourCc(bytes, 84, "ATI2");
    bytes[128] = 128;
    bytes[129] = 0;
    bytes[136] = 128;
    bytes[137] = 0;
    return bytes.buffer;
  }

  function buildStandardDdsDxt3Fixture(): ArrayBuffer {
    const bytes = new Uint8Array(128 + 16);
    const view = new DataView(bytes.buffer);
    writeFourCc(bytes, 0, "DDS ");
    view.setUint32(4, 124, true);
    view.setUint32(12, 4, true);
    view.setUint32(16, 4, true);
    view.setUint32(76, 32, true);
    view.setUint32(80, 4, true);
    writeFourCc(bytes, 84, "DXT3");
    bytes[128] = 0xf8;
    for (let index = 129; index < 136; index += 1) {
      bytes[index] = 0xff;
    }
    view.setUint16(136, 0xf800, true);
    view.setUint16(138, 0x07e0, true);
    view.setUint32(140, 0, true);
    return bytes.buffer;
  }

  it("decodes Aurora TPC DXT1 bytes exposed through DDS asset contracts", () => {
    const decodedTexture = decodeAuroraTpcTexture(buildTpcDxt1Fixture());

    expect(decodedTexture?.sourceFormat).toBe("tpc-dxt1");
    expect(decodedTexture?.width).toBe(4);
    expect(decodedTexture?.height).toBe(4);
    expect(decodedTexture?.hasAlpha).toBe(false);
    expect(decodedTexture?.isBimodal).toBe(true);
    expect(decodedTexture?.softAlphaPixelRatio).toBe(0);
    expect(Array.from(decodedTexture?.data.slice(0, 16) ?? [])).toEqual([
      255,
      0,
      0,
      255,
      0,
      255,
      0,
      255,
      170,
      85,
      0,
      255,
      85,
      170,
      0,
      255
    ]);
  });

  it("decodes Aurora TPC DXT5 bytes exposed through DDS asset contracts", () => {
    const decodedTexture = decodeAuroraTpcTexture(buildTpcDxt5Fixture());

    expect(decodedTexture?.sourceFormat).toBe("tpc-dxt5");
    expect(decodedTexture?.width).toBe(4);
    expect(decodedTexture?.height).toBe(4);
    expect(decodedTexture?.hasAlpha).toBe(true);
    expect(decodedTexture?.isBimodal).toBe(false);
    expect(decodedTexture?.softAlphaPixelRatio).toBeCloseTo(1 / 16);
    expect(Array.from(decodedTexture?.data.slice(0, 4) ?? [])).toEqual([255, 0, 0, 219]);
  });

  it("decodes standard DDS ATI1 and ATI2 blocks exposed through DDS asset contracts", () => {
    const specularTexture = decodeAuroraTpcTexture(buildStandardDdsAti1Fixture());
    const normalTexture = decodeAuroraTpcTexture(buildStandardDdsAti2Fixture());

    expect(specularTexture?.sourceFormat).toBe("dds-bc4");
    expect(specularTexture?.isNormalMap).toBe(false);
    expect(Array.from(specularTexture?.data.slice(0, 4) ?? [])).toEqual([96, 96, 96, 255]);
    expect(normalTexture?.sourceFormat).toBe("dds-bc5");
    expect(normalTexture?.isNormalMap).toBe(true);
    expect(Array.from(normalTexture?.data.slice(0, 4) ?? [])).toEqual([128, 128, 255, 255]);
  });

  it("decodes standard DDS DXT3 alpha blocks with webviewer-style alpha profile", () => {
    const decodedTexture = decodeAuroraTpcTexture(buildStandardDdsDxt3Fixture());

    expect(decodedTexture?.sourceFormat).toBe("dds-dxt3");
    expect(decodedTexture?.hasAlpha).toBe(true);
    expect(decodedTexture?.isBimodal).toBe(false);
    expect(decodedTexture?.softAlphaPixelRatio).toBeCloseTo(1 / 16);
    expect(decodedTexture?.isNormalMap).toBe(false);
    expect(Array.from(decodedTexture?.data.slice(0, 4) ?? [])).toEqual([255, 0, 0, 136]);
  });

  it("selects DDS and TGA loaders by URL extension", async () => {
    const { runtime, fallbackLoader, ddsLoader, tgaLoader } = createTextureRuntime({});

    await expect(
      ensurePlaceableTexture(runtime, "http://localhost:3000/assets/plc_gate.dds?etag=1")
    ).resolves.toBeInstanceOf(THREE.Texture);
    await expect(
      ensurePlaceableTexture(runtime, "http://localhost:3000/assets/plc_gate.tga")
    ).resolves.toBeInstanceOf(THREE.Texture);
    await expect(
      ensurePlaceableTexture(runtime, "http://localhost:3000/assets/plc_gate.png")
    ).resolves.toBeInstanceOf(THREE.Texture);

    expect(ddsLoader).toHaveBeenCalledTimes(1);
    expect(tgaLoader).toHaveBeenCalledTimes(1);
    expect(fallbackLoader).toHaveBeenCalledTimes(1);
  });

  it("loads Aurora TPC bytes before falling back to DDS loaders", async () => {
    const textureFetch = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => buildTpcDxt1Fixture()
    }));
    const { runtime, ddsLoader } = createTextureRuntime({ textureFetch });
    runtime.placeableTextureRequestHeader = { Authorization: "Bearer token-123" };

    const texture = await ensurePlaceableTexture(runtime, "/assets/u_grim.dds");

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture?.userData.auroraSourceFormat).toBe("tpc-dxt1");
    expect(texture?.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture?.flipY).toBe(false);
    expect(texture?.wrapS).toBe(THREE.RepeatWrapping);
    expect(texture?.wrapT).toBe(THREE.RepeatWrapping);
    expect(textureFetch).toHaveBeenCalledWith("/assets/u_grim.dds", {
      headers: { Authorization: "Bearer token-123" },
      signal: expect.any(AbortSignal)
    });
    expect(ddsLoader).not.toHaveBeenCalled();
  });

  it("loads Aurora TPC DXT5 bytes before falling back to DDS loaders", async () => {
    const textureFetch = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => buildTpcDxt5Fixture()
    }));
    const { runtime, ddsLoader } = createTextureRuntime({ textureFetch });
    runtime.placeableTextureRequestHeader = { Authorization: "Bearer token-456" };

    const texture = await ensurePlaceableTexture(runtime, "/assets/ad_watpud03.dds");

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture?.userData.auroraSourceFormat).toBe("tpc-dxt5");
    expect(texture?.userData.auroraTextureHasAlpha).toBe(true);
    expect(texture?.userData.auroraTextureIsBimodal).toBe(false);
    expect(texture?.userData.auroraTextureSoftAlphaPixelRatio).toBeCloseTo(1 / 16);
    expect(textureFetch).toHaveBeenCalledWith("/assets/ad_watpud03.dds", {
      headers: { Authorization: "Bearer token-456" },
      signal: expect.any(AbortSignal)
    });
    expect(ddsLoader).not.toHaveBeenCalled();
  });

  it("loads authenticated TGA assets through authorized object URLs", async () => {
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const objectUrl = "blob:http://localhost/aurora-tga-texture";
    const textureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cache_key/assets/asset_01.tga";
    const loadedTexture = new THREE.Texture();
    const tgaLoader = vi.fn((url: string, onLoad: (texture: THREE.Texture) => void) => {
      expect(url).toBe(objectUrl);
      onLoad(loadedTexture);
    });
    const textureFetch = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
      blob: async () => new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/x-tga" })
    }));
    const { runtime } = createTextureRuntime({ textureFetch, tgaLoader });
    runtime.placeableTextureRequestHeader = { Authorization: "Bearer token-789" };

    URL.createObjectURL = vi.fn(() => objectUrl);
    URL.revokeObjectURL = vi.fn();
    try {
      const texture = await ensurePlaceableTexture(runtime, textureUrl);

      expect(texture).toBe(loadedTexture);
      expect(textureFetch).toHaveBeenCalledTimes(3);
      expect(textureFetch).toHaveBeenCalledWith(textureUrl, {
        headers: { Authorization: "Bearer token-789" },
        signal: expect.any(AbortSignal)
      });
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrl);
      expect(texture?.userData.auroraSourceUrl).toBe(textureUrl);
      expect(texture?.userData.auroraFetchedViaAuthorizedBlob).toBe(true);
      expect(runtime.placeableTextureCacheByUrl.get(textureUrl)).toBe(texture);
    } finally {
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    }
  });

  it("deduplicates pending texture loads", async () => {
    let resolveTexture: ((texture: THREE.Texture) => void) | null = null;
    const ddsLoader = vi.fn((_url: string, onLoad: (texture: THREE.Texture) => void) => {
      resolveTexture = onLoad;
    });
    const { runtime } = createTextureRuntime({ ddsLoader });

    const first = ensurePlaceableTexture(runtime, "/assets/shared.dds");
    const second = ensurePlaceableTexture(runtime, "/assets/shared.dds");
    expect(ddsLoader).toHaveBeenCalledTimes(1);

    const texture = new THREE.Texture();
    resolveTexture?.(texture);

    await expect(first).resolves.toBe(texture);
    await expect(second).resolves.toBe(texture);
    await expect(ensurePlaceableTexture(runtime, "/assets/shared.dds")).resolves.toBe(texture);
    expect(ddsLoader).toHaveBeenCalledTimes(1);
  });

  it("applies loaded textures without inventing a two-sided material policy", () => {
    const material = new THREE.MeshStandardMaterial();
    const model = new THREE.Group();
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const texture = new THREE.Texture();

    applyPlaceableTextureToModel(model, texture);

    expect(material.map).toBe(texture);
    expect(material.side).toBe(THREE.FrontSide);
    expect(material.transparent).toBe(false);
    expect(material.opacity).toBe(1);
    expect(material.alphaTest).toBe(0);
  });

  it("applies loaded textures to model materials by Aurora texture reference", () => {
    const woodMaterial = new THREE.MeshStandardMaterial();
    woodMaterial.userData = { aurora: { textureReference: "tx_wood" } };
    const metalMaterial = new THREE.MeshStandardMaterial();
    metalMaterial.userData = { aurora: { textureReference: "tx_metal" } };
    const model = new THREE.Group();
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), woodMaterial));
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), metalMaterial));
    const woodTexture = new THREE.Texture();
    const metalTexture = new THREE.Texture();

    applyPlaceableTexturesToModel(
      model,
      new Map([
        ["tx_wood", woodTexture],
        ["tx_metal", metalTexture]
      ])
    );

    expect(woodMaterial.map).toBe(woodTexture);
    expect(metalMaterial.map).toBe(metalTexture);
  });

  it("prefers explicit textureReference and uses fallback only for unresolved default materials", () => {
    const materialWithPrimary = new THREE.MeshStandardMaterial();
    materialWithPrimary.userData = {
      aurora: { textureReference: "tx_wood", textureReferences: ["tx_fallback"] }
    };
    const materialWithFallbackList = new THREE.MeshStandardMaterial();
    materialWithFallbackList.userData = {
      aurora: { textureReferences: ["tx_fallback_one", "tx_fallback_two"] }
    };
    const materialWithoutReferences = new THREE.MeshStandardMaterial();
    const model = new THREE.Group();
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materialWithPrimary));
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materialWithFallbackList));
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materialWithoutReferences));

    const woodTexture = new THREE.Texture();
    const fallbackTexture = new THREE.Texture();
    const fallbackListTexture = new THREE.Texture();

    applyPlaceableTexturesToModel(
      model,
      new Map([
        ["tx_wood", woodTexture],
        ["tx_fallback_two", fallbackListTexture]
      ]),
      fallbackTexture
    );

    expect(materialWithPrimary.map).toBe(woodTexture);
    expect(materialWithFallbackList.map).toBe(fallbackTexture);
    expect(materialWithoutReferences.map).toBe(fallbackTexture);
  });

  it("uses the single loaded texture as fallback when a model material has no Aurora reference", () => {
    const materialWithoutReferences = new THREE.MeshStandardMaterial();
    const model = new THREE.Group();
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materialWithoutReferences));
    const texture = new THREE.Texture();

    applyPlaceableTexturesToModel(model, new Map([["u_grim", texture]]));

    expect(materialWithoutReferences.map).toBe(texture);
  });

  it("uses Aurora material names as texture references when extras are absent", () => {
    const material = new THREE.MeshStandardMaterial();
    material.name = "Aurora material U_GRIM";
    const model = new THREE.Group();
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const texture = new THREE.Texture();

    applyPlaceableTexturesToModel(model, new Map([["u_grim", texture]]));

    expect(material.map).toBe(texture);
  });

  it("uses GLTFLoader material extras as Aurora texture references", async () => {
    const model = await parseGltfFixture(buildMultiMaterialGlbFixture());
    const materials: THREE.MeshStandardMaterial[] = [];
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      const materialList = Array.isArray(node.material) ? node.material : [node.material];
      materials.push(...(materialList as THREE.MeshStandardMaterial[]));
    });
    const woodTexture = new THREE.Texture();
    const metalTexture = new THREE.Texture();

    applyPlaceableTexturesToModel(
      model,
      new Map([
        ["tx_wood", woodTexture],
        ["tx_metal", metalTexture]
      ])
    );

    expect(materials.map((material) => material.userData.aurora)).toEqual([
      { textureReference: "tx_wood" },
      { textureReference: "tx_metal" }
    ]);
    expect(materials.map((material) => material.map)).toEqual([
      woodTexture,
      metalTexture
    ]);
  });
});

describe("WorkspaceCanvasViewport placeable asset request headers", () => {
  it("applies bearer headers to model and binary texture loaders", () => {
    const runtime = {
      placeableTextureLoader: { setRequestHeader: vi.fn() },
      placeableDdsTextureLoader: { setRequestHeader: vi.fn() },
      placeableTgaTextureLoader: { setRequestHeader: vi.fn() },
      placeableModelLoader: { setRequestHeader: vi.fn() }
    };

    applyPlaceableAssetRequestHeaders(runtime, " token-123 ");

    Object.values(runtime).forEach((loader) => {
      expect(loader.setRequestHeader).toHaveBeenCalledWith({
        Authorization: "Bearer token-123"
      });
    });

    applyPlaceableAssetRequestHeaders(runtime, null);

    Object.values(runtime).forEach((loader) => {
      expect(loader.setRequestHeader).toHaveBeenLastCalledWith({});
    });
  });
});

describe("WorkspaceCanvasViewport placeable model loader cache", () => {
  it("keeps normalized GLB roots on the grid while primitive placeholders stay centered", () => {
    expect(resolveSceneObjectRenderBaseY(false, 0.24)).toBe(0);
    expect(resolveSceneObjectRenderBaseY(true, 0.24)).toBeCloseTo(0.252, 6);
  });

  it("anchors low-profile placeable fallbacks to the grid instead of floating like spheres", () => {
    const fallbackGeometry = createPlaceableFallbackGeometry(0.24);

    expect(resolveSceneObjectRenderBaseY(true, 0.24, fallbackGeometry)).toBeCloseTo(
      0.0216,
      6
    );
  });

  it("uses a low-profile fallback for placeables without a renderable web model", () => {
    const unsupportedPayload = createPlaceableViewportPayload({ status: "unsupported" });
    const readyWithoutModelPayload = createPlaceableViewportPayload({ status: "ready" });
    const readyWithDerivedPayload = createPlaceableViewportPayload({
      status: "ready",
      assetRefs: { derivedModelAssetIds: ["derived-model-1"] }
    });

    expect(createPlaceableGeometryFromPayload(unsupportedPayload, 0.24).type).toBe(
      "BoxGeometry"
    );
    expect(createPlaceableGeometryFromPayload(readyWithoutModelPayload, 0.24).type).toBe(
      "BoxGeometry"
    );
    expect(createPlaceableGeometryFromPayload(readyWithDerivedPayload, 0.24).type).toBe(
      "BoxGeometry"
    );
  });

  it("uses a VFX marker instead of the low-profile box for unsupported VFX emitters", () => {
    const vfxPayload = createPlaceableViewportPayload({ status: "unsupported" });
    vfxPayload.placeable.placeableSubtype = "vfx";
    vfxPayload.placeable.name = "VFX: Magic Sparks, Blue";
    vfxPayload.placeable.render = {
      backendType: "vfx",
      frontendType: "vfx",
      rendererPreset: "vfx-emitter",
      isDoor: false,
      isVfx: true
    };

    expect(createPlaceableGeometryFromPayload(vfxPayload, 0.24).type).toBe(
      "OctahedronGeometry"
    );
    expect(resolvePlaceableVfxColor(vfxPayload)).toBe("#6aa7ff");

    vfxPayload.placeable.name = "VFX: Shaft of Light, Yellow 1";
    expect(createPlaceableGeometryFromPayload(vfxPayload, 0.24).type).toBe(
      "CylinderGeometry"
    );
    expect(resolvePlaceableVfxColor(vfxPayload)).toBe("#ffe066");
  });

  it("centers placeable models horizontally and anchors them to the ground", () => {
    const model = new THREE.Group();
    const geometry = new THREE.BoxGeometry(2, 4, 6);
    geometry.translate(20, -12, 8);
    model.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));

    normalizePlaceableModelToObjectRadius(1, model, { targetMaxAxisFactor: 4 });

    const bounds = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bounds.getCenter(center);
    bounds.getSize(size);

    expect(center.x).toBeCloseTo(0, 5);
    expect(center.z).toBeCloseTo(0, 5);
    expect(bounds.min.y).toBeCloseTo(0, 5);
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(4, 5);
  });

  function createModelRuntime(
    loadImpl: (
      onLoad: (result: { scene: THREE.Object3D | null }) => void,
      onError: () => void
    ) => void
  ) {
    const load = vi.fn(
      (
        _url: string,
        onLoad: (result: { scene: THREE.Object3D | null }) => void,
        _onProgress: unknown,
        onError: () => void
      ) => {
        loadImpl(onLoad, onError);
        return undefined as never;
      }
    );
    return {
      runtime: {
        placeableModelLoader: { load },
        placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
        placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>()
      },
      load
    };
  }

  it("attempts GLTFLoader load for ready renderPackage model URLs", async () => {
    const payload = createPlaceableViewportPayload({
      glbUrl: "/assets/placeable.glb",
      modelUrl: "/assets/fallback.gltf"
    });
    const resolution = resolvePlaceableModelResolution(payload);
    expect(resolution.modelUrl).toBe("http://127.0.0.1:3000/assets/placeable.glb");
    if (!resolution.modelUrl) {
      throw new Error("Expected model URL for ready payload");
    }

    const { runtime, load } = createModelRuntime((onLoad) => {
      onLoad({ scene: new THREE.Group() });
    });
    const model = await ensurePlaceableModel(runtime, resolution.modelUrl);

    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/assets/placeable.glb",
      expect.any(Function),
      undefined,
      expect.any(Function)
    );
    expect(model).toBeInstanceOf(THREE.Object3D);
  });

  it("deduplicates pending GLTF loads and returns cloned scenes", async () => {
    let resolveLoad: ((value: { scene: THREE.Object3D | null }) => void) | null = null;
    const { runtime, load } = createModelRuntime((onLoad) => {
      resolveLoad = onLoad;
    });

    const firstPromise = ensurePlaceableModel(runtime, "http://localhost:3000/assets/barrel.glb");
    const secondPromise = ensurePlaceableModel(runtime, "http://localhost:3000/assets/barrel.glb");

    expect(load).toHaveBeenCalledTimes(1);
    const loadedScene = new THREE.Group();
    loadedScene.name = "source";
    const sourceMaterial = new THREE.MeshStandardMaterial();
    loadedScene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sourceMaterial));
    resolveLoad?.({ scene: loadedScene });

    const [firstModel, secondModel] = await Promise.all([firstPromise, secondPromise]);
    expect(firstModel).toBeInstanceOf(THREE.Object3D);
    expect(secondModel).toBeInstanceOf(THREE.Object3D);
    expect(firstModel).not.toBe(secondModel);
    expect(firstModel).not.toBe(loadedScene);
    expect(secondModel).not.toBe(loadedScene);
    expect(firstMeshMaterial(firstModel!)).not.toBe(sourceMaterial);
    expect(firstMeshMaterial(secondModel!)).not.toBe(sourceMaterial);
    expect(firstMeshMaterial(firstModel!)).not.toBe(firstMeshMaterial(secondModel!));

    const thirdModel = await ensurePlaceableModel(
      runtime,
      "http://localhost:3000/assets/barrel.glb"
    );
    expect(load).toHaveBeenCalledTimes(1);
    expect(thirdModel).toBeInstanceOf(THREE.Object3D);
    expect(thirdModel).not.toBe(loadedScene);
    expect(firstMeshMaterial(thirdModel!)).not.toBe(sourceMaterial);
  });

  it("can reuse cached model materials for immutable scene clones", async () => {
    const { runtime, load } = createModelRuntime((onLoad) => {
      const loadedScene = new THREE.Group();
      const sourceMaterial = new THREE.MeshStandardMaterial();
      loadedScene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sourceMaterial));
      onLoad({ scene: loadedScene });
    });

    const firstModel = await ensurePlaceableModel(
      runtime,
      "http://localhost:3000/assets/shared-material.glb",
      { cloneMaterials: false }
    );
    const secondModel = await ensurePlaceableModel(
      runtime,
      "http://localhost:3000/assets/shared-material.glb",
      { cloneMaterials: false }
    );

    expect(load).toHaveBeenCalledTimes(1);
    expect(firstModel).toBeInstanceOf(THREE.Object3D);
    expect(secondModel).toBeInstanceOf(THREE.Object3D);
    expect(firstMeshMaterial(firstModel!)).toBe(firstMeshMaterial(secondModel!));
    expect(firstMeshMaterial(firstModel!).userData.auroraSharedPlaceableModelMaterial).toBe(true);
  });

  it("throttles new GLTF loader starts per frame and reports queue progress", async () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const frameCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });

    const activeLoads: Array<{
      onLoad: (result: { scene: THREE.Object3D | null }) => void;
    }> = [];
    const container = document.createElement("div");
    const progressEvents: PlaceableModelLoadQueueProgressDetail[] = [];
    container.addEventListener(PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT, (event) => {
      progressEvents.push(
        (event as CustomEvent<PlaceableModelLoadQueueProgressDetail>).detail
      );
    });
    const load = vi.fn(
      (
        _url: string,
        onLoad: (result: { scene: THREE.Object3D | null }) => void
      ) => {
        activeLoads.push({ onLoad });
      }
    );
    const runtime = {
      container,
      placeableModelLoader: { load },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    };
    const modelUrls = Array.from(
      { length: PLACEABLE_MODEL_LOAD_CONCURRENCY_LIMIT + 3 },
      (_entry, index) => `http://localhost:3000/assets/plc_${index}.glb`
    );
    const modelPromises = modelUrls.map((modelUrl) => ensurePlaceableModel(runtime, modelUrl));

    try {
      expect(load).toHaveBeenCalledTimes(PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT);
      expect(container.dataset.placeableModelLoadQueueActiveCount).toBe(
        String(PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT)
      );
      expect(container.dataset.placeableModelLoadQueuePendingCount).toBe(
        String(modelUrls.length - PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT)
      );
      expect(container.dataset.placeableModelLoadQueueCurrent).toBe("plc_0.glb");
      expect(progressEvents.at(-1)).toMatchObject({
        status: "loading",
        loadCompleted: 0,
        loadTotal: modelUrls.length,
        concurrencyLimit: PLACEABLE_MODEL_LOAD_CONCURRENCY_LIMIT,
        startsPerFrameLimit: PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT,
        currentLabel: "plc_0.glb"
      });
    } finally {
      clearPlaceableModelLoadQueue(runtime);
      activeLoads.forEach(({ onLoad }) => onLoad({ scene: new THREE.Group() }));
      await Promise.allSettled(modelPromises);
      vi.stubGlobal("requestAnimationFrame", originalRequestAnimationFrame);
    }
  });

  it("uses the bulk loader window for large Area placeable model queues", async () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const frameCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });

    const activeLoads: Array<{
      onLoad: (result: { scene: THREE.Object3D | null }) => void;
    }> = [];
    const container = document.createElement("div");
    const progressEvents: PlaceableModelLoadQueueProgressDetail[] = [];
    container.addEventListener(PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT, (event) => {
      progressEvents.push(
        (event as CustomEvent<PlaceableModelLoadQueueProgressDetail>).detail
      );
    });
    const load = vi.fn(
      (
        _url: string,
        onLoad: (result: { scene: THREE.Object3D | null }) => void
      ) => {
        activeLoads.push({ onLoad });
      }
    );
    const runtime = {
      container,
      placeableModelLoader: { load },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    };
    const modelUrls = Array.from(
      {
        length:
          Math.max(
            PLACEABLE_MODEL_BULK_LOAD_QUEUE_THRESHOLD,
            PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT
          ) + 2
      },
      (_entry, index) => `http://localhost:3000/assets/ikea_plc_${index}.glb`
    );
    const modelPromises = modelUrls.map((modelUrl) => ensurePlaceableModel(runtime, modelUrl));

    try {
      expect(load).toHaveBeenCalledTimes(PLACEABLE_MODEL_BULK_LOAD_STARTS_PER_FRAME_LIMIT);
      expect(container.dataset.placeableModelLoadConcurrencyLimit).toBe(
        String(PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT)
      );
      expect(container.dataset.placeableModelLoadStartsPerFrameLimit).toBe(
        String(PLACEABLE_MODEL_BULK_LOAD_STARTS_PER_FRAME_LIMIT)
      );
      expect(container.dataset.placeableModelLoadQueueActiveCount).toBe(
        String(PLACEABLE_MODEL_BULK_LOAD_STARTS_PER_FRAME_LIMIT)
      );
      expect(progressEvents.at(-1)).toMatchObject({
        status: "loading",
        loadTotal: modelUrls.length,
        concurrencyLimit: PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT,
        startsPerFrameLimit: PLACEABLE_MODEL_BULK_LOAD_STARTS_PER_FRAME_LIMIT
      });

      while (
        load.mock.calls.length < PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT &&
        frameCallbacks.length > 0
      ) {
        frameCallbacks.shift()?.(0);
      }

      expect(load).toHaveBeenCalledTimes(PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT);
      expect(container.dataset.placeableModelLoadQueueActiveCount).toBe(
        String(PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT)
      );
    } finally {
      clearPlaceableModelLoadQueue(runtime);
      activeLoads.forEach(({ onLoad }) => onLoad({ scene: new THREE.Group() }));
      await Promise.allSettled(modelPromises);
      vi.stubGlobal("requestAnimationFrame", originalRequestAnimationFrame);
    }
  });

  it("returns null on loader error instead of throwing", async () => {
    const { runtime, load } = createModelRuntime((_onLoad, onError) => {
      onError();
    });

    await expect(
      ensurePlaceableModel(runtime, "http://localhost:3000/assets/missing.glb")
    ).resolves.toBeNull();
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("times out stalled GLTF loader requests so the queue can settle", async () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    const load = vi.fn();
    const runtime = {
      container,
      placeableModelLoader: { load },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    };

    try {
      const modelPromise = ensurePlaceableModel(
        runtime,
        "http://localhost:3000/assets/stalled.glb"
      );

      expect(load).toHaveBeenCalledTimes(1);
      expect(container.dataset.placeableModelLoadQueueActiveCount).toBe("1");

      await vi.advanceTimersByTimeAsync(PLACEABLE_MODEL_LOAD_TIMEOUT_MS * 3 + 1_000);

      await expect(modelPromise).resolves.toBeNull();
      expect(load).toHaveBeenCalledTimes(3);
      expect(container.dataset.placeableModelLoadQueueActiveCount).toBe("0");
      expect(container.dataset.placeableModelLoadQueuePendingCount).toBe("0");
      expect(container.dataset.placeableModelLoadQueueTotalCount).toBe("0");
    } finally {
      clearPlaceableModelLoadQueue(runtime);
      vi.useRealTimers();
    }
  });
});

describe("WorkspaceCanvasViewport placeable model fallback safety", () => {
  function createDebugState() {
    return {
      statusMap: "off",
      hiddenMeshes: false,
      showNonRenderMeshes: false,
      textures: true,
      wireframe: false,
      showVtPhysicalAnchor: false,
      collisionOverlay: false,
      objectLabels: false,
      bounds: false,
      lockedKinds: {
        creatures: false,
        doors: false,
        items: false,
        placeables: false,
        sounds: false
      }
    } as unknown as Parameters<typeof rebuildObjectMeshes>[3];
  }

  function createRuntimeForObjectMeshTests(
    loadImpl: (
      onLoad: (result: { scene: THREE.Object3D | null }) => void,
      onError: () => void
    ) => void
  ) {
    const container =
      typeof document !== "undefined"
        ? document.createElement("div")
        : ({ dataset: {} } as unknown as HTMLDivElement);
    const load = vi.fn(
      (
        _url: string,
        onLoad: (result: { scene: THREE.Object3D | null }) => void,
        _onProgress: unknown,
        onError: () => void
      ) => {
        loadImpl(onLoad, onError);
      }
    );

    return {
      load,
      runtime: {
        container,
        objectLayer: new THREE.Group(),
        objectMeshById: new Map<string, THREE.Object3D>(),
        objectPrimitiveGeometryCache: new Map<string, THREE.BufferGeometry>(),
        boundsLayer: new THREE.Group(),
        boundsHelpers: [],
        placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
        placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>(),
        placeableModelLoader: { load },
        placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
        placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
        placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
        placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
      } as unknown as Parameters<typeof rebuildObjectMeshes>[0]
    };
  }

  function createPreviewPlaceableObject() {
    return {
      id: "preview:plc_witcher380",
      kind: "placeables",
      name: "WITCHER PREVIEW",
      resRef: "witcher380",
      tag: "WITCHER380",
      x: 0.5,
      y: 0.5,
      z: 0,
      bearing: 0,
      isStatic: true,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        yaw: 0,
        roll: 0
      }
    };
  }

  function createSimpleFallbackPlaceableObject(id: string, x: number, y: number) {
    return {
      id,
      kind: "placeables",
      name: id,
      resRef: "plc_fallback",
      tag: id.toUpperCase(),
      x,
      y,
      z: 0,
      bearing: 0,
      isStatic: true,
      source: {
        type: "manual",
        sourceObjectId: id,
        sourceKind: "placeables",
        templateId: "plc_fallback"
      },
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        yaw: 0,
        roll: 0
      }
    };
  }

  function createBackendSoundObject(overrides: Record<string, unknown> = {}) {
    return {
      id: "snd_template_sound_dia_hakon_add_12",
      kind: "sounds",
      name: "Dia Hakon Add 12",
      resRef: "dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      x: 2,
      y: 3,
      z: 0,
      bearing: 0,
      isStatic: false,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        yaw: 0,
        roll: 0
      },
      soundPositioning: {
        mode: "random",
        elevation: 2,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 4,
        randomRangeNorthSouth: 5,
        preserve: {
          flags: {
            backendBenchmark: false
          },
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      },
      ...overrides
    };
  }

  function countStandaloneGuideNodes(runtime: Parameters<typeof rebuildObjectMeshes>[0]) {
    return runtime.objectLayer.children.filter(
      (child) =>
        (child instanceof THREE.Line || child instanceof THREE.Mesh) &&
        child !== runtime.objectMeshById.get("snd_template_sound_dia_hakon_add_12")
    ).length;
  }

  function findSoundGuideNode(
    runtime: Parameters<typeof rebuildObjectMeshes>[0],
    role: string
  ): THREE.Object3D | null {
    let match: THREE.Object3D | null = null;
    runtime.objectLayer.traverse((node) => {
      if (match === null && node.userData?.soundGuideRole === role) {
        match = node;
      }
    });
    return match;
  }

  function readGuideBoundsSize(node: THREE.Object3D | null): THREE.Vector3 {
    expect(node).toBeInstanceOf(THREE.Line);
    const geometry = (node as THREE.Line).geometry as THREE.BufferGeometry;
    geometry.computeBoundingBox();
    expect(geometry.boundingBox).not.toBeNull();
    return geometry.boundingBox!.getSize(new THREE.Vector3());
  }

  function createPlaceablePayloadWithModelUrl(modelUrl: string) {
    return createPlaceableViewportPayload({
      status: "ready",
      glbUrl: modelUrl,
      textureUrls: []
    });
  }

  async function flushAsyncEffects() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  }

  it("renders Area placeable GLB models with Aurora unit scale instead of preview-normalizing them", async () => {
    const { runtime, load } = createRuntimeForObjectMeshTests((onLoad) => {
      const loadedScene = new THREE.Group();
      loadedScene.add(
        new THREE.Mesh(
          new THREE.BoxGeometry(2, 1, 1),
          new THREE.MeshStandardMaterial()
        )
      );
      onLoad({ scene: loadedScene });
    });
    const object = {
      ...createSimpleFallbackPlaceableObject("plc_bakery_table", 1, 1),
      source: {
        type: "aurora_git",
        sourceObjectId: "GIT#0001",
        sourceKind: "placeables",
        templateId: "plc_bakery_table"
      }
    };
    const payload = createPlaceablePayloadWithModelUrl("/assets/bakery-table.glb");

    rebuildObjectMeshes(
      runtime,
      [object as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      {
        plc_bakery_table: payload
      }
    );
    await flushAsyncEffects();

    const root = runtime.objectMeshById.get("plc_bakery_table");
    expect(load).toHaveBeenCalledTimes(1);
    expect(root).toBeInstanceOf(THREE.Object3D);
    const bounds = new THREE.Box3().setFromObject(root!);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    expect(size.x).toBeCloseTo(0.2, 5);
    expect(root!.userData.auroraAreaObjectSharedRendererModelBounds).toBe(
      "0.200x0.100x0.100"
    );
    expect(root!.userData.auroraAreaObjectSharedRendererModelMaxAxis).toBeCloseTo(
      0.2,
      5
    );
    expect(root!.userData.auroraAreaObjectSharedRendererModelMeshCount).toBe(1);
  });

  it("batches simple fallback placeables into one instanced mesh with per-object proxies", () => {
    const { runtime } = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    });
    const first = createSimpleFallbackPlaceableObject("plc_a", 1, 2);
    const second = createSimpleFallbackPlaceableObject("plc_b", 3, 4);

    rebuildObjectMeshes(
      runtime,
      [
        first as unknown as Parameters<typeof rebuildObjectMeshes>[1][number],
        second as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]
      ],
      [],
      createDebugState(),
      1,
      true,
      10,
      [],
      false,
      null
    );

    const instancedMeshes = runtime.objectLayer.children.filter(
      (child) => child instanceof THREE.InstancedMesh
    ) as THREE.InstancedMesh[];
    const objectInstancedMesh = instancedMeshes.find(
      (mesh) => mesh.userData.role === "instanced-fallback-placeable"
    );
    expect(instancedMeshes).toHaveLength(1);
    expect(objectInstancedMesh?.count).toBe(2);
    expect(objectInstancedMesh?.userData.objectIds).toEqual(["plc_a", "plc_b"]);
    expect(runtime.objectMeshById.get("plc_a")).not.toBe(objectInstancedMesh);
    expect(runtime.objectMeshById.get("plc_a")?.userData.auroraInstancedFallbackMesh).toBe(
      objectInstancedMesh
    );
    expect(runtime.objectMeshById.get("plc_b")?.position.x).toBe(3);
  });

  it("keeps proof-priority Area fallback placeables visible beyond the mass fallback cap", () => {
    const { runtime } = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    });
    const objects = Array.from(
      { length: AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT + 2 },
      (_, index) => ({
        ...createSimpleFallbackPlaceableObject(
          `area_enon_bakery:obj_plc_priority_${index}`,
          index % 8,
          Math.floor(index / 8)
        ),
        source: {
          type: "aurora_git",
          areaId: "area_enon_bakery",
          sourceObjectId: `obj_plc_priority_${index}`,
          sourceKind: "placeable",
          templateId: "plc_priority",
          appearanceType: 26474
        }
      })
    ) as unknown as Parameters<typeof rebuildObjectMeshes>[1];
    const priorityObjectId = objects[objects.length - 1]!.id;

    rebuildObjectMeshes(
      runtime,
      objects,
      [priorityObjectId],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null
    );

    const suppressionSnapshot = JSON.parse(
      runtime.container.dataset.areaPrimitiveFallbackRenderSuppressionSnapshot ?? "{}"
    );

    expect(runtime.objectMeshById.get(priorityObjectId)).toBeDefined();
    expect(suppressionSnapshot.candidateCount).toBe(AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT + 2);
    expect(suppressionSnapshot.renderedCount).toBe(AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT + 1);
    expect(suppressionSnapshot.suppressedCount).toBe(1);
    expect(suppressionSnapshot.selectedBypassCount).toBe(1);
    expect(suppressionSnapshot.suppressedIds).not.toContain(priorityObjectId);
  });

  it("updates fallback placeable selection state without rebuilding object meshes", () => {
    const { runtime } = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    });
    const first = createSimpleFallbackPlaceableObject("plc_a", 1, 2);
    const second = createSimpleFallbackPlaceableObject("plc_b", 3, 4);
    const objects = [
      first as unknown as Parameters<typeof rebuildObjectMeshes>[1][number],
      second as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]
    ];

    rebuildObjectMeshes(
      runtime,
      objects,
      [],
      createDebugState(),
      1,
      true,
      10,
      [],
      false,
      null
    );
    const firstProxy = runtime.objectMeshById.get("plc_a");
    const instancedMesh = firstProxy?.userData.auroraInstancedFallbackMesh as THREE.InstancedMesh;
    const firstMatrixBefore = new THREE.Matrix4();
    const firstMatrixAfter = new THREE.Matrix4();
    const beforeScale = new THREE.Vector3();
    const afterScale = new THREE.Vector3();
    instancedMesh.getMatrixAt(0, firstMatrixBefore);
    firstMatrixBefore.decompose(new THREE.Vector3(), new THREE.Quaternion(), beforeScale);

    updateObjectMeshSelectionState(runtime, objects, ["plc_a"], 1, true);
    instancedMesh.getMatrixAt(0, firstMatrixAfter);
    firstMatrixAfter.decompose(new THREE.Vector3(), new THREE.Quaternion(), afterScale);
    expect(firstProxy?.scale.x).toBeCloseTo(1.16, 6);
    expect(afterScale.x).toBeGreaterThan(beforeScale.x);
    expect(
      runtime.objectLayer.children.filter((child) => child instanceof THREE.InstancedMesh)
    ).toHaveLength(1);
  });

  it("suppresses no-geometry helper placeable fallbacks outside non-render diagnostics", () => {
    const { runtime } = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    });
    const object = createSimpleFallbackPlaceableObject("plc_helper", 1, 2);
    const payload = createPlaceableViewportPayload({
      status: "unsupported",
      diagnostics: [
        {
          code: "PLACEABLE_RENDER_SOURCE_MODEL_NO_GEOMETRY",
          severity: "warn",
          message:
            "Source model assets were found, but conversion reported no renderable mesh geometry."
        }
      ],
      assetRefs: {
        otherAssetIds: ["helper-mdl"]
      }
    });
    const objects = [object as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]];

    rebuildObjectMeshes(
      runtime,
      objects,
      [],
      createDebugState(),
      1,
      true,
      10,
      [],
      false,
      { [object.id]: payload }
    );

    expect(runtime.objectMeshById.has(object.id)).toBe(false);
    expect(
      runtime.objectLayer.children.some(
        (child) => child.userData?.role === "instanced-fallback-placeable"
      )
    ).toBe(false);

    rebuildObjectMeshes(
      runtime,
      objects,
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      1,
      true,
      10,
      [],
      false,
      { [object.id]: payload }
    );

    const proxy = runtime.objectMeshById.get(object.id);
    expect(proxy).toBeDefined();
    expect(proxy?.userData.objectId).toBe(object.id);
  });

  it("keeps primitive fallback visible when model loading fails", async () => {
    vi.useFakeTimers();
    const { runtime } = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    });

    const object = createPreviewPlaceableObject();
    const payload = createPlaceablePayloadWithModelUrl("/assets/missing.glb");

    try {
      rebuildObjectMeshes(
        runtime,
        [object as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]],
        [],
        createDebugState(),
        1,
        false,
        10,
        [],
        false,
        { [object.id]: payload }
      );

      await vi.runAllTimersAsync();

      const root = runtime.objectMeshById.get(object.id);
      expect(root).toBeDefined();
      expect(root?.children.length).toBeGreaterThan(0);
      expect(root?.children.some((child) => child instanceof THREE.Mesh)).toBe(true);
      expect(runtime.container.dataset.placeableModelStatus).toBe("missing");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps primitive fallback when loaded model contains no meshes", async () => {
    const { runtime } = createRuntimeForObjectMeshTests((onLoad) => {
      onLoad({ scene: new THREE.Group() });
    });

    const object = createPreviewPlaceableObject();
    const payload = createPlaceablePayloadWithModelUrl("/assets/empty.glb");

    rebuildObjectMeshes(
      runtime,
      [object as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]],
      [],
      createDebugState(),
      1,
      false,
      10,
      [],
      false,
      { [object.id]: payload }
    );

    await flushAsyncEffects();

    const root = runtime.objectMeshById.get(object.id);
    expect(root).toBeDefined();
    expect(root?.children.length).toBeGreaterThan(0);
    expect(root?.children.some((child) => child instanceof THREE.Mesh)).toBe(true);
    expect(runtime.container.dataset.placeableModelStatus).toBe("missing");
  });

  it("uses the primary texture as fallback for loaded placeable materials without references", async () => {
    const loadedScene = new THREE.Group();
    loadedScene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
    const { runtime } = createRuntimeForObjectMeshTests((onLoad) => {
      onLoad({ scene: loadedScene });
    });
    const primaryTexture = new THREE.Texture();
    const detailTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/plant_main.dds",
      primaryTexture
    );
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/plant_detail.tga",
      detailTexture
    );

    const object = createPreviewPlaceableObject();
    const payload = createPlaceableViewportPayload({
      status: "ready",
      glbUrl: "/assets/plant.glb",
      textureUrls: ["/assets/plant_main.dds", "/assets/plant_detail.tga"]
    });

    rebuildObjectMeshes(
      runtime,
      [object as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]],
      [],
      createDebugState(),
      1,
      false,
      10,
      [],
      false,
      { [object.id]: payload }
    );

    await flushAsyncEffects();

    const root = runtime.objectMeshById.get(object.id);
    expect(root).toBeDefined();
    expect((firstMeshMaterial(root!) as THREE.MeshStandardMaterial).map).toBe(primaryTexture);
    expect(runtime.container.dataset.placeableModelTextureStatus).toBe("applied");
    expect(runtime.container.dataset.placeableModelTextureCount).toBe("2");
  });

  it("shares textured model materials for repeated placeables with identical texture signatures", async () => {
    const loadedScene = new THREE.Group();
    loadedScene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
    const { runtime } = createRuntimeForObjectMeshTests((onLoad) => {
      onLoad({ scene: loadedScene });
    });
    const primaryTexture = new THREE.Texture();
    const detailTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/shared_main.dds",
      primaryTexture
    );
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/shared_detail.tga",
      detailTexture
    );

    const first = createPreviewPlaceableObject();
    const second = {
      ...createPreviewPlaceableObject(),
      id: "preview:plc_shared_b",
      x: 2
    };
    const payload = createPlaceableViewportPayload({
      status: "ready",
      glbUrl: "/assets/shared.glb",
      textureUrls: ["/assets/shared_main.dds", "/assets/shared_detail.tga"]
    });

    rebuildObjectMeshes(
      runtime,
      [
        first as unknown as Parameters<typeof rebuildObjectMeshes>[1][number],
        second as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]
      ],
      [],
      createDebugState(),
      1,
      false,
      10,
      [],
      false,
      {
        [first.id]: payload,
        [second.id]: payload
      }
    );

    await flushAsyncEffects();

    const firstRoot = runtime.objectMeshById.get(first.id);
    const secondRoot = runtime.objectMeshById.get(second.id);
    expect(firstRoot).toBeDefined();
    expect(secondRoot).toBeDefined();
    const firstMaterial = firstMeshMaterial(firstRoot!) as THREE.MeshStandardMaterial;
    const secondMaterial = firstMeshMaterial(secondRoot!) as THREE.MeshStandardMaterial;
    expect(firstMaterial).toBe(secondMaterial);
    expect(firstMaterial.map).toBe(primaryTexture);
  });

  it("keeps backend sound marker while suppressing editor guide overlays for locked sound layers", () => {
    const object = createBackendSoundObject();
    const unlockedRuntime = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    }).runtime;
    const lockedRuntime = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    }).runtime;
    const lockedDebugState = createDebugState();
    lockedDebugState.lockedKinds.sounds = true;

    rebuildObjectMeshes(
      unlockedRuntime,
      [object as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]],
      [object.id],
      createDebugState(),
      1,
      true,
      10,
      [],
      false,
      null
    );
    rebuildObjectMeshes(
      lockedRuntime,
      [object as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]],
      [object.id],
      lockedDebugState,
      1,
      true,
      10,
      [],
      false,
      null
    );

    expect(unlockedRuntime.objectMeshById.get(object.id)).toBeDefined();
    expect(lockedRuntime.objectMeshById.get(object.id)).toBeDefined();
    expect(countStandaloneGuideNodes(unlockedRuntime)).toBeGreaterThan(0);
    expect(countStandaloneGuideNodes(lockedRuntime)).toBe(0);
    expect(resolveSoundRenderDiagnostics(unlockedRuntime)).toEqual({
      marker: 1,
      editorGuides: expect.any(Number)
    });
    expect(resolveSoundRenderDiagnostics(unlockedRuntime).editorGuides).toBeGreaterThan(0);
    expect(resolveSoundRenderDiagnostics(lockedRuntime)).toEqual({
      marker: 1,
      editorGuides: 0
    });

    const lockedDiagnostics = writeSoundRenderDiagnostics(lockedRuntime);
    expect(lockedDiagnostics).toEqual({ marker: 1, editorGuides: 0 });
    expect(lockedRuntime.container.dataset.soundMarkerCount).toBe("1");
    expect(lockedRuntime.container.dataset.soundEditorGuideCount).toBe("0");
  });

  it("renders native attenuation, random-range, and signed-height guide geometry at exact scale", () => {
    const object = createBackendSoundObject({
      soundPositioning: {
        mode: "random",
        elevation: -4,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 4,
        randomRangeNorthSouth: 5
      }
    });
    const runtime = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    }).runtime;

    rebuildObjectMeshes(
      runtime,
      [object as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]],
      [object.id],
      createDebugState(),
      1,
      1,
      1,
      true,
      10,
      [],
      false,
      null
    );

    const innerRangeSize = readGuideBoundsSize(findSoundGuideNode(runtime, "max-range"));
    const outerRangeSize = readGuideBoundsSize(findSoundGuideNode(runtime, "cutoff-range"));
    const randomRangeSize = readGuideBoundsSize(findSoundGuideNode(runtime, "random-range"));
    const heightNode = findSoundGuideNode(runtime, "height");
    const heightSize = readGuideBoundsSize(heightNode);
    const heightPositions = (
      (heightNode as THREE.Line).geometry as THREE.BufferGeometry
    ).getAttribute("position");

    expect(innerRangeSize.x).toBeCloseTo(1.2, 6);
    expect(innerRangeSize.z).toBeCloseTo(1.2, 6);
    expect(outerRangeSize.x).toBeCloseTo(2.4, 6);
    expect(outerRangeSize.z).toBeCloseTo(2.4, 6);
    expect(randomRangeSize.x).toBeCloseTo(0.4, 6);
    expect(randomRangeSize.z).toBeCloseTo(0.5, 6);
    expect(heightSize.y).toBeCloseTo(0.4, 6);
    expect(heightPositions.getY(1)).toBeLessThan(heightPositions.getY(0));

    const markerUserData = runtime.objectMeshById.get(object.id)?.userData;
    expect(markerUserData).toMatchObject({
      soundGuideGeometryRevision: "aurora-sound-guide-world-geometry.v1",
      soundGuideMode: "random",
      soundGuideElevationMeters: -4,
      soundGuideElevationOffsetWorld: -0.4,
      soundGuideRandomRangeHalfWidthWorld: 0.2,
      soundGuideRandomRangeHalfDepthWorld: 0.25
    });
    expect(markerUserData?.soundGuideMaxVolumeRadiusWorld).toBeCloseTo(0.6, 12);
    expect(markerUserData?.soundGuideCutoffRadiusWorld).toBeCloseTo(1.2, 12);
  });

  it("counts multiple backend sound markers while locking all editor guide overlays", () => {
    const firstSound = createBackendSoundObject();
    const secondSound = createBackendSoundObject({
      id: "snd_template_sound_dialogue_02",
      name: "Dialogue Two",
      resRef: "dia_hakon_add_13",
      tag: "SOUND_DIA_HAKON_ADD_13",
      x: 5,
      y: 6,
      soundPositioning: {
        mode: "specific",
        elevation: 1,
        maxVolumeDistance: 4,
        cutoffDistance: 8,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: {
            backendBenchmark: false
          },
          extra: {
            backendSoundId: "sound_dia_hakon_add_13",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
    const unlockedRuntime = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    }).runtime;
    const lockedRuntime = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    }).runtime;
    const lockedDebugState = createDebugState();
    lockedDebugState.lockedKinds.sounds = true;
    const sounds = [
      firstSound,
      secondSound
    ] as unknown as Parameters<typeof rebuildObjectMeshes>[1];

    rebuildObjectMeshes(
      unlockedRuntime,
      sounds,
      [firstSound.id as string],
      createDebugState(),
      1,
      true,
      10,
      [],
      false,
      null
    );
    rebuildObjectMeshes(
      lockedRuntime,
      sounds,
      [firstSound.id as string],
      lockedDebugState,
      1,
      true,
      10,
      [],
      false,
      null
    );

    const unlockedDiagnostics = resolveSoundRenderDiagnostics(unlockedRuntime);
    expect(unlockedDiagnostics.marker).toBe(2);
    expect(unlockedDiagnostics.editorGuides).toBeGreaterThan(0);
    expect(resolveSoundRenderDiagnostics(lockedRuntime)).toEqual({
      marker: 2,
      editorGuides: 0
    });

    writeSoundRenderDiagnostics(lockedRuntime);
    expect(lockedRuntime.container.dataset.soundMarkerCount).toBe("2");
    expect(lockedRuntime.container.dataset.soundEditorGuideCount).toBe("0");
  });

  it("clears backend sound diagnostics when the sounds layer is hidden", () => {
    const sound = createBackendSoundObject();
    const visibleRuntime = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    }).runtime;
    const hiddenRuntime = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    }).runtime;
    const visibleToolbarState = {
      visibility: {
        sounds: true
      },
      canvasDebug: {
        ...createDebugState(),
        isolateKind: "none"
      }
    };
    const hiddenToolbarState = {
      visibility: {
        sounds: false
      },
      canvasDebug: {
        ...createDebugState(),
        isolateKind: "none"
      }
    };
    const renderObjectIdsSet = null;

    expect(
      isObjectVisibleWithRenderFilter(
        sound as unknown as Parameters<typeof isObjectVisibleWithRenderFilter>[0],
        visibleToolbarState as unknown as Parameters<typeof isObjectVisibleWithRenderFilter>[1],
        renderObjectIdsSet
      )
    ).toBe(true);
    expect(
      isObjectVisibleWithRenderFilter(
        sound as unknown as Parameters<typeof isObjectVisibleWithRenderFilter>[0],
        hiddenToolbarState as unknown as Parameters<typeof isObjectVisibleWithRenderFilter>[1],
        renderObjectIdsSet
      )
    ).toBe(false);

    rebuildObjectMeshes(
      visibleRuntime,
      [sound as unknown as Parameters<typeof rebuildObjectMeshes>[1][number]],
      [sound.id as string],
      createDebugState(),
      1,
      true,
      10,
      [],
      false,
      null
    );
    rebuildObjectMeshes(
      hiddenRuntime,
      [],
      [],
      createDebugState(),
      1,
      true,
      10,
      [],
      false,
      null
    );

    expect(resolveSoundRenderDiagnostics(visibleRuntime).marker).toBe(1);
    expect(resolveSoundRenderDiagnostics(visibleRuntime).editorGuides).toBeGreaterThan(0);
    expect(writeSoundRenderDiagnostics(hiddenRuntime)).toEqual({
      marker: 0,
      editorGuides: 0
    });
    expect(hiddenRuntime.container.dataset.soundMarkerCount).toBe("0");
    expect(hiddenRuntime.container.dataset.soundEditorGuideCount).toBe("0");
  });

  it("excludes hidden backend-created sounds from runtime preview eligibility without dropping metadata", () => {
    const sound = createBackendSoundObject();
    const visibleToolbarState = createDefaultToolbarState();
    const hiddenToolbarState = {
      ...visibleToolbarState,
      visibility: {
        ...visibleToolbarState.visibility,
        sounds: false
      }
    };

    expect(
      isRuntimeSoundPreviewEligible(
        sound as unknown as Parameters<typeof isRuntimeSoundPreviewEligible>[0],
        visibleToolbarState
      )
    ).toBe(true);
    expect(
      isRuntimeSoundPreviewEligible(
        sound as unknown as Parameters<typeof isRuntimeSoundPreviewEligible>[0],
        hiddenToolbarState
      )
    ).toBe(false);
    expect(sound.soundPositioning.preserve.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("removes hidden backend-created sounds from selection cleanup without dropping metadata", () => {
    const sound = createBackendSoundObject();
    const visibleObjectIdsSet = new Set<string>();
    const objectById = new Map<string, SceneObject>([
      [sound.id as string, sound as unknown as SceneObject]
    ]);

    const nextSelection = filterSelectedObjectIdsForVisibleSelectableObjects({
      selectedObjectIds: [sound.id as string],
      objectById,
      visibleObjectIdsSet,
      isSelectableByActiveFilters: () => true
    });

    expect(nextSelection).toEqual([]);
    expect(objectById.get(sound.id as string)?.soundPositioning?.preserve?.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("blocks hidden backend-created sounds from sidebar properties signals without dropping metadata", () => {
    const sound = createBackendSoundObject();
    const visibleToolbarState = createDefaultToolbarState();
    const hiddenToolbarState = {
      ...visibleToolbarState,
      visibility: {
        ...visibleToolbarState.visibility,
        sounds: false
      }
    };

    expect(
      resolveVisibleObjectForPropertiesSignal({
        objects: [sound as unknown as SceneObject],
        objectId: sound.id as string,
        objectKind: "sounds",
        toolbarState: hiddenToolbarState,
        renderObjectIdsSet: null
      })
    ).toBeNull();

    const visibleTarget = resolveVisibleObjectForPropertiesSignal({
      objects: [sound as unknown as SceneObject],
      objectId: sound.id as string,
      objectKind: "sounds",
      toolbarState: visibleToolbarState,
      renderObjectIdsSet: null
    });

    expect(visibleTarget).toMatchObject({
      id: "snd_template_sound_dia_hakon_add_12",
      kind: "sounds",
      resRef: "dia_hakon_add_12"
    });
    expect(sound.soundPositioning.preserve.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("gates backend-created sounds by render object ids for sidebar properties and runtime preview", () => {
    const firstSound = createBackendSoundObject();
    const secondSound = createBackendSoundObject({
      id: "snd_template_sound_dia_hakon_add_13",
      name: "Dia Hakon Add 13",
      resRef: "dia_hakon_add_13",
      tag: "SOUND_DIA_HAKON_ADD_13",
      soundPositioning: {
        mode: "specific",
        elevation: 0,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: {
            backendBenchmark: false
          },
          extra: {
            backendSoundId: "sound_dia_hakon_add_13",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
    const toolbarState = createDefaultToolbarState();
    const renderObjectIdsSet = new Set([firstSound.id as string]);

    expect(
      resolveVisibleObjectForPropertiesSignal({
        objects: [firstSound as unknown as SceneObject, secondSound as unknown as SceneObject],
        objectId: firstSound.id as string,
        objectKind: "sounds",
        toolbarState,
        renderObjectIdsSet
      })
    ).toMatchObject({ id: firstSound.id });
    expect(
      resolveVisibleObjectForPropertiesSignal({
        objects: [firstSound as unknown as SceneObject, secondSound as unknown as SceneObject],
        objectId: secondSound.id as string,
        objectKind: "sounds",
        toolbarState,
        renderObjectIdsSet
      })
    ).toBeNull();
    expect(
      isRuntimeSoundPreviewEligible(
        firstSound as unknown as Parameters<typeof isRuntimeSoundPreviewEligible>[0],
        toolbarState,
        renderObjectIdsSet
      )
    ).toBe(true);
    expect(
      isRuntimeSoundPreviewEligible(
        secondSound as unknown as Parameters<typeof isRuntimeSoundPreviewEligible>[0],
        toolbarState,
        renderObjectIdsSet
      )
    ).toBe(false);
    expect(secondSound.soundPositioning.preserve.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_13",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("gates backend-created sounds by render object ids for sidebar select and context menu signals", () => {
    const firstSound = createBackendSoundObject();
    const secondSound = createBackendSoundObject({
      id: "snd_template_sound_dia_hakon_add_13",
      name: "Dia Hakon Add 13",
      resRef: "dia_hakon_add_13",
      tag: "SOUND_DIA_HAKON_ADD_13",
      soundPositioning: {
        mode: "specific",
        elevation: 0,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: {
            backendBenchmark: false
          },
          extra: {
            backendSoundId: "sound_dia_hakon_add_13",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
    const toolbarState = createDefaultToolbarState();
    const renderObjectIdsSet = new Set([firstSound.id as string]);
    const objects = [
      firstSound as unknown as SceneObject,
      secondSound as unknown as SceneObject
    ];

    expect(
      resolveVisibleObjectForSidebarSignal({
        objects,
        objectId: firstSound.id as string,
        toolbarState,
        renderObjectIdsSet
      })
    ).toMatchObject({ id: firstSound.id });
    expect(
      resolveVisibleObjectForSidebarSignal({
        objects,
        objectId: secondSound.id as string,
        toolbarState,
        renderObjectIdsSet
      })
    ).toBeNull();
    expect(secondSound.soundPositioning.preserve.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_13",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("keeps retained Store properties reachable when the logical object has no canvas render id", () => {
    const store = {
      ...createNewSceneObject("stores", 2, 3, 106),
      id: "store_scene_store_dye_01",
      tag: "STORE_DYE_01",
      resRef: "store_dye_01",
      storeProperties: {
        comments: "  source store note  "
      }
    };
    const visibleToolbarState = createDefaultToolbarState();
    const hiddenToolbarState = {
      ...visibleToolbarState,
      visibility: {
        ...visibleToolbarState.visibility,
        stores: false
      }
    };
    const emptyRenderObjectIds = new Set<string>();

    expect(
      resolveVisibleObjectForPropertiesSignal({
        objects: [store],
        objectId: store.id,
        objectKind: "stores",
        toolbarState: visibleToolbarState,
        renderObjectIdsSet: emptyRenderObjectIds
      })
    ).toMatchObject({
      id: "store_scene_store_dye_01",
      kind: "stores",
      storeProperties: {
        comments: "  source store note  "
      }
    });
    expect(
      resolveVisibleObjectForPropertiesSignal({
        objects: [store],
        objectId: store.id,
        objectKind: "stores",
        toolbarState: hiddenToolbarState,
        renderObjectIdsSet: emptyRenderObjectIds
      })
    ).toMatchObject({ id: store.id, kind: "stores" });
    expect(
      resolveVisibleObjectForSidebarSignal({
        objects: [store],
        objectId: store.id,
        toolbarState: hiddenToolbarState,
        renderObjectIdsSet: emptyRenderObjectIds
      })
    ).toMatchObject({ id: store.id, kind: "stores" });
    expect(
      resolveVisibleObjectForPropertiesSignal({
        objects: [store],
        objectId: store.id,
        objectKind: "sounds",
        toolbarState: visibleToolbarState,
        renderObjectIdsSet: emptyRenderObjectIds
      })
    ).toBeNull();
  });

  it("keeps retained Trigger properties reachable while Trigger canvas visibility is disabled", () => {
    const trigger: SceneObject = {
      ...createNewSceneObject("triggers", 2, 3, 107),
      id: "trigger_scene_generic_01",
      tag: "GenericTrigger",
      source: {
        type: "aurora_git",
        areaId: "area_scene_01",
        sourceKind: "trigger",
        sourceObjectId: "trigger:0:generictrigger:source",
        sourceIndex: 0,
        triggerTag: { present: true, value: "GenericTrigger" }
      }
    };
    const toolbarState = createDefaultToolbarState();

    expect(toolbarState.visibility.triggers).toBe(false);
    expect(
      resolveVisibleObjectForPropertiesSignal({
        objects: [trigger],
        objectId: trigger.id,
        objectKind: "triggers",
        toolbarState,
        renderObjectIdsSet: new Set<string>()
      })
    ).toMatchObject({
      id: trigger.id,
      kind: "triggers",
      source: {
        triggerTag: { present: true, value: "GenericTrigger" }
      }
    });
    expect(
      resolveVisibleObjectForPropertiesSignal({
        objects: [trigger],
        objectId: trigger.id,
        objectKind: "sounds",
        toolbarState,
        renderObjectIdsSet: new Set<string>()
      })
    ).toBeNull();
  });

  it("keeps retained Waypoint properties reachable while Waypoint canvas visibility is disabled", () => {
    const waypoint: SceneObject = {
      ...createNewSceneObject("waypoints", 2, 3, 108),
      id: "waypoint_scene_patrol_01",
      tag: "NW_WAYPOINT001",
      source: {
        type: "aurora_git",
        areaId: "area_scene_01",
        sourceKind: "waypoint",
        sourceObjectId: "waypoint:0:nw_waypoint001:source",
        sourceIndex: 0,
        waypointTag: { present: true, value: "NW_WAYPOINT001" },
      },
    };
    const toolbarState = createDefaultToolbarState();

    expect(toolbarState.visibility.waypoints).toBe(false);
    expect(
      resolveVisibleObjectForPropertiesSignal({
        objects: [waypoint],
        objectId: waypoint.id,
        objectKind: "waypoints",
        toolbarState,
        renderObjectIdsSet: new Set<string>(),
      })
    ).toMatchObject({
      id: waypoint.id,
      kind: "waypoints",
      source: {
        waypointTag: { present: true, value: "NW_WAYPOINT001" },
      },
    });
    expect(
      resolveVisibleObjectForPropertiesSignal({
        objects: [waypoint],
        objectId: waypoint.id,
        objectKind: "sounds",
        toolbarState,
        renderObjectIdsSet: new Set<string>(),
      })
    ).toBeNull();
  });

  it("keeps additive sidebar sound selection limited to allowed visible render subset objects", () => {
    const firstSound = createBackendSoundObject();
    const secondSound = createBackendSoundObject({
      id: "snd_template_sound_dia_hakon_add_13",
      name: "Dia Hakon Add 13",
      resRef: "dia_hakon_add_13",
      tag: "SOUND_DIA_HAKON_ADD_13",
      soundPositioning: {
        mode: "specific",
        elevation: 0,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: {
            backendBenchmark: false
          },
          extra: {
            backendSoundId: "sound_dia_hakon_add_13",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
    const toolbarState = createDefaultToolbarState();
    const renderObjectIdsSet = new Set([firstSound.id as string]);
    const objects = [
      firstSound as unknown as SceneObject,
      secondSound as unknown as SceneObject
    ];

    const nextSelection = resolveSidebarSelectionIds({
      currentSelectedObjectIds: [secondSound.id as string],
      selectedObject: firstSound as unknown as SceneObject,
      additive: true,
      allowedObjectIds: [firstSound.id as string, secondSound.id as string],
      objects,
      toolbarState,
      renderObjectIdsSet
    });

    expect(nextSelection).toEqual([firstSound.id]);
    expect(secondSound.soundPositioning.preserve.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_13",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("keeps command-driven sound selection limited to visible render subset objects", () => {
    const firstSound = createBackendSoundObject({
      x: 2,
      y: 2
    });
    const secondSound = createBackendSoundObject({
      id: "snd_template_sound_dia_hakon_add_13",
      name: "Dia Hakon Add 13",
      resRef: "dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_13",
      x: 2.5,
      y: 2.5,
      soundPositioning: {
        mode: "specific",
        elevation: 0,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: {
            backendBenchmark: false
          },
          extra: {
            backendSoundId: "sound_dia_hakon_add_13",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
    const toolbarState = createDefaultToolbarState();
    const renderObjectIdsSet = new Set([firstSound.id as string]);
    const objects = [
      firstSound as unknown as SceneObject,
      secondSound as unknown as SceneObject
    ];
    const visibleObjects = objects.filter((object) =>
      isObjectVisibleWithRenderFilter(object, toolbarState, renderObjectIdsSet)
    );
    const selectableObjects = filterVisibleSelectableCommandObjects({
      visibleObjects,
      toolbarState,
      isSelectableByActiveFilters: () => true
    });

    expect(
      resolveSelectSameResRefObjectIds({
        selectedObjectIds: [secondSound.id as string],
        selectableObjects
      })
    ).toEqual([]);
    expect(
      resolveSelectSameResRefObjectIds({
        selectedObjectIds: [firstSound.id as string],
        selectableObjects
      })
    ).toEqual([firstSound.id]);
    expect(
      resolveInvertSelectionObjectIds({
        selectedObjectIds: [secondSound.id as string],
        selectableObjects
      })
    ).toEqual([firstSound.id]);
    expect(
      resolveRadiusSelectionObjectIds({
        selectedObjectIds: [secondSound.id as string],
        selectableObjects,
        radius: 3.6
      })
    ).toEqual([]);
    expect(secondSound.soundPositioning.preserve.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_13",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("keeps selected-object sound actions limited to visible render subset objects", () => {
    const firstSound = createBackendSoundObject();
    const secondSound = createBackendSoundObject({
      id: "snd_template_sound_dia_hakon_add_13",
      name: "Dia Hakon Add 13",
      resRef: "dia_hakon_add_13",
      tag: "SOUND_DIA_HAKON_ADD_13",
      soundPositioning: {
        mode: "specific",
        elevation: 0,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: {
            backendBenchmark: false
          },
          extra: {
            backendSoundId: "sound_dia_hakon_add_13",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
    const toolbarState = createDefaultToolbarState();
    const renderObjectIdsSet = new Set([firstSound.id as string]);
    const visibleObjects = [
      firstSound as unknown as SceneObject,
      secondSound as unknown as SceneObject
    ].filter((object) => isObjectVisibleWithRenderFilter(object, toolbarState, renderObjectIdsSet));

    const actionTargets = filterUnlockedVisibleSelectedObjects({
      selectedObjectIds: [firstSound.id as string, secondSound.id as string],
      objects: visibleObjects,
      toolbarState
    });

    expect(actionTargets.map((object) => object.id)).toEqual([firstSound.id]);
    expect(secondSound.soundPositioning.preserve.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_13",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("keeps sound movement limited to visible render subset objects", () => {
    const firstSound = createBackendSoundObject();
    const secondSound = createBackendSoundObject({
      id: "snd_template_sound_dia_hakon_add_13",
      name: "Dia Hakon Add 13",
      resRef: "dia_hakon_add_13",
      tag: "SOUND_DIA_HAKON_ADD_13",
      soundPositioning: {
        mode: "specific",
        elevation: 0,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: {
            backendBenchmark: false
          },
          extra: {
            backendSoundId: "sound_dia_hakon_add_13",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
    const toolbarState = createDefaultToolbarState();
    const renderObjectIdsSet = new Set([firstSound.id as string]);
    const visibleObjects = [
      firstSound as unknown as SceneObject,
      secondSound as unknown as SceneObject
    ].filter((object) => isObjectVisibleWithRenderFilter(object, toolbarState, renderObjectIdsSet));

    expect(
      resolveMovableVisibleSelection({
        selectedObjectIds: [firstSound.id as string, secondSound.id as string],
        objects: visibleObjects,
        toolbarState
      })
    ).toEqual({ ids: [firstSound.id] });
    expect(
      resolveMovableVisibleSelection({
        selectedObjectIds: [secondSound.id as string],
        objects: visibleObjects,
        toolbarState
      })
    ).toEqual({ ids: [], reason: "selection_empty" });
    expect(secondSound.soundPositioning.preserve.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_13",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("keeps transform-control sound targets limited to visible render subset objects", () => {
    const firstSound = createBackendSoundObject();
    const secondSound = createBackendSoundObject({
      id: "snd_template_sound_dia_hakon_add_13",
      name: "Dia Hakon Add 13",
      resRef: "dia_hakon_add_13",
      tag: "SOUND_DIA_HAKON_ADD_13",
      soundPositioning: {
        mode: "specific",
        elevation: 0,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: {
            backendBenchmark: false
          },
          extra: {
            backendSoundId: "sound_dia_hakon_add_13",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
    const toolbarState = createDefaultToolbarState();
    const renderObjectIdsSet = new Set([firstSound.id as string]);
    const visibleObjects = [
      firstSound as unknown as SceneObject,
      secondSound as unknown as SceneObject
    ].filter((object) => isObjectVisibleWithRenderFilter(object, toolbarState, renderObjectIdsSet));

    expect(
      resolveVisibleSelectedObjects({
        selectedObjectIds: [firstSound.id as string, secondSound.id as string],
        objects: visibleObjects
      }).map((object) => object.id)
    ).toEqual([firstSound.id]);
    expect(
      resolveVisibleSelectedObjects({
        selectedObjectIds: [secondSound.id as string],
        objects: visibleObjects
      })
    ).toEqual([]);
    expect(secondSound.soundPositioning.preserve.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_13",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("keeps sound selection snapshots limited to visible selectable render subset objects", () => {
    const firstSound = createBackendSoundObject();
    const secondSound = createBackendSoundObject({
      id: "snd_template_sound_dia_hakon_add_13",
      name: "Dia Hakon Add 13",
      resRef: "dia_hakon_add_13",
      tag: "SOUND_DIA_HAKON_ADD_13",
      soundPositioning: {
        mode: "specific",
        elevation: 0,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: {
            backendBenchmark: false
          },
          extra: {
            backendSoundId: "sound_dia_hakon_add_13",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
    const toolbarState = createDefaultToolbarState();
    const renderObjectIdsSet = new Set([firstSound.id as string]);
    const objects = [
      firstSound as unknown as SceneObject,
      secondSound as unknown as SceneObject
    ];
    const visibleObjects = objects.filter((object) =>
      isObjectVisibleWithRenderFilter(object, toolbarState, renderObjectIdsSet)
    );
    const objectById = new Map(objects.map((object) => [object.id, object]));
    const visibleObjectIdsSet = new Set(visibleObjects.map((object) => object.id));

    const snapshotIds = filterSelectedObjectIdsForVisibleSelectableObjects({
      selectedObjectIds: [firstSound.id as string, secondSound.id as string],
      objectById,
      visibleObjectIdsSet,
      isSelectableByActiveFilters: () => true
    });

    expect(snapshotIds).toEqual([firstSound.id]);
    expect(secondSound.soundPositioning.preserve.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_13",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("keeps dropped backend sound selection limited to renderable subset objects", () => {
    const droppedSound = createBackendSoundObject({
      id: "snd_area_backend_created_01"
    });
    const hiddenExistingSound = createBackendSoundObject({
      id: "snd_template_sound_dia_hakon_add_13",
      name: "Dia Hakon Add 13",
      resRef: "dia_hakon_add_13",
      tag: "SOUND_DIA_HAKON_ADD_13",
      soundPositioning: {
        mode: "specific",
        elevation: 0,
        maxVolumeDistance: 6,
        cutoffDistance: 12,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: {
            backendBenchmark: false
          },
          extra: {
            backendSoundId: "sound_dia_hakon_add_13",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });

    expect(
      resolveCreatedObjectSelectionIds({
        objectId: droppedSound.id as string,
        renderObjectIdsSet: null
      })
    ).toEqual([droppedSound.id]);
    expect(
      resolveCreatedObjectSelectionIds({
        objectId: droppedSound.id as string,
        renderObjectIdsSet: new Set([hiddenExistingSound.id as string])
      })
    ).toEqual([]);
    expect(
      resolveCreatedObjectSelectionIds({
        objectId: droppedSound.id as string,
        renderObjectIdsSet: new Set([droppedSound.id as string])
      })
    ).toEqual([droppedSound.id]);
    expect(hiddenExistingSound.soundPositioning.preserve.extra).toEqual({
      backendSoundId: "sound_dia_hakon_add_13",
      soundTemplateSource: "backend-catalog"
    });
  });
});
