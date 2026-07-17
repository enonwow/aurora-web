import {
  parseAuroraTilesetEditingDefinition
} from "../../src/modules/areas/adapters/outbound/blob/aurora-set-tileset-parser";

const RETAIL_SHAPED_SET = Buffer.from(`
[GENERAL]
Interior=0
HasHeightTransition=1
Transition=2
Border=Grass
Default=Grass
Floor=Grass

[TERRAIN TYPES]
Count=2

[TERRAIN0]
Name=Grass

[TERRAIN1]
Name=Water

[CROSSER TYPES]
Count=1

[CROSSER0]
Name=Bridge

[PRIMARY RULES]
Count=1

[PRIMARY RULE0]
Placed=grass
PlacedHeight=0
Adjacent=water
AdjacentHeight=1
Changed=water
ChangedHeight=0

[TILES]
Count=6

[TILE0]
Model=tst_a01
ImageMap2D=mi_tst_a01
TopLeft=grass
TopLeftHeight=0
TopRight=water
TopRightHeight=1
BottomRight=water
BottomRightHeight=0
BottomLeft=grass
BottomLeftHeight=0
Top=bridge
Orientation=90
MainLight1=1
AnimLoop2=3

[TILE1]
Model=tst_a02

[TILE2]
Model=tst_a03

[TILE3]
Model=tst_a04

[TILE4]
Model=tst_a05

[TILE5]
Model=tst_a06

[GROUPS]
Count=1

[GROUP0]
Name=Bridge House
Rows=2
Columns=3
Tile0=0
Tile1=1
Tile2=2
Tile3=3
Tile4=4
Tile5=5
`, "utf8");

describe("parseAuroraTilesetEditingDefinition", () => {
  it("maps retail terrain corners, edge crossers, rules, and rectangular groups", () => {
    const definition = parseAuroraTilesetEditingDefinition(RETAIL_SHAPED_SET, "TST01");

    expect(definition.schemaVersion).toBe(1);
    expect(definition.tilesetResRef).toBe("tst01");
    expect(definition.fingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(definition.defaults).toEqual({
      interior: false,
      hasHeightTransition: true,
      transition: 2,
      borderTerrain: "grass",
      defaultTerrain: "grass",
      floorTerrain: "grass"
    });
    expect(definition.terrainTypes).toEqual([
      { id: "grass", name: "Grass" },
      { id: "water", name: "Water" }
    ]);
    expect(definition.crosserTypes).toEqual([{ id: "bridge", name: "Bridge" }]);
    expect(definition.transitionRules).toEqual([
      {
        placedTerrain: "grass",
        placedHeight: 0,
        adjacentTerrain: "water",
        adjacentHeight: 1,
        changedTerrain: "water",
        changedHeight: 0
      }
    ]);
    expect(definition.tiles[0]).toMatchObject({
      tileId: 0,
      modelResRef: "tst_a01",
      imageMap2D: "mi_tst_a01",
      orientation: 1,
      terrain: {
        topLeft: "grass",
        topRight: "water",
        bottomRight: "water",
        bottomLeft: "grass"
      },
      crossers: { top: "bridge" },
      cornerHeights: { topLeft: 0, topRight: 1, bottomRight: 0, bottomLeft: 0 },
      mainLight1: 1,
      animLoop2: 3,
      groupId: "group0"
    });
    expect(definition.groups).toEqual([
      {
        id: "group0",
        name: "Bridge House",
        rows: 2,
        columns: 3,
        tileIds: [0, 1, 2, 3, 4, 5]
      }
    ]);
    expect(definition.diagnostics).toEqual([]);
  });

  it("rejects incomplete group definitions without inventing membership", () => {
    const malformed = Buffer.from(
      RETAIL_SHAPED_SET.toString("utf8").replace("Tile5=5", ""),
      "utf8"
    );

    const definition = parseAuroraTilesetEditingDefinition(malformed, "tst01");

    expect(definition.groups).toEqual([]);
    expect(definition.tiles.some((tile) => tile.groupId !== undefined)).toBe(false);
    expect(definition.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "GROUP_MEMBER_MISSING", severity: "error" })
      ])
    );
  });
});
