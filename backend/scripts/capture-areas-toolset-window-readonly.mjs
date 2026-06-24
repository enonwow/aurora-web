#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");

const EXPECTED_MODULE_FILE_NAME = "the_last_city - codex.mod";
const EXPECTED_MODULE_NAME_PARTS = ["the_last_city", "codex.mod"];
const EXPECTED_AREA_RESREF = "_ikea";
const ARTIFACT_DIR = resolve(repoRoot, "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture");
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
const captureFileName = `toolset-readonly-window-capture-${timestamp}.png`;
const capturePath = resolve(ARTIFACT_DIR, captureFileName);
const manifestPath = resolve(ARTIFACT_DIR, "toolset-readonly-window-capture-manifest.json");

function toRepoPath(path) {
  return path.replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function writeManifest(manifest) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function buildFailureManifest(code, details) {
  return {
    version: "aurora-toolset-readonly-window-capture/v1",
    capturedAt: new Date().toISOString(),
    status: "blocked",
    safety: {
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouseWheel: false,
      usesGlobalDrag: false,
      sendsWindowMessages: false,
      method: "read-only Win32 window enumeration and PrintWindow capture",
    },
    expected: {
      module: EXPECTED_MODULE_FILE_NAME,
      area: EXPECTED_AREA_RESREF,
    },
    context: {
      canRunVisualComparison: false,
      contextMismatch: true,
      blockerCode: code,
      details,
    },
    capture: {
      attempted: false,
      success: false,
      pngPath: null,
      pngBytes: 0,
      promotesVisualParity: false,
    },
  };
}

function runReadonlyCapture() {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
[void][System.Reflection.Assembly]::LoadWithPartialName('System.Drawing')
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class AuroraToolsetReadonlyCapture {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool IsHungAppWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

  [DllImport("user32.dll")]
  public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdcBlt, uint nFlags);

  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }
}
'@

$expectedModule = $env:AURORA_TOOLSET_EXPECTED_MODULE
$expectedArea = $env:AURORA_TOOLSET_EXPECTED_AREA
$capturePath = $env:AURORA_TOOLSET_CAPTURE_PATH

function Get-WindowProbeInfo {
  param([IntPtr]$Handle)

  $titleBuilder = New-Object System.Text.StringBuilder 512
  [void][AuroraToolsetReadonlyCapture]::GetWindowText($Handle, $titleBuilder, $titleBuilder.Capacity)
  $classBuilder = New-Object System.Text.StringBuilder 256
  [void][AuroraToolsetReadonlyCapture]::GetClassName($Handle, $classBuilder, $classBuilder.Capacity)
  [uint32]$windowProcessId = 0
  [void][AuroraToolsetReadonlyCapture]::GetWindowThreadProcessId($Handle, [ref]$windowProcessId)
  $processName = $null
  try {
    $processName = (Get-Process -Id $windowProcessId -ErrorAction Stop).ProcessName
  } catch {
    $processName = $null
  }

  [AuroraToolsetReadonlyCapture+RECT]$rect = New-Object 'AuroraToolsetReadonlyCapture+RECT'
  [void][AuroraToolsetReadonlyCapture]::GetWindowRect($Handle, [ref]$rect)
  $title = $titleBuilder.ToString()
  $loadedModule = $null
  if ($title -like '*Neverwinter Nights Toolset*') {
    $separator = ' - '
    $separatorIndex = $title.IndexOf($separator)
    if ($separatorIndex -ge 0) {
      $loadedModule = $title.Substring($separatorIndex + $separator.Length).Trim()
      if ($loadedModule.Length -eq 0) {
        $loadedModule = $null
      }
    }
  }

  [pscustomobject]@{
    hwnd = $Handle.ToInt64()
    title = $title
    loadedModule = $loadedModule
    expectedModuleMatched = ($title -like '*the_last_city*' -and $title -like '*codex.mod*')
    className = $classBuilder.ToString()
    processId = $windowProcessId
    processName = $processName
    visible = [AuroraToolsetReadonlyCapture]::IsWindowVisible($Handle)
    responding = -not [AuroraToolsetReadonlyCapture]::IsHungAppWindow($Handle)
    bounds = [pscustomobject]@{
      left = $rect.Left
      top = $rect.Top
      width = $rect.Right - $rect.Left
      height = $rect.Bottom - $rect.Top
    }
  }
}

