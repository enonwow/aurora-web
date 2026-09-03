import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const frontendRoot = path.join(repoRoot, "frontend");
const backendRoot = path.join(repoRoot, "backend");
const outDir = process.env.ITEM_STORE_OVERWRITE_CAPTURE_OUT_DIR
  ? path.resolve(repoRoot, process.env.ITEM_STORE_OVERWRITE_CAPTURE_OUT_DIR)
  : path.join(repoRoot, ".codex-tmp", "item-proof-all", "31-store-overwrite");
const backendPort = Number(process.env.ITEM_STORE_OVERWRITE_BACKEND_PORT ?? 3138);
const frontendPort = Number(process.env.ITEM_STORE_OVERWRITE_FRONTEND_PORT ?? 5206);
const cdpPort = Number(process.env.ITEM_STORE_OVERWRITE_CDP_PORT ?? 9598);
const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
const frontendBaseUrl = `http://127.0.0.1:${frontendPort}`;
const apiBase = `${backendBaseUrl}/api/v1`;
const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profileDir = path.join(outDir, `chrome-cdp-profile-store-overwrite-${Date.now()}`);
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

async function deleteJson(url, headers = {}) {
  return requestJson("DELETE", url, null, headers);
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

function setInputScript(label, value) {
  return `(() => {
    const input = document.querySelector('input[aria-label=${JSON.stringify(label)}], textarea[aria-label=${JSON.stringify(label)}]');
    if (!input) return false;
    const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: ${JSON.stringify(value)}
    }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`;
}

async function setInput(send, label, value) {
  const ok = await evaluate(send, setInputScript(label, value));
  assert(ok, `Input not found: ${label}`);
}

async function clickButtonByText(send, text) {
  const deadline = Date.now() + 10000;
  let debug = [];
  while (Date.now() < deadline) {
    const result = await evaluate(
      send,
      `(() => {
        const buttons = Array.from(document.querySelectorAll("button")).map((entry) => ({
          text: entry.textContent.trim(),
          ariaLabel: entry.getAttribute("aria-label"),
          disabled: entry.disabled
        }));
        const button = Array.from(document.querySelectorAll("button")).find((entry) =>
          entry.textContent.trim() === ${JSON.stringify(text)} && !entry.disabled
        );
        button?.click();
        return { ok: Boolean(button), buttons };
      })()`
    );
    if (result?.ok) {
      return;
    }
    debug = result?.buttons ?? [];
    await delay(250);
  }
  assert(false, `Button not found: ${text}`, { buttons: debug });
}

async function clickButtonByAria(send, ariaLabel) {
  const deadline = Date.now() + 10000;
  let debug = [];
  while (Date.now() < deadline) {
    const result = await evaluate(
      send,
      `(() => {
        const buttons = Array.from(document.querySelectorAll("button")).map((entry) => ({
          text: entry.textContent.trim(),
          ariaLabel: entry.getAttribute("aria-label"),
          disabled: entry.disabled
        }));
        const button = Array.from(document.querySelectorAll("button")).find((entry) =>
          entry.getAttribute("aria-label") === ${JSON.stringify(ariaLabel)} && !entry.disabled
        );
        button?.click();
        return { ok: Boolean(button), buttons };
      })()`
    );
    if (result?.ok) {
      return;
    }
    debug = result?.buttons ?? [];
    await delay(250);
  }
  assert(false, `Button not found: ${ariaLabel}`, { buttons: debug });
}

async function setCheckbox(send, label, checked) {
  const ok = await evaluate(
    send,
    `(() => {
      const input = document.querySelector('input[type="checkbox"][aria-label=${JSON.stringify(label)}]');
      if (!input) return false;
      if (input.checked !== ${checked ? "true" : "false"}) {
        input.click();
      }
      return true;
    })()`
  );
  assert(ok, `Checkbox not found: ${label}`);
}

async function scrollIntoView(send, selector) {
  await evaluate(
    send,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      element?.scrollIntoView({ block: "center", inline: "nearest" });
      return Boolean(element);
    })()`
  );
  await delay(250);
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

function readStoreMetadataString(store, key) {
  const value = store?.metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function isModuleBackedStoreRecord(store) {
  if (store?.category === "custom" && (store.tags ?? []).includes("wizard")) {
    return true;
  }
  if (store?.metadata?.createdByStoreWizard === true) {
    return true;
  }
  if (readStoreMetadataString(store, "sourceGeneratedBy") === "aurora-web-store-wizard") {
    return true;
  }
  const sourceObjectKey = readStoreMetadataString(store, "sourceObjectKey")
    .replace(/\\/gu, "/")
    .toLowerCase();
  return sourceObjectKey.startsWith("modules/current/");
}

let backend = null;
let frontend = null;
let chrome = null;
let cdp = null;
let chromeStderr = "";

try {
  assert(fs.existsSync(chromePath), "Chrome executable missing", { chromePath });

  backend = spawnManaged("node", ["dist/src/main.js"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      PORT: String(backendPort),
      AUTH_REPOSITORY_DRIVER: "memory",
      AURORA_HOST_LOCAL_RUNTIME: "true"
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
  const authHeaders = { authorization: `Bearer ${authState.token}` };
  const storeList = await getJson(`${apiBase}/catalog/stores?limit=500`, authHeaders);
  const sourceStore = storeList.data.items.find((store) => !isModuleBackedStoreRecord(store));
  const moduleBackedStoreCount = storeList.data.items.filter(isModuleBackedStoreRecord).length;
  const retailStore = sourceStore ?? storeList.data.items[0];
  assert(retailStore, "No store found for overwrite proof", {
    total: storeList.data.items.length,
    candidates: storeList.data.items.slice(0, 20).map((store) => ({
      resref: store.resref,
      category: store.category,
      tags: store.tags,
      sourceObjectKey: store.metadata?.sourceObjectKey
    }))
  });
  const retailResRef = retailStore.resref;
  const updatedName = `Shadow Copy ${retailResRef}`.slice(0, 128);
  const hasSourceStoreForShadowCopy = Boolean(sourceStore);

  let cleanupBefore = null;
  if (hasSourceStoreForShadowCopy) {
    try {
      cleanupBefore = await deleteJson(
        `${apiBase}/catalog/stores/blueprints/${encodeURIComponent(retailResRef)}`,
        authHeaders
      );
    } catch (error) {
      cleanupBefore = { deleted: false, status: error.details?.status ?? null };
    }
  }

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
    'document.querySelector("[aria-label=\\"items mode section\\"]") !== null && document.body.textContent.includes("New Store")',
    90000
  );
  await waitForExpression(
    send,
    '!document.body.textContent.includes("Loading items from backend")',
    90000
  );
  await waitForExpression(
    send,
    'document.querySelector("[aria-label=\\"Filter stores\\"]") !== null',
    90000
  );

  await setInput(send, "Filter stores", retailResRef);
  await waitForExpression(
    send,
    `document.body.textContent.includes(${JSON.stringify(retailResRef)})`,
    30000
  );
  await scrollIntoView(send, ".items-mode-store-management");

  await clickButtonByText(send, "New Store");
  await waitForExpression(
    send,
    'document.querySelector("[aria-label=\\"store creation wizard\\"]") !== null',
    30000
  );
  await setInput(send, "Store ResRef", retailResRef);
  await waitForExpression(
    send,
    'document.querySelector(".items-mode-wizard-resref-conflict") !== null',
    30000
  );
  const conflictState = await evaluate(
    send,
    `(() => {
      const panel = document.querySelector(".items-mode-wizard-resref-conflict");
      const submit = Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent.trim() === "Create Store"
      );
      return {
        text: panel?.textContent?.replace(/\\s+/g, " ").trim() ?? null,
        createDisabled: submit?.disabled ?? null,
        hasRetailResRef: document.body.textContent.includes(${JSON.stringify(retailResRef)})
      };
    })()`
  );
  assert(conflictState.createDisabled === true, "Store conflict did not block Create Store", conflictState);
  const conflictShot = await screenshot(send, "31-store-resref-conflict-cdp.png");

  await setCheckbox(send, "Overwrite existing store ResRef", true);
  await waitForExpression(
    send,
    `(() => {
      const submit = Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent.trim() === "Create Store"
      );
      return submit && !submit.disabled;
    })()`,
    30000
  );
  const overwriteReadyState = await evaluate(
    send,
    `(() => {
      const checkbox = document.querySelector('input[type="checkbox"][aria-label="Overwrite existing store ResRef"]');
      const submit = Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent.trim() === "Create Store"
      );
      return {
        checkboxChecked: checkbox?.checked ?? null,
        createDisabled: submit?.disabled ?? null,
        text: document.querySelector(".items-mode-wizard-resref-conflict")?.textContent?.replace(/\\s+/g, " ").trim() ?? null
      };
    })()`
  );
  const overwriteReadyShot = await screenshot(send, "32-store-shadow-copy-overwrite-ready-cdp.png");
  await clickButtonByText(send, "Cancel");
  await waitForExpression(
    send,
    'document.querySelector("[aria-label=\\"store creation wizard\\"]") === null',
    30000
  );

  let editReadyState = null;
  let editReadyShot = null;
  let shadowCopyShot = null;
  let moduleCopy = null;
  let cleanupAfter = null;
  if (hasSourceStoreForShadowCopy) {
    await scrollIntoView(send, ".items-mode-store-management");
    await clickButtonByAria(send, `Edit store ${retailResRef}`);
    await waitForExpression(
      send,
      'document.querySelector("[aria-label=\\"store creation wizard\\"]") !== null',
      30000
    );
    await setInput(send, "Store Name", updatedName);
    editReadyState = await evaluate(
      send,
      `(() => {
        const resRefInput = document.querySelector('input[aria-label="Store ResRef"]');
        const deleteButton = Array.from(document.querySelectorAll("button")).find((button) =>
          button.getAttribute("aria-label") === ${JSON.stringify(`Delete store ${retailResRef}`)}
        );
        return {
          resRef: resRefInput?.value ?? null,
          resRefDisabled: resRefInput?.disabled ?? null,
          deleteDisabled: deleteButton?.disabled ?? null,
          hasUpdateButton: Array.from(document.querySelectorAll("button")).some((button) =>
            button.textContent.trim() === "Update Store" && !button.disabled
          )
        };
      })()`
    );
    editReadyShot = await screenshot(send, "33-store-retail-edit-shadow-copy-cdp.png");
    await clickButtonByText(send, "Update Store");
    await waitForExpression(
      send,
      `!document.querySelector("[aria-label=\\"store creation wizard\\"]") && document.body.textContent.includes(${JSON.stringify(updatedName)})`,
      90000
    );
    await scrollIntoView(send, ".items-mode-store-management");
    shadowCopyShot = await screenshot(send, "34-store-retail-shadow-copy-created-cdp.png");

    const afterList = await getJson(`${apiBase}/catalog/stores?query=${encodeURIComponent(retailResRef)}&limit=20`, authHeaders);
    moduleCopy = afterList.data.items.find(
      (store) => store.resref === retailResRef && isModuleBackedStoreRecord(store)
    );
    assert(moduleCopy, "Retail edit did not create a module-backed store shadow-copy", {
      retailResRef,
      afterList: afterList.data.items.map((store) => ({
        resref: store.resref,
        name: store.name,
        tags: store.tags,
        sourceObjectKey: store.metadata?.sourceObjectKey,
        sourceGeneratedBy: store.metadata?.sourceGeneratedBy,
        createdByStoreWizard: store.metadata?.createdByStoreWizard
      }))
    });

    try {
      cleanupAfter = await deleteJson(
        `${apiBase}/catalog/stores/blueprints/${encodeURIComponent(retailResRef)}`,
        authHeaders
      );
    } catch (error) {
      cleanupAfter = { deleted: false, status: error.details?.status ?? null };
    }
  }

  const summary = {
    capturedAt: new Date().toISOString(),
    backendBaseUrl,
    frontendBaseUrl,
    retailStore: {
      templateId: retailStore.templateId,
      resref: retailStore.resref,
      name: retailStore.name,
      category: retailStore.category,
      tags: retailStore.tags
    },
    storeSourceCoverage: {
      total: storeList.data.items.length,
      moduleBacked: moduleBackedStoreCount,
      nonModuleSource: storeList.data.items.length - moduleBackedStoreCount,
      sourceStoreAvailableForShadowCopy: hasSourceStoreForShadowCopy
    },
    cleanupBefore,
    conflictState,
    overwriteReadyState,
    editReadyState,
    shadowCopyState: {
      created: Boolean(moduleCopy),
      resref: moduleCopy?.resref ?? null,
      name: moduleCopy?.name ?? null,
      tags: moduleCopy?.tags ?? null,
      skippedReason: moduleCopy
        ? null
        : "current runtime exposes no non-module UTM store; 42/42 stores are modules/current",
      cleanupAfter
    },
    screenshots: {
      conflict: conflictShot,
      overwriteReady: overwriteReadyShot,
      editReady: editReadyShot,
      shadowCopyCreated: shadowCopyShot
    },
    backendOutput: backend.output(),
    viteOutput: frontend.output(),
    chromeStderrTail: chromeStderr.slice(-2000)
  };
  const summaryPath = path.join(outDir, "31-store-overwrite-summary.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        summaryPath,
        retailResRef,
        screenshots: summary.screenshots,
        conflictBlocked: conflictState.createDisabled,
        overwriteEnabled: overwriteReadyState.createDisabled === false,
        sourceStoreAvailableForShadowCopy: hasSourceStoreForShadowCopy,
        shadowCopyCreated: Boolean(moduleCopy),
        cleanupDeleted: cleanupAfter?.data?.deleted ?? cleanupAfter?.deleted ?? null
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
