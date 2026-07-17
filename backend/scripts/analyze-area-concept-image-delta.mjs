#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");

const DEFAULT_CONCEPT_PATH = resolve(
  repoRoot,
  "docs/assets/last-city/last-city-cartographer-apartment-concept-2026-07-02.png"
);
const DEFAULT_TOOLSET_CROP_PATH = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap30-safe-mood-currentmap-20260705Tproof/toolset-viewport-crop.png"
);
const DEFAULT_OUT_DIR = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta"
);

const TILE_ROLES = [
  { id: "NW", row: 0, col: 0, role: "study lounge" },
  { id: "N", row: 0, col: 1, role: "cartographer map room" },
  { id: "NE", row: 0, col: 2, role: "bedroom nook" },
  { id: "SW", row: 1, col: 0, role: "hearth utility" },
  { id: "S", row: 1, col: 1, role: "entry hall" },
  { id: "SE", row: 1, col: 2, role: "port storage" }
];
const SUBGRID_COLUMNS = 3;
const SUBGRID_ROWS = 3;

const options = parseArgs(process.argv.slice(2));
const conceptPath = resolveMaybeAbsolute(options.concept ?? DEFAULT_CONCEPT_PATH);
const toolsetPath = resolveMaybeAbsolute(options.toolsetCrop ?? options.toolset ?? DEFAULT_TOOLSET_CROP_PATH);
const toolsetEdgeArtifactReportPath = resolveMaybeAbsolute(
  options.toolsetEdgeArtifactReport ?? options.edgeArtifactReport ?? null
);
const outputDir = resolveMaybeAbsolute(options.out ?? DEFAULT_OUT_DIR);
const label = String(options.label ?? "tilemap30-safe-mood-20260705Tproof");

assertReadableFile(conceptPath, "concept image");
assertReadableFile(toolsetPath, "Toolset crop image");
if (toolsetEdgeArtifactReportPath) {
  assertReadableFile(toolsetEdgeArtifactReportPath, "Toolset edge artifact report");
}
mkdirSync(outputDir, { recursive: true });

const edgeArtifactReport = toolsetEdgeArtifactReportPath ? readJson(toolsetEdgeArtifactReportPath) : null;
const ignoredRegions = buildIgnoredRegions(edgeArtifactReport);
const measured = measureImagesWithPowerShell({ conceptPath, toolsetPath, ignoredRegions });
const cells = TILE_ROLES.map((tile) => {
  const concept = measured.concept.cells[tile.id];
  const toolset = measured.toolset.cells[tile.id];
  const brightExcess = Math.max(0, toolset.averageLuma - concept.averageLuma);
  const darkDeficit = Math.max(0, concept.darkPixelRatio - toolset.darkPixelRatio);
  const saturationDeficit = Math.max(0, concept.averageSaturation - toolset.averageSaturation);
  const priority = brightExcess / 45 + darkDeficit * 2 + saturationDeficit * 2.5;
  const subcells = buildSubcellDeltas({ tile, concept, toolset });
  return {
    ...tile,
    concept,
    toolset,
    delta: {
      luma: round(toolset.averageLuma - concept.averageLuma, 2),
      darkRatio: round(toolset.darkPixelRatio - concept.darkPixelRatio, 4),
      saturation: round(toolset.averageSaturation - concept.averageSaturation, 4),
      warmRatio: round(toolset.warmPixelRatio - concept.warmPixelRatio, 4),
      brightExcess: round(brightExcess, 2),
      darkDeficit: round(darkDeficit, 4),
      saturationDeficit: round(saturationDeficit, 4),
      priority: round(priority, 4)
    },
    subcells,
    targetSubcells: subcells.slice(0, 3)
  };
});

