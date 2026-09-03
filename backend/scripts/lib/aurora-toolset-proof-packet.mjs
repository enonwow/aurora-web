export const AURORA_TOOLSET_PROOF_PACKET_VERSION = "aurora-toolset-proof-packet/v1";
export const APPROVED_PHYSICAL_PROOF_SCREEN = "\\\\.\\DISPLAY1";

/**
 * Makes the final acceptance decision from already-created evidence only.
 * It does not launch Toolset, capture pixels, or dispatch camera input.
 */
export function assembleAuroraToolsetProofPacket({ session, observation, targetReport, tileReadback, monitorEvidence, absoluteCoreResult = null, eyeEvidence = null }) {
  const effectiveMonitorEvidence = monitorEvidence ?? observation?.capture?.monitorEvidence ?? null;
  const checks = [
    checkSession(session),
    checkViewportCapture(observation),
      checkExactTileSelection(tileReadback),
    absoluteCoreResult ? checkNativeAbsoluteCamera(absoluteCoreResult) : checkNumericCamera(observation),
    checkViewportTarget(targetReport),
    absoluteCoreResult ? checkAuroraEye(eyeEvidence) : verified("legacy_eye_not_required", {}),
    checkPhysicalMonitor(effectiveMonitorEvidence),
  ];
  const failures = checks.filter((check) => check.status !== "verified");
  return {
    version: AURORA_TOOLSET_PROOF_PACKET_VERSION,
    generatedAt: new Date().toISOString(),
    status: failures.length === 0 ? "verified" : "blocked",
    blockerCodes: failures.map((failure) => failure.code),
    target: {
      modulePath: session?.modulePath ?? null,
      areaResref: observation?.target?.areaResref ?? session?.currentArea?.resref ?? null,
    },
    acceptance: {
      requires: ["one canonical session", "validated area viewport PNG", "exact tile-selection proof", "full native yaw/pitch/zoom/focus", "independent Aurora Eye", "physical second monitor"],
      checks,
    },
    artifacts: {
      viewportPng: observation?.capture?.viewportPng ?? null,
      targetReport: targetReport ?? null,
      tileReadback: tileReadback ?? null,
      monitorEvidence: effectiveMonitorEvidence,
      absoluteCoreResult,
      eyeEvidence,
    },
    safety: {
      launchesToolset: false,
      sendsWindowMessages: false,
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouse: false,
      method: "offline proof-packet assembly from explicit evidence",
    },
  };
}

function checkNativeAbsoluteCamera(core) {
  const exactBinary = "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
  if (core?.status !== "at_target" || core?.adapter?.readback !== "native" || core?.adapter?.provenance !== "native_toolset" || core?.adapter?.binarySha256 !== exactBinary) {
    return blocked("proof_native_absolute_camera_missing", "No approved at_target native Toolset camera result is attached.");
  }
  const camera = core?.achievedState?.camera;
  const missing = ["yawDegrees", "pitchDegrees", "zoom", "centreX", "centreY"].filter((key) => !Number.isFinite(Number(camera?.[key])));
  if (missing.length) return blocked("proof_native_camera_components_missing", `Native camera result misses ${missing.join(", ")}.`);
  return verified("native_absolute_camera", { ...camera, area: core?.achievedState?.area ?? null, provenance: core?.achievedState?.provenance ?? null });
}

function checkAuroraEye(eye) {
  const capturesVerified = [eye?.beforeA, eye?.beforeB, eye?.after].every((item) => item?.status === "verified");
  const baselineStable = eye?.baseline?.status === "verified" && Number(eye?.baseline?.changedRatio) <= 0.001;
  const effectObserved = eye?.effect?.status === "verified" && Number(eye?.effect?.changedSamples) > 0;
  if (!capturesVerified || !baselineStable || !effectObserved) return blocked("proof_aurora_eye_transaction_unverified", "Independent Aurora Eye before-a/b/after transaction is incomplete or did not observe the effect.");
  return verified("independent_aurora_eye", { baselineChangedSamples: Number(eye.baseline.changedSamples), effectChangedSamples: Number(eye.effect.changedSamples), effectChangedRatio: Number(eye.effect.changedRatio) });
}

