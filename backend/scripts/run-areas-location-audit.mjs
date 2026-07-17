#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL = "http://127.0.0.1:5173";
const DEFAULT_USERNAME = "builder.user";
const DEFAULT_PASSWORD = "builder123";
const DEFAULT_RUNTIME_WAIT_MS = 60_000;
const DEFAULT_VIEWS = ["top-down"];
const HELP_TEXT = `
Usage:
  node scripts/run-areas-location-audit.mjs [--limit <n>] [--offset <n>] [--query <text>] [--areas <comma-list>] [--views top-down] [--outDir <dir>] [--runtimeWaitMs <ms>] [--dryRun]

Runs the Aurora Web Areas runtime capture for a queue of module locations and
writes an incremental audit manifest. The Toolset/Aurora oracle lane should use
separate retail screenshots and link them back to the same areaId/resref.
`.trim();

const options = parseArgs(process.argv.slice(2));
if (options.help === "true") {
  console.log(HELP_TEXT);
  process.exit(0);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(backendRoot, "..");
const captureScript = path.join(scriptDir, "capture-areas-runtime-cdp.mjs");
const runStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
const outDir = path.resolve(
  repoRoot,
  options.outDir ?? `.codex-tmp/aurora-location-audit/${runStamp}`
);
const manifestPath = path.join(outDir, "manifest.json");
const summaryPath = path.join(outDir, "summary.json");
const baseUrl = options.baseUrl ?? process.env.AREAS_BASE_URL ?? DEFAULT_BASE_URL;
const authBaseUrl = (options.authBaseUrl ?? `${baseUrl}/_aurora/v1`).replace(/\/+$/u, "");
const username = options.username ?? process.env.AURORA_TEST_USERNAME ?? DEFAULT_USERNAME;
const password = options.password ?? process.env.AURORA_TEST_PASSWORD ?? DEFAULT_PASSWORD;
const runtimeWaitMs = Number(
  options.runtimeWaitMs ?? options.runtimeSnapshotWaitMs ?? DEFAULT_RUNTIME_WAIT_MS
);
const limit = parseOptionalInteger(options.limit);
const offset = Number(options.offset ?? 0);
const views = parseListOption(options.views ?? options.view).length
  ? parseListOption(options.views ?? options.view)
  : DEFAULT_VIEWS;
const selectedAreas = parseListOption(options.areas ?? options.area);
const requireScreenshot = parseBooleanOption(options.requireScreenshot ?? "true");
const dryRun = parseBooleanOption(options.dryRun ?? "false");
const resume = parseBooleanOption(options.resume ?? "true");
const continueOnFailure = parseBooleanOption(options.continueOnFailure ?? "true");

fs.mkdirSync(outDir, { recursive: true });

const accessToken = dryRun ? null : await login({ authBaseUrl, username, password });
const areaList = await fetchAreas({
  authBaseUrl,
  accessToken,
  query: options.query,
  dryRun,
  username,
  password
});
const auditAreas = selectAreas(areaList.items, {
  selectedAreas,
  offset,
  limit
});

const manifest = buildInitialManifest({
  areaList,
  auditAreas,
  authBaseUrl,
  baseUrl,
  continueOnFailure,
  dryRun,
  limit,
  offset,
  outDir,
  query: options.query ?? null,
  requireScreenshot,
  resume,
  runtimeWaitMs,
  selectedAreas,
  views
});
writeJson(manifestPath, manifest);

if (dryRun) {
  manifest.status = "planned";
  manifest.completedAt = new Date().toISOString();
  manifest.summary = summarizeManifest(manifest);
  writeJson(manifestPath, manifest);
  writeJson(summaryPath, manifest.summary);
  console.log(JSON.stringify(manifest.summary, null, 2));
  process.exit(0);
}

for (const area of auditAreas) {
  const manifestItem = manifest.items.find((item) => item.areaId === area.areaId);
  if (!manifestItem) {
    continue;
  }

  for (const view of views) {
    const captureName = buildCaptureStem(area, view);
    const framePath = path.join(outDir, `${captureName}.frame.json`);
    const pngPath = path.join(outDir, `${captureName}.png`);
    if (resume && fs.existsSync(framePath) && fs.existsSync(pngPath)) {
      const frame = readJson(framePath);
      manifestItem.captures[view] = summarizeCaptureFrame(frame, {
        captureName,
        framePath,
        pngPath,
        status: "resumed"
      });
      manifest.updatedAt = new Date().toISOString();
      manifest.summary = summarizeManifest(manifest);
      writeJson(manifestPath, manifest);
      writeJson(summaryPath, manifest.summary);
      continue;
    }

    const startedAt = new Date().toISOString();
    const result = runRuntimeCapture({
      areaId: area.areaId,
      baseUrl,
      captureName,
      outDir,
      requireScreenshot,
      runtimeWaitMs,
      view,
      visibility: options.visibility,
      ceilingMeshes: options.ceilingMeshes
    });
    const completedAt = new Date().toISOString();

    if (result.status === "captured") {
      const frame = readJson(framePath);
      manifestItem.captures[view] = summarizeCaptureFrame(frame, {
        captureName,
        framePath,
        pngPath,
        startedAt,
        completedAt,
        status: "captured"
      });
    } else {
      manifestItem.captures[view] = {
        captureName,
        status: "blocked",
        startedAt,
        completedAt,
        command: result.command,
        exitCode: result.exitCode,
        stdoutTail: result.stdoutTail,
        stderrTail: result.stderrTail,
        failureFramePath: toRepoRelativePath(result.failureFramePath ?? null),
        blocker: result.blocker ?? {
          code: "runtime_capture_process_failed",
          summary: `Runtime capture exited with code ${result.exitCode}.`
        }
      };
      if (!continueOnFailure) {
        manifest.status = "blocked";
        manifest.updatedAt = new Date().toISOString();
        manifest.summary = summarizeManifest(manifest);
        writeJson(manifestPath, manifest);
        writeJson(summaryPath, manifest.summary);
        console.log(JSON.stringify(manifest.summary, null, 2));
        process.exit(result.exitCode || 1);
      }
    }

    manifest.updatedAt = new Date().toISOString();
    manifest.summary = summarizeManifest(manifest);
    writeJson(manifestPath, manifest);
    writeJson(summaryPath, manifest.summary);
  }
}

manifest.status = manifest.summary.blockedCaptures > 0 ? "completed_with_blockers" : "completed";
manifest.completedAt = new Date().toISOString();
manifest.summary = summarizeManifest(manifest);
writeJson(manifestPath, manifest);
writeJson(summaryPath, manifest.summary);
console.log(JSON.stringify(manifest.summary, null, 2));

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split(/=(.*)/su, 2);
    const key = rawKey.trim();
    const next = args[index + 1];
    const value =
      inlineValue !== undefined
        ? inlineValue
        : next && !next.startsWith("--")
          ? args[++index]
          : "true";
    if (parsed[key] === undefined) {
      parsed[key] = value;
    } else if (Array.isArray(parsed[key])) {
      parsed[key].push(value);
    } else {
      parsed[key] = [parsed[key], value];
    }
  }
  return parsed;
}

