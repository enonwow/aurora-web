#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";
const DEFAULT_SOURCE_AUDIT = "audit-retail-progfx-type4-table-2026-07-03.json";
const DEFAULT_DECOMPILATION_ROOT =
  process.env.AURORA_DECOMPILATION_ROOT ?? "C:/Projects/New Folder";
const DEFAULT_CUSTOM_PROGFX_ZERO_OVERRIDE_MANIFEST =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/custom-progfx-param4-zero-override/custom-progfx-param4-zero-override-manifest.json";
const DEFAULT_PRIORITY_DRIVER_SCRIPT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/generated-scripts/als_pfxpri.nss";
const DEFAULT_PROXIMITY_DRIVER_SCRIPT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/generated-scripts/als_pfxprox.nss";
const DEFAULT_MODULE_INJECTION_SUMMARY =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/compiled-driver-module-injection-summary.json";

const RETAIL_PIXEL_REGIONS = {
  viewport: { x: 8, y: 33, width: 1182, height: 695 },
  vfxCenter: { x: 680, y: 250, width: 170, height: 160 },
  campfire: { x: 540, y: 340, width: 170, height: 130 },
  lamp: { x: 800, y: 40, width: 160, height: 170 },
  floorRight: { x: 820, y: 250, width: 220, height: 250 },
  chat: { x: 8, y: 728, width: 752, height: 110 },
};

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    sourceAudit: DEFAULT_SOURCE_AUDIT,
    decompilationRoot: DEFAULT_DECOMPILATION_ROOT,
    customProgFxZeroOverrideManifest: DEFAULT_CUSTOM_PROGFX_ZERO_OVERRIDE_MANIFEST,
    priorityDriverScript: DEFAULT_PRIORITY_DRIVER_SCRIPT,
    proximityDriverScript: DEFAULT_PROXIMITY_DRIVER_SCRIPT,
    moduleInjectionSummary: DEFAULT_MODULE_INJECTION_SUMMARY,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--artifactDir") {
      index += 1;
      options.artifactDir = requireValue(arg, argv[index]);
    } else if (arg === "--sourceAudit") {
      index += 1;
      options.sourceAudit = requireValue(arg, argv[index]);
    } else if (arg === "--decompilationRoot") {
      index += 1;
      options.decompilationRoot = requireValue(arg, argv[index]);
    } else if (arg === "--customProgFxZeroOverrideManifest") {
      index += 1;
      options.customProgFxZeroOverrideManifest = requireValue(arg, argv[index]);
    } else if (arg === "--priorityDriverScript") {
      index += 1;
      options.priorityDriverScript = requireValue(arg, argv[index]);
    } else if (arg === "--proximityDriverScript") {
      index += 1;
      options.proximityDriverScript = requireValue(arg, argv[index]);
    } else if (arg === "--moduleInjectionSummary") {
      index += 1;
      options.moduleInjectionSummary = requireValue(arg, argv[index]);
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
  console.log(`Usage: node scripts/create-retail-progfx-type4-policy-artifacts.mjs [options]

Options:
  --repoRoot <path>       Repository root. Defaults to aurora-web root.
  --artifactDir <path>    Artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
  --sourceAudit <name>    Source retail table audit JSON. Defaults to ${DEFAULT_SOURCE_AUDIT}
  --decompilationRoot <path>
                          Optional Aurora decompilation root. Defaults to ${DEFAULT_DECOMPILATION_ROOT}
  --customProgFxZeroOverrideManifest <path>
                          Optional custom Param4=0 override manifest.
  --priorityDriverScript <path>
                          Optional retail priority oracle driver script.
  --proximityDriverScript <path>
                          Optional retail proximity oracle driver script.
  --moduleInjectionSummary <path>
                          Optional compiled oracle module injection summary.
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function readJson(path) {
  const buffer = readFileSync(path);
  const text =
    buffer[0] === 0xff && buffer[1] === 0xfe
      ? buffer.toString("utf16le")
      : buffer.includes(0)
        ? buffer.toString("utf16le")
        : buffer.toString("utf8");
  return JSON.parse(text.replace(/^\uFEFF/u, ""));
}

function describeFile(repoRoot, path) {
  const stats = statSync(path);
  return {
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  };
}

function describeOptionalArtifact(repoRoot, artifactDir, name) {
  const path = resolve(artifactDir, name);
  if (!existsSync(path)) {
    return {
      name,
      status: "missing",
    };
  }
  return {
    name,
    status: "present",
    ...describeFile(repoRoot, path),
  };
}

function readOptionalJsonPath(repoRoot, inputPath) {
  const path = toAbsolute(repoRoot, inputPath);
  if (!existsSync(path)) {
    return {
      present: false,
      path: toRepoRelative(repoRoot, path),
      status: "missing",
    };
  }
  const manifest = readJson(path);
  return {
    present: true,
    path: toRepoRelative(repoRoot, path),
    status: manifest.status ?? "unknown",
    prepared:
      manifest.status === "custom-param4-zero-override-pack-prepared-not-stock-retail-parity" &&
      manifest.customOverrideRequired === true &&
      manifest.installsOverrideFiles === false &&
      manifest.canonicalParityPromoted === false,
    canonicalParityPromoted: manifest.canonicalParityPromoted ?? null,
    installsOverrideFiles: manifest.installsOverrideFiles ?? null,
    customRows: manifest.customRows ?? null,
    outputs: manifest.outputs ?? null,
  };
}

function readOptionalJsonFile(repoRoot, inputPath) {
  const path = toAbsolute(repoRoot, inputPath);
  if (!existsSync(path)) {
    return {
      present: false,
      path: toRepoRelative(repoRoot, path),
      status: "missing",
      json: null,
    };
  }
  return {
    present: true,
    path: toRepoRelative(repoRoot, path),
    status: "present",
    json: readJson(path),
  };
}

function allPresent(artifacts) {
  return artifacts.every((artifact) => artifact.status === "present");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function pickRows(rows, predicate, limit = 24) {
  return asArray(rows).filter(predicate).slice(0, limit);
}

function uniqueRowsByKey(rows, keyFn) {
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const key = keyFn(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(row);
  }
  return result;
}

function countObjectValue(object, key) {
  const value = object?.[key];
  return typeof value === "number" ? value : 0;
}

function artifactPath(artifactDir, name) {
  return resolve(artifactDir, name);
}

function findFirstLine(path, needle) {
  if (!existsSync(path)) {
    return {
      status: "missing",
      path,
      lineNumber: null,
      text: null,
    };
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/u);
  const index = lines.findIndex((line) => line.includes(needle));
  return {
    status: index >= 0 ? "found" : "not-found",
    path,
    lineNumber: index >= 0 ? index + 1 : null,
    text: index >= 0 ? lines[index].trim() : null,
  };
}

function lineEvidence(path, needle) {
  const result = findFirstLine(path, needle);
  return {
    needle,
    status: result.status,
    lineNumber: result.lineNumber,
    text: result.text,
  };
}

function buildPriorityDriverEvidence(repoRoot, inputPath) {
  const path = toAbsolute(repoRoot, inputPath);
  const blueApply = lineEvidence(
    path,
    "DelayCommand(1.0, AlsApplyVfxRow(VFX_DUR_LIGHT_BLUE_5, 8.0))",
  );
  const yellowApply = lineEvidence(
    path,
    "DelayCommand(1.0, AlsApplyVfxRow(VFX_DUR_LIGHT_YELLOW_5, 8.0))",
  );
  const captureAfter = lineEvidence(
    path,
    'DelayCommand(2.0, AlsCaptureCue("retail-progfx-priority-policy-after.png"))',
  );
  const sameTimestampBlueYellowRequests =
    blueApply.status === "found" &&
    yellowApply.status === "found" &&
    blueApply.text?.includes("DelayCommand(1.0") === true &&
    yellowApply.text?.includes("DelayCommand(1.0") === true;
  return {
    path: toRepoRelative(repoRoot, path),
    present: existsSync(path),
    blueApply,
    yellowApply,
    captureAfter,
    sameTimestampBlueYellowRequests,
    blueBeforeYellowInScript:
      sameTimestampBlueYellowRequests &&
      typeof blueApply.lineNumber === "number" &&
      typeof yellowApply.lineNumber === "number"
        ? blueApply.lineNumber < yellowApply.lineNumber
        : null,
    canonicalParityPromoted: false,
  };
}

function extractStageLocation(line) {
  const match = line?.match(/AlsStageLocation\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/u);
  if (!match) {
    return null;
  }
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    z: Number(match[3]),
    facing: Number(match[4]),
  };
}

function planarDistance(left, right) {
  if (!left || !right) {
    return null;
  }
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function buildProximityTargetFixtureEvidence(repoRoot, inputPath) {
  const summaryFile = readOptionalJsonFile(repoRoot, inputPath);
  const summary = summaryFile.json ?? {};
  const moduleStart = summary.runtimeAutostart?.moduleStartLocation?.next ?? null;
  const gitCreatureNext =
    summary.stageArea?.runtimeListsPruned?.git?.["Creature List"]?.nextCount ?? null;
  const gicCreatureNext =
    summary.stageArea?.runtimeListsPruned?.gic?.["Creature List"]?.nextCount ?? null;
  const namedTargetPruned = gitCreatureNext === 0 && gicCreatureNext === 0;
  const nearLocation =
    namedTargetPruned && moduleStart
      ? {
          x: Number(moduleStart.x),
          y: Number(moduleStart.y),
          z: Number(moduleStart.z ?? 0),
          facing: null,
        }
      : null;
  return {
    summaryFile: {
      path: summaryFile.path,
      present: summaryFile.present,
      status: summaryFile.status,
    },
    status:
      namedTargetPruned && nearLocation
        ? "fixture-prunes-named-targets-als-target-falls-back-to-first-pc-start"
        : summaryFile.present
          ? "blocked-fixture-target-start-location-not-derived"
          : "missing-module-injection-summary",
    namedTargetPruned,
    gitCreatureNext,
    gicCreatureNext,
    moduleStart,
    nearLocation,
    targetResolution:
      namedTargetPruned && nearLocation
        ? "AlsTarget() has no effect_test/CombatDummy creature in the pruned oracle stage, so near uses GetFirstPC() at the module start location."
        : "AlsTarget() start position is not derived from the available fixture summary.",
    canonicalParityPromoted: false,
  };
}

function buildProximityDriverEvidence(repoRoot, inputPath, targetFixtureEvidence) {
  const path = toAbsolute(repoRoot, inputPath);
  const vfxApply = lineEvidence(path, "AlsApplyVfxRow(VFX_DUR_DARKVISION, 18.0)");
  const nearCapture = lineEvidence(
    path,
    'AlsCaptureCue("retail-progfx-proximity-distance-sweep-contact-sheet.png sample=near")',
  );
  const midJump = lineEvidence(path, "JumpToLocation(AlsStageLocation(75.0, 65.0, 0.0, 0.0))");
  const midCapture = lineEvidence(
    path,
    'AlsCaptureCue("retail-progfx-proximity-distance-sweep-contact-sheet.png sample=mid")',
  );
  const farJump = lineEvidence(path, "JumpToLocation(AlsStageLocation(85.0, 65.0, 0.0, 0.0))");
  const farCapture = lineEvidence(
    path,
    'AlsCaptureCue("retail-progfx-proximity-distance-sweep-contact-sheet.png sample=far")',
  );
  const midLocation = extractStageLocation(midJump.text);
  const farLocation = extractStageLocation(farJump.text);
  const nearLocation = targetFixtureEvidence?.nearLocation ?? null;
  const stageReference = {
    status: "shared-light-oracle-stage-coordinate-reference",
    x: 65,
    y: 65,
    z: 0,
    source: "same light oracle stage uses campfire/tile placement at AlsStageLocation(65.0, 65.0, 0.0, 0.0); this is a coordinate reference, not proof of the participating proximity source lane",
  };
  const nearDistanceFromStageReference = planarDistance(stageReference, nearLocation);
  const midDistanceFromStageReference = planarDistance(stageReference, midLocation);
  const farDistanceFromStageReference = planarDistance(stageReference, farLocation);
  const midFarSampleDelta = planarDistance(midLocation, farLocation);
  const sampleDistanceEvidence =
    Number.isFinite(midDistanceFromStageReference) && Number.isFinite(farDistanceFromStageReference)
      ? {
          nearDistanceFromStageReferenceAuroraUnits: Number.isFinite(nearDistanceFromStageReference)
            ? nearDistanceFromStageReference
            : null,
          midRestoredDistanceFromStageReferenceAuroraUnits: midDistanceFromStageReference,
          farActiveDistanceFromStageReferenceAuroraUnits: farDistanceFromStageReference,
          unit: "aurora-stage-xy-units",
          interpretation:
            "pixel classifier shows the Type 4 light reduced at near and restored by mid/far; these are scripted sample positions relative to a stage coordinate reference, not the recovered participating proximity source lane or an exact threshold",
        }
      : null;
  return {
    path: toRepoRelative(repoRoot, path),
    present: existsSync(path),
    vfxApply,
    nearCapture,
    midJump,
    midCapture,
    farJump,
    farCapture,
    samples: {
      near: {
        status:
          nearCapture.status === "found" && nearLocation
            ? "fixture-start-location"
            : nearCapture.status === "found"
              ? "captured-before-explicit-jump"
              : "missing",
        location: nearLocation,
        note:
          nearCapture.status === "found" && nearLocation
            ? targetFixtureEvidence.targetResolution
            : nearCapture.status === "found"
            ? "near uses the existing AlsTarget() start location; this driver does not encode an absolute start coordinate"
            : null,
        distanceFromStageReferenceAuroraUnits: Number.isFinite(nearDistanceFromStageReference)
          ? nearDistanceFromStageReference
          : null,
      },
      mid: {
        status: midLocation ? "explicit-stage-location" : "missing-explicit-stage-location",
        captureStatus: midCapture.status,
        location: midLocation,
        distanceFromStageReferenceAuroraUnits: midDistanceFromStageReference,
      },
      far: {
        status: farLocation ? "explicit-stage-location" : "missing-explicit-stage-location",
        captureStatus: farCapture.status,
        location: farLocation,
        distanceFromStageReferenceAuroraUnits: farDistanceFromStageReference,
      },
    },
    stageReference,
    targetFixtureEvidence,
    midFarSampleDeltaAuroraUnits: midFarSampleDelta,
    sampleDistanceEvidence,
    canonicalParityPromoted: false,
  };
}

function buildEqualPriorityTieCandidate(priorityTableEvidence, pixelClassification, priorityDriverEvidence) {
  const priority20HasTie =
    Number(priorityTableEvidence.priorityRawCounts?.["20"] ?? 0) >= 2;
  const afterType4Signal = pixelClassification?.afterType4LightSignal ?? null;
  const afterWarmCount = Number(afterType4Signal?.warmYellow?.count ?? 0);
  const afterBlueCount = Number(afterType4Signal?.coolBlue?.count ?? 0);
  const yellowDominant =
    pixelClassification?.dominantCapturedSignal === "warm-yellow" &&
    afterWarmCount > 0 &&
    afterBlueCount === 0;
  const candidate =
    pixelClassification?.visibleType4VfxAppears === true &&
    priority20HasTie &&
    priorityDriverEvidence.sameTimestampBlueYellowRequests === true &&
    priorityDriverEvidence.blueBeforeYellowInScript === true &&
    yellowDominant;
  return {
    status: candidate
      ? "retail-pixel-candidate-equal-priority-yellow-over-blue-observed-dataflow-still-blocked"
      : pixelClassification?.visibleType4VfxAppears === true
        ? "blocked-equal-priority-tie-candidate-inconclusive"
        : "blocked-equal-priority-tie-candidate-missing-runtime-signal",
    candidateObserved: candidate,
    sameTimestampBlueYellowRequests:
      priorityDriverEvidence.sameTimestampBlueYellowRequests === true,
    blueBeforeYellowInScript: priorityDriverEvidence.blueBeforeYellowInScript,
    priority20HasTie,
    dominantCapturedSignal: pixelClassification?.dominantCapturedSignal ?? null,
    afterWarmSignalCount: afterWarmCount,
    afterBlueSignalCount: afterBlueCount,
    candidateInterpretation: candidate
      ? "Retail priority driver schedules VFX_DUR_LIGHT_BLUE_5 then VFX_DUR_LIGHT_YELLOW_5 at the same timestamp; both resolve to Type 4 Param4=20, and the after-capture classifier sees warm-yellow but no blue in the VFX ROI."
      : null,
    classifierLimits: [
      "This is a pixel/script/table candidate, not recovered Aurora scheduler data-flow.",
      "It does not prove the general equal-priority tie policy for every Type 4 owner group.",
      "It must not promote canonical parity without a direct scheduler trace or a deliberately isolated tie oracle.",
    ],
    canonicalParityPromoted: false,
  };
}

function buildDecompilationEvidence(decompilationRoot) {
  const root = resolve(decompilationRoot);
  return {
    root,
    visualEffectsStringAnchor: findFirstLine(
      resolve(root, "export", "strings.tsv"),
      "s_visualeffects_00c5c8df",
    ),
    visualEffectsLoadCall: findFirstLine(
      resolve(root, "export", "decompiled_all.c"),
      "FUN_00addae0(local_f0,s_visualeffects_00c5c8df)",
    ),
  };
}

function buildPriorityTableEvidence(summary, ownerSummary) {
  const allRows = uniqueRowsByKey(
    [
      ...asArray(summary.sampleRows),
      ...asArray(summary.nonItemRows),
      ...asArray(summary.nonItemCastShadowRows),
      ...asArray(summary.proximitySuppressionRows),
      ...asArray(summary.attachToSceneRows),
      ...asArray(ownerSummary.nonItemOwnerRows),
    ],
    (row) => `${row.rowId ?? row.progFxRowId ?? "row"}:${row.label ?? row.progFxLabel ?? ""}`,
  );
  const priorityRawCounts = summary.priorityRawCounts ?? {};
  const numericPriorityValues = Object.keys(priorityRawCounts)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  const priorityZeroRows = pickRows(allRows, (row) => row.priorityRaw === "0", 16);
  const equalPriorityGroups = Object.entries(priorityRawCounts)
    .filter(([, count]) => Number(count) > 1)
    .map(([priorityRaw, count]) => ({
      priorityRaw,
      count,
    }));
  return {
    priorityRawCounts,
    numericPriorityValues,
    minPriorityRaw: numericPriorityValues.length > 0 ? String(numericPriorityValues[0]) : null,
    maxPriorityRaw:
      numericPriorityValues.length > 0
        ? String(numericPriorityValues[numericPriorityValues.length - 1])
        : null,
    priorityZeroPresentInRetailType4Table: priorityZeroRows.length > 0,
    priorityZeroRows,
    priorityZeroStockCoverageStatus:
      priorityZeroRows.length > 0
        ? "stock-retail-type4-param4-zero-row-present"
        : "stock-retail-type4-param4-zero-row-absent-custom-row-required",
    equalPriorityGroups,
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
    throw new Error("not-a-png");
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
    throw new Error(`unsupported-png-format-${bitDepth}-${colorType}`);
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
        throw new Error(`unsupported-png-filter-${filter}`);
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

function readOptionalPng(path) {
  if (!existsSync(path)) {
    return {
      status: "missing",
      image: null,
      error: null,
    };
  }
  try {
    return {
      status: "readable",
      image: readPngRgba(path),
      error: null,
    };
  } catch (error) {
    return {
      status: "not-analyzable",
      image: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function clippedRegion(image, region) {
  const x0 = Math.max(0, Math.min(image.width, region.x));
  const y0 = Math.max(0, Math.min(image.height, region.y));
  const x1 = Math.max(x0, Math.min(image.width, region.x + region.width));
  const y1 = Math.max(y0, Math.min(image.height, region.y + region.height));
  return { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0 };
}

function pixelAt(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [
    image.rgba[offset],
    image.rgba[offset + 1],
    image.rgba[offset + 2],
    image.rgba[offset + 3],
  ];
}

function blueVfxSignal(image, region = RETAIL_PIXEL_REGIONS.vfxCenter) {
  const clipped = clippedRegion(image, region);
  if (clipped.width === 0 || clipped.height === 0) {
    return {
      status: "empty-region",
      count: 0,
      ratio: 0,
      centroid: null,
      region: clipped,
    };
  }
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  const total = clipped.width * clipped.height;
  for (let y = clipped.y0; y < clipped.y1; y += 1) {
    for (let x = clipped.x0; x < clipped.x1; x += 1) {
      const [r, g, b] = pixelAt(image, x, y);
      if (b > 120 && g > 100 && b > r * 1.15 && g > r * 1.05) {
        count += 1;
        sumX += x;
        sumY += y;
      }
    }
  }
  return {
    status: "measured",
    count,
    ratio: count / total,
    centroid: count > 0 ? { x: sumX / count, y: sumY / count } : null,
    region: clipped,
  };
}

function warmLightSignal(image, region = RETAIL_PIXEL_REGIONS.vfxCenter) {
  const clipped = clippedRegion(image, region);
  if (clipped.width === 0 || clipped.height === 0) {
    return {
      status: "empty-region",
      count: 0,
      ratio: 0,
      centroid: null,
      region: clipped,
    };
  }
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  const total = clipped.width * clipped.height;
  for (let y = clipped.y0; y < clipped.y1; y += 1) {
    for (let x = clipped.x0; x < clipped.x1; x += 1) {
      const [r, g, b] = pixelAt(image, x, y);
      if (r > 115 && g > 105 && r > b * 1.15 && g > b * 1.08 && Math.abs(r - g) < 55) {
        count += 1;
        sumX += x;
        sumY += y;
      }
    }
  }
  return {
    status: "measured",
    count,
    ratio: count / total,
    centroid: count > 0 ? { x: sumX / count, y: sumY / count } : null,
    region: clipped,
  };
}

function type4LightSignal(image, region = RETAIL_PIXEL_REGIONS.vfxCenter) {
  const coolBlue = blueVfxSignal(image, region);
  const warmYellow = warmLightSignal(image, region);
  const dominantSignal =
    warmYellow.count > coolBlue.count
      ? "warm-yellow"
      : coolBlue.count > warmYellow.count
        ? "cool-blue"
        : warmYellow.count > 0
          ? "mixed-or-equal"
          : "none";
  return {
    status:
      coolBlue.status === "empty-region" && warmYellow.status === "empty-region"
        ? "empty-region"
        : "measured",
    count: Math.max(coolBlue.count, warmYellow.count),
    dominantSignal,
    coolBlue,
    warmYellow,
  };
}

function customZeroBlueVfxSignal(image, region = RETAIL_PIXEL_REGIONS.viewport) {
  const clipped = clippedRegion(image, region);
  if (clipped.width === 0 || clipped.height === 0) {
    return {
      status: "empty-region",
      count: 0,
      ratio: 0,
      centroid: null,
      region: clipped,
    };
  }
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  const total = clipped.width * clipped.height;
  for (let y = clipped.y0; y < clipped.y1; y += 1) {
    for (let x = clipped.x0; x < clipped.x1; x += 1) {
      const [r, g, b] = pixelAt(image, x, y);
      if (b > 90 && g > 55 && b > r * 1.08 && b > g * 1.02) {
        count += 1;
        sumX += x;
        sumY += y;
      }
    }
  }
  return {
    status: "measured",
    count,
    ratio: count / total,
    centroid: count > 0 ? { x: sumX / count, y: sumY / count } : null,
    region: clipped,
  };
}

function compareRegion(left, right, region) {
  const clippedLeft = clippedRegion(left, region);
  const clippedRight = clippedRegion(right, region);
  const width = Math.min(clippedLeft.width, clippedRight.width);
  const height = Math.min(clippedLeft.height, clippedRight.height);
  if (width === 0 || height === 0) {
    return {
      status: "empty-region",
      meanAbsRgbDelta: 0,
      rmsRgbDelta: 0,
      changedSampleRatioGt5: 0,
      sampleCount: 0,
    };
  }
  let sumAbs = 0;
  let sumSquared = 0;
  let changed = 0;
  const sampleCount = width * height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const leftPixel = pixelAt(left, clippedLeft.x0 + x, clippedLeft.y0 + y);
      const rightPixel = pixelAt(right, clippedRight.x0 + x, clippedRight.y0 + y);
      const dr = Math.abs(leftPixel[0] - rightPixel[0]);
      const dg = Math.abs(leftPixel[1] - rightPixel[1]);
      const db = Math.abs(leftPixel[2] - rightPixel[2]);
      sumAbs += dr + dg + db;
      sumSquared += dr * dr + dg * dg + db * db;
      if (Math.max(dr, dg, db) > 5) {
        changed += 1;
      }
    }
  }
  return {
    status: "measured",
    meanAbsRgbDelta: sumAbs / (sampleCount * 3),
    rmsRgbDelta: Math.sqrt(sumSquared / (sampleCount * 3)),
    changedSampleRatioGt5: changed / sampleCount,
    sampleCount,
  };
}

function compareNamedRegions(left, right) {
  return Object.fromEntries(
    Object.entries(RETAIL_PIXEL_REGIONS).map(([name, region]) => [
      name,
      compareRegion(left, right, region),
    ]),
  );
}

function classifyPriorityPixels(artifactDir) {
  const before = readOptionalPng(artifactPath(artifactDir, "retail-progfx-priority-policy-before.png"));
  const after = readOptionalPng(artifactPath(artifactDir, "retail-progfx-priority-policy-after.png"));
  if (before.status !== "readable" || after.status !== "readable") {
    return {
      status: "not-analyzable",
      beforeStatus: before.status,
      afterStatus: after.status,
      errors: [before.error, after.error].filter(Boolean),
    };
  }
  const beforeBlue = blueVfxSignal(before.image);
  const afterBlue = blueVfxSignal(after.image);
  const beforeType4Light = type4LightSignal(before.image);
  const afterType4Light = type4LightSignal(after.image);
  const regionDelta = compareNamedRegions(before.image, after.image);
  const visibleType4VfxAppears =
    afterType4Light.count >= 100 &&
    regionDelta.vfxCenter.changedSampleRatioGt5 > 0.005;
  return {
    status: visibleType4VfxAppears
      ? "retail-priority-type4-light-signal-observed-after-simultaneous-requests"
      : "blocked-retail-priority-vfx-pixel-signal-inconclusive",
    visibleType4VfxAppears,
    dominantCapturedSignal: afterType4Light.dominantSignal,
    beforeBlueVfxSignal: beforeBlue,
    afterBlueVfxSignal: afterBlue,
    beforeWarmLightSignal: beforeType4Light.warmYellow,
    afterWarmLightSignal: afterType4Light.warmYellow,
    beforeType4LightSignal: beforeType4Light,
    afterType4LightSignal: afterType4Light,
    regionDelta,
    classifierLimits: [
      "the capture proves a visible Type 4 light/VFX pixel signal remains after the scripted simultaneous requests",
      "it does not isolate equal-priority tie behavior",
      "it does not test priority 0 because the retail driver has no custom Param4=0 row",
    ],
  };
}

function classifyCustomPriorityZeroPixels(artifactDir) {
  const before = readOptionalPng(
    artifactPath(artifactDir, "retail-progfx-priority-policy-custom-zero-before.png"),
  );
  const after = readOptionalPng(
    artifactPath(artifactDir, "retail-progfx-priority-policy-custom-zero-after.png"),
  );
  if (before.status !== "readable" || after.status !== "readable") {
    return {
      status: "not-analyzable",
      beforeStatus: before.status,
      afterStatus: after.status,
      errors: [before.error, after.error].filter(Boolean),
    };
  }
  const beforeBlue = customZeroBlueVfxSignal(before.image);
  const afterBlue = customZeroBlueVfxSignal(after.image);
  const regionDelta = compareNamedRegions(before.image, after.image);
  const visibleType4VfxAppears =
    beforeBlue.count < 20 && afterBlue.count >= 100 && afterBlue.count > beforeBlue.count + 100;
  return {
    status: visibleType4VfxAppears
      ? "custom-param4-zero-blue-vfx-appears-with-override-loaded"
      : "blocked-custom-param4-zero-vfx-pixel-signal-inconclusive",
    visibleType4VfxAppears,
    beforeBlueVfxSignal: beforeBlue,
    afterBlueVfxSignal: afterBlue,
    regionDelta,
    classifierLimits: [
      "this is a custom override capture, not stock retail parity",
      "the capture proves the custom Param4=0 row can be loaded and produces a visible Type 4 pixel signal",
      "it does not prove stock-retail priority-zero behavior because stock retail progfx.2da has no Type 4 Param4=0 row",
    ],
  };
}

function classifyProximityPixels(artifactDir, proximityDriverEvidence) {
  const samples = [
    ["near", "retail-progfx-proximity-distance-sweep-contact-sheet-near.png"],
    ["mid", "retail-progfx-proximity-distance-sweep-contact-sheet-mid.png"],
    ["far", "retail-progfx-proximity-distance-sweep-contact-sheet-far.png"],
  ].map(([label, name]) => {
    const png = readOptionalPng(artifactPath(artifactDir, name));
    return {
      label,
      name,
      imageStatus: png.status,
      error: png.error,
      blueVfxSignal: png.image ? blueVfxSignal(png.image) : null,
    };
  });
  if (samples.some((sample) => sample.imageStatus !== "readable")) {
    return {
      status: "not-analyzable",
      samples,
    };
  }
  const byLabel = new Map(samples.map((sample) => [sample.label, sample]));
  const near = byLabel.get("near").blueVfxSignal.count;
  const mid = byLabel.get("mid").blueVfxSignal.count;
  const far = byLabel.get("far").blueVfxSignal.count;
  const nearSuppressedOrReduced = near > 0 && mid > near * 2 && far > near * 2;
  const midFarRestored = mid > 500 && far > 500;
  return {
    status:
      nearSuppressedOrReduced && midFarRestored
        ? "retail-proximity-pixels-classified-near-reduced-mid-far-active-threshold-bracket-only"
        : "blocked-retail-proximity-pixel-signal-inconclusive",
    nearSuppressedOrReduced,
    midFarRestored,
    thresholdBracket: nearSuppressedOrReduced
      ? "between the scripted near sample and the scripted mid sample"
      : null,
    thresholdBracketAuroraUnits: nearSuppressedOrReduced
      ? (proximityDriverEvidence?.sampleDistanceEvidence ?? null)
      : null,
    sampleLocations: proximityDriverEvidence?.samples ?? null,
    driverEvidence: proximityDriverEvidence ?? null,
    samples,
    classifierLimits: [
      "pixel signal brackets suppression between scripted samples but does not recover an exact distance threshold",
      "the participating nearby source lane is not isolated by this capture",
    ],
  };
}

function classifyAttachPixels(artifactDir) {
  const before = readOptionalPng(artifactPath(artifactDir, "retail-progfx-attach-scene-before.png"));
  const active = readOptionalPng(artifactPath(artifactDir, "retail-progfx-attach-scene-active.png"));
  const after = readOptionalPng(
    artifactPath(artifactDir, "retail-progfx-attach-scene-after-remove.png"),
  );
  if (before.status !== "readable" || active.status !== "readable" || after.status !== "readable") {
    return {
      status: "not-analyzable",
      beforeStatus: before.status,
      activeStatus: active.status,
      afterStatus: after.status,
      errors: [before.error, active.error, after.error].filter(Boolean),
    };
  }
  const beforeToActive = compareNamedRegions(before.image, active.image);
  const activeToAfter = compareNamedRegions(active.image, after.image);
  const sceneLightRemovalObserved =
    beforeToActive.campfire.changedSampleRatioGt5 > 0.2 ||
    beforeToActive.lamp.changedSampleRatioGt5 > 0.2;
  const activeMatchesBefore =
    beforeToActive.campfire.meanAbsRgbDelta < 1 &&
    beforeToActive.lamp.meanAbsRgbDelta < 1 &&
    beforeToActive.vfxCenter.meanAbsRgbDelta < 1;
  const afterMatchesActive =
    activeToAfter.campfire.meanAbsRgbDelta < 1 &&
    activeToAfter.lamp.meanAbsRgbDelta < 1 &&
    activeToAfter.vfxCenter.meanAbsRgbDelta < 1;
  return {
    status: sceneLightRemovalObserved
      ? "retail-attach-scene-pixel-removal-observed-restore-timing-still-needs-classifier"
      : "retail-attach-scene-pixels-classified-no-scene-light-removal-observed-in-capture",
    sceneLightRemovalObserved,
    activeMatchesBefore,
    afterMatchesActive,
    beforeToActive,
    activeToAfter,
    classifierLimits: [
      "this capture does not show a measurable campfire or lamp-light suppression while VFX_DUR_BLACKOUT is active",
      "absence of visible suppression is a capture/classifier result, not proof that every Param6 attach-to-scene case is inert",
      "retail scheduler data-flow is still needed to explain Param6 scene-light removal semantics",
    ],
  };
}

function buildPriorityPolicy(
  repoRoot,
  artifactDir,
  sourcePath,
  audit,
  decompilationEvidence,
  customProgFxZeroOverride,
  priorityDriverEvidence,
) {
  const summary = audit.summary ?? {};
  const ownerSummary = audit.visualEffectsOwnerSummary ?? {};
  const priorityTableEvidence = buildPriorityTableEvidence(summary, ownerSummary);
  const priorityRows = [
    ...pickRows(summary.nonItemRows, (row) => row.priorityRaw && row.priorityRaw !== "20"),
    ...pickRows(ownerSummary.nonItemOwnerRows, (row) => row.priorityRaw && row.priorityRaw !== "20"),
  ].slice(0, 32);
  const runtimeArtifacts = [
    describeOptionalArtifact(repoRoot, artifactDir, "retail-progfx-priority-policy-before.png"),
    describeOptionalArtifact(repoRoot, artifactDir, "retail-progfx-priority-policy-after.png"),
  ];
  const customZeroRuntimeArtifacts = [
    describeOptionalArtifact(
      repoRoot,
      artifactDir,
      "retail-progfx-priority-policy-custom-zero-before.png",
    ),
    describeOptionalArtifact(
      repoRoot,
      artifactDir,
      "retail-progfx-priority-policy-custom-zero-after.png",
    ),
  ];
  const runtimeCapturesPresent = allPresent(runtimeArtifacts);
  const customZeroRuntimeCapturesPresent = allPresent(customZeroRuntimeArtifacts);
  const pixelClassification = runtimeCapturesPresent ? classifyPriorityPixels(artifactDir) : null;
  const customZeroPixelClassification = customZeroRuntimeCapturesPresent
    ? classifyCustomPriorityZeroPixels(artifactDir)
    : null;
  const pixelClassificationReady =
    pixelClassification?.status ===
    "retail-priority-type4-light-signal-observed-after-simultaneous-requests";
  const equalPriorityTieCandidate = buildEqualPriorityTieCandidate(
    priorityTableEvidence,
    pixelClassification,
    priorityDriverEvidence,
  );
  const customZeroPixelClassificationReady =
    Boolean(customProgFxZeroOverride?.prepared) &&
    customZeroPixelClassification?.status ===
      "custom-param4-zero-blue-vfx-appears-with-override-loaded";
  const priorityZeroPolicy = priorityTableEvidence.priorityZeroPresentInRetailType4Table
    ? "unknown-retail-runtime-dataflow-blocked"
    : customProgFxZeroOverride?.prepared && customZeroPixelClassificationReady
      ? "custom-param4-zero-override-runtime-capture-present-not-stock-retail-parity"
      : customProgFxZeroOverride?.prepared
        ? "custom-param4-zero-override-pack-prepared-runtime-capture-missing"
        : "not-observable-in-stock-retail-progfx-type4-table-custom-row-required";

  return {
    version: "aurora-retail-progfx-type4-priority-policy/v1",
    generatedAt: new Date().toISOString(),
    status: runtimeCapturesPresent
      ? pixelClassificationReady
        ? customZeroPixelClassificationReady
          ? equalPriorityTieCandidate.candidateObserved
            ? "blocked-retail-runtime-priority-pixels-classified-tie-candidate-custom-zero-captured"
            : "blocked-retail-runtime-priority-pixels-classified-tie-still-missing-custom-zero-captured"
          : equalPriorityTieCandidate.candidateObserved
            ? "blocked-retail-runtime-priority-pixels-classified-tie-candidate-custom-zero-still-missing"
            : "blocked-retail-runtime-priority-pixels-classified-tie-custom-zero-still-missing"
        : "blocked-retail-runtime-priority-captures-present-scheduler-verdict-missing"
      : "blocked-retail-table-backed-runtime-priority-policy-missing",
    passed: false,
    canonicalParityPromoted: false,
    sourceAuditArtifact: describeFile(repoRoot, sourcePath),
    retailTableSource: audit.source ?? null,
    retailVisualEffectsSource: audit.visualEffectsSource ?? null,
    tableEvidence: {
      type4RowCount: summary.type4RowCount ?? null,
      ownerPhaseCount: ownerSummary.type4OwnerPhaseCount ?? null,
      priorityRawCounts: summary.priorityRawCounts ?? {},
      ownerPhaseCounts: ownerSummary.ownerPhaseCounts ?? {},
      nonItemOwnerPhaseCount: ownerSummary.nonItemOwnerPhaseCount ?? null,
      nonItemVisionOwnerPhaseCount: ownerSummary.nonItemVisionOwnerPhaseCount ?? null,
      priorityRows,
      priorityTableEvidence,
    },
    decompilationEvidence,
    runtimeObservation: {
      status: runtimeCapturesPresent
        ? pixelClassificationReady
          ? "retail-priority-before-after-pixels-classified"
          : "retail-priority-before-after-captures-present"
        : "not-run-retail-runtime-required",
      artifacts: runtimeArtifacts,
      pixelClassification,
      priorityDriverEvidence,
      equalPriorityTieCandidate,
      customPriorityZeroRuntimeObservation: {
        status: customZeroRuntimeCapturesPresent
          ? customZeroPixelClassificationReady
            ? "custom-param4-zero-before-after-pixels-classified"
            : "custom-param4-zero-before-after-captures-present"
          : "not-run-custom-override-runtime-required",
        artifacts: customZeroRuntimeArtifacts,
        pixelClassification: customZeroPixelClassification,
        stockRetailParityPromoted: false,
      },
      winningType4Owner: pixelClassificationReady
        ? "visible Type 4 light/VFX request appears after VFX_DUR_BLACKOUT + VFX_DUR_LIGHT_BLUE_5 + VFX_DUR_LIGHT_YELLOW_5; exact winner remains not isolated"
        : null,
      tiePolicy: equalPriorityTieCandidate.status,
      priorityZeroPolicy,
      customProgFxZeroOverride: customProgFxZeroOverride ?? null,
    },
    acceptedSourceBackedFacts: [
      "retail progfx.2da Type 4 Param4 values are source-table backed",
      "visualeffects.2da duration/cessation owner phase references for Type 4 are source-table backed",
      "priority values 13/20/49/50/51/52/53 are present in the retail table",
      priorityTableEvidence.priorityZeroPresentInRetailType4Table
        ? "retail progfx.2da contains at least one stock Type 4 Param4=0 row"
        : "retail progfx.2da contains no stock Type 4 Param4=0 row; priority-zero requires a custom override scene",
      customZeroPixelClassificationReady
        ? "custom Param4=0 override scene produced a visible Type 4 pixel signal with the prepared 2DA hashes"
        : "custom Param4=0 override scene has not produced a classified pixel signal in this run",
      decompilationEvidence.visualEffectsLoadCall.status === "found"
        ? "Aurora decompilation shows visualeffects.2da loaded through the retail table manager path"
        : "Aurora decompilation visualeffects.2da load anchor was not found in this run",
    ],
    blockedRuntimeFacts: [
      "exact retail owner grouping under simultaneous Type 4 requests",
      "equal-priority tie behavior",
      priorityTableEvidence.priorityZeroPresentInRetailType4Table
        ? "priority 0 always-applies runtime behavior"
        : customZeroPixelClassificationReady
          ? "custom Param4=0 capture is custom-override evidence only and must not be promoted as stock retail priority-zero parity"
          : customProgFxZeroOverride?.prepared
          ? "custom Param4=0 Type 4 runtime behavior still requires a recorded capture using the prepared override hashes"
          : "custom Param4=0 Type 4 runtime behavior because stock retail progfx.2da has no priority-zero row",
      runtimeCapturesPresent
        ? pixelClassificationReady
          ? equalPriorityTieCandidate.candidateObserved
            ? "equal-priority yellow-over-blue candidate is observed from script/table/pixel evidence, but direct scheduler data-flow or a deliberately isolated tie oracle is still missing"
            : "isolated winner/tie classification beyond the visible blue/yellow Type 4 pixel signal"
          : "pixel/runtime classification of the winning Type 4 request from the captured viewport"
        : "pixel/runtime confirmation of the winning Type 4 request",
    ],
    blocker:
      runtimeCapturesPresent
        ? pixelClassificationReady
          ? customZeroPixelClassificationReady
            ? equalPriorityTieCandidate.candidateObserved
              ? "Retail priority before/after captures, the same-timestamp Blue/Yellow driver, and the custom Param4=0 override capture are classified; equal-priority tie still needs direct scheduler data-flow or an isolated tie oracle before parity can pass."
              : "Retail priority before/after captures and the custom Param4=0 override capture are classified, but equal-priority tie behavior and stock-retail priority-zero parity remain unproven."
            : equalPriorityTieCandidate.candidateObserved
              ? "Retail priority before/after captures and the same-timestamp Blue/Yellow driver produce an equal-priority tie candidate, but custom Param4=0 behavior and direct tie data-flow remain unproven."
              : "Retail priority before/after captures now prove a visible Type 4 pixel signal appears, but equal-priority tie behavior and custom Param4=0 behavior remain untested."
          : "Retail priority before/after captures are present, but no scheduler data-flow or pixel classifier has identified the winning Type 4 owner, tie behavior, or priority-zero behavior."
        : "Retail tables prove Param4 values and owner phases, but no retail runtime capture or decompiled scheduler data-flow proves priority/tie/custom-zero winner behavior.",
  };
}

function buildProximitySweep(repoRoot, artifactDir, sourcePath, audit, proximityDriverEvidence) {
  const summary = audit.summary ?? {};
  const ownerSummary = audit.visualEffectsOwnerSummary ?? {};
  const proximityRows = [
    ...pickRows(summary.proximitySuppressionRows, () => true),
    ...pickRows(ownerSummary.nonItemOwnerRows, (row) => row.proximitySuppressionRaw === "1"),
  ].slice(0, 32);
  const runtimeArtifacts = [
    describeOptionalArtifact(
      repoRoot,
      artifactDir,
      "retail-progfx-proximity-distance-sweep-contact-sheet.png",
    ),
    describeOptionalArtifact(
      repoRoot,
      artifactDir,
      "retail-progfx-proximity-distance-sweep-contact-sheet-near.png",
    ),
    describeOptionalArtifact(
      repoRoot,
      artifactDir,
      "retail-progfx-proximity-distance-sweep-contact-sheet-mid.png",
    ),
    describeOptionalArtifact(
      repoRoot,
      artifactDir,
      "retail-progfx-proximity-distance-sweep-contact-sheet-far.png",
    ),
  ];
  const runtimeCapturesPresent = allPresent(runtimeArtifacts);
  const pixelClassification = runtimeCapturesPresent
    ? classifyProximityPixels(artifactDir, proximityDriverEvidence)
    : null;
  const pixelClassificationReady =
    pixelClassification?.status ===
    "retail-proximity-pixels-classified-near-reduced-mid-far-active-threshold-bracket-only";

  return {
    version: "aurora-retail-progfx-type4-proximity-distance-sweep/v1",
    generatedAt: new Date().toISOString(),
    status: runtimeCapturesPresent
      ? pixelClassificationReady
        ? "blocked-retail-runtime-proximity-pixels-classified-threshold-owner-still-missing"
        : "blocked-retail-runtime-proximity-captures-present-threshold-analysis-missing"
      : "blocked-retail-table-backed-distance-sweep-missing",
    passed: false,
    canonicalParityPromoted: false,
    sourceAuditArtifact: describeFile(repoRoot, sourcePath),
    retailTableSource: audit.source ?? null,
    retailVisualEffectsSource: audit.visualEffectsSource ?? null,
    tableEvidence: {
      proximitySuppressionBooleanCounts: summary.proximitySuppressionBooleanCounts ?? {},
      proximitySuppressionRawCounts: summary.proximitySuppressionRawCounts ?? {},
      nonItemProximitySuppressionOwnerPhaseCount:
        ownerSummary.nonItemProximitySuppressionOwnerPhaseCount ?? null,
      proximityRows,
    },
    sweep: {
      status: runtimeCapturesPresent
        ? pixelClassificationReady
          ? "retail-near-mid-far-pixels-classified-threshold-bracket-only"
          : "retail-near-mid-far-contact-sheet-present-threshold-not-measured"
        : "not-run-retail-runtime-required",
      artifacts: runtimeArtifacts,
      pixelClassification,
      driverEvidence: proximityDriverEvidence,
      measuredThresholdMeters: null,
      measuredThresholdAuroraUnits: null,
      thresholdBracket: pixelClassification?.thresholdBracket ?? null,
      thresholdBracketAuroraUnits:
        pixelClassification?.thresholdBracketAuroraUnits ??
        proximityDriverEvidence.sampleDistanceEvidence ??
        null,
      sampleLocations: proximityDriverEvidence.samples ?? null,
      candidateSet: "unknown-retail-runtime-dataflow-blocked",
      restoreBehavior: pixelClassificationReady
        ? "blue Type 4 signal is reduced at near sample and restored at mid/far samples"
        : "unknown-retail-runtime-dataflow-blocked",
    },
    acceptedSourceBackedFacts: [
      "retail progfx.2da Type 4 Param5 proximity suppression flag is source-table backed",
      "8 Type 4 rows have Param5=1 in retail progfx.2da",
      `${countObjectValue(ownerSummary, "nonItemProximitySuppressionOwnerPhaseCount")} non-item owner phases reference proximity-suppressed Type 4 rows`,
    ],
    blockedRuntimeFacts: [
      "exact distance threshold",
      "which source lanes participate as nearby light candidates",
      "suppression and restore behavior across changing distance",
    ],
    blocker:
      runtimeCapturesPresent
        ? pixelClassificationReady
          ? "Retail near/mid/far captures now bracket proximity suppression behavior at the scripted stage coordinates, but exact threshold and participating source lane still need an isolated oracle or decompiled scheduler data-flow."
          : "Retail near/mid/far captures are present, but the distance threshold and participating source lane still need a pixel classifier or decompiled scheduler data-flow."
        : "Retail table flags prove which rows request proximity suppression, but the distance threshold and candidate set require retail runtime capture or decompiled scheduler data-flow.",
  };
}

function buildAttachRestore(repoRoot, artifactDir, sourcePath, audit) {
  const summary = audit.summary ?? {};
  const ownerSummary = audit.visualEffectsOwnerSummary ?? {};
  const attachRows = [
    ...pickRows(summary.attachToSceneRows, () => true),
    ...pickRows(ownerSummary.nonItemOwnerRows, (row) => row.attachToSceneRaw === "1"),
  ].slice(0, 24);
  const runtimeArtifacts = [
    describeOptionalArtifact(repoRoot, artifactDir, "retail-progfx-attach-scene-before.png"),
    describeOptionalArtifact(repoRoot, artifactDir, "retail-progfx-attach-scene-active.png"),
    describeOptionalArtifact(repoRoot, artifactDir, "retail-progfx-attach-scene-after-remove.png"),
  ];
  const runtimeCapturesPresent = allPresent(runtimeArtifacts);
  const pixelClassification = runtimeCapturesPresent ? classifyAttachPixels(artifactDir) : null;
  const noSceneLightRemovalObserved =
    pixelClassification?.status ===
    "retail-attach-scene-pixels-classified-no-scene-light-removal-observed-in-capture";

  return {
    version: "aurora-retail-progfx-type4-attach-scene-restore/v1",
    generatedAt: new Date().toISOString(),
    status: runtimeCapturesPresent
      ? noSceneLightRemovalObserved
        ? "blocked-retail-runtime-attach-pixels-classified-no-removal-observed-scheduler-still-missing"
        : "blocked-retail-runtime-attach-captures-present-restore-analysis-missing"
      : "blocked-retail-table-backed-attach-restore-runtime-missing",
    passed: false,
    canonicalParityPromoted: false,
    sourceAuditArtifact: describeFile(repoRoot, sourcePath),
    retailTableSource: audit.source ?? null,
    retailVisualEffectsSource: audit.visualEffectsSource ?? null,
    tableEvidence: {
      attachToSceneBooleanCounts: summary.attachToSceneBooleanCounts ?? {},
      attachToSceneRawCounts: summary.attachToSceneRawCounts ?? {},
      nonItemAttachToSceneOwnerPhaseCount:
        ownerSummary.nonItemAttachToSceneOwnerPhaseCount ?? null,
      attachRows,
    },
    restoreObservation: {
      status: runtimeCapturesPresent
        ? noSceneLightRemovalObserved
          ? "retail-before-active-after-pixels-classified-no-scene-light-removal-observed"
          : "retail-before-active-after-captures-present-restore-not-classified"
        : "not-run-retail-runtime-required",
      artifacts: runtimeArtifacts,
      pixelClassification,
      sceneLightsRemovedWhileActive: pixelClassification?.sceneLightRemovalObserved ?? null,
      restoreFrameOrPhase: noSceneLightRemovalObserved
        ? "not-observed-because-active-capture-did-not-remove-scene-lights"
        : null,
      afterRemoveState: noSceneLightRemovalObserved
        ? "matches-active-and-before-within-selected-light-ROIs"
        : "unknown-retail-runtime-dataflow-blocked",
    },
    acceptedSourceBackedFacts: [
      "retail progfx.2da Type 4 Param6 attach-to-scene flag is source-table backed",
      "2 Type 4 rows have Param6=1 in retail progfx.2da",
      `${countObjectValue(ownerSummary, "nonItemAttachToSceneOwnerPhaseCount")} non-item owner phase references an attach-to-scene Type 4 row`,
    ],
    blockedRuntimeFacts: [
      "which scene lights are removed while the Type 4 effect is active",
      "exact restore timing after effect removal or cessation",
      "pixel/runtime confirmation of attach-to-scene suppression",
    ],
    blocker:
      runtimeCapturesPresent
        ? noSceneLightRemovalObserved
          ? "Retail before/active/after pixels do not show scene-light removal in the selected ROIs, so this capture cannot promote Param6 restore semantics; decompiled scheduler data-flow or a stronger oracle is still required."
          : "Retail before/active/after captures are present, but scene-light removal and restore timing still need pixel classification or decompiled scheduler data-flow."
        : "Retail table flags prove attach-to-scene requests, but scene-light removal/restoration timing requires retail runtime capture or decompiled scheduler data-flow.",
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(options.repoRoot);
  const artifactDir = toAbsolute(repoRoot, options.artifactDir);
  const sourcePath = toAbsolute(repoRoot, `${options.artifactDir}/${options.sourceAudit}`);
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing ProgFX Type 4 source audit: ${sourcePath}`);
  }
  mkdirSync(artifactDir, { recursive: true });
  const audit = readJson(sourcePath);
  const decompilationEvidence = buildDecompilationEvidence(options.decompilationRoot);
  const customProgFxZeroOverride = readOptionalJsonPath(
    repoRoot,
    options.customProgFxZeroOverrideManifest,
  );
  const priorityDriverEvidence = buildPriorityDriverEvidence(
    repoRoot,
    options.priorityDriverScript,
  );
  const proximityTargetFixtureEvidence = buildProximityTargetFixtureEvidence(
    repoRoot,
    options.moduleInjectionSummary,
  );
  const proximityDriverEvidence = buildProximityDriverEvidence(
    repoRoot,
    options.proximityDriverScript,
    proximityTargetFixtureEvidence,
  );
  const outputs = [
    {
      name: "retail-progfx-priority-policy.json",
      value: buildPriorityPolicy(
        repoRoot,
        artifactDir,
        sourcePath,
        audit,
        decompilationEvidence,
        customProgFxZeroOverride,
        priorityDriverEvidence,
      ),
    },
    {
      name: "retail-progfx-proximity-distance-sweep.json",
      value: buildProximitySweep(
        repoRoot,
        artifactDir,
        sourcePath,
        audit,
        proximityDriverEvidence,
      ),
    },
    {
      name: "retail-progfx-attach-scene-restore.json",
      value: buildAttachRestore(repoRoot, artifactDir, sourcePath, audit),
    },
  ];

  for (const output of outputs) {
    writeFileSync(resolve(artifactDir, output.name), `${JSON.stringify(output.value, null, 2)}\n`, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        status: "retail-progfx-type4-policy-artifacts-written-runtime-still-blocked",
        outputs: outputs.map((output) => output.name),
        sourceAudit: toRepoRelative(repoRoot, sourcePath),
        type4RowCount: audit.summary?.type4RowCount ?? null,
        type4OwnerPhaseCount: audit.visualEffectsOwnerSummary?.type4OwnerPhaseCount ?? null,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
