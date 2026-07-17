import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../../../domain/derived-asset-versions";

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const BIN_CHUNK_TYPE = 0x004e4942;
const FLOAT_COMPONENT_TYPE = 5126;
const UNSIGNED_SHORT_COMPONENT_TYPE = 5123;
const UNSIGNED_INT_COMPONENT_TYPE = 5125;
const ARRAY_BUFFER_TARGET = 34962;
const ELEMENT_ARRAY_BUFFER_TARGET = 34963;
const BINARY_MODEL_BASE = 12;
const BINARY_NODE_HEADER_SIZE = 0x70;
const BINARY_NODE_PART_NUMBER_OFFSET = 28;
const BINARY_NODE_NAME_OFFSET = 32;
const BINARY_NODE_CHILDREN_OFFSET = 72;
const BINARY_NODE_CONTROLLER_KEYS_OFFSET = 84;
const BINARY_NODE_CONTROLLER_DATA_OFFSET = 96;
const BINARY_NODE_FLAGS_OFFSET = 108;
const BINARY_MODEL_ANIMATION_SCALE_OFFSET = 164;
const BINARY_MODEL_SUPERMODEL_OFFSET = 168;
const BINARY_MODEL_SUPERMODEL_LENGTH = 64;
const BINARY_NODE_FLAG_EMITTER = 0x0004;
const BINARY_NODE_FLAG_MESH = 0x0020;
const BINARY_NODE_FLAG_SKIN = 0x0040;
const BINARY_MESH_FACES_OFFSET = 120;
const BINARY_MESH_RENDER_OFFSET = 220;
const BINARY_MESH_TEXTURES_OFFSET = 232;
const BINARY_EMITTER_TEXTURE_OFFSET = 232;
const BINARY_MESH_VERTS_OFFSET = 556;
const BINARY_MESH_VERTEX_COUNT_OFFSET = 560;
const BINARY_MESH_TVERTS_OFFSET = 564;
const BINARY_MESH_ROTATE_TEXTURE_OFFSET = 0x265;
const BINARY_SKIN_WEIGHTS_OFFSET = 0x027c;
const BINARY_SKIN_BONE_REFS_OFFSET = 0x0280;
const BINARY_SKIN_QBONE_REF_INV_OFFSET = 0x028c;
const BINARY_SKIN_TBONE_REF_INV_OFFSET = 0x0298;
const BINARY_SKIN_BONE_NODE_NUMBERS_OFFSET = 0x02b0;
const BINARY_SKIN_BONE_NODE_NUMBER_COUNT = 64;
const BINARY_FACE_SIZE = 32;
const BINARY_FACE_VERTEX_INDICES_OFFSET = 26;
const BINARY_MODEL_ANIMATIONS_OFFSET = 120;
const BINARY_ANIMATION_NAME_OFFSET = 8;
const BINARY_ANIMATION_NAME_LENGTH = 64;
const BINARY_ANIMATION_ROOT_NODE_OFFSET = 72;
const BINARY_ANIMATION_LENGTH_OFFSET = 112;
const BINARY_ANIMATION_TRANSITION_OFFSET = 116;
const BINARY_ANIMATION_ANIMROOT_OFFSET = 120;
const BINARY_ANIMATION_ANIMROOT_LENGTH = 64;
const BINARY_ANIMATION_EVENT_ARRAY_OFFSET = 184;
const BINARY_ANIMATION_EVENT_COUNT_OFFSET = 188;
const BINARY_ANIMATION_EVENT_RECORD_SIZE = 36;
const BINARY_ANIMATION_EVENT_TIME_OFFSET = 0;
const BINARY_ANIMATION_EVENT_NAME_OFFSET = 4;
const BINARY_ANIMATION_EVENT_NAME_LENGTH = 32;
const BINARY_CONTROLLER_POSITION = 8;
const BINARY_CONTROLLER_ORIENTATION = 20;
const BINARY_CONTROLLER_SCALE = 36;
const INVALID_BINARY_OFFSET = 0xffffffff;
const RENDERABLE_ASCII_NODE_TYPES = new Set(["trimesh", "animmesh", "danglymesh", "skin"]);
const AURORA_TEXTURE_SLOT_ROLES = [
  "diffuse",
  "normal",
  "specular",
  "roughness",
  "height",
  "emissive"
] as const;

interface ParsedModel {
  modelName: string;
  supermodel?: string;
  animationScale?: number;
  sourceAnimations: AuroraSourceAnimationSummary[];
  sourceHierarchy: AuroraSourceHierarchyNode[];
  meshes: ParsedTrimesh[];
  emitterTextureReferences: string[];
}

interface ParsedTrimesh {
  name: string;
  nodeType: string;
  parentName?: string;
  offset: Vec3;
  sourceOrientation?: Quaternion;
  transform: BinaryTransform;
  bitmapToken?: string;
  texture0Token?: string;
  textureSlotTokens: Record<number, string>;
  materialName?: string;
  renderHint?: string;
  ambient: Vec3;
  diffuse: Vec3;
  specular: Vec3;
  shininess: number;
  alpha: number;
  transparencyHint: number;
  rotateTexture: boolean;
  render: number;
  selfIllumColor?: Vec3;
  materialSourceKeys: string[];
  vertexWeights?: AuroraSkinWeightReference[][];
  skinInverseBindPoses?: AuroraSkinInverseBindPoseMetadata[];
  danglyPeriod: number;
  danglyTightness: number;
  danglyDisplacement: number;
  danglyConstraints: number[];
  vertices: Vec3[];
  tverts: Vec2[];
  normals: Vec3[];
  tangents: AuroraMdlTangent[];
  faces: ParsedFace[];
}

interface ParsedFace {
  vertexIndices: [number, number, number];
  tvertIndices?: [number, number, number];
  smoothingGroup?: number;
}

interface GeometryBuffers {
  positions: Vec3[];
  normals: Vec3[];
  tangents: Vec4[];
  texcoords: Vec2[];
  indices: number[];
  primitives: GeometryPrimitive[];
  hasTexcoords: boolean;
  hasTangents: boolean;
}

interface GeometryPrimitive {
  meshName: string;
  nodeType: string;
  parentName?: string;
  textureReference?: string;
  textureSlots: AuroraTextureSlotReference[];
  material: AuroraMdlMaterialMetadata;
  skinWeights?: AuroraSkinWeightsMetadata;
  danglymesh?: AuroraDanglymeshMetadata;
  animmesh?: AuroraAnimmeshMetadata;
  vertexShading?: AuroraVertexShadingMetadata;
  firstIndex: number;
  indexCount: number;
  firstVertex: number;
  vertexCount: number;
  localIndices: number[];
  sourceVertexIndices: number[];
  sourceTvertIndices: number[];
}

interface MeshSmoothingNormalLookup {
  normalsByFaceCorner: Array<[Vec3, Vec3, Vec3] | undefined>;
  keysByFaceCorner: Array<[string, string, string] | undefined>;
}

interface AuroraMdlTangent {
  tangent: Vec3;
  binormal?: Vec3;
  normal?: Vec3;
  handedness?: number;
}

interface AuroraVertexShadingMetadata {
  format: "aurora-mdl-source-vertex-shading";
  sourceNormalCount: number;
  sourceTangentCount: number;
  usesSourceNormals: boolean;
  usesSourceTangents: boolean;
}

interface AuroraMdlMaterialMetadata {
  format: "aurora-mdl-material";
  sourceKeys: string[];
  ambient: Vec3;
  diffuse: Vec3;
  specular: Vec3;
  shininess: number;
  alpha: number;
  transparencyHint: number;
  rotateTexture: boolean;
  render: number;
  materialName?: string;
  renderHint?: string;
  selfIllumColor?: Vec3;
}

interface AuroraTextureSlotReference {
  slot: number;
  role: string;
  reference: string;
}

interface AuroraSkinWeightReference {
  bone: string;
  weight: number;
}

interface AuroraSkinInverseBindPoseMetadata {
  bone: string;
  qboneRefInv?: Quaternion;
  tboneRefInv?: Vec3;
}

interface AuroraSkinWeightsMetadata {
  format: "aurora-mdl-original-vertex-weights";
  sourceWeightVertexCount: number;
  gltfVertexSourceIndices: number[];
  influencingBoneNames: string[];
  maxInfluencesPerVertex: number;
  requiresWeightNormalization: boolean;
  originalVertexWeights: AuroraSkinWeightReference[][];
  inverseBindPoses?: AuroraSkinInverseBindPoseMetadata[];
}

interface AuroraDanglymeshMetadata {
  format: "aurora-mdl-danglymesh-constraints";
  sourceConstraintVertexCount: number;
  gltfVertexSourceIndices: number[];
  originalConstraints: number[];
  period: number;
  tightness: number;
  displacement: number;
}

interface AuroraAnimmeshMetadata {
  format: "aurora-mdl-animmesh-tverts";
  sourceVertexCount?: number;
  gltfVertexSourceIndices?: number[];
  sourceTvertCount: number;
  gltfVertexSourceTvertIndices: number[];
}

interface AuroraSourceAnimationNodeSummary {
  nodeName: string;
  positionKeyCount: number;
  orientationKeyCount: number;
  scaleKeyCount: number;
  alphaKeyCount?: number;
  selfIllumColorKeyCount?: number;
  danglyDisplacement?: number;
  danglyPeriod?: number;
  danglyTightness?: number;
  samplePeriod?: number;
  animVertCount?: number;
  animVerts?: Vec3[];
  animTvertCount?: number;
  animTverts?: Vec2[];
  positionKeys: AuroraSourceAnimationVectorKey[];
  orientationKeys: AuroraSourceAnimationOrientationKey[];
  scaleKeys: AuroraSourceAnimationScalarKey[];
  alphaKeys?: AuroraSourceAnimationScalarKey[];
  selfIllumColorKeys?: AuroraSourceAnimationVectorKey[];
}

interface AuroraSourceAnimationVectorKey {
  time: number;
  value: Vec3;
}

interface AuroraSourceAnimationOrientationKey {
  time: number;
  axisAngle: Quaternion;
}

interface AuroraSourceAnimationScalarKey {
  time: number;
  value: number;
}

interface AuroraSourceAnimationEventSummary {
  time: number;
  name: string;
}

interface AuroraSourceAnimationSummary {
  name: string;
  targetModel?: string;
  animRoot?: string;
  animationScale?: number;
  length: number;
  transitionTime: number;
  events?: AuroraSourceAnimationEventSummary[];
  nodeCount: number;
  nodeNames: string[];
  positionKeyCount: number;
  orientationKeyCount: number;
  scaleKeyCount: number;
  alphaKeyCount?: number;
  selfIllumColorKeyCount?: number;
  nodes: AuroraSourceAnimationNodeSummary[];
}

interface AuroraSourceHierarchyNode {
  name: string;
  nodeType: string;
  parentName?: string;
  position: Vec3;
  orientation?: Quaternion;
  orientationFormat?: "axis-angle" | "quaternion";
  scale: number;
}

interface BufferViewDescriptor {
  buffer: number;
  byteOffset: number;
  byteLength: number;
  target: number;
}

type Vec2 = [number, number];
type Vec3 = [number, number, number];
type Vec4 = [number, number, number, number];
type Quaternion = [number, number, number, number];
type Mat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

interface BinaryArrayHeader {
  offset: number;
  count: number;
  allocated: number;
}

interface BinaryTransform {
  position: Vec3;
  orientation?: Quaternion;
  scale: number;
}

interface BinaryNode {
  offset: number;
  absOffset: number;
  name: string;
  partNumber: number;
  parentOffset?: number;
  flags: number;
  transform: BinaryTransform;
}

interface BinaryControllerValue {
  type: number;
  rows: number;
  columns: number;
  times: number[];
  values: number[];
  keyframes: number[][];
}

interface BinarySkinMetadata {
  vertexWeights: AuroraSkinWeightReference[][];
  inverseBindPoses: AuroraSkinInverseBindPoseMetadata[];
}

export interface AuroraMdlToGlbResult {
  modelName: string;
  supermodel?: string;
  animationScale?: number;
  sourceAnimations?: AuroraSourceAnimationSummary[];
  sourceHierarchy?: AuroraSourceHierarchyNode[];
  meshCount: number;
  textureReferences: string[];
  vertexCount: number;
  triangleCount: number;
  bytes: Buffer;
  warnings: string[];
}

export interface AuroraMdlSourceInspectionResult {
  modelName: string;
  supermodel?: string;
  animationScale?: number;
  sourceAnimations?: AuroraSourceAnimationSummary[];
  sourceHierarchy?: AuroraSourceHierarchyNode[];
  sourceHierarchyRootNodeNames: string[];
  sourceHierarchyNodeTypes: string[];
  sourceHierarchyNodeTypeCounts: Record<string, number>;
  meshCount: number;
  textureReferences: string[];
}

export function inspectAuroraMdlSource(
  input: Buffer | string
): AuroraMdlSourceInspectionResult {
  const model = parseAuroraMdl(input);
  return {
    modelName: model.modelName,
    ...(model.supermodel ? { supermodel: model.supermodel } : {}),
    ...(typeof model.animationScale === "number"
      ? { animationScale: model.animationScale }
      : {}),
    ...(model.sourceAnimations.length > 0 ? { sourceAnimations: model.sourceAnimations } : {}),
    ...(model.sourceHierarchy.length > 0 ? { sourceHierarchy: model.sourceHierarchy } : {}),
    sourceHierarchyRootNodeNames: resolveSourceHierarchyRootNodeNames(model),
    sourceHierarchyNodeTypes: resolveSourceHierarchyNodeTypes(model),
    sourceHierarchyNodeTypeCounts: countSourceHierarchyNodeTypes(model),
    meshCount: model.meshes.length,
    textureReferences: collectTextureReferences(model)
  };
}

export function convertAuroraAsciiMdlToGlb(
  input: Buffer | string
): AuroraMdlToGlbResult {
  const model = parseAuroraMdl(input);
  const geometry = buildGeometry(model);
  const bytes = buildGlb(model, geometry);

  return {
    modelName: model.modelName,
    ...(model.supermodel ? { supermodel: model.supermodel } : {}),
    ...(typeof model.animationScale === "number"
      ? { animationScale: model.animationScale }
      : {}),
    ...(model.sourceAnimations.length > 0 ? { sourceAnimations: model.sourceAnimations } : {}),
    ...(model.sourceHierarchy.length > 0 ? { sourceHierarchy: model.sourceHierarchy } : {}),
    meshCount: model.meshes.length,
    textureReferences: collectTextureReferences(model),
    vertexCount: geometry.positions.length,
    triangleCount: geometry.indices.length / 3,
    bytes,
    warnings: buildConversionWarnings(model)
  };
}

export function convertAuroraMdlToGlb(input: Buffer | string): AuroraMdlToGlbResult {
  return convertAuroraAsciiMdlToGlb(input);
}

export async function convertAuroraMdlFileToGlb(
  inputPath: string,
  outputPath: string
): Promise<AuroraMdlToGlbResult> {
  const bytes = await readFile(inputPath);
  const result = convertAuroraMdlToGlb(bytes);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.bytes);
  return result;
}

