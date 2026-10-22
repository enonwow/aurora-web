import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { validatePngBytes } from "./aurora-model-proof-120s-contract.mjs";

// Shared capture implementation; public entrypoints remain the existing PNG/video routes.
// No launcher, fixture classifier, settings helper or asset-specific dependency is admitted.
export function rejectCapturePathAlias(out, resultOut) {
  if (!resultOut) return;
  const key = path => {
    const absolute = resolve(path);
    return process.platform === "win32" ? absolute.toLowerCase() : absolute;
  };
  if (key(out) === key(resultOut)) throw new Error("capture_output_receipt_alias");
}

export function perWindowPlan({ restoreWithoutActivation = false, ambientWindowPolicy = "strict", allowPrimaryMonitor = false } = {}) {
  if (!["strict", "observe"].includes(ambientWindowPolicy)) throw new Error("ambient_window_policy_invalid");
  if (typeof allowPrimaryMonitor !== "boolean") throw new Error("primary_monitor_policy_invalid");
  return { captureMethod: "printwindow", ambientWindowPolicy, captureSource: "per-window PrintWindow flags 2 with failure-only flags 0 fallback, cropped to client",
    startsNwn: false, usesGlobalInput: false, changesZOrder: false, activatesWindow: false,
    restoreWithoutActivation, allowPrimaryMonitor, acceptance: { level: "observation", independentVisualReview: "required", freshness: "unverified", motionProof: false, rendererFpsProof: false } };
}

export function validatePerWindowReceipt(packet, expected) {
  const fail = () => { throw new Error("nwmain_printwindow_receipt_invalid"); };
  const policy = expected.ambientWindowPolicy ?? "strict";
  if (!["strict", "observe"].includes(policy) || packet?.version !== `aurora-nwmain-printwindow-capture/v${policy === "observe" ? 2 : 1}` || (packet.ambientWindowPolicy ?? "strict") !== policy || packet.ok !== true || packet.status !== "verified" || packet.captureMethod !== "printwindow") fail();
  if (packet.processId !== expected.pid || packet.startedAtUtc !== expected.startedAtUtc || packet.startTimeMatchedExactly !== true || packet.windowHwnd !== expected.windowHwnd || packet.captureId !== expected.captureId) fail();
  const allowPrimaryMonitor = expected.allowPrimaryMonitor ?? false;
  if (typeof allowPrimaryMonitor !== "boolean" || packet.monitor?.deviceName !== expected.monitorDevice || typeof packet.monitor?.primary !== "boolean" || (packet.monitor.primary && !allowPrimaryMonitor) || packet.captureSurface !== "client") fail();
  if (![packet.bounds?.left, packet.bounds?.top, packet.bounds?.width, packet.bounds?.height].every(Number.isSafeInteger) || packet.bounds.width < 640 || packet.bounds.height < 480) fail();
  if (packet.visibleOwnedTopWindowCount !== 1 || packet.modalFreeBeforeCapture !== true || packet.modalFreeAfterRestore !== true || packet.allFramesNonUniform !== true) fail();
  if (packet.captureCount !== expected.frameCount || packet.frameCount !== expected.frameCount || !Number.isSafeInteger(packet.fallbackCalls) || packet.fallbackCalls < 0 || packet.fallbackCalls > expected.frameCount || packet.printWindowCalls !== expected.frameCount + packet.fallbackCalls) fail();
  if (policy === "strict" && (!Number.isSafeInteger(packet.foregroundHwndBefore) || packet.foregroundHwndBefore !== packet.foregroundHwndAfter || !Number.isSafeInteger(packet.predecessorHwndBefore) || packet.predecessorHwndBefore !== packet.predecessorHwndAfter || !Number.isSafeInteger(packet.predecessorPidBefore) || packet.predecessorPidBefore !== packet.predecessorPidAfter)) fail();
  if (policy === "observe") validateAmbientWindowObservation(packet, expected, fail);
  const restore = packet.restoreWithoutActivation;
  if (restore?.requested !== expected.restoreWithoutActivation || typeof restore.iconicBefore !== "boolean" || restore.iconicAfter !== false || restore.performed !== restore.iconicBefore || (restore.performed && !expected.restoreWithoutActivation)) fail();
  if (packet.identityObservation?.allStable !== true || !Number.isSafeInteger(packet.identityObservation.snapshotCount) || packet.identityObservation.snapshotCount < expected.frameCount * 2) fail();
  const metrics = packet.geometryMetrics;
  const frameWidth = metrics?.frameBorderSize?.width, frameHeight = metrics?.frameBorderSize?.height, padding = metrics?.paddedBorderSize;
  const toleranceX = metrics?.frameTolerance?.x, toleranceY = metrics?.frameTolerance?.y, toleranceCap = metrics?.frameTolerance?.cap;
  if (![frameWidth, frameHeight, padding, toleranceX, toleranceY, toleranceCap].every(value => Number.isSafeInteger(value) && value >= 0) || toleranceCap !== 32 || toleranceX !== Math.min(toleranceCap, frameWidth + padding) || toleranceY !== Math.min(toleranceCap, frameHeight + padding)) fail();
  for (const rectangle of [metrics?.monitorBounds, metrics?.workingArea]) if (![rectangle?.left, rectangle?.top, rectangle?.width, rectangle?.height].every(Number.isSafeInteger) || rectangle.width < 1 || rectangle.height < 1) fail();
  const monitorRight = metrics.monitorBounds.left + metrics.monitorBounds.width, monitorBottom = metrics.monitorBounds.top + metrics.monitorBounds.height;
  const workRight = metrics.workingArea.left + metrics.workingArea.width, workBottom = metrics.workingArea.top + metrics.workingArea.height;
  if (metrics.workingArea.left < metrics.monitorBounds.left || metrics.workingArea.top < metrics.monitorBounds.top || workRight > monitorRight || workBottom > monitorBottom || packet.bounds.left < metrics.workingArea.left || packet.bounds.top < metrics.workingArea.top || packet.bounds.left + packet.bounds.width > workRight || packet.bounds.top + packet.bounds.height > workBottom) fail();
  for (const key of ["usesGlobalCursor", "usesGlobalMouse", "usesGlobalKeyboard", "activatesWindow", "usesTopmost", "changesZOrder", "changesWindowGeometry"]) if (packet.safety?.[key] !== false) fail();
  if (packet.safety?.zOrderRestored !== (policy === "strict") || packet.acceptance?.level !== "observation" || packet.acceptance?.independentVisualReview !== "required" || packet.acceptance?.freshness !== "unverified" || packet.acceptance?.motionProof !== false || packet.acceptance?.rendererFpsProof !== false) fail();
  return packet;
}

