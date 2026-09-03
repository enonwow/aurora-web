import type {
  AuroraAreaVfxCollisionContract,
  SceneTile
} from "../contracts";

export type AreaTilePathMetadataStatus =
  | "present-both"
  | "present-first-only"
  | "present-second-only"
  | "missing-both";

export type AreaTileWokGeometricStatus =
  | "contact"
  | "discontinuous"
  | "unresolved";

export type AreaTileWokReason =
  | "source-backed-boundary-overlap"
  | "boundary-geometry-discontinuous"
  | "boundary-geometry-absent-both"
  | "boundary-geometry-absent-first"
  | "boundary-geometry-absent-second"
  | "collision-contract-missing"
  | "collision-contract-not-ready"
  | "tile-instance-provenance-invalid"
  | "walkmesh-resource-invalid";

export interface AreaTileConnectivitySeamDiagnostic {
  readonly seamId: string;
  readonly firstTileId: string;
  readonly secondTileId: string;
  readonly direction: "right" | "bottom";
  readonly pathMetadataStatus: AreaTilePathMetadataStatus;
  readonly pathConnectStatus: "missing";
  readonly wokGeometricStatus: AreaTileWokGeometricStatus;
  readonly wokReason: AreaTileWokReason;
  readonly firstBoundarySegmentCount: number;
  readonly secondBoundarySegmentCount: number;
}

export interface AreaTileConnectivityDiagnostic {
  readonly code:
    | "AREA_TILE_PATH_CONNECT_NATIVE_EVIDENCE_MISSING"
    | "AREA_TILE_GRID_INCOMPLETE"
    | "AREA_TILE_WOK_INSTANCE_MISSING"
    | "AREA_TILE_WOK_INSTANCE_DUPLICATE"
    | "AREA_TILE_WOK_INSTANCE_TRANSFORM_MISMATCH"
    | "AREA_TILE_WOK_RESOURCE_INVALID"
    | "AREA_TILE_WOK_GEOMETRIC_DISCONTINUITY";
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
  readonly tileId?: string;
  readonly seamId?: string;
}

export interface AreaTileConnectivityDiagnostics {
  readonly version: "aurora-area-tile-connectivity-diagnostics/v1";
  readonly evidenceBoundary:
    "set-path-metadata-and-source-wok-geometry-only-no-native-traversability-claim";
  readonly pathConnect: {
    readonly status: "missing";
    readonly evidence: "native-path-connect-not-recovered";
  };
  readonly seams: readonly AreaTileConnectivitySeamDiagnostic[];
  readonly summary: {
    readonly expectedInternalSeams: number;
    readonly evaluatedInternalSeams: number;
    readonly pathMetadataPresentBothSeams: number;
    readonly wokGeometricContactSeams: number;
    readonly wokDiscontinuousSeams: number;
    readonly unresolvedSeams: number;
    readonly geometricContactComponents: number;
  };
  readonly diagnostics: readonly AreaTileConnectivityDiagnostic[];
}

export interface BuildAreaTileConnectivityDiagnosticsInput {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly SceneTile[];
  readonly collision?: AuroraAreaVfxCollisionContract;
}

interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface BoundarySegment {
  readonly firstAlong: number;
  readonly firstHeight: number;
  readonly secondAlong: number;
  readonly secondHeight: number;
}

interface ParsedWalkmeshNode {
  readonly position: Vector3;
  readonly orientation: readonly [number, number, number, number];
  readonly vertices: readonly Vector3[];
  readonly faces: ReadonlyArray<readonly [number, number, number]>;
}

interface TileWokGeometry {
  readonly nodes: readonly ParsedWalkmeshNode[];
  readonly translation: Vector3;
  readonly orientationQuarterTurns: number;
}

type TileWokAdmission =
  | {
      readonly status: "ready";
      readonly geometry: TileWokGeometry;
    }
  | {
      readonly status: "invalid";
      readonly reason:
        | "tile-instance-provenance-invalid"
        | "walkmesh-resource-invalid";
    };

