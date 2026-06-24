import * as THREE from "three";
import type {
  AuroraVfxPayload,
  SceneObjectVfxDiagnostic
} from "../../../scene/contracts";

export interface AuroraVfxCanonicalRenderOptions {
  particleTexturesByReference?: ReadonlyMap<string, THREE.Texture>;
  objectRadius?: number;
}

interface AuroraVfxRuntimeRenderContractRecord {
  version: "aurora-vfx-runtime-render-contract/v1";
  activeParticleCount: number;
  drawParticleCount: number;
  verticesPerDrawParticle: 0 | 6;
  drawVertexCount: number;
  drawLane: "textured_quad" | "linked_textured_quad" | "chunk_model";
  renderMode: {
    enum?: string;
    rawToken?: string;
  };
  blendMode: {
    enum?: string;
    rawToken?: string;
    modeNumber?: number;
  };
  renderState?: Record<string, unknown>;
  renderOrder: {
    value: number;
    rawValue?: number;
  };
  drawRecords: AuroraParticleDrawRecordLike[];
  diagnostics: SceneObjectVfxDiagnostic[];
}

interface AuroraVfxRenderedBounds {
  width: number;
  height: number;
  depth: number;
  centerX: number;
  centerY: number;
  centerZ: number;
}

interface AuroraVfxRenderedMaterialState {
  transparent: boolean;
  depthWrite: boolean;
  depthTest: boolean;
  alphaTest: number;
  opacity: number;
  colorHex: string;
  blending: "normal" | "custom";
  blendSrc: string;
  blendDst: string;
  blendEquation: string;
  mapBound: boolean;
  mapReference: string;
  vertexColors: boolean;
  side: string;
  status: string;
}

interface AuroraParticleDrawRecordLike {
  recordKind: "aurora-particle-draw-record";
  drawRecordId: string;
  emitterNodeName?: string;
  lane: "textured_quad" | "linked_textured_quad";
  particleId: number;
  particleIndex: number;
  verticesPerParticle: 6;
  vertexCount: 6;
  position: AuroraVector3Like;
  velocity: AuroraVector3Like;
  rotationRadians: number;
  color: AuroraColorLike;
  alpha: number;
  size: {
    x: number;
    y: number;
  };
  atlasUv: AuroraAtlasUvLike;
  renderMode?: {
    enum?: string;
    rawToken?: string;
  };
  blendMode?: {
    enum?: string;
    rawToken?: string;
    modeNumber?: number;
  };
  renderOrder?: {
    value: number;
    rawValue?: number;
  };
  pltLayer?: string;
  pltLayerColorSource?: string;
  diagnostics?: SceneObjectVfxDiagnostic[];
}

interface AuroraVector3Like {
  x: number;
  y: number;
  z: number;
}

interface AuroraColorLike {
  r: number;
  g: number;
  b: number;
}

interface AuroraAtlasUvLike {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  frameIndex: number;
  rawFrameIndex: number;
  mapping: string;
}

const CANONICAL_TEXTURE_MISSING_DIAGNOSTIC: SceneObjectVfxDiagnostic = {
  code: "VFX_CANONICAL_TEXTURE_RESOURCE_MISSING",
  severity: "warn",
  message:
    "Canonical VFX draw records require a resolved texture; frontend kept a diagnostic placeholder and skipped particle draw geometry."
};

const CANONICAL_CHUNK_LANE_DIAGNOSTIC: SceneObjectVfxDiagnostic = {
  code: "VFX_CANONICAL_CHUNK_LANE_RENDERER_PENDING",
  severity: "warn",
  message:
    "Canonical VFX chunk lane is preserved separately from textured quad particles; frontend chunk model rendering is not implemented in this slice."
};

export function isCanonicalAuroraVfxRenderablePayload(
  payload: AuroraVfxPayload | undefined
): boolean {
  return (
    payload?.canonicalStatus === "canonical" &&
    payload.backendCanonical === true &&
    readAuroraVfxRuntimeRenderContract(payload) !== null
  );
}

