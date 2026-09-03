import { describe, expect, it, vi } from "vitest";

import { HttpAreaApiPort } from "../../../../src/modules/areas/adapters/httpAreaApiPort";
import { exportAuroraAreaEditingAre } from "../../../../src/modules/areas/adapters/httpAreaEditingExport";
import type { AreaVisualEnvironment } from "../../../../src/modules/areas/domain/areaVisualEnvironment";
import type { AreaVisualEnvironmentScalarControls } from "../../../../src/modules/areas/domain/areaVisualEnvironmentScalarControls";
import type { AuroraAreaEditingState } from "../../../../src/modules/scene/domain/auroraAreaEditing";

const exact = (): AreaVisualEnvironment => ({
  dayNightMode: "always_day",
  shadowOpacity: 70,
  chanceRain: 30,
  chanceSnow: 0,
  chanceLightning: 5,
  sun: {
    ambientColor: 0x123456,
    diffuseColor: 0xabcdef,
    fogColor: 0x102030,
    fogAmount: 3,
    shadows: true,
  },
  moon: {
    ambientColor: 0x654321,
    diffuseColor: 0xfedcba,
    fogColor: 0x302010,
    fogAmount: 9,
    shadows: false,
  },
});

function detailPayload(
  visualEnvironment: unknown,
  visualEnvironmentScalarControls?: unknown,
  visualEnvironmentCatalogs?: unknown,
  visualEnvironmentCatalogSelection?: unknown,
) {
  return {
    data: {
      areaId: "visual_http",
      name: "Visual HTTP",
      biome: "exterior",
      width: 1,
      height: 1,
      tags: [],
      visualEnvironment,
      ...(visualEnvironmentScalarControls !== undefined
        ? { visualEnvironmentScalarControls }
        : {}),
      ...(visualEnvironmentCatalogs !== undefined ? { visualEnvironmentCatalogs } : {}),
      ...(visualEnvironmentCatalogSelection !== undefined
        ? { visualEnvironmentCatalogSelection }
        : {}),
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: {
        placeables: 0,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 0,
      },
      updatedAt: "2026-08-25T10:00:00.000Z",
      objects: [],
    },
  };
}

const state: AuroraAreaEditingState = {
  schemaVersion: 1,
  areaResRef: "visual_http",
  tilesetResRef: "testset",
  tilesetFingerprint: "a".repeat(64),
  randomSeed: 1,
  sourceAreaFingerprint: "b".repeat(64),
  width: 1,
  height: 1,
  tiles: [{ id: "source", row: 0, col: 0, sourceRow: 0, sourceCol: 0, tileId: 1, orientation: 0, height: 0 }],
  topology: {
    tokenWidth: 3,
    tokenHeight: 3,
    tokens: [],
    cornerWidth: 2,
    cornerHeight: 2,
    heights: [],
  },
  groupInstances: [],
};

