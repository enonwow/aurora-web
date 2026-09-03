import { TOOLSET_LOAD_OWNERS } from "./toolset-startup-load-plan.mjs";

export const TOOLSET_SESSION_VERSION = "aurora-toolset-session/v1";

const ACTIVE_PHASES = new Set([
  "prepared",
  "process_started",
  "module_loading",
  "module_ready",
  "area_ready",
  "capturing",
]);

export function createToolsetSession({
  modulePath,
  moduleSha256,
  queuePath,
  areaCount,
  now = new Date(),
}) {
  if (!modulePath || !queuePath || !Number.isInteger(areaCount) || areaCount < 1) {
    throw sessionError(
      "INVALID_SESSION_INPUT",
      "modulePath, queuePath, and a positive integer areaCount are required.",
    );
  }
  const at = now.toISOString();
  return {
    version: TOOLSET_SESSION_VERSION,
    phase: "prepared",
    createdAt: at,
    updatedAt: at,
    modulePath,
    moduleSha256: moduleSha256 ?? null,
    queuePath,
    areaCount,
    process: null,
    moduleLoad: {
      owner: null,
      claimedAt: null,
      explicitOpenCount: 0,
      progressKind: null,
      readyAt: null,
      windowTitle: null,
      startupSignals: [],
    },
    currentArea: null,
    moduleOpenProofs: [],
    capturedAreas: [],
    eyeArtifacts: [],
    observations: [],
    tilePropertyReadbacks: [],
    sourceSelectionProofs: [],
    cameraCalibrations: [],
    nativeCameraResponseModels: [],
    viewportTargetEvaluations: [],
    proofPackets: [],
    laneFailures: [],
    blocker: null,
    events: [{ at, type: "session_prepared" }],
  };
}

export function recordStartupLoadSignal(state, { kind, details = null, owner, now = new Date() }) {
  requireActive(state);
  let next = copy(state);
  if (!next.moduleLoad.owner) {
    next = claimModuleLoad(next, { owner, now });
  }
  next.moduleLoad.startupSignals.push({ kind, details, observedAt: now.toISOString() });
  return append(next, "startup_module_load_signal_observed", { kind, owner: next.moduleLoad.owner }, now);
}

export function recordToolsetProcessStart(state, { pid, processStartedAt, now = new Date() }) {
  requireActive(state);
  if (state.process) {
    throw sessionError("SECOND_TOOLSET_START_FORBIDDEN", "The session already owns a Toolset process.");
  }
  const next = copy(state);
  next.phase = "process_started";
  next.process = { pid: pid ?? null, startedAt: processStartedAt ?? now.toISOString() };
  return append(next, "toolset_process_started", { pid: next.process.pid }, now);
}

export function claimModuleLoad(state, { owner, now = new Date() }) {
  requireActive(state);
  if (!Object.values(TOOLSET_LOAD_OWNERS).includes(owner)) {
    throw sessionError("INVALID_MODULE_LOAD_OWNER", `Unsupported module load owner: ${owner}`);
  }
  if (state.moduleLoad.owner) {
    throw sessionError(
      "SECOND_MODULE_LOAD_FORBIDDEN",
      `Module loading is already owned by ${state.moduleLoad.owner}; ${owner} cannot claim it.`,
    );
  }
  const next = copy(state);
  next.phase = "module_loading";
  next.moduleLoad.owner = owner;
  next.moduleLoad.claimedAt = now.toISOString();
  next.moduleLoad.explicitOpenCount = owner === TOOLSET_LOAD_OWNERS.EXPLICIT_OPEN ? 1 : 0;
  return append(next, "module_load_claimed", { owner }, now);
}

export function canSubmitExplicitModuleOpen(state) {
  return ACTIVE_PHASES.has(state.phase) && state.moduleLoad.owner === null;
}

export function recordModuleProgress(state, { kind, now = new Date() }) {
  requireActive(state);
  if (!state.moduleLoad.owner) {
    throw sessionError(
      "MODULE_PROGRESS_WITHOUT_OWNER",
      "Progress cannot be accepted until MRU, recovery, explicit open, or an external load owns the module load.",
    );
  }
  const next = copy(state);
  next.moduleLoad.progressKind = kind ?? "module_loading";
  return append(next, "module_progress_observed", { kind: next.moduleLoad.progressKind }, now);
}

