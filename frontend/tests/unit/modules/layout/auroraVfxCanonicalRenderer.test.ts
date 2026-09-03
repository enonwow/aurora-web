// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  advanceAuroraVfxCanonicalRuntimePlayback,
  createAuroraVfxCanonicalRenderGroup,
  evaluateAuroraVfxCanonicalParticleFog,
  isCanonicalAuroraVfxRenderablePayload,
  resolveAuroraVfxCanonicalParticleFogBranch,
  resolveAuroraVfxCanonicalParticleSoftDepthState,
  resolveAuroraVfxCanonicalPltPaletteResolution,
  resolveAuroraVfxCanonicalPltPaletteRows,
  resolveAuroraVfxCanonicalTextureReference,
  seekAuroraVfxCanonicalRuntimePlayback,
  updateAuroraVfxCanonicalParticleFrameUniforms,
  updateAuroraVfxCanonicalCameraBillboards
} from "../../../../src/modules/layout/adapters/three/auroraVfxCanonicalRenderer";
import type { AuroraVfxPayload } from "../../../../src/modules/scene/contracts";
import { createDevAuroraVfxPayload } from "../../../../src/modules/vfx/dev/vfxFixturePayloads";

function createTexture(): THREE.Texture {
  const texture = new THREE.DataTexture(
    new Uint8Array([
      255, 255, 255, 255,
      255, 255, 255, 255,
      255, 255, 255, 255,
      255, 255, 255, 255
    ]),
    2,
    2,
    THREE.RGBAFormat
  );
  texture.needsUpdate = true;
  return texture;
}

function createChunkModelTemplate(): THREE.Object3D {
  const geometry = new THREE.BoxGeometry(0.2, 0.3, 0.4);
  const material = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = {
    source: "test-chunk-model-template"
  };
  return mesh;
}

function createCanonicalPayload(
  options: {
    canonicalStatus?: AuroraVfxPayload["canonicalStatus"];
    backendCanonical?: boolean;
    rendererEligibility?: AuroraVfxPayload["rendererEligibility"];
    retailParityStatus?: AuroraVfxPayload["retailParityStatus"];
    drawLane?: "textured_quad" | "linked_textured_quad" | "chunk_model";
    chunkResourceResolved?: boolean;
    chunkLanded?: boolean;
    renderOrder?: number;
    progFxType4OwnerRecord?: boolean;
    progFxType4VisionRecord?: boolean;
  } = {}
): AuroraVfxPayload {
  const drawLane = options.drawLane ?? "textured_quad";
  const drawRecords =
    drawLane === "chunk_model"
      ? []
      : [
          createDrawRecord({
            id: "draw:0",
            particleId: 10,
            particleIndex: 0,
            position: { x: 0.1, y: 0.2, z: 0.3 },
            inheritedVelocityMagnitude: 4,
            inheritedVelocityDirection: { x: 1, y: 0, z: 0 },
            inheritPart: true,
            rotationRadians: 0,
            color: { r: 1, g: 0.25, b: 0.5 },
            alpha: 0.75,
            size: { x: 0.4, y: 0.2 },
            atlasUv: {
              u0: 0.25,
              v0: 0.5,
              u1: 0.5,
              v1: 0.75,
              frameIndex: 6,
              rawFrameIndex: 6,
              mapping: "row_major_top_down_v"
            }
          }),
          createDrawRecord({
            id: "draw:1",
            particleId: 11,
            particleIndex: 1,
            position: { x: 0.6, y: 0.2, z: 0.3 },
            rotationRadians: 0,
            color: { r: 0.2, g: 0.8, b: 1 },
            alpha: 0.45,
            size: { x: 0.2, y: 0.6 },
            atlasUv: {
              u0: 0.5,
              v0: 0,
              u1: 0.75,
              v1: 0.25,
              frameIndex: 2,
              rawFrameIndex: 2,
              mapping: "row_major_top_down_v"
            }
          })
        ];
  return {
    version: "aurora-vfx-payload/v1",
    canonicalStatus: options.canonicalStatus ?? "canonical",
    backendCanonical: options.backendCanonical ?? true,
    rendererEligibility: options.rendererEligibility ?? "source_backed",
    retailParityStatus: options.retailParityStatus ?? "blocked",
    sourceKind: "effect_instance",
    previewMode: "none",
    diagnostics: {
      sourceRows: [],
      effectInstance: [],
      phaseSchedule: [],
      dependencyGraph: [],
      runtimeState: [],
      renderContract: [
        {
          code: "VFX_PARTICLE_DRAW_RECORD_REQUIRED",
          severity: "info",
          message: "draw record"
        }
      ],
      payload: []
    },
    contracts: {
      dependencyGraph: {
        version: "aurora-vfx-dependency-graph/v1",
        edges: [
          {
            ...(drawLane === "chunk_model"
              ? {
                  edgeType: "chunk_model",
                  requestedResourceClass: "chunk_model",
                  requestedRef: "fx_chunk01",
                  ...(options.chunkResourceResolved
                    ? {
                        selectedCandidate: {
                          candidateId: "candidate:fx_chunk01.glb",
                          sourceLayer: "hak",
                          resourceKey: "fx_chunk01.glb",
                          sourcePath: "hak/models/fx_chunk01.glb",
                          resourceHash: "chunk-glb-hash"
                        }
                      }
                    : {})
                }
              : {
                  edgeType: "texture",
                  requestedResourceClass: "texture",
                  requestedRef: "fx_canonical_fire",
                  selectedCandidate: {
                    resourceKey: "fx_canonical_fire.tga"
                  }
                })
          }
        ],
        diagnostics: []
      },
      renderContract: {
        version: "aurora-vfx-runtime-render-contract/v1",
        activeParticleCount: drawLane === "chunk_model" ? 2 : drawRecords.length,
        drawParticleCount: drawRecords.length,
        verticesPerDrawParticle: drawLane === "chunk_model" ? 0 : 6,
        drawVertexCount: drawRecords.length * 6,
        drawLane,
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
          depthWriteLane: "non_punch_transparent_depth_write_off",
          transparentLane: "non_punch_transparent_lane",
          twoSidedTextureLane: "default_cull_lane"
        },
        renderOrder: {
          value: options.renderOrder ?? 7,
          rawValue: options.renderOrder ?? 7
        },
        ...(drawLane === "chunk_model"
          ? {
              chunkLane: {
                lane: "chunk_model",
                chunkName: "fx_chunk01",
                modelAnimation: {
                  animationName: "impact",
                  playbackRate: 1,
                  startPolicy: "once_on_particle_activation",
                  rawArguments: {
                    argumentAfterRate: 1,
                    finalArgument: 0
                  },
                  source: "nwtoolset-1.5.0.5-chunk-particle-init-disassembly",
                  binarySha256:
                    "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24"
                },
                activeParticleCount: 2,
                particleInstances: [
                  {
                    particleId: 31,
                    position: { x: 0.25, y: 0.5, z: 0.75 },
                    rotationRadians: 0.4,
                    rotationAxis: { x: 0, y: 0, z: 1 },
                    ...(options.chunkLanded
                      ? {
                          particleOrientation: {
                            axis: [-1, 0, 0],
                            angleRadians: Math.PI / 2
                          },
                          landed: true,
                          contactNormal: { x: 0, y: 1, z: 0 }
                        }
                      : { landed: false }),
                    scale: { x: 0.5, y: 0.25 },
                    ageSeconds: 0.2,
                    lifetimeSeconds: 1.5,
                    modelInstanceRef: "emit_chunk:chunk:31:0.200000",
                    modelRuntimeStatus: "active"
                  },
                  {
                    particleId: 32,
                    position: { x: -0.25, y: 0.1, z: 0.2 },
                    rotationRadians: 0.8,
                    rotationAxis: { x: 0, y: 0, z: 1 },
                    landed: false,
                    scale: { x: 0.75, y: 0.4 },
                    ageSeconds: 0.4,
                    lifetimeSeconds: 1.5,
                    modelInstanceRef: "emit_chunk:chunk:32:0.400000",
                    modelRuntimeStatus: "active"
                  }
                ],
                texturedQuadCanonical: false,
                collapseAttempted: true,
                resourceResolveStatus: options.chunkResourceResolved ? "resolved" : "unresolved",
                ...(options.chunkResourceResolved
                  ? {
                      resolvedResource: {
                        requestedRef: "fx_chunk01",
                        resourceKey: "fx_chunk01.glb",
                        sourceLayer: "hak",
                        sourcePath: "hak/models/fx_chunk01.glb",
                        resourceHash: "chunk-glb-hash",
                        candidateId: "candidate:fx_chunk01.glb",
                        resolutionSource: "dependency-graph-selected-candidate"
                      }
                    }
                  : {})
              }
            }
          : {}),
        drawRecords,
        ...(options.progFxType4VisionRecord
          ? {
              progFxType4Light: {
                rowId: 329,
                label: "LightBlindvision",
                animationRaw: "Blind_Vision",
                animation: "Blind_Vision",
                animationParameterStatus:
                  "source-backed-progfx-type4-param1-animation-token-preserved",
                animationKind: "vision",
                visionMode: "Blind_Vision",
                visionParameterStatus:
                  "docs-backed-progfx-type4-param1-vision-token-param4-priority",
                symbolicColor: "",
                tokenRadiusMeters: null,
                tokenRadiusProofStatus: "",
                radiusMeters: null,
                radiusProofStatus: "",
                sourceMdlNodeName: "AuroraLight02",
                sourceMdlAnimation: "Blind_Vision",
                sourceMdlColor: { r: 0.3, g: 0.3, b: 0.3 },
                sourceMdlColorSource:
                  "nwn_base.key fx_light_clr.mdl AuroraLight02 vision animation light-color controller type 76",
                sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb",
                sourceMdlRadiusMeters: 7,
                sourceMdlRadiusFrames: [0, 7],
                sourceMdlRadiusSource:
                  "nwn_base.key fx_light_clr.mdl AuroraLight02 vision animation radius controller type 88",
                sourceMdlRadiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius",
                animationSpeedRaw: "1",
                animationSpeed: 1,
                animationSpeedParameterStatus:
                  "source-backed-progfx-type4-param2-animation-speed-preserved-runtime-playback-blocked",
                castShadowsRaw: "0",
                castShadows: false,
                castShadowParameterStatus:
                  "source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent",
                priorityRaw: "53",
                priority: 53,
                priorityParameterStatus:
                  "docs-backed-progfx-type4-param4-priority-lower-value-wins",
                proximitySuppressionRaw: "1",
                proximitySuppression: true,
                proximitySuppressionParameterStatus:
                  "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light",
                attachToSceneRaw: "0",
                attachToScene: false,
                sceneAttachmentParameterStatus:
                  "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights",
                modelRaw: "fx_light_clr",
                modelRef: "fx_light_clr",
                modelParameterStatus:
                  "source-backed-progfx-type4-param7-model-ref-preserved-client-loader-path-source-backed",
                unusedParam8Raw: "****",
                color: { r: 0, g: 0, b: 0 },
                proofStatus:
                  "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
                notPlaceableTwoDaLight: true,
                notMdlLightNode: true,
                parameterSource:
                  "retail progfx.2da Type 4 Param1 animation, Param2 speed, Param3 cast shadows, Param4 priority, Param5 proximity suppression, Param6 attach to scene, Param7 model",
                parameterPreservationProofSource:
                  "nwn_base.key progfx.2da selected rows 300..333 and 350..377 preserve Type 4 Param1..Param7; backend parser keeps raw Param1..Param8 cells before runtime scheduling",
                parameterPreservationProofStatus:
                  "source-backed-progfx-type4-param1-param8-raw-preserved",
                runtimeSchedulingStatus:
                  "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
                runtimeSchedulingProofSource:
                  "C:/Projects/New Folder/export/decompiled_all.c:348244 loads visualeffects.2da; backend/scripts/audit-retail-light-function-disasm.py recovers looping VFX owner add/remove, message serialization, and clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path; Beamdog patch 8193.15 documents progfx.2da unhardcoding but not priority/proximity/shadow runtime semantics",
                runtimeSchedulingBlocker:
                  "ProgFX Type 4 Param3 values are source-table backed, Param4/Param5/Param6/vision policy semantics are docs-backed from progfx.2da, and object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render object attach, fx_light NewCAurObject/Gob model instantiation, and generic MDL PartLight creation are source-backed; retail table/owner-phase audit reports nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0, so vanilla non-item Type 4 shadow-casting rows are source-backed absent; source-only decompiled_all.c still has no progfx.2da/fx_light_clr/Blind_Vision scheduler string hit, localResourceDumpEvidence does not expose progfx.2da/visualeffects.2da/fx_light_clr scheduler resource files in the available C:/Projects/New Folder dump, and decompiled_all.c does not expose the retail scheduler data-flow, so remaining blocked semantics are cross-lane insertion order, exact owner grouping, proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity",
                sceneAttachmentPolicyStatus:
                  "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights-retail-dataflow-blocked",
                proximitySuppressionPolicyStatus:
                  "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light-retail-distance-blocked",
                visionMutationPolicyStatus:
                  "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked",
                shadowPolicyStatus:
                  "source-backed-progfx-type4-non-item-cast-shadow-absent-vanilla-rows",
                visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
                ownerVisualEffectRowId: 242,
                ownerVisualEffectLabel: "VFX_DUR_BLINDVISION",
                ownerPhase: "duration",
                ownerProgFxRef: "329",
                ownerEffectConstructorKind: "EffectVisualEffect",
                ownerDurationType: "temporary"
              }
            }
          : options.progFxType4OwnerRecord
            ? {
                progFxType4Light: {
                  rowId: 304,
                  label: "LightBlue5m",
                  animationRaw: "Blue_5m",
                  animation: "Blue_5m",
                  animationParameterStatus:
                    "source-backed-progfx-type4-param1-animation-token-preserved",
                  animationKind: "light",
                  visionMode: "",
                  visionParameterStatus: "",
                  symbolicColor: "Blue",
                  tokenRadiusMeters: 5,
                  tokenRadiusProofStatus: "source-backed-progfx-param1-animation-token-radius",
                  radiusMeters: 13.3,
                  radiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius",
                  sourceMdlNodeName: "AuroraLight01",
                  sourceMdlAnimation: "Blue_5m",
                  sourceMdlColor: { r: 0.5, g: 0.5, b: 1 },
                  sourceMdlColorSource:
                    "nwn_base.key fx_light_clr.mdl AuroraLight01 animation light-color controller type 76",
                  sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb",
                  sourceMdlRadiusMeters: 13.3,
                  sourceMdlRadiusFrames: [0, 13.3],
                  sourceMdlRadiusSource:
                    "nwn_base.key fx_light_clr.mdl AuroraLight01 animation radius controller type 88 frames 0 -> 13.3",
                  sourceMdlRadiusProofStatus:
                    "source-family-backed-fx_light_clr-mdl-animation-radius",
                  animationSpeedRaw: "1",
                  animationSpeed: 1,
                  animationSpeedParameterStatus:
                    "source-backed-progfx-type4-param2-animation-speed-preserved-runtime-playback-blocked",
                  castShadowsRaw: "0",
                  castShadows: false,
                  castShadowParameterStatus:
                    "source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent",
                  priorityRaw: "20",
                  priority: 20,
                  priorityParameterStatus:
                    "docs-backed-progfx-type4-param4-priority-lower-value-wins",
                  proximitySuppressionRaw: "0",
                  proximitySuppression: false,
                  proximitySuppressionParameterStatus:
                    "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light",
                  attachToSceneRaw: "0",
                  attachToScene: false,
                  sceneAttachmentParameterStatus:
                    "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights",
                  modelRaw: "fx_light_clr",
                  modelRef: "fx_light_clr",
                  modelParameterStatus:
                    "source-backed-progfx-type4-param7-model-ref-preserved-client-loader-path-source-backed",
                  unusedParam8Raw: "****",
                  color: { r: 0.5, g: 0.5, b: 1 },
                  proofStatus:
                    "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
                  notPlaceableTwoDaLight: true,
                  notMdlLightNode: true,
                  parameterSource:
                    "retail progfx.2da Type 4 Param1 animation, Param2 speed, Param3 cast shadows, Param4 priority, Param5 proximity suppression, Param6 attach to scene, Param7 model",
                  parameterPreservationProofSource:
                    "nwn_base.key progfx.2da selected rows 300..333 and 350..377 preserve Type 4 Param1..Param7; backend parser keeps raw Param1..Param8 cells before runtime scheduling",
                  parameterPreservationProofStatus:
                    "source-backed-progfx-type4-param1-param8-raw-preserved",
                  runtimeSchedulingStatus:
                    "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
                  runtimeSchedulingProofSource:
                    "C:/Projects/New Folder/export/decompiled_all.c:348244 loads visualeffects.2da; backend/scripts/audit-retail-light-function-disasm.py recovers looping VFX owner add/remove, message serialization, and clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path; Beamdog patch 8193.15 documents progfx.2da unhardcoding but not priority/proximity/shadow runtime semantics",
                runtimeSchedulingBlocker:
                    "ProgFX Type 4 Param3 values are source-table backed, Param4/Param5/Param6/vision policy semantics are docs-backed from progfx.2da, and object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render object attach, fx_light NewCAurObject/Gob model instantiation, and generic MDL PartLight creation are source-backed; retail table/owner-phase audit reports nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0, so vanilla non-item Type 4 shadow-casting rows are source-backed absent; source-only decompiled_all.c still has no progfx.2da/fx_light_clr/Blind_Vision scheduler string hit, localResourceDumpEvidence does not expose progfx.2da/visualeffects.2da/fx_light_clr scheduler resource files in the available C:/Projects/New Folder dump, and decompiled_all.c does not expose the retail scheduler data-flow, so remaining blocked semantics are cross-lane insertion order, exact owner grouping, proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity",
                  sceneAttachmentPolicyStatus:
                    "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights-retail-dataflow-blocked",
                  proximitySuppressionPolicyStatus:
                    "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light-retail-distance-blocked",
                  visionMutationPolicyStatus:
                    "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked",
                  shadowPolicyStatus:
                    "source-backed-progfx-type4-param3-item-light-shadow-toggle-retail-shadow-volume-projection-blocked",
                  visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
                  ownerVisualEffectRowId: 153,
                  ownerVisualEffectLabel: "VFX_DUR_LIGHT_BLUE_5",
                  ownerPhase: "duration",
                  ownerProgFxRef: "304",
                  ownerEffectConstructorKind: "EffectVisualEffect",
                  ownerDurationType: "temporary"
                }
              }
            : {}),
        diagnostics: [
          {
            code: "VFX_PARTICLE_DRAW_NON_INDEXED_ARRAYS_REQUIRED",
            severity: "info",
            message: "draw arrays"
          },
          {
            code: "VFX_BLEND_FUNC_FACTORS_CAPTURE_REQUIRED",
            severity: "warn",
            message: "blend factors pending"
          }
        ],
        adapterBoundaries: {
          threeMaterialSettingsAreSourceTruth: false,
          spriteMaterialIsCanonical: false,
          shaderMaterialIsCanonical: false,
          glbPreviewIsCanonical: false,
          materialLevelAtlasFrameOffsetAllowed: false
        }
      }
    },
    provenance: {
      renderContractVersion: "aurora-vfx-runtime-render-contract/v1"
    }
  } as AuroraVfxPayload;
}

function createDrawRecord(options: {
  id: string;
  emitterNodeName?: string;
  lane?: "textured_quad" | "linked_textured_quad";
  particleId: number;
  particleIndex: number;
  ageSeconds?: number;
  lifetimeSeconds?: number;
  position: { x: number; y: number; z: number };
  linkedNextParticleId?: number;
  linkedNextPosition?: { x: number; y: number; z: number };
  previousPosition?: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
  direction?: { x: number; y: number; z: number };
  landed?: boolean;
  contactNormal?: { x: number; y: number; z: number };
  splat?: boolean;
  inheritedVelocityMagnitude?: number;
  inheritedVelocityDirection?: { x: number; y: number; z: number };
  inheritPart?: boolean;
  rotationRadians?: number;
  particleOrientation?: {
    axis: [number, number, number];
    angleRadians: number;
  };
  emitterOrientation?: {
    axis: [number, number, number];
    angleRadians: number;
  };
  renderMode?: {
    enum: string;
    rawToken: string;
  };
  color: { r: number; g: number; b: number };
  alpha: number;
  size: { x: number; y: number };
  atlasUv: {
    u0: number;
    v0: number;
    u1: number;
    v1: number;
    frameIndex: number;
    rawFrameIndex: number;
    mapping: string;
  };
}) {
  return {
    recordKind: "aurora-particle-draw-record",
    drawRecordId: options.id,
    emitterNodeName: options.emitterNodeName ?? "fx_emit",
    lane: options.lane ?? "textured_quad",
    particleId: options.particleId,
    particleIndex: options.particleIndex,
    ageSeconds: options.ageSeconds ?? 0,
    lifetimeSeconds: options.lifetimeSeconds ?? 1,
    ...(options.linkedNextParticleId !== undefined
      ? { linkedNextParticleId: options.linkedNextParticleId }
      : {}),
    ...(options.linkedNextPosition
      ? { linkedNextPosition: options.linkedNextPosition }
      : {}),
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
    renderMode: options.renderMode ?? {
      enum: "billboard_to_world_z",
      rawToken: "Billboard_to_World_Z"
    },
    blendMode: {
      enum: "normal",
      rawToken: "Normal",
      modeNumber: 0
    },
    renderOrder: {
      value: 7,
      rawValue: 7
    },
    position: options.position,
    ...(options.previousPosition ? { previousPosition: options.previousPosition } : {}),
    velocity: options.velocity ?? { x: 0, y: 0, z: 0 },
    ...(options.direction ? { direction: options.direction } : {}),
    landed: options.landed === true,
    ...(options.contactNormal ? { contactNormal: options.contactNormal } : {}),
    splat: options.splat === true,
    ...(options.inheritedVelocityMagnitude !== undefined
      ? { inheritedVelocityMagnitude: options.inheritedVelocityMagnitude }
      : {}),
    ...(options.inheritedVelocityDirection
      ? { inheritedVelocityDirection: options.inheritedVelocityDirection }
      : {}),
    inheritPart: options.inheritPart === true,
    rotationRadians: options.rotationRadians ?? 0,
    ...(options.particleOrientation ? { particleOrientation: options.particleOrientation } : {}),
    ...(options.emitterOrientation ? { emitterOrientation: options.emitterOrientation } : {}),
    color: options.color,
    alpha: options.alpha,
    size: options.size,
    atlasUv: options.atlasUv,
    atlasProvenance: {
      checkpointSeconds: 0,
      randomResetPath: "sequential_or_static_particle_reset",
      materialLevelFrameOffsetAllowed: false,
      frameStepIntegerConversion: "already_integer"
    },
    diagnostics: []
  };
}

function collectCanonicalDrawMeshes(group: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  group.traverse((node) => {
    if (node instanceof THREE.Mesh && node.userData.auroraVfxCanonicalDrawMesh === true) {
      meshes.push(node);
    }
  });
  return meshes;
}

function collectPointLights(group: THREE.Object3D): THREE.PointLight[] {
  const pointLights: THREE.PointLight[] = [];
  group.traverse((node) => {
    if (node instanceof THREE.PointLight) {
      pointLights.push(node);
    }
  });
  return pointLights;
}

