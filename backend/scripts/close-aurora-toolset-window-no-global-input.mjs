#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const timeoutMs = integerFromEnv("AURORA_TOOLSET_CLOSE_TIMEOUT_MS", 15_000);

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
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
}
"@

$timeoutMs = [int]$env:AURORA_TOOLSET_CLOSE_TIMEOUT_MS
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
    if (-not [ToolsetClose]::IsWindowVisible($hwnd)) { return $true }
    [uint32]$windowProcessId = 0
    [void][ToolsetClose]::GetWindowThreadProcessId($hwnd, [ref]$windowProcessId)
    $processName = $null
    try { $processName = (Get-Process -Id $windowProcessId -ErrorAction Stop).ProcessName } catch { $processName = $null }
    if ($processName -eq 'nwtoolset') {
      $windows.Add([pscustomobject]@{
        hwnd = $hwnd.ToInt64()
        processId = $windowProcessId
        title = Get-WindowTextValue $hwnd
        className = Get-ClassNameValue $hwnd
      })
    }
    return $true
  }
  [void][ToolsetClose]::EnumWindows($callback, [IntPtr]::Zero)
  $windows.ToArray()
}

$beforeProcesses = @(Get-Process nwtoolset -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,MainWindowTitle,Responding)
$beforeWindows = @(Get-ToolsetTopWindows)
$moduleFrames = @($beforeWindows | Where-Object { $_.className -eq 'TfrmFrame' -or $_.title -like 'BioWare Aurora Neverwinter Nights Toolset v*' })
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

$afterProcesses = @(Get-Process nwtoolset -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,MainWindowTitle,Responding)
$afterWindows = @(Get-ToolsetTopWindows)
[pscustomobject]@{
  ok = $afterProcesses.Count -eq 0
  blockerCode = if ($afterProcesses.Count -eq 0) { $null } else { 'toolset_close_pending' }
  safety = @{
    usesGlobalCursor = $false
    usesGlobalKeyboard = $false
    usesGlobalMouse = $false
    method = 'targeted WM_CLOSE PostMessage to Toolset frame windows; no force stop'
  }
  timeoutMs = $timeoutMs
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
    AURORA_TOOLSET_CLOSE_TIMEOUT_MS: String(timeoutMs)
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
