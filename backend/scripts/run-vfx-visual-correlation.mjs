import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}

async function main(argv) {
  const options = parseArgs(argv);
  const fixtureId = requiredOption(options, "fixture");
  const timeSeconds = options.time ?? "0.5";
  const seed = options.seed ?? "1";
  const iteration = options.iteration ?? "manual";
  const name = sanitizeFileStem(options.name ?? `${fixtureId}-time-${timeSeconds}-seed-${seed}`);
  const outDir = path.resolve(
    repoRoot,
    options.outDir ?? `backend/docs/aurora-reverse/artifacts/vfx-iteration-${iteration}`
  );
  const snapshotPath = path.join(outDir, `${name}.render-contract-snapshot.json`);
  const framePath = path.join(outDir, `${name}-contract-check.frame.json`);
  const comparisonPath = path.join(outDir, `${name}-contract-check.comparison.json`);
  const correlationPath = path.join(outDir, `${name}.contract-visual-correlation.json`);
  const thresholdCheckPath = path.resolve(
    repoRoot,
    options.thresholdCheckOut ?? path.join(outDir, `${name}.local-threshold-check.json`)
  );

  fs.mkdirSync(outDir, { recursive: true });

  await runCommand("node", [
    "scripts/export-vfx-render-contract-snapshot.mjs",
    "--fixture",
    fixtureId,
    "--time",
    timeSeconds,
    "--seed",
    seed,
    "--out",
    path.relative(path.join(repoRoot, "frontend"), snapshotPath)
  ], {
    cwd: path.join(repoRoot, "frontend")
  });

  const snapshot = readJson(snapshotPath);
  validateFixtureSnapshotIds({ fixtureId, snapshot });

  await runCommand("node", [
    "backend/scripts/capture-vfx-fixture-cdp.mjs",
    "--fixture",
    fixtureId,
    "--time",
    timeSeconds,
    "--seed",
    seed,
    "--outDir",
    outDir,
    "--name",
    `${name}-contract-check`
  ], {
    cwd: repoRoot
  });

  await runCommand("node", [
    "backend/scripts/analyze-vfx-capture.mjs",
    "--frame",
    framePath,
    "--snapshot",
    snapshotPath,
    "--out",
    comparisonPath
  ], {
    cwd: repoRoot
  });

  const frame = readJson(framePath);
  const comparison = readJson(comparisonPath);
  const correlation = createCorrelation({
    snapshot,
    frame,
    comparison,
    snapshotPath: toRepoPath(snapshotPath),
    screenshotPath: toRepoPath(path.join(outDir, `${name}-contract-check.png`)),
    framePath: toRepoPath(framePath),
    comparisonPath: toRepoPath(comparisonPath)
  });

  fs.writeFileSync(correlationPath, `${JSON.stringify(correlation, null, 2)}\n`);

  const failedChecks = getFailedChecks(correlation);
  if (failedChecks.length > 0) {
    throw new Error(`Correlation failed checks: ${failedChecks.join(", ")}`);
  }

  const thresholdCheck = options.checkThresholds === "true"
    ? await runLocalThresholdCheck({
        correlationPath,
        thresholdPath: options.thresholds,
        thresholdCheckPath
      })
    : null;

  console.log(
    JSON.stringify(
      {
        fixtureId,
        timeSeconds: Number(timeSeconds),
        seed: Number(seed),
        snapshot: toRepoPath(snapshotPath),
        screenshot: correlation.artifacts.screenshot,
        frame: correlation.artifacts.frame,
        comparison: correlation.artifacts.comparison,
        correlation: toRepoPath(correlationPath),
        thresholdCheck,
        result: correlation.result,
        checks: correlation.checks
      },
      null,
      2
    )
  );
}

async function runLocalThresholdCheck({ correlationPath, thresholdPath, thresholdCheckPath }) {
  const args = [
    "backend/scripts/check-vfx-local-oracle-thresholds.mjs",
    "--correlation",
    toRepoPath(correlationPath),
    "--out",
    toRepoPath(thresholdCheckPath)
  ];

  if (thresholdPath) {
    args.push("--thresholds", thresholdPath);
  }

  await runCommand("node", args, { cwd: repoRoot });
  const report = readJson(thresholdCheckPath);

  return {
    report: toRepoPath(thresholdCheckPath),
    result: report.result,
    summary: report.summary,
    canonicalParityPromoted: report.canonicalParityPromoted
  };
}

export function validateFixtureSnapshotIds({ fixtureId, snapshot }) {
  if (snapshot.fixtureId !== fixtureId || snapshot.requestedFixtureId !== fixtureId) {
    throw new Error(
      `Fixture id mismatch: requested ${fixtureId}, snapshot requestedFixtureId=${snapshot.requestedFixtureId}, fixtureId=${snapshot.fixtureId}.`
    );
  }
}

export function getFailedChecks(correlation) {
  return Object.entries(correlation.checks)
    .filter(([, value]) => value !== true)
    .map(([key]) => key);
}

export function createEffectBeamStabilityReport(correlations) {
  const frames = Array.isArray(correlations) ? correlations : [];
  const beamFrames = frames.filter(
    (correlation) => correlation.fixtureId === "vfx-retail-scripted-effectbeam-row-210-body-chest"
  );
  const firstFrame = beamFrames[0];
  const drawParticleCounts = new Set(beamFrames.map((frame) => frame.contractMetrics?.drawParticleCount));
  const drawVertexCounts = new Set(beamFrames.map((frame) => frame.contractMetrics?.drawVertexCount));
  const drawRecordCounts = new Set(beamFrames.map((frame) => frame.contractMetrics?.drawRecordCount));
  const bodyNodes = new Set(
    beamFrames.map((frame) => frame.laneProbe?.firstDrawRecord?.atlasProvenance?.bodyNode)
  );
  const firstXs = beamFrames.map((frame) => frame.laneProbe?.firstDrawRecord?.position?.x);
  const lastXs = beamFrames.map((frame) => frame.laneProbe?.lastDrawRecord?.position?.x);
  const requiredSemanticChecks = [
    "effectBeamDrawShape",
    "effectBeamBodyNodeChest",
    "effectBeamSegmentOrder",
    "effectBeamSegmentSpacing",
    "effectBeamAlphaFade",
    "effectBeamParticleSizeWaist",
    "effectBeamFireColorPair",
    "effectBeamFireColorAlternation",
    "effectBeamAtlasAndMaterial",
    "effectBeamDiagnosticBoundary",
    "effectBeamFraming",
    "localOnlyNotCanonical"
  ];
  const semanticCheckPassedEveryFrame = (checkName) =>
    beamFrames.length > 0 && beamFrames.every((frame) => frame.visualSemanticChecks?.[checkName] === true);

  const checks = {
    effectBeamStabilityHasMultipleFrames: beamFrames.length >= 2,
    effectBeamStabilitySameFixture:
      frames.length > 0 && beamFrames.length === frames.length && sameValue(beamFrames.map((frame) => frame.fixtureId)),
    effectBeamStabilityAllFramesPassed:
      beamFrames.length > 0 &&
      beamFrames.every(
        (frame) =>
          frame.result === "render-contract-and-visual-output-correlated-local-diagnostic" &&
          getFailedChecks(frame).length === 0
      ),
    effectBeamStabilityCanonicalBlockedEveryFrame:
      beamFrames.length > 0 &&
      beamFrames.every(
        (frame) => frame.canonicalParityPromoted === false && frame.localOnlyNotRetailEvidence === true
      ),
    effectBeamStabilitySemanticChecksEveryFrame:
      beamFrames.length > 0 &&
      beamFrames.every((frame) =>
        requiredSemanticChecks.every((checkName) => frame.visualSemanticChecks?.[checkName] === true)
      ),
    effectBeamStabilityDrawParticleCountStable: drawParticleCounts.size === 1 && drawParticleCounts.has(5),
    effectBeamStabilityDrawVertexCountStable: drawVertexCounts.size === 1 && drawVertexCounts.has(30),
    effectBeamStabilityDrawRecordCountStable: drawRecordCounts.size === 1 && drawRecordCounts.has(5),
    effectBeamStabilityBodyNodeStable: bodyNodes.size === 1 && bodyNodes.has("BODY_NODE_CHEST"),
    effectBeamStabilitySourceAnchorStable:
      firstXs.length >= 2 && firstXs.every((value) => typeof value === "number" && approxEqual(value, firstXs[0])),
    effectBeamStabilityTargetAnchorStable:
      lastXs.length >= 2 && lastXs.every((value) => typeof value === "number" && approxEqual(value, lastXs[0])),
    effectBeamStabilitySpansSourceToTarget:
      beamFrames.length > 0 &&
      beamFrames.every((frame) => {
        const first = frame.laneProbe?.firstDrawRecord?.position;
        const last = frame.laneProbe?.lastDrawRecord?.position;
        return typeof first?.x === "number" && typeof last?.x === "number" && first.x < 0 && last.x > 0;
      }),
    effectBeamStabilitySegmentOrderEveryFrame: semanticCheckPassedEveryFrame("effectBeamSegmentOrder"),
    effectBeamStabilitySegmentSpacingEveryFrame: semanticCheckPassedEveryFrame("effectBeamSegmentSpacing"),
    effectBeamStabilityAlphaFadeEveryFrame: semanticCheckPassedEveryFrame("effectBeamAlphaFade"),
    effectBeamStabilityParticleSizeWaistEveryFrame: semanticCheckPassedEveryFrame("effectBeamParticleSizeWaist"),
    effectBeamStabilityFireColorAlternationEveryFrame:
      semanticCheckPassedEveryFrame("effectBeamFireColorAlternation"),
    effectBeamStabilityFramingEveryFrame: semanticCheckPassedEveryFrame("effectBeamFraming")
  };

  return {
    version: "aurora-vfx-effectbeam-stability-report/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: firstFrame?.fixtureId ?? null,
    frameCount: frames.length,
    timeSeconds: beamFrames.map((frame) => frame.timeSeconds),
    seeds: beamFrames.map((frame) => frame.seed),
    oracle: "render-contract-local-diagnostic-two-frame-stability",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    checks,
    result: Object.values(checks).every(Boolean)
      ? "effectbeam-two-frame-stability-correlated-local-diagnostic"
      : "effectbeam-two-frame-stability-failed",
    notes: [
      "This compares local EffectBeam visual-correlation artifacts only.",
      "Stable local source/target/body-node structure is not retail beam parity evidence."
    ]
  };
}

export function createFountainAtlasProgressionReport(frames) {
  const normalizedFrames = Array.isArray(frames) ? frames : [];
  const fountainFrames = normalizedFrames.filter(
    (frame) =>
      frame.correlation?.fixtureId === "vfx-retail-fountain-atlas-cot-fx01" &&
      frame.snapshot?.fixtureId === "vfx-retail-fountain-atlas-cot-fx01"
  );
  const firstFrame = fountainFrames[0];
  const correlations = fountainFrames.map((frame) => frame.correlation);
  const snapshots = fountainFrames.map((frame) => frame.snapshot);
  const drawParticleCounts = new Set(correlations.map((correlation) => correlation.contractMetrics?.drawParticleCount));
  const drawVertexCounts = new Set(correlations.map((correlation) => correlation.contractMetrics?.drawVertexCount));
  const drawRecordCounts = new Set(correlations.map((correlation) => correlation.contractMetrics?.drawRecordCount));
  const frameIndexesByFrame = snapshots.map((snapshot) => getFountainAtlasFrameIndexes(snapshot));
  const frameIndexSignatures = frameIndexesByFrame.map((frameIndexes) => frameIndexes.join(","));
  const atlasContexts = snapshots.map((snapshot) => snapshot.renderContract?.fountainAtlas);
  const requiredSemanticChecks = [
    "fountainAtlasDrawShape",
    "fountainAtlasGridAndFrameRange",
    "fountainAtlasFramePlayback",
    "fountainAtlasTrajectory",
    "fountainAtlasUvGrid",
    "fountainAtlasParticleOrder",
    "fountainAtlasAlphaFade",
    "fountainAtlasParticleSizeEnvelope",
    "fountainAtlasAtlasAndMaterial",
    "fountainAtlasDiagnosticBoundary",
    "fountainAtlasFraming",
    "localOnlyNotCanonical"
  ];
  const uvRectsByFrame = snapshots.map((snapshot) =>
    getDrawRecords(snapshot).map((record) => record.atlasUv).filter(Boolean)
  );
  const alphasByFrame = correlations.map((correlation) => correlation.frameStatus?.renderedAlpha ?? []);
  const particleSizeXByFrame = correlations.map((correlation) => correlation.frameStatus?.renderedParticleSizeX ?? []);
  const particleSizeYByFrame = correlations.map((correlation) => correlation.frameStatus?.renderedParticleSizeY ?? []);
  const semanticCheckPassedEveryFrame = (checkName) =>
    correlations.length > 0 && correlations.every((correlation) => correlation.visualSemanticChecks?.[checkName] === true);

  const checks = {
    fountainAtlasProgressionHasMultipleFrames: fountainFrames.length >= 2,
    fountainAtlasProgressionSameFixture:
      normalizedFrames.length > 0 &&
      fountainFrames.length === normalizedFrames.length &&
      sameValue(correlations.map((correlation) => correlation.fixtureId)),
    fountainAtlasProgressionAllFramesPassed:
      correlations.length > 0 &&
      correlations.every(
        (correlation) =>
          correlation.result === "render-contract-and-visual-output-correlated-local-diagnostic" &&
          getFailedChecks(correlation).length === 0
      ),
    fountainAtlasProgressionCanonicalBlockedEveryFrame:
      correlations.length > 0 &&
      correlations.every(
        (correlation) => correlation.canonicalParityPromoted === false && correlation.localOnlyNotRetailEvidence === true
      ),
    fountainAtlasProgressionDrawParticleCountStable: drawParticleCounts.size === 1 && drawParticleCounts.has(6),
    fountainAtlasProgressionDrawVertexCountStable: drawVertexCounts.size === 1 && drawVertexCounts.has(36),
    fountainAtlasProgressionDrawRecordCountStable: drawRecordCounts.size === 1 && drawRecordCounts.has(6),
    fountainAtlasProgressionContextStable:
      atlasContexts.length > 0 &&
      atlasContexts.every(
        (atlas) =>
          atlas?.emitterType === "Fountain" &&
          atlas?.textureRef === "fx_canonical_fire" &&
          atlas?.xgrid === 4 &&
          atlas?.ygrid === 4 &&
          atlas?.fps === 12 &&
          atlas?.frameStart === 0 &&
          atlas?.frameEnd === 15 &&
          atlas?.randomFrameStart === true &&
          atlas?.retailPlaybackResolved === false
      ),
    fountainAtlasProgressionGridStable:
      snapshots.length > 0 &&
      snapshots.every((snapshot) =>
        getDrawRecords(snapshot).every(
          (record) =>
            record.atlasProvenance?.emitterType === "Fountain" &&
            record.atlasProvenance?.textureRef === "fx_canonical_fire" &&
            record.atlasProvenance?.atlasGrid?.x === 4 &&
            record.atlasProvenance?.atlasGrid?.y === 4
        )
      ),
    fountainAtlasProgressionUsesMultipleFramesEveryFrame:
      frameIndexesByFrame.length > 0 && frameIndexesByFrame.every((frameIndexes) => new Set(frameIndexes).size >= 3),
    fountainAtlasProgressionFrameIndexesInRange:
      frameIndexesByFrame.length > 0 &&
      frameIndexesByFrame.every(
        (frameIndexes) =>
          frameIndexes.length === 6 && frameIndexes.every((frameIndex) => frameIndex >= 0 && frameIndex <= 15)
      ),
    fountainAtlasProgressionFrameIndexesAdvanceAcrossFrames:
      frameIndexSignatures.length >= 2 && new Set(frameIndexSignatures).size >= 2,
    fountainAtlasProgressionMaterialOffsetBlockedEveryFrame:
      snapshots.length > 0 &&
      snapshots.every((snapshot) =>
        getDrawRecords(snapshot).every(
          (record) => record.atlasProvenance?.materialLevelFrameOffsetAllowed === false
        )
      ),
    fountainAtlasProgressionSemanticChecksEveryFrame:
      correlations.length > 0 &&
      correlations.every((correlation) =>
        requiredSemanticChecks.every((checkName) => correlation.visualSemanticChecks?.[checkName] === true)
      ),
    fountainAtlasProgressionDrawShapeEveryFrame: semanticCheckPassedEveryFrame("fountainAtlasDrawShape"),
    fountainAtlasProgressionTrajectoryEveryFrame: semanticCheckPassedEveryFrame("fountainAtlasTrajectory"),
    fountainAtlasProgressionAlphaFadeEveryFrame:
      semanticCheckPassedEveryFrame("fountainAtlasAlphaFade") &&
      alphasByFrame.length > 0 &&
      alphasByFrame.every(
        (alphas) =>
          alphas.length === 6 &&
          alphas.every((value) => Number(value) >= 0 && Number(value) <= 1) &&
          alphas.every((value, index) => index === 0 || Number(value) < Number(alphas[index - 1]))
      ),
    fountainAtlasProgressionParticleSizeEnvelopeEveryFrame:
      semanticCheckPassedEveryFrame("fountainAtlasParticleSizeEnvelope") &&
      particleSizeXByFrame.length > 0 &&
      particleSizeXByFrame.every(
        (sizes) =>
          sizes.length === 6 &&
          sizes.every((value) => Number(value) >= 0.32 && Number(value) <= 0.47) &&
          new Set(sizes.map((value) => Number(value).toFixed(3))).size >= 4
      ) &&
      particleSizeYByFrame.length > 0 &&
      particleSizeYByFrame.every(
        (sizes) =>
          sizes.length === 6 &&
          sizes.every((value) => Number(value) >= 0.39 && Number(value) <= 0.55) &&
          new Set(sizes.map((value) => Number(value).toFixed(3))).size >= 4
      ),
    fountainAtlasProgressionUvGridEveryFrame:
      semanticCheckPassedEveryFrame("fountainAtlasUvGrid") &&
      uvRectsByFrame.length > 0 &&
      uvRectsByFrame.every(
        (uvRects) =>
          uvRects.length === 6 &&
          uvRects.every((uvRect) =>
            [uvRect.u0, uvRect.v0, uvRect.u1, uvRect.v1].every(
              (value) =>
                typeof value === "number" &&
                value >= 0 &&
                value <= 1 &&
                approxEqual(value * 4, Math.round(value * 4))
            )
          )
      ),
    fountainAtlasProgressionAtlasAndMaterialEveryFrame:
      semanticCheckPassedEveryFrame("fountainAtlasAtlasAndMaterial"),
    fountainAtlasProgressionFramingEveryFrame: semanticCheckPassedEveryFrame("fountainAtlasFraming")
  };

  return {
    version: "aurora-vfx-fountain-atlas-progression-report/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: firstFrame?.correlation?.fixtureId ?? null,
    frameCount: normalizedFrames.length,
    timeSeconds: correlations.map((correlation) => correlation.timeSeconds),
    seeds: correlations.map((correlation) => correlation.seed),
    frameIndexesByFrame,
    oracle: "render-contract-local-diagnostic-two-frame-atlas-semantic-progression",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    checks,
    result: Object.values(checks).every(Boolean)
      ? "fountain-atlas-two-frame-progression-correlated-local-diagnostic"
      : "fountain-atlas-two-frame-progression-failed",
    notes: [
      "This compares local cot_fx01 Fountain atlas render-contract and browser-output artifacts only.",
      "Atlas frame progression in the local dev runner is not retail playback parity evidence."
    ]
  };
}

export function createMode2LightenStabilityReport(correlations) {
  const frames = Array.isArray(correlations) ? correlations : [];
  const mode2Frames = frames.filter(
    (correlation) => correlation.fixtureId === "vfx-retail-punch-through-mode2-lighten"
  );
  const firstFrame = mode2Frames[0];
  const drawParticleCounts = new Set(mode2Frames.map((frame) => frame.contractMetrics?.drawParticleCount));
  const drawVertexCounts = new Set(mode2Frames.map((frame) => frame.contractMetrics?.drawVertexCount));
  const drawRecordCounts = new Set(mode2Frames.map((frame) => frame.contractMetrics?.drawRecordCount));
  const blendModes = mode2Frames.map((frame) => frame.laneProbe?.blendMode);
  const firstDrawBlendModes = mode2Frames.map((frame) => frame.laneProbe?.firstDrawRecord?.blendMode);
  const lastDrawBlendModes = mode2Frames.map((frame) => frame.laneProbe?.lastDrawRecord?.blendMode);
  const requiredSemanticChecks = [
    "mode2LightenDrawShape",
    "mode2LightenPath",
    "mode2LightenColorAlpha",
    "mode2LightenColorAlternation",
    "mode2LightenParticleSizeEnvelope",
    "mode2LightenBlendMaterial",
    "mode2LightenAtlasAndMaterial",
    "mode2LightenParticleOrder",
    "mode2LightenDiagnosticBoundary",
    "mode2LightenFraming",
    "localOnlyNotCanonical"
  ];
  const alphaByFrame = mode2Frames.map((frame) => frame.frameStatus?.renderedAlpha ?? []);
  const particleSizeXByFrame = mode2Frames.map((frame) => frame.frameStatus?.renderedParticleSizeX ?? []);
  const particleSizeYByFrame = mode2Frames.map((frame) => frame.frameStatus?.renderedParticleSizeY ?? []);
  const semanticCheckPassedEveryFrame = (checkName) =>
    mode2Frames.length > 0 && mode2Frames.every((frame) => frame.visualSemanticChecks?.[checkName] === true);

  const checks = {
    mode2LightenStabilityHasMultipleFrames: mode2Frames.length >= 2,
    mode2LightenStabilitySameFixture:
      frames.length > 0 && mode2Frames.length === frames.length && sameValue(mode2Frames.map((frame) => frame.fixtureId)),
    mode2LightenStabilityAllFramesPassed:
      mode2Frames.length > 0 &&
      mode2Frames.every(
        (frame) =>
          frame.result === "render-contract-and-visual-output-correlated-local-diagnostic" &&
          getFailedChecks(frame).length === 0
      ),
    mode2LightenStabilityCanonicalBlockedEveryFrame:
      mode2Frames.length > 0 &&
      mode2Frames.every(
        (frame) => frame.canonicalParityPromoted === false && frame.localOnlyNotRetailEvidence === true
      ),
    mode2LightenStabilitySemanticChecksEveryFrame:
      mode2Frames.length > 0 &&
      mode2Frames.every((frame) =>
        requiredSemanticChecks.every((checkName) => frame.visualSemanticChecks?.[checkName] === true)
      ),
    mode2LightenStabilityDrawParticleCountStable: drawParticleCounts.size === 1 && drawParticleCounts.has(4),
    mode2LightenStabilityDrawVertexCountStable: drawVertexCounts.size === 1 && drawVertexCounts.has(24),
    mode2LightenStabilityDrawRecordCountStable: drawRecordCounts.size === 1 && drawRecordCounts.has(4),
    mode2LightenStabilityBlendModeStable:
      blendModes.length > 0 && blendModes.every((blendMode) => isMode2LightenBlendMode(blendMode)),
    mode2LightenStabilityFirstDrawRecordLighten:
      firstDrawBlendModes.length > 0 &&
      firstDrawBlendModes.every((blendMode) => isMode2LightenBlendMode(blendMode)),
    mode2LightenStabilityLastDrawRecordLighten:
      lastDrawBlendModes.length > 0 && lastDrawBlendModes.every((blendMode) => isMode2LightenBlendMode(blendMode)),
    mode2LightenStabilityPathEveryFrame: semanticCheckPassedEveryFrame("mode2LightenPath"),
    mode2LightenStabilityColorAlternationEveryFrame:
      semanticCheckPassedEveryFrame("mode2LightenColorAlternation"),
    mode2LightenStabilityAlphaFadeEveryFrame:
      semanticCheckPassedEveryFrame("mode2LightenColorAlpha") &&
      alphaByFrame.length > 0 &&
      alphaByFrame.every(
        (alphas) =>
          alphas.length === 4 &&
          alphas.every((value) => Number(value) >= 0 && Number(value) <= 1) &&
          alphas.every((value, index) => index === 0 || Number(value) < Number(alphas[index - 1]))
      ),
    mode2LightenStabilityParticleSizeEnvelopeEveryFrame:
      semanticCheckPassedEveryFrame("mode2LightenParticleSizeEnvelope") &&
      particleSizeXByFrame.length > 0 &&
      particleSizeXByFrame.every(
        (sizes) => sizes.length === 4 && sizes.every((value) => Number(value) >= 0.34 && Number(value) <= 0.42)
      ) &&
      particleSizeYByFrame.length > 0 &&
      particleSizeYByFrame.every(
        (sizes) => sizes.length === 4 && sizes.every((value) => Number(value) >= 0.34 && Number(value) <= 0.41)
      ),
    mode2LightenStabilityBlendMaterialEveryFrame: semanticCheckPassedEveryFrame("mode2LightenBlendMaterial"),
    mode2LightenStabilityParticleOrderEveryFrame: semanticCheckPassedEveryFrame("mode2LightenParticleOrder"),
    mode2LightenStabilityFramingEveryFrame: semanticCheckPassedEveryFrame("mode2LightenFraming")
  };

  return {
    version: "aurora-vfx-mode2-lighten-stability-report/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: firstFrame?.fixtureId ?? null,
    frameCount: frames.length,
    timeSeconds: mode2Frames.map((frame) => frame.timeSeconds),
    seeds: mode2Frames.map((frame) => frame.seed),
    oracle: "render-contract-local-diagnostic-two-frame-mode2-semantic-stability",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    checks,
    result: Object.values(checks).every(Boolean)
      ? "mode2-lighten-two-frame-stability-correlated-local-diagnostic"
      : "mode2-lighten-two-frame-stability-failed",
    notes: [
      "This compares local Mode2_Lighten visual-correlation artifacts only.",
      "Stable local blend, alpha, color, path, particle-size, and framing semantics are not retail alpha/depth/blend parity evidence."
    ]
  };
}

