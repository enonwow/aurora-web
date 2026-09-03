import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Waypoint TemplateResRef", () => {
  it.each([
    [{ present: false }],
    [{ present: true, nativeType: "resref", value: "nw_waypoint001" }],
  ] as const)("deep-clones exact presence-sensitive provenance %#", (storage) => {
    const waypoint = createNewSceneObject("waypoints", 1, 2, 1);
    waypoint.waypointTemplateResRef = storage.present
      ? storage.value
      : undefined;
    waypoint.source = {
      type: "aurora_git",
      sourceKind: "waypoint",
      sourceIndex: 0,
      sourceObjectId: "wpt:0:template_resref",
      waypointTemplateResRef: storage,
    };

    const cloned = cloneSceneObject(waypoint);

    expect(cloned.source?.waypointTemplateResRef).toEqual(storage);
    expect(cloned.source?.waypointTemplateResRef).not.toBe(storage);
    expect(cloned.waypointTemplateResRef).toBe(waypoint.waypointTemplateResRef);
  });
});
