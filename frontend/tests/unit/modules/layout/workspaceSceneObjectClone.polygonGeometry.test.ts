import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

describe("cloneSceneObject polygon geometry", () => {
  it("independently clones immutable Waypoint Tag provenance for history snapshots", () => {
    const object: SceneObject = {
      id: "waypoint-0",
      kind: "waypoints",
      resRef: "nw_waypoint001",
      tag: "  PATROL_POINT_01  ",
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
        sourceKind: "waypoint",
        sourceIndex: 0,
        sourceObjectId: "waypoint:0",
        waypointTag: { present: true, value: "NW_WAYPOINT001" },
        waypointLocalizedNameStorage: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
        },
        waypointDescriptionStorage: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIHJvdXRl" }],
        },
        waypointEditorComment: " source note ",
      },
      waypointEditorComment: " target note ",
    };

    const cloned = cloneSceneObject(object);

    expect(cloned.source?.waypointTag).toEqual({
      present: true,
      value: "NW_WAYPOINT001",
    });
    expect(cloned.source?.waypointTag).not.toBe(object.source?.waypointTag);
    expect(cloned.source?.waypointLocalizedNameStorage)
      .toEqual(object.source?.waypointLocalizedNameStorage);
    expect(cloned.source?.waypointLocalizedNameStorage)
      .not.toBe(object.source?.waypointLocalizedNameStorage);
    expect(cloned.source?.waypointLocalizedNameStorage?.present &&
      cloned.source.waypointLocalizedNameStorage.entries)
      .not.toBe(object.source?.waypointLocalizedNameStorage?.present &&
        object.source.waypointLocalizedNameStorage.entries);
    expect(cloned.source?.waypointDescriptionStorage)
      .toEqual(object.source?.waypointDescriptionStorage);
    expect(cloned.source?.waypointDescriptionStorage)
      .not.toBe(object.source?.waypointDescriptionStorage);
    expect(cloned.source?.waypointDescriptionStorage?.present &&
      cloned.source.waypointDescriptionStorage.entries)
      .not.toBe(object.source?.waypointDescriptionStorage?.present &&
        object.source.waypointDescriptionStorage.entries);
    expect(cloned.source?.waypointEditorComment).toBe(" source note ");
    expect(cloned.waypointEditorComment).toBe(" target note ");
  });

  it.each(["triggers", "encounters"] as const)(
    "independently clones immutable and editable %s polygons for history snapshots",
    (kind) => {
      const sourceGeometry = polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]);
      const targetGeometry = polygon([[-1, 0, 0], [4, 0, 0], [0, 3, 0.5]]);
      const object = polygonObject(kind, sourceGeometry, targetGeometry);
      if (kind === "triggers" && object.source) {
        object.source.triggerTag = { present: true, value: "GenericTrigger" };
      } else if (kind === "encounters" && object.source) {
        object.source.encounterTag = { present: true, value: "X2_GNOLL001" };
      }

      const cloned = cloneSceneObject(object);

      expect(cloned.source?.polygonGeometry).toEqual(sourceGeometry);
      expect(cloned.source?.polygonGeometry).not.toBe(sourceGeometry);
      expect(cloned.source?.polygonGeometry?.points).not.toBe(sourceGeometry.points);
      expect(cloned.polygonGeometry).toEqual(targetGeometry);
      expect(cloned.polygonGeometry).not.toBe(targetGeometry);
      expect(cloned.polygonGeometry?.points).not.toBe(targetGeometry.points);
      if (kind === "triggers") {
        expect(cloned.source?.triggerTag).toEqual({
          present: true,
          value: "GenericTrigger",
        });
        expect(cloned.source?.triggerTag).not.toBe(object.source?.triggerTag);
      } else {
        expect(cloned.source?.encounterTag).toEqual({
          present: true,
          value: "X2_GNOLL001",
        });
        expect(cloned.source?.encounterTag).not.toBe(object.source?.encounterTag);
      }
    },
  );

  it("does not activate the strict polygon contract on non-polygon snapshots", () => {
    const object = polygonObject("triggers", polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]), polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]));
    const nonPolygon: SceneObject = {
      ...object,
      kind: "placeables",
      source: {
        type: "aurora_git",
        sourceKind: "placeable",
        sourceIndex: 0,
        sourceObjectId: "placeable:0",
      },
      polygonGeometry: undefined,
    };

    const cloned = cloneSceneObject(nonPolygon);

    expect(Object.prototype.hasOwnProperty.call(cloned, "polygonGeometry")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(cloned.source, "polygonGeometry")).toBe(false);
  });
});

function polygonObject(
  kind: "triggers" | "encounters",
  sourceGeometry: NonNullable<SceneObject["polygonGeometry"]>,
  targetGeometry: NonNullable<SceneObject["polygonGeometry"]>,
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
    polygonGeometry: targetGeometry,
  };
}

function polygon(points: ReadonlyArray<readonly [number, number, number]>) {
  return {
    coordinateSpace: "native_local" as const,
    points: points.map(([x, y, z]) => ({ x, y, z })),
  };
}