const MAX_WOK_RESOURCES = 4096;
const MAX_WOK_INSTANCES = 4096;
const MAX_WOK_NODES_PER_RESOURCE = 512;
const MAX_WOK_VERTICES_PER_RESOURCE = 250_000;
const MAX_WOK_FACES_PER_RESOURCE = 500_000;
const MAX_WOK_OVERLAY_SEGMENTS = 250_000;
const TRANSFORM_EPSILON = 1e-6;

export interface AreaTileWalkmeshOverlaySegment {
  readonly tileId: string;
  readonly first: Vector3;
  readonly second: Vector3;
}

export interface AreaTileWalkmeshOverlaySegments {
  readonly version: "aurora-area-tile-wok-overlay/v1";
  readonly status: "ready" | "partial" | "unavailable";
  readonly instanceCount: number;
  readonly segmentCount: number;
  readonly truncated: boolean;
  readonly segments: readonly AreaTileWalkmeshOverlaySegment[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readVector3(value: unknown): Vector3 | undefined {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.z)
  ) {
    return undefined;
  }
  return { x: value.x, y: value.y, z: value.z };
}

function readOrientation(value: unknown): readonly [number, number, number, number] | undefined {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    !value.every(isFiniteNumber)
  ) {
    return undefined;
  }
  const orientation = value as [number, number, number, number];
  if (
    Math.abs(orientation[3]) > TRANSFORM_EPSILON &&
    Math.hypot(orientation[0], orientation[1], orientation[2]) <= TRANSFORM_EPSILON
  ) {
    return undefined;
  }
  return orientation;
}

function parseWalkmesh(value: unknown): readonly ParsedWalkmeshNode[] | undefined {
  if (!isRecord(value) || value.version !== "aurora-wok-walkmesh/v1") {
    return undefined;
  }
  if (!Array.isArray(value.nodes) || value.nodes.length > MAX_WOK_NODES_PER_RESOURCE) {
    return undefined;
  }

  let totalVertices = 0;
  let totalFaces = 0;
  const nodes: ParsedWalkmeshNode[] = [];
  for (const rawNode of value.nodes) {
    if (!isRecord(rawNode) || !Array.isArray(rawNode.vertices) || !Array.isArray(rawNode.faces)) {
      return undefined;
    }
    totalVertices += rawNode.vertices.length;
    totalFaces += rawNode.faces.length;
    if (
      totalVertices > MAX_WOK_VERTICES_PER_RESOURCE ||
      totalFaces > MAX_WOK_FACES_PER_RESOURCE
    ) {
      return undefined;
    }

    const vertices = rawNode.vertices.map(readVector3);
    if (vertices.some((vertex) => vertex === undefined)) {
      return undefined;
    }
    const faces: Array<readonly [number, number, number]> = [];
    for (const rawFace of rawNode.faces) {
      if (!isRecord(rawFace) || !Array.isArray(rawFace.vertexIndices)) {
        return undefined;
      }
      const indices = rawFace.vertexIndices;
      if (
        indices.length !== 3 ||
        !indices.every(
          (index) =>
            typeof index === "number" &&
            Number.isInteger(index) &&
            index >= 0 &&
            index < vertices.length
        ) ||
        new Set(indices).size !== 3
      ) {
        return undefined;
      }
      faces.push(indices as [number, number, number]);
    }
    const position = rawNode.position === undefined
      ? { x: 0, y: 0, z: 0 }
      : readVector3(rawNode.position);
    const orientation = rawNode.orientationRaw === undefined
      ? ([1, 0, 0, 0] as const)
      : readOrientation(rawNode.orientationRaw);
    if (!position || !orientation) {
      return undefined;
    }
    nodes.push({
      position,
      orientation,
      vertices: vertices as Vector3[],
      faces
    });
  }
  return nodes;
}

function normalizeQuarterTurns(value: number): number {
  return Math.trunc(value) % 4;
}

function rotateQuarterTurns(vector: Vector3, quarterTurns: number): Vector3 {
  return quarterTurns === 1
    ? { x: -vector.y, y: vector.x, z: vector.z }
    : quarterTurns === 2
      ? { x: -vector.x, y: -vector.y, z: vector.z }
      : quarterTurns === 3
        ? { x: vector.y, y: -vector.x, z: vector.z }
        : vector;
}

