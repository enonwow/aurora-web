#!/usr/bin/env node
/**
 * Development-only control plane for agents operating the runtime tile proof
 * pipeline. It intentionally distinguishes contract readiness from visual
 * proof and treats every missing proof signal as a rejection.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeJsonAtomic } from "./runtime-tile-sweep-io.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..", "..");
const DEFAULT_SWEEP_DIRECTORY = path.join(
  repoRoot,
  "output",
  "proof",
  "runtime-contract-sweep-v19-source-catalog-bound"
);
const DEFAULT_CONTROL_DIRECTORY = path.join(repoRoot, "output", "proof", "agent-tile-proof-control");
const ACTIVE_HEARTBEAT_PHASES = new Set(["in_flight", "responses_received"]);
const STATUS_SCHEMA = "aurora-agent-proof-status/v1";
const GATE_SCHEMA = "aurora-agent-proof-gate/v1";
const MATRIX_HEARTBEAT_SCHEMA = "aurora-tile-add-connect-matrix-heartbeat/v2";
const MATRIX_CHECKPOINT_SCHEMA = "aurora-tile-add-connect-matrix-checkpoint/v2";
const MATRIX_MANIFEST_SCHEMA = "aurora-tile-add-connect-matrix/v2";
const MATRIX_RECOVERY_SCHEMA = "aurora-tile-matrix-capture-recovery/v1";
const MATRIX_RECOVERY_RECORD_SCHEMA = "aurora-tile-matrix-capture-recovery-record/v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const TERMINAL_CAPTURE_EVENTS = new Set([
  "capture-failed",
  "capture-returned",
  "runner-finished",
  "forced-exit-requested"
]);

function parseArgs(args) {
  const parsed = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith("--")) {
      parsed._.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function positiveInteger(value, name, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 1) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function resolveOptionPath(value, fallback) {
  return typeof value === "string" && value.trim()
    ? path.resolve(process.cwd(), value)
    : fallback;
}

function requiredStringOption(args, name) {
  const value = typeof args[name] === "string" ? args[name].trim() : "";
  if (!value) throw new Error(`--${name} <value> is required.`);
  return value;
}

function readGateArtifacts(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".proof-gate.json"))
    .map((entry) => {
      const filePath = path.join(directory, entry.name);
      try {
        return { path: filePath, artifact: JSON.parse(fs.readFileSync(filePath, "utf8")) };
      } catch (error) {
        return {
          path: filePath,
          artifact: {
            accepted: false,
            rejectionCodes: ["PROOF_GATE_ARTIFACT_INVALID"],
            error: error instanceof Error ? error.message : String(error)
          }
        };
      }
    });
}

function readyStatus(record) {
  return record?.status === "ready";
}

function nonNegativeIntegerOrNull(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Fail-closed validation of one exact runtime frame. This mirrors the proof
 * safety contract without assuming any unrecorded renderer state.
 */
