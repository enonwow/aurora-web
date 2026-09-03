import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildMatrixManifest } from "./lib/tile-add-connect-matrix.mjs";
import { buildMatrixRuntimeBuildBinding } from "./lib/tile-add-connect-runtime-build-profile.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const controller = path.join(scriptDirectory, "aurora-tile-add-connect-matrix.mjs");
const proofValidator = path.join(scriptDirectory, "validate-aurora-tile-path-connect-differential.mjs");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-path-connect-acceptance-"));
const sha256Bytes = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sha256File = (filePath) => sha256Bytes(fs.readFileSync(filePath));
const digest = (value) => sha256Bytes(JSON.stringify(value));
const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

function run(script, ...args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

try {
  const sourceDirectory = path.join(root, "source-plan");
  const replacementDirectory = path.join(root, "replacement-parent", "accepted-plan");
  const runtimeProfile = {
    schema: "aurora-tile-add-connect-runtime-build-profile/v1",
    profileId: "path-connect-acceptance-v8",
    createdAt: "2026-08-21T16:00:00.000Z",
    frontend: {
      commit: "path-connect-test-build",
      imageDigest: `sha256:${"a".repeat(64)}`,
      builtAt: "2026-08-21T15:59:00.000Z",
      baseUrl: "http://127.0.0.1:5173"
    },
    backend: {
      commit: "path-connect-test-build",
      imageDigest: `sha256:${"b".repeat(64)}`,
      builtAt: "2026-08-21T15:59:00.000Z",
      baseUrl: "http://127.0.0.1:3000",
      contractVersion: "1.0.0",
      vfxRuntimeRevision: "path-connect-test-runtime"
    }
  };
  const runtimeProfilePath = path.join(sourceDirectory, "runtime-build-profile.json");
  writeJson(runtimeProfilePath, runtimeProfile);
  const runtimeBuildBinding = buildMatrixRuntimeBuildBinding({
    profile: runtimeProfile,
    profilePath: runtimeProfilePath,
    profileSha256: sha256File(runtimeProfilePath)
  });
  const manifest = buildMatrixManifest({
    tilesets: [{
      tilesetResRef: "control01",
      definition: { tiles: [
        { tileId: 0, modelResRef: "source", pathNode: "A", terrain: { topRight: "g", bottomRight: "g" }, crossers: { right: "r" } },
        { tileId: 1, modelResRef: "partner", pathNode: "A", terrain: { topLeft: "g", bottomLeft: "g" }, crossers: { left: "r" } },
        { tileId: 2, modelResRef: "negative", pathNode: "L", terrain: { topLeft: "g", bottomLeft: "g" }, crossers: { left: "r" } }
      ] }
    }],
    runtimeBuildBinding,
    caseLimit: 1,
    generatedAt: "2026-08-18T00:00:00.000Z"
  });
  const planId = digest(manifest);
  writeJson(path.join(sourceDirectory, "manifest.json"), manifest);
  for (const chunk of manifest.chunks) writeJson(path.join(sourceDirectory, "chunks", `${chunk.id}.json`), chunk);
  writeJson(path.join(sourceDirectory, "checkpoint.json"), {
    schema: "aurora-tile-add-connect-matrix-checkpoint/v2",
    planId,
    planDirectory: sourceDirectory,
    manifestSha256: planId,
    manifestSchema: manifest.schema,
    contractRevision: manifest.contract.revision,
    contractFingerprint: manifest.contract.fingerprint,
    runtimeBuildBinding,
    nextChunkIndex: manifest.chunks.length,
    capturedChunkIds: manifest.chunks.map((chunk) => chunk.id),
    acceptedVisualReviews: [],
    rejectedVisualReviews: [],
    complete: true,
    updatedAt: "2026-08-18T00:01:00.000Z"
  });
  writeJson(path.join(sourceDirectory, "summary.json"), {
    schema: "aurora-tile-add-connect-matrix-summary/v2",
    generatedAt: "2026-08-18T00:00:00.000Z",
    planBinding: {
      planId,
      outDirectory: sourceDirectory,
      manifestSchema: manifest.schema,
      contractRevision: manifest.contract.revision,
      contractFingerprint: manifest.contract.fingerprint,
      runtimeBuildBinding
    },
    matrix: manifest.summary,
    validationErrors: []
  });

  const row = manifest.rows.find((candidate) => candidate.connect.status === "planned");
  const rowPath = path.join(root, "row.json");
  writeJson(rowPath, row);
  const profile = {
    schema: "aurora-tile-path-connect-profile/v2",
    id: "control01-0-right-1-path-connect-v2",
    approved: true,
    moduleSha256: "a".repeat(64),
    positiveAreaResRef: "control_pc_pos",
    negativeAreaResRef: "control_pc_neg",
    areaWidth: row.fixture.width,
    areaHeight: row.fixture.height,
    tilesetResRef: row.tilesetResRef,
    definitionFingerprint: row.definitionFingerprint,
    rowId: row.id,
    source: { tileId: 0, pathNode: "A", orientation: 0, edge: "right", row: 0, col: 0 },
    partner: { tileId: 1, pathNode: "A", orientation: 0, edge: "left", row: 0, col: 1 },
    matchingLanes: [0],
    negativeControl: structuredClone(row.pathConnect.negativeControl)
  };
  const profilePath = path.join(root, "profile.json");
  writeJson(profilePath, profile);
  const artifacts = {};
  for (const kind of ["toolsetReadback", "positiveRuntime", "negativeRuntime", "engineLog"]) {
    const artifactPath = path.join(root, `${kind}.txt`);
    fs.writeFileSync(artifactPath, `${kind}\n`, "utf8");
    artifacts[kind] = { path: artifactPath, sha256: sha256File(artifactPath) };
  }
  const packet = {
    schema: "aurora-tile-path-connect-differential-packet/v2",
    profileId: profile.id,
    profileSha256: sha256File(profilePath),
    moduleSha256: profile.moduleSha256,
    positiveAreaResRef: profile.positiveAreaResRef,
    negativeAreaResRef: profile.negativeAreaResRef,
    rowId: profile.rowId,
    toolsetReadback: {
      verified: true,
      tilesetResRef: profile.tilesetResRef,
      definitionFingerprint: profile.definitionFingerprint,
      dimensions: { width: profile.areaWidth, height: profile.areaHeight },
      positive: { areaResRef: profile.positiveAreaResRef, source: profile.source, partner: profile.partner },
      negative: { areaResRef: profile.negativeAreaResRef, control: profile.negativeControl }
    },
    runtime: {
      verified: true,
      engine: "nwmain",
      positive: { crossedSharedEdge: true, reachedTarget: true, timedOut: false },
      negative: { crossedSharedEdge: false, reachedTarget: false, timedOut: false },
      failures: []
    },
    artifacts
  };
  const packetPath = path.join(root, "packet.json");
  const proofPath = path.join(root, "proof.json");
  writeJson(packetPath, packet);
  const validation = run(proofValidator, "--profile", profilePath, "--packet", packetPath, "--row", rowPath, "--out", proofPath);
  assert.equal(validation.status, 0, validation.stderr || validation.stdout);

  const nestedReplacementDirectory = path.join(sourceDirectory, "accepted-child");
  const nestedReplacement = run(controller,
    "accept-path-connect",
    "--out-directory", sourceDirectory,
    "--plan-id", planId,
    "--row-id", row.id,
    "--proof", proofPath,
    "--proof-sha256", sha256File(proofPath),
    "--replacement-directory", nestedReplacementDirectory
  );
  assert.notEqual(nestedReplacement.status, 0);
  assert.equal(fs.existsSync(nestedReplacementDirectory), false);

  const accepted = run(controller,
    "accept-path-connect",
    "--out-directory", sourceDirectory,
    "--plan-id", planId,
    "--row-id", row.id,
    "--proof", proofPath,
    "--proof-sha256", sha256File(proofPath),
    "--replacement-directory", replacementDirectory
  );
  assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
  const result = JSON.parse(accepted.stdout);
  assert.equal(result.status, "accepted");
  assert.equal(result.sourcePlanId, planId);
  assert.notEqual(result.planId, planId);
  assert.equal(result.rowId, row.id);
  assert.equal(result.pathConnectAcceptedRows, 1);
  assert.equal(fs.existsSync(path.join(replacementDirectory, "manifest.json")), true);
  const acceptedManifest = JSON.parse(fs.readFileSync(path.join(replacementDirectory, "manifest.json"), "utf8"));
  assert.equal(acceptedManifest.rows.find((candidate) => candidate.id === row.id).pathConnect.status, "accepted");
  assert.equal(acceptedManifest.summary.pathConnectAcceptedRows, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(sourceDirectory, "manifest.json"), "utf8")).rows.find((candidate) => candidate.id === row.id).pathConnect.status, "blocked");
  const acceptedCheckpoint = JSON.parse(fs.readFileSync(path.join(replacementDirectory, "checkpoint.json"), "utf8"));
  assert.equal(acceptedCheckpoint.planId, result.planId);
  assert.equal(acceptedCheckpoint.complete, true);
  assert.deepEqual(acceptedCheckpoint.capturedChunkIds, manifest.chunks.map((chunk) => chunk.id));
  assert.deepEqual(acceptedCheckpoint.runtimeBuildBinding, runtimeBuildBinding);

  const acceptedStatus = run(controller, "status", "--out-directory", replacementDirectory, "--plan-id", result.planId);
  assert.equal(acceptedStatus.status, 0, acceptedStatus.stderr || acceptedStatus.stdout);
  const status = JSON.parse(acceptedStatus.stdout);
  assert.equal(status.coverage.pathConnectDifferentialCoverage.complete, true);
  assert.equal(status.nextAction.kind, "goal_complete_candidate");

  fs.appendFileSync(artifacts.engineLog.path, "drift\n", "utf8");
  const driftedStatus = run(controller, "status", "--out-directory", replacementDirectory, "--plan-id", result.planId);
  assert.equal(driftedStatus.status, 0, driftedStatus.stderr || driftedStatus.stdout);
  const drifted = JSON.parse(driftedStatus.stdout);
  assert.equal(drifted.validation.status, "replan_required");
  assert.ok(drifted.validation.errors.some((error) => error.startsWith("PATH_CONNECT_RUNTIME_ARTIFACT_HASH_MISMATCH:engineLog:")));

  const tamperedProofPath = path.join(root, "tampered-proof.json");
  fs.copyFileSync(proofPath, tamperedProofPath);
  fs.appendFileSync(tamperedProofPath, " ", "utf8");
  const rejectedDirectory = path.join(root, "rejected-plan");
  const rejected = run(controller,
    "accept-path-connect",
    "--out-directory", sourceDirectory,
    "--plan-id", planId,
    "--row-id", row.id,
    "--proof", tamperedProofPath,
    "--proof-sha256", sha256File(proofPath),
    "--replacement-directory", rejectedDirectory
  );
  assert.notEqual(rejected.status, 0);
  assert.equal(fs.existsSync(rejectedDirectory), false);

  process.stdout.write("tile PathConnect matrix acceptance: PASS\n");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
