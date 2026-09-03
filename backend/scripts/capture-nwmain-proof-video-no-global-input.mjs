#!/usr/bin/env node

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_PROBE_INTERVAL_MS = 250;
const MAX_DURATION_SECONDS = 90;
const MIN_DURATION_SECONDS = 2;
const MAX_FPS = 30;

await main();

async function main() {
  const [command, ...rawArgs] = process.argv.slice(2);
  const options = parseArgs(rawArgs);
  const allowed = new Set(["pid", "startedAtUtc", "out", "resultOut", "ffmpeg", "durationSeconds", "fps", "probeIntervalMs"]);
  rejectUnknownOptions(options, allowed);

  const out = requiredPath(options.out, "--out");
  const ffmpeg = requiredPath(options.ffmpeg, "--ffmpeg");
  const durationSeconds = boundedNumber(options.durationSeconds, "--durationSeconds", MIN_DURATION_SECONDS, MAX_DURATION_SECONDS);
  const fps = boundedInteger(options.fps, "--fps", 1, MAX_FPS);
  const probeIntervalMs = boundedInteger(options.probeIntervalMs ?? String(DEFAULT_PROBE_INTERVAL_MS), "--probeIntervalMs", 100, 2000);
  const resultOut = options.resultOut ? requiredPath(options.resultOut, "--resultOut") : null;

  if (!existsSync(ffmpeg)) throw new Error(`ffmpeg_missing:${ffmpeg}`);
  if (existsSync(out)) throw new Error(`capture_output_already_exists:${out}`);
  if (resultOut && existsSync(resultOut)) throw new Error(`capture_result_already_exists:${resultOut}`);

  if (command === "dry-run") {
    if (options.pid || options.startedAtUtc || options.resultOut) throw new Error("dry_run_live_identity_options_forbidden");
    print({
      ok: true,
      command,
      status: "nwmain_proof_video_capture_plan_valid",
      captureSource: "physical desktop pixels clipped to the exact owned nwmain client area",
      output: out,
      outputExists: false,
      ffmpeg: mediaRecord(ffmpeg),
      durationSeconds,
      fps,
      probeIntervalMs,
      identityPoll: "exact PID, StartTime, HWND, client bounds, visible-window set, monitor, and 3x3 WindowFromPoint ownership grid",
      startsNwn: false,
      usesGlobalInput: false,
      changesZOrder: false,
      activatesWindow: false,
    });
    return;
  }

  if (command !== "capture") throw new Error("Use: dry-run or capture.");
  const pid = positiveInteger(options.pid, "--pid");
  const startedAtUtc = absoluteUtcInstant(options.startedAtUtc, "--startedAtUtc");
  try {
    const result = await capture({ pid, startedAtUtc, out, ffmpeg, durationSeconds, fps, probeIntervalMs });
    if (resultOut) {
      mkdirSync(dirname(resultOut), { recursive: true });
      writeFileSync(resultOut, `${JSON.stringify(result, null, 2)}\n`);
    }
    print(result);
  } catch (error) {
    rmSync(out, { force: true });
    const failure = {
      version: "aurora-nwmain-proof-video-capture/v1",
      ok: false,
      status: "failed",
      blockerCode: "capture_identity_or_occlusion_drift",
      message: error instanceof Error ? error.message : String(error),
      process: { name: "nwmain", pid, startedAtUtc },
      output: out,
      startsNwn: false,
      usesGlobalInput: false,
      changesZOrder: false,
      activatesWindow: false,
      capturedArtifactPreserved: false,
    };
    if (resultOut) {
      mkdirSync(dirname(resultOut), { recursive: true });
      writeFileSync(resultOut, `${JSON.stringify(failure, null, 2)}\n`);
    }
    print(failure);
    process.exitCode = 2;
  }
}

