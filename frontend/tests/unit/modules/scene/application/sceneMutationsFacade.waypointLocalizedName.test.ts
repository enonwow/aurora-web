import { describe, expect, it } from "vitest";

import { createSceneMutationsFacade } from
  "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createNewSceneObject, createSeedAreaScene } from
  "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade existing Waypoint properties", () => {
  function retainedWaypoint() {
    const waypoint = createNewSceneObject("waypoints", 1, 2, 1);
    waypoint.id = "waypoint-0";
    waypoint.name = "Patrol Point";
    waypoint.tag = "NW_WAYPOINT001";
    waypoint.waypointLocalizedName = "Patrol Point";
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
    };
    return waypoint;
  }

  it("changes Tag and LocalizedName atomically while retaining immutable provenance", () => {
    const source = createSeedAreaScene();
    const waypoint = retainedWaypoint();
    const scene = { ...source, objects: [waypoint] };

    const next = createSceneMutationsFacade().setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { tag: "NORTH_PATROL", localizedName: " North Patrol Point " },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]).toMatchObject({
      tag: "NORTH_PATROL",
      name: " North Patrol Point ",
      waypointLocalizedName: " North Patrol Point ",
    });
    expect(next.objects[0]?.source).toBe(waypoint.source);
    expect(next.objects[0]?.source?.waypointLocalizedNameStorage)
      .toEqual(waypoint.source.waypointLocalizedNameStorage);
  });

  it("updates LocalizedName independently and fails closed for invalid input", () => {
    const waypoint = retainedWaypoint();
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };
    const facade = createSceneMutationsFacade();
    const changed = facade.setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { localizedName: "North" },
    );
    expect(changed.objects[0]?.tag).toBe("NW_WAYPOINT001");
    expect(changed.objects[0]?.waypointLocalizedName).toBe("North");
    expect(facade.setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { localizedName: "Północ" },
    )).toBe(scene);
  });

  it("does not mutate TLK-backed LocalizedName while allowing independent Tag CAS", () => {
    const waypoint = retainedWaypoint();
    waypoint.source = {
      ...waypoint.source!,
      waypointLocalizedNameStorage: {
        present: true,
        strRef: 14817,
        entries: [],
      },
    };
    delete waypoint.waypointLocalizedName;
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };

    const next = createSceneMutationsFacade().setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { tag: "NORTH_PATROL", localizedName: "North" },
    );
    expect(next.objects[0]?.tag).toBe("NORTH_PATROL");
    expect(next.objects[0]?.waypointLocalizedName).toBeUndefined();
  });
});
