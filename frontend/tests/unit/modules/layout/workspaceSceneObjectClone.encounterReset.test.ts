import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("cloneSceneObject Encounter Reset", () => {
  it("detaches immutable source storage from editable target storage", () => {
    const source = {
      id: "encounter:0",
      kind: "encounters" as const,
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      encounterReset: { resetByte: 1 as const },
      source: {
        type: "aurora_git" as const,
        sourceKind: "encounter" as const,
        sourceIndex: 0,
        encounterResetStorage: { resetByte: 1 as const },
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

    expect(cloned.encounterReset).toEqual({ resetByte: 1 });
    expect(cloned.source?.encounterResetStorage).toEqual({ resetByte: 1 });
    expect(cloned.encounterReset).not.toBe(source.encounterReset);
    expect(cloned.source?.encounterResetStorage)
      .not.toBe(source.source.encounterResetStorage);
    expect(cloned.source?.encounterResetStorage)
      .not.toBe(cloned.encounterReset);
  });
});
