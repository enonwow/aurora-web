import {
  areaTriggerTrapPropertiesEqual,
  isAreaTriggerTrapProperties,
  readExistingAreaTriggerTrapPropertiesMutation,
} from "../../src/modules/areas/domain/area-trigger-trap-properties";

describe("Existing Area Trigger trap-properties contract", () => {
  const source = Object.freeze({
    trapDetectable: 1,
    trapDetectDc: 0,
    trapDisarmable: 1,
    disarmDc: 15,
    trapFlag: 0,
    trapOneShot: 1,
    trapType: 0,
  });

  it("accepts one exact native seven-Byte tuple", () => {
    expect(isAreaTriggerTrapProperties(source)).toBe(true);
    expect(isAreaTriggerTrapProperties({
      trapDetectable: 0,
      trapDetectDc: 0xff,
      trapDisarmable: 0,
      disarmDc: 0xff,
      trapFlag: 0xff,
      trapOneShot: 0xff,
      trapType: 0xff,
    })).toBe(true);
  });

  it.each([
    ["missing member", { ...source, trapType: undefined }],
    ["unknown member", { ...source, setDc: 12 }],
    ["negative byte", { ...source, trapDetectDc: -1 }],
    ["oversized byte", { ...source, disarmDc: 256 }],
    ["fractional byte", { ...source, trapType: 1.5 }],
    ["coerced byte", { ...source, trapFlag: "1" }],
  ])("rejects %s", (_label, value) => {
    expect(isAreaTriggerTrapProperties(value)).toBe(false);
  });

  it("compares every member without interpretation", () => {
    expect(areaTriggerTrapPropertiesEqual(source, { ...source })).toBe(true);
    for (const key of Object.keys(source) as Array<keyof typeof source>) {
      expect(areaTriggerTrapPropertiesEqual(source, {
        ...source,
        [key]: source[key] === 0xff ? 0 : source[key] + 1,
      })).toBe(false);
    }
  });

  it("reads and freezes one complete changed CAS pair", () => {
    const target = { ...source, trapFlag: 1, trapType: 7 };
    const mutation = readExistingAreaTriggerTrapPropertiesMutation({
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
    ["unknown pair key", { expectedValue: source, value: { ...source, trapType: 1 }, mode: "replace" }],
    ["unchanged pair", { expectedValue: source, value: { ...source } }],
    ["malformed expected", { expectedValue: { ...source, trapFlag: -1 }, value: source }],
    ["malformed target", { expectedValue: source, value: { ...source, trapType: 256 } }],
  ])("rejects %s", (_label, value) => {
    expect(readExistingAreaTriggerTrapPropertiesMutation(value)).toBeNull();
  });
});