export function markModuleReady(state, { windowTitle, now = new Date() }) {
  requireActive(state);
  if (!state.moduleLoad.owner) {
    throw sessionError("MODULE_READY_WITHOUT_LOAD", "A module cannot become ready without one load owner.");
  }
  const next = copy(state);
  next.phase = "module_ready";
  next.moduleLoad.readyAt = now.toISOString();
  next.moduleLoad.windowTitle = windowTitle ?? null;
  return append(next, "module_ready", { windowTitle: next.moduleLoad.windowTitle }, now);
}

export function markAreaReady(state, { resref, name, now = new Date() }) {
  requireActive(state);
  if (!state.moduleLoad.readyAt) {
    throw sessionError("AREA_BEFORE_MODULE_READY", "An Area cannot open before the module is ready.");
  }
  if (!resref) throw sessionError("AREA_RESREF_REQUIRED", "Area resref is required.");
  if (state.currentArea?.resref === resref) {
    throw sessionError("DUPLICATE_AREA_OPEN_FORBIDDEN", `Area ${resref} is already open.`);
  }
  const next = copy(state);
  next.phase = "area_ready";
  next.currentArea = { resref, name: name ?? resref, readyAt: now.toISOString() };
  return append(next, "area_ready", { resref, name: next.currentArea.name }, now);
}

export function recordModuleOpenProof(state, { proofPath, monitorEvidence, now = new Date() }) {
  requireActive(state);
  if (!state.moduleLoad.readyAt) {
    throw sessionError("MODULE_OPEN_PROOF_BEFORE_READY", "A module-open proof requires a ready module.");
  }
  if (!proofPath) throw sessionError("MODULE_OPEN_PROOF_PATH_REQUIRED", "A module-open proof PNG path is required.");
  const next = copy(state);
  next.moduleOpenProofs = Array.isArray(next.moduleOpenProofs) ? next.moduleOpenProofs : [];
  next.moduleOpenProofs.push({ proofPath, monitorEvidence: monitorEvidence ?? null, capturedAt: now.toISOString() });
  return append(next, "module_open_proof_captured", { proofPath }, now);
}

export function recordAreaCapture(state, { resref, pngPath, now = new Date() }) {
  requireActive(state);
  if (!state.currentArea || state.currentArea.resref !== resref) {
    throw sessionError("CAPTURE_AREA_MISMATCH", `Capture ${resref} does not match the current Area.`);
  }
  if (!pngPath) throw sessionError("CAPTURE_PATH_REQUIRED", "Capture PNG path is required.");
  const next = copy(state);
  if (next.capturedAreas.some((entry) => entry.resref === resref)) {
    throw sessionError("DUPLICATE_AREA_CAPTURE_FORBIDDEN", `Area ${resref} already has a capture.`);
  }
  next.phase = "area_ready";
  next.capturedAreas.push({ resref, pngPath, capturedAt: now.toISOString() });
  return append(next, "area_captured", { resref, pngPath }, now);
}

export function recordAuroraEyeArtifact(state, { resref, stage, pngPath, resultPath, status, now = new Date() }) {
  requireActive(state);
  if (!state.currentArea || state.currentArea.resref !== resref) {
    throw sessionError("EYE_ARTIFACT_AREA_MISMATCH", `Aurora Eye artifact ${resref} does not match the current Area.`);
  }
  if (!["before-a", "before-b", "after"].includes(stage)) {
    throw sessionError("EYE_ARTIFACT_STAGE_INVALID", "Aurora Eye stage must be before-a, before-b, or after.");
  }
  if (!pngPath || !resultPath) throw sessionError("EYE_ARTIFACT_PATH_REQUIRED", "PNG and result JSON paths are required.");
  const next = copy(state);
  next.eyeArtifacts = Array.isArray(next.eyeArtifacts) ? next.eyeArtifacts : [];
  if (next.eyeArtifacts.some((entry) => entry.resref === resref && entry.stage === stage)) {
    throw sessionError("DUPLICATE_EYE_ARTIFACT_FORBIDDEN", `Aurora Eye ${stage} is already recorded for ${resref}.`);
  }
  next.eyeArtifacts.push({ resref, stage, pngPath, resultPath, status: status ?? null, capturedAt: now.toISOString() });
  return append(next, "aurora_eye_artifact_recorded", { resref, stage, status: status ?? null }, now);
}

