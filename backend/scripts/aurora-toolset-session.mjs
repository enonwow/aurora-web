#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  blockToolsetSession,
  claimModuleLoad,
  closeToolsetSession,
  createToolsetSession,
  inspectToolsetSessionLiveness,
  markAreaReady,
  markModuleReady,
  recordAreaCapture,
  recordSceneObservation,
  recordProofPacket,
  recordTilePropertyReadback,
  recordStartupLoadSignal,
  recordToolsetProcessStart,
  recordViewportTargetEvaluation,
} from "./lib/aurora-toolset-session-state.mjs";
import { TOOLSET_APPROVED_PROOF_WINDOW_LEFT } from "./lib/toolset-startup-load-plan.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const defaultModulePath =
  "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\the_last_city - codex.mod";
const defaultModuleSha256 = "B774037F160A9BE3FCC0E985DDE880A0AE97E10AF2BF868C38A3F6573CBB021E";
const defaultQueuePath = resolve(repoRoot, ".codex-tmp/area-audit-queue-20260710/manifest.json");
const defaultOutDir = resolve(repoRoot, ".codex-tmp/area-toolset-oracle-20260710");
const openerPath = resolve(scriptDir, "open-last-city-module-and-area-toolset-no-global-input.mjs");
const queueRunnerPath = resolve(scriptDir, "run-toolset-area-oracle-queue.mjs");
const closePath = resolve(scriptDir, "close-aurora-toolset-window-no-global-input.mjs");
const blockerCapturePath = resolve(scriptDir, "capture-aurora-toolset-blocker-dialog.mjs");
const observerPath = resolve(scriptDir, "observe-aurora-toolset-scene.mjs");
const tileLayoutInspectorPath = resolve(scriptDir, "inspect-last-city-area-tile-layout.mjs");
const viewportTargetEvaluatorPath = resolve(scriptDir, "evaluate-aurora-toolset-viewport-target.mjs");
const tilePropertiesInspectorPath = resolve(scriptDir, "inspect-aurora-toolset-tile-properties.mjs");
const proofPacketAssemblerPath = resolve(scriptDir, "assemble-aurora-toolset-proof-packet.mjs");
const guardPath = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-module-open-session-guard.json",
);

const [command = "status", ...rawArgs] = process.argv.slice(2);
const options = parseArgs(rawArgs);
const profileName = String(options.profile ?? "last-city");
const approvedProfiles = {
  "last-city": {
    modulePath: defaultModulePath,
    expectedSha256: defaultModuleSha256,
    queuePath: defaultQueuePath,
    outDir: defaultOutDir,
    expectedModule: "the_last_city - codex.mod",
    expectedModuleParts: "the_last_city|codex.mod",
    expectedArea: "cdx_mapflat01",
    expectedAreaName: "Ostatnie Miasto - Port, Mieszkanie Kartografa",
  },
};
const profile = approvedProfiles[profileName];
if (!profile) {
  throw workflowError(
    "UNKNOWN_APPROVED_TOOLSET_PROFILE",
    `Unknown profile ${profileName}. Approved profiles: ${Object.keys(approvedProfiles).join(", ")}.`,
  );
}
const configuredOutDir = resolve(String(options.outDir ?? profile.outDir));
const config = {
  profileName,
  profile,
  modulePath: resolve(String(options.modulePath ?? profile.modulePath)),
  expectedSha256: String(options.expectedSha256 ?? profile.expectedSha256).toUpperCase(),
  queuePath: resolve(String(options.queue ?? profile.queuePath)),
  outDir: configuredOutDir,
  statePath: resolve(String(options.statePath ?? resolve(configuredOutDir, "session-state.json"))),
  expectedModuleParts: String(options.expectedModuleParts ?? profile.expectedModuleParts),
  expectedModule: String(options.expectedModule ?? profile.expectedModule),
  expectedArea: String(options.area ?? profile.expectedArea),
  expectedAreaName: String(options.areaName ?? profile.expectedAreaName),
  settleMs: nonNegativeInteger(options.settleMs ?? 0, "--settleMs"),
  startupPassiveObservationMs: nonNegativeInteger(
    options.startupPassiveObservationMs ?? 0,
    "--startupPassiveObservationMs",
  ),
  wheelSteps: integer(options.wheelSteps ?? 0, "--wheelSteps"),
  limit: optionalPositiveInteger(options.limit, "--limit"),
  offset: nonNegativeInteger(options.offset ?? 0, "--offset"),
  captureAreas: !(
    options.capture === "false" || options.capture === "0" || options.capture === false
  ),
  continueAreaNavigation:
    options.continueAreaNavigation === "true" ||
    options.continueAreaNavigation === "1" ||
    options.continueAreaNavigation === true,
  proofWindowLeft: TOOLSET_APPROVED_PROOF_WINDOW_LEFT,
  proofWindowTop: 0,
};