function rotateNodeVertex(
  vertex: Vector3,
  orientation: readonly [number, number, number, number]
): Vector3 {
  const [rawX, rawY, rawZ, angle] = orientation;
  if (Math.abs(angle) <= TRANSFORM_EPSILON) {
    return vertex;
  }
  const axisLength = Math.hypot(rawX, rawY, rawZ);
  const axis = { x: rawX / axisLength, y: rawY / axisLength, z: rawZ / axisLength };
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const oneMinusCosine = 1 - cosine;
  const projection = axis.x * vertex.x + axis.y * vertex.y + axis.z * vertex.z;
  const cross = {
    x: axis.y * vertex.z - axis.z * vertex.y,
    y: axis.z * vertex.x - axis.x * vertex.z,
    z: axis.x * vertex.y - axis.y * vertex.x
  };
  return {
    x: vertex.x * cosine + cross.x * sine + axis.x * projection * oneMinusCosine,
    y: vertex.y * cosine + cross.y * sine + axis.y * projection * oneMinusCosine,
    z: vertex.z * cosine + cross.z * sine + axis.z * projection * oneMinusCosine
  };
}

function transformVertex(
  vertex: Vector3,
  node: ParsedWalkmeshNode,
  geometry: TileWokGeometry
): Vector3 {
  const nodeRotated = rotateNodeVertex(vertex, node.orientation);
  const positioned = {
    x: nodeRotated.x + node.position.x,
    y: nodeRotated.y + node.position.y,
    z: nodeRotated.z + node.position.z
  };
  // The recovered ARE/WOK transform applies source orientation as 4 - Tile_Orientation.
  const tileRotated = rotateQuarterTurns(
    positioned,
    (4 - normalizeQuarterTurns(geometry.orientationQuarterTurns)) % 4
  );
  return {
    x: tileRotated.x + geometry.translation.x,
    y: tileRotated.y + geometry.translation.y,
    z: tileRotated.z + geometry.translation.z
  };
}

function expectedTileTranslation(tile: SceneTile, unitsPerTile: number): Vector3 {
  return {
    x: (tile.col + 0.5) * unitsPerTile,
    y: (tile.row + 0.5) * unitsPerTile,
    z: (tile.height ?? 0) * unitsPerTile
  };
}

function vectorsEqual(left: Vector3, right: Vector3): boolean {
  return (
    Math.abs(left.x - right.x) <= TRANSFORM_EPSILON &&
    Math.abs(left.y - right.y) <= TRANSFORM_EPSILON &&
    Math.abs(left.z - right.z) <= TRANSFORM_EPSILON
  );
}

