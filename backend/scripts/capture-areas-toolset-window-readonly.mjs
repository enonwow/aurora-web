#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");

const options = parseArgs(process.argv.slice(2));
const EXPECTED_MODULE_FILE_NAME =
  options.expectedModule ?? process.env.AURORA_TOOLSET_EXPECTED_MODULE ?? "the_last_city - codex.mod";
const EXPECTED_MODULE_NAME_PARTS = (
  options.expectedModuleParts ?? process.env.AURORA_TOOLSET_EXPECTED_MODULE_PARTS ?? "the_last_city|codex.mod"
)
  .split("|")
  .map((part) => part.trim())
  .filter(Boolean);
const EXPECTED_AREA_RESREF = options.expectedArea ?? process.env.AURORA_TOOLSET_EXPECTED_AREA ?? "_ikea";
const FORCE_PRINT_WINDOW_CAPTURE = options.forcePrintWindow === true || options.forcePrintWindow === "1";
const defaultArtifactDir = resolve(repoRoot, "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture");
const CRITICAL_FAILURE_REGISTRY_PATH = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-critical-failures.json",
);
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
const captureFileName = `toolset-readonly-window-capture-${timestamp}.png`;
const capturePath = options.outPath ? resolve(String(options.outPath)) : resolve(defaultArtifactDir, captureFileName);
const ARTIFACT_DIR = dirname(capturePath);
const manifestPath = options.manifestPath
  ? resolve(String(options.manifestPath))
  : options.outPath
    ? capturePath.replace(/\.png$/iu, ".capture.json")
    : resolve(ARTIFACT_DIR, "toolset-readonly-window-capture-manifest.json");
const EXPECTED_CANDIDATE_QUARANTINE = findExpectedCandidateQuarantine();

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

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

function findExpectedCandidateQuarantine() {
  if (!existsSync(CRITICAL_FAILURE_REGISTRY_PATH)) {
    return null;
  }
  const registry = JSON.parse(readFileSync(CRITICAL_FAILURE_REGISTRY_PATH, "utf8"));
  const records = Array.isArray(registry.records) ? registry.records : [];
  const expected = EXPECTED_MODULE_FILE_NAME.toLowerCase();
  const area = EXPECTED_AREA_RESREF.toLowerCase();
  const match = records.find((record) => record?.status === "rejected" &&
    String(record.moduleBaseName ?? basename(String(record.modulePath ?? ""))).toLowerCase() === expected &&
    String(record.areaResref ?? "").toLowerCase() === area);
  return match ? { moduleBaseName: expected, areaResref: area, reason: match.reason ?? null, registryPath: CRITICAL_FAILURE_REGISTRY_PATH } : null;
}

