import { parseAreaMetadataFromAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { serializeAreaEditingDraftToAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-editing-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type { SupportedGffField } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type { AreaVisualEnvironment } from "../../src/modules/areas/domain/area-visual-environment";

const SOURCE: AreaVisualEnvironment = Object.freeze({
  dayNightMode: "cycle",
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

const TARGET: AreaVisualEnvironment = Object.freeze({
  dayNightMode: "always_night",
  shadowOpacity: 65,
  chanceRain: 100,
  chanceSnow: 25,
  chanceLightning: 0,
  sun: Object.freeze({
    ambientColor: 0xffffff,
    diffuseColor: 0,
    fogColor: 0xabcdef,
    fogAmount: 0,
    shadows: false,
  }),
  moon: Object.freeze({
    ambientColor: 0x010101,
    diffuseColor: 0x020202,
    fogColor: 0x030303,
    fogAmount: 14,
    shadows: true,
  }),
});

const ENVIRONMENT_FIELDS: readonly SupportedGffField[] = [
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

function sourceFields(environmentFields: readonly SupportedGffField[] = ENVIRONMENT_FIELDS) {
  return [
    { label: "EnvBefore", type: "cexostring", value: "preserve-before" },
    ...environmentFields,
    { label: "LightingScheme", type: "byte", value: 3 },
    { label: "SkyBox", type: "byte", value: 52 },
    { label: "WindPower", type: "int", value: 2 },
    { label: "FogClipDist", type: "float", value: 45.5 },
    { label: "EnvAfter", type: "cexostring", value: "preserve-after" },
    { label: "Width", type: "int", value: 1 },
    { label: "Height", type: "int", value: 1 },
    { label: "Tileset", type: "resref", value: "tin01" },
    { label: "Tile_List", type: "list", value: [{ typeId: 9, fields: [] }] },
  ] satisfies SupportedGffField[];
}

function serialize(
  mutation: { expectedValue: AreaVisualEnvironment; value: AreaVisualEnvironment } | undefined,
  fields: SupportedGffField[] = sourceFields(),
) {
  return serializeAreaEditingDraftToAreGff({
    areaResRef: "area_test",
    name: "Area Test",
    width: 1,
    height: 1,
    tilesetResRef: "tin01",
    visualEnvironment: mutation,
    tiles: [{ row: 0, col: 0, sourceRow: 0, sourceCol: 0, tileId: 12, orientation: 0, height: 0 }],
  }, {
    rootStructTypeId: 42,
    fields,
  });
}

describe("exact ARE visual-environment writer profile", () => {
  it("replaces the complete 16-field tuple and preserves all excluded fields in order", () => {
    const bytes = serialize({ expectedValue: SOURCE, value: TARGET });
    expect(parseAreaMetadataFromAreGff(bytes)?.visualEnvironment).toEqual(TARGET);

    const document = parseRawGffDocument(bytes);
    expect(document?.rootStructTypeId).toBe(42);
    const fields = document?.fields ?? [];
    expect(fields.slice(0, 18)).toEqual([
      { label: "EnvBefore", type: "cexostring", value: "preserve-before" },
      { label: "DayNightCycle", type: "byte", value: 0 },
      { label: "IsNight", type: "byte", value: 1 },
      { label: "ShadowOpacity", type: "byte", value: 65 },
      { label: "ChanceRain", type: "int", value: 100 },
      { label: "ChanceSnow", type: "int", value: 25 },
      { label: "ChanceLightning", type: "int", value: 0 },
      { label: "SunAmbientColor", type: "dword", value: 0xffffff },
      { label: "SunDiffuseColor", type: "dword", value: 0 },
      { label: "SunFogColor", type: "dword", value: 0xabcdef },
      { label: "SunFogAmount", type: "byte", value: 0 },
      { label: "SunShadows", type: "byte", value: 0 },
      { label: "MoonAmbientColor", type: "dword", value: 0x010101 },
      { label: "MoonDiffuseColor", type: "dword", value: 0x020202 },
      { label: "MoonFogColor", type: "dword", value: 0x030303 },
      { label: "MoonFogAmount", type: "byte", value: 14 },
      { label: "MoonShadows", type: "byte", value: 1 },
      { label: "LightingScheme", type: "byte", value: 3 },
    ]);
    expect(fields).toEqual(expect.arrayContaining([
      { label: "SkyBox", type: "byte", value: 52 },
      { label: "WindPower", type: "int", value: 2 },
      { label: "FogClipDist", type: "float", value: 45.5 },
      { label: "EnvAfter", type: "cexostring", value: "preserve-after" },
    ]));
  });

  it("preserves the complete profile when no mutation is requested", () => {
    expect(parseAreaMetadataFromAreGff(serialize(undefined))?.visualEnvironment).toEqual(SOURCE);
  });

  it.each<[string, SupportedGffField[], string]>([
    ["missing field", sourceFields(ENVIRONMENT_FIELDS.slice(1)), "not admitted"],
    ["duplicate case ambiguity", sourceFields([
      ...ENVIRONMENT_FIELDS,
      { label: "SHADOWOPACITY", type: "byte", value: 50 },
    ]), "not admitted"],
    ["wrong type", sourceFields(ENVIRONMENT_FIELDS.map((field) =>
      field.label === "ChanceRain"
        ? { label: "ChanceRain", type: "dword", value: 20 }
        : field)), "not admitted"],
  ])("rejects a %s source profile", (_label, fields, error) => {
    expect(() => serialize({ expectedValue: SOURCE, value: TARGET }, fields)).toThrow(error);
  });

  it("rejects stale, unchanged, and malformed CAS tuples", () => {
    expect(() => serialize({
      expectedValue: { ...SOURCE, chanceRain: 21 },
      value: TARGET,
    })).toThrow("expectedValue does not match");
    expect(() => serialize({ expectedValue: SOURCE, value: SOURCE })).toThrow("changed admitted complete CAS pair");
    expect(() => serialize({
      expectedValue: SOURCE,
      value: { ...TARGET, shadowOpacity: 101 },
    })).toThrow("changed admitted complete CAS pair");
  });

  it("rejects mutation without retained ARE provenance", () => {
    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test",
      name: "Area Test",
      width: 1,
      height: 1,
      tilesetResRef: "tin01",
      visualEnvironment: { expectedValue: SOURCE, value: TARGET },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    })).toThrow("requires retained ARE preservation");
  });
});