function admitTileWokGeometry(
  input: BuildAreaTileConnectivityDiagnosticsInput,
  diagnostics: AreaTileConnectivityDiagnostic[]
): ReadonlyMap<string, TileWokAdmission> {
  const collision = input.collision;
  const admissions = new Map<string, TileWokAdmission>();
  if (!collision || collision.status !== "ready") {
    return admissions;
  }
  if (
    collision.resources.length > MAX_WOK_RESOURCES ||
    collision.instances.length > MAX_WOK_INSTANCES
  ) {
    diagnostics.push({
      code: "AREA_TILE_WOK_RESOURCE_INVALID",
      severity: "error",
      message: "The Area WOK collision contract exceeds the bounded diagnostic budget."
    });
    return admissions;
  }

  const resources = new Map<string, readonly ParsedWalkmeshNode[]>();
  const invalidResourceIds = new Set<string>();
  for (const resource of collision.resources) {
    if (resources.has(resource.resourceId) || invalidResourceIds.has(resource.resourceId)) {
      invalidResourceIds.add(resource.resourceId);
      resources.delete(resource.resourceId);
      continue;
    }
    const nodes = parseWalkmesh(resource.walkmesh);
    if (!nodes) {
      invalidResourceIds.add(resource.resourceId);
      continue;
    }
    resources.set(resource.resourceId, nodes);
  }

  const instancesByTileId = new Map<string, typeof collision.instances>();
  for (const instance of collision.instances) {
    const entries = instancesByTileId.get(instance.instanceId) ?? [];
    entries.push(instance);
    instancesByTileId.set(instance.instanceId, entries);
  }

  for (const tile of input.tiles) {
    const instances = instancesByTileId.get(tile.id) ?? [];
    if (instances.length !== 1) {
      diagnostics.push({
        code: instances.length === 0
          ? "AREA_TILE_WOK_INSTANCE_MISSING"
          : "AREA_TILE_WOK_INSTANCE_DUPLICATE",
        severity: "warning",
        message: instances.length === 0
          ? `Tile ${tile.id} has no exact WOK collision instance.`
          : `Tile ${tile.id} has more than one WOK collision instance.`,
        tileId: tile.id
      });
      admissions.set(tile.id, {
        status: "invalid",
        reason: "tile-instance-provenance-invalid"
      });
      continue;
    }
    const instance = instances[0]!;
    const expectedTranslation = expectedTileTranslation(tile, collision.unitsPerTile);
    if (
      !vectorsEqual(instance.translation, expectedTranslation) ||
      normalizeQuarterTurns(instance.orientationQuarterTurns) !== tile.orientation
    ) {
      diagnostics.push({
        code: "AREA_TILE_WOK_INSTANCE_TRANSFORM_MISMATCH",
        severity: "error",
        message: `Tile ${tile.id} WOK transform does not match its exact grid/orientation provenance.`,
        tileId: tile.id
      });
      admissions.set(tile.id, {
        status: "invalid",
        reason: "tile-instance-provenance-invalid"
      });
      continue;
    }
    const nodes = resources.get(instance.resourceId);
    if (!nodes || invalidResourceIds.has(instance.resourceId)) {
      diagnostics.push({
        code: "AREA_TILE_WOK_RESOURCE_INVALID",
        severity: "error",
        message: `Tile ${tile.id} references an invalid or ambiguous WOK resource.`,
        tileId: tile.id
      });
      admissions.set(tile.id, {
        status: "invalid",
        reason: "walkmesh-resource-invalid"
      });
      continue;
    }
    admissions.set(tile.id, {
      status: "ready",
      geometry: {
        nodes,
        translation: instance.translation,
        orientationQuarterTurns: instance.orientationQuarterTurns
      }
    });
  }
  return admissions;
}

function collectBoundarySegments(
  geometry: TileWokGeometry,
  direction: "right" | "bottom" | "left" | "top",
  boundaryCoordinate: number,
  tolerance: number
): BoundarySegment[] {
  const useX = direction === "right" || direction === "left";
  const result: BoundarySegment[] = [];
  for (const node of geometry.nodes) {
    const vertices = node.vertices.map((vertex) => transformVertex(vertex, node, geometry));
    for (const face of node.faces) {
      for (const [firstIndex, secondIndex] of [
        [face[0], face[1]],
        [face[1], face[2]],
        [face[2], face[0]]
      ] as const) {
        const first = vertices[firstIndex]!;
        const second = vertices[secondIndex]!;
        const firstPlane = useX ? first.x : first.y;
        const secondPlane = useX ? second.x : second.y;
        if (
          Math.abs(firstPlane - boundaryCoordinate) > tolerance ||
          Math.abs(secondPlane - boundaryCoordinate) > tolerance
        ) {
          continue;
        }
        const firstAlong = useX ? first.y : first.x;
        const secondAlong = useX ? second.y : second.x;
        if (Math.abs(firstAlong - secondAlong) <= tolerance) {
          continue;
        }
        result.push({
          firstAlong,
          firstHeight: first.z,
          secondAlong,
          secondHeight: second.z
        });
      }
    }
  }
  return result;
}

function heightAt(segment: BoundarySegment, along: number): number {
  const denominator = segment.secondAlong - segment.firstAlong;
  const ratio = (along - segment.firstAlong) / denominator;
  return segment.firstHeight + (segment.secondHeight - segment.firstHeight) * ratio;
}

