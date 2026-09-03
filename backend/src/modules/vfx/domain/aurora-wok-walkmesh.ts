import type { AuroraVfxDiagnostic } from "./aurora-vfx-source.parser";
import type {
  AuroraParticleCollisionContactResult,
  AuroraParticleCollisionContext,
  AuroraParticleCollisionQuery,
  AuroraRuntimeVector3
} from "./aurora-vfx-runtime-state";

export interface AuroraWokWalkmeshFace {
  vertexIndices: [number, number, number];
  rawTokens: number[];
  sourceLineNumber: number;
}

export interface AuroraWokWalkmeshAabbRecord {
  rawTokens: number[];
  sourceLineNumber: number;
  boundsMin?: AuroraRuntimeVector3;
  boundsMax?: AuroraRuntimeVector3;
  faceIndex?: number;
  planeMask?: number;
  planeMaskSource?:
    | "source-token"
    | "aurora-derived-child-bounds"
    | "aurora-default-zero";
  childRecordIndices?: [number, number];
}

type ParsedAuroraWokWalkmeshAabbRecord = AuroraWokWalkmeshAabbRecord & {
  boundsMin: AuroraRuntimeVector3;
  boundsMax: AuroraRuntimeVector3;
  faceIndex: number;
  planeMask: number;
  planeMaskSource:
    | "source-token"
    | "aurora-derived-child-bounds"
    | "aurora-default-zero";
};

export interface AuroraWokWalkmeshNode {
  nodeName: string;
  position?: AuroraRuntimeVector3;
  orientationRaw?: [number, number, number, number];
  vertices: AuroraRuntimeVector3[];
  faces: AuroraWokWalkmeshFace[];
  aabbRecords: AuroraWokWalkmeshAabbRecord[];
}

export interface AuroraWokWalkmesh {
  version: "aurora-wok-walkmesh/v1";
  sourceFormat: "aurora-wok-ascii";
  resourceName?: string;
  nodes: AuroraWokWalkmeshNode[];
  diagnostics: AuroraVfxDiagnostic[];
}

export interface AuroraWokStaticCollisionContextOptions {
  walkmesh: AuroraWokWalkmesh;
  collisionProfileId?: string;
}

export interface AuroraWokStaticCollisionInstance {
  instanceId: string;
  walkmesh: AuroraWokWalkmesh;
  translation: AuroraRuntimeVector3;
  /** Aurora ARE Tile_Orientation value. Source applies the quarter turn as 4 - orientation. */
  orientationQuarterTurns?: number;
}

export interface AuroraRetailAreaWokCollisionContextOptions {
  instances: readonly AuroraWokStaticCollisionInstance[];
  collisionProfileId?: string;
}

const WOK_STATIC_PROFILE_ID = "aurora-wok-static-profile-gated/v1";
const RETAIL_AREA_WOK_STATIC_PROFILE_ID = "aurora-runtime-static-wok-hit/v1";
const SEGMENT_EPSILON = 1e-8;
const TRANSFORM_EPSILON = 1e-6;

