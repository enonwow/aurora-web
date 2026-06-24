import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const artifactsRoot = path.join(repoRoot, "backend/docs/aurora-reverse/artifacts");
const coverageInventoryPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-84/vfx-visual-coverage-inventory.json"
);
const outputPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-85/vfx-local-oracle-thresholds.json"
);

const coverageInventory = readJson(coverageInventoryPath);
const artifactFiles = listFiles(artifactsRoot);
const correlationRecords = artifactFiles
  .filter((filePath) => filePath.endsWith(".contract-visual-correlation.json"))
  .map(readCorrelationRecord)
  .filter(Boolean);
const reportRecords = artifactFiles
  .filter((filePath) => filePath.endsWith("-report.json"))
  .map(readReportRecord)
  .filter(Boolean);

const correlationsByFixture = groupByFixture(correlationRecords);
const reportsByFixture = groupByFixture(reportRecords);

const fixtures = coverageInventory.fixtures.map((fixture) => {
  const fixtureReports = sortByIteration(reportsByFixture.get(fixture.fixtureId) ?? []);
  const report = fixtureReports.at(-1) ?? null;
  const fixtureCorrelations = sortByIteration(correlationsByFixture.get(fixture.fixtureId) ?? []);
  const frames = report ? selectFramesForReport(report, fixtureCorrelations) : [];
  const thresholds = buildThresholds(frames);
  const failedChecks = [
    ...frames.flatMap((frame) => frame.failedChecks),
    ...(report?.allChecksPassed === false ? ["diagnosticReportFailedChecks"] : []),
    ...(frames.length < 2 ? ["lessThanTwoSelectedFrames"] : []),
    ...(!thresholds ? ["thresholdsMissing"] : [])
  ];

  return {
    fixtureId: fixture.fixtureId,
    requiredCase: fixture.requiredCase,
    latestDiagnosticReport: report
      ? {
          path: report.path,
          iteration: report.iteration,
          version: report.version,
          result: report.result,
          frameCount: report.frameCount,
          oracle: report.oracle,
          allChecksPassed: report.allChecksPassed,
          canonicalParityPromoted: report.canonicalParityPromoted
        }
      : null,
    selectedFrames: frames.map((frame) => ({
      path: frame.path,
      iteration: frame.iteration,
      timeSeconds: frame.timeSeconds,
      seed: frame.seed,
      screenshot: frame.screenshot,
      screenshotBytes: frame.screenshotBytes,
      objectPixels: frame.objectPixels,
      connectedComponentCount: frame.connectedComponentCount,
      bounds: frame.bounds,
      drawLane: frame.drawLane,
      renderMode: frame.renderMode,
      blendMode: frame.blendMode,
      textureProfile: frame.textureProfile,
      drawParticleCount: frame.drawParticleCount,
      drawVertexCount: frame.drawVertexCount,
      drawRecordCount: frame.drawRecordCount,
      canvasNonblank: frame.canvasNonblank,
      localStructuralVisible: frame.localStructuralVisible,
      canonicalParityPromoted: frame.canonicalParityPromoted,
      artifactAvailability: frame.artifactAvailability
    })),
    thresholds,
    localOracleStatus: failedChecks.length === 0 ? "local_threshold_profile_ready" : "local_threshold_profile_incomplete",
    failedChecks,
    canonicalParityPromoted: false
  };
});

const summary = {
  fixtureCount: fixtures.length,
  fixturesWithThresholdProfiles: fixtures.filter(
    (fixture) => fixture.localOracleStatus === "local_threshold_profile_ready"
  ).length,
  fixturesWithSelectedFramePairs: fixtures.filter((fixture) => fixture.selectedFrames.length >= 2).length,
  fixturesWithCanonicalParityPromoted: fixtures.filter((fixture) => fixture.canonicalParityPromoted).length,
  localOnlyNotRetailEvidence: true
};

const result =
  summary.fixturesWithThresholdProfiles === summary.fixtureCount
    ? "local-oracle-threshold-profile-complete"
    : "local-oracle-threshold-profile-incomplete";

const profile = {
  version: "aurora-vfx-local-oracle-thresholds/v1",
  generatedAt: new Date().toISOString(),
  sourceCoverageInventory: relativePath(coverageInventoryPath),
  artifactRoot: relativePath(artifactsRoot),
  oracle: "local-two-frame-visual-diagnostic-threshold-profile",
  result,
  canonicalParityPromoted: false,
  localOnlyNotRetailEvidence: true,
  summary,
  fixtures,
  blockers: [
    "retail_capture_required_for_canonical_parity",
    "retail_runtime_tick_dump_required_for_canonical_parity",
    "retail_render_contract_snapshot_required_for_canonical_parity",
    "retail_comparison_required_for_canonical_parity",
    "local_thresholds_are_regression_oracles_only"
  ],
  notes: [
    "Thresholds are derived from local two-frame diagnostic artifacts and should only guard local regressions.",
    "The thresholds intentionally keep canonicalParityPromoted=false for every fixture."
  ]
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(profile, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      result: profile.result,
      report: relativePath(outputPath),
      summary: profile.summary
    },
    null,
    2
  )
);