async function capture({ pid, startedAtUtc, out, ffmpeg, durationSeconds, fps, probeIntervalMs }) {
  const baseline = readCaptureTarget({ pid, startedAtUtc });
  const width = baseline.clientBounds.width - (baseline.clientBounds.width % 2);
  const height = baseline.clientBounds.height - (baseline.clientBounds.height % 2);
  if (width < 640 || height < 480) throw new Error(`nwmain_capture_even_bounds_too_small:${width}x${height}`);
  mkdirSync(dirname(out), { recursive: true });

  const args = [
    "-n",
    "-hide_banner",
    "-loglevel", "error",
    "-f", "gdigrab",
    "-draw_mouse", "0",
    "-framerate", String(fps),
    "-offset_x", String(baseline.clientBounds.left),
    "-offset_y", String(baseline.clientBounds.top),
    "-video_size", `${width}x${height}`,
    "-rtbufsize", "256M",
    "-i", "desktop",
    "-t", formatNumber(durationSeconds),
    "-an",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    out,
  ];

  const startedAt = new Date().toISOString();
  const child = spawn(ffmpeg, args, { cwd: dirname(out), windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-16000); });
  const exited = new Promise((resolveExit, rejectExit) => {
    child.once("error", rejectExit);
    child.once("exit", (code, signal) => resolveExit({ code, signal }));
  });

  const snapshots = [baseline];
  let drift = null;
  const hardDeadline = Date.now() + Math.ceil((durationSeconds + 15) * 1000);
  while (child.exitCode === null && Date.now() < hardDeadline) {
    await delay(probeIntervalMs);
    if (child.exitCode !== null) break;
    try {
      const snapshot = readCaptureTarget({ pid, startedAtUtc });
      assertStableCaptureTarget(baseline, snapshot);
      snapshots.push(snapshot);
    } catch (error) {
      drift = error instanceof Error ? error.message : String(error);
      child.kill();
      break;
    }
  }
  if (child.exitCode === null && !drift) {
    drift = "ffmpeg_capture_deadline_exceeded";
    child.kill();
  }
  const exit = await exited;
  if (drift) throw new Error(`capture_identity_or_occlusion_drift:${drift}`);
  if (exit.code !== 0) throw new Error(`ffmpeg_capture_failed:code=${exit.code}:signal=${exit.signal ?? "none"}:${stderr.slice(-3000)}`);

  const finalSnapshot = readCaptureTarget({ pid, startedAtUtc });
  assertStableCaptureTarget(baseline, finalSnapshot);
  snapshots.push(finalSnapshot);
  const validation = validateVideo(ffmpeg, out, { width, height });
  const finishedAt = new Date().toISOString();

  return {
    version: "aurora-nwmain-proof-video-capture/v1",
    ok: true,
    status: "verified",
    process: { name: "nwmain", pid, startedAtUtc, hwnd: baseline.hwnd, responding: true },
    capture: {
      source: "physical desktop pixels clipped to the exact owned nwmain client area",
      path: out,
      sha256: sha256(out),
      sizeBytes: readFileSync(out).byteLength,
      width,
      height,
      fps,
      requestedDurationSeconds: durationSeconds,
      startedAt,
      finishedAt,
      ffmpeg: mediaRecord(ffmpeg),
      arguments: args,
      validation,
    },
    monitor: baseline.monitor,
    identityObservation: {
      probeIntervalMs,
      snapshotCount: snapshots.length,
      first: summarizeSnapshot(snapshots[0]),
      last: summarizeSnapshot(snapshots.at(-1)),
      allStable: true,
      allProbePointsOwnedByNwmain: true,
    },
    safety: {
      startsNwn: false,
      usesGlobalInput: false,
      usesGlobalCursor: false,
      usesGlobalMouse: false,
      usesGlobalKeyboard: false,
      changesZOrder: false,
      activatesWindow: false,
      changesWindowGeometry: false,
      method: "ffmpeg gdigrab of immutable exact client bounds while independent PID/StartTime/HWND/window-set/monitor/occlusion probes remain stable",
    },
  };
}