/** Parses retail ASCII WOK geometry and the source-confirmed Aurora AABB tree. */
export function parseAuroraAsciiWokWalkmesh(
  source: string | Uint8Array
): AuroraWokWalkmesh {
  const lines = decodeSource(source).split(/\r?\n/);
  const diagnostics: AuroraVfxDiagnostic[] = [];
  const nodes: AuroraWokWalkmeshNode[] = [];
  let resourceName: string | undefined;
  let node: AuroraWokWalkmeshNode | undefined;
  let collectingAabbContinuations = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineNumber = lineIndex + 1;
    const line = lines[lineIndex]?.trim() ?? "";
    if (!line || line.startsWith("#")) {
      continue;
    }

    const tokens = line.split(/\s+/);
    const command = tokens[0]?.toLowerCase();
    if (command === "beginwalkmeshgeom") {
      resourceName = tokens.slice(1).join(" ") || undefined;
      continue;
    }
    if (command === "node" && tokens[1]?.toLowerCase() === "aabb") {
      const nodeName = tokens.slice(2).join(" ");
      if (!nodeName) {
        diagnostics.push(diagnostic("WOK_NODE_NAME_MISSING", "warn", lineNumber));
        node = undefined;
        continue;
      }
      node = { nodeName, vertices: [], faces: [], aabbRecords: [] };
      nodes.push(node);
      collectingAabbContinuations = false;
      continue;
    }
    if (command === "endnode") {
      node = undefined;
      collectingAabbContinuations = false;
      continue;
    }
    if (!node) {
      continue;
    }
    if (command === "position") {
      const position = readVector3(tokens.slice(1));
      if (position) {
        node.position = position;
      } else {
        diagnostics.push(diagnostic("WOK_POSITION_INVALID", "warn", lineNumber));
      }
      continue;
    }
    if (command === "orientation") {
      const orientation = readTuple(tokens.slice(1), 4);
      if (orientation) {
        node.orientationRaw = orientation as [number, number, number, number];
      } else {
        diagnostics.push(diagnostic("WOK_ORIENTATION_INVALID", "warn", lineNumber));
      }
      continue;
    }
    if (command === "aabb") {
      preserveAabbRecord(node, tokens.slice(1), lineNumber, diagnostics);
      collectingAabbContinuations = true;
      continue;
    }
    if (collectingAabbContinuations) {
      const rawTokens = readNumbers(tokens);
      if (rawTokens && (rawTokens.length === 7 || rawTokens.length === 8)) {
        preserveAabbRecord(node, tokens, lineNumber, diagnostics);
        continue;
      }
      collectingAabbContinuations = false;
    }
    if (command === "verts" || command === "faces") {
      const count = readCount(tokens[1]);
      if (count === undefined) {
        diagnostics.push(
          diagnostic(
            command === "verts" ? "WOK_VERTEX_COUNT_INVALID" : "WOK_FACE_COUNT_INVALID",
            "warn",
            lineNumber
          )
        );
        continue;
      }
      const rows = lines.slice(lineIndex + 1, lineIndex + 1 + count);
      if (rows.length !== count) {
        diagnostics.push(
          diagnostic(
            command === "verts" ? "WOK_VERTEX_ROWS_TRUNCATED" : "WOK_FACE_ROWS_TRUNCATED",
            "warn",
            lineNumber
          )
        );
      }
      rows.forEach((row, rowOffset) => {
        const rowLineNumber = lineNumber + rowOffset + 1;
        if (command === "verts") {
          const vertex = readVector3((row ?? "").trim().split(/\s+/));
          if (vertex) {
            node?.vertices.push(vertex);
          } else {
            diagnostics.push(diagnostic("WOK_VERTEX_INVALID", "warn", rowLineNumber));
          }
          return;
        }
        const rawTokens = readNumbers((row ?? "").trim().split(/\s+/));
        const vertexIndices = rawTokens?.slice(0, 3);
        if (
          !rawTokens ||
          !vertexIndices ||
          vertexIndices.length !== 3 ||
          !vertexIndices.every((value) => Number.isInteger(value) && value >= 0) ||
          vertexIndices.some((value) => value >= (node?.vertices.length ?? 0))
        ) {
          diagnostics.push(diagnostic("WOK_FACE_INVALID", "warn", rowLineNumber));
          return;
        }
        node?.faces.push({
          vertexIndices: vertexIndices as [number, number, number],
          rawTokens,
          sourceLineNumber: rowLineNumber
        });
      });
      lineIndex += count;
    }
  }

  nodes.forEach((parsedNode) => finalizeAabbTree(parsedNode, diagnostics));

  return {
    version: "aurora-wok-walkmesh/v1",
    sourceFormat: "aurora-wok-ascii",
    ...(resourceName ? { resourceName } : {}),
    nodes,
    diagnostics
  };
}

