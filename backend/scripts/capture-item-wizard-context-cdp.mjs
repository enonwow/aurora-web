import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const frontendRoot = path.join(repoRoot, "frontend");
const outDir = path.join(repoRoot, ".codex-tmp", "item-proof-all", "26-wizard-context");
const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const backendPort = Number(process.env.ITEM_WIZARD_BACKEND_PORT ?? 3110);
const frontendPort = Number(process.env.ITEM_WIZARD_FRONTEND_PORT ?? 5186);
const cdpPort = Number(process.env.ITEM_WIZARD_CDP_PORT ?? 9564);
const baseUrl = `http://127.0.0.1:${frontendPort}`;
const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
const apiBase = `${backendBaseUrl}/api/v1`;
const profileDir = path.join(outDir, `chrome-profile-${Date.now()}`);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

fs.mkdirSync(outDir, { recursive: true });
const runLogPath = path.join(outDir, "26-item-wizard-context-run.log");
fs.writeFileSync(runLogPath, "");

function log(message, details = undefined) {
  const suffix = details === undefined ? "" : ` ${JSON.stringify(details)}`;
  fs.appendFileSync(runLogPath, `[${new Date().toISOString()}] ${message}${suffix}\n`);
}

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
    const text = chunk.toString();
    stdout += text;
    log(`${path.basename(command)} stdout`, text.trim().slice(0, 1000));
  });
  child.stderr?.on("data", (chunk) => {
    const text = chunk.toString();
    stderr += text;
    log(`${path.basename(command)} stderr`, text.trim().slice(0, 1000));
  });
  child.output = () => ({ stdout, stderr });
  return child;
}

