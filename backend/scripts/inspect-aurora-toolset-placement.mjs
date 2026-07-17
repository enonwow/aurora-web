#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const options = parseArgs(process.argv.slice(2));
const module = requiredText(options.module ?? "the_last_city - codex.mod", "--module");
const area = requiredText(options.area ?? "enon_test_mount", "--area").toLowerCase();

const result = runPowerShell(String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$expectedModule = $env:AURORA_PLACEMENT_MODULE
$expectedArea = $env:AURORA_PLACEMENT_AREA

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraPlacementInspector {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hWnd);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

function Get-Text([IntPtr]$hwnd) { $b=New-Object System.Text.StringBuilder 1024; [void][AuroraPlacementInspector]::GetWindowText($hwnd,$b,$b.Capacity); $b.ToString() }
function Get-Class([IntPtr]$hwnd) { $b=New-Object System.Text.StringBuilder 256; [void][AuroraPlacementInspector]::GetClassName($hwnd,$b,$b.Capacity); $b.ToString() }
function Get-Bounds([IntPtr]$hwnd) { $r=New-Object 'AuroraPlacementInspector+RECT'; if(-not [AuroraPlacementInspector]::GetWindowRect($hwnd,[ref]$r)){throw 'GetWindowRect failed.'}; [pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top;right=$r.Right;bottom=$r.Bottom} }
function Convert-Screen($screen) { [pscustomobject]@{ deviceName=$screen.DeviceName; displayNumber=if($screen.DeviceName -match 'DISPLAY(\d+)$'){[int]$matches[1]}else{$null}; primary=$screen.Primary; bounds=[pscustomobject]@{left=$screen.Bounds.Left;top=$screen.Bounds.Top;width=$screen.Bounds.Width;height=$screen.Bounds.Height;right=$screen.Bounds.Right;bottom=$screen.Bounds.Bottom}; workingArea=[pscustomobject]@{left=$screen.WorkingArea.Left;top=$screen.WorkingArea.Top;width=$screen.WorkingArea.Width;height=$screen.WorkingArea.Height} } }
function Describe-Window([IntPtr]$hwnd) { $screen=[System.Windows.Forms.Screen]::FromHandle($hwnd); [pscustomobject]@{ hwnd=$hwnd.ToInt64(); title=(Get-Text $hwnd); className=(Get-Class $hwnd); bounds=(Get-Bounds $hwnd); screen=(Convert-Screen $screen); dpi=[AuroraPlacementInspector]::GetDpiForWindow($hwnd) } }

$processes=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($processes.Count -ne 1){throw "Expected exactly one nwtoolset process, found $($processes.Count)."}
[uint32]$targetProcessId=$processes[0].Id
$script:top=@()
$topCallback=[AuroraPlacementInspector+EnumWindowsProc]{param($hwnd,$lparam) [uint32]$windowProcessId=0; [void][AuroraPlacementInspector]::GetWindowThreadProcessId($hwnd,[ref]$windowProcessId); if($windowProcessId -eq $targetProcessId -and [AuroraPlacementInspector]::IsWindowVisible($hwnd)){$script:top += Describe-Window $hwnd}; return $true}
[void][AuroraPlacementInspector]::EnumWindows($topCallback,[IntPtr]::Zero)
$moduleWindow=@($top | Where-Object {$_.title.EndsWith(" - $expectedModule",[StringComparison]::OrdinalIgnoreCase)}) | Select-Object -First 1
if($null -eq $moduleWindow){throw 'Expected exact Toolset module frame was not found.'}
$moduleHwnd=[IntPtr]$moduleWindow.hwnd
$script:viewers=@()
$childCallback=[AuroraPlacementInspector+EnumWindowsProc]{param($hwnd,$lparam) $title=Get-Text $hwnd; $normalized=$title.Trim(); if($normalized.StartsWith('-')){$normalized=$normalized.Substring(1).Trim()}; if((Get-Class $hwnd) -eq 'TfrmViewerArea' -and [String]::Equals($normalized,$expectedArea,[StringComparison]::OrdinalIgnoreCase)){$script:viewers += Describe-Window $hwnd}; return $true}
[void][AuroraPlacementInspector]::EnumChildWindows($moduleHwnd,$childCallback,[IntPtr]::Zero)
if($viewers.Count -ne 1){throw "Expected exactly one Area viewer for $expectedArea, found $($viewers.Count)."}
$viewerHwnd=[IntPtr]$viewers[0].hwnd
$script:viewports=@()
$viewportCallback=[AuroraPlacementInspector+EnumWindowsProc]{param($hwnd,$lparam) if([AuroraPlacementInspector]::IsWindowVisible($hwnd) -and (Get-Class $hwnd) -eq 'TScrollBox'){ $bounds=Get-Bounds $hwnd; if($bounds.width -ge 400 -and $bounds.height -ge 300){$script:viewports += Describe-Window $hwnd} }; return $true}
[void][AuroraPlacementInspector]::EnumChildWindows($viewerHwnd,$viewportCallback,[IntPtr]::Zero)
$viewport=@($viewports | Sort-Object {$_.bounds.width*$_.bounds.height} -Descending | Select-Object -First 1)
if($viewport.Count -ne 1){throw 'Expected a large Area viewport.'}
$viewportHwnd=[IntPtr]$viewport[0].hwnd
$script:viewportDescendants=@()
$viewportDescendantCallback=[AuroraPlacementInspector+EnumWindowsProc]{param($hwnd,$lparam)
  if([AuroraPlacementInspector]::IsWindowVisible($hwnd)){
    $script:viewportDescendants += Describe-Window $hwnd
  }
  return $true
}
[void][AuroraPlacementInspector]::EnumChildWindows($viewportHwnd,$viewportDescendantCallback,[IntPtr]::Zero)
$allScreens=@([System.Windows.Forms.Screen]::AllScreens | ForEach-Object {Convert-Screen $_} | Sort-Object displayNumber)
[pscustomobject]@{status='observed'; safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;changesWindowPlacement=$false;method='PID-owned window enumeration plus Screen.FromHandle and GetDpiForWindow'}; process=[pscustomobject]@{pid=$targetProcessId;name=$processes[0].ProcessName;mainWindowTitle=$processes[0].MainWindowTitle}; expected=[pscustomobject]@{module=$expectedModule;area=$expectedArea}; displays=$allScreens; toolset=[pscustomobject]@{module=$moduleWindow;areaViewer=$viewers[0];viewport=$viewport[0];viewportDescendants=$viewportDescendants;allPidTopLevelWindows=$top}; placement=[pscustomobject]@{moduleDisplay=$moduleWindow.screen.deviceName;viewerDisplay=$viewers[0].screen.deviceName;viewportDisplay=$viewport[0].screen.deviceName;allSameDisplay=($moduleWindow.screen.deviceName -eq $viewers[0].screen.deviceName -and $moduleWindow.screen.deviceName -eq $viewport[0].screen.deviceName)}} | ConvertTo-Json -Depth 8 -Compress
`, {
  AURORA_PLACEMENT_MODULE: module,
  AURORA_PLACEMENT_AREA: area,
});

console.log(JSON.stringify(result, null, 2));

function runPowerShell(source, env) {
  const dir = mkdtempSync(join(tmpdir(), "aurora-placement-"));
  const path = join(dir, "inspect.ps1");
  writeFileSync(path, source, "utf8");
  try {
    const stdout = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path], {
      encoding: "utf8",
      env: { ...process.env, ...env },
      maxBuffer: 1024 * 1024 * 4,
      timeout: 30_000,
      windowsHide: true,
    }).trim();
    return JSON.parse(stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
    result[token.slice(2)] = value;
    index += 1;
  }
  return result;
}

function requiredText(value, name) {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`${name} is required.`);
  return result;
}