async function login({ authBaseUrl, username, password }) {
  const body = JSON.stringify({ username, password });
  const response = await requestJson(`${authBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(body))
    },
    body
  });
  if (!response.ok) {
    throw new Error(`Aurora API login failed with status ${response.status}.`);
  }
  const token = response.payload?.data?.session?.accessToken ?? response.payload?.data?.accessToken;
  if (!token) {
    throw new Error("Aurora API login succeeded but did not return an access token.");
  }
  return token;
}

async function fetchAreas({ authBaseUrl, accessToken, query, dryRun, username, password }) {
  const token = accessToken ?? (await login({ authBaseUrl, username, password }));
  const endpoint = new URL(`${authBaseUrl}/areas`);
  if (query) {
    endpoint.searchParams.set("query", query);
  }
  endpoint.searchParams.set("limit", "1000");
  endpoint.searchParams.set("offset", "0");
  const response = await requestJson(endpoint, {
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error(`Area list request failed with status ${response.status}.`);
  }
  const items = response.payload?.data?.items ?? [];
  const total = response.payload?.data?.total ?? items.length;
  return {
    endpoint: endpoint.toString(),
    total,
    fetched: items.length,
    dryRun,
    items
  };
}

function requestJson(url, { method = "GET", headers = {}, body, timeoutMs = 30_000 } = {}) {
  return new Promise((resolve, reject) => {
    const endpoint = url instanceof URL ? url : new URL(url);
    const transport = endpoint.protocol === "https:" ? https : http;
    const request = transport.request(
      endpoint,
      {
        method,
        headers: {
          ...headers,
          accept: "application/json",
          connection: "close"
        }
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let payload = null;
          try {
            payload = text ? JSON.parse(text) : null;
          } catch (error) {
            reject(new Error(`Expected JSON from ${endpoint.toString()}: ${error.message}`));
            return;
          }
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            headers: response.headers,
            payload
          });
        });
      }
    );
    request.on("error", reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Request timed out after ${timeoutMs}ms: ${endpoint.toString()}`));
    });
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

