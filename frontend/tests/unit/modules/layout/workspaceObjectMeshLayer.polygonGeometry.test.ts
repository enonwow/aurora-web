import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  AREA_OBJECT_POLYGON_GUIDE_ROLE,
  createAreaObjectPolygonGuide,
} from "../../../../src/modules/layout/adapters/three/workspaceObjectMeshLayer";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

describe("workspaceObjectMeshLayer polygon geometry", () => {
  it("creates one closed non-raycast world-space guide from exact native-local geometry", () => {
    const guide = createAreaObjectPolygonGuide(
      polygonObject(),
      { x: 3, y: 0.02, z: 7 },
      true,
    );

    expect(guide).toBeInstanceOf(THREE.Line);
    expect(guide?.userData).toMatchObject({
      role: AREA_OBJECT_POLYGON_GUIDE_ROLE,
      objectId: "trigger-0",
      objectKind: "triggers",
      coordinateSpace: "native_local",
      pointCount: 3,
    });
    const position = guide!.geometry.getAttribute("position");
    const liftedY = Math.fround(0.02);
    expect(Array.from(position.array)).toEqual([
      3, liftedY, 7,
      4, liftedY, 7,
      3, liftedY, 6,
      3, liftedY, 7,
    ]);
    const intersections: THREE.Intersection[] = [];
    guide!.raycast(new THREE.Raycaster(), intersections);
    expect(intersections).toEqual([]);
  });

  it("returns null when provenance or geometry is not renderable", () => {
    expect(createAreaObjectPolygonGuide(
      { ...polygonObject(), source: undefined },
      { x: 0, y: 0, z: 0 },
      false,
    )).toBeNull();
  });
});

function polygonObject(): SceneObject {
  const geometry = {
    coordinateSpace: "native_local" as const,
    points: [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 0, y: 10, z: 0 },
    ],
  };
  return {
    id: "trigger-0",
    kind: "triggers",
    resRef: "newgeneric",
    tag: "TRIGGER",
    x: 3,
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
      sourceKind: "trigger",
      sourceIndex: 0,
      sourceObjectId: "trigger:0",
      polygonGeometry: geometry,
    },
    polygonGeometry: geometry,
  };
}
