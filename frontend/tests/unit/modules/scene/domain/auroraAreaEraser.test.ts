import { describe, expect, it } from "vitest";
import {
  createConservativeAuroraAreaEraserPlan,
  drawAuroraNativeRandom,
  eraseAuroraAreaConservatively
} from "../../../../../src/modules/scene/domain/auroraAreaEraser";
import {
  type AuroraAreaEditingState,
  type AuroraAreaTilesetDefinition
} from "../../../../../src/modules/scene/domain/auroraAreaEditing";
import {
  cutAuroraAreaTilesWithSourceGroups,
  removeSourceAuroraAreaGroupConservatively,
  rotateSourceAuroraAreaGroupConservatively
} from "../../../../../src/modules/scene/domain/auroraAreaSourceGroupEditing";

const terrain = {
  topLeft: "floor",
  topRight: "floor",
  bottomRight: "floor",
  bottomLeft: "floor"
};
const asymmetricHeights = {
  topLeft: 0,
  topRight: 1,
  bottomRight: 2,
  bottomLeft: 1
};

function definition(extraLooseTile = false): AuroraAreaTilesetDefinition {
  return {
    tilesetResRef: "eraser_set",
    fingerprint: "e".repeat(64),
    defaultTerrain: "floor",
    transitionRules: [],
    tiles: [
      { tileId: 0, terrain, crossers: {}, cornerHeights: asymmetricHeights },
      ...(extraLooseTile
        ? [{ tileId: 1, terrain, crossers: {}, cornerHeights: asymmetricHeights }]
        : []),
      {
        tileId: 2,
        terrain,
        crossers: { left: "group_wall" },
        cornerHeights: { topLeft: 1, topRight: 0, bottomRight: 1, bottomLeft: 2 }
      },
      {
        tileId: 10,
        terrain,
        crossers: { right: "group_wall" },
        cornerHeights: asymmetricHeights,
        groupId: "source_group"
      }
    ],
    groups: [
      { id: "source_group", name: "Source group", rows: 1, columns: 1, tileIds: [10] }
    ]
  };
}

function sourceGroupState(tileset = definition()): AuroraAreaEditingState {
  const tokens = Array<string | null>(25).fill(null);
  for (const row of [0, 2, 4]) {
    for (const col of [0, 2, 4]) tokens[row * 5 + col] = "floor";
  }
  tokens[1 * 5 + 2] = "group_wall";
  return {
    schemaVersion: 1,
    areaResRef: "eraser_area",
    tilesetResRef: tileset.tilesetResRef,
    tilesetFingerprint: tileset.fingerprint,
    width: 2,
    height: 2,
    sourceAreaFingerprint: "f".repeat(64),
    tiles: [
      {
        id: "source-group-tile",
        row: 0,
        col: 0,
        tileId: 10,
        orientation: 0,
        height: 7,
        mainLight1: 11,
        mainLight2: 12,
        sourceLight1: 13,
        sourceLight2: 14,
        animLoop1: 15,
        animLoop2: 16,
        animLoop3: 17,
        sourceRow: 0,
        sourceCol: 0,
        groupId: "source_group"
      },
      { id: "loose-01", row: 0, col: 1, tileId: 2, orientation: 0, height: 7 },
      { id: "loose-10", row: 1, col: 0, tileId: 0, orientation: 3, height: 7 },
      { id: "loose-11", row: 1, col: 1, tileId: 0, orientation: 2, height: 7 }
    ],
    topology: {
      tokenWidth: 5,
      tokenHeight: 5,
      tokens,
      cornerWidth: 3,
      cornerHeight: 3,
      heights: [7, 8, 7, 8, 9, 8, 7, 8, 7]
    },
    groupInstances: [{
      groupId: "source_group",
      anchorRow: 0,
      anchorCol: 0,
      orientation: 0,
      tileIds: ["source-group-tile"],
      cells: [{ row: 0, col: 0 }]
    }]
  };
}

