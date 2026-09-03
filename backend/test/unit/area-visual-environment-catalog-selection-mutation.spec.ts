import {
  AreaVisualEnvironmentCatalogSelectionMutationError,
  isExistingAreaVisualEnvironmentCatalogSelectionMutation,
  resolveAreaVisualEnvironmentCatalogSelectionMutation,
} from "../../src/modules/areas/domain/area-visual-environment-catalog-selection-mutation";
import type { EffectiveAreaVisualEnvironmentCatalogBundle } from "../../src/modules/catalog/domain/effective-area-visual-environment-two-da";

const sourceVisual = Object.freeze({
  dayNightMode: "always_day" as const,
  shadowOpacity: 25,
  chanceRain: 10,
  chanceSnow: 0,
  chanceLightning: 5,
  sun: Object.freeze({
    ambientColor: 0x030201,
    diffuseColor: 0x060504,
    fogColor: 0x090807,
    fogAmount: 2,
    shadows: true,
  }),
  moon: Object.freeze({
    ambientColor: 0x0c0b0a,
    diffuseColor: 0x0f0e0d,
    fogColor: 0x121110,
    fogAmount: 3,
    shadows: false,
  }),
});

const rowVisual = Object.freeze({
  dayNightMode: "cycle" as const,
  shadowOpacity: 65,
  chanceRain: 40,
  chanceSnow: 20,
  chanceLightning: 30,
  sun: Object.freeze({
    ambientColor: 0x222111,
    diffuseColor: 0x444333,
    fogColor: 0x666555,
    fogAmount: 7,
    shadows: true,
  }),
  moon: Object.freeze({
    ambientColor: 0x888777,
    diffuseColor: 0xaaa999,
    fogColor: 0xcccbbb,
    fogAmount: 8,
    shadows: true,
  }),
});

const bundle = (): EffectiveAreaVisualEnvironmentCatalogBundle => ({
  schemaVersion: "area-visual-environment-catalogs.v1",
  lightingSchemes: {
    descriptor: {
      resourceName: "environment.2da",
      sourceObjectKey: "runtime/vanilla/environment.2da",
      sourceLayer: "vanilla",
      sha256: "a".repeat(64),
      sizeBytes: 100,
      rowCount: 2,
    },
    rows: [
      {
        rowIndex: 0,
        label: "Source",
        displayName: "Source",
        displaySource: "label",
        visualEnvironment: sourceVisual,
        visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
        skyBoxRowIndex: 0,
      },
      {
        rowIndex: 1,
        label: "Target",
        displayName: "Target",
        displaySource: "label",
        visualEnvironment: rowVisual,
        visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
        skyBoxRowIndex: 1,
      },
    ],
  },
  skyBoxes: {
    descriptor: {
      resourceName: "skyboxes.2da",
      sourceObjectKey: "runtime/vanilla/skyboxes.2da",
      sourceLayer: "vanilla",
      sha256: "b".repeat(64),
      sizeBytes: 50,
      rowCount: 2,
    },
    rows: [
      { rowIndex: 0, label: "None", displayName: "None", displaySource: "label" },
      { rowIndex: 1, label: "Clear", displayName: "Clear", displaySource: "label" },
    ],
  },
});

const lightingMutation = () => ({
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
  value: {
    lightingSchemeRowIndex: 1,
    skyBoxRowIndex: 1,
  },
});

