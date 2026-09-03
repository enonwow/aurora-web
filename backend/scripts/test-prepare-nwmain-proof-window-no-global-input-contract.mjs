#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const scriptPath = resolve("backend/scripts/prepare-nwmain-proof-window-no-global-input.mjs");
assert.ok(existsSync(scriptPath), "NWN proof-window preparation atom is missing");

const source = readFileSync(scriptPath, "utf8");
for (const required of [
  "--pid",
  "--startedAtUtc",
  "expected_one_nwmain",
  "expected_one_nonprimary_screen",
  "GetWindowThreadProcessId",
  "SetWindowPos",
  "WorkingArea",
  "SWP_NOZORDER",
  "SWP_NOACTIVATE",
  "nwmain_window_owner_mismatch",
  "nwmain_window_not_inside_proof_screen",
]) {
  assert.ok(source.includes(required), `prepare contract missing: ${required}`);
}
for (const forbidden of [
  "HWND_TOPMOST",
  "SetForegroundWindow",
  "SendInput",
  "SetCursorPos",
  "mouse_event",
  "keybd_event",
  "Stop-Process",
  "taskkill",
  "PostMessage",
  "SendMessage",
]) {
  assert.ok(!source.includes(forbidden), `prepare contract contains forbidden route: ${forbidden}`);
}

const dryRun = spawnSync(process.execPath, [
  scriptPath,
  "dry-run",
  "--pid",
  "1234",
  "--startedAtUtc",
  "2026-07-22T10:00:00.000Z",
], { encoding: "utf8" });
assert.equal(dryRun.status, 0, dryRun.stderr);
const result = JSON.parse(dryRun.stdout);
assert.deepEqual(result.expectedProcess, {
  name: "nwmain",
  pid: 1234,
  startedAtUtc: "2026-07-22T10:00:00.000Z",
});
assert.equal(result.command, "dry-run");
assert.equal(result.status, "nwmain_proof_window_prepare_plan_valid");
assert.equal(result.startsNwn, false);
assert.equal(result.usesGlobalInput, false);
assert.equal(result.changesZOrder, false);
assert.equal(result.activatesWindow, false);
assert.equal(result.target, "exactly one non-primary screen working area");
assert.deepEqual(result.setWindowPosFlags, ["SWP_NOZORDER", "SWP_NOACTIVATE"]);

const invalidPid = spawnSync(process.execPath, [
  scriptPath,
  "dry-run",
  "--pid",
  "0",
  "--startedAtUtc",
  "2026-07-22T10:00:00.000Z",
], { encoding: "utf8" });
assert.notEqual(invalidPid.status, 0, "zero PID must fail closed");
assert.match(invalidPid.stderr, /--pid must be a positive integer/u);

const localTime = spawnSync(process.execPath, [
  scriptPath,
  "dry-run",
  "--pid",
  "1234",
  "--startedAtUtc",
  "2026-07-22T12:00:00+02:00",
], { encoding: "utf8" });
assert.notEqual(localTime.status, 0, "non-Z process start must fail closed");
assert.match(localTime.stderr, /--startedAtUtc must be an absolute UTC instant ending in Z/u);

const missingStart = spawnSync(process.execPath, [
  scriptPath,
  "dry-run",
  "--pid",
  "1234",
], { encoding: "utf8" });
assert.notEqual(missingStart.status, 0, "missing process start must fail closed");
assert.match(missingStart.stderr, /--startedAtUtc is required/u);

console.log(JSON.stringify({ ok: true, status: "prepare_nwmain_proof_window_contract_valid" }));
