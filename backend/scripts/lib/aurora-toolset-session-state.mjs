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
    capturedAreas: [],
    observations: [],
    tilePropertyReadbacks: [],
    viewportTargetEvaluations: [],
    proofPackets: [],
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
