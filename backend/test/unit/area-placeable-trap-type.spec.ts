import {
  readExistingAreaPlaceableTrapTypeMutation,
  readExistingAreaPlaceableTrapTypeProvenance,
} from "../../src/modules/areas/domain/area-placeable-trap-type";

describe("existing Area Placeable TrapType domain", () => {
  const sha256 = "d".repeat(64);

  it("admits and freezes exact provenance and changed pairs at native boundaries", () => {
    const first = readExistingAreaPlaceableTrapTypeProvenance({
      expectedValue: 0,
      tableSha256: sha256,
      tableRowCount: 1,
    });
    expect(first).toEqual({ expectedValue: 0, tableSha256: sha256, tableRowCount: 1 });
    expect(Object.isFrozen(first)).toBe(true);

    const pair = readExistingAreaPlaceableTrapTypeMutation({
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
    { expectedValue: 0, tableSha256: "d".repeat(64), tableRowCount: 1, extra: true },
    { expectedValue: 0, tableSha256: "D".repeat(64), tableRowCount: 1 },
    { expectedValue: 0, tableSha256: BigInt("1".repeat(64)), tableRowCount: 1 },
    { expectedValue: -1, tableSha256: "d".repeat(64), tableRowCount: 1 },
    { expectedValue: 0.5, tableSha256: "d".repeat(64), tableRowCount: 1 },
    { expectedValue: 1, tableSha256: "d".repeat(64), tableRowCount: 1 },
    { expectedValue: 0, tableSha256: "d".repeat(64), tableRowCount: 0 },
    { expectedValue: 0, tableSha256: "d".repeat(64), tableRowCount: 257 },
    Object.assign(Object.create({}), {
      expectedValue: 0,
      tableSha256: "d".repeat(64),
      tableRowCount: 1,
    }),
  ])("rejects malformed provenance %#", (value) => {
    expect(readExistingAreaPlaceableTrapTypeProvenance(value)).toBeNull();
  });

  it.each([
    null,
    [],
    {},
    { expectedValue: 0, value: 1, tableSha256: "d".repeat(64), tableRowCount: 2, extra: true },
    { expectedValue: 0, value: -1, tableSha256: "d".repeat(64), tableRowCount: 2 },
    { expectedValue: 0, value: 0.5, tableSha256: "d".repeat(64), tableRowCount: 2 },
    { expectedValue: 0, value: 2, tableSha256: "d".repeat(64), tableRowCount: 2 },
    { expectedValue: 0, value: 0, tableSha256: "d".repeat(64), tableRowCount: 2 },
  ])("rejects malformed or unchanged pair %#", (value) => {
    expect(readExistingAreaPlaceableTrapTypeMutation(value)).toBeNull();
  });
});
