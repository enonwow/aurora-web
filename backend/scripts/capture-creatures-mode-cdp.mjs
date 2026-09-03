import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";

const DEFAULT_CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_BASE_URL = "http://127.0.0.1:5208";
const DEFAULT_USERNAME = "builder.user";
const DEFAULT_PASSWORD = "builder123";
const ANIMATION_FALLBACK_MODES = new Set(["error", "first", "attack"]);
const ANIMATION_FRAME_CAPTURE_MODES = new Set(["image", "state"]);
const ANIMATION_STATE_MAPPING_STATUSES = new Set([
  "state-mapped",
  "state-clip-unavailable",
  "state-mapped-or-unavailable"
]);
const FRAME_SAMPLE_TRANSIENT_ISSUES = new Set([
  "loading_overlay_visible",
  "texture_loading",
  "texture_not_fully_applied",
  "texture_fallback_only",
  "creature_part_texture_loading",
  "creature_part_texture_not_fully_applied",
  "inspector_render_contract_not_ready",
  "creature_equipment_scenegraph_missing_visible_meshes"
]);
const FRAME_SAMPLE_RUNTIME_OK_UI_ISSUES = new Set([
  "selected_resref_not_visible",
  "loading_overlay_visible",
  "animation_selection_not_retained",
  "inspector_render_contract_not_ready",
  "creature_equipment_scenegraph_missing_visible_meshes"
]);
const FRAME_SAMPLE_TRANSIENT_RETRY_ATTEMPTS = 30;
const FRAME_SAMPLE_TRANSIENT_RETRY_INTERVAL_MS = 150;
const CREATURE_HELD_WEAPON_GRIP_DISTANCE_THRESHOLD = 0.12;
const CREATURE_HELD_WEAPON_GRIP_SINGLE_MESH_THRESHOLD = 0.14;
const CREATURE_RUNTIME_AMMUNITION_PROXY_GRIP_DISTANCE_PADDING = 0.035;
const CREATURE_RUNTIME_AMMUNITION_PROXY_GRIP_DISTANCE_MAX_THRESHOLD = 0.22;

function resolveExpectedSelectedAnimationName(selectedAnimation, fallbackAnimationName) {
  if (selectedAnimation?.noAnimationOptions === true) {
    return "";
  }
  return String(selectedAnimation?.selectedValue ?? "").trim() || fallbackAnimationName;
}

const options = parseArgs(process.argv.slice(2));
const resrefs = parseListOption(options.resrefs ?? options.resref ?? "");
const requestedAnimationName = String(options.animationName ?? options.animation ?? "").trim();
const requestedAnimationState = parseOptionalInteger(options.animationState);
const animationFallbackMode = String(options.animationFallback ?? "error").trim().toLowerCase();
const expectedAnimationLoopMode = String(options.expectAnimationLoopMode ?? "")
  .trim()
  .toLowerCase();
const expectAnimationCompleted = parseBoolean(options.expectAnimationCompleted ?? "false");
const expectedAnimationFollowUpClip = String(options.expectAnimationFollowUpClip ?? "")
  .trim()
  .toLowerCase();
const expectedAnimationRunBlendPhases = parseListOption(
  options.expectAnimationRunBlendPhases ?? options.expectAnimationRunBlendPhase ?? ""
).map((phase) => phase.toLowerCase());
const expectedAnimationStateMappingStatus = String(
  options.expectAnimationStateMappingStatus ?? "state-mapped"
)
  .trim()
  .toLowerCase();
const outDir = path.resolve(
  options.outDir ?? "frontend/public/aurora-evidence/creatures/manual-cdp-proof"
);
const chromePath = options.chromePath ?? process.env.CHROME_PATH ?? DEFAULT_CHROME_PATH;
const baseUrl = (options.baseUrl ?? process.env.CREATURE_PROOF_BASE_URL ?? DEFAULT_BASE_URL).replace(
  /\/+$/u,
  ""
);
const explicitAuthBaseUrl = options.authBaseUrl ?? process.env.CREATURE_PROOF_AUTH_BASE_URL ?? "";
const authBaseUrl = (
  explicitAuthBaseUrl.trim().length > 0
    ? explicitAuthBaseUrl
    : new URL("/_aurora/v1", baseUrl).toString()
).replace(/\/+$/u, "");
const port = Number(options.port ?? 9400 + Math.floor(Math.random() * 400));
const username = options.username ?? process.env.AURORA_TEST_USERNAME ?? DEFAULT_USERNAME;
const password = options.password ?? process.env.AURORA_TEST_PASSWORD ?? DEFAULT_PASSWORD;
const keepProfile = options.keepProfile === "true";
const recordVideo = parseBoolean(options.recordVideo ?? options.recordMp4 ?? "false");
const captureScreenshots = parseBoolean(options.captureScreenshots ?? "true");
const continueOnError = parseBoolean(options.continueOnError ?? "false");
const animationFrameCaptureMode = String(options.animationFrameCaptureMode ?? "image")
  .trim()
  .toLowerCase();
const videoSeconds = clampNumber(Number(options.videoSeconds ?? 3), 0.5, 30);
const videoFps = Math.round(clampNumber(Number(options.videoFps ?? 12), 1, 60));
const screenshotDelaySeconds = clampNumber(Number(options.screenshotDelaySeconds ?? 0), 0, 30);
const animationFrameTimesSeconds = parseNumberListOption(
  options.animationFrameTimes ?? options.frameTimes ?? ""
).map((value) => clampNumber(value, 0, 30));
const canvasReadyMaxAttempts = Math.round(
  clampNumber(Number(options.canvasReadyMaxAttempts ?? 640), 1, 1600)
);
const canvasReadyIntervalMs = Math.round(
  clampNumber(Number(options.canvasReadyIntervalMs ?? 300), 50, 5000)
);
const canvasReadyWaitOptions = {
  maxAttempts: canvasReadyMaxAttempts,
  intervalMs: canvasReadyIntervalMs
};
const modelOverrideGlbPath = options.modelOverrideGlbPath
  ? path.resolve(String(options.modelOverrideGlbPath))
  : "";
const profileDir = path.join(outDir, "chrome-profile");
const route = new URL("/app?mode=creatures_mode", baseUrl).toString();
const bootstrapRoute = new URL("/login?mode=creatures_mode", baseUrl).toString();

