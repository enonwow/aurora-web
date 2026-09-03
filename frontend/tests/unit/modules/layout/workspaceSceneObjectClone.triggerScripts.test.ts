import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("workspace Trigger script cloning", () => {
  it("detaches immutable source tuple from editable target tuple", () => {
    const sourceTuple = {
      onDisarm: "trg_disarm",
      onTrapTriggered: "trg_trapped",
      onClick: "",
      onHeartbeat: "trg_heartbeat",
      onEnter: "trg_enter",
      onExit: "trg_exit",
      onUserDefined: "trg_user",
    };
    const targetTuple = { ...sourceTuple, onClick: "trg_click" };
    const object = {
      id: "trigger:0",
      kind: "triggers" as const,
      resRef: "newgeneric",
      tag: "GenericTrigger",
      triggerScriptResRefs: targetTuple,
      source: {
        type: "aurora_git" as const,
        sourceKind: "trigger" as const,
        sourceIndex: 0,
        triggerScriptResRefsStorage: sourceTuple,
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
    expect(cloned.triggerScriptResRefs).toEqual(targetTuple);
    expect(cloned.source?.triggerScriptResRefsStorage).toEqual(sourceTuple);
    expect(cloned.triggerScriptResRefs).not.toBe(object.triggerScriptResRefs);
    expect(cloned.source?.triggerScriptResRefsStorage)
      .not.toBe(object.source.triggerScriptResRefsStorage);
  });
});
