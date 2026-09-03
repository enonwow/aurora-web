import { describe, expect, it } from "vitest";

import { createSceneMutationsFacade } from
  "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createNewSceneObject, createSeedAreaScene } from
  "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade existing Waypoint VarTable", () => {
  it("changes the complete ordered target and preserves immutable provenance", () => {
    const waypoint = retainedWaypoint();
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };
    const next = createSceneMutationsFacade().setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { waypointVariables: [
        { name: "label", type: "string", value: "north" },
        { name: "scale", type: "float", value: Math.fround(1.5) },
      ] },
    );
    expect(next).not.toBe(scene);
    expect(next.objects[0]?.waypointVariables).toEqual([
      { name: "label", type: "string", value: "north" },
      { name: "scale", type: "float", value: Math.fround(1.5) },
    ]);
    expect(next.objects[0]?.source).toBe(waypoint.source);
    expect(next.objects[0]?.source?.waypointVariables)
      .toEqual(waypoint.source.waypointVariables);
  });

  it("fails closed for malformed targets or missing exact provenance", () => {
    const waypoint = retainedWaypoint();
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };
    const facade = createSceneMutationsFacade();
    expect(facade.setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { waypointVariables: [{ name: "x", type: "float", value: 0.1 }] },
    )).toBe(scene);
    delete waypoint.source?.waypointVariables;
    const unsupported = { ...scene, objects: [waypoint] };
    expect(facade.setExistingWaypointPropertiesById(
      unsupported,
      waypoint.id,
      { waypointVariables: [] },
    )).toBe(unsupported);
  });
});

function retainedWaypoint() {
  const waypoint = createNewSceneObject("waypoints", 1, 2, 1);
  waypoint.id = "waypoint-0";
  waypoint.waypointVariables = [{ name: "counter", type: "int", value: 1 }];
  waypoint.source = {
    type: "aurora_git",
    sourceKind: "waypoint",
    sourceIndex: 0,
    sourceObjectId: "waypoint:0",
    waypointVariables: { expectedEntries: [
      { sourceIndex: 0, name: "counter", type: "int", value: 1 },
    ] },
  };
  return waypoint;
}
