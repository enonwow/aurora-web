#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const timeoutMs = integerFromEnv("AURORA_TOOLSET_CLOSE_TIMEOUT_MS", 15_000);
const expectedPid = optionalPositiveInteger(options.expectedPid, "--expectedPid");
const expectedStartedAtUtc = optionalIsoDate(options.expectedStartedAtUtc, "--expectedStartedAtUtc");
const expectedFrameHwnd = optionalPositiveInteger(options.expectedFrameHwnd, "--expectedFrameHwnd");
const expectedFrameTitle = options.expectedFrameTitle;
const forceIfNeeded = booleanOption(options.forceIfNeeded, "--forceIfNeeded", false);
const allowHiddenExactFrame = booleanOption(options.allowHiddenExactFrame, "--allowHiddenExactFrame", false);
if (forceIfNeeded && (!expectedPid || !expectedStartedAtUtc || !expectedFrameHwnd || !expectedFrameTitle)) {
  throw new Error("--forceIfNeeded requires --expectedPid, --expectedStartedAtUtc, --expectedFrameHwnd, and --expectedFrameTitle.");
}
if (allowHiddenExactFrame && (!expectedPid || !expectedStartedAtUtc || !expectedFrameHwnd || !expectedFrameTitle)) {
  throw new Error("--allowHiddenExactFrame requires --expectedPid, --expectedStartedAtUtc, --expectedFrameHwnd, and --expectedFrameTitle.");
}