function parseAuroraAsciiMdl(source: string): ParsedModel {
  if (source.includes("\0")) {
    throw new Error("Binary Aurora MDL/MDB is not supported by the ASCII MDL converter.");
  }

  const lines = source.split(/\r?\n/u);
  const modelName = findModelName(lines);
  const supermodel = findModelSupermodel(lines, modelName);
  const animationScale = findModelAnimationScale(lines);
  const sourceAnimations = parseSourceAnimations(lines, animationScale);
  const meshes: ParsedTrimesh[] = [];
  const sourceHierarchy: AuroraSourceHierarchyNode[] = [];
  const sourceHierarchyByName = new Set<string>();
  const emitterTextureReferences = new Set<string>();
  const asciiNodes = new Map<
    string,
    {
      parentName?: string;
      transform: BinaryTransform;
    }
  >();

  for (let index = 0; index < lines.length; index += 1) {
    const tokens = tokenizeLine(lines[index]);
    if (tokens.length < 3 || tokens[0]?.toLowerCase() !== "node") {
      continue;
    }

    const parsed = parseTrimesh(lines, index);
    const nodeKey = toAsciiNodeKey(parsed.mesh.name);
    if (!sourceHierarchyByName.has(nodeKey)) {
      sourceHierarchy.push(buildSourceHierarchyNode(parsed.mesh));
      sourceHierarchyByName.add(nodeKey);
    }
    if (parsed.nodeType === "emitter") {
      const emitterTexture = parsed.mesh.texture0Token ?? parsed.mesh.bitmapToken;
      if (emitterTexture) {
        emitterTextureReferences.add(emitterTexture);
      }
    }
    if (!asciiNodes.has(nodeKey)) {
      asciiNodes.set(nodeKey, {
        parentName: parsed.mesh.parentName ? toAsciiNodeKey(parsed.mesh.parentName) : undefined,
        transform: parsed.mesh.transform
      });
    }
    if (RENDERABLE_ASCII_NODE_TYPES.has(parsed.nodeType)) {
      meshes.push(parsed.mesh);
    }
    index = parsed.nextIndex;
  }

  const renderableMeshes = meshes
    .filter((mesh) => mesh.vertices.length > 0 && mesh.faces.length > 0)
    .map((mesh) => {
      const worldMatrix = resolveAsciiWorldMatrix(mesh.name, asciiNodes);
      const transformedVertices = mesh.vertices.map((vertex) =>
        transformPoint(worldMatrix, vertex)
      );
      return {
        ...mesh,
        offset: [0, 0, 0] as Vec3,
        transform: {
          position: [0, 0, 0] as Vec3,
          scale: 1
        },
        vertices: transformedVertices
      };
    });
  const hasRenderableMeshes = renderableMeshes.some(
    (mesh) => mesh.vertices.length > 0 && mesh.faces.length > 0
  );
  if (!hasRenderableMeshes && emitterTextureReferences.size > 0) {
    renderableMeshes.push(
      createEmitterProxyMesh(Array.from(emitterTextureReferences.values())[0])
    );
  } else if (
    !hasRenderableMeshes &&
    sourceHierarchy.length === 0 &&
    sourceAnimations.length === 0 &&
    !supermodel
  ) {
    throw new Error("ASCII MDL contains no renderable mesh geometry.");
  }

  return {
    modelName,
    ...(supermodel ? { supermodel } : {}),
    ...(typeof animationScale === "number" ? { animationScale } : {}),
    sourceAnimations,
    sourceHierarchy,
    meshes: renderableMeshes,
    emitterTextureReferences: [...emitterTextureReferences].sort((left, right) =>
      left.localeCompare(right)
    )
  };
}

function parseAuroraMdl(input: Buffer | string): ParsedModel {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf-8");
  if (isBinaryAuroraMdl(bytes)) {
    return parseAuroraBinaryMdl(bytes);
  }

  const source = stripTrailingNulTerminator(Buffer.isBuffer(input) ? input.toString("utf-8") : input);
  return parseAuroraAsciiMdl(source);
}

function isBinaryAuroraMdl(bytes: Buffer): boolean {
  return bytes.length >= BINARY_MODEL_BASE && bytes.readUInt32LE(0) === 0;
}

function stripTrailingNulTerminator(source: string): string {
  return source.replace(/\0+$/u, "");
}

function parseAuroraBinaryMdl(bytes: Buffer): ParsedModel {
  if (bytes.length < BINARY_MODEL_BASE) {
    throw new Error("Binary Aurora MDL is too short.");
  }

  const rawDataOffset = readUInt32(bytes, 4);
  const rawDataSize = readUInt32(bytes, 8);
  const rawBase = BINARY_MODEL_BASE + rawDataOffset;
  if (rawBase > bytes.length || rawBase + rawDataSize > bytes.length) {
    throw new Error("Binary Aurora MDL raw data section is out of range.");
  }

  const modelName =
    sanitizeName(readCString(bytes, BINARY_MODEL_BASE + 8, 64)) || "aurora-model";
  const supermodel = normalizeBinarySupermodelName(
    readCString(
      bytes,
      BINARY_MODEL_BASE + BINARY_MODEL_SUPERMODEL_OFFSET,
      BINARY_MODEL_SUPERMODEL_LENGTH
    ),
    modelName
  );
  const animationScale = readPlausibleBinaryAnimationFloat(
    bytes,
    BINARY_MODEL_BASE + BINARY_MODEL_ANIMATION_SCALE_OFFSET
  );
  const rootNodeOffset = readUInt32(bytes, BINARY_MODEL_BASE + 72);
  const nodes = new Map<number, BinaryNode>();
  const emitterTextureReferences = new Set<string>();
  walkBinaryNodes(bytes, rootNodeOffset, undefined, nodes);
  const sourceHierarchy = buildBinarySourceHierarchy(nodes);
  const sourceAnimations = parseBinarySourceAnimations(bytes, modelName, animationScale);

  const meshes: ParsedTrimesh[] = [];
  for (const node of nodes.values()) {
    if ((node.flags & BINARY_NODE_FLAG_EMITTER) !== 0) {
      const emitterTexture = normalizeTextureToken(
        readCString(bytes, node.absOffset + BINARY_EMITTER_TEXTURE_OFFSET, 64)
      );
      if (emitterTexture) {
        emitterTextureReferences.add(emitterTexture);
      }
    }

    if ((node.flags & BINARY_NODE_FLAG_MESH) === 0) {
      continue;
    }
    if (node.name.toLowerCase().startsWith("damage")) {
      continue;
    }

    const mesh = extractBinaryMesh(bytes, rawBase, node, nodes);
    if (mesh) {
      meshes.push(mesh);
    }
  }

  if (meshes.length === 0 && emitterTextureReferences.size > 0) {
    meshes.push(createEmitterProxyMesh(Array.from(emitterTextureReferences.values())[0]));
  } else if (meshes.length === 0 && sourceHierarchy.length === 0) {
    throw new Error("Binary Aurora MDL contains no renderable mesh geometry.");
  }

  return {
    modelName,
    ...(supermodel ? { supermodel } : {}),
    ...(typeof animationScale === "number" ? { animationScale } : {}),
    sourceAnimations,
    sourceHierarchy,
    meshes,
    emitterTextureReferences: [...emitterTextureReferences].sort((left, right) =>
      left.localeCompare(right)
    )
  };
}

function walkBinaryNodes(
  bytes: Buffer,
  nodeOffset: number,
  parentOffset: number | undefined,
  nodes: Map<number, BinaryNode>,
  depth = 0
): void {
  if (depth > 64 || nodes.has(nodeOffset)) {
    return;
  }

  const absOffset = BINARY_MODEL_BASE + nodeOffset;
  if (absOffset < BINARY_MODEL_BASE || absOffset + BINARY_NODE_HEADER_SIZE > bytes.length) {
    return;
  }

  const name =
    sanitizeName(readCString(bytes, absOffset + BINARY_NODE_NAME_OFFSET, 32)) ||
    `node_${nodeOffset.toString(16)}`;
  const partNumber = bytes.readInt32LE(absOffset + BINARY_NODE_PART_NUMBER_OFFSET);
  const flags = readUInt32(bytes, absOffset + BINARY_NODE_FLAGS_OFFSET);
  const controllerKeys = readBinaryArrayHeader(
    bytes,
    absOffset + BINARY_NODE_CONTROLLER_KEYS_OFFSET
  );
  const controllerData = readBinaryArrayHeader(
    bytes,
    absOffset + BINARY_NODE_CONTROLLER_DATA_OFFSET
  );
  nodes.set(nodeOffset, {
    offset: nodeOffset,
    absOffset,
    name,
    partNumber,
    parentOffset,
    flags,
    transform: readStaticBinaryTransform(bytes, controllerKeys, controllerData)
  });

  const children = readBinaryArrayHeader(bytes, absOffset + BINARY_NODE_CHILDREN_OFFSET);
  for (let index = 0; index < children.count; index += 1) {
    const childOffsetPosition = BINARY_MODEL_BASE + children.offset + index * 4;
    if (childOffsetPosition + 4 > bytes.length) {
      break;
    }
    const childNodeOffset = readUInt32(bytes, childOffsetPosition);
    if (childNodeOffset !== nodeOffset) {
      walkBinaryNodes(bytes, childNodeOffset, nodeOffset, nodes, depth + 1);
    }
  }
}

function buildBinarySourceHierarchy(
  nodes: Map<number, BinaryNode>
): AuroraSourceHierarchyNode[] {
  return Array.from(nodes.values()).map((node) => {
    const parentName =
      typeof node.parentOffset === "number" ? nodes.get(node.parentOffset)?.name : undefined;
    return {
      name: node.name,
      nodeType: inferBinarySourceHierarchyNodeType(node),
      ...(parentName ? { parentName } : {}),
      position: [...node.transform.position],
      ...(node.transform.orientation
        ? {
            orientation: [...node.transform.orientation] as Quaternion,
            orientationFormat: "quaternion" as const
          }
        : {}),
      scale: Number.isFinite(node.transform.scale) ? node.transform.scale : 1
    };
  });
}

function inferBinarySourceHierarchyNodeType(node: BinaryNode): string {
  if ((node.flags & BINARY_NODE_FLAG_EMITTER) !== 0) {
    return "emitter";
  }
  if ((node.flags & BINARY_NODE_FLAG_SKIN) !== 0) {
    return "skin";
  }
  if ((node.flags & BINARY_NODE_FLAG_MESH) !== 0) {
    return "trimesh";
  }
  return "dummy";
}

function normalizeBinarySupermodelName(
  rawValue: string,
  modelName: string
): string | undefined {
  const candidate = normalizeOptionalName(rawValue);
  if (!candidate) {
    return undefined;
  }
  const normalizedCandidate = candidate.toLowerCase();
  if (
    normalizedCandidate === "null" ||
    normalizedCandidate === modelName.toLowerCase()
  ) {
    return undefined;
  }
  return candidate;
}

function readStaticBinaryTransform(
  bytes: Buffer,
  controllerKeys: BinaryArrayHeader,
  controllerData: BinaryArrayHeader
): BinaryTransform {
  const transform: BinaryTransform = {
    position: [0, 0, 0],
    scale: 1
  };
  const dataBase = BINARY_MODEL_BASE + controllerData.offset;

  for (let index = 0; index < controllerKeys.count; index += 1) {
    const keyOffset = BINARY_MODEL_BASE + controllerKeys.offset + index * 12;
    if (keyOffset + 12 > bytes.length) {
      break;
    }

    const type = readUInt32(bytes, keyOffset);
    const rows = bytes.readUInt16LE(keyOffset + 4);
    const dataStart = bytes.readUInt16LE(keyOffset + 8);
    const columns = bytes.readUInt8(keyOffset + 10);
    if (rows !== 1 || columns <= 0) {
      continue;
    }

    const valueOffset = dataBase + dataStart * 4;
    if (dataStart + columns > controllerData.count || valueOffset + columns * 4 > bytes.length) {
      continue;
    }

    if (type === BINARY_CONTROLLER_POSITION && columns >= 3) {
      transform.position = [
        bytes.readFloatLE(valueOffset),
        bytes.readFloatLE(valueOffset + 4),
        bytes.readFloatLE(valueOffset + 8)
      ];
      continue;
    }

    if (type === BINARY_CONTROLLER_ORIENTATION && columns >= 4) {
      transform.orientation = [
        bytes.readFloatLE(valueOffset),
        bytes.readFloatLE(valueOffset + 4),
        bytes.readFloatLE(valueOffset + 8),
        bytes.readFloatLE(valueOffset + 12)
      ];
      continue;
    }

    if (type === BINARY_CONTROLLER_SCALE && columns >= 1) {
      transform.scale = bytes.readFloatLE(valueOffset);
    }
  }

  return transform;
}

function parseBinarySourceAnimations(
  bytes: Buffer,
  modelName: string,
  animationScale?: number
): AuroraSourceAnimationSummary[] {
  const animations = readBinaryArrayHeader(
    bytes,
    BINARY_MODEL_BASE + BINARY_MODEL_ANIMATIONS_OFFSET
  );
  if (animations.count < 1 || animations.offset === 0) {
    return [];
  }

  const sourceAnimations: AuroraSourceAnimationSummary[] = [];
  const animationCount = Math.min(animations.count, 2048);
  for (let index = 0; index < animationCount; index += 1) {
    const animationOffsetPosition = BINARY_MODEL_BASE + animations.offset + index * 4;
    if (animationOffsetPosition + 4 > bytes.length) {
      break;
    }
    const animationOffset = readUInt32(bytes, animationOffsetPosition);
    const animationAbsOffset = BINARY_MODEL_BASE + animationOffset;
    if (
      animationAbsOffset < BINARY_MODEL_BASE ||
      animationAbsOffset + BINARY_ANIMATION_ROOT_NODE_OFFSET + 4 > bytes.length
    ) {
      continue;
    }

    const name = sanitizeName(
      readCString(
        bytes,
        animationAbsOffset + BINARY_ANIMATION_NAME_OFFSET,
        BINARY_ANIMATION_NAME_LENGTH
      ) || `animation_${index}`
    );
    const length =
      readPreferredBinaryAnimationLength(bytes, animationAbsOffset) ??
      readPlausibleBinaryAnimationFloat(bytes, animationAbsOffset) ??
      0;
    const transitionTime =
      readPlausibleBinaryAnimationFloat(
        bytes,
        animationAbsOffset + BINARY_ANIMATION_TRANSITION_OFFSET
      ) ??
      readPlausibleBinaryAnimationFloat(bytes, animationAbsOffset + 4) ??
      0;
    const rootNodeOffset = readUInt32(
      bytes,
      animationAbsOffset + BINARY_ANIMATION_ROOT_NODE_OFFSET
    );
    const animRoot =
      normalizeOptionalName(
        readCString(
          bytes,
          animationAbsOffset + BINARY_ANIMATION_ANIMROOT_OFFSET,
          BINARY_ANIMATION_ANIMROOT_LENGTH
        )
      ) ?? readBinaryNodeName(bytes, rootNodeOffset);
    const events = readBinarySourceAnimationEvents(bytes, animationAbsOffset);
    const nodes = collectBinarySourceAnimationNodes(bytes, rootNodeOffset, length);

    sourceAnimations.push(
      buildSourceAnimationSummary({
        name,
        targetModel: modelName,
        animRoot,
        animationScale,
        length,
        transitionTime,
        events,
        nodes
      })
    );
  }
  return sourceAnimations;
}

function readBinarySourceAnimationEvents(
  bytes: Buffer,
  animationAbsOffset: number
): AuroraSourceAnimationEventSummary[] {
  if (animationAbsOffset + BINARY_ANIMATION_EVENT_COUNT_OFFSET + 4 > bytes.length) {
    return [];
  }
  const eventArrayOffset = readUInt32(
    bytes,
    animationAbsOffset + BINARY_ANIMATION_EVENT_ARRAY_OFFSET
  );
  const eventCount = readUInt32(bytes, animationAbsOffset + BINARY_ANIMATION_EVENT_COUNT_OFFSET);
  if (eventArrayOffset === 0 || eventCount === 0 || eventCount > 2048) {
    return [];
  }
  const eventStart = BINARY_MODEL_BASE + eventArrayOffset + 12;
  const maxReadableCount = Math.floor(
    Math.max(0, bytes.length - eventStart) / BINARY_ANIMATION_EVENT_RECORD_SIZE
  );
  const events: AuroraSourceAnimationEventSummary[] = [];
  const boundedCount = Math.min(eventCount, maxReadableCount);
  for (let index = 0; index < boundedCount; index += 1) {
    const eventOffset = eventStart + index * BINARY_ANIMATION_EVENT_RECORD_SIZE;
    const time = bytes.readFloatLE(eventOffset + BINARY_ANIMATION_EVENT_TIME_OFFSET);
    const name = normalizeOptionalName(
      readCString(
        bytes,
        eventOffset + BINARY_ANIMATION_EVENT_NAME_OFFSET,
        BINARY_ANIMATION_EVENT_NAME_LENGTH
      )
    );
    if (!Number.isFinite(time) || time < 0 || !name) {
      continue;
    }
    events.push({ time, name });
  }
  events.sort((left, right) => left.time - right.time || left.name.localeCompare(right.name));
  return events;
}

