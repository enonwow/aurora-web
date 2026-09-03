import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const frontendRoot = path.join(repoRoot, "frontend");
const outDir = process.env.ITEM_VISUAL_MATRIX_OUT_DIR
  ? path.resolve(repoRoot, process.env.ITEM_VISUAL_MATRIX_OUT_DIR)
  : path.join(repoRoot, ".codex-tmp", "item-proof-all", "24-visual-matrix");
const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = Number(process.env.ITEM_VISUAL_MATRIX_CDP_PORT ?? 9553);
const profileDir = path.join(outDir, `chrome-cdp-profile-visual-matrix-${Date.now()}`);
const managedServers = process.env.ITEM_VISUAL_MATRIX_MANAGED_SERVERS === "1";
const managedBackendPort = Number(process.env.ITEM_VISUAL_MATRIX_BACKEND_PORT ?? 3120);
const managedFrontendPort = Number(process.env.ITEM_VISUAL_MATRIX_FRONTEND_PORT ?? 5190);
const managedBackendBaseUrl = `http://127.0.0.1:${managedBackendPort}`;
const requestTimeoutMs = Number(process.env.ITEM_VISUAL_MATRIX_HTTP_TIMEOUT_MS ?? 120000);
const baseUrl =
  process.env.ITEM_CAPTURE_BASE_URL ??
  (managedServers ? `http://127.0.0.1:${managedFrontendPort}` : "http://127.0.0.1:5173");
const apiBase =
  process.env.ITEM_CAPTURE_API_BASE_URL ??
  (managedServers
    ? `${managedBackendBaseUrl}/api/v1`
    : new URL(baseUrl).port === "5173"
      ? "http://127.0.0.1:3000/api/v1"
      : `${baseUrl}/_aurora/v1`);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

fs.mkdirSync(outDir, { recursive: true });

if (process.env.ITEM_VISUAL_MATRIX_KEEP_OUTPUT !== "1") {
  for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      (entry.name.endsWith(".json") || entry.name.endsWith(".png"))
    ) {
      fs.rmSync(path.join(outDir, entry.name), { force: true });
    }
  }
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