export function createPltLayerColorStabilityReport(correlations) {
  const frames = Array.isArray(correlations) ? correlations : [];
  const pltFrames = frames.filter((correlation) => correlation.fixtureId === "vfx-retail-plt-known-layer-colors");
  const firstFrame = pltFrames[0];
  const drawParticleCounts = new Set(pltFrames.map((frame) => frame.contractMetrics?.drawParticleCount));
  const drawVertexCounts = new Set(pltFrames.map((frame) => frame.contractMetrics?.drawVertexCount));
  const drawRecordCounts = new Set(pltFrames.map((frame) => frame.contractMetrics?.drawRecordCount));
  const requiredLayers = ["skin", "hair", "cloth1", "cloth2"];
  const layerColorSignatures = pltFrames.map((frame) => getPltLayerColorSignature(frame));
  const layerUvSignatures = pltFrames.map((frame) => getPltLayerUvSignature(frame));
  const layerNamesByFrame = layerColorSignatures.map((signature) => signature.map((entry) => entry.layer).sort());
  const colorKeysByFrame = layerColorSignatures.map((signature) => signature.map((entry) => entry.colorKey).sort());
  const requiredSemanticChecks = [
    "pltLayerDrawShape",
    "pltLayerPaletteOrder",
    "pltLayerColorVectors",
    "pltLayerOpacity",
    "pltLayerParticleSizeEnvelope",
    "pltLayerAtlasFrameOrder",
    "pltLayerUvRectGrid",
    "pltLayerSpatialOrder",
    "pltLayerMaterialAndAtlas",
    "pltLayerDiagnosticBoundary",
    "pltLayerFraming",
    "localOnlyNotCanonical"
  ];
  const semanticCheckPassedEveryFrame = (checkName) =>
    pltFrames.length > 0 && pltFrames.every((frame) => frame.visualSemanticChecks?.[checkName] === true);

  const checks = {
    pltLayerColorStabilityHasMultipleFrames: pltFrames.length >= 2,
    pltLayerColorStabilitySameFixture:
      frames.length > 0 && pltFrames.length === frames.length && sameValue(pltFrames.map((frame) => frame.fixtureId)),
    pltLayerColorStabilityAllFramesPassed:
      pltFrames.length > 0 &&
      pltFrames.every(
        (frame) =>
          frame.result === "render-contract-and-visual-output-correlated-local-diagnostic" &&
          getFailedChecks(frame).length === 0
      ),
    pltLayerColorStabilityCanonicalBlockedEveryFrame:
      pltFrames.length > 0 &&
      pltFrames.every(
        (frame) => frame.canonicalParityPromoted === false && frame.localOnlyNotRetailEvidence === true
      ),
    pltLayerColorStabilitySemanticChecksEveryFrame:
      pltFrames.length > 0 &&
      pltFrames.every((frame) =>
        requiredSemanticChecks.every((checkName) => frame.visualSemanticChecks?.[checkName] === true)
      ),
    pltLayerColorStabilityDrawParticleCountStable: drawParticleCounts.size === 1 && drawParticleCounts.has(4),
    pltLayerColorStabilityDrawVertexCountStable: drawVertexCounts.size === 1 && drawVertexCounts.has(24),
    pltLayerColorStabilityDrawRecordCountStable: drawRecordCounts.size === 1 && drawRecordCounts.has(4),
    pltLayerColorStabilityRequiredLayersEveryFrame:
      layerNamesByFrame.length > 0 &&
      layerNamesByFrame.every((layers) => requiredLayers.every((requiredLayer) => layers.includes(requiredLayer))),
    pltLayerColorStabilityDistinctColorsEveryFrame:
      colorKeysByFrame.length > 0 && colorKeysByFrame.every((colorKeys) => new Set(colorKeys).size >= 4),
    pltLayerColorStabilityLayerColorMappingStable:
      layerColorSignatures.length >= 2 &&
      layerColorSignatures.every(
        (signature) => JSON.stringify(signature) === JSON.stringify(layerColorSignatures[0])
      ),
    pltLayerColorStabilityPaletteOrderEveryFrame: semanticCheckPassedEveryFrame("pltLayerPaletteOrder"),
    pltLayerColorStabilityColorVectorsEveryFrame: semanticCheckPassedEveryFrame("pltLayerColorVectors"),
    pltLayerColorStabilityOpacityEveryFrame: semanticCheckPassedEveryFrame("pltLayerOpacity"),
    pltLayerColorStabilityParticleSizeEnvelopeEveryFrame:
      semanticCheckPassedEveryFrame("pltLayerParticleSizeEnvelope"),
    pltLayerColorStabilityAtlasFrameOrderEveryFrame:
      semanticCheckPassedEveryFrame("pltLayerAtlasFrameOrder"),
    pltLayerColorStabilityUvRectGridEveryFrame:
      semanticCheckPassedEveryFrame("pltLayerUvRectGrid"),
    pltLayerColorStabilitySpatialOrderEveryFrame: semanticCheckPassedEveryFrame("pltLayerSpatialOrder"),
    pltLayerColorStabilityMaterialAndAtlasEveryFrame:
      semanticCheckPassedEveryFrame("pltLayerMaterialAndAtlas"),
    pltLayerColorStabilityFramingEveryFrame: semanticCheckPassedEveryFrame("pltLayerFraming"),
    pltLayerColorStabilityUvRectCountStable:
      layerUvSignatures.length > 0 && layerUvSignatures.every((signature) => signature.length === 4),
    pltLayerColorStabilityUvRectsInsideUnitRangeEveryFrame:
      layerUvSignatures.length > 0 &&
      layerUvSignatures.every((signature) =>
        signature.every((entry) =>
          [entry.u0, entry.v0, entry.u1, entry.v1].every((value) => typeof value === "number" && value >= 0 && value <= 1)
        )
      ),
    pltLayerColorStabilityUvRectsQuarterGridEveryFrame:
      layerUvSignatures.length > 0 &&
      layerUvSignatures.every((signature) =>
        signature.every((entry) =>
          [entry.u0, entry.v0, entry.u1, entry.v1].every(
            (value) => typeof value === "number" && approxEqual(value * 4, Math.round(value * 4))
          )
        )
      )
  };

  return {
    version: "aurora-vfx-plt-layer-color-stability-report/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: firstFrame?.fixtureId ?? null,
    frameCount: frames.length,
    timeSeconds: pltFrames.map((frame) => frame.timeSeconds),
    seeds: pltFrames.map((frame) => frame.seed),
    layerColorSignature: layerColorSignatures[0] ?? [],
    layerUvSignatures,
    oracle: "render-contract-local-diagnostic-two-frame-plt-layer-stability",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    checks,
    result: Object.values(checks).every(Boolean)
      ? "plt-layer-color-two-frame-stability-correlated-local-diagnostic"
      : "plt-layer-color-two-frame-stability-failed",
    notes: [
      "This compares local PLT layer-color visual-correlation artifacts only.",
      "Stable local layer-color, opacity, size, UV, spatial, material, and framing semantics are not retail PLT material/resource parity evidence."
    ]
  };
}

export function createLinkedChainStabilityReport(correlations) {
  const frames = Array.isArray(correlations) ? correlations : [];
  const linkedFrames = frames.filter((correlation) => correlation.fixtureId === "vfx-retail-linked-chain");
  const firstFrame = linkedFrames[0];
  const drawParticleCounts = new Set(linkedFrames.map((frame) => frame.contractMetrics?.drawParticleCount));
  const drawVertexCounts = new Set(linkedFrames.map((frame) => frame.contractMetrics?.drawVertexCount));
  const drawRecordCounts = new Set(linkedFrames.map((frame) => frame.contractMetrics?.drawRecordCount));
  const requiredSemanticChecks = [
    "linkedChainDrawShape",
    "linkedChainPathOrder",
    "linkedChainSegmentSpacing",
    "linkedChainParticleOrder",
    "linkedChainColorPair",
    "linkedChainColorAlternation",
    "linkedChainAlphaFade",
    "linkedChainParticleSizeEnvelope",
    "linkedChainAtlasAndMaterial",
    "linkedChainDiagnosticBoundary",
    "linkedChainFraming",
    "localOnlyNotCanonical"
  ];
  const semanticCheckPassedEveryFrame = (checkName) =>
    linkedFrames.length > 0 && linkedFrames.every((frame) => frame.visualSemanticChecks?.[checkName] === true);

  const checks = {
    linkedChainStabilityHasMultipleFrames: linkedFrames.length >= 2,
    linkedChainStabilitySameFixture:
      frames.length > 0 && linkedFrames.length === frames.length && sameValue(linkedFrames.map((frame) => frame.fixtureId)),
    linkedChainStabilityAllFramesPassed:
      linkedFrames.length > 0 &&
      linkedFrames.every(
        (frame) =>
          frame.result === "render-contract-and-visual-output-correlated-local-diagnostic" &&
          getFailedChecks(frame).length === 0
      ),
    linkedChainStabilityCanonicalBlockedEveryFrame:
      linkedFrames.length > 0 &&
      linkedFrames.every(
        (frame) => frame.canonicalParityPromoted === false && frame.localOnlyNotRetailEvidence === true
      ),
    linkedChainStabilitySemanticChecksEveryFrame:
      linkedFrames.length > 0 &&
      linkedFrames.every((frame) =>
        requiredSemanticChecks.every((checkName) => frame.visualSemanticChecks?.[checkName] === true)
      ),
    linkedChainStabilityDrawParticleCountStable: drawParticleCounts.size === 1 && drawParticleCounts.has(5),
    linkedChainStabilityDrawVertexCountStable: drawVertexCounts.size === 1 && drawVertexCounts.has(30),
    linkedChainStabilityDrawRecordCountStable: drawRecordCounts.size === 1 && drawRecordCounts.has(5),
    linkedChainStabilityLaneStable:
      linkedFrames.length > 0 &&
      linkedFrames.every(
        (frame) =>
          frame.laneProbe?.drawLane === "linked_textured_quad" &&
          getAllDrawRecordsFromCorrelation(frame).every((record) => record.lane === "linked_textured_quad")
      ),
    linkedChainStabilityVisibleEveryFrame:
      linkedFrames.length > 0 &&
      linkedFrames.every(
        (frame) =>
          Number(frame.frameStatus?.objectPixels ?? 0) > 0 &&
          Number(frame.comparisonMetrics?.connectedComponentCount ?? 0) > 0
      ),
    linkedChainStabilityPathOrderEveryFrame: semanticCheckPassedEveryFrame("linkedChainPathOrder"),
    linkedChainStabilitySegmentSpacingEveryFrame: semanticCheckPassedEveryFrame("linkedChainSegmentSpacing"),
    linkedChainStabilityParticleOrderEveryFrame: semanticCheckPassedEveryFrame("linkedChainParticleOrder"),
    linkedChainStabilityColorAlternationEveryFrame: semanticCheckPassedEveryFrame("linkedChainColorAlternation"),
    linkedChainStabilityAlphaFadeEveryFrame: semanticCheckPassedEveryFrame("linkedChainAlphaFade"),
    linkedChainStabilityParticleSizeEnvelopeEveryFrame: semanticCheckPassedEveryFrame("linkedChainParticleSizeEnvelope"),
    linkedChainStabilityFramingEveryFrame: semanticCheckPassedEveryFrame("linkedChainFraming")
  };

  return {
    version: "aurora-vfx-linked-chain-stability-report/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: firstFrame?.fixtureId ?? null,
    frameCount: frames.length,
    timeSeconds: linkedFrames.map((frame) => frame.timeSeconds),
    seeds: linkedFrames.map((frame) => frame.seed),
    oracle: "render-contract-local-diagnostic-two-frame-linked-chain-stability",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    checks,
    result: Object.values(checks).every(Boolean)
      ? "linked-chain-two-frame-stability-correlated-local-diagnostic"
      : "linked-chain-two-frame-stability-failed",
    notes: [
      "This compares local linked_chain visual-correlation artifacts only.",
      "Stable local linked_textured_quad metadata is not retail linked segment-buffer parity evidence."
    ]
  };
}

export function createChunkType9StabilityReport(correlations) {
  const frames = Array.isArray(correlations) ? correlations : [];
  const chunkFrames = frames.filter(
    (correlation) => correlation.fixtureId === "vfx-retail-chunk-particles-progfx-type9"
  );
  const firstFrame = chunkFrames[0];
  const activeParticleCounts = new Set(chunkFrames.map((frame) => frame.contractMetrics?.activeParticleCount));
  const drawParticleCounts = new Set(chunkFrames.map((frame) => frame.contractMetrics?.drawParticleCount));
  const drawVertexCounts = new Set(chunkFrames.map((frame) => frame.contractMetrics?.drawVertexCount));
  const drawRecordCounts = new Set(chunkFrames.map((frame) => frame.contractMetrics?.drawRecordCount));
  const chunkNames = new Set(chunkFrames.map((frame) => frame.laneProbe?.chunkLane?.chunkName));

  const checks = {
    chunkType9StabilityHasMultipleFrames: chunkFrames.length >= 2,
    chunkType9StabilitySameFixture:
      frames.length > 0 && chunkFrames.length === frames.length && sameValue(chunkFrames.map((frame) => frame.fixtureId)),
    chunkType9StabilityAllFramesPassed:
      chunkFrames.length > 0 &&
      chunkFrames.every(
        (frame) =>
          frame.result === "render-contract-and-visual-output-correlated-local-diagnostic" &&
          getFailedChecks(frame).length === 0
      ),
    chunkType9StabilityCanonicalBlockedEveryFrame:
      chunkFrames.length > 0 &&
      chunkFrames.every(
        (frame) => frame.canonicalParityPromoted === false && frame.localOnlyNotRetailEvidence === true
      ),
    chunkType9StabilityActiveParticleCountStable:
      activeParticleCounts.size === 1 && activeParticleCounts.has(2),
    chunkType9StabilityDrawParticleCountStable: drawParticleCounts.size === 1 && drawParticleCounts.has(0),
    chunkType9StabilityDrawVertexCountStable: drawVertexCounts.size === 1 && drawVertexCounts.has(0),
    chunkType9StabilityDrawRecordCountStable: drawRecordCounts.size === 1 && drawRecordCounts.has(0),
    chunkType9StabilityChunkLaneStable:
      chunkFrames.length > 0 &&
      chunkFrames.every(
        (frame) =>
          frame.laneProbe?.drawLane === "chunk_model" &&
          frame.laneProbe?.renderMode?.enum === "chunk_model" &&
          frame.laneProbe?.chunkLane?.lane === "chunk_model"
      ),
    chunkType9StabilityChunkNamePendingStable:
      chunkNames.size === 1 && chunkNames.has("progfx_type9_chunk_model_pending"),
    chunkType9StabilityCanonicalResourceUnresolvedEveryFrame:
      chunkFrames.length > 0 &&
      chunkFrames.every((frame) => frame.laneProbe?.chunkLane?.canonicalResourceResolved === false),
    chunkType9StabilityNoFakeParticleDrawRecordsEveryFrame:
      chunkFrames.length > 0 &&
      chunkFrames.every(
        (frame) =>
          frame.contractMetrics?.drawParticleCount === 0 &&
          frame.contractMetrics?.drawVertexCount === 0 &&
          frame.contractMetrics?.drawRecordCount === 0 &&
          getAllDrawRecordsFromCorrelation(frame).length === 0
      ),
    chunkType9StabilityPlaceholderVisibleEveryFrame:
      chunkFrames.length > 0 &&
      chunkFrames.every(
        (frame) =>
          Number(frame.frameStatus?.objectPixels ?? 0) > 0 &&
          Number(frame.comparisonMetrics?.connectedComponentCount ?? 0) > 0
      )
  };

  return {
    version: "aurora-vfx-chunk-type9-stability-report/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: firstFrame?.fixtureId ?? null,
    frameCount: frames.length,
    timeSeconds: chunkFrames.map((frame) => frame.timeSeconds),
    seeds: chunkFrames.map((frame) => frame.seed),
    oracle: "render-contract-local-diagnostic-two-frame-chunk-type9-stability",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    checks,
    result: Object.values(checks).every(Boolean)
      ? "chunk-type9-two-frame-stability-correlated-local-diagnostic"
      : "chunk-type9-two-frame-stability-failed",
    notes: [
      "This compares local chunk/progfx Type 9 visual-correlation artifacts only.",
      "Stable local chunk_model placeholder output is not retail chunk resource or model-render parity evidence."
    ]
  };
}

export function createP2pGravityStabilityReport(correlations) {
  const frames = Array.isArray(correlations) ? correlations : [];
  const p2pFrames = frames.filter((correlation) => correlation.fixtureId === "vfx-retail-p2p-gravity-reference-node");
  const firstFrame = p2pFrames[0];
  const drawParticleCounts = new Set(p2pFrames.map((frame) => frame.contractMetrics?.drawParticleCount));
  const drawVertexCounts = new Set(p2pFrames.map((frame) => frame.contractMetrics?.drawVertexCount));
  const drawRecordCounts = new Set(p2pFrames.map((frame) => frame.contractMetrics?.drawRecordCount));
  const positionSignatures = p2pFrames.map((frame) => getP2pPositionSignature(frame));
  const firstPositions = p2pFrames.map((frame) => getAllDrawRecordsFromCorrelation(frame)[0]?.position);
  const lastPositions = p2pFrames.map((frame) => getAllDrawRecordsFromCorrelation(frame).at(-1)?.position);
  const requiredSemanticChecks = [
    "p2pGravityDrawShape",
    "p2pGravityArcPath",
    "p2pGravitySegmentSpacing",
    "p2pGravityVelocityPath",
    "p2pGravityColorPair",
    "p2pGravityColorAlternation",
    "p2pGravityAlphaFade",
    "p2pGravityParticleSizeEnvelope",
    "p2pGravityParticleOrder",
    "p2pGravityAtlasAndMaterial",
    "p2pGravityDiagnosticBoundary",
    "p2pGravityFraming",
    "localOnlyNotCanonical"
  ];
  const semanticCheckPassedEveryFrame = (checkName) =>
    p2pFrames.length > 0 && p2pFrames.every((frame) => frame.visualSemanticChecks?.[checkName] === true);

  const checks = {
    p2pGravityStabilityHasMultipleFrames: p2pFrames.length >= 2,
    p2pGravityStabilitySameFixture:
      frames.length > 0 && p2pFrames.length === frames.length && sameValue(p2pFrames.map((frame) => frame.fixtureId)),
    p2pGravityStabilityAllFramesPassed:
      p2pFrames.length > 0 &&
      p2pFrames.every(
        (frame) =>
          frame.result === "render-contract-and-visual-output-correlated-local-diagnostic" &&
          getFailedChecks(frame).length === 0
      ),
    p2pGravityStabilityCanonicalBlockedEveryFrame:
      p2pFrames.length > 0 &&
      p2pFrames.every(
        (frame) => frame.canonicalParityPromoted === false && frame.localOnlyNotRetailEvidence === true
      ),
    p2pGravityStabilityDrawParticleCountStable: drawParticleCounts.size === 1 && drawParticleCounts.has(7),
    p2pGravityStabilityDrawVertexCountStable: drawVertexCounts.size === 1 && drawVertexCounts.has(42),
    p2pGravityStabilityDrawRecordCountStable: drawRecordCounts.size === 1 && drawRecordCounts.has(7),
    p2pGravityStabilityLaneStable:
      p2pFrames.length > 0 &&
      p2pFrames.every(
        (frame) =>
          frame.laneProbe?.drawLane === "textured_quad" &&
          getAllDrawRecordsFromCorrelation(frame).every((record) => record.lane === "textured_quad")
      ),
    p2pGravityStabilityArcGeometryEveryFrame:
      p2pFrames.length > 0 &&
      p2pFrames.every(
        (frame) =>
          frame.checks?.p2pArcStartsLeft === true &&
          frame.checks?.p2pArcEndsRight === true &&
          frame.checks?.p2pArcMiddleHigherThanEnds === true
      ),
    p2pGravityStabilitySourceAnchorStable:
      firstPositions.length >= 2 &&
      firstPositions.every((position) => samePosition(position, firstPositions[0])),
    p2pGravityStabilityTargetAnchorStable:
      lastPositions.length >= 2 && lastPositions.every((position) => samePosition(position, lastPositions[0])),
    p2pGravityStabilityArcPositionsStable:
      positionSignatures.length >= 2 &&
      positionSignatures.every((signature) => signature === positionSignatures[0]),
    p2pGravityStabilityVisibleEveryFrame:
      p2pFrames.length > 0 &&
      p2pFrames.every(
        (frame) =>
          Number(frame.frameStatus?.objectPixels ?? 0) > 0 &&
          Number(frame.comparisonMetrics?.connectedComponentCount ?? 0) > 0
      ),
    p2pGravityStabilitySemanticChecksEveryFrame:
      p2pFrames.length > 0 &&
      p2pFrames.every((frame) =>
        requiredSemanticChecks.every((checkName) => frame.visualSemanticChecks?.[checkName] === true)
      ),
    p2pGravityStabilityColorAlternationEveryFrame: semanticCheckPassedEveryFrame("p2pGravityColorAlternation"),
    p2pGravityStabilityAlphaFadeEveryFrame: semanticCheckPassedEveryFrame("p2pGravityAlphaFade"),
    p2pGravityStabilityParticleSizeEnvelopeEveryFrame:
      semanticCheckPassedEveryFrame("p2pGravityParticleSizeEnvelope"),
    p2pGravityStabilityParticleOrderEveryFrame: semanticCheckPassedEveryFrame("p2pGravityParticleOrder"),
    p2pGravityStabilityFramingEveryFrame: semanticCheckPassedEveryFrame("p2pGravityFraming")
  };

  return {
    version: "aurora-vfx-p2p-gravity-stability-report/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: firstFrame?.fixtureId ?? null,
    frameCount: frames.length,
    timeSeconds: p2pFrames.map((frame) => frame.timeSeconds),
    seeds: p2pFrames.map((frame) => frame.seed),
    oracle: "render-contract-local-diagnostic-two-frame-p2p-gravity-stability",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    checks,
    result: Object.values(checks).every(Boolean)
      ? "p2p-gravity-two-frame-stability-correlated-local-diagnostic"
      : "p2p-gravity-two-frame-stability-failed",
    notes: [
      "This compares local P2P gravity visual-correlation artifacts only.",
      "Stable local source-target arc geometry is not retail reference-node or gravity solver parity evidence."
    ]
  };
}

export function createRow50EffectVisualEffectStabilityReport(correlations) {
  const frames = Array.isArray(correlations) ? correlations : [];
  const row50Frames = frames.filter(
    (correlation) => correlation.fixtureId === "vfx-retail-scripted-effectvisualeffect-row-50"
  );
  const firstFrame = row50Frames[0];
  const drawParticleCounts = new Set(row50Frames.map((frame) => frame.contractMetrics?.drawParticleCount));
  const drawVertexCounts = new Set(row50Frames.map((frame) => frame.contractMetrics?.drawVertexCount));
  const drawRecordCounts = new Set(row50Frames.map((frame) => frame.contractMetrics?.drawRecordCount));

  const checks = {
    row50EffectVisualEffectStabilityHasMultipleFrames: row50Frames.length >= 2,
    row50EffectVisualEffectStabilitySameFixture:
      frames.length > 0 && row50Frames.length === frames.length && sameValue(row50Frames.map((frame) => frame.fixtureId)),
    row50EffectVisualEffectStabilityAllFramesPassed:
      row50Frames.length > 0 &&
      row50Frames.every(
        (frame) =>
          frame.result === "render-contract-and-visual-output-correlated-local-diagnostic" &&
          getFailedChecks(frame).length === 0
      ),
    row50EffectVisualEffectStabilityCanonicalBlockedEveryFrame:
      row50Frames.length > 0 &&
      row50Frames.every(
        (frame) => frame.canonicalParityPromoted === false && frame.localOnlyNotRetailEvidence === true
      ),
    row50EffectVisualEffectStabilityDrawParticleCountStable: drawParticleCounts.size === 1 && drawParticleCounts.has(2),
    row50EffectVisualEffectStabilityDrawVertexCountStable: drawVertexCounts.size === 1 && drawVertexCounts.has(12),
    row50EffectVisualEffectStabilityDrawRecordCountStable: drawRecordCounts.size === 1 && drawRecordCounts.has(2),
    row50EffectVisualEffectStabilityLaneStable:
      row50Frames.length > 0 &&
      row50Frames.every(
        (frame) =>
          frame.laneProbe?.drawLane === "textured_quad" &&
          getAllDrawRecordsFromCorrelation(frame).every((record) => record.lane === "textured_quad")
      ),
    row50EffectVisualEffectStabilityRenderModeStable:
      row50Frames.length > 0 &&
      row50Frames.every((frame) => frame.laneProbe?.renderMode?.enum === "billboard_to_world_z"),
    row50EffectVisualEffectStabilityBlendModeStable:
      row50Frames.length > 0 &&
      row50Frames.every(
        (frame) =>
          frame.laneProbe?.blendMode?.enum === "normal" &&
          frame.laneProbe?.blendMode?.rawToken === "Normal" &&
          frame.laneProbe?.blendMode?.modeNumber === 0 &&
          getAllDrawRecordsFromCorrelation(frame).every(
            (record) =>
              record.blendMode?.enum === "normal" &&
              record.blendMode?.rawToken === "Normal" &&
              record.blendMode?.modeNumber === 0
          )
      ),
    row50EffectVisualEffectStabilityTextureProfileStable:
      row50Frames.length > 0 &&
      row50Frames.every((frame) => frame.frameStatus?.textureProfile === "radial-soft-atlas-4x4-v2"),
    row50EffectVisualEffectStabilityAtlasUvPresentEveryFrame:
      row50Frames.length > 0 &&
      row50Frames.every((frame) =>
        getAllDrawRecordsFromCorrelation(frame).every(
          (record) =>
            typeof record.atlasUv?.frameIndex === "number" &&
            record.atlasUv?.mapping === "row_major_top_down_v" &&
            record.atlasProvenance?.materialLevelFrameOffsetAllowed === false
        )
      ),
    row50EffectVisualEffectStabilitySemanticChecksEveryFrame:
      row50Frames.length > 0 &&
      row50Frames.every((frame) => {
        const checks = frame.visualSemanticChecks ?? {};
        return [
          checks.row50DeathDrawShape,
          checks.row50DeathColorPair,
          checks.row50DeathColorPlacement,
          checks.row50DeathAlphaFade,
          checks.row50DeathParticleSize,
          checks.row50DeathTwoParticleOrder,
          checks.row50DeathAtlasAndMaterial,
          checks.row50DeathFraming,
          checks.localOnlyNotCanonical
        ].every(Boolean);
      }),
    row50EffectVisualEffectStabilityAlphaFadeEveryFrame:
      row50Frames.length > 0 &&
      row50Frames.every((frame) => {
        const alphas = frame.frameStatus?.renderedAlpha ?? [];
        return alphas.length === 2 && alphas.every((value) => Number.isFinite(value)) && alphas[0] > alphas[1];
      }),
    row50EffectVisualEffectStabilityFirstParticleLargerEveryFrame:
      row50Frames.length > 0 &&
      row50Frames.every((frame) => {
        const sizeX = frame.frameStatus?.renderedParticleSizeX ?? [];
        const sizeY = frame.frameStatus?.renderedParticleSizeY ?? [];
        return (
          sizeX.length === 2 &&
          sizeY.length === 2 &&
          sizeX.every((value) => Number.isFinite(value) && value > 0) &&
          sizeY.every((value) => Number.isFinite(value) && value > 0) &&
          sizeX[0] > sizeX[1] &&
          sizeY[0] > sizeY[1]
        );
      }),
    row50EffectVisualEffectStabilityVisibleEveryFrame:
      row50Frames.length > 0 &&
      row50Frames.every(
        (frame) =>
          Number(frame.frameStatus?.objectPixels ?? 0) > 0 &&
          Number(frame.comparisonMetrics?.connectedComponentCount ?? 0) > 0
      ),
    row50EffectVisualEffectStabilityAllowsMergedComponents:
      row50Frames.length > 0 &&
      row50Frames.every((frame) => {
        const components = Number(frame.comparisonMetrics?.connectedComponentCount ?? 0);
        const drawParticles = Number(frame.contractMetrics?.drawParticleCount ?? 0);
        return components > 0 && components <= drawParticles;
      })
  };

  return {
    version: "aurora-vfx-row50-effectvisualeffect-stability-report/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: firstFrame?.fixtureId ?? null,
    frameCount: frames.length,
    timeSeconds: row50Frames.map((frame) => frame.timeSeconds),
    seeds: row50Frames.map((frame) => frame.seed),
    oracle: "render-contract-local-diagnostic-two-frame-row50-effectvisualeffect-stability",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    checks,
    result: Object.values(checks).every(Boolean)
      ? "row50-effectvisualeffect-two-frame-stability-correlated-local-diagnostic"
      : "row50-effectvisualeffect-two-frame-stability-failed",
    notes: [
      "This compares local row 50 EffectVisualEffect visual-correlation artifacts only.",
      "Merged soft-particle components are allowed when the visible component count stays within the draw-particle budget.",
      "Stable local textured_quad/radial atlas output is not retail EffectVisualEffect parity evidence."
    ]
  };
}

