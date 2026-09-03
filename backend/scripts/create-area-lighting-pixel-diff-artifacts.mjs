#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";
const DEFAULT_OUTPUT = "area-lighting-pixel-diff-artifacts.json";

const DIFF_CASES = [
  {
    caseId: "shadowvol-campfire-retail-vs-web-normalized",
    title: "Shadow-volume campfire retail/toolset vs Aurora Web normalized diff",
    left: "retail-or-toolset-shadowvol-campfire.png",
    right: "aurora-web-shadowvol-campfire.png",
    output: "shadowvol-campfire-retail-web-diff-normalized.png",
    sampleWidth: 192,
    sampleHeight: 128,
    requiredFor: ["shadowvol-campfire-pixel-compare.json"],
    blocker:
      "Dimensions differ, so this is a normalized diagnostic heatmap only; it does not prove receiver alignment, projected footprint, or opacity tolerance.",
  },
  {
    caseId: "blindvision-retail-before-active",
    title: "ProgFX BlindVision retail before/active diff",
    left: "retail-progfx-blindvision-before.png",
    right: "retail-progfx-blindvision-active.png",
    output: "retail-progfx-blindvision-before-active-diff.png",
    sampleWidth: 192,
    sampleHeight: 135,
    requiredFor: ["retail-progfx-blindvision-pixel-compare.json"],
    blocker:
      "Retail mutation is measured, but local-vs-retail viewport normalization and tolerance are still required before parity can pass.",
  },
  {
    caseId: "cross-lane-budget-retail-before-after",
    title: "Retail cross-lane constrained-budget before/after diff",
    left: "retail-cross-lane-all-lanes-before-budget.png",
    right: "retail-cross-lane-all-lanes-after-budget.png",
    output: "retail-cross-lane-budget-before-after-diff.png",
    sampleWidth: 192,
    sampleHeight: 135,
    requiredFor: [
      "cross-lane-precedence-compare.json",
      "retail-cross-lane-active-slots.json",
    ],
    blocker:
      "Budget-sensitive pixels are visible, but isolated lane-reference captures or a direct slot dump are still required to map pixels to accepted/dropped owners.",
  },
];

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    output: DEFAULT_OUTPUT,
    mode: "retail-diagnostic",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--artifactDir") {
      index += 1;
      options.artifactDir = requireValue(arg, argv[index]);
    } else if (arg === "--out" || arg === "--output") {
      index += 1;
      options.output = requireValue(arg, argv[index]);
    } else if (arg === "--mode") {
      index += 1;
      options.mode = requireValue(arg, argv[index]);
    } else if (
      [
        "--off",
        "--on",
        "--offFrame",
        "--onFrame",
        "--diff",
        "--comparison",
        "--cropComparison",
        "--caseId",
      ].includes(arg)
    ) {
      index += 1;
      options[arg.slice(2)] = requireValue(arg, argv[index]);
    } else if (
      ["--sampleWidth", "--sampleHeight", "--cropScale", "--cropMargin"].includes(arg)
    ) {
      index += 1;
      options[arg.slice(2)] = Number(requireValue(arg, argv[index]));
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage: node scripts/create-area-lighting-pixel-diff-artifacts.mjs [options]

Options:
  --repoRoot <path>       Repository root. Defaults to aurora-web root.
  --artifactDir <path>    Artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
  --out <name-or-path>    Output report path or artifact-dir-relative filename.
  --mode <mode>           retail-diagnostic (default) or placeable-lighting-off-on-ablation.
  --off <png>             Point-light-disabled PNG for placeable ablation mode.
  --on <png>              Point-light-enabled PNG for placeable ablation mode.
  --offFrame <json>       Capture frame JSON paired with --off.
  --onFrame <json>        Capture frame JSON paired with --on.
  --diff <png>            Diff PNG filename for placeable ablation mode.
  --comparison <png>      Exact OFF|ON side-by-side PNG for placeable ablation mode.
  --cropComparison <png>  Enlarged OFF|ON crop around the measured changed-pixel bounds.
  --cropScale <number>    Integer crop enlargement factor. Defaults to 3.
  --cropMargin <pixels>   Source-pixel margin around changed bounds. Defaults to 24.
  --sampleWidth <pixels>  Diff sample width for placeable ablation mode.
  --sampleHeight <pixels> Diff sample height for placeable ablation mode.
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function resolveArtifactPath(repoRoot, artifactDir, name) {
  if (isAbsolute(name)) {
    return name;
  }
  const repoRelative = resolve(repoRoot, name);
  if (existsSync(repoRelative)) {
    return repoRelative;
  }
  return resolve(artifactDir, name);
}

function resolveOutputPath(repoRoot, artifactDir, output) {
  if (isAbsolute(output)) {
    return output;
  }
  if (output.includes("/") || output.includes("\\")) {
    return resolve(repoRoot, output);
  }
  return resolve(artifactDir, output);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function describeFile(repoRoot, path) {
  const stats = statSync(path);
  const bytes = readFileSync(path);
  return {
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    sha256: sha256(bytes),
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizePointLightAblationRoute(routeValue) {
  try {
    const route = new URL(routeValue);
    const pointLight = route.searchParams.get("lightingPointLight");
    route.searchParams.delete("lightingPointLight");
    route.searchParams.sort();
    return { pointLight, normalized: route.toString() };
  } catch {
    return { pointLight: null, normalized: null };
  }
}

function validatePlaceableLightingAblationPair(offFrame, onFrame) {
  const blockers = [];
  const offRoute = normalizePointLightAblationRoute(offFrame?.finalRoute);
  const onRoute = normalizePointLightAblationRoute(onFrame?.finalRoute);
  const offProof = offFrame?.domStatus?.placeableLightingProof;
  const onProof = onFrame?.domStatus?.placeableLightingProof;
  const offAreaFrame = offFrame?.domStatus?.areaFrameJson;
  const onAreaFrame = onFrame?.domStatus?.areaFrameJson;
  const sameCamera = sameJson(offAreaFrame?.cameraPosition, onAreaFrame?.cameraPosition);
  const sameViewport = sameJson(offFrame?.requestedViewport, onFrame?.requestedViewport);
  const sameSceneIdentity =
    offFrame?.proofGateReport?.identity?.status === "ready" &&
    onFrame?.proofGateReport?.identity?.status === "ready" &&
    sameJson(offFrame.proofGateReport.identity, onFrame.proofGateReport.identity) &&
    sameJson(offAreaFrame?.injectedCampfirePosition, onAreaFrame?.injectedCampfirePosition);
  const offProfile = offProof?.profile;
  const onProfile = onProof?.profile;
  const offPointLightCount = Number(offProof?.facts?.pointLightCount ?? -1);
  const onPointLightCount = Number(onProof?.facts?.pointLightCount ?? -1);

  if (
    offFrame?.captureIntegrityAccepted !== true ||
    onFrame?.captureIntegrityAccepted !== true
  ) {
    blockers.push("capture-integrity-not-accepted");
  }
  if (!sameViewport) {
    blockers.push("viewport-mismatch");
  }
  if (!sameCamera) {
    blockers.push("camera-mismatch");
  }
  if (!sameSceneIdentity) {
    blockers.push("scene-identity-mismatch");
  }
  if (
    offRoute.pointLight !== "false" ||
    onRoute.pointLight !== "true" ||
    !offRoute.normalized ||
    offRoute.normalized !== onRoute.normalized
  ) {
    blockers.push("route-diff-not-isolated-to-lightingPointLight");
  }
  if (
    !offProfile ||
    !onProfile ||
    offProfile.pointLight !== false ||
    onProfile.pointLight !== true ||
    !sameJson({ ...offProfile, pointLight: true }, onProfile)
  ) {
    blockers.push("proof-profile-diff-not-isolated-to-pointLight");
  }
  if (
    offProof?.facts?.assetSettlementStatus !== "settled" ||
    onProof?.facts?.assetSettlementStatus !== "settled"
  ) {
    blockers.push("assets-not-settled");
  }
  if (
    offProof?.status !== "blocked" ||
    !offProof?.blockerCodes?.includes("APL-PROOF-POINT-LIGHT-DISABLED") ||
    onProof?.status !== "eligible_for_off_on_ablation"
  ) {
    blockers.push("proof-status-not-an-off-on-ablation-pair");
  }
  if (offPointLightCount !== 0 || onPointLightCount < 1) {
    blockers.push("point-light-count-transition-missing");
  }

  return {
    passed: blockers.length === 0,
    sameCamera,
    sameViewport,
    sameSceneIdentity,
    offPointLightCount,
    onPointLightCount,
    blockers,
  };
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  return pb <= pc ? b : c;
}

function readPngRgba(path) {
  const buffer = readFileSync(path);
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`${path} is not a PNG file.`);
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (bitDepth !== 8 || ![0, 2, 6].includes(colorType)) {
    throw new Error(`${path} uses unsupported PNG bitDepth=${bitDepth} colorType=${colorType}.`);
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const bytesPerPixel = channels;
  const scanlineLength = width * channels;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const raw = Buffer.alloc(width * height * channels);
  let inputOffset = 0;
  let outputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    for (let x = 0; x < scanlineLength; x += 1) {
      const rawValue = inflated[inputOffset + x];
      const left = x >= bytesPerPixel ? raw[outputOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? raw[outputOffset + x - scanlineLength] : 0;
      const upLeft =
        y > 0 && x >= bytesPerPixel ? raw[outputOffset + x - scanlineLength - bytesPerPixel] : 0;
      let value;
      if (filter === 0) {
        value = rawValue;
      } else if (filter === 1) {
        value = rawValue + left;
      } else if (filter === 2) {
        value = rawValue + up;
      } else if (filter === 3) {
        value = rawValue + Math.floor((left + up) / 2);
      } else if (filter === 4) {
        value = rawValue + paethPredictor(left, up, upLeft);
      } else {
        throw new Error(`${path} uses unsupported PNG filter ${filter}.`);
      }
      raw[outputOffset + x] = value & 0xff;
    }
    inputOffset += scanlineLength;
    outputOffset += scanlineLength;
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    if (colorType === 6) {
      rgba[index * 4] = raw[index * 4];
      rgba[index * 4 + 1] = raw[index * 4 + 1];
      rgba[index * 4 + 2] = raw[index * 4 + 2];
      rgba[index * 4 + 3] = raw[index * 4 + 3];
    } else if (colorType === 2) {
      rgba[index * 4] = raw[index * 3];
      rgba[index * 4 + 1] = raw[index * 3 + 1];
      rgba[index * 4 + 2] = raw[index * 3 + 2];
      rgba[index * 4 + 3] = 255;
    } else {
      rgba[index * 4] = raw[index];
      rgba[index * 4 + 1] = raw[index];
      rgba[index * 4 + 2] = raw[index];
      rgba[index * 4 + 3] = 255;
    }
  }
  return { width, height, rgba };
}

function pixelAt(image, x, y) {
  const clampedX = Math.max(0, Math.min(image.width - 1, x));
  const clampedY = Math.max(0, Math.min(image.height - 1, y));
  const offset = (clampedY * image.width + clampedX) * 4;
  return [
    image.rgba[offset],
    image.rgba[offset + 1],
    image.rgba[offset + 2],
    image.rgba[offset + 3],
  ];
}

function luminance(pixel) {
  return 0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2];
}

function heatPixel(delta) {
  const hot = Math.max(0, Math.min(255, Math.round(delta * 5)));
  const mid = Math.max(0, Math.min(255, Math.round(delta * 2)));
  if (delta <= 5) {
    const base = Math.max(16, Math.round(delta * 8));
    return [base, base, base, 255];
  }
  return [hot, mid, Math.max(0, 80 - mid), 255];
}

function buildDiff(left, right, sampleWidth, sampleHeight) {
  const diff = Buffer.alloc(sampleWidth * sampleHeight * 4);
  let absRgb = 0;
  let absLuma = 0;
  let squaredRgb = 0;
  let changedSamples = 0;
  let maxRgbDelta = 0;
  let changedMinX = sampleWidth;
  let changedMinY = sampleHeight;
  let changedMaxX = -1;
  let changedMaxY = -1;
  const count = sampleWidth * sampleHeight;
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const leftPixel = pixelAt(
        left,
        Math.floor((x / Math.max(1, sampleWidth - 1)) * (left.width - 1)),
        Math.floor((y / Math.max(1, sampleHeight - 1)) * (left.height - 1)),
      );
      const rightPixel = pixelAt(
        right,
        Math.floor((x / Math.max(1, sampleWidth - 1)) * (right.width - 1)),
        Math.floor((y / Math.max(1, sampleHeight - 1)) * (right.height - 1)),
      );
      const dr = Math.abs(leftPixel[0] - rightPixel[0]);
      const dg = Math.abs(leftPixel[1] - rightPixel[1]);
      const db = Math.abs(leftPixel[2] - rightPixel[2]);
      const rgbDelta = (dr + dg + db) / 3;
      absRgb += rgbDelta;
      absLuma += Math.abs(luminance(leftPixel) - luminance(rightPixel));
      squaredRgb += (dr * dr + dg * dg + db * db) / 3;
      maxRgbDelta = Math.max(maxRgbDelta, rgbDelta);
      if (rgbDelta > 5) {
        changedSamples += 1;
        changedMinX = Math.min(changedMinX, x);
        changedMinY = Math.min(changedMinY, y);
        changedMaxX = Math.max(changedMaxX, x);
        changedMaxY = Math.max(changedMaxY, y);
      }
      const outputOffset = (y * sampleWidth + x) * 4;
      const heat = heatPixel(rgbDelta);
      diff[outputOffset] = heat[0];
      diff[outputOffset + 1] = heat[1];
      diff[outputOffset + 2] = heat[2];
      diff[outputOffset + 3] = heat[3];
    }
  }
  return {
    rgba: diff,
    metric: {
      sampleWidth,
      sampleHeight,
      sampleCount: count,
      meanAbsRgbDelta: absRgb / count,
      meanAbsLumaDelta: absLuma / count,
      rmsRgbDelta: Math.sqrt(squaredRgb / count),
      maxRgbDelta,
      changedSampleRatioGt5: changedSamples / count,
      changedBoundsGt5:
        changedSamples > 0
          ? {
              x: changedMinX,
              y: changedMinY,
              width: changedMaxX - changedMinX + 1,
              height: changedMaxY - changedMinY + 1,
            }
          : null,
    },
  };
}

function buildLumaGrid(image, sampleWidth, sampleHeight) {
  const grid = new Float64Array(sampleWidth * sampleHeight);
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const pixel = pixelAt(
        image,
        Math.floor((x / Math.max(1, sampleWidth - 1)) * (image.width - 1)),
        Math.floor((y / Math.max(1, sampleHeight - 1)) * (image.height - 1)),
      );
      grid[y * sampleWidth + x] = luminance(pixel);
    }
  }
  return grid;
}

