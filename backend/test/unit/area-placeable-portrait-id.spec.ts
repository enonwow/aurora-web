import {
  readExistingAreaPlaceablePortraitMutation,
  readExistingAreaPlaceablePortraitProvenance,
} from "../../src/modules/areas/domain/area-placeable-portrait-id";

describe("existing Area Placeable PortraitId domain", () => {
  const sha256 = "d".repeat(64);

  it("admits and freezes exact provenance and changed physical-row pairs", () => {
    const provenance = readExistingAreaPlaceablePortraitProvenance({
      expectedValue: 462,
      tableSha256: sha256,
      tableRowCount: 692,
    });
    expect(provenance).toEqual({ expectedValue: 462, tableSha256: sha256, tableRowCount: 692 });
    expect(Object.isFrozen(provenance)).toBe(true);
    expect(readExistingAreaPlaceablePortraitProvenance({
      expectedValue: 15_157,
      tableSha256: sha256,
      tableRowCount: 16_001,
    })).toEqual({ expectedValue: 15_157, tableSha256: sha256, tableRowCount: 16_001 });

    const pair = readExistingAreaPlaceablePortraitMutation({
      expectedValue: 462,
      value: 463,
      tableSha256: sha256,
      tableRowCount: 692,
    });
    expect(pair).toEqual({ expectedValue: 462, value: 463, tableSha256: sha256, tableRowCount: 692 });
    expect(Object.isFrozen(pair)).toBe(true);
  });

  it.each([
    null,
    [],
    {},
    { expectedValue: 0, tableSha256: sha256, tableRowCount: 1, extra: true },
    { expectedValue: 0, tableSha256: "D".repeat(64), tableRowCount: 1 },
    { expectedValue: -1, tableSha256: sha256, tableRowCount: 1 },
    { expectedValue: 65536, tableSha256: sha256, tableRowCount: 4096 },
    { expectedValue: 1, tableSha256: sha256, tableRowCount: 1 },
    { expectedValue: 0, tableSha256: sha256, tableRowCount: 0 },
    { expectedValue: 0, tableSha256: sha256, tableRowCount: 65_537 },
  ])("rejects malformed provenance %#", (value) => {
    expect(readExistingAreaPlaceablePortraitProvenance(value)).toBeNull();
  });

  it.each([
    null,
    [],
    {},
    { expectedValue: 0, value: 1, tableSha256: sha256, tableRowCount: 2, extra: true },
    { expectedValue: 0, value: -1, tableSha256: sha256, tableRowCount: 2 },
    { expectedValue: 0, value: 2, tableSha256: sha256, tableRowCount: 2 },
    { expectedValue: 0, value: 0, tableSha256: sha256, tableRowCount: 2 },
  ])("rejects malformed or unchanged mutation %#", (value) => {
    expect(readExistingAreaPlaceablePortraitMutation(value)).toBeNull();
  });
});
