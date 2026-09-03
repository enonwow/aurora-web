import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const frontendRoot = path.join(repoRoot, "frontend");
const backendRoot = path.join(repoRoot, "backend");
const outDir = process.env.ITEM_GENERATOR_CAPTURE_OUT_DIR
  ? path.resolve(repoRoot, process.env.ITEM_GENERATOR_CAPTURE_OUT_DIR)
  : path.join(repoRoot, ".codex-tmp", "item-proof-all", "30-generator-support");
const backendPort = Number(process.env.ITEM_GENERATOR_CAPTURE_BACKEND_PORT ?? 3136);
const frontendPort = Number(process.env.ITEM_GENERATOR_CAPTURE_FRONTEND_PORT ?? 5204);
const cdpPort = Number(process.env.ITEM_GENERATOR_CAPTURE_CDP_PORT ?? 9596);
const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
const frontendBaseUrl = `http://127.0.0.1:${frontendPort}`;
const apiBase = `${backendBaseUrl}/api/v1`;
const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profileDir = path.join(outDir, `chrome-cdp-profile-generator-${Date.now()}`);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

fs.mkdirSync(outDir, { recursive: true });

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function spawnManaged(command, args, options = {}) {
  const child = spawn(command, args, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  child.output = () => ({
    stdout: stdout.slice(-4000),
    stderr: stderr.slice(-4000)
  });
  return child;
}

async function requestJson(method, url, body, headers = {}) {
  const response = await fetch(url, {
    method,
    signal: AbortSignal.timeout(30000),
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`${method} ${url} failed`);
    error.details = { status: response.status, payload };
    throw error;
  }
  return payload;
}

async function getJson(url, headers = {}) {
  return requestJson("GET", url, null, headers);
}

async function postJson(url, body, headers = {}) {
  return requestJson("POST", url, body, headers);
}

async function waitForHttp(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "unknown"}`);
}

async function buildAuthState() {
  const login = await postJson(`${apiBase}/auth/login`, {
    username: "builder.user",
    password: "builder123"
  });
  const token = login.data.session.accessToken;
  const me = await getJson(`${apiBase}/auth/me`, { authorization: `Bearer ${token}` });
  const role = me.data.roles[0];
  return {
    token,
    storage: {
      session: {
        accessToken: token,
        issuedAt: login.data.session.issuedAt,
        expiresAt: login.data.session.expiresAt,
        user: {
          id: me.data.userId,
          username: "builder.user",
          displayName: me.data.displayName,
          role
        }
      },
      authorization: {
        role,
        permissions: me.data.permissions
      }
    }
  };
}

async function waitForCdpPage() {
  const deadline = Date.now() + 30000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const tabs = await getJson(`http://127.0.0.1:${cdpPort}/json/list`);
      const page =
        tabs.find(
          (entry) =>
            entry.type === "page" &&
            entry.webSocketDebuggerUrl &&
            String(entry.url ?? "").startsWith(frontendBaseUrl)
        ) ?? tabs.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
      if (page) {
        return page;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`No CDP page on port ${cdpPort}: ${lastError?.message ?? "timeout"}`);
}

function connectCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let nextId = 1;
    const timeout = setTimeout(() => reject(new Error("CDP websocket open timeout")), 15000);

    ws.addEventListener("open", () => {
      clearTimeout(timeout);
      const send = (method, params = {}, timeoutMs = 30000) => {
        const id = nextId++;
        ws.send(JSON.stringify({ id, method, params }));
        return new Promise((resolveCommand, rejectCommand) => {
          const timer = setTimeout(() => {
            pending.delete(id);
            rejectCommand(new Error(`CDP command timeout: ${method}`));
          }, timeoutMs);
          pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timer, method });
        });
      };
      resolve({ ws, send });
    });

    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data.toString());
      if (!message.id || !pending.has(message.id)) {
        return;
      }
      const entry = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) {
        entry.reject(new Error(`${entry.method} failed: ${message.error.message}`));
      } else {
        entry.resolve(message.result ?? {});
      }
    });
    ws.addEventListener("error", () => reject(new Error("CDP websocket error")));
  });
}

