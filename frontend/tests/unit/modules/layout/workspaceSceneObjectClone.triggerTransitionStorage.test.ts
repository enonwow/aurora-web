import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("workspace Trigger transition-storage cloning", () => {
  it("detaches immutable source storage from editable target storage", () => {
    const sourceStorage = {
      linkedTo: "east_gate",
      linkedToFlags: 2,
      loadScreenId: 7,
    };
    const targetStorage = {
      linkedTo: "crypt_exit",
      linkedToFlags: 4,
      loadScreenId: 321,
    };
    const object = {
      id: "trigger:0",
      kind: "triggers" as const,
      resRef: "newgeneric",
      tag: "GenericTrigger",
      triggerTransitionStorage: targetStorage,
      source: {
        type: "aurora_git" as const,
        sourceKind: "trigger" as const,
        sourceIndex: 0,
        triggerTransitionStorage: sourceStorage,
      },
      x: 0,
      y: 0,
      z: 0,
      bearing: 0,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: 0,
      },
    };

    const cloned = cloneSceneObject(object);

    expect(cloned.triggerTransitionStorage).toEqual(targetStorage);
    expect(cloned.source?.triggerTransitionStorage).toEqual(sourceStorage);
    expect(cloned.triggerTransitionStorage).not.toBe(object.triggerTransitionStorage);
    expect(cloned.source?.triggerTransitionStorage)
      .not.toBe(object.source.triggerTransitionStorage);
  });
});
