// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { rebuildObjectMeshes } from "../../../../src/modules/layout/adapters/three/workspaceObjectMeshLayer";
import type { AuroraVfxPayload, SceneObject } from "../../../../src/modules/scene/contracts";
import type { PlaceableViewportRenderPayload } from "../../../../src/modules/placeables/application/placeableRenderPayloadResolver";

function createRuntime() {
  const textureLoader = vi.fn((_url: string, onLoad: (texture: THREE.Texture) => void) => {
    onLoad(new THREE.Texture());
  });
  return {
    container: document.createElement("div"),
    objectLayer: new THREE.Group(),
    objectMeshById: new Map<string, THREE.Object3D>(),
    boundsLayer: new THREE.Group(),
    boundsHelpers: [],
    placeableTextureLoader: { load: textureLoader },
    placeableDdsTextureLoader: { load: textureLoader },
    placeableTgaTextureLoader: { load: textureLoader },
    placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
    placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>(),
    placeableModelLoader: { load: vi.fn() },
    placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
    placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>()
  } as unknown as Parameters<typeof rebuildObjectMeshes>[0];
}

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

function createSceneObject(id: string): SceneObject {
  return {
    id,
    kind: "placeables",
    name: "Canonical VFX",
    resRef: "plc_canonical_vfx",
    tag: "CANONICAL_VFX",
    isStatic: true,
    x: 0.5,
    y: 0.5,
    z: 0,
    bearing: 0,
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

function createRenderPayload(
  options: {
    auroraVfxPayload?: AuroraVfxPayload;
    withPreviewEmitter?: boolean;
  } = {}
): PlaceableViewportRenderPayload {
  return {
    templateId: "plc_canonical_vfx",
    cacheKey: "cache-canonical-vfx",
    cacheHit: false,
    storedAt: "2026-06-01T00:00:00.000Z",
    hits: 0,
    placeable: {
      templateId: "plc_canonical_vfx",
      resref: "plc_canonical_vfx",
      name: "Canonical VFX",
      category: "effects",
      placeableSubtype: "vfx",
      render: {
        backendType: "vfx",
        frontendType: "vfx",
        rendererPreset: "vfx-emitter",
        isDoor: false,
        isVfx: true
      },
      assetManifest: {
        assets: [
          {
            assetId: "texture-1",
            role: "texture",
            fileName: "fx_canonical_fire.tga"
          }
        ]
      },
      metadata: {}
    } as unknown as PlaceableViewportRenderPayload["placeable"],
    renderPackage: {
      status: "ready",
      diagnostics: [],
      assetRefs: {
        derivedModelAssetIds: []
      },
      ...(options.auroraVfxPayload ? { auroraVfxPayload: options.auroraVfxPayload } : {}),
      ...(options.withPreviewEmitter
        ? {
            auroraEmitter: {
              source: "source-mdl",
              diagnostics: [],
              emitters: [
                {
                  source: "aurora-mdl-ascii",
                  sourceModelFileName: "fx_preview.mdl",
                  nodeName: "preview_emitter",
                  texture: "fx_canonical_fire",
                  emitterType: "Fountain",
                  renderMode: "Normal",
                  blendMode: "Normal",
                  simulation: {
                    birthrate: 2,
                    lifeExp: 1,
                    velocity: 0,
                    randvel: 0,
                    spread: 0,
                    sizeStart: 1,
                    sizeEnd: 1,
                    alphaStart: 1,
                    alphaEnd: 1
                  }
                }
              ]
            }
          }
        : {})
    } as unknown as PlaceableViewportRenderPayload["renderPackage"],
    assetContracts: {
      assets: [
        {
          assetId: "texture-1",
          deliveryUrl: "/assets/fx_canonical_fire.tga"
        }
      ]
    } as unknown as PlaceableViewportRenderPayload["assetContracts"]
  } as PlaceableViewportRenderPayload;
}

function createCanonicalPayload(): AuroraVfxPayload {
  return {
    version: "aurora-vfx-payload/v1",
    canonicalStatus: "canonical",
    backendCanonical: true,
    sourceKind: "effect_instance",
    previewMode: "none",
    diagnostics: {
      sourceRows: [],
      effectInstance: [],
      phaseSchedule: [],
      dependencyGraph: [],
      runtimeState: [],
      renderContract: [],
      payload: []
    },
    contracts: {
      dependencyGraph: {
        version: "aurora-vfx-dependency-graph/v1",
        edges: [
          {
            edgeType: "texture",
            requestedResourceClass: "texture",
            requestedRef: "fx_canonical_fire",
            selectedCandidate: {
              resourceKey: "fx_canonical_fire.tga"
            }
          }
        ],
        diagnostics: []
      },
      renderContract: {
        version: "aurora-vfx-runtime-render-contract/v1",
        activeParticleCount: 1,
        drawParticleCount: 1,
        verticesPerDrawParticle: 6,
        drawVertexCount: 6,
        drawLane: "textured_quad",
        renderMode: {
          enum: "billboard_to_world_z",
          rawToken: "Billboard_to_World_Z"
        },
        blendMode: {
          enum: "normal",
          rawToken: "Normal",
          modeNumber: 0
        },
        renderState: {
          depthWriteLane: "non_punch_transparent_depth_write_off"
        },
        renderOrder: {
          value: 4,
          rawValue: 4
        },
        drawRecords: [
          {
            recordKind: "aurora-particle-draw-record",
            drawRecordId: "fx_emit:particle:1",
            emitterNodeName: "fx_emit",
            lane: "textured_quad",
            particleId: 1,
            particleIndex: 0,
            verticesPerParticle: 6,
            vertexCount: 6,
            drawRoute: {
              route: "non_indexed_draw_arrays",
              indexed: false,
              drawModeArgument: 3,
              drawModeArgumentSource: "aurora-draw-wrapper-mode-arg3",
              enumTableCaptured: false,
              triangleListInferenceProof: "diagnostic_pending"
            },
            renderMode: {
              enum: "billboard_to_world_z",
              rawToken: "Billboard_to_World_Z"
            },
            blendMode: {
              enum: "normal",
              rawToken: "Normal",
              modeNumber: 0
            },
            renderOrder: {
              value: 4,
              rawValue: 4
            },
            position: { x: 0, y: 0.25, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            color: { r: 1, g: 0.5, b: 0.25 },
            alpha: 0.8,
            size: { x: 0.3, y: 0.3 },
            atlasUv: {
              u0: 0,
              v0: 0,
              u1: 1,
              v1: 1,
              frameIndex: 0,
              rawFrameIndex: 0,
              mapping: "single_cell_full_texture"
            },
            atlasProvenance: {
              checkpointSeconds: 0,
              randomResetPath: "sequential_or_static_particle_reset",
              materialLevelFrameOffsetAllowed: false,
              frameStepIntegerConversion: "already_integer"
            },
            diagnostics: []
          }
        ],
        diagnostics: []
      }
    },
    provenance: {
      renderContractVersion: "aurora-vfx-runtime-render-contract/v1"
    }
  } as AuroraVfxPayload;
}

function collectMeshesByUserData(
  root: THREE.Object3D | undefined,
  key: string,
  value: unknown
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root?.traverse((node) => {
    if (node instanceof THREE.Mesh && node.userData[key] === value) {
      meshes.push(node);
    }
  });
  return meshes;
}

describe("workspaceObjectMeshLayer canonical VFX routing", () => {
  it("routes backend-marked canonical payloads to the canonical renderer", () => {
    const runtime = createRuntime();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_canonical_fire.tga",
      new THREE.Texture()
    );
    const object = createSceneObject("preview:canonical-vfx");

    rebuildObjectMeshes(
      runtime,
      [object],
      [],
      createDebugState(),
      1,
      false,
      10,
      [],
      false,
      {
        [object.id]: createRenderPayload({ auroraVfxPayload: createCanonicalPayload() })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxRenderer).toBe("canonical");
    expect(root?.userData.auroraVfxCanonicalRenderer).toBe(true);
    expect(root?.userData.auroraVfxPreviewRenderer).toBe(false);
    expect(root?.userData.vfxPreviewRole).toBeUndefined();
    expect(root?.userData.auroraVfxCanonicalStatus).toBe("canonical");
    expect(collectMeshesByUserData(root, "auroraVfxCanonicalDrawMesh", true)).toHaveLength(1);
    expect(collectMeshesByUserData(root, "vfxPreviewRole", "camera-billboard-particle")).toHaveLength(0);
  });

  it("keeps preview-only VFX payloads on the preview renderer path", () => {
    const runtime = createRuntime();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_canonical_fire.tga",
      new THREE.Texture()
    );
    const object = createSceneObject("preview:preview-vfx");

    rebuildObjectMeshes(
      runtime,
      [object],
      [],
      createDebugState(),
      1,
      false,
      10,
      [],
      false,
      {
        [object.id]: createRenderPayload({ withPreviewEmitter: true })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxRenderer).not.toBe("canonical");
    expect(root?.userData.auroraVfxCanonicalRenderer).not.toBe(true);
    expect(root?.userData.auroraVfxCanonicalStatus).toBe("preview_only");
    expect(root?.userData.vfxPreviewRole).toBeDefined();
    expect(collectMeshesByUserData(root, "auroraVfxCanonicalDrawMesh", true)).toHaveLength(0);
  });
});