export function createFireballDetonateStabilityReport(correlations) {
  const frames = Array.isArray(correlations) ? correlations : [];
  const fireballFrames = frames.filter(
    (correlation) => correlation.fixtureId === "vfx-retail-explosion-detonate-fireball"
  );
  const firstFrame = fireballFrames[0];
  const drawParticleCounts = new Set(fireballFrames.map((frame) => frame.contractMetrics?.drawParticleCount));
  const drawVertexCounts = new Set(fireballFrames.map((frame) => frame.contractMetrics?.drawVertexCount));
  const drawRecordCounts = new Set(fireballFrames.map((frame) => frame.contractMetrics?.drawRecordCount));
  const requiredSemanticChecks = [
    "drawModeRoute",
    "fireballDetonateDrawShape",
    "fireballDetonateWarmColorPair",
    "fireballDetonateWarmColorOrder",
    "fireballDetonateParticleSize",
    "fireballDetonateAlphaFade",
    "fireballDetonateOutwardMotion",
    "fireballDetonateAtlasAndMaterial",
    "fireballDetonateParticleOrder",
    "fireballDetonateDiagnosticBoundary",
    "fireballDetonateFraming",
    "localOnlyNotCanonical"
  ];
  const semanticCheckPassedEveryFrame = (checkName) =>
    fireballFrames.length > 0 && fireballFrames.every((frame) => frame.visualSemanticChecks?.[checkName] === true);

  const checks = {
    fireballDetonateStabilityHasMultipleFrames: fireballFrames.length >= 2,
    fireballDetonateStabilitySameFixture:
      frames.length > 0 && fireballFrames.length === frames.length && sameValue(fireballFrames.map((frame) => frame.fixtureId)),
    fireballDetonateStabilityAllFramesPassed:
      fireballFrames.length > 0 &&
      fireballFrames.every(
        (frame) =>
          frame.result === "render-contract-and-visual-output-correlated-local-diagnostic" &&
          getFailedChecks(frame).length === 0
      ),
    fireballDetonateStabilityCanonicalBlockedEveryFrame:
      fireballFrames.length > 0 &&
      fireballFrames.every(
        (frame) => frame.canonicalParityPromoted === false && frame.localOnlyNotRetailEvidence === true
      ),
    fireballDetonateStabilitySemanticChecksEveryFrame:
      fireballFrames.length > 0 &&
      fireballFrames.every((frame) =>
        requiredSemanticChecks.every((checkName) => frame.visualSemanticChecks?.[checkName] === true)
      ),
    fireballDetonateStabilityDrawParticleCountStable: drawParticleCounts.size === 1 && drawParticleCounts.has(2),
    fireballDetonateStabilityDrawVertexCountStable: drawVertexCounts.size === 1 && drawVertexCounts.has(12),
    fireballDetonateStabilityDrawRecordCountStable: drawRecordCounts.size === 1 && drawRecordCounts.has(2),
    fireballDetonateStabilityLaneStable:
      fireballFrames.length > 0 &&
      fireballFrames.every(
        (frame) =>
          frame.laneProbe?.drawLane === "textured_quad" &&
          getAllDrawRecordsFromCorrelation(frame).every((record) => record.lane === "textured_quad")
      ),
    fireballDetonateStabilityRenderModeStable:
      fireballFrames.length > 0 &&
      fireballFrames.every((frame) => frame.laneProbe?.renderMode?.enum === "billboard_to_world_z"),
    fireballDetonateStabilityBlendModeStable:
      fireballFrames.length > 0 &&
      fireballFrames.every(
        (frame) =>
          frame.laneProbe?.blendMode?.enum === "normal" &&
          frame.laneProbe?.blendMode?.rawToken === "Normal" &&
          frame.laneProbe?.blendMode?.modeNumber === 0 &&
          getAllDrawRecordsFromCorrelation(frame).every(
            (record) =>
              record.blendMode?.enum === "normal" &&
              record.blendMode?.rawToken === "Normal" &&
              record.blendMode?.modeNumber === 0
          )
      ),
    fireballDetonateStabilityTextureProfileStable:
      fireballFrames.length > 0 &&
      fireballFrames.every((frame) => frame.frameStatus?.textureProfile === "radial-soft-atlas-4x4-v2"),
    fireballDetonateStabilityAtlasUvPresentEveryFrame:
      fireballFrames.length > 0 &&
      fireballFrames.every((frame) =>
        getAllDrawRecordsFromCorrelation(frame).every(
          (record) =>
            typeof record.atlasUv?.frameIndex === "number" &&
            record.atlasUv?.mapping === "row_major_top_down_v" &&
            record.atlasProvenance?.materialLevelFrameOffsetAllowed === false
        )
      ),
    fireballDetonateStabilityWarmColorEveryFrame:
      fireballFrames.length > 0 &&
      fireballFrames.every((frame) =>
        getAllDrawRecordsFromCorrelation(frame).every((record) => {
          const color = record.color ?? {};
          return color.r >= 0.9 && color.g >= color.b && color.b <= 0.25;
        })
      ),
    fireballDetonateStabilityDrawModeRouteEveryFrame: semanticCheckPassedEveryFrame("drawModeRoute"),
    fireballDetonateStabilityWarmColorOrderEveryFrame:
      semanticCheckPassedEveryFrame("fireballDetonateWarmColorOrder"),
    fireballDetonateStabilityAlphaFadeEveryFrame: semanticCheckPassedEveryFrame("fireballDetonateAlphaFade"),
    fireballDetonateStabilityOutwardMotionEveryFrame:
      semanticCheckPassedEveryFrame("fireballDetonateOutwardMotion"),
    fireballDetonateStabilityParticleSizeEveryFrame:
      semanticCheckPassedEveryFrame("fireballDetonateParticleSize"),
    fireballDetonateStabilityAtlasAndMaterialEveryFrame:
      semanticCheckPassedEveryFrame("fireballDetonateAtlasAndMaterial"),
    fireballDetonateStabilityParticleOrderEveryFrame:
      semanticCheckPassedEveryFrame("fireballDetonateParticleOrder"),
    fireballDetonateStabilityFramingEveryFrame: semanticCheckPassedEveryFrame("fireballDetonateFraming"),
    fireballDetonateStabilityVisibleEveryFrame:
      fireballFrames.length > 0 &&
      fireballFrames.every(
        (frame) =>
          Number(frame.frameStatus?.objectPixels ?? 0) > 0 &&
          Number(frame.comparisonMetrics?.objectPixels ?? 0) > 0
      ),
    fireballDetonateStabilityTwoComponentsEveryFrame:
      fireballFrames.length > 0 &&
      fireballFrames.every(
        (frame) =>
          Number(frame.comparisonMetrics?.connectedComponentCount ?? 0) ===
          Number(frame.contractMetrics?.drawParticleCount ?? -1)
      )
  };

  return {
    version: "aurora-vfx-fireball-detonate-stability-report/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: firstFrame?.fixtureId ?? null,
    frameCount: frames.length,
    timeSeconds: fireballFrames.map((frame) => frame.timeSeconds),
    seeds: fireballFrames.map((frame) => frame.seed),
    oracle: "render-contract-local-diagnostic-two-frame-fireball-detonate-stability",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    checks,
    result: Object.values(checks).every(Boolean)
      ? "fireball-detonate-two-frame-stability-correlated-local-diagnostic"
      : "fireball-detonate-two-frame-stability-failed",
    notes: [
      "This compares local explosion/detonate fireball visual-correlation artifacts only.",
      "Stable local warm two-component textured_quad output and semantic motion/color/alpha checks are not retail detonate timing or explosion parity evidence."
    ]
  };
}

export function createRow68DmVisualEffectStabilityReport(correlations) {
  const frames = Array.isArray(correlations) ? correlations : [];
  const row68Frames = frames.filter(
    (correlation) => correlation.fixtureId === "vfx-retail-dm-visualeffect-row-68-duration-0"
  );
  const firstFrame = row68Frames[0];
  const drawParticleCounts = new Set(row68Frames.map((frame) => frame.contractMetrics?.drawParticleCount));
  const drawVertexCounts = new Set(row68Frames.map((frame) => frame.contractMetrics?.drawVertexCount));
  const drawRecordCounts = new Set(row68Frames.map((frame) => frame.contractMetrics?.drawRecordCount));

  const checks = {
    row68DmVisualEffectStabilityHasMultipleFrames: row68Frames.length >= 2,
    row68DmVisualEffectStabilitySameFixture:
      frames.length > 0 && row68Frames.length === frames.length && sameValue(row68Frames.map((frame) => frame.fixtureId)),
    row68DmVisualEffectStabilityAllFramesPassed:
      row68Frames.length > 0 &&
      row68Frames.every(
        (frame) =>
          frame.result === "render-contract-and-visual-output-correlated-local-diagnostic" &&
          getFailedChecks(frame).length === 0
      ),
    row68DmVisualEffectStabilityCanonicalBlockedEveryFrame:
      row68Frames.length > 0 &&
      row68Frames.every(
        (frame) => frame.canonicalParityPromoted === false && frame.localOnlyNotRetailEvidence === true
      ),
    row68DmVisualEffectStabilityDrawParticleCountStable: drawParticleCounts.size === 1 && drawParticleCounts.has(2),
    row68DmVisualEffectStabilityDrawVertexCountStable: drawVertexCounts.size === 1 && drawVertexCounts.has(12),
    row68DmVisualEffectStabilityDrawRecordCountStable: drawRecordCounts.size === 1 && drawRecordCounts.has(2),
    row68DmVisualEffectStabilityLaneStable:
      row68Frames.length > 0 &&
      row68Frames.every(
        (frame) =>
          frame.laneProbe?.drawLane === "textured_quad" &&
          getAllDrawRecordsFromCorrelation(frame).every((record) => record.lane === "textured_quad")
      ),
    row68DmVisualEffectStabilityRenderModeStable:
      row68Frames.length > 0 &&
      row68Frames.every((frame) => frame.laneProbe?.renderMode?.enum === "billboard_to_world_z"),
    row68DmVisualEffectStabilityBlendModeStable:
      row68Frames.length > 0 &&
      row68Frames.every(
        (frame) =>
          frame.laneProbe?.blendMode?.enum === "normal" &&
          frame.laneProbe?.blendMode?.rawToken === "Normal" &&
          frame.laneProbe?.blendMode?.modeNumber === 0 &&
          getAllDrawRecordsFromCorrelation(frame).every(
            (record) =>
              record.blendMode?.enum === "normal" &&
              record.blendMode?.rawToken === "Normal" &&
              record.blendMode?.modeNumber === 0
          )
      ),
    row68DmVisualEffectStabilityTextureProfileStable:
      row68Frames.length > 0 &&
      row68Frames.every((frame) => frame.frameStatus?.textureProfile === "radial-soft-atlas-4x4-v2"),
    row68DmVisualEffectStabilityAtlasUvPresentEveryFrame:
      row68Frames.length > 0 &&
      row68Frames.every((frame) =>
        getAllDrawRecordsFromCorrelation(frame).every(
          (record) =>
            typeof record.atlasUv?.frameIndex === "number" &&
            record.atlasUv?.mapping === "row_major_top_down_v" &&
            record.atlasProvenance?.materialLevelFrameOffsetAllowed === false
        )
      ),
    row68DmVisualEffectStabilityHealingColorPairEveryFrame:
      row68Frames.length > 0 &&
      row68Frames.every((frame) => {
        const [firstRecord, secondRecord] = getAllDrawRecordsFromCorrelation(frame);
        const firstColor = firstRecord?.color ?? {};
        const secondColor = secondRecord?.color ?? {};
        return (
          firstColor.r >= 0.9 &&
          firstColor.g >= 0.3 &&
          firstColor.g <= 0.45 &&
          firstColor.b <= 0.3 &&
          secondColor.r <= 0.35 &&
          secondColor.g >= 0.9 &&
          secondColor.b >= 0.75
        );
      }),
    row68DmVisualEffectStabilityParticleIdsStable:
      row68Frames.length > 0 &&
      row68Frames.every((frame) => {
        const particleIds = getAllDrawRecordsFromCorrelation(frame).map((record) => record.particleId);
        return particleIds.length === 2 && particleIds[0] === 680 && particleIds[1] === 681;
      }),
    row68DmVisualEffectStabilitySemanticChecksEveryFrame:
      row68Frames.length > 0 &&
      row68Frames.every(
        (frame) =>
          frame.visualSemanticChecks?.row68HealingDrawShape === true &&
          frame.visualSemanticChecks?.row68HealingColorPair === true &&
          frame.visualSemanticChecks?.row68HealingColorPlacement === true &&
          frame.visualSemanticChecks?.row68HealingAlphaFade === true &&
          frame.visualSemanticChecks?.row68HealingParticleSize === true &&
          frame.visualSemanticChecks?.row68HealingTwoParticleOrder === true &&
          frame.visualSemanticChecks?.row68HealingAtlasAndMaterial === true &&
          frame.visualSemanticChecks?.row68HealingFraming === true
      ),
    row68DmVisualEffectStabilityAlphaFadeEveryFrame:
      row68Frames.length > 0 &&
      row68Frames.every((frame) => {
        const [firstRecord, secondRecord] = getAllDrawRecordsFromCorrelation(frame);
        return (
          typeof firstRecord?.alpha === "number" &&
          typeof secondRecord?.alpha === "number" &&
          firstRecord.alpha > secondRecord.alpha
        );
      }),
    row68DmVisualEffectStabilityFirstParticleLargerEveryFrame:
      row68Frames.length > 0 &&
      row68Frames.every((frame) => {
        const [firstRecord, secondRecord] = getAllDrawRecordsFromCorrelation(frame);
        return (
          typeof firstRecord?.size?.x === "number" &&
          typeof firstRecord?.size?.y === "number" &&
          typeof secondRecord?.size?.x === "number" &&
          typeof secondRecord?.size?.y === "number" &&
          firstRecord.size.x > secondRecord.size.x &&
          firstRecord.size.y > secondRecord.size.y
        );
      }),
    row68DmVisualEffectStabilityVisibleEveryFrame:
      row68Frames.length > 0 &&
      row68Frames.every(
        (frame) =>
          Number(frame.frameStatus?.objectPixels ?? 0) > 0 &&
          Number(frame.comparisonMetrics?.objectPixels ?? 0) > 0
      ),
    row68DmVisualEffectStabilityTwoComponentsEveryFrame:
      row68Frames.length > 0 &&
      row68Frames.every(
        (frame) =>
          Number(frame.comparisonMetrics?.connectedComponentCount ?? 0) ===
          Number(frame.contractMetrics?.drawParticleCount ?? -1)
      )
  };

  return {
    version: "aurora-vfx-row68-dmvisualeffect-stability-report/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: firstFrame?.fixtureId ?? null,
    frameCount: frames.length,
    timeSeconds: row68Frames.map((frame) => frame.timeSeconds),
    seeds: row68Frames.map((frame) => frame.seed),
    oracle: "render-contract-local-diagnostic-two-frame-row68-dmvisualeffect-stability",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    checks,
    result: Object.values(checks).every(Boolean)
      ? "row68-dmvisualeffect-two-frame-stability-correlated-local-diagnostic"
      : "row68-dmvisualeffect-two-frame-stability-failed",
    notes: [
      "This compares local row 68 dm_visualeffect visual-correlation artifacts only.",
      "Stable local two-component textured_quad output is not retail dm_visualeffect command, row runtime, or canonical parity evidence."
    ]
  };
}

