import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL = "http://127.0.0.1:5173";
const DEFAULT_AUTH_BASE_URL = "http://127.0.0.1:3000/api/v1";
const DEFAULT_USERNAME = "builder.user";
const DEFAULT_PASSWORD = "builder123";

const options = parseArgs(process.argv.slice(2));
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseUrl = String(options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/u, "");
const authBaseUrl = String(options.authBaseUrl ?? DEFAULT_AUTH_BASE_URL).replace(/\/+$/u, "");
const username = String(options.username ?? process.env.AURORA_TEST_USERNAME ?? DEFAULT_USERNAME);
const password = String(options.password ?? process.env.AURORA_TEST_PASSWORD ?? DEFAULT_PASSWORD);
const animationState = parseOptionalInteger(options.animationState);
const animationName = String(
  animationState === null ? (options.animationName ?? "1hslashl") : (options.animationName ?? "")
).trim();
const animationFallback = String(options.animationFallback ?? "first");
const animationFrameTimes = String(options.animationFrameTimes ?? "0,0.2,0.5,0.9");
const chunkSize = Math.max(1, Number(options.chunkSize ?? 5));
const startIndex = Math.max(0, Number(options.start ?? 0));
const endIndexOption = options.end === undefined ? null : Math.max(startIndex, Number(options.end));
const maxChunks = options.maxChunks === undefined ? Infinity : Math.max(1, Number(options.maxChunks));
const chunkTimeoutMs = Math.max(60_000, Number(options.chunkTimeoutMs ?? 720_000));
const resume = parseBoolean(options.resume ?? "true");
const retryFailures = parseBoolean(options.retryFailures ?? "true");
const retryAttempts = Math.max(1, Number(options.retryAttempts ?? 2));
const requireHealthyBackend = parseBoolean(options.requireHealthyBackend ?? "false");
const backendHealthWaitMs = Math.max(30_000, Number(options.backendHealthWaitMs ?? 900_000));
const backendHealthPollMs = Math.max(500, Number(options.backendHealthPollMs ?? 5_000));
const backendHealthStableSamples = Math.max(
  1,
  Number(options.backendHealthStableSamples ?? 3)
);
const allowAnimationStateUnavailable = parseBoolean(
  options.allowAnimationStateUnavailable ?? "false"
);
const outDir = path.resolve(
  options.outDir ?? "frontend/public/aurora-evidence/creatures/animation-loop-audit-cdp"
);
const resrefsPath = options.resrefsPath ? path.resolve(String(options.resrefsPath)) : null;
const cachedResrefsPath = path.join(outDir, "creature-resrefs.txt");

if (animationState !== null && animationName) {
  throw new Error("Use either --animationName or --animationState, not both.");
}

fs.mkdirSync(outDir, { recursive: true });

if (requireHealthyBackend) {
  await waitForHealthyBackend("manifest");
}
const allResrefs = await loadCreatureResrefs();
const endIndex = Math.min(
  allResrefs.length,
  endIndexOption === null ? allResrefs.length : endIndexOption
);
const selectedResrefs = allResrefs.slice(startIndex, endIndex);
let processedChunks = 0;

for (let index = 0; index < selectedResrefs.length && processedChunks < maxChunks; index += chunkSize) {
  const absoluteStart = startIndex + index;
  const chunk = selectedResrefs.slice(index, index + chunkSize);
  const absoluteEndExclusive = absoluteStart + chunk.length;
  const chunkDir = path.join(
    outDir,
    `batch-${String(absoluteStart).padStart(4, "0")}-${String(absoluteEndExclusive - 1).padStart(4, "0")}`
  );
  const summaryPath = path.join(chunkDir, "summary.json");
  if (resume && isResolvedChunkSummary(summaryPath, chunkDir, chunk)) {
    console.log(`skip ${absoluteStart}-${absoluteEndExclusive - 1}: resolved`);
    writeAggregateSummarySafe(`skip ${absoluteStart}-${absoluteEndExclusive - 1}`);
    continue;
  }
  fs.mkdirSync(chunkDir, { recursive: true });
  if (requireHealthyBackend) {
    await waitForHealthyBackend(`chunk ${absoluteStart}-${absoluteEndExclusive - 1}`);
  }
  console.log(`run ${absoluteStart}-${absoluteEndExclusive - 1}: ${chunk.join(",")}`);
  const result = await runCaptureChunk(chunk, chunkDir);
  if (!result.ok) {
    console.error(`chunk ${absoluteStart}-${absoluteEndExclusive - 1} failed: ${result.errorMessage}`);
    writeChildProcessTailArtifacts(chunkDir, result);
    writeChildProcessTailToConsole(result);
  }
  if (retryFailures) {
    await retryFailedCaptures(summaryPath, chunkDir, chunk);
  }
  processedChunks += 1;
  writeAggregateSummarySafe(`chunk ${absoluteStart}-${absoluteEndExclusive - 1}`);
}