function readBinaryNodeName(bytes: Buffer, nodeOffset: number): string | undefined {
  const absOffset = BINARY_MODEL_BASE + nodeOffset;
  if (absOffset < BINARY_MODEL_BASE || absOffset + BINARY_NODE_NAME_OFFSET + 32 > bytes.length) {
    return undefined;
  }
  return normalizeOptionalName(readCString(bytes, absOffset + BINARY_NODE_NAME_OFFSET, 32));
}

function readPreferredBinaryAnimationLength(
  bytes: Buffer,
  animationAbsOffset: number
): number | undefined {
  const modernLength = readPlausibleBinaryAnimationFloat(
    bytes,
    animationAbsOffset + BINARY_ANIMATION_LENGTH_OFFSET
  );
  if (typeof modernLength === "number" && modernLength > 0) {
    return modernLength;
  }
  const legacyLength = readPlausibleBinaryAnimationFloat(bytes, animationAbsOffset);
  if (typeof legacyLength === "number" && legacyLength > 0) {
    return legacyLength;
  }
  return modernLength ?? legacyLength;
}

function readPlausibleBinaryAnimationFloat(
  bytes: Buffer,
  offset: number
): number | undefined {
  if (offset < 0 || offset + 4 > bytes.length) {
    return undefined;
  }
  const value = bytes.readFloatLE(offset);
  if (!Number.isFinite(value) || value < 0 || value > 3600) {
    return undefined;
  }
  if (value > 0 && value < 1e-5) {
    return undefined;
  }
  return value;
}

function collectBinarySourceAnimationNodes(
  bytes: Buffer,
  rootNodeOffset: number,
  animationLength: number
): AuroraSourceAnimationNodeSummary[] {
  const nodes = new Map<number, BinaryNode>();
  walkBinaryNodes(bytes, rootNodeOffset, undefined, nodes);
  return Array.from(nodes.values())
    .map((node) => readBinarySourceAnimationNode(bytes, node, animationLength))
    .filter((node) => binarySourceAnimationNodeHasTracks(node));
}

function readBinarySourceAnimationNode(
  bytes: Buffer,
  node: BinaryNode,
  animationLength: number
): AuroraSourceAnimationNodeSummary {
  const controllers = readBinaryControllerValues(bytes, node.absOffset, animationLength);
  const positionKeys = controllers.flatMap((controller) =>
    controller.type === BINARY_CONTROLLER_POSITION
      ? readBinaryVectorControllerKeys(controller, 3, animationLength)
      : []
  );
  const orientationKeys = controllers.flatMap((controller) =>
    controller.type === BINARY_CONTROLLER_ORIENTATION
      ? readBinaryOrientationControllerKeys(controller, animationLength)
      : []
  );
  const scaleKeys = controllers.flatMap((controller) =>
    controller.type === BINARY_CONTROLLER_SCALE
      ? readBinaryScalarControllerKeys(controller, animationLength)
      : []
  );

  return {
    nodeName: node.name,
    positionKeyCount: positionKeys.length,
    orientationKeyCount: orientationKeys.length,
    scaleKeyCount: scaleKeys.length,
    positionKeys,
    orientationKeys,
    scaleKeys
  };
}

function binarySourceAnimationNodeHasTracks(
  node: AuroraSourceAnimationNodeSummary
): boolean {
  return (
    node.positionKeys.length > 0 ||
    node.orientationKeys.length > 0 ||
    node.scaleKeys.length > 0
  );
}

function buildSourceAnimationSummary(input: {
  name: string;
  targetModel?: string;
  animRoot?: string;
  animationScale?: number;
  length: number;
  transitionTime: number;
  events?: AuroraSourceAnimationEventSummary[];
  nodes: AuroraSourceAnimationNodeSummary[];
}): AuroraSourceAnimationSummary {
  const nodeNames = input.nodes.map((node) => node.nodeName);
  const events = sortAuroraSourceAnimationEvents(input.events ?? []);
  return {
    name: input.name,
    ...(input.targetModel ? { targetModel: input.targetModel } : {}),
    ...(input.animRoot ? { animRoot: input.animRoot } : {}),
    ...(typeof input.animationScale === "number"
      ? { animationScale: input.animationScale }
      : {}),
    length: input.length,
    transitionTime: input.transitionTime,
    ...(events.length > 0 ? { events } : {}),
    nodeCount: input.nodes.length,
    nodeNames,
    positionKeyCount: input.nodes.reduce((sum, node) => sum + node.positionKeyCount, 0),
    orientationKeyCount: input.nodes.reduce((sum, node) => sum + node.orientationKeyCount, 0),
    scaleKeyCount: input.nodes.reduce((sum, node) => sum + node.scaleKeyCount, 0),
    nodes: input.nodes
  };
}

function sortAuroraSourceAnimationEvents(
  events: readonly AuroraSourceAnimationEventSummary[]
): AuroraSourceAnimationEventSummary[] {
  return events
    .filter((event) => Number.isFinite(event.time) && event.time >= 0 && event.name.length > 0)
    .map((event) => ({ time: event.time, name: event.name }))
    .sort((left, right) => left.time - right.time || left.name.localeCompare(right.name));
}

function readBinaryControllerValues(
  bytes: Buffer,
  nodeAbsOffset: number,
  animationLength: number
): BinaryControllerValue[] {
  const controllerKeys = readBinaryArrayHeader(
    bytes,
    nodeAbsOffset + BINARY_NODE_CONTROLLER_KEYS_OFFSET
  );
  const controllerData = readBinaryArrayHeader(
    bytes,
    nodeAbsOffset + BINARY_NODE_CONTROLLER_DATA_OFFSET
  );
  if (controllerKeys.count < 1 || controllerData.count < 1) {
    return [];
  }

  const controllers: BinaryControllerValue[] = [];
  for (let index = 0; index < controllerKeys.count; index += 1) {
    const keyOffset = BINARY_MODEL_BASE + controllerKeys.offset + index * 12;
    if (keyOffset + 12 > bytes.length) {
      continue;
    }

    const type = readUInt32(bytes, keyOffset);
    const rows = bytes.readUInt16LE(keyOffset + 4);
    const dataStart = bytes.readUInt16LE(keyOffset + 8);
    const columns = bytes.readUInt8(keyOffset + 10);
    const totalValues = rows * columns;
    if (
      rows < 1 ||
      rows > 10000 ||
      columns < 1 ||
      columns > 16 ||
      totalValues < 1 ||
      dataStart + totalValues > controllerData.count
    ) {
      continue;
    }

    const dataBase = BINARY_MODEL_BASE + controllerData.offset;
    const valueOffset = dataBase + dataStart * 4;
    if (valueOffset + totalValues * 4 > bytes.length) {
      continue;
    }
    const values: number[] = [];
    for (let valueIndex = 0; valueIndex < totalValues; valueIndex += 1) {
      values.push(bytes.readFloatLE(valueOffset + valueIndex * 4));
    }

    const keyframes: number[][] = [];
    for (let row = 0; row < rows; row += 1) {
      keyframes.push(values.slice(row * columns, row * columns + columns));
    }

    controllers.push({
      type,
      rows,
      columns,
      times: readBinaryControllerTimes(bytes, controllerData, dataStart, rows, animationLength),
      values,
      keyframes
    });
  }
  return controllers;
}

function readBinaryControllerTimes(
  bytes: Buffer,
  controllerData: BinaryArrayHeader,
  dataStart: number,
  rows: number,
  animationLength: number
): number[] {
  if (rows < 2 || dataStart < rows) {
    return [];
  }
  const timeStart = dataStart - rows;
  if (timeStart + rows > controllerData.count) {
    return [];
  }
  const times: number[] = [];
  const dataBase = BINARY_MODEL_BASE + controllerData.offset;
  for (let index = 0; index < rows; index += 1) {
    const timeOffset = dataBase + (timeStart + index) * 4;
    if (timeOffset + 4 > bytes.length) {
      return [];
    }
    times.push(bytes.readFloatLE(timeOffset));
  }
  return isUsableBinaryControllerTimeTrack(times, animationLength) ? times : [];
}

function isUsableBinaryControllerTimeTrack(
  times: number[],
  animationLength: number
): boolean {
  if (times.length < 2 || times.every((time) => Math.abs(time) <= 1e-6)) {
    return false;
  }
  const maximumExpectedTime =
    Number.isFinite(animationLength) && animationLength > 0
      ? Math.max(animationLength * 4, animationLength + 1)
      : 3600;
  for (let index = 0; index < times.length; index += 1) {
    const time = times[index];
    if (!Number.isFinite(time) || time < -1e-6 || time > maximumExpectedTime) {
      return false;
    }
    if (index > 0 && time + 1e-6 < times[index - 1]) {
      return false;
    }
  }
  return true;
}

function readBinaryVectorControllerKeys(
  controller: BinaryControllerValue,
  componentCount: number,
  animationLength: number
): AuroraSourceAnimationVectorKey[] {
  if (controller.columns < componentCount) {
    return [];
  }
  return controller.keyframes.map((row, index) => ({
    time: resolveBinaryControllerKeyTime(controller, index, animationLength),
    value: [
      sanitizeFiniteKeyValue(row[0]),
      sanitizeFiniteKeyValue(row[1]),
      sanitizeFiniteKeyValue(row[2])
    ]
  }));
}

function readBinaryOrientationControllerKeys(
  controller: BinaryControllerValue,
  animationLength: number
): AuroraSourceAnimationOrientationKey[] {
  if (controller.columns < 4) {
    return [];
  }
  return controller.keyframes.map((row, index) => ({
    time: resolveBinaryControllerKeyTime(controller, index, animationLength),
    axisAngle: convertBinaryQuaternionToAuroraAxisAngle([
      sanitizeFiniteKeyValue(row[0]),
      sanitizeFiniteKeyValue(row[1]),
      sanitizeFiniteKeyValue(row[2]),
      sanitizeFiniteKeyValue(row[3], 1)
    ])
  }));
}

function readBinaryScalarControllerKeys(
  controller: BinaryControllerValue,
  animationLength: number
): AuroraSourceAnimationScalarKey[] {
  if (controller.columns < 1) {
    return [];
  }
  return controller.keyframes.map((row, index) => ({
    time: resolveBinaryControllerKeyTime(controller, index, animationLength),
    value: sanitizeFiniteKeyValue(row[0], 1)
  }));
}

function resolveBinaryControllerKeyTime(
  controller: BinaryControllerValue,
  rowIndex: number,
  animationLength: number
): number {
  const explicitTime = controller.times[rowIndex];
  if (Number.isFinite(explicitTime)) {
    return explicitTime;
  }
  if (controller.rows <= 1 || !Number.isFinite(animationLength) || animationLength <= 0) {
    return 0;
  }
  return (animationLength * rowIndex) / (controller.rows - 1);
}

function sanitizeFiniteKeyValue(value: number | undefined, fallback = 0): number {
  return Number.isFinite(value) ? value! : fallback;
}

function convertBinaryQuaternionToAuroraAxisAngle(quaternion: Quaternion): Quaternion {
  let [x, y, z, w] = quaternion;
  const length = Math.hypot(x, y, z, w);
  if (length <= 1e-8) {
    return [0, 0, 1, 0];
  }
  x /= length;
  y /= length;
  z /= length;
  w /= length;
  if (w > 1) {
    w = 1;
  } else if (w < -1) {
    w = -1;
  }
  if (w < 0) {
    x = -x;
    y = -y;
    z = -z;
    w = -w;
  }
  const angle = 2 * Math.acos(w);
  const axisScale = Math.sqrt(Math.max(0, 1 - w * w));
  if (axisScale <= 1e-8 || Math.abs(angle) <= 1e-8) {
    return [0, 0, 1, 0];
  }
  return [x / axisScale, y / axisScale, z / axisScale, angle];
}

function extractBinaryMesh(
  bytes: Buffer,
  rawBase: number,
  node: BinaryNode,
  nodes: Map<number, BinaryNode>
): ParsedTrimesh | null {
  const absOffset = node.absOffset;
  if (absOffset + BINARY_MESH_TVERTS_OFFSET + 16 > bytes.length) {
    return null;
  }

  const render = readUInt32(bytes, absOffset + BINARY_MESH_RENDER_OFFSET);
  if (render === 0) {
    return null;
  }

  const faces = readBinaryArrayHeader(bytes, absOffset + BINARY_MESH_FACES_OFFSET);
  const vertexDataOffset = readUInt32(bytes, absOffset + BINARY_MESH_VERTS_OFFSET);
  const vertexCount = bytes.readUInt16LE(absOffset + BINARY_MESH_VERTEX_COUNT_OFFSET);
  const textureVertexOffsets = [
    readUInt32(bytes, absOffset + BINARY_MESH_TVERTS_OFFSET),
    readUInt32(bytes, absOffset + BINARY_MESH_TVERTS_OFFSET + 4),
    readUInt32(bytes, absOffset + BINARY_MESH_TVERTS_OFFSET + 8),
    readUInt32(bytes, absOffset + BINARY_MESH_TVERTS_OFFSET + 12)
  ];
  const rotateTexture =
    absOffset + BINARY_MESH_ROTATE_TEXTURE_OFFSET < bytes.length &&
    bytes.readUInt8(absOffset + BINARY_MESH_ROTATE_TEXTURE_OFFSET) === 1;

  if (vertexCount === 0 || vertexDataOffset === INVALID_BINARY_OFFSET || faces.count === 0) {
    return null;
  }

  const vertexStart = rawBase + vertexDataOffset;
  if (vertexStart + vertexCount * 12 > bytes.length) {
    return null;
  }

  const worldMatrix = resolveBinaryWorldMatrix(node.offset, nodes);
  const vertices: Vec3[] = [];
  for (let index = 0; index < vertexCount; index += 1) {
    const offset = vertexStart + index * 12;
    vertices.push(
      transformPoint(worldMatrix, [
        bytes.readFloatLE(offset),
        bytes.readFloatLE(offset + 4),
        bytes.readFloatLE(offset + 8)
      ])
    );
  }

  const tverts: Vec2[] = [];
  const textureVertexOffset = textureVertexOffsets[0];
  if (textureVertexOffset !== INVALID_BINARY_OFFSET) {
    const textureVertexStart = rawBase + textureVertexOffset;
    if (textureVertexStart + vertexCount * 8 <= bytes.length) {
      for (let index = 0; index < vertexCount; index += 1) {
        const offset = textureVertexStart + index * 8;
        tverts.push([bytes.readFloatLE(offset), 1 - bytes.readFloatLE(offset + 4)]);
      }
    }
  }

  const parsedFaces: ParsedFace[] = [];
  const facesStart = BINARY_MODEL_BASE + faces.offset;
  for (let index = 0; index < faces.count; index += 1) {
    const offset = facesStart + index * BINARY_FACE_SIZE + BINARY_FACE_VERTEX_INDICES_OFFSET;
    if (offset + 6 > bytes.length) {
      break;
    }
    const vertexIndices = [
      bytes.readUInt16LE(offset),
      bytes.readUInt16LE(offset + 2),
      bytes.readUInt16LE(offset + 4)
    ] as [number, number, number];
    if (vertexIndices.some((vertexIndex) => vertexIndex >= vertexCount)) {
      continue;
    }
    parsedFaces.push({
      vertexIndices,
      tvertIndices: tverts.length === vertexCount ? vertexIndices : undefined
    });
  }

  if (parsedFaces.length === 0) {
    return null;
  }

  const textureSlotTokens = readBinaryMeshTextureTokens(bytes, absOffset);
  const skinMetadata = readBinarySkinMetadata(bytes, rawBase, node, vertexCount, nodes);
  const nodeType = skinMetadata ? "skin" : "trimesh";
  return {
    name: node.name,
    nodeType,
    ...(typeof node.parentOffset === "number" && nodes.get(node.parentOffset)?.name
      ? { parentName: nodes.get(node.parentOffset)?.name }
      : {}),
    offset: [0, 0, 0],
    transform: {
      position: [0, 0, 0],
      scale: 1
    },
    bitmapToken: textureSlotTokens[0],
    texture0Token: textureSlotTokens[0],
    textureSlotTokens,
    ambient: [0.2, 0.2, 0.2],
    diffuse: [0.8, 0.8, 0.8],
    specular: [0, 0, 0],
    shininess: 0,
    alpha: 1,
    transparencyHint: 0,
    rotateTexture,
    render: 1,
    materialSourceKeys: rotateTexture ? ["rotatetexture"] : [],
    ...(skinMetadata ? { vertexWeights: skinMetadata.vertexWeights } : {}),
    ...(skinMetadata?.inverseBindPoses.length
      ? { skinInverseBindPoses: skinMetadata.inverseBindPoses }
      : {}),
    danglyPeriod: 1,
    danglyTightness: 1,
    danglyDisplacement: 0.5,
    danglyConstraints: [],
    vertices,
    tverts,
    normals: [],
    tangents: [],
    faces: parsedFaces
  };
}

