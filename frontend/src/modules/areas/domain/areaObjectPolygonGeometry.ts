export const AREA_OBJECT_POLYGON_COORDINATE_SPACE = "native_local" as const;
export const MIN_AREA_OBJECT_POLYGON_POINTS = 3;
export const MAX_AREA_OBJECT_POLYGON_POINTS = 1024;
export const AURORA_NATIVE_UNITS_PER_SCENE_TILE = 10;

const GEOMETRY_KEYS = Object.freeze(["coordinateSpace", "points"]);
const POINT_KEYS = Object.freeze(["x", "y", "z"]);

export interface AreaObjectPolygonPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface AreaObjectPolygonGeometry {
  readonly coordinateSpace: typeof AREA_OBJECT_POLYGON_COORDINATE_SPACE;
  readonly points: readonly AreaObjectPolygonPoint[];
}

export function isAreaObjectPolygonGeometry(
  value: unknown,
): value is AreaObjectPolygonGeometry {
  return tryCloneAreaObjectPolygonGeometry(value) !== null;
}

export function cloneAreaObjectPolygonGeometry(
  value: unknown,
): AreaObjectPolygonGeometry {
  const geometry = tryCloneAreaObjectPolygonGeometry(value);
  if (!geometry) {
    throw new Error("Area object polygon geometry is invalid.");
  }
  return geometry;
}

export function areaObjectPolygonGeometriesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = tryCloneAreaObjectPolygonGeometry(left);
  const admittedRight = tryCloneAreaObjectPolygonGeometry(right);
  if (!admittedLeft || !admittedRight) return false;
  return admittedLeft.points.length === admittedRight.points.length
    && admittedLeft.points.every((point, index) => {
      const candidate = admittedRight.points[index];
      return candidate !== undefined
        && point.x === candidate.x
        && point.y === candidate.y
        && point.z === candidate.z;
    });
}

export function nativeLocalPolygonPointToSceneOffset(
  value: AreaObjectPolygonPoint,
): AreaObjectPolygonPoint {
  const point = readPoint(value);
  if (!point) throw new Error("Area object polygon point is invalid.");
  return Object.freeze({
    x: point.x / AURORA_NATIVE_UNITS_PER_SCENE_TILE,
    y: point.y / AURORA_NATIVE_UNITS_PER_SCENE_TILE,
    z: point.z / AURORA_NATIVE_UNITS_PER_SCENE_TILE,
  });
}

export function sceneOffsetPolygonPointToNativeLocal(
  value: AreaObjectPolygonPoint,
): AreaObjectPolygonPoint {
  if (!isExactRecord(value, POINT_KEYS)) {
    throw new Error("Area object polygon point is invalid.");
  }
  const x = toFiniteFloat32(Number(value.x) * AURORA_NATIVE_UNITS_PER_SCENE_TILE);
  const y = toFiniteFloat32(Number(value.y) * AURORA_NATIVE_UNITS_PER_SCENE_TILE);
  const z = toFiniteFloat32(Number(value.z) * AURORA_NATIVE_UNITS_PER_SCENE_TILE);
  if (x === null || y === null || z === null) {
    throw new Error("Area object polygon point is invalid.");
  }
  return Object.freeze({ x, y, z });
}

function tryCloneAreaObjectPolygonGeometry(
  value: unknown,
): AreaObjectPolygonGeometry | null {
  if (!isExactRecord(value, GEOMETRY_KEYS)) return null;
  if (value.coordinateSpace !== AREA_OBJECT_POLYGON_COORDINATE_SPACE) return null;
  if (
    !Array.isArray(value.points)
    || value.points.length < MIN_AREA_OBJECT_POLYGON_POINTS
    || value.points.length > MAX_AREA_OBJECT_POLYGON_POINTS
  ) {
    return null;
  }
  const points: AreaObjectPolygonPoint[] = [];
  for (const candidate of value.points) {
    const point = readPoint(candidate);
    if (!point) return null;
    points.push(point);
  }
  if (!hasNonZeroSignedXyArea(points)) return null;
  return Object.freeze({
    coordinateSpace: AREA_OBJECT_POLYGON_COORDINATE_SPACE,
    points: Object.freeze(points),
  });
}

function readPoint(value: unknown): AreaObjectPolygonPoint | null {
  if (!isExactRecord(value, POINT_KEYS)) return null;
  const x = toFiniteFloat32(value.x);
  const y = toFiniteFloat32(value.y);
  const z = toFiniteFloat32(value.z);
  return x === null || y === null || z === null
    ? null
    : Object.freeze({ x, y, z });
}

function toFiniteFloat32(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const projected = Math.fround(value);
  return Number.isFinite(projected) ? projected : null;
}

function hasNonZeroSignedXyArea(points: readonly AreaObjectPolygonPoint[]): boolean {
  let doubledArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!current || !next) return false;
    doubledArea += current.x * next.y - next.x * current.y;
  }
  return Number.isFinite(doubledArea) && doubledArea !== 0;
}

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
