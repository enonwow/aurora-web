#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const manifestPath = path.join(repoRoot, "backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json");
const artifactsRoot = path.join(repoRoot, "backend/docs/aurora-reverse/artifacts");
const defaultOut = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-contract-visual-evidence-report.json"
);

const fixtureRequirements = {
  "vfx-retail-dm-visualeffect-row-68-duration-0": {
    expectedDrawLane: "textured_quad",
    requiredChecks: ["drawParticlesVisible"]
  },
  "vfx-retail-scripted-effectvisualeffect-row-50": {
    expectedDrawLane: "textured_quad",
    requiredChecks: ["drawParticlesVisible"]
  },
  "vfx-retail-scripted-effectbeam-row-210-body-chest": {
    expectedDrawLane: "textured_quad",
    requiredChecks: [
      "effectBeamContextPreserved",
      "effectBeamBodyNodeChestPreserved",
      "effectBeamRetailVolumeNotResolved",
      "effectBeamStartsAtSourceLeft",
      "effectBeamEndsAtTargetRight",
      "effectBeamSegmentsOrdered"
    ]
  },
  "vfx-retail-explosion-detonate-fireball": {
    expectedDrawLane: "textured_quad",
    requiredChecks: ["drawParticlesVisible"]
  },
  "vfx-retail-fountain-atlas-cot-fx01": {
    expectedDrawLane: "textured_quad",
    requiredChecks: [
      "fountainAtlasContextPreserved",
      "fountainAtlasFrameRangePreserved",
      "fountainAtlasRetailPlaybackNotResolved",
      "fountainAtlasDrawRecordsHaveGrid",
      "fountainAtlasFrameIndexesInRange",
      "fountainAtlasUsesMultipleFrames",
      "fountainAtlasMaterialOffsetBlocked"
    ]
  },
  "vfx-retail-chunk-particles-progfx-type9": {
    expectedDrawLane: "chunk_model",
    requiredChecks: [
      "chunkLanePreserved",
      "canonicalResourceUnresolved",
      "noFakeParticleDrawRecords",
      "placeholderVisibleWithoutDrawParticles"
    ],
    expectedCounts: {
      drawParticleCount: 0,
      drawVertexCount: 0,
      drawRecordCount: 0
    }
  },
  "vfx-retail-p2p-gravity-reference-node": {
    expectedDrawLane: "textured_quad",
    requiredChecks: ["p2pArcStartsLeft", "p2pArcEndsRight", "p2pArcMiddleHigherThanEnds"]
  },
  "vfx-retail-linked-chain": {
    expectedDrawLane: "linked_textured_quad",
    requiredChecks: ["linkedLanePreserved"]
  },
  "vfx-retail-punch-through-mode2-lighten": {
    expectedDrawLane: "textured_quad",
    requiredChecks: [
      "blendModeIsLighten",
      "blendModeRawTokenIsMode2Lighten",
      "blendModeNumberIs2",
      "allDrawRecordsUseLighten"
    ]
  },
  "vfx-retail-plt-known-layer-colors": {
    expectedDrawLane: "textured_quad",
    requiredChecks: ["pltLayerCountMatchesDrawRecords", "pltRequiredLayersPresent", "pltLayerColorsAreDistinct"]
  }
};

const args = parseArgs(process.argv.slice(2));
const outPath = path.resolve(repoRoot, args.out ?? defaultOut);

const manifest = readJson(manifestPath);
const fixtureIds = (manifest.fixtures ?? []).map((fixture) => fixture.fixtureId).filter(Boolean);
const correlations = collectFiles(artifactsRoot, (file) => file.endsWith(".contract-visual-correlation.json"))
  .map((file) => ({ file, data: readJson(file) }))
  .filter((entry) => fixtureIds.includes(entry.data.fixtureId));

const latestByFixture = new Map();
for (const entry of correlations) {
  const current = latestByFixture.get(entry.data.fixtureId);
  if (!current || compareCorrelation(entry, current) > 0) {
    latestByFixture.set(entry.data.fixtureId, entry);
  }
}

