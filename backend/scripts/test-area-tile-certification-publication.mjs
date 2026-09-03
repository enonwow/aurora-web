#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  loadAreaTileCertificationEvidence,
  writeCompactJsonAtomic,
} from "./lib/area-tile-certification-publication-evidence.mjs";
import { buildMatrixRuntimeBuildBinding } from "./lib/tile-add-connect-runtime-build-profile.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value), "utf8");
  return sha256(fs.readFileSync(filePath));
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "area-tile-cert-publication-"));
  const catalogDirectory = path.join(root, "catalog");
  const matrixDirectory = path.join(root, "matrix");
  const chunksDirectory = path.join(matrixDirectory, "chunks");
  const capturesDirectory = path.join(matrixDirectory, "captures");
  const inventoryPath = path.join(root, "inventory", "summary.json");
  const modelInventoryPath = path.join(root, "inventory", "tiles.json");
  const inventorySha256 = writeJson(inventoryPath, { schemaVersion: 1, rows: 2 });
  const modelInventorySha256 = writeJson(modelInventoryPath, [
    { tilesetResRef: "tms01", tileId: 0 },
    { tilesetResRef: "tms01", tileId: 1 },
  ]);
  const sourceSha256 = "a".repeat(64);
  const definition = {
    schemaVersion: 1,
    tilesetResRef: "tms01",
    name: "Test",
    unlocalizedName: "Test",
    fingerprint: sourceSha256,
    defaults: {},
    terrainTypes: [],
    crosserTypes: [],
    transitionRules: [],
    tiles: [
      { tileId: 0, modelResRef: "tms01_a01_01", modelSourceStatus: "source_resolved" },
      { tileId: 1, modelResRef: "", modelSourceStatus: "intentional_placeholder" },
    ],
    groups: [],
    diagnostics: [],
  };
  const definitionPath = path.join(catalogDirectory, "definitions", "tms01.json");
  const definitionSha256 = writeJson(definitionPath, definition);
  const catalog = {
    schema: "aurora-tileset-definition-catalog/v2",
    generatedAt: "2026-08-21T12:00:00.000Z",
    sourceInventory: {
      path: path.relative(root, inventoryPath).replaceAll("\\", "/"),
      sha256: inventorySha256,
      schemaVersion: 1,
      generatedAt: "2026-08-21T11:00:00.000Z",
    },
    modelSourceInventory: {
      path: path.relative(root, modelInventoryPath).replaceAll("\\", "/"),
      sha256: modelInventorySha256,
      format: "aurora-all-area-tiles/tiles-json-array-v1",
      rowCount: 2,
    },
    sourceRoot: "fixture",
    summary: {
      tilesetCount: 1,
      totalTileCount: 2,
      totalGroupCount: 0,
      totalDiagnosticCount: 0,
      sourceResolvedTileCount: 1,
      sourceMissingTileCount: 0,
      intentionalPlaceholderTileCount: 1,
      invalidMissingModelFieldTileCount: 0,
    },
    entries: [{
      tilesetResRef: "tms01",
      sourcePath: "fixture/tms01.set",
      sourceKey: "modules/current/tms01.set",
      sourceSha256,
      definitionPath: "definitions/tms01.json",
      definitionSha256,
      tileCount: 2,
      groupCount: 0,
      diagnosticCount: 0,
    }],
  };
  const catalogPath = path.join(catalogDirectory, "catalog.json");
  const catalogSha256 = writeJson(catalogPath, catalog);

  const contractFingerprint = "c".repeat(64);
  const definitionFingerprint = "d".repeat(64);
  const runtimeDefinitionFingerprint = "e".repeat(64);
  const runtimeSourceDigest = "1".repeat(64);
  const chunkId = "tms01-chunk-0001";
  const runtimeProfile = {
    schema: "aurora-tile-add-connect-runtime-build-profile/v1",
    profileId: "tile-certification-publication-v8",
    createdAt: "2026-08-21T12:00:00.000Z",
    frontend: {
      commit: `worktree-sha256-${runtimeSourceDigest}`,
      imageDigest: `sha256:${runtimeSourceDigest}`,
      builtAt: "2026-08-21T11:59:00.000Z",
      baseUrl: "http://127.0.0.1:5173",
    },
    backend: {
      commit: `worktree-sha256-${runtimeSourceDigest}`,
      imageDigest: `sha256:${runtimeSourceDigest}`,
      builtAt: "2026-08-21T11:59:00.000Z",
      baseUrl: "http://127.0.0.1:3000",
      contractVersion: "1.0.0",
      vfxRuntimeRevision: "publication-test-runtime",
    },
  };
  const runtimeProfilePath = path.join(matrixDirectory, "runtime-build-profile.json");
  const runtimeProfileSha256 = writeJson(runtimeProfilePath, runtimeProfile);
  const runtimeBuildBinding = buildMatrixRuntimeBuildBinding({
    profile: runtimeProfile,
    profilePath: runtimeProfilePath,
    profileSha256: runtimeProfileSha256,
  });
  const manifestPath = path.join(matrixDirectory, "manifest.json");
  const planId = writeJson(manifestPath, {
    schema: "aurora-tile-add-connect-matrix/v2",
    contract: {
      revision: "path-node-aware-v8",
      fingerprint: contractFingerprint,
    },
    runtimeBuildBinding,
    generatedAt: "2026-08-21T12:00:00.000Z",
    summary: { tilesetCount: 1, totalRows: 2 },
    rows: [],
    chunks: [],
  });
  writeJson(path.join(chunksDirectory, `${chunkId}.json`), {
    schema: "aurora-tile-add-connect-matrix-chunk/v1",
    plannedAt: "2026-08-21T12:01:00.000Z",
    kind: "tile",
    id: chunkId,
    tilesetResRef: "tms01",
    sourceKey: "modules/current/tms01.set",
    etag: sourceSha256,
    definitionFingerprint,
    runtimeDefinitionFingerprint,
    width: 2,
    height: 2,
    caseCount: 1,
    cases: [{
      rowId: "tms01:0",
      cells: [{ role: "source", row: 0, col: 0, tileId: 0 }],
    }],
  });

  const attemptId = `${chunkId}.attempt-0001`;
  const suffixes = {
    frame: ".frame.json",
    state: ".state.json",
    canvas: ".canvas.png",
    page: ".png",
    lifecycle: ".lifecycle.jsonl",
  };
  const artifactSha256 = {};
  for (const [kind, suffix] of Object.entries(suffixes)) {
    const artifactPath = path.join(capturesDirectory, `${attemptId}${suffix}`);
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    if (kind === "frame") {
      artifactSha256[kind] = writeJson(artifactPath, {
        status: "captured",
        runtimeBuildProof: {
          schema: "aurora-tile-add-connect-runtime-build-proof/v1",
          status: "verified",
          binding: runtimeBuildBinding,
          preflightObservations: {
            frontend: structuredClone(runtimeProfile.frontend),
            backendProxy: {
              ...structuredClone(runtimeProfile.backend),
              processStartedAt: "2026-08-21T12:01:00.000Z",
            },
            backendDirect: {
              ...structuredClone(runtimeProfile.backend),
              processStartedAt: "2026-08-21T12:01:00.000Z",
            },
          },
          observations: {
            frontend: structuredClone(runtimeProfile.frontend),
            backendProxy: {
              ...structuredClone(runtimeProfile.backend),
              processStartedAt: "2026-08-21T12:01:00.000Z",
            },
            backendDirect: {
              ...structuredClone(runtimeProfile.backend),
              processStartedAt: "2026-08-21T12:01:00.000Z",
            },
          },
          sourceIdentity: {
            preflight: {
              schema: "aurora-tile-add-connect-runtime-source-identity/v1",
              algorithm: "sha256-canonical-sorted-path-size-file-sha256-v1",
              runtimeDigest: runtimeSourceDigest,
              fileCount: 100,
              totalBytes: 1000,
              vfxRuntimeRevision: runtimeProfile.backend.vfxRuntimeRevision,
            },
            postCapture: {
              schema: "aurora-tile-add-connect-runtime-source-identity/v1",
              algorithm: "sha256-canonical-sorted-path-size-file-sha256-v1",
              runtimeDigest: runtimeSourceDigest,
              fileCount: 100,
              totalBytes: 1000,
              vfxRuntimeRevision: runtimeProfile.backend.vfxRuntimeRevision,
            },
          },
          errors: [],
        },
      });
    } else {
      fs.writeFileSync(artifactPath, `${kind}-proof`, "utf8");
      artifactSha256[kind] = sha256(fs.readFileSync(artifactPath));
    }
  }
  const review = {
    schema: "aurora-tile-add-connect-matrix-visual-review/v1",
    reviewedAt: "2026-08-21T12:02:00.000Z",
    reviewerIdentity: "independent-reviewer",
    auroraToolsetProveContractVersion: "1.0.15",
    verdict: "verified",
    planBinding: {
      planId,
      manifestSchema: "aurora-tile-add-connect-matrix/v2",
      contractRevision: "path-node-aware-v8",
      contractFingerprint,
      runtimeBuildBinding,
    },
    runtimeBuildBinding,
    chunk: { id: chunkId, definitionFingerprint, runtimeDefinitionFingerprint },
    pendingCapture: { attemptId, artifacts: artifactSha256 },
    checks: {
      requestedAreaLegible: true,
      declaredFixtureLayoutVisible: true,
      noUnexpectedBlankFailedBridgeOrPlaceholderTiles: true,
      cameraFramingAccepted: true,
    },
    visualAudit: {},
    pathConnect: {
      accepted: false,
      status: "missing",
      note: "Add/render only.",
    },
  };
  const reviewPath = path.join(capturesDirectory, `${attemptId}.visual-review.json`);
  const reviewSha256 = writeJson(reviewPath, review);
  const checkpoint = {
    schema: "aurora-tile-add-connect-matrix-checkpoint/v2",
    planId,
    planDirectory: matrixDirectory,
    manifestSha256: planId,
    manifestSchema: "aurora-tile-add-connect-matrix/v2",
    contractRevision: "path-node-aware-v8",
    contractFingerprint,
    runtimeBuildBinding,
    replacesPlanId: null,
    nextChunkIndex: 1,
    capturedChunkIds: [chunkId],
    complete: false,
    updatedAt: "2026-08-21T12:03:00.000Z",
    acceptedVisualReviews: [{
      chunkId,
      attemptId,
      visualReviewPath: reviewPath,
      visualReviewSha256: reviewSha256,
      reviewerIdentity: "independent-reviewer",
      reviewedAt: review.reviewedAt,
      acceptedAt: "2026-08-21T12:03:00.000Z",
      runtimeBuildBinding,
      artifactSha256,
    }],
  };
  const checkpointPath = path.join(matrixDirectory, "checkpoint.json");
  const checkpointSha256 = writeJson(checkpointPath, checkpoint);
  const matrixStatus = {
    schema: "aurora-tile-add-connect-matrix-status/v2",
    planned: true,
    planBinding: {
      planId,
      outDirectory: matrixDirectory,
      manifestSchema: "aurora-tile-add-connect-matrix/v2",
      contractRevision: "path-node-aware-v8",
      contractFingerprint,
      runtimeBuildBinding,
    },
    validation: { status: "ready", errors: [] },
    summary: { tilesetCount: 1, totalRows: 2 },
    checkpoint: { nextChunkIndex: 1, capturedChunkCount: 1, totalChunks: 2, complete: false },
    coverage: { addRenderCoverage: { totalRows: 2, capturedRows: 1 } },
  };
  return {
    root,
    catalogPath,
    catalogSha256,
    matrixDirectory,
    planId,
    checkpointSha256,
    reviewPath,
    matrixStatus,
  };
}

