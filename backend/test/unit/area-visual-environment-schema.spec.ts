import { parseAreaEditingExportDraft } from "../../src/modules/areas/adapters/inbound/http/area-editing.schemas";

function baseDraft() {
  return {
    areaResRef: "visual_test",
    name: "Visual Test",
    width: 2,
    height: 2,
    tilesetResRef: "tin01",
    tilesetFingerprint: "a".repeat(64),
    tiles: [
      { row: 0, col: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 1, tileId: 0, orientation: 0, height: 0 },
    ],
  };
}

function environment() {
  return {
    dayNightMode: "cycle" as const,
    shadowOpacity: 50,
    chanceRain: 20,
    chanceSnow: 0,
    chanceLightning: 35,
    sun: {
      ambientColor: 0x112233,
      diffuseColor: 0x445566,
      fogColor: 0x778899,
      fogAmount: 7,
      shadows: true,
    },
    moon: {
      ambientColor: 0xaabbcc,
      diffuseColor: 0xddeeff,
      fogColor: 0x010203,
      fogAmount: 15,
      shadows: false,
    },
  };
}

describe("Area visual-environment HTTP schema", () => {
  it("accepts one exact changed complete CAS pair", () => {
    const mutation = {
      expectedValue: environment(),
      value: {
        ...environment(),
        dayNightMode: "always_night" as const,
        shadowOpacity: 65,
        sun: { ...environment().sun, fogAmount: 8 },
      },
    };
    expect(parseAreaEditingExportDraft({
      ...baseDraft(),
      visualEnvironment: mutation,
    }).visualEnvironment).toEqual(mutation);
  });

  it.each<[string, unknown]>([
    ["unchanged tuple", { expectedValue: environment(), value: environment() }],
    ["missing nested member", {
      expectedValue: environment(),
      value: { ...environment(), sun: { ambientColor: 0 } },
    }],
    ["unknown member", {
      expectedValue: environment(),
      value: { ...environment(), skyBox: 2 },
    }],
    ["invalid mode", {
      expectedValue: environment(),
      value: { ...environment(), dayNightMode: "dark" },
    }],
    ["percent above range", {
      expectedValue: environment(),
      value: { ...environment(), chanceRain: 101 },
    }],
    ["color above RGB", {
      expectedValue: environment(),
      value: { ...environment(), moon: { ...environment().moon, fogColor: 0x1000000 } },
    }],
    ["fog above scale", {
      expectedValue: environment(),
      value: { ...environment(), sun: { ...environment().sun, fogAmount: 16 } },
    }],
  ])("rejects %s", (_label, mutation) => {
    expect(() => parseAreaEditingExportDraft({
      ...baseDraft(),
      visualEnvironment: mutation,
    })).toThrow();
  });
});