async function evaluate(send, expression, timeoutMs = 30000) {
  const result = await send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    timeoutMs
  );
  if (result.exceptionDetails) {
    throw new Error(`Runtime.evaluate exception: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result?.value;
}

async function waitForExpression(send, expression, timeoutMs = 60000, intervalMs = 250) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    lastValue = await evaluate(send, expression, Math.min(10000, timeoutMs));
    if (lastValue) {
      return lastValue;
    }
    await delay(intervalMs);
  }
  throw new Error(`Timed out waiting for expression: ${expression}; last=${JSON.stringify(lastValue)}`);
}

async function screenshot(send, fileName) {
  const result = await send(
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: false },
    60000
  );
  const outputPath = path.join(outDir, fileName);
  fs.writeFileSync(outputPath, Buffer.from(result.data, "base64"));
  return {
    path: outputPath,
    bytes: fs.statSync(outputPath).size
  };
}

async function stopProcess(child) {
  if (!child || child.killed) {
    return;
  }
  try {
    child.kill("SIGTERM");
  } catch {
    return;
  }
  await delay(500);
  if (!child.killed) {
    try {
      child.kill("SIGKILL");
    } catch {
      // Best effort cleanup.
    }
  }
}

let backend = null;
let frontend = null;
let chrome = null;
let cdp = null;
let chromeStderr = "";

try {
  backend = spawnManaged("node", ["dist/src/main.js"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      PORT: String(backendPort),
      AUTH_REPOSITORY_DRIVER: "memory",
      AURORA_HOST_LOCAL_RUNTIME: "true",
      AURORA_ITEM_GENERATOR_SOURCE_DIRS:
        process.env.AURORA_ITEM_GENERATOR_SOURCE_DIRS ??
        "C:\\Projects\\New Folder\\item-retail-extract\\utg"
    }
  });
  await waitForHttp(`${backendBaseUrl}/api/v1/health`);

  frontend = spawnManaged(
    process.execPath,
    [
      path.join(frontendRoot, "node_modules", "vite", "bin", "vite.js"),
      "--host",
      "127.0.0.1",
      "--port",
      String(frontendPort),
      "--configLoader",
      "runner",
      "--strictPort"
    ],
    {
      cwd: frontendRoot,
      env: {
        ...process.env,
        BACKEND_PROXY_TARGET: backendBaseUrl
      }
    }
  );
  await waitForHttp(`${frontendBaseUrl}/app`);

  const authState = await buildAuthState();
  const endpointProof = await getJson(`${apiBase}/catalog/items/generator-support`, {
    authorization: `Bearer ${authState.token}`
  });

  chrome = spawn(
    chromePath,
    [
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${profileDir}`,
  "--headless=new",
  "--renderer-process-limit=2",
      "--disable-gpu",
      "--disable-gpu-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--use-angle=swiftshader",
      "--disable-background-networking",
      "--disable-extensions",
      "--disable-sync",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1366,768",
      `${frontendBaseUrl}/login`
    ],
    { stdio: ["ignore", "ignore", "pipe"], windowsHide: true }
  );
  chrome.stderr.on("data", (chunk) => {
    chromeStderr += chunk.toString();
  });

  cdp = await connectCdp((await waitForCdpPage()).webSocketDebuggerUrl);
  const { send } = cdp;
  await send("Page.enable", {}, 90000);
  await send("Runtime.enable", {}, 90000);
  await send("Input.setIgnoreInputEvents", { ignore: false });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false
  });
  await send("Page.navigate", { url: `${frontendBaseUrl}/login` }, 30000);
  await waitForExpression(
    send,
    'document.readyState === "complete" || document.readyState === "interactive"',
    30000
  );
  await evaluate(
    send,
    `localStorage.setItem("aurora_web.auth_session.v1", ${JSON.stringify(
      JSON.stringify(authState.storage)
    )}); localStorage.setItem("aurora_web.workspace_mode.v1", "items_mode"); true;`
  );
  await send("Page.navigate", { url: `${frontendBaseUrl}/app?mode=items_mode` }, 30000);
  await waitForExpression(
    send,
    'document.querySelector("[aria-label=\\"item generator support\\"]") !== null',
    60000
  );
  await delay(1000);

  const panelState = await evaluate(
    send,
    `(() => {
      const panel = document.querySelector("[aria-label=\\"item generator support\\"]");
      return {
        text: panel?.textContent?.replace(/\\s+/g, " ").trim() ?? null,
        hasUnsupported: document.body.textContent.includes("Item Generator Unsupported"),
        hasCounts: document.body.textContent.includes("0 GFF / 4 LTR"),
        hasLtrHeader: document.body.textContent.includes("LTR V1.0")
      };
    })()`
  );
  const shot = await screenshot(send, "30-item-generator-support-unsupported-cdp.png");
  assert(panelState.hasUnsupported, "Generator panel did not show unsupported status", panelState);
  assert(panelState.hasLtrHeader, "Generator panel did not show LTR header evidence", panelState);

  const summary = {
    capturedAt: new Date().toISOString(),
    backendBaseUrl,
    frontendBaseUrl,
    endpointProof: endpointProof.data,
    panelState,
    screenshot: shot,
    backendOutput: backend.output(),
    viteOutput: frontend.output(),
    chromeStderrTail: chromeStderr.slice(-2000)
  };
  const summaryPath = path.join(outDir, "30-item-generator-support-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        summaryPath,
        screenshotPath: shot.path,
        status: endpointProof.data.status,
        sourceCount: endpointProof.data.sourceCount,
        gffCandidateCount: endpointProof.data.gffCandidateCount,
        ltrLexiconCount: endpointProof.data.ltrLexiconCount
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error.message,
        details: error.details ?? null,
        backendOutput: backend?.output?.() ?? null,
        viteOutput: frontend?.output?.() ?? null,
        chromeStderrTail: chromeStderr.slice(-2000),
        stack: error.stack
      },
      null,
      2
    )
  );
  process.exitCode = 1;
} finally {
  cdp?.ws?.close();
  await stopProcess(chrome);
  await stopProcess(frontend);
  await stopProcess(backend);
}