export function recordSceneObservation(state, { resref, observationPath, status, now = new Date() }) {
  requireActive(state);
  if (!state.currentArea || state.currentArea.resref !== resref) {
    throw sessionError("OBSERVATION_AREA_MISMATCH", `Observation ${resref} does not match the current Area.`);
  }
  if (!observationPath) throw sessionError("OBSERVATION_PATH_REQUIRED", "Observation path is required.");
  const next = copy(state);
  next.observations = Array.isArray(next.observations) ? next.observations : [];
  next.observations.push({ resref, observationPath, status: status ?? null, observedAt: now.toISOString() });
  return append(next, "scene_observed", { resref, observationPath, status: status ?? null }, now);
}

export function recordTilePropertyReadback(state, { resref, readbackPath, status, blockerCode = null, now = new Date() }) {
  requireActive(state);
  if (!state.currentArea || state.currentArea.resref !== resref) {
    throw sessionError("TILE_READBACK_AREA_MISMATCH", `Tile readback ${resref} does not match the current Area.`);
  }
  if (!readbackPath) throw sessionError("TILE_READBACK_PATH_REQUIRED", "Tile readback path is required.");
  const next = copy(state);
  next.tilePropertyReadbacks = Array.isArray(next.tilePropertyReadbacks) ? next.tilePropertyReadbacks : [];
  next.tilePropertyReadbacks.push({ resref, readbackPath, status: status ?? null, blockerCode, readAt: now.toISOString() });
  return append(next, "tile_properties_read", { resref, readbackPath, status: status ?? null, blockerCode }, now);
}

export function recordSourceSelectionProof(state, { resref, proofPath, status, now = new Date() }) {
  requireActive(state);
  if (!state.currentArea || state.currentArea.resref !== resref) {
    throw sessionError("SOURCE_SELECTION_PROOF_AREA_MISMATCH", `Source selection proof ${resref} does not match the current Area.`);
  }
  if (!proofPath) throw sessionError("SOURCE_SELECTION_PROOF_PATH_REQUIRED", "Source selection proof path is required.");
  const next = copy(state);
  next.sourceSelectionProofs = Array.isArray(next.sourceSelectionProofs) ? next.sourceSelectionProofs : [];
  next.sourceSelectionProofs.push({ resref, proofPath, status: status ?? null, recordedAt: now.toISOString() });
  return append(next, "source_selection_proof_recorded", { resref, proofPath, status: status ?? null }, now);
}

export function recordCameraCalibration(state, { resref, calibrationPath, status, now = new Date() }) {
  requireActive(state);
  if (!state.currentArea || state.currentArea.resref !== resref) throw sessionError("CAMERA_CALIBRATION_AREA_MISMATCH", `Camera calibration ${resref} does not match the current Area.`);
  if (!calibrationPath) throw sessionError("CAMERA_CALIBRATION_PATH_REQUIRED", "Camera calibration path is required.");
  const next = copy(state);
  next.cameraCalibrations = Array.isArray(next.cameraCalibrations) ? next.cameraCalibrations : [];
  next.cameraCalibrations.push({ resref, calibrationPath, status: status ?? null, recordedAt: now.toISOString() });
  return append(next, "camera_calibration_recorded", { resref, calibrationPath, status: status ?? null }, now);
}

export function recordNativeCameraResponseModel(state, { resref, modelPath, command, controlledAxes, sampleCount, now = new Date() }) {
  requireActive(state);
  if (!state.currentArea || state.currentArea.resref !== resref) throw sessionError("NATIVE_CAMERA_MODEL_AREA_MISMATCH", `Native camera response model ${resref} does not match the current Area.`);
  if (!modelPath || !command || !Array.isArray(controlledAxes) || controlledAxes.length === 0 || !Number.isInteger(sampleCount) || sampleCount < 3) {
    throw sessionError("NATIVE_CAMERA_MODEL_INVALID", "A native camera model needs path, command, one controlled axis, and at least three samples.");
  }
  const next = copy(state);
  next.nativeCameraResponseModels = Array.isArray(next.nativeCameraResponseModels) ? next.nativeCameraResponseModels : [];
  if (next.nativeCameraResponseModels.some((entry) => entry.resref === resref && entry.command === command)) {
    throw sessionError("DUPLICATE_NATIVE_CAMERA_MODEL_FORBIDDEN", `Native camera response model ${command} is already recorded.`);
  }
  next.nativeCameraResponseModels.push({ resref, modelPath, command, controlledAxes, sampleCount, status: "verified-native-readback", recordedAt: now.toISOString() });
  return append(next, "native_camera_response_model_recorded", { resref, command, controlledAxes, sampleCount }, now);
}

