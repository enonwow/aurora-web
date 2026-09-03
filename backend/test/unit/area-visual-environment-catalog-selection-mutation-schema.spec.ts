import { parseAreaEditingExportDraft } from "../../src/modules/areas/adapters/inbound/http/area-editing.schemas";

const visual = {
  dayNightMode: "cycle",
  shadowOpacity: 50,
  chanceRain: 20,
  chanceSnow: 0,
  chanceLightning: 35,
  sun: {
    ambientColor: 0x112233, diffuseColor: 0x445566, fogColor: 0x778899,
    fogAmount: 7, shadows: true,
  },
  moon: {
    ambientColor: 0xaabbcc, diffuseColor: 0xddeeff, fogColor: 0x010203,
    fogAmount: 15, shadows: false,
  },
};

function mutation() {
  return {
    catalogIdentity: {
      environmentSha256: "a".repeat(64),
      skyBoxesSha256: "b".repeat(64),
    },
    expectedValue: {
      lightingSchemeRowIndex: 0,
      skyBoxRowIndex: 0,
      visualEnvironment: visual,
      visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
    },
    value: { lightingSchemeRowIndex: 1, skyBoxRowIndex: 1 },
  };
}

function draft(value: unknown) {
  return {
    areaResRef: "visual_catalog",
    name: "Visual Catalog",
    width: 2,
    height: 2,
    tilesetResRef: "tin01",
    tilesetFingerprint: "c".repeat(64),
    visualEnvironmentCatalogSelection: value,
    tiles: [
      { row: 0, col: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 1, tileId: 0, orientation: 0, height: 0 },
    ],
  };
}

describe("Area catalog-bound visual selection HTTP schema", () => {
  it("accepts and detaches one exact changed mutation", () => {
    const source = mutation();
    const parsed = parseAreaEditingExportDraft(draft(source));
    expect(parsed.visualEnvironmentCatalogSelection).toEqual(source);
    expect(parsed.visualEnvironmentCatalogSelection).not.toBe(source);
  });

  it.each([
    ["unknown root member", { ...mutation(), unknown: true }],
    ["uppercase hash", {
      ...mutation(),
      catalogIdentity: {
        ...mutation().catalogIdentity,
        environmentSha256: "A".repeat(64),
      },
    }],
    ["partial expected state", {
      ...mutation(),
      expectedValue: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
        visualEnvironment: visual,
      },
    }],
    ["unknown target member", {
      ...mutation(),
      value: { ...mutation().value, rowLabel: "1" },
    }],
    ["out-of-domain ordinal", {
      ...mutation(),
      value: { lightingSchemeRowIndex: 256, skyBoxRowIndex: 1 },
    }],
    ["unchanged selection", {
      ...mutation(),
      value: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
    }],
  ])("rejects %s", (_label, value) => {
    expect(() => parseAreaEditingExportDraft(draft(value))).toThrow();
  });
});
