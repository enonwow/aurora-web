import {
  areaVisualEnvironmentScalarControlsEqual,
  isAreaVisualEnvironmentScalarControls,
} from "../../src/modules/areas/domain/area-visual-environment-scalar-controls";

describe("Area visual-environment scalar controls", () => {
  it.each([
    { fogClipDistance: 30, windPower: 0 },
    { fogClipDistance: 45, windPower: 1 },
    { fogClipDistance: 9999, windPower: 2 },
  ])("admits the exact native integer domain: %j", (value) => {
    expect(isAreaVisualEnvironmentScalarControls(value)).toBe(true);
  });

  it.each<[string, unknown]>([
    ["missing member", { fogClipDistance: 45 }],
    ["unknown member", { fogClipDistance: 45, windPower: 0, skyBox: 0 }],
    ["fractional float", { fogClipDistance: 45.5, windPower: 0 }],
    ["non-finite float", { fogClipDistance: Number.POSITIVE_INFINITY, windPower: 0 }],
    ["fog below minimum", { fogClipDistance: 29, windPower: 0 }],
    ["fog above maximum", { fogClipDistance: 10000, windPower: 0 }],
    ["wind below minimum", { fogClipDistance: 45, windPower: -1 }],
    ["wind above maximum", { fogClipDistance: 45, windPower: 3 }],
    ["wrong numeric type", { fogClipDistance: "45", windPower: 0 }],
  ])("rejects %s", (_label, value) => {
    expect(isAreaVisualEnvironmentScalarControls(value)).toBe(false);
  });

  it("compares only admitted exact values", () => {
    const source = { fogClipDistance: 45, windPower: 0 };
    expect(areaVisualEnvironmentScalarControlsEqual(source, { ...source })).toBe(true);
    expect(areaVisualEnvironmentScalarControlsEqual(source, {
      fogClipDistance: 46,
      windPower: 0,
    })).toBe(false);
    expect(areaVisualEnvironmentScalarControlsEqual(source, {
      ...source,
      skyBox: 0,
    })).toBe(false);
  });
});