function preserveAabbRecord(
  node: AuroraWokWalkmeshNode,
  tokens: string[],
  sourceLineNumber: number,
  diagnostics: AuroraVfxDiagnostic[]
): void {
  const rawTokens = readNumbers(tokens);
  if (
    rawTokens &&
    (rawTokens.length === 7 || rawTokens.length === 8) &&
    Number.isInteger(rawTokens[6]) &&
    (rawTokens.length === 7 || Number.isInteger(rawTokens[7]))
  ) {
    const sourcePlaneMask = rawTokens[7];
    node.aabbRecords.push({
      rawTokens,
      sourceLineNumber,
      boundsMin: {
        x: Math.fround(rawTokens[0] as number),
        y: Math.fround(rawTokens[1] as number),
        z: Math.fround(rawTokens[2] as number)
      },
      boundsMax: {
        x: Math.fround(rawTokens[3] as number),
        y: Math.fround(rawTokens[4] as number),
        z: Math.fround(rawTokens[5] as number)
      },
      faceIndex: rawTokens[6] as number,
      planeMask: sourcePlaneMask ?? 0,
      planeMaskSource:
        sourcePlaneMask === undefined ? "aurora-default-zero" : "source-token"
    });
    return;
  }
  diagnostics.push(diagnostic("WOK_AABB_RECORD_INVALID", "warn", sourceLineNumber));
}

function finalizeAabbTree(
  node: AuroraWokWalkmeshNode,
  diagnostics: AuroraVfxDiagnostic[]
): void {
  if (!node.aabbRecords.length) {
    return;
  }

  let cursor = 0;
  let reportedTruncation = false;
  const consumeRecord = (): number | undefined => {
    if (cursor >= node.aabbRecords.length) {
      if (!reportedTruncation) {
        const sourceLineNumber =
          node.aabbRecords[node.aabbRecords.length - 1]?.sourceLineNumber ?? 1;
        diagnostics.push(
          diagnostic(
            "WOK_AABB_TREE_TRUNCATED",
            "warn",
            sourceLineNumber,
            `Aurora ASCII WOK AABB node "${node.nodeName}" ended before an internal record received both preorder children.`
          )
        );
        reportedTruncation = true;
      }
      return undefined;
    }

    const recordIndex = cursor;
    const record = node.aabbRecords[cursor] as ParsedAuroraWokWalkmeshAabbRecord;
    cursor += 1;
    if (record.faceIndex !== -1) {
      if (record.faceIndex < 0 || record.faceIndex >= node.faces.length) {
        diagnostics.push(
          diagnostic(
            "WOK_AABB_FACE_INDEX_OUT_OF_RANGE",
            "warn",
            record.sourceLineNumber,
            `Aurora ASCII WOK AABB leaf in node "${node.nodeName}" references face ${record.faceIndex}, outside the ${node.faces.length} parsed faces.`
          )
        );
      }
      return recordIndex;
    }

    const firstChildRecordIndex = consumeRecord();
    const secondChildRecordIndex = consumeRecord();
    if (
      firstChildRecordIndex === undefined ||
      secondChildRecordIndex === undefined
    ) {
      return recordIndex;
    }

    record.childRecordIndices = [firstChildRecordIndex, secondChildRecordIndex];
    if (record.planeMaskSource === "aurora-default-zero") {
      record.planeMask = deriveAuroraAabbPlaneMask(
        node.aabbRecords[
          firstChildRecordIndex
        ] as ParsedAuroraWokWalkmeshAabbRecord,
        node.aabbRecords[
          secondChildRecordIndex
        ] as ParsedAuroraWokWalkmeshAabbRecord
      );
      record.planeMaskSource = "aurora-derived-child-bounds";
    }
    return recordIndex;
  };

  consumeRecord();
  if (cursor < node.aabbRecords.length) {
    diagnostics.push(
      diagnostic(
        "WOK_AABB_TREE_TRAILING_RECORDS",
        "warn",
        (node.aabbRecords[cursor] as AuroraWokWalkmeshAabbRecord).sourceLineNumber,
        `Aurora ASCII WOK AABB node "${node.nodeName}" contains records after its complete preorder root tree.`
      )
    );
  }
}

