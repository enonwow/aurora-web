// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { rebuildObjectMeshes } from "../../../../src/modules/layout/adapters/three/workspaceObjectMeshLayer";
import {
  readRuntimeAuroraVfxCanonicalPlaybackState,
  seekRuntimeAuroraVfxCanonicalPlaybacks
} from "../../../../src/modules/layout/adapters/three/workspaceThreeRuntime";
import {
  resolvePlaceableModelResolution,
  resolvePlaceableTextureDeliveryUrlsByReference
} from "../../../../src/modules/layout/application/workspacePlaceableRenderContracts";
import { resolvePlaceableAssetDeliveryUrl } from "../../../../src/modules/placeables/application/placeableRenderAssetResolver";
import type { AuroraVfxPayload, SceneObject } from "../../../../src/modules/scene/contracts";
import type { PlaceableViewportRenderPayload } from "../../../../src/modules/placeables/application/placeableRenderPayloadResolver";

function createRuntime() {
  const textureLoader = vi.fn((_url: string, onLoad: (texture: THREE.Texture) => void) => {
    onLoad(new THREE.Texture());
  });
  return {
    container: document.createElement("div"),
    camera: new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 100),
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
    placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
    placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
    placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
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
    withSourceMdlLight?: boolean;
    withSourceMdlStaticGeometry?: boolean;
    withChunkModelAsset?: boolean;
    withChunkMaterialSidecars?: boolean;
    textureFileName?: string;
    placeableSubtype?: "vfx" | "generic" | "light_source";
  } = {}
): PlaceableViewportRenderPayload {
  const textureFileName = options.textureFileName ?? "fx_canonical_fire.tga";
  const placeableSubtype = options.placeableSubtype ?? "vfx";
  const isVfxSubtype = placeableSubtype === "vfx";
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
      placeableSubtype,
      render: {
        backendType: placeableSubtype,
        frontendType: placeableSubtype,
        rendererPreset: isVfxSubtype ? "vfx-emitter" : "placeable-model",
        isDoor: false,
        isVfx: isVfxSubtype
      },
      assetManifest: {
        assets: [
          {
            assetId: "texture-1",
            role: "texture",
            fileName: textureFileName
          },
          ...(options.withChunkModelAsset
            ? [
                {
                  assetId: "chunk-1",
                  role: "model",
                  fileName: "fx_chunk01.glb",
                  objectKey: "modules/current/__aurora/derived/models/fx_chunk01.glb"
                }
              ]
            : [])
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
      ...(options.withChunkMaterialSidecars
        ? {
            textureBindings: [
              {
                reference: "fx_canonical_fire",
                assetId: "texture-1",
                fileName: textureFileName,
                objectKey: `module/textures/${textureFileName}`,
                deliveryUrl: `/assets/${textureFileName}`,
                txi: { clamp: 1, filter: false }
              }
            ],
            auroraMaterial: {
              source: "mtr",
              diagnostics: [],
              materials: [
                {
                  source: "aurora-mtr",
                  materialAssetId: "mtr-chunk-surface",
                  materialFileName: "chunk_surface.mtr",
                  materialObjectKey: "module/materials/chunk_surface.mtr",
                  state: {
                    twoSided: true,
                    roughness: 0.25,
                    textureSlots: [
                      { slot: 0, role: "diffuse", reference: "fx_canonical_fire" }
                    ]
                  }
                }
              ]
            }
          }
        : {}),
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
        : {}),
      ...(options.withSourceMdlLight
        ? {
            auroraLight: {
              source: "source-mdl",
              diagnostics: [],
              lights: [
                {
                  source: "aurora-mdl-ascii",
                  sourceModelAssetId: "light-model-1",
                  sourceModelFileName: "fx_preview.mdl",
                  sourceModelObjectKey: "modules/current/models/fx_preview.mdl",
                  nodeName: "glow_light",
                  sourceNodeKind: "light",
                  radius: 2.5,
                  multiplier: 1,
                  color: [1, 0.75, 0.35],
                  dynamicType: "normal",
                  affectDynamic: true,
                  shadow: false
                }
              ]
            }
          }
        : {}),
      ...(options.withSourceMdlStaticGeometry
        ? {
            glbUrl: "/assets/canonical-static.glb",
            auroraModelGraph: {
              source: "source-mdl",
              diagnostics: [],
              staticGeometryNodes: [
                {
                  source: "aurora-mdl-ascii",
                  sourceModelAssetId: "static-model-1",
                  sourceModelFileName: "fx_preview.mdl",
                  sourceModelObjectKey: "modules/current/models/fx_preview.mdl",
                  nodeName: "static_base",
                  sourceNodeKind: "trimesh"
                }
              ],
              nodes: [
                {
                  source: "aurora-mdl-ascii",
                  sourceModelAssetId: "static-model-1",
                  sourceModelFileName: "fx_preview.mdl",
                  sourceModelObjectKey: "modules/current/models/fx_preview.mdl",
                  nodeKind: "static-geometry",
                  nodeName: "static_base",
                  sourceNodeKind: "trimesh"
                },
                {
                  source: "aurora-mdl-ascii",
                  sourceModelAssetId: "light-model-1",
                  sourceModelFileName: "fx_preview.mdl",
                  sourceModelObjectKey: "modules/current/models/fx_preview.mdl",
                  nodeKind: "light",
                  nodeName: "glow_light",
                  sourceNodeKind: "light"
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
          deliveryUrl: `/assets/${textureFileName}`
        },
        ...(options.withChunkModelAsset
          ? [
              {
                assetId: "chunk-1",
                objectKey: "modules/current/__aurora/derived/models/fx_chunk01.glb",
                deliveryUrl: "/assets/fx_chunk01.glb"
              }
            ]
          : [])
      ]
    } as unknown as PlaceableViewportRenderPayload["assetContracts"]
  } as PlaceableViewportRenderPayload;
}

function createCanonicalPayload(withSourceMdlLight = false): AuroraVfxPayload {
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
      ...(withSourceMdlLight
        ? {
            sourceMdlLights: [
              {
                nodeName: "glow_light",
                transform: { position: [0, 0, 0] },
                color: [1, 0.75, 0.35],
                radius: 2.5,
                multiplier: 1,
                ambientOnly: false
              }
            ],
            sourceMdlLightFeatureManifest: {
              version: "aurora-source-mdl-light-feature-manifest/v1",
              lightCount: 1,
              nodes: [{
                nodeName: "glow_light",
                presentFeatures: [
                  "color",
                  "radius",
                  "multiplier",
                  "dynamicType",
                  "affectDynamic",
                  "shadow"
                ]
              }],
              truncated: false,
              diagnosticCodes: []
            }
          }
        : {}),
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
              enumTableCaptured: true,
              glPrimitiveMode: "GL_TRIANGLES",
              glPrimitiveModeEnum: 0x0004,
              triangleListInferenceProof: "confirmed_draw_wrapper_table_index_3_gl_triangles",
              primitiveModeSource: "nwtoolset-1.5.0.5-disassembly",
              binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24"
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

function createCanonicalPltPayload(
  status: "ready" | "missing_target_context" = "ready"
): AuroraVfxPayload {
  const payload = createCanonicalPayload();
  const dependencyGraph = payload.contracts.dependencyGraph as unknown as {
    edges: Array<Record<string, unknown>>;
  };
  dependencyGraph.edges[0] = {
    edgeType: "texture",
    requestedResourceClass: "texture",
    requestedRef: "robe_fx",
    selectedCandidate: {
      resourceKey: "robe_fx.plt"
    }
  };
  const renderContract = payload.contracts.renderContract as Record<string, unknown>;
  renderContract.pltRenderContext = {
    status,
    requestedTextureRef: "robe_fx",
    selectedResourceKey: "robe_fx.plt",
    ...(status === "ready"
      ? {
          targetRef: "target:creature-1",
          paletteRowsByLayer: { "0": 12, "3": 77 },
          profile: "nwn-ee",
          provenance: "target appearance contract"
        }
      : {}),
    shaderLane: {
      vertexShader: "vs_pltgen",
      fragmentShader: "fs_pltgen",
      schemeUniformPattern: "PLTscheme[%d]",
      schemeUniformCount: 15
    },
    proofStatus: "source-backed-contract-retail-visual-unverified"
  };
  return payload;
}

function createCanonicalRuntimePayload(): AuroraVfxPayload {
  const payload = createCanonicalPayload();
  const finalContract = payload.contracts.renderContract as Record<string, unknown>;
  const drawRecords = finalContract.drawRecords as unknown[];
  payload.contracts.runtimeEmitters = [
    {
      emitterNodeName: "fx_emit",
      runtimeState: { sourceClockSeconds: 0.5 },
      runtimeSnapshot: { activeParticleCount: 1 },
      renderContract: finalContract,
      runtimeFrames: [
        {
          tickIndex: 0,
          timeSeconds: 0,
          runtimeState: { sourceClockSeconds: 0 },
          runtimeSnapshot: { activeParticleCount: 0 },
          renderContract: {
            ...finalContract,
            activeParticleCount: 0,
            drawParticleCount: 0,
            drawVertexCount: 0,
            drawRecords: []
          }
        },
        {
          tickIndex: 1,
          timeSeconds: 0.25,
          runtimeState: { sourceClockSeconds: 0.25 },
          runtimeSnapshot: { activeParticleCount: 1 },
          renderContract: {
            ...finalContract,
            activeParticleCount: 1,
            drawParticleCount: 1,
            drawVertexCount: 6,
            drawRecords: drawRecords.slice(0, 1)
          }
        },
        {
          tickIndex: 2,
          timeSeconds: 0.5,
          runtimeState: { sourceClockSeconds: 0.5 },
          runtimeSnapshot: { activeParticleCount: 1 },
          renderContract: finalContract
        }
      ]
    }
  ];
  return payload;
}

function createCanonicalChunkPayload(): AuroraVfxPayload {
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
            edgeType: "chunk_model",
            requestedResourceClass: "chunk_model",
            requestedRef: "fx_chunk01",
            selectedCandidate: {
              resourceKey: "fx_chunk01.glb"
            }
          }
        ],
        diagnostics: []
      },
      renderContract: {
        version: "aurora-vfx-runtime-render-contract/v1",
        activeParticleCount: 2,
        drawParticleCount: 0,
        verticesPerDrawParticle: 0,
        drawVertexCount: 0,
        drawLane: "chunk_model",
        chunkLane: {
          lane: "chunk_model",
          chunkName: "fx_chunk01",
          activeParticleCount: 2,
          texturedQuadCanonical: false,
          collapseAttempted: false,
          resourceResolveStatus: "resolved",
          resolvedResource: {
            requestedRef: "fx_chunk01",
            resourceKey: "fx_chunk01.glb",
            sourceLayer: "hak",
            sourcePath: "hak/models/fx_chunk01.glb",
            resolutionSource: "dependency-graph-selected-candidate"
          }
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
        renderState: {
          depthWriteLane: "non_punch_transparent_depth_write_off"
        },
        renderOrder: {
          value: 4,
          rawValue: 4
        },
        drawRecords: [],
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
    const object = createSceneObject("preview:canonical-vfx");
    const renderPayload = createRenderPayload({ auroraVfxPayload: createCanonicalPayload() });
    resolvePlaceableTextureDeliveryUrlsByReference(renderPayload).forEach((url) => {
      runtime.placeableTextureCacheByUrl.set(url, new THREE.Texture());
    });

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
        [object.id]: renderPayload
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

  it("routes a generic placeable with a backend-canonical VFX payload to the canonical renderer", () => {
    const runtime = createRuntime();
    const object = createSceneObject("preview:canonical-generic-placeable-vfx");
    const renderPayload = createRenderPayload({
      auroraVfxPayload: createCanonicalPayload(),
      placeableSubtype: "generic"
    });
    resolvePlaceableTextureDeliveryUrlsByReference(renderPayload).forEach((url) => {
      runtime.placeableTextureCacheByUrl.set(url, new THREE.Texture());
    });

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
      { [object.id]: renderPayload }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxRenderer).toBe("canonical");
    expect(root?.userData.auroraVfxCanonicalStatus).toBe("canonical");
    expect(collectMeshesByUserData(root, "auroraVfxCanonicalDrawMesh", true)).toHaveLength(1);
    expect(collectMeshesByUserData(root, "vfxPreviewRole", "camera-billboard-particle")).toHaveLength(0);
  });

  it("loads missing canonical particle textures and replaces diagnostic placeholders", async () => {
    const runtime = createRuntime();
    const object = createSceneObject("preview:canonical-vfx-texture-load");
    const renderPayload = createRenderPayload({ auroraVfxPayload: createCanonicalPayload() });

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
        [object.id]: renderPayload
      }
    );

    expect(
      collectMeshesByUserData(
        runtime.objectMeshById.get(object.id),
        "auroraVfxCanonicalDrawMesh",
        true
      )
    ).toHaveLength(0);

    await vi.waitFor(() => {
      const root = runtime.objectMeshById.get(object.id);
      expect(root?.userData.auroraVfxCanonicalTextureStatus).toBe("applied");
      expect(collectMeshesByUserData(root, "auroraVfxCanonicalDrawMesh", true)).toHaveLength(1);
      expect(
        collectMeshesByUserData(root, "auroraVfxCanonicalDiagnosticPlaceholder", true)
      ).toHaveLength(0);
    });
  });

  it("loads canonical PLT textures through the target palette-specific cache lane", async () => {
    const runtime = createRuntime();
    const object = createSceneObject("preview:canonical-vfx-plt-texture-load");
    const renderPayload = createRenderPayload({
      auroraVfxPayload: createCanonicalPltPayload(),
      textureFileName: "robe_fx.plt"
    });

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
      { [object.id]: renderPayload }
    );

    await vi.waitFor(() => {
      const root = runtime.objectMeshById.get(object.id);
      expect(root?.userData.auroraVfxCanonicalTextureStatus).toBe("applied");
      expect(root?.userData.auroraVfxCanonicalPltPaletteStatus).toBe("ready");
      expect(root?.userData.auroraVfxCanonicalPltPaletteRowsByLayer).toEqual({ 0: 12, 3: 77 });
    });
    const resolvedTextureUrl = Array.from(
      resolvePlaceableTextureDeliveryUrlsByReference(renderPayload).values()
    )[0];
    expect(Array.from(runtime.placeableTextureCacheByUrl.keys())).toEqual([
      `${resolvedTextureUrl}|plt-rows:0:12,3:77`
    ]);
  });

  it("does not decode or render canonical PLT without target palette context", () => {
    const runtime = createRuntime();
    const object = createSceneObject("preview:canonical-vfx-plt-missing-context");
    const renderPayload = createRenderPayload({
      auroraVfxPayload: createCanonicalPltPayload("missing_target_context"),
      textureFileName: "robe_fx.plt"
    });

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
      { [object.id]: renderPayload }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxCanonicalTextureStatus).toBe("missing");
    expect(root?.userData.auroraVfxCanonicalPltPaletteStatus).toBe("missing-target-context");
    expect(runtime.placeableTextureCacheByUrl.size).toBe(0);
    expect(collectMeshesByUserData(root, "auroraVfxCanonicalDiagnosticPlaceholder", true)).toHaveLength(
      1
    );
  });

  it("keeps canonical runtime playback seekable after the texture refresh replaces its root", async () => {
    const runtime = createRuntime();
    const object = createSceneObject("preview:canonical-vfx-runtime-texture-load");
    const renderPayload = createRenderPayload({
      auroraVfxPayload: createCanonicalRuntimePayload()
    });

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
      { [object.id]: renderPayload }
    );

    await vi.waitFor(() => {
      expect(runtime.placeableTextureCacheByUrl.size).toBe(1);
      expect(
        runtime.objectMeshById.get(object.id)?.userData.auroraVfxCanonicalRuntimePlayback
      ).toBe(true);
      expect(runtime.container.dataset.placeableModelTextureStatus).toBe("applied");
    });

    expect(seekRuntimeAuroraVfxCanonicalPlaybacks(runtime, 0.25)).toBe(1);
    const playbackState = readRuntimeAuroraVfxCanonicalPlaybackState(runtime);
    expect(playbackState).toMatchObject({
      rootCount: 1,
      frameCount: 3,
      frameIndex: 1,
      elapsedSeconds: 0.25,
      visibleFrameCount: 1,
      visibleDrawMeshCount: 1,
      visibleDrawParticleCount: 1,
      visibleMappedMaterialCount: 1,
      visibleTextureReferences: ["fx_canonical_fire"],
      completed: false
    });
    expect(playbackState.visibleDrawMeshSamples[0]).toMatchObject({
      textureRepeat: [1, 1],
      textureOffset: [0, 0],
      textureCenter: [0, 0],
      textureRotation: 0,
      textureMatrixAutoUpdate: true,
      textureAtlasTransformOwnership: "per-particle-geometry-uv"
    });
    expect(
      Number.isFinite(
        Number(playbackState.visibleDrawMeshSamples[0]?.firstTriangleFacingDot)
      )
    ).toBe(true);
    const visibleDrawMeshes = collectMeshesByUserData(
      runtime.objectMeshById.get(object.id),
      "auroraVfxCanonicalDrawMesh",
      true
    ).filter((mesh) => mesh.visible && mesh.parent?.visible !== false);
    expect(visibleDrawMeshes).toHaveLength(1);
    const visibleBounds = new THREE.Box3().setFromObject(visibleDrawMeshes[0]!);
    const visibleCenter = visibleBounds.getCenter(new THREE.Vector3());
    expect(visibleCenter.y).toBeCloseTo(0, 5);
    expect(visibleCenter.z).toBeCloseTo(0.75, 5);
    expect(visibleDrawMeshes[0]?.parent?.userData.auroraVfxCanonicalRuntimeFrame).toBe(true);
  });

  it("does not add the source-MDL placeable preview overlay when a canonical payload is available", () => {
    const runtime = createRuntime();
    const object = createSceneObject("preview:canonical-source-mdl-vfx");
    const renderPayload = createRenderPayload({
      auroraVfxPayload: createCanonicalPayload(),
      withPreviewEmitter: true
    });
    resolvePlaceableTextureDeliveryUrlsByReference(renderPayload).forEach((url) => {
      runtime.placeableTextureCacheByUrl.set(url, new THREE.Texture());
    });

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
        [object.id]: renderPayload
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxRenderer).toBe("canonical");
    expect(root?.userData.auroraVfxCanonicalRenderer).toBe(true);
    expect(root?.userData.sourceMdlEmitterPreviewStatus).toBeUndefined();
    expect(
      root?.children.some((child) => child.userData?.auroraEmitterPackageSource === "source-mdl")
    ).toBe(false);
    expect(collectMeshesByUserData(root, "auroraVfxCanonicalDrawMesh", true)).toHaveLength(1);
    expect(collectMeshesByUserData(root, "vfxPreviewRole", "camera-billboard-particle")).toHaveLength(0);
  });

  it("keeps the source-MDL light thin-host as a fallback when the canonical payload omits it", () => {
    const runtime = createRuntime();
    const object = createSceneObject("preview:canonical-source-mdl-vfx-light");
    const renderPayload = createRenderPayload({
      auroraVfxPayload: createCanonicalPayload(),
      withPreviewEmitter: true,
      withSourceMdlLight: true
    });
    resolvePlaceableTextureDeliveryUrlsByReference(renderPayload).forEach((url) => {
      runtime.placeableTextureCacheByUrl.set(url, new THREE.Texture());
    });

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
        [object.id]: renderPayload
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxRenderer).toBe("canonical");
    expect(root?.userData.auroraVfxCanonicalLightSibling).toBe(true);
    expect(root?.userData.auroraVfxCanonicalLightSiblingMode).toBe(
      "source-mdl-light-thin-host-child"
    );
    expect(root?.userData.auroraVfxCanonicalLightSiblingRetailProof).toBe(false);
    expect(root?.userData.sourceMdlEmitterPreviewStatus).toBeUndefined();
    expect(
      root?.children.some((child) => child.userData?.auroraVfxCanonicalLightSibling === true)
    ).toBe(true);
    expect(
      root?.children.some((child) => child.userData?.auroraEmitterPackageSource === "source-mdl")
    ).toBe(false);
    expect(collectMeshesByUserData(root, "auroraVfxCanonicalDrawMesh", true)).toHaveLength(1);
    expect(collectMeshesByUserData(root, "vfxPreviewRole", "camera-billboard-particle")).toHaveLength(0);
  });

  it("routes unsupported canonical source-MDL light fields to the richer light-only fallback", () => {
    const runtime = createRuntime();
    const object = createSceneObject("preview:canonical-source-mdl-vfx-light-carried");
    const renderPayload = createRenderPayload({
      auroraVfxPayload: createCanonicalPayload(true),
      withPreviewEmitter: true,
      withSourceMdlLight: true
    });
    resolvePlaceableTextureDeliveryUrlsByReference(renderPayload).forEach((url) => {
      runtime.placeableTextureCacheByUrl.set(url, new THREE.Texture());
    });

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
        [object.id]: renderPayload
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxRenderer).toBe("canonical");
    expect(root?.userData.auroraVfxCanonicalLightSibling).toBe(true);
    expect(
      root?.children.some((child) => child.userData?.auroraVfxCanonicalLightSibling === true)
    ).toBe(true);
    let canonicalSourceMdlLightCount = 0;
    let fallbackSourceMdlLightCount = 0;
    root?.traverse((node) => {
      if (node.userData?.auroraVfxCanonicalSourceMdlLight === true) {
        canonicalSourceMdlLightCount += 1;
      }
      if (node.userData?.auroraLightPreviewRole === "source-mdl-point-light") {
        fallbackSourceMdlLightCount += 1;
      }
    });
    expect(canonicalSourceMdlLightCount).toBe(0);
    expect(fallbackSourceMdlLightCount).toBe(1);
    expect(root?.userData).toMatchObject({
      auroraVfxCanonicalSourceMdlLightPolicyMode: "legacy_fallback_required",
      auroraVfxSourceMdlLightFallbackActive: true,
      auroraVfxSourceMdlLightFallbackUnsupportedFeatures: [
        "affectDynamic",
        "dynamicType",
        "shadow"
      ]
    });
  });

  it("composes source-MDL trimesh, canonical emitter, and light under one canonical root", async () => {
    const runtime = createRuntime();
    const object = createSceneObject("preview:canonical-source-mdl-hybrid");
    const renderPayload = createRenderPayload({
      auroraVfxPayload: createCanonicalPayload(true),
      withPreviewEmitter: true,
      withSourceMdlLight: true,
      withSourceMdlStaticGeometry: true
    });
    const staticModel = new THREE.Group();
    const staticMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 0.2),
      new THREE.MeshBasicMaterial()
    );
    staticMesh.name = "static_base";
    staticModel.add(staticMesh);
    const sourceLightAnchor = new THREE.Group();
    sourceLightAnchor.name = "glow_light";
    sourceLightAnchor.position.set(0.35, 0.2, -0.15);
    staticModel.add(sourceLightAnchor);
    const modelUrl = resolvePlaceableModelResolution(renderPayload).modelUrl;
    expect(modelUrl).toBeTruthy();
    runtime.placeableModelCacheByUrl.set(modelUrl!, staticModel);
    resolvePlaceableTextureDeliveryUrlsByReference(renderPayload).forEach((url) => {
      runtime.placeableTextureCacheByUrl.set(url, new THREE.Texture());
    });

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
        [object.id]: renderPayload
      }
    );
    await vi.waitFor(() => {
      let staticMeshCount = 0;
      runtime.objectMeshById.get(object.id)?.traverse((node) => {
        if (node.name === "aurora_vfx_source_model_geometry:static_base") {
          staticMeshCount += 1;
        }
      });
      expect(staticMeshCount).toBe(1);
      expect(
        runtime.objectMeshById.get(object.id)?.userData
          .auroraVfxCanonicalLightGraphAttachmentStatus
      ).toBe("source-mdl-graph-light-nodes-checked");
    });

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxRenderer).toBe("canonical");
    expect(root?.userData.auroraVfxCanonicalPlaceableComposition).toBe(true);
    expect(root?.userData.auroraVfxCanonicalPlaceableCompositionMode).toBe(
      "source-mdl-static-emitter-light"
    );
    expect(root?.userData.auroraVfxCanonicalLightSibling).toBe(true);
    expect(root?.userData.auroraVfxCanonicalLightGraphAttachmentStatus).toBe(
      "source-mdl-graph-light-nodes-checked"
    );
    expect(root?.userData.auroraVfxCanonicalLightGraphAttachmentMatchedNodeNames).toEqual([
      "glow_light"
    ]);
    expect(collectMeshesByUserData(root, "auroraVfxCanonicalDrawMesh", true)).toHaveLength(1);
    expect(collectMeshesByUserData(root, "vfxPreviewRole", "camera-billboard-particle")).toHaveLength(0);
    let staticMeshCount = 0;
    let pointLightCount = 0;
    root?.traverse((node) => {
      if (node.name === "aurora_vfx_source_model_geometry:static_base") {
        staticMeshCount += 1;
      }
      if (node instanceof THREE.PointLight) {
        pointLightCount += 1;
      }
    });
    expect(staticMeshCount).toBe(1);
    expect(pointLightCount).toBe(1);
    let attachedLightNode: THREE.Object3D | undefined;
    let fallbackLightNode: THREE.Object3D | undefined;
    root?.traverse((node) => {
      if (node.userData?.auroraVfxCanonicalLightGraphAttachment === "matched-loaded-model-node") {
        attachedLightNode = node;
      }
      if (node.userData?.auroraLightPreviewRole === "source-mdl-point-light") {
        fallbackLightNode = node;
      }
    });
    expect(attachedLightNode).toBeDefined();
    expect(attachedLightNode?.userData.auroraVfxCanonicalSourceMdlLight).not.toBe(true);
    expect(fallbackLightNode).toBeDefined();
    expect(
      root?.getObjectByName("aurora_vfx_model_graph_node:glow_light")
    ).toBeDefined();
  });

  it.each(["generic", "light_source"] as const)(
    "keeps %s source-MDL static geometry and canonical VFX after textures settle",
    async (placeableSubtype) => {
      const runtime = createRuntime();
      const object = createSceneObject(`preview:canonical-source-mdl-${placeableSubtype}`);
      const renderPayload = createRenderPayload({
        auroraVfxPayload: createCanonicalPayload(true),
        withPreviewEmitter: true,
        withSourceMdlLight: true,
        withSourceMdlStaticGeometry: true,
        placeableSubtype
      });
      const staticModel = new THREE.Group();
      const staticMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.25, 0.2),
        new THREE.MeshBasicMaterial()
      );
      staticMesh.name = "static_base";
      staticModel.add(staticMesh);
      const sourceLightAnchor = new THREE.Group();
      sourceLightAnchor.name = "glow_light";
      staticModel.add(sourceLightAnchor);
      const modelUrl = resolvePlaceableModelResolution(renderPayload).modelUrl;
      expect(modelUrl).toBeTruthy();
      runtime.placeableModelCacheByUrl.set(modelUrl!, staticModel);

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
        { [object.id]: renderPayload }
      );

      await vi.waitFor(() => {
        const root = runtime.objectMeshById.get(object.id);
        expect(root?.userData.auroraVfxCanonicalTextureStatus).toBe("applied");
        expect(collectMeshesByUserData(root, "auroraVfxCanonicalDrawMesh", true)).toHaveLength(1);
        expect(
          root?.getObjectByName("aurora_vfx_source_model_geometry:static_base")
        ).toBeDefined();
      });

      const root = runtime.objectMeshById.get(object.id);
      const canonicalDrawMesh = collectMeshesByUserData(
        root,
        "auroraVfxCanonicalDrawMesh",
        true
      )[0];
      const retainedStaticMesh = root?.getObjectByName(
        "aurora_vfx_source_model_geometry:static_base"
      );
      const findTopLevelBranch = (node: THREE.Object3D | undefined) => {
        let branch = node;
        while (branch?.parent && branch.parent !== root) {
          branch = branch.parent;
        }
        return branch;
      };

      expect(root?.userData.auroraVfxRenderer).toBe("canonical");
      expect(root?.userData.auroraVfxCanonicalPlaceableComposition).toBe(true);
      expect(root?.userData.auroraVfxCanonicalPlaceableCompositionReason).toBe("ready");
      expect(runtime.placeableTexturePendingByUrl.size).toBe(0);
      expect(findTopLevelBranch(retainedStaticMesh)).toBe(findTopLevelBranch(canonicalDrawMesh));
      expect(findTopLevelBranch(canonicalDrawMesh)?.userData.auroraVfxCanonicalRenderer).toBe(
        true
      );
      expect(collectMeshesByUserData(root, "vfxPreviewRole", "camera-billboard-particle")).toHaveLength(
        0
      );
      expect(
        collectMeshesByUserData(root, "auroraVfxCanonicalDiagnosticPlaceholder", true)
      ).toHaveLength(0);
      expect(
        root?.children.some(
          (child) => child.userData?.auroraEmitterPackageSource === "source-mdl"
        )
      ).toBe(false);
    }
  );

  it("uses the owning placeable area-model scale for canonical source-MDL particles", async () => {
    const runtime = createRuntime();
    const object = createSceneObject("area:canonical-source-mdl-hybrid");
    const renderPayload = createRenderPayload({
      auroraVfxPayload: createCanonicalPayload(),
      withPreviewEmitter: true,
      withSourceMdlStaticGeometry: true
    });
    const staticModel = new THREE.Group();
    const staticMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 0.2),
      new THREE.MeshBasicMaterial()
    );
    staticMesh.name = "static_base";
    staticModel.add(staticMesh);
    const modelUrl = resolvePlaceableModelResolution(renderPayload).modelUrl;
    expect(modelUrl).toBeTruthy();
    runtime.placeableModelCacheByUrl.set(modelUrl!, staticModel);
    resolvePlaceableTextureDeliveryUrlsByReference(renderPayload).forEach((url) => {
      runtime.placeableTextureCacheByUrl.set(url, new THREE.Texture());
    });

    rebuildObjectMeshes(
      runtime,
      [object],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      { [object.id]: renderPayload }
    );

    await vi.waitFor(() => {
      const root = runtime.objectMeshById.get(object.id);
      expect(
        root?.children.some(
          (child) => child.userData.auroraVfxCanonicalAreaModelSpaceScale === 0.1
        )
      ).toBe(true);
      expect(
        root?.getObjectByName("aurora_vfx_source_model_geometry:static_base")
      ).toBeDefined();
    });
    const root = runtime.objectMeshById.get(object.id);
    const canonicalRoot = root?.children.find(
      (child) => child.userData.auroraVfxCanonicalAreaModelSpaceScale === 0.1
    );
    expect(root?.scale.toArray()).toEqual([1, 1, 1]);
    expect(canonicalRoot?.scale.x).toBeCloseTo(0.1);
    expect(canonicalRoot?.scale.y).toBeCloseTo(0.1);
    expect(canonicalRoot?.scale.z).toBeCloseTo(0.1);
    expect(canonicalRoot?.userData.auroraVfxCanonicalAreaModelSpaceScale).toBeCloseTo(0.1);
    expect(
      canonicalRoot?.getObjectByName("aurora_vfx_source_model_geometry:static_base")
    ).toBeDefined();
  });

  it("supplies cached chunk GLB templates to canonical VFX chunk lanes", () => {
    const runtime = createRuntime();
    const renderPayload = createRenderPayload({
      auroraVfxPayload: createCanonicalChunkPayload(),
      withChunkModelAsset: true,
      withChunkMaterialSidecars: true
    });
    const chunkTexture = new THREE.Texture();
    resolvePlaceableTextureDeliveryUrlsByReference(renderPayload).forEach((url) => {
      runtime.placeableTextureCacheByUrl.set(url, chunkTexture);
    });
    const chunkMaterial = new THREE.MeshStandardMaterial();
    chunkMaterial.name = "Aurora material chunk_surface";
    const chunkTemplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      chunkMaterial
    );
    runtime.placeableModelCacheByUrl.set(
      resolvePlaceableAssetDeliveryUrl("/assets/fx_chunk01.glb"),
      chunkTemplate
    );
    const object = createSceneObject("preview:canonical-vfx-chunk");

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
        [object.id]: renderPayload
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    const chunkInstances = collectMeshesByUserData(
      root,
      "auroraVfxCanonicalChunkLaneModelInstance",
      true
    );
    expect(root?.userData.auroraVfxRenderer).toBe("canonical");
    expect(root?.userData.auroraVfxCanonicalDrawLane).toBe("chunk_model");
    expect(root?.userData.auroraVfxCanonicalChunkLaneResolvedResourceKey).toBe("fx_chunk01.glb");
    expect(root?.userData.auroraVfxCanonicalChunkLaneRendererPending).toBe(false);
    expect(root?.userData.auroraVfxCanonicalRenderedChunkModelCount).toBe(2);
    expect(root?.userData.auroraVfxCanonicalChunkLaneModelPreviewStatus).toBe(
      "applied-local-model-preview-retail-unverified"
    );
    expect(chunkInstances).toHaveLength(2);
    const renderedChunkMaterial = chunkInstances[0]?.material as THREE.MeshStandardMaterial;
    expect(renderedChunkMaterial.userData.auroraMaterialContractSource).toBe(
      "chunk_surface.mtr"
    );
    expect(renderedChunkMaterial.side).toBe(THREE.DoubleSide);
    expect(renderedChunkMaterial.roughness).toBe(0.25);
    expect(renderedChunkMaterial.map?.image).toBe(chunkTexture.image);
    expect(renderedChunkMaterial.map?.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(renderedChunkMaterial.map?.minFilter).toBe(THREE.NearestFilter);
    expect(renderedChunkMaterial.userData.auroraTextureTxiSource).toBe(
      "fx_canonical_fire.tga"
    );
    expect(chunkMaterial.userData.auroraMaterialContractSource).toBeUndefined();
    expect(collectMeshesByUserData(root, "auroraVfxCanonicalDrawMesh", true)).toHaveLength(0);
    expect(
      root?.children.some((child) => child.userData.auroraVfxCanonicalChunkLanePlaceholder === true)
    ).toBe(false);
  });

  it("loads missing canonical chunk GLB templates and refreshes the canonical group", async () => {
    const runtime = createRuntime();
    const loadedScene = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshBasicMaterial()
    );
    const load = vi.fn(
      (
        _url: string,
        onLoad: (gltf: { scene: THREE.Object3D; animations?: THREE.AnimationClip[] }) => void
      ) => {
        onLoad({ scene: loadedScene, animations: [] });
      }
    );
    runtime.placeableModelLoader = { load } as unknown as typeof runtime.placeableModelLoader;
    const object = createSceneObject("preview:canonical-vfx-chunk-load");

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
        [object.id]: createRenderPayload({
          auroraVfxPayload: createCanonicalChunkPayload(),
          withChunkModelAsset: true
        })
      }
    );

    expect(runtime.objectMeshById.get(object.id)?.userData.auroraVfxCanonicalChunkLaneRendererPending).toBe(
      true
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();

    const root = runtime.objectMeshById.get(object.id);
    const chunkInstances = collectMeshesByUserData(
      root,
      "auroraVfxCanonicalChunkLaneModelInstance",
      true
    );
    expect(load).toHaveBeenCalled();
    expect(root?.userData.auroraVfxRenderer).toBe("canonical");
    expect(root?.userData.auroraVfxCanonicalChunkLaneRendererPending).toBe(false);
    expect(root?.userData.auroraVfxCanonicalRenderedChunkModelCount).toBe(2);
    expect(chunkInstances).toHaveLength(2);
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
