import { describe, expect, it } from "vitest";

import { createSceneMutationsFacade } from
  "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createNewSceneObject, createSeedAreaScene } from
  "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade existing Waypoint TemplateResRef", () => {
  function retainedWaypoint() {
    const waypoint = createNewSceneObject("waypoints", 1, 2, 1);
    waypoint.id = "waypoint-0";
    waypoint.resRef = "renderer_identity";
    waypoint.waypointTemplateResRef = "nw_waypoint001";
    waypoint.source = {
      type: "aurora_git",
      sourceKind: "waypoint",
      sourceIndex: 0,
      sourceObjectId: "waypoint:0",
      waypointTemplateResRef: {
        present: true,
        nativeType: "resref",
        value: "nw_waypoint001",
      },
    };
    return waypoint;
  }

  it("changes only the editable native target and preserves renderer identity", () => {
    const waypoint = retainedWaypoint();
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };

    const next = createSceneMutationsFacade().setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { templateResRef: "custom_waypoint" },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.resRef).toBe("renderer_identity");
    expect(next.objects[0]?.waypointTemplateResRef).toBe("custom_waypoint");
    expect(next.objects[0]?.source).toBe(waypoint.source);
    expect(next.objects[0]?.source?.waypointTemplateResRef)
      .toEqual(waypoint.source.waypointTemplateResRef);
  });

  it.each(["CUSTOM_WAYPOINT", "custom-waypoint", "", "abcdefghijklmnopq"])(
    "fails closed for invalid target %s",
    (templateResRef) => {
      const waypoint = retainedWaypoint();
      const scene = { ...createSeedAreaScene(), objects: [waypoint] };
      expect(createSceneMutationsFacade().setExistingWaypointPropertiesById(
        scene,
        waypoint.id,
        { templateResRef },
      )).toBe(scene);
    },
  );

  it("fails closed for absent provenance", () => {
    const waypoint = retainedWaypoint();
    waypoint.source = {
      ...waypoint.source!,
      waypointTemplateResRef: { present: false },
    };
    delete waypoint.waypointTemplateResRef;
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };
    expect(createSceneMutationsFacade().setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { templateResRef: "custom_waypoint" },
    )).toBe(scene);
  });
});