async function waitForHttp(url, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
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

async function requestJson(method, url, body, headers = {}) {
  const signal = AbortSignal.timeout(30000);
  const response = await fetch(url, {
    method,
    signal,
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

async function postJson(url, body, headers = {}) {
  return requestJson("POST", url, body, headers);
}

async function getJson(url, headers = {}) {
  return requestJson("GET", url, null, headers);
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
  };
}

async function waitForCdpPage() {
  const deadline = Date.now() + 30000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const tabs = await getJson(`http://127.0.0.1:${cdpPort}/json/list`);
      const page = tabs.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
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
    ws.addEventListener("error", (event) =>
      reject(new Error(`CDP websocket error: ${event.message ?? "unknown"}`))
    );
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

async function waitForExpression(send, expression, timeoutMs = 30000, intervalMs = 250) {
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
  return { path: outputPath, bytes: fs.statSync(outputPath).size };
}

async function clickByText(send, selector, text) {
  const state = await evaluate(
    send,
    `(() => {
      const el = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
        .find((entry) => entry.textContent?.trim() === ${JSON.stringify(text)});
      if (!el) return "missing";
      if (el.disabled || el.getAttribute("aria-disabled") === "true") return "disabled";
      el.click();
      return "clicked";
    })()`
  );
  assert(state === "clicked", `Element not ready for click: ${selector} ${text}`, { state });
}

async function run() {
  assert(fs.existsSync(chromePath), "Chrome executable missing", { chromePath });
  const backend = spawnManaged(process.execPath, ["dist/src/main.js"], {
    cwd: path.join(repoRoot, "backend"),
    env: {
      ...process.env,
      PORT: String(backendPort),
      AUTH_REPOSITORY_DRIVER: "memory",
      AURORA_HOST_LOCAL_RUNTIME: "true"
    }
  });
  log("started backend", { pid: backend.pid, backendPort });
  const vite = spawnManaged(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
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
  log("started vite", { pid: vite.pid, frontendPort });
  let chrome;
  let cdp;
  try {
    log("waiting for backend");
    await waitForHttp(`${backendBaseUrl}/api/v1/health`);
    log("backend ready");
    log("waiting for frontend");
    await waitForHttp(`${baseUrl}/app`);
    log("frontend ready");
    log("building auth state");
    const authState = await buildAuthState();
    log("auth ready");
    chrome = spawnManaged(chromePath, [
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${profileDir}`,
  "--headless=new",
  "--renderer-process-limit=2",
      "--disable-gpu",
      "--disable-gpu-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--use-angle=swiftshader",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1366,768",
      `${baseUrl}/login`
    ]);
    log("started chrome", { pid: chrome.pid, cdpPort });
    log("connecting cdp");
    cdp = await connectCdp((await waitForCdpPage()).webSocketDebuggerUrl);
    const { send } = cdp;
    log("cdp connected");
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    });

    await send("Page.navigate", { url: `${baseUrl}/login` }, 30000);
    await waitForExpression(
      send,
      `location.origin === ${JSON.stringify(baseUrl)} && (document.readyState === "complete" || document.readyState === "interactive")`,
      30000
    );
    await evaluate(
      send,
      `localStorage.setItem("aurora_web.auth_session.v1", ${JSON.stringify(
        JSON.stringify(authState)
      )}); localStorage.setItem("aurora_web.workspace_mode.v1", "items_mode"); true;`
    );
    log("auth injected");
    await send("Page.navigate", { url: `${baseUrl}/app?mode=items_mode` }, 30000);
    log("navigated app");
    await waitForExpression(
      send,
      'document.querySelector("article[aria-label=\\"items mode section\\"]") !== null && Array.from(document.querySelectorAll("button")).some((button) => button.textContent.trim() === "New Item" && !button.disabled && button.getAttribute("aria-disabled") !== "true")',
      60000
    );
    log("items panel ready");
    await delay(750);
    await clickByText(send, "button", "New Item");
    log("clicked new item");
    await waitForExpression(
      send,
      'document.querySelector("form[aria-label=\\"item creation wizard\\"]") !== null',
      30000
    );
    const selectedArmorBase = await evaluate(
      send,
      `(() => {
        const form = document.querySelector("form[aria-label=\\"item creation wizard\\"]");
        const select = form?.querySelector("select[aria-label=\\"Base Item\\"]");
        const option = Array.from(select?.options ?? []).find((entry) =>
          /\\bArmor\\b/i.test(entry.textContent ?? "")
        );
        if (!select || !option) return null;
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return option.textContent?.replace(/\\s+/g, " ").trim() ?? null;
      })()`
    );
    assert(selectedArmorBase, "Armor base item option was not available");
    log("selected armor base", selectedArmorBase);
    await delay(500);
    await clickByText(send, '[role="tab"]', "Visual");
    await waitForExpression(
      send,
      'document.querySelector("select[aria-label=\\"Armor Mannequin\\"]") !== null && document.querySelector("input[aria-label=\\"Armor Prefix\\"]") !== null',
      30000
    );
    const defaultState = await evaluate(
      send,
      `(() => {
        const form = document.querySelector("form[aria-label=\\"item creation wizard\\"]");
        return {
          baseItem: ${JSON.stringify(selectedArmorBase)},
          mannequin: form.querySelector("select[aria-label=\\"Armor Mannequin\\"]")?.selectedOptions?.[0]?.textContent?.trim() ?? null,
          prefix: form.querySelector("input[aria-label=\\"Armor Prefix\\"]")?.value ?? null,
          gender: form.querySelector("input[aria-label=\\"Armor Gender\\"]")?.value ?? null,
          phenotype: form.querySelector("input[aria-label=\\"Armor Phenotype\\"]")?.value ?? null,
          raceModel: form.querySelector("input[aria-label=\\"Armor Race Model\\"]")?.value ?? null,
          hasTorso: Boolean(form.querySelector("input[aria-label=\\"Torso\\"]")),
          hasRobe: Boolean(form.querySelector("input[aria-label=\\"Robe\\"]"))
        };
      })()`
    );
    const defaultShot = await screenshot(send, "26-item-wizard-armor-context-default.png");
    log("default screenshot", defaultShot);

    const editedState = await evaluate(
      send,
      `(() => {
        const form = document.querySelector("form[aria-label=\\"item creation wizard\\"]");
        const select = form.querySelector("select[aria-label=\\"Armor Mannequin\\"]");
        select.value = "pfh2";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        const setInput = (label, value) => {
          const input = form.querySelector(\`input[aria-label="\${label}"]\`);
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
          setter.call(input, value);
          input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        };
        setInput("Torso", "44");
        setInput("Pelvis", "9");
        setInput("Leather 1", "12");
        return true;
      })()`
    );
    assert(editedState, "Failed to edit armor context draft");
    await waitForExpression(
      send,
      'document.querySelector("input[aria-label=\\"Armor Prefix\\"]")?.value === "pfh2_" && document.querySelector("input[aria-label=\\"Torso\\"]")?.value === "44"',
      30000
    );
    const editedSnapshot = await evaluate(
      send,
      `(() => {
        const form = document.querySelector("form[aria-label=\\"item creation wizard\\"]");
        return {
          mannequin: form.querySelector("select[aria-label=\\"Armor Mannequin\\"]")?.selectedOptions?.[0]?.textContent?.trim() ?? null,
          prefix: form.querySelector("input[aria-label=\\"Armor Prefix\\"]")?.value ?? null,
          gender: form.querySelector("input[aria-label=\\"Armor Gender\\"]")?.value ?? null,
          phenotype: form.querySelector("input[aria-label=\\"Armor Phenotype\\"]")?.value ?? null,
          raceModel: form.querySelector("input[aria-label=\\"Armor Race Model\\"]")?.value ?? null,
          torso: form.querySelector("input[aria-label=\\"Torso\\"]")?.value ?? null,
          pelvis: form.querySelector("input[aria-label=\\"Pelvis\\"]")?.value ?? null,
          leather1: form.querySelector("input[aria-label=\\"Leather 1\\"]")?.value ?? null,
          validation: Array.from(form.querySelectorAll(".items-mode-wizard-validation li"))
            .map((entry) => entry.textContent.replace(/\\s+/g, " ").trim())
        };
      })()`
    );
    const editedShot = await screenshot(send, "27-item-wizard-armor-context-pfh2-edited.png");
    log("edited screenshot", editedShot);

    await clickByText(send, '[role="tab"]', "Finish");
    await waitForExpression(
      send,
      'document.querySelector("form[aria-label=\\"item creation wizard\\"]")?.textContent?.includes("Create Item")',
      30000
    );
    await delay(250);
    const finishShot = await screenshot(send, "28-item-wizard-armor-context-finish.png");
    log("finish screenshot", finishShot);
    const summary = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      selectedArmorBase,
      defaultState,
      editedSnapshot,
      screenshots: [defaultShot, editedShot, finishShot],
      vite: vite.output(),
      backend: backend.output(),
      chrome: chrome.output()
    };
    const summaryPath = path.join(outDir, "26-item-wizard-context-summary.json");
    fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
    log("summary written", { summaryPath });
    console.log(JSON.stringify({ summaryPath, ...summary }, null, 2));
  } finally {
    cdp?.ws?.close();
    chrome?.kill("SIGKILL");
    vite.kill("SIGKILL");
    backend.kill("SIGKILL");
  }
}

run().catch((error) => {
  console.error(error);
  if (error.details) {
    console.error(JSON.stringify(error.details, null, 2));
  }
  process.exitCode = 1;
});
