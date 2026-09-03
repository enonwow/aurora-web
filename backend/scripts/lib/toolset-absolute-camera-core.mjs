/**
 * Native-only absolute Toolset camera core.
 *
 * This module deliberately has no image, screenshot, PNG or Aurora Eye
 * dependency.  Its adapter is the only authority on live Toolset state.  A
 * caller must use Aurora Eye separately as an integration observer.
 */
export const REQUIRED_BINARY_SHA256 = "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
export const CAMERA_AXES = Object.freeze(["yawDegrees", "pitchDegrees", "zoomLogRatio", "centreX", "centreY"]);

export async function runAbsoluteToolsetCameraControl({ adapter, target, tolerance, responseModels, maxCorrections = 24 }) {
  const adapterInfo = await requireNativeAdapter(adapter);
  const normalizedTarget = normalizeTarget(target);
  const normalizedTolerance = normalizeTolerance(tolerance);
  const maxSteps = integer(maxCorrections, "maxCorrections", 1, 100);
  const initial = normalizeState(await adapter.readState(), "initial readback");
  assertArea(initial, normalizedTarget);

  if (!sameTile(initial.sourceTile, normalizedTarget.sourceTile)) {
    if (typeof adapter.selectSourceTile !== "function") {
      throw codedError("toolset_tile_selection_adapter_unavailable", "Native adapter does not implement selectSourceTile.");
    }
    await adapter.selectSourceTile({ area: normalizedTarget.area, sourceTile: normalizedTarget.sourceTile });
  }
  let current = normalizeState(await adapter.readState(), "post-selection readback");
  assertArea(current, normalizedTarget);
  if (!sameTile(current.sourceTile, normalizedTarget.sourceTile)) {
    throw codedError("toolset_source_tile_readback_mismatch", "Native readback did not confirm the requested source tile.", { expected: normalizedTarget.sourceTile, actual: current.sourceTile });
  }

  const trace = [];
  for (let index = 0; index <= maxSteps; index += 1) {
    const assessment = assessAbsoluteCameraTarget({ current, target: normalizedTarget, tolerance: normalizedTolerance });
    if (assessment.status === "at_target") {
      return {
        status: "at_target",
        version: "toolset-absolute-camera-core/v1",
        adapter: adapterInfo,
        target: normalizedTarget,
        achievedState: current,
        tolerance: normalizedTolerance,
        corrections: trace,
      };
    }
    if (index === maxSteps) {
      throw codedError("toolset_absolute_camera_convergence_exhausted", "Camera did not reach the requested absolute target within the correction limit.", { target: normalizedTarget, current, assessment, corrections: trace });
    }
    const correction = chooseNativeCorrection({ assessment, responseModels, tolerance: normalizedTolerance });
    if (typeof adapter.applyBoundedCommand !== "function") {
      throw codedError("toolset_camera_command_adapter_unavailable", "Native adapter does not implement applyBoundedCommand.");
    }
    await adapter.applyBoundedCommand({ command: correction.command, controlledAxis: correction.controlledAxis });
    const after = normalizeState(await adapter.readState(), `post-command readback ${index + 1}`);
    assertArea(after, normalizedTarget);
    if (!sameTile(after.sourceTile, normalizedTarget.sourceTile)) {
      throw codedError("toolset_source_tile_changed_unexpectedly", "Camera command changed the selected source tile.", { command: correction.command, expected: normalizedTarget.sourceTile, actual: after.sourceTile });
    }
    const observed = calculateErrors(after, current);
    assertNoUnexpectedCoupling({ correction, observed, tolerance: normalizedTolerance });
    trace.push({ index: index + 1, correction, before: current.camera, after: after.camera, observedDelta: observed });
    current = after;
  }
  throw codedError("toolset_absolute_camera_internal_error", "Unreachable camera control state.");
}

