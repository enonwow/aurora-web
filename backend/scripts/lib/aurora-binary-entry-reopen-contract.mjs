import { isAbsolute, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { classifyCanonicalViewportCandidates, parseModuleNameFromTitle } from "./aurora-model-proof-120s-prep-contract.mjs";

const REQUEST_VERSION = "aurora-entry-reopen-request/v1";
const STATE_VERSION = "aurora-model-proof-120s-prep-state/v1";
const REQUEST_LIFETIME = 30n * 60n * 10_000_000n;
const STATE_FRESHNESS = 30n * 10_000_000n;
const RESREF = /^[a-z0-9_]{1,16}$/u;

// Pure admission only. The caller must read/hash the immutable source, profiles
// and evidence files, and obtain states from the existing native inspector.
// No value supplied here authenticates a process or claims entry accessibility.
export function validateReopenPreparation({ source, request, plan, result, before, ready, fresh, now } = {}) {
  check(source?.version === "aurora-binary-entry-surface-source/v2"
    && source.status === "native_entry_observation_missing", "SOURCE_INVALID");
  validateTarget(source.target);
  check(positiveInteger(source.owner?.pid) && positiveInteger(source.owner?.frameHwnd), "HISTORICAL_OWNER_INVALID");
  ticks(source.owner.startedAt);
  check(request?.version === REQUEST_VERSION
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(request.requestId), "REQUEST_INVALID");
  check(isDeepStrictEqual(request.source, source), "SOURCE_MISMATCH");
  validateIdentity(request.prepProfile);
  validateIdentity(request.binaryProfile);
  absolutePath(request.prepOutDir);
  const created = ticks(request.createdAt), expires = ticks(request.expiresAt), current = ticks(now);
  check(expires - created === REQUEST_LIFETIME && created <= current && current <= expires, "REQUEST_WINDOW_INVALID");

  check(plan?.version === "aurora-model-proof-120s-prep-plan/v1", "PLAN_INVALID");
  check(result?.version === "aurora-model-proof-120s-prep-result/v1"
    && result.command === "prepare" && result.ok === true && result.status === "proof_ready", "PREPARATION_INCOMPLETE");
  validateProfileBinding(plan.profile, request.prepProfile);
  validateProfileBinding(result.profile, request.prepProfile);
  check(typeof plan.profile.id === "string" && plan.profile.id.length > 0
    && plan.profile.id === result.profile.id, "PREP_PROFILE_ID_MISMATCH");
  check(samePath(result.prepOutDir, request.prepOutDir), "PREP_DIRECTORY_MISMATCH");
  validateSteps(result.steps, request.prepOutDir);
  validatePrepTarget(plan.target, source.target);
  validatePrepTarget(result.target, source.target);
  check(plan.decision?.route === "cold" && plan.decision.processId === null
    && plan.decision.currentModule === null
    && isDeepStrictEqual(plan.decision, result.initialDecision), "INITIAL_ROUTE_NOT_COLD");
  check(result.finalDecision?.route === "adopt" && positiveInteger(result.processId)
    && result.finalDecision.processId === result.processId
    && result.finalDecision.currentModule?.toLowerCase() === `${source.target.module.resref}.mod`
    && result.finalDecision.area?.toLowerCase() === source.target.area, "FINAL_ROUTE_INVALID");

  const beforeTime = validateStateEnvelope(before);
  check(before.toolsets.length === 0, "INITIAL_TOOLSET_PRESENT");
  const readyTime = validateStateEnvelope(ready), freshTime = validateStateEnvelope(fresh);
  const planTime = ticks(plan.createdAtUtc), resultTime = ticks(result.createdAtUtc);
  check(created <= beforeTime && beforeTime <= planTime && planTime <= readyTime
    && readyTime <= resultTime && resultTime <= freshTime && freshTime <= current, "PREPARATION_TIME_ORDER_INVALID");
  check(current - freshTime < STATE_FRESHNESS, "STATE_STALE");

  const owner = readReadyOwner(ready, source.target), currentOwner = readReadyOwner(fresh, source.target);
  check(sameOwner(owner, currentOwner) && owner.pid === result.processId, "OWNER_MISMATCH");
  const start = ticks(owner.startedAt);
  check(created <= start && planTime <= start && start <= readyTime, "NEW_OWNER_START_INVALID");
  // The old manifest normalizes its StartTime to milliseconds. Only exclusion
  // of that historical tuple uses ms; all new identity checks retain 100 ns.
  check(owner.pid !== source.owner.pid || Date.parse(owner.startedAt) !== Date.parse(source.owner.startedAt), "HISTORICAL_OWNER_REUSED");
  return { owner: structuredClone(owner), target: structuredClone(source.target) };
}

export function validateReopenArmState({ owner, target, state, notBefore, now } = {}) {
  validateTarget(target);
  validateOwner(owner);
  const captured = validateStateEnvelope(state), earliest = ticks(notBefore), current = ticks(now);
  check(earliest <= captured && captured <= current && current - captured < STATE_FRESHNESS, "ARM_STATE_NOT_FRESH");
  check(ticks(owner.startedAt) <= captured && sameOwner(owner, readReadyOwner(state, target)), "ARM_OWNER_MISMATCH");
  return { owner: structuredClone(owner), target: structuredClone(target) };
}

// Historical inspector identity only; callers must separately enforce current
// freshness and the original request deadline before any new admission.
export function readReopenStateOwner({ state, target } = {}) {
  validateTarget(target);
  validateStateEnvelope(state);
  return structuredClone(readReadyOwner(state, target));
}

// The hash-bound public cold-open result owns the handoff. A later inspector
// finding the same target in another process must never replace that owner.
export function validateReopenColdOpenResult({ result, request, owner, completedAt, readyAt } = {}) {
  validateOwner(owner);
  check(result?.ok === true && result.command === "open"
    && result.status === "binary_native_geometry_module_ready"
    && samePath(result.manifestPath, resolve(request.prepOutDir, "cold-open", "binary-native-geometry-manifest.json")),
  "COLD_OPEN_RESULT_INVALID");
  const process = result.process;
  // Windows PowerShell's legacy StartTime JSON has millisecond precision.
  // Require the additive full UTC field measured by the same producer call.
  check(typeof process?.StartTimeUtc === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$/u.test(process.StartTimeUtc), "COLD_OPEN_FULL_START_REQUIRED");
  check(process.Id === owner.pid && process.Responding === true
    && ticks(process.StartTimeUtc) === ticks(owner.startedAt), "COLD_OPEN_OWNER_MISMATCH");
  check(ticks(process.StartTimeUtc) <= ticks(completedAt) && ticks(completedAt) <= ticks(readyAt), "COLD_OPEN_TIME_ORDER_INVALID");
  return { pid: process.Id, startedAt: process.StartTimeUtc };
}

function validateStateEnvelope(state) {
  check(state?.version === STATE_VERSION && Array.isArray(state.nwmain)
    && Array.isArray(state.toolsets), "STATE_INVALID");
  check(state.nwmain.length === 0, "NWN_PROCESS_PRESENT");
  return ticks(state.capturedAtUtc);
}

function readReadyOwner(state, target) {
  check(state.toolsets.length === 1, "READY_TOOLSET_COUNT_INVALID");
  const session = state.toolsets[0], frame = session?.frame;
  check(positiveInteger(session?.pid) && session.responding === true && session.frameCount === 1
    && positiveInteger(frame?.hwnd) && frame.className === "TfrmFrame", "READY_FRAME_INVALID");
  check(Array.isArray(session.modals) && session.modals.length === 0, "READY_MODAL_PRESENT");
  check(frame.monitor?.primary === false
    && frame.monitor.deviceName === "\\\\.\\DISPLAY1", "READY_MONITOR_INVALID");
  const title = typeof frame.title === "string" ? frame.title.trim() : "";
  check(!title.includes("*") && parseModuleNameFromTitle(title)?.toLowerCase() === `${target.module.resref}.mod`, "READY_MODULE_MISMATCH");
  check(Array.isArray(session.areaViewers), "READY_VIEWERS_INVALID");
  const viewers = session.areaViewers.filter((viewer) => normalizeArea(viewer?.resref ?? viewer?.title) === target.area);
  check(viewers.length === 1, "READY_AREA_COUNT_INVALID");
  const viewer = viewers[0];
  check(positiveInteger(viewer.hwnd) && normalizeArea(viewer.title) === target.area, "READY_AREA_INVALID");
  let classified;
  try { classified = classifyCanonicalViewportCandidates(viewer.viewports); }
  catch { fail("READY_VIEWPORT_INVALID"); }
  check(classified.canonicalCount === 1 && viewer.canonicalViewportCount === 1
    && viewer.canonicalViewportHwnd === classified.canonical[0].hwnd, "READY_VIEWPORT_COUNT_INVALID");
  for (const viewport of viewer.viewports) {
    check(positiveInteger(viewport.hwnd) && ["left", "top", "width", "height"].every((key) => Number.isFinite(viewport.bounds?.[key]))
      && viewport.captureEligible === (viewport.bounds.width >= 400 && viewport.bounds.height >= 300), "READY_VIEWPORT_INVALID");
  }
  const owner = { pid: session.pid, startedAt: session.startedAtUtc, frameHwnd: frame.hwnd,
    viewerHwnd: viewer.hwnd, viewportHwnd: classified.canonical[0].hwnd };
  validateOwner(owner);
  return owner;
}

function validateOwner(owner) {
  check(owner && ["pid", "frameHwnd", "viewerHwnd", "viewportHwnd"].every((field) => positiveInteger(owner[field])), "OWNER_INVALID");
  ticks(owner.startedAt);
}

function sameOwner(left, right) {
  return ["pid", "frameHwnd", "viewerHwnd", "viewportHwnd"].every((field) => left[field] === right[field])
    && ticks(left.startedAt) === ticks(right.startedAt);
}

function validateTarget(target) {
  validateIdentity(target?.module);
  check(RESREF.test(target.module.resref) && RESREF.test(target.area)
    && Array.isArray(target.orderedHakList) && target.orderedHakList.length > 0, "TARGET_INVALID");
  for (const hak of target.orderedHakList) { validateIdentity(hak); check(RESREF.test(hak.resref), "TARGET_HAK_INVALID"); }
  check(finiteVector(target.entry?.position, 3) && finiteVector(target.entry?.direction, 2)
    && /^[a-f0-9]{64}$/u.test(target.git?.sha256), "TARGET_ENTRY_INVALID");
}

function validatePrepTarget(actual, expected) {
  check(actual?.moduleResref === expected.module.resref && actual.moduleName === `${expected.module.resref}.mod`
    && samePath(actual.installedModulePath, expected.module.path) && actual.areaResref === expected.area, "PREP_TARGET_MISMATCH");
}

function validateProfileBinding(actual, expected) {
  check(samePath(actual?.path, expected.path) && actual.sha256 === expected.sha256
    && (actual.bytes === undefined || actual.bytes === expected.bytes), "PREP_PROFILE_MISMATCH");
}

function validateSteps(steps, prepOutDir) {
  check(Array.isArray(steps) && (steps.length === 2 || steps.length === 3), "STEPS_INCOMPLETE");
  const names = ["cold-preflight", "cold-open", "load-area"];
  for (let index = 0; index < steps.length; index++) {
    check(steps[index]?.name === names[index]
      && samePath(steps[index].resultPath, resolve(prepOutDir, `${names[index]}.json`)), "STEP_BINDING_MISMATCH");
  }
}

function validateIdentity(value) {
  check(value && /^[a-f0-9]{64}$/u.test(value.sha256) && positiveInteger(value.bytes), "IDENTITY_INVALID");
  absolutePath(value.path);
}

function absolutePath(value) { check(typeof value === "string" && value.length > 0 && isAbsolute(value), "PATH_INVALID"); }
function samePath(left, right) {
  absolutePath(left); absolutePath(right);
  return resolve(left).toLowerCase() === resolve(right).toLowerCase();
}
function normalizeArea(value) { return typeof value === "string" ? value.trim().replace(/^-\s*/u, "").toLowerCase() : ""; }
function positiveInteger(value) { return Number.isSafeInteger(value) && value > 0; }
function finiteVector(value, size) { return Array.isArray(value) && value.length === size && value.every(Number.isFinite); }

function ticks(value) {
  check(typeof value === "string", "TIME_INVALID");
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,7}))?Z$/u.exec(value);
  check(match, "TIME_INVALID");
  const base = `${match[1]}.000Z`, milliseconds = Date.parse(base);
  check(Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === base, "TIME_INVALID");
  return BigInt(milliseconds) * 10_000n + BigInt((match[2] ?? "").padEnd(7, "0"));
}

function check(condition, code) { if (!condition) fail(code); }
function fail(code) { const error = new Error(`REOPEN_${code}`); error.code = `REOPEN_${code}`; throw error; }
