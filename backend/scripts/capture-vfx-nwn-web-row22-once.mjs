import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";

import { installCaptureProcessGuard } from "./capture-process-lifecycle.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const PROOF_ROOT = path.join(
  REPO_ROOT,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/web"
);
const BASE_URL = process.env.VFX_BASE_URL ?? "http://127.0.0.1:5188";
const CHROME_PATH =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FFMPEG_PATH =
  process.env.FFMPEG_PATH ??
  "C:\\Users\\enonw\\Documents\\Codex\\2026-05-17\\umiesz-tworzy-filmiki\\vendor\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe";
const FIXTURE_ID = "vfx-nwn-web-row22";
const PROOF_VERSION = process.env.VFX_PROOF_VERSION ?? "v11";
if (!/^v\d+[a-z0-9-]*$/i.test(PROOF_VERSION)) {
  throw new Error(`Invalid VFX_PROOF_VERSION: ${PROOF_VERSION}`);
}
const FPS = 12;
const DURATION_MS = 15500;
const PORT = 9722;
const MP4_PATH = path.join(PROOF_ROOT, `web-row22-one-trigger-${PROOF_VERSION}.mp4`);
const WEBM_PATH = path.join(PROOF_ROOT, `web-row22-one-trigger-${PROOF_VERSION}.webm`);
const SUMMARY_PATH = path.join(
  PROOF_ROOT,
  `web-row22-one-trigger-${PROOF_VERSION}-summary.json`
);
const PROFILE_DIR = path.join(
  PROOF_ROOT,
  `web-row22-one-trigger-${PROOF_VERSION}.chrome-profile`
);
const FRAME_DIR = path.join(
  PROOF_ROOT,
  `web-row22-one-trigger-${PROOF_VERSION}.frames`
);
const ROUTE = `${BASE_URL}/dev/nwn-vfx-comparison?fixture=${FIXTURE_ID}&capture=armed`;

if (fs.existsSync(MP4_PATH) || fs.existsSync(WEBM_PATH)) {
  throw new Error(
    `A Web recording already exists for ${FIXTURE_ID}. Reuse it instead of starting playback again.`
  );
}
if (!fs.existsSync(CHROME_PATH)) throw new Error(`Chrome is missing: ${CHROME_PATH}`);
if (!fs.existsSync(FFMPEG_PATH)) throw new Error(`ffmpeg is missing: ${FFMPEG_PATH}`);
fs.mkdirSync(PROOF_ROOT, { recursive: true });
fs.rmSync(PROFILE_DIR, { recursive: true, force: true });

