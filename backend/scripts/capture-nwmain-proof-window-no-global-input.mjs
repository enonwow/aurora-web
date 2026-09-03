#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePngBytes } from "./lib/aurora-model-proof-120s-contract.mjs";

const MAX_CAPTURE_COUNT = 1;
const MAX_Z_ORDER_MUTATIONS = 2;

if (isDirectInvocation()) main();

function main() {
  const [command, ...rawArgs] = process.argv.slice(2);
  const options = parseArgs(rawArgs);
  const out = requiredPath(options.out, "--out");

  if (command === "dry-run") {
    rejectUnknownOptions(options, new Set(["out"]));
    print({
      ok: true,
      command,
      out,
      captureSource: "physical pixels of exact owned nwmain client area",
      temporaryZOrderLease: "only when physical ownership probes detect an obscurer",
      zOrderTarget: "HWND_TOP",
      zOrderFlags: ["SWP_NOMOVE", "SWP_NOSIZE", "SWP_NOACTIVATE", "SWP_NOOWNERZORDER", "SWP_NOSENDCHANGING"],
      restoresExactPredecessor: true,
      restoreFailureInvalidatesCapture: true,
      maxCaptureCount: MAX_CAPTURE_COUNT,
      maxZOrderMutations: MAX_Z_ORDER_MUTATIONS,
      usesTopmost: false,
      usesGlobalInput: false,
      activatesWindow: false,
      startsNwn: false,
    });
    return;
  }

  if (command !== "capture") {
    throw new Error("Use: dry-run --out <png>, or capture --pid <id> --startedAtUtc <Z> --out <png> [--resultOut <json>].");
  }
  rejectUnknownOptions(options, new Set(["pid", "startedAtUtc", "out", "resultOut"]));
  const pid = positiveInteger(options.pid, "--pid");
  const startedAtUtc = absoluteUtcInstant(options.startedAtUtc, "--startedAtUtc");
  const resultOut = options.resultOut ? requiredPath(options.resultOut, "--resultOut") : null;
  const result = capture({ pid, startedAtUtc, out });
  if (resultOut) {
    mkdirSync(dirname(resultOut), { recursive: true });
    writeFileSync(resultOut, `${JSON.stringify(result, null, 2)}\n`);
  }
  print(result);
}

