import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("./capture-vfx-nwn-web-row68-once.mjs", import.meta.url),
  "utf8"
);

assert.match(source, /createDeterministicCapturePlan\(DURATION_MS, FPS\)/u);
assert.match(source, /Page\.captureScreenshot/u);
assert.match(source, /VFX_CAPTURE_MODE/u);
assert.doesNotMatch(source, /FIXTURE_ID\s*===\s*["']vfx-/u);
assert.match(
  source,
  /`backend\/docs\/aurora-reverse\/evidence\/\$\{FIXTURE_ID\}\/web`/u
);
assert.match(source, /process\.env\.VFX_DIAGNOSTICS \?\? "0"/u);
assert.match(source, /static-timeline/u);
assert.match(source, /playbackHookCalled/u);
assert.match(source, /activeProofState/u);
assert.match(source, /finalProofState/u);
assert.match(source, /readCanonicalCanvasViewport/u);
assert.match(source, /alignCaptureViewportToCanvas/u);
assert.match(source, /captureViewport/u);
assert.match(source, /canvasRectMatchesViewport/u);
assert.match(source, /mkdtempSync/u);
assert.match(source, /os\.tmpdir\(\)/u);
assert.match(source, /publishCaptureArtifacts/u);
assert.match(source, /STAGING_ROOT/u);
assert.doesNotMatch(
  source,
  /const FRAME_DIR = path\.join\(PROOF_ROOT/u,
  "Capture frames must be staged outside the watched repository tree."
);
assert.doesNotMatch(source, /MediaRecorder/u);
assert.doesNotMatch(source, /captureStream\(/u);
assert.doesNotMatch(source, /setInterval\(/u);

const playbackStarts = source.match(/\bstart\(\)/gu) ?? [];
assert.equal(playbackStarts.length, 1, "The capture harness must call the playback hook once.");

assert.match(source, /frameCount !== CAPTURE_PLAN\.frameCount/u);
assert.match(source, /finalFrameIndex !== CAPTURE_PLAN\.finalFrameIndex/u);

console.log(
  JSON.stringify({
    status: "ok",
    playbackStartCalls: playbackStarts.length,
    scheduler: "deterministic-cdp-screenshot-sequence"
  })
);
