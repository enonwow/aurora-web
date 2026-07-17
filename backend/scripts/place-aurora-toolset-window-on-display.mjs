#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const options = parseArgs(process.argv.slice(2));
if (options.apply !== "true") {
  throw new Error("Window placement is explicit: pass --apply true after inspecting the target display.");
}
const module = requiredText(options.module, "--module");
const area = requiredText(options.area, "--area").toLowerCase();
const targetDisplay = positiveInteger(options.targetDisplay, "--targetDisplay");
const bringToFront = options.bringToFront === "true";
const activate = options.activate === "true";

const result = runPowerShell(String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
$expectedModule=$env:AURORA_PLACE_MODULE
$expectedArea=$env:AURORA_PLACE_AREA
$targetDisplay=[int]$env:AURORA_PLACE_TARGET_DISPLAY
$bringToFront=$env:AURORA_PLACE_BRING_TO_FRONT -eq 'true'
$activate=$env:AURORA_PLACE_ACTIVATE -eq 'true'

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraToolsetPlacement {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT point);
  [DllImport("user32.dll")] public static extern bool IsChild(IntPtr parent, IntPtr child);
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

function Get-Text([IntPtr]$hwnd){$b=New-Object System.Text.StringBuilder 1024;[void][AuroraToolsetPlacement]::GetWindowText($hwnd,$b,$b.Capacity);$b.ToString()}
function Get-Class([IntPtr]$hwnd){$b=New-Object System.Text.StringBuilder 256;[void][AuroraToolsetPlacement]::GetClassName($hwnd,$b,$b.Capacity);$b.ToString()}
function Get-Bounds([IntPtr]$hwnd){$r=New-Object 'AuroraToolsetPlacement+RECT';if(-not [AuroraToolsetPlacement]::GetWindowRect($hwnd,[ref]$r)){throw 'GetWindowRect failed.'};[pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top;right=$r.Right;bottom=$r.Bottom}}
function Describe([IntPtr]$hwnd){$screen=[System.Windows.Forms.Screen]::FromHandle($hwnd);[pscustomobject]@{hwnd=$hwnd.ToInt64();title=(Get-Text $hwnd);className=(Get-Class $hwnd);bounds=(Get-Bounds $hwnd);display=[pscustomobject]@{deviceName=$screen.DeviceName;displayNumber=if($screen.DeviceName -match 'DISPLAY(\d+)$'){[int]$matches[1]}else{$null};bounds=[pscustomobject]@{left=$screen.Bounds.Left;top=$screen.Bounds.Top;width=$screen.Bounds.Width;height=$screen.Bounds.Height}}}}

$processes=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($processes.Count -ne 1){throw "Expected exactly one nwtoolset process, found $($processes.Count)."}
[uint32]$targetProcessId=$processes[0].Id
$script:top=@();$topCallback=[AuroraToolsetPlacement+EnumWindowsProc]{param($hwnd,$lparam)[uint32]$windowProcessId=0;[void][AuroraToolsetPlacement]::GetWindowThreadProcessId($hwnd,[ref]$windowProcessId);if($windowProcessId -eq $targetProcessId -and [AuroraToolsetPlacement]::IsWindowVisible($hwnd)){$script:top += Describe $hwnd};return $true};[void][AuroraToolsetPlacement]::EnumWindows($topCallback,[IntPtr]::Zero)
$module=@($top|Where-Object{$_.title.EndsWith(" - $expectedModule",[StringComparison]::OrdinalIgnoreCase)}|Select-Object -First 1);if($module.Count -ne 1){throw 'Expected exact Toolset module frame was not found.'}
$moduleHwnd=[IntPtr]$module[0].hwnd
$script:allTexts=@();$script:viewers=@();$childCallback=[AuroraToolsetPlacement+EnumWindowsProc]{param($hwnd,$lparam)$text=Get-Text $hwnd;if($text){$script:allTexts += $text};$normalized=$text.Trim();if($normalized.StartsWith('-')){$normalized=$normalized.Substring(1).Trim()};if((Get-Class $hwnd) -eq 'TfrmViewerArea' -and [String]::Equals($normalized,$expectedArea,[StringComparison]::OrdinalIgnoreCase)){$script:viewers += Describe $hwnd};return $true};[void][AuroraToolsetPlacement]::EnumChildWindows($moduleHwnd,$childCallback,[IntPtr]::Zero)
if((@($top.title)+@($allTexts) -join [Environment]::NewLine) -match 'Access violation|List index out of bounds|Read of address|Write of address|Loading Inventory List|did not close properly|try to recover|recover it'){throw 'Toolset is unsafe or loading; window was not moved.'}
if($viewers.Count -ne 1){throw "Expected one Area viewer for $expectedArea, found $($viewers.Count)."}
$viewerHwnd=[IntPtr]$viewers[0].hwnd;$script:viewports=@();$viewportCallback=[AuroraToolsetPlacement+EnumWindowsProc]{param($hwnd,$lparam)if([AuroraToolsetPlacement]::IsWindowVisible($hwnd) -and (Get-Class $hwnd) -eq 'TScrollBox'){$bounds=Get-Bounds $hwnd;if($bounds.width -ge 400 -and $bounds.height -ge 300){$script:viewports += Describe $hwnd}};return $true};[void][AuroraToolsetPlacement]::EnumChildWindows($viewerHwnd,$viewportCallback,[IntPtr]::Zero)
$viewport=@($viewports | Sort-Object { $_.bounds.width*$_.bounds.height } -Descending | Select-Object -First 1);if($viewport.Count -ne 1){throw 'Expected a large Area viewport.'}
$target=@([System.Windows.Forms.Screen]::AllScreens|Where-Object{$_.DeviceName -match ("DISPLAY"+$targetDisplay+"$")}|Select-Object -First 1);if($target.Count -ne 1){throw "Windows display DISPLAY$targetDisplay was not found."}
$before=[pscustomobject]@{module=$module[0];viewer=$viewers[0];viewport=$viewport[0]}
$offsetLeft=$module[0].bounds.left-$module[0].display.bounds.left;$offsetTop=$module[0].bounds.top-$module[0].display.bounds.top
$desiredLeft=$target[0].Bounds.Left+$offsetLeft;$desiredTop=$target[0].Bounds.Top+$offsetTop
$SWP_NOZORDER=0x0004;$SWP_NOACTIVATE=0x0010;$SWP_ASYNCWINDOWPOS=0x4000;$flags=$SWP_ASYNCWINDOWPOS;if(-not $activate){$flags=$flags -bor $SWP_NOACTIVATE};if(-not $bringToFront){$flags=$flags -bor $SWP_NOZORDER}
if(-not [AuroraToolsetPlacement]::SetWindowPos($moduleHwnd,[IntPtr]::Zero,$desiredLeft,$desiredTop,$module[0].bounds.width,$module[0].bounds.height,$flags)){throw 'SetWindowPos failed.'}
if($activate){[void][AuroraToolsetPlacement]::BringWindowToTop($moduleHwnd);$foregroundActivated=[AuroraToolsetPlacement]::SetForegroundWindow($moduleHwnd)}else{$foregroundActivated=$false}
Start-Sleep -Milliseconds 300
$afterModule=Describe $moduleHwnd;$afterViewer=Describe $viewerHwnd;$afterViewport=Describe ([IntPtr]$viewport[0].hwnd)
$allOnTarget=$afterModule.display.displayNumber -eq $targetDisplay -and $afterViewer.display.displayNumber -eq $targetDisplay -and $afterViewport.display.displayNumber -eq $targetDisplay
$probe=New-Object 'AuroraToolsetPlacement+POINT';$probe.X=[int]$afterViewport.bounds.left+[int]($afterViewport.bounds.width/2);$probe.Y=[int]$afterViewport.bounds.top+[int]($afterViewport.bounds.height/2);$topAtViewport=[AuroraToolsetPlacement]::WindowFromPoint($probe);[uint32]$topProcessId=0;if($topAtViewport -ne [IntPtr]::Zero){[void][AuroraToolsetPlacement]::GetWindowThreadProcessId($topAtViewport,[ref]$topProcessId)};$viewportOnTop=($topAtViewport -eq [IntPtr]$afterViewport.hwnd -or [AuroraToolsetPlacement]::IsChild($viewerHwnd,$topAtViewport)) -and $topProcessId -eq $targetProcessId
[pscustomobject]@{ok=($allOnTarget -and ((-not $bringToFront) -or $viewportOnTop));status=if($allOnTarget -and ((-not $bringToFront) -or $viewportOnTop)){'placed'}else{'placement_mismatch'};targetDisplay=[pscustomobject]@{deviceName=$target[0].DeviceName;displayNumber=$targetDisplay;bounds=[pscustomobject]@{left=$target[0].Bounds.Left;top=$target[0].Bounds.Top;width=$target[0].Bounds.Width;height=$target[0].Bounds.Height}};before=$before;after=[pscustomobject]@{module=$afterModule;areaViewer=$afterViewer;viewport=$afterViewport};physicalViewportOwner=[pscustomobject]@{hwnd=$topAtViewport.ToInt64();className=(Get-Class $topAtViewport);processId=$topProcessId;belongsToExpectedToolset=$viewportOnTop};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;changesOnlyExactModuleFrame=$true;usesNoActivate=(-not $activate);usesNoZOrderChange=(-not $bringToFront);bringsExactModuleFrameToFront=$bringToFront;foregroundActivationRequested=$activate;foregroundActivationAccepted=$foregroundActivated;method='exact PID/module/Area validation then targeted SetWindowPos'}}|ConvertTo-Json -Depth 8 -Compress
`, {
  AURORA_PLACE_MODULE: module,
  AURORA_PLACE_AREA: area,
  AURORA_PLACE_TARGET_DISPLAY: String(targetDisplay),
  AURORA_PLACE_BRING_TO_FRONT: String(bringToFront),
  AURORA_PLACE_ACTIVATE: String(activate),
});

console.log(JSON.stringify(result, null, 2));

function runPowerShell(source, env) {
  const dir = mkdtempSync(join(tmpdir(), "aurora-placement-"));
  const path = join(dir, "place.ps1");
  writeFileSync(path, source, "utf8");
  try {
    const stdout = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path], {
      encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 1024 * 1024 * 4, timeout: 30_000, windowsHide: true,
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

function positiveInteger(value, name) {
  const result = Number.parseInt(String(value), 10);
  if (!Number.isInteger(result) || result < 1) throw new Error(`${name} must be a positive integer.`);
  return result;
}
