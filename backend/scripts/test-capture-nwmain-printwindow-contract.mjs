#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { EventEmitter } from "node:events";
import { deflateSync } from "node:zlib";
import { capturePerWindowPng, stopOwnedCaptureChildren, validatePerWindowReceipt, buildPerWindowSource } from "./lib/nwmain-per-window-capture.mjs";

const source = buildPerWindowSource();
for (const token of ["PrintWindow", "IsIconic", "ShowWindowAsync", "SW_SHOWNOACTIVATE", "GetForegroundWindow", "GW_HWNDPREV", "Stopwatch", "Ticks-ne", "nwmain_capture_uniform", "Assert-Stable", "ReleaseHdc", "Dispose", "SM_CXPADDEDBORDER", "Get-FrameTolerance", "Assert-MonitorGeometry", "geometryMetrics"]) assert.ok(source.includes(token), token);
for (const token of ["SetForegroundWindow", "SetWindowPos", "CopyFromScreen", "SendInput", "SetFocus", "Start-Process", "SendKeys"]) assert.ok(!source.includes(token), token);
const pid = 42, startedAtUtc = "2026-01-01T00:00:00.1234567Z", windowHwnd = 9, monitorDevice = "test-display";
const receipt = {
  version: "aurora-nwmain-printwindow-capture/v1", ok: true, status: "verified", captureMethod: "printwindow", captureId: "current-child-nonce",
  processId: pid, startedAtUtc, startTimeMatchedExactly: true, windowHwnd,
  captureSurface: "client", visibleOwnedTopWindowCount: 1, modalFreeBeforeCapture: true, modalFreeAfterRestore: true,
  monitor: {deviceName: monitorDevice, primary: false}, bounds: {left: -1600, top: 30, width: 1280, height: 720},
  captureCount: 1, frameCount: 1, printWindowCalls: 1, fallbackCalls: 0, allFramesNonUniform: true,
  foregroundHwndBefore: 77, foregroundHwndAfter: 77, predecessorHwndBefore: 88, predecessorHwndAfter: 88, predecessorPidBefore: 25, predecessorPidAfter: 25,
  restoreWithoutActivation: {requested: false, performed: false, iconicBefore: false, iconicAfter: false},
  identityObservation: {allStable: true, snapshotCount: 2},
  acceptance: {level: "observation", independentVisualReview: "required", freshness: "unverified", motionProof: false, rendererFpsProof: false},
  safety: {usesGlobalCursor: false, usesGlobalMouse: false, usesGlobalKeyboard: false, activatesWindow: false, usesTopmost: false, changesZOrder: false, changesWindowGeometry: false, zOrderRestored: true},
  geometryMetrics: {frameBorderSize: {width: 1, height: 1}, paddedBorderSize: 6, frameTolerance: {x: 7, y: 7, cap: 32},
    monitorBounds: {left: -1920, top: 0, width: 1920, height: 1080}, workingArea: {left: -1920, top: 0, width: 1920, height: 1080}},
};
const expected = {pid, startedAtUtc, windowHwnd, monitorDevice, frameCount: 1, restoreWithoutActivation: false, allowPrimaryMonitor: false, captureId: "current-child-nonce"};
assert.equal(validatePerWindowReceipt(structuredClone(receipt), expected).captureMethod, "printwindow");
const primaryReceipt = structuredClone(receipt);
primaryReceipt.monitor.primary = true;
assert.throws(() => validatePerWindowReceipt(primaryReceipt, expected), /receipt_invalid/u, "primary remains denied by default");
assert.equal(validatePerWindowReceipt(primaryReceipt, {...expected, allowPrimaryMonitor: true}).monitor.primary, true, "an explicit route authorization preserves the truthful primary receipt");
const observed = {...structuredClone(receipt), version: "aurora-nwmain-printwindow-capture/v2", ambientWindowPolicy: "observe",
  foregroundHwndAfter: 78, predecessorHwndAfter: 89, predecessorPidAfter: 26,
  identityObservation: {allStable: true, snapshotCount: 2, scope: "target_window"},
  ambientWindowObservation: {sampleCount: 4, foregroundChangeCount: 1, predecessorChangeCount: 1, sampledStateStable: false, caused_by: "unverified",
    samples: [
      {index: 0, elapsedMs: 0, foregroundHwnd: 77, predecessorHwnd: 88, predecessorPid: 25},
      {index: 1, elapsedMs: 1, foregroundHwnd: 77, predecessorHwnd: 88, predecessorPid: 25},
      {index: 2, elapsedMs: 2, foregroundHwnd: 78, predecessorHwnd: 89, predecessorPid: 26},
      {index: 3, elapsedMs: 3, foregroundHwnd: 78, predecessorHwnd: 89, predecessorPid: 26}]}};