export function assessAbsoluteCameraTarget({ current, target, tolerance }) {
  const state = normalizeState(current, "current");
  const desired = normalizeTarget(target);
  const accepted = normalizeTolerance(tolerance);
  assertArea(state, desired);
  if (!sameTile(state.sourceTile, desired.sourceTile)) return { status: "blocked", blockerCode: "toolset_source_tile_readback_mismatch", expected: desired.sourceTile, actual: state.sourceTile };
  const errors = calculateErrors(desired, state);
  const unresolved = CAMERA_AXES.filter((axis) => Math.abs(errors[axis]) > accepted[axis]);
  return unresolved.length === 0
    ? { status: "at_target", errors, current: state, target: desired }
    : { status: "correction_required", errors, unresolved, current: state, target: desired };
}

export function chooseNativeCorrection({ assessment, responseModels, tolerance }) {
  if (assessment?.status !== "correction_required") {
    throw codedError("toolset_camera_correction_not_required", "A correction can only be chosen for an unresolved native state.");
  }
  const accepted = normalizeTolerance(tolerance);
  const axis = [...assessment.unresolved].sort((left, right) => Math.abs(assessment.errors[right]) / accepted[right] - Math.abs(assessment.errors[left]) / accepted[left])[0];
  const candidates = Object.entries(responseModels ?? {})
    .map(([command, model]) => ({ command, model: normalizeNativeResponseModel(model, command) }))
    .filter(({ model }) => Math.sign(model.deltas[axis]) === Math.sign(assessment.errors[axis]));
  if (candidates.length === 0) {
    throw codedError("toolset_camera_response_model_missing", `No native response model corrects ${axis}.`, { axis, error: assessment.errors[axis] });
  }
  const safe = candidates.filter(({ model }) => CAMERA_AXES.every((other) => other === axis || Math.abs(model.deltas[other]) <= accepted[other]));
  if (safe.length === 0) {
    throw codedError("toolset_camera_response_model_coupled", `Every candidate for ${axis} changes another controlled axis outside tolerance.`, { axis, candidates: candidates.map(({ command, model }) => ({ command, deltas: model.deltas })) });
  }
  safe.sort((left, right) => Math.abs(right.model.deltas[axis]) - Math.abs(left.model.deltas[axis]));
  const selected = safe[0];
  return { command: selected.command, controlledAxis: axis, predictedDelta: selected.model.deltas, responseModel: selected.model };
}

async function requireNativeAdapter(adapter) {
  if (!adapter || typeof adapter.describe !== "function" || typeof adapter.readState !== "function") {
    throw codedError("camera_state_adapter_unavailable", "Absolute camera control requires a native Toolset state adapter with describe() and readState().");
  }
  const info = await adapter.describe();
  if (info?.status !== "ready" || info?.readback !== "native" || info?.binarySha256 !== REQUIRED_BINARY_SHA256) {
    throw codedError("camera_state_adapter_unavailable", "Adapter is not a ready, version-pinned native Toolset camera adapter.", { received: info, requiredBinarySha256: REQUIRED_BINARY_SHA256 });
  }
  return { binarySha256: info.binarySha256, readback: info.readback, provenance: info.provenance ?? "native_toolset" };
}