function load(fixture) {
  return loadAreaTileCertificationEvidence({
    repoRoot: fixture.root,
    catalogPath: fixture.catalogPath,
    catalogSha256: fixture.catalogSha256,
    matrixDirectory: fixture.matrixDirectory,
    matrixPlanId: fixture.planId,
    checkpointSha256: fixture.checkpointSha256,
    matrixStatus: fixture.matrixStatus,
    expectedTilesetCount: 1,
    expectedRowCount: 2,
  });
}

function appendOverlappingAcceptedReview(fixture) {
  const checkpointPath = path.join(fixture.matrixDirectory, "checkpoint.json");
  const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
  const firstChunkId = checkpoint.capturedChunkIds[0];
  const firstChunkPath = path.join(fixture.matrixDirectory, "chunks", `${firstChunkId}.json`);
  const chunk = JSON.parse(fs.readFileSync(firstChunkPath, "utf8"));
  const chunkId = "tms01-chunk-0002";
  chunk.id = chunkId;
  writeJson(path.join(fixture.matrixDirectory, "chunks", `${chunkId}.json`), chunk);

  const attemptId = `${chunkId}.attempt-0001`;
  const suffixes = {
    frame: ".frame.json",
    state: ".state.json",
    canvas: ".canvas.png",
    page: ".png",
    lifecycle: ".lifecycle.jsonl",
  };
  const artifactSha256 = {};
  for (const [kind, suffix] of Object.entries(suffixes)) {
    const artifactPath = path.join(fixture.matrixDirectory, "captures", `${attemptId}${suffix}`);
    if (kind === "frame") {
      fs.copyFileSync(
        path.join(
          fixture.matrixDirectory,
          "captures",
          `${checkpoint.acceptedVisualReviews[0].attemptId}${suffix}`,
        ),
        artifactPath,
      );
    } else {
      fs.writeFileSync(artifactPath, `${kind}-overlap-proof`, "utf8");
    }
    artifactSha256[kind] = sha256(fs.readFileSync(artifactPath));
  }
  const firstReview = JSON.parse(fs.readFileSync(checkpoint.acceptedVisualReviews[0].visualReviewPath, "utf8"));
  const review = {
    ...firstReview,
    chunk: { ...firstReview.chunk, id: chunkId },
    pendingCapture: { attemptId, artifacts: artifactSha256 },
  };
  const reviewPath = path.join(fixture.matrixDirectory, "captures", `${attemptId}.visual-review.json`);
  const reviewSha256 = writeJson(reviewPath, review);
  checkpoint.nextChunkIndex = 2;
  checkpoint.capturedChunkIds.push(chunkId);
  checkpoint.acceptedVisualReviews.push({
    chunkId,
    attemptId,
    visualReviewPath: reviewPath,
    visualReviewSha256: reviewSha256,
    reviewerIdentity: review.reviewerIdentity,
    reviewedAt: review.reviewedAt,
    acceptedAt: "2026-08-21T12:04:00.000Z",
    runtimeBuildBinding: checkpoint.runtimeBuildBinding,
    artifactSha256,
  });
  fixture.checkpointSha256 = writeJson(checkpointPath, checkpoint);
  fixture.matrixStatus.checkpoint.nextChunkIndex = 2;
  fixture.matrixStatus.checkpoint.capturedChunkCount = 2;
  fixture.matrixStatus.checkpoint.totalChunks = 3;
}