export function recordViewportTargetEvaluation(state, { resref, reportPath, status, blockerCodes = [], now = new Date() }) {
  requireActive(state);
  if (!state.currentArea || state.currentArea.resref !== resref) {
    throw sessionError("VIEWPORT_TARGET_AREA_MISMATCH", `Viewport target ${resref} does not match the current Area.`);
  }
  if (!reportPath) throw sessionError("VIEWPORT_TARGET_REPORT_PATH_REQUIRED", "Viewport target report path is required.");
  const next = copy(state);
  next.viewportTargetEvaluations = Array.isArray(next.viewportTargetEvaluations) ? next.viewportTargetEvaluations : [];
  next.viewportTargetEvaluations.push({
    resref,
    reportPath,
    status: status ?? null,
    blockerCodes: Array.isArray(blockerCodes) ? blockerCodes : [],
    evaluatedAt: now.toISOString(),
  });
  return append(next, "viewport_target_evaluated", { resref, reportPath, status: status ?? null, blockerCodes }, now);
}

export function recordProofPacket(state, { resref, packetPath, status, blockerCodes = [], now = new Date() }) {
  requireActive(state);
  if (!state.currentArea || state.currentArea.resref !== resref) {
    throw sessionError("PROOF_PACKET_AREA_MISMATCH", `Proof packet ${resref} does not match the current Area.`);
  }
  if (!packetPath) throw sessionError("PROOF_PACKET_PATH_REQUIRED", "Proof packet path is required.");
  const next = copy(state);
  next.proofPackets = Array.isArray(next.proofPackets) ? next.proofPackets : [];
  next.proofPackets.push({ resref, packetPath, status: status ?? null, blockerCodes: Array.isArray(blockerCodes) ? blockerCodes : [], assembledAt: now.toISOString() });
  return append(next, "proof_packet_assembled", { resref, packetPath, status: status ?? null, blockerCodes }, now);
}

// A failed observation/capture/calibration lane is evidence about the current
// live session. It is not itself permission to close or abandon that session.
// Fatal process/modal conditions still use blockToolsetSession.
export function recordLaneFailure(state, { lane, code, details = null, now = new Date() }) {
  requireActive(state);
  if (!lane || !code) throw sessionError("LANE_FAILURE_FIELDS_REQUIRED", "lane and code are required.");
  const next = copy(state);
  next.laneFailures = Array.isArray(next.laneFailures) ? next.laneFailures : [];
  next.laneFailures.push({
    lane,
    code,
    details,
    currentArea: next.currentArea?.resref ?? null,
    recordedAt: now.toISOString(),
  });
  return append(next, "lane_failed", { lane, code }, now);
}

export function blockToolsetSession(state, { code, details = null, now = new Date() }) {
  const next = copy(state);
  next.phase = "blocked";
  next.blocker = { code, details, at: now.toISOString() };
  return append(next, "session_blocked", { code }, now);
}

export function closeToolsetSession(state, { now = new Date() } = {}) {
  const next = copy(state);
  next.phase = "closed";
  return append(next, "session_closed", {}, now);
}

export function inspectToolsetSessionLiveness(state, processes = []) {
  const current = Array.isArray(processes) ? processes : [];
  if (!state) return { status: "no_state", blockerCode: null };
  if (!ACTIVE_PHASES.has(state.phase)) return { status: "inactive", blockerCode: null };
  if (current.length === 0) {
    return {
      status: "orphaned",
      blockerCode: "toolset_session_orphaned_no_process",
      reason: "Session is active but no nwtoolset process exists. Run reconcile before another preflight.",
    };
  }
  if (current.length !== 1) {
    return {
      status: "invalid",
      blockerCode: "toolset_session_process_count_invalid",
      reason: `Active session requires one nwtoolset process, found ${current.length}.`,
    };
  }
  const expectedPid = Number(state.process?.pid ?? NaN);
  const actualPid = Number(current[0]?.Id ?? current[0]?.id ?? NaN);
  if (Number.isFinite(expectedPid) && Number.isFinite(actualPid) && expectedPid !== actualPid) {
    return {
      status: "invalid",
      blockerCode: "toolset_session_process_pid_mismatch",
      reason: `Active session owns PID ${expectedPid}, observed PID ${actualPid}.`,
    };
  }
  return { status: "live", blockerCode: null };
}

