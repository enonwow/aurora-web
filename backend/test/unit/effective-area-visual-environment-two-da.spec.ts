import {
  AREA_VISUAL_ENVIRONMENT_CATALOGS_SCHEMA_VERSION,
  buildEffectiveAreaLightingSchemeCatalog,
  buildEffectiveAreaSkyBoxCatalog,
  isExactEffectiveAreaVisualEnvironmentCatalogBundle,
  parseEffectiveAreaEnvironmentTwoDa,
  parseEffectiveAreaSkyBoxesTwoDa,
} from "../../src/modules/catalog/domain/effective-area-visual-environment-two-da";

const descriptor = {
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key",
  sourceLayer: "vanilla" as const,
};

const environment = (row = [
  "0", "ExteriorProbe", "123", "cycle",
  "1", "2", "3", "4", "5", "6", "1",
  "7", "8", "9", "10", "11", "12", "0",
  "13", "14", "15", "16", "17", "18", "7", "8",
  "2", "3", "4", "5", "0.65", "120", "6",
].join(" ")) => Buffer.from([
  "2DA V2.0",
  "LABEL STRREF DAYNIGHT LIGHT_AMB_RED LIGHT_AMB_GREEN LIGHT_AMB_BLUE " +
    "LIGHT_DIFF_RED LIGHT_DIFF_GREEN LIGHT_DIFF_BLUE LIGHT_SHADOWS " +
    "DARK_AMB_RED DARK_AMB_GREEN DARK_AMB_BLUE DARK_DIFF_RED DARK_DIFF_GREEN " +
    "DARK_DIFF_BLUE DARK_SHADOWS LIGHT_FOG_RED LIGHT_FOG_GREEN LIGHT_FOG_BLUE " +
    "DARK_FOG_RED DARK_FOG_GREEN DARK_FOG_BLUE LIGHT_FOG DARK_FOG WIND SNOW " +
    "RAIN LIGHTNING SHADOW_ALPHA FOG_CLIP_DIST SKYBOX",
  row,
].join("\n"));

const skyBoxes = Buffer.from([
  "2DA V2.0",
  "LABEL STRING_REF CYCLICAL DAWN DAY DUSK NIGHT",
  "10 None **** **** **** **** **** ****",
  "42 Grass_Clear 456 1 Skyda_001 Sky_001 Skyd_001 Skyn_001",
].join("\n"));

describe("effective Area visual-environment 2DA catalogs", () => {
  it("parses physical environment rows into the exact native applied target", () => {
    const table = parseEffectiveAreaEnvironmentTwoDa({
      ...descriptor,
      bytes: environment(),
    });

    expect(table?.rows).toEqual([{
      rowIndex: 0,
      label: "ExteriorProbe",
      strRef: 123,
      visualEnvironment: {
        dayNightMode: "cycle",
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
      skyBoxRowIndex: 6,
    }]);
  });

  it("uses native missing-column defaults and closes all three DAYNIGHT tokens", () => {
    const header = environment().toString("utf8")
      .replace(" FOG_CLIP_DIST SKYBOX", "")
      .replace(/ 120 6$/u, "");
    for (const [token, expected] of [
      ["cycle", "cycle"],
      ["light", "always_day"],
      ["dark", "always_night"],
    ] as const) {
      const table = parseEffectiveAreaEnvironmentTwoDa({
        ...descriptor,
        bytes: Buffer.from(header.replace(" cycle ", ` ${token} `)),
      });
      expect(table?.rows[0]).toMatchObject({
        visualEnvironment: { dayNightMode: expected },
        visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 2 },
        skyBoxRowIndex: 0,
      });
    }
  });

  it("uses physical skybox ordinals and resolves STRREF with LABEL fallback", () => {
    const table = parseEffectiveAreaSkyBoxesTwoDa({
      ...descriptor,
      bytes: skyBoxes,
    });
    expect(table?.rows.map((row) => row.rowIndex)).toEqual([0, 1]);

    const catalog = buildEffectiveAreaSkyBoxCatalog(table!, (strRef) =>
      strRef === 456 ? "Clear Grass" : undefined);
    expect(catalog.rows).toEqual([
      expect.objectContaining({ rowIndex: 0, displayName: "None", displaySource: "label" }),
      expect.objectContaining({ rowIndex: 1, displayName: "Clear Grass", displaySource: "strref" }),
    ]);
  });

  it("builds and validates one exact bounded all-or-nothing bundle", () => {
    const environmentTable = parseEffectiveAreaEnvironmentTwoDa({
      ...descriptor,
      bytes: environment(),
    })!;
    const skyBoxTable = parseEffectiveAreaSkyBoxesTwoDa({
      ...descriptor,
      bytes: skyBoxes,
    })!;
    const bundle = {
      schemaVersion: AREA_VISUAL_ENVIRONMENT_CATALOGS_SCHEMA_VERSION,
      lightingSchemes: buildEffectiveAreaLightingSchemeCatalog(
        environmentTable,
        () => "Exterior Probe",
      ),
      skyBoxes: buildEffectiveAreaSkyBoxCatalog(skyBoxTable, () => undefined),
    };
    expect(isExactEffectiveAreaVisualEnvironmentCatalogBundle(bundle)).toBe(true);
    expect(isExactEffectiveAreaVisualEnvironmentCatalogBundle({
      ...bundle,
      skyBoxes: {
        ...bundle.skyBoxes,
        rows: [...bundle.skyBoxes.rows, bundle.skyBoxes.rows[0]],
      },
    })).toBe(false);
  });

  it.each([
    ["wrong DAYNIGHT token", environment().toString("utf8").replace(" cycle ", " dusk ")],
    ["fractional channel", environment().toString("utf8").replace(" 1 2 3 ", " 1.5 2 3 ")],
    ["wind outside trackbar", environment().toString("utf8").replace(
      " 2 3 4 5 0.65",
      " 3 3 4 5 0.65",
    )],
    ["fractional fog clip", environment().toString("utf8").replace(" 120 6", " 120.5 6")],
    ["skybox outside byte", environment().toString("utf8").replace(" 120 6", " 120 256")],
  ])("rejects %s", (_label, source) => {
    expect(parseEffectiveAreaEnvironmentTwoDa({
      ...descriptor,
      bytes: Buffer.from(source),
    })).toBeNull();
  });
});