const report = {
  version: "last-city-area-concept-image-delta/v3",
  generatedAt: new Date().toISOString(),
  label,
  inputs: {
    conceptPath,
    toolsetPath,
    toolsetEdgeArtifactReportPath,
    ignoredRegions
  },
  grid: {
    columns: 3,
    rows: 2,
    roles: TILE_ROLES
  },
  summary: {
    worstCells: [...cells]
      .sort((a, b) => b.delta.priority - a.delta.priority)
      .slice(0, 3)
      .map((cell) => ({
        id: cell.id,
        role: cell.role,
        priority: cell.delta.priority,
        brightExcess: cell.delta.brightExcess,
        darkDeficit: cell.delta.darkDeficit,
        saturationDeficit: cell.delta.saturationDeficit
      })),
    worstSubcells: cells
      .flatMap((cell) =>
        cell.subcells.map((subcell) => ({
          tile: cell.id,
          role: cell.role,
          subcell: subcell.id,
          zone: subcell.zone,
          priority: subcell.delta.priority,
          brightExcess: subcell.delta.brightExcess,
          darkDeficit: subcell.delta.darkDeficit,
          saturationDeficit: subcell.delta.saturationDeficit
        }))
      )
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 12),
    recommendedDirection: buildRecommendation(cells)
  },
  images: {
    concept: measured.concept.image,
    toolset: measured.toolset.image
  },
  cells
};

const jsonPath = resolve(outputDir, `${label}-image-delta.json`);
const mdPath = resolve(outputDir, `${label}-image-delta.md`);
const svgPath = resolve(outputDir, `${label}-image-delta-heatmap.svg`);

writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(mdPath, renderMarkdown(report), "utf8");
writeFileSync(svgPath, renderSvg(report), "utf8");

console.log(
  JSON.stringify(
    {
      ok: true,
      label,
      outputs: { jsonPath, markdownPath: mdPath, svgPath },
      worstCells: report.summary.worstCells,
      worstSubcells: report.summary.worstSubcells.slice(0, 6),
      recommendedDirection: report.summary.recommendedDirection
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

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function buildIgnoredRegions(edgeArtifactReport) {
  const width = Number(edgeArtifactReport?.width ?? 0);
  const height = Number(edgeArtifactReport?.height ?? 0);
  const components = Array.isArray(edgeArtifactReport?.edgeComponents)
    ? edgeArtifactReport.edgeComponents
    : [];
  if (!width || !height || components.length === 0) {
    return [];
  }
  const edgeDistanceLimitPx = 14;
  return components
    .filter((component) => {
      const bounds = component?.bounds;
      if (!bounds) {
        return false;
      }
      const touches = Array.isArray(component.touches) && component.touches.length > 0;
      const edgeDistance = Number(component.edgeDistance ?? Number.POSITIVE_INFINITY);
      return touches || edgeDistance <= edgeDistanceLimitPx;
    })
    .map((component) => component?.bounds)
    .filter(Boolean)
    .map((bounds) => ({
      x: round(Number(bounds.x ?? 0) / width, 6),
      y: round(Number(bounds.y ?? 0) / height, 6),
      width: round(Number(bounds.width ?? 0) / width, 6),
      height: round(Number(bounds.height ?? 0) / height, 6)
    }))
    .filter((region) => region.width > 0 && region.height > 0);
}

function measureImagesWithPowerShell({ conceptPath, toolsetPath, ignoredRegions }) {
  const payload = JSON.stringify({
    conceptPath,
    toolsetPath,
    tileRoles: TILE_ROLES,
    ignoredRegions,
    subgrid: { columns: SUBGRID_COLUMNS, rows: SUBGRID_ROWS }
  });
  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", getPowershellMeasureScript()],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        AURORA_AREA_IMAGE_DELTA_PARAMS: payload
      },
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024
    }
  );
  return JSON.parse(output);
}

function buildRecommendation(cells) {
  const sorted = [...cells].sort((a, b) => b.delta.priority - a.delta.priority);
  const worst = sorted[0];
  const second = sorted[1];
  const allTop = sorted.slice(0, 3).map((cell) => cell.id).join(", ");
  const parts = [
    `Focus first on ${worst.id} (${worst.role}); top problem cells: ${allTop}.`
  ];
  if (worst.delta.darkDeficit > 0.12 || worst.delta.brightExcess > 18) {
    parts.push("Use darker structural silhouettes or replace bright floor reads before adding more clutter.");
  }
  if (worst.delta.saturationDeficit > 0.06 || second?.delta.saturationDeficit > 0.06) {
    parts.push("Prefer richer wood/textile assets in those cells; do not scale existing rugs blindly.");
  }
  return parts.join(" ");
}