function compareLumaGridOffset(leftGrid, rightGrid, sampleWidth, sampleHeight, dx, dy) {
  let absLuma = 0;
  let changedSamples = 0;
  let count = 0;
  for (let y = 0; y < sampleHeight; y += 1) {
    const rightY = y + dy;
    if (rightY < 0 || rightY >= sampleHeight) {
      continue;
    }
    for (let x = 0; x < sampleWidth; x += 1) {
      const rightX = x + dx;
      if (rightX < 0 || rightX >= sampleWidth) {
        continue;
      }
      const delta = Math.abs(
        leftGrid[y * sampleWidth + x] - rightGrid[rightY * sampleWidth + rightX],
      );
      absLuma += delta;
      if (delta > 5) {
        changedSamples += 1;
      }
      count += 1;
    }
  }
  return {
    sampleOffsetX: dx,
    sampleOffsetY: dy,
    overlapSampleCount: count,
    meanAbsLumaDelta: count > 0 ? absLuma / count : null,
    changedSampleRatioGt5: count > 0 ? changedSamples / count : null,
  };
}

function sampleLumaGrid(grid, sampleWidth, sampleHeight, x, y) {
  if (x < 0 || y < 0 || x > sampleWidth - 1 || y > sampleHeight - 1) {
    return null;
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(sampleWidth - 1, x0 + 1);
  const y1 = Math.min(sampleHeight - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const top =
    grid[y0 * sampleWidth + x0] * (1 - tx) +
    grid[y0 * sampleWidth + x1] * tx;
  const bottom =
    grid[y1 * sampleWidth + x0] * (1 - tx) +
    grid[y1 * sampleWidth + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}

function compareLumaGridScaleTranslation(
  leftGrid,
  rightGrid,
  sampleWidth,
  sampleHeight,
  scale,
  dx,
  dy,
) {
  let absLuma = 0;
  let changedSamples = 0;
  let count = 0;
  const centerX = (sampleWidth - 1) / 2;
  const centerY = (sampleHeight - 1) / 2;
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const rightX = centerX + (x - centerX) * scale + dx;
      const rightY = centerY + (y - centerY) * scale + dy;
      const rightValue = sampleLumaGrid(
        rightGrid,
        sampleWidth,
        sampleHeight,
        rightX,
        rightY,
      );
      if (rightValue === null) {
        continue;
      }
      const delta = Math.abs(leftGrid[y * sampleWidth + x] - rightValue);
      absLuma += delta;
      if (delta > 5) {
        changedSamples += 1;
      }
      count += 1;
    }
  }
  return {
    scale,
    sampleOffsetX: dx,
    sampleOffsetY: dy,
    overlapSampleCount: count,
    meanAbsLumaDelta: count > 0 ? absLuma / count : null,
    changedSampleRatioGt5: count > 0 ? changedSamples / count : null,
  };
}

function summarizeCalibrationCandidate(candidate, sampleWidth, sampleHeight, sourceWidth, sourceHeight) {
  if (!candidate) {
    return null;
  }
  return {
    scale: candidate.scale ?? 1,
    sampleOffsetX: candidate.sampleOffsetX,
    sampleOffsetY: candidate.sampleOffsetY,
    approximateSourcePixelOffsetX: (candidate.sampleOffsetX / sampleWidth) * sourceWidth,
    approximateSourcePixelOffsetY: (candidate.sampleOffsetY / sampleHeight) * sourceHeight,
    overlapSampleCount: candidate.overlapSampleCount,
    meanAbsLumaDelta: candidate.meanAbsLumaDelta,
    changedSampleRatioGt5: candidate.changedSampleRatioGt5,
  };
}

function candidatePassesCalibrationTolerance(candidate) {
  return (
    candidate !== null &&
    Number(candidate.meanAbsLumaDelta) <= 8 &&
    Number(candidate.changedSampleRatioGt5) <= 0.15
  );
}

function buildShadowvolCalibrationAttempt(left, right, config) {
  if (left.width !== right.width || left.height !== right.height) {
    return {
      status: "not-attempted-different-pixel-dimensions",
      passed: false,
      reason: "ROI calibration requires equal pixel dimensions",
    };
  }
  const sampleWidth = 96;
  const sampleHeight = 72;
  const maxOffset = 32;
  const leftGrid = buildLumaGrid(left, sampleWidth, sampleHeight);
  const rightGrid = buildLumaGrid(right, sampleWidth, sampleHeight);
  let best = null;
  for (let dy = -maxOffset; dy <= maxOffset; dy += 1) {
    for (let dx = -maxOffset; dx <= maxOffset; dx += 1) {
      const candidate = compareLumaGridOffset(leftGrid, rightGrid, sampleWidth, sampleHeight, dx, dy);
      if (
        !best ||
        (candidate.meanAbsLumaDelta ?? Number.POSITIVE_INFINITY) <
          (best.meanAbsLumaDelta ?? Number.POSITIVE_INFINITY)
      ) {
        best = candidate;
      }
    }
  }
  const scaleFactors = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3];
  let bestScale = null;
  for (const scale of scaleFactors) {
    for (let dy = -maxOffset; dy <= maxOffset; dy += 1) {
      for (let dx = -maxOffset; dx <= maxOffset; dx += 1) {
        const candidate = compareLumaGridScaleTranslation(
          leftGrid,
          rightGrid,
          sampleWidth,
          sampleHeight,
          scale,
          dx,
          dy,
        );
        if (
          !bestScale ||
          (candidate.meanAbsLumaDelta ?? Number.POSITIVE_INFINITY) <
            (bestScale.meanAbsLumaDelta ?? Number.POSITIVE_INFINITY)
        ) {
          bestScale = candidate;
        }
      }
    }
  }
  const translationCandidate = best ? { ...best, scale: 1 } : null;
  const bestMethod =
    bestScale &&
    (!translationCandidate ||
      (bestScale.meanAbsLumaDelta ?? Number.POSITIVE_INFINITY) <
        (translationCandidate.meanAbsLumaDelta ?? Number.POSITIVE_INFINITY))
      ? "uniform-scale-translation"
      : "translation-only";
  const bestCandidate =
    bestMethod === "uniform-scale-translation" ? bestScale : translationCandidate;
  const passed = candidatePassesCalibrationTolerance(bestCandidate);
  return {
    status: passed
      ? "calibrated-roi-affine-candidate-within-tolerance-unpromoted"
      : "calibrated-roi-affine-attempted-failed-tolerance",
    passed,
    canonicalParityPromoted: false,
    method: "normalized-luma-grid-translation-and-uniform-scale-search",
    bestMethod,
    sampleWidth,
    sampleHeight,
    maxOffsetSamples: maxOffset,
    scaleFactors,
    bestOffset: summarizeCalibrationCandidate(
      bestCandidate,
      sampleWidth,
      sampleHeight,
      left.width,
      left.height,
    ),
    translationOnlyCandidate: summarizeCalibrationCandidate(
      translationCandidate,
      sampleWidth,
      sampleHeight,
      left.width,
      left.height,
    ),
    uniformScaleTranslationCandidate: summarizeCalibrationCandidate(
      bestScale,
      sampleWidth,
      sampleHeight,
      left.width,
      left.height,
    ),
    tolerance: {
      maxMeanAbsLumaDelta: 8,
      maxChangedSampleRatioGt5: 0.15,
    },
    scope:
      "diagnostic translation/uniform-scale candidate; it does not prove same camera, projection footprint, opacity, or inherited render-state parity",
    requiredFor: config.requiredFor,
  };
}

