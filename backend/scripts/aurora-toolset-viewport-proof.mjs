#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { finalizeViewportCapture, validateCaptureRequestBinding } from "./lib/aurora-viewport-capture-provenance.mjs";

const [command, ...rawArgs] = process.argv.slice(2);
const options = parseArgs(rawArgs);

if (command === "capture") {
  const outPath = requiredPath(options.out, "--out");
  const resultPath = options.resultOut ? requiredPath(options.resultOut, "--resultOut") : undefined;
  if (resultPath && resultPath.toLowerCase() === outPath.toLowerCase()) throw new Error("--resultOut must differ from the PNG --out path.");
  if (options.bindingFile && resultPath && existsSync(resultPath)) throw new Error("Bound capture sidecar already exists; choose a new --resultOut path.");
  const result = captureViewport({
    module: requiredText(options.module, "--module"),
    area: requiredText(options.area, "--area"),
    outPath,
    allowUniformScene: booleanOption(options.allowUniformScene),
    requestBinding: options.bindingFile ? validateCaptureRequestBinding(JSON.parse(readFileSync(requiredExistingPath(options.bindingFile, "--bindingFile"), "utf8"))) : undefined,
  });
  if (resultPath) {
    mkdirSync(dirname(resultPath), { recursive: true });
    writeFileSync(resultPath, `${JSON.stringify({ ...result, status: result.ok ? "verified" : "failed" }, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(result, null, 2));
} else if (command === "compare") {
  const result = compareImages({
    beforePath: requiredExistingPath(options.before, "--before"),
    afterPath: requiredExistingPath(options.after, "--after"),
  });
  if (options.resultOut) {
    const resultPath = requiredPath(options.resultOut, "--resultOut");
    mkdirSync(dirname(resultPath), { recursive: true });
    writeFileSync(resultPath, `${JSON.stringify({ ...result, status: result.ok ? "verified" : "failed" }, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(result, null, 2));
} else {
  throw new Error("Use: capture --module <name> --area <resref> --out <png>, or compare --before <png> --after <png>.");
}

function captureViewport({ module, area, outPath, allowUniformScene = false, requestBinding }) {
  if (requestBinding && existsSync(outPath)) throw new Error("Bound capture output already exists; retain the original and choose a new --out path.");
  mkdirSync(dirname(outPath), { recursive: true });
  const source = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$expectedModule = $env:AURORA_VIEWPORT_PROOF_MODULE
$expectedArea = $env:AURORA_VIEWPORT_PROOF_AREA
$outPath = $env:AURORA_VIEWPORT_PROOF_OUT
$approvedScreenDeviceName = $env:AURORA_VIEWPORT_PROOF_SCREEN_DEVICE
$allowUniformScene = $env:AURORA_VIEWPORT_PROOF_ALLOW_UNIFORM_SCENE -eq '1'

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraViewportProof {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint flags);
  [DllImport("user32.dll")] public static extern IntPtr GetWindowDC(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hdc);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT point);
  [DllImport("user32.dll")] public static extern bool IsChild(IntPtr parent, IntPtr child);
  [DllImport("gdi32.dll", SetLastError=true)] public static extern bool BitBlt(IntPtr hdcDest, int xDest, int yDest, int width, int height, IntPtr hdcSrc, int xSrc, int ySrc, uint rop);
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

function Get-Text([IntPtr]$hwnd) { $b = New-Object System.Text.StringBuilder 1024; [void][AuroraViewportProof]::GetWindowText($hwnd, $b, $b.Capacity); $b.ToString() }
function Get-Class([IntPtr]$hwnd) { $b = New-Object System.Text.StringBuilder 256; [void][AuroraViewportProof]::GetClassName($hwnd, $b, $b.Capacity); $b.ToString() }
function Get-Rect([IntPtr]$hwnd) { $r = New-Object 'AuroraViewportProof+RECT'; if (-not [AuroraViewportProof]::GetWindowRect($hwnd, [ref]$r)) { throw 'GetWindowRect failed.' }; [pscustomobject]@{ left=$r.Left; top=$r.Top; width=$r.Right-$r.Left; height=$r.Bottom-$r.Top } }
function Has-SceneVariation([System.Drawing.Bitmap]$bitmap) {
  $minRed = 255; $maxRed = 0; $minGreen = 255; $maxGreen = 0; $minBlue = 255; $maxBlue = 0; $sampleMargin = 24
  for ($sampleY = $sampleMargin; $sampleY -lt ($bitmap.Height - $sampleMargin); $sampleY += 8) {
    for ($sampleX = $sampleMargin; $sampleX -lt ($bitmap.Width - $sampleMargin); $sampleX += 8) {
      $pixel = $bitmap.GetPixel($sampleX, $sampleY)
      $minRed = [Math]::Min($minRed, [int]$pixel.R); $maxRed = [Math]::Max($maxRed, [int]$pixel.R)
      $minGreen = [Math]::Min($minGreen, [int]$pixel.G); $maxGreen = [Math]::Max($maxGreen, [int]$pixel.G)
      $minBlue = [Math]::Min($minBlue, [int]$pixel.B); $maxBlue = [Math]::Max($maxBlue, [int]$pixel.B)
    }
  }
  return ((($maxRed - $minRed) + ($maxGreen - $minGreen) + ($maxBlue - $minBlue)) -gt 6)
}

$toolsetProcesses = @(Get-Process nwtoolset -ErrorAction SilentlyContinue)
$processIds = @($toolsetProcesses | ForEach-Object { [uint32]$_.Id })
if ($processIds.Count -ne 1) { throw "Expected exactly one nwtoolset process, found $($processIds.Count)." }
$script:topWindows = @()
$topEnum = [AuroraViewportProof+EnumWindowsProc]{
  param($hwnd, $lparam)
  [uint32]$windowProcessId = 0; [void][AuroraViewportProof]::GetWindowThreadProcessId($hwnd, [ref]$windowProcessId)
  if ($processIds -contains $windowProcessId -and [AuroraViewportProof]::IsWindowVisible($hwnd)) {
    $script:topWindows += [pscustomobject]@{ hwnd=$hwnd; title=(Get-Text $hwnd); className=(Get-Class $hwnd); bounds=(Get-Rect $hwnd) }
  }
  return $true
}
[void][AuroraViewportProof]::EnumWindows($topEnum, [IntPtr]::Zero)
$moduleWindows = @($topWindows | Where-Object { $_.className -eq 'TfrmFrame' -and $_.title.EndsWith(" - $expectedModule", [StringComparison]::OrdinalIgnoreCase) })
if ($moduleWindows.Count -ne 1) { throw 'Expected exactly one loaded module frame.' }
$moduleWindow = $moduleWindows[0]
$moduleScreen = [System.Windows.Forms.Screen]::FromHandle($moduleWindow.hwnd)
if ($moduleScreen.DeviceName -ne $approvedScreenDeviceName -or $moduleScreen.Primary) {
  throw "Module window is not on the approved physical proof monitor: expected=$approvedScreenDeviceName, actual=$($moduleScreen.DeviceName)."
}

$script:windowTexts = @()
$script:viewers = @()
$childEnum = [AuroraViewportProof+EnumWindowsProc]{
  param($hwnd, $lparam)
  $text = Get-Text $hwnd
  if ($text) { $script:windowTexts += $text }
  $normalized = $text.Trim(); if ($normalized.StartsWith('-')) { $normalized = $normalized.Substring(1).Trim() }
  if ((Get-Class $hwnd) -eq 'TfrmViewerArea' -and [String]::Equals($normalized, $expectedArea, [StringComparison]::OrdinalIgnoreCase)) {
    $script:viewers += [pscustomobject]@{ hwnd=$hwnd; title=$text; bounds=(Get-Rect $hwnd) }
  }
  return $true
}
[void][AuroraViewportProof]::EnumChildWindows($moduleWindow.hwnd, $childEnum, [IntPtr]::Zero)
$allText = (@($topWindows.title) + @($windowTexts)) -join [Environment]::NewLine
if ($allText -match 'Access violation|List index out of bounds|Read of address|Write of address|Loading Inventory List|did not close properly|try to recover|recover it') { throw 'Toolset is unsafe or still loading; viewport was not captured.' }
if ($viewers.Count -ne 1) { throw "Expected exactly one Area viewer for $expectedArea, found $($viewers.Count)." }

$script:viewports = @()
$viewportEnum = [AuroraViewportProof+EnumWindowsProc]{
  param($hwnd, $lparam)
  if ([AuroraViewportProof]::IsWindowVisible($hwnd) -and (Get-Class $hwnd) -eq 'TScrollBox') {
    $rect = Get-Rect $hwnd
    if ($rect.width -ge 400 -and $rect.height -ge 300) { $script:viewports += [pscustomobject]@{ hwnd=$hwnd; bounds=$rect } }
  }
  return $true
}
[void][AuroraViewportProof]::EnumChildWindows($viewers[0].hwnd, $viewportEnum, [IntPtr]::Zero)
$viewport = @($viewports | Sort-Object { $_.bounds.width * $_.bounds.height } -Descending) | Select-Object -First 1
if ($null -eq $viewport) { throw 'Validated Area viewport was not found.' }

function Get-CaptureIdentity {
  $currentProcesses = @(Get-Process nwtoolset -ErrorAction SilentlyContinue)
  if ($currentProcesses.Count -ne 1 -or $currentProcesses[0].Id -ne $toolsetProcesses[0].Id) { throw 'capture_process_changed' }
  foreach ($ownedHandle in @($moduleWindow.hwnd, $viewers[0].hwnd, $viewport.hwnd)) {
    [uint32]$ownedPid = 0
    [void][AuroraViewportProof]::GetWindowThreadProcessId($ownedHandle, [ref]$ownedPid)
    if ($ownedPid -ne $currentProcesses[0].Id -or -not [AuroraViewportProof]::IsWindowVisible($ownedHandle)) { throw 'capture_window_owner_changed' }
  }
  if ((Get-Class $moduleWindow.hwnd) -ne 'TfrmFrame' -or (Get-Class $viewers[0].hwnd) -ne 'TfrmViewerArea' -or (Get-Class $viewport.hwnd) -ne 'TScrollBox' -or -not [AuroraViewportProof]::IsChild($moduleWindow.hwnd, $viewers[0].hwnd) -or -not [AuroraViewportProof]::IsChild($viewers[0].hwnd, $viewport.hwnd)) { throw 'capture_window_hierarchy_changed' }
  $currentScreen = [System.Windows.Forms.Screen]::FromHandle($moduleWindow.hwnd)
  $currentViewport = Get-Rect $viewport.hwnd
  $currentModuleTitle = Get-Text $moduleWindow.hwnd
  $currentAreaTitle = Get-Text $viewers[0].hwnd
  $currentAreaNormalized = $currentAreaTitle.Trim(); if ($currentAreaNormalized.StartsWith('-')) { $currentAreaNormalized = $currentAreaNormalized.Substring(1).Trim() }
  if (-not $currentModuleTitle.EndsWith(" - $expectedModule", [StringComparison]::OrdinalIgnoreCase) -or -not [String]::Equals($currentAreaNormalized, $expectedArea, [StringComparison]::OrdinalIgnoreCase)) { throw 'capture_target_title_changed' }
  $viewportRectangle = [System.Drawing.Rectangle]::new($currentViewport.left, $currentViewport.top, $currentViewport.width, $currentViewport.height)
  if ($currentScreen.Primary -or $currentScreen.DeviceName -ne $approvedScreenDeviceName -or -not $currentScreen.Bounds.Contains($viewportRectangle)) { throw 'capture_viewport_outside_approved_display' }
  [pscustomobject]@{
    owner = [pscustomobject]@{ pid=[int]$currentProcesses[0].Id; startedAt=$currentProcesses[0].StartTime.ToUniversalTime().ToString('o'); frameHwnd=$moduleWindow.hwnd.ToInt64(); viewerHwnd=$viewers[0].hwnd.ToInt64(); viewportHwnd=$viewport.hwnd.ToInt64() }
    viewport=$currentViewport; moduleTitle=$currentModuleTitle; areaViewerTitle=$currentAreaTitle
    screenDevice=$currentScreen.DeviceName; screenPrimary=$currentScreen.Primary
  }
}
$identityBefore = Get-CaptureIdentity
if (($identityBefore.viewport | ConvertTo-Json -Compress) -ne ($viewport.bounds | ConvertTo-Json -Compress)) { throw 'capture_identity_changed' }
if ($env:AURORA_VIEWPORT_PROOF_BINDING) {
  $captureBinding = $env:AURORA_VIEWPORT_PROOF_BINDING | ConvertFrom-Json
  foreach ($identityField in @('pid', 'frameHwnd')) {
    if ($identityBefore.owner.$identityField -ne $captureBinding.owner.$identityField) { throw 'capture_owner_binding_mismatch' }
  }
  if ($captureBinding.owner.viewportHwnd -and $identityBefore.owner.viewportHwnd -ne $captureBinding.owner.viewportHwnd) { throw 'capture_owner_binding_mismatch' }
  if ($captureBinding.owner.viewerHwnd -and $identityBefore.owner.viewerHwnd -ne $captureBinding.owner.viewerHwnd) { throw 'capture_owner_binding_mismatch' }
  if ([DateTimeOffset]::Parse($identityBefore.owner.startedAt).ToUnixTimeMilliseconds() -ne [DateTimeOffset]::Parse($captureBinding.owner.startedAt).ToUnixTimeMilliseconds()) { throw 'capture_owner_binding_mismatch' }
  if ([DateTimeOffset]::UtcNow -lt [DateTimeOffset]::Parse($captureBinding.notBefore)) { throw 'capture_predates_request' }
}
$captureStartedAt = [DateTime]::UtcNow.ToString('o')

$viewportWidth = [int]$viewport.bounds.width; $viewportHeight = [int]$viewport.bounds.height
$captureMethod = $null
$screenCaptureStatus = 'not_attempted'
$sceneContentStatus = 'unknown'
$windowFromPointVerified = $false
$ownershipBefore = @(); $ownershipAfter = @()
$directBitmap = [System.Drawing.Bitmap]::new($viewportWidth, $viewportHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$directGraphics = [System.Drawing.Graphics]::FromImage($directBitmap)
$sourceDc = [AuroraViewportProof]::GetWindowDC($viewport.hwnd)
try {
  $directHdc = $directGraphics.GetHdc()
  try {
    if ($sourceDc -ne [IntPtr]::Zero -and [AuroraViewportProof]::BitBlt($directHdc, 0, 0, $viewportWidth, $viewportHeight, $sourceDc, 0, 0, 0x00CC0020) -and (Has-SceneVariation $directBitmap)) {
      $directBitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
      $captureMethod = 'read-only BitBlt(GetWindowDC) of validated TScrollBox viewport'
      $sceneContentStatus = 'textured_scene'
    }
  } finally { $directGraphics.ReleaseHdc($directHdc) }
} finally {
  if ($sourceDc -ne [IntPtr]::Zero) { [void][AuroraViewportProof]::ReleaseDC($viewport.hwnd, $sourceDc) }
  $directGraphics.Dispose(); $directBitmap.Dispose()
}
if ($null -eq $captureMethod) {
  $inset = 32
  $probeOffsets = @(
    [pscustomobject]@{ x=$inset; y=$inset },
    [pscustomobject]@{ x=$viewportWidth-$inset; y=$inset },
    [pscustomobject]@{ x=[int]($viewportWidth/2); y=[int]($viewportHeight/2) },
    [pscustomobject]@{ x=$inset; y=$viewportHeight-$inset },
    [pscustomobject]@{ x=$viewportWidth-$inset; y=$viewportHeight-$inset }
  )
  function Read-ViewportPointOwnership {
   foreach ($offset in $probeOffsets) {
    $probePoint = New-Object 'AuroraViewportProof+POINT'
    $probePoint.X = [int]$viewport.bounds.left + [int]$offset.x
    $probePoint.Y = [int]$viewport.bounds.top + [int]$offset.y
    $probeHandle = [AuroraViewportProof]::WindowFromPoint($probePoint)
    [uint32]$probeProcessId = 0
    if ($probeHandle -ne [IntPtr]::Zero) { [void][AuroraViewportProof]::GetWindowThreadProcessId($probeHandle, [ref]$probeProcessId) }
    $probeIsExpectedViewport = $probeHandle -eq $viewport.hwnd -or [AuroraViewportProof]::IsChild($viewport.hwnd, $probeHandle)
    [pscustomobject]@{ x=[int]$offset.x; y=[int]$offset.y; hwnd=$probeHandle.ToInt64(); ownerPid=[int]$probeProcessId; owned=($probeIsExpectedViewport -and ($processIds -contains $probeProcessId)) }
   }
  }
  $ownershipBefore = @(Read-ViewportPointOwnership)
  $probeMismatches = @($ownershipBefore | Where-Object { -not $_.owned })
  if ($probeMismatches.Count -eq 0) {
    $screenBitmap = [System.Drawing.Bitmap]::new($viewportWidth, $viewportHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $screenGraphics = [System.Drawing.Graphics]::FromImage($screenBitmap)
    try {
      $screenGraphics.CopyFromScreen([int]$viewport.bounds.left, [int]$viewport.bounds.top, 0, 0, ([System.Drawing.Size]::new($viewportWidth, $viewportHeight)))
      $ownershipAfter = @(Read-ViewportPointOwnership)
      if (($ownershipBefore | ConvertTo-Json -Compress) -ne ($ownershipAfter | ConvertTo-Json -Compress) -or @($ownershipAfter | Where-Object { -not $_.owned }).Count -gt 0) { throw 'capture_physical_ownership_changed' }
      $windowFromPointVerified = $true
      $hasSceneVariation = Has-SceneVariation $screenBitmap
      if ($hasSceneVariation -or $allowUniformScene) {
        $screenBitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $captureMethod = if ($hasSceneVariation) {
          'physical-pixel capture of validated TScrollBox rectangle after WindowFromPoint ownership verification'
        } else {
          'physical-pixel capture of validated TScrollBox rectangle in explicitly permitted uniform-state evidence mode'
        }
        $sceneContentStatus = if ($hasSceneVariation) { 'textured_scene' } else { 'uniform_scene_state' }
        $screenCaptureStatus = if ($hasSceneVariation) { 'saved' } else { 'saved_uniform_state' }
      } else {
        $screenCaptureStatus = 'validated_viewport_but_uniform_pixels'
      }
    } finally { $screenGraphics.Dispose(); $screenBitmap.Dispose() }
  } else {
    $screenCaptureStatus = "window_from_point_mismatch: $($probeMismatches -join ';')"
  }
}
if ($null -eq $captureMethod) {
  $captureWindow = $viewers[0]
  $captureWidth = [int]$captureWindow.bounds.width; $captureHeight = [int]$captureWindow.bounds.height
  $viewportX = [int]$viewport.bounds.left - [int]$captureWindow.bounds.left
  $viewportY = [int]$viewport.bounds.top - [int]$captureWindow.bounds.top
  if ($viewportX -lt 0 -or $viewportY -lt 0 -or ($viewportX + $viewportWidth) -gt $captureWidth -or ($viewportY + $viewportHeight) -gt $captureHeight) { throw 'Viewport bounds are outside the validated Area viewer frame.' }
  $captureBitmap = [System.Drawing.Bitmap]::new($captureWidth, $captureHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $captureGraphics = [System.Drawing.Graphics]::FromImage($captureBitmap)
  $captureHdc = $captureGraphics.GetHdc()
  try {
    if (-not [AuroraViewportProof]::PrintWindow($captureWindow.hwnd, $captureHdc, 2)) { throw 'PrintWindow failed for the validated Area viewer frame.' }
  } finally { $captureGraphics.ReleaseHdc($captureHdc); $captureGraphics.Dispose() }
  $viewportBitmap = [System.Drawing.Bitmap]::new($viewportWidth, $viewportHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $viewportGraphics = [System.Drawing.Graphics]::FromImage($viewportBitmap)
  try {
    $sourceRect = [System.Drawing.Rectangle]::new($viewportX, $viewportY, $viewportWidth, $viewportHeight)
    $destinationRect = [System.Drawing.Rectangle]::new(0, 0, $viewportWidth, $viewportHeight)
    $viewportGraphics.DrawImage($captureBitmap, $destinationRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
    if (-not (Has-SceneVariation $viewportBitmap)) {
      $blockerCode = if ($screenCaptureStatus.StartsWith('window_from_point_mismatch')) { 'toolset_viewport_obscured_by_foreground_window' } else { 'toolset_viewport_scene_pixels_unavailable' }
      throw ($blockerCode + ': physicalFallback=' + $screenCaptureStatus)
    }
    $viewportBitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $captureMethod = 'read-only PrintWindow of validated Area viewer frame cropped to TScrollBox viewport'
  } finally { $viewportGraphics.Dispose(); $viewportBitmap.Dispose(); $captureBitmap.Dispose() }
}

$capturedAt = [DateTime]::UtcNow.ToString('o')
$identityAfter = Get-CaptureIdentity
if (($identityBefore | ConvertTo-Json -Depth 8 -Compress) -ne ($identityAfter | ConvertTo-Json -Depth 8 -Compress)) { throw 'capture_identity_changed' }
[pscustomobject]@{
  ok=$true; moduleTitle=$identityBefore.moduleTitle; areaViewerTitle=$identityBefore.areaViewerTitle; viewport=$identityBefore.viewport; pngPath=$outPath
  captureStartedAt=$captureStartedAt; capturedAt=$capturedAt; owner=$identityBefore.owner; identityBefore=$identityBefore; identityAfter=$identityAfter
  sceneContentStatus=$sceneContentStatus
  safety=[pscustomobject]@{ usesGlobalCursor=$false; usesGlobalKeyboard=$false; usesGlobalMouse=$false; validatedTScrollBox=$true; windowFromPointVerified=$windowFromPointVerified; method=$captureMethod; approvedPhysicalScreenDevice=$approvedScreenDeviceName; moduleScreenDevice=$moduleScreen.DeviceName; moduleScreenPrimary=$moduleScreen.Primary }
  physicalOwnership=if ($captureMethod.StartsWith('physical-pixel')) { [pscustomobject]@{ before=$ownershipBefore; after=$ownershipAfter; allStable=$windowFromPointVerified } } else { $null }
} | ConvertTo-Json -Depth 8 -Compress
`;
  const result = runPowerShell(source, {
    AURORA_VIEWPORT_PROOF_MODULE: module,
    AURORA_VIEWPORT_PROOF_AREA: area.toLowerCase(),
    AURORA_VIEWPORT_PROOF_OUT: outPath,
    // The user-facing second monitor is the left, non-primary monitor. Windows
    // labels that monitor DISPLAY1 on this workstation, so never infer it from
    // a display number or from a window's coordinate sign.
    AURORA_VIEWPORT_PROOF_SCREEN_DEVICE: "\\\\.\\DISPLAY1",
    AURORA_VIEWPORT_PROOF_ALLOW_UNIFORM_SCENE: allowUniformScene ? "1" : "0",
    AURORA_VIEWPORT_PROOF_BINDING: requestBinding ? JSON.stringify(requestBinding) : "",
  });
  return finalizeViewportCapture(result, readFileSync(outPath), requestBinding);
}

function compareImages({ beforePath, afterPath }) {
  const source = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$beforePath = $env:AURORA_VIEWPORT_PROOF_BEFORE
$afterPath = $env:AURORA_VIEWPORT_PROOF_AFTER
$before = [System.Drawing.Bitmap]::new($beforePath)
$after = [System.Drawing.Bitmap]::new($afterPath)
try {
  if ($before.Width -ne $after.Width -or $before.Height -ne $after.Height) { throw "Image dimensions differ: $($before.Width)x$($before.Height) vs $($after.Width)x$($after.Height)." }
  $step = 2; $samples = 0; $changed = 0; $sumDelta = 0.0; $maxDelta = 0
  for ($y = 0; $y -lt $before.Height; $y += $step) {
    for ($x = 0; $x -lt $before.Width; $x += $step) {
      $a = $before.GetPixel($x, $y); $b = $after.GetPixel($x, $y)
      $delta = [Math]::Abs([int]$a.R - [int]$b.R) + [Math]::Abs([int]$a.G - [int]$b.G) + [Math]::Abs([int]$a.B - [int]$b.B)
      $samples += 1; $sumDelta += $delta; if ($delta -gt $maxDelta) { $maxDelta = $delta }; if ($delta -ge 24) { $changed += 1 }
    }
  }
  [pscustomobject]@{
    ok=$true; dimensions=[pscustomobject]@{ width=$before.Width; height=$before.Height }; sampleStep=$step; sampleCount=$samples; changedSamples=$changed
    changedRatio=[Math]::Round($changed / [double]$samples, 6); meanRgbDelta=[Math]::Round($sumDelta / [double]$samples, 4); maxRgbDelta=$maxDelta
  } | ConvertTo-Json -Compress
} finally { $before.Dispose(); $after.Dispose() }
`;
  return runPowerShell(source, {
    AURORA_VIEWPORT_PROOF_BEFORE: beforePath,
    AURORA_VIEWPORT_PROOF_AFTER: afterPath,
  });
}

function runPowerShell(source, env) {
  const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
    encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 1024 * 1024 * 2, timeout: 30000, windowsHide: true,
  }).trim();
  return JSON.parse(output);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
    result[token.slice(2)] = value; index += 1;
  }
  return result;
}

function booleanOption(value) {
  return String(value ?? "").trim().toLowerCase() === "true";
}

function requiredText(value, name) {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`${name} is required.`);
  return result;
}

function requiredPath(value, name) { return resolve(requiredText(value, name)); }

function requiredExistingPath(value, name) {
  const path = requiredPath(value, name);
  if (!existsSync(path)) throw new Error(`${name} does not exist: ${path}`);
  return path;
}
