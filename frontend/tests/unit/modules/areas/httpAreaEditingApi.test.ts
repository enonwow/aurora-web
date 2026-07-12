import { describe, expect, it, vi } from "vitest";
import { HttpAreaEditingApi } from "../../../../src/modules/areas/adapters/httpAreaEditingApi";

const completeTilesetDefinition = {
  schemaVersion: 1,
  tilesetResRef: "tno01",
  fingerprint: "set-sha256",
  defaults: {
    interior: false,
    hasHeightTransition: true,
    transition: 2,
    borderTerrain: "grass",
    defaultTerrain: "dirt",
    floorTerrain: "stone"
  },
  terrainTypes: [
    { id: "grass", name: "Grass" },
    { id: "dirt", name: "Dirt" }
  ],
  crosserTypes: [{ id: "road", name: "Road" }],
  transitionRules: [
    {
      placedTerrain: "grass",
      placedHeight: 0,
      adjacentTerrain: "dirt",
      adjacentHeight: 0,
      changedTerrain: "grass_dirt",
      changedHeight: 0
    }
  ],
  tiles: [
    {
      tileId: 7,
      modelResRef: "tno01_tile07",
      terrain: { topLeft: "grass" },
      crossers: { top: "road" },
      cornerHeights: { topLeft: 0 }
    }
  ],
  groups: [{ id: "group0", name: "Inn", rows: 1, columns: 1, tileIds: [7] }],
  diagnostics: [
    {
      code: "SET_GROUP_TILE_MISSING",
      message: "Example parser warning",
      section: "GROUP0",
      severity: "warning"
    }
  ]
} as const;

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

describe("HttpAreaEditingApi", () => {
  it("preserves the complete SET palette contract when loading a tileset", async () => {
    const fetchStub = vi.fn(async () => jsonResponse(completeTilesetDefinition));
    const api = new HttpAreaEditingApi(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const definition = await api.getAreaTilesetDefinition("token_abc", "tno 01");

    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/editing/tilesets/tno%2001",
      { headers: { Authorization: "Bearer token_abc" } }
    );
    expect(definition).toEqual({
      ...completeTilesetDefinition,
      defaultTerrain: "dirt"
    });
  });

  it("preserves the complete SET palette contract from an area source response", async () => {
    const fetchStub = vi.fn(async () =>
      jsonResponse({
        areaFingerprint: "are-sha256",
        tileset: completeTilesetDefinition
      })
    );
    const api = new HttpAreaEditingApi(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const result = await api.getAreaEditingDefinitionForArea("token_abc", "area/one");

    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/editing/source/area%2Fone",
      { headers: { Authorization: "Bearer token_abc" } }
    );
    expect(result).toEqual({
      areaFingerprint: "are-sha256",
      definition: {
        ...completeTilesetDefinition,
        defaultTerrain: "dirt"
      }
    });
  });

  it("maps missing optional palette collections to stable empty defaults", async () => {
    const fetchStub = vi.fn(async () =>
      jsonResponse({
        tilesetResRef: "legacy",
        fingerprint: "legacy-sha256"
      })
    );
    const api = new HttpAreaEditingApi(fetchStub as unknown as typeof fetch, "/api/v1");

    const definition = await api.getAreaTilesetDefinition("token_abc", "legacy");

    expect(definition).toEqual({
      tilesetResRef: "legacy",
      fingerprint: "legacy-sha256",
      defaults: {},
      terrainTypes: [],
      crosserTypes: [],
      diagnostics: [],
      defaultTerrain: undefined,
      transitionRules: [],
      tiles: [],
      groups: []
    });
  });
});
