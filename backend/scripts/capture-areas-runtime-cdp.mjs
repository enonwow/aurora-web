import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_BASE_URL = "http://127.0.0.1:5173";
const DEFAULT_USERNAME = "builder.user";
const DEFAULT_PASSWORD = "builder123";
const DEFAULT_CAPTURE_TARGET = "ikea";
const DEFAULT_HTTP_TIMEOUT_MS = 10_000;
const DEFAULT_CHROME_CDP_TIMEOUT_MS = 30_000;
const DEFAULT_BACKEND_DIRECT_HEALTH_URL = "http://127.0.0.1:3000/api/v1/health";
const DEFAULT_ACTIONABILITY_SAMPLE_LIMIT = 12;
const DEFAULT_NETWORK_REQUEST_ITEM_SAMPLE_LIMIT = 5;
const AREAS_WORKSPACE_LIST_WAIT_ATTEMPTS = 280;
const AREAS_WORKSPACE_LIST_WAIT_INTERVAL_MS = 250;
const HELP_TEXT = `
Usage:
  node scripts/capture-areas-runtime-cdp.mjs [--area <text>] [--target ikea] [--baseUrl <url>] [--outDir <dir>] [--name <stem>] [--requireScreenshot]
  node scripts/capture-areas-runtime-cdp.mjs --summarizeFrame <frame.json> [--summaryLimit <count>]

Captures the live Areas workspace through Chrome DevTools Protocol, opens an Area,
and records the browser-readable terrain tile model and tile process runtime snapshots.
`.trim();

const options = parseArgs(process.argv.slice(2));
if (options.help === "true") {
  console.log(HELP_TEXT);
  process.exit(0);
}

const actionabilitySampleLimit = Number(
  options.summaryLimit ??
    process.env.AREAS_CAPTURE_SUMMARY_LIMIT ??
    DEFAULT_ACTIONABILITY_SAMPLE_LIMIT
);

