#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const options = parseArgs(process.argv.slice(2));
  const result = analyzeAuroraToolsetGridPose({
    imagePath: requiredText(options.image, "--image"),
    minimumConfidence: options.minimumConfidence ?? 0.7,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.acceptance.accepted ? 0 : 2;
}

export function analyzeAuroraToolsetGridPose({ imagePath, minimumConfidence = 0.7 }) {
  const resolvedImagePath = resolve(requiredText(imagePath, "imagePath"));
  if (!existsSync(resolvedImagePath)) throw new Error(`Image does not exist: ${resolvedImagePath}`);
  const acceptedConfidence = numberInRange(minimumConfidence, "minimumConfidence", 0, 1);
  const result = runPowerShell(String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$path = $env:AURORA_GRID_POSE_IMAGE

function Angle-Difference([double]$left, [double]$right) {
  $difference = [Math]::Abs($left - $right) % 180
  if ($difference -gt 90) { $difference = 180 - $difference }
  return $difference
}

function Find-HoughLines($points) {
  $accumulator = @{}
  foreach ($point in $points) {
    for ($theta = 0; $theta -lt 180; $theta += 1) {
      $radians = $theta * [Math]::PI / 180.0
      $rho = [int]([Math]::Round((($point.x * [Math]::Cos($radians)) + ($point.y * [Math]::Sin($radians))) / 2.0) * 2)
      $key = "$theta|$rho"
      if ($accumulator.ContainsKey($key)) { $accumulator[$key] += 1 } else { $accumulator[$key] = 1 }
    }
  }
  return @($accumulator.GetEnumerator() |
    ForEach-Object {
      $parts = $_.Key -split '\|'
      [pscustomobject]@{
        normalDeg = [int]$parts[0]
        directionDeg = (([int]$parts[0] + 90) % 180)
        rho = [int]$parts[1]
        support = [int]$_.Value
      }
    } |
    Where-Object { $_.support -ge 20 } |
    Sort-Object support -Descending)
}

function Build-DirectionFamilies($lines) {
  $families = @()
  foreach ($line in $lines) {
    $family = $families | Where-Object { (Angle-Difference $_.directionDeg $line.directionDeg) -le 3 } | Select-Object -First 1
    if ($null -eq $family) {
      $family = [pscustomobject]@{ directionDeg=[double]$line.directionDeg; totalSupport=0; lines=@() }
      $families += $family
    }
    if (@($family.lines | Where-Object { [Math]::Abs($_.rho - $line.rho) -le 4 }).Count -eq 0) {
      $family.lines = @($family.lines) + @($line)
      $family.totalSupport += $line.support
    }
  }
  return @($families | ForEach-Object {
    $_.lines = @($_.lines | Sort-Object support -Descending)
    $_
  } | Sort-Object totalSupport -Descending)
}

function Get-Spacing($family) {
  if ($null -eq $family -or $family.lines.Count -lt 2) { return $null }
  $best = $null
  for ($index = 0; $index -lt $family.lines.Count; $index += 1) {
    for ($next = $index + 1; $next -lt $family.lines.Count; $next += 1) {
      $spacing = [Math]::Abs($family.lines[$index].rho - $family.lines[$next].rho)
      if ($spacing -lt 20) { continue }
      $support = $family.lines[$index].support + $family.lines[$next].support
      if ($null -eq $best -or $support -gt $best.support) {
        $best = [pscustomobject]@{ pixels=$spacing; support=$support; rhos=@($family.lines[$index].rho, $family.lines[$next].rho) }
      }
    }
  }
  return $best
}

$bitmap = [System.Drawing.Bitmap]::new($path)
try {
  $green = @(); $red = @()
  for ($y = 0; $y -lt $bitmap.Height; $y += 1) {
    for ($x = 0; $x -lt $bitmap.Width; $x += 1) {
      $pixel = $bitmap.GetPixel($x, $y); $r=[int]$pixel.R; $g=[int]$pixel.G; $b=[int]$pixel.B
      if ($g -ge 100 -and $g -ge (1.5 * [Math]::Max($r, $b))) { $green += [pscustomobject]@{x=$x;y=$y} }
      if ($r -ge 150 -and $r -ge (1.7 * [Math]::Max($g, $b))) { $red += [pscustomobject]@{x=$x;y=$y} }
    }
  }
  $minimumAxisColorPixels = 200
  if ($green.Count -lt $minimumAxisColorPixels -or $red.Count -lt $minimumAxisColorPixels) {
    [pscustomobject]@{ status='blocked'; blockerCode='toolset_grid_axis_color_support_insufficient'; image=[pscustomobject]@{width=$bitmap.Width;height=$bitmap.Height}; candidates=[pscustomobject]@{greenPixels=$green.Count;redPixels=$red.Count;minimumAxisColorPixels=$minimumAxisColorPixels} } | ConvertTo-Json -Depth 8 -Compress
    exit 0
  }
  $greenLines = Find-HoughLines $green
  $redLines = Find-HoughLines $red
  $families = Build-DirectionFamilies (@($greenLines) + @($redLines))
  $bestPair = $null
  for ($left = 0; $left -lt $families.Count; $left += 1) {
    for ($right = $left + 1; $right -lt $families.Count; $right += 1) {
      $perpendicularError = [Math]::Abs((Angle-Difference $families[$left].directionDeg $families[$right].directionDeg) - 90)
      if ($perpendicularError -gt 6) { continue }
      $spacingA = Get-Spacing $families[$left]; $spacingB = Get-Spacing $families[$right]
      if ($null -eq $spacingA -or $null -eq $spacingB) { continue }
      $support = $families[$left].totalSupport + $families[$right].totalSupport
      if ($null -eq $bestPair -or $support -gt $bestPair.support) {
        $bestPair = [pscustomobject]@{ first=$families[$left]; second=$families[$right]; spacingA=$spacingA; spacingB=$spacingB; perpendicularErrorDeg=$perpendicularError; support=$support }
      }
    }
  }
  if ($null -eq $bestPair) {
    [pscustomobject]@{ status='blocked'; blockerCode='toolset_grid_axes_not_detected'; image=[pscustomobject]@{width=$bitmap.Width;height=$bitmap.Height}; candidates=[pscustomobject]@{greenPixels=$green.Count;redPixels=$red.Count;lineCount=$greenLines.Count+$redLines.Count;familyCount=$families.Count} } | ConvertTo-Json -Depth 8 -Compress
    exit 0
  }
  $spacingMin = [Math]::Min($bestPair.spacingA.pixels, $bestPair.spacingB.pixels)
  $spacingMax = [Math]::Max($bestPair.spacingA.pixels, $bestPair.spacingB.pixels)
  $axisRatio = $spacingMin / [double]$spacingMax
  $pitchDeg = [Math]::Asin([Math]::Min(1.0, $axisRatio)) * 180.0 / [Math]::PI
  $yawMod90 = ($bestPair.first.directionDeg % 90 + 90) % 90
  $lineConfidence = [Math]::Min(1.0, $bestPair.support / 600.0)
  $orthogonalityConfidence = [Math]::Max(0.0, 1.0 - ($bestPair.perpendicularErrorDeg / 6.0))
  $spacingConfidence = if ($spacingMin -ge 20) { 1.0 } else { 0.0 }
  $confidence = [Math]::Round((0.45*$lineConfidence)+(0.35*$orthogonalityConfidence)+(0.20*$spacingConfidence),4)
  [pscustomobject]@{
    status='estimated'
    image=[pscustomobject]@{width=$bitmap.Width;height=$bitmap.Height}
    cameraPose=[pscustomobject]@{
      type='visual_grid_pose'
      yawDegreesModulo90=[Math]::Round($yawMod90,3)
      yawDefinition='screen-grid orientation modulo 90 degrees; full world yaw requires a directed source anchor'
      pitchDegrees=[Math]::Round($pitchDeg,3)
      pitchDefinition='visual elevation derived from the ratio of two perpendicular projected tile spacings; 90 means top-down'
      zoomPixelsPerTile=[Math]::Round([Math]::Sqrt($bestPair.spacingA.pixels*$bestPair.spacingB.pixels),3)
      confidence=$confidence
    }
    grid=[pscustomobject]@{
      directionA=[Math]::Round($bestPair.first.directionDeg,3); directionB=[Math]::Round($bestPair.second.directionDeg,3)
      spacingA=$bestPair.spacingA; spacingB=$bestPair.spacingB; perpendicularErrorDeg=[Math]::Round($bestPair.perpendicularErrorDeg,3)
      greenPixels=$green.Count; redPixels=$red.Count
    }
  } | ConvertTo-Json -Depth 8 -Compress
} finally { $bitmap.Dispose() }
`, { AURORA_GRID_POSE_IMAGE: resolvedImagePath });

  const accepted = result.status === "estimated" && result.cameraPose.confidence >= acceptedConfidence;
  return {
    ...result,
    acceptance: {
      minimumConfidence: acceptedConfidence,
      accepted,
      blockerCode: accepted ? null : result.blockerCode ?? "toolset_grid_pose_low_confidence",
    },
  };
}

function runPowerShell(source, env) {
  const dir = mkdtempSync(join(tmpdir(), "aurora-grid-pose-"));
  const path = join(dir, "analyze.ps1");
  writeFileSync(path, source, "utf8");
  try {
    const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path], {
      encoding: "utf8",
      env: { ...process.env, ...env },
      maxBuffer: 1024 * 1024 * 4,
      timeout: 60_000,
      windowsHide: true,
    }).trim();
    return JSON.parse(output);
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

function numberInRange(value, name, min, max) {
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max) throw new Error(`${name} must be in ${min}..${max}.`);
  return result;
}
