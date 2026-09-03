export const AREA_OBJECT_POLYGON_COORDINATE_SPACE = "native_local" as const;
export const MIN_AREA_OBJECT_POLYGON_POINTS = 3;
export const MAX_AREA_OBJECT_POLYGON_POINTS = 1024;
export const MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE = 1024;

const GEOMETRY_KEYS = Object.freeze(["coordinateSpace", "points"]);
const POINT_KEYS = Object.freeze(["x", "y", "z"]);
const MUTATION_KEYS = Object.freeze([
  "kind",
  "sourceObjectId",
  "sourceIndex",
  "expectedGeometry",
  "geometry",
]);
const SOURCE_OBJECT_ID_MAX_CODE_UNITS = 256;

export interface AreaObjectPolygonPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface AreaObjectPolygonGeometry {
  readonly coordinateSpace: typeof AREA_OBJECT_POLYGON_COORDINATE_SPACE;
  readonly points: readonly AreaObjectPolygonPoint[];
}

export interface ExistingAreaObjectPolygonMutation {
  readonly kind: "trigger" | "encounter";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly expectedGeometry: AreaObjectPolygonGeometry;
  readonly geometry: AreaObjectPolygonGeometry;
}

export function isAreaObjectPolygonGeometry(
  value: unknown,
): value is AreaObjectPolygonGeometry {
  return readAreaObjectPolygonGeometry(value) !== null;
}

export function readAreaObjectPolygonGeometry(
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
    if (!isExactRecord(candidate, POINT_KEYS)) return null;
    const x = toFiniteFloat32(candidate.x);
    const y = toFiniteFloat32(candidate.y);
    const z = toFiniteFloat32(candidate.z);
    if (x === null || y === null || z === null) return null;
    points.push(Object.freeze({ x, y, z }));
  }
  if (!hasNonZeroSignedXyArea(points)) return null;

  return Object.freeze({
    coordinateSpace: AREA_OBJECT_POLYGON_COORDINATE_SPACE,
    points: Object.freeze(points),
  });
}

export function areaObjectPolygonGeometriesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readAreaObjectPolygonGeometry(left);
  const admittedRight = readAreaObjectPolygonGeometry(right);
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

export function readExistingAreaObjectPolygonMutation(
  value: unknown,
): ExistingAreaObjectPolygonMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  if (value.kind !== "trigger" && value.kind !== "encounter") return null;
  if (!isSourceObjectId(value.sourceObjectId)) return null;
  if (!Number.isSafeInteger(value.sourceIndex) || Number(value.sourceIndex) < 0) {
    return null;
  }
  const expectedGeometry = readAreaObjectPolygonGeometry(value.expectedGeometry);
  const geometry = readAreaObjectPolygonGeometry(value.geometry);
  if (
    !expectedGeometry
    || !geometry
    || areaObjectPolygonGeometriesEqual(expectedGeometry, geometry)
  ) {
    return null;
  }
  return Object.freeze({
    kind: value.kind,
    sourceObjectId: value.sourceObjectId,
    sourceIndex: Number(value.sourceIndex),
    expectedGeometry,
    geometry,
  });
}

function isSourceObjectId(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= SOURCE_OBJECT_ID_MAX_CODE_UNITS
    && !value.includes("\0");
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
