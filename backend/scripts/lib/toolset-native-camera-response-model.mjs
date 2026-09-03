import { CAMERA_AXES, REQUIRED_BINARY_SHA256 } from "./toolset-absolute-camera-core.mjs";

export function buildNativeToolsetCameraResponseModel({ command, transitions, minimumSamples = 3 }) {
  const normalizedCommand = String(command ?? "").trim();
  if (!normalizedCommand) throw codedError("toolset_camera_response_command_required", "command is required.");
  const entries = Array.isArray(transitions) ? transitions : [];
  if (entries.length < minimumSamples) {
    throw codedError("toolset_camera_response_samples_insufficient", `At least ${minimumSamples} native transitions are required.`);
  }
  const normalized = entries.map((entry, index) => normalizeTransition(entry, index, normalizedCommand));
  const reference = normalized[0];
  for (const entry of normalized.slice(1)) {
    if (entry.area !== reference.area || entry.sourceTile.x !== reference.sourceTile.x || entry.sourceTile.y !== reference.sourceTile.y) {
      throw codedError("toolset_camera_response_context_mismatch", "Native response samples must use one Area and source tile.");
    }
  }
  const deltas = Object.fromEntries(CAMERA_AXES.map((axis) => [axis, suppressReadbackNoise(axis, median(normalized.map((entry) => entry.deltas[axis])))]));
  if (CAMERA_AXES.every((axis) => Math.abs(deltas[axis]) < 1e-12)) {
    throw codedError("toolset_camera_response_empty", "Native transitions have no measurable camera delta.");
  }
  return {
    version: "toolset-native-camera-response-model/v1",
    status: "measured",
    source: "native_readback",
    command: normalizedCommand,
    sampleCount: normalized.length,
    area: reference.area,
    sourceTile: reference.sourceTile,
    binarySha256: REQUIRED_BINARY_SHA256,
    deltas,
    transitions: normalized.map((entry) => entry.id),
  };
}

function normalizeTransition(value, index, command) {
  if (value?.status !== "verified" || value?.command !== command) {
    throw codedError("toolset_camera_response_transition_invalid", `Transition ${index} is not a verified ${command} sample.`);
  }
  if (value?.adapter?.readback !== "native" || value?.adapter?.binarySha256 !== REQUIRED_BINARY_SHA256) {
    throw codedError("toolset_camera_response_transition_not_native", `Transition ${index} is not version-pinned native readback.`);
  }
  const before = normalizeState(value.before, `transitions[${index}].before`);
  const after = normalizeState(value.after, `transitions[${index}].after`);
  if (before.area !== after.area || before.sourceTile.x !== after.sourceTile.x || before.sourceTile.y !== after.sourceTile.y) {
    throw codedError("toolset_camera_response_transition_context_changed", `Transition ${index} changed Area or source tile.`);
  }
  return {
    id: String(value.id ?? index),
    area: before.area,
    sourceTile: before.sourceTile,
    deltas: {
      yawDegrees: signedPeriodicDelta(after.camera.yawDegrees, before.camera.yawDegrees),
      pitchDegrees: after.camera.pitchDegrees - before.camera.pitchDegrees,
      zoomLogRatio: Math.log(after.camera.zoom / before.camera.zoom),
      centreX: after.camera.centreX - before.camera.centreX,
      centreY: after.camera.centreY - before.camera.centreY,
    },
  };
}

function normalizeState(value, name) {
  if (value?.provenance !== "native_toolset") throw codedError("toolset_camera_response_state_not_native", `${name} must be native_toolset.`);
  const area = String(value?.area ?? "").trim().toLowerCase();
  if (!area) throw codedError("toolset_camera_response_state_invalid", `${name}.area is required.`);
  return {
    area,
    sourceTile: { x: integer(value?.sourceTile?.x, `${name}.sourceTile.x`), y: integer(value?.sourceTile?.y, `${name}.sourceTile.y`) },
    camera: Object.fromEntries([
      ["yawDegrees", number(value?.camera?.yawDegrees, `${name}.camera.yawDegrees`)],
      ["pitchDegrees", number(value?.camera?.pitchDegrees, `${name}.camera.pitchDegrees`)],
      ["zoom", positive(value?.camera?.zoom, `${name}.camera.zoom`)],
      ["centreX", number(value?.camera?.centreX, `${name}.camera.centreX`)],
      ["centreY", number(value?.camera?.centreY, `${name}.camera.centreY`)],
    ]),
  };
}
function median(values) { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }
function suppressReadbackNoise(axis, value) {
  const floors = { yawDegrees: 1e-4, pitchDegrees: 1e-4, zoomLogRatio: 1e-6, centreX: 1e-4, centreY: 1e-4 };
  return Math.abs(value) < floors[axis] ? 0 : value;
}
function signedPeriodicDelta(after, before) { let delta = (after - before) % 360; if (delta > 180) delta -= 360; if (delta <= -180) delta += 360; return delta; }
function number(value, name) { const parsed = Number(value); if (!Number.isFinite(parsed)) throw codedError("toolset_camera_response_state_invalid", `${name} must be finite.`); return parsed; }
function positive(value, name) { const parsed = number(value, name); if (parsed <= 0) throw codedError("toolset_camera_response_state_invalid", `${name} must be positive.`); return parsed; }
function integer(value, name) { const parsed = Number(value); if (!Number.isInteger(parsed)) throw codedError("toolset_camera_response_state_invalid", `${name} must be an integer.`); return parsed; }
function codedError(code, message) { const error = new Error(message); error.code = code; return error; }
