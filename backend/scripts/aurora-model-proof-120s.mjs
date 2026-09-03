#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildVerdict,
  createClock,
  deadlineStatus,
  nextState,
  selectFreshLogSlice,
  validateModelProofProfile,
  validateAcceptedRuntimeNwmainCleanupAdmission,
  validateCleanupEvidence,
  validateFailedLaneRecoveryAdmission,
  validateFailedLaneReadyCandidateBinding,
  validatePostRuntimeHiddenToolsetCleanupAdmission,
  validateToolsetOnlyVisibleReadyCleanupAdmission,
  validatePngBytes,
} from "./lib/aurora-model-proof-120s-contract.mjs";
import { loadRouteManifestWithSupersession } from "./lib/aurora-model-proof-120s-route-manifest-supersession.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const STANDARD_ROOT = resolve(SCRIPT_DIR, "..", "..");
const CHILD = Object.freeze({
  structural: resolve(SCRIPT_DIR, "validate-aurora-toolset-binary-module-bootstrap.mjs"),
  selectionMode: resolve(SCRIPT_DIR, "set-aurora-toolset-selection-mode-no-global-input.mjs"),
  treeSelect: resolve(SCRIPT_DIR, "inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs"),
  caretReadback: resolve(SCRIPT_DIR, "probe-aurora-toolset-area-tree-selection-no-global-input.mjs"),
  viewportCapture: resolve(SCRIPT_DIR, "aurora-toolset-viewport-proof.mjs"),
  runtimeV1: resolve(SCRIPT_DIR, "aur-s07-runtime-execution.mjs"),
  testModule: resolve(SCRIPT_DIR, "aurora-toolset-test-module-nonblocking.mjs"),
  runtimePrepare: resolve(SCRIPT_DIR, "prepare-nwmain-proof-window-no-global-input.mjs"),
  runtimeCapture: resolve(SCRIPT_DIR, "capture-nwmain-proof-window-no-global-input.mjs"),
  runtimeClose: resolve(SCRIPT_DIR, "close-nwmain-window-no-global-input.mjs"),
  toolsetClose: resolve(SCRIPT_DIR, "close-aurora-toolset-window-no-global-input.mjs"),
});
const CONTRACT = Object.freeze({
  coordinator: resolve(SCRIPT_DIR, "test-aurora-model-proof-120s-contract.mjs"),
  preparation: resolve(SCRIPT_DIR, "test-prepare-aurora-model-proof-120s-contract.mjs"),
  binaryOpen: resolve(SCRIPT_DIR, "test-aurora-toolset-binary-module-native-geometry-contract.mjs"),
  explicitOpen: resolve(SCRIPT_DIR, "test-toolset-explicit-open-startup-admission-integration.mjs"),
  verifiedTemp0Recovery: resolve(SCRIPT_DIR, "test-aurora-toolset-verified-temp0-recovery-contract.mjs"),
  testModule: resolve(SCRIPT_DIR, "test-aurora-toolset-test-module-nonblocking-contract.mjs"),
  runtimeCapture: resolve(SCRIPT_DIR, "test-capture-nwmain-proof-window-contract.mjs"),
  runtimePrepare: resolve(SCRIPT_DIR, "test-prepare-nwmain-proof-window-no-global-input-contract.mjs"),
  runtimeClose: resolve(SCRIPT_DIR, "test-close-nwmain-window-no-global-input-contract.mjs"),
  skillSuite: resolve(SCRIPT_DIR, "test-aurora-toolset-skill-contract.mjs"),
});
const ROUTE_SELF = Object.freeze({
  coordinator: resolve(SCRIPT_DIR, "aurora-model-proof-120s.mjs"),
  contractLibrary: resolve(SCRIPT_DIR, "lib", "aurora-model-proof-120s-contract.mjs"),
  preparation: resolve(SCRIPT_DIR, "prepare-aurora-model-proof-120s.mjs"),
  preparationContractLibrary: resolve(SCRIPT_DIR, "lib", "aurora-model-proof-120s-prep-contract.mjs"),
  binaryOpen: resolve(SCRIPT_DIR, "aurora-toolset-binary-module-native-geometry.mjs"),
  binaryOpenLeaf: resolve(SCRIPT_DIR, "open-last-city-module-and-area-toolset-no-global-input.mjs"),
  preparationWelcomeDismiss: resolve(SCRIPT_DIR, "close-aurora-toolset-dialog-no-global-input.mjs"),
  verifiedTemp0RecoveryContract: resolve(SCRIPT_DIR, "lib", "aurora-toolset-verified-temp0-recovery.mjs"),
  verifiedTemp0RecoveryClientClick: resolve(SCRIPT_DIR, "post-aurora-toolset-verified-temp0-recovery-client-click-no-global-input.mjs"),
  runtimeCloseContract: resolve(SCRIPT_DIR, "lib", "nwmain-close-or-terminate-contract.mjs"),
  routeManifestSupersession: resolve(SCRIPT_DIR, "lib", "aurora-model-proof-120s-route-manifest-supersession.mjs"),
});
const LIVE_COMMANDS = new Set(["toolset", "record-toolset-visibility", "runtime", "record-runtime-visibility", "finalize"]);

const [command, ...rawArgs] = process.argv.slice(2);
const options = parseArgs(rawArgs);
const profilePath = requiredPath(options.profile, "--profile");
const context = loadContext(profilePath);

try {
  switch (command) {
    case "dry-run": print(dryRun(context)); break;
    case "preflight": print(preflight(context)); break;
    case "ready": print(ready(context)); break;
    case "toolset": print(runToolset(context)); break;
    case "record-toolset-visibility": print(recordVisibility(context, "toolset", options)); break;
    case "runtime": print(runRuntime(context)); break;
    case "record-runtime-visibility": print(recordVisibility(context, "runtime", options)); break;
    case "finalize": print(finalizeProof(context)); break;
    case "cleanup-dry-run": print(cleanupProofProcessesDryRun(context)); break;
    case "cleanup": print(cleanupProofProcesses(context)); break;
    case "recover-failed-lane-dry-run": print(recoverFailedLaneDryRun(context, options)); break;
    case "recover-failed-lane": print(recoverFailedLane(context, options)); break;
    case "status": print(readStatus(context)); break;
    default: throw new Error("Use: dry-run, preflight, ready, toolset, record-toolset-visibility, runtime, record-runtime-visibility, finalize, cleanup-dry-run, cleanup, recover-failed-lane-dry-run, recover-failed-lane, or status.");
  }
} catch (error) {
  if (LIVE_COMMANDS.has(command)) writeFailure(context, command, error);
  throw error;
}

function dryRun(ctx) {
  return {
    ok: true,
    command: "dry-run",
    status: "model_proof_120s_plan_valid",
    profileId: ctx.profile.id,
    profileSha256: ctx.profileSha256,
    hardLimitMs: 120_000,
    startsClock: false,
    startsToolset: false,
    startsNwn: false,
    usesGlobalInput: false,
    requiresProofReadySession: true,
    entryMode: ctx.profile.entryMode,
    publicCommands: ["preflight", "ready", "toolset", "record-toolset-visibility", "runtime", "record-runtime-visibility", "finalize", "cleanup-dry-run", "cleanup", "recover-failed-lane-dry-run", "recover-failed-lane", "status"],
    cleanup: {
      outsideLiveBudget: true,
      requiresDurableBoundEvidence: true,
      gracefulCloseFirst: true,
      exactPidStartTimeForceFallback: true,
    },
    ownedChildRoutes: Object.values(CHILD),
  };
}

function preflight(ctx) {
  if (existsSync(ctx.outputRoot)) throw new Error(`MODEL_PROOF_120S_NOT_READY:output_root_exists:${ctx.outputRoot}`);
  const ownedFiles = [...Object.values(ROUTE_SELF), ...Object.values(CHILD), ...Object.values(CONTRACT)];
  for (const path of ownedFiles) if (!existsSync(path)) throw new Error(`MODEL_PROOF_120S_NOT_READY:child_route_missing:${path}`);
  verifyImmutableInputs(ctx);
  const resources = verifyResourcesFromOrderedHaks(ctx);
  const routeIdentities = ownedFiles.map((path) => ({ path, sha256: sha256File(path), byteLength: statSync(path).size }));
  requireExactRouteManifest(ctx, routeIdentities);
  const contractChecks = Object.values(CONTRACT).map((path) => ({ path, sha256: sha256File(path), result: runNode(path, [], 30_000) }));
  for (const check of contractChecks) if (check.result?.ok !== true) throw new Error(`MODEL_PROOF_120S_NOT_READY:contract_check_failed:${check.path}`);
  const structural = runNode(CHILD.structural, ["--mode", "preflight", "--profile", ctx.binaryProfilePath], 30_000);
  if (structural?.ok !== true) throw new Error("MODEL_PROOF_120S_NOT_READY:structural_preflight_failed");
  const routeDryRuns = {
    testModule: runNode(CHILD.testModule, ["dry-run", "--module", `${ctx.binaryProfile.module.resref}.mod`], 10_000),
    runtimeCapture: runNode(CHILD.runtimeCapture, ["dry-run", "--out", resolve(ctx.outputRoot, "runtime", "capture.png")], 10_000),
    runtimePrepare: runNode(CHILD.runtimePrepare, ["dry-run", "--pid", "1", "--startedAtUtc", "2000-01-01T00:00:00.000Z"], 10_000),
    runtimeClose: runNode(CHILD.runtimeClose, ["dry-run"], 10_000),
    runtime: runNode(CHILD.runtimeV1, ["dry-run", "--profile", ctx.runtimeProfilePath, "--outDir", resolve(ctx.outputRoot, "runtime")], 15_000),
  };
  for (const [name, result] of Object.entries(routeDryRuns)) if (result?.ok !== true) throw new Error(`MODEL_PROOF_120S_NOT_READY:route_dry_run_failed:${name}`);
  return {
    ok: true,
    command: "preflight",
    status: "MODEL_PROOF_120S_PREFLIGHT_VALID",
    profileId: ctx.profile.id,
    profileSha256: ctx.profileSha256,
    module: { path: ctx.profile.installedModule.path, sha256: ctx.profile.installedModule.sha256 },
    area: ctx.profile.area,
    fixture: ctx.profile.fixture,
    resources,
    routeIdentities,
    routeManifest: {
      path: ctx.routeManifestPath,
      profileExpectedSha256: ctx.profile.routeManifest.sha256,
      resolvedSha256: ctx.routeManifestSha256,
      version: ctx.routeManifest.version,
      supersession: ctx.routeManifestSupersession,
    },
    contractChecks,
    routeDryRuns,
    structural,
    outputRootAbsent: true,
    startsClock: false,
    startsToolset: false,
    startsNwn: false,
    usesGlobalInput: false,
  };
}

function ready(ctx) {
  const offline = preflight(ctx);
  const session = probeProofReadySession(ctx.profile);
  return { ...offline, command: "ready", status: "MODEL_PROOF_120S_READY", session };
}