function readBinarySkinMetadata(
  bytes: Buffer,
  rawBase: number,
  node: BinaryNode,
  vertexCount: number,
  nodes: Map<number, BinaryNode>
): BinarySkinMetadata | undefined {
  if ((node.flags & BINARY_NODE_FLAG_SKIN) === 0 || vertexCount <= 0) {
    return undefined;
  }

  const weightsOffset = readUInt32(bytes, node.absOffset + BINARY_SKIN_WEIGHTS_OFFSET);
  const boneRefsOffset = readUInt32(bytes, node.absOffset + BINARY_SKIN_BONE_REFS_OFFSET);
  if (weightsOffset === INVALID_BINARY_OFFSET || boneRefsOffset === INVALID_BINARY_OFFSET) {
    return undefined;
  }

  const weightsStart = rawBase + weightsOffset;
  const boneRefsStart = rawBase + boneRefsOffset;
  const weightsByteLength = vertexCount * 4 * 4;
  const boneRefsByteLength = vertexCount * 4 * 2;
  if (
    weightsStart < rawBase ||
    boneRefsStart < rawBase ||
    weightsStart + weightsByteLength > bytes.length ||
    boneRefsStart + boneRefsByteLength > bytes.length
  ) {
    return undefined;
  }

  const nodeNamesByTraversalIndex = Array.from(nodes.values()).map((entry) => entry.name);
  const nodeNamesByPartNumber = buildBinaryNodeNameByPartNumber(nodes);
  const boneNodeNumberCount = readBinarySkinBoneNodeNumberCount(bytes, node);
  const boneNodeNumbers = readBinarySkinBoneNodeNumbers(bytes, node, boneNodeNumberCount);

  const rows: AuroraSkinWeightReference[][] = [];
  let weightedVertexCount = 0;
  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    const pairs: AuroraSkinWeightReference[] = [];
    for (let influenceIndex = 0; influenceIndex < 4; influenceIndex += 1) {
      const influenceOffset = vertexIndex * 4 + influenceIndex;
      const weight = bytes.readFloatLE(weightsStart + influenceOffset * 4);
      const boneRef = bytes.readInt16LE(boneRefsStart + influenceOffset * 2);
      if (!Number.isFinite(weight) || weight <= 0 || boneRef < 0) {
        continue;
      }
      const nodeNumber = boneNodeNumbers[boneRef];
      if (typeof nodeNumber !== "number" || nodeNumber < 0) {
        continue;
      }
      const bone = resolveBinarySkinBoneNodeName(
        nodeNumber,
        nodeNamesByTraversalIndex,
        nodeNamesByPartNumber
      );
      if (!bone) {
        continue;
      }
      pairs.push({ bone, weight });
    }
    if (pairs.length > 0) {
      weightedVertexCount += 1;
    }
    rows.push(pairs);
  }

  if (weightedVertexCount === 0) {
    return undefined;
  }

  return {
    vertexWeights: rows,
    inverseBindPoses: readBinarySkinInverseBindPoses(
      bytes,
      node,
      nodeNamesByTraversalIndex,
      nodeNamesByPartNumber,
      boneNodeNumbers
    )
  };
}

function buildBinaryNodeNameByPartNumber(nodes: Map<number, BinaryNode>): Map<number, string> {
  const namesByPartNumber = new Map<number, string>();
  Array.from(nodes.values()).forEach((entry) => {
    if (
      Number.isInteger(entry.partNumber) &&
      entry.partNumber >= 0 &&
      !namesByPartNumber.has(entry.partNumber)
    ) {
      namesByPartNumber.set(entry.partNumber, entry.name);
    }
  });
  return namesByPartNumber;
}

function resolveBinarySkinBoneNodeName(
  nodeNumber: number,
  nodeNamesByTraversalIndex: readonly string[],
  nodeNamesByPartNumber: ReadonlyMap<number, string>
): string | undefined {
  return nodeNamesByTraversalIndex[nodeNumber] ?? nodeNamesByPartNumber.get(nodeNumber);
}

function readBinarySkinBoneNodeNumbers(
  bytes: Buffer,
  node: BinaryNode,
  count: number
): number[] {
  const boneNodeNumbers: number[] = [];
  const safeCount =
    Number.isInteger(count) && count > 0 && count <= 128
      ? count
      : BINARY_SKIN_BONE_NODE_NUMBER_COUNT;
  for (let index = 0; index < safeCount; index += 1) {
    const offset = node.absOffset + BINARY_SKIN_BONE_NODE_NUMBERS_OFFSET + index * 2;
    if (offset + 2 > bytes.length) {
      break;
    }
    boneNodeNumbers.push(bytes.readInt16LE(offset));
  }
  return boneNodeNumbers;
}

function readBinarySkinBoneNodeNumberCount(bytes: Buffer, node: BinaryNode): number {
  return node.absOffset + BINARY_SKIN_BONE_NODE_NUMBERS_OFFSET < bytes.length
    ? BINARY_SKIN_BONE_NODE_NUMBER_COUNT
    : 0;
}

function readBinarySkinInverseBindPoses(
  bytes: Buffer,
  node: BinaryNode,
  nodeNamesByTraversalIndex: readonly string[],
  nodeNamesByPartNumber: ReadonlyMap<number, string>,
  boneNodeNumbers: readonly number[]
): AuroraSkinInverseBindPoseMetadata[] {
  const qboneHeader = readOptionalBinaryArrayHeader(
    bytes,
    node.absOffset + BINARY_SKIN_QBONE_REF_INV_OFFSET
  );
  const tboneHeader = readOptionalBinaryArrayHeader(
    bytes,
    node.absOffset + BINARY_SKIN_TBONE_REF_INV_OFFSET
  );
  const qboneStart = resolveBinaryRawArrayStart(bytes, BINARY_MODEL_BASE, qboneHeader, 16);
  const tboneStart = resolveBinaryRawArrayStart(bytes, BINARY_MODEL_BASE, tboneHeader, 12);
  if (qboneStart === null && tboneStart === null) {
    return [];
  }

  const poseCount = boneNodeNumbers.length;
  const poses: AuroraSkinInverseBindPoseMetadata[] = [];
  for (let boneRef = 0; boneRef < poseCount; boneRef += 1) {
    const nodeNumber = boneNodeNumbers[boneRef];
    if (typeof nodeNumber !== "number" || nodeNumber < 0) {
      continue;
    }
    const bone = resolveBinarySkinBoneNodeName(
      nodeNumber,
      nodeNamesByTraversalIndex,
      nodeNamesByPartNumber
    );
    if (!bone) {
      continue;
    }
    const qboneIndex = resolveBinarySkinInverseBindPoseArrayIndex(
      nodeNumber,
      boneRef,
      qboneHeader?.count ?? 0
    );
    const tboneIndex = resolveBinarySkinInverseBindPoseArrayIndex(
      nodeNumber,
      boneRef,
      tboneHeader?.count ?? 0
    );

    const qboneRefInv =
      qboneStart !== null && qboneIndex !== null
        ? readBinarySkinInverseBindQuaternion(bytes, qboneStart + qboneIndex * 16)
        : undefined;
    const tboneRefInv =
      tboneStart !== null && tboneIndex !== null
        ? readBinaryVec3(bytes, tboneStart + tboneIndex * 12)
        : undefined;
    if (!qboneRefInv && !tboneRefInv) {
      continue;
    }
    poses.push({
      bone,
      ...(qboneRefInv ? { qboneRefInv } : {}),
      ...(tboneRefInv ? { tboneRefInv } : {})
    });
  }
  return poses;
}

function resolveBinarySkinInverseBindPoseArrayIndex(
  nodeNumber: number,
  boneRef: number,
  poseCount: number
): number | null {
  if (nodeNumber >= 0 && nodeNumber < poseCount) {
    return nodeNumber;
  }
  return boneRef >= 0 && boneRef < poseCount ? boneRef : null;
}

function readBinaryMeshTextureTokens(bytes: Buffer, absOffset: number): Record<number, string> {
  const tokens: Record<number, string> = {};
  for (let index = 0; index < 3; index += 1) {
    const raw = readCString(bytes, absOffset + BINARY_MESH_TEXTURES_OFFSET + index * 64, 64);
    const normalized = normalizeTextureToken(raw);
    if (normalized) {
      tokens[index] = normalized;
    }
  }
  return tokens;
}

function findModelName(lines: string[]): string {
  for (const line of lines) {
    const tokens = tokenizeLine(line);
    if (tokens[0]?.toLowerCase() === "newmodel" && tokens[1]) {
      return sanitizeName(tokens[1]);
    }
  }
  return "aurora-model";
}

function findModelSupermodel(lines: string[], modelName: string): string | undefined {
  const normalizedModelName = modelName.toLowerCase();
  for (const line of lines) {
    const tokens = tokenizeLine(line);
    if (tokens[0]?.toLowerCase() !== "setsupermodel") {
      continue;
    }
    const rawCandidate = tokens[2] ?? tokens[1];
    if (!rawCandidate) {
      continue;
    }
    const candidate = sanitizeName(rawCandidate);
    const normalizedCandidate = candidate.toLowerCase();
    if (
      normalizedCandidate.length > 0 &&
      normalizedCandidate !== "null" &&
      normalizedCandidate !== normalizedModelName
    ) {
      return candidate;
    }
  }
  return undefined;
}