try {
  const result = runCommand(command);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const failure = {
    ok: false,
    command,
    blockerCode: error?.code ?? "aurora_toolset_session_exception",
    message: error instanceof Error ? error.message : String(error),
    statePath: config.statePath,
  };
  console.log(JSON.stringify(failure, null, 2));
  process.exitCode = 2;
}

function runCommand(name) {
  switch (name) {
    case "preflight":
      return runPreflight();
    case "open":
      return runOpen();
    case "run-queue":
      return runQueue();
    case "observe":
      return runObserve();
    case "read-tile-properties":
      return runReadTileProperties();
    case "verify-viewport-target":
      return runVerifyViewportTarget();
    case "assemble-proof-packet":
      return runAssembleProofPacket();
    case "reconcile":
      return runReconcile();
    case "close":
      return runClose();
    case "all":
      return runAll();
    case "status": {
      const state = readState();
      const processes = readToolsetProcesses();
      return { ok: true, command: name, state, processes, sessionLiveness: inspectToolsetSessionLiveness(state, processes) };
    }
    default:
      throw workflowError(
        "UNKNOWN_TOOLSET_SESSION_COMMAND",
        `Unknown command ${name}. Use preflight, open, run-queue, observe, read-tile-properties, verify-viewport-target, assemble-proof-packet, reconcile, close, all, or status.`,
      );
  }
}

function runReconcile() {
  let state = readState();
  const processes = readToolsetProcesses();
  const sessionLiveness = inspectToolsetSessionLiveness(state, processes);
  if (!state || sessionLiveness.status === "no_state" || sessionLiveness.status === "inactive") {
    return { ok: true, command: "reconcile", state, processes, sessionLiveness, changed: false };
  }
  if (sessionLiveness.status === "live") {
    throw workflowError("TOOLSET_SESSION_RECONCILE_REQUIRES_CLOSE", "A live Toolset session cannot be reconciled. Use close after the current operation.");
  }
  state = blockToolsetSession(state, {
    code: sessionLiveness.blockerCode,
    details: { reason: sessionLiveness.reason, processes },
  });
  writeState(state);
  releaseLegacyGuard(sessionLiveness.blockerCode);
  return { ok: true, command: "reconcile", state, processes, sessionLiveness, changed: true };
}

function runObserve() {
  let state = requireStatePhase("area_ready");
  const processes = readToolsetProcesses();
  if (processes.length !== 1) {
    throw workflowError("TOOLSET_OBSERVATION_REQUIRES_ONE_PROCESS", "Observation requires exactly one live Toolset process in an area_ready session.");
  }
  const sourceModulePath = requiredExistingPath(options.sourceModulePath, "--sourceModulePath");
  const area = state.currentArea?.resref;
  if (!area) throw workflowError("TOOLSET_OBSERVATION_AREA_MISSING", "Observation requires a current Area.");
  const outDir = resolve(config.outDir, "observations", `${area}-${timestampSegment()}`);
  const observation = runJson(
    observerPath,
    ["--module", config.expectedModule, "--area", area, "--sourceModulePath", sourceModulePath, "--outDir", outDir],
    180_000,
    true,
  );
  const observationPath = observation.observationPath;
  if (!observationPath || !existsSync(observationPath)) {
    throw workflowError("TOOLSET_OBSERVATION_ARTIFACT_MISSING", "Observer did not produce scene-observation.json.");
  }
  state = recordSceneObservation(state, { resref: area, observationPath, status: observation.status });
  writeState(state);
  return { ok: true, command: "observe", statePath: config.statePath, state, observation };
}

