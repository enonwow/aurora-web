#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readArgs(argv) {
  const options = {
    toolset: "",
    web: "",
    outDir: "",
    name: "toolset-web-topdown-comparison",
    comparison: "",
    toolsetBox: null,
    webBox: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--toolset" && next) {
      options.toolset = next;
      index += 1;
    } else if (arg === "--web" && next) {
      options.web = next;
      index += 1;
    } else if (arg === "--outDir" && next) {
      options.outDir = next;
      index += 1;
    } else if (arg === "--name" && next) {
      options.name = next;
      index += 1;
    } else if (arg === "--comparison" && next) {
      options.comparison = next;
      index += 1;
    } else if (arg === "--toolsetBox" && next) {
      options.toolsetBox = parseBox(next, "--toolsetBox");
      index += 1;
    } else if (arg === "--webBox" && next) {
      options.webBox = parseBox(next, "--webBox");
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return options;
}

function printUsage() {
  console.log(`Usage:
node backend/scripts/compare-area-toolset-web-topdown.mjs \\
  --toolset <toolset-topdown.png> \\
  --web <web-canvas-topdown.png> \\
  --comparison <comparison.json> \\
  --outDir <artifact-dir> \\
  --name <output-name>

Alternatively pass --toolsetBox left,top,right,bottom and --webBox left,top,right,bottom.`);
}

function parseBox(value, label) {
  const parts = value
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry));
  if (parts.length !== 4) {
    throw new Error(`${label} must be left,top,right,bottom`);
  }
  const [left, top, right, bottom] = parts;
  if (right <= left || bottom <= top) {
    throw new Error(`${label} must have right > left and bottom > top`);
  }
  return parts;
}

function stripBom(text) {
  return text.replace(/^\uFEFF/u, "");
}

function readComparisonBoxes(comparisonPath) {
  if (!comparisonPath) {
    return {};
  }
  const fullPath = resolve(repoRoot, comparisonPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Comparison file not found: ${fullPath}`);
  }
  const comparison = JSON.parse(stripBom(readFileSync(fullPath, "utf8")));
  const evidence = comparison.visualEvidence ?? {};
  return {
    toolsetBox: Array.isArray(evidence.toolsetSceneBox)
      ? evidence.toolsetSceneBox
      : undefined,
    webBox: Array.isArray(evidence.webSceneBox) ? evidence.webSceneBox : undefined
  };
}

function resolveRequiredPath(value, label) {
  if (!value) {
    throw new Error(`${label} is required`);
  }
  const fullPath = resolve(repoRoot, value);
  if (!existsSync(fullPath)) {
    throw new Error(`${label} does not exist: ${fullPath}`);
  }
  return fullPath;
}

function powershellLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runImageComparison(params) {
  const psScript = `
Add-Type -AssemblyName System.Drawing
$toolPath = ${powershellLiteral(params.toolset)}
$webPath = ${powershellLiteral(params.web)}
$toolCropPath = ${powershellLiteral(params.toolsetCrop)}
$webCropPath = ${powershellLiteral(params.webCrop)}
$heatmapPath = ${powershellLiteral(params.heatmap)}
$triptychPath = ${powershellLiteral(params.triptych)}
$toolBox = @(${params.toolsetBox.join(",")})
$webBox = @(${params.webBox.join(",")})
$width = [int]($toolBox[2] - $toolBox[0])
$height = [int]($toolBox[3] - $toolBox[1])

function New-CropBitmap($path, $box, $targetWidth, $targetHeight) {
  $src = [System.Drawing.Bitmap]::new($path)
  try {
    $dst = [System.Drawing.Bitmap]::new($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($dst)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $srcRect = [System.Drawing.Rectangle]::new([int]$box[0], [int]$box[1], [int]($box[2] - $box[0]), [int]($box[3] - $box[1]))
      $dstRect = [System.Drawing.Rectangle]::new(0, 0, $targetWidth, $targetHeight)
      $graphics.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    } finally {
      $graphics.Dispose()
    }
    return $dst
  } finally {
    $src.Dispose()
  }
}

$toolCrop = New-CropBitmap $toolPath $toolBox $width $height
$webCrop = New-CropBitmap $webPath $webBox $width $height
$heatmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$sum = 0.0
$sumSq = 0.0
$max = 0
$thresholds = @(16, 32, 64, 96, 128)
$counts = [ordered]@{}
foreach ($threshold in $thresholds) {
  $counts[[string]$threshold] = 0
}
for ($y = 0; $y -lt $height; $y += 1) {
  for ($x = 0; $x -lt $width; $x += 1) {
    $left = $toolCrop.GetPixel($x, $y)
    $right = $webCrop.GetPixel($x, $y)
    $diff = [int](([Math]::Abs($left.R - $right.R) + [Math]::Abs($left.G - $right.G) + [Math]::Abs($left.B - $right.B)) / 3)
    $sum += $diff
    $sumSq += $diff * $diff
    if ($diff -gt $max) {
      $max = $diff
    }
    foreach ($threshold in $thresholds) {
      if ($diff -ge $threshold) {
        $counts[[string]$threshold] += 1
      }
    }
    $red = [Math]::Min(255, [int]($diff * 2.2))
    $green = [Math]::Max(0, 255 - [int]($diff * 2.4))
    $blue = if ($diff -lt 16) { 0 } else { [Math]::Min(255, [int]($diff * 0.8)) }
    $heatmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $red, $green, $blue))
  }
}

