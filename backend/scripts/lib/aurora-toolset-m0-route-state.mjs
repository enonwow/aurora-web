import { markAreaReady, recordLaneFailure } from "./aurora-toolset-session-state.mjs";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// A visual-capture failure happens after native Area selection has already been
// proven. Preserve that fact in the active ledger and isolate the failure to
// the M0 proof lane; it must never erase the selected Area or close Toolset.
export function transitionM0CaptureFailure(state, { resref, name, blockerPath, details }) {
  let next = state;
  if (next.phase !== "area_ready" || next.currentArea?.resref !== resref) {
    next = markAreaReady(next, { resref, name });
  }
  return recordLaneFailure(next, {
    lane: "m0_tscrollbox_capture",
    code: "M0_TOOLSET_TSCROLLBOX_CAPTURE_FAILED",
    details: { ...details, blockerPath },
  });
}

export function persistM0CaptureFailure({
  state,
  artifactDir,
  profileId,
  modulePath,
  moduleSha256,
  resref,
  name,
  queueManifestPath,
  viewportPath,
  viewportResultPath,
  captureError,
}) {
  const blockerPath = resolve(artifactDir, "m0-toolset-capture-blocker.json");
  const payload = {
    version: "aurora-m0-toolset-capture-blocker/v1",
    status: "failed",
    recordedAt: new Date().toISOString(),
    profileId,
    module: { path: modulePath, sha256: moduleSha256, policy: "existing_exact_read_only" },
    area: { resref, nativeTreeDisplayName: name },
    lane: "m0_tscrollbox_capture",
    blockerCode: "M0_TOOLSET_TSCROLLBOX_CAPTURE_FAILED",
    queueManifestPath,
    viewportPath,
    viewportResultPath,
    captureError,
    resumeCondition: "Do not retry the unchanged capture. Preserve the one healthy Toolset session and investigate a distinct, canonical capture path or a changed observable scene state.",
  };
  writeFileSync(blockerPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return {
    blockerPath,
    payload,
    state: transitionM0CaptureFailure(state, {
      resref,
      name,
      blockerPath,
      details: { queueManifestPath, viewportPath, viewportResultPath, captureError },
    }),
  };
}
