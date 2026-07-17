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
const DEFAULT_OUTPUT = "cross-lane-retail-maxlight-roi-diagnostics.json";
const DEFAULT_SAMPLE_WIDTH = 192;
const DEFAULT_SAMPLE_HEIGHT = 135;
const GRID_COLUMNS = 12;
const GRID_ROWS = 9;
const DELTA_THRESHOLD = 5;
const OWNER_CLASSIFIER_MIN_SCORE = 0.12;
const OWNER_CLASSIFIER_MIN_MARGIN = 0.03;
const OWNER_CLASSIFIER_BASELINE = "retail-cross-lane-openpad-smoke.png";
const isolatedCrossLaneReferenceArtifacts = [
  { lane: "terrain-tile-main-light", file: "retail-ref-tile-main-light.png" },
  { lane: "terrain-tile-source-light", file: "retail-ref-tile-source-light.png" },
  { lane: "placeables-2da-light", file: "retail-ref-placeable-lightcolor.png" },
  { lane: "mdl-source-light-node", file: "retail-ref-mdl-source-light.png" },
  { lane: "item-property-light", file: "retail-ref-item-property-light.png" },
  { lane: "progfx-type4-light-or-vision", file: "retail-ref-progfx-type4-light.png" },
];

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    output: DEFAULT_OUTPUT,
    sampleWidth: DEFAULT_SAMPLE_WIDTH,
    sampleHeight: DEFAULT_SAMPLE_HEIGHT,
    ablationObservation: null,
    ablationLabel: "no-item",
    ablationHeatmapPrefix: "retail-cross-lane-no-item-ablation",
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
    } else if (arg === "--sampleWidth") {
      index += 1;
      options.sampleWidth = parsePositiveInteger(arg, argv[index]);
    } else if (arg === "--sampleHeight") {
      index += 1;
      options.sampleHeight = parsePositiveInteger(arg, argv[index]);
    } else if (arg === "--ablationObservation") {
      index += 1;
      options.ablationObservation = requireValue(arg, argv[index]);
    } else if (arg === "--ablationLabel") {
      index += 1;
      options.ablationLabel = requireValue(arg, argv[index]);
    } else if (arg === "--ablationHeatmapPrefix") {
      index += 1;
      options.ablationHeatmapPrefix = requireValue(arg, argv[index]);
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

function parsePositiveInteger(flag, value) {
  const parsed = Number(requireValue(flag, value));
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} requires a positive integer.`);
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage: node scripts/create-cross-lane-retail-maxlight-roi-diagnostics.mjs [options]

Options:
  --repoRoot <path>       Repository root. Defaults to aurora-web root.
  --artifactDir <path>    Artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
  --out <name-or-path>    Output report path or artifact-dir-relative filename.
  --sampleWidth <int>     Normalized sample width. Defaults to ${DEFAULT_SAMPLE_WIDTH}
  --sampleHeight <int>    Normalized sample height. Defaults to ${DEFAULT_SAMPLE_HEIGHT}
  --ablationObservation <json>
                          Optional artifact-dir-relative observation report to compare against the all-lanes variants.
  --ablationLabel <label> Optional ablation label. Defaults to no-item.
  --ablationHeatmapPrefix <name>
                          Heatmap filename prefix for ablation comparisons.
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
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

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function describeFile(repoRoot, path) {
  const stats = statSync(path);
  const bytes = readFileSync(path);
  return {
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    sha256: sha256(bytes),
    modifiedAt: stats.mtime.toISOString(),
  };
}

function readJsonIfPresent(path) {
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, ""));
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
  if (delta <= DELTA_THRESHOLD) {
    const base = Math.max(16, Math.round(delta * 8));
    return [base, base, base, 255];
  }
  return [hot, mid, Math.max(0, 80 - mid), 255];
}

function makeCells(columns, rows) {
  return Array.from({ length: columns * rows }, (_, index) => ({
    column: index % columns,
    row: Math.floor(index / columns),
    sampleCount: 0,
    changedSamplesGt5: 0,
    deltaSum: 0,
    maxRgbDelta: 0,
  }));
}

function buildRoiDiff(left, right, sampleWidth, sampleHeight) {
  const heatmap = Buffer.alloc(sampleWidth * sampleHeight * 4);
  const mask = buildDeltaMask(left, right, sampleWidth, sampleHeight);
  const cells = makeCells(GRID_COLUMNS, GRID_ROWS);
  let absRgb = 0;
  let absLuma = 0;
  let squaredRgb = 0;
  let signedRed = 0;
  let signedGreen = 0;
  let signedBlue = 0;
  let changedSamples = 0;
  let maxRgbDelta = 0;
  let changedMinX = sampleWidth;
  let changedMinY = sampleHeight;
  let changedMaxX = -1;
  let changedMaxY = -1;
  let weightedX = 0;
  let weightedY = 0;
  let totalWeight = 0;
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
      const signedR = rightPixel[0] - leftPixel[0];
      const signedG = rightPixel[1] - leftPixel[1];
      const signedB = rightPixel[2] - leftPixel[2];
      const dr = Math.abs(signedR);
      const dg = Math.abs(signedG);
      const db = Math.abs(signedB);
      const rgbDelta = (dr + dg + db) / 3;
      const cellColumn = Math.min(GRID_COLUMNS - 1, Math.floor((x / sampleWidth) * GRID_COLUMNS));
      const cellRow = Math.min(GRID_ROWS - 1, Math.floor((y / sampleHeight) * GRID_ROWS));
      const cell = cells[cellRow * GRID_COLUMNS + cellColumn];
      cell.sampleCount += 1;
      cell.deltaSum += rgbDelta;
      cell.maxRgbDelta = Math.max(cell.maxRgbDelta, rgbDelta);
      absRgb += rgbDelta;
      absLuma += Math.abs(luminance(leftPixel) - luminance(rightPixel));
      squaredRgb += (dr * dr + dg * dg + db * db) / 3;
      signedRed += signedR;
      signedGreen += signedG;
      signedBlue += signedB;
      maxRgbDelta = Math.max(maxRgbDelta, rgbDelta);
      if (rgbDelta > DELTA_THRESHOLD) {
        changedSamples += 1;
        cell.changedSamplesGt5 += 1;
        changedMinX = Math.min(changedMinX, x);
        changedMinY = Math.min(changedMinY, y);
        changedMaxX = Math.max(changedMaxX, x);
        changedMaxY = Math.max(changedMaxY, y);
        weightedX += x * rgbDelta;
        weightedY += y * rgbDelta;
        totalWeight += rgbDelta;
      }
      const outputOffset = (y * sampleWidth + x) * 4;
      const heat = heatPixel(rgbDelta);
      heatmap[outputOffset] = heat[0];
      heatmap[outputOffset + 1] = heat[1];
      heatmap[outputOffset + 2] = heat[2];
      heatmap[outputOffset + 3] = heat[3];
    }
  }

  const changedBoundsGt5 =
    changedSamples > 0
      ? {
          x: changedMinX,
          y: changedMinY,
          width: changedMaxX - changedMinX + 1,
          height: changedMaxY - changedMinY + 1,
        }
      : null;
  const topHotCells = cells
    .map((cell) => ({
      column: cell.column,
      row: cell.row,
      sampleBounds: {
        x: Math.floor((cell.column / GRID_COLUMNS) * sampleWidth),
        y: Math.floor((cell.row / GRID_ROWS) * sampleHeight),
        width:
          Math.floor(((cell.column + 1) / GRID_COLUMNS) * sampleWidth) -
          Math.floor((cell.column / GRID_COLUMNS) * sampleWidth),
        height:
          Math.floor(((cell.row + 1) / GRID_ROWS) * sampleHeight) -
          Math.floor((cell.row / GRID_ROWS) * sampleHeight),
      },
      meanRgbDelta: cell.sampleCount > 0 ? cell.deltaSum / cell.sampleCount : 0,
      changedSampleRatioGt5:
        cell.sampleCount > 0 ? cell.changedSamplesGt5 / cell.sampleCount : 0,
      maxRgbDelta: cell.maxRgbDelta,
    }))
    .filter((cell) => cell.changedSampleRatioGt5 > 0 || cell.meanRgbDelta > DELTA_THRESHOLD)
    .sort(
      (leftCell, rightCell) =>
        rightCell.changedSampleRatioGt5 - leftCell.changedSampleRatioGt5 ||
        rightCell.meanRgbDelta - leftCell.meanRgbDelta,
    )
    .slice(0, 8);

  return {
    heatmap,
    mask,
    metric: {
      sampleWidth,
      sampleHeight,
      sampleCount: count,
      meanAbsRgbDelta: absRgb / count,
      meanAbsLumaDelta: absLuma / count,
      rmsRgbDelta: Math.sqrt(squaredRgb / count),
      maxRgbDelta,
      changedSampleRatioGt5: changedSamples / count,
      changedBoundsGt5,
      weightedCentroidGt5:
        totalWeight > 0
          ? {
              x: weightedX / totalWeight,
              y: weightedY / totalWeight,
            }
          : null,
      signedMeanDelta: {
        red: signedRed / count,
        green: signedGreen / count,
        blue: signedBlue / count,
      },
      grid: {
        columns: GRID_COLUMNS,
        rows: GRID_ROWS,
        changedCellCount: cells.filter((cell) => cell.changedSamplesGt5 > 0).length,
        topHotCells,
      },
    },
  };
}

function buildDeltaMask(left, right, sampleWidth, sampleHeight) {
  const weights = new Float64Array(sampleWidth * sampleHeight);
  let totalWeight = 0;
  let squaredWeight = 0;
  let changedSamples = 0;
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
      const rgbDelta =
        (Math.abs(rightPixel[0] - leftPixel[0]) +
          Math.abs(rightPixel[1] - leftPixel[1]) +
          Math.abs(rightPixel[2] - leftPixel[2])) /
        3;
      const weight = rgbDelta > DELTA_THRESHOLD ? rgbDelta : 0;
      weights[y * sampleWidth + x] = weight;
      if (weight > 0) {
        totalWeight += weight;
        squaredWeight += weight * weight;
        changedSamples += 1;
      }
    }
  }
  return {
    sampleWidth,
    sampleHeight,
    weights,
    totalWeight,
    squaredWeight,
    changedSampleRatioGt5: changedSamples / Math.max(1, sampleWidth * sampleHeight),
  };
}

function scoreMaskOverlap(target, reference) {
  if (!target?.totalWeight || !reference?.totalWeight) {
    return {
      score: 0,
      targetCoverage: 0,
      referenceCoverage: 0,
      cosine: 0,
      intersectionWeight: 0,
    };
  }
  let intersectionWeight = 0;
  let dot = 0;
  for (let index = 0; index < target.weights.length; index += 1) {
    const targetWeight = target.weights[index];
    const referenceWeight = reference.weights[index];
    intersectionWeight += Math.min(targetWeight, referenceWeight);
    dot += targetWeight * referenceWeight;
  }
  const targetCoverage = intersectionWeight / target.totalWeight;
  const referenceCoverage = intersectionWeight / reference.totalWeight;
  const cosine =
    target.squaredWeight > 0 && reference.squaredWeight > 0
      ? dot / Math.sqrt(target.squaredWeight * reference.squaredWeight)
      : 0;
  return {
    score: targetCoverage * 0.55 + cosine * 0.35 + referenceCoverage * 0.1,
    targetCoverage,
    referenceCoverage,
    cosine,
    intersectionWeight,
  };
}

function buildReferenceMask(repoRoot, artifactDir, baseline, reference) {
  const referencePath = resolve(artifactDir, reference.file);
  if (!existsSync(referencePath)) {
    return {
      lane: reference.lane,
      file: reference.file,
      status: "missing-reference-png",
      present: false,
    };
  }
  try {
    const referenceImage = readPngRgba(referencePath);
    const mask = buildDeltaMask(baseline.image, referenceImage, baseline.sampleWidth, baseline.sampleHeight);
    return {
      lane: reference.lane,
      file: reference.file,
      status:
        mask.totalWeight > 0
          ? "reference-mask-ready"
          : "blocked-reference-mask-empty",
      present: true,
      input: describeFile(repoRoot, referencePath),
      image: {
        width: referenceImage.width,
        height: referenceImage.height,
      },
      maskStats: {
        changedSampleRatioGt5: mask.changedSampleRatioGt5,
        totalWeight: mask.totalWeight,
      },
      mask,
    };
  } catch (error) {
    return {
      lane: reference.lane,
      file: reference.file,
      status: "blocked-reference-mask-error",
      present: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarizeReferenceMask(reference) {
  return {
    lane: reference.lane,
    file: reference.file,
    status: reference.status,
    present: reference.present,
    input: reference.input,
    image: reference.image,
    maskStats: reference.maskStats,
    error: reference.error,
  };
}

function buildOwnerClassifier(repoRoot, artifactDir, caseConfigs, sampleWidth, sampleHeight) {
  const baselinePath = resolve(artifactDir, OWNER_CLASSIFIER_BASELINE);
  if (!existsSync(baselinePath)) {
    return {
      version: "aurora-cross-lane-owner-classifier/v1",
      status: "blocked-owner-classifier-baseline-missing",
      evaluated: false,
      canonicalParityPromoted: false,
      baseline: {
        present: false,
        name: OWNER_CLASSIFIER_BASELINE,
        path: toRepoRelative(repoRoot, baselinePath),
      },
      requiredReferenceArtifacts: isolatedCrossLaneReferenceArtifacts.map((entry) => entry.file),
      referenceMasks: [],
      cases: [],
      summary: {
        evaluatedCaseCount: 0,
        strongCandidateCaseCount: 0,
        ambiguousCaseCount: 0,
        provesPartialOwnerCandidates: false,
        provesAcceptedDroppedOwnerMapping: false,
        provesDirectRendererSlotOrder: false,
        provesCanonicalParity: false,
      },
      blocker:
        "Owner classifier requires an open-pad baseline so isolated lane-reference masks can be measured without guessing from raw brightness.",
    };
  }

  let baselineImage;
  try {
    baselineImage = readPngRgba(baselinePath);
  } catch (error) {
    return {
      version: "aurora-cross-lane-owner-classifier/v1",
      status: "blocked-owner-classifier-baseline-error",
      evaluated: false,
      canonicalParityPromoted: false,
      baseline: {
        present: true,
        name: OWNER_CLASSIFIER_BASELINE,
        path: toRepoRelative(repoRoot, baselinePath),
        error: error instanceof Error ? error.message : String(error),
      },
      requiredReferenceArtifacts: isolatedCrossLaneReferenceArtifacts.map((entry) => entry.file),
      referenceMasks: [],
      cases: [],
      summary: {
        evaluatedCaseCount: 0,
        strongCandidateCaseCount: 0,
        ambiguousCaseCount: 0,
        provesPartialOwnerCandidates: false,
        provesAcceptedDroppedOwnerMapping: false,
        provesDirectRendererSlotOrder: false,
        provesCanonicalParity: false,
      },
      blocker:
        "Owner classifier baseline exists but cannot be decoded; accepted/dropped owners remain unclassified.",
    };
  }

  const baseline = {
    image: baselineImage,
    sampleWidth,
    sampleHeight,
  };
  const referenceMasks = isolatedCrossLaneReferenceArtifacts.map((reference) =>
    buildReferenceMask(repoRoot, artifactDir, baseline, reference),
  );
  const readyReferenceMasks = referenceMasks.filter(
    (reference) => reference.status === "reference-mask-ready" && reference.mask,
  );

  const cases = caseConfigs.map((config) => {
    if (!config.leftPath || !config.rightPath || !existsSync(config.leftPath) || !existsSync(config.rightPath)) {
      return {
        caseId: config.caseId,
        status: "blocked-owner-classifier-case-input-missing",
        strongCandidate: false,
        candidates: [],
      };
    }
    try {
      const left = readPngRgba(config.leftPath);
      const right = readPngRgba(config.rightPath);
      const targetMask = buildDeltaMask(left, right, sampleWidth, sampleHeight);
      const candidates = readyReferenceMasks
        .map((reference) => ({
          lane: reference.lane,
          file: reference.file,
          ...scoreMaskOverlap(targetMask, reference.mask),
        }))
        .sort((leftCandidate, rightCandidate) => rightCandidate.score - leftCandidate.score);
      const top = candidates[0] ?? null;
      const runnerUp = candidates[1] ?? null;
      const scoreMargin = top && runnerUp ? top.score - runnerUp.score : top ? top.score : 0;
      const strongCandidate =
        Boolean(top) &&
        top.score >= OWNER_CLASSIFIER_MIN_SCORE &&
        scoreMargin >= OWNER_CLASSIFIER_MIN_MARGIN &&
        targetMask.changedSampleRatioGt5 > 0;
      return {
        caseId: config.caseId,
        status: strongCandidate
          ? "owner-classifier-strong-candidate"
          : "owner-classifier-ambiguous-or-weak",
        strongCandidate,
        topLaneCandidate: top?.lane ?? null,
        topScore: top?.score ?? 0,
        scoreMargin,
        targetMaskStats: {
          changedSampleRatioGt5: targetMask.changedSampleRatioGt5,
          totalWeight: targetMask.totalWeight,
        },
        policy: {
          minScore: OWNER_CLASSIFIER_MIN_SCORE,
          minMargin: OWNER_CLASSIFIER_MIN_MARGIN,
          threshold: `rgbDelta>${DELTA_THRESHOLD}`,
        },
        candidates: candidates.slice(0, 6),
      };
    } catch (error) {
      return {
        caseId: config.caseId,
        status: "blocked-owner-classifier-case-error",
        strongCandidate: false,
        candidates: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const evaluatedCases = cases.filter((entry) => entry.candidates.length > 0);
  const strongCandidateCases = evaluatedCases.filter((entry) => entry.strongCandidate);
  const ambiguousCases = evaluatedCases.filter((entry) => !entry.strongCandidate);
  const missingReferenceArtifacts = referenceMasks
    .filter((entry) => !entry.present)
    .map((entry) => entry.file);
  const status =
    evaluatedCases.length === 0
      ? "blocked-owner-classifier-no-evaluable-cases"
      : missingReferenceArtifacts.length > 0
        ? "owner-classifier-evaluated-reference-set-incomplete-still-blocked"
        : strongCandidateCases.length > 0
          ? "owner-classifier-evaluated-partial-owner-candidates-still-blocked"
          : "owner-classifier-evaluated-ambiguous-still-blocked";

  return {
    version: "aurora-cross-lane-owner-classifier/v1",
    status,
    evaluated: evaluatedCases.length > 0,
    canonicalParityPromoted: false,
    baseline: {
      present: true,
      name: OWNER_CLASSIFIER_BASELINE,
      ...describeFile(repoRoot, baselinePath),
      image: {
        width: baselineImage.width,
        height: baselineImage.height,
      },
    },
    requiredReferenceArtifacts: isolatedCrossLaneReferenceArtifacts.map((entry) => entry.file),
    missingReferenceArtifacts,
    referenceMasks: referenceMasks.map(summarizeReferenceMask),
    cases,
    summary: {
      evaluatedCaseCount: evaluatedCases.length,
      strongCandidateCaseCount: strongCandidateCases.length,
      ambiguousCaseCount: ambiguousCases.length,
      provesPartialOwnerCandidates: strongCandidateCases.length > 0,
      provesAcceptedDroppedOwnerMapping: false,
      provesDirectRendererSlotOrder: false,
      provesCanonicalParity: false,
    },
    blockedParityFacts: [
      "Classifier uses offline retail PNG masks only; it is not a direct renderer active-slot dump.",
      "Strong candidates can guide the next proof step, but they do not by themselves prove full accepted/dropped owner ordering.",
      "Full cross-lane parity still requires either direct slot order or a complete accepted/dropped owner map accepted by the gate.",
    ],
    blocker:
      strongCandidateCases.length > 0
        ? "Owner classifier produced partial lane candidates, but it intentionally does not promote direct renderer order or canonical parity."
        : "Owner classifier ran but did not produce a strong enough lane-owner mapping; cross-lane precedence remains blocked.",
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

function caseSlug(input) {
  return input.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").toLowerCase();
}

function makePngPairCase(caseId, title, leftName, leftPath, rightName, rightPath, heatmapName) {
  return {
    caseId,
    title,
    leftName,
    leftPath,
    rightName,
    rightPath,
    heatmapName,
  };
}

function variantImagePath(repoRoot, variant, key) {
  const path = variant?.[key]?.path;
  return path ? toAbsolute(repoRoot, path) : null;
}

function buildCaseConfigs(repoRoot, artifactDir, observation) {
  const cases = [
    makePngPairCase(
      "default-maxlights-before-after-budget",
      "Default retail max-light setting before/after cross-lane budget diff",
      "retail-cross-lane-all-lanes-before-budget.png",
      resolve(artifactDir, "retail-cross-lane-all-lanes-before-budget.png"),
      "retail-cross-lane-all-lanes-after-budget.png",
      resolve(artifactDir, "retail-cross-lane-all-lanes-after-budget.png"),
      "retail-cross-lane-default-maxlights-roi-heatmap.png",
    ),
  ];
  const variants = Array.isArray(observation?.variants)
    ? observation.variants
        .map((variant) => ({
          maxLights: Number(variant.maxLights),
          beforePath: variantImagePath(repoRoot, variant, "beforeBudget"),
          afterPath: variantImagePath(repoRoot, variant, "afterBudget"),
        }))
        .filter((variant) => Number.isFinite(variant.maxLights))
        .sort((left, right) => left.maxLights - right.maxLights)
    : [];

  for (const variant of variants) {
    cases.push(
      makePngPairCase(
        `maxlights-${variant.maxLights}-before-after-budget`,
        `Retail max-lights=${variant.maxLights} before/after cross-lane budget diff`,
        `maxlights-${variant.maxLights}/before-budget`,
        variant.beforePath,
        `maxlights-${variant.maxLights}/after-budget`,
        variant.afterPath,
        `retail-cross-lane-maxlights-${variant.maxLights}-roi-heatmap.png`,
      ),
    );
  }

  for (let index = 0; index < variants.length - 1; index += 1) {
    const left = variants[index];
    const right = variants[index + 1];
    cases.push(
      makePngPairCase(
        `maxlights-${left.maxLights}-vs-${right.maxLights}-before-budget`,
        `Retail max-lights ${left.maxLights} vs ${right.maxLights} before-budget diff`,
        `maxlights-${left.maxLights}/before-budget`,
        left.beforePath,
        `maxlights-${right.maxLights}/before-budget`,
        right.beforePath,
        `retail-cross-lane-maxlights-${left.maxLights}-vs-${right.maxLights}-before-roi-heatmap.png`,
      ),
    );
    cases.push(
      makePngPairCase(
        `maxlights-${left.maxLights}-vs-${right.maxLights}-after-budget`,
        `Retail max-lights ${left.maxLights} vs ${right.maxLights} after-budget diff`,
        `maxlights-${left.maxLights}/after-budget`,
        left.afterPath,
        `maxlights-${right.maxLights}/after-budget`,
        right.afterPath,
        `retail-cross-lane-maxlights-${left.maxLights}-vs-${right.maxLights}-after-roi-heatmap.png`,
      ),
    );
  }

  return { cases, variants };
}

function buildCase(repoRoot, artifactDir, config, sampleWidth, sampleHeight) {
  if (!config.leftPath || !config.rightPath || !existsSync(config.leftPath) || !existsSync(config.rightPath)) {
    return {
      caseId: config.caseId,
      title: config.title,
      status: "blocked-input-png-missing",
      passed: false,
      canonicalParityPromoted: false,
      inputs: {
        left: { name: config.leftName, present: Boolean(config.leftPath && existsSync(config.leftPath)) },
        right: { name: config.rightName, present: Boolean(config.rightPath && existsSync(config.rightPath)) },
      },
      blocker: "One or both PNG inputs are missing; no ROI diagnostic was generated.",
    };
  }

  const left = readPngRgba(config.leftPath);
  const right = readPngRgba(config.rightPath);
  const diff = buildRoiDiff(left, right, sampleWidth, sampleHeight);
  const outputPath = resolve(artifactDir, config.heatmapName);
  writePngRgba(outputPath, sampleWidth, sampleHeight, diff.heatmap);

  return {
    caseId: config.caseId,
    title: config.title,
    status: "roi-diagnostics-generated-owner-classifier-still-blocked",
    passed: false,
    canonicalParityPromoted: false,
    normalization:
      left.width === right.width && left.height === right.height
        ? "same-dimension-sampled-grid"
        : "different-dimensions-normalized-sampled-grid",
    inputs: {
      left: {
        name: config.leftName,
        ...describeFile(repoRoot, config.leftPath),
        width: left.width,
        height: left.height,
      },
      right: {
        name: config.rightName,
        ...describeFile(repoRoot, config.rightPath),
        width: right.width,
        height: right.height,
      },
    },
    heatmap: {
      name: config.heatmapName,
      ...describeFile(repoRoot, outputPath),
      width: sampleWidth,
      height: sampleHeight,
    },
    metric: diff.metric,
    proofScope: {
      provesBudgetSensitiveRetailPixels: diff.metric.changedSampleRatioGt5 > 0,
      provesAcceptedDroppedOwnerMapping: false,
      provesDirectRendererSlotOrder: false,
      provesCanonicalParity: false,
    },
    blocker:
      "This ROI diagnostic localizes budget-sensitive pixels, but isolated lane references or a direct retail slot dump are still required to map those pixels back to accepted/dropped lane owners.",
  };
}

function variantMap(variants) {
  return new Map(variants.map((variant) => [variant.maxLights, variant]));
}

function buildAblationComparison(repoRoot, artifactDir, variants, options) {
  if (!options.ablationObservation) {
    return null;
  }

  const ablationObservationPath = resolve(artifactDir, options.ablationObservation);
  const ablationObservation = readJsonIfPresent(ablationObservationPath);
  const ablationVariants = Array.isArray(ablationObservation?.variants)
    ? ablationObservation.variants
        .map((variant) => ({
          maxLights: Number(variant.maxLights),
          beforePath: variantImagePath(repoRoot, variant, "beforeBudget"),
          afterPath: variantImagePath(repoRoot, variant, "afterBudget"),
        }))
        .filter((variant) => Number.isFinite(variant.maxLights))
        .sort((left, right) => left.maxLights - right.maxLights)
    : [];
  const ablationByMaxLights = variantMap(ablationVariants);
  const caseConfigs = [];

  for (const variant of variants) {
    const ablation = ablationByMaxLights.get(variant.maxLights);
    if (!ablation) {
      caseConfigs.push(
        makePngPairCase(
          `maxlights-${variant.maxLights}-all-vs-${options.ablationLabel}-missing`,
          `Retail max-lights=${variant.maxLights} all-lanes vs ${options.ablationLabel} ablation missing`,
          `maxlights-${variant.maxLights}/all-lanes-after-budget`,
          variant.afterPath,
          `maxlights-${variant.maxLights}/${options.ablationLabel}-after-budget`,
          null,
          `${options.ablationHeatmapPrefix}-maxlights-${variant.maxLights}-missing.png`,
        ),
      );
      continue;
    }
    caseConfigs.push(
      makePngPairCase(
        `maxlights-${variant.maxLights}-all-vs-${options.ablationLabel}-before-budget`,
        `Retail max-lights=${variant.maxLights} all-lanes before-budget vs ${options.ablationLabel} before-budget`,
        `maxlights-${variant.maxLights}/all-lanes-before-budget`,
        variant.beforePath,
        `maxlights-${variant.maxLights}/${options.ablationLabel}-before-budget`,
        ablation.beforePath,
        `${options.ablationHeatmapPrefix}-maxlights-${variant.maxLights}-before-roi-heatmap.png`,
      ),
    );
    caseConfigs.push(
      makePngPairCase(
        `maxlights-${variant.maxLights}-all-vs-${options.ablationLabel}-after-budget`,
        `Retail max-lights=${variant.maxLights} all-lanes after-budget vs ${options.ablationLabel} after-budget`,
        `maxlights-${variant.maxLights}/all-lanes-after-budget`,
        variant.afterPath,
        `maxlights-${variant.maxLights}/${options.ablationLabel}-after-budget`,
        ablation.afterPath,
        `${options.ablationHeatmapPrefix}-maxlights-${variant.maxLights}-after-roi-heatmap.png`,
      ),
    );
    caseConfigs.push(
      makePngPairCase(
        `maxlights-${variant.maxLights}-${options.ablationLabel}-before-after-budget`,
        `Retail max-lights=${variant.maxLights} ${options.ablationLabel} before/after budget diff`,
        `maxlights-${variant.maxLights}/${options.ablationLabel}-before-budget`,
        ablation.beforePath,
        `maxlights-${variant.maxLights}/${options.ablationLabel}-after-budget`,
        ablation.afterPath,
        `${options.ablationHeatmapPrefix}-maxlights-${variant.maxLights}-own-budget-roi-heatmap.png`,
      ),
    );
  }

  const cases = caseConfigs.map((config) =>
    buildCase(repoRoot, artifactDir, config, options.sampleWidth, options.sampleHeight),
  );
  const generatedCases = cases.filter(
    (entry) => entry.status === "roi-diagnostics-generated-owner-classifier-still-blocked",
  );
  const budgetSensitiveCases = generatedCases.filter(
    (entry) => entry.metric?.changedSampleRatioGt5 > 0,
  );
  const afterAblationCases = generatedCases.filter((entry) =>
    entry.caseId.endsWith(`all-vs-${options.ablationLabel}-after-budget`),
  );
  const ownBudgetCases = generatedCases.filter((entry) =>
    entry.caseId.endsWith(`${options.ablationLabel}-before-after-budget`),
  );

  return {
    version: "aurora-cross-lane-retail-ablation-comparison/v1",
    label: options.ablationLabel,
    status:
      generatedCases.length === caseConfigs.length
        ? "ablation-roi-diagnostics-written-parity-still-blocked"
        : "blocked-ablation-roi-inputs-missing",
    passed: false,
    canonicalParityPromoted: false,
    inputs: {
      observation: existsSync(ablationObservationPath)
        ? {
            present: true,
            ...describeFile(repoRoot, ablationObservationPath),
            reportStatus: ablationObservation?.status ?? null,
          }
        : {
            present: false,
            path: toRepoRelative(repoRoot, ablationObservationPath),
          },
      observedMaxLightVariants: ablationVariants.map((variant) => variant.maxLights),
    },
    summary: {
      caseCount: caseConfigs.length,
      generatedCaseCount: generatedCases.length,
      missingInputCaseCount: caseConfigs.length - generatedCases.length,
      heatmapCount: generatedCases.length,
      budgetSensitiveCaseCount: budgetSensitiveCases.length,
      allVsAblationAfterBudgetCaseCount: afterAblationCases.length,
      allVsAblationAfterBudgetSensitiveCaseCount: afterAblationCases.filter(
        (entry) => entry.metric?.changedSampleRatioGt5 > 0,
      ).length,
      ablationOwnBudgetSensitiveCaseCount: ownBudgetCases.filter(
        (entry) => entry.metric?.changedSampleRatioGt5 > 0,
      ).length,
      provesAblationPixelEffect: afterAblationCases.some(
        (entry) => entry.metric?.changedSampleRatioGt5 > 0,
      ),
      provesAcceptedDroppedOwnerMapping: false,
      provesDirectRendererSlotOrder: false,
      provesCanonicalParity: false,
    },
    cases,
    blocker:
      "Ablation comparisons show whether removing one lane changes retail pixels, but they are not a direct renderer active-slot dump and cannot by themselves promote canonical owner ordering.",
  };
}

function buildReport(options) {
  const repoRoot = resolve(options.repoRoot);
  const artifactDir = toAbsolute(repoRoot, options.artifactDir);
  const observationPath = resolve(artifactDir, "retail-cross-lane-max-light-variant-observation.json");
  const observation = readJsonIfPresent(observationPath);
  const { cases: caseConfigs, variants } = buildCaseConfigs(repoRoot, artifactDir, observation);
  const cases = caseConfigs.map((config) =>
    buildCase(repoRoot, artifactDir, config, options.sampleWidth, options.sampleHeight),
  );
  const ownerClassifier = buildOwnerClassifier(
    repoRoot,
    artifactDir,
    caseConfigs,
    options.sampleWidth,
    options.sampleHeight,
  );
  const generatedCases = cases.filter(
    (entry) => entry.status === "roi-diagnostics-generated-owner-classifier-still-blocked",
  );
  const budgetSensitiveCases = generatedCases.filter(
    (entry) => entry.metric?.changedSampleRatioGt5 > 0,
  );
  const ablationComparison = buildAblationComparison(repoRoot, artifactDir, variants, options);

  return {
    version: "aurora-cross-lane-retail-maxlight-roi-diagnostics/v1",
    generatedAt: new Date().toISOString(),
    status:
      generatedCases.length === cases.length
        ? ownerClassifier.evaluated
          ? "retail-maxlight-roi-diagnostics-written-owner-classifier-evaluated-still-blocked"
          : "retail-maxlight-roi-diagnostics-written-owner-classifier-still-blocked"
        : "blocked-retail-maxlight-roi-inputs-missing",
    passed: false,
    canonicalParityPromoted: false,
    safety: {
      launchesRetailProcess: false,
      usesGlobalCursor: false,
      source: "offline-existing-retail-png-artifacts",
    },
    inputs: {
      variantObservation: existsSync(observationPath)
        ? {
            present: true,
            ...describeFile(repoRoot, observationPath),
            reportStatus: observation?.status ?? null,
          }
        : {
            present: false,
            path: toRepoRelative(repoRoot, observationPath),
          },
      observedMaxLightVariants: variants.map((variant) => variant.maxLights),
    },
    summary: {
      caseCount: cases.length,
      generatedCaseCount: generatedCases.length,
      missingInputCaseCount: cases.length - generatedCases.length,
      heatmapCount: generatedCases.length,
      budgetSensitiveCaseCount: budgetSensitiveCases.length,
      provesBudgetSensitiveRetailPixels: budgetSensitiveCases.length > 0,
      ablationComparisonStatus: ablationComparison?.status ?? "not-requested",
      ablationComparisonCaseCount: ablationComparison?.summary.caseCount ?? 0,
      ablationComparisonGeneratedCaseCount:
        ablationComparison?.summary.generatedCaseCount ?? 0,
      ablationProvesPixelEffect:
        ablationComparison?.summary.provesAblationPixelEffect ?? false,
      ownerClassifierStatus: ownerClassifier.status,
      ownerClassifierEvaluated: ownerClassifier.evaluated,
      ownerClassifierStrongCandidateCaseCount:
        ownerClassifier.summary.strongCandidateCaseCount,
      provesPartialOwnerCandidates:
        ownerClassifier.summary.provesPartialOwnerCandidates,
      provesAcceptedDroppedOwnerMapping: false,
      provesDirectRendererSlotOrder: false,
      provesCanonicalParity: false,
    },
    ownerClassifier,
    ablationComparison,
    cases,
    blockedParityFacts: [
      "Retail max-light variants now have per-ROI heatmaps and sampled hot-cell metrics.",
      ownerClassifier.evaluated
        ? "The owner classifier has evaluated isolated lane-reference masks, but it does not promote direct renderer order or canonical parity."
        : "Those metrics prove pixel sensitivity to the lighting budget, not which lane owner was accepted or dropped.",
      "Cross-lane retail parity still requires a direct renderer active-slot dump or a complete accepted/dropped owner map accepted by the gate.",
    ],
    blocker:
      ownerClassifier.evaluated
        ? ownerClassifier.blocker
        : "The report improves the pixel-differential oracle, but it deliberately does not infer acceptedSlots/droppedSlots without owner-classifier evidence.",
  };
}

const options = parseArgs(process.argv.slice(2));
const repoRoot = resolve(options.repoRoot);
const artifactDir = toAbsolute(repoRoot, options.artifactDir);
mkdirSync(artifactDir, { recursive: true });
const report = buildReport(options);
const outputPath = resolveOutputPath(repoRoot, artifactDir, options.output);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      status: report.status,
      output: toRepoRelative(repoRoot, outputPath),
      summary: report.summary,
      canonicalParityPromoted: report.canonicalParityPromoted,
    },
    null,
    2,
  ),
);