function runVerifyViewportTarget() {
  let state = requireStatePhase("area_ready");
  const area = state.currentArea?.resref;
  if (!area) throw workflowError("VIEWPORT_TARGET_AREA_MISSING", "Viewport target verification requires a current Area.");
  const observationPath = resolveViewportTargetObservation(state);
  const targetDir = resolve(config.outDir, "viewport-targets", `${area}-${timestampSegment()}`);
  mkdirSync(targetDir, { recursive: true });
  const tileLayoutPath = resolve(targetDir, "tile-layout.json");
  runJson(
    tileLayoutInspectorPath,
    ["--modulePath", state.modulePath, "--area", area, "--out", tileLayoutPath],
    120_000,
    true,
  );
  const reportPath = resolve(targetDir, "viewport-target.json");
  const args = ["--tileLayout", tileLayoutPath, "--observation", observationPath, "--out", reportPath];
  appendRequiredOption(args, "tileIndex", "--tileIndex");
  appendRequiredOption(args, "tileX", "--tileX");
  appendRequiredOption(args, "tileY", "--tileY");
  appendOptionalOption(args, "tileId", "--tileId");
  appendOptionalOption(args, "orientation", "--orientation");
  appendRequiredOption(args, "yawDegrees", "--yawDegrees");
  appendRequiredOption(args, "pitchDegrees", "--pitchDegrees");
  appendRequiredOption(args, "zoomPixelsPerTile", "--zoomPixelsPerTile");
  appendOptionalOption(args, "yawTolerance", "--yawTolerance");
  appendOptionalOption(args, "pitchTolerance", "--pitchTolerance");
  appendOptionalOption(args, "zoomToleranceRatio", "--zoomToleranceRatio");
  appendOptionalOption(args, "centerTolerancePixels", "--centerTolerancePixels");
  const selectionReadbackPath = options.selectionReadback
    ? requiredExistingPath(options.selectionReadback, "--selectionReadback")
    : resolveLatestTilePropertyReadback(state);
  if (selectionReadbackPath) args.push("--selectionReadback", selectionReadbackPath);
  const evaluation = runJson(viewportTargetEvaluatorPath, args, 120_000, true);
  if (!existsSync(reportPath)) {
    throw workflowError("VIEWPORT_TARGET_REPORT_MISSING", "Viewport target evaluator did not produce a report.");
  }
  state = recordViewportTargetEvaluation(state, {
    resref: area,
    reportPath,
    status: evaluation.status,
    blockerCodes: evaluation.blockerCodes,
  });
  writeState(state);
  if (evaluation.status !== "verified") {
    throw workflowError("VIEWPORT_TARGET_UNVERIFIED", JSON.stringify({ reportPath, blockerCodes: evaluation.blockerCodes }));
  }
  return { ok: true, command: "verify-viewport-target", statePath: config.statePath, state, evaluation };
}

function runReadTileProperties() {
  let state = requireStatePhase("area_ready");
  const processes = readToolsetProcesses();
  if (processes.length !== 1) {
    throw workflowError("TOOLSET_TILE_READBACK_REQUIRES_ONE_PROCESS", "Tile Properties readback requires exactly one live Toolset process in an area_ready session.");
  }
  const area = state.currentArea?.resref;
  if (!area) throw workflowError("TOOLSET_TILE_READBACK_AREA_MISSING", "Tile Properties readback requires a current Area.");
  const outPath = resolve(config.outDir, "tile-properties", `${area}-${timestampSegment()}.json`);
  const inspection = runJson(tilePropertiesInspectorPath, ["inspect", "--module", config.expectedModule, "--area", area, "--out", outPath], 60_000, true);
  if (!existsSync(outPath)) throw workflowError("TOOLSET_TILE_READBACK_ARTIFACT_MISSING", "Tile Properties inspector did not produce its artifact.");
  state = recordTilePropertyReadback(state, {
    resref: area,
    readbackPath: outPath,
    status: inspection.status,
    blockerCode: inspection.blockerCode ?? null,
  });
  writeState(state);
  if (inspection.status !== "verified") {
    throw workflowError("TOOLSET_TILE_READBACK_UNVERIFIED", JSON.stringify({ readbackPath: outPath, blockerCode: inspection.blockerCode ?? null }));
  }
  return { ok: true, command: "read-tile-properties", statePath: config.statePath, state, inspection, readbackPath: outPath };
}

