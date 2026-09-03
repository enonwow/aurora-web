import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";

import { installCaptureProcessGuard } from "./capture-process-lifecycle.mjs";
import {
  createDeterministicCapturePlan,
  resolveDeterministicCaptureTimeSeconds
} from "./vfx-deterministic-capture-plan.mjs";
import { assertVfxCaptureProofBundle } from "./vfx-capture-proof-gate.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const FIXTURE_ID = process.env.VFX_FIXTURE_ID ?? "vfx-nwn-web-row68";
const proofRootInput =
  process.env.VFX_PROOF_ROOT ??
  `backend/docs/aurora-reverse/evidence/${FIXTURE_ID}/web`;
const PROOF_ROOT = path.isAbsolute(proofRootInput)
  ? proofRootInput
  : path.resolve(REPO_ROOT, proofRootInput);
const BASE_URL = process.env.VFX_BASE_URL ?? "http://127.0.0.1:5188";
const CHROME_PATH =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FFMPEG_PATH =
  process.env.FFMPEG_PATH ??
  "C:\\Users\\enonw\\Documents\\Codex\\2026-05-17\\umiesz-tworzy-filmiki\\vendor\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe";
const CAPTURE_TAG = process.env.VFX_CAPTURE_TAG ?? "v11";
const CAPTURE_MODE = process.env.VFX_CAPTURE_MODE ?? "playback";
if (!new Set(["playback", "static-timeline"]).has(CAPTURE_MODE)) {
  throw new Error(`Unsupported VFX_CAPTURE_MODE: ${CAPTURE_MODE}`);
}
const FPS = Number(process.env.VFX_CAPTURE_FPS ?? 30);
const DURATION_MS = Number(process.env.VFX_CAPTURE_DURATION_MS ?? 8500);
const CAPTURE_PLAN = createDeterministicCapturePlan(DURATION_MS, FPS);
const FIXTURE_MANIFEST_PATH = path.join(
  REPO_ROOT,
  "frontend",
  "public",
  "dev-fixtures",
  FIXTURE_ID,
  "manifest.json"
);
const FIXTURE_MANIFEST = JSON.parse(fs.readFileSync(FIXTURE_MANIFEST_PATH, "utf8"));
const RUNTIME_DURATION_SECONDS = Number(FIXTURE_MANIFEST.runtime?.durationSeconds);
const MINIMUM_CAPTURE_DURATION_MS = Math.round((RUNTIME_DURATION_SECONDS + 4) * 1000);
const PORT = Number(process.env.VFX_CAPTURE_PORT ?? 9768);
const ARMED_WAIT_ATTEMPTS = Math.max(
  1,
  Math.trunc(Number(process.env.VFX_ARMED_WAIT_ATTEMPTS ?? 80) || 80)
);
const DIAGNOSTICS = process.env.VFX_DIAGNOSTICS ?? "0";
if (DIAGNOSTICS !== "0" && DIAGNOSTICS !== "1") {
  throw new Error(`Invalid VFX_DIAGNOSTICS value: ${DIAGNOSTICS}`);
}

const PROOF_SLUG = FIXTURE_ID.replace(/^vfx-(?:nwn-web|broad)-/u, "");
const FILE_STEM =
  CAPTURE_MODE === "static-timeline"
    ? `aurora-web-${PROOF_SLUG}-static-timeline-${CAPTURE_TAG}`
    : `aurora-web-${PROOF_SLUG}-one-trigger-${CAPTURE_TAG}`;
const MP4_PATH = path.join(PROOF_ROOT, `${FILE_STEM}.mp4`);
const WEBM_PATH = path.join(PROOF_ROOT, `${FILE_STEM}.webm`);
const SUMMARY_PATH = path.join(PROOF_ROOT, `${FILE_STEM}-summary.json`);
const ACTIVE_FRAME_PATH = path.join(PROOF_ROOT, `${FILE_STEM}-active.png`);
const FINAL_FRAME_PATH = path.join(PROOF_ROOT, `${FILE_STEM}-final-post.png`);
const routeCaptureMode = CAPTURE_MODE === "playback" ? "armed" : "static-timeline";
const ROUTE =
  `${BASE_URL}/dev/nwn-vfx-comparison?fixture=${FIXTURE_ID}` +
  `&capture=${routeCaptureMode}&diagnostics=${DIAGNOSTICS}`;