function Get-MatchingChildWindows {
  param([IntPtr]$ParentHandle)

  $script:auroraReadonlyChildCount = 0
  $script:auroraReadonlyMatchingChildren = @()
  $childCallback = [AuroraToolsetReadonlyCapture+EnumWindowsProc]{
    param([IntPtr]$childHandle, [IntPtr]$lParam)
    $script:auroraReadonlyChildCount += 1
    $childInfo = Get-WindowProbeInfo -Handle $childHandle
    $matchesAreaTitle = $childInfo.title -like "*$expectedArea*"
    $matchesAreaClass = @('TfrmViewerArea', 'TScrollBox', 'TTabSheet') -contains $childInfo.className
    if ($matchesAreaTitle -or $matchesAreaClass) {
      $script:auroraReadonlyMatchingChildren += $childInfo
    }
    return $true
  }

  [void][AuroraToolsetReadonlyCapture]::EnumChildWindows($ParentHandle, $childCallback, [IntPtr]::Zero)
  [pscustomobject]@{
    childWindowCount = $script:auroraReadonlyChildCount
    matchingChildren = @($script:auroraReadonlyMatchingChildren)
  }
}

function Save-WindowPrintWindowPng {
  param(
    [IntPtr]$Handle,
    [string]$Path,
    [int]$Width,
    [int]$Height
  )

  if ($Width -le 0 -or $Height -le 0) {
    throw "Target window has non-positive capture bounds width=$Width height=$Height."
  }

  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $hdc = $graphics.GetHdc()
  $printWindowOk = $false
  try {
    $printWindowOk = [AuroraToolsetReadonlyCapture]::PrintWindow($Handle, $hdc, 2)
  } finally {
    $graphics.ReleaseHdc($hdc)
    $graphics.Dispose()
  }

  if (-not $printWindowOk) {
    $bitmap.Dispose()
    throw "PrintWindow returned false for hwnd=$($Handle.ToInt64())."
  }

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

$script:auroraReadonlyTopLevelWindows = @()
$topLevelCallback = [AuroraToolsetReadonlyCapture+EnumWindowsProc]{
  param([IntPtr]$windowHandle, [IntPtr]$lParam)
  if (-not [AuroraToolsetReadonlyCapture]::IsWindowVisible($windowHandle)) {
    return $true
  }
  $windowInfo = Get-WindowProbeInfo -Handle $windowHandle
  if ($windowInfo.processName -eq 'nwtoolset' -or $windowInfo.title -like '*Neverwinter Nights Toolset*') {
    $script:auroraReadonlyTopLevelWindows += $windowInfo
  }
  return $true
}

[void][AuroraToolsetReadonlyCapture]::EnumWindows($topLevelCallback, [IntPtr]::Zero)

$enrichedWindows = foreach ($windowInfo in $script:auroraReadonlyTopLevelWindows) {
  $childProbeError = $null
  if ($windowInfo.expectedModuleMatched) {
    try {
      $children = Get-MatchingChildWindows -ParentHandle ([IntPtr]$windowInfo.hwnd)
    } catch {
      $childProbeError = $_.Exception.Message
      $children = [pscustomobject]@{
        childWindowCount = 0
        matchingChildren = @()
      }
    }
  } else {
    $children = [pscustomobject]@{
      childWindowCount = 0
      matchingChildren = @()
    }
  }

  [pscustomobject]@{
    hwnd = $windowInfo.hwnd
    title = $windowInfo.title
    loadedModule = $windowInfo.loadedModule
    expectedModuleMatched = $windowInfo.expectedModuleMatched
    className = $windowInfo.className
    processId = $windowInfo.processId
    processName = $windowInfo.processName
    visible = $windowInfo.visible
    responding = $windowInfo.responding
    bounds = $windowInfo.bounds
    childWindowCount = $children.childWindowCount
    matchingChildren = @($children.matchingChildren)
    childProbeError = $childProbeError
  }
}

$capturableWindows = @($enrichedWindows | Where-Object {
  $_.bounds.width -gt 0 -and $_.bounds.height -gt 0 -and $_.responding
})
$expectedModuleWindow = @($capturableWindows | Where-Object { $_.expectedModuleMatched }) | Select-Object -First 1
$loadedModuleWindow = @($capturableWindows | Where-Object { $_.loadedModule }) | Select-Object -First 1
$targetWindow = $expectedModuleWindow
if ($null -eq $targetWindow) {
  $targetWindow = $loadedModuleWindow
}
if ($null -eq $targetWindow) {
  $targetWindow = @($capturableWindows) | Select-Object -First 1
}

$areaViewerOpen = $false
$viewportObserved = $false
if ($null -ne $expectedModuleWindow) {
  foreach ($child in @($expectedModuleWindow.matchingChildren)) {
    if ($child.className -eq 'TfrmViewerArea' -and $child.title -like "*$expectedArea*") {
      $areaViewerOpen = $true
    }
    if ($child.className -eq 'TScrollBox') {
      $viewportObserved = $true
    }
  }
}

$loadedModule = $null
if ($null -ne $expectedModuleWindow) {
  $loadedModule = $expectedModuleWindow.loadedModule
} elseif ($null -ne $loadedModuleWindow) {
  $loadedModule = $loadedModuleWindow.loadedModule
}

$canRunVisualComparison = $false
if ($null -ne $expectedModuleWindow -and $areaViewerOpen -and $viewportObserved) {
  $canRunVisualComparison = $true
}

$blockerCode = $null
if (-not $canRunVisualComparison) {
  if (@($enrichedWindows).Count -eq 0) {
    $blockerCode = 'no_visible_toolset_window'
  } elseif ($null -eq $targetWindow) {
    $blockerCode = 'no_capturable_toolset_window'
  } elseif ($null -eq $expectedModuleWindow -and $null -ne $loadedModule) {
    $blockerCode = 'loaded_module_mismatch'
  } elseif ($null -eq $expectedModuleWindow) {
    $blockerCode = 'missing_loaded_module_window'
  } elseif (-not $areaViewerOpen) {
    $blockerCode = 'missing_ikea_area_viewer'
  } elseif (-not $viewportObserved) {
    $blockerCode = 'missing_ikea_viewport_scrollbox'
  }
}

$capture = [pscustomobject]@{
  attempted = $false
  success = $false
  method = 'PrintWindow(PW_RENDERFULLCONTENT)'
  pngPath = $null
  pngBytes = 0
  contextMismatch = -not $canRunVisualComparison
  promotesVisualParity = $false
  blockerCode = $null
}

if ($null -ne $targetWindow) {
  $capture.attempted = $true
  try {
    Save-WindowPrintWindowPng -Handle ([IntPtr]$targetWindow.hwnd) -Path $capturePath -Width $targetWindow.bounds.width -Height $targetWindow.bounds.height
    $capture.success = $true
    $capture.pngPath = $capturePath
    $capture.pngBytes = (Get-Item -LiteralPath $capturePath).Length
  } catch {
    $capture.blockerCode = 'readonly_printwindow_capture_failed'
    $capture.failure = $_.Exception.Message
  }
} else {
  $capture.blockerCode = $blockerCode
}

[pscustomobject]@{
  version = 'aurora-toolset-readonly-window-capture/v1'
  capturedAt = (Get-Date).ToUniversalTime().ToString('o')
  status = if ($capture.success) { 'captured' } else { 'blocked' }
  safety = [pscustomobject]@{
    usesGlobalCursor = $false
    usesGlobalKeyboard = $false
    usesGlobalMouseWheel = $false
    usesGlobalDrag = $false
    sendsWindowMessages = $false
    method = 'read-only Win32 EnumWindows/EnumChildWindows plus PrintWindow'
  }
  expected = [pscustomobject]@{
    module = $expectedModule
    area = $expectedArea
  }
  context = [pscustomobject]@{
    canRunVisualComparison = $canRunVisualComparison
    contextMismatch = -not $canRunVisualComparison
    loadedModule = $loadedModule
    expectedModule = $expectedModule
    areaViewerOpen = $areaViewerOpen
    expectedArea = $expectedArea
    viewportObserved = $viewportObserved
    blockerCode = $blockerCode
  }
  capture = $capture
  targetWindow = $targetWindow
  topLevelToolsetWindows = @($enrichedWindows)
} | ConvertTo-Json -Depth 10 -Compress
`;

  const raw = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8",
    env: {
      ...process.env,
      AURORA_TOOLSET_CAPTURE_PATH: capturePath,
      AURORA_TOOLSET_EXPECTED_MODULE: EXPECTED_MODULE_FILE_NAME,
      AURORA_TOOLSET_EXPECTED_AREA: EXPECTED_AREA_RESREF,
    },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30000,
    windowsHide: true,
  }).trim();

  return JSON.parse(raw);
}

let manifest;
try {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  manifest = runReadonlyCapture();
  if (manifest.capture?.success) {
    manifest.capture.pngPath = toRepoPath(capturePath);
    manifest.capture.pngBytes = statSync(capturePath).size;
  }
} catch (error) {
  manifest = buildFailureManifest("readonly_capture_script_failed", error instanceof Error ? error.message : String(error));
}

manifest.manifestPath = toRepoPath(manifestPath);
writeManifest(manifest);

console.log(
  JSON.stringify(
    {
      status: manifest.status,
      captureSuccess: manifest.capture?.success === true,
      pngPath: manifest.capture?.pngPath ?? null,
      pngBytes: manifest.capture?.pngBytes ?? 0,
      canRunVisualComparison: manifest.context?.canRunVisualComparison === true,
      contextMismatch: manifest.context?.contextMismatch !== false,
      loadedModule: manifest.context?.loadedModule ?? null,
      expectedModule: EXPECTED_MODULE_FILE_NAME,
      areaViewerOpen: manifest.context?.areaViewerOpen === true,
      expectedArea: EXPECTED_AREA_RESREF,
      blockerCode: manifest.context?.blockerCode ?? manifest.capture?.blockerCode ?? null,
      manifestPath: toRepoPath(manifestPath),
    },
    null,
    2,
  ),
);