writeAggregateSummarySafe("final");

async function loadCreatureResrefs() {
  const sourcePath = resrefsPath ?? (resume && fs.existsSync(cachedResrefsPath)
    ? cachedResrefsPath
    : null);
  if (sourcePath) {
    const cached = fs
      .readFileSync(sourcePath, "utf8")
      .split(/\r?\n/u)
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (cached.length > 0) {
      console.log(`load creature resrefs: ${cached.length} from ${sourcePath}`);
      return cached;
    }
  }
  const fetched = await fetchCreatureResrefs();
  fs.writeFileSync(cachedResrefsPath, `${fetched.join("\n")}\n`);
  console.log(`write creature resrefs: ${fetched.length} to ${cachedResrefsPath}`);
  return fetched;
}

async function fetchCreatureResrefs() {
  const loginResponse = await fetch(`${authBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!loginResponse.ok) {
    throw new Error(`Backend login failed: ${loginResponse.status} ${await loginResponse.text()}`);
  }
  const loginPayload = await loginResponse.json();
  const accessToken = loginPayload.data?.session?.accessToken;
  if (!accessToken) {
    throw new Error("Backend login returned no access token.");
  }
  const resrefs = [];
  let offset = 0;
  const limit = 250;
  let total = Infinity;
  while (offset < total) {
    const response = await fetch(`${authBaseUrl}/catalog/creatures?limit=${limit}&offset=${offset}`, {
      headers: { authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      throw new Error(`Creature list failed: ${response.status} ${await response.text()}`);
    }
    const payload = await response.json();
    const data = payload.data ?? payload;
    const items = Array.isArray(data.items) ? data.items : [];
    total = Number.isFinite(data.total) ? data.total : items.length;
    resrefs.push(...items.map((item) => String(item.resref ?? item.templateId ?? "").trim()).filter(Boolean));
    offset += items.length;
    if (items.length === 0) {
      break;
    }
  }
  return resrefs;
}

function runCaptureChunk(resrefs, chunkDir) {
  return new Promise((resolve) => {
    const animationSelectionArgs =
      animationState !== null
        ? [
            "--animationState",
            String(animationState),
            ...(allowAnimationStateUnavailable
              ? ["--expectAnimationStateMappingStatus", "state-mapped-or-unavailable"]
              : [])
          ]
        : ["--animationName", animationName, "--animationFallback", animationFallback];
    const child = spawn(
      process.execPath,
      [
        "backend/scripts/capture-creatures-mode-cdp.mjs",
        "--baseUrl",
        baseUrl,
        "--authBaseUrl",
        authBaseUrl,
        "--resrefs",
        resrefs.join(","),
        ...animationSelectionArgs,
        "--continueOnError",
        "true",
        "--recordVideo",
        "false",
        "--captureScreenshots",
        "false",
        "--animationFrameCaptureMode",
        "state",
        "--animationFrameTimes",
        animationFrameTimes,
        "--canvasReadyMaxAttempts",
        "900",
        "--canvasReadyIntervalMs",
        "150",
        "--outDir",
        chunkDir
      ],
      { cwd: repositoryRoot, stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
    );
    let stdoutTail = "";
    let stderrTail = "";
    const trimTail = (value) => value.slice(-8000);
    child.stdout.on("data", (chunk) => {
      stdoutTail = trimTail(stdoutTail + chunk.toString());
    });
    child.stderr.on("data", (chunk) => {
      stderrTail = trimTail(stderrTail + chunk.toString());
    });
    const timeout = setTimeout(() => {
      killProcessTree(child.pid);
      resolve({
        ok: false,
        errorMessage: `chunk timeout after ${chunkTimeoutMs}ms`,
        stdoutTail,
        stderrTail
      });
    }, chunkTimeoutMs);
    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      resolve({
        ok: code === 0,
        errorMessage: code === 0 ? null : `exit code=${code} signal=${signal}`,
        stdoutTail,
        stderrTail
      });
    });
  });
}

function killProcessTree(pid) {
  if (!pid) {
    return;
  }
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // already exited
  }
}

async function retryFailedCaptures(summaryPath, chunkDir, expectedResrefs) {
  let captures = [];
  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    captures = Array.isArray(summary.captures) ? summary.captures : [];
  } catch {
    captures = [];
  }
  const seenResrefs = new Set(
    captures
      .map((capture) => String(capture?.resref ?? "").trim().toLowerCase())
      .filter(Boolean)
  );
  const retryResrefs = Array.from(
    new Set([
      ...captures
        .filter((capture) => capture?.ok !== true && capture?.resref)
        .map((capture) => String(capture.resref).trim())
        .filter(Boolean),
      ...expectedResrefs.filter((resref) => !seenResrefs.has(String(resref).trim().toLowerCase()))
    ])
  );
  for (const resref of retryResrefs) {
    for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
      const retryDir = `${chunkDir}-retry-${sanitizeFileStem(resref)}-${attempt}`;
      const retrySummaryPath = path.join(retryDir, "summary.json");
      if (resume && isSuccessfulChunkSummary(retrySummaryPath, 1)) {
        break;
      }
      if (resume && isCompleteChunkSummary(retrySummaryPath, 1) && attempt < retryAttempts) {
        continue;
      }
      fs.mkdirSync(retryDir, { recursive: true });
      if (requireHealthyBackend) {
        await waitForHealthyBackend(`retry ${resref} attempt ${attempt}`);
      }
      console.log(`retry ${resref} attempt ${attempt}/${retryAttempts}: ${retryDir}`);
      const retryResult = await runCaptureChunk([resref], retryDir);
      if (!retryResult.ok) {
        console.error(`retry ${resref} attempt ${attempt}/${retryAttempts} failed: ${retryResult.errorMessage}`);
        writeChildProcessTailArtifacts(retryDir, retryResult);
        writeChildProcessTailToConsole(retryResult);
      }
      if (isSuccessfulChunkSummary(retrySummaryPath, 1)) {
        break;
      }
    }
  }
}

async function waitForHealthyBackend(context) {
  const startedAt = Date.now();
  let stableSamples = 0;
  let waitingLogged = false;
  let lastStatus = "unreachable";
  while (Date.now() - startedAt < backendHealthWaitMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(5_000, backendHealthPollMs));
    try {
      const response = await fetch(`${authBaseUrl}/health`, { signal: controller.signal });
      const payload = response.ok ? await response.json().catch(() => null) : null;
      const healthy = response.ok && payload?.status === "ok";
      lastStatus = healthy ? "ok" : `http-${response.status}`;
      stableSamples = healthy ? stableSamples + 1 : 0;
      if (stableSamples >= backendHealthStableSamples) {
        if (waitingLogged) {
          console.log(`backend health recovered before ${context}`);
        }
        return;
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
      stableSamples = 0;
    } finally {
      clearTimeout(timeout);
    }
    if (!waitingLogged) {
      console.log(`wait backend health before ${context}`);
      waitingLogged = true;
    }
    await sleep(backendHealthPollMs);
  }
  throw new Error(
    `Backend health did not stabilize before ${context} within ${backendHealthWaitMs}ms; lastStatus=${lastStatus}`
  );
}

function isCompleteChunkSummary(summaryPath, expectedCount) {
  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    return summary.requestedCount === expectedCount && summary.count === expectedCount;
  } catch {
    return false;
  }
}

function isResolvedChunkSummary(summaryPath, chunkDir, expectedResrefs) {
  let captures = [];
  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    captures = Array.isArray(summary.captures) ? summary.captures : [];
  } catch {
    captures = [];
  }

  const captureByResref = new Map(
    captures
      .filter((capture) => capture?.resref)
      .map((capture) => [String(capture.resref).trim().toLowerCase(), capture])
  );
  const parentDir = path.dirname(chunkDir);
  const chunkName = path.basename(chunkDir);
  let retryDirNames = [];
  try {
    retryDirNames = fs
      .readdirSync(parentDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${chunkName}-retry-`))
      .map((entry) => entry.name);
  } catch {
    retryDirNames = [];
  }

  return expectedResrefs.every((resref) => {
    const normalized = String(resref).trim().toLowerCase();
    const capture = captureByResref.get(normalized);
    if (capture?.ok === true) {
      return true;
    }
    const retryPrefix = `${chunkName}-retry-${sanitizeFileStem(resref)}-`;
    const retrySummaryPaths = retryDirNames
      .filter((name) => name.startsWith(retryPrefix))
      .map((name) => path.join(parentDir, name, "summary.json"));
    if (retrySummaryPaths.some((retrySummaryPath) =>
      isSuccessfulChunkSummary(retrySummaryPath, 1)
    )) {
      return true;
    }
    return retrySummaryPaths.filter((retrySummaryPath) =>
      isCompleteChunkSummary(retrySummaryPath, 1)
    ).length >= retryAttempts;
  });
}