export function createCorrelation({
  snapshot,
  frame,
  comparison,
  snapshotPath,
  screenshotPath,
  framePath,
  comparisonPath
}) {
  const renderContract = snapshot.renderContract;
  const drawRecords = Array.isArray(renderContract.drawRecords) ? renderContract.drawRecords : [];
  const drawParticles = Number(frame.domStatus?.drawParticles ?? 0);
  const components = Number(comparison.metrics?.connectedComponentCount ?? 0);
  const comparisonContractChecks = comparison.contractChecks?.checks ?? {};
  const renderedGeometry = frame.domStatus?.renderedGeometry ?? {};
  const isChunkLane = renderContract.drawLane === "chunk_model";
  const isLinkedLane = renderContract.drawLane === "linked_textured_quad";
  const isMode2Lighten = renderContract.blendMode?.rawToken === "Mode2_Lighten";
  const isP2pGravity = snapshot.fixtureId === "vfx-retail-p2p-gravity-reference-node";
  const isFireballDetonate = snapshot.fixtureId === "vfx-retail-explosion-detonate-fireball";
  const isRow68Healing = snapshot.fixtureId === "vfx-retail-dm-visualeffect-row-68-duration-0";
  const isRow50Death = snapshot.fixtureId === "vfx-retail-scripted-effectvisualeffect-row-50";
  const isPltLayerColors = snapshot.fixtureId === "vfx-retail-plt-known-layer-colors";
  const isEffectBeam = snapshot.fixtureId === "vfx-retail-scripted-effectbeam-row-210-body-chest";
  const isFountainAtlas = snapshot.fixtureId === "vfx-retail-fountain-atlas-cot-fx01";

  const checks = {
    renderContractDrawParticlesMatchesDom: renderContract.drawParticleCount === drawParticles,
    renderContractDrawRecordsMatchContract: drawRecords.length === snapshot.metrics.drawRecordCount,
    canvasNonblank: frame.domStatus?.canvasNonblank === "true",
    localStructuralVisible: comparison.comparisonResult === "local-structural-visible",
    analyzerTextureReferenceMatchesDependency:
      comparisonContractChecks.renderedTextureReferenceMatchesDependency === true,
    analyzerTextureStatusApplied:
      comparisonContractChecks.renderedTextureStatusApplied === true,
    analyzerTextureProfilePresent:
      comparisonContractChecks.renderedTextureProfilePresent === true,
    analyzerTextureAtlasDimensionsConsistent:
      comparisonContractChecks.renderedTextureAtlasDimensionsConsistent === true,
    analyzerTextureAtlasGridMatchesFountainContract:
      comparisonContractChecks.renderedTextureAtlasGridMatchesFountainContract === true,
    analyzerTextureAtlasCellCountMatchesFountainContract:
      comparisonContractChecks.renderedTextureAtlasCellCountMatchesFountainContract === true,
    analyzerMaterialTransparentMatchesBlend:
      comparisonContractChecks.renderedMaterialTransparentMatchesBlend === true,
    analyzerMaterialDepthWriteMatchesBlend:
      comparisonContractChecks.renderedMaterialDepthWriteMatchesBlend === true,
    analyzerMaterialDepthTestEnabled:
      comparisonContractChecks.renderedMaterialDepthTestEnabled === true,
    analyzerMaterialAlphaTestMatchesBlend:
      comparisonContractChecks.renderedMaterialAlphaTestMatchesBlend === true,
    analyzerMaterialOpacityIsUnit:
      comparisonContractChecks.renderedMaterialOpacityIsUnit === true,
    analyzerMaterialColorIsWhite:
      comparisonContractChecks.renderedMaterialColorIsWhite === true,
    analyzerMaterialBlendingMatchesBlend:
      comparisonContractChecks.renderedMaterialBlendingMatchesBlend === true,
    analyzerMaterialBlendSrcMatchesBlend:
      comparisonContractChecks.renderedMaterialBlendSrcMatchesBlend === true,
    analyzerMaterialBlendDstMatchesBlend:
      comparisonContractChecks.renderedMaterialBlendDstMatchesBlend === true,
    analyzerMaterialBlendEquationMatchesBlend:
      comparisonContractChecks.renderedMaterialBlendEquationMatchesBlend === true,
    analyzerMaterialStatusApplied:
      comparisonContractChecks.renderedMaterialStatusApplied === true,
    analyzerMaterialMapBoundMatchesTextureStatus:
      comparisonContractChecks.renderedMaterialMapBoundMatchesTextureStatus === true,
    analyzerMaterialMapReferenceMatchesTextureReference:
      comparisonContractChecks.renderedMaterialMapReferenceMatchesTextureReference === true,
    analyzerMaterialVertexColorsEnabled:
      comparisonContractChecks.renderedMaterialVertexColorsEnabled === true,
    analyzerMaterialSideDoubleSided:
      comparisonContractChecks.renderedMaterialSideDoubleSided === true,
    analyzerRenderedRenderOrderMatchesContract:
      comparisonContractChecks.renderedRenderOrderMatchesContract === true,
    analyzerRenderedRenderModeMatchesContract:
      comparisonContractChecks.renderedRenderModeMatchesContract === true,
    analyzerRenderedBlendModeMatchesContract:
      comparisonContractChecks.renderedBlendModeMatchesContract === true,
    analyzerRenderedRenderModeRawTokenMatchesContract:
      comparisonContractChecks.renderedRenderModeRawTokenMatchesContract === true,
    analyzerRenderedBlendModeRawTokenMatchesContract:
      comparisonContractChecks.renderedBlendModeRawTokenMatchesContract === true,
    analyzerRenderedBlendModeNumberMatchesContract:
      comparisonContractChecks.renderedBlendModeNumberMatchesContract === true,
    analyzerRenderedDiagnosticCodesMatchMetrics:
      comparisonContractChecks.renderedDiagnosticCodesMatchMetrics === true,
    analyzerRenderedAtlasFramesMatchContract:
      comparisonContractChecks.renderedAtlasFramesMatchContract === true,
    analyzerRenderedAtlasUvRectsMatchContract:
      comparisonContractChecks.renderedAtlasUvRectsMatchContract === true,
    analyzerRenderedDrawRecordIdsMatchContract:
      comparisonContractChecks.renderedDrawRecordIdsMatchContract === true,
    analyzerRenderedEmitterNodeNamesMatchContract:
      comparisonContractChecks.renderedEmitterNodeNamesMatchContract === true,
    analyzerRenderedDrawRecordLanesMatchContract:
      comparisonContractChecks.renderedDrawRecordLanesMatchContract === true,
    analyzerRenderedParticleIdsMatchContract:
      comparisonContractChecks.renderedParticleIdsMatchContract === true,
    analyzerRenderedParticleIndexesMatchContract:
      comparisonContractChecks.renderedParticleIndexesMatchContract === true,
    analyzerRenderedVelocityVectorsMatchContract:
      comparisonContractChecks.renderedVelocityVectorsMatchContract === true,
    analyzerRenderedPositionVectorsMatchContract:
      comparisonContractChecks.renderedPositionVectorsMatchContract === true,
    analyzerRenderedColorVectorsMatchContract:
      comparisonContractChecks.renderedColorVectorsMatchContract === true,
    analyzerRenderedParticleSizeVectorsMatchContract:
      comparisonContractChecks.renderedParticleSizeVectorsMatchContract === true,
    analyzerRenderedAlphaMatchesContract:
      comparisonContractChecks.renderedAlphaMatchesContract === true,
    analyzerRenderedRecordVerticesPerParticleMatchContract:
      comparisonContractChecks.renderedRecordVerticesPerParticleMatchContract === true,
    analyzerRenderedPltLayersMatchContract:
      comparisonContractChecks.renderedPltLayersMatchContract === true,
    analyzerRenderedPltLayerColorSourcesMatchContract:
      comparisonContractChecks.renderedPltLayerColorSourcesMatchContract === true,
    analyzerRenderedGeometryNonIndexedDrawArrays:
      comparisonContractChecks.renderedGeometryNonIndexedDrawArrays === true,
    analyzerRenderedGeometryIndexedDrawArrays:
      comparisonContractChecks.renderedGeometryIndexedDrawArrays === true,
    analyzerRenderedGeometryDrawModeArgumentMatchesContract:
      comparisonContractChecks.renderedGeometryDrawModeArgumentMatchesContract === true,
    analyzerRenderedGeometryDrawModeArgumentSourceMatchesContract:
      comparisonContractChecks.renderedGeometryDrawModeArgumentSourceMatchesContract === true,
    analyzerRenderedGeometryVerticesPerParticleMatchesContract:
      comparisonContractChecks.renderedGeometryVerticesPerParticleMatchesContract === true,
    analyzerRenderedGeometryAtlasUvSourceMatchesContract:
      comparisonContractChecks.renderedGeometryAtlasUvSourceMatchesContract === true,
    analyzerRenderedGeometryPositionAttributeMatchesVertexCount:
      comparisonContractChecks.renderedGeometryPositionAttributeMatchesVertexCount === true,
    analyzerRenderedGeometryPositionAttributeRangeMatchesContract:
      comparisonContractChecks.renderedGeometryPositionAttributeRangeMatchesContract === true,
    analyzerRenderedGeometryPositionAttributeUniqueValuesPerRecordMatchContract:
      comparisonContractChecks
        .renderedGeometryPositionAttributeUniqueValuesPerRecordMatchContract === true,
    analyzerRenderedGeometryColorAttributeMatchesVertexCount:
      comparisonContractChecks.renderedGeometryColorAttributeMatchesVertexCount === true,
    analyzerRenderedGeometryColorAttributeUniqueCountMatchesContract:
      comparisonContractChecks.renderedGeometryColorAttributeUniqueCountMatchesContract === true,
    analyzerRenderedGeometryColorAttributeRangeMatchesContract:
      comparisonContractChecks.renderedGeometryColorAttributeRangeMatchesContract === true,
    analyzerRenderedGeometryColorAttributeUniqueValuesPerRecordMatchContract:
      comparisonContractChecks.renderedGeometryColorAttributeUniqueValuesPerRecordMatchContract ===
      true,
    analyzerRenderedGeometryAlphaAttributeMatchesVertexCount:
      comparisonContractChecks.renderedGeometryAlphaAttributeMatchesVertexCount === true,
    analyzerRenderedGeometryAlphaAttributeRangeMatchesContract:
      comparisonContractChecks.renderedGeometryAlphaAttributeRangeMatchesContract === true,
    analyzerRenderedGeometryAlphaAttributeUniqueValuesPerRecordMatchContract:
      comparisonContractChecks.renderedGeometryAlphaAttributeUniqueValuesPerRecordMatchContract ===
      true,
    analyzerRenderedGeometryParticleSizeAttributeMatchesVertexCount:
      comparisonContractChecks.renderedGeometryParticleSizeAttributeMatchesVertexCount === true,
    analyzerRenderedGeometryParticleSizeAttributeRangeMatchesContract:
      comparisonContractChecks.renderedGeometryParticleSizeAttributeRangeMatchesContract === true,
    analyzerRenderedGeometryParticleSizeAttributeUniqueValuesPerRecordMatchContract:
      comparisonContractChecks
        .renderedGeometryParticleSizeAttributeUniqueValuesPerRecordMatchContract === true,
    analyzerRenderedGeometryAtlasFrameAttributeMatchesVertexCount:
      comparisonContractChecks.renderedGeometryAtlasFrameAttributeMatchesVertexCount === true,
    analyzerRenderedGeometryAtlasFrameAttributeSourceMatchesContract:
      comparisonContractChecks.renderedGeometryAtlasFrameAttributeSourceMatchesContract === true,
    analyzerRenderedGeometryAtlasFrameAttributeUniqueCountMatchesContract:
      comparisonContractChecks.renderedGeometryAtlasFrameAttributeUniqueCountMatchesContract === true,
    analyzerRenderedGeometryAtlasFrameAttributeRangeMatchesContract:
      comparisonContractChecks.renderedGeometryAtlasFrameAttributeRangeMatchesContract === true,
    analyzerRenderedGeometryAtlasFrameAttributeUniqueValuesPerRecordMatchContract:
      comparisonContractChecks.renderedGeometryAtlasFrameAttributeUniqueValuesPerRecordMatchContract ===
      true,
    analyzerRenderedGeometryDrawRecordIndexAttributeMatchesVertexCount:
      comparisonContractChecks.renderedGeometryDrawRecordIndexAttributeMatchesVertexCount === true,
    analyzerRenderedGeometryDrawRecordIndexAttributeSourceMatchesContract:
      comparisonContractChecks.renderedGeometryDrawRecordIndexAttributeSourceMatchesContract === true,
    analyzerRenderedGeometryDrawRecordIndexAttributeUniqueCountMatchesContract:
      comparisonContractChecks.renderedGeometryDrawRecordIndexAttributeUniqueCountMatchesContract === true,
    analyzerRenderedGeometryDrawRecordIndexAttributeRangeMatchesContract:
      comparisonContractChecks.renderedGeometryDrawRecordIndexAttributeRangeMatchesContract === true,
    analyzerRenderedGeometryDrawRecordIndexAttributeVertexBucketSizeMatchesContract:
      comparisonContractChecks
        .renderedGeometryDrawRecordIndexAttributeVertexBucketSizeMatchesContract === true,
    analyzerRenderedGeometryUvAttributeMatchesVertexCount:
      comparisonContractChecks.renderedGeometryUvAttributeMatchesVertexCount === true,
    analyzerRenderedGeometryUvAttributeRangeMatchesContract:
      comparisonContractChecks.renderedGeometryUvAttributeRangeMatchesContract === true,
    analyzerRenderedGeometryUvAttributeUniqueValuesPerRecordMatchContract:
      comparisonContractChecks.renderedGeometryUvAttributeUniqueValuesPerRecordMatchContract === true,
    analyzerRenderedBoundsMatchContract:
      comparisonContractChecks.renderedBoundsMatchContract === true,
    localOnlyNotCanonical:
      snapshot.canonicalParityPromoted === false &&
      frame.domStatus?.canonicalParityPromoted === "false" &&
      comparison.canonicalParityPromoted === false
  };

  if (isChunkLane) {
    const renderedDiagnosticCodes = Array.isArray(frame.domStatus?.renderedDiagnosticCodes)
      ? frame.domStatus.renderedDiagnosticCodes
      : [];
    Object.assign(checks, {
      chunkLanePreserved: renderContract.chunkLane?.lane === "chunk_model",
      canonicalResourceUnresolved: renderContract.chunkLane?.canonicalResourceResolved === false,
      chunkRenderedDiagnosticCodesIncludeUnresolvedResource:
        renderedDiagnosticCodes.includes("VFX_CHUNK_MODEL_RESOURCE_CLASS_REQUIRED") &&
        renderedDiagnosticCodes.includes("VFX_DEV_CHUNK_LANE_DIAGNOSTIC_ONLY"),
      noFakeParticleDrawRecords:
        renderContract.drawParticleCount === 0 &&
        renderContract.drawVertexCount === 0 &&
        drawRecords.length === 0,
      placeholderVisibleWithoutDrawParticles: components > 0 && comparison.metrics.objectPixels > 0
    });
  } else {
    Object.assign(checks, {
      visibleComponentsWithinDrawParticleBudget:
        components > 0 && components <= renderContract.drawParticleCount,
      drawParticlesVisible: renderContract.drawParticleCount > 0 && components > 0
    });
  }

  if (isLinkedLane) {
    const renderedGeometry = frame.domStatus?.renderedGeometry ?? {};
    const expectedVerticesPerDrawRecord =
      drawRecords.length > 0 ? renderContract.drawVertexCount / drawRecords.length : 0;
    checks.linkedLanePreserved = drawRecords.every((record) => record.lane === "linked_textured_quad");
    checks.linkedRenderedDrawRecordIndexAttributeBucketsMatchVerticesPerParticle =
      Number(renderedGeometry.drawRecordIndexAttributeMinVerticesPerRecord) ===
        expectedVerticesPerDrawRecord &&
      Number(renderedGeometry.drawRecordIndexAttributeMaxVerticesPerRecord) ===
        expectedVerticesPerDrawRecord &&
      Number(renderedGeometry.drawRecordIndexAttributeUniqueCount) === drawRecords.length;
    checks.linkedRenderedDiagnosticCodesIncludeSegmentBufferBoundary =
      frame.domStatus?.renderedDiagnosticCodes?.includes("VFX_LINKED_CHAIN_SOURCE_EVIDENCE_REQUIRED") &&
      frame.domStatus?.renderedDiagnosticCodes?.includes("VFX_DEV_LINKED_CHAIN_DIAGNOSTIC_ONLY") &&
      frame.domStatus?.renderedDiagnosticCodes?.includes("VFX_LINKED_CHAIN_RETAIL_SEGMENT_BUFFER_REQUIRED");
  }

  if (isMode2Lighten) {
    Object.assign(checks, {
      blendModeIsLighten: renderContract.blendMode?.enum === "lighten",
      blendModeRawTokenIsMode2Lighten: renderContract.blendMode?.rawToken === "Mode2_Lighten",
      blendModeNumberIs2: renderContract.blendMode?.modeNumber === 2,
      renderedBlendModeRawTokenIsMode2Lighten:
        frame.domStatus?.renderedBlendModeRawToken === "Mode2_Lighten",
      renderedBlendModeNumberIs2: frame.domStatus?.renderedBlendModeNumber === 2,
      renderedMaterialBlendSrcIsSrcAlphaFactor:
        frame.domStatus?.renderedMaterial?.blendSrc === "SrcAlphaFactor",
      renderedMaterialBlendDstIsOneFactor:
        frame.domStatus?.renderedMaterial?.blendDst === "OneFactor",
      renderedMaterialBlendEquationIsAddEquation:
        frame.domStatus?.renderedMaterial?.blendEquation === "AddEquation",
      renderedMaterialDepthTestEnabled:
        frame.domStatus?.renderedMaterial?.depthTest === "true",
      renderedMaterialMapIsBound:
        frame.domStatus?.renderedMaterial?.mapBound === "true",
      renderedMaterialMapReferenceMatchesTexture:
        frame.domStatus?.renderedMaterial?.mapReference === frame.domStatus?.renderedTextureReference,
      renderedMaterialOpacityIsUnit:
        Number(frame.domStatus?.renderedMaterial?.opacity) === 1,
      renderedMaterialColorIsWhite:
        frame.domStatus?.renderedMaterial?.colorHex === "#ffffff",
      allDrawRecordsUseLighten: drawRecords.every(
        (record) =>
          record.blendMode?.enum === "lighten" &&
          record.blendMode?.rawToken === "Mode2_Lighten" &&
          record.blendMode?.modeNumber === 2
      )
    });
  }

  if (isP2pGravity) {
    const first = drawRecords[0]?.position;
    const middle = drawRecords[Math.floor(drawRecords.length / 2)]?.position;
    const last = drawRecords.at(-1)?.position;
    const velocityX = drawRecords.map((record) => record.velocity?.x);
    const velocityY = drawRecords.map((record) => record.velocity?.y);
    const positionX = Array.isArray(frame.domStatus?.renderedPositionX)
      ? frame.domStatus.renderedPositionX
      : [];
    const positionY = Array.isArray(frame.domStatus?.renderedPositionY)
      ? frame.domStatus.renderedPositionY
      : [];
    const positionZ = Array.isArray(frame.domStatus?.renderedPositionZ)
      ? frame.domStatus.renderedPositionZ
      : [];
    const renderedGeometry = frame.domStatus?.renderedGeometry ?? {};
    Object.assign(checks, {
      p2pArcStartsLeft: typeof first?.x === "number" && first.x < 0,
      p2pArcEndsRight: typeof last?.x === "number" && last.x > 0,
      p2pArcMiddleHigherThanEnds:
        typeof middle?.y === "number" &&
        typeof first?.y === "number" &&
        typeof last?.y === "number" &&
        middle.y > first.y &&
        middle.y > last.y,
      p2pVelocityXPositive:
        velocityX.length === drawRecords.length &&
        velocityX.every((value) => typeof value === "number" && value > 0),
      p2pVelocityYFallsAcrossArc:
        velocityY.length === drawRecords.length &&
        velocityY.every((value) => typeof value === "number") &&
        velocityY.every((value, index) => index === 0 || value <= velocityY[index - 1]),
      p2pRenderedPositionVectorCountMatchesDrawRecords:
        positionX.length === drawRecords.length &&
        positionY.length === drawRecords.length &&
        positionZ.length === drawRecords.length,
      p2pRenderedPositionXIncreasesAcrossArc:
        positionX.length === drawRecords.length &&
        positionX.every((value, index) => index === 0 || Number(value) >= Number(positionX[index - 1])),
      p2pRenderedPositionYMiddleHigherThanEnds:
        positionY.length === drawRecords.length &&
        typeof first?.y === "number" &&
        typeof last?.y === "number" &&
        Number(positionY[Math.floor(positionY.length / 2)]) > Number(positionY[0]) &&
        Number(positionY[Math.floor(positionY.length / 2)]) > Number(positionY.at(-1)),
      p2pRenderedPositionVectorsMatchDrawRecordOrder:
        positionX.length === drawRecords.length &&
        positionY.length === drawRecords.length &&
        positionZ.length === drawRecords.length &&
        drawRecords.every(
          (record, index) =>
            Number(positionX[index]) === Number(record.position?.x) &&
            Number(positionY[index]) === Number(record.position?.y) &&
            Number(positionZ[index]) === Number(record.position?.z)
        ),
      p2pRenderedDrawRecordIndexAttributeCoversAllDrawRecords:
        Number(renderedGeometry.drawRecordIndexAttributeCount) === renderContract.drawVertexCount &&
        Number(renderedGeometry.drawRecordIndexAttributeItemSize) === 1 &&
        Number(renderedGeometry.drawRecordIndexAttributeUniqueCount) === drawRecords.length,
      p2pRenderedDrawRecordIndexAttributeRangeMatchesDrawRecordOrder:
        Number(renderedGeometry.drawRecordIndexAttributeMin) === 0 &&
        Number(renderedGeometry.drawRecordIndexAttributeMax) === drawRecords.length - 1,
      p2pRenderedDrawRecordIndexAttributeSourceIsCanonical:
        renderedGeometry.drawRecordIndexAttributeSource === "auroraDrawRecordIndex-buffer-attribute"
    });
  }

  if (isFireballDetonate && drawRecords.length > 0) {
    const sizeX = Array.isArray(frame.domStatus?.renderedParticleSizeX)
      ? frame.domStatus.renderedParticleSizeX
      : [];
    const sizeY = Array.isArray(frame.domStatus?.renderedParticleSizeY)
      ? frame.domStatus.renderedParticleSizeY
      : [];
    Object.assign(checks, {
      fireballParticleSizeXPositive:
        sizeX.length === drawRecords.length && sizeX.every((entry) => Number(entry) > 0),
      fireballParticleSizeYPositive:
        sizeY.length === drawRecords.length && sizeY.every((entry) => Number(entry) > 0),
      fireballParticleSizeVectorsMatchDrawRecordCount:
        sizeX.length === drawRecords.length && sizeY.length === drawRecords.length,
      fireballRenderedParticleSizeAttributeBucketsAreUniformPerRecord:
        Number(renderedGeometry.particleSizeAttributeMinUniqueValuesPerRecord) === 1 &&
        Number(renderedGeometry.particleSizeAttributeMaxUniqueValuesPerRecord) === 1
    });
  }

  if (isMode2Lighten && drawRecords.length > 0) {
    const alpha = Array.isArray(frame.domStatus?.renderedAlpha)
      ? frame.domStatus.renderedAlpha
      : [];
    Object.assign(checks, {
      mode2RenderedAlphaCountMatchesDrawRecords: alpha.length === drawRecords.length,
      mode2RenderedAlphaValuesInUnitRange:
        alpha.length === drawRecords.length &&
        alpha.every((entry) => Number(entry) >= 0 && Number(entry) <= 1),
      mode2RenderedAlphaMatchesDrawRecordOrder:
        alpha.length === drawRecords.length &&
        alpha.every((entry, index) => Number(entry) === Number(drawRecords[index]?.alpha)),
      mode2RenderedAlphaAttributeBucketsAreUniformPerRecord:
        Number(renderedGeometry.alphaAttributeMinUniqueValuesPerRecord) === 1 &&
        Number(renderedGeometry.alphaAttributeMaxUniqueValuesPerRecord) === 1
    });
  }

  if (isEffectBeam) {
    const first = drawRecords[0]?.position;
    const last = drawRecords.at(-1)?.position;
    const beamContext = renderContract.beamContext;
    Object.assign(checks, {
      effectBeamContextPreserved:
        beamContext?.constructorKind === "EffectBeam" &&
        beamContext?.applicationMode === "object" &&
        beamContext?.targetRef === "retail-beam-target" &&
        beamContext?.effectorRef === "retail-beam-source",
      effectBeamBodyNodeChestPreserved: beamContext?.bodyNode === "BODY_NODE_CHEST",
      effectBeamRetailVolumeNotResolved: beamContext?.retailBeamVolumeResolved === false,
      effectBeamStartsAtSourceLeft: typeof first?.x === "number" && first.x < 0,
      effectBeamEndsAtTargetRight: typeof last?.x === "number" && last.x > 0,
      effectBeamSegmentsOrdered: drawRecords.every(
        (record, index) =>
          index === 0 ||
          (typeof record.position?.x === "number" &&
            typeof drawRecords[index - 1]?.position?.x === "number" &&
            record.position.x > drawRecords[index - 1].position.x)
      )
    });
  }

  if (isFountainAtlas) {
    const fountainAtlas = renderContract.fountainAtlas;
    const frameIndexes = drawRecords
      .map((record) => record.atlasUv?.frameIndex)
      .filter((frameIndex) => typeof frameIndex === "number");
    const distinctFrameIndexes = new Set(frameIndexes);
    const uvU0 = Array.isArray(frame.domStatus?.renderedAtlasUvU0)
      ? frame.domStatus.renderedAtlasUvU0
      : [];
    const uvV0 = Array.isArray(frame.domStatus?.renderedAtlasUvV0)
      ? frame.domStatus.renderedAtlasUvV0
      : [];
    const uvU1 = Array.isArray(frame.domStatus?.renderedAtlasUvU1)
      ? frame.domStatus.renderedAtlasUvU1
      : [];
    const uvV1 = Array.isArray(frame.domStatus?.renderedAtlasUvV1)
      ? frame.domStatus.renderedAtlasUvV1
      : [];
    Object.assign(checks, {
      fountainAtlasContextPreserved:
        fountainAtlas?.emitterType === "Fountain" &&
        fountainAtlas?.textureRef === "fx_canonical_fire" &&
        fountainAtlas?.xgrid === 4 &&
        fountainAtlas?.ygrid === 4,
      fountainAtlasFrameRangePreserved:
        fountainAtlas?.frameStart === 0 && fountainAtlas?.frameEnd === 15 && fountainAtlas?.fps === 12,
      fountainAtlasRetailPlaybackNotResolved: fountainAtlas?.retailPlaybackResolved === false,
      fountainAtlasDrawRecordsHaveGrid:
        drawRecords.length > 0 &&
        drawRecords.every(
          (record) =>
            record.atlasProvenance?.emitterType === "Fountain" &&
            record.atlasProvenance?.textureRef === "fx_canonical_fire" &&
            record.atlasProvenance?.atlasGrid?.x === 4 &&
            record.atlasProvenance?.atlasGrid?.y === 4
        ),
      fountainAtlasFrameIndexesInRange:
        frameIndexes.length === drawRecords.length &&
        frameIndexes.every((frameIndex) => frameIndex >= 0 && frameIndex <= 15),
      fountainAtlasRenderedFramesMatchDrawRecords:
        Array.isArray(frame.domStatus?.renderedAtlasFrames) &&
        frame.domStatus.renderedAtlasFrames.length === frameIndexes.length &&
        frame.domStatus.renderedAtlasFrames.every(
          (frameIndex, index) => frameIndex === frameIndexes[index]
        ),
      fountainAtlasRenderedAtlasFrameAttributeBucketsAreUniformPerRecord:
        Number(renderedGeometry.atlasFrameAttributeMinUniqueValuesPerRecord) === 1 &&
        Number(renderedGeometry.atlasFrameAttributeMaxUniqueValuesPerRecord) === 1,
      fountainAtlasRenderedUvRectCountMatchesDrawRecords:
        uvU0.length === drawRecords.length &&
        uvV0.length === drawRecords.length &&
        uvU1.length === drawRecords.length &&
        uvV1.length === drawRecords.length,
      fountainAtlasRenderedUvRectsStayWithinUnitRange:
        [...uvU0, ...uvV0, ...uvU1, ...uvV1].length === drawRecords.length * 4 &&
        [...uvU0, ...uvV0, ...uvU1, ...uvV1].every(
          (entry) => Number(entry) >= 0 && Number(entry) <= 1
        ),
      fountainAtlasRenderedUvRectsMatchDrawRecordOrder:
        uvU0.length === drawRecords.length &&
        uvV0.length === drawRecords.length &&
        uvU1.length === drawRecords.length &&
        uvV1.length === drawRecords.length &&
        drawRecords.every(
          (record, index) =>
            Number(uvU0[index]) === Number(record.atlasUv?.u0) &&
            Number(uvV0[index]) === Number(record.atlasUv?.v0) &&
            Number(uvU1[index]) === Number(record.atlasUv?.u1) &&
            Number(uvV1[index]) === Number(record.atlasUv?.v1)
        ),
      fountainAtlasRenderedUvRectsUseQuarterGrid:
        uvU0.length === drawRecords.length &&
        [...uvU0, ...uvV0, ...uvU1, ...uvV1].every(
          (entry) => Number.isFinite(Number(entry)) && Number.isInteger(Number(entry) * 4)
        ),
      fountainAtlasRenderedUvAttributeBucketsHaveFourCornersPerRecord:
        Number(renderedGeometry.uvAttributeMinUniqueValuesPerRecord) === 4 &&
        Number(renderedGeometry.uvAttributeMaxUniqueValuesPerRecord) === 4,
      fountainAtlasRenderedPositionAttributeBucketsHaveFourCornersPerRecord:
        Number(renderedGeometry.positionAttributeMinUniqueValuesPerRecord) === 4 &&
        Number(renderedGeometry.positionAttributeMaxUniqueValuesPerRecord) === 4,
      fountainAtlasUsesMultipleFrames: distinctFrameIndexes.size >= 3,
      fountainAtlasMaterialOffsetBlocked: drawRecords.every(
        (record) => record.atlasProvenance?.materialLevelFrameOffsetAllowed === false
      )
    });
  }

  if (isPltLayerColors) {
    const layers = drawRecords
      .map((record) => record.atlasProvenance?.pltLayer)
      .filter((layer) => typeof layer === "string");
    const layerSet = new Set(layers);
    const colorR = Array.isArray(frame.domStatus?.renderedColorR)
      ? frame.domStatus.renderedColorR
      : [];
    const colorG = Array.isArray(frame.domStatus?.renderedColorG)
      ? frame.domStatus.renderedColorG
      : [];
    const colorB = Array.isArray(frame.domStatus?.renderedColorB)
      ? frame.domStatus.renderedColorB
      : [];
    const colorKeys = new Set(
      drawRecords.map((record) =>
        [record.color?.r, record.color?.g, record.color?.b]
          .map((channel) => (typeof channel === "number" ? channel.toFixed(3) : "missing"))
          .join("/")
      )
    );
    Object.assign(checks, {
      pltLayerCountMatchesDrawRecords: layers.length === drawRecords.length,
      pltRequiredLayersPresent:
        layerSet.has("skin") &&
        layerSet.has("hair") &&
        layerSet.has("cloth1") &&
        layerSet.has("cloth2"),
      pltLayerColorsAreDistinct: colorKeys.size >= 4,
      pltRenderedColorVectorCountMatchesDrawRecords:
        colorR.length === drawRecords.length &&
        colorG.length === drawRecords.length &&
        colorB.length === drawRecords.length,
      pltRenderedColorValuesInUnitRange:
        colorR.length === drawRecords.length &&
        colorG.length === drawRecords.length &&
        colorB.length === drawRecords.length &&
        [...colorR, ...colorG, ...colorB].every((entry) => Number(entry) >= 0 && Number(entry) <= 1),
      pltRenderedColorVectorsMatchDrawRecordOrder:
        colorR.length === drawRecords.length &&
        colorG.length === drawRecords.length &&
        colorB.length === drawRecords.length &&
        drawRecords.every(
          (record, index) =>
            Number(colorR[index]) === Number(record.color?.r) &&
            Number(colorG[index]) === Number(record.color?.g) &&
            Number(colorB[index]) === Number(record.color?.b)
        ),
      pltRenderedColorVectorsDistinct: new Set(
        colorR.map((entry, index) =>
          [entry, colorG[index], colorB[index]]
            .map((channel) => (typeof channel === "number" ? channel.toFixed(3) : "missing"))
            .join("/")
        )
      ).size >= 4,
      pltRenderedColorAttributeBucketsAreUniformPerRecord:
        Number(renderedGeometry.colorAttributeMinUniqueValuesPerRecord) === 1 &&
        Number(renderedGeometry.colorAttributeMaxUniqueValuesPerRecord) === 1
    });
  }

  const visualSemanticOracle = buildVisualSemanticOracle({
    snapshot,
    frame,
    comparison,
    renderContract,
    drawRecords,
    checks,
    isChunkLane,
    isMode2Lighten,
    isFireballDetonate,
    isRow68Healing,
    isRow50Death,
    isEffectBeam,
    isFountainAtlas,
    isPltLayerColors,
    isP2pGravity,
    isLinkedLane
  });
  const visualSemanticChecks = visualSemanticOracle.checks;

  return {
    version: "aurora-vfx-render-contract-visual-correlation/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: snapshot.fixtureId,
    timeSeconds: snapshot.timeSeconds,
    seed: snapshot.seed,
    oracle: "render-contract-local-diagnostic",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    artifacts: {
      renderContractSnapshot: snapshotPath,
      screenshot: screenshotPath,
      frame: framePath,
      comparison: comparisonPath
    },
    contractMetrics: snapshot.metrics,
    frameStatus: frame.domStatus,
    comparisonMetrics: comparison.metrics,
    laneProbe: {
      drawLane: renderContract.drawLane,
      renderMode: renderContract.renderMode,
      blendMode: renderContract.blendMode,
      chunkLane: renderContract.chunkLane,
      firstDrawRecord: drawRecords[0] ?? null,
      middleDrawRecords: drawRecords.slice(1, -1),
      lastDrawRecord: drawRecords.at(-1) ?? null
    },
    checks,
    visualSemanticOracle,
    visualSemanticChecks,
    result: Object.values(checks).every(Boolean) && Object.values(visualSemanticChecks).every(Boolean)
      ? "render-contract-and-visual-output-correlated-local-diagnostic"
      : "render-contract-visual-correlation-failed",
    notes: [
      "Generated by the reusable local VFX visual correlation runner.",
      "This proves local render-contract/browser-output consistency only and cannot promote canonical retail parity."
    ]
  };
}

