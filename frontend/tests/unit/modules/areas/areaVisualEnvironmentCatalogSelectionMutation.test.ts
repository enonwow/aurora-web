import {
  buildExistingAreaVisualEnvironmentCatalogSelectionMutation,
  isExistingAreaVisualEnvironmentCatalogSelectionMutation,
} from "../../../../src/modules/areas/domain/areaVisualEnvironmentCatalogSelectionMutation";
import { effectiveAreaVisualEnvironmentCatalogBundle } from "./areaVisualEnvironmentCatalogFixture";

const sourceVisual = effectiveAreaVisualEnvironmentCatalogBundle()
  .lightingSchemes.rows[0]!.visualEnvironment;
const targetVisual = {
  ...sourceVisual,
  dayNightMode: "always_night" as const,
  shadowOpacity: 65,
  sun: { ...sourceVisual.sun, fogAmount: 8 },
  moon: { ...sourceVisual.moon },
};

function catalogs() {
  const source = effectiveAreaVisualEnvironmentCatalogBundle();
  return {
    ...source,
    lightingSchemes: {
      ...source.lightingSchemes,
      descriptor: { ...source.lightingSchemes.descriptor, rowCount: 2 },
      rows: [
        source.lightingSchemes.rows[0]!,
        {
          rowIndex: 1,
          displayName: "Night",
          displaySource: "row_index" as const,
          visualEnvironment: targetVisual,
          visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
          skyBoxRowIndex: 1,
        },
      ],
    },
    skyBoxes: {
      ...source.skyBoxes,
      descriptor: { ...source.skyBoxes.descriptor, rowCount: 2 },
      rows: [
        source.skyBoxes.rows[0]!,
        { rowIndex: 1, displayName: "Clear", displaySource: "row_index" as const },
      ],
    },
  };
}

function build(overrides: Record<string, unknown> = {}) {
  return buildExistingAreaVisualEnvironmentCatalogSelectionMutation({
    catalogs: catalogs(),
    sourceSelection: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
    targetSelection: { lightingSchemeRowIndex: 1, skyBoxRowIndex: 1 },
    sourceVisualEnvironment: sourceVisual,
    targetVisualEnvironment: targetVisual,
    sourceScalarControls: { fogClipDistance: 45, windPower: 0 },
    targetScalarControls: { fogClipDistance: 120, windPower: 2 },
    ...overrides,
  });
}

describe("Area catalog-bound visual selection mutation", () => {
  it("builds an exact hash-bound row selection without redundant overrides", () => {
    const mutation = build();
    expect(mutation).toEqual({
      catalogIdentity: {
        environmentSha256: "a".repeat(64),
        skyBoxesSha256: "b".repeat(64),
      },
      expectedValue: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
        visualEnvironment: sourceVisual,
        visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
      },
      value: { lightingSchemeRowIndex: 1, skyBoxRowIndex: 1 },
    });
    expect(isExistingAreaVisualEnvironmentCatalogSelectionMutation(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.expectedValue.visualEnvironment.sun)).toBe(true);
  });

  it("adds complete final overrides after selecting a Lighting Scheme", () => {
    const visualOverride = {
      ...targetVisual,
      sun: { ...targetVisual.sun },
      moon: { ...targetVisual.moon, fogAmount: 9 },
    };
    expect(build({
      targetVisualEnvironment: visualOverride,
      targetScalarControls: { fogClipDistance: 300, windPower: 1 },
    })?.value).toEqual({
      lightingSchemeRowIndex: 1,
      skyBoxRowIndex: 1,
      visualEnvironmentOverride: visualOverride,
      visualEnvironmentScalarControlsOverride: {
        fogClipDistance: 300,
        windPower: 1,
      },
    });
  });

  it("returns undefined for an unchanged selection and keeps Sky-Box-only targets override-free", () => {
    expect(build({
      targetSelection: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
      targetVisualEnvironment: sourceVisual,
      targetScalarControls: { fogClipDistance: 45, windPower: 0 },
    })).toBeUndefined();
    expect(build({
      targetSelection: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 1 },
      targetVisualEnvironment: targetVisual,
      targetScalarControls: { fogClipDistance: 120, windPower: 2 },
    })?.value).toEqual({ lightingSchemeRowIndex: 0, skyBoxRowIndex: 1 });
  });

  it.each([
    ["malformed catalogs", { catalogs: { ...catalogs(), skyBoxes: undefined } }],
    ["missing target row", {
      targetSelection: { lightingSchemeRowIndex: 2, skyBoxRowIndex: 1 },
    }],
    ["malformed source visual", { sourceVisualEnvironment: undefined }],
    ["malformed target scalar pair", {
      targetScalarControls: { fogClipDistance: 120.5, windPower: 2 },
    }],
  ])("fails closed for %s", (_label, overrides) => {
    expect(() => build(overrides)).toThrow();
  });

  it("rejects partial and extended wire mutations", () => {
    const mutation = build()!;
    expect(isExistingAreaVisualEnvironmentCatalogSelectionMutation({
      ...mutation,
      extra: true,
    })).toBe(false);
    expect(isExistingAreaVisualEnvironmentCatalogSelectionMutation({
      ...mutation,
      expectedValue: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
      },
    })).toBe(false);
  });
});
