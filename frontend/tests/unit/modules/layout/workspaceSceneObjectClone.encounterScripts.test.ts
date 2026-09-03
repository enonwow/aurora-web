import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("workspace Encounter script cloning", () => {
  it("detaches immutable source tuple from editable target tuple", () => {
    const sourceTuple = {
      onEntered: "enc_enter",
      onExit: "enc_exit",
      onExhausted: "",
      onHeartbeat: "enc_heartbeat",
      onUserDefined: "enc_user",
    };
    const targetTuple = { ...sourceTuple, onEntered: "new_enter" };
    const object = {
      id: "encounter:0",
      kind: "encounters" as const,
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      encounterScriptResRefs: targetTuple,
      source: {
        type: "aurora_git" as const,
        sourceKind: "encounter" as const,
        sourceIndex: 0,
        encounterScriptResRefsStorage: sourceTuple,
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
    expect(cloned.encounterScriptResRefs).toEqual(targetTuple);
    expect(cloned.source?.encounterScriptResRefsStorage).toEqual(sourceTuple);
    expect(cloned.encounterScriptResRefs).not.toBe(object.encounterScriptResRefs);
    expect(cloned.source?.encounterScriptResRefsStorage)
      .not.toBe(object.source.encounterScriptResRefsStorage);
  });
});
