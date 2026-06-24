import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = path.join(repoRoot, "backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json");
const artifactsRoot = path.join(repoRoot, "backend/docs/aurora-reverse/artifacts");
const outputPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-84/vfx-visual-coverage-inventory.json"
);

const manifest = readJson(manifestPath);
const artifactFiles = listFiles(artifactsRoot);
const correlationFiles = artifactFiles.filter((filePath) =>
  filePath.endsWith(".contract-visual-correlation.json")
);
const diagnosticReportFiles = artifactFiles.filter((filePath) => filePath.endsWith("-report.json"));

const correlationsByFixture = groupByFixture(
  correlationFiles
    .map((filePath) => readCorrelation(filePath))
    .filter(Boolean)
);
const reportsByFixture = groupByFixture(
  diagnosticReportFiles
    .map((filePath) => readDiagnosticReport(filePath))
    .filter(Boolean)
);

const fixtures = manifest.fixtures.map((fixture) => {
  const correlations = sortByIteration(correlationsByFixture.get(fixture.fixtureId) ?? []);
  const reports = sortByIteration(reportsByFixture.get(fixture.fixtureId) ?? []);
  const latestCorrelation = correlations.at(-1) ?? null;
  const latestReport = reports.at(-1) ?? null;
  const retailMissing = getMissingRetailEvidence(fixture);
  const localTwoFrameDiagnosticComplete =
    Boolean(latestReport) && latestReport.frameCount >= 2 && latestReport.allChecksPassed;

  return {
    fixtureId: fixture.fixtureId,
    requiredCase: fixture.requiredCase,
    manifestStatus: fixture.status,
    behaviorClaim: fixture.behaviorClaim,
    localCoverageStatus: localTwoFrameDiagnosticComplete
      ? "two_frame_local_diagnostic_reported"
      : correlations.length >= 2
        ? "multiple_correlations_no_two_frame_report"
        : correlations.length === 1
          ? "single_correlation_only"
          : "no_local_visual_correlation",
    localCorrelationCount: correlations.length,
    localDiagnosticReportCount: reports.length,
    localTwoFrameDiagnosticComplete,
    latestCorrelation: latestCorrelation
      ? {
          iteration: latestCorrelation.iteration,
          path: latestCorrelation.path,
          timeSeconds: latestCorrelation.timeSeconds,
          seed: latestCorrelation.seed,
          oracle: latestCorrelation.oracle,
          result: latestCorrelation.result,
          canvasNonblank: latestCorrelation.canvasNonblank,
          localStructuralVisible: latestCorrelation.localStructuralVisible,
          canonicalParityPromoted: latestCorrelation.canonicalParityPromoted,
          drawLane: latestCorrelation.drawLane,
          drawParticleCount: latestCorrelation.drawParticleCount,
          drawVertexCount: latestCorrelation.drawVertexCount,
          screenshot: latestCorrelation.screenshot,
          screenshotExists: latestCorrelation.screenshotExists,
          screenshotBytes: latestCorrelation.screenshotBytes,
          frameExists: latestCorrelation.frameExists,
          comparisonExists: latestCorrelation.comparisonExists,
          renderContractSnapshotExists: latestCorrelation.renderContractSnapshotExists
        }
      : null,
    latestDiagnosticReport: latestReport
      ? {
          iteration: latestReport.iteration,
          path: latestReport.path,
          version: latestReport.version,
          result: latestReport.result,
          frameCount: latestReport.frameCount,
          oracle: latestReport.oracle,
          allChecksPassed: latestReport.allChecksPassed,
          canonicalParityPromoted: latestReport.canonicalParityPromoted
        }
      : null,
    canonicalParityStatus:
      retailMissing.length === 0 ? "candidate_retail_evidence_complete" : "blocked_retail_evidence_missing",
    missingRetailEvidence: retailMissing,
    canonicalParityPromoted: false
  };
});

const summary = {
  manifestFixtureCount: fixtures.length,
  fixturesWithAnyLocalCorrelation: fixtures.filter((fixture) => fixture.localCorrelationCount > 0).length,
  fixturesWithTwoFrameLocalDiagnostic: fixtures.filter(
    (fixture) => fixture.localTwoFrameDiagnosticComplete
  ).length,
  fixturesWithCanonicalRetailEvidence: fixtures.filter(
    (fixture) => fixture.canonicalParityStatus === "candidate_retail_evidence_complete"
  ).length,
  canonicalParityPromotedCount: fixtures.filter((fixture) => fixture.canonicalParityPromoted).length,
  fixturesBlockedByRetailEvidence: fixtures.filter(
    (fixture) => fixture.canonicalParityStatus === "blocked_retail_evidence_missing"
  ).length
};

