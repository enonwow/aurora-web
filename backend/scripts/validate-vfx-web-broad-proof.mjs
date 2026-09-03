import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const EVIDENCE_ROOT = path.resolve(
  REPO_ROOT,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16"
);
const PLACEABLE_ROOT = path.resolve(
  REPO_ROOT,
  "backend/docs/aurora-reverse/evidence/vfx-placeable-post-debt-2026-07-14"
);
const FFMPEG_PATH =
  process.env.FFMPEG_PATH ??
  "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe";
const TAG = "retail-20260716";
const SPECS = [
  ["row68", "vfx-nwn-web-row68"],
  ["row44", "vfx-broad-row44"],
  ["row50", "vfx-broad-row50"],
  ["row22", "vfx-nwn-web-row22"],
  ["row210", "vfx-broad-row210"],
  ["row216", "vfx-broad-row216"],
  ["row181", "vfx-broad-row181"],
  ["row1", "vfx-broad-row1"],
  ["aoe0", "vfx-broad-aoe0"]
];

const batchPath = path.resolve(EVIDENCE_ROOT, "aurora-web-capture-batch-state.json");
const batch = readJson(batchPath);
assert(batch.status === "complete", "Aurora Web capture batch is not complete.");
assert(batch.automaticRetry === false, "Batch must prohibit automatic retries.");

const results = [];
for (const [slug, fixtureId] of SPECS) {
  const summaryPath = path.resolve(
    EVIDENCE_ROOT,
    slug,
    "aurora-web",
    `aurora-web-${slug}-one-trigger-${TAG}-summary.json`
  );
  const summary = readJson(summaryPath);
  assert(summary.fixtureId === fixtureId, `${slug}: fixture ID mismatch.`);
  assert(
    summary.status === "recorded-single-continuous-playback",
    `${slug}: unexpected capture status.`
  );
  assert(summary.triggerCount === 1, `${slug}: trigger count is not exactly one.`);
  assert(summary.loop === false, `${slug}: loop must be false.`);
  assert(summary.captureArmedBeforePlayback === true, `${slug}: capture was not armed first.`);
  assert(summary.diagnosticHarness === false, `${slug}: diagnostic harness leaked into proof.`);
  assert(summary.proofState?.oneTrigger === true, `${slug}: proof state lost one-trigger marker.`);
  assert(summary.proofState?.loop === false, `${slug}: proof state reports a loop.`);
  assert(summary.domState?.oneTrigger === "true", `${slug}: DOM one-trigger marker is invalid.`);
  assert(summary.domState?.loop === "false", `${slug}: DOM loop marker is invalid.`);
  assert(summary.domState?.phase === "post", `${slug}: capture did not reach clean post-roll.`);
  assert(summary.domState?.state === "ready", `${slug}: renderer did not finish ready.`);
  assert(Array.isArray(summary.proofState?.timeline), `${slug}: proof timeline is missing.`);

  const mp4Path = path.resolve(summary.mp4.path);
  const webmPath = path.resolve(summary.webm.path);
  validateMediaRecord(summary.mp4, mp4Path, `${slug} MP4`);
  validateMediaRecord(summary.webm, webmPath, `${slug} WebM`);
  await decodeVideo(mp4Path, `${slug} MP4`);

  results.push({
    slug,
    fixtureId,
    status: "valid-single-playback-aurora-web-proof",
    triggerCount: 1,
    loop: false,
    diagnosticHarness: false,
    durationMs: summary.durationMs,
    requestedFps: summary.requestedFps,
    timelineEntryCount: summary.proofState.timeline.length,
    mp4: mediaRecord(mp4Path),
    webm: mediaRecord(webmPath),
    summary: mediaRecord(summaryPath)
  });
}

const placeableFramePath = path.resolve(
  PLACEABLE_ROOT,
  "post-debt-enon-bakery-plc-t04-10s-8fps-proof-v44.frame.json"
);
const placeableFrame = readJson(placeableFramePath);
const area = placeableFrame.domStatus?.areaPreview;
const sampleAtFive = placeableFrame.mp4PlaybackSamples?.find(
  (entry) => entry.elapsedSeconds === 5
);
const placeableMp4Path = path.resolve(placeableFrame.mp4Path);
assert(placeableFrame.mp4DeterministicCapture === true, "Placeable capture is not deterministic.");
assert(placeableFrame.mp4DurationMs === 10_000, "Placeable duration is not 10 seconds.");
assert(placeableFrame.mp4Fps === 8, "Placeable capture is not 8 fps.");
assert(placeableFrame.mp4FrameCount === 80, "Placeable capture does not contain 80 frames.");
assert(area?.renderStatus === "ready", "Placeable area renderer is not ready.");
assert(area?.renderObjectCount === 3, "Placeable proof does not contain three source instances.");
assert(area?.playbackRootCount === 3, "Placeable proof does not contain three playback roots.");
assert(area?.pointLightCount === 0, "Placeable proof fabricated a point light.");
assert(sampleAtFive?.playbackState?.visibleDrawMeshCount === 6, "Placeable t=5 mesh count is not six.");
assert(sampleAtFive?.playbackState?.visibleDrawParticleCount > 0, "Placeable t=5 has no particles.");
assert(
  ["fxpa_flame00", "fxpa_smoke01"].every((texture) =>
    sampleAtFive?.playbackState?.visibleTextureReferences?.includes(texture)
  ),
  "Placeable source textures are incomplete."
);
assert(
  !placeableFrame.runtimeEvents?.some((entry) => entry.method === "Runtime.exceptionThrown"),
  "Placeable capture contains a runtime exception."
);
await decodeVideo(placeableMp4Path, "plc_t04 MP4");

