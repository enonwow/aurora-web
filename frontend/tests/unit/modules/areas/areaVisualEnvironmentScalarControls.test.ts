import { describe, expect, it } from "vitest";

import {
  areaVisualEnvironmentScalarControlsEqual,
  cloneAreaVisualEnvironmentScalarControls,
  isAreaVisualEnvironmentScalarControls,
  toAreaVisualEnvironmentScalarLightingFields,
} from "../../../../src/modules/areas/domain/areaVisualEnvironmentScalarControls";

describe("Area visual-environment scalar controls", () => {
  it("admits only the exact source-closed integer pair", () => {
    expect(isAreaVisualEnvironmentScalarControls({
      fogClipDistance: 30,
      windPower: 0,
    })).toBe(true);
    expect(isAreaVisualEnvironmentScalarControls({
      fogClipDistance: 9999,
      windPower: 2,
    })).toBe(true);

    for (const value of [
      { fogClipDistance: 29, windPower: 0 },
      { fogClipDistance: 10_000, windPower: 0 },
      { fogClipDistance: 45.5, windPower: 0 },
      { fogClipDistance: 45, windPower: -1 },
      { fogClipDistance: 45, windPower: 3 },
      { fogClipDistance: 45, windPower: 1.5 },
      { fogClipDistance: 45 },
      { fogClipDistance: 45, windPower: 1, skyBox: 2 },
    ]) {
      expect(isAreaVisualEnvironmentScalarControls(value)).toBe(false);
    }
  });

  it("clones, compares, and maps exactly FogClipDist/WindPower", () => {
    const source = { fogClipDistance: 45, windPower: 0 };
    const clone = cloneAreaVisualEnvironmentScalarControls(source);

    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(areaVisualEnvironmentScalarControlsEqual(source, clone)).toBe(true);
    expect(areaVisualEnvironmentScalarControlsEqual(source, {
      fogClipDistance: 120,
      windPower: 2,
    })).toBe(false);
    expect(toAreaVisualEnvironmentScalarLightingFields({
      fogClipDistance: 120,
      windPower: 2,
    })).toEqual([
      { field: "FogClipDist", value: 120 },
      { field: "WindPower", value: 2 },
    ]);
  });
});
