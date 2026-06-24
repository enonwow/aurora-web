import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

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
const BINARY_NODE_NAME_OFFSET = 32;
const BINARY_NODE_CHILDREN_OFFSET = 72;
const BINARY_NODE_CONTROLLER_KEYS_OFFSET = 84;
const BINARY_NODE_CONTROLLER_DATA_OFFSET = 96;
const BINARY_NODE_FLAGS_OFFSET = 108;
const BINARY_NODE_FLAG_EMITTER = 0x0004;
const BINARY_NODE_FLAG_MESH = 0x0020;
const BINARY_MESH_FACES_OFFSET = 120;
const BINARY_MESH_RENDER_OFFSET = 220;
const BINARY_MESH_TEXTURES_OFFSET = 232;
const BINARY_EMITTER_TEXTURE_OFFSET = 232;
const BINARY_MESH_VERTS_OFFSET = 556;
const BINARY_MESH_VERTEX_COUNT_OFFSET = 560;
const BINARY_MESH_TVERTS_OFFSET = 564;
const BINARY_FACE_SIZE = 32;
const BINARY_FACE_VERTEX_INDICES_OFFSET = 26;
const BINARY_CONTROLLER_POSITION = 8;
const BINARY_CONTROLLER_ORIENTATION = 20;
const BINARY_CONTROLLER_SCALE = 36;
const INVALID_BINARY_OFFSET = 0xffffffff;
const RENDERABLE_ASCII_NODE_TYPES = new Set(["trimesh", "animmesh", "danglymesh", "skin"]);

interface ParsedModel {
  modelName: string;
  meshes: ParsedTrimesh[];
  emitterTextureReferences: string[];
}

interface ParsedTrimesh {
  name: string;
  parentName?: string;
  offset: Vec3;
  transform: BinaryTransform;
  bitmapToken?: string;
  texture0Token?: string;
  vertices: Vec3[];
  tverts: Vec2[];
  faces: ParsedFace[];
}

interface ParsedFace {
  vertexIndices: [number, number, number];
  tvertIndices?: [number, number, number];
}

interface GeometryBuffers {
  positions: Vec3[];
  normals: Vec3[];
  texcoords: Vec2[];
  indices: number[];
  primitives: GeometryPrimitive[];
  hasTexcoords: boolean;
}

interface GeometryPrimitive {
  meshName: string;
  textureReference?: string;
  firstIndex: number;
  indexCount: number;
}

interface BufferViewDescriptor {
  buffer: number;
  byteOffset: number;
  byteLength: number;
  target: number;
}

type Vec2 = [number, number];
type Vec3 = [number, number, number];
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
  parentOffset?: number;
  flags: number;
  transform: BinaryTransform;
}

export interface AuroraMdlToGlbResult {
  modelName: string;
  meshCount: number;
  textureReferences: string[];
  vertexCount: number;
  triangleCount: number;
  bytes: Buffer;
  warnings: string[];
}

