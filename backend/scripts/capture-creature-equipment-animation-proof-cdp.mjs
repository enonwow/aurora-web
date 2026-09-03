import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";

const DEFAULT_CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_BASE_URL = "http://127.0.0.1:5173";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:3000/api/v1";
const DEFAULT_FFMPEG_PATH =
  "C:\\Users\\enonw\\Documents\\Codex\\2026-05-17\\umiesz-tworzy-filmiki\\vendor\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe";
const DEFAULT_USERNAME = "builder.user";
const DEFAULT_PASSWORD = "builder123";
const DEFAULT_ANIMATION = "2hslashl";

const options = parseArgs(process.argv.slice(2));
const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/u, "");
const apiBaseUrl = (options.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/u, "");
const cacheKey = String(options.cacheKey ?? "").trim();
const sourceResref = String(options.sourceResref ?? options.source ?? "").trim();
const equipmentResrefs = [
  ...parseStringList(options.equipmentResrefs ?? options.equipmentRefs ?? ""),
  ...parseStringList(options.equipmentResref ?? options.equipment ?? ""),
  ...parseStringList(options.ammoResref ?? options.ammo ?? "")
].filter((entry, index, entries) => entries.indexOf(entry) === index);
const equipmentResref = equipmentResrefs[0] ?? "";
const animationName = String(options.animation ?? DEFAULT_ANIMATION).trim();
const resref = String(options.resref ?? "controlled_creature").trim();
const outDir = path.resolve(
  options.outDir ?? "frontend/public/aurora-evidence/creatures/controlled-equipment-proof"
);
const chromePath = options.chromePath ?? process.env.CHROME_PATH ?? DEFAULT_CHROME_PATH;
const ffmpegPath = options.ffmpegPath ?? process.env.FFMPEG_PATH ?? DEFAULT_FFMPEG_PATH;
const port = Number(options.port ?? 9500 + Math.floor(Math.random() * 300));
const username = options.username ?? process.env.AURORA_TEST_USERNAME ?? DEFAULT_USERNAME;
const password = options.password ?? process.env.AURORA_TEST_PASSWORD ?? DEFAULT_PASSWORD;
const videoSeconds = Number(options.videoSeconds ?? 2.4);
const videoFps = Math.max(1, Math.min(60, Math.round(Number(options.videoFps ?? 12))));
const frameTimes = parseNumberList(options.frameTimes ?? options.animationFrameTimes ?? "0,0.25,0.5,0.75,1,1.18,1.3,2");
const settleSeconds = Math.max(
  0,
  Number(options.settleSeconds ?? options.preFrameDelaySeconds ?? 0)
);
const expectedModelPattern = String(
  options.expectedModelPattern ?? inferExpectedEquipmentModelPattern(equipmentResrefs)
).trim();
const expectedTransformPattern = String(options.expectedTransformPattern ?? "").trim();
const expectedTarget = String(options.expectedTarget ?? "").trim().toLowerCase();
const expectedMinimumModelParts = Math.max(
  equipmentResrefs.length,
  Number(options.expectedMinimumModelParts ?? equipmentResrefs.length)
);
const fileStem = sanitizeFileStem(`${resref}-${animationName}`);

if (!cacheKey && (!sourceResref || equipmentResrefs.length === 0)) {
  throw new Error("--cacheKey or --sourceResref plus --equipmentResref is required.");
}

fs.mkdirSync(outDir, { recursive: true });

const authState = await createPersistedAuthState({
  apiBaseUrl,
  username,
  password
});
const route = new URL("/dev/creature-equipment-animation-proof", baseUrl);
if (cacheKey) {
  route.searchParams.set("cacheKey", cacheKey);
} else {
  route.searchParams.set("sourceResref", sourceResref);
  route.searchParams.set("equipmentResref", equipmentResref);
  if (equipmentResrefs.length > 1) {
    route.searchParams.set("equipmentResrefs", equipmentResrefs.join(","));
  }
}
route.searchParams.set("animation", animationName);
route.searchParams.set("apiBaseUrl", apiBaseUrl);