function writePngRgba(path, width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    rgba.copy(raw, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  const output = Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk(
      "IHDR",
      Buffer.from([
        (width >>> 24) & 0xff,
        (width >>> 16) & 0xff,
        (width >>> 8) & 0xff,
        width & 0xff,
        (height >>> 24) & 0xff,
        (height >>> 16) & 0xff,
        (height >>> 8) & 0xff,
        height & 0xff,
        8,
        6,
        0,
        0,
        0,
      ]),
    ),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(path, output);
}

function writeSideBySidePng(path, left, right) {
  if (left.width !== right.width || left.height !== right.height) {
    return null;
  }
  const width = left.width + right.width;
  const height = left.height;
  const rgba = Buffer.alloc(width * height * 4);
  const sourceRowBytes = left.width * 4;
  const outputRowBytes = width * 4;
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = y * sourceRowBytes;
    const outputOffset = y * outputRowBytes;
    left.rgba.copy(rgba, outputOffset, sourceOffset, sourceOffset + sourceRowBytes);
    right.rgba.copy(
      rgba,
      outputOffset + sourceRowBytes,
      sourceOffset,
      sourceOffset + sourceRowBytes,
    );
  }
  writePngRgba(path, width, height, rgba);
  return { width, height };
}

function cropImage(image, bounds) {
  const x = Math.max(0, Math.min(image.width - 1, Math.trunc(bounds.x)));
  const y = Math.max(0, Math.min(image.height - 1, Math.trunc(bounds.y)));
  const width = Math.max(1, Math.min(image.width - x, Math.trunc(bounds.width)));
  const height = Math.max(1, Math.min(image.height - y, Math.trunc(bounds.height)));
  const rgba = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const sourceOffset = ((y + row) * image.width + x) * 4;
    image.rgba.copy(rgba, row * width * 4, sourceOffset, sourceOffset + width * 4);
  }
  return { width, height, rgba };
}