function runToolset(ctx) {
  const admission = ready(ctx);
  mkdirSync(resolve(ctx.outputRoot, "toolset"), { recursive: true });
  mkdirSync(resolve(ctx.outputRoot, "runtime"), { recursive: true });
  const clock = createClock(readQpc());
  writeJson(resolve(ctx.outputRoot, "ready.json"), admission);
  writeJson(resolve(ctx.outputRoot, "run-clock.json"), clock);
  let state = {
    version: "aurora-model-proof-120s-state/v1",
    profileId: ctx.profile.id,
    profileSha256: ctx.profileSha256,
    status: "ready",
    dispatches: {},
    toolsetVerdict: null,
    runtimeVerdict: null,
    artifacts: {},
    ready: { path: resolve(ctx.outputRoot, "ready.json"), sha256: sha256File(resolve(ctx.outputRoot, "ready.json")) },
  };
  writeState(ctx, state);
  requireLiveTime(ctx, clock);

  const moduleName = `${ctx.binaryProfile.module.resref}.mod`;
  const toolsetDir = resolve(ctx.outputRoot, "toolset");
  const selectionMode = runNode(CHILD.selectionMode, ["--module", moduleName, "--mode", "objects"], boundedTimeout(ctx, clock, 30_000));
  writeJson(resolve(toolsetDir, "selection-mode.json"), selectionMode);
  requireLiveTime(ctx, clock);
  const treeSelection = runNode(CHILD.treeSelect, [
    "--module", moduleName,
    "--objectText", ctx.profile.fixture.treeObjectText,
    "--occurrence", String(ctx.profile.fixture.occurrence),
    "--selectOnly", "true",
  ], boundedTimeout(ctx, clock, 45_000));
  writeJson(resolve(toolsetDir, "tree-selection.json"), treeSelection);
  requireLiveTime(ctx, clock);
  const caret = runNode(CHILD.caretReadback, ["--module", moduleName], boundedTimeout(ctx, clock, 30_000));
  writeJson(resolve(toolsetDir, "caret-readback.json"), caret);
  const selected = caret.selected ?? caret.selection ?? caret.target;
  if (treeSelection.target?.text !== ctx.profile.fixture.treeObjectText || selected?.text !== ctx.profile.fixture.treeObjectText) throw new Error("toolset_fixture_text_readback_mismatch");
  if (Number(treeSelection.target?.handle) !== Number(selected?.handle)) throw new Error("toolset_fixture_handle_readback_mismatch");
  requireLiveTime(ctx, clock);
  const capturePath = resolve(toolsetDir, "capture.png");
  const captureResultPath = resolve(toolsetDir, "capture.json");
  const capture = runNode(CHILD.viewportCapture, [
    "capture", "--module", moduleName, "--area", ctx.profile.area.resref,
    "--out", capturePath, "--resultOut", captureResultPath, "--allowUniformScene", "false",
  ], boundedTimeout(ctx, clock, 30_000));
  const captureBytes = readFileSync(capturePath);
  const png = validatePngBytes(captureBytes);
  const captureSha256 = sha256Bytes(captureBytes);
  state = nextState(state, "toolset-captured", readQpc().counter, clock);
  state.artifacts.toolsetCapture = {
    path: capturePath,
    sha256: captureSha256,
    byteLength: captureBytes.length,
    width: png.width,
    height: png.height,
    metadataPath: captureResultPath,
    metadataSha256: sha256File(captureResultPath),
  };
  state.artifacts.toolsetSelection = { treeSelection, caret, selectionMode };
  writeState(ctx, state);
  const packet = {
    version: "aurora-model-proof-120s-toolset-packet/v1",
    createdAtUtc: new Date().toISOString(),
    profileId: ctx.profile.id,
    profileSha256: ctx.profileSha256,
    module: ctx.profile.installedModule,
    orderedHakList: ctx.profile.orderedHakList,
    area: ctx.profile.area,
    fixture: ctx.profile.fixture,
    selection: { mode: selectionMode, target: treeSelection.target, caret: selected },
    capture: state.artifacts.toolsetCapture,
    captureResult: capture,
    modelVisibility: "not_tested",
    proofCompleteness: "missing",
    policy: ctx.profile.policy,
  };
  const packetPath = resolve(toolsetDir, "packet.json");
  writeJson(packetPath, packet);
  state.artifacts.toolsetPacket = { path: packetPath, sha256: sha256File(packetPath), byteLength: statSync(packetPath).size };
  writeState(ctx, state);
  return { ok: true, command: "toolset", status: state.status, capturePath, captureSha256, elapsed: deadlineStatus(clock, readQpc().counter) };
}

function recordVisibility(ctx, environment, args) {
  assertNoBlocker(ctx);
  const clock = readClock(ctx);
  requireLiveTime(ctx, clock);
  const state = readState(ctx);
  requireRunIdentity(ctx, state);
  verifyOwnedRouteIdentities(ctx, state);
  const artifact = state.artifacts?.[`${environment}Capture`];
  if (!artifact || !existsSync(artifact.path)) throw new Error(`${environment}_capture_missing`);
  const actualSha = sha256File(artifact.path);
  const visibility = required(args.modelVisibility, "--modelVisibility");
  const verdict = buildVerdict({
    environment,
    captureSha256: actualSha,
    expectedCaptureSha256: artifact.sha256,
    modelVisibility: visibility,
    inspection: required(args.inspection, "--inspection"),
  });
  const event = `record-${environment}-${visibility === "visible" ? "visible" : "not-visible"}`;
  const changed = nextState(state, event, readQpc().counter, clock);
  const dir = resolve(ctx.outputRoot, environment);
  const verdictPath = resolve(dir, "verdict.json");
  writeJson(verdictPath, { ...verdict, recordedAtUtc: new Date().toISOString(), elapsed: deadlineStatus(clock, readQpc().counter) });
  const packetPath = resolve(dir, "packet.json");
  const priorPacket = state.artifacts?.[`${environment}Packet`];
  if (!priorPacket || !existsSync(packetPath) || sha256File(packetPath) !== priorPacket.sha256 || statSync(packetPath).size !== priorPacket.byteLength) throw new Error(`${environment}_packet_drift_before_verdict`);
  const packet = readJson(packetPath);
  writeJson(packetPath, { ...packet, modelVisibility: visibility, proofCompleteness: "verified", visualInspection: verdict });
  changed.artifacts[`${environment}Verdict`] = { path: verdictPath, sha256: sha256File(verdictPath), byteLength: statSync(verdictPath).size };
  changed.artifacts[`${environment}Packet`] = { path: packetPath, sha256: sha256File(packetPath), byteLength: statSync(packetPath).size };
  const completed = deadlineStatus(clock, readQpc().counter);
  if (completed.expired) throw new Error("MODEL_PROOF_120S_DEADLINE");
  writeState(ctx, changed);
  return { ok: true, command: `record-${environment}-visibility`, status: changed.status, verdict, elapsed: completed };
}

