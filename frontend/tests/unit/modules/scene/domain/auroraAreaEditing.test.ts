import { describe, expect, it } from "vitest";
import {
  applyCrosserStroke,
  applyTerrainStroke,
  changeAuroraAreaGroupHeightAtCell,
  changeAuroraAreaTileHeight,
  createAuroraAreaEditorRandomSeed,
  createAuroraAreaEditingState,
  hydrateAuroraAreaEditingState,
  placeAuroraAreaDiagnosticFixtureTileId,
  placeAuroraAreaDiagnosticFixtureTiles,
  placeAuroraAreaDiagnosticFixtureGroups,
  placeAuroraAreaGroup,
  pruneStaleAuroraAreaGroupMembers,
  replaceAuroraAreaTileId,
  removeAuroraAreaGroupAtCell,
  rerollAuroraAreaTileVariant,
  resizeAuroraArea,
  resolvePrimaryTransition,
  resolveAuroraAreaGroupInstanceAtCell,
  rotateAuroraArea,
  rotateAuroraAreaTile,
  type AuroraAreaTilesetDefinition
} from "../../../../../src/modules/scene/domain/auroraAreaEditing";
import { drawAuroraNativeRandom } from "../../../../../src/modules/scene/domain/auroraAreaRandom";

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

const internalCrossersDefinition: AuroraAreaTilesetDefinition = {
  ...definition,
  tiles: [
    definition.tiles[0],
    definition.tiles[1],
    {
      tileId: 10,
      terrain: allCorners("grass"),
      crossers: { right: "building_wall" },
      cornerHeights: allHeights,
      groupId: "building_1x2"
    },
    {
      tileId: 11,
      terrain: allCorners("grass"),
      crossers: { left: "building_wall" },
      cornerHeights: allHeights,
      groupId: "building_1x2"
    },
    {
      tileId: 20,
      terrain: allCorners("grass"),
      crossers: { right: "hallway" },
      cornerHeights: allHeights,
      groupId: "hall_1x3"
    },
    {
      tileId: 21,
      terrain: allCorners("grass"),
      crossers: { left: "hallway", right: "hallway" },
      cornerHeights: allHeights,
      groupId: "hall_1x3"
    },
    {
      tileId: 22,
      terrain: allCorners("grass"),
      crossers: { left: "hallway" },
      cornerHeights: allHeights,
      groupId: "hall_1x3"
    }
  ],
  groups: [
    { id: "building_1x2", name: "Building with internal wall", rows: 1, columns: 2, tileIds: [10, 11] },
    { id: "hall_1x3", name: "Hall with two internal crossers", rows: 1, columns: 3, tileIds: [20, 21, 22] }
  ]
};

const rectangularGroupDefinition: AuroraAreaTilesetDefinition = {
  ...definition,
  tiles: [
    definition.tiles[0],
    ...[40, 41, 42, 43, 44, 45].map((tileId) => ({
      tileId,
      terrain: allCorners("grass"),
      crossers: {},
      cornerHeights: allHeights,
      groupId: "rect_2x3"
    }))
  ],
  groups: [
    {
      id: "rect_2x3",
      name: "Ordered rectangular group",
      rows: 2,
      columns: 3,
      tileIds: [40, 41, 42, 43, 44, 45]
    }
  ]
};

const groupWithHoleDefinition: AuroraAreaTilesetDefinition = {
  ...definition,
  tiles: [
    definition.tiles[0],
    ...[50, 51, 52, 53, 54].map((tileId) => ({
      tileId,
      terrain: allCorners("grass"),
      crossers: {},
      cornerHeights: allHeights,
      groupId: "bridge_park"
    }))
  ],
  groups: [
    {
      id: "bridge_park",
      name: "Bridge park with Aurora hole",
      rows: 2,
      columns: 3,
      tileIds: [50, 51, 52, 53, 54, null]
    }
  ]
};

const looseCrosserDefinition: AuroraAreaTilesetDefinition = {
  ...definition,
  crosserTypes: [{ id: "road", name: "Road" }],
  tiles: [
    definition.tiles[0],
    {
      tileId: 30,
      terrain: allCorners("grass"),
      crossers: { right: "road" },
      cornerHeights: allHeights
    },
    {
      tileId: 31,
      terrain: allCorners("grass"),
      crossers: { left: "road" },
      cornerHeights: allHeights
    }
  ],
  groups: []
};

