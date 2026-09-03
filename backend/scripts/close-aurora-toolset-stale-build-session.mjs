#!/usr/bin/env node
/* Canonical one-PID close route for the known stalled Build Module session. */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

process.on("uncaughtException", (error) => {
  print({ ok: false, command: "close-aurora-toolset-stale-build-session", blockerCode: error?.code ?? "stale_build_close_exception", message: error instanceof Error ? error.message : String(error), safety: { usesGlobalInput: false, forceStop: false } });
  process.exitCode = 2;
});

const here = resolve(fileURLToPath(new URL(".", import.meta.url)));
const options = parseArgs(process.argv.slice(2));
const expectedPid = positiveInteger(options.expectedPid, "--expectedPid");
const authorization = requiredText(options.closeAuthorization, "--closeAuthorization");
if (options.userAuthorizedClose !== "true") fail("TOOLSET_CLOSE_REQUIRES_EXPLICIT_USER_AUTHORIZATION", "Use --userAuthorizedClose true only after the owner explicitly requests this exact close.");
if (!new RegExp(`\\b(?:PID\\s*)?${expectedPid}\\b`, "iu").test(authorization) || !/close|zamkn/iu.test(authorization)) {
  fail("TOOLSET_CLOSE_AUTHORIZATION_NOT_BOUND_TO_PID", "The verbatim authorization must expressly close the exact expected PID.");
}

const windows = atom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
if (windows.processId !== expectedPid || windows.responding !== true) fail("STALE_BUILD_SESSION_IDENTITY_MISMATCH", JSON.stringify(windows));
const buildModals = (windows.windows ?? []).filter((window) => window.className === "TdlgVerifyModule" && String(window.text).trim() === "Build Module");
const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame");
const confirmations = (windows.windows ?? []).filter((window) => window.className === "#32770" && String(window.text).trim() === "Confirmation");
if (buildModals.length !== 1 || frames.length !== 1) {
  fail("STALE_BUILD_SESSION_MODAL_IDENTITY_MISMATCH", JSON.stringify({ buildModals, frames }));
}
if (confirmations.length !== 0) {
  fail("STALE_BUILD_CLOSE_CONFIRMATION_PENDING", "A prior targeted close opened confirmation dialog(s). Observe them with observe-aurora-toolset-stale-build-close-confirmations.mjs; do not post another close or choose a button automatically.");
}
const close = atom("close-aurora-toolset-window-no-global-input.mjs", ["--expectedPid", String(expectedPid)]);
print({
  ok: close.ok === true,
  command: "close-aurora-toolset-stale-build-session",
  status: close.ok === true ? "closed" : "close_pending",
  expectedPid,
  authorization,
  before: { processId: windows.processId, buildModal: buildModals[0], frame: frames[0] },
  close,
  safety: { usesGlobalInput: false, forceStop: false, postsOnlyTargetedWmClose: true, doesNotConfirmSaveOrBuildDialogs: true },
});
if (close.ok !== true) process.exitCode = 2;

function atom(name, args) {
  try {
    return JSON.parse(execFileSync(process.execPath, [resolve(here, name), ...args], { encoding: "utf8", windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024 }).trim());
  } catch (error) {
    const stdout = String(error?.stdout ?? "").trim();
    if (stdout) return JSON.parse(stdout);
    throw error;
  }
}
function parseArgs(argv) { const result = {}; for (let i = 0; i < argv.length; i += 2) { const key = argv[i], value = argv[i + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) fail("STALE_BUILD_CLOSE_ARGUMENT_INVALID", key ?? "end"); result[key.slice(2)] = value; } return result; }
function requiredText(value, name) { const text = String(value ?? "").trim(); if (!text) fail("STALE_BUILD_CLOSE_ARGUMENT_MISSING", name); return text; }
function positiveInteger(value, name) { const numeric = Number(value); if (!Number.isInteger(numeric) || numeric <= 0) fail("STALE_BUILD_CLOSE_ARGUMENT_INVALID", name); return numeric; }
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