function readCorrelationRecord(filePath) {
  const correlation = readJson(filePath);
  if (!correlation.fixtureId) {
    return null;
  }

  const snapshot = readOptionalJson(correlation.artifacts?.renderContractSnapshot);
  const screenshotPath = correlation.artifacts?.screenshot
    ? path.join(repoRoot, correlation.artifacts.screenshot)
    : null;
  const frameExists = existsRelative(correlation.artifacts?.frame);
  const comparisonExists = existsRelative(correlation.artifacts?.comparison);
  const renderContractSnapshotExists = existsRelative(correlation.artifacts?.renderContractSnapshot);
  const drawRecords = snapshot?.renderContract?.drawRecords ?? snapshot?.drawRecords ?? [];

  return {
    fixtureId: correlation.fixtureId,
    path: relativePath(filePath),
    iteration: getIteration(filePath),
    timeSeconds: correlation.timeSeconds,
    seed: correlation.seed,
    result: correlation.result,
    screenshot: correlation.artifacts?.screenshot ?? null,
    screenshotBytes: screenshotPath && fs.existsSync(screenshotPath) ? fs.statSync(screenshotPath).size : null,
    objectPixels: correlation.comparisonMetrics?.objectPixels ?? null,
    connectedComponentCount: correlation.comparisonMetrics?.connectedComponentCount ?? null,
    bounds: correlation.comparisonMetrics?.bounds ?? null,
    drawLane: correlation.contractMetrics?.drawLane ?? correlation.laneProbe?.drawLane ?? null,
    renderMode: correlation.laneProbe?.renderMode?.enum ?? null,
    blendMode: correlation.laneProbe?.blendMode?.enum ?? null,
    textureProfile: correlation.frameStatus?.textureProfile ?? null,
    drawParticleCount: correlation.contractMetrics?.drawParticleCount ?? null,
    drawVertexCount: correlation.contractMetrics?.drawVertexCount ?? null,
    drawRecordCount: correlation.contractMetrics?.drawRecordCount ?? drawRecords.length,
    canvasNonblank: correlation.checks?.canvasNonblank === true,
    localStructuralVisible: correlation.checks?.localStructuralVisible === true,
    canonicalParityPromoted: correlation.canonicalParityPromoted === true,
    artifactAvailability: {
      screenshotExists: screenshotPath ? fs.existsSync(screenshotPath) : false,
      frameExists,
      comparisonExists,
      renderContractSnapshotExists
    },
    failedChecks: getCorrelationFailures(correlation, {
      screenshotExists: screenshotPath ? fs.existsSync(screenshotPath) : false,
      frameExists,
      comparisonExists,
      renderContractSnapshotExists
    })
  };
}

function readReportRecord(filePath) {
  const report = readJson(filePath);
  if (!report.fixtureId || typeof report.frameCount !== "number") {
    return null;
  }

  return {
    fixtureId: report.fixtureId,
    path: relativePath(filePath),
    iteration: getIteration(filePath),
    version: report.version,
    result: report.result,
    frameCount: report.frameCount,
    timeSeconds: report.timeSeconds ?? [],
    seeds: report.seeds ?? [],
    oracle: report.oracle,
    allChecksPassed: Object.values(report.checks ?? {}).every(Boolean),
    canonicalParityPromoted: report.canonicalParityPromoted === true
  };
}

function selectFramesForReport(report, fixtureCorrelations) {
  const selected = [];
  for (const [index, timeSeconds] of report.timeSeconds.entries()) {
    const seed = report.seeds[index];
    const matches = fixtureCorrelations.filter(
      (correlation) =>
        nearlyEqual(correlation.timeSeconds, timeSeconds) && Number(correlation.seed) === Number(seed)
    );
    const match = [...matches].sort(compareFrameCompleteness).at(-1);
    if (match) {
      selected.push(match);
    }
  }

  if (selected.length >= report.frameCount) {
    return selected.slice(0, report.frameCount);
  }

  return [...fixtureCorrelations].slice(-report.frameCount);
}

