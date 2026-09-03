import { describe, expect, it } from "vitest";
import {
  ITEM_INSTANCE_STATE_DEFAULTS,
  cloneItemInstanceStateStorage,
  itemInstanceStateStorageEqual,
  readItemInstanceStateStorage,
  readItemInstanceStateValue,
} from "../../../../../src/modules/scene/domain/itemInstanceState";

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

describe("itemInstanceState", () => {
  it("validates and clones detached exact storage", () => {
    const storage = readItemInstanceStateStorage({
      presentFields: ["charges", "stackSize", "identified"],
      values: { ...defaults, charges: 0, stackSize: 20, identified: true },
    });
    const clone = cloneItemInstanceStateStorage(storage!);

    expect(ITEM_INSTANCE_STATE_DEFAULTS).toEqual(defaults);
    expect(clone).toEqual(storage);
    expect(clone).not.toBe(storage);
    expect(clone.values).not.toBe(storage?.values);
    expect(clone.presentFields).not.toBe(storage?.presentFields);
    expect(itemInstanceStateStorageEqual(clone, storage!)).toBe(true);
  });

  it.each([
    ["unknown key", { ...defaults, unknown: 0 }],
    ["Byte overflow", { ...defaults, charges: 256 }],
    ["Word overflow", { ...defaults, stackSize: 65_536 }],
    ["DWord overflow", { ...defaults, addCost: 4_294_967_296 }],
    ["numeric boolean", { ...defaults, plot: 1 }],
  ])("rejects a malformed value vector with %s", (_label, value) => {
    expect(readItemInstanceStateValue(value)).toBeNull();
  });

  it("rejects noncanonical presence and non-default absent values", () => {
    expect(readItemInstanceStateStorage({
      presentFields: ["plot", "charges"],
      values: defaults,
    })).toBeNull();
    expect(readItemInstanceStateStorage({
      presentFields: [],
      values: { ...defaults, charges: 0 },
    })).toBeNull();
  });
});
