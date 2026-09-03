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
  evaluateToolsetSessionCompletion,
  evaluateToolsetSessionCoverage,
  inspectToolsetSessionLiveness,
  markAreaReady,
  markModuleReady,
  recordAreaCapture,
  recordAuroraEyeArtifact,
  recordSceneObservation,
  recordProofPacket,
  recordCameraCalibration,
  recordNativeCameraResponseModel,
  recordSourceSelectionProof,
  recordTilePropertyReadback,
  recordStartupLoadSignal,
  recordToolsetProcessStart,
  recordModuleOpenProof,
  recordLaneFailure,
  recordViewportTargetEvaluation,
} from "./lib/aurora-toolset-session-state.mjs";
import { TOOLSET_APPROVED_PROOF_WINDOW_LEFT } from "./lib/toolset-startup-load-plan.mjs";
import { persistM0CaptureFailure, transitionM0CaptureFailure } from "./lib/aurora-toolset-m0-route-state.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const defaultModulePath =
  "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\the_last_city - codex.mod";
const defaultModuleSha256 = "B774037F160A9BE3FCC0E985DDE880A0AE97E10AF2BF868C38A3F6573CBB021E";
const defaultQueuePath = resolve(repoRoot, ".codex-tmp/area-audit-queue-20260710/manifest.json");
const defaultOutDir = resolve(repoRoot, ".codex-tmp/area-toolset-oracle-20260710");
const enonBakeryModulePath =
  "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\codex_enon_bakery_orientation_lab_2026-07-10T21-27-06-925Z.mod";
const enonBakeryQueuePath = resolve(repoRoot, ".codex-tmp/aurora-camera-core-enon-bakery/queue.json");
const enonBakeryOutDir = resolve(repoRoot, ".codex-tmp/aurora-camera-core-enon-bakery/live");
const npcItemLiveModulePath =
  "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\codex_npc_item_live_20260713.mod";
const npcItemLiveQueuePath = resolve(repoRoot, ".codex-tmp/aurora-npc-item-live-20260713/queue.json");
const npcItemLiveOutDir = resolve(repoRoot, ".codex-tmp/aurora-npc-item-live-20260713/live");
const placeableLiveModulePath =
  "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\codex_npc_item_live_20260713.mod";
const placeableLiveQueuePath = resolve(repoRoot, ".codex-tmp/aurora-placeable-live-standard-20260714/queue.json");
const placeableLiveOutDir = resolve(repoRoot, ".codex-tmp/aurora-placeable-live-standard-20260714/live-actual");
// Owner-authorized external-reference control for Meshy2Aurora.  It keeps the
// one canonical MOD/HAK resref while letting the established session runner
// own the only Toolset launch; source model bytes are never read by this file.
const m2aSquirrelReferenceModulePath =
  "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\m2a_codex_aproof.mod";
const m2aSquirrelReferenceQueuePath =
  "C:\\Projects\\meshy2aurora\\proof-output\\lc-c-squirrel-reference-control-v1\\toolset-session-queue.json";
const m2aSquirrelReferenceOutDir =
  "C:\\Projects\\meshy2aurora\\proof-output\\lc-c-squirrel-reference-control-v1\\toolset-session";
const m0StaticRigidModulePath =
  "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\m2a_m0_proof.mod";
const m0StaticRigidQueuePath = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/proof-profiles/m0-static-rigid-v5-toolset-queue.json",
);
const openerPath = resolve(scriptDir, "open-last-city-module-and-area-toolset-no-global-input.mjs");
const queueRunnerPath = resolve(scriptDir, "run-toolset-area-oracle-queue.mjs");
const closePath = resolve(scriptDir, "close-aurora-toolset-window-no-global-input.mjs");
const blockerCapturePath = resolve(scriptDir, "capture-aurora-toolset-blocker-dialog.mjs");
const openProofCapturePath = resolve(scriptDir, "capture-aurora-toolset-open-proof.mjs");
const observerPath = resolve(scriptDir, "observe-aurora-toolset-scene.mjs");
const tileLayoutInspectorPath = resolve(scriptDir, "inspect-last-city-area-tile-layout.mjs");
const viewportTargetEvaluatorPath = resolve(scriptDir, "evaluate-aurora-toolset-viewport-target.mjs");
const tilePropertiesInspectorPath = resolve(scriptDir, "inspect-aurora-toolset-tile-properties.mjs");
const proofPacketAssemblerPath = resolve(scriptDir, "assemble-aurora-toolset-proof-packet.mjs");
const viewportProofPath = resolve(scriptDir, "aurora-toolset-viewport-proof.mjs");
const m0ProfileValidatorPath = resolve(scriptDir, "validate-aurora-m0-proof-profile.mjs");
const m0ToolsetPacketValidatorPath = resolve(scriptDir, "validate-aurora-m0-toolset-packet.mjs");
const guardPath = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-module-open-session-guard.json",
);