export function createAuroraVfxCanonicalRenderGroup(
  payload: AuroraVfxPayload,
  options: AuroraVfxCanonicalRenderOptions = {}
): THREE.Group {
  const contract = readAuroraVfxRuntimeRenderContract(payload);
  const group = new THREE.Group();
  if (!contract) {
    group.userData = buildCanonicalRootUserData(payload, null, {
      diagnostics: [
        {
          code: "VFX_CANONICAL_RENDER_CONTRACT_REQUIRED",
          severity: "error",
          message:
            "Canonical VFX payload did not contain a renderer-agnostic runtime render contract."
        }
      ],
      renderedDrawParticleCount: 0,
      renderedVertexCount: 0,
      textureStatus: "missing-render-contract",
      materialState: null
    });
    group.add(createDiagnosticPlaceholder(options.objectRadius, group.userData.auroraVfxDiagnosticCodes));
    return group;
  }

  if (contract.drawLane === "chunk_model") {
    const diagnostics = mergeDiagnostics([
      ...collectPayloadDiagnostics(payload),
      ...payload.diagnostics.renderContract,
      ...contract.diagnostics,
      CANONICAL_CHUNK_LANE_DIAGNOSTIC
    ]);
    group.userData = buildCanonicalRootUserData(payload, contract, {
      diagnostics,
      renderedDrawParticleCount: 0,
      renderedVertexCount: 0,
      textureStatus: "chunk-lane-preserved",
      materialState: null
    });
    const placeholder = createDiagnosticPlaceholder(
      options.objectRadius,
      diagnostics.map((diagnostic) => diagnostic.code)
    );
    placeholder.userData = {
      ...placeholder.userData,
      auroraVfxCanonicalChunkLanePlaceholder: true,
      auroraVfxCanonicalTexturedQuadLane: false
    };
    group.add(placeholder);
    return group;
  }

  const textureReference = resolveAuroraVfxCanonicalTextureReference(payload);
  const texture = resolveTexture(options.particleTexturesByReference, textureReference);
  if (!texture) {
    const diagnostics = mergeDiagnostics([
      ...collectPayloadDiagnostics(payload),
      ...payload.diagnostics.renderContract,
      ...contract.diagnostics,
      ...contract.drawRecords.flatMap((record) => record.diagnostics ?? []),
      CANONICAL_TEXTURE_MISSING_DIAGNOSTIC
    ]);
    group.userData = buildCanonicalRootUserData(payload, contract, {
      diagnostics,
      renderedDrawParticleCount: 0,
      renderedVertexCount: 0,
      textureReference,
      textureStatus: "missing",
      materialState: null
    });
    group.add(
      createDiagnosticPlaceholder(
        options.objectRadius,
        diagnostics.map((diagnostic) => diagnostic.code)
      )
    );
    return group;
  }

  const drawRecords = contract.drawRecords.filter(isTexturedQuadDrawRecord);
  const geometry = buildCanonicalTexturedQuadGeometry(drawRecords);
  const renderedBounds = readGeometryBounds(geometry);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    vertexColors: true,
    side: THREE.DoubleSide
  });
  const materialState = applyRenderContractMaterialAdapterState(material, contract, textureReference);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = contract.renderOrder.value;
  mesh.userData = {
    auroraVfxRenderer: "canonical",
    auroraVfxCanonicalRenderer: true,
    auroraVfxPreviewRenderer: false,
    auroraVfxCanonicalDrawMesh: true,
    auroraVfxCanonicalDrawLane: contract.drawLane,
    auroraVfxCanonicalTextureReference: textureReference,
    auroraVfxCanonicalTextureStatus: "applied",
    auroraVfxCanonicalDrawParticleCount: drawRecords.length,
    auroraVfxCanonicalDrawVertexCount: geometry.getAttribute("position").count,
    auroraVfxCanonicalVerticesPerParticle: 6,
    auroraVfxCanonicalDrawRecordIds: drawRecords.map((record) => record.drawRecordId),
    auroraVfxCanonicalEmitterNodeNames: drawRecords.map((record) => record.emitterNodeName ?? ""),
    auroraVfxCanonicalDrawRecordLanes: drawRecords.map((record) => record.lane),
    auroraVfxCanonicalParticleIds: drawRecords.map((record) => record.particleId),
    auroraVfxCanonicalParticleIndexes: drawRecords.map((record) => record.particleIndex),
    auroraVfxCanonicalPositionX: drawRecords.map((record) => record.position.x),
    auroraVfxCanonicalPositionY: drawRecords.map((record) => record.position.y),
    auroraVfxCanonicalPositionZ: drawRecords.map((record) => record.position.z),
    auroraVfxCanonicalVelocityX: drawRecords.map((record) => record.velocity.x),
    auroraVfxCanonicalVelocityY: drawRecords.map((record) => record.velocity.y),
    auroraVfxCanonicalVelocityZ: drawRecords.map((record) => record.velocity.z),
    auroraVfxCanonicalRotationRadians: drawRecords.map((record) => record.rotationRadians),
    auroraVfxCanonicalColorR: drawRecords.map((record) => record.color.r),
    auroraVfxCanonicalColorG: drawRecords.map((record) => record.color.g),
    auroraVfxCanonicalColorB: drawRecords.map((record) => record.color.b),
    auroraVfxCanonicalParticleSizeX: drawRecords.map((record) => record.size.x),
    auroraVfxCanonicalParticleSizeY: drawRecords.map((record) => record.size.y),
    auroraVfxCanonicalAlpha: drawRecords.map((record) => record.alpha),
    auroraVfxCanonicalRecordVerticesPerParticle: drawRecords.map(
      (record) => record.verticesPerParticle
    ),
    auroraVfxCanonicalPltLayers: drawRecords.map((record) => record.pltLayer ?? ""),
    auroraVfxCanonicalPltLayerColorSources: drawRecords.map(
      (record) => record.pltLayerColorSource ?? ""
    ),
    auroraVfxCanonicalAtlasFrames: drawRecords.map((record) => record.atlasUv.frameIndex),
    auroraVfxCanonicalAtlasUvU0: drawRecords.map((record) => record.atlasUv.u0),
    auroraVfxCanonicalAtlasUvV0: drawRecords.map((record) => record.atlasUv.v0),
    auroraVfxCanonicalAtlasUvU1: drawRecords.map((record) => record.atlasUv.u1),
    auroraVfxCanonicalAtlasUvV1: drawRecords.map((record) => record.atlasUv.v1),
    auroraVfxCanonicalRenderMode: contract.renderMode.enum ?? "unknown",
    auroraVfxCanonicalRenderModeRawToken: contract.renderMode.rawToken ?? "",
    auroraVfxCanonicalBlendMode: contract.blendMode.enum ?? "unknown",
    auroraVfxCanonicalBlendModeRawToken: contract.blendMode.rawToken ?? "",
    auroraVfxCanonicalRenderOrder: contract.renderOrder.value,
    auroraVfxCanonicalMaterialTransparent: materialState.transparent,
    auroraVfxCanonicalMaterialDepthWrite: materialState.depthWrite,
    auroraVfxCanonicalMaterialDepthTest: materialState.depthTest,
    auroraVfxCanonicalMaterialAlphaTest: materialState.alphaTest,
    auroraVfxCanonicalMaterialOpacity: materialState.opacity,
    auroraVfxCanonicalMaterialColorHex: materialState.colorHex,
    auroraVfxCanonicalMaterialBlending: materialState.blending,
    auroraVfxCanonicalMaterialMapBound: materialState.mapBound,
    auroraVfxCanonicalMaterialMapReference: materialState.mapReference,
    auroraVfxCanonicalMaterialVertexColors: materialState.vertexColors,
    auroraVfxCanonicalMaterialSide: materialState.side,
    auroraVfxThreeMaterialSourceTruth: false,
    auroraVfxMaterialAdapterSource: "aurora-render-contract",
    auroraVfxRetailParityProof: false
  };

  const diagnostics = mergeDiagnostics([
    ...collectPayloadDiagnostics(payload),
    ...payload.diagnostics.renderContract,
    ...contract.diagnostics,
    ...drawRecords.flatMap((record) => record.diagnostics ?? [])
  ]);
  group.userData = buildCanonicalRootUserData(payload, contract, {
    diagnostics,
    renderedDrawParticleCount: drawRecords.length,
    renderedVertexCount: geometry.getAttribute("position").count,
    renderedBounds,
    textureReference,
    textureStatus: "applied",
    materialState
  });
  group.add(mesh);
  return group;
}

