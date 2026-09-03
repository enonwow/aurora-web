import {
  readExistingAreaPlaceableBodyBagMutation,
  readExistingAreaPlaceableBodyBagProvenance,
} from "../../src/modules/areas/domain/area-placeable-body-bag";

describe("existing Area Placeable BodyBag domain", () => {
  const sha256 = "d".repeat(64);

  it("admits and freezes exact provenance and changed physical-row pairs", () => {
    const provenance = readExistingAreaPlaceableBodyBagProvenance({
      expectedValue: 0,
      tableSha256: sha256,
      tableRowCount: 1,
    });
    expect(provenance).toEqual({ expectedValue: 0, tableSha256: sha256, tableRowCount: 1 });
    expect(Object.isFrozen(provenance)).toBe(true);

    const pair = readExistingAreaPlaceableBodyBagMutation({
      expectedValue: 0,
      value: 255,
      tableSha256: sha256,
      tableRowCount: 256,
    });
    expect(pair).toEqual({ expectedValue: 0, value: 255, tableSha256: sha256, tableRowCount: 256 });
    expect(Object.isFrozen(pair)).toBe(true);
  });

  it.each([
    null,
    [],
    {},
    { expectedValue: 0, tableSha256: sha256, tableRowCount: 1, extra: true },
    { expectedValue: 0, tableSha256: "D".repeat(64), tableRowCount: 1 },
    { expectedValue: -1, tableSha256: sha256, tableRowCount: 1 },
    { expectedValue: 1, tableSha256: sha256, tableRowCount: 1 },
    { expectedValue: 0, tableSha256: sha256, tableRowCount: 0 },
    { expectedValue: 0, tableSha256: sha256, tableRowCount: 257 },
    Object.assign(Object.create({}), { expectedValue: 0, tableSha256: sha256, tableRowCount: 1 }),
  ])("rejects malformed provenance %#", (value) => {
    expect(readExistingAreaPlaceableBodyBagProvenance(value)).toBeNull();
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
    expect(readExistingAreaPlaceableBodyBagMutation(value)).toBeNull();
  });
});
