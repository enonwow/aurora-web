import { describe, expect, it } from "vitest";
import {
  MAX_TRIGGER_KEY_NAME_CODE_UNITS,
  canEditExistingTriggerCoreProperties,
  cloneTriggerCoreProperties,
  isTriggerCoreProperties,
  triggerCorePropertiesEqual,
} from "../../../../../src/modules/scene/domain/triggerCoreProperties";

describe("Trigger core properties", () => {
  const source = {
    autoRemoveKey: 0 as const,
    factionId: 1,
    cursorId: 2,
    highlightHeight: Math.fround(1.5),
    keyName: " gate_key ",
    portraitId: 3,
    triggerType: -1,
  };

  it("accepts, clones, and compares one exact native seven-field tuple", () => {
    expect(isTriggerCoreProperties(source)).toBe(true);
    expect(isTriggerCoreProperties({
      autoRemoveKey: 1,
      factionId: 0xffff_ffff,
      cursorId: 0xff,
      highlightHeight: Math.fround(-12.25),
      keyName: "x".repeat(MAX_TRIGGER_KEY_NAME_CODE_UNITS),
      portraitId: 0xffff,
      triggerType: -0x8000_0000,
    })).toBe(true);
    const cloned = cloneTriggerCoreProperties(source);
    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    expect(Object.isFrozen(cloned)).toBe(true);
    expect(triggerCorePropertiesEqual(source, cloned)).toBe(true);
    expect(triggerCorePropertiesEqual(source, { ...source, keyName: "gate_key" }))
      .toBe(false);
  });

  it.each([
    undefined,
    {},
    { ...source, portraitId: 3, extra: true },
    { ...source, autoRemoveKey: 2 },
    { ...source, factionId: -1 },
    { ...source, factionId: 0x1_0000_0000 },
    { ...source, cursorId: 256 },
    { ...source, highlightHeight: 1 / 3 },
    { ...source, highlightHeight: Number.NaN },
    { ...source, keyName: "BAD\0KEY" },
    { ...source, keyName: "x".repeat(MAX_TRIGGER_KEY_NAME_CODE_UNITS + 1) },
    { ...source, portraitId: 65_536 },
    { ...source, triggerType: 0x8000_0000 },
  ])("rejects malformed or non-exact storage %#", (value) => {
    expect(isTriggerCoreProperties(value)).toBe(false);
  });

  it("requires exact retained Trigger source provenance", () => {
    expect(canEditExistingTriggerCoreProperties({
      type: "aurora_git",
      sourceKind: "trigger",
      sourceIndex: 0,
      sourceObjectId: "obj_trigger_0",
      triggerCoreProperties: source,
    })).toBe(true);
    expect(canEditExistingTriggerCoreProperties({
      type: "aurora_git",
      sourceKind: "door",
      sourceIndex: 0,
      sourceObjectId: "obj_door_0",
      triggerCoreProperties: source,
    })).toBe(false);
  });
});
