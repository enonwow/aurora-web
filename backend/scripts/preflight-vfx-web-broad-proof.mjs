import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { assertVfxStaticPreflightObservability } from "./vfx-capture-proof-gate.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const BASE_URL = process.env.VFX_BASE_URL ?? "http://127.0.0.1:5188";
const CHROME_PATH =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EVIDENCE_ROOT = path.resolve(
  REPO_ROOT,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16"
);
const BASE_PORT = Number(process.env.VFX_PREFLIGHT_PORT ?? 9780);
const PREFLIGHT_TAG = (process.env.VFX_PREFLIGHT_TAG ?? "")
  .trim()
  .replace(/[^a-zA-Z0-9._-]+/g, "-");
const PREFLIGHT_SUFFIX = PREFLIGHT_TAG ? `-${PREFLIGHT_TAG}` : "";
const requestedFixtureIds = new Set(
  (process.env.VFX_PREFLIGHT_FIXTURES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const specs = [
  { slug: "row68", fixtureId: "vfx-nwn-web-row68", timeSeconds: 1 },
  { slug: "row22", fixtureId: "vfx-nwn-web-row22", timeSeconds: 1 },
  { slug: "row44", fixtureId: "vfx-broad-row44", timeSeconds: 1 },
  { slug: "row50", fixtureId: "vfx-broad-row50", timeSeconds: 1 },
  { slug: "row210", fixtureId: "vfx-broad-row210", timeSeconds: 2 },
  { slug: "row216", fixtureId: "vfx-broad-row216", timeSeconds: 2 },
  { slug: "row181", fixtureId: "vfx-broad-row181", timeSeconds: 0.6 },
  { slug: "row1", fixtureId: "vfx-broad-row1", timeSeconds: 2 },
  { slug: "aoe0", fixtureId: "vfx-broad-aoe0", timeSeconds: 2 }
].filter(
  (spec) => requestedFixtureIds.size === 0 || requestedFixtureIds.has(spec.fixtureId)
);

if (!fs.existsSync(CHROME_PATH)) throw new Error(`Chrome is missing: ${CHROME_PATH}`);

const results = [];
for (const [index, spec] of specs.entries()) {
  const proofRoot = path.resolve(EVIDENCE_ROOT, spec.slug, "aurora-web", "preflight");
  const profileDir = path.resolve(proofRoot, ".chrome-profile");
  if (!proofRoot.startsWith(EVIDENCE_ROOT + path.sep)) {
    throw new Error(`Unsafe preflight proof root: ${proofRoot}`);
  }
  fs.mkdirSync(proofRoot, { recursive: true });
  fs.rmSync(profileDir, { recursive: true, force: true });
  const route = `${BASE_URL}/dev/nwn-vfx-comparison?fixture=${spec.fixtureId}&time=${spec.timeSeconds}&diagnostics=0`;
  const port = BASE_PORT + index;
  const chrome = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--noerrdialogs",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-component-extensions-with-background-pages",
      `--remote-debugging-port=${port}`,
      "--window-size=960,540",
      `--user-data-dir=${profileDir}`,
      route
    ],
    { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
  );
  let stderr = "";
  chrome.stderr.on("data", (chunk) => (stderr += chunk.toString()));
  try {
    const tab = await waitForTab(port, route);
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
    const state = await waitForStaticFrame(send, spec.fixtureId);
    if (!state || state.state !== "ready" || state.phase !== "effect") {
      throw new Error(`Static frame did not become ready: ${JSON.stringify(state)}`);
    }
    if (state.hasStart || state.hasRenderAt) {
      throw new Error(`Static preflight unexpectedly exposed playback hooks for ${spec.fixtureId}.`);
    }
    assertVfxStaticPreflightObservability(state.runtimeObservability);
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    const diagnosticSuffix = "";
    const pngPath = path.resolve(
      proofRoot,
      `${spec.fixtureId}-time-${spec.timeSeconds}${diagnosticSuffix}${PREFLIGHT_SUFFIX}.png`
    );
    fs.writeFileSync(pngPath, Buffer.from(screenshot.data, "base64"));
    const record = {
      version: "aurora-vfx-web-static-preflight/v1",
      fixtureId: spec.fixtureId,
      route,
      fixedTimeSeconds: spec.timeSeconds,
      playbackHookCalled: false,
      diagnosticHarness: false,
      state,
      pngPath,
      pngSizeBytes: fs.statSync(pngPath).size,
      chromeStderrTail: stderr.slice(-800)
    };
    fs.writeFileSync(
      path.resolve(
        proofRoot,
        `${spec.fixtureId}${diagnosticSuffix}-preflight${PREFLIGHT_SUFFIX}.json`
      ),
      `${JSON.stringify(record, null, 2)}\n`
    );
    results.push(record);
    process.stdout.write(`${JSON.stringify({ fixtureId: spec.fixtureId, state, pngPath })}\n`);
    ws.close();
  } finally {
    chrome.kill("SIGTERM");
    await Promise.race([onceExit(chrome), sleep(3000)]);
    if (chrome.exitCode === null) chrome.kill("SIGKILL");
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
}

fs.writeFileSync(
  path.resolve(EVIDENCE_ROOT, `aurora-web-preflight-index${PREFLIGHT_SUFFIX}.json`),
  `${JSON.stringify({ version: "aurora-vfx-web-static-preflight-index/v1", results }, null, 2)}\n`
);

async function waitForStaticFrame(send, fixtureId) {
  let lastState = null;
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const response = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const runner = document.querySelector('[data-testid="nwn-vfx-comparison-runner"]');
        return runner ? {
          fixtureId: runner.getAttribute('data-fixture-id'),
          state: runner.getAttribute('data-render-state'),
          phase: runner.getAttribute('data-phase'),
          message: runner.getAttribute('data-message'),
          frameIndex: Number(runner.getAttribute('data-frame-index') || 0),
          frameCount: Number(runner.getAttribute('data-frame-count') || 0),
          drawParticles: Number(runner.getAttribute('data-draw-particles') || 0),
          visibleFrameCount: Number(runner.getAttribute('data-visible-frame-count') || 0),
          sourceLightCount: Number(runner.getAttribute('data-source-light-count') || 0),
          oneTrigger: runner.getAttribute('data-one-trigger'),
          loop: runner.getAttribute('data-loop'),
          hasStart: typeof window.__AURORA_VFX_PROOF_START__ === 'function',
          hasRenderAt: typeof window.__AURORA_VFX_PROOF_RENDER_AT__ === 'function',
          runtimeObservability: (() => {
            const observability = window.__AURORA_VFX_PROOF__?.runtimeObservability;
            return observability ? {
              version: observability.version,
              identity: observability.identity,
              identityStatus: observability.identity?.status,
              hostGraphStatus: observability.hostGraph?.status,
              assetSettlementStatus: observability.assetSettlement?.status,
              drawLedgerStatus: observability.drawLedger?.status,
              particleShaderLedgerStatus: observability.particleShaderLedger?.status,
              playbackGuard: observability.playbackGuard,
              proofGate: observability.proofGate
            } : null;
          })(),
          renderDebug: window.__AURORA_VFX_PROOF__?.renderDebug ?? null
        } : null;
      })()`
    });
    lastState = response.result.value;
    if (
      lastState?.fixtureId === fixtureId &&
      lastState.state === "ready" &&
      lastState.message === "rendered" &&
      lastState.frameCount > 1 &&
      lastState.visibleFrameCount === 1
    ) {
      return lastState;
    }
    if (lastState?.state === "error") return lastState;
    await sleep(200);
  }
  return lastState;
}

async function waitForTab(port, route) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
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

function onceExit(process) {
  return new Promise((resolve) => {
    if (process.exitCode !== null) resolve(process.exitCode);
    else process.once("exit", resolve);
  });
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
