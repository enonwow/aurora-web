import { describe, expect, it } from "vitest";

import {
  isPlaceableDurabilitySaveByte,
  readPlaceableDurabilitySaveBytes
} from "../../../../../src/modules/scene/domain/placeableDurabilitySaveBytes";

describe("Placeable durability/save Byte domain", () => {
  it("reads exact present safe integers including both Byte boundaries", () => {
    expect(readPlaceableDurabilitySaveBytes({
      hardness: 0,
      fortitudeSave: 255,
      reflexSave: 17,
      willSave: 42
    })).toEqual({
      hardness: 0,
      fortitudeSave: 255,
      reflexSave: 17,
      willSave: 42
    });
  });

  it("keeps valid members presence-sensitive and rejects invalid members independently", () => {
    expect(readPlaceableDurabilitySaveBytes({
      hardness: 5,
      fortitudeSave: -1,
      reflexSave: 1.5,
      willSave: "16"
    })).toEqual({ hardness: 5 });
    expect(readPlaceableDurabilitySaveBytes({ hardness: 256 })).toBeUndefined();
    expect(readPlaceableDurabilitySaveBytes(undefined)).toBeUndefined();
  });

  it.each([
    0,
    1,
    254,
    255
  ])("accepts Byte value %s", (value) => {
    expect(isPlaceableDurabilitySaveByte(value)).toBe(true);
  });

  it.each([
    -1,
    256,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "1",
    null,
    undefined
  ])("rejects non-Byte value %s", (value) => {
    expect(isPlaceableDurabilitySaveByte(value)).toBe(false);
  });
});
