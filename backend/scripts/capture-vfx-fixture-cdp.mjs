import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_BASE_URL = "http://127.0.0.1:5173";

const options = parseArgs(process.argv.slice(2));
const fixtureId = requiredOption(options, "fixture");
const timeSeconds = options.time ?? "0.5";
const seed = options.seed ?? "1";
const outDir = path.resolve(options.outDir ?? "backend/docs/aurora-reverse/artifacts/vfx-cdp-capture");
const chromePath = options.chromePath ?? process.env.CHROME_PATH ?? DEFAULT_CHROME_PATH;
const baseUrl = options.baseUrl ?? process.env.VFX_BASE_URL ?? DEFAULT_BASE_URL;
const port = Number(options.port ?? 9300 + Math.floor(Math.random() * 400));
const fileStem = sanitizeFileStem(options.name ?? `${fixtureId}-time-${timeSeconds}-seed-${seed}`);
const profileDir = path.join(outDir, `${fileStem}.chrome-profile`);
const keepProfile = options.keepProfile === "true";
const route = `${baseUrl}/dev/vfx-fixture/${encodeURIComponent(fixtureId)}?time=${encodeURIComponent(
  timeSeconds
)}&seed=${encodeURIComponent(seed)}`;
const pngPath = path.join(outDir, `${fileStem}.png`);
const framePath = path.join(outDir, `${fileStem}.frame.json`);

