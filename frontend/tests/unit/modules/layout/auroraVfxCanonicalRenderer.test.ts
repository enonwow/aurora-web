// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createAuroraVfxCanonicalRenderGroup,
  isCanonicalAuroraVfxRenderablePayload,
  resolveAuroraVfxCanonicalTextureReference
} from "../../../../src/modules/layout/adapters/three/auroraVfxCanonicalRenderer";
import type { AuroraVfxPayload } from "../../../../src/modules/scene/contracts";

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