function selectAreas(items, { selectedAreas, offset, limit }) {
  const bySelection =
    selectedAreas.length === 0
      ? items
      : items.filter((item) =>
          selectedAreas.some((selection) => areaMatchesSelection(item, selection))
        );
  const start = Math.max(0, offset);
  const end = typeof limit === "number" ? start + Math.max(0, limit) : undefined;
  return bySelection.slice(start, end);
}

function areaMatchesSelection(area, selection) {
  const identity = normalizeIdentity(selection);
  const fields = [
    area.areaId,
    area.name,
    area.name?.replace(/\s+/gu, "_"),
    area.areaId?.replace(/^area_?/u, "")
  ];
  return fields.some((field) => normalizeIdentity(field) === identity);
}

function buildInitialManifest(context) {
  return {
    version: "aurora-location-audit/v1",
    status: context.dryRun ? "planning" : "running",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: "aurora-web-runtime-capture",
    doctrine: {
      auroraFirst: true,
      canonicalParityPromoted: false,
      note:
        "Web captures are local implementation evidence until paired with current Aurora/Toolset oracle screenshots."
    },
    runtime: {
      baseUrl: context.baseUrl,
      authBaseUrl: context.authBaseUrl,
      views: context.views,
      runtimeWaitMs: context.runtimeWaitMs,
      requireScreenshot: context.requireScreenshot
    },
    selection: {
      query: context.query,
      selectedAreas: context.selectedAreas,
      offset: context.offset,
      limit: context.limit,
      sourceTotal: context.areaList.total,
      sourceFetched: context.areaList.fetched,
      selectedCount: context.auditAreas.length
    },
    behavior: {
      resume: context.resume,
      continueOnFailure: context.continueOnFailure,
      dryRun: context.dryRun
    },
    paths: {
      outDir: toRepoRelativePath(context.outDir),
      manifestPath: toRepoRelativePath(manifestPath),
      summaryPath: toRepoRelativePath(summaryPath)
    },
    areaSource: {
      endpoint: context.areaList.endpoint,
      total: context.areaList.total,
      fetched: context.areaList.fetched
    },
    items: context.auditAreas.map((area) => ({
      areaId: area.areaId,
      name: area.name,
      width: area.width,
      height: area.height,
      tags: area.tags ?? [],
      textureAtlasId: area.textureAtlasId ?? null,
      objectCounts: area.objectCounts ?? null,
      captures: {}
    })),
    summary: null
  };
}

