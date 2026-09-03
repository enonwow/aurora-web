import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";

import { installCaptureProcessGuard } from "./capture-process-lifecycle.mjs";
import { hasVisibleCanonicalVfxPlayback } from "./vfx-proof-playback-visibility.mjs";

const DEFAULT_CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_BASE_URL = "http://127.0.0.1:5173";
const DEFAULT_USERNAME = "builder.user";
const DEFAULT_PASSWORD = "builder123";
const DEFAULT_CAPTURE_HARD_TIMEOUT_BUFFER_MS = 60_000;
const DEFAULT_LOCAL_FFMPEG_PATH =
  "C:\\Users\\enonw\\Documents\\Codex\\2026-05-17\\umiesz-tworzy-filmiki\\vendor\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe";

const options = parseArgs(process.argv.slice(2));
const routePath = requiredOption(options, "route");
const outDir = path.resolve(options.outDir ?? "backend/docs/aurora-reverse/artifacts/vfx-app-route-capture");
const chromePath = options.chromePath ?? process.env.CHROME_PATH ?? DEFAULT_CHROME_PATH;
const baseUrl = options.baseUrl ?? process.env.VFX_BASE_URL ?? DEFAULT_BASE_URL;
const port = Number(options.port ?? 9300 + Math.floor(Math.random() * 400));
const fileStem = sanitizeFileStem(options.name ?? "vfx-app-route");
const username = options.username ?? process.env.AURORA_TEST_USERNAME ?? DEFAULT_USERNAME;
const password = options.password ?? process.env.AURORA_TEST_PASSWORD ?? DEFAULT_PASSWORD;
const authBaseUrl = (options.authBaseUrl ?? `${baseUrl}/_aurora/v1`).replace(/\/+$/u, "");
const clickMagicMouthDemo = options.clickMagicMouthDemo === "true";
const waitAttempts = Number(options.waitAttempts ?? 240);
const skipAuth = options.skipAuth === "true";
const profileDir = path.join(outDir, `${fileStem}.chrome-profile`);
const keepProfile = options.keepProfile === "true";
const route = new URL(routePath, baseUrl).toString();
const isAreaPlaceableLightingRoute =
  new URL(route).pathname === "/dev/area-light-shadow-preview";
const requirePlaceableTextureSettled =
  isAreaPlaceableLightingRoute || options.requirePlaceableTextureSettled === "true";
const bootstrapRoute = new URL("/login", baseUrl).toString();
const pngPath = path.join(outDir, `${fileStem}.png`);
const framePath = path.join(outDir, `${fileStem}.frame.json`);
const recordVideo = options.recordVideo === "true" || options.recordWebm === "true";
const videoPath = path.join(outDir, `${fileStem}.webm`);
const recordMp4 = options.recordMp4 === "true" || options.recordVideoMp4 === "true";
const mp4Path = path.join(outDir, `${fileStem}.mp4`);
const ffmpegPath = options.ffmpegPath ?? process.env.FFMPEG_PATH ?? DEFAULT_LOCAL_FFMPEG_PATH;
const videoDurationMs = Number(options.videoDurationMs ?? 3200);
const videoFps = Number(options.videoFps ?? 30);
const captureTimeSeconds =
  options.captureTimeSeconds === undefined ? null : Number(options.captureTimeSeconds);
const allowDiagnosticProofFailure =
  options.allowDiagnosticProofFailure === "true" &&
  new URL(route).searchParams.get("render") === "direct" &&
  !recordVideo &&
  !recordMp4;
const viewportWidth = Number(options.viewportWidth ?? options.width ?? 1440);
const viewportHeight = Number(options.viewportHeight ?? options.height ?? 760);
const captureHardTimeoutMs = Math.max(
  30_000,
  Number(
    options.overallTimeoutMs ??
      process.env.VFX_CAPTURE_OVERALL_TIMEOUT_MS ??
      waitAttempts * 250 + videoDurationMs + DEFAULT_CAPTURE_HARD_TIMEOUT_BUFFER_MS
  )
);
const backendRuntimeIdentity = await readBackendRuntimeIdentity(
  new URL("/_aurora/v1/health", baseUrl).toString()
);

fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const seededAuthState = skipAuth
  ? null
  : await createPersistedAuthState({
      authBaseUrl,
      username,
      password
    });
const initialRoute = skipAuth ? route : bootstrapRoute;

const chrome = spawn(
  chromePath,
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
    "--disable-background-mode",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-breakpad",
    "--disable-crash-reporter",
    `--remote-debugging-port=${port}`,
    `--window-size=${viewportWidth},${viewportHeight}`,
    `--user-data-dir=${profileDir}`,
    initialRoute
  ],
  { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, detached: false }
);
const chromeProcessGuard = installCaptureProcessGuard(chrome, {
  hardTimeoutMs: captureHardTimeoutMs,
  label: `vfx-app-route:${fileStem}`
});

let chromeStderr = "";
chrome.stderr.on("data", (chunk) => {
  chromeStderr += chunk.toString();
});