function validateAmbientWindowObservation(packet, expected, fail) {
  const observation = packet.ambientWindowObservation, samples = observation?.samples;
  if (packet.identityObservation?.scope !== "target_window" || packet.safety?.effectsScope !== "capture_producer" || packet.safety?.zOrderRestorationAttempted !== false || observation?.caused_by !== "unverified" || !Array.isArray(samples) || samples.length < expected.frameCount * 2 + 2 || samples.length > 5500 || observation.sampleCount !== samples.length) fail();
  let foregroundChanges = 0, predecessorChanges = 0;
  for (const [index, sample] of samples.entries()) {
    if (sample?.index !== index || !Number.isFinite(sample.elapsedMs) || sample.elapsedMs < 0 || sample.elapsedMs > 120000 || ![sample.foregroundHwnd, sample.predecessorHwnd, sample.predecessorPid].every(value => Number.isSafeInteger(value) && value >= 0) || sample.foregroundHwnd === expected.windowHwnd) fail();
    if (index) {
      const previous = samples[index - 1];
      if (sample.elapsedMs < previous.elapsedMs) fail();
      if (sample.foregroundHwnd !== previous.foregroundHwnd) foregroundChanges++;
      if (sample.predecessorHwnd !== previous.predecessorHwnd || sample.predecessorPid !== previous.predecessorPid) predecessorChanges++;
    }
  }
  if (observation.foregroundChangeCount !== foregroundChanges || observation.predecessorChangeCount !== predecessorChanges || observation.sampledStateStable !== (foregroundChanges === 0 && predecessorChanges === 0)) fail();
  for (const [side, sample] of [["Before", samples[0]], ["After", samples.at(-1)]]) {
    if (packet[`foregroundHwnd${side}`] !== sample.foregroundHwnd || packet[`predecessorHwnd${side}`] !== sample.predecessorHwnd || packet[`predecessorPid${side}`] !== sample.predecessorPid) fail();
  }
}

