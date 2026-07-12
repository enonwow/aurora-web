import { describe, expect, it } from "vitest";
import {
  applyTerrainStroke,
  copyAuroraAreaTilesToClipboard,
  createAuroraAreaEditingState,
  cutAuroraAreaTilesToClipboard,
  pasteAuroraAreaTilesFromClipboard,
  placeAuroraAreaGroup,
  removeAuroraAreaGroupAtCell,
  type AuroraAreaEditingState,
  type AuroraAreaTilesetDefinition
} from "../../../../../src/modules/scene/domain/auroraAreaEditing";

const corners = (terrain: string) => ({
  topLeft: terrain,
  topRight: terrain,
  bottomRight: terrain,
  bottomLeft: terrain
});
const heights = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };

const definition: AuroraAreaTilesetDefinition = {
  tilesetResRef: "clipboard_set",
  fingerprint: "d".repeat(64),
  defaultTerrain: "floor",
  transitionRules: [],
  tiles: [
    { tileId: 0, terrain: corners("floor"), crossers: {}, cornerHeights: heights },
    { tileId: 12, terrain: corners("water"), crossers: {}, cornerHeights: heights },
    {
      tileId: 10,
      terrain: corners("floor"),
      crossers: { right: "wall" },
      cornerHeights: heights,
      groupId: "room"
    },
    {
      tileId: 11,
      terrain: corners("floor"),
      crossers: { left: "wall" },
      cornerHeights: heights,
      groupId: "room"
    }
  ],
  groups: [{ id: "room", name: "Room", rows: 1, columns: 2, tileIds: [10, 11] }]
};

function createState(): AuroraAreaEditingState {
  const result = createAuroraAreaEditingState({
    areaResRef: "clipboard_area",
    width: 4,
    height: 4,
    definition,
    selector: () => 0
  });
  if (!result.ok) throw new Error(result.message);
  result.state.tiles.forEach((tile) => {
    tile.sourceRow = tile.row;
    tile.sourceCol = tile.col;
  });
  return result.state;
}

