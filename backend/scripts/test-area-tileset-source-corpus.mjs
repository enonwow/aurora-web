import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadSelectedAreaTilesetCorpus } from "./lib/area-tileset-source-corpus.mjs";

function setBytes(modelResRef) {
  return [
    "[GENERAL]",
    "Name=Fixture",
    "DisplayName=-1",
    "[TILE0]",
    `Model=${modelResRef}`,
    "ImageMap2D=opaque_map",
    "Orientation=0",
    ""
  ].join("\n");
}

function groupedSetBytes() {
  return [
    "[GENERAL]",
    "Name=Grouped Fixture",
    "DisplayName=-1",
    "[TILE0]",
    "Model=group_member_zero",
    "[TILE1]",
    "Model=group_member_one",
    "[TILE2]",
    "Model=standalone_member",
    "[GROUPS]",
    "Count=2",
    "[GROUP0]",
    "Name=First Group",
    "Rows=1",
    "Columns=2",
    "Tile0=0",
    "Tile1=-1",
    "[GROUP1]",
    "Name=Second Group",
    "Rows=1",
    "Columns=2",
    "Tile0=0",
    "Tile1=1",
    ""
  ].join("\n");
}

function topologySetBytes() {
  return [
    "[GENERAL]",
    "Name=Topology Fixture",
    "DisplayName=-1",
    "[TERRAIN TYPES]",
    "Count=2",
    "[TERRAIN0]",
    "Name=Ground",
    "[TERRAIN1]",
    "Name=Water",
    "[CROSSER TYPES]",
    "Count=1",
    "[CROSSER0]",
    "Name=Road",
    "[TILE0]",
    "Model=topology_model",
    "TopLeft=Ground",
    "TopRight=Water",
    "BottomRight=Ground",
    "BottomLeft=UnlistedTerrain",
    "Top=Road",
    "Right=",
    "Bottom=UnknownCrosser",
    "Left=Road",
    ""
  ].join("\n");
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-area-tileset-corpus-"));
try {
  const moduleSet = path.join(root, "opaque01.set");
  const hakSet = path.join(root, "__aurora", "sources", "hak", "pack", "opaque01.set");
  const vanillaSet = path.join(root, "__aurora", "sources", "vanilla", "tilesets", "opaque01.set");
  fs.mkdirSync(path.dirname(hakSet), { recursive: true });
  fs.mkdirSync(path.dirname(vanillaSet), { recursive: true });
  fs.writeFileSync(moduleSet, setBytes("module_model"));
  fs.writeFileSync(hakSet, setBytes("hak_model"));
  fs.writeFileSync(vanillaSet, setBytes("vanilla_model"));
  const corpus = loadSelectedAreaTilesetCorpus(root);
  assert.equal(corpus.setVariantPaths.length, 3);
  assert.equal(corpus.selectedTilesets.length, 1);
  assert.equal(corpus.selectedTilesets[0].setPath, moduleSet);
  assert.deepEqual(corpus.selectedTilesets[0].definition.tiles, [{
    tileId: 0,
    modelResRef: "module_model",
    imageMap2D: "opaque_map",
    orientation: "0",
    groupId: null
  }]);
  assert.deepEqual(corpus.selectedTilesets[0].definition.groups, []);

  const groupedSet = path.join(root, "grouped01.set");
  fs.writeFileSync(groupedSet, groupedSetBytes());
  const groupedDefinition = loadSelectedAreaTilesetCorpus(root)
    .selectedByResRef.get("grouped01")?.definition;
  assert.deepEqual(groupedDefinition?.groups, [
    {
      id: "group0",
      name: "First Group",
      rows: 1,
      columns: 2,
      tileIds: [0, null]
    },
    {
      id: "group1",
      name: "Second Group",
      rows: 1,
      columns: 2,
      tileIds: [0, 1]
    }
  ]);
  assert.deepEqual(groupedDefinition?.tiles, [
    {
      tileId: 0,
      modelResRef: "group_member_zero",
      imageMap2D: null,
      orientation: null,
      groupId: "group0",
      groupIds: ["group0", "group1"]
    },
    {
      tileId: 1,
      modelResRef: "group_member_one",
      imageMap2D: null,
      orientation: null,
      groupId: "group1",
      groupIds: ["group1"]
    },
    {
      tileId: 2,
      modelResRef: "standalone_member",
      imageMap2D: null,
      orientation: null,
      groupId: null
    }
  ]);

  const topologySet = path.join(root, "topology01.set");
  fs.writeFileSync(topologySet, topologySetBytes());
  const topologyDefinition = loadSelectedAreaTilesetCorpus(root)
    .selectedByResRef.get("topology01")?.definition;
  assert.deepEqual(topologyDefinition?.terrainTypes, [
    { id: "terrain0", name: "ground" },
    { id: "terrain1", name: "water" }
  ]);
  assert.deepEqual(topologyDefinition?.crosserTypes, [
    { id: "crosser0", name: "road" }
  ]);
  assert.deepEqual(topologyDefinition?.tiles[0]?.terrain, {
    topLeft: "ground",
    topRight: "water",
    bottomRight: "ground",
    bottomLeft: "unlistedterrain"
  });
  assert.deepEqual(topologyDefinition?.tiles[0]?.crossers, {
    top: "road",
    right: null,
    bottom: "unknowncrosser",
    left: "road"
  });

  const gappedSet = path.join(root, "gapped01.set");
  fs.writeFileSync(
    gappedSet,
    groupedSetBytes()
      .replace("Count=2", "Count=3")
      .replace("[GROUP1]", "[GROUP2]")
  );
  const gappedDefinition = loadSelectedAreaTilesetCorpus(root)
    .selectedByResRef.get("gapped01")?.definition;
  assert.deepEqual(gappedDefinition?.groups.map((group) => group.id), ["group0", "group2"]);
  assert.deepEqual(gappedDefinition?.tiles[0]?.groupIds, ["group0", "group2"]);
  assert.equal(gappedDefinition?.tiles[1]?.groupId, "group2");

  const invalidGroupPath = path.join(root, "invalid-group.set");
  fs.writeFileSync(
    invalidGroupPath,
    groupedSetBytes().replace("Tile1=1", "Tile1=999")
  );
  assert.throws(
    () => loadSelectedAreaTilesetCorpus(root),
    /Group group1 member Tile1 references unknown Tile999/u
  );
  fs.rmSync(invalidGroupPath);

  const duplicateIgnoredSectionPath = path.join(root, "ignored-duplicate.set");
  fs.writeFileSync(
    duplicateIgnoredSectionPath,
    `${setBytes("ignored_duplicate_model")}[TILE0DOOR0]\nType=0\n[TILE0DOOR0]\nType=1\n`
  );
  assert.equal(
    loadSelectedAreaTilesetCorpus(root)
      .selectedByResRef.get("ignored-duplicate")?.definition.tiles[0]?.modelResRef,
    "ignored_duplicate_model"
  );

  const duplicateConsumedSectionPath = path.join(root, "duplicate-tile.set");
  fs.writeFileSync(
    duplicateConsumedSectionPath,
    `${setBytes("first_tile_model")}[TILE0]\nModel=second_tile_model\n`
  );
  assert.throws(
    () => loadSelectedAreaTilesetCorpus(root),
    /Duplicate or invalid SET section tile0/u
  );
  fs.rmSync(duplicateConsumedSectionPath);

  const identicalDuplicateFieldPath = path.join(root, "identical-field.set");
  fs.writeFileSync(
    identicalDuplicateFieldPath,
    setBytes("identical_field_model").replace("Orientation=0", "Orientation=0\nOrientation=0")
  );
  assert.equal(
    loadSelectedAreaTilesetCorpus(root)
      .selectedByResRef.get("identical-field")?.definition.tiles[0]?.orientation,
    "0"
  );

  const duplicateFieldPath = path.join(root, "invalid01.set");
  fs.writeFileSync(duplicateFieldPath, `${setBytes("first_model")}Model=second_model\n`);
  assert.throws(() => loadSelectedAreaTilesetCorpus(root), /Duplicate or invalid SET field/u);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

process.stdout.write("Area tileset source corpus: PASS\n");