function captureEnvironment(options, receiptPath, frameCount, fps, stream) {
  if (!["strict", "observe"].includes(options.ambientWindowPolicy ?? "strict")) throw new Error("ambient_window_policy_invalid");
  if (typeof (options.allowPrimaryMonitor ?? false) !== "boolean") throw new Error("primary_monitor_policy_invalid");
  if (!Number.isSafeInteger(options.pid) || options.pid < 1 || !Number.isSafeInteger(options.windowHwnd) || options.windowHwnd < 1 || !options.monitorDevice || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$/u.test(options.startedAtUtc) || !Number.isFinite(Date.parse(options.startedAtUtc))) throw new Error("nwmain_printwindow_exact_identity_required");
  if (!Number.isSafeInteger(frameCount) || frameCount < 1 || frameCount > 2700 || !Number.isSafeInteger(fps) || fps < 1 || fps > 30 || typeof options.restoreWithoutActivation !== "boolean") throw new Error("nwmain_printwindow_capture_budget_invalid");
  return { ...process.env, NPW_PID: String(options.pid), NPW_STARTED: options.startedAtUtc, NPW_HWND: String(options.windowHwnd), NPW_MONITOR: options.monitorDevice,
    NPW_AMBIENT_POLICY: options.ambientWindowPolicy ?? "strict", NPW_ALLOW_PRIMARY: options.allowPrimaryMonitor ? "1" : "0", NPW_CAPTURE_ID: options.captureId, NPW_OUT: options.out, NPW_RECEIPT: receiptPath, NPW_FRAMES: String(frameCount), NPW_FPS: String(fps), NPW_STREAM: stream ? "1" : "0", NPW_RESTORE: options.restoreWithoutActivation ? "1" : "0" };
}

export function capturePerWindowPng(options, execute = execFileSync) {
  options = { ...options, captureId: randomUUID() };
  if (existsSync(options.out)) throw new Error("capture_output_already_exists");
  mkdirSync(dirname(options.out), { recursive: true });
  const receiptPath = `${options.out}.${randomUUID()}.receipt.tmp.json`;
  const stage = `${options.out}.${options.captureId}.capture.tmp.png`;
  try {
    execute("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", buildPerWindowSource()], { env: captureEnvironment({...options, out: stage}, receiptPath, 1, 1, false), windowsHide: true, timeout: 15000, maxBuffer: 1024 * 1024 });
    const packet = validatePerWindowReceipt(JSON.parse(readFileSync(receiptPath, "utf8")), { ...options, frameCount: 1 });
    const bytes = readFileSync(stage); const png = validatePngBytes(bytes);
    if (png.width !== packet.bounds.width || png.height !== packet.bounds.height) throw new Error("nwmain_printwindow_png_dimensions_mismatch");
    copyFileSync(stage, options.out, constants.COPYFILE_EXCL);
    return { ...packet, pngPath: options.out, pngBytes: bytes.length, pngSha256: digest(bytes), capturedAtUtc: new Date().toISOString() };
  } finally { rmSync(stage, { force: true }); rmSync(receiptPath, { force: true }); }
}