const script = String.raw`
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class ToolsetClose {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
}
"@

$timeoutMs = [int]$env:AURORA_TOOLSET_CLOSE_TIMEOUT_MS
$expectedPid = [int]$env:AURORA_TOOLSET_CLOSE_EXPECTED_PID
$expectedStartText = $env:AURORA_TOOLSET_CLOSE_EXPECTED_STARTED_AT_UTC
$expectedStart = if([string]::IsNullOrWhiteSpace($expectedStartText)){$null}else{[DateTimeOffset]::Parse($expectedStartText).UtcDateTime}
$expectedStartMs = if($null -eq $expectedStart){$null}else{[DateTimeOffset]::new($expectedStart).ToUnixTimeMilliseconds()}
$expectedFrameHwnd = [int64]$env:AURORA_TOOLSET_CLOSE_EXPECTED_FRAME_HWND
$expectedFrameTitle = $env:AURORA_TOOLSET_CLOSE_EXPECTED_FRAME_TITLE
$forceIfNeeded = $env:AURORA_TOOLSET_CLOSE_FORCE_IF_NEEDED -eq 'true'
$allowHiddenExactFrame = $env:AURORA_TOOLSET_CLOSE_ALLOW_HIDDEN_EXACT_FRAME -eq 'true'
$WM_CLOSE = 0x0010

function Get-WindowTextValue([IntPtr]$hwnd) {
  $buffer = New-Object System.Text.StringBuilder 512
  [void][ToolsetClose]::GetWindowText($hwnd, $buffer, $buffer.Capacity)
  $buffer.ToString()
}

function Get-ClassNameValue([IntPtr]$hwnd) {
  $buffer = New-Object System.Text.StringBuilder 256
  [void][ToolsetClose]::GetClassName($hwnd, $buffer, $buffer.Capacity)
  $buffer.ToString()
}

function Get-ToolsetTopWindows {
  $windows = New-Object System.Collections.Generic.List[object]
  $callback = [ToolsetClose+EnumWindowsProc]{
    param([IntPtr]$hwnd, [IntPtr]$lParam)
    [uint32]$windowProcessId = 0
    [void][ToolsetClose]::GetWindowThreadProcessId($hwnd, [ref]$windowProcessId)
    $processName = $null
    try { $processName = (Get-Process -Id $windowProcessId -ErrorAction Stop).ProcessName } catch { $processName = $null }
    if ($processName -eq 'nwtoolset') {
      $visible = [ToolsetClose]::IsWindowVisible($hwnd)
      $className = Get-ClassNameValue $hwnd
      $hiddenExactFrame = -not $visible -and $allowHiddenExactFrame -and $className -eq 'TfrmFrame' -and $hwnd.ToInt64() -eq $expectedFrameHwnd
      if (-not $visible -and -not $hiddenExactFrame) { return $true }
      $windows.Add([pscustomobject]@{
        hwnd = $hwnd.ToInt64()
        processId = $windowProcessId
        title = Get-WindowTextValue $hwnd
        className = $className
        visible = $visible
        iconic = [ToolsetClose]::IsIconic($hwnd)
        hiddenExactFrame = $hiddenExactFrame
      })
    }
    return $true
  }
  [void][ToolsetClose]::EnumWindows($callback, [IntPtr]::Zero)
  $windows.ToArray()
}

$beforeProcesses = @(Get-Process nwtoolset -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,MainWindowTitle,Responding,StartTime)
if ($expectedPid -gt 0 -and ($beforeProcesses.Count -ne 1 -or $beforeProcesses[0].Id -ne $expectedPid)) {
  throw "expected_exact_toolset_pid_mismatch:expected=$expectedPid;actual=$($beforeProcesses | ConvertTo-Json -Compress)"
}
if ($null -ne $expectedStart) {
  $actualStart = $beforeProcesses[0].StartTime.ToUniversalTime()
  $actualStartMs = [DateTimeOffset]::new($actualStart).ToUnixTimeMilliseconds()
  if ($actualStartMs -ne $expectedStartMs) {
    throw "toolset_close_start_mismatch:expected=$($expectedStart.ToString('o'));actual=$($actualStart.ToString('o'))"
  }
}
$beforeWindows = @(Get-ToolsetTopWindows)
$moduleFrames = @($beforeWindows | Where-Object { $_.className -eq 'TfrmFrame' -or $_.title -like 'BioWare Aurora Neverwinter Nights Toolset v*' })
if ($expectedFrameHwnd -gt 0) {
  $exactFrames = @($beforeWindows | Where-Object { $_.className -eq 'TfrmFrame' -and $_.hwnd -eq $expectedFrameHwnd })
  if ($exactFrames.Count -ne 1) {
    throw "toolset_close_frame_hwnd_mismatch:expected=$expectedFrameHwnd;actual=$($beforeWindows | ConvertTo-Json -Compress)"
  }
  if (-not [string]::IsNullOrWhiteSpace($expectedFrameTitle) -and $exactFrames[0].title -cne $expectedFrameTitle) {
    throw "toolset_close_frame_title_mismatch:expected=$expectedFrameTitle;actual=$($exactFrames[0].title)"
  }
  $moduleFrames = @($exactFrames)
}
$posted = @()
foreach ($window in $moduleFrames) {
  [void][ToolsetClose]::PostMessage([IntPtr]$window.hwnd, $WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero)
  $posted += $window
}

$deadline = (Get-Date).AddMilliseconds($timeoutMs)
do {
  Start-Sleep -Milliseconds 500
  $remaining = @(Get-Process nwtoolset -ErrorAction SilentlyContinue)
  if ($remaining.Count -eq 0) { break }
} while ((Get-Date) -lt $deadline)

$forceFallbackUsed = $false
if ($remaining.Count -ne 0 -and $forceIfNeeded) {
  $forceProcesses = @(Get-Process nwtoolset -ErrorAction SilentlyContinue)
  if ($forceProcesses.Count -ne 1 -or $forceProcesses[0].Id -ne $expectedPid) {
    throw "toolset_close_force_process_set_changed:expected=$expectedPid;actual=$($forceProcesses | Select-Object Id,StartTime | ConvertTo-Json -Compress)"
  }
  $forceStart = $forceProcesses[0].StartTime.ToUniversalTime()
  if ([DateTimeOffset]::new($forceStart).ToUnixTimeMilliseconds() -ne $expectedStartMs) {
    throw "toolset_close_force_start_changed:expected=$($expectedStart.ToString('o'));actual=$($forceStart.ToString('o'))"
  }
  $forceWindows = @(Get-ToolsetTopWindows)
  $forceFrames = @($forceWindows | Where-Object { $_.className -eq 'TfrmFrame' })
  $forceModals = @($forceWindows | Where-Object { $_.className -notin @('TfrmFrame','TApplication') })
  if ($forceModals.Count -ne 0) {
    throw "toolset_close_unexpected_modal_before_force:$($forceModals | ConvertTo-Json -Compress)"
  }
  if ($forceFrames.Count -ne 1 -or $forceFrames[0].hwnd -ne $expectedFrameHwnd -or $forceFrames[0].title -cne $expectedFrameTitle) {
    throw "toolset_close_force_frame_changed:$($forceFrames | ConvertTo-Json -Compress)"
  }
  Stop-Process -Id $expectedPid -Force
  $forceFallbackUsed = $true
  $forceDeadline = (Get-Date).AddSeconds(5)
  do {
    Start-Sleep -Milliseconds 100
    $forceRemaining = @(Get-Process nwtoolset -ErrorAction SilentlyContinue)
    if ($forceRemaining.Count -eq 0) { break }
    if ($forceRemaining.Count -ne 1 -or $forceRemaining[0].Id -ne $expectedPid) {
      throw "toolset_close_force_process_set_changed_after:$($forceRemaining.Count)"
    }
    if ([DateTimeOffset]::new($forceRemaining[0].StartTime.ToUniversalTime()).ToUnixTimeMilliseconds() -ne $expectedStartMs) {
      throw 'toolset_close_force_start_changed_after'
    }
  } while ((Get-Date) -lt $forceDeadline)
}

$afterProcesses = @(Get-Process nwtoolset -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,MainWindowTitle,Responding,StartTime)
$afterWindows = @(Get-ToolsetTopWindows)
[pscustomobject]@{
  ok = $afterProcesses.Count -eq 0
  blockerCode = if ($afterProcesses.Count -eq 0) { $null } else { 'toolset_close_pending' }
  safety = @{
    startsToolset = $false
    startsNwn = $false
    usesGlobalInput = $false
    usesGlobalCursor = $false
    usesGlobalKeyboard = $false
    usesGlobalMouse = $false
    usesGlobalMouseWheel = $false
    savesModule = $false
    buildsModule = $false
    changesIniOrMru = $false
    method = if($forceFallbackUsed){'targeted WM_CLOSE PostMessage, bounded wait, then exact PID+StartTime force fallback'}else{'targeted WM_CLOSE PostMessage to Toolset frame windows; no force stop'}
  }
  timeoutMs = $timeoutMs
  expectedPid = if ($expectedPid -gt 0) { $expectedPid } else { $null }
  expectedStartedAtUtc = if($null -ne $expectedStart){$expectedStart.ToString('o')}else{$null}
  expectedFrameHwnd = if($expectedFrameHwnd -gt 0){$expectedFrameHwnd}else{$null}
  expectedFrameTitle = if([string]::IsNullOrWhiteSpace($expectedFrameTitle)){$null}else{$expectedFrameTitle}
  forceFallbackUsed = $forceFallbackUsed
  beforeProcesses = $beforeProcesses
  beforeWindows = $beforeWindows
  postedCloseWindows = $posted
  afterProcesses = $afterProcesses
  afterWindows = $afterWindows
} | ConvertTo-Json -Depth 8
`;