const inventory = {
  version: "aurora-vfx-visual-coverage-inventory/v1",
  generatedAt: new Date().toISOString(),
  sourceManifest: relativePath(manifestPath),
  artifactRoot: relativePath(artifactsRoot),
  oracle: "local-artifact-inventory-plus-retail-manifest-required-evidence",
  canonicalParityPromoted: false,
  localOnlyNotRetailEvidence: true,
  summary,
  fixtures,
  nextLocalWorkQueue: buildNextLocalWorkQueue(fixtures),
  blockers: [
    "blocked_retail_capture",
    "retail_runtime_tick_dumps_missing",
    "retail_render_contract_snapshots_missing",
    "retail_comparison_evidence_missing",
    "local_visual_reports_not_canonical_oracles"
  ],
  notes: [
    "This inventory proves local artifact coverage shape only.",
    "Two-frame local diagnostics do not promote canonical parity without retail build/profile, runtime, render, capture, and comparison evidence."
  ]
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(inventory, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      result: "vfx-visual-coverage-inventory-generated",
      report: relativePath(outputPath),
      summary,
      nextLocalWorkQueue: inventory.nextLocalWorkQueue
    },
    null,
    2
  )
);

function readCorrelation(filePath) {
  const correlation = readJson(filePath);
  if (!correlation.fixtureId) {
    return null;
  }

  const screenshot = correlation.artifacts?.screenshot ?? null;
  const frame = correlation.artifacts?.frame ?? null;
  const comparison = correlation.artifacts?.comparison ?? null;
  const renderContractSnapshot = correlation.artifacts?.renderContractSnapshot ?? null;
  const screenshotPath = screenshot ? path.join(repoRoot, screenshot) : null;

  return {
    fixtureId: correlation.fixtureId,
    path: relativePath(filePath),
    iteration: getIteration(filePath),
    timeSeconds: correlation.timeSeconds,
    seed: correlation.seed,
    oracle: correlation.oracle,
    result: correlation.result,
    canvasNonblank: correlation.checks?.canvasNonblank === true,
    localStructuralVisible: correlation.checks?.localStructuralVisible === true,
    canonicalParityPromoted: correlation.canonicalParityPromoted === true,
    drawLane: correlation.contractMetrics?.drawLane ?? correlation.laneProbe?.drawLane ?? null,
    drawParticleCount: correlation.contractMetrics?.drawParticleCount ?? null,
    drawVertexCount: correlation.contractMetrics?.drawVertexCount ?? null,
    screenshot,
    screenshotExists: screenshotPath ? fs.existsSync(screenshotPath) : false,
    screenshotBytes: screenshotPath && fs.existsSync(screenshotPath) ? fs.statSync(screenshotPath).size : null,
    frameExists: frame ? fs.existsSync(path.join(repoRoot, frame)) : false,
    comparisonExists: comparison ? fs.existsSync(path.join(repoRoot, comparison)) : false,
    renderContractSnapshotExists: renderContractSnapshot
      ? fs.existsSync(path.join(repoRoot, renderContractSnapshot))
      : false
  };
}

function readDiagnosticReport(filePath) {
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
    oracle: report.oracle,
    allChecksPassed: Object.values(report.checks ?? {}).every(Boolean),
    canonicalParityPromoted: report.canonicalParityPromoted === true
  };
}

function getMissingRetailEvidence(fixture) {
  const requiredRefs = [
    ["retailBuild", "evidenceRef"],
    ["effectContext", "evidenceRef"],
    ["parserSnapshot", "path"],
    ["resolverTrace", "path"],
    ["runtimeTickDump", "path"],
    ["renderContractSnapshot", "path"],
    ["captureReference", "screenshotPath"],
    ["comparison", "path"]
  ];

  return requiredRefs
    .filter(([section, field]) => !fixture[section]?.[field])
    .map(([section, field]) => `${section}.${field}`);
}

function buildNextLocalWorkQueue(fixtures) {
  const missingTwoFrame = fixtures
    .filter((fixture) => !fixture.localTwoFrameDiagnosticComplete)
    .map((fixture) => fixture.fixtureId);
  const missingRetail = fixtures
    .filter((fixture) => fixture.canonicalParityStatus === "blocked_retail_evidence_missing")
    .map((fixture) => fixture.fixtureId);

  if (missingTwoFrame.length > 0) {
    return [
      {
        priority: 0,
        kind: "local-visual-diagnostic-gap",
        fixtureIds: missingTwoFrame,
        action: "capture-or-generate two-frame local diagnostic report before any further memory-only loop work"
      }
    ];
  }

  return [
    {
      priority: 0,
      kind: "retail-evidence-blocker",
      fixtureIds: missingRetail,
      action:
        "local two-frame coverage is complete for manifest fixtures; canonical progress now requires retail capture/runtime/render/comparison evidence"
    },
    {
      priority: 1,
      kind: "local-oracle-quality-improvement",
      fixtureIds: fixtures.map((fixture) => fixture.fixtureId),
      action:
        "if retail is still unavailable, improve local diagnostics by adding cross-fixture visual-diff thresholds or runtime-tick diagnostic snapshots without promoting canonical parity"
    }
  ];
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
      String(left.path).localeCompare(String(right.path))
  );
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

function getIteration(filePath) {
  const match = filePath.match(/vfx-iteration-(\d+)/);
  return match ? Number(match[1]) : -1;
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}