function deriveAuroraAabbPlaneMask(
  firstChild: ParsedAuroraWokWalkmeshAabbRecord,
  secondChild: ParsedAuroraWokWalkmeshAabbRecord
): number {
  const centerDelta = {
    x: Math.fround(
      Math.fround(secondChild.boundsMin.x + secondChild.boundsMax.x) -
        Math.fround(firstChild.boundsMin.x + firstChild.boundsMax.x)
    ),
    y: Math.fround(
      Math.fround(secondChild.boundsMin.y + secondChild.boundsMax.y) -
        Math.fround(firstChild.boundsMin.y + firstChild.boundsMax.y)
    ),
    z: Math.fround(
      Math.fround(secondChild.boundsMin.z + secondChild.boundsMax.z) -
        Math.fround(firstChild.boundsMin.z + firstChild.boundsMax.z)
    )
  };
  const absoluteX = Math.abs(centerDelta.x);
  const absoluteY = Math.abs(centerDelta.y);
  const absoluteZ = Math.abs(centerDelta.z);

  if (absoluteX > absoluteY && absoluteX > absoluteZ) {
    return centerDelta.x > 0 ? 1 : 8;
  }
  if (absoluteY > absoluteZ) {
    return centerDelta.y > 0 ? 2 : 16;
  }
  return centerDelta.z > 0 ? 4 : 32;
}

/**
 * The shared source service traverses static geometry first and can select a
 * dynamic fallback for other helper profiles. This profile-gated adapter covers
 * only retained WOK triangles and cannot mutate the canonical particle runtime.
 */
export function createAuroraWokStaticCollisionContext(
  options: AuroraWokStaticCollisionContextOptions
): AuroraParticleCollisionContext {
  return {
    collisionProfileId: options.collisionProfileId ?? WOK_STATIC_PROFILE_ID,
    requestedCollisionClasses: ["retail-wok-static-geometry"],
    serviceEvidence: "profile-gated-adapter",
    resolve(query) {
      return resolveStaticWokContact(
        [
          {
            walkmesh: options.walkmesh,
            translation: { x: 0, y: 0, z: 0 },
            orientationQuarterTurns: 0
          }
        ],
        query,
        "retail-wok-ascii-face-winding-profile-gated"
      );
    }
  };
}

/**
 * Recreates the Aurora area query selected by the VFX emitter helper. The
 * helper is constructed with argument zero set to 1, while the shared area
 * service enters dynamic traversal only when that field is 0.
 */
export function createAuroraRetailAreaWokCollisionContext(
  options: AuroraRetailAreaWokCollisionContextOptions
): AuroraParticleCollisionContext {
  return {
    collisionProfileId: options.collisionProfileId ?? RETAIL_AREA_WOK_STATIC_PROFILE_ID,
    requestedCollisionClasses: ["retail-area-static-wok-geometry"],
    serviceEvidence: "aurora-runtime-service",
    resolve(query) {
      const result = resolveStaticWokContact(
        options.instances,
        query,
        "aurora-static-wok-face-winding-query-helper-slots-0x54-0x58-0x5c"
      );
      if (result.status !== "noHit") {
        return result;
      }
      return {
        status: "noHit",
        diagnostics: [
          {
            code: "VFX_AURORA_VFX_QUERY_STATIC_MISS_NO_HIT",
            severity: "info",
            message:
              "The static WOK traversal found no contact; the VFX query helper's first constructor argument is 1, so Aurora does not select the shared service's dynamic-object traversal."
          }
        ]
      };
    }
  };
}

