import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const validator = path.join(scriptDirectory, "validate-aurora-tile-path-connect-differential.mjs");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-path-connect-validator-"));
const hex = (character) => character.repeat(64);
const sha256 = (filePath) => createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const writeJson = (filePath, value) => fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");

try {
  const row = {
    schema: "aurora-tile-add-connect-matrix-row/v1",
    id: "tms01:7",
    tilesetResRef: "tms01",
    tileId: 7,
    definitionFingerprint: hex("d"),
    fixture: { kind: "tile", chunkId: "chunk", caseIndex: 0, width: 4, height: 4, cells: [
      { role: "source", row: 0, col: 0, tileId: 7 },
      { role: "partner", row: 0, col: 1, tileId: 8 }
    ] },
    connect: { status: "planned", partnerTileId: 8 },
    pathConnect: {
      status: "blocked",
      sourcePathNode: "A",
      partnerPathNode: "a",
      reference: {
        status: "reference-match",
        source: { orientation: 0 },
        partner: { orientation: 0 },
        sourceEdge: "right",
        partnerEdge: "left",
        matchingLanes: [0]
      },
      negativeControl: {
        referenceStatus: "reference-mismatch",
        source: { tileId: 7, pathNode: "A", orientation: 0, edge: "right", row: 0, col: 0 },
        partner: { tileId: 9, pathNode: "L", orientation: 0, edge: "left", row: 0, col: 1 },
        sourceLanes: [0],
        partnerLanes: [-4, 0, 4],
        matchingLanes: [0],
        sourceOnlyLanes: [],
        partnerOnlyLanes: [-4, 4],
        sourceRegionsByLane: [{ lane: 0, regions: [0] }],
        partnerRegionsByLane: [{ lane: -4, regions: [2] }, { lane: 0, regions: [1] }, { lane: 4, regions: [0] }],
        reason: "path-node-reference-mismatch"
      }
    }
  };
  const profile = {
    schema: "aurora-tile-path-connect-profile/v2",
    id: "tms01-7-right-8-path-connect-v2",
    approved: true,
    moduleSha256: hex("a"),
    positiveAreaResRef: "pc_tms01_pos",
    negativeAreaResRef: "pc_tms01_neg",
    areaWidth: row.fixture.width,
    areaHeight: row.fixture.height,
    tilesetResRef: "tms01",
    definitionFingerprint: hex("d"),
    rowId: "tms01:7",
    source: { tileId: 7, pathNode: "A", orientation: 0, edge: "right", row: 0, col: 0 },
    partner: { tileId: 8, pathNode: "a", orientation: 0, edge: "left", row: 0, col: 1 },
    matchingLanes: [0],
    negativeControl: structuredClone(row.pathConnect.negativeControl)
  };
  const rowPath = path.join(root, "row.json");
  const profilePath = path.join(root, "profile.json");
  const proofPath = path.join(root, "proof.json");
  writeJson(rowPath, row);
  writeJson(profilePath, profile);
  const profileSha256 = sha256(profilePath);

  const artifacts = {};
  for (const [index, kind] of ["toolsetReadback", "positiveRuntime", "negativeRuntime", "engineLog"].entries()) {
    const artifactPath = path.join(root, `${kind}.txt`);
    fs.writeFileSync(artifactPath, `${kind}:${index}\n`, "utf8");
    artifacts[kind] = { path: artifactPath, sha256: sha256(artifactPath) };
  }
  const packet = {
    schema: "aurora-tile-path-connect-differential-packet/v2",
    profileId: profile.id,
    profileSha256,
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
  writeJson(packetPath, packet);

  const accepted = spawnSync(process.execPath, [validator,
    "--profile", profilePath,
    "--packet", packetPath,
    "--row", rowPath,
    "--out", proofPath
  ], { encoding: "utf8" });
  assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
  const acceptedResult = JSON.parse(accepted.stdout);
  assert.equal(acceptedResult.ok, true);
  assert.equal(acceptedResult.status, "verified");
  assert.equal(acceptedResult.proofPath, proofPath);
  const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  assert.equal(proof.immutableToolsetNwnProfile.profileSha256, profileSha256);
  assert.equal(proof.crossEdgeDifferential.artifactSha256, sha256(packetPath));
  assert.equal(proof.binding.rowId, row.id);

  fs.appendFileSync(artifacts.engineLog.path, "tampered\n", "utf8");
  const rejectedPath = path.join(root, "rejected-proof.json");
  const rejected = spawnSync(process.execPath, [validator,
    "--profile", profilePath,
    "--packet", packetPath,
    "--row", rowPath,
    "--out", rejectedPath
  ], { encoding: "utf8" });
  assert.notEqual(rejected.status, 0);
  const rejectedResult = JSON.parse(rejected.stdout);
  assert.equal(rejectedResult.ok, false);
  assert.ok(rejectedResult.failures.includes("PATH_CONNECT_ARTIFACT_SHA256_MISMATCH:engineLog"));
  assert.equal(fs.existsSync(rejectedPath), false);

  process.stdout.write("tile PathConnect differential validator: PASS\n");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