// Completion is stricter than coverage. Coverage proves every required lane
// was actually run and documented, so the Toolset may be closed after an
// honest negative result. Completion additionally requires every lane to pass.
export function evaluateToolsetSessionCoverage(state) {
  const hasEntry = (entries) => Array.isArray(entries) && entries.length > 0;
  const hasLaneFailure = (lane) => Array.isArray(state?.laneFailures) && state.laneFailures.some((entry) => entry?.lane === lane && entry?.details?.evidencePath);
  const nativeAxes = new Set(
    (Array.isArray(state?.nativeCameraResponseModels) ? state.nativeCameraResponseModels : [])
      .filter((entry) => Number(entry?.sampleCount) >= 3)
      .flatMap((entry) => Array.isArray(entry.controlledAxes) ? entry.controlledAxes : []),
  );
  const requirements = [
    { id: "one_toolset_process", ok: Boolean(state?.process?.pid) },
    { id: "module_and_area_ready", ok: Boolean(state?.moduleLoad?.readyAt && state?.currentArea?.resref) },
    { id: "module_open_png", ok: hasEntry(state?.moduleOpenProofs) || hasLaneFailure("module_open") },
    { id: "aurora_eye_artifacts", ok: ["before-a", "before-b", "after"].every((stage) => state?.eyeArtifacts?.some((entry) => entry?.stage === stage)) || hasLaneFailure("aurora_eye") },
    {
      id: "native_readback_and_camera_response",
      ok: (hasEntry(state?.sourceSelectionProofs) && ["yawDegrees", "pitchDegrees", "zoomLogRatio"].every((axis) => nativeAxes.has(axis))) || hasLaneFailure("native_camera_response"),
    },
    { id: "target_45_degree_and_proof_packet", ok: hasEntry(state?.viewportTargetEvaluations) && hasEntry(state?.proofPackets) || hasLaneFailure("viewport_target") },
  ];
  const missing = requirements.filter((requirement) => !requirement.ok).map((requirement) => requirement.id);
  return { ok: missing.length === 0, requirements, missing };
}

export function evaluateToolsetSessionCompletion(state) {
  const isVerified = (entries) =>
    Array.isArray(entries) && entries.some((entry) => entry?.status === "verified");
  const hasVerifiedObservation = Array.isArray(state?.observations)
    && state.observations.some((entry) => ["verified", "captured-and-contextualized"].includes(entry?.status));
  const nativeAxes = new Set(
    (Array.isArray(state?.nativeCameraResponseModels) ? state.nativeCameraResponseModels : [])
      .filter((entry) => entry?.status === "verified-native-readback" && Number(entry?.sampleCount) >= 3)
      .flatMap((entry) => Array.isArray(entry.controlledAxes) ? entry.controlledAxes : []),
  );
  const hasNativeCameraReadback = ["yawDegrees", "pitchDegrees", "zoomLogRatio"].every((axis) => nativeAxes.has(axis));
  const canonicalProcessLifecycle = Boolean(state?.process?.pid)
    && !state.events?.some((event) => event.type === "second_toolset_process_started")
    && (ACTIVE_PHASES.has(state?.phase) || (state?.phase === "closed" && state?.closeResult?.close?.ok === true));
  const requirements = [
    {
      id: "one_toolset_process",
      ok: canonicalProcessLifecycle,
    },
    { id: "module_and_area_ready", ok: Boolean(state?.moduleLoad?.readyAt && state?.currentArea?.resref) },
    { id: "module_open_png", ok: Array.isArray(state?.moduleOpenProofs) && state.moduleOpenProofs.length > 0 },
    {
      id: "aurora_eye_artifacts",
      ok: ["before-a", "before-b", "after"].every((stage) =>
        Array.isArray(state?.eyeArtifacts) && state.eyeArtifacts.some((entry) => entry?.stage === stage && entry?.status === "verified"),
      ) && hasVerifiedObservation,
    },
    {
      id: "native_readback_and_camera_response",
      ok: isVerified(state?.sourceSelectionProofs) && hasNativeCameraReadback,
    },
    {
      id: "target_45_degree_and_proof_packet",
      ok: isVerified(state?.viewportTargetEvaluations) && isVerified(state?.proofPackets),
    },
  ];
  const missing = requirements.filter((requirement) => !requirement.ok).map((requirement) => requirement.id);
  return { ok: missing.length === 0, requirements, missing };
}

function requireActive(state) {
  if (!state || !ACTIVE_PHASES.has(state.phase)) {
    throw sessionError("SESSION_NOT_ACTIVE", `Session phase ${state?.phase ?? "missing"} is not active.`);
  }
}

function append(state, type, details, now) {
  const at = now.toISOString();
  state.updatedAt = at;
  state.events.push({ at, type, ...details });
  return state;
}

function copy(state) {
  return structuredClone(state);
}

function sessionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
