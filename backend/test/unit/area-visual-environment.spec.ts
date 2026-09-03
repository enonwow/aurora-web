import {
  areaVisualEnvironmentsEqual,
  decodeAreaDayNightMode,
  encodeAreaDayNightMode,
  isAreaVisualEnvironment,
} from "../../src/modules/areas/domain/area-visual-environment";

describe("Area visual-environment core contract", () => {
  const source = Object.freeze({
    dayNightMode: "cycle" as const,
    shadowOpacity: 50,
    chanceRain: 20,
    chanceSnow: 0,
    chanceLightning: 35,
    sun: Object.freeze({
      ambientColor: 0x112233,
      diffuseColor: 0x445566,
      fogColor: 0x778899,
      fogAmount: 7,
      shadows: true,
    }),
    moon: Object.freeze({
      ambientColor: 0xaabbcc,
      diffuseColor: 0xddeeff,
      fogColor: 0x010203,
      fogAmount: 15,
      shadows: false,
    }),
  });

  it("accepts one exact complete source-closed tuple and all admitted boundaries", () => {
    expect(isAreaVisualEnvironment(source)).toBe(true);
    expect(isAreaVisualEnvironment({
      ...source,
      dayNightMode: "always_night",
      shadowOpacity: 100,
      chanceRain: 0,
      chanceSnow: 100,
      chanceLightning: 100,
      sun: {
        ambientColor: 0,
        diffuseColor: 0xffffff,
        fogColor: 0,
        fogAmount: 0,
        shadows: false,
      },
    })).toBe(true);
  });

  it.each([
    ["missing root member", (({ moon: _removed, ...value }) => value)(source)],
    ["unknown root member", { ...source, skyBox: 2 }],
    ["unknown phase member", { ...source, sun: { ...source.sun, intensity: 1 } }],
    ["invalid mode", { ...source, dayNightMode: "dark" }],
    ["negative percent", { ...source, chanceRain: -1 }],
    ["percent above 100", { ...source, shadowOpacity: 101 }],
    ["fractional percent", { ...source, chanceSnow: 0.5 }],
    ["negative color", { ...source, moon: { ...source.moon, fogColor: -1 } }],
    ["color above RGB", { ...source, sun: { ...source.sun, ambientColor: 0x1000000 } }],
    ["fractional color", { ...source, moon: { ...source.moon, diffuseColor: 1.5 } }],
    ["fog amount below range", { ...source, sun: { ...source.sun, fogAmount: -1 } }],
    ["fog amount above range", { ...source, moon: { ...source.moon, fogAmount: 16 } }],
    ["numeric shadow", { ...source, sun: { ...source.sun, shadows: 1 } }],
  ])("rejects %s", (_label, value) => {
    expect(isAreaVisualEnvironment(value)).toBe(false);
  });

  it("maps only the three exact native DayNightCycle/IsNight pairs", () => {
    expect(decodeAreaDayNightMode(1, 0)).toBe("cycle");
    expect(decodeAreaDayNightMode(0, 0)).toBe("always_day");
    expect(decodeAreaDayNightMode(0, 1)).toBe("always_night");
    expect(decodeAreaDayNightMode(1, 1)).toBeUndefined();
    expect(decodeAreaDayNightMode(2, 0)).toBeUndefined();
    expect(decodeAreaDayNightMode(0, 2)).toBeUndefined();

    expect(encodeAreaDayNightMode("cycle")).toEqual({ dayNightCycle: 1, isNight: 0 });
    expect(encodeAreaDayNightMode("always_day")).toEqual({ dayNightCycle: 0, isNight: 0 });
    expect(encodeAreaDayNightMode("always_night")).toEqual({ dayNightCycle: 0, isNight: 1 });
  });

  it("compares every nested member without normalization", () => {
    expect(areaVisualEnvironmentsEqual(source, {
      ...source,
      sun: { ...source.sun },
      moon: { ...source.moon },
    })).toBe(true);
    expect(areaVisualEnvironmentsEqual(source, {
      ...source,
      moon: { ...source.moon, fogAmount: 14 },
    })).toBe(false);
    expect(areaVisualEnvironmentsEqual(source, { ...source, extra: 1 })).toBe(false);
  });
});
