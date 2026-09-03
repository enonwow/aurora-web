import assert from "node:assert/strict";

import {
  PATH_NODE_REFERENCE_CORPUS,
  comparePathNodeReferenceBoundary,
  resolvePathNodeReference
} from "./lib/tile-path-node-reference.mjs";

assert.equal(PATH_NODE_REFERENCE_CORPUS.schema, "aurora-tile-path-node-reference-corpus/v1");
assert.equal(Object.keys(PATH_NODE_REFERENCE_CORPUS.nodes).length, 50);
assert.ok(PATH_NODE_REFERENCE_CORPUS.nodes.A);
assert.ok(PATH_NODE_REFERENCE_CORPUS.nodes.x);
assert.equal(PATH_NODE_REFERENCE_CORPUS.nodes.y, undefined);
assert.equal(PATH_NODE_REFERENCE_CORPUS.nodes.z, undefined);

const upperA = resolvePathNodeReference({ pathNode: "A", orientation: 0 });
assert.equal(upperA.status, "reference-known");
assert.deepEqual(upperA.exitsByEdge.right, [{ lane: 0, region: 0 }]);

const lowerA = resolvePathNodeReference({ pathNode: "a", orientation: 0 });
assert.equal(lowerA.status, "reference-known");
assert.notDeepEqual(upperA.exits, lowerA.exits);

const rotatedL = resolvePathNodeReference({ pathNode: "L", orientation: 1 });
assert.deepEqual(rotatedL.exitsByEdge.right, [{ lane: 0, region: 0 }]);
assert.deepEqual(rotatedL.exitsByEdge.left, [{ lane: 0, region: 0 }]);

assert.equal(resolvePathNodeReference({ pathNode: "y", orientation: 0 }).status, "reference-unknown-symbol");
assert.equal(resolvePathNodeReference({ pathNode: "P", orientation: 0 }).status, "reference-empty");

const matchingBoundary = comparePathNodeReferenceBoundary({
  source: { pathNode: "A", orientation: 0 },
  sourceEdge: "right",
  partner: { pathNode: "A", orientation: 0 },
  partnerEdge: "left"
});
assert.equal(matchingBoundary.status, "reference-match");
assert.deepEqual(matchingBoundary.matchingLanes, [0]);
assert.deepEqual(matchingBoundary.sourceOnlyLanes, []);
assert.deepEqual(matchingBoundary.partnerOnlyLanes, []);

const rotatedBoundary = comparePathNodeReferenceBoundary({
  source: { pathNode: "A", orientation: 0 },
  sourceEdge: "right",
  partner: { pathNode: "L", orientation: 1 },
  partnerEdge: "left"
});
assert.equal(rotatedBoundary.status, "reference-match");

const mismatchedBoundary = comparePathNodeReferenceBoundary({
  source: { pathNode: "A", orientation: 0 },
  sourceEdge: "right",
  partner: { pathNode: "L", orientation: 0 },
  partnerEdge: "left"
});
assert.equal(mismatchedBoundary.status, "reference-mismatch");
assert.deepEqual(mismatchedBoundary.sourceOnlyLanes, [0]);

const wrongEdges = comparePathNodeReferenceBoundary({
  source: { pathNode: "A", orientation: 0 },
  sourceEdge: "right",
  partner: { pathNode: "A", orientation: 0 },
  partnerEdge: "top"
});
assert.equal(wrongEdges.status, "reference-invalid-shared-edge");

for (const symbol of Object.keys(PATH_NODE_REFERENCE_CORPUS.nodes)) {
  const resolved = resolvePathNodeReference({ pathNode: symbol, orientation: 0 });
  assert.ok(["reference-known", "reference-empty"].includes(resolved.status));
  for (const edge of Object.values(resolved.exitsByEdge)) {
    assert.ok(edge.length <= 3, `${symbol} exceeds the three-exit edge limit.`);
  }
}

process.stdout.write("tile path node reference resolver: PASS\n");