const [command = "status", ...rawArgs] = process.argv.slice(2);
const options = parseArgs(rawArgs);
const profileName = String(options.profile ?? "last-city");
const approvedProfiles = {
  "last-city": {
    requiresSixStageCoverage: true,
    modulePath: defaultModulePath,
    expectedSha256: defaultModuleSha256,
    queuePath: defaultQueuePath,
    outDir: defaultOutDir,
    expectedModule: "the_last_city - codex.mod",
    expectedModuleParts: "the_last_city|codex.mod",
    expectedArea: "appearance",
    expectedAreaName: "appearance",
  },
  "enon-bakery-camera-core": {
    requiresSixStageCoverage: true,
    modulePath: enonBakeryModulePath,
    expectedSha256: "19AB0C90DF8B20A9939C7C1DC9757074C705CB637112F2729CD6BDB85D2528EC",
    queuePath: enonBakeryQueuePath,
    outDir: enonBakeryOutDir,
    expectedModule: "codex_enon_bakery_orientation_lab_2026-07-10T21-27-06-925Z.mod",
    expectedModuleParts: "codex_enon_bakery_orientation_lab_2026-07-10T21-27-06-925Z",
    expectedArea: "enon_bakery",
    expectedAreaName: "enon_bakery",
  },
  "npc-item-live": {
    requiresSixStageCoverage: false,
    modulePath: npcItemLiveModulePath,
    // Toolset repacks the MOD container on a successful save. This is the
    // parser-verified rollback baseline from the latest Stage 2 live session.
    expectedSha256: "4E5EA21B5D70C6473028C03915A0265963D1A8D08BAFD052EDAAC6892324BCE1",
    queuePath: npcItemLiveQueuePath,
    outDir: npcItemLiveOutDir,
    expectedModule: "codex_npc_item_live_20260713.mod",
    expectedModuleParts: "codex_npc_item_live_20260713",
    expectedArea: "demo",
    expectedAreaName: "demo",
  },
  "placeable-live-standard": {
    requiresSixStageCoverage: false,
    modulePath: placeableLiveModulePath,
    expectedSha256: "266980EA87A2EA5097E6A189BCC06E90A5A1750214E9C00C7B7442B0729C2BFD",
    queuePath: placeableLiveQueuePath,
    outDir: placeableLiveOutDir,
    expectedModule: "codex_npc_item_live_20260713.mod",
    expectedModuleParts: "codex_npc_item_live_20260713",
    expectedArea: "demo",
    expectedAreaName: "demo",
  },
  "m2a-lc-squirrel-reference-control": {
    requiresSixStageCoverage: false,
    modulePath: m2aSquirrelReferenceModulePath,
    expectedSha256: "7AD62134FC301044AE8341B8965A1D969432D6396492C61965CD3F800F383EAB",
    queuePath: m2aSquirrelReferenceQueuePath,
    outDir: m2aSquirrelReferenceOutDir,
    expectedModule: "m2a_codex_aproof.mod",
    expectedModuleParts: "m2a_codex_aproof|mod",
    expectedArea: "m2a_caproof_area",
    expectedAreaName: "m2a_caproof_area",
  },
  "m0-static-rigid-v5": {
    requiresSixStageCoverage: false,
    immutable: true,
    requiresCallerOutDir: true,
    m0ToolsetRoute: true,
    modulePath: m0StaticRigidModulePath,
    expectedSha256: "D63B9B71C421EE07AD678619BE92B3F624FEBFECDCD4B09EBd9FDCAA2E13C753",
    queuePath: m0StaticRigidQueuePath,
    outDir: null,
    expectedModule: "m2a_m0_proof.mod",
    expectedModuleParts: "m2a_m0_proof|mod",
    expectedArea: "m2a_m0proof_area",
    expectedAreaName: "Meshy2Aurora M0 static runtime proof area",
  },
};
const profile = approvedProfiles[profileName];
if (!profile) {
  throw workflowError(
    "UNKNOWN_APPROVED_TOOLSET_PROFILE",
    `Unknown profile ${profileName}. Approved profiles: ${Object.keys(approvedProfiles).join(", ")}.`,
  );
}
const configuredOutDir = resolve(String(options.outDir ?? profile.outDir ?? ".codex-tmp/unconfigured-m0-artifact-destination"));
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
  reuseExistingSession:
    options.reuseExistingSession === "true" ||
    options.reuseExistingSession === "1" ||
    options.reuseExistingSession === true,
  userAuthorizedClose:
    options.userAuthorizedClose === "true" ||
    options.userAuthorizedClose === "1" ||
    options.userAuthorizedClose === true,
  closeAuthorization: String(options.closeAuthorization ?? "").trim(),
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
  assertProfileOptionContract();
  switch (name) {
    case "m0-dry-run":
      return runM0DryRun();
    case "m0-reconcile-capture-failure":
      return runM0ReconcileCaptureFailure();
    case "preflight":
      return runPreflight();
    case "open":
      return runOpen();
    case "capture-open-proof":
      return runCaptureOpenProof();
    case "run-queue":
      return runQueue();
    case "observe":
      return runObserve();
    case "record-eye-artifact":
      return runRecordAuroraEyeArtifact();
    case "record-lane-failure":
      return runRecordLaneFailure();
    case "read-tile-properties":
      return runReadTileProperties();
    case "record-source-selection":
      return runRecordSourceSelection();
    case "record-camera-calibration":
      return runRecordCameraCalibration();
    case "record-native-camera-response":
      return runRecordNativeCameraResponse();
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
      return {
        ok: true,
        command: name,
        state,
        processes,
        sessionLiveness: inspectToolsetSessionLiveness(state, processes),
        coverage: evaluateToolsetSessionCoverage(state),
        completion: evaluateToolsetSessionCompletion(state),
      };
    }
    default:
      throw workflowError(
        "UNKNOWN_TOOLSET_SESSION_COMMAND",
        `Unknown command ${name}. Use m0-dry-run, m0-reconcile-capture-failure, preflight, open, capture-open-proof, run-queue, observe, record-eye-artifact, record-source-selection, record-camera-calibration, record-native-camera-response, read-tile-properties, verify-viewport-target, assemble-proof-packet, reconcile, close, all, or status. Close additionally requires --userAuthorizedClose true and --closeAuthorization <user-request>.`,
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
    throw workflowError("TOOLSET_SESSION_RECONCILE_REQUIRES_LIVE_SESSION", "A live Toolset session cannot be reconciled. Keep it open; close requires explicit user authorization.");
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
  let observation;
  try {
    observation = runJson(
      observerPath,
      ["--module", config.expectedModule, "--area", area, "--sourceModulePath", sourceModulePath, "--outDir", outDir],
      180_000,
      true,
    );
  } catch (error) {
    const observationPath = resolve(outDir, "scene-observation-failure.json");
    writeFileSync(observationPath, `${JSON.stringify({ status: "blocked", blockerCode: error?.code ?? "toolset_observation_failed", message: error instanceof Error ? error.message : String(error), area, sourceModulePath }, null, 2)}\n`, "utf8");
    state = recordSceneObservation(state, { resref: area, observationPath, status: "blocked" });
    state = recordLaneFailure(state, { lane: "source_context", code: error?.code ?? "toolset_observation_failed", details: { evidencePath: observationPath } });
    writeState(state);
    return { ok: false, command: "observe", statePath: config.statePath, state, observationPath };
  }
  const observationPath = observation.observationPath;
  if (!observationPath || !existsSync(observationPath)) {
    throw workflowError("TOOLSET_OBSERVATION_ARTIFACT_MISSING", "Observer did not produce scene-observation.json.");
  }
  state = recordSceneObservation(state, { resref: area, observationPath, status: observation.status });
  writeState(state);
  return { ok: true, command: "observe", statePath: config.statePath, state, observation };
}