function runRuntime(ctx) {
  assertNoBlocker(ctx);
  const clock = readClock(ctx);
  requireLiveTime(ctx, clock);
  let state = readState(ctx);
  requireRunIdentity(ctx, state);
  verifyOwnedRouteIdentities(ctx, state);
  if (state.status !== "toolset_visible" || state.toolsetVerdict !== "visible") throw new Error("runtime_requires_visible_toolset_verdict");
  verifyImmutableInputs(ctx);
  verifyResourcesFromOrderedHaks(ctx);
  const current = readNwnProcesses();
  if (current.length !== 0) throw new Error(`runtime_baseline_not_zero:${current.length}`);
  state = nextState(state, "runtime-started", readQpc().counter, clock);
  writeState(ctx, state);
  const runtimeDir = resolve(ctx.outputRoot, "runtime");
  const arm = runNode(CHILD.runtimeV1, ["arm", "--profile", ctx.runtimeProfilePath, "--outDir", runtimeDir], boundedTimeout(ctx, clock, 15_000));
  const requestPath = resolve(runtimeDir, "aur-s07-runtime-launch-request.json");
  const request = readJson(requestPath);
  const logBaseline = snapshotFile(ctx.profile.runtime.engineLogPath);
  const launch = runNode(CHILD.testModule, ["post", "--module", `${ctx.binaryProfile.module.resref}.mod`], boundedTimeout(ctx, clock, 10_000));
  writeJson(resolve(runtimeDir, "dispatch.json"), { ...launch, requestId: request.requestId, dispatchedAtUtc: new Date().toISOString() });
  const observed = waitForRuntime(ctx, request, logBaseline, clock);
  const handoffPath = resolve(runtimeDir, "runtime-handoff.json");
  const handoff = {
    version: "aur-s07-runtime-handoff/v1",
    createdAtUtc: new Date().toISOString(),
    requestId: request.requestId,
    profileId: ctx.runtimeProfile.id,
    moduleSha256: ctx.runtimeProfile.module.sha256,
    area: ctx.runtimeProfile.module.area,
    entryPoint: ctx.runtimeProfile.module.entryPoint,
    testModule: {
      toolsetPid: launch.processId,
      commandId: 121,
      commandCount: 1,
      nwmainPid: observed.process.pid,
      nwmainStartUtc: observed.process.startedAtUtc,
      nwmainResponding: observed.process.responding,
      engineLoadLine: observed.log.line,
    },
    safety: { usesGlobalInput: false, secondTestModuleInvocation: false },
  };
  writeJson(handoffPath, handoff);
  const observation = runNode(CHILD.runtimeV1, ["observe", "--profile", ctx.runtimeProfilePath, "--outDir", runtimeDir, "--handoff", handoffPath], boundedTimeout(ctx, clock, 15_000));
  if (observation?.ok !== true || observation?.status !== "observed" || !observation.observationPath) throw new Error(`runtime_observation_rejected:${JSON.stringify(observation)}`);
  const observationPath = resolve(observation.observationPath);
  if (!existsSync(observationPath)) throw new Error("runtime_observation_artifact_missing");
  writeJson(resolve(runtimeDir, "observation-command.json"), observation);
  requireLiveTime(ctx, clock);
  const windowPreparation = runNode(CHILD.runtimePrepare, [
    "prepare", "--pid", String(observed.process.pid), "--startedAtUtc", observed.process.startedAtUtc,
  ], boundedTimeout(ctx, clock, 10_000));
  if (windowPreparation?.ok !== true || windowPreparation?.status !== "verified" || windowPreparation.process?.pid !== observed.process.pid) throw new Error("runtime_window_preparation_rejected");
  const windowPreparationPath = resolve(runtimeDir, "window-preparation.json");
  writeJson(windowPreparationPath, windowPreparation);
  sleepMs(1_500);
  const capturePath = resolve(runtimeDir, "capture.png");
  const captureResultPath = resolve(runtimeDir, "capture.json");
  const capture = runNode(CHILD.runtimeCapture, [
    "capture", "--pid", String(observed.process.pid), "--startedAtUtc", observed.process.startedAtUtc,
    "--out", capturePath, "--resultOut", captureResultPath,
  ], boundedTimeout(ctx, clock, 20_000));
  const captureBytes = readFileSync(capturePath);
  const png = validatePngBytes(captureBytes);
  const captureSha256 = sha256Bytes(captureBytes);
  const logPath = resolve(runtimeDir, "engine-log-window.bin");
  writeFileSync(logPath, observed.log.bytes);
  const logMeta = {
    version: "aurora-model-proof-engine-log-window/v1",
    sourcePath: ctx.profile.runtime.engineLogPath,
    baseline: logBaseline,
    selectedBaseline: observed.log.selectedBaseline,
    observedResets: observed.log.observedResets,
    after: observed.log.identity,
    mode: observed.log.mode,
    byteStart: observed.log.byteStart,
    byteEnd: observed.log.byteEnd,
    sha256: sha256Bytes(observed.log.bytes),
    line: observed.log.line,
    loadingModuleResref: ctx.profile.runtime.loadingModuleResref,
    process: observed.process,
    requestId: request.requestId,
  };
  writeJson(resolve(runtimeDir, "engine-log-window.json"), logMeta);
  const runtimePacket = {
    version: "aurora-model-proof-120s-runtime-packet/v1",
    createdAtUtc: new Date().toISOString(),
    profileId: ctx.profile.id,
    profileSha256: ctx.profileSha256,
    runtimeProfileId: ctx.runtimeProfile.id,
    request: { path: requestPath, sha256: sha256File(requestPath), requestId: request.requestId },
    handoff: { path: handoffPath, sha256: sha256File(handoffPath) },
    observation: { path: observationPath, sha256: sha256File(observationPath), byteLength: statSync(observationPath).size },
    process: observed.process,
    windowPreparation: { path: windowPreparationPath, sha256: sha256File(windowPreparationPath), byteLength: statSync(windowPreparationPath).size },
    windowSurfaceLease: capture.zOrderLease,
    module: ctx.profile.installedModule,
    orderedHakList: ctx.profile.orderedHakList,
    area: ctx.profile.area,
    fixture: ctx.profile.fixture,
    capture: { path: capturePath, sha256: captureSha256, byteLength: captureBytes.length, metadataPath: captureResultPath, metadataSha256: sha256File(captureResultPath) },
    engineLogWindow: { path: logPath, sha256: logMeta.sha256, metadataPath: resolve(runtimeDir, "engine-log-window.json"), metadataSha256: sha256File(resolve(runtimeDir, "engine-log-window.json")) },
    modelVisibility: "not_tested",
    proofCompleteness: "missing",
    safety: {
      usesGlobalInput: false,
      testModuleCommandCount: 1,
      changesZOrder: capture.zOrderLease.lifted,
      temporaryZOrderLease: capture.zOrderLease.lifted,
      zOrderRestored: capture.zOrderLease.restore.succeeded,
      usesTopmost: false,
      activatesWindow: false,
      physicalCaptureCount: capture.captureCount,
      changesWindowGeometry: true,
      saved: false,
      built: false,
      repacked: false,
    },
  };
  writeJson(resolve(runtimeDir, "packet.json"), runtimePacket);
  const runtimePacketPath = resolve(runtimeDir, "packet.json");
  state = nextState(state, "runtime-captured", readQpc().counter, clock);
  state.artifacts.runtimeCapture = {
    path: capturePath,
    sha256: captureSha256,
    byteLength: captureBytes.length,
    width: png.width,
    height: png.height,
    metadataPath: captureResultPath,
    metadataSha256: sha256File(captureResultPath),
  };
  state.artifacts.runtimeLog = { path: logPath, sha256: logMeta.sha256, byteLength: observed.log.bytes.length, metadataPath: resolve(runtimeDir, "engine-log-window.json"), metadataSha256: sha256File(resolve(runtimeDir, "engine-log-window.json")) };
  state.artifacts.runtimeObservation = { path: observationPath, sha256: sha256File(observationPath), byteLength: statSync(observationPath).size };
  state.artifacts.runtimeWindowPreparation = { path: windowPreparationPath, sha256: sha256File(windowPreparationPath), byteLength: statSync(windowPreparationPath).size };
  state.artifacts.runtimePacket = { path: runtimePacketPath, sha256: sha256File(runtimePacketPath), byteLength: statSync(runtimePacketPath).size };
  writeState(ctx, state);
  return { ok: true, command: "runtime", status: state.status, capturePath, captureSha256, process: observed.process, engineLoadLine: observed.log.line, elapsed: deadlineStatus(clock, readQpc().counter), arm };
}

function finalizeProof(ctx) {
  assertNoBlocker(ctx);
  const clock = readClock(ctx);
  requireLiveTime(ctx, clock);
  const state = readState(ctx);
  requireRunIdentity(ctx, state);
  const routeIdentities = verifyOwnedRouteIdentities(ctx, state);
  if (!new Set(["toolset_not_visible", "runtime_visible", "runtime_not_visible"]).has(state.status)) throw new Error(`finalize_state_invalid:${state.status}`);
  verifyImmutableInputs(ctx);
  verifyResourcesFromOrderedHaks(ctx);
  verifyArtifactMap(state.artifacts);
  validateBoundProofArtifacts(ctx, state);
  const toolsetVerdict = readJson(resolve(ctx.outputRoot, "toolset", "verdict.json"));
  const runtimeVerdictPath = resolve(ctx.outputRoot, "runtime", "verdict.json");
  const finalPacket = {
    version: "aurora-model-proof-120s-final/v1",
    createdAtUtc: new Date().toISOString(),
    status: "pending_qpc_acceptance",
    slo: null,
    profile: { id: ctx.profile.id, path: ctx.profilePath, sha256: ctx.profileSha256 },
    routes: {
      manifest: {
        path: ctx.routeManifestPath,
        profileExpectedSha256: ctx.profile.routeManifest.sha256,
        resolvedSha256: ctx.routeManifestSha256,
        version: ctx.routeManifest.version,
        supersession: ctx.routeManifestSupersession,
      },
      ready: state.ready,
      identities: routeIdentities,
    },
    candidate: {
      module: ctx.profile.installedModule,
      orderedHakList: ctx.profile.orderedHakList,
      resources: ctx.profile.resources,
      area: ctx.profile.area,
      fixture: ctx.profile.fixture,
    },
    toolset: { verdict: toolsetVerdict, packetPath: resolve(ctx.outputRoot, "toolset", "packet.json"), packetSha256: sha256File(resolve(ctx.outputRoot, "toolset", "packet.json")) },
    runtime: existsSync(runtimeVerdictPath)
      ? { verdict: readJson(runtimeVerdictPath), packetPath: resolve(ctx.outputRoot, "runtime", "packet.json"), packetSha256: sha256File(resolve(ctx.outputRoot, "runtime", "packet.json")) }
      : { modelVisibility: "not_tested", proofCompleteness: "missing" },
    safety: { usesGlobalInput: false, saved: false, built: false, repacked: false, focusUsed: false, cameraChanged: false, retries: 0 },
  };
  const commitCounter = readQpc().counter;
  const commitElapsed = deadlineStatus(clock, commitCounter);
  if (commitElapsed.expired) throw new Error("MODEL_PROOF_120S_DEADLINE");
  const changed = nextState(state, "finalize", commitCounter, clock);
  finalPacket.slo = { hardLimitMs: 120_000, ...commitElapsed, runMetDeadline: null, standardCertification: "unverified_requires_two_live_runs" };
  const finalPath = resolve(ctx.outputRoot, "final-model-proof.json");
  writeJson(finalPath, finalPacket);
  const completionCounter = readQpc().counter;
  const completed = deadlineStatus(clock, completionCounter);
  if (completed.expired) {
    renameSync(finalPath, resolve(ctx.outputRoot, "late-final-model-proof.json"));
    throw new Error("MODEL_PROOF_120S_DEADLINE");
  }
  const acceptancePending = resolve(ctx.outputRoot, "final-model-proof.acceptance.pending.json");
  writeJson(acceptancePending, {
    version: "aurora-model-proof-120s-acceptance/v1",
    status: "verified_if_published_filename_counter_is_within_deadline",
    profileId: ctx.profile.id,
    profileSha256: ctx.profileSha256,
    finalPacket: { path: finalPath, sha256: sha256File(finalPath), byteLength: statSync(finalPath).size },
    clock: { source: clock.source, frequency: clock.frequency, startCounter: clock.startCounter, deadlineCounter: clock.deadlineCounter, hardLimitMs: clock.hardLimitMs },
    standardCertification: "unverified_requires_two_live_runs",
  });
  const publishCounter = readQpc().counter;
  const published = deadlineStatus(clock, publishCounter);
  if (published.expired) {
    renameSync(acceptancePending, resolve(ctx.outputRoot, "late-final-model-proof.acceptance.json"));
    renameSync(finalPath, resolve(ctx.outputRoot, "late-final-model-proof.json"));
    throw new Error("MODEL_PROOF_120S_DEADLINE");
  }
  const acceptancePath = resolve(ctx.outputRoot, `final-model-proof.accepted-at-${publishCounter}.json`);
  renameSync(acceptancePending, acceptancePath);
  writeState(ctx, changed);
  return { ok: true, command: "finalize", status: "verified", finalPacketPath: finalPath, acceptancePath, acceptanceSha256: sha256File(acceptancePath), slo: { hardLimitMs: 120_000, runMetDeadline: true, publishCounter: publishCounter.toString(), publishCompletedElapsedMs: published.elapsedMs, standardCertification: "unverified_requires_two_live_runs" } };
}

