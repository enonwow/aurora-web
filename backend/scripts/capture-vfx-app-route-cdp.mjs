import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_BASE_URL = "http://127.0.0.1:5173";
const DEFAULT_USERNAME = "builder.user";
const DEFAULT_PASSWORD = "builder123";

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
const profileDir = path.join(outDir, `${fileStem}.chrome-profile`);
const keepProfile = options.keepProfile === "true";
const route = new URL(routePath, baseUrl).toString();
const bootstrapRoute = new URL("/login", baseUrl).toString();
const pngPath = path.join(outDir, `${fileStem}.png`);
const framePath = path.join(outDir, `${fileStem}.frame.json`);

fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const seededAuthState = await createPersistedAuthState({
  authBaseUrl,
  username,
  password
});

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${port}`,
    "--window-size=1440,760",
    `--user-data-dir=${profileDir}`,
    bootstrapRoute
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
    bootstrapRoute,
    pngPath,
    framePath,
    seededAuthState
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  chrome.kill("SIGTERM");
  await onceProcessExits(chrome);
  if (!keepProfile) {
    removeProfileDirBestEffort(profileDir);
  }
}

async function captureFromChrome({ port, route, bootstrapRoute, pngPath, framePath, seededAuthState }) {
  const tab = await waitForTab(port, bootstrapRoute);
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
  const loginReady = await waitForLoginOrApp(send);
  await seedBrowserAuthState(send, seededAuthState);
  await send("Page.navigate", { url: route });
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

  const domStatus = await waitForAppVfxStatus(send);
  if (!domStatus?.ok) {
    throw new Error(
      `App VFX route did not reach ready draw metrics before timeout: ${JSON.stringify(domStatus)}`
    );
  }

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });

  fs.writeFileSync(pngPath, Buffer.from(screenshot.data, "base64"));
  const frame = {
    version: "aurora-vfx-app-route-cdp-capture/v1",
    capturedAt: new Date().toISOString(),
    requestedRoute: route,
    finalRoute: domStatus.href,
    screenshotPath: pngPath,
    screenshotBytes: fs.statSync(pngPath).size,
    framePath,
    loginReady,
    seededAuth: {
      source: authBaseUrl,
      userId: seededAuthState.session.user.id,
      role: seededAuthState.session.user.role,
      permissionCount: seededAuthState.authorization.permissions.length
    },
    entryPointAction: clickMagicMouthDemo
      ? {
          initialRoute: route,
          clickedButtonText: "Magic Mouth Demo",
          finalRoute: domStatus.href
        }
      : null,
    domStatus,
    captureMethod: "chrome-devtools-protocol Page.captureScreenshot plus app workspace VFX draw-metrics dataset capture",
    chromeStderrTail: chromeStderr.slice(-1200),
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true
  };
  fs.writeFileSync(framePath, `${JSON.stringify(frame, null, 2)}\n`);
  ws.close();
  return frame;
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

async function waitForAppVfxStatus(send) {
  let lastStatus = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const status = await readAppVfxStatus(send);
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

async function readAppVfxStatus(send) {
  const status = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const runtime = document.querySelector(".workspace-render-canvas, [aria-label='workspace render canvas'], canvas");
      const canvas = runtime;
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
      return {
        ok:
          window.location.pathname === "/app" &&
          appVfxDrawMetricsStatus === "ready" &&
          appVfxDrawParticlesNumber > 0 &&
          appVfxRenderedVerticesNumber > 0 &&
          textureApplied,
        href: window.location.href,
        routePath: window.location.pathname,
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

function onceProcessExits(process) {
  return new Promise((resolve) => {
    process.once("exit", resolve);
  });
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
