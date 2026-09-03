#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const moduleName = requiredText(options.module, "--module");
const modulePath = resolve(requiredText(options.modulePath, "--modulePath"));
const expectedFrameHwnd = optionalPositiveInteger(options.frameHwnd, "--frameHwnd");
const timeoutMs = positiveInteger(options.timeoutMs ?? "30000", "--timeoutMs");

const source = String.raw`
$ErrorActionPreference = 'Stop'
$expectedModule = $env:AURORA_SAVE_MODULE
$modulePath = $env:AURORA_SAVE_MODULE_PATH
$expectedFrameHwnd = [int64]$env:AURORA_SAVE_FRAME_HWND
$timeoutMs = [int]$env:AURORA_SAVE_TIMEOUT_MS

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraTargetedSave {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

function Get-Text([IntPtr]$hwnd) {
  $buffer = [Text.StringBuilder]::new(1024)
  [void][AuroraTargetedSave]::GetWindowText($hwnd,$buffer,$buffer.Capacity)
  $buffer.ToString()
}
function Get-Class([IntPtr]$hwnd) {
  $buffer = [Text.StringBuilder]::new(256)
  [void][AuroraTargetedSave]::GetClassName($hwnd,$buffer,$buffer.Capacity)
  $buffer.ToString()
}
function Get-Bounds([IntPtr]$hwnd) {
  $rect = New-Object 'AuroraTargetedSave+RECT'
  if (-not [AuroraTargetedSave]::GetWindowRect($hwnd,[ref]$rect)) { throw 'window_rect_missing' }
  [pscustomobject]@{ left=$rect.Left; top=$rect.Top; width=$rect.Right-$rect.Left; height=$rect.Bottom-$rect.Top }
}
function Find-NativeSaveErrorModal([uint32]$targetProcessId) {
  $script:errors = @()
  $callback = [AuroraTargetedSave+EnumWindowsProc]{
    param($hwnd,$lparam)
    [uint32]$windowPid = 0
    [void][AuroraTargetedSave]::GetWindowThreadProcessId($hwnd,[ref]$windowPid)
    if ($windowPid -eq $targetProcessId -and [AuroraTargetedSave]::IsWindowVisible($hwnd) -and (Get-Class $hwnd) -eq '#32770' -and (Get-Text $hwnd) -eq 'Error') {
      $script:errorText = @()
      $child = [AuroraTargetedSave+EnumWindowsProc]{
        param($childHwnd,$childParam)
        if ([AuroraTargetedSave]::IsWindowVisible($childHwnd)) {
          $value = Get-Text $childHwnd
          if ($value) { $script:errorText += $value }
        }
        return $true
      }
      [void][AuroraTargetedSave]::EnumChildWindows($hwnd,$child,[IntPtr]::Zero)
      $script:errors += [pscustomobject]@{ hwnd=$hwnd.ToInt64(); title=(Get-Text $hwnd); text=($script:errorText -join [Environment]::NewLine) }
    }
    return $true
  }
  [void][AuroraTargetedSave]::EnumWindows($callback,[IntPtr]::Zero)
  if ($script:errors.Count -gt 1) { throw "native_save_error_modal_ambiguous:$($script:errors.Count)" }
  if ($script:errors.Count -eq 1) { return $script:errors[0] }
  return $null
}

$processes = @(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if ($processes.Count -ne 1) { throw "expected_one_toolset_process:$($processes.Count)" }
[uint32]$toolsetPid = $processes[0].Id
$script:frames = @()
$topCallback = [AuroraTargetedSave+EnumWindowsProc]{
  param($hwnd,$lparam)
  [uint32]$windowPid = 0
  [void][AuroraTargetedSave]::GetWindowThreadProcessId($hwnd,[ref]$windowPid)
  if ($windowPid -eq $toolsetPid -and [AuroraTargetedSave]::IsWindowVisible($hwnd) -and (Get-Class $hwnd) -eq 'TfrmFrame') {
    $script:frames += [pscustomobject]@{ hwnd=$hwnd; title=(Get-Text $hwnd); bounds=(Get-Bounds $hwnd) }
  }
  return $true
}
[void][AuroraTargetedSave]::EnumWindows($topCallback,[IntPtr]::Zero)
$frame = @($frames | Where-Object {
  $_.title.TrimEnd('*').EndsWith(" - $expectedModule",[StringComparison]::OrdinalIgnoreCase)
}) | Select-Object -First 1
if ($null -eq $frame) { throw 'expected_module_frame_missing' }
if ($expectedFrameHwnd -gt 0 -and $frame.hwnd.ToInt64() -ne $expectedFrameHwnd) { throw "frame_hwnd_mismatch:actual=$($frame.hwnd.ToInt64()) expected=$expectedFrameHwnd" }
if (-not $frame.title.EndsWith('*')) { throw 'module_not_dirty_before_save' }
if (-not (Test-Path -LiteralPath $modulePath -PathType Leaf)) { throw 'working_module_missing' }

$beforeFile = Get-Item -LiteralPath $modulePath
$beforeBytes = $beforeFile.Length
$beforeLastWriteTimeUtc = $beforeFile.LastWriteTimeUtc
$beforeHash = $null
try { $beforeHash = (Get-FileHash -LiteralPath $modulePath -Algorithm SHA256 -ErrorAction Stop).Hash } catch { $beforeHash = $null }
$script:toolbars = @()
$childCallback = [AuroraTargetedSave+EnumWindowsProc]{
  param($hwnd,$lparam)
  if ([AuroraTargetedSave]::IsWindowVisible($hwnd) -and (Get-Class $hwnd) -eq 'TToolBar') {
    $bounds = Get-Bounds $hwnd
    if ($bounds.top -ge ($frame.bounds.top + 45) -and $bounds.top -le ($frame.bounds.top + 65) -and
        $bounds.width -ge 110 -and $bounds.width -le 140 -and $bounds.height -ge 18 -and $bounds.height -le 28) {
      $script:toolbars += [pscustomobject]@{ hwnd=$hwnd; bounds=$bounds }
    }
  }
  return $true
}
[void][AuroraTargetedSave]::EnumChildWindows($frame.hwnd,$childCallback,[IntPtr]::Zero)
if ($toolbars.Count -ne 1) { throw "save_toolbar_ambiguous:$($toolbars.Count)" }
$toolbar = $toolbars[0]
$saveX = 57
$saveY = [Math]::Floor($toolbar.bounds.height / 2)
if ($saveX -ge $toolbar.bounds.width -or $saveY -ge $toolbar.bounds.height) { throw 'save_button_outside_toolbar' }
$lParam = [IntPtr](($saveY -shl 16) -bor ($saveX -band 0xffff))
$postedMove = [AuroraTargetedSave]::PostMessage($toolbar.hwnd,0x0200,[IntPtr]::Zero,$lParam)
$postedDown = [AuroraTargetedSave]::PostMessage($toolbar.hwnd,0x0201,[IntPtr]1,$lParam)
$postedUp = [AuroraTargetedSave]::PostMessage($toolbar.hwnd,0x0202,[IntPtr]::Zero,$lParam)
if (-not $postedMove -or -not $postedDown -or -not $postedUp) { throw 'save_toolbar_post_failed' }

$deadline = [DateTime]::UtcNow.AddMilliseconds($timeoutMs)
$finalTitle = $frame.title
$fileChanged = $false
do {
  Start-Sleep -Milliseconds 250
  $nativeError = Find-NativeSaveErrorModal $toolsetPid
  if ($null -ne $nativeError) { throw ('native_save_error_modal:' + ($nativeError | ConvertTo-Json -Compress)) }
  $finalTitle = Get-Text $frame.hwnd
  $currentFile = Get-Item -LiteralPath $modulePath
  $fileChanged = $currentFile.LastWriteTimeUtc -gt $beforeLastWriteTimeUtc -or $currentFile.Length -ne $beforeBytes
} while ([DateTime]::UtcNow -lt $deadline -and ($finalTitle.EndsWith('*') -or -not $fileChanged))

if ($finalTitle.EndsWith('*')) { throw 'save_title_still_dirty' }
if (-not $fileChanged) { throw 'save_file_unchanged' }
$afterFile = Get-Item -LiteralPath $modulePath
$afterHash = $null
try { $afterHash = (Get-FileHash -LiteralPath $modulePath -Algorithm SHA256 -ErrorAction Stop).Hash } catch { $afterHash = $null }
if ($null -ne $beforeHash -and $null -ne $afterHash -and $afterHash -eq $beforeHash) { throw 'save_hash_unchanged' }

[pscustomobject]@{
  ok = $true
  processId = $toolsetPid
  frameHwnd = $frame.hwnd.ToInt64()
  titleBefore = $frame.title
  titleAfter = $finalTitle
  toolbar = [pscustomobject]@{ hwnd=$toolbar.hwnd.ToInt64(); bounds=$toolbar.bounds; click=[pscustomobject]@{x=$saveX;y=$saveY} }
  modulePath = $modulePath
  before = [pscustomobject]@{ sha256=$beforeHash; bytes=$beforeBytes; lastWriteTimeUtc=$beforeLastWriteTimeUtc.ToString('o') }
  after = [pscustomobject]@{ sha256=$afterHash; bytes=$afterFile.Length; lastWriteTimeUtc=$afterFile.LastWriteTimeUtc.ToString('o') }
  hashDeferredUntilClose = ($null -eq $beforeHash -or $null -eq $afterHash)
  safety = [pscustomobject]@{
    usesGlobalCursor = $false
    usesGlobalKeyboard = $false
    usesGlobalMouse = $false
    guessedCommandId = $false
    method = 'validated visible module-save toolbar button, targeted toolbar messages, dirty-title and file/hash confirmation'
  }
} | ConvertTo-Json -Depth 6 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: timeoutMs + 15_000,
  maxBuffer: 1024 * 1024,
  env: {
    ...process.env,
    AURORA_SAVE_MODULE: moduleName,
    AURORA_SAVE_MODULE_PATH: modulePath,
    AURORA_SAVE_FRAME_HWND: String(expectedFrameHwnd ?? 0),
    AURORA_SAVE_TIMEOUT_MS: String(timeoutMs),
  },
}).trim();

console.log(JSON.stringify(JSON.parse(output), null, 2));

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
  return positiveInteger(value, name);
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}