function runAssembleProofPacket() {
  let state = requireStatePhase("area_ready");
  const area = state.currentArea?.resref;
  if (!area) throw workflowError("PROOF_PACKET_AREA_MISSING", "Proof packet requires a current Area.");
  const observationPath = resolveViewportTargetObservation(state);
  const targetReportPath = resolveLatestViewportTargetReport(state);
  const tileReadbackPath = resolveLatestTilePropertyReadback(state);
  const monitorEvidencePath = requiredExistingPath(options.monitorEvidence, "--monitorEvidence");
  const packetPath = resolve(config.outDir, "proof-packets", `${area}-${timestampSegment()}.json`);
  const args = ["--session", config.statePath, "--observation", observationPath, "--targetReport", targetReportPath, "--monitorEvidence", monitorEvidencePath, "--out", packetPath];
  if (tileReadbackPath) args.push("--tileReadback", tileReadbackPath);
  const result = runJson(proofPacketAssemblerPath, args, 60_000, true);
  if (!existsSync(packetPath)) throw workflowError("PROOF_PACKET_ARTIFACT_MISSING", "Proof-packet assembler did not produce its artifact.");
  state = recordProofPacket(state, { resref: area, packetPath, status: result.status, blockerCodes: result.blockerCodes ?? [] });
  writeState(state);
  if (result.status !== "verified") throw workflowError("AURORA_PROOF_PACKET_UNVERIFIED", JSON.stringify({ packetPath, blockerCodes: result.blockerCodes ?? [] }));
  return { ok: true, command: "assemble-proof-packet", statePath: config.statePath, state, packetPath, result };
}

function runAll() {
  const preflight = runPreflight();
  const opened = runOpen();
  let queue;
  try {
    queue = runQueue();
  } catch (error) {
    safeCloseAfterFailure(error?.code ?? "queue_failed");
    throw error;
  }
  const closed = runClose();
  return { ok: true, command: "all", preflight, opened, queue, closed };
}

function runPreflight() {
  assertApprovedInputs();
  const existingState = readState();
  if (existingState && !["closed", "blocked"].includes(existingState.phase)) {
    throw workflowError(
      "ACTIVE_TOOLSET_SESSION_EXISTS",
      `Session ${config.statePath} is still ${existingState.phase}; use status or close.`,
    );
  }
  const queue = readQueue();
  const moduleSha256 = sha256(config.modulePath);
  if (moduleSha256 !== config.expectedSha256) {
    throw workflowError(
      "APPROVED_MODULE_HASH_MISMATCH",
      `Expected ${config.expectedSha256}, received ${moduleSha256}.`,
    );
  }

  const preflight = runJson(openerPath, openerArgs({ preflightOnly: true }), 120_000, true);
  if (preflight.ok !== true || preflight.preflightOnly !== true) {
    throw workflowError(
      preflight.blockerCode ?? "TOOLSET_PREFLIGHT_FAILED",
      `Toolset preflight failed: ${JSON.stringify(preflight)}`,
    );
  }

  let state = createToolsetSession({
    modulePath: config.modulePath,
    moduleSha256,
    queuePath: config.queuePath,
    areaCount: queue.length,
  });
  state.preflight = {
    completedAt: new Date().toISOString(),
    exactApprovedModule: true,
    moduleSha256,
    processCount: (preflight.existingToolsetProcesses ?? []).length,
    temp0Exists: preflight.temp0?.exists === true,
    automaticUnsafeOverrides: false,
  };
  writeState(state);
  return { ok: true, command: "preflight", statePath: config.statePath, state, preflight };
}