{
  const fixture = createFixture();
  try {
    const evidence = load(fixture);
    assert.deepEqual(evidence.catalogRows, [
      { tilesetResRef: "tms01", tileId: 0, modelSourceStatus: "source_resolved" },
      { tilesetResRef: "tms01", tileId: 1, modelSourceStatus: "intentional_placeholder" },
    ]);
    assert.deepEqual(evidence.acceptedAddRenderSubjects, ["tms01:0"]);
    assert.equal(evidence.binding.matrixPlanId, fixture.planId);
    assert.equal(
      evidence.binding.runtimeBuildProfileSha256,
      fixture.matrixStatus.planBinding.runtimeBuildBinding.profile.sha256,
    );
    assert.equal(evidence.diagnostics.acceptedReviewCount, 1);
    assert.equal(evidence.diagnostics.acceptedAddRenderRowCount, 1);

    const outputPath = path.join(fixture.root, "published", "report.json");
    const written = writeCompactJsonAtomic(outputPath, { proof: "ok" }, 1024);
    assert.equal(fs.readFileSync(outputPath, "utf8"), '{"proof":"ok"}');
    assert.equal(written.bytes, 14);
    assert.equal(written.sha256, sha256(Buffer.from('{"proof":"ok"}')));
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

{
  const fixture = createFixture();
  try {
    const checkpointPath = path.join(fixture.matrixDirectory, "checkpoint.json");
    const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
    const accepted = checkpoint.acceptedVisualReviews[0];
    const framePath = path.join(
      fixture.matrixDirectory,
      "captures",
      `${accepted.attemptId}.frame.json`,
    );
    const frame = JSON.parse(fs.readFileSync(framePath, "utf8"));
    frame.runtimeBuildProof.observations.backendProxy.processStartedAt =
      "2026-08-21T12:02:00.000Z";
    frame.runtimeBuildProof.observations.backendDirect.processStartedAt =
      "2026-08-21T12:02:00.000Z";
    const frameSha256 = writeJson(framePath, frame);
    const review = JSON.parse(fs.readFileSync(fixture.reviewPath, "utf8"));
    review.pendingCapture.artifacts.frame = frameSha256;
    accepted.artifactSha256.frame = frameSha256;
    accepted.visualReviewSha256 = writeJson(fixture.reviewPath, review);
    fixture.checkpointSha256 = writeJson(checkpointPath, checkpoint);
    assert.throws(
      () => load(fixture),
      (error) => error?.code === "runtime_build_frame_observation_mismatch",
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

{
  const fixture = createFixture();
  try {
    const checkpointPath = path.join(fixture.matrixDirectory, "checkpoint.json");
    const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
    const accepted = checkpoint.acceptedVisualReviews[0];
    const framePath = path.join(
      fixture.matrixDirectory,
      "captures",
      `${accepted.attemptId}.frame.json`,
    );
    const frame = JSON.parse(fs.readFileSync(framePath, "utf8"));
    frame.runtimeBuildProof.sourceIdentity.postCapture.runtimeDigest = "f".repeat(64);
    const frameSha256 = writeJson(framePath, frame);
    const review = JSON.parse(fs.readFileSync(fixture.reviewPath, "utf8"));
    review.pendingCapture.artifacts.frame = frameSha256;
    accepted.artifactSha256.frame = frameSha256;
    accepted.visualReviewSha256 = writeJson(fixture.reviewPath, review);
    fixture.checkpointSha256 = writeJson(checkpointPath, checkpoint);
    assert.throws(
      () => load(fixture),
      (error) => error?.code === "runtime_source_identity_mismatch",
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

{
  const fixture = createFixture();
  try {
    const checkpointPath = path.join(fixture.matrixDirectory, "checkpoint.json");
    const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
    checkpoint.acceptedVisualReviews[0].runtimeBuildBinding.bindingSha256 = "0".repeat(64);
    fixture.checkpointSha256 = writeJson(checkpointPath, checkpoint);
    assert.throws(
      () => load(fixture),
      (error) => error?.code === "runtime_build_accepted_review_binding_mismatch",
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

{
  const fixture = createFixture();
  try {
    appendOverlappingAcceptedReview(fixture);
    const evidence = load(fixture);
    assert.deepEqual(evidence.acceptedAddRenderSubjects, ["tms01:0"]);
    assert.equal(evidence.diagnostics.acceptedReviewCount, 2);
    assert.equal(evidence.diagnostics.acceptedAddRenderEvidenceReferenceCount, 2);
    assert.equal(evidence.diagnostics.duplicateAddRenderEvidenceReferenceCount, 1);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

{
  const fixture = createFixture();
  try {
    fs.appendFileSync(fixture.reviewPath, " ", "utf8");
    assert.throws(
      () => load(fixture),
      (error) => error?.code === "visual_review_sha256_mismatch",
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

{
  const fixture = createFixture();
  try {
    const checkpointPath = path.join(fixture.matrixDirectory, "checkpoint.json");
    const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
    checkpoint.acceptedVisualReviews[0].visualReviewPath = path.join(fixture.root, "outside.json");
    fixture.checkpointSha256 = writeJson(checkpointPath, checkpoint);
    assert.throws(
      () => load(fixture),
      (error) => error?.code === "visual_review_path_escape",
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
}

process.stdout.write("area tile-certification publication evidence tests passed\n");