function runRecordAuroraEyeArtifact() {
  let state = requireStatePhase("area_ready");
  const area = state.currentArea?.resref;
  if (!area) throw workflowError("EYE_ARTIFACT_AREA_MISSING", "Aurora Eye artifact requires a current Area.");
  const stage = String(options.stage ?? "");
  const pngPath = requiredExistingPath(options.pngPath, "--pngPath");
  const resultPath = requiredExistingPath(options.resultPath, "--resultPath");
  const result = readJson(resultPath);
  if (!["verified", "failed", "blocked"].includes(result?.status)) {
    throw workflowError("EYE_ARTIFACT_STATUS_INVALID", JSON.stringify({ stage, resultPath, status: result?.status ?? null }));
  }
  state = recordAuroraEyeArtifact(state, { resref: area, stage, pngPath, resultPath, status: result.status });
  writeState(state);
  return { ok: result.status === "verified", command: "record-eye-artifact", statePath: config.statePath, state, stage, pngPath, resultPath };
}

function runRecordLaneFailure() {
  let state = requireStatePhase("area_ready");
  const lane = String(options.lane ?? "");
  if (!["module_open", "aurora_eye", "native_camera_response", "viewport_target"].includes(lane)) {
    throw workflowError("TOOLSET_LANE_FAILURE_LANE_INVALID", `Unsupported lane: ${lane}`);
  }
  const code = String(options.code ?? "").trim();
  if (!code) throw workflowError("TOOLSET_LANE_FAILURE_CODE_REQUIRED", "--code is required.");
  const evidencePath = requiredExistingPath(options.evidencePath, "--evidencePath");
  state = recordLaneFailure(state, { lane, code, details: { evidencePath } });
  writeState(state);
  return { ok: false, command: "record-lane-failure", statePath: config.statePath, state, lane, code, evidencePath };
}