if (options.summarizeFrame) {
  const frame = JSON.parse(fs.readFileSync(path.resolve(options.summarizeFrame), "utf8"));
  const runtimeActionabilitySummary =
    frame.runtimeActionabilitySummary ??
    buildRuntimeActionabilitySummary({
      domStatus: frame.domStatus,
      expectedAreaDetail: frame.expectedAreaDetail,
      networkCaptureSummary: frame.networkCaptureSummary,
      sampleLimit: actionabilitySampleLimit
    });
  console.log(
    JSON.stringify(
      buildConsoleSummary({
        ...frame,
        runtimeActionabilitySummary
      }),
      null,
      2
    )
  );
  process.exit(0);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const outDir = path.resolve(
  repoRoot,
  options.outDir ?? "backend/docs/aurora-reverse/artifacts/areas-runtime-capture"
);
const chromePath = options.chromePath ?? process.env.CHROME_PATH ?? DEFAULT_CHROME_PATH;
const baseUrl = options.baseUrl ?? process.env.AREAS_BASE_URL ?? DEFAULT_BASE_URL;
const port = Number(options.port ?? 9600 + Math.floor(Math.random() * 400));
const fileStem = sanitizeFileStem(options.name ?? "areas-runtime");
const username = options.username ?? process.env.AURORA_TEST_USERNAME ?? DEFAULT_USERNAME;
const password = options.password ?? process.env.AURORA_TEST_PASSWORD ?? DEFAULT_PASSWORD;
const captureTarget =
  options.target ?? process.env.AURORA_AREA_CAPTURE_TARGET ?? DEFAULT_CAPTURE_TARGET;
const areaQuery =
  options.area ??
  resolveCaptureTargetAreaQuery(captureTarget) ??
  process.env.AURORA_AREA_CAPTURE_QUERY ??
  "";
const authBaseUrl = (options.authBaseUrl ?? `${baseUrl}/_aurora/v1`).replace(/\/+$/u, "");
const backendDirectHealthUrl =
  options.backendDirectHealthUrl ??
  process.env.AREAS_BACKEND_DIRECT_HEALTH_URL ??
  DEFAULT_BACKEND_DIRECT_HEALTH_URL;
const httpTimeoutMs = Number(
  options.httpTimeoutMs ?? process.env.AREAS_CAPTURE_HTTP_TIMEOUT_MS ?? DEFAULT_HTTP_TIMEOUT_MS
);
const chromeCdpTimeoutMs = Number(
  options.chromeCdpTimeoutMs ??
    process.env.AREAS_CAPTURE_CHROME_CDP_TIMEOUT_MS ??
    DEFAULT_CHROME_CDP_TIMEOUT_MS
);
const requireScreenshot = parseBooleanOption(
  options.requireScreenshot ?? process.env.AREAS_CAPTURE_REQUIRE_SCREENSHOT ?? "false"
);
const profileDir = path.join(outDir, `${fileStem}.chrome-profile`);
const keepProfile = options.keepProfile === "true";
const route = new URL("/app", baseUrl).toString();
const bootstrapRoute = new URL("/login", baseUrl).toString();
const pngPath = path.join(outDir, `${fileStem}.png`);
const framePath = path.join(outDir, `${fileStem}.frame.json`);
const failureFramePath = path.join(outDir, `${fileStem}.failure.frame.json`);
const progressFramePath = path.join(outDir, `${fileStem}.progress.frame.json`);
const captureStartedAt = Date.now();

fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

let chromeStderr = "";
let chrome = null;
let chromeSpawnError = null;
let seededAuthState = null;
let expectedArea = null;
let expectedAreaDetail = null;
let authElapsedMs = null;
let runtimeEnvironmentPreflight = null;

try {
  const authStartedAt = Date.now();
  runtimeEnvironmentPreflight = await preflightRuntimeEnvironment({
    route,
    bootstrapRoute,
    authBaseUrl,
    backendDirectHealthUrl
  });
  seededAuthState = await createPersistedAuthState({
    authBaseUrl,
    username,
    password
  });
  expectedArea = await resolveExpectedAreaFromBackend({
    authBaseUrl,
    accessToken: seededAuthState.session.accessToken,
    areaQuery
  });
  expectedAreaDetail = await resolveExpectedAreaDetailFromBackend({
    authBaseUrl,
    accessToken: seededAuthState.session.accessToken,
    areaId: expectedArea.areaId
  });
  authElapsedMs = Date.now() - authStartedAt;

  chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--remote-debugging-port=${port}`,
      "--window-size=1440,900",
      `--user-data-dir=${profileDir}`,
      bootstrapRoute
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  chrome.stderr.on("data", (chunk) => {
    chromeStderr += chunk.toString();
  });
  chrome.on("error", (error) => {
    chromeSpawnError = error;
    chromeStderr += `\nCHROME_SPAWN_ERROR: ${formatErrorForMessage(error)}`;
  });

  const result = await captureFromChrome({
    port,
    route,
    bootstrapRoute,
    pngPath,
    framePath,
    progressFramePath,
    chromeCdpTimeoutMs,
    seededAuthState,
    expectedArea,
    expectedAreaDetail,
    runtimeEnvironmentPreflight,
    requireScreenshot,
    actionabilitySampleLimit,
    timings: {
      authElapsedMs,
      captureStartedAt
    },
    getChromeSpawnError: () => chromeSpawnError
  });
  console.log(JSON.stringify(buildConsoleSummary(result), null, 2));
} catch (error) {
  const previousFrameEvidence = readExistingRuntimeFrameEvidence(framePath);
  const frame = buildFailureFrame(error, {
    areaQuery,
    authBaseUrl,
    baseUrl,
    bootstrapRoute,
    captureStartedAt,
    captureTarget,
    chromePath,
    expectedArea,
    expectedAreaDetail,
    failureFramePath,
    fileStem,
    framePath,
    httpTimeoutMs,
    chromeCdpTimeoutMs,
    pngPath,
    port,
    previousFrameEvidence,
    requireScreenshot,
    actionabilitySampleLimit,
    runtimeEnvironmentPreflight,
    route,
    seededAuthState
  });
  fs.writeFileSync(failureFramePath, `${JSON.stringify(frame, null, 2)}\n`);
  console.error(JSON.stringify(buildConsoleSummary(frame), null, 2));
  process.exitCode = 1;
} finally {
  if (chrome) {
    await terminateChromeCaptureProcess(chrome);
  }
  if (!keepProfile) {
    removeProfileDirBestEffort(profileDir);
  }
}

function readExistingRuntimeFrameEvidence(candidateFramePath) {
  try {
    const stats = fs.statSync(candidateFramePath);
    const frame = JSON.parse(fs.readFileSync(candidateFramePath, "utf8"));
    return {
      exists: true,
      path: candidateFramePath,
      bytes: stats.size,
      mtimeMs: Math.round(stats.mtimeMs),
      version: frame.version ?? null,
      status: frame.status ?? null,
      capturedAt: frame.capturedAt ?? null,
      screenshotPath: frame.screenshotPath ?? null,
      screenshotBytes: frame.screenshotBytes ?? null,
      target: frame.target
        ? {
            captureTarget: frame.target.captureTarget ?? null,
            areaQuery: frame.target.areaQuery ?? null,
            expectedArea: summarizeAreaForConsole(frame.target.expectedArea),
            openedAreaMatchesExpected: frame.target.openedAreaMatchesExpected ?? null
          }
        : null,
      runtimeActionabilitySummary: frame.runtimeActionabilitySummary
        ? {
            version: frame.runtimeActionabilitySummary.version ?? null,
            status: frame.runtimeActionabilitySummary.status ?? null,
            firstErrorReason: frame.runtimeActionabilitySummary.firstErrorReason ?? null,
            sharedRenderer: frame.runtimeActionabilitySummary.sharedRenderer
              ? {
                  status: frame.runtimeActionabilitySummary.sharedRenderer.status ?? null,
                  missingPayloadCount:
                    frame.runtimeActionabilitySummary.sharedRenderer.missingPayloadCount ?? null,
                  renderedModelUrlCount:
                    frame.runtimeActionabilitySummary.sharedRenderer.renderedModelUrlCount ??
                    frame.runtimeActionabilitySummary.sharedRenderer.modelReadyCount ??
                    null
                }
              : null
          }
        : null
    };
  } catch (error) {
    return {
      exists: false,
      path: candidateFramePath,
      cause: serializeError(error)
    };
  }
}

async function captureFromChrome({
  port,
  route,
  bootstrapRoute,
  pngPath,
  framePath,
  progressFramePath,
  chromeCdpTimeoutMs,
  seededAuthState,
  expectedArea,
  expectedAreaDetail,
  runtimeEnvironmentPreflight,
  requireScreenshot,
  actionabilitySampleLimit,
  timings,
  getChromeSpawnError
}) {
  const tab = await waitForTab(port, bootstrapRoute, {
    getChromeSpawnError,
    timeoutMs: chromeCdpTimeoutMs
  });
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let messageId = 0;
  const pending = new Map();
  const networkCapture = createNetworkCapture();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) {
      recordNetworkEvent(networkCapture, message);
      return;
    }
    if (!pending.has(message.id)) {
      return;
    }
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(handlers.timeout);
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

  const rejectPending = (error) => {
    for (const [id, handlers] of pending.entries()) {
      clearTimeout(handlers.timeout);
      pending.delete(id);
      handlers.reject(error);
    }
  };
  ws.onerror = () => {
    rejectPending(new Error("Chrome DevTools WebSocket error during Areas runtime capture."));
  };
  ws.onclose = () => {
    rejectPending(new Error("Chrome DevTools WebSocket closed during Areas runtime capture."));
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++messageId;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(
          createBlockerError(
            "chrome_cdp_command_timeout",
            `Chrome DevTools command ${method} timed out during Areas runtime capture.`,
            {
              method,
              timeoutMs: chromeCdpTimeoutMs
            }
          )
        );
      }, chromeCdpTimeoutMs);
      pending.set(id, { resolve, reject, timeout });
      try {
        ws.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        clearTimeout(timeout);
        pending.delete(id);
        reject(error);
      }
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable", { maxPostDataSize: 2_000_000 });
  try {
  const loginReady = await waitForLoginOrApp(send);
  await seedBrowserAuthState(send, seededAuthState);
  await send("Page.navigate", { url: route });
  const areasWorkspaceStatus = await waitForAreasWorkspace(send);
  const openedArea = await openArea(send, areaQuery, expectedArea);
  const domStatus = await waitForAreaRuntimeSnapshot(send, openedArea, expectedArea, {
    progressFramePath,
    route,
    captureStartedAt: timings.captureStartedAt
  });
  domStatus.areasWorkspaceWaitElapsedMs = areasWorkspaceStatus.areasWorkspaceWaitElapsedMs;
  const runtimeBlockerSnapshot = buildRuntimeBlockerSnapshot(domStatus);

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });

  fs.writeFileSync(pngPath, Buffer.from(screenshot.data, "base64"));
  const screenshotEvidence = inspectScreenshotEvidence(pngPath, timings.captureStartedAt);
  if (requireScreenshot && !screenshotEvidence.fresh) {
    throw createBlockerError(
      "render_screenshot_missing",
      "Strict visual capture requires a fresh _IKEA screenshot, but no fresh PNG was produced.",
      {
        endpoint: route,
        port: resolveUrlPort(route),
        pngPath,
        expectedArea,
        screenshot: screenshotEvidence,
        strictFailureClass: "render_screenshot_missing"
      }
    );
  }
  await hydrateNetworkResponseBodies(send, networkCapture);
  const networkCaptureSummary = buildNetworkCaptureSummary(networkCapture);
  const runtimeActionabilitySummary = buildRuntimeActionabilitySummary({
    domStatus,
    expectedAreaDetail,
    networkCaptureSummary,
    sampleLimit: actionabilitySampleLimit
  });
  const frame = {
    version: "aurora-areas-runtime-cdp-capture/v1",
    capturedAt: new Date().toISOString(),
    status: "captured",
    requestedRoute: route,
    finalRoute: domStatus.href,
    target: {
      captureTarget,
      areaQuery,
      expectedArea,
      openedAreaMatchesExpected: domStatus.runtimeFreshness?.ok === true
    },
    areaQuery,
    openedArea,
    screenshotPath: pngPath,
    screenshotBytes: fs.statSync(pngPath).size,
    framePath,
    timings: {
      authElapsedMs: timings.authElapsedMs,
      totalElapsedMs: Date.now() - timings.captureStartedAt,
      areasWorkspaceWaitElapsedMs: domStatus.areasWorkspaceWaitElapsedMs ?? null,
      captureWaitElapsedMs: domStatus.captureWaitElapsedMs ?? null
    },
    strictVisualMode: buildStrictVisualModeSuccess({
      requireScreenshot,
      screenshotEvidence
    }),
    runtimeEnvironmentPreflight,
    loginReady,
    seededAuth: {
      source: authBaseUrl,
      userId: seededAuthState.session.user.id,
      role: seededAuthState.session.user.role,
      permissionCount: seededAuthState.authorization.permissions.length
    },
    domStatus,
    terrainTileModelSnapshot: domStatus.terrainTileModelSnapshot,
    tileProcessRuntimeSnapshot: domStatus.tileProcessRuntimeSnapshot,
    areaObjectSharedRendererSnapshot: domStatus.areaObjectSharedRendererSnapshot,
    primitiveFallbackRenderSuppressionSnapshot:
      domStatus.primitiveFallbackRenderSuppressionSnapshot,
    expectedAreaDetailSummary: summarizeExpectedAreaDetail(expectedAreaDetail),
    networkCaptureSummary,
    runtimeActionabilitySummary,
    runtimeBlockerSnapshot,
    captureMethod:
      "chrome-devtools-protocol Page.captureScreenshot plus data-area-terrain-tile-model-runtime-snapshot, data-area-tile-process-runtime-snapshot, shared renderer/placeable, loader, and blocker runtime datasets",
    chromeStderrTail: chromeStderr.slice(-1200),
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true
  };
  fs.writeFileSync(framePath, `${JSON.stringify(frame, null, 2)}\n`);
  return frame;
  } catch (error) {
    await enrichCaptureErrorWithNetwork(error, send, networkCapture);
    throw error;
  } finally {
    ws.close();
  }
}

async function preflightRuntimeEnvironment({
  route,
  bootstrapRoute,
  authBaseUrl,
  backendDirectHealthUrl
}) {
  const frontendChecks = [];
  for (const endpoint of [route, bootstrapRoute]) {
    frontendChecks.push(
      await probeHttpEndpoint(endpoint, {
        label: endpoint === route ? "frontend_app" : "frontend_login",
        expectJson: false
      })
    );
  }
  const frontendOk = frontendChecks.some((check) => check.ok);
  if (!frontendOk) {
    throw createBlockerError(
      "frontend_unavailable",
      "Frontend route is unavailable before Areas runtime capture.",
      {
        runtimeEnvironmentPreflight: {
          frontend: frontendChecks,
          backendProxyHealth: null,
          backendDirectHealth: null
        }
      }
    );
  }

  const backendProxyHealth = await probeHttpEndpoint(`${authBaseUrl}/health`, {
    label: "backend_proxy_health",
    expectJson: true
  });
  if (backendProxyHealth.ok) {
    return {
      status: "ok",
      frontend: frontendChecks,
      backendProxyHealth,
      backendDirectHealth: null
    };
  }

  const backendDirectHealth = await probeHttpEndpoint(backendDirectHealthUrl, {
    label: "backend_direct_health",
    expectJson: true
  });
  const runtimeEnvironmentPreflight = {
    status: backendDirectHealth.ok ? "backend_proxy_blocked" : "backend_direct_blocked",
    frontend: frontendChecks,
    backendProxyHealth,
    backendDirectHealth
  };

  if (backendDirectHealth.ok) {
    throw createBlockerError(
      "backend_proxy_unavailable",
      "Backend health is reachable directly, but unavailable through the frontend proxy.",
      {
        endpoint: backendProxyHealth.endpoint,
        port: backendProxyHealth.port,
        status: backendProxyHealth.status ?? null,
        elapsedMs: backendProxyHealth.elapsedMs,
        cause: backendProxyHealth.cause ?? null,
        runtimeEnvironmentPreflight
      }
    );
  }

  throw createBlockerError(
    "backend_direct_unavailable",
    "Backend health is unavailable through the frontend proxy and direct backend health endpoint.",
    {
      endpoint: backendDirectHealth.endpoint,
      port: backendDirectHealth.port,
      status: backendDirectHealth.status ?? null,
      elapsedMs: backendDirectHealth.elapsedMs,
      cause: backendDirectHealth.cause ?? null,
      runtimeEnvironmentPreflight,
      relatedBlockers: [
        {
          lane: "capture",
          code: "backend_proxy_unavailable",
          summary: "Backend proxy health check failed before Areas runtime capture.",
          details: backendProxyHealth
        }
      ]
    }
  );
}

async function createPersistedAuthState({ authBaseUrl, username, password }) {
  const loginEndpoint = `${authBaseUrl}/auth/login`;
  const loginPayload = await fetchJsonWithTimeout(loginEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  }, "backend_login", {
    blockerCode: "backend_login_failed"
  });
  const accessToken = loginPayload.data?.session?.accessToken;
  if (!accessToken) {
    throw createBlockerError("backend_login_failed", "Backend login returned no access token.", {
      endpoint: loginEndpoint,
      port: resolveUrlPort(loginEndpoint),
      failureKind: "backend_login_missing_access_token"
    });
  }
  const meEndpoint = `${authBaseUrl}/auth/me`;
  const mePayload = await fetchJsonWithTimeout(meEndpoint, {
    headers: { authorization: `Bearer ${accessToken}` }
  }, "backend_me", {
    blockerCode: "backend_login_failed"
  });
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

async function resolveExpectedAreaFromBackend({ authBaseUrl, accessToken, areaQuery }) {
  const endpoint = `${authBaseUrl}/areas?${new URLSearchParams({
    query: areaQuery,
    limit: "100",
    offset: "0"
  }).toString()}`;
  const payload = await fetchJsonWithTimeout(endpoint, {
    headers: { authorization: `Bearer ${accessToken}` }
  }, "areas_list");
  const items = payload?.data?.items;
  if (!Array.isArray(items)) {
    throw createBlockerError("areas_list_payload_invalid", "Areas list payload did not include data.items.", {
      endpoint,
      port: resolveUrlPort(endpoint),
      payloadShape: Object.keys(payload ?? {})
    });
  }
  const match = pickExpectedArea(items, areaQuery);
  if (!match.area) {
    throw createBlockerError("area_target_not_found", `Could not resolve target Area ${areaQuery}.`, {
      endpoint,
      port: resolveUrlPort(endpoint),
      areaQuery,
      candidateCount: items.length,
      candidates: items.slice(0, 12).map((item) => ({
        areaId: item.areaId ?? null,
        name: item.name ?? null,
        width: item.width ?? null,
        height: item.height ?? null,
        totalObjects: item.objectCounts?.total ?? null
      }))
    });
  }
  return {
    areaId: match.area.areaId,
    name: match.area.name,
    width: match.area.width,
    height: match.area.height,
    objectCounts: match.area.objectCounts ?? null,
    textureAtlasId: match.area.textureAtlasId ?? null,
    updatedAt: match.area.updatedAt ?? null,
    listEndpoint: endpoint,
    matchStrategy: match.strategy,
    candidateCount: items.length
  };
}

async function resolveExpectedAreaDetailFromBackend({ authBaseUrl, accessToken, areaId }) {
  if (!areaId) {
    return {
      status: "skipped",
      areaId: null,
      endpoint: null,
      objectCount: 0,
      objects: []
    };
  }
  const endpoint = `${authBaseUrl}/areas/${encodeURIComponent(areaId)}`;
  try {
    const payload = await fetchJsonWithTimeout(endpoint, {
      headers: { authorization: `Bearer ${accessToken}` }
    }, "areas_detail");
    const area = payload?.data ?? payload;
    const objects = Array.isArray(area?.objects) ? area.objects : [];
    return {
      status: "available",
      endpoint,
      areaId: area?.areaId ?? areaId,
      name: area?.name ?? null,
      objectCount: objects.length,
      objects: objects.map((object) => ({
        objectId: object.objectId ?? null,
        kind: object.kind ?? null,
        templateId: object.templateId ?? null,
        resRef: object.resRef ?? null,
        appearanceType: object.appearanceType ?? null,
        genericType: object.genericType ?? null,
        x: numberOrNull(object.x),
        y: numberOrNull(object.y),
        z: numberOrNull(object.z),
        bearing: numberOrNull(object.bearing)
      }))
    };
  } catch (error) {
    return {
      status: "unavailable",
      endpoint,
      areaId,
      objectCount: null,
      objects: [],
      blocker: normalizeCaptureError(error)
    };
  }
}

async function probeHttpEndpoint(endpoint, { label, expectJson }) {
  const startedAt = Date.now();
  try {
    const response = await fetchWithTimeout(endpoint, { method: "GET" }, label);
    const elapsedMs = Date.now() - startedAt;
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    let payload = null;
    let parseError = null;
    if (text && (expectJson || contentType.includes("json"))) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        parseError = formatErrorForMessage(error);
      }
    }
    const ok = response.ok && (!expectJson || !parseError);
    return {
      ok,
      label,
      endpoint,
      port: resolveUrlPort(endpoint),
      method: "GET",
      elapsedMs,
      status: response.status,
      statusText: response.statusText,
      contentType,
      responseTextTail: ok ? undefined : text.slice(-800),
      payload: payload && ok ? payload : undefined,
      parseError: parseError ?? undefined
    };
  } catch (error) {
    return {
      ok: false,
      label,
      endpoint,
      port: resolveUrlPort(endpoint),
      method: "GET",
      elapsedMs: Date.now() - startedAt,
      timeoutMs: httpTimeoutMs,
      cause: serializeError(error)
    };
  }
}

async function fetchWithTimeout(endpoint, init, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`${label} timed out after ${httpTimeoutMs}ms`));
  }, httpTimeoutMs);
  try {
    return await fetch(endpoint, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithTimeout(endpoint, init, label, options = {}) {
  const startedAt = Date.now();
  const method = init?.method ?? "GET";
  const blockerCode = options.blockerCode ?? null;
  try {
    const response = await fetchWithTimeout(endpoint, init, label);
    const elapsedMs = Date.now() - startedAt;
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (error) {
      throw createBlockerError(blockerCode ?? `${label}_invalid_json`, `${label} returned non-JSON response.`, {
        endpoint,
        port: resolveUrlPort(endpoint),
        method,
        elapsedMs,
        status: response.status,
        failureKind: `${label}_invalid_json`,
        responseTextTail: text.slice(-800),
        parseError: formatErrorForMessage(error)
      });
    }
    if (!response.ok) {
      throw createBlockerError(blockerCode ?? `${label}_http_${response.status}`, `${label} failed with HTTP ${response.status}.`, {
        endpoint,
        port: resolveUrlPort(endpoint),
        method,
        elapsedMs,
        status: response.status,
        failureKind: `${label}_http_${response.status}`,
        payload
      });
    }
    return payload;
  } catch (error) {
    if (error?.captureBlocker) {
      throw error;
    }
    const elapsedMs = Date.now() - startedAt;
    const timedOut = error?.name === "AbortError" || /timed out/i.test(error?.message ?? "");
    throw createBlockerError(
      blockerCode ?? (timedOut ? `${label}_timeout` : `${label}_fetch_failed`),
      `${label} ${timedOut ? "timed out" : "request failed"} for ${endpoint}.`,
      {
        endpoint,
        port: resolveUrlPort(endpoint),
        method,
        elapsedMs,
        timeoutMs: httpTimeoutMs,
        failureKind: timedOut ? `${label}_timeout` : `${label}_fetch_failed`,
        cause: serializeError(error)
      }
    );
  }
}

async function seedBrowserAuthState(send, seededAuthState) {
  await send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `(() => {
      window.localStorage.setItem(
        "aurora_web.auth_session.v1",
        ${JSON.stringify(JSON.stringify(seededAuthState))}
      );
      window.localStorage.setItem("aurora_web.workspace_mode.v1", "areas_mode");
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
  throw createBlockerError("frontend_login_element_missing", "Login route did not expose username input or app route.", {
    endpoint: bootstrapRoute,
    port: resolveUrlPort(bootstrapRoute),
    selector: "#username",
    timeoutMs: 40 * 150,
    lastStatus
  });
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

async function waitForAreasWorkspace(send) {
  let lastStatus = null;
  const startedAt = Date.now();
  for (let attempt = 0; attempt < AREAS_WORKSPACE_LIST_WAIT_ATTEMPTS; attempt += 1) {
    const status = await readAreasWorkspaceStatus(send);
    lastStatus = {
      ...status,
      areasWorkspaceWaitElapsedMs: Date.now() - startedAt
    };
    if (status?.hasAreaPanel && status?.hasCanvas && status?.areaRowCount > 0) {
      return lastStatus;
    }
    await sleep(AREAS_WORKSPACE_LIST_WAIT_INTERVAL_MS);
  }
  throw createBlockerError("areas_workspace_missing_element", "Areas workspace did not expose area panel, canvas, and area rows.", {
    endpoint: route,
    port: resolveUrlPort(route),
    requiredSelectors: [".area-selection-panel", ".workspace-render-canvas", ".area-selection-panel .scene-object-row"],
    timeoutMs: AREAS_WORKSPACE_LIST_WAIT_ATTEMPTS * AREAS_WORKSPACE_LIST_WAIT_INTERVAL_MS,
    lastStatus
  });
}

async function readAreasWorkspaceStatus(send) {
  const status = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const runtime = document.querySelector(".workspace-render-canvas");
      const areaPanel = document.querySelector(".area-selection-panel");
      const areaRows = Array.from(document.querySelectorAll(".area-selection-panel .scene-object-row"));
      const areaPanelText = areaPanel?.textContent?.replace(/\\s+/gu, " ").trim() ?? "";
      return {
        href: window.location.href,
        routePath: window.location.pathname,
        hasAreaPanel: Boolean(areaPanel),
        hasCanvas: Boolean(runtime),
        areaPanelText: areaPanelText.slice(0, 600),
        areaListLoading: /loading|refresh|wczyt|ladow/iu.test(areaPanelText),
        areaRowCount: areaRows.length,
        areaRowsSample: areaRows.slice(0, 8).map((row) => row.textContent?.trim() ?? "")
      };
    })()`
  });
  return status.result.value;
}

async function openArea(send, query, expectedArea) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const query = ${JSON.stringify(query.trim().toLowerCase())};
      const expectedArea = ${JSON.stringify(expectedArea)};
      const search = document.querySelector("input[aria-label='Filter areas']");
      if (search && query) {
        search.value = query;
        search.dispatchEvent(new Event("input", { bubbles: true }));
      }
      await waitForAreaRowsToSettle();
      const rows = Array.from(document.querySelectorAll(".area-selection-panel .scene-object-row"));
      const row = resolveTargetRow(rows, query, expectedArea);
      if (!row) {
        return {
          ok: false,
          reason: "area_row_not_found",
          query,
          expectedArea,
          rowCount: rows.length,
          rowsSample: rows.slice(0, 8).map(describeAreaRow)
        };
      }
      row.click();
      const selectionSettled = await waitForAreaRowSelection(row);
      if (!selectionSettled) {
        return {
          ok: false,
          reason: "area_row_selection_did_not_settle",
          areaText: row.textContent?.trim() ?? "",
          ariaSelected: row.getAttribute("aria-selected"),
          className: row.className
        };
      }
      const openButton = Array.from(document.querySelectorAll(".area-selection-actions button"))
        .find((button) => button.textContent?.includes("Open Selected Area"));
      if (!openButton || openButton.disabled) {
        return {
          ok: false,
          reason: "open_selected_area_unavailable",
          areaText: row.textContent?.trim() ?? "",
          buttonText: openButton?.textContent?.trim() ?? null,
          buttonDisabled: Boolean(openButton?.disabled)
        };
      }
      const runtimeDatasetCleared = clearAreaRuntimeDatasets();
      openButton.click();
      const rowInfo = describeAreaRow(row);
      const parsedAreaExpectation = parseAreaExpectationFromText(row.textContent?.trim() ?? "");
      const areaExpectation = expectedArea
        ? {
            areaId: expectedArea.areaId,
            name: expectedArea.name,
            width: Number(expectedArea.width),
            height: Number(expectedArea.height),
            objectCount: Number(expectedArea.objectCounts?.total ?? parsedAreaExpectation.objectCount)
          }
        : parsedAreaExpectation;
      return {
        ok: true,
        areaText: row.textContent?.trim() ?? "",
        rowInfo,
        expectedArea,
        areaExpectation,
        query,
        buttonText: openButton.textContent?.trim() ?? "",
        runtimeDatasetCleared
      };

      function resolveTargetRow(candidateRows, searchQuery, expected) {
        const normalizedExpectedName = normalizeAreaIdentity(expected?.name ?? "");
        const normalizedExpectedId = normalizeAreaIdentity(expected?.areaId ?? "");
        const normalizedQuery = normalizeAreaIdentity(searchQuery);
        if (normalizedExpectedName || normalizedExpectedId) {
          const exact = candidateRows.find((candidate) => {
            const info = describeAreaRow(candidate);
            return (
              normalizeAreaIdentity(info.title) === normalizedExpectedName ||
              normalizeAreaIdentity(info.title) === normalizedExpectedId
            );
          });
          if (exact) {
            return exact;
          }
        }
        if (searchQuery) {
          const exactQuery = candidateRows.find((candidate) => {
            const info = describeAreaRow(candidate);
            return normalizeAreaIdentity(info.title) === normalizedQuery;
          });
          if (exactQuery) {
            return exactQuery;
          }
          return candidateRows.find((candidate) =>
            normalizeAreaIdentity(candidate.textContent ?? "").includes(normalizedQuery)
          );
        }
        return candidateRows[0];
      }
      function describeAreaRow(row) {
        return {
          title: row.querySelector("strong")?.textContent?.trim() ?? "",
          text: row.textContent?.replace(/\\s+/gu, " ").trim() ?? "",
          ariaSelected: row.getAttribute("aria-selected"),
          className: row.className
        };
      }
      function normalizeAreaIdentity(value) {
        return String(value ?? "").trim().toLowerCase().replace(/^area_+/u, "").replace(/[^a-z0-9]+/gu, "");
      }
      function clearAreaRuntimeDatasets() {
        const runtime = document.querySelector(".workspace-render-canvas");
        if (!runtime) {
          return {
            ok: false,
            reason: "runtime_canvas_missing_before_open"
          };
        }
        const dataset = runtime.dataset;
        const workspaceCanvasLayer = document.querySelector(".workspace-canvas-layer");
        [
          "areaTerrainAreaId",
          "areaTerrainTileModelRuntimeStatus",
          "areaTerrainTileModelRuntimeSnapshot",
          "areaTileProcessRuntimeAreaId",
          "areaTileProcessRuntimeStatus",
          "areaTileProcessRuntimeSnapshot",
          "areaObjectSharedRendererSnapshot",
          "areaPrimitiveFallbackRenderSuppressionSnapshot"
        ].forEach((key) => {
          delete dataset[key];
        });
        dataset.areasRuntimeCaptureClearedAt = String(Date.now());
        if (workspaceCanvasLayer?.dataset) {
          workspaceCanvasLayer.dataset.areasRuntimeCaptureClearedAt =
            dataset.areasRuntimeCaptureClearedAt;
        }
        window.__auroraAreasRuntimeCaptureClearedAt = dataset.areasRuntimeCaptureClearedAt;
        try {
          window.sessionStorage.setItem(
            "aurora_areas_runtime_capture_cleared_at",
            dataset.areasRuntimeCaptureClearedAt
          );
        } catch {
          // Session storage is best-effort capture evidence.
        }
        return {
          ok: true,
          clearedAt: dataset.areasRuntimeCaptureClearedAt
        };
      }
      function parseAreaExpectationFromText(text) {
        const sizeMatch = text.match(/\\|\\s*(\\d+)x(\\d+)\\s*\\|\\s*(\\d+)\\s+objects/i);
        return {
          areaId: null,
          name: null,
          width: sizeMatch ? Number(sizeMatch[1]) : null,
          height: sizeMatch ? Number(sizeMatch[2]) : null,
          objectCount: sizeMatch ? Number(sizeMatch[3]) : null
        };
      }
      async function waitForAreaRowsToSettle() {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const rows = Array.from(document.querySelectorAll(".area-selection-panel .scene-object-row"));
          if (!query || rows.some((candidate) => candidate.textContent?.toLowerCase().includes(query))) {
            return true;
          }
          await sleep(50);
        }
        return false;
      }
      async function waitForAreaRowSelection(targetRow) {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          if (
            targetRow.getAttribute("aria-selected") === "true" ||
            targetRow.classList.contains("is-selected")
          ) {
            return true;
          }
          await sleep(50);
        }
        return false;
      }
      function sleep(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
      }
    })()`
  });
  const openedArea = result.result.value;
  if (!openedArea?.ok) {
    throw createBlockerError(
      `areas_open_${openedArea?.reason ?? "failed"}`,
      `Could not open target Area ${query}.`,
      {
        endpoint: route,
        port: resolveUrlPort(route),
        query,
        expectedArea,
        openedArea
      }
    );
  }
  return openedArea;
}