function runReadonlyCapture({ forcePrintWindow = false } = {}) {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
[void][System.Reflection.Assembly]::LoadWithPartialName('System.Drawing')
[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms')
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
$expectedModuleParts = @($env:AURORA_TOOLSET_EXPECTED_MODULE_PARTS -split '\|' | Where-Object { $_ -ne $null -and $_.Trim().Length -gt 0 })
$expectedArea = $env:AURORA_TOOLSET_EXPECTED_AREA
$capturePath = $env:AURORA_TOOLSET_CAPTURE_PATH
$quarantinedModuleBaseNames = @($env:AURORA_TOOLSET_QUARANTINED_MODULE_BASENAMES -split '\|' | Where-Object { $_ -ne $null -and $_.Trim().Length -gt 0 })
$forcePrintWindow = $env:AURORA_TOOLSET_CAPTURE_FORCE_PRINTWINDOW -eq '1'

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

  $normalizedTitle = $title.ToLowerInvariant()
  $expectedModuleMatched = $true
  foreach ($expectedModulePart in $expectedModuleParts) {
    if (-not $normalizedTitle.Contains($expectedModulePart.ToLowerInvariant())) {
      $expectedModuleMatched = $false
      break
    }
  }

  [pscustomobject]@{
    hwnd = $Handle.ToInt64()
    title = $title
    loadedModule = $loadedModule
    expectedModuleMatched = $expectedModuleMatched
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

function Save-WindowScreenCopyPng {
  param(
    [int]$Left,
    [int]$Top,
    [int]$Width,
    [int]$Height,
    [string]$Path
  )

  if ($Width -le 0 -or $Height -le 0) {
    throw "Target window has non-positive capture bounds width=$Width height=$Height."
  }

  $virtualScreen = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $sourceLeft = [Math]::Max($Left, $virtualScreen.Left)
  $sourceTop = [Math]::Max($Top, $virtualScreen.Top)
  $sourceRight = [Math]::Min($Left + $Width, $virtualScreen.Right)
  $sourceBottom = [Math]::Min($Top + $Height, $virtualScreen.Bottom)
  $copyWidth = $sourceRight - $sourceLeft
  $copyHeight = $sourceBottom - $sourceTop
  if ($copyWidth -le 0 -or $copyHeight -le 0) {
    throw "Target window bounds do not intersect the virtual screen."
  }

  $destX = $sourceLeft - $Left
  $destY = $sourceTop - $Top
  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::Black)
    $graphics.CopyFromScreen($sourceLeft, $sourceTop, $destX, $destY, ([System.Drawing.Size]::new($copyWidth, $copyHeight)))
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Get-DescendantWindowTextSample {
  param(
    [IntPtr]$ParentHandle,
    [int]$Limit = 80
  )

  $script:auroraReadonlyTextSample = @()
  $textCallback = [AuroraToolsetReadonlyCapture+EnumWindowsProc]{
    param([IntPtr]$childHandle, [IntPtr]$lParam)
    if ($script:auroraReadonlyTextSample.Count -ge $Limit) {
      return $false
    }
    $builder = New-Object System.Text.StringBuilder 512
    [void][AuroraToolsetReadonlyCapture]::GetWindowText($childHandle, $builder, $builder.Capacity)
    $text = $builder.ToString()
    if ($text -and $text.Trim().Length -gt 0) {
      $script:auroraReadonlyTextSample += $text
    }
    return $true
  }
  [void][AuroraToolsetReadonlyCapture]::EnumChildWindows($ParentHandle, $textCallback, [IntPtr]::Zero)
  return @($script:auroraReadonlyTextSample)
}

$script:auroraReadonlyTopLevelWindows = @()
$script:auroraReadonlyAllTopLevelWindows = @()
$script:auroraReadonlyTopLevelIndex = 0
$topLevelCallback = [AuroraToolsetReadonlyCapture+EnumWindowsProc]{
  param([IntPtr]$windowHandle, [IntPtr]$lParam)
  if (-not [AuroraToolsetReadonlyCapture]::IsWindowVisible($windowHandle)) {
    return $true
  }
  $script:auroraReadonlyTopLevelIndex += 1
  $windowInfo = Get-WindowProbeInfo -Handle $windowHandle
  $windowInfo | Add-Member -MemberType NoteProperty -Name zOrder -Value $script:auroraReadonlyTopLevelIndex -Force
  $script:auroraReadonlyAllTopLevelWindows += $windowInfo
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
    descendantTextSample = @(Get-DescendantWindowTextSample -ParentHandle ([IntPtr]$windowInfo.hwnd))
    childProbeError = $childProbeError
  }
}

$accessViolationWindows = @($enrichedWindows | Where-Object {
  $texts = @($_.title) + @($_.descendantTextSample)
  $text = $texts -join [Environment]::NewLine
  $text -match 'Access violation|Read of address|Write of address'
})
$staleProgressWindows = @($enrichedWindows | Where-Object {
  $texts = @($_.title) + @($_.descendantTextSample)
  $text = $texts -join [Environment]::NewLine
  $text -match 'Loading Inventory List'
})
$quarantinedModuleWindows = @($enrichedWindows | Where-Object {
  $probeText = @($_.title, $_.loadedModule) -join ' '
  $normalizedProbeText = $probeText.ToLowerInvariant()
  $matches = @($quarantinedModuleBaseNames | Where-Object {
    $normalizedProbeText.Contains($_.ToLowerInvariant())
  })
  $matches.Count -gt 0
})

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
    if ($child.visible -eq $true -and $child.className -eq 'TfrmViewerArea' -and $child.title -like "*$expectedArea*") {
      $areaViewerOpen = $true
    }
    if (
      $child.visible -eq $true -and
      $child.className -eq 'TScrollBox' -and
      $child.bounds.width -ge 400 -and
      $child.bounds.height -ge 300
    ) {
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

function Get-OverlapArea {
  param($LeftBounds, $RightBounds)
  if ($null -eq $LeftBounds -or $null -eq $RightBounds) {
    return 0
  }
  $left = [Math]::Max([int]$LeftBounds.left, [int]$RightBounds.left)
  $top = [Math]::Max([int]$LeftBounds.top, [int]$RightBounds.top)
  $right = [Math]::Min([int]$LeftBounds.left + [int]$LeftBounds.width, [int]$RightBounds.left + [int]$RightBounds.width)
  $bottom = [Math]::Min([int]$LeftBounds.top + [int]$LeftBounds.height, [int]$RightBounds.top + [int]$RightBounds.height)
  if ($right -le $left -or $bottom -le $top) {
    return 0
  }
  return ($right - $left) * ($bottom - $top)
}

$toolsetModalWindows = @()
$obscuringWindows = @()
if ($null -ne $targetWindow) {
  $targetZOrder = 999999
  if ($null -ne $targetWindow.zOrder) {
    $targetZOrder = [int]$targetWindow.zOrder
  }
  $toolsetModalWindows = @($script:auroraReadonlyAllTopLevelWindows | Where-Object {
    $_.hwnd -ne $targetWindow.hwnd -and
    $_.processId -eq $targetWindow.processId -and
    $_.className -notin @('TApplication') -and
    (Get-OverlapArea $_.bounds $targetWindow.bounds) -gt 20000
  })
  $obscuringWindows = @($script:auroraReadonlyAllTopLevelWindows | Where-Object {
    $candidateZOrder = 999999
    if ($null -ne $_.zOrder) {
      $candidateZOrder = [int]$_.zOrder
    }
    $_.hwnd -ne $targetWindow.hwnd -and
    $candidateZOrder -lt $targetZOrder -and
    $_.processId -ne $targetWindow.processId -and
    (Get-OverlapArea $_.bounds $targetWindow.bounds) -gt 20000
  })
}

$blockerCode = $null
if (@($accessViolationWindows).Count -gt 0) {
  $blockerCode = 'toolset_access_violation_modal'
  $canRunVisualComparison = $false
} elseif (@($staleProgressWindows).Count -gt 0) {
  $blockerCode = 'toolset_stale_progress_modal'
  $canRunVisualComparison = $false
} elseif (@($quarantinedModuleWindows).Count -gt 0) {
  $blockerCode = 'toolset_loaded_quarantined_candidate'
  $canRunVisualComparison = $false
} elseif (@($toolsetModalWindows).Count -gt 0) {
  $blockerCode = 'toolset_modal_dialog_open'
  $canRunVisualComparison = $false
} elseif (-not $forcePrintWindow -and @($obscuringWindows).Count -gt 0) {
  $blockerCode = 'toolset_view_obscured_by_foreground_window'
  $canRunVisualComparison = $false
} elseif (-not $canRunVisualComparison) {
  if (@($enrichedWindows).Count -eq 0) {
    $blockerCode = 'no_visible_toolset_window'
  } elseif ($null -eq $targetWindow) {
    $blockerCode = 'no_capturable_toolset_window'
  } elseif ($null -eq $expectedModuleWindow -and $null -ne $loadedModule) {
    $blockerCode = 'loaded_module_mismatch'
  } elseif ($null -eq $expectedModuleWindow) {
    $blockerCode = 'missing_loaded_module_window'
  } elseif (-not $areaViewerOpen) {
    $blockerCode = 'missing_' + $expectedArea + '_area_viewer'
  } elseif (-not $viewportObserved) {
    $blockerCode = 'missing_' + $expectedArea + '_viewport_scrollbox'
  }
}

$capture = [pscustomobject]@{
  attempted = $false
  success = $false
  method = 'Graphics.CopyFromScreen(window bounds)'
  pngPath = $null
  pngBytes = 0
  contextMismatch = -not $canRunVisualComparison
  promotesVisualParity = $false
  blockerCode = $blockerCode
  screenCopyFailure = $null
  forcedPrintWindow = $false
  failure = $null
}

if ($null -ne $targetWindow -and $null -eq $blockerCode) {
  $capture.attempted = $true
  if ($forcePrintWindow) {
    try {
      $capture.method = 'PrintWindow(PW_RENDERFULLCONTENT)'
      Save-WindowPrintWindowPng -Handle ([IntPtr]$targetWindow.hwnd) -Path $capturePath -Width $targetWindow.bounds.width -Height $targetWindow.bounds.height
      $capture.success = $null -eq $blockerCode
      $capture.pngPath = $capturePath
      $capture.pngBytes = (Get-Item -LiteralPath $capturePath).Length
      $capture.forcedPrintWindow = $true
    } catch {
      $capture.blockerCode = 'readonly_window_capture_failed'
      $capture.failure = "PrintWindow failed: $($_.Exception.Message)"
    }
  } else {
    try {
      Save-WindowScreenCopyPng -Left $targetWindow.bounds.left -Top $targetWindow.bounds.top -Width $targetWindow.bounds.width -Height $targetWindow.bounds.height -Path $capturePath
      $capture.success = $null -eq $blockerCode
      $capture.pngPath = $capturePath
      $capture.pngBytes = (Get-Item -LiteralPath $capturePath).Length
    } catch {
      $screenCopyFailure = $_.Exception.Message
      try {
        $capture.method = 'PrintWindow(PW_RENDERFULLCONTENT)'
        Save-WindowPrintWindowPng -Handle ([IntPtr]$targetWindow.hwnd) -Path $capturePath -Width $targetWindow.bounds.width -Height $targetWindow.bounds.height
        $capture.success = $null -eq $blockerCode
        $capture.pngPath = $capturePath
        $capture.pngBytes = (Get-Item -LiteralPath $capturePath).Length
        $capture.screenCopyFailure = $screenCopyFailure
      } catch {
        $capture.blockerCode = 'readonly_window_capture_failed'
        $capture.failure = "CopyFromScreen failed: $screenCopyFailure; PrintWindow failed: $($_.Exception.Message)"
      }
    }
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
    method = 'read-only Win32 EnumWindows/EnumChildWindows plus CopyFromScreen/PrintWindow capture'
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
    accessViolationWindows = @($accessViolationWindows)
    staleProgressWindows = @($staleProgressWindows)
    quarantinedModuleWindows = @($quarantinedModuleWindows)
    toolsetModalWindows = @($toolsetModalWindows)
    obscuringWindows = @($obscuringWindows)
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
      AURORA_TOOLSET_EXPECTED_MODULE_PARTS: EXPECTED_MODULE_NAME_PARTS.join("|"),
      AURORA_TOOLSET_EXPECTED_AREA: EXPECTED_AREA_RESREF,
      AURORA_TOOLSET_QUARANTINED_MODULE_BASENAMES: EXPECTED_CANDIDATE_QUARANTINE ? EXPECTED_MODULE_FILE_NAME : "",
      AURORA_TOOLSET_CAPTURE_FORCE_PRINTWINDOW: forcePrintWindow ? "1" : "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30000,
    windowsHide: true,
  }).trim();

  return JSON.parse(raw);
}

function analyzeCaptureImageSanity(path) {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$path = $env:AURORA_TOOLSET_CAPTURE_SANITY_PATH
$bitmap = [System.Drawing.Bitmap]::new((Resolve-Path -LiteralPath $path).Path)
try {
  $step = [Math]::Max(1, [int]([Math]::Min($bitmap.Width, $bitmap.Height) / 220))
  $total = 0
  $neutral = 0
  $chrome = 0
  $neon = 0
  $dark = 0
  $bright = 0
  for ($y = 0; $y -lt $bitmap.Height; $y += $step) {
    for ($x = 0; $x -lt $bitmap.Width; $x += $step) {
      $pixel = $bitmap.GetPixel($x, $y)
      $r = [int]$pixel.R
      $g = [int]$pixel.G
      $b = [int]$pixel.B
      $luma = 0.2126 * $r + 0.7152 * $g + 0.0722 * $b
      $max = [Math]::Max($r, [Math]::Max($g, $b))
      $min = [Math]::Min($r, [Math]::Min($g, $b))
      $saturation = if ($max -eq 0) { 0 } else { ($max - $min) / $max }
      $total += 1
      if ([Math]::Abs($r - $g) -le 8 -and [Math]::Abs($g - $b) -le 8 -and $luma -ge 95 -and $luma -le 235) {
        $neutral += 1
      }
      if ([Math]::Abs($r - $g) -le 14 -and [Math]::Abs($g - $b) -le 14 -and $luma -ge 135 -and $luma -le 230) {
        $chrome += 1
      }
      if ($saturation -ge 0.45 -and (($b -gt 135 -and $r -lt 120) -or ($r -gt 170 -and $b -gt 120))) {
        $neon += 1
      }
      if ($luma -lt 35) {
        $dark += 1
      }
      if ($luma -gt 230) {
        $bright += 1
      }
    }
  }
  [pscustomobject]@{
    width = $bitmap.Width
    height = $bitmap.Height
    sampleStep = $step
    sampleCount = $total
    neutralRatio = if ($total -gt 0) { $neutral / $total } else { 0 }
    chromeNeutralRatio = if ($total -gt 0) { $chrome / $total } else { 0 }
    neonRatio = if ($total -gt 0) { $neon / $total } else { 0 }
    darkRatio = if ($total -gt 0) { $dark / $total } else { 0 }
    brightRatio = if ($total -gt 0) { $bright / $total } else { 0 }
  } | ConvertTo-Json -Compress
} finally {
  $bitmap.Dispose()
}
`;
  const raw = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8",
    env: {
      ...process.env,
      AURORA_TOOLSET_CAPTURE_SANITY_PATH: path,
    },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30000,
    windowsHide: true,
  }).trim();
  const metrics = JSON.parse(raw);
  const chromeNeutralRatio = Number(metrics.chromeNeutralRatio ?? 0);
  const neutralRatio = Number(metrics.neutralRatio ?? 0);
  const neonRatio = Number(metrics.neonRatio ?? 0);
  const width = Number(metrics.width ?? 0);
  const height = Number(metrics.height ?? 0);
  const blockers = [];
  if (width < 800 || height < 500) {
    blockers.push("capture_bounds_too_small_for_toolset_window");
  }
  if (chromeNeutralRatio < 0.03 && neutralRatio < 0.05) {
    blockers.push("capture_missing_toolset_neutral_chrome");
  }
  if (neonRatio > 0.08 && chromeNeutralRatio < 0.03) {
    blockers.push("capture_matches_neon_wallpaper_or_desktop");
  }
  return {
    ok: blockers.length === 0,
    blockers,
    metrics,
  };
}

if (options.validateCaptureImage) {
  const validationPath = resolve(repoRoot, String(options.validateCaptureImage));
  if (!existsSync(validationPath)) {
    throw new Error(`Capture image does not exist: ${validationPath}`);
  }
  const imageSanity = analyzeCaptureImageSanity(validationPath);
  const blockerCode = imageSanity.blockers[0] ?? null;
  console.log(
    JSON.stringify(
      {
        status: imageSanity.ok ? "passed" : "blocked",
        blockerCode,
        imageSanity,
      },
      null,
      2,
    ),
  );
  process.exit(imageSanity.ok ? 0 : 2);
}

let manifest;
try {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  if (EXPECTED_CANDIDATE_QUARANTINE) {
    manifest = buildFailureManifest("candidate_quarantined_after_toolset_critical_failure", {
      expectedModule: EXPECTED_MODULE_FILE_NAME,
      expectedModuleParts: EXPECTED_MODULE_NAME_PARTS,
      candidateQuarantine: EXPECTED_CANDIDATE_QUARANTINE,
    });
  } else {
    manifest = runReadonlyCapture({ forcePrintWindow: FORCE_PRINT_WINDOW_CAPTURE });
  }
  if (manifest.capture?.success) {
    manifest.capture.pngPath = toRepoPath(capturePath);
    manifest.capture.pngBytes = statSync(capturePath).size;
    const imageSanity = analyzeCaptureImageSanity(capturePath);
    manifest.capture.imageSanity = imageSanity;
    if (!imageSanity.ok) {
      const firstCapture = manifest;
      const fallbackManifest = runReadonlyCapture({ forcePrintWindow: true });
      if (fallbackManifest.capture?.success) {
        fallbackManifest.capture.pngPath = toRepoPath(capturePath);
        fallbackManifest.capture.pngBytes = statSync(capturePath).size;
        fallbackManifest.capture.screenCopyImageSanity = imageSanity;
        fallbackManifest.capture.screenCopyFallbackReason =
          imageSanity.blockers[0] ?? "capture_image_sanity_failed";
        fallbackManifest.capture.imageSanity = analyzeCaptureImageSanity(capturePath);
        manifest = fallbackManifest;
      } else {
        manifest.capture.printWindowFallback = {
          attempted: true,
          success: false,
          blockerCode: fallbackManifest.capture?.blockerCode ?? fallbackManifest.context?.blockerCode ?? "readonly_window_capture_failed",
          failure: fallbackManifest.capture?.failure ?? null
        };
      }
      if (!manifest.capture?.imageSanity?.ok) {
        const blockerCode =
          manifest.capture?.imageSanity?.blockers?.[0] ??
          firstCapture.capture?.imageSanity?.blockers?.[0] ??
          "capture_image_sanity_failed";
        manifest.status = "blocked";
        manifest.context = {
          ...(manifest.context ?? {}),
          canRunVisualComparison: false,
          contextMismatch: true,
          blockerCode,
        };
        manifest.capture.success = false;
        manifest.capture.promotesVisualParity = false;
        manifest.capture.blockerCode = blockerCode;
      }
    }
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