function segmentsHaveGeometricContact(
  first: BoundarySegment,
  second: BoundarySegment,
  tolerance: number
): boolean {
  const overlapStart = Math.max(
    Math.min(first.firstAlong, first.secondAlong),
    Math.min(second.firstAlong, second.secondAlong)
  );
  const overlapEnd = Math.min(
    Math.max(first.firstAlong, first.secondAlong),
    Math.max(second.firstAlong, second.secondAlong)
  );
  if (overlapEnd - overlapStart <= tolerance) {
    return false;
  }
  return (
    Math.abs(heightAt(first, overlapStart) - heightAt(second, overlapStart)) <= tolerance &&
    Math.abs(heightAt(first, overlapEnd) - heightAt(second, overlapEnd)) <= tolerance
  );
}

function pathMetadataStatus(
  first: SceneTile,
  second: SceneTile
): AreaTilePathMetadataStatus {
  const firstPresent = typeof first.pathNode === "string" && first.pathNode.length > 0;
  const secondPresent = typeof second.pathNode === "string" && second.pathNode.length > 0;
  return firstPresent && secondPresent
    ? "present-both"
    : firstPresent
      ? "present-first-only"
      : secondPresent
        ? "present-second-only"
        : "missing-both";
}

function classifyWokSeam(
  input: BuildAreaTileConnectivityDiagnosticsInput,
  first: SceneTile,
  second: SceneTile,
  direction: "right" | "bottom",
  admissions: ReadonlyMap<string, TileWokAdmission>
): Pick<
  AreaTileConnectivitySeamDiagnostic,
  "wokGeometricStatus" | "wokReason" | "firstBoundarySegmentCount" | "secondBoundarySegmentCount"
> {
  if (!input.collision) {
    return {
      wokGeometricStatus: "unresolved",
      wokReason: "collision-contract-missing",
      firstBoundarySegmentCount: 0,
      secondBoundarySegmentCount: 0
    };
  }
  if (input.collision.status !== "ready") {
    return {
      wokGeometricStatus: "unresolved",
      wokReason: "collision-contract-not-ready",
      firstBoundarySegmentCount: 0,
      secondBoundarySegmentCount: 0
    };
  }
  const firstAdmission = admissions.get(first.id);
  const secondAdmission = admissions.get(second.id);
  if (firstAdmission?.status !== "ready" || secondAdmission?.status !== "ready") {
    return {
      wokGeometricStatus: "unresolved",
      wokReason:
        firstAdmission?.status === "invalid"
          ? firstAdmission.reason
          : secondAdmission?.status === "invalid"
            ? secondAdmission.reason
            : "walkmesh-resource-invalid",
      firstBoundarySegmentCount: 0,
      secondBoundarySegmentCount: 0
    };
  }

  const unitsPerTile = input.collision.unitsPerTile;
  const tolerance = unitsPerTile * 1e-5;
  const boundaryCoordinate = direction === "right"
    ? (first.col + 1) * unitsPerTile
    : (first.row + 1) * unitsPerTile;
  const firstSegments = collectBoundarySegments(
    firstAdmission.geometry,
    direction,
    boundaryCoordinate,
    tolerance
  );
  const secondSegments = collectBoundarySegments(
    secondAdmission.geometry,
    direction === "right" ? "left" : "top",
    boundaryCoordinate,
    tolerance
  );
  const contact = firstSegments.some((firstSegment) =>
    secondSegments.some((secondSegment) =>
      segmentsHaveGeometricContact(firstSegment, secondSegment, tolerance)
    )
  );
  if (contact) {
    return {
      wokGeometricStatus: "contact",
      wokReason: "source-backed-boundary-overlap",
      firstBoundarySegmentCount: firstSegments.length,
      secondBoundarySegmentCount: secondSegments.length
    };
  }
  const reason: AreaTileWokReason = firstSegments.length === 0 && secondSegments.length === 0
    ? "boundary-geometry-absent-both"
    : firstSegments.length === 0
      ? "boundary-geometry-absent-first"
      : secondSegments.length === 0
        ? "boundary-geometry-absent-second"
        : "boundary-geometry-discontinuous";
  return {
    wokGeometricStatus: "discontinuous",
    wokReason: reason,
    firstBoundarySegmentCount: firstSegments.length,
    secondBoundarySegmentCount: secondSegments.length
  };
}