function cleanupProofProcessesDryRun(ctx) {
  const prepared = prepareCleanupEvidence(ctx);
  const hostState = probePostRuntimeCleanupHostState(prepared.readyPacket.session);
  let nwmain;
  let nwmainAdmission = null;
  if (!prepared.evidence.runtimeProcess) {
    if (hostState.nwmainCount !== 0) throw new Error(`cleanup_dry_run_unbound_nwmain_present:${hostState.nwmainCount}`);
    nwmain = {
      status: "not_launched",
      expectedProcess: null,
      processCount: 0,
    };
  } else if (hostState.nwmainCount === 0) {
    nwmain = {
      status: "already_closed",
      expectedProcess: prepared.evidence.runtimeProcess,
      processCount: 0,
    };
  } else {
    nwmainAdmission = validateAcceptedRuntimeNwmainCleanupAdmission({
      profileId: ctx.profile.id,
      profileSha256: ctx.profileSha256,
      acceptedProof: prepared.acceptedProof,
      runtimePacket: prepared.runtimePacket,
      runtimeArtifacts: prepared.state.artifacts,
      hostState,
    });
    nwmain = {
      status: "exact_live_runtime_admitted",
      expectedProcess: prepared.evidence.runtimeProcess,
      processCount: hostState.nwmainCount,
      admission: nwmainAdmission,
    };
  }
  const toolsetOnly = prepared.evidence.mode === "toolset-only";
  const admission = toolsetOnly
    ? validateToolsetOnlyVisibleReadyCleanupAdmission({
      profileId: ctx.profile.id,
      profileSha256: ctx.profileSha256,
      moduleName: ctx.profile.installedModule.path.split("\\").at(-1),
      areaResref: ctx.profile.area.resref,
      acceptedProof: prepared.acceptedProof,
      readySession: prepared.readyPacket.session,
      hostState,
      readyProbe: probeProofReadySession(ctx.profile),
    })
    : validatePostRuntimeHiddenToolsetCleanupAdmission({
      profileId: ctx.profile.id,
      profileSha256: ctx.profileSha256,
      moduleName: ctx.profile.installedModule.path.split("\\").at(-1),
      areaResref: ctx.profile.area.resref,
      acceptedProof: prepared.acceptedProof,
      readySession: prepared.readyPacket.session,
      hostState,
      nwmainAdmission,
    });
  return {
    ok: true,
    command: "cleanup-dry-run",
    status: toolsetOnly ? "toolset_only_visible_ready_cleanup_admitted" : "post_runtime_hidden_toolset_cleanup_admitted",
    profileId: ctx.profile.id,
    profileSha256: ctx.profileSha256,
    cleanupPath: prepared.cleanupPath,
    evidence: {
      mode: prepared.evidence.mode,
      acceptedProof: prepared.acceptedProof,
      ready: {
        path: prepared.readyPath,
        sha256: sha256File(prepared.readyPath),
      },
    },
    nwmain,
    admission,
    safety: {
      startsToolset: false,
      startsNwn: false,
      usesGlobalInput: false,
      restoresWindow: false,
      changesFocus: false,
      savesModule: false,
      buildsModule: false,
      changesIniOrMru: false,
      gracefulFirst: true,
      exactPidStartTimeForceFallback: true,
    },
  };
}

function cleanupProofProcesses(ctx) {
  const prepared = prepareCleanupEvidence(ctx);
  const {
    cleanupPath,
    state,
    readyPacket,
    acceptedProof,
    actualArtifacts,
    runtimePacket,
    evidence,
  } = prepared;

  const currentNwn = readNwnProcesses();
  let nwmain;
  if (!evidence.runtimeProcess) {
    if (currentNwn.length !== 0) throw new Error(`cleanup_unbound_nwmain_present:${currentNwn.length}`);
    nwmain = {
      ok: true,
      command: "not-launched",
      status: "already_closed",
      processCountAfter: 0,
      gracefulAttempt: null,
      forceFallbackUsed: false,
    };
  } else if (currentNwn.length === 0) {
    nwmain = {
      ok: true,
      command: "close-or-terminate",
      status: "already_closed",
      processCountAfter: 0,
      gracefulAttempt: null,
      forceFallbackUsed: false,
      expectedProcess: evidence.runtimeProcess,
    };
  } else {
    if (
      currentNwn.length !== 1
      || currentNwn[0].pid !== evidence.runtimeProcess.pid
      || Date.parse(currentNwn[0].startedAtUtc) !== Date.parse(evidence.runtimeProcess.startedAtUtc)
      || currentNwn[0].mainWindowHandle !== evidence.runtimeProcess.mainWindowHandle
      || currentNwn[0].title !== evidence.runtimeProcess.title
    ) {
      throw new Error(`cleanup_nwmain_identity_drift:${JSON.stringify(currentNwn)}`);
    }
    nwmain = runNode(CHILD.runtimeClose, [
      "close-or-terminate",
      "--pid", String(evidence.runtimeProcess.pid),
      "--startedAtUtc", evidence.runtimeProcess.startedAtUtc,
    ], 30_000);
    if (
      nwmain.forceFallbackUsed !== true
      && Number(nwmain.window?.hwnd) !== evidence.runtimeProcess.mainWindowHandle
    ) {
      throw new Error("cleanup_nwmain_closed_window_identity_drift");
    }
  }
  if (nwmain?.ok !== true || nwmain.processCountAfter !== 0) throw new Error("cleanup_nwmain_close_invalid");

  const hostState = probePostRuntimeCleanupHostState(readyPacket.session);
  let toolsetAdmission;
  let allowHiddenExactFrame = false;
  if (evidence.mode === "toolset-only") {
    const currentToolset = probeProofReadySession(ctx.profile);
    toolsetAdmission = validateToolsetOnlyVisibleReadyCleanupAdmission({
      profileId: ctx.profile.id,
      profileSha256: ctx.profileSha256,
      moduleName: ctx.profile.installedModule.path.split("\\").at(-1),
      areaResref: ctx.profile.area.resref,
      acceptedProof,
      readySession: readyPacket.session,
      hostState,
      readyProbe: currentToolset,
    });
  } else {
    toolsetAdmission = validatePostRuntimeHiddenToolsetCleanupAdmission({
      profileId: ctx.profile.id,
      profileSha256: ctx.profileSha256,
      moduleName: ctx.profile.installedModule.path.split("\\").at(-1),
      areaResref: ctx.profile.area.resref,
      acceptedProof,
      readySession: readyPacket.session,
      hostState,
    });
    allowHiddenExactFrame = true;
  }

  const gracefulToolset = runNodeAllowFailure(
    CHILD.toolsetClose,
    [
      "--expectedPid", String(evidence.toolsetProcess.pid),
      "--expectedStartedAtUtc", evidence.toolsetProcess.startedAtUtc,
      "--expectedFrameHwnd", String(readyPacket.session.frameHwnd),
      "--expectedFrameTitle", readyPacket.session.frameTitle,
      "--forceIfNeeded", "true",
      "--allowHiddenExactFrame", String(allowHiddenExactFrame),
    ],
    30_000,
  );
  if (gracefulToolset.status !== 0 || gracefulToolset.result?.ok !== true) {
    throw new Error(`cleanup_toolset_close_invalid:${JSON.stringify(gracefulToolset)}`);
  }
  const toolset = {
    ok: true,
    admission: toolsetAdmission,
    gracefulAttempt: gracefulToolset.result,
    forceFallbackUsed: gracefulToolset.result.forceFallbackUsed === true,
    processCountAfter: 0,
  };

  const processCountsAfter = readProofProcessCounts();
  if (processCountsAfter.nwmain !== 0 || processCountsAfter.nwtoolset !== 0) {
    throw new Error(`cleanup_process_count_after_invalid:${JSON.stringify(processCountsAfter)}`);
  }
  const result = {
    version: "aurora-model-proof-120s-cleanup/v1",
    ok: true,
    command: "cleanup",
    createdAtUtc: new Date().toISOString(),
    profileId: ctx.profile.id,
    profileSha256: ctx.profileSha256,
    outsideLiveBudget: true,
    evidence: {
      mode: evidence.mode,
      state: { path: statePath(ctx), sha256: sha256File(statePath(ctx)) },
      acceptedProof,
      artifacts: actualArtifacts,
    },
    nwmain,
    toolset,
    processCountsAfter,
  };
  writeJson(cleanupPath, result);
  return { ...result, cleanupPath, cleanupSha256: sha256File(cleanupPath) };
}

function prepareCleanupEvidence(ctx) {
  if (!existsSync(ctx.outputRoot)) throw new Error("cleanup_output_root_missing");
  const cleanupPath = resolve(ctx.outputRoot, "cleanup.json");
  if (existsSync(cleanupPath)) throw new Error("cleanup_already_recorded");
  const state = readState(ctx);
  requireRunIdentity(ctx, state);
  verifyImmutableInputs(ctx);
  verifyResourcesFromOrderedHaks(ctx);

  const readyPath = resolve(ctx.outputRoot, "ready.json");
  if (!state.ready || state.ready.path !== readyPath || !existsSync(readyPath) || sha256File(readyPath) !== state.ready.sha256) {
    throw new Error("cleanup_ready_packet_identity_drift");
  }
  const readyPacket = readJson(readyPath);
  const acceptedProof = validatePublishedAcceptance(ctx);
  const actualArtifacts = readCleanupArtifactIdentities(state.artifacts);
  const runtimePacketPath = state.artifacts?.runtimePacket?.path;
  const runtimePacket = runtimePacketPath && existsSync(runtimePacketPath) ? readJson(runtimePacketPath) : null;
  const evidence = validateCleanupEvidence({
    profileId: ctx.profile.id,
    profileSha256: ctx.profileSha256,
    state,
    actualArtifacts,
    runtimePacket,
    acceptedProof,
    readySession: readyPacket.session,
  });
  if (runtimePacket) {
    if (JSON.stringify(runtimePacket.module) !== JSON.stringify(ctx.profile.installedModule)
      || JSON.stringify(runtimePacket.orderedHakList) !== JSON.stringify(ctx.profile.orderedHakList)
      || JSON.stringify(runtimePacket.area) !== JSON.stringify(ctx.profile.area)
      || JSON.stringify(runtimePacket.fixture) !== JSON.stringify(ctx.profile.fixture)) {
      throw new Error("cleanup_runtime_candidate_drift");
    }
    validatePngBytes(readFileSync(state.artifacts.runtimeCapture.path));
    readJson(state.artifacts.runtimeCapture.metadataPath);
    readJson(state.artifacts.runtimeLog.metadataPath);
  }
  return {
    cleanupPath,
    state,
    readyPath,
    readyPacket,
    acceptedProof,
    actualArtifacts,
    runtimePacket,
    evidence,
  };
}

function recoverFailedLaneDryRun(ctx, args) {
  const prepared = prepareFailedLaneRecovery(ctx, args);
  return {
    ok: true,
    command: "recover-failed-lane-dry-run",
    status: "failed_lane_recovery_admitted",
    admission: prepared.admission,
    startsToolset: false,
    startsNwn: false,
    closesToolset: false,
    usesGlobalInput: false,
  };
}

