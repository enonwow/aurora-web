#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const moduleName = requiredText(options.module, "--module");
const outPath = resolve(requiredText(options.out, "--out"));
const expectedFrameHwnd = optionalPositiveInteger(options.frameHwnd, "--frameHwnd");
const settleMs = nonNegativeInteger(options.settleMs ?? "1000", "--settleMs");
mkdirSync(dirname(outPath), { recursive: true });

const source = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$expectedModule = $env:AURORA_CAPTURE_MODULE
$outPath = $env:AURORA_CAPTURE_OUT
$expectedFrameHwnd = [int64]$env:AURORA_CAPTURE_FRAME_HWND
$settleMs = [int]$env:AURORA_CAPTURE_SETTLE_MS

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraFrameCapture {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool RedrawWindow(IntPtr hWnd, IntPtr updateRect, IntPtr updateRegion, uint flags);
  [DllImport("user32.dll")] public static extern bool UpdateWindow(IntPtr hWnd);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

function Get-Text([IntPtr]$hwnd) {
  $buffer = [Text.StringBuilder]::new(1024)
  [void][AuroraFrameCapture]::GetWindowText($hwnd, $buffer, $buffer.Capacity)
  $buffer.ToString()
}
function Get-Class([IntPtr]$hwnd) {
  $buffer = [Text.StringBuilder]::new(256)
  [void][AuroraFrameCapture]::GetClassName($hwnd, $buffer, $buffer.Capacity)
  $buffer.ToString()
}
function Get-Rect([IntPtr]$hwnd) {
  $rect = New-Object 'AuroraFrameCapture+RECT'
  if (-not [AuroraFrameCapture]::GetWindowRect($hwnd, [ref]$rect)) { throw 'frame_rect_missing' }
  $rect
}

$processes = @(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if ($processes.Count -ne 1) { throw "expected_one_toolset_process:$($processes.Count)" }
[uint32]$toolsetPid = $processes[0].Id
$script:frames = @()
$callback = [AuroraFrameCapture+EnumWindowsProc]{
  param($hwnd,$lparam)
  [uint32]$windowPid = 0
  [void][AuroraFrameCapture]::GetWindowThreadProcessId($hwnd,[ref]$windowPid)
  if ($windowPid -eq $toolsetPid -and [AuroraFrameCapture]::IsWindowVisible($hwnd) -and (Get-Class $hwnd) -eq 'TfrmFrame') {
    $script:frames += [pscustomobject]@{ hwnd=$hwnd; title=(Get-Text $hwnd) }
  }
  return $true
}
[void][AuroraFrameCapture]::EnumWindows($callback,[IntPtr]::Zero)
$frame = @($frames | Where-Object {
  $normalizedTitle = $_.title.TrimEnd('*')
  $normalizedTitle.EndsWith(" - $expectedModule", [StringComparison]::OrdinalIgnoreCase)
}) | Select-Object -First 1
if ($null -eq $frame) { throw 'expected_module_frame_missing' }
if ($expectedFrameHwnd -gt 0 -and $frame.hwnd.ToInt64() -ne $expectedFrameHwnd) { throw "frame_hwnd_mismatch:actual=$($frame.hwnd.ToInt64()) expected=$expectedFrameHwnd" }
if ([AuroraFrameCapture]::IsIconic($frame.hwnd)) { throw 'module_frame_minimized' }
$screen = [System.Windows.Forms.Screen]::FromHandle($frame.hwnd)
if ($screen.Primary) { throw "proof_frame_on_primary_display:$($screen.DeviceName)" }

$script:childTexts = @()
$script:viewports = @()
$childCallback = [AuroraFrameCapture+EnumWindowsProc]{
  param($hwnd,$lparam)
  $text = Get-Text $hwnd
  if (-not [string]::IsNullOrWhiteSpace($text)) { $script:childTexts += $text }
  if ([AuroraFrameCapture]::IsWindowVisible($hwnd) -and (Get-Class $hwnd) -eq 'TScrollBox') {
    $bounds = Get-Rect $hwnd
    $viewportWidth = $bounds.Right - $bounds.Left
    $viewportHeight = $bounds.Bottom - $bounds.Top
    if ($viewportWidth -ge 640 -and $viewportHeight -ge 480) {
      $script:viewports += [pscustomobject]@{ hwnd=$hwnd; area=$viewportWidth*$viewportHeight }
    }
  }
  return $true
}
[void][AuroraFrameCapture]::EnumChildWindows($frame.hwnd,$childCallback,[IntPtr]::Zero)
$allText = (($frame.title) + [Environment]::NewLine + ($childTexts -join [Environment]::NewLine))
if ($allText -match 'Access violation|List index out of bounds|Read of address|Write of address|Loading Inventory List|did not close properly|try to recover|recover it') {
  throw 'unsafe_toolset_state_detected'
}

$HWND_TOPMOST = [IntPtr](-1)
$HWND_NOTOPMOST = [IntPtr](-2)
$SWP_NOSIZE = 0x0001
$SWP_NOMOVE = 0x0002
$SWP_NOACTIVATE = 0x0010
$SWP_SHOWWINDOW = 0x0040
$flags = $SWP_NOSIZE -bor $SWP_NOMOVE -bor $SWP_NOACTIVATE -bor $SWP_SHOWWINDOW
$redrawFlags = 0x0001 -bor 0x0004 -bor 0x0080 -bor 0x0100
$viewport = @($viewports | Sort-Object area -Descending) | Select-Object -First 1
$rect = Get-Rect $frame.hwnd
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -lt 640 -or $height -lt 480) { throw "module_frame_too_small:$($width)x$($height)" }

try {
  if (-not [AuroraFrameCapture]::SetWindowPos($frame.hwnd,$HWND_TOPMOST,0,0,0,0,$flags)) { throw 'topmost_noactivate_failed' }
  if ($null -ne $viewport) {
    [void][AuroraFrameCapture]::RedrawWindow($viewport.hwnd,[IntPtr]::Zero,[IntPtr]::Zero,$redrawFlags)
    [void][AuroraFrameCapture]::UpdateWindow($viewport.hwnd)
  }
  [void][AuroraFrameCapture]::RedrawWindow($frame.hwnd,[IntPtr]::Zero,[IntPtr]::Zero,$redrawFlags)
  [void][AuroraFrameCapture]::UpdateWindow($frame.hwnd)
  Start-Sleep -Milliseconds $settleMs
  $rect = Get-Rect $frame.hwnd
  $width = $rect.Right - $rect.Left
  $height = $rect.Bottom - $rect.Top
  $bitmap = [Drawing.Bitmap]::new($width,$height)
  try {
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.CopyFromScreen($rect.Left,$rect.Top,0,0,[Drawing.Size]::new($width,$height))
    } finally { $graphics.Dispose() }
    $bitmap.Save($outPath,[Drawing.Imaging.ImageFormat]::Png)
  } finally { $bitmap.Dispose() }
} finally {
  [void][AuroraFrameCapture]::SetWindowPos($frame.hwnd,$HWND_NOTOPMOST,0,0,0,0,$flags)
  if (-not [AuroraFrameCapture]::IsWindowVisible($frame.hwnd)) {
    [void][AuroraFrameCapture]::ShowWindow($frame.hwnd,4)
  }
  if (-not [AuroraFrameCapture]::IsWindowVisible($frame.hwnd)) { throw 'frame_visibility_restore_failed' }
}