function runOpen() {
  let state = requireStatePhase("prepared");
  const beforeProcesses = readToolsetProcesses();
  if (beforeProcesses.length !== 0) {
    throw workflowError("TOOLSET_PROCESS_ALREADY_RUNNING", "Open requires zero existing nwtoolset processes.");
  }

  const result = runJson(openerPath, openerArgs({ skipAreaOpen: true }), 360_000, true, {
    AURORA_TOOLSET_CANONICAL_SESSION_ENTRYPOINT: "1",
  });
  const afterProcesses = readToolsetProcesses();
  if (afterProcesses.length > 1) {
    state = blockToolsetSession(state, {
      code: "MULTIPLE_TOOLSET_PROCESSES_DETECTED",
      details: afterProcesses,
    });
    writeState(state);
    safeCloseAfterFailure("multiple_toolset_processes_detected");
    throw workflowError("MULTIPLE_TOOLSET_PROCESSES_DETECTED", "More than one Toolset process exists.");
  }
  if (afterProcesses.length === 1) {
    state = recordToolsetProcessStart(state, {
      pid: afterProcesses[0].Id ?? afterProcesses[0].id ?? null,
      processStartedAt: afterProcesses[0].StartTime ?? afterProcesses[0].startTime ?? null,
    });
  }

  const moduleOpen = result.moduleOpen ?? result;
  const reportedLoadOwner = moduleOpen.moduleLoadOwner;
  if (reportedLoadOwner && !state.moduleLoad.owner) {
    const startupSignal = moduleOpen.startupLoadSignals?.[0];
    state = startupSignal
      ? recordStartupLoadSignal(state, {
          kind: startupSignal.kind,
          details: startupSignal,
          owner: reportedLoadOwner,
        })
      : claimModuleLoad(state, { owner: reportedLoadOwner });
  }
  if (result.ok !== true || moduleOpen.ok !== true) {
    const blockerCapture = captureBlockerDialog();
    state = blockToolsetSession(state, {
      code: result.blockerCode ?? moduleOpen.blockerCode ?? "MODULE_OPEN_FAILED",
      details: { ...result, blockerCapture },
    });
    writeState(state);
    safeCloseAfterFailure(state.blocker.code);
    throw workflowError(state.blocker.code, "The single module load did not reach a clean ready state.");
  }

  const loadOwner = reportedLoadOwner;
  if (!loadOwner) {
    state = blockToolsetSession(state, { code: "MODULE_LOAD_OWNER_MISSING", details: result });
    writeState(state);
    safeCloseAfterFailure("module_load_owner_missing");
    throw workflowError("MODULE_LOAD_OWNER_MISSING", "Opener returned success without a load owner.");
  }
  if (!state.moduleLoad.owner) state = claimModuleLoad(state, { owner: loadOwner });
  state = markModuleReady(state, { windowTitle: moduleOpen.moduleWindowTitle });
  state.openResult = {
    completedAt: new Date().toISOString(),
    moduleLoadOwner: loadOwner,
    moduleOpenActionSubmitted: moduleOpen.moduleOpenActionSubmitted === true,
    moduleOpenActionKind: moduleOpen.moduleOpenActionKind ?? null,
    accessViolationDetected: result.accessViolation?.detected === true,
  };
  writeState(state);
  return { ok: true, command: "open", statePath: config.statePath, state, result };
}

function runQueue() {
  let state;
  if (config.continueAreaNavigation) {
    state = requireStatePhase("area_ready");
    const processes = readToolsetProcesses();
    if (processes.length !== 1 || !state.moduleLoad.owner || !state.currentArea?.resref) {
      throw workflowError(
        "TOOLSET_CONTINUED_AREA_NAVIGATION_NOT_READY",
        "Continued Area navigation requires one live, previously verified Toolset session with a current Area.",
      );
    }
  } else {
    state = requireStatePhase("module_ready");
  }
  mkdirSync(config.outDir, { recursive: true });
  const args = [
    "--queue",
    config.queuePath,
    "--expectedModule",
    config.expectedModule,
    "--expectedModuleParts",
    config.expectedModuleParts,
    "--outDir",
    config.outDir,
    "--settleMs",
    String(config.settleMs),
    "--wheelSteps",
    String(config.wheelSteps),
    "--offset",
    String(config.offset),
  ];
  if (config.limit) args.push("--limit", String(config.limit));
  if (!config.captureAreas) args.push("--capture", "false");
  const summary = runJson(queueRunnerPath, args, 24 * 60 * 60 * 1000, true);
  const queueManifestPath = resolve(config.outDir, "manifest.json");
  const manifest = JSON.parse(readFileSync(queueManifestPath, "utf8"));
  for (const item of manifest.items.filter((entry) => ["captured", "opened"].includes(entry.status))) {
    state = markAreaReady(state, { resref: item.area.resref, name: item.area.name });
    if (item.status === "captured") {
      state = recordAreaCapture(state, {
        resref: item.area.resref,
        pngPath: resolve(repoRoot, item.capture.pngPath ?? item.capture.capture?.pngPath),
      });
    }
  }
  state.queueResult = {
    completedAt: new Date().toISOString(),
    manifestPath: queueManifestPath,
    status: manifest.status,
    summary: manifest.summary,
  };
  if (manifest.status !== "completed") {
    const blocker = manifest.items.find((item) => item.status === "blocked");
    state = blockToolsetSession(state, {
      code: blocker?.blockerCode ?? summary.firstBlocker ?? "AREA_QUEUE_BLOCKED",
      details: blocker ?? summary,
    });
  }
  writeState(state);
  if (state.phase === "blocked") {
    throw workflowError(state.blocker.code, `Area queue stopped at ${state.capturedAreas.length} captures.`);
  }
  return {
    ok: true,
    command: "run-queue",
    statePath: config.statePath,
    continuedAreaNavigation: config.continueAreaNavigation,
    state,
    summary,
  };
}