function resolveStaticWokContact(
  instances: ReadonlyArray<{
    instanceId?: string;
    walkmesh: AuroraWokWalkmesh;
    translation: AuroraRuntimeVector3;
    orientationQuarterTurns?: number;
  }>,
  query: AuroraParticleCollisionQuery,
  contactNormalProvenance: string
): AuroraParticleCollisionContactResult {
  let closest:
    | {
        segmentParameter: number;
        hitPosition: AuroraRuntimeVector3;
        contactNormal: AuroraRuntimeVector3;
        collisionOwnerProvenance: string;
      }
    | undefined;

  for (const instance of instances) {
    const invalidOrientationNode = instance.walkmesh.nodes.find(hasInvalidNodeOrientation);
    if (invalidOrientationNode) {
      return {
        status: "unsupported",
        diagnostics: [
          {
            code: "VFX_WOK_NODE_ORIENTATION_AXIS_INVALID",
            severity: "warn",
            message: `Static WOK node "${invalidOrientationNode.nodeName}" has a non-zero orientation angle with a zero-length axis.`
          }
        ]
      };
    }
    for (const node of instance.walkmesh.nodes) {
      const nodePosition = node.position ?? { x: 0, y: 0, z: 0 };
      const localStart = inverseRotateWokNodeVertex(
        subtract(
          inverseTransformWokVertex(
            query.currentPosition,
            instance.translation,
            instance.orientationQuarterTurns
          ),
          nodePosition
        ),
        node.orientationRaw
      );
      const localEndpoint = inverseRotateWokNodeVertex(
        subtract(
          inverseTransformWokVertex(
            query.testEndpoint,
            instance.translation,
            instance.orientationQuarterTurns
          ),
          nodePosition
        ),
        node.orientationRaw
      );
      const localHit = resolveWokNodeLocalContact(node, localStart, localEndpoint);
      if (!localHit) {
        continue;
      }
      const hitPosition = snapVectorNearZero(
        transformWokVertex(
          add(rotateWokNodeVertex(localHit.hitPosition, node.orientationRaw), nodePosition),
          instance.translation,
          instance.orientationQuarterTurns
        )
      );
      const contactNormal = normalize(
        rotateWokAreaVector(
          rotateWokNodeVertex(localHit.contactNormal, node.orientationRaw),
          instance.orientationQuarterTurns
        )
      );
      const segmentParameter = projectSegmentParameter(
        query.currentPosition,
        query.testEndpoint,
        hitPosition
      );
      if (
        !contactNormal ||
        segmentParameter === undefined ||
        (closest && segmentParameter >= closest.segmentParameter)
      ) {
        continue;
      }
      closest = {
        segmentParameter,
        hitPosition,
        contactNormal,
        collisionOwnerProvenance: [
          "retail-wok-ascii-static-triangle",
          ...(instance.instanceId ? [instance.instanceId] : []),
          instance.walkmesh.resourceName ?? "unnamed-wok",
          node.nodeName,
          `line-${localHit.face.sourceLineNumber}`
        ].join(":")
      };
    }
  }

  if (!closest) {
    return { status: "noHit" };
  }

  return {
    status: "hit",
    hitPosition: closest.hitPosition,
    contactNormal: closest.contactNormal,
    contactNormalProvenance,
    segmentParameter: closest.segmentParameter,
    contactDistance: vectorLength(
      subtract(query.testEndpoint, query.currentPosition)
    ) * closest.segmentParameter,
    collisionOwnerProvenance: closest.collisionOwnerProvenance
  };
}

function resolveWokNodeLocalContact(
  node: AuroraWokWalkmeshNode,
  start: AuroraRuntimeVector3,
  endpoint: AuroraRuntimeVector3
):
  | {
      hitPosition: AuroraRuntimeVector3;
      contactNormal: AuroraRuntimeVector3;
      face: AuroraWokWalkmeshFace;
    }
  | undefined {
  const aabbRecords = node.aabbRecords.every(isParsedAabbRecord)
    ? (node.aabbRecords as ParsedAuroraWokWalkmeshAabbRecord[])
    : undefined;
  if (!aabbRecords?.length) {
    let closest:
      | {
          segmentParameter: number;
          hitPosition: AuroraRuntimeVector3;
          contactNormal: AuroraRuntimeVector3;
          face: AuroraWokWalkmeshFace;
        }
      | undefined;
    for (const face of node.faces) {
      const hit = intersectWokFace(node, face, start, endpoint);
      if (!hit || (closest && hit.segmentParameter >= closest.segmentParameter)) {
        continue;
      }
      closest = { ...hit, face };
    }
    return closest;
  }

  const directionMask = buildAuroraAabbDirectionMask(start, endpoint);
  let shortenedEndpoint = endpoint;
  let latestHit:
    | {
        hitPosition: AuroraRuntimeVector3;
        contactNormal: AuroraRuntimeVector3;
        face: AuroraWokWalkmeshFace;
      }
    | undefined;

  const visitRecord = (recordIndex: number): void => {
    const record = aabbRecords[recordIndex];
    if (
      !record ||
      !auroraSegmentMayIntersectAabb(
        start,
        shortenedEndpoint,
        record.boundsMin,
        record.boundsMax
      )
    ) {
      return;
    }
    if (record.faceIndex !== -1) {
      const face = node.faces[record.faceIndex];
      if (!face) {
        return;
      }
      const hit = intersectWokFace(node, face, start, shortenedEndpoint);
      if (!hit) {
        return;
      }
      shortenedEndpoint = hit.hitPosition;
      latestHit = {
        hitPosition: hit.hitPosition,
        contactNormal: hit.contactNormal,
        face
      };
      return;
    }

    const children = record.childRecordIndices;
    if (!children) {
      return;
    }
    const [firstChild, secondChild] = children;
    const orderedChildren =
      (record.planeMask & directionMask) === 0
        ? [secondChild, firstChild]
        : [firstChild, secondChild];
    for (const childRecordIndex of orderedChildren) {
      visitRecord(childRecordIndex);
    }
  };

  visitRecord(0);
  return latestHit;
}

