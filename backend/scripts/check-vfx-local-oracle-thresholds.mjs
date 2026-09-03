import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultThresholdPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-85/vfx-local-oracle-thresholds.json"
);
const defaultOutPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-86/vfx-local-oracle-threshold-check-report.json"
);

const args = parseArgs(process.argv.slice(2));
const thresholdPath = path.resolve(repoRoot, args.thresholds ?? defaultThresholdPath);
const outPath = path.resolve(repoRoot, args.out ?? defaultOutPath);
if (!fs.existsSync(thresholdPath)) {
  writeMissingThresholdReport(thresholdPath, outPath);
  process.exitCode = 1;
  process.exit();
}
const thresholdProfile = readJson(thresholdPath);
const correlationPaths = args.correlation ?? [];
const framesByFixture = correlationPaths.length > 0
  ? groupByFixture(correlationPaths.map((filePath) => readCorrelationFrame(filePath)))
  : new Map(
      thresholdProfile.fixtures.map((fixture) => [
        fixture.fixtureId,
        fixture.selectedFrames.map((frame) => ({
          ...frame,
          source: "threshold-profile-selected-frame"
        }))
      ])
    );

const fixturesToCheck = correlationPaths.length > 0
  ? thresholdProfile.fixtures.filter((fixture) => framesByFixture.has(fixture.fixtureId))
  : thresholdProfile.fixtures;

const unknownFixtureIds = [...framesByFixture.keys()].filter(
  (fixtureId) => !thresholdProfile.fixtures.some((fixture) => fixture.fixtureId === fixtureId)
);

const fixtureResults = fixturesToCheck.map((fixture) => {
  const frames = framesByFixture.get(fixture.fixtureId) ?? [];
  const frameResults = frames.map((frame) => checkFrame(fixture, frame));
  const failedChecks = frameResults.flatMap((frame) =>
    frame.failedChecks.map((check) => `${frame.path}:${check}`)
  );

  return {
    fixtureId: fixture.fixtureId,
    requiredCase: fixture.requiredCase,
    thresholdProfileStatus: fixture.localOracleStatus,
    frameCountChecked: frameResults.length,
    status: failedChecks.length === 0 && frameResults.length > 0 ? "passed" : "failed",
    failedChecks,
    frameResults
  };
});

const failedFixtures = fixtureResults.filter((fixture) => fixture.status !== "passed");
const canonicalPromotionAttempts = fixtureResults.flatMap((fixture) =>
  fixture.frameResults.filter((frame) => frame.canonicalParityPromoted === true)
);

const report = {
  version: "aurora-vfx-local-oracle-threshold-check-report/v1",
  generatedAt: new Date().toISOString(),
  thresholdProfile: relativePath(thresholdPath),
  checkedMode: correlationPaths.length > 0 ? "explicit-correlations" : "threshold-profile-selected-frames",
  explicitCorrelations: correlationPaths.map((filePath) => relativePath(path.resolve(repoRoot, filePath))),
  result:
    failedFixtures.length === 0 && canonicalPromotionAttempts.length === 0 && unknownFixtureIds.length === 0
      ? "local-oracle-threshold-check-passed"
      : "local-oracle-threshold-check-failed",
  canonicalParityPromoted: false,
  localOnlyNotRetailEvidence: true,
  summary: {
    fixtureCount: fixturesToCheck.length,
    thresholdFixtureCount: thresholdProfile.fixtures.length,
    fixturesChecked: fixtureResults.filter((fixture) => fixture.frameCountChecked > 0).length,
    frameCountChecked: fixtureResults.reduce((sum, fixture) => sum + fixture.frameCountChecked, 0),
    failedFixtureCount: failedFixtures.length,
    failedCheckCount: fixtureResults.reduce((sum, fixture) => sum + fixture.failedChecks.length, 0),
    canonicalPromotionAttemptCount: canonicalPromotionAttempts.length,
    unknownFixtureCount: unknownFixtureIds.length
  },
  unknownFixtureIds,
  fixtures: fixtureResults,
  blockers: [
    "retail_capture_required_for_canonical_parity",
    "retail_runtime_tick_dump_required_for_canonical_parity",
    "retail_render_contract_snapshot_required_for_canonical_parity",
    "retail_comparison_required_for_canonical_parity",
    "local_threshold_checks_are_regression_oracles_only"
  ],
  notes: [
    "This checker validates local visual diagnostics against local thresholds only.",
    "Passing threshold checks cannot promote canonical retail parity."
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      result: report.result,
      report: relativePath(outPath),
      summary: report.summary
    },
    null,
    2
  )
);