function normalizeTarget(value) {
  const area = String(value?.area ?? "").trim().toLowerCase();
  if (!area) throw codedError("toolset_camera_target_invalid", "target.area is required.");
  return { area, sourceTile: normalizeTile(value?.sourceTile, "target.sourceTile"), camera: normalizeCamera(value?.camera, "target.camera") };
}
function normalizeState(value, name) {
  const area = String(value?.area ?? "").trim().toLowerCase();
  if (!area) throw codedError("toolset_camera_state_invalid", `${name}.area is required.`);
  const provenance = String(value?.provenance ?? "").trim();
  if (provenance !== "native_toolset") throw codedError("toolset_camera_state_provenance_invalid", `${name} must be native_toolset readback.`);
  return { area, sourceTile: normalizeTile(value?.sourceTile, `${name}.sourceTile`), camera: normalizeCamera(value?.camera, `${name}.camera`), provenance };
}
function normalizeTile(value, name) { return { x: integer(value?.x, `${name}.x`, -100000, 100000), y: integer(value?.y, `${name}.y`, -100000, 100000) }; }
function normalizeCamera(value, name) {
  return { yawDegrees: periodic(value?.yawDegrees, `${name}.yawDegrees`), pitchDegrees: number(value?.pitchDegrees, `${name}.pitchDegrees`, -89.999, 89.999), zoom: number(value?.zoom, `${name}.zoom`, 0.000001, Number.MAX_SAFE_INTEGER), centreX: number(value?.centreX, `${name}.centreX`, -1e9, 1e9), centreY: number(value?.centreY, `${name}.centreY`, -1e9, 1e9) };
}
function normalizeTolerance(value) {
  return { yawDegrees: number(value?.yawDegrees, "tolerance.yawDegrees", 0.000001, 180), pitchDegrees: number(value?.pitchDegrees, "tolerance.pitchDegrees", 0.000001, 90), zoomLogRatio: number(value?.zoomLogRatio, "tolerance.zoomLogRatio", 0.000001, 10), centreX: number(value?.centreX, "tolerance.centreX", 0.000001, 1e9), centreY: number(value?.centreY, "tolerance.centreY", 0.000001, 1e9) };
}
function normalizeNativeResponseModel(value, command) {
  if (value?.status !== "measured" || value?.source !== "native_readback") throw codedError("toolset_camera_response_model_not_native", `Response model ${command} is not a native measured model.`);
  const deltas = value?.deltas ?? {};
  const normalized = {};
  for (const axis of CAMERA_AXES) normalized[axis] = number(deltas[axis], `responseModels.${command}.deltas.${axis}`, -1e9, 1e9);
  if (CAMERA_AXES.every((axis) => Math.abs(normalized[axis]) < 1e-12)) throw codedError("toolset_camera_response_model_empty", `Response model ${command} has no observable native delta.`);
  return { status: "measured", source: "native_readback", sampleCount: integer(value.sampleCount, `responseModels.${command}.sampleCount`, 3, 100000), deltas: normalized };
}
function calculateErrors(target, current) {
  return { yawDegrees: signedPeriodicDelta(target.camera.yawDegrees, current.camera.yawDegrees), pitchDegrees: round(target.camera.pitchDegrees - current.camera.pitchDegrees), zoomLogRatio: round(Math.log(target.camera.zoom / current.camera.zoom)), centreX: round(target.camera.centreX - current.camera.centreX), centreY: round(target.camera.centreY - current.camera.centreY) };
}
function assertNoUnexpectedCoupling({ correction, observed, tolerance }) {
  for (const axis of CAMERA_AXES) {
    if (axis !== correction.controlledAxis && Math.abs(observed[axis]) > tolerance[axis]) throw codedError("toolset_camera_axis_coupling_detected", "Native command changed an uncontrolled camera axis outside tolerance.", { command: correction.command, controlledAxis: correction.controlledAxis, offendingAxis: axis, observed, tolerance });
  }
}
function assertArea(state, target) { if (state.area !== target.area) throw codedError("toolset_area_readback_mismatch", "Native readback did not return the requested Area.", { expected: target.area, actual: state.area }); }
function sameTile(left, right) { return left.x === right.x && left.y === right.y; }
function periodic(value, name) { const n = number(value, name, -1e9, 1e9); return ((n % 360) + 360) % 360; }
function number(value, name, min, max) { const n = Number(value); if (!Number.isFinite(n) || n < min || n > max) throw codedError("toolset_camera_value_invalid", `${name} is outside its valid range.`); return n; }
function integer(value, name, min, max) { const n = Number(value); if (!Number.isInteger(n) || n < min || n > max) throw codedError("toolset_camera_value_invalid", `${name} must be an integer in range.`); return n; }
function signedPeriodicDelta(target, current) { let delta = (target - current) % 360; if (delta > 180) delta -= 360; if (delta <= -180) delta += 360; return round(delta); }
function round(value) { return Math.round(value * 1e9) / 1e9; }
function codedError(code, message, details) { const error = new Error(message); error.code = code; if (details !== undefined) error.details = details; return error; }
