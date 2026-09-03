import { createHash } from "node:crypto";
import { AreaEditingApplicationService } from "../../src/modules/areas/application/area-editing.application.service";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaMetadataFromAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import type { AreasApplicationService } from "../../src/modules/areas/application/areas.application.service";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { TemplateCatalogRepositoryPort } from "../../src/modules/catalog/application/ports/template-catalog-repository.port";

const sourceVisual = {
  dayNightMode: "always_day" as const,
  shadowOpacity: 25,
  chanceRain: 10,
  chanceSnow: 0,
  chanceLightning: 5,
  sun: {
    ambientColor: 0x030201, diffuseColor: 0x060504, fogColor: 0x090807,
    fogAmount: 2, shadows: true,
  },
  moon: {
    ambientColor: 0x0c0b0a, diffuseColor: 0x0f0e0d, fogColor: 0x121110,
    fogAmount: 3, shadows: false,
  },
};
const targetVisual = {
  dayNightMode: "cycle" as const,
  shadowOpacity: 65,
  chanceRain: 40,
  chanceSnow: 20,
  chanceLightning: 30,
  sun: {
    ambientColor: 0x222111, diffuseColor: 0x444333, fogColor: 0x666555,
    fogAmount: 7, shadows: true,
  },
  moon: {
    ambientColor: 0x888777, diffuseColor: 0xaaa999, fogColor: 0xcccbbb,
    fogAmount: 8, shadows: true,
  },
};

function sourceAre(): Buffer {
  return buildGffBuffer([
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
    { label: "Width", type: "int", value: 2 },
    { label: "Height", type: "int", value: 2 },
    { label: "Tileset", type: "resref", value: "testset" },
    { label: "Tile_List", type: "list", value: [0, 1, 2, 3].map(() => ({
      typeId: 0,
      fields: [
        { label: "Tile_ID", type: "int" as const, value: 0 },
        { label: "Tile_Orientation", type: "int" as const, value: 0 },
        { label: "Tile_Height", type: "int" as const, value: 0 },
      ],
    })) },
  ], "ARE ", 0xffff_ffff);
}

function catalogs() {
  return {
    schemaVersion: "area-visual-environment-catalogs.v1" as const,
    lightingSchemes: {
      descriptor: {
        resourceName: "environment.2da" as const,
        sourceObjectKey: "runtime/environment.2da",
        sourceLayer: "vanilla" as const,
        sha256: "a".repeat(64), sizeBytes: 100, rowCount: 2,
      },
      rows: [
        {
          rowIndex: 0, displayName: "Source", displaySource: "row_index" as const,
          visualEnvironment: sourceVisual,
          visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
          skyBoxRowIndex: 0,
        },
        {
          rowIndex: 1, displayName: "Target", displaySource: "row_index" as const,
          visualEnvironment: targetVisual,
          visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
          skyBoxRowIndex: 1,
        },
      ],
    },
    skyBoxes: {
      descriptor: {
        resourceName: "skyboxes.2da" as const,
        sourceObjectKey: "runtime/skyboxes.2da",
        sourceLayer: "vanilla" as const,
        sha256: "b".repeat(64), sizeBytes: 50, rowCount: 2,
      },
      rows: [
        { rowIndex: 0, displayName: "None", displaySource: "row_index" as const },
        { rowIndex: 1, displayName: "Clear", displaySource: "row_index" as const },
      ],
    },
  };
}