function isParsedAabbRecord(
  record: AuroraWokWalkmeshAabbRecord
): record is ParsedAuroraWokWalkmeshAabbRecord {
  return (
    record.boundsMin !== undefined &&
    record.boundsMax !== undefined &&
    record.faceIndex !== undefined &&
    record.planeMask !== undefined
  );
}

function intersectWokFace(
  node: AuroraWokWalkmeshNode,
  face: AuroraWokWalkmeshFace,
  start: AuroraRuntimeVector3,
  endpoint: AuroraRuntimeVector3
):
  | {
      segmentParameter: number;
      hitPosition: AuroraRuntimeVector3;
      contactNormal: AuroraRuntimeVector3;
    }
  | undefined {
  const [firstIndex, secondIndex, thirdIndex] = face.vertexIndices;
  const first = node.vertices[firstIndex];
  const second = node.vertices[secondIndex];
  const third = node.vertices[thirdIndex];
  return first && second && third
    ? intersectSegmentTriangle(start, endpoint, first, second, third)
    : undefined;
}

function buildAuroraAabbDirectionMask(
  start: AuroraRuntimeVector3,
  endpoint: AuroraRuntimeVector3
): number {
  return (
    (start.x < endpoint.x ? 1 : 8) |
    (start.y < endpoint.y ? 2 : 16) |
    (start.z < endpoint.z ? 4 : 32)
  );
}

function auroraSegmentMayIntersectAabb(
  start: AuroraRuntimeVector3,
  endpoint: AuroraRuntimeVector3,
  boundsMin: AuroraRuntimeVector3,
  boundsMax: AuroraRuntimeVector3
): boolean {
  if (start.z <= boundsMax.z) {
    return true;
  }
  if (endpoint.z > boundsMax.z) {
    return false;
  }

  const xPlane = start.x < boundsMin.x ? boundsMin.x : start.x > boundsMax.x ? boundsMax.x : undefined;
  if (
    xPlane !== undefined &&
    segmentCrossesAabbPlane(start, endpoint, "x", xPlane, boundsMin, boundsMax)
  ) {
    return true;
  }
  const yPlane = start.y < boundsMin.y ? boundsMin.y : start.y > boundsMax.y ? boundsMax.y : undefined;
  if (
    yPlane !== undefined &&
    segmentCrossesAabbPlane(start, endpoint, "y", yPlane, boundsMin, boundsMax)
  ) {
    return true;
  }
  const zPlane = start.z < boundsMin.z ? boundsMin.z : boundsMax.z;
  return segmentCrossesAabbPlane(start, endpoint, "z", zPlane, boundsMin, boundsMax);
}

function segmentCrossesAabbPlane(
  start: AuroraRuntimeVector3,
  endpoint: AuroraRuntimeVector3,
  axis: "x" | "y" | "z",
  plane: number,
  boundsMin: AuroraRuntimeVector3,
  boundsMax: AuroraRuntimeVector3
): boolean {
  const denominator = endpoint[axis] - start[axis];
  if (denominator === 0) {
    return false;
  }
  const factor = (plane - start[axis]) / denominator;
  const point = {
    x: factor * endpoint.x + (1 - factor) * start.x,
    y: factor * endpoint.y + (1 - factor) * start.y,
    z: factor * endpoint.z + (1 - factor) * start.z
  };
  const otherAxes = (["x", "y", "z"] as const).filter((candidate) => candidate !== axis);
  return otherAxes.every(
    (candidate) =>
      boundsMin[candidate] <= point[candidate] && point[candidate] <= boundsMax[candidate]
  );
}

