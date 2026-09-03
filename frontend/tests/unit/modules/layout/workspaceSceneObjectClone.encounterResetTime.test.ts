import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("cloneSceneObject Encounter ResetTime", () => {
  it("detaches immutable source storage from editable target storage", () => {
    const source = {
      id: "encounter:0",
      kind: "encounters" as const,
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      encounterResetTime: { resetTime: 60 },
      source: {
        type: "aurora_git" as const,
        sourceKind: "encounter" as const,
        sourceIndex: 0,
        encounterResetTimeStorage: { resetTime: 60 },
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

    const cloned = cloneSceneObject(source);

    expect(cloned.encounterResetTime).toEqual({ resetTime: 60 });
    expect(cloned.source?.encounterResetTimeStorage).toEqual({ resetTime: 60 });
    expect(cloned.encounterResetTime).not.toBe(source.encounterResetTime);
    expect(cloned.source?.encounterResetTimeStorage)
      .not.toBe(source.source.encounterResetTimeStorage);
    expect(cloned.source?.encounterResetTimeStorage)
      .not.toBe(cloned.encounterResetTime);
  });
});
