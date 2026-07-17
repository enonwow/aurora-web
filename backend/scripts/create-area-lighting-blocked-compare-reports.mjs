#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";

const compareReports = [
  {
    caseId: "shadowvol-campfire-pixel-geometry-opacity",
    output: "shadowvol-campfire-pixel-compare.json",
    requiredInputs: [
      "retail-or-toolset-shadowvol-campfire.png",
      "aurora-web-shadowvol-campfire.png",
    ],
    acceptanceGate:
      "Projected caster footprint, receiver alignment, and opacity match retail/toolset within explicit tolerance.",
    evaluator: "shadowvol-campfire-pixel-metric",
  },
  {
    caseId: "shadowvol-retail-gl-state-order",
    output: "shadowvol-state-order-compare.json",
    requiredInputs: [
      "retail-shadowvol-state-trace.json",
      "aurora-web-shadowvol-state-trace.json",
    ],
    acceptanceGate:
      "Pass order, face mapping, stencil ops, receiver stencil/depth/color state, and opacity source match retail/toolset.",
    evaluator: "shadowvol-state-order",
  },
  {
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    output: "cross-lane-precedence-compare.json",
    requiredInputs: [
      "retail-cross-lane-all-lanes-before-budget.png",
      "retail-cross-lane-all-lanes-after-budget.png",
      "retail-cross-lane-active-slots.json",
      "aurora-web-cross-lane-all-lanes.frame.json",
    ],
    acceptanceGate:
      "Accepted/dropped tile, placeable, MDL, item, and ProgFX lanes match retail under a constrained active-light budget.",
    evaluator: "cross-lane-source-family-coverage",
  },
  {
    caseId: "progfx-type4-blind-vision-pixels",
    output: "retail-progfx-blindvision-pixel-compare.json",
    requiredInputs: [
      "retail-progfx-blindvision-before.png",
      "retail-progfx-blindvision-active.png",
      "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.frame.json",
    ],
    acceptanceGate:
      "Blind_Vision/Darkvision viewport pixel mutation and owner phase match the same retail visualeffects.2da row.",
    evaluator: "blindvision-retail-pixel-mutation",
  },
];

