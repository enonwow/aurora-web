#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const script = resolve(root, "backend/scripts/capture-nwmain-proof-video-no-global-input.mjs");
const runtimeStandard = resolve(root, "backend/docs/aurora-reverse/aur-s07-runtime-execution-standard.md");
const proofRouting = resolve(root, "skills/aurora-toolset-prove/references/proof-routing.md");
const ffmpeg = "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe";
const out = join(mkdtempSync(join(tmpdir(), "nwmain-proof-video-contract-")), "capture.mp4");

const source = readFileSync(script, "utf8");
for (const required of [
  "expected_one_nwmain",
  "nwmain_pid_mismatch",
  "nwmain_start_mismatch",
  "expected_one_visible_owned_nwmain_window",
  "WindowFromPoint",
  "ClientToScreen",
  "expected_one_nonprimary_screen",
  "nwmain_capture_probe_owner_mismatch",
  "-f", "gdigrab", "-offset_x", "-offset_y", "-video_size", "desktop",
  "capture_identity_or_occlusion_drift",
  "usesGlobalInput: false",
  "startsNwn: false",
  "changesZOrder: false",
  "activatesWindow: false",
  "rmSync(out, { force: true })",
]) assert.match(source, new RegExp(escapeRegExp(required)), `missing contract token: ${required}`);

for (const forbidden of [
  "Start-Process",
  "SetForegroundWindow",
  "SetActiveWindow",
  "SetFocus",
  "SetWindowPos",
  "SendInput",
  "SendKeys",
  "SetCursorPos",
  "mouse_event",
  "keybd_event",
  "PrintWindow",
  "HWND_TOP",
  "HWND_TOPMOST",
]) assert.doesNotMatch(source, new RegExp(escapeRegExp(forbidden)), `forbidden contract token: ${forbidden}`);

// The PowerShell probe lives inside a JavaScript template literal. Its
// diagnostic must use PowerShell interpolation, never accidental `${width}`
// JavaScript interpolation that throws before the live probe can run.
assert.match(source, /nwmain_window_too_small:\$\(\$width\)x\$\(\$height\)/u);
assert.doesNotMatch(source, /nwmain_window_too_small:\$\{width\}x\$\{height\}/u);
assert.match(source, /\$owner=\[int\]\(Read-Owner \(\[NwmainProofVideoProbe\]::WindowFromPoint\(\$point\)\)\)/u);
assert.match(source, /\$xs=@\(\(\$left\+16\),\(\[int\]\[Math\]::Floor\(\(\$left\+\$right\)\/2\)\),\(\$right-16\)\)/u);
assert.match(source, /\$ys=@\(\(\$top\+16\),\(\[int\]\[Math\]::Floor\(\(\$top\+\$bottom\)\/2\)\),\(\$bottom-16\)\)/u);
assert.doesNotMatch(source, /\$xs=@\(\$left\+16,/u);
assert.doesNotMatch(source, /\$ys=@\(\$top\+16,/u);

const dry = JSON.parse(execFileSync(process.execPath, [
  script,
  "dry-run",
  "--out", out,
  "--ffmpeg", ffmpeg,
  "--durationSeconds", "24",
  "--fps", "12",
], { cwd: root, encoding: "utf8" }));
assert.equal(dry.ok, true);
assert.equal(dry.status, "nwmain_proof_video_capture_plan_valid");
assert.equal(dry.startsNwn, false);
assert.equal(dry.usesGlobalInput, false);
assert.equal(dry.changesZOrder, false);
assert.equal(dry.activatesWindow, false);
assert.equal(dry.captureSource, "physical desktop pixels clipped to the exact owned nwmain client area");
assert.equal(dry.durationSeconds, 24);
assert.equal(dry.fps, 12);
assert.equal(dry.outputExists, false);

for (const registeredSource of [readFileSync(runtimeStandard, "utf8"), readFileSync(proofRouting, "utf8")]) {
  assert.match(registeredSource, /capture-nwmain-proof-video-no-global-input\.mjs/u);
  assert.match(registeredSource, /3x3 WindowFromPoint/u);
  assert.match(registeredSource, /does not start NWN/u);
}

console.log(JSON.stringify({ ok: true, status: "capture_nwmain_proof_video_contract_valid" }));

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