fs.mkdirSync(profileDir, { recursive: true });

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${port}`,
    "--window-size=1280,720",
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
  const result = await captureFromChrome({ port, route, pngPath, framePath });
  console.log(JSON.stringify(result, null, 2));
} finally {
  chrome.kill("SIGTERM");
  await onceProcessExits(chrome);
  if (!keepProfile) {
    removeProfileDirBestEffort(profileDir);
  }
}

async function captureFromChrome({ port, route, pngPath, framePath }) {
  const tab = await waitForTab(port, route);
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let messageId = 0;
  const pending = new Map();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
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

  const domStatus = await waitForRenderedDomStatus(send);
  if (!domStatus) {
    throw new Error("VFX fixture runner was not present in the browser DOM.");
  }

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });

  fs.writeFileSync(pngPath, Buffer.from(screenshot.data, "base64"));
  const frame = {
    version: "aurora-vfx-cdp-capture/v1",
    capturedAt: new Date().toISOString(),
    route,
    fixtureId: domStatus.fixtureId,
    timeSeconds: Number(timeSeconds),
    seed: Number(seed),
    screenshot: pngPath,
    screenshotBytes: fs.statSync(pngPath).size,
    domStatus,
    captureMethod: "chrome-devtools-protocol Page.captureScreenshot",
    chromeStderrTail: chromeStderr.slice(-1200)
  };
  fs.writeFileSync(framePath, `${JSON.stringify(frame, null, 2)}\n`);
  ws.close();
  return frame;
}

async function waitForRenderedDomStatus(send) {
  let lastStatus = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = await readDomStatus(send);
    if (status) {
      lastStatus = status;
      if (isRenderedDomStatus(status)) {
        return status;
      }
    }
    await sleep(150);
  }
  return lastStatus;
}

async function readDomStatus(send) {
  const status = await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.querySelector('[data-testid="vfx-fixture-runner"]');
      if (!el) return null;
      return {
        fixtureId: el.getAttribute("data-fixture-id"),
        renderStatus: el.getAttribute("data-render-status"),
        canvasNonblank: el.getAttribute("data-canvas-nonblank"),
        objectPixels: Number(el.getAttribute("data-object-pixels") || 0),
        drawLane: el.getAttribute("data-draw-lane"),
        drawParticles: Number(el.getAttribute("data-rendered-draw-particles") || 0),
        renderedVertices: Number(el.getAttribute("data-rendered-vertices") || 0),
        renderedDrawRecordIds: (el.getAttribute("data-rendered-draw-record-ids") || "")
          .split(",")
          .filter(Boolean),
        renderedEmitterNodeNames: (el.getAttribute("data-rendered-emitter-node-names") || "")
          .split(",")
          .filter(Boolean),
        renderedDrawRecordLanes: (el.getAttribute("data-rendered-draw-record-lanes") || "")
          .split(",")
          .filter(Boolean),
        renderedParticleIds: (el.getAttribute("data-rendered-particle-ids") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedParticleIndexes: (el.getAttribute("data-rendered-particle-indexes") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedPositionX: (el.getAttribute("data-rendered-position-x") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedPositionY: (el.getAttribute("data-rendered-position-y") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedPositionZ: (el.getAttribute("data-rendered-position-z") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedVelocityX: (el.getAttribute("data-rendered-velocity-x") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedVelocityY: (el.getAttribute("data-rendered-velocity-y") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedVelocityZ: (el.getAttribute("data-rendered-velocity-z") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedColorR: (el.getAttribute("data-rendered-color-r") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedColorG: (el.getAttribute("data-rendered-color-g") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedColorB: (el.getAttribute("data-rendered-color-b") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedParticleSizeX: (el.getAttribute("data-rendered-particle-size-x") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedParticleSizeY: (el.getAttribute("data-rendered-particle-size-y") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedAlpha: (el.getAttribute("data-rendered-alpha") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedRecordVerticesPerParticle: (el.getAttribute("data-rendered-record-vertices-per-particle") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedPltLayers: (el.getAttribute("data-rendered-plt-layers") || "")
          .split(",")
          .filter(Boolean),
        renderedPltLayerColorSources: (el.getAttribute("data-rendered-plt-layer-color-sources") || "")
          .split(",")
          .filter(Boolean),
        renderedRenderOrder: Number(el.getAttribute("data-rendered-render-order") || 0),
        renderedRenderMode: el.getAttribute("data-rendered-render-mode"),
        renderedRenderModeRawToken: el.getAttribute("data-rendered-render-mode-raw-token"),
        renderedBlendMode: el.getAttribute("data-rendered-blend-mode"),
        renderedBlendModeRawToken: el.getAttribute("data-rendered-blend-mode-raw-token"),
        renderedBlendModeNumber: Number(el.getAttribute("data-rendered-blend-mode-number") || -1),
        renderedDiagnosticCodes: (el.getAttribute("data-rendered-diagnostic-codes") || "")
          .split(",")
          .filter(Boolean),
        renderedAtlasFrames: (el.getAttribute("data-rendered-atlas-frames") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedAtlasFrameCount: Number(el.getAttribute("data-rendered-atlas-frame-count") || 0),
        renderedAtlasUvU0: (el.getAttribute("data-rendered-atlas-uv-u0") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedAtlasUvV0: (el.getAttribute("data-rendered-atlas-uv-v0") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedAtlasUvU1: (el.getAttribute("data-rendered-atlas-uv-u1") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedAtlasUvV1: (el.getAttribute("data-rendered-atlas-uv-v1") || "")
          .split(",")
          .filter(Boolean)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry)),
        renderedGeometry: {
          nonIndexedDrawArrays: el.getAttribute("data-rendered-geometry-non-indexed-draw-arrays"),
          indexedDrawArrays: el.getAttribute("data-rendered-geometry-indexed-draw-arrays"),
          drawModeArgument: Number(el.getAttribute("data-rendered-geometry-draw-mode-argument") || 0),
          drawModeArgumentSource: el.getAttribute(
            "data-rendered-geometry-draw-mode-argument-source"
          ),
          verticesPerParticle: Number(
            el.getAttribute("data-rendered-geometry-vertices-per-particle") || 0
          ),
          atlasUvSource: el.getAttribute("data-rendered-geometry-atlas-uv-source"),
          positionAttributeCount: Number(
            el.getAttribute("data-rendered-geometry-position-attribute-count") || 0
          ),
          positionAttributeItemSize: Number(
            el.getAttribute("data-rendered-geometry-position-attribute-item-size") || 0
          ),
          positionAttributeXMin: Number(
            el.getAttribute("data-rendered-geometry-position-attribute-x-min") || 0
          ),
          positionAttributeXMax: Number(
            el.getAttribute("data-rendered-geometry-position-attribute-x-max") || 0
          ),
          positionAttributeYMin: Number(
            el.getAttribute("data-rendered-geometry-position-attribute-y-min") || 0
          ),
          positionAttributeYMax: Number(
            el.getAttribute("data-rendered-geometry-position-attribute-y-max") || 0
          ),
          positionAttributeZMin: Number(
            el.getAttribute("data-rendered-geometry-position-attribute-z-min") || 0
          ),
          positionAttributeZMax: Number(
            el.getAttribute("data-rendered-geometry-position-attribute-z-max") || 0
          ),
          positionAttributeMinUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-position-attribute-min-unique-values-per-record"
            ) || 0
          ),
          positionAttributeMaxUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-position-attribute-max-unique-values-per-record"
            ) || 0
          ),
          colorAttributeCount: Number(
            el.getAttribute("data-rendered-geometry-color-attribute-count") || 0
          ),
          colorAttributeItemSize: Number(
            el.getAttribute("data-rendered-geometry-color-attribute-item-size") || 0
          ),
          colorAttributeUniqueCount: Number(
            el.getAttribute("data-rendered-geometry-color-attribute-unique-count") || 0
          ),
          colorAttributeRMin: Number(
            el.getAttribute("data-rendered-geometry-color-attribute-r-min") || 0
          ),
          colorAttributeRMax: Number(
            el.getAttribute("data-rendered-geometry-color-attribute-r-max") || 0
          ),
          colorAttributeGMin: Number(
            el.getAttribute("data-rendered-geometry-color-attribute-g-min") || 0
          ),
          colorAttributeGMax: Number(
            el.getAttribute("data-rendered-geometry-color-attribute-g-max") || 0
          ),
          colorAttributeBMin: Number(
            el.getAttribute("data-rendered-geometry-color-attribute-b-min") || 0
          ),
          colorAttributeBMax: Number(
            el.getAttribute("data-rendered-geometry-color-attribute-b-max") || 0
          ),
          colorAttributeMinUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-color-attribute-min-unique-values-per-record"
            ) || 0
          ),
          colorAttributeMaxUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-color-attribute-max-unique-values-per-record"
            ) || 0
          ),
          alphaAttributeCount: Number(
            el.getAttribute("data-rendered-geometry-alpha-attribute-count") || 0
          ),
          alphaAttributeItemSize: Number(
            el.getAttribute("data-rendered-geometry-alpha-attribute-item-size") || 0
          ),
          alphaAttributeMin: Number(
            el.getAttribute("data-rendered-geometry-alpha-attribute-min") || 0
          ),
          alphaAttributeMax: Number(
            el.getAttribute("data-rendered-geometry-alpha-attribute-max") || 0
          ),
          alphaAttributeMinUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-alpha-attribute-min-unique-values-per-record"
            ) || 0
          ),
          alphaAttributeMaxUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-alpha-attribute-max-unique-values-per-record"
            ) || 0
          ),
          particleSizeAttributeCount: Number(
            el.getAttribute("data-rendered-geometry-particle-size-attribute-count") || 0
          ),
          particleSizeAttributeItemSize: Number(
            el.getAttribute("data-rendered-geometry-particle-size-attribute-item-size") || 0
          ),
          particleSizeAttributeXMin: Number(
            el.getAttribute("data-rendered-geometry-particle-size-attribute-x-min") || 0
          ),
          particleSizeAttributeXMax: Number(
            el.getAttribute("data-rendered-geometry-particle-size-attribute-x-max") || 0
          ),
          particleSizeAttributeYMin: Number(
            el.getAttribute("data-rendered-geometry-particle-size-attribute-y-min") || 0
          ),
          particleSizeAttributeYMax: Number(
            el.getAttribute("data-rendered-geometry-particle-size-attribute-y-max") || 0
          ),
          particleSizeAttributeMinUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-particle-size-attribute-min-unique-values-per-record"
            ) || 0
          ),
          particleSizeAttributeMaxUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-particle-size-attribute-max-unique-values-per-record"
            ) || 0
          ),
          atlasFrameAttributeCount: Number(
            el.getAttribute("data-rendered-geometry-atlas-frame-attribute-count") || 0
          ),
          atlasFrameAttributeItemSize: Number(
            el.getAttribute("data-rendered-geometry-atlas-frame-attribute-item-size") || 0
          ),
          atlasFrameAttributeSource: el.getAttribute(
            "data-rendered-geometry-atlas-frame-attribute-source"
          ),
          atlasFrameAttributeUniqueCount: Number(
            el.getAttribute("data-rendered-geometry-atlas-frame-attribute-unique-count") || 0
          ),
          atlasFrameAttributeMin: Number(
            el.getAttribute("data-rendered-geometry-atlas-frame-attribute-min") || 0
          ),
          atlasFrameAttributeMax: Number(
            el.getAttribute("data-rendered-geometry-atlas-frame-attribute-max") || 0
          ),
          atlasFrameAttributeMinUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-atlas-frame-attribute-min-unique-values-per-record"
            ) || 0
          ),
          atlasFrameAttributeMaxUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-atlas-frame-attribute-max-unique-values-per-record"
            ) || 0
          ),
          drawRecordIndexAttributeCount: Number(
            el.getAttribute("data-rendered-geometry-draw-record-index-attribute-count") || 0
          ),
          drawRecordIndexAttributeItemSize: Number(
            el.getAttribute("data-rendered-geometry-draw-record-index-attribute-item-size") || 0
          ),
          drawRecordIndexAttributeSource: el.getAttribute(
            "data-rendered-geometry-draw-record-index-attribute-source"
          ),
          drawRecordIndexAttributeUniqueCount: Number(
            el.getAttribute("data-rendered-geometry-draw-record-index-attribute-unique-count") || 0
          ),
          drawRecordIndexAttributeMin: Number(
            el.getAttribute("data-rendered-geometry-draw-record-index-attribute-min") || 0
          ),
          drawRecordIndexAttributeMax: Number(
            el.getAttribute("data-rendered-geometry-draw-record-index-attribute-max") || 0
          ),
          drawRecordIndexAttributeMinVerticesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-draw-record-index-attribute-min-vertices-per-record"
            ) || 0
          ),
          drawRecordIndexAttributeMaxVerticesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-draw-record-index-attribute-max-vertices-per-record"
            ) || 0
          ),
          uvAttributeCount: Number(
            el.getAttribute("data-rendered-geometry-uv-attribute-count") || 0
          ),
          uvAttributeItemSize: Number(
            el.getAttribute("data-rendered-geometry-uv-attribute-item-size") || 0
          ),
          uvAttributeUMin: Number(
            el.getAttribute("data-rendered-geometry-uv-attribute-u-min") || 0
          ),
          uvAttributeUMax: Number(
            el.getAttribute("data-rendered-geometry-uv-attribute-u-max") || 0
          ),
          uvAttributeVMin: Number(
            el.getAttribute("data-rendered-geometry-uv-attribute-v-min") || 0
          ),
          uvAttributeVMax: Number(
            el.getAttribute("data-rendered-geometry-uv-attribute-v-max") || 0
          ),
          uvAttributeMinUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-uv-attribute-min-unique-values-per-record"
            ) || 0
          ),
          uvAttributeMaxUniqueValuesPerRecord: Number(
            el.getAttribute(
              "data-rendered-geometry-uv-attribute-max-unique-values-per-record"
            ) || 0
          )
        },
        renderedBounds: {
          width: Number(el.getAttribute("data-rendered-bounds-width") || 0),
          height: Number(el.getAttribute("data-rendered-bounds-height") || 0),
          depth: Number(el.getAttribute("data-rendered-bounds-depth") || 0),
          centerX: Number(el.getAttribute("data-rendered-bounds-center-x") || 0),
          centerY: Number(el.getAttribute("data-rendered-bounds-center-y") || 0),
          centerZ: Number(el.getAttribute("data-rendered-bounds-center-z") || 0)
        },
        renderedTextureReference: el.getAttribute("data-rendered-texture-reference"),
        renderedTextureStatus: el.getAttribute("data-rendered-texture-status"),
        renderedMaterial: {
          transparent: el.getAttribute("data-rendered-material-transparent"),
          depthWrite: el.getAttribute("data-rendered-material-depth-write"),
          depthTest: el.getAttribute("data-rendered-material-depth-test"),
          alphaTest: Number(el.getAttribute("data-rendered-material-alpha-test") || 0),
          opacity: Number(el.getAttribute("data-rendered-material-opacity") || 0),
          colorHex: el.getAttribute("data-rendered-material-color-hex"),
          blending: el.getAttribute("data-rendered-material-blending"),
          blendSrc: el.getAttribute("data-rendered-material-blend-src"),
          blendDst: el.getAttribute("data-rendered-material-blend-dst"),
          blendEquation: el.getAttribute("data-rendered-material-blend-equation"),
          mapBound: el.getAttribute("data-rendered-material-map-bound"),
          mapReference: el.getAttribute("data-rendered-material-map-reference"),
          vertexColors: el.getAttribute("data-rendered-material-vertex-colors"),
          side: el.getAttribute("data-rendered-material-side"),
          status: el.getAttribute("data-rendered-material-status")
        },
        textureProfile: el.getAttribute("data-texture-profile"),
        textureAtlas: {
          columns: Number(el.getAttribute("data-texture-atlas-columns") || 0),
          rows: Number(el.getAttribute("data-texture-atlas-rows") || 0),
          cellSize: Number(el.getAttribute("data-texture-atlas-cell-size") || 0),
          cellCount: Number(el.getAttribute("data-texture-atlas-cell-count") || 0),
          width: Number(el.getAttribute("data-texture-width") || 0),
          height: Number(el.getAttribute("data-texture-height") || 0)
        },
        oracle: el.getAttribute("data-oracle"),
        comparisonResult: el.getAttribute("data-comparison-result"),
        canonicalParityPromoted: el.getAttribute("data-canonical-parity-promoted")
      };
    })()`,
    returnByValue: true
  });
  return status.result.value;
}