const isolatedCrossLaneReferenceArtifacts = [
  "retail-ref-tile-main-light.png",
  "retail-ref-tile-source-light.png",
  "retail-ref-placeable-lightcolor.png",
  "retail-ref-mdl-source-light.png",
  "retail-ref-item-property-light.png",
  "retail-ref-progfx-type4-light.png",
];

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--artifactDir") {
      index += 1;
      options.artifactDir = requireValue(arg, argv[index]);
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
  console.log(`Usage: node scripts/create-area-lighting-blocked-compare-reports.mjs [options]

Options:
  --repoRoot <path>       Repository root. Defaults to the aurora-web root.
  --artifactDir <path>    Artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function artifactPath(name) {
  return resolve(artifactDir, name);
}

function resolveInputFile(name) {
  if (isAbsolute(name)) {
    return name;
  }
  const repoRelativePath = resolve(repoRoot, name);
  if (existsSync(repoRelativePath)) {
    return repoRelativePath;
  }
  return artifactPath(name);
}

function readJsonArtifact(name) {
  return JSON.parse(readFileSync(artifactPath(name), "utf8"));
}

function readJsonArtifactIfPresent(name) {
  if (!existsSync(artifactPath(name))) {
    return null;
  }
  return readJsonArtifact(name);
}

function findPixelDiffArtifact(caseId) {
  const report = readJsonArtifactIfPresent("area-lighting-pixel-diff-artifacts.json");
  const entry = (report?.cases ?? []).find((candidate) => candidate.caseId === caseId);
  return entry
    ? {
        present: true,
        status: entry.status ?? null,
        output: entry.output ?? null,
        metric: entry.metric ?? null,
        normalization: entry.normalization ?? null,
        calibratedRoiAttempt: entry.calibratedRoiAttempt ?? null,
        canonicalParityPromoted: entry.canonicalParityPromoted ?? null,
      }
    : {
        present: false,
        status: "missing-pixel-diff-artifact",
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

function readPngRgba(name) {
  const buffer = readFileSync(resolveInputFile(name));
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`${name} is not a PNG file.`);
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
    throw new Error(`${name} uses unsupported PNG bitDepth=${bitDepth} colorType=${colorType}.`);
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
        throw new Error(`${name} uses unsupported PNG filter ${filter}.`);
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
  return { name, width, height, rgba };
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

function comparePngImages(leftName, rightName, sampleWidth = 96, sampleHeight = 96) {
  const left = readPngRgba(leftName);
  const right = readPngRgba(rightName);
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
    left: { name: leftName, width: left.width, height: left.height },
    right: { name: rightName, width: right.width, height: right.height },
    sampleWidth,
    sampleHeight,
    sampleCount: count,
    meanAbsRgbDelta: absRgb / count,
    meanAbsLumaDelta: absLuma / count,
    rmsRgbDelta: Math.sqrt(squaredRgb / count),
    changedSampleRatioGt5: changedSamples / count,
  };
}

function buildToleranceEvaluation(policy, checks) {
  return {
    status: checks.every((check) => check.passed)
      ? "tolerance-passed"
      : "tolerance-failed",
    passed: checks.every((check) => check.passed),
    policy,
    checks,
  };
}

function changedBoundsAreaRatio(metric) {
  const bounds = metric?.changedBoundsGt5;
  if (!bounds || !metric?.sampleWidth || !metric?.sampleHeight) {
    return 0;
  }
  return (bounds.width * bounds.height) / (metric.sampleWidth * metric.sampleHeight);
}

function findLocalOracleMaterialization(targetName) {
  const manifest = readJsonArtifactIfPresent("area-lighting-local-oracle-inputs-manifest.json");
  return (
    (manifest?.materialized ?? []).find((entry) => entry?.target === targetName) ?? null
  );
}

function buildShadowvolCaptureCompatibility(pixelMetric, pixelDiffArtifact) {
  const localMaterialization = findLocalOracleMaterialization("aurora-web-shadowvol-campfire.png");
  const inputDimensionsMatch =
    pixelMetric.left.width === pixelMetric.right.width &&
    pixelMetric.left.height === pixelMetric.right.height;
  const aspectRatioDelta = Math.abs(
    pixelMetric.left.width / pixelMetric.left.height -
      pixelMetric.right.width / pixelMetric.right.height,
  );
  const normalizedDifferentDimensions =
    pixelDiffArtifact.normalization === "different-dimensions-normalized-sampled-grid";
  const localPreviewSource =
    localMaterialization?.kind === "aurora-web-shadowvol-campfire-pixel-input" &&
    localMaterialization.viewportCompatibilityStatus !== "same-retail-viewport";
  const calibratedRoiPresent =
    pixelDiffArtifact.normalization === "same-viewport-calibrated-roi" ||
    pixelDiffArtifact.normalization === "same-dimension-calibrated-roi" ||
    localMaterialization?.calibratedRoiTransformStatus === "calibrated-roi-transform-ready";
  const calibratedRoiAttempt = pixelDiffArtifact.calibratedRoiAttempt ?? null;
  const calibratedRoiAttempted = Boolean(
    calibratedRoiAttempt &&
      !["not-attempted-different-pixel-dimensions", "not-attempted"].includes(
        calibratedRoiAttempt.status,
      ),
  );
  const materializationClaimsRetailViewport =
    localMaterialization?.sameRetailCameraOrCalibratedRoi === true ||
    (localMaterialization?.viewportCompatibilityStatus === "same-retail-viewport" &&
      localMaterialization?.retailPixelParityInputStatus ===
        "same-retail-viewport-oracle-compatible");
  const samePixelDimensionsAsRetail =
    inputDimensionsMatch || localMaterialization?.samePixelDimensionsAsRetail === true;
  const sameViewportOrCalibratedRoi =
    (inputDimensionsMatch &&
      !normalizedDifferentDimensions &&
      materializationClaimsRetailViewport) ||
    calibratedRoiPresent;
  const checks = [
    booleanCheck("inputDimensionsMatch", inputDimensionsMatch),
    booleanCheck("samePixelDimensionsAsRetail", samePixelDimensionsAsRetail),
    maxThresholdCheck("aspectRatioDelta", aspectRatioDelta, 0.05),
    booleanCheck("pixelDiffUsesDifferentDimensionNormalization", normalizedDifferentDimensions, false),
    booleanCheck("auroraWebInputIsLocalPreviewArtifact", localPreviewSource, false),
    booleanCheck("materializationClaimsRetailViewport", materializationClaimsRetailViewport),
    booleanCheck("calibratedRoiAttempted", calibratedRoiAttempted),
    booleanCheck("calibratedRoiAttemptPassed", calibratedRoiAttempt?.passed === true),
    booleanCheck("calibratedRoiPresent", calibratedRoiPresent),
    booleanCheck("sameViewportOrCalibratedRoiPresent", sameViewportOrCalibratedRoi),
  ];
  return {
    status: sameViewportOrCalibratedRoi
      ? "shadowvol-capture-compatible"
      : "blocked-shadowvol-capture-viewport-or-roi-mismatch",
    passed: sameViewportOrCalibratedRoi,
    retailInput: pixelMetric.left,
    auroraWebInput: pixelMetric.right,
    aspectRatioDelta,
    pixelDiffNormalization: pixelDiffArtifact.normalization ?? null,
    calibratedRoiAttempted,
    calibratedRoiAttempt,
    localOracleMaterialization: localMaterialization
      ? {
          kind: localMaterialization.kind ?? null,
          source: localMaterialization.source ?? null,
          target: localMaterialization.target ?? null,
          note: localMaterialization.note ?? null,
          sourceFile: localMaterialization.sourceFile ?? null,
          targetFile: localMaterialization.targetFile ?? null,
          selectedSource: localMaterialization.selectedSource ?? null,
          sourceCandidates: localMaterialization.sourceCandidates ?? null,
          viewportCompatibilityStatus:
            localMaterialization.viewportCompatibilityStatus ?? null,
          retailPixelParityInputStatus:
            localMaterialization.retailPixelParityInputStatus ?? null,
          retailReference: localMaterialization.retailReference ?? null,
          retailReferenceFile: localMaterialization.retailReferenceFile ?? null,
          sourceDimensions: localMaterialization.sourceDimensions ?? null,
          targetDimensions: localMaterialization.targetDimensions ?? null,
          retailReferenceDimensions:
            localMaterialization.retailReferenceDimensions ?? null,
          pixelDimensionCompatibilityStatus:
            localMaterialization.pixelDimensionCompatibilityStatus ?? null,
          samePixelDimensionsAsRetail:
            localMaterialization.samePixelDimensionsAsRetail ?? null,
          sameRetailCameraOrCalibratedRoi:
            localMaterialization.sameRetailCameraOrCalibratedRoi ?? null,
          calibratedRoiTransformStatus:
            localMaterialization.calibratedRoiTransformStatus ?? null,
        }
      : null,
    checks,
    requiredNextCapture:
      "Capture Aurora Web from the same full-viewport camera/module as retail-or-toolset-shadowvol-campfire.png, or provide an explicit calibrated ROI transform before treating pixel deltas as projection parity.",
  };
}

function maxThresholdCheck(key, actual, max) {
  return {
    key,
    passed: typeof actual === "number" && actual <= max,
    actual,
    max,
  };
}

function booleanCheck(key, actual, expected = true) {
  return {
    key,
    passed: actual === expected,
    actual,
    expected,
  };
}

function evaluateCrossLaneMaxLightVariantClassifier() {
  const observation = readJsonArtifactIfPresent("retail-cross-lane-max-light-variant-observation.json");
  const roiDiagnostics = readJsonArtifactIfPresent("cross-lane-retail-maxlight-roi-diagnostics.json");
  const ownerClassifier = roiDiagnostics?.ownerClassifier ?? null;
  if (!observation) {
    return {
      present: false,
      status: "missing-retail-max-light-variant-observation",
      classifierGrade: false,
      variantMetrics: [],
      missingIsolatedReferenceArtifacts: isolatedCrossLaneReferenceArtifacts,
      roiDiagnostics: roiDiagnostics
        ? {
            present: true,
            status: roiDiagnostics.status ?? null,
            summary: roiDiagnostics.summary ?? null,
          }
        : {
            present: false,
            status: "missing-cross-lane-retail-maxlight-roi-diagnostics",
          },
    };
  }

  const variantMetrics = (observation.variants ?? []).map((variant) => {
    const beforePath = variant.beforeBudget?.path;
    const afterPath = variant.afterBudget?.path;
    if (!beforePath || !afterPath || !existsSync(resolveInputFile(beforePath)) || !existsSync(resolveInputFile(afterPath))) {
      return {
        maxLights: variant.maxLights,
        status: "blocked-variant-png-missing",
        beforePath: beforePath ?? null,
        afterPath: afterPath ?? null,
      };
    }
    try {
      return {
        maxLights: variant.maxLights,
        status: "variant-pixel-metric-evaluated",
        beforePath,
        afterPath,
        metric: comparePngImages(beforePath, afterPath, 64, 64),
      };
    } catch (error) {
      return {
        maxLights: variant.maxLights,
        status: "blocked-variant-pixel-metric-error",
        beforePath,
        afterPath,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const missingIsolatedReferenceArtifacts = isolatedCrossLaneReferenceArtifacts.filter(
    (artifact) => !existsSync(artifactPath(artifact)),
  );
  const classifierGrade =
    missingIsolatedReferenceArtifacts.length === 0 &&
    variantMetrics.length > 0 &&
    variantMetrics.every((variant) => variant.status === "variant-pixel-metric-evaluated");
  const ownerClassifierEvaluated = ownerClassifier?.evaluated === true;
  const partialOwnerCandidates =
    ownerClassifier?.summary?.provesPartialOwnerCandidates === true;

  return {
    present: true,
    status: !classifierGrade
      ? "blocked-isolated-lane-reference-captures-missing"
      : ownerClassifierEvaluated && partialOwnerCandidates
        ? "owner-classifier-evaluated-partial-owner-candidates-direct-slot-order-still-blocked"
        : ownerClassifierEvaluated
          ? "owner-classifier-evaluated-owner-mapping-ambiguous-direct-slot-order-still-blocked"
          : "candidate-classifier-inputs-present-evaluator-still-required",
    classifierGrade,
    ownerClassifierEvaluated,
    partialOwnerCandidates,
    observationStatus: observation.status ?? null,
    directRetailSlotDumpAvailable: observation.directRetailSlotDumpAvailable === true,
    directRendererSlotOrderObserved: observation.directRendererSlotOrderObserved === true,
    variantMetrics,
    roiDiagnostics: roiDiagnostics
      ? {
          present: true,
          status: roiDiagnostics.status ?? null,
          heatmapCount: roiDiagnostics.summary?.heatmapCount ?? null,
          budgetSensitiveCaseCount: roiDiagnostics.summary?.budgetSensitiveCaseCount ?? null,
          provesBudgetSensitiveRetailPixels:
            roiDiagnostics.summary?.provesBudgetSensitiveRetailPixels ?? null,
          ablationComparisonStatus:
            roiDiagnostics.summary?.ablationComparisonStatus ?? null,
          ablationComparisonCaseCount:
            roiDiagnostics.summary?.ablationComparisonCaseCount ?? null,
          ablationComparisonGeneratedCaseCount:
            roiDiagnostics.summary?.ablationComparisonGeneratedCaseCount ?? null,
          ablationProvesPixelEffect:
            roiDiagnostics.summary?.ablationProvesPixelEffect ?? null,
          ownerClassifierStatus: roiDiagnostics.summary?.ownerClassifierStatus ?? null,
          ownerClassifierEvaluated:
            roiDiagnostics.summary?.ownerClassifierEvaluated ?? null,
          ownerClassifierStrongCandidateCaseCount:
            roiDiagnostics.summary?.ownerClassifierStrongCandidateCaseCount ?? null,
          provesPartialOwnerCandidates:
            roiDiagnostics.summary?.provesPartialOwnerCandidates ?? null,
          provesAcceptedDroppedOwnerMapping:
            roiDiagnostics.summary?.provesAcceptedDroppedOwnerMapping ?? null,
          provesDirectRendererSlotOrder: roiDiagnostics.summary?.provesDirectRendererSlotOrder ?? null,
          provesCanonicalParity: roiDiagnostics.summary?.provesCanonicalParity ?? null,
        }
      : {
          present: false,
          status: "missing-cross-lane-retail-maxlight-roi-diagnostics",
        },
    missingIsolatedReferenceArtifacts,
    requiredIsolatedReferenceArtifacts: isolatedCrossLaneReferenceArtifacts,
    ownerClassifier: ownerClassifier
      ? {
          version: ownerClassifier.version ?? null,
          status: ownerClassifier.status ?? null,
          evaluated: ownerClassifier.evaluated ?? null,
          canonicalParityPromoted: ownerClassifier.canonicalParityPromoted ?? null,
          summary: ownerClassifier.summary ?? null,
          baseline: ownerClassifier.baseline ?? null,
          missingReferenceArtifacts: ownerClassifier.missingReferenceArtifacts ?? [],
          cases: Array.isArray(ownerClassifier.cases)
            ? ownerClassifier.cases.map((entry) => ({
                caseId: entry.caseId,
                status: entry.status,
                strongCandidate: entry.strongCandidate,
                topLaneCandidate: entry.topLaneCandidate ?? null,
                topScore: entry.topScore ?? null,
                scoreMargin: entry.scoreMargin ?? null,
                targetMaskStats: entry.targetMaskStats ?? null,
                candidates: entry.candidates ?? [],
              }))
            : [],
        }
      : null,
    ablationComparison: roiDiagnostics?.ablationComparison
      ? {
          status: roiDiagnostics.ablationComparison.status ?? null,
          label: roiDiagnostics.ablationComparison.label ?? null,
          summary: roiDiagnostics.ablationComparison.summary ?? null,
          canonicalParityPromoted:
            roiDiagnostics.ablationComparison.canonicalParityPromoted ?? null,
        }
      : null,
    blockedReason: classifierGrade
      ? ownerClassifierEvaluated
        ? "Owner classifier has been evaluated, but it does not provide a direct renderer slot order or complete accepted/dropped owner parity."
        : "Isolated lane references and max-light variants are present, but lane accepted/dropped classification still needs an explicit evaluator."
      : "Max-light variants alone are not classifier-grade because they mix camera/UI/global lighting changes; isolated lane references are required before owner acceptance can be inferred from pixels.",
  };
}

function evaluateShadowvolCampfirePixelMetric() {
  const pixelMetric = comparePngImages(
    "retail-or-toolset-shadowvol-campfire.png",
    "aurora-web-shadowvol-campfire.png",
  );
  const shadowSizeRetailProof = readJsonArtifactIfPresent(
    "retail-shadowsize-shadow-mdl-proof.json",
  );
  const shadowvolProjectionProof = readJsonArtifactIfPresent(
    "retail-shadowvol-projection-proof.json",
  );
  const pixelDiffArtifact = findPixelDiffArtifact("shadowvol-campfire-retail-vs-web-normalized");
  const diffMetric = pixelDiffArtifact.metric ?? null;
  const captureCompatibility = buildShadowvolCaptureCompatibility(
    pixelMetric,
    pixelDiffArtifact,
  );
  const toleranceEvaluation = buildToleranceEvaluation(
    {
      name: "shadow-volume-campfire-footprint-opacity-v1",
      requiresSameViewportOrCalibratedRoi: true,
      maxMeanAbsRgbDelta: 8,
      maxRmsRgbDelta: 18,
      maxChangedSampleRatioGt5: 0.15,
      maxChangedBoundsAreaRatio: 0.35,
      requiresShadowSizeMetadata: true,
      requiresProjectionSourcePath: true,
      note:
        "These thresholds are intentionally strict enough to prevent full-viewport/UI captures from passing as projected receiver parity.",
    },
    [
      booleanCheck(
        "inputDimensionsMatch",
        captureCompatibility.checks.find((check) => check.key === "inputDimensionsMatch")?.actual,
      ),
      booleanCheck("sameViewportOrCalibratedRoiPresent", captureCompatibility.passed),
      booleanCheck("pixelDiffArtifactPresent", pixelDiffArtifact.present === true),
      maxThresholdCheck("meanAbsRgbDelta", diffMetric?.meanAbsRgbDelta ?? pixelMetric.meanAbsRgbDelta, 8),
      maxThresholdCheck("rmsRgbDelta", diffMetric?.rmsRgbDelta ?? pixelMetric.rmsRgbDelta, 18),
      maxThresholdCheck(
        "changedSampleRatioGt5",
        diffMetric?.changedSampleRatioGt5 ?? pixelMetric.changedSampleRatioGt5,
        0.15,
      ),
      maxThresholdCheck("changedBoundsAreaRatio", changedBoundsAreaRatio(diffMetric), 0.35),
      booleanCheck("shadowSizeMetadataPresent", shadowSizeRetailProof?.metadataPassed === true),
      booleanCheck(
        "projectionSourcePathPresent",
        shadowvolProjectionProof?.proofScope?.provesSourceBackedProjectionCasterPath === true,
      ),
    ],
  );
  return {
    status: toleranceEvaluation.passed
      ? "blocked-shadowvol-pixel-tolerance-passed-retail-opacity-state-still-gated"
      : "blocked-shadowvol-pixel-tolerance-evaluated-failed",
    pixelMetric,
    shadowSizeRetailProof: shadowSizeRetailProof
      ? {
          present: true,
          proofStatus: shadowSizeRetailProof.proofStatus ?? null,
          metadataPassed: shadowSizeRetailProof.metadataPassed ?? null,
          canonicalParityPromoted: shadowSizeRetailProof.canonicalParityPromoted ?? null,
          projectionParityStatus: shadowSizeRetailProof.projectionParityStatus ?? null,
          selectionRule: shadowSizeRetailProof.selectionRule ?? null,
          emitterMetadata: shadowSizeRetailProof.emitterMetadata ?? [],
        }
      : {
          present: false,
          proofStatus: "missing-retail-shadowsize-shadow-mdl-proof",
        },
    shadowvolProjectionProof: shadowvolProjectionProof
      ? {
          present: true,
          status: shadowvolProjectionProof.status ?? null,
          proofStatus: shadowvolProjectionProof.proofStatus ?? null,
          canonicalParityPromoted: shadowvolProjectionProof.canonicalParityPromoted ?? null,
          shaderNamesFound: shadowvolProjectionProof.shaderNamesFound ?? [],
          renderBuckets: shadowvolProjectionProof.renderBuckets ?? [],
          sourceAnchors: shadowvolProjectionProof.sourceAnchors ?? null,
          proofScope: shadowvolProjectionProof.proofScope ?? null,
          blockedParityFacts: shadowvolProjectionProof.blockedParityFacts ?? [],
        }
      : {
          present: false,
          status: "missing-retail-shadowvol-projection-proof",
        },
    pixelDiffArtifact,
    captureCompatibility,
    toleranceEvaluation,
    blockedParityFacts: [
      "ShadowSize retail MDL selection is separately source-backed, but it does not prove projected shadow footprint or opacity",
      "Shadow-volume shader/caster/stencil source path can be source-backed while pixel projection parity remains blocked",
      "retail and Aurora Web images have measurable pixel metrics and explicit tolerance checks; the current capture fails those checks",
      captureCompatibility.passed
        ? "retail and Aurora Web captures meet the viewport/ROI compatibility precondition"
        : captureCompatibility.calibratedRoiAttempted
          ? "translation/uniform-scale ROI calibration was attempted and did not produce an accepted same-camera/ROI precondition"
        : "retail capture is full NWN viewport while the Aurora Web input is a local preview artifact or otherwise lacks a calibrated ROI",
    ],
    blocker:
      captureCompatibility.passed
        ? "Shadow-volume footprint/opacity tolerance is now evaluated, but the current retail/web image pair fails pixel-delta checks, so parity remains blocked."
        : captureCompatibility.calibratedRoiAttempted
          ? "Shadow-volume footprint/opacity tolerance cannot promote parity because the translation/uniform-scale ROI calibration attempt is not an accepted same-camera/ROI transform; a same retail viewport capture or stronger calibrated ROI is still required."
        : "Shadow-volume footprint/opacity tolerance cannot promote parity because the current retail/web image pair is not the same viewport and has no calibrated ROI; a new Aurora Web full-viewport capture or explicit ROI transform is required.",
  };
}

function evaluateBlindvisionRetailPixelMutation() {
  const retailMutationMetric = comparePngImages(
    "retail-progfx-blindvision-before.png",
    "retail-progfx-blindvision-active.png",
  );
  const localPreviewName = "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.png";
  const localPreviewPresent = existsSync(resolveInputFile(localPreviewName));
  const localVsRetailMetric = localPreviewPresent
    ? comparePngImages(localPreviewName, "retail-progfx-blindvision-active.png")
    : null;
  const localFrame = readJsonArtifactIfPresent(
    "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.frame.json",
  );
  const domStatus = localFrame?.domStatus ?? {};
  const retailMutationObserved =
    retailMutationMetric.meanAbsRgbDelta > 1 || retailMutationMetric.changedSampleRatioGt5 > 0.01;
  const retailMutationTolerance = buildToleranceEvaluation(
    {
      name: "retail-blindvision-before-active-mutation-v1",
      minMeanAbsRgbDelta: 1,
      minChangedSampleRatioGt5: 0.01,
      note: "This only proves retail mutation exists; it is not local-vs-retail parity.",
    },
    [
      {
        key: "meanAbsRgbDeltaAboveMutationFloor",
        passed: retailMutationMetric.meanAbsRgbDelta >= 1,
        actual: retailMutationMetric.meanAbsRgbDelta,
        min: 1,
      },
      {
        key: "changedSampleRatioGt5AboveMutationFloor",
        passed: retailMutationMetric.changedSampleRatioGt5 >= 0.01,
        actual: retailMutationMetric.changedSampleRatioGt5,
        min: 0.01,
      },
    ],
  );
  const localVsRetailTolerance = buildToleranceEvaluation(
    {
      name: "blindvision-local-vs-retail-active-viewport-v1",
      requiresLocalPreviewPng: localPreviewName,
      requiresSameViewportOrCalibratedRoi: true,
      maxMeanAbsRgbDelta: 10,
      maxChangedSampleRatioGt5: 0.2,
      maxRmsRgbDelta: 25,
      note:
        "The local preview must either share the retail viewport or have a calibrated ROI before Blind_Vision pixel parity can pass.",
    },
    [
      booleanCheck("localPreviewPngPresent", localPreviewPresent),
      booleanCheck(
        "inputDimensionsMatch",
        localVsRetailMetric
          ? localVsRetailMetric.left.width === localVsRetailMetric.right.width &&
              localVsRetailMetric.left.height === localVsRetailMetric.right.height
          : false,
      ),
      maxThresholdCheck("meanAbsRgbDelta", localVsRetailMetric?.meanAbsRgbDelta ?? Number.POSITIVE_INFINITY, 10),
      maxThresholdCheck(
        "changedSampleRatioGt5",
        localVsRetailMetric?.changedSampleRatioGt5 ?? Number.POSITIVE_INFINITY,
        0.2,
      ),
      maxThresholdCheck("rmsRgbDelta", localVsRetailMetric?.rmsRgbDelta ?? Number.POSITIVE_INFINITY, 25),
      booleanCheck("localFrameIsNotRetailEvidence", localFrame?.localOnlyNotRetailEvidence === true, true),
    ],
  );
  return {
    status: !retailMutationObserved
      ? "blocked-retail-blindvision-pixel-mutation-not-detected"
      : localVsRetailTolerance.passed
        ? "blocked-retail-blindvision-local-tolerance-passed-owner-phase-still-gated"
        : "blocked-retail-blindvision-local-tolerance-evaluated-failed",
    retailMutationObserved,
    retailMutationMetric,
    retailMutationTolerance,
    localVsRetailMetric,
    localVsRetailTolerance,
    localFrameStatus: {
      framePresent: localFrame !== null,
      localPreviewPngPresent: localPreviewPresent,
      localPreviewPng: localPreviewPresent ? localPreviewName : null,
      progFxType4RowId: domStatus.progFxType4RowId ?? null,
      progFxType4Label: domStatus.progFxType4Label ?? null,
      progFxType4Animation: domStatus.progFxType4Animation ?? null,
      progFxType4VisionMutationPolicyStatus:
        domStatus.progFxType4VisionMutationPolicyStatus ?? null,
      canonicalParityPromoted: localFrame?.canonicalParityPromoted ?? null,
      localOnlyNotRetailEvidence: localFrame?.localOnlyNotRetailEvidence ?? null,
    },
    pixelDiffArtifact: findPixelDiffArtifact("blindvision-retail-before-active"),
    blockedParityFacts: [
      "retail before/active pixel mutation is measured and mutation thresholds are explicit",
      "local-vs-retail viewport tolerance is evaluated and currently fails",
      "Aurora Web frame is a source-backed local diagnostic and is explicitly not retail evidence",
    ],
    blocker:
      "Retail BlindVision mutation is present, but the local preview and retail capture do not satisfy the viewport/tolerance checks required for parity.",
  };
}

function hasStateClaim(webTrace, claim) {
  return Array.isArray(webTrace.stateClaims) && webTrace.stateClaims.includes(claim);
}

function evaluateShadowvolStateOrder() {
  const retailTrace = readJsonArtifact("retail-shadowvol-state-trace.json");
  const webTrace = readJsonArtifact("aurora-web-shadowvol-state-trace.json");
  const checks = [
    {
      key: "stencilSequence",
      passed:
        retailTrace.trace?.stencil?.proofStatus ===
          "source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped" &&
        hasStateClaim(
          webTrace,
          "web-preview-uses-retail-mapped-front-back-zpass-zfail-stencil-sequence"
        ),
      retailValue: retailTrace.trace?.stencil?.proofStatus ?? null,
      webValue: webTrace.stateClaims ?? [],
    },
    {
      key: "renderStateSlot3",
      passed:
        retailTrace.trace?.renderStateSlot3?.slotCapabilityStatus ===
          "source-backed-toolset-binary-slot-3-gl-cull-face" &&
        hasStateClaim(webTrace, "web-preview-exposes-local-shadowvol-render-state-order"),
      retailValue: retailTrace.trace?.renderStateSlot3?.slotCapabilityStatus ?? null,
      webValue: webTrace.stateClaims ?? [],
    },
    {
      key: "localDrawOrder",
      passed:
        Array.isArray(retailTrace.trace?.localDrawOrder?.expectedCallSequence) &&
        retailTrace.trace.localDrawOrder.expectedCallSequence.length > 0 &&
        hasStateClaim(webTrace, "web-preview-exposes-local-shadowvol-render-state-order"),
      retailValue: retailTrace.trace?.localDrawOrder?.expectedCallSequence ?? [],
      webValue: webTrace.stateClaims ?? [],
    },
    {
      key: "activeLightEnvelope",
      passed:
        retailTrace.trace?.activeLightEnvelope?.proofStatus ===
          "source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked" &&
        hasStateClaim(
          webTrace,
          "web-preview-exposes-active-light-render-envelope-depthfunc-blendfunc-state"
        ),
      retailValue: retailTrace.trace?.activeLightEnvelope?.proofStatus ?? null,
      webValue: webTrace.stateClaims ?? [],
    },
  ];
  const stateOrderSourceParityPassed = checks.every((check) => check.passed);
  return {
    status: stateOrderSourceParityPassed
      ? "blocked-source-state-order-parity-evaluated-pixel-opacity-parity-blocked"
      : "blocked-source-state-order-mismatch",
    stateOrderSourceParityPassed,
    checks,
    blockedParityFacts: [
      "exact retail/toolset shadow-volume pixels",
      "projected receiver footprint and opacity tolerance",
      "inherited blend/depth/color-mask state outside the recovered source windows",
    ],
    blocker: stateOrderSourceParityPassed
      ? "Source-backed state-order signals agree between the retail trace and Aurora Web trace, but full retail parity is not promoted until pixel, opacity, and inherited render-state tolerance checks pass."
      : "Retail and Aurora Web source-state traces do not agree, so state-order parity remains blocked before pixel comparison.",
  };
}

function splitLaneList(value) {
  return String(value ?? "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function numberFromDomStatus(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isBackedFamilyStatus(value) {
  return (
    String(value ?? "").startsWith("source-") ||
    String(value ?? "").startsWith("retail-binary-") ||
    String(value ?? "").startsWith("retail-table-")
  );
}

function buildCrossLaneRetailOrderingPromotionGate({
  localSourceFamilyCoveragePassed,
  activeSlotOracle,
  retailMaxLightVariantClassifier,
  ownerPathChecks,
  callgraph,
}) {
  const sourceBackedActiveSlotAlgorithm = String(
    callgraph?.activeSlotAlgorithmEvidence?.proofStatus ?? "",
  ).startsWith("source-backed-");
  const acceptedDroppedOwnerMapping =
    retailMaxLightVariantClassifier?.roiDiagnostics?.provesAcceptedDroppedOwnerMapping === true ||
    retailMaxLightVariantClassifier?.ownerClassifier?.summary?.provesAcceptedDroppedOwnerMapping === true;
  const allRequiredLaneOwnerPathsRecovered =
    ownerPathChecks.length > 0 &&
    ownerPathChecks.every(
      (check) =>
        typeof check.lightManagerOwnerPath === "string" &&
        check.lightManagerOwnerPath !== "not-recovered" &&
        check.lightManagerOwnerPath !== "unknown",
    );
  const promotionAllowed =
    sourceBackedActiveSlotAlgorithm &&
    localSourceFamilyCoveragePassed &&
    (activeSlotOracle.directRendererSlotOrderObserved === true ||
      acceptedDroppedOwnerMapping === true);
  return {
    status: promotionAllowed
      ? "retail-ordering-promotion-allowed"
      : "blocked-direct-slot-order-and-accepted-dropped-owner-map-missing",
    promotionAllowed,
    acceptedDroppedOwnerMappingProven: acceptedDroppedOwnerMapping,
    allRequiredLaneOwnerPathsRecovered,
    checks: [
      {
        key: "sourceBackedActiveSlotAlgorithm",
        passed: sourceBackedActiveSlotAlgorithm,
        requiredFor: "score/cap/sort/radius rule baseline",
      },
      {
        key: "localRequiredLaneCoverage",
        passed: localSourceFamilyCoveragePassed,
        requiredFor: "Aurora Web probe coverage only",
      },
      {
        key: "directRetailActiveSlotDump",
        passed: activeSlotOracle.directRetailSlotDumpAvailable === true,
        requiredFor: "direct retail accepted/dropped slot evidence",
      },
      {
        key: "directRendererSlotOrder",
        passed: activeSlotOracle.directRendererSlotOrderObserved === true,
        requiredFor: "retail ordering promotion path",
      },
      {
        key: "acceptedDroppedOwnerMapping",
        passed: acceptedDroppedOwnerMapping,
        requiredFor: "classifier/oracle promotion path",
      },
      {
        key: "allRequiredLaneOwnerPathsRecovered",
        passed: allRequiredLaneOwnerPathsRecovered,
        requiredFor: "data-flow promotion path",
      },
    ],
    rule:
      "Do not promote Aurora Web local budget order as retail cross-lane owner precedence unless directRendererSlotOrder is observed or a complete accepted/dropped owner mapping is proven.",
  };
}

function evaluateCrossLaneSourceFamilyCoverage(missingInputs) {
  const webFrame = readJsonArtifactIfPresent("aurora-web-cross-lane-all-lanes.frame.json");
  const callgraph = readJsonArtifactIfPresent("lightmanager-lane-owner-callgraph.json");
  const activeSlots = readJsonArtifactIfPresent("retail-cross-lane-active-slots.json");
  const domStatus = webFrame?.domStatus ?? {};
  const acceptedPointLanes = splitLaneList(
    domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes
  );
  const nonPointRequestSampleCount = numberFromDomStatus(
    domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount
  );
  const observedRuntimeLanes = new Set(acceptedPointLanes);
  if (nonPointRequestSampleCount > 0) {
    observedRuntimeLanes.add("progfx-type4-light-or-vision");
  }
  const requiredRuntimeLanes = [
    "terrain-tile-light",
    "placeables-2da-light",
    "source-mdl-light-node",
    "item-property-light",
    "progfx-type4-light-or-vision",
  ];
  const runtimeLaneChecks = requiredRuntimeLanes.map((lane) => ({
    lane,
    passed: observedRuntimeLanes.has(lane),
  }));
  const sourceFamilyEvidence = Array.isArray(callgraph?.sourceFamilyEvidence)
    ? callgraph.sourceFamilyEvidence
    : [];
  const sourceFamilyByLane = new Map(sourceFamilyEvidence.map((entry) => [entry.lane, entry]));
  const requiredSourceFamilyLanes = [
    "terrain-tile-main-light",
    "terrain-tile-source-light",
    "placeables-2da-light",
    "mdl-source-light-node",
    "item-property-light",
    "progfx-type4-light-or-vision",
  ];
  const sourceFamilyChecks = requiredSourceFamilyLanes.map((lane) => {
    const evidence = sourceFamilyByLane.get(lane);
    return {
      lane,
      status: evidence?.status ?? "missing",
      proofStatus: evidence?.proofStatus ?? "missing",
      passed: isBackedFamilyStatus(evidence?.status) || isBackedFamilyStatus(evidence?.proofStatus),
    };
  });
  const ownerPathChecks = (callgraph?.requiredLaneOwners ?? []).map((owner) => ({
    lane: owner.lane,
    lightManagerOwnerPath: owner.lightManagerOwnerPath ?? "unknown",
    blockedAsExpected: owner.lightManagerOwnerPath === "not-recovered",
  }));
  const runtimeLaneCoveragePassed = runtimeLaneChecks.every((check) => check.passed);
  const sourceFamilyCoveragePassed = sourceFamilyChecks.every((check) => check.passed);
  const ownerPathsStillBlocked =
    ownerPathChecks.length > 0 && ownerPathChecks.every((check) => check.blockedAsExpected);
  const localSourceFamilyCoveragePassed =
    runtimeLaneCoveragePassed && sourceFamilyCoveragePassed && ownerPathsStillBlocked;
  const activeSlotOracle = {
    present: activeSlots !== null,
    directRetailSlotDumpAvailable: activeSlots?.directRetailSlotDumpAvailable === true,
    directRendererSlotOrderObserved: activeSlots?.directRendererSlotOrderObserved === true,
    slotOrderingProofStatus: activeSlots?.slotOrderingProofStatus ?? "missing",
    observationKind: activeSlots?.observationKind ?? null,
    acceptedSlotCount: Array.isArray(activeSlots?.acceptedSlots) ? activeSlots.acceptedSlots.length : null,
    droppedSlotCount: Array.isArray(activeSlots?.droppedSlots) ? activeSlots.droppedSlots.length : null,
    runtimePixelEvidencePresent: activeSlots?.observations?.runtimePixelEvidencePresent ?? null,
    runtimeLogCuePresent: activeSlots?.observations?.runtimeLogCuePresent ?? null,
    runtimeLogCueSource: activeSlots?.observations?.runtimeLogCueSource ?? null,
    liveLogCueStatus: activeSlots?.observations?.logEvidence?.status ?? null,
    durableCaptureCueStatus:
      activeSlots?.observations?.durableCaptureCueEvidence?.status ?? null,
    durableCaptureCueCount: Array.isArray(
      activeSlots?.observations?.durableCaptureCueEvidence?.cues,
    )
      ? activeSlots.observations.durableCaptureCueEvidence.cues.length
      : null,
  };
  const retailMaxLightVariantClassifier = evaluateCrossLaneMaxLightVariantClassifier();
  const retailOrderingPromotionGate = buildCrossLaneRetailOrderingPromotionGate({
    localSourceFamilyCoveragePassed,
    activeSlotOracle,
    retailMaxLightVariantClassifier,
    ownerPathChecks,
    callgraph,
  });
  const pixelDiffArtifact = findPixelDiffArtifact("cross-lane-budget-retail-before-after");
  const retailPixelInputsMissing = missingInputs.filter(
    (name) =>
      name === "retail-cross-lane-all-lanes-before-budget.png" ||
      name === "retail-cross-lane-all-lanes-after-budget.png",
  );
  const retailPrecedenceInputsPresent =
    retailPixelInputsMissing.length === 0 && activeSlotOracle.present;
  const directRetailPrecedenceReady =
    retailPrecedenceInputsPresent &&
    activeSlotOracle.directRetailSlotDumpAvailable &&
    activeSlotOracle.directRendererSlotOrderObserved;
  const blockedParityFacts = [];
  if (retailPixelInputsMissing.length > 0) {
    blockedParityFacts.push("retail before/after constrained-budget screenshots are still missing");
  }
  if (!activeSlotOracle.present) {
    blockedParityFacts.push("retail-cross-lane-active-slots.json is still missing");
  } else if (!directRetailPrecedenceReady) {
    blockedParityFacts.push(
      "retail-cross-lane-active-slots.json is observational only and does not contain a direct renderer active-slot order",
    );
  }
  if (ownerPathsStillBlocked) {
    blockedParityFacts.push(
      "local Aurora Web lane coverage does not prove retail LightManager owner precedence",
    );
  }
  if (retailMaxLightVariantClassifier.present && !retailMaxLightVariantClassifier.classifierGrade) {
    blockedParityFacts.push(
      "retail max-light variant pixels exist but are not classifier-grade until isolated lane-reference captures are present",
    );
  }
  if (
    retailMaxLightVariantClassifier.ownerClassifierEvaluated &&
    !retailMaxLightVariantClassifier.partialOwnerCandidates
  ) {
    blockedParityFacts.push(
      "retail max-light owner classifier was evaluated but did not produce strong accepted/dropped lane candidates",
    );
  }
  if (retailMaxLightVariantClassifier.partialOwnerCandidates) {
    blockedParityFacts.push(
      "retail max-light owner classifier produced partial candidates, but partial candidates are not a direct renderer slot order",
    );
  }
  if (!retailOrderingPromotionGate.promotionAllowed) {
    blockedParityFacts.push(
      "retail ordering promotion gate is blocked because neither direct renderer slot order nor a complete accepted/dropped owner map is proven",
    );
  }
  const status = !localSourceFamilyCoveragePassed
    ? "blocked-local-source-family-coverage-incomplete"
    : directRetailPrecedenceReady
      ? "blocked-retail-active-slot-order-compare-not-implemented"
      : retailPrecedenceInputsPresent && retailMaxLightVariantClassifier.ownerClassifierEvaluated
        ? retailMaxLightVariantClassifier.partialOwnerCandidates
          ? "blocked-retail-active-slot-order-classifier-partial-direct-order-missing"
          : "blocked-retail-active-slot-order-classifier-ambiguous-direct-order-missing"
      : retailPrecedenceInputsPresent
        ? "blocked-retail-active-slot-order-observation-not-direct"
        : "blocked-local-source-family-coverage-evaluated-retail-precedence-missing";
  return {
    status,
    localSourceFamilyCoveragePassed,
    runtimeLaneCoveragePassed,
    sourceFamilyCoveragePassed,
    ownerPathsStillBlocked,
    activeSlotOracle,
    retailMaxLightVariantClassifier,
    retailOrderingPromotionGate,
    proofScope: {
      provesLocalRequiredLaneCoverage: localSourceFamilyCoveragePassed,
      provesSourceBackedActiveSlotAlgorithm:
        retailOrderingPromotionGate.checks.find(
          (check) => check.key === "sourceBackedActiveSlotAlgorithm",
        )?.passed === true,
      provesDirectRetailActiveSlotDump:
        activeSlotOracle.directRetailSlotDumpAvailable === true,
      provesDirectRendererSlotOrder:
        activeSlotOracle.directRendererSlotOrderObserved === true,
      provesAcceptedDroppedOwnerMapping:
        retailOrderingPromotionGate.acceptedDroppedOwnerMappingProven,
      provesAllRequiredLaneOwnerPathsRecovered:
        retailOrderingPromotionGate.allRequiredLaneOwnerPathsRecovered,
      permitsRetailOrderingPromotion:
        retailOrderingPromotionGate.promotionAllowed,
      provesRetailCrossLaneOwnerPrecedence: false,
      provesCanonicalParity: false,
    },
    pixelDiffArtifact,
    missingRetailOrToolsetInputs: missingInputs.filter((name) => name.startsWith("retail-")),
    localInputs: {
      webFramePresent: webFrame !== null,
      lightmanagerCallgraphPresent: callgraph !== null,
      runtimeProbeStatus:
        domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeStatus ?? null,
      runtimeRequiredLaneCoverageCount:
        domStatus.fixtureScenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount ?? null,
      pointLightSampleCount:
        domStatus.fixtureScenePointLightRetailOrderingRuntimeProbePointLightSampleCount ?? null,
      nonPointRequestSampleCount,
    },
    runtimeLaneChecks,
    sourceFamilyChecks,
    ownerPathChecks,
    blockedParityFacts,
    blocker: !localSourceFamilyCoveragePassed
      ? "Local source-family or runtime lane coverage is incomplete, so the cross-lane comparison remains blocked before retail precedence can be evaluated."
      : directRetailPrecedenceReady
        ? "Retail active-slot dump exists, but this compare script still needs an accepted/dropped lane evaluator before parity can be promoted."
        : retailPrecedenceInputsPresent && retailMaxLightVariantClassifier.ownerClassifierEvaluated
          ? "Retail before/after pixels, isolated references, and the owner classifier have been evaluated; direct renderer slot order is still missing and classifier output is not promoted as canonical parity."
        : retailPrecedenceInputsPresent
          ? "Retail before/after pixels and a structured active-slot observation exist, but the observation explicitly lacks a direct renderer slot order, so cross-lane precedence remains blocked."
          : "Aurora Web local runtime covers the required lane families and the LightManager callgraph carries 6/6 source-family evidence, but retail cross-lane precedence is still blocked until retail active-slot and before/after budget captures exist.",
  };
}

function describeInput(name) {
  const path = artifactPath(name);
  if (!existsSync(path)) {
    return {
      name,
      status: "missing",
    };
  }
  const stats = statSync(path);
  return {
    name,
    status: "present",
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  };
}

const options = parseArgs(process.argv.slice(2));
const repoRoot = resolve(options.repoRoot);
const artifactDir = toAbsolute(repoRoot, options.artifactDir);
mkdirSync(artifactDir, { recursive: true });

const written = [];
for (const report of compareReports) {
  const inputs = report.requiredInputs.map(describeInput);
  const missingInputs = inputs.filter((input) => input.status === "missing").map((input) => input.name);
  const evaluation =
    missingInputs.length === 0 && report.evaluator === "shadowvol-state-order"
      ? evaluateShadowvolStateOrder()
      : missingInputs.length === 0 && report.evaluator === "shadowvol-campfire-pixel-metric"
        ? evaluateShadowvolCampfirePixelMetric()
      : missingInputs.length === 0 && report.evaluator === "blindvision-retail-pixel-mutation"
        ? evaluateBlindvisionRetailPixelMutation()
      : report.evaluator === "cross-lane-source-family-coverage"
        ? evaluateCrossLaneSourceFamilyCoverage(missingInputs)
      : null;
  const output = {
    version: "aurora-area-lighting-retail-compare/v1",
    generatedAt: new Date().toISOString(),
    caseId: report.caseId,
    status:
      evaluation?.status ??
      (missingInputs.length > 0
        ? "blocked-missing-retail-or-toolset-input"
        : "blocked-explicit-retail-tolerance-not-evaluated"),
    passed: false,
    canonicalParityPromoted: false,
    acceptanceGate: report.acceptanceGate,
    inputs,
    missingInputs,
    ...(evaluation
      ? {
          stateOrderSourceParityPassed: evaluation.stateOrderSourceParityPassed,
          localSourceFamilyCoveragePassed: evaluation.localSourceFamilyCoveragePassed,
          runtimeLaneCoveragePassed: evaluation.runtimeLaneCoveragePassed,
          sourceFamilyCoveragePassed: evaluation.sourceFamilyCoveragePassed,
          ownerPathsStillBlocked: evaluation.ownerPathsStillBlocked,
          activeSlotOracle: evaluation.activeSlotOracle,
          retailMaxLightVariantClassifier: evaluation.retailMaxLightVariantClassifier,
          retailOrderingPromotionGate: evaluation.retailOrderingPromotionGate,
          proofScope: evaluation.proofScope,
          pixelDiffArtifact: evaluation.pixelDiffArtifact,
          shadowSizeRetailProof: evaluation.shadowSizeRetailProof,
          shadowvolProjectionProof: evaluation.shadowvolProjectionProof,
          pixelMetric: evaluation.pixelMetric,
          captureCompatibility: evaluation.captureCompatibility,
          toleranceEvaluation: evaluation.toleranceEvaluation,
          retailMutationObserved: evaluation.retailMutationObserved,
          retailMutationMetric: evaluation.retailMutationMetric,
          retailMutationTolerance: evaluation.retailMutationTolerance,
          localVsRetailMetric: evaluation.localVsRetailMetric,
          localVsRetailTolerance: evaluation.localVsRetailTolerance,
          localFrameStatus: evaluation.localFrameStatus,
          localInputs: evaluation.localInputs,
          checks: evaluation.checks,
          runtimeLaneChecks: evaluation.runtimeLaneChecks,
          sourceFamilyChecks: evaluation.sourceFamilyChecks,
          ownerPathChecks: evaluation.ownerPathChecks,
          missingRetailOrToolsetInputs: evaluation.missingRetailOrToolsetInputs,
          blockedParityFacts: evaluation.blockedParityFacts,
        }
      : {}),
    blocker:
      evaluation?.blocker ??
      (missingInputs.length > 0
        ? "Retail/toolset input artifacts are missing, so this comparison cannot promote parity."
        : "Inputs exist, but no tolerance evaluator has promoted this comparison."),
  };
  writeFileSync(artifactPath(report.output), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  written.push({
    output: report.output,
    caseId: report.caseId,
    missingInputs,
  });
}

console.log(
  JSON.stringify(
    {
      status: "blocked-compare-reports-written",
      outputs: written,
    },
    null,
    2,
  ),
);