function buildSubcellDeltas({ tile, concept, toolset }) {
  const conceptById = new Map((concept?.subcells ?? []).map((subcell) => [subcell.id, subcell]));
  return (toolset?.subcells ?? [])
    .map((toolsetSubcell) => {
      const conceptSubcell = conceptById.get(toolsetSubcell.id);
      const brightExcess = Math.max(0, Number(toolsetSubcell.averageLuma ?? 0) - Number(conceptSubcell?.averageLuma ?? 0));
      const darkDeficit = Math.max(0, Number(conceptSubcell?.darkPixelRatio ?? 0) - Number(toolsetSubcell.darkPixelRatio ?? 0));
      const saturationDeficit = Math.max(
        0,
        Number(conceptSubcell?.averageSaturation ?? 0) - Number(toolsetSubcell.averageSaturation ?? 0)
      );
      const priority = brightExcess / 45 + darkDeficit * 2 + saturationDeficit * 2.5;
      return {
        id: toolsetSubcell.id,
        tile: tile.id,
        row: Number(toolsetSubcell.row),
        col: Number(toolsetSubcell.col),
        zone: zoneForSubcell(toolsetSubcell),
        concept: conceptSubcell ?? null,
        toolset: toolsetSubcell,
        delta: {
          luma: round(Number(toolsetSubcell.averageLuma ?? 0) - Number(conceptSubcell?.averageLuma ?? 0), 2),
          darkRatio: round(Number(toolsetSubcell.darkPixelRatio ?? 0) - Number(conceptSubcell?.darkPixelRatio ?? 0), 4),
          saturation: round(
            Number(toolsetSubcell.averageSaturation ?? 0) - Number(conceptSubcell?.averageSaturation ?? 0),
            4
          ),
          warmRatio: round(Number(toolsetSubcell.warmPixelRatio ?? 0) - Number(conceptSubcell?.warmPixelRatio ?? 0), 4),
          brightExcess: round(brightExcess, 2),
          darkDeficit: round(darkDeficit, 4),
          saturationDeficit: round(saturationDeficit, 4),
          priority: round(priority, 4)
        }
      };
    })
    .sort((a, b) => b.delta.priority - a.delta.priority);
}

function zoneForSubcell(subcell) {
  const vertical = Number(subcell.row) === 0 ? "north" : Number(subcell.row) === SUBGRID_ROWS - 1 ? "south" : "middle";
  const horizontal = Number(subcell.col) === 0 ? "west" : Number(subcell.col) === SUBGRID_COLUMNS - 1 ? "east" : "center";
  return `${vertical}-${horizontal}`;
}

function renderMarkdown(report) {
  const rows = report.cells
    .map(
      (cell) =>
        `| ${cell.id} | ${cell.role} | ${format(cell.delta.priority)} | ${format(cell.delta.luma)} | ${format(cell.delta.darkRatio)} | ${format(cell.delta.saturation)} | ${nextAction(cell)} |`
    )
    .join("\n");
  const worstRows = report.summary.worstCells
    .map(
      (cell, index) =>
        `${index + 1}. ${cell.id} (${cell.role}) priority=${format(cell.priority)}, brightExcess=${format(cell.brightExcess)}, darkDeficit=${format(cell.darkDeficit)}, saturationDeficit=${format(cell.saturationDeficit)}`
    )
    .join("\n");
  const worstSubcellRows = report.summary.worstSubcells
    .slice(0, 9)
    .map(
      (subcell, index) =>
        `${index + 1}. ${subcell.tile} ${subcell.zone} priority=${format(subcell.priority)}, brightExcess=${format(subcell.brightExcess)}, darkDeficit=${format(subcell.darkDeficit)}, saturationDeficit=${format(subcell.saturationDeficit)}`
    )
    .join("\n");
  return `# Last City Apartment Image Delta

Generated: ${report.generatedAt}
Label: ${report.label}

This is an offline 3x2 image delta between the concept art and the matching
Toolset crop. It does not launch Aurora.

## Inputs

\`\`\`text
${report.inputs.conceptPath}
${report.inputs.toolsetPath}
${report.inputs.toolsetEdgeArtifactReportPath ? report.inputs.toolsetEdgeArtifactReportPath : ""}
\`\`\`

Ignored normalized regions: ${report.inputs.ignoredRegions.length > 0 ? report.inputs.ignoredRegions.map((region) => `${format(region.x)},${format(region.y)},${format(region.width)},${format(region.height)}`).join("; ") : "_none_"}

## Worst Cells

${worstRows}

## Worst Subcells

${worstSubcellRows}

Recommendation: ${report.summary.recommendedDirection}

## Cell Metrics

Positive luma means the Toolset crop is brighter than the concept. Negative
dark ratio means the Toolset crop has less dark mass than the concept.

| Tile | Role | Priority | Luma delta | Dark ratio delta | Saturation delta | Next action |
| --- | --- | ---: | ---: | ---: | ---: | --- |
${rows}
`;
}