export function resolveAuroraVfxCanonicalTextureReference(
  payload: AuroraVfxPayload
): string | null {
  const dependencyGraph = payload.contracts.dependencyGraph;
  if (!isRecord(dependencyGraph) || !Array.isArray(dependencyGraph.edges)) {
    return null;
  }
  for (const edge of dependencyGraph.edges) {
    if (!isRecord(edge)) {
      continue;
    }
    const edgeType = readString(edge.edgeType);
    const requestedClass = readString(edge.requestedResourceClass);
    if (edgeType !== "texture" && requestedClass !== "texture") {
      continue;
    }
    const selectedCandidate = isRecord(edge.selectedCandidate)
      ? edge.selectedCandidate
      : undefined;
    const selectedResourceKey = readString(selectedCandidate?.resourceKey);
    const requestedRef = readString(edge.requestedRef);
    const reference = normalizeResourceReference(selectedResourceKey || requestedRef);
    if (reference) {
      return reference;
    }
  }
  return null;
}

function readAuroraVfxRuntimeRenderContract(
  payload: AuroraVfxPayload
): AuroraVfxRuntimeRenderContractRecord | null {
  const contract = payload.contracts.renderContract;
  if (!isRecord(contract)) {
    return null;
  }
  if (contract.version !== "aurora-vfx-runtime-render-contract/v1") {
    return null;
  }
  const drawLane = readDrawLane(contract.drawLane);
  const verticesPerDrawParticle = readVerticesPerParticle(contract.verticesPerDrawParticle);
  const drawRecords = Array.isArray(contract.drawRecords)
    ? contract.drawRecords.flatMap((entry) => readDrawRecord(entry))
    : [];
  return {
    version: "aurora-vfx-runtime-render-contract/v1",
    activeParticleCount: readFiniteNumber(contract.activeParticleCount, 0),
    drawParticleCount: readFiniteNumber(contract.drawParticleCount, drawRecords.length),
    verticesPerDrawParticle,
    drawVertexCount: readFiniteNumber(
      contract.drawVertexCount,
      drawRecords.length * verticesPerDrawParticle
    ),
    drawLane,
    renderMode: readModeRecord(contract.renderMode),
    blendMode: readModeRecord(contract.blendMode),
    ...(isRecord(contract.renderState) ? { renderState: contract.renderState } : {}),
    renderOrder: readRenderOrder(contract.renderOrder),
    drawRecords,
    diagnostics: normalizeDiagnostics(contract.diagnostics)
  };
}

function readDrawRecord(value: unknown): AuroraParticleDrawRecordLike[] {
  if (!isRecord(value) || value.recordKind !== "aurora-particle-draw-record") {
    return [];
  }
  const lane = readDrawLane(value.lane);
  if (lane === "chunk_model") {
    return [];
  }
  const position = readVector3(value.position);
  const velocity = readVector3(value.velocity) ?? { x: 0, y: 0, z: 0 };
  const color = readColor(value.color);
  const size = readSize(value.size);
  const atlasUv = readAtlasUv(value.atlasUv);
  const atlasProvenance = isRecord(value.atlasProvenance) ? value.atlasProvenance : null;
  if (!position || !color || !size || !atlasUv) {
    return [];
  }
  return [
    {
      recordKind: "aurora-particle-draw-record",
      drawRecordId: readString(value.drawRecordId) || `particle:${readFiniteNumber(value.particleId, 0)}`,
      emitterNodeName: readString(value.emitterNodeName),
      lane,
      particleId: readFiniteNumber(value.particleId, 0),
      particleIndex: readFiniteNumber(value.particleIndex, 0),
      verticesPerParticle: 6,
      vertexCount: 6,
      position,
      velocity,
      rotationRadians: readFiniteNumber(value.rotationRadians, 0),
      color,
      alpha: clamp(readFiniteNumber(value.alpha, 1), 0, 1),
      size,
      atlasUv,
      renderMode: readModeRecord(value.renderMode),
      blendMode: readModeRecord(value.blendMode),
      renderOrder: readRenderOrder(value.renderOrder),
      pltLayer: readString(value.pltLayer) || readString(atlasProvenance?.pltLayer),
      pltLayerColorSource:
        readString(value.pltLayerColorSource) || readString(atlasProvenance?.pltLayerColorSource),
      diagnostics: normalizeDiagnostics(value.diagnostics)
    }
  ];
}