const fixtures = fixtureIds.map((fixtureId) => checkFixture(fixtureId, latestByFixture.get(fixtureId)));
const failedFixtures = fixtures.filter((fixture) => fixture.failedChecks.length > 0);
const canonicalPromotionAttemptCount = fixtures.filter(
  (fixture) => fixture.canonicalParityPromoted === true || fixture.thresholdCanonicalParityPromoted === true
).length;
const visualSemanticOracleMissingCount = fixtures.filter(
  (fixture) => fixture.visualSemanticOraclePresent !== true
).length;
const visualSemanticCheckCount = fixtures.reduce((sum, fixture) => sum + fixture.visualSemanticCheckCount, 0);
const visualSemanticCheckFailedCount = fixtures.reduce(
  (sum, fixture) => sum + fixture.failedVisualSemanticChecks.length,
  0
);
const humanReviewNeededMissingCount = fixtures.filter(
  (fixture) => fixture.humanReviewNeededMissing === true
).length;

const report = {
  version: "aurora-vfx-contract-visual-evidence-report/v1",
  generatedAt: new Date().toISOString(),
  oracle: "local-contract-aware-visual-evidence-set",
  result:
    failedFixtures.length === 0 && canonicalPromotionAttemptCount === 0
      ? "local-contract-visual-evidence-set-passed"
      : "local-contract-visual-evidence-set-failed",
  fixtureCount: fixtureIds.length,
  checkedFixtureCount: fixtures.filter((fixture) => fixture.correlationPath !== null).length,
  failedFixtureCount: failedFixtures.length,
  failedCheckCount: fixtures.reduce((sum, fixture) => sum + fixture.failedChecks.length, 0),
  visualArtifactMissingCount: fixtures.reduce((sum, fixture) => sum + fixture.missingVisualArtifacts.length, 0),
  visualArtifactMismatchCount: fixtures.reduce((sum, fixture) => sum + fixture.visualArtifactMismatches.length, 0),
  renderContractHashMismatchCount: fixtures.reduce(
    (sum, fixture) => sum + fixture.renderContractHashMismatches.length,
    0
  ),
  semanticRequirementCount: fixtures.reduce((sum, fixture) => sum + fixture.requiredChecks.length, 0),
  semanticRequirementFailedCount: fixtures.reduce(
    (sum, fixture) => sum + fixture.failedRequiredChecks.length,
    0
  ),
  visualSemanticOracleMissingCount,
  visualSemanticCheckCount,
  visualSemanticCheckFailedCount,
  humanReviewNeededMissingCount,
  requirementsAppliedCount: fixtures.filter((fixture) => fixture.requirementsApplied === true).length,
  canonicalPromotionAttemptCount,
  fixtures,
  notes: [
    "This report checks local contract-aware visual evidence only.",
    "Passing this report must not promote canonical parity without retail build/runtime/render/capture/comparison evidence."
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ result: report.result, report: toRepoPath(outPath), summary: summarize(report) }, null, 2));

if (report.result !== "local-contract-visual-evidence-set-passed") {
  process.exit(1);
}

