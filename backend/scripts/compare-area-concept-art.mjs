#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");

const AREA_RESREF = "cdx_mapflat01";
const AREA_NAME = "Ostatnie Miasto - Port, Mieszkanie Kartografa";
const DEFAULT_CONCEPT_PATH = resolve(
  repoRoot,
  "docs/assets/last-city/last-city-cartographer-apartment-concept-2026-07-02.png"
);
const DEFAULT_MANIFEST_PATH = resolve(
  repoRoot,
  "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-manifest.json"
);
const DEFAULT_OUT_DIR = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison"
);
const DEFAULT_PLACEABLE_MAP_PATH = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map/placeable-usage-map.json"
);
const DEFAULT_PLACEABLE_INSTANCES_PATH = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map/placeable-instances.csv"
);
const DEFAULT_AREA_SUMMARY_PATH = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/last-city-apartment-area/summary.json"
);

const options = parseArgs(process.argv.slice(2));
const conceptPath = resolveMaybeAbsolute(options.concept ?? DEFAULT_CONCEPT_PATH);
const manifestPath = resolveMaybeAbsolute(options.manifest ?? DEFAULT_MANIFEST_PATH);
const manifest = readOptionalJson(manifestPath);
const manifestStatus = getManifestTargetStatus(manifest);
if (!options.toolset && !manifestStatus.ok) {
  throw new Error(
    [
      "Default Toolset capture manifest does not describe the target area.",
      `expectedArea=${AREA_RESREF}`,
      `manifestArea=${manifestStatus.expectedArea ?? "unknown"}`,
      `areaViewerOpen=${manifestStatus.areaViewerOpen}`,
      `canRunVisualComparison=${manifestStatus.canRunVisualComparison}`,
      `contextMismatch=${manifestStatus.contextMismatch}`,
      `manifest=${manifestPath}`
    ].join(" ")
  );
}
const toolsetPath = resolveMaybeAbsolute(
  options.toolset ?? resolveToolsetScreenshotFromManifest(manifest) ?? ""
);
const outputDir = resolveMaybeAbsolute(options.out ?? DEFAULT_OUT_DIR);
const cropOverride = options.toolsetCrop ? parseCrop(options.toolsetCrop) : null;
const viewerRect = cropOverride || !manifestStatus.ok ? null : getViewerRectFromManifest(manifest);
const placeableMapPath = resolveMaybeAbsolute(options.placeableMap ?? DEFAULT_PLACEABLE_MAP_PATH);
const placeableInstancesPath = resolveMaybeAbsolute(options.placeableInstances ?? DEFAULT_PLACEABLE_INSTANCES_PATH);
const areaSummaryPath = resolveMaybeAbsolute(options.areaSummary ?? DEFAULT_AREA_SUMMARY_PATH);

assertReadableFile(conceptPath, "concept image");
assertReadableFile(toolsetPath, "toolset screenshot");
mkdirSync(outputDir, { recursive: true });

const cropPath = resolve(outputDir, "toolset-viewport-crop.png");
const contactSheetPath = resolve(outputDir, "comparison-contact-sheet.png");
const reportJsonPath = resolve(outputDir, "comparison-report.json");
const reportMarkdownPath = resolve(outputDir, "comparison-report.md");

const imageResult = runImageComparison({
  conceptPath,
  toolsetPath,
  cropPath,
  contactSheetPath,
  cropOverride,
  viewerRect
});
assertUsableToolsetCrop(imageResult, toolsetPath);
const areaSummary = readOptionalJson(areaSummaryPath);
const placeableMap = readOptionalJson(placeableMapPath);
const areaProfile = getAreaProfile(placeableMap, AREA_RESREF);
const areaInstances = readPlaceableInstances(placeableInstancesPath, AREA_RESREF);
const report = buildReport({
  imageResult,
  areaSummary,
  areaProfile,
  areaInstances,
  conceptPath,
  toolsetPath,
  manifestPath,
  outputDir,
  cropPath,
  contactSheetPath
});

writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(reportMarkdownPath, renderMarkdownReport(report), "utf8");

console.log(
  JSON.stringify(
    {
      ok: true,
      area: AREA_RESREF,
      result: report.result,
      score: report.score,
      placeableConceptScore: report.placeableConceptCoverage.score,
      outputs: report.outputs,
      checklist: report.checklist.map((item) => ({
        id: item.id,
        status: item.status
      }))
    },
    null,
    2
  )
);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function resolveMaybeAbsolute(value) {
  if (!value) {
    return value;
  }
  return resolve(repoRoot, value);
}