function buildVisualSemanticOracle({
  snapshot,
  frame,
  comparison,
  renderContract,
  drawRecords,
  checks,
  isChunkLane,
  isMode2Lighten,
  isFireballDetonate,
  isRow68Healing,
  isRow50Death,
  isEffectBeam,
  isFountainAtlas,
  isPltLayerColors,
  isP2pGravity,
  isLinkedLane
}) {
  const renderedMaterial = frame.domStatus?.renderedMaterial ?? {};
  const renderedGeometry = frame.domStatus?.renderedGeometry ?? {};
  const renderedDiagnosticCodes = Array.isArray(frame.domStatus?.renderedDiagnosticCodes)
    ? frame.domStatus.renderedDiagnosticCodes
    : [];
  const renderedPositionX = Array.isArray(frame.domStatus?.renderedPositionX)
    ? frame.domStatus.renderedPositionX
    : [];
  const renderedPositionY = Array.isArray(frame.domStatus?.renderedPositionY)
    ? frame.domStatus.renderedPositionY
    : [];
  const renderedVelocityX = Array.isArray(frame.domStatus?.renderedVelocityX)
    ? frame.domStatus.renderedVelocityX
    : [];
  const renderedVelocityY = Array.isArray(frame.domStatus?.renderedVelocityY)
    ? frame.domStatus.renderedVelocityY
    : [];
  const renderedAlpha = Array.isArray(frame.domStatus?.renderedAlpha)
    ? frame.domStatus.renderedAlpha
    : [];
  const renderedColorR = Array.isArray(frame.domStatus?.renderedColorR)
    ? frame.domStatus.renderedColorR
    : [];
  const renderedColorG = Array.isArray(frame.domStatus?.renderedColorG)
    ? frame.domStatus.renderedColorG
    : [];
  const renderedColorB = Array.isArray(frame.domStatus?.renderedColorB)
    ? frame.domStatus.renderedColorB
    : [];
  const renderedParticleSizeX = Array.isArray(frame.domStatus?.renderedParticleSizeX)
    ? frame.domStatus.renderedParticleSizeX
    : [];
  const renderedParticleSizeY = Array.isArray(frame.domStatus?.renderedParticleSizeY)
    ? frame.domStatus.renderedParticleSizeY
    : [];
  const renderedAtlasFrames = Array.isArray(frame.domStatus?.renderedAtlasFrames)
    ? frame.domStatus.renderedAtlasFrames
    : [];
  const renderedAtlasUvU0 = Array.isArray(frame.domStatus?.renderedAtlasUvU0)
    ? frame.domStatus.renderedAtlasUvU0
    : [];
  const renderedAtlasUvV0 = Array.isArray(frame.domStatus?.renderedAtlasUvV0)
    ? frame.domStatus.renderedAtlasUvV0
    : [];
  const renderedAtlasUvU1 = Array.isArray(frame.domStatus?.renderedAtlasUvU1)
    ? frame.domStatus.renderedAtlasUvU1
    : [];
  const renderedAtlasUvV1 = Array.isArray(frame.domStatus?.renderedAtlasUvV1)
    ? frame.domStatus.renderedAtlasUvV1
    : [];
  const bounds = comparison.metrics?.bounds ?? {};
  const boundsAreFinite =
    ["x0", "y0", "x1", "y1"].every((key) => Number.isFinite(Number(bounds[key]))) &&
    Number(bounds.x1) > Number(bounds.x0) &&
    Number(bounds.y1) > Number(bounds.y0);
  const mode2FourPointZigZag =
    !isMode2Lighten ||
    (drawRecords.length === 4 &&
      renderedPositionX.length === 4 &&
      renderedPositionY.length === 4 &&
      renderedPositionX.every(
        (value, index) => index === 0 || Number(value) > Number(renderedPositionX[index - 1])
      ) &&
      Number(renderedPositionY[0]) < 0 &&
      Number(renderedPositionY[1]) > 0 &&
      Number(renderedPositionY[2]) < 0 &&
      Number(renderedPositionY[3]) > 0);
  const mode2AlphaFade =
    !isMode2Lighten ||
    (drawRecords.length === 4 &&
      renderedAlpha.length === 4 &&
      renderedAlpha.every(
        (value, index) => index === 0 || Number(value) < Number(renderedAlpha[index - 1])
      ));
  const renderedColorsMatchDrawRecords =
    renderedColorR.length === drawRecords.length &&
    renderedColorG.length === drawRecords.length &&
    renderedColorB.length === drawRecords.length &&
    drawRecords.every(
      (record, index) =>
        approxEqual(Number(renderedColorR[index]), Number(record.color?.r)) &&
        approxEqual(Number(renderedColorG[index]), Number(record.color?.g)) &&
        approxEqual(Number(renderedColorB[index]), Number(record.color?.b))
    );
  const fireballDrawModeRoute =
    !isFireballDetonate ||
    (checks.analyzerRenderedGeometryNonIndexedDrawArrays === true &&
      checks.analyzerRenderedGeometryIndexedDrawArrays === true &&
      checks.analyzerRenderedGeometryDrawModeArgumentMatchesContract === true &&
      checks.analyzerRenderedGeometryDrawModeArgumentSourceMatchesContract === true &&
      checks.analyzerRenderedGeometryVerticesPerParticleMatchesContract === true &&
      checks.analyzerRenderedGeometryAtlasUvSourceMatchesContract === true &&
      renderedGeometry.nonIndexedDrawArrays === "true" &&
      renderedGeometry.indexedDrawArrays === "false" &&
      Number(renderedGeometry.drawModeArgument) === 3 &&
      renderedGeometry.drawModeArgumentSource === "aurora-draw-wrapper-mode-arg3" &&
      Number(renderedGeometry.verticesPerParticle) === 6 &&
      drawRecords.every(
        (record) =>
          record.drawRoute?.route === "non_indexed_draw_arrays" &&
          record.drawRoute?.indexed === false &&
          record.drawRoute?.drawModeArgument === 3 &&
          record.drawRoute?.drawModeArgumentSource === "aurora-draw-wrapper-mode-arg3" &&
          record.drawRoute?.enumTableCaptured === false &&
          record.drawRoute?.triangleListInferenceProof === "diagnostic_pending"
      ));
  const fireballWarmColorPair =
    !isFireballDetonate ||
    (drawRecords.length === 2 &&
      renderedColorsMatchDrawRecords &&
      drawRecords.every((record) => {
        const color = record.color ?? {};
        return Number(color.r) >= 0.9 && Number(color.g) >= Number(color.b) && Number(color.b) <= 0.25;
      }) &&
      drawRecords.some((record) => Number(record.color?.g) >= 0.6) &&
      drawRecords.some((record) => Number(record.color?.g) <= 0.25));
  const fireballWarmColorOrder =
    !isFireballDetonate ||
    (drawRecords.length === 2 &&
      renderedColorsMatchDrawRecords &&
      Number(drawRecords[0]?.color?.r) >= 0.9 &&
      Number(drawRecords[0]?.color?.g) >= 0.6 &&
      Number(drawRecords[0]?.color?.b) >= 0.1 &&
      Number(drawRecords[0]?.color?.b) <= 0.25 &&
      Number(drawRecords[1]?.color?.r) >= 0.9 &&
      Number(drawRecords[1]?.color?.g) <= 0.25 &&
      Number(drawRecords[1]?.color?.b) <= 0.15);
  const fireballDrawShape =
    !isFireballDetonate ||
    (renderContract.drawLane === "textured_quad" &&
      renderContract.drawParticleCount === 2 &&
      drawRecords.length === 2 &&
      Number(renderContract.drawVertexCount) === 12 &&
      Number(renderedGeometry.verticesPerParticle) === 6 &&
      Number(renderedGeometry.positionAttributeMinUniqueValuesPerRecord) >= 4 &&
      Number(renderedGeometry.positionAttributeMaxUniqueValuesPerRecord) >= 4);
  const fireballParticleSize =
    !isFireballDetonate ||
    (checks.fireballParticleSizeXPositive === true &&
      checks.fireballParticleSizeYPositive === true &&
      checks.fireballParticleSizeVectorsMatchDrawRecordCount === true &&
      checks.fireballRenderedParticleSizeAttributeBucketsAreUniformPerRecord === true &&
      checks.analyzerRenderedParticleSizeVectorsMatchContract === true);
  const fireballDetonateAlphaFade =
    !isFireballDetonate ||
    (drawRecords.length === 2 &&
      renderedAlpha.length === 2 &&
      Number(renderedAlpha[0]) > Number(renderedAlpha[1]) &&
      renderedAlpha.every((value) => Number(value) >= 0 && Number(value) <= 1) &&
      checks.analyzerRenderedAlphaMatchesContract === true &&
      checks.analyzerRenderedGeometryAlphaAttributeUniqueValuesPerRecordMatchContract === true);
  const fireballDetonateOutwardMotion =
    !isFireballDetonate ||
    (drawRecords.length === 2 &&
      renderedPositionX.length === 2 &&
      renderedVelocityX.length === 2 &&
      renderedVelocityY.length === 2 &&
      Number(renderedPositionX[0]) < 0 &&
      Number(renderedPositionX[1]) > 0 &&
      Number(renderedPositionX[1]) > Number(renderedPositionX[0]) &&
      Number(renderedVelocityX[0]) < 0 &&
      Number(renderedVelocityX[1]) > 0 &&
      renderedVelocityY.every((value) => Number(value) > 0) &&
      checks.analyzerRenderedPositionVectorsMatchContract === true &&
      checks.analyzerRenderedVelocityVectorsMatchContract === true);
  const fireballAtlasAndMaterial =
    !isFireballDetonate ||
    (frame.domStatus?.textureProfile === "radial-soft-atlas-4x4-v2" &&
      checks.analyzerTextureStatusApplied === true &&
      checks.analyzerTextureAtlasDimensionsConsistent === true &&
      checks.analyzerRenderedAtlasUvRectsMatchContract === true &&
      renderedMaterial.mapBound === "true" &&
      renderedMaterial.vertexColors === "true" &&
      renderedMaterial.side === "DoubleSide");
  const fireballParticleOrder =
    !isFireballDetonate ||
    (drawRecords.length === 2 &&
      renderContract.drawParticleCount === 2 &&
      frame.domStatus?.drawParticles === 2 &&
      checks.analyzerRenderedDrawRecordIdsMatchContract === true &&
      checks.analyzerRenderedParticleIdsMatchContract === true &&
      checks.analyzerRenderedParticleIndexesMatchContract === true &&
      checks.analyzerRenderedRecordVerticesPerParticleMatchContract === true);
  const fireballDiagnosticBoundary =
    !isFireballDetonate ||
    (renderedDiagnosticCodes.includes("VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF") &&
      renderedDiagnosticCodes.includes("VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED") &&
      renderedDiagnosticCodes.includes("VFX_PARTICLE_DRAW_NON_INDEXED_ARRAYS_REQUIRED"));
  const fireballFraming =
    !isFireballDetonate ||
    (comparison.metrics?.connectedComponentCount >= 1 &&
      comparison.metrics?.connectedComponentCount <= 2 &&
      boundsAreFinite &&
      comparison.metrics?.objectPixels > 0);
  const row68HealingColorPair =
    !isRow68Healing ||
    (drawRecords.length === 2 &&
      renderedColorsMatchDrawRecords &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) >= 0.9 &&
          Number(record.color?.g) >= 0.25 &&
          Number(record.color?.g) <= 0.55 &&
          Number(record.color?.b) <= 0.35
      ) &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) <= 0.4 &&
          Number(record.color?.g) >= 0.85 &&
          Number(record.color?.b) >= 0.7
      ));
  const row68HealingColorPlacement =
    !isRow68Healing ||
    (drawRecords.length === 2 &&
      renderedPositionX.length === 2 &&
      renderedPositionY.length === 2 &&
      renderedColorR.length === 2 &&
      renderedColorG.length === 2 &&
      renderedColorB.length === 2 &&
      Number(renderedPositionX[0]) < Number(renderedPositionX[1]) &&
      Number(renderedPositionY[0]) < Number(renderedPositionY[1]) &&
      Number(renderedColorR[0]) >= 0.9 &&
      Number(renderedColorG[0]) >= 0.25 &&
      Number(renderedColorG[0]) <= 0.55 &&
      Number(renderedColorB[0]) <= 0.35 &&
      Number(renderedColorR[1]) <= 0.4 &&
      Number(renderedColorG[1]) >= 0.85 &&
      Number(renderedColorB[1]) >= 0.7 &&
      checks.analyzerRenderedPositionVectorsMatchContract === true &&
      checks.analyzerRenderedColorVectorsMatchContract === true);
  const row68HealingAlphaFade =
    !isRow68Healing ||
    (drawRecords.length === 2 &&
      renderedAlpha.length === 2 &&
      Number(renderedAlpha[0]) > Number(renderedAlpha[1]) &&
      renderedAlpha.every((value) => Number(value) >= 0 && Number(value) <= 1) &&
      checks.analyzerRenderedAlphaMatchesContract === true &&
      checks.analyzerRenderedGeometryAlphaAttributeUniqueValuesPerRecordMatchContract === true);
  const row68HealingParticleSize =
    !isRow68Healing ||
    (drawRecords.length === 2 &&
      renderedParticleSizeX.length === 2 &&
      renderedParticleSizeY.length === 2 &&
      renderedParticleSizeX.every((value) => Number(value) > 0) &&
      renderedParticleSizeY.every((value) => Number(value) > 0) &&
      Number(renderedParticleSizeX[0]) > Number(renderedParticleSizeX[1]) &&
      Number(renderedParticleSizeY[0]) > Number(renderedParticleSizeY[1]) &&
      checks.analyzerRenderedParticleSizeVectorsMatchContract === true &&
      checks.analyzerRenderedGeometryParticleSizeAttributeUniqueValuesPerRecordMatchContract === true);
  const row68HealingDrawShape =
    !isRow68Healing ||
    (renderContract.drawLane === "textured_quad" &&
      renderContract.drawParticleCount === 2 &&
      drawRecords.length === 2 &&
      Number(renderContract.drawVertexCount) === 12 &&
      Number(renderedGeometry.verticesPerParticle) === 6 &&
      Number(renderedGeometry.positionAttributeMinUniqueValuesPerRecord) >= 4 &&
      Number(renderedGeometry.positionAttributeMaxUniqueValuesPerRecord) >= 4);
  const row50DeathColorPair =
    !isRow50Death ||
    (drawRecords.length === 2 &&
      renderedColorsMatchDrawRecords &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) >= 0.65 &&
          Number(record.color?.r) <= 0.8 &&
          Number(record.color?.g) >= 0.4 &&
          Number(record.color?.g) <= 0.6 &&
          Number(record.color?.b) >= 0.9
      ) &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) >= 0.85 &&
          Number(record.color?.g) >= 0.85 &&
          Number(record.color?.b) >= 0.9
      ));
  const row50DeathDrawShape =
    !isRow50Death ||
    (renderContract.drawLane === "textured_quad" &&
      renderContract.drawParticleCount === 2 &&
      drawRecords.length === 2 &&
      Number(renderContract.drawVertexCount) === 12 &&
      Number(renderedGeometry.verticesPerParticle) === 6 &&
      Number(renderedGeometry.positionAttributeMinUniqueValuesPerRecord) >= 4 &&
      Number(renderedGeometry.positionAttributeMaxUniqueValuesPerRecord) >= 4);
  const row50DeathColorPlacement =
    !isRow50Death ||
    (drawRecords.length === 2 &&
      renderedPositionX.length === 2 &&
      renderedPositionY.length === 2 &&
      renderedColorR.length === 2 &&
      renderedColorG.length === 2 &&
      renderedColorB.length === 2 &&
      Number(renderedPositionX[0]) < Number(renderedPositionX[1]) &&
      Number(renderedPositionY[0]) < Number(renderedPositionY[1]) &&
      Number(renderedColorR[0]) >= 0.65 &&
      Number(renderedColorR[0]) <= 0.8 &&
      Number(renderedColorG[0]) >= 0.4 &&
      Number(renderedColorG[0]) <= 0.6 &&
      Number(renderedColorB[0]) >= 0.9 &&
      Number(renderedColorR[1]) >= 0.85 &&
      Number(renderedColorG[1]) >= 0.85 &&
      Number(renderedColorB[1]) >= 0.9 &&
      checks.analyzerRenderedPositionVectorsMatchContract === true &&
      checks.analyzerRenderedColorVectorsMatchContract === true);
  const row50DeathAlphaFade =
    !isRow50Death ||
    (drawRecords.length === 2 &&
      renderedAlpha.length === 2 &&
      Number(renderedAlpha[0]) > Number(renderedAlpha[1]) &&
      renderedAlpha.every((value) => Number(value) >= 0 && Number(value) <= 1) &&
      checks.analyzerRenderedAlphaMatchesContract === true &&
      checks.analyzerRenderedGeometryAlphaAttributeUniqueValuesPerRecordMatchContract === true);
  const row50DeathParticleSize =
    !isRow50Death ||
    (drawRecords.length === 2 &&
      renderedParticleSizeX.length === 2 &&
      renderedParticleSizeY.length === 2 &&
      renderedParticleSizeX.every((value) => Number(value) > 0) &&
      renderedParticleSizeY.every((value) => Number(value) > 0) &&
      Number(renderedParticleSizeX[0]) > Number(renderedParticleSizeX[1]) &&
      Number(renderedParticleSizeY[0]) > Number(renderedParticleSizeY[1]) &&
      checks.analyzerRenderedParticleSizeVectorsMatchContract === true &&
      checks.analyzerRenderedGeometryParticleSizeAttributeUniqueValuesPerRecordMatchContract === true);
  const effectBeamColorPair =
    !isEffectBeam ||
    (drawRecords.length === 5 &&
      renderedColorsMatchDrawRecords &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) >= 0.95 &&
          Number(record.color?.g) >= 0.25 &&
          Number(record.color?.g) <= 0.5 &&
          Number(record.color?.b) <= 0.15
      ) &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) >= 0.95 &&
          Number(record.color?.g) >= 0.75 &&
          Number(record.color?.b) >= 0.15 &&
          Number(record.color?.b) <= 0.35
      ));
  const effectBeamColorAlternation =
    !isEffectBeam ||
    (drawRecords.length === 5 &&
      renderedColorsMatchDrawRecords &&
      drawRecords.every((record, index) => {
        const color = record.color ?? {};
        const isOrange =
          Number(color.r) >= 0.95 &&
          Number(color.g) >= 0.25 &&
          Number(color.g) <= 0.5 &&
          Number(color.b) <= 0.15;
        const isYellow =
          Number(color.r) >= 0.95 &&
          Number(color.g) >= 0.75 &&
          Number(color.b) >= 0.15 &&
          Number(color.b) <= 0.35;
        return index % 2 === 0 ? isOrange : isYellow;
      }));
  const effectBeamDrawShape =
    !isEffectBeam ||
    (renderContract.drawLane === "textured_quad" &&
      renderContract.drawParticleCount === 5 &&
      drawRecords.length === 5 &&
      Number(renderContract.drawVertexCount) === 30 &&
      Number(renderedGeometry.verticesPerParticle) === 6 &&
      Number(renderedGeometry.positionAttributeMinUniqueValuesPerRecord) >= 4 &&
      Number(renderedGeometry.positionAttributeMaxUniqueValuesPerRecord) >= 4);
  const effectBeamBodyNodeChest =
    !isEffectBeam ||
    (checks.effectBeamBodyNodeChestPreserved === true &&
      drawRecords.length === 5 &&
      drawRecords.every(
        (record) =>
          record.atlasProvenance?.bodyNode === "BODY_NODE_CHEST" &&
          record.atlasProvenance?.beamContextSource === "dev_effectbeam_context_diagnostic"
      ));
  const effectBeamSegmentOrder =
    !isEffectBeam ||
    (checks.effectBeamStartsAtSourceLeft === true &&
      checks.effectBeamEndsAtTargetRight === true &&
      checks.effectBeamSegmentsOrdered === true &&
      drawRecords.every(
        (record, index) =>
          record.atlasProvenance?.beamSegmentIndex === index &&
          record.atlasProvenance?.beamSegmentCount === 5
      ));
  const effectBeamSegmentSpacing =
    !isEffectBeam ||
    (drawRecords.length === 5 &&
      drawRecords.every((record) => Number.isFinite(Number(record.position?.x))) &&
      drawRecords
        .slice(1)
        .map((record, index) => Number(record.position?.x) - Number(drawRecords[index]?.position?.x))
        .every((delta, index, deltas) => delta > 0 && approxEqual(delta, deltas[0])) &&
      drawRecords.every(
        (record, index) =>
          index === 0 ||
          (Number.isFinite(Number(record.position?.y)) &&
            Number.isFinite(Number(drawRecords[index - 1]?.position?.y)) &&
            Number(record.position?.y) >= Number(drawRecords[index - 1]?.position?.y))
      ));
  const effectBeamAlphaFade =
    !isEffectBeam ||
    (drawRecords.length === 5 &&
      renderedAlpha.length === 5 &&
      renderedAlpha.every(
        (value, index) => index === 0 || Number(value) < Number(renderedAlpha[index - 1])
      ) &&
      checks.analyzerRenderedAlphaMatchesContract === true);
  const effectBeamParticleSizeWaist =
    !isEffectBeam ||
    (drawRecords.length === 5 &&
      renderedParticleSizeX.length === 5 &&
      renderedParticleSizeY.length === 5 &&
      renderedParticleSizeX.every((value) => Number(value) > 0) &&
      renderedParticleSizeY.every((value) => Number(value) > 0) &&
      renderedParticleSizeX.every((value) => approxEqual(Number(value), Number(renderedParticleSizeX[0]))) &&
      Number(renderedParticleSizeY[2]) < Number(renderedParticleSizeY[1]) &&
      Number(renderedParticleSizeY[2]) < Number(renderedParticleSizeY[3]) &&
      Number(renderedParticleSizeY[0]) > Number(renderedParticleSizeY[1]) &&
      Number(renderedParticleSizeY[4]) > Number(renderedParticleSizeY[3]) &&
      checks.analyzerRenderedParticleSizeVectorsMatchContract === true &&
      checks.analyzerRenderedGeometryParticleSizeAttributeUniqueValuesPerRecordMatchContract === true);
  const fountainAtlasFrameIndexes = drawRecords
    .map((record) => record.atlasUv?.frameIndex)
    .filter((frameIndex) => typeof frameIndex === "number");
  const fountainAtlasDistinctFrames = new Set(fountainAtlasFrameIndexes);
  const fountainAtlasContext = renderContract.fountainAtlas;
  const fountainAtlasDrawShape =
    !isFountainAtlas ||
    (renderContract.drawLane === "textured_quad" &&
      renderContract.drawParticleCount === 6 &&
      drawRecords.length === 6 &&
      Number(renderContract.drawVertexCount) === 36 &&
      Number(renderedGeometry.verticesPerParticle) === 6 &&
      Number(renderedGeometry.positionAttributeMinUniqueValuesPerRecord) >= 4 &&
      Number(renderedGeometry.positionAttributeMaxUniqueValuesPerRecord) >= 4);
  const fountainAtlasGridAndFrameRange =
    !isFountainAtlas ||
    (checks.fountainAtlasContextPreserved === true &&
      checks.fountainAtlasFrameRangePreserved === true &&
      fountainAtlasContext?.randomFrameStart === true &&
      fountainAtlasContext?.retailPlaybackResolved === false);
  const fountainAtlasFramePlayback =
    !isFountainAtlas ||
    (checks.fountainAtlasFrameIndexesInRange === true &&
      checks.fountainAtlasRenderedFramesMatchDrawRecords === true &&
      checks.fountainAtlasRenderedAtlasFrameAttributeBucketsAreUniformPerRecord === true &&
      checks.fountainAtlasUsesMultipleFrames === true &&
      checks.fountainAtlasMaterialOffsetBlocked === true &&
      fountainAtlasDistinctFrames.size >= 3);
  const fountainAtlasTrajectory =
    !isFountainAtlas ||
    (drawRecords.length === 6 &&
      renderedPositionX.length === 6 &&
      renderedPositionY.length === 6 &&
      checks.analyzerRenderedPositionVectorsMatchContract === true &&
      renderedPositionY.every(
        (value, index) => index === 0 || Number(value) >= Number(renderedPositionY[index - 1])
      ) &&
      Number(renderedPositionY[5]) > Number(renderedPositionY[0]) &&
      Math.min(...renderedPositionX.map(Number)) < 0 &&
      Math.max(...renderedPositionX.map(Number)) > 0);
  const fountainAtlasUvGrid =
    !isFountainAtlas ||
    (checks.fountainAtlasRenderedUvRectCountMatchesDrawRecords === true &&
      checks.fountainAtlasRenderedUvRectsStayWithinUnitRange === true &&
      checks.fountainAtlasRenderedUvRectsMatchDrawRecordOrder === true &&
      checks.fountainAtlasRenderedUvRectsUseQuarterGrid === true &&
      checks.fountainAtlasRenderedUvAttributeBucketsHaveFourCornersPerRecord === true);
  const fountainAtlasParticleOrder =
    !isFountainAtlas ||
    (drawRecords.length === 6 &&
      renderContract.drawParticleCount === 6 &&
      frame.domStatus?.drawParticles === 6 &&
      checks.analyzerRenderedDrawRecordIdsMatchContract === true &&
      checks.analyzerRenderedParticleIdsMatchContract === true &&
      checks.analyzerRenderedParticleIndexesMatchContract === true &&
      checks.analyzerRenderedRecordVerticesPerParticleMatchContract === true);
  const fountainAtlasAlphaFade =
    !isFountainAtlas ||
    (drawRecords.length === 6 &&
      renderedAlpha.length === 6 &&
      renderedAlpha.every(
        (value, index) => index === 0 || Number(value) < Number(renderedAlpha[index - 1])
      ) &&
      renderedAlpha.every((value) => Number(value) >= 0 && Number(value) <= 1) &&
      checks.analyzerRenderedAlphaMatchesContract === true &&
      checks.analyzerRenderedGeometryAlphaAttributeUniqueValuesPerRecordMatchContract === true);
  const fountainAtlasParticleSizeEnvelope =
    !isFountainAtlas ||
    (drawRecords.length === 6 &&
      renderedParticleSizeX.length === 6 &&
      renderedParticleSizeY.length === 6 &&
      renderedParticleSizeX.every((value) => Number(value) >= 0.32 && Number(value) <= 0.47) &&
      renderedParticleSizeY.every((value) => Number(value) >= 0.39 && Number(value) <= 0.55) &&
      new Set(renderedParticleSizeX.map((value) => Number(value).toFixed(3))).size >= 4 &&
      new Set(renderedParticleSizeY.map((value) => Number(value).toFixed(3))).size >= 4 &&
      checks.analyzerRenderedParticleSizeVectorsMatchContract === true &&
      checks.analyzerRenderedGeometryParticleSizeAttributeUniqueValuesPerRecordMatchContract === true);
  const fountainAtlasAtlasAndMaterial =
    !isFountainAtlas ||
    (frame.domStatus?.textureProfile === "radial-soft-atlas-4x4-v2" &&
      checks.analyzerTextureStatusApplied === true &&
      checks.analyzerTextureAtlasDimensionsConsistent === true &&
      checks.analyzerRenderedAtlasUvRectsMatchContract === true &&
      renderedMaterial.mapBound === "true" &&
      renderedMaterial.vertexColors === "true" &&
      renderedMaterial.side === "DoubleSide");
  const fountainAtlasDiagnosticBoundary =
    !isFountainAtlas ||
    (checks.fountainAtlasRetailPlaybackNotResolved === true &&
      checks.fountainAtlasMaterialOffsetBlocked === true);
  const fountainAtlasFraming =
    !isFountainAtlas ||
    (comparison.metrics?.connectedComponentCount >= 1 &&
      comparison.metrics?.connectedComponentCount <= 6 &&
      boundsAreFinite &&
      comparison.metrics?.objectPixels > 0);
  const pltLayerColorSources = drawRecords
    .map((record) => record.atlasProvenance?.pltLayerColorSource ?? record.pltLayerColorSource)
    .filter((source) => typeof source === "string");
  const pltLayerOrder = drawRecords.map((record) => record.atlasProvenance?.pltLayer ?? record.pltLayer);
  const pltExpectedLayerOrder =
    pltLayerOrder.length === 4 &&
    pltLayerOrder[0] === "skin" &&
    pltLayerOrder[1] === "hair" &&
    pltLayerOrder[2] === "cloth1" &&
    pltLayerOrder[3] === "cloth2";
  const pltLayerDrawShape =
    !isPltLayerColors ||
    (renderContract.drawLane === "textured_quad" &&
      renderContract.drawParticleCount === 4 &&
      drawRecords.length === 4 &&
      Number(renderContract.drawVertexCount) === 24 &&
      Number(renderedGeometry.verticesPerParticle) === 6 &&
      Number(renderedGeometry.positionAttributeMinUniqueValuesPerRecord) >= 4 &&
      Number(renderedGeometry.positionAttributeMaxUniqueValuesPerRecord) >= 4);
  const pltLayerPaletteOrder =
    !isPltLayerColors ||
    (checks.pltLayerCountMatchesDrawRecords === true &&
      checks.pltRequiredLayersPresent === true &&
      pltExpectedLayerOrder &&
      pltLayerColorSources.length === 4 &&
      pltLayerColorSources.every((source) => source === "dev_known_layer_color_diagnostic") &&
      checks.analyzerRenderedPltLayersMatchContract === true &&
      checks.analyzerRenderedPltLayerColorSourcesMatchContract === true);
  const pltLayerColorVectors =
    !isPltLayerColors ||
    (renderedColorsMatchDrawRecords &&
      checks.pltLayerColorsAreDistinct === true &&
      checks.pltRenderedColorVectorCountMatchesDrawRecords === true &&
      checks.pltRenderedColorValuesInUnitRange === true &&
      checks.pltRenderedColorVectorsMatchDrawRecordOrder === true &&
      checks.pltRenderedColorVectorsDistinct === true &&
      checks.pltRenderedColorAttributeBucketsAreUniformPerRecord === true);
  const pltLayerOpacity =
    !isPltLayerColors ||
    (drawRecords.length === 4 &&
      renderedAlpha.length === 4 &&
      renderedAlpha.every((value) => Number(value) >= 0 && Number(value) <= 1) &&
      renderedAlpha.every(
        (value, index) => index === 0 || Number(value) < Number(renderedAlpha[index - 1])
      ) &&
      checks.analyzerRenderedAlphaMatchesContract === true &&
      checks.analyzerRenderedGeometryAlphaAttributeUniqueValuesPerRecordMatchContract === true &&
      checks.analyzerRenderedGeometryAlphaAttributeRangeMatchesContract === true &&
      checks.analyzerMaterialOpacityIsUnit === true &&
      Number(renderedGeometry.alphaAttributeMin) >= 0 &&
      Number(renderedGeometry.alphaAttributeMax) <= 1);
  const pltLayerParticleSizeEnvelope =
    !isPltLayerColors ||
    (drawRecords.length === 4 &&
      renderedParticleSizeX.length === 4 &&
      renderedParticleSizeY.length === 4 &&
      renderedParticleSizeX.every((value) => approxEqual(Number(value), 0.18, 0.001)) &&
      renderedParticleSizeY.every((value) => approxEqual(Number(value), 0.28, 0.001)) &&
      checks.analyzerRenderedParticleSizeVectorsMatchContract === true &&
      checks.analyzerRenderedGeometryParticleSizeAttributeUniqueValuesPerRecordMatchContract === true &&
      checks.analyzerRenderedGeometryParticleSizeAttributeRangeMatchesContract === true);
  const pltLayerAtlasFrameOrder =
    !isPltLayerColors ||
    (drawRecords.length === 4 &&
      renderedAtlasFrames.length === 4 &&
      renderedAtlasFrames.every((frameIndex) => Number(frameIndex) >= 0 && Number(frameIndex) <= 15) &&
      new Set(renderedAtlasFrames).size === 4 &&
      renderedAtlasFrames.every(
        (frameIndex, index) =>
          index === 0 ||
          Number(frameIndex) === (Number(renderedAtlasFrames[index - 1]) + 3) % 16
      ) &&
      checks.analyzerRenderedAtlasFramesMatchContract === true &&
      checks.analyzerRenderedGeometryAtlasFrameAttributeUniqueValuesPerRecordMatchContract === true &&
      checks.analyzerRenderedGeometryAtlasFrameAttributeRangeMatchesContract === true);
  const pltLayerUvRectGrid =
    !isPltLayerColors ||
    (drawRecords.length === 4 &&
      renderedAtlasFrames.length === 4 &&
      renderedAtlasUvU0.length === 4 &&
      renderedAtlasUvV0.length === 4 &&
      renderedAtlasUvU1.length === 4 &&
      renderedAtlasUvV1.length === 4 &&
      renderedAtlasFrames.every((frameIndex, index) => {
        const column = Number(frameIndex) % 4;
        const row = Math.floor(Number(frameIndex) / 4);
        return (
          approxEqual(Number(renderedAtlasUvU0[index]), column * 0.25, 0.0001) &&
          approxEqual(Number(renderedAtlasUvV0[index]), row * 0.25, 0.0001) &&
          approxEqual(Number(renderedAtlasUvU1[index]), column * 0.25 + 0.25, 0.0001) &&
          approxEqual(Number(renderedAtlasUvV1[index]), row * 0.25 + 0.25, 0.0001)
        );
      }) &&
      [...renderedAtlasUvU0, ...renderedAtlasUvV0, ...renderedAtlasUvU1, ...renderedAtlasUvV1].every(
        (value) => Number(value) >= 0 && Number(value) <= 1
      ) &&
      checks.analyzerRenderedAtlasUvRectsMatchContract === true &&
      checks.analyzerRenderedGeometryUvAttributeUniqueValuesPerRecordMatchContract === true &&
      checks.analyzerRenderedGeometryUvAttributeRangeMatchesContract === true);
  const pltLayerSpatialOrder =
    !isPltLayerColors ||
    (pltExpectedLayerOrder &&
      renderedPositionX.length === 4 &&
      renderedPositionX.every((value) => Number.isFinite(Number(value))) &&
      renderedPositionX.every((value, index) => index === 0 || Number(value) > Number(renderedPositionX[index - 1])) &&
      checks.analyzerRenderedPositionVectorsMatchContract === true);
  const pltLayerMaterialAndAtlas =
    !isPltLayerColors ||
    (frame.domStatus?.textureProfile === "radial-soft-atlas-4x4-v2" &&
      checks.analyzerTextureStatusApplied === true &&
      checks.analyzerTextureAtlasDimensionsConsistent === true &&
      checks.analyzerRenderedAtlasUvRectsMatchContract === true &&
      renderedMaterial.mapBound === "true" &&
      renderedMaterial.vertexColors === "true" &&
      renderedMaterial.side === "DoubleSide");
  const pltLayerDiagnosticBoundary =
    !isPltLayerColors ||
    (renderedDiagnosticCodes.includes("VFX_PLT_LAYER_COLOR_SOURCE_EVIDENCE_REQUIRED") &&
      renderedDiagnosticCodes.includes("VFX_DEV_PLT_LAYER_COLORS_DIAGNOSTIC_ONLY") &&
      renderedDiagnosticCodes.includes("VFX_PLT_RETAIL_LAYER_PALETTE_REQUIRED"));
  const pltLayerFraming =
    !isPltLayerColors ||
    (comparison.metrics?.connectedComponentCount >= 1 &&
      comparison.metrics?.connectedComponentCount <= 4 &&
      boundsAreFinite &&
      comparison.metrics?.objectPixels > 0);
  const p2pGravityDrawShape =
    !isP2pGravity ||
    (renderContract.drawLane === "textured_quad" &&
      renderContract.drawParticleCount === 7 &&
      drawRecords.length === 7 &&
      Number(renderContract.drawVertexCount) === 42 &&
      Number(renderedGeometry.verticesPerParticle) === 6 &&
      Number(renderedGeometry.positionAttributeMinUniqueValuesPerRecord) >= 4 &&
      Number(renderedGeometry.positionAttributeMaxUniqueValuesPerRecord) >= 4);
  const p2pGravityArcPath =
    !isP2pGravity ||
    (checks.p2pArcStartsLeft === true &&
      checks.p2pArcEndsRight === true &&
      checks.p2pArcMiddleHigherThanEnds === true &&
      checks.p2pRenderedPositionVectorCountMatchesDrawRecords === true &&
      checks.p2pRenderedPositionXIncreasesAcrossArc === true &&
      checks.p2pRenderedPositionYMiddleHigherThanEnds === true &&
      checks.p2pRenderedPositionVectorsMatchDrawRecordOrder === true);
  const p2pGravitySegmentSpacing =
    !isP2pGravity ||
    (drawRecords.length === 7 &&
      renderedPositionX.length === 7 &&
      renderedPositionX.every((value) => Number.isFinite(Number(value))) &&
      renderedPositionX
        .slice(1)
        .map((value, index) => Number(value) - Number(renderedPositionX[index]))
        .every((delta, index, deltas) => delta > 0 && approxEqual(delta, deltas[0], 0.000001)));
  const p2pGravityVelocityPath =
    !isP2pGravity ||
    (checks.p2pVelocityXPositive === true &&
      checks.p2pVelocityYFallsAcrossArc === true &&
      checks.analyzerRenderedVelocityVectorsMatchContract === true);
  const p2pGravityAlphaFade =
    !isP2pGravity ||
    (drawRecords.length === 7 &&
      renderedAlpha.length === 7 &&
      renderedAlpha.every(
        (value, index) => index === 0 || Number(value) < Number(renderedAlpha[index - 1])
      ) &&
      checks.analyzerRenderedAlphaMatchesContract === true);
  const p2pGravityParticleSizeEnvelope =
    !isP2pGravity ||
    (drawRecords.length === 7 &&
      renderedParticleSizeX.length === 7 &&
      renderedParticleSizeY.length === 7 &&
      checks.analyzerRenderedParticleSizeVectorsMatchContract === true &&
      checks.analyzerRenderedGeometryParticleSizeAttributeUniqueValuesPerRecordMatchContract === true &&
      renderedParticleSizeX.every(
        (value) => Number.isFinite(Number(value)) && Number(value) >= 0.14 && Number(value) <= 0.27
      ) &&
      renderedParticleSizeY.every(
        (value) => Number.isFinite(Number(value)) && Number(value) >= 0.14 && Number(value) <= 0.27
      ) &&
      new Set(renderedParticleSizeX.map((value) => Number(value).toFixed(3))).size >= 4 &&
      new Set(renderedParticleSizeY.map((value) => Number(value).toFixed(3))).size >= 4);
  const p2pGravityColorPair =
    !isP2pGravity ||
    (drawRecords.length === 7 &&
      renderedColorsMatchDrawRecords &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) >= 0.35 &&
          Number(record.color?.r) <= 0.45 &&
          Number(record.color?.g) >= 0.7 &&
          Number(record.color?.g) <= 0.8 &&
          Number(record.color?.b) >= 0.95
      ) &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) >= 0.95 &&
          Number(record.color?.g) >= 0.65 &&
          Number(record.color?.g) <= 0.75 &&
          Number(record.color?.b) >= 0.15 &&
          Number(record.color?.b) <= 0.3
      ));
  const p2pGravityColorAlternation =
    !isP2pGravity ||
    (drawRecords.length === 7 &&
      renderedColorsMatchDrawRecords &&
      drawRecords.every((record, index) => {
        const color = record.color ?? {};
        const isBlue =
          Number(color.r) >= 0.35 &&
          Number(color.r) <= 0.45 &&
          Number(color.g) >= 0.7 &&
          Number(color.g) <= 0.8 &&
          Number(color.b) >= 0.95;
        const isYellow =
          Number(color.r) >= 0.95 &&
          Number(color.g) >= 0.65 &&
          Number(color.g) <= 0.75 &&
          Number(color.b) >= 0.15 &&
          Number(color.b) <= 0.3;
        return index % 2 === 0 ? isBlue : isYellow;
      }));
  const p2pGravityParticleOrder =
    !isP2pGravity ||
    (drawRecords.length === 7 &&
      renderContract.drawParticleCount === 7 &&
      frame.domStatus?.drawParticles === 7 &&
      checks.analyzerRenderedDrawRecordIdsMatchContract === true &&
      checks.analyzerRenderedParticleIdsMatchContract === true &&
      checks.analyzerRenderedParticleIndexesMatchContract === true &&
      checks.analyzerRenderedRecordVerticesPerParticleMatchContract === true &&
      checks.p2pRenderedDrawRecordIndexAttributeCoversAllDrawRecords === true &&
      checks.p2pRenderedDrawRecordIndexAttributeRangeMatchesDrawRecordOrder === true &&
      checks.p2pRenderedDrawRecordIndexAttributeSourceIsCanonical === true);
  const p2pGravityAtlasAndMaterial =
    !isP2pGravity ||
    (frame.domStatus?.textureProfile === "radial-soft-atlas-4x4-v2" &&
      checks.analyzerTextureStatusApplied === true &&
      checks.analyzerTextureAtlasDimensionsConsistent === true &&
      checks.analyzerRenderedAtlasUvRectsMatchContract === true &&
      renderedMaterial.mapBound === "true" &&
      renderedMaterial.vertexColors === "true" &&
      renderedMaterial.side === "DoubleSide");
  const p2pGravityDiagnosticBoundary =
    !isP2pGravity ||
    renderedDiagnosticCodes.includes("VFX_P2P_GRAVITY_SOURCE_EVIDENCE_REQUIRED") &&
      renderedDiagnosticCodes.includes("VFX_DEV_P2P_GRAVITY_DIAGNOSTIC_ONLY") &&
      renderedDiagnosticCodes.includes("VFX_P2P_GRAVITY_REFERENCE_NODE_REQUIRED");
  const p2pGravityFraming =
    !isP2pGravity ||
    (comparison.metrics?.connectedComponentCount >= 1 &&
      comparison.metrics?.connectedComponentCount <= 7 &&
      boundsAreFinite &&
      comparison.metrics?.objectPixels > 0);
  const linkedChainDrawShape =
    !isLinkedLane ||
    (renderContract.drawLane === "linked_textured_quad" &&
      renderContract.drawParticleCount === 5 &&
      drawRecords.length === 5 &&
      Number(renderContract.drawVertexCount) === 30 &&
      Number(renderedGeometry.verticesPerParticle) === 6 &&
      Number(renderedGeometry.positionAttributeMinUniqueValuesPerRecord) >= 4 &&
      Number(renderedGeometry.positionAttributeMaxUniqueValuesPerRecord) >= 4);
  const linkedChainPathOrder =
    !isLinkedLane ||
    (checks.linkedLanePreserved === true &&
      checks.analyzerRenderedPositionVectorsMatchContract === true &&
      renderedPositionX.length === 5 &&
      renderedPositionY.length === 5 &&
      renderedPositionX.every((value, index) => index === 0 || Number(value) > Number(renderedPositionX[index - 1])) &&
      Number(renderedPositionY[2]) > Number(renderedPositionY[0]) &&
      Number(renderedPositionY[2]) > Number(renderedPositionY[4]) &&
      drawRecords.every((record, index) => record.particleIndex == null || record.particleIndex === index));
  const linkedChainSegmentSpacing =
    !isLinkedLane ||
    (drawRecords.length === 5 &&
      renderedPositionX.length === 5 &&
      renderedPositionX.every((value) => Number.isFinite(Number(value))) &&
      renderedPositionX
        .slice(1)
        .map((value, index) => Number(value) - Number(renderedPositionX[index]))
        .every((delta, index, deltas) => delta > 0 && approxEqual(delta, deltas[0], 0.000001)) &&
      renderedPositionY.every((value, index) =>
        index === 0 || index === renderedPositionY.length - 1
          ? Number(value) <= Number(renderedPositionY[2])
          : true
      ));
  const linkedChainParticleOrder =
    !isLinkedLane ||
    (drawRecords.length === 5 &&
      renderContract.drawParticleCount === 5 &&
      frame.domStatus?.drawParticles === 5 &&
      checks.analyzerRenderedDrawRecordIdsMatchContract === true &&
      checks.analyzerRenderedParticleIdsMatchContract === true &&
      checks.analyzerRenderedParticleIndexesMatchContract === true &&
      checks.analyzerRenderedRecordVerticesPerParticleMatchContract === true &&
      checks.linkedRenderedDrawRecordIndexAttributeBucketsMatchVerticesPerParticle === true);
  const linkedChainColorPair =
    !isLinkedLane ||
    (drawRecords.length === 5 &&
      renderedColorsMatchDrawRecords &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) >= 0.15 &&
          Number(record.color?.r) <= 0.3 &&
          Number(record.color?.g) >= 0.7 &&
          Number(record.color?.b) >= 0.9
      ) &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) >= 0.9 &&
          Number(record.color?.g) >= 0.85 &&
          Number(record.color?.b) >= 0.25 &&
          Number(record.color?.b) <= 0.5
      ));
  const linkedChainColorAlternation =
    !isLinkedLane ||
    (drawRecords.length === 5 &&
      renderedColorsMatchDrawRecords &&
      drawRecords.every((record, index) => {
        const color = record.color ?? {};
        const isCyan =
          Number(color.r) >= 0.15 &&
          Number(color.r) <= 0.3 &&
          Number(color.g) >= 0.7 &&
          Number(color.b) >= 0.9;
        const isYellow =
          Number(color.r) >= 0.9 &&
          Number(color.g) >= 0.85 &&
          Number(color.b) >= 0.25 &&
          Number(color.b) <= 0.5;
        return index % 2 === 0 ? isCyan : isYellow;
      }));
  const linkedChainAlphaFade =
    !isLinkedLane ||
    (drawRecords.length === 5 &&
      renderedAlpha.length === 5 &&
      renderedAlpha.every(
        (value, index) => index === 0 || Number(value) < Number(renderedAlpha[index - 1])
      ) &&
      renderedAlpha.every((value) => Number(value) >= 0 && Number(value) <= 1) &&
      checks.analyzerRenderedAlphaMatchesContract === true &&
      checks.analyzerRenderedGeometryAlphaAttributeUniqueValuesPerRecordMatchContract === true);
  const linkedChainParticleSizeEnvelope =
    !isLinkedLane ||
    (drawRecords.length === 5 &&
      renderedParticleSizeX.length === 5 &&
      renderedParticleSizeY.length === 5 &&
      checks.analyzerRenderedParticleSizeVectorsMatchContract === true &&
      checks.analyzerRenderedGeometryParticleSizeAttributeUniqueValuesPerRecordMatchContract === true &&
      renderedParticleSizeX.every(
        (value) => Number.isFinite(Number(value)) && Number(value) >= 0.18 && Number(value) <= 0.27
      ) &&
      renderedParticleSizeY.every(
        (value) => Number.isFinite(Number(value)) && Number(value) >= 0.25 && Number(value) <= 0.35
      ) &&
      new Set(renderedParticleSizeX.map((value) => Number(value).toFixed(3))).size >= 4 &&
      new Set(renderedParticleSizeY.map((value) => Number(value).toFixed(3))).size >= 4);
  const linkedChainAtlasAndMaterial =
    !isLinkedLane ||
    (frame.domStatus?.textureProfile === "radial-soft-atlas-4x4-v2" &&
      checks.analyzerTextureStatusApplied === true &&
      checks.analyzerTextureAtlasDimensionsConsistent === true &&
      checks.analyzerRenderedAtlasUvRectsMatchContract === true &&
      renderedMaterial.mapBound === "true" &&
      renderedMaterial.vertexColors === "true" &&
      renderedMaterial.side === "DoubleSide");
  const linkedChainDiagnosticBoundary =
    !isLinkedLane || checks.linkedRenderedDiagnosticCodesIncludeSegmentBufferBoundary === true;
  const linkedChainFraming =
    !isLinkedLane ||
    (comparison.metrics?.connectedComponentCount >= 1 &&
      comparison.metrics?.connectedComponentCount <= 5 &&
      boundsAreFinite &&
      comparison.metrics?.objectPixels > 0);
  const mode2LightenDrawShape =
    !isMode2Lighten ||
    (renderContract.drawLane === "textured_quad" &&
      renderContract.drawParticleCount === 4 &&
      drawRecords.length === 4 &&
      Number(renderContract.drawVertexCount) === 24 &&
      Number(renderedGeometry.verticesPerParticle) === 6 &&
      Number(renderedGeometry.positionAttributeMinUniqueValuesPerRecord) >= 4 &&
      Number(renderedGeometry.positionAttributeMaxUniqueValuesPerRecord) >= 4);
  const mode2LightenPath =
    !isMode2Lighten ||
    (mode2FourPointZigZag &&
      checks.analyzerRenderedPositionVectorsMatchContract === true &&
      checks.analyzerRenderedVelocityVectorsMatchContract === true);
  const mode2LightenColorAlpha =
    !isMode2Lighten ||
    (renderedColorsMatchDrawRecords &&
      checks.mode2RenderedAlphaCountMatchesDrawRecords === true &&
      checks.mode2RenderedAlphaValuesInUnitRange === true &&
      checks.mode2RenderedAlphaMatchesDrawRecordOrder === true &&
      checks.mode2RenderedAlphaAttributeBucketsAreUniformPerRecord === true &&
      mode2AlphaFade &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) <= 0.2 &&
          Number(record.color?.g) >= 0.65 &&
          Number(record.color?.b) >= 0.9
      ) &&
      drawRecords.some(
        (record) =>
          Number(record.color?.r) >= 0.9 &&
          Number(record.color?.g) >= 0.85 &&
          Number(record.color?.b) <= 0.3
      ));
  const mode2LightenColorAlternation =
    !isMode2Lighten ||
    (drawRecords.length === 4 &&
      renderedColorsMatchDrawRecords &&
      drawRecords.every((record, index) => {
        const color = record.color ?? {};
        const isCyan =
          Number(color.r) <= 0.2 &&
          Number(color.g) >= 0.65 &&
          Number(color.b) >= 0.9;
        const isYellow =
          Number(color.r) >= 0.9 &&
          Number(color.g) >= 0.85 &&
          Number(color.b) <= 0.3;
        return index % 2 === 0 ? isCyan : isYellow;
      }));
  const mode2LightenParticleSizeEnvelope =
    !isMode2Lighten ||
    (drawRecords.length === 4 &&
      renderedParticleSizeX.length === 4 &&
      renderedParticleSizeY.length === 4 &&
      checks.analyzerRenderedParticleSizeVectorsMatchContract === true &&
      renderedParticleSizeX.every((value) => Number.isFinite(Number(value)) && Number(value) >= 0.34 && Number(value) <= 0.42) &&
      renderedParticleSizeY.every((value) => Number.isFinite(Number(value)) && Number(value) >= 0.34 && Number(value) <= 0.41));
  const mode2LightenBlendMaterial =
    !isMode2Lighten ||
    (checks.blendModeIsLighten === true &&
      checks.blendModeRawTokenIsMode2Lighten === true &&
      checks.blendModeNumberIs2 === true &&
      checks.renderedBlendModeRawTokenIsMode2Lighten === true &&
      checks.renderedBlendModeNumberIs2 === true &&
      checks.renderedMaterialBlendSrcIsSrcAlphaFactor === true &&
      checks.renderedMaterialBlendDstIsOneFactor === true &&
      checks.renderedMaterialBlendEquationIsAddEquation === true &&
      checks.renderedMaterialDepthTestEnabled === true &&
      checks.renderedMaterialOpacityIsUnit === true &&
      checks.renderedMaterialColorIsWhite === true &&
      checks.allDrawRecordsUseLighten === true &&
      renderedMaterial.transparent === "true" &&
      renderedMaterial.depthWrite === "false" &&
      Number(renderedMaterial.alphaTest) === 0 &&
      renderedMaterial.blending === "custom");
  const mode2LightenAtlasAndMaterial =
    !isMode2Lighten ||
    (frame.domStatus?.textureProfile === "radial-soft-atlas-4x4-v2" &&
      checks.analyzerTextureStatusApplied === true &&
      checks.analyzerTextureAtlasDimensionsConsistent === true &&
      checks.analyzerRenderedAtlasUvRectsMatchContract === true &&
      renderedMaterial.mapBound === "true" &&
      renderedMaterial.vertexColors === "true" &&
      renderedMaterial.side === "DoubleSide");
  const mode2LightenParticleOrder =
    !isMode2Lighten ||
    (drawRecords.length === 4 &&
      renderContract.drawParticleCount === 4 &&
      frame.domStatus?.drawParticles === 4 &&
      checks.analyzerRenderedDrawRecordIdsMatchContract === true &&
      checks.analyzerRenderedParticleIdsMatchContract === true &&
      checks.analyzerRenderedParticleIndexesMatchContract === true &&
      checks.analyzerRenderedRecordVerticesPerParticleMatchContract === true);
  const mode2LightenDiagnosticBoundary =
    !isMode2Lighten ||
    (renderedDiagnosticCodes.includes("VFX_PUNCH_MODE2_SOURCE_EVIDENCE_REQUIRED") &&
      renderedDiagnosticCodes.includes("VFX_DEV_MODE2_LIGHTEN_DIAGNOSTIC_ONLY") &&
      renderedDiagnosticCodes.includes("VFX_PUNCH_THROUGH_RETAIL_BLEND_DEPTH_REQUIRED"));
  const mode2LightenFraming =
    !isMode2Lighten ||
    (comparison.metrics?.connectedComponentCount >= 1 &&
      comparison.metrics?.connectedComponentCount <= 4 &&
      boundsAreFinite &&
      comparison.metrics?.objectPixels > 0);

  const semanticChecks = {
    expectedShape:
      isChunkLane
        ? checks.placeholderVisibleWithoutDrawParticles === true
        : checks.canvasNonblank === true &&
          checks.localStructuralVisible === true &&
          checks.analyzerRenderedGeometryNonIndexedDrawArrays === true &&
          checks.analyzerRenderedGeometryVerticesPerParticleMatchesContract === true &&
          Number(renderedGeometry.positionAttributeMinUniqueValuesPerRecord) >= 4 &&
          Number(renderedGeometry.positionAttributeMaxUniqueValuesPerRecord) >= 4 &&
          boundsAreFinite,
    motionPath:
      isChunkLane
        ? checks.noFakeParticleDrawRecords === true
        : checks.analyzerRenderedPositionVectorsMatchContract === true &&
          checks.analyzerRenderedVelocityVectorsMatchContract === true &&
          mode2FourPointZigZag,
    colorOpacityAlpha:
      isChunkLane
        ? checks.noFakeParticleDrawRecords === true
        : checks.analyzerRenderedColorVectorsMatchContract === true &&
          checks.analyzerRenderedAlphaMatchesContract === true &&
          checks.analyzerMaterialOpacityIsUnit === true &&
          checks.analyzerMaterialColorIsWhite === true &&
          checks.mode2RenderedAlphaValuesInUnitRange !== false &&
          mode2AlphaFade &&
          renderedColorsMatchDrawRecords,
    blendMaterial:
      isChunkLane
        ? checks.chunkRenderedDiagnosticCodesIncludeUnresolvedResource === true
        : checks.analyzerMaterialTransparentMatchesBlend === true &&
          checks.analyzerMaterialDepthWriteMatchesBlend === true &&
          checks.analyzerMaterialDepthTestEnabled === true &&
          checks.analyzerMaterialAlphaTestMatchesBlend === true &&
          checks.analyzerMaterialBlendingMatchesBlend === true &&
          checks.analyzerMaterialBlendSrcMatchesBlend === true &&
          checks.analyzerMaterialBlendDstMatchesBlend === true &&
          checks.analyzerMaterialBlendEquationMatchesBlend === true &&
          renderedMaterial.depthTest === "true",
    textureAtlas:
      isChunkLane
        ? checks.canonicalResourceUnresolved === true
        : checks.analyzerTextureReferenceMatchesDependency === true &&
          checks.analyzerTextureStatusApplied === true &&
          checks.analyzerTextureProfilePresent === true &&
          checks.analyzerTextureAtlasDimensionsConsistent === true &&
          checks.analyzerRenderedAtlasUvRectsMatchContract === true &&
          checks.renderedMaterialMapIsBound !== false &&
          checks.renderedMaterialMapReferenceMatchesTexture !== false,
    lane:
      typeof renderContract.drawLane === "string" &&
      checks.analyzerRenderedDrawRecordLanesMatchContract === true,
    particleCountOrder:
      isChunkLane
        ? renderContract.drawParticleCount === 0 &&
          drawRecords.length === 0 &&
          frame.domStatus?.drawParticles === 0 &&
          checks.noFakeParticleDrawRecords === true
        : renderContract.drawParticleCount === drawRecords.length &&
          frame.domStatus?.drawParticles === drawRecords.length &&
          checks.analyzerRenderedDrawRecordIdsMatchContract === true &&
          checks.analyzerRenderedParticleIdsMatchContract === true &&
          checks.analyzerRenderedParticleIndexesMatchContract === true &&
          checks.analyzerRenderedRecordVerticesPerParticleMatchContract === true,
    lifetimeFraming:
      Number.isFinite(Number(snapshot.timeSeconds)) &&
      Number.isFinite(Number(snapshot.seed)) &&
      boundsAreFinite &&
      comparison.metrics?.objectPixels > 0 &&
      checks.visibleComponentsWithinDrawParticleBudget !== false,
    ...(isFireballDetonate
      ? {
          drawModeRoute: fireballDrawModeRoute,
          fireballDetonateDrawShape: fireballDrawShape,
          fireballDetonateWarmColorPair: fireballWarmColorPair,
          fireballDetonateWarmColorOrder: fireballWarmColorOrder,
          fireballDetonateParticleSize: fireballParticleSize,
          fireballDetonateAlphaFade,
          fireballDetonateOutwardMotion,
          fireballDetonateAtlasAndMaterial: fireballAtlasAndMaterial,
          fireballDetonateParticleOrder: fireballParticleOrder,
          fireballDetonateDiagnosticBoundary: fireballDiagnosticBoundary,
          fireballDetonateFraming: fireballFraming
        }
      : {}),
    ...(isRow68Healing
      ? {
          row68HealingDrawShape,
          row68HealingColorPair,
          row68HealingColorPlacement,
          row68HealingAlphaFade,
          row68HealingParticleSize,
          row68HealingTwoParticleOrder:
            drawRecords.length === 2 &&
            renderContract.drawParticleCount === 2 &&
            frame.domStatus?.drawParticles === 2 &&
            checks.analyzerRenderedDrawRecordIdsMatchContract === true &&
            checks.analyzerRenderedParticleIdsMatchContract === true &&
            checks.analyzerRenderedParticleIndexesMatchContract === true,
          row68HealingAtlasAndMaterial:
            frame.domStatus?.textureProfile === "radial-soft-atlas-4x4-v2" &&
            checks.analyzerTextureStatusApplied === true &&
            checks.analyzerTextureAtlasDimensionsConsistent === true &&
            checks.analyzerRenderedAtlasUvRectsMatchContract === true &&
            renderedMaterial.mapBound === "true" &&
            renderedMaterial.side === "DoubleSide",
          row68HealingFraming:
            comparison.metrics?.connectedComponentCount === 2 &&
            boundsAreFinite &&
            comparison.metrics?.objectPixels > 0
        }
      : {}),
    ...(isRow50Death
      ? {
          row50DeathDrawShape,
          row50DeathColorPair,
          row50DeathColorPlacement,
          row50DeathAlphaFade,
          row50DeathParticleSize,
          row50DeathTwoParticleOrder:
            drawRecords.length === 2 &&
            renderContract.drawParticleCount === 2 &&
            frame.domStatus?.drawParticles === 2 &&
            checks.analyzerRenderedDrawRecordIdsMatchContract === true &&
            checks.analyzerRenderedParticleIdsMatchContract === true &&
            checks.analyzerRenderedParticleIndexesMatchContract === true,
          row50DeathAtlasAndMaterial:
            frame.domStatus?.textureProfile === "radial-soft-atlas-4x4-v2" &&
            checks.analyzerTextureStatusApplied === true &&
            checks.analyzerTextureAtlasDimensionsConsistent === true &&
            checks.analyzerRenderedAtlasUvRectsMatchContract === true &&
            renderedMaterial.mapBound === "true" &&
            renderedMaterial.vertexColors === "true" &&
            renderedMaterial.side === "DoubleSide",
          row50DeathFraming:
            comparison.metrics?.connectedComponentCount >= 1 &&
            comparison.metrics?.connectedComponentCount <= 2 &&
            boundsAreFinite &&
            comparison.metrics?.objectPixels > 0
        }
      : {}),
    ...(isEffectBeam
      ? {
          effectBeamDrawShape,
          effectBeamBodyNodeChest,
          effectBeamSegmentOrder,
          effectBeamSegmentSpacing,
          effectBeamAlphaFade,
          effectBeamParticleSizeWaist,
          effectBeamFireColorPair: effectBeamColorPair,
          effectBeamFireColorAlternation: effectBeamColorAlternation,
          effectBeamAtlasAndMaterial:
            frame.domStatus?.textureProfile === "radial-soft-atlas-4x4-v2" &&
            checks.analyzerTextureStatusApplied === true &&
            checks.analyzerTextureAtlasDimensionsConsistent === true &&
            checks.analyzerRenderedAtlasUvRectsMatchContract === true &&
            renderedMaterial.mapBound === "true" &&
            renderedMaterial.vertexColors === "true" &&
            renderedMaterial.side === "DoubleSide",
          effectBeamDiagnosticBoundary:
            checks.effectBeamRetailVolumeNotResolved === true &&
            renderedDiagnosticCodes.includes("VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED"),
          effectBeamFraming:
            comparison.metrics?.connectedComponentCount >= 1 &&
            comparison.metrics?.connectedComponentCount <= 5 &&
            boundsAreFinite &&
            comparison.metrics?.objectPixels > 0
        }
      : {}),
    ...(isFountainAtlas
      ? {
          fountainAtlasDrawShape,
          fountainAtlasGridAndFrameRange,
          fountainAtlasFramePlayback,
          fountainAtlasTrajectory,
          fountainAtlasUvGrid,
          fountainAtlasParticleOrder,
          fountainAtlasAlphaFade,
          fountainAtlasParticleSizeEnvelope,
          fountainAtlasAtlasAndMaterial,
          fountainAtlasDiagnosticBoundary,
          fountainAtlasFraming
        }
      : {}),
    ...(isPltLayerColors
      ? {
          pltLayerDrawShape,
          pltLayerPaletteOrder,
          pltLayerColorVectors,
          pltLayerOpacity,
          pltLayerParticleSizeEnvelope,
          pltLayerAtlasFrameOrder,
          pltLayerUvRectGrid,
          pltLayerSpatialOrder,
          pltLayerMaterialAndAtlas,
          pltLayerDiagnosticBoundary,
          pltLayerFraming
        }
      : {}),
    ...(isP2pGravity
      ? {
          p2pGravityDrawShape,
          p2pGravityArcPath,
          p2pGravitySegmentSpacing,
          p2pGravityVelocityPath,
          p2pGravityAlphaFade,
          p2pGravityParticleSizeEnvelope,
          p2pGravityColorPair,
          p2pGravityColorAlternation,
          p2pGravityParticleOrder,
          p2pGravityAtlasAndMaterial,
          p2pGravityDiagnosticBoundary,
          p2pGravityFraming
        }
      : {}),
    ...(isLinkedLane
      ? {
          linkedChainDrawShape,
          linkedChainPathOrder,
          linkedChainSegmentSpacing,
          linkedChainParticleOrder,
          linkedChainColorPair,
          linkedChainColorAlternation,
          linkedChainAlphaFade,
          linkedChainParticleSizeEnvelope,
          linkedChainAtlasAndMaterial,
          linkedChainDiagnosticBoundary,
          linkedChainFraming
        }
      : {}),
    ...(isMode2Lighten
      ? {
          mode2LightenDrawShape,
          mode2LightenPath,
          mode2LightenColorAlpha,
          mode2LightenColorAlternation,
          mode2LightenParticleSizeEnvelope,
          mode2LightenBlendMaterial,
          mode2LightenAtlasAndMaterial,
          mode2LightenParticleOrder,
          mode2LightenDiagnosticBoundary,
          mode2LightenFraming
        }
      : {}),
    ...(isChunkLane
      ? {
          diagnosticVisible: checks.placeholderVisibleWithoutDrawParticles === true,
          chunkLanePreserved: checks.chunkLanePreserved === true,
          noFakeParticles: checks.noFakeParticleDrawRecords === true,
          unresolvedResource: checks.canonicalResourceUnresolved === true,
          diagnosticCodesExplainPlaceholder:
            checks.chunkRenderedDiagnosticCodesIncludeUnresolvedResource === true,
          placeholderDiagnosticOnly:
            frame.domStatus?.renderedTextureStatus === "chunk-lane-preserved" &&
            frame.domStatus?.renderedMaterial?.status === "not-applied" &&
            renderedDiagnosticCodes.includes("VFX_CANONICAL_CHUNK_LANE_RENDERER_PENDING")
        }
      : {}),
    localOnlyNotCanonical:
      checks.localOnlyNotCanonical === true &&
      (isChunkLane ||
        renderedDiagnosticCodes.length === 0 ||
        (renderedDiagnosticCodes.includes("VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF") &&
          renderedDiagnosticCodes.includes("VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED")))
  };

  return {
    version: "aurora-vfx-visual-semantic-oracle/v1",
    fixtureId: snapshot.fixtureId,
    oracleSourceBasis: [
      "frontend/src/modules/vfx/dev/vfxFixturePayloads.ts local fixture definition and render-contract payload",
      "backend/scripts/analyze-vfx-capture.mjs render-contract structural checks",
      "backend/scripts/run-vfx-visual-correlation.mjs fixture-specific visual-correlation checks",
      "backend/docs/aurora-reverse/vfx-context-pack.md prior local evidence for this fixture family",
      isChunkLane
        ? "C:/Projects/New Folder/export strings/functions/xrefs searches documented in context pack; visualeffects table bootstrap found, but real progfx Type 9 chunk model resource/source row and retail chunk capture are still missing"
        : isFireballDetonate
        ? "C:/Projects/New Folder/export strings/functions/xrefs searches documented in context pack; visualeffects table bootstrap found, direct retail detonate timing/pre-post burst oracle still missing"
        : isRow68Healing
        ? "C:/Projects/New Folder/export strings/functions/xrefs searches documented in context pack; visualeffects table bootstrap found and local dm_visualeffect row 68 payload provides a two-particle warm/turquoise healing diagnostic, but exact retail framebuffer palette/timing remains missing"
        : isRow50Death
        ? "C:/Projects/New Folder/export strings/functions/xrefs searches documented in context pack; visualeffects table bootstrap found and local EffectVisualEffect row 50 payload provides a two-particle purple/pale death diagnostic, but exact retail framebuffer shape/timing remains missing"
        : isEffectBeam
        ? "C:/Projects/New Folder/export strings/functions/xrefs searches documented in context pack; visualeffects table bootstrap found and local EffectBeam row 210 payload provides a five-segment VFX_BEAM_FIRE BODY_NODE_CHEST diagnostic, but exact retail beam volume/source-target anchoring remains missing"
        : isFountainAtlas
        ? "C:/Projects/New Folder/export strings/functions/xrefs searches documented in context pack; visualeffects table bootstrap found and local cot_fx01 Fountain atlas payload provides 4x4 grid, frame range, fps, randomFrameStart, UV, and draw-record diagnostics, but exact retail atlas playback timing/frame offset remains missing"
        : isPltLayerColors
        ? "C:/Projects/New Folder/export strings/functions/xrefs searches documented in context pack; visualeffects table bootstrap found and local PLT layer-color fixture payload provides four named skin/hair/cloth1/cloth2 diagnostic layer colors, but exact retail PLT palette/profile/material lookup remains missing"
        : isP2pGravity
        ? "C:/Projects/New Folder/export strings/functions/xrefs searches documented in context pack; visualeffects table bootstrap found and local P2P gravity fixture payload provides a seven-particle source-target arc with reference-node/gravity diagnostics, but exact retail reference-node mapping and gravity solver ticks remain missing"
        : isLinkedLane
        ? "C:/Projects/New Folder/export strings/functions/xrefs searches documented in context pack; visualeffects table bootstrap found and local linked-chain fixture payload provides a five-record linked_textured_quad diagnostic, but exact retail contiguous segment-buffer behavior remains missing"
        : "C:/Projects/New Folder/export strings/functions/xrefs searches documented in context pack; visualeffects table bootstrap found, direct retail Mode2 body/capture oracle still missing"
    ],
    semanticRequirements: {
      expectedShape:
        isChunkLane
          ? "Chunk/progfx Type 9 must render a visible diagnostic placeholder while preserving zero draw particles until a real chunk model resource is admitted."
          : isMode2Lighten
          ? "Mode2/Lighten local diagnostic must render four non-indexed textured quads with finite bounds and six vertices per particle."
          : "Textured-quad draw records expand to non-indexed four-corner quads, render nonblank, and produce finite visible bounds.",
      motionPath:
        isChunkLane
          ? "Chunk/progfx Type 9 must not synthesize fake particle motion/path vectors when the real chunk model source is unresolved."
          : isMode2Lighten
          ? "Mode2 local diagnostic preserves the left-to-right alternating four-particle path plus render-contract velocity vectors."
          : isP2pGravity
          ? "P2P gravity local diagnostic must preserve a left-to-right seven-particle arc whose middle point rises above the endpoints plus render-contract velocity vectors."
          : isLinkedLane
          ? "Linked-chain local diagnostic must preserve a left-to-right five-particle chain path with the middle record above the endpoints plus render-contract position/velocity vectors."
          : "Rendered positions and velocities must match the local render-contract draw records.",
      colorOpacityAlpha:
        isChunkLane
          ? "Chunk/progfx Type 9 must not synthesize fake color/alpha particle attributes while resource resolution is diagnostic-only."
          : isMode2Lighten
          ? "Mode2/Lighten local diagnostic must preserve cyan/blue plus yellow punch-through color records, draw-record alpha arrays in order, and a strictly fading four-particle alpha path."
          : isRow68Healing
          ? "Row 68 VFX_IMP_HEALING_M local payload must preserve the warm orange plus turquoise healing color pair in draw-record order with alpha arrays matching render-contract data."
          : isRow50Death
          ? "Row 50 VFX_IMP_DEATH local payload must preserve the purple plus pale death-effect color pair in draw-record order with alpha arrays matching render-contract data."
          : isEffectBeam
          ? "EffectBeam row 210 VFX_BEAM_FIRE must preserve alternating warm fire-orange/yellow color records and alpha arrays in source-to-target draw-record order."
          : isFountainAtlas
          ? "cot_fx01 Fountain atlas particles must preserve draw-record RGB and alpha arrays while using the local fire atlas; exact retail color grading still requires retail capture."
          : isPltLayerColors
          ? "PLT layer-color diagnostic must preserve the local skin, hair, cloth1, and cloth2 color vectors in layer order with alpha arrays matching render-contract data."
          : "Draw-record RGB and alpha arrays must match render-contract order, alpha must stay in unit range, and material opacity/color remain neutral.",
      blendMaterial:
        isChunkLane
          ? "Chunk/progfx Type 9 must expose diagnostic codes explaining the unresolved chunk resource instead of pretending a textured material was applied."
          : isMode2Lighten
          ? "Mode2/Lighten local diagnostic must preserve custom SrcAlpha/One/Add blending, transparent=true, depthWrite=false, depthTest=true, alphaTest=0, white material color, and per-record Mode2_Lighten blend tokens."
          : "Rendered material must preserve transparent/depthWrite/depthTest/alphaTest/blend-factor/equation state expected by the local blend contract.",
      textureAtlas:
        isChunkLane
          ? "Chunk/progfx Type 9 must keep canonicalResourceResolved=false and avoid binding the particle atlas as fake chunk content."
          : isMode2Lighten
          ? "Mode2/Lighten local diagnostic must bind the radial-soft 4x4 atlas, keep UV rectangles in draw-record order, and preserve DoubleSide vertex-colored material state."
          : "Texture reference/status/profile/atlas dimensions and UV rects must match local payload/render-contract data.",
      lane:
        isChunkLane
          ? "Rendered diagnostics must preserve drawLane=chunk_model and chunkLane.lane=chunk_model."
          : isMode2Lighten
          ? "Rendered draw lanes must remain textured_quad for every Mode2/Lighten draw record."
          : "Rendered draw lanes must preserve the fixture lane expected by the local payload.",
      particleCountOrder:
        isChunkLane
          ? "Rendered particle count, draw records, and vertex count must stay zero until a real chunk resource/source row is available."
          : isMode2Lighten
          ? "Mode2/Lighten must preserve exactly four textured_quad draw records, particle ids/indexes, and 24 total vertices with six vertices per particle."
          : isRow68Healing
          ? "Row 68 healing must preserve exactly two textured_quad draw records, particle ids/indexes, and 12 total vertices with six vertices per particle."
          : isRow50Death
          ? "Row 50 death effect must preserve exactly two textured_quad draw records, particle ids/indexes, and 12 total vertices with six vertices per particle."
          : isEffectBeam
          ? "EffectBeam row 210 must preserve exactly five source-to-target beam segment draw records, particle ids/indexes, and 30 total vertices with six vertices per segment."
          : isFountainAtlas
          ? "cot_fx01 Fountain atlas must preserve exactly six textured_quad draw records, particle ids/indexes, and 36 total vertices with six vertices per particle."
          : isPltLayerColors
          ? "PLT layer-color diagnostic must preserve exactly four textured_quad draw records for skin, hair, cloth1, and cloth2 with 24 total vertices and six vertices per layer record."
          : isP2pGravity
          ? "P2P gravity must preserve exactly seven textured_quad draw records, particle ids/indexes, draw-record index attribute coverage, and 42 total vertices with six vertices per particle."
          : isLinkedLane
          ? "Linked-chain must preserve exactly five linked_textured_quad draw records, particle ids/indexes, draw-record index bucket coverage, and 30 total vertices with six vertices per record."
          : "Rendered particle count, draw record ids, particle ids/indexes, and vertices-per-particle must preserve draw-record order.",
      lifetimeFraming:
        isChunkLane
          ? "Deterministic time/seed capture must keep the diagnostic placeholder visible inside finite analyzer bounds without converting it into canonical chunk output."
          : isMode2Lighten
          ? "Deterministic time/seed capture must keep the four-particle Mode2/Lighten zig-zag visible inside finite analyzer bounds and within the four-component budget."
          : "Deterministic time/seed capture must keep visible output inside finite analyzer bounds and within the draw-particle component budget.",
      ...(isFireballDetonate
        ? {
            drawModeRoute:
              "Fireball detonate draw records must use renderer-agnostic non-indexed draw arrays, draw mode argument 3 from aurora-draw-wrapper-mode-arg3, six vertices per particle, no index buffer, and the diagnostic_pending enum-table proof marker until retail enum evidence exists.",
            fireballDetonateDrawShape:
              "Fireball detonate must render as two non-indexed textured quads with finite bounds and six vertices per particle.",
            fireballDetonateWarmColorPair:
              "Fireball detonate must preserve the local VFX_FNF_FIREBALL warm yellow/orange plus red-orange payload color pair; exact retail color grading still requires retail capture.",
            fireballDetonateWarmColorOrder:
              "Fireball detonate must preserve local draw-record color order: first particle warm yellow/orange, second particle red-orange, with rendered color vectors matching the contract.",
            fireballDetonateParticleSize:
              "Fireball detonate particle-size X/Y vectors must be positive, match draw-record order, and remain uniform per rendered attribute bucket.",
            fireballDetonateAlphaFade:
              "Fireball detonate must preserve a two-particle alpha fade from the first warm yellow/orange burst particle to the second red-orange particle while rendered alpha vectors and alpha attribute buckets match the render contract.",
            fireballDetonateOutwardMotion:
              "Fireball detonate must preserve a two-particle outward/upward burst: first particle left with negative X velocity, second particle right with positive X velocity, and both particles rising.",
            fireballDetonateAtlasAndMaterial:
              "Fireball detonate must bind the radial-soft 4x4 atlas with DoubleSide vertex-colored material state.",
            fireballDetonateParticleOrder:
              "Fireball detonate draw record ids, particle ids, particle indexes, and vertices-per-particle must preserve the two-particle local ordering.",
            fireballDetonateDiagnosticBoundary:
              "Fireball detonate must surface dev-not-parity/retail-capture-required/non-indexed draw diagnostics until retail detonate evidence exists.",
            fireballDetonateFraming:
              "Fireball detonate must keep deterministic warm particles visible inside finite analyzer bounds and within the two-particle component budget."
          }
        : {}),
      ...(isRow68Healing
        ? {
            row68HealingDrawShape:
              "Row 68 healing must render as two non-indexed textured quads with finite bounds and six vertices per particle.",
            row68HealingColorPair:
              "Row 68 healing must preserve the local row payload's warm orange and turquoise color pair; exact retail color grading still requires retail capture.",
            row68HealingColorPlacement:
              "Row 68 healing must preserve the local two-particle healing composition: warm orange impact particle left/lower first, turquoise healing particle right/upper second, with analyzer position and color vectors matching the render contract.",
            row68HealingAlphaFade:
              "Row 68 healing must preserve a two-particle alpha fade from the first warm impact particle to the second turquoise healing particle while rendered alpha vectors and alpha attribute buckets match the render contract.",
            row68HealingParticleSize:
              "Row 68 healing must preserve positive particle-size X/Y vectors with the first warm impact particle larger than the second turquoise healing particle while rendered size vectors and size attribute buckets match the render contract.",
            row68HealingTwoParticleOrder:
              "Row 68 healing draw record ids, particle ids, and particle indexes must preserve the two-particle order.",
            row68HealingAtlasAndMaterial:
              "Row 68 healing must bind the radial-soft 4x4 atlas with DoubleSide vertex-colored material state.",
            row68HealingFraming:
              "Row 68 healing must produce two visible components inside finite analyzer bounds at deterministic time/seed."
          }
        : {}),
      ...(isRow50Death
        ? {
            row50DeathDrawShape:
              "Row 50 death effect must render as two non-indexed textured quads with finite bounds and six vertices per particle.",
            row50DeathColorPair:
              "Row 50 death effect must preserve the local row payload's purple and pale color pair; exact retail color grading still requires retail capture.",
            row50DeathColorPlacement:
              "Row 50 death effect must preserve the local two-particle death composition: purple impact particle left/lower first, pale particle right/upper second, with analyzer position and color vectors matching the render contract.",
            row50DeathAlphaFade:
              "Row 50 death effect must preserve a two-particle alpha fade from the first purple impact particle to the second pale particle while rendered alpha vectors and alpha attribute buckets match the render contract.",
            row50DeathParticleSize:
              "Row 50 death effect must preserve positive particle-size X/Y vectors with the first purple impact particle larger than the second pale follow-up particle while rendered size vectors and size attribute buckets match the render contract.",
            row50DeathTwoParticleOrder:
              "Row 50 death effect draw record ids, particle ids, and particle indexes must preserve the two-particle order.",
            row50DeathAtlasAndMaterial:
              "Row 50 death effect must bind the radial-soft 4x4 atlas with DoubleSide vertex-colored material state.",
            row50DeathFraming:
              "Row 50 death effect may merge into one visible impact cluster or show two components, but must stay visible inside finite analyzer bounds."
          }
        : {}),
      ...(isEffectBeam
        ? {
            effectBeamDrawShape:
              "EffectBeam row 210 must render as five non-indexed textured quads with finite bounds and six vertices per segment.",
            effectBeamBodyNodeChest:
              "EffectBeam row 210 must preserve BODY_NODE_CHEST provenance on the effect context and every segment draw record.",
            effectBeamSegmentOrder:
              "EffectBeam row 210 beam segments must progress left-to-right from local source anchor to target anchor with beamSegmentIndex 0..4.",
            effectBeamSegmentSpacing:
              "EffectBeam row 210 beam segments must keep even source-to-target X spacing with non-decreasing Y progression, so bunched-up or collapsed local beams fail semantic visual correctness.",
            effectBeamAlphaFade:
              "EffectBeam row 210 beam segments must fade alpha strictly from source to target while rendered alpha vectors match draw-record order.",
            effectBeamParticleSizeWaist:
              "EffectBeam row 210 beam segments must preserve a constant local beam width with a tapered Y-size waist at the center segment while rendered size vectors and size attribute buckets match the render contract.",
            effectBeamFireColorPair:
              "EffectBeam row 210 VFX_BEAM_FIRE must preserve the local fire-orange/yellow segment color pair; exact retail color grading still requires retail capture.",
            effectBeamFireColorAlternation:
              "EffectBeam row 210 VFX_BEAM_FIRE must preserve the local fire-orange/yellow/fire-orange/yellow/fire-orange color alternation across the five ordered beam segments while rendered color vectors match the contract.",
            effectBeamAtlasAndMaterial:
              "EffectBeam row 210 must bind the radial-soft 4x4 atlas with DoubleSide vertex-colored material state.",
            effectBeamDiagnosticBoundary:
              "EffectBeam row 210 must keep retailBeamVolumeResolved=false and surface the retail-context-required diagnostic until retail source/target/body-node evidence exists.",
          effectBeamFraming:
            "EffectBeam row 210 must keep the deterministic beam visible inside finite analyzer bounds and within the five-segment component budget."
        }
      : {}),
      ...(isFountainAtlas
        ? {
            fountainAtlasDrawShape:
              "cot_fx01 Fountain atlas must render as six non-indexed textured quads with finite bounds and six vertices per particle.",
            fountainAtlasGridAndFrameRange:
              "cot_fx01 Fountain atlas must preserve Fountain emitter context, fx_canonical_fire texture, 4x4 grid, frameStart=0, frameEnd=15, fps=12, randomFrameStart=true, and retailPlaybackResolved=false.",
            fountainAtlasFramePlayback:
              "cot_fx01 Fountain atlas frame indexes must stay in 0..15, match rendered atlasFrame attributes by draw-record order, use multiple frames at deterministic time/seed, and block material-level frame offset until retail playback evidence exists.",
            fountainAtlasTrajectory:
              "cot_fx01 Fountain atlas must preserve a local rising six-particle trajectory with visible horizontal spread while rendered position vectors match the contract.",
            fountainAtlasUvGrid:
              "cot_fx01 Fountain atlas UV rectangles must stay inside unit range, match draw records in order, align to quarter-grid 4x4 cells, and keep four UV corners per draw record.",
            fountainAtlasParticleOrder:
              "cot_fx01 Fountain atlas draw record ids, particle ids, particle indexes, and vertices-per-particle must preserve the six-particle local ordering.",
            fountainAtlasAlphaFade:
              "cot_fx01 Fountain atlas particles must fade alpha strictly across the six ordered draw records while rendered alpha vectors and alpha attribute buckets match draw-record order.",
            fountainAtlasParticleSizeEnvelope:
              "cot_fx01 Fountain atlas particles must preserve six positive local particle-size X/Y vectors in draw-record order, keep them inside the local Fountain envelope x=[0.32,0.47] y=[0.39,0.55], retain visible per-record size variation, and match rendered size vectors/attribute buckets to the render contract.",
            fountainAtlasAtlasAndMaterial:
              "cot_fx01 Fountain atlas must bind the radial-soft 4x4 atlas with DoubleSide vertex-colored material state.",
            fountainAtlasDiagnosticBoundary:
              "cot_fx01 Fountain atlas must keep retailPlaybackResolved=false and materialLevelFrameOffsetAllowed=false until retail atlas playback evidence exists.",
            fountainAtlasFraming:
              "cot_fx01 Fountain atlas must keep deterministic particles visible inside finite analyzer bounds and within the six-particle component budget."
          }
        : {}),
      ...(isPltLayerColors
        ? {
            pltLayerDrawShape:
              "PLT layer-color diagnostic must render as four non-indexed textured quads with finite bounds and six vertices per layer record.",
            pltLayerPaletteOrder:
              "PLT layer-color diagnostic must preserve skin, hair, cloth1, and cloth2 order from atlasProvenance, with dev_known_layer_color_diagnostic color-source metadata matching the analyzer contract.",
            pltLayerColorVectors:
              "PLT layer-color diagnostic must preserve four distinct RGB vectors in draw-record order, each inside unit range and uniform per rendered color-attribute bucket.",
            pltLayerOpacity:
              "PLT layer-color diagnostic must keep unit material opacity while preserving the local four-layer alpha fade from skin through cloth2, rendered alpha vectors matching draw-record order, and alpha attribute buckets uniform per record.",
            pltLayerParticleSizeEnvelope:
              "PLT layer-color diagnostic must preserve four local layer particle-size vectors at x=0.18 and y=0.28, with rendered size vectors and per-record particle-size attribute buckets matching the render contract.",
            pltLayerAtlasFrameOrder:
              "PLT layer-color diagnostic must preserve the deterministic four-layer atlas frame order as unique frame ids in 0..15 stepping by +3 modulo 16 in skin, hair, cloth1, cloth2 order, and keep atlas-frame attribute buckets uniform per layer record.",
            pltLayerUvRectGrid:
              "PLT layer-color diagnostic must derive each rendered UV rect from its 4x4 atlas frame id, keep UVs inside unit range, and keep rendered UV attributes matched to the render contract.",
            pltLayerSpatialOrder:
              "PLT layer-color diagnostic must render skin, hair, cloth1, and cloth2 left-to-right in atlasProvenance order, with rendered position vectors matching the contract.",
            pltLayerMaterialAndAtlas:
              "PLT layer-color diagnostic must bind the radial-soft 4x4 atlas with DoubleSide vertex-colored material state.",
            pltLayerDiagnosticBoundary:
              "PLT layer-color diagnostic must surface source-evidence, dev-diagnostic, and retail-palette-required diagnostics until retail PLT palette/profile/material evidence exists.",
            pltLayerFraming:
              "PLT layer-color diagnostic must keep deterministic layer records visible inside finite analyzer bounds and within the four-layer component budget."
          }
        : {}),
      ...(isP2pGravity
        ? {
            p2pGravityDrawShape:
              "P2P gravity reference-node diagnostic must render as seven non-indexed textured quads with finite bounds and six vertices per particle.",
            p2pGravityArcPath:
              "P2P gravity reference-node diagnostic must preserve a source-left to target-right arc with the middle particle above both endpoints and rendered positions matching draw-record order.",
            p2pGravitySegmentSpacing:
              "P2P gravity reference-node diagnostic must keep seven evenly spaced local arc records from source to target, so ordered but bunched-up arcs fail semantic visual correctness.",
            p2pGravityVelocityPath:
              "P2P gravity reference-node diagnostic must preserve positive X velocity and falling Y velocity across the local arc while rendered velocity vectors match the render contract.",
            p2pGravityAlphaFade:
              "P2P gravity reference-node diagnostic must fade alpha strictly across the seven ordered arc records while rendered alpha vectors match draw-record order.",
            p2pGravityParticleSizeEnvelope:
              "P2P gravity reference-node diagnostic must preserve seven positive local particle-size X/Y vectors in draw-record order, keep them inside the local gravity-arc envelope x/y=[0.14,0.27], retain visible size variation across the arc, and match rendered size vectors/attribute buckets to the render contract.",
            p2pGravityColorPair:
              "P2P gravity reference-node diagnostic must preserve the local blue/yellow gravity-arc color pair while rendered RGB vectors match draw-record order; exact retail color grading still requires retail capture.",
            p2pGravityColorAlternation:
              "P2P gravity reference-node diagnostic must preserve the local blue/yellow/blue/yellow/blue/yellow/blue color alternation across seven ordered arc records while rendered color vectors match the contract.",
            p2pGravityParticleOrder:
              "P2P gravity reference-node diagnostic must preserve all seven draw record ids, particle ids, particle indexes, draw-record index attribute coverage, and per-particle vertices.",
            p2pGravityAtlasAndMaterial:
              "P2P gravity reference-node diagnostic must bind the radial-soft 4x4 atlas with DoubleSide vertex-colored material state.",
            p2pGravityDiagnosticBoundary:
              "P2P gravity reference-node diagnostic must surface source-evidence, dev-diagnostic, and reference-node-required diagnostics until retail reference-node/gravity evidence exists.",
            p2pGravityFraming:
              "P2P gravity reference-node diagnostic must keep deterministic arc particles visible inside finite analyzer bounds and within the seven-particle component budget."
          }
        : {}),
      ...(isLinkedLane
        ? {
            linkedChainDrawShape:
              "Linked-chain diagnostic must render as five non-indexed linked_textured_quad records with finite bounds and six vertices per record.",
            linkedChainPathOrder:
              "Linked-chain diagnostic must preserve left-to-right record order with the middle record above the endpoint records and rendered positions matching draw-record order.",
            linkedChainSegmentSpacing:
              "Linked-chain diagnostic must keep five evenly spaced local chain records across the source-target span, so ordered but bunched-up records fail semantic visual correctness.",
            linkedChainParticleOrder:
              "Linked-chain diagnostic must preserve five draw record ids, particle ids, particle indexes, draw-record index bucket coverage, and per-record vertices.",
            linkedChainColorPair:
              "Linked-chain diagnostic must preserve the local cyan/yellow chain color pair in draw-record order; exact retail color grading still requires retail capture.",
            linkedChainColorAlternation:
              "Linked-chain diagnostic must preserve the local cyan/yellow/cyan/yellow/cyan color alternation across the five draw records while rendered color vectors match the contract.",
            linkedChainAlphaFade:
              "Linked-chain diagnostic must fade alpha strictly across the five ordered chain records while rendered alpha vectors and alpha attribute buckets match draw-record order.",
            linkedChainParticleSizeEnvelope:
              "Linked-chain diagnostic must preserve five positive local particle-size X/Y vectors in draw-record order, keep them inside the local linked-chain envelope x=[0.18,0.27] y=[0.25,0.35], retain visible size variation across the chain, and match rendered size vectors/attribute buckets to the render contract.",
            linkedChainAtlasAndMaterial:
              "Linked-chain diagnostic must bind the radial-soft 4x4 atlas with DoubleSide vertex-colored material state.",
            linkedChainDiagnosticBoundary:
              "Linked-chain diagnostic must surface source-evidence, dev-diagnostic, and retail-segment-buffer-required diagnostics until retail linked segment-buffer evidence exists.",
            linkedChainFraming:
              "Linked-chain diagnostic must keep deterministic chain particles visible inside finite analyzer bounds and within the five-record component budget."
          }
        : {}),
      ...(isMode2Lighten
        ? {
            mode2LightenDrawShape:
              "Mode2/Lighten must render as four non-indexed textured quads with finite bounds and six vertices per particle.",
            mode2LightenPath:
              "Mode2/Lighten must preserve a left-to-right four-point alternating low/high/low/high path and rendered position/velocity vectors must match draw-record order.",
            mode2LightenColorAlpha:
              "Mode2/Lighten must preserve local cyan/blue and yellow punch-through colors, unit-range alpha values, draw-record alpha order, and a strictly fading alpha vector.",
            mode2LightenColorAlternation:
              "Mode2/Lighten must preserve the local cyan/yellow/cyan/yellow color alternation across the four draw records while rendered color vectors match the contract.",
            mode2LightenParticleSizeEnvelope:
              "Mode2/Lighten must preserve four local punch-through particle-size vectors in draw-record order, match rendered size vectors to the contract, and keep all rendered sizes inside the local punch-through envelope x=[0.34,0.42], y=[0.34,0.41]; exact retail grading remains human-review gated.",
            mode2LightenBlendMaterial:
              "Mode2/Lighten must preserve Mode2_Lighten blend tokens and custom SrcAlpha/One/Add material state without falling back to normal alpha blending.",
            mode2LightenAtlasAndMaterial:
              "Mode2/Lighten must bind the radial-soft 4x4 atlas with DoubleSide vertex-colored material state.",
            mode2LightenParticleOrder:
              "Mode2/Lighten draw record ids, particle ids, particle indexes, and vertices-per-particle must preserve the four-particle local ordering.",
            mode2LightenDiagnosticBoundary:
              "Mode2/Lighten must surface source-evidence, dev-diagnostic, and retail blend/depth required diagnostics until retail punch-through/Mode2 evidence exists.",
            mode2LightenFraming:
              "Mode2/Lighten must keep deterministic zig-zag particles visible inside finite analyzer bounds and within the four-particle component budget."
          }
        : {}),
      ...(isChunkLane
        ? {
            diagnosticVisible:
              "The chunk diagnostic placeholder must be visible and nonblank so the unresolved resource state is inspectable.",
            chunkLanePreserved:
              "The chunk_model lane must survive parser/runtime/render/DOM/analyzer correlation unchanged.",
            noFakeParticles:
              "The diagnostic must prove no fake textured_quad particles, draw records, or vertices were synthesized.",
            unresolvedResource:
              "The oracle must keep canonicalResourceResolved=false until real chunk model resource evidence exists.",
            diagnosticCodesExplainPlaceholder:
              "Rendered diagnostic codes must include the unresolved chunk resource and diagnostic-only lane markers.",
            placeholderDiagnosticOnly:
              "Rendered texture/material state must make the placeholder explicitly diagnostic-only, not a canonical model render."
          }
        : {})
    },
    humanReviewNeeded: isChunkLane
      ? [
          {
            missingOracle:
              "Real progfx Type 9 chunk model resource/source row plus retail runtime/render/capture/comparison evidence.",
            reason:
              "Local fixture data can verify honest diagnostic behavior only: chunk_model lane preserved, no fake particles, unresolved resource codes present, and visible placeholder. It cannot verify the real chunk model shape, animation, material, or retail timing without the missing resource/source/capture evidence.",
            blocksCanonicalParity: true
          }
        ]
      : isFireballDetonate
      ? [
          {
            missingOracle:
              "Retail visual capture/comparison for exact VFX_FNF_FIREBALL detonate timing, pre/post burst expansion, palette, and particle lifetime.",
            reason:
              "Local fixture data and decomp anchors can validate the two-particle warm color/size/order/framing, atlas/material, diagnostics, and renderer-agnostic draw-route consistency only; they do not contain an Aurora retail framebuffer, detonate event timeline, expansion/lifetime profile, or runtime oracle.",
            blocksCanonicalParity: true
          }
        ]
      : isRow68Healing
        ? [
            {
              missingOracle:
                "Retail visual capture/comparison for exact VFX_IMP_HEALING_M palette, timing, shape, and dm_visualeffect 68 0 runtime behavior.",
              reason:
                "Local fixture data and decomp anchors can verify two textured_quads, warm/turquoise row payload colors, local material/atlas state, and deterministic framing only; they do not contain the Aurora retail framebuffer or runtime timing oracle.",
              blocksCanonicalParity: true
            }
          ]
      : isRow50Death
        ? [
            {
              missingOracle:
                "Retail visual capture/comparison for exact VFX_IMP_DEATH shape, timing, palette, and scripted EffectVisualEffect row 50 runtime behavior.",
              reason:
                "Local fixture data and decomp anchors can verify two textured_quads, purple/pale row payload colors, local material/atlas state, and deterministic framing only; they do not contain the Aurora retail framebuffer or scripted runtime timing oracle.",
              blocksCanonicalParity: true
            }
          ]
      : isEffectBeam
        ? [
            {
              missingOracle:
                "Retail visual capture/comparison for exact VFX_BEAM_FIRE beam volume, source-target path, BODY_NODE_CHEST anchoring, and temporary EffectBeam row 210 runtime behavior.",
              reason:
                "Local fixture data and decomp anchors can verify five textured_quad beam segments, BODY_NODE_CHEST provenance, local fire colors, material/atlas state, and deterministic source-to-target ordering only; they do not contain the Aurora retail beam-volume renderer, body-node attachment transform, or runtime/capture oracle.",
              blocksCanonicalParity: true
            }
          ]
      : isFountainAtlas
        ? [
            {
              missingOracle:
                "Retail visual capture/comparison or source-backed playback oracle for cot_fx01 Fountain atlas random frame start, fps=12 frame advancement, lifetime frame progression, and any material-level frame offset behavior.",
              reason:
                "Local fixture data and decomp anchors can verify six textured_quads, 4x4 fx_canonical_fire atlas grid, frame range, UV quarter-grid, local multi-frame draw-record order, material/atlas state, and deterministic framing only; they do not contain Aurora retail playback timing, random frame seeding, or framebuffer comparison evidence.",
              blocksCanonicalParity: true
            }
          ]
      : isPltLayerColors
        ? [
            {
              missingOracle:
                "Retail PLT palette/profile/layer lookup evidence plus runtime/render/capture/comparison evidence for exact layer colors and material binding.",
              reason:
                "Local fixture data and decomp anchors can verify four named layer records, dev-known layer color source metadata, distinct local RGB vectors, material/atlas state, and deterministic framing only; they do not contain Aurora retail PLT palette selection, profile lookup, material binding, or framebuffer comparison evidence.",
              blocksCanonicalParity: true
            }
          ]
      : isP2pGravity
        ? [
            {
              missingOracle:
                "Retail visual capture/comparison plus source-backed runtime evidence for P2P reference-node mapping, source/target anchors, gravity/drag state, tick progression, and final render contract.",
              reason:
                "Local fixture data and decomp anchors can verify seven textured_quads, source-left/target-right arc shape, local velocity descent, draw-record ordering, material/atlas state, and deterministic framing only; they do not contain Aurora retail reference-node attachment, gravity solver ticks, or framebuffer comparison evidence.",
              blocksCanonicalParity: true
            }
          ]
      : isLinkedLane
        ? [
            {
              missingOracle:
                "Retail visual capture/comparison plus source-backed runtime/render-contract evidence for linked-chain contiguous segment-buffer behavior, segment joins, source/target path, and runtime tick progression.",
              reason:
                "Local fixture data and decomp anchors can verify five linked_textured_quad records, local chain path/order, cyan/yellow color pair, material/atlas state, diagnostic lane preservation, and deterministic framing only; they do not contain Aurora retail linked segment-buffer construction, contiguous join behavior, or framebuffer comparison evidence.",
              blocksCanonicalParity: true
            }
          ]
      : isMode2Lighten
        ? [
            {
              missingOracle:
                "Retail runtime/render/capture/comparison evidence for punch-through versus Mode2_Lighten alpha-test, depth-write/depth-test, and blend-factor behavior.",
              reason:
                "Local fixture data and decomp anchors can validate local render-contract consistency only; they do not contain an Aurora retail framebuffer or runtime oracle.",
              blocksCanonicalParity: true
            }
          ]
        : [],
    checks: semanticChecks
  };
}