const raw = execFileSync("powershell.exe", ["-NoProfile", "-Command", script], {
  encoding: "utf8",
  env: {
    ...process.env,
    AURORA_TOOLSET_CLOSE_TIMEOUT_MS: String(timeoutMs),
    AURORA_TOOLSET_CLOSE_EXPECTED_PID: String(expectedPid ?? 0),
    AURORA_TOOLSET_CLOSE_EXPECTED_STARTED_AT_UTC: expectedStartedAtUtc ?? "",
    AURORA_TOOLSET_CLOSE_EXPECTED_FRAME_HWND: String(expectedFrameHwnd ?? 0),
    AURORA_TOOLSET_CLOSE_EXPECTED_FRAME_TITLE: expectedFrameTitle ?? "",
    AURORA_TOOLSET_CLOSE_FORCE_IF_NEEDED: String(forceIfNeeded),
    AURORA_TOOLSET_CLOSE_ALLOW_HIDDEN_EXACT_FRAME: String(allowHiddenExactFrame),
  },
  maxBuffer: 1024 * 1024 * 4,
  timeout: timeoutMs + 10_000
}).trim();
console.log(raw);
const parsed = raw ? JSON.parse(raw) : { ok: false };
if (parsed.ok !== true) {
  process.exitCode = 2;
}

function integerFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${name} must be a positive integer, got ${JSON.stringify(raw)}.`);
  }
  return numeric;
}

function parseArgs(argv) {
  const result = {};
  const allowed = new Set(["expectedPid", "expectedStartedAtUtc", "expectedFrameHwnd", "expectedFrameTitle", "forceIfNeeded", "allowHiddenExactFrame"]);
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid:${key ?? "end"}`);
    const name = key.slice(2);
    if (!allowed.has(name)) throw new Error(`unknown:${key}`);
    result[name] = value;
  }
  return result;
}

function optionalPositiveInteger(value, name) {
  if (value === undefined) return undefined;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) throw new Error(`${name} must be a positive integer.`);
  return numeric;
}

function optionalIsoDate(value, name) {
  if (value === undefined) return undefined;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) throw new Error(`${name} must include an explicit UTC offset.`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(`${name} must be an ISO timestamp.`);
  return new Date(milliseconds).toISOString();
}

function booleanOption(value, name, fallback) {
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false.`);
}
