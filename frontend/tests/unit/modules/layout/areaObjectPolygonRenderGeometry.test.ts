import { describe, expect, it } from "vitest";

import { resolveAreaObjectPolygonRenderOffsets } from "../../../../src/modules/layout/application/areaObjectPolygonRenderGeometry";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

describe("Area object polygon render geometry", () => {
  it("projects native-local XY/Z into closed Three local X/Z/Y offsets", () => {
    const object = polygonObject("triggers", polygon([
      [-10, -5, 2.5], [20, -5, 5], [0, 15, 7.5],
    ]));

    expect(resolveAreaObjectPolygonRenderOffsets(object)).toEqual([
      { x: -1, y: 0.25, z: 0.5 },
      { x: 2, y: 0.5, z: 0.5 },
      { x: 0, y: 0.75, z: -1.5 },
      { x: -1, y: 0.25, z: 0.5 },
    ]);
  });

  it("falls back to exact source provenance when the editable target is absent", () => {
    const source = polygon([[0, 0, 0], [10, 0, 0], [0, 10, 0]]);
    const object = polygonObject("encounters", undefined, source);
    expect(resolveAreaObjectPolygonRenderOffsets(object)).toEqual([
      { x: 0, y: 0, z: -0 },
      { x: 1, y: 0, z: -0 },
      { x: 0, y: 0, z: -1 },
      { x: 0, y: 0, z: -0 },
    ]);
  });

  it("omits malformed, unsupported and non-provenant geometry", () => {
    const valid = polygon([[0, 0, 0], [10, 0, 0], [0, 10, 0]]);
    expect(resolveAreaObjectPolygonRenderOffsets({
      ...polygonObject("triggers", valid),
      kind: "placeables",
    })).toBeNull();
    expect(resolveAreaObjectPolygonRenderOffsets({
      ...polygonObject("triggers", valid),
      source: undefined,
    })).toBeNull();
    expect(resolveAreaObjectPolygonRenderOffsets({
      ...polygonObject("triggers", valid),
      polygonGeometry: { coordinateSpace: "native_local", points: [] },
    } as SceneObject)).toBeNull();
  });
});

function polygonObject(
  kind: "triggers" | "encounters",
  target?: ReturnType<typeof polygon>,
  sourceGeometry = target,
): SceneObject {
  const sourceKind = kind === "triggers" ? "trigger" : "encounter";
  return {
    id: `${sourceKind}-0`,
    kind,
    resRef: sourceKind,
    tag: sourceKind.toUpperCase(),
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
    },
    source: {
      type: "aurora_git",
      sourceKind,
      sourceIndex: 0,
      sourceObjectId: `${sourceKind}:0`,
      polygonGeometry: sourceGeometry,
    },
    ...(target ? { polygonGeometry: target } : {}),
  };
}

function polygon(points: ReadonlyArray<readonly [number, number, number]>) {
  return {
    coordinateSpace: "native_local" as const,
    points: points.map(([x, y, z]) => ({ x, y, z })),
  };
}