function projectSegmentParameter(
  start: AuroraRuntimeVector3,
  endpoint: AuroraRuntimeVector3,
  point: AuroraRuntimeVector3
): number | undefined {
  const direction = subtract(endpoint, start);
  const lengthSquared = dot(direction, direction);
  if (lengthSquared < SEGMENT_EPSILON) {
    return undefined;
  }
  const parameter = dot(subtract(point, start), direction) / lengthSquared;
  return Number.isFinite(parameter) ? parameter : undefined;
}

function snapVectorNearZero(vector: AuroraRuntimeVector3): AuroraRuntimeVector3 {
  return {
    x: Math.abs(vector.x) < SEGMENT_EPSILON ? 0 : vector.x,
    y: Math.abs(vector.y) < SEGMENT_EPSILON ? 0 : vector.y,
    z: Math.abs(vector.z) < SEGMENT_EPSILON ? 0 : vector.z
  };
}

function hasInvalidNodeOrientation(node: AuroraWokWalkmeshNode): boolean {
  const [x, y, z, angle] = node.orientationRaw ?? [1, 0, 0, 0];
  return Math.abs(angle) > TRANSFORM_EPSILON && Math.hypot(x, y, z) <= TRANSFORM_EPSILON;
}

function rotateWokNodeVertex(
  vertex: AuroraRuntimeVector3,
  orientationRaw: AuroraWokWalkmeshNode["orientationRaw"]
): AuroraRuntimeVector3 {
  const [rawX, rawY, rawZ, angle] = orientationRaw ?? [1, 0, 0, 0];
  if (Math.abs(angle) <= TRANSFORM_EPSILON) {
    return vertex;
  }
  const inverseAxisLength = 1 / Math.hypot(rawX, rawY, rawZ);
  const axis = {
    x: rawX * inverseAxisLength,
    y: rawY * inverseAxisLength,
    z: rawZ * inverseAxisLength
  };
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const oneMinusCosine = 1 - cosine;
  const projection = dot(axis, vertex);
  const axisCrossVertex = cross(axis, vertex);
  return add(
    add(scale(vertex, cosine), scale(axisCrossVertex, sine)),
    scale(axis, projection * oneMinusCosine)
  );
}

function inverseRotateWokNodeVertex(
  vertex: AuroraRuntimeVector3,
  orientationRaw: AuroraWokWalkmeshNode["orientationRaw"]
): AuroraRuntimeVector3 {
  const [x, y, z, angle] = orientationRaw ?? [1, 0, 0, 0];
  return rotateWokNodeVertex(vertex, [x, y, z, -angle]);
}

function transformWokVertex(
  vertex: AuroraRuntimeVector3,
  translation: AuroraRuntimeVector3,
  sourceOrientationQuarterTurns = 0
): AuroraRuntimeVector3 {
  return add(rotateWokAreaVector(vertex, sourceOrientationQuarterTurns), translation);
}

function inverseTransformWokVertex(
  vertex: AuroraRuntimeVector3,
  translation: AuroraRuntimeVector3,
  sourceOrientationQuarterTurns = 0
): AuroraRuntimeVector3 {
  return rotateQuarterTurns(
    subtract(vertex, translation),
    normalizeQuarterTurns(sourceOrientationQuarterTurns)
  );
}

function rotateWokAreaVector(
  vector: AuroraRuntimeVector3,
  sourceOrientationQuarterTurns = 0
): AuroraRuntimeVector3 {
  const sourceQuarterTurns = (4 - normalizeQuarterTurns(sourceOrientationQuarterTurns)) % 4;
  return rotateQuarterTurns(vector, sourceQuarterTurns);
}

function normalizeQuarterTurns(value: number): number {
  return ((Math.trunc(value) % 4) + 4) % 4;
}

function rotateQuarterTurns(
  vector: AuroraRuntimeVector3,
  quarterTurns: number
): AuroraRuntimeVector3 {
  return quarterTurns === 1
    ? { x: -vector.y, y: vector.x, z: vector.z }
    : quarterTurns === 2
      ? { x: -vector.x, y: -vector.y, z: vector.z }
      : quarterTurns === 3
        ? { x: vector.y, y: -vector.x, z: vector.z }
        : vector;
}