async function waitForAreaRuntimeSnapshot(
  send,
  openedArea,
  expectedArea,
  { progressFramePath, route, captureStartedAt } = {}
) {
  let lastStatus = null;
  const startedAt = Date.now();
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const status = await readAreaRuntimeStatus(send, openedArea.areaText);
    const runtimeFreshness = buildRuntimeFreshnessCheck(status, openedArea, expectedArea);
    lastStatus = {
      ...status,
      areaExpectation: openedArea.areaExpectation ?? null,
      runtimeFreshness,
      captureWaitElapsedMs: Date.now() - startedAt
    };
    if (progressFramePath && (attempt === 0 || attempt % 4 === 0)) {
      writeAreaRuntimeCaptureProgressFrame(progressFramePath, {
        attempt,
        route,
        openedArea,
        expectedArea,
        captureStartedAt,
        waitStartedAt: startedAt,
        status: lastStatus
      });
    }
    if (isExpectedAreaRuntimeSnapshot(lastStatus, openedArea, expectedArea)) {
      if (progressFramePath) {
        writeAreaRuntimeCaptureProgressFrame(progressFramePath, {
          attempt,
          route,
          openedArea,
          expectedArea,
          captureStartedAt,
          waitStartedAt: startedAt,
          status: lastStatus,
          settled: true
        });
      }
      return lastStatus;
    }
    await sleep(250);
  }
  throw createBlockerError(
    "areas_runtime_snapshot_stale_or_missing",
    "Expected Area runtime snapshot did not settle for opened Area.",
    {
      endpoint: route,
      port: resolveUrlPort(route),
      expectedArea,
      openedArea,
      timeoutMs: 240 * 250,
      lastStatus
    }
  );
}

function writeAreaRuntimeCaptureProgressFrame(
  progressFramePath,
  {
    attempt,
    route,
    openedArea,
    expectedArea,
    captureStartedAt,
    waitStartedAt,
    status,
    settled = false
  }
) {
  try {
    const frame = {
      version: "aurora-areas-runtime-cdp-progress/v1",
      capturedAt: new Date().toISOString(),
      status: settled ? "settled" : "waiting",
      attempt,
      requestedRoute: route,
      target: {
        captureTarget,
        areaQuery,
        expectedArea,
        openedAreaMatchesExpected: status?.runtimeFreshness?.ok === true
      },
      openedArea,
      timings: {
        totalElapsedMs: captureStartedAt ? Date.now() - captureStartedAt : null,
        captureWaitElapsedMs: waitStartedAt ? Date.now() - waitStartedAt : null
      },
      domStatus: status,
      terrainTileModelSnapshot: status?.terrainTileModelSnapshot ?? null,
      tileProcessRuntimeSnapshot: status?.tileProcessRuntimeSnapshot ?? null,
      areaObjectSharedRendererSnapshot: status?.areaObjectSharedRendererSnapshot ?? null,
      placeableModelLoadQueueDataset: status?.placeableModelLoadQueueDataset ?? null,
      areaObjectRuntimeDataset: status?.areaObjectRuntimeDataset ?? null
    };
    fs.writeFileSync(progressFramePath, `${JSON.stringify(frame, null, 2)}\n`);
  } catch {
    // Progress frames are best-effort evidence; capture itself should keep running.
  }
}

function isExpectedAreaRuntimeSnapshot(status, openedArea, expectedArea) {
  if (!status?.runtimeFreshness?.ok) {
    return false;
  }
  const terrainSnapshot = status?.terrainTileModelSnapshot;
  if (terrainSnapshot?.version !== "aurora-areas-terrain-tile-model-runtime/v1") {
    return false;
  }
  const expectation = openedArea.areaExpectation ?? {};
  if (Number.isFinite(expectation.width) && Number.isFinite(expectation.height)) {
    const expectedExtent = `${expectation.width}x${expectation.height}`;
    if (status.terrainTileModelDataset?.extentFootprintSize !== expectedExtent) {
      return false;
    }
    const minimumTileCount = expectation.width * expectation.height;
    if (terrainSnapshot.tileCount < minimumTileCount) {
      return false;
    }
  }
  const tileProcessSnapshot = status?.tileProcessRuntimeSnapshot;
  if (tileProcessSnapshot?.version !== "aurora-areas-tile-process-runtime/v1") {
    return false;
  }
  if (tileProcessSnapshot.status === "not_checked") {
    return false;
  }
  return (
    hasExpectedTileModelLoaderSettlement(terrainSnapshot) &&
    hasExpectedPlaceablePayloadSettlement(status, openedArea, expectedArea) &&
    hasExpectedPlaceableModelLoadSettlement(status)
  );
}

function hasExpectedTileModelLoaderSettlement(terrainSnapshot) {
  if (!terrainSnapshot || Number(terrainSnapshot.contractTileCount ?? 0) < 1) {
    return true;
  }
  const tileCount = Number(terrainSnapshot.tileCount ?? 0);
  const loadedTileCount = Number(terrainSnapshot.loadedTileCount ?? 0);
  const failedTileCount = Number(terrainSnapshot.failedTileCount ?? 0);
  const materialTextureContractTileCount = Number(
    terrainSnapshot.materialTextureContractTileCount ?? 0
  );
  const materialTextureAppliedTileCount = Number(
    terrainSnapshot.materialTextureAppliedTileCount ?? 0
  );
  const materialTextureFailedTileCount = Number(
    terrainSnapshot.materialTextureFailedTileCount ?? 0
  );
  if (
    materialTextureContractTileCount > 0 &&
    materialTextureAppliedTileCount < materialTextureContractTileCount &&
    materialTextureFailedTileCount === 0
  ) {
    return false;
  }
  if (tileCount > 0 && loadedTileCount === tileCount) {
    return true;
  }
  if (failedTileCount > 0) {
    return true;
  }
  return terrainSnapshot.status === "blocked" && terrainSnapshot.blockerSummary !== "none";
}

function hasExpectedPlaceablePayloadSettlement(status, openedArea, expectedArea) {
  const expectedObjectCount =
    Number(expectedArea?.objectCounts?.placeables ?? Number.NaN) ||
    Number(openedArea?.areaExpectation?.objectCount ?? Number.NaN);
  if (!Number.isFinite(expectedObjectCount) || expectedObjectCount < 1) {
    return true;
  }

  const snapshot = status?.areaObjectSharedRendererSnapshot;
  if (snapshot?.version !== "aurora-areas-shared-renderer-runtime/v1") {
    return false;
  }

  const total = Number(snapshot.total ?? 0);
  const payloadBoundCount = Number(snapshot.payloadBoundCount ?? 0);
  const missingPayloadCount = Number(snapshot.placeholderReasonCounts?.["missing-payload"] ?? 0);
  const stillLoadingCount = Number(snapshot.placeholderReasonCounts?.["still-loading"] ?? 0);

  return (
    total >= expectedObjectCount &&
    payloadBoundCount >= total &&
    missingPayloadCount === 0 &&
    stillLoadingCount === 0
  );
}

function hasExpectedPlaceableModelLoadSettlement(status) {
  const snapshot = status?.areaObjectSharedRendererSnapshot ?? {};
  const areaObjectDataset = status?.areaObjectRuntimeDataset ?? {};
  const queueDataset = status?.placeableModelLoadQueueDataset ?? {};
  const activeCount = countOrZero(queueDataset.activeCount);
  const pendingCount = countOrZero(queueDataset.pendingCount);
  const completedCount = countOrZero(queueDataset.completedCount);
  const totalCount = countOrZero(queueDataset.totalCount);
  if (activeCount + pendingCount > 0) {
    return false;
  }
  if (totalCount > 0 && completedCount < totalCount) {
    return false;
  }

  const expectedModelUrlCount = countOrZero(
    areaObjectDataset.backendRenderModelUrlReadyCount
  );
  if (expectedModelUrlCount < 1) {
    return true;
  }
  const modelReadyCount = countOrZero(
    snapshot.modelReadyCount ?? areaObjectDataset.sharedRendererModelReadyCount
  );
  const modelLoadFailedCount = countOrZero(
    snapshot.placeholderReasonCounts?.["model-load-failed"]
  );
  return modelReadyCount + modelLoadFailedCount >= expectedModelUrlCount;
}

function countOrZero(value) {
  return Math.max(0, numberOrNull(value) ?? 0);
}

function buildRuntimeFreshnessCheck(status, openedArea, expectedArea) {
  const expectedAreaId = expectedArea?.areaId ?? openedArea?.areaExpectation?.areaId ?? null;
  const checks = [
    {
      id: "runtime_dataset_was_cleared_before_open",
      expected: "present",
      actual: status?.areasRuntimeCaptureClearedAt ?? null,
      ok: Boolean(status?.areasRuntimeCaptureClearedAt)
    },
    {
      id: "terrain_dataset_area_id",
      expected: expectedAreaId,
      actual: status?.terrainTileModelDataset?.areaId ?? status?.areaTerrainAreaId ?? null,
      ok: !expectedAreaId || status?.terrainTileModelDataset?.areaId === expectedAreaId
    },
    {
      id: "terrain_snapshot_area_id",
      expected: expectedAreaId,
      actual: status?.terrainTileModelSnapshot?.areaId ?? null,
      ok: !expectedAreaId || status?.terrainTileModelSnapshot?.areaId === expectedAreaId
    },
    {
      id: "tile_process_dataset_area_id",
      expected: expectedAreaId,
      actual: status?.tileProcessRuntimeDataset?.areaId ?? null,
      ok: !expectedAreaId || status?.tileProcessRuntimeDataset?.areaId === expectedAreaId
    },
    {
      id: "tile_process_snapshot_area_id",
      expected: expectedAreaId,
      actual: status?.tileProcessRuntimeSnapshot?.areaId ?? null,
      ok: !expectedAreaId || status?.tileProcessRuntimeSnapshot?.areaId === expectedAreaId
    }
  ];
  const failed = checks.filter((check) => !check.ok);
  return {
    ok: failed.length === 0,
    expectedAreaId,
    checks,
    failed
  };
}

