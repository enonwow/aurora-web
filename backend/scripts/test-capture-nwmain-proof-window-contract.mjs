#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateLeaseEvidence } from "./capture-nwmain-proof-window-no-global-input.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(scriptDir, "capture-nwmain-proof-window-no-global-input.mjs");
assert.ok(existsSync(scriptPath), "NWN proof capture route is missing");
const source = readFileSync(scriptPath, "utf8");

for (const required of [
  "--pid", "--startedAtUtc", "WindowFromPoint", "CopyFromScreen", "validatePngBytes",
  "GetClientRect", "ClientToScreen", "WorkingArea", "captureSurface='client'", "probePoints",
  "GW_HWNDPREV", "HWND_TOP", "SWP_NOMOVE", "SWP_NOSIZE", "SWP_NOACTIVATE",
  "SWP_NOOWNERZORDER", "SWP_NOSENDCHANGING", "finally", "predecessorHwndAfter",
  "nwmain_second_capture_forbidden", "Remove-Item", "rmSync",
]) assert.ok(source.includes(required), `capture contract missing: ${required}`);

for (const forbidden of [
  "HWND_" + "TOPMOST", "SetForeground" + "Window", "BringWindow" + "ToTop",
  "Print" + "Window", "Send" + "Input", "Set" + "CursorPos", "mouse_" + "event",
  "keybd_" + "event", "Stop-" + "Process", "task" + "kill",
]) assert.ok(!source.includes(forbidden), `capture contract contains forbidden route: ${forbidden}`);

assert.equal((source.match(/\.CopyFromScreen\(/gu) ?? []).length, 1, "physical capture call must occur exactly once");

const dryRun = spawnSync(process.execPath, [scriptPath, "dry-run", "--out", "C:\\proof\\runtime.png"], { encoding: "utf8" });
assert.equal(dryRun.status, 0, dryRun.stderr);
const result = JSON.parse(dryRun.stdout);
assert.equal(result.captureSource, "physical pixels of exact owned nwmain client area");
assert.equal(result.zOrderTarget, "HWND_TOP");
assert.equal(result.maxCaptureCount, 1);
assert.equal(result.maxZOrderMutations, 2);
assert.equal(result.restoresExactPredecessor, true);
assert.equal(result.restoreFailureInvalidatesCapture, true);
assert.equal(result.usesTopmost, false);
assert.equal(result.usesGlobalInput, false);
assert.equal(result.activatesWindow, false);
assert.deepEqual(result.zOrderFlags, ["SWP_NOMOVE", "SWP_NOSIZE", "SWP_NOACTIVATE", "SWP_NOOWNERZORDER", "SWP_NOSENDCHANGING"]);

const pid = 17444;
const startedAtUtc = "2026-07-22T12:34:56.1234567Z";
const base = {
  ok: true,
  status: "verified",
  processId: pid,
  startedAtUtc,
  startTimeMatchedExactly: true,
  windowHwnd: 111,
  identitySnapshot: { processId: pid, startedAtUtc, windowHwnd: 111 },
  visibleOwnedTopWindowCount: 1,
  modalFreeBeforeCapture: true,
  modalFreeAfterRestore: true,
  captureSurface: "client",
  windowBounds: { left: -1920, top: 0, width: 1920, height: 1040 },
  bounds: { left: -1912, top: 31, width: 1904, height: 1001 },
  monitor: {
    deviceName: "\\\\.\\DISPLAY1",
    primary: false,
    bounds: { left: -1920, top: 0, width: 1920, height: 1080 },
    workingArea: { left: -1920, top: 0, width: 1920, height: 1040 },
  },
  captureCount: 1,
  zOrderLease: {
    required: true,
    lifted: true,
    initialProbeOwners: [23572, 23572, 23572],
    postLiftProbeOwners: [pid, pid, pid],
    captureProbeOwners: [pid, pid, pid],
    probePoints: [
      { x: -1896, y: 47 },
      { x: -960, y: 531 },
      { x: -24, y: 1016 },
    ],
    originalPredecessor: { hwnd: 222, pid: 23572 },
    zOrderMutationCount: 2,
    lift: {
      target: "HWND_TOP",
      usesTopmost: false,
      activatesWindow: false,
      flags: ["SWP_NOMOVE", "SWP_NOSIZE", "SWP_NOACTIVATE", "SWP_NOOWNERZORDER", "SWP_NOSENDCHANGING"],
    },
    restore: {
      required: true,
      attempted: true,
      succeeded: true,
      predecessorHwndAfter: 222,
      predecessorPidAfter: 23572,
      processIdentityUnchanged: true,
      windowIdentityUnchanged: true,
      modalFree: true,
    },
  },
  safety: {
    usesGlobalCursor: false,
    usesGlobalMouse: false,
    usesGlobalKeyboard: false,
    activatesWindow: false,
    usesTopmost: false,
    temporaryZOrderLease: true,
    zOrderRestored: true,
  },
};

assert.equal(validateLeaseEvidence(structuredClone(base), { pid, startedAtUtc }).status, "verified");
for (const [name, mutate, expected] of [
  ["PID drift", (value) => { value.processId += 1; }, /capture_pid_mismatch/u],
  ["StartTime drift", (value) => { value.startTimeMatchedExactly = false; }, /capture_start_mismatch/u],
  ["HWND drift", (value) => { value.windowHwnd = 112; }, /identity_snapshot_mismatch/u],
  ["modal appeared", (value) => { value.modalFreeAfterRestore = false; }, /modal_or_window_set_invalid/u],
  ["predecessor drift", (value) => { value.zOrderLease.restore.predecessorHwndAfter = 333; }, /predecessor_restore_mismatch/u],
  ["predecessor PID drift", (value) => { value.zOrderLease.restore.predecessorPidAfter = 999; }, /predecessor_restore_mismatch/u],
  ["restore failure", (value) => { value.zOrderLease.restore.succeeded = false; }, /zorder_restore_failed/u],
  ["second capture", (value) => { value.captureCount = 2; }, /capture_count_invalid/u],
  ["window outside working area", (value) => { value.windowBounds.height = 1080; }, /window_outside_working_area/u],
  ["client outside window", (value) => { value.bounds.left = -1930; }, /client_bounds_invalid/u],
  ["probe outside client", (value) => { value.zOrderLease.probePoints[2].y = 1040; }, /probe_point_outside_client/u],
]) {
  const changed = structuredClone(base);
  mutate(changed);
  assert.throws(() => validateLeaseEvidence(changed, { pid, startedAtUtc }), expected, name);
}

const unobscured = structuredClone(base);
unobscured.zOrderLease.required = false;
unobscured.zOrderLease.lifted = false;
unobscured.zOrderLease.initialProbeOwners = [pid, pid, pid];
unobscured.zOrderLease.zOrderMutationCount = 0;
unobscured.zOrderLease.restore = {
  required: false,
  attempted: false,
  succeeded: true,
  predecessorHwndAfter: 222,
  predecessorPidAfter: 23572,
  processIdentityUnchanged: true,
  windowIdentityUnchanged: true,
  modalFree: true,
};
unobscured.safety.temporaryZOrderLease = false;
assert.equal(validateLeaseEvidence(unobscured, { pid, startedAtUtc }).zOrderLease.lifted, false);

console.log(JSON.stringify({ ok: true, status: "capture_nwmain_proof_window_scoped_zorder_lease_contract_valid" }));
