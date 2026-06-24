import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  applyPlaceableAssetRequestHeaders,
  filterObjectsByRenderObjectIds,
  formatAreaSharedRendererIssueSummary,
  formatCanvasLoadOverlayProgress,
  isObjectVisibleWithRenderFilter,
  AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT,
  limitAreaRuntimeIdList,
  readPlaceablesVfxPreviewDrawMetrics,
  resolveAreaObjectRuntimeEvidenceDatasetLimit,
  resolveRenderObjectIdsSet,
  resolveSceneGridVisibility,
  resolveSceneObjectRenderScale,
  shouldRenderAreaGeometry
} from "../../../../src/modules/layout/components/WorkspaceCanvasViewport";
import {
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
      drawLanes: ["source-mdl", "Fountain", "Lighten", "Normal"]
    });
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
      primitiveFallbackRenderLimit: 96,
      primitiveFallbackSuppressedCount: 1040,
      missingPayloadIds: "plc_a|plc_b|plc_c"
    } as Parameters<typeof formatAreaSharedRendererIssueSummary>[0];

    expect(
      formatAreaSharedRendererIssueSummary(diagnostics, {
        payloadRequestsInFlight: true
      })
    ).toBe("1136/1136 primitive fallback / render capped 96, skipped 1040 / payloads pending/in flight 3");
    expect(formatAreaSharedRendererIssueSummary(diagnostics)).toContain("missing payloads 3");
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

  it("blocks generic terrain mesh for Aurora tile-list scenes with model metadata", () => {
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

    expect(runtime.tileMesh).toBeNull();
    expect(scene.children).not.toContain(runtime.tileMesh);
    expect(scene.userData).toMatchObject({
      auroraTerrainRenderStatus: "blocked_tile_model_geometry_loader_missing",
      auroraTerrainRenderLabel: "blocked: tile model geometry loader missing (2/2)",
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
    ).toBe("blocked: tile model geometry loader missing (2/2)");
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

  it("routes dev model delivery directly to the backend instead of the Vite proxy", () => {
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
        })
      );

      expect(resolution.modelUrl).toBe(
        "http://localhost:3000/api/v1/catalog/placeables/cache/cache_001/assets/model_001.glb"
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
    expect(resolution.modelUrl).toBe("http://localhost:3000/assets/placeable.glb");
    expect(resolution.ready).toBe(true);
    expect(resolution.fallbackReason).toBeNull();
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

    const resolution = resolvePlaceableModelResolution(payload);
    expect(resolution.ready).toBe(true);
    expect(resolution.modelUrl).toBe("http://localhost:3000/assets/derived.glb");
    expect(resolution.fallbackReason).toBeNull();
  });

  it("uses derived model asset contract when renderPackage status is stale non-ready", () => {
    const payload = createPlaceableViewportPayload({
      status: "missing_derived",
      assetRefs: {
        derivedModelAssetIds: ["derived-model-1"]
      }
    });
    payload.assetContracts.assets = [createAssetContract("derived-model-1", "/assets/derived.glb")];

    const resolution = resolvePlaceableModelResolution(payload);
    expect(resolution.ready).toBe(true);
    expect(resolution.status).toBe("missing_derived");
    expect(resolution.modelUrl).toBe("http://localhost:3000/assets/derived.glb");
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

    expect(textureUrl).toBe("http://localhost:3000/assets/contract.dds");
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

    expect(textureUrl).toBe("http://localhost:3000/assets/fallback.dds");
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
      ["tx_wood", "http://localhost:3000/assets/wood.dds"],
      ["tx_metal", "http://localhost:3000/assets/metal.tga"]
    ]);
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
      ["u_grim", "http://localhost:3000/assets/u_grim.dds?cache=1"],
      ["u_metal", "http://localhost:3000/assets/u_metal.tga"]
    ]);
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

  it("decodes Aurora TPC DXT1 bytes exposed through DDS asset contracts", () => {
    const decodedTexture = decodeAuroraTpcTexture(buildTpcDxt1Fixture());

    expect(decodedTexture?.sourceFormat).toBe("tpc-dxt1");
    expect(decodedTexture?.width).toBe(4);
    expect(decodedTexture?.height).toBe(4);
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
    expect(Array.from(decodedTexture?.data.slice(0, 4) ?? [])).toEqual([255, 0, 0, 219]);
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
      headers: { Authorization: "Bearer token-123" }
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
    expect(textureFetch).toHaveBeenCalledWith("/assets/ad_watpud03.dds", {
      headers: { Authorization: "Bearer token-456" }
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
      expect(textureFetch).toHaveBeenCalledWith(textureUrl, {
        headers: { Authorization: "Bearer token-789" }
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

  it("applies loaded textures to renderable model materials", () => {
    const material = new THREE.MeshStandardMaterial();
    const model = new THREE.Group();
    model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    const texture = new THREE.Texture();

    applyPlaceableTextureToModel(model, texture);

    expect(material.map).toBe(texture);
    expect(material.side).toBe(THREE.DoubleSide);
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
    expect(resolution.modelUrl).toBe("http://localhost:3000/assets/placeable.glb");
    if (!resolution.modelUrl) {
      throw new Error("Expected model URL for ready payload");
    }

    const { runtime, load } = createModelRuntime((onLoad) => {
      onLoad({ scene: new THREE.Group() });
    });
    const model = await ensurePlaceableModel(runtime, resolution.modelUrl);

    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(
      "http://localhost:3000/assets/placeable.glb",
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
    expect(load).toHaveBeenCalledTimes(1);
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
    const sourceFootprintMeshes = instancedMeshes.filter(
      (mesh) => mesh.userData.role === "instanced-area-object-source-footprint"
    );

    expect(instancedMeshes).toHaveLength(3);
    expect(objectInstancedMesh?.count).toBe(2);
    expect(objectInstancedMesh?.userData.objectIds).toEqual(["plc_a", "plc_b"]);
    expect(sourceFootprintMeshes).toHaveLength(2);
    expect(sourceFootprintMeshes.map((mesh) => mesh.count)).toEqual([2, 2]);
    expect(runtime.objectMeshById.get("plc_a")).not.toBe(objectInstancedMesh);
    expect(runtime.objectMeshById.get("plc_a")?.userData.auroraInstancedFallbackMesh).toBe(
      objectInstancedMesh
    );
    expect(runtime.objectMeshById.get("plc_b")?.position.x).toBe(3);
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
    const defaultFootprintMesh = firstProxy?.userData
      .auroraSourceFootprintDefaultMesh as THREE.InstancedMesh;
    const selectedFootprintMesh = firstProxy?.userData
      .auroraSourceFootprintSelectedMesh as THREE.InstancedMesh;
    const defaultFootprintMatrix = new THREE.Matrix4();
    const selectedFootprintMatrix = new THREE.Matrix4();
    const defaultFootprintScale = new THREE.Vector3();
    const selectedFootprintScale = new THREE.Vector3();
    instancedMesh.getMatrixAt(0, firstMatrixBefore);
    firstMatrixBefore.decompose(new THREE.Vector3(), new THREE.Quaternion(), beforeScale);

    updateObjectMeshSelectionState(runtime, objects, ["plc_a"], 1, true);
    instancedMesh.getMatrixAt(0, firstMatrixAfter);
    firstMatrixAfter.decompose(new THREE.Vector3(), new THREE.Quaternion(), afterScale);
    defaultFootprintMesh.getMatrixAt(0, defaultFootprintMatrix);
    selectedFootprintMesh.getMatrixAt(0, selectedFootprintMatrix);
    defaultFootprintMatrix.decompose(
      new THREE.Vector3(),
      new THREE.Quaternion(),
      defaultFootprintScale
    );
    selectedFootprintMatrix.decompose(
      new THREE.Vector3(),
      new THREE.Quaternion(),
      selectedFootprintScale
    );

    expect(firstProxy?.scale.x).toBeCloseTo(1.16, 6);
    expect(afterScale.x).toBeGreaterThan(beforeScale.x);
    expect(defaultFootprintScale.x).toBeLessThan(0.001);
    expect(selectedFootprintScale.x).toBeGreaterThan(0);
    expect(
      runtime.objectLayer.children.filter((child) => child instanceof THREE.InstancedMesh)
    ).toHaveLength(3);
  });

  it("keeps primitive fallback visible when model loading fails", async () => {
    const { runtime } = createRuntimeForObjectMeshTests((_onLoad, onError) => {
      onError();
    });

    const object = createPreviewPlaceableObject();
    const payload = createPlaceablePayloadWithModelUrl("/assets/missing.glb");

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