const heightEditingDefinition: AuroraAreaTilesetDefinition = {
  tilesetResRef: "heightset",
  fingerprint: "c".repeat(64),
  defaultTerrain: "grass",
  transitionRules: [],
  tiles: [
    { tileId: 0, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights },
    {
      tileId: 1,
      terrain: allCorners("grass"),
      crossers: {},
      cornerHeights: { topLeft: 1, topRight: 0, bottomRight: 0, bottomLeft: 1 }
    },
    {
      tileId: 2,
      terrain: allCorners("grass"),
      crossers: {},
      cornerHeights: { topLeft: 1, topRight: 0, bottomRight: 0, bottomLeft: 0 }
    },
    {
      tileId: 3,
      terrain: allCorners("grass"),
      crossers: {},
      cornerHeights: { topLeft: 1, topRight: 0, bottomRight: 0, bottomLeft: 1 }
    },
    {
      tileId: 4,
      terrain: allCorners("grass"),
      crossers: {},
      cornerHeights: allHeights,
      mainLight1: 99,
      animLoop1: 0
    }
  ],
  groups: []
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

function createInternalCrossersState() {
  const result = createAuroraAreaEditingState({
    areaResRef: "area_internal_crossers",
    width: 4,
    height: 4,
    definition: internalCrossersDefinition,
    selector: () => 0
  });
  if (!result.ok) throw new Error(result.message);
  return result.state;
}

function rotateTestCell(
  row: number,
  col: number,
  width: number,
  height: number,
  turns: 0 | 1 | 2 | 3
) {
  if (turns === 0) return { row, col };
  if (turns === 1) return { row: col, col: height - 1 - row };
  if (turns === 2) return { row: height - 1 - row, col: width - 1 - col };
  return { row: width - 1 - col, col: row };
}

describe("auroraAreaEditing", () => {
  it("uses the SET GENERAL default and initializes a deterministic editor-local RNG seed", () => {
    const defaultsOnly: AuroraAreaTilesetDefinition = {
      ...definition,
      defaultTerrain: undefined,
      defaults: { defaultTerrain: "grass" }
    };
    const first = createAuroraAreaEditingState({
      areaResRef: "Seed_Area",
      width: 2,
      height: 2,
      definition: defaultsOnly,
      selector: () => 0
    });
    const second = createAuroraAreaEditingState({
      areaResRef: "seed_area",
      width: 2,
      height: 2,
      definition: defaultsOnly,
      selector: () => 0
    });

    if (!first.ok) throw new Error(first.message);
    if (!second.ok) throw new Error(second.message);
    expect(first.state.tiles.every((tile) => tile.tileId === 0)).toBe(true);
    expect(first.state.randomSeed).toBe(
      createAuroraAreaEditorRandomSeed("seed_area", defaultsOnly.fingerprint)
    );
    expect(second.state.randomSeed).toBe(first.state.randomSeed);
  });

  it("uses the Aurora LCG, rather than browser randomness, for new-area and reroll variants", () => {
    const variants: AuroraAreaTilesetDefinition = {
      ...definition,
      tiles: [
        { tileId: 0, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights },
        { tileId: 4, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights }
      ],
      groups: []
    };
    const first = createAuroraAreaEditingState({
      areaResRef: "rng_area",
      width: 2,
      height: 2,
      definition: variants
    });
    const second = createAuroraAreaEditingState({
      areaResRef: "rng_area",
      width: 2,
      height: 2,
      definition: variants
    });

    if (!first.ok || !second.ok) throw new Error("Could not create RNG fixture.");
    expect(first.state.tiles).toEqual(second.state.tiles);
    let expectedSeed = createAuroraAreaEditorRandomSeed("rng_area", variants.fingerprint);
    for (let index = 0; index < 4; index += 1) {
      expectedSeed = drawAuroraNativeRandom(expectedSeed).seed;
    }
    expect(first.state.randomSeed).toBe(expectedSeed);

    const rerolled = rerollAuroraAreaTileVariant(first.state, variants, { row: 0, col: 0 });
    if (!rerolled.ok) throw new Error(rerolled.message);
    expect(rerolled.state.randomSeed).toBe(drawAuroraNativeRandom(expectedSeed).seed);
  });

  it("applies a SET crosser to both cells sharing a half-grid edge atomically", () => {
    const initial = createAuroraAreaEditingState({
      areaResRef: "crosser_test",
      width: 2,
      height: 2,
      definition: looseCrosserDefinition,
      selector: () => 0
    });
    if (!initial.ok) throw new Error(initial.message);

    const painted = applyCrosserStroke(
      initial.state,
      looseCrosserDefinition,
      [{ row: 0, col: 0, edge: "right" }],
      "road",
      () => 0
    );
    expect(painted.ok).toBe(true);
    if (!painted.ok) return;
    expect(painted.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.tileId).not.toBe(0);
    expect(painted.state.tiles.find((tile) => tile.row === 0 && tile.col === 1)?.tileId).not.toBe(0);
    expect(initial.state.tiles.every((tile) => tile.tileId === 0)).toBe(true);
  });

  it("retiles loose neighbours after rotating an asymmetric tile", () => {
    const initial = createAuroraAreaEditingState({
      areaResRef: "rotate_crosser_test",
      width: 2,
      height: 2,
      definition: looseCrosserDefinition,
      selector: () => 0
    });
    if (!initial.ok) throw new Error(initial.message);
    const painted = applyCrosserStroke(
      initial.state,
      looseCrosserDefinition,
      [{ row: 0, col: 0, edge: "right" }],
      "road",
      () => 0
    );
    if (!painted.ok) throw new Error(painted.message);

    const rotated = rotateAuroraAreaTile(
      painted.state,
      looseCrosserDefinition,
      { row: 0, col: 0 },
      1,
      () => 0
    );

    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    expect(rotated.state.tiles.find((tile) => tile.row === 0 && tile.col === 1)?.tileId).toBe(0);
    expect(rotated.state.tiles.find((tile) => tile.row === 1 && tile.col === 0)?.tileId).not.toBe(0);
  });
  it("creates an Area from SET defaults and replaces tile candidates through a terrain stroke", () => {
    const initial = createState();
    expect(initial.tiles).toHaveLength(4);
    expect(initial.tiles.every((tile) => tile.tileId === 0)).toBe(true);

    const painted = applyTerrainStroke(initial, definition, [{ row: 0, col: 0 }], "water", () => 0);
    expect(painted.ok).toBe(true);
    if (!painted.ok) return;
    expect(painted.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.tileId).toBe(1);
    expect(initial.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.tileId).toBe(0);
  });

  it("replaces a loose Tile_ID explicitly while preserving the ARE cell fields", () => {
    const explicitDefinition: AuroraAreaTilesetDefinition = {
      ...definition,
      tiles: [
        definition.tiles[0],
        { tileId: 4, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights }
      ],
      groups: []
    };
    const created = createAuroraAreaEditingState({
      areaResRef: "explicit_tile",
      width: 2,
      height: 2,
      definition: explicitDefinition,
      selector: () => 0
    });
    if (!created.ok) throw new Error(created.message);
    created.state.tiles[0].mainLight1 = 23;
    created.state.tiles[0].animLoop2 = 7;

    const replaced = replaceAuroraAreaTileId(
      created.state,
      explicitDefinition,
      { row: 0, col: 0 },
      4,
      () => 0
    );

    expect(replaced.ok).toBe(true);
    if (!replaced.ok) return;
    expect(replaced.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)).toMatchObject({
      tileId: 4,
      mainLight1: 23,
      animLoop2: 7
    });
    expect(created.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.tileId).toBe(0);
  });

    it("replaces a topology-compatible Tile_ID locally when another source cell is non-canonical", () => {
    const explicitDefinition: AuroraAreaTilesetDefinition = {
      ...definition,
      tiles: [
        definition.tiles[0],
        { tileId: 4, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights }
      ],
      groups: []
    };
    const created = createAuroraAreaEditingState({
      areaResRef: "source_non_canonical",
      width: 2,
      height: 2,
      definition: explicitDefinition,
      selector: () => 0
    });
    if (!created.ok) throw new Error(created.message);
    const unrelatedTileBefore = structuredClone(
      created.state.tiles.find((tile) => tile.row === 1 && tile.col === 1)
    );
    created.state.topology.tokens[created.state.topology.tokens.length - 1] = "source-only-terrain";

    const replaced = replaceAuroraAreaTileId(
      created.state,
      explicitDefinition,
      { row: 0, col: 0 },
      4,
      () => 0
    );

    expect(replaced.ok).toBe(true);
    if (!replaced.ok) return;
    expect(replaced.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)).toMatchObject({
      tileId: 4,
      orientation: 0
    });
    expect(replaced.state.tiles.find((tile) => tile.row === 1 && tile.col === 1)).toEqual(
      unrelatedTileBefore
    );
      expect(replaced.state.topology.tokens.at(-1)).toBe("source-only-terrain");
    });

    it("places an explicit unrotated diagnostic fixture without auto-retile", () => {
      const initial = createState();
      initial.tiles[0].orientation = 3;
      const result = placeAuroraAreaDiagnosticFixtureTileId(
        initial,
        definition,
        { row: 0, col: 0 },
        1
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)).toMatchObject({
        tileId: 1,
        orientation: 0
      });
      expect(result.state.tiles.find((tile) => tile.row === 0 && tile.col === 1)?.tileId).toBe(0);
    });

    it("places a diagnostic fixture batch atomically and rejects repeated cells", () => {
      const initial = createState();
      const result = placeAuroraAreaDiagnosticFixtureTiles(initial, definition, [
        { row: 0, col: 0, tileId: 1 },
        { row: 0, col: 1, tileId: 1 }
      ]);
      expect(result).toMatchObject({
        ok: true,
        state: { tiles: expect.arrayContaining([
          expect.objectContaining({ row: 0, col: 0, tileId: 1, orientation: 0 }),
          expect.objectContaining({ row: 0, col: 1, tileId: 1, orientation: 0 })
        ]) }
      });
      expect(placeAuroraAreaDiagnosticFixtureTiles(initial, definition, [
        { row: 0, col: 0, tileId: 1 },
        { row: 0, col: 0, tileId: 1 }
      ])).toMatchObject({ ok: false, code: "TILE_UNKNOWN" });
    });

    it("places complete diagnostic SET groups atomically without bypassing member ownership", () => {
      const initial = createState();
      const result = placeAuroraAreaDiagnosticFixtureGroups(initial, definition, [
        { groupId: "group0", row: 0, col: 0, orientation: 0 }
      ]);

      expect(result).toMatchObject({
        ok: true,
        state: {
          groupInstances: [
            expect.objectContaining({
              groupId: "group0",
              anchorRow: 0,
              anchorCol: 0,
              orientation: 0,
              cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }]
            })
          ],
          tiles: expect.arrayContaining([
            expect.objectContaining({ row: 0, col: 0, tileId: 2, orientation: 0, groupId: "group0" }),
            expect.objectContaining({ row: 0, col: 1, tileId: 3, orientation: 0, groupId: "group0" })
          ])
        }
      });
      expect(placeAuroraAreaDiagnosticFixtureGroups(initial, definition, [
        { groupId: "group0", row: 0, col: 0, orientation: 0 },
        { groupId: "group0", row: 0, col: 0, orientation: 0 }
      ])).toMatchObject({ ok: false, code: "GROUP_OVERLAP" });
    });

    it("allows one-cell SET groups but refuses multi-cell or unknown Tile_ID replacement", () => {
    const initial = createState();
    expect(replaceAuroraAreaTileId(initial, definition, { row: 0, col: 0 }, 2)).toMatchObject({
      ok: false,
      code: "GROUP_LOCKED"
    });
    expect(replaceAuroraAreaTileId(initial, definition, { row: 0, col: 0 }, 999)).toMatchObject({
      ok: false,
      code: "TILE_UNKNOWN"
    });

    const crystalDefinition: AuroraAreaTilesetDefinition = {
      ...definition,
      tiles: [
        definition.tiles[0],
        { tileId: 118, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights, groupId: "crystal" }
      ],
      groups: [{ id: "crystal", name: "Crystal", rows: 1, columns: 1, tileIds: [118] }]
    };
    const crystalState = createAuroraAreaEditingState({
      areaResRef: "crystal",
      width: 2,
      height: 2,
      definition: crystalDefinition,
      selector: () => 0
    });
    if (!crystalState.ok) throw new Error(crystalState.message);

    expect(
      replaceAuroraAreaTileId(crystalState.state, crystalDefinition, { row: 0, col: 0 }, 118, () => 0)
    ).toMatchObject({
      ok: true,
      state: { tiles: expect.arrayContaining([expect.objectContaining({ row: 0, col: 0, tileId: 118 })]) }
    });
  });

  it("rejects a stroke atomically when the SET has no compatible tile", () => {
    const initial = createState();
    const result = applyTerrainStroke(initial, definition, [{ row: 0, col: 0 }], "lava", () => 0);

    expect(result).toMatchObject({ ok: false, code: "NO_MATCHING_TILE" });
    expect(initial.tiles.every((tile) => tile.tileId === 0)).toBe(true);
  });

  it("places a rectangular group atomically, rotates its footprint, and locks its members", () => {
    const result = placeAuroraAreaGroup(createState(), definition, "group0", { row: 0, col: 0 }, 1, () => 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.groupInstances).toHaveLength(1);
    expect(result.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.tileId).toBe(2);
    expect(result.state.tiles.find((tile) => tile.row === 1 && tile.col === 0)?.tileId).toBe(3);

    const locked = applyTerrainStroke(result.state, definition, [{ row: 0, col: 0 }], "water", () => 0);
    expect(locked).toMatchObject({ ok: false, code: "GROUP_LOCKED" });
  });

  it("places a group without retiling an unrelated non-canonical source cell", () => {
    const created = createAuroraAreaEditingState({
      areaResRef: "source_non_canonical_group",
      width: 4,
      height: 4,
      definition,
      selector: () => 0
    });
    if (!created.ok) throw new Error(created.message);
    created.state.topology.tokens[created.state.topology.tokens.length - 1] = "source-only-terrain";
    const unrelatedTileBefore = structuredClone(
      created.state.tiles.find((tile) => tile.row === 3 && tile.col === 3)
    );

    const placed = placeAuroraAreaGroup(
      created.state,
      definition,
      "group0",
      { row: 0, col: 0 },
      0,
      () => 0
    );

    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.state.groupInstances).toHaveLength(1);
    expect(placed.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.tileId).toBe(2);
    expect(placed.state.tiles.find((tile) => tile.row === 0 && tile.col === 1)?.tileId).toBe(3);
    expect(placed.state.tiles.find((tile) => tile.row === 3 && tile.col === 3)).toEqual(
      unrelatedTileBefore
    );
    expect(placed.state.topology.tokens.at(-1)).toBe("source-only-terrain");
  });

  it("keeps Aurora -1 group holes as untouched loose cells while placing the real members", () => {
    const initial = createAuroraAreaEditingState({
      areaResRef: "area_group_hole",
      width: 3,
      height: 2,
      definition: groupWithHoleDefinition,
      selector: () => 0
    });
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;

    const placed = placeAuroraAreaGroup(
      initial.state,
      groupWithHoleDefinition,
      "bridge_park",
      { row: 0, col: 0 },
      0,
      () => 0
    );

    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.state.groupInstances[0]?.tileIds).toHaveLength(5);
    expect(placed.state.groupInstances[0]?.cells).toHaveLength(5);
    const hole = placed.state.tiles.find((tile) => tile.row === 1 && tile.col === 2);
    expect(hole?.tileId).toBe(0);
    expect(hole?.groupId).toBeUndefined();
  });

  it("places every group member at the footprint's common non-zero base height", () => {
    const elevated = createState();
    elevated.tiles.forEach((tile) => {
      tile.height = 7;
    });
    elevated.topology.heights.fill(7);

    const placed = placeAuroraAreaGroup(
      elevated,
      definition,
      "group0",
      { row: 0, col: 0 },
      0,
      () => 0
    );

    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(
      placed.state.groupInstances[0].tileIds.map(
        (tileId) => placed.state.tiles.find((tile) => tile.id === tileId)?.height
      )
    ).toEqual([7, 7]);
  });

  it("fails closed when a group footprint has no single common base height", () => {
    const stepped = createState();
    stepped.tiles.find((tile) => tile.row === 0 && tile.col === 1)!.height = 1;
    const snapshot = structuredClone(stepped);

    expect(
      placeAuroraAreaGroup(
        stepped,
        definition,
        "group0",
        { row: 0, col: 0 },
        0,
        () => 0
      )
    ).toMatchObject({ ok: false, code: "GROUP_LOCKED" });
    expect(stepped).toEqual(snapshot);
  });

  it("tracks placed group members by runtime tile ID and delegates member transforms to the group", () => {
    const placed = placeAuroraAreaGroup(createState(), definition, "group0", { row: 0, col: 0 }, 0, () => 0);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const instance = placed.state.groupInstances[0];
    expect(instance.tileIds).toEqual([
      placed.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.id,
      placed.state.tiles.find((tile) => tile.row === 0 && tile.col === 1)?.id
    ]);
    expect(resolveAuroraAreaGroupInstanceAtCell(placed.state, { row: 0, col: 1 })).toEqual(instance);

    const rotated = rotateAuroraAreaTile(placed.state, definition, { row: 0, col: 1 }, 1);
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    expect(rotated.state.groupInstances[0]).toMatchObject({ orientation: 1, cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }] });
    expect(rotated.state.groupInstances[0].tileIds).toEqual([
      rotated.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.id,
      rotated.state.tiles.find((tile) => tile.row === 1 && tile.col === 0)?.id
    ]);

    const looseTileHeightEdit = changeAuroraAreaTileHeight(
      rotated.state,
      definition,
      { row: 1, col: 0 },
      1
    );
    expect(looseTileHeightEdit).toMatchObject({ ok: false, code: "GROUP_LOCKED" });

    const raised = changeAuroraAreaGroupHeightAtCell(rotated.state, definition, { row: 1, col: 0 }, 1);
    expect(raised.ok).toBe(true);
    if (!raised.ok) return;
    expect(raised.changedTileIds).toEqual(rotated.state.groupInstances[0].tileIds);
    expect(raised.state.groupInstances[0].tileIds.map((id) => raised.state.tiles.find((tile) => tile.id === id)?.height)).toEqual([1, 1]);
  });

  it("raises and lowers one loose tile within 0..32 while retiling height-transition neighbours", () => {
    const created = createAuroraAreaEditingState({
      areaResRef: "height_area",
      width: 2,
      height: 2,
      definition: heightEditingDefinition,
      selector: () => 0
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const raised = changeAuroraAreaTileHeight(
      created.state,
      heightEditingDefinition,
      { row: 0, col: 0 },
      1,
      (count) => (count === 2 ? 1 : 0)
    );
    expect(raised.ok).toBe(true);
    if (!raised.ok) return;
    expect(raised.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)).toMatchObject({
      tileId: 0,
      height: 1
    });
    expect(raised.state.tiles.find((tile) => tile.row === 0 && tile.col === 1)).toMatchObject({
      tileId: 3,
      height: 0
    });
    expect(raised.state.tiles.find((tile) => tile.row === 1 && tile.col === 0)).toMatchObject({
      tileId: 3,
      height: 0
    });
    expect(raised.state.tiles.find((tile) => tile.row === 1 && tile.col === 1)).toMatchObject({
      tileId: 2,
      height: 0
    });

    const lowered = changeAuroraAreaTileHeight(
      raised.state,
      heightEditingDefinition,
      { row: 0, col: 0 },
      -1,
      () => 0
    );
    expect(lowered.ok).toBe(true);
    if (!lowered.ok) return;
    expect(lowered.state.tiles.every((tile) => tile.tileId === 0)).toBe(true);
    expect(lowered.state.tiles.every((tile) => tile.height === 0)).toBe(true);

    const floor = changeAuroraAreaTileHeight(
      lowered.state,
      heightEditingDefinition,
      { row: 0, col: 0 },
      -1,
      () => 0
    );
    expect(floor.ok).toBe(true);
    if (!floor.ok) return;
    expect(floor.changedTileIds).toEqual([]);
    expect(floor.state).toEqual(lowered.state);

    const ceilingState = {
      ...lowered.state,
      tiles: lowered.state.tiles.map((tile) =>
        tile.row === 0 && tile.col === 0 ? { ...tile, height: 32 } : tile
      )
    };
    const ceiling = changeAuroraAreaTileHeight(
      ceilingState,
      heightEditingDefinition,
      { row: 0, col: 0 },
      1,
      () => 0
    );
    expect(ceiling.ok).toBe(true);
    if (!ceiling.ok) return;
    expect(ceiling.changedTileIds).toEqual([]);
    expect(ceiling.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.height).toBe(32);
  });

  it("rerolls a compatible variant deterministically without changing topology or ARE cell bytes", () => {
    const hydrated = hydrateAuroraAreaEditingState({
      areaResRef: "reroll_area",
      width: 2,
      height: 2,
      definition: heightEditingDefinition,
      sourceAreaFingerprint: "d".repeat(64),
      tiles: [
        {
          id: "source-0",
          row: 0,
          col: 0,
          tileId: 0,
          orientation: 0,
          height: 0,
          mainLight1: 1,
          mainLight2: 2,
          sourceLight1: 3,
          sourceLight2: 4,
          animLoop1: 5,
          animLoop2: 6,
          animLoop3: 7
        },
        { id: "source-1", row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
        { id: "source-2", row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
        { id: "source-3", row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
      ]
    });
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) return;
    const topologyBefore = structuredClone(hydrated.state.topology);
    let candidateCount = 0;

    const rerolled = rerollAuroraAreaTileVariant(
      hydrated.state,
      heightEditingDefinition,
      { row: 0, col: 0 },
      (count) => {
        candidateCount = count;
        return count - 1;
      }
    );

    expect(rerolled.ok).toBe(true);
    if (!rerolled.ok) return;
    expect(candidateCount).toBe(4);
    expect(rerolled.state.topology).toEqual(topologyBefore);
    expect(rerolled.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)).toMatchObject({
      sourceRow: 0,
      sourceCol: 0,
      tileId: 4,
      orientation: 3,
      height: 0,
      mainLight1: 1,
      mainLight2: 2,
      sourceLight1: 3,
      sourceLight2: 4,
      animLoop1: 5,
      animLoop2: 6,
      animLoop3: 7
    });
    expect(hydrated.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)).toMatchObject({
      id: "source-0",
      tileId: 0,
      mainLight1: 1
    });
  });

  it("retile-unlocks an entire selected group and discards stale member references atomically", () => {
    const placed = placeAuroraAreaGroup(createState(), definition, "group0", { row: 0, col: 0 }, 0, () => 0);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const removed = removeAuroraAreaGroupAtCell(placed.state, definition, { row: 0, col: 1 }, () => 0);
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.state.groupInstances).toEqual([]);
    expect(removed.state.tiles.every((tile) => tile.groupId === undefined)).toBe(true);
    expect(resolveAuroraAreaGroupInstanceAtCell(removed.state, { row: 0, col: 0 })).toBeUndefined();

    const stale = {
      ...placed.state,
      groupInstances: [{ ...placed.state.groupInstances[0], tileIds: [placed.state.groupInstances[0].tileIds[0], "missing-tile"] }]
    };
    const pruned = pruneStaleAuroraAreaGroupMembers(stale);
    expect(pruned.groupInstances).toEqual([]);
    expect(pruned.tiles.every((tile) => tile.groupId === undefined)).toBe(true);
    expect(placed.state.groupInstances).toHaveLength(1);
  });

  it("restores the exact loose-tile underlay when removing a 1x2 group with an internal crosser", () => {
    const initial = createInternalCrossersState();
    const placed = placeAuroraAreaGroup(
      initial,
      internalCrossersDefinition,
      "building_1x2",
      { row: 1, col: 1 },
      0,
      () => 0
    );
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.state.groupInstances[0].underlay?.tiles.map((tile) => tile.tileId)).toEqual([0, 0]);

    const removed = removeAuroraAreaGroupAtCell(
      placed.state,
      internalCrossersDefinition,
      { row: 1, col: 2 },
      () => 0
    );

    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.state.groupInstances).toEqual([]);
    expect(removed.state.tiles).toEqual(initial.tiles);
    expect(removed.state.topology).toEqual(initial.topology);
  });

  it("restores the old footprint before rotating a 1x3 group with internal crossers", () => {
    const initial = createInternalCrossersState();
    const placed = placeAuroraAreaGroup(
      initial,
      internalCrossersDefinition,
      "hall_1x3",
      { row: 0, col: 0 },
      0,
      () => 0
    );
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const rotated = rotateAuroraAreaTile(
      placed.state,
      internalCrossersDefinition,
      { row: 0, col: 1 },
      1
    );

    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    expect(rotated.state.groupInstances[0]).toMatchObject({
      orientation: 1,
      cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }]
    });
    expect(rotated.state.tiles.find((tile) => tile.row === 0 && tile.col === 1)?.tileId).toBe(0);
    expect(rotated.state.tiles.find((tile) => tile.row === 0 && tile.col === 2)?.tileId).toBe(0);

    const removed = removeAuroraAreaGroupAtCell(
      rotated.state,
      internalCrossersDefinition,
      { row: 2, col: 0 },
      () => 0
    );
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.state.tiles).toEqual(initial.tiles);
    expect(removed.state.topology).toEqual(initial.topology);
  });

  it("remaps group tile IDs after an Area transform instead of retaining stale selection targets", () => {
    const placed = placeAuroraAreaGroup(createState(), definition, "group0", { row: 0, col: 0 }, 0, () => 0);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const rotated = rotateAuroraArea(placed.state, definition, 1, () => 0);
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    const instance = rotated.state.groupInstances[0];
    expect(instance.tileIds.every((id) => rotated.state.tiles.some((tile) => tile.id === id))).toBe(true);
    expect(instance.tileIds).not.toEqual(placed.state.groupInstances[0].tileIds);
    expect(resolveAuroraAreaGroupInstanceAtCell(rotated.state, instance.cells[0])).toEqual(instance);
  });

  it.each(
    ([0, 1, 2, 3] as const).flatMap((orientation) =>
      ([1, 3] as const).map((turns) => ({ orientation, turns }))
    )
  )(
    "reconstructs a rectangular group anchor after Area rotation from orientation $orientation by $turns turn(s)",
    ({ orientation, turns }) => {
      const created = createAuroraAreaEditingState({
        areaResRef: "area_rectangular_group",
        width: 7,
        height: 6,
        definition: rectangularGroupDefinition,
        selector: () => 0
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      created.state.tiles = created.state.tiles.map((tile) => ({
        ...tile,
        sourceRow: tile.row,
        sourceCol: tile.col,
        mainLight1: tile.row * created.state.width + tile.col
      }));

      const placed = placeAuroraAreaGroup(
        created.state,
        rectangularGroupDefinition,
        "rect_2x3",
        { row: 2, col: 2 },
        orientation,
        () => 0
      );
      expect(placed.ok).toBe(true);
      if (!placed.ok) return;
      const sourceSnapshot = structuredClone(placed.state);
      const sourceGroup = placed.state.groupInstances[0];

      const rotated = rotateAuroraArea(
        placed.state,
        rectangularGroupDefinition,
        turns,
        () => 0
      );
      expect(rotated.ok).toBe(true);
      if (!rotated.ok) return;
      expect(placed.state).toEqual(sourceSnapshot);

      const instance = rotated.state.groupInstances[0];
      const expectedCells = sourceGroup.cells.map((cell) =>
        rotateTestCell(cell.row, cell.col, placed.state.width, placed.state.height, turns)
      );
      expect(instance.cells).toEqual(expectedCells);
      expect(instance.cells.every(({ row, col }) =>
        row >= 0 && row < rotated.state.height && col >= 0 && col < rotated.state.width
      )).toBe(true);

      const localOffsets = rectangularGroupDefinition.groups[0].tileIds.map((_tileId, index) =>
        rotateTestCell(
          Math.floor(index / rectangularGroupDefinition.groups[0].columns),
          index % rectangularGroupDefinition.groups[0].columns,
          rectangularGroupDefinition.groups[0].columns,
          rectangularGroupDefinition.groups[0].rows,
          instance.orientation
        )
      );
      expect(localOffsets.map((offset) => ({
        row: instance.anchorRow + offset.row,
        col: instance.anchorCol + offset.col
      }))).toEqual(instance.cells);

      expect(instance.tileIds.map((tileId) => {
        const tile = rotated.state.tiles.find((candidate) => candidate.id === tileId);
        return tile && {
          tileId: tile.tileId,
          sourceRow: tile.sourceRow,
          sourceCol: tile.sourceCol
        };
      })).toEqual(rectangularGroupDefinition.groups[0].tileIds.map((tileId, index) => {
        const sourceTile = placed.state.tiles.find((tile) => tile.id === sourceGroup.tileIds[index]);
        return {
          tileId,
          sourceRow: sourceTile?.sourceRow,
          sourceCol: sourceTile?.sourceCol
        };
      }));
      expect(instance.underlay?.tiles).toEqual(sourceGroup.underlay?.tiles.map((tile) => {
        const cell = rotateTestCell(tile.row, tile.col, placed.state.width, placed.state.height, turns);
        return {
          ...tile,
          row: cell.row,
          col: cell.col,
          id: `area-tile:${cell.row}:${cell.col}:${tile.tileId}`,
          orientation: ((tile.orientation + turns) % 4) as 0 | 1 | 2 | 3
        };
      }));
    }
  );

  it.each([
    ["top", 2, 3],
    ["right", 3, 2],
    ["bottom", 2, 3],
    ["left", 3, 2]
  ] as const)("grows the %s edge and keeps a complete Tile_List", (edge, width, height) => {
    const resized = resizeAuroraArea(createState(), definition, edge, 1, () => 0);
    expect(resized.ok).toBe(true);
    if (!resized.ok) return;
    expect(resized.state).toMatchObject({ width, height });
    expect(resized.state.tiles).toHaveLength(width * height);
  });

  it.each(["top", "right", "bottom", "left"] as const)(
    "enforces the 2-tile minimum on the %s edge",
    (edge) => {
      expect(resizeAuroraArea(createState(), definition, edge, -1)).toMatchObject({
        ok: false,
        code: "AREA_SIZE_LIMIT"
      });
    }
  );

  it("enforces the 32-tile maximum and refuses to split a placed group", () => {
    const maximum = createAuroraAreaEditingState({
      areaResRef: "maximum_area",
      width: 32,
      height: 2,
      definition,
      selector: () => 0
    });
    if (!maximum.ok) throw new Error(maximum.message);
    expect(resizeAuroraArea(maximum.state, definition, "right", 1)).toMatchObject({
      ok: false,
      code: "AREA_SIZE_LIMIT"
    });

    const wider = createAuroraAreaEditingState({
      areaResRef: "group_resize",
      width: 3,
      height: 2,
      definition,
      selector: () => 0
    });
    if (!wider.ok) throw new Error(wider.message);
    const placed = placeAuroraAreaGroup(
      wider.state,
      definition,
      "group0",
      { row: 0, col: 1 },
      0,
      () => 0
    );
    if (!placed.ok) throw new Error(placed.message);
    expect(resizeAuroraArea(placed.state, definition, "right", -1)).toMatchObject({
      ok: false,
      code: "GROUP_OUT_OF_BOUNDS"
    });
  });

  it("rotates the Area matrix and keeps its dimensions consistent", () => {
    const result = rotateAuroraArea(createState(), definition, 1, () => 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.width).toBe(2);
    expect(result.state.height).toBe(2);
    expect(result.state.tiles).toHaveLength(4);
  });

  it("rehydrates complete SET group instances rather than treating members as loose tiles", () => {
    const hydrated = hydrateAuroraAreaEditingState({
      areaResRef: "area_test",
      width: 2,
      height: 2,
      definition,
      sourceAreaFingerprint: "b".repeat(64),
      tiles: [
        { id: "0", row: 0, col: 0, tileId: 2, orientation: 0, height: 0 },
        { id: "1", row: 0, col: 1, tileId: 3, orientation: 0, height: 0 },
        { id: "2", row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
        { id: "3", row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
      ]
    });

    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) return;
    expect(hydrated.state.groupInstances).toEqual([
      expect.objectContaining({ groupId: "group0", anchorRow: 0, anchorCol: 0, orientation: 0 })
    ]);
    expect(hydrated.state.sourceAreaFingerprint).toBe("b".repeat(64));

    const removeWithoutUnderlay = removeAuroraAreaGroupAtCell(
      hydrated.state,
      definition,
      { row: 0, col: 0 },
      () => 0
    );
    expect(removeWithoutUnderlay).toMatchObject({ ok: false, code: "GROUP_LOCKED" });

    const rotateWithoutUnderlay = rotateAuroraAreaTile(
      hydrated.state,
      definition,
      { row: 0, col: 1 },
      1
    );
    expect(rotateWithoutUnderlay).toMatchObject({ ok: false, code: "GROUP_LOCKED" });
  });

  it("keeps unmatched SET group-member Tile_ID occurrences as editable loose tiles", () => {
    const hydrated = hydrateAuroraAreaEditingState({
      areaResRef: "area_loose_group_member",
      width: 2,
      height: 2,
      definition,
      sourceAreaFingerprint: "c".repeat(64),
      tiles: [
        { id: "0", row: 0, col: 0, tileId: 2, orientation: 0, height: 0 },
        { id: "1", row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
        { id: "2", row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
        { id: "3", row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
      ]
    });

    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) return;
    expect(hydrated.state.groupInstances).toEqual([]);
    expect(hydrated.state.tiles.find((tile) => tile.id === "0")).not.toHaveProperty("groupId");
    expect(hydrated.state.tiles).toHaveLength(4);
  });

  it("keeps source Tile_List provenance through left-edge resize and Area rotation", () => {
    const hydrated = hydrateAuroraAreaEditingState({
      areaResRef: "area_test",
      width: 2,
      height: 2,
      definition,
      sourceAreaFingerprint: "b".repeat(64),
      tiles: [
        { id: "0", row: 0, col: 0, tileId: 0, orientation: 0, height: 0 },
        { id: "1", row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
        { id: "2", row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
        { id: "3", row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
      ]
    });
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) return;

    const resized = resizeAuroraArea(hydrated.state, definition, "left", 1, () => 0);
    expect(resized.ok).toBe(true);
    if (!resized.ok) return;
    expect(resized.state.tiles.find((tile) => tile.row === 0 && tile.col === 0)).not.toHaveProperty("sourceRow");
    expect(resized.state.tiles.find((tile) => tile.row === 0 && tile.col === 1)).toMatchObject({
      sourceRow: 0,
      sourceCol: 0
    });
    expect(resized.state.tiles.find((tile) => tile.row === 1 && tile.col === 2)).toMatchObject({
      sourceRow: 1,
      sourceCol: 1
    });

    const rotated = rotateAuroraArea(resized.state, definition, 1, () => 0);
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    expect(rotated.state.tiles.find((tile) => tile.sourceRow === 0 && tile.sourceCol === 0)).toMatchObject({
      row: 1,
      col: 1
    });
    expect(rotated.state.tiles.filter((tile) => tile.sourceRow === undefined)).toHaveLength(2);
  });
  it("resolves source-backed primary rules without guessing a fallback", () => {
    expect(resolvePrimaryTransition(definition.transitionRules, "water", 0, "grass", 0)).toEqual({
      changedTerrain: "water",
      changedHeight: 0
    });
    expect(resolvePrimaryTransition(definition.transitionRules, "grass", 0, "water", 0)).toBeNull();
  });
});
