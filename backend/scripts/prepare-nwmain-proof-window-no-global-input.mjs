#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const [command, ...rawArgs] = process.argv.slice(2);
const options = parseArgs(rawArgs);
rejectUnknownOptions(options, new Set(["pid", "startedAtUtc"]));
const pid = positiveInteger(options.pid, "--pid");
const startedAtUtc = absoluteUtcInstant(options.startedAtUtc, "--startedAtUtc");

if (command === "dry-run") {
  print({
    ok: true,
    command,
    status: "nwmain_proof_window_prepare_plan_valid",
    expectedProcess: { name: "nwmain", pid, startedAtUtc },
    target: "exactly one non-primary screen working area",
    setWindowPosFlags: ["SWP_NOZORDER", "SWP_NOACTIVATE"],
    startsNwn: false,
    usesGlobalInput: false,
    changesZOrder: false,
    activatesWindow: false,
  });
} else if (command === "prepare") {
  print(prepareProofWindow({ pid, startedAtUtc }));
} else {
  throw new Error("Use: dry-run|prepare --pid <id> --startedAtUtc <Z>.");
}

function prepareProofWindow({ pid, startedAtUtc }) {
  const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Runtime.InteropServices;
public static class NwmainProofWindowPrepare {
 [StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",SetLastError=true)]public static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int cx,int cy,uint flags);
}
'@
function Read-Rect([IntPtr]$h){$r=New-Object 'NwmainProofWindowPrepare+R';if(-not[NwmainProofWindowPrepare]::GetWindowRect($h,[ref]$r)){throw 'nwmain_rect_unavailable'};[pscustomobject]@{left=$r.Left;top=$r.Top;right=$r.Right;bottom=$r.Bottom;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
function Read-Owner([IntPtr]$h){[uint32]$owner=0;[void][NwmainProofWindowPrepare]::GetWindowThreadProcessId($h,[ref]$owner);$owner}
$all=@(Get-Process nwmain -ErrorAction SilentlyContinue);if($all.Count-ne1){throw "expected_one_nwmain:$($all.Count)"};$p=$all[0]
if($p.Id-ne[int]$env:NPW_PID){throw "nwmain_pid_mismatch:$($p.Id)"};if(-not$p.Responding){throw 'nwmain_not_responding'};if($p.MainWindowHandle-eq0){throw 'nwmain_window_unavailable'}
$expected=[DateTimeOffset]::Parse($env:NPW_STARTED).UtcDateTime;$actual=$p.StartTime.ToUniversalTime();if([Math]::Abs(($actual-$expected).TotalMilliseconds)-gt10){throw "nwmain_start_mismatch:actual=$($actual.ToString('o'))"}
$h=[IntPtr]$p.MainWindowHandle;$ownerBefore=Read-Owner $h;if($ownerBefore-ne[uint32]$p.Id){throw "nwmain_window_owner_mismatch:$ownerBefore"}
$screens=@([Windows.Forms.Screen]::AllScreens|Where-Object{-not$_.Primary});if($screens.Count-ne1){throw "expected_one_nonprimary_screen:$($screens.Count)"};$screen=$screens[0];$target=$screen.WorkingArea;$screenBounds=$screen.Bounds
$before=Read-Rect $h
$SWP_NOZORDER=0x0004;$SWP_NOACTIVATE=0x0010;$flags=$SWP_NOZORDER-bor$SWP_NOACTIVATE
if(-not[NwmainProofWindowPrepare]::SetWindowPos($h,[IntPtr]::Zero,$target.Left,$target.Top,$target.Width,$target.Height,$flags)){throw "nwmain_set_window_pos_failed:$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"}
$after=$null;for($attempt=0;$attempt-lt20;$attempt++){Start-Sleep -Milliseconds 50;$after=Read-Rect $h;if($after.left-eq$target.Left-and$after.top-eq$target.Top-and$after.width-eq$target.Width-and$after.height-eq$target.Height){break}}
$current=Get-Process -Id $p.Id -ErrorAction Stop;if($current.ProcessName-ne'nwmain'-or-not$current.Responding-or$current.MainWindowHandle-ne$h){throw 'nwmain_process_or_window_changed'};$currentStart=$current.StartTime.ToUniversalTime();if([Math]::Abs(($currentStart-$expected).TotalMilliseconds)-gt10){throw 'nwmain_start_changed'}
$ownerAfter=Read-Owner $h;if($ownerAfter-ne[uint32]$p.Id){throw "nwmain_window_owner_mismatch:$ownerAfter"}
if($after.left-lt$target.Left-or$after.top-lt$target.Top-or$after.right-gt$target.Right-or$after.bottom-gt$target.Bottom){throw 'nwmain_window_not_inside_proof_screen'}
if($after.left-ne$target.Left-or$after.top-ne$target.Top-or$after.width-ne$target.Width-or$after.height-ne$target.Height){throw 'nwmain_window_target_bounds_mismatch'}
$resolved=[Windows.Forms.Screen]::FromHandle($h);if($resolved.Primary-or$resolved.DeviceName-ne$screen.DeviceName){throw "nwmain_window_not_on_exact_nonprimary_screen:$($resolved.DeviceName):primary=$($resolved.Primary)"}
[pscustomobject]@{ok=$true;status='verified';process=[pscustomobject]@{name='nwmain';pid=$p.Id;startedAtUtc=$actual.ToString('o');responding=$current.Responding};window=[pscustomobject]@{hwnd=$h.ToInt64();ownerPid=$ownerAfter;before=$before;after=$after};monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary;bounds=[pscustomobject]@{left=$screenBounds.Left;top=$screenBounds.Top;width=$screenBounds.Width;height=$screenBounds.Height};workingArea=[pscustomobject]@{left=$target.Left;top=$target.Top;width=$target.Width;height=$target.Height}};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalMouse=$false;usesGlobalKeyboard=$false;changesZOrder=$false;activatesWindow=$false;setWindowPosFlags=@('SWP_NOZORDER','SWP_NOACTIVATE');method='exact PID/start/HWND ownership followed by bounded SetWindowPos to the sole non-primary screen working area'}}|ConvertTo-Json -Depth 8 -Compress
`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, NPW_PID: String(pid), NPW_STARTED: startedAtUtc },
  });
  return JSON.parse(output.trim());
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    result[key.slice(2)] = value;
  }
  return result;
}

function rejectUnknownOptions(options, allowed) {
  for (const key of Object.keys(options)) if (!allowed.has(key)) throw new Error(`Unknown option: --${key}.`);
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required.`);
  return text;
}

function positiveInteger(value, name) {
  const parsed = Number(required(value, name));
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function absoluteUtcInstant(value, name) {
  const text = required(value, name);
  if (!text.endsWith("Z") || !Number.isFinite(Date.parse(text))) throw new Error(`${name} must be an absolute UTC instant ending in Z.`);
  return text;
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
