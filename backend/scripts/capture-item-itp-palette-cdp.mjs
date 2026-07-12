import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(repoRoot, ".codex-tmp", "item-proof-all");
const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = Number(process.env.ITEM_ITP_CAPTURE_CDP_PORT ?? 9552);
const profileDir = path.join(outDir, `chrome-cdp-profile-itp-${Date.now()}`);
const baseUrl = process.env.ITEM_CAPTURE_BASE_URL ?? "http://127.0.0.1:5173";
const apiBase = `${baseUrl}/_aurora/v1`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

fs.mkdirSync(outDir, { recursive: true });

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function requestJson(method, url, body, headers = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => null);
  assert(response.ok, `${method} ${url} failed`, { status: response.status, payload });
  return payload;
}

async function postJson(url, body, headers = {}) {
  return requestJson("POST", url, body, headers);
}

async function getJson(url, headers = {}) {
  return requestJson("GET", url, null, headers);
}

async function waitForCdpPage() {
  const deadline = Date.now() + 30000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const tabs = await getJson(`http://127.0.0.1:${port}/json/list`);
      const page = tabs.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
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
      resolve({ send, ws });
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
        entry.resolve(message.result);
      }
    });
    ws.addEventListener("error", (event) => reject(event.error ?? new Error("CDP websocket error")));
  });
}

async function evaluate(send, expression, timeoutMs = 30000) {
  const result = await send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    timeoutMs
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime.evaluate exception");
  }
  return result.result?.value;
}

async function waitForExpression(send, expression, timeoutMs = 30000, intervalMs = 250) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    lastValue = await evaluate(send, expression).catch((error) => ({ error: error.message }));
    if (lastValue === true) {
      return true;
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
  const filePath = path.join(outDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(result.data, "base64"));
  return { path: filePath, bytes: fs.statSync(filePath).size };
}

