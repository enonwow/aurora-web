#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../..");
const script = resolve(root, "backend/scripts/capture-vfx-nwmain-predecessor-pipeline.py");
const source = readFileSync(script, "utf8");

for (const required of [
  "capture_all_vfx_clips.py",
  "run-skrytobojca-mark-nwn-proof.py",
  "lab.capture_window(hwnd)",
  "predecessor.is_runtime_gameplay_frame(frame)",
  "now - started >= 12.0 and predecessor.is_capture_candidate_frame(frame)",
  "forcedGameplayDetection",
  "candidateCaptureStartedAtSeconds",
  "predecessor.is_capture_candidate_frame(frame)",
  "cv2.VideoWriter",
  "PrintWindow(PW_RENDERFULLCONTENT)",
  "expected_one_exact_nwmain",
  "PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE",
  "kernel32.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_uint32]",
  "kernel32.CloseHandle.argtypes = [ctypes.c_void_p]",
  "SW_SHOWNOACTIVATE",
  "startsNwn\": False",
  "usesGlobalCursor\": False",
  "usesGlobalMouse\": False",
  "usesGlobalKeyboard\": False",
  "activatesWindow\": False",
  "changesZOrder\": False",
]) assert.ok(source.includes(required), `missing predecessor capture token: ${required}`);

for (const forbidden of [
  "subprocess.Popen",
  "+TestNewModule",
  "SetForegroundWindow",
  "SetCursorPos",
  "mouse_event",
  "keybd_event",
  "ImageGrab",
  "SW_RESTORE",
  "SetWindowPos",
]) assert.ok(!source.includes(forbidden), `forbidden capture route: ${forbidden}`);

const dir = mkdtempSync(join(tmpdir(), "vfx-predecessor-capture-"));
const run = spawnSync("python", [
  script,
  "dry-run",
  "--pid", "1234",
  "--startedAtUtc", "2026-08-19T12:00:00.0000000Z",
  "--out", join(dir, "capture.mp4"),
  "--resultOut", join(dir, "capture.json"),
  "--durationSeconds", "45",
  "--fps", "12",
  "--captureMode", "location_area",
], { cwd: root, encoding: "utf8" });
assert.equal(run.status, 0, run.stderr);
const result = JSON.parse(run.stdout);
assert.equal(result.status, "predecessor_vfx_capture_plan_valid");
assert.equal(result.captureMethod, "predecessor PrintWindow(PW_RENDERFULLCONTENT) frame loop");
assert.equal(result.startsNwn, false);
assert.equal(result.usesGlobalInput, false);
assert.equal(result.activatesWindow, false);
assert.equal(result.changesZOrder, false);
assert.equal(result.captureMode, "location_area");
assert.equal(result.durationSeconds, 45);
assert.equal(result.fps, 12);

console.log(JSON.stringify({ ok: true, status: "vfx_predecessor_capture_contract_valid" }));