function countGeometricContactComponents(
  tileIds: readonly string[],
  seams: readonly AreaTileConnectivitySeamDiagnostic[]
): number {
  const parent = new Map<string, string>();
  const find = (tileId: string): string => {
    const current = parent.get(tileId) ?? tileId;
    if (current === tileId) return current;
    const root = find(current);
    parent.set(tileId, root);
    return root;
  };
  const join = (first: string, second: string): void => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    parent.set(secondRoot, firstRoot);
  };
  seams
    .filter((seam) => seam.wokGeometricStatus === "contact")
    .forEach((seam) => join(seam.firstTileId, seam.secondTileId));
  return new Set(tileIds.map(find)).size;
}

/**
 * Produces source-WOK debug lines only.  The result deliberately carries no
 * walkability, PathConnect, or NWN traversability verdict.
 */
export function buildAreaTileWalkmeshOverlaySegments(
  collision: AuroraAreaVfxCollisionContract | undefined
): AreaTileWalkmeshOverlaySegments {
  if (
    !collision ||
    collision.status !== "ready" ||
    collision.resources.length > MAX_WOK_RESOURCES ||
    collision.instances.length > MAX_WOK_INSTANCES
  ) {
    return Object.freeze({
      version: "aurora-area-tile-wok-overlay/v1",
      status: "unavailable",
      instanceCount: 0,
      segmentCount: 0,
      truncated: false,
      segments: Object.freeze([])
    });
  }

  const resources = new Map<string, readonly ParsedWalkmeshNode[]>();
  const invalidResourceIds = new Set<string>();
  for (const resource of collision.resources) {
    if (resources.has(resource.resourceId) || invalidResourceIds.has(resource.resourceId)) {
      resources.delete(resource.resourceId);
      invalidResourceIds.add(resource.resourceId);
      continue;
    }
    const nodes = parseWalkmesh(resource.walkmesh);
    if (!nodes) {
      invalidResourceIds.add(resource.resourceId);
      continue;
    }
    resources.set(resource.resourceId, nodes);
  }

  const segments: AreaTileWalkmeshOverlaySegment[] = [];
  let acceptedInstanceCount = 0;
  let skippedInstanceCount = 0;
  let truncated = false;
  for (const instance of collision.instances) {
    const nodes = resources.get(instance.resourceId);
    if (
      !nodes ||
      invalidResourceIds.has(instance.resourceId) ||
      !readVector3(instance.translation) ||
      !Number.isInteger(instance.orientationQuarterTurns)
    ) {
      skippedInstanceCount += 1;
      continue;
    }
    acceptedInstanceCount += 1;
    const geometry: TileWokGeometry = {
      nodes,
      translation: instance.translation,
      orientationQuarterTurns: instance.orientationQuarterTurns
    };
    for (const node of nodes) {
      const vertices = node.vertices.map((vertex) => transformVertex(vertex, node, geometry));
      for (const face of node.faces) {
        for (const [firstIndex, secondIndex] of [
          [face[0], face[1]],
          [face[1], face[2]],
          [face[2], face[0]]
        ] as const) {
          if (segments.length >= MAX_WOK_OVERLAY_SEGMENTS) {
            truncated = true;
            break;
          }
          segments.push({
            tileId: instance.instanceId,
            first: vertices[firstIndex]!,
            second: vertices[secondIndex]!
          });
        }
        if (truncated) break;
      }
      if (truncated) break;
    }
    if (truncated) break;
  }

  return Object.freeze({
    version: "aurora-area-tile-wok-overlay/v1",
    status:
      acceptedInstanceCount === 0
        ? "unavailable"
        : skippedInstanceCount > 0 || truncated
          ? "partial"
          : "ready",
    instanceCount: acceptedInstanceCount,
    segmentCount: segments.length,
    truncated,
    segments: Object.freeze(segments)
  });
}