function isRenderedDomStatus(status) {
  const requiresDrawGeometry = status.drawLane !== "chunk_model";
  return (
    status.renderStatus === "rendered" &&
    status.canvasNonblank === "true" &&
    Number(status.objectPixels) > 0 &&
    (!requiresDrawGeometry ||
      (Number(status.drawParticles) > 0 &&
        Number(status.renderedVertices) > 0 &&
        Number(status.renderedBounds?.width) > 0 &&
        Number(status.renderedBounds?.height) > 0))
  );
}

async function waitForTab(port, route) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      const tabs = await response.json();
      const tab = tabs.find((entry) => entry.url === route) ?? tabs[0];
      if (tab?.webSocketDebuggerUrl) {
        return tab;
      }
    } catch {
      // Chrome may still be starting.
    }
    await sleep(250);
  }
  throw new Error(`No Chrome DevTools Protocol tab became available on port ${port}.`);
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = value;
      index += 1;
    }
  }
  return parsed;
}

function requiredOption(options, key) {
  const value = options[key];
  if (!value) {
    throw new Error(`Missing required --${key} option.`);
  }
  return value;
}

function sanitizeFileStem(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function onceProcessExits(processHandle) {
  if (processHandle.exitCode !== null || processHandle.signalCode !== null) {
    return;
  }
  await Promise.race([
    new Promise((resolve) => processHandle.once("exit", resolve)),
    sleep(2500)
  ]);
}

function removeProfileDirBestEffort(profileDir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
      return;
    } catch {
      // Windows may keep Chrome's profile files locked briefly after process exit.
    }
  }
  console.warn(`Warning: unable to remove transient Chrome profile ${profileDir}`);
}
