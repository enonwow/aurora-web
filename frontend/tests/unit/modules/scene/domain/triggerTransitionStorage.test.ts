import { describe, expect, it } from "vitest";
import {
  MAX_TRIGGER_LINKED_TO_CODE_UNITS,
  canEditExistingTriggerTransitionStorage,
  cloneTriggerTransitionStorage,
  isTriggerTransitionStorage,
  triggerTransitionStoragesEqual,
} from "../../../../../src/modules/scene/domain/triggerTransitionStorage";

describe("Trigger transition storage", () => {
  const source = {
    linkedTo: " DESTINATION ",
    linkedToFlags: 2,
    loadScreenId: 7,
  };

  it("accepts, clones, and compares one exact native storage trio", () => {
    expect(isTriggerTransitionStorage(source)).toBe(true);
    expect(isTriggerTransitionStorage({
      linkedTo: "x".repeat(MAX_TRIGGER_LINKED_TO_CODE_UNITS),
      linkedToFlags: 0xff,
      loadScreenId: 0xffff,
    })).toBe(true);
    const cloned = cloneTriggerTransitionStorage(source);
    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    expect(Object.isFrozen(cloned)).toBe(true);
    expect(triggerTransitionStoragesEqual(source, cloned)).toBe(true);
    expect(triggerTransitionStoragesEqual(source, {
      ...source,
      linkedTo: "DESTINATION",
    })).toBe(false);
  });

  it.each([
    undefined,
    {},
    { linkedTo: "DEST", linkedToFlags: 1 },
    { linkedTo: "DEST", linkedToFlags: 1, loadScreenId: 0, extra: true },
    { linkedTo: "BAD\0DEST", linkedToFlags: 1, loadScreenId: 0 },
    {
      linkedTo: "x".repeat(MAX_TRIGGER_LINKED_TO_CODE_UNITS + 1),
      linkedToFlags: 1,
      loadScreenId: 0,
    },
    { linkedTo: "DEST", linkedToFlags: -1, loadScreenId: 0 },
    { linkedTo: "DEST", linkedToFlags: 256, loadScreenId: 0 },
    { linkedTo: "DEST", linkedToFlags: 1.5, loadScreenId: 0 },
    { linkedTo: "DEST", linkedToFlags: 1, loadScreenId: 65_536 },
  ])("rejects malformed or non-exact storage %#", (value) => {
    expect(isTriggerTransitionStorage(value)).toBe(false);
  });

  it("requires exact retained Trigger source provenance", () => {
    expect(canEditExistingTriggerTransitionStorage({
      type: "aurora_git",
      sourceKind: "trigger",
      sourceIndex: 0,
      sourceObjectId: "obj_trigger_0",
      triggerTransitionStorage: source,
    })).toBe(true);
    expect(canEditExistingTriggerTransitionStorage({
      type: "aurora_git",
      sourceKind: "door",
      sourceIndex: 0,
      sourceObjectId: "obj_door_0",
      triggerTransitionStorage: source,
    })).toBe(false);
  });
});