export function convertAuroraAsciiMdlToGlb(
  input: Buffer | string
): AuroraMdlToGlbResult {
  const model = parseAuroraMdl(input);
  const geometry = buildGeometry(model);
  const bytes = buildGlb(model, geometry);

  return {
    modelName: model.modelName,
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
  const meshes: ParsedTrimesh[] = [];
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
    if (parsed.nodeType === "emitter") {
      const emitterTexture = parsed.mesh.texture0Token ?? parsed.mesh.bitmapToken;
      if (emitterTexture) {
        emitterTextureReferences.add(emitterTexture);
      }
    }
    asciiNodes.set(toAsciiNodeKey(parsed.mesh.name), {
      parentName: parsed.mesh.parentName ? toAsciiNodeKey(parsed.mesh.parentName) : undefined,
      transform: parsed.mesh.transform
    });
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
  } else if (!hasRenderableMeshes) {
    throw new Error("ASCII MDL contains no renderable mesh geometry.");
  }

  return {
    modelName,
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

  const source = Buffer.isBuffer(input) ? input.toString("utf-8") : input;
  return parseAuroraAsciiMdl(source);
}

function isBinaryAuroraMdl(bytes: Buffer): boolean {
  return bytes.length >= BINARY_MODEL_BASE && bytes.readUInt32LE(0) === 0;
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
  const rootNodeOffset = readUInt32(bytes, BINARY_MODEL_BASE + 72);
  const nodes = new Map<number, BinaryNode>();
  const emitterTextureReferences = new Set<string>();
  walkBinaryNodes(bytes, rootNodeOffset, undefined, nodes);

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
  } else if (meshes.length === 0) {
    throw new Error("Binary Aurora MDL contains no renderable mesh geometry.");
  }

  return {
    modelName,
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

  const textureTokens = readBinaryMeshTextureTokens(bytes, absOffset);
  return {
    name: node.name,
    offset: [0, 0, 0],
    transform: {
      position: [0, 0, 0],
      scale: 1
    },
    bitmapToken: textureTokens[0],
    texture0Token: textureTokens[0],
    vertices,
    tverts,
    faces: parsedFaces
  };
}

function readBinaryMeshTextureTokens(bytes: Buffer, absOffset: number): string[] {
  const tokens: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    const raw = readCString(bytes, absOffset + BINARY_MESH_TEXTURES_OFFSET + index * 64, 64);
    const normalized = normalizeTextureToken(raw);
    if (normalized) {
      tokens.push(normalized);
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

function parseTrimesh(
  lines: string[],
  startIndex: number
): { mesh: ParsedTrimesh; nodeType: string; nextIndex: number } {
  const startTokens = tokenizeLine(lines[startIndex]);
  const nodeType = startTokens[1]?.toLowerCase() ?? "";
  const mesh: ParsedTrimesh = {
    name: sanitizeName(startTokens[2] ?? "trimesh"),
    offset: [0, 0, 0],
    transform: {
      position: [0, 0, 0],
      scale: 1
    },
    vertices: [],
    tverts: [],
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
      mesh.transform.orientation = [
        parseNumber(tokens[1]),
        parseNumber(tokens[2]),
        parseNumber(tokens[3]),
        parseNumber(tokens[4])
      ];
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

    if ((keyword === "texture0" || keyword === "texture") && tokens[1]) {
      mesh.texture0Token = normalizeTextureToken(tokens[1]);
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

    if (keyword === "faces" && tokens[1]) {
      const parsed = readNumericRows(lines, index + 1, parseCount(tokens[1]), 3);
      mesh.faces = parsed.rows.map(parseFaceRow);
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

function parseFaceRow(row: string[]): ParsedFace {
  const vertexIndices = [
    parseIndex(row[0]),
    parseIndex(row[1]),
    parseIndex(row[2])
  ] as [number, number, number];

  const tvertIndices = row.length >= 7
    ? ([
        parseIndex(row[4]),
        parseIndex(row[5]),
        parseIndex(row[6])
      ] as [number, number, number])
    : undefined;

  return {
    vertexIndices,
    tvertIndices
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
    if (mesh.texture0Token) {
      references.add(mesh.texture0Token);
    }
  });
  model.emitterTextureReferences.forEach((reference) => {
    references.add(reference);
  });
  return [...references].sort((left, right) => left.localeCompare(right));
}

function createEmitterProxyMesh(textureReference?: string): ParsedTrimesh {
  return {
    name: "emitter_proxy",
    offset: [0, 0, 0],
    transform: {
      position: [0, 0, 0],
      scale: 1
    },
    bitmapToken: textureReference,
    texture0Token: textureReference,
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
  const textureReferences = collectTextureReferences(model);
  if (textureReferences.length === 0) {
    return [];
  }
  return [
    "Aurora MDL texture references were captured in GLB extras; image conversion is resolved through render package texture assets."
  ];
}

function buildGeometry(model: ParsedModel): GeometryBuffers {
  const positions: Vec3[] = [];
  const texcoords: Vec2[] = [];
  const indices: number[] = [];
  const primitives: GeometryPrimitive[] = [];
  const vertexByKey = new Map<string, number>();
  const hasTexcoords = model.meshes.some(
    (mesh) => mesh.tverts.length > 0 && mesh.faces.some((face) => Boolean(face.tvertIndices))
  );

  model.meshes.forEach((mesh, meshIndex) => {
    const firstIndex = indices.length;
    for (const face of mesh.faces) {
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

        const key = `${meshIndex}:${vertexIndex}:${hasValidTvertIndex ? tvertIndex : -1}`;
        const existing = vertexByKey.get(key);
        if (typeof existing === "number") {
          indices.push(existing);
          continue;
        }

        const rawPosition = addVec3(mesh.vertices[vertexIndex], mesh.offset);
        const position = convertAuroraPositionToGltf(rawPosition);
        const nextIndex = positions.length;
        vertexByKey.set(key, nextIndex);
        positions.push(position);
        if (hasTexcoords) {
          texcoords.push(hasValidTvertIndex ? mesh.tverts[tvertIndex] : [0, 0]);
        }
        indices.push(nextIndex);
      }
    }
    const indexCount = indices.length - firstIndex;
    if (indexCount > 0) {
      primitives.push({
        meshName: mesh.name,
        textureReference: resolvePrimaryTextureReference(mesh),
        firstIndex,
        indexCount
      });
    }
  });

  if (positions.length === 0 || indices.length === 0) {
    throw new Error("ASCII MDL conversion produced empty geometry.");
  }

  return {
    positions,
    normals: computeVertexNormals(positions, indices),
    texcoords,
    indices,
    primitives,
    hasTexcoords
  };
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

  const positionBufferView = addBufferView(writeVec3Buffer(geometry.positions), ARRAY_BUFFER_TARGET);
  const normalBufferView = addBufferView(writeVec3Buffer(geometry.normals), ARRAY_BUFFER_TARGET);
  const texcoordBufferView = geometry.hasTexcoords
    ? addBufferView(writeVec2Buffer(geometry.texcoords), ARRAY_BUFFER_TARGET)
    : null;
  const indexComponentType =
    geometry.positions.length <= 65_535 ? UNSIGNED_SHORT_COMPONENT_TYPE : UNSIGNED_INT_COMPONENT_TYPE;
  const indexComponentByteSize = indexComponentType === UNSIGNED_SHORT_COMPONENT_TYPE ? 2 : 4;
  const indexBufferView = addBufferView(
    writeIndexBuffer(geometry.indices, indexComponentType),
    ELEMENT_ARRAY_BUFFER_TARGET
  );

  const binary = padBuffer(Buffer.concat(binaryParts), 0);
  const positionBounds = computePositionBounds(geometry.positions);
  const accessors = [
    {
      bufferView: positionBufferView,
      componentType: FLOAT_COMPONENT_TYPE,
      count: geometry.positions.length,
      type: "VEC3",
      min: positionBounds.min,
      max: positionBounds.max
    },
    {
      bufferView: normalBufferView,
      componentType: FLOAT_COMPONENT_TYPE,
      count: geometry.normals.length,
      type: "VEC3"
    }
  ];
  const attributes: Record<string, number> = {
    POSITION: 0,
    NORMAL: 1
  };

  if (texcoordBufferView !== null) {
    attributes.TEXCOORD_0 = accessors.length;
    accessors.push({
      bufferView: texcoordBufferView,
      componentType: FLOAT_COMPONENT_TYPE,
      count: geometry.texcoords.length,
      type: "VEC2"
    });
  }

  const materialIndexByTextureReference = new Map<string, number>();
  const materials: Array<Record<string, unknown>> = [];
  const primitives = geometry.primitives.map((primitive) => {
    const indexAccessor = accessors.length;
    const indexByteOffset = primitive.firstIndex * indexComponentByteSize;
    accessors.push({
      bufferView: indexBufferView,
      ...(indexByteOffset > 0 ? { byteOffset: indexByteOffset } : {}),
      componentType: indexComponentType,
      count: primitive.indexCount,
      type: "SCALAR"
    });

    const material = resolveMaterialForPrimitive(
      model,
      primitive,
      textureReferences,
      materialIndexByTextureReference,
      materials
    );
    return {
      attributes,
      indices: indexAccessor,
      material,
      mode: 4,
      extras: {
        aurora: {
          sourceMesh: primitive.meshName,
          ...(primitive.textureReference
            ? { textureReference: primitive.textureReference }
            : {})
        }
      }
    };
  });

  const gltf = {
    asset: {
      version: "2.0",
      generator: "aurora-web aurora-mdl-to-glb"
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: model.modelName, mesh: 0 }],
    meshes: [
      {
        name: model.modelName,
        primitives
      }
    ],
    materials,
    buffers: [{ byteLength: binary.length }],
    bufferViews,
    accessors,
    extensionsUsed: ["KHR_materials_unlit"],
    ...(textureReferences.length > 0
      ? {
          extras: {
            aurora: {
              sourceModel: model.modelName,
              textureReferences
            }
          }
        }
      : {})
  };

  return writeGlb(gltf, binary);
}

function resolvePrimaryTextureReference(mesh: ParsedTrimesh): string | undefined {
  return mesh.texture0Token ?? mesh.bitmapToken;
}

function resolveMaterialForPrimitive(
  model: ParsedModel,
  primitive: GeometryPrimitive,
  textureReferences: string[],
  materialIndexByTextureReference: Map<string, number>,
  materials: Array<Record<string, unknown>>
): number {
  const key = primitive.textureReference ?? "";
  const existingIndex = materialIndexByTextureReference.get(key);
  if (typeof existingIndex === "number") {
    return existingIndex;
  }

  const nextIndex = materials.length;
  materialIndexByTextureReference.set(key, nextIndex);
  materials.push(buildAuroraMaterial(model, primitive.textureReference, textureReferences));
  return nextIndex;
}

function buildAuroraMaterial(
  model: ParsedModel,
  textureReference: string | undefined,
  textureReferences: string[]
): Record<string, unknown> {
  return {
    name: textureReference
      ? `Aurora material ${textureReference}`
      : "Aurora default material",
    doubleSided: true,
    pbrMetallicRoughness: {
      baseColorFactor: [0.72, 0.78, 0.82, 1],
      metallicFactor: 0,
      roughnessFactor: 0.88
    },
    extensions: {
      KHR_materials_unlit: {}
    },
    extras: {
      aurora: {
        sourceModel: model.modelName,
        textureReferences,
        ...(textureReference ? { textureReference } : {})
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

function parseNumber(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ASCII MDL number: ${value ?? ""}`);
  }
  return parsed;
}

function isValidIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

function convertAuroraPositionToGltf(position: Vec3): Vec3 {
  return [position[0], position[2], position[1]];
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
