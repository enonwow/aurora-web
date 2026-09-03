import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const controller = path.join(scriptDirectory, "aurora-tile-add-connect-matrix.mjs");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-tile-offline-plan-"));
const sha256File = (filePath) => createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const writeJson = (filePath, value) => fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
const run = (...args) => spawnSync(process.execPath, [controller, ...args], { encoding: "utf8" });

try {
  const runtimeProfilePath = path.join(root, "runtime-build-profile.json");
  writeJson(runtimeProfilePath, {
    schema: "aurora-tile-add-connect-runtime-build-profile/v1",
    profileId: "offline-plan-v8",
    createdAt: "2026-08-21T16:00:00.000Z",
    frontend: {
      commit: "offline-plan-build",
      imageDigest: `sha256:${"a".repeat(64)}`,
      builtAt: "2026-08-21T15:59:00.000Z",
      baseUrl: "http://127.0.0.1:5173"
    },
    backend: {
      commit: "offline-plan-build",
      imageDigest: `sha256:${"b".repeat(64)}`,
      builtAt: "2026-08-21T15:59:00.000Z",
      baseUrl: "http://127.0.0.1:3000",
      contractVersion: "1.0.0",
      vfxRuntimeRevision: "offline-plan-runtime"
    }
  });
  const runtimeProfileSha256 = sha256File(runtimeProfilePath);
  const sourcePath = path.join(root, "control01.set");
  fs.writeFileSync(sourcePath, "[TILES]\nCount=3\n", "utf8");
  const sourceSha256 = sha256File(sourcePath);
  const inventoryPath = path.join(root, "proof-input.json");
  writeJson(inventoryPath, {
    schemaVersion: 1,
    generatedAt: "2026-08-18T00:00:00.000Z",
    sourceRoot: root,
    definitions: [{
      tilesetResRef: "control01",
      source: sourcePath,
      definition: {
        schemaVersion: 1,
        tilesetResRef: "control01",
        fingerprint: sourceSha256,
        defaults: {},
        terrainTypes: [],
        crosserTypes: [],
        transitionRules: [],
        tiles: [
          { tileId: 0, modelResRef: "source", pathNode: "A", terrain: { topRight: "g", bottomRight: "g" }, crossers: { right: "r" } },
          { tileId: 1, modelResRef: "positive", pathNode: "a", terrain: { topLeft: "g", bottomLeft: "g" }, crossers: { left: "r" } },
          { tileId: 2, modelResRef: "negative", pathNode: "L", terrain: { topLeft: "g", bottomLeft: "g" }, crossers: { left: "r" } }
        ],
        groups: [],
        diagnostics: []
      }
    }]
  });
  const outDirectory = path.join(root, "plan");
  const planned = run(
    "plan-inventory",
    "--out-directory", outDirectory,
    "--inventory", inventoryPath,
    "--inventory-sha256", sha256File(inventoryPath),
    "--tileset-resref", "control01",
    "--source-key", "modules/current/__aurora/sources/hak/control/control01.set",
    "--source-sha256", sourceSha256,
    "--runtime-build-profile", runtimeProfilePath,
    "--runtime-build-profile-sha256", runtimeProfileSha256
  );
  assert.equal(planned.status, 0, planned.stderr || planned.stdout);
  const result = JSON.parse(planned.stdout);
  assert.equal(result.reused, false);
  const manifest = JSON.parse(fs.readFileSync(path.join(outDirectory, "manifest.json"), "utf8"));
  assert.equal(manifest.contract.revision, "path-node-aware-v8");
  assert.equal(manifest.rows.length, 3);
  assert.deepEqual(manifest.rows[0].pathConnect.negativeControl, {
    referenceStatus: "reference-mismatch",
    source: { tileId: 0, pathNode: "A", orientation: 0, edge: "right", row: 0, col: 0 },
    partner: { tileId: 2, pathNode: "L", orientation: 0, edge: "left", row: 0, col: 1 },
    sourceLanes: [0],
    partnerLanes: [],
    matchingLanes: [],
    sourceOnlyLanes: [0],
    partnerOnlyLanes: [],
    sourceRegionsByLane: [{ lane: 0, regions: [0] }],
    partnerRegionsByLane: [],
    reason: "path-node-reference-mismatch"
  });
  const checkpoint = JSON.parse(
    fs.readFileSync(path.join(outDirectory, "checkpoint.json"), "utf8")
  );
  assert.deepEqual(checkpoint.acceptedVisualReviews, []);
  assert.deepEqual(checkpoint.rejectedVisualReviews, []);
  const status = run("status", "--out-directory", outDirectory, "--plan-id", result.planBinding.planId);
  assert.equal(status.status, 0, status.stderr || status.stdout);
  assert.equal(JSON.parse(status.stdout).validation.status, "ready");

  fs.appendFileSync(sourcePath, "tamper\n", "utf8");
  const rejectedDirectory = path.join(root, "rejected-plan");
  const rejected = run(
    "plan-inventory",
    "--out-directory", rejectedDirectory,
    "--inventory", inventoryPath,
    "--inventory-sha256", sha256File(inventoryPath),
    "--tileset-resref", "control01",
    "--source-key", "modules/current/__aurora/sources/hak/control/control01.set",
    "--source-sha256", sourceSha256,
    "--runtime-build-profile", runtimeProfilePath,
    "--runtime-build-profile-sha256", runtimeProfileSha256
  );
  assert.notEqual(rejected.status, 0);
  assert.equal(fs.existsSync(rejectedDirectory), false);

  process.stdout.write("tile add/connect offline inventory plan: PASS\n");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
