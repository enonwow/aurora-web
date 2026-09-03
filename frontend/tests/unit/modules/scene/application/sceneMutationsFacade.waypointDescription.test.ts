import { describe, expect, it } from "vitest";

import { createSceneMutationsFacade } from
  "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createNewSceneObject, createSeedAreaScene } from
  "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade existing Waypoint Description", () => {
  function retainedWaypoint() {
    const waypoint = createNewSceneObject("waypoints", 1, 2, 1);
    waypoint.id = "waypoint-0";
    waypoint.name = "Patrol Point";
    waypoint.tag = "NW_WAYPOINT001";
    waypoint.waypointLocalizedName = "Patrol Point";
    waypoint.waypointDescription = "Patrol route";
    waypoint.source = {
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
    };
    return waypoint;
  }

  it("changes Description independently while retaining immutable provenance", () => {
    const waypoint = retainedWaypoint();
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };

    const next = createSceneMutationsFacade().setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { description: " Northern patrol route " },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]).toMatchObject({
      tag: "NW_WAYPOINT001",
      name: "Patrol Point",
      waypointLocalizedName: "Patrol Point",
      waypointDescription: " Northern patrol route ",
    });
    expect(next.objects[0]?.source).toBe(waypoint.source);
    expect(next.objects[0]?.source?.waypointDescriptionStorage)
      .toEqual(waypoint.source.waypointDescriptionStorage);
  });

  it("fails closed for invalid or TLK-backed Description without blocking Tag", () => {
    const waypoint = retainedWaypoint();
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };
    const facade = createSceneMutationsFacade();
    expect(facade.setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { description: "Północ" },
    )).toBe(scene);

    waypoint.source = {
      ...waypoint.source!,
      waypointDescriptionStorage: {
        present: true,
        strRef: 14817,
        entries: [],
      },
    };
    delete waypoint.waypointDescription;
    const next = facade.setExistingWaypointPropertiesById(
      { ...scene, objects: [waypoint] },
      waypoint.id,
      { tag: "NORTH_PATROL", description: "Northern patrol route" },
    );
    expect(next.objects[0]?.tag).toBe("NORTH_PATROL");
    expect(next.objects[0]?.waypointDescription).toBeUndefined();
  });
});