async function clickButtonByAria(send, ariaLabel) {
  const ok = await evaluate(
    send,
    `(() => {
      const button = Array.from(document.querySelectorAll("button")).find((entry) =>
        entry.getAttribute("aria-label") === ${JSON.stringify(ariaLabel)} && !entry.disabled
      );
      button?.click();
      return Boolean(button);
    })()`
  );
  assert(ok, `Button not found: ${ariaLabel}`);
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

async function runCapture() {
  assert(fs.existsSync(chromePath), "Chrome executable missing", { chromePath });
  const authState = await buildAuthState();
  const chrome = spawn(
    chromePath,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1366,768",
      "about:blank"
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  let stderr = "";
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  let cdp;
  try {
    cdp = await connectCdp((await waitForCdpPage()).webSocketDebuggerUrl);
    const { send } = cdp;
    await send("Page.enable");
    await send("Runtime.enable");
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
        JSON.stringify(authState)
      )}); localStorage.setItem("aurora_web.workspace_mode.v1", "areas_mode"); true;`
    );
    await send("Page.navigate", { url: `${baseUrl}/app?mode=areas_mode` }, 30000);
    await waitForExpression(send, 'document.querySelector("[aria-label=\\"Add Objects\\"]") !== null', 60000);
    await waitForExpression(
      send,
      'Array.from(document.querySelectorAll("button")).some((button) => (button.getAttribute("title") || "").startsWith("_winds_study /"))',
      60000
    );

    const selectedAreaRow = await evaluate(
      send,
      `(() => {
        const row = Array.from(document.querySelectorAll("button")).find((button) =>
          (button.getAttribute("title") || "").startsWith("_winds_study /")
        );
        row?.click();
        return Boolean(row);
      })()`
    );
    assert(selectedAreaRow, "_winds_study area row was not available for selection");
    await clickButtonByAria(send, "Open Selected Area");
    await waitForExpression(
      send,
      'document.body.textContent.includes("_winds_study") && !document.body.textContent.includes("No area opened")',
      60000
    );
    await clickButtonByAria(send, "Add Objects");
    await waitForExpression(
      send,
      'document.querySelectorAll(".scene-object-add-list > li").length > 0',
      60000
    );
    await waitForExpression(
      send,
      `Array.from(document.querySelectorAll('[aria-label="Object family palette"] button')).some((button) => {
        const label = button.getAttribute("aria-label") || "";
        const match = /^Items family, (\\d+) templates$/.exec(label);
        return match && Number(match[1]) > 0 && !button.disabled;
      })`,
      90000
    );
    const clickedItems = await evaluate(
      send,
      `(() => {
        const button = Array.from(document.querySelectorAll("button")).find((entry) =>
          (entry.getAttribute("aria-label") || "").startsWith("Items family") && !entry.disabled
        );
        button?.click();
        return Boolean(button);
      })()`
    );
    assert(clickedItems, "Items family button was not clickable");
    await waitForExpression(
      send,
      'document.querySelector(".scene-objects-active-family")?.textContent?.includes("Items")',
      30000
    );
    await waitForExpression(
      send,
      'document.querySelector("select[aria-label=\\"Add item palette category\\"]")?.options?.length > 1',
      90000
    );

    const paletteState = await evaluate(
      send,
      `(() => {
        const select = document.querySelector('select[aria-label="Add item palette category"]');
        const options = Array.from(select.options).map((option) => ({
          value: option.value,
          text: option.textContent.replace(/\\s+/g, " ").trim()
        }));
        const folderOption =
          options.find((option) => /weapons/i.test(option.text) && /\\d+ items/.test(option.text)) ??
          options.find((option) => option.value !== "all" && /\\d+ items/.test(option.text));
        if (!folderOption) {
          return { ok: false, optionCount: options.length, sampleOptions: options.slice(0, 80) };
        }
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
        setter.call(select, folderOption.value);
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return {
          ok: true,
          selected: folderOption,
          optionCount: options.length,
          sampleOptions: options.slice(0, 80)
        };
      })()`
    );
    assert(paletteState.ok, "No folder-like ITP palette option was available", paletteState);
    await waitForExpression(
      send,
      `document.querySelector('select[aria-label="Add item palette category"]')?.value === ${JSON.stringify(
        paletteState.selected.value
      )}`,
      30000
    );
    await waitForExpression(
      send,
      `document.querySelector(".scene-objects-item-palette-filter")?.textContent?.includes("resrefs from")`,
      30000
    );
    await delay(500);
    const filteredState = await evaluate(
      send,
      `(() => ({
        activeFamily: document.querySelector(".scene-objects-active-family")?.textContent?.replace(/\\s+/g, " ").trim() ?? null,
        selectedValue: document.querySelector('select[aria-label="Add item palette category"]')?.value ?? null,
        selectedText: document.querySelector('select[aria-label="Add item palette category"] option:checked')?.textContent?.replace(/\\s+/g, " ").trim() ?? null,
        paletteSummary: document.querySelector(".scene-objects-item-palette-filter small")?.textContent?.replace(/\\s+/g, " ").trim() ?? null,
        visibleRows: Array.from(document.querySelectorAll(".scene-object-add-list > li"))
          .map((li) => li.textContent.replace(/\\s+/g, " ").trim())
          .slice(0, 8),
        categoryText: document.querySelector('[aria-label="Item palette categories"]')?.textContent?.replace(/\\s+/g, " ").trim() ?? null
      }))()`
    );
    assert(filteredState.paletteSummary?.includes("resrefs from"), "Palette summary did not expose source", filteredState);
    assert(filteredState.visibleRows.length > 0, "ITP palette filter returned no visible rows", filteredState);

    await evaluate(
      send,
      `(() => {
        document.querySelector(".scene-objects-item-palette-filter")?.scrollIntoView({
          block: "center",
          inline: "nearest"
        });
        return true;
      })()`
    );
    await delay(300);
    const proofShot = await screenshot(send, "23-itp-palette-area-add-panel-cdp.png");
    const summary = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      proof: {
        paletteState,
        filteredState
      },
      screenshots: {
        itpPaletteAreaAddPanel: proofShot
      },
      chromeStderrTail: stderr.slice(-1200)
    };
    const summaryPath = path.join(outDir, "23-itp-palette-area-add-panel-summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ ok: true, summaryPath, screenshots: summary.screenshots, proof: summary.proof }, null, 2));
  } finally {
    if (cdp?.ws) {
      cdp.ws.close();
    }
    chrome.kill("SIGTERM");
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