function recoverFailedLane(ctx, args) {
  const prepared = prepareFailedLaneRecovery(ctx, args);
  const planPath = resolve(ctx.outputRoot, "failed-lane-recovery-plan.json");
  const resultPath = resolve(ctx.outputRoot, "failed-lane-recovery.json");
  const blockerPath = resolve(ctx.outputRoot, "failed-lane-recovery-blocker.json");
  const plan = {
    version: "aurora-model-proof-120s-failed-lane-recovery-plan/v1",
    createdAtUtc: new Date().toISOString(),
    admission: prepared.admission,
  };
  writeJson(planPath, plan);
  try {
    const readySession = prepared.readyPacket.session;
    const closed = runNode(CHILD.toolsetClose, [
      "--expectedPid", String(readySession.processId),
      "--expectedStartedAtUtc", readySession.startedAtUtc,
      "--expectedFrameHwnd", String(readySession.frameHwnd),
      "--expectedFrameTitle", readySession.frameTitle,
      "--forceIfNeeded", "true",
      "--allowHiddenExactFrame", "false",
    ], 30_000);
    if (closed?.ok !== true) throw new Error(`failed_lane_toolset_close_invalid:${JSON.stringify(closed)}`);
    const processCountsAfter = readProofProcessCounts();
    if (processCountsAfter.nwmain !== 0 || processCountsAfter.nwtoolset !== 0) {
      throw new Error(`failed_lane_process_count_after_invalid:${JSON.stringify(processCountsAfter)}`);
    }
    requireExistingEvidenceUnchanged(prepared.existingFiles, ctx.outputRoot);
    if (existsSync(prepared.nextContext.outputRoot) || existsSync(prepared.nextPrepOutDir)) {
      throw new Error("failed_lane_next_attempt_path_created_during_close");
    }
    const result = {
      version: "aurora-model-proof-120s-failed-lane-recovery/v1",
      ok: true,
      command: "recover-failed-lane",
      status: "zero_process_new_attempt_admitted",
      createdAtUtc: new Date().toISOString(),
      admission: prepared.admission,
      plan: { path: planPath, sha256: sha256File(planPath) },
      close: closed,
      processCountsAfter,
      existingEvidencePreserved: true,
    };
    writeJson(resultPath, result);
    return { ...result, resultPath, resultSha256: sha256File(resultPath) };
  } catch (error) {
    writeJson(blockerPath, {
      version: "aurora-model-proof-120s-failed-lane-recovery-blocker/v1",
      createdAtUtc: new Date().toISOString(),
      status: "blocked",
      error: String(error?.message ?? error),
      plan: { path: planPath, sha256: sha256File(planPath) },
    });
    throw error;
  }
}

function prepareFailedLaneRecovery(ctx, args) {
  if (!existsSync(ctx.outputRoot)) throw new Error("failed_lane_output_root_missing");
  for (const name of ["failed-lane-recovery-plan.json", "failed-lane-recovery.json", "failed-lane-recovery-blocker.json"]) {
    if (existsSync(resolve(ctx.outputRoot, name))) throw new Error(`failed_lane_recovery_already_attempted:${name}`);
  }
  const nextContext = loadContext(requiredPath(args.nextAttemptProfile, "--nextAttemptProfile"));
  const nextPrepOutDir = requiredPath(args.nextPrepOutDir, "--nextPrepOutDir");
  const existingFiles = readFileIdentityInventory(ctx.outputRoot);
  const state = readJson(resolve(ctx.outputRoot, "state.json"));
  const readyPacket = readJson(resolve(ctx.outputRoot, "ready.json"));
  const blocker = readJson(resolve(ctx.outputRoot, "blocker.json"));
  const clock = readJson(resolve(ctx.outputRoot, "run-clock.json"));
  const readyCandidate = validateFailedLaneReadyCandidateBinding({ readyPacket, profile: ctx.profile });
  const hostSession = probeProofReadySession(ctx.profile);
  const candidateHashesMatch = JSON.stringify(modelCandidateHashIdentity(ctx.profile))
    === JSON.stringify(modelCandidateHashIdentity(nextContext.profile));
  const distinctPaths = nextContext.profilePath !== ctx.profilePath
    && nextContext.outputRoot !== ctx.outputRoot
    && nextPrepOutDir !== ctx.outputRoot
    && nextPrepOutDir !== nextContext.outputRoot
    && !nextPrepOutDir.startsWith(`${ctx.outputRoot}\\`)
    && !nextContext.outputRoot.startsWith(`${ctx.outputRoot}\\`);
  const admission = validateFailedLaneRecoveryAdmission({
    profileId: ctx.profile.id,
    profileSha256: ctx.profileSha256,
    outputRoot: ctx.outputRoot,
    state,
    readyPacket,
    blocker,
    clock,
    existingFiles,
    hostSession,
    nextAttempt: {
      profileId: nextContext.profile.id,
      profileSha256: nextContext.profileSha256,
      profilePath: nextContext.profilePath,
      outputRoot: nextContext.outputRoot,
      prepOutDir: nextPrepOutDir,
      outputRootAbsent: !existsSync(nextContext.outputRoot),
      prepOutDirAbsent: !existsSync(nextPrepOutDir),
      candidateHashesMatch,
      distinctPaths,
      readySha256: sha256File(resolve(ctx.outputRoot, "ready.json")),
    },
  });
  return { admission, existingFiles, nextContext, nextPrepOutDir, readyPacket, readyCandidate };
}

function modelCandidateHashIdentity(profile) {
  return {
    module: { sha256: profile.installedModule.sha256, byteLength: profile.installedModule.byteLength },
    orderedHaks: profile.orderedHakList.map(({ resref, sha256, byteLength }) => ({ resref, sha256, byteLength })),
    resources: profile.resources,
    area: profile.area,
    fixture: profile.fixture,
  };
}

function readFileIdentityInventory(root) {
  const result = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) result.push({
        relativePath: path.slice(root.length + 1),
        sha256: sha256File(path),
        byteLength: statSync(path).size,
      });
    }
  };
  visit(root);
  return result.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function requireExistingEvidenceUnchanged(expected, root) {
  for (const file of expected) {
    const path = resolve(root, file.relativePath);
    if (!existsSync(path) || sha256File(path) !== file.sha256 || statSync(path).size !== file.byteLength) {
      throw new Error(`failed_lane_existing_evidence_drift:${file.relativePath}`);
    }
  }
}

function waitForRuntime(ctx, request, baseline, clock) {
  const token = `Loading Module: ${ctx.profile.runtime.loadingModuleResref}`;
  let activeBaseline = baseline;
  const observedResets = [];
  while (true) {
    requireLiveTime(ctx, clock);
    const processes = readNwnProcesses().filter((process) => Date.parse(process.startedAtUtc) >= Date.parse(request.createdAt));
    if (processes.length > 1) throw new Error(`runtime_process_count_invalid:${processes.length}`);
    const log = readAppendedLog(ctx.profile.runtime.engineLogPath, activeBaseline, token, request.createdAt);
    if (log?.resetBaseline) {
      if (observedResets.length !== 0) throw new Error("engine_log_multiple_resets_after_arm");
      observedResets.push(log.resetEvidence);
      activeBaseline = log.resetBaseline;
      sleepMs(50);
      continue;
    }
    if (processes.length === 1 && processes[0].responding && processes[0].mainWindowHandle !== 0 && log) {
      return { process: processes[0], log: { ...log, originalBaseline: baseline, selectedBaseline: activeBaseline, observedResets } };
    }
    sleepMs(250);
  }
}

function readAppendedLog(path, baseline, token, requestCreatedAt) {
  if (!existsSync(path)) return null;
  const current = snapshotFile(path);
  const currentBytes = readFileSync(path);
  let selected;
  try {
    selected = selectFreshLogSlice({ baseline, current, currentBytes, requestCreatedAt });
  } catch (error) {
    if (/engine_log_not_updated_after_baseline|engine_log_not_fresh_for_request/u.test(String(error?.message ?? error))) return null;
    throw error;
  }
  if (selected.resetRequired) {
    return {
      resetBaseline: current,
      resetEvidence: {
        mode: selected.mode,
        detectedAtUtc: new Date().toISOString(),
        before: baseline,
        after: current,
      },
    };
  }
  const text = selected.bytes.toString("utf8");
  const lines = text.split(/\r?\n/u).filter((line) => line.includes(token));
  if (lines.length === 0) return null;
  const exact = lines.find((line) => new RegExp(`(?:^|\\s)Loading Module:\\s*${escapeRegex(token.slice("Loading Module: ".length))}(?:\\s|$)`, "iu").test(line));
  if (!exact) return null;
  return { ...selected, line: exact, identity: current.identity };
}

function probePostRuntimeCleanupHostState(readySession) {
  const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class PostRuntimeCleanupProbe{
  public delegate bool E(IntPtr h,IntPtr l);
  public const uint GW_OWNER=4;
  [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")]public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")]public static extern IntPtr GetWindow(IntPtr h,uint c);
  [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][PostRuntimeCleanupProbe]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][PostRuntimeCleanupProbe]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$expectedPid=[int]$env:PR_CLEANUP_PID
$expectedFrame=[int64]$env:PR_CLEANUP_FRAME
$toolsets=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
$processes=@($toolsets|ForEach-Object{[pscustomobject]@{pid=$_.Id;startedAtUtc=$_.StartTime.ToUniversalTime().ToString('o');responding=$_.Responding}})
$nwmain=@(Get-Process nwmain -ErrorAction SilentlyContinue)
$nwmainProcesses=@($nwmain|ForEach-Object{[pscustomobject]@{pid=$_.Id;name=$_.ProcessName.ToLowerInvariant();startedAtUtc=$_.StartTime.ToUniversalTime().ToString('o');responding=$_.Responding;mainWindowHandle=$_.MainWindowHandle.ToInt64();title=$_.MainWindowTitle}})
$script:nwmainPids=@{}
foreach($process in $nwmain){$script:nwmainPids[[int]$process.Id]=$true}
$script:nwmainWindows=@()
$script:windows=@()
[void][PostRuntimeCleanupProbe]::EnumWindows([PostRuntimeCleanupProbe+E]{
  param($h,$l)
  [uint32]$owner=0
  [void][PostRuntimeCleanupProbe]::GetWindowThreadProcessId($h,[ref]$owner)
  $visible=[PostRuntimeCleanupProbe]::IsWindowVisible($h)
  if($script:nwmainPids.ContainsKey([int]$owner)-and$visible){
    $script:nwmainWindows += [pscustomobject]@{
      hwnd=$h.ToInt64()
      processId=[int]$owner
      className=(C $h)
      title=(T $h)
      visible=$true
      enabled=[PostRuntimeCleanupProbe]::IsWindowEnabled($h)
      ownerHwnd=[PostRuntimeCleanupProbe]::GetWindow($h,[PostRuntimeCleanupProbe]::GW_OWNER).ToInt64()
    }
  }
  if($owner-ne$expectedPid){return $true}
  if(-not$visible-and$h.ToInt64()-ne$expectedFrame){return $true}
  $script:windows += [pscustomobject]@{
    hwnd=$h.ToInt64()
    processId=[int]$owner
    className=(C $h)
    title=(T $h)
    visible=$visible
    iconic=[PostRuntimeCleanupProbe]::IsIconic($h)
  }
  $true
},[IntPtr]::Zero)
[pscustomobject]@{nwmainCount=$nwmain.Count;nwmainProcesses=$nwmainProcesses;nwmainWindows=$script:nwmainWindows;processes=$processes;windows=$script:windows}|ConvertTo-Json -Depth 6 -Compress
`;
  return runPowerShellJson(source, {
    PR_CLEANUP_PID: String(readySession.processId),
    PR_CLEANUP_FRAME: String(readySession.frameHwnd),
  }, 10_000);
}

function probeProofReadySession(profile) {
  const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ProofReadyProbe{public delegate bool E(IntPtr h,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][ProofReadyProbe]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ProofReadyProbe]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$nwn=@(Get-Process nwmain -ErrorAction SilentlyContinue);if($nwn.Count-ne0){throw "expected_zero_nwmain:$($nwn.Count)"};$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset:$($ps.Count)"};$p=$ps[0];if(-not$p.Responding){throw 'toolset_not_responding'};[uint32]$pidValue=$p.Id
$script:top=@();[void][ProofReadyProbe]::EnumWindows([ProofReadyProbe+E]{param($h,$l);[uint32]$q=0;[void][ProofReadyProbe]::GetWindowThreadProcessId($h,[ref]$q);if($q-eq$pidValue-and[ProofReadyProbe]::IsWindowVisible($h)){$script:top += [pscustomobject]@{h=$h;text=(T $h);className=(C $h)}};$true},[IntPtr]::Zero)
$frames=@($script:top|Where-Object{$_.className-eq'TfrmFrame'-and$_.text.EndsWith(" - $env:PR_MODULE",[StringComparison]::OrdinalIgnoreCase)});if($frames.Count-ne1){throw "exact_module_frame_missing:$($frames.Count)"};$frame=$frames[0];if($frame.text.EndsWith('*')){throw 'dirty_module_frame'};$modals=@($script:top|Where-Object{$_.className-ne'TfrmFrame'-and$_.className-ne'TApplication'});if($modals.Count-ne0){throw "unexpected_modal:$($modals.Count)"};$screen=[Windows.Forms.Screen]::FromHandle($frame.h);if($screen.Primary){throw 'module_on_primary'}
$script:viewers=@();$script:viewports=@();[void][ProofReadyProbe]::EnumChildWindows($frame.h,[ProofReadyProbe+E]{param($h,$l);if([ProofReadyProbe]::IsWindowVisible($h)){$text=(T $h).Trim();if($text.StartsWith('-')){$text=$text.Substring(1).Trim()};$class=C $h;if($class-eq'TfrmViewerArea'-and$text-eq$env:PR_AREA){$script:viewers += $h};if($class-eq'TScrollBox'){$script:viewports += $h}};$true},[IntPtr]::Zero);if($script:viewers.Count-ne1){throw "exact_area_viewer_missing:$($script:viewers.Count)"};if($script:viewports.Count-lt1){throw 'toolset_viewport_missing'}
[pscustomobject]@{ok=$true;processId=$p.Id;startedAtUtc=$p.StartTime.ToUniversalTime().ToString('o');responding=$p.Responding;frameHwnd=$frame.h.ToInt64();frameTitle=$frame.text;area=$env:PR_AREA;areaViewerHwnd=$script:viewers[0].ToInt64();monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};nwmainCount=0;modalCount=0}|ConvertTo-Json -Depth 5 -Compress
`;
  return runPowerShellJson(source, { PR_MODULE: `${profile.installedModule.path.split("\\").at(-1)}`, PR_AREA: profile.area.resref }, 15_000);
}

