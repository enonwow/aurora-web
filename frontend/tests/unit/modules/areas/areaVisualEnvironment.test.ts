import { describe, expect, it } from "vitest";

import {
  areaVisualEnvironmentsEqual,
  encodeAreaDayNightMode,
  isAreaVisualEnvironment,
  toAreaVisualEnvironmentLightingFields,
} from "../../../../src/modules/areas/domain/areaVisualEnvironment";

const exact = () => ({
  dayNightMode: "cycle" as const,
  shadowOpacity: 65,
  chanceRain: 25,
  chanceSnow: 5,
  chanceLightning: 10,
  sun: {
    ambientColor: 0x112233,
    diffuseColor: 0x445566,
    fogColor: 0x778899,
    fogAmount: 7,
    shadows: true,
  },
  moon: {
    ambientColor: 0x223344,
    diffuseColor: 0x556677,
    fogColor: 0x8899aa,
    fogAmount: 11,
    shadows: false,
  },
});

describe("Area visual environment", () => {
  it("admits only the complete exact source-closed tuple", () => {
    expect(isAreaVisualEnvironment(exact())).toBe(true);
    expect(isAreaVisualEnvironment({ ...exact(), shadowOpacity: 101 })).toBe(false);
    expect(isAreaVisualEnvironment({ ...exact(), dayNightMode: "dusk" })).toBe(false);
    expect(isAreaVisualEnvironment({
      ...exact(),
      sun: { ...exact().sun, fogAmount: 16 },
    })).toBe(false);
    expect(isAreaVisualEnvironment({
      ...exact(),
      moon: { ...exact().moon, fogColor: 0x1_000000 },
    })).toBe(false);
    expect(isAreaVisualEnvironment({ ...exact(), lightingScheme: 3 })).toBe(false);
  });

  it("compares every root and nested phase field", () => {
    expect(areaVisualEnvironmentsEqual(exact(), exact())).toBe(true);
    expect(areaVisualEnvironmentsEqual(
      exact(),
      { ...exact(), moon: { ...exact().moon, shadows: true } },
    )).toBe(false);
  });

  it("encodes the three proven Aurora day/night pairs and all 16 renderer fields", () => {
    expect(encodeAreaDayNightMode("cycle")).toEqual({ dayNightCycle: 1, isNight: 0 });
    expect(encodeAreaDayNightMode("always_day")).toEqual({ dayNightCycle: 0, isNight: 0 });
    expect(encodeAreaDayNightMode("always_night")).toEqual({ dayNightCycle: 0, isNight: 1 });
    expect(toAreaVisualEnvironmentLightingFields(exact())).toEqual([
      { field: "DayNightCycle", value: 1 },
      { field: "IsNight", value: 0 },
      { field: "ShadowOpacity", value: 65 },
      { field: "ChanceRain", value: 25 },
      { field: "ChanceSnow", value: 5 },
      { field: "ChanceLightning", value: 10 },
      { field: "SunAmbientColor", value: 0x112233 },
      { field: "SunDiffuseColor", value: 0x445566 },
      { field: "SunFogColor", value: 0x778899 },
      { field: "SunFogAmount", value: 7 },
      { field: "SunShadows", value: 1 },
      { field: "MoonAmbientColor", value: 0x223344 },
      { field: "MoonDiffuseColor", value: 0x556677 },
      { field: "MoonFogColor", value: 0x8899aa },
      { field: "MoonFogAmount", value: 11 },
      { field: "MoonShadows", value: 0 },
    ]);
  });
});