function isSuccessfulChunkSummary(summaryPath, expectedCount) {
  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    return (
      summary.requestedCount === expectedCount &&
      summary.count === expectedCount &&
      summary.failedCount === 0
    );
  } catch {
    return false;
  }
}

function writeAggregateSummary() {
  const aggregate = buildAggregateSummary();
  fs.writeFileSync(
    path.join(outDir, "animation-loop-audit-summary.json"),
    `${JSON.stringify(aggregate, null, 2)}\n`
  );
}

function writeAggregateSummarySafe(context) {
  try {
    writeAggregateSummary();
  } catch (error) {
    const errorPayload = {
      version: "aurora-creature-animation-loop-audit-aggregate-error/v1",
      updatedAt: new Date().toISOString(),
      context,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null
    };
    fs.writeFileSync(
      path.join(outDir, `animation-loop-audit-aggregate-error-${Date.now()}.json`),
      `${JSON.stringify(errorPayload, null, 2)}\n`
    );
    console.error(`aggregate summary failed during ${context}: ${errorPayload.errorMessage}`);
  }
}

function writeChildProcessTailArtifacts(dir, result) {
  const payload = {
    version: "aurora-creature-animation-loop-child-failure/v1",
    capturedAt: new Date().toISOString(),
    ok: result.ok,
    errorMessage: result.errorMessage ?? null,
    stdoutTail: result.stdoutTail ?? "",
    stderrTail: result.stderrTail ?? ""
  };
  fs.writeFileSync(
    path.join(dir, "child-process-failure.json"),
    `${JSON.stringify(payload, null, 2)}\n`
  );
  if (payload.stdoutTail) {
    fs.writeFileSync(path.join(dir, "child-stdout-tail.txt"), payload.stdoutTail);
  }
  if (payload.stderrTail) {
    fs.writeFileSync(path.join(dir, "child-stderr-tail.txt"), payload.stderrTail);
  }
}