export function evaluateProofFrame(frame, { exists = fs.existsSync } = {}) {
  const rejectionCodes = [];
  if (frame?.status !== "captured") rejectionCodes.push("CAPTURE_STATUS_NOT_CAPTURED");
  if (frame?.strictVisualMode?.status !== "passed") rejectionCodes.push("STRICT_VISUAL_NOT_PASSED");

  const screenshot = frame?.runtimeCanvasScreenshot;
  if (screenshot?.ok !== true || typeof screenshot.path !== "string" || !exists(screenshot.path)) {
    rejectionCodes.push("RUNTIME_CANVAS_PNG_MISSING");
  }

  const freshness = frame?.areaObjectSupportSurfaceSummary?.areaLoadEvidence?.runtimeFreshnessOk;
  if (freshness !== true) {
    rejectionCodes.push(freshness === false ? "RUNTIME_FRESHNESS_FALSE" : "RUNTIME_FRESHNESS_MISSING");
  }

  for (const [name, settlement] of [
    ["MUTATION_SETTLEMENT", frame?.areaTileMutationRuntimeSettlement],
    ["POST_CAPTURE_SETTLEMENT", frame?.postCaptureAreaTileMutationRuntimeSettlement]
  ]) {
    if (settlement && !readyStatus(settlement)) rejectionCodes.push(`${name}_NOT_READY`);
  }
  if (!readyStatus(frame?.areaPresentedFrameFence)) rejectionCodes.push("PRESENTED_FRAME_FENCE_NOT_READY");

  const terrain = frame?.terrainTileModelSnapshot;
  if (!readyStatus(terrain)) rejectionCodes.push("TERRAIN_MODEL_STATUS_NOT_READY");
  for (const [field, code] of [
    ["pendingTileCount", "PENDING_TERRAIN_TILES"],
    ["failedTileCount", "FAILED_TERRAIN_TILES"],
    ["bridgeTileCount", "BRIDGE_TERRAIN_TILES"]
  ]) {
    const count = nonNegativeIntegerOrNull(terrain?.[field]);
    if (count === null || count > 0) rejectionCodes.push(code);
  }

  const runtimeBoundsPolicyStatus =
    frame?.domStatus?.cameraFrame?.runtimeBoundsPolicyStatus ??
    frame?.runtimeCanvasScreenshot?.areaMutationRuntimeEvidence?.cameraFrame
      ?.runtimeBoundsPolicyStatus ??
    null;
  if (runtimeBoundsPolicyStatus === "runtime_bounds_outlier") {
    rejectionCodes.push("TERRAIN_FRAME_OUTLIER_REVIEW_REQUIRED");
  }

  if (frame?.areaEditingScenario?.mutatesScene === true && frame.areaEditingScenario.ok !== true) {
    rejectionCodes.push("MUTATING_SCENARIO_NOT_OK");
  }
  return { accepted: rejectionCodes.length === 0, rejectionCodes };
}

export function groupBlockers(entries, limit = 20) {
  const counts = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const codes = Array.isArray(entry?.audit?.blockerCodes) ? entry.audit.blockerCodes : [];
    for (const code of codes) {
      const normalized = String(code ?? "UNKNOWN_BLOCKER");
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
    .slice(0, limit);
}

function toDateOrNull(value) {
  const milliseconds = Date.parse(String(value ?? ""));
  return Number.isFinite(milliseconds) ? new Date(milliseconds) : null;
}

function defaultProcessProbe(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    throw error;
  }
}

function parseLifecycleTrace(filePath) {
  const entries = [];
  const invalidLines = [];
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/gu);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    try {
      entries.push(JSON.parse(line));
    } catch (error) {
      invalidLines.push({
        line: index + 1,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return { entries, invalidLines };
}

function captureArtifactKind(name, isDirectory) {
  if (isDirectory && name.endsWith(".chrome-profile")) return "chrome_profile";
  if (name.endsWith(".lifecycle.jsonl")) return "lifecycle";
  if (name.endsWith(".progress.frame.json")) return "progress_frame";
  if (name.endsWith(".failure.frame.json")) return "failure_frame";
  if (name.endsWith(".frame.json")) return "frame";
  if (name.endsWith(".state.json")) return "state";
  if (name.endsWith(".canvas.png")) return "canvas_png";
  if (name.endsWith(".png")) return "page_png";
  return "other_partial";
}

function directoryMetadata(directoryPath) {
  const records = [];
  const visit = (currentPath, relativePrefix = "") => {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const relativePath = path.join(relativePrefix, entry.name).replaceAll("\\", "/");
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        records.push({ path: relativePath, type: "directory", size: 0 });
        visit(entryPath, relativePath);
      } else if (entry.isFile()) {
        records.push({ path: relativePath, type: "file", size: fs.statSync(entryPath).size });
      } else {
        records.push({ path: relativePath, type: "other", size: 0 });
      }
    }
  };
  visit(directoryPath);
  records.sort((left, right) => left.path.localeCompare(right.path));
  return {
    digestMode: "relative_path_type_size",
    metadataSha256: sha256Json(records),
    fileCount: records.filter((entry) => entry.type === "file").length,
    directoryCount: records.filter((entry) => entry.type === "directory").length,
    totalBytes: records.reduce((total, entry) => total + entry.size, 0)
  };
}

function captureAttemptId(chunkId, artifactName) {
  const escapedChunkId = chunkId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`^(${escapedChunkId}(?:\\.attempt-\\d{4})?)\\.`, "u")
    .exec(artifactName)?.[1] ?? null;
}