if (resrefs.length < 1) {
  throw new Error("Pass at least one --resref or comma-separated --resrefs value.");
}
if (requestedAnimationName.length > 0 && requestedAnimationState !== null) {
  throw new Error("Use either --animationName or --animationState, not both.");
}
if (expectedAnimationLoopMode && !["loop", "once"].includes(expectedAnimationLoopMode)) {
  throw new Error(
    `Unsupported --expectAnimationLoopMode value ${JSON.stringify(expectedAnimationLoopMode)}; expected loop or once.`
  );
}
if (!ANIMATION_FALLBACK_MODES.has(animationFallbackMode)) {
  throw new Error(
    `Unsupported --animationFallback value ${JSON.stringify(
      animationFallbackMode
    )}; expected one of: ${Array.from(ANIMATION_FALLBACK_MODES).join(", ")}.`
  );
}
if (!ANIMATION_FRAME_CAPTURE_MODES.has(animationFrameCaptureMode)) {
  throw new Error(
    `Unsupported --animationFrameCaptureMode value ${JSON.stringify(
      animationFrameCaptureMode
    )}; expected one of: ${Array.from(ANIMATION_FRAME_CAPTURE_MODES).join(", ")}.`
  );
}
if (!ANIMATION_STATE_MAPPING_STATUSES.has(expectedAnimationStateMappingStatus)) {
  throw new Error(
    `Unsupported --expectAnimationStateMappingStatus value ${JSON.stringify(
      expectedAnimationStateMappingStatus
    )}; expected one of: ${Array.from(ANIMATION_STATE_MAPPING_STATUSES).join(", ")}.`
  );
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(profileDir, { recursive: true });

const modelOverride = modelOverrideGlbPath
  ? {
      path: modelOverrideGlbPath,
      bytes: fs.readFileSync(modelOverrideGlbPath)
    }
  : null;

const persistedAuthState = await createPersistedAuthState({
  authBaseUrl,
  username,
  password
});

const chrome = spawn(
  chromePath,
  [
  "--headless=new",
  "--renderer-process-limit=2",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${port}`,
    "--window-size=1560,860",
    `--user-data-dir=${profileDir}`,
    bootstrapRoute
  ],
  { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
);

let chromeStderr = "";
chrome.stderr.on("data", (chunk) => {
  chromeStderr += chunk.toString();
});

try {
  const result = await captureCreatures({
    port,
    route,
    bootstrapRoute,
    outDir,
    resrefs,
    username,
    password,
    persistedAuthState,
    requestedAnimationName,
    requestedAnimationState,
    animationFallbackMode,
    expectedAnimationLoopMode,
    expectAnimationCompleted,
    expectedAnimationFollowUpClip,
    expectedAnimationRunBlendPhases,
    expectedAnimationStateMappingStatus,
    animationFrameCaptureMode,
    captureScreenshots,
    recordVideo,
    continueOnError,
    modelOverride,
    videoSeconds,
    videoFps,
    screenshotDelaySeconds,
    animationFrameTimesSeconds
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  chrome.kill("SIGTERM");
  await onceProcessExits(chrome);
  if (!keepProfile) {
    removeProfileDirBestEffort(profileDir);
  }
}

async function captureCreatures({
  port,
  route,
  bootstrapRoute,
  outDir,
  resrefs,
  username,
  password,
  persistedAuthState,
  requestedAnimationName,
  requestedAnimationState,
  animationFallbackMode,
  expectedAnimationLoopMode,
  expectAnimationCompleted,
  expectedAnimationFollowUpClip,
  expectedAnimationRunBlendPhases,
  expectedAnimationStateMappingStatus,
  animationFrameCaptureMode,
  captureScreenshots,
  recordVideo,
  continueOnError,
  modelOverride,
  videoSeconds,
  videoFps,
  screenshotDelaySeconds,
  animationFrameTimesSeconds
}) {
  const tab = await waitForTab(port, bootstrapRoute);
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let messageId = 0;
  const pending = new Map();
  const consoleMessages = [];
  const networkEvents = [];
  const creatureProofNetworkState = {
    pendingRequestIds: new Set(),
    requestStartedAt: new Map(),
    lastActivityAt: Date.now()
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Fetch.requestPaused") {
      void handlePausedRequestForModelOverride(ws, message, modelOverride, () => ++messageId);
      return;
    }
    if (message.method === "Runtime.consoleAPICalled") {
      consoleMessages.push({
        type: message.params?.type,
        text: (message.params?.args ?? []).map((arg) => arg.value ?? arg.description ?? "").join(" ")
      });
      return;
    }
    if (message.method === "Runtime.exceptionThrown") {
      consoleMessages.push({
        type: "exception",
        text:
          message.params?.exceptionDetails?.exception?.description ??
          message.params?.exceptionDetails?.text ??
          JSON.stringify(message.params?.exceptionDetails ?? {})
      });
      return;
    }
    if (message.method?.startsWith("Network.")) {
      updateCreatureProofNetworkState(creatureProofNetworkState, message);
      const event = summarizeNetworkEvent(message);
      if (event) {
        networkEvents.push(event);
      }
      return;
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
  await send("DOM.enable");
  await send("Network.enable");
  if (modelOverride) {
    await send("Fetch.enable", {
      patterns: [
        {
          urlPattern: "*catalog/placeables/cache/*/assets/*.glb",
          requestStage: "Request"
        }
      ]
    });
  }
  await installBrowserAuthState(send, persistedAuthState);
  await send("Page.navigate", { url: bootstrapRoute });
  await waitForLoginOrApp(send);
  await installBrowserAuthState(send, persistedAuthState);
  await send("Page.navigate", { url: route });
  await waitForAppOrLoginFallback(send, { username, password, route });
  await waitForCreaturesModeReady(send);
  await waitForCreaturesModeBootstrapSettled(send, creatureProofNetworkState);

  const captures = [];
  const summaryPath = path.join(outDir, "summary.json");
  const writeSummary = () => {
    const summary = {
      version: "aurora-creatures-mode-cdp-proof-summary/v2",
      capturedAt: new Date().toISOString(),
      route,
      count: captures.length,
      requestedCount: resrefs.length,
      okCount: captures.filter((capture) => capture.status?.ok === true).length,
      failedCount: captures.filter((capture) => capture.status?.ok !== true).length,
      captures: captures.map((capture) => ({
        resref: capture.requestedResref,
        requestedAnimationName: capture.requestedAnimationName,
        requestedAnimationState: capture.requestedAnimationState,
        selectedResref: capture.selected?.resref ?? null,
        selectedAnimationName: capture.selectedAnimation?.selectedValue ?? null,
        fallbackAnimationSelected: capture.selectedAnimation?.fallbackSelected === true,
        animationStateMappingStatus:
          capture.status?.dataset?.creatureAnimationRuntimeStateMappingStatuses ?? null,
        animationPlaybackStatus:
          capture.status?.dataset?.creatureAnimationRuntimePlaybackStatuses ?? null,
        ok: capture.status?.ok === true,
        issues: capture.status?.issues ?? [],
        errorMessage: capture.status?.errorMessage ?? null,
        canvasPath: capture.paths?.canvas ?? null,
        videoPath: capture.paths?.video ?? null,
        frameSamplePaths: Array.isArray(capture.animationFrameSamples)
          ? capture.animationFrameSamples.map((sample) => sample.path)
          : [],
        statePath: capture.paths?.state ?? null
      }))
    };
    fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  };

  for (const [resrefIndex, resref] of resrefs.entries()) {
    const captureStartedAt = Date.now();
    const captureTimings = {};
    const captureStem =
      requestedAnimationName.length > 0
        ? `${sanitizeFileStem(resref)}-${sanitizeFileStem(requestedAnimationName)}`
        : requestedAnimationState !== null
          ? `${sanitizeFileStem(resref)}-state-${requestedAnimationState}`
          : sanitizeFileStem(resref);
    const fullPath = path.join(outDir, `${captureStem}-full.png`);
    const canvasPath = path.join(outDir, `${captureStem}-canvas.png`);
    const videoPath = path.join(outDir, `${captureStem}-animation.mp4`);
    const statePath = path.join(outDir, `${captureStem}-state.json`);
    let selected = null;
    let selectedAnimation = null;
    let readyStatus = null;
    try {
      let stepStartedAt = Date.now();
      selected = await selectCreatureByResref(send, resref);
      captureTimings.selectCreatureMs = Date.now() - stepStartedAt;
      stepStartedAt = Date.now();
      readyStatus = await waitForCreatureCanvasReady(
        send,
        resref,
        "",
        canvasReadyWaitOptions
      );
      captureTimings.initialCanvasReadyMs = Date.now() - stepStartedAt;
      captureTimings.initialCanvasReadyDiagnostics = readyStatus.proofWait ?? null;
      if (!readyStatus.ok) {
        throw new Error(
          `Creature render payload was not ready for ${resref}: ${JSON.stringify(readyStatus.issues ?? [])}`
        );
      }
      stepStartedAt = Date.now();
      selectedAnimation =
        requestedAnimationName.length > 0
          ? await selectCreatureAnimation(send, requestedAnimationName, animationFallbackMode)
          : null;
      if (requestedAnimationState !== null) {
        await selectCreatureAnimationState(send, requestedAnimationState);
      }
      captureTimings.animationSelectionMs = Date.now() - stepStartedAt;
      let expectedSelectedAnimationName = resolveExpectedSelectedAnimationName(
        selectedAnimation,
        requestedAnimationName
      );
      stepStartedAt = Date.now();
      readyStatus = await waitForCreatureCanvasReady(
        send,
        resref,
        expectedSelectedAnimationName,
        {
          ...canvasReadyWaitOptions,
          ...(requestedAnimationState !== null
            ? {
                expectedAnimationState: requestedAnimationState,
                expectedAnimationStateMappingStatus
              }
            : {})
        }
      );
      captureTimings.animationCanvasReadyMs = Date.now() - stepStartedAt;
      captureTimings.animationCanvasReadyDiagnostics = readyStatus.proofWait ?? null;
      if (!readyStatus.ok) {
        throw new Error(
          `Creature canvas was not ready for ${resref}: ${JSON.stringify(readyStatus.issues ?? [])}`
        );
      }
      if (requestedAnimationState !== null) {
        assertCreatureAnimationStateMapped(
          readyStatus,
          requestedAnimationState,
          expectedAnimationStateMappingStatus
        );
      }
      let videoStartStatus = null;
      const video = recordVideo
        ? await (async () => {
            if (requestedAnimationName.length > 0) {
              selectedAnimation = await resetCreatureAnimationTimeForCapture(
                send,
                requestedAnimationName,
                animationFallbackMode
              );
              expectedSelectedAnimationName = resolveExpectedSelectedAnimationName(
                selectedAnimation,
                requestedAnimationName
              );
              const restartedStatus = await waitForCreatureCanvasReady(
                send,
                resref,
                expectedSelectedAnimationName,
                { ...canvasReadyWaitOptions, stableReadyTarget: 1 }
              );
              if (!restartedStatus.ok) {
                throw new Error(
                  `Creature canvas was not ready after animation restart for ${resref}: ${JSON.stringify(
                    restartedStatus.issues ?? []
                  )}`
                );
              }
              videoStartStatus = restartedStatus;
            } else if (requestedAnimationState !== null) {
              await resetCreatureAnimationStateTimeForCapture(
                send,
                requestedAnimationState
              );
              const restartedStatus = await waitForCreatureCanvasReady(send, resref, "", {
                ...canvasReadyWaitOptions,
                stableReadyTarget: 1,
                expectedAnimationState: requestedAnimationState,
                expectedAnimationStateMappingStatus
              });
              if (!restartedStatus.ok) {
                throw new Error(
                  `Creature canvas was not ready after animation state restart for ${resref}: ${JSON.stringify(
                    restartedStatus.issues ?? []
                  )}`
                );
              }
              assertCreatureAnimationStateMapped(
                restartedStatus,
                requestedAnimationState,
                expectedAnimationStateMappingStatus
              );
              videoStartStatus = restartedStatus;
            }
            return captureCanvasVideo(send, {
              outputPath: videoPath,
              durationSeconds: videoSeconds,
              fps: videoFps
            });
          })()
        : null;
      if (recordVideo && (requestedAnimationName.length > 0 || requestedAnimationState !== null)) {
        if (requestedAnimationName.length > 0) {
          selectedAnimation = await resetCreatureAnimationTimeForCapture(
            send,
            requestedAnimationName,
            animationFallbackMode
          );
          expectedSelectedAnimationName = resolveExpectedSelectedAnimationName(
            selectedAnimation,
            requestedAnimationName
          );
        } else if (requestedAnimationState !== null) {
          await resetCreatureAnimationStateTimeForCapture(send, requestedAnimationState);
          expectedSelectedAnimationName = "";
        }
        readyStatus = await waitForCreatureCanvasReady(
          send,
          resref,
          expectedSelectedAnimationName,
          {
            ...canvasReadyWaitOptions,
            ...(requestedAnimationState !== null
              ? {
                  expectedAnimationState: requestedAnimationState,
                  expectedAnimationStateMappingStatus
                }
              : {})
          }
        );
        if (!readyStatus.ok) {
          throw new Error(
            `Creature canvas was not ready after screenshot animation restart for ${resref}: ${JSON.stringify(
              readyStatus.issues ?? []
            )}`
          );
        }
        if (requestedAnimationState !== null) {
          assertCreatureAnimationStateMapped(
            readyStatus,
            requestedAnimationState,
            expectedAnimationStateMappingStatus
          );
        }
      }
      let animationFrameCapture = null;
      const frameCaptureStartedAt = Date.now();
      if (
        animationFrameTimesSeconds.length > 0 &&
        (requestedAnimationName.length > 0 || requestedAnimationState !== null) &&
        (requestedAnimationState !== null || selectedAnimation?.noAnimationOptions !== true)
      ) {
        animationFrameCapture = await captureCreatureAnimationFrameSamples(send, {
          resref,
          animationName: requestedAnimationName,
          animationState: requestedAnimationState,
          animationFallbackMode,
          expectedAnimationStateMappingStatus,
          animationFrameCaptureMode,
          outDir,
          captureStem,
          frameTimesSeconds: animationFrameTimesSeconds,
          canvasReadyWaitOptions
        });
        selectedAnimation = animationFrameCapture.selectedAnimation;
        readyStatus = animationFrameCapture.startStatus ?? readyStatus;
        assertCreatureAnimationFrameSampleExpectations(animationFrameCapture.samples, {
          expectedAnimationLoopMode,
          expectAnimationCompleted,
          expectedAnimationFollowUpClip,
          expectedAnimationRunBlendPhases
        });
      }
      captureTimings.animationFrameCaptureMs = Date.now() - frameCaptureStartedAt;
      if (animationFrameCapture && (requestedAnimationName.length > 0 || requestedAnimationState !== null)) {
        if (requestedAnimationName.length > 0) {
          selectedAnimation = await resetCreatureAnimationTimeForCapture(
            send,
            requestedAnimationName,
            animationFallbackMode
          );
          expectedSelectedAnimationName = resolveExpectedSelectedAnimationName(
            selectedAnimation,
            requestedAnimationName
          );
        } else if (requestedAnimationState !== null) {
          await resetCreatureAnimationStateTimeForCapture(send, requestedAnimationState);
          expectedSelectedAnimationName = "";
        }
        readyStatus = await waitForCreatureCanvasReady(
          send,
          resref,
          expectedSelectedAnimationName,
          {
            ...canvasReadyWaitOptions,
            ...(requestedAnimationState !== null
              ? {
                  expectedAnimationState: requestedAnimationState,
                  expectedAnimationStateMappingStatus
                }
              : {})
          }
        );
        if (!readyStatus.ok) {
          throw new Error(
            `Creature canvas was not ready after frame sampling animation restart for ${resref}: ${JSON.stringify(
              readyStatus.issues ?? []
            )}`
          );
        }
        if (requestedAnimationState !== null) {
          assertCreatureAnimationStateMapped(
            readyStatus,
            requestedAnimationState,
            expectedAnimationStateMappingStatus
          );
        }
      }
      if (screenshotDelaySeconds > 0) {
        await sleep(Math.round(screenshotDelaySeconds * 1000));
      }
      const status =
        screenshotDelaySeconds > 0
          ? await readCreatureStatus(send, resref, expectedSelectedAnimationName)
          : readyStatus;
      if (!status.ok) {
        throw new Error(
          `Creature canvas became unready for ${resref}: ${JSON.stringify(status.issues ?? [])}`
        );
      }
      if (captureScreenshots) {
        await capturePng(send, fullPath);
        if (status.canvasRect) {
          await capturePng(send, canvasPath, status.canvasRect);
        } else {
          fs.copyFileSync(fullPath, canvasPath);
        }
      }
      const state = {
        version: "aurora-creatures-mode-cdp-proof/v1",
        capturedAt: new Date().toISOString(),
        requestedResref: resref,
        requestedAnimationName: requestedAnimationName || null,
        requestedAnimationState,
        screenshotDelaySeconds,
        animationFrameTimesSeconds,
        animationFrameCaptureMode,
        timings: {
          ...captureTimings,
          totalMs: Date.now() - captureStartedAt
        },
        captureScreenshots,
        selected,
        selectedAnimation,
        videoStartStatus,
        animationFrameStartStatus: animationFrameCapture?.startStatus ?? null,
        animationFrameSamples: animationFrameCapture?.samples ?? [],
        status,
        paths: {
          full: captureScreenshots ? fullPath : null,
          canvas: captureScreenshots ? canvasPath : null,
          video: video?.path ?? null,
          state: statePath
        },
        screenshotBytes: captureScreenshots
          ? {
              full: fs.statSync(fullPath).size,
              canvas: fs.statSync(canvasPath).size
            }
          : null,
        video,
        recentConsoleMessages: consoleMessages.slice(-40),
        recentNetworkEvents: networkEvents.slice(-80),
        chromeStderrTail: chromeStderr.slice(-1600)
      };
      fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
      captures.push(state);
      writeSummary();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failureStatus =
        readyStatus ??
        (selected
          ? await readCreatureStatus(send, resref, requestedAnimationName).catch((statusError) => ({
              ok: false,
              issues: ["capture_failed", "status_read_failed"],
              errorMessage:
                statusError instanceof Error ? statusError.message : String(statusError)
            }))
          : null);
      let failurePaths = {
        full: null,
        canvas: null,
        video: null,
        state: statePath
      };
      let failureScreenshotBytes = null;
      if (captureScreenshots && (failureStatus?.canvasRect || selected)) {
        try {
          await capturePng(send, fullPath);
          if (failureStatus?.canvasRect) {
            await capturePng(send, canvasPath, failureStatus.canvasRect);
          } else {
            fs.copyFileSync(fullPath, canvasPath);
          }
          failurePaths = {
            full: fullPath,
            canvas: canvasPath,
            video: null,
            state: statePath
          };
          failureScreenshotBytes = {
            full: fs.statSync(fullPath).size,
            canvas: fs.statSync(canvasPath).size
          };
        } catch {
          failurePaths = {
            full: null,
            canvas: null,
            video: null,
            state: statePath
          };
          failureScreenshotBytes = null;
        }
      }
      const state = {
        version: "aurora-creatures-mode-cdp-proof/v1",
        capturedAt: new Date().toISOString(),
        requestedResref: resref,
        requestedAnimationName: requestedAnimationName || null,
        requestedAnimationState,
        screenshotDelaySeconds,
        animationFrameTimesSeconds,
        animationFrameCaptureMode,
        captureScreenshots,
        selected,
        selectedAnimation,
        status: {
          ...(failureStatus ?? {}),
          ok: false,
          issues: Array.from(
            new Set(["capture_failed", ...(failureStatus?.issues ?? [])])
          ),
          errorMessage: message
        },
        paths: failurePaths,
        screenshotBytes: failureScreenshotBytes,
        video: null,
        recentConsoleMessages: consoleMessages.slice(-40),
        recentNetworkEvents: networkEvents.slice(-80),
        chromeStderrTail: chromeStderr.slice(-1600)
      };
      fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
      captures.push(state);
      writeSummary();
      if (!continueOnError) {
        throw error;
      }
      if (resrefIndex < resrefs.length - 1) {
        await recoverCreaturesModeAfterCaptureFailure(send, {
          route,
          username,
          password,
          creatureProofNetworkState
        }).catch(() => undefined);
      }
    }
  }
  writeSummary();
  ws.close();
  return JSON.parse(fs.readFileSync(summaryPath, "utf8"));
}

async function handlePausedRequestForModelOverride(ws, message, modelOverride, nextMessageId) {
  const requestId = message.params?.requestId;
  const url = String(message.params?.request?.url ?? "");
  if (!requestId) {
    return;
  }
  const id = nextMessageId();
  if (modelOverride && /\.glb(?:[?#].*)?$/iu.test(url)) {
    ws.send(
      JSON.stringify({
        id,
        method: "Fetch.fulfillRequest",
        params: {
          requestId,
          responseCode: 200,
          responseHeaders: [
            { name: "Content-Type", value: "model/gltf-binary" },
            { name: "Cache-Control", value: "no-store" },
            { name: "X-Aurora-Codex-Model-Override", value: path.basename(modelOverride.path) }
          ],
          body: modelOverride.bytes.toString("base64")
        }
      })
    );
    return;
  }
  ws.send(
    JSON.stringify({
      id,
      method: "Fetch.continueRequest",
      params: { requestId }
    })
  );
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

async function installBrowserAuthState(send, authState) {
  const authJson = JSON.stringify(authState);
  const expression = `(() => {
    try {
      const authState = ${JSON.stringify(authJson)};
      const storage = window.localStorage;
      storage.setItem("aurora_web.auth_session.v1", authState);
      storage.setItem("aurora_web.workspace_mode.v1", "creatures_mode");
      return {
        authStored: storage.getItem("aurora_web.auth_session.v1") === authState,
        mode: storage.getItem("aurora_web.workspace_mode.v1")
      };
    } catch (error) {
      return {
        authStored: false,
        mode: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  })()`;
  await send("Page.addScriptToEvaluateOnNewDocument", { source: expression });
  return evaluate(send, { returnByValue: true, expression });
}

async function waitForLoginOrApp(send) {
  let lastStatus = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const status = await readDomStatus(send);
    lastStatus = status;
    if (
      status.hasUsername ||
      status.hasLoginForm ||
      status.routePath === "/app" ||
      (status.routePath === "/login" &&
        status.authStored === true &&
        status.modeStored === "creatures_mode") ||
      (status.routePath === "/login" &&
        status.documentReadyState === "complete" &&
        status.bodyTextLength > 0)
    ) {
      return status;
    }
    await sleep(150);
  }
  throw new Error(`Login route did not become ready: ${JSON.stringify(lastStatus)}`);
}

async function waitForAppOrLoginFallback(send, { username, password, route }) {
  let lastStatus = null;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const status = await readDomStatus(send);
    lastStatus = status;
    if (
      status.routePath === "/app" &&
      (status.hasCreatureFilter || status.hasCreatureList || status.hasCanvas)
    ) {
      return status;
    }
    if (status.hasUsername) {
      return performBrowserLogin(send, { username, password, route });
    }
    await sleep(250);
  }
  if (lastStatus?.routePath === "/app") {
    return lastStatus;
  }
  if (lastStatus?.hasUsername || lastStatus?.routePath === "/login") {
    return performBrowserLogin(send, { username, password, route });
  }
  throw new Error(`App route did not become ready after auth injection: ${JSON.stringify(lastStatus)}`);
}

async function recoverCreaturesModeAfterCaptureFailure(
  send,
  { route, username, password, creatureProofNetworkState }
) {
  await send("Page.navigate", { url: route });
  await waitForAppOrLoginFallback(send, { username, password, route });
  await waitForCreaturesModeReady(send);
  await waitForCreaturesModeBootstrapSettled(send, creatureProofNetworkState);
}

async function waitForCreaturesModeBootstrapSettled(send, networkState) {
  let lastStatus = null;
  let stableReadyCount = 0;
  for (let attempt = 0; attempt < 720; attempt += 1) {
    const result = await evaluate(send, {
      returnByValue: true,
      expression: `(() => {
        const canvas = document.querySelector("canvas");
        const datasetSource =
          document.querySelector("[data-creature-animation-mixer-count]") ??
          canvas?.closest("[data-creature-animation-mixer-count]") ??
          null;
        const dataset = datasetSource ? datasetSource.dataset : {};
        const creatureFilter = document.querySelector("input[aria-label='Filter creatures']");
        const creatureList = document.querySelector("[aria-label='creatures mode list']");
        const creatureRowCount = creatureList?.querySelectorAll("button.scene-object-row").length ?? 0;
        const creatureUiReady = Boolean(creatureFilter && creatureList && creatureRowCount > 0);
        const activeRow = document.querySelector(
          "[aria-label='creatures mode list'] button.scene-object-row[aria-selected='true']"
        );
        const activeSmall = activeRow?.querySelector("small")?.textContent?.trim() ?? "";
        const activeResref = activeSmall
          .split("/")
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean)
          .at(-1) ?? "";
        const runtimeObjectText = [
          dataset.creatureAnimationRuntimeObjectIds,
          dataset.creatureAnimationMixerObjectIds,
          dataset.creaturePartModelRuntimeObjectId,
          dataset.placeableModelObjectId
        ]
          .map((entry) => String(entry ?? "").toLowerCase())
          .filter(Boolean)
          .join(" ");
        const modelStatus = String(dataset.placeableModelStatus ?? "");
        const queueActive = Number(dataset.placeableModelLoadQueueActiveCount ?? 0);
        const queuePending = Number(dataset.placeableModelLoadQueuePendingCount ?? 0);
        const loadQueuesSettled =
          (!Number.isFinite(queueActive) || queueActive <= 0) &&
          (!Number.isFinite(queuePending) || queuePending <= 0);
        const readyWithoutSelection =
          creatureUiReady &&
          !activeResref &&
          !runtimeObjectText &&
          (!modelStatus || modelStatus === "idle") &&
          loadQueuesSettled;
        return {
          activeResref,
          runtimeObjectText,
          modelStatus,
          queueActive,
          queuePending,
          creatureUiReady,
          creatureRowCount,
          readyWithoutSelection,
          ready: Boolean(
            creatureUiReady &&
              (readyWithoutSelection ||
                (activeResref &&
                runtimeObjectText.includes(activeResref) &&
                modelStatus !== "loading" &&
                  loadQueuesSettled))
          )
        };
      })()`
    });
    const status = result.result.value ?? {};
    lastStatus = status;
    const now = Date.now();
    for (const requestId of networkState?.pendingRequestIds ?? []) {
      const startedAt = Number(networkState?.requestStartedAt?.get(requestId) ?? now);
      if (now - startedAt >= 30_000) {
        networkState.pendingRequestIds.delete(requestId);
        networkState.requestStartedAt?.delete(requestId);
        networkState.lastActivityAt = now;
      }
    }
    const pendingNetworkRequestCount = networkState?.pendingRequestIds?.size ?? 0;
    const networkQuietMs = now - Number(networkState?.lastActivityAt ?? 0);
    if (status.ready && pendingNetworkRequestCount === 0 && networkQuietMs >= 2_000) {
      stableReadyCount += 1;
      if (stableReadyCount >= 5) {
        return status;
      }
    } else {
      stableReadyCount = 0;
    }
    await sleep(250);
  }
  throw new Error(
    `Creatures mode bootstrap did not settle: ${JSON.stringify({
      ...lastStatus,
      pendingNetworkRequestCount: networkState?.pendingRequestIds?.size ?? 0,
      networkQuietMs: Date.now() - Number(networkState?.lastActivityAt ?? 0)
    })}`
  );
}

async function performBrowserLogin(send, { username, password, route }) {
  const startResult = await evaluate(send, {
    returnByValue: true,
    expression: `(() => {
      const targetRoute = ${JSON.stringify(route)};
      if (window.location.pathname === "/app") {
        return { alreadyAuthenticated: true, href: window.location.href };
      }
      window.localStorage.removeItem("aurora_web.auth_session.v1");
      window.localStorage.setItem("aurora_web.workspace_mode.v1", "creatures_mode");
      const usernameInput = document.querySelector("#username");
      const passwordInput = document.querySelector("#password");
      if (!usernameInput || !passwordInput) {
        throw new Error("Login form inputs were not found.");
      }
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setValue?.call(usernameInput, ${JSON.stringify(username)});
      usernameInput.dispatchEvent(new Event("input", { bubbles: true }));
      usernameInput.dispatchEvent(new Event("change", { bubbles: true }));
      setValue?.call(passwordInput, ${JSON.stringify(password)});
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
      passwordInput.dispatchEvent(new Event("change", { bubbles: true }));
      const submit =
        document.querySelector("button[type='submit']") ??
        Array.from(document.querySelectorAll("button")).find((button) =>
          /sign in|login|log in/i.test(button.textContent ?? "")
        );
      if (!submit) {
        throw new Error("Login submit button was not found.");
      }
      submit.click();
      return { alreadyAuthenticated: false, href: window.location.href, targetRoute };
    })()`
  });
  const started = startResult.result.value;
  if (started?.alreadyAuthenticated) {
    return started;
  }
  for (let attempt = 0; attempt < 480; attempt += 1) {
    const status = await evaluate(send, {
      returnByValue: true,
      expression: `(() => ({
        href: window.location.href,
        routePath: window.location.pathname,
        alertText: Array.from(document.querySelectorAll("[role='alert']"))
          .map((element) => element.textContent?.trim())
          .filter(Boolean)
      }))()`
    });
    const value = status.result.value;
    if (value.routePath === "/app") {
      await evaluate(send, {
        returnByValue: true,
        expression: `(() => {
          const targetRoute = ${JSON.stringify(route)};
          if (window.location.href !== targetRoute) {
            window.history.replaceState({}, "", targetRoute);
          }
          return { alreadyAuthenticated: false, href: window.location.href };
        })()`
      });
      return { alreadyAuthenticated: false, href: route };
    }
    if (attempt >= 12 && value.alertText?.length > 0) {
      throw new Error("Login failed: " + value.alertText.join(" | "));
    }
    await sleep(250);
  }
  throw new Error("Login did not navigate to /app.");
}

async function waitForCreaturesModeReady(send) {
  let lastStatus = null;
  for (let attempt = 0; attempt < 480; attempt += 1) {
    const status = await readDomStatus(send);
    lastStatus = status;
    if (
      status.routePath === "/app" &&
      status.hasCreatureFilter &&
      status.hasCreatureList &&
      status.hasCanvas &&
      status.creatureRowCount > 0
    ) {
      return status;
    }
    await sleep(250);
  }
  throw new Error(`Creatures mode did not become ready: ${JSON.stringify(lastStatus)}`);
}

async function selectCreatureByResref(send, resref) {
  const filterTerms = buildCreatureFilterTerms(resref);
  let filterTermIndex = 0;
  await applyCreatureFilter(send, filterTerms[filterTermIndex] ?? resref);
  let lastRows = [];
  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (attempt > 0 && attempt % 20 === 0) {
      filterTermIndex = Math.min(filterTermIndex + 1, filterTerms.length - 1);
      await applyCreatureFilter(send, filterTerms[filterTermIndex] ?? resref);
    }
    const result = await evaluate(send, {
      returnByValue: true,
      expression: `(() => {
        const requested = ${JSON.stringify(resref)}.trim().toLowerCase();
        const requestedWithoutCrePrefix = requested.replace(/^cre_/u, "");
        const strictTargets = Array.from(
          new Set(
            [
              requested,
              requestedWithoutCrePrefix,
              "cre_" + requestedWithoutCrePrefix,
              "cre_template_" + requested,
              "cre_template_" + requestedWithoutCrePrefix,
              "cre_template_cre_" + requestedWithoutCrePrefix
            ].filter(Boolean)
          )
        );
        const normalizedTargets = ${JSON.stringify(filterTerms)}
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean);
        const rows = Array.from(document.querySelectorAll("[aria-label='creatures mode list'] button.scene-object-row"));
        const lastRows = rows.map((button) => button.textContent?.trim() ?? "");
        const exact = rows.find((button) => {
          const small = button.querySelector("small")?.textContent?.toLowerCase() ?? "";
          const smallParts = small.split("/").map((entry) => entry.trim()).filter(Boolean);
          return smallParts.some((entry) => strictTargets.includes(entry));
        });
        const loose = exact ?? rows.find((button) => {
          const text = (button.textContent ?? "").toLowerCase();
          const small = button.querySelector("small")?.textContent?.toLowerCase() ?? "";
          return normalizedTargets.some((target) => text.includes(target) || small.includes(target));
        });
        if (loose) {
          loose.scrollIntoView({ block: "center", inline: "nearest" });
          loose.click();
          const small = loose.querySelector("small")?.textContent?.trim() ?? "";
          const strong = loose.querySelector("strong")?.textContent?.trim() ?? "";
          return {
            selected: true,
            tag: strong,
            resref: small,
            rowText: loose.textContent?.trim() ?? "",
            matchMode: exact ? "strict-small-resref" : "loose-text"
          };
        }
        return { selected: false, lastRows };
      })()`
    });
    const value = result.result.value;
    lastRows = value.lastRows ?? lastRows;
    if (value.selected) {
      const verified = await waitForSelectedCreatureRow(send, resref);
      if (verified.selected) {
        return {
          tag: value.tag,
          resref: value.resref,
          rowText: value.rowText,
          matchMode: value.matchMode,
          activeRowText: verified.activeRowText
        };
      }
      lastRows = [verified.activeRowText, ...lastRows].filter(Boolean);
    }
    await sleep(250);
  }
  throw new Error(
    "Creature row not found for " + resref + ": " + JSON.stringify(lastRows.slice(0, 8))
  );
}

function buildCreatureFilterTerms(resref) {
  const normalized = String(resref ?? "").trim();
  const terms = [normalized];
  const withoutTemplatePrefix = normalized.replace(/^cre_/iu, "");
  if (withoutTemplatePrefix !== normalized) {
    terms.push(withoutTemplatePrefix);
  }
  const underscoreParts = withoutTemplatePrefix.split("_").filter(Boolean);
  for (let start = 1; start < underscoreParts.length; start += 1) {
    terms.push(underscoreParts.slice(start).join("_"));
  }
  const lastPart = underscoreParts.at(-1);
  if (lastPart) {
    terms.push(lastPart);
  }
  return Array.from(new Set(terms.filter((term) => term.length > 0)));
}

async function waitForSelectedCreatureRow(send, resref) {
  let activeRowText = "";
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = await evaluate(send, {
      returnByValue: true,
      expression: `(() => {
        const requested = ${JSON.stringify(resref)}.trim().toLowerCase();
        const requestedWithoutCrePrefix = requested.replace(/^cre_/u, "");
        const strictTargets = Array.from(
          new Set(
            [
              requested,
              requestedWithoutCrePrefix,
              "cre_" + requestedWithoutCrePrefix,
              "cre_template_" + requested,
              "cre_template_" + requestedWithoutCrePrefix,
              "cre_template_cre_" + requestedWithoutCrePrefix
            ].filter(Boolean)
          )
        );
        const activeRow = document.querySelector("[aria-label='creatures mode list'] button.scene-object-row[aria-selected='true']");
        const small = activeRow?.querySelector("small")?.textContent?.toLowerCase() ?? "";
        const smallParts = small.split("/").map((entry) => entry.trim()).filter(Boolean);
        const rowText = activeRow?.textContent?.trim() ?? "";
        return {
          selected: smallParts.some((entry) => strictTargets.includes(entry)),
          activeRowText: rowText
        };
      })()`
    });
    const value = result.result.value ?? {};
    activeRowText = value.activeRowText ?? activeRowText;
    if (value.selected) {
      return { selected: true, activeRowText };
    }
    await sleep(100);
  }
  return { selected: false, activeRowText };
}

async function applyCreatureFilter(send, resref) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = await evaluate(send, {
      returnByValue: true,
      expression: `(() => {
        const target = ${JSON.stringify(resref)};
        const input = document.querySelector("input[aria-label='Filter creatures']");
        if (!input) {
          return { filtered: false };
        }
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        input.focus();
        setValue?.call(input, "");
        input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward", data: null }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        setValue?.call(input, target);
        input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: target }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: target.at(-1) ?? "" }));
        return { filtered: true, target };
      })()`
    });
    if (result.result.value?.filtered === true) {
      return;
    }
    await sleep(250);
  }
  throw new Error("Filter creatures input did not become ready.");
}

async function selectCreatureAnimation(send, animationName, fallbackMode = "error") {
  let lastOptions = [];
  for (let attempt = 0; attempt < 720; attempt += 1) {
    const result = await evaluate(send, {
      returnByValue: true,
      expression: `(() => {
        const target = ${JSON.stringify(animationName)};
        const normalizedTarget = target.trim().toLowerCase();
        const select = document.querySelector("select[aria-label='Creature animation']");
        if (!select || select.options.length === 0) {
          return { ready: false, options: [] };
        }
        const options = Array.from(select.options);
        const option = options.find((entry) => {
          const value = (entry.value ?? "").trim().toLowerCase();
          const text = (entry.textContent ?? "").trim().toLowerCase();
          return value === normalizedTarget || text.startsWith(normalizedTarget + " ");
        });
        if (!option) {
          const fallbackMode = ${JSON.stringify(fallbackMode)};
          const fallbackOption =
            fallbackMode === "first" || fallbackMode === "attack"
              ? options
                  .filter((entry) => (entry.value ?? "").trim().length > 0)
                  .filter((entry) => {
                    if (fallbackMode !== "attack") {
                      return true;
                    }
                    const value = (entry.value ?? entry.textContent ?? "").trim().toLowerCase();
                    return /(slash[lrso]?|stab|shot|attack|swing|kick)/iu.test(value);
                  })
                  .sort((left, right) => {
                    const rank = (entry) => {
                      const value = (entry.value ?? entry.textContent ?? "").trim().toLowerCase();
                      if (fallbackMode === "attack") {
                        if (/slashl/iu.test(value)) {
                          return 0;
                        }
                        if (/slashr/iu.test(value)) {
                          return 1;
                        }
                        if (/slasho|slashs|stab/iu.test(value)) {
                          return 2;
                        }
                        if (/shot|attack|swing|kick/iu.test(value)) {
                          return 3;
                        }
                        return 20;
                      }
                      if (/^(?:c|nw)?pause\\d*$/iu.test(value) || value.includes("idle")) {
                        return 0;
                      }
                      if (/(?:^|[^a-z])ready[lr]?$/iu.test(value)) {
                        return 1;
                      }
                      if (/(?:^|[^a-z])walk[flrb]?$/iu.test(value)) {
                        return 2;
                      }
                      if (/(?:^|[^a-z])run[flrb]?$/iu.test(value)) {
                        return 3;
                      }
                      if (/(slash|stab|parry|attack|cast|damage|dead|die|appear|disappear|conjure|dodge|taunt|turn)/iu.test(value)) {
                        return 20;
                      }
                      return 10;
                    };
                    const rankDiff = rank(left) - rank(right);
                    if (rankDiff !== 0) {
                      return rankDiff;
                    }
                    return left.index - right.index;
                  })[0] ?? null
              : null;
          if (fallbackOption) {
            const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
            setValue?.call(select, fallbackOption.value);
            select.dispatchEvent(new Event("input", { bubbles: true }));
            select.dispatchEvent(new Event("change", { bubbles: true }));
            return {
              ready: true,
              selected: select.value === fallbackOption.value,
              fallbackSelected: true,
              requested: target,
              selectedValue: select.value,
              selectedText: fallbackOption.textContent?.trim() ?? "",
              fallbackMode,
              options: options.slice(0, 20).map((entry) => entry.textContent?.trim() ?? "")
            };
          }
          if (fallbackMode === "first") {
            return {
              ready: true,
              selected: true,
              noAnimationOptions: true,
              requested: target,
              selectedValue: "",
              selectedText: options[0]?.textContent?.trim() ?? "",
              fallbackMode,
              options: options.slice(0, 20).map((entry) => entry.textContent?.trim() ?? "")
            };
          }
          return {
            ready: true,
            missing: true,
            options: options.slice(0, 20).map((entry) => entry.textContent?.trim() ?? "")
          };
        }
        const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
        setValue?.call(select, option.value);
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return {
          ready: true,
          selected: select.value === option.value,
          requested: target,
          selectedValue: select.value,
          selectedText: option.textContent?.trim() ?? "",
          options: options.slice(0, 20).map((entry) => entry.textContent?.trim() ?? "")
        };
      })()`
    });
    const value = result.result.value;
    lastOptions = value.options ?? lastOptions;
    if (value.missing) {
      throw new Error(
        "Creature animation option not found for " +
          animationName +
          ": " +
          JSON.stringify(lastOptions)
      );
    }
    if (value.selected) {
      return {
        requested: value.requested,
        selectedValue: value.selectedValue,
        selectedText: value.selectedText,
        fallbackSelected: value.fallbackSelected === true,
        fallbackMode: value.fallbackMode ?? null,
        noAnimationOptions: value.noAnimationOptions === true
      };
    }
    await sleep(250);
  }
  throw new Error(
    "Creature animation select was not ready for " +
      animationName +
      ": " +
      JSON.stringify(lastOptions)
  );
}

async function selectCreatureAnimationState(send, animationState) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = await evaluate(send, {
      returnByValue: true,
      expression: `(() => {
        const input = document.querySelector("input[aria-label='Creature animation state']");
        if (!input || input.disabled) {
          return { ready: false };
        }
        const value = ${JSON.stringify(String(animationState))};
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setValue?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return { ready: true, value: input.value };
      })()`
    });
    const value = result.result.value;
    if (value?.ready && String(value.value) === String(animationState)) {
      return value;
    }
    await sleep(100);
  }
  throw new Error(`Creature animation state control was not ready for ${animationState}.`);
}

function assertCreatureAnimationStateMapped(
  status,
  animationState,
  expectedMappingStatus = "state-mapped"
) {
  const match = resolveCreatureAnimationStateMappingMatch(
    status,
    animationState,
    expectedMappingStatus
  );
  if (!match.ok) {
    throw new Error(
      `Creature animation state ${animationState} did not satisfy ${expectedMappingStatus}: ${JSON.stringify({
        mappedStates: match.mappedStates,
        mappingStatuses: match.mappingStatuses,
        selectedClipNames: match.selectedClipNames,
        playbackStatuses: match.playbackStatuses
      })}`
    );
  }
}

function resolveCreatureAnimationStateMappingMatch(
  status,
  animationState,
  expectedMappingStatus = "state-mapped"
) {
  const dataset = status?.dataset ?? {};
  const mappedStates = splitPipeValue(
    dataset.creatureAnimationMixerStates ?? dataset.creatureAnimationRuntimeStates
  );
  const mappingStatuses = splitPipeValue(
    dataset.creatureAnimationMixerStateMappingStatuses ??
      dataset.creatureAnimationRuntimeStateMappingStatuses
  );
  const selectedClipNames = splitPipeValue(
    dataset.creatureAnimationMixerSelectedClipNames ??
      dataset.creatureAnimationRuntimeSelectedClipNames
  );
  const playbackStatuses = splitPipeValue(
    dataset.creatureAnimationMixerPlaybackStatuses ??
      dataset.creatureAnimationRuntimePlaybackStatuses
  );
  const stateMatches = mappedStates.includes(String(animationState));
  const acceptsMappedOrUnavailable = expectedMappingStatus === "state-mapped-or-unavailable";
  const mapped = mappingStatuses.includes("state-mapped");
  const unavailable = mappingStatuses.includes("state-clip-unavailable");
  const mappingStatusMatches = acceptsMappedOrUnavailable
    ? mapped || unavailable
    : mappingStatuses.includes(expectedMappingStatus);
  const playbackMatches = acceptsMappedOrUnavailable
    ? (mapped && selectedClipNames.length > 0) ||
      (unavailable && selectedClipNames.length === 0 && playbackStatuses.includes("rest-pose"))
    : expectedMappingStatus === "state-mapped"
      ? selectedClipNames.length > 0
      : selectedClipNames.length === 0 && playbackStatuses.includes("rest-pose");
  return {
    ok: stateMatches && mappingStatusMatches && playbackMatches,
    mappedStates,
    mappingStatuses,
    selectedClipNames,
    playbackStatuses
  };
}

function assertCreatureAnimationFrameSampleExpectations(
  samples,
  {
    expectedAnimationLoopMode,
    expectAnimationCompleted,
    expectedAnimationFollowUpClip,
    expectedAnimationRunBlendPhases
  }
) {
  if (
    !expectedAnimationLoopMode &&
    !expectAnimationCompleted &&
    !expectedAnimationFollowUpClip &&
    expectedAnimationRunBlendPhases.length === 0
  ) {
    return;
  }
  const lastSample = Array.isArray(samples) ? samples.at(-1) : null;
  const dataset = lastSample?.proofRuntimeFrame?.dataset ?? lastSample?.status?.dataset ?? {};
  const loopModes = splitPipeValue(
    dataset.creatureAnimationMixerLoopModes ?? dataset.creatureAnimationRuntimeLoopModes
  ).flatMap((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean));
  const completedActionNames = splitPipeValue(
    dataset.creatureAnimationMixerCompletedActionNames ??
      dataset.creatureAnimationRuntimeCompletedActionNames
  );
  const handoffClipNames = splitPipeValue(
    dataset.creatureAnimationMixerHandoffClipNames ??
      dataset.creatureAnimationRuntimeHandoffClipNames
  ).map((value) => value.trim().toLowerCase());
  const runBlendPhases = splitPipeValue(
    dataset.creatureAnimationMixerRunBlendPhases ??
      dataset.creatureAnimationRuntimeRunBlendPhases
  ).flatMap((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean));
  if (expectedAnimationLoopMode && !loopModes.includes(expectedAnimationLoopMode)) {
    throw new Error(
      `Creature animation frame samples did not expose loop mode ${expectedAnimationLoopMode}: ${JSON.stringify({
        loopModes,
        completedActionNames
      })}`
    );
  }
  if (expectAnimationCompleted && completedActionNames.length < 1) {
    throw new Error(
      `Creature animation frame samples did not expose a completed action: ${JSON.stringify({
        loopModes,
        completedActionNames
      })}`
    );
  }
  if (
    expectedAnimationFollowUpClip &&
    !handoffClipNames.includes(expectedAnimationFollowUpClip)
  ) {
    throw new Error(
      `Creature animation frame samples did not hand off to ${expectedAnimationFollowUpClip}: ${JSON.stringify({
        loopModes,
        completedActionNames,
        handoffClipNames
      })}`
    );
  }
  const missingBlendPhases = expectedAnimationRunBlendPhases.filter(
    (phase) => !runBlendPhases.includes(phase)
  );
  if (missingBlendPhases.length > 0) {
    throw new Error(
      `Creature animation frame samples did not expose AnimRun blend phases ${missingBlendPhases.join(", ")}: ${JSON.stringify({
        expectedAnimationRunBlendPhases,
        runBlendPhases
      })}`
    );
  }
}

async function restartCreatureAnimationForCapture(send, animationName, fallbackMode = "error") {
  await evaluate(send, {
    returnByValue: true,
    expression: `(() => {
      const select = document.querySelector("select[aria-label='Creature animation']");
      if (!select) {
        return { reset: false, reason: "animation_select_missing" };
      }
      const neutralOption =
        Array.from(select.options).find((entry) => (entry.value ?? "").trim().length === 0) ??
        select.options[0] ??
        null;
      if (!neutralOption) {
        return { reset: false, reason: "animation_select_has_no_options" };
      }
      const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setValue?.call(select, neutralOption.value);
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return { reset: true, selectedValue: select.value };
    })()`
  });
  await sleep(120);
  return selectCreatureAnimation(send, animationName, fallbackMode);
}

async function resetCreatureAnimationTimeForCapture(send, animationName, fallbackMode = "error") {
  const selectedAnimation = await selectCreatureAnimation(send, animationName, fallbackMode);
  const proofRuntimeFrame = await sampleCreatureProofRuntimeAnimationFrame(send, 0);
  if (proofRuntimeFrame.ok) {
    await sleep(50);
    return selectedAnimation;
  }
  return restartCreatureAnimationForCapture(send, animationName, fallbackMode);
}

async function resetCreatureAnimationStateTimeForCapture(send, animationState) {
  // Re-selecting the same controlled input does not recreate the preview playback.
  await selectCreatureAnimationState(send, animationState === -1 ? -2 : -1);
  await sleep(80);
  await selectCreatureAnimationState(send, animationState);
  const proofRuntimeFrame = await sampleCreatureProofRuntimeAnimationFrame(send, 0);
  if (proofRuntimeFrame.ok) {
    await sleep(50);
    return;
  }
  await sleep(120);
  await selectCreatureAnimationState(send, animationState);
}

async function captureCreatureAnimationFrameSamples(
  send,
  {
    resref,
    animationName,
    animationState,
    animationFallbackMode,
    expectedAnimationStateMappingStatus,
    animationFrameCaptureMode,
    outDir,
    captureStem,
    frameTimesSeconds,
    canvasReadyWaitOptions
  }
) {
  const selectedAnimation = animationName
    ? await selectCreatureAnimation(send, animationName, animationFallbackMode)
    : null;
  if (animationState !== null && animationState !== undefined) {
    await resetCreatureAnimationStateTimeForCapture(send, animationState);
  }
  const expectedAnimationName =
    String(selectedAnimation?.selectedValue ?? "").trim() || animationName;
  const startStatus = await waitForCreatureCanvasReady(send, resref, expectedAnimationName, {
    ...canvasReadyWaitOptions,
    stableReadyTarget: 3,
    intervalMs: Math.min(canvasReadyWaitOptions?.intervalMs ?? 300, 100),
    ...(animationState !== null && animationState !== undefined
      ? {
          expectedAnimationState: animationState,
          expectedAnimationStateMappingStatus
        }
      : {})
  });
  if (!startStatus.ok) {
    throw new Error(
      `Creature canvas was not ready before animation frame sampling for ${resref}: ${JSON.stringify(
        startStatus.issues ?? []
      )}`
    );
  }
  if (animationState !== null && animationState !== undefined) {
    assertCreatureAnimationStateMapped(
      startStatus,
      animationState,
      expectedAnimationStateMappingStatus
    );
  }
  const startStateMappingStatuses = splitPipeValue(
    startStatus?.dataset?.creatureAnimationMixerStateMappingStatuses ??
      startStatus?.dataset?.creatureAnimationRuntimeStateMappingStatuses
  );
  if (startStateMappingStatuses.includes("state-clip-unavailable")) {
    return {
      selectedAnimation,
      startStatus,
      samples: []
    };
  }
  const samples = [];
  const startedAt = Date.now();
  let previousHash = null;
  let previousEquipmentStateSignature = null;
  for (const frameTimeSeconds of frameTimesSeconds) {
    const waitMs = Math.max(0, Math.round(frameTimeSeconds * 1000) - (Date.now() - startedAt));
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    const frameStem = `${captureStem}-frame-${String(
      Math.round(frameTimeSeconds * 1000)
    ).padStart(5, "0")}ms`;
    const framePath = path.join(outDir, `${frameStem}.png`);
    let proofRuntimeFrame = null;
    let captureMode = null;
    let status = null;
    let proofRuntimeIssues = [];
    let frameAttempt = 0;
    for (
      frameAttempt = 1;
      frameAttempt <= FRAME_SAMPLE_TRANSIENT_RETRY_ATTEMPTS;
      frameAttempt += 1
    ) {
      proofRuntimeFrame =
        animationFrameCaptureMode === "state"
          ? await sampleCreatureProofRuntimeAnimationState(send, frameTimeSeconds)
          : await captureCreatureProofRuntimeAnimationFrame(send, {
              outputPath: framePath,
              timeSeconds: frameTimeSeconds
            });
      captureMode = proofRuntimeFrame.ok
        ? animationFrameCaptureMode === "state"
          ? "proof-runtime-hook-state"
          : "proof-runtime-hook"
        : "page-screenshot-fallback";
      status = await readCreatureStatus(send, resref, expectedAnimationName);
      proofRuntimeIssues = collectCreatureProofRuntimeFrameIssues(
        proofRuntimeFrame,
        status
      );
      status = normalizeCreatureFrameSampleStatusWhenRuntimeIsReady(
        status,
        proofRuntimeFrame,
        expectedAnimationName
      );
      const frameIssues = [...proofRuntimeIssues, ...(status.issues ?? [])];
      const hasOnlyTransientIssues =
        frameIssues.length > 0 &&
        frameIssues.every((issue) => FRAME_SAMPLE_TRANSIENT_ISSUES.has(issue));
      if ((proofRuntimeIssues.length === 0 && status.ok) || !hasOnlyTransientIssues) {
        break;
      }
      await sleep(FRAME_SAMPLE_TRANSIENT_RETRY_INTERVAL_MS);
    }
    const statusElapsedSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(3));
    if (!proofRuntimeFrame.ok && animationFrameCaptureMode !== "state") {
      if (status.canvasRect) {
        await capturePng(send, framePath, status.canvasRect);
      } else {
        await capturePng(send, framePath);
      }
    }
    const stateSignature = hashCreatureProofRuntimeFrameState(proofRuntimeFrame);
    const equipmentStateSignature = hashCreatureProofEquipmentFrameState(proofRuntimeFrame);
    const sha256 =
      animationFrameCaptureMode === "state"
        ? stateSignature
        : hashFileSha256(framePath);
    const sizeBytes =
      animationFrameCaptureMode === "state" ? 0 : fs.statSync(framePath).size;
    samples.push({
      requestedTimeSeconds: Number(frameTimeSeconds.toFixed(3)),
      statusElapsedSeconds,
      actualElapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(3)),
      captureMode,
      path: animationFrameCaptureMode === "state" ? null : framePath,
      sizeBytes,
      sha256,
      changedFromPrevious: previousHash ? sha256 !== previousHash : null,
      equipmentStateSignature: equipmentStateSignature || null,
      equipmentChangedFromPrevious: previousEquipmentStateSignature && equipmentStateSignature
        ? equipmentStateSignature !== previousEquipmentStateSignature
        : null,
      proofRuntimeIssues,
      proofRuntimeFrame: proofRuntimeFrame.ok ? proofRuntimeFrame : null,
      status,
      frameAttempt
    });
    if (proofRuntimeIssues.length > 0) {
      fs.writeFileSync(
        path.join(outDir, `${frameStem}-diagnostic-state.json`),
        `${JSON.stringify(samples[samples.length - 1], null, 2)}\n`
      );
      throw new Error(
        `Creature proof runtime frame failed for ${resref} at ${frameTimeSeconds}s: ${JSON.stringify(
          proofRuntimeIssues
        )}`
      );
    }
    if (!status.ok) {
      throw new Error(
        `Creature animation frame sample was not ready for ${resref} at ${frameTimeSeconds}s: ${JSON.stringify(
          status.issues ?? []
        )}`
      );
    }
    previousHash = sha256;
    if (equipmentStateSignature) {
      previousEquipmentStateSignature = equipmentStateSignature;
    }
  }
  const uniqueFrameHashes = new Set(samples.map((sample) => sample.sha256));
  if (
    samples.length > 1 &&
    uniqueFrameHashes.size < 2 &&
    expectedAnimationStateMappingStatus !== "state-clip-unavailable"
  ) {
    throw new Error(
      `Creature animation frame samples did not change for ${resref} / ${animationName || `state-${animationState}`}; uniqueFrameHashes=${uniqueFrameHashes.size}/${samples.length}`
    );
  }
  const equipmentStateSignatures = samples
    .map((sample) => sample.equipmentStateSignature)
    .filter(Boolean);
  const uniqueEquipmentStateSignatures = new Set(equipmentStateSignatures);
  const selectedAnimationName =
    String(selectedAnimation?.selectedValue ?? "").trim() || animationName;
  if (
    isCreatureEquipmentMotionExpected(selectedAnimationName) &&
    equipmentStateSignatures.length > 1 &&
    uniqueEquipmentStateSignatures.size < 2
  ) {
    throw new Error(
      `Creature equipment frame samples did not change for ${resref} / ${selectedAnimationName}; uniqueEquipmentStateSignatures=${uniqueEquipmentStateSignatures.size}/${equipmentStateSignatures.length}`
    );
  }
  return {
    selectedAnimation,
    startStatus,
    samples
  };
}

async function waitForCreatureCanvasReady(
  send,
  resref,
  expectedAnimationName = "",
  options = {}
) {
  let lastStatus = null;
  let stableReadyCount = 0;
  const issueCounts = {};
  const unsettledCounts = {};
  const maxAttempts = Number.isFinite(options.maxAttempts) ? options.maxAttempts : 280;
  const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 300;
  const stableReadyTarget = Number.isFinite(options.stableReadyTarget)
    ? options.stableReadyTarget
    : 3;
  const expectedAnimationState = Number.isFinite(options.expectedAnimationState)
    ? Math.trunc(options.expectedAnimationState)
    : null;
  const expectedAnimationStateMappingStatus = String(
    options.expectedAnimationStateMappingStatus ?? "state-mapped"
  );
  const maxSelectionRecoveries = Number.isFinite(options.maxSelectionRecoveries)
    ? Math.max(0, Math.trunc(options.maxSelectionRecoveries))
    : 2;
  const selectionRecoveryStreakTarget = Number.isFinite(options.selectionRecoveryStreakTarget)
    ? Math.max(1, Math.trunc(options.selectionRecoveryStreakTarget))
    : 3;
  let selectionMismatchStreak = 0;
  let selectionRecoveryCount = 0;
  let selectionRecoveryFailureCount = 0;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await readCreatureStatus(send, resref, expectedAnimationName);
    lastStatus = status;
    const selectionDrifted =
      status.issues?.includes("selected_resref_not_visible") === true &&
      status.issues?.includes("runtime_object_resref_mismatch") === true;
    selectionMismatchStreak = selectionDrifted ? selectionMismatchStreak + 1 : 0;
    if (
      selectionMismatchStreak >= selectionRecoveryStreakTarget &&
      selectionRecoveryCount < maxSelectionRecoveries
    ) {
      selectionRecoveryCount += 1;
      selectionMismatchStreak = 0;
      stableReadyCount = 0;
      try {
        await selectCreatureByResref(send, resref);
        if (expectedAnimationName) {
          await selectCreatureAnimation(send, expectedAnimationName, "error");
        }
        if (expectedAnimationState !== null) {
          await resetCreatureAnimationStateTimeForCapture(send, expectedAnimationState);
        }
      } catch {
        selectionRecoveryFailureCount += 1;
      }
      await sleep(intervalMs);
      continue;
    }
    const modelLoadSettled = status.dataset?.placeableModelStatus !== "loading";
    const textureQueueActive = Number(status.dataset?.placeableTextureLoadQueueActiveCount ?? 0);
    const textureQueuePending = Number(status.dataset?.placeableTextureLoadQueuePendingCount ?? 0);
    const textureLoadSettled =
      status.dataset?.placeableModelTextureStatus !== "loading" &&
      (!Number.isFinite(textureQueueActive) || textureQueueActive <= 0) &&
      (!Number.isFinite(textureQueuePending) || textureQueuePending <= 0);
    const creaturePartModelLoadTotal = Number(
      status.dataset?.creaturePartModelRuntimeLoadTotal ?? 0
    );
    const creaturePartTextureStatus = String(
      status.dataset?.creaturePartModelRuntimeTextureStatus ?? ""
    );
    const creaturePartTextureCount = Number(
      status.dataset?.creaturePartModelRuntimeTextureCount ?? 0
    );
    const creaturePartTextureLoaded = Number(
      status.dataset?.creaturePartModelRuntimeTextureLoaded ?? 0
    );
    const creaturePartTexturesSettled =
      !Number.isFinite(creaturePartModelLoadTotal) ||
      creaturePartModelLoadTotal <= 0 ||
      (creaturePartTextureStatus.length > 0 &&
        creaturePartTextureStatus !== "loading" &&
        (!Number.isFinite(creaturePartTextureCount) ||
          !Number.isFinite(creaturePartTextureLoaded) ||
          creaturePartTextureLoaded >= creaturePartTextureCount));
    const animationSettled =
      !status.selectedAnimationValue ||
      status.dataset?.creatureAnimationMixerCount !== "0" ||
      status.dataset?.creatureAnimationRuntimePlaybackStatuses === "runtime-effects";
    const animationStateSettled =
      expectedAnimationState === null ||
      resolveCreatureAnimationStateMappingMatch(
        status,
        expectedAnimationState,
        expectedAnimationStateMappingStatus
      ).ok;
    for (const issue of status.issues ?? []) {
      issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
    }
    if (!modelLoadSettled) {
      unsettledCounts.modelLoad = (unsettledCounts.modelLoad ?? 0) + 1;
    }
    if (!textureLoadSettled) {
      unsettledCounts.textureLoad = (unsettledCounts.textureLoad ?? 0) + 1;
    }
    if (!creaturePartTexturesSettled) {
      unsettledCounts.creaturePartTextures =
        (unsettledCounts.creaturePartTextures ?? 0) + 1;
    }
    if (!animationSettled) {
      unsettledCounts.animation = (unsettledCounts.animation ?? 0) + 1;
    }
    if (!animationStateSettled) {
      unsettledCounts.animationState = (unsettledCounts.animationState ?? 0) + 1;
    }
    if (
      status.ok &&
      modelLoadSettled &&
      textureLoadSettled &&
      creaturePartTexturesSettled &&
      animationSettled &&
      animationStateSettled
    ) {
      stableReadyCount += 1;
      if (stableReadyCount >= stableReadyTarget) {
        return {
          ...status,
          proofWait: {
            attempts: attempt + 1,
            stableReadyTarget,
            issueCounts,
            unsettledCounts,
            selectionRecoveryCount,
            selectionRecoveryFailureCount
          }
        };
      }
    } else {
      stableReadyCount = 0;
    }
    await sleep(intervalMs);
  }
  return {
    ...lastStatus,
    ok: false,
    issues: [...(lastStatus?.issues ?? []), "timeout_waiting_for_creature_canvas_ready"],
    proofWait: {
      attempts: maxAttempts,
      stableReadyTarget,
      issueCounts,
      unsettledCounts,
      selectionRecoveryCount,
      selectionRecoveryFailureCount
    }
  };
}

async function readDomStatus(send) {
  const status = await evaluate(send, {
    returnByValue: true,
    expression: `(() => {
      let authStored = false;
      let modeStored = null;
      let storageError = "";
      try {
        authStored = Boolean(window.localStorage.getItem("aurora_web.auth_session.v1"));
        modeStored = window.localStorage.getItem("aurora_web.workspace_mode.v1");
      } catch (error) {
        storageError = error instanceof Error ? error.message : String(error);
      }
      return {
        href: window.location.href,
        routePath: window.location.pathname,
        documentReadyState: document.readyState,
        hasUsername: Boolean(document.querySelector("#username")),
        hasPassword: Boolean(document.querySelector("#password")),
        hasLoginForm: Boolean(document.querySelector("#username") && document.querySelector("#password")),
        hasCreatureFilter: Boolean(document.querySelector("input[aria-label='Filter creatures']")),
        hasCreatureList: Boolean(document.querySelector("[aria-label='creatures mode list']")),
        creatureRowCount: document.querySelectorAll("[aria-label='creatures mode list'] button.scene-object-row").length,
        hasCanvas: Boolean(document.querySelector("canvas, [aria-label='workspace render canvas']")),
        bodyTextLength: document.body?.innerText?.length ?? 0,
        bodyTextSample: (document.body?.innerText ?? "").slice(0, 400),
        authStored,
        modeStored,
        storageError
      };
    })()`
  });
  return status.result.value;
}

async function readCreatureStatus(send, resref, expectedAnimationName = "") {
  const status = await evaluate(send, {
    returnByValue: true,
    expression: `(() => {
      const requested = ${JSON.stringify(resref)}.toLowerCase();
      const expectedAnimationName = ${JSON.stringify(expectedAnimationName)}.trim().toLowerCase();
      const canvas = document.querySelector("canvas");
      const renderCanvas = document.querySelector("[aria-label='workspace render canvas']");
      const activeRow = document.querySelector("[aria-label='creatures mode list'] button[aria-selected='true']");
      const rightPanelText = Array.from(document.querySelectorAll("aside, article, section"))
        .map((element) => element.innerText ?? "")
        .find((text) => text.includes("Creatures Mode") || text.includes("viewport model")) ?? "";
      const bodyText = document.body?.innerText ?? "";
      const rowText = activeRow?.textContent?.trim() ?? "";
      const canvasRect = (canvas ?? renderCanvas)?.getBoundingClientRect();
      const canvasWidth = canvas?.width ?? 0;
      const canvasHeight = canvas?.height ?? 0;
      const animationSelect = document.querySelector("select[aria-label='Creature animation']");
      const datasetSource =
        document.querySelector("[data-creature-animation-mixer-count]") ??
        canvas?.closest("[data-creature-animation-mixer-count]") ??
        null;
      const dataset = datasetSource
        ? Object.fromEntries(
            Object.entries(datasetSource.dataset)
              .filter(([key]) =>
                key.startsWith("creatureAnimation") ||
                key.startsWith("creaturePart") ||
                key.startsWith("placeableModel") ||
                key.startsWith("placeableTexture") ||
                key.startsWith("areaCameraFrame") ||
                key.startsWith("vfx")
              )
          )
        : {};
      const splitPipe = (value) =>
        String(value ?? "")
          .split("|")
          .map((entry) => entry.trim())
          .filter(Boolean);
      const pipeNumberValues = (value) =>
        splitPipe(value)
          .map((entry) => Number(entry))
          .filter((entry) => Number.isFinite(entry));
      const canvasHasPixels = Boolean(canvas && canvasWidth > 64 && canvasHeight > 64);
      const rowTextLower = rowText.toLowerCase();
      const rightPanelTextLower = rightPanelText.toLowerCase();
      const selectedMatches =
        rowTextLower.includes(" / " + requested) ||
        rowTextLower.includes("_" + requested) ||
        rightPanelTextLower.includes("resref: " + requested);
      const loadingPattern = /loading creatures|loading render payload|loading .*assets|orbit paused/i;
      const loadingText = Array.from(document.querySelectorAll("body *")).some((element) => {
        const text = (element.innerText ?? element.textContent ?? "").trim();
        if (text.length > 300) {
          return false;
        }
        if (!loadingPattern.test(text)) {
          return false;
        }
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity || "1") > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      });
      const inspectorReady = /viewport model:|status:\s*ready|model url:|asset refs:/i.test(rightPanelText);
      const directModelCreature = /viewport model:\\s*direct model/iu.test(rightPanelText);
      const specialDirectModelWithoutEquipmentOverlay =
        /model type:\\s*s\\b/iu.test(rightPanelText) && directModelCreature;
      const equipmentModelExpected =
        !specialDirectModelWithoutEquipmentOverlay &&
        /\\bmodels\\s+[^\\n]+->\\s*(?:rhand_g|lhand_g|head_g|torso_g)\\b/iu.test(rightPanelText);
      const alertText = Array.from(document.querySelectorAll("[role='alert']"))
        .map((element) => element.textContent?.trim())
        .filter(Boolean);
      const issues = [];
      if (!selectedMatches) {
        issues.push("selected_resref_not_visible");
      }
      const runtimeObjectText = [
        dataset.creatureAnimationRuntimeObjectIds,
        dataset.creatureAnimationMixerObjectIds,
        dataset.creaturePartModelRuntimeObjectId,
        dataset.placeableModelObjectId
      ]
        .map((entry) => String(entry ?? "").toLowerCase())
        .filter(Boolean)
        .join(" ");
      if (runtimeObjectText && !runtimeObjectText.includes(requested)) {
        issues.push("runtime_object_resref_mismatch");
      }
      if (!canvasHasPixels) {
        issues.push("canvas_missing_or_tiny");
      }
      if (loadingText) {
        issues.push("loading_overlay_visible");
      }
      if (dataset.placeableModelTextureStatus === "loading") {
        issues.push("texture_loading");
      }
      const textureStatus = String(dataset.placeableModelTextureStatus ?? "");
      const textureCount = Number(dataset.placeableModelTextureCount ?? 0);
      const textureLoaded = Number(dataset.placeableModelTextureLoaded ?? 0);
      const textureSource = String(dataset.placeableModelTextureSource ?? "");
      const textureQueueActive = Number(dataset.placeableTextureLoadQueueActiveCount ?? 0);
      const textureQueuePending = Number(dataset.placeableTextureLoadQueuePendingCount ?? 0);
      const textureUrlCountMatch = rightPanelText.match(/texture URLs:\\s*(\\d+)/iu);
      const expectedTextureUrlCount = textureUrlCountMatch
        ? Number(textureUrlCountMatch[1] ?? 0)
        : 0;
      if (
        (Number.isFinite(textureQueueActive) && textureQueueActive > 0) ||
        (Number.isFinite(textureQueuePending) && textureQueuePending > 0)
      ) {
        issues.push("texture_loading");
      }
      if (
        expectedTextureUrlCount > 0 &&
        textureStatus === "missing" &&
        textureCount <= 0
      ) {
        issues.push("texture_not_fully_applied");
      }
      if (
        textureCount > 0 &&
        textureLoaded < textureCount &&
        ["partial", "missing", "fallback"].includes(textureStatus)
      ) {
        issues.push("texture_not_fully_applied");
      }
      if (
        textureCount > textureLoaded &&
        /creature-(?:material|skin)-fallback|creature-material-tint|creature-skin-fallback-tint/iu.test(
          textureSource
        )
      ) {
        issues.push("texture_fallback_only");
      }
      const creaturePartModelLoadTotal = Number(
        dataset.creaturePartModelRuntimeLoadTotal ?? 0
      );
      const creaturePartTextureStatus = String(
        dataset.creaturePartModelRuntimeTextureStatus ?? ""
      );
      const creaturePartTextureCount = Number(
        dataset.creaturePartModelRuntimeTextureCount ?? 0
      );
      const creaturePartTextureLoaded = Number(
        dataset.creaturePartModelRuntimeTextureLoaded ?? 0
      );
      if (
        Number.isFinite(creaturePartModelLoadTotal) &&
        creaturePartModelLoadTotal > 0 &&
        (!creaturePartTextureStatus || creaturePartTextureStatus === "loading")
      ) {
        issues.push("creature_part_texture_loading");
      }
      if (
        Number.isFinite(creaturePartModelLoadTotal) &&
        creaturePartModelLoadTotal > 0 &&
        creaturePartTextureStatus &&
        creaturePartTextureStatus !== "applied" &&
        (creaturePartTextureCount <= 0 ||
          creaturePartTextureLoaded < creaturePartTextureCount)
      ) {
        issues.push("creature_part_texture_not_fully_applied");
      }
      if (
        pipeNumberValues(dataset.creatureAnimationMixerSuppressedMissingTargetTrackCounts)
          .some((count) => count > 0)
      ) {
        issues.push("animation_missing_target_tracks_suppressed");
      }
      if (
        pipeNumberValues(dataset.creaturePartModelRuntimeVisibleSkeletonMeshCount)
          .some((count) => count > 0)
      ) {
        issues.push("creature_visible_driver_skeleton_meshes");
      }
      const skeletonMeshCounts = pipeNumberValues(dataset.creaturePartModelRuntimeSkeletonMeshCount);
      const suppressedSkeletonMeshCounts = pipeNumberValues(
        dataset.creaturePartModelRuntimeSuppressedSkeletonMeshCount
      );
      if (
        skeletonMeshCounts.some((count, index) => {
          const suppressed = suppressedSkeletonMeshCounts[index] ?? 0;
          return count > 0 && suppressed < count;
        })
      ) {
        issues.push("creature_driver_skeleton_meshes_not_all_suppressed");
      }
      if (
        !directModelCreature &&
        splitPipe(dataset.creaturePartModelRuntimeVisibleMeshSlots)
          .some((slot) => slot.toLowerCase() === "none")
      ) {
        issues.push("creature_part_model_visible_mesh_without_part_slot");
      }
      if (
        pipeNumberValues(dataset.creaturePartModelRuntimeEquipmentLoosePartRootCount)
          .some((count) => count > 0)
      ) {
        issues.push("creature_equipment_model_parts_not_grouped");
      }
      if (equipmentModelExpected) {
        const equipmentLoadStatus = String(
          dataset.placeableModelCreatureEquipmentModelPartLoadStatus ?? ""
        );
        const equipmentTotal = Number(
          dataset.placeableModelCreatureEquipmentModelPartTotalCount ?? 0
        );
        const equipmentLoaded = Number(
          dataset.placeableModelCreatureEquipmentModelPartLoadedCount ?? 0
        );
        const equipmentVisible = Number(
          dataset.creaturePartModelRuntimeEquipmentVisibleMeshCount ?? 0
        );
        if (
          equipmentLoadStatus !== "loaded" ||
          !Number.isFinite(equipmentTotal) ||
          equipmentTotal <= 0 ||
          !Number.isFinite(equipmentLoaded) ||
          equipmentLoaded < equipmentTotal
        ) {
          issues.push("creature_equipment_model_parts_not_loaded");
        } else if (!Number.isFinite(equipmentVisible) || equipmentVisible <= 0) {
          issues.push("creature_equipment_model_parts_not_visible");
        }
      }
      if (
        splitPipe(dataset.creatureAnimationMixerDirectAutoSafetyStatuses)
          .includes("suppressed-source-hierarchy-rebase")
      ) {
        issues.push("animation_guard_suppressed_source_hierarchy_rebase");
      }
      const selectedClipNames = splitPipe(dataset.creatureAnimationMixerSelectedClipNames);
      const playbackStatuses = splitPipe(
        dataset.creatureAnimationMixerPlaybackStatuses ??
          dataset.creatureAnimationRuntimePlaybackStatuses
      );
      const selectedAnimationValue = animationSelect?.value?.trim().toLowerCase() ?? "";
      if (expectedAnimationName && selectedAnimationValue !== expectedAnimationName) {
        issues.push("animation_selection_not_retained");
      }
      if (animationSelect?.value && selectedClipNames.length === 0) {
        issues.push("animation_selected_clip_missing");
      }
      if (
        animationSelect?.value &&
        playbackStatuses.length > 0 &&
        !playbackStatuses.some((status) => status === "playing" || status === "runtime-effects")
      ) {
        issues.push("animation_not_playing");
      }
      if (animationSelect?.value && selectedClipNames.length > 0) {
        const animRunModes = splitPipe(dataset.creatureAnimationMixerAnimRunModes);
        const loopModes = splitPipe(dataset.creatureAnimationMixerLoopModes);
        const transitionSeconds = splitPipe(dataset.creatureAnimationMixerTransitionSeconds);
        if (
          !animRunModes.some(
            (mode) => mode === "aurora-lite" || mode === "aurora-stack-v1"
          )
        ) {
          issues.push("animation_animrun_mode_missing");
        }
        if (loopModes.length === 0) {
          issues.push("animation_loop_mode_missing");
        }
        if (transitionSeconds.length === 0) {
          issues.push("animation_transition_metadata_missing");
        }
      }
      if (!inspectorReady) {
        issues.push("inspector_render_contract_not_ready");
      }
      if (alertText.length > 0) {
        issues.push("alert_visible");
      }
      return {
        ok: issues.length === 0,
        href: window.location.href,
        requestedResref: requested,
        selectedRowText: rowText,
        rightPanelText: rightPanelText.slice(0, 2500),
        alertText,
        bodyTextSample: bodyText.slice(0, 1200),
        selectedAnimationValue: animationSelect?.value ?? null,
        selectedAnimationText:
          animationSelect?.selectedOptions?.[0]?.textContent?.trim() ?? null,
        dataset,
        canvasWidth,
        canvasHeight,
        canvasRect: canvasRect
          ? {
              x: Math.max(0, Math.floor(canvasRect.x)),
              y: Math.max(0, Math.floor(canvasRect.y)),
              width: Math.max(1, Math.floor(canvasRect.width)),
              height: Math.max(1, Math.floor(canvasRect.height)),
              scale: 1
            }
          : null,
        issues
      };
    })()`
  });
  return status.result.value;
}

async function evaluate(send, params) {
  const result = await send("Runtime.evaluate", params);
  if (result.exceptionDetails) {
    const text =
      result.exceptionDetails.exception?.description ??
      result.exceptionDetails.text ??
      JSON.stringify(result.exceptionDetails);
    throw new Error(`Runtime.evaluate failed: ${text}`);
  }
  return result;
}

async function capturePng(send, outputPath, clip = null) {
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
    ...(clip ? { clip } : {})
  });
  fs.writeFileSync(outputPath, Buffer.from(screenshot.data, "base64"));
}

async function captureCreatureProofRuntimeAnimationFrame(send, { outputPath, timeSeconds }) {
  const value = await sampleCreatureProofRuntimeAnimationFrame(send, timeSeconds);
  if (!value.ok || !String(value.dataUrl ?? "").startsWith("data:image/png;base64,")) {
    return {
      ok: false,
      issue: value.issue ?? "creature_proof_runtime_hook_capture_failed",
      requestedTimeSeconds: timeSeconds,
      width: value.width ?? 0,
      height: value.height ?? 0,
      dataset: value.dataset ?? {},
      sceneGraph: value.sceneGraph ?? null,
      samples: value.samples ?? []
    };
  }
  writeDataUrlFile(outputPath, value.dataUrl);
  return {
    ok: true,
    requestedTimeSeconds: value.requestedTimeSeconds,
    width: value.width,
    height: value.height,
    dataset: value.dataset ?? {},
    sceneGraph: value.sceneGraph ?? null,
    samples: value.samples ?? []
  };
}

function collectCreatureProofRuntimeFrameIssues(proofRuntimeFrame, status) {
  const issues = [];
  const sceneGraph = proofRuntimeFrame?.sceneGraph;
  if (!sceneGraph || typeof sceneGraph !== "object") {
    return issues;
  }
  const childNames = Array.isArray(sceneGraph.objectRootChildNames)
    ? sceneGraph.objectRootChildNames.map((entry) => String(entry ?? ""))
    : [];
  const requestedResref = String(status?.requestedResref ?? "").trim().toLowerCase();
  const namedRuntimeRoots = childNames
    .filter((name) => name.includes("preview:"))
    .map((name) => name.toLowerCase());
  if (
    requestedResref &&
    namedRuntimeRoots.length > 0 &&
    namedRuntimeRoots.every((name) => !name.includes(requestedResref))
  ) {
    issues.push("creature_scenegraph_resref_mismatch");
  }
  const partGroupCount = childNames.filter((name) => /:creature-part-models$/iu.test(name)).length;
  if (partGroupCount > 1) {
    issues.push("creature_part_model_groups_duplicated");
  }
  const dataset = status?.dataset ?? proofRuntimeFrame?.dataset ?? {};
  const numberFromDataset = (key) => {
    const value = Number(dataset[key] ?? 0);
    return Number.isFinite(value) ? value : 0;
  };
  const partVisibleMeshCount = numberFromDataset("creaturePartModelRuntimeVisibleMeshCount");
  const directVisibleMeshCount = numberFromDataset("placeableModelMeshCount");
  const contractVisibleMeshCount =
    (partVisibleMeshCount > 0 ? partVisibleMeshCount : directVisibleMeshCount) +
    numberFromDataset("creaturePartModelRuntimeEquipmentVisibleMeshCount");
  const sceneVisibleMeshCount = Number(sceneGraph.visibleMeshCount ?? 0);
  const runtimeEquipmentVisibleMeshCount = numberFromDataset(
    "creaturePartModelRuntimeEquipmentVisibleMeshCount"
  );
  const sceneEquipmentVisibleMeshCount = Number(sceneGraph.equipmentVisibleMeshCount ?? 0);
  if (hasCreatureLooseBodyHierarchyMeshes(sceneGraph, dataset)) {
    issues.push("creature_body_loose_hierarchy_meshes");
  }
  if (
    runtimeEquipmentVisibleMeshCount > 0 &&
    (!Number.isFinite(sceneEquipmentVisibleMeshCount) ||
      sceneEquipmentVisibleMeshCount <= 0)
  ) {
    issues.push("creature_equipment_scenegraph_missing_visible_meshes");
  }
  issues.push(...collectCreatureHeldWeaponGripIssues(sceneGraph, dataset));
  issues.push(...collectCreatureBowEquipmentVisualIssues(sceneGraph, dataset, status));
  issues.push(...collectCreatureSpecialDirectModelEquipmentLeakIssues(sceneGraph, dataset, status));
  issues.push(...collectCreatureFloatingSourceSkinIssues(sceneGraph, dataset));
  if (
    partGroupCount > 0 &&
    contractVisibleMeshCount > 0 &&
    sceneVisibleMeshCount > Math.max(contractVisibleMeshCount + 4, contractVisibleMeshCount * 1.35)
  ) {
    issues.push("creature_scene_visible_mesh_count_exceeds_runtime_contract");
  }
  return issues;
}

function collectCreatureFloatingSourceSkinIssues(_sceneGraph, dataset = {}) {
  const sourceSkinMeshNames = collectCreatureSourceSkinMeshNameKeys(dataset);
  if (sourceSkinMeshNames.size === 0) {
    return [];
  }
  const names = splitPipeValue(dataset?.creaturePartModelRuntimeVisibleMeshNames);
  const slots = splitPipeValue(dataset?.creaturePartModelRuntimeVisibleMeshSlots);
  const centers = parseSceneGraphVectorEntries(
    splitPipeValue(dataset?.creaturePartModelRuntimeVisibleMeshCenters)
  );
  if (names.length === 0 || centers.length === 0) {
    return [];
  }

  const anchorCenters = centers.filter((center, index) => {
    if (!Array.isArray(center)) {
      return false;
    }
    const slot = String(slots[index] ?? "").toLowerCase();
    const name = String(names[index] ?? "").toLowerCase();
    return (
      !sourceSkinMeshNames.has(name) &&
      ["torso", "pelvis", "belt", "neck"].includes(slot)
    );
  });
  const bodyCenter = averageCreatureRuntimeVectors(anchorCenters);
  if (!bodyCenter) {
    return [];
  }

  const floatingMeshes = [];
  names.forEach((name, index) => {
    const key = String(name ?? "").toLowerCase();
    if (!sourceSkinMeshNames.has(key)) {
      return;
    }
    const center = centers[index];
    if (!Array.isArray(center)) {
      return;
    }
    const slot = String(slots[index] ?? "").toLowerCase();
    const xzDistance = Math.sqrt(
      (center[0] - bodyCenter[0]) ** 2 + (center[2] - bodyCenter[2]) ** 2
    );
    const upwardGap = center[1] - bodyCenter[1];
    if (xzDistance > 0.35 || (slot === "robe" && xzDistance > 0.2 && upwardGap > 0.35)) {
      floatingMeshes.push(name);
    }
  });

  if (floatingMeshes.length === 0) {
    return [];
  }
  return [
    `creature_source_skin_body_part_floating:${floatingMeshes
      .slice(0, 4)
      .map((entry) => String(entry).replace(/[^a-z0-9_.-]/giu, "_"))
      .join(",")}`
  ];
}

function averageCreatureRuntimeVectors(vectors) {
  const valid = vectors.filter((vector) => Array.isArray(vector));
  if (valid.length === 0) {
    return null;
  }
  const total = valid.reduce(
    (sum, vector) => {
      sum[0] += vector[0];
      sum[1] += vector[1];
      sum[2] += vector[2];
      return sum;
    },
    [0, 0, 0]
  );
  return total.map((entry) => entry / valid.length);
}

function collectCreatureSourceSkinMeshNameKeys(dataset) {
  return new Set(
    [
      dataset?.creatureAnimationMixerSourceSkinningMeshNames,
      dataset?.creatureAnimationRuntimeSourceSkinningMeshNames,
      dataset?.creatureSourceSkinningMeshNames
    ]
      .flatMap((value) =>
        String(value ?? "")
          .split(/[|,]/u)
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean)
      )
  );
}

function hasCreatureLooseBodyHierarchyMeshes(sceneGraph, dataset = {}) {
  const paths = Array.isArray(sceneGraph?.visibleMeshPaths) ? sceneGraph.visibleMeshPaths : [];
  const sourceSkinMeshNameKeys = collectCreatureSourceSkinMeshNameKeys(dataset);
  const hasSourceHierarchyRuntimePath = paths
    .map((pathEntry) => String(pathEntry ?? ""))
    .some((pathEntry) =>
      />\s*(?:rootdummy|pelvis|torso|c_[a-z0-9_]+|p(?:m|f|d|e|h|o)[a-z0-9_]+)\s*>/iu.test(pathEntry)
    );
  const loosePaths = paths
    .map((pathEntry) => String(pathEntry ?? ""))
    .filter((pathEntry) => {
      const parts = pathEntry.split(">").map((part) => part.trim()).filter(Boolean);
      if (parts.length < 4) {
        return false;
      }
      const [meshName, parentName, grandParentName] = parts;
      if (parentName !== "Group" || grandParentName !== "Object3D") {
        return false;
      }
      if (/^creature_equipment_/iu.test(meshName)) {
        return false;
      }
      if (sourceSkinMeshNameKeys.has(meshName.toLowerCase())) {
        return hasSourceHierarchyRuntimePath && isCreatureLooseSourceSkinMeshName(meshName);
      }
      return (
        /(?:_g(?:_\d+)?|skinchunk\d*|Object\d+|Mesh\d+)$/iu.test(meshName) ||
        isCreatureLooseSourceSkinMeshName(meshName)
      );
  });
  if (loosePaths.length === 1 && /^bodymesh_g>/iu.test(loosePaths[0] ?? "")) {
    const visibleMeshCount = Number(sceneGraph?.visibleMeshCount ?? 0);
    const equipmentVisibleMeshCount = Number(sceneGraph?.equipmentVisibleMeshCount ?? 0);
    if (visibleMeshCount === equipmentVisibleMeshCount + 1) {
      return false;
    }
  }
  return loosePaths.length > 0;
}

function isCreatureLooseSourceSkinMeshName(meshName) {
  return /^(?:[lr]?(?:body|torso|robe|shin|thigh|calf|foot|hand|forearm|bicep|upperarm|pelvis)[a-z0-9_]*mesh\d*|bodymesh\d*)$/iu.test(
    String(meshName ?? "").trim()
  );
}

function collectCreatureSpecialDirectModelEquipmentLeakIssues(sceneGraph, dataset, status) {
  if (!isCreatureSpecialDirectModelProof(dataset, status)) {
    return [];
  }
  const names = Array.isArray(sceneGraph?.visibleMeshNames)
    ? sceneGraph.visibleMeshNames.map((entry) => String(entry ?? ""))
    : [];
  const paths = Array.isArray(sceneGraph?.visibleMeshPaths)
    ? sceneGraph.visibleMeshPaths.map((entry) => String(entry ?? ""))
    : [];
  const issues = [];
  if (paths.some((pathEntry) => /(?:^|>)creature_equipment_/iu.test(pathEntry))) {
    issues.push("creature_special_direct_model_equipment_overlay_visible");
  }
  if ([...names, ...paths].some((entry) => isCreatureSpecialDirectModelWeaponMeshName(entry))) {
    issues.push("creature_special_direct_model_weapon_mesh_visible");
  }
  return issues;
}

function isCreatureSpecialDirectModelProof(dataset, status) {
  const modelType = String(dataset?.creatureAppearanceModelType ?? "").trim().toUpperCase();
  const rightPanelText = String(status?.rightPanelText ?? "");
  const directCandidateConfidence = splitPipeValue(
    dataset?.creatureSourceModelCandidateConfidence
  ).some((entry) => entry.toLowerCase() === "direct-model");
  return (
    (modelType === "S" || /model type:\s*s\b/iu.test(rightPanelText)) &&
    (directCandidateConfidence || /viewport model:\s*direct model/iu.test(rightPanelText))
  );
}

function isCreatureSpecialDirectModelWeaponMeshName(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return /(?:^|[>:_\s-])(?:g_)?(?:w(?:sw|bw)[a-z0-9_]*_\d+|w(?:sw|bw)[a-z0-9_]*|hiltbase_\d+|pommel_\d+|guard_\d+|gems_\d+|leather_\d+)(?:$|[>:_\s-])/iu.test(
    normalized
  );
}

function collectCreatureHeldWeaponGripIssues(sceneGraph, dataset) {
  const transformStatuses = splitPipeValue(
    dataset?.placeableModelCreatureEquipmentModelPartItemGroupTransformStatuses ??
      dataset?.creaturePartModelRuntimeEquipmentItemGroupTransformStatuses
  );
  const normalizedTransformStatuses = transformStatuses.map((status) =>
    String(status ?? "").trim().toLowerCase()
  );
  if (
    !normalizedTransformStatuses.some(
      (status) =>
        status.includes("held-weapon") ||
        status.includes("held-long-melee") ||
        status.includes("held-double-weapon") ||
        status.includes("held-throwing") ||
        status.includes("held-bow") ||
        status.includes("held-crossbow") ||
        status.includes("held-sling") ||
        status.includes("held-shield") ||
        status.includes("runtime-ammunition")
    )
  ) {
    return [];
  }
  const issues = [];
  normalizedTransformStatuses.forEach((status) => {
    if (status.includes("x90")) {
      issues.push(`creature_held_weapon_preview_rotation_leaked_into_hand_attachment:${status}`);
    }
    if (status.includes("bounds-grip")) {
      issues.push(`creature_held_weapon_bounds_grip_heuristic_leaked_into_hand_attachment:${status}`);
    }
    if (status.includes("runtime-held-weapon")) {
      issues.push(`creature_held_weapon_runtime_audit_transform_leaked_into_hand_attachment:${status}`);
    }
    if (
      status.includes("held-long-melee") &&
      !status.includes("held-long-melee-source-axis-hand-node-anchor") &&
      !status.includes("held-long-melee-source-axis")
    ) {
      issues.push(`creature_long_melee_source_axis_transform_missing:${status}`);
    }
  });
  const equipmentResrefs = splitPipeValue(
    dataset?.placeableModelCreatureEquipmentModelPartEquipmentResRefs
  ).map((entry) => String(entry ?? "").trim().toLowerCase());
  const equipmentPartResrefs = splitPipeValue(
    dataset?.placeableModelCreatureEquipmentModelPartResRefs
  ).map((entry) => String(entry ?? "").trim().toLowerCase());
  const equipmentAttachmentTargets = splitPipeValue(
    dataset?.placeableModelCreatureEquipmentModelPartAttachmentTargets
  ).map((entry) => String(entry ?? "").trim().toLowerCase());
  const hasLoadedShieldEquipment =
    equipmentResrefs.some((entry) => entry.startsWith("nw_ash") || entry.startsWith("ash")) ||
    equipmentPartResrefs.some((entry) => entry.startsWith("ash"));
  if (hasLoadedShieldEquipment) {
    if (
      !normalizedTransformStatuses.some((status) =>
        status.includes("held-shield-source-axis-hand-node-anchor")
      )
    ) {
      issues.push("creature_shield_source_axis_hand_node_anchor_missing");
    }
    if (!equipmentAttachmentTargets.some((target) => target === "lhand_g")) {
      issues.push("creature_shield_left_hand_attachment_missing");
    }
  }
  const names = Array.isArray(sceneGraph?.visibleMeshNames)
    ? sceneGraph.visibleMeshNames.map((entry) => String(entry ?? ""))
    : [];
  const paths = Array.isArray(sceneGraph?.visibleMeshPaths)
    ? sceneGraph.visibleMeshPaths.map((entry) => String(entry ?? ""))
    : [];
  const centers = parseSceneGraphVectorEntries(sceneGraph?.visibleMeshCenters);
  const sizes = parseSceneGraphVectorEntries(sceneGraph?.visibleMeshSizes);
  const handTargets = new Set(
    paths
      .map((pathEntry) => pathEntry.split(">").map((part) => part.trim()))
      .filter((parts) =>
        parts.some((part) => /^creature_equipment_item_/iu.test(part)) &&
        parts.some((part) =>
          /^(?:rhand_g|lhand_g)$/iu.test(normalizeCreatureSceneGraphNodeName(part))
        )
      )
      .map((parts) => normalizeCreatureSceneGraphNodeName(
        parts.find((part) =>
          /^(?:rhand_g|lhand_g)$/iu.test(normalizeCreatureSceneGraphNodeName(part))
        ) ?? ""
      ))
      .filter(Boolean)
  );
  handTargets.forEach((target) => {
    const handEntries = names
      .map((name, index) => ({
        name,
        path: paths[index] ?? "",
        center: centers[index],
        size: sizes[index]
      }))
      .filter((entry) => entry.center)
      .filter((entry) => isCreatureVisibleHandMeshForTarget(entry.name, entry.path, target));
    const equipmentEntries = names
      .map((name, index) => ({
        name,
        path: paths[index] ?? "",
        center: centers[index],
        size: sizes[index]
      }))
      .filter((entry) => entry.center)
      .filter((entry) => isCreatureVisibleEquipmentMeshForTarget(entry.path, target));
    const equipmentCenters = equipmentEntries.map((entry) => entry.center);
    if (equipmentCenters.length === 0) {
      return;
    }
    if (handEntries.length === 0) {
      if (hasCreatureEquipmentBoneChainForTarget(paths, target)) {
        return;
      }
      issues.push(`creature_held_weapon_grip_hand_mesh_missing:${target}`);
      return;
    }
    const bestDistance = handEntries.reduce((best, handEntry) => {
      const distance = resolveCreatureHeldWeaponGripDistanceToHandBounds(
        handEntry,
        equipmentEntries
      );
      return Math.min(best, distance);
    }, Number.POSITIVE_INFINITY);
    const runtimeAmmunitionProxyThreshold =
      resolveCreatureRuntimeAmmunitionProxyGripDistanceThreshold(equipmentEntries);
    const baseThreshold = runtimeAmmunitionProxyThreshold ?? (
      equipmentCenters.length > 1
        ? CREATURE_HELD_WEAPON_GRIP_DISTANCE_THRESHOLD
        : CREATURE_HELD_WEAPON_GRIP_SINGLE_MESH_THRESHOLD
    );
    const threshold = baseThreshold;
    if (!Number.isFinite(bestDistance) || bestDistance > threshold) {
      issues.push(
        `creature_held_weapon_grip_not_near_hand:${target}:${formatProofNumber(bestDistance)}`
      );
    }
  });
  return issues;
}

function resolveCreatureRuntimeAmmunitionProxyGripDistanceThreshold(equipmentEntries) {
  const proxyEntries = equipmentEntries.filter((entry) =>
    /runtime_(?:arrow|bolt|bullet)_proxy/iu.test(entry.path)
  );
  if (proxyEntries.length === 0) {
    return null;
  }
  const maxHalfExtent = proxyEntries.reduce((best, entry) => {
    if (!Array.isArray(entry.size)) {
      return best;
    }
    const maxExtent = Math.max(...entry.size.filter((value) => Number.isFinite(value)));
    return Number.isFinite(maxExtent) ? Math.max(best, maxExtent / 2) : best;
  }, 0);
  if (maxHalfExtent <= 0) {
    return CREATURE_HELD_WEAPON_GRIP_SINGLE_MESH_THRESHOLD;
  }
  return Math.min(
    CREATURE_RUNTIME_AMMUNITION_PROXY_GRIP_DISTANCE_MAX_THRESHOLD,
    Math.max(
      CREATURE_HELD_WEAPON_GRIP_SINGLE_MESH_THRESHOLD,
      maxHalfExtent + CREATURE_RUNTIME_AMMUNITION_PROXY_GRIP_DISTANCE_PADDING
    )
  );
}

function collectCreatureBowEquipmentVisualIssues(sceneGraph, dataset, status) {
  if (!isCreatureBowAnimationProof(dataset, status)) {
    return [];
  }
  const paths = Array.isArray(sceneGraph?.visibleMeshPaths)
    ? sceneGraph.visibleMeshPaths.map((entry) => String(entry ?? ""))
    : [];
  const normalizedPaths = paths.map((pathEntry) => pathEntry.toLowerCase());
  const rangedEquipmentPaths = normalizedPaths.filter(
    (pathEntry) =>
      /creature_equipment_model_part_wbw(?:ln|sh|sl|x[hl])_/iu.test(pathEntry) ||
      /creature_equipment_item_[^>]*wbw(?:ln|sh|sl|m?x[hl])/iu.test(pathEntry)
  );
  const crossbowEquipmentPaths = rangedEquipmentPaths.filter((pathEntry) =>
    /wbw(?:m?x[hl]|x[hl])/iu.test(pathEntry)
  );
  const bowEquipmentPaths = rangedEquipmentPaths.filter((pathEntry) =>
    /wbw(?:ln|sh)/iu.test(pathEntry)
  );
  const hasBowPaths = bowEquipmentPaths.length > 0;
  const hasCrossbowPaths = crossbowEquipmentPaths.length > 0;
  const issues = [];
  if (
    bowEquipmentPaths.some(
      (pathEntry) =>
        sceneGraphPathIncludesCreatureNode(pathEntry, "rhand") ||
        sceneGraphPathIncludesCreatureNode(pathEntry, "rhand_g")
    )
  ) {
    issues.push("creature_bow_weapon_attached_to_rhand");
  }
  if (
    bowEquipmentPaths.length > 0 &&
    !bowEquipmentPaths.some(
      (pathEntry) =>
        sceneGraphPathIncludesCreatureNode(pathEntry, "lhand") ||
        sceneGraphPathIncludesCreatureNode(pathEntry, "lhand_g")
    )
  ) {
    issues.push("creature_bow_weapon_lhand_anchor_missing");
  }
  if (
    crossbowEquipmentPaths.length > 0 &&
    !crossbowEquipmentPaths.some(
      (pathEntry) =>
        sceneGraphPathIncludesCreatureNode(pathEntry, "rhand") ||
        sceneGraphPathIncludesCreatureNode(pathEntry, "rhand_g")
    )
  ) {
    issues.push("creature_crossbow_weapon_rhand_primary_anchor_missing");
  }
  if (hasCrossbowPaths) {
    [
      "top_shaft",
      "xbowbone_left",
      "xbowbone_right",
      "top_catch"
    ].forEach((nodeName) => {
      if (
        !crossbowEquipmentPaths.some((pathEntry) =>
          sceneGraphPathIncludesCreatureNode(pathEntry, nodeName)
        )
      ) {
        issues.push(`creature_crossbow_source_hierarchy_node_missing:${nodeName}`);
      }
    });
  }
  const canonicalBowSourceNodeNames = ["bone_bottom", "bone_top", "bowbottom", "bowtop"];
  const hasCanonicalBowSourceHierarchy =
    hasBowPaths &&
    canonicalBowSourceNodeNames.some((nodeName) =>
      bowEquipmentPaths.some((pathEntry) =>
        sceneGraphPathIncludesCreatureNode(pathEntry, nodeName)
      )
    );
  if (hasCanonicalBowSourceHierarchy) {
    canonicalBowSourceNodeNames.forEach((nodeName) => {
      if (
        !bowEquipmentPaths.some((pathEntry) =>
          sceneGraphPathIncludesCreatureNode(pathEntry, nodeName)
        )
      ) {
        issues.push(`creature_bow_source_hierarchy_node_missing:${nodeName}`);
      }
    });
  }
  const equipmentTransformStatuses = splitPipeValue(
    dataset?.placeableModelCreatureEquipmentModelPartItemGroupTransformStatuses ??
      dataset?.creaturePartModelRuntimeEquipmentItemGroupTransformStatuses
  ).map((entry) => String(entry ?? "").toLowerCase());
  if (
    hasBowPaths &&
    equipmentTransformStatuses.some((entry) =>
      entry.includes("held-bow-x90") || entry.includes("bow-x90")
    )
  ) {
    issues.push("creature_bow_preview_rotation_leaked_into_hand_attachment");
  }
  if (
    hasBowPaths &&
    !equipmentTransformStatuses.some((entry) =>
      entry.includes("held-bow-source-axis-left-hand-node-anchor")
    )
  ) {
    issues.push("creature_bow_source_axis_left_hand_node_anchor_missing");
  }
  if (
    hasCrossbowPaths &&
    equipmentTransformStatuses.some((entry) =>
      entry.includes("held-crossbow-negative-x90") || entry.includes("crossbow-x90")
    )
  ) {
    issues.push("creature_crossbow_preview_rotation_leaked_into_hand_attachment");
  }
  if (
    hasCrossbowPaths &&
    !equipmentTransformStatuses.some((entry) =>
      entry.includes("held-crossbow-source-axis-right-hand-node-anchor")
    )
  ) {
    issues.push("creature_crossbow_source_axis_right_hand_node_anchor_missing");
  }
  const staticAmmunitionPaths = normalizedPaths.filter(
    (pathEntry) =>
      /creature_equipment_model_part_wam(?:ar|bo|bu)_/iu.test(pathEntry) ||
      /creature_equipment_item_[^>]*wamm?(?:ar|bo|bu)/iu.test(pathEntry)
  );
  if (
    staticAmmunitionPaths.some(
      (pathEntry) =>
        sceneGraphPathIncludesCreatureNode(pathEntry, "rootdummy") &&
        !sceneGraphPathIncludesCreatureNode(pathEntry, "rhand") &&
        !sceneGraphPathIncludesCreatureNode(pathEntry, "lhand") &&
        !sceneGraphPathIncludesCreatureNode(pathEntry, "rhand_g") &&
        !sceneGraphPathIncludesCreatureNode(pathEntry, "lhand_g")
    )
  ) {
    issues.push("creature_bow_ammunition_rootdummy_static_visible");
  }
  const rangedShotSelected = splitPipeValue(
    dataset?.creatureAnimationMixerSelectedClipNames ??
      dataset?.creatureAnimationRuntimeSelectedClipNames
  ).some((entry) => /(?:^|[^a-z0-9])x?bowshot(?:$|[^a-z0-9])/iu.test(entry));
  if (rangedShotSelected && rangedEquipmentPaths.length > 0) {
    const sourceAnimationStatuses = splitPipeValue(
      dataset?.placeableModelCreatureEquipmentModelPartItemGroupSourceAnimationStatuses ??
        dataset?.creaturePartModelRuntimeEquipmentItemGroupSourceAnimationStatuses
    ).map((entry) => String(entry ?? "").toLowerCase());
    const sourceAnimationClipText = splitPipeValue(
      dataset?.placeableModelCreatureEquipmentModelPartItemGroupSourceAnimationClipNames ??
        dataset?.creaturePartModelRuntimeEquipmentItemGroupSourceAnimationClipNames
    )
      .join("|")
      .toLowerCase();
    const bowSourceAnimationRequired = hasBowPaths && hasCanonicalBowSourceHierarchy;
    if (
      (hasCrossbowPaths || bowSourceAnimationRequired) &&
      !sourceAnimationStatuses.includes("playing")
    ) {
      issues.push(
        hasCrossbowPaths
          ? "creature_xbowshot_weapon_source_animation_not_playing"
        : "creature_bowshot_weapon_source_animation_not_playing"
      );
    }
    if (
      hasCrossbowPaths &&
      !/(?:^|[^a-z0-9])xbowshot(?:$|[^a-z0-9])/iu.test(sourceAnimationClipText)
    ) {
      issues.push("creature_xbowshot_weapon_source_animation_clip_missing");
    }
    if (
      bowSourceAnimationRequired &&
      !/(?:^|[^a-z0-9])bowshot(?:$|[^a-z0-9])/iu.test(sourceAnimationClipText)
    ) {
      issues.push("creature_bowshot_weapon_source_animation_clip_missing");
    }
    const ammunitionAimModes = splitPipeValue(
      dataset?.creaturePartModelRuntimeEquipmentRuntimeAmmunitionProxyAimModes ??
        dataset?.placeableModelCreatureEquipmentModelPartRuntimeAmmunitionProxyAimModes
    ).map((entry) => String(entry ?? "").toLowerCase());
    const ammunitionAimDirections = splitPipeValue(
      dataset?.creaturePartModelRuntimeEquipmentRuntimeAmmunitionProxyDirections ??
        dataset?.placeableModelCreatureEquipmentModelPartRuntimeAmmunitionProxyDirections
    )
      .map(parseCreatureRuntimeVector)
      .filter(Boolean);
    if (
      hasBowPaths &&
      !ammunitionAimModes.some((entry) => entry.includes("bow-root-forward-axis"))
    ) {
      issues.push("creature_bowshot_runtime_ammunition_root_forward_axis_missing");
    }
    if (
      hasCrossbowPaths &&
      !ammunitionAimModes.some(
        (entry) =>
          entry.includes("launcher-draw-axis") ||
          entry.includes("crossbow-root-forward-axis")
      )
    ) {
      issues.push("creature_xbowshot_runtime_ammunition_draw_axis_missing");
    }
    const primaryAimDirection = ammunitionAimDirections[0] ?? null;
    if (
      hasBowPaths &&
      primaryAimDirection &&
      (Math.abs(primaryAimDirection.x) > 0.45 || primaryAimDirection.z > -0.55)
    ) {
      issues.push("creature_bowshot_runtime_ammunition_direction_sideways");
    }
    if (hasCrossbowPaths && primaryAimDirection) {
      const runtimeCrossbowMeshAxis =
        splitPipeValue(
          dataset?.creaturePartModelRuntimeEquipmentRuntimeAmmunitionProxyCrossbowMeshAxes ??
            dataset?.placeableModelCreatureEquipmentModelPartRuntimeAmmunitionProxyCrossbowMeshAxes
        )
          .map(parseCreatureRuntimeVector)
          .find(Boolean) ?? null;
      const runtimeEquipmentNames = splitPipeValue(
        dataset?.creaturePartModelRuntimeEquipmentVisibleMeshNames
      ).map((entry) => entry.toLowerCase());
      const runtimeEquipmentCenters = parseSceneGraphVectorEntries(
        splitPipeValue(dataset?.creaturePartModelRuntimeEquipmentVisibleMeshCenters)
      );
      const sceneEquipmentNames = Array.isArray(sceneGraph?.equipmentVisibleMeshNames)
        ? sceneGraph.equipmentVisibleMeshNames.map((entry) => String(entry ?? "").toLowerCase())
        : [];
      const sceneEquipmentCenters = parseSceneGraphVectorEntries(
        sceneGraph?.equipmentVisibleMeshCenters
      );
      const equipmentNames =
        runtimeEquipmentNames.length > 0 ? runtimeEquipmentNames : sceneEquipmentNames;
      const equipmentCenters =
        runtimeEquipmentCenters.length > 0 ? runtimeEquipmentCenters : sceneEquipmentCenters;
      const findEquipmentCenter = (patterns) => {
        for (let index = 0; index < equipmentNames.length; index += 1) {
          const name = equipmentNames[index] ?? "";
          if (!patterns.some((pattern) => pattern.test(name))) {
            continue;
          }
          const center = equipmentCenters[index];
          if (Array.isArray(center)) {
            return center;
          }
        }
        return null;
      };
      const crossbowRearCenter =
        findEquipmentCenter([/bottom_butt/iu, /middle_stock/iu]) ??
        findEquipmentCenter([/middle_grip/iu]);
      const crossbowFrontCenter =
        findEquipmentCenter([/^head$/iu, /top_shaft/iu]) ??
        findEquipmentCenter([/top_catch/iu]);
      if (runtimeCrossbowMeshAxis || (crossbowRearCenter && crossbowFrontCenter)) {
        const meshAxis = runtimeCrossbowMeshAxis ?? {
          x: crossbowFrontCenter[0] - crossbowRearCenter[0],
          y: crossbowFrontCenter[1] - crossbowRearCenter[1],
          z: crossbowFrontCenter[2] - crossbowRearCenter[2]
        };
        const meshAxisLength = Math.sqrt(
          meshAxis.x ** 2 + meshAxis.y ** 2 + meshAxis.z ** 2
        );
        const aimLength = Math.sqrt(
          primaryAimDirection.x ** 2 +
            primaryAimDirection.y ** 2 +
            primaryAimDirection.z ** 2
        );
        if (meshAxisLength > 0.0001 && aimLength > 0.0001) {
          const alignment =
            (meshAxis.x * primaryAimDirection.x +
              meshAxis.y * primaryAimDirection.y +
              meshAxis.z * primaryAimDirection.z) /
            (meshAxisLength * aimLength);
          if (alignment < 0.15) {
            issues.push(
              `creature_xbowshot_runtime_ammunition_direction_opposes_crossbow_mesh_axis:${formatProofNumber(
                alignment
              )}`
            );
          }
        }
      }
    }
  }
  const equipmentPartResRefs = splitPipeValue(
    dataset?.placeableModelCreatureEquipmentModelPartResRefs
  );
  const equipmentAttachmentTargets = splitPipeValue(
    dataset?.placeableModelCreatureEquipmentModelPartAttachmentTargets
  );
  const hasRuntimeAmmunitionDataset = equipmentPartResRefs.some((resref, index) => {
    const attachmentTarget = String(equipmentAttachmentTargets[index] ?? "").toLowerCase();
    return /wam(?:ar|bo|bu)_/iu.test(resref) && /^(?:rhand_g|rhand)$/iu.test(attachmentTarget);
  });
  if (
    rangedShotSelected &&
    rangedEquipmentPaths.length > 0 &&
    !hasRuntimeAmmunitionDataset &&
    !staticAmmunitionPaths.some(
      (pathEntry) =>
        sceneGraphPathIncludesCreatureNode(pathEntry, "rhand") ||
        sceneGraphPathIncludesCreatureNode(pathEntry, "rhand_g")
    )
  ) {
    issues.push(
      hasCrossbowPaths
        ? "creature_xbowshot_runtime_ammunition_visual_missing"
        : "creature_bowshot_runtime_ammunition_visual_missing"
    );
  }
  return issues;
}

function parseCreatureRuntimeVector(value) {
  const parts = String(value ?? "")
    .split(",")
    .map((entry) => Number(entry.trim()));
  if (parts.length < 3 || parts.some((entry) => !Number.isFinite(entry))) {
    return null;
  }
  return {
    x: parts[0],
    y: parts[1],
    z: parts[2]
  };
}

function isCreatureBowAnimationProof(dataset, status) {
  const candidates = [
    status?.selectedAnimationValue,
    status?.selectedAnimationText,
    dataset?.creatureAnimationMixerSelectedClipNames,
    dataset?.creatureAnimationRuntimeSelectedClipNames,
    dataset?.creatureAnimationMixerRequestedClipNames
  ]
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter(Boolean);
  return candidates.some((entry) => /(?:^|[^a-z0-9])x?bow(?:shot|rdy)?(?:$|[^a-z0-9])/iu.test(entry));
}

function parseSceneGraphVectorEntries(entries) {
  const parsed = [];
  if (!Array.isArray(entries)) {
    return parsed;
  }
  entries.forEach((entry) => {
    const text = String(entry ?? "");
    const separatorIndex = text.indexOf(":");
    if (separatorIndex < 1) {
      parsed.push(null);
      return;
    }
    const values = text
      .slice(separatorIndex + 1)
      .split(",")
      .map((value) => Number(value.trim()));
    if (values.length === 3 && values.every((value) => Number.isFinite(value))) {
      parsed.push(values);
      return;
    }
    parsed.push(null);
  });
  return parsed;
}

function normalizeCreatureSceneGraphNodeName(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const handAliasMatch = normalized.match(/^([rl]hand_g)\d+$/u);
  return handAliasMatch?.[1] ?? normalized;
}

function sceneGraphPathIncludesCreatureNode(pathEntry, target) {
  return String(pathEntry ?? "")
    .split(">")
    .map((part) => normalizeCreatureSceneGraphNodeName(part))
    .some((part) => part === target);
}

function isCreatureVisibleHandMeshForTarget(name, path, target) {
  const parts = path
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
  const normalizedName = normalizeCreatureSceneGraphNodeName(name);
  const hasTargetBone = parts.some(
    (part) => normalizeCreatureSceneGraphNodeName(part) === target
  );
  return (
    hasTargetBone &&
    !parts.some((part) => /^creature_equipment_/iu.test(part)) &&
    (normalizedName.includes("hand") ||
      normalizeCreatureSceneGraphNodeName(parts[0]) === target)
  );
}

function isCreatureVisibleEquipmentMeshForTarget(path, target) {
  const parts = path.split(">").map((part) => part.trim());
  return (
    parts.some((part) => /^creature_equipment_item_/iu.test(part)) &&
    !parts.some((part) => /runtime_(?:arrow|bolt|bullet)_proxy/iu.test(part)) &&
    parts.some((part) => normalizeCreatureSceneGraphNodeName(part) === target)
  );
}

function hasCreatureEquipmentBoneChainForTarget(paths, target) {
  return paths.some((pathEntry) => {
    const parts = String(pathEntry ?? "")
      .split(">")
      .map((part) => part.trim())
      .filter(Boolean);
    return (
      parts.some((part) => /^creature_equipment_item_/iu.test(part)) &&
      parts.some((part) => normalizeCreatureSceneGraphNodeName(part) === target)
    );
  });
}

function resolveCreatureHeldWeaponGripDistanceToHandBounds(handEntry, equipmentEntries) {
  if (!Array.isArray(handEntry?.center)) {
    return Number.POSITIVE_INFINITY;
  }
  const equipmentCenters = equipmentEntries
    .map((entry) => entry?.center)
    .filter((center) => Array.isArray(center));
  if (!Array.isArray(handEntry.size)) {
    return resolveCreatureHeldWeaponGripDistance(handEntry.center, equipmentCenters);
  }
  return equipmentEntries.reduce((best, equipmentEntry) => {
    if (!Array.isArray(equipmentEntry?.center)) {
      return best;
    }
    const distance = Array.isArray(equipmentEntry.size)
      ? distanceAxisAlignedBoundsToAxisAlignedBounds(
          handEntry.center,
          handEntry.size,
          equipmentEntry.center,
          equipmentEntry.size
        )
      : distancePointToAxisAlignedBounds(
          equipmentEntry.center,
          handEntry.center,
          handEntry.size
        );
    return Math.min(
      best,
      distance
    );
  }, Number.POSITIVE_INFINITY);
}

function distanceAxisAlignedBoundsToAxisAlignedBounds(
  leftCenter,
  leftSize,
  rightCenter,
  rightSize
) {
  const offsets = [0, 1, 2].map((index) => {
    const leftHalfExtent = Math.max(0, Math.abs(Number(leftSize[index] ?? 0)) / 2);
    const rightHalfExtent = Math.max(0, Math.abs(Number(rightSize[index] ?? 0)) / 2);
    const centerDelta = Math.abs(
      Number(leftCenter[index] ?? 0) - Number(rightCenter[index] ?? 0)
    );
    return Math.max(0, centerDelta - leftHalfExtent - rightHalfExtent);
  });
  return Math.sqrt(offsets[0] ** 2 + offsets[1] ** 2 + offsets[2] ** 2);
}

function resolveCreatureHeldWeaponGripDistance(handCenter, equipmentCenters) {
  if (equipmentCenters.length === 1) {
    return vectorDistance(handCenter, equipmentCenters[0]);
  }
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let leftIndex = 0; leftIndex < equipmentCenters.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < equipmentCenters.length;
      rightIndex += 1
    ) {
      bestDistance = Math.min(
        bestDistance,
        distancePointToSegment(handCenter, equipmentCenters[leftIndex], equipmentCenters[rightIndex])
      );
    }
  }
  return bestDistance;
}

function distancePointToAxisAlignedBounds(point, center, size) {
  const offsets = [0, 1, 2].map((index) => {
    const halfExtent = Math.max(0, Math.abs(Number(size[index] ?? 0)) / 2);
    const delta = Math.abs(Number(point[index] ?? 0) - Number(center[index] ?? 0));
    return Math.max(0, delta - halfExtent);
  });
  return Math.sqrt(offsets[0] ** 2 + offsets[1] ** 2 + offsets[2] ** 2);
}

function vectorDistance(left, right) {
  return Math.sqrt(
    (left[0] - right[0]) ** 2 +
      (left[1] - right[1]) ** 2 +
      (left[2] - right[2]) ** 2
  );
}

function distancePointToSegment(point, start, end) {
  const segment = [
    end[0] - start[0],
    end[1] - start[1],
    end[2] - start[2]
  ];
  const pointOffset = [
    point[0] - start[0],
    point[1] - start[1],
    point[2] - start[2]
  ];
  const segmentLengthSquared =
    segment[0] ** 2 + segment[1] ** 2 + segment[2] ** 2;
  if (segmentLengthSquared <= 1e-12) {
    return vectorDistance(point, start);
  }
  const t = clampNumber(
    (pointOffset[0] * segment[0] +
      pointOffset[1] * segment[1] +
      pointOffset[2] * segment[2]) /
      segmentLengthSquared,
    0,
    1
  );
  return vectorDistance(point, [
    start[0] + segment[0] * t,
    start[1] + segment[1] * t,
    start[2] + segment[2] * t
  ]);
}

function formatProofNumber(value) {
  return Number.isFinite(value) ? value.toFixed(4) : "nan";
}

function splitPipeValue(value) {
  return String(value ?? "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeCreatureFrameSampleStatusWhenRuntimeIsReady(
  status,
  proofRuntimeFrame,
  expectedAnimationName
) {
  if (!status || proofRuntimeFrame?.ok !== true || !Array.isArray(status.issues)) {
    return status;
  }
  if (status.issues.length === 0) {
    return status;
  }
  if (!status.issues.every((issue) => FRAME_SAMPLE_RUNTIME_OK_UI_ISSUES.has(issue))) {
    return status;
  }
  const dataset = status.dataset ?? proofRuntimeFrame.dataset ?? {};
  const requestedResref = String(status.requestedResref ?? "").trim().toLowerCase();
  const runtimeObjectText = [
    dataset.creatureAnimationRuntimeObjectIds,
    dataset.creatureAnimationMixerObjectIds,
    dataset.creaturePartModelRuntimeObjectId,
    dataset.placeableModelObjectId
  ]
    .map((entry) => String(entry ?? "").toLowerCase())
    .filter(Boolean)
    .join(" ");
  const runtimeObjectMatches =
    !requestedResref || !runtimeObjectText || runtimeObjectText.includes(requestedResref);
  const playbackStatuses = splitPipeValue(
    dataset.creatureAnimationMixerPlaybackStatuses ??
      dataset.creatureAnimationRuntimePlaybackStatuses
  );
  const selectedClipNames = splitPipeValue(
    dataset.creatureAnimationMixerSelectedClipNames ??
      dataset.creatureAnimationRuntimeSelectedClipNames
  );
  const safetyStatuses = splitPipeValue(dataset.creatureAnimationMixerDirectAutoSafetyStatuses);
  const selectedClipMatches =
    !expectedAnimationName ||
    selectedClipNames.some(
      (clipName) => clipName.toLowerCase() === String(expectedAnimationName).toLowerCase()
    );
  const mixerIsPlaying = playbackStatuses.some(
    (playbackStatus) => playbackStatus === "playing" || playbackStatus === "runtime-effects"
  );
  const guardAllowsPlayback = !safetyStatuses.includes("suppressed-source-hierarchy-rebase");
  if (runtimeObjectMatches && selectedClipMatches && mixerIsPlaying && guardAllowsPlayback) {
    return {
      ...status,
      ok: true,
      issues: [],
      frameSampleUiIssuesIgnored: status.issues
    };
  }
  return status;
}

async function sampleCreatureProofRuntimeAnimationFrame(send, timeSeconds) {
  const result = await evaluate(send, {
    returnByValue: true,
    expression: `(() => {
      const hook = window.__auroraCreatureProofRuntime;
      if (!hook || typeof hook.sampleAnimationFrame !== "function") {
        return { ok: false, issue: "creature_proof_runtime_hook_missing" };
      }
      return hook.sampleAnimationFrame(${JSON.stringify(timeSeconds)});
    })()`
  });
  return result.result.value ?? { ok: false, issue: "creature_proof_runtime_hook_empty" };
}

async function sampleCreatureProofRuntimeAnimationState(send, timeSeconds) {
  const result = await evaluate(send, {
    returnByValue: true,
    expression: `(() => {
      const hook = window.__auroraCreatureProofRuntime;
      if (!hook || typeof hook.sampleAnimationState !== "function") {
        return { ok: false, issue: "creature_proof_runtime_state_hook_missing" };
      }
      return hook.sampleAnimationState(${JSON.stringify(timeSeconds)});
    })()`
  });
  return result.result.value ?? { ok: false, issue: "creature_proof_runtime_state_hook_empty" };
}

function hashCreatureProofRuntimeFrameState(proofRuntimeFrame) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        ok: proofRuntimeFrame?.ok === true,
        sceneGraph: proofRuntimeFrame?.sceneGraph ?? null,
        samples: proofRuntimeFrame?.samples ?? [],
        dataset: {
          actionNames: proofRuntimeFrame?.dataset?.creatureAnimationMixerActionNames ?? "",
          loopModes: proofRuntimeFrame?.dataset?.creatureAnimationMixerLoopModes ?? "",
          runStates: proofRuntimeFrame?.dataset?.creatureAnimationMixerRunStates ?? "",
          followUpClipNames:
            proofRuntimeFrame?.dataset?.creatureAnimationMixerFollowUpClipNames ?? "",
          handoffClipNames:
            proofRuntimeFrame?.dataset?.creatureAnimationMixerHandoffClipNames ?? "",
          playbackStatuses:
            proofRuntimeFrame?.dataset?.creatureAnimationMixerPlaybackStatuses ?? "",
          completedActionNames:
            proofRuntimeFrame?.dataset?.creatureAnimationMixerCompletedActionNames ?? ""
        }
      })
    )
    .digest("hex");
}

function hashCreatureProofEquipmentFrameState(proofRuntimeFrame) {
  const sceneGraph = proofRuntimeFrame?.sceneGraph;
  const equipmentVisibleMeshCount = Number(sceneGraph?.equipmentVisibleMeshCount ?? 0);
  if (!Number.isFinite(equipmentVisibleMeshCount) || equipmentVisibleMeshCount <= 0) {
    return "";
  }
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        equipmentVisibleMeshCount,
        equipmentVisibleMeshNames: sceneGraph?.equipmentVisibleMeshNames ?? [],
        equipmentVisibleMeshTargets: sceneGraph?.equipmentVisibleMeshTargets ?? [],
        equipmentVisibleMeshPaths: sceneGraph?.equipmentVisibleMeshPaths ?? [],
        equipmentVisibleMeshCenters: sceneGraph?.equipmentVisibleMeshCenters ?? [],
        equipmentVisibleMeshSizes: sceneGraph?.equipmentVisibleMeshSizes ?? []
      })
    )
    .digest("hex");
}

function isCreatureEquipmentMotionExpected(animationName) {
  const normalized = String(animationName ?? "").trim().toLowerCase();
  return /(?:^|[^a-z0-9])(?:1h|2h|2w|nw|pl|bow|xbow|torch|throw)/iu.test(normalized) ||
    /(?:slash|stab|ready|reach|parry|attack|swing|shot|kick)/iu.test(normalized);
}

function writeDataUrlFile(outputPath, dataUrl) {
  const [, base64 = ""] = String(dataUrl ?? "").split(",", 2);
  fs.writeFileSync(outputPath, Buffer.from(base64, "base64"));
}

async function captureCanvasVideo(send, { outputPath, durationSeconds, fps }) {
  const startResult = await evaluate(send, {
    returnByValue: true,
    expression: `(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas || typeof canvas.captureStream !== "function") {
        return { ok: false, issue: "canvas_capture_stream_unavailable" };
      }
      if (typeof MediaRecorder === "undefined") {
        return { ok: false, issue: "media_recorder_unavailable" };
      }
      const preferredTypes = [
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4;codecs=h264",
        "video/mp4",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm"
      ];
      const mimeType = preferredTypes.find((candidate) => MediaRecorder.isTypeSupported(candidate));
      if (!mimeType) {
        return { ok: false, issue: "media_recorder_mime_type_unsupported", preferredTypes };
      }
      const stream = canvas.captureStream(${JSON.stringify(fps)});
      const chunks = [];
      const state = {
        ok: true,
        mimeType,
        durationSeconds: ${JSON.stringify(durationSeconds)},
        fps: ${JSON.stringify(fps)},
        sizeBytes: 0,
        dataUrl: "",
        stopped: false,
        done: false,
        issue: null
      };
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onerror = () => {
        state.issue = recorder.error?.message ?? "media_recorder_failed";
        state.stopped = true;
        state.done = true;
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.onstop = () => {
        state.stopped = true;
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: mimeType });
        state.sizeBytes = blob.size;
        const reader = new FileReader();
        reader.onerror = () => {
          state.issue = reader.error?.message ?? "video_file_reader_failed";
          state.done = true;
        };
        reader.onload = () => {
          state.dataUrl = String(reader.result ?? "");
          state.done = true;
        };
        reader.readAsDataURL(blob);
      };
      window.__auroraCreatureCanvasVideoCapture = { recorder, state };
      recorder.start(100);
      return { ok: true, mimeType, durationSeconds: state.durationSeconds, fps: state.fps };
    })()`
  });
  const started = startResult.result.value;
  if (!started?.ok) {
    return {
      ok: false,
      path: null,
      issue: started?.issue ?? "video_capture_failed",
      mimeType: null,
      durationSeconds,
      fps,
      sizeBytes: 0
    };
  }
  await sleep(Math.round(durationSeconds * 1000));
  await evaluate(send, {
    returnByValue: true,
    expression: `(() => {
      const capture = window.__auroraCreatureCanvasVideoCapture;
      if (!capture?.recorder) {
        return { ok: false, issue: "video_capture_state_missing" };
      }
      if (capture.recorder.state !== "inactive") {
        capture.recorder.stop();
      }
      return { ok: true };
    })()`
  });
  let payload = null;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const status = await evaluate(send, {
      returnByValue: true,
      expression: `(() => {
        const state = window.__auroraCreatureCanvasVideoCapture?.state;
        return state
          ? {
              ok: state.ok,
              done: state.done,
              stopped: state.stopped,
              issue: state.issue,
              mimeType: state.mimeType,
              durationSeconds: state.durationSeconds,
              fps: state.fps,
              sizeBytes: state.sizeBytes,
              dataUrl: state.done ? state.dataUrl : ""
            }
          : { ok: false, done: true, issue: "video_capture_state_missing" };
      })()`
    });
    payload = status.result.value;
    if (payload.done) {
      break;
    }
    await sleep(100);
  }
  if (!payload?.ok || !payload.done || payload.issue) {
    return {
      ok: false,
      path: null,
      issue: payload?.issue ?? "video_capture_timeout",
      mimeType: payload?.mimeType ?? started.mimeType ?? null,
      durationSeconds,
      fps,
      sizeBytes: payload?.sizeBytes ?? 0
    };
  }
  const [, base64 = ""] = String(payload.dataUrl ?? "").split(",", 2);
  const finalOutputPath = payload.mimeType?.startsWith("video/mp4")
    ? outputPath
    : outputPath.replace(/\.mp4$/iu, ".webm");
  fs.writeFileSync(finalOutputPath, Buffer.from(base64, "base64"));
  return {
    ok: true,
    path: finalOutputPath,
    issue: payload.mimeType?.startsWith("video/mp4") ? null : "video_recorded_non_mp4_mime_type",
    mimeType: payload.mimeType,
    durationSeconds: payload.durationSeconds,
    fps: payload.fps,
    sizeBytes: fs.statSync(finalOutputPath).size
  };
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

function parseListOption(value) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseNumberListOption(value) {
  const seen = new Set();
  return parseListOption(String(value ?? ""))
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .map((entry) => Number(entry.toFixed(3)))
    .filter((entry) => {
      const key = String(entry);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => left - right);
}

function parseOptionalInteger(value) {
  if (value === undefined || value === null || String(value).trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Expected --animationState to be an integer, got ${JSON.stringify(value)}.`);
  }
  return parsed;
}

