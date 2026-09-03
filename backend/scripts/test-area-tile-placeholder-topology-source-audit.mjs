import assert from "node:assert/strict";

import {
  buildAreaTilePlaceholderTopologySourceAudit
} from "./lib/area-tile-placeholder-topology-source-audit.mjs";

function fixtureCorpus(modelA = "opaque_a", modelB = "opaque_b") {
  const selectedTilesets = [{
    tilesetResRef: "fixture01",
    setPath: "C:/fixtures/fixture01.set",
    setSha256: "a".repeat(64),
    definition: {
      terrainTypes: [{ id: "terrain0", name: "ground" }],
      crosserTypes: [{ id: "crosser0", name: "road" }],
      tiles: [
        {
          tileId: 0,
          modelResRef: modelA,
          terrain: {
            topLeft: "ground",
            topRight: "ground",
            bottomRight: "ground",
            bottomLeft: "ground"
          },
          crossers: { top: "road", right: null, bottom: null, left: "road" },
          groupId: "group0",
          groupIds: ["group0"]
        },
        {
          tileId: 1,
          modelResRef: modelB,
          terrain: {
            topLeft: "padding",
            topRight: "padding",
            bottomRight: "padding",
            bottomLeft: "padding"
          },
          crossers: { top: null, right: "unknown_edge", bottom: null, left: null },
          groupId: null
        }
      ]
    }
  }];
  return { selectedTilesets };
}

function fixtureInventory(modelA = "opaque_a", modelB = "opaque_b") {
  return [
    {
      tilesetResRef: "fixture01",
      tileId: 0,
      modelResRef: modelA,
      modelStatus: "source_resolved"
    },
    {
      tilesetResRef: "fixture01",
      tileId: 1,
      modelResRef: modelB,
      modelStatus: "intentional_placeholder"
    }
  ];
}

const audit = buildAreaTilePlaceholderTopologySourceAudit({
  corpus: fixtureCorpus(),
  inventoryRows: fixtureInventory()
});
assert.equal(audit.schema, "aurora-area-tile-placeholder-topology-source-audit/v1");
assert.deepEqual(audit.summary, {
  tilesetCount: 1,
  tileCount: 2,
  allCornerTerrainsDeclared: 1,
  containsUndeclaredCornerTerrain: 1,
  allEdgeCrossersDeclared: 1,
  containsUndeclaredEdgeCrosser: 1,
  legacyIntentionalPlaceholderCount: 1,
  legacyIntentionalPlaceholderAllCornerTerrainsDeclared: 0,
  legacyIntentionalPlaceholderContainsUndeclaredCornerTerrain: 1,
  legacyIntentionalPlaceholderGrouped: 0,
  legacyIntentionalPlaceholderStandalone: 1,
  nonLegacyPlaceholderContainsUndeclaredCornerTerrain: 0
});
assert.deepEqual(audit.reviewRows, [
  {
    rowId: "fixture01:1",
    tilesetResRef: "fixture01",
    tileId: 1,
    setSha256: "a".repeat(64),
    modelResRef: "opaque_b",
    legacyModelStatus: "intentional_placeholder",
    groupIds: [],
    cornerTerrains: ["padding", "padding", "padding", "padding"],
    undeclaredCornerTerrains: ["padding"],
    edgeCrossers: [null, "unknown_edge", null, null],
    undeclaredEdgeCrossers: ["unknown_edge"]
  }
]);

const renamedAudit = buildAreaTilePlaceholderTopologySourceAudit({
  corpus: fixtureCorpus("unrelated_name", "another_unrelated_name"),
  inventoryRows: fixtureInventory("unrelated_name", "another_unrelated_name")
});
assert.deepEqual(renamedAudit.summary, audit.summary);
assert.deepEqual(
  renamedAudit.reviewRows.map(({ modelResRef: _modelResRef, ...row }) => row),
  audit.reviewRows.map(({ modelResRef: _modelResRef, ...row }) => row)
);

assert.throws(
  () => buildAreaTilePlaceholderTopologySourceAudit({
    corpus: fixtureCorpus(),
    inventoryRows: [...fixtureInventory(), fixtureInventory()[0]]
  }),
  /duplicate inventory row fixture01:0/u
);
assert.throws(
  () => buildAreaTilePlaceholderTopologySourceAudit({
    corpus: fixtureCorpus(),
    inventoryRows: fixtureInventory("wrong_model", "opaque_b")
  }),
  /model declaration mismatch for fixture01:0/u
);
assert.throws(
  () => buildAreaTilePlaceholderTopologySourceAudit({
    corpus: fixtureCorpus(),
    inventoryRows: fixtureInventory().slice(0, 1)
  }),
  /inventory membership mismatch/u
);

process.stdout.write("Area tile placeholder topology source audit: PASS\n");
