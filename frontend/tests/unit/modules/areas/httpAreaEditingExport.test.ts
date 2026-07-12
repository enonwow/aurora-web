import { describe, expect, it, vi } from "vitest";
import {
  exportAuroraAreaEditingAre,
  persistNewAuroraArea,
  verifyAuroraAreaEditing
} from "../../../../src/modules/areas/adapters/httpAreaEditingExport";
import type { AuroraAreaEditingState } from "../../../../src/modules/scene/domain/auroraAreaEditing";

describe("exportAuroraAreaEditingAre", () => {
  it("sends source Tile_List provenance only for source-backed tiles", async () => {
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
      fetchFn,
      baseUrl: "http://backend/api/v1"
    });

    const request = fetchFn.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as { tiles: Array<Record<string, unknown>> };
    expect(payload).not.toHaveProperty("randomSeed");
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