function checkFixture(fixtureId, entry) {
  if (!entry) {
    return {
      fixtureId,
      correlationPath: null,
      failedChecks: ["correlationArtifactMissing"],
      missingVisualArtifacts: ["renderContractSnapshot", "screenshot", "frame"],
      visualArtifactMismatches: [],
      requiredChecks: [],
      failedRequiredChecks: [],
      visualSemanticOraclePresent: false,
      visualSemanticCheckCount: 0,
      failedVisualSemanticChecks: [],
      humanReviewNeededFor: [],
      humanReviewNeededMissing: true,
      requirementsApplied: false,
      canonicalParityPromoted: null,
      thresholdCanonicalParityPromoted: null
    };
  }

  const correlation = entry.data;
  const renderContractPath = resolveArtifact(correlation.artifacts?.renderContractSnapshot);
  const screenshotPath = resolveArtifact(correlation.artifacts?.screenshot);
  const framePath = resolveArtifact(correlation.artifacts?.frame);
  const comparisonPath = resolveArtifact(correlation.artifacts?.comparison);
  const thresholdPath = entry.file.replace(/\.contract-visual-correlation\.json$/, ".local-threshold-check.json");
  const renderContractSnapshot =
    renderContractPath && fs.existsSync(renderContractPath) ? readJson(renderContractPath) : null;
  const frame = framePath && fs.existsSync(framePath) ? readJson(framePath) : null;
  const comparison = comparisonPath && fs.existsSync(comparisonPath) ? readJson(comparisonPath) : null;
  const threshold = fs.existsSync(thresholdPath) ? readJson(thresholdPath) : null;
  const requirements = fixtureRequirements[fixtureId] ?? null;
  const requiredChecks = requirements?.requiredChecks ?? [];
  const failedRequiredChecks = [];
  const visualSemanticOracle = correlation.visualSemanticOracle ?? null;
  const visualSemanticChecks = correlation.visualSemanticChecks ?? null;
  const failedVisualSemanticChecks = [];
  const humanReviewNeeded = Array.isArray(visualSemanticOracle?.humanReviewNeeded)
    ? visualSemanticOracle.humanReviewNeeded
    : [];
  const humanReviewNeededFor = humanReviewNeeded
    .map((entry) => entry?.missingOracle)
    .filter((entry) => typeof entry === "string" && entry.length > 0);
  let humanReviewNeededMissing = humanReviewNeeded.length === 0;
  const missingVisualArtifacts = [];
  const visualArtifactMismatches = [];
  const renderContractHashMismatches = [];
  const failedChecks = [];

  if (correlation.result !== "render-contract-and-visual-output-correlated-local-diagnostic") {
    failedChecks.push("correlationResultNotLocalDiagnostic");
  }
  if (correlation.canonicalParityPromoted !== false) {
    failedChecks.push("correlationCanonicalPromotionAttempt");
  }
  if (correlation.localOnlyNotRetailEvidence !== true) {
    failedChecks.push("correlationMissingLocalOnlyMarker");
  }
  if (correlation.checks?.canvasNonblank !== true) {
    failedChecks.push("canvasNonblankCheckMissing");
  }
  if (correlation.checks?.localStructuralVisible !== true) {
    failedChecks.push("localStructuralVisibleCheckMissing");
  }
  if (correlation.checks?.localOnlyNotCanonical !== true) {
    failedChecks.push("localOnlyNotCanonicalCheckMissing");
  }
  if (!visualSemanticOracle || typeof visualSemanticOracle !== "object") {
    failedChecks.push("visualSemanticOracleMissing");
  } else {
    if (visualSemanticOracle.fixtureId !== fixtureId) {
      failedChecks.push("visualSemanticOracleFixtureMismatch");
    }
  }
  if (!visualSemanticChecks || typeof visualSemanticChecks !== "object") {
    failedChecks.push("visualSemanticChecksMissing");
  } else {
    for (const [checkName, checkValue] of Object.entries(visualSemanticChecks)) {
      if (checkValue !== true) {
        failedVisualSemanticChecks.push(checkName);
        failedChecks.push(`visualSemanticCheckFailed:${checkName}`);
      }
    }
    if (visualSemanticChecks.localOnlyNotCanonical !== true) {
      failedVisualSemanticChecks.push("localOnlyNotCanonical");
      failedChecks.push("visualSemanticCheckMissing:localOnlyNotCanonical");
    }
  }
  if (humanReviewNeededMissing) {
    failedChecks.push("humanReviewNeededMissing");
  }
  for (const [index, entry] of humanReviewNeeded.entries()) {
    if (!entry?.missingOracle) {
      failedChecks.push(`humanReviewNeededMissingOracle:${index}`);
    }
    if (!entry?.reason) {
      failedChecks.push(`humanReviewNeededMissingReason:${index}`);
    }
    if (entry?.blocksCanonicalParity !== true) {
      failedChecks.push(`humanReviewNeededDoesNotBlockCanonical:${index}`);
    }
  }
  if (!renderContractPath || !fs.existsSync(renderContractPath)) {
    missingVisualArtifacts.push("renderContractSnapshot");
    failedChecks.push("renderContractSnapshotMissing");
  }
  if (renderContractSnapshot) {
    if (renderContractSnapshot.fixtureId !== fixtureId) {
      visualArtifactMismatches.push("renderContractFixtureId");
      failedChecks.push("renderContractFixtureMismatch");
    }
    if (renderContractSnapshot.timeSeconds !== correlation.timeSeconds) {
      visualArtifactMismatches.push("renderContractTimeSeconds");
      failedChecks.push("renderContractTimeSecondsMismatch");
    }
    if (renderContractSnapshot.seed !== correlation.seed) {
      visualArtifactMismatches.push("renderContractSeed");
      failedChecks.push("renderContractSeedMismatch");
    }
    if (renderContractSnapshot.canonicalParityPromoted !== false) {
      failedChecks.push("renderContractCanonicalPromotionAttempt");
    }
    if (renderContractSnapshot.localOnlyNotRetailEvidence !== true) {
      failedChecks.push("renderContractMissingLocalOnlyMarker");
    }

    const snapshotMetrics = renderContractSnapshot.metrics ?? {};
    const correlationMetrics = correlation.contractMetrics ?? {};
    for (const metricName of [
      "drawLane",
      "activeParticleCount",
      "drawParticleCount",
      "drawVertexCount",
      "drawRecordCount",
      "renderContractSha256",
      "payloadContractsSha256"
    ]) {
      if (snapshotMetrics[metricName] !== correlationMetrics[metricName]) {
        renderContractHashMismatches.push(`metricMismatch:${metricName}`);
        failedChecks.push(`renderContractMetricMismatch:${metricName}`);
      }
    }

    const actualRenderContractSha256 = sha256Json(renderContractSnapshot.renderContract);
    if (actualRenderContractSha256 !== snapshotMetrics.renderContractSha256) {
      renderContractHashMismatches.push("renderContractSha256");
      failedChecks.push("renderContractSha256Mismatch");
    }

    const contractsForHash = {
      sourceRows: renderContractSnapshot.sourceRows,
      effectInstance: renderContractSnapshot.effectInstance,
      phaseSchedule: renderContractSnapshot.phaseSchedule,
      dependencyGraph: renderContractSnapshot.dependencyGraph,
      runtimeState: renderContractSnapshot.runtimeState,
      renderContract: renderContractSnapshot.renderContract
    };
    const actualPayloadContractsSha256 = sha256Json(contractsForHash);
    if (actualPayloadContractsSha256 !== snapshotMetrics.payloadContractsSha256) {
      renderContractHashMismatches.push("payloadContractsSha256");
      failedChecks.push("payloadContractsSha256Mismatch");
    }
  }
  const screenshotBytes = screenshotPath && fs.existsSync(screenshotPath) ? fs.statSync(screenshotPath).size : null;

  if (!screenshotPath || !fs.existsSync(screenshotPath)) {
    missingVisualArtifacts.push("screenshot");
    failedChecks.push("screenshotMissing");
  } else if (screenshotBytes <= 0) {
    failedChecks.push("screenshotEmpty");
  }
  if (!framePath || !fs.existsSync(framePath)) {
    missingVisualArtifacts.push("frame");
    failedChecks.push("frameMissing");
  }
  if (frame?.fixtureId !== fixtureId) {
    visualArtifactMismatches.push("frameFixtureId");
    failedChecks.push("frameFixtureMismatch");
  }
  if (frame && frame.timeSeconds !== correlation.timeSeconds) {
    visualArtifactMismatches.push("frameTimeSeconds");
    failedChecks.push("frameTimeSecondsMismatch");
  }
  if (frame && frame.seed !== correlation.seed) {
    visualArtifactMismatches.push("frameSeed");
    failedChecks.push("frameSeedMismatch");
  }
  if (frame?.screenshot && screenshotPath && path.resolve(frame.screenshot) !== path.resolve(screenshotPath)) {
    visualArtifactMismatches.push("frameScreenshotPath");
    failedChecks.push("frameScreenshotPathMismatch");
  }
  if (frame?.domStatus?.renderStatus !== "rendered") {
    failedChecks.push("frameRenderStatusNotRendered");
  }
  if (frame?.domStatus?.canvasNonblank !== "true" && frame?.domStatus?.canvasNonblank !== true) {
    failedChecks.push("frameCanvasNonblankMissing");
  }
  if (Number(frame?.screenshotBytes ?? 0) <= 0) {
    failedChecks.push("frameScreenshotBytesMissing");
  }
  if (screenshotBytes !== null && frame?.screenshotBytes !== screenshotBytes) {
    visualArtifactMismatches.push("frameScreenshotBytes");
    failedChecks.push("frameScreenshotBytesMismatch");
  }
  if (frame?.domStatus?.fixtureId !== fixtureId) {
    visualArtifactMismatches.push("frameDomFixtureId");
    failedChecks.push("frameDomFixtureMismatch");
  }
  if (Number(frame?.domStatus?.drawParticles ?? NaN) !== (correlation.contractMetrics?.drawParticleCount ?? NaN)) {
    visualArtifactMismatches.push("frameDomDrawParticles");
    failedChecks.push("frameDomDrawParticlesMismatch");
  }
  if (Number(frame?.domStatus?.objectPixels ?? 0) <= 0) {
    failedChecks.push("frameDomObjectPixelsMissing");
  }
  if (frame?.domStatus?.canonicalParityPromoted !== "false" && frame?.domStatus?.canonicalParityPromoted !== false) {
    failedChecks.push("frameCanonicalPromotionAttempt");
  }
  if (comparison?.contractChecks?.result !== "passed") {
    failedChecks.push("comparisonContractChecksNotPassed");
  }
  if ((comparison?.contractChecks?.failedChecks?.length ?? 0) !== 0) {
    failedChecks.push("comparisonContractFailedChecksPresent");
  }
  if (comparison?.canonicalParityPromoted !== false || comparison?.contractChecks?.canonicalParityPromoted !== false) {
    failedChecks.push("comparisonCanonicalPromotionAttempt");
  }
  if (threshold?.result !== "local-oracle-threshold-check-passed") {
    failedChecks.push("thresholdCheckNotPassed");
  }
  if ((threshold?.summary?.failedCheckCount ?? 1) !== 0) {
    failedChecks.push("thresholdFailedChecksPresent");
  }
  if (threshold?.canonicalParityPromoted !== false) {
    failedChecks.push("thresholdCanonicalPromotionAttempt");
  }
  if (!requirements) {
    failedChecks.push("fixtureSemanticRequirementsMissing");
  } else {
    const actualDrawLane = correlation.contractMetrics?.drawLane ?? null;
    if (requirements.expectedDrawLane && actualDrawLane !== requirements.expectedDrawLane) {
      failedChecks.push("fixtureExpectedDrawLaneMismatch");
    }

    for (const checkName of requiredChecks) {
      if (correlation.checks?.[checkName] !== true) {
        failedRequiredChecks.push(checkName);
        failedChecks.push(`requiredCheckMissing:${checkName}`);
      }
    }

    for (const [countName, expectedValue] of Object.entries(requirements.expectedCounts ?? {})) {
      if (correlation.contractMetrics?.[countName] !== expectedValue) {
        failedChecks.push(`expectedCountMismatch:${countName}`);
      }
    }
  }

  return {
    fixtureId,
    correlationPath: toRepoPath(entry.file),
    renderContractPath: renderContractPath ? toRepoPath(renderContractPath) : null,
    screenshotPath: screenshotPath ? toRepoPath(screenshotPath) : null,
    framePath: framePath ? toRepoPath(framePath) : null,
    comparisonPath: comparisonPath ? toRepoPath(comparisonPath) : null,
    thresholdPath: fs.existsSync(thresholdPath) ? toRepoPath(thresholdPath) : null,
    generatedAt: correlation.generatedAt ?? null,
    iteration: readIteration(entry.file),
    result: correlation.result ?? null,
    canonicalParityPromoted: correlation.canonicalParityPromoted ?? null,
    thresholdCanonicalParityPromoted: threshold?.canonicalParityPromoted ?? null,
    drawLane: correlation.contractMetrics?.drawLane ?? null,
    drawParticleCount: correlation.contractMetrics?.drawParticleCount ?? null,
    drawVertexCount: correlation.contractMetrics?.drawVertexCount ?? null,
    drawRecordCount: correlation.contractMetrics?.drawRecordCount ?? null,
    renderContractSha256: correlation.contractMetrics?.renderContractSha256 ?? null,
    payloadContractsSha256: correlation.contractMetrics?.payloadContractsSha256 ?? null,
    requirementsApplied: requirements !== null,
    expectedDrawLane: requirements?.expectedDrawLane ?? null,
    expectedCounts: requirements?.expectedCounts ?? null,
    requiredChecks,
    passedRequiredChecks: requiredChecks.filter((checkName) => correlation.checks?.[checkName] === true),
    failedRequiredChecks,
    visualSemanticOraclePresent: Boolean(visualSemanticOracle && typeof visualSemanticOracle === "object"),
    visualSemanticCheckCount:
      visualSemanticChecks && typeof visualSemanticChecks === "object"
        ? Object.keys(visualSemanticChecks).length
        : 0,
    failedVisualSemanticChecks,
    humanReviewNeededFor,
    humanReviewNeededMissing,
    objectPixels: correlation.comparisonMetrics?.objectPixels ?? null,
    connectedComponentCount: correlation.comparisonMetrics?.connectedComponentCount ?? null,
    screenshotBytes,
    frameScreenshotBytes: frame?.screenshotBytes ?? null,
    frameTimeSeconds: frame?.timeSeconds ?? null,
    frameSeed: frame?.seed ?? null,
    frameRenderStatus: frame?.domStatus?.renderStatus ?? null,
    frameCanvasNonblank: frame?.domStatus?.canvasNonblank ?? null,
    frameDrawParticles: frame?.domStatus?.drawParticles ?? null,
    frameObjectPixels: frame?.domStatus?.objectPixels ?? null,
    contractChecksResult: comparison?.contractChecks?.result ?? null,
    thresholdResult: threshold?.result ?? null,
    missingVisualArtifacts,
    visualArtifactMismatches,
    renderContractHashMismatches,
    failedChecks
  };
}