const profileDir = path.join(outDir, `${fileStem}.chrome-profile`);
fs.mkdirSync(profileDir, { recursive: true });
const chrome = spawn(
  chromePath,
  [
  "--headless=new",
  "--renderer-process-limit=2",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${port}`,
    "--window-size=1280,720",
    `--user-data-dir=${profileDir}`,
    "about:blank"
  ],
  { stdio: ["ignore", "pipe", "pipe"] }
);

let chromeStderr = "";
chrome.stderr.on("data", (chunk) => {
  chromeStderr += chunk.toString();
});

try {
  const result = await captureProof();
  console.log(JSON.stringify(result, null, 2));
} finally {
  chrome.kill("SIGTERM");
  await onceProcessExits(chrome, 5000);
  removeDirBestEffort(profileDir);
}

async function captureProof() {
  const tab = await waitForTab(port);
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
  await installBrowserAuthState(send, authState);
  await send("Page.navigate", { url: route.toString() });

  let ready = await waitForReady(send);
  if (!ready.ok) {
    throw new Error(`Creature equipment proof did not become ready: ${JSON.stringify(ready)}`);
  }
  if (settleSeconds > 0) {
    await sleep(settleSeconds * 1000);
    ready = await waitForReady(send);
  }

  const samples = [];
  for (const timeSeconds of frameTimes) {
    const sample = await sampleAnimationFrame(send, timeSeconds);
    const issues = collectFrameIssues(sample);
    const framePath = path.join(
      outDir,
      `${fileStem}-frame-${String(Math.round(timeSeconds * 1000)).padStart(5, "0")}ms.png`
    );
    writeDataUrlFile(framePath, sample.dataUrl);
    samples.push({
      requestedTimeSeconds: timeSeconds,
      path: framePath,
      sha256: hashFileSha256(framePath),
      sizeBytes: fs.statSync(framePath).size,
      issues,
      dataset: sample.dataset,
      sceneGraph: sample.sceneGraph,
      runtimeSamples: sample.samples
    });
    if (issues.length > 0) {
      fs.writeFileSync(
        path.join(outDir, `${fileStem}-frame-${String(Math.round(timeSeconds * 1000)).padStart(5, "0")}ms-diagnostic-state.json`),
        `${JSON.stringify(samples[samples.length - 1], null, 2)}\n`
      );
      throw new Error(
        `Creature equipment proof frame failed at ${timeSeconds}s: ${JSON.stringify(issues)}`
      );
    }
  }

  const videoFrameDir = path.join(outDir, `${fileStem}-video-frames`);
  fs.mkdirSync(videoFrameDir, { recursive: true });
  const videoFrameCount = Math.max(2, Math.ceil(videoSeconds * videoFps));
  for (let index = 0; index < videoFrameCount; index += 1) {
    const timeSeconds = index / videoFps;
    const sample = await sampleAnimationFrame(send, timeSeconds);
    writeDataUrlFile(
      path.join(videoFrameDir, `frame-${String(index).padStart(4, "0")}.png`),
      sample.dataUrl
    );
  }
  const videoPath = path.join(outDir, `${fileStem}-animation.mp4`);
  await encodeMp4FromFrames({ frameDir: videoFrameDir, mp4Path: videoPath, fps: videoFps });

  const canvasPath = path.join(outDir, `${fileStem}-canvas.png`);
  writeDataUrlFile(canvasPath, samples[Math.min(1, samples.length - 1)]?.dataset ? (await sampleAnimationFrame(send, 0.25)).dataUrl : samples[0].dataUrl);

  const summary = {
    version: "aurora-creature-equipment-animation-proof/v1",
    capturedAt: new Date().toISOString(),
    route: route.toString(),
    cacheKey,
    sourceResref,
    equipmentResref,
    equipmentResrefs,
    resref,
    animationName,
    ok: true,
    issues: [],
    ready,
    canvasPath,
    videoPath,
    videoBytes: fs.statSync(videoPath).size,
    frameSamplePaths: samples.map((sample) => sample.path),
    samples,
    chromeStderrTail: chromeStderr.slice(-1200)
  };
  const summaryPath = path.join(outDir, `${fileStem}-summary.json`);
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  ws.close();
  return {
    ...summary,
    summaryPath
  };
}

async function waitForReady(send) {
  let last = null;
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const status = await readStatus(send);
    last = status;
    if (status.ok) {
      return status;
    }
    await sleep(250);
  }
  return last ?? { ok: false, issue: "no_status" };
}

async function readStatus(send) {
  const result = await evaluate(send, {
    returnByValue: true,
    expression: `(() => {
      const expectedModelPattern = ${JSON.stringify(expectedModelPattern)};
      const expectedTransformPattern = ${JSON.stringify(expectedTransformPattern)};
      const expectedMinimumModelParts = ${JSON.stringify(expectedMinimumModelParts)};
      const runner = document.querySelector("[data-testid='creature-equipment-animation-proof-runner']");
      const canvas = document.querySelector("canvas");
      const hook = window.__auroraCreatureProofRuntime;
      let sample = null;
      try {
        sample = hook?.sampleAnimationState?.(0) ?? null;
      } catch (error) {
        sample = { ok: false, issue: error instanceof Error ? error.message : String(error) };
      }
      const dataset = sample?.dataset ?? {};
      const loaded = Number(dataset.placeableModelCreatureEquipmentModelPartLoadedCount ?? 0);
      const total = Number(dataset.placeableModelCreatureEquipmentModelPartTotalCount ?? 0);
      const resrefs = String(dataset.placeableModelCreatureEquipmentModelPartResRefs ?? "");
      const transforms = String(dataset.placeableModelCreatureEquipmentModelPartItemGroupTransformStatuses ?? "");
      const actions = String(dataset.creatureAnimationMixerActionNames ?? "");
      const playbackStatuses = String(dataset.creatureAnimationMixerPlaybackStatuses ?? "");
      const expectedModelOk =
        !expectedModelPattern || new RegExp(expectedModelPattern, "iu").test(resrefs);
      const expectedTransformOk =
        !expectedTransformPattern || new RegExp(expectedTransformPattern, "iu").test(transforms);
      const ok =
        window.location.pathname === "/dev/creature-equipment-animation-proof" &&
        runner?.getAttribute("data-render-status") === "ready" &&
        Boolean(canvas) &&
        sample?.ok === true &&
        total >= expectedMinimumModelParts &&
        loaded === total &&
        expectedModelOk &&
        expectedTransformOk &&
        actions.toLowerCase().includes(${JSON.stringify(animationName.toLowerCase())}) &&
        /playing|ready|completed/iu.test(playbackStatuses);
      return {
        ok,
        href: window.location.href,
        runnerPresent: Boolean(runner),
        canvasPresent: Boolean(canvas),
        renderStatus: runner?.getAttribute("data-render-status") ?? "",
        error: runner?.getAttribute("data-error") ?? "",
        sampleOk: sample?.ok === true,
        sampleIssue: sample?.issue ?? "",
        loaded,
        total,
        resrefs,
        transforms,
        expectedModelPattern,
        expectedModelOk,
        expectedTransformPattern,
        expectedTransformOk,
        actions,
        playbackStatuses,
        dataset
      };
    })()`
  });
  return result.result.value;
}

async function sampleAnimationFrame(send, timeSeconds) {
  const result = await evaluate(send, {
    returnByValue: true,
    expression: `(() => {
      const hook = window.__auroraCreatureProofRuntime;
      if (!hook?.sampleAnimationFrame) {
        return { ok: false, issue: "creature_proof_runtime_hook_missing" };
      }
      return hook.sampleAnimationFrame(${JSON.stringify(timeSeconds)});
    })()`
  });
  const value = result.result.value;
  if (!value?.ok || !String(value.dataUrl ?? "").startsWith("data:image/png;base64,")) {
    throw new Error(`Creature equipment frame sample failed: ${JSON.stringify(value)}`);
  }
  return value;
}

function collectFrameIssues(frame) {
  const issues = [];
  const dataset = frame?.dataset ?? {};
  const sceneGraph = frame?.sceneGraph ?? null;
  if (!sceneGraph || typeof sceneGraph !== "object") {
    return ["creature_scenegraph_missing"];
  }
  const equipmentVisibleMeshCount = Number(sceneGraph.equipmentVisibleMeshCount ?? 0);
  if (!Number.isFinite(equipmentVisibleMeshCount) || equipmentVisibleMeshCount <= 0) {
    issues.push("creature_equipment_scenegraph_missing_visible_meshes");
  }
  const resrefs = String(dataset.placeableModelCreatureEquipmentModelPartResRefs ?? "");
  const paths = Array.isArray(sceneGraph.visibleMeshPaths)
    ? sceneGraph.visibleMeshPaths.map((entry) => String(entry ?? ""))
    : [];
  const expectedRegex = expectedModelPattern ? new RegExp(expectedModelPattern, "iu") : null;
  const expectedPaths = expectedRegex
    ? paths.filter((pathEntry) => expectedRegex.test(pathEntry))
    : [];
  if (expectedRegex && !expectedRegex.test(resrefs)) {
    issues.push("creature_expected_equipment_model_parts_missing");
  }
  if (expectedRegex && expectedPaths.length === 0) {
    issues.push("creature_expected_equipment_scenegraph_paths_missing");
  }
  if (
    expectedTarget &&
    expectedPaths.length > 0 &&
    !expectedPaths.some((pathEntry) => sceneGraphPathIncludesCreatureNode(pathEntry, expectedTarget))
  ) {
    issues.push(`creature_expected_equipment_target_missing:${expectedTarget}`);
  }
  if (
    expectedPaths.some(
      (pathEntry) =>
        sceneGraphPathIncludesCreatureNode(pathEntry, "rootdummy") &&
        !sceneGraphPathIncludesCreatureNode(pathEntry, "rhand_g") &&
        !sceneGraphPathIncludesCreatureNode(pathEntry, "lhand_g")
    )
  ) {
    issues.push("creature_expected_equipment_loose_rootdummy_path");
  }
  issues.push(...collectCreatureHeldWeaponGripIssues(sceneGraph, dataset));
  return issues;
}

function collectCreatureHeldWeaponGripIssues(sceneGraph, dataset) {
  const transformStatuses = splitPipeValue(
    dataset?.placeableModelCreatureEquipmentModelPartItemGroupTransformStatuses ??
      dataset?.creaturePartModelRuntimeEquipmentItemGroupTransformStatuses
  );
  if (
    !transformStatuses.some(
      (status) =>
        status.includes("held-weapon") ||
        status.includes("held-long-melee") ||
        status.includes("held-bow") ||
        status.includes("held-crossbow") ||
        status.includes("held-sling") ||
        status.includes("runtime-ammunition")
    )
  ) {
    return [];
  }
  const names = Array.isArray(sceneGraph?.visibleMeshNames)
    ? sceneGraph.visibleMeshNames.map((entry) => String(entry ?? ""))
    : [];
  const paths = Array.isArray(sceneGraph?.visibleMeshPaths)
    ? sceneGraph.visibleMeshPaths.map((entry) => String(entry ?? ""))
    : [];
  const centers = parseSceneGraphVectorEntries(sceneGraph?.visibleMeshCenters);
  const handTargets = new Set(
    paths
      .map((pathEntry) => pathEntry.split(">").map((part) => part.trim()))
      .filter((parts) =>
        parts.some((part) => /^creature_equipment_item_/iu.test(part)) &&
        parts.some((part) =>
          /^(?:rhand_g|lhand_g)$/iu.test(normalizeCreatureSceneGraphNodeName(part))
        )
      )
      .map((parts) =>
        normalizeCreatureSceneGraphNodeName(
          parts.find((part) =>
            /^(?:rhand_g|lhand_g)$/iu.test(normalizeCreatureSceneGraphNodeName(part))
          ) ?? ""
        )
      )
      .filter(Boolean)
  );
  const issues = [];
  handTargets.forEach((target) => {
    const handCenters = names
      .map((name, index) => ({
        name,
        path: paths[index] ?? "",
        center: centers[index]
      }))
      .filter((entry) => entry.center)
      .filter((entry) => isCreatureVisibleHandMeshForTarget(entry.name, entry.path, target))
      .map((entry) => entry.center);
    const equipmentCenters = names
      .map((name, index) => ({
        path: paths[index] ?? "",
        center: centers[index]
      }))
      .filter((entry) => entry.center)
      .filter((entry) => isCreatureVisibleEquipmentMeshForTarget(entry.path, target))
      .map((entry) => entry.center);
    if (equipmentCenters.length === 0) {
      return;
    }
    if (handCenters.length === 0) {
      if (hasCreatureEquipmentBoneChainForTarget(paths, target)) {
        return;
      }
      issues.push(`creature_held_weapon_grip_hand_mesh_missing:${target}`);
      return;
    }
    const bestDistance = handCenters.reduce((best, handCenter) => {
      const distance = resolveCreatureHeldWeaponGripDistance(handCenter, equipmentCenters);
      return Math.min(best, distance);
    }, Number.POSITIVE_INFINITY);
    const threshold = equipmentCenters.length > 1 ? 0.12 : 0.14;
    if (!Number.isFinite(bestDistance) || bestDistance > threshold) {
      issues.push(`creature_held_weapon_grip_not_near_hand:${target}:${formatProofNumber(bestDistance)}`);
    }
  });
  return issues;
}

function splitPipeValue(value) {
  return String(value ?? "")
    .split("|")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function parseSceneGraphVectorEntries(entries) {
  const parsed = [];
  if (!Array.isArray(entries)) {
    return parsed;
  }
  entries.forEach((entry) => {
    const text = String(entry ?? "");
    const separatorIndex = text.indexOf(":");
    if (separatorIndex < 1) {
      parsed.push(null);
      return;
    }
    const values = text
      .slice(separatorIndex + 1)
      .split(",")
      .map((value) => Number(value.trim()));
    parsed.push(values.length === 3 && values.every((value) => Number.isFinite(value)) ? values : null);
  });
  return parsed;
}

function normalizeCreatureSceneGraphNodeName(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const handAliasMatch = normalized.match(/^([rl]hand_g)\d+$/u);
  return handAliasMatch?.[1] ?? normalized;
}

function sceneGraphPathIncludesCreatureNode(pathEntry, target) {
  return String(pathEntry ?? "")
    .split(">")
    .map((part) => normalizeCreatureSceneGraphNodeName(part))
    .some((part) => part === target);
}

function isCreatureVisibleHandMeshForTarget(name, path, target) {
  const parts = path
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
  const normalizedName = normalizeCreatureSceneGraphNodeName(name);
  const hasTargetBone = parts.some(
    (part) => normalizeCreatureSceneGraphNodeName(part) === target
  );
  return (
    hasTargetBone &&
    !parts.some((part) => /^creature_equipment_/iu.test(part)) &&
    (normalizedName.includes("hand") ||
      normalizeCreatureSceneGraphNodeName(parts[0]) === target)
  );
}

function isCreatureVisibleEquipmentMeshForTarget(pathEntry, target) {
  const parts = pathEntry.split(">").map((part) => part.trim());
  return (
    parts.some((part) => /^creature_equipment_item_/iu.test(part)) &&
    parts.some((part) => normalizeCreatureSceneGraphNodeName(part) === target)
  );
}

function hasCreatureEquipmentBoneChainForTarget(paths, target) {
  return paths.some((pathEntry) => {
    const parts = String(pathEntry ?? "")
      .split(">")
      .map((part) => part.trim())
      .filter(Boolean);
    return (
      parts.some((part) => /^creature_equipment_item_/iu.test(part)) &&
      parts.some((part) => normalizeCreatureSceneGraphNodeName(part) === target)
    );
  });
}

function resolveCreatureHeldWeaponGripDistance(handCenter, equipmentCenters) {
  if (equipmentCenters.length === 1) {
    return vectorDistance(handCenter, equipmentCenters[0]);
  }
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let leftIndex = 0; leftIndex < equipmentCenters.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < equipmentCenters.length; rightIndex += 1) {
      bestDistance = Math.min(
        bestDistance,
        distancePointToSegment(handCenter, equipmentCenters[leftIndex], equipmentCenters[rightIndex])
      );
    }
  }
  return bestDistance;
}

function vectorDistance(left, right) {
  return Math.sqrt(
    (left[0] - right[0]) ** 2 +
      (left[1] - right[1]) ** 2 +
      (left[2] - right[2]) ** 2
  );
}

function distancePointToSegment(point, segmentStart, segmentEnd) {
  const segment = [
    segmentEnd[0] - segmentStart[0],
    segmentEnd[1] - segmentStart[1],
    segmentEnd[2] - segmentStart[2]
  ];
  const segmentLengthSquared =
    segment[0] ** 2 + segment[1] ** 2 + segment[2] ** 2;
  if (segmentLengthSquared <= 0.0000001) {
    return vectorDistance(point, segmentStart);
  }
  const pointVector = [
    point[0] - segmentStart[0],
    point[1] - segmentStart[1],
    point[2] - segmentStart[2]
  ];
  const t = Math.max(
    0,
    Math.min(
      1,
      (pointVector[0] * segment[0] +
        pointVector[1] * segment[1] +
        pointVector[2] * segment[2]) /
        segmentLengthSquared
    )
  );
  return vectorDistance(point, [
    segmentStart[0] + segment[0] * t,
    segmentStart[1] + segment[1] * t,
    segmentStart[2] + segment[2] * t
  ]);
}

function formatProofNumber(value) {
  return Number.isFinite(value) ? value.toFixed(4) : "nan";
}

async function createPersistedAuthState({ apiBaseUrl, username, password }) {
  const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const loginPayload = await parseJsonResponse(loginResponse, "login");
  const accessToken = loginPayload.data?.session?.accessToken;
  if (!accessToken) {
    throw new Error("Backend login returned no access token.");
  }
  const meResponse = await fetch(`${apiBaseUrl}/auth/me`, {
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

async function installBrowserAuthState(send, authState) {
  const authJson = JSON.stringify(authState);
  const source = `(() => {
    try {
      window.localStorage.setItem("aurora_web.auth_session.v1", ${JSON.stringify(authJson)});
    } catch {}
  })();`;
  await send("Page.addScriptToEvaluateOnNewDocument", { source });
}

async function encodeMp4FromFrames({ frameDir, mp4Path, fps }) {
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`ffmpeg not found at ${ffmpegPath}`);
  }
  const result = await runProcess(ffmpegPath, [
    "-y",
    "-framerate",
    String(fps),
    "-i",
    path.join(frameDir, "frame-%04d.png"),
    "-vf",
    "format=yuv420p",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    mp4Path
  ]);
  const bytes = fs.existsSync(mp4Path) ? fs.statSync(mp4Path).size : 0;
  if (result.exitCode !== 0 || bytes <= 4096) {
    throw new Error(
      `ffmpeg failed: ${JSON.stringify({
        exitCode: result.exitCode,
        stdout: result.stdout.slice(-1000),
        stderr: result.stderr.slice(-2000),
        bytes
      })}`
    );
  }
}

function runProcess(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

function writeDataUrlFile(outputPath, dataUrl) {
  const prefix = "data:image/png;base64,";
  if (!String(dataUrl).startsWith(prefix)) {
    throw new Error("Expected PNG data URL.");
  }
  fs.writeFileSync(outputPath, Buffer.from(dataUrl.slice(prefix.length), "base64"));
}

function hashFileSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function evaluate(send, params) {
  return send("Runtime.evaluate", { awaitPromise: true, ...params });
}

async function waitForTab(portNumber) {
  const endpoint = `http://127.0.0.1:${portNumber}/json`;
  for (let attempt = 0; attempt < 160; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const tabs = await response.json();
        const tab = tabs.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
        if (tab) {
          return tab;
        }
      }
    } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for Chrome CDP tab on port ${portNumber}.`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function parseNumberList(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry >= 0);
}

function parseStringList(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function inferExpectedEquipmentModelPattern(resrefs) {
  const tokens = resrefs
    .map((entry) => {
      const normalized = String(entry ?? "").trim().toLowerCase();
      if (/wammar/u.test(normalized)) {
        return "wamar";
      }
      if (/wammbo/u.test(normalized)) {
        return "wambo";
      }
      const match = normalized.match(/(?:^|_)((?:w[a-z]{3,5}))/u);
      return match?.[1] ?? "";
    })
    .filter(Boolean);
  return tokens.length > 0 ? tokens.join("|") : "";
}

function sanitizeFileStem(value) {
  return String(value).replace(/[^a-z0-9_-]+/giu, "-").replace(/^-+|-+$/gu, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceProcessExits(process, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (process.exitCode === null) {
        process.kill("SIGKILL");
      }
      resolve();
    }, timeoutMs);
    process.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function removeDirBestEffort(dirPath) {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {}
}