const chrome = spawn(
  CHROME_PATH,
  [
    "--headless=new",
    "--renderer-process-limit=2",
    "--disable-gpu",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--no-sandbox",
    "--noerrdialogs",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`,
    "--window-size=960,540",
    `--user-data-dir=${PROFILE_DIR}`,
    ROUTE
  ],
  { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
);
const chromeProcessGuard = installCaptureProcessGuard(chrome, {
  hardTimeoutMs: 120_000,
  label: "vfx-nwn-web-row22"
});
let stderr = "";
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
  const armed = await waitForArmedRunner(send);
  if (!armed) throw new Error("Comparison runner did not reach armed state.");

  const startResult = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const runner = document.querySelector('[data-testid="nwn-vfx-comparison-runner"]');
      const canvas = runner?.querySelector('canvas');
      const start = window.__AURORA_VFX_PROOF_START__;
      const renderAt = window.__AURORA_VFX_PROOF_RENDER_AT__;
      const preflightProof = window.__AURORA_VFX_PROOF__;
      const proofGate = preflightProof?.runtimeObservability?.proofGate;
      const materialLighting = preflightProof?.renderDebug?.proofScene?.materialLighting;
      if (!canvas || typeof start !== 'function' || typeof renderAt !== 'function') {
        return { ok: false, issue: 'armed_canvas_start_or_render_step_missing' };
      }
      if (proofGate?.status !== 'pass' || proofGate.blockerManifest?.length !== 0) {
        return {
          ok: false,
          issue: 'armed_runtime_proof_gate_failed',
          proofGate: proofGate ?? null
        };
      }
      if (
        materialLighting?.visibleMaterialCount > 0 &&
        (
          materialLighting.installedCount !== materialLighting.visibleMaterialCount ||
          materialLighting.blockerManifest?.length !== 0
        )
      ) {
        return {
          ok: false,
          issue: 'armed_proof_scene_material_lighting_failed',
          materialLighting
        };
      }
      const started = start();
      if (started !== true) {
        return {
          ok: false,
          issue: 'runner_mount_changed_before_start',
          started,
          runnerConnected: runner.isConnected,
          renderState: runner.getAttribute('data-render-state'),
          message: runner.getAttribute('data-message')
        };
      }
      const initialState = renderAt(0);
      if (!initialState) {
        return {
          ok: false,
          issue: 'armed_runner_rejected_baseline_frame',
          started,
          runnerConnected: runner.isConnected,
          renderState: runner.getAttribute('data-render-state'),
          message: runner.getAttribute('data-message'),
          hasRenderAtAfterStart: typeof window.__AURORA_VFX_PROOF_RENDER_AT__ === 'function'
        };
      }
      return {
        ok: true,
        started,
        width: Number(canvas.width) || 0,
        height: Number(canvas.height) || 0
      };
    })()`
  });
  const startValue = startResult.result.value;
  if (!startValue?.ok || startValue.started !== true) {
    throw new Error(`Deterministic Web recording failed to start: ${JSON.stringify(startValue)}`);
  }
  fs.rmSync(FRAME_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAME_DIR, { recursive: true });
  const outputFrameCount = Math.round((DURATION_MS / 1000) * FPS) + 1;
  for (let frameIndex = 0; frameIndex < outputFrameCount; frameIndex += 1) {
    const elapsedSeconds = Math.min(DURATION_MS / 1000, frameIndex / FPS);
    const frameResult = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const renderAt = window.__AURORA_VFX_PROOF_RENDER_AT__;
        const canvas = document.querySelector(
          '[data-testid="nwn-vfx-comparison-runner"] canvas'
        );
        if (typeof renderAt !== 'function' || !canvas) {
          return { ok: false, issue: 'render_step_or_canvas_missing' };
        }
        const status = renderAt(${elapsedSeconds});
        const dataUrl = canvas.toDataURL('image/png');
        return {
          ok: Boolean(status),
          dataUrl,
          frameIndex: status?.frameIndex ?? null,
          phase: status?.phase ?? ''
        };
      })()`
    });
    const frameValue = frameResult.result.value;
    if (!frameValue?.ok || !String(frameValue.dataUrl ?? "").startsWith("data:image/png;base64,")) {
      throw new Error(
        `Deterministic Web frame ${frameIndex} failed: ${JSON.stringify(frameValue)}`
      );
    }
    fs.writeFileSync(
      path.join(FRAME_DIR, `frame-${String(frameIndex).padStart(4, "0")}.png`),
      Buffer.from(frameValue.dataUrl.split(",", 2)[1], "base64")
    );
  }
  const stateResult = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      const runner = document.querySelector('[data-testid="nwn-vfx-comparison-runner"]');
      return {
        proof: window.__AURORA_VFX_PROOF__ ?? null,
        dom: {
          fixtureId: runner?.getAttribute('data-fixture-id') ?? '',
          state: runner?.getAttribute('data-render-state') ?? '',
          phase: runner?.getAttribute('data-phase') ?? '',
          frameIndex: Number(runner?.getAttribute('data-frame-index') || 0),
          frameCount: Number(runner?.getAttribute('data-frame-count') || 0),
          drawParticles: Number(runner?.getAttribute('data-draw-particles') || 0),
          renderedChunkModels: Number(runner?.getAttribute('data-rendered-chunk-models') || 0),
          boundChunkMaterialCount: Number(
            runner?.getAttribute('data-bound-chunk-material-count') || 0
          ),
          sourceLightCount: Number(runner?.getAttribute('data-source-light-count') || 0),
          sourceLightColor: runner?.getAttribute('data-source-light-color') || '',
          sourceLightRadius: Number(runner?.getAttribute('data-source-light-radius') || 0),
          sourceLightIntensity: Number(
            runner?.getAttribute('data-source-light-intensity') || 0
          ),
          collisionProfile: runner?.getAttribute('data-collision-profile') || '',
          collisionQueryCount: Number(
            runner?.getAttribute('data-collision-query-count') || 0
          ),
          collisionHitCount: Number(runner?.getAttribute('data-collision-hit-count') || 0),
          collisionAppliedHitCount: Number(
            runner?.getAttribute('data-collision-applied-hit-count') || 0
          ),
          collisionStaticNoHitCount: Number(
            runner?.getAttribute('data-collision-static-no-hit-count') || 0
          ),
          collisionLandedParticleCount: Number(
            runner?.getAttribute('data-collision-landed-particle-count') || 0
          ),
          oneTrigger: runner?.getAttribute('data-one-trigger') || '',
          loop: runner?.getAttribute('data-loop') || ''
        }
      };
    })()`
  });
  const value = stateResult.result.value;
  const ffmpeg = await runProcess(FFMPEG_PATH, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-framerate",
    String(FPS),
    "-start_number",
    "0",
    "-i",
    path.join(FRAME_DIR, "frame-%04d.png"),
    "-c:v",
    "libx264",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    MP4_PATH
  ]);
  if (ffmpeg.exitCode !== 0 || !fs.existsSync(MP4_PATH) || fs.statSync(MP4_PATH).size <= 4096) {
    throw new Error(`WebM to MP4 conversion failed: ${ffmpeg.stderr.slice(-2000)}`);
  }
  const summary = {
    version: `aurora-vfx-web-one-trigger-proof/${PROOF_VERSION}`,
    generatedAt: new Date().toISOString(),
    fixtureId: FIXTURE_ID,
    status: "recorded-single-continuous-playback",
    triggerCount: 1,
    loop: false,
    captureArmedBeforePlayback: true,
    diagnosticHarness: false,
    route: ROUTE,
    durationMs: DURATION_MS,
    requestedFps: FPS,
    captureMode: "deterministic-monotonic-renderAt-png-sequence",
    capturedFrameCount: outputFrameCount,
    sourceCanvas: {
      width: startValue.width,
      height: startValue.height
    },
    mp4: mediaRecord(MP4_PATH),
    proofState: value.proof,
    domState: value.dom,
    chromeStderrTail: stderr.slice(-1200)
  };
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
  console.log(
    JSON.stringify(
      {
        version: summary.version,
        generatedAt: summary.generatedAt,
        fixtureId: summary.fixtureId,
        status: summary.status,
        triggerCount: summary.triggerCount,
        loop: summary.loop,
        captureMode: summary.captureMode,
        capturedFrameCount: summary.capturedFrameCount,
        sourceCanvas: summary.sourceCanvas,
        mp4: summary.mp4,
        finalStatus: value.proof?.status ?? null,
        summary: SUMMARY_PATH
      },
      null,
      2
    )
  );
  fs.rmSync(FRAME_DIR, { recursive: true, force: true });
  ws.close();
} finally {
  await chromeProcessGuard.terminate();
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
}

function mediaRecord(filePath) {
  return {
    path: filePath,
    sizeBytes: fs.statSync(filePath).size,
    sha256: createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
  };
}

async function waitForArmedRunner(send) {
  let consecutiveReadyReads = 0;
  let stableState = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const runner = document.querySelector('[data-testid="nwn-vfx-comparison-runner"]');
        return runner ? {
          fixtureId: runner.getAttribute('data-fixture-id'),
          state: runner.getAttribute('data-render-state'),
          message: runner.getAttribute('data-message'),
          hasStart: typeof window.__AURORA_VFX_PROOF_START__ === 'function',
          hasRenderAt: typeof window.__AURORA_VFX_PROOF_RENDER_AT__ === 'function'
        } : null;
      })()`
    });
    const state = response.result.value;
    if (
      state?.fixtureId === FIXTURE_ID &&
      state.state === "ready" &&
      state.message === "armed" &&
      state.hasStart === true &&
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
    const process = spawn(executable, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    process.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    process.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    process.on("error", reject);
    process.on("exit", (exitCode) => resolve({ exitCode, stdout, stderr }));
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
