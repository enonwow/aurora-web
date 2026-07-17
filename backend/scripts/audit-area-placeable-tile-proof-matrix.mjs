#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultSourceRoot = "backend/docs/aurora-reverse/artifacts/areas-source-pack";
const defaultRuntimeRoot = "backend/docs/aurora-reverse/artifacts/areas-runtime-capture";

function readArgs(argv) {
  const options = {
    sourceRoot: defaultSourceRoot,
    runtimeRoot: defaultRuntimeRoot,
    out: "",
    markdown: ""
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--sourceRoot" && next) {
      options.sourceRoot = next;
      index += 1;
    } else if (arg === "--runtimeRoot" && next) {
      options.runtimeRoot = next;
      index += 1;
    } else if (arg === "--out" && next) {
      options.out = next;
      index += 1;
    } else if (arg === "--markdown" && next) {
      options.markdown = next;
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
node backend/scripts/audit-area-placeable-tile-proof-matrix.mjs \\
  --out backend/docs/aurora-reverse/artifacts/areas-runtime-capture/area-placeable-tile-proof-matrix.json \\
  --markdown backend/docs/aurora-reverse/artifacts/areas-runtime-capture/area-placeable-tile-proof-matrix.md`);
}

function resolveRepoPath(value) {
  return path.resolve(repoRoot, value);
}

function stripBom(text) {
  return text.replace(/^\uFEFF/u, "");
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(stripBom(fs.readFileSync(filePath, "utf8")));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === "\"") {
        if (text[index + 1] === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }
  const [headers, ...body] = rows;
  if (!headers) {
    return [];
  }
  return body
    .filter((entry) => entry.length === headers.length)
    .map((entry) => Object.fromEntries(headers.map((header, index) => [header, entry[index]])));
}

function readCsvIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return parseCsv(stripBom(fs.readFileSync(filePath, "utf8")));
}

function normalizeAreaKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
}

function inferAreaResrefFromDirName(name) {
  const candidates = [
    /^(.+?)-source-pack/u,
    /^(.+?)-proof/u,
    /^(.+?)-active-vt/u,
    /^(.+?)-vt-dry-run/u,
    /^(.+?)-tile-shell-check/u
  ];
  for (const pattern of candidates) {
    const match = name.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/-/gu, "_");
    }
  }
  return name.replace(/-/gu, "_");
}

function numeric(value) {
  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isTrue(value) {
  return String(value ?? "").trim().toLowerCase() === "true";
}

function isNonZero(value, defaultValue = 0) {
  const parsed = numeric(value);
  return parsed !== null && Math.abs(parsed - defaultValue) > 0.000001;
}

function hasVisualTransform(row) {
  if (isTrue(row.hasVisualTransform)) {
    return true;
  }
  return (
    isNonZero(row.vtScaleX, 1) ||
    isNonZero(row.vtScaleY, 1) ||
    isNonZero(row.vtScaleZ, 1) ||
    isNonZero(row.vtRotateX) ||
    isNonZero(row.vtRotateY) ||
    isNonZero(row.vtRotateZ) ||
    isNonZero(row.vtTranslateX) ||
    isNonZero(row.vtTranslateY) ||
    isNonZero(row.vtTranslateZ)
  );
}

function isStaticRow(row) {
  return isTrue(row.isStatic) || isTrue(row.static);
}

function isSharedPlaceableKind(kind) {
  const normalized = String(kind ?? "").trim().toLowerCase();
  return normalized === "placeable" || normalized === "placeables" || normalized === "door" || normalized === "doors";
}

function listDirectories(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name));
}

function listFiles(root, predicate = () => true) {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(root, entry.name))
    .filter(predicate);
}

function latestFile(files) {
  return files
    .map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs)[0]?.filePath ?? null;
}

function summarizeSourcePack(dirPath) {
  const name = path.basename(dirPath);
  const manifest = readJsonIfExists(path.join(dirPath, "manifest.json"));
  const objects = readCsvIfExists(path.join(dirPath, "objects.csv"));
  const tiles = readCsvIfExists(path.join(dirPath, "tile-contract.csv"));
  const areaResref = manifest?.areaResref ?? inferAreaResrefFromDirName(name);
  const sharedObjects = objects.filter((row) => isSharedPlaceableKind(row.kind));
  const vtRows = sharedObjects.filter(hasVisualTransform);
  const nonStaticRows = sharedObjects.filter((row) => !isStaticRow(row));
  const nonStaticVtRows = vtRows.filter((row) => !isStaticRow(row));
  const bearingRows = sharedObjects.filter((row) => isNonZero(row.bearingDegrees));
  const tileOrientationRows = tiles.filter((row) => isNonZero(row.sourceTileOrientation));
  const tileImageMapRows = tiles.filter((row) => String(row.imageMap2D ?? "").trim().length > 0);
  const tileMirrorOrientationRows = tiles.filter((row) =>
    String(row.currentWebMirrorOrientation ?? "").trim().length > 0
  );
  return {
    name,
    path: dirPath,
    areaResref,
    areaKey: normalizeAreaKey(areaResref),
    generatedAt: manifest?.generatedAt ?? null,
    sourceStatus: objects.length > 0 || tiles.length > 0 ? "present" : "empty",
    objectRows: objects.length,
    sharedPlaceableRows: sharedObjects.length,
    nonStaticSharedPlaceableRows: nonStaticRows.length,
    visualTransformRows: vtRows.length,
    nonStaticVisualTransformRows: nonStaticVtRows.length,
    bearingRows: bearingRows.length,
    tileRows: tiles.length,
    tileImageMapRows: tileImageMapRows.length,
    tileOrientationRows: tileOrientationRows.length,
    tileMirrorOrientationRows: tileMirrorOrientationRows.length,
    rotationSeparationSourceRisk:
      tileOrientationRows.length > 0 && (bearingRows.length > 0 || vtRows.length > 0),
    tileCropSourceStatus:
      tiles.length > 0 && tileImageMapRows.length === tiles.length ? "complete" : "incomplete",
    manifestSummary: {
      tileSet: manifest?.parsed?.are?.tileSet ?? null,
      width: manifest?.parsed?.are?.width ?? null,
      height: manifest?.parsed?.are?.height ?? null,
      gitCounts: manifest?.parsed?.git?.counts ?? null,
      visualTransformCounts: manifest?.parsed?.git?.visualTransformCounts ?? null
    }
  };
}

function summarizeRuntimeCapture(dirPath) {
  const name = path.basename(dirPath);
  const manifest = readJsonIfExists(path.join(dirPath, "manifest.json"));
  const areaResref = manifest?.areaResref ?? inferAreaResrefFromDirName(name);
  const frameFiles = listFiles(dirPath, (filePath) => filePath.endsWith(".frame.json"));
  const verifierFiles = listFiles(dirPath, (filePath) =>
    path.basename(filePath).startsWith("runtime-contract-verifier") && filePath.endsWith(".json")
  );
  const latestVerifierPath = latestFile(verifierFiles);
  const latestVerifier = latestVerifierPath ? readJsonIfExists(latestVerifierPath) : null;
  const latestFramePath = latestFile(frameFiles);
  const semanticChecks = latestVerifier?.visualEvidence?.semanticChecks ?? [];
  const semanticCheckByField = new Map(
    semanticChecks.map((entry) => [entry.field, entry])
  );
  const visualTransformCheck = semanticCheckByField.get("visualTransformRuntime");
  const tileCheck = semanticCheckByField.get("tileRuntimeContractComparison");
  const placementCheck = semanticCheckByField.get("placeablePlacementRuntimeComparison");
  const freshVisual = latestVerifier?.freshVisualComparison ?? null;
  const verifierPassed = latestVerifier?.status === "passed";
  const freshVisualPassed =
    freshVisual?.status === "passed" && freshVisual?.sceneCropAlignment?.status === "passed";
  const visualEvidencePassed = latestVerifier?.visualEvidence?.status === "passed";
  return {
    name,
    path: dirPath,
    areaResref,
    areaKey: normalizeAreaKey(areaResref),
    hasSourcePackFiles:
      fs.existsSync(path.join(dirPath, "objects.csv")) &&
      fs.existsSync(path.join(dirPath, "tile-contract.csv")),
    frameCount: frameFiles.length,
    latestFrame: latestFramePath,
    verifierCount: verifierFiles.length,
    latestVerifier: latestVerifierPath,
    verifierStatus: latestVerifier?.status ?? "missing",
    verifierPassed,
    diffCount: latestVerifier?.diffCount ?? null,
    coverageFailureCount: latestVerifier?.coverageFailureCount ?? null,
    visualEvidenceStatus: latestVerifier?.visualEvidence?.status ?? null,
    freshVisualComparisonStatus: freshVisual?.status ?? null,
    freshSceneCropAlignmentStatus: freshVisual?.sceneCropAlignment?.status ?? null,
    fullRuntimeVisualProof: verifierPassed && visualEvidencePassed && freshVisualPassed,
    runtimeContractProof: verifierPassed && visualEvidencePassed,
    runtimeCounts: {
      payloadBoundCount: latestVerifier?.runtimeToSource?.payloadBoundCount ?? null,
      snapshotTotal: latestVerifier?.runtimeToSource?.snapshotTotal ?? null,
      modelReadyCount: latestVerifier?.runtimeToSource?.modelReadyCount ?? null,
      texturePendingCount: latestVerifier?.runtimeToSource?.texturePendingCount ?? null,
      visualTransformMatched: visualTransformCheck?.matchedCount ?? null,
      visualTransformExpected: visualTransformCheck?.expectedCount ?? null,
      nonStaticVisualTransformMatched: visualTransformCheck?.matchedNonStaticCount ?? null,
      nonStaticVisualTransformExpected: visualTransformCheck?.nonStaticExpectedCount ?? null,
      placementFailures: placementCheck?.failureCount ?? null,
      tilePassedRows: tileCheck?.passedRows ?? null,
      tileSourceRows: tileCheck?.sourceRows ?? null,
      rotationSeparationChecked:
        latestVerifier?.runtimeToSource?.rotationSeparation?.checkedRowsOnNonZeroTileOrientation ?? null,
      rotationSeparationFailed:
        latestVerifier?.runtimeToSource?.rotationSeparation?.failedRows ?? null
    }
  };
}

function classifySourcePack(sourcePack, runtimeCaptures) {
  const matchingRuntime = runtimeCaptures
    .filter((capture) => capture.areaKey === sourcePack.areaKey)
    .sort((left, right) => Number(right.fullRuntimeVisualProof) - Number(left.fullRuntimeVisualProof))[0] ?? null;
  const missingGates = [];
  if (sourcePack.sourceStatus !== "present") {
    missingGates.push("source_pack_empty");
  }
  if (!matchingRuntime?.runtimeContractProof) {
    missingGates.push("runtime_contract_proof_missing");
  }
  if (!matchingRuntime?.fullRuntimeVisualProof) {
    missingGates.push("fresh_visual_oracle_proof_missing");
  }
  if (sourcePack.sharedPlaceableRows > 0 && (matchingRuntime?.runtimeCounts?.placementFailures ?? null) !== 0) {
    missingGates.push("placeable_placement_runtime_proof_missing_or_failed");
  }
  if (
    sourcePack.nonStaticVisualTransformRows > 0 &&
    matchingRuntime?.runtimeCounts?.nonStaticVisualTransformMatched !==
      matchingRuntime?.runtimeCounts?.nonStaticVisualTransformExpected
  ) {
    missingGates.push("non_static_visual_transform_runtime_proof_missing_or_failed");
  }
  if (
    sourcePack.tileRows > 0 &&
    matchingRuntime?.runtimeCounts?.tilePassedRows !== matchingRuntime?.runtimeCounts?.tileSourceRows
  ) {
    missingGates.push("tile_runtime_contract_proof_missing_or_failed");
  }
  if (
    sourcePack.rotationSeparationSourceRisk &&
    (matchingRuntime?.runtimeCounts?.rotationSeparationFailed !== 0 ||
      matchingRuntime?.runtimeCounts?.rotationSeparationChecked === null)
  ) {
    missingGates.push("rotation_separation_runtime_proof_missing_or_failed");
  }

  const proofStatus = matchingRuntime?.fullRuntimeVisualProof
    ? "full-runtime-visual-proof"
    : matchingRuntime?.runtimeContractProof
      ? "runtime-contract-proof"
      : "source-pack-only";
  return {
    ...sourcePack,
    proofStatus,
    missingGates,
    runtimeCapture: matchingRuntime
      ? {
          name: matchingRuntime.name,
          path: matchingRuntime.path,
          latestFrame: matchingRuntime.latestFrame,
          latestVerifier: matchingRuntime.latestVerifier,
          verifierStatus: matchingRuntime.verifierStatus,
          fullRuntimeVisualProof: matchingRuntime.fullRuntimeVisualProof,
          runtimeContractProof: matchingRuntime.runtimeContractProof,
          runtimeCounts: matchingRuntime.runtimeCounts,
          freshVisualComparisonStatus: matchingRuntime.freshVisualComparisonStatus,
          freshSceneCropAlignmentStatus: matchingRuntime.freshSceneCropAlignmentStatus
        }
      : null
  };
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function renderMarkdown(report) {
  const rows = report.sourcePacks.map((pack) => [
    pack.areaResref,
    pack.name,
    pack.proofStatus,
    String(pack.sharedPlaceableRows),
    String(pack.nonStaticVisualTransformRows),
    String(pack.tileRows),
    String(pack.tileOrientationRows),
    pack.runtimeCapture?.runtimeCounts
      ? `${pack.runtimeCapture.runtimeCounts.rotationSeparationChecked ?? "-"} checked / ${pack.runtimeCapture.runtimeCounts.rotationSeparationFailed ?? "-"} failed`
      : "-",
    pack.missingGates.length > 0 ? pack.missingGates.join(", ") : "none"
  ]);
  const header = [
    "area",
    "source pack",
    "proof status",
    "shared plc/door rows",
    "non-static VT rows",
    "tile rows",
    "tile orientation rows",
    "rotation separation",
    "missing gates"
  ];
  const table = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ];
  return [
    "# Area Placeable/Tile Proof Matrix",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Source packs: ${report.summary.sourcePackCount}`,
    `Full runtime visual proofs: ${report.summary.fullRuntimeVisualProofCount}`,
    `Runtime contract proofs: ${report.summary.runtimeContractProofCount}`,
    `Source-only packs: ${report.summary.sourceOnlyCount}`,
    "",
    ...table,
    ""
  ].join("\n");
}

