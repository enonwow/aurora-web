import { parseAreaMetadataFromAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { serializeAreaEditingDraftToAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-editing-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type { SupportedGffField } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type { ResolvedAreaVisualEnvironmentCatalogSelectionMutation } from "../../src/modules/areas/domain/area-visual-environment-catalog-selection-mutation";

const SOURCE_VISUAL = Object.freeze({
  dayNightMode: "always_day" as const,
  shadowOpacity: 25,
  chanceRain: 10,
  chanceSnow: 0,
  chanceLightning: 5,
  sun: Object.freeze({
    ambientColor: 0x030201, diffuseColor: 0x060504, fogColor: 0x090807,
    fogAmount: 2, shadows: true,
  }),
  moon: Object.freeze({
    ambientColor: 0x0c0b0a, diffuseColor: 0x0f0e0d, fogColor: 0x121110,
    fogAmount: 3, shadows: false,
  }),
});
const TARGET_VISUAL = Object.freeze({
  dayNightMode: "cycle" as const,
  shadowOpacity: 65,
  chanceRain: 40,
  chanceSnow: 20,
  chanceLightning: 30,
  sun: Object.freeze({
    ambientColor: 0x222111, diffuseColor: 0x444333, fogColor: 0x666555,
    fogAmount: 7, shadows: true,
  }),
  moon: Object.freeze({
    ambientColor: 0x888777, diffuseColor: 0xaaa999, fogColor: 0xcccbbb,
    fogAmount: 8, shadows: true,
  }),
});

function sourceFields(): SupportedGffField[] {
  return [
    { label: "Before", type: "cexostring", value: "keep" },
    { label: "LightingScheme", type: "byte", value: 0 },
    { label: "SkyBox", type: "byte", value: 0 },
    { label: "DayNightCycle", type: "byte", value: 0 },
    { label: "IsNight", type: "byte", value: 0 },
    { label: "ShadowOpacity", type: "byte", value: 25 },
    { label: "ChanceRain", type: "int", value: 10 },
    { label: "ChanceSnow", type: "int", value: 0 },
    { label: "ChanceLightning", type: "int", value: 5 },
    { label: "SunAmbientColor", type: "dword", value: 0x030201 },
    { label: "SunDiffuseColor", type: "dword", value: 0x060504 },
    { label: "SunFogColor", type: "dword", value: 0x090807 },
    { label: "SunFogAmount", type: "byte", value: 2 },
    { label: "SunShadows", type: "byte", value: 1 },
    { label: "MoonAmbientColor", type: "dword", value: 0x0c0b0a },
    { label: "MoonDiffuseColor", type: "dword", value: 0x0f0e0d },
    { label: "MoonFogColor", type: "dword", value: 0x121110 },
    { label: "MoonFogAmount", type: "byte", value: 3 },
    { label: "MoonShadows", type: "byte", value: 0 },
    { label: "FogClipDist", type: "float", value: 45 },
    { label: "WindPower", type: "int", value: 0 },
    { label: "After", type: "cexostring", value: "keep-too" },
    { label: "Width", type: "int", value: 1 },
    { label: "Height", type: "int", value: 1 },
    { label: "Tileset", type: "resref", value: "tin01" },
    { label: "Tile_List", type: "list", value: [{ typeId: 9, fields: [] }] },
  ];
}

function resolved(lightingSchemeChanged = true): ResolvedAreaVisualEnvironmentCatalogSelectionMutation {
  return {
    catalogIdentity: {
      environmentSha256: "a".repeat(64),
      skyBoxesSha256: "b".repeat(64),
    },
    expectedValue: {
      lightingSchemeRowIndex: 0,
      skyBoxRowIndex: 0,
      visualEnvironment: SOURCE_VISUAL,
      visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
    },
    value: {
      lightingSchemeRowIndex: lightingSchemeChanged ? 1 : 0,
      skyBoxRowIndex: 1,
      visualEnvironment: lightingSchemeChanged ? TARGET_VISUAL : SOURCE_VISUAL,
      visualEnvironmentScalarControls: lightingSchemeChanged
        ? { fogClipDistance: 120, windPower: 2 }
        : { fogClipDistance: 45, windPower: 0 },
    },
    lightingSchemeChanged,
  };
}

function serialize(
  mutation: ResolvedAreaVisualEnvironmentCatalogSelectionMutation,
  fields = sourceFields(),
) {
  return serializeAreaEditingDraftToAreGff({
    areaResRef: "area_test",
    name: "Area Test",
    width: 1,
    height: 1,
    tilesetResRef: "tin01",
    visualEnvironmentCatalogSelection: mutation,
    tiles: [{
      row: 0, col: 0, sourceRow: 0, sourceCol: 0,
      tileId: 12, orientation: 0, height: 0,
    }],
  }, { rootStructTypeId: 42, fields });
}

describe("catalog-bound ARE visual selection writer", () => {
  it("writes the selection and complete final environment for a Lighting Scheme change", () => {
    const bytes = serialize(resolved());
    const metadata = parseAreaMetadataFromAreGff(bytes);
    expect(metadata?.visualEnvironmentCatalogSelection).toEqual({
      lightingSchemeRowIndex: 1,
      skyBoxRowIndex: 1,
    });
    expect(metadata?.visualEnvironment).toEqual(TARGET_VISUAL);
    expect(metadata?.visualEnvironmentScalarControls).toEqual({
      fogClipDistance: 120,
      windPower: 2,
    });
    expect(parseRawGffDocument(bytes)?.fields).toEqual(expect.arrayContaining([
      { label: "Before", type: "cexostring", value: "keep" },
      { label: "After", type: "cexostring", value: "keep-too" },
    ]));
  });

  it("writes only SkyBox for a Sky-Box-only selection", () => {
    const bytes = serialize(resolved(false));
    const metadata = parseAreaMetadataFromAreGff(bytes);
    expect(metadata?.visualEnvironmentCatalogSelection).toEqual({
      lightingSchemeRowIndex: 0,
      skyBoxRowIndex: 1,
    });
    expect(metadata?.visualEnvironment).toEqual(SOURCE_VISUAL);
    expect(metadata?.visualEnvironmentScalarControls).toEqual({
      fogClipDistance: 45,
      windPower: 0,
    });
  });

  it("rejects stale retained state, duplicate selection fields, and competing core CAS", () => {
    expect(() => serialize({
      ...resolved(),
      expectedValue: { ...resolved().expectedValue, lightingSchemeRowIndex: 2 },
    })).toThrow("expectedValue does not match");
    expect(() => serialize(resolved(), [
      ...sourceFields(),
      { label: "SKYBOX", type: "byte", value: 0 },
    ])).toThrow("not admitted");
    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test",
      name: "Area Test",
      width: 1,
      height: 1,
      tilesetResRef: "tin01",
      visualEnvironmentCatalogSelection: resolved(),
      visualEnvironment: {
        expectedValue: SOURCE_VISUAL,
        value: TARGET_VISUAL,
      },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, { rootStructTypeId: 42, fields: sourceFields() }))
      .toThrow("cannot compete");
  });

  it("requires retained ARE preservation", () => {
    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test",
      name: "Area Test",
      width: 1,
      height: 1,
      tilesetResRef: "tin01",
      visualEnvironmentCatalogSelection: resolved(),
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    })).toThrow("requires retained ARE preservation");
  });
});