function buildRuntimeBlockerSnapshot(status) {
  const blockers = [];
  addBlocker(blockers, "visual", "first_visible_blocker", status.visualBlockers?.[0]?.text, {
    element: status.visualBlockers?.[0] ?? null
  });
  addBlocker(
    blockers,
    "terrain_tile_model_loader",
    status.terrainTileModelSnapshot?.status ?? status.terrainRuntimeStatus,
    status.terrainTileModelSnapshot?.blockerSummary,
    {
      areaId: status.terrainTileModelSnapshot?.areaId ?? status.terrainTileModelDataset?.areaId,
      failedTileSample:
        status.terrainTileModelSnapshot?.failedTileSample ??
        status.terrainTileModelDataset?.failedTileSample,
      loaderErrorSample:
        status.terrainTileModelSnapshot?.loaderErrorSample ??
        status.terrainTileModelDataset?.loaderErrorSample,
      blockedTileSample:
        status.terrainTileModelSnapshot?.blockedTileSample ??
        status.terrainTileModelDataset?.blockedTileSample,
      materialTextureFailedTileSample:
        status.terrainTileModelSnapshot?.materialTextureFailedTileSample ??
        status.terrainTileModelDataset?.materialTextureFailedTileSample
    }
  );
  addBlocker(
    blockers,
    "tile_process_contract",
    status.tileProcessRuntimeSnapshot?.status ?? status.tileProcessRuntimeStatus,
    status.tileProcessRuntimeSnapshot?.blockerSummary ??
      status.tileProcessRuntimeDataset?.blockers,
    {
      areaId:
        status.tileProcessRuntimeSnapshot?.areaId ?? status.tileProcessRuntimeDataset?.areaId,
      textureMaterialBlockers:
        status.tileProcessRuntimeSnapshot?.textureMaterialBlockerSummary ??
        status.tileProcessRuntimeDataset?.textureMaterialBlockers,
      renderAssetContractBlockers:
        status.tileProcessRuntimeSnapshot?.renderAssetContractBlockerSummary ??
        status.tileProcessRuntimeDataset?.renderAssetContractBlockers,
      mdlGlbMaterialBlockers:
        status.tileProcessRuntimeSnapshot?.mdlGlbMaterialBlockerSummary ??
        status.tileProcessRuntimeDataset?.mdlGlbMaterialBlockers
    }
  );
  addBlocker(
    blockers,
    "shared_placeables_renderer",
    status.areaObjectSharedRendererSnapshot?.status ??
      status.areaObjectRuntimeDataset?.sharedRendererStatus,
    summarizeSharedRendererBlocker(status),
    {
      snapshot: status.areaObjectSharedRendererSnapshot,
      dataset: status.areaObjectRuntimeDataset
    }
  );
  addBlocker(
    blockers,
    "primitive_fallback_render_suppression",
    status.primitiveFallbackRenderSuppressionSnapshot?.reason ??
      status.primitiveFallbackRenderSuppressionDataset?.reason,
    summarizePrimitiveFallbackSuppression(status),
    {
      snapshot: status.primitiveFallbackRenderSuppressionSnapshot,
      dataset: status.primitiveFallbackRenderSuppressionDataset
    }
  );
  return {
    version: "aurora-areas-runtime-blocker-snapshot/v1",
    status: blockers.length > 0 ? "blocked_or_partial" : "clear",
    firstBlocker: blockers[0] ?? null,
    blockers
  };
}

function addBlocker(blockers, lane, code, summary, details) {
  const normalizedSummary = normalizeBlockerSummary(summary);
  if (!normalizedSummary) {
    return;
  }
  blockers.push({
    lane,
    code: code ?? "unknown",
    summary: normalizedSummary,
    details
  });
}

function normalizeBlockerSummary(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  if (!text || text === "none" || text === "ready") {
    return null;
  }
  if (text === "not_checked") {
    return "not_checked";
  }
  return text;
}

function summarizeSharedRendererBlocker(status) {
  const snapshot = status.areaObjectSharedRendererSnapshot;
  const dataset = status.areaObjectRuntimeDataset ?? {};
  if (snapshot?.status === "blocked" || snapshot?.status === "partial") {
    const parts = [
      `status=${snapshot.status}`,
      `missingPayload=${snapshot.missingPayloadIds?.length ?? 0}`,
      `primitiveFallback=${snapshot.primitiveFallbackCount ?? 0}`,
      `blocked=${snapshot.blockedIds?.length ?? 0}`
    ];
    return parts.join(" ");
  }
  const missingPayloadIds = dataset.sharedRendererMissingPayloadIds;
  if (missingPayloadIds && missingPayloadIds !== "none") {
    return `missing payload ids: ${missingPayloadIds}`;
  }
  const blockedIds = dataset.backendRenderBlockedIds;
  if (blockedIds && blockedIds !== "none") {
    return `backend render blocked ids: ${blockedIds}`;
  }
  return null;
}

function summarizePrimitiveFallbackSuppression(status) {
  const snapshot = status.primitiveFallbackRenderSuppressionSnapshot;
  const dataset = status.primitiveFallbackRenderSuppressionDataset ?? {};
  const suppressedCount = Number(snapshot?.suppressedCount ?? dataset.suppressedCount ?? 0);
  if (suppressedCount > 0) {
    return `suppressed=${suppressedCount} ids=${(snapshot?.suppressedIds ?? dataset.suppressedIds ?? "none").toString()}`;
  }
  return null;
}

async function readAreaRuntimeStatus(send, openedAreaText) {
  const status = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const runtime = document.querySelector(".workspace-render-canvas");
      const canvas = runtime?.querySelector("canvas") ?? document.querySelector("canvas");
      const dataset = runtime?.dataset ?? {};
      const terrainSnapshotRaw = dataset.areaTerrainTileModelRuntimeSnapshot ?? "";
      const tileProcessSnapshotRaw = dataset.areaTileProcessRuntimeSnapshot ?? "";
      const sharedRendererSnapshotRaw = dataset.areaObjectSharedRendererSnapshot ?? "";
      const primitiveFallbackRenderSuppressionSnapshotRaw =
        dataset.areaPrimitiveFallbackRenderSuppressionSnapshot ?? "";
      let terrainTileModelSnapshot = null;
      let tileProcessRuntimeSnapshot = null;
      let areaObjectSharedRendererSnapshot = null;
      let primitiveFallbackRenderSuppressionSnapshot = null;
      try {
        terrainTileModelSnapshot = terrainSnapshotRaw ? JSON.parse(terrainSnapshotRaw) : null;
      } catch (error) {
        terrainTileModelSnapshot = { parseError: error instanceof Error ? error.message : String(error) };
      }
      try {
        tileProcessRuntimeSnapshot = tileProcessSnapshotRaw ? JSON.parse(tileProcessSnapshotRaw) : null;
      } catch (error) {
        tileProcessRuntimeSnapshot = { parseError: error instanceof Error ? error.message : String(error) };
      }
      try {
        areaObjectSharedRendererSnapshot = sharedRendererSnapshotRaw
          ? JSON.parse(sharedRendererSnapshotRaw)
          : null;
      } catch (error) {
        areaObjectSharedRendererSnapshot = { parseError: error instanceof Error ? error.message : String(error) };
      }
      try {
        primitiveFallbackRenderSuppressionSnapshot = primitiveFallbackRenderSuppressionSnapshotRaw
          ? JSON.parse(primitiveFallbackRenderSuppressionSnapshotRaw)
          : null;
      } catch (error) {
        primitiveFallbackRenderSuppressionSnapshot = { parseError: error instanceof Error ? error.message : String(error) };
      }
      const areaSharedRendererSnapshotReady =
        areaObjectSharedRendererSnapshot?.version === "aurora-areas-shared-renderer-runtime/v1" &&
        areaObjectSharedRendererSnapshot?.status === "ready" &&
        Number(areaObjectSharedRendererSnapshot?.total ?? 0) > 0 &&
        Number(areaObjectSharedRendererSnapshot?.modelReadyCount ?? 0) >=
          Number(areaObjectSharedRendererSnapshot?.total ?? 0) &&
        Number(areaObjectSharedRendererSnapshot?.primitiveFallbackCount ?? 0) === 0;
      const canvasRect = canvas?.getBoundingClientRect();
      const workspaceCanvasLayer = document.querySelector(".workspace-canvas-layer");
      const workspaceCanvasLayerDataset = workspaceCanvasLayer?.dataset ?? {};
      const canvasDataset = canvas?.dataset ?? {};
      const visualBlockers = Array.from(
        document.querySelectorAll(
          ".canvas-area-runtime-alert, .canvas-placeable-load-overlay, .scene-objects-empty"
        )
      )
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const opacity = Number.parseFloat(style.opacity || "1");
          return {
            selector:
              element.classList.contains("canvas-area-runtime-alert")
                ? ".canvas-area-runtime-alert"
                : element.classList.contains("canvas-placeable-load-overlay")
                  ? ".canvas-placeable-load-overlay"
                  : ".scene-objects-empty",
            text: element.textContent?.replace(/\\s+/gu, " ").trim().slice(0, 500) ?? "",
            visible:
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.visibility !== "collapse" &&
              opacity > 0.01,
            rect: {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          };
        })
        .filter((entry) => entry.visible)
        .filter(
          (entry) =>
            entry.selector !== ".canvas-placeable-load-overlay" ||
            !areaSharedRendererSnapshotReady
        )
        .slice(0, 8);
      return {
        href: window.location.href,
        routePath: window.location.pathname,
        openedAreaText: ${JSON.stringify(openedAreaText)},
        workspaceMode: window.localStorage.getItem("aurora_web.workspace_mode.v1"),
        canvasPresent: Boolean(canvas),
        canvasRect: canvasRect
          ? {
              left: Math.round(canvasRect.left),
              top: Math.round(canvasRect.top),
              width: Math.round(canvasRect.width),
              height: Math.round(canvasRect.height)
            }
          : null,
        externalSceneSeedDataset: {
          sceneId:
            workspaceCanvasLayerDataset.externalSceneId ??
            dataset.externalSceneId ??
            null,
          size:
            workspaceCanvasLayerDataset.externalSceneSize ??
            dataset.externalSceneSize ??
            null,
          objectCount:
            workspaceCanvasLayerDataset.externalSceneObjectCount ??
            dataset.externalSceneObjectCount ??
            null
        },
        canvasSceneDataset: {
          sceneId: dataset.currentSceneId ?? canvasDataset.currentSceneId ?? null,
          size: dataset.currentSceneSize ?? canvasDataset.currentSceneSize ?? null,
          tileCount:
            dataset.currentSceneTileCount ?? canvasDataset.currentSceneTileCount ?? null,
          objectCount:
            dataset.currentSceneObjectCount ??
            canvasDataset.currentSceneObjectCount ??
            null
        },
        terrainRuntimeStatus: dataset.areaTerrainTileModelRuntimeStatus ?? null,
        areasRuntimeCaptureClearedAt:
          dataset.areasRuntimeCaptureClearedAt ??
          workspaceCanvasLayerDataset.areasRuntimeCaptureClearedAt ??
          window.__auroraAreasRuntimeCaptureClearedAt ??
          window.sessionStorage.getItem("aurora_areas_runtime_capture_cleared_at") ??
          null,
        areaTerrainAreaId: dataset.areaTerrainAreaId ?? null,
        areaTerrainExtentFootprintSize: dataset.areaTerrainExtentFootprintSize ?? null,
        terrainTileModelSnapshot,
        tileProcessRuntimeStatus: dataset.areaTileProcessRuntimeStatus ?? null,
        tileProcessRuntimeSnapshot,
        areaObjectSharedRendererSnapshot,
        primitiveFallbackRenderSuppressionSnapshot,
        visualBlockers,
        terrainTileModelDataset: {
          loaderPath: dataset.areaTerrainTileModelLoaderPath ?? null,
          areaId: dataset.areaTerrainAreaId ?? null,
          extentFootprintSize: dataset.areaTerrainExtentFootprintSize ?? null,
          contractTileCount: dataset.areaTerrainTileModelContractTileCount ?? null,
          pendingCount: dataset.areaTerrainTileModelPendingCount ?? null,
          loadedCount: dataset.areaTerrainTileModelLoadedCount ?? null,
          failedCount: dataset.areaTerrainTileModelFailedCount ?? null,
          blockedCount: dataset.areaTerrainTileModelBlockedCount ?? null,
          deliveryUrlSample: dataset.areaTerrainTileModelDeliveryUrlSample ?? null,
          objectKeySample: dataset.areaTerrainTileModelObjectKeySample ?? null,
          failedTileSample: dataset.areaTerrainTileModelFailedTileSample ?? null,
          loaderErrorSample: dataset.areaTerrainTileModelLoaderErrorSample ?? null,
          blockedTileSample: dataset.areaTerrainTileModelBlockedTileSample ?? null,
          materialTextureContractCount:
            dataset.areaTerrainTileMaterialTextureContractCount ?? null,
          materialTextureAppliedCount:
            dataset.areaTerrainTileMaterialTextureAppliedCount ?? null,
          materialTextureFailedCount:
            dataset.areaTerrainTileMaterialTextureFailedCount ?? null,
          materialTexturePendingCount:
            dataset.areaTerrainTileMaterialTexturePendingCount ?? null,
          materialTextureFailedTileSample:
            dataset.areaTerrainTileMaterialTextureFailedTileSample ?? null
        },
        tileProcessRuntimeDataset: {
          areaId: dataset.areaTileProcessRuntimeAreaId ?? null,
          checkedCount: dataset.areaTileProcessRuntimeCheckedCount ?? null,
          readyCount: dataset.areaTileProcessRuntimeReadyCount ?? null,
          blockedCount: dataset.areaTileProcessRuntimeBlockedCount ?? null,
          blockers: dataset.areaTileProcessRuntimeBlockers ?? null,
          textureMaterialBlockers: dataset.areaTileProcessRuntimeTextureMaterialBlockers ?? null,
          renderAssetContractBlockers: dataset.areaTileProcessRuntimeRenderAssetContractBlockers ?? null,
          mdlGlbMaterialBlockers: dataset.areaTileProcessRuntimeMdlGlbMaterialBlockers ?? null
        },
        areaObjectRuntimeDataset: {
          source: dataset.areaObjectSource ?? null,
          sourceStatus: dataset.areaObjectSourceStatus ?? null,
          visibleCount: dataset.areaObjectVisibleCount ?? null,
          auroraGitCount: dataset.areaObjectAuroraGitCount ?? null,
          fallbackCount: dataset.areaObjectFallbackCount ?? null,
          placeableCount: dataset.areaObjectPlaceableCount ?? null,
          doorCount: dataset.areaObjectDoorCount ?? null,
          creatureCount: dataset.areaObjectCreatureCount ?? null,
          itemCount: dataset.areaObjectItemCount ?? null,
          soundCount: dataset.areaObjectSoundCount ?? null,
          backendRenderContractStatus: dataset.areaObjectBackendRenderContractStatus ?? null,
          backendRenderContractTotal: dataset.areaObjectBackendRenderContractTotal ?? null,
          backendRenderPayloadReadyCount:
            dataset.areaObjectBackendRenderPayloadReadyCount ?? null,
          backendRenderModelUrlReadyCount:
            dataset.areaObjectBackendRenderModelUrlReadyCount ?? null,
          backendRenderBlockedCount: dataset.areaObjectBackendRenderBlockedCount ?? null,
          backendRenderBlockedIds: dataset.areaObjectBackendRenderBlockedIds ?? null,
          primitiveFallbackIds: dataset.areaObjectPrimitiveFallbackIds ?? null,
          sharedRendererPath: dataset.areaObjectSharedRendererPath ?? null,
          sharedRendererStatus: dataset.areaObjectSharedRendererStatus ?? null,
          sharedRendererPayloadBoundCount:
            dataset.areaObjectSharedRendererPayloadBoundCount ?? null,
          sharedRendererModelReadyCount:
            dataset.areaObjectSharedRendererModelReadyCount ?? null,
          sharedRendererUniqueModelUrlCount:
            dataset.areaObjectSharedRendererUniqueModelUrlCount ?? null,
          sharedRendererUniqueModelCacheKeyCount:
            dataset.areaObjectSharedRendererUniqueModelCacheKeyCount ?? null,
          sharedRendererModelUrlSample:
            dataset.areaObjectSharedRendererModelUrlSample ?? null,
          sharedRendererModelCacheKeySample:
            dataset.areaObjectSharedRendererModelCacheKeySample ?? null,
          sharedRendererPrimitiveFallbackCount:
            dataset.areaObjectSharedRendererPrimitiveFallbackCount ?? null,
          sharedRendererPrimitiveFallbackRenderLimit:
            dataset.areaObjectSharedRendererPrimitiveFallbackRenderLimit ?? null,
          sharedRendererPrimitiveFallbackSuppressedCount:
            dataset.areaObjectSharedRendererPrimitiveFallbackSuppressedCount ?? null,
          sharedRendererMissingPayloadIds:
            dataset.areaObjectSharedRendererMissingPayloadIds ?? null
        },
        placeableModelLoadQueueDataset: {
          concurrencyLimit: dataset.placeableModelLoadConcurrencyLimit ?? null,
          startsPerFrameLimit: dataset.placeableModelLoadStartsPerFrameLimit ?? null,
          activeCount: dataset.placeableModelLoadQueueActiveCount ?? null,
          pendingCount: dataset.placeableModelLoadQueuePendingCount ?? null,
          completedCount: dataset.placeableModelLoadQueueCompletedCount ?? null,
          totalCount: dataset.placeableModelLoadQueueTotalCount ?? null,
          peakConcurrencyLimit: dataset.placeableModelLoadPeakConcurrencyLimit ?? null,
          peakStartsPerFrameLimit: dataset.placeableModelLoadPeakStartsPerFrameLimit ?? null,
          peakActiveCount: dataset.placeableModelLoadQueuePeakActiveCount ?? null,
          peakPendingCount: dataset.placeableModelLoadQueuePeakPendingCount ?? null,
          peakTotalCount: dataset.placeableModelLoadQueuePeakTotalCount ?? null,
          bulkModeActivated: dataset.placeableModelLoadBulkModeActivated ?? null,
          current: dataset.placeableModelLoadQueueCurrent ?? null
        },
        primitiveFallbackRenderSuppressionDataset: {
          reason: dataset.areaPrimitiveFallbackRenderSuppressionReason ?? null,
          renderLimit: dataset.areaPrimitiveFallbackRenderLimit ?? null,
          candidateCount: dataset.areaPrimitiveFallbackCandidateCount ?? null,
          renderedCount: dataset.areaPrimitiveFallbackRenderedCount ?? null,
          suppressedCount: dataset.areaPrimitiveFallbackSuppressedCount ?? null,
          suppressedIds: dataset.areaPrimitiveFallbackSuppressedIds ?? null
        }
      };
    })()`
  });
  return status.result.value;
}

async function waitForTab(port, route, { getChromeSpawnError, timeoutMs = 10_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const spawnError = getChromeSpawnError?.();
    if (spawnError) {
      throw createBlockerError("chrome_spawn_failed", "Chrome could not be started for CDP capture.", {
        chromePath,
        endpoint: `http://127.0.0.1:${port}/json/list`,
        port,
        route,
        cause: serializeError(spawnError)
      });
    }
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
  throw createBlockerError("chrome_cdp_tab_timeout", `No Chrome DevTools Protocol tab became available on port ${port}.`, {
    chromePath,
    endpoint: `http://127.0.0.1:${port}/json/list`,
    port,
    route,
      timeoutMs,
    chromeStderrTail: chromeStderr.slice(-1200)
  });
}

