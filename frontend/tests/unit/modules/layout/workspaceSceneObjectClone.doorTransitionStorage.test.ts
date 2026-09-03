import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspaceSceneObjectClone Door transition storage", () => {
  it("deep-clones immutable source provenance and the separate editable target", () => {
    const sourceStorage = { linkedTo: "SOURCE", linkedToFlags: 1, loadScreenId: 0 };
    const targetStorage = { linkedTo: "TARGET", linkedToFlags: 2, loadScreenId: 7 };
    const door = createNewSceneObject("doors", 1, 2, 3);
    door.source = {
      type: "aurora_git",
      sourceKind: "door",
      sourceIndex: 0,
      sourceObjectId: "obj_door_0",
      doorTransitionStorage: sourceStorage,
    };
    door.doorTransition = {
      linkedTarget: "legacy",
      linkedModule: "",
      linkedTag: "",
      linkedWaypoint: "",
      loadScreen: "",
      flags: {},
      storage: targetStorage,
    };

    const cloned = cloneSceneObject(door);

    expect(cloned.source?.doorTransitionStorage).toEqual(sourceStorage);
    expect(cloned.doorTransition?.storage).toEqual(targetStorage);
    expect(cloned.source?.doorTransitionStorage).not.toBe(sourceStorage);
    expect(cloned.doorTransition?.storage).not.toBe(targetStorage);
  });
});
