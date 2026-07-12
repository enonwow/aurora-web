#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");

const options = parseArgs(process.argv.slice(2));
const inputPath = resolveMaybeAbsolute(options.input ?? options.crop);
const outDir = resolveMaybeAbsolute(options.out ?? "backend/docs/aurora-reverse/artifacts/toolset-crop-edge-artifacts");
const label = sanitizeLabel(options.label ?? "toolset-crop");

if (!inputPath) {
  throw new Error("Missing --input <toolset-viewport-crop.png>.");
}
assertReadableFile(inputPath, "Toolset crop");
mkdirSync(outDir, { recursive: true });

const jsonPath = resolve(outDir, `${label}-edge-artifacts.json`);
const mdPath = resolve(outDir, `${label}-edge-artifacts.md`);
const maskedPath = resolve(outDir, `${label}-edge-artifacts-masked.png`);

const report = analyzeWithPowerShell({ inputPath, maskedPath, label });
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(mdPath, renderMarkdown(report), "utf8");

console.log(
  JSON.stringify(
    {
      ok: true,
      label,
      jsonPath,
      markdownPath: mdPath,
      maskedPath,
      artifactRatio: report.artifactRatio,
      edgeArtifactBounds: report.edgeArtifactBounds,
      edgeComponents: report.edgeComponents.slice(0, 8)
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
  return value ? resolve(repoRoot, value) : value;
}

function sanitizeLabel(value) {
  return String(value ?? "toolset-crop")
    .replace(/[^a-z0-9_.-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 96) || "toolset-crop";
}

function assertReadableFile(path, label) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
  if (!statSync(path).isFile()) {
    throw new Error(`Expected ${label} to be a file: ${path}`);
  }
}

function analyzeWithPowerShell(payload) {
  const raw = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", powershellScript()],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        AURORA_TOOLSET_EDGE_ARTIFACT_PARAMS: JSON.stringify(payload)
      },
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024
    }
  ).trim();
  return JSON.parse(raw);
}

function renderMarkdown(report) {
  const rows = report.edgeComponents
    .slice(0, 12)
    .map(
      (component) =>
        `| ${component.id} | ${component.pixelCount} | ${format(component.ratio)} | ${component.bounds.x},${component.bounds.y},${component.bounds.width},${component.bounds.height} | ${component.edgeDistance ?? ""} | ${component.touches.join(",")} | ${format(component.averageLuma)} | ${format(component.averageSaturation)} |`
    )
    .join("\n");
  return `# Toolset Crop Edge Artifact Analysis

Generated: ${report.generatedAt}
Label: ${report.label}

Input:

\`\`\`text
${report.inputPath}
\`\`\`

Masked preview:

\`\`\`text
${report.maskedPath}
\`\`\`

## Summary

- Crop size: ${report.width}x${report.height}
- Edge artifact pixels: ${report.artifactPixels}
- Edge artifact ratio: ${format(report.artifactRatio)}
- Edge artifact bounds: ${report.edgeArtifactBounds ? `${report.edgeArtifactBounds.x},${report.edgeArtifactBounds.y},${report.edgeArtifactBounds.width},${report.edgeArtifactBounds.height}` : "_none_"}
- Candidate pixels: ${report.candidatePixels ?? 0}
- Candidate components: ${report.candidateComponentCount ?? 0}
- Selection rule: ${report.selectionRule ?? "_legacy edge-connected only_"}
- Note: this detects neutral/bright low-saturation planes that are either near crop edges or large enough to skew visual metrics. It is an oracle/crop diagnostic, not an area-quality pass.

## Components

| Id | Pixels | Ratio | Bounds | Edge px | Touches | Avg luma | Avg saturation |
| --- | ---: | ---: | --- | ---: | --- | ---: | ---: |
${rows}
`;
}

function format(value) {
  return Number(value).toFixed(4).replace(/0+$/u, "").replace(/\.$/u, "");
}