const abortedDevelopmentRequests = (placeableFrame.networkSummary ?? [])
  .filter((entry) => entry.errorText === "net::ERR_ABORTED")
  .map((entry) => entry.url);
results.push({
  slug: "plc_t04",
  fixtureId: "placeable-tm_pl_lightred-plc_t04-enon_bakery-v44",
  status: "valid-persistent-placeable-aurora-web-proof",
  lifecycle: "persistent-placeable-no-retrigger",
  durationMs: placeableFrame.mp4DurationMs,
  requestedFps: placeableFrame.mp4Fps,
  frameCount: placeableFrame.mp4FrameCount,
  sourceInstanceCount: area.renderObjectCount,
  playbackRootCount: area.playbackRootCount,
  visibleEmitterMeshCountAtFiveSeconds: sampleAtFive.playbackState.visibleDrawMeshCount,
  visibleParticleCountAtFiveSeconds: sampleAtFive.playbackState.visibleDrawParticleCount,
  sourceTexturesAtFiveSeconds: sampleAtFive.playbackState.visibleTextureReferences,
  pointLightCount: area.pointLightCount,
  runtimeExceptionCount: 0,
  abortedDevelopmentRequests,
  mp4: mediaRecord(placeableMp4Path),
  frame: mediaRecord(placeableFramePath),
  still: mediaRecord(path.resolve(placeableFrame.screenshotPath))
});

const row44LauncherFailure = batch.captures.find(
  (entry) =>
    entry.fixtureId === "vfx-broad-row44" &&
    entry.status === "launcher-failed-before-armed-no-playback"
);
assert(row44LauncherFailure?.playbackTriggerCount === 0, "row44 prestart failure is not classified.");
const successfulFixtures = new Set(
  batch.captures
    .filter((entry) => entry.status === "recorded-single-playback")
    .map((entry) => entry.fixtureId)
);
assert(successfulFixtures.size === 9, "Batch does not contain nine unique successful VFX captures.");

const output = {
  version: "aurora-vfx-web-broad-proof-validation/v1",
  generatedAt: new Date().toISOString(),
  status: "valid-10-fixture-aurora-web-proof-set",
  proofPolicy: {
    auroraFirst: true,
    nwnRecordingsReusedWithoutRerun: true,
    fireAndForgetExactlyOneTrigger: true,
    durationEffectsMatchedAtTwentySeconds: true,
    automaticPlaybackRetryUsed: false,
    diagnosticGeometryInComparison: false
  },
  fixtureCount: results.length,
  vfxPlaybackCount: 9,
  persistentPlaceableCount: 1,
  row44PrestartLauncherFailure: row44LauncherFailure.prestartClassification,
  results
};
const outputPath = path.resolve(EVIDENCE_ROOT, "aurora-web-proof-validation.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, status: output.status, fixtureCount: results.length }, null, 2));

function readJson(filePath) {
  assert(fs.existsSync(filePath), `Missing JSON artifact: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateMediaRecord(record, filePath, label) {
  assert(fs.existsSync(filePath), `${label} is missing: ${filePath}`);
  assert(fs.statSync(filePath).size > 4096, `${label} is too small.`);
  assert(record.sizeBytes === fs.statSync(filePath).size, `${label} size mismatch.`);
  assert(record.sha256 === sha256(filePath), `${label} SHA-256 mismatch.`);
}

function mediaRecord(filePath) {
  return {
    path: filePath,
    sizeBytes: fs.statSync(filePath).size,
    sha256: sha256(filePath)
  };
}

function sha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function decodeVideo(filePath, label) {
  const result = await runProcess(FFMPEG_PATH, [
    "-v",
    "error",
    "-i",
    filePath,
    "-f",
    "null",
    "-"
  ]);
  assert(result.exitCode === 0, `${label} does not decode: ${result.stderr.slice(-1200)}`);
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("exit", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}