function buildCanonicalTexturedQuadGeometry(
  drawRecords: AuroraParticleDrawRecordLike[]
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const alphas: number[] = [];
  const sizes: number[] = [];
  const frameIndices: number[] = [];
  const drawRecordIndices: number[] = [];

  drawRecords.forEach((record, drawRecordIndex) => {
    const halfWidth = Math.max(0, record.size.x) * 0.5;
    const halfHeight = Math.max(0, record.size.y) * 0.5;
    const z = record.position.z;
    const rotationCos = Math.cos(record.rotationRadians);
    const rotationSin = Math.sin(record.rotationRadians);
    const rotateLocalPoint = (x: number, y: number): [number, number, number] => [
      record.position.x + x * rotationCos - y * rotationSin,
      record.position.y + x * rotationSin + y * rotationCos,
      z
    ];
    const vertexPositions = [
      rotateLocalPoint(-halfWidth, -halfHeight),
      rotateLocalPoint(halfWidth, -halfHeight),
      rotateLocalPoint(-halfWidth, halfHeight),
      rotateLocalPoint(-halfWidth, halfHeight),
      rotateLocalPoint(halfWidth, -halfHeight),
      rotateLocalPoint(halfWidth, halfHeight)
    ];
    const atlas = record.atlasUv;
    const vertexUvs = [
      [atlas.u0, atlas.v0],
      [atlas.u1, atlas.v0],
      [atlas.u0, atlas.v1],
      [atlas.u0, atlas.v1],
      [atlas.u1, atlas.v0],
      [atlas.u1, atlas.v1]
    ];
    vertexPositions.forEach((position, vertexIndex) => {
      positions.push(position[0]!, position[1]!, position[2]!);
      uvs.push(vertexUvs[vertexIndex]![0]!, vertexUvs[vertexIndex]![1]!);
      colors.push(record.color.r, record.color.g, record.color.b);
      alphas.push(record.alpha);
      sizes.push(record.size.x, record.size.y);
      frameIndices.push(record.atlasUv.frameIndex);
      drawRecordIndices.push(drawRecordIndex);
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
  geometry.setAttribute("auroraAlpha", new THREE.BufferAttribute(new Float32Array(alphas), 1));
  geometry.setAttribute("auroraParticleSize", new THREE.BufferAttribute(new Float32Array(sizes), 2));
  geometry.setAttribute(
    "auroraAtlasFrameIndex",
    new THREE.BufferAttribute(new Float32Array(frameIndices), 1)
  );
  geometry.setAttribute(
    "auroraDrawRecordIndex",
    new THREE.BufferAttribute(new Float32Array(drawRecordIndices), 1)
  );
  const positionAttribute = geometry.getAttribute("position");
  const colorAttribute = geometry.getAttribute("color");
  const alphaAttribute = geometry.getAttribute("auroraAlpha");
  const particleSizeAttribute = geometry.getAttribute("auroraParticleSize");
  const atlasFrameAttribute = geometry.getAttribute("auroraAtlasFrameIndex");
  const drawRecordIndexAttribute = geometry.getAttribute("auroraDrawRecordIndex");
  const uvAttribute = geometry.getAttribute("uv");
  const positionXRange = readAttributeComponentRange(positionAttribute, 0);
  const positionYRange = readAttributeComponentRange(positionAttribute, 1);
  const positionZRange = readAttributeComponentRange(positionAttribute, 2);
  const colorRRange = readAttributeComponentRange(colorAttribute, 0);
  const colorGRange = readAttributeComponentRange(colorAttribute, 1);
  const colorBRange = readAttributeComponentRange(colorAttribute, 2);
  const alphaRange = readAttributeComponentRange(alphaAttribute, 0);
  const particleSizeXRange = readAttributeComponentRange(particleSizeAttribute, 0);
  const particleSizeYRange = readAttributeComponentRange(particleSizeAttribute, 1);
  const uvURange = readAttributeComponentRange(uvAttribute, 0);
  const uvVRange = readAttributeComponentRange(uvAttribute, 1);
  const uniqueAtlasFrameCount = new Set(frameIndices).size;
  const uniqueDrawRecordIndexCount = new Set(drawRecordIndices).size;
  const drawRecordIndexBucketStats = readDrawRecordIndexBucketStats(drawRecordIndices);
  const positionBucketStats = readPerDrawRecordUniqueTupleStats(drawRecordIndices, positions, 3);
  const colorBucketStats = readPerDrawRecordUniqueTupleStats(drawRecordIndices, colors, 3);
  const alphaBucketStats = readPerDrawRecordUniqueValueStats(drawRecordIndices, alphas);
  const particleSizeBucketStats = readPerDrawRecordUniqueTupleStats(
    drawRecordIndices,
    sizes,
    2
  );
  const atlasFrameBucketStats = readPerDrawRecordUniqueValueStats(drawRecordIndices, frameIndices);
  const uvBucketStats = readPerDrawRecordUniqueTupleStats(drawRecordIndices, uvs, 2);
  geometry.userData = {
    auroraVfxRenderer: "canonical",
    auroraVfxCanonicalTexturedQuadGeometry: true,
    auroraVfxCanonicalNonIndexedDrawArrays: true,
    auroraVfxCanonicalIndexedDrawArrays: false,
    auroraVfxCanonicalDrawModeArgument: 3,
    auroraVfxCanonicalDrawModeArgumentSource: "aurora-draw-wrapper-mode-arg3",
    auroraVfxCanonicalVerticesPerParticle: 6,
    auroraVfxCanonicalVertexCount: positions.length / 3,
    auroraVfxCanonicalParticleCount: drawRecords.length,
    auroraVfxCanonicalAtlasUvSource: "aurora-particle-draw-record",
    auroraVfxCanonicalPositionAttributeCount: positionAttribute.count,
    auroraVfxCanonicalPositionAttributeItemSize: positionAttribute.itemSize,
    auroraVfxCanonicalPositionAttributeXMin: positionXRange.min,
    auroraVfxCanonicalPositionAttributeXMax: positionXRange.max,
    auroraVfxCanonicalPositionAttributeYMin: positionYRange.min,
    auroraVfxCanonicalPositionAttributeYMax: positionYRange.max,
    auroraVfxCanonicalPositionAttributeZMin: positionZRange.min,
    auroraVfxCanonicalPositionAttributeZMax: positionZRange.max,
    auroraVfxCanonicalPositionAttributeMinUniqueValuesPerRecord:
      positionBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalPositionAttributeMaxUniqueValuesPerRecord:
      positionBucketStats.maxUniqueValuesPerRecord,
    auroraVfxCanonicalColorAttributeCount: colorAttribute.count,
    auroraVfxCanonicalColorAttributeItemSize: colorAttribute.itemSize,
    auroraVfxCanonicalColorAttributeUniqueCount: countUniqueAttributeTuples(colorAttribute),
    auroraVfxCanonicalColorAttributeRMin: colorRRange.min,
    auroraVfxCanonicalColorAttributeRMax: colorRRange.max,
    auroraVfxCanonicalColorAttributeGMin: colorGRange.min,
    auroraVfxCanonicalColorAttributeGMax: colorGRange.max,
    auroraVfxCanonicalColorAttributeBMin: colorBRange.min,
    auroraVfxCanonicalColorAttributeBMax: colorBRange.max,
    auroraVfxCanonicalColorAttributeMinUniqueValuesPerRecord:
      colorBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalColorAttributeMaxUniqueValuesPerRecord:
      colorBucketStats.maxUniqueValuesPerRecord,
    auroraVfxCanonicalAlphaAttributeCount: alphaAttribute.count,
    auroraVfxCanonicalAlphaAttributeItemSize: alphaAttribute.itemSize,
    auroraVfxCanonicalAlphaAttributeMin: alphaRange.min,
    auroraVfxCanonicalAlphaAttributeMax: alphaRange.max,
    auroraVfxCanonicalAlphaAttributeMinUniqueValuesPerRecord:
      alphaBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalAlphaAttributeMaxUniqueValuesPerRecord:
      alphaBucketStats.maxUniqueValuesPerRecord,
    auroraVfxCanonicalParticleSizeAttributeCount: particleSizeAttribute.count,
    auroraVfxCanonicalParticleSizeAttributeItemSize: particleSizeAttribute.itemSize,
    auroraVfxCanonicalParticleSizeAttributeXMin: particleSizeXRange.min,
    auroraVfxCanonicalParticleSizeAttributeXMax: particleSizeXRange.max,
    auroraVfxCanonicalParticleSizeAttributeYMin: particleSizeYRange.min,
    auroraVfxCanonicalParticleSizeAttributeYMax: particleSizeYRange.max,
    auroraVfxCanonicalParticleSizeAttributeMinUniqueValuesPerRecord:
      particleSizeBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalParticleSizeAttributeMaxUniqueValuesPerRecord:
      particleSizeBucketStats.maxUniqueValuesPerRecord,
    auroraVfxCanonicalAtlasFrameAttributeCount: atlasFrameAttribute.count,
    auroraVfxCanonicalAtlasFrameAttributeItemSize: atlasFrameAttribute.itemSize,
    auroraVfxCanonicalAtlasFrameAttributeSource: "auroraAtlasFrameIndex-buffer-attribute",
    auroraVfxCanonicalAtlasFrameAttributeUniqueCount: uniqueAtlasFrameCount,
    auroraVfxCanonicalAtlasFrameAttributeMin:
      frameIndices.length > 0 ? Math.min(...frameIndices) : 0,
    auroraVfxCanonicalAtlasFrameAttributeMax:
      frameIndices.length > 0 ? Math.max(...frameIndices) : 0,
    auroraVfxCanonicalAtlasFrameAttributeMinUniqueValuesPerRecord:
      atlasFrameBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalAtlasFrameAttributeMaxUniqueValuesPerRecord:
      atlasFrameBucketStats.maxUniqueValuesPerRecord,
    auroraVfxCanonicalDrawRecordIndexAttributeCount: drawRecordIndexAttribute.count,
    auroraVfxCanonicalDrawRecordIndexAttributeItemSize: drawRecordIndexAttribute.itemSize,
    auroraVfxCanonicalDrawRecordIndexAttributeSource: "auroraDrawRecordIndex-buffer-attribute",
    auroraVfxCanonicalDrawRecordIndexAttributeUniqueCount: uniqueDrawRecordIndexCount,
    auroraVfxCanonicalDrawRecordIndexAttributeMin:
      drawRecordIndices.length > 0 ? Math.min(...drawRecordIndices) : 0,
    auroraVfxCanonicalDrawRecordIndexAttributeMax:
      drawRecordIndices.length > 0 ? Math.max(...drawRecordIndices) : 0,
    auroraVfxCanonicalDrawRecordIndexAttributeMinVerticesPerRecord:
      drawRecordIndexBucketStats.minVerticesPerRecord,
    auroraVfxCanonicalDrawRecordIndexAttributeMaxVerticesPerRecord:
      drawRecordIndexBucketStats.maxVerticesPerRecord,
    auroraVfxCanonicalUvAttributeCount: uvAttribute.count,
    auroraVfxCanonicalUvAttributeItemSize: uvAttribute.itemSize,
    auroraVfxCanonicalUvAttributeUMin: uvURange.min,
    auroraVfxCanonicalUvAttributeUMax: uvURange.max,
    auroraVfxCanonicalUvAttributeVMin: uvVRange.min,
    auroraVfxCanonicalUvAttributeVMax: uvVRange.max,
    auroraVfxCanonicalUvAttributeMinUniqueValuesPerRecord:
      uvBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalUvAttributeMaxUniqueValuesPerRecord:
      uvBucketStats.maxUniqueValuesPerRecord
  };
  return geometry;
}

function readDrawRecordIndexBucketStats(drawRecordIndices: number[]): {
  minVerticesPerRecord: number;
  maxVerticesPerRecord: number;
} {
  if (drawRecordIndices.length === 0) {
    return { minVerticesPerRecord: 0, maxVerticesPerRecord: 0 };
  }

  const counts = new Map<number, number>();
  drawRecordIndices.forEach((drawRecordIndex) => {
    counts.set(drawRecordIndex, (counts.get(drawRecordIndex) ?? 0) + 1);
  });
  const verticesPerRecord = [...counts.values()];
  return {
    minVerticesPerRecord: Math.min(...verticesPerRecord),
    maxVerticesPerRecord: Math.max(...verticesPerRecord)
  };
}

function readPerDrawRecordUniqueValueStats(
  drawRecordIndices: number[],
  values: number[]
): {
  minUniqueValuesPerRecord: number;
  maxUniqueValuesPerRecord: number;
} {
  if (drawRecordIndices.length === 0 || values.length === 0) {
    return { minUniqueValuesPerRecord: 0, maxUniqueValuesPerRecord: 0 };
  }

  const valuesByRecord = new Map<number, Set<string>>();
  drawRecordIndices.forEach((drawRecordIndex, vertexIndex) => {
    const value = values[vertexIndex];
    if (value === undefined) return;
    const bucket = valuesByRecord.get(drawRecordIndex) ?? new Set<string>();
    bucket.add(value.toFixed(6));
    valuesByRecord.set(drawRecordIndex, bucket);
  });
  const uniqueValuesPerRecord = [...valuesByRecord.values()].map((bucket) => bucket.size);
  return {
    minUniqueValuesPerRecord: Math.min(...uniqueValuesPerRecord),
    maxUniqueValuesPerRecord: Math.max(...uniqueValuesPerRecord)
  };
}

function readPerDrawRecordUniqueTupleStats(
  drawRecordIndices: number[],
  values: number[],
  itemSize: number
): {
  minUniqueValuesPerRecord: number;
  maxUniqueValuesPerRecord: number;
} {
  if (drawRecordIndices.length === 0 || values.length === 0 || itemSize <= 0) {
    return { minUniqueValuesPerRecord: 0, maxUniqueValuesPerRecord: 0 };
  }

  const valuesByRecord = new Map<number, Set<string>>();
  drawRecordIndices.forEach((drawRecordIndex, vertexIndex) => {
    const firstComponent = vertexIndex * itemSize;
    const tuple = values
      .slice(firstComponent, firstComponent + itemSize)
      .map((value) => value.toFixed(6))
      .join(":");
    const bucket = valuesByRecord.get(drawRecordIndex) ?? new Set<string>();
    bucket.add(tuple);
    valuesByRecord.set(drawRecordIndex, bucket);
  });

  const uniqueValuesPerRecord = [...valuesByRecord.values()].map((bucket) => bucket.size);
  return {
    minUniqueValuesPerRecord: Math.min(...uniqueValuesPerRecord),
    maxUniqueValuesPerRecord: Math.max(...uniqueValuesPerRecord)
  };
}

function countUniqueAttributeTuples(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): number {
  const unique = new Set<string>();
  for (let index = 0; index < attribute.count; index += 1) {
    const tuple = [];
    for (let component = 0; component < attribute.itemSize; component += 1) {
      tuple.push(readAttributeComponent(attribute, index, component).toFixed(6));
    }
    unique.add(tuple.join(":"));
  }
  return unique.size;
}

function readAttributeComponentRange(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  component: number
): { min: number; max: number } {
  if (attribute.count === 0 || component >= attribute.itemSize) {
    return { min: 0, max: 0 };
  }
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < attribute.count; index += 1) {
    const value = readAttributeComponent(attribute, index, component);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}

function readAttributeComponent(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  index: number,
  component: number
): number {
  if (component === 0) return attribute.getX(index);
  if (component === 1) return attribute.getY(index);
  if (component === 2) return attribute.getZ(index);
  if (component === 3) return attribute.getW(index);
  return 0;
}

function applyRenderContractMaterialAdapterState(
  material: THREE.MeshBasicMaterial,
  contract: AuroraVfxRuntimeRenderContractRecord,
  textureReference: string | null
): AuroraVfxRenderedMaterialState {
  const blendMode = contract.blendMode.enum;
  material.transparent = blendMode !== "punch_through";
  material.depthWrite = blendMode === "punch_through";
  material.alphaTest = blendMode === "punch_through" ? 0.5 : 0;
  material.blending = blendMode === "normal" || blendMode === "punch_through"
    ? THREE.NormalBlending
    : THREE.CustomBlending;
  if (material.blending === THREE.CustomBlending) {
    material.blendSrc = THREE.SrcAlphaFactor;
    material.blendDst = THREE.OneFactor;
    material.blendEquation = THREE.AddEquation;
  }
  material.userData = {
    auroraVfxRenderer: "canonical",
    auroraVfxMaterialAdapterSource: "aurora-render-contract",
    auroraVfxThreeMaterialSourceTruth: false,
    auroraVfxSpriteMaterialParityProof: false,
    auroraVfxShaderMaterialParityProof: false,
    auroraVfxCanonicalRenderMode: contract.renderMode.enum ?? "unknown",
    auroraVfxCanonicalRenderModeRawToken: contract.renderMode.rawToken ?? "",
    auroraVfxCanonicalBlendMode: contract.blendMode.enum ?? "unknown",
    auroraVfxCanonicalBlendModeRawToken: contract.blendMode.rawToken ?? "",
    auroraVfxCanonicalBlendModeNumber: contract.blendMode.modeNumber ?? -1,
    auroraVfxCanonicalRenderState: contract.renderState ?? null,
    auroraVfxCanonicalMaterialMapBound: material.map !== null,
    auroraVfxCanonicalMaterialMapReference: material.map ? textureReference ?? "" : "",
    auroraVfxCanonicalMaterialDepthTest: material.depthTest,
    auroraVfxCanonicalMaterialOpacity: material.opacity,
    auroraVfxCanonicalMaterialColorHex: `#${material.color.getHexString()}`,
    auroraVfxCanonicalMaterialVertexColors: material.vertexColors,
    auroraVfxCanonicalMaterialSide: readThreeSideName(material.side)
  };
  return {
    transparent: material.transparent,
    depthWrite: material.depthWrite,
    depthTest: material.depthTest,
    alphaTest: material.alphaTest,
    opacity: material.opacity,
    colorHex: `#${material.color.getHexString()}`,
    blending: material.blending === THREE.NormalBlending ? "normal" : "custom",
    blendSrc: readThreeBlendFactorName(material.blendSrc),
    blendDst: readThreeBlendFactorName(material.blendDst),
    blendEquation: readThreeBlendEquationName(material.blendEquation),
    mapBound: material.map !== null,
    mapReference: material.map ? textureReference ?? "" : "",
    vertexColors: material.vertexColors,
    side: readThreeSideName(material.side),
    status: "applied"
  };
}

function readThreeBlendFactorName(value: number): string {
  if (value === THREE.ZeroFactor) return "ZeroFactor";
  if (value === THREE.OneFactor) return "OneFactor";
  if (value === THREE.SrcColorFactor) return "SrcColorFactor";
  if (value === THREE.OneMinusSrcColorFactor) return "OneMinusSrcColorFactor";
  if (value === THREE.SrcAlphaFactor) return "SrcAlphaFactor";
  if (value === THREE.OneMinusSrcAlphaFactor) return "OneMinusSrcAlphaFactor";
  if (value === THREE.DstAlphaFactor) return "DstAlphaFactor";
  if (value === THREE.OneMinusDstAlphaFactor) return "OneMinusDstAlphaFactor";
  if (value === THREE.DstColorFactor) return "DstColorFactor";
  if (value === THREE.OneMinusDstColorFactor) return "OneMinusDstColorFactor";
  return `unknown:${value}`;
}

function readThreeBlendEquationName(value: number): string {
  if (value === THREE.AddEquation) return "AddEquation";
  if (value === THREE.SubtractEquation) return "SubtractEquation";
  if (value === THREE.ReverseSubtractEquation) return "ReverseSubtractEquation";
  if (value === THREE.MinEquation) return "MinEquation";
  if (value === THREE.MaxEquation) return "MaxEquation";
  return `unknown:${value}`;
}

function readThreeSideName(value: number): string {
  if (value === THREE.FrontSide) return "FrontSide";
  if (value === THREE.BackSide) return "BackSide";
  if (value === THREE.DoubleSide) return "DoubleSide";
  return `unknown:${value}`;
}

function buildCanonicalRootUserData(
  payload: AuroraVfxPayload,
  contract: AuroraVfxRuntimeRenderContractRecord | null,
  options: {
    diagnostics: SceneObjectVfxDiagnostic[];
    renderedDrawParticleCount: number;
    renderedVertexCount: number;
    renderedBounds?: AuroraVfxRenderedBounds | null;
    textureReference?: string | null;
    textureStatus: string;
    materialState: AuroraVfxRenderedMaterialState | null;
  }
): Record<string, unknown> {
  const diagnostics = mergeDiagnostics(options.diagnostics);
  return {
    auroraVfxRenderer: "canonical",
    auroraVfxCanonicalRenderer: true,
    auroraVfxPreviewRenderer: false,
    auroraVfxCanonicalStatus: payload.canonicalStatus,
    auroraVfxCanonicalMode: "canonical",
    auroraVfxCanonicalPayloadVersion: payload.version,
    auroraVfxCanonicalSourceKind: payload.sourceKind,
    auroraVfxCanonicalTextureReference: options.textureReference ?? null,
    auroraVfxCanonicalTextureStatus: options.textureStatus,
    auroraVfxCanonicalParticleCount: contract?.activeParticleCount ?? 0,
    auroraVfxCanonicalDrawParticleCount: contract?.drawParticleCount ?? 0,
    auroraVfxCanonicalRenderedDrawParticleCount: options.renderedDrawParticleCount,
    auroraVfxCanonicalDrawVertexCount: contract?.drawVertexCount ?? 0,
    auroraVfxCanonicalRenderedVertexCount: options.renderedVertexCount,
    auroraVfxCanonicalRenderedBoundsWidth: options.renderedBounds?.width ?? 0,
    auroraVfxCanonicalRenderedBoundsHeight: options.renderedBounds?.height ?? 0,
    auroraVfxCanonicalRenderedBoundsDepth: options.renderedBounds?.depth ?? 0,
    auroraVfxCanonicalRenderedBoundsCenterX: options.renderedBounds?.centerX ?? 0,
    auroraVfxCanonicalRenderedBoundsCenterY: options.renderedBounds?.centerY ?? 0,
    auroraVfxCanonicalRenderedBoundsCenterZ: options.renderedBounds?.centerZ ?? 0,
    auroraVfxCanonicalMaterialTransparent: options.materialState?.transparent ?? null,
    auroraVfxCanonicalMaterialDepthWrite: options.materialState?.depthWrite ?? null,
    auroraVfxCanonicalMaterialDepthTest: options.materialState?.depthTest ?? null,
    auroraVfxCanonicalMaterialAlphaTest: options.materialState?.alphaTest ?? null,
    auroraVfxCanonicalMaterialOpacity: options.materialState?.opacity ?? null,
    auroraVfxCanonicalMaterialColorHex: options.materialState?.colorHex ?? "none",
    auroraVfxCanonicalMaterialBlending: options.materialState?.blending ?? "none",
    auroraVfxCanonicalMaterialBlendSrc: options.materialState?.blendSrc ?? "none",
    auroraVfxCanonicalMaterialBlendDst: options.materialState?.blendDst ?? "none",
    auroraVfxCanonicalMaterialBlendEquation: options.materialState?.blendEquation ?? "none",
    auroraVfxCanonicalMaterialMapBound: options.materialState?.mapBound ?? false,
    auroraVfxCanonicalMaterialMapReference: options.materialState?.mapReference ?? "",
    auroraVfxCanonicalMaterialVertexColors: options.materialState?.vertexColors ?? false,
    auroraVfxCanonicalMaterialSide: options.materialState?.side ?? "none",
    auroraVfxCanonicalMaterialStatus: options.materialState?.status ?? "not-applied",
    auroraVfxCanonicalVerticesPerParticle: contract?.verticesPerDrawParticle ?? 0,
    auroraVfxCanonicalDrawLane: contract?.drawLane ?? "none",
    auroraVfxCanonicalDrawRecordIds: contract?.drawRecords.map((record) => record.drawRecordId) ?? [],
    auroraVfxCanonicalEmitterNodeNames:
      contract?.drawRecords.map((record) => record.emitterNodeName ?? "") ?? [],
    auroraVfxCanonicalDrawRecordLanes: contract?.drawRecords.map((record) => record.lane) ?? [],
    auroraVfxCanonicalParticleIds: contract?.drawRecords.map((record) => record.particleId) ?? [],
    auroraVfxCanonicalParticleIndexes: contract?.drawRecords.map((record) => record.particleIndex) ?? [],
    auroraVfxCanonicalPositionX: contract?.drawRecords.map((record) => record.position.x) ?? [],
    auroraVfxCanonicalPositionY: contract?.drawRecords.map((record) => record.position.y) ?? [],
    auroraVfxCanonicalPositionZ: contract?.drawRecords.map((record) => record.position.z) ?? [],
    auroraVfxCanonicalVelocityX: contract?.drawRecords.map((record) => record.velocity.x) ?? [],
    auroraVfxCanonicalVelocityY: contract?.drawRecords.map((record) => record.velocity.y) ?? [],
    auroraVfxCanonicalVelocityZ: contract?.drawRecords.map((record) => record.velocity.z) ?? [],
    auroraVfxCanonicalRotationRadians:
      contract?.drawRecords.map((record) => record.rotationRadians) ?? [],
    auroraVfxCanonicalColorR: contract?.drawRecords.map((record) => record.color.r) ?? [],
    auroraVfxCanonicalColorG: contract?.drawRecords.map((record) => record.color.g) ?? [],
    auroraVfxCanonicalColorB: contract?.drawRecords.map((record) => record.color.b) ?? [],
    auroraVfxCanonicalParticleSizeX: contract?.drawRecords.map((record) => record.size.x) ?? [],
    auroraVfxCanonicalParticleSizeY: contract?.drawRecords.map((record) => record.size.y) ?? [],
    auroraVfxCanonicalAlpha: contract?.drawRecords.map((record) => record.alpha) ?? [],
    auroraVfxCanonicalRecordVerticesPerParticle:
      contract?.drawRecords.map((record) => record.verticesPerParticle) ?? [],
    auroraVfxCanonicalPltLayers: contract?.drawRecords.map((record) => record.pltLayer ?? "") ?? [],
    auroraVfxCanonicalPltLayerColorSources:
      contract?.drawRecords.map((record) => record.pltLayerColorSource ?? "") ?? [],
    auroraVfxCanonicalAtlasFrames: contract?.drawRecords.map((record) => record.atlasUv.frameIndex) ?? [],
    auroraVfxCanonicalAtlasUvU0: contract?.drawRecords.map((record) => record.atlasUv.u0) ?? [],
    auroraVfxCanonicalAtlasUvV0: contract?.drawRecords.map((record) => record.atlasUv.v0) ?? [],
    auroraVfxCanonicalAtlasUvU1: contract?.drawRecords.map((record) => record.atlasUv.u1) ?? [],
    auroraVfxCanonicalAtlasUvV1: contract?.drawRecords.map((record) => record.atlasUv.v1) ?? [],
    auroraVfxCanonicalRenderMode: contract?.renderMode.enum ?? "unknown",
    auroraVfxCanonicalRenderModeRawToken: contract?.renderMode.rawToken ?? "",
    auroraVfxCanonicalBlendMode: contract?.blendMode.enum ?? "unknown",
    auroraVfxCanonicalBlendModeRawToken: contract?.blendMode.rawToken ?? "",
    auroraVfxCanonicalBlendModeNumber: contract?.blendMode.modeNumber ?? -1,
    auroraVfxCanonicalRenderOrder: contract?.renderOrder.value ?? 0,
    auroraVfxCanonicalDiagnosticCodes: diagnostics.map((diagnostic) => diagnostic.code),
    auroraVfxDiagnosticCodes: diagnostics.map((diagnostic) => diagnostic.code),
    auroraVfxThreeMaterialSourceTruth: false,
    auroraVfxRendererParityClaim: "none",
    auroraVfxRetailParityProof: false
  };
}

function readGeometryBounds(geometry: THREE.BufferGeometry): AuroraVfxRenderedBounds {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds || bounds.isEmpty()) {
    return {
      width: 0,
      height: 0,
      depth: 0,
      centerX: 0,
      centerY: 0,
      centerZ: 0
    };
  }
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  return {
    width: round(size.x),
    height: round(size.y),
    depth: round(size.z),
    centerX: round(center.x),
    centerY: round(center.y),
    centerZ: round(center.z)
  };
}

function createDiagnosticPlaceholder(
  objectRadius = 0.24,
  diagnosticCodes: readonly string[]
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(objectRadius * 0.58, objectRadius * 0.58, objectRadius * 0.58);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#ffb347"),
    wireframe: true
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = {
    auroraVfxRenderer: "canonical",
    auroraVfxCanonicalRenderer: true,
    auroraVfxCanonicalDiagnosticPlaceholder: true,
    auroraVfxCanonicalDrawMesh: false,
    auroraVfxCanonicalFakeParticleDraw: false,
    auroraVfxCanonicalDiagnosticCodes: [...diagnosticCodes],
    auroraVfxThreeMaterialSourceTruth: false,
    auroraVfxRetailParityProof: false
  };
  return mesh;
}

function isTexturedQuadDrawRecord(
  record: AuroraParticleDrawRecordLike
): record is AuroraParticleDrawRecordLike {
  return record.lane === "textured_quad" || record.lane === "linked_textured_quad";
}

function resolveTexture(
  texturesByReference: ReadonlyMap<string, THREE.Texture> | undefined,
  textureReference: string | null
): THREE.Texture | null {
  if (!texturesByReference || !textureReference) {
    return null;
  }
  return texturesByReference.get(textureReference) ?? null;
}

function readDrawLane(value: unknown): AuroraVfxRuntimeRenderContractRecord["drawLane"] {
  return value === "linked_textured_quad" || value === "chunk_model"
    ? value
    : "textured_quad";
}

function readVerticesPerParticle(value: unknown): 0 | 6 {
  return value === 0 ? 0 : 6;
}

function readModeRecord(value: unknown): { enum?: string; rawToken?: string; modeNumber?: number } {
  if (!isRecord(value)) {
    return {};
  }
  return {
    ...(readString(value.enum) ? { enum: readString(value.enum) } : {}),
    ...(readString(value.rawToken) ? { rawToken: readString(value.rawToken) } : {}),
    ...(typeof value.modeNumber === "number" && Number.isFinite(value.modeNumber)
      ? { modeNumber: value.modeNumber }
      : {})
  };
}

function readRenderOrder(value: unknown): { value: number; rawValue?: number } {
  if (!isRecord(value)) {
    return { value: 0 };
  }
  return {
    value: readFiniteNumber(value.value, 0),
    ...(typeof value.rawValue === "number" && Number.isFinite(value.rawValue)
      ? { rawValue: value.rawValue }
      : {})
  };
}

function readVector3(value: unknown): AuroraVector3Like | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    x: readFiniteNumber(value.x, 0),
    y: readFiniteNumber(value.y, 0),
    z: readFiniteNumber(value.z, 0)
  };
}

function readColor(value: unknown): AuroraColorLike | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    r: readFiniteNumber(value.r, 1),
    g: readFiniteNumber(value.g, 1),
    b: readFiniteNumber(value.b, 1)
  };
}