if (report.result !== "local-oracle-threshold-check-passed") {
  process.exitCode = 1;
}

function checkFrame(fixture, frame) {
  const thresholds = fixture.thresholds;
  const failedChecks = [];

  requireBoolean(frame.canvasNonblank, thresholds.requiredBooleans?.canvasNonblank, "canvasNonblank", failedChecks);
  requireBoolean(
    frame.localStructuralVisible,
    thresholds.requiredBooleans?.localStructuralVisible,
    "localStructuralVisible",
    failedChecks
  );
  requireBoolean(
    frame.canonicalParityPromoted,
    thresholds.requiredBooleans?.canonicalParityPromoted,
    "canonicalParityPromoted",
    failedChecks
  );

  for (const [artifactName, expected] of Object.entries(thresholds.requiredBooleans ?? {})) {
    if (!artifactName.endsWith("Exists")) {
      continue;
    }
    requireBoolean(frame.artifactAvailability?.[artifactName], expected, artifactName, failedChecks);
  }

  checkRange(frame.objectPixels, thresholds.objectPixels, "objectPixels", failedChecks);
  checkRange(frame.screenshotBytes, thresholds.screenshotBytes, "screenshotBytes", failedChecks);
  checkMinMax(
    frame.connectedComponentCount,
    thresholds.connectedComponentCount?.allowedMin,
    thresholds.connectedComponentCount?.allowedMax,
    "connectedComponentCount",
    failedChecks
  );
  checkExactWhenStable(
    frame.drawParticleCount,
    thresholds.drawParticleCount?.expectedExactWhenStable,
    "drawParticleCount",
    failedChecks
  );
  checkExactWhenStable(
    frame.drawVertexCount,
    thresholds.drawVertexCount?.expectedExactWhenStable,
    "drawVertexCount",
    failedChecks
  );
  checkExactWhenStable(
    frame.drawRecordCount,
    thresholds.drawRecordCount?.expectedExactWhenStable,
    "drawRecordCount",
    failedChecks
  );
  checkAllowedString(frame.drawLane, thresholds.drawLane, "drawLane", failedChecks);
  checkAllowedString(frame.renderMode, thresholds.renderMode, "renderMode", failedChecks);
  checkAllowedString(frame.blendMode, thresholds.blendMode, "blendMode", failedChecks);
  checkAllowedString(frame.textureProfile, thresholds.textureProfile, "textureProfile", failedChecks);
  checkBounds(frame.bounds, thresholds.boundsEnvelope?.allowed, failedChecks);

  return {
    path: frame.path,
    source: frame.source ?? "explicit-correlation",
    timeSeconds: frame.timeSeconds,
    seed: frame.seed,
    status: failedChecks.length === 0 ? "passed" : "failed",
    failedChecks,
    canonicalParityPromoted: frame.canonicalParityPromoted === true,
    metrics: {
      objectPixels: frame.objectPixels,
      screenshotBytes: frame.screenshotBytes,
      connectedComponentCount: frame.connectedComponentCount,
      drawParticleCount: frame.drawParticleCount,
      drawVertexCount: frame.drawVertexCount,
      drawRecordCount: frame.drawRecordCount,
      drawLane: frame.drawLane,
      renderMode: frame.renderMode,
      blendMode: frame.blendMode,
      textureProfile: frame.textureProfile,
      bounds: frame.bounds
    }
  };
}

function readCorrelationFrame(filePath) {
  const resolvedPath = path.resolve(repoRoot, filePath);
  const correlation = readJson(resolvedPath);
  const snapshot = readOptionalJson(correlation.artifacts?.renderContractSnapshot);
  const screenshotPath = correlation.artifacts?.screenshot
    ? path.join(repoRoot, correlation.artifacts.screenshot)
    : null;
  const drawRecords = snapshot?.renderContract?.drawRecords ?? snapshot?.drawRecords ?? [];

  return {
    fixtureId: correlation.fixtureId,
    path: relativePath(resolvedPath),
    source: "explicit-correlation",
    timeSeconds: correlation.timeSeconds,
    seed: correlation.seed,
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
      frameExists: existsRelative(correlation.artifacts?.frame),
      comparisonExists: existsRelative(correlation.artifacts?.comparison),
      renderContractSnapshotExists: existsRelative(correlation.artifacts?.renderContractSnapshot)
    }
  };
}