function rotationFixture(): { state: AuroraAreaEditingState; tileset: AuroraAreaTilesetDefinition } {
  const tileset = definition();
  tileset.tiles = tileset.tiles
    .filter((tile) => tile.tileId !== 2)
    .map((tile) => tile.tileId === 10 ? { ...tile, crossers: {} } : tile);
  tileset.tiles.push(
    { tileId: 50, terrain, crossers: {}, cornerHeights: { topLeft: 0, topRight: 0, bottomRight: 1, bottomLeft: 1 } },
    { tileId: 51, terrain, crossers: {}, cornerHeights: { topLeft: 2, topRight: 1, bottomRight: 1, bottomLeft: 0 } },
    { tileId: 52, terrain, crossers: {}, cornerHeights: { topLeft: 1, topRight: 1, bottomRight: 0, bottomLeft: 1 } }
  );
  const state = sourceGroupState(tileset);
  state.topology.tokens[1 * 5 + 2] = null;
  const right = state.tiles.find((tile) => tile.row === 0 && tile.col === 1)!;
  right.tileId = 0;
  right.orientation = 1;
  return { state, tileset };
}

function flatTopology(width: number, height: number): AuroraAreaEditingState["topology"] {
  const tokenWidth = width * 2 + 1;
  const tokenHeight = height * 2 + 1;
  const tokens = Array<string | null>(tokenWidth * tokenHeight).fill(null);
  for (let row = 0; row <= height; row += 1) {
    for (let col = 0; col <= width; col += 1) {
      tokens[row * 2 * tokenWidth + col * 2] = "floor";
    }
  }
  return {
    tokenWidth,
    tokenHeight,
    tokens,
    cornerWidth: width + 1,
    cornerHeight: height + 1,
    heights: Array((width + 1) * (height + 1)).fill(0)
  };
}

function flatState(
  width: number,
  height: number,
  tileIds: number[],
  orientations: Array<0 | 1 | 2 | 3> = []
): AuroraAreaEditingState {
  return {
    schemaVersion: 1,
    areaResRef: "native_eraser_fixture",
    tilesetResRef: "native_eraser_set",
    tilesetFingerprint: "a".repeat(64),
    width,
    height,
    randomSeed: 12345,
    tiles: tileIds.map((tileId, index) => ({
      id: `tile-${index}`,
      row: Math.floor(index / width),
      col: index % width,
      tileId,
      orientation: orientations[index] ?? 0,
      height: 0
    })),
    topology: flatTopology(width, height),
    groupInstances: []
  };
}

