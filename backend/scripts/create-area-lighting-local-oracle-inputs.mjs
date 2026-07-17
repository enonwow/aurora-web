#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";

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
  console.log(`Usage: node scripts/create-area-lighting-local-oracle-inputs.mjs [options]

Options:
  --repoRoot <path>       Repository root. Defaults to the aurora-web root.
  --artifactDir <path>    Artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

const options = parseArgs(process.argv.slice(2));
const repoRoot = resolve(options.repoRoot);
const artifactDir = toAbsolute(repoRoot, options.artifactDir);

const outputs = [
  {
    kind: "aurora-web-shadowvol-campfire-pixel-input",
    sourceCandidates: [
      "aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.png",
      "aurora-web-catalog-campfire-plc-i06-light-shadow-proof-mp4-2026-07-06.png",
      "aurora-web-catalog-campfire-plc-i06-light-shadow-proof-2026-07-06.png",
      "placeable-campfire-shadowvol-state-proof-2026-07-03.png",
    ],
    retailReference: "retail-or-toolset-shadowvol-campfire.png",
    target: "aurora-web-shadowvol-campfire.png",
    viewportCompatibilityStatus: "local-preview-not-retail-viewport",
    retailPixelParityInputStatus:
      "fresh-local-aurora-web-campfire-proof-materialized-retail-viewport-or-roi-still-required",
    sameRetailCameraOrCalibratedRoi: false,
    calibratedRoiTransformStatus: "missing-calibrated-roi-transform",
    note:
      "Aurora Web campfire capture used as the web-side input for diagnostics only; it is not a same-camera retail viewport and has no calibrated ROI transform.",
  },
  {
    kind: "aurora-web-cross-lane-frame-input",
    sourceCandidates: [
      "cross-lane-all-light-lanes-runtime-probe-2026-07-07.frame.json",
      "cross-lane-all-light-lanes-runtime-probe-2026-07-05.frame.json",
    ],
    target: "aurora-web-cross-lane-all-lanes.frame.json",
    note:
      "Aurora Web runtime probe with tile, placeable, MDL, item, and ProgFX lanes represented before retail precedence comparison.",
  },
];

const stateTraceOutput = {
  kind: "aurora-web-shadowvol-state-trace-input",
  target: "aurora-web-shadowvol-state-trace.json",
  sourceArtifacts: [
    "shadowvol-state-wrapper-audit-script-runtime-proof-2026-07-05-final.frame.json",
    "shadowvol-render-state-call-sequence-runtime-proof-2026-07-05.frame.json",
    "shadowvol-active-light-render-envelope-runtime-proof-2026-07-05.frame.json",
  ],
  stateClaims: [
    "web-preview-uses-retail-mapped-front-back-zpass-zfail-stencil-sequence",
    "web-preview-exposes-local-shadowvol-render-state-order",
    "web-preview-exposes-active-light-render-envelope-depthfunc-blendfunc-state",
    "retail-color-depth-mask-inherited-state-remains-blocked-without-retail-trace",
  ],
};

function artifactPath(name) {
  return resolve(artifactDir, name);
}

function requireArtifact(name) {
  const path = artifactPath(name);
  if (!existsSync(path)) {
    throw new Error(`Missing required local proof artifact: ${name}`);
  }
  return path;
}

function describeFile(name) {
  const path = requireArtifact(name);
  const stats = statSync(path);
  return {
    name,
    path: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/${name}`,
    bytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  };
}