function writeMissingThresholdReport(thresholdPath, outPath) {
  const report = {
    version: "aurora-vfx-local-oracle-threshold-check-report/v1",
    generatedAt: new Date().toISOString(),
    thresholdProfile: relativePath(thresholdPath),
    checkedMode: "threshold-profile-selected-frames",
    explicitCorrelations: [],
    result: "local-oracle-threshold-check-failed",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    summary: {
      fixtureCount: 0,
      thresholdFixtureCount: 0,
      fixturesChecked: 0,
      frameCountChecked: 0,
      failedFixtureCount: 0,
      failedCheckCount: 1,
      canonicalPromotionAttemptCount: 0,
      unknownFixtureCount: 0
    },
    unknownFixtureIds: [],
    fixtures: [],
    failedChecks: ["thresholdProfileMissing"],
    blockers: [
      "local_threshold_profile_missing",
      "retail_capture_required_for_canonical_parity",
      "retail_runtime_tick_dump_required_for_canonical_parity",
      "retail_render_contract_snapshot_required_for_canonical_parity",
      "retail_comparison_required_for_canonical_parity",
      "local_threshold_checks_are_regression_oracles_only"
    ],
    notes: [
      "The local threshold profile is missing, so no threshold frame checks were run.",
      "This failure cannot promote canonical retail parity."
    ]
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        result: report.result,
        report: relativePath(outPath),
        summary: report.summary
      },
      null,
      2
    )
  );
}

function requireBoolean(actual, expected, name, failedChecks) {
  if (typeof expected !== "boolean") {
    return;
  }
  if (actual !== expected) {
    failedChecks.push(name);
  }
}

function checkRange(value, threshold, name, failedChecks) {
  if (!threshold) {
    return;
  }
  checkMinMax(value, threshold.allowedMin, threshold.allowedMax, name, failedChecks);
}

function checkMinMax(value, min, max, name, failedChecks) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    failedChecks.push(name);
    return;
  }
  if (value < min || value > max) {
    failedChecks.push(name);
  }
}

function checkExactWhenStable(value, expected, name, failedChecks) {
  if (!Number.isFinite(expected)) {
    return;
  }
  if (value !== expected) {
    failedChecks.push(name);
  }
}

function checkAllowedString(value, allowedValues, name, failedChecks) {
  if (!Array.isArray(allowedValues) || allowedValues.length === 0) {
    return;
  }
  if (!allowedValues.includes(value)) {
    failedChecks.push(name);
  }
}

function checkBounds(bounds, allowed, failedChecks) {
  if (!allowed) {
    return;
  }
  if (!bounds) {
    failedChecks.push("bounds");
    return;
  }
  if (bounds.x0 < allowed.x0 || bounds.y0 < allowed.y0 || bounds.x1 > allowed.x1 || bounds.y1 > allowed.y1) {
    failedChecks.push("bounds");
  }
}

function groupByFixture(frames) {
  const grouped = new Map();
  for (const frame of frames) {
    const bucket = grouped.get(frame.fixtureId) ?? [];
    bucket.push(frame);
    grouped.set(frame.fixtureId, bucket);
  }
  return grouped;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--thresholds") {
      parsed.thresholds = rawArgs[++index];
    } else if (arg === "--out") {
      parsed.out = rawArgs[++index];
    } else if (arg === "--correlation") {
      parsed.correlation = [...(parsed.correlation ?? []), rawArgs[++index]];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalJson(relativeFilePath) {
  if (!relativeFilePath) {
    return null;
  }
  const filePath = path.join(repoRoot, relativeFilePath);
  return fs.existsSync(filePath) ? readJson(filePath) : null;
}

function existsRelative(relativeFilePath) {
  return Boolean(relativeFilePath) && fs.existsSync(path.join(repoRoot, relativeFilePath));
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}