function runCommand(command, args, { cwd }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = value;
      index += 1;
    }
  }
  return parsed;
}

function requiredOption(options, key) {
  const value = options[key];
  if (!value) {
    throw new Error(`Missing required --${key} option.`);
  }
  return value;
}

function sanitizeFileStem(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function sameValue(values) {
  return values.length > 0 && values.every((value) => value === values[0]);
}

function approxEqual(left, right, epsilon = 0.000001) {
  return Math.abs(left - right) <= epsilon;
}

function samePosition(left, right) {
  return (
    typeof left?.x === "number" &&
    typeof left?.y === "number" &&
    typeof left?.z === "number" &&
    typeof right?.x === "number" &&
    typeof right?.y === "number" &&
    typeof right?.z === "number" &&
    approxEqual(left.x, right.x) &&
    approxEqual(left.y, right.y) &&
    approxEqual(left.z, right.z)
  );
}

function isMode2LightenBlendMode(blendMode) {
  return blendMode?.enum === "lighten" && blendMode?.rawToken === "Mode2_Lighten" && blendMode?.modeNumber === 2;
}

function getDrawRecords(snapshot) {
  const drawRecords = snapshot?.renderContract?.drawRecords;
  return Array.isArray(drawRecords) ? drawRecords : [];
}

function getFountainAtlasFrameIndexes(snapshot) {
  return getDrawRecords(snapshot)
    .map((record) => record.atlasUv?.frameIndex)
    .filter((frameIndex) => typeof frameIndex === "number");
}

function getPltLayerColorSignature(correlation) {
  return [correlation?.laneProbe?.firstDrawRecord, correlation?.laneProbe?.lastDrawRecord]
    .concat(correlation?.laneProbe?.middleDrawRecords ?? [])
    .filter(Boolean)
    .map((record) => ({
      layer: record.atlasProvenance?.pltLayer,
      colorKey: colorKey(record.color)
    }))
    .filter((entry) => typeof entry.layer === "string" && entry.colorKey !== "missing")
    .sort((left, right) => left.layer.localeCompare(right.layer));
}

function getPltLayerUvSignature(correlation) {
  const frameStatus = correlation?.frameStatus ?? {};
  const drawRecords = getAllDrawRecordsFromCorrelation(correlation);
  const layers = Array.isArray(frameStatus.renderedPltLayers) && frameStatus.renderedPltLayers.length > 0
    ? frameStatus.renderedPltLayers
    : drawRecords.map((record) => record.atlasProvenance?.pltLayer ?? record.pltLayer);
  const frames = Array.isArray(frameStatus.renderedAtlasFrames) ? frameStatus.renderedAtlasFrames : [];
  const u0 = Array.isArray(frameStatus.renderedAtlasUvU0) ? frameStatus.renderedAtlasUvU0 : [];
  const v0 = Array.isArray(frameStatus.renderedAtlasUvV0) ? frameStatus.renderedAtlasUvV0 : [];
  const u1 = Array.isArray(frameStatus.renderedAtlasUvU1) ? frameStatus.renderedAtlasUvU1 : [];
  const v1 = Array.isArray(frameStatus.renderedAtlasUvV1) ? frameStatus.renderedAtlasUvV1 : [];
  return layers
    .map((layer, index) => ({
      layer,
      frameIndex: frames[index],
      u0: u0[index],
      v0: v0[index],
      u1: u1[index],
      v1: v1[index]
    }))
    .filter((entry) => typeof entry.layer === "string")
    .sort((left, right) => left.layer.localeCompare(right.layer));
}

function colorKey(color) {
  if (!color) {
    return "missing";
  }
  return [color.r, color.g, color.b]
    .map((channel) => (typeof channel === "number" ? channel.toFixed(3) : "missing"))
    .join("/");
}

function getAllDrawRecordsFromCorrelation(correlation) {
  return [correlation?.laneProbe?.firstDrawRecord]
    .concat(correlation?.laneProbe?.middleDrawRecords ?? [])
    .concat([correlation?.laneProbe?.lastDrawRecord])
    .filter(Boolean);
}

function getP2pPositionSignature(correlation) {
  return getAllDrawRecordsFromCorrelation(correlation)
    .map((record) => {
      const position = record.position;
      return [position?.x, position?.y, position?.z]
        .map((value) => (typeof value === "number" ? value.toFixed(6) : "missing"))
        .join("/");
    })
    .join("|");
}
