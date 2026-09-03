import { createSceneMutationsFacade } from
  "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createNewSceneObject, createSeedAreaScene } from
  "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade existing Waypoint editor Comment", () => {
  it("changes the target independently and preserves immutable source", () => {
    const waypoint = createNewSceneObject("waypoints", 1, 2, 1);
    waypoint.id = "waypoint-0";
    waypoint.waypointEditorComment = " source ";
    waypoint.source = {
      type: "aurora_git",
      sourceKind: "waypoint",
      sourceIndex: 0,
      sourceObjectId: "waypoint:0",
      waypointEditorComment: " source ",
    };
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };

    const next = createSceneMutationsFacade().setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { editorComment: " target " },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.waypointEditorComment).toBe(" target ");
    expect(next.objects[0]?.source).toBe(waypoint.source);
    expect(next.objects[0]?.source?.waypointEditorComment).toBe(" source ");
  });

  it("fails closed for invalid, absent, or wrong-family provenance", () => {
    const waypoint = createNewSceneObject("waypoints", 1, 2, 1);
    waypoint.id = "waypoint-0";
    waypoint.waypointEditorComment = " source ";
    waypoint.source = {
      type: "aurora_git",
      sourceKind: "waypoint",
      sourceIndex: 0,
      sourceObjectId: "waypoint:0",
      waypointEditorComment: " source ",
    };
    const scene = { ...createSeedAreaScene(), objects: [waypoint] };
    const facade = createSceneMutationsFacade();
    expect(facade.setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { editorComment: "bad\0target" },
    )).toBe(scene);
    delete waypoint.source.waypointEditorComment;
    expect(facade.setExistingWaypointPropertiesById(
      scene,
      waypoint.id,
      { editorComment: "target" },
    )).toBe(scene);
  });
});