function readPngDimensionsIfPresent(name) {
  if (!name) {
    return null;
  }
  const path = artifactPath(name);
  if (!existsSync(path)) {
    return null;
  }
  const buffer = readFileSync(path);
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    return null;
  }
  return {
    name,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function buildCompatibilityMetadata(output, selectedSource) {
  if (output.kind !== "aurora-web-shadowvol-campfire-pixel-input") {
    return {};
  }
  const sourceDimensions = readPngDimensionsIfPresent(selectedSource);
  const targetDimensions = readPngDimensionsIfPresent(output.target);
  const retailReferenceDimensions = output.retailReference
    ? readPngDimensionsIfPresent(output.retailReference)
    : null;
  const samePixelDimensionsAsRetail =
    targetDimensions !== null &&
    retailReferenceDimensions !== null &&
    targetDimensions.width === retailReferenceDimensions.width &&
    targetDimensions.height === retailReferenceDimensions.height;
  return {
    retailReference: output.retailReference ?? null,
    retailReferenceFile:
      output.retailReference && existsSync(artifactPath(output.retailReference))
        ? describeFile(output.retailReference)
        : null,
    sourceDimensions,
    targetDimensions,
    retailReferenceDimensions,
    pixelDimensionCompatibilityStatus: samePixelDimensionsAsRetail
      ? "same-pixel-dimensions-retail-camera-still-unverified"
      : "different-pixel-dimensions",
    samePixelDimensionsAsRetail,
    sameRetailCameraOrCalibratedRoi: output.sameRetailCameraOrCalibratedRoi === true,
    calibratedRoiTransformStatus:
      output.calibratedRoiTransformStatus ?? "missing-calibrated-roi-transform",
  };
}

function resolveOutputSource(output) {
  if (Array.isArray(output.sourceCandidates)) {
    const source = output.sourceCandidates.find((candidate) =>
      existsSync(artifactPath(candidate)),
    );
    return source ?? null;
  }
  return existsSync(artifactPath(output.source)) ? output.source : null;
}

mkdirSync(artifactDir, { recursive: true });

const materialized = [];
for (const output of outputs) {
  const selectedSource = resolveOutputSource(output);
  if (!selectedSource) {
    materialized.push({
      ...output,
      status: "blocked-missing-local-proof-artifact",
      source: output.source ?? null,
      selectedSource: null,
      missingSourceCandidates: output.sourceCandidates ?? [output.source],
      sourceFile: null,
      targetFile: null,
      blocker:
        "Required Aurora Web/local proof artifact is absent in the current worktree; retail parity remains unpromoted.",
      ...buildCompatibilityMetadata(output, null),
    });
    continue;
  }
  const sourcePath = requireArtifact(selectedSource);
  const targetPath = artifactPath(output.target);
  copyFileSync(sourcePath, targetPath);
  materialized.push({
    ...output,
    source: selectedSource,
    selectedSource,
    sourceFile: describeFile(selectedSource),
    targetFile: describeFile(output.target),
    status: "materialized-local-proof-artifact",
    ...buildCompatibilityMetadata(output, selectedSource),
  });
}

const missingStateTraceSources = stateTraceOutput.sourceArtifacts.filter(
  (source) => !existsSync(artifactPath(source)),
);
const stateTracePath = artifactPath(stateTraceOutput.target);
const stateTrace = {
  version: "aurora-web-shadowvol-state-trace/v1",
  generatedAt: new Date().toISOString(),
  status:
    missingStateTraceSources.length === 0
      ? "local-web-input-ready-retail-trace-missing"
      : "blocked-missing-local-shadowvol-state-trace-inputs",
  canonicalParityPromoted: false,
  source: "Aurora Web runtime proof artifacts, not a retail/toolset oracle.",
  sourceArtifacts: stateTraceOutput.sourceArtifacts
    .filter((source) => existsSync(artifactPath(source)))
    .map(describeFile),
  missingSourceArtifacts: missingStateTraceSources,
  stateClaims: stateTraceOutput.stateClaims,
  blocker:
    missingStateTraceSources.length === 0
      ? "Retail/toolset shadow-volume state trace is still required before state-order parity can be promoted."
      : "Aurora Web shadow-volume state trace inputs are absent in the current worktree; regenerate runtime captures before comparing retail state order.",
};
writeFileSync(stateTracePath, `${JSON.stringify(stateTrace, null, 2)}\n`, "utf8");
materialized.push({
  ...stateTraceOutput,
  status: stateTrace.status,
  targetFile: describeFile(stateTraceOutput.target),
  missingSourceArtifacts: missingStateTraceSources,
});

const manifestPath = artifactPath("area-lighting-local-oracle-inputs-manifest.json");
const manifest = {
  version: "aurora-area-lighting-local-oracle-inputs/v1",
  generatedAt: new Date().toISOString(),
  status: materialized.some((entry) => String(entry.status ?? "").startsWith("blocked-"))
    ? "blocked-missing-local-web-inputs-retail-oracle-still-required"
    : "local-web-inputs-ready-retail-oracle-still-required",
  artifactDir:
    "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview",
  canonicalParityPromoted: false,
  materialized,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      status: manifest.status,
      manifestPath:
        "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-local-oracle-inputs-manifest.json",
      outputs: materialized.map((output) => output.target),
    },
    null,
    2,
  ),
);
