#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const options = parseArgs(process.argv.slice(2));
  const result = analyzeAuroraToolsetSelectionAnchor({ imagePath: requiredText(options.image, "--image") });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.acceptance.accepted ? 0 : 2;
}

export function analyzeAuroraToolsetSelectionAnchor({ imagePath }) {
  const resolvedImagePath = resolve(requiredText(imagePath, "imagePath"));
  if (!existsSync(resolvedImagePath)) throw new Error(`Image does not exist: ${resolvedImagePath}`);
  const result = runPowerShell(String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$path = $env:AURORA_SELECTION_ANCHOR_IMAGE
$bitmap = [System.Drawing.Bitmap]::new($path)
try {
  $minimumPixels = 200; $minimumExtent = 20
  $count = 0; $sumX = 0.0; $sumY = 0.0; $minX = $bitmap.Width; $minY = $bitmap.Height; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $bitmap.Height; $y += 1) {
    for ($x = 0; $x -lt $bitmap.Width; $x += 1) {
      $pixel = $bitmap.GetPixel($x, $y); $r = [int]$pixel.R; $g = [int]$pixel.G; $b = [int]$pixel.B
      if ($b -ge 100 -and $b -ge (1.5 * [Math]::Max($r, $g))) {
        $count += 1; $sumX += $x; $sumY += $y
        if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  $width = $maxX - $minX + 1; $height = $maxY - $minY + 1
  if ($count -lt $minimumPixels -or $width -lt $minimumExtent -or $height -lt $minimumExtent) {
    [pscustomobject]@{status='blocked';blockerCode='toolset_selection_anchor_not_visible';image=[pscustomobject]@{width=$bitmap.Width;height=$bitmap.Height};candidates=[pscustomobject]@{bluePixels=$count;minimumPixels=$minimumPixels;width=$width;height=$height;minimumExtent=$minimumExtent}} | ConvertTo-Json -Compress
    exit 0
  }
  [pscustomobject]@{
    status='estimated'
    image=[pscustomobject]@{width=$bitmap.Width;height=$bitmap.Height}
    selectionAnchor=[pscustomobject]@{
      type='visual_blue_selection_outline'
      semanticIdentity='not inferred: visual anchor only'
      bluePixels=$count
      bounds=[pscustomobject]@{left=$minX;top=$minY;right=$maxX;bottom=$maxY;width=$width;height=$height}
      center=[pscustomobject]@{x=[Math]::Round($sumX/$count,3);y=[Math]::Round($sumY/$count,3)}
      confidence=[Math]::Round([Math]::Min(1.0, $count / 900.0),3)
    }
  } | ConvertTo-Json -Depth 6 -Compress
} finally { $bitmap.Dispose() }
`, { AURORA_SELECTION_ANCHOR_IMAGE: resolvedImagePath });
  const accepted = result.status === "estimated";
  return {
    ...result,
    acceptance: {
      accepted,
      blockerCode: accepted ? null : result.blockerCode ?? "toolset_selection_anchor_unavailable",
    },
  };
}

function runPowerShell(source, env) {
  const dir = mkdtempSync(join(tmpdir(), "aurora-selection-anchor-"));
  const path = join(dir, "analyze.ps1");
  writeFileSync(path, source, "utf8");
  try {
    return JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path], {
      encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 1024 * 1024 * 2, timeout: 60_000, windowsHide: true,
    }).trim());
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
    result[token.slice(2)] = value; index += 1;
  }
  return result;
}

function requiredText(value, name) {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`${name} is required.`);
  return result;
}
