#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";
const DEFAULT_OUTPUT = "retail-cross-lane-active-slots.json";
const DEFAULT_CLIENT_LOG = resolve(
  process.env.USERPROFILE ?? "",
  "Documents/Neverwinter Nights/logs/nwclientLog1.txt",
);

const isolatedCrossLaneReferenceArtifacts = [
  "retail-ref-tile-main-light.png",
  "retail-ref-tile-source-light.png",
  "retail-ref-placeable-lightcolor.png",
  "retail-ref-mdl-source-light.png",
  "retail-ref-item-property-light.png",
  "retail-ref-progfx-type4-light.png",
];

const isolatedCrossLaneReferenceArtifactCandidates = {
  "retail-ref-tile-main-light.png": [
    "retail-ref-tile-main-light.png",
    "retail-ref-tile-main-light-stock-userdir-fallback.png",
  ],
  "retail-ref-tile-source-light.png": [
    "retail-ref-tile-source-light.png",
    "retail-ref-tile-source-light-stock-userdir-fallback.png",
  ],
  "retail-ref-placeable-lightcolor.png": [
    "retail-ref-placeable-lightcolor.png",
    "retail-ref-placeable-lightcolor-new-module-fallback.png",
    "retail-ref-placeable-lightcolor-default-userdir-fallback-window.png",
    "retail-ref-placeable-lightcolor-fallback-window.png",
    "retail-ref-placeable-lightcolor-fallback-window-2.png",
    "retail-ref-placeable-lightcolor-stock-userdir-fallback.png",
  ],
  "retail-ref-mdl-source-light.png": ["retail-ref-mdl-source-light.png"],
  "retail-ref-item-property-light.png": [
    "retail-ref-item-property-light.png",
    "retail-ref-item-property-light-stock-userdir-fallback.png",
  ],
  "retail-ref-progfx-type4-light.png": [
    "retail-ref-progfx-type4-light.png",
    "retail-ref-progfx-type4-light-openpad-fallback.png",
    "retail-ref-progfx-type4-light-fallback.png",
    "retail-ref-progfx-type4-light-stock-userdir-fallback.png",
  ],
};

const laneOwners = [
  {
    lane: "terrain-tile-main-light",
    driverBinding: "SetTileMainLightColor",
    retailSource: "Tile_MainLight1/2",
    stagedColor: "TILE_MAIN_LIGHT_COLOR_BLUE/TILE_MAIN_LIGHT_COLOR_RED",
    directRendererSlotObserved: false,
  },
  {
    lane: "terrain-tile-source-light",
    driverBinding: "SetTileSourceLightColor",
    retailSource: "Tile_SrcLight1/2 -> fx_flame01 sourcelight carriers",
    stagedColor: "TILE_SOURCE_LIGHT_COLOR_PALE_YELLOW/TILE_SOURCE_LIGHT_COLOR_PALE_GREEN",
    directRendererSlotObserved: false,
  },
  {
    lane: "placeables-2da-light",
    driverBinding: "SetPlaceableIllumination(plc_campfr)",
    retailSource: "placeables.2da row 58 Campfr / PLC_I06 LightColor=6 ShadowSize=1",
    stagedColor: "PaleYellow from placeables.2da LightColor",
    directRendererSlotObserved: false,
  },
  {
    lane: "source-mdl-light-node",
    driverBinding: "SetPlaceableIllumination(plc_freetorch)",
    retailSource: "retail placeable model light carrier / PartLight family",
    stagedColor: "model-authored source light",
    directRendererSlotObserved: false,
  },
  {
    lane: "item-property-light",
    driverBinding: "ItemPropertyLight(IP_CONST_LIGHTBRIGHTNESS_BRIGHT, IP_CONST_LIGHTCOLOR_RED)",
    retailSource: "ITEM_PROPERTY_LIGHT -> VFX_DUR_LIGHT_* -> progfx.2da -> fx_light_clr",
    stagedColor: "Red Bright 20m item-property light",
    directRendererSlotObserved: false,
  },
  {
    lane: "progfx-type4-light-or-vision",
    driverBinding: "EffectVisualEffect(VFX_DUR_LIGHT_BLUE_5)",
    retailSource: "visualeffects.2da row 153 -> progfx.2da LightBlue5m",
    stagedColor: "Blue 5m ProgFX Type 4 request",
    directRendererSlotObserved: false,
  },
];