[pscustomobject]@{
  ok = $true
  processId = $toolsetPid
  frameHwnd = $frame.hwnd.ToInt64()
  viewportHwnd = if($null -ne $viewport){$viewport.hwnd.ToInt64()}else{$null}
  title = $frame.title
  monitor = [pscustomobject]@{ deviceName=$screen.DeviceName; primary=$screen.Primary }
  bounds = [pscustomobject]@{ left=$rect.Left; top=$rect.Top; width=$width; height=$height }
  pngPath = $outPath
  pngBytes = (Get-Item -LiteralPath $outPath).Length
  safety = [pscustomobject]@{
    usesGlobalCursor = $false
    usesGlobalKeyboard = $false
    usesGlobalMouse = $false
    activatesWindow = $false
    changesWindowPlacement = $false
    method = 'validated Toolset frame raised with SWP_NOACTIVATE, physical pixels copied, topmost removed'
  }
} | ConvertTo-Json -Depth 6 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  maxBuffer: 1024 * 1024,
  env: {
    ...process.env,
    AURORA_CAPTURE_MODULE: moduleName,
    AURORA_CAPTURE_OUT: outPath,
    AURORA_CAPTURE_FRAME_HWND: String(expectedFrameHwnd ?? 0),
    AURORA_CAPTURE_SETTLE_MS: String(settleMs),
  },
}).trim();

const result = JSON.parse(output);
const bytes = statSync(outPath).size;
if (!result.ok || bytes < 1024) throw new Error("capture_artifact_missing_or_empty");
console.log(JSON.stringify({ ...result, pngBytes: bytes }, null, 2));

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`Expected --name <value>, received ${token ?? "end"}.`);
    }
    result[token.slice(2)] = value;
  }
  return result;
}

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required.`);
  return text;
}

function optionalPositiveInteger(value, name) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function nonNegativeInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer.`);
  return parsed;
}
