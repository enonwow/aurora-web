import {
  readExistingAreaPlaceableAppearanceMutation,
} from "../../src/modules/areas/domain/area-placeable-appearance";

describe("Existing Area Placeable Appearance mutation", () => {
  const valid = {
    expectedValue: 104,
    value: 105,
    tableSha256: "a".repeat(64),
    rowCount: 16_500,
  };

  it("accepts one exact changed physical-row pair", () => {
    expect(readExistingAreaPlaceableAppearanceMutation(valid)).toEqual(valid);
    expect(Object.isFrozen(readExistingAreaPlaceableAppearanceMutation(valid))).toBe(true);
  });

  it("accepts all inclusive row-count and DWord boundaries without weakening exact keys", () => {
    expect(readExistingAreaPlaceableAppearanceMutation({
      expectedValue: 0,
      value: 1,
      tableSha256: "0".repeat(64),
      rowCount: 2,
    })).not.toBeNull();
    expect(readExistingAreaPlaceableAppearanceMutation({
      expectedValue: 0,
      value: 999_999,
      tableSha256: "f".repeat(64),
      rowCount: 1_000_000,
    })).not.toBeNull();
    expect(readExistingAreaPlaceableAppearanceMutation(Object.create(valid))).toBeNull();
    expect(readExistingAreaPlaceableAppearanceMutation(
      Object.assign(Object.create({ inherited: true }), valid),
    )).toBeNull();
    expect(readExistingAreaPlaceableAppearanceMutation({
      expectedValue: 104,
      value: 105,
      tableSha256: "a".repeat(64),
      rowCount: 16_500,
      extra: undefined,
    })).toBeNull();
  });

  it.each([
    ["null", null],
    ["array", []],
    ["unknown key", { ...valid, rowLabel: "WaterTrough" }],
    ["missing key", { expectedValue: 104, value: 105, tableSha256: "a".repeat(64) }],
    ["uppercase digest", { ...valid, tableSha256: "A".repeat(64) }],
    ["short digest", { ...valid, tableSha256: "a".repeat(63) }],
    ["zero rows", { ...valid, rowCount: 0 }],
    ["too many rows", { ...valid, rowCount: 1_000_001 }],
    ["fractional expected", { ...valid, expectedValue: 104.5 }],
    ["negative expected", { ...valid, expectedValue: -1 }],
    ["negative target", { ...valid, value: -1 }],
    ["fractional target", { ...valid, value: 105.5 }],
    ["DWord overflow expected", { ...valid, expectedValue: 0x1_0000_0000 }],
    ["DWord overflow target", { ...valid, value: 0x1_0000_0000 }],
    ["fractional rows", { ...valid, rowCount: 16_500.5 }],
    ["one row cannot contain a changed pair", { ...valid, expectedValue: 0, value: 1, rowCount: 1 }],
    ["target equal to row count", { ...valid, value: 16_500 }],
    ["expected equal to row count", { ...valid, expectedValue: 16_500 }],
    ["unchanged", { ...valid, value: 104 }],
  ])("rejects %s", (_label, candidate) => {
    expect(readExistingAreaPlaceableAppearanceMutation(candidate)).toBeNull();
  });
});