function runClose() {
  let state = readState();
  const close = runJson(closePath, [], 60_000, true);
  const processes = readToolsetProcesses();
  if (processes.length !== 0) {
    throw workflowError("TOOLSET_CLOSE_INCOMPLETE", `Toolset still has ${processes.length} process(es).`);
  }
  releaseLegacyGuard();
  if (state) {
    state = closeToolsetSession(state);
    state.closeResult = { completedAt: new Date().toISOString(), close };
    writeState(state);
  }
  return { ok: true, command: "close", statePath: config.statePath, state, close, processes };
}

function safeCloseAfterFailure(reason) {
  try {
    runJson(closePath, [], 60_000, true);
    releaseLegacyGuard(reason);
  } catch {
    // The original blocker remains the primary result; close evidence is retained in adapter output when available.
  }
}

function captureBlockerDialog() {
  try {
    const stamp = new Date().toISOString().replace(/[-:]/gu, "").replace(/\..+$/u, "Z");
    return runJson(
      blockerCapturePath,
      ["--outPath", resolve(config.outDir, `toolset-blocker-${stamp}.png`)],
      30_000,
      true,
    );
  } catch (error) {
    return { ok: false, blockerCode: "toolset_blocker_capture_failed", message: error?.message ?? String(error) };
  }
}

function openerArgs({ preflightOnly = false, skipAreaOpen = false }) {
  const args = [
    "--modulePath",
    config.modulePath,
    "--expectedModuleParts",
    config.expectedModuleParts,
    "--area",
    config.expectedArea,
    "--areaName",
    config.expectedAreaName,
    "--windowLeft",
    String(config.proofWindowLeft),
    "--windowTop",
    String(config.proofWindowTop),
    "--startupPassiveObservationMs",
    String(config.startupPassiveObservationMs),
  ];
  if (preflightOnly) args.push("--preflightOnly", "true");
  if (skipAreaOpen) args.push("--skipAreaOpen", "true");
  return args;
}

function assertApprovedInputs() {
  if (!existsSync(config.modulePath)) {
    throw workflowError("APPROVED_MODULE_MISSING", config.modulePath);
  }
  if (basename(config.modulePath).toLowerCase() !== basename(config.profile.modulePath).toLowerCase()) {
    throw workflowError("UNAPPROVED_MODULE_PATH", config.modulePath);
  }
  if (!existsSync(config.queuePath)) {
    throw workflowError("AREA_QUEUE_MISSING", config.queuePath);
  }
}

function readQueue() {
  const payload = JSON.parse(readFileSync(config.queuePath, "utf8"));
  const items = Array.isArray(payload) ? payload : payload.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw workflowError("AREA_QUEUE_EMPTY", config.queuePath);
  }
  return items;
}

function readToolsetProcesses() {
  const source =
    "@(Get-Process nwtoolset -ErrorAction SilentlyContinue | Select-Object Id,StartTime,MainWindowTitle,Responding) | ConvertTo-Json -Compress";
  const raw = execFileSync("powershell.exe", ["-NoProfile", "-Command", source], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 15_000,
  }).trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
}

function releaseLegacyGuard(reason = "clean_close") {
  if (!existsSync(guardPath)) return;
  const guard = JSON.parse(readFileSync(guardPath, "utf8"));
  const now = new Date().toISOString();
  writeFileSync(
    guardPath,
    `${JSON.stringify({ ...guard, state: "released", blockerCode: null, releasedAt: now, updatedAt: now, releaseReason: reason }, null, 2)}\n`,
    "utf8",
  );
}

