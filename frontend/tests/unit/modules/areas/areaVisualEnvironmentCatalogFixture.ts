import type { EffectiveAreaVisualEnvironmentCatalogBundle } from "../../../../src/modules/areas/domain/effectiveAreaVisualEnvironmentCatalog";

export function effectiveAreaVisualEnvironmentCatalogBundle(): EffectiveAreaVisualEnvironmentCatalogBundle {
  return {
    schemaVersion: "area-visual-environment-catalogs.v1",
    lightingSchemes: {
      descriptor: {
        resourceName: "environment.2da",
        sourceObjectKey: "modules/current/environment.2da",
        sourceLayer: "module",
        sha256: "a".repeat(64),
        sizeBytes: 512,
        rowCount: 1,
      },
      rows: [{
        rowIndex: 0,
        label: "Exterior",
        displayName: "Exterior",
        displaySource: "label",
        visualEnvironment: {
          dayNightMode: "cycle",
          shadowOpacity: 50,
          chanceRain: 0,
          chanceSnow: 0,
          chanceLightning: 0,
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
        visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
        skyBoxRowIndex: 0,
      }],
    },
    skyBoxes: {
      descriptor: {
        resourceName: "skyboxes.2da",
        sourceObjectKey: "modules/current/skyboxes.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 128,
        rowCount: 1,
      },
      rows: [{ rowIndex: 0, displayName: "None", displaySource: "row_index" }],
    },
  };
}