function scaleImageNearest(image, scale) {
  const width = image.width * scale;
  const height = image.height * scale;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.floor(x / scale);
      const sourceY = Math.floor(y / scale);
      const sourceOffset = (sourceY * image.width + sourceX) * 4;
      const outputOffset = (y * width + x) * 4;
      image.rgba.copy(rgba, outputOffset, sourceOffset, sourceOffset + 4);
    }
  }
  return { width, height, rgba };
}

function writeChangedBoundsCropComparison(path, off, on, changedBounds, margin, scale) {
  if (!changedBounds || off.width !== on.width || off.height !== on.height) {
    return null;
  }
  const cropBounds = {
    x: Math.max(0, changedBounds.x - margin),
    y: Math.max(0, changedBounds.y - margin),
    width:
      Math.min(off.width, changedBounds.x + changedBounds.width + margin) -
      Math.max(0, changedBounds.x - margin),
    height:
      Math.min(off.height, changedBounds.y + changedBounds.height + margin) -
      Math.max(0, changedBounds.y - margin),
  };
  const offCrop = scaleImageNearest(cropImage(off, cropBounds), scale);
  const onCrop = scaleImageNearest(cropImage(on, cropBounds), scale);
  const dimensions = writeSideBySidePng(path, offCrop, onCrop);
  return dimensions ? { ...dimensions, cropBounds, scale } : null;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildCase(repoRoot, artifactDir, config) {
  const leftPath = resolveArtifactPath(repoRoot, artifactDir, config.left);
  const rightPath = resolveArtifactPath(repoRoot, artifactDir, config.right);
  if (!existsSync(leftPath) || !existsSync(rightPath)) {
    return {
      caseId: config.caseId,
      title: config.title,
      status: "blocked-input-png-missing",
      passed: false,
      canonicalParityPromoted: false,
      inputs: {
        left: { name: config.left, present: existsSync(leftPath) },
        right: { name: config.right, present: existsSync(rightPath) },
      },
      requiredFor: config.requiredFor,
      blocker: "One or both source PNGs are missing; no diff artifact was generated.",
    };
  }
  const left = readPngRgba(leftPath);
  const right = readPngRgba(rightPath);
  const diff = buildDiff(left, right, config.sampleWidth, config.sampleHeight);
  const sameDimensions = left.width === right.width && left.height === right.height;
  const calibratedRoiAttempt =
    config.caseId === "shadowvol-campfire-retail-vs-web-normalized"
      ? buildShadowvolCalibrationAttempt(left, right, config)
      : null;
  const outputPath = resolve(artifactDir, config.output);
  writePngRgba(outputPath, config.sampleWidth, config.sampleHeight, diff.rgba);
  return {
    caseId: config.caseId,
    title: config.title,
    status: "pixel-diff-generated-parity-still-blocked",
    passed: false,
    canonicalParityPromoted: false,
    normalization: sameDimensions
      ? "same-dimension-sampled-grid"
      : "different-dimensions-normalized-sampled-grid",
    dimensionCompatibilityStatus: sameDimensions
      ? "same-pixel-dimensions-camera-or-roi-still-required"
      : "different-pixel-dimensions-diagnostic-normalization-only",
    inputs: {
      left: {
        name: config.left,
        ...describeFile(repoRoot, leftPath),
        width: left.width,
        height: left.height,
      },
      right: {
        name: config.right,
        ...describeFile(repoRoot, rightPath),
        width: right.width,
        height: right.height,
      },
    },
    output: {
      name: config.output,
      ...describeFile(repoRoot, outputPath),
      width: config.sampleWidth,
      height: config.sampleHeight,
    },
    metric: diff.metric,
    calibratedRoiAttempt,
    requiredFor: config.requiredFor,
    blocker: sameDimensions
      ? "Inputs have the same pixel dimensions, but this diff is still diagnostic until the manifest proves the same retail camera/viewport or an explicit calibrated ROI transform."
      : config.blocker,
  };
}

function buildPlaceableLightingAblationCase(repoRoot, artifactDir, options) {
  const config = {
    caseId: options.caseId ?? "placeable-lighting-point-light-off-on",
    title: "Aurora Web placeable point-light OFF/ON functional ablation",
    left: options.off,
    right: options.on,
    output: options.diff ?? "placeable-lighting-point-light-off-on-diff.png",
    sampleWidth: options.sampleWidth,
    sampleHeight: options.sampleHeight,
  };
  const requiredInputs = [
    ["off", config.left],
    ["on", config.right],
    ["offFrame", options.offFrame],
    ["onFrame", options.onFrame],
  ];
  const missingOptions = requiredInputs.filter(([, value]) => !value).map(([name]) => name);
  if (missingOptions.length > 0) {
    throw new Error(
      `placeable-lighting-off-on-ablation requires: ${missingOptions
        .map((name) => `--${name}`)
        .join(", ")}`,
    );
  }
  const offPath = resolveArtifactPath(repoRoot, artifactDir, config.left);
  const onPath = resolveArtifactPath(repoRoot, artifactDir, config.right);
  const offFramePath = resolveArtifactPath(repoRoot, artifactDir, options.offFrame);
  const onFramePath = resolveArtifactPath(repoRoot, artifactDir, options.onFrame);
  const inputPaths = [offPath, onPath, offFramePath, onFramePath];
  if (inputPaths.some((inputPath) => !existsSync(inputPath))) {
    return {
      caseId: config.caseId,
      title: config.title,
      status: "blocked-input-artifact-missing",
      passed: false,
      canonicalParityPromoted: false,
      inputs: {
        off: { name: config.left, present: existsSync(offPath) },
        on: { name: config.right, present: existsSync(onPath) },
        offFrame: { name: options.offFrame, present: existsSync(offFramePath) },
        onFrame: { name: options.onFrame, present: existsSync(onFramePath) },
      },
      blocker: "The OFF/ON PNG pair and both capture frame manifests are required.",
    };
  }

  const off = readPngRgba(offPath);
  const on = readPngRgba(onPath);
  const sampleWidth = Number.isFinite(config.sampleWidth) && config.sampleWidth > 0
    ? Math.trunc(config.sampleWidth)
    : off.width;
  const sampleHeight = Number.isFinite(config.sampleHeight) && config.sampleHeight > 0
    ? Math.trunc(config.sampleHeight)
    : off.height;
  const pairValidation = validatePlaceableLightingAblationPair(
    readJson(offFramePath),
    readJson(onFramePath),
  );
  const sameDimensions = off.width === on.width && off.height === on.height;
  const diff = buildDiff(off, on, sampleWidth, sampleHeight);
  const outputPath = resolve(artifactDir, config.output);
  writePngRgba(outputPath, sampleWidth, sampleHeight, diff.rgba);
  const comparisonName = options.comparison ?? "placeable-lighting-point-light-off-on-comparison.png";
  const comparisonPath = resolve(artifactDir, comparisonName);
  const comparisonDimensions = writeSideBySidePng(comparisonPath, off, on);
  const cropComparisonName =
    options.cropComparison ?? "placeable-lighting-point-light-off-on-crop-comparison.png";
  const cropComparisonPath = resolve(artifactDir, cropComparisonName);
  const cropScale = Number.isFinite(options.cropScale) && options.cropScale > 0
    ? Math.trunc(options.cropScale)
    : 3;
  const cropMargin = Number.isFinite(options.cropMargin) && options.cropMargin >= 0
    ? Math.trunc(options.cropMargin)
    : 24;
  const cropComparisonDimensions = writeChangedBoundsCropComparison(
    cropComparisonPath,
    off,
    on,
    diff.metric.changedBoundsGt5,
    cropMargin,
    cropScale,
  );
  const pixelDeltaObserved = diff.metric.changedSampleRatioGt5 > 0;
  const passed = sameDimensions && pairValidation.passed && pixelDeltaObserved;

  return {
    caseId: config.caseId,
    title: config.title,
    status: passed
      ? "functional-ablation-delta-observed-retail-parity-unpromoted"
      : "blocked-functional-ablation-not-proven",
    passed,
    canonicalParityPromoted: false,
    scope: "Aurora Web functional OFF/ON ablation only; this does not compare against NWN retail pixels.",
    pairValidation,
    dimensionCompatibilityStatus: sameDimensions
      ? "same-pixel-dimensions"
      : "blocked-different-pixel-dimensions",
    inputs: {
      off: {
        name: config.left,
        ...describeFile(repoRoot, offPath),
        width: off.width,
        height: off.height,
      },
      on: {
        name: config.right,
        ...describeFile(repoRoot, onPath),
        width: on.width,
        height: on.height,
      },
      offFrame: { name: options.offFrame, ...describeFile(repoRoot, offFramePath) },
      onFrame: { name: options.onFrame, ...describeFile(repoRoot, onFramePath) },
    },
    output: {
      name: config.output,
      ...describeFile(repoRoot, outputPath),
      width: sampleWidth,
      height: sampleHeight,
    },
    comparison: comparisonDimensions
      ? {
          name: comparisonName,
          ...describeFile(repoRoot, comparisonPath),
          ...comparisonDimensions,
          order: ["point-light-off", "point-light-on"],
        }
      : null,
    cropComparison: cropComparisonDimensions
      ? {
          name: cropComparisonName,
          ...describeFile(repoRoot, cropComparisonPath),
          ...cropComparisonDimensions,
          order: ["point-light-off", "point-light-on"],
        }
      : null,
    metric: diff.metric,
    blocker: passed
      ? null
      : [
          ...pairValidation.blockers,
          ...(sameDimensions ? [] : ["pixel-dimensions-mismatch"]),
          ...(pixelDeltaObserved ? [] : ["no-pixel-delta-above-five"]),
        ].join(", "),
  };
}

const options = parseArgs(process.argv.slice(2));
const repoRoot = resolve(options.repoRoot);
const artifactDir = toAbsolute(repoRoot, options.artifactDir);
mkdirSync(artifactDir, { recursive: true });
if (!["retail-diagnostic", "placeable-lighting-off-on-ablation"].includes(options.mode)) {
  throw new Error(`Unsupported --mode: ${options.mode}`);
}
const cases =
  options.mode === "placeable-lighting-off-on-ablation"
    ? [buildPlaceableLightingAblationCase(repoRoot, artifactDir, options)]
    : DIFF_CASES.map((config) => buildCase(repoRoot, artifactDir, config));
const outputPath = resolveOutputPath(repoRoot, artifactDir, options.output);
const ablationMode = options.mode === "placeable-lighting-off-on-ablation";
const allAblationCasesPassed = ablationMode && cases.every((entry) => entry.passed === true);
const report = {
  version: "aurora-area-lighting-pixel-diff-artifacts/v1",
  generatedAt: new Date().toISOString(),
  status: ablationMode
    ? allAblationCasesPassed
      ? "functional-ablation-delta-observed-retail-parity-unpromoted"
      : "blocked-functional-ablation-not-proven"
    : cases.every((entry) => entry.status === "pixel-diff-generated-parity-still-blocked")
      ? "pixel-diff-artifacts-written-parity-still-blocked"
      : "blocked-pixel-diff-inputs-missing",
  passed: allAblationCasesPassed,
  canonicalParityPromoted: false,
  summary: {
    caseCount: cases.length,
    passedCaseCount: cases.filter((entry) => entry.passed === true).length,
    generatedCaseCount: cases.filter((entry) => entry.status === "pixel-diff-generated-parity-still-blocked").length,
    missingInputCaseCount: cases.filter((entry) => entry.status === "blocked-input-png-missing").length,
  },
  cases,
  nonEvidenceNotice: ablationMode
    ? "A passing pair proves a visible Aurora Web response to the point-light toggle only. It must not promote NWN retail parity."
    : "These heatmaps are diagnostic pixel-diff artifacts only. They do not define acceptance tolerances and must not promote retail parity by themselves.",
};
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      status: report.status,
      output: toRepoRelative(repoRoot, outputPath),
      summary: report.summary,
    },
    null,
    2,
  ),
);
