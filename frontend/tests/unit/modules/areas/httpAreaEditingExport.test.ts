import { describe, expect, it, vi } from "vitest";
import {
  AreaEditingRequestError,
  exportAuroraAreaEditingAre,
  persistNewAuroraArea,
  verifyAuroraAreaEditing
} from "../../../../src/modules/areas/adapters/httpAreaEditingExport";
import type { AuroraAreaEditingState } from "../../../../src/modules/scene/domain/auroraAreaEditing";

describe("exportAuroraAreaEditingAre", () => {
  it("sends source Tile_List provenance only for source-backed tiles", async () => {
    const sourceVisualEnvironment = createVisualEnvironment();
    const targetVisualEnvironment = {
      ...sourceVisualEnvironment,
      dayNightMode: "always_night" as const,
      sun: { ...sourceVisualEnvironment.sun, fogAmount: 9 },
      moon: { ...sourceVisualEnvironment.moon },
    };
    const state: AuroraAreaEditingState = {
      schemaVersion: 1,
      areaResRef: "area_test",
      tilesetResRef: "testset",
      tilesetFingerprint: "a".repeat(64),
      randomSeed: 12345,
      sourceAreaFingerprint: "b".repeat(64),
      width: 2,
      height: 2,
      tiles: [
        {
          id: "source",
          row: 0,
          col: 0,
          sourceRow: 1,
          sourceCol: 0,
          tileId: 1,
          orientation: 2,
          height: 3
        },
        { id: "new", row: 0, col: 1, tileId: 2, orientation: 0, height: 0 }
      ],
      topology: {
        tokenWidth: 5,
        tokenHeight: 5,
        tokens: [],
        cornerWidth: 3,
        cornerHeight: 3,
        heights: []
      },
      groupInstances: []
    };
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "application/octet-stream" }
      })
    );

    await exportAuroraAreaEditingAre({
      accessToken: "token",
      name: "Area Test",
      state,
      comments: { expectedValue: " old ", value: " new " },
      eventScripts: {
        onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
        onExit: { expectedResRef: "old_exit", resRef: "" },
      },
      basicIdentity: {
        name: {
          expectedValue: " Old Name ",
          value: " New Name ",
          expectedProfile: "multi_entry_inline_ascii",
          expectedEntries: [
            { languageId: 0, text: " Old Name " },
            { languageId: 2, text: "Krypta" },
          ],
          valueEntries: [
            { languageId: 0, text: " New Name " },
            { languageId: 2, text: "Stara krypta" },
            { languageId: 11, text: "Krypta" },
          ],
        },
        tag: { expectedValue: "OLD_TAG", value: "NEW_TAG" },
      },
      advancedFlags: {
        terrainType: {
          expectedValue: { interior: false, natural: true, subterranean: false },
          value: { interior: true, natural: false, subterranean: true },
        },
        playerVsPlayer: { expectedValue: 0, value: 3 },
        noRest: { expectedValue: false, value: true },
        listenCheckModifier: { expectedValue: -8, value: 9 },
        spotCheckModifier: { expectedValue: 11, value: -12 },
        loadingScreenId: { expectedValue: 0, value: 0xffff },
      },
      visualEnvironmentCatalogSelection: {
        catalogIdentity: {
          environmentSha256: "c".repeat(64),
          skyBoxesSha256: "d".repeat(64),
        },
        expectedValue: {
          lightingSchemeRowIndex: 0,
          skyBoxRowIndex: 0,
          visualEnvironment: sourceVisualEnvironment,
          visualEnvironmentScalarControls: {
            fogClipDistance: 45,
            windPower: 0,
          },
        },
        value: {
          lightingSchemeRowIndex: 1,
          skyBoxRowIndex: 2,
          visualEnvironmentOverride: targetVisualEnvironment,
          visualEnvironmentScalarControlsOverride: {
            fogClipDistance: 120,
            windPower: 2,
          },
        },
      },
      fetchFn,
      baseUrl: "http://backend/api/v1"
    });

    const request = fetchFn.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as {
      comments: { expectedValue: string; value: string };
      eventScripts: Record<string, { expectedResRef: string; resRef: string }>;
      basicIdentity: Record<string, {
        expectedValue: string;
        value: string;
        expectedProfile?: string;
        expectedEntries?: Array<{ languageId: number; text: string }>;
        valueEntries?: Array<{ languageId: number; text: string }>;
      }>;
      advancedFlags: Record<string, { expectedValue: unknown; value: unknown }>;
      visualEnvironmentCatalogSelection: {
        catalogIdentity: { environmentSha256: string; skyBoxesSha256: string };
        expectedValue: Record<string, unknown>;
        value: Record<string, unknown>;
      };
      tiles: Array<Record<string, unknown>>;
    };
    expect(payload).not.toHaveProperty("randomSeed");
    expect(payload.comments).toEqual({ expectedValue: " old ", value: " new " });
    expect(payload.eventScripts).toEqual({
      onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
      onExit: { expectedResRef: "old_exit", resRef: "" },
    });
    expect(payload.basicIdentity).toEqual({
      name: {
        expectedValue: " Old Name ",
        value: " New Name ",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: [
          { languageId: 0, text: " Old Name " },
          { languageId: 2, text: "Krypta" },
        ],
        valueEntries: [
          { languageId: 0, text: " New Name " },
          { languageId: 2, text: "Stara krypta" },
          { languageId: 11, text: "Krypta" },
        ],
      },
      tag: { expectedValue: "OLD_TAG", value: "NEW_TAG" },
    });
    expect(payload.advancedFlags).toEqual({
      terrainType: {
        expectedValue: { interior: false, natural: true, subterranean: false },
        value: { interior: true, natural: false, subterranean: true },
      },
      playerVsPlayer: { expectedValue: 0, value: 3 },
      noRest: { expectedValue: false, value: true },
      listenCheckModifier: { expectedValue: -8, value: 9 },
      spotCheckModifier: { expectedValue: 11, value: -12 },
      loadingScreenId: { expectedValue: 0, value: 0xffff },
    });
    expect(payload.visualEnvironmentCatalogSelection).toEqual({
      catalogIdentity: {
        environmentSha256: "c".repeat(64),
        skyBoxesSha256: "d".repeat(64),
      },
      expectedValue: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
        visualEnvironment: sourceVisualEnvironment,
        visualEnvironmentScalarControls: {
          fogClipDistance: 45,
          windPower: 0,
        },
      },
      value: {
        lightingSchemeRowIndex: 1,
        skyBoxRowIndex: 2,
        visualEnvironmentOverride: targetVisualEnvironment,
        visualEnvironmentScalarControlsOverride: {
          fogClipDistance: 120,
          windPower: 2,
        },
      },
    });
    expect(payload.tiles[0]).toMatchObject({ sourceRow: 1, sourceCol: 0 });
    expect(payload.tiles[1]).not.toHaveProperty("sourceRow");
    expect(payload.tiles[1]).not.toHaveProperty("sourceCol");
  });

  it("posts the same complete draft to Verify and maps diagnostics", async () => {
    const state = createState();
    const fetchFn = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          valid: true,
          issues: [],
          stats: { width: 2, height: 2, tileCount: 2 },
          tilesetFingerprint: state.tilesetFingerprint
        }
      })
    );

    const result = await verifyAuroraAreaEditing({
      accessToken: "token",
      name: "Area Test",
      state,
      fetchFn,
      baseUrl: "http://backend/api/v1"
    });

    expect(result.valid).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(
      "http://backend/api/v1/areas/editing/verify",
      expect.objectContaining({ method: "POST" })
    );
    const request = fetchFn.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as {
      areaResRef: string;
      tilesetFingerprint: string;
      tiles: Array<Record<string, unknown>>;
    };
    expect(payload).toMatchObject({
      areaResRef: "area_test",
      tilesetFingerprint: state.tilesetFingerprint
    });
    expect(payload.tiles[0]).toMatchObject({ tileId: 1, mainLight1: 11 });
  });

  it("persists only source-free new Area drafts", async () => {
    const sourceBacked = createState();
    const fetchFn = vi.fn();
    await expect(
      persistNewAuroraArea({
        accessToken: "token",
        name: "Area Test",
        state: sourceBacked,
        fetchFn,
        baseUrl: "http://backend/api/v1"
      })
    ).rejects.toThrow("Only a new local Area draft");
    expect(fetchFn).not.toHaveBeenCalled();

    const state = { ...sourceBacked, sourceAreaFingerprint: undefined };
    fetchFn.mockResolvedValueOnce(Response.json({
      data: {
        areaResRef: "area_test",
        areaFingerprint: "c".repeat(64),
        created: true,
        resources: []
      }
    }));
    const result = await persistNewAuroraArea({
      accessToken: "token",
      name: "Area Test",
      state,
      fetchFn,
      baseUrl: "http://backend/api/v1"
    });
    expect(result.created).toBe(true);
    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      "http://backend/api/v1/areas/editing/persist/new-area"
    );
  });

  it("preserves the backend candidate-validation code and diagnostics", async () => {
    const state = { ...createState(), sourceAreaFingerprint: undefined };
    const fetchFn = vi.fn().mockResolvedValue(
      Response.json({
        contractVersion: "1.0.0",
        requestId: "req_area_invalid",
        error: {
          code: "AREA_CREATE_CANDIDATE_INVALID",
          message: "Generated Area resources do not match the admitted native creation profile.",
          retryable: false,
          details: [
            {
              path: "are.ChanceLightning",
              reason: "ARE_REQUIRED_FIELD_MISSING: Required GFF field ChanceLightning is missing."
            }
          ]
        }
      }, { status: 422 })
    );

    const request = persistNewAuroraArea({
      accessToken: "token",
      name: "Area Test",
      state,
      fetchFn,
      baseUrl: "http://backend/api/v1"
    });

    await expect(request).rejects.toMatchObject({
      name: "AreaEditingRequestError",
      status: 422,
      code: "AREA_CREATE_CANDIDATE_INVALID",
      retryable: false,
      details: [expect.objectContaining({ path: "are.ChanceLightning" })]
    } satisfies Partial<AreaEditingRequestError>);
    await expect(request).rejects.toThrow(
      "Generated Area resources do not match the admitted native creation profile."
    );
  });
});

function createState(): AuroraAreaEditingState {
  return {
    schemaVersion: 1,
    areaResRef: "area_test",
    tilesetResRef: "testset",
    tilesetFingerprint: "a".repeat(64),
    randomSeed: 12345,
    sourceAreaFingerprint: "b".repeat(64),
    width: 2,
    height: 2,
    tiles: [
      {
        id: "source",
        row: 0,
        col: 0,
        sourceRow: 0,
        sourceCol: 0,
        tileId: 1,
        orientation: 0,
        height: 0,
        mainLight1: 11
      },
      { id: "new", row: 0, col: 1, tileId: 2, orientation: 0, height: 0 }
    ],
    topology: {
      tokenWidth: 5,
      tokenHeight: 5,
      tokens: [],
      cornerWidth: 3,
      cornerHeight: 3,
      heights: []
    },
    groupInstances: []
  };
}

function createVisualEnvironment() {
  return {
    dayNightMode: "cycle" as const,
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
  };
}