describe("Aurora Area tile clipboard", () => {
  it("expands a member selection to the whole group and stores a relative bbox", () => {
    const placed = placeAuroraAreaGroup(createState(), definition, "room", { row: 1, col: 1 }, 0, () => 0);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const copied = copyAuroraAreaTilesToClipboard(placed.state, [{ row: 1, col: 2 }]);
    expect(copied.ok).toBe(true);
    if (!copied.ok) return;
    expect(copied.payload).toMatchObject({ width: 2, height: 1 });
    expect(copied.payload.tiles.map(({ relativeRow, relativeCol }) => [relativeRow, relativeCol])).toEqual([
      [0, 0],
      [0, 1]
    ]);
    expect(copied.payload.groups[0]?.memberTileIndexes).toEqual([0, 1]);
  });

  it("pastes a group atomically with destination provenance and an exact underlay", () => {
    const initial = createState();
    const placed = placeAuroraAreaGroup(initial, definition, "room", { row: 0, col: 0 }, 0, () => 0);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const sourceMember = placed.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)!;
    sourceMember.mainLight1 = 77;
    const copied = copyAuroraAreaTilesToClipboard(placed.state, [{ row: 0, col: 0 }]);
    expect(copied.ok).toBe(true);
    if (!copied.ok) return;

    const pasted = pasteAuroraAreaTilesFromClipboard(placed.state, definition, copied.payload, {
      row: 2,
      col: 1
    });
    expect(pasted.ok).toBe(true);
    if (!pasted.ok) return;
    const pastedFirst = pasted.state.tiles.find((tile) => tile.row === 2 && tile.col === 1)!;
    expect(pastedFirst).toMatchObject({ tileId: 10, mainLight1: 77, groupId: "room" });
    expect(pastedFirst.sourceRow).toBe(2);
    expect(pastedFirst.sourceCol).toBe(1);

    const removed = removeAuroraAreaGroupAtCell(pasted.state, definition, { row: 2, col: 2 });
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.state.tiles.find((tile) => tile.row === 2 && tile.col === 1)).toEqual(
      placed.state.tiles.find((tile) => tile.row === 2 && tile.col === 1)
    );
    expect(removed.state.tiles.find((tile) => tile.row === 2 && tile.col === 2)).toEqual(
      placed.state.tiles.find((tile) => tile.row === 2 && tile.col === 2)
    );
  });

  it("fails closed on group collision and out-of-bounds paste", () => {
    const placed = placeAuroraAreaGroup(createState(), definition, "room", { row: 1, col: 1 }, 0, () => 0);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const copied = copyAuroraAreaTilesToClipboard(placed.state, [{ row: 1, col: 1 }]);
    expect(copied.ok).toBe(true);
    if (!copied.ok) return;
    const snapshot = JSON.stringify(placed.state);

    expect(
      pasteAuroraAreaTilesFromClipboard(placed.state, definition, copied.payload, { row: 1, col: 1 })
    ).toMatchObject({ ok: false, code: "CLIPBOARD_COLLISION" });
    expect(
      pasteAuroraAreaTilesFromClipboard(placed.state, definition, copied.payload, { row: 3, col: 3 })
    ).toMatchObject({ ok: false, code: "GROUP_OUT_OF_BOUNDS" });
    expect(JSON.stringify(placed.state)).toBe(snapshot);
  });

  it("rejects an exact copied tile when its boundary is incompatible with destination neighbors", () => {
    const source = createState();
    const allCells = source.tiles.map((tile) => ({ row: tile.row, col: tile.col }));
    const water = applyTerrainStroke(source, definition, allCells, "water", () => 0);
    expect(water.ok).toBe(true);
    if (!water.ok) return;
    const copied = copyAuroraAreaTilesToClipboard(water.state, [{ row: 1, col: 1 }]);
    expect(copied.ok).toBe(true);
    if (!copied.ok) return;
    const destination = createState();
    const snapshot = JSON.stringify(destination);

    expect(
      pasteAuroraAreaTilesFromClipboard(destination, definition, copied.payload, { row: 1, col: 1 })
    ).toMatchObject({ ok: false, code: "CLIPBOARD_INCOMPATIBLE" });
    expect(JSON.stringify(destination)).toBe(snapshot);
  });

  it("rejects clipboard group membership that is not the exact SET count and layout", () => {
    const placed = placeAuroraAreaGroup(createState(), definition, "room", { row: 0, col: 0 }, 0, () => 0);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const copied = copyAuroraAreaTilesToClipboard(placed.state, [{ row: 0, col: 0 }]);
    expect(copied.ok).toBe(true);
    if (!copied.ok) return;
    const malformed = structuredClone(copied.payload);
    malformed.groups[0]!.memberTileIndexes.pop();
    const destination = createState();
    const snapshot = JSON.stringify(destination);

    expect(
      pasteAuroraAreaTilesFromClipboard(destination, definition, malformed, { row: 2, col: 1 })
    ).toMatchObject({ ok: false, code: "CLIPBOARD_INCOMPATIBLE" });
    expect(JSON.stringify(destination)).toBe(snapshot);
  });

  it("cuts a group as one result and keeps its expanded payload for paste", () => {
    const placed = placeAuroraAreaGroup(createState(), definition, "room", { row: 1, col: 1 }, 0, () => 0);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const cut = cutAuroraAreaTilesToClipboard(placed.state, definition, [{ row: 1, col: 2 }]);
    expect(cut.ok).toBe(true);
    if (!cut.ok) return;
    expect(cut.payload.tiles).toHaveLength(2);
    expect(cut.state.groupInstances).toHaveLength(0);
    expect(cut.state.tiles.find((tile) => tile.row === 1 && tile.col === 1)?.tileId).toBe(0);
    expect(placed.state.groupInstances).toHaveLength(1);
  });

  it("fails closed instead of guessing a loose Cut blank when SET defaults are ambiguous", () => {
    const ambiguous: AuroraAreaTilesetDefinition = {
      ...definition,
      tiles: [
        ...definition.tiles,
        { tileId: 13, terrain: corners("floor"), crossers: {}, cornerHeights: heights }
      ]
    };
    const created = createAuroraAreaEditingState({
      areaResRef: "ambiguous_cut",
      width: 2,
      height: 2,
      definition: ambiguous,
      selector: () => 0
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const snapshot = JSON.stringify(created.state);

    expect(
      cutAuroraAreaTilesToClipboard(created.state, ambiguous, [{ row: 0, col: 0 }])
    ).toMatchObject({ ok: false, code: "NO_MATCHING_TILE" });
    expect(JSON.stringify(created.state)).toBe(snapshot);
  });
});
