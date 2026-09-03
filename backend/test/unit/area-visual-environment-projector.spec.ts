import { projectAreaUpdateDraft } from "../../src/modules/areas/domain/area-update-draft-projector";
import type { AreaDraftSnapshot } from "../../src/modules/areas/domain/area-draft.types";

const DRAFT_HASH = "d".repeat(64);

function environment() {
  return {
    dayNightMode: "cycle" as const,
    shadowOpacity: 50,
    chanceRain: 20,
    chanceSnow: 0,
    chanceLightning: 35,
    sun: { ambientColor: 0x112233, diffuseColor: 0x445566, fogColor: 0x778899, fogAmount: 7, shadows: true },
    moon: { ambientColor: 0xaabbcc, diffuseColor: 0xddeeff, fogColor: 0x010203, fogAmount: 15, shadows: false },
  };
}

function targetEnvironment() {
  return {
    ...environment(),
    dayNightMode: "always_night" as const,
    shadowOpacity: 65,
    chanceRain: 40,
    sun: { ...environment().sun, fogAmount: 8 },
    moon: { ...environment().moon },
  };
}

function visualCatalogs() {
  return {
    schemaVersion: "area-visual-environment-catalogs.v1",
    lightingSchemes: {
      descriptor: {
        resourceName: "environment.2da",
        sourceObjectKey: "runtime/environment.2da",
        sourceLayer: "vanilla",
        sha256: "b".repeat(64),
        sizeBytes: 100,
        rowCount: 2,
      },
      rows: [
        {
          rowIndex: 0,
          displayName: "Source",
          displaySource: "row_index",
          visualEnvironment: environment(),
          visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
          skyBoxRowIndex: 0,
        },
        {
          rowIndex: 1,
          displayName: "Target",
          displaySource: "row_index",
          visualEnvironment: targetEnvironment(),
          visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
          skyBoxRowIndex: 1,
        },
      ],
    },
    skyBoxes: {
      descriptor: {
        resourceName: "skyboxes.2da",
        sourceObjectKey: "runtime/skyboxes.2da",
        sourceLayer: "vanilla",
        sha256: "c".repeat(64),
        sizeBytes: 50,
        rowCount: 2,
      },
      rows: [
        { rowIndex: 0, displayName: "None", displaySource: "row_index" },
        { rowIndex: 1, displayName: "Clear", displaySource: "row_index" },
      ],
    },
  };
}

function snapshot(): AreaDraftSnapshot {
  return {
    draftId: "draft_visual",
    title: "Visual working copy",
    revision: 3,
    updatedAt: "2026-08-25T00:00:00.000Z",
    normalizedSha256: DRAFT_HASH,
    source: { type: "production_area", areaId: "area_crypt01" },
    draft: {
      schemaVersion: "area-draft.v1",
      title: "Visual working copy",
      source: { type: "production_area", areaId: "area_crypt01" },
      payload: {
        schemaVersion: "production-area-draft-payload.v1",
        sourceArea: {
          areaId: "area_crypt01",
          name: "Crypt 01",
          width: 2,
          height: 2,
          visualEnvironment: environment(),
          visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
          visualEnvironmentCatalogSelection: {
            lightingSchemeRowIndex: 0,
            skyBoxRowIndex: 0,
          },
          visualEnvironmentCatalogs: visualCatalogs(),
        },
        provenance: {
          areaId: "area_crypt01",
          sourceUpdatedAt: "2026-08-25T00:00:00.000Z",
          processingCacheKey: "cache-visual",
        },
        editableScene: {
          sceneId: "area_crypt01",
          areaName: "Crypt 01",
          width: 2,
          height: 2,
          tiles: [],
          objects: [],
          updatedAtUnixMs: 1,
          source: "local_draft",
          areaVisualEnvironment: environment(),
          areaVisualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
          areaVisualEnvironmentCatalogSelection: {
            lightingSchemeRowIndex: 0,
            skyBoxRowIndex: 0,
          },
          auroraAreaEditing: {
            state: {
              schemaVersion: 1,
              areaResRef: "crypt01",
              tilesetResRef: "tin01",
              tilesetFingerprint: "e".repeat(64),
              sourceAreaFingerprint: "a".repeat(64),
              width: 2,
              height: 2,
              topology: {
                tokenWidth: 5,
                tokenHeight: 5,
                tokens: [],
                cornerWidth: 3,
                cornerHeight: 3,
                heights: [],
              },
              groupInstances: [],
              tiles: [tile(0, 0), tile(0, 1), tile(1, 0), tile(1, 1)],
            },
            definition: {},
            terrainBrush: "floor",
          },
        },
      },
    },
  };
}