function pickExpectedArea(items, areaQuery) {
  const queryIdentity = normalizeAreaIdentity(areaQuery);
  const queryLower = areaQuery.trim().toLowerCase();
  const exactName = items.find((item) => normalizeAreaIdentity(item.name) === queryIdentity);
  if (exactName) {
    return { area: exactName, strategy: "exact_name" };
  }
  const exactAreaId = items.find((item) => normalizeAreaIdentity(item.areaId) === queryIdentity);
  if (exactAreaId) {
    return { area: exactAreaId, strategy: "exact_area_id" };
  }
  const areaIdSuffix = items.find((item) =>
    String(item.areaId ?? "").trim().toLowerCase().endsWith(`__${queryLower.replace(/^_+/u, "")}`)
  );
  if (areaIdSuffix) {
    return { area: areaIdSuffix, strategy: "area_id_suffix" };
  }
  const includes = items.find((item) => {
    const fields = [item.areaId, item.name, ...(Array.isArray(item.tags) ? item.tags : [])]
      .map((value) => normalizeAreaIdentity(value))
      .join(" ");
    return fields.includes(queryIdentity);
  });
  if (includes) {
    return { area: includes, strategy: "identity_includes" };
  }
  return { area: null, strategy: "none" };
}

function normalizeAreaIdentity(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^area_+/u, "")
    .replace(/[^a-z0-9]+/gu, "");
}

function createBlockerError(code, message, details = {}) {
  const error = new Error(message);
  error.captureBlocker = {
    code,
    message,
    ...details
  };
  return error;
}

function buildFailureFrame(error, context) {
  const strictVisualMode = buildStrictVisualModeFailure(error, context);
  const blockers = normalizeCaptureErrors(error, strictVisualMode);
  const networkCaptureSummary = error?.captureBlocker?.networkCaptureSummary ?? null;
  const failureDomStatus = error?.captureBlocker?.lastStatus ?? null;
  const runtimeActionabilitySummary = buildRuntimeActionabilitySummary({
    domStatus: failureDomStatus,
    expectedAreaDetail: context.expectedAreaDetail,
    networkCaptureSummary,
    sampleLimit: context.actionabilitySampleLimit
  });
  return {
    version: "aurora-areas-runtime-cdp-capture/v1",
    capturedAt: new Date().toISOString(),
    status: "blocked",
    requestedRoute: context.route,
    finalRoute: null,
    target: {
      captureTarget: context.captureTarget,
      areaQuery: context.areaQuery,
      expectedArea: context.expectedArea,
      openedAreaMatchesExpected: false
    },
    areaQuery: context.areaQuery,
    openedArea: null,
    screenshotPath: null,
    screenshotBytes: 0,
    framePath: context.failureFramePath,
    failureFramePath: context.failureFramePath,
    preservedCanonicalFramePath: context.framePath,
    preservedCanonicalFrame: context.previousFrameEvidence,
    timings: {
      totalElapsedMs: Date.now() - context.captureStartedAt,
      httpTimeoutMs: context.httpTimeoutMs,
      chromeCdpTimeoutMs: context.chromeCdpTimeoutMs
    },
    strictVisualMode,
    runtimeEnvironmentPreflight:
      error?.captureBlocker?.runtimeEnvironmentPreflight ??
      context.runtimeEnvironmentPreflight ??
      null,
    seededAuth: context.seededAuthState
      ? {
          source: context.authBaseUrl,
          userId: context.seededAuthState.session.user.id,
          role: context.seededAuthState.session.user.role,
          permissionCount: context.seededAuthState.authorization.permissions.length
        }
      : null,
    domStatus: null,
    terrainTileModelSnapshot: null,
    tileProcessRuntimeSnapshot: null,
    areaObjectSharedRendererSnapshot: null,
    primitiveFallbackRenderSuppressionSnapshot: null,
    expectedAreaDetailSummary: summarizeExpectedAreaDetail(context.expectedAreaDetail),
    networkCaptureSummary,
    runtimeActionabilitySummary,
    runtimeBlockerSnapshot: {
      version: "aurora-areas-runtime-blocker-snapshot/v1",
      status: "blocked",
      firstBlocker: blockers[0] ?? null,
      blockers
    },
    blocker: blockers[0] ?? normalizeCaptureError(error),
    captureMethod:
      "chrome-devtools-protocol Page.captureScreenshot plus data-area-terrain-tile-model-runtime-snapshot, data-area-tile-process-runtime-snapshot, shared renderer/placeable, loader, and blocker runtime datasets",
    chromePath: context.chromePath,
    chromeDebugPort: context.port,
    chromeStderrTail: chromeStderr.slice(-1200),
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true
  };
}

function normalizeCaptureErrors(error, strictVisualMode = null) {
  const primary = normalizeCaptureError(error);
  const related = Array.isArray(error?.captureBlocker?.relatedBlockers)
    ? error.captureBlocker.relatedBlockers
    : [];
  const blockers = [
    primary,
    ...related.map((blocker) => ({
      lane: blocker.lane ?? "capture",
      code: blocker.code ?? "capture_related_blocker",
      summary: blocker.summary ?? blocker.message ?? "Related capture blocker.",
      details: blocker.details ?? {}
    }))
  ];
  if (
    strictVisualMode?.requireScreenshot &&
    strictVisualMode.failureClass === "render_screenshot_missing" &&
    !blockers.some((blocker) => blocker.code === "render_screenshot_missing")
  ) {
    blockers.push({
      lane: "capture",
      code: "render_screenshot_missing",
      summary: "Strict visual capture did not produce a fresh _IKEA PNG.",
      details: {
        pngPath: strictVisualMode.screenshot?.path ?? null,
        screenshot: strictVisualMode.screenshot
      }
    });
  }
  return blockers;
}

function normalizeCaptureError(error) {
  const blocker = error?.captureBlocker;
  if (blocker) {
    return {
      lane: "capture",
      code: blocker.code,
      summary: blocker.message,
      details: { ...blocker, message: undefined, code: undefined }
    };
  }
  return {
    lane: "capture",
    code: "capture_failed",
    summary: formatErrorForMessage(error),
    details: {
      cause: serializeError(error)
    }
  };
}

function buildStrictVisualModeSuccess({ requireScreenshot, screenshotEvidence }) {
  return {
    requireScreenshot,
    status: requireScreenshot ? "passed" : "not_required",
    failureClass: null,
    screenshot: screenshotEvidence
  };
}

function buildStrictVisualModeFailure(error, context) {
  const screenshotEvidence = inspectScreenshotEvidence(context.pngPath, context.captureStartedAt);
  const blockerCode = error?.captureBlocker?.code ?? null;
  const failureClass = classifyStrictVisualFailure(blockerCode, screenshotEvidence);
  return {
    requireScreenshot: context.requireScreenshot,
    status: context.requireScreenshot ? "failed" : "not_required",
    failureClass: context.requireScreenshot ? failureClass : null,
    blockerCode,
    screenshot: screenshotEvidence
  };
}

function classifyStrictVisualFailure(blockerCode, screenshotEvidence) {
  if (isRuntimeEnvironmentBlockerCode(blockerCode)) {
    return "runtime_environment_blocked";
  }
  if (blockerCode === "render_screenshot_missing" || !screenshotEvidence.fresh) {
    return "render_screenshot_missing";
  }
  return "capture_blocked_before_strict_screenshot";
}

function isRuntimeEnvironmentBlockerCode(code) {
  return [
    "frontend_unavailable",
    "backend_proxy_unavailable",
    "backend_direct_unavailable",
    "backend_login_failed"
  ].includes(code);
}

function inspectScreenshotEvidence(pngPath, captureStartedAt) {
  try {
    const stats = fs.statSync(pngPath);
    return {
      path: pngPath,
      exists: true,
      bytes: stats.size,
      mtimeMs: Math.round(stats.mtimeMs),
      captureStartedAtMs: captureStartedAt,
      fresh: stats.size > 0 && stats.mtimeMs >= captureStartedAt
    };
  } catch (error) {
    return {
      path: pngPath,
      exists: false,
      bytes: 0,
      mtimeMs: null,
      captureStartedAtMs: captureStartedAt,
      fresh: false,
      cause: serializeError(error)
    };
  }
}

function buildConsoleSummary(frame) {
  const firstBlocker =
    frame.runtimeActionabilitySummary?.firstErrorReason ??
    frame.blocker?.code ??
    frame.runtimeBlockerSnapshot?.firstBlocker?.code ??
    null;
  return {
    version: frame.version,
    status: frame.status,
    capturedAt: frame.capturedAt,
    target: frame.target,
    screenshotPath: frame.screenshotPath,
    screenshotBytes: frame.screenshotBytes,
    framePath: frame.framePath,
    failureFramePath: frame.failureFramePath ?? null,
    preservedCanonicalFramePath: frame.preservedCanonicalFramePath ?? null,
    preservedCanonicalFrame: frame.preservedCanonicalFrame ?? null,
    timings: frame.timings,
    strictVisualMode: frame.strictVisualMode,
    firstBlocker,
    blocker: summarizeBlockerForConsole(
      frame.blocker ?? frame.runtimeBlockerSnapshot?.firstBlocker ?? null
    ),
    runtimeEnvironmentPreflight: summarizeRuntimeEnvironmentPreflight(
      frame.runtimeEnvironmentPreflight
    ),
    expectedAreaDetailSummary: frame.expectedAreaDetailSummary ?? null,
    runtimeActionabilitySummary: summarizeRuntimeActionabilityForConsole(
      frame.runtimeActionabilitySummary
    ),
    canonicalParityPromoted: frame.canonicalParityPromoted,
    localOnlyNotRetailEvidence: frame.localOnlyNotRetailEvidence
  };
}