function buildThresholds(frames) {
  if (frames.length < 2) {
    return null;
  }

  const objectPixels = range(frames.map((frame) => frame.objectPixels));
  const componentCounts = uniqueNumbers(frames.map((frame) => frame.connectedComponentCount));
  const screenshotBytes = range(frames.map((frame) => frame.screenshotBytes));
  const drawParticleCounts = uniqueNumbers(frames.map((frame) => frame.drawParticleCount));
  const drawVertexCounts = uniqueNumbers(frames.map((frame) => frame.drawVertexCount));
  const drawRecordCounts = uniqueNumbers(frames.map((frame) => frame.drawRecordCount));
  const bounds = buildBoundsEnvelope(frames.map((frame) => frame.bounds).filter(Boolean));

  return {
    frameCount: frames.length,
    objectPixels: {
      observedMin: objectPixels.min,
      observedMax: objectPixels.max,
      allowedMin: Math.max(1, Math.floor(objectPixels.min * 0.75)),
      allowedMax: Math.ceil(objectPixels.max * 1.25)
    },
    screenshotBytes: {
      observedMin: screenshotBytes.min,
      observedMax: screenshotBytes.max,
      allowedMin: Math.max(1, Math.floor(screenshotBytes.min * 0.7)),
      allowedMax: Math.ceil(screenshotBytes.max * 1.3)
    },
    connectedComponentCount: {
      observedValues: componentCounts,
      allowedMin: Math.min(...componentCounts),
      allowedMax: Math.max(...componentCounts)
    },
    drawParticleCount: {
      observedValues: drawParticleCounts,
      expectedExactWhenStable: drawParticleCounts.length === 1 ? drawParticleCounts[0] : null
    },
    drawVertexCount: {
      observedValues: drawVertexCounts,
      expectedExactWhenStable: drawVertexCounts.length === 1 ? drawVertexCounts[0] : null
    },
    drawRecordCount: {
      observedValues: drawRecordCounts,
      expectedExactWhenStable: drawRecordCounts.length === 1 ? drawRecordCounts[0] : null
    },
    boundsEnvelope: bounds
      ? {
          observed: bounds,
          allowed: {
            x0: Math.max(0, bounds.x0 - 32),
            y0: Math.max(0, bounds.y0 - 32),
            x1: bounds.x1 + 32,
            y1: bounds.y1 + 32
          }
        }
      : null,
    drawLane: uniqueStrings(frames.map((frame) => frame.drawLane)),
    renderMode: uniqueStrings(frames.map((frame) => frame.renderMode)),
    blendMode: uniqueStrings(frames.map((frame) => frame.blendMode)),
    textureProfile: uniqueStrings(frames.map((frame) => frame.textureProfile)),
    requiredBooleans: {
      canvasNonblank: true,
      localStructuralVisible: true,
      canonicalParityPromoted: false,
      screenshotExists: true,
      frameExists: true,
      comparisonExists: true,
      renderContractSnapshotExists: true
    }
  };
}

function getCorrelationFailures(correlation, artifactAvailability) {
  const failures = [];
  if (correlation.checks?.canvasNonblank !== true) failures.push("canvasNonblank");
  if (correlation.checks?.localStructuralVisible !== true) failures.push("localStructuralVisible");
  if (correlation.canonicalParityPromoted === true) failures.push("canonicalParityPromoted");
  for (const [key, value] of Object.entries(artifactAvailability)) {
    if (value !== true) failures.push(key);
  }
  return failures;
}

function buildBoundsEnvelope(boundsList) {
  if (boundsList.length === 0) {
    return null;
  }

  return {
    x0: Math.min(...boundsList.map((bounds) => bounds.x0)),
    y0: Math.min(...boundsList.map((bounds) => bounds.y0)),
    x1: Math.max(...boundsList.map((bounds) => bounds.x1)),
    y1: Math.max(...boundsList.map((bounds) => bounds.y1))
  };
}

function range(values) {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  return {
    min: Math.min(...finiteValues),
    max: Math.max(...finiteValues)
  };
}

function uniqueNumbers(values) {
  return [...new Set(values.filter((value) => Number.isFinite(value)))].sort((a, b) => a - b);
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))].sort();
}

function groupByFixture(records) {
  const grouped = new Map();
  for (const record of records) {
    const bucket = grouped.get(record.fixtureId) ?? [];
    bucket.push(record);
    grouped.set(record.fixtureId, bucket);
  }
  return grouped;
}

function sortByIteration(records) {
  return [...records].sort(
    (left, right) =>
      left.iteration - right.iteration ||
      Number(left.timeSeconds ?? 0) - Number(right.timeSeconds ?? 0) ||
      Number(left.seed ?? 0) - Number(right.seed ?? 0) ||
      String(left.path).localeCompare(String(right.path))
  );
}

function compareFrameCompleteness(left, right) {
  return (
    completenessScore(left) - completenessScore(right) ||
    left.iteration - right.iteration ||
    String(left.path).localeCompare(String(right.path))
  );
}

function completenessScore(frame) {
  return [
    frame.artifactAvailability?.screenshotExists,
    frame.artifactAvailability?.frameExists,
    frame.artifactAvailability?.comparisonExists,
    frame.artifactAvailability?.renderContractSnapshotExists,
    Number.isFinite(frame.objectPixels),
    Number.isFinite(frame.connectedComponentCount),
    Boolean(frame.drawLane),
    Boolean(frame.renderMode),
    Boolean(frame.blendMode),
    Boolean(frame.textureProfile)
  ].filter(Boolean).length;
}

function listFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalJson(relativeFilePath) {
  if (!relativeFilePath) {
    return null;
  }

  const filePath = path.join(repoRoot, relativeFilePath);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return readJson(filePath);
}

function existsRelative(relativeFilePath) {
  return Boolean(relativeFilePath) && fs.existsSync(path.join(repoRoot, relativeFilePath));
}

function getIteration(filePath) {
  const match = filePath.match(/vfx-iteration-(\d+)/);
  return match ? Number(match[1]) : -1;
}

function nearlyEqual(left, right) {
  return Math.abs(Number(left) - Number(right)) < 0.000001;
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}