function powershellScript() {
  return String.raw`
$ErrorActionPreference = 'Stop'
[void][System.Reflection.Assembly]::LoadWithPartialName('System.Drawing')
$params = $env:AURORA_TOOLSET_EDGE_ARTIFACT_PARAMS | ConvertFrom-Json

function Get-Metrics($color) {
  $r = [double]$color.R
  $g = [double]$color.G
  $b = [double]$color.B
  $max = [Math]::Max($r, [Math]::Max($g, $b))
  $min = [Math]::Min($r, [Math]::Min($g, $b))
  $luma = (0.2126 * $r) + (0.7152 * $g) + (0.0722 * $b)
  $sat = if ($max -eq 0) { 0.0 } else { ($max - $min) / $max }
  [pscustomobject]@{ luma = $luma; saturation = $sat; spread = $max - $min; max = $max; min = $min }
}

function Test-EdgeArtifactCandidate($color) {
  $m = Get-Metrics $color
  $neutralBright = $m.luma -ge 82 -and $m.saturation -le 0.24
  $toolsetGray = $m.spread -le 34 -and $m.min -ge 92
  $washedSidePlane = $m.luma -ge 70 -and $m.saturation -le 0.16 -and $m.spread -le 28
  return $neutralBright -or $toolsetGray -or $washedSidePlane
}

function Add-Candidate($bitmap, [bool[]]$visited, $queue, [int]$width, [int]$x, [int]$y) {
  $index = ($y * $width) + $x
  if ($visited[$index]) { return }
  if (-not (Test-EdgeArtifactCandidate $bitmap.GetPixel($x, $y))) { return }
  $visited[$index] = $true
  $queue.Enqueue($index)
}

$image = [System.Drawing.Image]::FromFile([string]$params.inputPath)
$bitmap = New-Object System.Drawing.Bitmap $image
$width = $bitmap.Width
$height = $bitmap.Height
$candidate = [bool[]]::new($width * $height)
$components = New-Object System.Collections.Generic.List[object]
$black = [System.Drawing.Color]::FromArgb(0,0,0)
$magenta = [System.Drawing.Color]::FromArgb(255,0,180)
$masked = New-Object System.Drawing.Bitmap $bitmap
$artifactPixels = 0
$candidatePixels = 0
$globalMinX = $width
$globalMinY = $height
$globalMaxX = -1
$globalMaxY = -1
$totalPixels = $width * $height
$nearEdgeThreshold = [Math]::Max(10, [int][Math]::Round([Math]::Min($width, $height) * 0.03))
$minSelectedPixels = [Math]::Max(96, [int][Math]::Round($totalPixels * 0.0004))
$largePlanePixels = [Math]::Max(900, [int][Math]::Round($totalPixels * 0.006))

for ($y = 0; $y -lt $height; $y += 1) {
  for ($x = 0; $x -lt $width; $x += 1) {
    $index = ($y * $width) + $x
    if (Test-EdgeArtifactCandidate $bitmap.GetPixel($x, $y)) {
      $candidate[$index] = $true
      $candidatePixels += 1
    }
  }
}

$seen = [bool[]]::new($width * $height)
$componentQueue = [System.Collections.Generic.Queue[int]]::new()
$componentId = 0
for ($start = 0; $start -lt $candidate.Length; $start += 1) {
  if (-not $candidate[$start] -or $seen[$start]) { continue }
  $componentId += 1
  $componentQueue.Clear()
  $componentQueue.Enqueue($start)
  $seen[$start] = $true
  $componentPixels = New-Object System.Collections.Generic.List[int]
  $count = 0
  $minX = $width
  $minY = $height
  $maxX = -1
  $maxY = -1
  $sumLuma = 0.0
  $sumSat = 0.0
  $touches = New-Object System.Collections.Generic.List[string]

  while ($componentQueue.Count -gt 0) {
    $index = $componentQueue.Dequeue()
    [void]$componentPixels.Add($index)
    $x = $index % $width
    $y = [int][Math]::Floor($index / [double]$width)
    $count += 1
    if ($x -lt $minX) { $minX = $x }
    if ($y -lt $minY) { $minY = $y }
    if ($x -gt $maxX) { $maxX = $x }
    if ($y -gt $maxY) { $maxY = $y }
    $m = Get-Metrics $bitmap.GetPixel($x, $y)
    $sumLuma += $m.luma
    $sumSat += $m.saturation
    $neighbors = @()
    if ($x -gt 0) { $neighbors += $index - 1 }
    if ($x -lt ($width - 1)) { $neighbors += $index + 1 }
    if ($y -gt 0) { $neighbors += $index - $width }
    if ($y -lt ($height - 1)) { $neighbors += $index + $width }
    foreach ($neighbor in $neighbors) {
      if ($candidate[$neighbor] -and -not $seen[$neighbor]) {
        $seen[$neighbor] = $true
        $componentQueue.Enqueue($neighbor)
      }
    }
  }

  if ($minX -eq 0) { [void]$touches.Add('left') }
  if ($minY -eq 0) { [void]$touches.Add('top') }
  if ($maxX -eq ($width - 1)) { [void]$touches.Add('right') }
  if ($maxY -eq ($height - 1)) { [void]$touches.Add('bottom') }
  $edgeDistance = [Math]::Min([Math]::Min($minX, $minY), [Math]::Min(($width - 1 - $maxX), ($height - 1 - $maxY)))
  $selected = $count -ge $minSelectedPixels -and ($edgeDistance -le $nearEdgeThreshold -or $count -ge $largePlanePixels)
  if ($selected) {
    foreach ($pixelIndex in $componentPixels) {
      $artifactPixels += 1
      $x = $pixelIndex % $width
      $y = [int][Math]::Floor($pixelIndex / [double]$width)
      if ($x -lt $globalMinX) { $globalMinX = $x }
      if ($y -lt $globalMinY) { $globalMinY = $y }
      if ($x -gt $globalMaxX) { $globalMaxX = $x }
      if ($y -gt $globalMaxY) { $globalMaxY = $y }
      $masked.SetPixel($x, $y, $black)
    }
  } elseif ($count -ge $minSelectedPixels) {
    foreach ($pixelIndex in $componentPixels) {
      $x = $pixelIndex % $width
      $y = [int][Math]::Floor($pixelIndex / [double]$width)
      $masked.SetPixel($x, $y, $magenta)
    }
  }
  if ($selected) {
    $components.Add([pscustomobject]@{
    id = $componentId
    pixelCount = $count
    ratio = [Math]::Round($count / [double]($width * $height), 6)
    bounds = [pscustomobject]@{ x = $minX; y = $minY; width = ($maxX - $minX + 1); height = ($maxY - $minY + 1) }
    edgeDistance = $edgeDistance
    touches = @($touches)
    averageLuma = [Math]::Round($sumLuma / [Math]::Max(1, $count), 4)
    averageSaturation = [Math]::Round($sumSat / [Math]::Max(1, $count), 6)
  })
  }
}

$masked.Save([string]$params.maskedPath, [System.Drawing.Imaging.ImageFormat]::Png)
$masked.Dispose()
$bitmap.Dispose()
$image.Dispose()

$edgeBounds = $null
if ($artifactPixels -gt 0) {
  $edgeBounds = [pscustomobject]@{ x = $globalMinX; y = $globalMinY; width = ($globalMaxX - $globalMinX + 1); height = ($globalMaxY - $globalMinY + 1) }
}

[pscustomobject]@{
  version = 'toolset-crop-edge-artifacts/v2'
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  label = $params.label
  inputPath = $params.inputPath
  maskedPath = $params.maskedPath
  width = $width
  height = $height
  candidatePixels = $candidatePixels
  candidateComponentCount = $componentId
  selectionRule = "neutral/bright low-saturation components with pixels >= $minSelectedPixels and (edgeDistance <= $nearEdgeThreshold or pixels >= $largePlanePixels)"
  artifactPixels = $artifactPixels
  artifactRatio = [Math]::Round($artifactPixels / [double]($width * $height), 6)
  edgeArtifactBounds = $edgeBounds
  edgeComponents = @($components | Sort-Object -Property pixelCount -Descending)
} | ConvertTo-Json -Depth 8 -Compress
`;
}