function findModelAnimationScale(lines: string[]): number | undefined {
  for (const line of lines) {
    const tokens = tokenizeLine(line);
    if (tokens[0]?.toLowerCase() !== "setanimationscale") {
      continue;
    }
    const value = Number.parseFloat(tokens[1] ?? "");
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}

function parseSourceAnimations(
  lines: string[],
  animationScale?: number
): AuroraSourceAnimationSummary[] {
  const animations: AuroraSourceAnimationSummary[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const tokens = tokenizeLine(lines[index]);
    if (tokens[0]?.toLowerCase() !== "newanim") {
      continue;
    }
    const parsed = parseSourceAnimationBlock(lines, index, animationScale);
    animations.push(parsed.animation);
    index = parsed.nextIndex;
  }
  return animations;
}

function parseSourceAnimationBlock(
  lines: string[],
  startIndex: number,
  animationScale?: number
): { animation: AuroraSourceAnimationSummary; nextIndex: number } {
  const startTokens = tokenizeLine(lines[startIndex]);
  const name = sanitizeName(startTokens[1] ?? `animation_${startIndex}`);
  const targetModel = normalizeOptionalName(startTokens[2]);
  const nodes: AuroraSourceAnimationNodeSummary[] = [];
  const events: AuroraSourceAnimationEventSummary[] = [];
  let animRoot: string | undefined;
  let length = 0;
  let transitionTime = 0;
  let index = startIndex + 1;

  while (index < lines.length) {
    const tokens = tokenizeLine(lines[index]);
    const keyword = tokens[0]?.toLowerCase();
    if (keyword === "doneanim") {
      break;
    }
    if (keyword === "length") {
      length = readFiniteNumber(tokens[1]) ?? length;
      index += 1;
      continue;
    }
    if (keyword === "transtime") {
      transitionTime = readFiniteNumber(tokens[1]) ?? transitionTime;
      index += 1;
      continue;
    }
    if (keyword === "animroot") {
      animRoot = normalizeOptionalName(tokens[1]) ?? animRoot;
      index += 1;
      continue;
    }
    if (keyword === "event") {
      const time = readFiniteNumber(tokens[1]);
      const eventName = normalizeOptionalName(tokens[2]);
      if (typeof time === "number" && time >= 0 && eventName) {
        events.push({ time, name: eventName });
      }
      index += 1;
      continue;
    }
    if (keyword === "node") {
      const parsed = parseSourceAnimationNode(lines, index);
      nodes.push(parsed.node);
      index = parsed.nextIndex;
      continue;
    }
    index += 1;
  }

  const nodeNames = nodes.map((node) => node.nodeName);
  const alphaKeyCount = nodes.reduce((sum, node) => sum + (node.alphaKeyCount ?? 0), 0);
  const selfIllumColorKeyCount = nodes.reduce(
    (sum, node) => sum + (node.selfIllumColorKeyCount ?? 0),
    0
  );
  return {
    animation: {
      name,
      ...(targetModel ? { targetModel } : {}),
      ...(animRoot ? { animRoot } : {}),
      ...(typeof animationScale === "number" ? { animationScale } : {}),
      length,
      transitionTime,
      ...(events.length > 0 ? { events: sortAuroraSourceAnimationEvents(events) } : {}),
      nodeCount: nodes.length,
      nodeNames,
      positionKeyCount: nodes.reduce((sum, node) => sum + node.positionKeyCount, 0),
      orientationKeyCount: nodes.reduce((sum, node) => sum + node.orientationKeyCount, 0),
      scaleKeyCount: nodes.reduce((sum, node) => sum + node.scaleKeyCount, 0),
      ...(alphaKeyCount > 0 ? { alphaKeyCount } : {}),
      ...(selfIllumColorKeyCount > 0 ? { selfIllumColorKeyCount } : {}),
      nodes
    },
    nextIndex: index
  };
}

function parseSourceAnimationNode(
  lines: string[],
  startIndex: number
): { node: AuroraSourceAnimationNodeSummary; nextIndex: number } {
  const startTokens = tokenizeLine(lines[startIndex]);
  const nodeName = sanitizeName(startTokens[2] ?? `node_${startIndex}`);
  let positionKeys: AuroraSourceAnimationVectorKey[] = [];
  let orientationKeys: AuroraSourceAnimationOrientationKey[] = [];
  let scaleKeys: AuroraSourceAnimationScalarKey[] = [];
  let alphaKeys: AuroraSourceAnimationScalarKey[] = [];
  let selfIllumColorKeys: AuroraSourceAnimationVectorKey[] = [];
  let danglyDisplacement: number | undefined;
  let danglyPeriod: number | undefined;
  let danglyTightness: number | undefined;
  let samplePeriod: number | undefined;
  let animVerts: Vec3[] = [];
  let animTverts: Vec2[] = [];
  let index = startIndex + 1;

  while (index < lines.length) {
    const tokens = tokenizeLine(lines[index]);
    const keyword = tokens[0]?.toLowerCase();
    if (keyword === "endnode") {
      index += 1;
      break;
    }
    if (keyword === "positionkey") {
      const parsed = readSourceAnimationVectorKeys(lines, index + 1, readKeyCount(tokens[1]), 3);
      positionKeys = [...positionKeys, ...parsed.keys];
      index = parsed.nextIndex;
      continue;
    }
    if (keyword === "orientationkey") {
      const parsed = readSourceAnimationOrientationKeys(
        lines,
        index + 1,
        readKeyCount(tokens[1])
      );
      orientationKeys = [...orientationKeys, ...parsed.keys];
      index = parsed.nextIndex;
      continue;
    }
    if (keyword === "scalekey") {
      const parsed = readSourceAnimationScalarKeys(lines, index + 1, readKeyCount(tokens[1]));
      scaleKeys = [...scaleKeys, ...parsed.keys];
      index = parsed.nextIndex;
      continue;
    }
    if (keyword === "alphakey") {
      const parsed = readSourceAnimationScalarKeys(lines, index + 1, readKeyCount(tokens[1]));
      alphaKeys = [...alphaKeys, ...parsed.keys];
      index = parsed.nextIndex;
      continue;
    }
    if (keyword === "selfillumcolorkey" || keyword === "setfillumcolorkey") {
      const parsed = readSourceAnimationVectorKeys(lines, index + 1, readKeyCount(tokens[1]), 3);
      selfIllumColorKeys = [...selfIllumColorKeys, ...parsed.keys];
      index = parsed.nextIndex;
      continue;
    }
    if (keyword === "displacement") {
      danglyDisplacement = readFiniteNumber(tokens[1]) ?? danglyDisplacement;
      index += 1;
      continue;
    }
    if (keyword === "period") {
      danglyPeriod = readFiniteNumber(tokens[1]) ?? danglyPeriod;
      index += 1;
      continue;
    }
    if (keyword === "tightness") {
      danglyTightness = readFiniteNumber(tokens[1]) ?? danglyTightness;
      index += 1;
      continue;
    }
    if (keyword === "sampleperiod") {
      samplePeriod = readFiniteNumber(tokens[1]) ?? samplePeriod;
      index += 1;
      continue;
    }
    if (keyword === "animverts") {
      const parsed = readNumericRows(lines, index + 1, parseCount(tokens[1]), 3);
      animVerts = [
        ...animVerts,
        ...parsed.rows.map((row) => [
          parseNumber(row[0]),
          parseNumber(row[1]),
          parseNumber(row[2])
        ] as Vec3)
      ];
      index = parsed.nextIndex;
      continue;
    }
    if (keyword === "animtverts") {
      const parsed = readNumericRows(lines, index + 1, parseCount(tokens[1]), 2);
      animTverts = [
        ...animTverts,
        ...parsed.rows.map((row) => [
          parseNumber(row[0]),
          parseNumber(row[1])
        ] as Vec2)
      ];
      index = parsed.nextIndex;
      continue;
    }
    index += 1;
  }

  return {
    node: {
      nodeName,
      positionKeyCount: positionKeys.length,
      orientationKeyCount: orientationKeys.length,
      scaleKeyCount: scaleKeys.length,
      ...(alphaKeys.length > 0 ? { alphaKeyCount: alphaKeys.length } : {}),
      ...(selfIllumColorKeys.length > 0
        ? { selfIllumColorKeyCount: selfIllumColorKeys.length }
        : {}),
      ...(typeof danglyDisplacement === "number" ? { danglyDisplacement } : {}),
      ...(typeof danglyPeriod === "number" ? { danglyPeriod } : {}),
      ...(typeof danglyTightness === "number" ? { danglyTightness } : {}),
      ...(typeof samplePeriod === "number" ? { samplePeriod } : {}),
      ...(animVerts.length > 0
        ? { animVertCount: animVerts.length, animVerts }
        : {}),
      ...(animTverts.length > 0
        ? { animTvertCount: animTverts.length, animTverts }
        : {}),
      positionKeys,
      orientationKeys,
      scaleKeys,
      ...(alphaKeys.length > 0 ? { alphaKeys } : {}),
      ...(selfIllumColorKeys.length > 0 ? { selfIllumColorKeys } : {})
    },
    nextIndex: index
  };
}

function readSourceAnimationVectorKeys(
  lines: string[],
  startIndex: number,
  expectedCount: number,
  componentCount: number
): { keys: AuroraSourceAnimationVectorKey[]; nextIndex: number } {
  const keys: AuroraSourceAnimationVectorKey[] = [];
  let index = startIndex;
  while (index < lines.length) {
    const tokens = tokenizeLine(lines[index]);
    const firstToken = tokens[0]?.toLowerCase();
    if (firstToken === "endlist") {
      index += 1;
      break;
    }
    if (!firstToken || !Number.isFinite(Number.parseFloat(firstToken))) {
      break;
    }
    if (tokens.length >= componentCount + 1) {
      keys.push({
        time: readFiniteNumber(tokens[0]) ?? 0,
        value: [
          readFiniteNumber(tokens[1]) ?? 0,
          readFiniteNumber(tokens[2]) ?? 0,
          readFiniteNumber(tokens[3]) ?? 0
        ]
      });
    }
    index += 1;
    if (expectedCount > 0 && keys.length >= expectedCount) {
      break;
    }
  }
  return { keys, nextIndex: index };
}

function readSourceAnimationOrientationKeys(
  lines: string[],
  startIndex: number,
  expectedCount: number
): { keys: AuroraSourceAnimationOrientationKey[]; nextIndex: number } {
  const keys: AuroraSourceAnimationOrientationKey[] = [];
  let index = startIndex;
  while (index < lines.length) {
    const tokens = tokenizeLine(lines[index]);
    const firstToken = tokens[0]?.toLowerCase();
    if (firstToken === "endlist") {
      index += 1;
      break;
    }
    if (!firstToken || !Number.isFinite(Number.parseFloat(firstToken))) {
      break;
    }
    if (tokens.length >= 5) {
      keys.push({
        time: readFiniteNumber(tokens[0]) ?? 0,
        axisAngle: [
          readFiniteNumber(tokens[1]) ?? 0,
          readFiniteNumber(tokens[2]) ?? 0,
          readFiniteNumber(tokens[3]) ?? 0,
          readFiniteNumber(tokens[4]) ?? 0
        ]
      });
    }
    index += 1;
    if (expectedCount > 0 && keys.length >= expectedCount) {
      break;
    }
  }
  return { keys, nextIndex: index };
}

function readSourceAnimationScalarKeys(
  lines: string[],
  startIndex: number,
  expectedCount: number
): { keys: AuroraSourceAnimationScalarKey[]; nextIndex: number } {
  const keys: AuroraSourceAnimationScalarKey[] = [];
  let index = startIndex;
  while (index < lines.length) {
    const tokens = tokenizeLine(lines[index]);
    const firstToken = tokens[0]?.toLowerCase();
    if (firstToken === "endlist") {
      index += 1;
      break;
    }
    if (!firstToken || !Number.isFinite(Number.parseFloat(firstToken))) {
      break;
    }
    if (tokens.length >= 2) {
      keys.push({
        time: readFiniteNumber(tokens[0]) ?? 0,
        value: readFiniteNumber(tokens[1]) ?? 1
      });
    }
    index += 1;
    if (expectedCount > 0 && keys.length >= expectedCount) {
      break;
    }
  }
  return { keys, nextIndex: index };
}

function readKeyCount(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function readFiniteNumber(value: string | undefined): number | undefined {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeOptionalName(value: string | undefined): string | undefined {
  const raw = value?.trim().replace(/^['"]+|['"]+$/gu, "") ?? "";
  if (!raw || /^(null|none)$/iu.test(raw)) {
    return undefined;
  }
  return sanitizeName(raw);
}

function buildSourceHierarchyNode(mesh: ParsedTrimesh): AuroraSourceHierarchyNode {
  const orientation = mesh.sourceOrientation ?? mesh.transform.orientation;
  return {
    name: mesh.name,
    nodeType: mesh.nodeType,
    ...(mesh.parentName ? { parentName: mesh.parentName } : {}),
    position: [...mesh.transform.position],
    ...(orientation
      ? {
          orientation: [...orientation] as Quaternion,
          orientationFormat: mesh.sourceOrientation ? "axis-angle" : "quaternion"
        }
      : {}),
    scale: Number.isFinite(mesh.transform.scale) ? mesh.transform.scale : 1
  };
}

function parseTrimesh(
  lines: string[],
  startIndex: number
): { mesh: ParsedTrimesh; nodeType: string; nextIndex: number } {
  const startTokens = tokenizeLine(lines[startIndex]);
  const nodeType = startTokens[1]?.toLowerCase() ?? "";
  const mesh: ParsedTrimesh = {
    name: sanitizeName(startTokens[2] ?? "trimesh"),
    nodeType,
    offset: [0, 0, 0],
    transform: {
      position: [0, 0, 0],
      scale: 1
    },
    textureSlotTokens: {},
    ambient: [0.2, 0.2, 0.2],
    diffuse: [0.8, 0.8, 0.8],
    specular: [0, 0, 0],
    shininess: 0,
    alpha: 1,
    transparencyHint: 0,
    rotateTexture: false,
    render: 1,
    materialSourceKeys: [],
    danglyPeriod: 1,
    danglyTightness: 1,
    danglyDisplacement: 0.5,
    danglyConstraints: [],
    vertices: [],
    tverts: [],
    normals: [],
    tangents: [],
    faces: []
  };

  let index = startIndex + 1;
  while (index < lines.length) {
    const tokens = tokenizeLine(lines[index]);
    const keyword = tokens[0]?.toLowerCase();
    if (keyword === "endnode") {
      return { mesh, nodeType, nextIndex: index };
    }

    if (keyword === "parent" && tokens[1]) {
      const parentName = sanitizeName(tokens[1]);
      mesh.parentName = /^(null|none)$/iu.test(parentName) ? undefined : parentName;
      index += 1;
      continue;
    }

    if (keyword === "position" && tokens.length >= 4) {
      mesh.offset = [parseNumber(tokens[1]), parseNumber(tokens[2]), parseNumber(tokens[3])];
      mesh.transform.position = [...mesh.offset];
      index += 1;
      continue;
    }

    if (keyword === "orientation" && tokens.length >= 5) {
      const sourceOrientation = [
        parseNumber(tokens[1]),
        parseNumber(tokens[2]),
        parseNumber(tokens[3]),
        parseNumber(tokens[4])
      ] as Quaternion;
      mesh.sourceOrientation = sourceOrientation;
      mesh.transform.orientation = convertAuroraAxisAngleToQuaternion(sourceOrientation);
      index += 1;
      continue;
    }

    if (keyword === "scale" && tokens[1]) {
      const parsedScale = parseNumber(tokens[1]);
      mesh.transform.scale =
        Number.isFinite(parsedScale) && Math.abs(parsedScale) > 1e-9 ? parsedScale : 1;
      index += 1;
      continue;
    }

    if (keyword === "bitmap" && tokens[1]) {
      mesh.bitmapToken = normalizeTextureToken(tokens[1]);
      index += 1;
      continue;
    }

    if (keyword === "materialname" && tokens[1]) {
      mesh.materialName = normalizeTextureToken(tokens[1]);
      addMaterialSourceKey(mesh, "materialname");
      index += 1;
      continue;
    }

    if (keyword === "renderhint" && tokens[1]) {
      mesh.renderHint = tokens[1].trim();
      addMaterialSourceKey(mesh, "renderhint");
      index += 1;
      continue;
    }

    if (keyword === "ambient" && tokens.length >= 4) {
      mesh.ambient = [parseNumber(tokens[1]), parseNumber(tokens[2]), parseNumber(tokens[3])];
      addMaterialSourceKey(mesh, "ambient");
      index += 1;
      continue;
    }

    if (keyword === "diffuse" && tokens.length >= 4) {
      mesh.diffuse = [parseNumber(tokens[1]), parseNumber(tokens[2]), parseNumber(tokens[3])];
      addMaterialSourceKey(mesh, "diffuse");
      index += 1;
      continue;
    }

    if (keyword === "specular" && tokens.length >= 4) {
      mesh.specular = [parseNumber(tokens[1]), parseNumber(tokens[2]), parseNumber(tokens[3])];
      addMaterialSourceKey(mesh, "specular");
      index += 1;
      continue;
    }

    if (keyword === "shininess" && tokens[1]) {
      mesh.shininess = Math.max(0, readFiniteNumber(tokens[1]) ?? mesh.shininess);
      addMaterialSourceKey(mesh, "shininess");
      index += 1;
      continue;
    }

    if (keyword === "alpha" && tokens[1]) {
      mesh.alpha = Math.max(0, Math.min(1, readFiniteNumber(tokens[1]) ?? mesh.alpha));
      addMaterialSourceKey(mesh, "alpha");
      index += 1;
      continue;
    }

    if ((keyword === "selfillumcolor" || keyword === "setfillumcolor") && tokens.length >= 4) {
      mesh.selfIllumColor = [
        parseNumber(tokens[1]),
        parseNumber(tokens[2]),
        parseNumber(tokens[3])
      ];
      addMaterialSourceKey(mesh, keyword);
      index += 1;
      continue;
    }

    if (keyword === "transparencyhint" && tokens[1]) {
      mesh.transparencyHint = Math.max(
        0,
        Math.trunc(readFiniteNumber(tokens[1]) ?? mesh.transparencyHint)
      );
      addMaterialSourceKey(mesh, "transparencyhint");
      index += 1;
      continue;
    }

    if (keyword === "rotatetexture" && tokens[1]) {
      mesh.rotateTexture = Math.trunc(readFiniteNumber(tokens[1]) ?? 0) === 1;
      addMaterialSourceKey(mesh, "rotatetexture");
      index += 1;
      continue;
    }

    if (keyword === "render" && tokens[1]) {
      mesh.render = Math.max(0, Math.trunc(readFiniteNumber(tokens[1]) ?? mesh.render));
      addMaterialSourceKey(mesh, "render");
      index += 1;
      continue;
    }

    if ((keyword === "texture0" || keyword === "texture") && tokens[1]) {
      const textureReference = normalizeTextureToken(tokens[1]);
      if (textureReference) {
        mesh.texture0Token = textureReference;
        mesh.textureSlotTokens[0] = textureReference;
      }
      index += 1;
      continue;
    }

    const textureSlotMatch = keyword?.match(/^texture(\d+)$/u);
    if (textureSlotMatch?.[1] && tokens[1]) {
      const slot = Number.parseInt(textureSlotMatch[1], 10);
      const textureReference = normalizeTextureToken(tokens[1]);
      if (Number.isInteger(slot) && slot >= 0 && textureReference) {
        mesh.textureSlotTokens[slot] = textureReference;
        if (slot === 0) {
          mesh.texture0Token = textureReference;
        }
      }
      index += 1;
      continue;
    }

    if (keyword === "verts" && tokens[1]) {
      const parsed = readNumericRows(lines, index + 1, parseCount(tokens[1]), 3);
      mesh.vertices = parsed.rows.map((row) => [
        parseNumber(row[0]),
        parseNumber(row[1]),
        parseNumber(row[2])
      ]);
      index = parsed.nextIndex;
      continue;
    }

    if (keyword === "tverts" && tokens[1]) {
      const parsed = readNumericRows(lines, index + 1, parseCount(tokens[1]), 2);
      mesh.tverts = parsed.rows.map((row) => [
        parseNumber(row[0]),
        1 - parseNumber(row[1])
      ]);
      index = parsed.nextIndex;
      continue;
    }

    if (keyword === "normals" && tokens[1]) {
      const parsed = readNumericRows(lines, index + 1, parseCount(tokens[1]), 3);
      mesh.normals = parsed.rows.map((row) => [
        parseNumber(row[0]),
        parseNumber(row[1]),
        parseNumber(row[2])
      ]);
      index = parsed.nextIndex;
      continue;
    }

    if (keyword === "tangents" && tokens[1]) {
      const parsed = readNumericRows(lines, index + 1, parseCount(tokens[1]), 4);
      mesh.tangents = parsed.rows.map(parseAuroraMdlTangentRow);
      index = parsed.nextIndex;
      continue;
    }

    if (keyword === "faces" && tokens[1]) {
      const parsed = readNumericRows(lines, index + 1, parseCount(tokens[1]), 3);
      mesh.faces = parsed.rows.map(parseFaceRow);
      index = parsed.nextIndex;
      continue;
    }

    if (keyword === "weights" && tokens[1]) {
      const parsed = readSkinWeightRows(lines, index + 1, parseCount(tokens[1]));
      mesh.vertexWeights = parsed.rows;
      index = parsed.nextIndex;
      continue;
    }

    if (keyword === "period" && tokens[1]) {
      mesh.danglyPeriod = Math.max(0, readFiniteNumber(tokens[1]) ?? mesh.danglyPeriod);
      index += 1;
      continue;
    }

    if (keyword === "tightness" && tokens[1]) {
      mesh.danglyTightness = Math.max(0, readFiniteNumber(tokens[1]) ?? mesh.danglyTightness);
      index += 1;
      continue;
    }

    if (keyword === "displacement" && tokens[1]) {
      mesh.danglyDisplacement = Math.abs(
        readFiniteNumber(tokens[1]) ?? mesh.danglyDisplacement
      );
      index += 1;
      continue;
    }

    if (keyword === "constraints" && tokens[1]) {
      const parsed = readDanglyConstraintRows(lines, index + 1, parseCount(tokens[1]));
      mesh.danglyConstraints = parsed.rows;
      index = parsed.nextIndex;
      continue;
    }

    index += 1;
  }

  return { mesh, nodeType, nextIndex: index };
}

function resolveAsciiWorldMatrix(
  nodeName: string,
  nodes: ReadonlyMap<string, { parentName?: string; transform: BinaryTransform }>
): Mat4 {
  const matrixCache = new Map<string, Mat4>();

  const resolveRecursive = (name: string, depth = 0): Mat4 => {
    const normalizedName = toAsciiNodeKey(name);
    const cached = matrixCache.get(normalizedName);
    if (cached) {
      return cached;
    }
    if (depth > 64) {
      return identityMat4();
    }

    const node = nodes.get(normalizedName);
    if (!node) {
      return identityMat4();
    }

    const local = buildBinaryLocalMatrix(node.transform);
    if (!node.parentName || node.parentName === normalizedName) {
      matrixCache.set(normalizedName, local);
      return local;
    }

    const world = multiplyMat4(resolveRecursive(node.parentName, depth + 1), local);
    matrixCache.set(normalizedName, world);
    return world;
  };

  return resolveRecursive(nodeName);
}

function toAsciiNodeKey(value: string): string {
  return sanitizeName(value).toLowerCase();
}

function readNumericRows(
  lines: string[],
  startIndex: number,
  count: number,
  minColumns: number
): { rows: string[][]; nextIndex: number } {
  const rows: string[][] = [];
  let index = startIndex;

  while (index < lines.length && rows.length < count) {
    const tokens = tokenizeLine(lines[index]);
    index += 1;
    if (tokens.length === 0) {
      continue;
    }
    if (tokens.length < minColumns) {
      throw new Error(`Malformed ASCII MDL numeric row: ${tokens.join(" ")}`);
    }
    rows.push(tokens);
  }

  if (rows.length !== count) {
    throw new Error(`ASCII MDL table expected ${count} rows but found ${rows.length}.`);
  }

  return {
    rows,
    nextIndex: index
  };
}

function parseAuroraMdlTangentRow(row: string[]): AuroraMdlTangent {
  if (row.length >= 9) {
    return {
      tangent: [
        parseNumber(row[0]),
        parseNumber(row[1]),
        parseNumber(row[2])
      ],
      binormal: [
        parseNumber(row[3]),
        parseNumber(row[4]),
        parseNumber(row[5])
      ],
      normal: [
        parseNumber(row[6]),
        parseNumber(row[7]),
        parseNumber(row[8])
      ]
    };
  }

  const handedness = parseNumber(row[3]);
  return {
    tangent: [
      parseNumber(row[0]),
      parseNumber(row[1]),
      parseNumber(row[2])
    ],
    handedness: handedness < 0 ? -1 : 1
  };
}

function readSkinWeightRows(
  lines: string[],
  startIndex: number,
  count: number
): { rows: AuroraSkinWeightReference[][]; nextIndex: number } {
  const rows: AuroraSkinWeightReference[][] = [];
  let index = startIndex;

  while (index < lines.length && rows.length < count) {
    const tokens = tokenizeLine(lines[index]);
    index += 1;
    const pairs: AuroraSkinWeightReference[] = [];
    for (let tokenIndex = 0; tokenIndex + 1 < tokens.length; tokenIndex += 2) {
      const bone = normalizeSkinWeightBoneName(tokens[tokenIndex]);
      if (!bone) {
        continue;
      }
      const weight = parseNumber(tokens[tokenIndex + 1]);
      if (weight > 0) {
        pairs.push({ bone, weight });
      }
    }
    rows.push(pairs);
  }

  if (rows.length !== count) {
    throw new Error(`ASCII MDL skin weights expected ${count} rows but found ${rows.length}.`);
  }

  return { rows, nextIndex: index };
}

function readDanglyConstraintRows(
  lines: string[],
  startIndex: number,
  count: number
): { rows: number[]; nextIndex: number } {
  const rows: number[] = [];
  let index = startIndex;

  while (index < lines.length && rows.length < count) {
    const tokens = tokenizeLine(lines[index]);
    index += 1;
    if (tokens.length === 0) {
      continue;
    }
    rows.push(normalizeDanglyConstraintWeight(readFiniteNumber(tokens[0]) ?? 0));
  }

  if (rows.length !== count) {
    throw new Error(`ASCII MDL dangly constraints expected ${count} rows but found ${rows.length}.`);
  }

  return { rows, nextIndex: index };
}

function normalizeDanglyConstraintWeight(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  const normalized = value > 1 ? value / 255 : value;
  return Math.max(0, Math.min(1, normalized));
}

function addMaterialSourceKey(mesh: ParsedTrimesh, key: string): void {
  if (!mesh.materialSourceKeys.includes(key)) {
    mesh.materialSourceKeys.push(key);
  }
}

function normalizeSkinWeightBoneName(value: string | undefined): string | undefined {
  const raw = value?.trim().replace(/^['"]+|['"]+$/gu, "") ?? "";
  if (!raw || /^(null|none)$/iu.test(raw)) {
    return undefined;
  }
  return sanitizeName(raw);
}

function parseFaceRow(row: string[]): ParsedFace {
  const vertexIndices = [
    parseFaceVertexIndex(row[0]),
    parseFaceVertexIndex(row[1]),
    parseFaceVertexIndex(row[2])
  ] as [number, number, number];

  const tvertIndices = row.length >= 7
    ? ([
        parseFaceTvertIndex(row[4]),
        parseFaceTvertIndex(row[5]),
        parseFaceTvertIndex(row[6])
      ] as [number, number, number])
    : undefined;

  return {
    vertexIndices,
    tvertIndices,
    ...(row.length >= 4 ? { smoothingGroup: parseFaceSmoothingGroup(row[3]) } : {})
  };
}

function normalizeTextureToken(value: string): string | undefined {
  const normalized = value.trim().replace(/^['"]+|['"]+$/gu, "");
  if (!normalized || /^(null|none)$/iu.test(normalized)) {
    return undefined;
  }
  const withoutQuery = normalized.split(/[?#]/u, 1)[0] ?? normalized;
  const fileName = withoutQuery.replace(/\\/gu, "/").split("/").pop() ?? withoutQuery;
  const extensionIndex = fileName.lastIndexOf(".");
  const basename = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
  return sanitizeName(basename.toLowerCase());
}

function collectTextureReferences(model: ParsedModel): string[] {
  const references = new Set<string>();
  model.meshes.forEach((mesh) => {
    if (mesh.bitmapToken) {
      references.add(mesh.bitmapToken);
    }
    resolveTextureSlotReferences(mesh).forEach((slot) => references.add(slot.reference));
  });
  model.emitterTextureReferences.forEach((reference) => {
    references.add(reference);
  });
  return [...references].sort((left, right) => left.localeCompare(right));
}

function resolveTextureSlotReferences(mesh: ParsedTrimesh): AuroraTextureSlotReference[] {
  const referencesBySlot = new Map<number, string>();
  if (mesh.bitmapToken) {
    referencesBySlot.set(0, mesh.bitmapToken);
  }
  Object.entries(mesh.textureSlotTokens).forEach(([rawSlot, reference]) => {
    const slot = Number.parseInt(rawSlot, 10);
    if (Number.isInteger(slot) && slot >= 0 && reference) {
      referencesBySlot.set(slot, reference);
    }
  });
  if (mesh.texture0Token) {
    referencesBySlot.set(0, mesh.texture0Token);
  }
  return [...referencesBySlot.entries()]
    .sort(([left], [right]) => left - right)
    .map(([slot, reference]) => ({
      slot,
      role: resolveAuroraTextureSlotRole(slot),
      reference
    }));
}

function resolveAuroraTextureSlotRole(slot: number): string {
  return AURORA_TEXTURE_SLOT_ROLES[slot] ?? "unknown";
}

function buildAuroraSkinWeightsMetadata(
  mesh: ParsedTrimesh,
  gltfVertexSourceIndices: number[]
): AuroraSkinWeightsMetadata | undefined {
  if (mesh.nodeType !== "skin" || !mesh.vertexWeights || mesh.vertexWeights.length === 0) {
    return undefined;
  }

  const influencingBoneNames = new Set<string>();
  let maxInfluencesPerVertex = 0;
  let requiresWeightNormalization = false;
  const originalVertexWeights = mesh.vertexWeights.map((pairs) => {
    const normalizedPairs = pairs
      .filter((pair) => pair.bone.length > 0 && Number.isFinite(pair.weight) && pair.weight > 0)
      .map((pair) => ({ bone: pair.bone, weight: pair.weight }));
    let totalWeight = 0;
    normalizedPairs.forEach((pair) => {
      influencingBoneNames.add(pair.bone);
      totalWeight += pair.weight;
    });
    if (normalizedPairs.length > maxInfluencesPerVertex) {
      maxInfluencesPerVertex = normalizedPairs.length;
    }
    if (totalWeight > 0 && Math.abs(totalWeight - 1) > 0.01) {
      requiresWeightNormalization = true;
    }
    return normalizedPairs;
  });

  return {
    format: "aurora-mdl-original-vertex-weights",
    sourceWeightVertexCount: originalVertexWeights.length,
    gltfVertexSourceIndices,
    influencingBoneNames: Array.from(influencingBoneNames).sort((left, right) =>
      left.localeCompare(right)
    ),
    maxInfluencesPerVertex,
    requiresWeightNormalization,
    originalVertexWeights,
    ...(mesh.skinInverseBindPoses && mesh.skinInverseBindPoses.length > 0
      ? { inverseBindPoses: mesh.skinInverseBindPoses }
      : {})
  };
}

function buildAuroraDanglymeshMetadata(
  mesh: ParsedTrimesh,
  gltfVertexSourceIndices: number[]
): AuroraDanglymeshMetadata | undefined {
  if (mesh.nodeType !== "danglymesh" || mesh.danglyConstraints.length === 0) {
    return undefined;
  }

  return {
    format: "aurora-mdl-danglymesh-constraints",
    sourceConstraintVertexCount: mesh.danglyConstraints.length,
    gltfVertexSourceIndices,
    originalConstraints: mesh.danglyConstraints,
    period: mesh.danglyPeriod,
    tightness: mesh.danglyTightness,
    displacement: mesh.danglyDisplacement
  };
}

function buildAuroraAnimmeshMetadata(
  mesh: ParsedTrimesh,
  gltfVertexSourceIndices: number[],
  gltfVertexSourceTvertIndices: number[]
): AuroraAnimmeshMetadata | undefined {
  if (mesh.nodeType !== "animmesh" || (mesh.vertices.length === 0 && mesh.tverts.length === 0)) {
    return undefined;
  }

  return {
    format: "aurora-mdl-animmesh-tverts",
    ...(mesh.vertices.length > 0
      ? {
          sourceVertexCount: mesh.vertices.length,
          gltfVertexSourceIndices
        }
      : {}),
    sourceTvertCount: mesh.tverts.length,
    gltfVertexSourceTvertIndices
  };
}

function buildAuroraVertexShadingMetadata(
  mesh: ParsedTrimesh
): AuroraVertexShadingMetadata | undefined {
  if (mesh.normals.length === 0 && mesh.tangents.length === 0) {
    return undefined;
  }
  return {
    format: "aurora-mdl-source-vertex-shading",
    sourceNormalCount: mesh.normals.length,
    sourceTangentCount: mesh.tangents.length,
    usesSourceNormals: mesh.normals.length > 0 && mesh.normals.length === mesh.vertices.length,
    usesSourceTangents:
      mesh.tangents.length > 0 && mesh.tangents.length === mesh.vertices.length
  };
}

function buildAuroraMdlMaterialMetadata(mesh: ParsedTrimesh): AuroraMdlMaterialMetadata {
  return {
    format: "aurora-mdl-material",
    sourceKeys: [...mesh.materialSourceKeys].sort((left, right) =>
      left.localeCompare(right)
    ),
    ambient: mesh.ambient,
    diffuse: mesh.diffuse,
    specular: mesh.specular,
    shininess: mesh.shininess,
    alpha: mesh.alpha,
    transparencyHint: mesh.transparencyHint,
    rotateTexture: mesh.rotateTexture,
    render: mesh.render,
    ...(mesh.materialName ? { materialName: mesh.materialName } : {}),
    ...(mesh.renderHint ? { renderHint: mesh.renderHint } : {}),
    ...(mesh.selfIllumColor ? { selfIllumColor: mesh.selfIllumColor } : {})
  };
}

function resolveSourceHierarchyRootNodeNames(model: ParsedModel): string[] {
  const nodeNames = new Set(model.sourceHierarchy.map((node) => node.name.toLowerCase()));
  return model.sourceHierarchy
    .filter((node) => !node.parentName || !nodeNames.has(node.parentName.toLowerCase()))
    .map((node) => node.name)
    .filter((name, index, all) => all.indexOf(name) === index);
}

function resolveSourceHierarchyNodeTypes(model: ParsedModel): string[] {
  return model.sourceHierarchy
    .map((node) => node.nodeType)
    .filter((nodeType, index, all) => nodeType.length > 0 && all.indexOf(nodeType) === index)
    .sort((left, right) => left.localeCompare(right));
}

function countSourceHierarchyNodeTypes(model: ParsedModel): Record<string, number> {
  return model.sourceHierarchy.reduce<Record<string, number>>((counts, node) => {
    const nodeType = node.nodeType.trim().toLowerCase();
    if (nodeType.length === 0) {
      return counts;
    }
    counts[nodeType] = (counts[nodeType] ?? 0) + 1;
    return counts;
  }, {});
}

function createEmitterProxyMesh(textureReference?: string): ParsedTrimesh {
  return {
    name: "emitter_proxy",
    nodeType: "emitter",
    offset: [0, 0, 0],
    transform: {
      position: [0, 0, 0],
      scale: 1
    },
    bitmapToken: textureReference,
    texture0Token: textureReference,
    textureSlotTokens: textureReference ? { 0: textureReference } : {},
    ambient: [0.2, 0.2, 0.2],
    diffuse: [0.8, 0.8, 0.8],
    specular: [0, 0, 0],
    shininess: 0,
    alpha: 1,
    transparencyHint: 0,
    rotateTexture: false,
    render: 1,
    materialSourceKeys: [],
    danglyPeriod: 1,
    danglyTightness: 1,
    danglyDisplacement: 0.5,
    danglyConstraints: [],
    normals: [],
    tangents: [],
    vertices: [
      [-0.5, 0, 0],
      [0.5, 0, 0],
      [0.5, 1, 0],
      [-0.5, 1, 0]
    ],
    tverts: [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0]
    ],
    faces: [
      { vertexIndices: [0, 1, 2], tvertIndices: [0, 1, 2] },
      { vertexIndices: [0, 2, 3], tvertIndices: [0, 2, 3] }
    ]
  };
}

function buildConversionWarnings(model: ParsedModel): string[] {
  const warnings: string[] = [];
  const textureReferences = collectTextureReferences(model);
  if (textureReferences.length > 0) {
    warnings.push(
      "Aurora MDL texture references were captured in GLB extras; image conversion is resolved through render package texture assets."
    );
  }
  if (model.meshes.some((mesh) => mesh.nodeType === "skin" && (mesh.vertexWeights?.length ?? 0) > 0)) {
    warnings.push(
      "Aurora MDL skin weights were captured in GLB extras for frontend CPU skin deformation."
    );
  }
  return warnings;
}

function buildGeometry(model: ParsedModel): GeometryBuffers {
  const positions: Vec3[] = [];
  const sourceNormals: Array<Vec3 | null> = [];
  const tangents: Vec4[] = [];
  const texcoords: Vec2[] = [];
  const indices: number[] = [];
  const primitives: GeometryPrimitive[] = [];
  const hasTexcoords = model.meshes.some(
    (mesh) => mesh.tverts.length > 0 && mesh.faces.some((face) => Boolean(face.tvertIndices))
  );

  model.meshes.forEach((mesh, meshIndex) => {
    const firstIndex = indices.length;
    const firstVertex = positions.length;
    const usesSourceNormals = mesh.normals.length > 0 && mesh.normals.length === mesh.vertices.length;
    const usesSourceTangents =
      mesh.tangents.length > 0 && mesh.tangents.length === mesh.vertices.length;
    const localIndices: number[] = [];
    const sourceVertexIndices: number[] = [];
    const sourceTvertIndices: number[] = [];
    const vertexByKey = new Map<string, number>();
    const smoothingNormals = usesSourceNormals ? null : buildSmoothingGroupNormalLookup(mesh);
    for (let faceIndex = 0; faceIndex < mesh.faces.length; faceIndex += 1) {
      const face = mesh.faces[faceIndex]!;
      const invalidVertexIndex = face.vertexIndices.some(
        (vertexIndex) => !isValidIndex(vertexIndex, mesh.vertices.length)
      );
      if (invalidVertexIndex) {
        continue;
      }
      const orderedCorners = [0, 2, 1] as const;
      for (const corner of orderedCorners) {
        const vertexIndex = face.vertexIndices[corner];
        const tvertIndex = face.tvertIndices?.[corner];
        const hasValidTvertIndex =
          typeof tvertIndex === "number" && isValidIndex(tvertIndex, mesh.tverts.length);
        const smoothingKey = smoothingNormals?.keysByFaceCorner[faceIndex]?.[corner] ?? "";
        const smoothingNormal = smoothingNormals?.normalsByFaceCorner[faceIndex]?.[corner] ?? null;

        const key = `${meshIndex}:${vertexIndex}:${hasValidTvertIndex ? tvertIndex : -1}:${smoothingKey}`;
        const existing = vertexByKey.get(key);
        if (typeof existing === "number") {
          indices.push(existing);
          localIndices.push(existing - firstVertex);
          continue;
        }

        const rawPosition = addVec3(mesh.vertices[vertexIndex], mesh.offset);
        const position = convertAuroraPositionToGltf(rawPosition);
        const nextIndex = positions.length;
        vertexByKey.set(key, nextIndex);
        sourceVertexIndices.push(vertexIndex);
        sourceTvertIndices.push(hasValidTvertIndex ? tvertIndex : 0);
        positions.push(position);
        sourceNormals.push(
          usesSourceNormals
            ? normalizeVec3(
                convertAuroraPositionToGltf(mesh.normals[vertexIndex] ?? [0, 1, 0])
              ) ??
                null
            : smoothingNormal
        );
        tangents.push(
          usesSourceTangents
            ? convertAuroraTangentToGltf(mesh.tangents[vertexIndex])
            : [1, 0, 0, 1]
        );
        if (hasTexcoords) {
          texcoords.push(hasValidTvertIndex ? mesh.tverts[tvertIndex] : [0, 0]);
        }
        indices.push(nextIndex);
        localIndices.push(nextIndex - firstVertex);
      }
    }
    const indexCount = indices.length - firstIndex;
    const vertexCount = positions.length - firstVertex;
    if (indexCount > 0) {
      const skinWeights = buildAuroraSkinWeightsMetadata(mesh, sourceVertexIndices);
      const danglymesh = buildAuroraDanglymeshMetadata(mesh, sourceVertexIndices);
      const animmesh = buildAuroraAnimmeshMetadata(mesh, sourceVertexIndices, sourceTvertIndices);
      const vertexShading = buildAuroraVertexShadingMetadata(mesh);
      const materialMetadata = buildAuroraMdlMaterialMetadata(mesh);
      primitives.push({
        meshName: mesh.name,
        nodeType: mesh.nodeType,
        ...(mesh.parentName ? { parentName: mesh.parentName } : {}),
        textureReference: resolvePrimaryTextureReference(mesh),
        textureSlots: resolveTextureSlotReferences(mesh),
        material: materialMetadata,
        ...(skinWeights ? { skinWeights } : {}),
        ...(danglymesh ? { danglymesh } : {}),
        ...(animmesh ? { animmesh } : {}),
        ...(vertexShading ? { vertexShading } : {}),
        firstIndex,
        indexCount,
        firstVertex,
        vertexCount,
        localIndices,
        sourceVertexIndices,
        sourceTvertIndices
      });
    }
  });

  const generatedNormals = computeVertexNormals(positions, indices);
  return {
    positions,
    normals: generatedNormals.map((normal, index) => sourceNormals[index] ?? normal),
    tangents,
    texcoords,
    indices,
    primitives,
    hasTexcoords,
    hasTangents: primitives.some(
      (primitive) => primitive.vertexShading?.usesSourceTangents === true
    )
  };
}

function buildSmoothingGroupNormalLookup(mesh: ParsedTrimesh): MeshSmoothingNormalLookup | null {
  if (!mesh.faces.some((face) => face.smoothingGroup !== undefined)) {
    return null;
  }

  const faceNormals = mesh.faces.map((face) => computeGltfFaceNormal(mesh, face));
  const faceIndicesByVertex = new Map<number, number[]>();
  mesh.faces.forEach((face, faceIndex) => {
    face.vertexIndices.forEach((vertexIndex) => {
      if (!isValidIndex(vertexIndex, mesh.vertices.length)) {
        return;
      }
      const existing = faceIndicesByVertex.get(vertexIndex) ?? [];
      existing.push(faceIndex);
      faceIndicesByVertex.set(vertexIndex, existing);
    });
  });

  const normalByFaceVertex = new Map<string, Vec3>();
  const keyByFaceVertex = new Map<string, string>();

  faceIndicesByVertex.forEach((faceIndices, vertexIndex) => {
    const parent = faceIndices.map((_, index) => index);
    const find = (index: number): number => {
      let current = index;
      while (parent[current] !== current) {
        parent[current] = parent[parent[current]!];
        current = parent[current]!;
      }
      return current;
    };
    const union = (left: number, right: number): void => {
      const leftRoot = find(left);
      const rightRoot = find(right);
      if (leftRoot !== rightRoot) {
        parent[leftRoot] = rightRoot;
      }
    };

    for (let left = 0; left < faceIndices.length; left += 1) {
      const leftGroup = mesh.faces[faceIndices[left]!]!.smoothingGroup ?? 0;
      if (leftGroup === 0) {
        continue;
      }
      for (let right = left + 1; right < faceIndices.length; right += 1) {
        const rightGroup = mesh.faces[faceIndices[right]!]!.smoothingGroup ?? 0;
        if (rightGroup !== 0 && (leftGroup & rightGroup) !== 0) {
          union(left, right);
        }
      }
    }

    const clusterNormals = new Map<string, Vec3>();
    faceIndices.forEach((faceIndex, localIndex) => {
      const smoothingGroup = mesh.faces[faceIndex]!.smoothingGroup ?? 0;
      const clusterKey = smoothingGroup === 0 ? `face:${faceIndex}` : `cluster:${find(localIndex)}`;
      const accumulated = clusterNormals.get(clusterKey) ?? ([0, 0, 0] as Vec3);
      addInto(accumulated, faceNormals[faceIndex]!);
      clusterNormals.set(clusterKey, accumulated);
    });

    clusterNormals.forEach((normal, clusterKey) => {
      clusterNormals.set(clusterKey, normalizeVec3(normal) ?? [0, 1, 0]);
    });

    faceIndices.forEach((faceIndex, localIndex) => {
      const smoothingGroup = mesh.faces[faceIndex]!.smoothingGroup ?? 0;
      const clusterKey = smoothingGroup === 0 ? `face:${faceIndex}` : `cluster:${find(localIndex)}`;
      const lookupKey = `${faceIndex}:${vertexIndex}`;
      normalByFaceVertex.set(lookupKey, clusterNormals.get(clusterKey) ?? [0, 1, 0]);
      keyByFaceVertex.set(lookupKey, `v${vertexIndex}:${clusterKey}`);
    });
  });

  const normalsByFaceCorner: Array<[Vec3, Vec3, Vec3] | undefined> = [];
  const keysByFaceCorner: Array<[string, string, string] | undefined> = [];
  mesh.faces.forEach((face, faceIndex) => {
    normalsByFaceCorner[faceIndex] = face.vertexIndices.map(
      (vertexIndex) => normalByFaceVertex.get(`${faceIndex}:${vertexIndex}`) ?? [0, 1, 0]
    ) as [Vec3, Vec3, Vec3];
    keysByFaceCorner[faceIndex] = face.vertexIndices.map(
      (vertexIndex) => keyByFaceVertex.get(`${faceIndex}:${vertexIndex}`) ?? `v${vertexIndex}:face:${faceIndex}`
    ) as [string, string, string];
  });

  return {
    normalsByFaceCorner,
    keysByFaceCorner
  };
}

function computeGltfFaceNormal(mesh: ParsedTrimesh, face: ParsedFace): Vec3 {
  const orderedCorners = [0, 2, 1] as const;
  const positions = orderedCorners.map((corner) => {
    const vertexIndex = face.vertexIndices[corner];
    return isValidIndex(vertexIndex, mesh.vertices.length)
      ? convertAuroraPositionToGltf(addVec3(mesh.vertices[vertexIndex]!, mesh.offset))
      : ([0, 0, 0] as Vec3);
  }) as [Vec3, Vec3, Vec3];
  return triangleNormal(positions[0], positions[1], positions[2]);
}

function computeVertexNormals(positions: Vec3[], indices: number[]): Vec3[] {
  const normals = positions.map(() => [0, 0, 0] as Vec3);

  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index];
    const b = indices[index + 1];
    const c = indices[index + 2];
    const normal = triangleNormal(positions[a], positions[b], positions[c]);
    addInto(normals[a], normal);
    addInto(normals[b], normal);
    addInto(normals[c], normal);
  }

  return normals.map((normal) => {
    const normalized = normalizeVec3(normal);
    return normalized ?? [0, 1, 0];
  });
}

function triangleNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  return normalizeVec3(cross(subVec3(b, a), subVec3(c, a))) ?? [0, 1, 0];
}

function buildGlb(model: ParsedModel, geometry: GeometryBuffers): Buffer {
  const binaryParts: Buffer[] = [];
  const bufferViews: BufferViewDescriptor[] = [];
  let byteOffset = 0;
  const textureReferences = collectTextureReferences(model);

  const addBufferView = (bytes: Buffer, target: number) => {
    byteOffset = alignOffset(byteOffset);
    binaryParts.push(Buffer.alloc(byteOffset - totalByteLength(binaryParts)));
    const view: BufferViewDescriptor = {
      buffer: 0,
      byteOffset,
      byteLength: bytes.length,
      target
    };
    bufferViews.push(view);
    binaryParts.push(bytes);
    byteOffset += bytes.length;
    return bufferViews.length - 1;
  };

  const positionBufferView = geometry.positions.length > 0
    ? addBufferView(writeVec3Buffer(geometry.positions), ARRAY_BUFFER_TARGET)
    : null;
  const normalBufferView = geometry.normals.length > 0
    ? addBufferView(writeVec3Buffer(geometry.normals), ARRAY_BUFFER_TARGET)
    : null;
  const tangentBufferView = geometry.hasTangents
    ? addBufferView(writeVec4Buffer(geometry.tangents), ARRAY_BUFFER_TARGET)
    : null;
  const texcoordBufferView = geometry.hasTexcoords
    ? addBufferView(writeVec2Buffer(geometry.texcoords), ARRAY_BUFFER_TARGET)
    : null;

  const accessors: Array<Record<string, unknown>> = [];

  const materialIndexByTextureSignature = new Map<string, number>();
  const materials: Array<Record<string, unknown>> = [];
  const meshes: Array<Record<string, unknown>> = [];
  const nodes: Array<Record<string, unknown>> = [];
  geometry.primitives.forEach((primitive) => {
    if (positionBufferView === null || normalBufferView === null) {
      return;
    }
    const positionAccessor = accessors.length;
    const positionBounds = computePositionBounds(
      geometry.positions.slice(primitive.firstVertex, primitive.firstVertex + primitive.vertexCount)
    );
    accessors.push({
      bufferView: positionBufferView,
      ...(primitive.firstVertex > 0 ? { byteOffset: primitive.firstVertex * 12 } : {}),
      componentType: FLOAT_COMPONENT_TYPE,
      count: primitive.vertexCount,
      type: "VEC3",
      min: positionBounds.min,
      max: positionBounds.max
    });

    const normalAccessor = accessors.length;
    accessors.push({
      bufferView: normalBufferView,
      ...(primitive.firstVertex > 0 ? { byteOffset: primitive.firstVertex * 12 } : {}),
      componentType: FLOAT_COMPONENT_TYPE,
      count: primitive.vertexCount,
      type: "VEC3"
    });

    const attributes: Record<string, number> = {
      POSITION: positionAccessor,
      NORMAL: normalAccessor
    };

    if (texcoordBufferView !== null) {
      attributes.TEXCOORD_0 = accessors.length;
      accessors.push({
        bufferView: texcoordBufferView,
        ...(primitive.firstVertex > 0 ? { byteOffset: primitive.firstVertex * 8 } : {}),
        componentType: FLOAT_COMPONENT_TYPE,
        count: primitive.vertexCount,
        type: "VEC2"
      });
    }

    if (
      tangentBufferView !== null &&
      primitive.vertexShading?.usesSourceTangents === true
    ) {
      attributes.TANGENT = accessors.length;
      accessors.push({
        bufferView: tangentBufferView,
        ...(primitive.firstVertex > 0 ? { byteOffset: primitive.firstVertex * 16 } : {}),
        componentType: FLOAT_COMPONENT_TYPE,
        count: primitive.vertexCount,
        type: "VEC4"
      });
    }

    const indexComponentType =
      primitive.vertexCount <= 65_535
        ? UNSIGNED_SHORT_COMPONENT_TYPE
        : UNSIGNED_INT_COMPONENT_TYPE;
    const indexBufferView = addBufferView(
      writeIndexBuffer(primitive.localIndices, indexComponentType),
      ELEMENT_ARRAY_BUFFER_TARGET
    );
    const indexAccessor = accessors.length;
    accessors.push({
      bufferView: indexBufferView,
      componentType: indexComponentType,
      count: primitive.indexCount,
      type: "SCALAR"
    });

    const material = resolveMaterialForPrimitive(
      model,
      primitive,
      textureReferences,
      materialIndexByTextureSignature,
      materials
    );
    const sourceMetadata = {
      sourceMesh: primitive.meshName,
      sourceNodeType: primitive.nodeType,
      ...(primitive.parentName ? { sourceParentNode: primitive.parentName } : {}),
      ...(primitive.material.sourceKeys.length > 0 ? { material: primitive.material } : {}),
      ...(primitive.skinWeights ? { skinWeights: primitive.skinWeights } : {}),
      ...(primitive.danglymesh ? { danglymesh: primitive.danglymesh } : {}),
      ...(primitive.animmesh ? { animmesh: primitive.animmesh } : {}),
      ...(primitive.vertexShading ? { vertexShading: primitive.vertexShading } : {})
    };
    const gltfPrimitive = {
      attributes,
      indices: indexAccessor,
      material,
      mode: 4,
      extras: {
        aurora: {
          ...sourceMetadata,
          ...(primitive.textureReference
            ? { textureReference: primitive.textureReference }
            : {}),
          ...(primitive.textureSlots.length > 0 ? { textureSlots: primitive.textureSlots } : {})
        }
      }
    };
    const meshIndex = meshes.length;
    meshes.push({
      name: primitive.meshName,
      primitives: [gltfPrimitive],
      extras: {
        aurora: sourceMetadata
      }
    });
    nodes.push({
      name: primitive.meshName,
      mesh: meshIndex,
      extras: {
        aurora: sourceMetadata
      }
    });
  });

  const binary = padBuffer(Buffer.concat(binaryParts), 0);
  const auroraModelExtras = {
    sourceModel: model.modelName,
    converterVersion: AURORA_MDL_TO_GLB_CONVERTER_VERSION,
    ...(model.supermodel ? { supermodel: model.supermodel } : {}),
    ...(typeof model.animationScale === "number"
      ? { animationScale: model.animationScale }
      : {}),
    ...(model.sourceAnimations.length > 0
      ? {
          sourceAnimationNames: model.sourceAnimations.map((animation) => animation.name),
          sourceAnimations: model.sourceAnimations
        }
      : {}),
    ...(model.sourceHierarchy.length > 0
      ? {
          sourceHierarchyNodeCount: model.sourceHierarchy.length,
          sourceHierarchyRootNodeNames: resolveSourceHierarchyRootNodeNames(model),
          sourceHierarchyNodeTypes: resolveSourceHierarchyNodeTypes(model),
          sourceHierarchy: model.sourceHierarchy
        }
      : {}),
    ...(textureReferences.length > 0 ? { textureReferences } : {})
  };
  const gltf = {
    asset: {
      version: "2.0",
      generator: `aurora-web aurora-mdl-to-glb ${AURORA_MDL_TO_GLB_CONVERTER_VERSION}`
    },
    scene: 0,
    scenes: [
      {
        nodes: nodes.map((_, index) => index),
        extras: {
          aurora: auroraModelExtras
        }
      }
    ],
    nodes,
    meshes,
    materials,
    buffers: [{ byteLength: binary.length }],
    bufferViews,
    accessors,
    extensionsUsed: ["KHR_materials_unlit"],
    extras: {
      aurora: auroraModelExtras
    }
  };

  return writeGlb(gltf, binary);
}

function resolvePrimaryTextureReference(mesh: ParsedTrimesh): string | undefined {
  return mesh.textureSlotTokens[0] ?? mesh.texture0Token ?? mesh.bitmapToken;
}

function resolveMaterialForPrimitive(
  model: ParsedModel,
  primitive: GeometryPrimitive,
  textureReferences: string[],
  materialIndexByTextureSignature: Map<string, number>,
  materials: Array<Record<string, unknown>>
): number {
  const key = JSON.stringify({
    textureReference: primitive.textureReference ?? "",
    textureSlots: primitive.textureSlots,
    material: primitive.material
  });
  const existingIndex = materialIndexByTextureSignature.get(key);
  if (typeof existingIndex === "number") {
    return existingIndex;
  }

  const nextIndex = materials.length;
  materialIndexByTextureSignature.set(key, nextIndex);
  materials.push(
    buildAuroraMaterial(
      model,
      primitive.textureReference,
      textureReferences,
      primitive.textureSlots,
      primitive.material
    )
  );
  return nextIndex;
}

function buildAuroraMaterial(
  model: ParsedModel,
  textureReference: string | undefined,
  textureReferences: string[],
  textureSlots: AuroraTextureSlotReference[],
  material: AuroraMdlMaterialMetadata
): Record<string, unknown> {
  const diffuse = material.diffuse.map(clamp01) as Vec3;
  const alpha = clamp01(material.alpha);
  const specMax = Math.max(...material.specular.map(clamp01));
  const roughnessFactor = Math.max(0.4, 1 - Math.min(material.shininess / 128, 0.4));
  const metallicFactor = Math.min(specMax * 0.5, 0.3);
  const hasAuthoredMaterial = material.sourceKeys.length > 0;
  const alphaMode =
    alpha < 0.99 ? "BLEND" : material.transparencyHint > 0 ? "MASK" : undefined;
  return {
    name: textureReference
      ? `Aurora material ${textureReference}`
      : "Aurora default material",
    doubleSided: true,
    pbrMetallicRoughness: {
      baseColorFactor: [diffuse[0], diffuse[1], diffuse[2], alpha],
      metallicFactor,
      roughnessFactor
    },
    ...(material.selfIllumColor ? { emissiveFactor: material.selfIllumColor.map(clamp01) } : {}),
    ...(alphaMode ? { alphaMode } : {}),
    ...(alphaMode === "MASK" ? { alphaCutoff: 0.1 } : {}),
    ...(hasAuthoredMaterial ? {} : { extensions: { KHR_materials_unlit: {} } }),
    extras: {
      aurora: {
        sourceModel: model.modelName,
        textureReferences,
        ...(textureReference ? { textureReference } : {}),
        ...(textureSlots.length > 0 ? { textureSlots } : {}),
        material
      }
    }
  };
}

function writeGlb(gltf: unknown, binary: Buffer): Buffer {
  const json = padBuffer(Buffer.from(JSON.stringify(gltf), "utf-8"), 0x20);
  const totalLength = 12 + 8 + json.length + 8 + binary.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(GLB_VERSION, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(json.length, 0);
  jsonHeader.writeUInt32LE(JSON_CHUNK_TYPE, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length, 0);
  binHeader.writeUInt32LE(BIN_CHUNK_TYPE, 4);

  return Buffer.concat([header, jsonHeader, json, binHeader, binary], totalLength);
}

function writeVec3Buffer(values: Vec3[]): Buffer {
  const buffer = Buffer.alloc(values.length * 12);
  values.forEach((value, index) => {
    const offset = index * 12;
    buffer.writeFloatLE(value[0], offset);
    buffer.writeFloatLE(value[1], offset + 4);
    buffer.writeFloatLE(value[2], offset + 8);
  });
  return buffer;
}

function writeVec2Buffer(values: Vec2[]): Buffer {
  const buffer = Buffer.alloc(values.length * 8);
  values.forEach((value, index) => {
    const offset = index * 8;
    buffer.writeFloatLE(value[0], offset);
    buffer.writeFloatLE(value[1], offset + 4);
  });
  return buffer;
}

function writeVec4Buffer(values: Vec4[]): Buffer {
  const buffer = Buffer.alloc(values.length * 16);
  values.forEach((value, index) => {
    const offset = index * 16;
    buffer.writeFloatLE(value[0], offset);
    buffer.writeFloatLE(value[1], offset + 4);
    buffer.writeFloatLE(value[2], offset + 8);
    buffer.writeFloatLE(value[3], offset + 12);
  });
  return buffer;
}

function writeIndexBuffer(indices: number[], componentType: number): Buffer {
  if (componentType === UNSIGNED_SHORT_COMPONENT_TYPE) {
    const buffer = Buffer.alloc(indices.length * 2);
    indices.forEach((value, index) => buffer.writeUInt16LE(value, index * 2));
    return buffer;
  }

  const buffer = Buffer.alloc(indices.length * 4);
  indices.forEach((value, index) => buffer.writeUInt32LE(value, index * 4));
  return buffer;
}

function computePositionBounds(positions: Vec3[]): { min: Vec3; max: Vec3 } {
  const min = [...positions[0]] as Vec3;
  const max = [...positions[0]] as Vec3;
  for (const position of positions.slice(1)) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], position[axis]);
      max[axis] = Math.max(max[axis], position[axis]);
    }
  }
  return { min, max };
}

function tokenizeLine(line: string | undefined): string[] {
  if (!line) {
    return [];
  }
  const withoutComment = line.replace(/#.*$/u, "").trim();
  return withoutComment.length > 0 ? withoutComment.split(/\s+/u) : [];
}

function sanitizeName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/gu, "_").slice(0, 80) || "aurora-model";
}

function parseCount(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ASCII MDL table count: ${value}`);
  }
  return parsed;
}

function parseIndex(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ASCII MDL index: ${value ?? ""}`);
  }
  return parsed;
}

function parseFaceVertexIndex(value: string | undefined): number {
  const parsed = parseIntegerToken(value, "face vertex index");
  return parsed >= 0 ? parsed : -1;
}

function parseFaceTvertIndex(value: string | undefined): number {
  const parsed = parseIntegerToken(value, "face texture vertex index");
  return parsed >= 0 ? parsed : -1;
}

function parseFaceSmoothingGroup(value: string | undefined): number {
  const parsed = parseIntegerToken(value, "face smoothing group");
  return parsed >= 0 ? parsed : 0;
}

function parseIntegerToken(value: string | undefined, label: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ASCII MDL ${label}: ${value ?? ""}`);
  }
  return parsed;
}

function parseNumber(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ASCII MDL number: ${value ?? ""}`);
  }
  return parsed;
}

