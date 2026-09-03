import { parseAreaMetadataFromAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const FIELDS: readonly SupportedGffField[] = [
  { label: "DayNightCycle", type: "byte", value: 1 },
  { label: "IsNight", type: "byte", value: 0 },
  { label: "ShadowOpacity", type: "byte", value: 50 },
  { label: "ChanceRain", type: "int", value: 20 },
  { label: "ChanceSnow", type: "int", value: 0 },
  { label: "ChanceLightning", type: "int", value: 35 },
  { label: "SunAmbientColor", type: "dword", value: 0x112233 },
  { label: "SunDiffuseColor", type: "dword", value: 0x445566 },
  { label: "SunFogColor", type: "dword", value: 0x778899 },
  { label: "SunFogAmount", type: "byte", value: 7 },
  { label: "SunShadows", type: "byte", value: 1 },
  { label: "MoonAmbientColor", type: "dword", value: 0xaabbcc },
  { label: "MoonDiffuseColor", type: "dword", value: 0xddeeff },
  { label: "MoonFogColor", type: "dword", value: 0x010203 },
  { label: "MoonFogAmount", type: "byte", value: 15 },
  { label: "MoonShadows", type: "byte", value: 0 },
];

function parse(fields: readonly SupportedGffField[]) {
  return parseAreaMetadataFromAreGff(buildGffBuffer([...fields], "ARE ", 0xffff_ffff));
}

function replaceField(label: string, replacement: SupportedGffField): SupportedGffField[] {
  return FIELDS.map((field) => field.label === label ? replacement : field);
}

describe("exact ARE visual-environment parser profile", () => {
  it("exposes one complete exact core tuple", () => {
    expect(parse(FIELDS)?.visualEnvironment).toEqual({
      dayNightMode: "cycle",
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
    });
  });

  it.each<[string, SupportedGffField[]]>([
    ["missing field", [...FIELDS.slice(1)]],
    ["invalid day/night pair", replaceField("IsNight", { label: "IsNight", type: "byte", value: 1 })],
    ["wrong case", replaceField("ChanceRain", { label: "chancerain", type: "int", value: 20 })],
    ["wrong type", replaceField("SunFogColor", { label: "SunFogColor", type: "int", value: 0x778899 })],
    ["duplicate case ambiguity", [
      ...FIELDS,
      { label: "SHADOWOPACITY", type: "byte", value: 50 },
    ]],
    ["weather outside percent", replaceField("ChanceSnow", { label: "ChanceSnow", type: "int", value: 101 })],
    ["color outside packed RGB", replaceField("MoonAmbientColor", {
      label: "MoonAmbientColor",
      type: "dword",
      value: 0x1000000,
    })],
    ["fog amount outside runtime scale", replaceField("SunFogAmount", { label: "SunFogAmount", type: "byte", value: 16 })],
    ["shadow flag outside boolean byte", replaceField("MoonShadows", { label: "MoonShadows", type: "byte", value: 2 })],
  ])("keeps a %s profile preserve-only", (_label, fields) => {
    expect(parse(fields)?.visualEnvironment).toBeUndefined();
  });

  it("includes the admitted tuple in dependency identity", () => {
    const first = parse(FIELDS);
    const second = parse(replaceField("SunFogAmount", {
      label: "SunFogAmount",
      type: "byte",
      value: 8,
    }));

    expect(first?.visualEnvironment?.sun.fogAmount).toBe(7);
    expect(second?.visualEnvironment?.sun.fogAmount).toBe(8);
    expect(first?.dependencyFingerprint).not.toBe(second?.dependencyFingerprint);
  });
});