function runRuntimeCapture({
  areaId,
  baseUrl,
  captureName,
  outDir,
  requireScreenshot,
  runtimeWaitMs,
  view,
  visibility,
  ceilingMeshes
}) {
  const args = [
    captureScript,
    "--area",
    areaId,
    "--view",
    view,
    "--runtimeWaitMs",
    String(runtimeWaitMs),
    "--outDir",
    outDir,
    "--name",
    captureName,
    "--baseUrl",
    baseUrl
  ];
  if (requireScreenshot) {
    args.push("--requireScreenshot");
  }
  if (visibility) {
    args.push("--visibility", visibility);
  }
  if (ceilingMeshes !== undefined) {
    args.push("--ceilingMeshes", String(ceilingMeshes));
  }

  const result = spawnSync(process.execPath, args, {
    cwd: backendRoot,
    encoding: "utf8",
    maxBuffer: 12 * 1024 * 1024
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const parsed = parseLastJsonObject(stdout);
  if (result.status === 0 && parsed?.status === "captured") {
    return {
      status: "captured",
      command: formatCommand(process.execPath, args),
      parsed
    };
  }
  return {
    status: "blocked",
    command: formatCommand(process.execPath, args),
    exitCode: result.status ?? 1,
    stdoutTail: tail(stdout),
    stderrTail: tail(stderr),
    failureFramePath: parsed?.failureFramePath ?? null,
    blocker: parsed?.blocker ?? null
  };
}

function summarizeCaptureFrame(frame, context) {
  const runtimeSummary = frame.runtimeActionabilitySummary ?? {};
  const sharedRenderer = runtimeSummary.sharedRenderer ?? {};
  return {
    captureName: context.captureName,
    status: context.status,
    startedAt: context.startedAt ?? null,
    completedAt: context.completedAt ?? null,
    capturedAt: frame.capturedAt ?? null,
    screenshotPath: toRepoRelativePath(frame.screenshotPath ?? context.pngPath),
    screenshotBytes: frame.screenshotBytes ?? null,
    framePath: toRepoRelativePath(frame.framePath ?? context.framePath),
    openedAreaMatchesExpected: frame.target?.openedAreaMatchesExpected ?? null,
    canonicalParityPromoted: frame.canonicalParityPromoted ?? false,
    localOnlyNotRetailEvidence: frame.localOnlyNotRetailEvidence ?? true,
    timings: frame.timings ?? null,
    strictVisualMode: frame.strictVisualMode ?? null,
    firstBlocker:
      runtimeSummary.firstErrorReason ??
      frame.blocker?.code ??
      frame.runtimeBlockerSnapshot?.firstBlocker?.code ??
      null,
    renderer: {
      status: sharedRenderer.status ?? null,
      total: sharedRenderer.total ?? null,
      payloadBoundCount: sharedRenderer.payloadBoundCount ?? null,
      renderedModelUrlCount: sharedRenderer.renderedModelUrlCount ?? null,
      primitiveFallbackCount: sharedRenderer.primitiveFallbackCount ?? null
    },
    textureStatusCounts:
      frame.areaObjectSupportSurfaceSummary?.areaLoadEvidence?.textureStatusCounts ?? null,
    objectSupportIssueCount: frame.areaObjectSupportSurfaceSummary?.issueCount ?? null
  };
}

function summarizeManifest(manifest) {
  let capturedCaptures = 0;
  let blockedCaptures = 0;
  let resumedCaptures = 0;
  const blockerCounts = {};
  const slowest = [];
  for (const item of manifest.items) {
    for (const capture of Object.values(item.captures)) {
      if (capture.status === "captured") {
        capturedCaptures += 1;
      } else if (capture.status === "resumed") {
        resumedCaptures += 1;
      } else if (capture.status === "blocked") {
        blockedCaptures += 1;
        const code = capture.blocker?.code ?? "unknown";
        blockerCounts[code] = (blockerCounts[code] ?? 0) + 1;
      }
      const elapsed = capture.timings?.captureWaitElapsedMs;
      if (typeof elapsed === "number") {
        slowest.push({
          areaId: item.areaId,
          name: item.name,
          captureName: capture.captureName,
          captureWaitElapsedMs: elapsed,
          totalElapsedMs: capture.timings?.totalElapsedMs ?? null
        });
      }
    }
  }
  slowest.sort((left, right) => right.captureWaitElapsedMs - left.captureWaitElapsedMs);
  return {
    version: "aurora-location-audit-summary/v1",
    status: manifest.status,
    selectedAreas: manifest.items.length,
    requestedCaptures: manifest.items.length * manifest.runtime.views.length,
    capturedCaptures,
    resumedCaptures,
    blockedCaptures,
    blockerCounts,
    slowestCaptures: slowest.slice(0, 12),
    manifestPath: manifest.paths.manifestPath,
    summaryPath: manifest.paths.summaryPath
  };
}

function buildCaptureStem(area, view) {
  const resref = area.areaId.replace(/^area_?/u, "");
  return sanitizeFileStem(`web-${resref}-${view}`);
}

function parseLastJsonObject(output) {
  const trimmed = output.trim();
  if (!trimmed) {
    return null;
  }
  const start = trimmed.lastIndexOf("\n{");
  const jsonText = start >= 0 ? trimmed.slice(start + 1) : trimmed;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseListOption(value) {
  if (value === undefined || value === null) {
    return [];
  }
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((entry) => String(entry).split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBooleanOption(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

function parseOptionalInteger(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.trunc(parsed);
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^area_+/u, "")
    .replace(/[^a-z0-9]+/gu, "");
}

function sanitizeFileStem(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 120);
}

function toRepoRelativePath(filePath) {
  if (!filePath) {
    return null;
  }
  return path.relative(repoRoot, path.resolve(filePath)).replaceAll("\\", "/");
}

function tail(value, max = 4000) {
  return String(value ?? "").slice(-max);
}

function formatCommand(command, args) {
  return [command, ...args].map((part) => (/\s/u.test(part) ? JSON.stringify(part) : part)).join(" ");
}
