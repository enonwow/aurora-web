import assert from "node:assert/strict";

import {
  findAssetIdentityBranchViolations,
  findPythonAssetIdentityBranchViolations
} from "./lib/asset-identity-branch-gate.mjs";

assert.equal(
  findAssetIdentityBranchViolations({
    sourceText: `function render(snapshot) { if (snapshot.fixtureId === "vfx-retail-one") return 1; }`,
    fileName: "bad.mjs",
    functionNames: new Set(["render"])
  }).length,
  1
);
assert.equal(
  findAssetIdentityBranchViolations({
    sourceText: `function render(contract) { if (contract.drawLane === "chunk_model") return 1; }`,
    fileName: "good.mjs",
    functionNames: new Set(["render"])
  }).length,
  0
);
assert.equal(
  findAssetIdentityBranchViolations({
    sourceText: `function render(label) { return label.includes("_BEAM_"); }`,
    fileName: "bad-name.mjs",
    functionNames: new Set(["render"])
  }).length,
  1
);
assert.equal(
  findAssetIdentityBranchViolations({
    sourceText: `function validate(entry) { return entry.fixtureId === "vfx-proof-target"; }`,
    fileName: "binding.mjs",
    functionNames: new Set(["runtimeBehavior"])
  }).length,
  0
);
assert.equal(
  findPythonAssetIdentityBranchViolations({
    sourceText: `def classify_capture(row):\n    label = row["label"]\n    if "_BEAM_" in label:\n        return "beam"\n`,
    fileName: "bad.py",
    functionName: "classify_capture"
  }).length,
  1
);

console.log("vfx asset identity neutral branch gate self-test passed");