try {
  const result = await captureFromChrome({
    port,
    route,
    initialRoute,
    pngPath,
    framePath,
    seededAuthState,
    waitAttempts,
    requirePlaceableTextureSettled,
    recordVideo,
    videoPath,
    recordMp4,
    mp4Path,
    ffmpegPath,
    videoDurationMs,
    videoFps,
    captureTimeSeconds,
    viewportWidth,
    viewportHeight,
    backendRuntimeIdentity,
    allowDiagnosticProofFailure
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await chromeProcessGuard.terminate();
  if (!keepProfile) {
    removeProfileDirBestEffort(profileDir);
  }
}

async function captureFromChrome({
  port,
  route,
  initialRoute,
  pngPath,
  framePath,
  seededAuthState,
  waitAttempts,
  requirePlaceableTextureSettled,
  recordVideo,
  videoPath,
  recordMp4,
  mp4Path,
  ffmpegPath,
  videoDurationMs,
  videoFps,
  captureTimeSeconds,
  viewportWidth,
  viewportHeight,
  backendRuntimeIdentity,
  allowDiagnosticProofFailure
}) {
  const tab = await waitForTab(port, initialRoute);
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let messageId = 0;
  const pending = new Map();
  const networkEvents = [];
  const runtimeEvents = [];

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method?.startsWith("Network.")) {
      networkEvents.push({
        method: message.method,
        params: message.params,
        receivedAtMs: Date.now()
      });
    }
    if (
      message.method === "Runtime.consoleAPICalled" ||
      message.method === "Runtime.exceptionThrown"
    ) {
      runtimeEvents.push({ method: message.method, params: message.params });
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
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const loginReady = seededAuthState ? await waitForLoginOrApp(send) : null;
  if (seededAuthState) {
    await seedBrowserAuthState(send, seededAuthState);
    await send("Page.navigate", { url: route });
  }
  if (clickMagicMouthDemo) {
    await waitForMagicMouthDemoEntry(send);
    await send("Runtime.evaluate", {
      awaitPromise: true,
      expression: `(() => {
        const button = Array.from(document.querySelectorAll("button"))
          .find((candidate) => candidate.textContent?.trim() === "Magic Mouth Demo");
        if (!button) {
          throw new Error("Magic Mouth Demo button not found");
        }
        button.click();
        return true;
      })()`
    });
  }

  const domStatus = await waitForAppVfxStatus(send, waitAttempts, {
    requirePlaceableTextureSettled
  });
  if (!domStatus?.ok && !allowDiagnosticProofFailure) {
    const networkSummary = summarizeNetworkEvents(networkEvents);
    const blockerManifest = {
      version: "aurora-vfx-app-route-cdp-blocker/v1",
      accepted: false,
      captureIntegrityAccepted: false,
      retailParityAccepted: false,
      capturedAt: new Date().toISOString(),
      blockerCode: "APP_VFX_ROUTE_READINESS_TIMEOUT",
      requestedRoute: route,
      finalRoute: domStatus?.href ?? null,
      framePath,
      backendRuntimeIdentity,
      proofGateReport:
        domStatus?.runtimeObservability ??
        domStatus?.proofGates ??
        null,
      domStatus,
      networkSummary,
      runtimeEvents: runtimeEvents.slice(-40),
      screenshotPath: null,
      mp4Path: null,
      localOnlyNotRetailEvidence: true
    };
    fs.writeFileSync(framePath, `${JSON.stringify(blockerManifest, null, 2)}\n`);
    throw new Error(
      `App VFX route did not reach ready draw metrics before timeout; blocker manifest: ${framePath}; ${JSON.stringify({
        domStatus,
        networkSummary
      })}`
    );
  }

  const deterministicCaptureRequested =
    recordMp4 || Number.isFinite(captureTimeSeconds);
  const deterministicCapture = deterministicCaptureRequested
    ? await beginDeterministicAppCapture(send)
    : false;
  if (deterministicCaptureRequested && !deterministicCapture) {
    const blockerManifest = {
      version: "aurora-vfx-app-route-cdp-blocker/v1",
      accepted: false,
      captureIntegrityAccepted: false,
      retailParityAccepted: false,
      capturedAt: new Date().toISOString(),
      blockerCode: "DETERMINISTIC_CAPTURE_HOOK_UNAVAILABLE",
      requestedRoute: route,
      finalRoute: domStatus.href,
      framePath,
      backendRuntimeIdentity,
      proofGateReport: domStatus.runtimeObservability ?? domStatus.proofGates ?? null,
      domStatus,
      screenshotPath: null,
      mp4Path: null,
      localOnlyNotRetailEvidence: true
    };
    fs.writeFileSync(framePath, `${JSON.stringify(blockerManifest, null, 2)}\n`);
    throw new Error(
      `Deterministic VFX capture hook was unavailable; blocker manifest: ${framePath}`
    );
  }

  const video = recordVideo
    ? await recordCanvasVideo(send, {
        videoPath,
        durationMs: videoDurationMs,
        fps: videoFps
      })
    : null;
  const mp4Video = recordMp4
    ? await recordScreenshotMp4(send, {
        mp4Path,
        ffmpegPath,
        durationMs: videoDurationMs,
        fps: videoFps,
        deterministicCapture
      })
    : null;

  const staticPlaybackState = Number.isFinite(captureTimeSeconds)
    ? await renderDeterministicStaticFrame(
        send,
        captureTimeSeconds,
        deterministicCapture
      )
    : null;

  const finalDomStatus = await readAppVfxStatus(send, {
    requirePlaceableTextureSettled
  });
  const visibleMp4Samples =
    mp4Video?.playbackSamples.filter(({ playbackState }) =>
      hasVisibleCanonicalVfxPlayback(playbackState)
    ) ?? [];
  const areaPlaceableLightingProof =
    finalDomStatus?.areaPreview?.placeableLightingProof ?? null;
  const isAreaPlaceableLightingCapture =
    finalDomStatus?.routePath === "/dev/area-light-shadow-preview";
  const isAreaPlaceableLightingVfxDisabled =
    isAreaPlaceableLightingCapture &&
    areaPlaceableLightingProof?.profile?.vfx === false;
  const areaPlaceableModelTextureSettled =
    finalDomStatus?.areaPreview?.placeableModelTextureSettled === true;
  const requestedOracleFixture = new URL(route).searchParams.get("oracleFixture");
  const isAlsOracleCampfireCapture =
    isAreaPlaceableLightingCapture &&
    requestedOracleFixture === "als-oracle-campfire-v1";
  const isAlsOracleCampfirePointLightEnabledCapture =
    isAlsOracleCampfireCapture &&
    new URL(route).searchParams.get("lightingPointLight") !== "false";
  const areaPlaceableSourceLineageStatus =
    finalDomStatus?.areaPreview?.placeableSourceLineageStatus ?? null;
  const areaPlaceableLightProjectionStatus =
    finalDomStatus?.areaPreview?.placeableLightProjectionStatus ?? null;
  const areaTerrainSourceLineageStatus =
    finalDomStatus?.areaPreview?.terrainSourceLineageStatus ?? null;
  const captureValidationBlockers = [
    ...(finalDomStatus?.runtimeObservability?.version !==
    "aurora-vfx-runtime-observability/v1"
      ? ["runtime-observability-report-missing"]
      : []),
    ...(!isAreaPlaceableLightingVfxDisabled &&
    finalDomStatus?.runtimeObservability?.proofGate?.status !== "pass"
      ? ["runtime-observability-proof-gate-failed"]
      : []),
    ...(isAreaPlaceableLightingVfxDisabled &&
    finalDomStatus?.runtimeObservability?.assetSettlement?.status !== "settled"
      ? ["placeable-lighting-assets-not-settled"]
      : []),
    ...(isAreaPlaceableLightingCapture && !areaPlaceableModelTextureSettled
      ? ["area-placeable-texture-not-settled"]
      : []),
    ...(isAlsOracleCampfireCapture && areaPlaceableSourceLineageStatus !== "pass"
      ? ["area-placeable-source-lineage-not-retail"]
      : []),
    ...(isAlsOracleCampfireCapture && areaTerrainSourceLineageStatus !== "pass"
      ? ["area-placeable-terrain-source-lineage-not-retail"]
      : []),
    ...(isAlsOracleCampfirePointLightEnabledCapture &&
    areaPlaceableLightProjectionStatus !== "pass"
      ? ["area-placeable-light-projection-invalid"]
      : []),
    ...(isAlsOracleCampfireCapture &&
    finalDomStatus?.areaPreview?.oracleFixture !== requestedOracleFixture
      ? ["area-placeable-oracle-fixture-mismatch"]
      : []),
    ...(isAreaPlaceableLightingCapture &&
    areaPlaceableLightingProof?.version !==
      "aurora-placeable-lighting-proof-snapshot/v2"
      ? ["placeable-lighting-proof-snapshot-missing"]
      : []),
    ...(isAreaPlaceableLightingCapture &&
    areaPlaceableLightingProof?.retailParityStatus !==
      "blocked_pending_matched_nwn_oracle"
      ? ["placeable-lighting-retail-parity-boundary-invalid"]
      : []),
    ...(finalDomStatus?.comparison?.phase === "post" &&
    finalDomStatus?.runtimeObservability?.playbackGuard?.postDurationHidden !== true
      ? ["post-duration-playback-not-hidden"]
      : []),
    ...(recordMp4 && visibleMp4Samples.length === 0
      ? ["mp4-has-no-visible-canonical-vfx-sample"]
      : []),
    ...(Number.isFinite(captureTimeSeconds) &&
    !isAreaPlaceableLightingVfxDisabled &&
    !hasVisibleCanonicalVfxPlayback(staticPlaybackState)
      ? ["static-frame-has-no-visible-canonical-vfx"]
      : [])
  ];
  if (captureValidationBlockers.length > 0 && !allowDiagnosticProofFailure) {
    if (mp4Video?.path) fs.rmSync(mp4Video.path, { force: true });
    if (video?.path) fs.rmSync(video.path, { force: true });
    const blockerManifest = {
      version: "aurora-vfx-app-route-cdp-blocker/v1",
      accepted: false,
      captureIntegrityAccepted: false,
      retailParityAccepted: false,
      capturedAt: new Date().toISOString(),
      blockerCode: "APP_VFX_CAPTURE_VALIDATION_FAILED",
      blockerManifest: captureValidationBlockers,
      requestedRoute: route,
      finalRoute: finalDomStatus?.href ?? domStatus.href,
      framePath,
      backendRuntimeIdentity,
      proofGateReport:
        finalDomStatus?.runtimeObservability ??
        finalDomStatus?.proofGates ??
        null,
      domStatus: finalDomStatus,
      mp4PlaybackSamples: mp4Video?.playbackSamples ?? [],
      staticPlaybackState,
      screenshotPath: null,
      mp4Path: null,
      localOnlyNotRetailEvidence: true
    };
    fs.writeFileSync(framePath, `${JSON.stringify(blockerManifest, null, 2)}\n`);
    throw new Error(
      `VFX capture validation failed; blocker manifest: ${framePath}; ${captureValidationBlockers.join("|")}`
    );
  }

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });

  fs.writeFileSync(pngPath, Buffer.from(screenshot.data, "base64"));
  const captureIntegrityAccepted =
    domStatus?.ok === true && captureValidationBlockers.length === 0;
  const retailParityAccepted = false;
  const frame = {
    version: "aurora-vfx-app-route-cdp-capture/v1",
    capturedAt: new Date().toISOString(),
    requestedRoute: route,
    finalRoute: finalDomStatus?.href ?? domStatus.href,
    screenshotPath: pngPath,
    screenshotBytes: fs.statSync(pngPath).size,
    requestedViewport: {
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: 1,
      source: "CDP Emulation.setDeviceMetricsOverride",
    },
    videoPath: video?.path ?? null,
    videoBytes: video?.bytes ?? null,
    videoMimeType: video?.mimeType ?? null,
    mp4Path: mp4Video?.path ?? null,
    mp4Bytes: mp4Video?.bytes ?? null,
    mp4DurationMs: mp4Video?.durationMs ?? null,
    mp4FrameCount: mp4Video?.frameCount ?? null,
    mp4Fps: mp4Video?.fps ?? null,
    mp4DeterministicCapture: mp4Video?.deterministicCapture ?? null,
    mp4PlaybackSamples: mp4Video?.playbackSamples ?? [],
    staticCaptureTimeSeconds: Number.isFinite(captureTimeSeconds) ? captureTimeSeconds : null,
    staticPlaybackState,
    framePath,
    accepted: isAreaPlaceableLightingCapture
      ? retailParityAccepted
      : captureIntegrityAccepted,
    captureIntegrityAccepted,
    retailParityAccepted,
    diagnosticProofFailureAllowed: allowDiagnosticProofFailure,
    diagnosticValidationBlockers: captureValidationBlockers,
    backendRuntimeIdentity,
    proofGateReport:
      finalDomStatus?.runtimeObservability ??
      finalDomStatus?.proofGates ??
      null,
    loginReady,
    seededAuth: seededAuthState
      ? {
          source: authBaseUrl,
          userId: seededAuthState.session.user.id,
          role: seededAuthState.session.user.role,
          permissionCount: seededAuthState.authorization.permissions.length
        }
      : null,
    entryPointAction: clickMagicMouthDemo
      ? {
          initialRoute: route,
          clickedButtonText: "Magic Mouth Demo",
          finalRoute: domStatus.href
        }
      : null,
    domStatus: finalDomStatus ?? domStatus,
    networkSummary: summarizeNetworkEvents(networkEvents),
    runtimeEvents: runtimeEvents.slice(-40),
    captureMethod: "chrome-devtools-protocol Page.captureScreenshot plus app workspace VFX draw-metrics dataset capture",
    videoCaptureMethod: video
      ? "browser canvas captureStream plus MediaRecorder WebM"
      : null,
    mp4CaptureMethod: mp4Video
      ? "chrome-devtools-protocol Page.captureScreenshot frame sequence encoded with ffmpeg libx264"
      : null,
    chromeStderrTail: chromeStderr.slice(-1200),
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true
  };
  fs.writeFileSync(framePath, `${JSON.stringify(frame, null, 2)}\n`);
  ws.close();
  return frame;
}

async function renderDeterministicStaticFrame(
  send,
  elapsedSeconds,
  deterministicCapture
) {
  if (!deterministicCapture) return null;
  return renderAppAtTime(send, Math.max(0, elapsedSeconds));
}

async function waitForMagicMouthDemoEntry(send) {
  let lastStatus = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => ({
        href: window.location.href,
        hasButton: Array.from(document.querySelectorAll("button"))
          .some((button) => button.textContent?.trim() === "Magic Mouth Demo")
      }))()`
    });
    lastStatus = status.result.value;
    if (lastStatus?.hasButton) {
      return lastStatus;
    }
    await sleep(150);
  }
  throw new Error(`Magic Mouth Demo entry button did not appear: ${JSON.stringify(lastStatus)}`);
}

async function recordCanvasVideo(send, { videoPath, durationMs, fps }) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(() => new Promise((resolve) => {
      const canvas =
        document.querySelector("[data-testid='nwn-vfx-comparison-runner'] canvas") ??
        document.querySelector("[data-testid='catalog-vfx-preview-runner'] canvas") ??
        document.querySelector("[data-testid='vfx-fixture-runner'] canvas") ??
        document.querySelector(".workspace-render-canvas") ??
        document.querySelector("canvas");
      if (!canvas) {
        resolve({ ok: false, issue: "canvas_unavailable" });
        return;
      }
      if (typeof MediaRecorder === "undefined") {
        resolve({ ok: false, issue: "media_recorder_unavailable" });
        return;
      }
      const preferredTypes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm"
      ];
      const mimeType = preferredTypes.find((candidate) => MediaRecorder.isTypeSupported(candidate));
      if (!mimeType) {
        resolve({ ok: false, issue: "media_recorder_mime_type_unsupported", preferredTypes });
        return;
      }
      const sourceRect = canvas.getBoundingClientRect();
      const captureCanvas = document.createElement("canvas");
      captureCanvas.width = Math.max(1, Number(canvas.width) || Math.round(sourceRect.width) || 960);
      captureCanvas.height = Math.max(1, Number(canvas.height) || Math.round(sourceRect.height) || 540);
      const captureContext = captureCanvas.getContext("2d", { alpha: false });
      if (!captureContext || typeof captureCanvas.captureStream !== "function") {
        resolve({ ok: false, issue: "capture_canvas_unavailable" });
        return;
      }
      let frameIndex = 0;
      const paintFrame = () => {
        captureContext.fillStyle = "#07111b";
        captureContext.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
        try {
          captureContext.drawImage(canvas, 0, 0, captureCanvas.width, captureCanvas.height);
        } catch (error) {
          resolve({
            ok: false,
            issue: "capture_canvas_draw_failed",
            message: error instanceof Error ? error.message : String(error)
          });
          return false;
        }
        captureContext.fillStyle = "rgba(255, 210, 80, 0.72)";
        const progress =
          ((frameIndex % Math.max(1, Math.round((${JSON.stringify(durationMs)} / 1000) * ${JSON.stringify(fps)}))) + 1) /
          Math.max(1, Math.round((${JSON.stringify(durationMs)} / 1000) * ${JSON.stringify(fps)}));
        captureContext.fillRect(0, captureCanvas.height - 4, captureCanvas.width * progress, 4);
        frameIndex += 1;
        return true;
      };
      const chunks = [];
      paintFrame();
      const stream = captureCanvas.captureStream(${JSON.stringify(fps)});
      const [videoTrack] = stream.getVideoTracks();
      let frameTimer = null;
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000
      });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onerror = () => {
        if (frameTimer !== null) {
          window.clearInterval(frameTimer);
        }
        resolve({
          ok: false,
          issue: recorder.error?.message ?? "media_recorder_failed",
          mimeType
        });
      };
      recorder.onstop = () => {
        if (frameTimer !== null) {
          window.clearInterval(frameTimer);
        }
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          stream.getTracks().forEach((track) => track.stop());
          resolve({
            ok: true,
            mimeType,
            bytes: blob.size,
            durationMs: ${JSON.stringify(durationMs)},
            fps: ${JSON.stringify(fps)},
            dataUrl: String(reader.result)
          });
        };
        reader.onerror = () => {
          stream.getTracks().forEach((track) => track.stop());
          resolve({
            ok: false,
            issue: reader.error?.message ?? "media_recorder_read_failed",
            mimeType
          });
        };
        reader.readAsDataURL(blob);
      };
      recorder.start(100);
      frameTimer = window.setInterval(() => {
        paintFrame();
        if (typeof videoTrack?.requestFrame === "function") {
          videoTrack.requestFrame();
        }
      }, Math.max(16, Math.round(1000 / ${JSON.stringify(fps)})));
      if (typeof videoTrack?.requestFrame === "function") {
        videoTrack.requestFrame();
      }
      window.setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, ${JSON.stringify(durationMs)});
    }))()`
  });
  const value = result.result.value;
  if (!value?.ok || !value.dataUrl || Number(value.bytes ?? 0) <= 1024) {
    throw new Error(`Canvas video recording failed: ${JSON.stringify(value)}`);
  }
  const encodedVideo = parseDataUrlPayload(value.dataUrl);
  fs.writeFileSync(videoPath, Buffer.from(encodedVideo.base64, "base64"));
  return {
    path: videoPath,
    bytes: fs.statSync(videoPath).size,
    mimeType: encodedVideo.mimeType,
    durationMs: value.durationMs ?? durationMs,
    fps: value.fps ?? fps
  };
}