function main() {
  const options = readArgs(process.argv.slice(2));
  const sourceRoot = resolveRepoPath(options.sourceRoot);
  const runtimeRoot = resolveRepoPath(options.runtimeRoot);
  const sourcePacksRaw = listDirectories(sourceRoot).map(summarizeSourcePack);
  const runtimeCaptures = listDirectories(runtimeRoot).map(summarizeRuntimeCapture);
  const sourcePacks = sourcePacksRaw.map((sourcePack) =>
    classifySourcePack(sourcePack, runtimeCaptures)
  );
  const report = {
    version: "aurora-area-placeable-tile-proof-matrix/v1",
    generatedAt: new Date().toISOString(),
    sourceRoot,
    runtimeRoot,
    summary: {
      sourcePackCount: sourcePacks.length,
      runtimeCaptureCount: runtimeCaptures.length,
      proofStatusCounts: countBy(sourcePacks, "proofStatus"),
      fullRuntimeVisualProofCount: sourcePacks.filter(
        (pack) => pack.proofStatus === "full-runtime-visual-proof"
      ).length,
      runtimeContractProofCount: sourcePacks.filter((pack) =>
        ["full-runtime-visual-proof", "runtime-contract-proof"].includes(pack.proofStatus)
      ).length,
      sourceOnlyCount: sourcePacks.filter((pack) => pack.proofStatus === "source-pack-only").length,
      totalSharedPlaceableRows: sourcePacks.reduce(
        (sum, pack) => sum + pack.sharedPlaceableRows,
        0
      ),
      totalNonStaticVisualTransformRows: sourcePacks.reduce(
        (sum, pack) => sum + pack.nonStaticVisualTransformRows,
        0
      ),
      totalTileRows: sourcePacks.reduce((sum, pack) => sum + pack.tileRows, 0),
      totalTileOrientationRows: sourcePacks.reduce(
        (sum, pack) => sum + pack.tileOrientationRows,
        0
      )
    },
    sourcePacks,
    runtimeCaptures
  };

  if (options.out) {
    const outPath = resolveRepoPath(options.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  if (options.markdown) {
    const markdownPath = resolveRepoPath(options.markdown);
    fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
    fs.writeFileSync(markdownPath, renderMarkdown(report), "utf8");
  }
  console.log(JSON.stringify(report.summary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