function summarizeBlockerForConsole(blocker) {
  if (!blocker) {
    return null;
  }
  return {
    lane: blocker.lane ?? null,
    code: blocker.code ?? null,
    summary: blocker.summary ?? null,
    details: summarizeBlockerDetailsForConsole(blocker.details ?? {})
  };
}

function summarizeBlockerDetailsForConsole(details) {
  if (!details || typeof details !== "object") {
    return null;
  }
  return {
    endpoint: details.endpoint ?? null,
    port: details.port ?? null,
    method: details.method ?? null,
    status: details.status ?? null,
    elapsedMs: details.elapsedMs ?? null,
    timeoutMs: details.timeoutMs ?? null,
    failureKind: details.failureKind ?? null,
    selector: details.selector ?? null,
    query: details.query ?? null,
    expectedArea: summarizeAreaForConsole(details.expectedArea),
    openedArea: summarizeOpenedAreaForConsole(details.openedArea),
    lastStatus: summarizeDomStatusForConsole(details.lastStatus),
    cause: details.cause ?? null,
    networkCaptureSummary: summarizeNetworkCaptureCountsForConsole(
      details.networkCaptureSummary
    )
  };
}

function summarizeRuntimeActionabilityForConsole(summary) {
  if (!summary) {
    return null;
  }
  return {
    version: summary.version ?? null,
    status: summary.status ?? null,
    firstErrorReason: summary.firstErrorReason ?? null,
    sharedRenderer: summary.sharedRenderer
      ? {
          status: summary.sharedRenderer.status ?? null,
          total: summary.sharedRenderer.total ?? null,
          missingPayloadCount: summary.sharedRenderer.missingPayloadCount ?? null,
          payloadBoundCount: summary.sharedRenderer.payloadBoundCount ?? null,
          renderedModelUrlCount:
            summary.sharedRenderer.renderedModelUrlCount ??
            summary.sharedRenderer.modelReadyCount ??
            null,
          primitiveFallbackCount: summary.sharedRenderer.primitiveFallbackCount ?? null,
          primitiveFallbackSuppressedCount:
            summary.sharedRenderer.primitiveFallbackSuppressedCount ?? null,
          backendRenderPayloadReadyCount:
            summary.sharedRenderer.backendRenderPayloadReadyCount ?? null,
          backendRenderModelUrlReadyCount:
            summary.sharedRenderer.backendRenderModelUrlReadyCount ?? null
        }
      : null,
    queue: summary.queue ?? null,
    queueRequestCounts: summary.queueRequestCounts ?? null,
    payloadResponseCounts: summary.payloadResponseCounts ?? null,
    firstMissingObjects: Array.isArray(summary.firstMissingObjects)
      ? summary.firstMissingObjects.slice(0, 5)
      : [],
    network: summarizeNetworkCaptureSummaryForConsole(summary.network)
  };
}

function summarizeNetworkCaptureSummaryForConsole(summary) {
  if (!summary) {
    return null;
  }
  return {
    version: summary.version ?? null,
    observedRequestCount: summary.observedRequestCount ?? null,
    firstErrorReason: summary.firstErrorReason ?? null,
    groups: {
      placeableProcessBatch: summarizeNetworkGroupForConsole(
        summary.groups?.placeableProcessBatch
      ),
      placeableAssetContractsBatch: summarizeNetworkGroupForConsole(
        summary.groups?.placeableAssetContractsBatch
      )
    }
  };
}

function summarizeNetworkCaptureCountsForConsole(summary) {
  if (!summary) {
    return null;
  }
  return {
    observedRequestCount: summary.observedRequestCount ?? null,
    firstErrorReason: summary.firstErrorReason ?? null,
    groups: {
      placeableProcessBatch: summarizeNetworkGroupCountsForConsole(
        summary.groups?.placeableProcessBatch
      ),
      placeableAssetContractsBatch: summarizeNetworkGroupCountsForConsole(
        summary.groups?.placeableAssetContractsBatch
      )
    }
  };
}

function summarizeNetworkGroupCountsForConsole(group) {
  if (!group) {
    return null;
  }
  return {
    requestCount: group.requestCount ?? 0,
    requestedItemCount: group.requestedItemCount ?? 0,
    responseCount: group.responseCount ?? 0,
    failedRequestCount: group.failedRequestCount ?? 0,
    inFlightRequestCount: group.inFlightRequestCount ?? 0,
    inFlightRequestedItemCount: group.inFlightRequestedItemCount ?? 0,
    oldestInFlightAgeMs: group.oldestInFlightAgeMs ?? null
  };
}

function summarizeNetworkGroupForConsole(group) {
  if (!group) {
    return null;
  }
  return {
    requestCount: group.requestCount ?? 0,
    requestedItemCount: group.requestedItemCount ?? 0,
    responseCount: group.responseCount ?? 0,
    responseStatusCounts: group.responseStatusCounts ?? {},
    responseItemCount: group.responseItemCount ?? 0,
    failedRequestCount: group.failedRequestCount ?? 0,
    inFlightRequestCount: group.inFlightRequestCount ?? 0,
    inFlightRequestedItemCount: group.inFlightRequestedItemCount ?? 0,
    oldestInFlightAgeMs: group.oldestInFlightAgeMs ?? null,
    responsePayloadCounts: group.responsePayloadCounts ?? null,
    requestItemSample: Array.isArray(group.requestItemSample)
      ? group.requestItemSample.slice(0, DEFAULT_NETWORK_REQUEST_ITEM_SAMPLE_LIMIT)
      : []
  };
}

function summarizeAreaForConsole(area) {
  if (!area) {
    return null;
  }
  return {
    areaId: area.areaId ?? null,
    name: area.name ?? null,
    width: area.width ?? null,
    height: area.height ?? null,
    objectCounts: area.objectCounts ?? null,
    updatedAt: area.updatedAt ?? null
  };
}

function summarizeOpenedAreaForConsole(openedArea) {
  if (!openedArea) {
    return null;
  }
  return {
    ok: openedArea.ok ?? null,
    areaText: openedArea.areaText ?? null,
    rowTitle: openedArea.rowInfo?.title ?? null,
    areaExpectation: openedArea.areaExpectation ?? null,
    query: openedArea.query ?? null,
    runtimeDatasetCleared: openedArea.runtimeDatasetCleared ?? null
  };
}

function summarizeDomStatusForConsole(status) {
  if (!status) {
    return null;
  }
  return {
    href: status.href ?? null,
    routePath: status.routePath ?? null,
    canvasPresent: status.canvasPresent ?? null,
    canvasRect: status.canvasRect ?? null,
    externalSceneSeedDataset: status.externalSceneSeedDataset ?? null,
    canvasSceneDataset: status.canvasSceneDataset ?? null,
    areaTerrainAreaId: status.areaTerrainAreaId ?? null,
    areaTerrainExtentFootprintSize: status.areaTerrainExtentFootprintSize ?? null,
    terrainRuntimeStatus: status.terrainRuntimeStatus ?? null,
    tileProcessRuntimeStatus: status.tileProcessRuntimeStatus ?? null,
    visualBlockers: Array.isArray(status.visualBlockers)
      ? status.visualBlockers.slice(0, 4)
      : null,
    runtimeFreshness: status.runtimeFreshness
      ? {
          ok: status.runtimeFreshness.ok,
          expectedAreaId: status.runtimeFreshness.expectedAreaId,
          failed: status.runtimeFreshness.failed
        }
      : null,
    terrainTileModelDataset: summarizeTerrainDatasetForConsole(
      status.terrainTileModelDataset
    ),
    tileProcessRuntimeDataset: summarizeTileProcessDatasetForConsole(
      status.tileProcessRuntimeDataset
    ),
    areaObjectRuntimeDataset: summarizeAreaObjectDatasetForConsole(
      status.areaObjectRuntimeDataset
    ),
    placeableModelLoadQueueDataset: summarizePlaceableModelLoadQueueDatasetForConsole(
      status.placeableModelLoadQueueDataset
    ),
    captureWaitElapsedMs: status.captureWaitElapsedMs ?? null
  };
}

function summarizeTerrainDatasetForConsole(dataset) {
  if (!dataset) {
    return null;
  }
  return {
    loaderPath: dataset.loaderPath ?? null,
    areaId: dataset.areaId ?? null,
    extentFootprintSize: dataset.extentFootprintSize ?? null,
    contractTileCount: dataset.contractTileCount ?? null,
    pendingCount: dataset.pendingCount ?? null,
    loadedCount: dataset.loadedCount ?? null,
    failedCount: dataset.failedCount ?? null,
    blockedCount: dataset.blockedCount ?? null,
    blockedTileSample: dataset.blockedTileSample ?? null,
    loaderErrorSample: dataset.loaderErrorSample ?? null
  };
}

function summarizeTileProcessDatasetForConsole(dataset) {
  if (!dataset) {
    return null;
  }
  return {
    areaId: dataset.areaId ?? null,
    checkedCount: dataset.checkedCount ?? null,
    readyCount: dataset.readyCount ?? null,
    blockedCount: dataset.blockedCount ?? null,
    blockers: dataset.blockers ?? null,
    renderAssetContractBlockers: dataset.renderAssetContractBlockers ?? null
  };
}

function summarizeAreaObjectDatasetForConsole(dataset) {
  if (!dataset) {
    return null;
  }
  return {
    source: dataset.source ?? null,
    sourceStatus: dataset.sourceStatus ?? null,
    visibleCount: dataset.visibleCount ?? null,
    auroraGitCount: dataset.auroraGitCount ?? null,
    fallbackCount: dataset.fallbackCount ?? null,
    placeableCount: dataset.placeableCount ?? null,
    doorCount: dataset.doorCount ?? null,
    backendRenderContractStatus: dataset.backendRenderContractStatus ?? null,
    backendRenderContractTotal: dataset.backendRenderContractTotal ?? null,
    backendRenderPayloadReadyCount: dataset.backendRenderPayloadReadyCount ?? null,
    backendRenderModelUrlReadyCount: dataset.backendRenderModelUrlReadyCount ?? null,
    backendRenderBlockedCount: dataset.backendRenderBlockedCount ?? null,
    sharedRendererStatus: dataset.sharedRendererStatus ?? null,
    sharedRendererPayloadBoundCount: dataset.sharedRendererPayloadBoundCount ?? null,
    sharedRendererModelReadyCount: dataset.sharedRendererModelReadyCount ?? null,
    sharedRendererUniqueModelUrlCount:
      dataset.sharedRendererUniqueModelUrlCount ?? null,
    sharedRendererUniqueModelCacheKeyCount:
      dataset.sharedRendererUniqueModelCacheKeyCount ?? null,
    sharedRendererPrimitiveFallbackCount:
      dataset.sharedRendererPrimitiveFallbackCount ?? null,
    sharedRendererPrimitiveFallbackSuppressedCount:
      dataset.sharedRendererPrimitiveFallbackSuppressedCount ?? null,
    sharedRendererMissingPayloadCount: splitRuntimeIdList(
      dataset.sharedRendererMissingPayloadIds
    ).length
  };
}

function summarizePlaceableModelLoadQueueDatasetForConsole(dataset) {
  if (!dataset) {
    return null;
  }
  return {
    concurrencyLimit: dataset.concurrencyLimit ?? null,
    startsPerFrameLimit: dataset.startsPerFrameLimit ?? null,
    activeCount: dataset.activeCount ?? null,
    pendingCount: dataset.pendingCount ?? null,
    completedCount: dataset.completedCount ?? null,
    totalCount: dataset.totalCount ?? null,
    current: dataset.current ?? null
  };
}

function summarizeRuntimeEnvironmentPreflight(preflight) {
  if (!preflight) {
    return null;
  }
  return {
    status: preflight.status,
    frontend: Array.isArray(preflight.frontend)
      ? preflight.frontend.map(summarizeEndpointProbe)
      : null,
    backendProxyHealth: summarizeEndpointProbe(preflight.backendProxyHealth),
    backendDirectHealth: summarizeEndpointProbe(preflight.backendDirectHealth)
  };
}

function summarizeEndpointProbe(probe) {
  if (!probe) {
    return null;
  }
  return {
    ok: Boolean(probe.ok),
    label: probe.label ?? null,
    endpoint: probe.endpoint ?? null,
    port: probe.port ?? null,
    method: probe.method ?? null,
    elapsedMs: probe.elapsedMs ?? null,
    status: probe.status ?? null,
    cause: probe.cause ?? null,
    parseError: probe.parseError ?? null
  };
}

function buildRuntimeActionabilitySummary({
  domStatus,
  expectedAreaDetail,
  networkCaptureSummary,
  sampleLimit
}) {
  if (!domStatus) {
    return null;
  }
  const limit = normalizeSampleLimit(sampleLimit);
  const sharedRenderer = buildSharedRendererActionabilitySummary(domStatus, limit);
  const queue = parseQueueOverlaySummary(domStatus.visualBlockers);
  const modelLoadQueue = buildModelLoadQueueActionabilitySummary(domStatus);
  const firstMissingObjects = resolveFirstMissingObjects({
    ids: sharedRenderer.missingPayloadIdsSample,
    expectedAreaDetail,
    sampleLimit: limit
  });
  const areaObjectCounts = buildAreaObjectSourceCounts(expectedAreaDetail);
  const queueRequestCounts = buildQueueRequestCounts(queue, networkCaptureSummary);
  const payloadResponseCounts = buildPayloadResponseCounts(networkCaptureSummary);
  const firstErrorReason = resolveActionabilityFirstErrorReason({
    sharedRenderer,
    queue,
    networkCaptureSummary
  });
  return {
    version: "aurora-areas-runtime-actionability-summary/v1",
    status: sharedRenderer.missingPayloadCount > 0 ? "blocked" : sharedRenderer.status,
    sampleLimit: limit,
    sharedRenderer,
    areaObjectCounts,
    firstMissingObjects,
    queue,
    modelLoadQueue,
    queueRequestCounts,
    payloadResponseCounts,
    firstErrorReason,
    network: networkCaptureSummary
  };
}

