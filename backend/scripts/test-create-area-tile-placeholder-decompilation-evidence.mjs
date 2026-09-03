import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  validateAreaTilePlaceholderEvidenceArtifact
} from "./lib/area-tile-placeholder-evidence-profile.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "area-tile-decomp-evidence-"));
const runner = path.resolve(import.meta.dirname, "create-area-tile-placeholder-decompilation-evidence.mjs");
try {
  const evidenceRoot = path.join(root, "evidence-root");
  const packetRoot = path.join(evidenceRoot, "packet");
  const generation = path.join(packetRoot, "generation");
  const exportDirectory = path.join(packetRoot, "export");
  fs.mkdirSync(generation, { recursive: true });
  fs.mkdirSync(exportDirectory, { recursive: true });

  const outputBytes = "if (rowEligible == 0) {\n    return excluded;\n}\n";
  fs.writeFileSync(path.join(exportDirectory, "target.c"), outputBytes);
  const functionRecordsBytes = `${JSON.stringify({
    sessionId: "ghidra-session-producer01",
    functionId: "0x005a7fc8:FUN_TARGET",
    address: "0x005a7fc8",
    name: "FUN_TARGET",
    decompileStatus: "success",
    outputPath: "target.c",
    outputSha256: sha256(outputBytes)
  })}\n`;
  fs.writeFileSync(path.join(generation, "function-records.jsonl"), functionRecordsBytes);
  const binarySha256 = "4".repeat(64);
  const lineageDigest = "5".repeat(64);
  const packetPath = path.join(packetRoot, "producer.json");
  const packetBytes = `${JSON.stringify({
    schemaVersion: "aurora-decompilation-lineage/v2",
    packetType: "producer",
    authoritativeDecompilationClaim: false,
    portableRecordDigestSha256: lineageDigest,
    inputBinary: { file: { sha256: binarySha256 } },
    generation: {
      functionRecords: {
        file: {
          portablePath: "generation/function-records.jsonl",
          sha256: sha256(functionRecordsBytes)
        }
      }
    },
    export: { directoryPortablePath: "export" }
  })}\n`;
  fs.writeFileSync(packetPath, packetBytes);
  const validationPath = path.join(packetRoot, "validator.json");
  const validationBytes = `${JSON.stringify({
    schemaVersion: "aurora-decompilation-lineage-validation/v2",
    packetType: "validator-result",
    lineageComplete: true,
    authoritativeDecompilationClaim: true,
    inputPacket: "producer.json",
    producerPortableRecordDigestSha256: lineageDigest,
    recomputedProducerPortableRecordDigestSha256: lineageDigest,
    diagnostics: []
  })}\n`;
  fs.writeFileSync(validationPath, validationBytes);
  const proposalPath = path.join(root, "proposal.json");
  const proposalBytes = `${JSON.stringify({
    schema: "aurora-area-tile-placeholder-decompilation-proposal/v1",
    certifiedRowIds: ["opaque01:7"],
    functionBindings: [{
      address: "0x005a7fc8",
      outputSha256: sha256(outputBytes),
      lineStart: 1,
      lineEnd: 2,
      finding: "The cited generic eligibility branch excludes this reviewed raw SET row."
    }]
  })}\n`;
  fs.writeFileSync(proposalPath, proposalBytes);

  const draftPath = path.join(root, "draft.json");
  const drafted = run([
    "draft",
    "--evidence-root", evidenceRoot,
    "--packet-root", packetRoot,
    "--packet", packetPath,
    "--packet-sha256", sha256(packetBytes),
    "--validation", validationPath,
    "--validation-sha256", sha256(validationBytes),
    "--proposal", proposalPath,
    "--proposal-sha256", sha256(proposalBytes),
    "--evidence-id", "decomp-proof",
    "--out", draftPath
  ]);
  assert.equal(drafted.status, 0, drafted.stderr);
  const draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));
  assert.equal(draft.schema, "aurora-area-tile-placeholder-decompilation-evidence-draft/v1");
  assert.deepEqual(draft.subject.certifiedRowIds, ["opaque01:7"]);
  assert.equal(draft.subject.authority.functionBindings[0].outputSha256, sha256(outputBytes));

  const reviewPath = path.join(evidenceRoot, "semantic-review.json");
  const reviewBytes = `${JSON.stringify({
    schema: "aurora-area-tile-placeholder-decompilation-semantic-review/v1",
    evidenceId: "decomp-proof",
    authoritySubjectSha256: draft.authoritySubjectSha256,
    certifiedRowIds: ["opaque01:7"],
    status: "verified",
    reviewer: "semantic-reviewer",
    reviewedAt: "2026-09-01T20:00:00.000Z",
    independentReview: true,
    notes: "Exact cited output and generic raw-row eligibility meaning independently reviewed."
  })}\n`;
  fs.writeFileSync(reviewPath, reviewBytes);
  const artifactPath = path.join(evidenceRoot, "decomp-proof.json");
  const finalized = run([
    "finalize",
    "--evidence-root", evidenceRoot,
    "--draft", draftPath,
    "--draft-sha256", sha256(fs.readFileSync(draftPath)),
    "--review", reviewPath,
    "--review-sha256", sha256(reviewBytes),
    "--out", artifactPath
  ]);
  assert.equal(finalized.status, 0, finalized.stderr);
  const artifactBytes = fs.readFileSync(artifactPath);
  const artifact = JSON.parse(artifactBytes);
  assert.equal(artifact.schema, "aurora-area-tile-placeholder-evidence/v2");
  const validated = validateAreaTilePlaceholderEvidenceArtifact({
    evidenceRoot,
    evidence: {
      evidenceId: "decomp-proof",
      kind: "aurora_decompilation",
      artifactPath: "decomp-proof.json",
      artifactSha256: sha256(artifactBytes)
    }
  });
  assert.deepEqual(validated.certifiedRowIds, ["opaque01:7"]);

  const badReviewPath = path.join(evidenceRoot, "bad-review.json");
  const badReviewBytes = reviewBytes.replace(draft.authoritySubjectSha256, "6".repeat(64));
  fs.writeFileSync(badReviewPath, badReviewBytes);
  const rejected = run([
    "finalize",
    "--evidence-root", evidenceRoot,
    "--draft", draftPath,
    "--draft-sha256", sha256(fs.readFileSync(draftPath)),
    "--review", badReviewPath,
    "--review-sha256", sha256(badReviewBytes),
    "--out", path.join(evidenceRoot, "rejected.json")
  ]);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /semantic review is invalid/u);

  process.stdout.write("create Area tile placeholder decompilation evidence: PASS\n");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

function run(args) {
  return spawnSync(process.execPath, [runner, ...args], { encoding: "utf8" });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
