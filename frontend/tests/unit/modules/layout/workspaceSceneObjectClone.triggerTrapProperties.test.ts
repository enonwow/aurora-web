import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("workspace Trigger trap-properties cloning", () => {
  it("detaches immutable source tuple from editable target tuple", () => {
    const sourceTrap = trap({ trapType: 0 });
    const targetTrap = trap({ trapFlag: 1, trapType: 7 });
    const object = {
      id: "trigger:0",
      kind: "triggers" as const,
      resRef: "newgeneric",
      tag: "GenericTrigger",
      triggerTrapProperties: targetTrap,
      source: {
        type: "aurora_git" as const,
        sourceKind: "trigger" as const,
        sourceIndex: 0,
        triggerTrapProperties: sourceTrap,
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

    expect(cloned.triggerTrapProperties).toEqual(targetTrap);
    expect(cloned.source?.triggerTrapProperties).toEqual(sourceTrap);
    expect(cloned.triggerTrapProperties).not.toBe(object.triggerTrapProperties);
    expect(cloned.source?.triggerTrapProperties)
      .not.toBe(object.source.triggerTrapProperties);
  });
});

function trap(overrides: Partial<Record<
  "trapDetectable" | "trapDetectDc" | "trapDisarmable" | "disarmDc" |
  "trapFlag" | "trapOneShot" | "trapType",
  number
>> = {}) {
  return {
    trapDetectable: 1,
    trapDetectDc: 0,
    trapDisarmable: 1,
    disarmDc: 15,
    trapFlag: 0,
    trapOneShot: 1,
    trapType: 0,
    ...overrides,
  };
}