function buildSharedRendererActionabilitySummary(domStatus, sampleLimit) {
  const snapshot = domStatus.areaObjectSharedRendererSnapshot ?? {};
  const dataset = domStatus.areaObjectRuntimeDataset ?? {};
  const missingPayloadIds = firstNonEmptyIdList(
    snapshot.missingPayloadIds,
    dataset.sharedRendererMissingPayloadIds
  );
  const blockedIds = firstNonEmptyIdList(
    snapshot.blockedIds,
    dataset.backendRenderBlockedIds
  );
  const primitiveFallbackIds = firstNonEmptyIdList(
    snapshot.primitiveFallbackIds,
    dataset.primitiveFallbackIds
  );
  return {
    version: snapshot.version ?? null,
    path: snapshot.path ?? dataset.sharedRendererPath ?? null,
    status: snapshot.status ?? dataset.sharedRendererStatus ?? null,
    placeholderStatus: snapshot.placeholderStatus ?? null,
    total: numberOrNull(snapshot.total ?? dataset.backendRenderContractTotal ?? dataset.visibleCount),
    backendRenderContractStatus: dataset.backendRenderContractStatus ?? null,
    backendRenderPayloadReadyCount: numberOrNull(dataset.backendRenderPayloadReadyCount),
    backendRenderModelUrlReadyCount: numberOrNull(dataset.backendRenderModelUrlReadyCount),
    renderedModelUrlCount: numberOrNull(
      dataset.backendRenderModelUrlReadyCount ??
        snapshot.renderedModelUrlCount ??
        snapshot.modelReadyCount ??
        dataset.sharedRendererModelReadyCount
    ),
    backendRenderBlockedCount: numberOrNull(dataset.backendRenderBlockedCount),
    payloadBoundCount: numberOrNull(
      snapshot.payloadBoundCount ?? dataset.sharedRendererPayloadBoundCount
    ),
    modelReadyCount: numberOrNull(snapshot.modelReadyCount ?? dataset.sharedRendererModelReadyCount),
    primitiveFallbackCount: numberOrNull(
      snapshot.primitiveFallbackCount ?? dataset.sharedRendererPrimitiveFallbackCount
    ),
    primitiveFallbackRenderLimit: numberOrNull(
      snapshot.primitiveFallbackRenderLimit ??
        dataset.sharedRendererPrimitiveFallbackRenderLimit
    ),
    primitiveFallbackSuppressedCount: numberOrNull(
      snapshot.primitiveFallbackSuppressedCount ??
        dataset.sharedRendererPrimitiveFallbackSuppressedCount
    ),
    missingPayloadCount: missingPayloadIds.length,
    blockedCount: blockedIds.length,
    primitiveFallbackIdCount: primitiveFallbackIds.length,
    placeholderReasonCounts: snapshot.placeholderReasonCounts ?? null,
    missingPayloadIdsSample: missingPayloadIds.slice(0, sampleLimit),
    blockedIdsSample: blockedIds.slice(0, sampleLimit),
    primitiveFallbackIdsSample: primitiveFallbackIds.slice(0, sampleLimit)
  };
}

function buildModelLoadQueueActionabilitySummary(domStatus) {
  const dataset = domStatus.placeableModelLoadQueueDataset ?? {};
  const activeCount = numberOrNull(dataset.activeCount);
  const pendingCount = numberOrNull(dataset.pendingCount);
  const completedCount = numberOrNull(dataset.completedCount);
  const totalCount = numberOrNull(dataset.totalCount);
  const isLoading =
    countOrZero(activeCount) + countOrZero(pendingCount) > 0 ||
    (totalCount !== null && completedCount !== null && completedCount < totalCount);
  return {
    status: isLoading ? "loading" : "settled",
    concurrencyLimit: numberOrNull(dataset.concurrencyLimit),
    startsPerFrameLimit: numberOrNull(dataset.startsPerFrameLimit),
    peakConcurrencyLimit: numberOrNull(dataset.peakConcurrencyLimit),
    peakStartsPerFrameLimit: numberOrNull(dataset.peakStartsPerFrameLimit),
    peakActiveCount: numberOrNull(dataset.peakActiveCount),
    peakPendingCount: numberOrNull(dataset.peakPendingCount),
    peakTotalCount: numberOrNull(dataset.peakTotalCount),
    bulkModeActivated: dataset.bulkModeActivated ?? null,
    activeCount,
    pendingCount,
    completedCount,
    totalCount,
    current: dataset.current ?? null
  };
}

function resolveFirstMissingObjects({ ids, expectedAreaDetail, sampleLimit }) {
  const objectById = createAreaObjectIndex(expectedAreaDetail);
  return ids.slice(0, sampleLimit).map((objectId, index) => {
    const object = objectById.get(objectId);
    const inferred = inferObjectFactsFromObjectId(objectId);
    return {
      index,
      objectId,
      resRef: object?.resRef ?? inferred.resRef,
      resRefSource: object?.resRef ? "backend_area_detail" : inferred.resRefSource,
      templateId: object?.templateId ?? inferred.templateId,
      kind: object?.kind ?? inferred.kind,
      appearanceType: object?.appearanceType ?? null,
      genericType: object?.genericType ?? null,
      x: numberOrNull(object?.x),
      y: numberOrNull(object?.y),
      z: numberOrNull(object?.z),
      bearing: numberOrNull(object?.bearing)
    };
  });
}

function createAreaObjectIndex(expectedAreaDetail) {
  const objects = Array.isArray(expectedAreaDetail?.objects) ? expectedAreaDetail.objects : [];
  return new Map(
    objects
      .filter((object) => object?.objectId)
      .map((object) => [object.objectId, object])
  );
}

function summarizeExpectedAreaDetail(expectedAreaDetail) {
  if (!expectedAreaDetail) {
    return null;
  }
  return {
    status: expectedAreaDetail.status ?? null,
    endpoint: expectedAreaDetail.endpoint ?? null,
    areaId: expectedAreaDetail.areaId ?? null,
    name: expectedAreaDetail.name ?? null,
    objectCount: expectedAreaDetail.objectCount ?? null,
    blocker: expectedAreaDetail.blocker ?? null
  };
}

function buildAreaObjectSourceCounts(expectedAreaDetail) {
  const objects = Array.isArray(expectedAreaDetail?.objects) ? expectedAreaDetail.objects : [];
  const kindCounts = {};
  let userResRefLikeCount = 0;
  for (const object of objects) {
    const kind = object?.kind ?? "unknown";
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
    if (isUserLikeRuntimeIdentifier(object?.resRef, object?.templateId, object?.objectId)) {
      userResRefLikeCount += 1;
    }
  }
  return {
    source: expectedAreaDetail?.status ?? null,
    total: objects.length,
    kindCounts,
    userResRefLikeCount
  };
}

function parseQueueOverlaySummary(visualBlockers) {
  const blockers = Array.isArray(visualBlockers) ? visualBlockers : [];
  for (const blocker of blockers) {
    const text = String(blocker?.text ?? "");
    const match = text.match(/Loading\s+Area\s+PLC\/DOR\s+render\s+payloads\s*(\d+)\s*\/\s*(\d+)/iu);
    if (match) {
      const loaded = Number(match[1]);
      const total = Number(match[2]);
      return {
        source: blocker.selector ?? "visual_blocker",
        status: loaded >= total ? "complete" : "in_progress",
        loaded,
        total,
        remaining: Math.max(0, total - loaded),
        text: text.slice(0, 220)
      };
    }
  }
  return null;
}

function buildQueueRequestCounts(queue, networkCaptureSummary) {
  const groups = networkCaptureSummary?.groups ?? {};
  return {
    overlayLoaded: queue?.loaded ?? null,
    overlayTotal: queue?.total ?? null,
    overlayRemaining: queue?.remaining ?? null,
    placeableProcessBatchRequests: groups.placeableProcessBatch?.requestCount ?? 0,
    placeableProcessBatchRequestedItems:
      groups.placeableProcessBatch?.requestedItemCount ?? 0,
    placeableProcessBatchInFlightRequests:
      groups.placeableProcessBatch?.inFlightRequestCount ?? 0,
    placeableProcessBatchInFlightRequestedItems:
      groups.placeableProcessBatch?.inFlightRequestedItemCount ?? 0,
    placeableProcessBatchOldestInFlightAgeMs:
      groups.placeableProcessBatch?.oldestInFlightAgeMs ?? null,
    placeableAssetContractsBatchRequests:
      groups.placeableAssetContractsBatch?.requestCount ?? 0,
    placeableAssetContractsBatchRequestedItems:
      groups.placeableAssetContractsBatch?.requestedItemCount ?? 0,
    placeableAssetContractsBatchInFlightRequests:
      groups.placeableAssetContractsBatch?.inFlightRequestCount ?? 0,
    placeableAssetContractsBatchInFlightRequestedItems:
      groups.placeableAssetContractsBatch?.inFlightRequestedItemCount ?? 0,
    placeableAssetContractsBatchOldestInFlightAgeMs:
      groups.placeableAssetContractsBatch?.oldestInFlightAgeMs ?? null
  };
}

function buildPayloadResponseCounts(networkCaptureSummary) {
  const groups = networkCaptureSummary?.groups ?? {};
  const processPayloadCounts = groups.placeableProcessBatch?.responsePayloadCounts ?? {};
  return {
    placeableProcessBatchResponses: groups.placeableProcessBatch?.responseCount ?? 0,
    placeableProcessBatchResponseItems:
      groups.placeableProcessBatch?.responseItemCount ?? 0,
    placeableProcessBatchFailedRequests:
      groups.placeableProcessBatch?.failedRequestCount ?? 0,
    unsupportedCount: processPayloadCounts.renderPackageStatusCounts?.unsupported ?? 0,
    userResRefLikeCount: processPayloadCounts.userResRefLikeCount ?? 0,
    missingDerivedCount:
      processPayloadCounts.renderPackageStatusCounts?.missing_derived ?? 0,
    renderedModelUrlCount: processPayloadCounts.renderedModelUrlCount ?? 0,
    renderPackageStatusCounts: processPayloadCounts.renderPackageStatusCounts ?? {},
    placeableAssetContractsBatchResponses:
      groups.placeableAssetContractsBatch?.responseCount ?? 0,
    placeableAssetContractsBatchResponseItems:
      groups.placeableAssetContractsBatch?.responseItemCount ?? 0,
    placeableAssetContractsBatchFailedRequests:
      groups.placeableAssetContractsBatch?.failedRequestCount ?? 0
  };
}

function resolveActionabilityFirstErrorReason({
  sharedRenderer,
  queue,
  networkCaptureSummary
}) {
  if (networkCaptureSummary?.firstErrorReason) {
    return networkCaptureSummary.firstErrorReason;
  }
  if (queue && queue.remaining > 0) {
    return {
      code: "render_payload_queue_in_progress",
      summary: `Area PLC/DOR payload queue observed ${queue.loaded}/${queue.total}.`
    };
  }
  if (
    sharedRenderer.missingPayloadCount > 0 &&
    (networkCaptureSummary?.observedRequestCount ?? 0) === 0
  ) {
    return {
      code: "no_placeable_payload_requests_observed",
      summary: "Shared renderer is missing payloads, but CDP did not observe placeable payload requests."
    };
  }
  if (
    sharedRenderer.missingPayloadCount > 0 &&
    sharedRenderer.payloadBoundCount === 0
  ) {
    return {
      code: "payload_responses_not_bound_to_scene_objects",
      summary: "Placeable payload activity was observed, but no payloads are bound to shared renderer objects."
    };
  }
  return null;
}

function createNetworkCapture() {
  return {
    requests: new Map(),
    order: []
  };
}

function recordNetworkEvent(networkCapture, message) {
  if (!message?.method?.startsWith("Network.")) {
    return;
  }
  const params = message.params ?? {};
  if (message.method === "Network.requestWillBeSent") {
    const request = params.request ?? {};
    const classification = classifyNetworkRequest(request.url);
    if (!classification) {
      return;
    }
    const postDataSummary = summarizeRequestPostData(request.postData);
    const entry = {
      requestId: params.requestId,
      group: classification.group,
      label: classification.label,
      url: request.url,
      method: request.method ?? null,
      startedTimestamp: params.timestamp ?? null,
      startedAtMs: Date.now(),
      postDataPayloadKeys: postDataSummary.payloadKeys,
      postDataItemCount: postDataSummary.itemCount,
      postDataItemSample: postDataSummary.itemSample,
      postDataItemSampleLimit: postDataSummary.sampleLimit,
      postDataParseError: postDataSummary.error,
      status: null,
      statusText: null,
      responseTimestamp: null,
      finishedTimestamp: null,
      failedTimestamp: null,
      encodedDataLength: null,
      responseItemCount: null,
      responsePayloadCounts: null,
      firstErrorReason: null,
      bodyParseError: null,
      responseBodyBytes: null,
      loadingFailure: null
    };
    networkCapture.requests.set(params.requestId, entry);
    networkCapture.order.push(entry);
    return;
  }

  const entry = networkCapture.requests.get(params.requestId);
  if (!entry) {
    return;
  }
  if (message.method === "Network.responseReceived") {
    entry.status = params.response?.status ?? null;
    entry.statusText = params.response?.statusText ?? null;
    entry.responseTimestamp = params.timestamp ?? null;
    entry.mimeType = params.response?.mimeType ?? null;
    return;
  }
  if (message.method === "Network.loadingFinished") {
    entry.finishedTimestamp = params.timestamp ?? null;
    entry.encodedDataLength = params.encodedDataLength ?? null;
    return;
  }
  if (message.method === "Network.loadingFailed") {
    entry.failedTimestamp = params.timestamp ?? null;
    entry.loadingFailure = {
      errorText: params.errorText ?? null,
      canceled: params.canceled ?? null,
      blockedReason: params.blockedReason ?? null
    };
  }
}

async function hydrateNetworkResponseBodies(send, networkCapture) {
  for (const entry of networkCapture.order) {
    if (!entry.responseTimestamp || entry.loadingFailure) {
      continue;
    }
    try {
      const responseBody = await send("Network.getResponseBody", {
        requestId: entry.requestId
      });
      const text = responseBody.base64Encoded
        ? Buffer.from(responseBody.body ?? "", "base64").toString("utf8")
        : String(responseBody.body ?? "");
      entry.responseBodyBytes = Buffer.byteLength(text, "utf8");
      if (!text) {
        continue;
      }
      try {
        const payload = JSON.parse(text);
        entry.responseItemCount = extractResponseItemCount(payload);
        entry.responsePayloadCounts = extractResponsePayloadCounts(payload);
        entry.firstErrorReason = extractFirstPayloadError(payload);
      } catch (error) {
        entry.bodyParseError = formatErrorForMessage(error);
      }
    } catch (error) {
      entry.bodyParseError = formatErrorForMessage(error);
    }
  }
}

async function enrichCaptureErrorWithNetwork(error, send, networkCapture) {
  try {
    await hydrateNetworkResponseBodies(send, networkCapture);
    const networkCaptureSummary = buildNetworkCaptureSummary(networkCapture);
    if (error?.captureBlocker) {
      error.captureBlocker.networkCaptureSummary = networkCaptureSummary;
    }
  } catch (networkError) {
    if (error?.captureBlocker) {
      error.captureBlocker.networkCaptureSummary = {
        version: "aurora-areas-cdp-network-capture-summary/v1",
        observedRequestCount: networkCapture.order.length,
        groups: null,
        firstErrorReason: {
          code: "network_capture_summary_failed",
          summary: formatErrorForMessage(networkError)
        }
      };
    }
  }
}

function buildNetworkCaptureSummary(networkCapture) {
  const summaryCreatedAtMs = Date.now();
  const groups = {
    placeableProcessBatch: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "placeableProcessBatch"),
      summaryCreatedAtMs
    ),
    placeableAssetContractsBatch: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "placeableAssetContractsBatch"),
      summaryCreatedAtMs
    )
  };
  return {
    version: "aurora-areas-cdp-network-capture-summary/v1",
    summaryCreatedAtMs,
    observedRequestCount: networkCapture.order.length,
    groups,
    firstErrorReason:
      groups.placeableProcessBatch.firstErrorReason ??
      groups.placeableAssetContractsBatch.firstErrorReason ??
      null
  };
}

