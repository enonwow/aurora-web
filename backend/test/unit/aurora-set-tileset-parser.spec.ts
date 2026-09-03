import {
  parseAuroraTilesetEditingDefinition
} from "../../src/modules/areas/adapters/outbound/blob/aurora-set-tileset-parser";

const RETAIL_SHAPED_SET = Buffer.from(`
[GENERAL]
Name=Testset Internal Name
UnlocalizedName=Testset Friendly Name
DisplayName=12345
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
Doors=1

[TILE0DOOR0]
Type=0
X=0.00
Y=0.76
Z=0.00
Orientation=180.0

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
    expect(definition.name).toBe("Testset Internal Name");
    expect(definition.unlocalizedName).toBe("Testset Friendly Name");
    expect(definition.displayNameStrRef).toBe(12345);
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
      doorHooks: [{
        index: 0,
        type: 0,
        x: 0,
        y: 0.76,
        z: 0,
        orientationDegrees: 180
      }],
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

  it.each(["-1", "1.5", "not-a-count"])(
    "rejects invalid Door hook count %s without inventing hooks",
    (count) => {
      const definition = parseAuroraTilesetEditingDefinition(
        Buffer.from(RETAIL_SHAPED_SET.toString("utf8").replace("Doors=1", `Doors=${count}`), "utf8"),
        "tst01",
      );

      expect(definition.tiles[0]?.doorHooks).toBeUndefined();
      expect(definition.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_DOOR_HOOK_COUNT",
          section: "TILE0",
          severity: "warning",
        }),
      ]));
    },
  );

  it("treats an absent Doors field as no hooks", () => {
    const definition = parseAuroraTilesetEditingDefinition(
      Buffer.from(RETAIL_SHAPED_SET.toString("utf8").replace("Doors=1\n", ""), "utf8"),
      "tst01",
    );

    expect(definition.tiles[0]?.doorHooks).toBeUndefined();
    expect(definition.diagnostics).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "INVALID_DOOR_HOOK_COUNT" }),
    ]));
  });

  it("accepts an explicit zero Door count without a diagnostic", () => {
    const definition = parseAuroraTilesetEditingDefinition(
      Buffer.from(RETAIL_SHAPED_SET.toString("utf8").replace("Doors=1", "Doors=0"), "utf8"),
      "tst01",
    );

    expect(definition.tiles[0]?.doorHooks).toBeUndefined();
    expect(definition.diagnostics).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "INVALID_DOOR_HOOK_COUNT" }),
    ]));
  });

  it("rejects a Door count that exceeds the physical SET section budget before iterating hooks", () => {
    const definition = parseAuroraTilesetEditingDefinition(
      Buffer.from(RETAIL_SHAPED_SET.toString("utf8").replace("Doors=1", "Doors=999"), "utf8"),
      "tst01",
    );

    expect(definition.tiles[0]?.doorHooks).toBeUndefined();
    expect(definition.diagnostics.filter(({ code }) => code === "INVALID_DOOR_HOOK_COUNT"))
      .toHaveLength(1);
    expect(definition.diagnostics).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "INVALID_DOOR_HOOK" }),
    ]));
  });

  it.each([
    ["section", (source: string) => source.replace(/\n\[TILE0DOOR0\][\s\S]*?(?=\n\[TILE1\])/, "")],
    ["Type", (source: string) => source.replace("Type=0", "")],
    ["negative Type", (source: string) => source.replace("Type=0", "Type=-1")],
    ["X", (source: string) => source.replace("X=0.00", "")],
    ["Y", (source: string) => source.replace("Y=0.76", "")],
    ["Z", (source: string) => source.replace("Z=0.00", "")],
    ["Orientation", (source: string) => source.replace("Orientation=180.0", "")],
    ["finite X", (source: string) => source.replace("X=0.00", "X=NaN")],
    ["finite Y", (source: string) => source.replace("Y=0.76", "Y=Infinity")],
    ["finite Z", (source: string) => source.replace("Z=0.00", "Z=invalid")],
    ["finite Orientation", (source: string) => source.replace("Orientation=180.0", "Orientation=invalid")],
  ] as const)("rejects a Door hook with invalid %s", (_label, mutate) => {
    const definition = parseAuroraTilesetEditingDefinition(
      Buffer.from(mutate(RETAIL_SHAPED_SET.toString("utf8")), "utf8"),
      "tst01",
    );

    expect(definition.tiles[0]?.doorHooks).toBeUndefined();
    expect(definition.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "INVALID_DOOR_HOOK",
        section: "TILE0DOOR0",
        severity: "warning",
      }),
    ]));
  });

  it("preserves valid hooks while diagnosing a missing declared successor", () => {
    const definition = parseAuroraTilesetEditingDefinition(
      Buffer.from(RETAIL_SHAPED_SET.toString("utf8").replace("Doors=1", "Doors=2"), "utf8"),
      "tst01",
    );

    expect(definition.tiles[0]?.doorHooks).toEqual([{
      index: 0,
      type: 0,
      x: 0,
      y: 0.76,
      z: 0,
      orientationDegrees: 180,
    }]);
    expect(definition.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "INVALID_DOOR_HOOK", section: "TILE0DOOR1" }),
    ]));
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

  it("preserves Aurora -1 group holes and keeps their real members out of loose retile candidates", () => {
    const withHole = Buffer.from(
      RETAIL_SHAPED_SET.toString("utf8").replace("Tile5=5", "Tile5=-1"),
      "utf8"
    );

    const definition = parseAuroraTilesetEditingDefinition(withHole, "tst01");

    expect(definition.groups).toEqual([
      expect.objectContaining({ tileIds: [0, 1, 2, 3, 4, null] })
    ]);
    expect(definition.tiles.find((tile) => tile.tileId === 4)).toMatchObject({ groupId: "group0" });
    expect(definition.tiles.find((tile) => tile.tileId === 5)?.groupId).toBeUndefined();
    expect(definition.diagnostics).toEqual([]);
  });

  it("preserves opaque (null) tile declarations instead of selecting parser behavior by token identity", () => {
    const nullableTile = Buffer.from(
      RETAIL_SHAPED_SET.toString("utf8")
        .replace("Model=tst_a06", "Model=(null)\nImageMap2D=(null)\nOrientation=(null)"),
      "utf8"
    );

    const definition = parseAuroraTilesetEditingDefinition(nullableTile, "tst01");

    expect(definition.tiles.find((tile) => tile.tileId === 5)).toMatchObject({
      tileId: 5,
      modelResRef: "(null)",
      imageMap2D: "(null)"
    });
    expect(definition.tiles.find((tile) => tile.tileId === 5)?.orientation).toBeUndefined();
    expect(definition.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "INVALID_TILE_ORIENTATION", section: "TILE5" })])
    );
  });

  it("preserves an exact NULL model declaration for evidence-bound downstream disposition", () => {
    const nullModelTile = Buffer.from(
      RETAIL_SHAPED_SET.toString("utf8").replace("Model=tst_a06", "Model=NULL"),
      "utf8"
    );

    const definition = parseAuroraTilesetEditingDefinition(nullModelTile, "tst01");

    expect(definition.tiles.find((tile) => tile.tileId === 5)?.modelResRef).toBe("null");
  });

  it("preserves every palette group when Aurora reuses a member tile", () => {
    const reusedMember = Buffer.from(
      RETAIL_SHAPED_SET.toString("utf8")
        .replace("[GROUPS]\nCount=1", "[GROUPS]\nCount=2")
        .concat("\n[GROUP1]\nName=Alternate bridge\nRows=1\nColumns=2\nTile0=0\nTile1=5\n"),
      "utf8"
    );

    const definition = parseAuroraTilesetEditingDefinition(reusedMember, "tst01");

    expect(definition.groups).toHaveLength(2);
    expect(definition.tiles.find((tile) => tile.tileId === 0)).toMatchObject({
      groupId: "group0",
      groupIds: ["group0", "group1"]
    });
    expect(definition.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "TILE_IN_MULTIPLE_GROUPS", severity: "info" })])
    );
  });
});
