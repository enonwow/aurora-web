import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const EVIDENCE_RELATIVE_ROOT =
  "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16";
const EVIDENCE_ROOT = path.resolve(REPO_ROOT, EVIDENCE_RELATIVE_ROOT);
const CAPTURE_SCRIPT = path.resolve(
  REPO_ROOT,
  "backend/scripts/capture-vfx-nwn-web-row68-once.mjs"
);
const TAG = process.env.VFX_CAPTURE_TAG ?? "retail-20260716";
const FPS = Number(process.env.VFX_CAPTURE_FPS ?? 8);
const allSpecs = [
  { slug: "row68", fixtureId: "vfx-nwn-web-row68" },
  { slug: "row22", fixtureId: "vfx-nwn-web-row22" },
  { slug: "row44", fixtureId: "vfx-broad-row44" },
  { slug: "row50", fixtureId: "vfx-broad-row50" },
  { slug: "row210", fixtureId: "vfx-broad-row210" },
  { slug: "row216", fixtureId: "vfx-broad-row216" },
  { slug: "row181", fixtureId: "vfx-broad-row181" },
  { slug: "row1", fixtureId: "vfx-broad-row1" },
  { slug: "aoe0", fixtureId: "vfx-broad-aoe0" }
];
const START_AT = process.env.VFX_CAPTURE_START_AT?.trim() ?? "";
const RESUME_AFTER_PRESTART_FAILURE =
  process.env.VFX_CAPTURE_RESUME_AFTER_PRESTART_FAILURE === "1";
const startIndex = START_AT
  ? allSpecs.findIndex((entry) => entry.fixtureId === START_AT)
  : 0;
if (startIndex < 0) throw new Error(`Unknown resume fixture: ${START_AT}`);
const specs = allSpecs.slice(startIndex);
const batchStatePath = path.resolve(EVIDENCE_ROOT, "aurora-web-capture-batch-state.json");
const initialState = {
  version: "aurora-vfx-web-broad-capture-batch/v1",
  tag: TAG,
  fps: FPS,
  automaticRetry: false,
  startedAt: new Date().toISOString(),
  status: "preflight",
  captures: []
};
const state = RESUME_AFTER_PRESTART_FAILURE && fs.existsSync(batchStatePath)
  ? JSON.parse(fs.readFileSync(batchStatePath, "utf8"))
  : initialState;

if (RESUME_AFTER_PRESTART_FAILURE) {
  assertAndClassifyPrestartFailure();
  state.status = "resume-preflight";
  state.resumedAt = new Date().toISOString();
  state.resumeFixtureId = specs[0]?.fixtureId;
  state.resumeReason = "previous launcher exited before armed stability and before any playback hook could run";
}

assertCleanPreflight();
for (const spec of specs) assertTargetsAbsent(spec);
writeState();