function runVerifyViewportTarget() {
  let state = requireStatePhase("area_ready");
  const area = state.currentArea?.resref;
  if (!area) throw workflowError("VIEWPORT_TARGET_AREA_MISSING", "Viewport target verification requires a current Area.");
  if (Number(options.yawDegrees) !== 45) {
    throw workflowError("TOOLSET_VIEWPORT_TARGET_MUST_BE_45_DEGREES", "The canonical completion target is exactly 45 degrees yaw.");
  }
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
  appendOptionalOption(args, "tileIndex", "--tileIndex");
  appendOptionalOption(args, "tileX", "--tileX");
  appendOptionalOption(args, "tileY", "--tileY");
  appendOptionalOption(args, "tileId", "--tileId");
  appendOptionalOption(args, "orientation", "--orientation");
  appendRequiredOption(args, "yawDegrees", "--yawDegrees");
  appendRequiredOption(args, "pitchDegrees", "--pitchDegrees");
  const absoluteCoreResultPath = options.absoluteCoreResult
    ? requiredExistingPath(options.absoluteCoreResult, "--absoluteCoreResult")
    : null;
  if (absoluteCoreResultPath) {
    args.push("--absoluteCoreResult", absoluteCoreResultPath);
    appendRequiredOption(args, "zoom", "--zoom");
    appendRequiredOption(args, "centreX", "--centreX");
    appendRequiredOption(args, "centreY", "--centreY");
    appendOptionalOption(args, "centerToleranceWorld", "--centerToleranceWorld");
    for (const [optionName, cliName] of [["eyeBeforeA", "--eyeBeforeA"], ["eyeBeforeB", "--eyeBeforeB"], ["eyeAfter", "--eyeAfter"], ["eyeBaseline", "--eyeBaseline"], ["eyeEffect", "--eyeEffect"]]) {
      args.push(cliName, requiredExistingPath(options[optionName], cliName));
    }
  } else {
    appendRequiredOption(args, "zoomPixelsPerTile", "--zoomPixelsPerTile");
  }
  appendOptionalOption(args, "yawTolerance", "--yawTolerance");
  appendOptionalOption(args, "pitchTolerance", "--pitchTolerance");
  appendOptionalOption(args, "zoomToleranceRatio", "--zoomToleranceRatio");
  appendOptionalOption(args, "centerTolerancePixels", "--centerTolerancePixels");
  const cameraCalibrationPath = options.cameraCalibration
    ? requiredExistingPath(options.cameraCalibration, "--cameraCalibration")
    : resolveLatestCameraCalibration(state);
  if (cameraCalibrationPath) args.push("--cameraCalibration", cameraCalibrationPath);
  const selectionReadbackPath = options.selectionReadback
    ? requiredExistingPath(options.selectionReadback, "--selectionReadback")
    : (resolveLatestSourceSelectionProof(state) ?? resolveLatestTilePropertyReadback(state));
  if (selectionReadbackPath) args.push("--selectionReadback", selectionReadbackPath);
  const evaluation = runJson(viewportTargetEvaluatorPath, args, 120_000, true);
  if (!existsSync(reportPath)) {
    throw workflowError("VIEWPORT_TARGET_REPORT_MISSING", "Viewport target evaluator did not produce a report.");
  }
  const report = readJson(reportPath);
  if (Number(report?.target?.camera?.yawDegrees) !== 45) {
    throw workflowError("TOOLSET_VIEWPORT_TARGET_REPORT_NOT_45_DEGREES", `Target report does not prove yaw 45 degrees: ${reportPath}`);
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

function runRecordSourceSelection() {
  let state = requireStatePhase("area_ready");
  const area = state.currentArea?.resref;
  if (!area) throw workflowError("SOURCE_SELECTION_PROOF_AREA_MISSING", "Source selection proof requires a current Area.");
  const proofPath = requiredExistingPath(options.selectionProof, "--selectionProof");
  const proof = readJson(proofPath);
  if (proof?.status !== "verified" || proof?.evidenceKind !== "source-targeted-visual-selection/v1") {
    throw workflowError("SOURCE_SELECTION_PROOF_UNVERIFIED", JSON.stringify({ proofPath, status: proof?.status ?? null, evidenceKind: proof?.evidenceKind ?? null }));
  }
  if (String(proof?.plan?.area ?? "").toLowerCase() !== area || String(proof?.plan?.module ?? "") !== config.expectedModule) {
    throw workflowError("SOURCE_SELECTION_PROOF_TARGET_MISMATCH", JSON.stringify({ expectedArea: area, proofArea: proof?.plan?.area ?? null, expectedModule: config.expectedModule, proofModule: proof?.plan?.module ?? null }));
  }
  state = recordSourceSelectionProof(state, { resref: area, proofPath, status: proof.status });
  writeState(state);
  return { ok: true, command: "record-source-selection", statePath: config.statePath, state, proofPath };
}

function runRecordCameraCalibration() {
  let state = requireStatePhase("area_ready");
  const area = state.currentArea?.resref;
  const calibrationPath = requiredExistingPath(options.cameraCalibration, "--cameraCalibration");
  const calibration = readJson(calibrationPath);
  if (calibration?.status !== "estimated" || !Number.isFinite(Number(calibration?.yawDegrees)) || calibration?.yawEvidence?.method !== "source-grid-directed-selection/v1") {
    throw workflowError("CAMERA_CALIBRATION_UNVERIFIED", JSON.stringify({ calibrationPath, status: calibration?.status ?? null }));
  }
  state = recordCameraCalibration(state, { resref: area, calibrationPath, status: calibration.status });
  writeState(state);
  return { ok: true, command: "record-camera-calibration", statePath: config.statePath, state, calibrationPath };
}

function runRecordNativeCameraResponse() {
  let state = requireStatePhase("area_ready");
  const area = state.currentArea?.resref;
  if (!area) throw workflowError("NATIVE_CAMERA_MODEL_AREA_MISSING", "Native camera response model requires a current Area.");
  const modelPath = requiredExistingPath(options.cameraResponseModel, "--cameraResponseModel");
  const model = readJson(modelPath);
  if (model?.status !== "measured" || model?.source !== "native_readback" || !Number.isInteger(model?.sampleCount) || model.sampleCount < 3) {
    throw workflowError("NATIVE_CAMERA_MODEL_UNVERIFIED", JSON.stringify({ modelPath, status: model?.status ?? null, source: model?.source ?? null }));
  }
  if (String(model?.area ?? "").toLowerCase() !== area || !model?.command || !model?.deltas || model?.binarySha256 !== "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24") {
    throw workflowError("NATIVE_CAMERA_MODEL_CONTEXT_MISMATCH", JSON.stringify({ modelPath, expectedArea: area }));
  }
  const controlledAxes = ["yawDegrees", "pitchDegrees", "zoomLogRatio"].filter((axis) => Number.isFinite(Number(model.deltas[axis])) && Math.abs(Number(model.deltas[axis])) > 1e-12);
  if (controlledAxes.length !== 1) {
    throw workflowError("NATIVE_CAMERA_MODEL_COUPLED_OR_EMPTY", JSON.stringify({ modelPath, controlledAxes }));
  }
  state = recordNativeCameraResponseModel(state, { resref: area, modelPath, command: model.command, controlledAxes, sampleCount: model.sampleCount });
  writeState(state);
  return { ok: true, command: "record-native-camera-response", statePath: config.statePath, state, modelPath, controlledAxes };
}

function runAssembleProofPacket() {
  let state = requireStatePhase("area_ready");
  const area = state.currentArea?.resref;
  if (!area) throw workflowError("PROOF_PACKET_AREA_MISSING", "Proof packet requires a current Area.");
  const observationPath = resolveViewportTargetObservation(state);
  const targetReportPath = resolveLatestViewportTargetReport(state);
  const tileReadbackPath = options.tileReadback
    ? requiredExistingPath(options.tileReadback, "--tileReadback")
    : (resolveLatestSourceSelectionProof(state) ?? resolveLatestTilePropertyReadback(state));
  const cameraCalibrationPath = options.cameraCalibration
    ? requiredExistingPath(options.cameraCalibration, "--cameraCalibration")
    : resolveLatestCameraCalibration(state);
  const packetPath = resolve(config.outDir, "proof-packets", `${area}-${timestampSegment()}.json`);
  const args = ["--session", config.statePath, "--observation", observationPath, "--targetReport", targetReportPath, "--out", packetPath];
  if (options.monitorEvidence) args.push("--monitorEvidence", requiredExistingPath(options.monitorEvidence, "--monitorEvidence"));
  if (tileReadbackPath) args.push("--tileReadback", tileReadbackPath);
  if (cameraCalibrationPath) args.push("--cameraCalibration", cameraCalibrationPath);
  if (options.absoluteCoreResult) args.push("--absoluteCoreResult", requiredExistingPath(options.absoluteCoreResult, "--absoluteCoreResult"));
  for (const [optionName, cliName] of [["eyeBeforeA", "--eyeBeforeA"], ["eyeBeforeB", "--eyeBeforeB"], ["eyeAfter", "--eyeAfter"], ["eyeBaseline", "--eyeBaseline"], ["eyeEffect", "--eyeEffect"]]) {
    if (options[optionName]) args.push(cliName, requiredExistingPath(options[optionName], cliName));
  }
  const result = runJson(proofPacketAssemblerPath, args, 60_000, true);
  if (!existsSync(packetPath)) throw workflowError("PROOF_PACKET_ARTIFACT_MISSING", "Proof-packet assembler did not produce its artifact.");
  state = recordProofPacket(state, { resref: area, packetPath, status: result.status, blockerCodes: result.blockerCodes ?? [] });
  writeState(state);
  if (result.status !== "verified") throw workflowError("AURORA_PROOF_PACKET_UNVERIFIED", JSON.stringify({ packetPath, blockerCodes: result.blockerCodes ?? [] }));
  return { ok: true, command: "assemble-proof-packet", statePath: config.statePath, state, packetPath, result };
}

function runAll() {
  throw workflowError(
    "CANONICAL_TOOLSET_WORKFLOW_STAGES_REQUIRED",
    "The former all command bypasses observation, source selection, camera calibration, and proof assembly. Run the canonical named stages instead.",
  );
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
  if (profile.m0ToolsetRoute) {
    const m0ProfilePreflight = runJson(m0ProfileValidatorPath, ["--mode", "preflight"], 60_000, true);
    if (m0ProfilePreflight.ok !== true || m0ProfilePreflight.preflight !== "verified") {
      throw workflowError("M0_PROFILE_PREFLIGHT_FAILED", JSON.stringify(m0ProfilePreflight));
    }
    if (m0ProfilePreflight.proofReadiness !== "verified") {
      throw workflowError("AREA_GEOMETRY_INVALID", JSON.stringify(m0ProfilePreflight));
    }
    assertM0QueueContract(queue);
  }
  const moduleSha256 = sha256(config.modulePath);
  if (moduleSha256 !== config.expectedSha256) {
    throw workflowError(
      "APPROVED_MODULE_HASH_MISMATCH",
      `Expected ${config.expectedSha256}, received ${moduleSha256}.`,
    );
  }

  const preflight = runJson(
    openerPath,
    openerArgs({ preflightOnly: true, reuseExistingSession: config.reuseExistingSession }),
    120_000,
    true,
  );
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
  if (beforeProcesses.length !== 0 && !(config.reuseExistingSession && beforeProcesses.length === 1)) {
    throw workflowError("TOOLSET_PROCESS_ALREADY_RUNNING", "Open requires zero processes, or exactly one explicitly requested reuse session.");
  }

  const result = runJson(openerPath, openerArgs({ skipAreaOpen: true, reuseExistingSession: config.reuseExistingSession }), 360_000, true, {
    AURORA_TOOLSET_CANONICAL_SESSION_ENTRYPOINT: "1",
  });
  const afterProcesses = readToolsetProcesses();
  if (afterProcesses.length > 1) {
    state = blockToolsetSession(state, {
      code: "MULTIPLE_TOOLSET_PROCESSES_DETECTED",
      details: afterProcesses,
    });
    writeState(state);
    preserveLiveSessionAfterFailure("multiple_toolset_processes_detected");
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
    preserveLiveSessionAfterFailure(state.blocker.code);
    throw workflowError(state.blocker.code, "The single module load did not reach a clean ready state.");
  }

  const loadOwner = reportedLoadOwner;
  if (!loadOwner) {
    state = blockToolsetSession(state, { code: "MODULE_LOAD_OWNER_MISSING", details: result });
    writeState(state);
    preserveLiveSessionAfterFailure("module_load_owner_missing");
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

function runCaptureOpenProof() {
  let state = requireStatePhase("module_ready");
  const processes = readToolsetProcesses();
  if (processes.length !== 1) {
    throw workflowError("TOOLSET_OPEN_PROOF_REQUIRES_ONE_PROCESS", "Open proof requires exactly one live Toolset process.");
  }
  const proofPath = resolve(config.outDir, "open-proofs", `module-open-${timestampSegment()}.png`);
  const proof = runJson(openProofCapturePath, ["--module", config.expectedModule, "--out", proofPath], 60_000, true);
  if (proof.ok !== true || !existsSync(proofPath)) {
    throw workflowError(proof.blockerCode ?? "TOOLSET_OPEN_PROOF_FAILED", proof.message ?? "Toolset open proof did not produce a PNG.");
  }
  state = recordModuleOpenProof(state, { proofPath, monitorEvidence: proof.monitorEvidence });
  writeState(state);
  return { ok: true, command: "capture-open-proof", statePath: config.statePath, proofPath, proof, state };
}

function runQueue() {
  if (profile.m0ToolsetRoute) return runM0Queue();
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
    const blockerCode = blocker?.blockerCode ?? summary.firstBlocker ?? "AREA_QUEUE_BLOCKED";
    const areaWasOpened = blocker?.areaOpen?.ok === true && blocker?.area?.resref;
    const processes = readToolsetProcesses();
    // The queue can fail after a valid Area bind (for example a rejected Eye
    // capture). Preserve that one live session for the remaining diagnostics.
    // Only a fatal Toolset condition is allowed to move the whole session to
    // `blocked`.
    if (areaWasOpened && processes.length === 1) {
      if (state.phase !== "area_ready" || state.currentArea?.resref !== blocker.area.resref) {
        state = markAreaReady(state, { resref: blocker.area.resref, name: blocker.area.name });
      }
      state = recordLaneFailure(state, {
        lane: "area_capture",
        code: blockerCode,
        details: blocker,
      });
    } else {
      state = blockToolsetSession(state, { code: blockerCode, details: blocker ?? summary });
    }
  }
  writeState(state);
  if (state.phase === "blocked") {
    throw workflowError(state.blocker.code, `Area queue stopped at ${state.capturedAreas.length} captures.`);
  }
  return {
    ok: manifest.status === "completed",
    command: "run-queue",
    statePath: config.statePath,
    continuedAreaNavigation: config.continueAreaNavigation,
    state,
    summary,
    recoverableLaneFailure: manifest.status !== "completed",
  };
}

function runM0DryRun() {
  const profileValidation = runJson(m0ProfileValidatorPath, ["--mode", "dry-run"], 60_000, true);
  if (profileValidation.ok !== true) throw workflowError("M0_PROFILE_DRY_RUN_FAILED", JSON.stringify(profileValidation));
  const queue = readQueue();
  assertM0QueueContract(queue);
  return {
    ok: true,
    command: "m0-dry-run",
    route: {
      profile: config.profileName,
      modulePath: config.modulePath,
      moduleSha256: config.expectedSha256,
      area: config.expectedArea,
      queue: queue.map((entry) => ({ resref: entry.resref, name: entry.name })),
      capture: { targetClass: "TScrollBox", script: viewportProofPath, noGlobalInput: true },
      artifactDestination: config.outDir,
      packetValidator: m0ToolsetPacketValidatorPath,
      modulePolicy: "existing_exact_read_only",
      proofReadiness: profileValidation.proofReadiness,
      geometryBlockerCode: profileValidation.geometryBlockerCode,
    },
  };
}

function runM0ReconcileCaptureFailure() {
  const captureError = String(options.captureError ?? "").trim();
  if (!captureError) throw workflowError("M0_CAPTURE_ERROR_REQUIRED", "--captureError must contain the recorded failed capture error.");
  const captureEvidencePath = options.captureEvidence
    ? requiredExistingPath(options.captureEvidence, "--captureEvidence")
    : null;
  const queueManifestPath = resolve(config.outDir, "manifest.json");
  const queueManifest = requireM0QueueManifest(queueManifestPath);
  const state = requireStatePhase("module_ready");
  assertM0ReconciliationState(state);
  const captureErrorEvidence = { message: captureError, evidencePath: captureEvidencePath };
  const blockerPath = resolve(config.outDir, "m0-toolset-capture-blocker.json");
  if (isTrue(options.dryRun)) {
    const nextState = transitionM0CaptureFailure(state, {
      resref: config.expectedArea,
      name: config.expectedAreaName,
      blockerPath,
      details: { queueManifestPath, captureError: captureErrorEvidence },
    });
    return {
      ok: true,
      command: "m0-reconcile-capture-failure",
      dryRun: true,
      wouldWrite: { blockerPath, state: nextState },
      queueManifest: queueManifestPath,
    };
  }
  const processes = readToolsetProcesses();
  if (processes.length !== 1 || processes[0]?.Responding === false) {
    throw workflowError("M0_RECONCILIATION_REQUIRES_ONE_RESPONSIVE_PROCESS", JSON.stringify(processes));
  }
  const persisted = persistM0CaptureFailure({
    state,
    artifactDir: config.outDir,
    profileId: config.profileName,
    modulePath: config.modulePath,
    moduleSha256: config.expectedSha256,
    resref: config.expectedArea,
    name: config.expectedAreaName,
    queueManifestPath,
    viewportPath: resolve(config.outDir, "viewport.png"),
    viewportResultPath: resolve(config.outDir, "viewport.json"),
    captureError: captureErrorEvidence,
  });
  writeState(persisted.state);
  return {
    ok: true,
    command: "m0-reconcile-capture-failure",
    statePath: config.statePath,
    state: persisted.state,
    blockerPath: persisted.blockerPath,
    queueManifest: queueManifestPath,
    process: processes[0],
  };
}

function runM0Queue() {
  let state = requireStatePhase("module_ready");
  assertM0GeometryReadiness();
  const queue = readQueue();
  assertM0QueueContract(queue);
  mkdirSync(config.outDir, { recursive: true });
  const queueSummary = runJson(
    queueRunnerPath,
    [
      "--queue", config.queuePath,
      "--expectedModule", config.expectedModule,
      "--expectedModuleParts", config.expectedModuleParts,
      "--outDir", config.outDir,
      "--capture", "false",
      "--settleMs", String(config.settleMs),
      "--wheelSteps", "0",
      "--offset", "0",
    ],
    120_000,
    true,
  );
  const queueManifestPath = resolve(config.outDir, "manifest.json");
  if (!existsSync(queueManifestPath)) throw workflowError("M0_TOOLSET_QUEUE_MANIFEST_MISSING", queueManifestPath);
  const queueManifest = readJson(queueManifestPath);
  if (queueSummary.status !== "completed" || queueManifest.status !== "completed") {
    throw workflowError("M0_TOOLSET_QUEUE_UNVERIFIED", JSON.stringify({ queueSummary, queueManifestPath }));
  }
  const opened = queueManifest.items?.find((item) => item.status === "opened" && item.area?.resref === config.expectedArea);
  if (!opened) throw workflowError("M0_TOOLSET_QUEUE_AREA_NOT_OPENED", config.expectedArea);
  state = markAreaReady(state, { resref: config.expectedArea, name: config.expectedAreaName });
  state.m0Queue = { manifestPath: queueManifestPath, status: queueManifest.status, openedAt: new Date().toISOString() };
  // Persist native Area proof before the independent viewport observer runs.
  // A failed capture must leave the healthy Toolset session resumable at Area.
  writeState(state);

  const viewportPath = resolve(config.outDir, "viewport.png");
  const viewportResultPath = resolve(config.outDir, "viewport.json");
  let viewport;
  try {
    viewport = runJson(
      viewportProofPath,
      [
        "capture",
        "--module", config.expectedModule,
        "--area", config.expectedArea,
        "--out", viewportPath,
        "--resultOut", viewportResultPath,
      ],
      60_000,
      true,
    );
    if (viewport.ok !== true || !existsSync(viewportPath) || !existsSync(viewportResultPath)) {
      throw workflowError("M0_TOOLSET_TSCROLLBOX_CAPTURE_FAILED", JSON.stringify(viewport));
    }
  } catch (error) {
    const persisted = persistM0CaptureFailure({
      state,
      artifactDir: config.outDir,
      profileId: config.profileName,
      modulePath: config.modulePath,
      moduleSha256: config.expectedSha256,
      resref: config.expectedArea,
      name: config.expectedAreaName,
      queueManifestPath,
      viewportPath,
      viewportResultPath,
      captureError: serializeError(error),
    });
    state = persisted.state;
    writeState(state);
    throw workflowError("M0_TOOLSET_TSCROLLBOX_CAPTURE_FAILED", JSON.stringify({ blockerPath: persisted.blockerPath, captureError: serializeError(error) }));
  }
  const packetPath = resolve(config.outDir, "m0-toolset-packet.json");
  writeFileSync(packetPath, `${JSON.stringify(buildM0ToolsetPacket({ queueManifestPath, viewportPath, viewportResultPath }), null, 2)}\n`, "utf8");
  const packetValidation = runJson(m0ToolsetPacketValidatorPath, ["--packet", packetPath], 60_000, true);
  if (packetValidation.status !== "verified") {
    throw workflowError("M0_TOOLSET_PACKET_UNVERIFIED", JSON.stringify({ packetPath, packetValidation }));
  }
  state = recordAreaCapture(state, { resref: config.expectedArea, pngPath: viewportPath });
  state.m0ToolsetProof = { queueManifestPath, viewportPath, viewportResultPath, packetPath, packetValidation };
  writeState(state);
  return { ok: true, command: "run-queue", statePath: config.statePath, state, queueSummary, packetPath, packetValidation };
}

function assertM0GeometryReadiness() {
  const profileValidation = runJson(m0ProfileValidatorPath, ["--mode", "dry-run"], 60_000, true);
  if (profileValidation.proofReadiness !== "verified") {
    throw workflowError("AREA_GEOMETRY_INVALID", JSON.stringify(profileValidation));
  }
}

function runClose() {
  let state = readState();
  assertExplicitUserCloseAuthorization();
  const coverage = evaluateToolsetSessionCoverage(state);
  const completion = evaluateToolsetSessionCompletion(state);
  if (profile.requiresSixStageCoverage && state?.phase !== "blocked" && state?.phase !== "closed" && !coverage.ok) {
    throw workflowError(
      "TOOLSET_SESSION_CLOSE_BEFORE_COVERAGE_FORBIDDEN",
      `Toolset session must remain open until all six proof stages were run and documented. Missing: ${coverage.missing.join(", ")}.`,
    );
  }
  const close = runJson(closePath, [], 60_000, true);
  const processes = readToolsetProcesses();
  if (processes.length !== 0) {
    throw workflowError("TOOLSET_CLOSE_INCOMPLETE", `Toolset still has ${processes.length} process(es).`);
  }
  releaseLegacyGuard();
  if (state) {
    state = closeToolsetSession(state);
    state.closeResult = {
      completedAt: new Date().toISOString(),
      close,
      userAuthorizedClose: true,
      closeAuthorization: config.closeAuthorization,
    };
    writeState(state);
  }
  return { ok: true, command: "close", statePath: config.statePath, state, close, processes, coverage, completion };
}

function assertExplicitUserCloseAuthorization() {
  if (!config.userAuthorizedClose || config.closeAuthorization.length === 0) {
    throw workflowError(
      "TOOLSET_CLOSE_REQUIRES_EXPLICIT_USER_AUTHORIZATION",
      "Refusing to close Aurora. Use --userAuthorizedClose true and --closeAuthorization <verbatim user request> only after the user explicitly asks to close the current session.",
    );
  }
}

function preserveLiveSessionAfterFailure(reason) {
  // A live Toolset process belongs to the user-controlled session. Block the lane,
  // retain its PID/window for recovery, and never turn a failed open into an implicit close.
  return { preserved: true, reason };
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

function openerArgs({ preflightOnly = false, skipAreaOpen = false, reuseExistingSession = false }) {
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
  if (reuseExistingSession) args.push("--allowExistingToolset", "true", "--allowReuseOpenSession", "true");
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

function assertProfileOptionContract() {
  if (!profile.immutable) return;
  const forbiddenOverrides = [
    "modulePath",
    "expectedSha256",
    "queue",
    "expectedModuleParts",
    "expectedModule",
    "area",
    "areaName",
    "statePath",
    "capture",
    "continueAreaNavigation",
    "reuseExistingSession",
    "limit",
    "offset",
    "wheelSteps",
  ];
  const attempted = forbiddenOverrides.filter((name) => Object.hasOwn(options, name));
  if (attempted.length > 0) {
    throw workflowError(
      "IMMUTABLE_TOOLSET_PROFILE_OVERRIDE",
      `Profile ${config.profileName} rejects caller overrides: ${attempted.join(", ")}.`,
    );
  }
  if (profile.requiresCallerOutDir && (!options.outDir || options.outDir === true || String(options.outDir).trim() === "")) {
    throw workflowError(
      "M0_ARTIFACT_DESTINATION_REQUIRED",
      `Profile ${config.profileName} requires --outDir <caller-owned-artifact-directory>.`,
    );
  }
}

function assertM0QueueContract(queue) {
  const actual = queue.map((entry) => ({ resref: entry.resref, name: entry.name }));
  const expected = [{ resref: "m2a_m0proof_area", name: "Meshy2Aurora M0 static runtime proof area" }];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw workflowError("M0_TOOLSET_QUEUE_CONTRACT_MISMATCH", JSON.stringify({ expected, actual }));
  }
}

function requireM0QueueManifest(queueManifestPath) {
  if (!existsSync(queueManifestPath)) throw workflowError("M0_RECONCILIATION_QUEUE_MANIFEST_MISSING", queueManifestPath);
  const manifest = readJson(queueManifestPath);
  if (manifest.version !== "toolset-area-oracle-queue/v1" || manifest.status !== "completed" || manifest.expectedModule !== config.expectedModule) {
    throw workflowError("M0_RECONCILIATION_QUEUE_MANIFEST_INVALID", JSON.stringify({ queueManifestPath, manifest }));
  }
  const opened = manifest.items?.filter((item) => item.status === "opened" && item.area?.resref === config.expectedArea && item.area?.name === config.expectedAreaName) ?? [];
  if (opened.length !== 1) {
    throw workflowError("M0_RECONCILIATION_QUEUE_AREA_INVALID", JSON.stringify({ queueManifestPath, expectedArea: config.expectedArea, expectedAreaName: config.expectedAreaName }));
  }
  return manifest;
}

function assertM0ReconciliationState(state) {
  if (resolve(state.modulePath) !== config.modulePath || String(state.moduleSha256 ?? "").toUpperCase() !== config.expectedSha256) {
    throw workflowError("M0_RECONCILIATION_STATE_MODULE_MISMATCH", JSON.stringify({ stateModule: state.modulePath, expectedModule: config.modulePath }));
  }
  if (state.currentArea !== null || state.laneFailures?.length !== 0) {
    throw workflowError("M0_RECONCILIATION_STATE_NOT_PRISTINE", JSON.stringify({ currentArea: state.currentArea, laneFailures: state.laneFailures ?? [] }));
  }
}

function buildM0ToolsetPacket({ queueManifestPath, viewportPath, viewportResultPath }) {
  return {
    version: "aurora-m0-toolset-packet/v1",
    profileId: config.profileName,
    moduleSha256: config.expectedSha256.toLowerCase(),
    area: config.expectedArea,
    fixtures: [
      { id: "tortoise", resref: "m2a_m0_tort", appearanceRow: 15108, position: [12, 10] },
      { id: "meshy-m0", resref: "m2a_m0p01", appearanceRow: 15109, position: [16, 10] },
    ],
    artifacts: [
      { kind: "toolset-queue-manifest", path: queueManifestPath, sha256: sha256(queueManifestPath).toLowerCase() },
      { kind: "toolset-viewport", path: viewportPath, sha256: sha256(viewportPath).toLowerCase() },
      { kind: "toolset-viewport-result", path: viewportResultPath, sha256: sha256(viewportResultPath).toLowerCase() },
    ],
  };
}

function serializeError(error) {
  return {
    code: error?.code ?? null,
    message: error instanceof Error ? error.message : String(error),
  };
}

function isTrue(value) {
  return value === true || value === "true" || value === "1";
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

function resolveLatestSourceSelectionProof(state) {
  const area = state.currentArea?.resref;
  const proofs = Array.isArray(state.sourceSelectionProofs) ? state.sourceSelectionProofs : [];
  const latest = [...proofs].reverse().find((entry) => entry.resref === area && entry.status === "verified" && entry.proofPath);
  return latest ? requiredExistingPath(latest.proofPath, "stored source selection proof") : null;
}

function resolveLatestCameraCalibration(state) {
  const area = state.currentArea?.resref;
  const calibrations = Array.isArray(state.cameraCalibrations) ? state.cameraCalibrations : [];
  const latest = [...calibrations].reverse().find((entry) => entry.resref === area && entry.status === "estimated" && entry.calibrationPath);
  return latest ? requiredExistingPath(latest.calibrationPath, "stored camera calibration") : null;
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

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
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