export async function capturePerWindowVideo(options) {
  options = { ...options, captureId: randomUUID() };
  const { out, ffmpeg, fps, durationSeconds } = options;
  if (!Number.isFinite(durationSeconds) || durationSeconds < 2 || durationSeconds > 90) throw new Error("nwmain_printwindow_duration_invalid");
  if (existsSync(out)) throw new Error("capture_output_already_exists");
  const frameCount = Math.ceil(durationSeconds * fps);
  mkdirSync(dirname(out), { recursive: true });
  const receiptPath = `${out}.${randomUUID()}.receipt.tmp.json`;
  const stage = `${out}.${options.captureId}.capture.tmp.mp4`;
  const env = captureEnvironment(options, receiptPath, frameCount, fps, true);
  const args = ["-n", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-vcodec", "png", "-framerate", String(fps), "-i", "pipe:0", "-an", "-vf", "crop=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-threads", "2", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", stage];
  let producer, encoder, timer;
  try {
    encoder = spawn(ffmpeg, args, { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] });
    producer = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", buildPerWindowSource()], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const exits = [producer, encoder].map(child => new Promise((resolveExit, rejectExit) => {
      let diagnostic = ""; child.stderr.setEncoding("utf8"); child.stderr.on("data", chunk => { diagnostic = (diagnostic + chunk).slice(-3000); });
      child.once("error", rejectExit); child.once("exit", code => code === 0 ? resolveExit() : rejectExit(new Error(`per_window_capture_child_failed:${code}:${diagnostic}`)));
    }));
    const deadline = new Promise((_, rejectDeadline) => { timer = setTimeout(() => rejectDeadline(new Error("nwmain_printwindow_deadline_exceeded")), Math.ceil((durationSeconds + 15) * 1000)); });
    await Promise.race([Promise.all([...exits, pipeline(producer.stdout, encoder.stdin)]), deadline]);
    const packet = validatePerWindowReceipt(JSON.parse(readFileSync(receiptPath, "utf8")), { ...options, frameCount });
    const validation = options.validateEncodedVideo(stage, packet.bounds.width - packet.bounds.width % 2, packet.bounds.height - packet.bounds.height % 2);
    copyFileSync(stage, out, constants.COPYFILE_EXCL);
    return { packet, arguments: args, validation };
  } catch (error) {
    for (const child of [producer, encoder].filter(Boolean)) if (child.exitCode === null && child.signalCode === null) child.kill();
    throw error;
  }
  finally {
    clearTimeout(timer);
    // Only exact child objects created by this call are owned; never the game process.
    await stopOwnedCaptureChildren([producer, encoder].filter(Boolean));
    rmSync(stage, { force: true });
    rmSync(receiptPath, { force: true });
  }
}

export async function stopOwnedCaptureChildren(children, timeoutMs = 3000) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) throw new Error("capture_shutdown_budget_invalid");
  await Promise.all(children.map(child => {
    if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
    return new Promise((resolveExit, rejectExit) => {
      const timeout = setTimeout(() => rejectExit(new Error("exact_capture_child_shutdown_unverified")), timeoutMs);
      child.once("close", () => { clearTimeout(timeout); resolveExit(); });
      child.kill();
    });
  }));
}

function digest(bytes) { return createHash("sha256").update(bytes).digest("hex"); }