function readSize(value: unknown): { x: number; y: number } | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    x: Math.max(0, readFiniteNumber(value.x, 0)),
    y: Math.max(0, readFiniteNumber(value.y, 0))
  };
}

function readAtlasUv(value: unknown): AuroraAtlasUvLike | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    u0: readFiniteNumber(value.u0, 0),
    v0: readFiniteNumber(value.v0, 0),
    u1: readFiniteNumber(value.u1, 1),
    v1: readFiniteNumber(value.v1, 1),
    frameIndex: readFiniteNumber(value.frameIndex, 0),
    rawFrameIndex: readFiniteNumber(value.rawFrameIndex, readFiniteNumber(value.frameIndex, 0)),
    mapping: readString(value.mapping) || "unknown"
  };
}

function normalizeDiagnostics(value: unknown): SceneObjectVfxDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    const code = readString(entry.code);
    if (!code) {
      return [];
    }
    const severity = entry.severity === "info" || entry.severity === "error" ? entry.severity : "warn";
    return [
      {
        code,
        severity,
        message: readString(entry.message)
      }
    ];
  });
}

function mergeDiagnostics(
  diagnostics: readonly SceneObjectVfxDiagnostic[]
): SceneObjectVfxDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.flatMap((diagnostic) => {
    const key = `${diagnostic.code}:${diagnostic.severity}:${diagnostic.message}`;
    if (seen.has(key)) {
      return [];
    }
    seen.add(key);
    return [{ ...diagnostic }];
  });
}

function collectPayloadDiagnostics(payload: AuroraVfxPayload): SceneObjectVfxDiagnostic[] {
  return Object.values(payload.diagnostics).flat();
}

function normalizeResourceReference(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\.(dds|tga|png|jpg|jpeg|plt)$/u, "");
  return normalized.length > 0 ? normalized : null;
}

function readFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