function capture({ pid, startedAtUtc, out }) {
  mkdirSync(dirname(out), { recursive: true });
  rmSync(out, { force: true });
  const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class NwmainProofCapture {
 public const uint GW_HWNDPREV=3;public const uint GW_OWNER=4;
 [StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
 [StructLayout(LayoutKind.Sequential)]public struct P{public int X,Y;}
 public delegate bool EnumWindowsProc(IntPtr hwnd,IntPtr lParam);
 [DllImport("user32.dll")]public static extern bool EnumWindows(EnumWindowsProc callback,IntPtr lParam);
 [DllImport("user32.dll")]public static extern bool IsWindow(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll")]public static extern bool GetClientRect(IntPtr h,out R r);
 [DllImport("user32.dll")]public static extern bool ClientToScreen(IntPtr h,ref P p);
 [DllImport("user32.dll")]public static extern IntPtr WindowFromPoint(P p);
 [DllImport("user32.dll")]public static extern IntPtr GetWindow(IntPtr h,uint command);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder text,int count);
 [DllImport("user32.dll",SetLastError=true)]public static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int width,int height,uint flags);
}
'@

$expectedPid=[int]$env:NPC_PID
$expectedStart=[DateTimeOffset]::Parse($env:NPC_STARTED).UtcDateTime
$outPath=$env:NPC_OUT
$HWND_TOP=[IntPtr]::Zero
$SWP_NOMOVE=0x0002
$SWP_NOSIZE=0x0001
$SWP_NOACTIVATE=0x0010
$SWP_NOOWNERZORDER=0x0200
$SWP_NOSENDCHANGING=0x0400
$zOrderFlags=$SWP_NOMOVE-bor$SWP_NOSIZE-bor$SWP_NOACTIVATE-bor$SWP_NOOWNERZORDER-bor$SWP_NOSENDCHANGING

function Read-Rect([IntPtr]$h){$r=New-Object 'NwmainProofCapture+R';if(-not[NwmainProofCapture]::GetWindowRect($h,[ref]$r)){throw 'nwmain_rect_unavailable'};$r}
function Read-ClientScreenRect([IntPtr]$h){
  $client=New-Object 'NwmainProofCapture+R';if(-not[NwmainProofCapture]::GetClientRect($h,[ref]$client)){throw 'nwmain_client_rect_unavailable'}
  $topLeft=New-Object 'NwmainProofCapture+P';$topLeft.X=$client.Left;$topLeft.Y=$client.Top
  $bottomRight=New-Object 'NwmainProofCapture+P';$bottomRight.X=$client.Right;$bottomRight.Y=$client.Bottom
  if(-not[NwmainProofCapture]::ClientToScreen($h,[ref]$topLeft)-or-not[NwmainProofCapture]::ClientToScreen($h,[ref]$bottomRight)){throw 'nwmain_client_to_screen_failed'}
  $result=New-Object 'NwmainProofCapture+R';$result.Left=$topLeft.X;$result.Top=$topLeft.Y;$result.Right=$bottomRight.X;$result.Bottom=$bottomRight.Y;$result
}
function Read-Class([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][NwmainProofCapture]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Read-WindowPid([IntPtr]$h){[uint32]$owner=0;if($h-ne[IntPtr]::Zero){[void][NwmainProofCapture]::GetWindowThreadProcessId($h,[ref]$owner)};$owner}
function Read-OwnedVisibleTopWindows([uint32]$processId){
  $script:npcWindows=@();$script:npcPid=$processId
  [void][NwmainProofCapture]::EnumWindows([NwmainProofCapture+EnumWindowsProc]{param([IntPtr]$window,[IntPtr]$unused)
    if([NwmainProofCapture]::IsWindowVisible($window)-and(Read-WindowPid $window)-eq$script:npcPid){
      $script:npcWindows += [pscustomobject]@{hwnd=$window.ToInt64();enabled=[NwmainProofCapture]::IsWindowEnabled($window);ownerHwnd=[NwmainProofCapture]::GetWindow($window,[NwmainProofCapture]::GW_OWNER).ToInt64();className=Read-Class $window}
    };$true
  },[IntPtr]::Zero)
  @($script:npcWindows)
}
function Assert-ExactIdentity([IntPtr]$expectedHwnd){
  $all=@(Get-Process nwmain -ErrorAction SilentlyContinue);if($all.Count-ne1){throw "expected_one_nwmain:$($all.Count)"};$process=$all[0]
  if($process.Id-ne$expectedPid){throw "nwmain_pid_mismatch:$($process.Id)"};if(-not$process.Responding){throw 'nwmain_not_responding'}
  $actualStart=$process.StartTime.ToUniversalTime();if($actualStart.Ticks-ne$expectedStart.Ticks){throw "nwmain_start_mismatch:actual=$($actualStart.ToString('o'))"}
  if($process.MainWindowHandle-eq0-or($expectedHwnd-ne[IntPtr]::Zero-and$process.MainWindowHandle-ne$expectedHwnd)){throw 'nwmain_hwnd_mismatch'}
  $visible=@(Read-OwnedVisibleTopWindows ([uint32]$process.Id));if($visible.Count-ne1){throw "expected_one_visible_owned_nwmain_window:$($visible.Count)"}
  if($visible[0].hwnd-ne$process.MainWindowHandle.ToInt64()-or-not$visible[0].enabled-or$visible[0].ownerHwnd-ne0-or$visible[0].className-eq'#32770'){throw 'nwmain_modal_or_window_identity_mismatch'}
  [pscustomobject]@{process=$process;startedAtUtc=$actualStart.ToString('o');hwnd=[IntPtr]$process.MainWindowHandle;visibleCount=$visible.Count}
}
function Read-ProbeOwners($points){
  $owners=@();foreach($xy in $points){$point=New-Object 'NwmainProofCapture+P';$point.X=$xy[0];$point.Y=$xy[1];$owners += [int](Read-WindowPid ([NwmainProofCapture]::WindowFromPoint($point)))};@($owners)
}
function Test-AllProbeOwners($owners,[int]$ownerPid){@($owners|Where-Object{$_-ne$ownerPid}).Count-eq0}
function Set-TargetZOrder([IntPtr]$target,[IntPtr]$insertAfter){
  if(-not[NwmainProofCapture]::SetWindowPos($target,$insertAfter,0,0,0,0,$zOrderFlags)){throw "nwmain_set_zorder_failed:$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"}
}

$identity=Assert-ExactIdentity ([IntPtr]::Zero)
$p=$identity.process
$h=$identity.hwnd
$actualStart=$p.StartTime.ToUniversalTime()
$screens=@([Windows.Forms.Screen]::AllScreens|Where-Object{-not$_.Primary});if($screens.Count-ne1){throw "expected_one_nonprimary_screen:$($screens.Count)"};$screen=$screens[0];$b=$screen.Bounds;$work=$screen.WorkingArea;$windowR=Read-Rect $h;$r=Read-ClientScreenRect $h
if($windowR.Left-lt$work.Left-or$windowR.Top-lt$work.Top-or$windowR.Right-gt$work.Right-or$windowR.Bottom-gt$work.Bottom){throw 'nwmain_window_outside_working_area'}
if($r.Left-lt$windowR.Left-or$r.Top-lt$windowR.Top-or$r.Right-gt$windowR.Right-or$r.Bottom-gt$windowR.Bottom-or$r.Left-lt$work.Left-or$r.Top-lt$work.Top-or$r.Right-gt$work.Right-or$r.Bottom-gt$work.Bottom){throw 'nwmain_client_bounds_invalid'}
$width=$r.Right-$r.Left;$height=$r.Bottom-$r.Top;if($width-lt640-or$height-lt480){throw ('nwmain_window_too_small:'+$width+'x'+$height)}
$points=@(@([int]($r.Left+16),[int]($r.Top+16)),@([int][Math]::Floor(($r.Left+$r.Right)/2),[int][Math]::Floor(($r.Top+$r.Bottom)/2)),@([int]($r.Right-16),[int]($r.Bottom-16)))
$probePoints=@($points|ForEach-Object{[pscustomobject]@{x=[int]$_[0];y=[int]$_[1]}})
$initialProbeOwners=@(Read-ProbeOwners $points)
$leaseRequired=-not(Test-AllProbeOwners $initialProbeOwners $expectedPid)
$predecessor=[NwmainProofCapture]::GetWindow($h,[NwmainProofCapture]::GW_HWNDPREV)
$predecessorPid=[int](Read-WindowPid $predecessor)
$postLiftProbeOwners=@($initialProbeOwners)
$captureProbeOwners=@()
$zOrderMutationCount=0
$captureCount=0
$lifted=$false
$restoreAttempted=$false
$restoreSucceeded=-not$leaseRequired
$predecessorAfterRestore=if($leaseRequired){-1}else{$predecessor.ToInt64()}
$predecessorPidAfterRestore=if($leaseRequired){-1}else{$predecessorPid}
$primaryError=$null
$restoreError=$null

try {
  if($leaseRequired){
    if($predecessor-eq[IntPtr]::Zero-or-not[NwmainProofCapture]::IsWindow($predecessor)){throw 'nwmain_zorder_predecessor_unavailable'}
    Set-TargetZOrder $h $HWND_TOP
    $zOrderMutationCount++
    $lifted=$true
    for($attempt=0;$attempt-lt20;$attempt++){
      Start-Sleep -Milliseconds 25
      $check=Assert-ExactIdentity $h
      $postLiftProbeOwners=@(Read-ProbeOwners $points)
      if(Test-AllProbeOwners $postLiftProbeOwners $expectedPid){break}
    }
    if(-not(Test-AllProbeOwners $postLiftProbeOwners $expectedPid)){throw ('nwmain_zorder_lift_not_unobscured:'+($postLiftProbeOwners-join','))}
  }
  $check=Assert-ExactIdentity $h
  $captureProbeOwners=@(Read-ProbeOwners $points)
  if(-not(Test-AllProbeOwners $captureProbeOwners $expectedPid)){throw ('nwmain_window_obscured_before_capture:'+($captureProbeOwners-join','))}
  if($captureCount-ne0){throw 'nwmain_second_capture_forbidden'}
  $bitmap=[Drawing.Bitmap]::new($width,$height)
  try {
    $graphics=[Drawing.Graphics]::FromImage($bitmap)
    try {$graphics.CopyFromScreen($r.Left,$r.Top,0,0,$bitmap.Size,[Drawing.CopyPixelOperation]::SourceCopy);$captureCount++}
    finally {$graphics.Dispose()}
    $min=765;$max=0;for($y=16;$y-lt($bitmap.Height-16);$y+=16){for($x=16;$x-lt($bitmap.Width-16);$x+=16){$colour=$bitmap.GetPixel($x,$y);$value=[int]$colour.R+[int]$colour.G+[int]$colour.B;$min=[Math]::Min($min,$value);$max=[Math]::Max($max,$value)}}
    if(($max-$min)-le12){throw 'nwmain_capture_uniform'}
    $bitmap.Save($outPath,[Drawing.Imaging.ImageFormat]::Png)
  } finally {$bitmap.Dispose()}
} catch {
  $primaryError=$_.Exception.Message
} finally {
  if($lifted){
    $restoreAttempted=$true
    try {
      if(-not[NwmainProofCapture]::IsWindow($h)-or(Read-WindowPid $h)-ne[uint32]$expectedPid){throw 'target_identity_changed_before_restore'}
      if(-not[NwmainProofCapture]::IsWindow($predecessor)-or(Read-WindowPid $predecessor)-ne[uint32]$predecessorPid){throw 'predecessor_identity_changed_before_restore'}
      Set-TargetZOrder $h $predecessor
      $zOrderMutationCount++
      for($attempt=0;$attempt-lt20;$attempt++){Start-Sleep -Milliseconds 25;$predecessorAfterRestore=[NwmainProofCapture]::GetWindow($h,[NwmainProofCapture]::GW_HWNDPREV).ToInt64();if($predecessorAfterRestore-eq$predecessor.ToInt64()){break}}
      if($predecessorAfterRestore-ne$predecessor.ToInt64()){throw "predecessor_restore_readback_mismatch:$predecessorAfterRestore"}
      $predecessorPidAfterRestore=[int](Read-WindowPid ([IntPtr]$predecessorAfterRestore));if($predecessorPidAfterRestore-ne$predecessorPid){throw "predecessor_restore_pid_mismatch:$predecessorPidAfterRestore"}
      $restoredIdentity=Assert-ExactIdentity $h
      $restoreSucceeded=$true
    } catch {$restoreError=$_.Exception.Message;$restoreSucceeded=$false}
  }
}

if($primaryError-or$restoreError){if(Test-Path -LiteralPath $outPath){Remove-Item -LiteralPath $outPath -Force};if($restoreError){throw "nwmain_zorder_restore_failed:$restoreError"};throw $primaryError}
if($captureCount-ne1){if(Test-Path -LiteralPath $outPath){Remove-Item -LiteralPath $outPath -Force};throw "nwmain_capture_count_invalid:$captureCount"}
$finalIdentity=Assert-ExactIdentity $h

[pscustomobject]@{
  ok=$true;status='verified';processId=$p.Id;startedAtUtc=$actualStart.ToString('o');startTimeMatchedExactly=$true;windowHwnd=$h.ToInt64();title=$p.MainWindowTitle
  identitySnapshot=[pscustomobject]@{processId=$p.Id;startedAtUtc=$actualStart.ToString('o');windowHwnd=$h.ToInt64()}
  visibleOwnedTopWindowCount=$finalIdentity.visibleCount;modalFreeBeforeCapture=$true;modalFreeAfterRestore=$true
  captureSurface='client';windowBounds=[pscustomobject]@{left=$windowR.Left;top=$windowR.Top;width=$windowR.Right-$windowR.Left;height=$windowR.Bottom-$windowR.Top}
  bounds=[pscustomobject]@{left=$r.Left;top=$r.Top;width=$width;height=$height};monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary;bounds=[pscustomobject]@{left=$b.Left;top=$b.Top;width=$b.Width;height=$b.Height};workingArea=[pscustomobject]@{left=$work.Left;top=$work.Top;width=$work.Width;height=$work.Height}};pngPath=$outPath;captureCount=$captureCount
  zOrderLease=[pscustomobject]@{
    required=$leaseRequired;lifted=$lifted;probePoints=@($probePoints);initialProbeOwners=@($initialProbeOwners);postLiftProbeOwners=@($postLiftProbeOwners);captureProbeOwners=@($captureProbeOwners)
    originalPredecessor=[pscustomobject]@{hwnd=$predecessor.ToInt64();pid=$predecessorPid};zOrderMutationCount=$zOrderMutationCount
    lift=[pscustomobject]@{target='HWND_TOP';usesTopmost=$false;activatesWindow=$false;flags=@('SWP_NOMOVE','SWP_NOSIZE','SWP_NOACTIVATE','SWP_NOOWNERZORDER','SWP_NOSENDCHANGING')}
    restore=[pscustomobject]@{required=$leaseRequired;attempted=$restoreAttempted;succeeded=$restoreSucceeded;predecessorHwndAfter=$predecessorAfterRestore;predecessorPidAfter=$predecessorPidAfterRestore;processIdentityUnchanged=$true;windowIdentityUnchanged=$true;modalFree=$true}
  }
  safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalMouse=$false;usesGlobalKeyboard=$false;activatesWindow=$false;usesTopmost=$false;changesWindowGeometry=$false;temporaryZOrderLease=$lifted;zOrderRestored=$restoreSucceeded;method='exact PID/start/HWND physical CopyFromScreen with an optional bounded HWND_TOP no-activate lease and exact predecessor restore'}
}|ConvertTo-Json -Depth 9 -Compress
`;

  let output;
  try {
    output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, NPC_PID: String(pid), NPC_STARTED: startedAtUtc, NPC_OUT: out },
    });
  } catch (error) {
    rmSync(out, { force: true });
    throw error;
  }
  try {
    const packet = JSON.parse(output.trim());
    validateLeaseEvidence(packet, { pid, startedAtUtc });
    const bytes = readFileSync(out);
    validatePngBytes(bytes);
    return {
      ...packet,
      pngBytes: bytes.length,
      pngSha256: createHash("sha256").update(bytes).digest("hex"),
      capturedAtUtc: new Date().toISOString(),
    };
  } catch (error) {
    rmSync(out, { force: true });
    throw error;
  }
}

export function validateLeaseEvidence(packet, { pid, startedAtUtc }) {
  if (packet?.ok !== true || packet.status !== "verified") throw new Error("nwmain_capture_packet_invalid");
  if (packet.processId !== pid) throw new Error("nwmain_capture_pid_mismatch");
  if (packet.startedAtUtc !== startedAtUtc || packet.startTimeMatchedExactly !== true) throw new Error("nwmain_capture_start_mismatch");
  if (!Number.isSafeInteger(packet.windowHwnd) || packet.windowHwnd <= 0) throw new Error("nwmain_capture_hwnd_invalid");
  if (packet.identitySnapshot?.processId !== packet.processId || packet.identitySnapshot?.startedAtUtc !== packet.startedAtUtc || packet.identitySnapshot?.windowHwnd !== packet.windowHwnd) throw new Error("nwmain_capture_identity_snapshot_mismatch");
  if (packet.visibleOwnedTopWindowCount !== 1 || packet.modalFreeBeforeCapture !== true || packet.modalFreeAfterRestore !== true) throw new Error("nwmain_capture_modal_or_window_set_invalid");
  validateCaptureSurfaceEvidence(packet);
  if (packet.captureCount !== MAX_CAPTURE_COUNT) throw new Error("nwmain_capture_count_invalid");
  const lease = packet.zOrderLease;
  if (!lease || !Array.isArray(lease.initialProbeOwners) || !Array.isArray(lease.postLiftProbeOwners) || !Array.isArray(lease.captureProbeOwners)) throw new Error("nwmain_zorder_lease_evidence_missing");
  if (lease.captureProbeOwners.length !== 3 || lease.captureProbeOwners.some((owner) => owner !== pid)) throw new Error("nwmain_capture_probe_owner_mismatch");
  if (lease.lift?.target !== "HWND_TOP" || lease.lift.usesTopmost !== false || lease.lift.activatesWindow !== false) throw new Error("nwmain_zorder_lift_contract_invalid");
  const expectedFlags = ["SWP_NOMOVE", "SWP_NOSIZE", "SWP_NOACTIVATE", "SWP_NOOWNERZORDER", "SWP_NOSENDCHANGING"];
  if (JSON.stringify(lease.lift.flags) !== JSON.stringify(expectedFlags)) throw new Error("nwmain_zorder_lift_flags_invalid");
  if (packet.safety?.usesGlobalCursor !== false || packet.safety?.usesGlobalMouse !== false || packet.safety?.usesGlobalKeyboard !== false || packet.safety?.activatesWindow !== false || packet.safety?.usesTopmost !== false) throw new Error("nwmain_capture_safety_invalid");
  if (lease.required === true) {
    if (lease.lifted !== true || !Number.isSafeInteger(lease.originalPredecessor?.hwnd) || lease.originalPredecessor.hwnd <= 0) throw new Error("nwmain_zorder_predecessor_invalid");
    if (lease.initialProbeOwners.every((owner) => owner === pid) || lease.postLiftProbeOwners.length !== 3 || lease.postLiftProbeOwners.some((owner) => owner !== pid)) throw new Error("nwmain_zorder_lift_probe_invalid");
    if (lease.zOrderMutationCount !== MAX_Z_ORDER_MUTATIONS) throw new Error("nwmain_zorder_mutation_count_invalid");
    if (lease.restore?.required !== true || lease.restore.attempted !== true || lease.restore.succeeded !== true) throw new Error("nwmain_zorder_restore_failed");
    if (lease.restore.predecessorHwndAfter !== lease.originalPredecessor.hwnd || lease.restore.predecessorPidAfter !== lease.originalPredecessor.pid) throw new Error("nwmain_zorder_predecessor_restore_mismatch");
    if (lease.restore.processIdentityUnchanged !== true || lease.restore.windowIdentityUnchanged !== true || lease.restore.modalFree !== true) throw new Error("nwmain_zorder_restore_identity_invalid");
    if (packet.safety.temporaryZOrderLease !== true || packet.safety.zOrderRestored !== true) throw new Error("nwmain_zorder_safety_readback_invalid");
  } else {
    if (lease.lifted !== false || lease.zOrderMutationCount !== 0 || lease.initialProbeOwners.length !== 3 || lease.initialProbeOwners.some((owner) => owner !== pid)) throw new Error("nwmain_unneeded_zorder_mutation");
    if (lease.restore?.required !== false || lease.restore.attempted !== false || lease.restore.succeeded !== true) throw new Error("nwmain_no_lease_restore_contract_invalid");
    if (packet.safety.temporaryZOrderLease !== false || packet.safety.zOrderRestored !== true) throw new Error("nwmain_no_lease_safety_invalid");
  }
  return packet;
}

function validateCaptureSurfaceEvidence(packet) {
  const rect = (value, code) => {
    if (![value?.left, value?.top, value?.width, value?.height].every(Number.isSafeInteger) || value.width <= 0 || value.height <= 0) throw new Error(code);
    return { ...value, right: value.left + value.width, bottom: value.top + value.height };
  };
  if (packet.captureSurface !== "client") throw new Error("nwmain_capture_surface_invalid");
  const windowBounds = rect(packet.windowBounds, "nwmain_window_bounds_invalid");
  const clientBounds = rect(packet.bounds, "nwmain_client_bounds_invalid");
  const workingArea = rect(packet.monitor?.workingArea, "nwmain_working_area_invalid");
  if (packet.monitor?.primary !== false) throw new Error("nwmain_capture_monitor_invalid");
  if (windowBounds.left < workingArea.left || windowBounds.top < workingArea.top || windowBounds.right > workingArea.right || windowBounds.bottom > workingArea.bottom) throw new Error("nwmain_window_outside_working_area");
  if (clientBounds.left < windowBounds.left || clientBounds.top < windowBounds.top || clientBounds.right > windowBounds.right || clientBounds.bottom > windowBounds.bottom) throw new Error("nwmain_client_bounds_invalid");
  const points = packet.zOrderLease?.probePoints;
  if (!Array.isArray(points) || points.length !== 3) throw new Error("nwmain_probe_points_invalid");
  const expected = [
    { x: clientBounds.left + 16, y: clientBounds.top + 16 },
    { x: Math.floor((clientBounds.left + clientBounds.right) / 2), y: Math.floor((clientBounds.top + clientBounds.bottom) / 2) },
    { x: clientBounds.right - 16, y: clientBounds.bottom - 16 },
  ];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!Number.isSafeInteger(point?.x) || !Number.isSafeInteger(point?.y) || point.x <= clientBounds.left || point.y <= clientBounds.top || point.x >= clientBounds.right || point.y >= clientBounds.bottom) throw new Error("nwmain_probe_point_outside_client");
    if (point.x !== expected[index].x || point.y !== expected[index].y) throw new Error("nwmain_probe_point_geometry_mismatch");
  }
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    const name = key.slice(2);
    if (Object.hasOwn(result, name)) throw new Error(`Duplicate option: --${name}.`);
    result[name] = value;
  }
  return result;
}
function rejectUnknownOptions(options, allowed) { for (const key of Object.keys(options)) if (!allowed.has(key)) throw new Error(`Unknown option: --${key}.`); }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function requiredPath(value, name) { return resolve(required(value, name)); }
function positiveInteger(value, name) { const parsed = Number(required(value, name)); if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`); return parsed; }
function absoluteUtcInstant(value, name) { const text = required(value, name); if (!text.endsWith("Z") || !Number.isFinite(Date.parse(text))) throw new Error(`${name} must be an absolute UTC instant ending in Z.`); return text; }
function isDirectInvocation() { return process.argv[1] ? resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url)) : false; }
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
