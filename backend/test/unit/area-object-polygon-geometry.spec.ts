import {
  MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE,
  MAX_AREA_OBJECT_POLYGON_POINTS,
  areaObjectPolygonGeometriesEqual,
  isAreaObjectPolygonGeometry,
  readAreaObjectPolygonGeometry,
  readExistingAreaObjectPolygonMutation,
} from "../../src/modules/areas/domain/area-object-polygon-geometry";

const triangle = () => ({
  coordinateSpace: "native_local" as const,
  points: [
    { x: -0.25, y: -0.5, z: Math.fround(0.025) },
    { x: 4.75, y: -0.5, z: Math.fround(0.025) },
    { x: 0.25, y: 3.5, z: Math.fround(0.025) },
  ],
});

describe("Existing Area Trigger/Encounter polygon geometry", () => {
  it("freezes one exact ordered native-local float32 geometry", () => {
    const parsed = readAreaObjectPolygonGeometry(triangle());

    expect(parsed).toEqual(triangle());
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed?.points)).toBe(true);
    expect(parsed?.points.every(Object.isFrozen)).toBe(true);
    expect(MAX_AREA_OBJECT_POLYGON_POINTS).toBe(1024);
    expect(MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE).toBe(1024);
  });

  it("projects target coordinates to deterministic finite float32", () => {
    const parsed = readAreaObjectPolygonGeometry({
      ...triangle(),
      points: triangle().points.map((point, index) => ({
        ...point,
        x: point.x + index * 0.1,
      })),
    });

    expect(parsed?.points[1]?.x).toBe(Math.fround(4.85));
    expect(parsed?.points[1]?.x).not.toBe(4.85);
  });

  it.each([
    ["missing member", { points: triangle().points }],
    ["wrong coordinate space", { ...triangle(), coordinateSpace: "scene_tile" }],
    ["unknown geometry member", { ...triangle(), closed: true }],
    ["too few points", { ...triangle(), points: triangle().points.slice(0, 2) }],
    [
      "too many points",
      {
        ...triangle(),
        points: Array.from({ length: MAX_AREA_OBJECT_POLYGON_POINTS + 1 }, (_, index) => ({
          x: index,
          y: index % 2,
          z: 0,
        })),
      },
    ],
    ["missing point member", { ...triangle(), points: [{ x: 0, y: 0 }, ...triangle().points.slice(1) ] }],
    ["unknown point member", { ...triangle(), points: [{ x: 0, y: 0, z: 0, id: 1 }, ...triangle().points.slice(1) ] }],
    ["non-number", { ...triangle(), points: [{ x: "0", y: 0, z: 0 }, ...triangle().points.slice(1) ] }],
    ["non-finite", { ...triangle(), points: [{ x: Number.POSITIVE_INFINITY, y: 0, z: 0 }, ...triangle().points.slice(1) ] }],
    ["float32 overflow", { ...triangle(), points: [{ x: Number.MAX_VALUE, y: 0, z: 0 }, ...triangle().points.slice(1) ] }],
    ["zero XY area", { ...triangle(), points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 2, z: 0 }] }],
  ])("rejects %s", (_label, value) => {
    expect(isAreaObjectPolygonGeometry(value)).toBe(false);
    expect(readAreaObjectPolygonGeometry(value)).toBeNull();
  });

  it("compares every float32 point in order", () => {
    expect(areaObjectPolygonGeometriesEqual(triangle(), triangle())).toBe(true);
    expect(areaObjectPolygonGeometriesEqual(triangle(), {
      ...triangle(),
      points: [...triangle().points].reverse(),
    })).toBe(false);
    expect(areaObjectPolygonGeometriesEqual(triangle(), {
      ...triangle(),
      points: triangle().points.map((point, index) => index === 1
        ? { ...point, z: Math.fround(point.z + 1) }
        : point),
    })).toBe(false);
  });

  it.each(["trigger", "encounter"] as const)(
    "reads and freezes a complete changed %s CAS mutation",
    (kind) => {
      const target = {
        ...triangle(),
        points: triangle().points.map((point, index) => index === 1
          ? { ...point, x: Math.fround(point.x + 1) }
          : point),
      };
      const mutation = readExistingAreaObjectPolygonMutation({
        kind,
        sourceObjectId: `${kind}-source-0`,
        sourceIndex: 0,
        expectedGeometry: triangle(),
        geometry: target,
      });

      expect(mutation).toEqual({
        kind,
        sourceObjectId: `${kind}-source-0`,
        sourceIndex: 0,
        expectedGeometry: triangle(),
        geometry: target,
      });
      expect(Object.isFrozen(mutation)).toBe(true);
      expect(Object.isFrozen(mutation?.expectedGeometry)).toBe(true);
      expect(Object.isFrozen(mutation?.geometry)).toBe(true);
    },
  );

  it.each([
    ["wrong family", { kind: "door", sourceObjectId: "x", sourceIndex: 0, expectedGeometry: triangle(), geometry: { ...triangle(), points: triangle().points.map((point, index) => index === 0 ? { ...point, x: point.x - 1 } : point) } }],
    ["empty identity", { kind: "trigger", sourceObjectId: "", sourceIndex: 0, expectedGeometry: triangle(), geometry: { ...triangle(), points: triangle().points.map((point, index) => index === 0 ? { ...point, x: point.x - 1 } : point) } }],
    ["fractional ordinal", { kind: "trigger", sourceObjectId: "x", sourceIndex: 0.5, expectedGeometry: triangle(), geometry: { ...triangle(), points: triangle().points.map((point, index) => index === 0 ? { ...point, x: point.x - 1 } : point) } }],
    ["unknown mutation member", { kind: "trigger", sourceObjectId: "x", sourceIndex: 0, expectedGeometry: triangle(), geometry: { ...triangle(), points: triangle().points.map((point, index) => index === 0 ? { ...point, x: point.x - 1 } : point) }, mode: "replace" }],
    ["unchanged pair", { kind: "encounter", sourceObjectId: "x", sourceIndex: 0, expectedGeometry: triangle(), geometry: triangle() }],
  ])("rejects a mutation with %s", (_label, value) => {
    expect(readExistingAreaObjectPolygonMutation(value)).toBeNull();
  });
});