const immutableTargets = [
  MP4_PATH,
  WEBM_PATH,
  SUMMARY_PATH,
  ACTIVE_FRAME_PATH,
  FINAL_FRAME_PATH
];
if (immutableTargets.some((filePath) => fs.existsSync(filePath))) {
  throw new Error(
    `A Web proof artifact already exists for ${FIXTURE_ID}/${CAPTURE_TAG}. Reuse it instead of capturing again.`
  );
}
if (
  !(RUNTIME_DURATION_SECONDS > 0) ||
  !Number.isFinite(DURATION_MS) ||
  DURATION_MS < MINIMUM_CAPTURE_DURATION_MS
) {
  throw new Error(
    `Capture duration ${DURATION_MS}ms does not cover the required 2s pre-roll, ` +
      `${RUNTIME_DURATION_SECONDS}s runtime, and 2s post-roll for ${FIXTURE_ID}; ` +
      `use at least ${MINIMUM_CAPTURE_DURATION_MS}ms.`
  );
}
if (!fs.existsSync(CHROME_PATH)) throw new Error(`Chrome is missing: ${CHROME_PATH}`);
if (!fs.existsSync(FFMPEG_PATH)) throw new Error(`ffmpeg is missing: ${FFMPEG_PATH}`);
fs.mkdirSync(PROOF_ROOT, { recursive: true });
const STAGING_ROOT = fs.mkdtempSync(
  path.join(os.tmpdir(), `aurora-vfx-capture-${FIXTURE_ID}-${CAPTURE_TAG}-`)
);
const FRAME_DIR = path.join(STAGING_ROOT, "frames");
const PROFILE_DIR = path.join(STAGING_ROOT, "chrome-profile");
const STAGED_MP4_PATH = path.join(STAGING_ROOT, `${FILE_STEM}.mp4`);
const STAGED_WEBM_PATH = path.join(STAGING_ROOT, `${FILE_STEM}.webm`);
const STAGED_SUMMARY_PATH = path.join(STAGING_ROOT, `${FILE_STEM}-summary.json`);
const STAGED_ACTIVE_FRAME_PATH = path.join(STAGING_ROOT, `${FILE_STEM}-active.png`);
const STAGED_FINAL_FRAME_PATH = path.join(STAGING_ROOT, `${FILE_STEM}-final-post.png`);
fs.mkdirSync(FRAME_DIR, { recursive: true });

