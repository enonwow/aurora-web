#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const defaultOutDir = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "areas-runtime-capture"
);

const titleContains =
  readArg("--titleContains") ?? process.env.AURORA_TOOLSET_CAPTURE_TITLE_CONTAINS ?? "codex_writer";
const outputPath = resolveMaybeAbsolute(
  readArg("--out") ??
    `${defaultOutDir}/toolset-topmost-screen-capture-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.png`
);
const settleMs = integerArg("--settleMs", 2000);
const moveToPrimary =
  readArg("--moveToPrimary") === "1" || process.env.AURORA_TOOLSET_CAPTURE_MOVE_TO_PRIMARY === "1";
const minimizeInterferingWindows =
  readArg("--minimizeInterferingWindows") === "1" ||
  process.env.AURORA_TOOLSET_CAPTURE_MINIMIZE_INTERFERING_WINDOWS === "1";

mkdirSync(dirname(outputPath), { recursive: true });

const script = String.raw`
$ErrorActionPreference = 'Stop'
$TitleContains = $env:AURORA_TOOLSET_CAPTURE_TITLE_CONTAINS
$OutputPath = $env:AURORA_TOOLSET_CAPTURE_OUTPUT_PATH
$SettleMs = [int]$env:AURORA_TOOLSET_CAPTURE_SETTLE_MS
$MoveToPrimary = $env:AURORA_TOOLSET_CAPTURE_MOVE_TO_PRIMARY -eq '1'
$MinimizeInterferingWindows = $env:AURORA_TOOLSET_CAPTURE_MINIMIZE_INTERFERING_WINDOWS -eq '1'
if ([string]::IsNullOrWhiteSpace($TitleContains)) {
  throw 'AURORA_TOOLSET_CAPTURE_TITLE_CONTAINS is required.'
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  throw 'AURORA_TOOLSET_CAPTURE_OUTPUT_PATH is required.'
}
Add-Type -AssemblyName System.Drawing
$code = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class ToolsetTopmostCapture {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr SetActiveWindow(IntPtr hWnd);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  public static string Text(IntPtr h) { var sb = new StringBuilder(512); GetWindowText(h, sb, 512); return sb.ToString(); }
  public static bool Intersects(RECT a, RECT b) {
    return a.Left < b.Right && a.Right > b.Left && a.Top < b.Bottom && a.Bottom > b.Top;
  }
}
'@
Add-Type $code -ErrorAction SilentlyContinue

$process = Get-Process nwtoolset -ErrorAction Stop | Select-Object -First 1
$target = [IntPtr]::Zero
[ToolsetTopmostCapture]::EnumWindows({
  param($hwnd, $lparam)
  $windowProcessId = 0
  [void][ToolsetTopmostCapture]::GetWindowThreadProcessId($hwnd, [ref]$windowProcessId)
  $title = [ToolsetTopmostCapture]::Text($hwnd)
  if ($windowProcessId -eq $process.Id -and
      [ToolsetTopmostCapture]::IsWindowVisible($hwnd) -and
      $title -like "*$TitleContains*") {
    $script:target = $hwnd
    return $false
  }
  return $true
}, [IntPtr]::Zero) | Out-Null

if ($target -eq [IntPtr]::Zero) {
  throw "Toolset window matching '$TitleContains' was not found."
}

$HWND_TOPMOST = [IntPtr](-1)
$HWND_NOTOPMOST = [IntPtr](-2)
$SWP_NOMOVE = 0x0002
$SWP_NOSIZE = 0x0001
$SWP_SHOWWINDOW = 0x0040
$rect = New-Object ToolsetTopmostCapture+RECT
$originalRect = New-Object ToolsetTopmostCapture+RECT
$interferingWindows = @()

try {
  [void][ToolsetTopmostCapture]::ShowWindow($target, 9)
  [void][ToolsetTopmostCapture]::GetWindowRect($target, [ref]$originalRect)
  $originalWidth = $originalRect.Right - $originalRect.Left
  $originalHeight = $originalRect.Bottom - $originalRect.Top
  $moveFlags = $SWP_SHOWWINDOW
  $targetX = $originalRect.Left
  $targetY = $originalRect.Top
  $targetWidth = $originalWidth
  $targetHeight = $originalHeight
  if ($MoveToPrimary) {
    $targetX = 40
    $targetY = 40
  } else {
    $moveFlags = $moveFlags -bor $SWP_NOMOVE -bor $SWP_NOSIZE
    $targetWidth = 0
    $targetHeight = 0
  }
  [void][ToolsetTopmostCapture]::SetWindowPos(
    $target,
    $HWND_TOPMOST,
    $targetX,
    $targetY,
    $targetWidth,
    $targetHeight,
    $moveFlags
  )
  [void][ToolsetTopmostCapture]::BringWindowToTop($target)
  [void][ToolsetTopmostCapture]::SetActiveWindow($target)
  [void][ToolsetTopmostCapture]::SetForegroundWindow($target)
  [void][ToolsetTopmostCapture]::GetWindowRect($target, [ref]$rect)
  if ($MinimizeInterferingWindows) {
    [ToolsetTopmostCapture]::EnumWindows({
      param($hwnd, $lparam)
      if ($hwnd -eq $script:target) {
        return $true
      }
      if (-not [ToolsetTopmostCapture]::IsWindowVisible($hwnd)) {
        return $true
      }
      if ([ToolsetTopmostCapture]::IsIconic($hwnd)) {
        return $true
      }
      $title = [ToolsetTopmostCapture]::Text($hwnd)
      if ([string]::IsNullOrWhiteSpace($title)) {
        return $true
      }
      $otherRect = New-Object ToolsetTopmostCapture+RECT
      if (-not [ToolsetTopmostCapture]::GetWindowRect($hwnd, [ref]$otherRect)) {
        return $true
      }
      $otherWidth = $otherRect.Right - $otherRect.Left
      $otherHeight = $otherRect.Bottom - $otherRect.Top
      if ($otherWidth -le 1 -or $otherHeight -le 1) {
        return $true
      }
      if ([ToolsetTopmostCapture]::Intersects($script:rect, $otherRect)) {
        $windowProcessId = 0
        [void][ToolsetTopmostCapture]::GetWindowThreadProcessId($hwnd, [ref]$windowProcessId)
        $script:interferingWindows += [pscustomobject]@{
          hwnd = $hwnd
          processId = $windowProcessId
          title = $title
        }
        [void][ToolsetTopmostCapture]::ShowWindow($hwnd, 6)
      }
      return $true
    }, [IntPtr]::Zero) | Out-Null
    [void][ToolsetTopmostCapture]::BringWindowToTop($target)
    [void][ToolsetTopmostCapture]::SetForegroundWindow($target)
  }
  Start-Sleep -Milliseconds $SettleMs
  [void][ToolsetTopmostCapture]::GetWindowRect($target, [ref]$rect)
  $width = $rect.Right - $rect.Left
  $height = $rect.Bottom - $rect.Top
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen(
    $rect.Left,
    $rect.Top,
    0,
    0,
    (New-Object System.Drawing.Size $width, $height)
  )
  $graphics.Dispose()
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
} finally {
  foreach ($window in $interferingWindows) {
    [void][ToolsetTopmostCapture]::ShowWindow($window.hwnd, 9)
  }
  if ($MoveToPrimary) {
    [void][ToolsetTopmostCapture]::SetWindowPos(
      $target,
      $HWND_TOPMOST,
      $originalRect.Left,
      $originalRect.Top,
      $originalWidth,
      $originalHeight,
      $SWP_SHOWWINDOW
    )
  }
  [void][ToolsetTopmostCapture]::SetWindowPos(
    $target,
    $HWND_NOTOPMOST,
    0,
    0,
    0,
    0,
    $SWP_NOMOVE -bor $SWP_NOSIZE
  )
}

[pscustomobject]@{
  ok = $true
  safety = [pscustomobject]@{
    usesGlobalCursor = $false
    usesGlobalKeyboard = $false
    usesGlobalMouse = $false
    method = 'Temporarily raise the Toolset window topmost, copy screen pixels, then remove topmost'
    movedWindowToPrimaryForCapture = $MoveToPrimary
    minimizedInterferingWindowsForCapture = $MinimizeInterferingWindows
  }
  processId = $process.Id
  hwnd = $target.ToInt64()
  title = [ToolsetTopmostCapture]::Text($target)
  bounds = [pscustomobject]@{
    x = $rect.Left
    y = $rect.Top
    width = $rect.Right - $rect.Left
    height = $rect.Bottom - $rect.Top
  }
  pngPath = $OutputPath
  pngBytes = (Get-Item $OutputPath).Length
  minimizedWindowCount = @($interferingWindows).Count
  minimizedWindows = @($interferingWindows | Select-Object hwnd,processId,title)
} | ConvertTo-Json -Depth 6
`;

const raw = execFileSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script
  ],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      AURORA_TOOLSET_CAPTURE_TITLE_CONTAINS: titleContains,
      AURORA_TOOLSET_CAPTURE_OUTPUT_PATH: outputPath,
      AURORA_TOOLSET_CAPTURE_SETTLE_MS: String(settleMs),
      AURORA_TOOLSET_CAPTURE_MOVE_TO_PRIMARY: moveToPrimary ? "1" : "0",
      AURORA_TOOLSET_CAPTURE_MINIMIZE_INTERFERING_WINDOWS: minimizeInterferingWindows ? "1" : "0"
    },
    maxBuffer: 1024 * 1024 * 4
  }
).trim();

console.log(raw);

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function integerArg(name, fallback) {
  const raw = readArg(name) ?? process.env.AURORA_TOOLSET_CAPTURE_SETTLE_MS;
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`${name} must be a non-negative integer, got ${JSON.stringify(raw)}.`);
  }
  return numeric;
}

function resolveMaybeAbsolute(value) {
  return resolve(value);
}