describe("existing Area catalog-bound visual selection mutation", () => {
  it("derives the complete native row target and applies the explicit Sky Box last", () => {
    const resolved = resolveAreaVisualEnvironmentCatalogSelectionMutation(
      lightingMutation(),
      bundle(),
    );

    expect(resolved).toEqual({
      catalogIdentity: {
        environmentSha256: "a".repeat(64),
        skyBoxesSha256: "b".repeat(64),
      },
      expectedValue: lightingMutation().expectedValue,
      value: {
        lightingSchemeRowIndex: 1,
        skyBoxRowIndex: 1,
        visualEnvironment: rowVisual,
        visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
      },
      lightingSchemeChanged: true,
    });
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.value.visualEnvironment.sun)).toBe(true);
  });

  it("accepts complete native-reachable overrides after a lighting-scheme selection", () => {
    const visualEnvironmentOverride = {
      ...rowVisual,
      sun: { ...rowVisual.sun, fogAmount: 9 },
      moon: { ...rowVisual.moon },
    };
    const resolved = resolveAreaVisualEnvironmentCatalogSelectionMutation({
      ...lightingMutation(),
      value: {
        ...lightingMutation().value,
        visualEnvironmentOverride,
        visualEnvironmentScalarControlsOverride: {
          fogClipDistance: 300,
          windPower: 1,
        },
      },
    }, bundle());

    expect(resolved.value.visualEnvironment).toEqual(visualEnvironmentOverride);
    expect(resolved.value.visualEnvironmentScalarControls).toEqual({
      fogClipDistance: 300,
      windPower: 1,
    });
  });

  it("keeps the complete retained environment for a Sky-Box-only selection", () => {
    const mutation = lightingMutation();
    const resolved = resolveAreaVisualEnvironmentCatalogSelectionMutation({
      ...mutation,
      value: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 1 },
    }, bundle());

    expect(resolved.lightingSchemeChanged).toBe(false);
    expect(resolved.value.visualEnvironment).toEqual(sourceVisual);
    expect(resolved.value.visualEnvironmentScalarControls).toEqual({
      fogClipDistance: 45,
      windPower: 0,
    });
  });

  it.each([
    ["stale environment hash", {
      ...lightingMutation(),
      catalogIdentity: {
        ...lightingMutation().catalogIdentity,
        environmentSha256: "c".repeat(64),
      },
    }, "catalog_identity_mismatch"],
    ["missing target lighting row", {
      ...lightingMutation(),
      value: { lightingSchemeRowIndex: 2, skyBoxRowIndex: 1 },
    }, "target_row_missing"],
    ["missing current Sky Box row", {
      ...lightingMutation(),
      expectedValue: { ...lightingMutation().expectedValue, skyBoxRowIndex: 2 },
    }, "source_row_missing"],
    ["unchanged selection", {
      ...lightingMutation(),
      value: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
    }, "selection_unchanged"],
    ["Sky-Box-only override", {
      ...lightingMutation(),
      value: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 1,
        visualEnvironmentOverride: rowVisual,
      },
    }, "sky_box_only_override_forbidden"],
    ["redundant row override", {
      ...lightingMutation(),
      value: {
        ...lightingMutation().value,
        visualEnvironmentOverride: rowVisual,
      },
    }, "redundant_override"],
  ])("rejects %s", (_label, mutation, code) => {
    expect(() => resolveAreaVisualEnvironmentCatalogSelectionMutation(
      mutation,
      bundle(),
    )).toThrow(expect.objectContaining({
      name: "AreaVisualEnvironmentCatalogSelectionMutationError",
      code,
    }));
  });

  it("rejects partial, extended, malformed, and out-of-domain request shapes", () => {
    const valid = lightingMutation();
    expect(isExistingAreaVisualEnvironmentCatalogSelectionMutation(valid)).toBe(true);
    expect(isExistingAreaVisualEnvironmentCatalogSelectionMutation({
      ...valid,
      unexpected: true,
    })).toBe(false);
    expect(isExistingAreaVisualEnvironmentCatalogSelectionMutation({
      ...valid,
      expectedValue: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
      },
    })).toBe(false);
    expect(isExistingAreaVisualEnvironmentCatalogSelectionMutation({
      ...valid,
      value: { lightingSchemeRowIndex: 256, skyBoxRowIndex: 1 },
    })).toBe(false);
    expect(() => resolveAreaVisualEnvironmentCatalogSelectionMutation(
      { ...valid, unexpected: true },
      bundle(),
    )).toThrow(AreaVisualEnvironmentCatalogSelectionMutationError);
  });
});