function checkSession(session) {
  if (!session || !session.modulePath || !session.currentArea?.resref) return blocked("proof_session_identity_missing", "Session does not identify one module and one current Area.");
  if (!session.moduleLoad?.readyAt) return blocked("proof_session_module_not_ready", "Session has no module-ready evidence.");
  return verified("canonical_session", { areaResref: session.currentArea.resref, modulePath: session.modulePath });
}

function checkViewportCapture(observation) {
  const capture = observation?.capture;
  if (!capture?.viewportPng || capture.scope !== "validated Toolset Area TScrollBox viewport") {
    return blocked("proof_viewport_capture_missing", "No validated Area TScrollBox viewport PNG is attached.");
  }
  return verified("validated_viewport_capture", { viewportPng: capture.viewportPng });
}

function checkExactTileSelection(readback) {
  const sourceTargeted = readback?.evidenceKind === "source-targeted-visual-selection/v1";
  const tile = sourceTargeted ? readback?.sourceTile : (readback?.tile ?? readback);
  if (readback?.status !== "verified" || !["index", "x", "y", "tileId", "orientation"].every((key) => Number.isInteger(Number(tile?.[key])))) {
    return blocked("proof_exact_tile_selection_missing", "Proof packet requires direct Toolset identity or a verified source-targeted visual selection transaction.");
  }
  return verified(sourceTargeted ? "source_targeted_tile_selection" : "direct_tile_identity", { tile: { index: Number(tile.index), x: Number(tile.x), y: Number(tile.y), tileId: Number(tile.tileId), orientation: Number(tile.orientation) } });
}

function checkNumericCamera(observation) {
  const pose = observation?.cameraPose;
  if (pose?.status !== "estimated") return blocked("proof_numeric_camera_pose_missing", "No accepted numeric camera pose is attached.");
  const missing = ["yawDegrees", "pitchDegrees", "zoomPixelsPerTile"].filter((key) => !Number.isFinite(Number(pose[key])));
  if (missing.length) return blocked("proof_numeric_camera_components_missing", `Camera pose misses ${missing.join(", ")}.`);
  if (pose?.yawEvidence?.method !== "source-grid-directed-selection/v1") return blocked("proof_camera_yaw_provenance_missing", "Numeric yaw requires directed source-grid calibration evidence.");
  return verified("numeric_camera_pose", { yawDegrees: Number(pose.yawDegrees), pitchDegrees: Number(pose.pitchDegrees), zoomPixelsPerTile: Number(pose.zoomPixelsPerTile) });
}

function checkViewportTarget(report) {
  if (report?.status !== "verified") return blocked("proof_viewport_target_unverified", "Viewport target evaluator did not verify the requested tile, camera, and centring.", { upstreamBlockerCodes: report?.blockerCodes ?? [] });
  return verified("viewport_target", { target: report.target ?? null });
}

function checkPhysicalMonitor(evidence) {
  if (evidence?.approvedPhysicalScreenDevice !== APPROVED_PHYSICAL_PROOF_SCREEN || evidence?.moduleScreenDevice !== APPROVED_PHYSICAL_PROOF_SCREEN || evidence?.moduleScreenPrimary !== false) {
    return blocked("proof_physical_second_monitor_unverified", "Proof requires direct evidence that the Toolset module was on the approved left, non-primary physical monitor.");
  }
  return verified("physical_second_monitor", { device: evidence.moduleScreenDevice, primary: evidence.moduleScreenPrimary });
}

function verified(name, details) { return { name, status: "verified", details }; }
function blocked(code, reason, details = undefined) { return { status: "blocked", code, reason, ...(details === undefined ? {} : { details }) }; }