function inventoryPartialCaptureArtifacts(capturesDirectory, chunkId) {
  if (!fs.existsSync(capturesDirectory)) return [];
  return fs.readdirSync(capturesDirectory, { withFileTypes: true })
    .map((entry) => {
      const attemptId = captureAttemptId(chunkId, entry.name);
      if (!attemptId) return null;
      const artifactPath = path.join(capturesDirectory, entry.name);
      const common = {
        attemptId,
        relativePath: path.relative(path.dirname(capturesDirectory), artifactPath).replaceAll("\\", "/"),
        kind: captureArtifactKind(entry.name, entry.isDirectory()),
        type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other"
      };
      if (entry.isFile()) {
        return {
          ...common,
          size: fs.statSync(artifactPath).size,
          sha256: sha256File(artifactPath)
        };
      }
      if (entry.isDirectory()) {
        return { ...common, ...directoryMetadata(artifactPath) };
      }
      return common;
    })
    .filter(Boolean)
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function matrixRecoveryCommand(matrixDirectory, planId, chunkId) {
  const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
  return [
    "node backend/scripts/aurora-tile-add-connect-matrix.mjs capture",
    "--out-directory", quote(matrixDirectory),
    "--plan-id", quote(planId),
    "--chunk-id", quote(chunkId)
  ].join(" ");
}

/**
 * Classifies an interrupted matrix capture without promoting partial evidence.
 * The checkpoint and every capture artifact remain immutable; a retry receives
 * a new attempt stem from the matrix controller.
 */
export function inspectMatrixCaptureRecovery(matrixDirectory, {
  now = new Date(),
  heartbeatStaleMs = 90_000,
  processProbe = defaultProcessProbe
} = {}) {
  const resolvedMatrixDirectory = path.resolve(matrixDirectory);
  const heartbeatPath = path.join(resolvedMatrixDirectory, "heartbeat.json");
  const checkpointPath = path.join(resolvedMatrixDirectory, "checkpoint.json");
  const manifestPath = path.join(resolvedMatrixDirectory, "manifest.json");
  const heartbeat = readJsonIfPresent(heartbeatPath);
  const checkpoint = readJsonIfPresent(checkpointPath);
  const manifest = readJsonIfPresent(manifestPath);
  const chunkId = typeof heartbeat?.chunk?.id === "string" ? heartbeat.chunk.id : null;
  const nextChunkIndex = Number(checkpoint?.nextChunkIndex);
  const capturedChunkIds = Array.isArray(checkpoint?.capturedChunkIds)
    ? checkpoint.capturedChunkIds.map(String)
    : [];
  const expectedChunk = Number.isInteger(nextChunkIndex)
    ? manifest?.chunks?.[nextChunkIndex] ?? null
    : null;
  const persistedChunkPath = chunkId
    ? path.join(resolvedMatrixDirectory, "chunks", `${chunkId}.json`)
    : null;
  const persistedChunk = persistedChunkPath ? readJsonIfPresent(persistedChunkPath) : null;
  const updatedAt = toDateOrNull(heartbeat?.updatedAt);
  const stale = heartbeat?.phase === "capturing" &&
    (!updatedAt || now.getTime() - updatedAt.getTime() > heartbeatStaleMs);
  const partialArtifacts = chunkId
    ? inventoryPartialCaptureArtifacts(path.join(resolvedMatrixDirectory, "captures"), chunkId)
    : [];
  const lifecycleArtifacts = partialArtifacts.filter((entry) => entry.kind === "lifecycle");
  const lifecycleTraces = lifecycleArtifacts.map((artifact) => {
    const absolutePath = path.join(resolvedMatrixDirectory, artifact.relativePath);
    return { artifact, ...parseLifecycleTrace(absolutePath) };
  });
  const lifecycleEntries = lifecycleTraces.flatMap((trace) => trace.entries);
  const lifecycleInvalidLines = lifecycleTraces.flatMap((trace) =>
    trace.invalidLines.map((entry) => ({ path: trace.artifact.relativePath, ...entry }))
  );
  const recordedProcesses = [];
  for (const entry of lifecycleEntries) {
    const role = entry?.event === "runner-started"
      ? "capture_runner"
      : entry?.event === "chrome-spawned"
        ? "capture_chrome"
        : null;
    if (!role || !Number.isInteger(entry?.pid) || entry.pid < 1) continue;
    const key = `${role}:${entry.pid}`;
    if (recordedProcesses.some((processEntry) => processEntry.key === key)) continue;
    let alive = null;
    let probeError = null;
    try {
      alive = processProbe(entry.pid) === true;
    } catch (error) {
      probeError = error instanceof Error ? error.message : String(error);
    }
    recordedProcesses.push({ key, role, pid: entry.pid, alive, probeError });
  }
  const blockerCodes = [];
  const block = (condition, code) => { if (condition) blockerCodes.push(code); };
  block(heartbeat?.schema !== MATRIX_HEARTBEAT_SCHEMA, "HEARTBEAT_SCHEMA_INVALID");
  block(heartbeat?.phase !== "capturing", "HEARTBEAT_PHASE_NOT_CAPTURING");
  block(!stale, "CAPTURING_HEARTBEAT_NOT_STALE");
  block(checkpoint?.schema !== MATRIX_CHECKPOINT_SCHEMA, "CHECKPOINT_SCHEMA_INVALID");
  block(manifest?.schema !== MATRIX_MANIFEST_SCHEMA, "MANIFEST_SCHEMA_INVALID");
  block(!chunkId, "HEARTBEAT_CHUNK_ID_MISSING");
  block(!Number.isInteger(nextChunkIndex) || nextChunkIndex < 0, "CHECKPOINT_CURSOR_INVALID");
  block(new Set(capturedChunkIds).size !== capturedChunkIds.length, "CHECKPOINT_CAPTURE_IDS_DUPLICATED");
  block(capturedChunkIds.length !== nextChunkIndex, "CHECKPOINT_CAPTURE_COUNT_MISMATCH");
  block(chunkId != null && capturedChunkIds.includes(chunkId), "HEARTBEAT_CHUNK_ALREADY_COUNTED");
  block(checkpoint?.pendingCapture != null, "PENDING_CAPTURE_PRESENT");
  block(expectedChunk?.id !== chunkId, "CHECKPOINT_NEXT_CHUNK_MISMATCH");
  block(persistedChunk?.id !== chunkId, "PERSISTED_CHUNK_MISMATCH");
  block(
    persistedChunk?.definitionFingerprint !== heartbeat?.chunk?.definitionFingerprint,
    "PERSISTED_CHUNK_FINGERPRINT_MISMATCH"
  );
  for (const [left, right] of [
    [heartbeat?.planBinding?.planId, checkpoint?.planId],
    [heartbeat?.manifestSha256, checkpoint?.manifestSha256],
    [heartbeat?.planBinding?.manifestSchema, checkpoint?.manifestSchema],
    [heartbeat?.planBinding?.contractRevision, checkpoint?.contractRevision],
    [heartbeat?.planBinding?.contractFingerprint, checkpoint?.contractFingerprint],
    [manifest?.schema, checkpoint?.manifestSchema],
    [manifest?.contract?.revision, checkpoint?.contractRevision],
    [manifest?.contract?.fingerprint, checkpoint?.contractFingerprint]
  ]) {
    block(typeof left !== "string" || !left || left !== right, "PLAN_BINDING_MISMATCH");
  }
  block(heartbeat?.checkpoint?.nextChunkIndex !== nextChunkIndex, "HEARTBEAT_CURSOR_MISMATCH");
  block(lifecycleArtifacts.length === 0, "LIFECYCLE_TRACE_MISSING");
  block(lifecycleInvalidLines.length > 0, "LIFECYCLE_TRACE_INVALID");
  block(
    lifecycleEntries.some((entry) => entry?.event === "runner-started" && entry?.fileStem !== chunkId),
    "LIFECYCLE_CHUNK_MISMATCH"
  );
  block(
    lifecycleEntries.some((entry) => TERMINAL_CAPTURE_EVENTS.has(String(entry?.event ?? ""))),
    "LIFECYCLE_TERMINAL_STATE_PRESENT"
  );
  block(!recordedProcesses.some((entry) => entry.role === "capture_runner"), "RUNNER_PROCESS_ID_MISSING");
  block(recordedProcesses.some((entry) => entry.probeError != null), "PROCESS_LIVENESS_PROBE_FAILED");
  block(recordedProcesses.some((entry) => entry.alive === true), "RECORDED_PROCESS_STILL_LIVE");
  const uniqueBlockerCodes = [...new Set(blockerCodes)].sort();
  const onlyLiveProcessBlocker =
    uniqueBlockerCodes.length === 1 && uniqueBlockerCodes[0] === "RECORDED_PROCESS_STILL_LIVE";
  const safeToResume = uniqueBlockerCodes.length === 0;
  const evidenceFingerprint = sha256Json({
    heartbeatSha256: fs.existsSync(heartbeatPath) ? sha256File(heartbeatPath) : null,
    checkpointSha256: fs.existsSync(checkpointPath) ? sha256File(checkpointPath) : null,
    manifestSha256: fs.existsSync(manifestPath) ? sha256File(manifestPath) : null,
    persistedChunkSha256:
      persistedChunkPath && fs.existsSync(persistedChunkPath) ? sha256File(persistedChunkPath) : null,
    partialArtifacts
  });

  return {
    schema: MATRIX_RECOVERY_SCHEMA,
    evaluatedAt: now.toISOString(),
    matrixDirectory: resolvedMatrixDirectory,
    evidenceFingerprint,
    status: safeToResume
      ? "interrupted_capture_retryable"
      : onlyLiveProcessBlocker
        ? "blocked_live_recorded_process"
        : "blocked_recovery_invariant",
    safeToResume,
    blockerCodes: uniqueBlockerCodes,
    planBinding: {
      planId: checkpoint?.planId ?? null,
      manifestSchema: checkpoint?.manifestSchema ?? null,
      contractRevision: checkpoint?.contractRevision ?? null,
      contractFingerprint: checkpoint?.contractFingerprint ?? null
    },
    heartbeat: {
      path: heartbeatPath,
      sha256: fs.existsSync(heartbeatPath) ? sha256File(heartbeatPath) : null,
      phase: heartbeat?.phase ?? null,
      updatedAt: updatedAt?.toISOString() ?? null,
      stale,
      staleAfterMs: heartbeatStaleMs,
      chunkId
    },
    checkpoint: {
      path: checkpointPath,
      sha256: fs.existsSync(checkpointPath) ? sha256File(checkpointPath) : null,
      nextChunkIndex: Number.isInteger(nextChunkIndex) ? nextChunkIndex : null,
      capturedChunkCount: capturedChunkIds.length,
      chunkAlreadyCounted: chunkId != null && capturedChunkIds.includes(chunkId),
      pendingCapturePresent: checkpoint?.pendingCapture != null,
      mutation: "none",
      countDelta: 0
    },
    lifecycle: {
      traceCount: lifecycleTraces.length,
      entryCount: lifecycleEntries.length,
      invalidLines: lifecycleInvalidLines,
      lastEvent: lifecycleEntries.at(-1)?.event ?? null,
      terminalEventPresent: lifecycleEntries.some((entry) =>
        TERMINAL_CAPTURE_EVENTS.has(String(entry?.event ?? ""))
      )
    },
    ownership: {
      recordedProcesses: recordedProcesses.map(({ key: ignoredKey, ...entry }) => entry),
      noLiveRecordedProcess:
        recordedProcesses.length > 0 && recordedProcesses.every((entry) => entry.alive === false)
    },
    partialArtifacts: {
      disposition: "preserve_immutable_and_retry_with_new_attempt_id",
      count: partialArtifacts.length,
      items: partialArtifacts
    },
    nextAction: safeToResume
      ? {
          kind: "resume_exact_matrix_chunk",
          chunkId,
          expectedNextChunkIndex: nextChunkIndex,
          safeCommand: matrixRecoveryCommand(resolvedMatrixDirectory, checkpoint.planId, chunkId)
        }
      : {
          kind: "stop_and_investigate",
          chunkId,
          expectedNextChunkIndex: Number.isInteger(nextChunkIndex) ? nextChunkIndex : null,
          safeCommand: null
        }
  };
}

/**
 * Persists one immutable, idempotent reconciliation record. It intentionally
 * does not rewrite the matrix heartbeat, checkpoint, lifecycle, or partial
 * browser artifacts.
 */
export function reconcileMatrixCaptureRecovery(matrixDirectory, {
  execute = false,
  controlDirectory = DEFAULT_CONTROL_DIRECTORY,
  now = new Date(),
  heartbeatStaleMs = 90_000,
  processProbe = defaultProcessProbe
} = {}) {
  const classification = inspectMatrixCaptureRecovery(matrixDirectory, {
    now,
    heartbeatStaleMs,
    processProbe
  });
  if (!execute) {
    return {
      ...classification,
      reconciliation: { execute: false, persisted: false, reused: false, artifactPath: null }
    };
  }
  if (!classification.safeToResume) {
    throw new Error(`Matrix capture recovery is blocked: ${classification.blockerCodes.join(", ")}.`);
  }
  const recoveryId = sha256Json({
    schema: MATRIX_RECOVERY_RECORD_SCHEMA,
    evidenceFingerprint: classification.evidenceFingerprint,
    planId: classification.planBinding.planId,
    chunkId: classification.heartbeat.chunkId,
    nextChunkIndex: classification.checkpoint.nextChunkIndex
  });
  const recoveryRoot = path.resolve(controlDirectory, "matrix-capture-recovery");
  const recoveryDirectory = path.join(recoveryRoot, recoveryId);
  const artifactPath = path.join(recoveryDirectory, "recovery-record.json");
  fs.mkdirSync(recoveryRoot, { recursive: true });
  let ownsRecoveryDirectory = false;
  try {
    fs.mkdirSync(recoveryDirectory);
    ownsRecoveryDirectory = true;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }
  if (!ownsRecoveryDirectory) {
    const existing = readJsonIfPresent(artifactPath);
    if (
      existing?.schema !== MATRIX_RECOVERY_RECORD_SCHEMA ||
      existing?.recoveryId !== recoveryId ||
      existing?.evidenceFingerprint !== classification.evidenceFingerprint
    ) {
      throw new Error(`Existing matrix recovery record is missing or conflicts: ${artifactPath}`);
    }
    return {
      ...classification,
      reconciliation: { execute: true, persisted: true, reused: true, recoveryId, artifactPath }
    };
  }
  const record = {
    schema: MATRIX_RECOVERY_RECORD_SCHEMA,
    recoveryId,
    recordedAt: now.toISOString(),
    evidenceFingerprint: classification.evidenceFingerprint,
    matrixDirectory: classification.matrixDirectory,
    planBinding: classification.planBinding,
    chunkId: classification.heartbeat.chunkId,
    checkpoint: classification.checkpoint,
    heartbeat: classification.heartbeat,
    lifecycle: classification.lifecycle,
    ownership: classification.ownership,
    partialArtifacts: classification.partialArtifacts,
    invariants: {
      checkpointMutation: "none",
      acceptedCoverageDelta: 0,
      pathConnectCoverageDelta: 0,
      partialEvidencePromoted: false
    },
    nextAction: classification.nextAction
  };
  writeJsonAtomic(artifactPath, record);
  return {
    ...classification,
    reconciliation: { execute: true, persisted: true, reused: false, recoveryId, artifactPath }
  };
}

export function buildAgentStatus({
  checkpoint,
  summary,
  heartbeat,
  proofGates,
  now = new Date(),
  heartbeatStaleMs = 90_000
}) {
  const totalRuntimeTileIds = Array.isArray(checkpoint?.uniqueRuntimeTileIds)
    ? checkpoint.uniqueRuntimeTileIds.length
    : Number(summary?.totals?.uniqueRuntimeTileIds ?? 0);
  const cursor = Number(checkpoint?.cursor ?? 0);
  const updatedAt = toDateOrNull(heartbeat?.timing?.updatedAt);
  const active = ACTIVE_HEARTBEAT_PHASES.has(String(heartbeat?.phase ?? ""));
  const stale = active && (!updatedAt || now.getTime() - updatedAt.getTime() > heartbeatStaleMs);
  const gates = Array.isArray(proofGates) ? proofGates : [];
  const acceptedProofs = gates.filter((entry) => entry?.artifact?.accepted === true).length;
  const rejectedProofs = gates.length - acceptedProofs;
  const complete = summary?.complete === true;
  const blockedEntries = Number(summary?.totals?.blockedEntries ?? 0);
  const retryPendingEntries = Number(summary?.totals?.retryPendingEntries ?? 0);

  let nextAction;
  if (stale || !complete || retryPendingEntries > 0) {
    nextAction = {
      kind: "resume_contract_sweep",
      reason: stale
        ? "ACTIVE_HEARTBEAT_STALE"
        : retryPendingEntries > 0
          ? "RETRY_PENDING_CONTRACTS"
          : "CONTRACT_SWEEP_INCOMPLETE",
      safeCommand: "contract-next --batch-budget 1 --execute"
    };
  } else if (rejectedProofs > 0) {
    nextAction = {
      kind: "inspect_proof_rejections",
      reason: "PROOF_GATE_REJECTED",
      safeCommand: "status"
    };
  } else if (blockedEntries > 0) {
    nextAction = {
      kind: "investigate_blockers",
      reason: "NON_RETRYABLE_CONTRACT_BLOCKERS",
      safeCommand: "status"
    };
  } else if (acceptedProofs < totalRuntimeTileIds) {
    nextAction = {
      kind: "capture_visual_proof",
      reason: "VISUAL_PROOF_COVERAGE_INCOMPLETE",
      safeCommand: "gate --frame <captured.frame.json>"
    };
  } else {
    nextAction = {
      kind: "goal_complete_candidate",
      reason: "CONTRACT_AND_VISUAL_GATES_ACCEPTED",
      safeCommand: "status"
    };
  }

  return {
    schema: STATUS_SCHEMA,
    generatedAt: now.toISOString(),
    contractSweep: {
      complete,
      cursor,
      totalRuntimeTileIds,
      progressRatio: totalRuntimeTileIds > 0 ? cursor / totalRuntimeTileIds : null,
      processedEntries: Number(summary?.totals?.processedEntries ?? 0),
      tilesetEntries: Number(summary?.totals?.tilesetEntries ?? 0),
      blockedEntries,
      retryPendingEntries
    },
    heartbeat: {
      phase: heartbeat?.phase ?? null,
      updatedAt: updatedAt?.toISOString() ?? null,
      active,
      stale,
      staleAfterMs: heartbeatStaleMs
    },
    blockers: groupBlockers(summary?.blockedSample),
    visualProofGates: {
      total: gates.length,
      accepted: acceptedProofs,
      rejected: rejectedProofs,
      requiredForFullTileCoverage: totalRuntimeTileIds
    },
    nextAction
  };
}

function readControlInputs(sweepDirectory, controlDirectory) {
  return {
    checkpoint: readJsonIfPresent(path.join(sweepDirectory, "checkpoint.json")),
    summary: readJsonIfPresent(path.join(sweepDirectory, "summary.json")),
    heartbeat: readJsonIfPresent(path.join(sweepDirectory, "runtime-heartbeat.json")),
    proofGates: readGateArtifacts(controlDirectory)
  };
}

function createProofGateArtifact(framePath, frame, result) {
  const sourcePath = path.resolve(framePath);
  const sourceSha256 = createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex");
  return {
    schema: GATE_SCHEMA,
    generatedAt: new Date().toISOString(),
    sourceFrame: {
      path: sourcePath,
      sha256: sourceSha256,
      capturedAt: frame?.capturedAt ?? null,
      requestedRoute: frame?.requestedRoute ?? null,
      finalRoute: frame?.finalRoute ?? null,
      runtimeCanvasPath: frame?.runtimeCanvasScreenshot?.path ?? null
    },
    ...result
  };
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function help() {
  process.stdout.write(`Usage: node backend/scripts/aurora-tile-agent-control.mjs <command> [options]\n\n` +
    `Commands:\n` +
    `  status [--sweep-directory <path>] [--control-directory <path>]\n` +
    `  gate --frame <capture.frame.json> [--control-directory <path>]\n` +
    `  contract-next --definition-catalog <catalog.json> --definition-catalog-sha256 <sha256> ` +
      `[--batch-budget <n>] [--batch-size <n>] [--request-concurrency <n>] [--execute]\n` +
    `  matrix-reconcile --matrix-directory <path> [--heartbeat-stale-ms <n>] [--control-directory <path>] [--execute]\n`);
}

function runContractNext(args, sweepDirectory, controlDirectory) {
  const batchBudget = positiveInteger(args["batch-budget"], "--batch-budget", 1);
  const batchSize = positiveInteger(args["batch-size"], "--batch-size", 10);
  const requestConcurrency = positiveInteger(args["request-concurrency"], "--request-concurrency", 2);
  const definitionCatalog = path.resolve(
    process.cwd(),
    requiredStringOption(args, "definition-catalog")
  );
  const definitionCatalogSha256 = requiredStringOption(
    args,
    "definition-catalog-sha256"
  ).toLowerCase();
  if (!SHA256.test(definitionCatalogSha256)) {
    throw new Error("--definition-catalog-sha256 must be an exact lowercase SHA-256.");
  }
  const auditScript = path.join(scriptDirectory, "audit-all-runtime-tile-contracts.mjs");
  const runnerArgs = [
    auditScript,
    "--out-directory", sweepDirectory,
    "--max-batches", String(batchBudget),
    "--batch-size", String(batchSize),
    "--request-concurrency", String(requestConcurrency),
    "--definition-catalog", definitionCatalog,
    "--definition-catalog-sha256", definitionCatalogSha256
  ];
  const plan = {
    command: process.execPath,
    args: runnerArgs,
    writes: [
      path.join(sweepDirectory, "checkpoint.json"),
      path.join(sweepDirectory, "entries.json"),
      path.join(sweepDirectory, "summary.json"),
      path.join(sweepDirectory, "runtime-heartbeat.json")
    ]
  };
  if (args.execute !== true) {
    print({ schema: "aurora-agent-contract-next-plan/v1", execute: false, plan });
    return;
  }
  const result = spawnSync(process.execPath, runnerArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024
  });
  const inputs = readControlInputs(sweepDirectory, controlDirectory);
  print({
    schema: "aurora-agent-contract-next-result/v1",
    execute: true,
    runner: {
      status: result.status,
      signal: result.signal,
      error: result.error instanceof Error ? result.error.message : null,
      stderrTail: String(result.stderr ?? "").trim().slice(-4000)
    },
    status: buildAgentStatus(inputs)
  });
  process.exitCode = result.status ?? 1;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] ?? "status";
  if (args.help === true || command === "help") {
    help();
    return;
  }
  const sweepDirectory = resolveOptionPath(args["sweep-directory"], DEFAULT_SWEEP_DIRECTORY);
  const controlDirectory = resolveOptionPath(args["control-directory"], DEFAULT_CONTROL_DIRECTORY);

  if (command === "matrix-reconcile") {
    if (typeof args["matrix-directory"] !== "string" || !args["matrix-directory"].trim()) {
      throw new Error("matrix-reconcile requires --matrix-directory <path>.");
    }
    const matrixDirectory = path.resolve(process.cwd(), args["matrix-directory"]);
    const heartbeatStaleMs = positiveInteger(args["heartbeat-stale-ms"], "--heartbeat-stale-ms", 90_000);
    const result = reconcileMatrixCaptureRecovery(matrixDirectory, {
      execute: args.execute === true,
      controlDirectory,
      heartbeatStaleMs
    });
    print(result);
    if (!result.safeToResume) process.exitCode = 2;
    return;
  }
  if (command === "status") {
    const heartbeatStaleMs = positiveInteger(args["heartbeat-stale-ms"], "--heartbeat-stale-ms", 90_000);
    print(buildAgentStatus({
      ...readControlInputs(sweepDirectory, controlDirectory),
      heartbeatStaleMs
    }));
    return;
  }
  if (command === "gate") {
    if (typeof args.frame !== "string" || !args.frame.trim()) {
      throw new Error("gate requires --frame <capture.frame.json>.");
    }
    const framePath = path.resolve(process.cwd(), args.frame);
    const frame = readJsonIfPresent(framePath);
    if (!frame) throw new Error(`Frame does not exist: ${framePath}`);
    const result = evaluateProofFrame(frame);
    const artifact = createProofGateArtifact(framePath, frame, result);
    const artifactId = createHash("sha256").update(framePath).digest("hex").slice(0, 16);
    const artifactPath = path.join(controlDirectory, `${artifactId}.proof-gate.json`);
    writeJsonAtomic(artifactPath, artifact);
    print({ ...artifact, artifactPath });
    process.exitCode = artifact.accepted ? 0 : 2;
    return;
  }
  if (command === "contract-next") {
    runContractNext(args, sweepDirectory, controlDirectory);
    return;
  }
  throw new Error(`Unsupported command: ${command}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    print({
      schema: "aurora-agent-control-error/v1",
      error: {
        code: "AGENT_CONTROL_INVALID_REQUEST",
        message: error instanceof Error ? error.message : String(error)
      }
    });
    process.exitCode = 1;
  }
}
