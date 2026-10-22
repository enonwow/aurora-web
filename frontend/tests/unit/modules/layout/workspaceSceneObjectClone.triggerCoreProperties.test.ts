import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("workspace Trigger core-properties cloning", () => {
  it("detaches immutable source tuple from editable target tuple", () => {
    const sourceCore = core({ keyName: "source_key" });
    const targetCore = core({ autoRemoveKey: 1, keyName: "target_key" });
    const object = {
      id: "trigger:0",
      kind: "triggers" as const,
      resRef: "newgeneric",
      tag: "GenericTrigger",
      triggerCoreProperties: targetCore,
      source: {
        type: "aurora_git" as const,
        sourceKind: "trigger" as const,
        sourceIndex: 0,
        triggerCoreProperties: sourceCore,
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

    expect(cloned.triggerCoreProperties).toEqual(targetCore);
    expect(cloned.source?.triggerCoreProperties).toEqual(sourceCore);
    expect(cloned.triggerCoreProperties).not.toBe(object.triggerCoreProperties);
    expect(cloned.source?.triggerCoreProperties)
      .not.toBe(object.source.triggerCoreProperties);
  });
});

function core(overrides: Partial<{
  autoRemoveKey: 0 | 1;
  factionId: number;
  cursorId: number;
  highlightHeight: number;
  keyName: string;
  portraitId: number;
  triggerType: number;
}> = {}) {
  return {
    autoRemoveKey: 0 as 0 | 1,
    factionId: 1,
    cursorId: 2,
    highlightHeight: Math.fround(1.5),
    keyName: "",
    portraitId: 3,
    triggerType: 0,
    ...overrides,
  };
}
