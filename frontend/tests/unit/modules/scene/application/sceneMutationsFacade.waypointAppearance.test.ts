import { describe, expect, it } from "vitest";

import { createSceneMutationsFacade } from
  "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createNewSceneObject, createSeedAreaScene } from
  "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade existing Waypoint Appearance", () => {
  it("changes one bounded Byte target and preserves immutable table provenance", () => {
    const waypoint = retainedWaypoint();
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };

    const next = createSceneMutationsFacade().setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { appearance: 4 },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.waypointAppearance).toBe(4);
    expect(next.objects[0]?.source).toBe(waypoint.source);
    expect(next.objects[0]?.source?.waypointAppearance)
      .toBe(waypoint.source.waypointAppearance);
  });

  it("fails closed for out-of-range targets and missing exact provenance", () => {
    const waypoint = retainedWaypoint();
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };
    const facade = createSceneMutationsFacade();
    expect(facade.setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { appearance: 5 },
    )).toBe(scene);
    delete waypoint.source?.waypointAppearance;
    const unsupported = { ...scene, objects: [waypoint] };
    expect(facade.setExistingWaypointPropertiesById(
      unsupported,
      waypoint.id,
      { appearance: 4 },
    )).toBe(unsupported);
  });
});

function retainedWaypoint() {
  const waypoint = createNewSceneObject("waypoints", 1, 2, 1);
  waypoint.id = "waypoint-0";
  waypoint.waypointAppearance = 1;
  waypoint.source = {
    type: "aurora_git",
    sourceKind: "waypoint",
    sourceIndex: 0,
    sourceObjectId: "waypoint:0",
    waypointAppearance: {
      present: true,
      nativeType: "byte",
      value: 1,
      table: {
        resourceName: "waypoint.2da",
        sourceObjectKey: "vanilla:waypoint.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 321,
        rowCount: 5,
        rowIndex: 1,
      },
    },
  };
  return waypoint;
}