function renderSvg(report) {
  const cellW = 220;
  const cellH = 150;
  const width = cellW * 3;
  const height = cellH * 2 + 56;
  const maxPriority = Math.max(...report.cells.map((cell) => cell.delta.priority), 0.001);
  const rects = report.cells
    .map((cell) => {
      const x = cell.col * cellW;
      const y = cell.row * cellH + 56;
      const opacity = Math.min(0.9, 0.18 + (cell.delta.priority / maxPriority) * 0.72);
      const label = `${cell.id} ${cell.role}`;
      const line1 = `priority ${format(cell.delta.priority)}`;
      const line2 = `luma ${format(cell.delta.luma)} dark ${format(cell.delta.darkRatio)}`;
      const line3 = `sat ${format(cell.delta.saturation)}`;
      return [
        `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="rgb(186,42,35)" fill-opacity="${opacity.toFixed(3)}" stroke="#2a1a16" stroke-width="2" />`,
        `<text x="${x + 14}" y="${y + 30}" font-family="Segoe UI, Arial" font-size="18" font-weight="700" fill="#fff">${escapeXml(label)}</text>`,
        `<text x="${x + 14}" y="${y + 60}" font-family="Segoe UI, Arial" font-size="15" fill="#fff">${escapeXml(line1)}</text>`,
        `<text x="${x + 14}" y="${y + 84}" font-family="Segoe UI, Arial" font-size="15" fill="#fff">${escapeXml(line2)}</text>`,
        `<text x="${x + 14}" y="${y + 108}" font-family="Segoe UI, Arial" font-size="15" fill="#fff">${escapeXml(line3)}</text>`
      ].join("\n");
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#171411" />
<text x="18" y="26" font-family="Segoe UI, Arial" font-size="20" font-weight="700" fill="#f7efe5">Last City apartment image delta: ${escapeXml(report.label)}</text>
<text x="18" y="48" font-family="Segoe UI, Arial" font-size="13" fill="#cdbfac">Redder cells need stronger dark mass/saturation work before another Toolset proof.</text>
${rects}
</svg>
`;
}

function nextAction(cell) {
  const actions = [];
  if (cell.delta.darkDeficit > 0.1) {
    actions.push("add dark mass");
  }
  if (cell.delta.brightExcess > 16) {
    actions.push("reduce bright floor");
  }
  if (cell.delta.saturationDeficit > 0.06) {
    actions.push("richer wood/textile");
  }
  return actions.length ? actions.join("; ") : "watch only";
}

function format(value) {
  return Number(value ?? 0).toFixed(Math.abs(value) >= 10 ? 2 : 4);
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(Number(value ?? 0) * factor) / factor;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getPowershellMeasureScript() {
  return String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$params = $env:AURORA_AREA_IMAGE_DELTA_PARAMS | ConvertFrom-Json

function Test-IgnoredRegion($regions, [int]$x, [int]$y, [int]$imageWidth, [int]$imageHeight) {
  if ($null -eq $regions) {
    return $false
  }
  $nx = ($x + 0.5) / [double]$imageWidth
  $ny = ($y + 0.5) / [double]$imageHeight
  foreach ($region in $regions) {
    $rx0 = [double]$region.x
    $ry0 = [double]$region.y
    $rx1 = $rx0 + [double]$region.width
    $ry1 = $ry0 + [double]$region.height
    if ($nx -ge $rx0 -and $nx -le $rx1 -and $ny -ge $ry0 -and $ny -le $ry1) {
      return $true
    }
  }
  return $false
}

function Measure-Cell($bitmap, [int]$left, [int]$top, [int]$width, [int]$height, [int]$step, $ignoredRegions) {
  $sumR = 0.0
  $sumG = 0.0
  $sumB = 0.0
  $sumLuma = 0.0
  $sumSat = 0.0
  $dark = 0
  $warm = 0
  $samples = 0
  $skipped = 0
  $right = [Math]::Min($bitmap.Width, $left + $width)
  $bottom = [Math]::Min($bitmap.Height, $top + $height)
  for ($y = $top; $y -lt $bottom; $y += $step) {
    for ($x = $left; $x -lt $right; $x += $step) {
      if (Test-IgnoredRegion $ignoredRegions $x $y $bitmap.Width $bitmap.Height) {
        $skipped += 1
        continue
      }
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
  if ($samples -le 0) {
    throw "No samples for cell left=$left top=$top width=$width height=$height"
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
    skippedSampleCount = $skipped
  }
}

function Measure-ImageGrid($path, $tileRoles, $ignoredRegions) {
  $bitmap = New-Object System.Drawing.Bitmap $path
  try {
    $cellWidth = [Math]::Floor($bitmap.Width / 3)
    $cellHeight = [Math]::Floor($bitmap.Height / 2)
    $subgridColumns = [int]$params.subgrid.columns
    $subgridRows = [int]$params.subgrid.rows
    $cells = [ordered]@{}
    foreach ($tile in $tileRoles) {
      $left = [int]($tile.col * $cellWidth)
      $top = [int]($tile.row * $cellHeight)
      $width = if ($tile.col -eq 2) { $bitmap.Width - $left } else { $cellWidth }
      $height = if ($tile.row -eq 1) { $bitmap.Height - $top } else { $cellHeight }
      $cell = Measure-Cell $bitmap $left $top $width $height 3 $ignoredRegions
      $subcellWidth = [Math]::Floor($width / $subgridColumns)
      $subcellHeight = [Math]::Floor($height / $subgridRows)
      $subcells = @()
      for ($subRow = 0; $subRow -lt $subgridRows; $subRow += 1) {
        for ($subCol = 0; $subCol -lt $subgridColumns; $subCol += 1) {
          $subLeft = $left + [int]($subCol * $subcellWidth)
          $subTop = $top + [int]($subRow * $subcellHeight)
          $subWidth = if ($subCol -eq ($subgridColumns - 1)) { ($left + $width) - $subLeft } else { $subcellWidth }
          $subHeight = if ($subRow -eq ($subgridRows - 1)) { ($top + $height) - $subTop } else { $subcellHeight }
          $subcell = Measure-Cell $bitmap $subLeft $subTop $subWidth $subHeight 2 $ignoredRegions
          $subcell | Add-Member -MemberType NoteProperty -Name id -Value ([string]::Format("{0}_r{1}c{2}", $tile.id, $subRow, $subCol))
          $subcell | Add-Member -MemberType NoteProperty -Name row -Value $subRow
          $subcell | Add-Member -MemberType NoteProperty -Name col -Value $subCol
          $subcells += $subcell
        }
      }
      $cell | Add-Member -MemberType NoteProperty -Name subcells -Value $subcells
      $cells[$tile.id] = $cell
    }
    return [pscustomobject]@{
      image = [pscustomobject]@{
        path = [string]$path
        width = $bitmap.Width
        height = $bitmap.Height
      }
      cells = $cells
    }
  } finally {
    $bitmap.Dispose()
  }
}

$result = [pscustomobject]@{
  concept = Measure-ImageGrid $params.conceptPath $params.tileRoles $params.ignoredRegions
  toolset = Measure-ImageGrid $params.toolsetPath $params.tileRoles $params.ignoredRegions
}
$result | ConvertTo-Json -Depth 12
`;
}
