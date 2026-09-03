import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";

const DEFAULT_CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_BASE_URL = "http://127.0.0.1:5173";
const DEFAULT_ROUTE_PATH = "/aurora-evidence/placeable-emitter-overlay-proof.html";
const DEFAULT_OUT_DIR =
  "frontend/public/aurora-evidence/placeable-emitter-overlay-proof-2026-07-06";

const options = parseArgs(process.argv.slice(2));
const outDir = path.resolve(options.outDir ?? DEFAULT_OUT_DIR);
const chromePath = options.chromePath ?? process.env.CHROME_PATH ?? DEFAULT_CHROME_PATH;
const baseUrl = options.baseUrl ?? process.env.PLACEABLE_EMITTER_PROOF_BASE_URL ?? DEFAULT_BASE_URL;
const routePath = options.route ?? DEFAULT_ROUTE_PATH;
const route = new URL(routePath, baseUrl).toString();
const port = Number(options.port ?? 9700 + Math.floor(Math.random() * 400));
const fileStem = sanitizeFileStem(options.name ?? "placeable-emitter-overlay-proof");
const profileDir = path.join(outDir, `${fileStem}.chrome-profile`);
const keepProfile = options.keepProfile === "true";
const waitAttempts = Number(options.waitAttempts ?? 240);
const pngPath = path.join(outDir, `${fileStem}.png`);
const videoPath = path.join(outDir, `${fileStem}.webm`);
const framePath = path.join(outDir, `${fileStem}.frame.json`);

fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const chrome = spawn(
  chromePath,
  [
  "--headless=new",
  "--renderer-process-limit=2",
    "--no-sandbox",
    "--ignore-gpu-blocklist",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    `--remote-debugging-port=${port}`,
    "--window-size=960,540",
    `--user-data-dir=${profileDir}`,
    route
  ],
  { stdio: ["ignore", "pipe", "pipe"] }
);

let chromeStderr = "";
chrome.stderr.on("data", (chunk) => {
  chromeStderr += chunk.toString();
});

try {
  const result = await captureFromChrome({
    port,
    route,
    pngPath,
    videoPath,
    framePath,
    waitAttempts
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  chrome.kill("SIGTERM");
  await onceProcessExits(chrome, 5000);
  if (!keepProfile) {
    removeProfileDirBestEffort(profileDir);
  }
}

async function captureFromChrome({
  port,
  route,
  pngPath,
  videoPath,
  framePath,
  waitAttempts
}) {
  const tab = await waitForTab(port);
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let messageId = 0;
  const pending = new Map();
  const runtimeEvents = [];

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") {
      runtimeEvents.push({
        method: message.method,
        params: message.params
      });
    } else if (message.method === "Runtime.consoleAPICalled") {
      runtimeEvents.push({
        method: message.method,
        params: {
          type: message.params?.type,
          args: message.params?.args?.map((arg) => ({
            type: arg.type,
            value: arg.value,
            description: arg.description
          }))
        }
      });
    }
    if (!message.id || !pending.has(message.id)) {
      return;
    }
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      handlers.reject(new Error(JSON.stringify(message.error)));
    } else {
      handlers.resolve(message.result);
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++messageId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: route });

  const domStatus = await waitForPlaceableEmitterProofStatus(send, waitAttempts);
  if (!domStatus?.ok) {
    throw new Error(
      `Placeable emitter overlay proof did not reach recorded runtime-ready state: ${JSON.stringify(
        {
          domStatus,
          runtimeEvents: runtimeEvents.slice(-20)
        }
      )}`
    );
  }

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  fs.writeFileSync(pngPath, Buffer.from(screenshot.data, "base64"));

  const videoData = await readRecordedVideoData(send);
  const encodedVideo = parseDataUrlPayload(videoData.videoDataUrl);
  fs.writeFileSync(videoPath, Buffer.from(encodedVideo.base64, "base64"));

  const frame = {
    version: "aurora-placeable-emitter-overlay-cdp-capture/v1",
    capturedAt: new Date().toISOString(),
    requestedRoute: route,
    finalRoute: domStatus.href,
    screenshotPath: pngPath,
    screenshotBytes: fs.statSync(pngPath).size,
    videoPath,
    videoBytes: fs.statSync(videoPath).size,
    videoMimeType: encodedVideo.mimeType,
    framePath,
    domStatus,
    runtimeEvents: runtimeEvents.slice(-20),
    captureMethod:
      "Chrome DevTools Protocol Page.captureScreenshot plus browser canvas MediaRecorder WebM",
    ordinaryPlaceableProof: {
      placeableSubtype: "generic",
      renderIsVfx: false,
      sourceMdlEmitterPreviewStatus: domStatus.sourceMdlEmitterPreviewStatus,
      sourceMdlEmitterPreviewTextureStatus: domStatus.sourceMdlEmitterPreviewTextureStatus,
      auroraEmitterNode: domStatus.auroraEmitterNode,
      auroraEmitterBlendMode: domStatus.auroraEmitterBlendMode,
      cameraBillboardParticles: domStatus.cameraBillboardParticles
    },
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    chromeStderrTail: chromeStderr.slice(-1200)
  };
  fs.writeFileSync(framePath, `${JSON.stringify(frame, null, 2)}\n`);
  ws.close();
  return frame;
}

