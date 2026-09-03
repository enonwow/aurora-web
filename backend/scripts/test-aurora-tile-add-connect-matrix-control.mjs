import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildMatrixManifest } from "./lib/tile-add-connect-matrix.mjs";
import { buildPathConnectDifferentialProof } from "./lib/tile-path-connect-differential-proof.mjs";
import { buildMatrixRuntimeBuildBinding } from "./lib/tile-add-connect-runtime-build-profile.mjs";
import { computeTileAddConnectRuntimeSourceIdentity } from "./lib/tile-add-connect-runtime-source-identity.mjs";
import { buildPendingMatrixCapture } from "./aurora-tile-add-connect-matrix.mjs";

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const controllerPath = path.join(backendDirectory, "scripts", "aurora-tile-add-connect-matrix.mjs");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-tile-matrix-control-"));

const tileset = {
  tilesetResRef: "control01",
  definition: {
    tiles: [
      {
        tileId: 0,
        modelResRef: "control_source",
        pathNode: "A",
        terrain: { topRight: "grass", bottomRight: "grass" },
        crossers: { right: "road" }
      },
      {
        tileId: 1,
        modelResRef: "control_partner",
        pathNode: "a",
        terrain: { topLeft: "grass", bottomLeft: "grass" },
        crossers: { left: "road" }
      },
      {
        tileId: 2,
        modelResRef: "control_negative",
        pathNode: "L",
        terrain: { topLeft: "grass", bottomLeft: "grass" },
        crossers: { left: "road" }
      }
    ]
  }
};

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function fileSha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createRuntimeBuildBinding(directory, runtimeSourceIdentity = null) {
  const runtimeDigest = runtimeSourceIdentity?.runtimeDigest ?? null;
  const commit = runtimeDigest
    ? `worktree-sha256-${runtimeDigest}`
    : "matrix-control-build";
  const frontendImageDigest = runtimeDigest
    ? `sha256:${runtimeDigest}`
    : `sha256:${"a".repeat(64)}`;
  const backendImageDigest = runtimeDigest
    ? `sha256:${runtimeDigest}`
    : `sha256:${"b".repeat(64)}`;
  const profile = {
    schema: "aurora-tile-add-connect-runtime-build-profile/v1",
    profileId: "area-tiles-matrix-control-v8",
    createdAt: "2026-08-21T16:00:00.000Z",
    frontend: {
      commit,
      imageDigest: frontendImageDigest,
      builtAt: "2026-08-21T15:59:00.000Z",
      baseUrl: "http://127.0.0.1:5173"
    },
    backend: {
      commit,
      imageDigest: backendImageDigest,
      builtAt: "2026-08-21T15:59:00.000Z",
      baseUrl: "http://127.0.0.1:3000",
      contractVersion: "1.0.0",
      vfxRuntimeRevision:
        runtimeSourceIdentity?.vfxRuntimeRevision ?? "matrix-control-runtime"
    }
  };
  const profilePath = path.join(directory, "runtime-build-profile.json");
  writeJson(profilePath, profile);
  return buildMatrixRuntimeBuildBinding({
    profile,
    profilePath,
    profileSha256: fileSha256(profilePath)
  });
}

function acceptedPathConnectProof(row, directory) {
  const sourceCell = row.fixture.cells.find((cell) => cell.role === "source");
  const partnerCell = row.fixture.cells.find((cell) => cell.role === "partner");
  const profile = {
    schema: "aurora-tile-path-connect-profile/v2",
    id: `control-${row.tileId}-path-connect-v2`,
    approved: true,
    moduleSha256: "b".repeat(64),
    positiveAreaResRef: "control_pc_pos",
    negativeAreaResRef: "control_pc_neg",
    areaWidth: row.fixture.width,
    areaHeight: row.fixture.height,
    tilesetResRef: row.tilesetResRef,
    definitionFingerprint: row.definitionFingerprint,
    rowId: row.id,
    source: {
      tileId: row.tileId,
      pathNode: row.pathConnect.sourcePathNode,
      orientation: row.pathConnect.reference.source.orientation,
      edge: row.pathConnect.reference.sourceEdge,
      row: sourceCell.row,
      col: sourceCell.col
    },
    partner: {
      tileId: row.connect.partnerTileId,
      pathNode: row.pathConnect.partnerPathNode,
      orientation: row.pathConnect.reference.partner.orientation,
      edge: row.pathConnect.reference.partnerEdge,
      row: partnerCell.row,
      col: partnerCell.col
    },
    matchingLanes: [...row.pathConnect.reference.matchingLanes],
    negativeControl: structuredClone(row.pathConnect.negativeControl)
  };
  const proofDirectory = path.join(directory, "path-connect-proof", row.id.replaceAll(":", "-"));
  const profilePath = path.join(proofDirectory, "profile.json");
  writeJson(profilePath, profile);
  const profileSha256 = fileSha256(profilePath);
  const artifacts = Object.fromEntries(
    ["toolsetReadback", "positiveRuntime", "negativeRuntime", "engineLog"]
      .map((kind) => {
        const artifactPath = path.join(proofDirectory, `${kind}.txt`);
        fs.writeFileSync(artifactPath, `${kind}\n`, "utf8");
        return [kind, { path: artifactPath, sha256: fileSha256(artifactPath) }];
      })
  );
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
  const packetPath = path.join(proofDirectory, "packet.json");
  writeJson(packetPath, packet);
  return buildPathConnectDifferentialProof({
    profile,
    profilePath,
    profileSha256,
    packet,
    packetPath,
    packetSha256: fileSha256(packetPath)
  });
}