function intersectSegmentTriangle(
  start: AuroraRuntimeVector3,
  endpoint: AuroraRuntimeVector3,
  first: AuroraRuntimeVector3,
  second: AuroraRuntimeVector3,
  third: AuroraRuntimeVector3
):
  | {
      segmentParameter: number;
      hitPosition: AuroraRuntimeVector3;
      contactNormal: AuroraRuntimeVector3;
    }
  | undefined {
  const direction = subtract(endpoint, start);
  const edgeOne = subtract(second, first);
  const edgeTwo = subtract(third, first);
  const determinant = dot(edgeOne, cross(direction, edgeTwo));
  if (Math.abs(determinant) < SEGMENT_EPSILON) {
    return undefined;
  }
  const inverseDeterminant = 1 / determinant;
  const startOffset = subtract(start, first);
  const u = dot(startOffset, cross(direction, edgeTwo)) * inverseDeterminant;
  if (u < 0 || u > 1) {
    return undefined;
  }
  const v = dot(direction, cross(startOffset, edgeOne)) * inverseDeterminant;
  if (v < 0 || u + v > 1) {
    return undefined;
  }
  const segmentParameter = dot(edgeTwo, cross(startOffset, edgeOne)) * inverseDeterminant;
  if (segmentParameter < 0 || segmentParameter > 1) {
    return undefined;
  }
  const contactNormal = normalize(cross(edgeOne, edgeTwo));
  if (!contactNormal) {
    return undefined;
  }
  return {
    segmentParameter,
    hitPosition: add(start, scale(direction, segmentParameter)),
    contactNormal
  };
}

function decodeSource(source: string | Uint8Array): string {
  return typeof source === "string" ? source : new TextDecoder().decode(source);
}

function readVector3(tokens: string[]): AuroraRuntimeVector3 | undefined {
  const values = readTuple(tokens, 3);
  return values ? { x: values[0], y: values[1], z: values[2] } : undefined;
}

function readTuple(tokens: string[], expectedLength: number): number[] | undefined {
  const values = readNumbers(tokens);
  return values && values.length === expectedLength ? values : undefined;
}

function readNumbers(tokens: string[]): number[] | undefined {
  if (!tokens.length) {
    return undefined;
  }
  const values = tokens.map((token) => Number(token));
  return values.every(Number.isFinite) ? values : undefined;
}

function readCount(token: string | undefined): number | undefined {
  const value = Number(token);
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

function diagnostic(
  code: string,
  severity: AuroraVfxDiagnostic["severity"],
  sourceLineNumber: number,
  message = `Aurora ASCII WOK record could not be preserved at line ${sourceLineNumber}.`
): AuroraVfxDiagnostic {
  return {
    code,
    severity,
    message
  };
}

function subtract(
  left: AuroraRuntimeVector3,
  right: AuroraRuntimeVector3
): AuroraRuntimeVector3 {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}

function add(
  left: AuroraRuntimeVector3,
  right: AuroraRuntimeVector3
): AuroraRuntimeVector3 {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}

function scale(
  vector: AuroraRuntimeVector3,
  scalar: number
): AuroraRuntimeVector3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

function dot(left: AuroraRuntimeVector3, right: AuroraRuntimeVector3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function cross(left: AuroraRuntimeVector3, right: AuroraRuntimeVector3): AuroraRuntimeVector3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x
  };
}

function normalize(vector: AuroraRuntimeVector3): AuroraRuntimeVector3 | undefined {
  const length = vectorLength(vector);
  if (length < SEGMENT_EPSILON) {
    return undefined;
  }
  const normalized = scale(vector, 1 / length);
  return {
    x: Math.abs(normalized.x) < SEGMENT_EPSILON ? 0 : normalized.x,
    y: Math.abs(normalized.y) < SEGMENT_EPSILON ? 0 : normalized.y,
    z: Math.abs(normalized.z) < SEGMENT_EPSILON ? 0 : normalized.z
  };
}

function vectorLength(vector: AuroraRuntimeVector3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}
