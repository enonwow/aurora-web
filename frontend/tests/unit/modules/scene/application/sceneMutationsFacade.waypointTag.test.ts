import { describe, expect, it } from "vitest";

import { createSceneMutationsFacade } from "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createNewSceneObject, createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade existing Waypoint Tag", () => {
  function retainedWaypoint() {
    const waypoint = createNewSceneObject("waypoints", 1, 2, 1);
    waypoint.id = "waypoint-0";
    waypoint.tag = "NW_WAYPOINT001";
    waypoint.source = {
      type: "aurora_git",
      sourceKind: "waypoint",
      sourceIndex: 0,
      sourceObjectId: "waypoint:0",
      waypointTag: { present: true, value: "NW_WAYPOINT001" },
    };
    return waypoint;
  }

  it("changes only the editable target and preserves immutable source provenance", () => {
    const source = createSeedAreaScene();
    const waypoint = retainedWaypoint();
    const scene = { ...source, objects: [waypoint] };

    const next = createSceneMutationsFacade().setExistingWaypointTagById(
      scene,
      waypoint.id,
      "  PATROL_POINT_01  ",
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.tag).toBe("  PATROL_POINT_01  ");
    expect(next.objects[0]?.source?.waypointTag).toEqual({
      present: true,
      value: "NW_WAYPOINT001",
    });
    expect(next.objects[0]?.source).toBe(waypoint.source);
  });

  it.each([
    ["unknown object", "missing", "VALID_TAG"],
    ["over budget", "waypoint-0", "x".repeat(33)],
    ["embedded NUL", "waypoint-0", "bad\0tag"],
  ])("fails closed for %s", (_label, objectId, tag) => {
    const source = createSeedAreaScene();
    const waypoint = retainedWaypoint();
    const scene = { ...source, objects: [waypoint] };

    expect(createSceneMutationsFacade().setExistingWaypointTagById(
      scene,
      objectId,
      tag,
    )).toBe(scene);
  });

  it("fails closed when exact retained Waypoint provenance is missing", () => {
    const source = createSeedAreaScene();
    const waypoint = retainedWaypoint();
    waypoint.source = {
      type: "aurora_git",
      sourceKind: "waypoint",
      sourceIndex: 0,
      sourceObjectId: "waypoint:0",
    };
    const scene = { ...source, objects: [waypoint] };

    expect(createSceneMutationsFacade().setExistingWaypointTagById(
      scene,
      waypoint.id,
      "VALID_TAG",
    )).toBe(scene);
  });
});