async function recordScreenshotMp4(
  send,
  { mp4Path, ffmpegPath, durationMs, fps, deterministicCapture }
) {
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`MP4 capture requires ffmpeg, but it was not found at: ${ffmpegPath}`);
  }
  const frameCount = Math.max(2, Math.round((Math.max(250, durationMs) / 1000) * Math.max(1, fps)));
  const frameDir = `${mp4Path}.frames`;
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });
  const playbackSamples = [];
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const elapsedSeconds = frameIndex / Math.max(1, fps);
    const playbackState = deterministicCapture
      ? await renderAppAtTime(send, elapsedSeconds)
      : await forceAppRenderFrame(send);
    if (frameIndex === 0 || frameIndex === frameCount - 1 || frameIndex % Math.max(1, fps) === 0) {
      playbackSamples.push({ frameIndex, elapsedSeconds, playbackState });
    }
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    const framePath = path.join(frameDir, `frame-${String(frameIndex).padStart(4, "0")}.png`);
    fs.writeFileSync(framePath, Buffer.from(screenshot.data, "base64"));
    await sleep(Math.max(16, Math.round(1000 / Math.max(1, fps))));
  }
  fs.rmSync(mp4Path, { force: true });
  const ffmpegResult = await runProcess(ffmpegPath, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-framerate",
    String(fps),
    "-i",
    path.join(frameDir, "frame-%04d.png"),
    "-vf",
    "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    mp4Path
  ]);
  fs.rmSync(frameDir, { recursive: true, force: true });
  const bytes = fs.existsSync(mp4Path) ? fs.statSync(mp4Path).size : 0;
  if (ffmpegResult.exitCode !== 0 || bytes <= 4096) {
    throw new Error(
      `MP4 capture failed: ${JSON.stringify({
        ffmpegPath,
        exitCode: ffmpegResult.exitCode,
        stderr: ffmpegResult.stderr.slice(-2000),
        stdout: ffmpegResult.stdout.slice(-2000),
        bytes
      })}`
    );
  }
  return {
    path: mp4Path,
    bytes,
    durationMs,
    fps,
    frameCount,
    deterministicCapture,
    playbackSamples
  };
}

async function beginDeterministicAppCapture(send) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(() => {
      const begin = window.__auroraCatalogVfxPreviewBeginDeterministicCapture;
      const areaBegin = window.__auroraAreaVfxPreviewBeginDeterministicCapture;
      const proofStart = window.__AURORA_VFX_PROOF_START__;
      const selected =
        typeof begin === "function"
          ? begin
          : typeof areaBegin === "function"
            ? areaBegin
            : proofStart;
      if (typeof selected === "function") {
        return Boolean(selected());
      }
      return typeof window.__AURORA_VFX_PROOF_RENDER_AT__ === "function";
    })()`
  });
  return result.result.value === true;
}

async function renderAppAtTime(send, elapsedSeconds) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(() => {
      const renderAtTime = window.__auroraCatalogVfxPreviewRenderAtTime;
      const areaRenderAtTime = window.__auroraAreaVfxPreviewRenderAtTime;
      const proofRenderAtTime = window.__AURORA_VFX_PROOF_RENDER_AT__;
      const selected =
        typeof renderAtTime === "function"
          ? renderAtTime
          : typeof areaRenderAtTime === "function"
            ? areaRenderAtTime
            : proofRenderAtTime;
      return typeof selected === "function"
        ? selected(${JSON.stringify(elapsedSeconds)})
        : null;
    })()`
  });
  return result.result.value ?? null;
}

async function forceAppRenderFrame(send) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(() => new Promise((resolve) => {
      const finish = (value) => resolve(value);
      const forceRender = window.__auroraCatalogVfxPreviewForceRender;
      const areaForceRender = window.__auroraAreaVfxPreviewForceRender;
      const selected = typeof forceRender === "function" ? forceRender : areaForceRender;
      if (typeof selected === "function") {
        try {
          finish({ ok: Boolean(selected()), source: "vfx-preview-force-render" });
        } catch (error) {
          finish({
            ok: false,
            source: "catalog-vfx-preview-force-render",
            error: error instanceof Error ? error.message : String(error)
          });
        }
        return;
      }
      requestAnimationFrame(() => finish({ ok: true, source: "requestAnimationFrame" }));
    }))()`
  });
  return result.result.value ?? null;
}

function parseDataUrlPayload(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || commaIndex < 0) {
    throw new Error("Recorded canvas video was not returned as a data URL");
  }
  const metadata = dataUrl.slice("data:".length, commaIndex);
  if (!metadata.includes(";base64")) {
    throw new Error(`Recorded canvas video data URL was not base64 encoded: ${metadata}`);
  }
  return {
    mimeType: metadata.replace(/;base64$/u, ""),
    base64: dataUrl.slice(commaIndex + 1)
  };
}

async function createPersistedAuthState({ authBaseUrl, username, password }) {
  const loginResponse = await fetch(`${authBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const loginPayload = await parseJsonResponse(loginResponse, "login");
  const accessToken = loginPayload.data?.session?.accessToken;
  if (!accessToken) {
    throw new Error("Backend login returned no access token.");
  }
  const meResponse = await fetch(`${authBaseUrl}/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  const mePayload = await parseJsonResponse(meResponse, "me");
  const role = mePayload.data?.roles?.[0] ?? "builder";
  return {
    session: {
      accessToken,
      issuedAt: loginPayload.data.session.issuedAt,
      expiresAt: loginPayload.data.session.expiresAt,
      user: {
        id: mePayload.data?.userId ?? loginPayload.data?.user?.userId ?? "u_builder_001",
        username,
        displayName:
          mePayload.data?.displayName ?? loginPayload.data?.user?.displayName ?? "Builder User",
        role
      }
    },
    authorization: {
      role,
      permissions: Array.isArray(mePayload.data?.permissions) ? mePayload.data.permissions : []
    }
  };
}

async function parseJsonResponse(response, label) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${label} request failed with status ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function seedBrowserAuthState(send, seededAuthState) {
  await send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `(() => {
      window.localStorage.setItem(
        "aurora_web.auth_session.v1",
        ${JSON.stringify(JSON.stringify(seededAuthState))}
      );
      window.localStorage.setItem("aurora_web.workspace_mode.v1", "placeables_mode");
      return true;
    })()`
  });
}

async function waitForLoginOrApp(send) {
  let lastStatus = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const status = await readLoginStatus(send);
    lastStatus = status;
    if (status?.hasUsername || status?.routePath === "/app") {
      return status;
    }
    await sleep(150);
  }
  return lastStatus;
}

async function waitForAppVfxStatus(
  send,
  waitAttempts = 240,
  { requirePlaceableTextureSettled = false } = {}
) {
  let lastStatus = null;
  for (let attempt = 0; attempt < waitAttempts; attempt += 1) {
    const status = await readAppVfxStatus(send, { requirePlaceableTextureSettled });
    lastStatus = status;
    if (status?.ok) {
      return status;
    }
    await sleep(250);
  }
  return lastStatus;
}

async function readLoginStatus(send) {
  const status = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => ({
      href: window.location.href,
      routePath: window.location.pathname,
      hasUsername: Boolean(document.querySelector("#username")),
      hasPassword: Boolean(document.querySelector("#password"))
    }))()`
  });
  return status.result.value;
}

