import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildAgentStatus,
  evaluateProofFrame,
  groupBlockers,
  inspectMatrixCaptureRecovery,
  reconcileMatrixCaptureRecovery
} from "./aurora-tile-agent-control.mjs";

const contractNextPlan = spawnSync(process.execPath, [
  fileURLToPath(new URL("./aurora-tile-agent-control.mjs", import.meta.url)),
  "contract-next",
  "--definition-catalog", "C:/proof/catalog.json",
  "--definition-catalog-sha256", "a".repeat(64)
], {
  cwd: process.cwd(),
  encoding: "utf8"
});
assert.equal(contractNextPlan.status, 0, contractNextPlan.stderr || contractNextPlan.stdout);
const contractNextPayload = JSON.parse(contractNextPlan.stdout);
assert.deepEqual(
  contractNextPayload.plan.args.slice(-4),
  [
    "--definition-catalog", path.resolve(process.cwd(), "C:/proof/catalog.json"),
    "--definition-catalog-sha256", "a".repeat(64)
  ]
);

const readyFrame = {
  status: "captured",
  strictVisualMode: { status: "passed" },
  runtimeCanvasScreenshot: { ok: true, path: "C:/proof/canvas.png" },
  areaTileMutationRuntimeSettlement: { status: "ready" },
  postCaptureAreaTileMutationRuntimeSettlement: { status: "ready" },
  areaPresentedFrameFence: { status: "ready" },
  areaObjectSupportSurfaceSummary: {
    areaLoadEvidence: { runtimeFreshnessOk: true }
  },
  terrainTileModelSnapshot: {
    status: "ready",
    pendingTileCount: 0,
    failedTileCount: 0,
    bridgeTileCount: 0
  },
  domStatus: {
    cameraFrame: {
      runtimeBoundsPolicyStatus: "within_footprint_connected_bounds"
    }
  },
  areaEditingScenario: { mutatesScene: true, ok: true }
};

assert.deepEqual(
  evaluateProofFrame(readyFrame, { exists: (filePath) => filePath === "C:/proof/canvas.png" }),
  { accepted: true, rejectionCodes: [] }
);

assert.deepEqual(
  evaluateProofFrame(
    {
      ...readyFrame,
      areaObjectSupportSurfaceSummary: {
        areaLoadEvidence: { runtimeFreshnessOk: false }
      }
    },
    { exists: () => true }
  ),
  { accepted: false, rejectionCodes: ["RUNTIME_FRESHNESS_FALSE"] }
);

assert.deepEqual(
  evaluateProofFrame(
    {
      ...readyFrame,
      domStatus: {
        cameraFrame: {
          runtimeBoundsPolicyStatus: "runtime_bounds_outlier"
        }
      }
    },
    { exists: () => true }
  ),
  {
    accepted: false,
    rejectionCodes: ["TERRAIN_FRAME_OUTLIER_REVIEW_REQUIRED"]
  }
);

assert.deepEqual(
  groupBlockers([
    { audit: { blockerCodes: ["MISSING_TEXTURE:gimp_gradient"] } },
    { audit: { blockerCodes: ["MISSING_TEXTURE:gimp_gradient", "TILE_NOT_FOUND"] } }
  ]),
  [
    { code: "MISSING_TEXTURE:gimp_gradient", count: 2 },
    { code: "TILE_NOT_FOUND", count: 1 }
  ]
);

const staleStatus = buildAgentStatus({
  checkpoint: { cursor: 10, uniqueRuntimeTileIds: Array(100).fill("tile") },
  summary: {
    complete: false,
    totals: { processedEntries: 10, tilesetEntries: 100, blockedEntries: 0, retryPendingEntries: 0 },
    blockedSample: []
  },
  heartbeat: {
    phase: "in_flight",
    timing: { updatedAt: "2026-07-20T10:00:00.000Z" }
  },
  proofGates: [],
  now: new Date("2026-07-20T10:02:00.000Z"),
  heartbeatStaleMs: 60_000
});
assert.equal(staleStatus.heartbeat.stale, true);
assert.equal(staleStatus.nextAction.kind, "resume_contract_sweep");

