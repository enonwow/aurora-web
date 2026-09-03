import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Waypoint variables", () => {
  it("keeps immutable VarTable provenance and editable target independently cloned", () => {
    const source = createNewSceneObject("waypoints", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "waypoint",
      sourceIndex: 0,
      sourceObjectId: "waypoint:0:variables",
      waypointVariables: { expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      ] },
    };
    source.waypointVariables = [{ name: "Counter", type: "int", value: 2 }];

    const cloned = cloneSceneObject(source);
    expect(cloned.source?.waypointVariables).toEqual(source.source.waypointVariables);
    expect(cloned.source?.waypointVariables).not.toBe(source.source.waypointVariables);
    expect(cloned.source?.waypointVariables?.expectedEntries).not.toBe(
      source.source.waypointVariables.expectedEntries,
    );
    expect(cloned.waypointVariables).toEqual(source.waypointVariables);
    expect(cloned.waypointVariables).not.toBe(source.waypointVariables);
  });
});
