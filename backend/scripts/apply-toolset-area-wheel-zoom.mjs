#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const options = parseArgs(process.argv.slice(2));
const expectedModuleParts = String(options.expectedModuleParts ?? "the_last_city|codex.mod")
  .split("|")
  .map((part) => part.trim())
  .filter(Boolean);
const expectedArea = String(options.expectedArea ?? "").trim();
const wheelSteps = parseInteger(options.wheelSteps, "--wheelSteps");

if (!expectedArea) {
  throw new Error("Missing --expectedArea.");
}

const script = String.raw`
$ErrorActionPreference = 'Stop'
$expectedModuleParts = @($env:AURORA_TOOLSET_EXPECTED_MODULE_PARTS -split '\|' | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ })
$expectedArea = $env:AURORA_TOOLSET_EXPECTED_AREA.ToLowerInvariant()
$wheelSteps = [int]$env:AURORA_TOOLSET_WHEEL_STEPS

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class ToolsetAreaWheelZoom {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
'@

function Get-Text([IntPtr]$hwnd) {
  $builder = New-Object System.Text.StringBuilder 1024
  [void][ToolsetAreaWheelZoom]::GetWindowText($hwnd, $builder, $builder.Capacity)
  return $builder.ToString()
}

function Get-Class([IntPtr]$hwnd) {
  $builder = New-Object System.Text.StringBuilder 256
  [void][ToolsetAreaWheelZoom]::GetClassName($hwnd, $builder, $builder.Capacity)
  return $builder.ToString()
}

function Get-Rect([IntPtr]$hwnd) {
  $rect = New-Object 'ToolsetAreaWheelZoom+RECT'
  if (-not [ToolsetAreaWheelZoom]::GetWindowRect($hwnd, [ref]$rect)) {
    throw 'GetWindowRect failed.'
  }
  return [pscustomobject]@{ left=$rect.Left; top=$rect.Top; width=$rect.Right-$rect.Left; height=$rect.Bottom-$rect.Top }
}

$toolsetWindows = New-Object System.Collections.Generic.List[object]
$enum = [ToolsetAreaWheelZoom+EnumWindowsProc]{
  param([IntPtr]$hwnd, [IntPtr]$lparam)
  if (-not [ToolsetAreaWheelZoom]::IsWindowVisible($hwnd)) { return $true }
  [uint32]$windowProcessId = 0
  [void][ToolsetAreaWheelZoom]::GetWindowThreadProcessId($hwnd, [ref]$windowProcessId)
  $processName = $null
  try { $processName = (Get-Process -Id $windowProcessId -ErrorAction Stop).ProcessName } catch { $processName = $null }
  if ($processName -ne 'nwtoolset') { return $true }
  $title = Get-Text $hwnd
  $lowerTitle = $title.ToLowerInvariant()
  $matchesModule = $true
  foreach ($part in $expectedModuleParts) {
    if (-not $lowerTitle.Contains($part)) { $matchesModule = $false; break }
  }
  $toolsetWindows.Add([pscustomobject]@{ hwnd=$hwnd; processId=$windowProcessId; title=$title; matchesModule=$matchesModule })
  return $true
}
[void][ToolsetAreaWheelZoom]::EnumWindows($enum, [IntPtr]::Zero)

$moduleWindow = @($toolsetWindows | Where-Object { $_.matchesModule }) | Select-Object -First 1
if ($null -eq $moduleWindow) { throw 'Expected loaded Toolset module window was not found.' }

$unsafeTexts = New-Object System.Collections.Generic.List[string]
$viewerMatches = New-Object System.Collections.Generic.List[object]
$childEnum = [ToolsetAreaWheelZoom+EnumWindowsProc]{
  param([IntPtr]$child, [IntPtr]$lparam)
  $text = Get-Text $child
  if ($text) { $script:unsafeTexts.Add($text) }
  $className = Get-Class $child
  if ($className -eq 'TfrmViewerArea' -and $text.ToLowerInvariant().Contains($expectedArea)) {
    $script:viewerMatches.Add([pscustomobject]@{ hwnd=$child; title=$text })
  }
  return $true
}
[void][ToolsetAreaWheelZoom]::EnumChildWindows($moduleWindow.hwnd, $childEnum, [IntPtr]::Zero)
$allWindowText = (@($toolsetWindows | ForEach-Object { $_.title }) + @($unsafeTexts)) -join [Environment]::NewLine
if ($allWindowText -match 'Access violation|Read of address|Write of address|Loading Inventory List|did not close properly|try to recover|recover it') {
  throw 'Toolset has an unsafe modal/progress state; wheel zoom was not sent.'
}
if ($viewerMatches.Count -ne 1) { throw "Expected exactly one area viewer for '$expectedArea', found $($viewerMatches.Count)." }

$viewportCandidates = New-Object System.Collections.Generic.List[object]
$viewportEnum = [ToolsetAreaWheelZoom+EnumWindowsProc]{
  param([IntPtr]$child, [IntPtr]$lparam)
  if ((Get-Class $child) -ne 'TScrollBox' -or -not [ToolsetAreaWheelZoom]::IsWindowVisible($child)) { return $true }
  $rect = Get-Rect $child
  if ($rect.width -ge 400 -and $rect.height -ge 300) { $script:viewportCandidates.Add([pscustomobject]@{ hwnd=$child; rect=$rect }) }
  return $true
}
[void][ToolsetAreaWheelZoom]::EnumChildWindows($viewerMatches[0].hwnd, $viewportEnum, [IntPtr]::Zero)
$viewport = @($viewportCandidates | Sort-Object { $_.rect.width * $_.rect.height } -Descending) | Select-Object -First 1
if ($null -eq $viewport) { throw 'No visible area viewport scrollbox was found.' }

$WM_MOUSEWHEEL = 0x020A
$delta = if ($wheelSteps -gt 0) { 120 } elseif ($wheelSteps -lt 0) { -120 } else { 0 }
$centerX = [int]($viewport.rect.left + [Math]::Floor($viewport.rect.width / 2))
$centerY = [int]($viewport.rect.top + [Math]::Floor($viewport.rect.height / 2))
$wheelWParam = [IntPtr]([int64](($delta -band 0xffff) -shl 16))
$wheelLParam = [IntPtr]([int64](($centerY -shl 16) -bor ($centerX -band 0xffff)))
for ($index = 0; $index -lt [Math]::Abs($wheelSteps); $index += 1) {
  [void][ToolsetAreaWheelZoom]::SendMessage($viewport.hwnd, $WM_MOUSEWHEEL, $wheelWParam, $wheelLParam)
  Start-Sleep -Milliseconds 160
}

[pscustomobject]@{
  ok = $true
  safety = [pscustomobject]@{ usesGlobalCursor=$false; usesGlobalKeyboard=$false; method='targeted WM_MOUSEWHEEL to validated TScrollBox viewport' }
  moduleTitle = $moduleWindow.title
  areaViewerTitle = $viewerMatches[0].title
  viewport = $viewport.rect
  wheelSteps = $wheelSteps
  wheelDelta = $delta
} | ConvertTo-Json -Compress
`;

const output = runPowerShell(script, {
  AURORA_TOOLSET_EXPECTED_MODULE_PARTS: expectedModuleParts.join("|"),
  AURORA_TOOLSET_EXPECTED_AREA: expectedArea,
  AURORA_TOOLSET_WHEEL_STEPS: String(wheelSteps),
});
console.log(output.trim());

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function parseInteger(value, name) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer.`);
  return parsed;
}

function runPowerShell(script, env) {
  const dir = mkdtempSync(join(tmpdir(), "aurora-toolset-wheel-"));
  const path = join(dir, "wheel.ps1");
  writeFileSync(path, script, "utf8");
  try {
    return execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path], {
      encoding: "utf8",
      env: { ...process.env, ...env },
      maxBuffer: 1024 * 1024 * 2,
      timeout: 30_000,
      windowsHide: true,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
