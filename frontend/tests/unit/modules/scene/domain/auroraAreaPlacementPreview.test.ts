import { describe, expect, it } from "vitest";
import { createAuroraAreaEditingState, placeAuroraAreaGroup, type AuroraAreaTilesetDefinition } from "../../../../../src/modules/scene/domain/auroraAreaEditing";
import { resolveAuroraAreaPlacementPreview } from "../../../../../src/modules/scene/domain/auroraAreaPlacementPreview";

const allCorners = (terrain: string) => ({
  topLeft: terrain,
  topRight: terrain,
  bottomRight: terrain,
  bottomLeft: terrain
});

const allHeights = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };

const definition: AuroraAreaTilesetDefinition = {
  tilesetResRef: "testset",
  fingerprint: "a".repeat(64),
  defaultTerrain: "grass",
  transitionRules: [
    {
      placedTerrain: "water",
      placedHeight: 0,
      adjacentTerrain: "grass",
      adjacentHeight: 0,
      changedTerrain: "water",
      changedHeight: 0
    }
  ],
  tiles: [
    { tileId: 0, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights },
    { tileId: 1, terrain: allCorners("water"), crossers: {}, cornerHeights: allHeights },
    { tileId: 2, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights, groupId: "group0" },
    { tileId: 3, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights, groupId: "group0" }
  ],
  groups: [{ id: "group0", name: "Two tile building", rows: 1, columns: 2, tileIds: [2, 3] }]
};

function createState() {
  const result = createAuroraAreaEditingState({
    areaResRef: "area_test",
    width: 2,
    height: 2,
    definition,
    selector: () => 0
  });
  if (!result.ok) throw new Error(result.message);
  return result.state;
}

describe("auroraAreaPlacementPreview", () => {
  it("uses a valid one-cell terrain fallback when no Aurora payload exists", () => {
    expect(
      resolveAuroraAreaPlacementPreview({
        hoveredCell: { row: 3, col: 5 },
        selection: { kind: "terrain", terrain: "water" }
      })
    ).toMatchObject({
      source: "terrain-fallback",
      kind: "terrain",
      targetCells: [{ row: 3, col: 5 }],
      valid: true,
      status: "terrain-fallback",
      code: "TERRAIN_FALLBACK"
    });
  });

  it("resolves an Aurora terrain preview without retaining a changed Area state", () => {
    const state = createState();
    const before = structuredClone(state);

    const preview = resolveAuroraAreaPlacementPreview({
      payload: { state, definition },
      hoveredCell: { row: 0, col: 1 },
      selection: { kind: "terrain", terrain: "water" },
      selector: () => 0
    });

    expect(preview).toMatchObject({
      source: "aurora",
      targetCells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 }
      ],
      valid: true,
      status: "valid",
      code: "OK"
    });
    expect(preview).not.toHaveProperty("state");
    expect(state).toEqual(before);
  });

  it("surfaces no matching terrain and a terrain cursor outside the Area", () => {
    const state = createState();
    const noMatching = resolveAuroraAreaPlacementPreview({
      payload: { state, definition },
      hoveredCell: { row: 0, col: 0 },
      selection: { kind: "terrain", terrain: "lava" },
      selector: () => 0
    });
    const outOfBounds = resolveAuroraAreaPlacementPreview({
      payload: { state, definition },
      hoveredCell: { row: -1, col: 0 },
      selection: { kind: "terrain", terrain: "water" },
      selector: () => 0
    });

    expect(noMatching).toMatchObject({ valid: false, status: "no-matching-tile", code: "NO_MATCHING_TILE" });
    expect(outOfBounds).toMatchObject({ valid: false, status: "out-of-bounds", code: "TILE_UNKNOWN" });
  });

  it("uses selected group orientation for target cells and reports bounds and overlap", () => {
    const state = createState();
    const valid = resolveAuroraAreaPlacementPreview({
      payload: { state, definition },
      hoveredCell: { row: 0, col: 0 },
      selection: { kind: "group", groupId: "group0", orientation: 1 },
      selector: () => 0
    });
    const outOfBounds = resolveAuroraAreaPlacementPreview({
      payload: { state, definition },
      hoveredCell: { row: 1, col: 1 },
      selection: { kind: "group", groupId: "group0", orientation: 0 },
      selector: () => 0
    });
    const placed = placeAuroraAreaGroup(state, definition, "group0", { row: 0, col: 0 }, 0, () => 0);
    if (!placed.ok) throw new Error(placed.message);
    const overlap = resolveAuroraAreaPlacementPreview({
      payload: { state: placed.state, definition },
      hoveredCell: { row: 0, col: 0 },
      selection: { kind: "group", groupId: "group0", orientation: 0 },
      selector: () => 0
    });

    expect(valid).toMatchObject({
      valid: true,
      orientation: 1,
      targetCells: [{ row: 0, col: 0 }, { row: 1, col: 0 }]
    });
    expect(outOfBounds).toMatchObject({ valid: false, status: "out-of-bounds", code: "GROUP_OUT_OF_BOUNDS" });
    expect(overlap).toMatchObject({ valid: false, status: "overlap", code: "GROUP_OVERLAP" });
  });

  it("reports a terrain paint on a placed group as locked", () => {
    const placed = placeAuroraAreaGroup(createState(), definition, "group0", { row: 0, col: 0 }, 0, () => 0);
    if (!placed.ok) throw new Error(placed.message);

    expect(
      resolveAuroraAreaPlacementPreview({
        payload: { state: placed.state, definition },
        hoveredCell: { row: 0, col: 1 },
        selection: { kind: "terrain", terrain: "water" },
        selector: () => 0
      })
    ).toMatchObject({ valid: false, status: "locked", code: "GROUP_LOCKED" });
  });
});
