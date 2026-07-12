// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createAuroraVfxCanonicalRenderGroup,
  isCanonicalAuroraVfxRenderablePayload,
  resolveAuroraVfxCanonicalTextureReference
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

function createCanonicalPayload(
  options: {
    canonicalStatus?: AuroraVfxPayload["canonicalStatus"];
    backendCanonical?: boolean;
    drawLane?: "textured_quad" | "linked_textured_quad" | "chunk_model";
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
          transparentLane: "non_punch_transparent_lane"
        },
        renderOrder: {
          value: options.renderOrder ?? 7,
          rawValue: options.renderOrder ?? 7
        },
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
  particleId: number;
  particleIndex: number;
  position: { x: number; y: number; z: number };
  rotationRadians?: number;
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
    emitterNodeName: "fx_emit",
    lane: "textured_quad",
    particleId: options.particleId,
    particleIndex: options.particleIndex,
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
      value: 7,
      rawValue: 7
    },
    position: options.position,
    velocity: { x: 0, y: 0, z: 0 },
    rotationRadians: options.rotationRadians ?? 0,
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
  it("renders nonblank canonical textured draw records without using preview roles", () => {
    const payload = createCanonicalPayload();
    const texture = createTexture();
    const group = createAuroraVfxCanonicalRenderGroup(payload, {
      particleTexturesByReference: new Map([["fx_canonical_fire", texture]])
    });

    expect(isCanonicalAuroraVfxRenderablePayload(payload)).toBe(true);
    expect(resolveAuroraVfxCanonicalTextureReference(payload)).toBe("fx_canonical_fire");
    expect(group.userData.auroraVfxRenderer).toBe("canonical");
    expect(group.userData.auroraVfxCanonicalRenderer).toBe(true);
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
    expect(group.userData.auroraVfxCanonicalMaterialSide).toBe("DoubleSide");
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
    expect(mesh!.userData.auroraVfxCanonicalMaterialSide).toBe("DoubleSide");
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
    const material = mesh!.material as THREE.MeshBasicMaterial;
    expect(material.map).toBe(texture);
    expect(material.depthTest).toBe(true);
    expect(material.opacity).toBe(1);
    expect(material.color.getHexString()).toBe("ffffff");
    expect(material.vertexColors).toBe(true);
    expect(material.side).toBe(THREE.DoubleSide);
    expect(mesh!.geometry.index).toBeNull();
    expect(mesh!.geometry.getAttribute("position").count).toBe(12);
    expect(mesh!.geometry.getAttribute("uv").count).toBe(12);
    expect(mesh!.geometry.getAttribute("color").count).toBe(12);
    expect(mesh!.geometry.getAttribute("auroraAlpha").count).toBe(12);
    expect(mesh!.geometry.getAttribute("auroraParticleSize").count).toBe(12);
    expect(mesh!.geometry.getAttribute("auroraAtlasFrameIndex").count).toBe(12);
    expect(mesh!.geometry.userData.auroraVfxCanonicalNonIndexedDrawArrays).toBe(true);
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
    expect(mesh!.geometry.userData.auroraVfxCanonicalAlphaAttributeMin).toBeCloseTo(0.45, 5);
    expect(mesh!.geometry.userData.auroraVfxCanonicalAlphaAttributeMax).toBeCloseTo(0.75, 5);
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
    expect(color.getY(0)).toBeCloseTo(0.25, 5);
    expect(color.getZ(0)).toBeCloseTo(0.5, 5);
    expect(mesh!.geometry.getAttribute("auroraAlpha").getX(0)).toBeCloseTo(0.75, 5);
    expect(mesh!.geometry.getAttribute("auroraParticleSize").getX(0)).toBeCloseTo(0.4, 5);
    expect(mesh!.geometry.getAttribute("auroraParticleSize").getY(0)).toBeCloseTo(0.2, 5);
    expect(mesh!.geometry.getAttribute("auroraAtlasFrameIndex").getX(0)).toBe(6);
    expect(mesh!.geometry.getAttribute("auroraAtlasFrameIndex").getX(6)).toBe(2);

    const bounds = new THREE.Box3().setFromObject(group);
    expect(bounds.isEmpty()).toBe(false);
    expect(bounds.max.x).toBeGreaterThan(bounds.min.x);
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
    expect(position.getX(0)).toBeCloseTo(0.2, 5);
    expect(position.getY(0)).toBeCloseTo(0, 5);
    expect(position.getZ(0)).toBeCloseTo(0.3, 5);
  });

  it("keeps renderorder as inspection metadata on separate canonical groups", () => {
    const texture = createTexture();
    const low = createAuroraVfxCanonicalRenderGroup(createCanonicalPayload({ renderOrder: 3 }), {
      particleTexturesByReference: new Map([["fx_canonical_fire", texture]])
    });
    const high = createAuroraVfxCanonicalRenderGroup(createCanonicalPayload({ renderOrder: 9 }), {
      particleTexturesByReference: new Map([["fx_canonical_fire", texture]])
    });

    expect(collectCanonicalDrawMeshes(low)[0]?.renderOrder).toBe(3);
    expect(collectCanonicalDrawMeshes(high)[0]?.renderOrder).toBe(9);
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
    expect(group.userData.auroraVfxCanonicalDiagnosticCodes).toEqual(
      expect.arrayContaining(["VFX_CANONICAL_CHUNK_LANE_RENDERER_PENDING"])
    );
    expect(collectCanonicalDrawMeshes(group)).toHaveLength(0);
    expect(group.children[0]?.userData.auroraVfxCanonicalChunkLanePlaceholder).toBe(true);
    expect(group.children[0]?.userData.auroraVfxCanonicalTexturedQuadLane).toBe(false);
  });

  it("does not route preview-only or unconfirmed payloads to the canonical renderer", () => {
    expect(
      isCanonicalAuroraVfxRenderablePayload(
        createCanonicalPayload({ canonicalStatus: "preview_only", backendCanonical: false })
      )
    ).toBe(false);
    expect(
      isCanonicalAuroraVfxRenderablePayload(createCanonicalPayload({ backendCanonical: false }))
    ).toBe(false);
  });
});
