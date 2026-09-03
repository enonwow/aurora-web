import {
  AREA_ITEM_INSTANCE_STATE_DEFAULTS,
  AREA_ITEM_INSTANCE_STATE_FIELDS,
  areaItemInstanceStateStorageEqual,
  areaItemInstanceStateValueEqual,
  readAreaItemInstanceStateMutation,
  readAreaItemInstanceStateStorage,
  readAreaItemInstanceStateValue,
} from "../../src/modules/areas/domain/area-item-instance-state";

const defaults = {
  charges: 50,
  cost: 0,
  stolen: false,
  stackSize: 1,
  plot: false,
  addCost: 0,
  identified: false,
  cursed: false,
} as const;

describe("Area ground-item instance state", () => {
  it("admits and freezes the complete native value vector", () => {
    const value = readAreaItemInstanceStateValue(defaults);

    expect(value).toEqual(defaults);
    expect(Object.isFrozen(value)).toBe(true);
    expect(AREA_ITEM_INSTANCE_STATE_DEFAULTS).toEqual(defaults);
    expect(AREA_ITEM_INSTANCE_STATE_FIELDS.map((field) => field.key)).toEqual([
      "charges", "cost", "stolen", "stackSize", "plot", "addCost", "identified", "cursed",
    ]);
  });

  it.each([
    ["missing key", { ...defaults, charges: undefined }],
    ["unknown key", { ...defaults, extra: 1 }],
    ["fractional Byte", { ...defaults, charges: 1.5 }],
    ["negative Byte", { ...defaults, charges: -1 }],
    ["overflow Byte", { ...defaults, charges: 256 }],
    ["overflow Word", { ...defaults, stackSize: 65_536 }],
    ["overflow DWord", { ...defaults, cost: 4_294_967_296 }],
    ["number boolean", { ...defaults, stolen: 1 }],
  ])("rejects a vector with %s", (_label, value) => {
    expect(readAreaItemInstanceStateValue(value)).toBeNull();
  });

  it("preserves canonical physical presence separately from resolved defaults", () => {
    const storage = readAreaItemInstanceStateStorage({
      presentFields: ["charges", "plot", "identified"],
      values: { ...defaults, charges: 0, identified: true },
    });

    expect(storage).toEqual({
      presentFields: ["charges", "plot", "identified"],
      values: { ...defaults, charges: 0, identified: true },
    });
    expect(Object.isFrozen(storage)).toBe(true);
    expect(Object.isFrozen(storage?.presentFields)).toBe(true);
    expect(Object.isFrozen(storage?.values)).toBe(true);
  });

  it.each([
    ["noncanonical order", ["plot", "charges"]],
    ["duplicate key", ["charges", "charges"]],
    ["unknown key", ["charges", "unknown"]],
  ])("rejects %s in the physical-presence vector", (_label, presentFields) => {
    expect(readAreaItemInstanceStateStorage({ presentFields, values: defaults })).toBeNull();
  });

  it("requires every absent member to equal its native read default", () => {
    expect(readAreaItemInstanceStateStorage({
      presentFields: [],
      values: { ...defaults, charges: 0 },
    })).toBeNull();
  });

  it("admits one changed full-state CAS and rejects stale shapes and no-ops", () => {
    const expectedValue = { presentFields: [], values: defaults };
    const value = { ...defaults, charges: 12, stackSize: 3, identified: true };
    const mutation = readAreaItemInstanceStateMutation({ expectedValue, value });

    expect(mutation).toEqual({ expectedValue, value });
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(readAreaItemInstanceStateMutation({ expectedValue, value: defaults })).toBeNull();
    expect(readAreaItemInstanceStateMutation({ expectedValue, value, extra: true })).toBeNull();
    expect(areaItemInstanceStateStorageEqual(mutation!.expectedValue, expectedValue)).toBe(true);
    expect(areaItemInstanceStateValueEqual(mutation!.value, expectedValue.values)).toBe(false);
  });
});
