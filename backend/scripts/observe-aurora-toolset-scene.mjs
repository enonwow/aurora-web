#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeAuroraToolsetGridPose } from "./analyze-aurora-toolset-grid-pose.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = dirname(scriptPath);

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main();
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`Usage:
  node backend/scripts/observe-aurora-toolset-scene.mjs \\
    --module <exact-toolset-module-name> \\
    --area <area-resref> \\
    --sourceModulePath <decompiled-module-directory> \\
    --outDir <artifact-directory> \\
    [--capturePath <existing-viewport.png>]

The observer is area-agnostic. If --capturePath is omitted, it captures the
currently-open validated Toolset viewport without global input.`);
    return;
  }

  const module = requiredText(options.module, "--module");
  const area = normalizeResref(requiredText(options.area, "--area"));
  const sourceModulePath = requiredDirectory(options.sourceModulePath, "--sourceModulePath");
  const outDir = resolve(requiredText(options.outDir, "--outDir"));
  mkdirSync(outDir, { recursive: true });

  const capturePath = options.capturePath
    ? requiredFile(options.capturePath, "--capturePath")
    : captureLiveViewport({ module, area, outPath: join(outDir, "viewport.png") });
  const sourcePackDir = buildSourcePack({ area, sourceModulePath, outDir });
  const sourceManifest = readJson(join(sourcePackDir, "manifest.json"));
  const sourceGit = readJson(join(sourcePackDir, "raw.git.summary.json"));
  const visualFeatures = analyzeViewport(capturePath);
  const cameraPoseAnalysis = analyzeAuroraToolsetGridPose({ imagePath: capturePath });
  const observation = buildSceneObservation({
    module,
    area,
    capturePath,
    sourceModulePath,
    sourcePackDir,
    sourceManifest,
    sourceGit,
    visualFeatures,
    cameraPoseAnalysis,
  });
  const observationPath = join(outDir, "scene-observation.json");
  writeFileSync(observationPath, `${JSON.stringify(observation, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ status: observation.status, observationPath, observation }, null, 2));
}

export function buildSceneObservation({
  module,
  area,
  capturePath,
  sourceModulePath,
  sourcePackDir,
  sourceManifest,
  sourceGit,
  visualFeatures,
  cameraPoseAnalysis = null,
}) {
  const counts = sourceManifest?.parsed?.git?.counts ?? {};
  const sourceArea = sourceManifest?.parsed?.are ?? {};
  const sceneKinds = ["placeables", "doors", "creatures", "encounters", "items", "sounds", "stores", "triggers", "waypoints"];
  const objectCounts = Object.fromEntries(sceneKinds.map((kind) => [kind, Number(counts[kind] ?? 0)]));
  const totalObjects = Number(counts.total ?? Object.values(objectCounts).reduce((sum, count) => sum + count, 0));
  const cameraPose = normalizeCameraPose(cameraPoseAnalysis);
  const comparisonBlockers = [
    ...(cameraPose.status === "estimated" ? [] : [cameraPose.blockerCode]),
    "scene_semantic_detector_not_implemented",
  ];

  return {
    version: "aurora-toolset-scene-observation/v1",
    status: "captured-and-contextualized",
    observedAt: new Date().toISOString(),
    target: { module, areaResref: area },
    capture: {
      viewportPng: capturePath,
      scope: "validated Toolset Area TScrollBox viewport",
      safety: "read-only capture; no global cursor, keyboard, or mouse",
      viewportBounds: {
        width: numberOrNull(visualFeatures?.image?.width),
        height: numberOrNull(visualFeatures?.image?.height),
      },
    },
    sourceScene: {
      sourceModulePath,
      sourcePackDir,
      area: {
        resref: area,
        name: sourceArea.name ?? null,
        tag: sourceArea.tag ?? null,
        width: numberOrNull(sourceArea.width),
        height: numberOrNull(sourceArea.height),
        tileSet: sourceArea.tileSet ?? null,
        tileCount: numberOrNull(sourceArea.tileCount),
      },
      tiles: {
        contractCsv: join(sourcePackDir, "tile-contract.csv"),
        count: numberOrNull(sourceArea.tileCount),
        orientationUnit: "quarter-turns",
      },
      objects: {
        contractCsv: join(sourcePackDir, "objects.csv"),
        total: totalObjects,
        byKind: objectCounts,
        visualTransformCounts: sourceGit?.visualTransformCounts ?? {},
      },
    },
    visualFeatures,
    cameraPose,
    semanticRecognition: {
      status: "features-only",
      blockerCode: "scene_semantic_detector_not_implemented",
      available: ["viewport bounds", "content coverage", "red guide pixels", "bright saturated pixel candidates", "visual grid pose when axes are visible"],
      deferred: ["tile identity", "placeable identity", "emitter identity", "VFX temporal tracks"],
    },
    comparison: {
      status: "blocked",
      blockerCodes: comparisonBlockers,
      rule: "This artifact may establish capture and source context. It must not claim tile, placeable, emitter, or VFX parity before pose and semantic detection are available.",
    },
  };
}

export function normalizeCameraPose(cameraPoseAnalysis) {
  if (cameraPoseAnalysis?.acceptance?.accepted === true && cameraPoseAnalysis.cameraPose) {
    return {
      status: "estimated",
      ...cameraPoseAnalysis.cameraPose,
      evidence: {
        solver: "aurora-toolset-grid-pose/v1",
        grid: cameraPoseAnalysis.grid ?? null,
        acceptance: cameraPoseAnalysis.acceptance,
      },
    };
  }
  return {
    status: "blocked",
    confidence: Number(cameraPoseAnalysis?.cameraPose?.confidence ?? 0),
    blockerCode: cameraPoseAnalysis?.acceptance?.blockerCode ?? "camera_pose_solver_not_implemented",
    reason: "A visual camera pose is emitted only from validated red/green Toolset grid axes. Full world yaw still requires a directed source anchor.",
  };
}

function captureLiveViewport({ module, area, outPath }) {
  runNode([join(scriptDir, "aurora-toolset-viewport-proof.mjs"), "capture", "--module", module, "--area", area, "--out", outPath]);
  return outPath;
}

function buildSourcePack({ area, sourceModulePath, outDir }) {
  const sourceOutputRoot = join(outDir, "source");
  const sourceName = "area-source-pack";
  runNode([
    join(scriptDir, "build-area-source-proof-pack.mjs"),
    "--area", area,
    "--modulePath", sourceModulePath,
    "--outDir", sourceOutputRoot,
    "--name", sourceName,
  ]);
  const sourcePackDir = join(sourceOutputRoot, sourceName);
  if (!existsSync(join(sourcePackDir, "manifest.json"))) {
    throw new Error(`Source pack did not produce a manifest: ${sourcePackDir}`);
  }
  return sourcePackDir;
}

function analyzeViewport(capturePath) {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$path = $env:AURORA_SCENE_OBSERVATION_VIEWPORT
$bitmap = [System.Drawing.Bitmap]::new($path)
try {
  $step = 2; $samples = 0; $content = 0; $redGuide = 0; $brightSaturated = 0
  $minX = $bitmap.Width; $minY = $bitmap.Height; $maxX = -1; $maxY = -1
  for ($y = 0; $y -lt $bitmap.Height; $y += $step) {
    for ($x = 0; $x -lt $bitmap.Width; $x += $step) {
      $pixel = $bitmap.GetPixel($x, $y); $r = [int]$pixel.R; $g = [int]$pixel.G; $b = [int]$pixel.B
      $max = [Math]::Max($r, [Math]::Max($g, $b)); $min = [Math]::Min($r, [Math]::Min($g, $b)); $luma = 0.2126*$r + 0.7152*$g + 0.0722*$b
      $samples += 1
      if ($luma -gt 18) { $content += 1; $minX=[Math]::Min($minX,$x); $minY=[Math]::Min($minY,$y); $maxX=[Math]::Max($maxX,$x); $maxY=[Math]::Max($maxY,$y) }
      if ($r -ge 130 -and $r -ge (1.65 * [Math]::Max($g, $b))) { $redGuide += 1 }
      if ($max -ge 180 -and ($max - $min) -ge 70) { $brightSaturated += 1 }
    }
  }
  [pscustomobject]@{
    image=[pscustomobject]@{width=$bitmap.Width;height=$bitmap.Height;sampleStep=$step;sampleCount=$samples}
    content=[pscustomobject]@{pixelRatio=[Math]::Round($content/[double]$samples,6);bounds=if($content -gt 0){[pscustomobject]@{x0=$minX;y0=$minY;x1=$maxX;y1=$maxY}}else{$null}}
    redGuidePixelRatio=[Math]::Round($redGuide/[double]$samples,6)
    brightSaturatedPixelRatio=[Math]::Round($brightSaturated/[double]$samples,6)
  } | ConvertTo-Json -Compress
} finally { $bitmap.Dispose() }
`;
  const dir = mkdtempSync(join(tmpdir(), "aurora-scene-observation-"));
  const path = join(dir, "analyze-viewport.ps1");
  writeFileSync(path, script, "utf8");
  try {
    const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path], {
      encoding: "utf8",
      env: { ...process.env, AURORA_SCENE_OBSERVATION_VIEWPORT: capturePath },
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
      windowsHide: true,
    }).trim();
    return JSON.parse(output);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runNode(args) {
  execFileSync(process.execPath, args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 8, timeout: 120_000, windowsHide: true });
}

function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function normalizeResref(value) { return String(value).trim().toLowerCase(); }
function numberOrNull(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") { result.help = true; continue; }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
    result[token.slice(2)] = value; index += 1;
  }
  return result;
}

function requiredText(value, name) { const result = String(value ?? "").trim(); if (!result) throw new Error(`${name} is required.`); return result; }
function requiredDirectory(value, name) { const path = resolve(requiredText(value, name)); if (!existsSync(path)) throw new Error(`${name} does not exist: ${path}`); return path; }
function requiredFile(value, name) { const path = resolve(requiredText(value, name)); if (!existsSync(path)) throw new Error(`${name} does not exist: ${path}`); return path; }