async function waitForHttp(url, timeoutMs = 60000) {
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

async function requestJson(method, url, body, headers = {}) {
  const response = await fetch(url, {
    method,
    signal: AbortSignal.timeout(requestTimeoutMs),
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

async function deleteJson(url, headers = {}) {
  return requestJson("DELETE", url, null, headers);
}

async function waitForCdpPage() {
  const deadline = Date.now() + 30000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const tabs = await getJson(`http://127.0.0.1:${port}/json/list`);
      const page =
        tabs.find(
          (entry) =>
            entry.type === "page" &&
            entry.webSocketDebuggerUrl &&
            String(entry.url ?? "").startsWith(baseUrl)
        ) ??
        tabs.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
      if (page) {
        return page;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`No CDP page on port ${port}: ${lastError?.message ?? "timeout"}`);
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

function safeName(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function buildItemSearchTerms(resRef, hints = []) {
  const normalized = String(resRef ?? "").trim().toLowerCase();
  const compact = normalized.replace(/_/g, "");
  const withoutBoundaryNumbers = normalized.replace(/^([a-z])_/u, "$1").replace(/_0$/u, "");
  const tokens = normalized.split("_").filter(Boolean);
  return [
    normalized,
    withoutBoundaryNumbers,
    compact,
    normalized.replace(/_/g, " "),
    tokens.slice(1).join("_"),
    tokens.slice(1).join(""),
    tokens.filter((token) => !/^[0-9]+$/u.test(token)).join("_"),
    tokens.filter((token) => !/^[0-9]+$/u.test(token)).join(""),
    ...hints
  ]
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter(Boolean)
    .filter((entry, index, values) => values.indexOf(entry) === index);
}

function buildItemMatchTerms(resRef, hints = []) {
  const terms = buildItemSearchTerms(resRef, []);
  return terms
    .flatMap((entry) => [
      entry,
      entry.replace(/[^a-z0-9]+/gu, ""),
      entry.replace(/_/gu, " ")
    ])
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .filter((entry, index, values) => values.indexOf(entry) === index);
}

function readExternalCaseResRefs() {
  const values = [];
  const addValues = (raw) => {
    String(raw ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => values.push(entry));
  };
  addValues(process.env.ITEM_VISUAL_MATRIX_CASE_RESREFS);
  const caseFile = process.env.ITEM_VISUAL_MATRIX_CASE_FILE;
  if (caseFile && fs.existsSync(caseFile)) {
    addValues(fs.readFileSync(caseFile, "utf8"));
  }
  return [...new Set(values.map((entry) => entry.toLowerCase()))];
}

function setInputScript(label, value, rootSelector = "") {
  return `(() => {
    const root = ${JSON.stringify(rootSelector)} ? document.querySelector(${JSON.stringify(rootSelector)}) : document;
    if (!root) return false;
    const input = root.querySelector('input[aria-label=${JSON.stringify(label)}], textarea[aria-label=${JSON.stringify(label)}]');
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

async function setInput(send, label, value, rootSelector = "") {
  const ok = await evaluate(send, setInputScript(label, value, rootSelector));
  if (ok) {
    return;
  }
  const debug = await evaluate(
    send,
    `(() => {
      const root = ${JSON.stringify(rootSelector)} ? document.querySelector(${JSON.stringify(rootSelector)}) : document;
      if (!root) return { rootFound: false };
      const fields = Array.from(root.querySelectorAll("input, textarea, select")).map((entry) => ({
        tag: entry.tagName.toLowerCase(),
        ariaLabel: entry.getAttribute("aria-label") ?? "",
        value: entry.value ?? "",
        text: entry instanceof HTMLSelectElement
          ? entry.selectedOptions[0]?.textContent?.trim() ?? ""
          : ""
      }));
      const tabs = Array.from(root.querySelectorAll('[role="tab"]')).map((entry) => ({
        text: entry.textContent?.trim() ?? "",
        selected: entry.getAttribute("aria-selected")
      }));
      return {
        rootFound: true,
        fields,
        tabs,
        bodyText: root.textContent?.trim().replace(/\\s+/g, " ").slice(0, 1200) ?? ""
      };
    })()`,
    10000
  ).catch((error) => ({ error: error.message }));
  assert(false, `Input not found: ${label}`, debug);
}

async function clickButtonByText(send, text, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
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

async function clickTab(send, label, rootSelector = "") {
  const ok = await evaluate(
    send,
    `(() => {
      const root = ${JSON.stringify(rootSelector)} ? document.querySelector(${JSON.stringify(rootSelector)}) : document;
      if (!root) return false;
      const tab = Array.from(root.querySelectorAll('[role="tab"]')).find((entry) =>
        entry.textContent.trim() === ${JSON.stringify(label)}
      );
      tab?.click();
      return Boolean(tab);
    })()`
  );
  assert(ok, `Tab not found: ${label}`);
}

async function selectBaseItem(send, matcher, rootSelector = "") {
  const result = await evaluate(
    send,
    `(() => {
      const root = ${JSON.stringify(rootSelector)} ? document.querySelector(${JSON.stringify(rootSelector)}) : document;
      if (!root) return { ok: false, reason: "root-missing", options: [] };
      const select = root.querySelector('select[aria-label="Base Item"]');
      if (!select) return { ok: false, reason: "select-missing", options: [] };
      const needle = ${JSON.stringify(matcher.toLowerCase())};
      const exactBaseNeedle = /^\\d+$/u.test(needle) ? needle + " -" : "";
      const options = Array.from(select.options).map((entry) => ({
        value: entry.value,
        text: entry.textContent.trim()
      }));
      const option = Array.from(select.options).find((entry) => {
        const text = entry.textContent.trim().toLowerCase();
        const value = entry.value.toLowerCase();
        if (exactBaseNeedle) {
          return text.startsWith(exactBaseNeedle);
        }
        return text.includes(needle) || value.includes(needle);
      });
      if (!option) return { ok: false, reason: "option-missing", options };
      select.value = option.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, selectedText: option.textContent.trim(), selectedValue: option.value, options };
    })()`
  );
  assert(result?.ok, `Base item option not found: ${matcher}`, result ?? {});
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

async function cleanupItemBlueprint(token, resRef) {
  try {
    await deleteJson(`${apiBase}/catalog/items/blueprints/${encodeURIComponent(resRef)}`, {
      authorization: `Bearer ${token}`
    });
    return { resRef, deleted: true };
  } catch (error) {
    return { resRef, deleted: false, status: error.details?.status ?? null };
  }
}

async function cleanupVisualMatrixItemBlueprints(token) {
  const deleted = [];
  const failed = [];
  const result = await getJson(
    `${apiBase}/catalog/items?query=${encodeURIComponent("vmarmor")}&limit=200&offset=0`,
    { authorization: `Bearer ${token}` }
  );
  const items = Array.isArray(result?.data?.items) ? result.data.items : [];
  for (const item of items) {
    const resref = String(item?.resref ?? "").trim().toLowerCase();
    if (!/^vmarmor\d{5}$/u.test(resref)) {
      continue;
    }
    try {
      await deleteJson(`${apiBase}/catalog/items/blueprints/${encodeURIComponent(resref)}`, {
        authorization: `Bearer ${token}`
      });
      deleted.push(resref);
    } catch (error) {
      failed.push({
        resref,
        status: error.details?.status ?? null,
        message: error.message
      });
    }
  }
  return { deleted, failed, scanned: items.length, total: Number(result?.data?.total ?? 0) };
}

async function createCustomArmorThroughWizard(send, resRef) {
  const tag = `VISMATRIX_${resRef.toUpperCase()}`;
  const wizardSelector = '[aria-label="item creation wizard"]';
  await waitForNewItemReady(send, 300000);
  await clickButtonByText(send, "New Item", 300000);
  await waitForExpression(send, 'document.querySelector("[aria-label=\\"item creation wizard\\"]") !== null', 30000);
  await selectBaseItem(send, "16", wizardSelector);
  await clickTab(send, "Identity", wizardSelector);
  await setInput(send, "Name", "Visual Matrix Wizard Armor", wizardSelector);
  await setInput(send, "ResRef", resRef, wizardSelector);
  await setInput(send, "Tag", tag, wizardSelector);
  await clickTab(send, "Visual", wizardSelector);
  await setInput(send, "Torso", "43", wizardSelector);
  await setInput(send, "Pelvis", "8", wizardSelector);
  await setInput(send, "R Foot", "4", wizardSelector);
  await setInput(send, "L Foot", "4", wizardSelector);
  await setInput(send, "R Shin", "13", wizardSelector);
  await setInput(send, "L Shin", "13", wizardSelector);
  await setInput(send, "R Thigh", "3", wizardSelector);
  await setInput(send, "L Thigh", "3", wizardSelector);
  await setInput(send, "R Shoulder", "15", wizardSelector);
  await setInput(send, "L Shoulder", "15", wizardSelector);
  await setInput(send, "R Forearm", "16", wizardSelector);
  await setInput(send, "L Forearm", "16", wizardSelector);
  await setInput(send, "R Bicep", "4", wizardSelector);
  await setInput(send, "L Bicep", "4", wizardSelector);
  await setInput(send, "R Hand", "3", wizardSelector);
  await setInput(send, "L Hand", "3", wizardSelector);
  await setInput(send, "Neck", "1", wizardSelector);
  await setInput(send, "Belt", "0", wizardSelector);
  await setInput(send, "Robe", "0", wizardSelector);
  await setInput(send, "Leather 1", "5", wizardSelector);
  await setInput(send, "Leather 2", "7", wizardSelector);
  await setInput(send, "Cloth 1", "2", wizardSelector);
  await setInput(send, "Cloth 2", "3", wizardSelector);
  await setInput(send, "Metal 1", "17", wizardSelector);
  await setInput(send, "Metal 2", "8", wizardSelector);
  await clickTab(send, "Finish", wizardSelector);
  await clickButtonByText(send, "Create Item");
  const created = await waitForCustomWizardCreated(send, resRef, 180000);
  return { resRef, tag, sceneObjectId: created.sceneObjectId ?? "" };
}

async function waitForNewItemReady(send, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  let disabledStreak = 0;
  let reloadAttempts = 0;
  while (Date.now() < deadline) {
    last = await evaluate(
      send,
      `(() => {
        const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        const filter = document.querySelector('input[aria-label="Filter items"]');
        if (filter && filter.value.trim().length > 0) {
          setValue?.call(filter, "");
          filter.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            inputType: "deleteContentBackward",
            data: ""
          }));
          filter.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const resetButton = Array.from(document.querySelectorAll("button")).find((entry) =>
          entry.textContent.trim() === "Reset filters"
        );
        resetButton?.click();
        const buttons = Array.from(document.querySelectorAll("button"));
        const newItem = buttons.find((entry) => entry.textContent.trim() === "New Item");
        const bodyText = document.body.textContent.trim().replace(/\\s+/g, " ");
        const rows = Array.from(document.querySelectorAll(".items-mode-row button.scene-object-row"));
        const section = document.querySelector('[aria-label="items mode section"]');
        const loading = bodyText.includes("Loading items from backend");
        return newItem && !newItem.disabled && !loading && section ? { ok: true } : {
          ok: false,
          newItemFound: Boolean(newItem),
          newItemDisabled: newItem ? newItem.disabled : null,
          itemRows: rows.length,
          sectionReady: Boolean(section),
          isLogin: Boolean(document.querySelector("form") && bodyText.includes("Sign in")),
          loading,
          bodyHead: bodyText.slice(0, 500),
          bodyTail: bodyText.slice(-500)
        };
      })()`,
      10000
    );
    if (last?.ok) {
      return last;
    }
    if (last?.newItemFound && last.newItemDisabled === true && !last.loading) {
      disabledStreak += 1;
      if (disabledStreak >= 4 && reloadAttempts < 3) {
        reloadAttempts += 1;
        disabledStreak = 0;
        await send("Page.navigate", { url: `${baseUrl}/app?mode=items_mode&proofReset=${Date.now()}` }, 30000);
        await waitForExpression(
          send,
          'document.querySelector("[aria-label=\\"items mode section\\"]") !== null && document.querySelector("input[aria-label=\\"Filter items\\"]") !== null',
          60000
        );
      }
    } else {
      disabledStreak = 0;
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for New Item; last=${JSON.stringify(last)}`);
}

async function waitForCustomWizardCreated(send, resRef, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await evaluate(
      send,
      `(() => {
        const wizard = document.querySelector("[aria-label=\\"item creation wizard\\"]");
        const bodyText = document.body.textContent.trim().replace(/\\s+/g, " ");
        const createButton = Array.from(document.querySelectorAll("button")).find((entry) =>
          entry.textContent.trim() === "Create Item"
        );
        const alerts = Array.from(document.querySelectorAll('[role="alert"], .items-mode-wizard-validation li, .items-creator-error')).map((entry) =>
          entry.textContent.trim().replace(/\\s+/g, " ")
        ).filter(Boolean);
        const inspector = document.querySelector('[aria-label="items inspector"]');
        const inspectorText = inspector?.textContent?.trim().replace(/\\s+/g, " ") ?? "";
        const ok = !wizard && bodyText.toLowerCase().includes(${JSON.stringify(resRef.toLowerCase())});
        const selected = document.querySelector("button.scene-object-row.is-selected");
        const sceneObjectId = selected?.dataset.sceneObjectId ?? "";
        return ok ? { ok: true, sceneObjectId } : {
          ok: false,
          wizardOpen: Boolean(wizard),
          bodyContainsResRef: bodyText.toLowerCase().includes(${JSON.stringify(resRef.toLowerCase())}),
          createButtonDisabled: createButton ? createButton.disabled : null,
          alerts,
          inspectorText: inspectorText.slice(0, 500),
          bodyTail: bodyText.slice(-800)
        };
      })()`,
      10000
    );
    if (last?.ok) {
      return last;
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for custom wizard item ${resRef}; last=${JSON.stringify(last)}`);
}

async function ensureItemsModeReady(send) {
  const ready = await evaluate(
    send,
    `(() => {
      const section = document.querySelector('[aria-label="items mode section"]');
      const filter = document.querySelector('input[aria-label="Filter items"]');
      const host = document.querySelector('[aria-label="workspace render canvas"]');
      return Boolean(section && filter && host);
    })()`
  );
  if (!ready) {
    await evaluate(
      send,
      `(() => {
        localStorage.setItem("aurora_web.workspace_mode.v1", "items_mode");
        window.location.href = ${JSON.stringify(`${baseUrl}/app?mode=items_mode`)};
        return true;
      })()`
    );
  }
  await waitForExpression(
    send,
    'document.querySelector("[aria-label=\\"items mode section\\"]") !== null && document.querySelector("input[aria-label=\\"Filter items\\"]") !== null',
    60000
  );
  await waitForExpression(send, 'document.querySelector("[aria-label=\\"workspace render canvas\\"]") !== null', 30000);
}

async function resetItemsModeFilters(send) {
  await evaluate(
    send,
    `(() => {
      const palette = document.querySelector('select[aria-label="Item palette category"]');
      if (palette && palette.value !== "all") {
        palette.value = "all";
        palette.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const filter = document.querySelector('input[aria-label="Filter items"]');
      if (filter && filter.value) {
        filter.value = "";
        filter.dispatchEvent(new Event("input", { bubbles: true }));
        filter.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const resetButton = document.querySelector('button[aria-label="Reset items filters"]');
      resetButton?.click();
      return true;
    })()`
  );
  await delay(250);
}

async function selectItemByResRef(send, resRef, preferredSceneObjectId = "", searchHints = []) {
  await ensureItemsModeReady(send);
  await resetItemsModeFilters(send);
  const searchTerms = buildItemSearchTerms(resRef, searchHints);
  const matchTerms = buildItemMatchTerms(resRef, searchHints);
  let matchedTerm = "";
  let lastWaitError = null;
  const tryFindMatchingSearchTerm = async () => {
    for (const searchTerm of searchTerms) {
      await setInput(send, "Filter items", searchTerm);
      try {
        await waitForExpression(
          send,
          `(() => {
            const needles = ${JSON.stringify(matchTerms)};
            const normalize = (value) => String(value ?? "").toLowerCase();
            const compact = (value) => normalize(value).replace(/[^a-z0-9]+/g, "");
            const matchesNeedle = (value) => {
              const normalized = normalize(value);
              const compacted = compact(value);
              return needles.some((needle) =>
                normalized.includes(needle) || compacted.includes(needle.replace(/[^a-z0-9]+/g, ""))
              );
            };
            const preferredSceneObjectId = ${JSON.stringify(preferredSceneObjectId.toLowerCase())};
            const rows = Array.from(document.querySelectorAll(".items-mode-row button.scene-object-row"));
            if (preferredSceneObjectId && rows.some((row) => row.dataset.sceneObjectId?.toLowerCase() === preferredSceneObjectId)) {
              return true;
            }
            const hasMatchingRow = rows.some((row) =>
              matchesNeedle(row.dataset.resRef) ||
              matchesNeedle(row.dataset.sceneObjectId) ||
              matchesNeedle(row.textContent)
            );
            if (hasMatchingRow) return true;
            return false;
          })()`,
          12000
        );
        return searchTerm;
      } catch (error) {
        lastWaitError = error;
      }
    }
    return "";
  };
  matchedTerm = await tryFindMatchingSearchTerm();
  if (!matchedTerm) {
    await evaluate(
      send,
      `(() => {
        window.location.href = ${JSON.stringify(`${baseUrl}/app?mode=items_mode`)};
        return true;
      })()`
    );
    await delay(1500);
    await ensureItemsModeReady(send);
    await resetItemsModeFilters(send);
    matchedTerm = await tryFindMatchingSearchTerm();
  }
  const debugRows = await evaluate(
    send,
    `(() => Array.from(document.querySelectorAll(".items-mode-row button.scene-object-row"))
      .slice(0, 12)
      .map((row) => ({
        resRef: row.dataset.resRef ?? "",
        sceneObjectId: row.dataset.sceneObjectId ?? "",
        text: row.textContent?.trim().replace(/\\s+/g, " ").slice(0, 240) ?? ""
      })))()`,
    10000
  ).catch((error) => [{ error: error.message }]);
  assert(matchedTerm, `Item row not found after filtering: ${resRef}`, {
    searchTerms,
    matchTerms,
    debugRows,
    lastWaitError: lastWaitError?.message ?? ""
  });
  const clicked = await evaluate(
    send,
    `(() => {
      const needles = ${JSON.stringify(matchTerms)};
      const normalize = (value) => String(value ?? "").toLowerCase();
      const compact = (value) => normalize(value).replace(/[^a-z0-9]+/g, "");
      const matchesNeedle = (value) => {
        const normalized = normalize(value);
        const compacted = compact(value);
        return needles.some((needle) =>
          normalized.includes(needle) || compacted.includes(needle.replace(/[^a-z0-9]+/g, ""))
        );
      };
      const preferredSceneObjectId = ${JSON.stringify(preferredSceneObjectId.toLowerCase())};
      const rows = Array.from(document.querySelectorAll(".items-mode-row button.scene-object-row"));
      const button = (preferredSceneObjectId
        ? rows.find((entry) => entry.dataset.sceneObjectId?.toLowerCase() === preferredSceneObjectId)
        : null) ?? rows.find((entry) =>
        matchesNeedle(entry.dataset.resRef) ||
        matchesNeedle(entry.dataset.sceneObjectId) ||
        matchesNeedle(entry.textContent)
      );
      button?.scrollIntoView({ block: "center", inline: "nearest" });
      button?.click();
      return button ? {
        id: button.dataset.sceneObjectId ?? "",
        resRef: button.dataset.resRef ?? "",
        text: button.textContent.trim().replace(/\\s+/g, " ").slice(0, 240)
      } : null;
    })()`,
    12000
  );
  assert(clicked, `Item row not found after filtering: ${resRef}`, { searchTerms, matchTerms });
  await waitForExpression(
    send,
    `(() => {
      const selected = document.querySelector("button.scene-object-row.is-selected");
      const needles = ${JSON.stringify(matchTerms)};
      const compact = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
      const normalized = (value) => String(value ?? "").toLowerCase();
      return needles.some((needle) =>
        normalized(selected?.dataset.resRef).includes(needle) ||
        normalized(selected?.dataset.sceneObjectId).includes(needle) ||
        compact(selected?.dataset.resRef).includes(needle.replace(/[^a-z0-9]+/g, "")) ||
        compact(selected?.dataset.sceneObjectId).includes(needle.replace(/[^a-z0-9]+/g, ""))
      );
    })()`,
    12000
  );
  await waitForExpression(send, 'document.querySelector("[aria-label=\\"workspace render canvas\\"]") !== null', 30000);
  await waitForExpression(
    send,
    `(() => {
      const inspector = document.querySelector('[aria-label="items inspector"]');
      const text = inspector?.textContent?.trim().replace(/\\s+/g, " ") ?? "";
      return text.length > 0 &&
        !text.includes("Applying...") &&
        !text.includes("Preview Editorapplying") &&
        !text.includes("Preview Editor applying");
    })()`,
    180000,
    500
  );
}

function cameraScript(angle, camera) {
  return `(() => {
    const host = document.querySelector('[aria-label="workspace render canvas"]');
    if (!host) return false;
    host.dispatchEvent(new CustomEvent("aurora:areas:focused-perspective-camera", {
      detail: {
        source: "item-visual-matrix",
        cleanCanvas: true,
        displayFog: false,
        tileLightsVisible: false,
        useAreaLighting: false,
        targetX: ${JSON.stringify(camera.targetX)},
        targetY: ${JSON.stringify(camera.targetY)},
        targetZ: ${JSON.stringify(camera.targetZ)},
        distance: ${JSON.stringify(camera.distance)},
        yawDegrees: ${JSON.stringify(angle.yaw)},
        elevationDegrees: ${JSON.stringify(angle.elevation)}
      }
    }));
    return true;
  })()`;
}

async function requestProofSnapshot(send, label) {
  const dispatched = await evaluate(
    send,
    `(() => {
      const host = document.querySelector('[aria-label="workspace render canvas"]');
      if (!host) return { ok: false, reason: "missing-host" };
      const requestedLabel = ${JSON.stringify(label)};
      delete host.dataset.itemVisualProofSnapshot;
      host.dispatchEvent(new CustomEvent("aurora:items:visual-proof-request", {
        detail: { label: requestedLabel }
      }));
      return { ok: true };
    })()`,
    10000
  );
  if (!dispatched?.ok) {
    return dispatched;
  }
  const deadline = Date.now() + 4000;
  let last = null;
  while (Date.now() < deadline) {
    const polled = await evaluate(
      send,
      `(() => {
        const host = document.querySelector('[aria-label="workspace render canvas"]');
        if (!host) return { ok: false, reason: "missing-host" };
        const raw = host.dataset.itemVisualProofSnapshot;
        if (!raw) {
          return {
            ok: false,
            reason: host.dataset.itemVisualProofSnapshotError
              ? "snapshot-error"
              : "missing-snapshot",
            listener: host.dataset.itemVisualProofRequestListener ?? "",
            lastRequestLabel: host.dataset.itemVisualProofLastRequestLabel ?? "",
            requestCount: host.dataset.itemVisualProofRequestCount ?? "",
            error: host.dataset.itemVisualProofSnapshotError ?? ""
          };
        }
        const snapshot = JSON.parse(raw);
        return snapshot.label === ${JSON.stringify(label)}
          ? { ok: true, snapshot }
          : { ok: false, reason: "stale-snapshot", label: snapshot.label };
      })()`,
      10000
    );
    last = polled;
    if (polled?.ok) {
      return polled;
    }
    await delay(150);
  }
  return last ?? { ok: false, reason: "missing-snapshot" };
}

function isFinalItemVisualProofObject(object, expectations = {}) {
  if (!object) {
    return false;
  }
  const mode = object.preview?.mode ?? "";
  const expectedModes = expectations.expectedPreviewModes ?? [];
  const expectsModelAssets = expectedModes.some((expectedMode) => expectedMode.endsWith("-assets"));
  const modelPartRefs = object.preview?.modelPartResRefs ?? "";
  const modelParts = object.preview?.modelParts ?? "";
  const hasRequestedModels = modelPartRefs.trim().length > 0 || modelParts.trim().length > 0;
  const textureStatus = object.sharedRenderer?.textureStatus ?? "";
  const iconStatus = object.preview?.iconStatus ?? "";
  const materialMapCount = object.materialEvidence?.mapReferences?.length ?? 0;
  const modelTextureReferenceCount =
    object.preview?.modelTextureReferenceCount ?? object.preview?.textureReferenceCount ?? 0;
  const modelTextureLoadedCount = object.preview?.modelTextureLoadedCount ?? 0;
  const modelTextureLoadStatus = object.preview?.modelTextureLoadStatus ?? "";
  const isExpectedModeMismatch = expectedModes.length > 0 && !expectedModes.includes(mode);
  if (isExpectedModeMismatch && mode === "icon-fallback" && expectsModelAssets && hasRequestedModels) {
    return false;
  }
  const waitsForModelTextures =
    (mode === "model-part-assets" || mode === "armor-part-assets") &&
    modelTextureReferenceCount > 0 &&
    modelTextureLoadedCount < modelTextureReferenceCount &&
    materialMapCount === 0 &&
    !["loaded", "partial", "missing", "not-applicable"].includes(modelTextureLoadStatus);
  if (waitsForModelTextures) {
    return false;
  }
  if (object.meshCount > 0) {
    return mode !== "icon-fallback" || textureStatus === "applied" || iconStatus === "applied";
  }
  if (textureStatus === "loading" || iconStatus === "loading") {
    return false;
  }
  return (
    object.sharedRenderer?.placeholderReason === "asset-contract-blocked" ||
    mode === "model-part-assets-missing" ||
    mode === "armor-part-assets-missing" ||
    (mode === "metadata-only" && !hasRequestedModels)
  );
}

async function waitForRenderableProof(send, label, timeoutMs = 60000, expectations = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const result = await requestProofSnapshot(send, label);
    last = result;
    const object = result?.snapshot?.objects?.[0];
    if (result?.ok && isFinalItemVisualProofObject(object, expectations)) {
      return result.snapshot;
    }
    await delay(500);
  }
  if (last?.ok && last.snapshot?.objects?.[0]) {
    return last.snapshot;
  }
  throw new Error(`Timed out waiting for render proof ${label}; last=${JSON.stringify(last)}`);
}

async function waitForVisualLoadingOverlayCleared(send, label, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await evaluate(
      send,
      `(() => {
        const bodyText = document.body.textContent.trim().replace(/\\s+/g, " ");
        const overlayVisible =
          bodyText.includes("Orbit paused while assets load") ||
          bodyText.includes("Modele PLC/DOR") ||
          bodyText.includes("Models PLC/DOR");
        return overlayVisible ? {
          ok: false,
          label: ${JSON.stringify(label)},
          bodyTail: bodyText.slice(-800)
        } : { ok: true };
      })()`,
      10000
    );
    if (last?.ok) {
      return last;
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for loading overlay to clear ${label}; last=${JSON.stringify(last)}`);
}

async function readItemInspectorState(send) {
  return evaluate(
    send,
    `(() => {
      const inspector = document.querySelector('[aria-label="items inspector"]');
      const entries = {};
      inspector?.querySelectorAll("dl.items-inspector-list > div").forEach((entry) => {
        const key = entry.querySelector("dt")?.textContent?.trim();
        const value = entry.querySelector("dd")?.textContent?.trim();
        if (key) entries[key] = value ?? "";
      });
      return {
        title: inspector?.querySelector(".items-inspector-titleblock strong")?.textContent?.trim() ?? "",
        summary: inspector?.querySelector(".items-inspector-titleblock span")?.textContent?.trim() ?? "",
        entries,
        text: inspector?.textContent?.trim().replace(/\\s+/g, " ").slice(0, 2000) ?? ""
      };
    })()`,
    10000
  );
}

async function readSelectedItemRowState(send, resRef, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await evaluate(
      send,
      `(() => {
        const needle = ${JSON.stringify(resRef.toLowerCase())};
        const row =
          document.querySelector("button.scene-object-row.is-selected") ??
          Array.from(document.querySelectorAll("button.scene-object-row")).find((entry) =>
            entry.dataset.resRef?.toLowerCase() === needle ||
            entry.dataset.sceneObjectId?.toLowerCase() === needle
          );
        const grid = row?.querySelector(".items-mode-inventory-icon");
        const image = row?.querySelector(".items-mode-inventory-icon img");
        const thumbnail = row?.querySelector(".items-mode-inventory-icon .scene-object-thumbnail");
        const decodeStatus = row?.querySelector(".items-mode-icon-decode-status");
        const visualStatus = row?.querySelector(".items-mode-visual-status");
        const gridClassName = grid?.className ?? "";
        const thumbnailClassName = thumbnail?.className ?? "";
        const thumbnailRendered = thumbnailClassName.includes("scene-object-thumbnail-rendered");
        const imageSrc = image?.getAttribute("src") ?? "";
        const round = (value) => Math.round(Number(value) * 1000) / 1000;
        const readRect = (element) => {
          const rect = element?.getBoundingClientRect?.();
          if (!rect) return null;
          return {
            x: round(rect.x),
            y: round(rect.y),
            width: round(rect.width),
            height: round(rect.height),
            left: round(rect.left),
            top: round(rect.top),
            right: round(rect.right),
            bottom: round(rect.bottom)
          };
        };
        const computeContainRect = (containerRect, naturalWidth, naturalHeight) => {
          if (!containerRect || naturalWidth < 1 || naturalHeight < 1) return null;
          const naturalAspect = naturalWidth / naturalHeight;
          const containerAspect = containerRect.width / containerRect.height;
          if (!Number.isFinite(naturalAspect) || !Number.isFinite(containerAspect)) return null;
          if (naturalAspect >= containerAspect) {
            const width = containerRect.width;
            const height = width / naturalAspect;
            return {
              x: containerRect.x,
              y: containerRect.y + (containerRect.height - height) / 2,
              width,
              height
            };
          }
          const height = containerRect.height;
          const width = height * naturalAspect;
          return {
            x: containerRect.x + (containerRect.width - width) / 2,
            y: containerRect.y,
            width,
            height
          };
        };
        const readImagePixelMetrics = () => {
          const gridRect = readRect(grid);
          const frame = row?.querySelector(".items-mode-inventory-icon-frame");
          const frameRect = readRect(frame);
          const thumbnailRect = readRect(thumbnail);
          const imageRect = readRect(image);
          if (!image) {
            return {
              status: "missing-image",
              gridRect,
              frameRect,
              thumbnailRect,
              imageRect
            };
          }
          const naturalWidth = image.naturalWidth || 0;
          const naturalHeight = image.naturalHeight || 0;
          if (!image.complete || naturalWidth < 1 || naturalHeight < 1) {
            return {
              status: "loading",
              gridRect,
              frameRect,
              thumbnailRect,
              imageRect,
              naturalWidth,
              naturalHeight
            };
          }
          const canvas = document.createElement("canvas");
          canvas.width = naturalWidth;
          canvas.height = naturalHeight;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) {
            return {
              status: "missing-canvas-context",
              gridRect,
              frameRect,
              thumbnailRect,
              imageRect,
              naturalWidth,
              naturalHeight
            };
          }
          try {
            context.clearRect(0, 0, naturalWidth, naturalHeight);
            context.drawImage(image, 0, 0, naturalWidth, naturalHeight);
            const pixels = context.getImageData(0, 0, naturalWidth, naturalHeight).data;
            let minX = naturalWidth;
            let minY = naturalHeight;
            let maxX = -1;
            let maxY = -1;
            let alphaPixelCount = 0;
            for (let y = 0; y < naturalHeight; y += 1) {
              for (let x = 0; x < naturalWidth; x += 1) {
                const alpha = pixels[(y * naturalWidth + x) * 4 + 3];
                if (alpha <= 8) continue;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                alphaPixelCount += 1;
              }
            }
            if (maxX < minX || maxY < minY) {
              return {
                status: "empty-alpha",
                gridRect,
                frameRect,
                thumbnailRect,
                imageRect,
                naturalWidth,
                naturalHeight,
                alphaPixelCount: 0
              };
            }
            const alphaBounds = {
              minX,
              minY,
              maxX,
              maxY,
              width: maxX - minX + 1,
              height: maxY - minY + 1
            };
            const contentRect = computeContainRect(imageRect, naturalWidth, naturalHeight);
            const scaleX = contentRect ? contentRect.width / naturalWidth : 0;
            const scaleY = contentRect ? contentRect.height / naturalHeight : 0;
            const visibleAlphaRect =
              contentRect && gridRect
                ? {
                    x: round(contentRect.x + alphaBounds.minX * scaleX - gridRect.x),
                    y: round(contentRect.y + alphaBounds.minY * scaleY - gridRect.y),
                    width: round(alphaBounds.width * scaleX),
                    height: round(alphaBounds.height * scaleY)
                  }
                : null;
            const visibleAlphaWidthRatio =
              visibleAlphaRect && gridRect?.width ? visibleAlphaRect.width / gridRect.width : 0;
            const visibleAlphaHeightRatio =
              visibleAlphaRect && gridRect?.height ? visibleAlphaRect.height / gridRect.height : 0;
            return {
              status: "ready",
              gridRect,
              frameRect,
              thumbnailRect,
              imageRect,
              contentRect: contentRect
                ? {
                    x: round(contentRect.x),
                    y: round(contentRect.y),
                    width: round(contentRect.width),
                    height: round(contentRect.height)
                  }
                : null,
              naturalWidth,
              naturalHeight,
              alphaBounds,
              alphaPixelCount,
              alphaCoverageRatio: round(alphaPixelCount / (naturalWidth * naturalHeight)),
              visibleAlphaRect,
              visibleAlphaWidthRatio: round(visibleAlphaWidthRatio),
              visibleAlphaHeightRatio: round(visibleAlphaHeightRatio),
              visibleAlphaLongAxisFillRatio: round(Math.max(visibleAlphaWidthRatio, visibleAlphaHeightRatio)),
              visibleAlphaShortAxisFillRatio: round(Math.min(visibleAlphaWidthRatio, visibleAlphaHeightRatio))
            };
          } catch (error) {
            return {
              status: "read-error",
              error: error instanceof Error ? error.message : String(error),
              gridRect,
              frameRect,
              thumbnailRect,
              imageRect,
              naturalWidth,
              naturalHeight
            };
          }
        };
        const thumbnailPixelMetrics = readImagePixelMetrics();
        return {
          hasRow: Boolean(row),
          rowText: row?.textContent?.trim().replace(/\\s+/g, " ").slice(0, 360) ?? "",
          iconDecodeStatus: decodeStatus?.getAttribute("data-icon-decode-status") ?? "",
          iconDecodeMessage: decodeStatus?.getAttribute("data-icon-decode-message") ?? "",
          iconDecodeCacheKey: decodeStatus?.getAttribute("data-icon-cache-key") ?? "",
          hasInventoryGrid: Boolean(grid),
          inventoryGridClassName: gridClassName,
          hasModelThumbnailSource: gridClassName.includes("items-mode-inventory-icon-model"),
          gridWidth: grid?.getAttribute("data-grid-width") ?? "",
          gridHeight: grid?.getAttribute("data-grid-height") ?? "",
          gridCells: grid?.getAttribute("data-grid-cells") ?? "",
          gridLabel: grid?.getAttribute("aria-label") ?? "",
          gridTitle: grid?.getAttribute("title") ?? "",
          hasImage: Boolean(image),
          imageAlt: image?.getAttribute("alt") ?? "",
          imageSourceKind: imageSrc.startsWith("data:image/")
            ? thumbnailRendered
              ? "rendered-data-url"
              : "decoded-data-url"
            : imageSrc
              ? "asset-url"
              : "",
          imageSourcePrefix: imageSrc.slice(0, 80),
          imageSourceDataUrl: imageSrc.startsWith("data:image/")
            ? imageSrc
            : "",
          thumbnailClassName,
          thumbnailModelSourceCount: thumbnail?.getAttribute("data-thumbnail-model-source-count") ?? "",
          thumbnailRenderEnabled: thumbnail?.getAttribute("data-thumbnail-render-enabled") ?? "",
          thumbnailForceRender: thumbnail?.getAttribute("data-thumbnail-force-render") ?? "",
          thumbnailVisible: thumbnail?.getAttribute("data-thumbnail-visible") ?? "",
          thumbnailStatus: thumbnail?.getAttribute("data-thumbnail-status") ?? "",
          thumbnailLoadError: thumbnail?.getAttribute("data-thumbnail-load-error") ?? "",
          thumbnailRenderMode: thumbnail?.getAttribute("data-thumbnail-render-mode") ?? "",
          thumbnailImageWidth: thumbnail?.getAttribute("data-thumbnail-image-width") ?? "",
          thumbnailImageHeight: thumbnail?.getAttribute("data-thumbnail-image-height") ?? "",
          thumbnailPixelMetrics,
          visualSupportLabel: visualStatus?.textContent?.trim() ?? "",
          visualSupportCode: visualStatus?.getAttribute("data-visual-support-code") ?? "",
          visualSupportKind: visualStatus?.getAttribute("data-visual-support-kind") ?? "",
          visualSupportTone: visualStatus?.getAttribute("data-visual-support-tone") ?? "",
          visualSupportDetail: visualStatus?.getAttribute("title") ?? ""
        };
      })()`,
      10000
    );
    const needsRenderedModelThumbnail = last?.hasModelThumbnailSource === true;
    const hasRenderedModelThumbnail =
      typeof last?.thumbnailClassName === "string" &&
      last.thumbnailClassName.includes("scene-object-thumbnail-rendered");
    const hasThumbnailPixelMetrics =
      !needsRenderedModelThumbnail || last?.thumbnailPixelMetrics?.status === "ready";
    if (
      last?.hasInventoryGrid &&
      last?.hasImage &&
      (!needsRenderedModelThumbnail || (hasRenderedModelThumbnail && hasThumbnailPixelMetrics))
    ) {
      return last;
    }
    await delay(250);
  }
  return last;
}

function summarizeVisualMatrixCoverage(results, cases, requestedAngleIds) {
  const requiredCaseIds = cases.map((entry) => entry.id);
  const capturedCaseIds = results.map((entry) => entry.id);
  const missingCaseIds = requiredCaseIds.filter((id) => !capturedCaseIds.includes(id));
  const typeCounts = results.reduce((counts, entry) => {
    const key = entry.label || "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const angleCounts = results.reduce((counts, entry) => {
    for (const capture of entry.captures ?? []) {
      counts[capture.angle] = (counts[capture.angle] ?? 0) + 1;
    }
    return counts;
  }, {});
  return {
    requestedCaseIds: requiredCaseIds,
    capturedCaseIds,
    missingCaseIds,
    typeCounts,
    angleCounts,
    requestedAngles:
      requestedAngleIds.size > 0
        ? [...requestedAngleIds]
        : ["front", "side", "back", "top-oblique"],
    fullDefaultCaseSet: requiredCaseIds.length >= 7 && missingCaseIds.length === 0
  };
}

function evaluateThumbnailQuality(entry, state) {
  if (entry.expectedSourceIssue === true) {
    return {
      ready: true,
      status: "expected-source-issue",
      reasons: [],
      metrics: null
    };
  }

  const reasons = [];
  const metrics = state.thumbnailPixelMetrics ?? null;
  const hasModelThumbnailSource = state.hasModelThumbnailSource === true;
  const imageSourceKind = state.imageSourceKind ?? "";
  const usesRealImage =
    imageSourceKind === "rendered-data-url" ||
    imageSourceKind === "decoded-data-url" ||
    imageSourceKind === "asset-url";

  if (state.hasInventoryGrid !== true) {
    reasons.push("missing-inventory-grid");
  }
  if (state.hasImage !== true || !usesRealImage) {
    reasons.push("missing-real-image");
  }
  if (!metrics || metrics.status !== "ready") {
    reasons.push(`pixel-metrics-${metrics?.status ?? "missing"}`);
  } else {
    const longFill = Number(metrics.visibleAlphaLongAxisFillRatio ?? 0);
    const visibleRect = metrics.visibleAlphaRect ?? null;
    const naturalLong = Math.max(
      Number(metrics.alphaBounds?.width ?? 0),
      Number(metrics.alphaBounds?.height ?? 0)
    );
    const minLongFill = hasModelThumbnailSource ? 0.66 : 0.48;
    const minNaturalLong = hasModelThumbnailSource ? 28 : 12;
    if (!Number.isFinite(longFill) || longFill < minLongFill) {
      reasons.push("thumbnail-underfills-frame");
    }
    if (!Number.isFinite(naturalLong) || naturalLong < minNaturalLong) {
      reasons.push("thumbnail-low-source-resolution");
    }
    if (
      visibleRect &&
      (Number(visibleRect.width ?? 0) < 5 || Number(visibleRect.height ?? 0) < 5)
    ) {
      reasons.push("thumbnail-visible-bounds-too-small");
    }
  }

  return {
    ready: reasons.length === 0,
    status: reasons.length === 0 ? "ready" : "issue",
    reasons,
    metrics: metrics
      ? {
          status: metrics.status ?? "",
          naturalWidth: metrics.naturalWidth ?? 0,
          naturalHeight: metrics.naturalHeight ?? 0,
          alphaBounds: metrics.alphaBounds ?? null,
          alphaCoverageRatio: metrics.alphaCoverageRatio ?? null,
          visibleAlphaRect: metrics.visibleAlphaRect ?? null,
          visibleAlphaWidthRatio: metrics.visibleAlphaWidthRatio ?? null,
          visibleAlphaHeightRatio: metrics.visibleAlphaHeightRatio ?? null,
          visibleAlphaLongAxisFillRatio: metrics.visibleAlphaLongAxisFillRatio ?? null,
          visibleAlphaShortAxisFillRatio: metrics.visibleAlphaShortAxisFillRatio ?? null
        }
      : null
  };
}

function summarizeThumbnailReadiness(results) {
  const entries = results.map((entry) => {
    const state = entry.selectedRowState ?? {};
    const captures = entry.captures ?? [];
    const frontCapture = captures.find((capture) => capture.angle === "front") ?? captures[0] ?? {};
    const hasModelThumbnail =
      typeof state.thumbnailClassName === "string" &&
      state.thumbnailClassName.includes("scene-object-thumbnail-rendered");
    const hasIconFallback =
      typeof state.thumbnailClassName === "string" &&
      state.thumbnailClassName.includes("scene-object-thumbnail-fallback");
    const hasDecodedImage = state.imageSourceKind === "decoded-data-url";
    const hasRenderedImage = state.imageSourceKind === "rendered-data-url";
    const hasAssetImage = state.imageSourceKind === "asset-url";
    const thumbnailQuality = evaluateThumbnailQuality(entry, state);
    return {
      id: entry.id,
      resRef: entry.resRef,
      label: entry.label,
      expectedSourceIssue: entry.expectedSourceIssue === true,
      hasInventoryGrid: state.hasInventoryGrid === true,
      hasImage: state.hasImage === true,
      imageSourceKind: state.imageSourceKind ?? "",
      thumbnailClassName: state.thumbnailClassName ?? "",
      visualSupportCode: state.visualSupportCode ?? "",
      visualSupportKind: state.visualSupportKind ?? "",
      visualSupportLabel: state.visualSupportLabel ?? "",
      visualSupportDetail: state.visualSupportDetail ?? "",
      previewMode: frontCapture.previewMode ?? "",
      screenVisible: frontCapture.screenVisible === true,
      screenBounds: frontCapture.screenBounds ?? null,
      frontFacingProof: frontCapture.angle === "front" && frontCapture.screenVisible === true,
      thumbnailRenderMode: state.thumbnailRenderMode ?? "",
      thumbnailImageWidth: state.thumbnailImageWidth ?? "",
      thumbnailImageHeight: state.thumbnailImageHeight ?? "",
      thumbnailQuality,
      ready:
        entry.expectedSourceIssue === true
          ? Boolean(state.visualSupportCode)
          : state.hasInventoryGrid === true &&
            state.hasImage === true &&
            (hasModelThumbnail || hasIconFallback || hasRenderedImage || hasDecodedImage || hasAssetImage) &&
            thumbnailQuality.ready === true
    };
  });
  return {
    readyCount: entries.filter((entry) => entry.ready).length,
    totalCount: entries.length,
    missing: entries.filter((entry) => !entry.ready),
    entries
  };
}

function summarizeSourceBlockedEvidence(results) {
  const entries = results
    .filter((entry) => entry.expectedSourceIssue === true)
    .map((entry) => ({
      id: entry.id,
      resRef: entry.resRef,
      visualSupportCode: entry.selectedRowState?.visualSupportCode ?? "",
      visualSupportKind: entry.selectedRowState?.visualSupportKind ?? "",
      visualSupportLabel: entry.selectedRowState?.visualSupportLabel ?? "",
      visualSupportDetail: entry.selectedRowState?.visualSupportDetail ?? "",
      rowText: entry.selectedRowState?.rowText ?? "",
      captures: (entry.captures ?? []).map((capture) => ({
        angle: capture.angle,
        previewMode: capture.previewMode,
        meshCount: capture.meshCount,
        screenVisible: capture.screenVisible,
        screenshot: capture.screenshot?.path ?? "",
        snapshotPath: capture.snapshotPath ?? ""
      }))
    }));
  return {
    count: entries.length,
    withExplicitCodeCount: entries.filter((entry) => entry.visualSupportCode).length,
    entries
  };
}

async function reloadItemsMode(send) {
  await send("Page.navigate", { url: `${baseUrl}/app?mode=items_mode` }, 30000);
  await waitForExpression(
    send,
    'document.querySelector("[aria-label=\\"items mode section\\"]") !== null && document.querySelector("input[aria-label=\\"Filter items\\"]") !== null',
    60000
  );
  await waitForExpression(send, 'document.querySelector("[aria-label=\\"workspace render canvas\\"]") !== null', 30000);
}

async function captureMatrixCaseAttempt(send, entry) {
  await selectItemByResRef(
    send,
    entry.resRef,
    entry.preferredSceneObjectId ?? "",
    entry.searchHints ?? []
  );
  await waitForRenderableProof(send, `${entry.id}-settled`, entry.settleTimeoutMs ?? 90000, entry);
  const inspectorState = await readItemInspectorState(send);
  const selectedRowState = await readSelectedItemRowState(send, entry.resRef);
  await evaluate(
    send,
    `(() => {
      const row = document.querySelector("button.scene-object-row.is-selected");
      row?.scrollIntoView({ block: "center", inline: "nearest" });
      return Boolean(row);
    })()`,
    10000
  );
  const captures = [];
  for (const angle of entry.angles) {
    const label = `${entry.id}-${angle.id}`;
    const cameraOk = await evaluate(send, cameraScript(angle, entry.camera));
    assert(cameraOk, "Unable to set visual matrix camera", { label });
    await delay(450);
    const snapshot = await waitForRenderableProof(
      send,
      label,
      entry.renderProofTimeoutMs ?? 60000,
      entry
    );
    await waitForVisualLoadingOverlayCleared(send, label, 120000);
    const jsonPath = path.join(outDir, `${safeName(label)}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2));
    const shot = await screenshot(send, `${safeName(label)}.png`);
    const object = snapshot.objects[0] ?? null;
    captures.push({
      angle: angle.id,
      screenshot: shot,
      snapshotPath: jsonPath,
      meshCount: object?.meshCount ?? 0,
      materialCount: object?.materialCount ?? 0,
      previewMode: object?.preview?.mode ?? "",
      textureStatus: object?.sharedRenderer?.textureStatus ?? "",
      iconStatus: object?.preview?.iconStatus ?? "",
      modelTextureLoadStatus: object?.preview?.modelTextureLoadStatus ?? "",
      modelTextureReferenceCount:
        object?.preview?.modelTextureReferenceCount ??
        object?.preview?.textureReferenceCount ??
        0,
      modelTextureLoadedCount: object?.preview?.modelTextureLoadedCount ?? 0,
      runtimeEffectStatus: object?.preview?.runtimeEffectStatus ?? "",
      runtimeEffectMode: object?.preview?.runtimeEffectMode ?? "",
      danglymeshStatus: object?.preview?.danglymeshStatus ?? "",
      danglymeshMeshCount: object?.preview?.danglymeshMeshCount ?? 0,
      danglymeshNodeNames: object?.preview?.danglymeshNodeNames ?? [],
      materialMapReferenceCount: object?.materialEvidence?.mapReferences?.length ?? 0,
      materialTextureReferenceCount: object?.materialEvidence?.textureReferences?.length ?? 0,
      expectedPreviewModes: entry.expectedPreviewModes ?? [],
      expectedMinMeshCount: entry.expectedMinMeshCount ?? 1,
      expectedSourceIssue: entry.expectedSourceIssue === true,
      screenVisible: object?.screenVisible ?? false,
      screenBounds: object?.screenBounds ?? null,
      worldBounds: object?.worldBounds ?? ""
    });
  }
  const finalSelectedRowState = await readSelectedItemRowState(send, entry.resRef, 15000);
  return {
    ...entry,
    inspectorState,
    selectedRowState: finalSelectedRowState ?? selectedRowState,
    initialSelectedRowState: selectedRowState,
    captures
  };
}

async function captureMatrixCase(send, entry) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await captureMatrixCaseAttempt(send, entry);
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        try {
          await reloadItemsMode(send);
          await delay(1500);
        } catch (reloadError) {
          error.details = {
            ...(error.details ?? {}),
            reloadError: reloadError?.message ?? String(reloadError)
          };
          break;
        }
      }
    }
  }
  throw lastError;
}

async function runCapture() {
  assert(fs.existsSync(chromePath), "Chrome executable missing", { chromePath });
  let backend = null;
  let vite = null;
  let chrome = null;
  let cdp = null;
  let stderr = "";
  try {
    if (managedServers) {
      backend = spawnManaged(process.execPath, ["dist/src/main.js"], {
        cwd: path.join(repoRoot, "backend"),
        env: {
          ...process.env,
          PORT: String(managedBackendPort),
          AUTH_REPOSITORY_DRIVER: "memory",
          AURORA_HOST_LOCAL_RUNTIME: "true"
        }
      });
      vite = spawnManaged(
        process.execPath,
        [
          "node_modules/vite/bin/vite.js",
          "--host",
          "127.0.0.1",
          "--port",
          String(managedFrontendPort),
          "--configLoader",
          "runner",
          "--strictPort"
        ],
        {
          cwd: frontendRoot,
          env: {
            ...process.env,
            BACKEND_PROXY_TARGET: managedBackendBaseUrl
          }
        }
      );
      await waitForHttp(`${managedBackendBaseUrl}/api/v1/health`, 90000);
      await waitForHttp(`${baseUrl}/app`, 90000);
    }

    const authState = await buildAuthState();
    const requestedCaseIds = new Set(
      (process.env.ITEM_VISUAL_MATRIX_CASES ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    );
    const requestedAngleIds = new Set(
      (process.env.ITEM_VISUAL_MATRIX_ANGLES ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    );
    const externalCaseResRefs = readExternalCaseResRefs();
    const shouldRunCase = (id) => requestedCaseIds.size < 1 || requestedCaseIds.has(id);
    const wantsCustomWizard =
      externalCaseResRefs.length === 0 && shouldRunCase("custom-wizard-armor");
    const suffix = String(Date.now()).slice(-5);
    const wizardResRef = `vmarmor${suffix}`.slice(0, 16);
    const cleanupGenerated = wantsCustomWizard
      ? await cleanupVisualMatrixItemBlueprints(authState.token)
      : { deleted: [], failed: [] };
    const cleanupBefore = wantsCustomWizard
      ? await cleanupItemBlueprint(authState.token, wizardResRef)
      : { resRef: wizardResRef, skipped: true };

    chrome = spawn(
    chromePath,
    [
      `--remote-debugging-port=${port}`,
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
      `${baseUrl}/login`
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
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

    await send("Page.navigate", { url: `${baseUrl}/login` }, 30000);
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
    await send("Page.navigate", { url: `${baseUrl}/app?mode=items_mode` }, 30000);
    await waitForExpression(
      send,
      'document.querySelector("[aria-label=\\"items mode section\\"]") !== null && document.body.textContent.includes("New Item")',
      60000
    );
    let customWizard = null;

    const filterRequestedAngles = (angles) =>
      angles.filter((entry) => requestedAngleIds.size < 1 || requestedAngleIds.has(entry.id));
    const standardAngles = filterRequestedAngles([
      { id: "front", yaw: 90, elevation: 18 },
      { id: "side", yaw: 0, elevation: 18 },
      { id: "back", yaw: 270, elevation: 18 },
      { id: "top-oblique", yaw: 45, elevation: 62 }
    ]);
    const shieldAngles = filterRequestedAngles([
      { id: "front", yaw: 0, elevation: 18 },
      { id: "side", yaw: 90, elevation: 18 },
      { id: "back", yaw: 180, elevation: 18 },
      { id: "top-oblique", yaw: 45, elevation: 62 }
    ]);
    const smallCamera = { targetX: 0.5, targetY: 0.34, targetZ: 0.5, distance: 2.15 };
    const bodyCamera = { targetX: 0.5, targetY: 0.82, targetZ: 0.5, distance: 3.05 };
    const defaultCases = [
      {
        id: "single-part-gem-nw-it-gem001",
        label: "single-part item",
        resRef: "nw_it_gem001",
        expectedPreviewModes: ["icon-fallback"],
        expectedMinMeshCount: 1,
        camera: smallCamera,
        angles: standardAngles
      },
      {
        id: "custom-wizard-armor",
        label: "custom wizard item",
        resRef: wizardResRef,
        preferredSceneObjectId: "",
        expectedPreviewModes: ["armor-part-assets"],
        expectedMinMeshCount: 17,
        settleTimeoutMs: 300000,
        renderProofTimeoutMs: 300000,
        camera: bodyCamera,
        angles: standardAngles
      },
      {
        id: "three-part-weapon-nw-wswmls002",
        label: "three-part weapon",
        resRef: "nw_wswmls002",
        searchHints: ["longsword", "wswls"],
        expectedPreviewModes: ["model-part-assets"],
        expectedMinMeshCount: 4,
        settleTimeoutMs: 120000,
        renderProofTimeoutMs: 120000,
        camera: smallCamera,
        angles: standardAngles
      },
      {
        id: "shield-nw-ashlw001",
        label: "shield",
        resRef: "nw_ashlw001",
        searchHints: ["Large Shield", "largeshield"],
        expectedPreviewModes: ["model-part-assets"],
        expectedMinMeshCount: 1,
        camera: { targetX: 0.5, targetY: 0.42, targetZ: 0.5, distance: 2.25 },
        angles: shieldAngles
      },
      {
        id: "armor-aarcl009",
        label: "armor multi-part",
        resRef: "aarcl009",
        expectedPreviewModes: ["armor-part-assets"],
        expectedMinMeshCount: 17,
        settleTimeoutMs: 180000,
        renderProofTimeoutMs: 180000,
        camera: bodyCamera,
        angles: standardAngles
      },
      {
        id: "robe-cloak-l-cloak-0",
        label: "robe/cloak",
        resRef: "l_cloak_0",
        expectedPreviewModes: ["model-part-assets"],
        expectedMinMeshCount: 20,
        settleTimeoutMs: 120000,
        renderProofTimeoutMs: 120000,
        camera: bodyCamera,
        angles: standardAngles
      },
      {
        id: "potion-nw-it-mpotion002",
        label: "potion/scroll/misc",
        resRef: "nw_it_mpotion002",
        expectedPreviewModes: ["model-part-assets"],
        expectedMinMeshCount: 1,
        camera: smallCamera,
        angles: standardAngles
      }
    ];
    const sourceIssueAngles = filterRequestedAngles([{ id: "front", yaw: 90, elevation: 18 }]);
    const externalCasesAreSourceIssues =
      process.env.ITEM_VISUAL_MATRIX_EXTERNAL_EXPECT_SOURCE_ISSUE !== "0";
    const externalCases = externalCaseResRefs.map((resRef, index) => ({
      id: `source-issue-${String(index + 1).padStart(3, "0")}-${safeName(resRef)}`,
      label: "source-blocked item visual issue",
      resRef,
      expectedPreviewModes: [
        "metadata-only",
        "icon-fallback",
        "model-part-assets-missing",
        "armor-part-assets-missing",
        "model-part-assets",
        "armor-part-assets"
      ],
      expectedMinMeshCount: 0,
      expectedSourceIssue: externalCasesAreSourceIssues,
      settleTimeoutMs: 90000,
      renderProofTimeoutMs: 90000,
      camera: smallCamera,
      angles: sourceIssueAngles
    }));
    const cases = (externalCases.length > 0 ? externalCases : defaultCases).filter((entry) =>
      shouldRunCase(entry.id)
    );

    const results = [];
    const failures = [];
    const progressPath = path.join(outDir, "24-item-visual-matrix-progress.json");
    const writeProgressSummary = () => {
      fs.writeFileSync(
        progressPath,
        JSON.stringify(
          {
            capturedAt: new Date().toISOString(),
            baseUrl,
            outDir,
            cleanupGenerated,
            cleanupBefore,
            customWizard,
            totalCases: cases.length,
            capturedCases: results.length,
            failedCases: failures.length,
            results,
            failures
          },
          null,
          2
        )
      );
    };
    for (const entry of cases) {
      try {
        let captureEntry = entry;
        if (entry.id === "custom-wizard-armor") {
          customWizard = await createCustomArmorThroughWizard(send, wizardResRef);
          captureEntry = {
            ...entry,
            resRef: customWizard.resRef,
            preferredSceneObjectId: customWizard.sceneObjectId ?? ""
          };
        }
        results.push(await captureMatrixCase(send, captureEntry));
      } catch (error) {
        failures.push({
          id: entry.id,
          resRef: entry.id === "custom-wizard-armor" ? wizardResRef : entry.resRef,
          message: error.message,
          details: error.details ?? null
        });
      }
      writeProgressSummary();
    }

    const isCaptureIssue = (capture) => {
      const expectedModes = capture.expectedPreviewModes ?? [];
      const modeMismatch =
        expectedModes.length > 0 && !expectedModes.includes(capture.previewMode);
      const expectedMinMeshCount = capture.expectedMinMeshCount ?? 1;
      const iconFallbackNotReady =
        capture.previewMode === "icon-fallback" &&
        capture.textureStatus !== "applied" &&
        capture.iconStatus !== "applied";
      const modelTexturesMissing =
        (capture.previewMode === "model-part-assets" ||
          capture.previewMode === "armor-part-assets") &&
        capture.modelTextureReferenceCount > 0 &&
        capture.materialMapReferenceCount === 0;
      const modelTexturesIncomplete =
        (capture.previewMode === "model-part-assets" ||
          capture.previewMode === "armor-part-assets") &&
        capture.modelTextureReferenceCount > 0 &&
        capture.modelTextureLoadedCount < capture.modelTextureReferenceCount;
      return (
        capture.meshCount < expectedMinMeshCount ||
        capture.screenVisible !== true ||
        (capture.screenBounds?.width ?? 0) < 8 ||
        (capture.screenBounds?.height ?? 0) < 8 ||
        modeMismatch ||
        iconFallbackNotReady ||
        modelTexturesMissing ||
        modelTexturesIncomplete
      );
    };
    const coverage = summarizeVisualMatrixCoverage(results, cases, requestedAngleIds);
    const thumbnailReadiness = summarizeThumbnailReadiness(results);
    const thumbnailIssueIds = new Set(
      thumbnailReadiness.entries
        .filter((entry) => entry.expectedSourceIssue !== true && entry.ready !== true)
        .map((entry) => entry.id)
    );
    const thumbnailReadinessById = new Map(
      thumbnailReadiness.entries.map((entry) => [entry.id, entry])
    );
    const issueCases = results.filter((entry) =>
      entry.expectedSourceIssue === true ||
      thumbnailIssueIds.has(entry.id) ||
      entry.captures.some((capture) => capture.expectedSourceIssue === true || isCaptureIssue(capture))
    );
    const sourceBlockedEvidence = summarizeSourceBlockedEvidence(results);
    const summary = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      outDir,
      cleanupGenerated,
      cleanupBefore,
      customWizard,
      totalCases: cases.length,
      capturedCases: results.length,
      failedCases: failures.length,
      issueCaseCount: issueCases.length,
      expectedSourceIssueCaseCount: results.filter((entry) => entry.expectedSourceIssue === true)
        .length,
      coverage,
      thumbnailReadiness,
      sourceBlockedEvidence,
      issueCases: issueCases.map((entry) => ({
        id: entry.id,
        resRef: entry.resRef,
        expectedSourceIssue: entry.expectedSourceIssue === true,
        visualSupportCode: entry.selectedRowState?.visualSupportCode ?? "",
        visualSupportKind: entry.selectedRowState?.visualSupportKind ?? "",
        thumbnailQuality: thumbnailReadinessById.get(entry.id)?.thumbnailQuality ?? null,
        captures: entry.captures.map((capture) => ({
          angle: capture.angle,
          meshCount: capture.meshCount,
          screenVisible: capture.screenVisible,
          screenBounds: capture.screenBounds,
          previewMode: capture.previewMode,
          textureStatus: capture.textureStatus,
          iconStatus: capture.iconStatus,
          modelTextureLoadStatus: capture.modelTextureLoadStatus,
          modelTextureReferenceCount: capture.modelTextureReferenceCount,
          modelTextureLoadedCount: capture.modelTextureLoadedCount,
          materialMapReferenceCount: capture.materialMapReferenceCount,
          materialTextureReferenceCount: capture.materialTextureReferenceCount,
          expectedPreviewModes: capture.expectedPreviewModes,
          expectedMinMeshCount: capture.expectedMinMeshCount,
          expectedSourceIssue: capture.expectedSourceIssue === true,
          screenshot: capture.screenshot.path,
          snapshotPath: capture.snapshotPath
        }))
      })),
      results,
      failures,
      managedServers,
      managedBackendBaseUrl: managedServers ? managedBackendBaseUrl : null,
      managedFrontendPort: managedServers ? managedFrontendPort : null,
      backendOutput: backend?.output?.() ?? null,
      viteOutput: vite?.output?.() ?? null,
      chromeStderrTail: stderr.slice(-1600)
    };
    const summaryPath = path.join(outDir, "24-item-visual-matrix-summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ ok: failures.length === 0, summaryPath, issueCaseCount: issueCases.length, failures }, null, 2));
  } finally {
    if (cdp?.ws) {
      cdp.ws.close();
    }
    chrome?.kill("SIGTERM");
    vite?.kill("SIGTERM");
    backend?.kill("SIGTERM");
  }
}

runCapture().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error.message,
        details: error.details,
        stack: error.stack
      },
      null,
      2
    )
  );
  process.exit(1);
});