function convertAuroraAxisAngleToQuaternion(axisAngle: Quaternion): Quaternion {
  const [axisX, axisY, axisZ, angleRadians] = axisAngle;
  const axisLength = Math.hypot(axisX, axisY, axisZ);
  if (axisLength <= 1e-8 || Math.abs(angleRadians) <= 1e-8) {
    return [0, 0, 0, 1];
  }

  const halfAngle = angleRadians * 0.5;
  const scale = Math.sin(halfAngle) / axisLength;
  return [
    axisX * scale,
    axisY * scale,
    axisZ * scale,
    Math.cos(halfAngle)
  ];
}

function isValidIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

function convertAuroraPositionToGltf(position: Vec3): Vec3 {
  return [position[0], position[2], position[1]];
}

function convertAuroraTangentToGltf(source: AuroraMdlTangent | undefined): Vec4 {
  if (!source) {
    return [1, 0, 0, 1];
  }
  const tangent = normalizeVec3(convertAuroraPositionToGltf(source.tangent));
  if (!source.binormal || !source.normal) {
    if (!tangent) {
      return [1, 0, 0, 1];
    }
    const sourceHandedness = source.handedness ?? 1;
    return [tangent[0], tangent[1], tangent[2], -sourceHandedness];
  }
  const binormal = normalizeVec3(convertAuroraPositionToGltf(source.binormal));
  const normal = normalizeVec3(convertAuroraPositionToGltf(source.normal));
  if (!tangent || !binormal || !normal) {
    return [1, 0, 0, 1];
  }
  const crossNormalTangent = cross(normal, tangent);
  const handedness = dot(crossNormalTangent, binormal) >= 0 ? 1 : -1;
  return [tangent[0], tangent[1], tangent[2], handedness];
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subVec3(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function addInto(target: Vec3, value: Vec3): void {
  target[0] += value[0];
  target[1] += value[1];
  target[2] += value[2];
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

function dot(left: Vec3, right: Vec3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeVec3(value: Vec3): Vec3 | null {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (length <= 1e-8) {
    return null;
  }
  return [value[0] / length, value[1] / length, value[2] / length];
}

function totalByteLength(buffers: Buffer[]): number {
  return buffers.reduce((sum, buffer) => sum + buffer.length, 0);
}

function alignOffset(value: number): number {
  return value + ((4 - (value % 4)) % 4);
}

function padBuffer(buffer: Buffer, fill: number): Buffer {
  const padding = (4 - (buffer.length % 4)) % 4;
  if (padding === 0) {
    return buffer;
  }
  return Buffer.concat([buffer, Buffer.alloc(padding, fill)]);
}

function readBinaryArrayHeader(bytes: Buffer, offset: number): BinaryArrayHeader {
  return {
    offset: readUInt32(bytes, offset),
    count: readUInt32(bytes, offset + 4),
    allocated: readUInt32(bytes, offset + 8)
  };
}

function readOptionalBinaryArrayHeader(
  bytes: Buffer,
  offset: number
): BinaryArrayHeader | null {
  if (offset < 0 || offset + 12 > bytes.length) {
    return null;
  }
  const header = readBinaryArrayHeader(bytes, offset);
  if (
    header.offset === INVALID_BINARY_OFFSET ||
    header.count === 0 ||
    header.count > 4096
  ) {
    return null;
  }
  return header;
}

function resolveBinaryRawArrayStart(
  bytes: Buffer,
  rawBase: number,
  header: BinaryArrayHeader | null,
  elementByteLength: number
): number | null {
  if (!header || elementByteLength <= 0) {
    return null;
  }
  const start = rawBase + header.offset;
  const byteLength = header.count * elementByteLength;
  if (
    start < rawBase ||
    byteLength < 0 ||
    start + byteLength > bytes.length
  ) {
    return null;
  }
  return start;
}

function readBinaryVec3(bytes: Buffer, offset: number): Vec3 | undefined {
  if (offset < 0 || offset + 12 > bytes.length) {
    return undefined;
  }
  const value: Vec3 = [
    bytes.readFloatLE(offset),
    bytes.readFloatLE(offset + 4),
    bytes.readFloatLE(offset + 8)
  ];
  return value.every(Number.isFinite) ? value : undefined;
}

function readBinaryQuaternion(bytes: Buffer, offset: number): Quaternion | undefined {
  if (offset < 0 || offset + 16 > bytes.length) {
    return undefined;
  }
  const value: Quaternion = [
    bytes.readFloatLE(offset),
    bytes.readFloatLE(offset + 4),
    bytes.readFloatLE(offset + 8),
    bytes.readFloatLE(offset + 12)
  ];
  return value.every(Number.isFinite) ? value : undefined;
}

function readBinarySkinInverseBindQuaternion(
  bytes: Buffer,
  offset: number
): Quaternion | undefined {
  if (offset < 0 || offset + 16 > bytes.length) {
    return undefined;
  }
  const w = bytes.readFloatLE(offset);
  const x = bytes.readFloatLE(offset + 4);
  const y = bytes.readFloatLE(offset + 8);
  const z = bytes.readFloatLE(offset + 12);
  const value: Quaternion = [x, y, z, w];
  return value.every(Number.isFinite) ? value : undefined;
}

function readUInt32(bytes: Buffer, offset: number): number {
  if (offset < 0 || offset + 4 > bytes.length) {
    throw new Error("Binary Aurora MDL offset is out of range.");
  }
  return bytes.readUInt32LE(offset);
}

function readCString(bytes: Buffer, offset: number, length: number): string {
  if (offset < 0 || offset >= bytes.length || length <= 0) {
    return "";
  }
  const end = Math.min(bytes.length, offset + length);
  let terminator = offset;
  while (terminator < end && bytes[terminator] !== 0) {
    terminator += 1;
  }
  return bytes.subarray(offset, terminator).toString("ascii").trim();
}

function resolveBinaryWorldMatrix(
  nodeOffset: number,
  nodes: Map<number, BinaryNode>,
  depth = 0
): Mat4 {
  const node = nodes.get(nodeOffset);
  if (!node || depth > 64) {
    return identityMat4();
  }

  const local = buildBinaryLocalMatrix(node.transform);
  if (typeof node.parentOffset !== "number") {
    return local;
  }

  return multiplyMat4(resolveBinaryWorldMatrix(node.parentOffset, nodes, depth + 1), local);
}

function buildBinaryLocalMatrix(transform: BinaryTransform): Mat4 {
  const matrix = identityMat4();
  const rotation = transform.orientation
    ? quaternionToMat3(transform.orientation)
    : ([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ] as const);
  const scale = Number.isFinite(transform.scale) ? transform.scale : 1;

  matrix[0] = rotation[0][0] * scale;
  matrix[1] = rotation[0][1] * scale;
  matrix[2] = rotation[0][2] * scale;
  matrix[4] = rotation[1][0] * scale;
  matrix[5] = rotation[1][1] * scale;
  matrix[6] = rotation[1][2] * scale;
  matrix[8] = rotation[2][0] * scale;
  matrix[9] = rotation[2][1] * scale;
  matrix[10] = rotation[2][2] * scale;
  matrix[3] = transform.position[0];
  matrix[7] = transform.position[1];
  matrix[11] = transform.position[2];

  return matrix;
}

function quaternionToMat3(quaternion: Quaternion): readonly [Vec3, Vec3, Vec3] {
  const [x, y, z, w] = quaternion;
  const lengthSquared = x * x + y * y + z * z + w * w;
  if (lengthSquared < 1e-12) {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }

  const scale = 2 / lengthSquared;
  const xx = x * x * scale;
  const yy = y * y * scale;
  const zz = z * z * scale;
  const xy = x * y * scale;
  const xz = x * z * scale;
  const yz = y * z * scale;
  const wx = w * x * scale;
  const wy = w * y * scale;
  const wz = w * z * scale;

  return [
    [1 - (yy + zz), xy - wz, xz + wy],
    [xy + wz, 1 - (xx + zz), yz - wx],
    [xz - wy, yz + wx, 1 - (xx + yy)]
  ];
}

function identityMat4(): Mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

function multiplyMat4(left: Mat4, right: Mat4): Mat4 {
  const result = identityMat4();
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      result[row * 4 + column] =
        left[row * 4] * right[column] +
        left[row * 4 + 1] * right[4 + column] +
        left[row * 4 + 2] * right[8 + column] +
        left[row * 4 + 3] * right[12 + column];
    }
  }
  return result;
}

function transformPoint(matrix: Mat4, point: Vec3): Vec3 {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[3],
    matrix[4] * x + matrix[5] * y + matrix[6] * z + matrix[7],
    matrix[8] * x + matrix[9] * y + matrix[10] * z + matrix[11]
  ];
}