describe("Area visual-environment HTTP boundaries", () => {
  it("accepts and detaches one complete exact Area detail tuple", async () => {
    const payload = exact();
    const fetchFn = vi.fn(async () => Response.json(detailPayload(payload)));
    const port = new HttpAreaApiPort(fetchFn as unknown as typeof fetch, "http://backend/api/v1");

    const result = await port.getAreaById("token", "visual_http");
    expect(result.visualEnvironment).toEqual(payload);
    expect(result.visualEnvironment).not.toBe(payload);
    expect(result.visualEnvironment?.sun).not.toBe(payload.sun);
  });

  it("rejects partial, out-of-range, or extended tuples", async () => {
    for (const visualEnvironment of [
      { ...exact(), moon: undefined },
      { ...exact(), chanceSnow: 101 },
      { ...exact(), guessedSkyBox: 2 },
    ]) {
      const fetchFn = vi.fn(async () => Response.json(detailPayload(visualEnvironment)));
      const port = new HttpAreaApiPort(fetchFn as unknown as typeof fetch, "http://backend/api/v1");
      await expect(port.getAreaById("token", "visual_http")).rejects.toThrow();
    }
  });

  it("serializes the nested full-tuple CAS without sharing or flattening fields", async () => {
    const expectedValue = exact();
    const value: AreaVisualEnvironment = {
      ...exact(),
      dayNightMode: "always_night",
      sun: { ...exact().sun, fogColor: 0x010203 },
    };
    const fetchFn = vi.fn().mockResolvedValue(new Response(new Uint8Array([1]), {
      status: 200,
      headers: { "content-type": "application/octet-stream" },
    }));

    await exportAuroraAreaEditingAre({
      accessToken: "token",
      name: "Visual HTTP",
      state,
      visualEnvironment: { expectedValue, value },
      fetchFn,
      baseUrl: "http://backend/api/v1",
    });

    const request = fetchFn.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      visualEnvironment: { expectedValue, value },
    });
  });

  it("accepts, detaches, and serializes the exact scalar-control CAS pair", async () => {
    const controls: AreaVisualEnvironmentScalarControls = {
      fogClipDistance: 80,
      windPower: 0,
    };
    const fetchFn = vi.fn(async () => Response.json(detailPayload(exact(), controls)));
    const port = new HttpAreaApiPort(fetchFn as unknown as typeof fetch, "http://backend/api/v1");

    const detail = await port.getAreaById("token", "visual_http");
    expect(detail.visualEnvironmentScalarControls).toEqual(controls);
    expect(detail.visualEnvironmentScalarControls).not.toBe(controls);

    const exportFetch = vi.fn().mockResolvedValue(new Response(new Uint8Array([1]), {
      status: 200,
      headers: { "content-type": "application/octet-stream" },
    }));
    await exportAuroraAreaEditingAre({
      accessToken: "token",
      name: "Visual HTTP",
      state,
      visualEnvironmentScalarControls: {
        expectedValue: controls,
        value: { fogClipDistance: 120, windPower: 2 },
      },
      fetchFn: exportFetch,
      baseUrl: "http://backend/api/v1",
    });
    expect(JSON.parse(String((exportFetch.mock.calls[0]?.[1] as RequestInit).body)))
      .toMatchObject({
        visualEnvironmentScalarControls: {
          expectedValue: controls,
          value: { fogClipDistance: 120, windPower: 2 },
        },
      });
  });

  it("rejects partial, out-of-range, fractional, or extended scalar pairs", async () => {
    for (const controls of [
      { fogClipDistance: 80 },
      { fogClipDistance: 29, windPower: 0 },
      { fogClipDistance: 80.5, windPower: 0 },
      { fogClipDistance: 80, windPower: 3 },
      { fogClipDistance: 80, windPower: 0, lightingScheme: 2 },
    ]) {
      const fetchFn = vi.fn(async () => Response.json(detailPayload(exact(), controls)));
      const port = new HttpAreaApiPort(fetchFn as unknown as typeof fetch, "http://backend/api/v1");
      await expect(port.getAreaById("token", "visual_http")).rejects.toThrow();
    }
  });

  it("accepts and deeply detaches the exact effective visual catalog bundle", async () => {
    const catalogs = visualCatalogs();
    const fetchFn = vi.fn(async () => Response.json(detailPayload(exact(), undefined, catalogs)));
    const port = new HttpAreaApiPort(fetchFn as unknown as typeof fetch, "http://backend/api/v1");

    const detail = await port.getAreaById("token", "visual_http");
    expect(detail.visualEnvironmentCatalogs).toEqual(catalogs);
    expect(detail.visualEnvironmentCatalogs).not.toBe(catalogs);
    expect(detail.visualEnvironmentCatalogs?.lightingSchemes.rows[0]?.visualEnvironment.sun)
      .not.toBe(catalogs.lightingSchemes.rows[0]!.visualEnvironment.sun);
  });

  it("rejects a partial or drifted effective visual catalog bundle", async () => {
    for (const catalogs of [
      { ...visualCatalogs(), skyBoxes: undefined },
      {
        ...visualCatalogs(),
        lightingSchemes: {
          ...visualCatalogs().lightingSchemes,
          rows: [{
            ...visualCatalogs().lightingSchemes.rows[0],
            skyBoxRowIndex: 256,
          }],
        },
      },
    ]) {
      const fetchFn = vi.fn(async () => Response.json(
        detailPayload(exact(), undefined, catalogs),
      ));
      const port = new HttpAreaApiPort(fetchFn as unknown as typeof fetch, "http://backend/api/v1");
      await expect(port.getAreaById("token", "visual_http")).rejects.toThrow();
    }
  });

  it("accepts, detaches, and rejects malformed retained catalog selections", async () => {
    const selection = { lightingSchemeRowIndex: 2, skyBoxRowIndex: 1 };
    const fetchFn = vi.fn(async () => Response.json(
      detailPayload(exact(), undefined, visualCatalogs(), selection),
    ));
    const port = new HttpAreaApiPort(fetchFn as unknown as typeof fetch, "http://backend/api/v1");
    const detail = await port.getAreaById("token", "visual_http");
    expect(detail.visualEnvironmentCatalogSelection).toEqual(selection);
    expect(detail.visualEnvironmentCatalogSelection).not.toBe(selection);

    for (const malformed of [
      { lightingSchemeRowIndex: 2 },
      { lightingSchemeRowIndex: 2, skyBoxRowIndex: 256 },
      { lightingSchemeRowIndex: 2, skyBoxRowIndex: 1, guessed: true },
    ]) {
      const invalidFetch = vi.fn(async () => Response.json(
        detailPayload(exact(), undefined, visualCatalogs(), malformed),
      ));
      const invalidPort = new HttpAreaApiPort(
        invalidFetch as unknown as typeof fetch,
        "http://backend/api/v1",
      );
      await expect(invalidPort.getAreaById("token", "visual_http")).rejects.toThrow();
    }
  });
});

function visualCatalogs() {
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
        label: "Exterior",
        displayName: "Exterior",
        displaySource: "label" as const,
        visualEnvironment: exact(),
        visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
        skyBoxRowIndex: 0,
      }],
    },
    skyBoxes: {
      descriptor: {
        resourceName: "skyboxes.2da" as const,
        sourceObjectKey: "modules/current/skyboxes.2da",
        sourceLayer: "module" as const,
        sha256: "b".repeat(64),
        sizeBytes: 128,
        rowCount: 1,
      },
      rows: [{ rowIndex: 0, displayName: "None", displaySource: "row_index" as const }],
    },
  };
}