function assertReadableFile(path, label) {
  if (!path || !existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
  if (!statSync(path).isFile()) {
    throw new Error(`Expected ${label} to be a file: ${path}`);
  }
}

function getManifestTargetStatus(manifest) {
  if (!manifest) {
    return {
      ok: false,
      expectedArea: null,
      areaViewerOpen: false,
      canRunVisualComparison: false,
      contextMismatch: true
    };
  }
  const expectedArea = manifest?.context?.expectedArea ?? manifest?.expected?.area ?? null;
  const areaViewerOpen = manifest?.context?.areaViewerOpen === true;
  const canRunVisualComparison = manifest?.context?.canRunVisualComparison === true;
  const contextMismatch = manifest?.context?.contextMismatch !== false;
  return {
    ok:
      expectedArea === AREA_RESREF &&
      areaViewerOpen &&
      canRunVisualComparison &&
      !contextMismatch,
    expectedArea,
    areaViewerOpen,
    canRunVisualComparison,
    contextMismatch
  };
}

function assertUsableToolsetCrop(imageResult, toolsetPath) {
  const mask = imageResult?.toolsetCropImage?.toolsetArtifactMask;
  if (!mask?.totalPixels) {
    return;
  }
  const maskedRatio = Number(mask.backgroundPixelsMasked ?? 0) / Number(mask.totalPixels);
  const averageLuma = Number(imageResult?.toolsetCropImage?.stats?.averageLuma ?? 0);
  const saturation = Number(imageResult?.toolsetCropImage?.stats?.averageSaturation ?? 0);
  if (maskedRatio >= 0.95 || (averageLuma <= 1 && saturation <= 0.01)) {
    throw new Error(
      [
        "Toolset screenshot crop appears to contain only editor background, not the target area.",
        `toolset=${toolsetPath}`,
        `maskedRatio=${maskedRatio.toFixed(4)}`,
        `averageLuma=${averageLuma.toFixed(2)}`
      ].join(" ")
    );
  }
}

function readOptionalJson(path) {
  if (!path || !existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function resolveToolsetScreenshotFromManifest(manifest) {
  const pngPath = manifest?.capture?.pngPath;
  if (!pngPath) {
    return null;
  }
  return resolve(repoRoot, pngPath.replaceAll("/", "\\"));
}

function getViewerRectFromManifest(manifest) {
  const targetBounds = manifest?.targetWindow?.bounds;
  const children = manifest?.targetWindow?.matchingChildren ?? [];
  if (!targetBounds || !Array.isArray(children)) {
    return null;
  }

  const viewer =
    children.find(
      (child) =>
        child?.className === "TScrollBox" &&
        child?.visible === true &&
        Number(child?.bounds?.width ?? 0) >= 800 &&
        Number(child?.bounds?.height ?? 0) >= 400
    ) ??
    children.find(
      (child) =>
        child?.className === "TfrmViewerArea" &&
        child?.visible === true &&
        Number(child?.bounds?.width ?? 0) >= 800 &&
        Number(child?.bounds?.height ?? 0) >= 400
    );

  if (!viewer?.bounds) {
    return null;
  }

  return {
    x: viewer.bounds.left - targetBounds.left,
    y: viewer.bounds.top - targetBounds.top,
    width: viewer.bounds.width,
    height: viewer.bounds.height,
    sourceClassName: viewer.className
  };
}

function parseCrop(value) {
  const parts = String(value)
    .split(",")
    .map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error(`Invalid --toolsetCrop value. Expected x,y,width,height, got: ${value}`);
  }
  const [x, y, width, height] = parts.map((part) => Math.round(part));
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid --toolsetCrop dimensions: ${value}`);
  }
  return { x, y, width, height, source: "cli_override" };
}

function runImageComparison({ conceptPath, toolsetPath, cropPath, contactSheetPath, cropOverride, viewerRect }) {
  const payload = {
    conceptPath,
    toolsetPath,
    cropPath,
    contactSheetPath,
    cropOverride,
    viewerRect,
    fallbackCrop: { x: 600, y: 288, width: 700, height: 455, source: "fallback_default" }
  };

  const script = String.raw`
$ErrorActionPreference = 'Stop'
[void][System.Reflection.Assembly]::LoadWithPartialName('System.Drawing')
[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms')

$params = $env:AURORA_AREA_COMPARE_PARAMS | ConvertFrom-Json

function New-RectFromObject($rect) {
  if ($null -eq $rect) {
    return $null
  }
  return New-Object System.Drawing.Rectangle ([int]$rect.x), ([int]$rect.y), ([int]$rect.width), ([int]$rect.height)
}

function Clamp-Rect($rect, $width, $height) {
  $x = [Math]::Max(0, [Math]::Min([int]$rect.X, [int]$width - 1))
  $y = [Math]::Max(0, [Math]::Min([int]$rect.Y, [int]$height - 1))
  $right = [Math]::Max($x + 1, [Math]::Min([int]$rect.Right, [int]$width))
  $bottom = [Math]::Max($y + 1, [Math]::Min([int]$rect.Bottom, [int]$height))
  return New-Object System.Drawing.Rectangle $x, $y, ($right - $x), ($bottom - $y)
}

function Test-AreaPixel($color) {
  $r = [int]$color.R
  $g = [int]$color.G
  $b = [int]$color.B
  $max = [Math]::Max($r, [Math]::Max($g, $b))
  $min = [Math]::Min($r, [Math]::Min($g, $b))
  $spread = $max - $min
  $nearBlackEditorVoid = $max -le 10 -and $spread -le 8
  $nearViewerGray = [Math]::Abs($r - 189) -le 28 -and [Math]::Abs($g - 189) -le 28 -and [Math]::Abs($b - 189) -le 28
  $neutralUi = $spread -le 12 -and $max -gt 110
  $lightUi = $spread -le 35 -and $max -gt 210
  if ($nearBlackEditorVoid -or $nearViewerGray -or $neutralUi -or $lightUi) {
    return $false
  }
  return $max -lt 105 -or $spread -gt 24 -or ($r -gt 100 -and $g -lt 105 -and $b -lt 95)
}

function Test-ToolsetBackgroundPixel($color) {
  $r = [int]$color.R
  $g = [int]$color.G
  $b = [int]$color.B
  $max = [Math]::Max($r, [Math]::Max($g, $b))
  $min = [Math]::Min($r, [Math]::Min($g, $b))
  $spread = $max - $min
  $nearViewerGray = $spread -le 18 -and [Math]::Abs($r - 189) -le 42 -and [Math]::Abs($g - 189) -le 42 -and [Math]::Abs($b - 189) -le 42
  $brightPanel = $spread -le 20 -and $min -ge 155
  return $nearViewerGray -or $brightPanel
}

function Test-ToolsetSelectionPixel($color) {
  $r = [int]$color.R
  $g = [int]$color.G
  $b = [int]$color.B
  $pureGreen = $g -ge 180 -and $r -le 90 -and $b -le 120
  $pureRed = $r -ge 170 -and $g -le 95 -and $b -le 95
  $pureCyan = $g -ge 130 -and $b -ge 130 -and $r -le 90
  return $pureGreen -or $pureRed -or $pureCyan
}

function Add-BackgroundCandidate($bitmap, [bool[]]$visited, $queue, [int]$width, [int]$x, [int]$y) {
  $index = ($y * $width) + $x
  if ($visited[$index]) {
    return
  }
  if (-not (Test-ToolsetBackgroundPixel $bitmap.GetPixel($x, $y))) {
    return
  }
  $visited[$index] = $true
  $queue.Enqueue($index)
}

function Mask-ToolsetArtifacts($bitmap) {
  $width = $bitmap.Width
  $height = $bitmap.Height
  $visited = [bool[]]::new($width * $height)
  $queue = [System.Collections.Generic.Queue[int]]::new()

  for ($x = 0; $x -lt $width; $x += 1) {
    Add-BackgroundCandidate $bitmap $visited $queue $width $x 0
    Add-BackgroundCandidate $bitmap $visited $queue $width $x ($height - 1)
  }
  for ($y = 0; $y -lt $height; $y += 1) {
    Add-BackgroundCandidate $bitmap $visited $queue $width 0 $y
    Add-BackgroundCandidate $bitmap $visited $queue $width ($width - 1) $y
  }

  while ($queue.Count -gt 0) {
    $index = $queue.Dequeue()
    $x = $index % $width
    $y = [int][Math]::Floor($index / [double]$width)
    if ($x -gt 0) { Add-BackgroundCandidate $bitmap $visited $queue $width ($x - 1) $y }
    if ($x -lt ($width - 1)) { Add-BackgroundCandidate $bitmap $visited $queue $width ($x + 1) $y }
    if ($y -gt 0) { Add-BackgroundCandidate $bitmap $visited $queue $width $x ($y - 1) }
    if ($y -lt ($height - 1)) { Add-BackgroundCandidate $bitmap $visited $queue $width $x ($y + 1) }
  }

  $black = [System.Drawing.Color]::FromArgb(0, 0, 0)
  $backgroundMasked = 0
  for ($index = 0; $index -lt $visited.Length; $index += 1) {
    if (-not $visited[$index]) {
      continue
    }
    $x = $index % $width
    $y = [int][Math]::Floor($index / [double]$width)
    $bitmap.SetPixel($x, $y, $black)
    $backgroundMasked += 1
  }

  $selectionMasked = 0
  for ($y = 0; $y -lt $height; $y += 1) {
    for ($x = 0; $x -lt $width; $x += 1) {
      if (Test-ToolsetSelectionPixel $bitmap.GetPixel($x, $y)) {
        $bitmap.SetPixel($x, $y, $black)
        $selectionMasked += 1
      }
    }
  }

  return [pscustomobject]@{
    backgroundPixelsMasked = $backgroundMasked
    selectionPixelsMasked = $selectionMasked
    totalPixels = $width * $height
  }
}

function Get-AreaPixelColumnRatio($bitmap, $rect, [int]$x) {
  $hits = 0
  $samples = 0
  for ($y = $rect.Top; $y -lt $rect.Bottom; $y += 2) {
    if (Test-AreaPixel($bitmap.GetPixel($x, $y))) {
      $hits += 1
    }
    $samples += 1
  }
  if ($samples -eq 0) { return 0.0 }
  return $hits / [double]$samples
}

function Get-AreaPixelRowRatio($bitmap, $rect, [int]$y) {
  $hits = 0
  $samples = 0
  for ($x = $rect.Left; $x -lt $rect.Right; $x += 2) {
    if (Test-AreaPixel($bitmap.GetPixel($x, $y))) {
      $hits += 1
    }
    $samples += 1
  }
  if ($samples -eq 0) { return 0.0 }
  return $hits / [double]$samples
}

function Get-ToolsetUiColumnRatio($bitmap, [int]$top, [int]$bottom, [int]$x) {
  $hits = 0
  $samples = 0
  for ($y = $top; $y -le $bottom; $y += 2) {
    if (Test-ToolsetBackgroundPixel($bitmap.GetPixel($x, $y))) {
      $hits += 1
    }
    $samples += 1
  }
  if ($samples -eq 0) { return 0.0 }
  return $hits / [double]$samples
}

function Get-ToolsetUiRowRatio($bitmap, [int]$left, [int]$right, [int]$y) {
  $hits = 0
  $samples = 0
  for ($x = $left; $x -le $right; $x += 2) {
    if (Test-ToolsetBackgroundPixel($bitmap.GetPixel($x, $y))) {
      $hits += 1
    }
    $samples += 1
  }
  if ($samples -eq 0) { return 0.0 }
  return $hits / [double]$samples
}

function Find-LeftToolsetUiRun($bitmap, [int]$left, [int]$top, [int]$right, [int]$bottom) {
  $limit = [Math]::Min($right, $left + 64)
  $threshold = 0.28
  $minimumRun = 3
  $runStart = $null
  $runEnd = $null

  for ($x = $left; $x -le $limit; $x += 1) {
    if ((Get-ToolsetUiColumnRatio $bitmap $top $bottom $x) -ge $threshold) {
      if ($null -eq $runStart) { $runStart = $x }
      $runEnd = $x
      continue
    }
    if ($null -ne $runStart) {
      if (($runEnd - $runStart + 1) -ge $minimumRun) {
        return [pscustomobject]@{ Start = $runStart; End = $runEnd }
      }
      $runStart = $null
      $runEnd = $null
    }
  }

  if ($null -ne $runStart -and ($runEnd - $runStart + 1) -ge $minimumRun) {
    return [pscustomobject]@{ Start = $runStart; End = $runEnd }
  }
  return $null
}

function Find-BottomToolsetUiRun($bitmap, [int]$left, [int]$top, [int]$right, [int]$bottom) {
  $limit = [Math]::Max($top, $bottom - 64)
  $threshold = 0.28
  $minimumRun = 3
  $runTop = $null
  $runBottom = $null

  for ($y = $bottom; $y -ge $limit; $y -= 1) {
    if ((Get-ToolsetUiRowRatio $bitmap $left $right $y) -ge $threshold) {
      if ($null -eq $runBottom) { $runBottom = $y }
      $runTop = $y
      continue
    }
    if ($null -ne $runBottom) {
      if (($runBottom - $runTop + 1) -ge $minimumRun) {
        return [pscustomobject]@{ Start = $runTop; End = $runBottom }
      }
      $runTop = $null
      $runBottom = $null
    }
  }

  if ($null -ne $runBottom -and ($runBottom - $runTop + 1) -ge $minimumRun) {
    return [pscustomobject]@{ Start = $runTop; End = $runBottom }
  }
  return $null
}

function Trim-ToolsetEdgeArtifacts($bitmap, [int]$left, [int]$top, [int]$right, [int]$bottom, [int]$minWidth, [int]$minHeight) {
  $leftRun = Find-LeftToolsetUiRun $bitmap $left $top $right $bottom
  if ($null -ne $leftRun -and ($right - $leftRun.End + 1) -ge $minWidth) {
    $left = [Math]::Min($leftRun.End + 4, $right - $minWidth + 1)
  }

  $bottomRun = Find-BottomToolsetUiRun $bitmap $left $top $right $bottom
  if ($null -ne $bottomRun -and ($bottomRun.Start - $top + 1) -ge $minHeight) {
    $bottom = [Math]::Max($bottomRun.Start - 4, $top + $minHeight - 1)
  }

  return New-Object System.Drawing.Rectangle $left, $top, (($right - $left) + 1), (($bottom - $top) + 1)
}

function Trim-AreaCropRect($bitmap, $rect) {
  $left = $rect.Left
  $top = $rect.Top
  $right = $rect.Right - 1
  $bottom = $rect.Bottom - 1
  $minWidth = 320
  $minHeight = 240
  $edgeThreshold = 0.045
  $maxTrim = 96

  $trimmed = 0
  while (($right - $left + 1) -gt $minWidth -and $trimmed -lt $maxTrim) {
    if ((Get-AreaPixelColumnRatio $bitmap $rect $left) -ge $edgeThreshold) {
      break
    }
    $left += 1
    $trimmed += 1
  }

  $trimmed = 0
  while (($right - $left + 1) -gt $minWidth -and $trimmed -lt $maxTrim) {
    if ((Get-AreaPixelColumnRatio $bitmap $rect $right) -ge $edgeThreshold) {
      break
    }
    $right -= 1
    $trimmed += 1
  }

  $trimmed = 0
  while (($bottom - $top + 1) -gt $minHeight -and $trimmed -lt $maxTrim) {
    if ((Get-AreaPixelRowRatio $bitmap $rect $top) -ge $edgeThreshold) {
      break
    }
    $top += 1
    $trimmed += 1
  }

  $trimmed = 0
  while (($bottom - $top + 1) -gt $minHeight -and $trimmed -lt $maxTrim) {
    if ((Get-AreaPixelRowRatio $bitmap $rect $bottom) -ge $edgeThreshold) {
      break
    }
    $bottom -= 1
    $trimmed += 1
  }

  return Trim-ToolsetEdgeArtifacts $bitmap $left $top $right $bottom $minWidth $minHeight
}

function Find-AreaCrop($bitmap, $viewerRect) {
  if ($null -eq $viewerRect) {
    return $null
  }
  $viewer = Clamp-Rect $viewerRect $bitmap.Width $bitmap.Height
  $margin = 24
  $scan = New-Object System.Drawing.Rectangle ($viewer.Left + $margin), ($viewer.Top + $margin), ([Math]::Max(1, $viewer.Width - ($margin * 2))), ([Math]::Max(1, $viewer.Height - ($margin * 2)))
  $scan = Clamp-Rect $scan $bitmap.Width $bitmap.Height
  $minX = $scan.Right
  $minY = $scan.Bottom
  $maxX = $scan.Left
  $maxY = $scan.Top
  $count = 0

  for ($y = $scan.Top; $y -lt $scan.Bottom; $y += 2) {
    for ($x = $scan.Left; $x -lt $scan.Right; $x += 2) {
      if (Test-AreaPixel($bitmap.GetPixel($x, $y))) {
        $count += 1
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($count -lt 1000) {
    return $null
  }

  $padding = 12
  $rect = New-Object System.Drawing.Rectangle ($minX - $padding), ($minY - $padding), (($maxX - $minX) + ($padding * 2)), (($maxY - $minY) + ($padding * 2))
  $rect = Clamp-Rect $rect $bitmap.Width $bitmap.Height
  $rect = Trim-AreaCropRect $bitmap $rect
  return Clamp-Rect $rect $bitmap.Width $bitmap.Height
}

function Measure-Image($bitmap, $step) {
  $sumR = 0.0
  $sumG = 0.0
  $sumB = 0.0
  $sumLuma = 0.0
  $sumSat = 0.0
  $dark = 0
  $warm = 0
  $samples = 0

  for ($y = 0; $y -lt $bitmap.Height; $y += $step) {
    for ($x = 0; $x -lt $bitmap.Width; $x += $step) {
      $c = $bitmap.GetPixel($x, $y)
      $r = [int]$c.R
      $g = [int]$c.G
      $b = [int]$c.B
      $max = [Math]::Max($r, [Math]::Max($g, $b))
      $min = [Math]::Min($r, [Math]::Min($g, $b))
      $luma = (0.2126 * $r) + (0.7152 * $g) + (0.0722 * $b)
      $sat = if ($max -eq 0) { 0.0 } else { (($max - $min) / [double]$max) }

      $sumR += $r
      $sumG += $g
      $sumB += $b
      $sumLuma += $luma
      $sumSat += $sat
      if ($luma -lt 70) { $dark += 1 }
      if ($r -gt $b + 18 -and $g -gt $b + 4) { $warm += 1 }
      $samples += 1
    }
  }

  return [pscustomobject]@{
    sampleCount = $samples
    averageRgb = [pscustomobject]@{
      r = [Math]::Round($sumR / $samples, 2)
      g = [Math]::Round($sumG / $samples, 2)
      b = [Math]::Round($sumB / $samples, 2)
    }
    averageLuma = [Math]::Round($sumLuma / $samples, 2)
    averageSaturation = [Math]::Round($sumSat / $samples, 4)
    darkPixelRatio = [Math]::Round($dark / [double]$samples, 4)
    warmPixelRatio = [Math]::Round($warm / [double]$samples, 4)
  }
}

function New-ScaledBitmap($image, $targetHeight, $maxWidth) {
  $scale = $targetHeight / [double]$image.Height
  $width = [Math]::Max(1, [Math]::Round($image.Width * $scale))
  $height = $targetHeight
  if ($width -gt $maxWidth) {
    $scale = $maxWidth / [double]$image.Width
    $width = $maxWidth
    $height = [Math]::Max(1, [Math]::Round($image.Height * $scale))
  }

  $bitmap = New-Object System.Drawing.Bitmap ([int]$width), ([int]$height), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($image, 0, 0, $width, $height)
  } finally {
    $graphics.Dispose()
  }
  return $bitmap
}

$concept = $null
$toolset = $null
$cropBitmap = $null
$conceptScaled = $null
$cropScaled = $null
$sheet = $null

try {
  $concept = [System.Drawing.Image]::FromFile([string]$params.conceptPath)
  $toolset = [System.Drawing.Image]::FromFile([string]$params.toolsetPath)
  $toolsetBitmap = New-Object System.Drawing.Bitmap $toolset

  $cropRect = New-RectFromObject $params.cropOverride
  $cropSource = if ($null -ne $cropRect) { 'cli_override' } else { $null }
  if ($null -eq $cropRect) {
    $viewer = New-RectFromObject $params.viewerRect
    $cropRect = Find-AreaCrop $toolsetBitmap $viewer
    if ($null -ne $cropRect) {
      $cropSource = 'auto_detected_from_manifest_viewer'
    }
  }
  if ($null -eq $cropRect) {
    $cropRect = New-RectFromObject $params.fallbackCrop
    $cropSource = 'fallback_default'
  }
  $cropRect = Clamp-Rect $cropRect $toolset.Width $toolset.Height

  $cropBitmap = New-Object System.Drawing.Bitmap $cropRect.Width, $cropRect.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $cropGraphics = [System.Drawing.Graphics]::FromImage($cropBitmap)
  try {
    $cropGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $cropGraphics.DrawImage($toolset, (New-Object System.Drawing.Rectangle 0, 0, $cropRect.Width, $cropRect.Height), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
  } finally {
    $cropGraphics.Dispose()
  }
  $maskResult = Mask-ToolsetArtifacts $cropBitmap
  $cropBitmap.Save([string]$params.cropPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $targetHeight = 640
  $conceptScaled = New-ScaledBitmap $concept $targetHeight 980
  $cropScaled = New-ScaledBitmap $cropBitmap $targetHeight 980

  $padding = 28
  $gap = 24
  $header = 72
  $footer = 54
  $sheetWidth = $padding + $conceptScaled.Width + $gap + $cropScaled.Width + $padding
  $imageHeight = [Math]::Max($conceptScaled.Height, $cropScaled.Height)
  $sheetHeight = $header + $imageHeight + $footer
  $sheet = New-Object System.Drawing.Bitmap $sheetWidth, $sheetHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($sheet)
  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.Clear([System.Drawing.Color]::FromArgb(24, 24, 24))

    $labelFont = New-Object System.Drawing.Font 'Segoe UI', 16, ([System.Drawing.FontStyle]::Bold)
    $metaFont = New-Object System.Drawing.Font 'Segoe UI', 10, ([System.Drawing.FontStyle]::Regular)
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(238, 238, 238))
    $mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 180, 180))
    $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(74, 74, 74)), 1

    $leftX = $padding
    $rightX = $padding + $conceptScaled.Width + $gap
    $imageY = $header
    $graphics.DrawString('Concept art target', $labelFont, $brush, $leftX, 18)
    $graphics.DrawString('Aurora Toolset crop', $labelFont, $brush, $rightX, 18)
    $graphics.DrawString('semantic/layout comparison, not pixel parity', $metaFont, $mutedBrush, $padding, ($sheetHeight - 38))

    $graphics.DrawImage($conceptScaled, $leftX, $imageY)
    $graphics.DrawRectangle($borderPen, $leftX, $imageY, $conceptScaled.Width, $conceptScaled.Height)
    $graphics.DrawImage($cropScaled, $rightX, $imageY)
    $graphics.DrawRectangle($borderPen, $rightX, $imageY, $cropScaled.Width, $cropScaled.Height)
  } finally {
    $graphics.Dispose()
  }
  $sheet.Save([string]$params.contactSheetPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $result = [pscustomobject]@{
    crop = [pscustomobject]@{
      x = $cropRect.X
      y = $cropRect.Y
      width = $cropRect.Width
      height = $cropRect.Height
      source = $cropSource
    }
    viewerRect = $params.viewerRect
    conceptImage = [pscustomobject]@{
      width = $concept.Width
      height = $concept.Height
      stats = Measure-Image (New-Object System.Drawing.Bitmap $concept) 8
    }
    toolsetScreenshot = [pscustomobject]@{
      width = $toolset.Width
      height = $toolset.Height
    }
    toolsetCropImage = [pscustomobject]@{
      width = $cropBitmap.Width
      height = $cropBitmap.Height
      stats = Measure-Image $cropBitmap 4
      toolsetArtifactMask = $maskResult
    }
    outputs = [pscustomobject]@{
      cropPath = [string]$params.cropPath
      contactSheetPath = [string]$params.contactSheetPath
    }
  }
  $result | ConvertTo-Json -Depth 12 -Compress
} finally {
  if ($sheet) { $sheet.Dispose() }
  if ($cropScaled) { $cropScaled.Dispose() }
  if ($conceptScaled) { $conceptScaled.Dispose() }
  if ($cropBitmap) { $cropBitmap.Dispose() }
  if ($toolsetBitmap) { $toolsetBitmap.Dispose() }
  if ($toolset) { $toolset.Dispose() }
  if ($concept) { $concept.Dispose() }
}
`;

  const stdout = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        AURORA_AREA_COMPARE_PARAMS: JSON.stringify(payload)
      },
      maxBuffer: 1024 * 1024 * 8
    }
  );

  const line = stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .at(-1);
  if (!line) {
    throw new Error("Image comparison did not return JSON.");
  }
  return JSON.parse(line);
}

function getAreaProfile(placeableMap, areaResref) {
  if (!placeableMap?.areas) {
    return null;
  }
  return placeableMap.areas.find((area) => area.resref === areaResref) ?? null;
}

function readPlaceableInstances(csvPath, areaResref) {
  if (!csvPath || !existsSync(csvPath)) {
    return [];
  }
  const lines = readFileSync(csvPath, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean);
  const header = parseCsvLine(lines.shift() ?? "");
  const records = [];
  for (const line of lines) {
    const fields = parseCsvLine(line);
    if (fields.length !== header.length) {
      continue;
    }
    const record = Object.fromEntries(header.map((key, index) => [key, fields[index] ?? ""]));
    if (record.areaResref !== areaResref) {
      continue;
    }
    const x = Number(record.x);
    const y = Number(record.y);
    records.push({
      areaResref: record.areaResref,
      areaName: record.areaName,
      areaCategory: record.areaCategory,
      tileSet: record.tileSet,
      templateResRef: record.templateResRef,
      role: record.role,
      tag: record.tag,
      localizedName: record.localizedName,
      x,
      y,
      z: Number(record.z),
      bearing: Number(record.bearing),
      instanceIndex: Number(record.instanceIndex),
      zone: classifyApartmentZone(x, y)
    });
  }
  return records;
}

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      fields.push(field);
      field = "";
      continue;
    }
    field += char;
  }
  fields.push(field);
  return fields;
}

function classifyApartmentZone(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return "unknown";
  }
  const column = x < 10 ? "west" : x < 20 ? "center" : "east";
  const row = y >= 10 ? "north" : "south";
  return `${row}_${column}`;
}

function buildReport({
  imageResult,
  areaSummary,
  areaProfile,
  areaInstances,
  conceptPath,
  toolsetPath,
  manifestPath,
  outputDir,
  cropPath,
  contactSheetPath
}) {
  const roleCounts = {
    ...Object.fromEntries((areaProfile?.topPlaceableRoles ?? []).map((role) => [role.key, role.count])),
    ...countBy(areaInstances ?? [], (instance) => instance.role)
  };
  const placeableCount = areaProfile?.counts?.placeables ?? areaSummary?.git?.finalPlaceableCount ?? 0;
  const tileCount = areaProfile?.tileCount ?? areaProfile?.width * areaProfile?.height ?? 0;
  const density = tileCount > 0 ? placeableCount / tileCount : null;
  const placeableConceptCoverage = buildPlaceableConceptCoverage(areaInstances ?? []);
  const checklist = buildChecklist({
    areaProfile,
    roleCounts,
    placeableCount,
    density,
    placeableConceptCoverage
  });
  const semanticScore = scoreChecklist(checklist);
  const visualDeltaChecks = buildVisualDeltaChecks(imageResult);
  const visualScore = scoreChecklist(visualDeltaChecks);
  const score = (semanticScore + visualScore) / 2;
  const result = classifyResult({ score, semanticScore, visualScore });

  return {
    version: "aurora-area-concept-comparison/v1",
    generatedAt: new Date().toISOString(),
    area: {
      resref: AREA_RESREF,
      name: AREA_NAME,
      category: areaProfile?.category ?? null,
      tileset: areaProfile?.tileSet ?? null,
      width: areaProfile?.width ?? null,
      height: areaProfile?.height ?? null,
      tileCount,
      placeableCount,
      placeablesPerTile: density === null ? null : Number(density.toFixed(2))
    },
    comparisonMode: {
      visualParityPromoted: false,
      mode: "semantic_layout_contact_sheet",
      note: "Concept art and Aurora Toolset output are different media. This compares layout, visual intent, and placeable-role evidence, not pixel parity."
    },
    result,
    score: Number(score.toFixed(2)),
    semanticScore: Number(semanticScore.toFixed(2)),
    visualScore: Number(visualScore.toFixed(2)),
    imageEvidence: {
      crop: imageResult.crop,
      viewerRect: imageResult.viewerRect ?? null,
      conceptImage: imageResult.conceptImage,
      toolsetScreenshot: imageResult.toolsetScreenshot,
      toolsetCropImage: imageResult.toolsetCropImage
    },
    visualDeltaChecks,
    roleEvidence: {
      topPlaceableRoles: areaProfile?.topPlaceableRoles ?? [],
      topPlaceableTemplates: areaProfile?.topPlaceableTemplates ?? []
    },
    placeableConceptCoverage,
    checklist,
    findings: buildFindings({
      checklist,
      imageResult,
      areaProfile,
      density,
      placeableConceptCoverage,
      visualDeltaChecks,
      semanticScore,
      visualScore
    }),
    inputs: {
      conceptPath,
      toolsetPath,
      manifestPath: existsSync(manifestPath) ? manifestPath : null
    },
    outputs: {
      outputDir,
      cropPath,
      contactSheetPath,
      reportJsonPath: resolve(outputDir, "comparison-report.json"),
      reportMarkdownPath: resolve(outputDir, "comparison-report.md")
    }
  };
}

function classifyResult({ score, semanticScore, visualScore }) {
  if (visualScore < 0.78 && semanticScore >= 0.78) {
    return "needs_visual_iteration";
  }
  if (score >= 0.78) {
    return "pass_with_iteration_notes";
  }
  if (score >= 0.62) {
    return "needs_iteration";
  }
  return "fails_concept_alignment";
}

function buildVisualDeltaChecks(imageResult) {
  const conceptStats = imageResult.conceptImage?.stats ?? {};
  const toolsetStats = imageResult.toolsetCropImage?.stats ?? {};
  const lumaDelta = Math.abs((toolsetStats.averageLuma ?? 0) - (conceptStats.averageLuma ?? 0));
  const darkDelta = Math.abs((toolsetStats.darkPixelRatio ?? 0) - (conceptStats.darkPixelRatio ?? 0));
  const warmDelta = Math.abs((toolsetStats.warmPixelRatio ?? 0) - (conceptStats.warmPixelRatio ?? 0));
  const saturationDelta = Math.abs(
    (toolsetStats.averageSaturation ?? 0) - (conceptStats.averageSaturation ?? 0)
  );
  return [
    {
      id: "visual_luma_parity",
      status: lumaDelta <= 18 ? "matched" : lumaDelta <= 30 ? "partial" : "missing",
      conceptTarget: "Toolset crop should not read much brighter than the moody concept art.",
      evidence: `conceptLuma=${formatNumber(conceptStats.averageLuma)}, toolsetLuma=${formatNumber(toolsetStats.averageLuma)}, delta=${formatNumber(lumaDelta)}.`,
      nextAction:
        lumaDelta <= 18
          ? "Mood brightness is close enough for this comparison."
          : "Use darker floor/wall overlays, more warm light contrast, and fewer bright textile patches."
    },
    {
      id: "visual_dark_mass",
      status: darkDelta <= 0.08 ? "matched" : darkDelta <= 0.16 ? "partial" : "missing",
      conceptTarget: "The image should keep a similar amount of dark mass and shadowed furniture/walls.",
      evidence: `conceptDarkRatio=${formatNumber(conceptStats.darkPixelRatio)}, toolsetDarkRatio=${formatNumber(toolsetStats.darkPixelRatio)}, delta=${formatNumber(darkDelta)}.`,
      nextAction:
        darkDelta <= 0.08
          ? "Dark mass is close enough."
          : "Add stronger dark wall/floor masses and reduce empty bright floor reads."
    },
    {
      id: "visual_warmth",
      status: warmDelta <= 0.12 ? "matched" : warmDelta <= 0.22 ? "partial" : "missing",
      conceptTarget: "The palette should stay in the warm candlelit Last City range.",
      evidence: `conceptWarmRatio=${formatNumber(conceptStats.warmPixelRatio)}, toolsetWarmRatio=${formatNumber(toolsetStats.warmPixelRatio)}, delta=${formatNumber(warmDelta)}.`,
      nextAction:
        warmDelta <= 0.12
          ? "Warmth is close enough."
          : "Rebalance with warm candles, darker wood, and fewer cold gray patches."
    },
    {
      id: "visual_saturation",
      status: saturationDelta <= 0.05 ? "matched" : saturationDelta <= 0.14 ? "partial" : "missing",
      conceptTarget: "The Toolset crop should avoid looking washed out against the concept.",
      evidence: `conceptSaturation=${formatNumber(conceptStats.averageSaturation)}, toolsetSaturation=${formatNumber(toolsetStats.averageSaturation)}, delta=${formatNumber(saturationDelta)}.`,
      nextAction:
        saturationDelta <= 0.05
          ? "Saturation is close enough."
          : "Add richer rugs/wood and reduce flat gray floor dominance."
    }
  ];
}

function formatNumber(value) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : "unknown";
}

function buildPlaceableConceptCoverage(instances) {
  const targets = [
    {
      id: "study_research_corner",
      conceptMotif: "Left/north study corner with desk, chair, papers, candle, and plant.",
      zones: ["north_west"],
      groups: [
        { key: "desk_or_table", roles: ["tables_seating"], min: 1 },
        { key: "research_clutter", roles: ["maps_books_papers"], min: 2 },
        { key: "warm_light", roles: ["lighting_fire"], tagPattern: "candle|swiec|swieca|swiecz|light|fire", min: 1 }
      ]
    },
    {
      id: "north_chart_wall",
      conceptMotif: "Wall gallery of large maps, notes, shelves, and chart clutter.",
      zones: ["north_center", "north_east"],
      groups: [
        { key: "maps_and_notes", roles: ["maps_books_papers"], min: 8 },
        { key: "shelf_or_cabinet_support", roles: ["maps_books_papers", "storage_containers"], min: 2 }
      ]
    },
    {
      id: "central_map_worktable_placeables",
      conceptMotif: "Dominant central map table with papers, seating, tools, and light.",
      zones: ["north_center", "south_center"],
      groups: [
        {
          key: "central_table",
          roles: ["tables_seating", "maps_books_papers"],
          tagPattern: "central_map_table|central_tray|central_.*chair|north_work_table|north_work_chair",
          requireTextMatch: true,
          min: 3
        },
        {
          key: "map_or_papers_on_table",
          roles: ["maps_books_papers"],
          tagPattern: "central|north_table",
          requireTextMatch: true,
          min: 3
        },
        { key: "table_light", roles: ["lighting_fire"], tagPattern: "central_candle|north_table_candle|candle|swiec|swieca|swiecz", min: 1 }
      ]
    },
    {
      id: "private_sleeping_nook",
      conceptMotif: "Right/north private bed nook with domestic storage and side light.",
      zones: ["north_east"],
      groups: [
        { key: "bed_private_props", roles: ["sleep_private"], min: 4 },
        {
          key: "bedroom_light_or_storage",
          roles: ["lighting_fire", "storage_containers"],
          tagPattern: "bedroom_candle|bedside|commode|cabinet|chest|candle|swiec|swieca|swiecz|szafka|komoda",
          min: 2
        }
      ]
    },
    {
      id: "utility_hearth_corner",
      conceptMotif: "Lower-left utility/hearth zone with fire, sacks, bucket, broom, and shelves.",
      zones: ["south_west"],
      groups: [
        { key: "hearth_or_fire", roles: ["lighting_fire"], min: 1 },
        { key: "utility_storage_tools", roles: ["tools_port_work", "storage_containers"], min: 5 }
      ]
    },
    {
      id: "port_storage_corner_placeables",
      conceptMotif: "Lower-right port storage with rope coils, crates, sacks, and working clutter.",
      zones: ["south_east"],
      groups: [
        { key: "port_tools", roles: ["tools_port_work"], min: 2 },
        { key: "cargo_storage", roles: ["storage_containers"], min: 5 }
      ]
    },
    {
      id: "rugs_textile_zoning",
      conceptMotif: "Rugs and textiles divide the apartment into lived-in micro-zones.",
      zones: ["north_west", "north_center", "north_east", "south_west", "south_center", "south_east"],
      groups: [{ key: "rugs_textiles", roles: ["textiles_rugs"], min: 5 }]
    },
    {
      id: "small_life_details",
      conceptMotif: "Small plants, bottles, trays, and personal details soften the space.",
      zones: ["north_west", "south_center", "north_east"],
      groups: [
        { key: "plants", roles: ["plants_vases"], min: 2 },
        { key: "tabletop_details", roles: ["food_drink_kitchen", "maps_books_papers"], min: 4 }
      ]
    }
  ];

  const matrix = targets.map((target) => evaluateConceptTarget(instances, target));
  const score = matrix.length
    ? matrix.reduce((total, target) => total + statusScore(target.status), 0) / matrix.length
    : 0;
  return {
    version: "area-placeable-concept-coverage/v1",
    method:
      "Matches exported Aurora GIT placeable instances to concept-art motifs using role, template/tag/name metadata, and rough 3x2 room zones. It does not visually identify individual placeables from pixels.",
    areaInstanceCount: instances.length,
    zoneCounts: countBy(instances, (instance) => instance.zone),
    score: Number(score.toFixed(2)),
    targets: matrix
  };
}

function evaluateConceptTarget(instances, target) {
  const zoneSet = new Set(target.zones);
  const candidates = instances.filter((instance) => zoneSet.has(instance.zone));
  const groupResults = target.groups.map((group) => {
    const matches = candidates.filter((instance) => matchesConceptGroup(instance, group));
    return {
      key: group.key,
      roles: group.roles,
      tagPattern: group.tagPattern ?? null,
      requiredCount: group.min,
      actualCount: matches.length,
      status: matches.length >= group.min ? "matched" : matches.length > 0 ? "partial" : "missing",
      examples: matches.slice(0, 8).map((instance) => summarizePlaceable(instance))
    };
  });
  const matchedGroups = groupResults.filter((group) => group.status === "matched").length;
  const partialGroups = groupResults.filter((group) => group.status === "partial").length;
  const status =
    matchedGroups === groupResults.length
      ? "matched"
      : matchedGroups > 0 || partialGroups > 0
        ? "partial"
        : "missing";
  const supportingExamples = candidates
    .filter((instance) => target.groups.some((group) => matchesConceptGroup(instance, group)))
    .slice(0, 12)
    .map((instance) => summarizePlaceable(instance));

  return {
    id: target.id,
    status,
    conceptMotif: target.conceptMotif,
    zones: target.zones,
    groupResults,
    supportingExamples
  };
}

function matchesConceptGroup(instance, group) {
  const hasRoles = Array.isArray(group.roles) && group.roles.length > 0;
  const hasPattern = Boolean(group.tagPattern);
  const roleOk = hasRoles ? group.roles.includes(instance.role) : false;
  const text = `${instance.templateResRef} ${instance.tag} ${instance.localizedName}`.toLowerCase();
  const textOk = hasPattern ? new RegExp(group.tagPattern, "iu").test(text) : false;
  if (group.requireTextMatch) {
    return (!hasRoles || roleOk) && (!hasPattern || textOk);
  }
  if (hasRoles && hasPattern) {
    return roleOk || textOk;
  }
  return roleOk || textOk;
}

function summarizePlaceable(instance) {
  return {
    template: instance.templateResRef,
    role: instance.role,
    tag: instance.tag,
    zone: instance.zone,
    x: Number(instance.x.toFixed(2)),
    y: Number(instance.y.toFixed(2))
  };
}

function statusScore(status) {
  return status === "matched" ? 1 : status === "partial" ? 0.5 : 0;
}

function countBy(values, getKey) {
  const counts = {};
  for (const value of values) {
    const key = getKey(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function buildChecklist({ areaProfile, roleCounts, placeableCount, density, placeableConceptCoverage }) {
  const width = areaProfile?.width ?? 0;
  const height = areaProfile?.height ?? 0;
  const role = (key) => roleCounts[key] ?? 0;
  const centralCoverageStatus =
    placeableConceptCoverage?.targets?.find((target) => target.id === "central_map_worktable_placeables")
      ?.status ?? "missing";
  const checks = [
    {
      id: "six_room_3x2_shell",
      status: width === 3 && height === 2 ? "matched" : "missing",
      conceptTarget: "A compact six-room apartment shell with separated private/work/storage zones.",
      evidence: `${width}x${height} area shell, tileCount=${areaProfile?.tileCount ?? "unknown"}.`,
      nextAction:
        width === 3 && height === 2 ? "Keep this shell." : "Use a 3x2 or similarly legible apartment shell."
    },
    {
      id: "cartographer_identity",
      status: role("maps_books_papers") >= 16 ? "matched" : role("maps_books_papers") >= 8 ? "partial" : "missing",
      conceptTarget: "Maps, papers, books, and chart clutter should dominate the apartment identity.",
      evidence: `maps_books_papers=${role("maps_books_papers")}.`,
      nextAction:
        role("maps_books_papers") >= 16
          ? "Identity is present."
          : "Add more maps, papers, notebooks, and shelf clutter."
    },
    {
      id: "central_map_worktable",
      status:
        centralCoverageStatus === "matched" &&
        role("tables_seating") >= 12 &&
        role("maps_books_papers") >= 16
          ? "matched"
          : role("tables_seating") >= 8
            ? "partial"
            : "missing",
      conceptTarget: "The central worktable should read as the visual anchor, with maps and tools on or around it.",
      evidence: `tables_seating=${role("tables_seating")}, maps_books_papers=${role("maps_books_papers")}, centralCoverage=${centralCoverageStatus}.`,
      nextAction:
        centralCoverageStatus === "matched"
          ? "Keep the central table-map-paper cluster visible in Toolset captures."
          : "Strengthen one central room with an obvious table-map-paper cluster."
    },
    {
      id: "sleeping_nook",
      status: role("sleep_private") >= 5 ? "matched" : role("sleep_private") >= 1 ? "partial" : "missing",
      conceptTarget: "A private bed alcove that feels lived-in, not a generic inn room.",
      evidence: `sleep_private=${role("sleep_private")}.`,
      nextAction: role("sleep_private") >= 5 ? "Keep private-room dressing." : "Add bed-side storage and small personal clutter."
    },
    {
      id: "port_storage_corner",
      status:
        role("storage_containers") + role("tools_port_work") >= 14
          ? "matched"
          : role("storage_containers") + role("tools_port_work") >= 8
            ? "partial"
            : "missing",
      conceptTarget: "Dock-side storage: crates, rope, barrel-like silhouettes, and working clutter.",
      evidence: `storage_containers=${role("storage_containers")}, tools_port_work=${role("tools_port_work")}.`,
      nextAction:
        role("storage_containers") + role("tools_port_work") >= 14
          ? "Port storage layer is present."
          : "Add more rope/crate/container clusters to one lower room."
    },
    {
      id: "warm_light_sources",
      status: role("lighting_fire") >= 8 ? "matched" : role("lighting_fire") >= 4 ? "partial" : "missing",
      conceptTarget: "Warm candle/fire points should create the evening Last City apartment mood.",
      evidence: `lighting_fire=${role("lighting_fire")}.`,
      nextAction: role("lighting_fire") >= 8 ? "Lighting density is in range." : "Add more small warm light props."
    },
    {
      id: "textile_rug_layering",
      status: role("textiles_rugs") >= 5 ? "matched" : role("textiles_rugs") >= 2 ? "partial" : "missing",
      conceptTarget: "Rugs and textile patches should break up floors and separate micro-zones.",
      evidence: `textiles_rugs=${role("textiles_rugs")}.`,
      nextAction: role("textiles_rugs") >= 5 ? "Textile zoning is present." : "Add rugs/runners under work and bed zones."
    },
    {
      id: "lived_in_density",
      status: density !== null && density >= 12 ? "matched" : placeableCount >= 55 ? "partial" : "missing",
      conceptTarget: "The apartment should feel dense enough for Last City interiors.",
      evidence:
        density === null
          ? `placeables=${placeableCount}.`
          : `placeables=${placeableCount}, placeablesPerTile=${density.toFixed(2)}.`,
      nextAction:
        density !== null && density >= 12
          ? "Density is acceptable."
          : "Increase micro-clutter without blocking navigation."
    }
  ];
  return checks;
}

function scoreChecklist(checklist) {
  const weights = {
    matched: 1,
    partial: 0.62,
    missing: 0
  };
  const sum = checklist.reduce((total, item) => total + (weights[item.status] ?? 0), 0);
  return sum / checklist.length;
}

function buildFindings({
  checklist,
  imageResult,
  areaProfile,
  density,
  placeableConceptCoverage,
  visualDeltaChecks,
  semanticScore,
  visualScore
}) {
  const partials = checklist.filter((item) => item.status === "partial");
  const missing = checklist.filter((item) => item.status === "missing");
  const visualPartials = visualDeltaChecks.filter((item) => item.status === "partial");
  const visualMissing = visualDeltaChecks.filter((item) => item.status === "missing");
  const placeablePartials =
    placeableConceptCoverage?.targets?.filter((item) => item.status === "partial") ?? [];
  const placeableMissing =
    placeableConceptCoverage?.targets?.filter((item) => item.status === "missing") ?? [];
  const findings = [];
  findings.push(
    `The Toolset crop was produced from ${imageResult.crop.source} at ${imageResult.crop.x},${imageResult.crop.y},${imageResult.crop.width},${imageResult.crop.height}.`
  );
  findings.push(
    `The area has ${areaProfile?.counts?.placeables ?? "unknown"} placeables across ${areaProfile?.tileCount ?? "unknown"} tiles` +
      (density === null ? "." : ` (${density.toFixed(2)} placeables/tile).`)
  );
  if (partials.length > 0) {
    findings.push(`Iteration targets: ${partials.map((item) => item.id).join(", ")}.`);
  }
  if (missing.length > 0) {
    findings.push(`Missing targets: ${missing.map((item) => item.id).join(", ")}.`);
  }
  if (missing.length === 0) {
    findings.push("No concept pillar is fully missing; the remaining work is emphasis and composition.");
  }
  findings.push(
    `Placeable concept coverage score is ${placeableConceptCoverage?.score ?? "unknown"} across ${placeableConceptCoverage?.areaInstanceCount ?? "unknown"} exported placeable instances.`
  );
  findings.push(
    `Semantic score is ${semanticScore.toFixed(2)}; visual score is ${visualScore.toFixed(2)}.`
  );
  if (visualPartials.length > 0) {
    findings.push(`Visual partials: ${visualPartials.map((item) => item.id).join(", ")}.`);
  }
  if (visualMissing.length > 0) {
    findings.push(`Visual misses: ${visualMissing.map((item) => item.id).join(", ")}.`);
  }
  if (placeablePartials.length > 0) {
    findings.push(`Placeable motif partials: ${placeablePartials.map((item) => item.id).join(", ")}.`);
  }
  if (placeableMissing.length > 0) {
    findings.push(`Placeable motif missing: ${placeableMissing.map((item) => item.id).join(", ")}.`);
  }
  findings.push(
    "Main visual gap versus the concept: the Aurora version reads cleaner and more modular, while the concept is moodier, more wall-dense, and more strongly centered on one map table."
  );
  return findings;
}

function renderMarkdownReport(report) {
  const lines = [];
  lines.push("# Last City Apartment Concept Comparison");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Area: ${report.area.name} (${report.area.resref})`);
  lines.push(`Result: ${report.result}`);
  lines.push(`Score: ${report.score}`);
  lines.push(`Semantic score: ${report.semanticScore}`);
  lines.push(`Visual score: ${report.visualScore}`);
  lines.push("");
  lines.push("## Mode");
  lines.push("");
  lines.push(report.comparisonMode.note);
  lines.push("");
  lines.push("## Evidence");
  lines.push("");
  lines.push(`- Contact sheet: ${report.outputs.contactSheetPath}`);
  lines.push(`- Toolset crop: ${report.outputs.cropPath}`);
  lines.push(`- Concept: ${report.inputs.conceptPath}`);
  lines.push(`- Toolset screenshot: ${report.inputs.toolsetPath}`);
  lines.push("");
  lines.push("## Area Profile");
  lines.push("");
  lines.push(`- Tileset: ${report.area.tileset ?? "unknown"}`);
  lines.push(`- Size: ${report.area.width}x${report.area.height}, tiles=${report.area.tileCount}`);
  lines.push(`- Placeables: ${report.area.placeableCount}`);
  lines.push(`- Placeables/tile: ${report.area.placeablesPerTile}`);
  lines.push("");
  lines.push("## Visual Delta Checks");
  lines.push("");
  lines.push("| Check | Status | Evidence | Next action |");
  lines.push("| --- | --- | --- | --- |");
  for (const item of report.visualDeltaChecks) {
    lines.push(
      `| ${escapeMarkdownTable(item.id)} | ${escapeMarkdownTable(item.status)} | ${escapeMarkdownTable(item.evidence)} | ${escapeMarkdownTable(item.nextAction)} |`
    );
  }
  lines.push("");
  lines.push("## Checklist");
  lines.push("");
  lines.push("| Check | Status | Evidence | Next action |");
  lines.push("| --- | --- | --- | --- |");
  for (const item of report.checklist) {
    lines.push(
      `| ${escapeMarkdownTable(item.id)} | ${escapeMarkdownTable(item.status)} | ${escapeMarkdownTable(item.evidence)} | ${escapeMarkdownTable(item.nextAction)} |`
    );
  }
  lines.push("");
  lines.push("## Placeable Concept Coverage");
  lines.push("");
  lines.push(report.placeableConceptCoverage.method);
  lines.push("");
  lines.push(`- Score: ${report.placeableConceptCoverage.score}`);
  lines.push(`- Area instances checked: ${report.placeableConceptCoverage.areaInstanceCount}`);
  lines.push(`- Zone counts: ${Object.entries(report.placeableConceptCoverage.zoneCounts)
    .map(([zone, count]) => `${zone}=${count}`)
    .join(", ")}`);
  lines.push("");
  lines.push("| Concept motif | Status | Required groups | Supporting examples |");
  lines.push("| --- | --- | --- | --- |");
  for (const target of report.placeableConceptCoverage.targets) {
    const groups = target.groupResults
      .map((group) => `${group.key}: ${group.actualCount}/${group.requiredCount} ${group.status}`)
      .join("; ");
    const examples = target.supportingExamples
      .slice(0, 5)
      .map((example) => `${example.template}@${example.zone}(${example.x},${example.y})`)
      .join("; ");
    lines.push(
      `| ${escapeMarkdownTable(target.id)} | ${escapeMarkdownTable(target.status)} | ${escapeMarkdownTable(groups)} | ${escapeMarkdownTable(examples)} |`
    );
  }
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  for (const finding of report.findings) {
    lines.push(`- ${finding}`);
  }
  lines.push("");
  lines.push("## Top Placeable Roles");
  lines.push("");
  for (const role of report.roleEvidence.topPlaceableRoles) {
    lines.push(`- ${role.key}: ${role.count}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function escapeMarkdownTable(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}
