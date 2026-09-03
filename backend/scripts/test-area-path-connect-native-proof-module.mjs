#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  buildPathConnectProofProfile,
  derivePathConnectProofAreaTiles,
} from "./lib/area-path-connect-native-proof-module.mjs";
import { validatePathConnectDifferentialProfile } from "./lib/tile-path-connect-differential-proof.mjs";

const baseTiles = [2, 1, 3, 0].map((orientation, index) => ({
  row: Math.floor(index / 2),
  col: index % 2,
  tileId: 12,
  orientation,
  height: 0,
  mainLight1: 0,
  mainLight2: 0,
  sourceLight1: 0,
  sourceLight2: 0,
  animLoop1: 1,
  animLoop2: 1,
  animLoop3: 1,
}));

const row = {
  id: "tms01:7",
  tilesetResRef: "tms01",
  tileId: 7,
  definitionFingerprint: "d".repeat(64),
  connect: { status: "planned", partnerTileId: 5 },
  fixture: {
    kind: "tile",
    chunkId: "tms01-chunk-0008",
    caseIndex: 0,
    width: 2,
    height: 2,
    cells: [
      { role: "source", row: 0, col: 0, tileId: 7 },
      { role: "partner", row: 0, col: 1, tileId: 5 },
    ],
  },
  pathConnect: {
    status: "blocked",
    sourcePathNode: "d",
    partnerPathNode: "b",
    reference: {
      status: "reference-match",
      source: { orientation: 0 },
      partner: { orientation: 0 },
      sourceEdge: "right",
      partnerEdge: "left",
      matchingLanes: [0],
    },
    negativeControl: {
      referenceStatus: "reference-mismatch",
      source: { tileId: 7, pathNode: "d", orientation: 0, edge: "right", row: 0, col: 0 },
      partner: { tileId: 6, pathNode: "e", orientation: 0, edge: "left", row: 0, col: 1 },
      sourceLanes: [0],
      partnerLanes: [-4, 0, 4],
      matchingLanes: [0],
      sourceOnlyLanes: [],
      partnerOnlyLanes: [-4, 4],
      sourceRegionsByLane: [{ lane: 0, regions: [0] }],
      partnerRegionsByLane: [
        { lane: -4, regions: [2] },
        { lane: 0, regions: [1] },
        { lane: 4, regions: [0] },
      ],
      reason: "path-node-reference-mismatch",
    },
  },
};

const areas = derivePathConnectProofAreaTiles({ row, baseTiles, width: 2, height: 2 });
assert.deepEqual(areas.positive.map(projectTile), [
  [0, 0, 7, 0],
  [0, 1, 5, 0],
  [1, 0, 12, 3],
  [1, 1, 12, 0],
]);
assert.deepEqual(areas.negative.map(projectTile), [
  [0, 0, 7, 0],
  [0, 1, 6, 0],
  [1, 0, 12, 3],
  [1, 1, 12, 0],
]);
assert.deepEqual(baseTiles.map(projectTile), [
  [0, 0, 12, 2],
  [0, 1, 12, 1],
  [1, 0, 12, 3],
  [1, 1, 12, 0],
]);

const profile = buildPathConnectProofProfile({
  row,
  moduleSha256: "a".repeat(64),
  positiveAreaResRef: "pc_tms01_pos",
  negativeAreaResRef: "pc_tms01_neg",
  width: 2,
  height: 2,
});
assert.deepEqual(validatePathConnectDifferentialProfile(profile, row), []);
assert.equal(profile.source.tileId, 7);
assert.equal(profile.partner.tileId, 5);
assert.equal(profile.negativeControl.partner.tileId, 6);

for (const mutate of [
  (candidate) => { candidate.fixture.width = 3; },
  (candidate) => { candidate.fixture.cells[1].col = 0; },
  (candidate) => { candidate.pathConnect.reference.status = "reference-unknown"; },
  (candidate) => { candidate.pathConnect.negativeControl.partner.tileId = 5; },
]) {
  const candidate = structuredClone(row);
  mutate(candidate);
  assert.throws(
    () => derivePathConnectProofAreaTiles({ row: candidate, baseTiles, width: 2, height: 2 }),
    /path_connect_proof_row_invalid/u,
  );
}

process.stdout.write("Area PathConnect native proof module contract: PASS\n");

function projectTile(tile) {
  return [tile.row, tile.col, tile.tileId, tile.orientation];
}
