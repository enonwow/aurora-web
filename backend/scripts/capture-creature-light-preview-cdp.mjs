import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_BASE_URL = "http://127.0.0.1:5173";
const DEFAULT_ROUTE_PATH = "/dev/creature-light-preview";
const DEFAULT_OUT_DIR =
  "backend/docs/aurora-reverse/artifacts/creature-itemproperty-light";

const options = parseArgs(process.argv.slice(2));
const routePath = options.route ?? DEFAULT_ROUTE_PATH;
const outDir = path.resolve(options.outDir ?? DEFAULT_OUT_DIR);
const chromePath = options.chromePath ?? process.env.CHROME_PATH ?? DEFAULT_CHROME_PATH;
const baseUrl = options.baseUrl ?? process.env.CREATURE_LIGHT_BASE_URL ?? DEFAULT_BASE_URL;
const port = Number(options.port ?? 9400 + Math.floor(Math.random() * 400));
const fileStem = sanitizeFileStem(options.name ?? "creature-equipped-itemproperty-light");
const profileDir = path.join(outDir, `${fileStem}.chrome-profile`);
const keepProfile = options.keepProfile === "true";
const route = new URL(routePath, baseUrl).toString();
const routeSearchParams = new URL(route).searchParams;
const expectedEquipmentLights = readOptionalInteger(routeSearchParams.get("equipmentLights"));
const expectedMaxLights = readOptionalInteger(routeSearchParams.get("maxLights"));
const pngPath = path.join(outDir, `${fileStem}.png`);
const framePath = path.join(outDir, `${fileStem}.frame.json`);

fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${port}`,
    "--window-size=1280,720",
    `--user-data-dir=${profileDir}`,
    route
  ],
  { stdio: ["ignore", "pipe", "pipe"] }
);

let chromeStderr = "";
chrome.stderr.on("data", (chunk) => {
  chromeStderr += chunk.toString();
});

try {
  const result = await captureFromChrome({ port, route, pngPath, framePath });
  console.log(JSON.stringify(result, null, 2));
} finally {
  chrome.kill("SIGTERM");
  await onceProcessExits(chrome, 5000);
  if (!keepProfile) {
    removeProfileDirBestEffort(profileDir);
  }
}

async function captureFromChrome({ port, route, pngPath, framePath }) {
  const tab = await waitForTab(port, route);
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
  await send("Page.navigate", { url: route });

  const domStatus = await waitForCreatureLightPreviewStatus(send, {
    expectedEquipmentLights,
    expectedMaxLights
  });
  if (!domStatus?.ok) {
    throw new Error(
      `Creature light preview did not reach source-backed light proof before timeout: ${JSON.stringify(domStatus)}`
    );
  }

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });

  fs.writeFileSync(pngPath, Buffer.from(screenshot.data, "base64"));
  const frame = {
    version: "aurora-creature-light-preview-cdp-capture/v1",
    capturedAt: new Date().toISOString(),
    requestedRoute: route,
    finalRoute: domStatus.href,
    screenshotPath: pngPath,
    screenshotBytes: fs.statSync(pngPath).size,
    framePath,
    domStatus,
    captureMethod:
      "Chrome DevTools Protocol Page.captureScreenshot plus dev runner ItemPropertyLight dataset",
    chromeStderrTail: chromeStderr.slice(-1200),
    auroraFirstEvidence: {
      source: "utc.Equip_ItemList.itemRuntime.itemProperties -> ItemPropertyLight",
      implementedAs: "creature-attached THREE.PointLight preview",
      radiusSource: domStatus.itemPropertyLightBrightnessRadiusSource,
      radiusProof: domStatus.itemPropertyLightRadiusProofStatus,
      shadowStatus: domStatus.itemPropertyLightShadowStatus,
      shadowProof: domStatus.itemPropertyLightShadowProofStatus,
      noSelfGlowProof: domStatus.itemPropertyLightNoSelfGlowProofStatus,
      sceneShadowPolicyCount: domStatus.sceneShadowItemPropertyLightShadowPolicyCount,
      sceneShadowPolicySamples:
        domStatus.sceneShadowItemPropertyLightShadowPolicySamples,
      notPlaceableLight: domStatus.creatureEquipmentLightNotPlaceableLight,
      notMdlLightNode: domStatus.creatureEquipmentLightNotMdlLightNode,
      activeLightBudget: {
        candidateCount: domStatus.equipmentLightCandidateCount,
        acceptedCount: domStatus.equipmentLightAcceptedCount,
        droppedCount: domStatus.equipmentLightDroppedCount,
        pointLightCount: domStatus.pointLightCount,
        budgetCap: domStatus.equipmentLightBudgetCap,
        budgetHardCap: domStatus.equipmentLightBudgetHardCap,
        configuredMaxLights: domStatus.equipmentLightConfiguredMaxLights,
        budgetCapProofStatus: domStatus.equipmentLightBudgetCapProofStatus,
        droppedEquipmentLightCount: domStatus.droppedEquipmentLightCount,
        firstDroppedEquipmentLightRank: domStatus.firstDroppedEquipmentLightRank
      }
    },
    unresolvedRetailProof: {
      falloff: domStatus.itemPropertyLightFalloffProofStatus,
      color: domStatus.itemPropertyLightColorProofStatus,
      shadow: domStatus.itemPropertyLightShadowProofStatus
    }
  };
  fs.writeFileSync(framePath, `${JSON.stringify(frame, null, 2)}\n`);
  ws.close();
  return frame;
}

async function waitForCreatureLightPreviewStatus(send, expectations) {
  let lastStatus = null;
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const status = await readCreatureLightPreviewStatus(send, expectations);
    lastStatus = status;
    if (status?.ok) {
      return status;
    }
    await sleep(250);
  }
  return lastStatus;
}

async function readCreatureLightPreviewStatus(send, expectations) {
  const expectedEquipmentLights =
    typeof expectations.expectedEquipmentLights === "number"
      ? expectations.expectedEquipmentLights
      : null;
  const expectedMaxLights =
    typeof expectations.expectedMaxLights === "number" ? expectations.expectedMaxLights : null;
  const status = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const expectedEquipmentLights = ${JSON.stringify(expectedEquipmentLights)};
      const expectedMaxLights = ${JSON.stringify(expectedMaxLights)};
      const runner = document.querySelector("[data-testid='creature-light-preview-runner']");
      const canvas = document.querySelector("canvas");
      const frameScript = document.querySelector("#creature-light-preview-frame");
      const frameJson = (() => {
        try {
          return frameScript?.textContent ? JSON.parse(frameScript.textContent) : null;
        } catch {
          return null;
        }
      })();
      const pointLightCount = Number(runner?.getAttribute("data-point-light-count") ?? 0);
      const equipmentLightCount = Number(runner?.getAttribute("data-equipment-light-count") ?? 0);
      const equipmentLightCandidateCount = Number(
        runner?.getAttribute("data-equipment-light-candidate-count") ?? 0
      );
      const equipmentLightAcceptedCount = Number(
        runner?.getAttribute("data-equipment-light-accepted-count") ?? 0
      );
      const equipmentLightDroppedCount = Number(
        runner?.getAttribute("data-equipment-light-dropped-count") ?? 0
      );
      const objectPixels = Number(runner?.getAttribute("data-object-pixels") ?? 0);
      const canvasNonblank = runner?.getAttribute("data-canvas-nonblank") ?? "false";
      const renderStatus = runner?.getAttribute("data-render-status") ?? null;
      const equipmentLightStatus =
        runner?.getAttribute("data-equipment-light-status") ?? null;
      const equipmentLightMode = runner?.getAttribute("data-equipment-light-mode") ?? null;
      const pointLightDistance =
        runner?.getAttribute("data-point-light-distance") ?? null;
      const pointLightIntensity =
        runner?.getAttribute("data-point-light-intensity") ?? null;
      const pointLightColor = runner?.getAttribute("data-point-light-color") ?? "";
      const pointLightCastShadow =
        runner?.getAttribute("data-point-light-cast-shadow") ?? null;
      const equipmentLightSource =
        runner?.getAttribute("data-equipment-light-source") ?? null;
      const equipmentLightProofStatus =
        runner?.getAttribute("data-equipment-light-proof-status") ?? null;
      const equipmentLightBudgetCap = Number(
        runner?.getAttribute("data-equipment-light-budget-cap") ?? 0
      );
      const equipmentLightBudgetHardCap = Number(
        runner?.getAttribute("data-equipment-light-budget-hard-cap") ?? 0
      );
      const equipmentLightConfiguredMaxLights = Number(
        runner?.getAttribute("data-equipment-light-configured-max-lights") ?? 0
      );
      const equipmentLightBudgetCapProofStatus =
        runner?.getAttribute("data-equipment-light-budget-cap-proof-status") ?? null;
      const equipmentLightNotPlaceableLight =
        runner?.getAttribute("data-equipment-light-not-placeable-light") ?? "false";
      const equipmentLightNotMdlLightNode =
        runner?.getAttribute("data-equipment-light-not-mdl-light-node") ?? "false";
      const droppedEquipmentLightCount = Number(
        runner?.getAttribute("data-dropped-equipment-light-count") ?? 0
      );
      const firstDroppedEquipmentLightRank = Number(
        runner?.getAttribute("data-first-dropped-equipment-light-rank") ?? 0
      );
      const itemPropertyLightPreviewMode =
        runner?.getAttribute("data-item-property-light-preview-mode") ?? null;
      const itemPropertyLightFalloffProofStatus =
        runner?.getAttribute("data-item-property-light-falloff-proof-status") ?? null;
      const itemPropertyLightColorProofStatus =
        runner?.getAttribute("data-item-property-light-color-proof-status") ?? null;
      const itemPropertyLightRadiusProofStatus =
        runner?.getAttribute("data-item-property-light-radius-proof-status") ?? null;
      const itemPropertyLightBrightnessRadiusSource =
        runner?.getAttribute("data-item-property-light-brightness-radius-source") ?? null;
      const itemPropertyLightShadowStatus =
        runner?.getAttribute("data-item-property-light-shadow-status") ?? null;
      const itemPropertyLightShadowProofStatus =
        runner?.getAttribute("data-item-property-light-shadow-proof-status") ?? null;
      const itemPropertyLightNoSelfGlowProofStatus =
        runner?.getAttribute("data-item-property-light-no-self-glow-proof-status") ?? null;
      const sceneShadowItemPropertyLightShadowPolicyCount = Number(
        runner?.getAttribute("data-scene-shadow-item-property-light-shadow-policy-count") ?? 0
      );
      const sceneShadowItemPropertyLightShadowPolicySamples =
        runner?.getAttribute("data-scene-shadow-item-property-light-shadow-policy-samples") ?? "";
      const expectedBudgetDrop =
        Number.isFinite(expectedEquipmentLights) &&
        Number.isFinite(expectedMaxLights) &&
        expectedEquipmentLights > expectedMaxLights;
      const budgetExpectationOk = expectedBudgetDrop
        ? equipmentLightCandidateCount === expectedEquipmentLights &&
          equipmentLightAcceptedCount === Math.max(0, expectedMaxLights) &&
          equipmentLightDroppedCount === expectedEquipmentLights - Math.max(0, expectedMaxLights) &&
          droppedEquipmentLightCount === equipmentLightDroppedCount &&
          pointLightCount === equipmentLightAcceptedCount &&
          equipmentLightBudgetCap === Math.max(0, expectedMaxLights) &&
          equipmentLightConfiguredMaxLights === Math.max(0, expectedMaxLights) &&
          equipmentLightBudgetCapProofStatus === "source-backed-active-light-slot-cap-max-128"
        : true;
      const ok =
        window.location.pathname === "/dev/creature-light-preview" &&
        renderStatus === "ready" &&
        (canvasNonblank === "true" || objectPixels > 80) &&
        pointLightCount >= 1 &&
        equipmentLightCount >= 1 &&
        equipmentLightStatus === "active" &&
        equipmentLightSource === "utc.Equip_ItemList.itemRuntime.itemProperties" &&
        equipmentLightNotPlaceableLight === "true" &&
        equipmentLightNotMdlLightNode === "true" &&
        itemPropertyLightPreviewMode === "itemproperty-light" &&
        itemPropertyLightRadiusProofStatus === "source-backed-retail-key-bif-iprp-lightcost-token-radius" &&
        itemPropertyLightShadowStatus === "enabled-by-progfx-param3" &&
        itemPropertyLightShadowProofStatus ===
          "source-backed-progfx-type4-param3-item-light-shadow-toggle-shadowvol-projection-blocked" &&
        sceneShadowItemPropertyLightShadowPolicyCount >= 1 &&
        budgetExpectationOk;
      return {
        ok,
        expectedBudgetDrop,
        href: window.location.href,
        routePath: window.location.pathname,
        runnerPresent: Boolean(runner),
        canvasPresent: Boolean(canvas),
        canvasRect: canvas ? {
          left: Math.round(canvas.getBoundingClientRect().left),
          top: Math.round(canvas.getBoundingClientRect().top),
          width: Math.round(canvas.getBoundingClientRect().width),
          height: Math.round(canvas.getBoundingClientRect().height)
        } : null,
        renderStatus,
        canvasNonblank,
        objectPixels,
        pointLightCount,
        equipmentLightCount,
        equipmentLightCandidateCount,
        equipmentLightAcceptedCount,
        equipmentLightDroppedCount,
        equipmentLightStatus,
        equipmentLightMode,
        equipmentLightBrightnessLabels:
          runner?.getAttribute("data-equipment-light-brightness-labels") ?? "",
        equipmentLightColorLabels:
          runner?.getAttribute("data-equipment-light-color-labels") ?? "",
        equipmentLightAttachmentTargets:
          runner?.getAttribute("data-equipment-light-attachment-targets") ?? "",
        equipmentLightSource,
        equipmentLightProofStatus,
        equipmentLightBudgetCap,
        equipmentLightBudgetHardCap,
        equipmentLightConfiguredMaxLights,
        equipmentLightBudgetCapProofStatus,
        creatureEquipmentLightNotPlaceableLight: equipmentLightNotPlaceableLight === "true",
        creatureEquipmentLightNotMdlLightNode: equipmentLightNotMdlLightNode === "true",
        droppedEquipmentLightCount,
        firstDroppedEquipmentLightRank,
        pointLightDistance,
        pointLightIntensity,
        pointLightColor,
        pointLightCastShadow,
        itemPropertyLightPreviewMode,
        itemPropertyLightFalloffProofStatus,
        itemPropertyLightColorProofStatus,
        itemPropertyLightRadiusProofStatus,
        itemPropertyLightBrightnessRadiusSource,
        itemPropertyLightShadowStatus,
        itemPropertyLightShadowProofStatus,
        itemPropertyLightNoSelfGlowProofStatus,
        sceneShadowItemPropertyLightShadowPolicyCount,
        sceneShadowItemPropertyLightShadowPolicySamples,
        cameraPosition: runner?.getAttribute("data-camera-position") ?? "",
        error: runner?.getAttribute("data-error") ?? "",
        frameJson
      };
    })()`
  });
  return status.result.value;
}

function readOptionalInteger(value) {
  if (value === null || String(value).trim().length === 0) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : null;
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

function sanitizeFileStem(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceProcessExits(process, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      process.kill("SIGKILL");
      resolve();
    }, timeoutMs);
    process.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function removeProfileDirBestEffort(profileDir) {
  try {
    fs.rmSync(profileDir, { recursive: true, force: true });
  } catch {
    // Chrome may hold lock files briefly on Windows.
  }
}