function parseBoolean(value) {
  return /^(1|true|yes|on)$/iu.test(String(value ?? "").trim());
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function sanitizeFileStem(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "creature";
}

function hashFileSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function updateCreatureProofNetworkState(state, message) {
  if (!state || !message?.method) {
    return;
  }
  const params = message.params ?? {};
  if (message.method === "Network.requestWillBeSent") {
    const url = String(params.request?.url ?? "");
    if (params.requestId && isCreatureProofNetworkUrl(url)) {
      state.pendingRequestIds.add(params.requestId);
      state.requestStartedAt?.set(params.requestId, Date.now());
      state.lastActivityAt = Date.now();
    }
    return;
  }
  if (
    (message.method === "Network.loadingFinished" ||
      message.method === "Network.loadingFailed") &&
    params.requestId &&
    state.pendingRequestIds.delete(params.requestId)
  ) {
    state.requestStartedAt?.delete(params.requestId);
    state.lastActivityAt = Date.now();
  }
}

function summarizeNetworkEvent(message) {
  const method = message.method;
  const params = message.params ?? {};
  if (method === "Network.requestWillBeSent") {
    const url = params.request?.url ?? "";
    if (!isCreatureProofNetworkUrl(url)) {
      return null;
    }
    return {
      method,
      requestId: params.requestId,
      url,
      requestMethod: params.request?.method,
      postData: typeof params.request?.postData === "string" ? params.request.postData.slice(0, 500) : null
    };
  }
  if (method === "Network.responseReceived") {
    const url = params.response?.url ?? "";
    if (!isCreatureProofNetworkUrl(url)) {
      return null;
    }
    return {
      method,
      requestId: params.requestId,
      url,
      status: params.response?.status,
      mimeType: params.response?.mimeType
    };
  }
  if (method === "Network.loadingFailed") {
    return {
      method,
      requestId: params.requestId,
      errorText: params.errorText,
      canceled: params.canceled === true
    };
  }
  return null;
}

function isCreatureProofNetworkUrl(url) {
  return /\/catalog\/creatures(?:[/?]|$)|\/auth\/(?:login|me)(?:[/?]|$)|\/api\/v1\/catalog\/placeables\/cache\//u.test(
    url
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceProcessExits(process) {
  return new Promise((resolve) => {
    process.once("exit", resolve);
  });
}

function removeProfileDirBestEffort(dir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}