const chrome = spawn(
  CHROME_PATH,
  [
    "--headless=new",
    "--renderer-process-limit=2",
    "--disable-gpu",
    "--no-sandbox",
    "--noerrdialogs",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-component-extensions-with-background-pages",
    "--disable-background-timer-throttling",
    `--remote-debugging-port=${PORT}`,
    "--window-size=960,540",
    `--user-data-dir=${PROFILE_DIR}`,
    ROUTE
  ],
  { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
);
const chromeProcessGuard = installCaptureProcessGuard(chrome, {
  hardTimeoutMs: 120_000,
  label: `vfx-nwn-web:${FIXTURE_ID}`
});
let stderr = "";
let lastCaptureRunnerState = null;
chrome.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

try {
  const tab = await waitForTab(PORT, ROUTE);
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 0;
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(JSON.stringify(message.error)));
    else handler.resolve(message.result);
  };
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 960,
    height: 540,
    deviceScaleFactor: 1,
    mobile: false
  });
  await send("Page.bringToFront");
  const armed = await waitForCaptureRunner(send);
  if (!armed) {
    throw new Error(
      `Comparison runner did not reach its guarded capture state: ${JSON.stringify(
        lastCaptureRunnerState
      )}`
    );
  }
  const captureViewport = await readCanonicalCanvasViewport(send);
  const viewportAlignment = await alignCaptureViewportToCanvas(
    send,
    captureViewport
  );
  if (!viewportAlignment.canvasRectMatchesViewport) {
    throw new Error(
      `The CDP capture viewport does not match the canonical canvas: ${JSON.stringify(
        viewportAlignment
      )}`
    );
  }

  let playbackHookCalled = false;
  if (CAPTURE_MODE === "playback") {
    const started = await evaluateValue(
      send,
      `(() => {
        const start = window.__AURORA_VFX_PROOF_START__;
        return typeof start === 'function' && start();
      })()`
    );
    if (started !== true) throw new Error("The guarded playback hook did not start exactly once.");
    playbackHookCalled = true;
  } else if (armed.hasStart === true) {
    throw new Error("Static timeline capture unexpectedly exposed a playback start hook.");
  }

  let activeProofState = null;
  let activeProofElapsedSeconds = null;
  let lastRenderedProofState = null;
  let capturedFrameCount = 0;
  for (let frameIndex = 0; frameIndex < CAPTURE_PLAN.finalFrameIndex; frameIndex += 1) {
    const elapsedSeconds = resolveDeterministicCaptureTimeSeconds(frameIndex, CAPTURE_PLAN);
    const state = await renderCaptureAt(send, elapsedSeconds, activeProofState === null);
    if (!state?.ok) {
      throw new Error(`VFX render hook failed at frame ${frameIndex}: ${JSON.stringify(state)}`);
    }
    if (state.proof) lastRenderedProofState = state.proof;
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    const png = Buffer.from(screenshot.data, "base64");
    fs.writeFileSync(framePath(frameIndex), png);
    capturedFrameCount += 1;
    if (activeProofState === null && isAcceptedActiveProof(state.proof)) {
      activeProofState = state.proof;
      activeProofElapsedSeconds = elapsedSeconds;
      fs.writeFileSync(STAGED_ACTIVE_FRAME_PATH, png);
    }
  }

  const finalState = await renderCaptureAt(send, CAPTURE_PLAN.durationSeconds, true);
  if (!finalState?.ok) {
    throw new Error(`VFX final render hook failed: ${JSON.stringify(finalState)}`);
  }
  const finalScreenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  fs.writeFileSync(STAGED_FINAL_FRAME_PATH, Buffer.from(finalScreenshot.data, "base64"));
  capturedFrameCount += 1;

  const deterministicCapture = {
    mode: "deterministic-cdp-screenshot-sequence",
    fps: FPS,
    durationSeconds: CAPTURE_PLAN.durationSeconds,
    finalFrameIndex: CAPTURE_PLAN.finalFrameIndex,
    frameCount: capturedFrameCount,
    encodedFrameCount: CAPTURE_PLAN.finalFrameIndex,
    captureViewport,
    viewportAlignment
  };
  if (
    deterministicCapture.frameCount !== CAPTURE_PLAN.frameCount ||
    deterministicCapture.finalFrameIndex !== CAPTURE_PLAN.finalFrameIndex
  ) {
    throw new Error(
      `Deterministic Web frame plan was not completed: ${JSON.stringify({
        expected: CAPTURE_PLAN,
        actual: deterministicCapture
      })}`
    );
  }
  if (!activeProofState) {
    throw new Error(
      `No active VFX frame passed the runtime observability proof gate: ${JSON.stringify(
        lastRenderedProofState
      )}`
    );
  }
  assertVfxCaptureProofBundle(activeProofState, finalState.proof);
  if (
    finalState.dom?.state !== "ready" ||
    finalState.dom?.phase !== "post" ||
    finalState.dom?.drawParticles !== 0
  ) {
    throw new Error(`The final post frame is not clean: ${JSON.stringify(finalState.dom)}`);
  }

  const mp4 = await runProcess(FFMPEG_PATH, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-framerate",
    String(FPS),
    "-start_number",
    "0",
    "-i",
    path.join(FRAME_DIR, "frame-%06d.png"),
    "-frames:v",
    String(CAPTURE_PLAN.finalFrameIndex),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    STAGED_MP4_PATH
  ]);
  if (mp4.exitCode !== 0 || !isValidMediaFile(STAGED_MP4_PATH)) {
    throw new Error(`PNG sequence to MP4 conversion failed: ${mp4.stderr.slice(-2000)}`);
  }
  const webm = await runProcess(FFMPEG_PATH, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    STAGED_MP4_PATH,
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "4M",
    "-pix_fmt",
    "yuv420p",
    STAGED_WEBM_PATH
  ]);
  if (webm.exitCode !== 0 || !isValidMediaFile(STAGED_WEBM_PATH)) {
    throw new Error(`MP4 to WebM conversion failed: ${webm.stderr.slice(-2000)}`);
  }

  const finalPlayback = finalState.proof.runtimeObservability.playbackGuard;
  const summary = {
    version: "aurora-vfx-web-deterministic-cdp-proof/v2",
    generatedAt: new Date().toISOString(),
    fixtureId: FIXTURE_ID,
    status:
      CAPTURE_MODE === "playback"
        ? "recorded-single-deterministic-playback"
        : "recorded-deterministic-static-timeline-no-playback",
    captureMode: CAPTURE_MODE,
    triggerCount: finalPlayback.triggerCount,
    loop: finalPlayback.loop,
    captureArmedBeforePlayback: CAPTURE_MODE === "playback",
    playbackHookCalled,
    diagnosticHarness: DIAGNOSTICS === "1",
    route: ROUTE,
    durationMs: DURATION_MS,
    requestedFps: FPS,
    deterministicCapture,
    mp4DeterministicCapture: true,
    mp4DurationMs: DURATION_MS,
    mp4FrameCount: CAPTURE_PLAN.finalFrameIndex,
    mp4Fps: FPS,
    activeProofElapsedSeconds,
    activeProofState,
    finalProofState: finalState.proof,
    proofState: finalState.proof,
    domState: finalState.dom,
    activeFrame: mediaRecord(STAGED_ACTIVE_FRAME_PATH, ACTIVE_FRAME_PATH),
    finalFrame: mediaRecord(STAGED_FINAL_FRAME_PATH, FINAL_FRAME_PATH),
    webm: mediaRecord(STAGED_WEBM_PATH, WEBM_PATH),
    mp4: mediaRecord(STAGED_MP4_PATH, MP4_PATH),
    chromeStderrTail: stderr.slice(-1200)
  };
  fs.writeFileSync(STAGED_SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`);
  publishCaptureArtifacts([
    [STAGED_ACTIVE_FRAME_PATH, ACTIVE_FRAME_PATH],
    [STAGED_FINAL_FRAME_PATH, FINAL_FRAME_PATH],
    [STAGED_WEBM_PATH, WEBM_PATH],
    [STAGED_MP4_PATH, MP4_PATH],
    [STAGED_SUMMARY_PATH, SUMMARY_PATH]
  ]);
  console.log(JSON.stringify({ ...summary, summary: SUMMARY_PATH }, null, 2));
  ws.close();
} finally {
  await chromeProcessGuard.terminate();
  fs.rmSync(STAGING_ROOT, { recursive: true, force: true });
}

function framePath(frameIndex) {
  return path.join(FRAME_DIR, `frame-${String(frameIndex).padStart(6, "0")}.png`);
}

function isAcceptedActiveProof(proofState) {
  const observability = proofState?.runtimeObservability;
  return (
    observability?.version === "aurora-vfx-runtime-observability/v1" &&
    observability.proofGate?.status === "pass" &&
    (observability.proofGate?.blockerManifest?.length ?? 0) === 0 &&
    observability.playbackGuard?.status === "pass" &&
    observability.playbackGuard.triggerCount === 1 &&
    observability.playbackGuard.loop === false &&
    observability.playbackGuard.overlapCount === 0
  );
}

async function renderCaptureAt(send, elapsedSeconds, includeProof) {
  return evaluateValue(
    send,
    `(() => {
      const runner = document.querySelector('[data-testid="nwn-vfx-comparison-runner"]');
      const renderAt = window.__AURORA_VFX_PROOF_RENDER_AT__;
      if (!runner || typeof renderAt !== 'function') {
        return { ok: false, issue: 'runner_or_render_hook_missing' };
      }
      const rendered = renderAt(${JSON.stringify(elapsedSeconds)});
      return {
        ok: rendered !== null,
        proof: ${includeProof ? "window.__AURORA_VFX_PROOF__ ?? null" : "null"},
        dom: {
          fixtureId: runner.getAttribute('data-fixture-id'),
          state: runner.getAttribute('data-render-state'),
          phase: runner.getAttribute('data-phase'),
          frameIndex: Number(runner.getAttribute('data-frame-index') || 0),
          frameCount: Number(runner.getAttribute('data-frame-count') || 0),
          drawParticles: Number(runner.getAttribute('data-draw-particles') || 0),
          oneTrigger: runner.getAttribute('data-one-trigger'),
          loop: runner.getAttribute('data-loop')
        }
      };
    })()`
  );
}

async function evaluateValue(send, expression) {
  const response = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression
  });
  if (response.exceptionDetails) {
    throw new Error(`Runtime evaluation failed: ${JSON.stringify(response.exceptionDetails)}`);
  }
  return response.result.value;
}

function mediaRecord(filePath, publishedPath = filePath) {
  return {
    path: publishedPath,
    sizeBytes: fs.statSync(filePath).size,
    sha256: createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
  };
}

function publishCaptureArtifacts(records) {
  for (const [, targetPath] of records) {
    if (fs.existsSync(targetPath)) {
      throw new Error(`Refusing to overwrite immutable Web proof artifact: ${targetPath}`);
    }
  }
  for (const [sourcePath, targetPath] of records) {
    fs.copyFileSync(sourcePath, targetPath, fs.constants.COPYFILE_EXCL);
  }
}

function isValidMediaFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 4096;
}

async function readCanonicalCanvasViewport(send) {
  const viewport = await evaluateValue(
    send,
    `(() => {
      const runner = document.querySelector('[data-testid="nwn-vfx-comparison-runner"]');
      const canvas = runner?.querySelector('canvas');
      return canvas ? { width: canvas.width, height: canvas.height } : null;
    })()`
  );
  if (
    !Number.isInteger(viewport?.width) ||
    viewport.width <= 0 ||
    !Number.isInteger(viewport?.height) ||
    viewport.height <= 0
  ) {
    throw new Error(`Canonical VFX canvas viewport is invalid: ${JSON.stringify(viewport)}`);
  }
  return viewport;
}

async function alignCaptureViewportToCanvas(send, captureViewport) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: captureViewport.width,
    height: captureViewport.height,
    deviceScaleFactor: 1,
    mobile: false
  });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const aligned = await evaluateValue(
      send,
      `(() => {
        const runner = document.querySelector('[data-testid="nwn-vfx-comparison-runner"]');
        const canvas = runner?.querySelector('canvas');
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const canvasRectMatchesViewport =
          Math.abs(rect.x) < 0.01 &&
          Math.abs(rect.y) < 0.01 &&
          Math.abs(rect.width - window.innerWidth) < 0.01 &&
          Math.abs(rect.height - window.innerHeight) < 0.01 &&
          window.innerWidth === canvas.width &&
          window.innerHeight === canvas.height;
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          canvasRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          canvasRectMatchesViewport
        };
      })()`
    );
    if (aligned?.canvasRectMatchesViewport === true) return aligned;
    await sleep(50);
  }
  return {
    viewportWidth: 0,
    viewportHeight: 0,
    canvasWidth: captureViewport.width,
    canvasHeight: captureViewport.height,
    canvasRect: null,
    canvasRectMatchesViewport: false
  };
}

async function waitForCaptureRunner(send) {
  let consecutiveReadyReads = 0;
  let stableState = null;
  const expectedMessage =
    CAPTURE_MODE === "playback" ? "armed" : "static-timeline-armed";
  for (let attempt = 0; attempt < ARMED_WAIT_ATTEMPTS; attempt += 1) {
    const state = await evaluateValue(
      send,
      `(() => {
        const runner = document.querySelector('[data-testid="nwn-vfx-comparison-runner"]');
        return runner ? {
          fixtureId: runner.getAttribute('data-fixture-id'),
          state: runner.getAttribute('data-render-state'),
          message: runner.getAttribute('data-message'),
          hasStart: typeof window.__AURORA_VFX_PROOF_START__ === 'function',
          hasRenderAt: typeof window.__AURORA_VFX_PROOF_RENDER_AT__ === 'function'
        } : null;
      })()`
    );
    lastCaptureRunnerState = state;
    const hookContractAccepted =
      CAPTURE_MODE === "playback" ? state?.hasStart === true : state?.hasStart === false;
    if (
      state?.fixtureId === FIXTURE_ID &&
      state.state === "ready" &&
      state.message === expectedMessage &&
      hookContractAccepted &&
      state.hasRenderAt === true
    ) {
      consecutiveReadyReads += 1;
      stableState = state;
      if (consecutiveReadyReads >= 15) return stableState;
    } else {
      consecutiveReadyReads = 0;
      stableState = null;
    }
    await sleep(150);
  }
  return null;
}

async function waitForTab(port, route) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      const tabs = await response.json();
      const tab = tabs.find((entry) => entry.type === "page" && entry.url.startsWith(route));
      if (tab) return tab;
    } catch {
      // Chrome is still starting.
    }
    await sleep(150);
  }
  throw new Error(`Chrome tab did not appear for ${route}`);
}

function runProcess(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("exit", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}

function onceExit(process) {
  return new Promise((resolve) => {
    if (process.exitCode !== null) resolve(process.exitCode);
    else process.once("exit", resolve);
  });
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