export function buildPerWindowSource() { return String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class NwmainPerWindowCapture {
 public const uint GW_HWNDPREV=3; public const int SW_SHOWNOACTIVATE=4,SM_CXPADDEDBORDER=92;
 [StructLayout(LayoutKind.Sequential)] public struct R{public int Left,Top,Right,Bottom;}
 [StructLayout(LayoutKind.Sequential)] public struct P{public int X,Y;}
 public delegate bool EnumWindowsProc(IntPtr hwnd,IntPtr p);
 [DllImport("user32.dll")]public static extern bool EnumWindows(EnumWindowsProc c,IntPtr p);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")]public static extern bool ShowWindowAsync(IntPtr h,int command);
 [DllImport("user32.dll")]public static extern bool PrintWindow(IntPtr h,IntPtr dc,uint flags);
 [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll")]public static extern bool GetClientRect(IntPtr h,out R r);
 [DllImport("user32.dll")]public static extern bool ClientToScreen(IntPtr h,ref P p);
 [DllImport("user32.dll")]public static extern IntPtr GetWindow(IntPtr h,uint command);
 [DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll")]public static extern int GetSystemMetrics(int index);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder s,int n);
}
'@
$expectedPid=[int]$env:NPW_PID;$expectedStart=[DateTimeOffset]::Parse($env:NPW_STARTED).UtcDateTime;$h=[IntPtr][long]$env:NPW_HWND
$frameCount=[int]$env:NPW_FRAMES;$fps=[int]$env:NPW_FPS;$restoreRequested=$env:NPW_RESTORE-eq'1';$streaming=$env:NPW_STREAM-eq'1';$allowPrimaryMonitor=$env:NPW_ALLOW_PRIMARY-eq'1'
$foregroundBefore=[NwmainPerWindowCapture]::GetForegroundWindow().ToInt64();$predecessorBefore=[NwmainPerWindowCapture]::GetWindow($h,[NwmainPerWindowCapture]::GW_HWNDPREV).ToInt64()
function Read-Pid([IntPtr]$window){[uint32]$owner=0;[void][NwmainPerWindowCapture]::GetWindowThreadProcessId($window,[ref]$owner);$owner}
$predecessorPidBefore=[int](Read-Pid ([IntPtr]$predecessorBefore))
$observeAmbient=$env:NPW_AMBIENT_POLICY-eq'observe';$ambientClock=[Diagnostics.Stopwatch]::StartNew();$ambientSamples=[Collections.Generic.List[object]]::new()
if($observeAmbient){$ambientSamples.Add([pscustomobject]@{index=0;elapsedMs=0;foregroundHwnd=$foregroundBefore;predecessorHwnd=$predecessorBefore;predecessorPid=$predecessorPidBefore});if($foregroundBefore-eq$h.ToInt64()){throw 'nwmain_target_foreground_in_observe_lane'}}
function Observe-Ambient {
 $fg=[NwmainPerWindowCapture]::GetForegroundWindow().ToInt64();$prev=[NwmainPerWindowCapture]::GetWindow($h,[NwmainPerWindowCapture]::GW_HWNDPREV).ToInt64();$owner=[int](Read-Pid ([IntPtr]$prev))
 if($observeAmbient){
  if($fg-eq$h.ToInt64()){throw 'nwmain_target_foreground_in_observe_lane'}
  if($ambientSamples.Count-ge5500-or$ambientClock.Elapsed.TotalMilliseconds-gt120000){throw 'nwmain_ambient_sample_budget_invalid'}
  $ambientSamples.Add([pscustomobject]@{index=$ambientSamples.Count;elapsedMs=$ambientClock.Elapsed.TotalMilliseconds;foregroundHwnd=$fg;predecessorHwnd=$prev;predecessorPid=$owner})
 }elseif($fg-ne$foregroundBefore-or$prev-ne$predecessorBefore-or$owner-ne$predecessorPidBefore){throw 'nwmain_focus_or_zorder_drift'}
}
function Assert-Identity {
 $all=@(Get-Process nwmain -ErrorAction SilentlyContinue);if($all.Count-ne1){throw 'expected_one_nwmain'};$p=$all[0]
 if($p.Id-ne$expectedPid-or-not$p.Responding-or$p.StartTime.ToUniversalTime().Ticks-ne$expectedStart.Ticks){throw 'nwmain_process_identity_mismatch'}
 if((Read-Pid $h)-ne$expectedPid){throw 'nwmain_hwnd_identity_mismatch'}
 $script:visible=@();[void][NwmainPerWindowCapture]::EnumWindows([NwmainPerWindowCapture+EnumWindowsProc]{param([IntPtr]$w,[IntPtr]$unused)
  if([NwmainPerWindowCapture]::IsWindowVisible($w)-and(Read-Pid $w)-eq$expectedPid){$script:visible+=,$w};$true
 },[IntPtr]::Zero)
 if($script:visible.Count-ne1-or$script:visible[0]-ne$h-or-not[NwmainPerWindowCapture]::IsWindowEnabled($h)-or[NwmainPerWindowCapture]::GetWindow($h,4)-ne[IntPtr]::Zero){throw 'nwmain_modal_or_window_set_invalid'}
 $text=[Text.StringBuilder]::new(256);[void][NwmainPerWindowCapture]::GetClassName($h,$text,$text.Capacity);if($text.ToString()-eq'#32770'){throw 'nwmain_modal_window'}
 $screen=[Windows.Forms.Screen]::FromHandle($h);if(((-not$allowPrimaryMonitor)-and$screen.Primary)-or$screen.DeviceName-ne$env:NPW_MONITOR){throw 'nwmain_monitor_identity_mismatch'}
 Observe-Ambient
 $screen
}
$screen=Assert-Identity;$iconicBefore=[NwmainPerWindowCapture]::IsIconic($h);$restored=$false
if($iconicBefore){
 if(-not$restoreRequested){throw 'nwmain_iconic_requires_explicit_restore_without_activation'}
 [void][NwmainPerWindowCapture]::ShowWindowAsync($h,[NwmainPerWindowCapture]::SW_SHOWNOACTIVATE);$restoreClock=[Diagnostics.Stopwatch]::StartNew()
 while([NwmainPerWindowCapture]::IsIconic($h)-and$restoreClock.ElapsedMilliseconds-lt2000){Start-Sleep -Milliseconds 25;[void](Assert-Identity)}
 if([NwmainPerWindowCapture]::IsIconic($h)){throw 'nwmain_restore_without_activation_failed'};$restored=$true
}
function Get-FrameTolerance([int]$frameWidth,[int]$frameHeight,[int]$paddedBorder){
 $frameWidth=[Math]::Max(0,$frameWidth);$frameHeight=[Math]::Max(0,$frameHeight);$paddedBorder=[Math]::Max(0,$paddedBorder);$cap=32
 [pscustomobject]@{x=[Math]::Min($cap,$frameWidth+$paddedBorder);y=[Math]::Min($cap,$frameHeight+$paddedBorder);cap=$cap;frameWidth=$frameWidth;frameHeight=$frameHeight;paddedBorder=$paddedBorder}
}
function Assert-MonitorGeometry($window,$point,[int]$width,[int]$height,$work,$screenBounds,$frameTolerance){
 if($point.X-lt$work.Left-or$point.Y-lt$work.Top-or($point.X+$width)-gt$work.Right-or($point.Y+$height)-gt$work.Bottom){throw 'nwmain_client_outside_working_area'}
 if($window.Left-lt($screenBounds.Left-$frameTolerance.x)-or$window.Top-lt($screenBounds.Top-$frameTolerance.y)-or$window.Right-gt($screenBounds.Right+$frameTolerance.x)-or$window.Bottom-gt($screenBounds.Bottom+$frameTolerance.y)){throw 'nwmain_window_outside_monitor_frame_tolerance'}
}
function Read-Geometry {
 if([NwmainPerWindowCapture]::IsIconic($h)){throw 'nwmain_became_iconic'}
 $window=New-Object 'NwmainPerWindowCapture+R';$client=New-Object 'NwmainPerWindowCapture+R';$point=New-Object 'NwmainPerWindowCapture+P'
 if(-not[NwmainPerWindowCapture]::GetWindowRect($h,[ref]$window)-or-not[NwmainPerWindowCapture]::GetClientRect($h,[ref]$client)-or-not[NwmainPerWindowCapture]::ClientToScreen($h,[ref]$point)){throw 'nwmain_geometry_unavailable'}
 $width=$client.Right-$client.Left;$height=$client.Bottom-$client.Top;$ww=$window.Right-$window.Left;$wh=$window.Bottom-$window.Top
 $ox=$point.X-$window.Left;$oy=$point.Y-$window.Top;$work=$screen.WorkingArea;$screenBounds=$screen.Bounds
 if($width-lt640-or$height-lt480-or$ww-gt8192-or$wh-gt8192-or$ox-lt0-or$oy-lt0-or($ox+$width)-gt$ww-or($oy+$height)-gt$wh){throw 'nwmain_geometry_invalid'}
 $frame=[Windows.Forms.SystemInformation]::FrameBorderSize;$paddedBorder=[NwmainPerWindowCapture]::GetSystemMetrics([NwmainPerWindowCapture]::SM_CXPADDEDBORDER);$frameTolerance=Get-FrameTolerance $frame.Width $frame.Height $paddedBorder
 Assert-MonitorGeometry $window $point $width $height $work $screenBounds $frameTolerance
 [pscustomobject]@{left=$point.X;top=$point.Y;width=$width;height=$height;windowLeft=$window.Left;windowTop=$window.Top;windowWidth=$ww;windowHeight=$wh;offsetX=$ox;offsetY=$oy;frameBorderWidth=$frameTolerance.frameWidth;frameBorderHeight=$frameTolerance.frameHeight;paddedBorderSize=$frameTolerance.paddedBorder;frameToleranceX=$frameTolerance.x;frameToleranceY=$frameTolerance.y;frameToleranceCap=$frameTolerance.cap;monitorLeft=$screenBounds.Left;monitorTop=$screenBounds.Top;monitorWidth=$screenBounds.Width;monitorHeight=$screenBounds.Height;workLeft=$work.Left;workTop=$work.Top;workWidth=$work.Width;workHeight=$work.Height}
}
$baseline=Read-Geometry;$baselineJson=$baseline|ConvertTo-Json -Compress
$snapshots=0;function Assert-Stable{[void](Assert-Identity);$g=Read-Geometry;if(($g|ConvertTo-Json -Compress)-ne$baselineJson){throw 'nwmain_geometry_drift'};$script:snapshots++}
$clock=[Diagnostics.Stopwatch]::StartNew();$calls=0;$fallbackCalls=0;$changed=0;$lastHash=$null;$stdout=if($streaming){[Console]::OpenStandardOutput()}else{$null};$sha=[Security.Cryptography.SHA256]::Create()
try {
 for($index=0;$index-lt$frameCount;$index++){
  $due=[double]$index*1000/$fps;$wait=$due-$clock.Elapsed.TotalMilliseconds;if($wait-gt0){Start-Sleep -Milliseconds ([int][Math]::Ceiling($wait))}
  if($clock.Elapsed.TotalMilliseconds-gt(($frameCount/$fps+10)*1000)){throw 'nwmain_capture_deadline_exceeded'}
  Assert-Stable
  $bitmap=[Drawing.Bitmap]::new($baseline.windowWidth,$baseline.windowHeight)
  try {
   $graphics=[Drawing.Graphics]::FromImage($bitmap)
   try { $dc=$graphics.GetHdc();try{$ok=[NwmainPerWindowCapture]::PrintWindow($h,$dc,2);$calls++;if(-not$ok){$ok=[NwmainPerWindowCapture]::PrintWindow($h,$dc,0);$calls++;$fallbackCalls++};if(-not$ok){throw 'nwmain_printwindow_failed'}}finally{$graphics.ReleaseHdc($dc)} } finally{$graphics.Dispose()}
   $crop=$bitmap.Clone([Drawing.Rectangle]::new($baseline.offsetX,$baseline.offsetY,$baseline.width,$baseline.height),[Drawing.Imaging.PixelFormat]::Format24bppRgb)
   try {
    $min=765;$max=0;for($y=16;$y-lt($crop.Height-16);$y+=16){for($x=16;$x-lt($crop.Width-16);$x+=16){$c=$crop.GetPixel($x,$y);$v=[int]$c.R+[int]$c.G+[int]$c.B;$min=[Math]::Min($min,$v);$max=[Math]::Max($max,$v)}}
    if(($max-$min)-le12){throw 'nwmain_capture_uniform'}
    Assert-Stable
    $memory=[IO.MemoryStream]::new();try{$crop.Save($memory,[Drawing.Imaging.ImageFormat]::Png);$bytes=$memory.ToArray();if($bytes.Length-gt67108864){throw 'nwmain_frame_too_large'};$hash=[BitConverter]::ToString($sha.ComputeHash($bytes));if($null-ne$lastHash-and$hash-ne$lastHash){$changed++};$lastHash=$hash
     if($streaming){$stdout.Write($bytes,0,$bytes.Length);$stdout.Flush()}else{$file=[IO.FileStream]::new($env:NPW_OUT,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None);try{$file.Write($bytes,0,$bytes.Length)}finally{$file.Dispose()}}
    }finally{$memory.Dispose()}
   }finally{$crop.Dispose()}
  }finally{$bitmap.Dispose()}
 }
 Assert-Stable
} finally { $sha.Dispose();if($stdout){$stdout.Dispose()} }
$receipt=[pscustomobject]@{
 version=$(if($observeAmbient){'aurora-nwmain-printwindow-capture/v2'}else{'aurora-nwmain-printwindow-capture/v1'});ok=$true;status='verified';captureMethod='printwindow';captureId=$env:NPW_CAPTURE_ID;processId=$expectedPid;startedAtUtc=$expectedStart.ToString('o');startTimeMatchedExactly=$true;windowHwnd=$h.ToInt64()
 captureSurface='client';visibleOwnedTopWindowCount=1;modalFreeBeforeCapture=$true;modalFreeAfterRestore=$true;monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};bounds=[pscustomobject]@{left=$baseline.left;top=$baseline.top;width=$baseline.width;height=$baseline.height}
 captureCount=$frameCount;frameCount=$frameCount;printWindowCalls=$calls;fallbackCalls=$fallbackCalls;allFramesNonUniform=$true;changedFrameCount=$changed;captureElapsedMs=$clock.Elapsed.TotalMilliseconds
 foregroundHwndBefore=$foregroundBefore;foregroundHwndAfter=[NwmainPerWindowCapture]::GetForegroundWindow().ToInt64();predecessorHwndBefore=$predecessorBefore;predecessorHwndAfter=[NwmainPerWindowCapture]::GetWindow($h,[NwmainPerWindowCapture]::GW_HWNDPREV).ToInt64();predecessorPidBefore=$predecessorPidBefore;predecessorPidAfter=[int](Read-Pid ([IntPtr]$predecessorBefore))
 restoreWithoutActivation=[pscustomobject]@{requested=$restoreRequested;performed=$restored;iconicBefore=$iconicBefore;iconicAfter=[NwmainPerWindowCapture]::IsIconic($h)}
 geometryMetrics=[pscustomobject]@{frameBorderSize=[pscustomobject]@{width=$baseline.frameBorderWidth;height=$baseline.frameBorderHeight};paddedBorderSize=$baseline.paddedBorderSize;frameTolerance=[pscustomobject]@{x=$baseline.frameToleranceX;y=$baseline.frameToleranceY;cap=$baseline.frameToleranceCap};monitorBounds=[pscustomobject]@{left=$baseline.monitorLeft;top=$baseline.monitorTop;width=$baseline.monitorWidth;height=$baseline.monitorHeight};workingArea=[pscustomobject]@{left=$baseline.workLeft;top=$baseline.workTop;width=$baseline.workWidth;height=$baseline.workHeight}}
 identityObservation=[pscustomobject]@{allStable=$true;snapshotCount=$snapshots}
 acceptance=[pscustomobject]@{level='observation';independentVisualReview='required';freshness='unverified';motionProof=$false;rendererFpsProof=$false}
 safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalMouse=$false;usesGlobalKeyboard=$false;activatesWindow=$false;usesTopmost=$false;changesZOrder=$false;changesWindowGeometry=$false;zOrderRestored=(-not$observeAmbient)}
}
if($observeAmbient){
 $fgChanges=0;$prevChanges=0;for($i=1;$i-lt$ambientSamples.Count;$i++){$a=$ambientSamples[$i-1];$b=$ambientSamples[$i];if($a.foregroundHwnd-ne$b.foregroundHwnd){$fgChanges++};if($a.predecessorHwnd-ne$b.predecessorHwnd-or$a.predecessorPid-ne$b.predecessorPid){$prevChanges++}}
 $last=$ambientSamples[$ambientSamples.Count-1];$receipt.foregroundHwndAfter=$last.foregroundHwnd;$receipt.predecessorHwndAfter=$last.predecessorHwnd;$receipt.predecessorPidAfter=$last.predecessorPid
 $receipt|Add-Member -NotePropertyName ambientWindowPolicy -NotePropertyValue 'observe';$receipt.identityObservation|Add-Member -NotePropertyName scope -NotePropertyValue 'target_window'
 $receipt.safety|Add-Member -NotePropertyName effectsScope -NotePropertyValue 'capture_producer';$receipt.safety|Add-Member -NotePropertyName zOrderRestorationAttempted -NotePropertyValue $false
 $receipt|Add-Member -NotePropertyName ambientWindowObservation -NotePropertyValue ([pscustomobject]@{sampleCount=$ambientSamples.Count;foregroundChangeCount=$fgChanges;predecessorChangeCount=$prevChanges;sampledStateStable=($fgChanges-eq0-and$prevChanges-eq0);caused_by='unverified';samples=$ambientSamples.ToArray()})
}
[IO.File]::WriteAllText($env:NPW_RECEIPT,($receipt|ConvertTo-Json -Depth 7 -Compress),[Text.UTF8Encoding]::new($false))
`; }
