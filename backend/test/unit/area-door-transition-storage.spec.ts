import {
  MAX_AREA_DOOR_LINKED_TO_CODE_UNITS,
  areaDoorTransitionStorageEqual,
  isAreaDoorTransitionStorage,
  readExistingAreaDoorTransitionStorageMutation,
} from "../../src/modules/areas/domain/area-door-transition-storage";

describe("Existing Area Door transition storage contract", () => {
  const source = Object.freeze({
    linkedTo: "destination_tag",
    linkedToFlags: 1,
    loadScreenId: 0,
  });

  it("accepts one exact opaque CExoString/Byte/Word trio", () => {
    expect(isAreaDoorTransitionStorage(source)).toBe(true);
    expect(isAreaDoorTransitionStorage({
      linkedTo: "",
      linkedToFlags: 0xff,
      loadScreenId: 0xffff,
    })).toBe(true);
    expect(isAreaDoorTransitionStorage({
      ...source,
      linkedTo: "x".repeat(MAX_AREA_DOOR_LINKED_TO_CODE_UNITS),
    })).toBe(true);
  });

  it.each([
    ["missing member", { linkedTo: "destination_tag", linkedToFlags: 1 }],
    ["unknown member", { ...source, destinationType: "door" }],
    ["NUL text", { ...source, linkedTo: "destination\0tag" }],
    ["over-budget text", { ...source, linkedTo: "x".repeat(MAX_AREA_DOOR_LINKED_TO_CODE_UNITS + 1) }],
    ["negative Byte", { ...source, linkedToFlags: -1 }],
    ["oversized Byte", { ...source, linkedToFlags: 0x100 }],
    ["fractional Byte", { ...source, linkedToFlags: 1.5 }],
    ["negative Word", { ...source, loadScreenId: -1 }],
    ["oversized Word", { ...source, loadScreenId: 0x1_0000 }],
    ["coerced Word", { ...source, loadScreenId: "0" }],
  ])("rejects %s", (_label, value) => {
    expect(isAreaDoorTransitionStorage(value)).toBe(false);
  });

  it("compares all three members without normalization", () => {
    expect(areaDoorTransitionStorageEqual(source, { ...source })).toBe(true);
    expect(areaDoorTransitionStorageEqual(source, { ...source, linkedTo: " destination_tag" })).toBe(false);
    expect(areaDoorTransitionStorageEqual(source, { ...source, linkedToFlags: 2 })).toBe(false);
    expect(areaDoorTransitionStorageEqual(source, { ...source, loadScreenId: 7 })).toBe(false);
  });

  it("reads and freezes one complete changed CAS pair", () => {
    const mutation = readExistingAreaDoorTransitionStorageMutation({
      expectedValue: source,
      value: { ...source, linkedTo: "new_destination", loadScreenId: 7 },
    });

    expect(mutation).toEqual({
      expectedValue: source,
      value: { ...source, linkedTo: "new_destination", loadScreenId: 7 },
    });
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.expectedValue)).toBe(true);
    expect(Object.isFrozen(mutation?.value)).toBe(true);
  });

  it.each([
    ["partial pair", { expectedValue: source }],
    ["unknown pair key", { expectedValue: source, value: { ...source, loadScreenId: 7 }, mode: "replace" }],
    ["unchanged pair", { expectedValue: source, value: { ...source } }],
    ["malformed expected value", { expectedValue: { ...source, linkedToFlags: 256 }, value: source }],
    ["malformed target value", { expectedValue: source, value: { ...source, loadScreenId: -1 } }],
  ])("rejects %s", (_label, value) => {
    expect(readExistingAreaDoorTransitionStorageMutation(value)).toBeNull();
  });
});