function readState() {
  return existsSync(config.statePath) ? JSON.parse(readFileSync(config.statePath, "utf8")) : null;
}

function resolveViewportTargetObservation(state) {
  if (options.observationPath) return requiredExistingPath(options.observationPath, "--observationPath");
  const area = state.currentArea?.resref;
  const observations = Array.isArray(state.observations) ? state.observations : [];
  const latest = [...observations].reverse().find((entry) => entry.resref === area && entry.observationPath);
  if (!latest) {
    throw workflowError("VIEWPORT_TARGET_OBSERVATION_REQUIRED", "Run observe first or provide --observationPath.");
  }
  return requiredExistingPath(latest.observationPath, "stored observationPath");
}

function resolveLatestTilePropertyReadback(state) {
  const area = state.currentArea?.resref;
  const readbacks = Array.isArray(state.tilePropertyReadbacks) ? state.tilePropertyReadbacks : [];
  const latest = [...readbacks].reverse().find((entry) => entry.resref === area && entry.status === "verified" && entry.readbackPath);
  return latest ? requiredExistingPath(latest.readbackPath, "stored tile Properties readback") : null;
}

function resolveLatestViewportTargetReport(state) {
  const area = state.currentArea?.resref;
  const evaluations = Array.isArray(state.viewportTargetEvaluations) ? state.viewportTargetEvaluations : [];
  const latest = [...evaluations].reverse().find((entry) => entry.resref === area && entry.reportPath);
  if (!latest) throw workflowError("PROOF_PACKET_VIEWPORT_TARGET_REQUIRED", "Run verify-viewport-target before assembling a proof packet.");
  return requiredExistingPath(latest.reportPath, "stored viewport target report");
}

function appendRequiredOption(args, optionName, cliName) {
  const value = options[optionName];
  if (value === undefined || value === true || String(value).trim() === "") {
    throw workflowError("VIEWPORT_TARGET_OPTION_REQUIRED", `${cliName} is required for viewport target verification.`);
  }
  args.push(cliName, String(value));
}

function appendOptionalOption(args, optionName, cliName) {
  const value = options[optionName];
  if (value !== undefined && value !== true && String(value).trim() !== "") args.push(cliName, String(value));
}

function requiredExistingPath(value, name) {
  const path = resolve(String(value ?? "").trim());
  if (!value || !existsSync(path)) throw workflowError("TOOLSET_WORKFLOW_INPUT_MISSING", `${name} does not exist: ${path}`);
  return path;
}

function timestampSegment() {
  return new Date().toISOString().replace(/[-:]/gu, "").replace(/\..+$/u, "Z");
}

function requireStatePhase(expected) {
  const state = readState();
  if (!state || state.phase !== expected) {
    throw workflowError(
      "INVALID_TOOLSET_SESSION_PHASE",
      `Expected session phase ${expected}, received ${state?.phase ?? "missing"}.`,
    );
  }
  return state;
}

function writeState(state) {
  mkdirSync(dirname(config.statePath), { recursive: true });
  writeFileSync(config.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function runJson(script, args, timeout, acceptNonzero = false, extraEnv = {}) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...extraEnv },
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 16,
      timeout,
    }).trim();
    return JSON.parse(stdout);
  } catch (error) {
    const stdout = String(error?.stdout ?? "").trim();
    if (stdout && acceptNonzero) return JSON.parse(stdout);
    if (stdout) {
      const payload = JSON.parse(stdout);
      if (payload?.blockerCode) throw workflowError(payload.blockerCode, JSON.stringify(payload));
    }
    throw error;
  }
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw workflowError("INVALID_ARGUMENT", token);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) result[key] = true;
    else {
      result[key] = value;
      index += 1;
    }
  }
  return result;
}

function integer(value, name) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) throw workflowError("INVALID_INTEGER", name);
  return parsed;
}

function positiveInteger(value, name) {
  const parsed = integer(value, name);
  if (parsed < 1) throw workflowError("INVALID_POSITIVE_INTEGER", name);
  return parsed;
}

function nonNegativeInteger(value, name) {
  const parsed = integer(value, name);
  if (parsed < 0) throw workflowError("INVALID_NON_NEGATIVE_INTEGER", name);
  return parsed;
}

function optionalPositiveInteger(value, name) {
  return value === undefined ? null : positiveInteger(value, name);
}

function workflowError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
