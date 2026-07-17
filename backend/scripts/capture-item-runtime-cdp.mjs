import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(repoRoot, ".codex-tmp", "item-proof-all");
const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = Number(process.env.ITEM_CAPTURE_CDP_PORT ?? 9550);
const profileDir = path.join(outDir, `chrome-cdp-profile-${Date.now()}`);
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

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  assert(response.ok, `POST ${url} failed`, { status: response.status, payload });
  return payload;
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => null);
  assert(response.ok, `GET ${url} failed`, { status: response.status, payload });
  return payload;
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
          return;
        }
        entry.resolve(message.result ?? {});
      });

      ws.addEventListener("error", (event) =>
        reject(new Error(`CDP websocket error: ${event.message ?? "unknown"}`))
      );
      resolve({ ws, send });
    });
  });
}

async function evaluate(send, expression, timeoutMs = 30000) {
  const result = await send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: true,
      returnByValue: true
    },
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

async function tryWaitForExpression(send, expression, timeoutMs = 3000, intervalMs = 150) {
  try {
    return await waitForExpression(send, expression, timeoutMs, intervalMs);
  } catch {
    return false;
  }
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

function setInputScript(selector, value) {
  return `(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
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
      )}); localStorage.setItem("aurora_web.workspace_mode.v1", "items_mode"); true;`
    );
    await send("Page.navigate", { url: `${baseUrl}/app?mode=items_mode` }, 30000);
    await waitForExpression(
      send,
      'document.querySelector("[aria-label=\\"item generator support\\"]") !== null && document.body.textContent.includes("LTR V1.0")',
      60000
    );
    await delay(1000);
    const generatorState = await evaluate(
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
    const generatorShot = await screenshot(send, "13-item-generator-support-unsupported-cdp.png");

    await evaluate(
      send,
      `localStorage.setItem("aurora_web.workspace_mode.v1", "areas_mode"); true;`
    );
    await send("Page.navigate", { url: `${baseUrl}/app?mode=areas_mode` }, 30000);
    await waitForExpression(
      send,
      'document.querySelector("[aria-label=\\"Add Objects\\"]") !== null',
      60000
    );
    await delay(2000);
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
    await delay(300);
    await evaluate(
      send,
      `(() => {
        const button = document.querySelector("[aria-label=\\"Open Selected Area\\"]");
        button?.click();
        return Boolean(button);
      })()`
    );
    await waitForExpression(
      send,
      'document.body.textContent.includes("_winds_study") && !document.body.textContent.includes("No area opened")',
      60000
    );
    await waitForExpression(
      send,
      'document.body.textContent.includes("Scene Objects") && document.body.textContent.includes("GIT #004")',
      60000
    );

    await evaluate(
      send,
      `(() => {
        const button = document.querySelector("[aria-label=\\"Add Objects\\"]");
        button?.click();
        return Boolean(button);
      })()`
    );
    await waitForExpression(
      send,
      'document.querySelectorAll(".scene-object-add-list > li").length > 0',
      60000
    );
    const windowedState = await evaluate(
      send,
      `(() => ({
        statuses: Array.from(document.querySelectorAll("[role=\\"status\\"]"))
          .map((el) => el.textContent.replace(/\\s+/g, " ").trim())
          .filter(Boolean),
        listItemCount: document.querySelectorAll(".scene-object-add-list > li").length,
        familyLabels: Array.from(document.querySelectorAll("button[aria-label*=\\"family\\"]"))
          .map((button) => ({
            aria: button.getAttribute("aria-label"),
            text: button.textContent.replace(/\\s+/g, " ").trim()
          }))
          .slice(0, 20)
      }))()`
    );
    const addWindowShot = await screenshot(send, "09-add-objects-windowed-full-catalog-cdp.png");

    await evaluate(
      send,
      `(() => {
        const button = Array.from(document.querySelectorAll("button")).find((entry) =>
          (entry.getAttribute("aria-label") || "").startsWith("Creatures family")
        );
        button?.click();
        return Boolean(button);
      })()`
    );
    await waitForExpression(
      send,
      'document.querySelector(".scene-objects-active-family")?.textContent?.includes("Creatures")',
      30000
    );
    await evaluate(
      send,
      setInputScript('article[aria-label="add objects section"] input[aria-label="Filter objects"]', "db_tanarukk")
    );
    await waitForExpression(
      send,
      'document.querySelector("article[aria-label=\\"add objects section\\"] input[aria-label=\\"Filter objects\\"]")?.value === "db_tanarukk" && Array.from(document.querySelectorAll(".scene-object-add-list > li")).some((li) => li.textContent.includes("TM_TANARUKK_SKEW"))',
      30000
    );
    const tanarukkState = await evaluate(
      send,
      `(() => ({
        filterValue: document.querySelector("article[aria-label=\\"add objects section\\"] input[aria-label=\\"Filter objects\\"]")?.value ?? null,
        listItemCount: document.querySelectorAll(".scene-object-add-list > li").length,
        rows: Array.from(document.querySelectorAll(".scene-object-add-list > li"))
          .map((li) => li.textContent.replace(/\\s+/g, " ").trim())
          .slice(0, 20)
      }))()`
    );
    const filterShot = await screenshot(send, "10-add-objects-tanarukk-filter-cdp.png");

    await evaluate(
      send,
      `(() => {
        const button = Array.from(document.querySelectorAll("button")).find((entry) =>
          entry.getAttribute("title") === "Place TM_TANARUKK_SKEW on canvas"
        );
        button?.click();
        return Boolean(button);
      })()`
    );
    await delay(500);
    const clickPlan = await evaluate(
      send,
      `(() => {
        const canvas = document.querySelector("[aria-label=\\"workspace render canvas\\"]");
        const rect = canvas?.getBoundingClientRect();
        const fromRect = rect
          ? (xRatio, yRatio) => ({
              x: Math.round(rect.left + rect.width * xRatio),
              y: Math.round(rect.top + rect.height * yRatio)
            })
          : (xRatio, yRatio) => ({
              x: Math.round(320 + 710 * xRatio),
              y: Math.round(54 + 714 * yRatio)
            });
        return {
          rect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
          points: [
            fromRect(0.25, 0.42),
            fromRect(0.32, 0.45),
            fromRect(0.41, 0.48),
            fromRect(0.36, 0.54),
            fromRect(0.50, 0.52)
          ]
        };
      })()`
    );
    let placedByPoint = null;
    for (const point of clickPlan.points) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
      await send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: point.x,
        y: point.y,
        button: "left",
        clickCount: 1
      });
      await send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: point.x,
        y: point.y,
        button: "left",
        clickCount: 1
      });
      const placed = await tryWaitForExpression(
        send,
        'document.body.textContent.includes("TM_TANARUKK_SKEW scene") || document.body.textContent.includes("Creatures (1)")',
        3000
      );
      if (placed) {
        placedByPoint = point;
        break;
      }
    }
    try {
      await waitForExpression(
        send,
        'document.body.textContent.includes("TM_TANARUKK_SKEW scene") || document.body.textContent.includes("Creatures (1)")',
        5000
      );
    } catch (error) {
      const failedShot = await screenshot(send, "11-area-add-to-area-tanarukk-failed-cdp.png");
      const debug = await evaluate(
        send,
        `(() => ({
          clickPlan: ${JSON.stringify(clickPlan)},
          placedByPoint: ${JSON.stringify(placedByPoint)},
          failedShot: ${JSON.stringify(failedShot)},
          armedRows: Array.from(document.querySelectorAll(".scene-object-add-row.is-armed"))
            .map((row) => row.textContent.replace(/\\s+/g, " ").trim()),
          sceneText: Array.from(document.querySelectorAll("button"))
            .map((button) => button.textContent.replace(/\\s+/g, " ").trim())
            .filter((text) => /TM_TANARUKK|Creatures|Scene Objects|GIT|PLC/.test(text))
            .slice(0, 80)
        }))()`
      );
      error.details = debug;
      throw error;
    }
    const addToAreaState = { clickPlan, placedByPoint };
    const placedShot = await screenshot(send, "11-area-add-to-area-tanarukk-cdp.png");

    await evaluate(
      send,
      `(() => {
        const button = Array.from(document.querySelectorAll("button")).find((entry) =>
          (entry.getAttribute("title") || "").includes("Open properties for TM_TANARUKK_SKEW")
        );
        button?.click();
        return Boolean(button);
      })()`
    );
    await waitForExpression(
      send,
      'document.body.textContent.includes("Inventory") && document.body.textContent.includes("Creature Properties")',
      30000
    );
    await evaluate(
      send,
      `(() => {
        const button = Array.from(document.querySelectorAll("button")).find((entry) =>
          entry.textContent.trim() === "Inventory"
        );
        button?.click();
        return Boolean(button);
      })()`
    );
    await waitForExpression(send, 'document.body.textContent.includes("Slot OK:")', 30000);
    const inventoryState = await evaluate(
      send,
      `(() => ({
        slotLines: Array.from(document.querySelectorAll("*"))
          .map((el) => el.textContent?.replace(/\\s+/g, " ").trim() ?? "")
          .filter((text) => text.startsWith("Slot OK:") || text.startsWith("Slot mismatch:"))
          .slice(0, 10),
        inventoryText: document.body.textContent.includes("nw_it_mpotion002"),
        weaponText: document.body.textContent.includes("nw_wplhb001"),
        creatureWeaponText: document.body.textContent.includes("nw_it_crewps005")
      }))()`
    );
    const inventoryShot = await screenshot(send, "12-creature-inventory-equipment-slot-ok-cdp.png");

    const summary = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      proof: { generatorState, windowedState, tanarukkState, addToAreaState, inventoryState },
      screenshots: {
        itemGeneratorUnsupported: generatorShot,
        addObjectsWindowed: addWindowShot,
        tanarukkFilter: filterShot,
        tanarukkPlaced: placedShot,
        inventorySlotOk: inventoryShot
      },
      chromeStderrTail: stderr.slice(-1200)
    };
    const summaryPath = path.join(outDir, "09-13-cdp-runtime-proof-summary.json");
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