function makeCurrentPlan(
  directory,
  { acceptPathConnect = false, complete = false, runtimeSourceIdentity = null } = {}
) {
  const runtimeBuildBinding = createRuntimeBuildBinding(
    directory,
    runtimeSourceIdentity
  );
  const manifest = buildMatrixManifest({
    tilesets: [tileset],
    runtimeBuildBinding,
    caseLimit: 1,
    generatedAt: "2026-07-29T00:00:00.000Z"
  });
  if (acceptPathConnect) {
    for (const row of manifest.rows) {
      if (row.connect?.status !== "planned") continue;
      const blockedPathConnect = row.pathConnect;
      row.pathConnect = {
        ...blockedPathConnect,
        status: "accepted",
        proof: acceptedPathConnectProof(row, directory)
      };
    }
    manifest.summary.pathConnectAcceptedRows =
      manifest.rows.filter((row) => row.pathConnect?.status === "accepted").length;
  }
  const planId = digest(manifest);
  writeJson(path.join(directory, "manifest.json"), manifest);
  for (const chunk of manifest.chunks) {
    writeJson(path.join(directory, "chunks", `${chunk.id}.json`), {
      schema: "aurora-tile-add-connect-matrix-chunk/v1",
      plannedAt: manifest.generatedAt,
      ...chunk
    });
  }
  writeJson(path.join(directory, "checkpoint.json"), {
    schema: "aurora-tile-add-connect-matrix-checkpoint/v2",
    planId,
    planDirectory: directory,
    manifestSha256: planId,
    manifestSchema: manifest.schema,
    contractRevision: manifest.contract.revision,
    contractFingerprint: manifest.contract.fingerprint,
    runtimeBuildBinding,
    nextChunkIndex: complete ? manifest.chunks.length : 0,
    capturedChunkIds: complete ? manifest.chunks.map((chunk) => chunk.id) : [],
    acceptedVisualReviews: [],
    rejectedVisualReviews: [],
    complete,
    updatedAt: "2026-07-29T00:00:00.000Z"
  });
  writeJson(path.join(directory, "summary.json"), {
    schema: "aurora-tile-add-connect-matrix-summary/v2",
    generatedAt: "2026-07-29T00:00:00.000Z",
    planBinding: {
      planId,
      outDirectory: directory,
      manifestSchema: manifest.schema,
      contractRevision: manifest.contract.revision,
      contractFingerprint: manifest.contract.fingerprint,
      runtimeBuildBinding
    },
    matrix: manifest.summary,
    validationErrors: []
  });
  return { manifest, planId, runtimeBuildBinding };
}