async function readAppVfxStatus(send, { requirePlaceableTextureSettled = false } = {}) {
  const status = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const requirePlaceableTextureSettled = ${JSON.stringify(requirePlaceableTextureSettled)};
      const runner = document.querySelector("[data-testid='catalog-vfx-preview-runner']");
      const fixtureRunner = document.querySelector("[data-testid='vfx-fixture-runner']");
      const comparisonRunner = document.querySelector("[data-testid='nwn-vfx-comparison-runner']");
      const areaRunner = document.querySelector("[data-testid='area-light-shadow-preview-runner']");
      const catalogFrameScript = document.querySelector("#catalog-vfx-preview-frame");
      const areaFrameScript = document.querySelector("#area-light-shadow-preview-frame");
      const catalogFrameJson = (() => {
        try {
          return catalogFrameScript?.textContent ? JSON.parse(catalogFrameScript.textContent) : null;
        } catch (error) {
          return {
            parseError: String(error),
            text: catalogFrameScript?.textContent ?? ""
          };
        }
      })();
      const areaFrameJson = (() => {
        try {
          return areaFrameScript?.textContent ? JSON.parse(areaFrameScript.textContent) : null;
        } catch (error) {
          return {
            parseError: String(error),
            text: areaFrameScript?.textContent ?? ""
          };
        }
      })();
      const runtimeObservability = (() => {
        try {
          const comparisonReport =
            window.__AURORA_VFX_PROOF__?.runtimeObservability ?? null;
          if (
            window.location.pathname === "/dev/nwn-vfx-comparison" &&
            comparisonReport
          ) {
            return comparisonReport;
          }
          const readReport =
            window.location.pathname === "/dev/area-light-shadow-preview"
              ? window.__auroraAreaVfxPreviewGetRuntimeObservability
              : window.__auroraCatalogVfxPreviewGetRuntimeObservability;
          return typeof readReport === "function" ? readReport() : null;
        } catch (error) {
          return {
            version: null,
            proofGate: {
              status: "fail",
              blockerManifest: ["runtime-observability-read-failed"]
            },
            readError: error instanceof Error ? error.message : String(error)
          };
        }
      })();
      const placeableLightingProof = (() => {
        try {
          const readSnapshot = window.__auroraAreaPlaceableLightingGetProofSnapshot;
          return typeof readSnapshot === "function" ? readSnapshot() : null;
        } catch (error) {
          return {
            version: null,
            status: "blocked",
            retailParityStatus: "blocked_pending_matched_nwn_oracle",
            blockerCodes: ["APL-PROOF-SNAPSHOT-READ-FAILED"],
            readError: error instanceof Error ? error.message : String(error)
          };
        }
      })();
      const runtime = document.querySelector("[data-app-vfx-draw-metrics-status], [data-placeable-2da-light-status], .workspace-render-canvas, [aria-label='workspace render canvas'], canvas");
      const canvas = document.querySelector("canvas") ?? runtime;
      const searchbox = document.querySelector("input[aria-label='Filter placeables']");
      const activeType = Array.from(document.querySelectorAll("button"))
        .find((button) => button.getAttribute("aria-pressed") === "true" && button.textContent?.trim() === "VFX")
        ?.textContent?.trim() ?? null;
      const text = document.body?.innerText ?? "";
      const diagnosticCodes = Array.from(
        new Set((text.match(/VFX_[A-Z0-9_]+|PLACEABLE_RENDER_READY/g) ?? []))
      );
      const canvasRect = canvas?.getBoundingClientRect();
      const appVfxDrawMetricsStatus = runtime?.getAttribute("data-app-vfx-draw-metrics-status") ?? null;
      const appVfxDrawParticles = runtime?.getAttribute("data-app-vfx-draw-particles") ?? null;
      const appVfxRenderedVertices = runtime?.getAttribute("data-app-vfx-rendered-vertices") ?? null;
      const appVfxDrawLanes = runtime?.getAttribute("data-app-vfx-draw-lanes") ?? "";
      const placeableModelTextureLoaded = runtime?.getAttribute("data-placeable-model-texture-loaded") ?? null;
      const placeableModelTextureCount = runtime?.getAttribute("data-placeable-model-texture-count") ?? null;
      const placeableModelTextureStatus = runtime?.getAttribute("data-placeable-model-texture-status") ?? null;
      const appVfxDrawParticlesNumber = Number(appVfxDrawParticles ?? 0);
      const appVfxRenderedVerticesNumber = Number(appVfxRenderedVertices ?? 0);
      const appVfxDrawLanesList = appVfxDrawLanes.split("|").filter(Boolean);
      const textureApplied =
        placeableModelTextureStatus === "applied" &&
        Number(placeableModelTextureLoaded ?? 0) === Number(placeableModelTextureCount ?? -1);
      const devRenderStatus = runner?.getAttribute("data-render-status") ?? null;
      const devFrontendRuntimeRevision =
        runner?.getAttribute("data-vfx-preview-runtime-revision") ?? null;
      const devCanvasNonblank = runner?.getAttribute("data-canvas-nonblank") ?? null;
      const devObjectPixels = Number(runner?.getAttribute("data-object-pixels") ?? 0);
      const devDrawParticles = Number(runner?.getAttribute("data-draw-particles") ?? 0);
      const devRenderedVertices = Number(runner?.getAttribute("data-rendered-vertices") ?? 0);
      const devTextureStatus = runner?.getAttribute("data-texture-status") ?? null;
      const devFlameEmitterNode = runner?.getAttribute("data-flame-emitter-node") ?? null;
      const devFlameEmitterParticleCount = Number(
        runner?.getAttribute("data-flame-emitter-particle-count") ?? 0
      );
      const devFlameEmitterBatchVisibleCount = Number(
        runner?.getAttribute("data-flame-emitter-batch-visible-count") ?? 0
      );
      const devFlameEmitterBatchSlotCount = Number(
        runner?.getAttribute("data-flame-emitter-batch-slot-count") ?? 0
      );
      const devFlameEmitterColumnPreviewMode =
        runner?.getAttribute("data-flame-emitter-column-preview-mode") ?? null;
      const devFlameEmitterAxisPreviewMode =
        runner?.getAttribute("data-flame-emitter-axis-preview-mode") ?? null;
      const devFlameEmitterColorPreviewMode =
        runner?.getAttribute("data-flame-emitter-color-preview-mode") ?? null;
      const devFlameEmitterAlphaPreviewMode =
        runner?.getAttribute("data-flame-emitter-alpha-preview-mode") ?? null;
      const devFlameEmitterDensityPreviewMode =
        runner?.getAttribute("data-flame-emitter-density-preview-mode") ?? null;
      const devFlameEmitterCorePreviewMode =
        runner?.getAttribute("data-flame-emitter-core-preview-mode") ?? null;
      const devFlameEmitterSchedulePreviewMode =
        runner?.getAttribute("data-flame-emitter-schedule-preview-mode") ?? null;
      const devFlameEmitterTransformUnitScalePreviewMode =
        runner?.getAttribute("data-flame-emitter-transform-unit-scale-preview-mode") ?? null;
      const devEmitterAxisDebug =
        runner?.getAttribute("data-emitter-axis-debug") ?? null;
      const devEmitterAxisDebugSamples =
        runner?.getAttribute("data-emitter-axis-debug-samples") ?? "";
      const devCampfireCoreCount = Number(
        runner?.getAttribute("data-campfire-core-count") ?? 0
      );
      const devCampfireCoreSamples =
        runner?.getAttribute("data-campfire-core-samples") ?? "";
      const readFrameBooleanString = (value) =>
        typeof value === "boolean" ? String(value) : value == null ? null : String(value);
      const devAuroraVfxPayloadReady =
        runner?.getAttribute("data-aurora-vfx-payload-ready") ??
        readFrameBooleanString(catalogFrameJson?.auroraVfxPayloadReady);
      const devAuroraVfxBackendPayloadReady =
        runner?.getAttribute("data-aurora-vfx-backend-payload-ready") ??
        readFrameBooleanString(catalogFrameJson?.auroraVfxBackendPayloadReady);
      const devAuroraVfxBackendCanonical =
        runner?.getAttribute("data-aurora-vfx-backend-canonical") ??
        readFrameBooleanString(catalogFrameJson?.auroraVfxBackendCanonical);
      const devAuroraVfxCanonicalStatus =
        runner?.getAttribute("data-aurora-vfx-canonical-status") ??
        catalogFrameJson?.auroraVfxCanonicalStatus ??
        null;
      const devAuroraVfxPreviewMode =
        runner?.getAttribute("data-aurora-vfx-preview-mode") ??
        catalogFrameJson?.auroraVfxPreviewMode ??
        null;
      const devAuroraVfxRenderer =
        runner?.getAttribute("data-aurora-vfx-renderer") ??
        catalogFrameJson?.auroraVfxRenderer ??
        null;
      const devAuroraVfxCanonicalRenderer =
        runner?.getAttribute("data-aurora-vfx-canonical-renderer") ??
        readFrameBooleanString(catalogFrameJson?.auroraVfxCanonicalRenderer);
      const devAuroraVfxCanonicalPlaceableComposition =
        runner?.getAttribute("data-aurora-vfx-canonical-placeable-composition") ??
        readFrameBooleanString(catalogFrameJson?.auroraVfxCanonicalPlaceableComposition);
      const devAuroraVfxCanonicalPlaceableCompositionMode =
        runner?.getAttribute("data-aurora-vfx-canonical-placeable-composition-mode") ??
        catalogFrameJson?.auroraVfxCanonicalPlaceableCompositionMode ??
        null;
      const devAuroraVfxCanonicalPlaceableCompositionReason =
        runner?.getAttribute("data-aurora-vfx-canonical-placeable-composition-reason") ??
        catalogFrameJson?.auroraVfxCanonicalPlaceableCompositionReason ??
        null;
      const devAuroraVfxCanonicalLightSibling =
        runner?.getAttribute("data-aurora-vfx-canonical-light-sibling") ??
        readFrameBooleanString(catalogFrameJson?.auroraVfxCanonicalLightSibling);
      const devAuroraVfxCanonicalLightSiblingMode =
        runner?.getAttribute("data-aurora-vfx-canonical-light-sibling-mode") ??
        catalogFrameJson?.auroraVfxCanonicalLightSiblingMode ??
        null;
      const devAuroraVfxDiagnosticCodes = (
        runner?.getAttribute("data-aurora-vfx-diagnostic-codes") ??
        catalogFrameJson?.auroraVfxDiagnosticCodes?.join("|") ??
        ""
      )
        .split("|")
        .filter(Boolean);
      const devSourceMdlEmitterPreviewStatus =
        runner?.getAttribute("data-source-mdl-emitter-preview-status") ??
        catalogFrameJson?.sourceMdlEmitterPreviewStatus ??
        null;
      const devSourceMdlEmitterPreviewMode =
        runner?.getAttribute("data-source-mdl-emitter-preview-mode") ??
        catalogFrameJson?.sourceMdlEmitterPreviewMode ??
        null;
      const devSourceMdlEmitterPreviewVisibilityMode =
        runner?.getAttribute("data-source-mdl-emitter-preview-visibility-mode") ??
        catalogFrameJson?.sourceMdlEmitterPreviewVisibilityMode ??
        null;
      const devSourceMdlStaticGeometryNodeCount = Number(
        runner?.getAttribute("data-source-mdl-static-geometry-node-count") ??
          catalogFrameJson?.sourceMdlStaticGeometryNodeCount ??
          0
      );
      const devSourceMdlStaticGeometryNodes = (
        runner?.getAttribute("data-source-mdl-static-geometry-nodes") ??
        catalogFrameJson?.sourceMdlStaticGeometryNodes?.join("|") ??
        ""
      )
        .split("|")
        .filter(Boolean);
      const devEmitterCount = Number(
        runner?.getAttribute("data-emitter-count") ?? catalogFrameJson?.emitterCount ?? 0
      );
      const devPreviewMeshCount = Number(catalogFrameJson?.meshCount ?? 0);
      const devPreviewVisibleMeshCount = Number(catalogFrameJson?.visibleMeshCount ?? 0);
      const devTextureUrls = (runner?.getAttribute("data-texture-urls") ?? "")
        .split("|")
        .filter(Boolean);
      const devPlaceableModelTextureStatus =
        runner?.getAttribute("data-placeable-model-texture-status") ?? null;
      const devPlaceableModelTextureLoaded = Number(
        runner?.getAttribute("data-placeable-model-texture-loaded") ?? 0
      );
      const devPlaceableModelTextureCount = Number(
        runner?.getAttribute("data-placeable-model-texture-count") ?? 0
      );
      const devPlaceableModelTextureSettled =
        (devPlaceableModelTextureStatus === "applied" &&
          devPlaceableModelTextureCount > 0 &&
          devPlaceableModelTextureLoaded >= devPlaceableModelTextureCount) ||
        (devPlaceableModelTextureStatus === "not-applicable" &&
          devTextureUrls.length === 0 &&
          devPlaceableModelTextureCount === 0);
      const devPlaceableTwoDaLightStatus =
        runner?.getAttribute("data-placeable-2da-light-status") ?? null;
      const devPlaceableTwoDaLightSamples =
        runner?.getAttribute("data-placeable-2da-light-samples") ?? "";
      const devPlaceableTwoDaLightSourceCount = Number(
        runner?.getAttribute("data-placeable-2da-light-source-count") ?? 0
      );
      const devPlaceableTwoDaLightPointLightCount = Number(
        runner?.getAttribute("data-placeable-2da-light-point-light-count") ?? 0
      );
      const devPlaceableTwoDaLightDisabledCount = Number(
        runner?.getAttribute("data-placeable-2da-light-disabled-count") ?? 0
      );
      const devPlaceableTwoDaLightReady =
        (devPlaceableTwoDaLightStatus === "active" &&
          devPlaceableTwoDaLightSourceCount > 0 &&
          devPlaceableTwoDaLightPointLightCount > 0) ||
        (devPlaceableTwoDaLightStatus === "disabled" &&
          devPlaceableTwoDaLightDisabledCount > 0);
      const devPlaceableTwoDaLightProofReady =
        devPlaceableTwoDaLightReady &&
        (devPlaceableModelTextureSettled ||
          (!requirePlaceableTextureSettled && devObjectPixels > 80));
      const devSourceMdlEmitterOverlayReady =
        devSourceMdlEmitterPreviewStatus === "active" &&
        devSourceMdlEmitterPreviewMode === "placeable-source-mdl-emitter-overlay" &&
        devEmitterCount > 0 &&
        devPreviewMeshCount > 0 &&
        devPreviewVisibleMeshCount > 0 &&
        devTextureStatus === "chunk-model-applied" &&
        devPlaceableModelTextureSettled;
      const devCanonicalRendererReady =
        devAuroraVfxBackendPayloadReady === "true" &&
        devAuroraVfxBackendCanonical === "true" &&
        devAuroraVfxCanonicalStatus === "canonical" &&
        devAuroraVfxRenderer === "canonical" &&
        devAuroraVfxCanonicalRenderer === "true" &&
        (devCanvasNonblank === "true" || devObjectPixels > 80) &&
        (devDrawParticles > 0 || devRenderedVertices > 0 || devPreviewVisibleMeshCount > 0);
      const devCanonicalHybridCompositionReady =
        devCanonicalRendererReady &&
        devAuroraVfxCanonicalPlaceableComposition === "true" &&
        devAuroraVfxCanonicalPlaceableCompositionMode === "source-mdl-static-emitter-light" &&
        devSourceMdlStaticGeometryNodeCount > 0 &&
        devEmitterCount > 0 &&
        devSourceMdlEmitterPreviewStatus !== "active";
      const devCanonicalSourceMdlCompositionRequired =
        devAuroraVfxBackendCanonical === "true" &&
        devSourceMdlStaticGeometryNodeCount > 0;
      const devCanvasReady = devCanvasNonblank === "true" || devObjectPixels > 80;
      const devDrawReady =
        devDrawParticles > 0 ||
        devRenderedVertices > 0 ||
        devPlaceableTwoDaLightProofReady ||
        devSourceMdlEmitterOverlayReady ||
        devCanonicalRendererReady;
      const devCompositionGateReady =
        !devCanonicalSourceMdlCompositionRequired ||
        devCanonicalHybridCompositionReady;
      const devRuntimeObservabilityReady =
        runtimeObservability?.version === "aurora-vfx-runtime-observability/v1" &&
        runtimeObservability?.proofGate?.status === "pass";
      const fixtureRenderStatus = fixtureRunner?.getAttribute("data-render-status") ?? null;
      const fixtureCanvasNonblank = fixtureRunner?.getAttribute("data-canvas-nonblank") ?? null;
      const fixtureObjectPixels = Number(fixtureRunner?.getAttribute("data-object-pixels") ?? 0);
      const fixtureRenderedDrawParticles = Number(
        fixtureRunner?.getAttribute("data-rendered-draw-particles") ?? 0
      );
      const fixtureRenderedVertices = Number(
        fixtureRunner?.getAttribute("data-rendered-vertices") ?? 0
      );
      const fixtureRenderedChunkModelCount = Number(
        fixtureRunner?.getAttribute("data-rendered-chunk-model-count") ?? 0
      );
      const fixtureRenderedChunkLaneCount = Number(
        fixtureRunner?.getAttribute("data-rendered-chunk-lane-count") ?? 0
      );
      const fixtureRenderedChunkLaneResourceResolveStatus =
        fixtureRunner?.getAttribute("data-rendered-chunk-lane-resource-resolve-status") ??
        null;
      const fixtureRenderedChunkLaneRendererPending =
        fixtureRunner?.getAttribute("data-rendered-chunk-lane-renderer-pending") ?? null;
      const fixtureRenderedChunkLaneModelPreviewStatus =
        fixtureRunner?.getAttribute("data-rendered-chunk-lane-model-preview-status") ?? null;
      const fixtureRenderedBoundsWidth = Number(
        fixtureRunner?.getAttribute("data-rendered-bounds-width") ?? 0
      );
      const fixtureRenderedBoundsHeight = Number(
        fixtureRunner?.getAttribute("data-rendered-bounds-height") ?? 0
      );
      const fixtureChunkModelReady =
        fixtureRenderedChunkModelCount > 0 &&
        fixtureRenderedChunkLaneCount > 0 &&
        fixtureRenderedChunkLaneResourceResolveStatus === "resolved" &&
        fixtureRenderedChunkLaneRendererPending === "false" &&
        fixtureRenderedChunkLaneModelPreviewStatus ===
          "applied-local-model-preview-retail-unverified" &&
        fixtureRenderedBoundsWidth > 0 &&
        fixtureRenderedBoundsHeight > 0;
      const devReady =
        window.location.pathname === "/dev/catalog-vfx-preview" &&
        devRenderStatus === "ready" &&
        (!requirePlaceableTextureSettled || devPlaceableModelTextureSettled) &&
        devCompositionGateReady &&
        devRuntimeObservabilityReady &&
        devCanvasReady &&
        devDrawReady;
      const fixtureReady =
        window.location.pathname.startsWith("/dev/vfx-fixture") &&
        fixtureRenderStatus === "rendered" &&
        (fixtureCanvasNonblank === "true" || fixtureObjectPixels > 80) &&
        (fixtureRenderedDrawParticles > 0 || fixtureRenderedVertices > 0 || fixtureChunkModelReady);
      const comparisonReady =
        window.location.pathname === "/dev/nwn-vfx-comparison" &&
        comparisonRunner?.getAttribute("data-render-state") === "ready" &&
        comparisonRunner?.getAttribute("data-one-trigger") === "true" &&
        comparisonRunner?.getAttribute("data-loop") === "false" &&
        runtimeObservability?.version === "aurora-vfx-runtime-observability/v1" &&
        runtimeObservability?.proofGate?.status === "pass" &&
        ((comparisonRunner?.getAttribute("data-message") === "armed" &&
          typeof window.__AURORA_VFX_PROOF_START__ === "function" &&
          typeof window.__AURORA_VFX_PROOF_RENDER_AT__ === "function") ||
          (comparisonRunner?.getAttribute("data-message") ===
            "static-timeline-armed" &&
            typeof window.__AURORA_VFX_PROOF_RENDER_AT__ === "function") ||
          Number(comparisonRunner?.getAttribute("data-visible-frame-count") ?? 0) === 1);
      const areaReady =
        window.location.pathname === "/dev/area-light-shadow-preview" &&
        areaRunner?.getAttribute("data-render-status") === "ready" &&
        Number(areaRunner?.getAttribute("data-vfx-playback-root-count") ?? 0) > 0 &&
        (areaRunner?.getAttribute("data-placeable-lighting-proof-vfx") === "false" ||
          (Number(areaRunner?.getAttribute("data-vfx-visible-draw-mesh-count") ?? 0) > 0 &&
            Number(areaRunner?.getAttribute("data-vfx-visible-draw-particle-count") ?? 0) > 0)) &&
        areaRunner?.getAttribute("data-placeable-model-status") === "loaded" &&
        runtimeObservability?.version === "aurora-vfx-runtime-observability/v1" &&
        (areaRunner?.getAttribute("data-placeable-lighting-proof-vfx") === "false"
          ? runtimeObservability?.assetSettlement?.status === "settled" &&
            placeableLightingProof?.version === "aurora-placeable-lighting-proof-snapshot/v2"
          : runtimeObservability?.proofGate?.status === "pass");
      const isAreaRoute =
        window.location.pathname === "/dev/area-light-shadow-preview";
      const areaDrawReady =
        areaRunner?.getAttribute("data-placeable-lighting-proof-vfx") === "false" ||
        (Number(areaRunner?.getAttribute("data-vfx-visible-draw-mesh-count") ?? 0) > 0 &&
          Number(areaRunner?.getAttribute("data-vfx-visible-draw-particle-count") ?? 0) > 0);
      const areaPlaceableModelTextureStatus =
        areaRunner?.getAttribute("data-placeable-model-texture-status") ?? null;
      const areaPlaceableModelTextureCount = Number(
        areaRunner?.getAttribute("data-placeable-model-texture-count") ?? 0
      );
      const areaPlaceableModelTextureLoaded = Number(
        areaRunner?.getAttribute("data-placeable-model-texture-loaded") ?? 0
      );
      const areaPlaceableModelTextureSettled =
        areaRunner?.getAttribute("data-placeable-model-texture-settled") === "true" &&
        ((areaPlaceableModelTextureStatus === "applied" &&
          areaPlaceableModelTextureCount > 0 &&
          areaPlaceableModelTextureLoaded >= areaPlaceableModelTextureCount) ||
          (areaPlaceableModelTextureStatus === "not-applicable" &&
            areaPlaceableModelTextureCount === 0 &&
            areaPlaceableModelTextureLoaded === 0));
      const appReady =
        window.location.pathname === "/app" &&
        appVfxDrawMetricsStatus === "ready" &&
        appVfxDrawParticlesNumber > 0 &&
        appVfxRenderedVerticesNumber > 0 &&
        textureApplied;
      return {
        ok:
          appReady ||
          devReady ||
          fixtureReady ||
          comparisonReady ||
          (areaReady && areaPlaceableModelTextureSettled),
        proofGates: {
          routeReady:
            window.location.pathname === "/dev/catalog-vfx-preview" ||
            window.location.pathname === "/dev/nwn-vfx-comparison" ||
            isAreaRoute,
          renderStatusReady: isAreaRoute
            ? areaRunner?.getAttribute("data-render-status") === "ready"
            : devRenderStatus === "ready",
          canvasReady: isAreaRoute ? Boolean(canvas) : devCanvasReady,
          drawReady: isAreaRoute ? areaDrawReady : devDrawReady,
          textureSettlementRequired: isAreaRoute
            ? true
            : requirePlaceableTextureSettled,
          textureSettled: isAreaRoute
            ? areaPlaceableModelTextureSettled
            : devPlaceableModelTextureSettled,
          canonicalSourceMdlCompositionRequired:
            isAreaRoute
              ? runtimeObservability?.hostGraph?.compositionRequired === true
              : devCanonicalSourceMdlCompositionRequired,
          canonicalSourceMdlCompositionReady:
            isAreaRoute
              ? runtimeObservability?.hostGraph?.composition === true
              : devCanonicalHybridCompositionReady,
          canonicalSourceMdlCompositionReason:
            isAreaRoute
              ? runtimeObservability?.hostGraph?.compositionReason ?? null
              : devAuroraVfxCanonicalPlaceableCompositionReason,
          runtimeObservabilityReady: devRuntimeObservabilityReady,
          runtimeObservabilityVersion: runtimeObservability?.version ?? null,
          runtimeObservabilityProofStatus:
            runtimeObservability?.proofGate?.status ?? null,
          runtimeObservabilityBlockers:
            runtimeObservability?.proofGate?.blockerManifest ?? []
        },
        runtimeObservability,
        placeableLightingProof,
        areaFrameJson,
        href: window.location.href,
        routePath: window.location.pathname,
        comparison: comparisonRunner
          ? {
              fixtureId: comparisonRunner.getAttribute("data-fixture-id"),
              renderState: comparisonRunner.getAttribute("data-render-state"),
              phase: comparisonRunner.getAttribute("data-phase"),
              elapsedSeconds: Number(comparisonRunner.getAttribute("data-elapsed-seconds") ?? 0),
              effectSeconds: Number(comparisonRunner.getAttribute("data-effect-seconds") ?? 0),
              frameIndex: Number(comparisonRunner.getAttribute("data-frame-index") ?? 0),
              frameCount: Number(comparisonRunner.getAttribute("data-frame-count") ?? 0),
              drawParticles: Number(comparisonRunner.getAttribute("data-draw-particles") ?? 0),
              visibleFrameCount: Number(comparisonRunner.getAttribute("data-visible-frame-count") ?? 0),
              meshDiagnostics: JSON.parse(
                comparisonRunner.getAttribute("data-mesh-diagnostics") ?? "[]"
              ),
              runtimeObservabilityVersion:
                comparisonRunner.getAttribute("data-vfx-runtime-observability-version"),
              runtimeObservabilityProofStatus:
                comparisonRunner.getAttribute("data-vfx-runtime-proof-gate-status"),
              runtimeObservabilityBlockers:
                (comparisonRunner.getAttribute("data-vfx-runtime-proof-blockers") ?? "")
                  .split("|")
                  .filter(Boolean),
              oneTrigger: comparisonRunner.getAttribute("data-one-trigger"),
              loop: comparisonRunner.getAttribute("data-loop"),
              message: comparisonRunner.getAttribute("data-message"),
              hasStartHook: typeof window.__AURORA_VFX_PROOF_START__ === "function",
              hasRenderAtHook: typeof window.__AURORA_VFX_PROOF_RENDER_AT__ === "function"
            }
          : null,
        areaPreview: areaRunner
          ? {
              renderStatus: areaRunner.getAttribute("data-render-status"),
              areaId: areaRunner.getAttribute("data-area-id"),
              oracleFixture: areaRunner.getAttribute("data-oracle-fixture"),
              renderObjectCount: Number(areaRunner.getAttribute("data-render-object-count") ?? 0),
              renderedObjectSamples: JSON.parse(
                areaRunner.getAttribute("data-rendered-object-samples") ?? "[]"
              ),
              captureTimeSeconds: Number(areaRunner.getAttribute("data-capture-time-seconds") ?? 0),
              playbackRootCount: Number(areaRunner.getAttribute("data-vfx-playback-root-count") ?? 0),
              visibleDrawMeshCount: Number(areaRunner.getAttribute("data-vfx-visible-draw-mesh-count") ?? 0),
              visibleDrawParticleCount: Number(areaRunner.getAttribute("data-vfx-visible-draw-particle-count") ?? 0),
              textureReferences: (areaRunner.getAttribute("data-vfx-visible-texture-references") ?? "")
                .split("|")
                .filter(Boolean),
              placeableModelStatus: areaRunner.getAttribute("data-placeable-model-status"),
              placeableModelTextureStatus: areaPlaceableModelTextureStatus,
              placeableModelTextureCount: areaPlaceableModelTextureCount,
              placeableModelTextureLoaded: areaPlaceableModelTextureLoaded,
              placeableModelTextureSettled: areaPlaceableModelTextureSettled,
              placeableModelMeshCount: Number(
                areaRunner.getAttribute("data-placeable-model-mesh-count") ?? 0
              ),
              placeableModelUrl: areaRunner.getAttribute("data-placeable-model-url"),
              placeableSourceLineageStatus: areaRunner.getAttribute(
                "data-placeable-source-lineage-status"
              ),
              placeableSourceModelObjectKeys: (
                areaRunner.getAttribute("data-placeable-source-model-object-keys") ?? ""
              )
                .split("|")
                .filter(Boolean),
              placeableSourceModelHashes: (
                areaRunner.getAttribute("data-placeable-source-model-hashes") ?? ""
              )
                .split("|")
                .filter(Boolean),
              placeableSourceLineageBlockers: (
                areaRunner.getAttribute("data-placeable-source-lineage-blockers") ?? ""
              )
                .split("|")
                .filter(Boolean),
              placeableLightProjectionStatus: areaRunner.getAttribute(
                "data-placeable-light-projection-status"
              ),
              placeableLightProjectionBlockers: (
                areaRunner.getAttribute("data-placeable-light-projection-blockers") ?? ""
              )
                .split("|")
                .filter(Boolean),
              terrainSourceLineageStatus: areaRunner.getAttribute(
                "data-terrain-source-lineage-status"
              ),
              terrainSourceModelObjectKeys: (
                areaRunner.getAttribute("data-terrain-source-model-object-keys") ?? ""
              )
                .split("|")
                .filter(Boolean),
              terrainSourceModelHashes: (
                areaRunner.getAttribute("data-terrain-source-model-hashes") ?? ""
              )
                .split("|")
                .filter(Boolean),
              terrainModelAssetObjectKeys: (
                areaRunner.getAttribute("data-terrain-model-asset-object-keys") ?? ""
              )
                .split("|")
                .filter(Boolean),
              terrainModelAssetHashes: (
                areaRunner.getAttribute("data-terrain-model-asset-hashes") ?? ""
              )
                .split("|")
                .filter(Boolean),
              terrainTextureObjectKeys: (
                areaRunner.getAttribute("data-terrain-texture-object-keys") ?? ""
              )
                .split("|")
                .filter(Boolean),
              terrainTextureHashes: (
                areaRunner.getAttribute("data-terrain-texture-hashes") ?? ""
              )
                .split("|")
                .filter(Boolean),
              terrainSourceLineageBlockers: (
                areaRunner.getAttribute("data-terrain-source-lineage-blockers") ?? ""
              )
                .split("|")
                .filter(Boolean),
              pointLightCount: Number(areaRunner.getAttribute("data-placeable-two-da-light-point-light-count") ?? 0),
              scenePointLightSamples: (runtime?.getAttribute("data-scene-point-light-samples") ?? "")
                .split("|")
                .filter(Boolean),
              placeableLightingProof,
              placeableLightingProofDom: {
                status: areaRunner.getAttribute("data-placeable-lighting-proof-status"),
                retailParityStatus: areaRunner.getAttribute(
                  "data-placeable-lighting-proof-retail-parity-status"
                ),
                blockers: (areaRunner.getAttribute("data-placeable-lighting-proof-blockers") ?? "")
                  .split("|")
                  .filter(Boolean),
                receiverMaterialFamilies: JSON.parse(
                  areaRunner.getAttribute(
                    "data-placeable-lighting-proof-receiver-material-families"
                  ) ?? "[]"
                )
              }
            }
          : null,
        headings: Array.from(document.querySelectorAll("h1,h2,h3"))
          .map((heading) => heading.textContent?.trim())
          .filter(Boolean),
        searchValue: searchbox?.value ?? null,
        activeType,
        magicMouthRowText:
          Array.from(document.querySelectorAll("button"))
            .find((button) => button.textContent?.includes("plc_zlc_o45"))
            ?.textContent?.trim() ?? null,
        inspectorText: text.slice(0, 2000),
        diagnosticCodes,
        canvasPresent: Boolean(canvas),
        canvasRect: canvasRect
          ? {
              left: Math.round(canvasRect.left),
              top: Math.round(canvasRect.top),
              width: Math.round(canvasRect.width),
              height: Math.round(canvasRect.height)
            }
          : null,
        appVfxDrawMetricsStatus,
        appVfxDrawMetricsObjectId: runtime?.getAttribute("data-app-vfx-draw-metrics-object-id") ?? null,
        appVfxDrawParticles,
        appVfxRenderedVertices,
        appVfxDrawLanes,
        appVfxDrawMetricsSource: runtime?.getAttribute("data-app-vfx-draw-metrics-source") ?? null,
        placeableModelStatus: runtime?.getAttribute("data-placeable-model-status") ?? null,
        placeableModelLoadPhase: runtime?.getAttribute("data-placeable-model-load-phase") ?? null,
        placeableModelTextureLoaded,
        placeableModelTextureCount,
        placeableModelTextureStatus,
        devRenderStatus,
        devFrontendRuntimeRevision,
        devCanvasNonblank,
        devObjectPixels,
        devDrawParticles,
        devRenderedVertices,
        devDrawLanes: runner?.getAttribute("data-draw-lanes") ?? "",
        devTextureStatus,
        devFlameEmitterNode,
        devFlameEmitterParticleCount,
        devFlameEmitterBatchVisibleCount,
        devFlameEmitterBatchSlotCount,
        devFlameEmitterColumnPreviewMode,
        devFlameEmitterAxisPreviewMode,
        devFlameEmitterColorPreviewMode,
        devFlameEmitterAlphaPreviewMode,
        devFlameEmitterDensityPreviewMode,
        devFlameEmitterCorePreviewMode,
        devFlameEmitterSchedulePreviewMode,
        devFlameEmitterTransformUnitScalePreviewMode,
        devEmitterAxisDebug,
        devEmitterAxisDebugSamples,
        devCampfireCoreCount,
        devCampfireCoreSamples,
        devAuroraVfxPayloadReady,
        devAuroraVfxBackendPayloadReady,
        devAuroraVfxBackendCanonical,
        devAuroraVfxCanonicalStatus,
        devAuroraVfxPreviewMode,
        devAuroraVfxRenderer,
        devAuroraVfxCanonicalRenderer,
        devAuroraVfxCanonicalPlaceableComposition,
        devAuroraVfxCanonicalPlaceableCompositionMode,
        devAuroraVfxCanonicalPlaceableCompositionReason,
        devAuroraVfxCanonicalLightSibling,
        devAuroraVfxCanonicalLightSiblingMode,
        devAuroraVfxDiagnosticCodes,
        devCanonicalRendererReady,
        devCanonicalHybridCompositionReady,
        devSourceMdlEmitterPreviewStatus,
        devSourceMdlEmitterPreviewMode,
        devSourceMdlEmitterPreviewVisibilityMode,
        devSourceMdlStaticGeometryNodeCount,
        devSourceMdlStaticGeometryNodes,
        devEmitterCount,
        devPreviewMeshCount,
        devPreviewVisibleMeshCount,
        devSourceMdlEmitterOverlayReady,
        devTextureUrlCount: devTextureUrls.length,
        devPlaceableModelStatus: runner?.getAttribute("data-placeable-model-status") ?? null,
        devPlaceableModelLoadPhase:
          runner?.getAttribute("data-placeable-model-load-phase") ?? null,
        devPlaceableModelTextureStatus,
        devPlaceableModelTextureLoaded:
          runner?.getAttribute("data-placeable-model-texture-loaded") ?? null,
        devPlaceableModelTextureCount:
          runner?.getAttribute("data-placeable-model-texture-count") ?? null,
        devPlaceableModelTextureSource:
          runner?.getAttribute("data-placeable-model-texture-source") ?? null,
        devPlaceableWorldBoundsCenter:
          runner?.getAttribute("data-placeable-world-bounds-center") ?? null,
        devPlaceableWorldBoundsSize:
          runner?.getAttribute("data-placeable-world-bounds-size") ?? null,
        devPlaceableModelTextureSettled,
        devPlaceableTextureProofMode: requirePlaceableTextureSettled
          ? "require-texture-settled"
          : "allow-light-ready-before-texture-settled",
        devPlaceableTwoDaLightProofReady,
        devRenderPackageStatus: runner?.getAttribute("data-render-package-status") ?? null,
        devModelFileName: runner?.getAttribute("data-model-file-name") ?? null,
        devLightStateOverride: runner?.getAttribute("data-light-state-override") ?? null,
        devAreaShadowOpacityOverride:
          runner?.getAttribute("data-area-shadow-opacity-override") ?? null,
        devAreaShadowOpacityFactorOverride:
          runner?.getAttribute("data-area-shadow-opacity-factor-override") ?? null,
        devUseAreaLightingOverride:
          runner?.getAttribute("data-use-area-lighting-override") ?? null,
        devDisplayShadowsOverride:
          runner?.getAttribute("data-display-shadows-override") ?? null,
        devPlaceableTwoDaLightStatus,
        devPlaceableTwoDaLightSourceCount:
          runner?.getAttribute("data-placeable-2da-light-source-count") ?? null,
        devPlaceableTwoDaLightPointLightCount:
          runner?.getAttribute("data-placeable-2da-light-point-light-count") ?? null,
        devPlaceableTwoDaLightFastShadowCount:
          runner?.getAttribute("data-placeable-2da-light-fast-shadow-count") ?? null,
        devPlaceableTwoDaLightDisabledCount:
          runner?.getAttribute("data-placeable-2da-light-disabled-count") ?? null,
        devPlaceableTwoDaLightDisabledByLightStateCount:
          runner?.getAttribute("data-placeable-2da-light-disabled-by-light-state-count") ?? null,
        devPlaceableTwoDaLightDisabledByUseAreaLightingCount:
          runner?.getAttribute("data-placeable-2da-light-disabled-by-use-area-lighting-count") ?? null,
        devPlaceableTwoDaLightSamples,
        devScenePointLightRetailOrderingRuntimeProbeStatus:
          runner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-status"
          ) ?? null,
        devScenePointLightRetailOrderingRuntimeProbeProofSource:
          runner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-proof-source"
          ) ?? null,
        devScenePointLightRetailOrderingRuntimeProbeBlocker:
          runner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-blocker"
          ) ?? null,
        devScenePointLightRetailOrderingRuntimeProbeLocalOrderSource:
          runner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-local-order-source"
          ) ?? null,
        devScenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount:
          runner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-required-lane-coverage-count"
          ) ?? null,
        devScenePointLightRetailOrderingRuntimeProbePointLightSampleCount:
          runner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-point-light-sample-count"
          ) ?? null,
        devScenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount:
          runner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-non-point-request-sample-count"
          ) ?? null,
        devScenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes:
          runner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-budget-accepted-lanes"
          ) ?? null,
        devScenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes:
          runner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-budget-dropped-lanes"
          ) ?? null,
        devScenePointLightRetailOrderingRuntimeProbeBudgetUnknownLanes:
          runner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-budget-unknown-lanes"
          ) ?? null,
        devScenePointLightRetailOrderingRuntimeProbeLocalOrderSamples:
          runner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-local-order-samples"
          ) ?? null,
        devSceneShadowRuntimeProbeStatus:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-status"
          ) ?? null,
        devSceneShadowRuntimeProbeProofSource:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-proof-source"
          ) ?? null,
        devSceneShadowRuntimeProbeBlocker:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-blocker"
          ) ?? null,
        devSceneShadowRuntimeProbeLocalPixelProofStatus:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-local-pixel-proof-status"
          ) ?? null,
        devSceneShadowRuntimeProbeActiveCasterCount:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-active-caster-count"
          ) ?? null,
        devSceneShadowRuntimeProbeProjectionPreviewCount:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-projection-preview-count"
          ) ?? null,
        devSceneShadowRuntimeProbeStencilReceiverCount:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-stencil-receiver-count"
          ) ?? null,
        devSceneShadowRuntimeProbeStencilVolumePassCount:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-stencil-volume-pass-count"
          ) ?? null,
        devSceneShadowRuntimeProbeExpectedStencilPasses:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-expected-stencil-passes"
          ) ?? null,
        devSceneShadowRuntimeProbeObservedStencilPasses:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-observed-stencil-passes"
          ) ?? null,
        devSceneShadowRuntimeProbeRenderShaderNames:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-render-shader-names"
          ) ?? null,
        devSceneShadowRuntimeProbeRenderBuckets:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-render-buckets"
          ) ?? null,
        devSceneShadowRuntimeProbeSamples:
          runner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-samples"
          ) ?? null,
        devAuroraLightNodes: runner?.getAttribute("data-aurora-light-nodes") ?? "",
        devAuroraLightSamples: runner?.getAttribute("data-aurora-light-samples") ?? "",
        devAuroraLightQuadraticAtten:
          runner?.getAttribute("data-aurora-light-quadratic-atten") ?? null,
        devSourceMdlLightPayloadReady:
          runner?.getAttribute("data-source-mdl-light-payload-ready") ?? null,
        devLightSource: runner?.getAttribute("data-light-source") ?? null,
        devLightNode: runner?.getAttribute("data-light-node") ?? null,
        devLightRadius: runner?.getAttribute("data-light-radius") ?? null,
        devLightMultiplier: runner?.getAttribute("data-light-multiplier") ?? null,
        devLightColor: runner?.getAttribute("data-light-color") ?? null,
        devLightShadow: runner?.getAttribute("data-light-shadow") ?? null,
        devLightPriority: runner?.getAttribute("data-light-priority") ?? null,
        devLightGenerateFlare: runner?.getAttribute("data-light-generate-flare") ?? null,
        devLightGenerateFlareProofStatus:
          runner?.getAttribute("data-light-generate-flare-proof-status") ?? null,
        devLightLensFlares: runner?.getAttribute("data-light-lens-flares") ?? null,
        devLightLensFlaresProofStatus:
          runner?.getAttribute("data-light-lens-flares-proof-status") ?? null,
        devLightFadingLight: runner?.getAttribute("data-light-fading-light") ?? null,
        devLightFadingLightProofStatus:
          runner?.getAttribute("data-light-fading-light-proof-status") ?? null,
        devLightTextureNames: runner?.getAttribute("data-light-texture-names") ?? null,
        devLightFlareSizeCount: runner?.getAttribute("data-light-flare-size-count") ?? null,
        devLightFlarePositionCount:
          runner?.getAttribute("data-light-flare-position-count") ?? null,
        devLightFlareColorShiftCount:
          runner?.getAttribute("data-light-flare-color-shift-count") ?? null,
        devLightFlareArrayProofStatus:
          runner?.getAttribute("data-light-flare-array-proof-status") ?? null,
        devLightFlareRadius: runner?.getAttribute("data-light-flare-radius") ?? null,
        devLightFlareRadiusProofStatus:
          runner?.getAttribute("data-light-flare-radius-proof-status") ?? null,
        devError: runner?.getAttribute("data-error") ?? null,
        devFrameJson: catalogFrameJson,
        fixtureRenderStatus,
        fixtureCanvasNonblank,
        fixtureObjectPixels,
        fixtureRenderedDrawParticles,
        fixtureRenderedVertices,
        fixtureRenderedChunkModelCount,
        fixtureRenderedChunkLaneCount,
        fixtureRenderedChunkLaneResourceResolveStatus,
        fixtureRenderedChunkLaneChunkName:
          fixtureRunner?.getAttribute("data-rendered-chunk-lane-chunk-name") ?? null,
        fixtureRenderedChunkLaneActiveParticleCount:
          fixtureRunner?.getAttribute("data-rendered-chunk-lane-active-particle-count") ??
          null,
        fixtureRenderedChunkLaneResolvedResourceKey:
          fixtureRunner?.getAttribute("data-rendered-chunk-lane-resolved-resource-key") ??
          null,
        fixtureRenderedChunkLaneResolvedResourceLayer:
          fixtureRunner?.getAttribute("data-rendered-chunk-lane-resolved-resource-layer") ??
          null,
        fixtureRenderedChunkLaneResolvedResourcePath:
          fixtureRunner?.getAttribute("data-rendered-chunk-lane-resolved-resource-path") ??
          null,
        fixtureRenderedChunkLaneResolvedResourceHash:
          fixtureRunner?.getAttribute("data-rendered-chunk-lane-resolved-resource-hash") ??
          null,
        fixtureRenderedChunkLaneResolvedResourceCandidateId:
          fixtureRunner?.getAttribute(
            "data-rendered-chunk-lane-resolved-resource-candidate-id"
          ) ?? null,
        fixtureRenderedChunkLaneRendererPending,
        fixtureRenderedChunkLaneModelPreviewStatus,
        fixtureChunkModelReady,
        fixtureRenderedGeometryLinkedSegmentTopology:
          fixtureRunner?.getAttribute("data-rendered-geometry-linked-segment-topology") ??
          null,
        fixtureRenderedGeometryLinkedSegmentCount:
          fixtureRunner?.getAttribute("data-rendered-geometry-linked-segment-count") ?? null,
        fixtureRenderedGeometryLinkedSegmentSource:
          fixtureRunner?.getAttribute("data-rendered-geometry-linked-segment-source") ?? null,
        fixtureRenderedGeometryRenderModeBasisModes:
          fixtureRunner?.getAttribute("data-rendered-geometry-render-mode-basis-modes") ??
          null,
        fixtureRenderedGeometryRenderModeBasisSources:
          fixtureRunner?.getAttribute("data-rendered-geometry-render-mode-basis-sources") ??
          null,
        fixtureRenderedGeometryRenderModeUsesVelocityBasis:
          fixtureRunner?.getAttribute(
            "data-rendered-geometry-render-mode-uses-velocity-basis"
          ) ?? null,
        fixtureDrawLane: fixtureRunner?.getAttribute("data-draw-lane") ?? null,
        fixtureRenderedColorR:
          fixtureRunner?.getAttribute("data-rendered-color-r") ?? null,
        fixtureRenderedColorG:
          fixtureRunner?.getAttribute("data-rendered-color-g") ?? null,
        fixtureRenderedColorB:
          fixtureRunner?.getAttribute("data-rendered-color-b") ?? null,
        fixtureDiagnosticCodes:
          fixtureRunner?.getAttribute("data-rendered-diagnostic-codes") ?? null,
        progFxType4ProofStatus:
          fixtureRunner?.getAttribute("data-progfx-type4-proof-status") ?? null,
        progFxType4RowId: fixtureRunner?.getAttribute("data-progfx-type4-row-id") ?? null,
        progFxType4Label: fixtureRunner?.getAttribute("data-progfx-type4-label") ?? null,
        progFxType4Animation:
          fixtureRunner?.getAttribute("data-progfx-type4-animation") ?? null,
        progFxType4AnimationKind:
          fixtureRunner?.getAttribute("data-progfx-type4-animation-kind") ?? null,
        progFxType4SymbolicColor:
          fixtureRunner?.getAttribute("data-progfx-type4-symbolic-color") ?? null,
        progFxType4RadiusMeters:
          fixtureRunner?.getAttribute("data-progfx-type4-radius-meters") ?? null,
        progFxType4RadiusProofStatus:
          fixtureRunner?.getAttribute("data-progfx-type4-radius-proof-status") ?? null,
        progFxType4AnimationSpeed:
          fixtureRunner?.getAttribute("data-progfx-type4-animation-speed") ?? null,
        progFxType4CastShadows:
          fixtureRunner?.getAttribute("data-progfx-type4-cast-shadows") ?? null,
        progFxType4Priority:
          fixtureRunner?.getAttribute("data-progfx-type4-priority") ?? null,
        progFxType4ProximitySuppression:
          fixtureRunner?.getAttribute("data-progfx-type4-proximity-suppression") ?? null,
        progFxType4AttachToScene:
          fixtureRunner?.getAttribute("data-progfx-type4-attach-to-scene") ?? null,
        progFxType4ModelRef:
          fixtureRunner?.getAttribute("data-progfx-type4-model-ref") ?? null,
        progFxType4ColorR: fixtureRunner?.getAttribute("data-progfx-type4-color-r") ?? null,
        progFxType4ColorG: fixtureRunner?.getAttribute("data-progfx-type4-color-g") ?? null,
        progFxType4ColorB: fixtureRunner?.getAttribute("data-progfx-type4-color-b") ?? null,
        progFxType4NotPlaceableLight:
          fixtureRunner?.getAttribute("data-progfx-type4-not-placeable-light") ?? null,
        progFxType4NotMdlLightNode:
          fixtureRunner?.getAttribute("data-progfx-type4-not-mdl-light-node") ?? null,
        progFxType4RuntimeSchedulingStatus:
          fixtureRunner?.getAttribute("data-progfx-type4-runtime-scheduling-status") ?? null,
        progFxType4RuntimeSchedulingProofSource:
          fixtureRunner?.getAttribute(
            "data-progfx-type4-runtime-scheduling-proof-source"
          ) ?? null,
        progFxType4RuntimeSchedulingBlocker:
          fixtureRunner?.getAttribute("data-progfx-type4-runtime-scheduling-blocker") ??
          null,
        progFxType4Param4PriorityStatus:
          fixtureRunner?.getAttribute("data-progfx-type4-param4-priority-status") ??
          null,
        progFxType4SceneAttachmentPolicyStatus:
          fixtureRunner?.getAttribute(
            "data-progfx-type4-scene-attachment-policy-status"
          ) ?? null,
        progFxType4ProximitySuppressionPolicyStatus:
          fixtureRunner?.getAttribute(
            "data-progfx-type4-proximity-suppression-policy-status"
          ) ?? null,
        progFxType4VisionMutationPolicyStatus:
          fixtureRunner?.getAttribute(
            "data-progfx-type4-vision-mutation-policy-status"
          ) ?? null,
        progFxType4VisualPreviewStatus:
          fixtureRunner?.getAttribute("data-progfx-type4-visual-preview-status") ?? null,
        progFxType4RequestCount:
          fixtureRunner?.getAttribute("data-progfx-type4-request-count") ?? null,
        progFxType4RequestRowIds:
          fixtureRunner?.getAttribute("data-progfx-type4-request-row-ids") ?? null,
        progFxType4RequestLabels:
          fixtureRunner?.getAttribute("data-progfx-type4-request-labels") ?? null,
        progFxType4RequestAnimations:
          fixtureRunner?.getAttribute("data-progfx-type4-request-animations") ?? null,
        progFxType4RequestPriorities:
          fixtureRunner?.getAttribute("data-progfx-type4-request-priorities") ?? null,
        progFxType4RequestSceneAttachmentCount:
          fixtureRunner?.getAttribute(
            "data-progfx-type4-request-scene-attachment-count"
          ) ?? null,
        progFxType4RequestProximitySuppressionCount:
          fixtureRunner?.getAttribute(
            "data-progfx-type4-request-proximity-suppression-count"
          ) ?? null,
        progFxType4RequestLightCount:
          fixtureRunner?.getAttribute("data-progfx-type4-request-light-count") ?? null,
        progFxType4RequestVisionCount:
          fixtureRunner?.getAttribute("data-progfx-type4-request-vision-count") ?? null,
        progFxType4RequestSamples:
          fixtureRunner?.getAttribute("data-progfx-type4-request-samples") ?? null,
        fixtureSceneNonPointLightRequestSchedulerStatus:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-status"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerProofSource:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-proof-source"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerBlocker:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-blocker"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerPriorityWinner:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-priority-winner"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerPriorityTiePolicyStatus:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-priority-tie-policy-status"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerPriorityTieGroupCount:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-priority-tie-group-count"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-priority-zero-always-applies-request-count"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerSceneAttachmentRequestCount:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-scene-attachment-request-count"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerProximitySuppressionCandidateCount:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-proximity-suppression-candidate-count"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerVisionRequestCount:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-vision-request-count"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerLightRequestCount:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-light-request-count"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerWouldSuppressScenePointLights:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-would-suppress-scene-point-lights"
          ) ?? null,
        fixtureSceneNonPointLightRequestSchedulerSamples:
          fixtureRunner?.getAttribute(
            "data-scene-non-point-light-request-scheduler-samples"
          ) ?? null,
        fixtureScenePointLightSamples:
          fixtureRunner?.getAttribute("data-scene-point-light-samples") ?? null,
        fixtureSceneNonPointLightRequestSamples:
          fixtureRunner?.getAttribute("data-scene-non-point-light-request-samples") ??
          null,
        fixtureScenePointLightRetailOrderingRuntimeProbeStatus:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-status"
          ) ?? null,
        fixtureScenePointLightRetailOrderingProofSource:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-proof-source"
          ) ?? null,
        fixtureScenePointLightRetailOrderingProofStatus:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-proof-status"
          ) ?? null,
        fixtureScenePointLightRetailOrderingManagerCrossLaneCallsiteBlocker:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-manager-cross-lane-callsite-blocker"
          ) ?? null,
        fixtureScenePointLightRetailOrderingRuntimeProbeProofSource:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-proof-source"
          ) ?? null,
        fixtureScenePointLightRetailOrderingRuntimeProbeBlocker:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-blocker"
          ) ?? null,
        fixtureScenePointLightRetailOrderingRuntimeProbeLocalOrderSource:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-local-order-source"
          ) ?? null,
        fixtureScenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-required-lane-coverage-count"
          ) ?? null,
        fixtureScenePointLightRetailOrderingRuntimeProbePointLightSampleCount:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-point-light-sample-count"
          ) ?? null,
        fixtureScenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-non-point-request-sample-count"
          ) ?? null,
        fixtureScenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-budget-accepted-lanes"
          ) ?? null,
        fixtureScenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-budget-dropped-lanes"
          ) ?? null,
        fixtureScenePointLightRetailOrderingRuntimeProbeBudgetUnknownLanes:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-budget-unknown-lanes"
          ) ?? null,
        fixtureScenePointLightRetailOrderingRuntimeProbeLocalOrderSamples:
          fixtureRunner?.getAttribute(
            "data-scene-point-light-retail-ordering-runtime-probe-local-order-samples"
          ) ?? null,
        fixtureSceneShadowProgFxType4ShadowRequestCount:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-progfx-type4-shadow-request-count"
          ) ?? null,
        fixtureSceneShadowProgFxType4ShadowRequestSamples:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-progfx-type4-shadow-request-samples"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeStatus:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-status"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeProofSource:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-proof-source"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeBlocker:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-blocker"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeLocalPixelProofStatus:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-local-pixel-proof-status"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeActiveCasterCount:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-active-caster-count"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeProjectionPreviewCount:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-projection-preview-count"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeStencilReceiverCount:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-stencil-receiver-count"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeStencilVolumePassCount:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-stencil-volume-pass-count"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeExpectedStencilPasses:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-expected-stencil-passes"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeObservedStencilPasses:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-observed-stencil-passes"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeRenderShaderNames:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-render-shader-names"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeRenderBuckets:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-render-buckets"
          ) ?? null,
        fixtureSceneShadowRuntimeProbeSamples:
          fixtureRunner?.getAttribute(
            "data-scene-shadow-retail-projection-runtime-probe-samples"
          ) ?? null,
        appVfxDrawParticlesNumber,
        appVfxRenderedVerticesNumber,
        appVfxDrawLanesList
      };
    })()`
  });
  return status.result.value;
}

async function waitForTab(port, route) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const tabs = await response.json();
      const tab = tabs.find((candidate) => candidate.url === route) ?? tabs[0];
      if (tab?.webSocketDebuggerUrl) {
        return tab;
      }
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
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
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = next;
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

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      detached: false
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

function summarizeNetworkEvents(events) {
  const byRequestId = new Map();
  for (const event of events) {
    const requestId = event.params?.requestId;
    if (!requestId) {
      continue;
    }
    const record = byRequestId.get(requestId) ?? { requestId };
    if (event.method === "Network.requestWillBeSent") {
      record.url = event.params.request?.url;
      record.method = event.params.request?.method;
      record.type = event.params.type;
      record.startedAtMonotonicSeconds = event.params.timestamp;
      record.startedAtEpochMs = event.receivedAtMs;
    }
    if (event.method === "Network.responseReceived") {
      record.status = event.params.response?.status;
      record.mimeType = event.params.response?.mimeType;
    }
    if (event.method === "Network.loadingFinished") {
      record.finished = true;
      record.encodedDataLength = event.params.encodedDataLength;
      record.finishedAtMonotonicSeconds = event.params.timestamp;
      record.finishedAtEpochMs = event.receivedAtMs;
    }
    if (event.method === "Network.loadingFailed") {
      record.failed = true;
      record.errorText = event.params.errorText;
      record.canceled = event.params.canceled;
      record.finishedAtMonotonicSeconds = event.params.timestamp;
      record.finishedAtEpochMs = event.receivedAtMs;
    }
    if (
      Number.isFinite(record.startedAtMonotonicSeconds) &&
      Number.isFinite(record.finishedAtMonotonicSeconds)
    ) {
      record.durationMs = Math.round(
        (record.finishedAtMonotonicSeconds - record.startedAtMonotonicSeconds) * 1000
      );
    }
    record.settlement = record.failed
      ? "failed"
      : record.finished
        ? "finished"
        : "pending";
    record.assetKind = classifyNetworkAssetKind(record.url);
    byRequestId.set(requestId, record);
  }
  return Array.from(byRequestId.values()).filter((record) => {
    const url = String(record.url ?? "");
    return (
      url.includes("/_aurora/") ||
      url.includes("/api/") ||
      url.includes("127.0.0.1:8888") ||
      record.failed
    );
  });
}

function classifyNetworkAssetKind(value) {
  const url = String(value ?? "").toLowerCase();
  if (url.includes("/catalog/placeables/process")) return "placeable-process";
  if (url.includes("/assets/contracts")) return "asset-contracts";
  if (/\.(?:tga|dds|plt)(?:[?#]|$)/u.test(url)) return "texture";
  if (/\.(?:glb|mdl|mdx)(?:[?#]|$)/u.test(url)) return "model";
  if (url.includes("/auth/")) return "auth";
  if (url.includes("/health")) return "health";
  return "other";
}

async function readBackendRuntimeIdentity(url) {
  const startedAtMs = Date.now();
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000)
    });
    const payload = await response.json();
    return {
      url,
      status: response.status,
      elapsedMs: Date.now() - startedAtMs,
      payload
    };
  } catch (error) {
    return {
      url,
      status: null,
      elapsedMs: Date.now() - startedAtMs,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function removeProfileDirBestEffort(profileDir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}
