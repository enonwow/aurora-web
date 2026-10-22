import { describe, expect, it } from "vitest";
import {
  canEditExistingTriggerTrapProperties,
  cloneTriggerTrapProperties,
  isTriggerTrapProperties,
  triggerTrapPropertiesEqual,
} from "../../../../../src/modules/scene/domain/triggerTrapProperties";

describe("Trigger trap properties", () => {
  const source = {
    trapDetectable: 1,
    trapDetectDc: 0,
    trapDisarmable: 1,
    disarmDc: 15,
    trapFlag: 0,
    trapOneShot: 1,
    trapType: 0,
  };

  it("accepts, clones, and compares one exact native seven-Byte tuple", () => {
    expect(isTriggerTrapProperties(source)).toBe(true);
    expect(isTriggerTrapProperties({
      trapDetectable: 0xff,
      trapDetectDc: 0xff,
      trapDisarmable: 0xff,
      disarmDc: 0xff,
      trapFlag: 0xff,
      trapOneShot: 0xff,
      trapType: 0xff,
    })).toBe(true);
    const cloned = cloneTriggerTrapProperties(source);
    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    expect(Object.isFrozen(cloned)).toBe(true);
    expect(triggerTrapPropertiesEqual(source, cloned)).toBe(true);
    expect(triggerTrapPropertiesEqual(source, { ...source, trapType: 1 })).toBe(false);
  });

  it.each([
    undefined,
    {},
    { ...source, extra: true },
    { ...source, trapDetectable: -1 },
    { ...source, trapDetectDc: 256 },
    { ...source, disarmDc: 1.5 },
    { ...source, trapFlag: "1" },
    { ...source, trapType: undefined },
  ])("rejects malformed or non-exact storage %#", (value) => {
    expect(isTriggerTrapProperties(value)).toBe(false);
  });

  it("requires exact retained Trigger source provenance", () => {
    expect(canEditExistingTriggerTrapProperties({
      type: "aurora_git",
      sourceKind: "trigger",
      sourceIndex: 0,
      sourceObjectId: "obj_trigger_0",
      triggerTrapProperties: source,
    })).toBe(true);
    expect(canEditExistingTriggerTrapProperties({
      type: "aurora_git",
      sourceKind: "door",
      sourceIndex: 0,
      sourceObjectId: "obj_door_0",
      triggerTrapProperties: source,
    })).toBe(false);
  });
});