function run(...args) {
  const result = spawnSync(process.execPath, [controllerPath, ...args], {
    cwd: backendDirectory,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function runFailure(...args) {
  const result = spawnSync(process.execPath, [controllerPath, ...args], {
    cwd: backendDirectory,
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0, result.stdout);
  return JSON.parse(result.stdout);
}

try {
  const currentDirectory = path.join(temporaryRoot, "current-plan");
  const { manifest, planId } = makeCurrentPlan(currentDirectory);

  const status = run("status", "--out-directory", currentDirectory, "--plan-id", planId);
  assert.equal(status.validation.status, "ready");
  assert.equal(status.planBinding.planId, planId);
  assert.deepEqual(status.planBinding.runtimeBuildBinding, manifest.runtimeBuildBinding);
  assert.equal(status.nextAction.kind, "capture_next_chunk");
  assert.match(status.nextAction.safeCommand, new RegExp(`--plan-id '${planId}'`));
  assert.match(status.nextAction.safeCommand, /--out-directory '/);
  assert.equal(status.coverage.addRenderCoverage.complete, false);
  assert.equal(status.coverage.pathConnectDifferentialCoverage.complete, false);

  const sourceDriftStatus = run(
    "status",
    "--out-directory",
    currentDirectory,
    "--plan-id",
    planId,
    "--verify-runtime-source"
  );
  assert.equal(sourceDriftStatus.validation.status, "ready");
  assert.equal(sourceDriftStatus.runtimeSourceIdentity.status, "mismatch");
  assert.ok(sourceDriftStatus.runtimeSourceIdentity.errors.length > 0);
  assert.equal(
    sourceDriftStatus.nextAction.kind,
    "runtime_build_reprofile_required"
  );
  const sourceDriftNext = run(
    "next",
    "--out-directory",
    currentDirectory,
    "--plan-id",
    planId,
    "--verify-runtime-source"
  );
  assert.equal(sourceDriftNext.captureIntegration, null);
  const sourceDriftCapture = run(
    "capture",
    "--out-directory",
    currentDirectory,
    "--plan-id",
    planId,
    "--verify-runtime-source"
  );
  assert.equal(sourceDriftCapture.accepted, false);
  assert.equal(
    sourceDriftCapture.status,
    "runtime_build_reprofile_required"
  );
  assert.equal(fs.existsSync(path.join(currentDirectory, "captures")), false);

  const currentRuntimeSourceIdentity =
    computeTileAddConnectRuntimeSourceIdentity();
  const sourceBoundDirectory = path.join(temporaryRoot, "source-bound-plan");
  const sourceBound = makeCurrentPlan(sourceBoundDirectory, {
    runtimeSourceIdentity: currentRuntimeSourceIdentity
  });
  const sourceBoundStatus = run(
    "status",
    "--out-directory",
    sourceBoundDirectory,
    "--plan-id",
    sourceBound.planId,
    "--verify-runtime-source"
  );
  assert.equal(sourceBoundStatus.runtimeSourceIdentity.status, "verified");
  assert.deepEqual(sourceBoundStatus.runtimeSourceIdentity.errors, []);
  assert.equal(sourceBoundStatus.nextAction.kind, "capture_next_chunk");
  assert.match(
    sourceBoundStatus.nextAction.safeCommand,
    /--verify-runtime-source/u
  );

  const next = run("next", "--out-directory", currentDirectory, "--plan-id", planId);
  assert.equal(next.captureIntegration.status, "ready_for_guarded_add_render_capture");
  assert.match(next.captureIntegration.safeCommand, new RegExp(`--plan-id '${planId}'`));

  const wrongPlanId = "0".repeat(64);
  const mismatchedStatus = run(
    "status",
    "--out-directory",
    currentDirectory,
    "--plan-id",
    wrongPlanId
  );
  assert.equal(mismatchedStatus.validation.status, "plan_id_mismatch");
  assert.equal(mismatchedStatus.nextAction.kind, "plan_id_mismatch");
  const mismatchedNext = run(
    "next",
    "--out-directory",
    currentDirectory,
    "--plan-id",
    wrongPlanId
  );
  assert.equal(mismatchedNext.captureIntegration, null);
  const mismatchedCapture = run(
    "capture",
    "--out-directory",
    currentDirectory,
    "--plan-id",
    wrongPlanId
  );
  assert.equal(mismatchedCapture.accepted, false);
  assert.equal(mismatchedCapture.status, "plan_id_mismatch");
  assert.equal(fs.existsSync(path.join(currentDirectory, "captures")), false);

  writeJson(path.join(currentDirectory, "checkpoint.json"), {
    schema: "aurora-tile-add-connect-matrix-checkpoint/v2",
    planId,
    planDirectory: currentDirectory,
    manifestSha256: planId,
    manifestSchema: manifest.schema,
    contractRevision: manifest.contract.revision,
    contractFingerprint: manifest.contract.fingerprint,
    runtimeBuildBinding: manifest.runtimeBuildBinding,
    nextChunkIndex: manifest.chunks.length,
    capturedChunkIds: manifest.chunks.map((chunk) => chunk.id),
    acceptedVisualReviews: [],
    rejectedVisualReviews: [],
    complete: true,
    updatedAt: "2026-07-29T00:01:00.000Z"
  });
  const addRenderCompleteStatus = run(
    "status",
    "--out-directory",
    currentDirectory,
    "--plan-id",
    planId
  );
  assert.equal(addRenderCompleteStatus.coverage.addRenderCoverage.complete, true);
  assert.equal(addRenderCompleteStatus.coverage.pathConnectDifferentialCoverage.complete, false);
  assert.equal(addRenderCompleteStatus.nextAction.kind, "path_connect_differential_required");

  const acceptedDirectory = path.join(temporaryRoot, "accepted-plan");
  const accepted = makeCurrentPlan(acceptedDirectory, {
    acceptPathConnect: true,
    complete: true
  });
  const acceptedStatus = run(
    "status",
    "--out-directory",
    acceptedDirectory,
    "--plan-id",
    accepted.planId
  );
  assert.equal(acceptedStatus.coverage.pathConnectDifferentialCoverage.complete, true);
  assert.equal(acceptedStatus.nextAction.kind, "goal_complete_candidate");

  const staleDirectory = path.join(temporaryRoot, "stale-plan");
  const staleManifest = structuredClone(manifest);
  staleManifest.schema = "aurora-tile-add-connect-matrix/v1";
  delete staleManifest.contract;
  delete staleManifest.rows[0].pathConnect;
  writeJson(path.join(staleDirectory, "manifest.json"), staleManifest);
  writeJson(path.join(staleDirectory, "checkpoint.json"), {
    schema: "aurora-tile-add-connect-matrix-checkpoint/v1",
    manifestSha256: digest(staleManifest),
    nextChunkIndex: 0,
    capturedChunkIds: [],
    complete: false
  });

  const staleStatus = run("status", "--out-directory", staleDirectory);
  assert.equal(staleStatus.validation.status, "replan_required");
  assert.equal(staleStatus.nextAction.kind, "replan_required");
  assert.ok(staleStatus.validation.errors.includes("MATRIX_MANIFEST_SCHEMA_UNSUPPORTED"));
  assert.ok(staleStatus.validation.errors.includes("PATH_CONNECT_STATUS_MISSING"));
  assert.match(staleStatus.nextAction.safeCommand, /--replaces-plan-id '/);

  const staleNext = run("next", "--out-directory", staleDirectory);
  assert.equal(staleNext.status.nextAction.kind, "replan_required");
  assert.equal(staleNext.captureIntegration, null);

  const staleCapture = run("capture", "--out-directory", staleDirectory);
  assert.equal(staleCapture.accepted, false);
  assert.equal(staleCapture.status, "replan_required");
  assert.equal(fs.existsSync(path.join(staleDirectory, "captures")), false);

  const recoveryDirectory = path.join(temporaryRoot, "legacy-recovery-plan");
  const recovery = makeCurrentPlan(recoveryDirectory);
  const rejectedChunk = recovery.manifest.chunks[0];
  const rejectedRowIds = rejectedChunk.kind === "group"
    ? rejectedChunk.cases.flatMap((matrixCase) =>
        matrixCase.memberCells.map((cell) => cell.rowId)
      )
    : rejectedChunk.cases.map((matrixCase) => matrixCase.rowId);
  const recoveryCheckpointPath = path.join(recoveryDirectory, "checkpoint.json");
  writeJson(recoveryCheckpointPath, {
    schema: "aurora-tile-add-connect-matrix-checkpoint/v2",
    planId: recovery.planId,
    planDirectory: recoveryDirectory,
    manifestSha256: recovery.planId,
    manifestSchema: recovery.manifest.schema,
    contractRevision: recovery.manifest.contract.revision,
    contractFingerprint: recovery.manifest.contract.fingerprint,
    runtimeBuildBinding: recovery.manifest.runtimeBuildBinding,
    nextChunkIndex: 1,
    capturedChunkIds: [rejectedChunk.id],
    acceptedVisualReviews: [],
    rejectedVisualReviews: [],
    complete: false,
    updatedAt: "2026-07-29T00:02:00.000Z"
  });
  const recoveryHeartbeatPath = path.join(recoveryDirectory, "heartbeat.json");
  writeJson(recoveryHeartbeatPath, {
    schema: "aurora-tile-add-connect-matrix-heartbeat/v2",
    phase: "captured",
    updatedAt: "2026-07-29T00:02:00.000Z",
    planBinding: {
      planId: recovery.planId,
      outDirectory: recoveryDirectory,
      manifestSchema: recovery.manifest.schema,
      contractRevision: recovery.manifest.contract.revision,
      contractFingerprint: recovery.manifest.contract.fingerprint,
      runtimeBuildBinding: recovery.manifest.runtimeBuildBinding
    },
    manifestSha256: recovery.planId,
    chunk: {
      id: rejectedChunk.id,
      kind: rejectedChunk.kind,
      tilesetResRef: rejectedChunk.tilesetResRef,
      definitionFingerprint: rejectedChunk.definitionFingerprint
    },
    proofScope: "add_render",
    checkpoint: {
      nextChunkIndex: 1,
      totalChunks: recovery.manifest.chunks.length
    }
  });
  const recoveryChunkPath = path.join(
    recoveryDirectory,
    "chunks",
    `${rejectedChunk.id}.json`
  );
  const recoveryCapturesDirectory = path.join(recoveryDirectory, "captures");
  fs.mkdirSync(recoveryCapturesDirectory, { recursive: true });
  const rejectedArtifactNames = {
    frame: `${rejectedChunk.id}.frame.json`,
    state: `${rejectedChunk.id}.state.json`,
    canvas: `${rejectedChunk.id}.canvas.png`,
    page: `${rejectedChunk.id}.png`,
    lifecycle: `${rejectedChunk.id}.lifecycle.jsonl`
  };
  const rejectedArtifacts = {};
  for (const [kind, name] of Object.entries(rejectedArtifactNames)) {
    const artifactPath = path.join(recoveryCapturesDirectory, name);
    fs.writeFileSync(artifactPath, `${kind}:${rejectedChunk.id}\n`, "utf8");
    rejectedArtifacts[kind] = {
      path: artifactPath,
      sha256: fileSha256(artifactPath),
      bytes: fs.statSync(artifactPath).size
    };
  }
  const blockerPath = path.join(
    recoveryCapturesDirectory,
    `${rejectedChunk.id}.visual-blocker.json`
  );
  writeJson(blockerPath, {
    schema: "aurora-tile-add-connect-matrix-visual-blocker/v1",
    generatedAt: "2026-07-29T00:03:00.000Z",
    status: "rejected",
    proofCompleteness: "failed",
    rejectionCodes: ["INDEPENDENT_VISUAL_FRAMING_REJECTED"],
    planBinding: {
      planId: recovery.planId,
      manifestSha256: recovery.planId,
      manifestSchema: recovery.manifest.schema,
      contractRevision: recovery.manifest.contract.revision,
      contractFingerprint: recovery.manifest.contract.fingerprint,
      runtimeBuildBinding: recovery.manifest.runtimeBuildBinding,
      planDirectory: recoveryDirectory
    },
    chunk: {
      id: rejectedChunk.id,
      kind: rejectedChunk.kind,
      tilesetResRef: rejectedChunk.tilesetResRef,
      definitionPath: recoveryChunkPath,
      definitionFingerprint: rejectedChunk.definitionFingerprint,
      rejectedRowIds
    },
    artifacts: rejectedArtifacts,
    checkpointDisposition: {
      rawControllerCheckpoint: {
        nextChunkIndex: 1,
        capturedChunkCount: 1
      },
      effectiveAcceptedProofCheckpoint: {
        nextChunkIndex: 0,
        acceptedChunkCount: 0,
        lastAcceptedChunkId: null
      }
    },
    pathConnect: {
      accepted: 0,
      status: "missing"
    }
  });
  const recoveryArguments = [
    "--out-directory", recoveryDirectory,
    "--plan-id", recovery.planId,
    "--chunk-id", rejectedChunk.id,
    "--checkpoint-sha256", fileSha256(recoveryCheckpointPath),
    "--heartbeat-sha256", fileSha256(recoveryHeartbeatPath),
    "--chunk-sha256", fileSha256(recoveryChunkPath),
    "--blocker", blockerPath,
    "--blocker-sha256", fileSha256(blockerPath)
  ];
  const manifestHashBeforeRecovery = fileSha256(
    path.join(recoveryDirectory, "manifest.json")
  );
  const recoveryDryRun = run("recover-last-rejected", ...recoveryArguments);
  assert.equal(recoveryDryRun.schema, "aurora-tile-add-connect-matrix-last-chunk-recovery/v1");
  assert.equal(recoveryDryRun.status, "ready");
  assert.equal(recoveryDryRun.applied, false);
  assert.equal(JSON.parse(fs.readFileSync(recoveryCheckpointPath, "utf8")).nextChunkIndex, 1);
  assert.equal(fs.existsSync(recoveryDryRun.recoveryRecordPath), false);

  const wrongBlockerHash = runFailure(
    "recover-last-rejected",
    ...recoveryArguments.slice(0, -1),
    "0".repeat(64)
  );
  assert.equal(wrongBlockerHash.error.code, "TILE_ADD_CONNECT_MATRIX_FAILED");

  const recoveryApplied = run(
    "recover-last-rejected",
    ...recoveryArguments,
    "--execute"
  );
  assert.equal(recoveryApplied.status, "recovered");
  assert.equal(recoveryApplied.applied, true);
  const recoveredCheckpoint = JSON.parse(fs.readFileSync(recoveryCheckpointPath, "utf8"));
  assert.equal(recoveredCheckpoint.nextChunkIndex, 0);
  assert.deepEqual(recoveredCheckpoint.capturedChunkIds, []);
  assert.equal(recoveredCheckpoint.complete, false);
  assert.equal(recoveredCheckpoint.recoveryHistory.at(-1).recoveryId, recoveryApplied.recoveryId);
  assert.equal(fs.existsSync(recoveryApplied.recoveryRecordPath), true);
  assert.equal(
    fs.existsSync(path.join(recoveryApplied.archiveDirectory, rejectedArtifactNames.canvas)),
    true
  );
  assert.equal(fileSha256(path.join(recoveryDirectory, "manifest.json")), manifestHashBeforeRecovery);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(recoveryDirectory, "manifest.json"), "utf8"))
      .summary.pathConnectAcceptedRows,
    0
  );

  const recoveryRepeated = run(
    "recover-last-rejected",
    ...recoveryArguments,
    "--execute"
  );
  assert.equal(recoveryRepeated.status, "already_recovered");
  assert.equal(recoveryRepeated.applied, false);
  assert.equal(
    JSON.parse(fs.readFileSync(recoveryCheckpointPath, "utf8")).nextChunkIndex,
    0
  );

  const twoPhaseDirectory = path.join(temporaryRoot, "two-phase-plan");
  const twoPhase = makeCurrentPlan(twoPhaseDirectory);
  const pendingChunk = twoPhase.manifest.chunks[0];
  const pendingCheckpointPath = path.join(
    twoPhaseDirectory,
    "checkpoint.json"
  );
  const pendingCheckpoint = JSON.parse(
    fs.readFileSync(pendingCheckpointPath, "utf8")
  );
  const pendingCapturesDirectory = path.join(
    twoPhaseDirectory,
    "captures"
  );
  fs.mkdirSync(pendingCapturesDirectory, { recursive: true });
  const pendingAttemptId = `${pendingChunk.id}.attempt-0001`;
  const pendingArtifactPaths = {};
  for (const [kind, suffix] of Object.entries({
    frame: ".frame.json",
    state: ".state.json",
    canvas: ".canvas.png",
    page: ".png",
    lifecycle: ".lifecycle.jsonl"
  })) {
    const artifactPath = path.join(
      pendingCapturesDirectory,
      `${pendingAttemptId}${suffix}`
    );
    fs.writeFileSync(
      artifactPath,
      `${kind}:${pendingChunk.id}:${pendingAttemptId}\n`,
      "utf8"
    );
    pendingArtifactPaths[kind] = artifactPath;
  }
  assert.throws(
    () => buildPendingMatrixCapture({
      outDirectory: twoPhaseDirectory,
      manifest: twoPhase.manifest,
      checkpoint: pendingCheckpoint,
      planId: twoPhase.planId,
      chunk: pendingChunk,
      nextIndex: 0,
      attemptId: pendingAttemptId,
      artifactPaths: pendingArtifactPaths,
      verification: {
        ok: true,
        errors: [],
        expectedTileCount: 2,
        runtimeBuildBinding: {
          ...twoPhase.manifest.runtimeBuildBinding,
          bindingSha256: "0".repeat(64)
        }
      },
      stagedAt: "2026-07-29T00:04:00.000Z"
    }),
    /runtime-build binding differs/u
  );
  const staged = buildPendingMatrixCapture({
    outDirectory: twoPhaseDirectory,
    manifest: twoPhase.manifest,
    checkpoint: pendingCheckpoint,
    planId: twoPhase.planId,
    chunk: pendingChunk,
    nextIndex: 0,
    attemptId: pendingAttemptId,
    artifactPaths: pendingArtifactPaths,
    verification: {
      ok: true,
      errors: [],
      expectedTileCount: 2,
      runtimeBuildBinding: twoPhase.manifest.runtimeBuildBinding
    },
    runtimeBuildBinding: twoPhase.manifest.runtimeBuildBinding,
    stagedAt: "2026-07-29T00:04:00.000Z"
  });
  assert.equal(staged.nextCheckpoint.nextChunkIndex, 0);
  assert.deepEqual(staged.nextCheckpoint.capturedChunkIds, []);
  assert.equal(
    staged.nextCheckpoint.pendingCapture.chunk.id,
    pendingChunk.id
  );
  assert.equal(
    staged.nextCheckpoint.pendingCapture.attempt.id,
    pendingAttemptId
  );
  assert.equal(
    staged.nextCheckpoint.pendingCapture.artifacts.canvas.sha256,
    fileSha256(pendingArtifactPaths.canvas)
  );
  writeJson(pendingCheckpointPath, staged.nextCheckpoint);

  const visualReviewPath = path.join(
    pendingCapturesDirectory,
    `${pendingAttemptId}.visual-review.json`
  );
  const visualReview = {
    schema: "aurora-tile-add-connect-matrix-visual-review/v1",
    reviewedAt: "2026-07-29T00:05:00.000Z",
    reviewerIdentity: "independent-test-reviewer",
    auroraToolsetProveContractVersion: "1.0.15",
    verdict: "verified",
    planBinding: {
      planId: twoPhase.planId,
      manifestSchema: twoPhase.manifest.schema,
      contractRevision: twoPhase.manifest.contract.revision,
      contractFingerprint: twoPhase.manifest.contract.fingerprint,
      runtimeBuildBinding: twoPhase.manifest.runtimeBuildBinding
    },
    runtimeBuildBinding: twoPhase.manifest.runtimeBuildBinding,
    chunk: {
      id: pendingChunk.id,
      definitionFingerprint: pendingChunk.definitionFingerprint
    },
    pendingCapture: {
      attemptId: pendingAttemptId,
      artifacts: Object.fromEntries(
        Object.entries(
          staged.nextCheckpoint.pendingCapture.artifacts
        ).map(([kind, artifact]) => [kind, artifact.sha256])
      )
    },
    checks: {
      requestedAreaLegible: true,
      declaredFixtureLayoutVisible: true,
      noUnexpectedBlankFailedBridgeOrPlaceholderTiles: true,
      cameraFramingAccepted: true
    }
  };
  const mismatchedBuildReview = structuredClone(visualReview);
  mismatchedBuildReview.runtimeBuildBinding.bindingSha256 = "0".repeat(64);
  writeJson(visualReviewPath, mismatchedBuildReview);
  const rejectedBuildReview = runFailure(
    "accept-capture",
    "--out-directory",
    twoPhaseDirectory,
    "--plan-id",
    twoPhase.planId,
    "--chunk-id",
    pendingChunk.id,
    "--visual-review",
    visualReviewPath
  );
  assert.equal(rejectedBuildReview.error.code, "TILE_ADD_CONNECT_MATRIX_FAILED");
  assert.equal(
    JSON.parse(fs.readFileSync(pendingCheckpointPath, "utf8")).nextChunkIndex,
    0
  );
  const mismatchedReview = structuredClone(visualReview);
  mismatchedReview.pendingCapture.artifacts.canvas = "0".repeat(64);
  writeJson(visualReviewPath, mismatchedReview);
  const rejectedReview = runFailure(
    "accept-capture",
    "--out-directory",
    twoPhaseDirectory,
    "--plan-id",
    twoPhase.planId,
    "--chunk-id",
    pendingChunk.id,
    "--visual-review",
    visualReviewPath
  );
  assert.equal(
    rejectedReview.error.code,
    "TILE_ADD_CONNECT_MATRIX_FAILED"
  );
  assert.equal(
    JSON.parse(fs.readFileSync(pendingCheckpointPath, "utf8"))
      .nextChunkIndex,
    0
  );

  const visualRejection = {
    ...visualReview,
    verdict: "rejected",
    rejectionCodes: ["UNEXPECTED_BLACK_SOURCE_FLOOR_OCCLUSION"],
    checks: {
      ...visualReview.checks,
      noUnexpectedBlankFailedBridgeOrPlaceholderTiles: false
    }
  };
  writeJson(visualReviewPath, visualRejection);
  const rejectedCapture = run(
    "reject-capture",
    "--out-directory",
    twoPhaseDirectory,
    "--plan-id",
    twoPhase.planId,
    "--chunk-id",
    pendingChunk.id,
    "--visual-review",
    visualReviewPath
  );
  assert.equal(rejectedCapture.status, "capture_rejected");
  assert.equal(rejectedCapture.accepted, false);
  const rejectedCaptureCheckpoint = JSON.parse(
    fs.readFileSync(pendingCheckpointPath, "utf8")
  );
  assert.equal(rejectedCaptureCheckpoint.nextChunkIndex, 0);
  assert.deepEqual(rejectedCaptureCheckpoint.capturedChunkIds, []);
  assert.equal(
    Object.hasOwn(rejectedCaptureCheckpoint, "pendingCapture"),
    false
  );
  assert.equal(
    rejectedCaptureCheckpoint.rejectedVisualReviews.at(-1).attemptId,
    pendingAttemptId
  );

  const replacementAttemptId = `${pendingChunk.id}.attempt-0002`;
  const replacementArtifactPaths = {};
  for (const [kind, suffix] of Object.entries({
    frame: ".frame.json",
    state: ".state.json",
    canvas: ".canvas.png",
    page: ".png",
    lifecycle: ".lifecycle.jsonl"
  })) {
    const artifactPath = path.join(
      pendingCapturesDirectory,
      `${replacementAttemptId}${suffix}`
    );
    fs.writeFileSync(
      artifactPath,
      `${kind}:${pendingChunk.id}:${replacementAttemptId}\n`,
      "utf8"
    );
    replacementArtifactPaths[kind] = artifactPath;
  }
  const replacementStaged = buildPendingMatrixCapture({
    outDirectory: twoPhaseDirectory,
    manifest: twoPhase.manifest,
    checkpoint: rejectedCaptureCheckpoint,
    planId: twoPhase.planId,
    chunk: pendingChunk,
    nextIndex: 0,
    attemptId: replacementAttemptId,
    artifactPaths: replacementArtifactPaths,
    verification: {
      ok: true,
      errors: [],
      expectedTileCount: 2,
      runtimeBuildBinding: twoPhase.manifest.runtimeBuildBinding
    },
    stagedAt: "2026-07-29T00:06:00.000Z"
  });
  writeJson(pendingCheckpointPath, replacementStaged.nextCheckpoint);

  const replacementVisualReview = {
    ...visualReview,
    reviewedAt: "2026-07-29T00:07:00.000Z",
    pendingCapture: {
      attemptId: replacementAttemptId,
      artifacts: Object.fromEntries(
        Object.entries(
          replacementStaged.nextCheckpoint.pendingCapture.artifacts
        ).map(([kind, artifact]) => [kind, artifact.sha256])
      )
    }
  };
  writeJson(visualReviewPath, replacementVisualReview);
  const acceptedReview = run(
    "accept-capture",
    "--out-directory",
    twoPhaseDirectory,
    "--plan-id",
    twoPhase.planId,
    "--chunk-id",
    pendingChunk.id,
    "--visual-review",
    visualReviewPath
  );
  assert.equal(acceptedReview.status, "captured");
  assert.equal(acceptedReview.accepted, true);
  const acceptedReviewCheckpoint = JSON.parse(
    fs.readFileSync(pendingCheckpointPath, "utf8")
  );
  assert.equal(acceptedReviewCheckpoint.nextChunkIndex, 1);
  assert.deepEqual(acceptedReviewCheckpoint.capturedChunkIds, [
    pendingChunk.id
  ]);
  assert.equal(
    Object.hasOwn(acceptedReviewCheckpoint, "pendingCapture"),
    false
  );
  assert.equal(
    acceptedReviewCheckpoint.acceptedVisualReviews.at(-1).chunkId,
    pendingChunk.id
  );
  assert.deepEqual(
    acceptedReviewCheckpoint.acceptedVisualReviews.at(-1).runtimeBuildBinding,
    twoPhase.manifest.runtimeBuildBinding
  );
  assert.equal(
    acceptedReviewCheckpoint.rejectedVisualReviews.at(-1).attemptId,
    pendingAttemptId
  );
  assert.equal(
    twoPhase.manifest.summary.pathConnectAcceptedRows,
    0
  );

  const profileDriftDirectory = path.join(
    temporaryRoot,
    "runtime-profile-drift-plan"
  );
  const profileDriftPlan = makeCurrentPlan(profileDriftDirectory);
  fs.appendFileSync(
    profileDriftPlan.runtimeBuildBinding.profile.path,
    " ",
    "utf8"
  );
  const profileDriftStatus = run(
    "status",
    "--out-directory",
    profileDriftDirectory,
    "--plan-id",
    profileDriftPlan.planId
  );
  assert.equal(profileDriftStatus.validation.status, "replan_required");
  assert.ok(
    profileDriftStatus.validation.errors.includes(
      "MATRIX_RUNTIME_BUILD_PROFILE_SHA256_MISMATCH"
    )
  );

  process.stdout.write("tile add/connect matrix control plane: PASS\n");
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
