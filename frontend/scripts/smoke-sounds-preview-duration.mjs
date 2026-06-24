#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const VALID_SMOKE_MODES = new Set(["ready", "playing", "stopped"]);

const chromePath = process.env.CHROME_PATH ?? DEFAULT_CHROME_PATH;
const baseUrl = process.env.AURORA_FRONTEND_URL ?? "http://127.0.0.1:5173";
const authBaseUrl = process.env.AURORA_AUTH_BASE_URL ?? `${baseUrl}/_aurora/v1`;
const username = process.env.AURORA_TEST_USERNAME ?? "builder.user";
const password = process.env.AURORA_TEST_PASSWORD ?? "builder123";
const soundResref = process.env.AURORA_SOUND_PREVIEW_RESREF ?? "al_an_bees1";
const soundId = process.env.AURORA_SOUND_PREVIEW_ID ?? `sound_${soundResref}`;
const expectedSourceDuration = process.env.AURORA_SOUND_SOURCE_DURATION_LABEL ?? "2.5s";
const expectedPreviewDuration =
  process.env.AURORA_SOUND_PREVIEW_DURATION_LABEL ?? "9.9s (browser-preview)";
const expectedUi = {
  soundIdLine: `soundId: ${soundId}`,
  resrefLine: `resref: ${soundResref}`,
  sourceDurationLine: `duration: ${expectedSourceDuration}`,
  previewDurationLine: `preview duration: ${expectedPreviewDuration}`,
  previewDurationFallbackLine: `preview duration: ${expectedPreviewDuration.replace(/\s*\(.+\)$/, "")}`,
  playCanvasNeedle: `place ${soundResref} on canvas`.toLowerCase(),
  playLabel: `Play ${soundResref}`,
  stopLabel: `Stop ${soundResref}`
};
const requestedSmokeMode = process.env.SOUNDS_PREVIEW_SMOKE_MODE ?? "stopped";
const smokeMode = VALID_SMOKE_MODES.has(requestedSmokeMode) ? requestedSmokeMode : "stopped";
const port = Number(process.env.CHROME_DEBUG_PORT) || 9500 + Math.floor(Math.random() * 300);
const outDir = path.resolve(
  process.env.SOUNDS_PREVIEW_SMOKE_OUT_DIR ?? ".codex/tmp/sounds-preview-duration-ui-smoke"
);
const profileDir = path.join(outDir, "chrome-profile");
const fileStem =
  smokeMode === "playing"
    ? "sounds-preview-duration-playing-ui-smoke"
    : smokeMode === "stopped"
      ? "sounds-preview-duration-stop-ui-smoke"
      : "sounds-preview-duration-ready-ui-smoke";
const resultPath = path.join(outDir, `${fileStem}.json`);
const screenshotPath = path.join(outDir, `${fileStem}.png`);

fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const seededAuthState = await createPersistedAuthState();
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${port}`,
    "--window-size=1440,820",
    `--user-data-dir=${profileDir}`,
    `${baseUrl}/login?mode=sounds_mode`
  ],
  { stdio: ["ignore", "pipe", "pipe"] }
);

let chromeStderr = "";
chrome.stderr.on("data", (chunk) => {
  chromeStderr += chunk.toString();
});

try {
  const result = await runSmoke();
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
} finally {
  chrome.kill("SIGTERM");
  await onceProcessExits(chrome);
  fs.rmSync(profileDir, { recursive: true, force: true });
}

async function runSmoke() {
  const tab = await waitForTab();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let messageId = 0;
  const pending = new Map();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) {
      return;
    }
    const handler = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      handler.reject(new Error(JSON.stringify(message.error)));
    } else {
      handler.resolve(message.result);
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
  await send("Page.navigate", { url: `${baseUrl}/login?mode=sounds_mode` });
  await waitForCondition(send, () => ({
    onFrontendOrigin: window.location.origin === "http://127.0.0.1:5173",
    text: document.body.innerText
  }));
  await seedBrowserAuthState(send);
  await send("Page.navigate", { url: `${baseUrl}/app?mode=sounds_mode` });

  const ready = await waitForCondition(send, (expected) => ({
    hasSoundsMode: document.body.innerText.includes("Sounds Mode"),
    hasTargetSound: document.body.innerText.includes(expected.resrefLine.replace("resref: ", "")),
    text: document.body.innerText
  }), 15000, expectedUi);

  await clickButton(send, new RegExp(`^${escapeRegExp(soundResref)}`, "i"));
  const selected = await waitForCondition(send, (expected) => ({
    selected:
      document.body.innerText.includes(expected.soundIdLine) &&
      document.body.innerText.includes(expected.sourceDurationLine),
    text: document.body.innerText
  }), 15000, expectedUi);

  const firstPlayClick = await clickButton(send, new RegExp(`^Play ${escapeRegExp(soundResref)}$`, "i"));
  const prepared = await waitForCondition(send, (expected) => {
    const text = document.body.innerText;
    return {
      ready: text.includes("Ready to play from backend audio cache"),
      sourceDurationVisible: text.includes(expected.sourceDurationLine),
      previewDurationVisible:
        text.includes(expected.previewDurationLine) ||
        text.includes(expected.previewDurationFallbackLine),
      deliveryVisible: text.includes("delivery: vanilla / proxy / audio/wav"),
      metadataVisible:
        text.includes(expected.soundIdLine) &&
        text.includes(expected.resrefLine) &&
        text.includes("source: vanilla"),
      placeCanvasAbsent: !text.toLowerCase().includes(expected.playCanvasNeedle),
      text
    };
  }, 15000, expectedUi);

  let secondPlayClick = null;
  let playing = null;
  if (smokeMode === "playing" || smokeMode === "stopped") {
    secondPlayClick = await clickButton(send, new RegExp(`^Play ${escapeRegExp(soundResref)}$`, "i"));
    playing = await waitForCondition(send, (expected) => {
      const text = document.body.innerText;
      return {
        playing: text.includes("Playing from backend audio cache."),
        sourceDurationVisible: text.includes(expected.sourceDurationLine),
        previewDurationVisible:
          text.includes(expected.previewDurationLine) ||
          text.includes(expected.previewDurationFallbackLine),
        deliveryVisible: text.includes("delivery: vanilla / proxy / audio/wav"),
        metadataVisible:
          text.includes(expected.soundIdLine) &&
          text.includes(expected.resrefLine) &&
          text.includes("source: vanilla"),
        stopAvailable: Array.from(document.querySelectorAll("button")).some((candidate) => {
          const label = candidate.getAttribute("aria-label") || candidate.textContent || "";
          return label.trim().toLowerCase() === expected.stopLabel.toLowerCase();
        }),
        placeCanvasAbsent: !text.toLowerCase().includes(expected.playCanvasNeedle),
        text
      };
    }, 15000, expectedUi);
  }

  let stopClick = null;
  let stopped = null;
  if (smokeMode === "stopped") {
    stopClick = await clickButton(send, new RegExp(`^Stop ${escapeRegExp(soundResref)}$`, "i"));
    stopped = await waitForCondition(send, (expected) => {
      const text = document.body.innerText;
      const inspectorStart = text.indexOf("INSPECTOR PANEL");
      const inspectorText = inspectorStart >= 0 ? text.slice(inspectorStart) : text;
      return {
        stopped:
          !inspectorText.includes("state: Playing") &&
          !inspectorText.includes("state: Ready") &&
          !inspectorText.includes("playback:") &&
          !inspectorText.includes("delivery:") &&
          !inspectorText.includes("preview duration:"),
        sourceDurationVisible: inspectorText.includes(expected.sourceDurationLine),
        metadataVisible:
          inspectorText.includes(expected.soundIdLine) &&
          inspectorText.includes(expected.resrefLine) &&
          inspectorText.includes("source: vanilla") &&
          inspectorText.includes("auroraUsage: GI_sound_rndm / RandomSound"),
        stopAbsent: !Array.from(document.querySelectorAll("button")).some((candidate) => {
          const label = candidate.getAttribute("aria-label") || candidate.textContent || "";
          return label.trim().toLowerCase() === expected.stopLabel.toLowerCase();
        }),
        playAvailable: Array.from(document.querySelectorAll("button")).some((candidate) => {
          const label = candidate.getAttribute("aria-label") || candidate.textContent || "";
          return label.trim().toLowerCase() === expected.playLabel.toLowerCase();
        }),
        placeCanvasAbsent: !text.toLowerCase().includes(expected.playCanvasNeedle),
        text
      };
    }, 15000, expectedUi);
  }

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));

  const finalText = await evaluate(send, "() => document.body.innerText");
  ws.close();

  return {
    ok:
      ready.hasSoundsMode &&
      ready.hasTargetSound &&
      selected.selected &&
      prepared.ready &&
      prepared.sourceDurationVisible &&
      prepared.previewDurationVisible &&
      prepared.deliveryVisible &&
      prepared.metadataVisible &&
      prepared.placeCanvasAbsent &&
      (smokeMode !== "playing" ||
        (playing?.playing &&
          playing.sourceDurationVisible &&
          playing.previewDurationVisible &&
          playing.deliveryVisible &&
          playing.metadataVisible &&
          playing.stopAvailable &&
          playing.placeCanvasAbsent)) &&
      (smokeMode !== "stopped" ||
        (playing?.playing &&
          stopped?.stopped &&
          stopped.sourceDurationVisible &&
          stopped.metadataVisible &&
          stopped.stopAbsent &&
          stopped.playAvailable &&
          stopped.placeCanvasAbsent)),
    route: `${baseUrl}/app?mode=sounds_mode`,
    smokeMode,
    selectedSound: soundId,
    expectedSourceDuration,
    expectedPreviewDuration,
    ready: {
      hasSoundsMode: ready.hasSoundsMode,
      hasTargetSound: ready.hasTargetSound
    },
    selected: {
      selected: selected.selected
    },
    firstPlayClick,
    prepared: {
      ready: prepared.ready,
      sourceDurationVisible: prepared.sourceDurationVisible,
      previewDurationVisible: prepared.previewDurationVisible,
      deliveryVisible: prepared.deliveryVisible,
      metadataVisible: prepared.metadataVisible,
      placeCanvasAbsent: prepared.placeCanvasAbsent
    },
    secondPlayClick,
    playing:
      playing === null
        ? null
        : {
            playing: playing.playing,
            sourceDurationVisible: playing.sourceDurationVisible,
            previewDurationVisible: playing.previewDurationVisible,
            deliveryVisible: playing.deliveryVisible,
            metadataVisible: playing.metadataVisible,
            stopAvailable: playing.stopAvailable,
            placeCanvasAbsent: playing.placeCanvasAbsent
          },
    stopClick,
    stopped:
      stopped === null
        ? null
        : {
            stopped: stopped.stopped,
            sourceDurationVisible: stopped.sourceDurationVisible,
            metadataVisible: stopped.metadataVisible,
            stopAbsent: stopped.stopAbsent,
            playAvailable: stopped.playAvailable,
            placeCanvasAbsent: stopped.placeCanvasAbsent
          },
    artifactPaths: {
      resultPath,
      screenshotPath
    },
    finalTextExcerpt: finalText.slice(-2200),
    chromeStderrTail: chromeStderr.slice(-1200),
    localOnlyNotRetailEvidence: true,
    canonicalParityPromoted: false
  };
}

async function createPersistedAuthState() {
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

async function seedBrowserAuthState(send) {
  await evaluate(
    send,
    `(authState) => {
      window.localStorage.setItem("aurora_web.auth_session.v1", JSON.stringify(authState));
      window.localStorage.setItem("aurora_web.workspace_mode.v1", "sounds_mode");
      return true;
    }`,
    seededAuthState
  );
}

async function clickButton(send, pattern) {
  const source = pattern.source;
  const flags = pattern.flags;
  const button = await evaluate(
    send,
    `(source, flags) => {
      const pattern = new RegExp(source, flags);
      const button = Array.from(document.querySelectorAll("button")).find((candidate) => {
        const label = candidate.getAttribute("aria-label") || candidate.textContent || "";
        return pattern.test(label.trim());
      });
      if (!button) {
        return { ok: false, source, labels: Array.from(document.querySelectorAll("button")).map((button) => ({
          text: button.textContent?.trim() ?? "",
          aria: button.getAttribute("aria-label")
        })).slice(0, 80) };
      }
      button.scrollIntoView({ block: "center", inline: "center" });
      const rect = button.getBoundingClientRect();
      return {
        ok: true,
        text: button.textContent?.trim() ?? "",
        aria: button.getAttribute("aria-label"),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }`,
    source,
    flags
  );
  if (!button.ok) {
    return button;
  }
  await send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: button.x,
    y: button.y,
    button: "none"
  });
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: button.x,
    y: button.y,
    button: "left",
    clickCount: 1
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: button.x,
    y: button.y,
    button: "left",
    clickCount: 1
  });
  return button;
}

async function waitForCondition(send, predicate, timeoutMs = 15000, ...args) {
  const deadline = Date.now() + timeoutMs;
  let lastResult = null;
  while (Date.now() < deadline) {
    lastResult = await evaluate(send, predicate.toString(), ...args);
    if (Object.values(lastResult).some((value) => value === false)) {
      await sleep(250);
      continue;
    }
    return lastResult;
  }
  return lastResult;
}

async function evaluate(send, expression, ...args) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression:
      args.length === 0
        ? `(${expression})()`
        : `(${expression})(...${JSON.stringify(args)})`
  });
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
}

async function waitForTab() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      const tabs = await response.json();
      const tab = tabs.find((candidate) => candidate.type === "page");
      if (tab?.webSocketDebuggerUrl) {
        return tab;
      }
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  throw new Error(`Chrome CDP did not become available on port ${port}`);
}

function onceProcessExits(childProcess) {
  return new Promise((resolve) => {
    childProcess.once("exit", resolve);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