function writeChildProcessTailToConsole(result) {
  const stdoutTail = String(result.stdoutTail ?? "").trim();
  const stderrTail = String(result.stderrTail ?? "").trim();
  if (stdoutTail) {
    console.error(`child stdout tail:\n${stdoutTail}`);
  }
  if (stderrTail) {
    console.error(`child stderr tail:\n${stderrTail}`);
  }
}

function buildAggregateSummary() {
  const states = [];
  const chunkSummaries = [];
  for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
    if (
      !entry.isDirectory() ||
      (!entry.name.startsWith("batch-") && !entry.name.includes("-retry-"))
    ) {
      continue;
    }
    const chunkDir = path.join(outDir, entry.name);
    const summaryPath = path.join(chunkDir, "summary.json");
    if (fs.existsSync(summaryPath)) {
      try {
        chunkSummaries.push(JSON.parse(fs.readFileSync(summaryPath, "utf8")));
      } catch {
        // keep scanning states even when a summary is partial.
      }
    }
    for (const file of fs.readdirSync(chunkDir)) {
      if (
        !file.endsWith("-state.json") ||
        file.endsWith("-diagnostic-state.json")
      ) {
        continue;
      }
      try {
        states.push(analyzeState(path.join(chunkDir, file)));
      } catch (error) {
        states.push({
          statePath: path.join(chunkDir, file),
          ok: false,
          resref: file.replace(/-state\.json$/u, ""),
          issues: ["state_parse_failed"],
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
  const latestStates = Array.from(
    states
      .sort((left, right) => left.mtimeMs - right.mtimeMs)
      .reduce((byResref, state) => byResref.set(state.resref, state), new Map())
      .values()
  );
  const issueCounts = {};
  for (const state of latestStates) {
    for (const issue of state.issues) {
      issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
    }
  }
  return {
    version: "aurora-creature-animation-loop-audit/v1",
    updatedAt: new Date().toISOString(),
    requested: {
      baseUrl,
      authBaseUrl,
      animationName,
      animationState,
      animationFallback,
      animationFrameTimes,
      allowAnimationStateUnavailable,
      requireHealthyBackend,
      backendHealthStableSamples,
      startIndex,
      endIndex,
      chunkSize
    },
    totals: {
      manifestResrefs: allResrefs.length,
      scopedResrefs: selectedResrefs.length,
      chunkSummaries: chunkSummaries.length,
      rawStates: states.length,
      states: latestStates.length,
      ok: latestStates.filter((state) => state.ok && state.issues.length === 0).length,
      failed: latestStates.filter((state) => !state.ok || state.issues.length > 0).length,
      noAnimationOptions: latestStates.filter((state) => state.noAnimationOptions).length,
      fallbackSelected: latestStates.filter((state) => state.fallbackSelected).length,
      loopFallbackSelected: latestStates.filter(
        (state) => state.fallbackSelected && state.loopModes.includes("loop")
      ).length,
      stateMapped: latestStates.filter((state) => state.stateMapped).length,
      stateClipUnavailable: latestStates.filter((state) => state.stateClipUnavailable).length
    },
    issueCounts,
    issues: latestStates.filter((state) => !state.ok || state.issues.length > 0),
    states: latestStates
  };
}

function analyzeState(statePath) {
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const mtimeMs = fs.statSync(statePath).mtimeMs;
  const statusIssues = Array.isArray(state.status?.issues) ? state.status.issues : [];
  const dataset = state.status?.dataset ?? {};
  const requestedResref = String(state.requestedResref ?? "").trim().toLowerCase();
  const selectedRowText = String(state.status?.selectedRowText ?? "").toLowerCase();
  const rightPanelText = String(state.status?.rightPanelText ?? "").toLowerCase();
  const samples = Array.isArray(state.animationFrameSamples) ? state.animationFrameSamples : [];
  const sampleIssues = Array.from(
    new Set(samples.flatMap((sample) => sample.proofRuntimeIssues ?? []))
  );
  const midSample = samples[Math.min(2, Math.max(0, samples.length - 1))] ?? {};
  const sceneGraph = midSample.proofRuntimeFrame?.sceneGraph ?? null;
  const childNames = Array.isArray(sceneGraph?.objectRootChildNames)
    ? sceneGraph.objectRootChildNames.map((name) => String(name ?? ""))
    : [];
  const issueSet = new Set([...statusIssues, ...sampleIssues]);
  const selectedMatches =
    !requestedResref ||
    selectedRowText.includes(` / ${requestedResref}`) ||
    selectedRowText.includes(`_${requestedResref}`) ||
    rightPanelText.includes(`resref: ${requestedResref}`);
  const runtimeObjectText = [
    dataset.creatureAnimationRuntimeObjectIds,
    dataset.creatureAnimationMixerObjectIds,
    dataset.creaturePartModelRuntimeObjectId,
    dataset.placeableModelObjectId
  ]
    .map((entry) => String(entry ?? "").toLowerCase())
    .filter(Boolean)
    .join(" ");
  const namedRuntimeRoots = childNames
    .filter((name) => name.includes("preview:"))
    .map((name) => name.toLowerCase());
  if (!selectedMatches) {
    issueSet.add("selected_resref_not_visible");
  }
  if (requestedResref && runtimeObjectText && !runtimeObjectText.includes(requestedResref)) {
    issueSet.add("runtime_object_resref_mismatch");
  }
  if (
    requestedResref &&
    namedRuntimeRoots.length > 0 &&
    namedRuntimeRoots.every((name) => !name.includes(requestedResref))
  ) {
    issueSet.add("creature_scenegraph_resref_mismatch");
  }
  const groupCount = childNames.filter((name) => name === "Group").length;
  const partGroupCount = childNames.filter((name) => /:creature-part-models$/iu.test(name)).length;
  const selectedValue = String(state.selectedAnimation?.selectedValue ?? "");
  const fallbackSelected = state.selectedAnimation?.fallbackSelected === true;
  const fallbackMode = String(state.selectedAnimation?.fallbackMode ?? "");
  const noAnimationOptions = state.selectedAnimation?.noAnimationOptions === true;
  const loopModes = String(dataset.creatureAnimationMixerLoopModes ?? "")
    .split("|")
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
  const playbackStatuses = String(dataset.creatureAnimationMixerPlaybackStatuses ?? "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const mappingStatuses = String(
    dataset.creatureAnimationMixerStateMappingStatuses ??
      dataset.creatureAnimationRuntimeStateMappingStatuses ??
      ""
  )
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const stateMapped = mappingStatuses.includes("state-mapped");
  const stateClipUnavailable = mappingStatuses.includes("state-clip-unavailable");
  const changedValues = samples.map((sample) => sample.changedFromPrevious);
  const uniqueSampleHashes = new Set(samples.map((sample) => sample.sha256).filter(Boolean));
  const equipmentStateSignatures = samples
    .map((sample) => sample.equipmentStateSignature ?? deriveEquipmentStateSignature(sample))
    .filter(Boolean);
  const uniqueEquipmentStateSignatures = new Set(equipmentStateSignatures);
  const specialDirectModelWithoutEquipmentOverlay =
    /model type:\s*s\b/iu.test(rightPanelText) &&
    /viewport model:\s*direct model/iu.test(rightPanelText);
  const equipmentModelExpected =
    !specialDirectModelWithoutEquipmentOverlay &&
    /\bmodels\s+[^\n]+->\s*(?:rhand_g|lhand_g|head_g|torso_g)\b/iu.test(rightPanelText);
  const equipmentLoadStatus = String(
    dataset.placeableModelCreatureEquipmentModelPartLoadStatus ?? ""
  );
  const equipmentTotal = Number(
    dataset.placeableModelCreatureEquipmentModelPartTotalCount ?? 0
  );
  const equipmentLoaded = Number(
    dataset.placeableModelCreatureEquipmentModelPartLoadedCount ?? 0
  );
  const runtimeEquipmentVisibleMeshCount = Number(
    dataset.creaturePartModelRuntimeEquipmentVisibleMeshCount ?? 0
  );
  const sceneEquipmentVisibleMeshCount = Number(sceneGraph?.equipmentVisibleMeshCount ?? 0);
  if (hasCreatureLooseBodyHierarchyMeshes(sceneGraph, dataset)) {
    issueSet.add("creature_body_loose_hierarchy_meshes");
  }
  if (fallbackSelected && fallbackMode !== "attack" && !loopModes.includes("loop")) {
    issueSet.add("fallback_animation_not_looping");
  }
  if (equipmentModelExpected) {
    if (
      equipmentLoadStatus !== "loaded" ||
      !Number.isFinite(equipmentTotal) ||
      equipmentTotal <= 0 ||
      !Number.isFinite(equipmentLoaded) ||
      equipmentLoaded < equipmentTotal
    ) {
      issueSet.add("creature_equipment_model_parts_not_loaded");
    } else if (
      !Number.isFinite(runtimeEquipmentVisibleMeshCount) ||
      runtimeEquipmentVisibleMeshCount <= 0
    ) {
      issueSet.add("creature_equipment_model_parts_not_visible");
    }
  }
  if (
    runtimeEquipmentVisibleMeshCount > 0 &&
    (!Number.isFinite(sceneEquipmentVisibleMeshCount) ||
      sceneEquipmentVisibleMeshCount <= 0)
  ) {
    issueSet.add("creature_equipment_scenegraph_missing_visible_meshes");
  }
  if (!stateClipUnavailable && samples.length > 1 && uniqueSampleHashes.size < 2) {
    issueSet.add("animation_state_samples_static");
  }
  if (
    !stateClipUnavailable &&
    samples.length > 1 &&
    changedValues.slice(1).some((value) => value !== true)
  ) {
    issueSet.add("animation_state_sample_not_changed");
  }
  if (
    isCreatureEquipmentMotionExpected(selectedValue) &&
    equipmentStateSignatures.length > 1 &&
    uniqueEquipmentStateSignatures.size < 2
  ) {
    issueSet.add("creature_equipment_animation_static");
  }
  if (groupCount > 1) {
    issueSet.add("direct_model_groups_duplicated");
  }
  if (partGroupCount > 1) {
    issueSet.add("creature_part_model_groups_duplicated");
  }
  if (
    state.status?.ok === true &&
    !noAnimationOptions &&
    !stateClipUnavailable &&
    !playbackStatuses.includes("playing")
  ) {
    issueSet.add("animation_playback_not_playing");
  }
  return {
    statePath,
    mtimeMs,
    resref: state.requestedResref,
    ok: state.status?.ok === true,
    selectedAnimation: selectedValue || null,
    requestedAnimationState:
      typeof state.requestedAnimationState === "number" ? state.requestedAnimationState : null,
    fallbackSelected,
    noAnimationOptions,
    actionNames: String(dataset.creatureAnimationMixerActionNames ?? ""),
    loopModes,
    playbackStatuses,
    mappingStatuses,
    stateMapped,
    stateClipUnavailable,
    childNames,
    visibleMeshCount: sceneGraph?.visibleMeshCount ?? null,
    sampleHashes: uniqueSampleHashes.size,
    issues: Array.from(issueSet).filter(Boolean),
    errorMessage: state.status?.errorMessage ?? null
  };
}

function deriveEquipmentStateSignature(sample) {
  const sceneGraph = sample?.proofRuntimeFrame?.sceneGraph;
  const equipmentVisibleMeshCount = Number(sceneGraph?.equipmentVisibleMeshCount ?? 0);
  if (!Number.isFinite(equipmentVisibleMeshCount) || equipmentVisibleMeshCount <= 0) {
    return "";
  }
  return JSON.stringify({
    equipmentVisibleMeshCount,
    equipmentVisibleMeshNames: sceneGraph?.equipmentVisibleMeshNames ?? [],
    equipmentVisibleMeshTargets: sceneGraph?.equipmentVisibleMeshTargets ?? [],
    equipmentVisibleMeshPaths: sceneGraph?.equipmentVisibleMeshPaths ?? [],
    equipmentVisibleMeshCenters: sceneGraph?.equipmentVisibleMeshCenters ?? [],
    equipmentVisibleMeshSizes: sceneGraph?.equipmentVisibleMeshSizes ?? []
  });
}

function collectCreatureSourceSkinMeshNameKeys(dataset) {
  return new Set(
    [
      dataset?.creatureAnimationMixerSourceSkinningMeshNames,
      dataset?.creatureAnimationRuntimeSourceSkinningMeshNames,
      dataset?.creatureSourceSkinningMeshNames
    ]
      .flatMap((value) =>
        String(value ?? "")
          .split(/[|,]/u)
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean)
      )
  );
}

function hasCreatureLooseBodyHierarchyMeshes(sceneGraph, dataset = {}) {
  const paths = Array.isArray(sceneGraph?.visibleMeshPaths) ? sceneGraph.visibleMeshPaths : [];
  const sourceSkinMeshNameKeys = collectCreatureSourceSkinMeshNameKeys(dataset);
  return paths
    .map((pathEntry) => String(pathEntry ?? ""))
    .some((pathEntry) => {
      const parts = pathEntry.split(">").map((part) => part.trim()).filter(Boolean);
      if (parts.length < 4) {
        return false;
      }
      const [meshName, parentName, grandParentName] = parts;
      if (parentName !== "Group" || grandParentName !== "Object3D") {
        return false;
      }
      if (/^creature_equipment_/iu.test(meshName)) {
        return false;
      }
      if (sourceSkinMeshNameKeys.has(meshName.toLowerCase())) {
        return false;
      }
      return /(?:_g(?:_\d+)?|skinchunk\d*|Object\d+|Mesh\d+)$/iu.test(meshName);
    });
}

function isCreatureEquipmentMotionExpected(animationName) {
  const normalized = String(animationName ?? "").trim().toLowerCase();
  return /(?:^|[^a-z0-9])(?:1h|2h|2w|nw|pl|bow|xbow|torch|throw)/iu.test(normalized) ||
    /(?:slash|stab|ready|reach|parry|attack|swing|shot|kick)/iu.test(normalized);
}

function sanitizeFileStem(value) {
  return String(value ?? "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "creature";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function parseBoolean(value) {
  return /^(1|true|yes|on)$/iu.test(String(value ?? "").trim());
}

function parseOptionalInteger(value) {
  if (value === undefined || value === null || String(value).trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}
