import { describe, expect, it } from "vitest";
import {
  applyAuroraAreaTileProperties,
  resetAuroraAreaTilePropertiesToSetDefaults
} from "../../../../../src/modules/scene/domain/auroraAreaTileProperties";
import {
  createAuroraAreaEditingState,
  type AuroraAreaTilesetDefinition
} from "../../../../../src/modules/scene/domain/auroraAreaEditing";

const definition: AuroraAreaTilesetDefinition = {
  tilesetResRef: "proof_set",
  fingerprint: "a".repeat(64),
  defaultTerrain: "grass",
  transitionRules: [],
  groups: [],
  tiles: [
    {
      tileId: 0,
      terrain: {
        topLeft: "grass",
        topRight: "grass",
        bottomRight: "grass",
        bottomLeft: "grass"
      },
      crossers: {},
      cornerHeights: {},
      mainLight1: 2,
      sourceLight2: 5,
      animLoop1: 1
    }
  ]
};

function createState() {
  const result = createAuroraAreaEditingState({
    areaResRef: "tile_props",
    width: 2,
    height: 2,
    definition,
    selector: () => 0
  });
  if (!result.ok) throw new Error(result.message);
  return result.state;
}

describe("Aurora Area Tile Properties", () => {
  it("atomically applies lights and animation loops to all selected tiles", () => {
    const state = createState();
    const selected = state.tiles.slice(0, 2).map((tile) => tile.id);
    const result = applyAuroraAreaTileProperties(state, selected, {
      mainLight1: 9,
      mainLight2: 10,
      sourceLight1: 11,
      sourceLight2: null,
      animLoop1: 0,
      animLoop2: 1,
      animLoop3: 1
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changedTileIds).toEqual(selected);
    expect(result.state.tiles.slice(0, 2)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mainLight1: 9,
          mainLight2: 10,
          sourceLight1: 11,
          animLoop1: 0,
          animLoop2: 1,
          animLoop3: 1
        })
      ])
    );
    expect(result.state.tiles.slice(0, 2).every((tile) => tile.sourceLight2 === undefined)).toBe(true);
    expect(state.tiles.slice(0, 2).every((tile) => tile.mainLight1 === 2)).toBe(true);
    expect(result.state.topology).toEqual(state.topology);
  });

  it("rejects the entire patch when one byte is invalid or a tile is stale", () => {
    const state = createState();
    expect(applyAuroraAreaTileProperties(state, [state.tiles[0].id], { animLoop3: 256 })).toMatchObject({
      ok: false,
      code: "TILE_PROPERTY_INVALID"
    });
    expect(applyAuroraAreaTileProperties(state, [state.tiles[0].id, "stale"], { mainLight1: 3 })).toMatchObject({
      ok: false,
      code: "TILE_UNKNOWN"
    });
    expect(state.tiles.every((tile) => tile.mainLight1 === 2)).toBe(true);
  });

  it("returns the original state for a no-op patch", () => {
    const state = createState();
    const result = applyAuroraAreaTileProperties(state, [state.tiles[0].id], {
      mainLight1: 2,
      animLoop1: 1
    });
    expect(result).toMatchObject({ ok: true, changedTileIds: [] });
    if (!result.ok) return;
    expect(result.state).toBe(state);
  });

  it("restores each selected tile's authored SET defaults", () => {
    const state = createState();
    const selected = state.tiles.slice(0, 2).map((tile) => tile.id);
    const changed = applyAuroraAreaTileProperties(state, selected, {
      mainLight1: 20,
      mainLight2: 21,
      sourceLight2: 22,
      animLoop1: null,
      animLoop3: 1
    });
    if (!changed.ok) throw new Error(changed.message);

    const reset = resetAuroraAreaTilePropertiesToSetDefaults(
      changed.state,
      definition,
      selected
    );
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;
    expect(reset.state.tiles.slice(0, 2).every((tile) =>
      tile.mainLight1 === 2 &&
      tile.mainLight2 === undefined &&
      tile.sourceLight2 === 5 &&
      tile.animLoop1 === 1 &&
      tile.animLoop3 === undefined
    )).toBe(true);
  });
});
