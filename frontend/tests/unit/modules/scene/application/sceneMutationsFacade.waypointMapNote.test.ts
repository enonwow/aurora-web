import { describe, expect, it } from "vitest";

import { createSceneMutationsFacade } from
  "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createNewSceneObject, createSeedAreaScene } from
  "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade existing Waypoint MapNote", () => {
  it("changes the complete target vector and preserves immutable source", () => {
    const waypoint = retainedWaypoint();
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };

    const next = createSceneMutationsFacade().setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      {
        mapNote: {
          hasMapNote: true,
          mapNoteText: " New marker ",
          mapNoteEnabled: false,
        },
      },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.waypointMapNote).toEqual({
      hasMapNote: true,
      mapNoteText: " New marker ",
      mapNoteEnabled: false,
    });
    expect(next.objects[0]?.source).toBe(waypoint.source);
    expect(next.objects[0]?.source?.waypointMapNoteStorage)
      .toEqual(waypoint.source.waypointMapNoteStorage);
  });

  it("fails closed for incomplete, non-ASCII, and unsupported source vectors", () => {
    const waypoint = retainedWaypoint();
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };
    const facade = createSceneMutationsFacade();
    expect(facade.setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { mapNote: { hasMapNote: true, mapNoteText: "missing" } as never },
    )).toBe(scene);
    expect(facade.setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      {
        mapNote: {
          hasMapNote: true,
          mapNoteText: "Północ",
          mapNoteEnabled: true,
        },
      },
    )).toBe(scene);
    waypoint.source = {
      ...waypoint.source!,
      waypointMapNoteStorage: {
        hasMapNoteByte: 0,
        mapNoteStorage: { present: true, strRef: 42, entries: [] },
        mapNoteEnabledByte: 1,
      },
    };
    const unsupportedScene = { ...scene, objects: [waypoint] };
    expect(facade.setExistingWaypointPropertiesById(
      unsupportedScene,
      waypoint.id,
      {
        mapNote: {
          hasMapNote: true,
          mapNoteText: "Marker",
          mapNoteEnabled: true,
        },
      },
    )).toBe(unsupportedScene);
  });
});

function retainedWaypoint() {
  const waypoint = createNewSceneObject("waypoints", 1, 2, 1);
  waypoint.id = "waypoint-0";
  waypoint.waypointMapNote = {
    hasMapNote: false,
    mapNoteText: "Old marker",
    mapNoteEnabled: true,
  };
  waypoint.source = {
    type: "aurora_git",
    sourceKind: "waypoint",
    sourceIndex: 0,
    sourceObjectId: "waypoint:0",
    waypointMapNoteStorage: {
      hasMapNoteByte: 0,
      mapNoteStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "T2xkIG1hcmtlcg==" }],
      },
      mapNoteEnabledByte: 1,
    },
  };
  return waypoint;
}