observed.safety.zOrderRestored = false;
observed.safety.effectsScope = "capture_producer";
observed.safety.zOrderRestorationAttempted = false;
const observeExpected = {...expected, ambientWindowPolicy: "observe"};
assert.equal(validatePerWindowReceipt(structuredClone(observed), observeExpected).ambientWindowObservation.sampledStateStable, false);
for (const mutate of [
  r => r.ambientWindowObservation.foregroundChangeCount = 0,
  r => r.ambientWindowObservation.sampledStateStable = true,
  r => r.ambientWindowObservation.samples[2].foregroundHwnd = windowHwnd,
  r => r.ambientWindowObservation.samples[2].elapsedMs = NaN,
  r => r.ambientWindowObservation.samples[2].elapsedMs = -1,
  r => r.ambientWindowObservation.caused_by = "user",
  r => r.safety.zOrderRestored = true,
  r => r.identityObservation.scope = "all_windows",
  r => r.processId++, r => r.windowHwnd++, r => r.modalFreeBeforeCapture = false,
  r => r.identityObservation.allStable = false, r => r.monitor.deviceName = "other",
  r => r.bounds.width = 0, r => r.acceptance.freshness = "verified",
]) { const changed = structuredClone(observed); mutate(changed); assert.throws(() => validatePerWindowReceipt(changed, observeExpected)); }
assert.throws(() => validatePerWindowReceipt(observed, expected), /receipt_invalid/u);
const returned = structuredClone(observed);
Object.assign(returned.ambientWindowObservation.samples[3], returned.ambientWindowObservation.samples[0], {index: 3, elapsedMs: 3});
Object.assign(returned, {foregroundHwndAfter: 77, predecessorHwndAfter: 88, predecessorPidAfter: 25});
Object.assign(returned.ambientWindowObservation, {foregroundChangeCount: 2, predecessorChangeCount: 2});
assert.equal(validatePerWindowReceipt(returned, observeExpected).ambientWindowObservation.sampledStateStable, false, "equal endpoints do not hide sampled changes");
for (const mutate of [
  r => r.processId++, r => r.startedAtUtc = "2025-01-01T00:00:00Z", r => r.windowHwnd++, r => r.captureId = "previous-child-nonce",
  r => r.foregroundHwndAfter++, r => r.predecessorHwndAfter++, r => r.predecessorPidAfter++, r => r.monitor.deviceName = "other",
  r => r.monitor.primary = true, r => r.allFramesNonUniform = false, r => r.identityObservation.allStable = false,
  r => r.restoreWithoutActivation.performed = true, r => r.safety.changesZOrder = true,
  r => r.acceptance.motionProof = true, r => r.acceptance.rendererFpsProof = true, r => r.printWindowCalls = 3,
  r => r.geometryMetrics.frameTolerance.x = 6, r => r.geometryMetrics.paddedBorderSize = -1,
]) { const changed = structuredClone(receipt); mutate(changed); assert.throws(() => validatePerWindowReceipt(changed, expected)); }
const temp = mkdtempSync(join(tmpdir(), "nwmain-printwindow-contract-"));
try {
  const out = join(temp, "capture.png");
  const bytes = fixturePng(1280, 720);
  const executeFixture = (_file, _args, options) => {
    writeFileSync(options.env.NPW_OUT, bytes);
    writeFileSync(options.env.NPW_RECEIPT, JSON.stringify({...receipt, captureId: options.env.NPW_CAPTURE_ID}));
    // A concurrent owner wins the public destination after the initial exists check.
    writeFileSync(out, "concurrent-owner");
  };
  assert.throws(() => capturePerWindowPng({...expected, out}, executeFixture), /EEXIST/u);
  assert.equal(readFileSync(out, "utf8"), "concurrent-owner");
  assert.deepEqual(readdirSync(temp), ["capture.png"]);
  rmSync(out);
  assert.throws(() => capturePerWindowPng({...expected, out}, (_file, _args, options) => {
    writeFileSync(options.env.NPW_OUT, bytes);
    writeFileSync(options.env.NPW_RECEIPT, JSON.stringify({...receipt, captureId: "stale-child"}));
  }), /receipt_invalid/u);
  assert.equal(existsSync(out), false); assert.deepEqual(readdirSync(temp), []);
  assert.throws(() => capturePerWindowPng({...expected, pid: NaN, out}, () => assert.fail("no dispatch")), /exact_identity/u);
  assert.throws(() => capturePerWindowPng({...expected, ambientWindowPolicy: "auto", out}, () => assert.fail("no dispatch")), /policy_invalid/u);
  assert.throws(() => capturePerWindowPng({...expected, allowPrimaryMonitor: "true", out}, () => assert.fail("no dispatch")), /primary_monitor_policy_invalid/u);
  const child = new EventEmitter(); child.exitCode = null; child.signalCode = null;
  let locked = true;
  child.kill = () => { setTimeout(() => { locked = false; child.exitCode = 1; child.emit("close", 1); }, 10); };
  await stopOwnedCaptureChildren([child], 100);
  assert.equal(locked, false, "stage cleanup is admitted only after exact child close");
  const hung = new EventEmitter(); hung.exitCode = null; hung.signalCode = null; hung.kill = () => {};
  await assert.rejects(stopOwnedCaptureChildren([hung], 10), /shutdown_unverified/u);
  await assert.rejects(stopOwnedCaptureChildren([], NaN), /budget_invalid/u);
  // Parse the PowerShell source without running any native function or game action.
  const ps = join(temp, "capture-source.ps1"); writeFileSync(ps, source);
  const parsed = spawnSync("powershell.exe", ["-NoProfile", "-Command", "$tokens=$null;$errors=$null;[void][System.Management.Automation.Language.Parser]::ParseFile($env:NPW_TEST_SOURCE,[ref]$tokens,[ref]$errors);if($errors.Count){$errors|ForEach-Object{$_.Message};exit 1}"], {env: {...process.env, NPW_TEST_SOURCE: ps}, encoding: "utf8", windowsHide: true, timeout: 10000});
  assert.equal(parsed.status, 0, parsed.stdout + parsed.stderr);
  // Execute the actual ambient/geometry guard bodies against fake APIs only.
  const ambientGuard = source.match(/function Observe-Ambient \{[\s\S]*?\n\}/u)[0];
  const stableGuard = source.match(/function Assert-Stable\{[^\n]+\}/u)[0];
  const frameToleranceGuard = source.match(/function Get-FrameTolerance\([^\n]+\{[\s\S]*?\n\}/u)[0];
  const monitorGeometryGuard = source.match(/function Assert-MonitorGeometry\([^\n]+\{[\s\S]*?\n\}/u)[0];
  writeFileSync(ps, String.raw`
Add-Type @'
using System;
public static class NwmainPerWindowCapture {
 public const uint GW_HWNDPREV=3; public static long Fg=77, Prev=88;
 public static IntPtr GetForegroundWindow(){return new IntPtr(Fg);}
 public static IntPtr GetWindow(IntPtr h,uint command){return new IntPtr(Prev);}
}
'@
$h=[IntPtr]9;$foregroundBefore=77;$predecessorBefore=88;$predecessorPidBefore=25;$owner=25
$observeAmbient=$false;$ambientClock=[Diagnostics.Stopwatch]::StartNew();$ambientSamples=[Collections.Generic.List[object]]::new()
function Read-Pid([IntPtr]$window){$owner}
function Expect-Rejection([scriptblock]$action,[string]$code){try{&$action;throw 'expected_rejection_missing'}catch{if($_.Exception.Message-ne$code){throw}}}
${ambientGuard}
${frameToleranceGuard}
${monitorGeometryGuard}
$tolerance=Get-FrameTolerance 1 1 6
if($tolerance.x-ne7-or$tolerance.y-ne7-or$tolerance.cap-ne32){throw 'frame_plus_padding_tolerance_missing'}
$screenBounds=[pscustomobject]@{Left=-1920;Top=0;Right=0;Bottom=1080};$work=$screenBounds
$window=[pscustomobject]@{Left=-1927;Top=0;Right=-953;Bottom=1039};$point=[pscustomobject]@{X=-1919;Y=39}
Assert-MonitorGeometry $window $point 958 1000 $work $screenBounds $tolerance
$tooFar=[pscustomobject]@{Left=-1928;Top=0;Right=-953;Bottom=1039}
Expect-Rejection {Assert-MonitorGeometry $tooFar $point 958 1000 $work $screenBounds $tolerance} 'nwmain_window_outside_monitor_frame_tolerance'
$clientOutside=[pscustomobject]@{X=-1921;Y=39}
Expect-Rejection {Assert-MonitorGeometry $window $clientOutside 958 1000 $work $screenBounds $tolerance} 'nwmain_client_outside_working_area'
Observe-Ambient
[NwmainPerWindowCapture]::Fg=78
Expect-Rejection {Observe-Ambient} 'nwmain_focus_or_zorder_drift'
$observeAmbient=$true
Observe-Ambient
[NwmainPerWindowCapture]::Prev=89;$owner=26;Observe-Ambient
if($ambientSamples.Count-ne2-or$ambientSamples[1].predecessorHwnd-ne89-or$ambientSamples[1].predecessorPid-ne26){throw 'observed_sample_missing'}
[NwmainPerWindowCapture]::Fg=9
Expect-Rejection {Observe-Ambient} 'nwmain_target_foreground_in_observe_lane'
function Assert-Identity{}
function Read-Geometry{[pscustomobject]@{width=$width;height=720}}
$width=1280;$baselineJson=(Read-Geometry)|ConvertTo-Json -Compress;$snapshots=0
${stableGuard}
Assert-Stable;$width=1281
Expect-Rejection {Assert-Stable} 'nwmain_geometry_drift'
`);
  const guards = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps], {encoding: "utf8", windowsHide: true, timeout: 10000});
  assert.equal(guards.status, 0, guards.stdout + guards.stderr);
} finally { rmSync(temp, {recursive: true, force: true}); }
for (const basename of ["capture-nwmain-proof-window-no-global-input.mjs", "capture-nwmain-proof-video-no-global-input.mjs"]) {
  const script = resolve(import.meta.dirname, basename);
  assert.match(readFileSync(script, "utf8"), /captureMethod/u);
  const argumentsFor = basename.includes("video") ? ["--ffmpeg", process.execPath, "--durationSeconds", "2", "--fps", "12"] : [];
  const run = spawnSync(process.execPath, [script, "dry-run", "--out", resolve(import.meta.dirname, "absent-printwindow-test.png"), "--captureMethod", "printwindow", ...argumentsFor], {encoding: "utf8"});
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.captureMethod, "printwindow"); assert.equal(result.changesZOrder, false); assert.equal(result.activatesWindow, false);
  assert.equal(result.ambientWindowPolicy, "strict");
  const observedPlan = spawnSync(process.execPath, [script, "dry-run", "--out", resolve(import.meta.dirname, "absent-printwindow-test.png"), "--captureMethod", "printwindow", "--ambientWindowPolicy", "observe", ...argumentsFor], {encoding: "utf8"});
  assert.equal(observedPlan.status, 0, observedPlan.stderr);
  assert.equal(JSON.parse(observedPlan.stdout).ambientWindowPolicy, "observe");
  const primaryPlan = spawnSync(process.execPath, [script, "dry-run", "--out", resolve(import.meta.dirname, "absent-printwindow-test.png"), "--captureMethod", "printwindow", "--allowPrimaryMonitor", "true", ...argumentsFor], {encoding: "utf8"});
  assert.equal(primaryPlan.status, 0, primaryPlan.stderr);
  assert.equal(JSON.parse(primaryPlan.stdout).allowPrimaryMonitor, true);
  const invalidPrimary = spawnSync(process.execPath, [script, "dry-run", "--out", resolve(import.meta.dirname, "absent-printwindow-test.png"), "--captureMethod", "printwindow", "--allowPrimaryMonitor", "yes", ...argumentsFor], {encoding: "utf8"});
  assert.notEqual(invalidPrimary.status, 0);
  assert.match(invalidPrimary.stderr, /primary_monitor_policy_invalid/u);
  for (const [method, policy] of [["physical", "observe"], ["printwindow", "auto"]]) {
    const rejected = spawnSync(process.execPath, [script, "dry-run", "--out", resolve(import.meta.dirname, "absent-printwindow-test.png"), "--captureMethod", method, "--ambientWindowPolicy", policy, ...argumentsFor], {encoding: "utf8"});
    assert.notEqual(rejected.status, 0); assert.match(rejected.stderr, /policy_invalid|require_printwindow/u);
  }
}
console.log(JSON.stringify({ok: true, status: "nwmain_printwindow_contract_valid"}));

function fixturePng(width, height) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const chunk = (type, payload) => {
    const name = Buffer.from(type), data = Buffer.concat([name, payload]), value = Buffer.alloc(payload.length + 12);
    value.writeUInt32BE(payload.length); data.copy(value, 4);
    let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    value.writeUInt32BE((crc ^ 0xffffffff) >>> 0, value.length - 4); return value;
  };
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.alloc(height * (width * 3 + 1)))), chunk("IEND", Buffer.alloc(0))]);
}
