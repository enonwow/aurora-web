#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateExactNwmainCloseSnapshot } from "./lib/nwmain-close-or-terminate-contract.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(scriptDir, "close-nwmain-window-no-global-input.mjs");

assert.ok(existsSync(scriptPath), "public nwmain close atom is missing");
const source = readFileSync(scriptPath, "utf8");

for (const required of [
  "WM_CLOSE",
  "WM_SYSCOMMAND",
  "SC_CLOSE",
  "PostMessage",
  "expected_one_nwmain",
  "nwmain_pid_mismatch",
  "nwmain_start_mismatch",
  "expected_one_visible_owned_top_window",
  "nwmain_modal_detected",
  "nwmain_close_timeout_remaining_process",
  "Diagnostics.Stopwatch",
  "processCountAfter",
  "GW_OWNER",
  "stageTwoGraceMs",
  "sameExactWindowRequiredForStageTwo",
  "close-or-terminate",
  "forceFallbackUsed",
  "gracefulAttempt",
  "Stop-Process -Id $expectedPid -Force",
  "nwmain_force_termination_identity_invalid",
  "CLOSE_TIMEOUT_MS + FORCE_WAIT_MS + 10_000",
  "unresponsiveExactProcess",
]) {
  assert.ok(source.includes(required), `close contract missing: ${required}`);
}

for (const forbidden of [
  "CloseMainWindow",
  ".Kill(",
  "TerminateProcess",
  "SendInput",
  "SendKeys",
  "SetCursorPos",
  "mouse_event",
  "keybd_event",
  "SetWindowPos",
  "HWND_TOPMOST",
  "taskkill",
]) {
  assert.ok(!source.includes(forbidden), `close contract contains forbidden operation: ${forbidden}`);
}

const dryRun = spawnSync(process.execPath, [scriptPath, "dry-run"], {
  encoding: "utf8",
  windowsHide: true,
});
assert.equal(dryRun.status, 0, dryRun.stderr);
const packet = JSON.parse(dryRun.stdout);
assert.equal(packet.ok, true);
assert.equal(packet.command, "dry-run");
assert.deepEqual(packet.requiredArguments, ["--pid", "--startedAtUtc"]);
assert.equal(packet.transport, "targeted PostMessage(WM_CLOSE)");
assert.equal(packet.timeoutMs, 15_000);
assert.equal(packet.stageTwoGraceMs, 2_000);
assert.ok(packet.stageTwoGraceMs < packet.timeoutMs);
assert.deepEqual(packet.transportStages, [
  "PostMessage(WM_CLOSE)",
  "PostMessage(WM_SYSCOMMAND/SC_CLOSE) once after grace when the exact PID/start/window is unchanged",
]);
assert.equal(packet.maxPostCount, 2);
assert.equal(packet.sameExactWindowRequiredForStageTwo, true);
assert.equal(packet.exactNwmainProcessCount, 1);
assert.equal(packet.exactVisibleOwnedTopWindowCount, 1);
assert.equal(packet.usesGlobalInput, false);
assert.equal(packet.changesZOrder, false);
assert.equal(packet.forceTerminates, false);
assert.deepEqual(packet.publicCommands, ["close", "close-or-terminate"]);
assert.equal(packet.closeOrTerminate.forceFallbackAvailable, true);
assert.equal(packet.closeOrTerminate.requiresRespondingProcess, false);
assert.equal(packet.closeOrTerminate.forceTerminatesOnFallback, true);
assert.equal(packet.closeOrTerminate.forceFallbackUsesExactPidOnly, true);
assert.equal(packet.closeOrTerminate.forceFallbackRequiresExactStartTime, true);
assert.equal(packet.startsNwn, false);

const invalidPid = spawnSync(process.execPath, [
  scriptPath,
  "close",
  "--pid",
  "0",
  "--startedAtUtc",
  "2026-07-22T00:00:00.0000000Z",
], { encoding: "utf8", windowsHide: true });
assert.notEqual(invalidPid.status, 0, "invalid PID must fail before process inspection");
assert.match(`${invalidPid.stderr}\n${invalidPid.stdout}`, /--pid must be a positive integer/u);

const invalidStart = spawnSync(process.execPath, [
  scriptPath,
  "close",
  "--pid",
  "1",
  "--startedAtUtc",
  "not-a-date",
], { encoding: "utf8", windowsHide: true });
assert.notEqual(invalidStart.status, 0, "invalid StartTime must fail before process inspection");
assert.match(`${invalidStart.stderr}\n${invalidStart.stdout}`, /--startedAtUtc must be an ISO-8601 timestamp with an explicit offset/u);

const exact = { pid: 42, startedAtUtc: "2026-07-22T00:00:00.000Z" };
assert.deepEqual(
  evaluateExactNwmainCloseSnapshot({
    phase: "initial",
    processes: [exact],
    expectedPid: exact.pid,
    expectedStartedAtUtc: exact.startedAtUtc,
  }),
  { action: "attempt-graceful-close", forceFallbackUsed: false },
);
assert.deepEqual(
  evaluateExactNwmainCloseSnapshot({
    phase: "initial",
    processes: [{ ...exact, responding: false }],
    expectedPid: exact.pid,
    expectedStartedAtUtc: exact.startedAtUtc,
    allowForceFallback: true,
  }),
  { action: "force-terminate-exact-pid", forceFallbackUsed: true },
);
assert.throws(
  () => evaluateExactNwmainCloseSnapshot({
    phase: "initial",
    processes: [{ ...exact, responding: false }],
    expectedPid: exact.pid,
    expectedStartedAtUtc: exact.startedAtUtc,
    allowForceFallback: false,
  }),
  /nwmain_not_responding/,
);
assert.deepEqual(
  evaluateExactNwmainCloseSnapshot({
    phase: "after-grace",
    processes: [],
    expectedPid: exact.pid,
    expectedStartedAtUtc: exact.startedAtUtc,
  }),
  { action: "complete", forceFallbackUsed: false },
);
assert.deepEqual(
  evaluateExactNwmainCloseSnapshot({
    phase: "after-grace",
    processes: [exact],
    expectedPid: exact.pid,
    expectedStartedAtUtc: exact.startedAtUtc,
  }),
  { action: "force-terminate-exact-pid", forceFallbackUsed: true },
);
assert.deepEqual(
  evaluateExactNwmainCloseSnapshot({
    phase: "after-force",
    processes: [],
    expectedPid: exact.pid,
    expectedStartedAtUtc: exact.startedAtUtc,
  }),
  { action: "complete", forceFallbackUsed: true },
);
assert.throws(
  () => evaluateExactNwmainCloseSnapshot({
    phase: "initial",
    processes: [{ ...exact, pid: 43 }],
    expectedPid: exact.pid,
    expectedStartedAtUtc: exact.startedAtUtc,
  }),
  /nwmain_pid_mismatch/,
);
assert.throws(
  () => evaluateExactNwmainCloseSnapshot({
    phase: "after-grace",
    processes: [{ ...exact, startedAtUtc: "2026-07-22T00:00:01.000Z" }],
    expectedPid: exact.pid,
    expectedStartedAtUtc: exact.startedAtUtc,
  }),
  /nwmain_start_mismatch/,
);
assert.throws(
  () => evaluateExactNwmainCloseSnapshot({
    phase: "after-grace",
    processes: [exact, { ...exact, pid: 43 }],
    expectedPid: exact.pid,
    expectedStartedAtUtc: exact.startedAtUtc,
  }),
  /expected_one_nwmain:2/,
);

console.log(JSON.stringify({ ok: true, status: "close_nwmain_window_no_global_input_contract_valid" }));
