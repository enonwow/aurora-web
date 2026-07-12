const EPSILON = 0.001;

export function buildVisualCameraTransition({ before, after }) {
  const beforePose = requiredPose(before, "before");
  const afterPose = requiredPose(after, "after");
  return {
    status: "estimated",
    before: beforePose,
    after: afterPose,
    yawDeltaModulo90Degrees: round(signedPeriodicDelta(afterPose.yawDegreesModulo90, beforePose.yawDegreesModulo90, 90)),
    pitchDeltaDegrees: round(afterPose.pitchDegrees - beforePose.pitchDegrees),
    zoomDeltaPixelsPerTile: round(afterPose.zoomPixelsPerTile - beforePose.zoomPixelsPerTile),
    zoomRatio: round(afterPose.zoomPixelsPerTile / beforePose.zoomPixelsPerTile),
  };
}

export function requireMeasuredCameraCommand({ command, transition }) {
  if (!transition || transition.status !== "estimated") {
    return blocked("toolset_camera_pose_unavailable", "The before/after grid pose could not be estimated.");
  }
  const absoluteYaw = Math.abs(Number(transition.yawDeltaModulo90Degrees));
  const absolutePitch = Math.abs(Number(transition.pitchDeltaDegrees));
  const zoomRatioDistance = Math.abs(Math.log(Number(transition.zoomRatio)));
  if (["rotate-clockwise", "rotate-counterclockwise"].includes(command)) {
    return absoluteYaw >= 0.5
      ? measured("yawDeltaModulo90Degrees", transition.yawDeltaModulo90Degrees)
      : blocked("toolset_camera_yaw_delta_not_proven", "The viewport changed but its grid orientation did not measurably rotate.");
  }
  if (["pitch-up", "pitch-down"].includes(command)) {
    return absolutePitch >= 0.5
      ? measured("pitchDeltaDegrees", transition.pitchDeltaDegrees)
      : blocked("toolset_camera_pitch_delta_not_proven", "The viewport changed but pitch did not change by at least 0.5 degrees.");
  }
  if (["zoom-in", "zoom-out"].includes(command)) {
    return zoomRatioDistance >= 0.01
      ? measured("zoomRatio", transition.zoomRatio)
      : blocked("toolset_camera_zoom_delta_not_proven", "The viewport changed but tile scale did not change by at least 1 percent.");
  }
  return {
    status: "not_applicable",
    reason: "Translation commands require scene-anchor tracking; they do not invent an angle or zoom result.",
  };
}

function requiredPose(analysis, name) {
  if (analysis?.acceptance?.accepted !== true || !analysis.cameraPose) {
    const error = new Error(`${name} pose must be an accepted visual grid estimate.`);
    error.code = "toolset_camera_pose_unavailable";
    throw error;
  }
  const pose = analysis.cameraPose;
  for (const field of ["yawDegreesModulo90", "pitchDegrees", "zoomPixelsPerTile"]) {
    if (!Number.isFinite(Number(pose[field]))) {
      const error = new Error(`${name}.${field} must be finite.`);
      error.code = "toolset_camera_pose_invalid";
      throw error;
    }
  }
  return {
    yawDegreesModulo90: Number(pose.yawDegreesModulo90),
    pitchDegrees: Number(pose.pitchDegrees),
    zoomPixelsPerTile: Number(pose.zoomPixelsPerTile),
    confidence: Number(pose.confidence),
  };
}

function signedPeriodicDelta(after, before, period) {
  let delta = (after - before) % period;
  if (delta > period / 2) delta -= period;
  if (delta <= -period / 2) delta += period;
  return Math.abs(delta) < EPSILON ? 0 : delta;
}

function measured(metric, value) {
  return { status: "measured", metric, value };
}

function blocked(blockerCode, reason) {
  return { status: "blocked", blockerCode, reason };
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