function readCaptureTarget({ pid, startedAtUtc }) {
  const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class NwmainProofVideoProbe {
 [StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
 [StructLayout(LayoutKind.Sequential)]public struct P{public int X,Y;}
 public delegate bool EnumWindowsProc(IntPtr hwnd,IntPtr lParam);
 [DllImport("user32.dll")]public static extern bool EnumWindows(EnumWindowsProc callback,IntPtr lParam);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")]public static extern bool GetClientRect(IntPtr h,out R r);
 [DllImport("user32.dll")]public static extern bool ClientToScreen(IntPtr h,ref P p);
 [DllImport("user32.dll")]public static extern IntPtr WindowFromPoint(P p);
 [DllImport("user32.dll")]public static extern IntPtr GetWindow(IntPtr h,uint command);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder text,int count);
}
'@
function Read-Class([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][NwmainProofVideoProbe]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Read-Owner([IntPtr]$h){[uint32]$owner=0;if($h-ne[IntPtr]::Zero){[void][NwmainProofVideoProbe]::GetWindowThreadProcessId($h,[ref]$owner)};$owner}
function Read-VisibleOwnedTopWindows([uint32]$processId){
 $script:windows=@();$script:ownerProcessId=$processId
 [void][NwmainProofVideoProbe]::EnumWindows([NwmainProofVideoProbe+EnumWindowsProc]{param([IntPtr]$window,[IntPtr]$unused)
  if([NwmainProofVideoProbe]::IsWindowVisible($window)-and(Read-Owner $window)-eq$script:ownerProcessId){
   $script:windows += [pscustomobject]@{hwnd=$window.ToInt64();enabled=[NwmainProofVideoProbe]::IsWindowEnabled($window);ownerHwnd=[NwmainProofVideoProbe]::GetWindow($window,4).ToInt64();className=Read-Class $window}
  };$true
 },[IntPtr]::Zero)
 @($script:windows)
}
$expectedProcessId=[int]$env:NPV_PID
$expectedStart=[DateTimeOffset]::Parse($env:NPV_STARTED).UtcDateTime
$all=@(Get-Process nwmain -ErrorAction SilentlyContinue);if($all.Count-ne1){throw "expected_one_nwmain:$($all.Count)"};$process=$all[0]
if($process.Id-ne$expectedProcessId){throw "nwmain_pid_mismatch:$($process.Id)"};if(-not$process.Responding){throw 'nwmain_not_responding'}
$actualStart=$process.StartTime.ToUniversalTime();if([Math]::Abs(($actualStart-$expectedStart).TotalMilliseconds)-gt10){throw "nwmain_start_mismatch:$($actualStart.ToString('o'))"}
$h=[IntPtr]$process.MainWindowHandle;if($h-eq[IntPtr]::Zero-or[NwmainProofVideoProbe]::IsIconic($h)){throw 'nwmain_window_unavailable_or_iconic'}
$visible=@(Read-VisibleOwnedTopWindows ([uint32]$process.Id));if($visible.Count-ne1){throw "expected_one_visible_owned_nwmain_window:$($visible.Count)"}
if($visible[0].hwnd-ne$h.ToInt64()-or-not$visible[0].enabled-or$visible[0].ownerHwnd-ne0-or$visible[0].className-eq'#32770'){throw 'nwmain_modal_or_window_identity_mismatch'}
$client=New-Object 'NwmainProofVideoProbe+R';if(-not[NwmainProofVideoProbe]::GetClientRect($h,[ref]$client)){throw 'nwmain_client_rect_unavailable'}
$topLeft=New-Object 'NwmainProofVideoProbe+P';$topLeft.X=$client.Left;$topLeft.Y=$client.Top
$bottomRight=New-Object 'NwmainProofVideoProbe+P';$bottomRight.X=$client.Right;$bottomRight.Y=$client.Bottom
if(-not[NwmainProofVideoProbe]::ClientToScreen($h,[ref]$topLeft)-or-not[NwmainProofVideoProbe]::ClientToScreen($h,[ref]$bottomRight)){throw 'nwmain_client_to_screen_failed'}
$left=$topLeft.X;$top=$topLeft.Y;$right=$bottomRight.X;$bottom=$bottomRight.Y;$width=$right-$left;$height=$bottom-$top
if($width-lt640-or$height-lt480){throw "nwmain_window_too_small:$($width)x$($height)"}
$screens=@([Windows.Forms.Screen]::AllScreens|Where-Object{-not$_.Primary});if($screens.Count-ne1){throw "expected_one_nonprimary_screen:$($screens.Count)"};$screen=$screens[0];$work=$screen.WorkingArea
if($left-lt$work.Left-or$top-lt$work.Top-or$right-gt$work.Right-or$bottom-gt$work.Bottom){throw 'nwmain_client_outside_nonprimary_working_area'}
$resolved=[Windows.Forms.Screen]::FromHandle($h);if($resolved.Primary-or$resolved.DeviceName-ne$screen.DeviceName){throw 'nwmain_window_not_on_exact_nonprimary_screen'}
$xs=@(($left+16),([int][Math]::Floor(($left+$right)/2)),($right-16));$ys=@(($top+16),([int][Math]::Floor(($top+$bottom)/2)),($bottom-16));$points=@()
foreach($y in $ys){foreach($x in $xs){$point=New-Object 'NwmainProofVideoProbe+P';$point.X=$x;$point.Y=$y;$owner=[int](Read-Owner ([NwmainProofVideoProbe]::WindowFromPoint($point)));$points += [pscustomobject]@{x=$x;y=$y;ownerPid=$owner}}}
if(@($points|Where-Object{$_.ownerPid-ne$expectedProcessId}).Count-ne0){throw ('nwmain_capture_probe_owner_mismatch:'+(@($points|ForEach-Object{$_.ownerPid})-join','))}
[pscustomobject]@{ok=$true;pid=$process.Id;startedAtUtc=$actualStart.ToString('o');hwnd=$h.ToInt64();visibleOwnedTopWindowCount=$visible.Count;clientBounds=[pscustomobject]@{left=$left;top=$top;width=$width;height=$height};probePoints=$points;monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary;workingArea=[pscustomobject]@{left=$work.Left;top=$work.Top;width=$work.Width;height=$work.Height}}}|ConvertTo-Json -Depth 7 -Compress
`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, NPV_PID: String(pid), NPV_STARTED: startedAtUtc },
  });
  const packet = JSON.parse(output.trim());
  if (packet.ok !== true || packet.pid !== pid || packet.hwnd <= 0 || packet.monitor?.primary !== false) throw new Error("nwmain_probe_packet_invalid");
  if (!Array.isArray(packet.probePoints) || packet.probePoints.length !== 9 || packet.probePoints.some((point) => point.ownerPid !== pid)) throw new Error("nwmain_capture_probe_owner_mismatch");
  return packet;
}

function assertStableCaptureTarget(baseline, snapshot) {
  if (snapshot.pid !== baseline.pid || snapshot.hwnd !== baseline.hwnd || snapshot.startedAtUtc !== baseline.startedAtUtc) throw new Error("nwmain_process_or_window_identity_changed");
  if (snapshot.visibleOwnedTopWindowCount !== 1) throw new Error("nwmain_visible_window_set_changed");
  if (JSON.stringify(snapshot.clientBounds) !== JSON.stringify(baseline.clientBounds)) throw new Error("nwmain_client_bounds_changed");
  if (snapshot.monitor?.deviceName !== baseline.monitor?.deviceName || snapshot.monitor?.primary !== false) throw new Error("nwmain_monitor_changed");
  if (snapshot.probePoints.some((point) => point.ownerPid !== baseline.pid)) throw new Error("nwmain_capture_probe_owner_mismatch");
}

function validateVideo(ffmpeg, out, expected) {
  if (!existsSync(out)) throw new Error("nwmain_video_missing");
  const bytes = readFileSync(out);
  if (bytes.length < 10_000) throw new Error(`nwmain_video_too_small:${bytes.length}`);
  const moovOffset = bytes.indexOf(Buffer.from("moov"));
  const mdatOffset = bytes.indexOf(Buffer.from("mdat"));
  if (moovOffset < 0 || mdatOffset < 0 || moovOffset >= mdatOffset) throw new Error(`nwmain_video_not_faststart:moov=${moovOffset}:mdat=${mdatOffset}`);
  const decoded = spawnSync(ffmpeg, ["-hide_banner", "-i", out, "-f", "null", "-"], { encoding: "utf8", windowsHide: true, timeout: 120_000 });
  if (decoded.status !== 0) throw new Error(`nwmain_video_decode_failed:${String(decoded.stderr ?? "").slice(-3000)}`);
  const diagnostics = String(decoded.stderr ?? "");
  if (!/Video:\s+h264/iu.test(diagnostics)) throw new Error("nwmain_video_codec_not_h264");
  const dimensions = new RegExp(`${expected.width}x${expected.height}`, "u");
  if (!dimensions.test(diagnostics)) throw new Error("nwmain_video_dimensions_mismatch");
  return { decode: "verified", codec: "h264", faststart: true, moovOffset, mdatOffset, expectedWidth: expected.width, expectedHeight: expected.height };
}

function summarizeSnapshot(snapshot) {
  return { pid: snapshot.pid, startedAtUtc: snapshot.startedAtUtc, hwnd: snapshot.hwnd, clientBounds: snapshot.clientBounds, probeOwnerPids: snapshot.probePoints.map((point) => point.ownerPid) };
}

function sha256(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function mediaRecord(path) { const bytes = readFileSync(path); return { path, sizeBytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }; }
function delay(milliseconds) { return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds)); }
function formatNumber(value) { return Number(value).toFixed(3); }
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); const name = key.slice(2); if (Object.hasOwn(result, name)) throw new Error(`Duplicate option: --${name}.`); result[name] = value; } return result; }
function rejectUnknownOptions(options, allowed) { for (const key of Object.keys(options)) if (!allowed.has(key)) throw new Error(`Unknown option: --${key}.`); }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function requiredPath(value, name) { return resolve(required(value, name)); }
function positiveInteger(value, name) { const parsed = Number(required(value, name)); if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`); return parsed; }
function boundedInteger(value, name, minimum, maximum) { const parsed = Number(required(value, name)); if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`); return parsed; }
function boundedNumber(value, name, minimum, maximum) { const parsed = Number(required(value, name)); if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${name} must be a number from ${minimum} to ${maximum}.`); return parsed; }
function absoluteUtcInstant(value, name) { const text = required(value, name); if (!text.endsWith("Z") || !Number.isFinite(Date.parse(text))) throw new Error(`${name} must be an absolute UTC instant ending in Z.`); return text; }
