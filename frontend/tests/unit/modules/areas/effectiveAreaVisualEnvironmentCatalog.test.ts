import { describe, expect, it } from "vitest";
import {
  cloneEffectiveAreaVisualEnvironmentCatalogBundle,
  isEffectiveAreaVisualEnvironmentCatalogBundle,
} from "../../../../src/modules/areas/domain/effectiveAreaVisualEnvironmentCatalog";

describe("effective Area visual-environment catalog", () => {
  it("admits one exact complete physical-row bundle", () => {
    expect(isEffectiveAreaVisualEnvironmentCatalogBundle(bundle())).toBe(true);
  });

  it.each([
    ["unknown top-level key", { ...bundle(), extra: true }],
    ["wrong schema", { ...bundle(), schemaVersion: "future" }],
    ["row count mismatch", {
      ...bundle(),
      skyBoxes: { ...bundle().skyBoxes, descriptor: { ...bundle().skyBoxes.descriptor, rowCount: 1 } },
    }],
    ["non-physical row order", {
      ...bundle(),
      skyBoxes: {
        ...bundle().skyBoxes,
        rows: [{ ...bundle().skyBoxes.rows[0], rowIndex: 1 }, bundle().skyBoxes.rows[1]],
      },
    }],
    ["malformed derived target", {
      ...bundle(),
      lightingSchemes: {
        ...bundle().lightingSchemes,
        rows: [{
          ...bundle().lightingSchemes.rows[0],
          visualEnvironment: {
            ...bundle().lightingSchemes.rows[0].visualEnvironment,
            chanceRain: 101,
          },
        }],
      },
    }],
  ])("rejects %s", (_label, value) => {
    expect(isEffectiveAreaVisualEnvironmentCatalogBundle(value)).toBe(false);
  });

  it("deep-clones descriptors and nested lighting targets", () => {
    const source = bundle();
    const cloned = cloneEffectiveAreaVisualEnvironmentCatalogBundle(source);
    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    expect(cloned.lightingSchemes.rows).not.toBe(source.lightingSchemes.rows);
    expect(cloned.lightingSchemes.rows[0]!.visualEnvironment).not.toBe(
      source.lightingSchemes.rows[0]!.visualEnvironment,
    );
    expect(cloned.lightingSchemes.rows[0]!.visualEnvironment.sun).not.toBe(
      source.lightingSchemes.rows[0]!.visualEnvironment.sun,
    );
    expect(cloned.lightingSchemes.rows[0]!.visualEnvironmentScalarControls).not.toBe(
      source.lightingSchemes.rows[0]!.visualEnvironmentScalarControls,
    );
  });
});

function bundle() {
  return {
    schemaVersion: "area-visual-environment-catalogs.v1" as const,
    lightingSchemes: {
      descriptor: {
        resourceName: "environment.2da" as const,
        sourceObjectKey: "modules/current/environment.2da",
        sourceLayer: "module" as const,
        sha256: "a".repeat(64),
        sizeBytes: 512,
        rowCount: 1,
      },
      rows: [{
        rowIndex: 0,
        label: "ExteriorProbe",
        strRef: 123,
        displayName: "Exterior Probe",
        displaySource: "strref" as const,
        visualEnvironment: {
          dayNightMode: "cycle" as const,
          shadowOpacity: 65,
          chanceRain: 4,
          chanceSnow: 3,
          chanceLightning: 5,
          sun: {
            ambientColor: 0x030201,
            diffuseColor: 0x060504,
            fogColor: 0x0f0e0d,
            fogAmount: 7,
            shadows: true,
          },
          moon: {
            ambientColor: 0x090807,
            diffuseColor: 0x0c0b0a,
            fogColor: 0x121110,
            fogAmount: 8,
            shadows: false,
          },
        },
        visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
        skyBoxRowIndex: 1,
      }],
    },
    skyBoxes: {
      descriptor: {
        resourceName: "skyboxes.2da" as const,
        sourceObjectKey: "modules/current/skyboxes.2da",
        sourceLayer: "module" as const,
        sha256: "b".repeat(64),
        sizeBytes: 256,
        rowCount: 2,
      },
      rows: [
        { rowIndex: 0, label: "None", displayName: "None", displaySource: "label" as const },
        {
          rowIndex: 1,
          label: "Grass_Clear",
          stringRef: 456,
          displayName: "Clear Grass",
          displaySource: "strref" as const,
        },
      ],
    },
  };
}