for (const [index, spec] of specs.entries()) {
  const manifestPath = path.resolve(
    REPO_ROOT,
    `frontend/public/dev-fixtures/${spec.fixtureId}/manifest.json`
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const runtimeDurationSeconds = Number(manifest.runtime?.durationSeconds);
  if (!(runtimeDurationSeconds > 0)) {
    throw new Error(`Runtime duration missing for ${spec.fixtureId}.`);
  }
  const captureDurationMs = Math.round((runtimeDurationSeconds + 4) * 1000);
  const record = {
    slug: spec.slug,
    fixtureId: spec.fixtureId,
    runtimeDurationSeconds,
    captureDurationMs,
    status: "starting-single-playback",
    launchAttemptCount:
      state.captures.filter((entry) => entry.fixtureId === spec.fixtureId).length + 1,
    playbackAttemptCount: 1,
    startedAt: new Date().toISOString()
  };
  state.status = `capturing:${spec.fixtureId}`;
  state.captures.push(record);
  writeState();
  const proofRoot = `${EVIDENCE_RELATIVE_ROOT}/${spec.slug}/aurora-web`;
  const result = await runProcess(process.execPath, [CAPTURE_SCRIPT], {
    ...process.env,
    VFX_FIXTURE_ID: spec.fixtureId,
    VFX_PROOF_ROOT: proofRoot,
    VFX_BASE_URL: process.env.VFX_BASE_URL ?? "http://127.0.0.1:5188",
    VFX_CAPTURE_TAG: TAG,
    VFX_CAPTURE_FPS: String(FPS),
    VFX_CAPTURE_DURATION_MS: String(captureDurationMs),
    VFX_CAPTURE_PORT: String(9800 + index),
    VFX_DIAGNOSTICS: "0"
  });
  record.finishedAt = new Date().toISOString();
  record.exitCode = result.exitCode;
  record.stdoutTail = result.stdout.slice(-2400);
  record.stderrTail = result.stderr.slice(-2400);
  if (result.exitCode !== 0) {
    record.status = "failed-no-automatic-retry";
    state.status = `failed:${spec.fixtureId}`;
    state.finishedAt = new Date().toISOString();
    writeState();
    throw new Error(
      `Single playback failed for ${spec.fixtureId}; no retry was attempted. ${result.stderr.slice(-1200)}`
    );
  }
  record.status = "recorded-single-playback";
  writeState();
  process.stdout.write(
    `${JSON.stringify({ fixtureId: spec.fixtureId, captureDurationMs, status: record.status })}\n`
  );
}

state.status = "complete";
state.finishedAt = new Date().toISOString();
writeState();

function assertCleanPreflight() {
  const indexPath = path.resolve(EVIDENCE_ROOT, "aurora-web-preflight-index.json");
  if (!fs.existsSync(indexPath)) throw new Error("Clean Web preflight index is missing.");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const byFixture = new Map(index.results?.map((entry) => [entry.fixtureId, entry]) ?? []);
  for (const spec of specs) {
    const entry = byFixture.get(spec.fixtureId);
    if (
      !entry ||
      entry.playbackHookCalled !== false ||
      entry.diagnosticHarness !== false ||
      entry.state?.state !== "ready" ||
      entry.state?.hasStart !== false ||
      entry.state?.hasRenderAt !== false ||
      entry.state?.visibleFrameCount !== 1
    ) {
      throw new Error(`Clean static preflight is missing or invalid for ${spec.fixtureId}.`);
    }
  }
}

function assertTargetsAbsent(spec) {
  const proofRoot = path.resolve(EVIDENCE_ROOT, spec.slug, "aurora-web");
  const stem = `aurora-web-${spec.slug}-one-trigger-${TAG}`;
  for (const extension of ["mp4", "webm", "json"]) {
    const target = path.resolve(proofRoot, `${stem}${extension === "json" ? "-summary" : ""}.${extension}`);
    if (fs.existsSync(target)) {
      throw new Error(`Capture target already exists for ${spec.fixtureId}: ${target}`);
    }
  }
}

function assertAndClassifyPrestartFailure() {
  const resumeFixture = specs[0];
  const previous = [...state.captures]
    .reverse()
    .find((entry) => entry.fixtureId === resumeFixture?.fixtureId);
  if (!resumeFixture || !previous || previous.status !== "failed-no-automatic-retry") {
    throw new Error("Resume requires one recorded failed launcher entry for the selected fixture.");
  }
  const elapsedMs = Date.parse(previous.finishedAt) - Date.parse(previous.startedAt);
  const proofRoot = path.resolve(EVIDENCE_ROOT, resumeFixture.slug, "aurora-web");
  const stem = `aurora-web-${resumeFixture.slug}-one-trigger-${TAG}`;
  const mediaExists = [
    `${stem}.webm`,
    `${stem}.mp4`,
    `${stem}-summary.json`
  ].some((name) => fs.existsSync(path.resolve(proofRoot, name)));
  if (!(elapsedMs >= 0 && elapsedMs < 2100) || mediaExists) {
    throw new Error(
      "Cannot prove the failed launcher exited before the armed-stability window; playback resume is refused."
    );
  }
  previous.status = "launcher-failed-before-armed-no-playback";
  previous.playbackTriggerCount = 0;
  previous.prestartClassification = {
    elapsedMs,
    minimumArmedStabilityWindowMs: 15 * 150,
    mediaOrSummaryExists: false
  };
}

function writeState() {
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
  fs.writeFileSync(batchStatePath, `${JSON.stringify(state, null, 2)}\n`);
}

function runProcess(executable, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: REPO_ROOT,
      env,
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
