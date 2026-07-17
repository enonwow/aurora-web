#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

class QueueBlocker extends Error {
  constructor(code, details) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const areaOpenScript = resolve(scriptDir, "open-last-city-area-toolset-no-global-input.mjs");
const wheelZoomScript = resolve(scriptDir, "apply-toolset-area-wheel-zoom.mjs");
const captureScript = resolve(scriptDir, "capture-areas-toolset-window-readonly.mjs");

const options = parseArgs(process.argv.slice(2));
const queuePath = resolveRequired(options.queue, "--queue");
const expectedModule = options.expectedModule ?? "the_last_city - codex.mod";
const expectedModuleParts = options.expectedModuleParts ?? "the_last_city|codex.mod";
const settleMs = nonNegativeInteger(options.settleMs ?? "0", "--settleMs");
const wheelSteps = integer(options.wheelSteps ?? "0", "--wheelSteps");
const offset = nonNegativeInteger(options.offset ?? "0", "--offset");
const limit = optionalPositiveInteger(options.limit, "--limit");
const dryRun = options.dryRun === "true" || options.dryRun === "1" || options.dryRun === true;
const captureAreas = !(
  options.capture === "false" || options.capture === "0" || options.capture === false
);
const stamp = new Date().toISOString().replace(/[-:]/gu, "").replace(/\..+$/u, "Z");
const outDir = resolve(options.outDir ?? `.codex-tmp/toolset-area-oracle-queue/${stamp}`);
const manifestPath = resolve(outDir, "manifest.json");
const captureDir = resolve(outDir, "captures");

const areas = readQueue(queuePath);
const selectedAreas = limit ? areas.slice(offset, offset + limit) : areas.slice(offset);
if (selectedAreas.length === 0) throw new Error(`No areas remain at --offset ${offset}.`);
const manifest = {
  version: "toolset-area-oracle-queue/v1",
  generatedAt: new Date().toISOString(),
  status: dryRun ? "planned" : "running",
  safety: {
    launchesToolset: false,
    opensModule: false,
    usesGlobalCursor: false,
    usesGlobalKeyboard: false,
    usesGlobalMouseWheel: false,
    method: "existing validated Toolset session; targeted TreeView, optional targeted viewport wheel, and PrintWindow-only capture",
    captureAreas,
  },
  expectedModule,
  expectedModuleParts,
  queuePath,
  offset,
  settleMs,
  wheelSteps,
  items: selectedAreas.map((area, index) => ({ index: offset + index, area, status: "pending" })),
};
mkdirSync(outDir, { recursive: true });
writeManifest();

if (dryRun) {
  manifest.status = "planned";
  manifest.completedAt = new Date().toISOString();
  writeManifest();
  console.log(JSON.stringify(summary(), null, 2));
  process.exit(0);
}

for (const item of manifest.items) {
  item.startedAt = new Date().toISOString();
  try {
    item.areaOpen = runJson(areaOpenScript, [], {
      AURORA_TOOLSET_EXPECTED_AREA_NAME: item.area.name,
      AURORA_TOOLSET_EXPECTED_AREA: item.area.resref,
      AURORA_TOOLSET_EXPECTED_MODULE_PARTS: expectedModuleParts,
      AURORA_TOOLSET_ALLOW_REPEAT_AREA_OPEN: "1",
    }, 90_000);
    if (item.areaOpen.ok !== true) {
      throw new QueueBlocker(item.areaOpen.blockerCode ?? "area_open_failed", item.areaOpen);
    }

    if (settleMs > 0) sleep(settleMs);
    if (wheelSteps !== 0) {
      item.camera = runJson(wheelZoomScript, ["--expectedModuleParts", expectedModuleParts, "--expectedArea", item.area.resref, "--wheelSteps", String(wheelSteps)]);
      if (item.camera.ok !== true) {
        throw new QueueBlocker("camera_framing_failed", item.camera);
      }
    }

    if (captureAreas) {
      item.capture = runJson(captureScript, [
        "--expectedModule", expectedModule,
        "--expectedModuleParts", expectedModuleParts,
        "--expectedArea", item.area.resref,
        "--outPath", resolve(captureDir, `${String(item.index + 1).padStart(3, "0")}-${sanitizeFilePart(item.area.resref)}.png`),
        "--forcePrintWindow",
      ]);
      if (item.capture.status !== "captured" || item.capture.canRunVisualComparison !== true) {
        throw new QueueBlocker(item.capture.blockerCode ?? "readonly_capture_not_comparable", item.capture);
      }
      item.status = "captured";
    } else {
      item.status = "opened";
    }
  } catch (error) {
    item.status = "blocked";
    item.blockerCode = error instanceof QueueBlocker ? error.code : "toolset_area_queue_exception";
    item.error = error instanceof QueueBlocker ? error.details : { message: error instanceof Error ? error.message : String(error) };
    item.completedAt = new Date().toISOString();
    manifest.status = "blocked";
    writeManifest();
    console.log(JSON.stringify(summary(), null, 2));
    process.exitCode = 2;
    break;
  }
  item.completedAt = new Date().toISOString();
  writeManifest();
}

if (manifest.status !== "blocked") {
  manifest.status = "completed";
  manifest.completedAt = new Date().toISOString();
  writeManifest();
}
console.log(JSON.stringify(summary(), null, 2));

function readQueue(path) {
  if (!existsSync(path)) throw new Error(`Queue does not exist: ${path}`);
  const payload = JSON.parse(readFileSync(path, "utf8"));
  const candidates = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : [];
  const normalized = candidates.map((candidate) => {
    const area = candidate.area ?? candidate;
    const name = String(area.name ?? area.resref ?? area.areaId ?? "").trim();
    const resref = resolveAreaResref(area, candidate);
    if (!name || !resref) throw new Error(`Queue item is missing name/resref: ${JSON.stringify(candidate)}`);
    return {
      areaId: area.areaId ?? candidate.areaId ?? null,
      name,
      resref,
      width: area.width ?? null,
      height: area.height ?? null,
    };
  });
  if (normalized.length === 0) throw new Error("Queue contains no areas.");
  return normalized;
}

function resolveAreaResref(area, candidate) {
  const direct = String(area.resref ?? candidate.resref ?? "").trim();
  if (direct) return direct;
  const areaId = String(area.areaId ?? candidate.areaId ?? "").trim();
  if (areaId.startsWith("area_")) return areaId.slice(5);
  return "";
}

function sanitizeFilePart(value) {
  return String(value).replace(/[^a-z0-9_.-]+/giu, "_").replace(/^_+|_+$/gu, "") || "area";
}

function runJson(script, args, env = {}, timeout = 30_000) {
  try {
    const output = execFileSync(process.execPath, [script, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 8,
      timeout,
    }).trim();
    return JSON.parse(output);
  } catch (error) {
    const output = String(error?.stdout ?? "").trim();
    if (output) return JSON.parse(output);
    throw error;
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function writeManifest() {
  manifest.updatedAt = new Date().toISOString();
  manifest.summary = summary();
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function summary() {
  const counts = manifest.items.reduce(
    (accumulator, item) => {
      accumulator[item.status] = (accumulator[item.status] ?? 0) + 1;
      return accumulator;
    },
    {},
  );
  return {
    status: manifest.status,
    queueCount: manifest.items.length,
    counts,
    manifestPath,
    firstBlocker: manifest.items.find((item) => item.status === "blocked")?.blockerCode ?? null,
  };
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = value;
      index += 1;
    }
  }
  return parsed;
}

function resolveRequired(value, name) {
  if (!value || value === true) throw new Error(`Missing ${name}.`);
  return resolve(value);
}

function integer(value, name) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer.`);
  return parsed;
}

function positiveInteger(value, name) {
  const parsed = integer(value, name);
  if (parsed <= 0) throw new Error(`${name} must be positive.`);
  return parsed;
}

function nonNegativeInteger(value, name) {
  const parsed = integer(value, name);
  if (parsed < 0) throw new Error(`${name} cannot be negative.`);
  return parsed;
}

function optionalPositiveInteger(value, name) {
  if (value === undefined) return null;
  return positiveInteger(value, name);
}