function compareCorrelation(left, right) {
  const leftIteration = readIteration(left.file);
  const rightIteration = readIteration(right.file);
  if (leftIteration !== rightIteration) return leftIteration - rightIteration;
  return String(left.data.generatedAt ?? "").localeCompare(String(right.data.generatedAt ?? ""));
}

function readIteration(file) {
  const match = file.replaceAll("\\", "/").match(/vfx-iteration-(\d+)\//);
  return match ? Number(match[1]) : -1;
}

function resolveArtifact(repoPath) {
  return repoPath ? path.resolve(repoRoot, repoPath) : null;
}

function collectFiles(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, predicate, acc);
    } else if (entry.isFile() && predicate(fullPath)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function summarize(report) {
  return {
    fixtureCount: report.fixtureCount,
    checkedFixtureCount: report.checkedFixtureCount,
    failedFixtureCount: report.failedFixtureCount,
    failedCheckCount: report.failedCheckCount,
    visualArtifactMissingCount: report.visualArtifactMissingCount,
    visualArtifactMismatchCount: report.visualArtifactMismatchCount,
    renderContractHashMismatchCount: report.renderContractHashMismatchCount,
    semanticRequirementCount: report.semanticRequirementCount,
    semanticRequirementFailedCount: report.semanticRequirementFailedCount,
    visualSemanticOracleMissingCount: report.visualSemanticOracleMissingCount,
    visualSemanticCheckCount: report.visualSemanticCheckCount,
    visualSemanticCheckFailedCount: report.visualSemanticCheckFailedCount,
    humanReviewNeededMissingCount: report.humanReviewNeededMissingCount,
    requirementsAppliedCount: report.requirementsAppliedCount,
    canonicalPromotionAttemptCount: report.canonicalPromotionAttemptCount
  };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stableJson(value))).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return value.map(stableJson);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableJson(entry)])
  );
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--out") {
      parsed.out = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function toRepoPath(file) {
  return path.relative(repoRoot, file).replaceAll("\\", "/");
}