describe("Aurora VFX canonical renderer", () => {
  it("derives the retail soft-depth factor from the maximum evaluated half extent", () => {
    const state = resolveAuroraVfxCanonicalParticleSoftDepthState({
      renderMode: "normal",
      drawRecords: [
        { splat: false, size: { x: 0.4, y: 0.2 } },
        { splat: false, size: { x: 0.2, y: 0.6 } }
      ]
    });

    expect(state).toMatchObject({
      status: "enabled",
      maxHalfExtent: 0.3,
      particleSoftness: 1 / (0.2 * 0.3),
      disableReason: null,
      source:
        "nwn-retail-fsparticle-particleSoftness-plus-nwmain-PartEmitter-draw-gate"
    });
  });

  it("does not apply the superseded base-shader lower clamp to retail particleSoftness", () => {
    const state = resolveAuroraVfxCanonicalParticleSoftDepthState({
      renderMode: "normal",
      drawRecords: [{ splat: false, size: { x: 0.01, y: 0.004 } }]
    });

    expect(state.particleSoftness).toBeCloseTo(1 / (0.2 * 0.005), 10);
  });

  it.each([
    {
      name: "landed splat",
      renderMode: "normal",
      drawRecords: [{ splat: true, size: { x: 0.4, y: 0.6 } }],
      disableReason: "splat"
    },
    {
      name: "Billboard_to_Local_Z",
      renderMode: "billboard_to_local_z",
      drawRecords: [{ splat: false, size: { x: 0.4, y: 0.6 } }],
      disableReason: "billboard_to_local_z"
    },
    {
      name: "Billboard_to_World_Z",
      renderMode: "billboard_to_world_z",
      drawRecords: [{ splat: false, size: { x: 0.4, y: 0.6 } }],
      disableReason: "billboard_to_world_z"
    },
    {
      name: "non-positive evaluated size",
      renderMode: "normal",
      drawRecords: [{ splat: false, size: { x: 0, y: 0 } }],
      disableReason: "non_positive_max_half_extent"
    }
  ])(
    "disables retail soft depth for $name",
    ({ renderMode, drawRecords, disableReason }) => {
      expect(
        resolveAuroraVfxCanonicalParticleSoftDepthState({
          renderMode,
          drawRecords
        })
      ).toMatchObject({
        status: "disabled",
        particleSoftness: 0,
        disableReason
      });
    }
  );

  it("uses Aurora's blend-specific particle fog equations", () => {
    expect(resolveAuroraVfxCanonicalParticleFogBranch("normal")).toBe(
      "normal_rgb_mix"
    );
    expect(resolveAuroraVfxCanonicalParticleFogBranch("additive")).toBe(
      "additive_alpha_attenuation"
    );

    expect(
      evaluateAuroraVfxCanonicalParticleFog({
        branch: "normal_rgb_mix",
        colorGamma: [1, 0.5, 0],
        alpha: 0.8,
        fogColorGamma: [0, 0.5, 1],
        fogAmount: 0.25
      })
    ).toEqual({
      colorGamma: [0.75, 0.5, 0.25],
      alpha: 0.8
    });
    const additive = evaluateAuroraVfxCanonicalParticleFog({
      branch: "additive_alpha_attenuation",
      colorGamma: [1, 0.5, 0],
      alpha: 0.8,
      fogColorGamma: [0, 0.5, 1],
      fogAmount: 0.25
    });
    expect(additive.colorGamma).toEqual([1, 0.5, 0]);
    expect(additive.alpha).toBeCloseTo(0.6, 10);
  });

  it("plays synchronized runtime frames once without overlapping frame geometry", () => {
    const payload = createCanonicalPayload();
    const finalContract = payload.contracts.renderContract as Record<string, unknown>;
    const drawRecords = finalContract.drawRecords as unknown[];
    const emptyContract = {
      ...finalContract,
      activeParticleCount: 0,
      drawParticleCount: 0,
      drawVertexCount: 0,
      drawRecords: []
    };
    const firstParticleContract = {
      ...finalContract,
      activeParticleCount: 1,
      drawParticleCount: 1,
      drawVertexCount: 6,
      drawRecords: drawRecords.slice(0, 1)
    };
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "fx_emit",
        runtimeState: { sourceClockSeconds: 0.5 },
        runtimeSnapshot: { activeParticleCount: 2 },
        renderContract: finalContract,
        runtimeFrames: [
          {
            tickIndex: 0,
            timeSeconds: 0,
            runtimeState: { sourceClockSeconds: 0 },
            runtimeSnapshot: { activeParticleCount: 0 },
            renderContract: emptyContract
          },
          {
            tickIndex: 1,
            timeSeconds: 0.25,
            runtimeState: { sourceClockSeconds: 0.25 },
            runtimeSnapshot: { activeParticleCount: 1 },
            renderContract: firstParticleContract
          },
          {
            tickIndex: 2,
            timeSeconds: 0.5,
            runtimeState: { sourceClockSeconds: 0.5 },
            runtimeSnapshot: { activeParticleCount: 2 },
            renderContract: finalContract
          }
        ]
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const visibleFrameIndices = () =>
      group.children
        .filter((child) => child.visible)
        .map((child) => child.userData.auroraVfxCanonicalRuntimeFrameIndex);

    expect(group.userData.auroraVfxCanonicalRuntimePlaybackOneTrigger).toBe(true);
    expect(group.userData.auroraVfxCanonicalRuntimePlaybackLoop).toBe(false);
    expect(group.userData.auroraVfxCanonicalRuntimePlaybackFrameCount).toBe(3);
    expect(group.userData.auroraVfxCanonicalRuntimeFrame).toBeUndefined();
    expect(group.userData.auroraVfxCanonicalRuntimeFrameIndex).toBeUndefined();
    expect(visibleFrameIndices()).toEqual([0]);
    expect(collectCanonicalDrawMeshes(group.children[0]!)).toHaveLength(0);
    expect(
      group.children[0]!.children.some(
        (child) => child.userData.auroraVfxCanonicalDiagnosticPlaceholder === true
      )
    ).toBe(false);

    expect(advanceAuroraVfxCanonicalRuntimePlayback(group, 0.24)).toBe(true);
    expect(visibleFrameIndices()).toEqual([0]);
    advanceAuroraVfxCanonicalRuntimePlayback(group, 0.01);
    expect(visibleFrameIndices()).toEqual([1]);
    advanceAuroraVfxCanonicalRuntimePlayback(group, 0.25);
    expect(visibleFrameIndices()).toEqual([2]);
    expect(group.userData.auroraVfxCanonicalRuntimePlaybackCompleted).toBe(true);

    advanceAuroraVfxCanonicalRuntimePlayback(group, 5);
    expect(visibleFrameIndices()).toEqual([]);
    expect(group.userData.auroraVfxCanonicalRuntimePlaybackElapsedSeconds).toBe(0.5);
    expect(group.userData.auroraVfxCanonicalRuntimePlaybackPostDurationHidden).toBe(true);
    expect(group.userData.auroraVfxCanonicalRuntimePlaybackTerminalFrameFrozen).toBe(false);

    expect(seekAuroraVfxCanonicalRuntimePlayback(group, 0.25)).toBe(true);
    expect(visibleFrameIndices()).toEqual([1]);
    expect(group.userData.auroraVfxCanonicalRuntimePlaybackElapsedSeconds).toBe(0.25);
    expect(group.userData.auroraVfxCanonicalRuntimePlaybackCompleted).toBe(false);
    expect(group.userData.auroraVfxCanonicalRuntimePlaybackPostDurationHidden).toBe(false);
  });

  it("materializes only the selected runtime frame in lazy playback mode", () => {
    const payload = createCanonicalPayload();
    const activeContract = payload.contracts.renderContract as Record<string, unknown>;
    const emptyContract = {
      ...activeContract,
      activeParticleCount: 0,
      drawParticleCount: 0,
      drawVertexCount: 0,
      drawRecords: []
    };
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "fx_emit",
        runtimeState: { sourceClockSeconds: 0.5 },
        runtimeSnapshot: { activeParticleCount: 2 },
        renderContract: activeContract,
        aoeVisualOwner: {
          ownerId: "aoe:0:slot:1:owner:0",
          phase: "duration"
        },
        runtimeFrames: [
          {
            tickIndex: 0,
            timeSeconds: 0,
            aoeVisualOwner: {
              ownerId: "aoe:0:slot:1:owner:0",
              phase: "waiting"
            },
            runtimeState: { sourceClockSeconds: 0 },
            runtimeSnapshot: { activeParticleCount: 0 },
            renderContract: emptyContract
          },
          {
            tickIndex: 1,
            timeSeconds: 0.25,
            aoeVisualOwner: {
              ownerId: "aoe:0:slot:1:owner:0",
              phase: "impact"
            },
            runtimeState: { sourceClockSeconds: 0.25 },
            runtimeSnapshot: { activeParticleCount: 2 },
            renderContract: activeContract
          },
          {
            tickIndex: 2,
            timeSeconds: 0.5,
            aoeVisualOwner: {
              ownerId: "aoe:0:slot:1:owner:0",
              phase: "duration"
            },
            runtimeState: { sourceClockSeconds: 0.5 },
            runtimeSnapshot: { activeParticleCount: 2 },
            renderContract: activeContract
          }
        ]
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      runtimeFrameMaterialization: "lazy"
    });

    expect(group.children).toHaveLength(1);
    expect(group.children[0]!.userData.auroraVfxCanonicalRuntimeFrameIndex).toBe(0);
    expect(group.userData.auroraVfxCanonicalRuntimePlaybackMaterialization).toBe(
      "lazy"
    );
    expect(group.children[0]!.userData.auroraVfxCanonicalAoePhaseCounts).toEqual({
      waiting: 1
    });

    expect(seekAuroraVfxCanonicalRuntimePlayback(group, 0.25)).toBe(true);
    expect(group.children).toHaveLength(1);
    expect(group.children[0]!.userData.auroraVfxCanonicalRuntimeFrameIndex).toBe(1);
    expect(group.children[0]!.visible).toBe(true);
    expect(group.children[0]!.userData.auroraVfxCanonicalAoePhaseCounts).toEqual({
      impact: 1
    });

    expect(seekAuroraVfxCanonicalRuntimePlayback(group, 5)).toBe(true);
    expect(group.children).toHaveLength(1);
    expect(group.children[0]!.visible).toBe(false);
  });

  it("renders source-MDL lights carried by the canonical VFX payload", () => {
    const payload = createCanonicalPayload();
    payload.contracts.sourceMdlLights = [
      {
        nodeName: "glow_light",
        transform: { position: [1, 2, 3] },
        color: [0.25, 0.5, 1],
        radius: 6,
        multiplier: 2
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_test_texture", createTexture()]])
    });
    const light = group.getObjectByName("aurora_vfx_source_mdl_light:glow_light") as THREE.PointLight;

    expect(light).toBeInstanceOf(THREE.PointLight);
    expect(light.position.toArray()).toEqual([1, 2, 3]);
    expect(light.distance).toBe(24);
    expect(light.decay).toBe(1.25);
    expect(light.intensity).toBe(1);
    expect(light.color.toArray()).toEqual([0.25, 0.5, 1]);
    expect(["installed", "already-installed"]).toContain(
      light.userData.auroraVfxCanonicalSourceMdlLightFalloffRendererPatchStatus
    );
    expect(light.userData.auroraVfxCanonicalSourceMdlLightFalloffFormula).toBe(
      "x=(distance/effectiveRange)^2; x>=1 => 0; (1-x)/(maxIntensity^-2.2 + cutoff^2*(intensityAtRange^-2.2-maxIntensity^-2.2)*x)"
    );
    expect(light.userData.auroraVfxCanonicalSourceMdlLightFalloffRendererProofStatus).toBe(
      "retail-binary-and-shader-backed-enhanced-performance-point-light-falloff"
    );
    expect(light.userData.auroraVfxCanonicalSourceMdlLightFalloffRendererSource).toContain(
      "GetLightAdjustedColor/GetLightAdjustedRadius"
    );
    expect(light.userData.auroraVfxCanonicalSourceMdlLightSourceRadius).toBe(6);
    expect(light.userData.auroraVfxCanonicalSourceMdlLightSourceMultiplier).toBe(2);
    expect(light.userData.auroraVfxCanonicalSourceMdlLightEffectiveRange).toBe(24);
  });

  it("keeps ambient-only source-MDL lights localized to their native radius", () => {
    const payload = createCanonicalPayload();
    payload.contracts.sourceMdlLights = [
      {
        nodeName: "ambient_projectile_light",
        transform: { position: [1, 2, 3] },
        color: [0.419608, 0.705882, 0.925491],
        radius: 5,
        multiplier: 1.5,
        ambientOnly: true
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_test_texture", createTexture()]])
    });
    const light = group.getObjectByName(
      "aurora_vfx_source_mdl_light:ambient_projectile_light"
    ) as THREE.PointLight;
    const ambientLights: THREE.AmbientLight[] = [];
    group.traverse((node) => {
      if (node instanceof THREE.AmbientLight) {
        ambientLights.push(node);
      }
    });

    expect(light).toBeInstanceOf(THREE.PointLight);
    expect(ambientLights).toHaveLength(0);
    expect(light.position.toArray()).toEqual([1, 2, 3]);
    expect(light.distance).toBe(15);
    expect(light.decay).toBe(-1.25);
    expect(light.intensity).toBe(1);
    expect(light.userData.auroraVfxCanonicalSourceMdlLightAmbientOnly).toBe(true);
    expect(light.userData.auroraVfxCanonicalSourceMdlLightChannelMappingStatus).toBe(
      "source-backed-localized-ambient-irradiance-shaderchunk-adapter"
    );
    expect(light.userData.auroraVfxCanonicalSourceMdlLightChannelMappingSource).toContain(
      "FUN_00a4cd58"
    );
    expect(light.userData.auroraVfxCanonicalSourceMdlLightChannelMappingSource).toContain(
      "FUN_00a40b60"
    );
    expect(light.userData.auroraVfxCanonicalSourceMdlLightShaderChannelMarkerRole).toBe(
      "negative-decay-localized-ambient-marker"
    );
  });

  it("samples and blends source-MDL light animation tracks on the canonical source clock", () => {
    const payload = createCanonicalPayload();
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "fx_emit",
        selectedAnimation: {
          animationName: "pulse",
          previousTimeSeconds: 0,
          currentTimeSeconds: 0.5,
          blendWeight: 0.5
        },
        runtimeState: { sourceClockSeconds: 0.5 },
        renderContract: payload.contracts.renderContract
      }
    ];
    payload.contracts.sourceMdlLights = [
      {
        nodeName: "animated_light",
        transform: { position: [0, 0, 0] },
        color: [0, 0, 1],
        radius: 2,
        multiplier: 1,
        animations: [
          {
            animationName: "pulse",
            positionTimeline: [
              { time: 0, value: [0, 0, 0] },
              { time: 1, value: [4, 0, 0] }
            ],
            colorTimeline: [
              { time: 0, value: [0, 0, 1] },
              { time: 1, value: [1, 0, 0] }
            ],
            radiusTimeline: [
              { time: 0, value: 2 },
              { time: 1, value: 6 }
            ],
            multiplierTimeline: [
              { time: 0, value: 1 },
              { time: 1, value: 3 }
            ]
          }
        ]
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_test_texture", createTexture()]])
    });
    const light = group.getObjectByName(
      "aurora_vfx_source_mdl_light:animated_light"
    ) as THREE.PointLight;

    expect(light).toBeInstanceOf(THREE.PointLight);
    expect(light.position.toArray()).toEqual([1, 0, 0]);
    expect(light.color.toArray()).toEqual([0.25, 0, 0.75]);
    expect(light.distance).toBe(9);
    expect(light.intensity).toBe(1);
    expect(light.userData.auroraVfxCanonicalSourceMdlLightAnimation).toBe("pulse");
    expect(light.userData.auroraVfxCanonicalSourceMdlLightSampleTimeSeconds).toBe(0.5);
  });

  it("normalizes HDR source-MDL color and expands range from source data without asset identity", () => {
    const payload = createCanonicalPayload();
    payload.contracts.sourceMdlLights = [
      {
        nodeName: "arbitrary_light_node",
        transform: { position: [0, 0, 0] },
        color: [2, 1, 0.5],
        radius: 3,
        multiplier: 2
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_test_texture", createTexture()]])
    });
    const light = group.getObjectByName(
      "aurora_vfx_source_mdl_light:arbitrary_light_node"
    ) as THREE.PointLight;

    expect(light.color.toArray()).toEqual([1, 0.5, 0.25]);
    expect(light.distance).toBe(24);
    expect(light.intensity).toBe(1);
    expect(light.decay).toBe(1.25);
    expect(light.userData.auroraVfxCanonicalSourceMdlLightAdjustedColor).toEqual([
      1,
      0.5,
      0.25
    ]);
  });

  it("samples object-duration light phases and removes the released visual owner", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract;
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "DARK_Spot",
        runtimeFrames: [
          {
            timeSeconds: 0.15,
            selectedAnimation: {
              animationName: "impact",
              previousTimeSeconds: 0.05,
              currentTimeSeconds: 0.15,
              blendWeight: 1
            },
            objectDurationVisualOwner: {
              phase: "impact",
              active: true
            },
            runtimeState: { sourceClockSeconds: 0.15 },
            runtimeSnapshot: {},
            renderContract
          },
          {
            timeSeconds: 0.3,
            selectedAnimation: {
              animationName: "duration",
              previousTimeSeconds: 0,
              currentTimeSeconds: 0,
              blendWeight: 1,
              loop: true
            },
            objectDurationVisualOwner: {
              phase: "duration",
              active: true
            },
            runtimeState: { sourceClockSeconds: 0.3 },
            runtimeSnapshot: {},
            renderContract
          },
          {
            timeSeconds: 20.3166665,
            selectedAnimation: {
              animationName: "cessation",
              previousTimeSeconds: 0.2166665,
              currentTimeSeconds: 0.3166665,
              blendWeight: 1
            },
            objectDurationVisualOwner: {
              version: "aurora-object-duration-visual-owner/v2",
              phase: "cessation",
              active: true,
              effectRemovalStarted: true,
              sampledAtMilliseconds: 20_316.6665,
              updateStepMilliseconds: 16.666667,
              lastUpdateAtMilliseconds: 20_316.66707,
              ownerTimerRemainingMilliseconds: 317,
              postRemovalTimerRemainingMilliseconds: 3_317,
              removalProcessedAtMilliseconds: 20_000.0004
            },
            runtimeState: { sourceClockSeconds: 20.3166665 },
            runtimeSnapshot: {},
            renderContract
          },
          {
            timeSeconds: 20.633333,
            objectDurationVisualOwner: {
              phase: "released",
              active: false,
              effectRemovalStarted: true
            },
            runtimeState: { sourceClockSeconds: 20.633333 },
            runtimeSnapshot: {},
            renderContract
          }
        ],
        runtimeState: { sourceClockSeconds: 20.633333 },
        renderContract
      }
    ];
    payload.contracts.sourceMdlLights = [
      {
        nodeName: "Negitive_Light",
        color: [-1, -1, -1],
        radius: 0,
        multiplier: 8,
        ambientOnly: true,
        animations: [
          {
            animationName: "impact",
            radiusTimeline: [
              { time: 0, value: 0 },
              { time: 0.3, value: 5.5 }
            ]
          },
          {
            animationName: "duration",
            radiusTimeline: [
              { time: 0, value: 5.5 },
              { time: 0.833333, value: 6 },
              { time: 1.66667, value: 5.5 }
            ]
          },
          {
            animationName: "cessation",
            radiusTimeline: [
              { time: 0, value: 5.5 },
              { time: 0.633333, value: 0 }
            ]
          }
        ]
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_test_texture", createTexture()]])
    });
    const frameLights = group.children.map(
      (frame) =>
        frame.getObjectByName(
          "aurora_vfx_source_mdl_light:Negitive_Light"
        ) as THREE.PointLight | undefined
    );

    expect(frameLights[0]?.distance).toBeCloseTo(44, 5);
    expect(frameLights[1]?.distance).toBeCloseTo(88, 5);
    expect(frameLights[2]?.distance).toBeCloseTo(44, 4);
    expect(frameLights[3]).toBeUndefined();
    expect(
      group.children[3]?.userData.auroraVfxCanonicalRenderedDrawParticleCount
    ).toBe(0);
    expect(
      group.children[3]?.userData.auroraVfxCanonicalObjectDurationVisualOwnerPhase
    ).toBe("released");
    expect(
      group.children[2]?.userData
        .auroraVfxCanonicalObjectDurationVisualOwnerTimerRemainingMilliseconds
    ).toBe(317);
    expect(
      group.children[2]?.userData
        .auroraVfxCanonicalObjectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds
    ).toBe(3_317);
    expect(
      group.children[2]?.userData
        .auroraVfxCanonicalObjectDurationVisualOwnerRemovalProcessedAtMilliseconds
    ).toBeCloseTo(20_000.0004, 5);
    expect(
      group.children[2]?.userData
        .auroraVfxCanonicalObjectDurationVisualOwnerLastUpdateAtMilliseconds
    ).toBeCloseTo(20_316.66707, 5);
  });

  it("holds the final source-MDL light key through particle-tail playback frames", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract;
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "fx_emit",
        selectedAnimation: {
          animationName: "impact",
          previousTimeSeconds: 0,
          currentTimeSeconds: 2.63333,
          blendWeight: 1
        },
        runtimeFrames: [
          {
            timeSeconds: 1.96667,
            selectedAnimation: {
              animationName: "impact",
              previousTimeSeconds: 1.93333,
              currentTimeSeconds: 1.96667,
              blendWeight: 1
            },
            runtimeState: { sourceClockSeconds: 1.96667 },
            runtimeSnapshot: {},
            renderContract
          },
          {
            timeSeconds: 2,
            selectedAnimation: {
              animationName: "impact",
              previousTimeSeconds: 1.96667,
              currentTimeSeconds: 2,
              blendWeight: 1
            },
            runtimeState: { sourceClockSeconds: 2 },
            runtimeSnapshot: {},
            renderContract
          }
        ],
        runtimeState: { sourceClockSeconds: 2 },
        renderContract
      }
    ];
    payload.contracts.sourceMdlLights = [
      {
        nodeName: "flash",
        color: [0, 0.745098, 0.988235],
        radius: 5,
        multiplier: 1.6,
        animations: [
          {
            animationName: "impact",
            colorTimeline: [
              { time: 0, value: [0, 0.745098, 0.988235] },
              { time: 1.96667, value: [0, 0, 0] }
            ]
          }
        ]
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_test_texture", createTexture()]])
    });
    const frameLights = group.children.map(
      (frame) =>
        frame.getObjectByName("aurora_vfx_source_mdl_light:flash") as THREE.PointLight
    );

    expect(frameLights).toHaveLength(2);
    expect(frameLights[0]?.color.toArray()).toEqual([0, 0, 0]);
    expect(frameLights[1]?.color.toArray()).toEqual([0, 0, 0]);
  });

  it("moves source-MDL lights with a Type 10 owner without translating runtime particles", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract;
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "fx_emit",
        runtimeFrames: [
          {
            timeSeconds: 0,
            sourceOwnerTransform: {
              source: "progfx-type10-projectile-path4",
              position: [0, 0, 0],
              active: true
            },
            runtimeState: { sourceClockSeconds: 0 },
            runtimeSnapshot: {},
            renderContract
          },
          {
            timeSeconds: 1,
            sourceOwnerTransform: {
              source: "progfx-type10-projectile-path4",
              position: [3, 0, 0],
              active: true
            },
            runtimeState: { sourceClockSeconds: 1 },
            runtimeSnapshot: {},
            renderContract
          },
          {
            timeSeconds: 1.25,
            sourceOwnerTransform: {
              source: "progfx-type10-projectile-path4",
              position: [3, 0, 0],
              active: false
            },
            runtimeState: { sourceClockSeconds: 1.25 },
            runtimeSnapshot: {},
            renderContract
          }
        ],
        runtimeState: { sourceClockSeconds: 1 },
        renderContract
      }
    ];
    payload.contracts.sourceMdlLights = [
      {
        nodeName: "projectile_light",
        transform: { position: [1, 0, 0] },
        color: [1, 1, 1],
        radius: 2,
        multiplier: 1
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_test_texture", createTexture()]])
    });
    group.updateMatrixWorld(true);
    const frameLights = group.children.map(
      (frame) =>
        frame.getObjectByName(
          "aurora_vfx_source_mdl_light:projectile_light"
        ) as THREE.PointLight
    );

    expect(frameLights[0]?.getWorldPosition(new THREE.Vector3()).x).toBeCloseTo(1, 10);
    expect(frameLights[1]?.getWorldPosition(new THREE.Vector3()).x).toBeCloseTo(4, 10);
    expect(frameLights[2]).toBeUndefined();
    expect(group.children.map((frame) => frame.position.x)).toEqual([0, 0, 0]);
    expect(frameLights[1]?.userData.auroraVfxCanonicalSourceOwnerTransformApplied).toBe(true);
  });

  it("applies source-MDL ancestor transforms once while preserving emitter-local runtime positions", () => {
    const payload = createCanonicalPayload();
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "fx_emit",
        runtimeState: { sourceClockSeconds: 0.5 },
        renderContract: payload.contracts.renderContract
      }
    ];
    payload.contracts.sourceMdlLights = [
      {
        nodeName: "glow_light",
        parentNodeName: "vfx_pivot",
        transform: { position: [1, 0, 0] },
        color: [1, 1, 1],
        radius: 2,
        multiplier: 1
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      modelGraph: {
        nodes: [
          {
            nodeKind: "transform",
            nodeName: "vfx_pivot",
            transform: {
              position: [2, 3, 0],
              positionTimeline: [
                { time: 0, value: [2, 3, 0] },
                { time: 1, value: [6, 3, 0] }
              ],
              orientation: { axis: [0, 0, 1], angleRadians: Math.PI / 2 },
              scale: 2
            }
          },
          {
            nodeKind: "emitter",
            nodeName: "fx_emit",
            parentNodeName: "vfx_pivot",
            transform: { position: [9, 9, 9] }
          },
          {
            nodeKind: "light",
            nodeName: "glow_light",
            parentNodeName: "vfx_pivot"
          }
        ]
      }
    });
    group.updateMatrixWorld(true);
    const [mesh] = collectCanonicalDrawMeshes(group);
    const light = group.getObjectByName("aurora_vfx_source_mdl_light:glow_light") as THREE.PointLight;

    expect(mesh.parent?.name).toBe("aurora_vfx_model_graph_node:vfx_pivot");
    expect(mesh.parent?.parent?.name).toBe("aurora_vfx_model_graph_root");
    const worldLightPosition = light.getWorldPosition(new THREE.Vector3());
    expect(worldLightPosition.x).toBeCloseTo(4, 10);
    expect(worldLightPosition.y).toBeCloseTo(5, 10);
    expect(worldLightPosition.z).toBeCloseTo(0, 10);
  });

  it("uses one Aurora Z-up transform for model nodes and source-MDL lights", () => {
    const payload = createCanonicalPayload();
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "fx_emit",
        runtimeState: { sourceClockSeconds: 0 },
        renderContract: payload.contracts.renderContract
      }
    ];
    payload.contracts.sourceMdlLights = [
      {
        nodeName: "aurora_light",
        parentNodeName: "vfx_pivot",
        transform: { position: [0, 4, 5] },
        color: [1, 1, 1],
        radius: 2,
        multiplier: 1
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      sourceCoordinateSpace: "aurora-z-up",
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      modelGraph: {
        nodes: [
          {
            nodeKind: "transform",
            nodeName: "vfx_pivot",
            transform: {
              position: [1, 2, 3],
              orientation: { axis: [0, 1, 0], angleRadians: Math.PI / 2 }
            }
          },
          {
            nodeKind: "emitter",
            nodeName: "fx_emit",
            parentNodeName: "vfx_pivot"
          },
          {
            nodeKind: "light",
            nodeName: "aurora_light",
            parentNodeName: "vfx_pivot"
          }
        ]
      }
    });

    const pivot = group.getObjectByName("aurora_vfx_model_graph_node:vfx_pivot") as THREE.Group;
    const light = group.getObjectByName("aurora_vfx_source_mdl_light:aurora_light") as THREE.PointLight;
    const expected = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, -1),
      Math.PI / 2
    );

    expect(pivot.position.toArray()).toEqual([1, 3, 2]);
    expect(pivot.quaternion.x).toBeCloseTo(expected.x, 10);
    expect(pivot.quaternion.y).toBeCloseTo(expected.y, 10);
    expect(pivot.quaternion.z).toBeCloseTo(expected.z, 10);
    expect(pivot.quaternion.w).toBeCloseTo(expected.w, 10);
    expect(light.position.toArray()).toEqual([0, 5, 4]);
  });

  it("selects and blends source-animation wrapper tracks for canonical graph parents", () => {
    const payload = createCanonicalPayload();
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "fx_emit",
        selectedAnimation: {
          animationName: "rise",
          previousTimeSeconds: 0,
          currentTimeSeconds: 0.5,
          blendWeight: 0.5
        },
        runtimeState: { sourceClockSeconds: 0.5 },
        renderContract: payload.contracts.renderContract
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      modelGraph: {
        nodes: [
          {
            nodeKind: "transform",
            nodeName: "vfx_pivot",
            transform: { position: [2, 3, 0] },
            animationTracks: [
              {
                animationName: "rise",
                lengthSeconds: 1,
                transitionSeconds: 0.25,
                transform: {
                  positionTimeline: [
                    { time: 0, value: [6, 3, 0] },
                    { time: 1, value: [10, 3, 0] }
                  ]
                }
              }
            ]
          },
          {
            nodeKind: "emitter",
            nodeName: "fx_emit",
            parentNodeName: "vfx_pivot"
          }
        ]
      }
    });

    const pivot = group.getObjectByName("aurora_vfx_model_graph_node:vfx_pivot") as THREE.Group;
    expect(pivot.position.toArray()).toEqual([5, 3, 0]);
  });

  it("attaches source-MDL static geometry to its animated canonical graph node without applying the bind pose twice", () => {
    const payload = createCanonicalPayload();
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "meteor_smoke",
        selectedAnimation: {
          animationName: "impact",
          previousTimeSeconds: 0,
          currentTimeSeconds: 0.5,
          blendWeight: 1
        },
        runtimeState: { sourceClockSeconds: 0.5 },
        renderContract: payload.contracts.renderContract
      }
    ];
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    // The Aurora MDL converter preserves the source node offset in GLB vertices.
    geometry.translate(2, 4, 3);
    const material = new THREE.MeshStandardMaterial({ color: "#ffffff" });
    material.userData = {
      aurora: {
        textureReference: "chunk64",
        material: {
          format: "aurora-mdl-material",
          ambient: [0.25, 0.5, 0.75],
          diffuse: [0.5, 0.5, 0.5]
        }
      }
    };
    const sourceMesh = new THREE.Mesh(geometry, material);
    sourceMesh.name = "RockLarg";
    sourceMesh.userData = {
      aurora: { sourceMesh: "RockLarg", sourceNodeType: "trimesh" }
    };
    const sourceModel = new THREE.Group();
    const nonMeshMaterial = new THREE.MeshStandardMaterial();
    nonMeshMaterial.userData = {
      aurora: {
        material: {
          format: "aurora-mdl-material",
          ambient: [0.25, 0.25, 0.25],
          diffuse: [0.5, 0.5, 0.5]
        }
      }
    };
    const nonMeshNode = new THREE.Points(
      new THREE.BufferGeometry(),
      nonMeshMaterial as unknown as THREE.PointsMaterial
    );
    sourceModel.add(sourceMesh, nonMeshNode);
    const sourceTexture = createTexture();

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      sourceCoordinateSpace: "aurora-z-up",
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      sourceModel,
      sourceModelTexturesByReference: new Map([["chunk64", sourceTexture]]),
      modelGraph: {
        nodes: [
          {
            nodeKind: "static-geometry",
            nodeName: "RockLarg",
            transform: { position: [2, 3, 4] },
            animationTracks: [
              {
                animationName: "impact",
                lengthSeconds: 1,
                transform: {
                  positionTimeline: [
                    { time: 0, value: [2, 3, 4] },
                    { time: 1, value: [6, 3, 4] }
                  ]
                }
              }
            ]
          },
          {
            nodeKind: "emitter",
            nodeName: "meteor_smoke",
            parentNodeName: "RockLarg"
          }
        ]
      }
    });

    group.updateMatrixWorld(true);
    const geometryNode = group.getObjectByName(
      "aurora_vfx_source_model_geometry:RockLarg"
    ) as THREE.Mesh;
    geometryNode.geometry.computeBoundingBox();
    const worldCenter = geometryNode.localToWorld(
      geometryNode.geometry.boundingBox!.getCenter(new THREE.Vector3())
    );

    expect(geometryNode.parent?.name).toBe(
      "aurora_vfx_model_graph_node:RockLarg"
    );
    expect(worldCenter.x).toBeCloseTo(4, 6);
    expect(worldCenter.y).toBeCloseTo(4, 6);
    expect(worldCenter.z).toBeCloseTo(3, 6);
    expect(
      geometryNode.userData.auroraVfxCanonicalSourceModelMaterialBindingStatus
    ).toBe("source-reference-bound");
    expect(geometryNode.userData).toMatchObject({
      auroraVfxRenderer: "canonical",
      auroraVfxCanonicalSourceModelGeometry: true,
      auroraVfxCanonicalSourceModelNodeName: "RockLarg",
      auroraVfxCanonicalSourceModelBindPosePositionCompensated: true,
      auroraVfxCanonicalSourceModelMaterialResolvedReferences: ["chunk64"],
      auroraVfxCanonicalSourceModelMaterialUnresolvedReferences: [],
      auroraVfxRetailParityProof: false
    });
    const boundTexture = (geometryNode.material as THREE.MeshStandardMaterial)
      .map!;
    expect(boundTexture).toBeDefined();
    expect(boundTexture).not.toBe(sourceTexture);
    expect(boundTexture.image).toBe(sourceTexture.image);
    expect(boundTexture.flipY).toBe(false);
    expect(geometryNode.material).not.toBe(material);
    expect(material.map).toBeNull();
    expect(geometryNode.material.userData).toMatchObject({
      auroraVfxCanonicalChunkModelSourceMaterialLightingInstalled: true,
      auroraVfxCanonicalChunkModelAmbientToDiffuse: [0.217638, 1, 2.440061]
    });
    expect(
      nonMeshMaterial.userData
        .auroraVfxCanonicalChunkModelSourceMaterialLightingInstalled
    ).toBeUndefined();
    expect(
      group.getObjectByName("aurora_vfx_model_graph_root")?.userData
    ).toMatchObject({
      auroraVfxCanonicalSourceModelGeometryStatus: "source-graph-bound",
      auroraVfxCanonicalSourceModelGeometryCount: 1,
      auroraVfxCanonicalSourceModelGeometryUnresolvedCount: 0,
      auroraVfxRetailParityProof: false
    });
  });

  it.each(["arbitrary_sheet_a", "unrelated_sheet_q7"])(
    "applies source-model TXI material behavior without selecting by asset identity for %s",
    (textureReference) => {
      const payload = createCanonicalPayload();
      const sourceMaterial = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        opacity: 1
      });
      sourceMaterial.userData = {
        aurora: {
          textureReference,
          material: {
            format: "aurora-mdl-material",
            ambient: [0.2, 0.2, 0.2],
            diffuse: [0.8, 0.8, 0.8]
          }
        }
      };
      sourceMaterial.side = THREE.FrontSide;
      const sourceMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        sourceMaterial
      );
      sourceMesh.name = "arbitrary_geometry";
      sourceMesh.userData = {
        aurora: { sourceMesh: "arbitrary_geometry", sourceNodeType: "trimesh" }
      };
      const sourceModel = new THREE.Group();
      sourceModel.add(sourceMesh);
      const sourceTexture = createTexture();

      const group = createAuroraVfxCanonicalRenderGroup(payload, {
        particleTexturesByReference: new Map([
          ["fx_canonical_fire", createTexture()]
        ]),
        sourceModel,
        sourceModelTexturesByReference: new Map([
          [textureReference, sourceTexture]
        ]),
        sourceModelTextureBindings: [
          {
            reference: textureReference,
            assetId: "arbitrary-texture-asset",
            fileName: "arbitrary_sheet.tga",
            objectKey: "arbitrary/arbitrary_sheet.tga",
            deliveryUrl: "/arbitrary/arbitrary_sheet.tga",
            txi: {
              blending: "additive",
              decal: true,
              proceduretype: "cycle",
              numx: 8,
              numy: 2,
              fps: 24
            }
          }
        ],
        modelGraph: {
          nodes: [
            {
              nodeKind: "static-geometry",
              nodeName: "arbitrary_geometry",
              meshMaterialState: { alpha: 0.5 }
            }
          ]
        }
      });

      const renderedMesh = group.getObjectByName(
        "aurora_vfx_source_model_geometry:arbitrary_geometry"
      ) as THREE.Mesh;
      const renderedMaterial =
        renderedMesh.material as THREE.MeshStandardMaterial;

      expect(renderedMaterial).not.toBe(sourceMaterial);
      expect(renderedMaterial.transparent).toBe(true);
      expect(renderedMaterial.depthWrite).toBe(false);
      expect(renderedMaterial.side).toBe(THREE.FrontSide);
      expect(renderedMaterial.blending).toBe(THREE.AdditiveBlending);
      expect(renderedMaterial.opacity).toBeCloseTo(0.5, 8);
      expect(renderedMaterial.userData).toMatchObject({
        auroraTextureTxiReference: textureReference,
        auroraTextureTxiBlending: "additive",
        auroraTextureTxiDecal: true,
        auroraTextureTxiProcedureType: "cycle",
        auroraTextureTxiCycleActive: true,
        auroraTextureTxiCycleFrameCount: 16,
        auroraTxiDecalLightingStatus: "source-txi-decal-unlit-white"
      });
      expect(
        renderedMaterial.userData.auroraMdlMaterialLightingInstalled
      ).toBeUndefined();
      expect(group.userData).toMatchObject({
        auroraVfxCanonicalTextureCycleStatus: "active"
      });
      expect(sourceMaterial.transparent).toBe(false);
      expect(sourceMaterial.depthWrite).toBe(true);
      expect(sourceMaterial.blending).toBe(THREE.NormalBlending);
    }
  );

  it("removes the complete baked parent-child bind transform before attaching source geometry to the live graph", () => {
    const payload = createCanonicalPayload();
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "arbitrary_emitter",
        selectedAnimation: {
          animationName: "arbitrary_motion",
          previousTimeSeconds: 0,
          currentTimeSeconds: 0.5,
          blendWeight: 1
        },
        runtimeState: { sourceClockSeconds: 0.5 },
        renderContract: payload.contracts.renderContract
      }
    ];

    const parentBind = new THREE.Matrix4().compose(
      new THREE.Vector3(10, 0, 0),
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        Math.PI / 2
      ),
      new THREE.Vector3(2, 2, 2)
    );
    const childBind = new THREE.Matrix4().compose(
      new THREE.Vector3(0, 3, 0),
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 4
      ),
      new THREE.Vector3(0.5, 0.5, 0.5)
    );
    const bakedWorld = parentBind.clone().multiply(childBind);
    const geometry = new THREE.BoxGeometry(0.4, 0.6, 0.8);
    geometry.applyMatrix4(bakedWorld);
    const sourceMesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: "#ffffff" })
    );
    sourceMesh.name = "arbitrary_child";
    sourceMesh.userData = {
      aurora: { sourceMesh: "arbitrary_child", sourceNodeType: "trimesh" }
    };
    const parentGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    parentGeometry.applyMatrix4(parentBind);
    const parentSourceMesh = new THREE.Mesh(
      parentGeometry,
      new THREE.MeshStandardMaterial({ color: "#ffffff" })
    );
    parentSourceMesh.name = "arbitrary_parent";
    parentSourceMesh.userData = {
      aurora: { sourceMesh: "arbitrary_parent", sourceNodeType: "trimesh" }
    };
    const sourceModel = new THREE.Group();
    sourceModel.add(parentSourceMesh, sourceMesh);

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      sourceCoordinateSpace: "three-y-up",
      particleTexturesByReference: new Map([
        ["fx_canonical_fire", createTexture()]
      ]),
      sourceModel,
      modelGraph: {
        nodes: [
          {
            nodeKind: "transform",
            nodeName: "arbitrary_parent",
            transform: {
              position: [10, 0, 0],
              orientation: {
                axis: [0, 0, 1],
                angleRadians: Math.PI / 2
              },
              scale: 2
            },
            animationTracks: [
              {
                animationName: "arbitrary_motion",
                lengthSeconds: 1,
                transform: {
                  positionTimeline: [
                    { time: 0, value: [10, 0, 0] },
                    { time: 1, value: [14, 0, 0] }
                  ]
                }
              }
            ]
          },
          {
            nodeKind: "static-geometry",
            nodeName: "arbitrary_child",
            parentNodeName: "arbitrary_parent",
            transform: {
              position: [0, 3, 0],
              orientation: {
                axis: [1, 0, 0],
                angleRadians: Math.PI / 4
              },
              scale: 0.5
            }
          },
          {
            nodeKind: "emitter",
            nodeName: "arbitrary_emitter",
            parentNodeName: "arbitrary_child"
          }
        ]
      }
    });

    group.updateMatrixWorld(true);
    const renderedMesh = group.getObjectByName(
      "aurora_vfx_source_model_geometry:arbitrary_child"
    ) as THREE.Mesh;
    renderedMesh.geometry.computeBoundingBox();
    const worldCenter = renderedMesh.localToWorld(
      renderedMesh.geometry.boundingBox!.getCenter(new THREE.Vector3())
    );
    const expectedCenter = new THREE.Vector3(0, 0, 0)
      .applyMatrix4(bakedWorld)
      .add(new THREE.Vector3(2, 0, 0));
    const renderedParentMesh = group.getObjectByName(
      "aurora_vfx_source_model_geometry:arbitrary_parent"
    ) as THREE.Mesh;
    renderedParentMesh.geometry.computeBoundingBox();
    const parentWorldCenter = renderedParentMesh.localToWorld(
      renderedParentMesh.geometry.boundingBox!.getCenter(new THREE.Vector3())
    );

    expect(worldCenter.x).toBeCloseTo(expectedCenter.x, 6);
    expect(worldCenter.y).toBeCloseTo(expectedCenter.y, 6);
    expect(worldCenter.z).toBeCloseTo(expectedCenter.z, 6);
    expect(parentWorldCenter.x).toBeCloseTo(12, 6);
    expect(parentWorldCenter.y).toBeCloseTo(0, 6);
    expect(parentWorldCenter.z).toBeCloseTo(0, 6);
    expect(renderedMesh.userData).toMatchObject({
      auroraVfxCanonicalSourceModelBindPoseWorldTransformCompensated: true
    });
  });

  it.each(["renamed_mesh_a", "unrelated_geometry_q7"])(
    "evaluates identity-neutral mesh-alpha animation on isolated source materials for %s",
    (nodeName) => {
      const payload = createCanonicalPayload();
      payload.contracts.runtimeEmitters = [
        {
          emitterNodeName: "arbitrary_emitter",
          selectedAnimation: {
            animationName: "arbitrary_motion",
            previousTimeSeconds: 0,
            currentTimeSeconds: 0.5,
            blendWeight: 1
          },
          runtimeState: { sourceClockSeconds: 0.5 },
          renderContract: payload.contracts.renderContract
        }
      ];
      const sourceMaterial = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        opacity: 1
      });
      const sourceMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        sourceMaterial
      );
      sourceMesh.name = nodeName;
      sourceMesh.userData = { aurora: { sourceMesh: nodeName } };
      const sourceModel = new THREE.Group();
      sourceModel.add(sourceMesh);

      const group = createAuroraVfxCanonicalRenderGroup(payload, {
        particleTexturesByReference: new Map([
          ["fx_canonical_fire", createTexture()]
        ]),
        sourceModel,
        modelGraph: {
          nodes: [
            {
              nodeKind: "static-geometry",
              nodeName,
              meshMaterialState: { alpha: 1 },
              meshMaterialAnimationTracks: [
                {
                  animationName: "arbitrary_motion",
                  lengthSeconds: 1,
                  state: {
                    alphaTimeline: [
                      { time: 0, value: 1 },
                      { time: 1, value: 0 }
                    ]
                  }
                }
              ]
            },
            {
              nodeKind: "emitter",
              nodeName: "arbitrary_emitter",
              parentNodeName: nodeName
            }
          ]
        }
      });

      const renderedMesh = group.getObjectByName(
        `aurora_vfx_source_model_geometry:${nodeName}`
      ) as THREE.Mesh;
      const renderedMaterial = renderedMesh.material as THREE.MeshStandardMaterial;

      expect(renderedMaterial).not.toBe(sourceMaterial);
      expect(renderedMaterial.opacity).toBeCloseTo(0.5, 8);
      expect(renderedMaterial.transparent).toBe(true);
      expect(renderedMesh.userData).toMatchObject({
        auroraVfxCanonicalSourceModelMeshAlpha: 0.5,
        auroraVfxCanonicalSourceModelMeshAlphaAnimation: "arbitrary_motion",
        auroraVfxCanonicalSourceModelMeshAlphaStatus: "animation-track-applied"
      });
      expect(sourceMaterial.opacity).toBe(1);
      expect(sourceMaterial.transparent).toBe(false);
    }
  );

  it("isolates per-node source materials before applying different mesh-alpha tracks", () => {
    const payload = createCanonicalPayload();
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "shared_material_emitter",
        selectedAnimation: {
          animationName: "shared_material_motion",
          previousTimeSeconds: 0,
          currentTimeSeconds: 0.5,
          blendWeight: 1
        },
        runtimeState: { sourceClockSeconds: 0.5 },
        renderContract: payload.contracts.renderContract
      }
    ];
    const sharedMaterial = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      opacity: 1
    });
    const firstSourceMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      sharedMaterial
    );
    firstSourceMesh.name = "shared_alpha_first";
    firstSourceMesh.userData = { aurora: { sourceMesh: firstSourceMesh.name } };
    const secondSourceMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      sharedMaterial
    );
    secondSourceMesh.name = "shared_alpha_second";
    secondSourceMesh.userData = { aurora: { sourceMesh: secondSourceMesh.name } };
    const sourceModel = new THREE.Group();
    sourceModel.add(firstSourceMesh, secondSourceMesh);

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([
        ["fx_canonical_fire", createTexture()]
      ]),
      sourceModel,
      modelGraph: {
        nodes: [
          {
            nodeKind: "static-geometry",
            nodeName: firstSourceMesh.name,
            meshMaterialState: { alpha: 1 },
            meshMaterialAnimationTracks: [
              {
                animationName: "shared_material_motion",
                lengthSeconds: 1,
                state: { alphaTimeline: [{ time: 0, value: 1 }] }
              }
            ]
          },
          {
            nodeKind: "static-geometry",
            nodeName: secondSourceMesh.name,
            meshMaterialState: { alpha: 1 },
            meshMaterialAnimationTracks: [
              {
                animationName: "shared_material_motion",
                lengthSeconds: 1,
                state: { alphaTimeline: [{ time: 0, value: 0 }] }
              }
            ]
          },
          {
            nodeKind: "emitter",
            nodeName: "shared_material_emitter",
            parentNodeName: firstSourceMesh.name
          }
        ]
      }
    });

    const firstRenderedMesh = group.getObjectByName(
      `aurora_vfx_source_model_geometry:${firstSourceMesh.name}`
    ) as THREE.Mesh;
    const secondRenderedMesh = group.getObjectByName(
      `aurora_vfx_source_model_geometry:${secondSourceMesh.name}`
    ) as THREE.Mesh;
    const firstMaterial = firstRenderedMesh.material as THREE.Material;
    const secondMaterial = secondRenderedMesh.material as THREE.Material;

    expect(firstMaterial).not.toBe(secondMaterial);
    expect(firstMaterial.opacity).toBe(1);
    expect(secondMaterial.opacity).toBe(0);
    expect(firstMaterial.userData.auroraVfxCanonicalMeshAlpha).toBe(1);
    expect(secondMaterial.userData.auroraVfxCanonicalMeshAlpha).toBe(0);
  });

  it("accepts a source model without a model graph as an explicit no-op", () => {
    const payload = createCanonicalPayload();
    const sourceModel = new THREE.Group();
    sourceModel.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshBasicMaterial()
      )
    );

    expect(() =>
      createAuroraVfxCanonicalRenderGroup(payload, {
        particleTexturesByReference: new Map([
          ["fx_canonical_fire", createTexture()]
        ]),
        sourceModel
      })
    ).not.toThrow();
  });

  it("binds source geometry by the GLB mesh-name fallback and records an absent material reference", () => {
    const payload = createCanonicalPayload();
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const sourceMesh = new THREE.Mesh(geometry, material);
    sourceMesh.name = "  FallbackNode  ";
    const sourceModel = new THREE.Group();
    sourceModel.add(sourceMesh);

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([
        ["fx_canonical_fire", createTexture()]
      ]),
      sourceModel,
      modelGraph: {
        nodes: [{ nodeKind: "static-geometry", nodeName: "fallbacknode" }]
      }
    });
    const geometryNode = group.getObjectByName(
      "aurora_vfx_source_model_geometry:  FallbackNode  "
    ) as THREE.Mesh;

    expect(geometryNode).toBeDefined();
    expect(geometryNode.parent?.name).toBe(
      "aurora_vfx_model_graph_node:fallbacknode"
    );
    expect(geometryNode.userData).toMatchObject({
      auroraVfxCanonicalSourceModelBindPosePositionCompensated: false,
      auroraVfxCanonicalSourceModelMaterialBindingStatus:
        "source-reference-absent",
      auroraVfxCanonicalSourceModelMaterialResolvedReferences: [],
      auroraVfxCanonicalSourceModelMaterialUnresolvedReferences: [],
      auroraVfxRetailParityProof: false
    });
    expect((geometryNode.material as THREE.MeshBasicMaterial).map).toBeNull();
    expect(
      group.getObjectByName("aurora_vfx_model_graph_root")?.userData
    ).toMatchObject({
      auroraVfxCanonicalSourceModelGeometryStatus: "source-graph-bound",
      auroraVfxCanonicalSourceModelGeometryCount: 1,
      auroraVfxCanonicalSourceModelGeometryUnresolvedCount: 0
    });
  });

  it("records unresolved source geometry instead of attaching it to the wrong graph node", () => {
    const payload = createCanonicalPayload();
    const sourceMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshBasicMaterial()
    );
    sourceMesh.name = "MissingNode";
    const sourceModel = new THREE.Group();
    sourceModel.add(sourceMesh);

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([
        ["fx_canonical_fire", createTexture()]
      ]),
      sourceModel,
      modelGraph: {
        nodes: [{ nodeKind: "static-geometry", nodeName: "ExpectedNode" }]
      }
    });

    expect(
      group.getObjectByName("aurora_vfx_source_model_geometry:MissingNode")
    ).toBeUndefined();
    expect(
      group.getObjectByName("aurora_vfx_model_graph_root")?.userData
    ).toMatchObject({
      auroraVfxCanonicalSourceModelGeometryStatus:
        "source-graph-partially-bound",
      auroraVfxCanonicalSourceModelGeometryCount: 0,
      auroraVfxCanonicalSourceModelGeometryUnresolvedCount: 1,
      auroraVfxRetailParityProof: false
    });
  });

  it.each([
    {
      name: "unresolved",
      materialReferences: ["missing"],
      textures: [] as Array<[string, THREE.Texture]>,
      expectedStatus: "source-reference-unresolved",
      expectedResolved: [] as string[],
      expectedUnresolved: ["missing"]
    },
    {
      name: "partially bound",
      materialReferences: ["bound", "missing"],
      textures: [["bound", createTexture()]] as Array<[string, THREE.Texture]>,
      expectedStatus: "source-reference-partially-bound",
      expectedResolved: ["bound"],
      expectedUnresolved: ["missing"]
    }
  ])(
    "records $name source-model material references without a generic fallback",
    ({
      materialReferences,
      textures,
      expectedStatus,
      expectedResolved,
      expectedUnresolved
    }) => {
      const payload = createCanonicalPayload();
      const materials = materialReferences.map((textureReference) => {
        const material = new THREE.MeshBasicMaterial();
        material.userData = { aurora: { textureReference } };
        return material;
      });
      const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      geometry.clearGroups();
      materials.forEach((_material, index) => {
        geometry.addGroup(0, geometry.index!.count, index);
      });
      const sourceMesh = new THREE.Mesh(geometry, materials);
      sourceMesh.name = "MaterialNode";
      const sourceModel = new THREE.Group();
      sourceModel.add(sourceMesh);

      const group = createAuroraVfxCanonicalRenderGroup(payload, {
        particleTexturesByReference: new Map([
          ["fx_canonical_fire", createTexture()]
        ]),
        sourceModel,
        sourceModelTexturesByReference: new Map(textures),
        modelGraph: {
          nodes: [{ nodeKind: "static-geometry", nodeName: "MaterialNode" }]
        }
      });
      const geometryNode = group.getObjectByName(
        "aurora_vfx_source_model_geometry:MaterialNode"
      ) as THREE.Mesh;

      expect(geometryNode.userData).toMatchObject({
        auroraVfxCanonicalSourceModelMaterialBindingStatus: expectedStatus,
        auroraVfxCanonicalSourceModelMaterialResolvedReferences:
          expectedResolved,
        auroraVfxCanonicalSourceModelMaterialUnresolvedReferences:
          expectedUnresolved
      });
    }
  );

  it("evaluates Aurora Bezier tangent rows on canonical graph transforms", () => {
    const payload = createCanonicalPayload();
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "fx_emit",
        runtimeState: { sourceClockSeconds: 0.5 },
        renderContract: payload.contracts.renderContract
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      modelGraph: {
        nodes: [
          {
            nodeKind: "transform",
            nodeName: "vfx_pivot",
            transform: {
              positionTimeline: [
                {
                  time: 0,
                  value: [0, 0, 0],
                  interpolation: "bezier",
                  bezierIncomingTangent: [0, 0, 0],
                  bezierOutgoingTangent: [8, 0, 0]
                },
                {
                  time: 1,
                  value: [10, 0, 0],
                  interpolation: "bezier",
                  bezierIncomingTangent: [0, 0, 0],
                  bezierOutgoingTangent: [0, 0, 0]
                }
              ]
            }
          },
          {
            nodeKind: "emitter",
            nodeName: "fx_emit",
            parentNodeName: "vfx_pivot"
          }
        ]
      }
    });

    const pivot = group.getObjectByName("aurora_vfx_model_graph_node:vfx_pivot") as THREE.Group;
    expect(pivot.position.toArray()).toEqual([8, 0, 0]);
  });

  it("keeps direct orientation when an Aurora orientation Bezier track is present", () => {
    const payload = createCanonicalPayload();
    payload.contracts.runtimeEmitters = [
      {
        emitterNodeName: "fx_emit",
        runtimeState: { sourceClockSeconds: 0 },
        renderContract: payload.contracts.renderContract
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      modelGraph: {
        nodes: [
          {
            nodeKind: "transform",
            nodeName: "vfx_pivot",
            transform: {
              orientation: { axis: [0, 0, 1], angleRadians: 0.25 },
              orientationTimeline: [
                {
                  time: 0,
                  value: { axis: [0, 1, 0], angleRadians: Math.PI / 2 },
                  interpolation: "bezier"
                },
                {
                  time: 1,
                  value: { axis: [0, 1, 0], angleRadians: Math.PI },
                  interpolation: "bezier"
                }
              ]
            }
          },
          {
            nodeKind: "emitter",
            nodeName: "fx_emit",
            parentNodeName: "vfx_pivot"
          }
        ]
      }
    });

    const pivot = group.getObjectByName("aurora_vfx_model_graph_node:vfx_pivot") as THREE.Group;
    expect(pivot.rotation.z).toBeCloseTo(0.25, 10);
    expect(pivot.rotation.y).toBeCloseTo(0, 10);
  });

  it("renders nonblank canonical textured draw records without using preview roles", () => {
    const payload = createCanonicalPayload();
    const texture = createTexture();
    texture.colorSpace = THREE.SRGBColorSpace;
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", texture]])
    });

    expect(isCanonicalAuroraVfxRenderablePayload(payload)).toBe(true);
    expect(resolveAuroraVfxCanonicalTextureReference(payload)).toBe("fx_canonical_fire");
    expect(group.userData.auroraVfxRenderer).toBe("canonical");
    expect(group.userData.auroraVfxCanonicalRenderer).toBe(true);
    expect(group.userData.auroraVfxRendererEligibility).toBe("source_backed");
    expect(group.userData.auroraVfxRetailParityStatus).toBe("blocked");
    expect(group.userData.auroraVfxRetailParityPromoted).toBe(false);
    expect(group.userData.auroraVfxLegacyCanonicalLabelNonRetail).toBe(true);
    expect(group.userData.auroraVfxPreviewRenderer).toBe(false);
    expect(group.userData.vfxPreviewRole).toBeUndefined();
    expect(group.userData.auroraVfxCanonicalParticleCount).toBe(2);
    expect(group.userData.auroraVfxCanonicalDrawParticleCount).toBe(2);
    expect(group.userData.auroraVfxCanonicalRenderedDrawParticleCount).toBe(2);
    expect(group.userData.auroraVfxCanonicalDrawVertexCount).toBe(12);
    expect(group.userData.auroraVfxCanonicalRenderedVertexCount).toBe(12);
    expect(group.userData.auroraVfxCanonicalRenderedBoundsWidth).toBeCloseTo(0.8, 5);
    expect(group.userData.auroraVfxCanonicalRenderedBoundsHeight).toBeCloseTo(0.6, 5);
    expect(group.userData.auroraVfxCanonicalRenderedBoundsDepth).toBe(0);
    expect(group.userData.auroraVfxCanonicalRenderedBoundsCenterX).toBeCloseTo(0.3, 5);
    expect(group.userData.auroraVfxCanonicalRenderedBoundsCenterY).toBeCloseTo(0.2, 5);
    expect(group.userData.auroraVfxCanonicalDrawRecordIds).toEqual(["draw:0", "draw:1"]);
    expect(group.userData.auroraVfxCanonicalEmitterNodeNames).toEqual(["fx_emit", "fx_emit"]);
    expect(group.userData.auroraVfxCanonicalDrawRecordLanes).toEqual([
      "textured_quad",
      "textured_quad"
    ]);
    expect(group.userData.auroraVfxCanonicalParticleIds).toEqual([10, 11]);
    expect(group.userData.auroraVfxCanonicalParticleIndexes).toEqual([0, 1]);
    expect(group.userData.auroraVfxCanonicalRotationRadians).toEqual([0, 0]);
    expect(group.userData.auroraVfxCanonicalInheritedVelocityMagnitude).toEqual([4, 0]);
    expect(group.userData.auroraVfxCanonicalInheritedVelocityDirectionX).toEqual([1, 0]);
    expect(group.userData.auroraVfxCanonicalInheritPart).toEqual([true, false]);
    expect(group.userData.auroraVfxCanonicalRecordVerticesPerParticle).toEqual([6, 6]);
    expect(group.userData.auroraVfxCanonicalAtlasFrames).toEqual([6, 2]);
    expect(group.userData.auroraVfxCanonicalRenderMode).toBe("billboard_to_world_z");
    expect(group.userData.auroraVfxCanonicalBlendMode).toBe("normal");
    expect(group.userData.auroraVfxCanonicalMaterialMapBound).toBe(true);
    expect(group.userData.auroraVfxCanonicalMaterialMapReference).toBe("fx_canonical_fire");
    expect(group.userData.auroraVfxCanonicalMaterialDepthTest).toBe(true);
    expect(group.userData.auroraVfxCanonicalMaterialOpacity).toBe(1);
    expect(group.userData.auroraVfxCanonicalMaterialColorHex).toBe("#ffffff");
    expect(group.userData.auroraVfxCanonicalMaterialVertexColors).toBe(true);
    expect(group.userData.auroraVfxCanonicalMaterialSide).toBe("FrontSide");
    expect(group.userData.auroraVfxRetailParityProof).toBe(false);

    const [mesh] = collectCanonicalDrawMeshes(group);
    expect(mesh).toBeDefined();
    expect(mesh!.userData.auroraVfxCanonicalTextureReference).toBe("fx_canonical_fire");
    expect(mesh!.userData.auroraVfxCanonicalMaterialMapBound).toBe(true);
    expect(mesh!.userData.auroraVfxCanonicalMaterialMapReference).toBe("fx_canonical_fire");
    expect(mesh!.userData.auroraVfxCanonicalMaterialDepthTest).toBe(true);
    expect(mesh!.userData.auroraVfxCanonicalMaterialOpacity).toBe(1);
    expect(mesh!.userData.auroraVfxCanonicalMaterialColorHex).toBe("#ffffff");
    expect(mesh!.userData.auroraVfxCanonicalMaterialVertexColors).toBe(true);
    expect(mesh!.userData.auroraVfxCanonicalMaterialSide).toBe("FrontSide");
    expect(mesh!.userData.auroraVfxCanonicalDrawVertexCount).toBe(12);
    expect(mesh!.userData.auroraVfxCanonicalDrawRecordIds).toEqual(["draw:0", "draw:1"]);
    expect(mesh!.userData.auroraVfxCanonicalEmitterNodeNames).toEqual(["fx_emit", "fx_emit"]);
    expect(mesh!.userData.auroraVfxCanonicalDrawRecordLanes).toEqual([
      "textured_quad",
      "textured_quad"
    ]);
    expect(mesh!.userData.auroraVfxCanonicalRotationRadians).toEqual([0, 0]);
    expect(mesh!.userData.auroraVfxCanonicalRecordVerticesPerParticle).toEqual([6, 6]);
    expect(mesh!.userData.auroraVfxThreeMaterialSourceTruth).toBe(false);
    expect(mesh!.userData.vfxPreviewRole).toBeUndefined();
    expect(mesh!.frustumCulled).toBe(false);
    const material = mesh!.material as THREE.MeshBasicMaterial;
    expect(material.map).not.toBe(texture);
    expect(material.map?.source).toBe(texture.source);
    expect(material.map?.colorSpace).toBe(THREE.NoColorSpace);
    expect(material.depthTest).toBe(true);
    expect(material.opacity).toBe(1);
    expect(material.color.getHexString()).toBe("ffffff");
    expect(material.vertexColors).toBe(true);
    expect(material.side).toBe(THREE.FrontSide);
    expect(material.customProgramCacheKey()).toBe(
      "aurora-vfx-canonical-particle-retail-soft-depth-fog/v2"
    );
    expect(material.fog).toBe(false);
    expect(material.userData.auroraVfxCanonicalParticleSoftDepthState).toMatchObject({
      status: "disabled",
      maxHalfExtent: 0.3,
      particleSoftness: 0,
      disableReason: "billboard_to_world_z"
    });
    expect(material.userData.auroraVfxCanonicalParticleFogBranch).toBe(
      "normal_rgb_mix"
    );
    expect(mesh!.geometry.index).toBeNull();
    expect(mesh!.geometry.getAttribute("position").count).toBe(12);
    expect(mesh!.geometry.getAttribute("uv").count).toBe(12);
    expect(mesh!.geometry.getAttribute("color").count).toBe(12);
    expect(mesh!.geometry.getAttribute("auroraAlpha").count).toBe(12);
    expect(mesh!.geometry.getAttribute("auroraParticleSize").count).toBe(12);
    expect(mesh!.geometry.getAttribute("auroraAtlasFrameIndex").count).toBe(12);
    const vertexColor = mesh!.geometry.getAttribute("color");
    expect(vertexColor.getX(0)).toBeCloseTo(1, 6);
    expect(vertexColor.getY(0)).toBeCloseTo(63 / 255, 6);
    expect(vertexColor.getZ(0)).toBeCloseTo(127 / 255, 6);
    expect(mesh!.userData.auroraVfxCanonicalColorAccumulationLane).toBe(
      "aurora_raw_gamma_normal_before_retail_bloom"
    );
    expect(material.userData.auroraVfxCanonicalColorAccumulationLane).toBe(
      "aurora_raw_gamma_normal_before_retail_bloom"
    );
    expect(mesh!.userData.auroraVfxCanonicalParticleVertexColorLane).toBeUndefined();
    expect(material.userData.auroraVfxCanonicalParticleVertexColorLane).toBeUndefined();
    expect(material.toneMapped).toBe(false);
    expect(mesh!.geometry.userData.auroraVfxCanonicalNonIndexedDrawArrays).toBe(true);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeGeometrySource).toBe(
      "aurora-render-contract-render-mode"
    );
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisModes).toEqual([
      "world_z_vertical_billboard"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeUsesVelocityBasis).toBe(false);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeCount).toBe(12);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeItemSize).toBe(3);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMin).toBeCloseTo(-0.1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMax).toBeCloseTo(0.7, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMin).toBeCloseTo(-0.1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMax).toBeCloseTo(0.5, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeZMin).toBeCloseTo(0.3, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeZMax).toBeCloseTo(0.3, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeMinUniqueValuesPerRecord).toBe(4);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeMaxUniqueValuesPerRecord).toBe(4);
    expect(mesh!.geometry.userData.auroraVfxCanonicalColorAttributeUniqueCount).toBe(2);
    expect(mesh!.geometry.userData.auroraVfxCanonicalColorAttributeMinUniqueValuesPerRecord).toBe(1);
    expect(mesh!.geometry.userData.auroraVfxCanonicalColorAttributeMaxUniqueValuesPerRecord).toBe(1);
    expect(mesh!.geometry.userData.auroraVfxCanonicalAlphaAttributeMin).toBeCloseTo(115 / 255, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalAlphaAttributeMax).toBeCloseTo(191 / 255, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalAlphaAttributeMinUniqueValuesPerRecord).toBe(1);
    expect(mesh!.geometry.userData.auroraVfxCanonicalAlphaAttributeMaxUniqueValuesPerRecord).toBe(1);
    expect(mesh!.geometry.userData.auroraVfxCanonicalParticleSizeAttributeXMin).toBeCloseTo(0.2, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalParticleSizeAttributeXMax).toBeCloseTo(0.4, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalParticleSizeAttributeYMin).toBeCloseTo(0.2, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalParticleSizeAttributeYMax).toBeCloseTo(0.6, 5);
    expect(
      mesh!.geometry.userData.auroraVfxCanonicalParticleSizeAttributeMinUniqueValuesPerRecord
    ).toBe(1);
    expect(
      mesh!.geometry.userData.auroraVfxCanonicalParticleSizeAttributeMaxUniqueValuesPerRecord
    ).toBe(1);
    expect(mesh!.geometry.userData.auroraVfxCanonicalUvAttributeUMin).toBeCloseTo(0.25, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalUvAttributeUMax).toBeCloseTo(0.75, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalUvAttributeVMin).toBeCloseTo(0, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalUvAttributeVMax).toBeCloseTo(0.75, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalUvAttributeMinUniqueValuesPerRecord).toBe(4);
    expect(mesh!.geometry.userData.auroraVfxCanonicalUvAttributeMaxUniqueValuesPerRecord).toBe(4);
    expect(mesh!.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeCount).toBe(12);
    expect(mesh!.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeItemSize).toBe(1);
    expect(mesh!.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeSource).toBe(
      "auroraAtlasFrameIndex-buffer-attribute"
    );
    expect(mesh!.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeUniqueCount).toBe(2);
    expect(mesh!.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeMin).toBe(2);
    expect(mesh!.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeMax).toBe(6);
    expect(
      mesh!.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeMinUniqueValuesPerRecord
    ).toBe(1);
    expect(
      mesh!.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeMaxUniqueValuesPerRecord
    ).toBe(1);

    const uv = mesh!.geometry.getAttribute("uv");
    expect(uv.getX(0)).toBeCloseTo(0.25, 5);
    expect(uv.getY(0)).toBeCloseTo(0.5, 5);
    expect(uv.getX(5)).toBeCloseTo(0.5, 5);
    expect(uv.getY(5)).toBeCloseTo(0.75, 5);

    const color = mesh!.geometry.getAttribute("color");
    expect(color.getX(0)).toBeCloseTo(1, 5);
    expect(color.getY(0)).toBeCloseTo(63 / 255, 5);
    expect(color.getZ(0)).toBeCloseTo(127 / 255, 5);
    expect(mesh!.geometry.getAttribute("auroraAlpha").getX(0)).toBeCloseTo(191 / 255, 5);
    expect(mesh!.geometry.getAttribute("auroraParticleSize").getX(0)).toBeCloseTo(0.4, 5);
    expect(mesh!.geometry.getAttribute("auroraParticleSize").getY(0)).toBeCloseTo(0.2, 5);
    expect(mesh!.geometry.getAttribute("auroraAtlasFrameIndex").getX(0)).toBe(6);
    expect(mesh!.geometry.getAttribute("auroraAtlasFrameIndex").getX(6)).toBe(2);

    const bounds = new THREE.Box3().setFromObject(group);
    expect(bounds.isEmpty()).toBe(false);
    expect(bounds.max.x).toBeGreaterThan(bounds.min.x);
  });

  it("packs evaluated particle RGBA through Aurora's truncate-to-byte vertex boundary", () => {
    const payload = createCanonicalPayload();
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const color = mesh!.geometry.getAttribute("color");
    const alpha = mesh!.geometry.getAttribute("auroraAlpha");

    expect(color.getX(0)).toBeCloseTo(255 / 255, 8);
    expect(color.getY(0)).toBeCloseTo(63 / 255, 8);
    expect(color.getZ(0)).toBeCloseTo(127 / 255, 8);
    expect(alpha.getX(0)).toBeCloseTo(191 / 255, 7);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPackedRgbaVertexBoundary).toBe(true);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPackedRgbaVertexScale).toBe(
      Math.fround(255.99)
    );
    expect(mesh!.geometry.userData.auroraVfxCanonicalPackedRgbaVertexRounding).toBe(
      "truncate-toward-zero-low-byte"
    );
    expect(mesh!.userData.auroraVfxCanonicalPackedRgbaVertexBoundary).toBe(true);
    expect(mesh!.userData.auroraVfxCanonicalPackedRgbaVertexNormalization).toBe(
      "packed-byte-divided-by-255"
    );
  });

  it("installs and updates the retail soft-depth and normal-fog particle shader lane", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    const drawRecords = renderContract.drawRecords as Array<Record<string, unknown>>;
    renderContract.renderMode = {
      enum: "normal",
      rawToken: "Normal"
    };
    drawRecords.forEach((record) => {
      record.renderMode = {
        enum: "normal",
        rawToken: "Normal"
      };
    });

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const material = mesh!.material as THREE.MeshBasicMaterial;
    const depthTexture = new THREE.DepthTexture(1600, 900, THREE.UnsignedIntType);
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.25, 80);

    expect(material.userData.auroraVfxCanonicalParticleSoftDepthState).toMatchObject({
      status: "enabled",
      maxHalfExtent: 0.3,
      particleSoftness: 1 / (0.2 * 0.3),
      disableReason: null
    });
    expect(
      updateAuroraVfxCanonicalParticleFrameUniforms([mesh!], {
        depthTexture,
        depthSource: "aurora-retail-scene-target-depth",
        depthMatchesSceneTarget: true,
        viewportWidth: 1600,
        viewportHeight: 900,
        camera,
        fog: {
          enabled: true,
          start: 1.5,
          end: 4.5,
          colorGamma: [0.2, 0.4, 0.6]
        }
      })
    ).toBe(1);
    expect(material.userData.auroraVfxCanonicalParticleDepthInput).toMatchObject({
      status: "bound",
      textureUuid: depthTexture.uuid,
      viewportWidth: 1600,
      viewportHeight: 900,
      nearClip: 0.25,
      farClip: 80,
      perspectiveDepth: true,
      projectionMode: "perspective",
      source: "aurora-retail-scene-target-depth",
      matchesSceneTarget: true
    });
    expect(material.userData.auroraVfxCanonicalParticleFogState).toEqual({
      enabled: true,
      start: 1.5,
      end: 4.5,
      colorGamma: [0.2, 0.4, 0.6],
      branch: "normal_rgb_mix"
    });

    const shader = {
      uniforms: {} as Record<string, THREE.IUniform>,
      vertexShader: "void main() {\n#include <project_vertex>\n}",
      fragmentShader:
        "void main() {\n#include <map_fragment>\n#include <color_fragment>\n}"
    };
    material.onBeforeCompile(
      shader as Parameters<typeof material.onBeforeCompile>[0],
      {} as Parameters<typeof material.onBeforeCompile>[1]
    );
    expect(shader.vertexShader).toContain("vAuroraParticleViewZ = mvPosition.z;");
    expect(shader.fragmentShader).toContain("uniform sampler2D auroraSceneDepthTexture;");
    expect(shader.fragmentShader).toContain("uniform float auroraParticleSoftness;");
    expect(shader.fragmentShader).toContain("uniform float auroraPerspectiveDepth;");
    expect(shader.fragmentShader).toContain(
      "auroraSceneDepth + auroraFragmentViewZ"
    );
    expect(shader.fragmentShader).toContain(
      "diffuseColor.a *= auroraSoftFade * auroraSoftFade;"
    );
    expect(shader.fragmentShader).toContain(
      "diffuseColor.rgb = mix(diffuseColor.rgb, auroraFogColorGamma, auroraFogAmount);"
    );
    expect(shader.uniforms.auroraSceneDepthTexture?.value).toBe(depthTexture);
    expect(shader.uniforms.auroraParticleSoftness?.value).toBeCloseTo(
      1 / (0.2 * 0.3),
      10
    );
  });

  it("evaluates retail particle softness in the scaled Three view-space used by framebuffer depth", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.renderMode = {
      enum: "normal",
      rawToken: "Normal"
    };
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const material = mesh!.material as THREE.MeshBasicMaterial;
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.25, 80);
    group.scale.setScalar(0.1);

    updateAuroraVfxCanonicalParticleFrameUniforms([mesh!], {
      depthTexture: new THREE.DepthTexture(1600, 900, THREE.UnsignedIntType),
      depthSource: "aurora-retail-scene-target-depth",
      depthMatchesSceneTarget: true,
      viewportWidth: 1600,
      viewportHeight: 900,
      camera,
      fog: {
        enabled: false,
        start: 0,
        end: 1,
        colorGamma: [0, 0, 0]
      }
    });

    expect(material.userData.auroraVfxCanonicalParticleSoftDepthState).toMatchObject({
      sourceMaxHalfExtent: 0.3,
      worldScale: 0.1,
      maxHalfExtent: 0.03,
      particleSoftness: 1 / (0.2 * 0.03),
      sizeSpace: "three-view-space"
    });
    expect(mesh!.userData.auroraVfxCanonicalParticleSoftDepthState).toEqual(
      material.userData.auroraVfxCanonicalParticleSoftDepthState
    );
  });

  it("fails visibly when the fallback particle alpha shader anchors drift", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, any>;
    renderContract.blendMode = {
      enum: "additive",
      rawToken: "Additive",
      modeNumber: 1
    };
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const material = mesh!.material as THREE.MeshBasicMaterial;
    const shader = {
      uniforms: {},
      vertexShader: "void unrelated() {}",
      fragmentShader: "void unrelated() {}"
    };

    expect(() =>
      material.onBeforeCompile(
        shader as Parameters<typeof material.onBeforeCompile>[0],
        {} as Parameters<typeof material.onBeforeCompile>[1]
      )
    ).toThrow(/expected one "void main\(\) \{" anchor, got 0/);
  });

  it("binds a linear orthographic depth reconstruction for the proof camera", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.renderMode = { enum: "normal", rawToken: "Normal" };
    const drawRecords = renderContract.drawRecords as Array<Record<string, unknown>>;
    drawRecords.forEach((record) => {
      record.renderMode = { enum: "normal", rawToken: "Normal" };
    });
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const depthTexture = new THREE.DepthTexture(800, 600, THREE.UnsignedIntType);
    const camera = new THREE.OrthographicCamera(-2, 2, 1.5, -1.5, 0.25, 80);

    expect(
      updateAuroraVfxCanonicalParticleFrameUniforms([mesh!], {
        depthTexture,
        depthSource: "aurora-retail-scene-target-depth",
        depthMatchesSceneTarget: true,
        viewportWidth: 800,
        viewportHeight: 600,
        camera,
        fog: {
          enabled: false,
          start: 0,
          end: 1,
          colorGamma: [0, 0, 0]
        }
      })
    ).toBe(1);
    expect(mesh!.userData.auroraVfxCanonicalParticleDepthInput).toMatchObject({
      status: "bound",
      projectionMode: "orthographic",
      perspectiveDepth: false
    });
  });

  it("disables face culling only for Aurora twosidedtex", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as {
      renderState: Record<string, unknown>;
    };
    renderContract.renderState.twoSidedTextureLane = "two_sided_texture_cull_disabled";

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const material = mesh!.material as THREE.MeshBasicMaterial;

    expect(material.side).toBe(THREE.DoubleSide);
    expect(mesh!.userData.auroraVfxCanonicalMaterialSide).toBe("DoubleSide");
    expect(group.userData.auroraVfxCanonicalMaterialSide).toBe("DoubleSide");
  });

  it("applies the emitter twosidedtex live-read after the MTR wrapper cull lane", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as {
      renderState: Record<string, unknown>;
    };
    renderContract.renderState.twoSidedTextureLane = "default_cull_lane";
    renderContract.renderState.twoSidedMaterialLane = {
      twoSidedMaterial: true,
      volumetric: false,
      renderWrapperArgument: 1,
      lane: "two_sided_material_non_volumetric_runtime_arg1",
      exactGlState: {
        state3CullFace: "disabled",
        retainedCullFaceMode: "GL_BACK",
        frontFaceWinding: "not_modified_by_render_wrapper",
        particleEmitterOverride: "twosidedtex_live_read_after_render_wrapper",
        queueExitRestore: "state3_enabled_gl_back"
      }
    };

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const material = mesh!.material as THREE.MeshBasicMaterial;

    expect(material.side).toBe(THREE.FrontSide);
    expect(material.userData.auroraVfxCanonicalRenderState).toMatchObject({
      twoSidedTextureLane: "default_cull_lane",
      twoSidedMaterialLane: {
        renderWrapperArgument: 1,
        exactGlState: {
          state3CullFace: "disabled",
          particleEmitterOverride: "twosidedtex_live_read_after_render_wrapper"
        }
      }
    });
  });

  it("refuses a generic material draw when the MTR framebuffer program is not executed", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as unknown as {
      materialState: Record<string, unknown>;
      renderState: Record<string, unknown>;
    };
    renderContract.materialState = {
      source: "aurora-mtr",
      materialRef: "fx_material.mtr",
      sampleFramebuffer: 2,
      volumetric: true
    };
    renderContract.renderState.framebufferLane = {
      sampleFramebuffer: 2,
      volumetric: true,
      runtimeLane: 6,
      lane: "sample_framebuffer_mode_2_runtime_lane_6",
      exactGlState: "confirmed_active_framebuffer_copy_and_texture_units_11_12",
      captureScope: "mainscene_only",
      captureSource: "active_framebuffer_slot",
      captureDestinationSlot: 6,
      attachmentBindingMask: 3,
      colorTextureUnit: 11,
      depthTextureUnit: 12
    };

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const meshes = collectCanonicalDrawMeshes(group);

    expect(meshes).toHaveLength(0);
    expect(group.userData.auroraVfxCanonicalRenderedDrawParticleCount).toBe(0);
    expect(group.userData.auroraVfxCanonicalTextureStatus).toBe("material-unresolved");
    expect(group.userData.auroraVfxDiagnosticCodes).toContain(
      "VFX_CANONICAL_MTR_CUSTOM_PROGRAM_EXECUTION_REQUIRED"
    );
  });

  it("installs a complete Aurora MTR framebuffer SHD graph on canonical particle geometry", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as unknown as {
      materialState: Record<string, unknown>;
      renderState: Record<string, unknown>;
    };
    renderContract.materialState = {
      source: "aurora-mtr",
      materialRef: "fx_custom.mtr",
      sampleFramebuffer: 2,
      customShaderVS: "vs_custom",
      customShaderFS: "fs_custom",
      bumpmaptexture: "fx_custom_bump",
      envmaptexture: "fx_custom_env",
      textureSlots: [{ slot: 6, role: "unknown", reference: "fx_custom_flow" }],
      parameters: [
        { name: "CustomTint", kind: "float", values: [1, 0.5, 0.25, 1], arity: 4 }
      ],
      customShaderProgram: {
        version: "aurora-shader-program-source/v1",
        status: "complete",
        stageRoots: { vertex: "vs_custom", fragment: "fs_custom" },
        sources: [
          {
            resref: "vs_custom",
            source:
              '#define SHADER_TYPE 1\n#define ENVIRONMENT_MAP 1\n#include "inc_custom"\nvoid main(){ gl_Position = m_mvp * vPos; }',
            includeRefs: ["inc_custom"]
          },
          {
            resref: "fs_custom",
            source:
              '#define SHADER_TYPE 2\n#include "inc_custom"\nvoid main(){ gl_FragColor = CustomTint; }',
            includeRefs: ["inc_custom"]
          },
          {
            resref: "inc_custom",
            source: "uniform mat4 m_mvp;\nuniform vec4 CustomTint;\nattribute vec4 vPos;",
            includeRefs: []
          }
        ],
        unresolvedRefs: []
      }
    };
    renderContract.renderState.framebufferLane = {
      sampleFramebuffer: 2,
      volumetric: false,
      runtimeLane: 6,
      lane: "sample_framebuffer_mode_2_runtime_lane_6",
      exactGlState: "confirmed_active_framebuffer_copy_and_texture_units_11_12",
      captureScope: "mainscene_only",
      captureSource: "active_framebuffer_slot",
      captureDestinationSlot: 6,
      attachmentBindingMask: 3,
      colorTextureUnit: 11,
      depthTextureUnit: 12
    };

    const bumpTexture = createTexture();
    const environmentTexture = createTexture();
    const flowTexture = createTexture();
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([
        ["fx_canonical_fire", createTexture()],
        ["fx_custom_bump", bumpTexture],
        ["fx_custom_env", environmentTexture],
        ["fx_custom_flow", flowTexture]
      ])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const material = mesh!.material as THREE.RawShaderMaterial;

    expect(mesh).toBeDefined();
    expect(mesh!.geometry.getAttribute("vPos").itemSize).toBe(4);
    expect(mesh!.geometry.getAttribute("vColor").itemSize).toBe(4);
    expect(material.userData.auroraMaterialCustomShaderExecutionStatus).toBe(
      "installed-retail-source-graph-bindings-parity-proof-pending"
    );
    expect(material.vertexShader).toContain("#define BUILD_VERSION 8193");
    expect((material.uniforms.CustomTint.value as THREE.Vector4).toArray()).toEqual([
      1,
      0.5,
      0.25,
      1
    ]);
    expect(material.uniforms.texUnit4.value).toBe(bumpTexture);
    expect(material.uniforms.texUnitEnv.value).toBe(environmentTexture);
    expect(material.uniforms.texUnitEnvCube.value).toBeNull();
    expect(material.uniforms.texUnit6.value).toBe(flowTexture);
    expect(material.uniforms.texture6Bound.value).toBe(1);
    expect(material.uniforms.texFBColor.value).toBeNull();
    expect(material.uniforms.texFBDepth.value).toBeNull();
    expect(mesh!.userData.auroraMaterialFramebufferRuntimeLane).toBe(6);
    expect(group.userData.auroraVfxCanonicalMaterialStatus).toBe(
      "applied-mtr-custom-program-adapter-retail-proof-pending"
    );
    expect(group.userData.auroraVfxDiagnosticCodes).toContain(
      "VFX_CANONICAL_MTR_CUSTOM_PROGRAM_EXECUTED"
    );
  });

  it("applies the recovered Aurora bucket-2 GL blend factors from the render contract", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as unknown as {
      blendMode: Record<string, unknown>;
    };
    renderContract.blendMode = {
      enum: "mode_2",
      rawToken: "Lighten",
      modeNumber: 2,
      exactGlBlendFactors: {
        status: "confirmed",
        sourceFactor: "GL_SRC_ALPHA",
        sourceFactorGlEnum: 0x0302,
        destinationFactor: "GL_ONE",
        destinationFactorGlEnum: 0x0001,
        blendTableIndices: [0, 2],
        source: "nwtoolset-1.5.0.5-disassembly"
      }
    };

    const sourceTexture = createTexture();
    sourceTexture.colorSpace = THREE.SRGBColorSpace;
    sourceTexture.repeat.set(0.25, 0.25);
    sourceTexture.offset.set(0.5, 0.25);
    sourceTexture.center.set(0.5, 0.5);
    sourceTexture.rotation = 0.125;
    sourceTexture.updateMatrix();
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", sourceTexture]]),
      particleTextureSamplerStatesByReference: new Map([
        [
          "fx_canonical_fire",
          {
            mipmap: false,
            downsampleMin: 0,
            downsampleMax: 0,
            source: "fx_canonical_fire.txi"
          }
        ]
      ])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const material = mesh!.material as THREE.MeshBasicMaterial;

    expect(material.blending).toBe(THREE.CustomBlending);
    expect(material.blendSrc).toBe(THREE.SrcAlphaFactor);
    expect(material.blendDst).toBe(THREE.OneFactor);
    expect(material.blendEquation).toBe(THREE.AddEquation);
    expect(mesh!.userData.auroraVfxCanonicalBlendFactorStatus).toBe("confirmed");
    expect(mesh!.userData.auroraVfxCanonicalBlendSourceFactor).toBe("GL_SRC_ALPHA");
    expect(mesh!.userData.auroraVfxCanonicalBlendDestinationFactor).toBe("GL_ONE");
    expect(mesh!.userData.auroraVfxCanonicalBlendTableIndices).toEqual([0, 2]);
    expect(mesh!.userData.auroraVfxCanonicalMaterialBlendSrc).toBe("SrcAlphaFactor");
    expect(mesh!.userData.auroraVfxCanonicalMaterialBlendDst).toBe("OneFactor");
    expect(mesh!.userData.auroraVfxCanonicalMaterialBlendEquation).toBe("AddEquation");
    expect(mesh!.userData.auroraVfxCanonicalColorAccumulationLane).toBe(
      "aurora_raw_gamma_additive_before_retail_bloom"
    );
    expect(mesh!.userData.auroraVfxCanonicalParticleTextureColorSpace).toBe(
      "NoColorSpace"
    );
    const vertexColor = mesh!.geometry.getAttribute("color");
    expect(vertexColor.getX(0)).toBeCloseTo(1, 6);
    expect(vertexColor.getY(0)).toBeCloseTo(63 / 255, 6);
    expect(vertexColor.getZ(0)).toBeCloseTo(127 / 255, 6);
    expect(mesh!.userData.auroraVfxCanonicalParticleVertexColorLane).toBeUndefined();
    expect(material.userData.auroraVfxCanonicalParticleFogBranch).toBe(
      "additive_alpha_attenuation"
    );
    expect(material.map).not.toBe(sourceTexture);
    expect(material.map?.source).toBe(sourceTexture.source);
    expect(material.map?.colorSpace).toBe(THREE.NoColorSpace);
    expect(material.map?.repeat.toArray()).toEqual([1, 1]);
    expect(material.map?.offset.toArray()).toEqual([0, 0]);
    expect(material.map?.center.toArray()).toEqual([0, 0]);
    expect(material.map?.rotation).toBe(0);
    expect(
      material.map?.userData.auroraVfxCanonicalParticleAtlasTransformOwnership
    ).toBe("per-particle-geometry-uv");
    expect(sourceTexture.repeat.toArray()).toEqual([0.25, 0.25]);
    expect(sourceTexture.offset.toArray()).toEqual([0.5, 0.25]);
    expect(material.map?.generateMipmaps).toBe(false);
    expect(material.map?.minFilter).toBe(THREE.LinearFilter);
    expect(sourceTexture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(sourceTexture.generateMipmaps).toBe(false);
    expect(sourceTexture.minFilter).toBe(THREE.LinearFilter);
    expect(mesh!.userData.auroraVfxCanonicalTextureSamplerState).toEqual({
      mipmap: false,
      downsampleMin: 0,
      downsampleMax: 0,
      source: "fx_canonical_fire.txi"
    });
    expect(material.toneMapped).toBe(false);

    let rawTextureDisposed = false;
    material.map?.addEventListener("dispose", () => {
      rawTextureDisposed = true;
    });
    material.dispose();
    expect(rawTextureDisposed).toBe(true);
  });

  it("applies the recovered retail Punch-Through alpha-discard threshold", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as unknown as {
      blendMode: Record<string, unknown>;
      renderState: Record<string, unknown>;
    };
    renderContract.blendMode = {
      enum: "punch_through",
      rawToken: "Punch-Through",
      modeNumber: 1
    };
    renderContract.renderState = {
      ...renderContract.renderState,
      alphaDiscardLane: "punch_through_runtime_uniform_0_2",
      alphaDiscardValue: 0.2,
      alphaDiscardValueSource: "nwtoolset-1.5.0.5-disassembly"
    };

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const material = mesh!.material as THREE.MeshBasicMaterial;
    expect(material.transparent).toBe(false);
    expect(material.depthWrite).toBe(true);
    expect(material.alphaTest).toBe(0.2);
    expect(group.userData.auroraVfxCanonicalTextureStatus).toBe("applied");
    expect(group.userData.auroraVfxCanonicalRenderedDrawParticleCount).toBe(2);
    expect(group.userData.auroraVfxCanonicalMaterialAlphaTest).toBe(0.2);
    expect(group.userData.auroraVfxCanonicalMaterialAlphaTestSource).toBe(
      "nwtoolset-1.5.0.5-fAlphaDiscardValue-state1-disassembly"
    );
    expect(group.userData.auroraVfxCanonicalMaterialStatus).toBe(
      "applied-punch-through-alpha-discard-0.2"
    );
    expect(group.userData.auroraVfxDiagnosticCodes).not.toContain(
      "VFX_CANONICAL_PUNCH_THROUGH_ALPHA_DISCARD_REQUIRED"
    );
  });

  it("applies an oracle-bound additive radiance calibration without rewriting source draw records", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as unknown as {
      blendMode: Record<string, unknown>;
    };
    renderContract.blendMode = {
      enum: "mode_2",
      rawToken: "Lighten",
      modeNumber: 2,
      exactGlBlendFactors: {
        status: "confirmed",
        sourceFactor: "GL_SRC_ALPHA",
        destinationFactor: "GL_ONE",
        blendTableIndices: [0, 2],
        source: "nwtoolset-1.5.0.5-disassembly"
      }
    };

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([
        ["fx_canonical_fire", createTexture()]
      ]),
      additiveParticleRadianceCalibration: {
        scale: 4,
        sourceEvidence:
          "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/validated-summary.json"
      }
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const vertexColor = mesh!.geometry.getAttribute("color");

    expect(vertexColor.getX(0)).toBeCloseTo(4, 6);
    expect(vertexColor.getY(0)).toBeCloseTo((63 / 255) * 4, 6);
    expect(vertexColor.getZ(0)).toBeCloseTo((127 / 255) * 4, 6);
    expect(mesh!.userData.auroraVfxCanonicalAdditiveRadianceScale).toBe(4);
    expect(mesh!.userData.auroraVfxCanonicalAdditiveRadianceCalibrationSource).toContain(
      "vfx-nwn-web-row28/nwn-final/v1/validated-summary.json"
    );
    expect(
      (payload.contracts.renderContract as any).drawRecords[0].color
    ).toEqual({ r: 1, g: 0.25, b: 0.5 });
  });

  it("still refuses Punch-Through when the exact recovered alpha-discard contract is absent", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as unknown as {
      blendMode: Record<string, unknown>;
      renderState: Record<string, unknown>;
    };
    renderContract.blendMode = {
      enum: "punch_through",
      rawToken: "Punch-Through",
      modeNumber: 1
    };
    renderContract.renderState = {
      ...renderContract.renderState,
      alphaDiscardLane: "punch_through_runtime_uniform_0_2"
    };

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    expect(collectCanonicalDrawMeshes(group)).toHaveLength(0);
    expect(group.userData.auroraVfxCanonicalMaterialAlphaTest).toBeNull();
    expect(group.userData.auroraVfxDiagnosticCodes).toContain(
      "VFX_CANONICAL_PUNCH_THROUGH_ALPHA_DISCARD_REQUIRED"
    );
  });

  it("binds only the emitter's exact texUnit0 RGBA texture", () => {
    const payload = createCanonicalPayload();
    const colorTexture = createTexture();
    const independentSiblingTexture = createTexture();
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([
        ["fx_canonical_fire", colorTexture],
        ["fx_canonical_firea", independentSiblingTexture]
      ])
    });

    const [mesh] = collectCanonicalDrawMeshes(group);
    const material = mesh?.material as THREE.MeshBasicMaterial;
    expect(material.map).not.toBe(colorTexture);
    expect(material.map?.source).toBe(colorTexture.source);
    expect(material.map?.source).not.toBe(independentSiblingTexture.source);
    expect(material.map?.colorSpace).toBe(THREE.NoColorSpace);
    expect(material.alphaMap).toBeNull();
    expect(material.transparent).toBe(true);
    expect(material.userData.auroraVfxCanonicalParticleTextureBinding).toBe(
      "exact-texUnit0-rgba"
    );
    expect(material.userData.auroraVfxCanonicalParticleAlphaSource).toBe(
      "texUnit0-alpha-times-particle-alpha"
    );
    expect(material.userData.auroraVfxCanonicalInferredAlphaCompanion).toBe(false);
    expect(material.userData.auroraVfxCanonicalParticleTextureBindingSourceSha256).toBe(
      "acdea921e80243549205d86ffde2119af97a697443f27dcf6ee5e8798deb2816"
    );
  });

  it("keeps native Mode 4 camera horizontal while locking its second axis to world Z", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 1;
    renderContract.drawParticleCount = 1;
    renderContract.drawVertexCount = 6;
    renderContract.drawRecords = [
      createDrawRecord({
        id: "world-z:0",
        particleId: 40,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        rotationRadians: 0,
        renderMode: {
          enum: "aligned_to_world_z",
          rawToken: "Aligned_to_World_Z"
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        size: { x: 2, y: 4 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);

    expect(mesh).toBeDefined();
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisModes).toEqual([
      "world_z_aligned_camera_billboard"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisSources).toEqual([
      "aurora-render-mode-world-z-camera-horizontal-fallback"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMin).toBeCloseTo(-1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMax).toBeCloseTo(1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMin).toBeCloseTo(-2, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMax).toBeCloseTo(2, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeZMin).toBeCloseTo(0, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeZMax).toBeCloseTo(0, 5);
  });

  it("refreshes Mode 4's camera-derived first axis without rotating world Z", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 1;
    renderContract.drawParticleCount = 1;
    renderContract.drawVertexCount = 6;
    renderContract.drawRecords = [
      createDrawRecord({
        id: "world-z-live-camera:0",
        particleId: 42,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        renderMode: {
          enum: "aligned_to_world_z",
          rawToken: "Aligned_to_World_Z"
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        size: { x: 2, y: 4 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(5, 0, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    mesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      mesh!.geometry,
      mesh!.material,
      null
    );

    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMin).toBeCloseTo(0, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMax).toBeCloseTo(0, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMin).toBeCloseTo(-2, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMax).toBeCloseTo(2, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeZMin).toBeCloseTo(-1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeZMax).toBeCloseTo(1, 5);

    camera.up.set(0, -1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    mesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      mesh!.geometry,
      mesh!.material,
      null
    );
    const positions = mesh!.geometry.getAttribute("position");
    const a = new THREE.Vector3().fromBufferAttribute(positions, 0);
    const b = new THREE.Vector3().fromBufferAttribute(positions, 1);
    const c = new THREE.Vector3().fromBufferAttribute(positions, 2);
    const frontNormal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const towardCamera = camera.getWorldDirection(new THREE.Vector3()).negate();

    expect(frontNormal.dot(towardCamera)).toBeGreaterThan(0.999);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisSources).toEqual([
      "aurora-render-mode-world-z-camera-horizontal-signed-world-z"
    ]);
  });

  it("keeps a default Normal placeable billboard front-facing after a live camera update", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 1;
    renderContract.drawParticleCount = 1;
    renderContract.drawVertexCount = 6;
    renderContract.drawRecords = [
      createDrawRecord({
        id: "normal-placeable-live-camera:0",
        particleId: 43,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        renderMode: { enum: "unknown", rawToken: "Normal" },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        size: { x: 2, y: 4 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      sourceCoordinateSpace: "aurora-z-up"
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(2, 3, 4);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    mesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      mesh!.geometry,
      mesh!.material,
      null
    );

    const position = mesh!.geometry.getAttribute("position");
    const first = new THREE.Vector3().fromBufferAttribute(position, 0);
    const second = new THREE.Vector3().fromBufferAttribute(position, 1);
    const third = new THREE.Vector3().fromBufferAttribute(position, 2);
    const frontFaceNormal = new THREE.Vector3()
      .crossVectors(second.clone().sub(first), third.clone().sub(first))
      .normalize();
    const towardCamera = camera.getWorldDirection(new THREE.Vector3()).negate();

    expect((mesh!.material as THREE.MeshBasicMaterial).side).toBe(THREE.FrontSide);
    expect(frontFaceNormal.dot(towardCamera)).toBeGreaterThan(0.999);
  });

  it("keeps a default Normal billboard front-facing under the mirrored Area model scale", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 1;
    renderContract.drawParticleCount = 1;
    renderContract.drawVertexCount = 6;
    renderContract.drawRecords = [
      createDrawRecord({
        id: "normal-placeable-mirrored-area:0",
        particleId: 44,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        renderMode: { enum: "unknown", rawToken: "Normal" },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        size: { x: 2, y: 4 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      sourceCoordinateSpace: "aurora-z-up"
    });
    const mirroredAreaRoot = new THREE.Group();
    mirroredAreaRoot.scale.set(-0.1, 0.1, 0.1);
    mirroredAreaRoot.add(group);
    mirroredAreaRoot.updateMatrixWorld(true);
    const [mesh] = collectCanonicalDrawMeshes(group);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(2, 3, 4);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    mesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      mesh!.geometry,
      mesh!.material,
      null
    );
    mesh!.updateWorldMatrix(true, false);

    const position = mesh!.geometry.getAttribute("position");
    const first = new THREE.Vector3()
      .fromBufferAttribute(position, 0)
      .applyMatrix4(mesh!.matrixWorld);
    const second = new THREE.Vector3()
      .fromBufferAttribute(position, 1)
      .applyMatrix4(mesh!.matrixWorld);
    const third = new THREE.Vector3()
      .fromBufferAttribute(position, 2)
      .applyMatrix4(mesh!.matrixWorld);
    const frontFaceNormal = new THREE.Vector3()
      .crossVectors(second.clone().sub(first), third.clone().sub(first))
      .normalize();
    const triangleCenter = first.clone().add(second).add(third).multiplyScalar(1 / 3);
    const towardCamera = camera.position.clone().sub(triangleCenter).normalize();
    const worldFacingDot = frontFaceNormal.dot(towardCamera);
    const effectiveFrontFacingDot =
      worldFacingDot * Math.sign(mesh!.matrixWorld.determinant());

    expect((mesh!.material as THREE.MeshBasicMaterial).side).toBe(THREE.FrontSide);
    expect(worldFacingDot).toBeLessThan(-0.999);
    expect(effectiveFrontFacingDot).toBeGreaterThan(0.999);
  });

  it("maps the native mode-2 Aurora X/Y quad onto Three X/Z", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 1;
    renderContract.drawParticleCount = 1;
    renderContract.drawVertexCount = 6;
    renderContract.drawRecords = [
      createDrawRecord({
        id: "aurora-world-z:0",
        particleId: 41,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        renderMode: {
          enum: "billboard_to_world_z",
          rawToken: "Billboard_to_World_Z"
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        size: { x: 2, y: 4 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      sourceCoordinateSpace: "aurora-z-up"
    });
    const [mesh] = collectCanonicalDrawMeshes(group);

    expect(mesh).toBeDefined();
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisSources).toEqual([
      "aurora-render-mode-world-z-source-xy-plane"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMin).toBeCloseTo(-1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMax).toBeCloseTo(1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMin).toBeCloseTo(0, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMax).toBeCloseTo(0, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeZMin).toBeCloseTo(-2, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeZMax).toBeCloseTo(2, 5);
    const position = mesh!.geometry.getAttribute("position");
    const first = new THREE.Vector3().fromBufferAttribute(position, 0);
    const second = new THREE.Vector3().fromBufferAttribute(position, 1);
    const third = new THREE.Vector3().fromBufferAttribute(position, 2);
    const frontFaceNormal = new THREE.Vector3()
      .crossVectors(second.sub(first), third.sub(first))
      .normalize();
    expect((mesh!.material as THREE.MeshBasicMaterial).side).toBe(THREE.FrontSide);
    expect(frontFaceNormal.x).toBeCloseTo(0, 5);
    expect(frontFaceNormal.y).toBeCloseTo(1, 5);
    expect(frontFaceNormal.z).toBeCloseTo(0, 5);
  });

  it("lays a landed splat on its Aurora contact-normal plane", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 1;
    renderContract.drawParticleCount = 1;
    renderContract.drawVertexCount = 6;
    renderContract.drawRecords = [
      createDrawRecord({
        id: "landed-splat:0",
        particleId: 44,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        landed: true,
        splat: true,
        contactNormal: { x: 0, y: 0, z: 1 },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        size: { x: 2, y: 4 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      sourceCoordinateSpace: "aurora-z-up",
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);

    expect(mesh).toBeDefined();
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisModes).toEqual([
      "landed_splat_contact_plane"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisSources).toEqual([
      "aurora-landed-splat-contact-normal-orientation"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMin).toBeCloseTo(0, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMax).toBeCloseTo(0, 5);
    expect(group.userData.auroraVfxCanonicalLanded).toEqual([true]);
    expect(group.userData.auroraVfxCanonicalSplat).toEqual([true]);
    expect(group.userData.auroraVfxCanonicalContactNormalZ).toEqual([1]);
  });

  it("uses the emitter quaternion for Billboard_to_Local_Z instead of the World-Z basis", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 1;
    renderContract.drawParticleCount = 1;
    renderContract.drawVertexCount = 6;
    renderContract.renderMode = {
      enum: "billboard_to_local_z",
      rawToken: "Billboard_to_Local_Z"
    };
    renderContract.drawRecords = [
      createDrawRecord({
        id: "local-z:0",
        particleId: 45,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        renderMode: {
          enum: "billboard_to_local_z",
          rawToken: "Billboard_to_Local_Z"
        },
        emitterOrientation: { axis: [0, 1, 0], angleRadians: Math.PI / 2 },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        size: { x: 2, y: 4 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      sourceCoordinateSpace: "aurora-z-up",
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);

    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisModes).toEqual([
      "local_z_vertical_billboard"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisSources).toEqual([
      "aurora-render-mode-local-z-emitter-local-xy-plane"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMin).toBeCloseTo(0, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMax).toBeCloseTo(0, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMin).toBeCloseTo(-1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMax).toBeCloseTo(1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeZMin).toBeCloseTo(-2, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeZMax).toBeCloseTo(2, 5);
    const positions = mesh!.geometry.getAttribute("position");
    const a = new THREE.Vector3().fromBufferAttribute(positions, 0);
    const b = new THREE.Vector3().fromBufferAttribute(positions, 1);
    const c = new THREE.Vector3().fromBufferAttribute(positions, 2);
    const frontNormal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    expect(frontNormal.x).toBeGreaterThan(0.999);

    const rotatedPayload = structuredClone(payload);
    const rotatedContract = rotatedPayload.contracts.renderContract as Record<string, unknown>;
    const [rotatedRecord] = rotatedContract.drawRecords as Array<Record<string, unknown>>;
    rotatedRecord!.emitterOrientation = { axis: [0, 0, 1], angleRadians: 0 };
    rotatedRecord!.rotationRadians = Math.PI / 2;
    const rotatedGroup = createAuroraVfxCanonicalRenderGroup(rotatedPayload, {
      sourceCoordinateSpace: "aurora-z-up",
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [rotatedMesh] = collectCanonicalDrawMeshes(rotatedGroup);
    const rotatedPositions = rotatedMesh!.geometry.getAttribute("position");
    const first = new THREE.Vector3().fromBufferAttribute(rotatedPositions, 0);
    const second = new THREE.Vector3().fromBufferAttribute(rotatedPositions, 1);

    expect(first.x).toBeCloseTo(2, 5);
    expect(first.z).toBeCloseTo(-1, 5);
    expect(second.x).toBeCloseTo(-2, 5);
    expect(second.z).toBeCloseTo(-1, 5);
  });

  it("builds contiguous local segment geometry for linked textured records", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 3;
    renderContract.drawParticleCount = 2;
    renderContract.drawLane = "linked_textured_quad";
    renderContract.renderMode = {
      enum: "linked_billboard",
      rawToken: "Linked"
    };
    renderContract.drawVertexCount = 12;
    renderContract.drawRecords = [
      createDrawRecord({
        id: "linked:0",
        lane: "linked_textured_quad",
        particleId: 100,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        linkedNextParticleId: 101,
        linkedNextPosition: { x: 0.5, y: 0.25, z: 0 },
        renderMode: {
          enum: "linked_billboard",
          rawToken: "Linked"
        },
        color: { r: 1, g: 0.7, b: 0.2 },
        alpha: 1,
        size: { x: 0.2, y: 0.2 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      }),
      createDrawRecord({
        id: "linked:1",
        lane: "linked_textured_quad",
        particleId: 101,
        particleIndex: 1,
        position: { x: 0.5, y: 0.25, z: 0 },
        linkedNextParticleId: 102,
        linkedNextPosition: { x: 1, y: 0.25, z: 0 },
        renderMode: {
          enum: "linked_billboard",
          rawToken: "Linked"
        },
        color: { r: 1, g: 0.6, b: 0.2 },
        alpha: 0.9,
        size: { x: 0.2, y: 0.2 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 1,
          rawFrameIndex: 1,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);

    expect(group.userData.auroraVfxCanonicalDrawLane).toBe("linked_textured_quad");
    expect(group.userData.auroraVfxCanonicalRenderedDrawParticleCount).toBe(2);
    expect(group.userData.auroraVfxCanonicalRenderedVertexCount).toBe(12);
    expect(mesh).toBeDefined();
    expect(mesh!.geometry.getAttribute("position").count).toBe(12);
    expect(mesh!.geometry.userData.auroraVfxCanonicalLinkedSegmentTopology).toBe(true);
    expect(mesh!.geometry.userData.auroraVfxCanonicalLinkedSegmentCount).toBe(2);
    expect(mesh!.geometry.userData.auroraVfxCanonicalLinkedSegmentSource).toBe(
      "aurora-decomp-next-active-particle-position"
    );
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisModes).toEqual([
      "linked_segment_strip"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisSources).toEqual([
      "aurora-linked-camera-plane-transverse-and-longitudinal-basis"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalLinkedSegmentNativeGeometryProfile).toBe(
      "aurora-mode-3-camera-plane-width-x2-y-quarter-outward-cap"
    );
    expect(mesh!.geometry.userData.auroraVfxCanonicalLinkedSegmentBasisNormalization).toBe(
      "aurora-full-3d-segment-reciprocal"
    );
    expect(mesh!.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeUniqueCount).toBe(2);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMin).toBeLessThan(0);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMax).toBeCloseTo(1.05, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMin).toBeLessThan(0);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMax).toBeGreaterThan(0.25);
    expect(mesh!.userData.auroraVfxRetailParityProof).toBe(false);

    const positions = mesh!.geometry.getAttribute("position");
    const expectedFirstSegmentVertices = [
      [-0.13416408, 0.15652476, 0],
      [0.04472136, -0.20124612, 0],
      [0.45527864, 0.45124612, 0],
      [0.45527864, 0.45124612, 0],
      [0.04472136, -0.20124612, 0],
      [0.63416408, 0.09347524, 0]
    ];
    expectedFirstSegmentVertices.forEach((expected, index) => {
      const actual = new THREE.Vector3().fromBufferAttribute(positions, index);
      expect(actual.x).toBeCloseTo(expected[0]!, 5);
      expect(actual.y).toBeCloseTo(expected[1]!, 5);
      expect(actual.z).toBeCloseTo(expected[2]!, 5);
    });

    const mappedPayload = structuredClone(payload);
    const mappedContract = mappedPayload.contracts.renderContract as Record<string, unknown>;
    const mappedRecords = mappedContract.drawRecords as Array<Record<string, unknown>>;
    mappedRecords[0]!.position = { x: 0, y: 0, z: 0 };
    mappedRecords[0]!.linkedNextPosition = { x: 0, y: 1.5, z: 0 };
    mappedRecords[1]!.position = { x: 0, y: 1.5, z: 0 };
    mappedRecords[1]!.linkedNextPosition = { x: 0, y: 3, z: 0 };
    const mappedGroup = createAuroraVfxCanonicalRenderGroup(mappedPayload, {
      sourceCoordinateSpace: "aurora-z-up",
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mappedMesh] = collectCanonicalDrawMeshes(mappedGroup);
    const mappedPosition = mappedMesh!.geometry.getAttribute("position");
    const initialPositionVersion = mappedPosition.version;
    const captureCamera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 100);
    captureCamera.position.set(0, 4.6, -4.8);
    captureCamera.lookAt(0, 0.75, 1.5);
    captureCamera.updateMatrixWorld(true);

    expect(
      updateAuroraVfxCanonicalCameraBillboards(mappedGroup, captureCamera)
    ).toBe(1);
    expect(mappedPosition.version).toBeGreaterThan(initialPositionVersion);

    const mappedPositions = mappedMesh!.geometry.getAttribute("position");
    const a = new THREE.Vector3().fromBufferAttribute(mappedPositions, 0);
    const b = new THREE.Vector3().fromBufferAttribute(mappedPositions, 1);
    const c = new THREE.Vector3().fromBufferAttribute(mappedPositions, 2);
    const frontNormal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const triangleCenter = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const towardCamera = captureCamera.position.clone().sub(triangleCenter).normalize();
    const effectiveFrontFacingDot =
      frontNormal.dot(towardCamera) * Math.sign(mesh!.matrixWorld.determinant());

    expect(effectiveFrontFacingDot).toBeGreaterThan(0.5);
    expect(mappedMesh!.geometry.userData.auroraVfxCanonicalLinkedSegmentWinding).toBe(
      "three-camera-front-facing-after-source-conversion"
    );
  });

  it("normalizes Linked camera projections by the full Aurora 3D segment length", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 2;
    renderContract.drawParticleCount = 1;
    renderContract.drawLane = "linked_textured_quad";
    renderContract.renderMode = {
      enum: "linked_billboard",
      rawToken: "Linked"
    };
    renderContract.drawVertexCount = 6;
    renderContract.drawRecords = [
      createDrawRecord({
        id: "linked-depth:0",
        lane: "linked_textured_quad",
        particleId: 110,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        linkedNextParticleId: 111,
        linkedNextPosition: { x: 0, y: 3, z: 4 },
        renderMode: {
          enum: "linked_billboard",
          rawToken: "Linked"
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        size: { x: 0.2, y: 0.2 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const positions = mesh!.geometry.getAttribute("position");
    const expectedVertices = [
      [-0.12, -0.03, 0],
      [0.12, -0.03, 0],
      [-0.12, 3.03, 4],
      [-0.12, 3.03, 4],
      [0.12, -0.03, 0],
      [0.12, 3.03, 4]
    ];

    expectedVertices.forEach((expected, index) => {
      const actual = new THREE.Vector3().fromBufferAttribute(positions, index);
      expect(actual.x).toBeCloseTo(expected[0]!, 5);
      expect(actual.y).toBeCloseTo(expected[1]!, 5);
      expect(actual.z).toBeCloseTo(expected[2]!, 5);
    });
  });

  it("aligns particle-direction render modes from Aurora's per-particle orientation state", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 1;
    renderContract.drawParticleCount = 1;
    renderContract.drawVertexCount = 6;
    renderContract.drawRecords = [
      createDrawRecord({
        id: "particle-dir:0",
        particleId: 41,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        particleOrientation: { axis: [0, 1, 0], angleRadians: Math.PI / 2 },
        renderMode: {
          enum: "aligned_to_particle_dir",
          rawToken: "Aligned_to_Particle_Dir"
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        size: { x: 2, y: 4 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      sourceCoordinateSpace: "aurora-z-up",
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const position = mesh!.geometry.getAttribute("position");

    expect(mesh).toBeDefined();
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisModes).toEqual([
      "particle_orientation_aligned"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisSources).toEqual([
      "aurora-render-mode-particle-orientation-slot"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeUsesVelocityBasis).toBe(false);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeUsesParticleOrientation).toBe(true);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMin).toBeCloseTo(-1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMax).toBeCloseTo(1, 5);
    expect(position.getX(0)).toBeCloseTo(-2, 5);
    expect(position.getX(1)).toBeCloseTo(2, 5);
    const a = new THREE.Vector3().fromBufferAttribute(position, 0);
    const b = new THREE.Vector3().fromBufferAttribute(position, 1);
    const c = new THREE.Vector3().fromBufferAttribute(position, 2);
    const frontNormal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    expect(frontNormal.z).toBeLessThan(-0.999);
  });

  it("reconstructs native Motion_Blur camera-plane caps and trailing alpha without promoting parity", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 1;
    renderContract.drawParticleCount = 1;
    renderContract.drawVertexCount = 6;
    renderContract.renderMode = {
      enum: "motion_blur",
      rawToken: "Motion_Blur"
    };
    renderContract.drawRecords = [
      createDrawRecord({
        id: "motion-blur:0",
        particleId: 42,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        previousPosition: { x: 0, y: -3, z: 0 },
        velocity: { x: 0, y: 3, z: 0 },
        renderMode: {
          enum: "motion_blur",
          rawToken: "Motion_Blur"
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 0.75,
        size: { x: 1, y: 2 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const positions = mesh!.geometry.getAttribute("position");
    const alphas = mesh!.geometry.getAttribute("auroraAlpha");

    expect(mesh).toBeDefined();
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisModes).toEqual([
      "motion_blur_velocity_aligned"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeBasisSources).toEqual([
      "aurora-motion-blur-previous-position-segment"
    ]);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeUsesVelocityBasis).toBe(false);
    expect(mesh!.geometry.userData.auroraVfxCanonicalRenderModeUsesMotionBlurPreviousPosition).toBe(true);
    expect(mesh!.geometry.userData.auroraVfxCanonicalMotionBlurNativeGeometryProfile).toBe(
      "aurora-mode-6-camera-plane-width-x2-y-quarter-cap-trailing-alpha"
    );
    expect(mesh!.geometry.userData.auroraVfxCanonicalMotionBlurBasisNormalization).toBe(
      "aurora-full-3d-segment-reciprocal"
    );
    expect(mesh!.geometry.userData.auroraVfxCanonicalMotionBlurTrailingAlphaLengthSource).toBe(
      "aurora-full-3d-segment-length"
    );
    expect(mesh!.geometry.userData.auroraVfxCanonicalMotionBlurNativeParticleCount).toBe(1);
    expect(mesh!.geometry.userData.auroraVfxCanonicalMotionBlurTrailingAlphaFactorMin).toBeCloseTo(
      1 / 3,
      5
    );
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMin).toBeCloseTo(-1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeXMax).toBeCloseTo(1, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMin).toBeCloseTo(-3.5, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalPositionAttributeYMax).toBeCloseTo(0.5, 5);
    expect([positions.getX(0), positions.getY(0), positions.getZ(0)]).toEqual([1, 0.5, 0]);
    expect([positions.getX(2), positions.getY(2), positions.getZ(2)]).toEqual([1, -3.5, 0]);
    expect(alphas.getX(0)).toBeCloseTo(191 / 255, 7);
    expect(alphas.getX(2)).toBeCloseTo(63 / 255, 7);
    expect(mesh!.userData.auroraVfxRetailParityProof).toBe(false);

    group.scale.x = -1;
    group.updateMatrixWorld(true);
    const captureCamera = new THREE.PerspectiveCamera(39.463808, 1460 / 810, 0.1, 100);
    captureCamera.position.set(0.05148, 6.051473, -4.371987);
    captureCamera.lookAt(0.03482, 0.01, 3.737955);
    captureCamera.updateMatrixWorld(true);
    expect(updateAuroraVfxCanonicalCameraBillboards(group, captureCamera)).toBe(1);
    group.updateMatrixWorld(true);
    const mirroredPositions = mesh!.geometry.getAttribute("position");
    const a = new THREE.Vector3()
      .fromBufferAttribute(mirroredPositions, 0)
      .applyMatrix4(mesh!.matrixWorld);
    const b = new THREE.Vector3()
      .fromBufferAttribute(mirroredPositions, 1)
      .applyMatrix4(mesh!.matrixWorld);
    const c = new THREE.Vector3()
      .fromBufferAttribute(mirroredPositions, 2)
      .applyMatrix4(mesh!.matrixWorld);
    const frontNormal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const triangleCenter = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const towardCamera = captureCamera.position.clone().sub(triangleCenter).normalize();
    const effectiveFrontFacingDot =
      frontNormal.dot(towardCamera) * Math.sign(mesh!.matrixWorld.determinant());

    expect(effectiveFrontFacingDot).toBeGreaterThan(0.5);
  });

  it("uses the full Aurora 3D segment for Motion_Blur caps and trailing alpha", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 1;
    renderContract.drawParticleCount = 1;
    renderContract.drawVertexCount = 6;
    renderContract.renderMode = {
      enum: "motion_blur",
      rawToken: "Motion_Blur"
    };
    renderContract.drawRecords = [
      createDrawRecord({
        id: "motion-blur-depth:0",
        particleId: 43,
        particleIndex: 0,
        position: { x: 0, y: 0, z: 0 },
        previousPosition: { x: 0, y: -3, z: -4 },
        velocity: { x: 0, y: 3, z: 4 },
        renderMode: {
          enum: "motion_blur",
          rawToken: "Motion_Blur"
        },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        size: { x: 1, y: 2 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const positions = mesh!.geometry.getAttribute("position");
    const alphas = mesh!.geometry.getAttribute("auroraAlpha");

    expect([positions.getX(0), positions.getY(0), positions.getZ(0)]).toEqual([
      0.6000000238418579,
      0.30000001192092896,
      0
    ]);
    expect([positions.getX(2), positions.getY(2), positions.getZ(2)]).toEqual([
      0.6000000238418579,
      -3.299999952316284,
      -4
    ]);
    expect(alphas.getX(0)).toBe(1);
    expect(alphas.getX(2)).toBeCloseTo(0.2, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalMotionBlurTrailingAlphaFactorMin).toBeCloseTo(
      0.2,
      5
    );
  });

  it("keeps Aurora Z-up Motion_Blur particles front-facing under the production Area mirror", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.activeParticleCount = 1;
    renderContract.drawParticleCount = 1;
    renderContract.drawVertexCount = 6;
    renderContract.renderMode = { enum: "motion_blur", rawToken: "Motion_Blur" };
    renderContract.drawRecords = [
      createDrawRecord({
        id: "motion-blur-aurora-mirror:0",
        particleId: 44,
        particleIndex: 0,
        position: { x: 0.8, y: 2.9, z: 2.1 },
        previousPosition: { x: 0.46, y: 1.72, z: 1.33 },
        velocity: { x: 0.34, y: 1.18, z: 0.77 },
        renderMode: { enum: "motion_blur", rawToken: "Motion_Blur" },
        color: { r: 1, g: 1, b: 1 },
        alpha: 0.3,
        size: { x: 6, y: 12.5 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      })
    ];
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      sourceCoordinateSpace: "aurora-z-up",
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const proofFrame = new THREE.Group();
    proofFrame.scale.x = -1;
    proofFrame.add(group);
    proofFrame.updateMatrixWorld(true);
    const [mesh] = collectCanonicalDrawMeshes(group);
    const camera = new THREE.PerspectiveCamera(39.463808, 1460 / 810, 0.1, 100);
    camera.position.set(0.05148, 6.051473, -4.371987);
    camera.lookAt(0.03482, 0.01, 3.737955);
    camera.updateMatrixWorld(true);

    expect(updateAuroraVfxCanonicalCameraBillboards(proofFrame, camera)).toBe(1);
    proofFrame.updateMatrixWorld(true);
    const positions = mesh!.geometry.getAttribute("position");
    const a = new THREE.Vector3().fromBufferAttribute(positions, 0).applyMatrix4(mesh!.matrixWorld);
    const b = new THREE.Vector3().fromBufferAttribute(positions, 1).applyMatrix4(mesh!.matrixWorld);
    const c = new THREE.Vector3().fromBufferAttribute(positions, 2).applyMatrix4(mesh!.matrixWorld);
    const frontNormal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const towardCamera = camera.position
      .clone()
      .sub(a.clone().add(b).add(c).multiplyScalar(1 / 3))
      .normalize();
    const effectiveFrontFacingDot =
      frontNormal.dot(towardCamera) * Math.sign(mesh!.matrixWorld.determinant());

    expect(effectiveFrontFacingDot).toBeGreaterThan(0.5);
  });

  it("renders ordered backend runtimeEmitters without collapsing pure VFX to the first emitter", () => {
    const basePayload = createCanonicalPayload();
    const baseContract = basePayload.contracts.renderContract as Record<string, unknown>;
    const flameContract = {
      ...baseContract,
      emitterNodeName: "fx_flame",
      activeParticleCount: 1,
      drawParticleCount: 1,
      drawVertexCount: 6,
      drawRecords: [
        createDrawRecord({
          id: "flame:0",
          emitterNodeName: "fx_flame",
          particleId: 20,
          particleIndex: 0,
          position: { x: 0, y: 0, z: 0 },
          color: { r: 1, g: 0.4, b: 0.2 },
          alpha: 0.8,
          size: { x: 0.4, y: 0.4 },
          atlasUv: {
            u0: 0,
            v0: 0,
            u1: 0.5,
            v1: 0.5,
            frameIndex: 0,
            rawFrameIndex: 0,
            mapping: "row_major_top_down_v"
          }
        })
      ]
    };
    const smokeContract = {
      ...baseContract,
      emitterNodeName: "fx_smoke",
      activeParticleCount: 1,
      drawParticleCount: 1,
      drawVertexCount: 6,
      renderOrder: { value: 8, rawValue: 8 },
      drawRecords: [
        createDrawRecord({
          id: "smoke:0",
          emitterNodeName: "fx_smoke",
          particleId: 30,
          particleIndex: 0,
          position: { x: 1, y: 0, z: 0 },
          color: { r: 0.35, g: 0.35, b: 0.35 },
          alpha: 0.5,
          size: { x: 0.6, y: 0.6 },
          atlasUv: {
            u0: 0.5,
            v0: 0.5,
            u1: 1,
            v1: 1,
            frameIndex: 3,
            rawFrameIndex: 3,
            mapping: "row_major_top_down_v"
          }
        })
      ]
    };
    const payload: AuroraVfxPayload = {
      ...basePayload,
      contracts: {
        dependencyGraph: {
          version: "aurora-vfx-dependency-graph/v1",
          edges: [
            {
              edgeType: "texture",
              ownerPath: "mdl:fx_multi.mdl/emitter:fx_flame/texture",
              requestedResourceClass: "texture",
              requestedRef: "fx_flame_tex",
              selectedCandidate: { resourceKey: "fx_flame_tex.tga" }
            },
            {
              edgeType: "texture",
              ownerPath: "mdl:fx_multi.mdl/emitter:fx_smoke/texture",
              requestedResourceClass: "texture",
              requestedRef: "fx_smoke_tex",
              selectedCandidate: { resourceKey: "fx_smoke_tex.tga" }
            }
          ],
          diagnostics: []
        },
        runtimeEmitters: [
          {
            emitterIndex: 0,
            emitterNodeName: "fx_flame",
            renderContract: flameContract
          },
          {
            emitterIndex: 1,
            emitterNodeName: "fx_smoke",
            renderContract: smokeContract
          }
        ]
      }
    };
    const flameTexture = createTexture();
    const smokeTexture = createTexture();

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([
        ["fx_flame_tex", flameTexture],
        ["fx_smoke_tex", smokeTexture]
      ])
    });

    expect(isCanonicalAuroraVfxRenderablePayload(payload)).toBe(true);
    expect(resolveAuroraVfxCanonicalTextureReference(payload, "fx_flame")).toBe("fx_flame_tex");
    expect(resolveAuroraVfxCanonicalTextureReference(payload, "fx_smoke")).toBe("fx_smoke_tex");
    expect(group.userData.auroraVfxCanonicalRuntimeEmitterCount).toBe(2);
    expect(group.userData.auroraVfxCanonicalRuntimeEmitterNodeNames).toEqual([
      "fx_flame",
      "fx_smoke"
    ]);
    expect(group.userData.auroraVfxCanonicalDrawRecordIds).toEqual(["flame:0", "smoke:0"]);
    expect(group.userData.auroraVfxCanonicalEmitterNodeNames).toEqual([
      "fx_flame",
      "fx_smoke"
    ]);
    expect(group.userData.auroraVfxCanonicalRenderedDrawParticleCount).toBe(2);
    expect(group.userData.auroraVfxCanonicalRenderedVertexCount).toBe(12);

    const meshes = collectCanonicalDrawMeshes(group);
    expect(meshes).toHaveLength(2);
    expect(meshes[0]?.userData.auroraVfxCanonicalDrawRecordIds).toEqual(["flame:0"]);
    expect(meshes[0]?.userData.auroraVfxCanonicalTextureReference).toBe("fx_flame_tex");
    expect((meshes[0]?.material as THREE.MeshBasicMaterial).map?.source).toBe(
      flameTexture.source
    );
    expect(meshes[1]?.userData.auroraVfxCanonicalDrawRecordIds).toEqual(["smoke:0"]);
    expect(meshes[1]?.userData.auroraVfxCanonicalTextureReference).toBe("fx_smoke_tex");
    expect((meshes[1]?.material as THREE.MeshBasicMaterial).map?.source).toBe(
      smokeTexture.source
    );
  });

  it("preserves chunk runtimeEmitter resources when textured emitters render in the same package", () => {
    const texturedPayload = createCanonicalPayload();
    const chunkPayload = createCanonicalPayload({
      drawLane: "chunk_model",
      chunkResourceResolved: true
    });
    const texturedContract = texturedPayload.contracts.renderContract as Record<string, unknown>;
    const chunkContract = chunkPayload.contracts.renderContract as Record<string, unknown>;
    texturedContract.emitterNodeName = "fx_flame";
    chunkContract.emitterNodeName = "fx_chunk";
    const payload: AuroraVfxPayload = {
      ...texturedPayload,
      contracts: {
        dependencyGraph: {
          version: "aurora-vfx-dependency-graph/v1",
          edges: [
            {
              edgeType: "texture",
              ownerPath: "mdl:fx_mixed.mdl/emitter:fx_flame/texture",
              requestedResourceClass: "texture",
              requestedRef: "fx_canonical_fire",
              selectedCandidate: { resourceKey: "fx_canonical_fire.tga" }
            },
            {
              edgeType: "chunk_model",
              ownerPath: "mdl:fx_mixed.mdl/emitter:fx_chunk/chunkName",
              requestedResourceClass: "chunk_model",
              requestedRef: "fx_chunk01",
              selectedCandidate: { resourceKey: "fx_chunk01.glb" }
            }
          ],
          diagnostics: []
        },
        runtimeEmitters: [
          {
            emitterIndex: 0,
            emitterNodeName: "fx_flame",
            renderContract: texturedContract
          },
          {
            emitterIndex: 1,
            emitterNodeName: "fx_chunk",
            renderContract: chunkContract
          }
        ]
      }
    };

    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      chunkModelsByResourceKey: new Map([["fx_chunk01.glb", createChunkModelTemplate()]]),
      modelGraph: {
        nodes: [
          {
            nodeKind: "transform",
            nodeName: "chunk_pivot",
            transform: { position: [4, 0, 0] }
          },
          {
            nodeKind: "emitter",
            nodeName: "fx_chunk",
            parentNodeName: "chunk_pivot"
          },
          {
            nodeKind: "emitter",
            nodeName: "fx_flame"
          }
        ]
      }
    });
    const meshes = collectCanonicalDrawMeshes(group);
    const chunkModelGroups: THREE.Group[] = [];
    group.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkLaneModelGroup === true) {
        chunkModelGroups.push(node as THREE.Group);
      }
    });

    expect(meshes).toHaveLength(1);
    expect(group.userData.auroraVfxCanonicalDrawLane).toBe("textured_quad");
    expect(group.userData.auroraVfxCanonicalRenderedDrawParticleCount).toBe(2);
    expect(group.userData.auroraVfxCanonicalChunkLaneCount).toBe(1);
    expect(group.userData.auroraVfxCanonicalChunkLaneChunkNames).toEqual(["fx_chunk01"]);
    expect(group.userData.auroraVfxCanonicalChunkLaneResourceResolveStatuses).toEqual([
      "resolved"
    ]);
    expect(group.userData.auroraVfxCanonicalChunkLaneResolvedResourceKeys).toEqual([
      "fx_chunk01.glb"
    ]);
    expect(group.userData.auroraVfxCanonicalChunkLaneResolvedResourceKey).toBe("fx_chunk01.glb");
    expect(group.userData.auroraVfxCanonicalChunkLaneRendererPending).toBe(false);
    expect(chunkModelGroups).toHaveLength(1);
    expect(chunkModelGroups[0]?.parent?.name).toBe("aurora_vfx_model_graph_node:chunk_pivot");
  });

  it("does not add a diagnostic box when only mixed-package chunk models remain", () => {
    const texturedPayload = createCanonicalPayload();
    const chunkPayload = createCanonicalPayload({
      drawLane: "chunk_model",
      chunkResourceResolved: true
    });
    const texturedContract = texturedPayload.contracts.renderContract as Record<string, unknown>;
    const chunkContract = chunkPayload.contracts.renderContract as Record<string, unknown>;
    texturedContract.emitterNodeName = "fx_flame";
    texturedContract.activeParticleCount = 0;
    texturedContract.drawParticleCount = 0;
    texturedContract.drawVertexCount = 0;
    texturedContract.drawRecords = [];
    chunkContract.emitterNodeName = "fx_chunk";
    const payload: AuroraVfxPayload = {
      ...texturedPayload,
      contracts: {
        dependencyGraph: {
          version: "aurora-vfx-dependency-graph/v1",
          edges: [
            {
              edgeType: "texture",
              ownerPath: "mdl:fx_mixed.mdl/emitter:fx_flame/texture",
              requestedResourceClass: "texture",
              requestedRef: "fx_canonical_fire",
              selectedCandidate: { resourceKey: "fx_canonical_fire.tga" }
            },
            {
              edgeType: "chunk_model",
              ownerPath: "mdl:fx_mixed.mdl/emitter:fx_chunk/chunkName",
              requestedResourceClass: "chunk_model",
              requestedRef: "fx_chunk01",
              selectedCandidate: { resourceKey: "fx_chunk01.glb" }
            }
          ],
          diagnostics: []
        },
        runtimeEmitters: [
          {
            emitterIndex: 0,
            emitterNodeName: "fx_flame",
            renderContract: texturedContract
          },
          {
            emitterIndex: 1,
            emitterNodeName: "fx_chunk",
            renderContract: chunkContract
          }
        ]
      }
    };
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      chunkModelsByResourceKey: new Map([["fx_chunk01.glb", createChunkModelTemplate()]])
    });
    const chunkModelInstances: THREE.Object3D[] = [];
    const diagnosticPlaceholders: THREE.Object3D[] = [];
    group.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkLaneModelInstance === true) {
        chunkModelInstances.push(node);
      }
      if (node.userData.auroraVfxCanonicalDiagnosticPlaceholder === true) {
        diagnosticPlaceholders.push(node);
      }
    });

    expect(group.userData.auroraVfxCanonicalRenderedDrawParticleCount).toBe(0);
    expect(group.userData.auroraVfxCanonicalRenderedChunkModelCount).toBe(2);
    expect(chunkModelInstances).toHaveLength(2);
    expect(diagnosticPlaceholders).toHaveLength(0);
  });

  it("preserves ProgFX Type 4 owner-phase evidence in canonical renderer metadata", () => {
    const payload = createCanonicalPayload({ progFxType4OwnerRecord: true });
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });

    expect(group.userData.auroraVfxProgFxType4ProofStatus).toBe(
      "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified"
    );
    expect(group.userData.auroraVfxProgFxType4RowId).toBe(304);
    expect(group.userData.auroraVfxProgFxType4Label).toBe("LightBlue5m");
    expect(group.userData.auroraVfxProgFxType4Param1AnimationRaw).toBe("Blue_5m");
    expect(group.userData.auroraVfxProgFxType4Animation).toBe("Blue_5m");
    expect(group.userData.auroraVfxProgFxType4Param1AnimationStatus).toBe(
      "source-backed-progfx-type4-param1-animation-token-preserved"
    );
    expect(group.userData.auroraVfxProgFxType4SymbolicColor).toBe("Blue");
    expect(group.userData.auroraVfxProgFxType4TokenRadiusMeters).toBe(5);
    expect(group.userData.auroraVfxProgFxType4RadiusMeters).toBe(13.3);
    expect(group.userData.auroraVfxProgFxType4SourceMdlRadiusMeters).toBe(13.3);
    expect(group.userData.auroraVfxProgFxType4SourceMdlRadiusFrames).toEqual([0, 13.3]);
    expect(group.userData.auroraVfxProgFxType4SourceMdlColor).toEqual([0.5, 0.5, 1]);
    expect(group.userData.auroraVfxProgFxType4Param3CastShadowsRaw).toBe("0");
    expect(group.userData.auroraVfxProgFxType4Param3CastShadowsStatus).toBe(
      "source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent"
    );
    expect(group.userData.auroraVfxProgFxType4Param4PriorityRaw).toBe("20");
    expect(group.userData.auroraVfxProgFxType4Param5ProximitySuppressionRaw).toBe("0");
    expect(group.userData.auroraVfxProgFxType4Param6AttachToSceneRaw).toBe("0");
    expect(group.userData.auroraVfxProgFxType4ParameterPreservationProofStatus).toBe(
      "source-backed-progfx-type4-param1-param8-raw-preserved"
    );
    expect(group.userData.auroraVfxProgFxType4ColorR).toBeCloseTo(0.5, 5);
    expect(group.userData.auroraVfxProgFxType4ColorG).toBeCloseTo(0.5, 5);
    expect(group.userData.auroraVfxProgFxType4ColorB).toBeCloseTo(1, 5);
    expect(group.userData.auroraVfxProgFxType4NotPlaceableTwoDaLight).toBe(true);
    expect(group.userData.auroraVfxProgFxType4NotMdlLightNode).toBe(true);
    expect(group.userData.auroraVfxProgFxType4RuntimeSchedulingStatus).toBe(
      "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified"
    );
    expect(group.userData.auroraVfxProgFxType4RuntimeSchedulingProofSource).toContain(
      "decompiled_all.c:348244 loads visualeffects.2da"
    );
    expect(group.userData.auroraVfxProgFxType4RuntimeSchedulingBlocker).toContain(
      "Param4/Param5/Param6/vision policy semantics are docs-backed"
    );
    expect(group.userData.auroraVfxProgFxType4SceneAttachmentPolicyStatus).toBe(
      "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights-retail-dataflow-blocked"
    );
    expect(group.userData.auroraVfxProgFxType4ProximitySuppressionPolicyStatus).toBe(
      "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light-retail-distance-blocked"
    );
    expect(group.userData.auroraVfxProgFxType4VisionMutationPolicyStatus).toBe(
      "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked"
    );
    expect(group.userData.auroraVfxProgFxType4ShadowPolicyStatus).toBe(
      "source-backed-progfx-type4-param3-item-light-shadow-toggle-retail-shadow-volume-projection-blocked"
    );
    expect(group.userData.auroraVfxProgFxType4VisualPreviewStatus).toBe(
      "backend-render-contract-source-record-no-scene-light"
    );
    expect(group.userData.auroraVfxProgFxType4PointLightPreviewStatus).toBe(
      "source-backed-fx-light-clr-pointlight-preview-scheduler-parity-blocked"
    );
    expect(group.userData.auroraVfxProgFxType4PointLightCount).toBe(1);
    expect(group.userData.auroraVfxProgFxType4OwnerVisualEffectRowId).toBe(153);
    expect(group.userData.auroraVfxProgFxType4OwnerVisualEffectLabel).toBe(
      "VFX_DUR_LIGHT_BLUE_5"
    );
    expect(group.userData.auroraVfxProgFxType4OwnerPhase).toBe("duration");
    expect(group.userData.auroraVfxProgFxType4OwnerProgFxRef).toBe("304");
    expect(group.userData.auroraVfxProgFxType4OwnerEffectConstructorKind).toBe(
      "EffectVisualEffect"
    );
    expect(group.userData.auroraVfxProgFxType4OwnerDurationType).toBe("temporary");
    expect(group.userData.auroraVfxRetailParityProof).toBe(false);

    const [mesh] = collectCanonicalDrawMeshes(group);
    expect(mesh!.userData.auroraVfxProgFxType4OwnerVisualEffectRowId).toBe(153);
    expect(mesh!.userData.auroraVfxProgFxType4OwnerVisualEffectLabel).toBe(
      "VFX_DUR_LIGHT_BLUE_5"
    );
    expect(mesh!.userData.auroraVfxProgFxType4RuntimeSchedulingStatus).toBe(
      "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified"
    );
    const [pointLight] = collectPointLights(group);
    expect(pointLight).toBeInstanceOf(THREE.PointLight);
    expect(pointLight?.userData.auroraVfxProgFxType4PreviewRole).toBe(
      "progfx-type4-point-light"
    );
    expect(pointLight?.userData.auroraVfxProgFxType4OwnerVisualEffectLabel).toBe(
      "VFX_DUR_LIGHT_BLUE_5"
    );
    expect(pointLight?.color.r).toBeCloseTo(0.5, 5);
    expect(pointLight?.color.g).toBeCloseTo(0.5, 5);
    expect(pointLight?.color.b).toBeCloseTo(1, 5);
    expect(pointLight?.intensity).toBeCloseTo(1, 5);
    expect(pointLight?.userData.auroraVfxProgFxType4PointLightIntensitySource).toContain(
      "color*intensity preserves the source vector"
    );
    expect(pointLight?.userData.auroraVfxProgFxType4PointLightIntensityProofStatus).toBe(
      "source-family-backed-fx_light_clr-mdl-rgb-vector-preserved-through-three-color-intensity"
    );
    expect(pointLight?.distance).toBeCloseTo(13.3, 5);
    expect(pointLight?.decay).toBe(1);
    expect(pointLight?.castShadow).toBe(false);
  });

  it("preserves ProgFX Type 4 vision owner-phase evidence in canonical renderer metadata", () => {
    const payload = createCanonicalPayload({ progFxType4VisionRecord: true });
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });

    expect(group.userData.auroraVfxProgFxType4ProofStatus).toBe(
      "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified"
    );
    expect(group.userData.auroraVfxProgFxType4RowId).toBe(329);
    expect(group.userData.auroraVfxProgFxType4Label).toBe("LightBlindvision");
    expect(group.userData.auroraVfxProgFxType4Animation).toBe("Blind_Vision");
    expect(group.userData.auroraVfxProgFxType4AnimationKind).toBe("vision");
    expect(group.userData.auroraVfxProgFxType4VisionMode).toBe("Blind_Vision");
    expect(group.userData.auroraVfxProgFxType4VisionParameterStatus).toBe(
      "docs-backed-progfx-type4-param1-vision-token-param4-priority"
    );
    expect(group.userData.auroraVfxProgFxType4SymbolicColor).toBe("");
    expect(group.userData.auroraVfxProgFxType4RadiusMeters).toBeNull();
    expect(group.userData.auroraVfxProgFxType4SourceMdlNodeName).toBe("AuroraLight02");
    expect(group.userData.auroraVfxProgFxType4SourceMdlAnimation).toBe("Blind_Vision");
    expect(group.userData.auroraVfxProgFxType4SourceMdlColor).toEqual([0.3, 0.3, 0.3]);
    expect(group.userData.auroraVfxProgFxType4SourceMdlRadiusMeters).toBe(7);
    expect(group.userData.auroraVfxProgFxType4SourceMdlRadiusFrames).toEqual([0, 7]);
    expect(group.userData.auroraVfxProgFxType4ColorR).toBeCloseTo(0, 5);
    expect(group.userData.auroraVfxProgFxType4ColorG).toBeCloseTo(0, 5);
    expect(group.userData.auroraVfxProgFxType4ColorB).toBeCloseTo(0, 5);
    expect(group.userData.auroraVfxProgFxType4RuntimeSchedulingProofSource).toContain(
      "decompiled_all.c:348244 loads visualeffects.2da"
    );
    expect(group.userData.auroraVfxProgFxType4VisionMutationPolicyStatus).toBe(
      "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked"
    );
    expect(group.userData.auroraVfxProgFxType4ShadowPolicyStatus).toBe(
      "source-backed-progfx-type4-non-item-cast-shadow-absent-vanilla-rows"
    );
    expect(group.userData.auroraVfxProgFxType4OwnerVisualEffectRowId).toBe(242);
    expect(group.userData.auroraVfxProgFxType4OwnerVisualEffectLabel).toBe(
      "VFX_DUR_BLINDVISION"
    );
    expect(group.userData.auroraVfxProgFxType4OwnerPhase).toBe("duration");
    expect(group.userData.auroraVfxProgFxType4OwnerProgFxRef).toBe("329");
    expect(group.userData.auroraVfxRetailParityProof).toBe(false);

    const [mesh] = collectCanonicalDrawMeshes(group);
    expect(mesh!.userData.auroraVfxProgFxType4VisionMode).toBe("Blind_Vision");
    expect(mesh!.userData.auroraVfxProgFxType4OwnerVisualEffectRowId).toBe(242);
    expect(group.userData.auroraVfxProgFxType4PointLightCount).toBeUndefined();
    expect(collectPointLights(group)).toHaveLength(0);
  });

  it("preserves multiple ProgFX Type 4 scheduler requests as separate metadata markers", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-progfx-type4-multi-request-policy",
      timeSeconds: 0.5,
      seed: 37
    });
    const group = createAuroraVfxCanonicalRenderGroup(fixture.payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });

    expect(group.userData.auroraVfxProgFxType4ProofStatus).toBe("");
    expect(collectPointLights(group)).toHaveLength(0);
    expect(group.userData.auroraVfxProgFxType4MultiRequestPointLightPreviewStatus).toBe(
      "blocked-runtime-oracle-multi-request-no-pointlight-until-retail-scheduler-parity"
    );
    expect(group.userData.auroraVfxProgFxType4MultiRequestPointLightPreviewSource).toContain(
      "visible warm-yellow Type 4 pixel signal"
    );
    expect(group.userData.auroraVfxProgFxType4MultiRequestPointLightPreviewBlocker).toContain(
      "single light request"
    );
    expect(group.userData.auroraVfxProgFxType4MultiRequestCount).toBe(4);
    expect(group.userData.auroraVfxProgFxType4MultiRequestLightCount).toBe(2);
    expect(group.userData.auroraVfxProgFxType4MultiRequestVisionCount).toBe(2);
    expect(group.userData.auroraVfxProgFxType4MultiRequestEqualPriorityLightTieCount).toBe(1);
    expect(group.userData.auroraVfxProgFxType4MultiRequestPointLightCount).toBe(0);
    expect(group.userData.auroraVfxProgFxType4MultiRequestRuntimeOracleObservedSignal).toBe(
      "warm-yellow"
    );
    expect(group.userData.auroraVfxProgFxType4MultiRequestCanonicalParityPromoted).toBe(false);
    const [mesh] = collectCanonicalDrawMeshes(group);
    expect(mesh!.userData.auroraVfxProgFxType4ProofStatus).toBe("");

    const requestMarkers: THREE.Object3D[] = [];
    group.traverse((node) => {
      if (
        node.userData.auroraVfxProgFxType4MultiRequestStatus ===
        "blocked-runtime-oracle-multi-request-no-pointlight-until-retail-scheduler-parity"
      ) {
        requestMarkers.push(node);
      }
    });
    expect(requestMarkers).toHaveLength(4);
    expect(requestMarkers.map((node) => node.userData.auroraVfxProgFxType4RowId)).toEqual([
      333,
      304,
      308,
      328
    ]);
    expect(requestMarkers.map((node) => node.userData.auroraVfxProgFxType4Label)).toEqual([
      "LightAreaBlackout",
      "LightBlue5m",
      "LightYellow5m",
      "LightDarkvision"
    ]);
    expect(requestMarkers.map((node) => node.userData.auroraVfxProgFxType4Priority)).toEqual([
      13,
      20,
      20,
      51
    ]);
    expect(requestMarkers[0]!.userData.auroraVfxProgFxType4AttachToScene).toBe(true);
    expect(requestMarkers[0]!.position.x).toBeCloseTo(0.18, 5);
    expect(requestMarkers[1]!.position.y).toBeCloseTo(0.18, 5);
    expect(requestMarkers[3]!.userData.auroraVfxProgFxType4ProximitySuppression).toBe(true);
    expect(requestMarkers[3]!.userData.auroraVfxProgFxType4SourceMdlRadiusMeters).toBe(15);
    expect(
      requestMarkers[1]!.userData.auroraVfxProgFxType4MultiRequestPointLightPreviewSource
    ).toContain("visible warm-yellow Type 4 pixel signal");
    expect(
      requestMarkers[3]!.userData.auroraVfxProgFxType4RequestDiagnosticPositionSource
    ).toBe("local diagnostic ring only; not retail scheduler position parity");
  });

  it("applies runtime rotation radians to textured quad vertices", () => {
    const payload = createCanonicalPayload();
    const record = payload.contracts.renderContract.drawRecords[0] as {
      rotationRadians: number;
    };
    record.rotationRadians = Math.PI / 2;
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
    });
    const [mesh] = collectCanonicalDrawMeshes(group);
    const position = mesh!.geometry.getAttribute("position");

    expect(group.userData.auroraVfxCanonicalRotationRadians[0]).toBeCloseTo(Math.PI / 2, 6);
    expect(mesh!.userData.auroraVfxCanonicalRotationRadians[0]).toBeCloseTo(Math.PI / 2, 6);
    expect(position.getX(0)).toBeCloseTo(0.1, 5);
    expect(position.getY(0)).toBeCloseTo(0.1, 5);
    expect(position.getZ(0)).toBeCloseTo(0.1, 5);
  });

  it("routes renderorder through completed Aurora draw-queue records", () => {
    const texture = createTexture();
    const low = createAuroraVfxCanonicalRenderGroup(createCanonicalPayload({ renderOrder: 3 }), {
      particleTexturesByReference: new Map([["fx_canonical_fire", texture]]),
      referencedObjectContextKey: "placeable-low"
    });
    const high = createAuroraVfxCanonicalRenderGroup(createCanonicalPayload({ renderOrder: 9 }), {
      particleTexturesByReference: new Map([["fx_canonical_fire", texture]]),
      referencedObjectContextKey: "placeable-high"
    });

    expect(collectCanonicalDrawMeshes(low)[0]?.renderOrder).toBe(0);
    expect(collectCanonicalDrawMeshes(high)[0]?.renderOrder).toBe(0);
    expect(
      collectCanonicalDrawMeshes(low)[0]?.userData.auroraVfxDrawQueueRecord
    ).toMatchObject({
      version: "aurora-vfx-draw-queue/v1",
      referencedObjectContextKey: "placeable-low",
      renderOrderShort: 3,
      depthKeySource: "three-render-item-camera-depth-z",
      comparatorSource: "aurora-fun-00a7fb8c"
    });
    expect(
      collectCanonicalDrawMeshes(high)[0]?.userData.auroraVfxDrawQueueRenderOrderShort
    ).toBe(9);
    expect(low.userData.auroraVfxCanonicalRenderOrder).toBe(3);
    expect(high.userData.auroraVfxCanonicalRenderOrder).toBe(9);
  });

  it("shows a diagnostic placeholder for missing texture without fake particle draw geometry", () => {
    const group = createAuroraVfxCanonicalRenderGroup(createCanonicalPayload());

    expect(group.userData.auroraVfxCanonicalTextureStatus).toBe("missing");
    expect(group.userData.auroraVfxCanonicalRenderedDrawParticleCount).toBe(0);
    expect(group.userData.auroraVfxCanonicalRenderedVertexCount).toBe(0);
    expect(group.userData.auroraVfxCanonicalRenderedBoundsWidth).toBe(0);
    expect(group.userData.auroraVfxCanonicalRenderedBoundsHeight).toBe(0);
    expect(group.userData.auroraVfxCanonicalDiagnosticCodes).toEqual(
      expect.arrayContaining(["VFX_CANONICAL_TEXTURE_RESOURCE_MISSING"])
    );
    expect(collectCanonicalDrawMeshes(group)).toHaveLength(0);
    const placeholder = group.children[0];
    expect(placeholder?.userData.auroraVfxCanonicalDiagnosticPlaceholder).toBe(true);
    expect(placeholder?.userData.auroraVfxCanonicalFakeParticleDraw).toBe(false);
  });

  it("preserves chunk lane separately from textured quad geometry", () => {
    const group = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model" }),
      {
        particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
      }
    );

    expect(group.userData.auroraVfxCanonicalDrawLane).toBe("chunk_model");
    expect(group.userData.auroraVfxCanonicalRenderedDrawParticleCount).toBe(0);
    expect(group.userData.auroraVfxCanonicalRenderedVertexCount).toBe(0);
    expect(group.userData.auroraVfxCanonicalRenderedBoundsWidth).toBe(0);
    expect(group.userData.auroraVfxCanonicalRenderedBoundsHeight).toBe(0);
    expect(group.userData.auroraVfxCanonicalChunkLaneResourceResolveStatus).toBe("unresolved");
    expect(group.userData.auroraVfxCanonicalChunkLaneChunkName).toBe("fx_chunk01");
    expect(group.userData.auroraVfxCanonicalChunkLaneResolvedResourceKey).toBe("");
    expect(group.userData.auroraVfxCanonicalChunkLaneRendererPending).toBe(true);
    expect(group.userData.auroraVfxCanonicalDiagnosticCodes).toEqual(
      expect.arrayContaining(["VFX_CANONICAL_CHUNK_LANE_RENDERER_PENDING"])
    );
    expect(collectCanonicalDrawMeshes(group)).toHaveLength(0);
    expect(group.children[0]?.userData.auroraVfxCanonicalChunkLanePlaceholder).toBe(true);
    expect(group.children[0]?.userData.auroraVfxCanonicalTexturedQuadLane).toBe(false);
  });

  it("preserves resolved chunk model resources while keeping the renderer pending", () => {
    const group = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model", chunkResourceResolved: true }),
      {
        particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]])
      }
    );

    expect(group.userData.auroraVfxCanonicalDrawLane).toBe("chunk_model");
    expect(group.userData.auroraVfxCanonicalChunkLaneResourceResolveStatus).toBe("resolved");
    expect(group.userData.auroraVfxCanonicalChunkLaneChunkName).toBe("fx_chunk01");
    expect(group.userData.auroraVfxCanonicalChunkLaneResolvedResourceKey).toBe("fx_chunk01.glb");
    expect(group.userData.auroraVfxCanonicalChunkLaneResolvedResourceLayer).toBe("hak");
    expect(group.userData.auroraVfxCanonicalChunkLaneResolvedResourcePath).toBe(
      "hak/models/fx_chunk01.glb"
    );
    expect(group.userData.auroraVfxCanonicalChunkLaneResolvedResourceHash).toBe(
      "chunk-glb-hash"
    );
    expect(group.userData.auroraVfxCanonicalChunkLaneResolvedResourceCandidateId).toBe(
      "candidate:fx_chunk01.glb"
    );
    expect(group.userData.auroraVfxCanonicalChunkLaneRendererPending).toBe(true);
    expect(group.userData.auroraVfxCanonicalRenderedDrawParticleCount).toBe(0);
    expect(group.userData.auroraVfxCanonicalRenderedVertexCount).toBe(0);
    expect(collectCanonicalDrawMeshes(group)).toHaveLength(0);
    expect(group.children[0]?.userData.auroraVfxCanonicalChunkLanePlaceholder).toBe(true);
  });

  it("instances supplied chunk model templates without creating textured fallback quads", () => {
    const chunkModelTemplate = createChunkModelTemplate();
    const group = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model", chunkResourceResolved: true }),
      {
        chunkModelsByResourceKey: new Map([["fx_chunk01.glb", chunkModelTemplate]]),
        chunkModelDeliveryUrlsByResourceKey: new Map([
          ["fx_chunk01.glb", "/delivery/fx_chunk01.glb"]
        ])
      }
    );
    const chunkModelGroups = group.children.filter(
      (child) => child.userData.auroraVfxCanonicalChunkLaneModelGroup === true
    );
    const chunkModelInstances: THREE.Object3D[] = [];
    group.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkLaneModelInstance === true) {
        chunkModelInstances.push(node);
      }
    });

    expect(group.userData.auroraVfxCanonicalDrawLane).toBe("chunk_model");
    expect(group.userData.auroraVfxCanonicalChunkLaneResourceResolveStatus).toBe("resolved");
    expect(group.userData.auroraVfxCanonicalChunkLaneRendererPending).toBe(false);
    expect(group.userData.auroraVfxCanonicalChunkLaneModelPreviewStatus).toBe(
      "applied-local-model-preview-retail-unverified"
    );
    expect(group.userData.auroraVfxCanonicalRenderedChunkModelCount).toBe(2);
    expect(group.userData.auroraVfxCanonicalRenderedDrawParticleCount).toBe(0);
    expect(group.userData.auroraVfxCanonicalRenderedVertexCount).toBe(0);
    expect(group.userData.auroraVfxCanonicalRenderedBoundsWidth).toBeGreaterThan(0);
    expect(group.userData.auroraVfxCanonicalDiagnosticCodes).toEqual(
      expect.arrayContaining(["VFX_CANONICAL_CHUNK_MODEL_PREVIEW_RETAIL_PROOF_PENDING"])
    );
    expect(group.userData.auroraVfxCanonicalDiagnosticCodes).not.toContain(
      "VFX_CANONICAL_CHUNK_LANE_RENDERER_PENDING"
    );
    expect(collectCanonicalDrawMeshes(group)).toHaveLength(0);
    expect(chunkModelGroups).toHaveLength(1);
    expect(chunkModelInstances).toHaveLength(2);
    expect(chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkLaneResolvedResourceKey).toBe(
      "fx_chunk01.glb"
    );
    expect(chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkLaneDeliveryUrl).toBe(
      "/delivery/fx_chunk01.glb"
    );
    expect(chunkModelInstances[0]?.position.toArray()).toEqual([0.25, 0.5, 0.75]);
    expect(chunkModelInstances[0]?.rotation.z).toBeCloseTo(0.4, 10);
    expect(chunkModelInstances[0]?.scale.toArray()).toEqual([0.5, 0.5, 0.5]);
    expect(chunkModelInstances[1]?.scale.toArray()).toEqual([0.75, 0.75, 0.75]);
    expect(chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkParticleRotationAxisZ).toBe(1);
    expect(
      chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkParticleRotationAxisSource
    ).toContain("decompiled_all.c:852762-852822");
    expect(chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkParticleScaleX).toBe(0.5);
    expect(chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkParticleScaleY).toBe(0.25);
    expect(chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkUniformScaleApplied).toBe(true);
    expect(chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkUniformScale).toBe(0.5);
    expect(chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkUniformScaleProfile).toBe(
      "source-decomp-model-init-particle-size-uniform-scale"
    );
    expect(chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkUniformScaleSource).toContain(
      "nwtoolset.exe:0x00a28a68-0x00a28a7a"
    );
    expect(chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkModelInstanceRef).toBe(
      "emit_chunk:chunk:31:0.200000"
    );
    expect(chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkModelRuntimeStatus).toBe(
      "active"
    );
  });

  it("uses landed Chunk contact orientation and suppresses particleRot", () => {
    const group = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({
        drawLane: "chunk_model",
        chunkResourceResolved: true,
        chunkLanded: true
      }),
      {
        chunkModelsByResourceKey: new Map([
          ["fx_chunk01.glb", createChunkModelTemplate()]
        ]),
        sourceCoordinateSpace: "aurora-z-up"
      }
    );
    const chunkModelInstances: THREE.Object3D[] = [];
    group.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkLaneModelInstance === true) {
        chunkModelInstances.push(node);
      }
    });
    const landed = chunkModelInstances[0]!;
    const expected = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2
    );
    const transformedUp = new THREE.Vector3(0, 1, 0).applyQuaternion(landed.quaternion);

    expect(landed.quaternion.angleTo(expected)).toBeCloseTo(0, 10);
    expect(transformedUp.x).toBeCloseTo(0, 10);
    expect(transformedUp.y).toBeCloseTo(0, 10);
    expect(transformedUp.z).toBeCloseTo(1, 10);
    expect(landed.userData.auroraVfxCanonicalChunkParticleLanded).toBe(true);
    expect(
      landed.userData.auroraVfxCanonicalChunkParticleContactOrientationApplied
    ).toBe(true);
    expect(
      landed.userData.auroraVfxCanonicalChunkParticleRotationSuppressedAfterLanding
    ).toBe(true);
    expect(
      landed.userData.auroraVfxCanonicalChunkParticleContactOrientationSource
    ).toContain("decompiled_all.c:855097-855123");
  });

  it("runs source-MDL child VFX once per live Chunk model instance at that particle age", () => {
    const nestedPayload = createCanonicalPayload();
    nestedPayload.contracts.runtimeEmitters = [
      {
        emitterIndex: 0,
        emitterNodeName: "chunk_smoke",
        selectedAnimation: {
          animationName: "impact",
          previousTimeSeconds: 0,
          currentTimeSeconds: 1,
          blendWeight: 1
        }
      }
    ];
    const group = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model", chunkResourceResolved: true }),
      {
        particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
        chunkModelsByResourceKey: new Map([["fx_chunk01.glb", createChunkModelTemplate()]]),
        chunkModelRuntimePayloadsByResourceKey: new Map([
          [
            "fx_chunk01.glb",
            {
              payload: nestedPayload,
              modelGraph: {
                nodes: [
                  { nodeKind: "transform", nodeName: "fx_chunk01" },
                  {
                    nodeKind: "emitter",
                    nodeName: "chunk_smoke",
                    parentNodeName: "fx_chunk01"
                  }
                ]
              },
              sourceModelObjectKey: "retail/models/fx_chunk01.mdl"
            }
          ]
        ])
      }
    );
    const chunkModelInstances: THREE.Object3D[] = [];
    const nestedRuntimeGroups: THREE.Object3D[] = [];
    group.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkLaneModelInstance === true) {
        chunkModelInstances.push(node);
      }
      if (node.userData.auroraVfxCanonicalChunkModelNestedRuntime === true) {
        nestedRuntimeGroups.push(node);
      }
    });

    expect(chunkModelInstances).toHaveLength(2);
    expect(nestedRuntimeGroups).toHaveLength(2);
    expect(
      chunkModelInstances.map(
        (entry) => entry.userData.auroraVfxCanonicalChunkModelNestedRuntimeStatus
      )
    ).toEqual([
      "source-model-impact-runtime-attached",
      "source-model-impact-runtime-attached"
    ]);
    expect(
      nestedRuntimeGroups.map(
        (entry) => entry.userData.auroraVfxCanonicalChunkModelNestedRuntimeTimeSeconds
      )
    ).toEqual([0.2, 0.4]);
    expect(
      nestedRuntimeGroups.map(
        (entry) => entry.userData.auroraVfxCanonicalChunkModelNestedRuntimeSourceModelObjectKey
      )
    ).toEqual(["retail/models/fx_chunk01.mdl", "retail/models/fx_chunk01.mdl"]);
    expect(
      nestedRuntimeGroups.map(
        (entry) => entry.userData.auroraVfxCanonicalChunkModelNestedRuntimeAnimationName
      )
    ).toEqual(["impact", "impact"]);
    expect(
      nestedRuntimeGroups.map(
        (entry) => entry.userData.auroraVfxCanonicalChunkModelNestedRuntimeAnimationStartPolicy
      )
    ).toEqual(["once_on_particle_activation", "once_on_particle_activation"]);
    expect(collectCanonicalDrawMeshes(group)).toHaveLength(2);
  });

  it("isolates nested emitter runtime from an arbitrary live Chunk model visual scale", () => {
    const arbitraryResourceKey = "renamed_fragment_a.glb";
    const outerPayload = createCanonicalPayload({
      drawLane: "chunk_model",
      chunkResourceResolved: true
    });
    const dependencyEdge = outerPayload.contracts.dependencyGraph.edges[0] as Record<
      string,
      any
    >;
    dependencyEdge.requestedRef = "renamed_fragment_a";
    dependencyEdge.selectedCandidate = {
      ...dependencyEdge.selectedCandidate,
      requestedRef: "renamed_fragment_a",
      resourceKey: arbitraryResourceKey,
      sourcePath: `hak/models/${arbitraryResourceKey}`
    };
    const outerContract = outerPayload.contracts.renderContract as Record<string, any>;
    const outerChunkLane = outerContract.chunkLane as Record<string, any>;
    outerChunkLane.chunkName = "renamed_fragment_a";
    outerChunkLane.resolvedResource = {
      ...outerChunkLane.resolvedResource,
      requestedRef: "renamed_fragment_a",
      resourceKey: arbitraryResourceKey,
      sourcePath: `hak/models/${arbitraryResourceKey}`
    };

    const nestedPayload = createCanonicalPayload();
    nestedPayload.contracts.runtimeEmitters = [
      {
        emitterIndex: 0,
        emitterNodeName: "renamed_child_emitter_b",
        selectedAnimation: {
          animationName: "impact",
          previousTimeSeconds: 0,
          currentTimeSeconds: 1,
          blendWeight: 1
        }
      }
    ];
    const group = createAuroraVfxCanonicalRenderGroup(outerPayload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      chunkModelsByResourceKey: new Map([
        [arbitraryResourceKey, createChunkModelTemplate()]
      ]),
      chunkModelRuntimePayloadsByResourceKey: new Map([
        [
          arbitraryResourceKey,
          {
            payload: nestedPayload,
            modelGraph: {
              nodes: [
                { nodeKind: "transform", nodeName: "renamed_fragment_a" },
                {
                  nodeKind: "emitter",
                  nodeName: "renamed_child_emitter_b",
                  parentNodeName: "renamed_fragment_a"
                }
              ]
            },
            sourceModelObjectKey: "neutral/models/renamed_fragment_a.mdl"
          }
        ]
      ])
    });
    const modelInstances: THREE.Object3D[] = [];
    const nestedRuntimeGroups: THREE.Object3D[] = [];
    group.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkLaneModelInstance === true) {
        modelInstances.push(node);
      }
      if (node.userData.auroraVfxCanonicalChunkModelNestedRuntime === true) {
        nestedRuntimeGroups.push(node);
      }
    });
    group.updateMatrixWorld(true);

    expect(modelInstances).toHaveLength(2);
    expect(nestedRuntimeGroups).toHaveLength(2);
    expect(modelInstances[0]!.getWorldScale(new THREE.Vector3()).toArray()).toEqual([
      0.5,
      0.5,
      0.5
    ]);
    expect(nestedRuntimeGroups[0]!.getWorldScale(new THREE.Vector3()).toArray()).toEqual([
      1,
      1,
      1
    ]);
    expect(nestedRuntimeGroups[0]!.position.toArray()).toEqual(
      modelInstances[0]!.position.toArray()
    );
    expect(
      nestedRuntimeGroups[0]!.userData
        .auroraVfxCanonicalChunkModelVisualScaleIsolation
    ).toBe("nested-emitter-runtime-excludes-live-chunk-model-visual-scale");
  });

  it("renders each arbitrary Chunk instance from its own scheduler-bound child frame", () => {
    const outerPayload = createCanonicalPayload({
      drawLane: "chunk_model",
      chunkResourceResolved: true
    });
    const outerContract = outerPayload.contracts.renderContract as Record<string, any>;
    const particles = outerContract.chunkLane.particleInstances as Array<Record<string, any>>;
    const fallbackPayload = createCanonicalPayload();
    fallbackPayload.contracts.runtimeEmitters = [
      {
        emitterIndex: 0,
        emitterNodeName: "neutral_child_emitter",
        selectedAnimation: {
          animationName: "impact",
          previousTimeSeconds: 0,
          currentTimeSeconds: 1,
          blendWeight: 1
        },
        renderContract: {
          ...(fallbackPayload.contracts.renderContract as Record<string, any>),
          emitterNodeName: "neutral_child_emitter",
          activeParticleCount: 0,
          drawParticleCount: 0,
          drawVertexCount: 0,
          drawRecords: []
        }
      }
    ];
    const makeInstanceEmitter = (drawRecordId: string, x: number) => {
      const compactDrawRecord = createDrawRecord({
        id: drawRecordId,
        emitterNodeName: "neutral_child_emitter",
        particleId: 1,
        particleIndex: 0,
        position: { x, y: 0, z: 0 },
        color: { r: 1, g: 0.5, b: 0.25 },
        alpha: 1,
        size: { x: 0.2, y: 0.2 },
        atlasUv: {
          u0: 0,
          v0: 0,
          u1: 1,
          v1: 1,
          frameIndex: 0,
          rawFrameIndex: 0,
          mapping: "row_major_top_down_v"
        }
      }) as Record<string, any>;
      [
        "recordKind",
        "emitterNodeName",
        "verticesPerParticle",
        "vertexCount",
        "drawRoute",
        "renderMode",
        "blendMode",
        "renderState",
        "renderOrder",
        "atlasProvenance"
      ].forEach((key) => delete compactDrawRecord[key]);
      return {
        emitterIndex: 0,
        emitterNodeName: "neutral_child_emitter",
        selectedAnimation: {
          animationName: "impact",
          previousTimeSeconds: 0,
          currentTimeSeconds: 1,
          blendWeight: 1
        },
        runtimeState: {
          sourceClockSeconds: 0.25,
          source: {
            nodeName: "neutral_child_emitter",
            simulation: { inherit: true }
          }
        },
        runtimeSnapshot: { activeParticleCount: 1 },
        renderContractFrame: {
          version: "aurora-vfx-child-render-contract-frame/v1",
          activeParticleCount: 1,
          drawParticleCount: 1,
          verticesPerDrawParticle: 6,
          drawVertexCount: 6,
          drawLane: "textured_quad",
          compactDrawRecords: [compactDrawRecord]
        }
      };
    };
    particles.forEach((particle, index) => {
      particle.modelRuntimeFrame = {
        version: "aurora-vfx-child-model-runtime-frame/v1",
        modelInstanceRef: particle.modelInstanceRef,
        sourceModelObjectKey: "neutral/models/child_fragment.mdl",
        localClockSeconds: index === 0 ? 0.2 : 0.4,
        rngLineage: {
          algorithm: "nwn-ee-msvc-rand15",
          initialSeed: index === 0 ? 101 : 303,
          finalSeed: index === 0 ? 202 : 404
        },
        runtimeEmitters: [
          makeInstanceEmitter(`neutral-instance-${index + 1}`, index === 0 ? 1 : 3)
        ]
      };
    });

    const group = createAuroraVfxCanonicalRenderGroup(outerPayload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      chunkModelsByResourceKey: new Map([
        ["fx_chunk01.glb", createChunkModelTemplate()]
      ]),
      chunkModelRuntimePayloadsByResourceKey: new Map([
        [
          "fx_chunk01.glb",
          {
            payload: fallbackPayload,
            sourceModelObjectKey: "neutral/models/child_fragment.mdl"
          }
        ]
      ])
    });
    const nestedRuntimeGroups: THREE.Object3D[] = [];
    group.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkModelNestedRuntime === true) {
        nestedRuntimeGroups.push(node);
      }
    });
    const drawRecordIds = collectCanonicalDrawMeshes(group).flatMap(
      (mesh) => mesh.userData.auroraVfxCanonicalDrawRecordIds as string[]
    );

    expect(nestedRuntimeGroups).toHaveLength(2);
    expect(
      nestedRuntimeGroups.map(
        (entry) => entry.userData.auroraVfxCanonicalChunkModelNestedRuntimeFrameSource
      )
    ).toEqual([
      "instance-bound-shared-scheduler-frame",
      "instance-bound-shared-scheduler-frame"
    ]);
    expect(drawRecordIds).toEqual(["neutral-instance-1", "neutral-instance-2"]);
  });

  it("keeps particles from a child emitter without inherit flags at their birth-world transform", () => {
    const outerPayload = createCanonicalPayload({
      drawLane: "chunk_model",
      chunkResourceResolved: true
    });
    const outerContract = outerPayload.contracts.renderContract as Record<string, any>;
    const outerChunkLane = outerContract.chunkLane as Record<string, any>;
    const createOuterFrameContract = (ageSeconds: number, x: number) => ({
      ...outerContract,
      activeParticleCount: 1,
      drawParticleCount: 0,
      drawVertexCount: 0,
      chunkLane: {
        ...outerChunkLane,
        activeParticleCount: 1,
        particleInstances: [
          {
            particleId: 31,
            position: { x, y: 0, z: 0 },
            rotationRadians: 0,
            rotationAxis: { x: 0, y: 0, z: 1 },
            particleOrientation: {
              axis: [1, 0, 0],
              angleRadians: 0
            },
            landed: false,
            ageSeconds,
            lifetimeSeconds: 2,
            modelInstanceRef: "emit_chunk:chunk:31:0.000000",
            modelRuntimeStatus: "active"
          }
        ]
      }
    });
    outerPayload.contracts.runtimeEmitters = [
      {
        emitterIndex: 0,
        emitterNodeName: "emit_chunk",
        renderContract: createOuterFrameContract(1, 10),
        runtimeFrames: [
          {
            tickIndex: 0,
            timeSeconds: 0,
            runtimeState: { sourceClockSeconds: 0 },
            runtimeSnapshot: { activeParticleCount: 1 },
            renderContract: createOuterFrameContract(0, 0)
          },
          {
            tickIndex: 1,
            timeSeconds: 1,
            runtimeState: { sourceClockSeconds: 1 },
            runtimeSnapshot: { activeParticleCount: 1 },
            renderContract: createOuterFrameContract(1, 10)
          }
        ]
      }
    ];

    const nestedPayload = createCanonicalPayload();
    const nestedContract = nestedPayload.contracts.renderContract as Record<string, any>;
    const emptyNestedContract = {
      ...nestedContract,
      emitterNodeName: "chunk_smoke",
      activeParticleCount: 0,
      drawParticleCount: 0,
      drawVertexCount: 0,
      drawRecords: []
    };
    const activeNestedContract = {
      ...nestedContract,
      emitterNodeName: "chunk_smoke",
      activeParticleCount: 1,
      drawParticleCount: 1,
      drawVertexCount: 6,
      drawRecords: [
        createDrawRecord({
          id: "chunk_smoke:particle:1",
          emitterNodeName: "chunk_smoke",
          particleId: 1,
          particleIndex: 0,
          ageSeconds: 0.5,
          lifetimeSeconds: 1,
          position: { x: 0, y: 0, z: 0 },
          color: { r: 0.2, g: 0.2, b: 0.2 },
          alpha: 0.5,
          size: { x: 0.2, y: 0.2 },
          atlasUv: {
            u0: 0,
            v0: 0,
            u1: 1,
            v1: 1,
            frameIndex: 0,
            rawFrameIndex: 0,
            mapping: "row_major_top_down_v"
          }
        })
      ]
    };
    nestedPayload.contracts.runtimeEmitters = [
      {
        emitterIndex: 0,
        emitterNodeName: "chunk_smoke",
        selectedAnimation: {
          animationName: "impact",
          previousTimeSeconds: 0,
          currentTimeSeconds: 1,
          blendWeight: 1
        },
        runtimeState: {
          emitterNodeName: "chunk_smoke",
          source: {
            nodeName: "chunk_smoke",
            simulation: {
              inherit: false,
              inheritLocal: false,
              inheritPart: false
            }
          }
        },
        renderContract: activeNestedContract,
        runtimeFrames: [
          {
            tickIndex: 0,
            timeSeconds: 0,
            runtimeState: { sourceClockSeconds: 0 },
            runtimeSnapshot: { activeParticleCount: 0 },
            renderContract: emptyNestedContract
          },
          {
            tickIndex: 1,
            timeSeconds: 1,
            runtimeState: { sourceClockSeconds: 1 },
            runtimeSnapshot: { activeParticleCount: 1 },
            renderContract: activeNestedContract
          }
        ]
      }
    ];

    const group = createAuroraVfxCanonicalRenderGroup(outerPayload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", createTexture()]]),
      chunkModelsByResourceKey: new Map([
        ["fx_chunk01.glb", createChunkModelTemplate()]
      ]),
      chunkModelRuntimePayloadsByResourceKey: new Map([
        [
          "fx_chunk01.glb",
          {
            payload: nestedPayload,
            modelGraph: {
              nodes: [
                { nodeKind: "transform", nodeName: "fx_chunk01" },
                {
                  nodeKind: "emitter",
                  nodeName: "chunk_smoke",
                  parentNodeName: "fx_chunk01"
                }
              ]
            },
            sourceModelObjectKey: "retail/models/fx_chunk01.mdl"
          }
        ]
      ]),
      sourceCoordinateSpace: "aurora-z-up"
    });

    expect(seekAuroraVfxCanonicalRuntimePlayback(group, 1)).toBe(true);
    const visibleOuterFrame = group.children.find((child) => child.visible)!;
    const [smokeMesh] = collectCanonicalDrawMeshes(visibleOuterFrame);
    const nestedRuntimeGroups: THREE.Object3D[] = [];
    visibleOuterFrame.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkModelNestedRuntime === true) {
        nestedRuntimeGroups.push(node);
      }
    });
    visibleOuterFrame.updateMatrixWorld(true);
    smokeMesh!.geometry.computeBoundingBox();
    const smokeWorldCenter = smokeMesh!.localToWorld(
      smokeMesh!.geometry.boundingBox!.getCenter(new THREE.Vector3())
    );

    expect(smokeWorldCenter.x).toBeCloseTo(5, 5);
    expect(nestedRuntimeGroups).toHaveLength(1);
    expect(nestedRuntimeGroups[0]!.children).toHaveLength(1);
    expect(
      nestedRuntimeGroups[0]!.userData
        .auroraVfxCanonicalRuntimePlaybackMaterialization
    ).toBe("lazy");
    expect(
      nestedRuntimeGroups[0]!.userData
        .auroraVfxCanonicalChunkModelWorldSpaceParticleHistoryRebased
    ).toBe(true);
    expect(
      nestedRuntimeGroups[0]!.userData.auroraVfxCanonicalChunkModelWorldSpaceEmitterNames
    ).toEqual(["chunk_smoke"]);
  });

  it("does not attach a generic child runtime when the Chunk impact animation is missing", () => {
    const nestedPayload = createCanonicalPayload();
    nestedPayload.contracts.runtimeEmitters = [
      {
        emitterIndex: 0,
        emitterNodeName: "chunk_smoke",
        selectedAnimation: {
          animationName: "default",
          previousTimeSeconds: 0,
          currentTimeSeconds: 1,
          blendWeight: 1
        }
      }
    ];
    const group = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model", chunkResourceResolved: true }),
      {
        chunkModelsByResourceKey: new Map([["fx_chunk01.glb", createChunkModelTemplate()]]),
        chunkModelRuntimePayloadsByResourceKey: new Map([
          ["fx_chunk01.glb", { payload: nestedPayload }]
        ])
      }
    );
    const chunkModelInstances: THREE.Object3D[] = [];
    const nestedRuntimeGroups: THREE.Object3D[] = [];
    group.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkLaneModelInstance === true) {
        chunkModelInstances.push(node);
      }
      if (node.userData.auroraVfxCanonicalChunkModelNestedRuntime === true) {
        nestedRuntimeGroups.push(node);
      }
    });

    expect(nestedRuntimeGroups).toHaveLength(0);
    expect(
      chunkModelInstances.map(
        (entry) => entry.userData.auroraVfxCanonicalChunkModelNestedRuntimeStatus
      )
    ).toEqual([
      "chunk-impact-animation-payload-mismatch",
      "chunk-impact-animation-payload-mismatch"
    ]);
  });

  it("binds a Chunk model material only from its source-MDL texture reference", () => {
    const chunkModelTemplate = createChunkModelTemplate() as THREE.Mesh;
    const chunkMaterial = chunkModelTemplate.material as THREE.MeshBasicMaterial;
    chunkMaterial.userData = {
      aurora: { textureReference: "fxpa_dirt" }
    };
    const dirtTexture = createTexture();
    dirtTexture.flipY = true;
    const group = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model", chunkResourceResolved: true }),
      {
        chunkModelsByResourceKey: new Map([["fx_chunk01.glb", chunkModelTemplate]]),
        chunkModelTexturesByReference: new Map([["fxpa_dirt", dirtTexture]])
      }
    );
    const chunkModelInstances: THREE.Object3D[] = [];
    group.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkLaneModelInstance === true) {
        chunkModelInstances.push(node);
      }
    });

    expect(chunkModelInstances).toHaveLength(2);
    expect(
      chunkModelInstances.map(
        (entry) => entry.userData.auroraVfxCanonicalChunkModelMaterialBindingStatus
      )
    ).toEqual(["source-reference-bound", "source-reference-bound"]);
    expect(
      chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkModelMaterialResolvedReferences
    ).toEqual(["fxpa_dirt"]);
    const instanceMaterials = chunkModelInstances.map(
      (entry) => (entry as THREE.Mesh).material as THREE.MeshBasicMaterial
    );
    expect(instanceMaterials[0]).not.toBe(chunkMaterial);
    expect(instanceMaterials[1]).not.toBe(chunkMaterial);
    expect(instanceMaterials[1]).not.toBe(instanceMaterials[0]);
    expect(instanceMaterials[0]?.map).not.toBe(dirtTexture);
    expect(instanceMaterials[0]?.map?.image).toBe(dirtTexture.image);
    expect(instanceMaterials[0]?.map?.flipY).toBe(false);
    expect(dirtTexture.flipY).toBe(true);
    expect(chunkMaterial.map).toBeNull();
    expect(
      chunkMaterial.userData.auroraVfxCanonicalChunkModelMaterialTextureSource
    ).toBeUndefined();
    expect(
      instanceMaterials[0]?.userData.auroraVfxCanonicalChunkModelMaterialTextureSource
    ).toBe(
      "shared Aurora model material adapter from source-MDL GLB material extras"
    );
  });

  it("routes Chunk model texture slots through the shared Aurora model material adapter", () => {
    const chunkMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff" });
    chunkMaterial.userData = {
      aurora: {
        textureReference: "chunk_diffuse",
        textureSlots: [
          { slot: 0, role: "diffuse", reference: "chunk_diffuse" },
          { slot: 1, role: "normal", reference: "chunk_normal" },
          { slot: 5, role: "emissive", reference: "chunk_emissive" },
          { slot: 4, role: "height", reference: "chunk_height_missing" }
        ]
      }
    };
    const chunkModelTemplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.3, 0.4),
      chunkMaterial
    );
    const diffuseTexture = createTexture();
    const normalTexture = createTexture();
    const emissiveTexture = createTexture();
    const group = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model", chunkResourceResolved: true }),
      {
        chunkModelsByResourceKey: new Map([["fx_chunk01.glb", chunkModelTemplate]]),
        chunkModelTexturesByReference: new Map([
          ["chunk_diffuse", diffuseTexture],
          ["chunk_normal", normalTexture],
          ["chunk_emissive", emissiveTexture]
        ])
      }
    );
    const instanceMaterials: THREE.MeshStandardMaterial[] = [];
    const chunkModelInstances: THREE.Object3D[] = [];
    group.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData.auroraVfxCanonicalChunkLaneModelInstance === true
      ) {
        chunkModelInstances.push(node);
        instanceMaterials.push(node.material as THREE.MeshStandardMaterial);
      }
    });

    expect(instanceMaterials).toHaveLength(2);
    expect(instanceMaterials[0]?.map?.image).toBe(diffuseTexture.image);
    expect(instanceMaterials[0]?.normalMap?.image).toBe(normalTexture.image);
    expect(instanceMaterials[0]?.emissiveMap?.image).toBe(emissiveTexture.image);
    expect(instanceMaterials[0]?.userData.auroraMaterialTextureSlotRoles).toEqual([
      "normal",
      "emissive"
    ]);
    expect(
      chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkModelMaterialResolvedReferences
    ).toEqual(["chunk_diffuse", "chunk_emissive", "chunk_normal"]);
    expect(
      chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkModelMaterialUnresolvedReferences
    ).toEqual(["chunk_height_missing"]);
    expect(
      chunkModelInstances[0]?.userData.auroraVfxCanonicalChunkModelMaterialBindingStatus
    ).toBe("source-reference-partially-bound");
    expect(chunkMaterial.map).toBeNull();
    expect(chunkMaterial.normalMap).toBeNull();
    expect(chunkMaterial.emissiveMap).toBeNull();
  });

  it("routes Chunk MTR and TXI sidecars through the shared Aurora model material adapter", () => {
    const chunkMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff" });
    chunkMaterial.name = "Aurora material chunk_surface";
    const chunkModelTemplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.3, 0.4),
      chunkMaterial
    );
    const diffuseTexture = createTexture();
    const group = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model", chunkResourceResolved: true }),
      {
        chunkModelsByResourceKey: new Map([["fx_chunk01.glb", chunkModelTemplate]]),
        chunkModelTexturesByReference: new Map([["chunk_diffuse", diffuseTexture]]),
        chunkModelAuroraMaterial: {
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
                textureSlots: [{ slot: 0, role: "diffuse", reference: "chunk_diffuse" }]
              }
            }
          ]
        },
        chunkModelTextureBindings: [
          {
            reference: "chunk_diffuse",
            assetId: "texture-chunk-diffuse",
            fileName: "chunk_diffuse.tga",
            objectKey: "module/textures/chunk_diffuse.tga",
            deliveryUrl: "/assets/chunk_diffuse.tga",
            txi: {
              clamp: 1,
              filter: false,
              proceduretype: "cycle",
              numx: 2,
              numy: 2,
              fps: 4
            }
          }
        ]
      }
    );
    const instanceMaterials: THREE.MeshStandardMaterial[] = [];
    group.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData.auroraVfxCanonicalChunkLaneModelInstance === true
      ) {
        instanceMaterials.push(node.material as THREE.MeshStandardMaterial);
      }
    });

    expect(instanceMaterials).toHaveLength(2);
    expect(instanceMaterials[0]?.userData.auroraMaterialContractSource).toBe(
      "chunk_surface.mtr"
    );
    expect(instanceMaterials[0]?.side).toBe(THREE.DoubleSide);
    expect(instanceMaterials[0]?.roughness).toBe(0.25);
    expect(instanceMaterials[0]?.map?.image).toBe(diffuseTexture.image);
    expect(instanceMaterials[0]?.map?.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(instanceMaterials[0]?.map?.minFilter).toBe(THREE.NearestFilter);
    expect(instanceMaterials[0]?.userData.auroraTextureTxiSource).toBe("chunk_diffuse.tga");
    expect(instanceMaterials[0]?.map?.repeat.x).toBeCloseTo(0.5);
    expect(instanceMaterials[0]?.map?.repeat.y).toBeCloseTo(0.5);

    advanceAuroraVfxCanonicalRuntimePlayback(group, 0.26, 31);

    expect(instanceMaterials[0]?.map?.offset.x).toBeCloseTo(0.5);
    expect(instanceMaterials[0]?.map?.offset.y).toBeCloseTo(0.5);
    expect(
      instanceMaterials[0]?.map?.userData.auroraTextureTxiCycleLastRendererFrameSerial
    ).toBe(31);
    expect(instanceMaterials[0]?.map?.userData.auroraTextureTxiCycleUpdateCount).toBe(1);
    expect(group.userData.auroraVfxCanonicalTextureCycleFrameIndices).toEqual([1]);
    expect(group.userData.auroraVfxCanonicalTextureCycleLastRendererFrameSerials).toEqual([
      31
    ]);
    expect(group.userData.auroraVfxCanonicalTextureCycleFrameAdvanceCounts).toEqual([1]);
    expect(chunkMaterial.userData.auroraMaterialContractSource).toBeUndefined();
    expect(chunkMaterial.map).toBeNull();
  });

  it("isolates Chunk material bindings between groups built from one template", () => {
    const chunkModelTemplate = createChunkModelTemplate() as THREE.Mesh;
    const templateMaterial = chunkModelTemplate.material as THREE.MeshBasicMaterial;
    templateMaterial.userData = {
      aurora: { textureReference: "fxpa_dirt" }
    };
    const firstTexture = createTexture();
    const secondTexture = createTexture();
    const firstGroup = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model", chunkResourceResolved: true }),
      {
        chunkModelsByResourceKey: new Map([["fx_chunk01.glb", chunkModelTemplate]]),
        chunkModelTexturesByReference: new Map([["fxpa_dirt", firstTexture]])
      }
    );
    const secondGroup = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model", chunkResourceResolved: true }),
      {
        chunkModelsByResourceKey: new Map([["fx_chunk01.glb", chunkModelTemplate]]),
        chunkModelTexturesByReference: new Map([["fxpa_dirt", secondTexture]])
      }
    );
    const collectInstanceMaterials = (group: THREE.Group): THREE.MeshBasicMaterial[] => {
      const materials: THREE.MeshBasicMaterial[] = [];
      group.traverse((node) => {
        if (
          node instanceof THREE.Mesh &&
          node.userData.auroraVfxCanonicalChunkLaneModelInstance === true
        ) {
          materials.push(node.material as THREE.MeshBasicMaterial);
        }
      });
      return materials;
    };
    const firstMaterials = collectInstanceMaterials(firstGroup);
    const secondMaterials = collectInstanceMaterials(secondGroup);

    expect(firstMaterials).toHaveLength(2);
    expect(secondMaterials).toHaveLength(2);
    expect(templateMaterial.map).toBeNull();
    expect(firstMaterials.every((material) => material !== templateMaterial)).toBe(true);
    expect(secondMaterials.every((material) => material !== templateMaterial)).toBe(true);
    expect(firstMaterials[0]).not.toBe(firstMaterials[1]);
    expect(secondMaterials[0]).not.toBe(secondMaterials[1]);
    expect(firstMaterials[0]).not.toBe(secondMaterials[0]);
    expect(firstMaterials.every((material) => material.map?.image === firstTexture.image)).toBe(
      true
    );
    expect(secondMaterials.every((material) => material.map?.image === secondTexture.image)).toBe(
      true
    );
  });

  it("keeps source-MDL Chunk ambient separate from diffuse lighting", () => {
    const chunkMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.8, 0.8, 0.8)
    });
    chunkMaterial.userData = {
      aurora: {
        material: {
          format: "aurora-mdl-material",
          ambient: [0.2, 0.2, 0.2],
          diffuse: [0.8, 0.8, 0.8],
          specular: [0, 0, 0],
          shininess: 0
        }
      }
    };
    const chunkModelTemplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.3, 0.4),
      chunkMaterial
    );
    const group = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model", chunkResourceResolved: true }),
      {
        chunkModelsByResourceKey: new Map([["fx_chunk01.glb", chunkModelTemplate]])
      }
    );
    let instanceMaterial: THREE.MeshStandardMaterial | undefined;
    group.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData.auroraVfxCanonicalChunkLaneModelInstance === true &&
        !instanceMaterial
      ) {
        instanceMaterial = node.material as THREE.MeshStandardMaterial;
      }
    });
    const shader = {
      uniforms: {},
      fragmentShader: THREE.ShaderLib.standard.fragmentShader
    };

    instanceMaterial!.onBeforeCompile(shader as never, {} as THREE.WebGLRenderer);

    expect(
      (
        shader.uniforms as {
          auroraChunkMaterialAmbientToDiffuse: { value: THREE.Vector3 };
        }
      ).auroraChunkMaterialAmbientToDiffuse.value.toArray()
    ).toEqual([0.047366, 0.047366, 0.047366]);
    expect(shader.fragmentShader).toContain(
      "AURORA_WEB_CANONICAL_CHUNK_MATERIAL_AMBIENT"
    );
    expect(shader.fragmentShader).toContain(
      "irradiance *= auroraChunkMaterialAmbientToDiffuse"
    );
    expect(shader.fragmentShader).toContain(
      "uniform vec3 auroraChunkMaterialAmbientToDiffuse"
    );
    expect(shader.fragmentShader).not.toContain(
      "#include <lights_fragment_begin>"
    );
    expect(
      instanceMaterial!.userData.auroraVfxCanonicalChunkModelSourceMaterialLightingStatus
    ).toBe("source-mdl-ambient-diffuse-separated");
    expect(
      instanceMaterial!.userData.auroraVfxCanonicalChunkModelSourceMaterialLightingSource
    ).toContain("inc_lighting.shd");
    expect(
      chunkMaterial.userData.auroraVfxCanonicalChunkModelSourceMaterialLightingStatus
    ).toBeUndefined();
    expect(() =>
      instanceMaterial!.onBeforeCompile(
        {
          uniforms: {},
          fragmentShader: "void main() {}"
        } as never,
        {} as THREE.WebGLRenderer
      )
    ).toThrow(/expected one common include, got 0/);
  });

  it("transports Aurora Z-up chunk rotation axes into the Three Y-up model orientation", () => {
    const group = createAuroraVfxCanonicalRenderGroup(
      createCanonicalPayload({ drawLane: "chunk_model", chunkResourceResolved: true }),
      {
        chunkModelsByResourceKey: new Map([["fx_chunk01.glb", createChunkModelTemplate()]]),
        sourceCoordinateSpace: "aurora-z-up"
      }
    );
    const chunkModelInstances: THREE.Object3D[] = [];
    group.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkLaneModelInstance === true) {
        chunkModelInstances.push(node);
      }
    });

    const instance = chunkModelInstances[0]!;
    const expected = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, -1, 0),
      0.4
    );
    expect(instance.position.toArray()).toEqual([0.25, 0.75, 0.5]);
    expect(instance.quaternion.x).toBeCloseTo(expected.x, 10);
    expect(instance.quaternion.y).toBeCloseTo(expected.y, 10);
    expect(instance.quaternion.z).toBeCloseTo(expected.z, 10);
    expect(instance.quaternion.w).toBeCloseTo(expected.w, 10);
  });

  it("does not route preview-only or unconfirmed payloads to the canonical renderer", () => {
    expect(
      isCanonicalAuroraVfxRenderablePayload(
        createCanonicalPayload({
          canonicalStatus: "preview_only",
          backendCanonical: false,
          rendererEligibility: "preview_only"
        })
      )
    ).toBe(false);
    expect(
      isCanonicalAuroraVfxRenderablePayload(createCanonicalPayload({ backendCanonical: false }))
    ).toBe(true);
    expect(
      isCanonicalAuroraVfxRenderablePayload(
        createCanonicalPayload({ rendererEligibility: "blocked", retailParityStatus: "proven" })
      )
    ).toBe(false);
    expect(
      isCanonicalAuroraVfxRenderablePayload(
        createCanonicalPayload({ rendererEligibility: "source_backed", retailParityStatus: "blocked" })
      )
    ).toBe(true);
    const deferredPayload = createCanonicalPayload();
    deferredPayload.contracts.runtimeEmitters = [];
    deferredPayload.contracts.runtimeEmittersDeferred = true;
    expect(isCanonicalAuroraVfxRenderablePayload(deferredPayload)).toBe(false);
  });

  it("preserves ready target PLT palette rows without promoting retail parity", () => {
    const payload = createCanonicalPayload();
    const renderContract = payload.contracts.renderContract as Record<string, unknown>;
    renderContract.pltRenderContext = {
      status: "ready",
      requestedTextureRef: "robe_fx",
      selectedResourceKey: "textures/robe_fx.plt",
      targetRef: "target:creature-1",
      paletteRowsByLayer: { "0": 12, "3": 77 },
      profile: "nwn-ee",
      provenance: "target appearance contract",
      shaderLane: {
        vertexShader: "vs_pltgen",
        fragmentShader: "fs_pltgen",
        schemeUniformPattern: "PLTscheme[%d]",
        schemeUniformCount: 15
      },
      proofStatus: "source-backed-contract-retail-visual-unverified"
    };

    expect(resolveAuroraVfxCanonicalPltPaletteRows(payload)).toEqual({ 0: 12, 3: 77 });
    expect(resolveAuroraVfxCanonicalPltPaletteResolution(payload).status).toBe("ready");
    const group = createAuroraVfxCanonicalRenderGroup(payload);
    expect(group.userData.auroraVfxCanonicalPltPaletteStatus).toBe("ready");
    expect(group.userData.auroraVfxCanonicalPltPaletteRowsByLayer).toEqual({ 0: 12, 3: 77 });
    expect(group.userData.auroraVfxCanonicalPltRetailParityProof).toBe(false);
  });

  it("refuses missing or conflicting PLT target palettes", () => {
    const missingPayload = createCanonicalPayload();
    const missingContract = missingPayload.contracts.renderContract as Record<string, unknown>;
    missingContract.pltRenderContext = {
      status: "missing_target_context",
      requestedTextureRef: "robe_fx",
      selectedResourceKey: "textures/robe_fx.plt",
      shaderLane: {
        vertexShader: "vs_pltgen",
        fragmentShader: "fs_pltgen",
        schemeUniformPattern: "PLTscheme[%d]",
        schemeUniformCount: 15
      },
      proofStatus: "source-backed-contract-retail-visual-unverified"
    };
    expect(resolveAuroraVfxCanonicalPltPaletteResolution(missingPayload)).toEqual({
      status: "missing-target-context"
    });
    expect(resolveAuroraVfxCanonicalPltPaletteRows(missingPayload)).toBeUndefined();

    const conflictingPayload = createCanonicalPayload();
    const baseContract = conflictingPayload.contracts.renderContract as Record<string, unknown>;
    const readyContext = {
      status: "ready",
      requestedTextureRef: "robe_fx",
      selectedResourceKey: "textures/robe_fx.plt",
      targetRef: "target:creature-1",
      paletteRowsByLayer: { "0": 12 },
      profile: "nwn-ee",
      provenance: "target appearance contract",
      shaderLane: {
        vertexShader: "vs_pltgen",
        fragmentShader: "fs_pltgen",
        schemeUniformPattern: "PLTscheme[%d]",
        schemeUniformCount: 15
      },
      proofStatus: "source-backed-contract-retail-visual-unverified"
    };
    conflictingPayload.contracts.runtimeEmitters = [
      { emitterNodeName: "first", renderContract: baseContract, emitterIndex: 0 },
      {
        emitterNodeName: "second",
        emitterIndex: 1,
        renderContract: {
          ...baseContract,
          pltRenderContext: {
            ...readyContext,
            paletteRowsByLayer: { "0": 13 }
          }
        }
      }
    ] as unknown as AuroraVfxPayload["contracts"]["runtimeEmitters"];
    baseContract.pltRenderContext = readyContext;

    expect(resolveAuroraVfxCanonicalPltPaletteResolution(conflictingPayload)).toEqual({
      status: "conflicting-context"
    });
    expect(resolveAuroraVfxCanonicalPltPaletteRows(conflictingPayload)).toBeUndefined();
  });
});
