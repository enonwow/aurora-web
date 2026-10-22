import {
  MAX_AREA_TRIGGER_KEY_NAME_CODE_UNITS,
  areaTriggerCorePropertiesEqual,
  isAreaTriggerCoreProperties,
  readExistingAreaTriggerCorePropertiesMutation,
} from "../../src/modules/areas/domain/area-trigger-core-properties";

describe("Existing Area Trigger core-properties contract", () => {
  const source = Object.freeze({
    autoRemoveKey: 0,
    factionId: 1,
    cursorId: 0,
    highlightHeight: Math.fround(1.5),
    keyName: " gate_key ",
    portraitId: 0,
    triggerType: 0,
  });

  it("accepts one exact native seven-field tuple", () => {
    expect(isAreaTriggerCoreProperties(source)).toBe(true);
    expect(isAreaTriggerCoreProperties({
      autoRemoveKey: 1,
      factionId: 0xffff_ffff,
      cursorId: 0xff,
      highlightHeight: Math.fround(-3.25),
      keyName: "x".repeat(MAX_AREA_TRIGGER_KEY_NAME_CODE_UNITS),
      portraitId: 0xffff,
      triggerType: -0x8000_0000,
    })).toBe(true);
  });

  it.each([
    ["missing member", { ...source, keyName: undefined }],
    ["unknown member", { ...source, active: true }],
    ["non-checkbox AutoRemoveKey", { ...source, autoRemoveKey: 2 }],
    ["oversized Faction", { ...source, factionId: 0x1_0000_0000 }],
    ["negative Cursor", { ...source, cursorId: -1 }],
    ["non-f32 height", { ...source, highlightHeight: 1.1 }],
    ["non-finite height", { ...source, highlightHeight: Infinity }],
    ["NUL key", { ...source, keyName: "gate\0key" }],
    ["over-budget key", {
      ...source,
      keyName: "x".repeat(MAX_AREA_TRIGGER_KEY_NAME_CODE_UNITS + 1),
    }],
    ["oversized PortraitId", { ...source, portraitId: 0x1_0000 }],
    ["fractional Type", { ...source, triggerType: 1.5 }],
    ["oversized Type", { ...source, triggerType: 0x8000_0000 }],
  ])("rejects %s", (_label, value) => {
    expect(isAreaTriggerCoreProperties(value)).toBe(false);
  });

  it("compares all members without normalization", () => {
    expect(areaTriggerCorePropertiesEqual(source, { ...source })).toBe(true);
    for (const changed of [
      { autoRemoveKey: 1 },
      { factionId: 2 },
      { cursorId: 3 },
      { highlightHeight: Math.fround(2.5) },
      { keyName: "gate_key" },
      { portraitId: 4 },
      { triggerType: 1 },
    ]) {
      expect(areaTriggerCorePropertiesEqual(source, { ...source, ...changed })).toBe(false);
    }
  });

  it("reads and freezes one complete changed CAS pair", () => {
    const target = { ...source, autoRemoveKey: 1, keyName: "new_key" };
    const mutation = readExistingAreaTriggerCorePropertiesMutation({
      expectedValue: source,
      value: target,
    });

    expect(mutation).toEqual({ expectedValue: source, value: target });
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.expectedValue)).toBe(true);
    expect(Object.isFrozen(mutation?.value)).toBe(true);
  });

  it.each([
    ["partial pair", { expectedValue: source }],
    ["unknown pair key", { expectedValue: source, value: { ...source, cursorId: 2 }, mode: "replace" }],
    ["unchanged pair", { expectedValue: source, value: { ...source } }],
    ["malformed expected", { expectedValue: { ...source, cursorId: 256 }, value: source }],
    ["malformed target", { expectedValue: source, value: { ...source, autoRemoveKey: 2 } }],
  ])("rejects %s", (_label, value) => {
    expect(readExistingAreaTriggerCorePropertiesMutation(value)).toBeNull();
  });
});
