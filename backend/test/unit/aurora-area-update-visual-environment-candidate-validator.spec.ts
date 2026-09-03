import { validateAreaUpdateCandidate } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-update-candidate-validator";
import { serializeAreaEditingDraftToAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-editing-writer";
import type { ProjectedAreaUpdateDraft } from "../../src/modules/areas/domain/area-update-draft-projector";
import type { AreaVisualEnvironment } from "../../src/modules/areas/domain/area-visual-environment";
import type { ResolvedAreaVisualEnvironmentCatalogSelectionMutation } from "../../src/modules/areas/domain/area-visual-environment-catalog-selection-mutation";

const SOURCE: AreaVisualEnvironment = {
  dayNightMode: "cycle",
  shadowOpacity: 50,
  chanceRain: 20,
  chanceSnow: 0,
  chanceLightning: 35,
  sun: { ambientColor: 0x112233, diffuseColor: 0x445566, fogColor: 0x778899, fogAmount: 7, shadows: true },
  moon: { ambientColor: 0xaabbcc, diffuseColor: 0xddeeff, fogColor: 0x010203, fogAmount: 15, shadows: false },
};
const TARGET: AreaVisualEnvironment = {
  ...SOURCE,
  dayNightMode: "always_day",
  shadowOpacity: 65,
  sun: { ...SOURCE.sun, fogAmount: 8 },
};

function draft(value: AreaVisualEnvironment = TARGET): ProjectedAreaUpdateDraft {
  return {
    areaResRef: "crypt01",
    name: "Crypt 01",
    width: 2,
    height: 2,
    tilesetResRef: "tin01",
    tilesetFingerprint: "e".repeat(64),
    areaFingerprint: "a".repeat(64),
    visualEnvironment: { expectedValue: SOURCE, value },
    tiles: [tile(0, 0), tile(0, 1), tile(1, 0), tile(1, 1)],
  };
}

function tile(row: number, col: number) {
  return {
    row,
    col,
    sourceRow: row,
    sourceCol: col,
    tileId: 12,
    orientation: 0,
    height: 0,
    mainLight1: 0,
    mainLight2: 0,
    sourceLight1: 0,
    sourceLight2: 0,
    animLoop1: 1,
    animLoop2: 1,
    animLoop3: 1,
  };
}

function preservation() {
  return {
    rootStructTypeId: 0xffff_ffff,
    fields: [
      { label: "DayNightCycle", type: "byte" as const, value: 1 },
      { label: "IsNight", type: "byte" as const, value: 0 },
      { label: "ShadowOpacity", type: "byte" as const, value: 50 },
      { label: "ChanceRain", type: "int" as const, value: 20 },
      { label: "ChanceSnow", type: "int" as const, value: 0 },
      { label: "ChanceLightning", type: "int" as const, value: 35 },
      { label: "SunAmbientColor", type: "dword" as const, value: 0x112233 },
      { label: "SunDiffuseColor", type: "dword" as const, value: 0x445566 },
      { label: "SunFogColor", type: "dword" as const, value: 0x778899 },
      { label: "SunFogAmount", type: "byte" as const, value: 7 },
      { label: "SunShadows", type: "byte" as const, value: 1 },
      { label: "MoonAmbientColor", type: "dword" as const, value: 0xaabbcc },
      { label: "MoonDiffuseColor", type: "dword" as const, value: 0xddeeff },
      { label: "MoonFogColor", type: "dword" as const, value: 0x010203 },
      { label: "MoonFogAmount", type: "byte" as const, value: 15 },
      { label: "MoonShadows", type: "byte" as const, value: 0 },
      { label: "FogClipDist", type: "float" as const, value: 45 },
      { label: "WindPower", type: "int" as const, value: 0 },
      { label: "LightingScheme", type: "byte" as const, value: 0 },
      { label: "SkyBox", type: "byte" as const, value: 0 },
      { label: "Width", type: "int" as const, value: 2 },
      { label: "Height", type: "int" as const, value: 2 },
      { label: "Tileset", type: "resref" as const, value: "tin01" },
      {
        label: "Tile_List",
        type: "list" as const,
        value: Array.from({ length: 4 }, () => ({ typeId: 0, fields: [] })),
      },
    ],
  };
}

describe("Area visual-environment candidate validation", () => {
  it("accepts an exact independently parsed target tuple", () => {
    const expected = draft();
    const candidate = serializeAreaEditingDraftToAreGff(expected, preservation());
    expect(validateAreaUpdateCandidate(expected, candidate)).toEqual({ valid: true, issues: [] });
  });

  it("rejects a readable candidate whose visual tuple drifted", () => {
    const expected = draft();
    const drift = { ...TARGET, moon: { ...TARGET.moon, fogAmount: 14 } };
    const candidate = serializeAreaEditingDraftToAreGff(draft(drift), preservation());
    expect(validateAreaUpdateCandidate(expected, candidate)).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
          path: "candidate.are.visualEnvironment",
        }),
      ]),
    });
  });

  it("accepts and independently compares the visual-environment scalar-controls target", () => {
    const expected: ProjectedAreaUpdateDraft = {
      ...draft(),
      visualEnvironmentScalarControls: {
        expectedValue: { fogClipDistance: 45, windPower: 0 },
        value: { fogClipDistance: 120, windPower: 2 },
      },
    };
    const candidate = serializeAreaEditingDraftToAreGff(expected, preservation());
    expect(validateAreaUpdateCandidate(expected, candidate)).toEqual({ valid: true, issues: [] });

    const driftCandidate = serializeAreaEditingDraftToAreGff({
      ...expected,
      visualEnvironmentScalarControls: {
        expectedValue: { fogClipDistance: 45, windPower: 0 },
        value: { fogClipDistance: 121, windPower: 2 },
      },
    }, preservation());
    expect(validateAreaUpdateCandidate(expected, driftCandidate)).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
          path: "candidate.are.visualEnvironmentScalarControls",
        }),
      ]),
    });
  });

  it("independently validates a resolved catalog-bound selection target", () => {
    const { visualEnvironment: _visualEnvironment, ...base } = draft();
    const resolved: ResolvedAreaVisualEnvironmentCatalogSelectionMutation = {
      catalogIdentity: {
        environmentSha256: "b".repeat(64),
        skyBoxesSha256: "c".repeat(64),
      },
      expectedValue: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
        visualEnvironment: SOURCE,
        visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
      },
      value: {
        lightingSchemeRowIndex: 1,
        skyBoxRowIndex: 1,
        visualEnvironment: TARGET,
        visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
      },
      lightingSchemeChanged: true,
    };
    const expected: ProjectedAreaUpdateDraft = {
      ...base,
      visualEnvironmentCatalogSelection: {
        catalogIdentity: resolved.catalogIdentity,
        expectedValue: resolved.expectedValue,
        value: { lightingSchemeRowIndex: 1, skyBoxRowIndex: 1 },
      },
    };
    const candidate = serializeAreaEditingDraftToAreGff({
      ...base,
      visualEnvironmentCatalogSelection: resolved,
    }, preservation());
    expect(validateAreaUpdateCandidate(
      expected,
      candidate,
      undefined,
      resolved,
    )).toEqual({ valid: true, issues: [] });

    const drift = serializeAreaEditingDraftToAreGff({
      ...base,
      visualEnvironmentCatalogSelection: {
        ...resolved,
        value: { ...resolved.value, skyBoxRowIndex: 0 },
      },
    }, preservation());
    expect(validateAreaUpdateCandidate(
      expected,
      drift,
      undefined,
      resolved,
    )).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
          path: "candidate.are.visualEnvironmentCatalogSelection",
        }),
      ]),
    });
  });
});