function summarizeNetworkGroup(entries, summaryCreatedAtMs) {
  const responseStatusCounts = {};
  let requestCount = 0;
  let requestedItemCount = 0;
  let responseCount = 0;
  let responseItemCount = 0;
  let failedRequestCount = 0;
  let inFlightRequestCount = 0;
  let inFlightRequestedItemCount = 0;
  let oldestInFlightAgeMs = null;
  let firstErrorReason = null;
  const responsePayloadCounts = createEmptyResponsePayloadCounts();
  const firstRequests = [];
  const requestItemSample = [];

  for (const entry of entries) {
    requestCount += 1;
    requestedItemCount += Number(entry.postDataItemCount ?? 0);
    const inFlight = isNetworkEntryInFlight(entry);
    if (inFlight) {
      const inFlightAgeMs = resolveNetworkInFlightAgeMs(entry, summaryCreatedAtMs);
      inFlightRequestCount += 1;
      inFlightRequestedItemCount += Number(entry.postDataItemCount ?? 0);
      oldestInFlightAgeMs = Math.max(oldestInFlightAgeMs ?? 0, inFlightAgeMs ?? 0);
    }
    if (entry.status !== null && entry.status !== undefined) {
      responseCount += 1;
      responseStatusCounts[String(entry.status)] =
        (responseStatusCounts[String(entry.status)] ?? 0) + 1;
    }
    responseItemCount += Number(entry.responseItemCount ?? 0);
    mergeResponsePayloadCounts(responsePayloadCounts, entry.responsePayloadCounts);
    const entryError = resolveNetworkEntryErrorReason(entry);
    if (entryError) {
      failedRequestCount += 1;
      firstErrorReason = firstErrorReason ?? entryError;
    }
    for (const item of entry.postDataItemSample ?? []) {
      if (requestItemSample.length >= DEFAULT_NETWORK_REQUEST_ITEM_SAMPLE_LIMIT) {
        break;
      }
      requestItemSample.push({
        requestOrdinal: requestCount - 1,
        ...item
      });
    }
    if (firstRequests.length < 4) {
      firstRequests.push({
        url: entry.url,
        method: entry.method,
        status: entry.status,
        requestedItemCount: entry.postDataItemCount,
        requestItemSampleLimit: entry.postDataItemSampleLimit,
        requestItemSample: entry.postDataItemSample,
        postDataPayloadKeys: entry.postDataPayloadKeys,
        postDataParseError: entry.postDataParseError,
        responseItemCount: entry.responseItemCount,
        elapsedMs: resolveNetworkElapsedMs(entry),
        inFlight,
        inFlightAgeMs: inFlight
          ? resolveNetworkInFlightAgeMs(entry, summaryCreatedAtMs)
          : null,
        errorReason: entryError
      });
    }
  }

  return {
    requestCount,
    requestedItemCount,
    responseCount,
    responseStatusCounts,
    responseItemCount,
    responsePayloadCounts,
    failedRequestCount,
    inFlightRequestCount,
    inFlightRequestedItemCount,
    oldestInFlightAgeMs,
    firstErrorReason,
    requestItemSample,
    firstRequests
  };
}

function resolveNetworkEntryErrorReason(entry) {
  if (entry.loadingFailure) {
    return {
      code: "network_loading_failed",
      summary: entry.loadingFailure.errorText ?? "Network loading failed.",
      details: entry.loadingFailure
    };
  }
  if (Number(entry.status ?? 0) >= 400) {
    return {
      code: `http_${entry.status}`,
      summary: `${entry.label} returned HTTP ${entry.status}.`,
      details: {
        url: entry.url,
        status: entry.status,
        statusText: entry.statusText
      }
    };
  }
  if (entry.firstErrorReason) {
    return entry.firstErrorReason;
  }
  if (
    entry.bodyParseError &&
    entry.status !== null &&
    !isCdpInspectorCacheEviction(entry.bodyParseError)
  ) {
    return {
      code: "response_body_parse_failed",
      summary: entry.bodyParseError,
      details: {
        url: entry.url,
        status: entry.status
      }
    };
  }
  return null;
}

function isCdpInspectorCacheEviction(message) {
  return String(message ?? "").includes("Request content was evicted from inspector cache");
}

function isNetworkEntryInFlight(entry) {
  return (
    entry.status === null &&
    !entry.responseTimestamp &&
    !entry.finishedTimestamp &&
    !entry.failedTimestamp &&
    !entry.loadingFailure
  );
}

function resolveNetworkInFlightAgeMs(entry, summaryCreatedAtMs) {
  if (!entry.startedAtMs) {
    return null;
  }
  return Math.max(0, Math.round(summaryCreatedAtMs - entry.startedAtMs));
}

function classifyNetworkRequest(url) {
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = String(url ?? "");
  }
  if (pathname.endsWith("/catalog/placeables/process/batch")) {
    return {
      group: "placeableProcessBatch",
      label: "placeable process batch"
    };
  }
  if (pathname.endsWith("/catalog/placeables/cache/assets/contracts/batch")) {
    return {
      group: "placeableAssetContractsBatch",
      label: "placeable asset contracts batch"
    };
  }
  return null;
}

function summarizeRequestPostData(postData) {
  const parsed = parseRequestItems(postData);
  const items = parsed.items ?? [];
  return {
    payloadKeys: parsed.payloadKeys,
    itemCount: parsed.items ? parsed.items.length : null,
    itemSample: items
      .slice(0, DEFAULT_NETWORK_REQUEST_ITEM_SAMPLE_LIMIT)
      .map((item, index) => summarizeRequestItemForNetworkSample(item, index)),
    sampleLimit: DEFAULT_NETWORK_REQUEST_ITEM_SAMPLE_LIMIT,
    error: parsed.error
  };
}

function summarizeRequestItemForNetworkSample(item, index) {
  if (!item || typeof item !== "object") {
    return {
      index,
      key: null,
      resref: null,
      templateId: null,
      appearanceType: null,
      genericType: null,
      fieldKeys: []
    };
  }
  const key =
    item.key ??
    item.requestKey ??
    item.sceneObjectId ??
    item.objectId ??
    item.sourceInstanceIndexKey ??
    item.cacheKey ??
    item.templateId ??
    item.resref ??
    item.resRef ??
    null;
  return {
    index,
    key: key === null || key === undefined ? null : String(key),
    resref: firstStringValue(item.resref, item.resRef, item.templateResRef),
    templateId: firstStringValue(item.templateId, item.templateID),
    appearanceType: numberOrNull(item.appearanceType),
    genericType: numberOrNull(item.genericType),
    subtypeHint: firstStringValue(item.subtypeHint, item.placeableSubtype, item.objectKind, item.kind),
    fieldKeys: Object.keys(item).slice(0, 16)
  };
}

function countRequestItemsFromPostData(postData) {
  const parsed = parseRequestItems(postData);
  return parsed.items ? parsed.items.length : null;
}

function parseRequestItemsError(postData) {
  const parsed = parseRequestItems(postData);
  return parsed.error;
}

function parseRequestItems(postData) {
  if (!postData) {
    return { items: null, payloadKeys: [], error: null };
  }
  try {
    const payload = JSON.parse(postData);
    return {
      payloadKeys: payload && typeof payload === "object" ? Object.keys(payload).slice(0, 16) : [],
      items: Array.isArray(payload?.items) ? payload.items : null,
      error: null
    };
  } catch (error) {
    return {
      items: null,
      payloadKeys: [],
      error: formatErrorForMessage(error)
    };
  }
}

function extractResponseItemCount(payload) {
  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items.length;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items.length;
  }
  return null;
}

function extractResponsePayloadCounts(payload) {
  const counts = createEmptyResponsePayloadCounts();
  const items = Array.isArray(payload?.data?.items)
    ? payload.data.items
    : Array.isArray(payload?.items)
      ? payload.items
      : [];
  for (const item of items) {
    const placeable = item?.placeable ?? item;
    const renderPackage = placeable?.renderPackage ?? null;
    const status = renderPackage?.status ?? null;
    if (status) {
      counts.renderPackageStatusCounts[status] =
        (counts.renderPackageStatusCounts[status] ?? 0) + 1;
    }
    if (renderPackage?.modelUrl || renderPackage?.glbUrl) {
      counts.renderedModelUrlCount += 1;
    }
    if ((renderPackage?.assetRefs?.derivedModelAssetIds?.length ?? 0) > 0) {
      counts.derivedModelAssetRefCount += 1;
    }
    if (isUserLikeRuntimeIdentifier(
      placeable?.resref,
      placeable?.templateId,
      placeable?.name,
      placeable?.category
    )) {
      counts.userResRefLikeCount += 1;
    }
    for (const diagnostic of renderPackage?.diagnostics ?? []) {
      const code = diagnostic?.code ?? "unknown";
      counts.renderPackageDiagnosticCodeCounts[code] =
        (counts.renderPackageDiagnosticCodeCounts[code] ?? 0) + 1;
    }
  }
  return counts;
}

function createEmptyResponsePayloadCounts() {
  return {
    renderPackageStatusCounts: {},
    renderedModelUrlCount: 0,
    derivedModelAssetRefCount: 0,
    userResRefLikeCount: 0,
    renderPackageDiagnosticCodeCounts: {}
  };
}

function mergeResponsePayloadCounts(target, source) {
  if (!source) {
    return target;
  }
  target.renderedModelUrlCount += Number(source.renderedModelUrlCount ?? 0);
  target.derivedModelAssetRefCount += Number(source.derivedModelAssetRefCount ?? 0);
  target.userResRefLikeCount += Number(source.userResRefLikeCount ?? 0);
  mergeCountMap(target.renderPackageStatusCounts, source.renderPackageStatusCounts);
  mergeCountMap(
    target.renderPackageDiagnosticCodeCounts,
    source.renderPackageDiagnosticCodeCounts
  );
  return target;
}

function mergeCountMap(target, source) {
  for (const [key, value] of Object.entries(source ?? {})) {
    target[key] = (target[key] ?? 0) + Number(value ?? 0);
  }
}

function extractFirstPayloadError(payload) {
  const directCode = payload?.error?.code ?? payload?.code ?? null;
  const directMessage = payload?.error?.message ?? payload?.message ?? null;
  if (directCode || directMessage) {
    return {
      code: directCode ?? "payload_error",
      summary: directMessage ?? directCode,
      details: {
        source: "response_payload"
      }
    };
  }
  const items = Array.isArray(payload?.data?.items)
    ? payload.data.items
    : Array.isArray(payload?.items)
      ? payload.items
      : [];
  const erroredItem = items.find((item) => item?.error || item?.code || item?.message);
  if (erroredItem) {
    return {
      code: erroredItem.error?.code ?? erroredItem.code ?? "payload_item_error",
      summary: erroredItem.error?.message ?? erroredItem.message ?? "Payload item error.",
      details: {
        itemKeys: Object.keys(erroredItem).slice(0, 12)
      }
    };
  }
  return null;
}

function resolveNetworkElapsedMs(entry) {
  const end = entry.finishedTimestamp ?? entry.responseTimestamp ?? entry.failedTimestamp;
  if (entry.startedTimestamp === null || entry.startedTimestamp === undefined || !end) {
    return null;
  }
  return Math.max(0, Math.round((end - entry.startedTimestamp) * 1000));
}

function firstNonEmptyIdList(...values) {
  for (const value of values) {
    const ids = splitRuntimeIdList(value);
    if (ids.length > 0) {
      return ids;
    }
  }
  return [];
}

function splitRuntimeIdList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (value === null || value === undefined) {
    return [];
  }
  const text = String(value).trim();
  if (!text || text === "none") {
    return [];
  }
  return text
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferObjectFactsFromObjectId(objectId) {
  const localId = String(objectId ?? "").split(":").pop() ?? "";
  const withoutObjectPrefix = localId.replace(/^obj_/u, "");
  const withoutOrdinal = withoutObjectPrefix.replace(/_\d+$/u, "");
  const kindPrefix = withoutOrdinal.match(/^(plc|dor|cre|itm|snd)_/u)?.[1] ?? null;
  return {
    templateId: withoutOrdinal || null,
    resRef: withoutOrdinal.replace(/^(plc|dor|cre|itm|snd)_/u, "") || null,
    resRefSource: "inferred_from_object_id",
    kind:
      kindPrefix === "plc"
        ? "placeable"
        : kindPrefix === "dor"
          ? "door"
          : kindPrefix === "cre"
            ? "creature"
            : kindPrefix === "itm"
              ? "item"
              : kindPrefix === "snd"
                ? "sound"
                : null
  };
}

function isUserLikeRuntimeIdentifier(...values) {
  return values
    .filter((value) => value !== null && value !== undefined)
    .some((value) => /(^|[^a-z0-9])user([^a-z0-9]|$)/iu.test(String(value)));
}

function firstStringValue(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function normalizeSampleLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_ACTIONABILITY_SAMPLE_LIMIT;
  }
  return Math.min(50, Math.floor(parsed));
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveUrlPort(value) {
  try {
    const parsed = new URL(value);
    if (parsed.port) {
      return Number(parsed.port);
    }
    return parsed.protocol === "https:" ? 443 : 80;
  } catch {
    return null;
  }
}

function serializeError(error) {
  return {
    name: error?.name ?? null,
    message: error?.message ?? String(error),
    code: error?.code ?? error?.cause?.code ?? null,
    stack: error?.stack?.split("\n").slice(0, 6).join("\n") ?? null,
    cause: error?.cause
      ? {
          name: error.cause.name ?? null,
          message: error.cause.message ?? String(error.cause),
          code: error.cause.code ?? null
        }
      : null
  };
}

function formatErrorForMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
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

function resolveCaptureTargetAreaQuery(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "ikea" || normalized === "_ikea") {
    return "_ikea";
  }
  return normalized;
}

function sanitizeFileStem(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseBooleanOption(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceProcessExits(childProcess, timeoutMs = 5_000) {
  return new Promise((resolve) => {
    if (!childProcess || childProcess.exitCode !== null || childProcess.signalCode !== null) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      try {
        childProcess.kill("SIGKILL");
      } catch {
        // Best effort cleanup; capture failure evidence is more important than hanging here.
      }
      resolve();
    }, timeoutMs);
    childProcess.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function terminateChromeCaptureProcess(childProcess) {
  if (!childProcess || childProcess.exitCode !== null || childProcess.signalCode !== null) {
    return;
  }
  const exitPromise = onceProcessExits(childProcess, 5_000);
  if (process.platform === "win32" && childProcess.pid) {
    spawnSync("taskkill", ["/PID", String(childProcess.pid), "/T", "/F"], {
      stdio: "ignore"
    });
  } else {
    childProcess.kill("SIGTERM");
  }
  await exitPromise;
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
