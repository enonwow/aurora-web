// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { rebuildObjectMeshes } from "../../../../src/modules/layout/adapters/three/workspaceObjectMeshLayer";
import type { PlaceableViewportRenderPayload } from "../../../../src/modules/placeables/application/placeableRenderPayloadResolver";

function createVfxPayloadWithReadyModel(
  options: {
    includeTextureContract?: boolean;
    includeChunkModelContract?: boolean;
    placeableName?: string;
    templateId?: string;
    resref?: string;
    textureFileName?: string;
    textureDeliveryUrl?: string;
    chunkModelFileName?: string;
    chunkModelDeliveryUrl?: string;
    metadata?: Record<string, string | number | boolean>;
    placeableRuntime?: PlaceableViewportRenderPayload["placeable"]["placeableRuntime"];
    auroraEmitter?: NonNullable<
      NonNullable<PlaceableViewportRenderPayload["renderPackage"]>["auroraEmitter"]
    >;
    auroraLight?: NonNullable<
      NonNullable<PlaceableViewportRenderPayload["renderPackage"]>["auroraLight"]
    >;
  } = {}
): PlaceableViewportRenderPayload {
  const includeTextureContract = options.includeTextureContract ?? false;
  const includeChunkModelContract = options.includeChunkModelContract ?? false;
  const templateId = options.templateId ?? "plc_cot_fx01";
  const resref = options.resref ?? "cot_fx01";
  const placeableName = options.placeableName ?? "VFX: Smoke, Red*";
  const textureFileName = options.textureFileName ?? "fx_smoke_red.dds";
  const textureDeliveryUrl = options.textureDeliveryUrl ?? "/assets/fx_smoke_red.dds";
  const chunkModelFileName = options.chunkModelFileName ?? "red_m_giblet.glb";
  const chunkModelDeliveryUrl = options.chunkModelDeliveryUrl ?? "/assets/red_m_giblet.glb";
  const textureAssetId = "texture-1";
  const chunkModelAssetId = "chunk-model-1";
  const manifestAssets = [
    ...(includeChunkModelContract
      ? [
          {
            assetId: chunkModelAssetId,
            role: "model",
            fileName: chunkModelFileName
          }
        ]
      : []),
    ...(includeTextureContract
      ? [
          {
            assetId: textureAssetId,
            role: "texture",
            fileName: textureFileName
          }
        ]
      : [])
  ];
  const contractAssets = [
    ...(includeChunkModelContract
      ? [
          {
            assetId: chunkModelAssetId,
            deliveryUrl: chunkModelDeliveryUrl
          }
        ]
      : []),
    ...(includeTextureContract
      ? [
          {
            assetId: textureAssetId,
            deliveryUrl: textureDeliveryUrl
          }
        ]
      : [])
  ];
  return {
    templateId,
    cacheKey: "cache-vfx",
    cacheHit: false,
    storedAt: "2026-06-01T00:00:00.000Z",
    hits: 0,
    placeable: {
      templateId,
      resref,
      name: placeableName,
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
        assets: manifestAssets
      },
      metadata: options.metadata,
      placeableRuntime: options.placeableRuntime
    } as unknown as PlaceableViewportRenderPayload["placeable"],
    renderPackage: {
      status: "ready",
      diagnostics: [],
      assetRefs: {
        derivedModelAssetIds: ["derived-model-1"],
        ...(includeChunkModelContract
          ? {
              chunkModelAssetIds: [chunkModelAssetId]
            }
          : {})
      },
      glbUrl: "/assets/cot_fx01.glb",
      auroraEmitter: options.auroraEmitter,
      auroraLight: options.auroraLight
    } as unknown as PlaceableViewportRenderPayload["renderPackage"],
    assetContracts: {
      assets: contractAssets
    } as unknown as PlaceableViewportRenderPayload["assetContracts"]
  } as PlaceableViewportRenderPayload;
}

function createSingleTextureAuroraEmitter(
  options: {
    texture?: string;
    renderMode?: string;
    blendMode?: string;
    sourceModelFileName?: string;
    nodeName?: string;
  } = {}
): NonNullable<NonNullable<PlaceableViewportRenderPayload["renderPackage"]>["auroraEmitter"]> {
  const texture = options.texture ?? "fx_smoke_red";
  const sourceModelFileName = options.sourceModelFileName ?? `${texture}.mdl`;
  return {
    source: "source-mdl",
    diagnostics: [],
    emitters: [
      {
        source: "aurora-mdl-binary",
        sourceModelAssetId: "source-model-1",
        sourceModelFileName,
        sourceModelObjectKey: `modules/current/models/${sourceModelFileName}`,
        nodeName: options.nodeName ?? "auroraemitter01",
        texture,
        emitterType: "Fountain",
        renderMode: options.renderMode ?? "Normal",
        blendMode: options.blendMode ?? "Normal",
        simulation: {
          birthrate: 4,
          lifeExp: 2,
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
  };
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

function collectCameraBillboardParticles(root: THREE.Object3D | undefined): Array<{
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}> {
  const particles: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }> = [];
  root?.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || node.userData?.vfxPreviewRole !== "camera-billboard-particle") {
      return;
    }
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      particles.push({ mesh: node, material });
    }
  });
  return particles;
}

function collectCameraBillboardBatches(root: THREE.Object3D | undefined): Array<{
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}> {
  const batches: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }> = [];
  root?.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || node.userData?.vfxPreviewRole !== "camera-billboard-batch") {
      return;
    }
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      batches.push({ mesh: node, material });
    }
  });
  return batches;
}

function collectParticleAlignedMeshes(root: THREE.Object3D | undefined): Array<{
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}> {
  const particles: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }> = [];
  root?.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || node.userData?.vfxPreviewRole !== "particle-aligned-trail") {
      return;
    }
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      particles.push({ mesh: node, material });
    }
  });
  return particles;
}

function collectParticleAlignedBatches(root: THREE.Object3D | undefined): Array<{
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}> {
  const batches: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }> = [];
  root?.traverse((node) => {
    if (
      !(node instanceof THREE.Mesh) ||
      node.userData?.vfxPreviewRole !== "particle-aligned-trail-batch"
    ) {
      return;
    }
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      batches.push({ mesh: node, material });
    }
  });
  return batches;
}

function collectMotionBlurMeshes(root: THREE.Object3D | undefined): Array<{
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}> {
  const particles: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }> = [];
  root?.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || node.userData?.vfxPreviewRole !== "motion-blur-endpoint-particle") {
      return;
    }
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      particles.push({ mesh: node, material });
    }
  });
  return particles;
}

function collectMotionBlurBatches(root: THREE.Object3D | undefined): Array<{
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}> {
  const batches: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }> = [];
  root?.traverse((node) => {
    if (
      !(node instanceof THREE.Mesh) ||
      node.userData?.vfxPreviewRole !== "motion-blur-endpoint-batch"
    ) {
      return;
    }
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      batches.push({ mesh: node, material });
    }
  });
  return batches;
}

function collectLinkedParticleSegments(root: THREE.Object3D | undefined): Array<{
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}> {
  const segments: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }> = [];
  root?.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || node.userData?.vfxPreviewRole !== "linked-particle-segment") {
      return;
    }
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      segments.push({ mesh: node, material });
    }
  });
  return segments;
}

function collectLinkedParticleSegmentBatches(root: THREE.Object3D | undefined): Array<{
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}> {
  const batches: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial }> = [];
  root?.traverse((node) => {
    if (
      !(node instanceof THREE.Mesh) ||
      node.userData?.vfxPreviewRole !== "linked-particle-segment-batch"
    ) {
      return;
    }
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      batches.push({ mesh: node, material });
    }
  });
  return batches;
}

function expectAuroraParticleDrawRecordUserData(
  userData: THREE.Object3D["userData"] | undefined,
  options: {
    activeParticleCount: number;
    drawParticleCount?: number;
    previewMode?:
      | "aurora-textured-particle-draw-array-record"
      | "aurora-linked-particle-segment-draw-array-record";
    linked?: boolean;
  }
): void {
  const drawParticleCount = options.drawParticleCount ?? options.activeParticleCount;
  const drawVertexCount = drawParticleCount * 6;
  expect(userData?.auroraParticleDrawRecord).toEqual(
    expect.objectContaining({
      activeParticleCount: options.activeParticleCount,
      drawParticleCount,
      drawVertexCount,
      vertexUploadCount: drawVertexCount,
      verticesPerParticle: 6,
      indexedBuffer: false,
      drawApiCandidate: "glDrawArrays",
      drawModeArg: 3,
      drawModeEnumCaptured: false,
      drawModePreview: "triangle-list-shaped-six-vertex-quad",
      previewMode:
        options.previewMode ??
        (options.linked
          ? "aurora-linked-particle-segment-draw-array-record"
          : "aurora-textured-particle-draw-array-record")
    })
  );
  expect(userData?.auroraParticleDrawActiveCount).toBe(options.activeParticleCount);
  expect(userData?.auroraParticleDrawParticleCount).toBe(drawParticleCount);
  expect(userData?.auroraParticleDrawVertexCount).toBe(drawVertexCount);
  expect(userData?.auroraParticleVertexUploadCount).toBe(drawVertexCount);
  expect(userData?.auroraParticleDrawVerticesPerParticle).toBe(6);
  expect(userData?.auroraParticleDrawIndexedBuffer).toBe(false);
  expect(userData?.auroraParticleDrawApiCandidate).toBe("glDrawArrays");
  expect(userData?.auroraParticleDrawModeArg).toBe(3);
  expect(userData?.auroraParticleDrawModeEnumCaptured).toBe(false);
  expect(userData?.auroraParticleDrawDiagnostics).toEqual(
    expect.arrayContaining([
      "VFX_PARTICLE_DRAW_RECORD_REQUIRED",
      "VFX_PARTICLE_DRAW_NON_INDEXED_ARRAYS_REQUIRED",
      "VFX_PARTICLE_DRAW_MODE_ARG3_ENUM_TABLE_CAPTURE_REQUIRED"
    ])
  );
  if (options.linked) {
    expect(userData?.auroraParticleDrawDiagnostics).toEqual(
      expect.arrayContaining(["VFX_LINKED_DRAW_COUNT_ACTIVE_PARTICLES_MINUS_ONE"])
    );
  }
}

function readEndpointPairDistance(mesh: THREE.Mesh): number {
  const positions = mesh.geometry.getAttribute("position");
  const start = new THREE.Vector3(
    (positions.getX(0) + positions.getX(1)) * 0.5,
    (positions.getY(0) + positions.getY(1)) * 0.5,
    (positions.getZ(0) + positions.getZ(1)) * 0.5
  ).add(mesh.position);
  const end = new THREE.Vector3(
    (positions.getX(2) + positions.getX(5)) * 0.5,
    (positions.getY(2) + positions.getY(5)) * 0.5,
    (positions.getZ(2) + positions.getZ(5)) * 0.5
  ).add(mesh.position);
  return start.distanceTo(end);
}

function readEndpointPairAlpha(mesh: THREE.Mesh): { previous: number; current: number } {
  const alpha = mesh.geometry.getAttribute("auroraAlpha");
  return {
    previous: (alpha.getX(0) + alpha.getX(1) + alpha.getX(4)) / 3,
    current: (alpha.getX(2) + alpha.getX(3) + alpha.getX(5)) / 3
  };
}

function readEndpointPairColorAlpha(mesh: THREE.Mesh): { previous: number; current: number } {
  const color = mesh.geometry.getAttribute("color");
  return {
    previous: (color.getW(0) + color.getW(1) + color.getW(4)) / 3,
    current: (color.getW(2) + color.getW(3) + color.getW(5)) / 3
  };
}

function expectAuroraCameraBillboardQuad(mesh: THREE.Mesh): void {
  expect(mesh.userData.auroraThreeSpriteAdapter).toBe(false);
  expect(mesh.userData.auroraVfxDrawPrimitivePreview).toBe(
    "non-indexed-six-vertex-triangle-list"
  );
  expect(mesh.userData.auroraParticleDrawIndexedBuffer).toBe(false);
  expect(mesh.userData.auroraParticleDrawApiCandidate).toBe("glDrawArrays");
  expect(mesh.userData.auroraParticleDrawModeArg).toBe(3);
  expect(mesh.userData.auroraParticleDrawVerticesPerParticle).toBe(6);
  expect(mesh.geometry.index).toBeNull();
  expect(mesh.geometry.userData.auroraVfxTexturedParticleQuad).toBe(true);
  expect(mesh.geometry.userData.auroraVfxParticleVertexCount).toBe(6);
  expect(mesh.geometry.userData.auroraParticleDrawIndexedBuffer).toBe(false);
  expect(mesh.geometry.userData.auroraParticleDrawApiCandidate).toBe("glDrawArrays");
  expect(mesh.geometry.userData.auroraParticleDrawModeArg).toBe(3);
  expect(mesh.geometry.userData.auroraParticleDrawVerticesPerParticle).toBe(6);
  expect(mesh.geometry.getAttribute("position").count).toBe(6);
  expect(mesh.geometry.getAttribute("uv").count).toBe(6);
  expect(mesh.geometry.getAttribute("color").count).toBe(6);
  expect(mesh.geometry.getAttribute("color").itemSize).toBe(4);
  expect(mesh.geometry.getAttribute("auroraAlpha").count).toBe(6);
  expect(mesh.geometry.userData.auroraVfxParticleVertexColor).toBe(true);
  expect(mesh.geometry.userData.auroraVfxParticleVertexColorLayout).toBe(
    "rgba-per-vertex-packed-color-preview"
  );
  expect(mesh.geometry.userData.auroraVfxParticleVertexAlpha).toEqual(expect.any(Number));
  expect(mesh.geometry.userData.auroraVfxParticleVertexAlphaLayout).toBe(
    "alpha-per-vertex-packed-color-preview"
  );
}

function expectAuroraParticleSoftnessState(
  mesh: THREE.Mesh,
  material: THREE.MeshBasicMaterial,
  options: { gate: string; value?: number; positive?: boolean }
): void {
  expect(material.userData.auroraParticleSoftnessUniformSlot).toBe(0);
  expect(material.userData.auroraParticleSoftnessShaderNameCandidate).toBe(
    "particleSoftness"
  );
  expect(material.userData.auroraParticleSoftnessSlotBindingStatus).toBe(
    "candidate-name-unconfirmed"
  );
  expect(material.userData.auroraParticleSoftnessPreviewMode).toBe(
    "aurora-particle-shader-float-slot-0"
  );
  expect(material.userData.auroraParticleSoftnessSource).toBe(
    "max-evaluated-half-extent"
  );
  expect(material.userData.auroraParticleSoftnessGate).toBe(options.gate);
  expect(mesh.geometry.userData.auroraParticleSoftnessGate).toBe(options.gate);
  expect(mesh.geometry.userData.auroraParticleSoftnessUniformSlot).toBe(0);
  if (options.positive) {
    expect(material.userData.auroraParticleSoftness).toBeGreaterThan(0);
    expect(mesh.geometry.userData.auroraParticleSoftness).toBeGreaterThan(0);
    expect(material.userData.auroraParticleSoftnessFormula).toBe(
      "1.0 / min(maxHalfExtent * 0.2, 0.2)"
    );
    return;
  }
  expect(material.userData.auroraParticleSoftness).toBe(options.value ?? 0);
  expect(mesh.geometry.userData.auroraParticleSoftness).toBe(options.value ?? 0);
  expect(material.userData.auroraParticleSoftnessFormula).toBe("forced-zero");
}

function readFirstAuroraVertexColor(mesh: THREE.Mesh): THREE.Color {
  const colors = mesh.geometry.getAttribute("color");
  return new THREE.Color(colors.getX(0), colors.getY(0), colors.getZ(0));
}

function readAuroraVertexColorSource(mesh: THREE.Mesh): [number, number, number] | null {
  const source = mesh.geometry.userData.auroraVfxParticleVertexColorSource;
  if (!Array.isArray(source) || source.length < 3) {
    return null;
  }
  return [
    Number(source[0] ?? 0),
    Number(source[1] ?? 0),
    Number(source[2] ?? 0)
  ];
}

function readFirstAuroraVertexAlpha(mesh: THREE.Mesh): number {
  return mesh.geometry.getAttribute("auroraAlpha").getX(0);
}

function expectAuroraVertexColorHex(mesh: THREE.Mesh, hex: string): void {
  expect(readFirstAuroraVertexColor(mesh).getHexString()).toBe(hex);
  expect(mesh.geometry.userData.auroraVfxParticleVertexColorPreviewMode).toBeDefined();
}

function expectAuroraAtlasQuadUvs(
  mesh: THREE.Mesh,
  expected: { u0: number; u1: number; v0: number; v1: number }
): void {
  const uvs = mesh.geometry.getAttribute("uv");
  expect(uvs.count).toBe(6);
  expect(uvs.getX(0)).toBeCloseTo(expected.u0, 4);
  expect(uvs.getY(0)).toBeCloseTo(expected.v0, 4);
  expect(uvs.getX(1)).toBeCloseTo(expected.u1, 4);
  expect(uvs.getY(1)).toBeCloseTo(expected.v0, 4);
  expect(uvs.getX(2)).toBeCloseTo(expected.u0, 4);
  expect(uvs.getY(2)).toBeCloseTo(expected.v1, 4);
  expect(uvs.getX(3)).toBeCloseTo(expected.u0, 4);
  expect(uvs.getY(3)).toBeCloseTo(expected.v1, 4);
  expect(uvs.getX(4)).toBeCloseTo(expected.u1, 4);
  expect(uvs.getY(4)).toBeCloseTo(expected.v0, 4);
  expect(uvs.getX(5)).toBeCloseTo(expected.u1, 4);
  expect(uvs.getY(5)).toBeCloseTo(expected.v1, 4);
  expect(mesh.geometry.userData.auroraAtlasPreviewMode).toBe(
    "per-particle-vertex-uv-preview"
  );
  expect(mesh.geometry.userData.auroraAtlasUvSource).toBe(
    "aurora-particle-vertex-buffer"
  );
}

function expectAuroraAtlasBatchParticleUvs(
  mesh: THREE.Mesh,
  particleIndex: number,
  expected: { u0: number; u1: number; v0: number; v1: number }
): void {
  const uvs = mesh.geometry.getAttribute("uv");
  const offset = particleIndex * 6;
  expect(uvs.count).toBeGreaterThanOrEqual(offset + 6);
  expect(uvs.getX(offset)).toBeCloseTo(expected.u0, 4);
  expect(uvs.getY(offset)).toBeCloseTo(expected.v0, 4);
  expect(uvs.getX(offset + 1)).toBeCloseTo(expected.u1, 4);
  expect(uvs.getY(offset + 1)).toBeCloseTo(expected.v0, 4);
  expect(uvs.getX(offset + 2)).toBeCloseTo(expected.u0, 4);
  expect(uvs.getY(offset + 2)).toBeCloseTo(expected.v1, 4);
  expect(uvs.getX(offset + 3)).toBeCloseTo(expected.u0, 4);
  expect(uvs.getY(offset + 3)).toBeCloseTo(expected.v1, 4);
  expect(uvs.getX(offset + 4)).toBeCloseTo(expected.u1, 4);
  expect(uvs.getY(offset + 4)).toBeCloseTo(expected.v0, 4);
  expect(uvs.getX(offset + 5)).toBeCloseTo(expected.u1, 4);
  expect(uvs.getY(offset + 5)).toBeCloseTo(expected.v1, 4);
}

describe("workspaceObjectMeshLayer VFX render mode", () => {
  function createRuntime(load: ReturnType<typeof vi.fn>) {
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
      placeableModelLoader: { load },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    } as unknown as Parameters<typeof rebuildObjectMeshes>[0];
  }

  it("marks Area GIT placeables and doors with shared renderer runtime evidence", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const visualTransform = {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0
    };
    const objects = [
      {
        id: "area_ikea:plc_001",
        kind: "placeables",
        name: "IKEA Crate",
        resRef: "zep_crate_001",
        tag: "ZEP_CRATE_001",
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
        isStatic: true,
        visualTransform,
        source: {
          type: "aurora_git",
          areaId: "area_ikea",
          sourceObjectId: "plc_001",
          sourceKind: "placeable",
          templateId: "utp_ikea_crate"
        }
      },
      {
        id: "area_ikea:door_001",
        kind: "doors",
        name: "IKEA Door",
        resRef: "nw_door_ttr_11",
        tag: "NW_DOOR_TTR_11",
        x: 3,
        y: 4,
        z: 0,
        bearing: 1.2,
        visualTransform,
        source: {
          type: "aurora_git",
          areaId: "area_ikea",
          sourceObjectId: "door_001",
          sourceKind: "door",
          templateId: "utd_ikea_door",
          appearanceType: 7,
          genericType: 3
        }
      }
    ] as unknown as Parameters<typeof rebuildObjectMeshes>[1];

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

    objects.forEach((object) => {
      const root = runtime.objectMeshById.get(object.id);
      expect(root?.userData.isAreaObjectSharedPlaceablesRendererTarget).toBe(true);
      expect(root?.userData.auroraAreaObjectSharedRendererPath).toBe(
        "shared-placeables-renderer"
      );
      expect(root?.userData.auroraAreaObjectSharedRendererRuntimeMarker).toBe(
        "shared-placeables-renderer"
      );
      expect(root?.userData.auroraAreaObjectSharedRendererPayloadStatus).toBe(
        "missing-payload"
      );
      expect(root?.userData.auroraAreaObjectSharedRendererGeometryStatus).toBe(
        "missing-payload"
      );
      expect(root?.userData.auroraAreaObjectSharedRendererPlaceholderReason).toBe(
        "missing-payload"
      );
      const markedDescendant = root?.children.find(
        (child) =>
          child.userData.auroraAreaObjectSharedRendererRuntimeMarker ===
          "shared-placeables-renderer"
      );
      expect(markedDescendant).toBeDefined();
    });
  });

  it("classifies Area GIT placeable model loader failures after shared payload binding", async () => {
    const load = vi.fn(
      (
        _url: string,
        _onLoad: (gltf: { scene: THREE.Object3D | null }) => void,
        _onProgress: unknown,
        onError: () => void
      ) => {
        onError();
      }
    );
    const runtime = createRuntime(load);
    const visualTransform = {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0
    };
    const object = {
      id: "area_ikea:plc_model_001",
      kind: "placeables",
      name: "IKEA Model",
      resRef: "zep_model_001",
      tag: "ZEP_MODEL_001",
      x: 1,
      y: 2,
      z: 0,
      bearing: 0,
      isStatic: true,
      visualTransform,
      source: {
        type: "aurora_git",
        areaId: "area_ikea",
        sourceObjectId: "plc_model_001",
        sourceKind: "placeable",
        templateId: "utp_ikea_model"
      }
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const payload = {
      templateId: "zep_model_001",
      cacheKey: "cache-zep-model-001",
      cacheHit: false,
      storedAt: "2026-06-23T00:00:00.000Z",
      hits: 0,
      placeable: {
        templateId: "zep_model_001",
        resref: "zep_model_001",
        name: "IKEA Model",
        category: "placeables",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "default",
          isDoor: false,
          isVfx: false
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-06-23T00:00:00.000Z",
          assetCount: 1,
          candidatesScanned: 1,
          assets: [
            {
              assetId: "model-zep-model-001",
              role: "model",
              fileName: "zep_model_001.glb",
              objectKey: "models/zep_model_001.glb",
              extension: "glb",
              sizeBytes: 128,
              contentType: "model/gltf-binary"
            }
          ]
        }
      },
      renderPackage: {
        status: "ready",
        diagnostics: [],
        assetRefs: {
          derivedModelAssetIds: ["model-zep-model-001"]
        },
        glbUrl: "/assets/zep_model_001.glb"
      },
      assetContracts: {
        cacheKey: "cache-zep-model-001",
        assets: [
          {
            assetId: "model-zep-model-001",
            objectKey: "models/zep_model_001.glb",
            contentType: "model/gltf-binary",
            sizeBytes: 128,
            deliveryPath: "/assets/zep_model_001.glb",
            deliveryUrl: "/assets/zep_model_001.glb"
          }
        ]
      }
    } as unknown as PlaceableViewportRenderPayload;

    rebuildObjectMeshes(
      runtime,
      [object],
      [],
      createDebugState(),
      1,
      true,
      10,
      [],
      false,
      {
        [object.id]: payload
      }
    );

    const loadingRoot = runtime.objectMeshById.get(object.id);
    expect(loadingRoot?.userData.auroraAreaObjectSharedRendererPayloadStatus).toBe(
      "payload-bound"
    );
    expect(loadingRoot?.userData.auroraAreaObjectSharedRendererGeometryStatus).toBe(
      "still-loading"
    );
    expect(loadingRoot?.userData.auroraAreaObjectSharedRendererPlaceholderReason).toBe(
      "still-loading"
    );

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    const failedRoot = runtime.objectMeshById.get(object.id);
    expect(failedRoot?.userData.auroraAreaObjectSharedRendererGeometryStatus).toBe(
      "model-load-failed"
    );
    expect(failedRoot?.userData.auroraAreaObjectSharedRendererPlaceholderReason).toBe(
      "model-load-failed"
    );
  });

  it("does not draw the primitive placeable square while a catalog VFX render payload is pending", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX: Pentagram Small*",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
      },
      vfxPayload: {
        profile: "placeable-vfx-preview",
        emitter: "phod_fx_pntgrm2",
        script: "",
        sourceKind: "placeable_preview",
        sourceProfile: "catalog-placeable-vfx",
        sourceTable: "placeable-template-catalog",
        sourceLabel: "VFX: Pentagram Small*",
        sourceResRef: "phod_fx_pntgrm2",
        previewMode: "sprite_scaffold",
        canonicalStatus: "preview_only",
        diagnostics: [
          {
            code: "VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT",
            severity: "warn",
            message: "Preview-only catalog VFX."
          }
        ],
        flags: {
          isPlaceableVfx: true
        },
        extra: {
          templateId: "plc_phod_fx_pntgrm2"
        }
      }
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
      null
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root).toBeInstanceOf(THREE.Group);
    expect(root?.userData.vfxPreviewRole).toBe("pending-render-payload");
    expect(root?.userData.auroraVfxCanonicalStatus).toBe("preview_only");
    let meshCount = 0;
    root?.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        meshCount += 1;
      }
    });
    expect(meshCount).toBe(0);
  });

  it("infers pending catalog VFX from preview identity before preserved payload is attached", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX: Pentagram Small*",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
      null
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root).toBeInstanceOf(THREE.Group);
    expect(root?.userData.vfxPreviewRole).toBe("pending-render-payload");
    expect(root?.userData.auroraVfxCanonicalStatus).toBe("preview_only");
    expect(root?.userData.auroraVfxPreviewMode).toBe("sprite_scaffold");
    let meshCount = 0;
    root?.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        meshCount += 1;
      }
    });
    expect(meshCount).toBe(0);
  });

  it("draws Aurora emitter geometry immediately while texture contracts are still loading", async () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    let resolveTexture: ((texture: THREE.Texture) => void) | null = null;
    const textureLoader = vi.fn((_url: string, onLoad: (texture: THREE.Texture) => void) => {
      resolveTexture = onLoad;
    });
    runtime.placeableTgaTextureLoader = { load: textureLoader };

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX: Pentagram Small*",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: createSingleTextureAuroraEmitter({
            texture: "phod_fx_pntgrm",
            renderMode: "Billboard_to_World_Z",
            blendMode: "Lighten",
            sourceModelFileName: "phod_fx_pntgrm2.mdl",
            nodeName: "lightBase_purple23"
          })
        })
      }
    );

    expect(textureLoader).toHaveBeenCalledWith(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      expect.any(Function),
      undefined,
      expect.any(Function)
    );
    const loadingRoot = runtime.objectMeshById.get(object.id);
    expect(loadingRoot?.userData.vfxPreviewRole).toBe("world-z-ground-billboards");
    expect(loadingRoot?.userData.vfxTextureStatus).toBe("loading");
    let loadingMeshCount = 0;
    let loadingTexturedMeshCount = 0;
    loadingRoot?.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      loadingMeshCount += 1;
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      if (material instanceof THREE.MeshBasicMaterial && material.map) {
        loadingTexturedMeshCount += 1;
      }
    });
    expect(loadingMeshCount).toBeGreaterThan(0);
    expect(loadingTexturedMeshCount).toBe(0);

    const particleTexture = new THREE.Texture();
    resolveTexture?.(particleTexture);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    const readyRoot = runtime.objectMeshById.get(object.id);
    expect(readyRoot).toBe(loadingRoot);
    expect(readyRoot?.userData.vfxPreviewRole).toBe("world-z-ground-billboards");
    expect(readyRoot?.userData.vfxTextureStatus).toBe("applied");
    let texturedMeshCount = 0;
    readyRoot?.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      if (material instanceof THREE.MeshBasicMaterial && material.map) {
        texturedMeshCount += 1;
      }
    });
    expect(texturedMeshCount).toBeGreaterThan(0);
  });

  it("renders source MDL light-node VFX with visible preview markers by default", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);

    const object = {
      id: "preview:plc_dlp_light_08",
      kind: "placeables",
      name: "VFX: Pulse Light, Green*",
      resRef: "dlp_light_08",
      tag: "DLP_LIGHT_08",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const payload = createVfxPayloadWithReadyModel({
      templateId: "plc_dlp_light_08",
      resref: "dlp_light_08",
      placeableName: "VFX: Pulse Light, Green*",
      auroraLight: {
        source: "source-mdl",
        diagnostics: [],
        lights: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "source-model-light",
            sourceModelFileName: "dlp_light_08.mdl",
            sourceModelObjectKey: "modules/current/models/dlp_light_08.mdl",
            nodeName: "pulsing_light03",
            parentNodeName: "dlp_light_08",
            transform: {
              position: [0, 0, 2.5]
            },
            radius: 3,
            multiplier: 3,
            color: [0, 0.592157, 0.141176],
            ambientOnly: false,
            dynamicType: 1,
            affectDynamic: true,
            shadow: true,
            lightPriority: 2,
            animations: [
              {
                animationName: "default",
                lengthSeconds: 4.66667,
                transitionSeconds: 0.25,
                positionTimeline: [
                  { time: 0, value: [0, 0, 2.5] },
                  { time: 4.66667, value: [0, 0, 2.5] }
                ],
                colorTimeline: [
                  { time: 0, value: [0.0392157, 0.6, 0.164706] },
                  { time: 2.33333, value: [0, 1, 0.164706] },
                  { time: 4.66667, value: [0.0392157, 0.6, 0.164706] }
                ],
                radiusTimeline: [
                  { time: 0, value: 3 },
                  { time: 2.33333, value: 10 },
                  { time: 4.66667, value: 3 }
                ]
              }
            ]
          }
        ]
      }
    });
    if (payload.renderPackage) {
      delete payload.renderPackage.glbUrl;
      payload.renderPackage.assetRefs = {};
      delete payload.renderPackage.auroraEmitter;
    }

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
        [object.id]: payload
      }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewRole).toBe("aurora-light-node-group");
    expect(root?.userData.auroraVfxPreviewMode).toBe("aurora_light_node_preview");
    expect(root?.userData.auroraVfxDiagnosticCodes).toEqual(
      expect.arrayContaining(["VFX_AURORA_LIGHT_NODE_PREVIEW_NON_CANONICAL"])
    );
    expect(root?.userData.vfxLightCount).toBe(1);
    expect(root?.userData.vfxTextureStatus).toBe("not-requested");
    expect(root?.userData.auroraLightVisualPreviewMode).toBe(
      "source-mdl-light-visible-preview"
    );
    expect(root?.userData.auroraLightDiagnosticGizmosVisible).toBe(false);

    const pointLights: THREE.PointLight[] = [];
    const lightNodes: THREE.Object3D[] = [];
    const radiusGizmos: THREE.Mesh[] = [];
    const cores: THREE.Mesh[] = [];
    root?.traverse((node) => {
      if (node instanceof THREE.PointLight) {
        pointLights.push(node);
      }
      if (node.userData?.vfxPreviewRole === "aurora-light-node") {
        lightNodes.push(node);
      }
      if (node.userData?.auroraLightPreviewRole === "source-mdl-light-radius-gizmo") {
        radiusGizmos.push(node as THREE.Mesh);
      }
      if (node.userData?.auroraLightPreviewRole === "source-mdl-light-core") {
        cores.push(node as THREE.Mesh);
      }
    });

    expect(pointLights).toHaveLength(1);
    expect(pointLights[0]?.color.g).toBeCloseTo(0.6, 5);
    expect(pointLights[0]?.distance).toBeCloseTo(1.5, 5);
    expect(lightNodes[0]?.position.y).toBeCloseTo(1.25, 5);
    expect(lightNodes[0]?.userData.auroraLightSelectedAnimationName).toBe("default");
    expect(lightNodes[0]?.userData.auroraLightVisualPreviewMode).toBe(
      "source-mdl-light-visible-preview"
    );
    expect(radiusGizmos).toHaveLength(0);
    expect(cores).toHaveLength(1);
    expect(cores[0]?.visible).toBe(true);
  });

  it("shows source MDL light-node diagnostic gizmos only in non-render debug mode", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);

    const object = {
      id: "preview:plc_dlp_light_08",
      kind: "placeables",
      name: "VFX: Pulse Light, Green*",
      resRef: "dlp_light_08",
      tag: "DLP_LIGHT_08",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const payload = createVfxPayloadWithReadyModel({
      templateId: "plc_dlp_light_08",
      resref: "dlp_light_08",
      placeableName: "VFX: Pulse Light, Green*",
      auroraLight: {
        source: "source-mdl",
        diagnostics: [],
        lights: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "source-model-light",
            sourceModelFileName: "dlp_light_08.mdl",
            sourceModelObjectKey: "modules/current/models/dlp_light_08.mdl",
            nodeName: "pulsing_light03",
            parentNodeName: "dlp_light_08",
            transform: {
              position: [0, 0, 2.5]
            },
            radius: 3,
            multiplier: 3,
            color: [0, 0.592157, 0.141176],
            ambientOnly: false,
            dynamicType: 1,
            affectDynamic: true,
            shadow: true,
            lightPriority: 2
          }
        ]
      }
    });
    if (payload.renderPackage) {
      delete payload.renderPackage.glbUrl;
      payload.renderPackage.assetRefs = {};
      delete payload.renderPackage.auroraEmitter;
    }
    const debugState = createDebugState();
    debugState.showNonRenderMeshes = true;

    rebuildObjectMeshes(
      runtime,
      [object],
      [],
      debugState,
      1,
      false,
      10,
      [],
      false,
      {
        [object.id]: payload
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraLightVisualPreviewMode).toBe(
      "source-mdl-light-diagnostic-gizmos"
    );
    expect(root?.userData.auroraLightDiagnosticGizmosVisible).toBe(true);
    expect(root?.userData.auroraLightVisiblePlaceholderDiagnostic).toBe(
      "VFX_LIGHT_NODE_DIAGNOSTIC_GIZMO_DEBUG_ONLY"
    );

    const radiusGizmos: THREE.Mesh[] = [];
    const cores: THREE.Mesh[] = [];
    root?.traverse((node) => {
      if (node.userData?.auroraLightPreviewRole === "source-mdl-light-radius-gizmo") {
        radiusGizmos.push(node as THREE.Mesh);
      }
      if (node.userData?.auroraLightPreviewRole === "source-mdl-light-core") {
        cores.push(node as THREE.Mesh);
      }
    });
    expect(radiusGizmos).toHaveLength(1);
    expect(cores).toHaveLength(1);
    expect((radiusGizmos[0]?.material as THREE.MeshBasicMaterial | undefined)?.wireframe).toBe(
      true
    );
  });

  it("renders source-less catalog VFX as delivered static models instead of empty source-missing previews", async () => {
    const staticModel = new THREE.Group();
    staticModel.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.2, 0.3),
        new THREE.MeshBasicMaterial({ color: "#ffffff" })
      )
    );
    const load = vi.fn(
      (_url: string, onLoad: (gltf: { scene: THREE.Object3D }) => void) => {
        onLoad({ scene: staticModel });
      }
    );
    const runtime = createRuntime(load);

    const object = {
      id: "preview:plc_plc_t02",
      kind: "placeables",
      name: "VFX: Butterflies",
      resRef: "plc_t02",
      tag: "PLC_T02",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX: Butterflies",
          templateId: "plc_plc_t02",
          resref: "plc_t02",
          textureFileName: "plx_butterfly.dds",
          textureDeliveryUrl: "/assets/plx_butterfly.dds"
        })
      }
    );

    const loadingRoot = runtime.objectMeshById.get(object.id);
    expect(loadingRoot?.userData.renderPackageModelUrl).toBe(
      "http://localhost:3000/assets/cot_fx01.glb"
    );
    expect(loadingRoot?.userData.auroraVfxPreviewMode).toBe("static_model_preview");
    expect(loadingRoot?.userData.vfxPreviewRole).not.toBe("aurora-emitter-missing");
    expect(load).toHaveBeenCalledWith(
      "http://localhost:3000/assets/cot_fx01.glb",
      expect.any(Function),
      undefined,
      expect.any(Function)
    );

    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    const readyRoot = runtime.objectMeshById.get(object.id);
    let meshCount = 0;
    let texturedMeshCount = 0;
    readyRoot?.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      meshCount += 1;
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      if (material instanceof THREE.MeshBasicMaterial && material.map) {
        texturedMeshCount += 1;
      }
    });

    expect(meshCount).toBeGreaterThan(0);
    expect(texturedMeshCount).toBeGreaterThan(0);
  });

  it("loads backend-protected VFX textures through authorized blob URLs while rendering particles", async () => {
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const load = vi.fn();
    const runtime = createRuntime(load);
    const textureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cache-vfx/assets/texture-1.tga";
    const objectUrl = "blob:http://localhost/authorized-vfx-texture";
    let resolveTexture: ((texture: THREE.Texture) => void) | null = null;
    const textureFetch = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
      blob: async () => new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/x-tga" })
    }));
    const tgaLoader = vi.fn((url: string, onLoad: (texture: THREE.Texture) => void) => {
      expect(url).toBe(objectUrl);
      resolveTexture = onLoad;
    });
    runtime.placeableTextureFetch = textureFetch;
    runtime.placeableTextureRequestHeader = { Authorization: "Bearer token-vfx" };
    runtime.placeableTgaTextureLoader = { load: tgaLoader };
    URL.createObjectURL = vi.fn(() => objectUrl);
    URL.revokeObjectURL = vi.fn();

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX: Pentagram Small*",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    try {
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
          [object.id]: createVfxPayloadWithReadyModel({
            includeTextureContract: true,
            templateId: "plc_phod_fx_pntgrm2",
            resref: "phod_fx_pntgrm2",
            textureFileName: "phod_fx_pntgrm.tga",
            textureDeliveryUrl: "/api/v1/catalog/placeables/cache/cache-vfx/assets/texture-1.tga",
            auroraEmitter: createSingleTextureAuroraEmitter({
              texture: "phod_fx_pntgrm",
              renderMode: "Billboard_to_World_Z",
              blendMode: "Lighten",
              sourceModelFileName: "phod_fx_pntgrm2.mdl",
              nodeName: "lightBase_purple23"
            })
          })
        }
      );

      const loadingRoot = runtime.objectMeshById.get(object.id);
      expect(loadingRoot?.userData.vfxPreviewRole).toBe("world-z-ground-billboards");
      expect(loadingRoot?.userData.vfxTextureStatus).toBe("loading");
      let loadingMeshCount = 0;
      let loadingTexturedMeshCount = 0;
      loadingRoot?.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) {
          return;
        }
        loadingMeshCount += 1;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (material instanceof THREE.MeshBasicMaterial && material.map) {
          loadingTexturedMeshCount += 1;
        }
      });
      expect(loadingMeshCount).toBeGreaterThan(0);
      expect(loadingTexturedMeshCount).toBe(0);
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(textureFetch).toHaveBeenCalledWith(textureUrl, {
        headers: { Authorization: "Bearer token-vfx" }
      });
      expect(tgaLoader).toHaveBeenCalledWith(
        objectUrl,
        expect.any(Function),
        undefined,
        expect.any(Function)
      );

      const particleTexture = new THREE.Texture();
      resolveTexture?.(particleTexture);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      const readyRoot = runtime.objectMeshById.get(object.id);
      expect(readyRoot).toBe(loadingRoot);
      expect(readyRoot?.userData.vfxPreviewRole).toBe("world-z-ground-billboards");
      expect(readyRoot?.userData.vfxTextureStatus).toBe("applied");
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrl);
      expect(runtime.placeableTextureCacheByUrl.get(textureUrl)).toBe(particleTexture);
      expect(particleTexture.userData.auroraFetchedViaAuthorizedBlob).toBe(true);
      let texturedMeshCount = 0;
      readyRoot?.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) {
          return;
        }
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (material instanceof THREE.MeshBasicMaterial && material.map === particleTexture) {
          texturedMeshCount += 1;
        }
      });
      expect(texturedMeshCount).toBeGreaterThan(0);
    } finally {
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    }
  });

  it("renders static VFX models without synthesizing procedural particles when Aurora emitter payload is missing", async () => {
    const staticModel = new THREE.Group();
    staticModel.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.2, 0.3),
        new THREE.MeshBasicMaterial({ color: "#d9f0ff" })
      )
    );
    const load = vi.fn(
      (_url: string, onLoad: (gltf: { scene: THREE.Object3D }) => void) => {
        onLoad({ scene: staticModel });
      }
    );
    const runtime = createRuntime(load);

    const object = {
      id: "preview:plc_cot_fx01",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "cot_fx01",
      tag: "COT_FX01",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
      { [object.id]: createVfxPayloadWithReadyModel() }
    );

    expect(load).toHaveBeenCalledWith(
      "http://localhost:3000/assets/cot_fx01.glb",
      expect.any(Function),
      undefined,
      expect.any(Function)
    );
    const root = runtime.objectMeshById.get(object.id);
    expect(root).toBeDefined();
    expect(root?.userData.auroraVfxCanonicalStatus).toBe("preview_only");
    expect(root?.userData.auroraVfxPreviewMode).toBe("static_model_preview");
    expect(root?.userData.auroraVfxDiagnosticCodes).toEqual(
      expect.arrayContaining([
        "VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT",
        "VFX_STATIC_MODEL_PREVIEW_NON_CANONICAL",
        "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY"
      ])
    );
    expect(root?.userData.vfxPreviewRole).toBeUndefined();
    const particles = collectCameraBillboardParticles(root);
    expect(particles).toHaveLength(0);

    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    let meshCount = 0;
    root?.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        meshCount += 1;
      }
    });
    expect(meshCount).toBeGreaterThan(0);
  });

  it("keeps texture-backed VFX payloads in preview-only mode without loading their GLB", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const alphaOnlyPixels = new Uint8Array([
      0, 0, 0, 0,
      0, 0, 0, 64,
      0, 0, 0, 160,
      0, 0, 0, 255
    ]);
    const particleTexture = new THREE.DataTexture(alphaOnlyPixels, 2, 2, THREE.RGBAFormat);
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_smoke_red.dds",
      particleTexture
    );

    const object = {
      id: "preview:plc_cot_fx01",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "cot_fx01",
      tag: "COT_FX01",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          auroraEmitter: createSingleTextureAuroraEmitter()
        })
      }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxCanonicalStatus).toBe("preview_only");
    expect(root?.userData.auroraVfxPreviewMode).toBe("aurora_emitter_particle_preview");
    const particles = collectCameraBillboardParticles(root);
    const mappedParticleCount = particles.filter(
      ({ material }) =>
        material.map?.userData?.auroraConvertedAlphaOnlyTexture === true &&
        material.map !== particleTexture
    ).length;
    expect(particles.length).toBeGreaterThan(0);
    particles.forEach(({ mesh }) => expectAuroraCameraBillboardQuad(mesh));
    expect(mappedParticleCount).toBe(particles.length);
  });

  it("renders simulation-only Aurora emitter payloads with delivered texture URLs", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_svetred.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_phod_fx_svetred",
      kind: "placeables",
      name: "VFX: SVETLOBA FALL: RED*",
      resRef: "phod_fx_svetred",
      tag: "PHOD_FX_SVETRED",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const payload = createVfxPayloadWithReadyModel({
      includeTextureContract: false,
      templateId: "plc_phod_fx_svetred",
      resref: "phod_fx_svetred",
      placeableName: "VFX: SVETLOBA FALL: RED*",
      auroraEmitter: {
        source: "source-mdl",
        diagnostics: [],
        emitters: [
          {
            source: "aurora-mdl-binary",
            sourceModelAssetId: "source-model-1",
            sourceModelFileName: "phod_fx_svetred.mdl",
            sourceModelObjectKey: "modules/current/models/phod_fx_svetred.mdl",
            nodeName: "auroraemitter01",
            simulation: {
              birthrate: 4,
              lifeExp: 2,
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
    });
    if (payload.renderPackage) {
      payload.renderPackage.textureUrls = ["/assets/phod_fx_svetred.tga"];
    }

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
      { [object.id]: payload }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxCanonicalStatus).toBe("preview_only");
    expect(root?.userData.auroraVfxPreviewMode).toBe("aurora_emitter_particle_preview");
    expect(root?.userData.vfxTextureDeliveryUrl).toBe(
      "http://localhost:3000/assets/phod_fx_svetred.tga"
    );
    expect(root?.userData.vfxTextureStatus).toBe("applied");
    expect(root?.userData.auroraEmitterTexture).toBeUndefined();
    expect(root?.userData.auroraEmitterSimulationPreviewMode).toBe(
      "profile-parameter-preview"
    );
    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    particles.forEach(({ mesh, material }) => {
      expectAuroraCameraBillboardQuad(mesh);
      expect(material.map).toBe(particleTexture);
    });
  });

  it("does not synthesize textured particles or fallback texture loads for Aurora texture NULL emitters", async () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const textureLoad = runtime.placeableTextureLoader.load as unknown as ReturnType<typeof vi.fn>;

    const object = {
      id: "preview:plc_texture_null_vfx",
      kind: "placeables",
      name: "VFX TEXTURE NULL",
      resRef: "texture_null_vfx",
      tag: "TEXTURE_NULL_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_texture_null_vfx",
          resref: "texture_null_vfx",
          textureFileName: "fx_should_not_load.tga",
          textureDeliveryUrl: "/assets/fx_should_not_load.tga",
          auroraEmitter: createSingleTextureAuroraEmitter({
            texture: "NULL",
            sourceModelFileName: "texture_null_vfx.mdl",
            nodeName: "texture_null_emitter"
          })
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxTextureStatus).toBe("null-texture");
    expect(root?.userData.vfxTextureDeliveryUrl).toBeNull();
    expect(root?.userData.auroraEmitterTexture).toBe("NULL");
    expect(root?.userData.auroraEmitterTextureNullNoChunk).toBe(true);
    expect(root?.userData.auroraEmitterTextureNullPreviewMode).toBe(
      "texture-null-no-textured-draw"
    );
    expect(root?.userData.auroraEmitterTextureNullDiagnostic).toBe(
      "VFX_TEXTURE_NULL_NO_CHUNK_NO_TEXTURED_DRAW"
    );
    expect(root?.userData.auroraEmitterParticleCountSource).toBe(8);
    expect(root?.userData.auroraEmitterParticleCount).toBe(0);
    expect(root?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "texture-null-no-textured-draw"
    );
    expect(collectCameraBillboardParticles(root)).toHaveLength(0);
    let meshCount = 0;
    root?.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        meshCount += 1;
      }
    });
    expect(meshCount).toBe(0);

    await Promise.resolve();
    await Promise.resolve();
    expect(textureLoad).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it("renders flowing liquid VFX as world-Z texture sheets instead of camera sprites", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const alphaOnlyPixels = new Uint8Array([
      0, 0, 0, 0,
      0, 0, 0, 64,
      0, 0, 0, 160,
      0, 0, 0, 255
    ]);
    const particleTexture = new THREE.DataTexture(alphaOnlyPixels, 2, 2, THREE.RGBAFormat);
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/gxpa_flava.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_glc_lava2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "glc_lava2",
      tag: "GLC_LAVA2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX: Flowing Lava 2*",
          templateId: "plc_glc_lava2",
          resref: "glc_lava2",
          textureFileName: "gxpa_flava.tga",
          textureDeliveryUrl: "/assets/gxpa_flava.tga",
          auroraEmitter: createSingleTextureAuroraEmitter({
            texture: "gxpa_flava",
            renderMode: "Billboard_to_World_Z",
            blendMode: "Lighten",
            sourceModelFileName: "glc_lava2.mdl",
            nodeName: "auroraemitter01"
          })
        })
      }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxCanonicalStatus).toBe("preview_only");
    expect(root?.userData.auroraVfxPreviewMode).toBe("aurora_emitter_particle_preview");
    expect(root?.userData.vfxPreviewLayout).toBe("world_z_sheet");
    expect(root?.position.y).toBeCloseTo(0, 3);
    let spriteCount = 0;
    let sheetMeshCount = 0;
    let mappedSheetCount = 0;
    root?.traverse((node) => {
      if (node instanceof THREE.Sprite) {
        spriteCount += 1;
      }
      if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "world-z-sheet") {
        sheetMeshCount += 1;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (
          material instanceof THREE.MeshBasicMaterial &&
          material.map?.userData?.auroraConvertedAlphaOnlyTexture === true &&
          material.map !== particleTexture
        ) {
          mappedSheetCount += 1;
        }
      }
    });
    expect(spriteCount).toBe(0);
    expect(sheetMeshCount).toBeGreaterThan(0);
    expect(mappedSheetCount).toBe(sheetMeshCount);
  });

  it("keeps dynamic world-Z liquid emitters surface-bound instead of expanding them into vertical plumes", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/gxpa_flava.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_glc_lava2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "glc_lava2",
      tag: "GLC_LAVA2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX: Flowing Lava 2*",
          templateId: "plc_glc_lava2",
          resref: "glc_lava2",
          textureFileName: "gxpa_flava.tga",
          textureDeliveryUrl: "/assets/gxpa_flava.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "glc_lava2.mdl",
                sourceModelObjectKey: "modules/current/models/glc_lava2.mdl",
                nodeName: "auroraemitter01",
                texture: "gxpa_flava",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                simulation: {
                  xSize: 150,
                  ySize: 0,
                  birthrate: 4,
                  lifeExp: 8,
                  velocity: 2,
                  randvel: 1,
                  spread: 0,
                  sizeStart: 2.5,
                  sizeEnd: 3,
                  alphaStart: 0.2,
                  alphaEnd: 0,
                  colorStart: [0.8, 0.8, 0.8],
                  colorEnd: [0.8, 0.8, 0.8],
                  affectedByWind: false
                },
                sourceState: {
                  isTinted: true,
                  splat: false
                }
              }
            ]
          }
        })
      }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("world_z_sheet");
    expect(root?.userData.auroraEmitterBirthrate).toBe(4);
    expect(root?.userData.auroraEmitterLifeSeconds).toBe(8);
    expect(root?.userData.auroraEmitterParticleVelocity).toBeGreaterThan(0);
    expect(root?.userData.auroraEmitterSurfaceMotionPreviewMode).toBe(
      "world-z-sheet-surface-flow"
    );
    expect(root?.userData.auroraEmitterParticleCountSource).toBe(32);
    expect(root?.userData.auroraEmitterParticleCountLimit).toBe(4);
    expect(root?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "birthrate-lifetime-preview-capped"
    );
    expect(root?.userData.auroraEmitterParticleCount).toBe(4);
    expect(root?.userData.auroraEmitterSurfaceSpawnMode).toBe("source-xsize-line");
    expect(root?.userData.auroraEmitterSurfaceWidth).toBeGreaterThan(0);
    expect(root?.userData.auroraEmitterSurfaceDepth).toBe(0);
    expect(root?.userData.auroraEmitterPreviewColor).toBe("#ff9f43");
    expect(root?.userData.auroraEmitterPreviewColorMode).toBe(
      "semantic-scene-tint-preview"
    );
    expect(root?.userData.auroraEmitterTintDiagnostic).toBe(
      "VFX_PARTICLE_TINT_SCENE_CONTEXT_REQUIRED"
    );

    let sheetMeshCount = 0;
    let semanticTintMaterialCount = 0;
    let firstSheetColor: string | null = null;
    let maxInitialAbsX = 0;
    let maxInitialAbsZ = 0;
    let maxInitialY = 0;
    let maxInitialRotationZ = 0;
    root?.traverse((node) => {
      if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "world-z-sheet") {
        sheetMeshCount += 1;
        maxInitialAbsX = Math.max(maxInitialAbsX, Math.abs(node.position.x));
        maxInitialAbsZ = Math.max(maxInitialAbsZ, Math.abs(node.position.z));
        maxInitialY = Math.max(maxInitialY, Math.abs(node.position.y));
        maxInitialRotationZ = Math.max(maxInitialRotationZ, Math.abs(node.rotation.z));
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (material instanceof THREE.MeshBasicMaterial) {
          firstSheetColor ??= `#${readFirstAuroraVertexColor(node).getHexString()}`;
          expect(material.vertexColors).toBe(true);
          if (material.userData.auroraEmitterPreviewColorMode === "semantic-scene-tint-preview") {
            semanticTintMaterialCount += 1;
          }
        }
      }
    });
    expect(sheetMeshCount).toBe(root?.userData.auroraEmitterParticleCount);
    expect(semanticTintMaterialCount).toBe(sheetMeshCount);
    expect(firstSheetColor).toBe("#ff9f43");
    expect(maxInitialAbsX).toBeGreaterThan(0);
    expect(maxInitialAbsZ).toBeCloseTo(0, 6);
    expect(maxInitialY).toBeCloseTo(root?.userData.auroraEmitterBaseLift ?? 0, 6);
    expect(maxInitialRotationZ).toBeCloseTo(0, 6);
  });

  it("gates below-threshold Aurora xsize/ysize axes instead of continuous tiny rectangles", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_cutout.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_tiny_surface_vfx",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "tiny_surface_vfx",
      tag: "TINY_SURFACE_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_tiny_surface_vfx",
          resref: "tiny_surface_vfx",
          textureFileName: "fx_cutout.tga",
          textureDeliveryUrl: "/assets/fx_cutout.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "tiny_surface_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/tiny_surface_vfx.mdl",
                nodeName: "tiny_surface_emitter",
                texture: "fx_cutout",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                simulation: {
                  xSize: 3,
                  ySize: 0,
                  birthrate: 2,
                  lifeExp: 1,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  sizeStart: 0.5,
                  sizeEnd: 0.5,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterSurfaceSpawnMode).toBe("source-point");
    expect(root?.userData.auroraEmitterSurfacePreviewMode).toBe(
      "xsize-ysize-axis-gated-preview"
    );
    expect(root?.userData.auroraEmitterSurfaceSamplingPreviewMode).toBe(
      "below-threshold-axis-gated-preview"
    );
    expect(root?.userData.auroraEmitterSurfaceDiagnostics).toEqual(
      expect.arrayContaining(["VFX_EMITTER_SPAWN_RECTANGLE_LT4_AXIS_GATE"])
    );
    expect(root?.userData.auroraEmitterSurfaceWidth).toBeCloseTo(0.015, 6);
    expect(root?.userData.auroraEmitterSurfaceDepth).toBe(0);
    expect(root?.userData.auroraEmitterSurfaceEffectiveWidth).toBe(0);
    expect(root?.userData.auroraEmitterSurfaceEffectiveDepth).toBe(0);
    expect(root?.userData.auroraEmitterSurfaceAxisGateCm).toBe(4);

    let meshCount = 0;
    let maxAbsX = 0;
    let maxAbsZ = 0;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        meshCount += 1;
        maxAbsX = Math.max(maxAbsX, Math.abs(node.position.x));
        maxAbsZ = Math.max(maxAbsZ, Math.abs(node.position.z));
      }
    });
    expect(meshCount).toBeGreaterThan(0);
    expect(maxAbsX).toBeCloseTo(0, 6);
    expect(maxAbsZ).toBeCloseTo(0, 6);
  });

  it("samples Aurora xSize and ySize keyframes for emitter surface dimensions", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_surface_key.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_surface_size_key_vfx",
      kind: "placeables",
      name: "VFX SURFACE SIZE KEY",
      resRef: "surface_size_key_vfx",
      tag: "SURFACE_SIZE_KEY_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const xSizeTimeline = [
      { time: 0, value: 0 },
      { time: 1, value: 80 }
    ];
    const ySizeTimeline = [
      { time: 0, value: 0 },
      { time: 1, value: 20 }
    ];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_surface_size_key_vfx",
          resref: "surface_size_key_vfx",
          textureFileName: "fx_surface_key.tga",
          textureDeliveryUrl: "/assets/fx_surface_key.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "surface_size_key_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/surface_size_key_vfx.mdl",
                nodeName: "surface_size_key_emitter",
                texture: "fx_surface_key",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                simulation: {
                  xSize: 0,
                  ySize: 0,
                  birthrate: 2,
                  lifeExp: 2,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  sizeStart: 0.5,
                  sizeEnd: 0.5,
                  alphaStart: 1,
                  alphaEnd: 1,
                  timeline: {
                    xSize: xSizeTimeline,
                    ySize: ySizeTimeline
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterSurfaceSpawnMode).toBe("source-xsize-ysize-plane");
    expect(root?.userData.auroraEmitterSurfacePreviewMode).toBe(
      "xsize-ysize-spawn-rectangle-preview"
    );
    expect(root?.userData.auroraEmitterSurfaceXSizeTimeline).toEqual(xSizeTimeline);
    expect(root?.userData.auroraEmitterSurfaceYSizeTimeline).toEqual(ySizeTimeline);
    expect(root?.userData.auroraEmitterSurfaceSizeTimelinePreviewMode).toBe(
      "runtime-xsize-ysize-keyframe-surface-preview"
    );
    expect(root?.userData.auroraEmitterSurfaceWidthSourceCm).toBe(80);
    expect(root?.userData.auroraEmitterSurfaceDepthSourceCm).toBe(20);
    expect(root?.userData.auroraEmitterSurfaceWidth).toBeCloseTo(0.4, 6);
    expect(root?.userData.auroraEmitterSurfaceDepth).toBeCloseTo(0.1, 6);
    expect(root?.userData.auroraEmitterSurfaceEffectiveWidth).toBeCloseTo(0.4, 6);
    expect(root?.userData.auroraEmitterSurfaceEffectiveDepth).toBeCloseTo(0.1, 6);

    let maxAbsX = 0;
    let maxAbsZ = 0;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        maxAbsX = Math.max(maxAbsX, Math.abs(node.position.x));
        maxAbsZ = Math.max(maxAbsZ, Math.abs(node.position.z));
      }
    });
    expect(maxAbsX).toBeGreaterThan(0);
    expect(maxAbsZ).toBeGreaterThan(0);
    expect(load).not.toHaveBeenCalled();
  });

  it("uses Aurora emitter renderMode instead of name heuristics for world-Z billboard VFX", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "auroraemitter01",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal"
              }
            ]
          }
        })
      }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("world_z_billboard");
    expect(root?.userData.vfxPreviewRole).toBe("world-z-ground-billboards");
    expect(root?.userData.auroraEmitterRenderMode).toBe("Billboard_to_World_Z");
    expect(root?.userData.auroraEmitterTexture).toBe("phod_fx_pntgrm");
    expect(runtime.container.dataset.placeableModelStatus).toBe("loaded");
    expect(runtime.container.dataset.placeableModelLoadPhase).toBe("vfx-texture");
    expect(runtime.container.dataset.placeableModelTextureStatus).toBe("applied");
    let spriteCount = 0;
    let groundBillboardMeshCount = 0;
    root?.traverse((node) => {
      if (node instanceof THREE.Sprite) {
        spriteCount += 1;
      }
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        groundBillboardMeshCount += 1;
        expect(node.rotation.x).toBeCloseTo(-Math.PI / 2, 4);
        expect(node.userData.auroraVfxDrawPrimitivePreview).toBe(
          "non-indexed-six-vertex-triangle-list"
        );
        expect(node.geometry.index).toBeNull();
        expect(node.geometry.userData.auroraVfxTexturedParticleQuad).toBe(true);
        expect(node.geometry.userData.auroraVfxParticleVertexCount).toBe(6);
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
        expectAuroraParticleSoftnessState(node, material as THREE.MeshBasicMaterial, {
          gate: "zero-for-billboard-to-world-z",
          value: 0
        });
        const positions = node.geometry.getAttribute("position");
        const uvs = node.geometry.getAttribute("uv");
        expect(positions.count).toBe(6);
        expect(uvs.count).toBe(6);
        expect(positions.getX(1)).toBeCloseTo(positions.getX(4), 4);
        expect(positions.getY(1)).toBeCloseTo(positions.getY(4), 4);
        expect(positions.getX(2)).toBeCloseTo(positions.getX(3), 4);
        expect(positions.getY(2)).toBeCloseTo(positions.getY(3), 4);
      }
    });
    expect(spriteCount).toBe(0);
    expect(groundBillboardMeshCount).toBe(1);
  });

  it("honors dynamic Aurora simulation for symbol-like world-Z emitters instead of freezing them as one image", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "dynamic_pentagram_emitter",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 4,
                  lifeExp: 2,
                  velocity: 0.35,
                  randvel: 0.1,
                  spread: 45,
                  sizeStart: 0.85,
                  sizeEnd: 1.1,
                  alphaStart: 0.95,
                  alphaEnd: 0.2,
                  colorStart: [1, 0.4, 0.2],
                  colorEnd: [0.2, 0.05, 0.8]
                }
              }
            ]
          }
        })
      }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("world_z_billboard");
    expect(root?.userData.auroraEmitterRenderBucket).toBe("billboard_to_world_z");
    expect(root?.userData.auroraEmitterRenderRuntimeMode).toBe(2);
    expect(root?.userData.auroraEmitterBirthrate).toBe(4);
    expect(root?.userData.auroraEmitterLifeSeconds).toBe(2);
    expect(root?.userData.auroraEmitterZeroMotionPreviewMode).toBeUndefined();
    expect(root?.userData.auroraEmitterKinematicsPreviewMode).toBe(
      "velocity-spread-integrated-preview"
    );
    expect(root?.userData.auroraEmitterEmissionPreviewMode).toBe(
      "birthrate-lifetime-scheduled-preview"
    );

    let groundBillboardMeshCount = 0;
    let lightenMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        groundBillboardMeshCount += 1;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!lightenMaterial && material instanceof THREE.MeshBasicMaterial) {
          lightenMaterial = material;
        }
      }
    });
    expect(groundBillboardMeshCount).toBe(8);
    expect(lightenMaterial?.userData.auroraEmitterBlendMode).toBe("Lighten");
    expect(lightenMaterial?.userData.auroraEmitterBlendBucket).toBe("fallback_mode_2");
    expect(lightenMaterial?.userData.auroraEmitterBlendRuntimeMode).toBe(2);
    expect(lightenMaterial?.userData.auroraEmitterBlendAuthoringCandidate).toBe("Lighten");
    expect(lightenMaterial?.userData.auroraEmitterBlendDiagnostic).toBe(
      "VFX_LIGHTEN_MODE2_EQUATION_CAPTURE_REQUIRED"
    );
    expect(lightenMaterial?.userData.auroraEmitterBlendStatePreviewMode).toBe(
      "aurora-blend-lighten-additive-adapter"
    );
    expect(lightenMaterial?.blending).toBe(THREE.CustomBlending);
    expect(lightenMaterial?.blendEquation).toBe(THREE.AddEquation);
    expect(lightenMaterial?.blendSrc).toBe(THREE.OneFactor);
    expect(lightenMaterial?.blendDst).toBe(THREE.OneFactor);
    expect(lightenMaterial?.blendEquationAlpha).toBe(THREE.AddEquation);
    expect(lightenMaterial?.blendSrcAlpha).toBe(THREE.OneFactor);
    expect(lightenMaterial?.blendDstAlpha).toBe(THREE.OneFactor);
    expect(lightenMaterial?.depthWrite).toBe(false);
    expect(root?.userData.auroraParticleRenderStatePreviewMode).toBe(
      "aurora-non-punch-transparent-depthwrite-off-record"
    );
    expect(root?.userData.auroraParticleTransparentLaneState0).toBe(true);
    expect(root?.userData.auroraParticlePunchThroughState1).toBe(false);
    expect(root?.userData.auroraParticleRequestedDepthWrite).toBe(false);
    expect(root?.userData.auroraParticleShaderVariantFlag).toBe("non-punch");
    expect(root?.userData.auroraParticleNonPunchVariantFlag).toBe(true);
    expect(root?.userData.auroraParticleBlendFuncWrapperInvoked).toBe(true);
    expect(root?.userData.auroraParticleBlendFuncFactorsCaptured).toBe(false);
    expect(root?.userData.auroraParticleRenderStateDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_RENDER_STATE_CACHE_WRAPPER_REQUIRED",
        "VFX_BLEND_FUNC_FACTORS_CAPTURE_REQUIRED",
        "VFX_NONPUNCH_TRANSPARENT_DEPTHWRITE_OFF_REQUIRED"
      ])
    );
    expect(lightenMaterial?.userData.auroraParticleRenderState.runtimeBlendMode).toBe(2);
    expect(lightenMaterial?.userData.auroraParticleTransparentLaneState0).toBe(true);
    expect(lightenMaterial?.userData.auroraParticleRequestedDepthWrite).toBe(false);
  });

  it("uses Aurora velocity and spread for Billboard_to_World_Z smoke instead of procedural vertical drift", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_dag_fog_med",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "dag_fog_med",
      tag: "DAG_FOG_MED",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX: Fog - Medium",
          templateId: "plc_dag_fog_med",
          resref: "dag_fog_med",
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "dag_fog_med.mdl",
                sourceModelObjectKey: "modules/current/models/dag_fog_med.mdl",
                nodeName: "fire!03",
                texture: "fxpa_smoke01",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                transform: {
                  position: [0.05, -0.13, 0.01]
                },
                simulation: {
                  xSize: 40,
                  ySize: 40,
                  birthrate: 2,
                  lifeExp: 3,
                  velocity: 0.35,
                  randvel: 0.1,
                  spread: 90,
                  sizeStart: 3,
                  sizeEnd: 7,
                  alphaStart: 0.25,
                  alphaEnd: 0,
                  colorStart: [0.8, 0.8, 0.8],
                  colorEnd: [0.8, 0.8, 0.8]
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("world_z_billboard");
    expect(root?.userData.auroraEmitterKinematicsPreviewMode).toBe(
      "velocity-spread-integrated-preview"
    );
    let groundMesh: THREE.Mesh | null = null;
    let groundMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "world-z-ground-billboard") {
        groundMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!groundMaterial && material instanceof THREE.MeshBasicMaterial) {
          groundMaterial = material;
        }
      }
    });

    expect(groundMesh).not.toBeNull();
    expect(groundMaterial).not.toBeNull();
    const initialPosition = groundMesh!.position.clone();
    performanceNow.mockReturnValue(1000);
    groundMesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      groundMesh!.geometry,
      groundMaterial!,
      null
    );

    expect(groundMesh!.userData.auroraEmitterWorldZKinematicsPreviewMode).toBe(
      "source-velocity-spread-position-integration"
    );
    expect(groundMesh!.userData.auroraEmitterWorldZKinematicOffset).toEqual([
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    ]);
    expect(groundMesh!.position.distanceTo(initialPosition)).toBeGreaterThan(0.001);
    expect(groundMesh!.rotation.x).toBeCloseTo(-Math.PI / 2, 6);
    performanceNow.mockRestore();
  });

  it("preserves unknown Aurora render tokens instead of silently mapping them", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_unknown_render.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_unknown_render_vfx",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "unknown_render_vfx",
      tag: "UNKNOWN_RENDER_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_unknown_render_vfx",
          resref: "unknown_render_vfx",
          textureFileName: "fx_unknown_render.tga",
          textureDeliveryUrl: "/assets/fx_unknown_render.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "unknown_render_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/unknown_render_vfx.mdl",
                nodeName: "unknown_render_emitter",
                texture: "fx_unknown_render",
                emitterType: "Fountain",
                renderMode: "Diagonal Sparkle",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 1,
                  sizeStart: 0.5,
                  sizeEnd: 0.5,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterRenderMode).toBe("Diagonal Sparkle");
    expect(root?.userData.auroraEmitterRenderBucket).toBe("unknown");
    expect(root?.userData.auroraEmitterRenderRuntimeMode).toBeUndefined();
    expect(root?.userData.auroraEmitterRenderDiagnostic).toBe(
      "VFX_UNKNOWN_RENDER_MODE_RAW_TOKEN_PRESERVED"
    );
    expect(root?.userData.vfxPreviewLayout).toBe("camera_billboard");
    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    expectAuroraCameraBillboardQuad(particles[0]!.mesh);
  });

  it("maps legacy Aurora Billboard render tokens to normal camera-facing particles", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_mov.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_phod_fx_ppineblu",
      kind: "placeables",
      name: "VFX: Porcupine: Blue*",
      resRef: "phod_fx_ppineblu",
      tag: "PHOD_FX_PPINEBLU",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_phod_fx_ppineblu",
          resref: "phod_fx_ppineblu",
          placeableName: "VFX: Porcupine: Blue*",
          textureFileName: "fxpa_mov.tga",
          textureDeliveryUrl: "/assets/fxpa_mov.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_ppineblu.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_ppineblu.mdl",
                nodeName: "OmenEmitter266",
                texture: "fxpa_mov",
                emitterType: "Fountain",
                renderMode: "Billboard",
                blendMode: "Lighten",
                sourceState: {
                  twoSidedTexture: true,
                  loop: false
                },
                simulation: {
                  xSize: 450,
                  ySize: 450,
                  spawnType: 0,
                  birthrate: 60,
                  lifeExp: 0.8,
                  velocity: 2.8,
                  randvel: 0.4,
                  spread: 1.75,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 0
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterRenderMode).toBe("Billboard");
    expect(root?.userData.auroraEmitterRenderBucket).toBe("normal");
    expect(root?.userData.auroraEmitterRenderRuntimeMode).toBe(0);
    expect(root?.userData.auroraEmitterRenderDiagnostic).toBeUndefined();
    expect(root?.userData.vfxPreviewLayout).toBe("camera_billboard");
    expect(root?.userData.auroraEmitterSurfaceSpawnMode).toBe("source-xsize-ysize-plane");
    expect(root?.userData.auroraEmitterSurfaceSamplingPreviewMode).toBe(
      "integer-sign-sampler-preview"
    );
    expect(root?.userData.auroraEmitterSurfaceDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_EMITTER_SPAWN_RECTANGLE_INTEGER_SIGN_SAMPLER_REQUIRED",
        "VFX_EMITTER_SPAWN_RECTANGLE_RUNTIME_BASIS_REQUIRED"
      ])
    );
    expect(root?.userData.auroraEmitterSurfaceUnitScale).toBeCloseTo(0.005, 6);

    const particles = collectCameraBillboardParticles(root);
    expect(particles).toHaveLength(48);
    const batches = collectCameraBillboardBatches(root);
    expect(batches).toHaveLength(1);
    expect(root?.userData.auroraParticleBatchRendererPreviewMode).toBe(
      "aurora-contiguous-particle-vertex-buffer"
    );
    expect(root?.userData.auroraParticleBatchSlotCount).toBe(48);
    expect(root?.userData.auroraParticleBatchVisibleMeshRole).toBe(
      "camera-billboard-batch"
    );
    expectAuroraParticleDrawRecordUserData(root?.userData, {
      activeParticleCount: 48
    });
    const surfaceUnitScale = root?.userData.auroraEmitterSurfaceUnitScale as number;
    particles.slice(0, 12).forEach(({ mesh }) => {
      expect(mesh.position.x / surfaceUnitScale).toBeCloseTo(
        Math.round(mesh.position.x / surfaceUnitScale),
        6
      );
      expect(mesh.position.z / surfaceUnitScale).toBeCloseTo(
        Math.round(mesh.position.z / surfaceUnitScale),
        6
      );
    });
    expectAuroraCameraBillboardQuad(particles[0]!.mesh);
    expect(particles[0]!.mesh.visible).toBe(false);
    expect(particles[0]!.mesh.userData.auroraParticleSlotPreviewMode).toBe(
      "hidden-provenance-slot-for-contiguous-batch"
    );
    expect(particles[0]!.mesh.userData.auroraParticleRenderedByBatch).toBe(true);
    expectAuroraParticleDrawRecordUserData(particles[0]!.mesh.userData, {
      activeParticleCount: 48
    });
    expectAuroraParticleDrawRecordUserData(particles[0]!.mesh.geometry.userData, {
      activeParticleCount: 48
    });
    expectAuroraParticleDrawRecordUserData(particles[0]!.material.userData, {
      activeParticleCount: 48
    });
    const batch = batches[0]!;
    expect(batch.mesh.visible).toBe(true);
    expect(batch.mesh.frustumCulled).toBe(false);
    expect(batch.mesh.userData.auroraParticleBatchRendererPreviewMode).toBe(
      "aurora-contiguous-particle-vertex-buffer"
    );
    expect(batch.mesh.userData.auroraParticleBatchSourceSlotPreviewMode).toBe(
      "hidden-provenance-slot-for-contiguous-batch"
    );
    expect(batch.mesh.geometry.index).toBeNull();
    expect(batch.mesh.geometry.userData.auroraVfxTexturedParticleBatch).toBe(true);
    expect(batch.mesh.geometry.userData.auroraParticleBatchVertexCapacity).toBe(288);
    expect(batch.mesh.geometry.getAttribute("position").count).toBe(288);
    expect(batch.mesh.geometry.getAttribute("uv").count).toBe(288);
    expect(batch.mesh.geometry.getAttribute("color").count).toBe(288);
    expect(batch.mesh.geometry.getAttribute("auroraAlpha").count).toBe(288);
    expectAuroraParticleDrawRecordUserData(batch.mesh.userData, {
      activeParticleCount: 48
    });
    expectAuroraParticleDrawRecordUserData(batch.mesh.geometry.userData, {
      activeParticleCount: 48
    });
    expectAuroraParticleDrawRecordUserData(batch.material.userData, {
      activeParticleCount: 48
    });
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(2, 2, 4);
    camera.updateMatrixWorld();
    performanceNow.mockReturnValue(500);
    batch.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      batch.mesh.geometry,
      batch.material,
      null
    );
    expect(batch.mesh.userData.auroraParticleBatchUpdatePreviewMode).toBe(
      "slot-simulated-contiguous-vertex-buffer-copy"
    );
    expect(batch.mesh.userData.auroraParticleBatchCopiedSlotCount).toBe(48);
    expect(batch.mesh.userData.auroraParticleBatchVisibleCount).toBeGreaterThan(0);
    const batchAlpha = batch.mesh.geometry.getAttribute("auroraAlpha");
    const maxBatchAlpha = Math.max(
      ...Array.from({ length: batchAlpha.count }, (_, index) => batchAlpha.getX(index))
    );
    expect(maxBatchAlpha).toBeGreaterThan(0);
    expectAuroraParticleSoftnessState(particles[0]!.mesh, particles[0]!.material, {
      gate: "derived-from-max-evaluated-half-extent",
      positive: true
    });
    expect(particles[0]!.material.side).toBe(THREE.DoubleSide);
    performanceNow.mockRestore();
  });

  it("keeps high-birthrate bubble surface emitters light and source-sized", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_surface.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_surface_line",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "surface_line",
      tag: "SURFACE_LINE",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_surface_line",
          resref: "surface_line",
          placeableName: "VFX PREVIEW",
          textureFileName: "fx_surface.tga",
          textureDeliveryUrl: "/assets/fx_surface.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "ccc_bbl_500.mdl",
                sourceModelObjectKey: "modules/current/models/ccc_bbl_500.mdl",
                nodeName: "surface_line",
                texture: "fx_surface",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Lighten",
                sourceState: {
                  twoSidedTexture: false
                },
                atlas: {
                  xGridRaw: 4,
                  yGridRaw: 4,
                  effectiveXGrid: 4,
                  effectiveYGrid: 4,
                  fps: 0,
                  frameStart: 5,
                  frameEnd: 5,
                  random: false
                },
                simulation: {
                  xSize: 500,
                  ySize: 10,
                  spawnType: 0,
                  birthrate: 50,
                  lifeExp: 9,
                  velocity: 0.1,
                  randvel: 0.3,
                  spread: 0.698132,
                  sizeStart: 0.45,
                  sizeStartY: 0,
                  sizeMidY: 0.35,
                  sizeEnd: 1.1,
                  sizeEndY: 0,
                  alphaStart: 0.85,
                  alphaEnd: 0
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterBirthrate).toBe(50);
    expect(root?.userData.auroraEmitterLifeSeconds).toBe(9);
    expect(root?.userData.auroraEmitterParticleCountSource).toBe(450);
    expect(root?.userData.auroraEmitterParticleCountLimit).toBe(32);
    expect(root?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "birthrate-lifetime-preview-capped"
    );
    expect(root?.userData.auroraEmitterParticleCount).toBe(32);
    expect(root?.userData.auroraEmitterSurfaceSpawnMode).toBe("source-xsize-ysize-plane");
    expect(root?.userData.auroraEmitterBubblePreviewMode).toBe("source-bubble-particle-preview");
    expect(root?.userData.auroraEmitterTwoSidedTexture).toBe(false);
    expect(root?.userData.auroraEmitterTextureSide).toBe(THREE.FrontSide);
    expect(root?.userData.auroraEmitterCullState3).toBe("enabled");
    expect(root?.userData.auroraEmitterAtlas).toMatchObject({
      effectiveXGrid: 4,
      effectiveYGrid: 4,
      frameStart: 5,
      frameEnd: 5
    });
    expect(root?.userData.auroraEmitterBubbleAlphaPreviewMode).toBe(
      "lighten-bubble-overdraw-preview-cap"
    );
    expect(root?.userData.auroraEmitterBubbleDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_BUBBLE_LIGHTEN_OVERDRAW_PREVIEW_CAP",
        "VFX_BUBBLE_LIGHTEN_HIGH_BIRTHRATE_BATCH_CAP",
        "VFX_BUBBLE_SOURCE_SIZE_NO_SURFACE_VISIBILITY_FLOOR"
      ])
    );
    expect(root?.userData.auroraEmitterParticleSizeVisibilityFloorPreviewMode).toBeUndefined();
    expect(root?.userData.auroraEmitterParticleSizeMax).toBeLessThan(0.6);
    expect(root?.userData.auroraEmitterParticleSizeYStart).toBe(0);
    expect(root?.userData.auroraEmitterParticleSizeYMid).toBeCloseTo(0.35 * 0.24, 5);
    expect(root?.userData.auroraEmitterParticleSizeYEnd).toBe(0);
    expect(root?.userData.auroraEmitterParticleSizeYFallbackPreviewMode).toBe(
      "source-size-y-zero-honored-for-bubble"
    );
    expect(root?.userData.auroraEmitterParticleAlphaStart).toBe(0.85);
    expect(root?.userData.auroraEmitterParticleAlphaEnd).toBe(0);
    expect(root?.userData.auroraEmitterParticleAlphaPreviewClamp).toBe(0.16);
    expect(root?.userData.auroraEmitterParticleAlphaPreviewClampMode).toBe(
      "lighten-bubble-overdraw-alpha-clamp"
    );

    const particles = collectCameraBillboardParticles(root);
    expect(particles).toHaveLength(0);
    expect(root?.userData.auroraParticleBatchSlotCount).toBe(32);
    expect(root?.userData.auroraParticleBatchDetachedSlotCount).toBe(32);
    expect(root?.userData.auroraParticleBatchSceneSlotMeshCount).toBe(0);
    expect(root?.userData.auroraParticleBatchDetachedSlotPreviewMode).toBe(
      "detached-provenance-slots-not-scene-children"
    );
    const batches = collectCameraBillboardBatches(root);
    expect(batches).toHaveLength(1);
    const batch = batches[0]!;
    expect(batch.mesh.geometry.userData.auroraParticleBatchVertexCapacity).toBe(192);
    expect(batch.mesh.geometry.getAttribute("position").count).toBe(192);
    expect(batch.mesh.userData.auroraParticleBatchRendererPreviewMode).toBe(
      "aurora-contiguous-particle-vertex-buffer"
    );
    expect(batch.mesh.userData.auroraParticleBatchSourceSlotPreviewMode).toBe(
      "hidden-provenance-slot-for-contiguous-batch"
    );
    expect(batch.mesh.userData.auroraParticleBatchDetachedSlotCount).toBe(32);
    expect(batch.mesh.userData.auroraParticleBatchSceneSlotMeshCount).toBe(0);
    expect(batch.mesh.userData.auroraParticleBatchDetachedSlotPreviewMode).toBe(
      "detached-provenance-slots-not-scene-children"
    );
    expect(batch.material.side).toBe(THREE.FrontSide);
    expect(batch.material.userData.auroraEmitterTwoSidedTexture).toBe(false);
    expect(batch.material.userData.auroraEmitterTextureSide).toBe(THREE.FrontSide);
    expect(batch.material.userData.auroraEmitterCullState3).toBe("enabled");
    expect(batch.material.userData.auroraEmitterTextureSidePreviewMode).toBe(
      "aurora-source-twosidedtex-adapter"
    );
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(2, 2, 4);
    camera.updateMatrixWorld();
    performanceNow.mockReturnValue(500);
    batch.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      batch.mesh.geometry,
      batch.material,
      null
    );
    expect(batch.mesh.userData.auroraParticleBatchCopiedSlotCount).toBe(32);
    expect(batch.mesh.userData.auroraParticleBatchUpdatePreviewMode).toBe(
      "detached-slot-simulated-contiguous-vertex-buffer-copy"
    );
    expectAuroraAtlasBatchParticleUvs(batch.mesh, 0, {
      u0: 0.25,
      u1: 0.5,
      v0: 0.5,
      v1: 0.75
    });
    const batchAlpha = batch.mesh.geometry.getAttribute("auroraAlpha");
    const maxBatchAlpha = Math.max(
      ...Array.from({ length: batchAlpha.count }, (_, index) => batchAlpha.getX(index))
    );
    expect(maxBatchAlpha).toBeLessThanOrEqual(0.16);
    expect(maxBatchAlpha).toBeGreaterThan(0);
    performanceNow.mockRestore();
  });

  it("maps Aurora Punch-Through blend mode to alpha-tested VFX materials", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_cutout.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_punch_vfx",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "punch_vfx",
      tag: "PUNCH_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_punch_vfx",
          resref: "punch_vfx",
          textureFileName: "fx_cutout.tga",
          textureDeliveryUrl: "/assets/fx_cutout.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "punch_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/punch_vfx.mdl",
                nodeName: "punch_emitter",
                texture: "fx_cutout",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Punch-Through",
                simulation: {
                  birthrate: 2,
                  lifeExp: 2,
                  sizeStart: 0.5,
                  sizeEnd: 0.5,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    let punchMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!punchMaterial && material instanceof THREE.MeshBasicMaterial) {
          punchMaterial = material;
        }
      }
    });

    expect(punchMaterial).not.toBeNull();
    expect(punchMaterial?.userData.auroraEmitterBlendMode).toBe("Punch-Through");
    expect(punchMaterial?.userData.auroraEmitterBlendStatePreviewMode).toBe(
      "aurora-blend-punch-through-alpha-test"
    );
    expect(punchMaterial?.userData.auroraEmitterBlendBucket).toBe("punch_through");
    expect(punchMaterial?.userData.auroraEmitterBlendRuntimeMode).toBe(1);
    expect(punchMaterial?.userData.auroraEmitterBlendShaderVariant).toBe("punch-through");
    expect(root?.userData.auroraParticleRenderStatePreviewMode).toBe(
      "aurora-punch-through-depthwrite-on-record"
    );
    expect(root?.userData.auroraParticleTransparentLaneState0).toBe(false);
    expect(root?.userData.auroraParticlePunchThroughState1).toBe(true);
    expect(root?.userData.auroraParticleRequestedDepthWrite).toBe(true);
    expect(root?.userData.auroraParticleShaderVariantFlag).toBe("punch-through");
    expect(root?.userData.auroraParticleNonPunchVariantFlag).toBe(false);
    expect(root?.userData.auroraParticleBlendFuncWrapperInvoked).toBe(false);
    expect(root?.userData.auroraParticleBlendFuncFactorsCaptured).toBe(false);
    expect(root?.userData.auroraParticleRenderStateDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_RENDER_STATE_CACHE_WRAPPER_REQUIRED",
        "VFX_PUNCH_THROUGH_DEPTHWRITE_LANE_REQUIRED"
      ])
    );
    expect(punchMaterial?.userData.auroraParticleRenderState.runtimeBlendMode).toBe(1);
    expect(punchMaterial?.userData.auroraParticlePunchThroughState1).toBe(true);
    expect(punchMaterial?.userData.auroraParticleRequestedDepthWrite).toBe(true);
    expect(punchMaterial?.blending).toBe(THREE.NormalBlending);
    expect(punchMaterial?.depthWrite).toBe(true);
    expect(punchMaterial?.alphaTest).toBeGreaterThanOrEqual(0.5);
  });

  it("uses Aurora source transparency false as an opaque VFX material lane", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_opaque.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_opaque_vfx",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "opaque_vfx",
      tag: "OPAQUE_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_opaque_vfx",
          resref: "opaque_vfx",
          textureFileName: "fx_opaque.tga",
          textureDeliveryUrl: "/assets/fx_opaque.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "opaque_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/opaque_vfx.mdl",
                nodeName: "opaque_emitter",
                texture: "fx_opaque",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                sourceState: {
                  transparency: false
                },
                simulation: {
                  birthrate: 2,
                  lifeExp: 2,
                  sizeStart: 0.5,
                  sizeEnd: 0.5,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    let opaqueMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!opaqueMaterial && material instanceof THREE.MeshBasicMaterial) {
          opaqueMaterial = material;
        }
      }
    });

    expect(root?.userData.auroraEmitterTransparency).toBe(false);
    expect(root?.userData.auroraEmitterTransparencyPreviewMode).toBe(
      "source-transparency-flag-preserved"
    );
    expect(root?.userData.auroraParticleRenderStatePreviewMode).toBe(
      "aurora-source-opaque-depthwrite-on-record"
    );
    expect(root?.userData.auroraParticleTransparentLaneState0).toBe(false);
    expect(root?.userData.auroraParticleRequestedDepthWrite).toBe(true);
    expect(root?.userData.auroraParticleBlendFuncWrapperInvoked).toBe(false);
    expect(root?.userData.auroraParticleRenderStateDiagnostics).toEqual(
      expect.arrayContaining(["VFX_SOURCE_TRANSPARENCY_FALSE_OPAQUE_DEPTHWRITE_REQUIRED"])
    );
    expect(opaqueMaterial).not.toBeNull();
    expect(opaqueMaterial?.transparent).toBe(false);
    expect(opaqueMaterial?.depthWrite).toBe(true);
    expect(opaqueMaterial?.blending).toBe(THREE.NoBlending);
    expect(opaqueMaterial?.userData.auroraEmitterTransparencyMaterialPreviewMode).toBe(
      "source-transparency-false-opaque-material"
    );
    expect(opaqueMaterial?.userData.auroraEmitterTransparencyMaterialDiagnostic).toBe(
      "VFX_SOURCE_TRANSPARENCY_FALSE_OPAQUE_DEPTHWRITE_REQUIRED"
    );
    expect(opaqueMaterial?.userData.auroraParticleRenderState.previewMode).toBe(
      "aurora-source-opaque-depthwrite-on-record"
    );
  });

  it("preserves unknown Aurora blend literals as fallback mode 2 without renaming them to Lighten", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_unknown.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_unknown_blend_vfx",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "unknown_blend_vfx",
      tag: "UNKNOWN_BLEND_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_unknown_blend_vfx",
          resref: "unknown_blend_vfx",
          textureFileName: "fx_unknown.tga",
          textureDeliveryUrl: "/assets/fx_unknown.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "unknown_blend_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/unknown_blend_vfx.mdl",
                nodeName: "unknown_blend_emitter",
                texture: "fx_unknown",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "GlowOnly",
                simulation: {
                  birthrate: 2,
                  lifeExp: 1,
                  sizeStart: 0.5,
                  sizeEnd: 0.5,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    let material: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        const candidate = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!material && candidate instanceof THREE.MeshBasicMaterial) {
          material = candidate;
        }
      }
    });

    expect(material).not.toBeNull();
    expect(material?.userData.auroraEmitterBlendBucket).toBe("fallback_mode_2");
    expect(material?.userData.auroraEmitterBlendRuntimeMode).toBe(2);
    expect(material?.userData.auroraEmitterBlendAuthoringCandidate).toBeUndefined();
    expect(material?.userData.auroraEmitterBlendDiagnostic).toBe(
      "VFX_UNKNOWN_BLEND_MODE2_RAW_TOKEN_PRESERVED"
    );
    expect(material?.userData.auroraParticleRenderState.runtimeBlendBucket).toBe(
      "fallback_mode_2"
    );
    expect(material?.userData.auroraParticleRenderState.rawBlendLiteral).toBe(
      "GlowOnly"
    );
    expect(material?.userData.auroraParticleTransparentLaneState0).toBe(true);
    expect(material?.userData.auroraParticleRequestedDepthWrite).toBe(false);
    expect(material?.blending).toBe(THREE.NormalBlending);
    expect(material?.depthWrite).toBe(false);
  });

  it("uses Aurora P2P reference child nodes as particle targets instead of leaving p2p unmapped", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_p2p.tga",
      particleTexture
    );
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_p2p_vfx",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "p2p_vfx",
      tag: "P2P_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_p2p_vfx",
          resref: "p2p_vfx",
          textureFileName: "fx_p2p.tga",
          textureDeliveryUrl: "/assets/fx_p2p.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "p2p_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/p2p_vfx.mdl",
                nodeName: "OmenEmitter01",
                texture: "fx_p2p",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  p2p: true,
                  p2pType: "gravity",
                  birthrate: 4,
                  lifeExp: 1,
                  velocity: 0.15,
                  grav: 2,
                  drag: 1,
                  threshold: 0.25,
                  sizeStart: 0.2,
                  sizeEnd: 0.2,
                  alphaStart: 1,
                  alphaEnd: 1
                },
                referenceNodes: [
                  {
                    nodeName: "REFm",
                    parentNodeName: "OmenEmitter01",
                    transform: {
                      position: [0, 0, 0.63]
                    }
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterP2PPreviewMode).toBe("reference-target-preview");
    expect(root?.userData.auroraEmitterP2PReferencePreviewMode).toBe(
      "source-reference-node-target"
    );
    expect(root?.userData.auroraEmitterP2PTargetNodeName).toBe("REFm");
    expect(root?.userData.auroraEmitterP2PMappedTarget).toEqual([0, 0.315, 0]);
    expect(root?.userData.auroraEmitterP2PDiagnostics).toEqual(
      expect.arrayContaining(["VFX_P2P_TARGET_SOURCE_REFERENCE_NODE_APPLIED"])
    );

    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    const particle = particles[0]!;
    const initialY = particle.mesh.position.y;
    nowSpy.mockReturnValue(500);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );
    expect(particle.mesh.position.y).toBeGreaterThan(initialY);
    expect(particle.mesh.position.y).toBeLessThanOrEqual(0.315);
    expect(particle.mesh.userData.auroraParticleBasisPreviewMode).toBe(
      "aurora-render-normal-camera-billboard-basis"
    );
    nowSpy.mockRestore();
  });

  it("uses Aurora P2P Bezier combineTime as the transition window to the reference target", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_p2p_bezier.tga",
      particleTexture
    );
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_p2p_bezier_vfx",
      kind: "placeables",
      name: "P2P BEZIER VFX",
      resRef: "p2p_bezier_vfx",
      tag: "P2P_BEZIER_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "P2P BEZIER VFX",
          templateId: "plc_p2p_bezier_vfx",
          resref: "p2p_bezier_vfx",
          textureFileName: "fx_p2p_bezier.tga",
          textureDeliveryUrl: "/assets/fx_p2p_bezier.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "p2p_bezier_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/p2p_bezier_vfx.mdl",
                nodeName: "BezierEmitter01",
                texture: "fx_p2p_bezier",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  p2p: true,
                  p2pType: "0",
                  p2pBezier2: 0.5,
                  p2pBezier3: 0.5,
                  combineTime: 2,
                  birthrate: 1,
                  lifeExp: 4,
                  velocity: 0,
                  sizeStart: 0.2,
                  sizeEnd: 0.2,
                  alphaStart: 1,
                  alphaEnd: 1
                },
                referenceNodes: [
                  {
                    nodeName: "REFm",
                    parentNodeName: "BezierEmitter01",
                    transform: {
                      position: [0, 0, 0.8]
                    }
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterP2PMotionMode).toBe("bezier");
    expect(root?.userData.auroraEmitterP2PCombineTime).toBe(2);
    expect(root?.userData.auroraEmitterP2PCombineTimePreviewMode).toBe(
      "bezier-transition-factor-preview"
    );
    expect(root?.userData.auroraEmitterP2PDiagnostics).toEqual(
      expect.arrayContaining(["VFX_P2P_COMBINETIME_BEZIER_TRANSITION_PREVIEW"])
    );

    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    const particle = particles[0]!;
    const startY = particle.mesh.position.y;
    const targetY = root?.userData.auroraEmitterP2PMappedTarget?.[1] as number;

    nowSpy.mockReturnValue(1000);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );
    expect(particle.mesh.position.y).toBeGreaterThan(startY);
    expect(particle.mesh.position.y).toBeLessThan(targetY);

    nowSpy.mockReturnValue(2500);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );
    expect(particle.mesh.position.y).toBeCloseTo(targetY, 3);
    nowSpy.mockRestore();
  });

  it("uses Aurora P2P Bezier source and target tangents to arc toward the reference target", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_p2p_bezier_arc.tga",
      particleTexture
    );
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_p2p_bezier_arc_vfx",
      kind: "placeables",
      name: "P2P BEZIER ARC VFX",
      resRef: "p2p_bezier_arc_vfx",
      tag: "P2P_BEZIER_ARC_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "P2P BEZIER ARC VFX",
          templateId: "plc_p2p_bezier_arc_vfx",
          resref: "p2p_bezier_arc_vfx",
          textureFileName: "fx_p2p_bezier_arc.tga",
          textureDeliveryUrl: "/assets/fx_p2p_bezier_arc.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "p2p_bezier_arc_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/p2p_bezier_arc_vfx.mdl",
                nodeName: "BezierArcEmitter01",
                texture: "fx_p2p_bezier_arc",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  p2p: true,
                  p2pType: "0",
                  p2pBezier2: 0.8,
                  p2pBezier3: 0.8,
                  combineTime: 2,
                  birthrate: 1,
                  lifeExp: 4,
                  velocity: 0,
                  sizeStart: 0.2,
                  sizeEnd: 0.2,
                  alphaStart: 1,
                  alphaEnd: 1
                },
                referenceNodes: [
                  {
                    nodeName: "REFm",
                    parentNodeName: "BezierArcEmitter01",
                    transform: {
                      position: [1, 0, 0.2]
                    }
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterP2PMotionMode).toBe("bezier");
    expect(root?.userData.auroraEmitterP2PBezierPreviewMode).toBe(
      "source-target-tangent-arc-preview"
    );
    expect(root?.userData.auroraEmitterP2PDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_P2P_BEZIER_TIME_CURVE_PREVIEW",
        "VFX_P2P_BEZIER_SOURCE_TARGET_TANGENT_ARC_PREVIEW"
      ])
    );

    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    const particle = particles[0]!;
    const startPosition = particle.mesh.position.clone();
    const targetPayload = root?.userData.auroraEmitterP2PMappedTarget as
      | [number, number, number]
      | undefined;
    expect(targetPayload).toBeDefined();
    const targetPosition = new THREE.Vector3(
      targetPayload?.[0] ?? 0,
      targetPayload?.[1] ?? 0,
      targetPayload?.[2] ?? 0
    );

    nowSpy.mockReturnValue(1000);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );
    const straightMidY = startPosition.y + (targetPosition.y - startPosition.y) * 0.5;
    expect(particle.mesh.position.y).toBeGreaterThan(straightMidY + 0.03);

    nowSpy.mockReturnValue(2500);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );
    expect(particle.mesh.position.distanceTo(targetPosition)).toBeLessThan(0.001);
    nowSpy.mockRestore();
  });

  it("samples Aurora P2P Bezier tangent keyframes while arcing toward reference targets", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_p2p_bezier_key_arc.tga",
      particleTexture
    );
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_p2p_bezier_key_arc_vfx",
      kind: "placeables",
      name: "P2P BEZIER KEY ARC VFX",
      resRef: "p2p_bezier_key_arc_vfx",
      tag: "P2P_BEZIER_KEY_ARC_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const bezier2Timeline = [
      { time: 0, value: 0.8 },
      { time: 2, value: 0.8 }
    ];
    const bezier3Timeline = [
      { time: 0, value: 0.8 },
      { time: 2, value: 0.8 }
    ];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "P2P BEZIER KEY ARC VFX",
          templateId: "plc_p2p_bezier_key_arc_vfx",
          resref: "p2p_bezier_key_arc_vfx",
          textureFileName: "fx_p2p_bezier_key_arc.tga",
          textureDeliveryUrl: "/assets/fx_p2p_bezier_key_arc.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "p2p_bezier_key_arc_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/p2p_bezier_key_arc_vfx.mdl",
                nodeName: "BezierKeyArcEmitter01",
                texture: "fx_p2p_bezier_key_arc",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  p2p: true,
                  p2pType: "0",
                  combineTime: 2,
                  birthrate: 1,
                  lifeExp: 4,
                  velocity: 0,
                  sizeStart: 0.2,
                  sizeEnd: 0.2,
                  alphaStart: 1,
                  alphaEnd: 1,
                  timeline: {
                    p2pBezier2: bezier2Timeline,
                    p2pBezier3: bezier3Timeline
                  }
                },
                referenceNodes: [
                  {
                    nodeName: "REFm",
                    parentNodeName: "BezierKeyArcEmitter01",
                    transform: {
                      position: [1, 0, 0.2]
                    }
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterP2PMotionMode).toBe("bezier");
    expect(root?.userData.auroraEmitterP2PBezier2).toBeUndefined();
    expect(root?.userData.auroraEmitterP2PBezier3).toBeUndefined();
    expect(root?.userData.auroraEmitterP2PBezier2Timeline).toEqual(bezier2Timeline);
    expect(root?.userData.auroraEmitterP2PBezier3Timeline).toEqual(bezier3Timeline);
    expect(root?.userData.auroraEmitterP2PBezierTimelinePreviewMode).toBe(
      "runtime-p2p-bezier-keyframe-arc-preview"
    );
    expect(root?.userData.auroraEmitterP2PBezierPreviewMode).toBe(
      "source-target-tangent-arc-preview"
    );

    const particle = collectCameraBillboardParticles(root)[0]!;
    const startPosition = particle.mesh.position.clone();
    const targetPayload = root?.userData.auroraEmitterP2PMappedTarget as
      | [number, number, number]
      | undefined;
    const targetPosition = new THREE.Vector3(
      targetPayload?.[0] ?? 0,
      targetPayload?.[1] ?? 0,
      targetPayload?.[2] ?? 0
    );

    nowSpy.mockReturnValue(1000);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );
    const straightMidY = startPosition.y + (targetPosition.y - startPosition.y) * 0.5;
    expect(particle.mesh.position.y).toBeGreaterThan(straightMidY + 0.03);
    nowSpy.mockRestore();
  });

  it("uses Aurora P2P Gravity combineTime delay and threshold kill distance", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_p2p_gravity.tga",
      particleTexture
    );
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_p2p_gravity_vfx",
      kind: "placeables",
      name: "P2P GRAVITY VFX",
      resRef: "p2p_gravity_vfx",
      tag: "P2P_GRAVITY_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "P2P GRAVITY VFX",
          templateId: "plc_p2p_gravity_vfx",
          resref: "p2p_gravity_vfx",
          textureFileName: "fx_p2p_gravity.tga",
          textureDeliveryUrl: "/assets/fx_p2p_gravity.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "p2p_gravity_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/p2p_gravity_vfx.mdl",
                nodeName: "GravityEmitter01",
                texture: "fx_p2p_gravity",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  p2p: true,
                  p2pType: "1",
                  combineTime: 1,
                  grav: 2,
                  drag: 0,
                  threshold: 0.12,
                  birthrate: 1,
                  lifeExp: 2,
                  velocity: 0,
                  sizeStart: 0.2,
                  sizeEnd: 0.2,
                  alphaStart: 1,
                  alphaEnd: 1
                },
                referenceNodes: [
                  {
                    nodeName: "REFm",
                    parentNodeName: "GravityEmitter01",
                    transform: {
                      position: [0, 0, 0.63]
                    }
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterP2PMotionMode).toBe("gravity");
    expect(root?.userData.auroraEmitterP2PCombineTime).toBe(1);
    expect(root?.userData.auroraEmitterP2PCombineTimePreviewMode).toBe(
      "gravity-delay-preview"
    );
    expect(root?.userData.auroraEmitterP2PThreshold).toBeCloseTo(0.06, 3);
    expect(root?.userData.auroraEmitterP2PThresholdPreviewMode).toBe(
      "source-threshold-target-cull-preview"
    );
    expect(root?.userData.auroraEmitterP2PDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_P2P_COMBINETIME_GRAVITY_DELAY_PREVIEW",
        "VFX_P2P_THRESHOLD_TARGET_KILL_DISTANCE_PREVIEW"
      ])
    );

    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    const particle = particles[0]!;
    const startY = particle.mesh.position.y;

    nowSpy.mockReturnValue(500);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );
    expect(particle.mesh.position.y).toBeCloseTo(startY, 4);
    expect(particle.mesh.userData.auroraEmitterP2PThresholdCull).toBe(false);

    nowSpy.mockReturnValue(1900);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );
    expect(particle.mesh.userData.auroraEmitterP2PThresholdCull).toBe(true);
    expect(particle.mesh.userData.auroraEmitterP2PDistanceToTarget).toBeLessThanOrEqual(0.06);
    expect(particle.material.userData.auroraVfxParticleAlphaPreviewMode).toBe(
      "hidden-p2p-threshold"
    );
    expect(particle.material.opacity).toBe(0);
    expect(readFirstAuroraVertexAlpha(particle.mesh)).toBe(0);
    nowSpy.mockRestore();
  });

  it("samples Aurora P2P combineTime keyframes as gravity travel delay", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_p2p_combinetime.tga",
      particleTexture
    );
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_p2p_combinetime_vfx",
      kind: "placeables",
      name: "P2P COMBINETIME VFX",
      resRef: "p2p_combinetime_vfx",
      tag: "P2P_COMBINETIME_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    const combineTimeTimeline = [
      { time: 0, value: 1 },
      { time: 2, value: 1 }
    ];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "P2P COMBINETIME VFX",
          templateId: "plc_p2p_combinetime_vfx",
          resref: "p2p_combinetime_vfx",
          textureFileName: "fx_p2p_combinetime.tga",
          textureDeliveryUrl: "/assets/fx_p2p_combinetime.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "p2p_combinetime_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/p2p_combinetime_vfx.mdl",
                nodeName: "CombineTimeEmitter01",
                texture: "fx_p2p_combinetime",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  p2p: true,
                  p2pType: "1",
                  grav: 2,
                  birthrate: 1,
                  lifeExp: 2,
                  velocity: 0,
                  sizeStart: 0.2,
                  sizeEnd: 0.2,
                  alphaStart: 1,
                  alphaEnd: 1,
                  timeline: {
                    combineTime: combineTimeTimeline
                  }
                },
                referenceNodes: [
                  {
                    nodeName: "REFm",
                    parentNodeName: "CombineTimeEmitter01",
                    transform: {
                      position: [0, 0, 0.63]
                    }
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterP2PMotionMode).toBe("gravity");
    expect(root?.userData.auroraEmitterP2PCombineTime).toBeUndefined();
    expect(root?.userData.auroraEmitterP2PCombineTimeTimeline).toEqual(combineTimeTimeline);
    expect(root?.userData.auroraEmitterP2PCombineTimeTimelinePreviewMode).toBe(
      "runtime-combinetime-keyframe-travel-preview"
    );
    expect(root?.userData.auroraEmitterP2PCombineTimePreviewMode).toBe(
      "gravity-delay-preview"
    );

    const particle = collectCameraBillboardParticles(root)[0]!;
    const startPosition = particle.mesh.position.clone();
    const target = new THREE.Vector3(
      root?.userData.auroraEmitterP2PMappedTarget?.[0],
      root?.userData.auroraEmitterP2PMappedTarget?.[1],
      root?.userData.auroraEmitterP2PMappedTarget?.[2]
    );
    const totalTravelDistance = startPosition.distanceTo(target);
    expect(totalTravelDistance).toBeGreaterThan(0.1);

    nowSpy.mockReturnValue(500);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );
    expect(particle.mesh.position.distanceTo(startPosition)).toBeLessThan(0.001);

    nowSpy.mockReturnValue(1500);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );
    expect(particle.mesh.position.distanceTo(startPosition) / totalTravelDistance).toBeGreaterThan(
      0.55
    );
    nowSpy.mockRestore();
  });

  it("samples Aurora P2P grav keyframes when travelling toward reference targets", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_p2p_gravkey.tga",
      particleTexture
    );
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_p2p_gravkey_vfx",
      kind: "placeables",
      name: "P2P GRAVKEY VFX",
      resRef: "p2p_gravkey_vfx",
      tag: "P2P_GRAVKEY_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    const gravTimeline = [
      { time: 0, value: 0 },
      { time: 2, value: 2 }
    ];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "P2P GRAVKEY VFX",
          templateId: "plc_p2p_gravkey_vfx",
          resref: "p2p_gravkey_vfx",
          textureFileName: "fx_p2p_gravkey.tga",
          textureDeliveryUrl: "/assets/fx_p2p_gravkey.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "p2p_gravkey_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/p2p_gravkey_vfx.mdl",
                nodeName: "GravityKeyEmitter01",
                texture: "fx_p2p_gravkey",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  p2p: true,
                  p2pType: "1",
                  birthrate: 1,
                  lifeExp: 2,
                  velocity: 0,
                  sizeStart: 0.2,
                  sizeEnd: 0.2,
                  alphaStart: 1,
                  alphaEnd: 1,
                  timeline: {
                    grav: gravTimeline
                  }
                },
                referenceNodes: [
                  {
                    nodeName: "REFm",
                    parentNodeName: "GravityKeyEmitter01",
                    transform: {
                      position: [0, 0, 0.63]
                    }
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterP2PMotionMode).toBe("gravity");
    expect(root?.userData.auroraEmitterP2PGravity).toBeUndefined();
    expect(root?.userData.auroraEmitterP2PGravityTimeline).toEqual(gravTimeline);
    expect(root?.userData.auroraEmitterP2PPhysicsTimelinePreviewMode).toBe(
      "runtime-grav-drag-keyframe-travel-preview"
    );

    const target = new THREE.Vector3(
      root?.userData.auroraEmitterP2PMappedTarget?.[0],
      root?.userData.auroraEmitterP2PMappedTarget?.[1],
      root?.userData.auroraEmitterP2PMappedTarget?.[2]
    );
    const particle = collectCameraBillboardParticles(root)[0]!;
    const startPosition = particle.mesh.position.clone();
    const totalTravelDistance = startPosition.distanceTo(target);
    expect(totalTravelDistance).toBeGreaterThan(0.1);

    nowSpy.mockReturnValue(1000);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );

    const travelProgress = particle.mesh.position.distanceTo(startPosition) / totalTravelDistance;
    expect(travelProgress).toBeGreaterThan(0.56);
    expect(travelProgress).toBeLessThan(0.67);
    nowSpy.mockRestore();
  });

  it("samples Aurora P2P threshold keyframes when culling at reference targets", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_p2p_thresholdkey.tga",
      particleTexture
    );
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_p2p_thresholdkey_vfx",
      kind: "placeables",
      name: "P2P THRESHOLDKEY VFX",
      resRef: "p2p_thresholdkey_vfx",
      tag: "P2P_THRESHOLDKEY_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const thresholdTimeline = [
      { time: 0, value: 0.12 },
      { time: 2, value: 0.12 }
    ];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "P2P THRESHOLDKEY VFX",
          templateId: "plc_p2p_thresholdkey_vfx",
          resref: "p2p_thresholdkey_vfx",
          textureFileName: "fx_p2p_thresholdkey.tga",
          textureDeliveryUrl: "/assets/fx_p2p_thresholdkey.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "p2p_thresholdkey_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/p2p_thresholdkey_vfx.mdl",
                nodeName: "ThresholdKeyEmitter01",
                texture: "fx_p2p_thresholdkey",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  p2p: true,
                  p2pType: "1",
                  combineTime: 1,
                  grav: 2,
                  birthrate: 1,
                  lifeExp: 2,
                  velocity: 0,
                  sizeStart: 0.2,
                  sizeEnd: 0.2,
                  alphaStart: 1,
                  alphaEnd: 1,
                  timeline: {
                    threshold: thresholdTimeline
                  }
                },
                referenceNodes: [
                  {
                    nodeName: "REFm",
                    parentNodeName: "ThresholdKeyEmitter01",
                    transform: {
                      position: [0, 0, 0.63]
                    }
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterP2PThreshold).toBeUndefined();
    expect(root?.userData.auroraEmitterP2PThresholdTimeline).toEqual(thresholdTimeline);
    expect(root?.userData.auroraEmitterP2PThresholdTimelinePreviewMode).toBe(
      "runtime-threshold-keyframe-target-cull-preview"
    );
    expect(root?.userData.auroraEmitterP2PThresholdPreviewMode).toBe(
      "source-threshold-target-cull-preview"
    );

    const particle = collectCameraBillboardParticles(root)[0]!;
    nowSpy.mockReturnValue(1900);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );

    expect(particle.mesh.userData.auroraEmitterP2PThreshold).toBeCloseTo(0.06, 3);
    expect(particle.mesh.userData.auroraEmitterP2PThresholdCull).toBe(true);
    expect(particle.material.userData.auroraVfxParticleAlphaPreviewMode).toBe(
      "hidden-p2p-threshold"
    );
    expect(particle.material.opacity).toBe(0);
    nowSpy.mockRestore();
  });

  it("renders Aurora Billboard_to_Local_Z emitters as local vertical billboards instead of camera sprites", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const textureSize = 512;
    const blackKeyPixels = new Uint8Array(textureSize * textureSize * 4);
    for (let y = 0; y < textureSize; y += 1) {
      for (let x = 0; x < textureSize; x += 1) {
        const offset = (y * textureSize + x) * 4;
        const dx = x - textureSize / 2;
        const dy = y - textureSize / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const onRing = distance > 132 && distance < 156;
        blackKeyPixels[offset] = onRing ? 72 : 0;
        blackKeyPixels[offset + 1] = onRing ? 96 : 0;
        blackKeyPixels[offset + 2] = onRing ? 255 : 0;
        blackKeyPixels[offset + 3] = 255;
      }
    }
    const particleTexture = new THREE.DataTexture(
      blackKeyPixels,
      textureSize,
      textureSize,
      THREE.RGBAFormat
    );
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_localz.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_localz_vfx",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "localz_vfx",
      tag: "LOCALZ_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_localz_vfx",
          resref: "localz_vfx",
          textureFileName: "fx_localz.tga",
          textureDeliveryUrl: "/assets/fx_localz.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "localz_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/localz_vfx.mdl",
                nodeName: "localz_symbol",
                texture: "fx_localz",
                emitterType: "Single",
                renderMode: "Billboard_to_Local_Z",
                blendMode: "Lighten",
                sourceState: {
                  loop: false
                },
                simulation: {
                  birthrate: 1,
                  lifeExp: 1,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 0.8,
                  alphaEnd: 0.8
                }
              }
            ]
          }
        })
      }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("local_z_billboard");
    expect(root?.userData.vfxPreviewRole).toBe("local-z-billboards");
    expect(root?.userData.auroraEmitterRenderMode).toBe("Billboard_to_Local_Z");
    expect(root?.userData.auroraEmitterUpdateMode).toBe("single");
    let spriteCount = 0;
    const localBillboards: THREE.Mesh[] = [];
    root?.traverse((node) => {
      if (node instanceof THREE.Sprite) {
        spriteCount += 1;
      }
      if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "local-z-billboard") {
        localBillboards.push(node);
      }
    });
    expect(spriteCount).toBe(0);
    expect(localBillboards).toHaveLength(1);
    expect(localBillboards[0]?.rotation.x).toBeCloseTo(0, 4);
    const material = Array.isArray(localBillboards[0]?.material)
      ? localBillboards[0]?.material[0]
      : localBillboards[0]?.material;
    expect(
      material instanceof THREE.MeshBasicMaterial &&
        material.map?.userData?.auroraConvertedBlackKeyTexture === true &&
        material.alphaMap?.userData?.auroraConvertedBlackKeyAlphaMap === true
    ).toBe(true);
    if (material instanceof THREE.MeshBasicMaterial) {
      const convertedPixels = material.map?.image?.data as Uint8Array | undefined;
      const convertedAlphaPixels = material.alphaMap?.image?.data as Uint8Array | undefined;
      const ringSampleOffset = ((textureSize / 2) * textureSize + (textureSize / 2 + 144)) * 4;
      const centerSampleOffset = ((textureSize / 2) * textureSize + textureSize / 2) * 4;
      expect(convertedPixels?.[ringSampleOffset]).toBe(72);
      expect(convertedPixels?.[ringSampleOffset + 1]).toBe(96);
      expect(convertedPixels?.[ringSampleOffset + 2]).toBe(255);
      expect(convertedPixels?.[ringSampleOffset + 3]).toBeGreaterThan(240);
      expect(convertedPixels?.[centerSampleOffset + 3]).toBe(255);
      expect(convertedAlphaPixels?.[centerSampleOffset]).toBe(0);
      expect(material.map?.userData?.auroraBlackKeyAlphaApplication).toBe(
        "alpha-map-single-pass"
      );
      expect(material.alphaMap?.userData?.auroraBlackKeyAlphaApplication).toBe(
        "alpha-map-single-pass"
      );
    }
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(2, 1, 3);
    camera.updateMatrixWorld();
    localBillboards[0]?.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      localBillboards[0].geometry,
      Array.isArray(localBillboards[0].material)
        ? localBillboards[0].material[0]!
        : localBillboards[0].material,
      null
    );
    expect(localBillboards[0]?.rotation.x).toBeCloseTo(0, 4);
    expect(Math.abs(localBillboards[0]?.rotation.y ?? 0)).toBeGreaterThan(0.01);
    expectAuroraParticleSoftnessState(localBillboards[0]!, material as THREE.MeshBasicMaterial, {
      gate: "zero-for-billboard-to-local-z",
      value: 0
    });
  });

  it("renders Aurora Linked emitters as touching mesh segments instead of separate camera sprites", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_linked.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_linked_vfx",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "linked_vfx",
      tag: "LINKED_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_linked_vfx",
          resref: "linked_vfx",
          textureFileName: "fx_linked.tga",
          textureDeliveryUrl: "/assets/fx_linked.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "linked_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/linked_vfx.mdl",
                nodeName: "linked_emitter",
                texture: "fx_linked",
                emitterType: "Fountain",
                renderMode: "Linked",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 4,
                  lifeExp: 2,
                  velocity: 0.4,
                  randvel: 0.1,
                  spread: 0.35,
                  sizeStart: 0.2,
                  sizeEnd: 0.36,
                  alphaStart: 1,
                  alphaEnd: 0.45,
                  colorStart: [1, 0.8, 0.2],
                  colorEnd: [1, 0.25, 0]
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("linked_billboard");
    expect(root?.userData.vfxPreviewRole).toBe("linked-particle-segments");
    expect(root?.userData.auroraEmitterLinkedPreviewMode).toBe(
      "linked-active-list-adjacency-preview"
    );
    expect(root?.userData.auroraEmitterLinkedActiveCountAtDraw).toBe(8);
    expect(root?.userData.auroraEmitterLinkedDrawSegmentCount).toBe(7);
    expectAuroraParticleDrawRecordUserData(root?.userData, {
      activeParticleCount: 8,
      drawParticleCount: 7,
      linked: true
    });
    expect(root?.userData.auroraParticleBatchRendererPreviewMode).toBe(
      "aurora-linked-contiguous-segment-vertex-buffer"
    );
    expect(root?.userData.auroraParticleBatchSlotCount).toBe(7);
    expect(root?.userData.auroraParticleBatchVisibleMeshRole).toBe(
      "linked-particle-segment-batch"
    );
    expect(root?.userData.auroraEmitterLinkedDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_LINKED_ACTIVE_LIST_ADJACENCY_REQUIRED",
        "VFX_LINKED_NOT_TRIANGLESTRIP_RING_BUFFER"
      ])
    );
    let linkedSegmentCount = 0;
    let spriteCount = 0;
    let firstSegment: THREE.Mesh | null = null;
    let firstSegmentMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (node instanceof THREE.Sprite) {
        spriteCount += 1;
      }
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "linked-particle-segment"
      ) {
        linkedSegmentCount += 1;
        firstSegment ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!firstSegmentMaterial && material instanceof THREE.MeshBasicMaterial) {
          firstSegmentMaterial = material;
        }
      }
    });
    expect(spriteCount).toBe(0);
    expect(linkedSegmentCount).toBe(7);
    const linkedBatches = collectLinkedParticleSegmentBatches(root);
    expect(linkedBatches).toHaveLength(1);
    expect(firstSegment).not.toBeNull();
    expect(firstSegmentMaterial?.map).toBe(particleTexture);

    const linkedSegment = firstSegment!;
    const linkedMaterial = firstSegmentMaterial!;
    expect(linkedSegment.visible).toBe(false);
    expect(linkedSegment.userData.auroraParticleSlotPreviewMode).toBe(
      "hidden-linked-segment-slot-for-contiguous-batch"
    );
    expect(linkedSegment.userData.auroraParticleRenderedByBatch).toBe(true);
    performanceNow.mockReturnValue(1500);
    linkedSegment.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      linkedSegment.geometry,
      linkedMaterial,
      null
    );

    expect(linkedMaterial.opacity).toBeGreaterThan(0);
    expect(linkedSegment.scale.x).toBeCloseTo(1, 6);
    expect(linkedSegment.scale.y).toBeCloseTo(1, 6);
    expect(linkedSegment.scale.z).toBeCloseTo(1, 6);
    expect(linkedSegment.userData.auroraParticleBasisPreviewMode).toBe(
      "aurora-linked-current-next-endpoint-vertex-buffer"
    );
    expectAuroraParticleDrawRecordUserData(linkedSegment.userData, {
      activeParticleCount: 8,
      drawParticleCount: 7,
      linked: true
    });
    expectAuroraParticleDrawRecordUserData(linkedSegment.geometry.userData, {
      activeParticleCount: 8,
      drawParticleCount: 7,
      linked: true
    });
    expectAuroraParticleDrawRecordUserData(linkedMaterial.userData, {
      activeParticleCount: 8,
      drawParticleCount: 7,
      linked: true
    });
    expect(linkedSegment.userData.auroraEmitterLinkedSegmentPreviewMode).toBe(
      "active-list-adjacent-particle-pair"
    );
    expect(linkedSegment.userData.auroraEmitterLinkedSegmentEndpointMode).toBe(
      "active-current-next-particle"
    );
    expect(linkedSegment.userData.auroraEmitterLinkedActiveIndexA).toBe(0);
    expect(linkedSegment.userData.auroraEmitterLinkedActiveIndexB).toBe(1);
    expect(linkedSegment.geometry.userData.auroraEndpointPairGeometryPreviewMode).toBe(
      "six-vertex-endpoint-pair-quad"
    );
    expect(readEndpointPairDistance(linkedSegment)).toBeCloseTo(
      Number(linkedSegment.userData.auroraEndpointPairDistance),
      4
    );
    const linkedBatch = linkedBatches[0]!;
    expect(linkedBatch.mesh.visible).toBe(true);
    expect(linkedBatch.mesh.frustumCulled).toBe(false);
    expect(linkedBatch.mesh.userData.auroraParticleBatchRendererPreviewMode).toBe(
      "aurora-linked-contiguous-segment-vertex-buffer"
    );
    expect(linkedBatch.mesh.userData.auroraParticleBatchSourceSlotPreviewMode).toBe(
      "hidden-linked-segment-slot-for-contiguous-batch"
    );
    expect(linkedBatch.mesh.geometry.index).toBeNull();
    expect(linkedBatch.mesh.geometry.userData.auroraVfxTexturedParticleBatch).toBe(true);
    expect(linkedBatch.mesh.geometry.userData.auroraParticleBatchVertexCapacity).toBe(42);
    expect(linkedBatch.mesh.geometry.getAttribute("position").count).toBe(42);
    expect(linkedBatch.mesh.geometry.getAttribute("uv").count).toBe(42);
    expect(linkedBatch.mesh.geometry.getAttribute("color").count).toBe(42);
    expect(linkedBatch.mesh.geometry.getAttribute("auroraAlpha").count).toBe(42);
    expectAuroraParticleDrawRecordUserData(linkedBatch.mesh.userData, {
      activeParticleCount: 8,
      drawParticleCount: 7,
      linked: true
    });
    expectAuroraParticleDrawRecordUserData(linkedBatch.mesh.geometry.userData, {
      activeParticleCount: 8,
      drawParticleCount: 7,
      linked: true
    });
    expectAuroraParticleDrawRecordUserData(linkedBatch.material.userData, {
      activeParticleCount: 8,
      drawParticleCount: 7,
      linked: true
    });
    linkedBatch.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      linkedBatch.mesh.geometry,
      linkedBatch.material,
      null
    );
    expect(linkedBatch.mesh.userData.auroraParticleBatchUpdatePreviewMode).toBe(
      "linked-slot-simulated-contiguous-vertex-buffer-copy"
    );
    expect(linkedBatch.mesh.userData.auroraParticleBatchCopiedSlotCount).toBe(7);
    expect(linkedBatch.mesh.userData.auroraParticleBatchVisibleCount).toBeGreaterThan(0);
    performanceNow.mockRestore();
  });

  it("keeps surface Linked emitters on Aurora active-list adjacency instead of generated local strands", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_elect.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_phod_fx_amoeba1",
      kind: "placeables",
      name: "VFX: Electric Amoeba Plague 1*",
      resRef: "phod_fx_amoeba1",
      tag: "PHOD_FX_AMOEBA1",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_phod_fx_amoeba1",
          resref: "phod_fx_amoeba1",
          placeableName: "VFX: Electric Amoeba Plague 1*",
          textureFileName: "fxpa_elect.tga",
          textureDeliveryUrl: "/assets/fxpa_elect.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_amoeba1.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_amoeba1.mdl",
                nodeName: "AuroraEmitter01",
                texture: "fxpa_elect",
                emitterType: "Fountain",
                renderMode: "Linked",
                blendMode: "Lighten",
                simulation: {
                  xSize: 1000,
                  ySize: 200,
                  birthrate: 6,
                  lifeExp: 4,
                  velocity: 0.2,
                  randvel: 0.1,
                  spread: Math.PI,
                  sizeStart: 0.5,
                  sizeEnd: 0.25,
                  alphaStart: 0,
                  alphaEnd: 0.5,
                  colorStart: [1, 1, 1],
                  colorEnd: [0.2, 0.9, 1]
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("linked_billboard");
    expect(root?.userData.auroraEmitterSurfaceSpawnMode).toBe("source-xsize-ysize-plane");
    expect(root?.userData.auroraEmitterLinkedPreviewMode).toBe(
      "linked-active-list-adjacency-preview"
    );
    expect(root?.userData.auroraEmitterLinkedStrandAgeDelta).toBeUndefined();
    expect(root?.userData.auroraEmitterLinkedActiveCountAtDraw).toBe(24);
    expect(root?.userData.auroraEmitterLinkedDrawSegmentCount).toBe(23);
    expectAuroraParticleDrawRecordUserData(root?.userData, {
      activeParticleCount: 24,
      drawParticleCount: 23,
      linked: true
    });
    expect(root?.userData.auroraEmitterLinkedDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_LINKED_ACTIVE_LIST_ADJACENCY_REQUIRED",
        "VFX_LINKED_NOT_TRIANGLESTRIP_RING_BUFFER"
      ])
    );

    const segments = collectLinkedParticleSegments(root);
    expect(segments).toHaveLength(23);
    expect(
      segments.every(
        ({ mesh }) =>
          mesh.userData.auroraEmitterLinkedSegmentPreviewMode ===
            "active-list-adjacent-particle-pair" &&
          mesh.userData.auroraEmitterLinkedSegmentEndpointMode ===
            "active-current-next-particle" &&
          typeof mesh.userData.auroraEmitterLinkedActiveIndexA === "number" &&
          mesh.userData.auroraEmitterLinkedActiveIndexB ===
            mesh.userData.auroraEmitterLinkedActiveIndexA + 1
      )
    ).toBe(true);

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(2, 2, 4);
    camera.updateMatrixWorld();
    performanceNow.mockReturnValue(1600);
    segments.forEach(({ mesh, material }) => {
      mesh.onBeforeRender(
        {} as THREE.WebGLRenderer,
        new THREE.Scene(),
        camera,
        mesh.geometry,
        material,
        null
      );
    });

    const visibleSegments = segments.filter(({ material }) => material.opacity > 0);
    expect(visibleSegments.length).toBeGreaterThan(0);
    const maxSegmentLength = Math.max(
      ...visibleSegments.map(({ mesh }) => readEndpointPairDistance(mesh))
    );
    expect(maxSegmentLength).toBeGreaterThan(0);
    performanceNow.mockRestore();
  });

  it("draws no Aurora Linked segment when fewer than two particles are active", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_linked_single.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_linked_single_vfx",
      kind: "placeables",
      name: "VFX LINKED SINGLE",
      resRef: "linked_single_vfx",
      tag: "LINKED_SINGLE_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_linked_single_vfx",
          resref: "linked_single_vfx",
          textureFileName: "fx_linked_single.tga",
          textureDeliveryUrl: "/assets/fx_linked_single.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "linked-single-source",
                sourceModelFileName: "linked_single_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/linked_single_vfx.mdl",
                nodeName: "linked_single_particle",
                texture: "fx_linked_single",
                emitterType: "Fountain",
                renderMode: "Linked",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 1,
                  lifeExp: 1,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  sizeStart: 0.4,
                  sizeEnd: 0.4,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("linked_billboard");
    expect(root?.userData.auroraEmitterLinkedActiveCountAtDraw).toBe(1);
    expect(root?.userData.auroraEmitterLinkedDrawSegmentCount).toBe(0);
    expectAuroraParticleDrawRecordUserData(root?.userData, {
      activeParticleCount: 1,
      drawParticleCount: 0,
      linked: true
    });
    expect(root?.userData.auroraEmitterLinkedDiagnostics).toEqual(
      expect.arrayContaining(["VFX_LINKED_ACTIVE_LIST_ADJACENCY_REQUIRED"])
    );
    expect(collectLinkedParticleSegments(root)).toHaveLength(0);
  });

  it("renders Aurora chunkName emitters as chunk model particles instead of texture billboards", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      particleTexture
    );
    const chunkModelTemplate = new THREE.Group();
    chunkModelTemplate.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.12, 0.08),
        new THREE.MeshBasicMaterial({ color: "#9fd18a" })
      )
    );
    runtime.placeableModelCacheByUrl.set(
      "http://localhost:3000/assets/red_m_giblet.glb",
      chunkModelTemplate
    );

    const object = {
      id: "preview:plc_chunk_vfx",
      kind: "placeables",
      name: "CHUNK VFX PREVIEW",
      resRef: "chunk_vfx",
      tag: "CHUNK_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          includeChunkModelContract: true,
          placeableName: "CHUNK VFX PREVIEW",
          templateId: "plc_chunk_vfx",
          resref: "chunk_vfx",
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          chunkModelFileName: "red_m_giblet.glb",
          chunkModelDeliveryUrl: "/assets/red_m_giblet.glb",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "chunk_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/chunk_vfx.mdl",
                nodeName: "chunk_emitter",
                texture: "fxpa_smoke01",
                chunkName: "Red_M_Giblet",
                chunkModelAssetId: "chunk-model-1",
                chunkModelFileName: "red_m_giblet.glb",
                chunkModelObjectKey: "modules/current/__aurora/derived/models/red_m_giblet.glb",
                emitterType: "Explosion",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 1
                },
                events: [
                  {
                    time: 0,
                    type: "detonate"
                  }
                ]
              }
            ]
          }
        })
      }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxPreviewMode).toBe("chunk_model_particle_preview");
    expect(root?.userData.vfxPreviewLayout).toBe("chunk_model_particles");
    expect(root?.userData.vfxPreviewRole).toBe("chunk-model-particles");
    expect(root?.userData.vfxTextureStatus).toBe("chunk-model-applied");
    expect(root?.userData.vfxChunkModelStatus).toBe("applied");
    expect(root?.userData.auroraEmitterChunkName).toBe("Red_M_Giblet");
    expect(root?.userData.auroraEmitterParticlePayloadKind).toBe("chunk_model");
    expect(root?.userData.auroraEmitterChunkPreviewMode).toBe(
      "chunk-model-particle-preview"
    );
    expect(root?.userData.auroraEmitterChunkModelAssetId).toBe("chunk-model-1");
    expect(root?.userData.auroraEmitterChunkModelFileName).toBe("red_m_giblet.glb");
    expect(root?.userData.auroraEmitterChunkModelObjectKey).toBe(
      "modules/current/__aurora/derived/models/red_m_giblet.glb"
    );
    expect(root?.userData.auroraEmitterChunkModelDeliveryUrl).toBe(
      "http://localhost:3000/assets/red_m_giblet.glb"
    );
    expect(root?.userData.auroraEmitterChunkModelAssetStatus).toBe("applied");
    expect(root?.userData.auroraEmitterChunkResolverDiagnostic).toBe(
      "VFX_CHUNK_MODEL_RESOURCE_READY"
    );
    expect(root?.userData.auroraEmitterTextureIgnoredByChunkName).toBe("fxpa_smoke01");
    expect(root?.userData.auroraEmitterTextureFallbackForbiddenDiagnostic).toBe(
      "VFX_CHUNK_MISSING_MODEL_NO_TEXTURE_FALLBACK"
    );
    expect(root?.userData.auroraEmitterRequiresDetonateEvent).toBe(false);
    expect(root?.userData.auroraEmitterDetonatePreviewMode).toBe(
      "detonate-event-scheduled-preview"
    );
    let meshCount = 0;
    let texturedChunkMeshCount = 0;
    let spriteCount = 0;
    root?.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        meshCount += 1;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (
          node.userData?.auroraVfxChunkModelParticleMesh === true &&
          material instanceof THREE.MeshBasicMaterial &&
          material.map
        ) {
          texturedChunkMeshCount += 1;
        }
      }
      if (node instanceof THREE.Sprite) {
        spriteCount += 1;
      }
    });
    expect(meshCount).toBeGreaterThan(0);
    expect(texturedChunkMeshCount).toBeGreaterThan(0);
    expect(spriteCount).toBe(0);
  });

  it("starts chunkName model loading without waiting for ignored texture payloads", async () => {
    let resolveChunkModel: ((gltf: { scene: THREE.Object3D }) => void) | null = null;
    const load = vi.fn(
      (
        _url: string,
        onLoad: (gltf: { scene: THREE.Object3D }) => void
      ) => {
        resolveChunkModel = onLoad;
      }
    );
    const runtime = createRuntime(load);
    let textureLoadCount = 0;
    runtime.placeableTgaTextureLoader = {
      load: vi.fn((_url: string, onLoad: (texture: THREE.Texture) => void) => {
        textureLoadCount += 1;
        onLoad(new THREE.Texture());
      })
    };

    const object = {
      id: "preview:plc_chunk_vfx_async",
      kind: "placeables",
      name: "CHUNK VFX ASYNC PREVIEW",
      resRef: "chunk_vfx_async",
      tag: "CHUNK_VFX_ASYNC",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          includeChunkModelContract: true,
          placeableName: "CHUNK VFX ASYNC PREVIEW",
          templateId: "plc_chunk_vfx_async",
          resref: "chunk_vfx_async",
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          chunkModelFileName: "red_m_giblet.glb",
          chunkModelDeliveryUrl: "/assets/red_m_giblet.glb",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "chunk_vfx_async.mdl",
                sourceModelObjectKey: "modules/current/models/chunk_vfx_async.mdl",
                nodeName: "chunk_emitter",
                texture: "fxpa_smoke01",
                chunkName: "Red_M_Giblet",
                chunkModelAssetId: "chunk-model-1",
                chunkModelFileName: "red_m_giblet.glb",
                chunkModelObjectKey: "modules/current/__aurora/derived/models/red_m_giblet.glb",
                emitterType: "Explosion",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 1
                },
                events: [
                  {
                    time: 0,
                    type: "detonate"
                  }
                ]
              }
            ]
          }
        })
      }
    );

    expect(load).toHaveBeenCalledWith(
      "http://localhost:3000/assets/red_m_giblet.glb",
      expect.any(Function),
      undefined,
      expect.any(Function)
    );
    const loadingRoot = runtime.objectMeshById.get(object.id);
    expect(loadingRoot?.userData.vfxPreviewRole).toBe("chunk-model-source-only");
    expect(loadingRoot?.userData.vfxTextureStatus).toBe("chunk-model-loading");
    expect(loadingRoot?.userData.vfxChunkModelStatus).toBe("loading");
    expect(textureLoadCount).toBeGreaterThanOrEqual(0);

    const chunkModelTemplate = new THREE.Group();
    chunkModelTemplate.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.12, 0.08),
        new THREE.MeshBasicMaterial({ color: "#9fd18a" })
      )
    );
    resolveChunkModel?.({ scene: chunkModelTemplate });
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    const readyRoot = runtime.objectMeshById.get(object.id);
    expect(readyRoot).not.toBe(loadingRoot);
    expect(readyRoot?.userData.vfxPreviewLayout).toBe("chunk_model_particles");
    expect(readyRoot?.userData.vfxPreviewRole).toBe("chunk-model-particles");
    expect(readyRoot?.userData.vfxTextureStatus).toBe("chunk-model-applied");
    let meshCount = 0;
    let texturedChunkMeshCount = 0;
    readyRoot?.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        meshCount += 1;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (
          node.userData?.auroraVfxChunkModelParticleMesh === true &&
          material instanceof THREE.MeshBasicMaterial &&
          material.map
        ) {
          texturedChunkMeshCount += 1;
        }
      }
    });
    expect(meshCount).toBeGreaterThan(0);
    expect(texturedChunkMeshCount).toBeGreaterThan(0);
  });

  it("renders every Aurora emitter node instead of collapsing VFX to the first emitter", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "lightshaft_purple08",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Aligned_to_World_Z",
                blendMode: "Lighten",
                transform: {
                  position: [0, 0, 1.445]
                },
                simulation: {
                  xSize: 0,
                  ySize: 0,
                  birthrate: 3,
                  lifeExp: 4,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  grav: 0,
                  mass: 0,
                  sizeStart: 3,
                  sizeEnd: 3,
                  alphaStart: 0.2,
                  alphaEnd: 0.1,
                  colorStart: [1, 0.4, 0],
                  colorEnd: [1, 0.4, 0]
                },
                sourceState: {
                  isTinted: false
                }
              },
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "lightBase_purple23",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Lighten",
                transform: {
                  position: [0, 0.023, 0.035]
                },
                simulation: {
                  xSize: 0,
                  ySize: 0,
                  birthrate: 5,
                  lifeExp: 2,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  grav: 0,
                  mass: 0,
                  sizeStart: 2,
                  sizeEnd: 2,
                  alphaStart: 1,
                  alphaEnd: 1,
                  colorStart: [0, 0, 0],
                  colorEnd: [0.2, 0.1, 0]
                }
              },
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-2",
                sourceModelFileName: "phod_fx_pntgrm1.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm1.mdl",
                nodeName: "wrong_source_lightBase",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Lighten"
              }
            ]
          }
        })
      }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraVfxPreviewMode).toBe("aurora_emitter_particle_preview");
    expect(root?.userData.vfxPreviewRole).toBe("aurora-multi-emitter");
    expect(root?.userData.vfxEmitterCount).toBe(2);
    expect(root?.userData.auroraEmitterNodes).toEqual([
      "lightshaft_purple08",
      "lightBase_purple23"
    ]);
    expect(root?.userData.auroraEmitterSourceModelFileNames).toEqual([
      "phod_fx_pntgrm2.mdl",
      "phod_fx_pntgrm2.mdl"
    ]);
    expect(root?.userData.auroraEmitterSourceModelObjectKeys).toEqual([
      "modules/current/models/phod_fx_pntgrm2.mdl",
      "modules/current/models/phod_fx_pntgrm2.mdl"
    ]);
    expect(root?.userData.auroraEmitterStartDelaySeconds).toEqual([0, 0.75]);
    expect(root?.userData.auroraEmitterSchedulePreviewMode).toBe(
      "multi-emitter-index-staggered-local-clock-preview"
    );
    expect(root?.userData.auroraEmitterScheduleDiagnostics).toContain(
      "VFX_MULTI_EMITTER_SAME_FRAME_STACKING_PREVENTED"
    );
    let emitterGroupCount = 0;
    let alignedMeshCount = 0;
    let groundBillboardMeshCount = 0;
    let texturedMaterialCount = 0;
    let firstAlignedMesh: THREE.Mesh | null = null;
    let firstAlignedMaterial: THREE.MeshBasicMaterial | null = null;
    let firstGroundBillboardMesh: THREE.Mesh | null = null;
    let firstGroundBillboardMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (node.userData?.auroraEmitterNode) {
        emitterGroupCount += 1;
      }
      if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "world-z-aligned") {
        alignedMeshCount += 1;
        firstAlignedMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!firstAlignedMaterial && material instanceof THREE.MeshBasicMaterial) {
          firstAlignedMaterial = material;
        }
      }
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        groundBillboardMeshCount += 1;
        firstGroundBillboardMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!firstGroundBillboardMaterial && material instanceof THREE.MeshBasicMaterial) {
          firstGroundBillboardMaterial = material;
        }
      }
      if (node instanceof THREE.Mesh) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshBasicMaterial && material.map === particleTexture) {
            texturedMaterialCount += 1;
          }
        });
      }
    });
    expect(emitterGroupCount).toBe(2);
    expect(alignedMeshCount).toBe(12);
    expect(groundBillboardMeshCount).toBe(10);
    expect(texturedMaterialCount).toBe(22);
    expect(firstGroundBillboardMesh).not.toBeNull();
    expect(firstGroundBillboardMaterial).not.toBeNull();
    const lightshaftEmitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "lightshaft_purple08"
    );
    const lightBaseEmitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "lightBase_purple23"
    );
    expect(lightshaftEmitterRoot?.userData.auroraEmitterParticleCountSource).toBe(12);
    expect(lightshaftEmitterRoot?.userData.auroraEmitterParticleCount).toBe(12);
    expect(lightshaftEmitterRoot?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "birthrate-lifetime-source-count"
    );
    expect(lightshaftEmitterRoot?.userData.auroraEmitterStartDelaySeconds).toBe(0);
    expect(lightshaftEmitterRoot?.userData.auroraEmitterSchedulePreviewMode).toBe(
      "multi-emitter-index-staggered-local-clock-preview"
    );
    expect(lightBaseEmitterRoot?.userData.auroraEmitterParticleCountSource).toBe(10);
    expect(lightBaseEmitterRoot?.userData.auroraEmitterParticleCount).toBe(10);
    expect(lightBaseEmitterRoot?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "birthrate-lifetime-source-count"
    );
    expect(lightBaseEmitterRoot?.userData.auroraEmitterStartDelaySeconds).toBe(0.75);
    expect(lightBaseEmitterRoot?.userData.auroraEmitterSchedulePreviewMode).toBe(
      "multi-emitter-index-staggered-local-clock-preview"
    );
    expect(lightBaseEmitterRoot?.userData.auroraEmitterScheduleDiagnostics).toContain(
      "VFX_MULTI_EMITTER_SAME_FRAME_STACKING_PREVENTED"
    );
    expect(lightshaftEmitterRoot?.userData.auroraEmitterZeroMotionPreviewMode).toBe(
      "explicit-zero-kinematics-temporal-particles-preview"
    );
    expect(lightBaseEmitterRoot?.userData.auroraEmitterZeroMotionPreviewMode).toBe(
      "explicit-zero-kinematics-temporal-particles-preview"
    );
    expect(firstAlignedMesh).not.toBeNull();
    expect(firstAlignedMaterial).not.toBeNull();
    expect(firstAlignedMaterial?.opacity).toBeCloseTo(0.2, 4);
    expect(firstGroundBillboardMaterial?.opacity).toBe(0);

    const alignedMesh = firstAlignedMesh!;
    const alignedMaterial = firstAlignedMaterial!;
    performanceNow.mockReturnValue(2500);
    alignedMesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      alignedMesh.geometry,
      alignedMaterial,
      null
    );

    expect(alignedMaterial.opacity).toBeCloseTo(0.1375, 4);

    const groundBillboardMesh = firstGroundBillboardMesh!;
    const groundBillboardMaterial = firstGroundBillboardMaterial!;
    performanceNow.mockReturnValue(3250);
    groundBillboardMesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      groundBillboardMesh.geometry,
      groundBillboardMaterial,
      null
    );

    expect(groundBillboardMaterial.color.getHexString()).toBe("ffffff");
    expect(groundBillboardMaterial.vertexColors).toBe(true);
    expectAuroraVertexColorHex(groundBillboardMesh, "0d0600");
    expect(groundBillboardMaterial.opacity).toBeCloseTo(1, 4);
    performanceNow.mockRestore();
  });

  it("preserves Aurora source keyframe clocks instead of index-staggering timed emitters", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_keyed_birth.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_multi_keyed_birth",
      kind: "placeables",
      name: "VFX: Multi Keyed Birth",
      resRef: "multi_keyed_birth",
      tag: "MULTI_KEYED_BIRTH",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_multi_keyed_birth",
          resref: "multi_keyed_birth",
          textureFileName: "fxpa_keyed_birth.tga",
          textureDeliveryUrl: "/assets/fxpa_keyed_birth.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "multi-keyed-source",
                sourceModelFileName: "plc_multi_keyed_birth.mdl",
                sourceModelObjectKey: "modules/current/models/plc_multi_keyed_birth.mdl",
                nodeName: "immediate_fountain",
                texture: "fxpa_keyed_birth",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 1,
                  lifeExp: 2,
                  alphaStart: 1,
                  alphaEnd: 1,
                  sizeStart: 1,
                  sizeEnd: 1
                }
              },
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "multi-keyed-source",
                sourceModelFileName: "plc_multi_keyed_birth.mdl",
                sourceModelObjectKey: "modules/current/models/plc_multi_keyed_birth.mdl",
                nodeName: "keyframed_fountain",
                texture: "fxpa_keyed_birth",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 0,
                  lifeExp: 2,
                  alphaStart: 1,
                  alphaEnd: 1,
                  sizeStart: 1,
                  sizeEnd: 1,
                  timeline: {
                    birthrate: [
                      { time: 0, value: 0 },
                      { time: 1.25, value: 4 },
                      { time: 2, value: 4 }
                    ]
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterStartDelaySeconds).toEqual([0, 0]);
    expect(root?.userData.auroraEmitterSchedulePreviewMode).toBe(
      "multi-emitter-mixed-local-clock-preview"
    );
    expect(root?.userData.auroraEmitterSchedulePreviewModes).toEqual([
      "multi-emitter-index-staggered-local-clock-preview",
      "source-keyframe-local-clock"
    ]);

    const keyedEmitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "keyframed_fountain"
    );
    expect(keyedEmitterRoot?.userData.auroraEmitterStartDelaySeconds).toBe(0);
    expect(keyedEmitterRoot?.userData.auroraEmitterSchedulePreviewMode).toBe(
      "source-keyframe-local-clock"
    );
    expect(keyedEmitterRoot?.userData.auroraEmitterScheduleDiagnostics).toContain(
      "VFX_EMITTER_SOURCE_KEYFRAME_CLOCK_USED"
    );
    expect(keyedEmitterRoot?.userData.auroraEmitterBirthrateAtPreviewTime).toBe(0);

    const keyedParticles = collectCameraBillboardParticles(keyedEmitterRoot);
    expect(keyedParticles.length).toBeGreaterThan(0);
    expect(keyedParticles[0]?.material.opacity).toBe(0);

    performanceNow.mockReturnValue(1250);
    keyedParticles[0]?.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      keyedParticles[0].mesh.geometry,
      keyedParticles[0].material,
      null
    );

    expect(keyedParticles[0]?.material.opacity).toBeGreaterThan(0);
    performanceNow.mockRestore();
  });

  it("uses the Aurora on animation controllers for catalog VFX previews", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "lightBase_purple23",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Lighten",
                simulation: {
                  xSize: 0,
                  ySize: 0,
                  birthrate: 0,
                  lifeExp: 2,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  grav: 0,
                  mass: 0,
                  sizeStart: 2,
                  sizeEnd: 2,
                  alphaStart: 0.1,
                  alphaEnd: 0.1,
                  colorStart: [0.2, 0.1, 0],
                  colorEnd: [0.2, 0.1, 0]
                },
                animations: [
                  {
                    animationName: "off",
                    lengthSeconds: 2,
                    transitionSeconds: 0,
                    simulation: {
                      birthrate: 0
                    }
                  },
                  {
                    animationName: "on",
                    lengthSeconds: 2,
                    transitionSeconds: 0,
                  simulation: {
                    birthrate: 4,
                    alphaStart: 0.9,
                    alphaEnd: 1,
                    colorStart: [0, 0.6, 1],
                    colorEnd: [0, 0.6, 1]
                  }
                }
              ]
              }
            ]
          }
        })
      }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterAvailableAnimations).toEqual(["off", "on"]);
    expect(root?.userData.auroraEmitterSelectedAnimationName).toBe("on");
    expect(root?.userData.auroraEmitterAnimationPreviewMode).toBe(
      "catalog-default-on-animation-preview"
    );
    expect(root?.userData.auroraEmitterBaseSimulation?.birthrate).toBe(0);
    expect(root?.userData.auroraEmitterSimulation?.birthrate).toBe(4);
    expect(root?.userData.auroraEmitterSimulation?.lifeExp).toBe(2);
    expect(root?.userData.auroraEmitterPreviewColor).toBe("#0099ff");
    expect(root?.userData.auroraEmitterPreviewColorMode).toBe("aurora-emitter-color");
    expect(root?.userData.auroraEmitterBirthrate).toBe(4);
    expect(root?.userData.auroraEmitterParticleAlphaStart).toBeCloseTo(0.9, 5);
    expect(root?.userData.auroraEmitterParticleAlphaEnd).toBe(1);
    expect(root?.userData.auroraEmitterParticleCountSource).toBe(8);
    expect(root?.userData.auroraEmitterParticleCount).toBe(8);
    expect(root?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "birthrate-lifetime-source-count"
    );
    expect(root?.userData.auroraEmitterZeroMotionPreviewMode).toBe(
      "explicit-zero-kinematics-temporal-particles-preview"
    );
  });

  it("copies the Aurora point emitter origin when xSize and ySize evaluate to zero", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_phod_fx_pntgrm2_point_origin",
      kind: "placeables",
      name: "VFX POINT ORIGIN",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2_POINT",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX POINT ORIGIN",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "point_origin_spread",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Aligned_to_World_Z",
                blendMode: "Lighten",
                simulation: {
                  xSize: 0,
                  ySize: 0,
                  birthrate: 2,
                  lifeExp: 2,
                  velocity: 1,
                  randvel: 0,
                  spread: 45,
                  grav: 0,
                  mass: 0,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1,
                  colorStart: [1, 0.4, 0],
                  colorEnd: [1, 0.4, 0]
                }
              }
            ]
          }
        })
      }
    );

    expect(load).not.toHaveBeenCalled();
    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterSurfaceSpawnMode).toBe("source-point");
    expect(root?.userData.auroraEmitterSurfacePreviewMode).toBe(
      "xsize-ysize-point-origin-preview"
    );
    expect(root?.userData.auroraEmitterSurfaceDiagnostics).toEqual([
      "VFX_EMITTER_SPAWN_RECTANGLE_POINT_ORIGIN_REQUIRED"
    ]);
    expect(root?.userData.auroraEmitterParticleSpreadRadians).toBeGreaterThan(0);

    const pointOriginMeshes: THREE.Mesh[] = [];
    root?.traverse((node) => {
      if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "world-z-aligned") {
        pointOriginMeshes.push(node);
      }
    });

    expect(pointOriginMeshes).toHaveLength(4);
    pointOriginMeshes.forEach((mesh) => {
      expect(mesh.position.x).toBeCloseTo(0, 6);
      expect(mesh.position.z).toBeCloseTo(0, 6);
    });
  });

  it("samples Aurora birthrate keyframes when scheduling Fountain particles", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_phod_fx_pntgrm2_off2on",
      kind: "placeables",
      name: "VFX PREVIEW OFF2ON",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW OFF2ON",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          metadata: {
            animationName: "off2on"
          },
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "lightBase_purple23",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Lighten",
                simulation: {
                  xSize: 0,
                  ySize: 0,
                  birthrate: 0,
                  lifeExp: 2,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  grav: 0,
                  mass: 0,
                  sizeStart: 2,
                  sizeEnd: 2,
                  alphaStart: 1,
                  alphaEnd: 1,
                  colorStart: [1, 0.4, 0],
                  colorEnd: [1, 0.4, 0]
                },
                animations: [
                  {
                    animationName: "off2on",
                    lengthSeconds: 2,
                    transitionSeconds: 0,
                    simulation: {
                      birthrate: 0,
                      timeline: {
                        birthrate: [
                          { time: 0, value: 0 },
                          { time: 1, value: 4 },
                          { time: 2, value: 4 }
                        ]
                      }
                    }
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterSelectedAnimationName).toBe("off2on");
    expect(root?.userData.auroraEmitterAnimationPreviewMode).toBe(
      "metadata-animation-name-preview"
    );
    expect(root?.userData.auroraEmitterBirthrate).toBe(4);
    expect(root?.userData.auroraEmitterBirthrateAtPreviewTime).toBe(0);
    expect(root?.userData.auroraEmitterBirthrateTimelineEvaluationPreviewMode).toBe(
      "runtime-keyframe-sampled-spawn-rate"
    );
    expect(root?.userData.auroraEmitterParticleCountSource).toBe(8);
    expect(root?.userData.auroraEmitterParticleCount).toBe(8);

    let firstGroundMesh: THREE.Mesh | null = null;
    let firstGroundMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        firstGroundMesh ||
        !(node instanceof THREE.Mesh) ||
        node.userData?.vfxPreviewRole !== "world-z-ground-billboard"
      ) {
        return;
      }
      firstGroundMesh = node;
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        firstGroundMaterial = material;
      }
    });

    expect(firstGroundMesh).not.toBeNull();
    expect(firstGroundMaterial?.opacity).toBe(0);

    performanceNow.mockReturnValue(1500);
    firstGroundMesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      firstGroundMesh!.geometry,
      firstGroundMaterial!,
      null
    );
    expect(firstGroundMaterial?.opacity).toBeGreaterThan(0);
    performanceNow.mockRestore();
  });

  it("mutes Aurora VFX particles when runtime AnimationState selects off", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_phod_fx_pntgrm2_off",
      kind: "placeables",
      name: "VFX PREVIEW OFF",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW OFF",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          placeableRuntime: {
            state: {
              animationState: 5
            }
          },
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "lightBase_purple23",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Lighten",
                simulation: {
                  xSize: 0,
                  ySize: 0,
                  birthrate: 4,
                  lifeExp: 2,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  grav: 0,
                  mass: 0,
                  sizeStart: 2,
                  sizeEnd: 2,
                  alphaStart: 1,
                  alphaEnd: 1,
                  colorStart: [0.2, 0.1, 0],
                  colorEnd: [0.2, 0.1, 0]
                },
                animations: [
                  {
                    animationName: "off",
                    lengthSeconds: 2,
                    transitionSeconds: 0,
                    simulation: {
                      birthrate: 0
                    }
                  },
                  {
                    animationName: "on",
                    lengthSeconds: 2,
                    transitionSeconds: 0,
                    simulation: {
                      birthrate: 4
                    }
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterSelectedAnimationName).toBe("off");
    expect(root?.userData.auroraEmitterAnimationState).toBe(5);
    expect(root?.userData.auroraEmitterAnimationPreviewMode).toBe(
      "placeable-runtime-animation-state-preview"
    );
    expect(root?.userData.auroraEmitterAnimationEmissionMuted).toBe(true);
    expect(root?.userData.auroraEmitterBaseSimulation?.birthrate).toBe(4);
    expect(root?.userData.auroraEmitterSimulation?.birthrate).toBe(0);
    expect(root?.userData.auroraEmitterBirthrate).toBe(0);
    expect(root?.userData.auroraEmitterParticleCount).toBe(0);
    expect(root?.userData.auroraEmitterZeroMotionPreviewMode).toBeUndefined();

    let meshCount = 0;
    root?.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        meshCount += 1;
      }
    });
    expect(meshCount).toBe(0);
  });

  it("does not draw Fountain particles when Aurora birthrate or lifeExp gates suppress spawning", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_zero_fountain.tga",
      particleTexture
    );

    const makeObject = (
      id: string,
      resRef: string,
      x: number
    ): Parameters<typeof rebuildObjectMeshes>[1][number] =>
      ({
        id,
        kind: "placeables",
        name: "VFX ZERO FOUNTAIN",
        resRef,
        tag: resRef.toUpperCase(),
        x,
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
      }) as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    const birthrateZeroObject = makeObject(
      "preview:plc_zero_birthrate_fountain",
      "zero_birthrate_fountain",
      0.5
    );
    const lifeExpZeroObject = makeObject(
      "preview:plc_zero_life_fountain",
      "zero_life_fountain",
      0.75
    );

    const makePayload = (
      object: Parameters<typeof rebuildObjectMeshes>[1][number],
      simulation: NonNullable<
        NonNullable<
          NonNullable<PlaceableViewportRenderPayload["renderPackage"]>["auroraEmitter"]
        >["emitters"][number]["simulation"]
      >
    ) =>
      createVfxPayloadWithReadyModel({
        includeTextureContract: true,
        templateId: object.id.replace("preview:", ""),
        resref: object.resRef,
        textureFileName: "fxpa_zero_fountain.tga",
        textureDeliveryUrl: "/assets/fxpa_zero_fountain.tga",
        auroraEmitter: {
          source: "source-mdl",
          diagnostics: [],
          emitters: [
            {
              source: "aurora-mdl-ascii",
              sourceModelAssetId: `${object.resRef}-source`,
              sourceModelFileName: `${object.resRef}.mdl`,
              sourceModelObjectKey: `modules/current/models/${object.resRef}.mdl`,
              nodeName: "zero_fountain_particles",
              texture: "fxpa_zero_fountain",
              emitterType: "Fountain",
              renderMode: "Normal",
              blendMode: "Lighten",
              simulation
            }
          ]
        }
      });

    rebuildObjectMeshes(
      runtime,
      [birthrateZeroObject, lifeExpZeroObject],
      [],
      createDebugState(),
      1,
      false,
      10,
      [],
      false,
      {
        [birthrateZeroObject.id]: makePayload(birthrateZeroObject, {
          birthrate: 0,
          lifeExp: 2,
          velocity: 1,
          randvel: 0,
          spread: 0,
          sizeStart: 1,
          sizeEnd: 1,
          alphaStart: 1,
          alphaEnd: 1
        }),
        [lifeExpZeroObject.id]: makePayload(lifeExpZeroObject, {
          birthrate: 4,
          lifeExp: 0,
          velocity: 1,
          randvel: 0,
          spread: 0,
          sizeStart: 1,
          sizeEnd: 1,
          alphaStart: 1,
          alphaEnd: 1
        })
      }
    );

    const birthrateRoot = runtime.objectMeshById.get(birthrateZeroObject.id);
    expect(birthrateRoot?.userData.auroraEmitterUpdateMode).toBe("fountain");
    expect(birthrateRoot?.userData.auroraEmitterBirthrate).toBe(0);
    expect(birthrateRoot?.userData.auroraEmitterBirthratePositiveGateBlocked).toBe(true);
    expect(birthrateRoot?.userData.auroraEmitterParticleCountSource).toBe(0);
    expect(birthrateRoot?.userData.auroraEmitterParticleCount).toBe(0);
    expect(birthrateRoot?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "birthrate-lifetime-source-count"
    );
    expect(birthrateRoot?.userData.auroraEmitterEmissionGatePreviewMode).toBe(
      "source-birthrate-lifeexp-positive-gate"
    );
    expect(birthrateRoot?.userData.auroraEmitterEmissionDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_FOUNTAIN_BIRTHRATE_POSITIVE_GATE_REQUIRED",
        "VFX_FOUNTAIN_NORMAL_ACCUMULATOR_ZERO_RESET_REQUIRED"
      ])
    );
    expect(collectCameraBillboardParticles(birthrateRoot)).toHaveLength(0);

    const lifeExpRoot = runtime.objectMeshById.get(lifeExpZeroObject.id);
    expect(lifeExpRoot?.userData.auroraEmitterUpdateMode).toBe("fountain");
    expect(lifeExpRoot?.userData.auroraEmitterBirthrate).toBe(4);
    expect(lifeExpRoot?.userData.auroraEmitterLifeExpPositiveGateBlocked).toBe(true);
    expect(lifeExpRoot?.userData.auroraEmitterParticleCountSource).toBe(0);
    expect(lifeExpRoot?.userData.auroraEmitterParticleCount).toBe(0);
    expect(lifeExpRoot?.userData.auroraEmitterEmissionGatePreviewMode).toBe(
      "source-birthrate-lifeexp-positive-gate"
    );
    expect(lifeExpRoot?.userData.auroraEmitterEmissionDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_RUNTIME_LIFEEXP_ZERO_DRAW_GATE",
        "VFX_RUNTIME_LIFEEXP_PREVIEW_CLAMP_FORBIDDEN"
      ])
    );
    expect(collectCameraBillboardParticles(lifeExpRoot)).toHaveLength(0);
  });

  it("uses Aurora size-Y zero as an X-axis fallback for world-Z pentagram emitters", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "lightshaft_purple08",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Aligned_to_World_Z",
                blendMode: "Lighten",
                transform: {
                  position: [0, 0, 1.445]
                },
                simulation: {
                  xSize: 0,
                  ySize: 0,
                  birthrate: 3,
                  lifeExp: 4,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  grav: 0,
                  mass: 0,
                  sizeStart: 3,
                  sizeEnd: 3,
                  sizeStartY: 0,
                  sizeEndY: 0,
                  alphaStart: 0.2,
                  alphaEnd: 0.1,
                  colorStart: [1, 0.4, 0],
                  colorEnd: [1, 0.4, 0]
                },
                sourceState: {
                  isTinted: false
                }
              },
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "lightBase_purple23",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Lighten",
                transform: {
                  position: [0, 0.023, 0.035]
                },
                simulation: {
                  xSize: 0,
                  ySize: 0,
                  birthrate: 5,
                  lifeExp: 2,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  grav: 0,
                  mass: 0,
                  sizeStart: 2,
                  sizeEnd: 2,
                  sizeStartY: 0,
                  sizeEndY: 0,
                  alphaStart: 1,
                  alphaEnd: 1,
                  colorStart: [0, 0, 0],
                  colorEnd: [0.2, 0.1, 0]
                },
                sourceState: {
                  isTinted: false
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    const emitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "lightshaft_purple08"
    );
    expect(emitterRoot?.userData.auroraEmitterParticleSizeYStart).toBeUndefined();
    expect(emitterRoot?.userData.auroraEmitterParticleSizeYEnd).toBeUndefined();
    expect(emitterRoot?.userData.auroraEmitterParticleSizeYFallbackPreviewMode).toBe(
      "source-size-y-zero-uses-x-axis"
    );
    expect(emitterRoot?.userData.auroraEmitterParticleCountSource).toBe(12);
    expect(emitterRoot?.userData.auroraEmitterParticleCount).toBe(12);
    expect(emitterRoot?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "birthrate-lifetime-source-count"
    );
    expect(emitterRoot?.userData.auroraEmitterZeroMotionPreviewMode).toBe(
      "explicit-zero-kinematics-temporal-particles-preview"
    );
    expect(emitterRoot?.userData.auroraEmitterBaseLift).toBe(0);
    expect(emitterRoot?.userData.auroraEmitterSourceTransformAnchorPreviewMode).toBe(
      "node-transform-origin-no-procedural-lift"
    );
    expect(emitterRoot?.position.y).toBeCloseTo(1.445 * 0.005, 5);
    const groundEmitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "lightBase_purple23"
    );
    expect(groundEmitterRoot?.userData.auroraEmitterParticleSizeYStart).toBeUndefined();
    expect(groundEmitterRoot?.userData.auroraEmitterParticleSizeYEnd).toBeUndefined();
    expect(groundEmitterRoot?.userData.auroraEmitterParticleSizeYFallbackPreviewMode).toBe(
      "source-size-y-zero-uses-x-axis"
    );
    expect(groundEmitterRoot?.userData.auroraEmitterParticleSizeSourcePreviewMode).toBe(
      "aurora-source-size-linear"
    );
    expect(groundEmitterRoot?.userData.auroraEmitterParticleAlphaSourcePreviewMode).toBe(
      "aurora-source-alpha-linear"
    );
    expect(groundEmitterRoot?.userData.auroraEmitterParticleCountSource).toBe(10);
    expect(groundEmitterRoot?.userData.auroraEmitterParticleCount).toBe(10);
    expect(groundEmitterRoot?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "birthrate-lifetime-source-count"
    );
    expect(groundEmitterRoot?.userData.auroraEmitterZeroMotionPreviewMode).toBe(
      "explicit-zero-kinematics-temporal-particles-preview"
    );
    expect(groundEmitterRoot?.userData.auroraEmitterBaseLift).toBe(0);
    expect(groundEmitterRoot?.userData.auroraEmitterSourceTransformAnchorPreviewMode).toBe(
      "node-transform-origin-no-procedural-lift"
    );
    expect(groundEmitterRoot?.position.y).toBeCloseTo(0.035 * 0.005, 5);

    let alignedMesh: THREE.Mesh | null = null;
    let alignedMaterial: THREE.MeshBasicMaterial | null = null;
    let groundMesh: THREE.Mesh | null = null;
    let groundMaterial: THREE.MeshBasicMaterial | null = null;
    emitterRoot?.traverse((node) => {
      if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "world-z-aligned") {
        alignedMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!alignedMaterial && material instanceof THREE.MeshBasicMaterial) {
          alignedMaterial = material;
        }
      }
    });
    groundEmitterRoot?.traverse((node) => {
      if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "world-z-ground-billboard") {
        groundMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!groundMaterial && material instanceof THREE.MeshBasicMaterial) {
          groundMaterial = material;
        }
      }
    });

    expect(alignedMesh).not.toBeNull();
    expect(alignedMaterial).not.toBeNull();
    expect(groundMesh).not.toBeNull();
    expect(groundMaterial).not.toBeNull();
    expect(alignedMesh!.scale.x).toBeGreaterThan(0);
    expect(alignedMesh!.scale.y).toBeCloseTo(alignedMesh!.scale.x, 4);
    expect(alignedMesh!.position.y).toBeCloseTo(0, 5);
    expect(groundMesh!.scale.y).toBeGreaterThan(0);
    expect(groundMesh!.position.y).toBeCloseTo(0, 5);

    performanceNow.mockReturnValue(2500);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(3, 5, 4);
    alignedMesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      alignedMesh!.geometry,
      alignedMaterial!,
      null
    );

    expect(alignedMesh!.scale.x).toBeGreaterThan(0);
    expect(alignedMesh!.scale.y).toBeCloseTo(alignedMesh!.scale.x, 4);
    expect(alignedMesh!.position.y).toBeCloseTo(0, 5);
    expect(alignedMesh!.rotation.y).toBeGreaterThan(0.1);
    expect(alignedMesh!.geometry.userData.auroraVfxParticleVertexColorPreviewMode).toBe(
      "aurora-particle-color-ambient-tint-disabled"
    );
    const alignedSourceColor = readAuroraVertexColorSource(alignedMesh!);
    expect(alignedSourceColor?.[0]).toBeCloseTo(1, 4);
    expect(alignedSourceColor?.[1]).toBeGreaterThan(0.1);
    expect(alignedSourceColor?.[2]).toBeCloseTo(0, 4);
    expect(alignedMesh!.geometry.userData.auroraVfxLightenAlphaRgbPreviewMode).toBe(
      "lighten-rgb-scaled-by-particle-alpha"
    );
    expect(readFirstAuroraVertexColor(alignedMesh!).r).toBeLessThan(alignedSourceColor?.[0] ?? 1);
    expect(readFirstAuroraVertexColor(alignedMesh!).g).toBeLessThan(alignedSourceColor?.[1] ?? 0.4);

    groundMesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      groundMesh!.geometry,
      groundMaterial!,
      null
    );
    const groundScaleAtFirstTick = groundMesh!.scale.clone();
    const groundOpacityAtFirstTick = groundMaterial!.opacity;
    expect(groundMesh!.geometry.userData.auroraVfxParticleVertexColorPreviewMode).toBe(
      "aurora-particle-color-ambient-tint-disabled"
    );

    performanceNow.mockReturnValue(2000);
    groundMesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      groundMesh!.geometry,
      groundMaterial!,
      null
    );

    expect(groundMesh!.scale.x).toBeCloseTo(groundScaleAtFirstTick.x, 6);
    expect(groundMesh!.scale.y).toBeCloseTo(groundScaleAtFirstTick.y, 6);
    expect(groundMaterial!.opacity).toBeCloseTo(groundOpacityAtFirstTick, 6);
    performanceNow.mockRestore();
  });

  it("does not add procedural pulse to explicit zero-kinematics world-Z emitters", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_bar2blu.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_phod_fx_bar2blu",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_bar2blu",
      tag: "PHOD_FX_BAR2BLU",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_bar2blu",
          resref: "phod_fx_bar2blu",
          textureFileName: "phod_fx_bar2blu.tga",
          textureDeliveryUrl: "/assets/phod_fx_bar2blu.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_bar2blu.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_bar2blu.mdl",
                nodeName: "static_world_z_bar",
                texture: "phod_fx_bar2blu",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Lighten",
                simulation: {
                  xSize: 0,
                  ySize: 0,
                  birthrate: 4,
                  lifeExp: 2,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  grav: 0,
                  mass: 0
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterZeroMotionPreviewMode).toBe(
      "explicit-zero-kinematics-temporal-particles-preview"
    );
    expect(root?.userData.auroraEmitterParticleCountSource).toBe(8);
    expect(root?.userData.auroraEmitterParticleCount).toBe(8);
    expect(root?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "birthrate-lifetime-source-count"
    );
    expect(root?.userData.auroraEmitterProceduralModulationPreviewMode).toBe(
      "suppressed-for-explicit-zero-kinematics"
    );

    let groundMesh: THREE.Mesh | null = null;
    let groundMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "world-z-ground-billboard") {
        groundMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!groundMaterial && material instanceof THREE.MeshBasicMaterial) {
          groundMaterial = material;
        }
      }
    });
    expect(groundMesh).not.toBeNull();
    expect(groundMaterial).not.toBeNull();

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(3, 5, 4);
    performanceNow.mockReturnValue(1000);
    groundMesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      groundMesh!.geometry,
      groundMaterial!,
      null
    );
    const firstPosition = groundMesh!.position.clone();
    const firstScale = groundMesh!.scale.clone();
    const firstOpacity = groundMaterial!.opacity;

    performanceNow.mockReturnValue(1750);
    groundMesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      groundMesh!.geometry,
      groundMaterial!,
      null
    );

    expect(groundMesh!.position.x).toBeCloseTo(firstPosition.x, 6);
    expect(groundMesh!.position.y).toBeCloseTo(firstPosition.y, 6);
    expect(groundMesh!.position.z).toBeCloseTo(firstPosition.z, 6);
    expect(groundMesh!.scale.x).toBeCloseTo(firstScale.x, 6);
    expect(groundMesh!.scale.y).toBeCloseTo(firstScale.y, 6);
    expect(groundMaterial!.opacity).toBeCloseTo(firstOpacity, 6);
    performanceNow.mockRestore();
  });

  it("adapts Aurora emitter renderorder from sourceState instead of deriving order from blend mode", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "normal_front_priority",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                sourceState: {
                  renderOrder: -4
                }
              },
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "lighten_back_priority",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Lighten",
                sourceState: {
                  renderOrder: 5
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    const frontEmitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "normal_front_priority"
    );
    const backEmitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "lighten_back_priority"
    );
    expect(frontEmitterRoot?.userData.auroraEmitterBlendMode).toBe("Normal");
    expect(backEmitterRoot?.userData.auroraEmitterBlendMode).toBe("Lighten");
    expect(frontEmitterRoot?.userData.auroraEmitterRenderOrder).toBe(-4);
    expect(backEmitterRoot?.userData.auroraEmitterRenderOrder).toBe(5);
    expect(frontEmitterRoot?.userData.auroraEmitterThreeRenderOrder).toBe(16);
    expect(backEmitterRoot?.userData.auroraEmitterThreeRenderOrder).toBe(7);
    expect(frontEmitterRoot?.renderOrder).toBe(16);
    expect(backEmitterRoot?.renderOrder).toBe(7);
    expect(frontEmitterRoot?.userData.auroraEmitterRenderOrderAdapterPreviewMode).toBe(
      "aurora-source-renderorder-short-adapter"
    );
    expect(frontEmitterRoot?.userData.auroraEmitterRenderOrderAdapterDiagnostic).toBe(
      "VFX_RENDERORDER_ADAPTER_DIRECTION_PROVENANCE_REQUIRED"
    );

    const frontMeshOrders: number[] = [];
    const backMeshOrders: number[] = [];
    frontEmitterRoot?.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        frontMeshOrders.push(node.renderOrder);
        expect(node.userData.auroraEmitterRenderOrder).toBe(-4);
      }
    });
    backEmitterRoot?.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        backMeshOrders.push(node.renderOrder);
        expect(node.userData.auroraEmitterRenderOrder).toBe(5);
      }
    });
    expect(frontMeshOrders).toEqual([16]);
    expect(backMeshOrders).toEqual([7]);
  });

  it("uses Aurora twosidedtex source state for textured particle material sidedness", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "culled_texture_particle",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                sourceState: {
                  renderHintRaw: "normalandspecmapped",
                  renderHintMode: 2,
                  customShaderVS: "phod_custom_vs",
                  customShaderFS: "phod_custom_fs",
                  customShaderGS: "phod_custom_gs",
                  twoSidedMaterial: true,
                  twoSidedTexture: false
                }
              },
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "twosided_texture_particle",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                sourceState: {
                  twoSidedTexture: true
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    const culledEmitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "culled_texture_particle"
    );
    const twoSidedEmitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "twosided_texture_particle"
    );

    const readFirstMeshMaterial = (emitterRoot: THREE.Object3D | undefined) => {
      let material: THREE.MeshBasicMaterial | null = null;
      emitterRoot?.traverse((node) => {
        if (material || !(node instanceof THREE.Mesh)) {
          return;
        }
        const candidate = Array.isArray(node.material) ? node.material[0] : node.material;
        if (candidate instanceof THREE.MeshBasicMaterial) {
          material = candidate;
        }
      });
      return material;
    };

    const culledMaterial = readFirstMeshMaterial(culledEmitterRoot);
    const twoSidedMaterial = readFirstMeshMaterial(twoSidedEmitterRoot);

    expect(culledEmitterRoot?.userData.auroraEmitterTwoSidedTexture).toBe(false);
    expect(culledEmitterRoot?.userData.auroraEmitterRenderHintRaw).toBe(
      "normalandspecmapped"
    );
    expect(culledEmitterRoot?.userData.auroraEmitterRenderHintMode).toBe(2);
    expect(culledEmitterRoot?.userData.auroraEmitterRenderHintPreviewMode).toBe(
      "source-renderhint-decompile-enum-preserved"
    );
    expect(culledEmitterRoot?.userData.auroraEmitterRenderHintDiagnostic).toBe(
      "VFX_RENDERHINT_GL_STATE_CAPTURE_REQUIRED"
    );
    expect(culledEmitterRoot?.userData.auroraEmitterCustomShaderVS).toBe(
      "phod_custom_vs"
    );
    expect(culledEmitterRoot?.userData.auroraEmitterCustomShaderFS).toBe(
      "phod_custom_fs"
    );
    expect(culledEmitterRoot?.userData.auroraEmitterCustomShaderGS).toBe(
      "phod_custom_gs"
    );
    expect(culledEmitterRoot?.userData.auroraEmitterCustomShaderPreviewMode).toBe(
      "source-custom-shader-names-preserved"
    );
    expect(culledEmitterRoot?.userData.auroraEmitterCustomShaderDiagnostic).toBe(
      "VFX_CUSTOM_SHADER_GL_BINDING_CAPTURE_REQUIRED"
    );
    expect(culledEmitterRoot?.userData.auroraEmitterTwoSidedMaterial).toBe(true);
    expect(culledEmitterRoot?.userData.auroraEmitterTwoSidedMaterialPreviewMode).toBe(
      "source-twosided-material-flag-preserved"
    );
    expect(
      culledEmitterRoot?.userData.auroraEmitterTwoSidedMaterialRenderWrapperArgument
    ).toBe(1);
    expect(culledEmitterRoot?.userData.auroraEmitterTwoSidedMaterialRuntimeLane).toBe(
      "two_sided_material_non_volumetric_runtime_arg1"
    );
    expect(
      culledEmitterRoot?.userData.auroraEmitterTwoSidedMaterialRuntimeLaneDiagnostics
    ).toEqual(["VFX_TWOSIDED_MATERIAL_RUNTIME_ARG1_REQUIRED"]);
    expect(culledEmitterRoot?.userData.auroraEmitterTextureSide).toBe(THREE.FrontSide);
    expect(culledEmitterRoot?.userData.auroraEmitterCullState3).toBe("enabled");
    expect(culledMaterial?.side).toBe(THREE.FrontSide);
    expect(culledMaterial?.userData.auroraEmitterTextureSidePreviewMode).toBe(
      "aurora-source-twosidedtex-adapter"
    );

    expect(twoSidedEmitterRoot?.userData.auroraEmitterTwoSidedTexture).toBe(true);
    expect(twoSidedEmitterRoot?.userData.auroraEmitterTextureSide).toBe(THREE.DoubleSide);
    expect(twoSidedEmitterRoot?.userData.auroraEmitterCullState3).toBe("disabled");
    expect(twoSidedMaterial?.side).toBe(THREE.DoubleSide);
    expect(twoSidedMaterial?.userData.auroraEmitterTextureSideDiagnostic).toBe(
      "VFX_TWOSIDEDTEX_STATE3_CULL_LANE_REQUIRED"
    );
  });

  it("preserves Aurora framebuffer runtime lane 5 for sample_framebuffer 1 and volumetric emitters", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "sample_framebuffer_mode1",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                sourceState: {
                  sampleFramebuffer: 1
                }
              },
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "volumetric_lane5",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                sourceState: {
                  sampleFramebuffer: 0,
                  twoSidedMaterial: true,
                  volumetric: true
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    const sampleFramebufferRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "sample_framebuffer_mode1"
    );
    const volumetricRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "volumetric_lane5"
    );

    expect(sampleFramebufferRoot?.userData.auroraEmitterSampleFramebuffer).toBe(1);
    expect(sampleFramebufferRoot?.userData.auroraEmitterFramebufferRenderLane).toBe(5);
    expect(
      sampleFramebufferRoot?.userData.auroraEmitterFramebufferRenderLanePreviewMode
    ).toBe("aurora-source-sample-framebuffer-mode1-render-lane");
    expect(
      sampleFramebufferRoot?.userData.auroraEmitterFramebufferRenderLaneSource
    ).toBe("sample_framebuffer");
    expect(
      sampleFramebufferRoot?.userData.auroraEmitterFramebufferRenderLaneDiagnostics
    ).toEqual([
      "VFX_SAMPLE_FRAMEBUFFER_MODE1_RUNTIME_LANE_5_REQUIRED",
      "VFX_SAMPLE_FRAMEBUFFER_RENDER_LANE_CAPTURE_REQUIRED"
    ]);

    expect(volumetricRoot?.userData.auroraEmitterSampleFramebuffer).toBe(0);
    expect(volumetricRoot?.userData.auroraEmitterVolumetric).toBe(true);
    expect(volumetricRoot?.userData.auroraEmitterTwoSidedMaterial).toBe(true);
    expect(volumetricRoot?.userData.auroraEmitterTwoSidedMaterialRenderWrapperArgument).toBe(
      0
    );
    expect(volumetricRoot?.userData.auroraEmitterTwoSidedMaterialRuntimeLane).toBe(
      "two_sided_material_volumetric_runtime_arg0"
    );
    expect(volumetricRoot?.userData.auroraEmitterTwoSidedMaterialRuntimeLaneDiagnostics).toEqual([
      "VFX_TWOSIDED_MATERIAL_VOLUMETRIC_ARG0_REQUIRED"
    ]);
    expect(volumetricRoot?.userData.auroraEmitterFramebufferRenderLane).toBe(5);
    expect(volumetricRoot?.userData.auroraEmitterFramebufferRenderLanePreviewMode).toBe(
      "aurora-source-volumetric-render-lane"
    );
    expect(volumetricRoot?.userData.auroraEmitterFramebufferRenderLaneSource).toBe(
      "volumetric"
    );
    expect(volumetricRoot?.userData.auroraEmitterFramebufferRenderLaneDiagnostics).toEqual([
      "VFX_VOLUMETRIC_RUNTIME_LANE_5_REQUIRED",
      "VFX_SAMPLE_FRAMEBUFFER_VOLUME_BRANCH_CAPTURE_REQUIRED"
    ]);
  });

  it("uses Aurora source-state tint, splat, rotate texture, and wind flags for VFX particles", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1,
      1,
      THREE.RGBAFormat
    );
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "splat_untinted_particle",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1,
                  colorStart: [0, 0, 0],
                  colorEnd: [1, 0, 0]
                },
                sourceState: {
                  isTinted: false,
                  splat: true,
                  rotateTexture: true,
                  loop: true
                }
              },
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "wind_affected_particle",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  sizeStart: 0.5,
                  sizeEnd: 0.5,
                  alphaStart: 1,
                  alphaEnd: 1,
                  colorStart: [0.2, 0.4, 0.6],
                  affectedByWind: true
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    const splatEmitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "splat_untinted_particle"
    );
    const windEmitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "wind_affected_particle"
    );

    const readFirstParticleAndMaterial = (emitterRoot: THREE.Object3D | undefined) => {
      let object: THREE.Mesh | THREE.Sprite | null = null;
      let material: THREE.MeshBasicMaterial | THREE.SpriteMaterial | null = null;
      emitterRoot?.traverse((node) => {
        if (object) {
          return;
        }
        if (node instanceof THREE.Sprite) {
          object = node;
          material = node.material;
          return;
        }
        if (node instanceof THREE.Mesh) {
          const candidate = Array.isArray(node.material) ? node.material[0] : node.material;
          if (candidate instanceof THREE.MeshBasicMaterial) {
            object = node;
            material = candidate;
          }
        }
      });
      return { object, material };
    };

    const splat = readFirstParticleAndMaterial(splatEmitterRoot);
    const wind = readFirstParticleAndMaterial(windEmitterRoot);

    expect(splatEmitterRoot?.userData.auroraEmitterSplat).toBe(true);
    expect(splatEmitterRoot?.userData.auroraEmitterSplatPreviewMode).toBe(
      "landed-flag-required"
    );
    expect(splatEmitterRoot?.userData.auroraEmitterSplatDiagnostics).toEqual([
      "VFX_PARTICLE_SPLAT_LANDED_FLAG_REQUIRED",
      "VFX_PARTICLE_SPLAT_NOT_DECAL",
      "VFX_PARTICLE_COLLISION_QUERY_REQUIRED"
    ]);
    expect(splatEmitterRoot?.userData.vfxPreviewLayout).toBe("camera_billboard");
    expect(splat.object).toBeInstanceOf(THREE.Mesh);
    expect(splat.object?.userData.vfxPreviewRole).toBe("camera-billboard-particle");
    if (splat.object instanceof THREE.Mesh) {
      expectAuroraCameraBillboardQuad(splat.object);
    }
    expect(splat.material?.userData.auroraEmitterIsTinted).toBe(false);
    expect(splat.material?.userData.auroraEmitterTintPreviewMode).toBe(
      "aurora-source-m_istinted-disabled-particle-color-preserved"
    );
    expect(splat.material?.color.getHexString()).toBe("ffffff");

    performanceNow.mockReturnValue(2000);
    splat.object?.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      splat.object instanceof THREE.Mesh ? splat.object.geometry : splat.object!.geometry,
      splat.material!,
      null
    );

    expect(splat.material?.color.getHexString()).toBe("ffffff");
    if (splat.object instanceof THREE.Mesh) {
      expect(splat.object.geometry.userData.auroraVfxParticleVertexColorPreviewMode).toBe(
        "aurora-particle-color-ambient-tint-disabled"
      );
      expectAuroraVertexColorHex(splat.object, "400000");
    }
    expect(splat.object?.userData.auroraParticleBillboardRoll).toBeCloseTo(0, 6);
    expect(splatEmitterRoot?.userData.auroraEmitterRotateTexturePreviewMode).toBe(
      "aurora-source-rotatetexture-runtime-flag"
    );
    expect(splatEmitterRoot?.userData.auroraEmitterParticleRotationRateRadians).toBeUndefined();
    expect(splatEmitterRoot?.userData.auroraEmitterParticleRotationRatePreviewMode).toBe(
      "aurora-rotatetexture-no-implicit-particle-rotation-rate"
    );
    expect(splatEmitterRoot?.userData.auroraEmitterRotateTextureDiagnostics).toEqual([
      "VFX_ROTATETEXTURE_RUNTIME_BYTE_FLAG_REQUIRED",
      "VFX_ROTATETEXTURE_RATE_REQUIRES_PARTICLEROT_OR_RUNTIME_CAPTURE"
    ]);

    expect(windEmitterRoot?.userData.auroraEmitterAffectedByWind).toBe(true);
    expect(windEmitterRoot?.userData.auroraEmitterAffectedByWindPreviewMode).toBe(
      "aurora-source-affectedbywind-horizontal-drift"
    );
    expect(wind.object).not.toBeNull();
    const initialWindX = wind.object?.position.x ?? 0;
    const initialWindZ = wind.object?.position.z ?? 0;
    wind.object?.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      wind.object instanceof THREE.Mesh ? wind.object.geometry : wind.object!.geometry,
      wind.material!,
      null
    );

    expect(wind.object?.position.x).not.toBeCloseTo(initialWindX, 6);
    expect(wind.object?.position.z).not.toBeCloseTo(initialWindZ, 6);
    expect(wind.object?.userData.auroraEmitterAffectedByWindPreviewMode).toBe(
      "aurora-source-affectedbywind-horizontal-drift"
    );
    performanceNow.mockRestore();
  });

  it("lands Aurora splat particles on the floor plane instead of keeping camera billboards", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_splat.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_splat_vfx",
      kind: "placeables",
      name: "VFX SPLAT",
      resRef: "splat_vfx",
      tag: "SPLAT_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_splat_vfx",
          resref: "splat_vfx",
          textureFileName: "fxpa_splat.tga",
          textureDeliveryUrl: "/assets/fxpa_splat.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "splat-source",
                sourceModelFileName: "splat_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/splat_vfx.mdl",
                nodeName: "falling_splat_particle",
                texture: "fxpa_splat",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  mass: 100,
                  sizeStart: 0.2,
                  sizeEnd: 1,
                  sizeStartY: 0.1,
                  sizeEndY: 0.75,
                  alphaStart: 1,
                  alphaEnd: 1
                },
                sourceState: {
                  splat: true,
                  rotateTexture: true
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterSplat).toBe(true);
    expect(root?.userData.auroraEmitterSplatPreviewMode).toBe("landed-flag-required");
    const particle = collectCameraBillboardParticles(root)[0]!;

    performanceNow.mockReturnValue(2500);
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );

    expect(particle.mesh.position.y).toBe(0);
    expect(particle.mesh.rotation.x).toBeCloseTo(-Math.PI / 2, 5);
    expect(particle.mesh.userData.auroraEmitterSplatLanded).toBe(true);
    expect(particle.mesh.userData.auroraEmitterSplatParticlePreviewMode).toBe(
      "floor-plane-splat-preview"
    );
    expect(particle.mesh.userData.auroraParticleBasisPreviewMode).toBe(
      "aurora-splat-floor-plane-basis"
    );
    expectAuroraParticleSoftnessState(particle.mesh, particle.material, {
      gate: "zero-for-splat",
      value: 0
    });
    expect(particle.mesh.userData.auroraEmitterSplatEndSizeGate).toBe(true);
    expect(particle.mesh.userData.auroraEmitterSplatSizePreviewMode).toBe(
      "landed-splat-end-size-gate"
    );
    expect(particle.mesh.userData.auroraEmitterSplatEndSizeYSource).toBe("source-size-end-y");
    expect(particle.mesh.userData.auroraEmitterSplatEndSizeX).toBeCloseTo(
      particle.mesh.scale.x,
      6
    );
    expect(particle.mesh.userData.auroraEmitterSplatEndSizeY).toBeCloseTo(
      particle.mesh.scale.y,
      6
    );
    expect(particle.mesh.userData.auroraEmitterSplatEndSizeX).toBeGreaterThan(
      particle.mesh.userData.auroraEmitterSplatInterpolatedSizeX
    );
    expect(particle.mesh.userData.auroraEmitterSplatEndSizeY).toBeGreaterThan(
      particle.mesh.userData.auroraEmitterSplatInterpolatedSizeY
    );
    expect(particle.material.userData.auroraEmitterSplatEndSizeGate).toBe(true);
    expect(particle.mesh.geometry.userData.auroraEmitterSplatEndSizeGate).toBe(true);
    performanceNow.mockRestore();
  });

  it("keeps per-emitter Lighten black-keying when multi-emitter VFX textures load asynchronously", async () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const textureSize = 8;
    const keyedPixels = new Uint8Array(textureSize * textureSize * 4);
    for (let index = 0; index < textureSize * textureSize; index += 1) {
      const offset = index * 4;
      const x = index % textureSize;
      const y = Math.floor(index / textureSize);
      const isGlyphPixel =
        x === Math.floor(textureSize / 2) ||
        y === Math.floor(textureSize / 2) ||
        x === y;
      keyedPixels[offset] = isGlyphPixel ? 112 : 0;
      keyedPixels[offset + 1] = isGlyphPixel ? 96 : 0;
      keyedPixels[offset + 2] = isGlyphPixel ? 64 : 0;
      keyedPixels[offset + 3] = 255;
    }
    const particleTexture = new THREE.DataTexture(
      keyedPixels,
      textureSize,
      textureSize,
      THREE.RGBAFormat
    );
    particleTexture.needsUpdate = true;
    const textureLoader = vi.fn((_url: string, onLoad: (texture: THREE.Texture) => void) => {
      onLoad(particleTexture);
    });
    runtime.placeableTgaTextureLoader = { load: textureLoader };

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "lightshaft_purple08",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Aligned_to_World_Z",
                blendMode: "Lighten"
              },
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "lightBase_purple23",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Lighten"
              }
            ]
          }
        })
      }
    );

    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    const root = runtime.objectMeshById.get(object.id);
    expect(textureLoader).toHaveBeenCalledWith(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      expect.any(Function),
      undefined,
      expect.any(Function)
    );
    expect(root?.userData.vfxTextureBlackKeyConverted).toBe(true);
    let texturedMaterialCount = 0;
    let blackKeyedMaterialCount = 0;
    let firstBlackKeyedMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshBasicMaterial) || !material.map) {
          return;
        }
        texturedMaterialCount += 1;
        if (
          material.map.userData?.auroraConvertedBlackKeyTexture === true &&
          material.alphaMap?.userData?.auroraConvertedBlackKeyAlphaMap === true
        ) {
          blackKeyedMaterialCount += 1;
          firstBlackKeyedMaterial ??= material;
        }
      });
    });
    expect(texturedMaterialCount).toBe(2);
    expect(blackKeyedMaterialCount).toBe(texturedMaterialCount);
    expect(firstBlackKeyedMaterial?.map?.userData?.auroraBlackKeyAlphaApplication).toBe(
      "alpha-map-single-pass"
    );
    expect(firstBlackKeyedMaterial?.alphaMap?.userData?.auroraBlackKeyAlphaApplication).toBe(
      "alpha-map-single-pass"
    );
    expect(firstBlackKeyedMaterial?.userData.auroraEmitterBlendStatePreviewMode).toBe(
      "aurora-blend-lighten-alpha-additive-adapter"
    );
    expect(firstBlackKeyedMaterial?.blendSrc).toBe(THREE.SrcAlphaFactor);
    expect(firstBlackKeyedMaterial?.blendDst).toBe(THREE.OneFactor);
    expect(firstBlackKeyedMaterial?.blendSrcAlpha).toBe(THREE.OneFactor);
    expect(firstBlackKeyedMaterial?.blendDstAlpha).toBe(THREE.OneFactor);
    const mapPixels = firstBlackKeyedMaterial?.map?.image?.data as Uint8Array | undefined;
    const alphaPixels = firstBlackKeyedMaterial?.alphaMap?.image?.data as Uint8Array | undefined;
    const glyphOffset = (Math.floor(textureSize / 2) * textureSize + 0) * 4;
    expect(mapPixels?.[glyphOffset]).toBe(112);
    expect(mapPixels?.[glyphOffset + 3]).toBe(255);
    expect(alphaPixels?.[glyphOffset]).toBeGreaterThan(0);
    expect(alphaPixels?.[glyphOffset]).toBeLessThan(255);
  });

  it("forces black-key alpha maps for Normal Aurora VFX textures without alpha", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const textureSize = 8;
    const keyedPixels = new Uint8Array(textureSize * textureSize * 4);
    for (let index = 0; index < textureSize * textureSize; index += 1) {
      const offset = index * 4;
      const x = index % textureSize;
      const y = Math.floor(index / textureSize);
      const isGlyphPixel =
        (x === Math.floor(textureSize / 2) && y === Math.floor(textureSize / 2)) ||
        (x === Math.floor(textureSize / 2) + 1 && y === Math.floor(textureSize / 2));
      keyedPixels[offset] = isGlyphPixel ? 116 : 0;
      keyedPixels[offset + 1] = isGlyphPixel ? 116 : 0;
      keyedPixels[offset + 2] = isGlyphPixel ? 116 : 0;
      keyedPixels[offset + 3] = 255;
    }
    const particleTexture = new THREE.DataTexture(
      keyedPixels,
      textureSize,
      textureSize,
      THREE.RGBAFormat
    );
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_vff_gasdispel",
      kind: "placeables",
      name: "VFX: GAS JET, DISPEL",
      resRef: "vff_gasdispel",
      tag: "VFF_GASDISPEL",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX: GAS JET, DISPEL",
          templateId: "plc_vff_gasdispel",
          resref: "vff_gasdispel",
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          auroraEmitter: createSingleTextureAuroraEmitter({
            texture: "fxpa_smoke01",
            blendMode: "Normal",
            renderMode: "Normal",
            sourceModelFileName: "vff_gasdispel.mdl",
            nodeName: "UPcloud"
          })
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    const smokeEmitterRoot =
      root?.children.find((child) => child.userData?.auroraEmitterNode === "UPcloud") ?? root;
    let smokeMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        smokeMaterial ||
        !(node instanceof THREE.Mesh) ||
        node.userData?.vfxPreviewRole !== "camera-billboard-particle"
      ) {
        return;
      }
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        smokeMaterial = material;
      }
    });

    expect(smokeMaterial).not.toBeNull();
    expect(smokeMaterial?.userData.auroraEmitterBlendMode).toBe("Normal");
    expect(smokeMaterial?.userData.auroraBlackKeyTexture).toBe(true);
    expect(smokeMaterial?.map?.userData.auroraConvertedBlackKeyTexture).toBe(true);
    expect(smokeMaterial?.alphaMap?.userData.auroraConvertedBlackKeyAlphaMap).toBe(true);
    const alphaPixels = smokeMaterial?.alphaMap?.image?.data as Uint8Array | undefined;
    const backgroundOffset = 0;
    const glyphOffset =
      (Math.floor(textureSize / 2) * textureSize + Math.floor(textureSize / 2)) * 4;
    expect(alphaPixels?.[backgroundOffset]).toBe(0);
    expect(alphaPixels?.[glyphOffset]).toBeGreaterThan(0);
  });

  it("treats white alpha Aurora Lighten particle textures as soft masks", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const textureSize = 4;
    const whiteAlphaPixels = new Uint8Array(textureSize * textureSize * 4);
    for (let index = 0; index < textureSize * textureSize; index += 1) {
      const offset = index * 4;
      const x = index % textureSize;
      const y = Math.floor(index / textureSize);
      const alpha = x === 2 && y === 2 ? 220 : x === 0 && y === 0 ? 0 : 96;
      whiteAlphaPixels[offset] = 255;
      whiteAlphaPixels[offset + 1] = 255;
      whiteAlphaPixels[offset + 2] = 255;
      whiteAlphaPixels[offset + 3] = alpha;
    }
    const particleTexture = new THREE.DataTexture(
      whiteAlphaPixels,
      textureSize,
      textureSize,
      THREE.RGBAFormat
    );
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_vff_gasdispel",
      kind: "placeables",
      name: "VFX: GAS JET, DISPEL",
      resRef: "vff_gasdispel",
      tag: "VFF_GASDISPEL",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX: GAS JET, DISPEL",
          templateId: "plc_vff_gasdispel",
          resref: "vff_gasdispel",
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          auroraEmitter: createSingleTextureAuroraEmitter({
            texture: "fxpa_smoke01",
            blendMode: "Lighten",
            renderMode: "Normal",
            sourceModelFileName: "vff_gasdispel.mdl",
            nodeName: "UPcloud"
          })
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    let smokeMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        smokeMaterial ||
        !(node instanceof THREE.Mesh) ||
        node.userData?.vfxPreviewRole !== "camera-billboard-particle"
      ) {
        return;
      }
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        smokeMaterial = material;
      }
    });

    expect(root?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "soft-alpha-preview-capped"
    );
    expect(root?.userData.auroraEmitterParticleCount).toBe(6);
    expect(smokeMaterial).not.toBeNull();
    expect(smokeMaterial?.userData.auroraSoftAlphaMaskTexture).toBe(true);
    expect(smokeMaterial?.userData.auroraEmitterBlendStatePreviewMode).toBe(
      "aurora-blend-lighten-soft-alpha-adapter"
    );
    expect(smokeMaterial?.userData.auroraVfxSoftAlphaOpacityScale).toBeCloseTo(0.28, 5);
    expect(smokeMaterial?.vertexColors).toBe(false);
    expect(smokeMaterial?.map?.userData.auroraConvertedWhiteAlphaMaskTexture).toBe(true);
    expect(smokeMaterial?.alphaMap?.userData.auroraConvertedWhiteAlphaMaskTexture).toBe(true);
    const visibleMapPixels = smokeMaterial?.map?.image?.data as Uint8Array | undefined;
    const targetPixelOffset = (2 * textureSize + 2) * 4;
    expect(visibleMapPixels?.[targetPixelOffset]).toBe(Math.round(220 * 0.55));
    expect(visibleMapPixels?.[targetPixelOffset + 3]).toBe(220);
  });

  it("does not collapse small Lighten beam flares to the six-particle soft-alpha smoke cap", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const textureSize = 4;
    const whiteAlphaPixels = new Uint8Array(textureSize * textureSize * 4);
    for (let index = 0; index < textureSize * textureSize; index += 1) {
      const offset = index * 4;
      whiteAlphaPixels[offset] = 255;
      whiteAlphaPixels[offset + 1] = 255;
      whiteAlphaPixels[offset + 2] = 255;
      whiteAlphaPixels[offset + 3] = 180;
    }
    const particleTexture = new THREE.DataTexture(
      whiteAlphaPixels,
      textureSize,
      textureSize,
      THREE.RGBAFormat
    );
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_flare.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_phod_fx_beamblu",
      kind: "placeables",
      name: "VFX: Beam: Blue*",
      resRef: "phod_fx_beamblu",
      tag: "PHOD_FX_BEAMBLU",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_phod_fx_beamblu",
          resref: "phod_fx_beamblu",
          placeableName: "VFX: Beam: Blue*",
          textureFileName: "fxpa_flare.tga",
          textureDeliveryUrl: "/assets/fxpa_flare.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_beamblu.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_beamblu.mdl",
                nodeName: "AuroraEmitter01",
                texture: "fxpa_flare",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Lighten",
                atlas: {
                  xGridRaw: 0,
                  yGridRaw: 0,
                  effectiveXGrid: 1,
                  effectiveYGrid: 1,
                  fps: 20,
                  frameStart: 0,
                  frameEnd: 0,
                  random: true
                },
                simulation: {
                  xSize: 20,
                  ySize: 20,
                  spawnType: 0,
                  birthrate: 250,
                  lifeExp: 9,
                  mass: 0,
                  velocity: 10,
                  randvel: 5,
                  spread: 0,
                  blurLength: 0.2,
                  inheritLocal: true,
                  sizeStart: 0.15,
                  sizeEnd: 0.15,
                  sizeStartY: 0,
                  sizeEndY: 0,
                  alphaStart: 1,
                  alphaEnd: 1,
                  colorStart: [0, 0, 1],
                  colorEnd: [0, 0, 1]
                },
                transform: {
                  position: [0, 25, 1.1]
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("camera_billboard");
    expect(root?.userData.vfxPreviewKind).toBe("beam");
    expect(root?.userData.auroraEmitterParticleCountSource).toBe(2250);
    expect(root?.userData.auroraEmitterParticleCountLimit).toBe(256);
    expect(root?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "birthrate-lifetime-preview-capped"
    );
    expect(root?.userData.auroraEmitterParticleCount).toBe(256);
    expect(root?.userData.auroraEmitterSoftAlphaParticleCountPreviewMode).toBeUndefined();
    expect(root?.userData.auroraEmitterSoftAlphaParticleCountSource).toBeUndefined();
    expect(root?.userData.auroraEmitterParticleSizeVisibilityFloorPreviewMode).toBe(
      "camera-beam-visibility-floor"
    );
    expect(root?.userData.auroraEmitterParticleSizeMin).toBeGreaterThan(0.1);

    const particles = collectCameraBillboardParticles(root);
    expect(particles).toHaveLength(256);
    const batches = collectCameraBillboardBatches(root);
    expect(batches).toHaveLength(1);
    const batch = batches[0]!;
    expect(batch.mesh.geometry.userData.auroraParticleBatchVertexCapacity).toBe(1536);
    expect(batch.mesh.geometry.getAttribute("position").count).toBe(1536);
    expect(batch.material.userData.auroraSoftAlphaMaskTexture).toBe(true);
    expect(batch.material.userData.auroraVfxSoftAlphaOpacityScale).toBeCloseTo(0.28, 5);

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(3, 3, 3);
    camera.updateMatrixWorld();
    performanceNow.mockReturnValue(700);
    batch.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      batch.mesh.geometry,
      batch.material,
      null
    );
    expect(batch.mesh.userData.auroraParticleBatchVisibleCount).toBeGreaterThan(16);
    expect(batch.mesh.userData.auroraParticleBatchCopiedSlotCount).toBe(256);
    batch.mesh.geometry.computeBoundingBox();
    expect(batch.mesh.geometry.boundingBox?.max.y).toBeLessThan(1.25);
    expect(batch.mesh.geometry.boundingBox?.max.y).toBeGreaterThan(0.05);
    root?.updateMatrixWorld(true);
    const worldBox = new THREE.Box3()
      .copy(batch.mesh.geometry.boundingBox!)
      .applyMatrix4(batch.mesh.matrixWorld);
    expect(worldBox.max.z).toBeLessThan(1);
    expect(worldBox.min.z).toBeGreaterThan(-1);
    performanceNow.mockRestore();
  });

  it("copies Aurora particleRot billboard roll into camera billboard batch geometry", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_rot_gate.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);
    const object = {
      id: "preview:plc_particle_rot_gate",
      kind: "placeables",
      name: "VFX PARTICLE ROT GATE",
      resRef: "particle_rot_gate",
      tag: "PARTICLE_ROT_GATE",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_particle_rot_gate",
          resref: "particle_rot_gate",
          textureFileName: "fxpa_rot_gate.tga",
          textureDeliveryUrl: "/assets/fxpa_rot_gate.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "particle-rot-source",
                sourceModelFileName: "particle_rot_gate.mdl",
                sourceModelObjectKey: "modules/current/models/particle_rot_gate.mdl",
                nodeName: "particle_rot_emitter",
                texture: "fxpa_rot_gate",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 2,
                  lifeExp: 4,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  particleRot: 0.25,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterParticleRotationRateSource).toBe(0.25);
    expect(root?.userData.auroraEmitterParticleRotationRateRadians).toBeCloseTo(
      Math.PI * 0.5,
      5
    );
    expect(root?.userData.auroraEmitterParticleRotationRatePreviewMode).toBe(
      "aurora-particle-rot-rps-to-radians"
    );
    const particles = collectCameraBillboardParticles(root);
    const batches = collectCameraBillboardBatches(root);
    expect(particles.length).toBeGreaterThan(0);
    expect(batches).toHaveLength(1);

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 5);
    camera.updateMatrixWorld();
    performanceNow.mockReturnValue(1000);
    const batch = batches[0]!;
    batch.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      batch.mesh.geometry,
      batch.material,
      null
    );

    expect(particles[0]?.mesh.userData.auroraParticleBillboardRoll).toBeCloseTo(
      Math.PI * 0.5,
      5
    );
    const positions = batch.mesh.geometry.getAttribute("position");
    expect(positions).toBeInstanceOf(THREE.BufferAttribute);
    const firstVertex = new THREE.Vector3().fromBufferAttribute(
      positions as THREE.BufferAttribute,
      0
    );
    const secondVertex = new THREE.Vector3().fromBufferAttribute(
      positions as THREE.BufferAttribute,
      1
    );
    const firstEdge = secondVertex.sub(firstVertex);
    expect(Math.abs(firstEdge.y)).toBeGreaterThan(Math.abs(firstEdge.x));
    expect(batch.mesh.userData.auroraParticleBatchUpdatePreviewMode).toBe(
      "slot-simulated-contiguous-vertex-buffer-copy"
    );
    performanceNow.mockRestore();
  });

  it("samples Aurora particleRot keyframes when rolling camera billboard batches", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_rot_key_gate.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);
    const object = {
      id: "preview:plc_particle_rot_key_gate",
      kind: "placeables",
      name: "VFX PARTICLE ROT KEY GATE",
      resRef: "particle_rot_key_gate",
      tag: "PARTICLE_ROT_KEY_GATE",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_particle_rot_key_gate",
          resref: "particle_rot_key_gate",
          textureFileName: "fxpa_rot_key_gate.tga",
          textureDeliveryUrl: "/assets/fxpa_rot_key_gate.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "particle-rot-key-source",
                sourceModelFileName: "particle_rot_key_gate.mdl",
                sourceModelObjectKey: "modules/current/models/particle_rot_key_gate.mdl",
                nodeName: "particle_rot_key_emitter",
                texture: "fxpa_rot_key_gate",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 2,
                  lifeExp: 4,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1,
                  timeline: {
                    particleRot: [
                      { time: 0, value: 0 },
                      { time: 1, value: 0.25 },
                      { time: 2, value: 0.25 }
                    ]
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterParticleRotationRateSource).toBeUndefined();
    expect(root?.userData.auroraEmitterParticleRotationRateRadians).toBeUndefined();
    expect(root?.userData.auroraEmitterParticleRotationRatePreviewMode).toBe(
      "aurora-particle-rot-keyframe-rps-to-radians"
    );
    expect(root?.userData.auroraEmitterParticleRotationRateTimelinePreviewMode).toBe(
      "runtime-particle-rot-keyframe-sampled-preview"
    );
    expect(root?.userData.auroraEmitterParticleRotationRateTimeline).toEqual([
      { time: 0, value: 0 },
      { time: 1, value: 0.25 },
      { time: 2, value: 0.25 }
    ]);

    const particles = collectCameraBillboardParticles(root);
    const batches = collectCameraBillboardBatches(root);
    expect(particles.length).toBeGreaterThan(0);
    expect(batches).toHaveLength(1);

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 5);
    camera.updateMatrixWorld();
    performanceNow.mockReturnValue(1000);
    const batch = batches[0]!;
    batch.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      batch.mesh.geometry,
      batch.material,
      null
    );

    expect(particles[0]?.mesh.userData.auroraParticleBillboardRoll).toBeCloseTo(
      Math.PI * 0.5,
      5
    );
    const positions = batch.mesh.geometry.getAttribute("position");
    expect(positions).toBeInstanceOf(THREE.BufferAttribute);
    const firstVertex = new THREE.Vector3().fromBufferAttribute(
      positions as THREE.BufferAttribute,
      0
    );
    const secondVertex = new THREE.Vector3().fromBufferAttribute(
      positions as THREE.BufferAttribute,
      1
    );
    const firstEdge = secondVertex.sub(firstVertex);
    expect(Math.abs(firstEdge.y)).toBeGreaterThan(Math.abs(firstEdge.x));
    performanceNow.mockRestore();
  });

  it("uses Aurora companion alpha textures for split smoke particle maps", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const baseTextureSize = 2;
    const textureSize = 4;
    const basePixels = new Uint8Array(baseTextureSize * baseTextureSize * 4).fill(255);
    const sampledBaseOffset = (1 * baseTextureSize + 1) * 4;
    basePixels[sampledBaseOffset] = 200;
    basePixels[sampledBaseOffset + 1] = 180;
    basePixels[sampledBaseOffset + 2] = 160;
    basePixels[sampledBaseOffset + 3] = 128;
    const alphaPixels = new Uint8Array(textureSize * textureSize * 4);
    for (let index = 0; index < textureSize * textureSize; index += 1) {
      const offset = index * 4;
      const x = index % textureSize;
      const y = Math.floor(index / textureSize);
      const mask = x === 2 && y === 2 ? 220 : 0;
      alphaPixels[offset] = mask;
      alphaPixels[offset + 1] = mask;
      alphaPixels[offset + 2] = mask;
      alphaPixels[offset + 3] = 255;
    }
    const baseTexture = new THREE.DataTexture(
      basePixels,
      baseTextureSize,
      baseTextureSize,
      THREE.RGBAFormat
    );
    const companionTexture = new THREE.DataTexture(
      alphaPixels,
      textureSize,
      textureSize,
      THREE.RGBAFormat
    );
    baseTexture.needsUpdate = true;
    companionTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      baseTexture
    );
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01a.tga",
      companionTexture
    );

    const object = {
      id: "preview:plc_vff_smoke_split_alpha",
      kind: "placeables",
      name: "VFX: Smoke Split Alpha",
      resRef: "vff_smoke_split_alpha",
      tag: "VFF_SMOKE_SPLIT_ALPHA",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const payload = createVfxPayloadWithReadyModel({
      includeTextureContract: true,
      placeableName: "VFX: Smoke Split Alpha",
      templateId: "plc_vff_smoke_split_alpha",
      resref: "vff_smoke_split_alpha",
      textureFileName: "fxpa_smoke01.tga",
      textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
      auroraEmitter: {
        source: "source-mdl",
        diagnostics: [],
        emitters: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "source-model-1",
            sourceModelFileName: "vff_smoke_split_alpha.mdl",
            sourceModelObjectKey: "modules/current/models/vff_smoke_split_alpha.mdl",
            nodeName: "UPcloud",
            texture: "fxpa_smoke01",
            emitterType: "Fountain",
            renderMode: "Normal",
            blendMode: "Lighten",
            simulation: {
              birthrate: 60,
              lifeExp: 1,
              sizeStart: 0.2,
              sizeEnd: 2,
              sizeStartY: 0,
              sizeEndY: 0,
              alphaStart: 1,
              alphaEnd: 0
            }
          }
        ]
      }
    });
    payload.placeable.assetManifest.assets.push({
      assetId: "texture-alpha-1",
      role: "texture",
      fileName: "fxpa_smoke01a.tga"
    });
    payload.assetContracts.assets.push({
      assetId: "texture-alpha-1",
      deliveryUrl: "/assets/fxpa_smoke01a.tga"
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
        [object.id]: payload
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    const smokeEmitterRoot =
      root?.children.find((child) => child.userData?.auroraEmitterNode === "UPcloud") ?? root;
    let smokeMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        smokeMaterial ||
        !(node instanceof THREE.Mesh) ||
        node.userData?.vfxPreviewRole !== "camera-billboard-particle"
      ) {
        return;
      }
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        smokeMaterial = material;
      }
    });

    expect(smokeEmitterRoot?.userData.auroraEmitterAlphaCompanionTexture).toBe("fxpa_smoke01a");
    expect(smokeEmitterRoot?.userData.auroraEmitterAlphaCompanionTextureStatus).toBe("applied");
    expect(smokeEmitterRoot?.userData.auroraEmitterSoftAlphaParticleCountSource).toBe(60);
    expect(smokeEmitterRoot?.userData.auroraEmitterSoftAlphaParticleCountPreviewMode).toBe(
      "soft-alpha-preview-capped"
    );
    expect(smokeEmitterRoot?.userData.auroraEmitterParticleCount).toBe(6);
    expect(smokeEmitterRoot?.userData.auroraEmitterParticleSizeStart).toBeCloseTo(0.2 * 0.24, 5);
    expect(smokeEmitterRoot?.userData.auroraEmitterParticleSizeEnd).toBeCloseTo(2 * 0.24, 5);
    expect(smokeMaterial).not.toBeNull();
    expect(smokeMaterial?.map).not.toBe(baseTexture);
    expect(smokeMaterial?.userData.auroraAlphaCompanionTexture).toBe(true);
    expect(smokeMaterial?.userData.auroraBlackKeyTexture).toBe(false);
    expect(smokeMaterial?.userData.auroraEmitterBlendStatePreviewMode).toBe(
      "aurora-blend-lighten-soft-alpha-adapter"
    );
    expect(smokeMaterial?.vertexColors).toBe(false);
    expect(smokeMaterial?.userData.auroraVfxSoftAlphaOpacityScale).toBeCloseTo(0.28, 5);
    expect(smokeMaterial?.userData.auroraVfxParticleAlphaScale).toBeCloseTo(0.28, 5);
    expect(smokeMaterial?.userData.auroraVfxLightenAlphaMaterialColorPreviewMode).toBe(
      "lighten-material-rgb-scaled-by-particle-alpha"
    );
    expect(smokeMaterial?.blendSrc).toBe(THREE.SrcAlphaFactor);
    expect(smokeMaterial?.blendDst).toBe(THREE.OneMinusSrcAlphaFactor);
    expect(smokeMaterial?.alphaTest).toBeGreaterThanOrEqual(0.01);
    expect(smokeMaterial?.map?.userData.auroraConvertedAlphaCompanionTexture).toBe(true);
    expect(smokeMaterial?.map?.userData.auroraAlphaCompanionColorApplication).toBe(
      "base-rgb-resampled-multiplied-by-alpha-companion"
    );
    expect(smokeMaterial?.alphaMap?.userData.auroraConvertedAlphaCompanionTexture).toBe(true);
    expect(smokeMaterial?.alphaMap?.userData.auroraAlphaCompanionApplication).toBe(
      "source-luminance"
    );
    const visibleMapPixels = smokeMaterial?.map?.image?.data as Uint8Array | undefined;
    const companionMapPixels = smokeMaterial?.alphaMap?.image?.data as Uint8Array | undefined;
    const targetPixelOffset = (2 * textureSize + 2) * 4;
    const expectedCombinedAlpha = Math.round((128 * 220) / 255);
    const expectedSoftAlphaColorScale = 0.55;
    const expectedCompanionColorMask = 220;
    expect(visibleMapPixels?.[0]).toBe(0);
    expect(visibleMapPixels?.[targetPixelOffset]).toBe(
      Math.round((200 * expectedCompanionColorMask * expectedSoftAlphaColorScale) / 255)
    );
    expect(visibleMapPixels?.[targetPixelOffset + 1]).toBe(
      Math.round((180 * expectedCompanionColorMask * expectedSoftAlphaColorScale) / 255)
    );
    expect(visibleMapPixels?.[targetPixelOffset + 2]).toBe(
      Math.round((160 * expectedCompanionColorMask * expectedSoftAlphaColorScale) / 255)
    );
    expect(visibleMapPixels?.[targetPixelOffset + 3]).toBe(expectedCombinedAlpha);
    expect(companionMapPixels?.[0]).toBe(0);
    expect(companionMapPixels?.[targetPixelOffset]).toBe(220);
  });

  it("applies Aurora emitter atlas frames as per-particle quad UVs", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const atlasPixels = new Uint8Array(4 * 4 * 4).fill(255);
    const particleTexture = new THREE.DataTexture(atlasPixels, 4, 4, THREE.RGBAFormat);
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/phod_fx_pntgrm.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_phod_fx_pntgrm2",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "phod_fx_pntgrm2",
      tag: "PHOD_FX_PNTGRM2",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "VFX PREVIEW",
          templateId: "plc_phod_fx_pntgrm2",
          resref: "phod_fx_pntgrm2",
          textureFileName: "phod_fx_pntgrm.tga",
          textureDeliveryUrl: "/assets/phod_fx_pntgrm.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "auroraemitter01",
                texture: "phod_fx_pntgrm",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                atlas: {
                  xGridRaw: 4,
                  yGridRaw: 4,
                  effectiveXGrid: 4,
                  effectiveYGrid: 4,
                  fps: 10,
                  frameStart: 5,
                  frameEnd: 5,
                  random: false
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterAtlas).toMatchObject({
      effectiveXGrid: 4,
      effectiveYGrid: 4,
      frameStart: 5,
      frameEnd: 5
    });
    let atlasMesh: THREE.Mesh | null = null;
    let atlasMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        atlasMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (material instanceof THREE.MeshBasicMaterial) {
          atlasMaterial = material;
        }
      }
    });

    expect(atlasMesh).not.toBeNull();
    expect(atlasMaterial).not.toBeNull();
    expect(atlasMaterial?.map).toBe(particleTexture);
    expect(atlasMaterial?.map?.userData?.auroraAtlasTextureUsesGeometryUv).toBe(true);
    expect(atlasMaterial?.map?.repeat.x).toBeCloseTo(1, 4);
    expect(atlasMaterial?.map?.repeat.y).toBeCloseTo(1, 4);
    expect(atlasMaterial?.map?.offset.x).toBeCloseTo(0, 4);
    expect(atlasMaterial?.map?.offset.y).toBeCloseTo(0, 4);
    expect(atlasMaterial?.userData.auroraAtlasRawFrame).toBe(5);
    expectAuroraAtlasQuadUvs(atlasMesh!, {
      u0: 0.25,
      u1: 0.5,
      v0: 0.5,
      v1: 0.75
    });
    expect(atlasMaterial?.userData.auroraAtlasPreviewMode).toBe(
      "particle-age-vertex-uv-preview"
    );
  });

  it("updates Aurora atlas alpha maps together with black-key texture frames", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const atlasPixels = new Uint8Array(4 * 4 * 4);
    for (let index = 0; index < 16; index += 1) {
      const offset = index * 4;
      const bright = index % 2 === 0 ? 0 : 255;
      atlasPixels[offset] = bright;
      atlasPixels[offset + 1] = bright;
      atlasPixels[offset + 2] = bright;
      atlasPixels[offset + 3] = 255;
    }
    const particleTexture = new THREE.DataTexture(atlasPixels, 4, 4, THREE.RGBAFormat);
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_blackkey_atlas.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_blackkey_atlas",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "blackkey_atlas",
      tag: "BLACKKEY_ATLAS",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_blackkey_atlas",
          resref: "blackkey_atlas",
          textureFileName: "fxpa_blackkey_atlas.tga",
          textureDeliveryUrl: "/assets/fxpa_blackkey_atlas.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "blackkey_atlas.mdl",
                sourceModelObjectKey: "modules/current/models/blackkey_atlas.mdl",
                nodeName: "blackkey_atlas_emitter",
                texture: "fxpa_blackkey_atlas",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Lighten",
                atlas: {
                  xGridRaw: 4,
                  yGridRaw: 4,
                  effectiveXGrid: 4,
                  effectiveYGrid: 4,
                  fps: 4,
                  frameStart: 0,
                  frameEnd: 15,
                  random: false
                },
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    let atlasMesh: THREE.Mesh | null = null;
    let atlasMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        atlasMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!atlasMaterial && material instanceof THREE.MeshBasicMaterial) {
          atlasMaterial = material;
        }
      }
    });

    expect(atlasMesh).not.toBeNull();
    expect(atlasMaterial).not.toBeNull();
    expect(atlasMaterial?.map?.userData.auroraConvertedBlackKeyTexture).toBe(true);
    expect(atlasMaterial?.alphaMap?.userData.auroraConvertedBlackKeyAlphaMap).toBe(true);
    expect(atlasMaterial?.map?.userData.auroraAtlasTextureUsesGeometryUv).toBe(true);
    expect(atlasMaterial?.alphaMap?.userData.auroraAtlasTextureUsesGeometryUv).toBe(true);
    expect(atlasMaterial?.userData.auroraAtlasRawFrame).toBe(0);
    expect(atlasMesh?.geometry.userData.auroraAtlasRawFrame).toBe(0);
    expect(atlasMaterial?.userData.auroraAtlasCheckpointPreviewMode).toBe(
      "per-particle-checkpoint-catch-up-preview"
    );
    expect(atlasMaterial?.userData.auroraAtlasSecondsPerFrame).toBeCloseTo(0.25, 6);
    expect(atlasMaterial?.userData.auroraAtlasCheckpointFrameStep).toBe(0);
    expect(atlasMaterial?.userData.auroraAtlasCheckpointElapsedSeconds).toBe(0);
    expect(atlasMaterial?.userData.auroraAtlasFrameStepIntegerConversionDiagnostic).toBe(
      "VFX_ATLAS_FRAME_STEP_INTEGER_CONVERSION_DIAGNOSTIC"
    );

    performanceNow.mockReturnValue(750);
    atlasMesh?.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      atlasMesh.geometry,
      atlasMaterial!,
      null
    );

    expect(atlasMaterial?.userData.auroraAtlasRawFrame).toBe(3);
    expect(atlasMesh?.geometry.userData.auroraAtlasRawFrame).toBe(3);
    expect(atlasMaterial?.userData.auroraAtlasCheckpointFrameStep).toBe(3);
    expect(atlasMaterial?.userData.auroraAtlasCheckpointElapsedSeconds).toBeCloseTo(0.75, 6);
    expect(atlasMaterial?.userData.auroraAtlasCheckpointCatchUpSteps).toBe(3);
    expect(atlasMesh?.geometry.userData.auroraAtlasCheckpointFrameStep).toBe(3);
    expect(atlasMesh?.geometry.userData.auroraAtlasCheckpointPreviewMode).toBe(
      "per-particle-checkpoint-catch-up-preview"
    );
    expectAuroraAtlasQuadUvs(atlasMesh!, {
      u0: 0.75,
      u1: 1,
      v0: 0.75,
      v1: 1
    });
    expect(atlasMaterial?.map?.offset.x).toBeCloseTo(0, 4);
    expect(atlasMaterial?.alphaMap?.offset.x).toBeCloseTo(0, 4);
    expect(atlasMaterial?.map?.offset.y).toBeCloseTo(0, 4);
    expect(atlasMaterial?.alphaMap?.offset.y).toBeCloseTo(0, 4);
    expect(atlasMaterial?.map?.repeat.x).toBeCloseTo(
      atlasMaterial?.alphaMap?.repeat.x ?? 0,
      4
    );
    expect(atlasMaterial?.map?.repeat.y).toBeCloseTo(
      atlasMaterial?.alphaMap?.repeat.y ?? 0,
      4
    );

    if (atlasMaterial?.alphaMap) {
      atlasMaterial.userData.auroraAtlasRawFrame = 0;
      atlasMaterial.alphaMap.offset.set(0, 0);
    }
    atlasMesh?.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      atlasMesh.geometry,
      atlasMaterial!,
      null
    );

    expect(atlasMaterial?.userData.auroraAtlasRawFrame).toBe(3);
    expect(atlasMesh?.geometry.userData.auroraAtlasRawFrame).toBe(3);
    expect(atlasMaterial?.userData.auroraAtlasCheckpointFrameStep).toBe(3);
    expect(atlasMaterial?.userData.auroraAtlasCheckpointCatchUpSteps).toBe(0);
    expect(atlasMaterial?.alphaMap?.offset.x).toBeCloseTo(0, 4);
    expect(atlasMaterial?.alphaMap?.offset.y).toBeCloseTo(0, 4);
    performanceNow.mockRestore();
  });

  it("uses Aurora random atlas playback as per-step random frames instead of a sequential offset", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const atlasPixels = new Uint8Array(4 * 4 * 4).fill(255);
    const particleTexture = new THREE.DataTexture(atlasPixels, 4, 4, THREE.RGBAFormat);
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_random_atlas.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_random_atlas",
      kind: "placeables",
      name: "VFX PREVIEW",
      resRef: "random_atlas",
      tag: "RANDOM_ATLAS",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_random_atlas",
          resref: "random_atlas",
          textureFileName: "fxpa_random_atlas.tga",
          textureDeliveryUrl: "/assets/fxpa_random_atlas.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "random_atlas.mdl",
                sourceModelObjectKey: "modules/current/models/random_atlas.mdl",
                nodeName: "random_atlas_emitter",
                texture: "fxpa_random_atlas",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                atlas: {
                  xGridRaw: 4,
                  yGridRaw: 4,
                  effectiveXGrid: 4,
                  effectiveYGrid: 4,
                  fps: 4,
                  frameStart: 0,
                  frameEnd: 15,
                  random: true
                },
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    let atlasMesh: THREE.Mesh | null = null;
    let atlasMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        atlasMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!atlasMaterial && material instanceof THREE.MeshBasicMaterial) {
          atlasMaterial = material;
        }
      }
    });

    expect(atlasMesh).not.toBeNull();
    expect(atlasMaterial).not.toBeNull();
    expect(atlasMaterial?.userData.auroraAtlasRawFrame).toBe(10);
    expect(atlasMesh?.geometry.userData.auroraAtlasRawFrame).toBe(10);

    performanceNow.mockReturnValue(750);
    atlasMesh?.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      atlasMesh.geometry,
      atlasMaterial!,
      null
    );

    expect(atlasMaterial?.userData.auroraAtlasRawFrame).toBe(6);
    expect(atlasMesh?.geometry.userData.auroraAtlasRawFrame).toBe(6);
    expectAuroraAtlasQuadUvs(atlasMesh!, {
      u0: 0.5,
      u1: 0.75,
      v0: 0.5,
      v1: 0.75
    });
    expect(atlasMaterial?.map?.offset.x).toBeCloseTo(0, 4);
    expect(atlasMaterial?.map?.offset.y).toBeCloseTo(0, 4);
    expect(atlasMaterial?.userData.auroraAtlasRawFrame).not.toBe(3);
    performanceNow.mockRestore();
  });

  it("samples Aurora fps keyframes when advancing atlas checkpoint frames", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const atlasPixels = new Uint8Array(4 * 4 * 4).fill(255);
    const particleTexture = new THREE.DataTexture(atlasPixels, 4, 4, THREE.RGBAFormat);
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_fps_key_atlas.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_fps_key_atlas",
      kind: "placeables",
      name: "VFX FPS KEY ATLAS",
      resRef: "fps_key_atlas",
      tag: "FPS_KEY_ATLAS",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const fpsTimeline = [
      { time: 0, value: 4 },
      { time: 4, value: 4 }
    ];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_fps_key_atlas",
          resref: "fps_key_atlas",
          textureFileName: "fxpa_fps_key_atlas.tga",
          textureDeliveryUrl: "/assets/fxpa_fps_key_atlas.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "fps_key_atlas.mdl",
                sourceModelObjectKey: "modules/current/models/fps_key_atlas.mdl",
                nodeName: "fps_key_atlas_emitter",
                texture: "fxpa_fps_key_atlas",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                atlas: {
                  xGridRaw: 4,
                  yGridRaw: 4,
                  effectiveXGrid: 4,
                  effectiveYGrid: 4,
                  fps: 1,
                  frameStart: 0,
                  frameEnd: 15,
                  random: false
                },
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1,
                  timeline: {
                    fps: fpsTimeline
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterAtlasFpsTimeline).toEqual(fpsTimeline);
    let atlasMesh: THREE.Mesh | null = null;
    let atlasMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        atlasMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!atlasMaterial && material instanceof THREE.MeshBasicMaterial) {
          atlasMaterial = material;
        }
      }
    });

    performanceNow.mockReturnValue(750);
    atlasMesh?.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      atlasMesh.geometry,
      atlasMaterial!,
      null
    );

    expect(atlasMaterial?.userData.auroraAtlasRawFrame).toBe(3);
    expect(atlasMesh?.geometry.userData.auroraAtlasRawFrame).toBe(3);
    expect(atlasMaterial?.userData.auroraAtlasEvaluatedFps).toBe(4);
    expect(atlasMaterial?.userData.auroraAtlasFpsTimelinePreviewMode).toBe(
      "runtime-fps-keyframe-atlas-checkpoint-preview"
    );
    expect(atlasMaterial?.userData.auroraAtlasSecondsPerFrame).toBeCloseTo(0.25, 6);
    performanceNow.mockRestore();
  });

  it("samples Aurora frameStart and frameEnd keyframes when advancing atlas ranges", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const atlasPixels = new Uint8Array(4 * 4 * 4).fill(255);
    const particleTexture = new THREE.DataTexture(atlasPixels, 4, 4, THREE.RGBAFormat);
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_frame_range_key_atlas.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_frame_range_key_atlas",
      kind: "placeables",
      name: "VFX FRAME RANGE KEY ATLAS",
      resRef: "frame_range_key_atlas",
      tag: "FRAME_RANGE_KEY_ATLAS",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const frameStartTimeline = [
      { time: 0, value: 4 },
      { time: 4, value: 4 }
    ];
    const frameEndTimeline = [
      { time: 0, value: 7 },
      { time: 4, value: 7 }
    ];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_frame_range_key_atlas",
          resref: "frame_range_key_atlas",
          textureFileName: "fxpa_frame_range_key_atlas.tga",
          textureDeliveryUrl: "/assets/fxpa_frame_range_key_atlas.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "frame_range_key_atlas.mdl",
                sourceModelObjectKey: "modules/current/models/frame_range_key_atlas.mdl",
                nodeName: "frame_range_key_atlas_emitter",
                texture: "fxpa_frame_range_key_atlas",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                atlas: {
                  xGridRaw: 4,
                  yGridRaw: 4,
                  effectiveXGrid: 4,
                  effectiveYGrid: 4,
                  fps: 4,
                  frameStart: 0,
                  frameEnd: 15,
                  random: false
                },
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1,
                  timeline: {
                    frameStart: frameStartTimeline,
                    frameEnd: frameEndTimeline
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterAtlasFrameStartTimeline).toEqual(frameStartTimeline);
    expect(root?.userData.auroraEmitterAtlasFrameEndTimeline).toEqual(frameEndTimeline);
    let atlasMesh: THREE.Mesh | null = null;
    let atlasMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        atlasMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!atlasMaterial && material instanceof THREE.MeshBasicMaterial) {
          atlasMaterial = material;
        }
      }
    });

    performanceNow.mockReturnValue(750);
    atlasMesh?.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      atlasMesh.geometry,
      atlasMaterial!,
      null
    );

    expect(atlasMaterial?.userData.auroraAtlasRawFrame).toBe(7);
    expect(atlasMesh?.geometry.userData.auroraAtlasRawFrame).toBe(7);
    expect(atlasMaterial?.userData.auroraAtlasCheckpointFrameStart).toBe(4);
    expect(atlasMaterial?.userData.auroraAtlasCheckpointFrameEnd).toBe(7);
    expect(atlasMaterial?.userData.auroraAtlasCheckpointFrameRange).toBe(4);
    expect(atlasMaterial?.userData.auroraAtlasFrameRangeTimelinePreviewMode).toBe(
      "runtime-frame-range-keyframe-atlas-checkpoint-preview"
    );
    expect(atlasMaterial?.userData.auroraAtlasRawFrame).not.toBe(3);
    performanceNow.mockRestore();
  });

  it("wraps Aurora atlas frame ranges that exceed the texture grid capacity", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const atlasPixels = new Uint8Array(4 * 4 * 4).fill(255);
    const particleTexture = new THREE.DataTexture(atlasPixels, 4, 4, THREE.RGBAFormat);
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_dag_fog_med",
      kind: "placeables",
      name: "VFX: Fog - Medium*",
      resRef: "dag_fog_med",
      tag: "DAG_FOG_MED",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_dag_fog_med",
          resref: "dag_fog_med",
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "dag_fog_med.mdl",
                sourceModelObjectKey: "modules/current/models/dag_fog_med.mdl",
                nodeName: "fire!03",
                texture: "fxpa_smoke01",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                atlas: {
                  xGridRaw: 4,
                  yGridRaw: 4,
                  effectiveXGrid: 4,
                  effectiveYGrid: 4,
                  fps: 10,
                  frameStart: 0,
                  frameEnd: 24,
                  random: false
                },
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    let atlasMesh: THREE.Mesh | null = null;
    let atlasMaterial: THREE.MeshBasicMaterial | null = null;
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        atlasMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!atlasMaterial && material instanceof THREE.MeshBasicMaterial) {
          atlasMaterial = material;
        }
      }
    });

    expect(root?.userData.auroraEmitterAtlas).toMatchObject({
      effectiveXGrid: 4,
      effectiveYGrid: 4,
      frameStart: 0,
      frameEnd: 24,
      frameCapacity: 16
    });
    expect(atlasMesh).not.toBeNull();
    expect(atlasMaterial).not.toBeNull();

    performanceNow.mockReturnValue(1700);
    atlasMesh?.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      atlasMesh.geometry,
      atlasMaterial!,
      null
    );

    expect(atlasMaterial?.userData.auroraAtlasRawFrame).toBe(17);
    expect(atlasMaterial?.userData.auroraAtlasFrame).toBe(1);
    expect(atlasMesh?.geometry.userData.auroraAtlasRawFrame).toBe(17);
    expect(atlasMesh?.geometry.userData.auroraAtlasFrame).toBe(1);
    expectAuroraAtlasQuadUvs(atlasMesh!, {
      u0: 0.25,
      u1: 0.5,
      v0: 0.75,
      v1: 1
    });
    expect(atlasMaterial?.map?.repeat.x).toBeCloseTo(1, 4);
    expect(atlasMaterial?.map?.offset.x).toBeCloseTo(0, 4);
    expect(atlasMaterial?.map?.offset.y).toBeCloseTo(0, 4);
    performanceNow.mockRestore();
  });

  it("uses Aurora emitter simulation fields for particle profile color and density", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1,
      1,
      THREE.RGBAFormat
    );
    particleTexture.needsUpdate = true;
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_cot_fx01",
      kind: "placeables",
      name: "VFX: Smoke, Red*",
      resRef: "cot_fx01",
      tag: "COT_FX01",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "cot_fx01.mdl",
                sourceModelObjectKey: "modules/current/models/cot_fx01.mdl",
                nodeName: "fire!03",
                texture: "fxpa_smoke01",
                emitterType: "Fountain",
                renderMode: "Billboard_to_World_Z",
                blendMode: "Normal",
                atlas: {
                  xGridRaw: 4,
                  yGridRaw: 4,
                  effectiveXGrid: 4,
                  effectiveYGrid: 4,
                  fps: 10,
                  frameStart: 0,
                  frameEnd: 15,
                  random: false
                },
                simulation: {
                  xSize: 60,
                  ySize: 40,
                  spawnType: 0,
                  birthrate: 5,
                  lifeExp: 5,
                  mass: -0.75,
                  velocity: 0.5,
                  randvel: 0.4,
                  spread: 1.0472,
                  particleRot: 0.2,
                  bounce: true,
                  bounceCoefficient: 0.35,
                  blurLength: 1.2,
                  deadspace: 0.25,
                  p2p: true,
                  p2pType: "2",
                  grav: 0.8,
                  drag: 0.3,
                  threshold: 0.4,
                  inherit: true,
                  inheritVel: false,
                  inheritLocal: true,
                  inheritPart: true,
                  sizeStart: 1,
                  sizeMid: 4,
                  sizeEnd: 6,
                  sizeStartY: 0.5,
                  sizeMidY: 2,
                  sizeEndY: 0.75,
                  alphaStart: 0.5,
                  alphaMid: 0.85,
                  alphaEnd: 0,
                  colorStart: [0.392157, 0, 0],
                  colorMid: [0.5, 0.25, 0],
                  colorEnd: [0.184314, 0, 0],
                  percentStart: 0.1,
                  percentMid: 0.6,
                  percentEnd: 0.9
                },
                transform: {
                  position: [0.0466596, -0.126434, 0.0124961],
                  positionTimeline: [
                    { time: 0, value: [0.0466596, -0.126434, 0.0124961] },
                    { time: 1, value: [0.1466596, -0.026434, 0.1124961] }
                  ],
                  orientation: {
                    axis: [1, 0, 0],
                    angleRadians: -1.42244
                  },
                  orientationTimeline: [
                    {
                      time: 0,
                      value: { axis: [1, 0, 0], angleRadians: -1.42244 }
                    },
                    {
                      time: 1,
                      value: { axis: [1, 0, 0], angleRadians: -0.71122 }
                    }
                  ],
                  scale: 1.5,
                  scaleTimeline: [
                    { time: 0, value: 1.5 },
                    { time: 1, value: 2 }
                  ]
                },
                sourceState: {
                  renderOrder: -3,
                  transparency: true,
                  twoSidedTexture: true,
                  sampleFramebuffer: 2,
                  volumetric: true,
                  loop: false
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterSimulation).toMatchObject({
      xSize: 60,
      ySize: 40,
      spawnType: 0,
      birthrate: 5,
      lifeExp: 5,
      mass: -0.75,
      velocity: 0.5,
      randvel: 0.4,
      particleRot: 0.2,
      bounce: true,
      bounceCoefficient: 0.35,
      blurLength: 1.2,
      deadspace: 0.25,
      p2p: true,
      p2pType: "2",
      grav: 0.8,
      drag: 0.3,
      threshold: 0.4,
      inherit: true,
      inheritVel: false,
      inheritLocal: true,
      inheritPart: true,
      sizeMid: 4,
      sizeMidY: 2,
      alphaMid: 0.85,
      colorMid: [0.5, 0.25, 0],
      percentStart: 0.1,
      percentMid: 0.6,
      percentEnd: 0.9
    });
    expect(root?.userData.auroraEmitterSimulationPreviewMode).toBe(
      "profile-parameter-preview"
    );
    expect(root?.userData.auroraEmitterTransform).toMatchObject({
      position: [0.0466596, -0.126434, 0.0124961],
      positionTimeline: [
        { time: 0, value: [0.0466596, -0.126434, 0.0124961] },
        { time: 1, value: [0.1466596, -0.026434, 0.1124961] }
      ],
      orientation: {
        axis: [1, 0, 0],
        angleRadians: -1.42244
      },
      orientationTimeline: [
        {
          time: 0,
          value: { axis: [1, 0, 0], angleRadians: -1.42244 }
        },
        {
          time: 1,
          value: { axis: [1, 0, 0], angleRadians: -0.71122 }
        }
      ],
      scale: 1.5,
      scaleTimeline: [
        { time: 0, value: 1.5 },
        { time: 1, value: 2 }
      ]
    });
    const emitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "fire!03"
    );
    expect(emitterRoot?.userData.auroraEmitterTransformPreviewMode).toBe(
      "node-transform-preview"
    );
    expect(emitterRoot?.scale.x).toBeCloseTo(1.5, 5);
    expect(emitterRoot?.scale.y).toBeCloseTo(1.5, 5);
    expect(emitterRoot?.scale.z).toBeCloseTo(1.5, 5);
    expect(emitterRoot?.userData.auroraEmitterTransformScale).toBe(1.5);
    expect(emitterRoot?.userData.auroraEmitterTransformScalePreviewMode).toBe(
      "node-scale-keyframe-preview"
    );
    expect(emitterRoot?.userData.auroraEmitterTransformScaleTimeline).toEqual([
      { time: 0, value: 1.5 },
      { time: 1, value: 2 }
    ]);
    expect(emitterRoot?.userData.auroraEmitterTransformScaleTimelinePreviewMode).toBe(
      "runtime-scale-keyframe-sampled-preview"
    );
    expect(emitterRoot?.userData.auroraEmitterTransformScaleTimelineSamplerPreviewMode).toBe(
      "renderable-child-on-before-render-root-scale-sampler"
    );
    expect(emitterRoot?.userData.auroraEmitterTransformPositionTimeline).toEqual([
      { time: 0, value: [0.0466596, -0.126434, 0.0124961] },
      { time: 1, value: [0.1466596, -0.026434, 0.1124961] }
    ]);
    expect(emitterRoot?.userData.auroraEmitterTransformPositionTimelinePreviewMode).toBe(
      "runtime-position-keyframe-sampled-preview"
    );
    expect(emitterRoot?.userData.auroraEmitterTransformPositionTimelineSamplerPreviewMode).toBe(
      "renderable-child-on-before-render-root-position-sampler"
    );
    expect(emitterRoot?.userData.auroraEmitterTransformOrientationTimeline).toEqual([
      {
        time: 0,
        value: { axis: [1, 0, 0], angleRadians: -1.42244 }
      },
      {
        time: 1,
        value: { axis: [1, 0, 0], angleRadians: -0.71122 }
      }
    ]);
    expect(emitterRoot?.userData.auroraEmitterTransformOrientationTimelinePreviewMode).toBe(
      "runtime-orientation-keyframe-slerp-preview"
    );
    expect(emitterRoot?.userData.auroraEmitterTransformOrientationTimelineSamplerPreviewMode).toBe(
      "renderable-child-on-before-render-root-orientation-sampler"
    );
    const renderableChild = emitterRoot?.children.find((child) => child instanceof THREE.Mesh);
    expect(renderableChild).toBeDefined();
    performanceNow.mockReturnValue(500);
    if (renderableChild instanceof THREE.Mesh) {
      const material = Array.isArray(renderableChild.material)
        ? renderableChild.material[0]
        : renderableChild.material;
      renderableChild.onBeforeRender(
        {} as THREE.WebGLRenderer,
        new THREE.Scene(),
        new THREE.PerspectiveCamera(),
        renderableChild.geometry,
        material,
        emitterRoot as THREE.Group
      );
    }
    expect(emitterRoot?.scale.x).toBeCloseTo(1.75, 5);
    expect(emitterRoot?.scale.y).toBeCloseTo(1.75, 5);
    expect(emitterRoot?.scale.z).toBeCloseTo(1.75, 5);
    expect(emitterRoot?.userData.auroraEmitterTransformScale).toBeCloseTo(1.75, 5);
    expect(
      emitterRoot?.userData.auroraEmitterTransformScaleTimelineSampleSeconds
    ).toBeCloseTo(0.5, 5);
    expect(
      emitterRoot?.userData.auroraEmitterTransformPositionTimelineSampleSeconds
    ).toBeCloseTo(0.5, 5);
    expect(
      emitterRoot?.userData.auroraEmitterTransformOrientationTimelineSampleSeconds
    ).toBeCloseTo(0.5, 5);
    const expectedOrientation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -1.06683
    );
    expect(emitterRoot?.quaternion.x).toBeCloseTo(expectedOrientation.x, 5);
    expect(emitterRoot?.quaternion.y).toBeCloseTo(expectedOrientation.y, 5);
    expect(emitterRoot?.quaternion.z).toBeCloseTo(expectedOrientation.z, 5);
    expect(emitterRoot?.quaternion.w).toBeCloseTo(expectedOrientation.w, 5);
    const unitScale = emitterRoot?.userData.auroraEmitterTransformUnitScale ?? 0;
    expect(emitterRoot?.position.x).toBeCloseTo(0.0966596 * unitScale, 5);
    expect(emitterRoot?.position.y).toBeCloseTo(0.0624961 * unitScale, 5);
    expect(emitterRoot?.position.z).toBeCloseTo(-0.076434 * unitScale, 5);
    expect(emitterRoot?.userData.auroraEmitterSurfacePreviewMode).toBe(
      "xsize-ysize-spawn-rectangle-preview"
    );
    expect(emitterRoot?.userData.auroraEmitterSpawnType).toBe(0);
    expect(emitterRoot?.userData.auroraEmitterSpawnTypePreviewMode).toBe(
      "normal-spawn-type-preserved"
    );
    expect(emitterRoot?.userData.auroraEmitterSourceStatePreviewMode).toBe(
      "source-state-preserved"
    );
    expect(emitterRoot?.userData.auroraEmitterRenderOrder).toBe(-3);
    expect(emitterRoot?.userData.auroraEmitterTransparency).toBe(true);
    expect(emitterRoot?.userData.auroraEmitterTransparencyPreviewMode).toBe(
      "source-transparency-flag-preserved"
    );
    expect(emitterRoot?.userData.auroraEmitterTwoSidedTexture).toBe(true);
    expect(emitterRoot?.userData.auroraEmitterSampleFramebuffer).toBe(2);
    expect(emitterRoot?.userData.auroraEmitterSampleFramebufferPreviewMode).toBe(
      "source-sample-framebuffer-int-preserved"
    );
    expect(emitterRoot?.userData.auroraEmitterVolumetric).toBe(true);
    expect(emitterRoot?.userData.auroraEmitterVolumetricPreviewMode).toBe(
      "source-volumetric-flag-preserved"
    );
    expect(emitterRoot?.userData.auroraEmitterFramebufferRenderLane).toBe(6);
    expect(emitterRoot?.userData.auroraEmitterFramebufferRenderLanePreviewMode).toBe(
      "aurora-source-sample-framebuffer-mode2-render-lane"
    );
    expect(emitterRoot?.userData.auroraEmitterFramebufferRenderLaneSource).toBe(
      "sample_framebuffer"
    );
    expect(emitterRoot?.userData.auroraEmitterFramebufferRenderLaneDiagnostics).toEqual([
      "VFX_SAMPLE_FRAMEBUFFER_MODE2_RUNTIME_LANE_6_REQUIRED",
      "VFX_SAMPLE_FRAMEBUFFER_RENDER_LANE_CAPTURE_REQUIRED"
    ]);
    expect(emitterRoot?.userData.auroraEmitterLoop).toBe(false);
    expect(emitterRoot?.userData.auroraEmitterParticleRotationRateSource).toBeCloseTo(0.2, 5);
    expect(emitterRoot?.userData.auroraEmitterParticleRotationRateRadians).toBeCloseTo(
      0.2 * Math.PI * 2,
      5
    );
    expect(emitterRoot?.userData.auroraEmitterParticleRotationRatePreviewMode).toBe(
      "aurora-particle-rot-rps-to-radians"
    );
    expect(emitterRoot?.userData.auroraEmitterPhysicsPreviewMode).toBe(
      "aurora-source-motion-fields-preview"
    );
    expect(emitterRoot?.userData.auroraEmitterGravityBias).toBeUndefined();
    expect(emitterRoot?.userData.auroraEmitterParticleAccelerationY).toBeCloseTo(0.00375, 5);
    expect(emitterRoot?.userData.auroraEmitterDragDamping).toBeUndefined();
    expect(emitterRoot?.userData.auroraEmitterBlurStretch).toBeUndefined();
    expect(emitterRoot?.userData.auroraEmitterInherit).toBe(true);
    expect(emitterRoot?.userData.auroraEmitterInheritVelocity).toBe(false);
    expect(emitterRoot?.userData.auroraEmitterInheritLocal).toBe(true);
    expect(emitterRoot?.userData.auroraEmitterInheritParticle).toBe(true);
    expect(emitterRoot?.userData.auroraEmitterInheritPreviewMode).toBe(
      "source-inherit-flags-preserved"
    );
    expect(emitterRoot?.userData.auroraEmitterInheritParticlePreviewMode).toBe(
      "inherit-particle-requires-inherit-velocity"
    );
    expect(emitterRoot?.userData.auroraEmitterInheritDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_INHERIT_PARTICLE_STRETCH_REQUIRES_INHERITVEL",
        "VFX_INHERIT_PARTICLE_SOURCE_FLAG_PRESERVED_NO_STRETCH"
      ])
    );
    expect(emitterRoot?.userData.auroraEmitterDeadspaceDegrees).toBeCloseTo(0.25, 5);
    expect(emitterRoot?.userData.auroraEmitterDeadspaceAngleRadians).toBeCloseTo(
      THREE.MathUtils.degToRad(0.25),
      5
    );
    expect(emitterRoot?.userData.auroraEmitterDeadspacePreviewMode).toBe(
      "view-direction-deadspace-angle-preview"
    );
    expect(emitterRoot?.userData.auroraEmitterBounceFactor).toBeCloseTo(0.35, 5);
    expect(emitterRoot?.userData.auroraEmitterBounceCoefficient).toBeCloseTo(0.35, 5);
    expect(emitterRoot?.userData.auroraEmitterBouncePreviewMode).toBe(
      "source-bounce-floor-plane-preview"
    );
    expect(emitterRoot?.userData.auroraEmitterBounceDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_PARTICLE_BOUNCE_FLOOR_PLANE_PREVIEW",
        "VFX_PARTICLE_COLLISION_CONTEXT_REQUIRED"
      ])
    );
    expect(emitterRoot?.userData.auroraEmitterP2PPreviewMode).toBe("preserved-unmapped");
    expect(emitterRoot?.userData.auroraEmitterP2PReferencePreviewMode).toBe(
      "target-reference-required"
    );
    expect(emitterRoot?.userData.auroraEmitterP2PDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_P2P_TARGET_RUNTIME_POINTER_REQUIRED",
        "VFX_P2P_TARGET_ORIGIN_FALLBACK_FORBIDDEN",
        "VFX_P2P_GRAV_TARGET_ENDPOINT_REQUIRED",
        "VFX_P2P_DRAG_TIME_EXPONENT_REQUIRED"
      ])
    );
    expect(emitterRoot?.userData.auroraEmitterSurfaceWidth).toBeCloseTo(0.3, 5);
    expect(emitterRoot?.userData.auroraEmitterSurfaceDepth).toBeCloseTo(0.2, 5);
    expect(emitterRoot?.userData.auroraEmitterParticleSizeStart).toBeCloseTo(0.5, 5);
    expect(emitterRoot?.userData.auroraEmitterParticleSizeMid).toBeCloseTo(2, 5);
    expect(emitterRoot?.userData.auroraEmitterParticleSizeEnd).toBeCloseTo(2.88, 5);
    expect(emitterRoot?.userData.auroraEmitterParticleSizeYStart).toBeCloseTo(0.25, 5);
    expect(emitterRoot?.userData.auroraEmitterParticleSizeYMid).toBeCloseTo(1, 5);
    expect(emitterRoot?.userData.auroraEmitterParticleSizeYEnd).toBeCloseTo(0.375, 5);
    expect(emitterRoot?.userData.auroraEmitterParticleColorStart).toEqual([0.392157, 0, 0]);
    expect(emitterRoot?.userData.auroraEmitterParticleColorMid).toEqual([0.5, 0.25, 0]);
    expect(emitterRoot?.userData.auroraEmitterParticleColorEnd).toEqual([0.184314, 0, 0]);
    expect(emitterRoot?.userData.auroraEmitterParticlePercentStart).toBeCloseTo(0.1, 5);
    expect(emitterRoot?.userData.auroraEmitterParticlePercentMid).toBeCloseTo(0.6, 5);
    expect(emitterRoot?.userData.auroraEmitterParticlePercentEnd).toBeCloseTo(0.9, 5);
    expect(emitterRoot?.userData.auroraEmitterParticleInterpolationPreviewMode).toBe(
      "particle-color-alpha-size-linear-start-end"
    );
    expect(emitterRoot?.userData.auroraEmitterMidCurveSourcePreviewMode).toBe(
      "particle-mid-runtime-curve-preview"
    );
    expect(emitterRoot?.userData.auroraEmitterPercentCurvePreviewMode).toBe(
      "particle-percent-runtime-curve-preview"
    );
    expect(emitterRoot?.position.x).toBeCloseTo(0.0966596 * unitScale, 5);
    expect(emitterRoot?.position.y).toBeCloseTo(0.0624961 * unitScale, 5);
    expect(emitterRoot?.position.z).toBeCloseTo(-0.076434 * unitScale, 5);
    expect(emitterRoot?.quaternion.w).not.toBeCloseTo(1, 5);

    const billboardMaterials: THREE.MeshBasicMaterial[] = [];
    const billboardMeshes: THREE.Mesh[] = [];
    root?.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        node.userData?.vfxPreviewRole === "world-z-ground-billboard"
      ) {
        billboardMeshes.push(node);
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (material instanceof THREE.MeshBasicMaterial) {
          billboardMaterials.push(material);
        }
      }
    });

    expect(billboardMaterials).toHaveLength(25);
    expect(
      billboardMeshes.every(
        (mesh) => Math.abs(mesh.position.x) <= 0.15 && Math.abs(mesh.position.z) <= 0.1
      )
    ).toBe(true);
    expect(billboardMaterials[0]?.vertexColors).toBe(true);
    expectAuroraVertexColorHex(billboardMeshes[0]!, "640000");
    expect(billboardMaterials[0]?.opacity).toBeCloseTo(0.5, 4);
    expect(readFirstAuroraVertexAlpha(billboardMeshes[0]!)).toBeCloseTo(0.5, 4);
    expect(billboardMaterials[0]?.userData.auroraAtlasPreviewMode).toBe(
      "particle-age-vertex-uv-preview"
    );

    performanceNow.mockReturnValue(2500);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(4, 4, 4);
    camera.updateMatrixWorld();
    root?.updateMatrixWorld(true);
    const initialScale = billboardMeshes[0]?.scale.x ?? 0;
    billboardMeshes[0]?.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      billboardMeshes[0].geometry,
      billboardMaterials[0]!,
      null
    );

    expect(billboardMaterials[0]?.opacity).toBeCloseTo(0.78, 4);
    expect(readFirstAuroraVertexAlpha(billboardMeshes[0]!)).toBeCloseTo(0.78, 4);
    expectAuroraVertexColorHex(billboardMeshes[0]!, "7a3300");
    expect(billboardMeshes[0]?.scale.x).toBeGreaterThan(initialScale);
    expect(billboardMeshes[0]?.rotation.z).toBeCloseTo(Math.PI, 4);
    expect(billboardMaterials[0]?.userData.auroraAtlasPreviewMode).toBe(
      "particle-age-vertex-uv-preview"
    );
    expect(billboardMaterials[0]?.userData.auroraAtlasParticleAgeSeconds).toBeCloseTo(2.5, 4);
    expect(billboardMaterials[0]?.userData.auroraAtlasRawFrame).toBe(9);
    expectAuroraAtlasQuadUvs(billboardMeshes[0]!, {
      u0: 0.25,
      u1: 0.5,
      v0: 0.25,
      v1: 0.5
    });
    performanceNow.mockRestore();
  });

  it("applies Aurora bounce coefficient as a floor-plane particle reflection preview", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_bounce_symbol.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_bounce_vfx",
      kind: "placeables",
      name: "VFX: Bounce Preview",
      resRef: "bounce_vfx",
      tag: "BOUNCE_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_bounce_vfx",
          resref: "bounce_vfx",
          textureFileName: "fx_bounce_symbol.tga",
          textureDeliveryUrl: "/assets/fx_bounce_symbol.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "bounce_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/bounce_vfx.mdl",
                nodeName: "bouncing_symbol",
                texture: "fx_bounce_symbol",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  xSize: 20,
                  ySize: 20,
                  birthrate: 4,
                  lifeExp: 2,
                  velocity: -1,
                  randvel: 0,
                  spread: 0,
                  bounce: true,
                  bounceCoefficient: 0.4,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    const emitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "bouncing_symbol"
    );
    expect(emitterRoot?.userData.auroraEmitterBounceFactor).toBeCloseTo(0.4, 5);
    expect(emitterRoot?.userData.auroraEmitterBouncePreviewMode).toBe(
      "source-bounce-floor-plane-preview"
    );
    expect(emitterRoot?.userData.auroraEmitterBounceDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_PARTICLE_BOUNCE_FLOOR_PLANE_PREVIEW",
        "VFX_PARTICLE_COLLISION_CONTEXT_REQUIRED"
      ])
    );

    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    const particle = particles[0]!;
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 5, 5);
    const baseLift =
      typeof emitterRoot?.userData.auroraEmitterBaseLift === "number"
        ? emitterRoot.userData.auroraEmitterBaseLift
        : 0;

    performanceNow.mockReturnValue(1000);
    particle.mesh.onBeforeRender(
      null as never,
      null as never,
      camera,
      particle.mesh.geometry,
      particle.material,
      null
    );

    expect(particle.mesh.position.y).toBeGreaterThanOrEqual(baseLift);
    expect(particle.mesh.position.y - baseLift).toBeGreaterThan(0);
    performanceNow.mockRestore();
  });

  it("samples Aurora bounce coefficient keyframes for floor-plane particle reflection", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_bounce_key_symbol.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_bounce_key_vfx",
      kind: "placeables",
      name: "VFX: Bounce Key Preview",
      resRef: "bounce_key_vfx",
      tag: "BOUNCE_KEY_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const bounceTimeline = [
      { time: 0, value: 0.2 },
      { time: 2, value: 0.2 }
    ];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_bounce_key_vfx",
          resref: "bounce_key_vfx",
          textureFileName: "fx_bounce_key_symbol.tga",
          textureDeliveryUrl: "/assets/fx_bounce_key_symbol.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "bounce_key_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/bounce_key_vfx.mdl",
                nodeName: "bouncing_key_symbol",
                texture: "fx_bounce_key_symbol",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  xSize: 20,
                  ySize: 20,
                  birthrate: 4,
                  lifeExp: 2,
                  velocity: -1,
                  randvel: 0,
                  spread: 0,
                  bounce: true,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1,
                  timeline: {
                    bounceCoefficient: bounceTimeline
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    const emitterRoot = root?.children.find(
      (child) => child.userData?.auroraEmitterNode === "bouncing_key_symbol"
    );
    expect(emitterRoot?.userData.auroraEmitterBounceCoefficient).toBeUndefined();
    expect(emitterRoot?.userData.auroraEmitterBounceCoefficientTimeline).toEqual(bounceTimeline);
    expect(emitterRoot?.userData.auroraEmitterBounceCoefficientTimelinePreviewMode).toBe(
      "runtime-bounce-coefficient-keyframe-preview"
    );

    const particle = collectCameraBillboardParticles(root)[0]!;
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 5, 5);
    const baseLift =
      typeof emitterRoot?.userData.auroraEmitterBaseLift === "number"
        ? emitterRoot.userData.auroraEmitterBaseLift
        : 0;

    performanceNow.mockReturnValue(1000);
    particle.mesh.onBeforeRender(
      null as never,
      null as never,
      camera,
      particle.mesh.geometry,
      particle.material,
      null
    );

    expect(particle.mesh.position.y - baseLift).toBeGreaterThan(0.0005);
    expect(particle.mesh.position.y - baseLift).toBeLessThan(0.0035);
    performanceNow.mockRestore();
  });

  it("preserves P2P grav and drag without mapping them to global preview physics", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fx_p2p.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_p2p_vfx",
      kind: "placeables",
      name: "P2P VFX PREVIEW",
      resRef: "p2p_vfx",
      tag: "P2P_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          placeableName: "P2P VFX PREVIEW",
          templateId: "plc_p2p_vfx",
          resref: "p2p_vfx",
          textureFileName: "fx_p2p.tga",
          textureDeliveryUrl: "/assets/fx_p2p.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "p2p_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/p2p_vfx.mdl",
                nodeName: "p2p_gravity_target_required",
                texture: "fx_p2p",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 2,
                  lifeExp: 3,
                  p2p: true,
                  p2pType: "gravity",
                  grav: 2.5,
                  drag: 0.75,
                  threshold: 1.25
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterP2PPreviewMode).toBe("preserved-unmapped");
    expect(root?.userData.auroraEmitterP2PReferencePreviewMode).toBe(
      "target-reference-required"
    );
    expect(root?.userData.auroraEmitterParticleAccelerationY).toBeUndefined();
    expect(root?.userData.auroraEmitterDragDamping).toBeUndefined();
    expect(root?.userData.auroraEmitterP2PDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_P2P_TARGET_RUNTIME_POINTER_REQUIRED",
        "VFX_P2P_TARGET_ORIGIN_FALLBACK_FORBIDDEN",
        "VFX_P2P_GRAV_TARGET_ENDPOINT_REQUIRED",
        "VFX_P2P_DRAG_TIME_EXPONENT_REQUIRED"
      ])
    );
  });

  it("integrates Aurora emitter velocity and spread for camera billboard particle motion", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_velocity_vfx",
      kind: "placeables",
      name: "VFX VELOCITY",
      resRef: "velocity_vfx",
      tag: "VELOCITY_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_velocity_vfx",
          resref: "velocity_vfx",
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "velocity_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/velocity_vfx.mdl",
                nodeName: "velocity_emitter",
                texture: "fxpa_smoke01",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  velocity: 2,
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
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterParticleVelocity).toBeCloseTo(0.01, 5);
    expect(root?.userData.auroraEmitterParticleSpreadRadians).toBe(0);
    expect(root?.userData.auroraEmitterKinematicsPreviewMode).toBe(
      "velocity-spread-integrated-preview"
    );

    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    const particle = particles[0]!;
    expectAuroraCameraBillboardQuad(particle.mesh);
    const initialY = particle.mesh.position.y;
    const initialX = particle.mesh.position.x;
    const initialZ = particle.mesh.position.z;

    performanceNow.mockReturnValue(3000);
    const camera = new THREE.PerspectiveCamera();
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      particle.mesh.geometry,
      particle.material,
      null
    );

    expect(particle.mesh.position.y - initialY).toBeGreaterThan(0.017);
    expect(particle.mesh.position.y - initialY).toBeLessThan(0.025);
    expect(particle.mesh.position.x).toBeCloseTo(initialX, 5);
    expect(particle.mesh.position.z).toBeCloseTo(initialZ, 5);
    expect(particle.mesh.userData.auroraParticleBasisPreviewMode).toBe(
      "aurora-render-normal-camera-billboard-basis"
    );
    performanceNow.mockRestore();
  });

  it("samples Aurora velocity and spread keyframes for camera billboard particle motion", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_velocity_key_vfx",
      kind: "placeables",
      name: "VFX VELOCITY KEY",
      resRef: "velocity_key_vfx",
      tag: "VELOCITY_KEY_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);
    const velocityTimeline = [
      { time: 0, value: 0 },
      { time: 4, value: 4 }
    ];
    const spreadTimeline = [
      { time: 0, value: 0 },
      { time: 4, value: 90 }
    ];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_velocity_key_vfx",
          resref: "velocity_key_vfx",
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "velocity_key_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/velocity_key_vfx.mdl",
                nodeName: "velocity_key_emitter",
                texture: "fxpa_smoke01",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1,
                  timeline: {
                    velocity: velocityTimeline,
                    spread: spreadTimeline
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterParticleVelocity).toBeUndefined();
    expect(root?.userData.auroraEmitterParticleVelocityTimeline).toEqual(velocityTimeline);
    expect(root?.userData.auroraEmitterParticleSpreadTimeline).toEqual(spreadTimeline);
    expect(root?.userData.auroraEmitterKinematicTimelinePreviewMode).toBe(
      "runtime-velocity-randvel-spread-keyframe-sampled-preview"
    );
    expect(root?.userData.auroraEmitterKinematicsPreviewMode).toBe(
      "velocity-spread-integrated-preview"
    );

    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    const particle = particles[0]!;
    const initialY = particle.mesh.position.y;
    const initialX = particle.mesh.position.x;
    const initialZ = particle.mesh.position.z;

    performanceNow.mockReturnValue(3000);
    const camera = new THREE.PerspectiveCamera();
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      particle.mesh.geometry,
      particle.material,
      null
    );

    expect(particle.mesh.position.y - initialY).toBeGreaterThan(0.012);
    expect(particle.mesh.position.y - initialY).toBeLessThan(0.06);
    const horizontalTravel = Math.hypot(
      particle.mesh.position.x - initialX,
      particle.mesh.position.z - initialZ
    );
    expect(horizontalTravel).toBeGreaterThan(0.001);
    performanceNow.mockRestore();
  });

  it("samples Aurora mass keyframes as particle acceleration for camera billboard motion", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_mass_key_vfx",
      kind: "placeables",
      name: "VFX MASS KEY",
      resRef: "mass_key_vfx",
      tag: "MASS_KEY_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);
    const massTimeline = [
      { time: 0, value: 0 },
      { time: 4, value: 4 }
    ];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_mass_key_vfx",
          resref: "mass_key_vfx",
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "mass_key_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/mass_key_vfx.mdl",
                nodeName: "mass_key_emitter",
                texture: "fxpa_smoke01",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1,
                  timeline: {
                    mass: massTimeline
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterParticleAccelerationY).toBeUndefined();
    expect(root?.userData.auroraEmitterParticleMassTimeline).toEqual(massTimeline);
    expect(root?.userData.auroraEmitterParticleAccelerationYTimelinePreviewMode).toBe(
      "runtime-mass-keyframe-acceleration-preview"
    );
    expect(root?.userData.auroraEmitterKinematicsPreviewMode).toBe(
      "velocity-spread-integrated-preview"
    );
    expect(root?.userData.auroraEmitterPhysicsPreviewMode).toBe(
      "aurora-source-motion-fields-preview"
    );

    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    const particle = particles[0]!;
    const initialY = particle.mesh.position.y;
    const initialX = particle.mesh.position.x;
    const initialZ = particle.mesh.position.z;

    performanceNow.mockReturnValue(3000);
    const camera = new THREE.PerspectiveCamera();
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      particle.mesh.geometry,
      particle.material,
      null
    );

    expect(initialY - particle.mesh.position.y).toBeGreaterThan(0.015);
    expect(initialY - particle.mesh.position.y).toBeLessThan(0.04);
    expect(particle.mesh.position.x).toBeCloseTo(initialX, 5);
    expect(particle.mesh.position.z).toBeCloseTo(initialZ, 5);
    performanceNow.mockRestore();
  });

  it("applies Aurora randvel as a 0.01-gated signed speed term, not positive-only jitter", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_randvel_vfx",
      kind: "placeables",
      name: "VFX RANDVEL",
      resRef: "randvel_vfx",
      tag: "RANDVEL_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_randvel_vfx",
          resref: "randvel_vfx",
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "randvel_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/randvel_vfx.mdl",
                nodeName: "randvel_emitter",
                texture: "fxpa_smoke01",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  velocity: 0,
                  randvel: 200,
                  spread: 0,
                  sizeStart: 1,
                  sizeEnd: 1,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterParticleVelocity).toBe(0);
    expect(root?.userData.auroraEmitterParticleRandomVelocity).toBeCloseTo(1, 5);
    expect(root?.userData.auroraEmitterRandvelGate).toBeCloseTo(0.01, 5);
    expect(root?.userData.auroraEmitterRandvelPreviewMode).toBe(
      "signed-speed-term-gated-0.01"
    );
    expect(root?.userData.auroraEmitterRandvelDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_EMITTER_RANDVEL_GATE_001_REQUIRED",
        "VFX_EMITTER_RANDVEL_SIGNED_SPEED_TERM_REQUIRED",
        "VFX_EMITTER_RANDVEL_RANDOM_TERM_DIAGNOSTIC"
      ])
    );
    expect(root?.userData.auroraEmitterRandvelDiagnostics).not.toContain(
      "VFX_POC_RANDVEL_UNSIGNED_JITTER_PREVIEW_ONLY"
    );

    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    const maxInitialParticleY = Math.max(...particles.map(({ mesh }) => mesh.position.y));
    expect(maxInitialParticleY).toBeLessThan(0.75);
    const particle = particles[0]!;
    expectAuroraCameraBillboardQuad(particle.mesh);
    const initialY = particle.mesh.position.y;
    const initialScaleX = particle.mesh.scale.x;
    const initialScaleY = particle.mesh.scale.y;

    performanceNow.mockReturnValue(3000);
    const camera = new THREE.PerspectiveCamera();
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      particle.mesh.geometry,
      particle.material,
      null
    );

    const signedSeed = 0.571 * 2 - 1;
    const expectedSpeed = 1 * 0.01 * signedSeed;
    expect(particle.mesh.position.y - initialY).toBeCloseTo(expectedSpeed * 2, 2);
    expect(particle.mesh.scale.x).toBeCloseTo(initialScaleX, 6);
    expect(particle.mesh.scale.y).toBeCloseTo(initialScaleY, 6);
    performanceNow.mockRestore();
  });

  it("mutes stationary spawnType 1 trail emitters instead of running a time-based particle fountain", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_trail.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_trail_vfx",
      kind: "placeables",
      name: "VFX TRAIL",
      resRef: "trail_vfx",
      tag: "TRAIL_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_trail_vfx",
          resref: "trail_vfx",
          textureFileName: "fxpa_trail.tga",
          textureDeliveryUrl: "/assets/fxpa_trail.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "trail-source",
                sourceModelFileName: "trail_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/trail_vfx.mdl",
                nodeName: "trail_particles",
                texture: "fxpa_trail",
                emitterType: "Trail",
                renderMode: "Motion_Blur",
                blendMode: "Lighten",
                simulation: {
                  spawnType: 1,
                  birthrate: 12,
                  lifeExp: 2,
                  velocity: 5,
                  randvel: 0,
                  blurLength: 2,
                  sizeStart: 0.02,
                  sizeMid: 0.02,
                  sizeEnd: 0.02,
                  alphaStart: 0.2,
                  alphaMid: 0.9,
                  alphaEnd: 0
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("motion_blur");
    expect(root?.userData.vfxPreviewRole).toBe("motion-blur-endpoint-particles");
    expect(root?.userData.auroraEmitterUpdateMode).toBe("trail");
    expect(root?.userData.auroraEmitterSpawnType).toBe(1);
    expect(root?.userData.auroraEmitterParticleCount).toBe(0);
    expect(root?.userData.auroraEmitterParticleCountSource).toBe(0);
    expect(root?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "trail-distance-stationary-source-count"
    );
    expect(root?.userData.auroraEmitterEmissionMode).toBeUndefined();
    expect(root?.userData.auroraEmitterEmissionPreviewMode).toBe(
      "movement-distance-emission-stationary-muted-preview"
    );
    expect(root?.userData.auroraEmitterFountainTrailPreviewMode).toBe(
      "movement-distance-emission-stationary-muted-preview"
    );
    expect(root?.userData.auroraEmitterFountainTrailSpacingMeters).toBeCloseTo(1 / 12, 6);
    expect(root?.userData.auroraEmitterFountainTrailDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_FOUNTAIN_TRAIL_DISTANCE_EMISSION_REQUIRED",
        "VFX_FOUNTAIN_TRAIL_RESIDUAL_VECTOR_REQUIRED",
        "VFX_FOUNTAIN_TRAIL_DISTRIBUTES_ALONG_MOTION",
        "VFX_FOUNTAIN_TRAIL_STATIONARY_PREVIEW_MUTED"
      ])
    );
    expect(root?.userData.auroraEmitterMotionBlurPreviewMode).toBe(
      "previous-current-endpoint-pair-preview"
    );
    expect(root?.userData.auroraEmitterMotionBlurDiagnostics).toEqual(
      expect.arrayContaining(["VFX_MOTION_BLUR_PREVIOUS_CURRENT_ENDPOINT_PAIR"])
    );
    let spriteCount = 0;
    const motionBlurMeshes: THREE.Mesh[] = [];
    root?.traverse((node) => {
      if (node instanceof THREE.Sprite) {
        spriteCount += 1;
      }
      if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "motion-blur-endpoint-particle") {
        motionBlurMeshes.push(node);
      }
    });
    expect(spriteCount).toBe(0);
    expect(motionBlurMeshes).toHaveLength(0);
    performanceNow.mockRestore();
  });

  it("uses Aurora blurLength for spawnType 0 Motion_Blur bars instead of fallback trail stretch", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_phod01w.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_phod_fx_bar2blu",
      kind: "placeables",
      name: "VFX: Bar-S: Blue*",
      resRef: "phod_fx_bar2blu",
      tag: "PHOD_FX_BAR2BLU",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_phod_fx_bar2blu",
          resref: "phod_fx_bar2blu",
          placeableName: "VFX: Bar-S: Blue*",
          textureFileName: "fxpa_phod01w.tga",
          textureDeliveryUrl: "/assets/fxpa_phod01w.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "phod_fx_bar2blu.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_bar2blu.mdl",
                nodeName: "OmenEmitter259",
                texture: "fxpa_phod01w",
                emitterType: "Fountain",
                renderMode: "Motion_Blur",
                blendMode: "Lighten",
                atlas: {
                  xGridRaw: 2,
                  yGridRaw: 2,
                  effectiveXGrid: 2,
                  effectiveYGrid: 2,
                  fps: 20,
                  frameStart: 0,
                  frameEnd: 3,
                  random: true
                },
                simulation: {
                  xSize: 3,
                  ySize: 3,
                  spawnType: 0,
                  birthrate: 35,
                  lifeExp: 3,
                  mass: -0.3,
                  velocity: 9,
                  randvel: 0,
                  spread: 0,
                  blurLength: 1,
                  inheritLocal: true,
                  sizeStart: 0.1,
                  sizeEnd: 0,
                  sizeStartY: 0,
                  sizeEndY: 0,
                  alphaStart: 1,
                  alphaEnd: 0,
                  colorStart: [0, 0, 1],
                  colorEnd: [0, 0, 1]
                },
                sourceState: {
                  renderOrder: 0,
                  twoSidedTexture: false,
                  loop: false
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterRenderBucket).toBe("motion_blur");
    expect(root?.userData.auroraEmitterRenderRuntimeMode).toBe(6);
    expect(root?.userData.vfxPreviewLayout).toBe("motion_blur");
    expect(root?.userData.vfxPreviewRole).toBe("motion-blur-endpoint-particles");
    expect(root?.userData.auroraEmitterSpawnType).toBe(0);
    expect(root?.userData.auroraEmitterBlurLengthSource).toBe(1);
    expect(root?.userData.auroraEmitterMotionBlurRawBlurLengthSource).toBe(1);
    expect(root?.userData.auroraEmitterMotionBlurBlurLengthPreviewMode).toBe(
      "source-blurlength-previous-position-blend"
    );
    expect(root?.userData.auroraEmitterBlurStretch).toBeUndefined();
    expect(root?.userData.auroraEmitterTrailStretch).toBeUndefined();
    expect(root?.userData.auroraEmitterMotionBlurPreviewMode).toBe(
      "previous-current-endpoint-pair-preview"
    );
    expect(root?.userData.auroraEmitterMotionBlurDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_MOTION_BLUR_PREVIOUS_CURRENT_ENDPOINT_PAIR",
        "VFX_MOTION_BLUR_BLURLENGTH_PREVIOUS_POSITION_BLEND"
      ])
    );
    expect(root?.userData.auroraEmitterParticleCountSource).toBe(105);
    expect(root?.userData.auroraEmitterParticleCountPreviewMode).toBe(
      "birthrate-lifetime-source-count"
    );
    expect(root?.userData.auroraEmitterKinematicTravelClampPreviewMode).toBeUndefined();
    expect(root?.userData.auroraEmitterKinematicTravelClampDistance).toBeUndefined();
    expectAuroraParticleDrawRecordUserData(root?.userData, {
      activeParticleCount: 105
    });
    expect(root?.userData.auroraParticleBatchRendererPreviewMode).toBe(
      "aurora-motion-blur-contiguous-endpoint-vertex-buffer"
    );
    expect(root?.userData.auroraParticleBatchSourceSlotPreviewMode).toBe(
      "hidden-motion-blur-slot-for-contiguous-batch"
    );
    expect(root?.userData.auroraParticleBatchSlotCount).toBe(105);
    expect(root?.userData.auroraParticleBatchVisibleMeshRole).toBe(
      "motion-blur-endpoint-batch"
    );

    const motionBlurMeshes = collectMotionBlurMeshes(root);
    expect(motionBlurMeshes).toHaveLength(105);
    expect(
      motionBlurMeshes.every(
        ({ mesh }) =>
          mesh.visible === false &&
          mesh.userData.auroraParticleSlotPreviewMode ===
            "hidden-motion-blur-slot-for-contiguous-batch" &&
          mesh.userData.auroraParticleRenderedByBatch === true
      )
    ).toBe(true);
    const motionBlurBatches = collectMotionBlurBatches(root);
    expect(motionBlurBatches).toHaveLength(1);
    const motionBlurBatch = motionBlurBatches[0]!;
    expect(motionBlurBatch.mesh.visible).toBe(true);
    expect(motionBlurBatch.mesh.frustumCulled).toBe(false);
    expect(motionBlurBatch.mesh.userData.auroraParticleBatchRendererPreviewMode).toBe(
      "aurora-motion-blur-contiguous-endpoint-vertex-buffer"
    );
    expect(motionBlurBatch.mesh.userData.auroraParticleBatchSourceSlotPreviewMode).toBe(
      "hidden-motion-blur-slot-for-contiguous-batch"
    );
    expect(motionBlurBatch.mesh.geometry.index).toBeNull();
    expect(motionBlurBatch.mesh.geometry.userData.auroraVfxTexturedParticleBatch).toBe(true);
    expect(motionBlurBatch.mesh.geometry.userData.auroraParticleBatchVertexCapacity).toBe(630);
    expect(motionBlurBatch.mesh.geometry.getAttribute("position").count).toBe(630);
    expect(motionBlurBatch.mesh.geometry.getAttribute("uv").count).toBe(630);
    expect(motionBlurBatch.mesh.geometry.getAttribute("color").count).toBe(630);
    expect(motionBlurBatch.mesh.geometry.getAttribute("auroraAlpha").count).toBe(630);
    expectAuroraParticleDrawRecordUserData(motionBlurBatch.mesh.userData, {
      activeParticleCount: 105
    });
    expectAuroraParticleDrawRecordUserData(motionBlurBatch.mesh.geometry.userData, {
      activeParticleCount: 105
    });
    expectAuroraParticleDrawRecordUserData(motionBlurBatch.material.userData, {
      activeParticleCount: 105
    });

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(3, 3, 3);
    camera.updateMatrixWorld();
    performanceNow.mockReturnValue(1400);
    motionBlurBatch.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      motionBlurBatch.mesh.geometry,
      motionBlurBatch.material,
      null
    );
    expect(motionBlurBatch.mesh.userData.auroraParticleBatchUpdatePreviewMode).toBe(
      "motion-blur-slot-simulated-contiguous-vertex-buffer-copy"
    );
    expect(motionBlurBatch.mesh.userData.auroraParticleBatchCopiedSlotCount).toBe(105);
    expect(motionBlurBatch.mesh.userData.auroraParticleBatchVisibleCount).toBeGreaterThan(0);
    const visibleMotionBlurMeshes = motionBlurMeshes.filter(({ material }) => material.opacity > 0);
    expect(visibleMotionBlurMeshes.length).toBeGreaterThan(0);
    expect(visibleMotionBlurMeshes[0]?.material.side).toBe(THREE.DoubleSide);
    expect(visibleMotionBlurMeshes[0]?.material.userData.auroraEmitterTextureSide).toBe(
      THREE.FrontSide
    );
    expect(
      visibleMotionBlurMeshes[0]?.material.userData.auroraEmitterParticleAlignedTextureSidePreviewMode
    ).toBe("camera-facing-particle-aligned-double-sided-preview");
    const firstVisibleMotionBlurMesh = visibleMotionBlurMeshes[0]!.mesh;
    expect(firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurEndpointMode).toBe(
      "previous-current-particle-positions"
    );
    expect(firstVisibleMotionBlurMesh.userData.auroraParticleBasisPreviewMode).toBe(
      "aurora-motion-blur-previous-current-endpoint-vertex-buffer"
    );
    expect(firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurEndpointDistance).toBeGreaterThan(
      0
    );
    expect(firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurPreviousPosition).toEqual(
      expect.any(Array)
    );
    expect(firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurCurrentPosition).toEqual(
      expect.any(Array)
    );
    expect(firstVisibleMotionBlurMesh.scale.x).toBeCloseTo(1, 6);
    expect(firstVisibleMotionBlurMesh.scale.y).toBeCloseTo(1, 6);
    expect(firstVisibleMotionBlurMesh.scale.z).toBeCloseTo(1, 6);
    expect(firstVisibleMotionBlurMesh.geometry.userData.auroraEndpointPairGeometryPreviewMode).toBe(
      "six-vertex-endpoint-pair-quad"
    );
    expect(readEndpointPairDistance(firstVisibleMotionBlurMesh)).toBeCloseTo(
      Number(firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurEndpointDistance),
      4
    );
    const endpointAlpha = readEndpointPairAlpha(firstVisibleMotionBlurMesh);
    const endpointColorAlpha = readEndpointPairColorAlpha(firstVisibleMotionBlurMesh);
    expect(endpointAlpha.previous).toBeGreaterThanOrEqual(0);
    expect(endpointAlpha.previous).toBeLessThanOrEqual(endpointAlpha.current);
    expect(endpointColorAlpha.previous).toBeCloseTo(endpointAlpha.previous, 6);
    expect(endpointColorAlpha.current).toBeCloseTo(endpointAlpha.current, 6);
    expect(
      firstVisibleMotionBlurMesh.geometry.userData.auroraMotionBlurPreviousEndpointAlphaScale
    ).toBeLessThanOrEqual(1);
    performanceNow.mockReturnValue(1650);
    firstVisibleMotionBlurMesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      firstVisibleMotionBlurMesh.geometry,
      visibleMotionBlurMeshes[0]!.material,
      null
    );
    expect(firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurPreviousBlendRatioFormula).toBe(
      "min(delta, blurlength) / blurlength"
    );
    expect(firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurDeltaSeconds).toBeCloseTo(
      0.25,
      4
    );
    expect(firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurEvaluatedBlurLengthSeconds).toBe(
      1
    );
    expect(firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurPreviousBlendRatio).toBeCloseTo(
      0.25,
      4
    );
    visibleMotionBlurMeshes.forEach(({ mesh }) => {
      expect(mesh.position.length()).toBeGreaterThan(0);
      expect(mesh.position.length()).toBeLessThanOrEqual(0.2);
    });
    performanceNow.mockRestore();
  });

  it("samples Aurora blurLength keyframes for Motion_Blur previous endpoint blending", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_motion_blur_key.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_motion_blur_key_vfx",
      kind: "placeables",
      name: "VFX MOTION BLUR KEY",
      resRef: "motion_blur_key_vfx",
      tag: "MOTION_BLUR_KEY_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const blurLengthTimeline = [
      { time: 0, value: 0.5 },
      { time: 2, value: 0.5 }
    ];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_motion_blur_key_vfx",
          resref: "motion_blur_key_vfx",
          placeableName: "VFX MOTION BLUR KEY",
          textureFileName: "fxpa_motion_blur_key.tga",
          textureDeliveryUrl: "/assets/fxpa_motion_blur_key.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "source-model-1",
                sourceModelFileName: "motion_blur_key_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/motion_blur_key_vfx.mdl",
                nodeName: "MotionBlurKeyEmitter01",
                texture: "fxpa_motion_blur_key",
                emitterType: "Fountain",
                renderMode: "Motion_Blur",
                blendMode: "Lighten",
                simulation: {
                  spawnType: 0,
                  birthrate: 4,
                  lifeExp: 2,
                  mass: 0,
                  velocity: 6,
                  randvel: 0,
                  spread: 0,
                  sizeStart: 0.1,
                  sizeEnd: 0,
                  sizeStartY: 0,
                  sizeEndY: 0,
                  alphaStart: 1,
                  alphaEnd: 0,
                  timeline: {
                    blurLength: blurLengthTimeline
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterBlurLengthSource).toBe(1);
    expect(root?.userData.auroraEmitterBlurLengthTimeline).toEqual(blurLengthTimeline);
    expect(root?.userData.auroraEmitterBlurLengthTimelinePreviewMode).toBe(
      "runtime-blurlength-keyframe-previous-position-blend"
    );
    expect(root?.userData.auroraEmitterMotionBlurBlurLengthPreviewMode).toBe(
      "source-blurlength-previous-position-blend"
    );

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(3, 3, 3);
    camera.updateMatrixWorld();
    const motionBlurBatches = collectMotionBlurBatches(root);
    expect(motionBlurBatches).toHaveLength(1);

    performanceNow.mockReturnValue(1400);
    motionBlurBatches[0]!.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      motionBlurBatches[0]!.mesh.geometry,
      motionBlurBatches[0]!.material,
      null
    );

    const visibleMotionBlurMeshes = collectMotionBlurMeshes(root).filter(
      ({ material }) => material.opacity > 0
    );
    expect(visibleMotionBlurMeshes.length).toBeGreaterThan(0);
    const firstVisibleMotionBlurMesh = visibleMotionBlurMeshes[0]!.mesh;

    performanceNow.mockReturnValue(1650);
    firstVisibleMotionBlurMesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      firstVisibleMotionBlurMesh.geometry,
      visibleMotionBlurMeshes[0]!.material,
      null
    );

    expect(
      firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurEvaluatedBlurLengthSeconds
    ).toBe(0.5);
    expect(firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurDeltaSeconds).toBeCloseTo(
      0.25,
      4
    );
    expect(
      firstVisibleMotionBlurMesh.userData.auroraEmitterMotionBlurPreviousBlendRatio
    ).toBeCloseTo(0.5, 4);
    performanceNow.mockRestore();
  });

  it("diagnoses non-positive Aurora Motion_Blur blurLength while using the protected default", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_motion_zero.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_motion_zero_vfx",
      kind: "placeables",
      name: "VFX MOTION ZERO",
      resRef: "motion_zero_vfx",
      tag: "MOTION_ZERO_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_motion_zero_vfx",
          resref: "motion_zero_vfx",
          textureFileName: "fxpa_motion_zero.tga",
          textureDeliveryUrl: "/assets/fxpa_motion_zero.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "motion-zero-source",
                sourceModelFileName: "motion_zero_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/motion_zero_vfx.mdl",
                nodeName: "motion_zero_particles",
                texture: "fxpa_motion_zero",
                emitterType: "Fountain",
                renderMode: "Motion_Blur",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 2,
                  lifeExp: 2,
                  velocity: 1,
                  randvel: 0,
                  blurLength: 0,
                  sizeStart: 0.2,
                  sizeEnd: 0.2,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterRenderBucket).toBe("motion_blur");
    expect(root?.userData.auroraEmitterBlurLengthSource).toBe(1);
    expect(root?.userData.auroraEmitterMotionBlurRawBlurLengthSource).toBe(0);
    expect(root?.userData.auroraEmitterMotionBlurBlurLengthPreviewMode).toBe(
      "nonpositive-blurlength-diagnostic-default-1-0"
    );
    expect(root?.userData.auroraEmitterMotionBlurDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_MOTION_BLUR_DEFAULT_BLURLENGTH_1_0",
        "VFX_MOTION_BLUR_BLURLENGTH_NONPOSITIVE_DIAGNOSTIC_REQUIRED",
        "VFX_MOTION_BLUR_BLURLENGTH_ZERO_UNVERIFIED"
      ])
    );
    expect(root?.userData.auroraEmitterBlurStretch).toBeUndefined();
    expect(collectMotionBlurMeshes(root).length).toBeGreaterThan(0);
  });

  it("uses Aurora deadspace as a camera-angle cull for particle-aligned emitters", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_deadspace.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_deadspace_vfx",
      kind: "placeables",
      name: "VFX DEADSPACE",
      resRef: "deadspace_vfx",
      tag: "DEADSPACE_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_deadspace_vfx",
          resref: "deadspace_vfx",
          textureFileName: "fxpa_deadspace.tga",
          textureDeliveryUrl: "/assets/fxpa_deadspace.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "deadspace-source",
                sourceModelFileName: "deadspace_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/deadspace_vfx.mdl",
                nodeName: "deadspace_particles",
                texture: "fxpa_deadspace",
                emitterType: "Fountain",
                renderMode: "Aligned_to_Particle",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 2,
                  velocity: 1,
                  spread: 0,
                  deadspace: 45,
                  sizeStart: 0.5,
                  sizeEnd: 0.5,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("particle_aligned");
    expect(root?.userData.auroraEmitterDeadspaceDegrees).toBe(45);
    expect(root?.userData.auroraEmitterDeadspaceAngleRadians).toBeCloseTo(Math.PI / 4, 5);
    const particles = collectParticleAlignedMeshes(root);
    expect(particles.length).toBeGreaterThan(0);
    const particle = particles[0]!;
    const camera = new THREE.PerspectiveCamera();

    camera.position.set(
      particle.mesh.position.x,
      particle.mesh.position.y + 10,
      particle.mesh.position.z
    );
    camera.lookAt(particle.mesh.position);
    camera.updateMatrixWorld();
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      particle.mesh.geometry,
      particle.material,
      null
    );
    expect(particle.mesh.userData.auroraEmitterDeadspaceCull).toBe(true);
    expect(particle.mesh.userData.auroraEmitterDeadspaceCullPreviewMode).toBe(
      "view-direction-deadspace-angle-preview"
    );
    expect(particle.material.userData.auroraVfxParticleAlphaPreviewMode).toBe(
      "hidden-deadspace-angle"
    );
    expect(particle.material.opacity).toBe(0);
    expect(readFirstAuroraVertexAlpha(particle.mesh)).toBe(0);

    camera.position.set(
      particle.mesh.position.x + 10,
      particle.mesh.position.y,
      particle.mesh.position.z
    );
    camera.lookAt(particle.mesh.position);
    camera.updateMatrixWorld();
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      particle.mesh.geometry,
      particle.material,
      null
    );
    expect(particle.mesh.userData.auroraEmitterDeadspaceCull).toBe(false);
    expect(particle.material.userData.auroraVfxParticleAlphaPreviewMode).toBe(
      "aurora-particle-vertex-alpha"
    );
    expect(particle.material.opacity).toBeGreaterThan(0);
    expect(readFirstAuroraVertexAlpha(particle.mesh)).toBeGreaterThan(0);
    performanceNow.mockRestore();
  });

  it("applies Aurora inherit_part stretch only when inheritvel is enabled", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_inheritpart.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(500);

    const object = {
      id: "preview:plc_inheritpart_vfx",
      kind: "placeables",
      name: "VFX INHERIT PART",
      resRef: "inheritpart_vfx",
      tag: "INHERITPART_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_inheritpart_vfx",
          resref: "inheritpart_vfx",
          textureFileName: "fxpa_inheritpart.tga",
          textureDeliveryUrl: "/assets/fxpa_inheritpart.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "inheritpart-source",
                sourceModelFileName: "inheritpart_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/inheritpart_vfx.mdl",
                nodeName: "inheritpart_particles",
                texture: "fxpa_inheritpart",
                emitterType: "Fountain",
                renderMode: "Aligned_to_Particle",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 2,
                  velocity: 0.8,
                  spread: 0,
                  blurLength: 2,
                  inheritVel: true,
                  inheritPart: true,
                  sizeStart: 0.5,
                  sizeEnd: 0.5,
                  alphaStart: 1,
                  alphaEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.vfxPreviewLayout).toBe("particle_aligned");
    expect(root?.userData.auroraEmitterInheritVelocity).toBe(true);
    expect(root?.userData.auroraEmitterInheritParticle).toBe(true);
    expect(root?.userData.auroraEmitterInheritParticlePreviewMode).toBe(
      "inherit-velocity-particle-stretch"
    );
    expect(root?.userData.auroraEmitterBlurStretch).toBeCloseTo(1.56, 5);
    expect(root?.userData.auroraEmitterInheritDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_INHERIT_PARTICLE_STRETCH_REQUIRES_INHERITVEL",
        "VFX_INHERIT_PARTICLE_SOURCE_FLAGS_APPLIED"
      ])
    );

    const particles = collectParticleAlignedMeshes(root);
    expect(particles.length).toBeGreaterThan(0);
    expectAuroraParticleDrawRecordUserData(root?.userData, {
      activeParticleCount: particles.length
    });
    expect(root?.userData.auroraParticleBatchRendererPreviewMode).toBe(
      "aurora-particle-aligned-contiguous-trail-vertex-buffer"
    );
    expect(root?.userData.auroraParticleBatchSourceSlotPreviewMode).toBe(
      "hidden-particle-aligned-slot-for-contiguous-batch"
    );
    expect(root?.userData.auroraParticleBatchSlotCount).toBe(particles.length);
    expect(root?.userData.auroraParticleBatchVisibleMeshRole).toBe(
      "particle-aligned-trail-batch"
    );
    expect(
      particles.every(
        ({ mesh }) =>
          mesh.visible === false &&
          mesh.userData.auroraParticleSlotPreviewMode ===
            "hidden-particle-aligned-slot-for-contiguous-batch" &&
          mesh.userData.auroraParticleRenderedByBatch === true
      )
    ).toBe(true);
    const particleAlignedBatches = collectParticleAlignedBatches(root);
    expect(particleAlignedBatches).toHaveLength(1);
    const particleAlignedBatch = particleAlignedBatches[0]!;
    expect(particleAlignedBatch.mesh.visible).toBe(true);
    expect(particleAlignedBatch.mesh.frustumCulled).toBe(false);
    expect(particleAlignedBatch.mesh.userData.auroraParticleBatchRendererPreviewMode).toBe(
      "aurora-particle-aligned-contiguous-trail-vertex-buffer"
    );
    expect(particleAlignedBatch.mesh.userData.auroraParticleBatchSourceSlotPreviewMode).toBe(
      "hidden-particle-aligned-slot-for-contiguous-batch"
    );
    expect(particleAlignedBatch.mesh.geometry.index).toBeNull();
    expect(particleAlignedBatch.mesh.geometry.userData.auroraVfxTexturedParticleBatch).toBe(true);
    expect(particleAlignedBatch.mesh.geometry.userData.auroraParticleBatchVertexCapacity).toBe(
      particles.length * 6
    );
    expect(particleAlignedBatch.mesh.geometry.getAttribute("position").count).toBe(
      particles.length * 6
    );
    expect(particleAlignedBatch.mesh.geometry.getAttribute("uv").count).toBe(
      particles.length * 6
    );
    expect(particleAlignedBatch.mesh.geometry.getAttribute("color").count).toBe(
      particles.length * 6
    );
    expect(particleAlignedBatch.mesh.geometry.getAttribute("auroraAlpha").count).toBe(
      particles.length * 6
    );
    expectAuroraParticleDrawRecordUserData(particleAlignedBatch.mesh.userData, {
      activeParticleCount: particles.length
    });
    expectAuroraParticleDrawRecordUserData(particleAlignedBatch.mesh.geometry.userData, {
      activeParticleCount: particles.length
    });
    expectAuroraParticleDrawRecordUserData(particleAlignedBatch.material.userData, {
      activeParticleCount: particles.length
    });
    const particle = particles[0]!;
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particle.mesh.geometry,
      particle.material,
      null
    );
    expect(particle.mesh.userData.auroraEmitterAlignedToParticleDirection).toBe(true);
    expect(particle.mesh.scale.y).toBeCloseTo(particle.mesh.scale.x * 1.56, 3);
    particleAlignedBatch.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      particleAlignedBatch.mesh.geometry,
      particleAlignedBatch.material,
      null
    );
    expect(particleAlignedBatch.mesh.userData.auroraParticleBatchUpdatePreviewMode).toBe(
      "particle-aligned-slot-simulated-contiguous-vertex-buffer-copy"
    );
    expect(particleAlignedBatch.mesh.userData.auroraParticleBatchCopiedSlotCount).toBe(
      particles.length
    );
    expect(particleAlignedBatch.mesh.userData.auroraParticleBatchVisibleCount).toBeGreaterThan(0);
    performanceNow.mockRestore();
  });

  it("uses inherit_local to keep velocity in emitter-local space under node orientation", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_inheritlocal.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const makeObject = (id: string) =>
      ({
        id,
        kind: "placeables",
        name: id,
        resRef: id.replace("preview:plc_", ""),
        tag: id.toUpperCase(),
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
      }) as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    const makePayload = (templateId: string, inheritLocal: boolean) =>
      createVfxPayloadWithReadyModel({
        includeTextureContract: true,
        templateId,
        resref: templateId.replace("plc_", ""),
        textureFileName: "fxpa_inheritlocal.tga",
        textureDeliveryUrl: "/assets/fxpa_inheritlocal.tga",
        auroraEmitter: {
          source: "source-mdl",
          diagnostics: [],
          emitters: [
            {
              source: "aurora-mdl-ascii",
              sourceModelAssetId: `${templateId}-source`,
              sourceModelFileName: `${templateId}.mdl`,
              sourceModelObjectKey: `modules/current/models/${templateId}.mdl`,
              nodeName: `${templateId}_particles`,
              texture: "fxpa_inheritlocal",
              emitterType: "Fountain",
              renderMode: "Normal",
              blendMode: "Normal",
              simulation: {
                birthrate: 1,
                lifeExp: 4,
                velocity: 100,
                spread: 0,
                inheritLocal,
                sizeStart: 0.5,
                sizeEnd: 0.5,
                alphaStart: 1,
                alphaEnd: 1
              },
              transform: {
                position: [0, 0, 0],
                orientation: {
                  axis: [1, 0, 0],
                  angleRadians: Math.PI / 2
                }
              }
            }
          ]
        }
      });

    const worldObject = makeObject("preview:plc_worldspace_vfx");
    const localObject = makeObject("preview:plc_inheritlocal_vfx");
    rebuildObjectMeshes(
      runtime,
      [worldObject, localObject],
      [],
      createDebugState(),
      1,
      false,
      10,
      [],
      false,
      {
        [worldObject.id]: makePayload("plc_worldspace_vfx", false),
        [localObject.id]: makePayload("plc_inheritlocal_vfx", true)
      }
    );

    const worldRoot = runtime.objectMeshById.get(worldObject.id);
    const localRoot = runtime.objectMeshById.get(localObject.id);
    expect(worldRoot?.userData.auroraEmitterParticleKinematicCoordinateSpace).toBe("world");
    expect(worldRoot?.userData.auroraEmitterParticleKinematicCoordinateSpacePreviewMode).toBe(
      "source-no-inherit-world-space"
    );
    expect(localRoot?.userData.auroraEmitterParticleKinematicCoordinateSpace).toBe(
      "emitter-local"
    );
    expect(localRoot?.userData.auroraEmitterParticleKinematicCoordinateSpacePreviewMode).toBe(
      "source-inherit-local-emitter-space"
    );

    const worldParticle = collectCameraBillboardParticles(worldRoot)[0]!;
    const localParticle = collectCameraBillboardParticles(localRoot)[0]!;
    worldRoot?.updateMatrixWorld(true);
    localRoot?.updateMatrixWorld(true);
    const initialWorldPosition = new THREE.Vector3();
    const initialLocalPosition = new THREE.Vector3();
    worldParticle.mesh.getWorldPosition(initialWorldPosition);
    localParticle.mesh.getWorldPosition(initialLocalPosition);

    performanceNow.mockReturnValue(3000);
    const camera = new THREE.PerspectiveCamera();
    worldParticle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      worldParticle.mesh.geometry,
      worldParticle.material,
      null
    );
    localParticle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      localParticle.mesh.geometry,
      localParticle.material,
      null
    );
    worldRoot?.updateMatrixWorld(true);
    localRoot?.updateMatrixWorld(true);
    const worldPosition = new THREE.Vector3();
    const localPosition = new THREE.Vector3();
    worldParticle.mesh.getWorldPosition(worldPosition);
    localParticle.mesh.getWorldPosition(localPosition);
    const worldDelta = worldPosition.sub(initialWorldPosition);
    const localDelta = localPosition.sub(initialLocalPosition);

    expect(worldDelta.y).toBeGreaterThan(0.8);
    expect(Math.abs(worldDelta.z)).toBeLessThan(0.05);
    expect(localDelta.z).toBeGreaterThan(0.8);
    expect(Math.abs(localDelta.y)).toBeLessThan(0.05);
    performanceNow.mockRestore();
  });

  it("schedules continuous Aurora particles by birthrate and lifetime", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_smoke01.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_scheduled_smoke",
      kind: "placeables",
      name: "VFX: Smoke Scheduled",
      resRef: "scheduled_smoke",
      tag: "SCHEDULED_SMOKE",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_scheduled_smoke",
          resref: "scheduled_smoke",
          textureFileName: "fxpa_smoke01.tga",
          textureDeliveryUrl: "/assets/fxpa_smoke01.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "scheduled-source",
                sourceModelFileName: "scheduled_smoke.mdl",
                sourceModelObjectKey: "modules/current/models/scheduled_smoke.mdl",
                nodeName: "scheduled_smoke",
                texture: "fxpa_smoke01",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 1,
                  lifeExp: 2,
                  alphaStart: 1,
                  alphaEnd: 1,
                  sizeStart: 1,
                  sizeEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterEmissionMode).toBe("continuous");
    expect(root?.userData.auroraEmitterEmissionPreviewMode).toBe(
      "birthrate-lifetime-scheduled-preview"
    );
    expect(root?.userData.auroraEmitterBirthrate).toBe(1);
    expect(root?.userData.auroraEmitterLifeSeconds).toBe(2);
    expect(root?.userData.auroraEmitterFountainNormalPreviewMode).toBe(
      "normal-spawn-threshold-scheduled-preview"
    );
    expect(root?.userData.auroraEmitterFountainNormalSpawnIntervalSeconds).toBe(1);
    expect(root?.userData.auroraEmitterFountainNormalDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_FOUNTAIN_NORMAL_SPAWN_ACCUMULATOR_REQUIRED",
        "VFX_FOUNTAIN_NORMAL_ACCUMULATOR_ZERO_RESET_REQUIRED"
      ])
    );
    const particles = collectCameraBillboardParticles(root);
    expect(particles).toHaveLength(2);
    expectAuroraCameraBillboardQuad(particles[0]!.mesh);
    expectAuroraCameraBillboardQuad(particles[1]!.mesh);
    expect(particles[0]?.material.opacity).toBe(0);
    expect(readFirstAuroraVertexAlpha(particles[0]!.mesh)).toBe(0);
    expect(particles[1]?.material.opacity).toBe(0);
    expect(readFirstAuroraVertexAlpha(particles[1]!.mesh)).toBe(0);

    performanceNow.mockReturnValue(1200);
    const camera = new THREE.PerspectiveCamera();
    particles[0]?.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      particles[0].mesh.geometry,
      particles[0].material,
      null
    );
    particles[1]?.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      particles[1].mesh.geometry,
      particles[1].material,
      null
    );
    expect(particles[0]?.material.opacity).toBeGreaterThan(0);
    expect(readFirstAuroraVertexAlpha(particles[0]!.mesh)).toBeGreaterThan(0);
    expect(particles[1]?.material.opacity).toBe(0);
    expect(readFirstAuroraVertexAlpha(particles[1]!.mesh)).toBe(0);
    performanceNow.mockRestore();
  });

  it("renders the zlc_o45 catalog source-mdl Fountain/Lighten preview with visible semantic particles", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/_aurora/v1/catalog/placeables/cache/f4d8e6f56415481f5d731cfa2322d65abdffab60627eae2ce472815095359ace/assets/dcfa77a7b50e8287f591d07e.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "catalog-vfx-preview:plc_zlc_o45",
      kind: "placeables",
      name: "VFX: Magic Mouth, Flat Anim P* (dobervich)",
      resRef: "zlc_o45",
      tag: "plc_zlc_o45",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_zlc_o45",
          resref: "zlc_o45",
          placeableName: "VFX: Magic Mouth, Flat Anim P* (dobervich)",
          textureFileName: "fxpa_flare.tga",
          textureDeliveryUrl:
            "/api/v1/catalog/placeables/cache/f4d8e6f56415481f5d731cfa2322d65abdffab60627eae2ce472815095359ace/assets/dcfa77a7b50e8287f591d07e.tga",
          metadata: {
            source2daRow: 2793,
            lookupModelResRef: "zlc_o45"
          },
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [
              {
                code: "VFX_AURORA_MDL_EMITTER_PAYLOAD_READY",
                severity: "info",
                message: "Source MDL emitter payload ready"
              }
            ],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "68478b895ea83e814c3f0b11",
                sourceModelFileName: "zlc_o45.mdl",
                sourceModelObjectKey: "modules/current/__aurora/sources/hak/cep3_core2/zlc_o45.mdl",
                nodeName: "glow",
                texture: "fxpa_flare",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Lighten",
                atlas: {
                  xGridRaw: 1,
                  yGridRaw: 1,
                  effectiveXGrid: 1,
                  effectiveYGrid: 1,
                  fps: 1,
                  frameStart: 0,
                  frameEnd: 15,
                  random: false
                },
                simulation: {
                  xSize: 80,
                  ySize: 40,
                  spawnType: 0,
                  birthrate: 20,
                  lifeExp: 0.5,
                  mass: 0,
                  velocity: 0.10000000149011612,
                  randvel: 0,
                  spread: 6.28318977355957,
                  particleRot: 0,
                  blurLength: 50,
                  sizeStart: 0.05000000074505806,
                  sizeEnd: 0.15000000596046448,
                  sizeStartY: 0.05000000074505806,
                  sizeEndY: 0.15000000596046448,
                  alphaStart: 0.30000001192092896,
                  alphaEnd: 0,
                  affectedByWind: false,
                  colorStart: [0.9294120073318481, 0.2588239908218384, 0],
                  colorEnd: [1, 1, 0]
                },
                transform: {
                  position: [0, 0, 1.5],
                  orientation: {
                    axis: [0, -0.7071067690849304, 0.7071067690849304],
                    angle: 3.1415927410125732
                  }
                },
                sourceState: {
                  renderOrder: 0,
                  twoSidedTexture: false,
                  loop: false,
                  isTinted: false,
                  splat: false
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    const emitterRoot = root?.children.find((child) => child.userData?.auroraEmitterNode === "glow");
    expect(emitterRoot?.userData.auroraEmitterPackageSource).toBe("source-mdl");
    expect(emitterRoot?.userData.auroraEmitterSource).toBe("aurora-mdl-binary");
    expect(emitterRoot?.userData.auroraEmitterNode).toBe("glow");
    expect(emitterRoot?.userData.auroraEmitterTexture).toBe("fxpa_flare");
    expect(emitterRoot?.userData.auroraEmitterBlendMode).toBe("Lighten");
    expect(emitterRoot?.userData.auroraEmitterRenderMode).toBe("Normal");
    expect(emitterRoot?.userData.auroraEmitterSourceModelFileName).toBe("zlc_o45.mdl");
    expect(emitterRoot?.userData.auroraEmitterParticleCount).toBeGreaterThan(0);
    expect(emitterRoot?.userData.vfxTextureStatus).toBe("applied");
    expect(emitterRoot?.userData.auroraEmitterParticleAlphaStart).toBeCloseTo(
      0.30000001192092896,
      5
    );
    expect(emitterRoot?.userData.auroraEmitterParticleAlphaEnd).toBe(0);
    expect(emitterRoot?.userData.auroraEmitterParticleColorStart).toEqual([
      0.9294120073318481,
      0.2588239908218384,
      0
    ]);
    expect(emitterRoot?.userData.auroraEmitterParticleColorEnd).toEqual([1, 1, 0]);
    expect(emitterRoot?.userData.auroraEmitterEmissionMode).toBe("continuous");
    expect(emitterRoot?.userData.auroraEmitterEmissionPreviewMode).toBe(
      "birthrate-lifetime-scheduled-preview"
    );

    const particles = collectCameraBillboardParticles(emitterRoot);
    expect(particles.length).toBeGreaterThan(0);
    performanceNow.mockReturnValue(320);
    const camera = new THREE.PerspectiveCamera();
    particles.forEach((particle) => {
      particle.mesh.onBeforeRender(
        {} as THREE.WebGLRenderer,
        new THREE.Scene(),
        camera,
        particle.mesh.geometry,
        particle.material,
        null
      );
    });
    const visibleParticle = particles.find(
      (particle) =>
        particle.material.opacity > 0 && readFirstAuroraVertexAlpha(particle.mesh) > 0
    );
    expect(visibleParticle).toBeDefined();
    performanceNow.mockRestore();
  });

  it("uses Aurora birthrate keyframes for animated emitter previews that start at zero", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_keyed_birth.tga",
      particleTexture
    );

    const object = {
      id: "preview:plc_keyed_birth",
      kind: "placeables",
      name: "VFX: Keyed Birth",
      resRef: "keyed_birth",
      tag: "KEYED_BIRTH",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_keyed_birth",
          resref: "keyed_birth",
          textureFileName: "fxpa_keyed_birth.tga",
          textureDeliveryUrl: "/assets/fxpa_keyed_birth.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "keyed-source",
                sourceModelFileName: "plc_keyed_birth.mdl",
                sourceModelObjectKey: "modules/current/models/plc_keyed_birth.mdl",
                nodeName: "keyed_birth",
                texture: "fxpa_keyed_birth",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 0,
                  lifeExp: 2,
                  alphaStart: 0,
                  alphaEnd: 0,
                  colorStart: [1, 0, 0],
                  colorMid: [1, 0, 0],
                  colorEnd: [1, 0, 0],
                  percentStart: 0,
                  percentMid: 0.75,
                  percentEnd: 1,
                  sizeStart: 0,
                  sizeEnd: 1,
                  timeline: {
                    birthrate: [
                      { time: 0, value: 0 },
                      { time: 0.25, value: 12 },
                      { time: 1, value: 0 }
                    ],
                    sizeStart: [
                      { time: 0, value: 0 },
                      { time: 0.5, value: 3 },
                      { time: 1, value: 1 }
                    ],
                    alphaStart: [
                      { time: 0, value: 0 },
                      { time: 0.25, value: 1 },
                      { time: 1, value: 0 }
                    ],
                    percentStart: [
                      { time: 0, value: 0 },
                      { time: 1, value: 0 }
                    ],
                    percentMid: [
                      { time: 0, value: 0.75 },
                      { time: 1, value: 0.75 }
                    ],
                    percentEnd: [
                      { time: 0, value: 1 },
                      { time: 1, value: 1 }
                    ]
                  },
                  colorTimeline: {
                    colorStart: [
                      { time: 0, value: [1, 0, 0] },
                      { time: 0.25, value: [0, 1, 0] },
                      { time: 0.5, value: [0, 0, 1] },
                      { time: 1, value: [1, 0, 0] }
                    ],
                    colorMid: [
                      { time: 0, value: [1, 0, 0] },
                      { time: 0.25, value: [0, 1, 0] },
                      { time: 0.5, value: [0, 0, 1] },
                      { time: 1, value: [1, 0, 0] }
                    ],
                    colorEnd: [
                      { time: 0, value: [1, 0, 0] },
                      { time: 0.25, value: [0, 1, 0] },
                      { time: 0.5, value: [0, 0, 1] },
                      { time: 1, value: [1, 0, 0] }
                    ]
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterBirthrate).toBe(12);
    expect(root?.userData.auroraEmitterBirthrateKeyframePreviewMode).toBe(
      "birthrate-key-controller-peak-preview"
    );
    expect(root?.userData.auroraEmitterSimulationTimelinePreviewMode).toBe(
      "runtime-keyframe-sampled-preview"
    );
    expect(root?.userData.auroraEmitterBirthrateKeyframes).toEqual([
      { time: 0, value: 0 },
      { time: 0.25, value: 12 },
      { time: 1, value: 0 }
    ]);
    expect(root?.userData.auroraEmitterSimulation?.timeline?.sizeStart).toEqual([
      { time: 0, value: 0 },
      { time: 0.5, value: 3 },
      { time: 1, value: 1 }
    ]);
    expect(root?.userData.auroraEmitterSimulation?.timeline?.percentMid).toEqual([
      { time: 0, value: 0.75 },
      { time: 1, value: 0.75 }
    ]);
    expect(root?.userData.auroraEmitterColorTimelinePreviewMode).toBe(
      "runtime-color-keyframe-sampled-preview"
    );
    expect(root?.userData.auroraEmitterColorTimeline?.colorStart).toEqual([
      { time: 0, value: [1, 0, 0] },
      { time: 0.25, value: [0, 1, 0] },
      { time: 0.5, value: [0, 0, 1] },
      { time: 1, value: [1, 0, 0] }
    ]);
    expect(root?.userData.auroraEmitterColorTimeline?.colorMid).toEqual([
      { time: 0, value: [1, 0, 0] },
      { time: 0.25, value: [0, 1, 0] },
      { time: 0.5, value: [0, 0, 1] },
      { time: 1, value: [1, 0, 0] }
    ]);
    expect(root?.userData.auroraEmitterParticlePercentMid).toBe(0.75);
    expect(root?.userData.auroraEmitterParticleInterpolationPreviewMode).toBe(
      "particle-color-alpha-size-linear-start-end"
    );
    expect(root?.userData.auroraEmitterMidCurveSourcePreviewMode).toBe(
      "particle-mid-runtime-curve-preview"
    );
    expect(root?.userData.auroraEmitterPercentCurvePreviewMode).toBe(
      "particle-percent-runtime-curve-preview"
    );
    expect(root?.userData.auroraEmitterParticleSizeStart).toBeGreaterThan(
      root?.userData.auroraEmitterParticleSizeEnd ?? 0
    );
    expect(root?.userData.auroraEmitterParticleAlphaStart).toBe(1);
    expect(root?.userData.auroraEmitterParticleAlphaEnd).toBe(0);

    const particles = collectCameraBillboardParticles(root);
    expect(particles).toHaveLength(24);
    const keyedParticle = particles[0];
    expect(keyedParticle?.material.opacity).toBe(0);
    expectAuroraCameraBillboardQuad(keyedParticle!.mesh);
    expect(readFirstAuroraVertexAlpha(keyedParticle!.mesh)).toBe(0);
    const initialScaleX = keyedParticle?.mesh.scale.x ?? 0;

    performanceNow.mockReturnValue(250);
    keyedParticle?.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      keyedParticle.mesh.geometry,
      keyedParticle.material,
      null
    );
    expect(keyedParticle?.material.opacity).toBeGreaterThan(0.7);
    expect(readFirstAuroraVertexAlpha(keyedParticle!.mesh)).toBeGreaterThan(0.7);
    expect(readFirstAuroraVertexColor(keyedParticle!.mesh).g).toBeGreaterThan(0.8);
    expect(readFirstAuroraVertexColor(keyedParticle!.mesh).r).toBeLessThan(0.2);
    expect(keyedParticle?.material.vertexColors).toBe(true);

    performanceNow.mockReturnValue(500);
    keyedParticle?.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      keyedParticle.mesh.geometry,
      keyedParticle.material,
      null
    );
    expect(keyedParticle?.mesh.scale.x).toBeGreaterThan(initialScaleX);
    expect(readAuroraVertexColorSource(keyedParticle!.mesh)?.[2]).toBeGreaterThan(0.8);
    expect(readFirstAuroraVertexColor(keyedParticle!.mesh).b).toBeGreaterThan(0.45);
    expect(readFirstAuroraVertexColor(keyedParticle!.mesh).g).toBeLessThan(0.2);
    performanceNow.mockRestore();
  });

  it("samples Aurora particle mid and percent curves at runtime", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_mid_curve.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const object = {
      id: "preview:plc_mid_curve",
      kind: "placeables",
      name: "VFX: Mid Curve",
      resRef: "mid_curve",
      tag: "MID_CURVE",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_mid_curve",
          resref: "mid_curve",
          textureFileName: "fxpa_mid_curve.tga",
          textureDeliveryUrl: "/assets/fxpa_mid_curve.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "mid-curve-source",
                sourceModelFileName: "plc_mid_curve.mdl",
                sourceModelObjectKey: "modules/current/models/plc_mid_curve.mdl",
                nodeName: "mid_curve",
                texture: "fxpa_mid_curve",
                emitterType: "Fountain",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 1,
                  lifeExp: 4,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  sizeStart: 1,
                  sizeMid: 4,
                  sizeEnd: 1,
                  alphaStart: 0,
                  alphaMid: 1,
                  alphaEnd: 0,
                  colorStart: [1, 0, 0],
                  colorMid: [0, 1, 0],
                  colorEnd: [0, 0, 1],
                  percentStart: 0,
                  percentMid: 0.5,
                  percentEnd: 1
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterMidCurveSourcePreviewMode).toBe(
      "particle-mid-runtime-curve-preview"
    );
    expect(root?.userData.auroraEmitterPercentCurvePreviewMode).toBe(
      "particle-percent-runtime-curve-preview"
    );

    const particles = collectCameraBillboardParticles(root);
    expect(particles.length).toBeGreaterThan(0);
    const particle = particles[0]!;
    expectAuroraCameraBillboardQuad(particle.mesh);
    expect(particle.material.opacity).toBeCloseTo(0, 4);
    expect(readFirstAuroraVertexAlpha(particle.mesh)).toBeCloseTo(0, 4);
    expect(readAuroraVertexColorSource(particle.mesh)?.[0]).toBeGreaterThan(0.9);
    expect(readFirstAuroraVertexColor(particle.mesh).r).toBeCloseTo(0, 4);

    performanceNow.mockReturnValue(3000);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(2, 2, 2);
    camera.updateMatrixWorld();
    particle.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      particle.mesh.geometry,
      particle.material,
      null
    );

    expect(particle.material.opacity).toBeCloseTo(1, 4);
    expect(readFirstAuroraVertexAlpha(particle.mesh)).toBeCloseTo(1, 4);
    expect(readFirstAuroraVertexColor(particle.mesh).g).toBeGreaterThan(0.9);
    expect(readFirstAuroraVertexColor(particle.mesh).r).toBeLessThan(0.1);
    expect(readFirstAuroraVertexColor(particle.mesh).b).toBeLessThan(0.1);
    expect(particle.mesh.scale.x).toBeCloseTo(4 * 0.24, 4);
    expect(particle.mesh.scale.y).toBeCloseTo(4 * 0.24, 4);

    performanceNow.mockRestore();
  });

  it("preserves Aurora HDR particle colors above 1.0 for Lighten emitters", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_ring02.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);
    const object = {
      id: "preview:plc_plc_mf286",
      kind: "placeables",
      name: "VFX: Portal 4 - Green",
      resRef: "plc_mf286",
      tag: "PORTAL_GREEN",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_plc_mf286",
          resref: "plc_mf286",
          textureFileName: "fxpa_ring02.tga",
          textureDeliveryUrl: "/assets/fxpa_ring02.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "portal-source",
                sourceModelFileName: "plc_mf286.mdl",
                sourceModelObjectKey: "modules/current/models/plc_mf286.mdl",
                nodeName: "omenemitter265",
                texture: "fxpa_ring02",
                emitterType: "Single",
                renderMode: "Aligned_to_World_Z",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 1,
                  lifeExp: 6,
                  velocity: 0,
                  randvel: 0,
                  spread: 0,
                  particleRot: 4,
                  sizeStart: 2.5,
                  sizeEnd: 3.5,
                  alphaStart: 0.2,
                  alphaEnd: 0.2,
                  colorStart: [0, 6, 0],
                  colorEnd: [0, 3, 0]
                },
                sourceState: {
                  loop: true,
                  twoSidedTexture: true,
                  isTinted: false
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    let portalMesh: THREE.Mesh | null = null;
    let portalMaterial: THREE.MeshBasicMaterial | null = null;
    let portalMeshCount = 0;
    root?.traverse((node) => {
      if (node instanceof THREE.Mesh && node.userData?.vfxPreviewRole === "world-z-aligned") {
        portalMeshCount += 1;
        portalMesh ??= node;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        if (!portalMaterial && material instanceof THREE.MeshBasicMaterial) {
          portalMaterial = material;
        }
      }
    });

    expect(root?.userData.auroraEmitterParticleCount).toBe(1);
    expect(root?.userData.auroraEmitterLoopEmission).toBe(true);
    expect(root?.userData.auroraEmitterSinglePreviewMode).toBe(
      "aurora-single-loop-age-reset-existing-particle"
    );
    expect(root?.userData.auroraEmitterSingleDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_SINGLE_MAX_ONE_ACTIVE_REQUIRED",
        "VFX_SINGLE_LOOP_AGE_RESET_REQUIRED",
        "VFX_SINGLE_LOOP_DOES_NOT_ALLOCATE_REPLACEMENT",
        "VFX_SINGLE_LOOP_NOT_POC_RESPAWN"
      ])
    );
    expect(portalMeshCount).toBe(1);
    expect(portalMesh).not.toBeNull();
    expect(portalMaterial).not.toBeNull();
    const initialPortalScaleX = portalMesh!.scale.x;
    expect(readAuroraVertexColorSource(portalMesh!)?.[1]).toBeCloseTo(6, 4);
    expect(portalMesh!.geometry.userData.auroraVfxParticleVertexColorIntensity).toBeCloseTo(6, 4);
    expect(portalMesh!.geometry.userData.auroraVfxParticleVertexColorHdrPreviewMode).toBe(
      "aurora-hdr-color-vector-preserved"
    );
    expect(portalMesh!.geometry.userData.auroraVfxLightenAlphaRgbPreviewMode).toBe(
      "lighten-rgb-scaled-by-particle-alpha"
    );
    expect(portalMesh!.geometry.userData.auroraVfxLightenAlphaRgbIntensity).toBeGreaterThan(1);
    expect(portalMesh!.geometry.userData.auroraVfxLightenAlphaRgbHdrPreviewMode).toBe(
      "aurora-hdr-color-vector-preserved"
    );
    expect(readFirstAuroraVertexColor(portalMesh!).g).toBeGreaterThan(1);
    expect(readFirstAuroraVertexColor(portalMesh!).g).toBeCloseTo(1.2, 4);
    expect(portalMesh!.geometry.userData.auroraVfxParticleVertexColorPackedPreview).toEqual([
      0,
      255,
      0,
      51
    ]);

    performanceNow.mockReturnValue(3000);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(2, 2, 3);
    camera.updateMatrixWorld();
    portalMesh!.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      camera,
      portalMesh!.geometry,
      portalMaterial!,
      null
    );
    expect(portalMesh!.scale.x).toBeGreaterThan(initialPortalScaleX);
    performanceNow.mockRestore();
  });

  it("mutes animation-scoped detonate events when another Aurora animation is selected", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_update_modes.tga",
      particleTexture
    );
    const object = {
      id: "preview:plc_scoped_detonate_vfx",
      kind: "placeables",
      name: "VFX SCOPED DETONATE",
      resRef: "scoped_detonate_vfx",
      tag: "SCOPED_DETONATE_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_scoped_detonate_vfx",
          resref: "scoped_detonate_vfx",
          textureFileName: "fxpa_update_modes.tga",
          textureDeliveryUrl: "/assets/fxpa_update_modes.tga",
          placeableRuntime: {
            state: {
              animationState: 4
            }
          },
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "scoped-detonate-source",
                sourceModelFileName: "scoped_detonate_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/scoped_detonate_vfx.mdl",
                nodeName: "scoped_detonate_particles",
                texture: "fxpa_update_modes",
                emitterType: "Explosion",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 4,
                  lifeExp: 1,
                  velocity: 0.8,
                  randvel: 0.6,
                  blastRadius: 2,
                  blastLength: 3
                },
                events: [
                  {
                    time: 0.25,
                    type: "detonate",
                    animationName: "impact"
                  }
                ],
                animations: [
                  {
                    animationName: "on",
                    lengthSeconds: 1,
                    transitionSeconds: 0
                  },
                  {
                    animationName: "impact",
                    lengthSeconds: 1,
                    transitionSeconds: 0
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterSelectedAnimationName).toBe("on");
    expect(root?.userData.auroraEmitterAnimationSelectionSource).toBe(
      "placeable-runtime-animation-state"
    );
    expect(root?.userData.auroraEmitterDetonatePreviewMode).toBe(
      "detonate-event-filtered-by-animation-muted"
    );
    expect(root?.userData.auroraEmitterDetonateEventFilterPreviewMode).toBe(
      "animation-scoped-detonate-events"
    );
    expect(root?.userData.auroraEmitterDetonateEventFilterAnimationName).toBe("on");
    expect(root?.userData.auroraEmitterDetonateEventSourceCount).toBe(1);
    expect(root?.userData.auroraEmitterDetonateEvents).toBeUndefined();
    expect(root?.userData.auroraEmitterParticleCount).toBe(0);
    expect(collectCameraBillboardParticles(root)).toHaveLength(0);
  });

  it("keeps Explosion detonate events silent when evaluated birthrate requests zero spawn", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_zero_burst.tga",
      particleTexture
    );
    const object = {
      id: "preview:plc_zero_burst_vfx",
      kind: "placeables",
      name: "VFX ZERO BURST",
      resRef: "zero_burst_vfx",
      tag: "ZERO_BURST_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_zero_burst_vfx",
          resref: "zero_burst_vfx",
          textureFileName: "fxpa_zero_burst.tga",
          textureDeliveryUrl: "/assets/fxpa_zero_burst.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "zero-burst-source",
                sourceModelFileName: "zero_burst_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/zero_burst_vfx.mdl",
                nodeName: "zero_burst_particles",
                texture: "fxpa_zero_burst",
                emitterType: "Explosion",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 0,
                  lifeExp: 1,
                  velocity: 0.8,
                  randvel: 0.2,
                  alphaStart: 1,
                  alphaEnd: 0
                },
                events: [
                  {
                    time: 0.25,
                    type: "detonate",
                    animationName: "impact"
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterUpdateMode).toBe("explosion");
    expect(root?.userData.auroraEmitterRequiresDetonateEvent).toBe(false);
    expect(root?.userData.auroraEmitterDetonatePreviewMode).toBe(
      "detonate-event-scheduled-muted-zero-spawn"
    );
    expect(root?.userData.auroraEmitterExplosionRequestedSpawnCount).toBe(0);
    expect(root?.userData.auroraEmitterParticleCount).toBe(0);
    expect(root?.userData.auroraEmitterDetonateEvents).toEqual([
      {
        time: 0.25,
        type: "detonate",
        animationName: "impact"
      }
    ]);
    expect(root?.userData.auroraEmitterDetonateDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_EXPLOSION_SPAWN_COUNT_NONZERO_GATE_REQUIRED",
        "VFX_EXPLOSION_BIRTHRATE_ZERO_GATE_REQUIRED",
        "VFX_EXPLOSION_DETONATE_LATCH_CLEAR_REQUIRED"
      ])
    );
    expect(collectCameraBillboardParticles(root)).toHaveLength(0);
  });

  it("uses Aurora detonate keyframes as explosion detonate latch events", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_detonate_key.tga",
      particleTexture
    );
    const detonateTimeline = [
      { time: 0, value: 0 },
      { time: 0.25, value: 1 }
    ];
    const object = {
      id: "preview:plc_detonate_key_vfx",
      kind: "placeables",
      name: "VFX DETONATE KEY",
      resRef: "detonate_key_vfx",
      tag: "DETONATE_KEY_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_detonate_key_vfx",
          resref: "detonate_key_vfx",
          textureFileName: "fxpa_detonate_key.tga",
          textureDeliveryUrl: "/assets/fxpa_detonate_key.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "detonate-key-source",
                sourceModelFileName: "detonate_key_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/detonate_key_vfx.mdl",
                nodeName: "detonate_key_particles",
                texture: "fxpa_detonate_key",
                emitterType: "Explosion",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 2,
                  lifeExp: 1,
                  velocity: 0.8,
                  randvel: 0.2,
                  alphaStart: 1,
                  alphaEnd: 0,
                  timeline: {
                    detonate: detonateTimeline
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterUpdateMode).toBe("explosion");
    expect(root?.userData.auroraEmitterRequiresDetonateEvent).toBe(false);
    expect(root?.userData.auroraEmitterDetonatePreviewMode).toBe(
      "detonate-event-scheduled-preview"
    );
    expect(root?.userData.auroraEmitterDetonateControllerTimeline).toEqual(
      detonateTimeline
    );
    expect(root?.userData.auroraEmitterDetonateControllerPreviewMode).toBe(
      "detonate-controller-latch-preview"
    );
    expect(root?.userData.auroraEmitterDetonateControllerEvents).toEqual([
      {
        time: 0.25,
        type: "detonatekey",
        animationName: undefined
      }
    ]);
    expect(root?.userData.auroraEmitterDetonateEvents).toEqual([
      {
        time: 0.25,
        type: "detonatekey",
        animationName: undefined
      }
    ]);
    expect(root?.userData.auroraEmitterSchedulePreviewMode).toBe(
      "source-detonate-event-local-clock"
    );
    expect(root?.userData.auroraEmitterParticleCount).toBeGreaterThan(0);
    expect(collectCameraBillboardParticles(root).length).toBeGreaterThan(0);
  });

  it("uses Aurora direct detonate scalar as a start-time explosion latch", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_detonate_direct.tga",
      particleTexture
    );
    const object = {
      id: "preview:plc_detonate_direct_vfx",
      kind: "placeables",
      name: "VFX DETONATE DIRECT",
      resRef: "detonate_direct_vfx",
      tag: "DETONATE_DIRECT_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_detonate_direct_vfx",
          resref: "detonate_direct_vfx",
          textureFileName: "fxpa_detonate_direct.tga",
          textureDeliveryUrl: "/assets/fxpa_detonate_direct.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "detonate-direct-source",
                sourceModelFileName: "detonate_direct_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/detonate_direct_vfx.mdl",
                nodeName: "detonate_direct_particles",
                texture: "fxpa_detonate_direct",
                emitterType: "Explosion",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 2,
                  lifeExp: 1,
                  detonate: 1,
                  velocity: 0.8,
                  randvel: 0.2,
                  alphaStart: 1,
                  alphaEnd: 0
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterUpdateMode).toBe("explosion");
    expect(root?.userData.auroraEmitterRequiresDetonateEvent).toBe(false);
    expect(root?.userData.auroraEmitterDetonatePreviewMode).toBe(
      "detonate-event-scheduled-preview"
    );
    expect(root?.userData.auroraEmitterDetonateControllerValue).toBe(1);
    expect(root?.userData.auroraEmitterDetonateControllerPreviewMode).toBe(
      "detonate-controller-latch-preview"
    );
    expect(root?.userData.auroraEmitterDetonateControllerEvents).toEqual([
      {
        time: 0,
        type: "detonate",
        animationName: undefined
      }
    ]);
    expect(root?.userData.auroraEmitterDetonateEvents).toEqual([
      {
        time: 0,
        type: "detonate",
        animationName: undefined
      }
    ]);
    expect(root?.userData.auroraEmitterSchedulePreviewMode).toBe(
      "source-detonate-event-local-clock"
    );
    expect(root?.userData.auroraEmitterParticleCount).toBeGreaterThan(0);
    expect(collectCameraBillboardParticles(root).length).toBeGreaterThan(0);
  });

  it("uses Aurora emitter update mode for single and explosion particle behavior", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_update_modes.tga",
      particleTexture
    );
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);

    const singleObject = {
      id: "preview:plc_single_vfx",
      kind: "placeables",
      name: "VFX SINGLE",
      resRef: "single_vfx",
      tag: "SINGLE_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const explosionObject = {
      ...singleObject,
      id: "preview:plc_explosion_vfx",
      name: "VFX EXPLOSION",
      resRef: "explosion_vfx",
      tag: "EXPLOSION_VFX",
      x: 0.7
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const detonateObject = {
      ...singleObject,
      id: "preview:plc_detonate_vfx",
      name: "VFX DETONATE",
      resRef: "detonate_vfx",
      tag: "DETONATE_VFX",
      x: 0.9
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];
    const lightningObject = {
      ...singleObject,
      id: "preview:plc_lightning_vfx",
      name: "VFX LIGHTNING",
      resRef: "lightning_vfx",
      tag: "LIGHTNING_VFX",
      x: 1.1
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

    rebuildObjectMeshes(
      runtime,
      [singleObject, explosionObject, detonateObject, lightningObject],
      [],
      createDebugState(),
      1,
      false,
      10,
      [],
      false,
      {
        [singleObject.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_single_vfx",
          resref: "single_vfx",
          textureFileName: "fxpa_update_modes.tga",
          textureDeliveryUrl: "/assets/fxpa_update_modes.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "single-source",
                sourceModelFileName: "single_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/single_vfx.mdl",
                nodeName: "single_particle",
                texture: "fxpa_update_modes",
                emitterType: "Single",
                renderMode: "Normal",
                blendMode: "Normal",
                simulation: {
                  birthrate: 24,
                  lifeExp: 5,
                  velocity: 1
                },
                sourceState: {
                  loop: false
                }
              }
            ]
          }
        }),
        [explosionObject.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_explosion_vfx",
          resref: "explosion_vfx",
          textureFileName: "fxpa_update_modes.tga",
          textureDeliveryUrl: "/assets/fxpa_update_modes.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "explosion-source",
                sourceModelFileName: "explosion_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/explosion_vfx.mdl",
                nodeName: "explosion_particles",
                texture: "fxpa_update_modes",
                emitterType: "Explosion",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 4,
                  lifeExp: 1,
                  velocity: 0.8,
                  randvel: 0.6
                }
              }
            ]
          }
        }),
        [detonateObject.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_detonate_vfx",
          resref: "detonate_vfx",
          textureFileName: "fxpa_update_modes.tga",
          textureDeliveryUrl: "/assets/fxpa_update_modes.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "detonate-source",
                sourceModelFileName: "detonate_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/detonate_vfx.mdl",
                nodeName: "detonate_particles",
                texture: "fxpa_update_modes",
                emitterType: "Explosion",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 4,
                  lifeExp: 1,
                  velocity: 0.8,
                  randvel: 0.6,
                  blastRadius: 2,
                  blastLength: 3
                },
                events: [
                  {
                    time: 0.25,
                    type: "detonate",
                    animationName: "impact"
                  }
                ]
              }
            ]
          }
        }),
        [lightningObject.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_lightning_vfx",
          resref: "lightning_vfx",
          textureFileName: "fxpa_update_modes.tga",
          textureDeliveryUrl: "/assets/fxpa_update_modes.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "lightning-source",
                sourceModelFileName: "lightning_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/lightning_vfx.mdl",
                nodeName: "lightning_particles",
                texture: "fxpa_update_modes",
                emitterType: "Lightning",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 1,
                  lifeExp: 1,
                  lightningScale: 2,
                  lightningDelay: 0.4,
                  lightningRadius: 0.75
                }
              }
            ]
          }
        })
      }
    );

    const singleRoot = runtime.objectMeshById.get(singleObject.id);
    const explosionRoot = runtime.objectMeshById.get(explosionObject.id);
    const detonateRoot = runtime.objectMeshById.get(detonateObject.id);
    const lightningRoot = runtime.objectMeshById.get(lightningObject.id);
    expect(singleRoot?.userData.auroraEmitterUpdateMode).toBe("single");
    expect(singleRoot?.userData.auroraEmitterUpdateModePreviewMode).toBe(
      "aurora-update-mode-preview"
    );
    expect(singleRoot?.userData.auroraEmitterParticleCount).toBe(1);
    expect(singleRoot?.userData.auroraEmitterSinglePreviewMode).toBe(
      "aurora-single-max-one-active"
    );
    expect(singleRoot?.userData.auroraEmitterSingleDiagnostics).toEqual(
      expect.arrayContaining(["VFX_SINGLE_MAX_ONE_ACTIVE_REQUIRED"])
    );
    expect(explosionRoot?.userData.auroraEmitterUpdateMode).toBe("explosion");
    expect(explosionRoot?.userData.auroraEmitterRequiresDetonateEvent).toBe(true);
    expect(explosionRoot?.userData.auroraEmitterDetonatePreviewMode).toBe(
      "detonate-event-required-muted"
    );
    expect(explosionRoot?.userData.auroraEmitterParticleCount).toBe(0);
    expect(explosionRoot?.userData.auroraEmitterDetonateDiagnostics).toEqual(
      expect.arrayContaining([
        "VFX_EXPLOSION_NO_DETONATE_NO_FALLBACK_BURST",
        "VFX_POC_EXPLOSION_FALLBACK_BURST_PREVIEW_ONLY",
        "VFX_EXPLOSION_DETONATE_LATCH_CLEAR_REQUIRED"
      ])
    );
    expect(detonateRoot?.userData.auroraEmitterUpdateMode).toBe("explosion");
    expect(detonateRoot?.userData.auroraEmitterRequiresDetonateEvent).toBe(false);
    expect(detonateRoot?.userData.auroraEmitterDetonatePreviewMode).toBe(
      "detonate-event-scheduled-preview"
    );
    expect(detonateRoot?.userData.auroraEmitterDetonateEvents).toEqual([
      {
        time: 0.25,
        type: "detonate",
        animationName: "impact"
      }
    ]);
    expect(detonateRoot?.userData.auroraEmitterBlastRadius).toBeCloseTo(1, 5);
    expect(detonateRoot?.userData.auroraEmitterBlastLength).toBeCloseTo(1.5, 5);
    expect(detonateRoot?.userData.auroraEmitterBlastPreviewMode).toBe(
      "blast-radius-length-preview"
    );
    expect(lightningRoot?.userData.auroraEmitterUpdateMode).toBe("lightning");
    expect(lightningRoot?.userData.auroraEmitterLightningScale).toBe(2);
    expect(lightningRoot?.userData.auroraEmitterLightningDelay).toBeCloseTo(0.4, 5);
    expect(lightningRoot?.userData.auroraEmitterLightningRadius).toBeCloseTo(0.375, 5);
    expect(lightningRoot?.userData.auroraEmitterLightningPreviewMode).toBe(
      "lightning-controller-preview"
    );
    expect(lightningRoot?.userData.auroraEmitterLifeSeconds).toBeCloseTo(0.4, 5);

    const singleParticles = collectCameraBillboardParticles(singleRoot);
    const explosionParticles = collectCameraBillboardParticles(explosionRoot);
    const detonateParticles = collectCameraBillboardParticles(detonateRoot);

    expect(singleParticles).toHaveLength(1);
    expectAuroraCameraBillboardQuad(singleParticles[0]!.mesh);
    expect(explosionParticles).toHaveLength(0);
    expect(detonateParticles.length).toBeGreaterThan(0);
    expectAuroraCameraBillboardQuad(detonateParticles[0]!.mesh);
    expect(detonateParticles[0]?.material.opacity).toBe(0);
    expect(readFirstAuroraVertexAlpha(detonateParticles[0]!.mesh)).toBe(0);

    performanceNow.mockReturnValue(300);
    detonateParticles[0]?.mesh.onBeforeRender(
      {} as THREE.WebGLRenderer,
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
      detonateParticles[0].mesh.geometry,
      detonateParticles[0].material,
      null
    );
    expect(detonateParticles[0]?.material.opacity).toBeGreaterThan(0);
    expect(readFirstAuroraVertexAlpha(detonateParticles[0]!.mesh)).toBeGreaterThan(0);
    performanceNow.mockRestore();
  });

  it("uses Aurora lightning keyframes as peak profile controllers when constants are absent", () => {
    const load = vi.fn();
    const runtime = createRuntime(load);
    const particleTexture = new THREE.Texture();
    runtime.placeableTextureCacheByUrl.set(
      "http://localhost:3000/assets/fxpa_lightning_key.tga",
      particleTexture
    );
    const object = {
      id: "preview:plc_lightning_key_vfx",
      kind: "placeables",
      name: "VFX LIGHTNING KEY",
      resRef: "lightning_key_vfx",
      tag: "LIGHTNING_KEY_VFX",
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
    } as unknown as Parameters<typeof rebuildObjectMeshes>[1][number];

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
        [object.id]: createVfxPayloadWithReadyModel({
          includeTextureContract: true,
          templateId: "plc_lightning_key_vfx",
          resref: "lightning_key_vfx",
          textureFileName: "fxpa_lightning_key.tga",
          textureDeliveryUrl: "/assets/fxpa_lightning_key.tga",
          auroraEmitter: {
            source: "source-mdl",
            diagnostics: [],
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: "lightning-key-source",
                sourceModelFileName: "lightning_key_vfx.mdl",
                sourceModelObjectKey: "modules/current/models/lightning_key_vfx.mdl",
                nodeName: "lightning_key_particles",
                texture: "fxpa_lightning_key",
                emitterType: "Lightning",
                renderMode: "Normal",
                blendMode: "Lighten",
                simulation: {
                  birthrate: 1,
                  lifeExp: 1,
                  timeline: {
                    lightningScale: [
                      { time: 0, value: 1 },
                      { time: 0.5, value: 3 }
                    ],
                    lightningDelay: [
                      { time: 0, value: 0.1 },
                      { time: 0.5, value: 0.8 }
                    ],
                    lightningRadius: [
                      { time: 0, value: 0.25 },
                      { time: 0.5, value: 0.75 }
                    ]
                  }
                }
              }
            ]
          }
        })
      }
    );

    const root = runtime.objectMeshById.get(object.id);
    expect(root?.userData.auroraEmitterUpdateMode).toBe("lightning");
    expect(root?.userData.auroraEmitterLightningScale).toBe(3);
    expect(root?.userData.auroraEmitterLightningDelay).toBeCloseTo(0.8, 5);
    expect(root?.userData.auroraEmitterLightningRadius).toBeCloseTo(0.375, 5);
    expect(root?.userData.auroraEmitterLightningTimelinePreviewMode).toBe(
      "aurora-lightning-keyframe-peak-profile-preview"
    );
    expect(root?.userData.auroraEmitterLightningScaleTimeline).toEqual([
      { time: 0, value: 1 },
      { time: 0.5, value: 3 }
    ]);
    expect(root?.userData.auroraEmitterLightningDelayTimeline).toEqual([
      { time: 0, value: 0.1 },
      { time: 0.5, value: 0.8 }
    ]);
    expect(root?.userData.auroraEmitterLightningRadiusTimeline).toEqual([
      { time: 0, value: 0.25 },
      { time: 0.5, value: 0.75 }
    ]);
    expect(root?.userData.auroraEmitterLifeSeconds).toBeCloseTo(0.8, 5);
    expect(root?.userData.auroraEmitterParticleCount).toBe(1);
  });
});