/** Extracted from the 2026-07-12 `area_enon_bakery` sic11 runtime proof frame. */
function sic11Group21RealStateFixture(): {
  state: AuroraAreaEditingState;
  tileset: AuroraAreaTilesetDefinition;
} {
  const tileIds = [0, 0, 217, 0, 0, 197, 55, 0, 0, 2, 231, 0, 0, 0, 0, 0];
  const orientations: Array<0 | 1 | 2 | 3> = [3, 2, 0, 1, 2, 1, 2, 2, 3, 0, 3, 3, 1, 3, 3, 1];
  const mainLight2 = [0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
  const sourceLights = [2, 3, 3, 3, 2, 3, 2, 2, 3, 2, 2, 2, 3, 3, 3, 3];
  const tokens = Array<string | null>(81).fill(null);
  for (const row of [0, 2, 4, 6, 8]) {
    for (const col of [0, 2, 4, 6, 8]) tokens[row * 9 + col] = "wall";
  }
  tokens[0 * 9 + 5] = "doorway";
  tokens[2 * 9 + 4] = "floor_up";
  const state: AuroraAreaEditingState = {
    schemaVersion: 1,
    areaResRef: "enon_bakery",
    tilesetResRef: "sic11",
    tilesetFingerprint: "81b7ef199b039d9297384f7ef6398021cc506b0838283a2c0d1cf0cce887e5e1",
    sourceAreaFingerprint: "6c25c8b5c96b9c3f6271a27cb8da7ba263900ca7f28fd4c8b1a761cabdfbd019",
    width: 4,
    height: 4,
    randomSeed: 2648722564,
    tiles: tileIds.map((tileId, index) => ({
      id: `area_enon_bakery:tile:${index}`,
      row: Math.floor(index / 4),
      col: index % 4,
      sourceRow: Math.floor(index / 4),
      sourceCol: index % 4,
      tileId,
      orientation: orientations[index],
      height: 0,
      mainLight1: 0,
      mainLight2: mainLight2[index],
      sourceLight1: sourceLights[index],
      sourceLight2: sourceLights[index],
      animLoop1: 0,
      animLoop2: 0,
      animLoop3: 0,
      ...(index === 2 ? { groupId: "group21" } : {})
    })),
    topology: {
      tokenWidth: 9,
      tokenHeight: 9,
      tokens,
      cornerWidth: 5,
      cornerHeight: 5,
      heights: Array(25).fill(0)
    },
    groupInstances: [{
      groupId: "group21",
      anchorRow: 0,
      anchorCol: 2,
      orientation: 0,
      tileIds: ["area_enon_bakery:tile:2"],
      cells: [{ row: 0, col: 2 }]
    }]
  };
  const zeroRuntimeBytes = {
    mainLight1: 0,
    mainLight2: 0,
    sourceLight1: 0,
    sourceLight2: 0,
    animLoop1: 0,
    animLoop2: 0,
    animLoop3: 0
  };
  const tileset: AuroraAreaTilesetDefinition = {
    tilesetResRef: "sic11",
    fingerprint: state.tilesetFingerprint,
    defaultTerrain: "wall",
    transitionRules: [],
    tiles: [
      {
        tileId: 0,
        modelResRef: "sic11_a00_00",
        orientation: 0,
        terrain: { topLeft: "wall", topRight: "wall", bottomRight: "wall", bottomLeft: "wall" },
        crossers: {},
        cornerHeights: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
        ...zeroRuntimeBytes
      },
      {
        tileId: 1,
        modelResRef: "sic11_a01_01",
        orientation: 1,
        terrain: { topLeft: "wall", topRight: "wall", bottomRight: "floor_up", bottomLeft: "wall" },
        crossers: {},
        cornerHeights: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
        ...zeroRuntimeBytes
      },
      {
        tileId: 72,
        modelResRef: "sic11_f16_01",
        orientation: 0,
        terrain: { topLeft: "wall", topRight: "wall", bottomRight: "wall", bottomLeft: "wall" },
        crossers: { top: "doorway" },
        cornerHeights: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
        ...zeroRuntimeBytes
      },
      {
        tileId: 217,
        modelResRef: "sic11_f16_12",
        orientation: 0,
        terrain: { topLeft: "wall", topRight: "wall", bottomRight: "wall", bottomLeft: "wall" },
        crossers: { top: "doorway" },
        cornerHeights: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
        groupId: "group21",
        ...zeroRuntimeBytes
      }
    ],
    groups: [{ id: "group21", name: "Exit, Simple", rows: 1, columns: 1, tileIds: [217] }]
  };
  return { state, tileset };
}

describe("conservative Aurora Area Eraser plan", () => {
  it("uses native row-major 0x63c ordering for the final retile RNG pass", () => {
    const flatTerrain = { topLeft: "floor", topRight: "floor", bottomRight: "floor", bottomLeft: "floor" };
    const flatHeights = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
    const tileset: AuroraAreaTilesetDefinition = {
      tilesetResRef: "native_eraser_set",
      fingerprint: "a".repeat(64),
      defaultTerrain: "floor",
      transitionRules: [],
      tiles: [
        { tileId: 0, terrain: flatTerrain, crossers: {}, cornerHeights: flatHeights },
        { tileId: 1, terrain: flatTerrain, crossers: { top: "wall" }, cornerHeights: flatHeights },
        {
          tileId: 2,
          terrain: flatTerrain,
          crossers: { top: "wall", right: "wall", bottom: "wall", left: "wall" },
          cornerHeights: flatHeights
        }
      ],
      groups: []
    };
    const state = flatState(
      3,
      3,
      [0, 1, 0, 1, 2, 1, 0, 1, 0],
      [0, 2, 0, 1, 0, 3, 0, 0, 0]
    );
    const center = { row: 1, col: 1 };
    state.topology.tokens[3 * 7 + 2] = "wall";
    state.topology.tokens[3 * 7 + 4] = "wall";
    state.topology.tokens[2 * 7 + 3] = "wall";
    state.topology.tokens[4 * 7 + 3] = "wall";

    const result = createConservativeAuroraAreaEraserPlan(state, tileset, center);

    if (!result.ok) throw new Error(result.message);
    expect(result.plan.affectedCells).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 1 }
    ]);
    expect(result.plan.replacements.map(({ tile }) => [tile.row, tile.col])).toEqual([
      [0, 1], [1, 0], [1, 1], [1, 2], [2, 1]
    ]);
    expect(result.plan.randomDrawCount).toBe(5);
  });

  it("relaxes a neighbour sentinel, queues the matching diagonal, then retries before expanding the neighbour", () => {
    const flatTerrain = { topLeft: "floor", topRight: "floor", bottomRight: "floor", bottomLeft: "floor" };
    const flatHeights = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
    const tileset: AuroraAreaTilesetDefinition = {
      tilesetResRef: "native_eraser_set",
      fingerprint: "a".repeat(64),
      defaultTerrain: "floor",
      transitionRules: [],
      tiles: [
        { tileId: 0, terrain: flatTerrain, crossers: {}, cornerHeights: flatHeights },
        { tileId: 1, terrain: flatTerrain, crossers: { right: "wall" }, cornerHeights: flatHeights },
        {
          tileId: 2,
          terrain: flatTerrain,
          crossers: { left: "wall", bottom: "spur" },
          cornerHeights: flatHeights
        },
        {
          tileId: 3,
          terrain: flatTerrain,
          crossers: { top: "spur", right: "blocker" },
          cornerHeights: flatHeights
        }
      ],
      groups: []
    };
    const state = flatState(2, 2, [1, 2, 0, 3]);
    state.topology.tokens[1 * 5 + 2] = "wall";
    state.topology.tokens[2 * 5 + 3] = "spur";
    state.topology.tokens[3 * 5 + 4] = "blocker";

    const result = createConservativeAuroraAreaEraserPlan(state, tileset, { row: 0, col: 0 });

    if (!result.ok) throw new Error(result.message);
    expect(result.plan.affectedCells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 }
    ]);
    expect(result.plan.topology.tokens[2 * 5 + 3]).toBeNull();
    expect(result.plan.topology.tokens[3 * 5 + 4]).toBeNull();
    expect(result.plan.replacements.map(({ tile }) => [tile.row, tile.col, tile.tileId])).toEqual([
      [0, 0, 0], [0, 1, 0], [1, 1, 0]
    ]);
  });

  it("uses the selected SET tile defaults for all seven serialized runtime bytes", () => {
    const tileset = definition();
    tileset.tiles[0] = {
      ...tileset.tiles[0],
      mainLight1: 31,
      mainLight2: 32,
      sourceLight1: 33,
      sourceLight2: 34,
      animLoop1: 35,
      animLoop2: 36,
      animLoop3: 37
    };

    const result = createConservativeAuroraAreaEraserPlan(
      sourceGroupState(tileset),
      tileset,
      { row: 0, col: 0 }
    );

    if (!result.ok) throw new Error(result.message);
    expect(result.plan.replacements[0].tile).toMatchObject({
      mainLight1: 31,
      mainLight2: 32,
      sourceLight1: 33,
      sourceLight2: 34,
      animLoop1: 35,
      animLoop2: 36,
      animLoop3: 37
    });
  });

  it("propagates a valid adjacent source group without clearing valid member edges", () => {
    const flatTerrain = { topLeft: "floor", topRight: "floor", bottomRight: "floor", bottomLeft: "floor" };
    const flatHeights = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
    const tileset: AuroraAreaTilesetDefinition = {
      tilesetResRef: "native_eraser_set",
      fingerprint: "a".repeat(64),
      defaultTerrain: "floor",
      transitionRules: [],
      tiles: [
        { tileId: 0, terrain: flatTerrain, crossers: {}, cornerHeights: flatHeights },
        { tileId: 1, terrain: flatTerrain, crossers: { right: "wall" }, cornerHeights: flatHeights },
        { tileId: 2, terrain: flatTerrain, crossers: { left: "wall" }, cornerHeights: flatHeights, groupId: "g" },
        { tileId: 3, terrain: flatTerrain, crossers: { right: "blocker" }, cornerHeights: flatHeights, groupId: "g" },
        { tileId: 4, terrain: flatTerrain, crossers: { right: "blocker" }, cornerHeights: flatHeights }
      ],
      groups: [{ id: "g", name: "Adjacent", rows: 2, columns: 1, tileIds: [2, 3] }]
    };
    const state = flatState(2, 2, [1, 2, 0, 3]);
    state.topology.tokens[1 * 5 + 2] = "wall";
    state.topology.tokens[3 * 5 + 4] = "blocker";
    state.tiles[1].groupId = "g";
    state.tiles[3].groupId = "g";
    state.groupInstances = [{
      groupId: "g",
      anchorRow: 0,
      anchorCol: 1,
      orientation: 0,
      tileIds: ["tile-1", "tile-3"],
      cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }]
    }];

    const result = createConservativeAuroraAreaEraserPlan(state, tileset, { row: 0, col: 0 });

    if (!result.ok) throw new Error(result.message);
    expect(result.plan.removedGroups).toHaveLength(1);
    expect(result.plan.affectedCells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 }
    ]);
    expect(result.plan.topology.tokens[3 * 5 + 4]).toBe("blocker");
    expect(result.plan.replacements[2].tile).toMatchObject({ tileId: 4, orientation: 0 });
  });

  it("atomically enqueues an adjacent group when one propagated member has no valid loose signature", () => {
    const flatTerrain = { topLeft: "floor", topRight: "floor", bottomRight: "floor", bottomLeft: "floor" };
    const flatHeights = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
    const tileset: AuroraAreaTilesetDefinition = {
      tilesetResRef: "native_eraser_set",
      fingerprint: "a".repeat(64),
      defaultTerrain: "floor",
      transitionRules: [],
      tiles: [
        { tileId: 0, terrain: flatTerrain, crossers: {}, cornerHeights: flatHeights },
        { tileId: 1, terrain: flatTerrain, crossers: { right: "wall" }, cornerHeights: flatHeights },
        { tileId: 2, terrain: flatTerrain, crossers: { left: "wall" }, cornerHeights: flatHeights, groupId: "g" },
        { tileId: 3, terrain: flatTerrain, crossers: { right: "group_only" }, cornerHeights: flatHeights, groupId: "g" }
      ],
      groups: [{ id: "g", name: "Adjacent invalid", rows: 2, columns: 1, tileIds: [2, 3] }]
    };
    const state = flatState(2, 2, [1, 2, 0, 3]);
    state.topology.tokens[1 * 5 + 2] = "wall";
    state.topology.tokens[3 * 5 + 4] = "group_only";
    state.tiles[1].groupId = "g";
    state.tiles[3].groupId = "g";
    state.groupInstances = [{
      groupId: "g",
      anchorRow: 0,
      anchorCol: 1,
      orientation: 0,
      tileIds: ["tile-1", "tile-3"],
      cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }]
    }];

    const result = createConservativeAuroraAreaEraserPlan(state, tileset, { row: 0, col: 0 });

    if (!result.ok) throw new Error(result.message);
    expect(result.plan.removedGroups).toHaveLength(1);
    expect(result.plan.affectedCells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 }
    ]);
    expect(result.plan.topology.tokens[3 * 5 + 4]).toBeNull();
    expect(result.plan.replacements.map(({ tile }) => [tile.row, tile.col, tile.tileId])).toEqual([
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0]
    ]);
  });

  it("expands a source group, preserves provenance and resets seven runtime bytes from the SET candidate", () => {
    const state = sourceGroupState();
    const topologyBefore = structuredClone(state.topology);

    const result = createConservativeAuroraAreaEraserPlan(state, definition(), { row: 0, col: 0 });

    if (!result.ok) throw new Error(result.message);
    expect(result.plan.removedGroups).toHaveLength(1);
    expect(result.plan.replacements).toHaveLength(2);
    expect(result.plan.replacements[0]).toEqual({
      beforeTileId: "source-group-tile",
      tile: expect.objectContaining({
        id: "area-tile:0:0:0",
        row: 0,
        col: 0,
        sourceRow: 0,
        sourceCol: 0,
        tileId: 0,
        orientation: 0,
        height: 7,
        mainLight1: 0,
        mainLight2: 0,
        sourceLight1: 0,
        sourceLight2: 0,
        animLoop1: 0,
        animLoop2: 0,
        animLoop3: 0
      })
    });
    expect(result.plan.replacements[0].tile).not.toHaveProperty("groupId");
    expect(result.plan.replacements[1]).toMatchObject({
      beforeTileId: "loose-01",
      tile: { tileId: 0, orientation: 1 }
    });
    expect(result.plan.topology.tokens[1 * 5 + 2]).toBeNull();
    expect(result.plan.randomDrawCount).toBe(0);
    expect(state.topology).toEqual(topologyBefore);
  });

  it("fails atomically with AMBIGUOUS_ERASER instead of choosing a default or lowest Tile_ID", () => {
    const ambiguousDefinition = definition(true);
    const state = sourceGroupState(ambiguousDefinition);
    const snapshot = structuredClone(state);

    expect(
      createConservativeAuroraAreaEraserPlan(state, ambiguousDefinition, { row: 0, col: 0 })
    ).toMatchObject({ ok: false, code: "AMBIGUOUS_ERASER" });
    expect(state).toEqual(snapshot);
  });

  it("uses SET-file/orientation order and Aurora's exact LCG winner for multiple candidates", () => {
    const tileset = definition(true);
    const state = sourceGroupState(tileset);
    const firstDraw = drawAuroraNativeRandom(12345);
    expect(firstDraw).toEqual({ seed: 1002789326, value: 15301 });

    const result = createConservativeAuroraAreaEraserPlan(
      state,
      tileset,
      { row: 0, col: 0 },
      { randomSeed: 12345 }
    );

    if (!result.ok) throw new Error(result.message);
    expect(result.plan.replacements.map(({ tile }) => [tile.row, tile.col, tile.tileId, tile.orientation])).toEqual([
      [0, 0, 1, 0],
      [0, 1, 0, 1]
    ]);
    expect(result.plan).toMatchObject({
      randomSeedBefore: 12345,
      randomSeedAfter: 3785644967,
      randomDrawCount: 2
    });
  });

  it("advances the editor-local Aurora RNG across consecutive Eraser commands", () => {
    const tileset = definition(true);
    const initial = { ...sourceGroupState(tileset), randomSeed: 12345 };

    const first = eraseAuroraAreaConservatively(initial, tileset, { row: 0, col: 0 });
    if (!first.ok) throw new Error(first.message);
    expect(first.randomSeedAfter).toBe(3785644967);
    expect(first.state.randomSeed).toBe(3785644967);

    const second = eraseAuroraAreaConservatively(first.state, tileset, { row: 0, col: 0 });
    if (!second.ok) throw new Error(second.message);
    expect(second.randomSeedAfter).toBe(2863258516);
    expect(second.state.randomSeed).toBe(2863258516);
    expect(initial.randomSeed).toBe(12345);
  });

  it("applies a unique plan as one immutable command and removes reconstructed group metadata", () => {
    const state = sourceGroupState();
    const snapshot = structuredClone(state);
    const result = eraseAuroraAreaConservatively(state, definition(), { row: 0, col: 0 });

    if (!result.ok) throw new Error(result.message);
    expect(result.state.groupInstances).toHaveLength(0);
    expect(result.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)).toMatchObject({
      tileId: 0,
      sourceRow: 0,
      sourceCol: 0,
      mainLight1: 0,
      animLoop3: 0
    });
    expect(result.changedTileIds).toHaveLength(2);
    expect(state).toEqual(snapshot);
  });

  it("removes and cuts a source-backed group through the same atomic Eraser plan", () => {
    const tileset = definition(true);
    const state = { ...sourceGroupState(tileset), randomSeed: 12345 };
    const removed = removeSourceAuroraAreaGroupConservatively(
      state,
      tileset,
      { row: 0, col: 0 }
    );
    if (!removed.ok) throw new Error(removed.message);
    expect(removed.state.groupInstances).toHaveLength(0);
    expect(removed.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.tileId).toBe(1);
    expect(removed.state.randomSeed).toBe(3785644967);

    const cut = cutAuroraAreaTilesWithSourceGroups(
      state,
      tileset,
      [{ row: 0, col: 0 }]
    );
    if (!cut.ok) throw new Error(cut.message);
    expect(cut.state.groupInstances).toHaveLength(0);
    expect(cut.payload.groups).toHaveLength(1);
    expect(cut.payload.tiles).toHaveLength(1);
    expect(cut.changedTileIds).toHaveLength(2);
    expect(cut.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.tileId).toBe(1);
    expect(cut.state.randomSeed).toBe(3785644967);
  });

  it("removes, cuts and rotates real sic11 group21 despite an unrelated pre-existing corner mismatch", () => {
    const { state, tileset } = sic11Group21RealStateFixture();
    const unrelatedTileBefore = structuredClone(state.tiles[1]);

    const removed = removeSourceAuroraAreaGroupConservatively(state, tileset, { row: 0, col: 2 });
    if (!removed.ok) throw new Error(removed.message);
    expect(removed.state.groupInstances).toHaveLength(0);
    expect(removed.state.tiles.find((tile) => tile.row === 0 && tile.col === 2)).toMatchObject({
      tileId: 1,
      orientation: 1,
      sourceRow: 0,
      sourceCol: 2
    });
    expect(removed.state.tiles[1]).toEqual(unrelatedTileBefore);
    expect(removed.state.randomSeed).toBe(1898450773);

    const cut = cutAuroraAreaTilesWithSourceGroups(state, tileset, [{ row: 0, col: 2 }]);
    if (!cut.ok) throw new Error(cut.message);
    expect(cut.payload.groups).toHaveLength(1);
    expect(cut.payload.tiles).toHaveLength(1);
    expect(cut.state.groupInstances).toHaveLength(0);
    expect(cut.state.tiles[1]).toEqual(unrelatedTileBefore);

    const rotated = rotateSourceAuroraAreaGroupConservatively(
      state,
      tileset,
      { row: 0, col: 2 },
      1
    );
    if (!rotated.ok) throw new Error(rotated.message);
    expect(rotated.state.groupInstances).toHaveLength(1);
    expect(rotated.state.groupInstances[0]).toMatchObject({
      groupId: "group21",
      orientation: 1,
      underlay: { tiles: [expect.objectContaining({ tileId: 1, orientation: 1 })] }
    });
    expect(rotated.state.tiles[1]).toMatchObject({
      row: unrelatedTileBefore.row,
      col: unrelatedTileBefore.col,
      tileId: unrelatedTileBefore.tileId,
      orientation: unrelatedTileBefore.orientation,
      sourceRow: unrelatedTileBefore.sourceRow,
      sourceCol: unrelatedTileBefore.sourceCol
    });
  });

  it("rotates a source group over the native-seeded multi-candidate Eraser winner", () => {
    const { state, tileset } = rotationFixture();
    state.randomSeed = 12345;
    tileset.tiles = [
      tileset.tiles[0],
      { ...tileset.tiles[0], tileId: 1 },
      ...tileset.tiles.slice(1)
    ];
    const rotated = rotateSourceAuroraAreaGroupConservatively(
      state,
      tileset,
      { row: 0, col: 0 },
      1
    );
    if (!rotated.ok) throw new Error(rotated.message);
    expect(rotated.state.groupInstances[0]).toMatchObject({
      orientation: 1,
      underlay: { tiles: [expect.objectContaining({ tileId: 1, orientation: 0 })] }
    });
    expect(rotated.state.randomSeed).toBe(1002789326);
  });

  it("rotates a source-backed group only after a unique Eraser underlay is reconstructed", () => {
    const { state, tileset } = rotationFixture();
    const rotated = rotateSourceAuroraAreaGroupConservatively(
      state,
      tileset,
      { row: 0, col: 0 },
      1
    );
    if (!rotated.ok) throw new Error(rotated.message);
    expect(rotated.state.groupInstances).toHaveLength(1);
    expect(rotated.state.groupInstances[0]).toMatchObject({
      groupId: "source_group",
      orientation: 1,
      underlay: { tiles: [expect.objectContaining({ tileId: 0 })] }
    });
  });
});