export function buildAreaTileConnectivityDiagnostics(
  input: BuildAreaTileConnectivityDiagnosticsInput
): AreaTileConnectivityDiagnostics {
  const diagnostics: AreaTileConnectivityDiagnostic[] = [
    {
      code: "AREA_TILE_PATH_CONNECT_NATIVE_EVIDENCE_MISSING",
      severity: "warning",
      message:
        "Native PathConnect is not recovered; PathNode metadata and WOK geometry are reported independently and never promoted to traversability."
    }
  ];
  const validWidth = Number.isInteger(input.width) && input.width > 0;
  const validHeight = Number.isInteger(input.height) && input.height > 0;
  const width = validWidth ? input.width : 0;
  const height = validHeight ? input.height : 0;
  const expectedTileCount = width * height;
  const tileByCell = new Map<string, SceneTile>();
  for (const tile of input.tiles) {
    const key = `${tile.row}:${tile.col}`;
    tileByCell.set(key, tile);
  }
  const hasEveryExpectedCell = Array.from(
    { length: height },
    (_, row) => Array.from({ length: width }, (_, col) => `${row}:${col}`)
  ).flat().every((key) => tileByCell.has(key));
  const hasUniqueTileIds = new Set(input.tiles.map((tile) => tile.id)).size === input.tiles.length;
  const gridIsDense =
    validWidth &&
    validHeight &&
    input.tiles.length === expectedTileCount &&
    hasEveryExpectedCell &&
    hasUniqueTileIds;
  if (!gridIsDense) {
    diagnostics.push({
      code: "AREA_TILE_GRID_INCOMPLETE",
      severity: "error",
      message: `Connectivity diagnostics require one dense ${width}x${height} tile grid.`
    });
  }

  const admissions = admitTileWokGeometry(input, diagnostics);
  const seams: AreaTileConnectivitySeamDiagnostic[] = [];
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const first = tileByCell.get(`${row}:${col}`);
      if (!first) continue;
      for (const direction of ["right", "bottom"] as const) {
        const second = direction === "right"
          ? tileByCell.get(`${row}:${col + 1}`)
          : tileByCell.get(`${row + 1}:${col}`);
        if (!second) continue;
        const seamId = `${first.id}:${second.id}`;
        const wok = classifyWokSeam(input, first, second, direction, admissions);
        const seam: AreaTileConnectivitySeamDiagnostic = {
          seamId,
          firstTileId: first.id,
          secondTileId: second.id,
          direction,
          pathMetadataStatus: pathMetadataStatus(first, second),
          pathConnectStatus: "missing",
          ...wok
        };
        seams.push(seam);
        if (seam.wokGeometricStatus === "discontinuous") {
          diagnostics.push({
            code: "AREA_TILE_WOK_GEOMETRIC_DISCONTINUITY",
            severity: "warning",
            message: `Tiles ${first.id} and ${second.id} have no source-backed geometric WOK boundary overlap.`,
            seamId
          });
        }
      }
    }
  }

  const tileIds = [...new Set(input.tiles.map((tile) => tile.id))];
  return Object.freeze({
    version: "aurora-area-tile-connectivity-diagnostics/v1",
    evidenceBoundary:
      "set-path-metadata-and-source-wok-geometry-only-no-native-traversability-claim",
    pathConnect: Object.freeze({
      status: "missing" as const,
      evidence: "native-path-connect-not-recovered" as const
    }),
    seams: Object.freeze(seams),
    summary: Object.freeze({
      expectedInternalSeams:
        Math.max(0, width - 1) * height + Math.max(0, height - 1) * width,
      evaluatedInternalSeams: seams.length,
      pathMetadataPresentBothSeams: seams.filter(
        (seam) => seam.pathMetadataStatus === "present-both"
      ).length,
      wokGeometricContactSeams: seams.filter(
        (seam) => seam.wokGeometricStatus === "contact"
      ).length,
      wokDiscontinuousSeams: seams.filter(
        (seam) => seam.wokGeometricStatus === "discontinuous"
      ).length,
      unresolvedSeams: seams.filter(
        (seam) => seam.wokGeometricStatus === "unresolved"
      ).length,
      geometricContactComponents: countGeometricContactComponents(tileIds, seams)
    }),
    diagnostics: Object.freeze(diagnostics)
  });
}