$pixelCount = $width * $height
$ratios = [ordered]@{}
foreach ($threshold in $thresholds) {
  $ratios[[string]$threshold] = [Math]::Round($counts[[string]$threshold] / $pixelCount, 6)
}
$mean = [Math]::Round($sum / $pixelCount, 4)
$rms = [Math]::Round([Math]::Sqrt($sumSq / $pixelCount), 4)

$toolCrop.Save($toolCropPath, [System.Drawing.Imaging.ImageFormat]::Png)
$webCrop.Save($webCropPath, [System.Drawing.Imaging.ImageFormat]::Png)
$heatmap.Save($heatmapPath, [System.Drawing.Imaging.ImageFormat]::Png)

$header = 34
$triptych = [System.Drawing.Bitmap]::new($width * 3, $height + $header, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($triptych)
try {
  $graphics.Clear([System.Drawing.Color]::Black)
  $font = [System.Drawing.Font]::new('Arial', 13)
  try {
    $brush = [System.Drawing.Brushes]::White
    $graphics.DrawString('Aurora Toolset crop', $font, $brush, 8, 8)
    $graphics.DrawString('Web current normalized', $font, $brush, $width + 8, 8)
    $graphics.DrawString('RGB diff heatmap', $font, $brush, ($width * 2) + 8, 8)
    $graphics.DrawImage($toolCrop, 0, $header)
    $graphics.DrawImage($webCrop, $width, $header)
    $graphics.DrawImage($heatmap, $width * 2, $header)
  } finally {
    $font.Dispose()
  }
} finally {
  $graphics.Dispose()
}
$triptych.Save($triptychPath, [System.Drawing.Imaging.ImageFormat]::Png)

$toolCrop.Dispose()
$webCrop.Dispose()
$heatmap.Dispose()
$triptych.Dispose()

[ordered]@{
  meanGray = $mean
  rmsGray = $rms
  maxGray = $max
  pixelCount = $pixelCount
  thresholdCounts = $counts
  thresholdRatios = $ratios
} | ConvertTo-Json -Depth 6
`;

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript],
    {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    }
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `PowerShell image comparison failed (${result.status}):\n${result.stderr}\n${result.stdout}`
    );
  }
  return JSON.parse(stripBom(result.stdout.trim()));
}

function main() {
  const options = readArgs(process.argv.slice(2));
  const comparisonBoxes = readComparisonBoxes(options.comparison);
  const toolsetBox = options.toolsetBox ?? comparisonBoxes.toolsetBox;
  const webBox = options.webBox ?? comparisonBoxes.webBox;
  if (!toolsetBox || !webBox) {
    throw new Error("Missing crop boxes. Pass --comparison or both --toolsetBox and --webBox.");
  }
  const toolset = resolveRequiredPath(options.toolset, "--toolset");
  const web = resolveRequiredPath(options.web, "--web");
  const outDir = options.outDir
    ? resolve(repoRoot, options.outDir)
    : dirname(web);
  const name = options.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const paths = {
    toolsetCrop: resolve(outDir, `${name}.toolset-crop.png`),
    webCrop: resolve(outDir, `${name}.web-crop-normalized.png`),
    heatmap: resolve(outDir, `${name}.diff-heatmap.png`),
    triptych: resolve(outDir, `${name}.triptych.png`),
    json: resolve(outDir, `${name}.json`)
  };
  const diffStats = runImageComparison({
    toolset,
    web,
    toolsetBox,
    webBox,
    ...paths
  });
  const payload = {
    version: "aurora-area-toolset-web-visual-comparison/v3",
    generatedAt: new Date().toISOString(),
    method:
      "absolute RGB difference converted to grayscale after fixed Toolset scene crop and Web resize to Toolset crop size",
    inputs: {
      toolsetTopdown: toolset,
      webCanvasTopdown: web,
      comparison: options.comparison ? resolve(repoRoot, options.comparison) : null
    },
    outputs: {
      toolsetSceneCrop: paths.toolsetCrop,
      webSceneCropNormalized: paths.webCrop,
      sceneDiffHeatmap: paths.heatmap,
      sceneDiffTriptych: paths.triptych
    },
    crop: {
      toolsetSceneBox: toolsetBox,
      webSceneBox: webBox,
      cropSize: [toolsetBox[2] - toolsetBox[0], toolsetBox[3] - toolsetBox[1]],
      normalization: {
        mode: "web-scene-box-resized-to-toolset-scene-box",
        toolsetSourceSize: [toolsetBox[2] - toolsetBox[0], toolsetBox[3] - toolsetBox[1]],
        webSourceSize: [webBox[2] - webBox[0], webBox[3] - webBox[1]],
        targetSize: [toolsetBox[2] - toolsetBox[0], toolsetBox[3] - toolsetBox[1]]
      }
    },
    diffStats
  };
  writeFileSync(paths.json, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  console.error(`wrote ${basename(paths.json)}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