async function waitForPlaceableEmitterProofStatus(send, waitAttempts) {
  let lastStatus = null;
  for (let attempt = 0; attempt < waitAttempts; attempt += 1) {
    const result = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const stage = document.querySelector('[data-testid="placeable-emitter-overlay-proof"]');
        const proof = window.__PLACEABLE_EMITTER_OVERLAY_PROOF__ ?? {};
        const sourceMdlEmitterPreviewStatus = stage?.dataset?.sourceMdlEmitterPreviewStatus ?? "";
        const sourceMdlEmitterPreviewTextureStatus =
          stage?.dataset?.sourceMdlEmitterPreviewTextureStatus ?? "";
        const cameraBillboardParticles = Number(stage?.dataset?.cameraBillboardParticles ?? 0);
        const videoReady = stage?.dataset?.videoReady === "true" || proof.videoReady === true;
        const status = {
          href: window.location.href,
          readyState: document.readyState,
          hasStage: Boolean(stage),
          proofStatus: stage?.dataset?.proofStatus ?? "",
          sourceMdlEmitterPreviewStatus,
          sourceMdlEmitterPreviewTextureStatus,
          auroraEmitterNode: stage?.dataset?.auroraEmitterNode ?? "",
          auroraEmitterBlendMode: stage?.dataset?.auroraEmitterBlendMode ?? "",
          cameraBillboardParticles,
          videoReady,
          videoBytes: Number(proof.videoBytes ?? 0),
          videoMimeType: String(proof.videoMimeType ?? ""),
          proofRuntimeStatus: String(proof.status ?? ""),
          frameCount: Number(proof.frameCount ?? 0),
          lastStatus: proof.lastStatus ?? null,
          hasViteErrorOverlay: Boolean(document.querySelector("vite-error-overlay"))
        };
        status.ok =
          status.hasStage &&
          status.proofStatus === "ready" &&
          sourceMdlEmitterPreviewStatus === "active" &&
          sourceMdlEmitterPreviewTextureStatus === "applied" &&
          status.auroraEmitterNode === "glow" &&
          cameraBillboardParticles > 0 &&
          videoReady &&
          status.videoBytes > 1024 &&
          !status.hasViteErrorOverlay;
        return status;
      })()`
    });
    lastStatus = result.result.value;
    if (lastStatus?.ok) {
      return lastStatus;
    }
    await sleep(250);
  }
  return lastStatus;
}

async function readRecordedVideoData(send) {
  const result = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const proof = window.__PLACEABLE_EMITTER_OVERLAY_PROOF__ ?? {};
      return {
        videoReady: proof.videoReady === true,
        videoBytes: Number(proof.videoBytes ?? 0),
        videoMimeType: String(proof.videoMimeType ?? ""),
        videoDataUrl: String(proof.videoDataUrl ?? "")
      };
    })()`
  });
  const value = result.result.value;
  if (!value?.videoReady || !value.videoDataUrl) {
    throw new Error(`Recorded proof video was not available: ${JSON.stringify(value)}`);
  }
  return value;
}

function parseDataUrlPayload(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || commaIndex < 0) {
    throw new Error("Recorded proof video was not returned as a data URL");
  }
  const metadata = dataUrl.slice("data:".length, commaIndex);
  if (!metadata.includes(";base64")) {
    throw new Error(`Recorded proof video data URL was not base64 encoded: ${metadata}`);
  }
  return {
    mimeType: metadata.replace(/;base64$/u, ""),
    base64: dataUrl.slice(commaIndex + 1)
  };
}

async function waitForTab(port) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      if (response.ok) {
        const tabs = await response.json();
        const tab = tabs.find((candidate) => candidate.type === "page") ?? tabs[0];
        if (tab?.webSocketDebuggerUrl) {
          return tab;
        }
      }
    } catch {
      // Chrome may still be opening its remote debugging endpoint.
    }
    await sleep(100);
  }
  throw new Error(`Chrome DevTools tab did not open on port ${port}`);
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function sanitizeFileStem(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_.-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 120);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function onceProcessExits(process, timeoutMs) {
  if (process.exitCode !== null || process.signalCode !== null) {
    return;
  }
  await Promise.race([
    new Promise((resolve) => process.once("exit", resolve)),
    sleep(timeoutMs)
  ]);
}

function removeProfileDirBestEffort(profileDir) {
  try {
    fs.rmSync(profileDir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup only; capture artifacts are already written elsewhere.
  }
}