function loadContext(path) {
  const profile = validateModelProofProfile(readJson(path));
  const profileSha256 = sha256File(path);
  const binaryProfilePath = resolve(profile.binaryProfile.path);
  const toolsetProfilePath = resolve(profile.toolsetProfile.path);
  const runtimeProfilePath = resolve(profile.runtimeProfile.path);
  const routeManifestPath = resolve(profile.routeManifest.path);
  for (const [artifact, artifactPath] of [[profile.binaryProfile, binaryProfilePath], [profile.toolsetProfile, toolsetProfilePath], [profile.runtimeProfile, runtimeProfilePath]]) {
    if (!existsSync(artifactPath) || sha256File(artifactPath) !== artifact.sha256) throw new Error(`profile_reference_hash_mismatch:${artifactPath}`);
  }
  const routeResolution = loadRouteManifestWithSupersession({
    manifestPath: routeManifestPath,
    expectedSha256: profile.routeManifest.sha256,
  });
  const routeManifest = routeResolution.manifest;
  const binaryProfile = readJson(binaryProfilePath);
  const toolsetProfile = readJson(toolsetProfilePath);
  const runtimeProfile = readJson(runtimeProfilePath);
  if (toolsetProfile.binaryProfile?.sha256 !== profile.binaryProfile.sha256) throw new Error("toolset_binary_profile_binding_mismatch");
  if (runtimeProfile.module?.sha256 !== profile.installedModule.sha256 || runtimeProfile.module?.area !== profile.area.resref) throw new Error("runtime_module_binding_mismatch");
  if (binaryProfile.module?.sha256 !== profile.installedModule.sha256 || binaryProfile.area?.resref !== profile.area.resref) throw new Error("binary_module_binding_mismatch");
  if (JSON.stringify(binaryProfile.entryPoint?.position) !== JSON.stringify(profile.area.entryPoint)) throw new Error("binary_entry_binding_mismatch");
  if (JSON.stringify(runtimeProfile.module?.entryPoint) !== JSON.stringify(profile.area.entryPoint)) throw new Error("runtime_entry_binding_mismatch");
  if (toolsetProfile.fixtureSelection?.fixtureId !== profile.fixture.id || toolsetProfile.fixtureSelection?.treeObjectText !== profile.fixture.treeObjectText || toolsetProfile.fixtureSelection?.occurrence !== profile.fixture.occurrence) throw new Error("toolset_fixture_binding_mismatch");
  if (toolsetProfile.capture?.targetClass !== "TScrollBox" || toolsetProfile.capture?.allowUniformScene !== false || toolsetProfile.noSave !== true) throw new Error("toolset_capture_policy_mismatch");
  const expectedHaks = profile.orderedHakList.map(({ resref, sha256 }) => ({ resref, sha256 }));
  const binaryHaks = (binaryProfile.orderedHakList ?? []).map(({ resref, sha256 }) => ({ resref, sha256 }));
  const runtimeHaks = (runtimeProfile.orderedHakList ?? []).map(({ resref, sha256 }) => ({ resref, sha256 }));
  if (JSON.stringify(binaryHaks) !== JSON.stringify(expectedHaks) || JSON.stringify(runtimeHaks) !== JSON.stringify(expectedHaks)) throw new Error("ordered_hak_cross_binding_mismatch");
  const binaryFixture = (binaryProfile.fixtures ?? []).find((value) => value.id === profile.fixture.id);
  const runtimeFixture = (runtimeProfile.fixtures ?? []).find((value) => value.id === profile.fixture.id);
  if (!binaryFixture || binaryFixture.templateResRef !== profile.fixture.templateResRef || binaryFixture.appearanceType !== profile.fixture.appearanceRow || JSON.stringify(binaryFixture.position) !== JSON.stringify(profile.fixture.position)) throw new Error("binary_fixture_cross_binding_mismatch");
  if (!runtimeFixture || runtimeFixture.resref !== profile.resources.mdl.resref || runtimeFixture.templateResRef !== profile.fixture.templateResRef || runtimeFixture.appearanceRow !== profile.fixture.appearanceRow || JSON.stringify(runtimeFixture.position) !== JSON.stringify(profile.fixture.position)) throw new Error("runtime_fixture_cross_binding_mismatch");
  if (runtimeProfile.geometryGate?.status !== "verified" || !existsSync(resolve(runtimeProfile.geometryGate?.evidence ?? ""))) throw new Error("runtime_geometry_gate_binding_mismatch");
  const outputRoot = resolve(profile.outputRoot);
  return {
    profile,
    profilePath: resolve(path),
    profileSha256,
    binaryProfilePath,
    toolsetProfilePath,
    runtimeProfilePath,
    routeManifestPath,
    routeManifest,
    routeManifestSha256: routeResolution.manifestSha256,
    routeManifestSupersession: routeResolution.admission,
    binaryProfile,
    toolsetProfile,
    runtimeProfile,
    outputRoot,
  };
}

function verifyImmutableInputs(ctx) {
  requireExactFile(ctx.binaryProfile.module.path, ctx.profile.installedModule.sha256);
  requireExactFile(ctx.profile.installedModule.path, ctx.profile.installedModule.sha256, ctx.profile.installedModule.byteLength);
  if (sha256File(ctx.binaryProfile.module.path) !== sha256File(ctx.profile.installedModule.path)) throw new Error("source_installed_module_bytes_mismatch");
  if (ctx.binaryProfile.orderedHakList.length !== ctx.profile.orderedHakList.length) throw new Error("ordered_hak_count_mismatch");
  for (let index = 0; index < ctx.profile.orderedHakList.length; index += 1) {
    const planned = ctx.profile.orderedHakList[index];
    const binary = ctx.binaryProfile.orderedHakList[index];
    if (planned.resref !== binary.resref || planned.sha256 !== binary.sha256) throw new Error(`ordered_hak_binding_mismatch:${index}`);
    requireExactFile(planned.path, planned.sha256, planned.byteLength);
  }
}

function verifyResourcesFromOrderedHaks(ctx) {
  const specs = [
    { name: "mdl", resref: ctx.profile.resources.mdl.resref, type: 2002, sha256: ctx.profile.resources.mdl.sha256 },
    { name: "tga", resref: ctx.profile.resources.tga.resref, type: 3, sha256: ctx.profile.resources.tga.sha256 },
    { name: "appearance2da", resref: ctx.profile.resources.appearance2da.resref, type: 2017, sha256: ctx.profile.resources.appearance2da.sha256 },
  ];
  return specs.map((spec) => {
    const resolved = resolveOrderedHakResource(ctx.profile.orderedHakList, spec.resref, spec.type);
    if (!resolved) throw new Error(`ordered_hak_resource_missing:${spec.name}:${spec.resref}:${spec.type}`);
    const actualSha256 = sha256Bytes(resolved.bytes);
    if (actualSha256 !== spec.sha256) throw new Error(`ordered_hak_resource_hash_mismatch:${spec.name}`);
    return { name: spec.name, resref: spec.resref, type: spec.type, hakResref: resolved.hak.resref, hakPath: resolved.hak.path, byteLength: resolved.bytes.length, sha256: actualSha256 };
  });
}

function resolveOrderedHakResource(orderedHaks, resref, type) {
  for (const hak of orderedHaks) {
    const bytes = readErfResource(hak.path, resref, type);
    if (bytes) return { hak, bytes };
  }
  return null;
}

function readErfResource(path, expectedResref, expectedType) {
  const bytes = readFileSync(path);
  if (bytes.length < 160) throw new Error(`hak_header_truncated:${path}`);
  const signature = bytes.subarray(0, 4).toString("ascii");
  const version = bytes.subarray(4, 8).toString("ascii");
  if (signature !== "HAK " || !new Set(["V1.0", "V1.1"]).has(version)) throw new Error(`hak_header_invalid:${path}`);
  const entryCount = bytes.readUInt32LE(16);
  const keyOffset = bytes.readUInt32LE(24);
  const resourceOffset = bytes.readUInt32LE(28);
  if (keyOffset + entryCount * 24 > bytes.length || resourceOffset + entryCount * 8 > bytes.length) throw new Error(`hak_index_out_of_range:${path}`);
  const matches = [];
  for (let index = 0; index < entryCount; index += 1) {
    const key = keyOffset + index * 24;
    const resref = bytes.subarray(key, key + 16).toString("ascii").replace(/\0.*$/u, "").toLowerCase();
    const resourceId = bytes.readUInt32LE(key + 16);
    const type = bytes.readUInt16LE(key + 20);
    if (resref !== expectedResref.toLowerCase() || type !== expectedType) continue;
    if (resourceId >= entryCount) throw new Error(`hak_resource_id_out_of_range:${path}`);
    const resource = resourceOffset + resourceId * 8;
    const offset = bytes.readUInt32LE(resource);
    const length = bytes.readUInt32LE(resource + 4);
    if (offset + length > bytes.length) throw new Error(`hak_resource_payload_out_of_range:${path}`);
    matches.push(bytes.subarray(offset, offset + length));
  }
  if (matches.length > 1) throw new Error(`hak_resource_ambiguous:${path}:${expectedResref}:${expectedType}`);
  return matches[0] ?? null;
}

