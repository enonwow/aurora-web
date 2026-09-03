#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const options = args(process.argv.slice(2));
const modulePath = resolve(required(options.modulePath, "--modulePath"));
const expectedSha256 = required(options.expectedSha256, "--expectedSha256").toUpperCase();
const outDir = resolve(required(options.outDir, "--outDir"));
const area = String(options.area ?? "demo");
const moduleName = String(options.moduleName ?? "codex_npc_item_live_20260713.mod");
const finalize = String(options.finalize ?? "false").toLowerCase() === "true";
const statePath = resolve(outDir, "session-state.json");
mkdirSync(outDir, { recursive: true });

function sha256(path) { return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase(); }
function writeJson(name, value) { writeFileSync(resolve(outDir, name), `${JSON.stringify(value, null, 2)}\n`); }
function run(script, commandArgs = [], timeout = 120_000) {
  const stdout = execFileSync(process.execPath, [resolve(repoRoot, script), ...commandArgs], {
    cwd: repoRoot, encoding: "utf8", windowsHide: true, timeout, maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout.trim());
}
function session(command) {
  return run("backend/scripts/aurora-toolset-session.mjs", [command,
    "--profile", "npc-item-live", "--expectedSha256", expectedSha256,
    "--outDir", outDir, "--statePath", statePath,
  ], 360_000);
}
function attempt(name, fn) {
  try { const value = fn(); writeJson(`${name}.json`, value); return { ok: true, value }; }
  catch (error) { const value = { ok: false, error: error instanceof Error ? error.message : String(error) }; writeJson(`${name}.json`, value); return { ok: false, value }; }
}

const startedAt = new Date().toISOString();
const result = { version: "aurora-copy-duplicate-discovery/v2", startedAt, modulePath, expectedSha256, functionAccepted: false, globalInputUsed: false, actions: {}, failures: [] };
copyFileSync(modulePath, resolve(outDir, "baseline-module.mod"));
result.moduleSha256Before = sha256(modulePath);
if (result.moduleSha256Before !== expectedSha256) throw new Error(`expected module hash ${expectedSha256}, received ${result.moduleSha256Before}`);

const baseline = attempt("baseline-source-pack", () => run("backend/scripts/build-area-source-proof-pack.mjs", ["--area", area, "--modulePath", modulePath, "--outDir", outDir, "--name", "baseline"], 180_000));
result.actions.baseline = baseline.value;
let sessionBegan = false;
try {
  for (const command of ["preflight", "open", "run-queue"]) {
    const step = attempt(`session-${command}`, () => session(command));
    result.actions[command] = step.value;
    const areaReadyDespiteCaptureBlocker = command === "run-queue" && step.value?.state?.phase === "area_ready";
    if (!step.ok || (step.value?.ok !== true && !areaReadyDespiteCaptureBlocker)) throw new Error(`session_${command}_failed`);
    sessionBegan = true;
  }
  result.actions.afterOpenCapture = attempt("01-area-open", () => run("backend/scripts/capture-aurora-toolset-frame-no-global-input.mjs", ["--module", moduleName, "--out", resolve(outDir, "01-area-open.png")], 60_000)).value;
  result.actions.targetSelectionBeforeCopy = attempt("02-target-selection-before-copy", () => run("backend/scripts/inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", moduleName, "--objectText", "Dwarf Mercenary", "--selectOnly", "true"], 60_000)).value;
  result.actions.nativeMainCopy = attempt("03-native-main-copy", () => run("backend/scripts/invoke-aurora-toolset-main-menu-command-no-global-input.mjs", ["--module", moduleName, "--topPosition", "1", "--itemPosition", "3", "--expectedId", "59", "--action", "copy"], 60_000)).value;
  result.actions.afterCopyCapture = attempt("04-after-native-main-copy", () => run("backend/scripts/capture-aurora-toolset-frame-no-global-input.mjs", ["--module", moduleName, "--out", resolve(outDir, "04-after-native-main-copy.png")], 60_000)).value;
  result.actions.mainMenuAfterNativeCopy = attempt("05-main-menu-after-native-copy", () => run("backend/scripts/probe-aurora-toolset-main-menu-no-global-input.mjs", ["--module", moduleName], 60_000)).value;
  result.actions.viewportContextAfterCopy = attempt("06-viewport-context-after-copy", () => run("backend/scripts/inspect-aurora-toolset-object-context-menu-no-global-input.mjs", ["--module", moduleName, "--area", area, "--x", "200", "--y", "200"], 60_000)).value;
} catch (error) {
  result.failures.push(error instanceof Error ? error.message : String(error));
} finally {
  if (finalize && result.failures.length === 0 && sessionBegan) {
    result.actions.close = attempt("08-session-close", () => session("close")).value;
  } else if (sessionBegan || existsSync(statePath)) {
    result.actions.sessionStatus = attempt("08-session-status-no-close", () => session("status")).value;
  }
}

result.moduleSha256After = sha256(modulePath);
result.moduleHashUnchanged = result.moduleSha256Before === result.moduleSha256After;
if (finalize && result.actions.close?.ok === true) {
  result.actions.after = attempt("after-source-pack", () => run("backend/scripts/build-area-source-proof-pack.mjs", ["--area", area, "--modulePath", modulePath, "--outDir", outDir, "--name", "after"], 180_000)).value;
  const baselineObjects = resolve(outDir, "baseline", "objects.csv");
  const afterObjects = resolve(outDir, "after", "objects.csv");
  result.exactGitRollback = existsSync(baselineObjects) && existsSync(afterObjects) && readFileSync(baselineObjects, "utf8") === readFileSync(afterObjects, "utf8");
} else result.exactGitRollback = null;
result.finishedAt = new Date().toISOString();
writeJson("summary.json", result);
console.log(JSON.stringify(result, null, 2));

function args(argv) { const value = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], item = argv[index + 1]; if (!key?.startsWith("--") || item === undefined) throw new Error(`invalid argument near ${key ?? "end"}`); value[key.slice(2)] = item; } return value; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required`); return text; }
