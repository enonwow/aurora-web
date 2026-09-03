import { describe, expect, it } from "vitest";

import {
  isPlaceableTrapByteFieldValue,
  isPlaceableTrapTargetValue,
  readPlaceableTrapByteSettings
} from "../../../../../src/modules/scene/domain/placeableTrapByteFields";

describe("Placeable trap Byte fields domain", () => {
  it("reads the exact six native Byte fields and projects flags to booleans", () => {
    expect(readPlaceableTrapByteSettings({
      trapFlag: 0,
      trapDetectable: 1,
      trapDisarmable: 0,
      trapOneShot: 1,
      detectDc: 0,
      disarmDc: 255
    })).toEqual({
      isTrapped: false,
      detectable: true,
      disarmable: false,
      oneShot: true,
      detectionDc: 0,
      disarmDc: 255
    });
  });

  it("accepts only numeric 0 or 1 for flags and integer 0..255 for DC Bytes", () => {
    for (const valid of [0, 1]) {
      expect(isPlaceableTrapByteFieldValue("flag", valid)).toBe(true);
    }
    for (const invalid of [-1, 2, 0.5, "1", false, undefined]) {
      expect(isPlaceableTrapByteFieldValue("flag", invalid)).toBe(false);
    }
    for (const valid of [0, 1, 254, 255]) {
      expect(isPlaceableTrapByteFieldValue("byte", valid)).toBe(true);
    }
    for (const invalid of [-1, 256, 1.5, "255", true, undefined]) {
      expect(isPlaceableTrapByteFieldValue("byte", invalid)).toBe(false);
    }
  });

  it("rejects invalid members independently without inventing absent settings", () => {
    expect(readPlaceableTrapByteSettings({
      trapFlag: false,
      trapDetectable: 2,
      trapDisarmable: -1,
      trapOneShot: "1",
      detectDc: 12.5,
      disarmDc: 256
    })).toBeUndefined();

    expect(readPlaceableTrapByteSettings({ trapFlag: 0, detectDc: 17, disarmDc: "15" }))
      .toEqual({ isTrapped: false, detectionDc: 17 });
    expect(readPlaceableTrapByteSettings(undefined)).toBeUndefined();
  });

  it("fails closed for a field outside the admitted six-field set", () => {
    expect((isPlaceableTrapTargetValue as (field: string, value: unknown) => boolean)(
      "trapType",
      1
    )).toBe(false);
  });
});
