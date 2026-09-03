import { describe, expect, it } from "vitest";

import {
  areaModuleStartLocationsEqual,
  isAreaModuleStartLocation,
  normalizeAreaModuleStartLocation,
  readModuleStartLocationTargets,
} from "../../../../src/modules/areas/domain/areaModuleStartLocation";

const source = {
  areaResRef: "crypt01",
  x: Math.fround(1.25),
  y: Math.fround(2.5),
  z: Math.fround(3.75),
  directionX: Math.fround(0),
  directionY: Math.fround(1),
};

describe("Area module Start Location", () => {
  it("admits only one exact canonical six-field binary32 tuple", () => {
    expect(isAreaModuleStartLocation(source)).toBe(true);
    expect(isAreaModuleStartLocation({ ...source, areaResRef: "CRYPT01" })).toBe(false);
    expect(isAreaModuleStartLocation({ ...source, x: 0.1 })).toBe(false);
    expect(isAreaModuleStartLocation({ ...source, bearing: 0 })).toBe(false);
    const { directionY: _missing, ...incomplete } = source;
    expect(isAreaModuleStartLocation(incomplete)).toBe(false);
  });

  it("normalizes finite UI numbers exactly once to canonical binary32 storage", () => {
    expect(normalizeAreaModuleStartLocation({
      ...source,
      x: 0.1,
      directionX: -0,
    })).toEqual({
      ...source,
      x: Math.fround(0.1),
      directionX: 0,
    });
    expect(normalizeAreaModuleStartLocation({
      ...source,
      z: Number.POSITIVE_INFINITY,
    })).toBeNull();
  });

  it("compares every tuple member without coordinate tolerances", () => {
    expect(areaModuleStartLocationsEqual(source, { ...source })).toBe(true);
    expect(areaModuleStartLocationsEqual(source, {
      ...source,
      directionY: Math.fround(-1),
    })).toBe(false);
  });

  it("admits only a bounded sorted duplicate-free target catalog and clones it", () => {
    const targets = ["crypt01", "other_area"];
    const parsed = readModuleStartLocationTargets(targets);
    expect(parsed).toEqual(targets);
    expect(parsed).not.toBe(targets);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(readModuleStartLocationTargets([])).toBeNull();
    expect(readModuleStartLocationTargets(["other_area", "crypt01"])).toBeNull();
    expect(readModuleStartLocationTargets(["crypt01", "crypt01"])).toBeNull();
    expect(readModuleStartLocationTargets(["CRYPT01"])).toBeNull();
  });
});