function requireExactFile(path, sha256, byteLength = null) {
  if (!existsSync(path)) throw new Error(`artifact_missing:${path}`);
  const stat = statSync(path);
  if (byteLength != null && stat.size !== byteLength) throw new Error(`artifact_length_mismatch:${path}`);
  if (sha256File(path) !== sha256) throw new Error(`artifact_hash_mismatch:${path}`);
}

function readQpc() {
  const source = "[pscustomobject]@{counter=[Diagnostics.Stopwatch]::GetTimestamp();frequency=[Diagnostics.Stopwatch]::Frequency}|ConvertTo-Json -Compress";
  const value = runPowerShellJson(source, {}, 5_000);
  return { counter: BigInt(value.counter), frequency: BigInt(value.frequency) };
}

function requireLiveTime(ctx, clock) {
  const status = deadlineStatus(clock, readQpc().counter);
  if (status.expired) {
    const state = existsSync(statePath(ctx)) ? readState(ctx) : { status: "ready", dispatches: {}, toolsetVerdict: null, runtimeVerdict: null };
    const changed = nextState(state, "deadline", readQpc().counter, clock);
    writeState(ctx, changed);
    writeJson(resolve(ctx.outputRoot, "blocker.json"), { version: "aurora-model-proof-120s-blocker/v1", code: "MODEL_PROOF_120S_DEADLINE", createdAtUtc: new Date().toISOString(), elapsed: status, toolsetVerdict: state.toolsetVerdict, runtimeVerdict: state.runtimeVerdict });
    throw new Error("MODEL_PROOF_120S_DEADLINE");
  }
  return status;
}

function boundedTimeout(ctx, clock, desiredMs) {
  const status = requireLiveTime(ctx, clock);
  return Math.max(1, Math.min(desiredMs, status.remainingMs));
}

function readClock(ctx) { return readJson(resolve(ctx.outputRoot, "run-clock.json")); }
function statePath(ctx) { return resolve(ctx.outputRoot, "state.json"); }
function readState(ctx) { return readJson(statePath(ctx)); }
function writeState(ctx, state) { writeJson(statePath(ctx), state); }
function readStatus(ctx) {
  if (!existsSync(ctx.outputRoot)) return { ok: true, status: "not_started", profileId: ctx.profile.id };
  const accepted = validatePublishedAcceptance(ctx);
  return { ok: true, status: accepted ? "verified" : readState(ctx).status, state: readState(ctx), clock: readClock(ctx), finalProvisionalExists: existsSync(resolve(ctx.outputRoot, "final-model-proof.json")), acceptedProof: accepted, blockerExists: existsSync(resolve(ctx.outputRoot, "blocker.json")) };
}

function validatePublishedAcceptance(ctx) {
  const names = readdirSync(ctx.outputRoot).filter((name) => /^final-model-proof\.accepted-at-\d+\.json$/u.test(name));
  if (names.length === 0) return null;
  if (names.length !== 1) throw new Error(`accepted_proof_count_invalid:${names.length}`);
  const match = /^final-model-proof\.accepted-at-(\d+)\.json$/u.exec(names[0]);
  const publishCounter = BigInt(match[1]);
  const clock = readClock(ctx);
  const elapsed = deadlineStatus(clock, publishCounter);
  if (elapsed.expired) throw new Error("accepted_proof_counter_after_deadline");
  const path = resolve(ctx.outputRoot, names[0]);
  const acceptance = readJson(path);
  const finalPath = resolve(ctx.outputRoot, "final-model-proof.json");
  if (acceptance.version !== "aurora-model-proof-120s-acceptance/v1" || acceptance.profileId !== ctx.profile.id || acceptance.profileSha256 !== ctx.profileSha256) throw new Error("accepted_proof_identity_invalid");
  if (!existsSync(finalPath) || acceptance.finalPacket.path !== finalPath || sha256File(finalPath) !== acceptance.finalPacket.sha256 || statSync(finalPath).size !== acceptance.finalPacket.byteLength) throw new Error("accepted_proof_final_packet_drift");
  const finalPacket = readJson(finalPath);
  if (finalPacket.status !== "pending_qpc_acceptance" || finalPacket.profile?.sha256 !== ctx.profileSha256) throw new Error("accepted_proof_final_packet_invalid");
  return { path, sha256: sha256File(path), publishCounter: publishCounter.toString(), elapsed, status: "verified", standardCertification: acceptance.standardCertification };
}

function writeFailure(ctx, failedCommand, error) {
  if (!existsSync(ctx.outputRoot)) return;
  const blockerPath = resolve(ctx.outputRoot, "blocker.json");
  if (existsSync(blockerPath)) return;
  const message = String(error?.message ?? error);
  let expired = /MODEL_PROOF_120S_DEADLINE|deadline_expired/u.test(message);
  if (!expired && existsSync(resolve(ctx.outputRoot, "run-clock.json"))) expired = deadlineStatus(readClock(ctx), readQpc().counter).expired;
  if (expired && existsSync(statePath(ctx))) {
    const state = readState(ctx);
    if (state.status !== "deadline") writeState(ctx, nextState(state, "deadline", readQpc().counter, readClock(ctx)));
  }
  writeJson(blockerPath, { version: "aurora-model-proof-120s-blocker/v1", createdAtUtc: new Date().toISOString(), code: expired ? "MODEL_PROOF_120S_DEADLINE" : "MODEL_PROOF_120S_LANE_FAILURE", failedCommand, error: message, visibility: { toolset: existsSync(statePath(ctx)) ? readState(ctx).toolsetVerdict ?? "not_tested" : "not_tested", runtime: existsSync(statePath(ctx)) ? readState(ctx).runtimeVerdict ?? "not_tested" : "not_tested" } });
}

function verifyArtifactMap(artifacts) {
  for (const artifact of Object.values(artifacts ?? {})) {
    if (!artifact?.path) continue;
    if (!existsSync(artifact.path) || sha256File(artifact.path) !== artifact.sha256 || (artifact.byteLength != null && statSync(artifact.path).size !== artifact.byteLength)) throw new Error(`final_artifact_drift:${artifact.path}`);
    if (artifact.metadataPath && (!existsSync(artifact.metadataPath) || sha256File(artifact.metadataPath) !== artifact.metadataSha256)) throw new Error(`final_artifact_metadata_drift:${artifact.metadataPath}`);
  }
}

function assertNoBlocker(ctx) {
  if (existsSync(resolve(ctx.outputRoot, "blocker.json"))) throw new Error("proof_run_already_blocked");
}

function requireRunIdentity(ctx, state) {
  if (state.profileId !== ctx.profile.id || state.profileSha256 !== ctx.profileSha256) throw new Error("active_run_profile_identity_drift");
}

function requireExactRouteManifest(ctx, routeIdentities) {
  const expected = routeIdentities
    .map(({ path, sha256, byteLength }) => ({ path: resolve(path), sha256, byteLength }))
    .sort((left, right) => left.path.toLowerCase().localeCompare(right.path.toLowerCase()));
  const declared = ctx.routeManifest.routes
    .map(({ path, sha256, byteLength }) => ({ path: resolve(path), sha256, byteLength }))
    .sort((left, right) => left.path.toLowerCase().localeCompare(right.path.toLowerCase()));
  if (JSON.stringify(declared) !== JSON.stringify(expected)) throw new Error("route_manifest_identity_set_mismatch");
}

function verifyOwnedRouteIdentities(ctx, state) {
  const readyPath = resolve(ctx.outputRoot, "ready.json");
  if (!existsSync(readyPath)) throw new Error("ready_packet_missing");
  if (!state.ready || state.ready.path !== readyPath || sha256File(readyPath) !== state.ready.sha256) throw new Error("ready_packet_identity_drift");
  const readyPacket = readJson(readyPath);
  const identities = readyPacket.routeIdentities ?? [];
  const expectedPaths = [...Object.values(ROUTE_SELF), ...Object.values(CHILD), ...Object.values(CONTRACT)].map((path) => resolve(path).toLowerCase()).sort();
  const actualPaths = identities.map((identity) => resolve(identity.path).toLowerCase()).sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) throw new Error("owned_route_identity_set_drift");
  requireExactRouteManifest(ctx, identities);
  for (const identity of identities) {
    if (!existsSync(identity.path) || statSync(identity.path).size !== identity.byteLength || sha256File(identity.path) !== identity.sha256) throw new Error(`owned_route_identity_drift:${identity.path}`);
  }
  return identities;
}

