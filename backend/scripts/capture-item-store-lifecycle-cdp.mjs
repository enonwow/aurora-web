import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = path.join(repoRoot, ".codex-tmp", "item-proof-all");
const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = Number(process.env.ITEM_LIFECYCLE_CAPTURE_CDP_PORT ?? 9551);
const profileDir = path.join(outDir, `chrome-cdp-profile-lifecycle-${Date.now()}`);
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

async function clickButtonByAriaPrefix(send, prefix) {
  const label = await evaluate(
    send,
    `(() => {
      const button = Array.from(document.querySelectorAll("button")).find((entry) =>
        (entry.getAttribute("aria-label") || "").startsWith(${JSON.stringify(prefix)}) && !entry.disabled
      );
      const label = button?.getAttribute("aria-label") ?? null;
      button?.click();
      return label;
    })()`
  );
  assert(label, `Button not found with aria prefix: ${prefix}`);
  return label;
}

async function clickTab(send, label) {
  const ok = await evaluate(
    send,
    `(() => {
      const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((entry) =>
        entry.textContent.trim() === ${JSON.stringify(label)}
      );
      tab?.click();
      return Boolean(tab);
    })()`
  );
  assert(ok, `Tab not found: ${label}`);
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

async function selectBaseItem(send, matcher) {
  const ok = await evaluate(
    send,
    `(() => {
      const select = document.querySelector('select[aria-label="Base Item"]');
      if (!select) return false;
      const option = Array.from(select.options).find((entry) =>
        entry.textContent.toLowerCase().includes(${JSON.stringify(matcher.toLowerCase())}) ||
        entry.value.toLowerCase().includes(${JSON.stringify(matcher.toLowerCase())})
      );
      if (!option) return false;
      select.value = option.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`
  );
  assert(ok, `Base item option not found: ${matcher}`);
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

async function cleanupBlueprints(token, resRefs) {
  const results = [];
  for (const resRef of resRefs.filter(Boolean)) {
    const itemUrl = `${apiBase}/catalog/items/blueprints/${encodeURIComponent(resRef)}`;
    const storeUrl = `${apiBase}/catalog/stores/blueprints/${encodeURIComponent(resRef)}`;
    for (const [kind, url] of [
      ["item", itemUrl],
      ["store", storeUrl]
    ]) {
      try {
        const result = await deleteJson(url, { authorization: `Bearer ${token}` });
        results.push({ kind, resRef, deleted: true, result: result.data ?? result });
      } catch (error) {
        results.push({
          kind,
          resRef,
          deleted: false,
          status: error.details?.status ?? null
        });
      }
    }
  }
  return results;
}

async function runCapture() {
  assert(fs.existsSync(chromePath), "Chrome executable missing", { chromePath });
  const suffix = String(Date.now()).slice(-6);
  const itemResRef = `pfitm${suffix}`;
  const itemTag = `PF_ITEM_${suffix}`;
  const itemCopyName = `Proof Item Copy ${suffix}`;
  const storeResRef = `pfstr${suffix}`;
  const storeTag = `PF_STORE_${suffix}`;
  const storeName = `Proof Store ${suffix}`;
  const authState = await buildAuthState();
  const cleanupTargets = new Set([itemResRef, storeResRef]);
  const cleanupBefore = await cleanupBlueprints(authState.token, [...cleanupTargets]);

  const chrome = spawn(
    chromePath,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
  "--headless=new",
  "--renderer-process-limit=2",
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
  const proof = {};
  const screenshots = {};
  let cleanupAfter = [];
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
        JSON.stringify(authState.storage)
      )}); localStorage.setItem("aurora_web.workspace_mode.v1", "items_mode"); true;`
    );
    await send("Page.navigate", { url: `${baseUrl}/app?mode=items_mode` }, 30000);
    await waitForExpression(
      send,
      'document.querySelector("[aria-label=\\"items mode section\\"]") !== null && document.body.textContent.includes("New Item")',
      60000
    );
    await waitForExpression(send, '!document.body.textContent.includes("Loading items from backend")', 60000);
    await waitForExpression(
      send,
      `Array.from(document.querySelectorAll("button")).some((button) => button.textContent.trim() === "New Item" && !button.disabled)`,
      60000
    );

    await clickButtonByText(send, "New Item");
    await waitForExpression(send, 'document.querySelector("[aria-label=\\"item creation wizard\\"]") !== null', 30000);
    await selectBaseItem(send, "dagger");
    await clickTab(send, "Identity");
    await setInput(send, "Name", `Proof Item ${suffix}`);
    await setInput(send, "ResRef", itemResRef);
    await setInput(send, "Tag", itemTag);
    await clickButtonByText(send, "Create Item");
    await waitForExpression(
      send,
      `!document.querySelector("[aria-label=\\"item creation wizard\\"]") && document.body.textContent.includes(${JSON.stringify(itemTag)})`,
      60000
    );
    cleanupTargets.add(itemResRef);
    await setInput(send, "Filter items", itemResRef);
    await waitForExpression(send, `document.body.textContent.includes(${JSON.stringify(itemResRef)})`, 30000);
    await scrollIntoView(send, ".items-mode-row");
    screenshots.itemCreated = await screenshot(send, "14-item-lifecycle-created-cdp.png");

    await clickButtonByAria(send, `Edit custom item ${itemTag}`);
    await waitForExpression(send, 'document.querySelector("[aria-label=\\"item creation wizard\\"]") !== null', 30000);
    await setInput(send, "Name", `Updated Proof Item ${suffix}`);
    await clickButtonByText(send, "Update Item");
    await waitForExpression(
      send,
      `!document.querySelector("[aria-label=\\"item creation wizard\\"]") && document.body.textContent.includes(${JSON.stringify(`Updated Proof Item ${suffix}`)})`,
      60000
    );
    await scrollIntoView(send, ".items-mode-row");
    screenshots.itemEdited = await screenshot(send, "15-item-lifecycle-edited-cdp.png");

    await clickButtonByAria(send, `Duplicate item ${itemTag}`);
    await waitForExpression(send, 'document.querySelector("[aria-label=\\"item creation wizard\\"]") !== null', 30000);
    await setInput(send, "Name", itemCopyName);
    const itemCopyResRef = await evaluate(
      send,
      'document.querySelector("input[aria-label=\\"ResRef\\"]")?.value ?? null'
    );
    assert(itemCopyResRef && itemCopyResRef !== itemResRef, "Duplicate item resref was not generated", {
      itemCopyResRef
    });
    cleanupTargets.add(itemCopyResRef);
    await clickButtonByText(send, "Create Item");
    await waitForExpression(
      send,
      `!document.querySelector("[aria-label=\\"item creation wizard\\"]") && document.body.textContent.includes(${JSON.stringify(itemCopyName)})`,
      60000
    );
    await setInput(send, "Filter items", "pfitm");
    await scrollIntoView(send, ".items-mode-row");
    screenshots.itemDuplicated = await screenshot(send, "16-item-lifecycle-duplicated-cdp.png");

    await clickButtonByAria(send, `Delete custom item ${itemTag}`);
    await waitForExpression(
      send,
      `!document.body.textContent.includes(${JSON.stringify(`Updated Proof Item ${suffix}`)}) && !document.body.textContent.includes(${JSON.stringify(itemResRef)}) && document.body.textContent.includes(${JSON.stringify(itemCopyName)})`,
      60000
    );
    await scrollIntoView(send, ".scene-object-list");
    screenshots.itemDeleted = await screenshot(send, "17-item-lifecycle-deleted-cdp.png");
    proof.itemLifecycle = {
      itemResRef,
      itemTag,
      itemCopyResRef,
      createdVisible: true,
      editedVisible: true,
      duplicatedVisible: true,
      deleteClicked: true
    };

    await setInput(send, "Filter items", "");
    await clickButtonByText(send, "New Store");
    await waitForExpression(send, 'document.querySelector("[aria-label=\\"store creation wizard\\"]") !== null', 30000);
    await setInput(send, "Store Name", storeName);
    await setInput(send, "Store ResRef", storeResRef);
    await setInput(send, "Store Tag", storeTag);
    await setInput(send, "Mark Up", "137");
    await setInput(send, "Mark Down", "43");
    await setInput(send, "Bucket 1 item 1 resref", "nw_it_mpotion021");
    await setInput(send, "Bucket 1 item 1 x", "2");
    await setInput(send, "Bucket 1 item 1 y", "3");
    await setCheckbox(send, "Bucket 1 item 1 infinite", true);
    await clickButtonByText(send, "Create Store");
    await waitForExpression(
      send,
      `!document.querySelector("[aria-label=\\"store creation wizard\\"]") && document.body.textContent.includes(${JSON.stringify(storeResRef)})`,
      60000
    );
    cleanupTargets.add(storeResRef);
    await scrollIntoView(send, ".items-mode-store-management");
    screenshots.storeCreated = await screenshot(send, "18-store-lifecycle-created-cdp.png");

    await clickButtonByAria(send, `Edit store ${storeResRef}`);
    await waitForExpression(send, 'document.querySelector("[aria-label=\\"store creation wizard\\"]") !== null', 30000);
    await setInput(send, "Store Name", `Updated ${storeName}`);
    await setInput(send, "Mark Up", "160");
    await clickButtonByText(send, "Update Store");
    await waitForExpression(
      send,
      `!document.querySelector("[aria-label=\\"store creation wizard\\"]") && document.body.textContent.includes(${JSON.stringify(`Updated ${storeName}`)})`,
      60000
    );
    await scrollIntoView(send, ".items-mode-store-management");
    screenshots.storeEdited = await screenshot(send, "19-store-lifecycle-edited-cdp.png");

    await clickButtonByAria(send, `Duplicate store ${storeResRef}`);
    await waitForExpression(send, 'document.querySelector("[aria-label=\\"store creation wizard\\"]") !== null', 30000);
    const storeCopyResRef = await evaluate(
      send,
      'document.querySelector("input[aria-label=\\"Store ResRef\\"]")?.value ?? null'
    );
    assert(storeCopyResRef && storeCopyResRef !== storeResRef, "Duplicate store resref was not generated", {
      storeCopyResRef
    });
    cleanupTargets.add(storeCopyResRef);
    await clickButtonByText(send, "Create Store");
    await waitForExpression(
      send,
      `!document.querySelector("[aria-label=\\"store creation wizard\\"]") && document.body.textContent.includes(${JSON.stringify(storeCopyResRef)})`,
      60000
    );
    await scrollIntoView(send, ".items-mode-store-management");
    screenshots.storeDuplicated = await screenshot(send, "20-store-lifecycle-duplicated-cdp.png");

    await send("Page.navigate", { url: `${baseUrl}/app?mode=areas_mode` }, 30000);
    await waitForExpression(
      send,
      'document.querySelector("[aria-label=\\"Add Objects\\"]") !== null',
      60000
    );
    await waitForExpression(
      send,
      'Array.from(document.querySelectorAll("button")).some((button) => (button.getAttribute("title") || "").startsWith("_winds_study /"))',
      60000
    );
    await evaluate(
      send,
      `(() => {
        const row = Array.from(document.querySelectorAll("button")).find((button) =>
          (button.getAttribute("title") || "").startsWith("_winds_study /")
        );
        row?.click();
        return Boolean(row);
      })()`
    );
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
        const match = /^Stores family, (\\d+) templates$/.exec(label);
        return match && Number(match[1]) > 0 && !button.disabled;
      })`,
      90000
    );
    const storesFamilyClicked = await evaluate(
      send,
      `(() => {
        const button = Array.from(document.querySelectorAll("button")).find((entry) =>
          (entry.getAttribute("aria-label") || "").startsWith("Stores family") && !entry.disabled
        );
        button?.click();
        return Boolean(button);
      })()`
    );
    if (!storesFamilyClicked) {
      const familyDebug = await evaluate(
        send,
        `Array.from(document.querySelectorAll('[aria-label="Object family palette"] button')).map((button) => ({
          ariaLabel: button.getAttribute("aria-label"),
          disabled: button.disabled,
          selected: button.getAttribute("aria-selected"),
          text: button.textContent
        }))`
      );
      console.log(JSON.stringify({ storesFamilyClicked: false, familyDebug }, null, 2));
    }
    await evaluate(
      send,
      `(() => {
        if (document.querySelector(".scene-objects-active-family")?.textContent?.includes("Stores")) {
          return true;
        }
        const select = document.querySelector('select[aria-label="Add object type selector"]');
        if (!select) return false;
        const option = Array.from(select.options).find((entry) => entry.value === "stores" && !entry.disabled);
        if (!option) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
        setter.call(select, "stores");
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`
    );
    await waitForExpression(
      send,
      'document.querySelector(".scene-objects-active-family")?.textContent?.includes("Stores")',
      30000
    );
    await evaluate(
      send,
      `(() => {
        const input = document.querySelector('article[aria-label="add objects section"] input[aria-label="Filter objects"]');
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        setter.call(input, ${JSON.stringify(storeResRef)});
        input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: ${JSON.stringify(storeResRef)} }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`
    );
    await waitForExpression(
      send,
      `Array.from(document.querySelectorAll(".scene-object-add-list > li")).some((li) => li.textContent.includes(${JSON.stringify(storeResRef)}))`,
      30000
    );
    screenshots.storeAreaAddPanel = await screenshot(send, "21-store-area-add-panel-cdp.png");
    proof.storeAddPanel = {
      storeResRef,
      rowVisible: true
    };

    await clickButtonByAria(send, "Items Mode");
    await waitForExpression(
      send,
      'document.querySelector("[aria-label=\\"items mode section\\"]") !== null',
      60000
    );
    await waitForExpression(send, 'document.querySelector("[aria-label=\\"Filter stores\\"]") !== null', 90000);
    await scrollIntoView(send, ".items-mode-store-management");
    await setInput(send, "Filter stores", storeResRef);
    await waitForExpression(
      send,
      `document.body.textContent.includes(${JSON.stringify(storeResRef)})`,
      30000
    );
    await clickButtonByAria(send, `Delete store ${storeResRef}`);
    await waitForExpression(
      send,
      `!Array.from(document.querySelectorAll("button")).some((button) => button.getAttribute("aria-label") === ${JSON.stringify(`Delete store ${storeResRef}`)})`,
      60000
    );
    await scrollIntoView(send, ".items-mode-store-management");
    screenshots.storeDeleted = await screenshot(send, "22-store-lifecycle-deleted-cdp.png");
    proof.storeLifecycle = {
      storeResRef,
      storeTag,
      storeCopyResRef,
      createdVisible: true,
      editedVisible: true,
      duplicatedVisible: true,
      deleteClicked: true
    };
  } finally {
    if (cdp?.ws) {
      cdp.ws.close();
    }
    chrome.kill("SIGTERM");
    cleanupAfter = await cleanupBlueprints(authState.token, [...cleanupTargets]);
  }

  const summary = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    proof,
    screenshots,
    cleanupBefore,
    cleanupAfter,
    chromeStderrTail: stderr.slice(-1200)
  };
  const summaryPath = path.join(outDir, "14-22-item-store-lifecycle-proof-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ok: true, summaryPath, screenshots, proof, cleanupAfter }, null, 2));
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