function setup(catalogResult: ReturnType<typeof catalogs> | null = catalogs()) {
  const are = sourceAre();
  const storage = {
    listModuleSnapshot: jest.fn().mockResolvedValue({
      bucket: "test", prefix: "snapshot", totalFiles: 1,
      totalBytes: are.length,
      objects: [{ key: "snapshot/area_test.are", size: are.length }],
      truncated: false,
    }),
    getModuleObject: jest.fn().mockResolvedValue({
      key: "snapshot/area_test.are", size: are.length,
      contentType: "application/octet-stream", bytes: are,
    }),
  } as unknown as ModuleBlobStoragePort;
  const settings = {
    get: jest.fn().mockResolvedValue({ blobStorage: { modulePrefix: "snapshot" } }),
  } as unknown as RuntimeSettingsRepositoryPort;
  const catalog = {
    resolveEffectiveAreaVisualEnvironmentCatalogs: jest.fn().mockResolvedValue(catalogResult),
  } as unknown as TemplateCatalogRepositoryPort;
  const service = new AreaEditingApplicationService(
    {} as AreasApplicationService,
    storage,
    settings,
    undefined,
    catalog,
  );
  jest.spyOn(service, "getTilesetDefinition").mockResolvedValue({
    schemaVersion: 1,
    tilesetResRef: "testset",
    fingerprint: "c".repeat(64),
    defaults: {}, terrainTypes: [], crosserTypes: [], transitionRules: [],
    tiles: [{ tileId: 0, terrain: {}, crossers: {}, cornerHeights: {} }],
    groups: [], diagnostics: [],
  });
  return { service, catalog, are };
}

function draft(are: Buffer) {
  return {
    areaResRef: "area_test",
    name: "Area Test",
    width: 2,
    height: 2,
    tilesetResRef: "testset",
    tilesetFingerprint: "c".repeat(64),
    areaFingerprint: createHash("sha256").update(are).digest("hex"),
    visualEnvironmentCatalogSelection: {
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
    },
    tiles: [
      { row: 0, col: 0, sourceRow: 0, sourceCol: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 0, col: 1, sourceRow: 0, sourceCol: 1, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 0, sourceRow: 1, sourceCol: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 1, sourceRow: 1, sourceCol: 1, tileId: 0, orientation: 0, height: 0 },
    ],
  };
}

describe("AreaEditingApplicationService catalog-bound visual selection", () => {
  it("freshly resolves exact catalogs before writing the complete native target", async () => {
    const { service, catalog, are } = setup();
    const exported = await service.exportAre(draft(are));
    expect(catalog.resolveEffectiveAreaVisualEnvironmentCatalogs).toHaveBeenCalledTimes(1);
    expect(exported.visualEnvironmentCatalogSelection?.value).toEqual({
      lightingSchemeRowIndex: 1,
      skyBoxRowIndex: 1,
      visualEnvironment: targetVisual,
      visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
    });
    expect(parseAreaMetadataFromAreGff(exported.bytes)).toMatchObject({
      visualEnvironmentCatalogSelection: {
        lightingSchemeRowIndex: 1,
        skyBoxRowIndex: 1,
      },
      visualEnvironment: targetVisual,
      visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
    });
  });

  it("fails closed when effective catalogs are unavailable or stale", async () => {
    const unavailable = setup(null);
    await expect(unavailable.service.exportAre(draft(unavailable.are))).rejects.toMatchObject({
      status: 422,
      code: "AREA_VISUAL_ENVIRONMENT_CATALOG_UNAVAILABLE",
    });

    const stale = setup();
    const value = draft(stale.are);
    value.visualEnvironmentCatalogSelection.catalogIdentity.environmentSha256 = "d".repeat(64);
    await expect(stale.service.exportAre(value)).rejects.toMatchObject({
      status: 409,
      code: "AREA_VISUAL_ENVIRONMENT_CATALOG_STALE",
    });
  });

  it("reports stale catalog identity through the Verify envelope", async () => {
    const stale = setup();
    const value = draft(stale.are);
    value.visualEnvironmentCatalogSelection.catalogIdentity.skyBoxesSha256 = "d".repeat(64);
    const report = await stale.service.verifyArea(value);
    expect(report.valid).toBe(false);
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: "error",
        code: "AREA_VISUAL_ENVIRONMENT_CATALOG_STALE",
      }),
    ]));
  });
});