const visualGapStatus = buildAgentStatus({
  checkpoint: { cursor: 2, uniqueRuntimeTileIds: ["tile_a", "tile_b"] },
  summary: {
    complete: true,
    totals: { processedEntries: 2, tilesetEntries: 2, blockedEntries: 0, retryPendingEntries: 0 },
    blockedSample: []
  },
  heartbeat: { phase: "checkpointed", timing: { updatedAt: "2026-07-20T10:00:00.000Z" } },
  proofGates: [],
  now: new Date("2026-07-20T12:00:00.000Z"),
  heartbeatStaleMs: 60_000
});
assert.equal(visualGapStatus.heartbeat.stale, false);
assert.equal(visualGapStatus.nextAction.kind, "capture_visual_proof");

const recoveryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-tile-agent-recovery-"));
try {
  const matrixDirectory = path.join(recoveryRoot, "matrix");
  const capturesDirectory = path.join(matrixDirectory, "captures");
  const chunksDirectory = path.join(matrixDirectory, "chunks");
  const controlDirectory = path.join(recoveryRoot, "control");
  fs.mkdirSync(capturesDirectory, { recursive: true });
  fs.mkdirSync(chunksDirectory, { recursive: true });

  const planId = "a".repeat(64);
  const contractFingerprint = "b".repeat(64);
  const interruptedChunk = {
    id: "mst04-group-chunk-0002",
    kind: "group",
    tilesetResRef: "mst04",
    definitionFingerprint: "c".repeat(64),
    width: 8,
    height: 2,
    caseCount: 3,
    memberTileCount: 12
  };
  const manifest = {
    schema: "aurora-tile-add-connect-matrix/v2",
    contract: {
      revision: "path-node-aware-v2",
      fingerprint: contractFingerprint
    },
    chunks: [
      { ...interruptedChunk, id: "mst04-group-chunk-0001" },
      interruptedChunk
    ]
  };
  const checkpoint = {
    schema: "aurora-tile-add-connect-matrix-checkpoint/v2",
    planId,
    manifestSha256: planId,
    manifestSchema: manifest.schema,
    contractRevision: manifest.contract.revision,
    contractFingerprint,
    nextChunkIndex: 1,
    capturedChunkIds: ["mst04-group-chunk-0001"],
    complete: false
  };
  const heartbeat = {
    schema: "aurora-tile-add-connect-matrix-heartbeat/v2",
    phase: "capturing",
    updatedAt: "2026-07-29T22:38:04.211Z",
    planBinding: {
      planId,
      outDirectory: matrixDirectory,
      manifestSchema: manifest.schema,
      contractRevision: manifest.contract.revision,
      contractFingerprint
    },
    manifestSha256: planId,
    chunk: interruptedChunk,
    checkpoint: { nextChunkIndex: 1, totalChunks: 2 }
  };
  fs.writeFileSync(path.join(matrixDirectory, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(matrixDirectory, "checkpoint.json"), JSON.stringify(checkpoint, null, 2));
  fs.writeFileSync(path.join(matrixDirectory, "heartbeat.json"), JSON.stringify(heartbeat, null, 2));
  fs.writeFileSync(
    path.join(chunksDirectory, `${interruptedChunk.id}.json`),
    JSON.stringify({ schema: "aurora-tile-add-connect-matrix-chunk/v1", ...interruptedChunk }, null, 2)
  );

  const lifecyclePath = path.join(capturesDirectory, `${interruptedChunk.id}.lifecycle.jsonl`);
  const progressPath = path.join(capturesDirectory, `${interruptedChunk.id}.progress.frame.json`);
  const chromeProfilePath = path.join(capturesDirectory, `${interruptedChunk.id}.chrome-profile`);
  fs.writeFileSync(lifecyclePath, [
    JSON.stringify({ event: "runner-started", at: "2026-07-29T22:38:04.276Z", fileStem: interruptedChunk.id, pid: 42476 }),
    JSON.stringify({ event: "chrome-spawned", at: "2026-07-29T22:38:06.141Z", pid: 20156 }),
    JSON.stringify({ event: "capture-started", at: "2026-07-29T22:38:06.142Z" })
  ].join("\n"));
  fs.writeFileSync(progressPath, JSON.stringify({
    version: "aurora-areas-runtime-cdp-progress/v1",
    capturedAt: "2026-07-29T22:40:37.325Z",
    status: "waiting"
  }));
  fs.mkdirSync(chromeProfilePath);
  fs.writeFileSync(path.join(chromeProfilePath, "SingletonLock"), "partial-profile-evidence");

  const originalCheckpoint = fs.readFileSync(path.join(matrixDirectory, "checkpoint.json"));
  const originalHeartbeat = fs.readFileSync(path.join(matrixDirectory, "heartbeat.json"));
  const originalLifecycle = fs.readFileSync(lifecyclePath);
  const originalProgress = fs.readFileSync(progressPath);

  const recovery = inspectMatrixCaptureRecovery(matrixDirectory, {
    now: new Date("2026-08-07T10:00:00.000Z"),
    heartbeatStaleMs: 60_000,
    processProbe: () => false
  });
  assert.equal(recovery.status, "interrupted_capture_retryable");
  assert.equal(recovery.safeToResume, true);
  assert.equal(recovery.ownership.noLiveRecordedProcess, true);
  assert.equal(recovery.checkpoint.mutation, "none");
  assert.equal(recovery.checkpoint.countDelta, 0);
  assert.equal(recovery.nextAction.kind, "resume_exact_matrix_chunk");
  assert.equal(recovery.nextAction.chunkId, interruptedChunk.id);
  assert.deepEqual(
    recovery.partialArtifacts.items.map((entry) => entry.kind).sort(),
    ["chrome_profile", "lifecycle", "progress_frame"]
  );

  const firstReconcile = reconcileMatrixCaptureRecovery(matrixDirectory, {
    execute: true,
    controlDirectory,
    now: new Date("2026-08-07T10:00:00.000Z"),
    heartbeatStaleMs: 60_000,
    processProbe: () => false
  });
  const secondReconcile = reconcileMatrixCaptureRecovery(matrixDirectory, {
    execute: true,
    controlDirectory,
    now: new Date("2026-08-07T10:05:00.000Z"),
    heartbeatStaleMs: 60_000,
    processProbe: () => false
  });
  assert.equal(firstReconcile.reconciliation.persisted, true);
  assert.equal(firstReconcile.reconciliation.reused, false);
  assert.equal(secondReconcile.reconciliation.reused, true);
  assert.equal(secondReconcile.reconciliation.artifactPath, firstReconcile.reconciliation.artifactPath);
  assert.equal(
    fs.readdirSync(path.dirname(firstReconcile.reconciliation.artifactPath)).length,
    1,
    "repeated reconciliation must not create or double-count recovery records"
  );
  assert.deepEqual(fs.readFileSync(path.join(matrixDirectory, "checkpoint.json")), originalCheckpoint);
  assert.deepEqual(fs.readFileSync(path.join(matrixDirectory, "heartbeat.json")), originalHeartbeat);
  assert.deepEqual(fs.readFileSync(lifecyclePath), originalLifecycle);
  assert.deepEqual(fs.readFileSync(progressPath), originalProgress);

  const liveOwner = inspectMatrixCaptureRecovery(matrixDirectory, {
    now: new Date("2026-08-07T10:00:00.000Z"),
    heartbeatStaleMs: 60_000,
    processProbe: (pid) => pid === 42476
  });
  assert.equal(liveOwner.status, "blocked_live_recorded_process");
  assert.equal(liveOwner.safeToResume, false);
  assert.deepEqual(liveOwner.blockerCodes, ["RECORDED_PROCESS_STILL_LIVE"]);

  fs.writeFileSync(
    path.join(matrixDirectory, "checkpoint.json"),
    JSON.stringify({
      ...checkpoint,
      nextChunkIndex: 2,
      capturedChunkIds: ["mst04-group-chunk-0001", interruptedChunk.id]
    }, null, 2)
  );
  const alreadyCounted = inspectMatrixCaptureRecovery(matrixDirectory, {
    now: new Date("2026-08-07T10:00:00.000Z"),
    heartbeatStaleMs: 60_000,
    processProbe: () => false
  });
  assert.equal(alreadyCounted.safeToResume, false);
  assert.equal(alreadyCounted.blockerCodes.includes("HEARTBEAT_CHUNK_ALREADY_COUNTED"), true);
} finally {
  fs.rmSync(recoveryRoot, { recursive: true, force: true });
}

console.log("aurora tile agent control: PASS");
