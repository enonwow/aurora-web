import { describe, expect, it } from "vitest";
import {
  MAX_AREA_OBJECT_POLYGON_POINTS,
  areaObjectPolygonGeometriesEqual,
  cloneAreaObjectPolygonGeometry,
  isAreaObjectPolygonGeometry,
  nativeLocalPolygonPointToSceneOffset,
  sceneOffsetPolygonPointToNativeLocal,
} from "../../../../src/modules/areas/domain/areaObjectPolygonGeometry";

const triangle = () => ({
  coordinateSpace: "native_local" as const,
  points: [
    { x: -1, y: -2, z: Math.fround(0.025) },
    { x: 4, y: -2, z: Math.fround(0.025) },
    { x: 1, y: 3, z: Math.fround(0.025) },
  ],
});

describe("Area object polygon geometry", () => {
  it("strictly validates and deep-clones an ordered native-local geometry", () => {
    expect(isAreaObjectPolygonGeometry(triangle())).toBe(true);
    const cloned = cloneAreaObjectPolygonGeometry(triangle());
    expect(cloned).toEqual(triangle());
    expect(cloned).not.toBe(triangle());
    expect(cloned.points).not.toBe(triangle().points);
    expect(Object.isFrozen(cloned)).toBe(true);
    expect(Object.isFrozen(cloned.points)).toBe(true);
    expect(cloned.points.every(Object.isFrozen)).toBe(true);
    expect(MAX_AREA_OBJECT_POLYGON_POINTS).toBe(1024);
  });

  it.each([
    ["wrong coordinate space", { ...triangle(), coordinateSpace: "scene_tile" }],
    ["unknown member", { ...triangle(), implicitClosure: true }],
    ["too few points", { ...triangle(), points: triangle().points.slice(0, 2) }],
    ["too many points", { ...triangle(), points: Array.from({ length: 1025 }, (_, index) => ({ x: index, y: index % 2, z: 0 })) }],
    ["unknown point member", { ...triangle(), points: [{ x: 0, y: 0, z: 0, selected: true }, ...triangle().points.slice(1) ] }],
    ["non-finite point", { ...triangle(), points: [{ x: Number.NaN, y: 0, z: 0 }, ...triangle().points.slice(1) ] }],
    ["float32 overflow", { ...triangle(), points: [{ x: Number.MAX_VALUE, y: 0, z: 0 }, ...triangle().points.slice(1) ] }],
    ["zero-area polygon", { ...triangle(), points: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 2, y: 2, z: 0 }] }],
  ])("rejects %s", (_label, value) => {
    expect(isAreaObjectPolygonGeometry(value)).toBe(false);
    expect(() => cloneAreaObjectPolygonGeometry(value)).toThrow(/polygon geometry/i);
  });

  it("compares every point without rotating or reordering the polygon", () => {
    expect(areaObjectPolygonGeometriesEqual(triangle(), triangle())).toBe(true);
    expect(areaObjectPolygonGeometriesEqual(triangle(), {
      ...triangle(),
      points: [...triangle().points].reverse(),
    })).toBe(false);
  });

  it("converts only at the presentation boundary using ten native units per tile", () => {
    expect(nativeLocalPolygonPointToSceneOffset({ x: 12.5, y: -20, z: 3.125 })).toEqual({
      x: 1.25,
      y: -2,
      z: 0.3125,
    });
    expect(sceneOffsetPolygonPointToNativeLocal({ x: 1.25, y: -2, z: 0.3125 })).toEqual({
      x: Math.fround(12.5),
      y: Math.fround(-20),
      z: Math.fround(3.125),
    });
  });
});
