import {
  areaModuleStartLocationsEqual,
  isAreaModuleStartLocation,
  normalizeAreaModuleStartLocation,
} from "../../src/modules/areas/domain/area-module-start-location";

describe("Area module start-location contract", () => {
  const source = Object.freeze({
    areaResRef: "area001",
    x: Math.fround(1.25),
    y: Math.fround(-2.5),
    z: Math.fround(0.125),
    directionX: Math.fround(0.6),
    directionY: Math.fround(0.8),
  });

  it("accepts only canonical exact binary32 tuples", () => {
    expect(isAreaModuleStartLocation(source)).toBe(true);
    expect(isAreaModuleStartLocation({ ...source, areaResRef: "AREA001" })).toBe(false);
    expect(isAreaModuleStartLocation({ ...source, areaResRef: 123 })).toBe(false);
    expect(isAreaModuleStartLocation({ ...source, x: Number.MAX_VALUE })).toBe(false);
    expect(isAreaModuleStartLocation({ ...source, x: 1 / 3 })).toBe(false);
    expect(isAreaModuleStartLocation({ ...source, extra: true })).toBe(false);
  });

  it("normalizes finite transport numbers to the exact stored binary32 tuple", () => {
    const normalized = normalizeAreaModuleStartLocation({
      areaResRef: "area001",
      x: 1 / 3,
      y: -0,
      z: 2,
      directionX: 0.1,
      directionY: 0.2,
    });

    expect(normalized).toEqual({
      areaResRef: "area001",
      x: Math.fround(1 / 3),
      y: 0,
      z: 2,
      directionX: Math.fround(0.1),
      directionY: Math.fround(0.2),
    });
    expect(isAreaModuleStartLocation(normalized)).toBe(true);
  });

  it("rejects lossy or ambiguous transport values and compares complete tuples", () => {
    expect(normalizeAreaModuleStartLocation({ ...source, x: Number.POSITIVE_INFINITY })).toBeNull();
    expect(normalizeAreaModuleStartLocation({ ...source, directionY: Number.MAX_VALUE })).toBeNull();
    expect(normalizeAreaModuleStartLocation({ ...source, areaResRef: "../area" })).toBeNull();
    expect(areaModuleStartLocationsEqual(source, { ...source })).toBe(true);
    expect(areaModuleStartLocationsEqual(source, { ...source, directionY: 0 })).toBe(false);
  });
});