function validateBoundProofArtifacts(ctx, state) {
  const toolsetPacket = readJson(resolve(ctx.outputRoot, "toolset", "packet.json"));
  const toolsetVerdict = readJson(resolve(ctx.outputRoot, "toolset", "verdict.json"));
  if (toolsetPacket.version !== "aurora-model-proof-120s-toolset-packet/v1" || toolsetPacket.profileId !== ctx.profile.id || toolsetPacket.profileSha256 !== ctx.profileSha256) throw new Error("toolset_packet_identity_drift");
  if (JSON.stringify(toolsetPacket.module) !== JSON.stringify(ctx.profile.installedModule) || JSON.stringify(toolsetPacket.orderedHakList) !== JSON.stringify(ctx.profile.orderedHakList) || JSON.stringify(toolsetPacket.area) !== JSON.stringify(ctx.profile.area) || JSON.stringify(toolsetPacket.fixture) !== JSON.stringify(ctx.profile.fixture)) throw new Error("toolset_packet_candidate_drift");
  if (toolsetPacket.selection?.mode?.mode !== "objects" || toolsetPacket.selection?.mode?.after?.[1]?.checked !== true || toolsetPacket.selection?.mode?.after?.[0]?.checked !== false) throw new Error("toolset_objects_mode_readback_drift");
  if (toolsetPacket.selection?.target?.text !== ctx.profile.fixture.treeObjectText || toolsetPacket.selection?.caret?.text !== ctx.profile.fixture.treeObjectText || Number(toolsetPacket.selection?.target?.handle) !== Number(toolsetPacket.selection?.caret?.handle)) throw new Error("toolset_packet_selection_drift");
  if (toolsetPacket.capture.sha256 !== state.artifacts.toolsetCapture.sha256 || toolsetVerdict.captureSha256 !== state.artifacts.toolsetCapture.sha256 || toolsetPacket.visualInspection?.captureSha256 !== state.artifacts.toolsetCapture.sha256) throw new Error("toolset_packet_capture_binding_drift");
  if (toolsetPacket.capture.metadataSha256 !== state.artifacts.toolsetCapture.metadataSha256 || sha256File(toolsetPacket.capture.metadataPath) !== toolsetPacket.capture.metadataSha256) throw new Error("toolset_capture_metadata_binding_drift");
  if (toolsetPacket.modelVisibility !== state.toolsetVerdict || toolsetVerdict.modelVisibility !== state.toolsetVerdict || toolsetPacket.proofCompleteness !== "verified" || toolsetVerdict.proofCompleteness !== "verified") throw new Error("toolset_verdict_axis_drift");
  validatePngBytes(readFileSync(state.artifacts.toolsetCapture.path));
  readJson(state.artifacts.toolsetCapture.metadataPath);

  if (state.runtimeVerdict == null) return;
  const runtimePacket = readJson(resolve(ctx.outputRoot, "runtime", "packet.json"));
  const runtimeVerdict = readJson(resolve(ctx.outputRoot, "runtime", "verdict.json"));
  if (runtimePacket.version !== "aurora-model-proof-120s-runtime-packet/v1" || runtimePacket.profileId !== ctx.profile.id || runtimePacket.profileSha256 !== ctx.profileSha256 || runtimePacket.runtimeProfileId !== ctx.runtimeProfile.id) throw new Error("runtime_packet_identity_drift");
  if (JSON.stringify(runtimePacket.module) !== JSON.stringify(ctx.profile.installedModule) || JSON.stringify(runtimePacket.orderedHakList) !== JSON.stringify(ctx.profile.orderedHakList) || JSON.stringify(runtimePacket.area) !== JSON.stringify(ctx.profile.area) || JSON.stringify(runtimePacket.fixture) !== JSON.stringify(ctx.profile.fixture)) throw new Error("runtime_packet_candidate_drift");
  if (runtimePacket.capture.sha256 !== state.artifacts.runtimeCapture.sha256 || runtimeVerdict.captureSha256 !== state.artifacts.runtimeCapture.sha256 || runtimePacket.visualInspection?.captureSha256 !== state.artifacts.runtimeCapture.sha256) throw new Error("runtime_packet_capture_binding_drift");
  if (runtimePacket.modelVisibility !== state.runtimeVerdict || runtimeVerdict.modelVisibility !== state.runtimeVerdict || runtimePacket.proofCompleteness !== "verified" || runtimeVerdict.proofCompleteness !== "verified") throw new Error("runtime_verdict_axis_drift");
  if (runtimePacket.capture.metadataSha256 !== state.artifacts.runtimeCapture.metadataSha256 || sha256File(runtimePacket.capture.metadataPath) !== runtimePacket.capture.metadataSha256) throw new Error("runtime_capture_metadata_hash_drift");
  const runtimeCaptureMetadata = readJson(runtimePacket.capture.metadataPath);
  const lease = runtimeCaptureMetadata.zOrderLease;
  const leaseActive = lease?.lifted === true;
  if (JSON.stringify(runtimePacket.windowSurfaceLease) !== JSON.stringify(lease)) throw new Error("runtime_window_surface_lease_binding_drift");
  if (runtimePacket.safety?.testModuleCommandCount !== 1 || runtimePacket.safety?.usesGlobalInput !== false || runtimePacket.safety?.usesTopmost !== false || runtimePacket.safety?.activatesWindow !== false || runtimePacket.safety?.physicalCaptureCount !== 1) throw new Error("runtime_packet_safety_drift");
  if (runtimePacket.safety?.changesZOrder !== leaseActive || runtimePacket.safety?.temporaryZOrderLease !== leaseActive || runtimePacket.safety?.zOrderRestored !== true) throw new Error("runtime_packet_zorder_lease_safety_drift");
  if (leaseActive) {
    if (lease.zOrderMutationCount !== 2 || lease.restore?.required !== true || lease.restore?.attempted !== true || lease.restore?.succeeded !== true || lease.restore?.predecessorHwndAfter !== lease.originalPredecessor?.hwnd || lease.restore?.predecessorPidAfter !== lease.originalPredecessor?.pid || lease.lift?.target !== "HWND_TOP" || lease.lift?.usesTopmost !== false || lease.lift?.activatesWindow !== false) throw new Error("runtime_packet_zorder_lease_restore_drift");
  } else if (lease?.zOrderMutationCount !== 0 || lease?.restore?.succeeded !== true) {
    throw new Error("runtime_packet_unneeded_zorder_mutation");
  }
  if (runtimePacket.observation?.sha256 !== state.artifacts.runtimeObservation.sha256 || runtimePacket.engineLogWindow?.sha256 !== state.artifacts.runtimeLog.sha256) throw new Error("runtime_observation_or_log_binding_drift");
  if (runtimePacket.windowPreparation?.sha256 !== state.artifacts.runtimeWindowPreparation.sha256 || sha256File(runtimePacket.windowPreparation.path) !== runtimePacket.windowPreparation.sha256) throw new Error("runtime_window_preparation_binding_drift");
  if (sha256File(runtimePacket.request.path) !== runtimePacket.request.sha256 || sha256File(runtimePacket.handoff.path) !== runtimePacket.handoff.sha256 || sha256File(runtimePacket.observation.path) !== runtimePacket.observation.sha256) throw new Error("runtime_request_handoff_observation_hash_drift");
  if (sha256File(runtimePacket.engineLogWindow.metadataPath) !== runtimePacket.engineLogWindow.metadataSha256) throw new Error("runtime_log_metadata_hash_drift");
  const logMeta = readJson(state.artifacts.runtimeLog.metadataPath);
  if (logMeta.loadingModuleResref !== ctx.profile.runtime.loadingModuleResref || logMeta.requestId !== runtimePacket.request.requestId || logMeta.process?.pid !== runtimePacket.process?.pid) throw new Error("runtime_log_metadata_binding_drift");
  const request = readJson(runtimePacket.request.path);
  const handoff = readJson(runtimePacket.handoff.path);
  const observation = readJson(runtimePacket.observation.path);
  const windowPreparation = readJson(runtimePacket.windowPreparation.path);
  if (request.requestId !== runtimePacket.request.requestId || request.profileId !== ctx.runtimeProfile.id || request.moduleSha256 !== ctx.profile.installedModule.sha256 || request.area !== ctx.profile.area.resref) throw new Error("runtime_request_binding_drift");
  if (handoff.requestId !== request.requestId || handoff.profileId !== ctx.runtimeProfile.id || handoff.testModule?.commandId !== 121 || handoff.testModule?.commandCount !== 1 || handoff.testModule?.nwmainPid !== runtimePacket.process?.pid) throw new Error("runtime_handoff_binding_drift");
  if (observation.profileId !== ctx.runtimeProfile.id || observation.process?.pid !== runtimePacket.process?.pid || observation.moduleSha256 !== ctx.profile.installedModule.sha256 || observation.area !== ctx.profile.area.resref) throw new Error("runtime_observation_binding_drift");
  if (windowPreparation.status !== "verified" || windowPreparation.process?.pid !== runtimePacket.process?.pid || windowPreparation.process?.startedAtUtc !== runtimePacket.process?.startedAtUtc || windowPreparation.monitor?.primary !== false || windowPreparation.safety?.changesZOrder !== false || windowPreparation.safety?.activatesWindow !== false) throw new Error("runtime_window_preparation_semantics_drift");
  if (Date.parse(runtimePacket.process?.startedAtUtc) < Date.parse(request.createdAt)) throw new Error("runtime_process_predates_request");
  validatePngBytes(readFileSync(state.artifacts.runtimeCapture.path));
  readJson(state.artifacts.runtimeCapture.metadataPath);
}

function snapshotFile(path) {
  if (!existsSync(path)) throw new Error(`engine_log_missing:${path}`);
  const stat = statSync(path, { bigint: true });
  return {
    capturedAtUtc: new Date().toISOString(),
    identity: { dev: stat.dev.toString(), ino: stat.ino.toString(), size: stat.size.toString(), mtimeNs: stat.mtimeNs.toString() },
    sha256: sha256File(path),
  };
}

function readNwnProcesses() {
  const source = String.raw`@((Get-Process nwmain -ErrorAction SilentlyContinue)|ForEach-Object{[pscustomobject]@{pid=$_.Id;name=$_.ProcessName.ToLowerInvariant();startedAtUtc=$_.StartTime.ToUniversalTime().ToString('o');responding=$_.Responding;mainWindowHandle=$_.MainWindowHandle.ToInt64();title=$_.MainWindowTitle}})|ConvertTo-Json -Compress`;
  const raw = execFileSync("powershell.exe", ["-NoProfile", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 5_000 }).trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function readCleanupArtifactIdentities(artifacts) {
  const actual = {};
  for (const [name, artifact] of Object.entries(artifacts ?? {})) {
    if (!artifact?.path || !existsSync(artifact.path)) continue;
    actual[name] = {
      path: artifact.path,
      sha256: sha256File(artifact.path),
      byteLength: statSync(artifact.path).size,
    };
    if (artifact.metadataPath && existsSync(artifact.metadataPath)) {
      actual[name].metadataPath = artifact.metadataPath;
      actual[name].metadataSha256 = sha256File(artifact.metadataPath);
    }
  }
  return actual;
}

function runNodeAllowFailure(script, args, timeout) {
  const child = spawnSync(process.execPath, [script, ...args], {
    cwd: STANDARD_ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  let result = null;
  try {
    if (child.stdout?.trim()) result = JSON.parse(child.stdout.trim());
  } catch {
    result = null;
  }
  return {
    status: child.status,
    signal: child.signal,
    result,
    stderr: child.stderr?.trim() ?? "",
  };
}

function readProofProcessCounts() {
  const source = String.raw`[pscustomobject]@{nwmain=@(Get-Process nwmain -ErrorAction SilentlyContinue).Count;nwtoolset=@(Get-Process nwtoolset -ErrorAction SilentlyContinue).Count}|ConvertTo-Json -Compress`;
  return runPowerShellJson(source, {}, 5_000);
}

function runNode(script, args, timeout) {
  const output = execFileSync(process.execPath, [script, ...args], { cwd: STANDARD_ROOT, encoding: "utf8", windowsHide: true, timeout, maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(output.trim());
}

function runPowerShellJson(source, env, timeout) {
  const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, ...env } });
  return JSON.parse(output.trim());
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
}

function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function sha256File(path) { return sha256Bytes(readFileSync(path)); }
function sha256Bytes(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function sleepMs(ms) { const buffer = new SharedArrayBuffer(4); Atomics.wait(new Int32Array(buffer), 0, 0, ms); }
function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); }
function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); result[key.slice(2)] = value; } return result; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function requiredPath(value, name) { return resolve(required(value, name)); }
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