function tile(row: number, col: number) {
  return {
    id: `tile-${row}-${col}`,
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

function project(value: AreaDraftSnapshot) {
  return projectAreaUpdateDraft(value, {
    areaResRef: "crypt01",
    draftId: "draft_visual",
    draftRevision: 3,
    draftNormalizedSha256: DRAFT_HASH,
  });
}

describe("Area visual-environment draft projection", () => {
  it("projects a catalog-bound Lighting Scheme change without duplicate visual CAS members", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.editableScene.areaVisualEnvironmentCatalogSelection = {
      lightingSchemeRowIndex: 1,
      skyBoxRowIndex: 1,
    };
    payload.editableScene.areaVisualEnvironment = targetEnvironment();
    payload.editableScene.areaVisualEnvironmentScalarControls = {
      fogClipDistance: 120,
      windPower: 2,
    };

    const projected = project(value);
    expect(projected.visualEnvironmentCatalogSelection).toEqual({
      catalogIdentity: {
        environmentSha256: "b".repeat(64),
        skyBoxesSha256: "c".repeat(64),
      },
      expectedValue: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
        visualEnvironment: environment(),
        visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
      },
      value: { lightingSchemeRowIndex: 1, skyBoxRowIndex: 1 },
    });
    expect(projected.visualEnvironment).toBeUndefined();
    expect(projected.visualEnvironmentScalarControls).toBeUndefined();
    expect(Object.isFrozen(projected.visualEnvironmentCatalogSelection)).toBe(true);
  });

  it("projects complete overrides when final controls differ from the selected row", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.editableScene.areaVisualEnvironmentCatalogSelection = {
      lightingSchemeRowIndex: 1,
      skyBoxRowIndex: 1,
    };
    payload.editableScene.areaVisualEnvironment = {
      ...targetEnvironment(),
      moon: { ...targetEnvironment().moon, fogAmount: 9 },
    };
    payload.editableScene.areaVisualEnvironmentScalarControls = {
      fogClipDistance: 300,
      windPower: 1,
    };

    expect(project(value).visualEnvironmentCatalogSelection?.value).toEqual({
      lightingSchemeRowIndex: 1,
      skyBoxRowIndex: 1,
      visualEnvironmentOverride: payload.editableScene.areaVisualEnvironment,
      visualEnvironmentScalarControlsOverride: {
        fogClipDistance: 300,
        windPower: 1,
      },
    });
  });

  it("keeps disjoint core/scalar CAS projection for a Sky-Box-only selection", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.editableScene.areaVisualEnvironmentCatalogSelection = {
      lightingSchemeRowIndex: 0,
      skyBoxRowIndex: 1,
    };
    payload.editableScene.areaVisualEnvironment = {
      ...environment(),
      sun: { ...environment().sun, fogAmount: 8 },
    };
    const projected = project(value);
    expect(projected.visualEnvironmentCatalogSelection?.value).toEqual({
      lightingSchemeRowIndex: 0,
      skyBoxRowIndex: 1,
    });
    expect(projected.visualEnvironment?.value.sun.fogAmount).toBe(8);
  });

  it("rejects a selection change without exact catalog provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    delete payload.sourceArea.visualEnvironmentCatalogs;
    payload.editableScene.areaVisualEnvironmentCatalogSelection = {
      lightingSchemeRowIndex: 1,
      skyBoxRowIndex: 1,
    };
    expect(() => project(value)).toThrow(expect.objectContaining({
      path: "draft.payload.sourceArea.visualEnvironmentCatalogs",
    }));
  });

  it("projects one exact changed full tuple and deep-freezes it", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.editableScene.areaVisualEnvironment = {
      ...environment(),
      dayNightMode: "always_night",
      shadowOpacity: 65,
      sun: { ...environment().sun, fogAmount: 8 },
    };
    const projected = project(value).visualEnvironment;
    expect(projected).toEqual({
      expectedValue: environment(),
      value: payload.editableScene.areaVisualEnvironment,
    });
    expect(Object.isFrozen(projected)).toBe(true);
    expect(Object.isFrozen(projected?.expectedValue.sun)).toBe(true);
    expect(Object.isFrozen(projected?.value.moon)).toBe(true);
  });

  it("omits an unchanged tuple", () => {
    expect(project(snapshot()).visualEnvironment).toBeUndefined();
  });

  it("projects and freezes one changed visual-environment scalar-controls CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.editableScene.areaVisualEnvironmentScalarControls = {
      fogClipDistance: 120,
      windPower: 2,
    };
    const projected = project(value).visualEnvironmentScalarControls;
    expect(projected).toEqual({
      expectedValue: { fogClipDistance: 45, windPower: 0 },
      value: { fogClipDistance: 120, windPower: 2 },
    });
    expect(Object.isFrozen(projected)).toBe(true);
    expect(Object.isFrozen(projected?.expectedValue)).toBe(true);
    expect(Object.isFrozen(projected?.value)).toBe(true);
  });

  it("omits unchanged scalar controls and rejects missing or malformed provenance", () => {
    expect(project(snapshot()).visualEnvironmentScalarControls).toBeUndefined();

    const missing = snapshot();
    const missingPayload = missing.draft.payload as Record<string, any>;
    delete missingPayload.sourceArea.visualEnvironmentScalarControls;
    missingPayload.editableScene.areaVisualEnvironmentScalarControls = {
      fogClipDistance: 120,
      windPower: 2,
    };
    expect(() => project(missing)).toThrow(expect.objectContaining({
      path: "draft.payload.sourceArea.visualEnvironmentScalarControls",
    }));

    const malformed = snapshot();
    const malformedPayload = malformed.draft.payload as Record<string, any>;
    malformedPayload.editableScene.areaVisualEnvironmentScalarControls = {
      fogClipDistance: 45.5,
      windPower: 2,
    };
    expect(() => project(malformed)).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.areaVisualEnvironmentScalarControls",
    }));
  });

  it.each<[string, unknown, unknown, string]>([
    ["missing source", undefined, { ...environment(), shadowOpacity: 51 }, "draft.payload.sourceArea.visualEnvironment"],
    ["invalid target", environment(), { ...environment(), chanceRain: 101 }, "draft.payload.editableScene.areaVisualEnvironment"],
  ])("rejects %s", (_label, source, target, path) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.visualEnvironment = source;
    payload.editableScene.areaVisualEnvironment = target;
    expect(() => project(value)).toThrow(expect.objectContaining({ path }));
  });
});