const laneByReferenceArtifact = {
  "retail-ref-tile-main-light.png": "terrain-tile-main-light",
  "retail-ref-tile-source-light.png": "terrain-tile-source-light",
  "retail-ref-placeable-lightcolor.png": "placeables-2da-light",
  "retail-ref-mdl-source-light.png": "source-mdl-light-node",
  "retail-ref-item-property-light.png": "item-property-light",
  "retail-ref-progfx-type4-light.png": "progfx-type4-light-or-vision",
};

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    out: DEFAULT_OUTPUT,
    clientLog: DEFAULT_CLIENT_LOG,
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
      options.out = requireValue(arg, argv[index]);
    } else if (arg === "--clientLog") {
      index += 1;
      options.clientLog = requireValue(arg, argv[index]);
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
  console.log(`Usage: node scripts/create-area-lighting-retail-active-slot-observation.mjs [options]

Options:
  --repoRoot <path>       Repository root. Defaults to the aurora-web root.
  --artifactDir <path>    Artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
  --out <path>            Output JSON path or filename. Defaults to ${DEFAULT_OUTPUT}
  --clientLog <path>      NWN client log to scan for ALS_CAPTURE cues.
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readPngInfo(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a" || buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer.readUInt8(24),
    colorType: buffer.readUInt8(25),
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
  return { path, width, height, rgba };
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

function summarizePngVisualStats(path) {
  const image = readPngRgba(path);
  const sampleWidth = 128;
  const sampleHeight = 90;
  let veryDark = 0;
  let dark = 0;
  let veryBright = 0;
  let lumaTotal = 0;
  const sampleCount = sampleWidth * sampleHeight;
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const pixel = pixelAt(
        image,
        Math.floor((x / Math.max(1, sampleWidth - 1)) * (image.width - 1)),
        Math.floor((y / Math.max(1, sampleHeight - 1)) * (image.height - 1)),
      );
      const luma = luminance(pixel);
      lumaTotal += luma;
      if (luma < 5) {
        veryDark += 1;
      }
      if (luma < 20) {
        dark += 1;
      }
      if (luma > 235) {
        veryBright += 1;
      }
    }
  }
  return {
    width: image.width,
    height: image.height,
    sampleWidth,
    sampleHeight,
    sampleCount,
    meanLuma: lumaTotal / sampleCount,
    veryDarkSampleRatio: veryDark / sampleCount,
    darkSampleRatio: dark / sampleCount,
    veryBrightSampleRatio: veryBright / sampleCount,
  };
}

function classifyReferenceVisualStats(stats) {
  if (!stats || stats.width < 640 || stats.height < 480) {
    return "invalid-small-or-unreadable-png";
  }
  if (stats.veryDarkSampleRatio > 0.7 && stats.meanLuma < 35) {
    return "invalid-loading-screen-or-black-frame";
  }
  if (stats.veryBrightSampleRatio > 0.7 && stats.meanLuma > 220) {
    return "invalid-white-window-or-empty-frame";
  }
  return "valid-gameplay-reference-candidate";
}

function describeClassifierReferenceArtifact(repoRoot, artifactDir, canonicalName) {
  const candidateNames =
    isolatedCrossLaneReferenceArtifactCandidates[canonicalName] ?? [canonicalName];
  const candidates = candidateNames.map((name) => {
    const path = resolve(artifactDir, name);
    if (!existsSync(path)) {
      return {
        name,
        status: "missing",
      };
    }
    try {
      const stats = statSync(path);
      const visualStats = summarizePngVisualStats(path);
      const visualStatus = classifyReferenceVisualStats(visualStats);
      return {
        name,
        status: "present",
        path: toRepoRelative(repoRoot, path),
        bytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        sha256: sha256(readFileSync(path)),
        visualStatus,
        visualStats,
      };
    } catch (error) {
      return {
        name,
        status: "invalid",
        path: toRepoRelative(repoRoot, path),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  const selected = candidates.find(
    (candidate) =>
      candidate.status === "present" &&
      candidate.visualStatus === "valid-gameplay-reference-candidate",
  );
  const canonical = candidates[0];
  const status = selected
    ? selected.name === canonicalName
      ? "selected-canonical-gameplay-reference"
      : "selected-fallback-gameplay-reference"
    : candidates.some((candidate) => candidate.status === "present")
      ? "blocked-no-valid-gameplay-reference"
      : "missing";
  return {
    canonicalName,
    status,
    selectedName: selected?.name ?? null,
    selectedPath: selected?.path ?? null,
    canonicalVisualStatus:
      canonical?.status === "present" ? canonical.visualStatus : canonical?.status ?? "missing",
    candidates,
  };
}

function comparePngImages(leftPath, rightPath, sampleWidth = 64, sampleHeight = 64) {
  const left = readPngRgba(leftPath);
  const right = readPngRgba(rightPath);
  let absRgb = 0;
  let absLuma = 0;
  let squaredRgb = 0;
  let changedSamples = 0;
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
      if (rgbDelta > 5) {
        changedSamples += 1;
      }
    }
  }
  return {
    left: { path: toRepoRelative(resolve(scriptDir, "..", ".."), leftPath), width: left.width, height: left.height },
    right: { path: toRepoRelative(resolve(scriptDir, "..", ".."), rightPath), width: right.width, height: right.height },
    sampleWidth,
    sampleHeight,
    sampleCount: count,
    meanAbsRgbDelta: absRgb / count,
    meanAbsLumaDelta: absLuma / count,
    rmsRgbDelta: Math.sqrt(squaredRgb / count),
    changedSampleRatioGt5: changedSamples / count,
  };
}

function cosineSimilarity(left, right) {
  let dot = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index += 1) {
    dot += left[index] * right[index];
    leftEnergy += left[index] * left[index];
    rightEnergy += right[index] * right[index];
  }
  if (leftEnergy <= 0 || rightEnergy <= 0) {
    return 0;
  }
  return dot / Math.sqrt(leftEnergy * rightEnergy);
}

function buildPositiveLumaDeltaVector(left, right, sampleWidth, sampleHeight) {
  const samples = [];
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const sampleX = x / Math.max(1, sampleWidth - 1);
      const sampleY = y / Math.max(1, sampleHeight - 1);
      const leftPixel = pixelAt(
        left,
        Math.floor(sampleX * (left.width - 1)),
        Math.floor(sampleY * (left.height - 1)),
      );
      const rightPixel = pixelAt(
        right,
        Math.floor(sampleX * (right.width - 1)),
        Math.floor(sampleY * (right.height - 1)),
      );
      samples.push(Math.max(0, luminance(rightPixel) - luminance(leftPixel)));
    }
  }
  return samples;
}

function resolveLaneOwnerVariantPair(maxLightVariantObservation) {
  const metrics = Array.isArray(maxLightVariantObservation.variantPixelMetrics)
    ? maxLightVariantObservation.variantPixelMetrics.filter(
        (metric) =>
          metric.status === "variant-pixel-metric-evaluated" &&
          typeof metric.maxLights === "number" &&
          metric.beforePath &&
          metric.afterPath,
      )
    : [];
  if (metrics.length < 2) {
    return null;
  }
  const sorted = [...metrics].sort((left, right) => left.maxLights - right.maxLights);
  return {
    low: sorted[0],
    high: sorted[sorted.length - 1],
  };
}

function buildLaneOwnerPixelClassifier(repoRoot, maxLightVariantObservation) {
  if (maxLightVariantObservation.status !== "present") {
    return {
      status: "blocked-max-light-variant-observation-missing",
      passed: false,
      provesAcceptedDroppedOwnerMapping: false,
    };
  }
  if (maxLightVariantObservation.classifierGrade !== true) {
    return {
      status: "blocked-reference-inputs-not-classifier-grade",
      passed: false,
      provesAcceptedDroppedOwnerMapping: false,
      missingIsolatedReferenceArtifacts:
        maxLightVariantObservation.missingIsolatedReferenceArtifacts ?? [],
      invalidIsolatedReferenceArtifacts:
        maxLightVariantObservation.invalidIsolatedReferenceArtifacts ?? [],
    };
  }
  const variantPair = resolveLaneOwnerVariantPair(maxLightVariantObservation);
  if (!variantPair) {
    return {
      status: "blocked-max-light-variant-pair-missing",
      passed: false,
      provesAcceptedDroppedOwnerMapping: false,
    };
  }
  const selectedReferences = Array.isArray(
    maxLightVariantObservation.selectedIsolatedReferenceArtifacts,
  )
    ? maxLightVariantObservation.selectedIsolatedReferenceArtifacts.filter(
        (reference) => reference.selectedPath,
      )
    : [];
  const sampleWidth = 160;
  const sampleHeight = 112;
  try {
    const lowAfter = readPngRgba(toAbsolute(repoRoot, variantPair.low.afterPath));
    const highAfter = readPngRgba(toAbsolute(repoRoot, variantPair.high.afterPath));
    const lowBefore = readPngRgba(toAbsolute(repoRoot, variantPair.low.beforePath));
    const budgetDelta = buildPositiveLumaDeltaVector(
      lowAfter,
      highAfter,
      sampleWidth,
      sampleHeight,
    );
    const scores = selectedReferences
      .map((reference) => {
        const referenceImage = readPngRgba(toAbsolute(repoRoot, reference.selectedPath));
        const referenceDelta = buildPositiveLumaDeltaVector(
          lowBefore,
          referenceImage,
          sampleWidth,
          sampleHeight,
        );
        return {
          canonicalName: reference.canonicalName,
          selectedName: reference.selectedName,
          lane: laneByReferenceArtifact[reference.canonicalName] ?? "unknown",
          cosineLumaDelta: cosineSimilarity(budgetDelta, referenceDelta),
        };
      })
      .sort((left, right) => right.cosineLumaDelta - left.cosineLumaDelta)
      .map((entry, index, sorted) => ({
        ...entry,
        rank: index + 1,
        marginToNext:
          index < sorted.length - 1
            ? entry.cosineLumaDelta - sorted[index + 1].cosineLumaDelta
            : null,
      }));
    const top = scores[0] ?? null;
    const second = scores[1] ?? null;
    const topMargin = top && second ? top.cosineLumaDelta - second.cosineLumaDelta : 0;
    const highConfidence = Boolean(top && top.cosineLumaDelta >= 0.25 && topMargin >= 0.08);
    return {
      status: highConfidence
        ? "candidate-owner-classifier-high-confidence-unpromoted"
        : "blocked-owner-classifier-ambiguous",
      passed: false,
      canonicalParityPromoted: false,
      provesAcceptedDroppedOwnerMapping: false,
      sampleWidth,
      sampleHeight,
      variantPair: {
        lowMaxLights: variantPair.low.maxLights,
        highMaxLights: variantPair.high.maxLights,
        lowAfterPath: variantPair.low.afterPath,
        highAfterPath: variantPair.high.afterPath,
      },
      selectedReferenceCount: selectedReferences.length,
      threshold: {
        minimumTopCosineLumaDelta: 0.25,
        minimumTopMargin: 0.08,
      },
      topLaneCandidate: top,
      topMargin,
      scores,
      blocker: highConfidence
        ? "Classifier found a high-confidence pixel owner candidate, but Aurora Web still does not promote acceptedSlots/droppedSlots without a direct retail slot dump or multi-owner validation."
        : "Valid isolated references exist, but the max-light budget delta is not separated enough to map accepted/dropped owners without guessing.",
    };
  } catch (error) {
    return {
      status: "blocked-owner-classifier-error",
      passed: false,
      provesAcceptedDroppedOwnerMapping: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function describeArtifact(repoRoot, artifactDir, name) {
  const path = resolve(artifactDir, name);
  if (!existsSync(path)) {
    return {
      name,
      status: "missing",
    };
  }
  const buffer = readFileSync(path);
  const stats = statSync(path);
  const png = name.toLowerCase().endsWith(".png") ? readPngInfo(buffer) : null;
  return {
    name,
    status: "present",
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    sha256: sha256(buffer),
    ...(png ? { png } : {}),
  };
}

function readVariantObservation(repoRoot, artifactDir) {
  const path = resolve(artifactDir, "retail-cross-lane-max-light-variant-observation.json");
  if (!existsSync(path)) {
    return {
      status: "missing",
      path: toRepoRelative(repoRoot, path),
    };
  }
  const stats = statSync(path);
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const durableActiveSlotCues = Array.isArray(parsed.variants)
    ? parsed.variants
        .map((variant) => ({
          maxLights: variant.maxLights ?? null,
          artifactCue: variant.activeSlotCue?.artifactCue ?? "",
          line: variant.activeSlotCue?.line ?? "",
          captured: variant.activeSlotCue?.captured ?? null,
          reason: variant.activeSlotCue?.reason ?? "",
        }))
        .filter(
          (cue) =>
            cue.artifactCue === "retail-cross-lane-active-slots.json" ||
            cue.line.includes("ALS_CAPTURE retail-cross-lane-active-slots.json"),
        )
    : [];
  const variantPixelMetrics = Array.isArray(parsed.variants)
    ? parsed.variants.map((variant) => {
        const beforePath = variant.beforeBudget?.path ? toAbsolute(repoRoot, variant.beforeBudget.path) : null;
        const afterPath = variant.afterBudget?.path ? toAbsolute(repoRoot, variant.afterBudget.path) : null;
        if (!beforePath || !afterPath || !existsSync(beforePath) || !existsSync(afterPath)) {
          return {
            maxLights: variant.maxLights,
            status: "blocked-variant-png-missing",
            beforePath: beforePath ? toRepoRelative(repoRoot, beforePath) : null,
            afterPath: afterPath ? toRepoRelative(repoRoot, afterPath) : null,
          };
        }
        try {
          return {
            maxLights: variant.maxLights,
            status: "variant-pixel-metric-evaluated",
            beforePath: toRepoRelative(repoRoot, beforePath),
            afterPath: toRepoRelative(repoRoot, afterPath),
            metric: comparePngImages(beforePath, afterPath, 64, 64),
          };
        } catch (error) {
          return {
            maxLights: variant.maxLights,
            status: "blocked-variant-pixel-metric-error",
            beforePath: toRepoRelative(repoRoot, beforePath),
            afterPath: toRepoRelative(repoRoot, afterPath),
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    : [];
  const isolatedReferenceArtifacts = isolatedCrossLaneReferenceArtifacts.map((artifact) =>
    describeClassifierReferenceArtifact(repoRoot, artifactDir, artifact),
  );
  const missingIsolatedReferenceArtifacts = isolatedReferenceArtifacts
    .filter((artifact) => artifact.status === "missing")
    .map((artifact) => artifact.canonicalName);
  const invalidIsolatedReferenceArtifacts = isolatedReferenceArtifacts
    .filter(
      (artifact) =>
        artifact.status !== "missing" &&
        artifact.status !== "selected-canonical-gameplay-reference" &&
        artifact.status !== "selected-fallback-gameplay-reference",
    )
    .map((artifact) => artifact.canonicalName);
  const fallbackIsolatedReferenceArtifacts = isolatedReferenceArtifacts
    .filter((artifact) => artifact.status === "selected-fallback-gameplay-reference")
    .map((artifact) => ({
      canonicalName: artifact.canonicalName,
      selectedName: artifact.selectedName,
      canonicalVisualStatus: artifact.canonicalVisualStatus,
    }));
  const selectedIsolatedReferenceArtifacts = isolatedReferenceArtifacts.map((artifact) => ({
    canonicalName: artifact.canonicalName,
    status: artifact.status,
    selectedName: artifact.selectedName,
    selectedPath: artifact.selectedPath,
    canonicalVisualStatus: artifact.canonicalVisualStatus,
  }));
  const validIsolatedReferenceArtifacts = isolatedReferenceArtifacts.filter(
    (artifact) =>
      artifact.status === "selected-canonical-gameplay-reference" ||
      artifact.status === "selected-fallback-gameplay-reference",
  );
  const variantMetricsEvaluated =
    variantPixelMetrics.length > 0 &&
    variantPixelMetrics.every((metric) => metric.status === "variant-pixel-metric-evaluated");
  const classifierGrade =
    variantMetricsEvaluated &&
    validIsolatedReferenceArtifacts.length === isolatedCrossLaneReferenceArtifacts.length &&
    missingIsolatedReferenceArtifacts.length === 0 &&
    invalidIsolatedReferenceArtifacts.length === 0;
  return {
    status: "present",
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    reportStatus: parsed.status ?? null,
    settingsRestored: parsed.safety?.settingsRestored ?? null,
    variantCount: Array.isArray(parsed.variants) ? parsed.variants.length : null,
    variants: Array.isArray(parsed.variants)
      ? parsed.variants.map((variant) => ({
          maxLights: variant.maxLights,
          captureStatus: variant.captureStatus,
          capturedCount: variant.capturedCount,
          beforeBudgetStatus: variant.beforeBudget?.status ?? "missing",
          afterBudgetStatus: variant.afterBudget?.status ?? "missing",
          activeSlotCue: variant.activeSlotCue ?? null,
        }))
      : [],
    variantPixelMetrics,
    variantMetricsEvaluated,
    isolatedReferenceArtifacts,
    selectedIsolatedReferenceArtifacts,
    fallbackIsolatedReferenceArtifacts,
    missingIsolatedReferenceArtifacts,
    invalidIsolatedReferenceArtifacts,
    requiredIsolatedReferenceArtifacts: isolatedCrossLaneReferenceArtifacts,
    classifierGrade,
    budgetSensitivityStatus: variantMetricsEvaluated
      ? "retail-max-light-variant-pixel-metrics-evaluated"
      : "blocked-retail-max-light-variant-pixel-metrics-missing",
    directRetailSlotDumpAvailable: parsed.directRetailSlotDumpAvailable === true,
    directRendererSlotOrderObserved: parsed.directRendererSlotOrderObserved === true,
    strongerPixelOracleStatus: classifierGrade
      ? "candidate-inputs-present-lane-owner-evaluator-still-required"
      : missingIsolatedReferenceArtifacts.length > 0
        ? "blocked-isolated-lane-reference-captures-missing"
        : "blocked-isolated-lane-reference-captures-invalid",
    durableCrossLaneCaptureCueEvidence: {
      status:
        durableActiveSlotCues.length > 0
          ? "cross-lane-active-slot-cues-present-in-maxlight-observation"
          : "cross-lane-active-slot-cues-missing-in-maxlight-observation",
      source: toRepoRelative(repoRoot, path),
      cues: durableActiveSlotCues,
    },
  };
}

function extractCrossLaneLogCues(clientLog) {
  if (!clientLog || !existsSync(clientLog)) {
    return {
      status: "missing-log",
      path: clientLog,
      cues: [],
    };
  }
  const text = readFileSync(clientLog, "utf8");
  const lines = text.split(/\r?\n/u);
  const lastBegin = lines.reduce(
    (last, line, index) => (line.includes("ALS_BEGIN cross-lane") ? index : last),
    -1,
  );
  const scanLines = lastBegin >= 0 ? lines.slice(lastBegin) : lines;
  const cues = scanLines
    .map((line, index) => ({ lineNumber: (lastBegin >= 0 ? lastBegin : 0) + index + 1, text: line }))
    .filter(
      (entry) =>
        entry.text.includes("ALS_BEGIN cross-lane") ||
        entry.text.includes("ALS_CAPTURE retail-cross-lane") ||
        entry.text.includes("ALS_OBSERVE cross-lane"),
    );
  return {
    status: cues.length > 0 ? "cross-lane-cues-present" : "cross-lane-cues-missing",
    path: clientLog,
    cues,
  };
}

function buildReport(options) {
  const repoRoot = resolve(options.repoRoot);
  const artifactDir = toAbsolute(repoRoot, options.artifactDir);
  const outputPath = toAbsolute(artifactDir, options.out);
  const beforeBudget = describeArtifact(
    repoRoot,
    artifactDir,
    "retail-cross-lane-all-lanes-before-budget.png",
  );
  const afterBudget = describeArtifact(
    repoRoot,
    artifactDir,
    "retail-cross-lane-all-lanes-after-budget.png",
  );
  const logEvidence = extractCrossLaneLogCues(toAbsolute(repoRoot, options.clientLog));
  const maxLightVariantObservation = readVariantObservation(repoRoot, artifactDir);
  const maxLightVariantsPresent =
    maxLightVariantObservation.status === "present" &&
    Array.isArray(maxLightVariantObservation.variants) &&
    maxLightVariantObservation.variants.length > 0;
  const requiredPixelInputs = [beforeBudget, afterBudget];
  const runtimePixelEvidencePresent = requiredPixelInputs.every((artifact) => artifact.status === "present");
  const durableCaptureCueEvidence =
    maxLightVariantObservation.durableCrossLaneCaptureCueEvidence ?? {
      status: "missing-maxlight-observation-cue-evidence",
      source: null,
      cues: [],
    };
  const runtimeLogCuePresent =
    logEvidence.status === "cross-lane-cues-present" ||
    durableCaptureCueEvidence.status ===
      "cross-lane-active-slot-cues-present-in-maxlight-observation";
  const laneOwnerPixelClassifier = buildLaneOwnerPixelClassifier(
    repoRoot,
    maxLightVariantObservation,
  );

  return {
    version: "aurora-area-lighting-retail-active-slot-observation/v1",
    generatedAt: new Date().toISOString(),
    status:
      runtimePixelEvidencePresent && runtimeLogCuePresent
        ? "blocked-no-direct-retail-active-slot-dump"
        : "blocked-missing-retail-cross-lane-observation-input",
    passed: false,
    canonicalParityPromoted: false,
    artifactRequirementSatisfiedAsStructuredOracle: true,
    directRetailSlotDumpAvailable: false,
    directRendererSlotOrderObserved: false,
    slotOrderingProofStatus: "blocked-no-direct-retail-active-slot-dump",
    observationKind: "retail-runtime-pixels-and-log-cues",
    budget: {
      mode: maxLightVariantsPresent
        ? "retail-max-light-variants-observed-no-direct-active-slot-dump"
        : "retail-runtime-default-no-scripted-active-light-budget",
      requestedLaneOwnerCount: laneOwners.length,
      directRuntimeBudgetDumpAvailable: false,
      maxLightVariantsObserved: maxLightVariantsPresent
        ? maxLightVariantObservation.variants.map((variant) => variant.maxLights)
        : [],
      sourceBackedMaxSlotCap: {
        value: 128,
        proofStatus: "source-backed-mdl-light-slot-cap-max-128",
        source: "C:/Projects/New Folder/export/decompiled_all.c:866086-866096 FUN_00a41e30",
      },
    },
    acceptedSlots: [],
    droppedSlots: [],
    laneOwners,
    observations: {
      runtimePixelEvidencePresent,
      runtimeLogCuePresent,
      beforeBudget,
      afterBudget,
      maxLightVariantObservation,
      laneOwnerPixelClassifier,
      logEvidence,
      durableCaptureCueEvidence,
      runtimeLogCueSource:
        logEvidence.status === "cross-lane-cues-present"
          ? "live-client-log"
          : durableCaptureCueEvidence.status ===
              "cross-lane-active-slot-cues-present-in-maxlight-observation"
            ? "durable-maxlight-observation-active-slot-cue"
            : "missing",
    },
    blockedParityFacts: [
      "acceptedSlots/droppedSlots are intentionally empty because the retail renderer did not expose a direct active-slot dump",
      "before/after retail PNGs prove the staged scene was captured, not final LightManager owner precedence",
      maxLightVariantObservation.status === "present"
        ? maxLightVariantObservation.classifierGrade
          ? `max-light variant pixel metrics and valid isolated lane-reference captures are present; lane-owner evaluator status=${laneOwnerPixelClassifier.status}`
          : "max-light variant pixel metrics are evaluated, but valid isolated lane-reference captures are still required before owner acceptance can be inferred"
        : "max-light variant captures are missing, so budget-sensitive pixel evidence is incomplete",
      "source-backed LightManager sort/upload evidence still lacks owner receiver data-flow for tile/placeable/MDL/item/ProgFX insertion order",
    ],
    blocker:
      "This file satisfies the structured-oracle artifact slot without fabricating slot order. Full retail cross-lane parity remains blocked until a direct renderer slot dump or a stronger pixel-differential oracle identifies accepted and dropped lane owners.",
  };
}

const options = parseArgs(process.argv.slice(2));
const repoRoot = resolve(options.repoRoot);
const artifactDir = toAbsolute(repoRoot, options.artifactDir);
const outputPath = toAbsolute(artifactDir, options.out);
mkdirSync(dirname(outputPath), { recursive: true });
const report = buildReport(options);
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      status: report.status,
      output: toRepoRelative(repoRoot, outputPath),
      directRetailSlotDumpAvailable: report.directRetailSlotDumpAvailable,
      runtimePixelEvidencePresent: report.observations.runtimePixelEvidencePresent,
      runtimeLogCuePresent: report.observations.runtimeLogCuePresent,
      canonicalParityPromoted: report.canonicalParityPromoted,
    },
    null,
    2,
  ),
);
