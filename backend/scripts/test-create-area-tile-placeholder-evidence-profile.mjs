import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const runner = fileURLToPath(new URL("./create-area-tile-placeholder-evidence-profile.mjs", import.meta.url));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-create-placeholder-profile-"));

function run(args) {
  return spawnSync(process.execPath, [runner, ...args], { encoding: "utf8" });
}

try {
  const sourceRoot = path.join(root, "source");
  const evidenceRoot = path.join(root, "proof");
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(path.join(evidenceRoot, "evidence"), { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "opaque01.set"), [
    "[GENERAL]",
    "Name=Opaque",
    "[TILE7]",
    "Model=opaque_model",
    "ImageMap2D=opaque_map",
    "Orientation=0",
    ""
  ].join("\n"));
  const framePath = path.join(evidenceRoot, "evidence", "frame.json");
  const frameBytes = '{"status":"captured"}\n';
  fs.writeFileSync(framePath, frameBytes);
  const artifactPath = path.join(evidenceRoot, "evidence", "native.json");
  const artifactBytes = `${JSON.stringify({
    schema: "aurora-area-tile-placeholder-evidence/v1",
    evidenceId: "native-proof",
    kind: "toolset_native",
    verdict: "verified",
    certifiedRowIds: ["opaque01:7"],
    authority: {
      binarySha256: "4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24",
      proofContractVersion: "aurora-toolset-prove/v1",
      settledState: {
        status: "verified",
        unexpectedFailedTileCount: 0,
        bridgeTileCount: 0
      },
      artifactBindings: [{
        artifactPath: "evidence/frame.json",
        artifactSha256: sha256(frameBytes)
      }]
    }
  })}\n`;
  fs.writeFileSync(artifactPath, artifactBytes);
  const evidenceIndexPath = path.join(evidenceRoot, "evidence-index.json");
  const evidenceIndexBytes = `${JSON.stringify({
    schema: "aurora-area-tile-placeholder-evidence-index/v1",
    evidence: [{
      evidenceId: "native-proof",
      kind: "toolset_native",
      artifactPath: "evidence/native.json",
      artifactSha256: sha256(artifactBytes)
    }]
  })}\n`;
  fs.writeFileSync(evidenceIndexPath, evidenceIndexBytes);
  const draftPath = path.join(evidenceRoot, "draft.json");
  const drafted = run([
    "draft",
    "--source-root", sourceRoot,
    "--evidence-root", evidenceRoot,
    "--evidence-index", evidenceIndexPath,
    "--evidence-index-sha256", sha256(evidenceIndexBytes),
    "--profile-id", "opaque-profile-v1",
    "--generated-at", "2026-09-01T15:00:00.000Z",
    "--out", draftPath
  ]);
  assert.equal(drafted.status, 0, drafted.stderr);
  const draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));
  assert.deepEqual(draft.subject.rows, [{
    tilesetResRef: "opaque01",
    tileId: 7,
    setSha256: sha256(fs.readFileSync(path.join(sourceRoot, "opaque01.set"))),
    modelResRef: "opaque_model",
    status: "intentional_placeholder",
    evidenceIds: ["native-proof"]
  }]);
  const reviewPath = path.join(evidenceRoot, "evidence", "review.json");
  const reviewBytes = `${JSON.stringify({
    schema: "aurora-area-tile-placeholder-evidence-profile-review/v1",
    profileId: "opaque-profile-v1",
    subjectSha256: draft.subjectSha256,
    status: "verified",
    reviewer: "independent-reviewer",
    reviewedAt: "2026-09-01T15:10:00.000Z",
    independentReview: true,
    notes: "Exact native evidence and generated row binding independently reviewed."
  })}\n`;
  fs.writeFileSync(reviewPath, reviewBytes);
  const profilePath = path.join(evidenceRoot, "profile.json");
  const finalized = run([
    "finalize",
    "--evidence-root", evidenceRoot,
    "--draft", draftPath,
    "--draft-sha256", sha256(fs.readFileSync(draftPath)),
    "--review", reviewPath,
    "--review-sha256", sha256(reviewBytes),
    "--out", profilePath
  ]);
  assert.equal(finalized.status, 0, finalized.stderr);
  const result = JSON.parse(finalized.stdout);
  assert.equal(result.certifiedRowCount, 1);
  assert.equal(result.profileSha256, sha256(fs.readFileSync(profilePath)));

  const invalidIndexPath = path.join(evidenceRoot, "invalid-index.json");
  const invalidArtifactBytes = artifactBytes.replace("opaque01:7", "opaque01:99");
  const invalidArtifactPath = path.join(evidenceRoot, "evidence", "invalid-native.json");
  fs.writeFileSync(invalidArtifactPath, invalidArtifactBytes);
  const invalidIndexBytes = `${JSON.stringify({
    schema: "aurora-area-tile-placeholder-evidence-index/v1",
    evidence: [{
      evidenceId: "native-proof",
      kind: "toolset_native",
      artifactPath: "evidence/invalid-native.json",
      artifactSha256: sha256(invalidArtifactBytes)
    }]
  })}\n`;
  fs.writeFileSync(invalidIndexPath, invalidIndexBytes);
  const rejected = run([
    "draft",
    "--source-root", sourceRoot,
    "--evidence-root", evidenceRoot,
    "--evidence-index", invalidIndexPath,
    "--evidence-index-sha256", sha256(invalidIndexBytes),
    "--profile-id", "invalid-profile-v1",
    "--generated-at", "2026-09-01T15:00:00.000Z",
    "--out", path.join(evidenceRoot, "invalid-draft.json")
  ]);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /absent from the selected SET corpus/u);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

process.stdout.write("create Area tile placeholder evidence profile: PASS\n");
