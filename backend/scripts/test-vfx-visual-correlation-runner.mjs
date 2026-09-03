import assert from "node:assert/strict";

import {
  createChunkType9StabilityReport,
  createEffectBeamStabilityReport,
  createFireballDetonateStabilityReport,
  createFountainAtlasProgressionReport,
  createLinkedChainStabilityReport,
  createMode2LightenStabilityReport,
  createP2pGravityStabilityReport,
  createPltLayerColorStabilityReport,
  createRow50EffectVisualEffectStabilityReport,
  createRow68DmVisualEffectStabilityReport,
  createCorrelation,
  getFailedChecks,
  validateFixtureSnapshotIds
} from "./run-vfx-visual-correlation.mjs";

const TEST_ANALYSIS_FEATURES_BY_FIXTURE_ID = new Map([
  ["vfx-retail-explosion-detonate-fireball", ["explosion-detonate-particle-pair"]],
  ["vfx-retail-fountain-atlas-cot-fx01", ["fountain-atlas-particles"]],
  ["vfx-retail-p2p-gravity-reference-node", ["gravity-reference-arc"]],
  ["vfx-retail-plt-known-layer-colors", ["plt-layer-color-order"]],
  ["vfx-retail-scripted-effectvisualeffect-row-50", ["purple-pale-particle-pair"]],
  ["vfx-retail-scripted-effectbeam-row-210-body-chest", ["source-target-beam-segments"]],
  ["vfx-retail-dm-visualeffect-row-68-duration-0", ["warm-turquoise-particle-pair"]]
]);

validateFixtureSnapshotIds({
  fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
  snapshot: {
    requestedFixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
    fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50"
  }
});

assert.throws(
  () =>
    validateFixtureSnapshotIds({
      fixtureId: "vfx-retail-does-not-exist",
      snapshot: {
        requestedFixtureId: "vfx-retail-does-not-exist",
        fixtureId: "vfx-retail-dm-visualeffect-row-68-duration-0"
      }
    }),
  /Fixture id mismatch/
);

const row50DeathRecord = (args) =>
  drawRecord({
    size: args.id === 0 ? { x: 0.42, y: 0.5 } : { x: 0.34, y: 0.4 },
    ...args
  });

const row68HealingRecord = (args) =>
  drawRecord({
    size: args.id === 0 ? { x: 0.38, y: 0.44 } : { x: 0.3, y: 0.35 },
    ...args
  });

const generic = correlate({
  fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row50DeathRecord({ id: 0, x: -0.1, y: 0 }),
    row50DeathRecord({ id: 1, x: 0.1, y: 0 })
  ],
  drawParticles: 2,
  components: 1
});
assert.equal(generic.checks.visibleComponentsWithinDrawParticleBudget, true);
assert.equal(generic.checks.drawParticlesVisible, true);
assert.deepEqual(getFailedChecks(generic), []);

const identityNeutralPurplePairA = correlate({
  fixtureId: "test-arbitrary-alpha",
  analysisFeatures: ["purple-pale-particle-pair"],
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row50DeathRecord({ id: 0, x: -0.16, y: -0.08, color: { r: 0.72, g: 0.5, b: 1 } }),
    row50DeathRecord({ id: 1, x: 0.14, y: 0.11, color: { r: 0.9, g: 0.9, b: 1 } })
  ],
  drawParticles: 2,
  components: 1
});
const identityNeutralPurplePairB = correlate({
  fixtureId: "test-arbitrary-beta",
  analysisFeatures: ["purple-pale-particle-pair"],
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row50DeathRecord({ id: 0, x: -0.16, y: -0.08, color: { r: 0.72, g: 0.5, b: 1 } }),
    row50DeathRecord({ id: 1, x: 0.14, y: 0.11, color: { r: 0.9, g: 0.9, b: 1 } })
  ],
  drawParticles: 2,
  components: 1
});
assert.equal(identityNeutralPurplePairA.visualSemanticChecks.row50DeathColorPair, true);
assert.deepEqual(
  identityNeutralPurplePairA.visualSemanticChecks,
  identityNeutralPurplePairB.visualSemanticChecks
);

const row50StabilityFrameA = correlate({
  fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
  timeSeconds: 0.75,
  seed: 7,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row50DeathRecord({ id: 0, x: -0.16, y: -0.08, color: { r: 0.72, g: 0.5, b: 1 } }),
    row50DeathRecord({ id: 1, x: 0.14, y: 0.11, color: { r: 0.9, g: 0.9, b: 1 } })
  ],
  drawParticles: 2,
  components: 1
});
const row50StabilityFrameB = correlate({
  fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
  timeSeconds: 1.15,
  seed: 81,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row50DeathRecord({ id: 0, x: -0.26, y: -0.13, color: { r: 0.72, g: 0.5, b: 1 } }),
    row50DeathRecord({ id: 1, x: 0.21, y: 0.2, color: { r: 0.9, g: 0.9, b: 1 } })
  ],
  drawParticles: 2,
  components: 1
});
const row50Stability = createRow50EffectVisualEffectStabilityReport([
  row50StabilityFrameA,
  row50StabilityFrameB
]);
assert.equal(row50Stability.result, "row50-effectvisualeffect-two-frame-stability-correlated-local-diagnostic");
assert.equal(row50Stability.checks.row50EffectVisualEffectStabilityAllowsMergedComponents, true);
assert.equal(row50Stability.checks.row50EffectVisualEffectStabilitySemanticChecksEveryFrame, true);
assert.equal(row50Stability.checks.row50EffectVisualEffectStabilityAlphaFadeEveryFrame, true);
assert.equal(row50Stability.checks.row50EffectVisualEffectStabilityFirstParticleLargerEveryFrame, true);
assert.deepEqual(getFailedChecks(row50Stability), []);
assert.equal(row50StabilityFrameA.visualSemanticChecks.row50DeathDrawShape, true);
assert.equal(row50StabilityFrameA.visualSemanticChecks.row50DeathColorPair, true);
assert.equal(row50StabilityFrameA.visualSemanticChecks.row50DeathColorPlacement, true);
assert.equal(row50StabilityFrameA.visualSemanticChecks.row50DeathAlphaFade, true);
assert.equal(row50StabilityFrameA.visualSemanticChecks.row50DeathParticleSize, true);
assert.equal(row50StabilityFrameA.visualSemanticChecks.row50DeathTwoParticleOrder, true);
assert.equal(row50StabilityFrameA.visualSemanticChecks.row50DeathAtlasAndMaterial, true);
assert.equal(row50StabilityFrameA.visualSemanticChecks.row50DeathFraming, true);
assert.equal(
  row50StabilityFrameA.visualSemanticOracle.humanReviewNeeded[0].missingOracle,
  "Retail visual capture/comparison for exact VFX_IMP_DEATH shape, timing, palette, and scripted EffectVisualEffect row 50 runtime behavior."
);

const row50ColorDriftFrame = correlate({
  fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
  timeSeconds: 0.75,
  seed: 7,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row50DeathRecord({ id: 0, x: -0.16, y: -0.08, color: { r: 1, g: 0.18, b: 0.1 } }),
    row50DeathRecord({ id: 1, x: 0.14, y: 0.11, color: { r: 1, g: 0.5, b: 0.1 } })
  ],
  drawParticles: 2,
  components: 1
});
assert.equal(row50ColorDriftFrame.visualSemanticChecks.row50DeathColorPair, false);
assert.equal(row50ColorDriftFrame.result, "render-contract-visual-correlation-failed");

const row50PlacementDriftFrame = correlate({
  fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
  timeSeconds: 0.75,
  seed: 7,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row50DeathRecord({ id: 0, x: 0.16, y: 0.08, color: { r: 0.72, g: 0.5, b: 1 } }),
    row50DeathRecord({ id: 1, x: -0.14, y: -0.11, color: { r: 0.9, g: 0.9, b: 1 } })
  ],
  drawParticles: 2,
  components: 1
});
assert.equal(row50PlacementDriftFrame.visualSemanticChecks.row50DeathColorPair, true);
assert.equal(row50PlacementDriftFrame.visualSemanticChecks.row50DeathColorPlacement, false);
assert.equal(row50PlacementDriftFrame.result, "render-contract-visual-correlation-failed");

const row50FlatAlphaFrame = correlate({
  fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
  timeSeconds: 0.75,
  seed: 7,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row50DeathRecord({ id: 0, x: -0.16, y: -0.08, color: { r: 0.72, g: 0.5, b: 1 }, alpha: 0.7 }),
    row50DeathRecord({ id: 1, x: 0.14, y: 0.11, color: { r: 0.9, g: 0.9, b: 1 }, alpha: 0.7 })
  ],
  drawParticles: 2,
  components: 1
});
assert.equal(row50FlatAlphaFrame.visualSemanticChecks.row50DeathColorPair, true);
assert.equal(row50FlatAlphaFrame.visualSemanticChecks.row50DeathColorPlacement, true);
assert.equal(row50FlatAlphaFrame.visualSemanticChecks.row50DeathAlphaFade, false);
assert.equal(row50FlatAlphaFrame.result, "render-contract-visual-correlation-failed");

const row50SizeDriftFrame = correlate({
  fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
  timeSeconds: 0.75,
  seed: 7,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row50DeathRecord({ id: 0, x: -0.16, y: -0.08, color: { r: 0.72, g: 0.5, b: 1 }, size: { x: 0.3, y: 0.35 } }),
    row50DeathRecord({ id: 1, x: 0.14, y: 0.11, color: { r: 0.9, g: 0.9, b: 1 }, size: { x: 0.4, y: 0.45 } })
  ],
  drawParticles: 2,
  components: 1
});
assert.equal(row50SizeDriftFrame.visualSemanticChecks.row50DeathColorPair, true);
assert.equal(row50SizeDriftFrame.visualSemanticChecks.row50DeathColorPlacement, true);
assert.equal(row50SizeDriftFrame.visualSemanticChecks.row50DeathAlphaFade, true);
assert.equal(row50SizeDriftFrame.visualSemanticChecks.row50DeathParticleSize, false);
assert.equal(row50SizeDriftFrame.result, "render-contract-visual-correlation-failed");

assert.deepEqual(getFailedChecks(createRow50EffectVisualEffectStabilityReport([row50StabilityFrameA, row50ColorDriftFrame])), [
  "row50EffectVisualEffectStabilityAllFramesPassed",
  "row50EffectVisualEffectStabilitySemanticChecksEveryFrame"
]);
assert.deepEqual(getFailedChecks(createRow50EffectVisualEffectStabilityReport([row50StabilityFrameA, row50FlatAlphaFrame])), [
  "row50EffectVisualEffectStabilityAllFramesPassed",
  "row50EffectVisualEffectStabilitySemanticChecksEveryFrame",
  "row50EffectVisualEffectStabilityAlphaFadeEveryFrame"
]);
assert.deepEqual(getFailedChecks(createRow50EffectVisualEffectStabilityReport([row50StabilityFrameA, row50SizeDriftFrame])), [
  "row50EffectVisualEffectStabilityAllFramesPassed",
  "row50EffectVisualEffectStabilitySemanticChecksEveryFrame",
  "row50EffectVisualEffectStabilityFirstParticleLargerEveryFrame"
]);

const row50LaneDriftFrame = correlate({
  fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
  timeSeconds: 1.15,
  seed: 81,
  drawLane: "linked_textured_quad",
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row50DeathRecord({ id: 0, x: -0.26, y: -0.13, lane: "linked_textured_quad", color: { r: 0.72, g: 0.5, b: 1 } }),
    row50DeathRecord({ id: 1, x: 0.21, y: 0.2, lane: "linked_textured_quad", color: { r: 0.9, g: 0.9, b: 1 } })
  ],
  drawParticles: 2,
  components: 1
});
assert.deepEqual(getFailedChecks(createRow50EffectVisualEffectStabilityReport([row50StabilityFrameA, row50LaneDriftFrame])), [
  "row50EffectVisualEffectStabilityAllFramesPassed",
  "row50EffectVisualEffectStabilityLaneStable",
  "row50EffectVisualEffectStabilitySemanticChecksEveryFrame"
]);

const fireballDiagnosticCodes = [
  "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
  "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED",
  "VFX_PARTICLE_DRAW_NON_INDEXED_ARRAYS_REQUIRED"
];

const fireballStabilityFrameA = correlate({
  fixtureId: "vfx-retail-explosion-detonate-fireball",
  timeSeconds: 0.35,
  seed: 11,
  diagnosticCodes: fireballDiagnosticCodes,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    drawRecord({
      id: 0,
      x: -0.25,
      y: -0.17,
      color: { r: 1, g: 0.68, b: 0.18 },
      velocity: { x: -0.03, y: 0.06, z: 0 }
    }),
    drawRecord({
      id: 1,
      x: 0.2,
      y: 0.13,
      color: { r: 1, g: 0.18, b: 0.1 },
      velocity: { x: 0.03, y: 0.11, z: 0 }
    })
  ],
  drawParticles: 2,
  components: 2
});
const fireballStabilityFrameB = correlate({
  fixtureId: "vfx-retail-explosion-detonate-fireball",
  timeSeconds: 0.85,
  seed: 82,
  diagnosticCodes: fireballDiagnosticCodes,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    drawRecord({
      id: 0,
      x: -0.24,
      y: -0.16,
      color: { r: 1, g: 0.68, b: 0.18 },
      velocity: { x: -0.03, y: 0.06, z: 0 }
    }),
    drawRecord({
      id: 1,
      x: 0.27,
      y: 0.2,
      color: { r: 1, g: 0.18, b: 0.1 },
      velocity: { x: 0.03, y: 0.11, z: 0 }
    })
  ],
  drawParticles: 2,
  components: 2
});
const fireballStability = createFireballDetonateStabilityReport([
  fireballStabilityFrameA,
  fireballStabilityFrameB
]);
assert.equal(fireballStability.result, "fireball-detonate-two-frame-stability-correlated-local-diagnostic");
assert.deepEqual(getFailedChecks(fireballStability), []);
assert.equal(fireballStability.checks.fireballDetonateStabilitySemanticChecksEveryFrame, true);
assert.equal(fireballStability.checks.fireballDetonateStabilityDrawModeRouteEveryFrame, true);
assert.equal(fireballStability.checks.fireballDetonateStabilityWarmColorOrderEveryFrame, true);
assert.equal(fireballStability.checks.fireballDetonateStabilityAlphaFadeEveryFrame, true);
assert.equal(fireballStability.checks.fireballDetonateStabilityOutwardMotionEveryFrame, true);
assert.equal(fireballStability.checks.fireballDetonateStabilityParticleSizeEveryFrame, true);
assert.equal(fireballStability.checks.fireballDetonateStabilityAtlasAndMaterialEveryFrame, true);
assert.equal(fireballStability.checks.fireballDetonateStabilityParticleOrderEveryFrame, true);
assert.equal(fireballStability.checks.fireballDetonateStabilityFramingEveryFrame, true);
assert.equal(fireballStabilityFrameA.visualSemanticChecks.drawModeRoute, true);
assert.equal(fireballStabilityFrameA.visualSemanticChecks.fireballDetonateDrawShape, true);
assert.equal(fireballStabilityFrameA.visualSemanticChecks.fireballDetonateWarmColorPair, true);
assert.equal(fireballStabilityFrameA.visualSemanticChecks.fireballDetonateWarmColorOrder, true);
assert.equal(fireballStabilityFrameA.visualSemanticChecks.fireballDetonateParticleSize, true);
assert.equal(fireballStabilityFrameA.visualSemanticChecks.fireballDetonateAlphaFade, true);
assert.equal(fireballStabilityFrameA.visualSemanticChecks.fireballDetonateOutwardMotion, true);
assert.equal(fireballStabilityFrameA.visualSemanticChecks.fireballDetonateAtlasAndMaterial, true);
assert.equal(fireballStabilityFrameA.visualSemanticChecks.fireballDetonateParticleOrder, true);
assert.equal(fireballStabilityFrameA.visualSemanticChecks.fireballDetonateDiagnosticBoundary, true);
assert.equal(fireballStabilityFrameA.visualSemanticChecks.fireballDetonateFraming, true);
assert.deepEqual(getFailedChecks(fireballStabilityFrameA), []);
assert.equal(
  fireballStabilityFrameA.visualSemanticOracle.humanReviewNeeded[0].missingOracle,
  "Retail visual capture/comparison for exact VFX_FNF_FIREBALL detonate timing, pre/post burst expansion, palette, and particle lifetime."
);

const blueFireballFrame = correlate({
  fixtureId: "vfx-retail-explosion-detonate-fireball",
  timeSeconds: 0.85,
  seed: 82,
  diagnosticCodes: fireballDiagnosticCodes,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    drawRecord({
      id: 0,
      x: -0.24,
      y: -0.16,
      color: { r: 0.2, g: 0.4, b: 1 },
      velocity: { x: -0.03, y: 0.06, z: 0 }
    }),
    drawRecord({
      id: 1,
      x: 0.27,
      y: 0.2,
      color: { r: 1, g: 0.18, b: 0.1 },
      velocity: { x: 0.03, y: 0.11, z: 0 }
    })
  ],
  drawParticles: 2,
  components: 2
});
assert.deepEqual(getFailedChecks(createFireballDetonateStabilityReport([fireballStabilityFrameA, blueFireballFrame])), [
  "fireballDetonateStabilityAllFramesPassed",
  "fireballDetonateStabilitySemanticChecksEveryFrame",
  "fireballDetonateStabilityWarmColorEveryFrame",
  "fireballDetonateStabilityWarmColorOrderEveryFrame"
]);
assert.equal(blueFireballFrame.visualSemanticChecks.fireballDetonateWarmColorPair, false);
assert.equal(blueFireballFrame.result, "render-contract-visual-correlation-failed");

const swappedColorFireballFrame = correlate({
  fixtureId: "vfx-retail-explosion-detonate-fireball",
  timeSeconds: 0.85,
  seed: 82,
  diagnosticCodes: fireballDiagnosticCodes,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    drawRecord({
      id: 0,
      x: -0.24,
      y: -0.16,
      color: { r: 1, g: 0.18, b: 0.1 },
      velocity: { x: -0.03, y: 0.06, z: 0 }
    }),
    drawRecord({
      id: 1,
      x: 0.27,
      y: 0.2,
      color: { r: 1, g: 0.68, b: 0.18 },
      velocity: { x: 0.03, y: 0.11, z: 0 }
    })
  ],
  drawParticles: 2,
  components: 2
});
assert.equal(swappedColorFireballFrame.visualSemanticChecks.fireballDetonateWarmColorPair, true);
assert.equal(swappedColorFireballFrame.visualSemanticChecks.fireballDetonateWarmColorOrder, false);
assert.equal(swappedColorFireballFrame.visualSemanticChecks.fireballDetonateOutwardMotion, true);
assert.equal(swappedColorFireballFrame.visualSemanticChecks.fireballDetonateAlphaFade, true);
assert.equal(swappedColorFireballFrame.result, "render-contract-visual-correlation-failed");
assert.deepEqual(getFailedChecks(createFireballDetonateStabilityReport([fireballStabilityFrameA, swappedColorFireballFrame])), [
  "fireballDetonateStabilityAllFramesPassed",
  "fireballDetonateStabilitySemanticChecksEveryFrame",
  "fireballDetonateStabilityWarmColorOrderEveryFrame"
]);

const inwardFireballFrame = correlate({
  fixtureId: "vfx-retail-explosion-detonate-fireball",
  timeSeconds: 0.85,
  seed: 82,
  diagnosticCodes: fireballDiagnosticCodes,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    drawRecord({
      id: 0,
      x: -0.24,
      y: -0.16,
      color: { r: 1, g: 0.68, b: 0.18 },
      velocity: { x: 0.03, y: 0.06, z: 0 }
    }),
    drawRecord({
      id: 1,
      x: 0.27,
      y: 0.2,
      color: { r: 1, g: 0.18, b: 0.1 },
      velocity: { x: -0.03, y: -0.02, z: 0 }
    })
  ],
  drawParticles: 2,
  components: 2
});
assert.equal(inwardFireballFrame.visualSemanticChecks.fireballDetonateWarmColorPair, true);
assert.equal(inwardFireballFrame.visualSemanticChecks.fireballDetonateWarmColorOrder, true);
assert.equal(inwardFireballFrame.visualSemanticChecks.fireballDetonateParticleSize, true);
assert.equal(inwardFireballFrame.visualSemanticChecks.fireballDetonateOutwardMotion, false);
assert.equal(inwardFireballFrame.result, "render-contract-visual-correlation-failed");
assert.deepEqual(getFailedChecks(createFireballDetonateStabilityReport([fireballStabilityFrameA, inwardFireballFrame])), [
  "fireballDetonateStabilityAllFramesPassed",
  "fireballDetonateStabilitySemanticChecksEveryFrame",
  "fireballDetonateStabilityOutwardMotionEveryFrame"
]);

const flatAlphaFireballFrame = correlate({
  fixtureId: "vfx-retail-explosion-detonate-fireball",
  timeSeconds: 0.85,
  seed: 82,
  diagnosticCodes: fireballDiagnosticCodes,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    drawRecord({
      id: 0,
      x: -0.24,
      y: -0.16,
      alpha: 0.7,
      color: { r: 1, g: 0.68, b: 0.18 },
      velocity: { x: -0.03, y: 0.06, z: 0 }
    }),
    drawRecord({
      id: 1,
      x: 0.27,
      y: 0.2,
      alpha: 0.7,
      color: { r: 1, g: 0.18, b: 0.1 },
      velocity: { x: 0.03, y: 0.11, z: 0 }
    })
  ],
  drawParticles: 2,
  components: 2
});
assert.equal(flatAlphaFireballFrame.visualSemanticChecks.fireballDetonateWarmColorPair, true);
assert.equal(flatAlphaFireballFrame.visualSemanticChecks.fireballDetonateWarmColorOrder, true);
assert.equal(flatAlphaFireballFrame.visualSemanticChecks.fireballDetonateParticleSize, true);
assert.equal(flatAlphaFireballFrame.visualSemanticChecks.fireballDetonateOutwardMotion, true);
assert.equal(flatAlphaFireballFrame.visualSemanticChecks.fireballDetonateAlphaFade, false);
assert.equal(flatAlphaFireballFrame.result, "render-contract-visual-correlation-failed");
assert.deepEqual(getFailedChecks(createFireballDetonateStabilityReport([fireballStabilityFrameA, flatAlphaFireballFrame])), [
  "fireballDetonateStabilityAllFramesPassed",
  "fireballDetonateStabilitySemanticChecksEveryFrame",
  "fireballDetonateStabilityAlphaFadeEveryFrame"
]);

const row68StabilityFrameA = correlate({
  fixtureId: "vfx-retail-dm-visualeffect-row-68-duration-0",
  timeSeconds: 0.5,
  seed: 1,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row68HealingRecord({ id: 0, particleId: 680, x: -0.22, y: -0.19, color: { r: 1, g: 0.35, b: 0.22 } }),
    row68HealingRecord({ id: 1, particleId: 681, x: 0.19, y: 0.13, color: { r: 0.28, g: 0.95, b: 0.82 } })
  ],
  drawParticles: 2,
  components: 2
});
const row68StabilityFrameB = correlate({
  fixtureId: "vfx-retail-dm-visualeffect-row-68-duration-0",
  timeSeconds: 0.9,
  seed: 83,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row68HealingRecord({ id: 0, particleId: 680, x: -0.25, y: -0.16, color: { r: 1, g: 0.35, b: 0.22 } }),
    row68HealingRecord({ id: 1, particleId: 681, x: 0.26, y: 0.2, color: { r: 0.28, g: 0.95, b: 0.82 } })
  ],
  drawParticles: 2,
  components: 2
});
const row68Stability = createRow68DmVisualEffectStabilityReport([
  row68StabilityFrameA,
  row68StabilityFrameB
]);
assert.equal(row68Stability.result, "row68-dmvisualeffect-two-frame-stability-correlated-local-diagnostic");
assert.deepEqual(getFailedChecks(row68Stability), []);
assert.equal(row68Stability.checks.row68DmVisualEffectStabilitySemanticChecksEveryFrame, true);
assert.equal(row68Stability.checks.row68DmVisualEffectStabilityAlphaFadeEveryFrame, true);
assert.equal(row68Stability.checks.row68DmVisualEffectStabilityFirstParticleLargerEveryFrame, true);
assert.equal(row68StabilityFrameA.visualSemanticChecks.row68HealingDrawShape, true);
assert.equal(row68StabilityFrameA.visualSemanticChecks.row68HealingColorPair, true);
assert.equal(row68StabilityFrameA.visualSemanticChecks.row68HealingColorPlacement, true);
assert.equal(row68StabilityFrameA.visualSemanticChecks.row68HealingAlphaFade, true);
assert.equal(row68StabilityFrameA.visualSemanticChecks.row68HealingParticleSize, true);
assert.equal(row68StabilityFrameA.visualSemanticChecks.row68HealingTwoParticleOrder, true);
assert.equal(row68StabilityFrameA.visualSemanticChecks.row68HealingAtlasAndMaterial, true);
assert.equal(row68StabilityFrameA.visualSemanticChecks.row68HealingFraming, true);
assert.equal(
  row68StabilityFrameA.visualSemanticOracle.humanReviewNeeded[0].missingOracle,
  "Retail visual capture/comparison for exact VFX_IMP_HEALING_M palette, timing, shape, and dm_visualeffect 68 0 runtime behavior."
);

const row68ColorDriftFrame = correlate({
  fixtureId: "vfx-retail-dm-visualeffect-row-68-duration-0",
  timeSeconds: 0.9,
  seed: 83,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row68HealingRecord({ id: 0, particleId: 680, x: -0.25, y: -0.16, color: { r: 1, g: 0.35, b: 0.22 } }),
    row68HealingRecord({ id: 1, particleId: 681, x: 0.26, y: 0.2, color: { r: 1, g: 0.18, b: 0.1 } })
  ],
  drawParticles: 2,
  components: 2
});
assert.deepEqual(getFailedChecks(createRow68DmVisualEffectStabilityReport([row68StabilityFrameA, row68ColorDriftFrame])), [
  "row68DmVisualEffectStabilityAllFramesPassed",
  "row68DmVisualEffectStabilityHealingColorPairEveryFrame",
  "row68DmVisualEffectStabilitySemanticChecksEveryFrame"
]);
assert.equal(row68ColorDriftFrame.visualSemanticChecks.row68HealingColorPair, false);
assert.equal(row68ColorDriftFrame.result, "render-contract-visual-correlation-failed");

const row68PlacementDriftFrame = correlate({
  fixtureId: "vfx-retail-dm-visualeffect-row-68-duration-0",
  timeSeconds: 0.9,
  seed: 83,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row68HealingRecord({ id: 0, particleId: 680, x: 0.25, y: 0.16, color: { r: 1, g: 0.35, b: 0.22 } }),
    row68HealingRecord({ id: 1, particleId: 681, x: -0.26, y: -0.2, color: { r: 0.28, g: 0.95, b: 0.82 } })
  ],
  drawParticles: 2,
  components: 2
});
assert.equal(row68PlacementDriftFrame.visualSemanticChecks.row68HealingColorPair, true);
assert.equal(row68PlacementDriftFrame.visualSemanticChecks.row68HealingColorPlacement, false);
assert.equal(row68PlacementDriftFrame.result, "render-contract-visual-correlation-failed");

const row68FlatAlphaFrame = correlate({
  fixtureId: "vfx-retail-dm-visualeffect-row-68-duration-0",
  timeSeconds: 0.9,
  seed: 68,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row68HealingRecord({ id: 0, particleId: 680, x: -0.18, y: -0.06, color: { r: 1, g: 0.38, b: 0.12 }, alpha: 0.7 }),
    row68HealingRecord({ id: 1, particleId: 681, x: 0.18, y: 0.13, color: { r: 0.25, g: 1, b: 0.78 }, alpha: 0.7 })
  ],
  drawParticles: 2,
  components: 2
});
assert.equal(row68FlatAlphaFrame.visualSemanticChecks.row68HealingColorPair, true);
assert.equal(row68FlatAlphaFrame.visualSemanticChecks.row68HealingColorPlacement, true);
assert.equal(row68FlatAlphaFrame.visualSemanticChecks.row68HealingAlphaFade, false);
assert.equal(row68FlatAlphaFrame.result, "render-contract-visual-correlation-failed");
assert.deepEqual(getFailedChecks(createRow68DmVisualEffectStabilityReport([row68StabilityFrameA, row68FlatAlphaFrame])), [
  "row68DmVisualEffectStabilityAllFramesPassed",
  "row68DmVisualEffectStabilitySemanticChecksEveryFrame",
  "row68DmVisualEffectStabilityAlphaFadeEveryFrame"
]);

const row68SizeDriftFrame = correlate({
  fixtureId: "vfx-retail-dm-visualeffect-row-68-duration-0",
  timeSeconds: 0.68,
  seed: 192,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: [
    row68HealingRecord({
      id: 0,
      particleId: 680,
      x: -0.18,
      y: -0.06,
      color: { r: 1, g: 0.38, b: 0.12 },
      size: { x: 0.28, y: 0.32 }
    }),
    row68HealingRecord({
      id: 1,
      particleId: 681,
      x: 0.18,
      y: 0.13,
      color: { r: 0.25, g: 1, b: 0.78 },
      size: { x: 0.4, y: 0.46 }
    })
  ],
  drawParticles: 2,
  components: 2
});
assert.equal(row68SizeDriftFrame.visualSemanticChecks.row68HealingColorPair, true);
assert.equal(row68SizeDriftFrame.visualSemanticChecks.row68HealingColorPlacement, true);
assert.equal(row68SizeDriftFrame.visualSemanticChecks.row68HealingAlphaFade, true);
assert.equal(row68SizeDriftFrame.visualSemanticChecks.row68HealingParticleSize, false);
assert.equal(row68SizeDriftFrame.result, "render-contract-visual-correlation-failed");
assert.deepEqual(getFailedChecks(createRow68DmVisualEffectStabilityReport([row68StabilityFrameA, row68SizeDriftFrame])), [
  "row68DmVisualEffectStabilityAllFramesPassed",
  "row68DmVisualEffectStabilitySemanticChecksEveryFrame",
  "row68DmVisualEffectStabilityFirstParticleLargerEveryFrame"
]);

const p2pDiagnosticCodes = [
  "VFX_P2P_GRAVITY_SOURCE_EVIDENCE_REQUIRED",
  "VFX_DEV_P2P_GRAVITY_DIAGNOSTIC_ONLY",
  "VFX_P2P_GRAVITY_REFERENCE_NODE_REQUIRED",
  "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
  "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
];

const p2p = correlate({
  fixtureId: "vfx-retail-p2p-gravity-reference-node",
  drawParticleCount: 7,
  drawVertexCount: 42,
  drawRecords: p2pArcDrawRecords(),
  drawParticles: 7,
  components: 7,
  diagnosticCodes: p2pDiagnosticCodes
});
assert.equal(p2p.checks.p2pArcStartsLeft, true);
assert.equal(p2p.checks.p2pArcEndsRight, true);
assert.equal(p2p.checks.p2pArcMiddleHigherThanEnds, true);
assert.equal(p2p.checks.p2pRenderedDrawRecordIndexAttributeCoversAllDrawRecords, true);
assert.equal(p2p.checks.p2pRenderedDrawRecordIndexAttributeRangeMatchesDrawRecordOrder, true);
assert.equal(p2p.checks.p2pRenderedDrawRecordIndexAttributeSourceIsCanonical, true);
assert.equal(p2p.visualSemanticChecks.p2pGravityDrawShape, true);
assert.equal(p2p.visualSemanticChecks.p2pGravityArcPath, true);
assert.equal(p2p.visualSemanticChecks.p2pGravitySegmentSpacing, true);
assert.equal(p2p.visualSemanticChecks.p2pGravityVelocityPath, true);
assert.equal(p2p.visualSemanticChecks.p2pGravityAlphaFade, true);
assert.equal(p2p.visualSemanticChecks.p2pGravityParticleSizeEnvelope, true);
assert.equal(p2p.visualSemanticChecks.p2pGravityColorPair, true);
assert.equal(p2p.visualSemanticChecks.p2pGravityColorAlternation, true);
assert.equal(p2p.visualSemanticChecks.p2pGravityParticleOrder, true);
assert.equal(p2p.visualSemanticChecks.p2pGravityAtlasAndMaterial, true);
assert.equal(p2p.visualSemanticChecks.p2pGravityDiagnosticBoundary, true);
assert.equal(p2p.visualSemanticChecks.p2pGravityFraming, true);
assert.deepEqual(getFailedChecks(p2p), []);

const p2pStabilityFrameA = correlate({
  fixtureId: "vfx-retail-p2p-gravity-reference-node",
  timeSeconds: 0.7,
  seed: 41,
  drawParticleCount: 7,
  drawVertexCount: 42,
  drawRecords: p2pArcDrawRecords(),
  drawParticles: 7,
  components: 7,
  diagnosticCodes: p2pDiagnosticCodes
});
const p2pStabilityFrameB = correlate({
  fixtureId: "vfx-retail-p2p-gravity-reference-node",
  timeSeconds: 1.1,
  seed: 80,
  drawParticleCount: 7,
  drawVertexCount: 42,
  drawRecords: p2pArcDrawRecords(),
  drawParticles: 7,
  components: 7,
  diagnosticCodes: p2pDiagnosticCodes
});
const p2pStability = createP2pGravityStabilityReport([p2pStabilityFrameA, p2pStabilityFrameB]);
assert.equal(p2pStability.result, "p2p-gravity-two-frame-stability-correlated-local-diagnostic");
assert.deepEqual(getFailedChecks(p2pStability), []);

const p2pFlatAlphaStabilityFrame = correlate({
  fixtureId: "vfx-retail-p2p-gravity-reference-node",
  timeSeconds: 1.1,
  seed: 80,
  drawParticleCount: 7,
  drawVertexCount: 42,
  drawRecords: p2pArcDrawRecords({ alphaValues: [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7] }),
  drawParticles: 7,
  components: 7,
  diagnosticCodes: p2pDiagnosticCodes
});
assert.deepEqual(getFailedChecks(createP2pGravityStabilityReport([p2pStabilityFrameA, p2pFlatAlphaStabilityFrame])), [
  "p2pGravityStabilityAllFramesPassed",
  "p2pGravityStabilitySemanticChecksEveryFrame",
  "p2pGravityStabilityAlphaFadeEveryFrame"
]);

const p2pColorOrderDriftStabilityFrame = correlate({
  fixtureId: "vfx-retail-p2p-gravity-reference-node",
  timeSeconds: 1.1,
  seed: 80,
  drawParticleCount: 7,
  drawVertexCount: 42,
  drawRecords: p2pArcDrawRecords({ invertColors: true }),
  drawParticles: 7,
  components: 7,
  diagnosticCodes: p2pDiagnosticCodes
});
assert.deepEqual(
  getFailedChecks(createP2pGravityStabilityReport([p2pStabilityFrameA, p2pColorOrderDriftStabilityFrame])),
  [
    "p2pGravityStabilityAllFramesPassed",
    "p2pGravityStabilitySemanticChecksEveryFrame",
    "p2pGravityStabilityColorAlternationEveryFrame"
  ]
);

const p2pDriftFrame = correlate({
  fixtureId: "vfx-retail-p2p-gravity-reference-node",
  timeSeconds: 1.1,
  seed: 80,
  drawParticleCount: 7,
  drawVertexCount: 42,
  drawRecords: p2pArcDrawRecords({ firstX: -0.42 }),
  drawParticles: 7,
  components: 7,
  diagnosticCodes: p2pDiagnosticCodes
});
assert.deepEqual(getFailedChecks(createP2pGravityStabilityReport([p2pStabilityFrameA, p2pDriftFrame])), [
  "p2pGravityStabilityAllFramesPassed",
  "p2pGravityStabilitySourceAnchorStable",
  "p2pGravityStabilityArcPositionsStable",
  "p2pGravityStabilitySemanticChecksEveryFrame"
]);

const bunchedP2p = correlate({
  fixtureId: "vfx-retail-p2p-gravity-reference-node",
  drawParticleCount: 7,
  drawVertexCount: 42,
  drawRecords: p2pArcDrawRecords({ xPositions: [-0.48, -0.42, -0.25, -0.08, 0.12, 0.31, 0.48] }),
  drawParticles: 7,
  components: 7,
  diagnosticCodes: p2pDiagnosticCodes
});
assert.equal(bunchedP2p.visualSemanticChecks.p2pGravityArcPath, true);
assert.equal(bunchedP2p.visualSemanticChecks.p2pGravitySegmentSpacing, false);
assert.equal(bunchedP2p.result, "render-contract-visual-correlation-failed");

const flatAlphaP2p = correlate({
  fixtureId: "vfx-retail-p2p-gravity-reference-node",
  drawParticleCount: 7,
  drawVertexCount: 42,
  drawRecords: p2pArcDrawRecords({ alphaValues: [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7] }),
  drawParticles: 7,
  components: 7,
  diagnosticCodes: p2pDiagnosticCodes
});
assert.equal(flatAlphaP2p.visualSemanticChecks.p2pGravityArcPath, true);
assert.equal(flatAlphaP2p.visualSemanticChecks.p2pGravitySegmentSpacing, true);
assert.equal(flatAlphaP2p.visualSemanticChecks.p2pGravityParticleSizeEnvelope, true);
assert.equal(flatAlphaP2p.visualSemanticChecks.p2pGravityAlphaFade, false);
assert.equal(flatAlphaP2p.result, "render-contract-visual-correlation-failed");

const sizeDriftP2p = correlate({
  fixtureId: "vfx-retail-p2p-gravity-reference-node",
  drawParticleCount: 7,
  drawVertexCount: 42,
  drawRecords: p2pArcDrawRecords({ sizeOverrides: { 3: { x: 0.08, y: 0.09 } } }),
  drawParticles: 7,
  components: 7,
  diagnosticCodes: p2pDiagnosticCodes
});
assert.equal(sizeDriftP2p.visualSemanticChecks.p2pGravityArcPath, true);
assert.equal(sizeDriftP2p.visualSemanticChecks.p2pGravitySegmentSpacing, true);
assert.equal(sizeDriftP2p.visualSemanticChecks.p2pGravityVelocityPath, true);
assert.equal(sizeDriftP2p.visualSemanticChecks.p2pGravityAlphaFade, true);
assert.equal(sizeDriftP2p.visualSemanticChecks.p2pGravityParticleSizeEnvelope, false);
assert.equal(sizeDriftP2p.result, "render-contract-visual-correlation-failed");

const colorOrderDriftP2p = correlate({
  fixtureId: "vfx-retail-p2p-gravity-reference-node",
  drawParticleCount: 7,
  drawVertexCount: 42,
  drawRecords: p2pArcDrawRecords({ invertColors: true }),
  drawParticles: 7,
  components: 7,
  diagnosticCodes: p2pDiagnosticCodes
});
assert.equal(colorOrderDriftP2p.visualSemanticChecks.p2pGravityArcPath, true);
assert.equal(colorOrderDriftP2p.visualSemanticChecks.p2pGravitySegmentSpacing, true);
assert.equal(colorOrderDriftP2p.visualSemanticChecks.p2pGravityVelocityPath, true);
assert.equal(colorOrderDriftP2p.visualSemanticChecks.p2pGravityAlphaFade, true);
assert.equal(colorOrderDriftP2p.visualSemanticChecks.p2pGravityParticleSizeEnvelope, true);
assert.equal(colorOrderDriftP2p.visualSemanticChecks.p2pGravityColorPair, true);
assert.equal(colorOrderDriftP2p.visualSemanticChecks.p2pGravityColorAlternation, false);
assert.equal(colorOrderDriftP2p.result, "render-contract-visual-correlation-failed");

const mode2LightenBlendMode = { enum: "lighten", rawToken: "Mode2_Lighten", modeNumber: 2 };
const mode2DiagnosticCodes = [
  "VFX_PUNCH_MODE2_SOURCE_EVIDENCE_REQUIRED",
  "VFX_DEV_MODE2_LIGHTEN_DIAGNOSTIC_ONLY",
  "VFX_PUNCH_THROUGH_RETAIL_BLEND_DEPTH_REQUIRED",
  "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
  "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
];

const mode2 = correlate({
  fixtureId: "vfx-retail-punch-through-mode2-lighten",
  blendMode: mode2LightenBlendMode,
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: mode2DrawRecords([
    { x: -0.3, y: -0.1 },
    { x: -0.1, y: 0.12 },
    { x: 0.1, y: -0.09 },
    { x: 0.3, y: 0.09 }
  ]),
  drawParticles: 4,
  components: 4,
  diagnosticCodes: mode2DiagnosticCodes
});
assert.equal(mode2.checks.blendModeIsLighten, true);
assert.equal(mode2.checks.blendModeRawTokenIsMode2Lighten, true);
assert.equal(mode2.checks.blendModeNumberIs2, true);
assert.equal(mode2.checks.allDrawRecordsUseLighten, true);
assert.equal(mode2.visualSemanticChecks.mode2LightenDrawShape, true);
assert.equal(mode2.visualSemanticChecks.mode2LightenPath, true);
assert.equal(mode2.visualSemanticChecks.mode2LightenColorAlpha, true);
assert.equal(mode2.visualSemanticChecks.mode2LightenColorAlternation, true);
assert.equal(mode2.visualSemanticChecks.mode2LightenParticleSizeEnvelope, true);
assert.equal(mode2.visualSemanticChecks.mode2LightenBlendMaterial, true);
assert.equal(mode2.visualSemanticChecks.mode2LightenAtlasAndMaterial, true);
assert.equal(mode2.visualSemanticChecks.mode2LightenParticleOrder, true);
assert.equal(mode2.visualSemanticChecks.mode2LightenDiagnosticBoundary, true);
assert.equal(mode2.visualSemanticChecks.mode2LightenFraming, true);
assert.deepEqual(getFailedChecks(mode2), []);

const brokenMode2TwoPoint = correlate({
  fixtureId: "vfx-retail-punch-through-mode2-lighten",
  blendMode: mode2LightenBlendMode,
  drawParticleCount: 2,
  drawVertexCount: 12,
  drawRecords: mode2DrawRecords([
    { x: -0.2, y: 0 },
    { x: 0.2, y: 0 }
  ]),
  drawParticles: 2,
  components: 2,
  diagnosticCodes: mode2DiagnosticCodes
});
assert.equal(brokenMode2TwoPoint.visualSemanticChecks.mode2LightenDrawShape, false);
assert.equal(brokenMode2TwoPoint.visualSemanticChecks.mode2LightenPath, false);
assert.equal(brokenMode2TwoPoint.result, "render-contract-visual-correlation-failed");

const mode2SizeDrift = correlate({
  fixtureId: "vfx-retail-punch-through-mode2-lighten",
  blendMode: mode2LightenBlendMode,
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: mode2DrawRecords([
    { x: -0.3, y: -0.1 },
    { x: -0.1, y: 0.12 },
    { x: 0.1, y: -0.09 },
    { x: 0.3, y: 0.09 }
  ]).map((record, index) => (index === 2 ? { ...record, size: { x: 0.18, y: 0.22 } } : record)),
  drawParticles: 4,
  components: 4,
  diagnosticCodes: mode2DiagnosticCodes
});
assert.equal(mode2SizeDrift.visualSemanticChecks.mode2LightenPath, true);
assert.equal(mode2SizeDrift.visualSemanticChecks.mode2LightenColorAlpha, true);
assert.equal(mode2SizeDrift.visualSemanticChecks.mode2LightenParticleSizeEnvelope, false);
assert.equal(mode2SizeDrift.result, "render-contract-visual-correlation-failed");

const mode2ColorOrderDrift = correlate({
  fixtureId: "vfx-retail-punch-through-mode2-lighten",
  blendMode: mode2LightenBlendMode,
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: mode2DrawRecords([
    { x: -0.3, y: -0.1, color: { r: 1, g: 0.92, b: 0.18 } },
    { x: -0.1, y: 0.12, color: { r: 0.12, g: 0.7, b: 1 } },
    { x: 0.1, y: -0.09, color: { r: 1, g: 0.92, b: 0.18 } },
    { x: 0.3, y: 0.09, color: { r: 0.12, g: 0.7, b: 1 } }
  ]),
  drawParticles: 4,
  components: 4,
  diagnosticCodes: mode2DiagnosticCodes
});
assert.equal(mode2ColorOrderDrift.visualSemanticChecks.mode2LightenPath, true);
assert.equal(mode2ColorOrderDrift.visualSemanticChecks.mode2LightenColorAlpha, true);
assert.equal(mode2ColorOrderDrift.visualSemanticChecks.mode2LightenColorAlternation, false);
assert.equal(mode2ColorOrderDrift.visualSemanticChecks.mode2LightenParticleSizeEnvelope, true);
assert.equal(mode2ColorOrderDrift.visualSemanticChecks.mode2LightenBlendMaterial, true);
assert.equal(mode2ColorOrderDrift.result, "render-contract-visual-correlation-failed");

const mode2StabilityFrameA = correlate({
  fixtureId: "vfx-retail-punch-through-mode2-lighten",
  timeSeconds: 0.45,
  seed: 53,
  blendMode: mode2LightenBlendMode,
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: mode2DrawRecords([
    { x: -0.3, y: -0.1 },
    { x: -0.1, y: 0.12 },
    { x: 0.1, y: -0.09 },
    { x: 0.3, y: 0.09 }
  ]),
  drawParticles: 4,
  components: 4,
  diagnosticCodes: mode2DiagnosticCodes
});
const mode2NextFrame = correlate({
  fixtureId: "vfx-retail-punch-through-mode2-lighten",
  timeSeconds: 0.95,
  seed: 76,
  blendMode: mode2LightenBlendMode,
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: mode2DrawRecords([
    { x: -0.3, y: -0.12 },
    { x: -0.1, y: 0.1 },
    { x: 0.1, y: -0.08 },
    { x: 0.3, y: 0.11 }
  ]),
  drawParticles: 4,
  components: 4,
  diagnosticCodes: mode2DiagnosticCodes
});
const mode2Stability = createMode2LightenStabilityReport([mode2StabilityFrameA, mode2NextFrame]);
assert.equal(mode2Stability.result, "mode2-lighten-two-frame-stability-correlated-local-diagnostic");
assert.deepEqual(getFailedChecks(mode2Stability), []);
assert.equal(mode2Stability.checks.mode2LightenStabilitySemanticChecksEveryFrame, true);
assert.equal(mode2Stability.checks.mode2LightenStabilityPathEveryFrame, true);
assert.equal(mode2Stability.checks.mode2LightenStabilityColorAlternationEveryFrame, true);
assert.equal(mode2Stability.checks.mode2LightenStabilityAlphaFadeEveryFrame, true);
assert.equal(mode2Stability.checks.mode2LightenStabilityParticleSizeEnvelopeEveryFrame, true);
assert.equal(mode2Stability.checks.mode2LightenStabilityBlendMaterialEveryFrame, true);
assert.equal(mode2Stability.checks.mode2LightenStabilityParticleOrderEveryFrame, true);
assert.equal(mode2Stability.checks.mode2LightenStabilityFramingEveryFrame, true);

const brokenMode2NextFrame = correlate({
  fixtureId: "vfx-retail-punch-through-mode2-lighten",
  timeSeconds: 0.95,
  seed: 76,
  blendMode: { enum: "normal", rawToken: "Normal", modeNumber: 0 },
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: [
    drawRecord({ id: 0, x: -0.3, y: -0.12 }),
    drawRecord({ id: 1, x: -0.1, y: 0.1 }),
    drawRecord({ id: 2, x: 0.1, y: -0.08 }),
    drawRecord({ id: 3, x: 0.3, y: 0.11 })
  ],
  drawParticles: 4,
  components: 4,
  diagnosticCodes: mode2DiagnosticCodes
});
assert.deepEqual(getFailedChecks(createMode2LightenStabilityReport([mode2StabilityFrameA, brokenMode2NextFrame])), [
  "mode2LightenStabilitySemanticChecksEveryFrame",
  "mode2LightenStabilityBlendModeStable",
  "mode2LightenStabilityFirstDrawRecordLighten",
  "mode2LightenStabilityLastDrawRecordLighten",
  "mode2LightenStabilityPathEveryFrame",
  "mode2LightenStabilityColorAlternationEveryFrame",
  "mode2LightenStabilityAlphaFadeEveryFrame",
  "mode2LightenStabilityParticleSizeEnvelopeEveryFrame",
  "mode2LightenStabilityBlendMaterialEveryFrame",
  "mode2LightenStabilityParticleOrderEveryFrame",
  "mode2LightenStabilityFramingEveryFrame"
]);

const flatAlphaMode2NextFrame = correlate({
  fixtureId: "vfx-retail-punch-through-mode2-lighten",
  timeSeconds: 0.95,
  seed: 76,
  blendMode: mode2LightenBlendMode,
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: mode2DrawRecords([
    { x: -0.3, y: -0.12 },
    { x: -0.1, y: 0.1 },
    { x: 0.1, y: -0.08 },
    { x: 0.3, y: 0.11 }
  ]).map((record) => ({ ...record, alpha: 0.7 })),
  drawParticles: 4,
  components: 4,
  diagnosticCodes: mode2DiagnosticCodes
});
assert.deepEqual(getFailedChecks(createMode2LightenStabilityReport([mode2StabilityFrameA, flatAlphaMode2NextFrame])), [
  "mode2LightenStabilityAllFramesPassed",
  "mode2LightenStabilitySemanticChecksEveryFrame",
  "mode2LightenStabilityAlphaFadeEveryFrame"
]);

const colorDriftMode2NextFrame = correlate({
  fixtureId: "vfx-retail-punch-through-mode2-lighten",
  timeSeconds: 0.95,
  seed: 76,
  blendMode: mode2LightenBlendMode,
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: mode2DrawRecords([
    { x: -0.3, y: -0.12, color: { r: 1, g: 0.92, b: 0.18 } },
    { x: -0.1, y: 0.1, color: { r: 0.12, g: 0.7, b: 1 } },
    { x: 0.1, y: -0.08, color: { r: 1, g: 0.92, b: 0.18 } },
    { x: 0.3, y: 0.11, color: { r: 0.12, g: 0.7, b: 1 } }
  ]),
  drawParticles: 4,
  components: 4,
  diagnosticCodes: mode2DiagnosticCodes
});
assert.deepEqual(getFailedChecks(createMode2LightenStabilityReport([mode2StabilityFrameA, colorDriftMode2NextFrame])), [
  "mode2LightenStabilityAllFramesPassed",
  "mode2LightenStabilitySemanticChecksEveryFrame",
  "mode2LightenStabilityColorAlternationEveryFrame"
]);

const beam = correlate({
  fixtureId: "vfx-retail-scripted-effectbeam-row-210-body-chest",
  timeSeconds: 0.8,
  seed: 71,
  renderContractSha256: "beam-frame-a",
  drawParticleCount: 5,
  drawVertexCount: 30,
  beamContext: {
    constructorKind: "EffectBeam",
    applicationMode: "object",
    durationType: "temporary",
    durationSeconds: 3,
    targetRef: "retail-beam-target",
    effectorRef: "retail-beam-source",
    bodyNode: "BODY_NODE_CHEST",
    retailBeamVolumeResolved: false
  },
  drawRecords: [
    beamRecord({ id: 0, x: -0.62, y: -0.08 }),
    beamRecord({ id: 1, x: -0.31, y: 0 }),
    beamRecord({ id: 2, x: 0, y: 0.08 }),
    beamRecord({ id: 3, x: 0.31, y: 0.12 }),
    beamRecord({ id: 4, x: 0.62, y: 0.16 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: ["VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED", "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF", "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"]
});
assert.equal(beam.checks.effectBeamContextPreserved, true);
assert.equal(beam.checks.effectBeamBodyNodeChestPreserved, true);
assert.equal(beam.checks.effectBeamRetailVolumeNotResolved, true);
assert.equal(beam.checks.effectBeamStartsAtSourceLeft, true);
assert.equal(beam.checks.effectBeamEndsAtTargetRight, true);
assert.equal(beam.checks.effectBeamSegmentsOrdered, true);
assert.equal(beam.visualSemanticChecks.effectBeamDrawShape, true);
assert.equal(beam.visualSemanticChecks.effectBeamBodyNodeChest, true);
assert.equal(beam.visualSemanticChecks.effectBeamSegmentOrder, true);
assert.equal(beam.visualSemanticChecks.effectBeamSegmentSpacing, true);
assert.equal(beam.visualSemanticChecks.effectBeamAlphaFade, true);
assert.equal(beam.visualSemanticChecks.effectBeamParticleSizeWaist, true);
assert.equal(beam.visualSemanticChecks.effectBeamFireColorPair, true);
assert.equal(beam.visualSemanticChecks.effectBeamFireColorAlternation, true);
assert.equal(beam.visualSemanticChecks.effectBeamAtlasAndMaterial, true);
assert.equal(beam.visualSemanticChecks.effectBeamDiagnosticBoundary, true);
assert.equal(beam.visualSemanticChecks.effectBeamFraming, true);
assert.equal(
  beam.visualSemanticOracle.humanReviewNeeded[0].missingOracle,
  "Retail visual capture/comparison for exact VFX_BEAM_FIRE beam volume, source-target path, BODY_NODE_CHEST anchoring, and temporary EffectBeam row 210 runtime behavior."
);
assert.deepEqual(getFailedChecks(beam), []);

const beamBodyNodeDrift = correlate({
  fixtureId: "vfx-retail-scripted-effectbeam-row-210-body-chest",
  timeSeconds: 0.8,
  seed: 71,
  drawParticleCount: 5,
  drawVertexCount: 30,
  beamContext: {
    constructorKind: "EffectBeam",
    applicationMode: "object",
    durationType: "temporary",
    durationSeconds: 3,
    targetRef: "retail-beam-target",
    effectorRef: "retail-beam-source",
    bodyNode: "BODY_NODE_CHEST",
    retailBeamVolumeResolved: false
  },
  drawRecords: [
    beamRecord({ id: 0, x: -0.62, y: -0.08 }),
    beamRecord({ id: 1, x: -0.31, y: 0 }),
    beamRecord({ id: 2, x: 0, y: 0.08, bodyNode: "BODY_NODE_HEAD" }),
    beamRecord({ id: 3, x: 0.31, y: 0.12 }),
    beamRecord({ id: 4, x: 0.62, y: 0.16 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: ["VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED", "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF", "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"]
});
assert.equal(beamBodyNodeDrift.visualSemanticChecks.effectBeamBodyNodeChest, false);
assert.equal(beamBodyNodeDrift.result, "render-contract-visual-correlation-failed");

const beamBunchedSpacing = correlate({
  fixtureId: "vfx-retail-scripted-effectbeam-row-210-body-chest",
  timeSeconds: 0.8,
  seed: 71,
  drawParticleCount: 5,
  drawVertexCount: 30,
  beamContext: {
    constructorKind: "EffectBeam",
    applicationMode: "object",
    durationType: "temporary",
    durationSeconds: 3,
    targetRef: "retail-beam-target",
    effectorRef: "retail-beam-source",
    bodyNode: "BODY_NODE_CHEST",
    retailBeamVolumeResolved: false
  },
  drawRecords: [
    beamRecord({ id: 0, x: -0.62, y: -0.08 }),
    beamRecord({ id: 1, x: -0.5, y: 0 }),
    beamRecord({ id: 2, x: -0.1, y: 0.08 }),
    beamRecord({ id: 3, x: 0.31, y: 0.12 }),
    beamRecord({ id: 4, x: 0.62, y: 0.16 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: ["VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED", "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF", "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"]
});
assert.equal(beamBunchedSpacing.visualSemanticChecks.effectBeamSegmentOrder, true);
assert.equal(beamBunchedSpacing.visualSemanticChecks.effectBeamSegmentSpacing, false);
assert.equal(beamBunchedSpacing.result, "render-contract-visual-correlation-failed");

const beamFlatAlpha = correlate({
  fixtureId: "vfx-retail-scripted-effectbeam-row-210-body-chest",
  timeSeconds: 0.8,
  seed: 71,
  drawParticleCount: 5,
  drawVertexCount: 30,
  beamContext: {
    constructorKind: "EffectBeam",
    applicationMode: "object",
    durationType: "temporary",
    durationSeconds: 3,
    targetRef: "retail-beam-target",
    effectorRef: "retail-beam-source",
    bodyNode: "BODY_NODE_CHEST",
    retailBeamVolumeResolved: false
  },
  drawRecords: [
    beamRecord({ id: 0, x: -0.62, y: -0.08, alpha: 0.7 }),
    beamRecord({ id: 1, x: -0.31, y: 0, alpha: 0.7 }),
    beamRecord({ id: 2, x: 0, y: 0.08, alpha: 0.7 }),
    beamRecord({ id: 3, x: 0.31, y: 0.12, alpha: 0.7 }),
    beamRecord({ id: 4, x: 0.62, y: 0.16, alpha: 0.7 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: ["VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED", "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF", "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"]
});
assert.equal(beamFlatAlpha.visualSemanticChecks.effectBeamSegmentOrder, true);
assert.equal(beamFlatAlpha.visualSemanticChecks.effectBeamSegmentSpacing, true);
assert.equal(beamFlatAlpha.visualSemanticChecks.effectBeamAlphaFade, false);
assert.equal(beamFlatAlpha.visualSemanticChecks.effectBeamParticleSizeWaist, true);
assert.equal(beamFlatAlpha.result, "render-contract-visual-correlation-failed");

const beamSizeWaistDrift = correlate({
  fixtureId: "vfx-retail-scripted-effectbeam-row-210-body-chest",
  timeSeconds: 0.8,
  seed: 71,
  drawParticleCount: 5,
  drawVertexCount: 30,
  beamContext: {
    constructorKind: "EffectBeam",
    applicationMode: "object",
    durationType: "temporary",
    durationSeconds: 3,
    targetRef: "retail-beam-target",
    effectorRef: "retail-beam-source",
    bodyNode: "BODY_NODE_CHEST",
    retailBeamVolumeResolved: false
  },
  drawRecords: [
    beamRecord({ id: 0, x: -0.62, y: -0.08 }),
    beamRecord({ id: 1, x: -0.31, y: 0 }),
    beamRecord({ id: 2, x: 0, y: 0.08, size: { x: 0.34, y: 0.18 } }),
    beamRecord({ id: 3, x: 0.31, y: 0.12 }),
    beamRecord({ id: 4, x: 0.62, y: 0.16 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: ["VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED", "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF", "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"]
});
assert.equal(beamSizeWaistDrift.visualSemanticChecks.effectBeamSegmentOrder, true);
assert.equal(beamSizeWaistDrift.visualSemanticChecks.effectBeamSegmentSpacing, true);
assert.equal(beamSizeWaistDrift.visualSemanticChecks.effectBeamAlphaFade, true);
assert.equal(beamSizeWaistDrift.visualSemanticChecks.effectBeamParticleSizeWaist, false);
assert.equal(beamSizeWaistDrift.result, "render-contract-visual-correlation-failed");

const beamColorOrderDrift = correlate({
  fixtureId: "vfx-retail-scripted-effectbeam-row-210-body-chest",
  timeSeconds: 0.8,
  seed: 71,
  drawParticleCount: 5,
  drawVertexCount: 30,
  beamContext: {
    constructorKind: "EffectBeam",
    applicationMode: "object",
    durationType: "temporary",
    durationSeconds: 3,
    targetRef: "retail-beam-target",
    effectorRef: "retail-beam-source",
    bodyNode: "BODY_NODE_CHEST",
    retailBeamVolumeResolved: false
  },
  drawRecords: [
    beamRecord({ id: 0, x: -0.62, y: -0.08, color: { r: 1, g: 0.88, b: 0.24 } }),
    beamRecord({ id: 1, x: -0.31, y: 0, color: { r: 1, g: 0.34, b: 0.08 } }),
    beamRecord({ id: 2, x: 0, y: 0.08, color: { r: 1, g: 0.88, b: 0.24 } }),
    beamRecord({ id: 3, x: 0.31, y: 0.12, color: { r: 1, g: 0.34, b: 0.08 } }),
    beamRecord({ id: 4, x: 0.62, y: 0.16, color: { r: 1, g: 0.88, b: 0.24 } })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: ["VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED", "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF", "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"]
});
assert.equal(beamColorOrderDrift.visualSemanticChecks.effectBeamSegmentOrder, true);
assert.equal(beamColorOrderDrift.visualSemanticChecks.effectBeamSegmentSpacing, true);
assert.equal(beamColorOrderDrift.visualSemanticChecks.effectBeamAlphaFade, true);
assert.equal(beamColorOrderDrift.visualSemanticChecks.effectBeamParticleSizeWaist, true);
assert.equal(beamColorOrderDrift.visualSemanticChecks.effectBeamFireColorPair, true);
assert.equal(beamColorOrderDrift.visualSemanticChecks.effectBeamFireColorAlternation, false);
assert.equal(beamColorOrderDrift.result, "render-contract-visual-correlation-failed");

const beamNextFrame = correlate({
  fixtureId: "vfx-retail-scripted-effectbeam-row-210-body-chest",
  timeSeconds: 1.2,
  seed: 72,
  renderContractSha256: "beam-frame-b",
  drawParticleCount: 5,
  drawVertexCount: 30,
  beamContext: {
    constructorKind: "EffectBeam",
    applicationMode: "object",
    durationType: "temporary",
    durationSeconds: 3,
    targetRef: "retail-beam-target",
    effectorRef: "retail-beam-source",
    bodyNode: "BODY_NODE_CHEST",
    retailBeamVolumeResolved: false
  },
  drawRecords: [
    beamRecord({ id: 0, x: -0.62, y: -0.08 }),
    beamRecord({ id: 1, x: -0.31, y: 0.01 }),
    beamRecord({ id: 2, x: 0, y: 0.09 }),
    beamRecord({ id: 3, x: 0.31, y: 0.13 }),
    beamRecord({ id: 4, x: 0.62, y: 0.16 })
  ],
  drawParticles: 5,
  components: 4,
  diagnosticCodes: ["VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED", "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF", "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"]
});
const beamStability = createEffectBeamStabilityReport([beam, beamNextFrame]);
assert.equal(beamStability.result, "effectbeam-two-frame-stability-correlated-local-diagnostic");
assert.deepEqual(getFailedChecks(beamStability), []);

assert.deepEqual(getFailedChecks(createEffectBeamStabilityReport([beam, beamFlatAlpha])), [
  "effectBeamStabilityAllFramesPassed",
  "effectBeamStabilitySemanticChecksEveryFrame",
  "effectBeamStabilityAlphaFadeEveryFrame"
]);

assert.deepEqual(getFailedChecks(createEffectBeamStabilityReport([beam, beamColorOrderDrift])), [
  "effectBeamStabilityAllFramesPassed",
  "effectBeamStabilitySemanticChecksEveryFrame",
  "effectBeamStabilityFireColorAlternationEveryFrame"
]);

const brokenBeamNextFrame = correlate({
  fixtureId: "vfx-retail-scripted-effectbeam-row-210-body-chest",
  timeSeconds: 1.2,
  seed: 72,
  renderContractSha256: "beam-frame-b-broken",
  drawParticleCount: 5,
  drawVertexCount: 30,
  beamContext: {
    constructorKind: "EffectBeam",
    applicationMode: "object",
    durationType: "temporary",
    durationSeconds: 3,
    targetRef: "retail-beam-target",
    effectorRef: "retail-beam-source",
    bodyNode: "BODY_NODE_CHEST",
    retailBeamVolumeResolved: false
  },
  drawRecords: [
    beamRecord({ id: 0, x: -0.5, y: -0.08 }),
    beamRecord({ id: 1, x: -0.2, y: 0.01 }),
    beamRecord({ id: 2, x: 0, y: 0.09 }),
    beamRecord({ id: 3, x: 0.31, y: 0.13 }),
    beamRecord({ id: 4, x: 0.62, y: 0.16 })
  ],
  drawParticles: 5,
  components: 4,
  diagnosticCodes: ["VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED", "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF", "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"]
});
assert.deepEqual(getFailedChecks(createEffectBeamStabilityReport([beam, brokenBeamNextFrame])), [
  "effectBeamStabilityAllFramesPassed",
  "effectBeamStabilitySemanticChecksEveryFrame",
  "effectBeamStabilitySourceAnchorStable",
  "effectBeamStabilitySegmentSpacingEveryFrame"
]);

const fountainAtlas = correlate({
  fixtureId: "vfx-retail-fountain-atlas-cot-fx01",
  drawParticleCount: 6,
  drawVertexCount: 36,
  fountainAtlas: {
    emitterType: "Fountain",
    textureRef: "fx_canonical_fire",
    xgrid: 4,
    ygrid: 4,
    fps: 12,
    frameStart: 0,
    frameEnd: 15,
    randomFrameStart: true,
    retailPlaybackResolved: false
  },
  drawRecords: [
    drawRecord({ id: 0, x: -0.2, y: -0.2, fountainAtlas: true, atlasFrameIndex: 3 }),
    drawRecord({ id: 1, x: 0.1, y: -0.1, fountainAtlas: true, atlasFrameIndex: 6 }),
    drawRecord({ id: 2, x: -0.2, y: 0, fountainAtlas: true, atlasFrameIndex: 9 }),
    drawRecord({ id: 3, x: 0.16, y: 0.07, fountainAtlas: true, atlasFrameIndex: 12 }),
    drawRecord({ id: 4, x: -0.04, y: 0.11, fountainAtlas: true, atlasFrameIndex: 15 }),
    drawRecord({ id: 5, x: 0.21, y: 0.14, fountainAtlas: true, atlasFrameIndex: 2 })
  ],
  drawParticles: 6,
  components: 5
});
assert.equal(fountainAtlas.checks.fountainAtlasContextPreserved, true);
assert.equal(fountainAtlas.checks.fountainAtlasFrameRangePreserved, true);
assert.equal(fountainAtlas.checks.fountainAtlasRetailPlaybackNotResolved, true);
assert.equal(fountainAtlas.checks.fountainAtlasDrawRecordsHaveGrid, true);
assert.equal(fountainAtlas.checks.fountainAtlasFrameIndexesInRange, true);
assert.equal(fountainAtlas.checks.fountainAtlasUsesMultipleFrames, true);
assert.equal(fountainAtlas.checks.fountainAtlasMaterialOffsetBlocked, true);
assert.equal(fountainAtlas.visualSemanticChecks.fountainAtlasDrawShape, true);
assert.equal(fountainAtlas.visualSemanticChecks.fountainAtlasGridAndFrameRange, true);
assert.equal(fountainAtlas.visualSemanticChecks.fountainAtlasFramePlayback, true);
assert.equal(fountainAtlas.visualSemanticChecks.fountainAtlasTrajectory, true);
assert.equal(fountainAtlas.visualSemanticChecks.fountainAtlasUvGrid, true);
assert.equal(fountainAtlas.visualSemanticChecks.fountainAtlasParticleOrder, true);
assert.equal(fountainAtlas.visualSemanticChecks.fountainAtlasAlphaFade, true);
assert.equal(fountainAtlas.visualSemanticChecks.fountainAtlasParticleSizeEnvelope, true);
assert.equal(fountainAtlas.visualSemanticChecks.fountainAtlasAtlasAndMaterial, true);
assert.equal(fountainAtlas.visualSemanticChecks.fountainAtlasDiagnosticBoundary, true);
assert.equal(fountainAtlas.visualSemanticChecks.fountainAtlasFraming, true);
assert.deepEqual(getFailedChecks(fountainAtlas), []);

const brokenFountainAtlas = correlate({
  fixtureId: "vfx-retail-fountain-atlas-cot-fx01",
  drawParticleCount: 2,
  drawVertexCount: 12,
  fountainAtlas: {
    emitterType: "Fountain",
    textureRef: "fx_canonical_fire",
    xgrid: 4,
    ygrid: 4,
    fps: 12,
    frameStart: 0,
    frameEnd: 15,
    randomFrameStart: true,
    retailPlaybackResolved: false
  },
  drawRecords: [
    drawRecord({ id: 0, x: -0.2, y: -0.2, fountainAtlas: true, atlasFrameIndex: 3 }),
    drawRecord({
      id: 1,
      x: 0.1,
      y: -0.1,
      fountainAtlas: true,
      atlasFrameIndex: 6,
      atlasGrid: { x: 2, y: 2 }
    })
  ],
  drawParticles: 2,
  components: 2
});
assert.deepEqual(getFailedChecks(brokenFountainAtlas), [
  "fountainAtlasDrawRecordsHaveGrid",
  "fountainAtlasUsesMultipleFrames"
]);
assert.equal(brokenFountainAtlas.visualSemanticChecks.fountainAtlasDrawShape, false);
assert.equal(brokenFountainAtlas.visualSemanticChecks.fountainAtlasFramePlayback, false);

const fountainAtlasFrameCollapse = correlate({
  fixtureId: "vfx-retail-fountain-atlas-cot-fx01",
  drawParticleCount: 6,
  drawVertexCount: 36,
  fountainAtlas: {
    emitterType: "Fountain",
    textureRef: "fx_canonical_fire",
    xgrid: 4,
    ygrid: 4,
    fps: 12,
    frameStart: 0,
    frameEnd: 15,
    randomFrameStart: true,
    retailPlaybackResolved: false
  },
  drawRecords: [
    drawRecord({ id: 0, x: -0.2, y: -0.2, fountainAtlas: true, atlasFrameIndex: 4 }),
    drawRecord({ id: 1, x: 0.1, y: -0.1, fountainAtlas: true, atlasFrameIndex: 4 }),
    drawRecord({ id: 2, x: -0.2, y: 0, fountainAtlas: true, atlasFrameIndex: 4 }),
    drawRecord({ id: 3, x: 0.16, y: 0.07, fountainAtlas: true, atlasFrameIndex: 4 }),
    drawRecord({ id: 4, x: -0.04, y: 0.11, fountainAtlas: true, atlasFrameIndex: 4 }),
    drawRecord({ id: 5, x: 0.21, y: 0.14, fountainAtlas: true, atlasFrameIndex: 4 })
  ],
  drawParticles: 6,
  components: 5
});
assert.equal(fountainAtlasFrameCollapse.visualSemanticChecks.fountainAtlasFramePlayback, false);

const fountainAtlasTrajectoryCollapse = correlate({
  fixtureId: "vfx-retail-fountain-atlas-cot-fx01",
  drawParticleCount: 6,
  drawVertexCount: 36,
  fountainAtlas: {
    emitterType: "Fountain",
    textureRef: "fx_canonical_fire",
    xgrid: 4,
    ygrid: 4,
    fps: 12,
    frameStart: 0,
    frameEnd: 15,
    randomFrameStart: true,
    retailPlaybackResolved: false
  },
  drawRecords: [
    drawRecord({ id: 0, x: -0.2, y: -0.1, fountainAtlas: true, atlasFrameIndex: 3 }),
    drawRecord({ id: 1, x: 0.1, y: -0.1, fountainAtlas: true, atlasFrameIndex: 6 }),
    drawRecord({ id: 2, x: -0.2, y: -0.1, fountainAtlas: true, atlasFrameIndex: 9 }),
    drawRecord({ id: 3, x: 0.16, y: -0.1, fountainAtlas: true, atlasFrameIndex: 12 }),
    drawRecord({ id: 4, x: -0.04, y: -0.1, fountainAtlas: true, atlasFrameIndex: 15 }),
    drawRecord({ id: 5, x: 0.21, y: -0.1, fountainAtlas: true, atlasFrameIndex: 2 })
  ],
  drawParticles: 6,
  components: 5
});
assert.equal(fountainAtlasTrajectoryCollapse.visualSemanticChecks.fountainAtlasFramePlayback, true);
assert.equal(fountainAtlasTrajectoryCollapse.visualSemanticChecks.fountainAtlasUvGrid, true);
assert.equal(fountainAtlasTrajectoryCollapse.visualSemanticChecks.fountainAtlasTrajectory, false);
assert.equal(fountainAtlasTrajectoryCollapse.result, "render-contract-visual-correlation-failed");

const flatAlphaFountainAtlas = correlate({
  fixtureId: "vfx-retail-fountain-atlas-cot-fx01",
  drawParticleCount: 6,
  drawVertexCount: 36,
  fountainAtlas: {
    emitterType: "Fountain",
    textureRef: "fx_canonical_fire",
    xgrid: 4,
    ygrid: 4,
    fps: 12,
    frameStart: 0,
    frameEnd: 15,
    randomFrameStart: true,
    retailPlaybackResolved: false
  },
  drawRecords: [
    drawRecord({ id: 0, x: -0.2, y: -0.2, fountainAtlas: true, atlasFrameIndex: 3, alpha: 0.7 }),
    drawRecord({ id: 1, x: 0.1, y: -0.1, fountainAtlas: true, atlasFrameIndex: 6, alpha: 0.7 }),
    drawRecord({ id: 2, x: -0.2, y: 0, fountainAtlas: true, atlasFrameIndex: 9, alpha: 0.7 }),
    drawRecord({ id: 3, x: 0.16, y: 0.07, fountainAtlas: true, atlasFrameIndex: 12, alpha: 0.7 }),
    drawRecord({ id: 4, x: -0.04, y: 0.11, fountainAtlas: true, atlasFrameIndex: 15, alpha: 0.7 }),
    drawRecord({ id: 5, x: 0.21, y: 0.14, fountainAtlas: true, atlasFrameIndex: 2, alpha: 0.7 })
  ],
  drawParticles: 6,
  components: 5
});
assert.equal(flatAlphaFountainAtlas.visualSemanticChecks.fountainAtlasFramePlayback, true);
assert.equal(flatAlphaFountainAtlas.visualSemanticChecks.fountainAtlasTrajectory, true);
assert.equal(flatAlphaFountainAtlas.visualSemanticChecks.fountainAtlasUvGrid, true);
assert.equal(flatAlphaFountainAtlas.visualSemanticChecks.fountainAtlasAlphaFade, false);
assert.equal(flatAlphaFountainAtlas.visualSemanticChecks.fountainAtlasParticleSizeEnvelope, true);
assert.equal(flatAlphaFountainAtlas.result, "render-contract-visual-correlation-failed");

const sizeDriftFountainAtlas = correlate({
  fixtureId: "vfx-retail-fountain-atlas-cot-fx01",
  drawParticleCount: 6,
  drawVertexCount: 36,
  fountainAtlas: {
    emitterType: "Fountain",
    textureRef: "fx_canonical_fire",
    xgrid: 4,
    ygrid: 4,
    fps: 12,
    frameStart: 0,
    frameEnd: 15,
    randomFrameStart: true,
    retailPlaybackResolved: false
  },
  drawRecords: [
    drawRecord({ id: 0, x: -0.2, y: -0.2, fountainAtlas: true, atlasFrameIndex: 3, size: { x: 0.18, y: 0.24 } }),
    drawRecord({ id: 1, x: 0.1, y: -0.1, fountainAtlas: true, atlasFrameIndex: 6 }),
    drawRecord({ id: 2, x: -0.2, y: 0, fountainAtlas: true, atlasFrameIndex: 9 }),
    drawRecord({ id: 3, x: 0.16, y: 0.07, fountainAtlas: true, atlasFrameIndex: 12 }),
    drawRecord({ id: 4, x: -0.04, y: 0.11, fountainAtlas: true, atlasFrameIndex: 15 }),
    drawRecord({ id: 5, x: 0.21, y: 0.14, fountainAtlas: true, atlasFrameIndex: 2 })
  ],
  drawParticles: 6,
  components: 5
});
assert.equal(sizeDriftFountainAtlas.visualSemanticChecks.fountainAtlasFramePlayback, true);
assert.equal(sizeDriftFountainAtlas.visualSemanticChecks.fountainAtlasTrajectory, true);
assert.equal(sizeDriftFountainAtlas.visualSemanticChecks.fountainAtlasAlphaFade, true);
assert.equal(sizeDriftFountainAtlas.visualSemanticChecks.fountainAtlasParticleSizeEnvelope, false);
assert.equal(sizeDriftFountainAtlas.result, "render-contract-visual-correlation-failed");

const fountainProgressionFrameA = fountainProgressionFrame({
  timeSeconds: 0.65,
  seed: 74,
  frameIndexes: [11, 14, 1, 4, 7, 10]
});
const fountainProgressionFrameB = fountainProgressionFrame({
  timeSeconds: 1.05,
  seed: 75,
  frameIndexes: [4, 7, 10, 13, 0, 3]
});
const fountainProgression = createFountainAtlasProgressionReport([
  fountainProgressionFrameA,
  fountainProgressionFrameB
]);
assert.equal(
  fountainProgression.result,
  "fountain-atlas-two-frame-progression-correlated-local-diagnostic"
);
assert.deepEqual(getFailedChecks(fountainProgression), []);

const flatAlphaFountainProgressionFrame = structuredClone(fountainProgressionFrameB);
flatAlphaFountainProgressionFrame.correlation.frameStatus.renderedAlpha = [0.7, 0.7, 0.7, 0.7, 0.7, 0.7];
flatAlphaFountainProgressionFrame.correlation.visualSemanticChecks.fountainAtlasAlphaFade = false;
flatAlphaFountainProgressionFrame.correlation.result = "render-contract-visual-correlation-failed";
const flatAlphaFountainProgression = createFountainAtlasProgressionReport([
  fountainProgressionFrameA,
  flatAlphaFountainProgressionFrame
]);
assert.deepEqual(getFailedChecks(flatAlphaFountainProgression), [
  "fountainAtlasProgressionAllFramesPassed",
  "fountainAtlasProgressionSemanticChecksEveryFrame",
  "fountainAtlasProgressionAlphaFadeEveryFrame"
]);

const brokenFountainProgression = createFountainAtlasProgressionReport([
  fountainProgressionFrameA,
  fountainProgressionFrame({
    timeSeconds: 1.05,
    seed: 75,
    frameIndexes: [11, 14, 1, 4, 7, 10]
  })
]);
assert.deepEqual(getFailedChecks(brokenFountainProgression), [
  "fountainAtlasProgressionFrameIndexesAdvanceAcrossFrames"
]);

const pltDiagnosticCodes = [
  "VFX_PLT_LAYER_COLOR_SOURCE_EVIDENCE_REQUIRED",
  "VFX_DEV_PLT_LAYER_COLORS_DIAGNOSTIC_ONLY",
  "VFX_PLT_RETAIL_LAYER_PALETTE_REQUIRED",
  "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
  "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
];

const pltAtlasFrameIndex = (id) => (10 + id * 3) % 16;
const atlasUvForFrame = (frameIndex) => {
  const column = frameIndex % 4;
  const row = Math.floor(frameIndex / 4);
  return {
    u0: column * 0.25,
    v0: row * 0.25,
    u1: column * 0.25 + 0.25,
    v1: row * 0.25 + 0.25,
    frameIndex,
    rawFrameIndex: frameIndex,
    mapping: "row_major_top_down_v"
  };
};
const pltRecord = (args) =>
  drawRecord({
    alpha: 0.78 - args.id * (0.28 / 3),
    size: { x: 0.18, y: 0.28 },
    atlasFrameIndex: pltAtlasFrameIndex(args.id),
    atlasUv: atlasUvForFrame(args.atlasFrameIndex ?? pltAtlasFrameIndex(args.id)),
    ...args
  });

const plt = correlate({
  fixtureId: "vfx-retail-plt-known-layer-colors",
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: [
    pltRecord({ id: 0, x: -0.3, y: 0, color: { r: 1, g: 0.66, b: 0.42 }, pltLayer: "skin" }),
    pltRecord({ id: 1, x: -0.1, y: 0, color: { r: 0.18, g: 0.12, b: 0.06 }, pltLayer: "hair" }),
    pltRecord({ id: 2, x: 0.1, y: 0, color: { r: 0.08, g: 0.54, b: 1 }, pltLayer: "cloth1" }),
    pltRecord({ id: 3, x: 0.3, y: 0, color: { r: 0.82, g: 0.12, b: 0.9 }, pltLayer: "cloth2" })
  ],
  drawParticles: 4,
  components: 4,
  diagnosticCodes: pltDiagnosticCodes
});
assert.equal(plt.checks.pltLayerCountMatchesDrawRecords, true);
assert.equal(plt.checks.pltRequiredLayersPresent, true);
assert.equal(plt.checks.pltLayerColorsAreDistinct, true);
assert.equal(plt.visualSemanticChecks.pltLayerDrawShape, true);
assert.equal(plt.visualSemanticChecks.pltLayerPaletteOrder, true);
assert.equal(plt.visualSemanticChecks.pltLayerColorVectors, true);
assert.equal(plt.visualSemanticChecks.pltLayerOpacity, true);
assert.equal(plt.visualSemanticChecks.pltLayerParticleSizeEnvelope, true);
assert.equal(plt.visualSemanticChecks.pltLayerAtlasFrameOrder, true);
assert.equal(plt.visualSemanticChecks.pltLayerUvRectGrid, true);
assert.equal(plt.visualSemanticChecks.pltLayerSpatialOrder, true);
assert.equal(plt.visualSemanticChecks.pltLayerMaterialAndAtlas, true);
assert.equal(plt.visualSemanticChecks.pltLayerDiagnosticBoundary, true);
assert.equal(plt.visualSemanticChecks.pltLayerFraming, true);
assert.deepEqual(getFailedChecks(plt), []);

const pltNextFrame = correlate({
  fixtureId: "vfx-retail-plt-known-layer-colors",
  timeSeconds: 0.95,
  seed: 77,
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: [
    pltRecord({ id: 0, x: -0.3, y: 0, color: { r: 1, g: 0.66, b: 0.42 }, pltLayer: "skin" }),
    pltRecord({ id: 1, x: -0.1, y: 0, color: { r: 0.18, g: 0.12, b: 0.06 }, pltLayer: "hair" }),
    pltRecord({ id: 2, x: 0.1, y: 0, color: { r: 0.08, g: 0.54, b: 1 }, pltLayer: "cloth1" }),
    pltRecord({ id: 3, x: 0.3, y: 0, color: { r: 0.82, g: 0.12, b: 0.9 }, pltLayer: "cloth2" })
  ],
  drawParticles: 4,
  components: 4,
  diagnosticCodes: pltDiagnosticCodes
});
const pltStability = createPltLayerColorStabilityReport([plt, pltNextFrame]);
assert.equal(pltStability.result, "plt-layer-color-two-frame-stability-correlated-local-diagnostic");
assert.equal(pltStability.checks.pltLayerColorStabilitySemanticChecksEveryFrame, true);
assert.equal(pltStability.checks.pltLayerColorStabilityPaletteOrderEveryFrame, true);
assert.equal(pltStability.checks.pltLayerColorStabilityColorVectorsEveryFrame, true);
assert.equal(pltStability.checks.pltLayerColorStabilityOpacityEveryFrame, true);
assert.equal(pltStability.checks.pltLayerColorStabilityParticleSizeEnvelopeEveryFrame, true);
assert.equal(pltStability.checks.pltLayerColorStabilityAtlasFrameOrderEveryFrame, true);
assert.equal(pltStability.checks.pltLayerColorStabilityUvRectGridEveryFrame, true);
assert.equal(pltStability.checks.pltLayerColorStabilitySpatialOrderEveryFrame, true);
assert.equal(pltStability.checks.pltLayerColorStabilityMaterialAndAtlasEveryFrame, true);
assert.equal(pltStability.checks.pltLayerColorStabilityFramingEveryFrame, true);
assert.equal(pltStability.checks.pltLayerColorStabilityUvRectCountStable, true);
assert.equal(pltStability.checks.pltLayerColorStabilityUvRectsInsideUnitRangeEveryFrame, true);
assert.equal(pltStability.checks.pltLayerColorStabilityUvRectsQuarterGridEveryFrame, true);
assert.deepEqual(getFailedChecks(pltStability), []);

const brokenPltNextFrame = correlate({
  fixtureId: "vfx-retail-plt-known-layer-colors",
  timeSeconds: 0.95,
  seed: 77,
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: [
    pltRecord({ id: 0, x: -0.3, y: 0, color: { r: 0.18, g: 0.12, b: 0.06 }, pltLayer: "skin" }),
    pltRecord({ id: 1, x: -0.1, y: 0, color: { r: 1, g: 0.66, b: 0.42 }, pltLayer: "hair" }),
    pltRecord({ id: 2, x: 0.1, y: 0, color: { r: 0.08, g: 0.54, b: 1 }, pltLayer: "cloth1" }),
    pltRecord({ id: 3, x: 0.3, y: 0, color: { r: 0.82, g: 0.12, b: 0.9 }, pltLayer: "cloth2" })
  ],
  drawParticles: 4,
  components: 4,
  diagnosticCodes: pltDiagnosticCodes
});
assert.deepEqual(getFailedChecks(createPltLayerColorStabilityReport([plt, brokenPltNextFrame])), [
  "pltLayerColorStabilityLayerColorMappingStable"
]);

const brokenPltSpatialOrder = correlate({
  fixtureId: "vfx-retail-plt-known-layer-colors",
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: [
    pltRecord({ id: 0, x: -0.3, y: 0, color: { r: 1, g: 0.66, b: 0.42 }, pltLayer: "skin" }),
    pltRecord({ id: 1, x: 0.2, y: 0, color: { r: 0.18, g: 0.12, b: 0.06 }, pltLayer: "hair" }),
    pltRecord({ id: 2, x: 0.1, y: 0, color: { r: 0.08, g: 0.54, b: 1 }, pltLayer: "cloth1" }),
    pltRecord({ id: 3, x: 0.3, y: 0, color: { r: 0.82, g: 0.12, b: 0.9 }, pltLayer: "cloth2" })
  ],
  drawParticles: 4,
  components: 4,
  diagnosticCodes: pltDiagnosticCodes
});
assert.equal(brokenPltSpatialOrder.visualSemanticChecks.pltLayerPaletteOrder, true);
assert.equal(brokenPltSpatialOrder.visualSemanticChecks.pltLayerColorVectors, true);
assert.equal(brokenPltSpatialOrder.visualSemanticChecks.pltLayerOpacity, true);
assert.equal(brokenPltSpatialOrder.visualSemanticChecks.pltLayerSpatialOrder, false);
assert.deepEqual(getFailedChecks(createPltLayerColorStabilityReport([plt, brokenPltSpatialOrder])), [
  "pltLayerColorStabilityAllFramesPassed",
  "pltLayerColorStabilitySemanticChecksEveryFrame",
  "pltLayerColorStabilitySpatialOrderEveryFrame"
]);

const brokenPltOpacity = correlate({
  fixtureId: "vfx-retail-plt-known-layer-colors",
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: [
    pltRecord({ id: 0, x: -0.3, y: 0, color: { r: 1, g: 0.66, b: 0.42 }, pltLayer: "skin" }),
    pltRecord({ id: 1, x: -0.1, y: 0, alpha: 0.5, color: { r: 0.18, g: 0.12, b: 0.06 }, pltLayer: "hair" }),
    pltRecord({ id: 2, x: 0.1, y: 0, color: { r: 0.08, g: 0.54, b: 1 }, pltLayer: "cloth1" }),
    pltRecord({ id: 3, x: 0.3, y: 0, color: { r: 0.82, g: 0.12, b: 0.9 }, pltLayer: "cloth2" })
  ],
  drawParticles: 4,
  components: 4,
  diagnosticCodes: pltDiagnosticCodes
});
assert.equal(brokenPltOpacity.visualSemanticChecks.pltLayerPaletteOrder, true);
assert.equal(brokenPltOpacity.visualSemanticChecks.pltLayerColorVectors, true);
assert.equal(brokenPltOpacity.visualSemanticChecks.pltLayerOpacity, false);
assert.equal(brokenPltOpacity.result, "render-contract-visual-correlation-failed");
assert.deepEqual(getFailedChecks(createPltLayerColorStabilityReport([plt, brokenPltOpacity])), [
  "pltLayerColorStabilityAllFramesPassed",
  "pltLayerColorStabilitySemanticChecksEveryFrame",
  "pltLayerColorStabilityOpacityEveryFrame"
]);

const brokenPltParticleSize = correlate({
  fixtureId: "vfx-retail-plt-known-layer-colors",
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: [
    pltRecord({ id: 0, x: -0.3, y: 0, color: { r: 1, g: 0.66, b: 0.42 }, pltLayer: "skin" }),
    pltRecord({
      id: 1,
      x: -0.1,
      y: 0,
      size: { x: 0.22, y: 0.28 },
      color: { r: 0.18, g: 0.12, b: 0.06 },
      pltLayer: "hair"
    }),
    pltRecord({ id: 2, x: 0.1, y: 0, color: { r: 0.08, g: 0.54, b: 1 }, pltLayer: "cloth1" }),
    pltRecord({ id: 3, x: 0.3, y: 0, color: { r: 0.82, g: 0.12, b: 0.9 }, pltLayer: "cloth2" })
  ],
  drawParticles: 4,
  components: 4,
  diagnosticCodes: pltDiagnosticCodes
});
assert.equal(brokenPltParticleSize.visualSemanticChecks.pltLayerPaletteOrder, true);
assert.equal(brokenPltParticleSize.visualSemanticChecks.pltLayerColorVectors, true);
assert.equal(brokenPltParticleSize.visualSemanticChecks.pltLayerParticleSizeEnvelope, false);
assert.equal(brokenPltParticleSize.result, "render-contract-visual-correlation-failed");
assert.deepEqual(getFailedChecks(createPltLayerColorStabilityReport([plt, brokenPltParticleSize])), [
  "pltLayerColorStabilityAllFramesPassed",
  "pltLayerColorStabilitySemanticChecksEveryFrame",
  "pltLayerColorStabilityParticleSizeEnvelopeEveryFrame"
]);

const brokenPltAtlasFrameOrder = correlate({
  fixtureId: "vfx-retail-plt-known-layer-colors",
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: [
    pltRecord({ id: 0, x: -0.3, y: 0, color: { r: 1, g: 0.66, b: 0.42 }, pltLayer: "skin" }),
    pltRecord({
      id: 1,
      x: -0.1,
      y: 0,
      atlasFrameIndex: 10,
      color: { r: 0.18, g: 0.12, b: 0.06 },
      pltLayer: "hair"
    }),
    pltRecord({ id: 2, x: 0.1, y: 0, color: { r: 0.08, g: 0.54, b: 1 }, pltLayer: "cloth1" }),
    pltRecord({ id: 3, x: 0.3, y: 0, color: { r: 0.82, g: 0.12, b: 0.9 }, pltLayer: "cloth2" })
  ],
  drawParticles: 4,
  components: 4,
  diagnosticCodes: pltDiagnosticCodes
});
assert.equal(brokenPltAtlasFrameOrder.visualSemanticChecks.pltLayerPaletteOrder, true);
assert.equal(brokenPltAtlasFrameOrder.visualSemanticChecks.pltLayerColorVectors, true);
assert.equal(brokenPltAtlasFrameOrder.visualSemanticChecks.pltLayerParticleSizeEnvelope, true);
assert.equal(brokenPltAtlasFrameOrder.visualSemanticChecks.pltLayerAtlasFrameOrder, false);
assert.equal(brokenPltAtlasFrameOrder.result, "render-contract-visual-correlation-failed");
assert.deepEqual(getFailedChecks(createPltLayerColorStabilityReport([plt, brokenPltAtlasFrameOrder])), [
  "pltLayerColorStabilityAllFramesPassed",
  "pltLayerColorStabilitySemanticChecksEveryFrame",
  "pltLayerColorStabilityAtlasFrameOrderEveryFrame"
]);

const brokenPltUvRectGrid = correlate({
  fixtureId: "vfx-retail-plt-known-layer-colors",
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: [
    pltRecord({ id: 0, x: -0.3, y: 0, color: { r: 1, g: 0.66, b: 0.42 }, pltLayer: "skin" }),
    pltRecord({
      id: 1,
      x: -0.1,
      y: 0,
      atlasUv: { ...atlasUvForFrame(pltAtlasFrameIndex(1)), u0: 0, v0: 0, u1: 0.25, v1: 0.25 },
      color: { r: 0.18, g: 0.12, b: 0.06 },
      pltLayer: "hair"
    }),
    pltRecord({ id: 2, x: 0.1, y: 0, color: { r: 0.08, g: 0.54, b: 1 }, pltLayer: "cloth1" }),
    pltRecord({ id: 3, x: 0.3, y: 0, color: { r: 0.82, g: 0.12, b: 0.9 }, pltLayer: "cloth2" })
  ],
  drawParticles: 4,
  components: 4,
  diagnosticCodes: pltDiagnosticCodes
});
assert.equal(brokenPltUvRectGrid.visualSemanticChecks.pltLayerPaletteOrder, true);
assert.equal(brokenPltUvRectGrid.visualSemanticChecks.pltLayerAtlasFrameOrder, true);
assert.equal(brokenPltUvRectGrid.visualSemanticChecks.pltLayerUvRectGrid, false);
assert.equal(brokenPltUvRectGrid.result, "render-contract-visual-correlation-failed");
assert.deepEqual(getFailedChecks(createPltLayerColorStabilityReport([plt, brokenPltUvRectGrid])), [
  "pltLayerColorStabilityAllFramesPassed",
  "pltLayerColorStabilitySemanticChecksEveryFrame",
  "pltLayerColorStabilityUvRectGridEveryFrame"
]);

const brokenPltDuplicateColors = correlate({
  fixtureId: "vfx-retail-plt-known-layer-colors",
  drawParticleCount: 4,
  drawVertexCount: 24,
  drawRecords: [
    pltRecord({ id: 0, x: -0.3, y: 0, color: { r: 1, g: 0.66, b: 0.42 }, pltLayer: "skin" }),
    pltRecord({ id: 1, x: -0.1, y: 0, color: { r: 1, g: 0.66, b: 0.42 }, pltLayer: "hair" }),
    pltRecord({ id: 2, x: 0.1, y: 0, color: { r: 0.08, g: 0.54, b: 1 }, pltLayer: "cloth1" }),
    pltRecord({ id: 3, x: 0.3, y: 0, color: { r: 0.82, g: 0.12, b: 0.9 }, pltLayer: "cloth2" })
  ],
  drawParticles: 4,
  components: 4,
  diagnosticCodes: pltDiagnosticCodes
});
assert.equal(brokenPltDuplicateColors.visualSemanticChecks.pltLayerColorVectors, false);

const linkedChainDiagnosticCodes = [
  "VFX_LINKED_CHAIN_SOURCE_EVIDENCE_REQUIRED",
  "VFX_DEV_LINKED_CHAIN_DIAGNOSTIC_ONLY",
  "VFX_LINKED_CHAIN_RETAIL_SEGMENT_BUFFER_REQUIRED",
  "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
  "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
];

const linkedChain = correlate({
  fixtureId: "vfx-retail-linked-chain",
  drawLane: "linked_textured_quad",
  drawParticleCount: 5,
  drawVertexCount: 24,
  drawRecords: [
    linkedRecord({ id: 0, x: -0.4, y: 0 }),
    linkedRecord({ id: 1, x: -0.2, y: 0.1 }),
    linkedRecord({ id: 2, x: 0, y: 0.15 }),
    linkedRecord({ id: 3, x: 0.2, y: 0.1 }),
    linkedRecord({ id: 4, x: 0.4, y: 0 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: linkedChainDiagnosticCodes
});
assert.equal(linkedChain.checks.linkedLanePreserved, true);
assert.equal(
  linkedChain.checks.linkedRenderedDrawRecordIndexAttributeBucketsMatchVerticesPerParticle,
  true
);
assert.equal(linkedChain.checks.linkedRenderedDiagnosticCodesIncludeSegmentBufferBoundary, true);
assert.equal(linkedChain.visualSemanticChecks.linkedChainDrawShape, true);
assert.equal(linkedChain.visualSemanticChecks.linkedChainPathOrder, true);
assert.equal(linkedChain.visualSemanticChecks.linkedChainSegmentSpacing, true);
assert.equal(linkedChain.visualSemanticChecks.linkedChainParticleOrder, true);
assert.equal(linkedChain.visualSemanticChecks.linkedChainColorPair, true);
assert.equal(linkedChain.visualSemanticChecks.linkedChainColorAlternation, true);
assert.equal(linkedChain.visualSemanticChecks.linkedChainAlphaFade, true);
assert.equal(linkedChain.visualSemanticChecks.linkedChainParticleSizeEnvelope, true);
assert.equal(linkedChain.visualSemanticChecks.linkedChainAtlasAndMaterial, true);
assert.equal(linkedChain.visualSemanticChecks.linkedChainDiagnosticBoundary, true);
assert.equal(linkedChain.visualSemanticChecks.linkedChainFraming, true);
assert.deepEqual(getFailedChecks(linkedChain), []);

const bunchedLinkedChain = correlate({
  fixtureId: "vfx-retail-linked-chain",
  drawLane: "linked_textured_quad",
  drawParticleCount: 5,
  drawVertexCount: 24,
  drawRecords: [
    linkedRecord({ id: 0, x: -0.4, y: 0 }),
    linkedRecord({ id: 1, x: -0.35, y: 0.1 }),
    linkedRecord({ id: 2, x: -0.05, y: 0.15 }),
    linkedRecord({ id: 3, x: 0.2, y: 0.1 }),
    linkedRecord({ id: 4, x: 0.4, y: 0 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: linkedChainDiagnosticCodes
});
assert.equal(bunchedLinkedChain.visualSemanticChecks.linkedChainPathOrder, true);
assert.equal(bunchedLinkedChain.visualSemanticChecks.linkedChainSegmentSpacing, false);
assert.equal(bunchedLinkedChain.result, "render-contract-visual-correlation-failed");

const brokenLinkedChainColorAlternation = correlate({
  fixtureId: "vfx-retail-linked-chain",
  drawLane: "linked_textured_quad",
  drawParticleCount: 5,
  drawVertexCount: 24,
  drawRecords: [
    linkedRecord({ id: 0, x: -0.4, y: 0 }),
    linkedRecord({ id: 2, x: -0.2, y: 0.1 }),
    linkedRecord({ id: 1, x: 0, y: 0.15 }),
    linkedRecord({ id: 3, x: 0.2, y: 0.1 }),
    linkedRecord({ id: 4, x: 0.4, y: 0 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: linkedChainDiagnosticCodes
});
assert.equal(brokenLinkedChainColorAlternation.visualSemanticChecks.linkedChainColorPair, true);
assert.equal(brokenLinkedChainColorAlternation.visualSemanticChecks.linkedChainColorAlternation, false);
assert.equal(brokenLinkedChainColorAlternation.result, "render-contract-visual-correlation-failed");

const flatAlphaLinkedChain = correlate({
  fixtureId: "vfx-retail-linked-chain",
  drawLane: "linked_textured_quad",
  drawParticleCount: 5,
  drawVertexCount: 24,
  drawRecords: [
    linkedRecord({ id: 0, x: -0.4, y: 0, alpha: 0.7 }),
    linkedRecord({ id: 1, x: -0.2, y: 0.1, alpha: 0.7 }),
    linkedRecord({ id: 2, x: 0, y: 0.15, alpha: 0.7 }),
    linkedRecord({ id: 3, x: 0.2, y: 0.1, alpha: 0.7 }),
    linkedRecord({ id: 4, x: 0.4, y: 0, alpha: 0.7 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: linkedChainDiagnosticCodes
});
assert.equal(flatAlphaLinkedChain.visualSemanticChecks.linkedChainPathOrder, true);
assert.equal(flatAlphaLinkedChain.visualSemanticChecks.linkedChainSegmentSpacing, true);
assert.equal(flatAlphaLinkedChain.visualSemanticChecks.linkedChainColorAlternation, true);
assert.equal(flatAlphaLinkedChain.visualSemanticChecks.linkedChainParticleSizeEnvelope, true);
assert.equal(flatAlphaLinkedChain.visualSemanticChecks.linkedChainAlphaFade, false);
assert.equal(flatAlphaLinkedChain.result, "render-contract-visual-correlation-failed");

const sizeDriftLinkedChain = correlate({
  fixtureId: "vfx-retail-linked-chain",
  drawLane: "linked_textured_quad",
  drawParticleCount: 5,
  drawVertexCount: 24,
  drawRecords: [
    linkedRecord({ id: 0, x: -0.4, y: 0 }),
    linkedRecord({ id: 1, x: -0.2, y: 0.1 }),
    linkedRecord({ id: 2, x: 0, y: 0.15, size: { x: 0.12, y: 0.18 } }),
    linkedRecord({ id: 3, x: 0.2, y: 0.1 }),
    linkedRecord({ id: 4, x: 0.4, y: 0 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: linkedChainDiagnosticCodes
});
assert.equal(sizeDriftLinkedChain.visualSemanticChecks.linkedChainPathOrder, true);
assert.equal(sizeDriftLinkedChain.visualSemanticChecks.linkedChainSegmentSpacing, true);
assert.equal(sizeDriftLinkedChain.visualSemanticChecks.linkedChainColorAlternation, true);
assert.equal(sizeDriftLinkedChain.visualSemanticChecks.linkedChainAlphaFade, true);
assert.equal(sizeDriftLinkedChain.visualSemanticChecks.linkedChainParticleSizeEnvelope, false);
assert.equal(sizeDriftLinkedChain.result, "render-contract-visual-correlation-failed");

const linkedChainNextFrame = correlate({
  fixtureId: "vfx-retail-linked-chain",
  timeSeconds: 1.25,
  seed: 78,
  drawLane: "linked_textured_quad",
  drawParticleCount: 5,
  drawVertexCount: 24,
  drawRecords: [
    linkedRecord({ id: 0, x: -0.42, y: -0.03 }),
    linkedRecord({ id: 1, x: -0.21, y: 0.08 }),
    linkedRecord({ id: 2, x: 0, y: 0.14 }),
    linkedRecord({ id: 3, x: 0.21, y: 0.08 }),
    linkedRecord({ id: 4, x: 0.42, y: -0.02 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: linkedChainDiagnosticCodes
});
const linkedChainStability = createLinkedChainStabilityReport([linkedChain, linkedChainNextFrame]);
assert.equal(linkedChainStability.result, "linked-chain-two-frame-stability-correlated-local-diagnostic");
assert.deepEqual(getFailedChecks(linkedChainStability), []);

assert.deepEqual(getFailedChecks(createLinkedChainStabilityReport([linkedChain, flatAlphaLinkedChain])), [
  "linkedChainStabilityAllFramesPassed",
  "linkedChainStabilitySemanticChecksEveryFrame",
  "linkedChainStabilityAlphaFadeEveryFrame"
]);

assert.deepEqual(getFailedChecks(createLinkedChainStabilityReport([linkedChain, brokenLinkedChainColorAlternation])), [
  "linkedChainStabilityAllFramesPassed",
  "linkedChainStabilitySemanticChecksEveryFrame",
  "linkedChainStabilityColorAlternationEveryFrame",
  "linkedChainStabilityAlphaFadeEveryFrame"
]);

const brokenLinkedChainNextFrame = correlate({
  fixtureId: "vfx-retail-linked-chain",
  timeSeconds: 1.25,
  seed: 78,
  drawLane: "textured_quad",
  drawParticleCount: 5,
  drawVertexCount: 24,
  drawRecords: [
    drawRecord({ id: 0, x: -0.42, y: -0.03 }),
    drawRecord({ id: 1, x: -0.21, y: 0.08 }),
    drawRecord({ id: 2, x: 0.01, y: 0.14 }),
    drawRecord({ id: 3, x: 0.22, y: 0.08 }),
    drawRecord({ id: 4, x: 0.43, y: -0.02 })
  ],
  drawParticles: 5,
  components: 5,
  diagnosticCodes: linkedChainDiagnosticCodes
});
assert.deepEqual(getFailedChecks(createLinkedChainStabilityReport([linkedChain, brokenLinkedChainNextFrame])), [
  "linkedChainStabilitySemanticChecksEveryFrame",
  "linkedChainStabilityLaneStable",
  "linkedChainStabilityPathOrderEveryFrame",
  "linkedChainStabilitySegmentSpacingEveryFrame",
  "linkedChainStabilityParticleOrderEveryFrame",
  "linkedChainStabilityColorAlternationEveryFrame",
  "linkedChainStabilityAlphaFadeEveryFrame",
  "linkedChainStabilityParticleSizeEnvelopeEveryFrame",
  "linkedChainStabilityFramingEveryFrame"
]);
assert.equal(brokenLinkedChainNextFrame.visualSemanticChecks.linkedChainPathOrder, undefined);

const chunk = correlate({
  fixtureId: "vfx-retail-chunk-particles-progfx-type9",
  drawLane: "chunk_model",
  renderMode: { enum: "chunk_model", rawToken: "Chunk" },
  chunkLane: {
    lane: "chunk_model",
    chunkName: "progfx_type9_chunk_model_pending",
    canonicalResourceResolved: true,
    resourceResolveStatus: "resolved",
    resolvedResource: {
      resolutionSource: "dev-fixture-local-template"
    }
  },
  activeParticleCount: 2,
  drawParticleCount: 0,
  drawVertexCount: 0,
  drawRecords: [],
  drawParticles: 0,
  components: 1,
  objectPixels: 1331
});
assert.equal(chunk.checks.chunkLanePreserved, true);
assert.equal(chunk.checks.localPreviewResourceResolved, true);
assert.equal(chunk.checks.noFakeParticleDrawRecords, true);
assert.equal(chunk.checks.localPreviewVisibleWithoutDrawParticles, true);
assert.equal(chunk.visualSemanticChecks.diagnosticVisible, true);
assert.equal(chunk.visualSemanticChecks.chunkLanePreserved, true);
assert.equal(chunk.visualSemanticChecks.noFakeParticles, true);
assert.equal(chunk.visualSemanticChecks.localPreviewResourceResolved, true);
assert.equal(chunk.visualSemanticChecks.diagnosticCodesExplainLocalPreview, true);
assert.equal(chunk.visualSemanticChecks.localPreviewRetailUnverified, true);
assert.equal(
  chunk.visualSemanticOracle.humanReviewNeeded[0].missingOracle,
  "Real progfx Type 9 chunk model resource/source row plus retail runtime/render/capture/comparison evidence."
);
assert.deepEqual(getFailedChecks(chunk), []);

const chunkNextFrame = correlate({
  fixtureId: "vfx-retail-chunk-particles-progfx-type9",
  timeSeconds: 0.95,
  seed: 79,
  drawLane: "chunk_model",
  renderMode: { enum: "chunk_model", rawToken: "Chunk" },
  chunkLane: {
    lane: "chunk_model",
    chunkName: "progfx_type9_chunk_model_pending",
    canonicalResourceResolved: true,
    resourceResolveStatus: "resolved",
    resolvedResource: {
      resolutionSource: "dev-fixture-local-template"
    }
  },
  activeParticleCount: 2,
  drawParticleCount: 0,
  drawVertexCount: 0,
  drawRecords: [],
  drawParticles: 0,
  components: 1,
  objectPixels: 1331
});
const chunkStability = createChunkType9StabilityReport([chunk, chunkNextFrame]);
assert.equal(chunkStability.result, "chunk-type9-two-frame-stability-correlated-local-diagnostic");
assert.deepEqual(getFailedChecks(chunkStability), []);

const brokenChunkNextFrame = correlate({
  fixtureId: "vfx-retail-chunk-particles-progfx-type9",
  timeSeconds: 0.95,
  seed: 79,
  drawLane: "chunk_model",
  renderMode: { enum: "chunk_model", rawToken: "Chunk" },
  chunkLane: {
    lane: "textured_quad",
    chunkName: "progfx_type9_chunk_model_pending",
    canonicalResourceResolved: true,
    resourceResolveStatus: "resolved",
    resolvedResource: {
      resolutionSource: "dev-fixture-local-template"
    }
  },
  activeParticleCount: 2,
  drawParticleCount: 0,
  drawVertexCount: 0,
  drawRecords: [],
  drawParticles: 0,
  components: 1,
  objectPixels: 1331
});
assert.deepEqual(getFailedChecks(createChunkType9StabilityReport([chunk, brokenChunkNextFrame])), [
  "chunkType9StabilityAllFramesPassed",
  "chunkType9StabilityChunkLaneStable"
]);

const brokenP2p = correlate({
  fixtureId: "vfx-retail-p2p-gravity-reference-node",
  drawParticleCount: 7,
  drawVertexCount: 42,
  drawRecords: [
    drawRecord({ id: 0, x: -0.4, y: 0.2 }),
    drawRecord({ id: 1, x: 0, y: -0.1 }),
    drawRecord({ id: 2, x: 0.4, y: 0.1 }),
    drawRecord({ id: 3, x: 0.5, y: -0.2 }),
    drawRecord({ id: 4, x: 0.6, y: -0.25 }),
    drawRecord({ id: 5, x: 0.7, y: -0.3 }),
    drawRecord({ id: 6, x: 0.8, y: -0.35 })
  ],
  drawParticles: 7,
  components: 7,
  diagnosticCodes: p2pDiagnosticCodes
});
assert.deepEqual(getFailedChecks(brokenP2p), [
  "p2pArcMiddleHigherThanEnds",
  "p2pRenderedPositionYMiddleHigherThanEnds"
]);
assert.equal(brokenP2p.visualSemanticChecks.p2pGravityArcPath, false);

console.log("vfx visual correlation runner self-test passed");

function correlate({
  fixtureId,
  analysisFeatures = TEST_ANALYSIS_FEATURES_BY_FIXTURE_ID.get(fixtureId) ?? [],
  timeSeconds = 0.5,
  seed = 1,
  drawLane = "textured_quad",
  renderMode = { enum: "billboard_to_world_z", rawToken: "Billboard_to_World_Z" },
  blendMode = { enum: "normal", rawToken: "Normal", modeNumber: 0 },
  chunkLane,
  beamContext,
  fountainAtlas,
  drawParticleCount,
  drawVertexCount,
  drawRecords,
  drawParticles,
  components,
  objectPixels = 1000,
  textureProfile = "radial-soft-atlas-4x4-v2",
  activeParticleCount,
  renderContractSha256 = "test-render-contract",
  diagnosticCodes = chunkLane
    ? [
        "VFX_CHUNK_MODEL_RETAIL_RESOURCE_REQUIRED",
        "VFX_DEV_CHUNK_LANE_DIAGNOSTIC_ONLY",
        "VFX_CANONICAL_CHUNK_MODEL_PREVIEW_RETAIL_PROOF_PENDING"
      ]
    : []
}) {
  const linkedSegmentTopology = drawLane === "linked_textured_quad" && drawRecords.length > 1;
  const geometryDrawRecordCount = linkedSegmentTopology ? drawRecords.length - 1 : drawRecords.length;

  return createCorrelation({
    snapshot: {
      fixtureId,
      requestedFixtureId: fixtureId,
      timeSeconds,
      seed,
      canonicalParityPromoted: false,
      metrics: {
        drawLane,
        activeParticleCount: activeParticleCount ?? Math.max(drawParticleCount, 1),
        drawParticleCount,
        drawVertexCount,
        drawRecordCount: drawRecords.length,
        diagnosticCodes,
        renderContractSha256,
        payloadContractsSha256: "test-payload-contract"
      },
      renderContract: {
        drawLane,
        renderMode,
        blendMode,
        analysisProfile: {
          version: "aurora-vfx-analysis-profile/v1",
          features: analysisFeatures
        },
        chunkLane,
        fountainAtlas,
        drawParticleCount,
        drawVertexCount,
        ...(beamContext ? { beamContext } : {}),
        drawRecords
      }
    },
    frame: {
      domStatus: {
        fixtureId,
        renderStatus: "rendered",
        canvasNonblank: "true",
        objectPixels,
        drawParticles,
        textureProfile,
        renderedTextureReference: chunkLane ? "" : "fx_canonical_fire",
        renderedTextureStatus: chunkLane ? "chunk-lane-preserved" : "applied",
        textureAtlas: {
          columns: 4,
          rows: 4,
          cellSize: 32,
          cellCount: 16,
          width: 128,
          height: 128
        },
        renderedRenderMode: renderMode.enum,
        renderedRenderModeRawToken: renderMode.rawToken,
        renderedBlendMode: blendMode.enum,
        renderedBlendModeRawToken: blendMode.rawToken,
        renderedBlendModeNumber: blendMode.modeNumber,
        renderedDiagnosticCodes: diagnosticCodes,
        renderedMaterial: {
          transparent: blendMode.enum === "punch_through" ? "false" : "true",
          depthWrite: blendMode.enum === "punch_through" ? "true" : "false",
          depthTest: "true",
          alphaTest: blendMode.enum === "punch_through" ? 0.5 : 0,
          opacity: 1,
          colorHex: "#ffffff",
          blending: blendMode.enum === "normal" || blendMode.enum === "punch_through" ? "normal" : "custom",
          blendSrc: "SrcAlphaFactor",
          blendDst: blendMode.enum === "normal" || blendMode.enum === "punch_through"
            ? "OneMinusSrcAlphaFactor"
            : "OneFactor",
          blendEquation: "AddEquation",
          status: chunkLane ? "not-applied" : "applied",
          mapBound: chunkLane ? "false" : "true",
          mapReference: chunkLane ? "" : "fx_canonical_fire",
          vertexColors: "true",
          side: "DoubleSide"
        },
        renderedAtlasFrames: drawRecords
          .map((record) => record.atlasUv?.frameIndex)
          .filter((frameIndex) => typeof frameIndex === "number"),
        renderedAtlasUvU0: drawRecords
          .map((record) => record.atlasUv?.u0)
          .filter((entry) => typeof entry === "number"),
        renderedAtlasUvV0: drawRecords
          .map((record) => record.atlasUv?.v0)
          .filter((entry) => typeof entry === "number"),
        renderedAtlasUvU1: drawRecords
          .map((record) => record.atlasUv?.u1)
          .filter((entry) => typeof entry === "number"),
        renderedAtlasUvV1: drawRecords
          .map((record) => record.atlasUv?.v1)
          .filter((entry) => typeof entry === "number"),
        renderedPositionX: drawRecords
          .map((record) => record.position?.x)
          .filter((entry) => typeof entry === "number"),
        renderedPositionY: drawRecords
          .map((record) => record.position?.y)
          .filter((entry) => typeof entry === "number"),
        renderedPositionZ: drawRecords
          .map((record) => record.position?.z)
          .filter((entry) => typeof entry === "number"),
        renderedVelocityX: drawRecords
          .map((record) => record.velocity?.x)
          .filter((entry) => typeof entry === "number"),
        renderedVelocityY: drawRecords
          .map((record) => record.velocity?.y)
          .filter((entry) => typeof entry === "number"),
        renderedVelocityZ: drawRecords
          .map((record) => record.velocity?.z)
          .filter((entry) => typeof entry === "number"),
        renderedParticleSizeX: drawRecords
          .map((record) => record.size?.x)
          .filter((entry) => typeof entry === "number"),
        renderedParticleSizeY: drawRecords
          .map((record) => record.size?.y)
          .filter((entry) => typeof entry === "number"),
        renderedColorR: drawRecords
          .map((record) => record.color?.r)
          .filter((entry) => typeof entry === "number"),
        renderedColorG: drawRecords
          .map((record) => record.color?.g)
          .filter((entry) => typeof entry === "number"),
        renderedColorB: drawRecords
          .map((record) => record.color?.b)
          .filter((entry) => typeof entry === "number"),
        renderedAlpha: drawRecords
          .map((record) => record.alpha)
          .filter((entry) => typeof entry === "number"),
        renderedGeometry: {
          nonIndexedDrawArrays: drawRecords.length > 0 ? "true" : "false",
          indexedDrawArrays: "false",
          drawModeArgument: drawRecords.length > 0 ? 3 : 0,
          drawModeArgumentSource:
            drawRecords.length > 0 ? "aurora-draw-wrapper-mode-arg3" : "",
          verticesPerParticle: drawRecords.length > 0 ? 6 : 0,
          atlasUvSource: drawRecords.length > 0 ? "aurora-particle-draw-record" : "",
          colorAttributeMinUniqueValuesPerRecord: drawRecords.length > 0 ? 1 : 0,
          colorAttributeMaxUniqueValuesPerRecord: drawRecords.length > 0 ? 1 : 0,
          colorAttributeCount: drawVertexCount,
          alphaAttributeMin:
            drawRecords.length > 0 ? Math.min(...drawRecords.map((record) => Number(record.alpha))) : 0,
          alphaAttributeMax:
            drawRecords.length > 0 ? Math.max(...drawRecords.map((record) => Number(record.alpha))) : 0,
          alphaAttributeCount: drawVertexCount,
          alphaAttributeMinUniqueValuesPerRecord: drawRecords.length > 0 ? 1 : 0,
          alphaAttributeMaxUniqueValuesPerRecord: drawRecords.length > 0 ? 1 : 0,
          particleSizeAttributeCount: drawVertexCount,
          particleSizeAttributeMinUniqueValuesPerRecord: drawRecords.length > 0 ? 1 : 0,
          particleSizeAttributeMaxUniqueValuesPerRecord: drawRecords.length > 0 ? 1 : 0,
          atlasFrameAttributeCount: drawVertexCount,
          atlasFrameAttributeMinUniqueValuesPerRecord: drawRecords.length > 0 ? 1 : 0,
          atlasFrameAttributeMaxUniqueValuesPerRecord: drawRecords.length > 0 ? 1 : 0,
          positionAttributeCount: drawVertexCount,
          positionAttributeMinUniqueValuesPerRecord: drawRecords.length > 0 ? 4 : 0,
          positionAttributeMaxUniqueValuesPerRecord: drawRecords.length > 0 ? 4 : 0,
          uvAttributeCount: drawVertexCount,
          uvAttributeMinUniqueValuesPerRecord: drawRecords.length > 0 ? 4 : 0,
          uvAttributeMaxUniqueValuesPerRecord: drawRecords.length > 0 ? 4 : 0,
          drawRecordIndexAttributeCount: drawVertexCount,
          drawRecordIndexAttributeItemSize: drawRecords.length > 0 ? 1 : 0,
          drawRecordIndexAttributeSource:
            drawRecords.length > 0 ? "auroraDrawRecordIndex-buffer-attribute" : "",
          drawRecordIndexAttributeUniqueCount: geometryDrawRecordCount,
          drawRecordIndexAttributeMin: 0,
          drawRecordIndexAttributeMax: geometryDrawRecordCount > 0 ? geometryDrawRecordCount - 1 : 0,
          drawRecordIndexAttributeMinVerticesPerRecord: drawRecords.length > 0 ? 6 : 0,
          drawRecordIndexAttributeMaxVerticesPerRecord: drawRecords.length > 0 ? 6 : 0,
          linkedSegmentTopology: linkedSegmentTopology ? "true" : "false",
          linkedSegmentCount: linkedSegmentTopology ? geometryDrawRecordCount : 0,
          linkedSegmentSource: linkedSegmentTopology ? "aurora-linked-draw-record-pairs" : ""
        },
        canonicalParityPromoted: "false"
      }
    },
    comparison: {
      comparisonResult: "local-structural-visible",
      canonicalParityPromoted: false,
      contractChecks: {
        checks: passingAnalyzerContractChecks()
      },
      metrics: {
        objectPixels,
        connectedComponentCount: components,
        bounds: { x0: 1, y0: 1, x1: 10, y1: 10 }
      }
    },
    snapshotPath: "snapshot.json",
    screenshotPath: "screenshot.png",
    framePath: "frame.json",
    comparisonPath: "comparison.json"
  });
}

function passingAnalyzerContractChecks() {
  return {
    renderedTextureReferenceMatchesDependency: true,
    renderedTextureStatusApplied: true,
    renderedTextureProfilePresent: true,
    renderedTextureAtlasDimensionsConsistent: true,
    renderedTextureAtlasGridMatchesFountainContract: true,
    renderedTextureAtlasCellCountMatchesFountainContract: true,
    renderedMaterialTransparentMatchesBlend: true,
    renderedMaterialDepthWriteMatchesBlend: true,
    renderedMaterialDepthTestEnabled: true,
    renderedMaterialAlphaTestMatchesBlend: true,
    renderedMaterialOpacityIsUnit: true,
    renderedMaterialColorIsWhite: true,
    renderedMaterialBlendingMatchesBlend: true,
    renderedMaterialBlendSrcMatchesBlend: true,
    renderedMaterialBlendDstMatchesBlend: true,
    renderedMaterialBlendEquationMatchesBlend: true,
    renderedMaterialStatusApplied: true,
    renderedMaterialMapBoundMatchesTextureStatus: true,
    renderedMaterialMapReferenceMatchesTextureReference: true,
    renderedMaterialVertexColorsEnabled: true,
    renderedMaterialSideDoubleSided: true,
    renderedRenderOrderMatchesContract: true,
    renderedRenderModeMatchesContract: true,
    renderedBlendModeMatchesContract: true,
    renderedRenderModeRawTokenMatchesContract: true,
    renderedBlendModeRawTokenMatchesContract: true,
    renderedBlendModeNumberMatchesContract: true,
    renderedDiagnosticCodesMatchMetrics: true,
    renderedAtlasFramesMatchContract: true,
    renderedAtlasUvRectsMatchContract: true,
    renderedDrawRecordIdsMatchContract: true,
    renderedEmitterNodeNamesMatchContract: true,
    renderedDrawRecordLanesMatchContract: true,
    renderedParticleIdsMatchContract: true,
    renderedParticleIndexesMatchContract: true,
    renderedPositionXMatchesContract: true,
    renderedPositionYMatchesContract: true,
    renderedPositionZMatchesContract: true,
    renderedPositionVectorsMatchContract: true,
    renderedVelocityXMatchesContract: true,
    renderedVelocityYMatchesContract: true,
    renderedVelocityZMatchesContract: true,
    renderedVelocityVectorsMatchContract: true,
    renderedColorRMatchesContract: true,
    renderedColorGMatchesContract: true,
    renderedColorBMatchesContract: true,
    renderedColorVectorsMatchContract: true,
    renderedParticleSizeXMatchesContract: true,
    renderedParticleSizeYMatchesContract: true,
    renderedParticleSizeVectorsMatchContract: true,
    renderedAlphaMatchesContract: true,
    renderedRecordVerticesPerParticleMatchContract: true,
    renderedPltLayersMatchContract: true,
    renderedPltLayerColorSourcesMatchContract: true,
    renderedGeometryNonIndexedDrawArrays: true,
    renderedGeometryIndexedDrawArrays: true,
    renderedGeometryDrawModeArgumentMatchesContract: true,
    renderedGeometryDrawModeArgumentSourceMatchesContract: true,
    renderedGeometryVerticesPerParticleMatchesContract: true,
    renderedGeometryAtlasUvSourceMatchesContract: true,
    renderedGeometryPositionAttributeMatchesVertexCount: true,
    renderedGeometryPositionAttributeRangeMatchesContract: true,
    renderedGeometryPositionAttributeUniqueValuesPerRecordMatchContract: true,
    renderedGeometryColorAttributeMatchesVertexCount: true,
    renderedGeometryColorAttributeUniqueCountMatchesContract: true,
    renderedGeometryColorAttributeRangeMatchesContract: true,
    renderedGeometryColorAttributeUniqueValuesPerRecordMatchContract: true,
    renderedGeometryAlphaAttributeMatchesVertexCount: true,
    renderedGeometryAlphaAttributeRangeMatchesContract: true,
    renderedGeometryAlphaAttributeUniqueValuesPerRecordMatchContract: true,
    renderedGeometryParticleSizeAttributeMatchesVertexCount: true,
    renderedGeometryParticleSizeAttributeRangeMatchesContract: true,
    renderedGeometryParticleSizeAttributeUniqueValuesPerRecordMatchContract: true,
    renderedGeometryAtlasFrameAttributeMatchesVertexCount: true,
    renderedGeometryAtlasFrameAttributeSourceMatchesContract: true,
    renderedGeometryAtlasFrameAttributeUniqueCountMatchesContract: true,
    renderedGeometryAtlasFrameAttributeRangeMatchesContract: true,
    renderedGeometryAtlasFrameAttributeUniqueValuesPerRecordMatchContract: true,
    renderedGeometryDrawRecordIndexAttributeMatchesVertexCount: true,
    renderedGeometryDrawRecordIndexAttributeSourceMatchesContract: true,
    renderedGeometryDrawRecordIndexAttributeUniqueCountMatchesContract: true,
    renderedGeometryDrawRecordIndexAttributeRangeMatchesContract: true,
    renderedGeometryDrawRecordIndexAttributeVertexBucketSizeMatchesContract: true,
    renderedGeometryUvAttributeMatchesVertexCount: true,
    renderedGeometryUvAttributeRangeMatchesContract: true,
    renderedGeometryUvAttributeUniqueValuesPerRecordMatchContract: true,
    renderedBoundsMatchContract: true
  };
}

function drawRecord({
  id,
  particleId,
  x,
  y,
  color = { r: 1, g: 1, b: 1 },
  blendMode = { enum: "normal", rawToken: "Normal", modeNumber: 0 },
  pltLayer,
  pltLayerColorSource = pltLayer ? "dev_known_layer_color_diagnostic" : undefined,
  bodyNode,
  beamSegmentIndex,
  beamSegmentCount,
  beamContextSource,
  fountainAtlas = false,
  atlasFrameIndex = 0,
  atlasGrid = { x: 4, y: 4 },
  atlasUv,
  velocity,
  size,
  alpha,
  lane = "textured_quad"
}) {
  const resolvedVelocity = velocity ?? { x: 0.12, y: 0.16 - id * 0.04, z: 0 };
  const fountainSizes = [
    { x: 0.45, y: 0.53 },
    { x: 0.436, y: 0.45 },
    { x: 0.372, y: 0.414 },
    { x: 0.333, y: 0.449 },
    { x: 0.354, y: 0.47 },
    { x: 0.379, y: 0.413 }
  ];
  const resolvedSize = size ?? (fountainAtlas ? fountainSizes[id] : undefined) ?? { x: 0.2 + id * 0.01, y: 0.24 + id * 0.01 };
  return {
    drawRecordId: `draw:${id}`,
    lane,
    position: { x, y, z: 0 },
    velocity: resolvedVelocity,
    size: resolvedSize,
    alpha: alpha ?? 0.75 - id * 0.08,
    particleId,
    color,
    blendMode,
    drawRoute: {
      route: "non_indexed_draw_arrays",
      indexed: false,
      drawModeArgument: 3,
      drawModeArgumentSource: "aurora-draw-wrapper-mode-arg3",
      enumTableCaptured: true,
      glPrimitiveMode: "GL_TRIANGLES",
      glPrimitiveModeEnum: 0x0004,
      triangleListInferenceProof: "confirmed_draw_wrapper_table_index_3_gl_triangles"
    },
    ...(pltLayer ? { pltLayer } : {}),
    ...(pltLayerColorSource ? { pltLayerColorSource } : {}),
    atlasUv: atlasUv ?? {
      u0: 0,
      v0: 0,
      u1: 0.25,
      v1: 0.25,
      frameIndex: atlasFrameIndex,
      rawFrameIndex: atlasFrameIndex,
      mapping: "row_major_top_down_v"
    },
    atlasProvenance: {
      checkpointSeconds: 0.5,
      randomResetPath: "deterministic_dev_runner_seed",
      materialLevelFrameOffsetAllowed: false,
      frameStepIntegerConversion: "already_integer",
      ...(pltLayer ? { pltLayer } : {}),
      ...(bodyNode ? { bodyNode } : {}),
      ...(typeof beamSegmentIndex === "number" ? { beamSegmentIndex } : {}),
      ...(typeof beamSegmentCount === "number" ? { beamSegmentCount } : {}),
      ...(beamContextSource ? { beamContextSource } : {}),
      ...(fountainAtlas
        ? {
            emitterType: "Fountain",
            textureRef: "fx_canonical_fire",
            atlasGrid,
            atlasFrameStart: 0,
            atlasFrameEnd: 15,
            atlasFps: 12,
            randomFrameStart: true,
            atlasPlaybackSource: "dev_fountain_atlas_diagnostic"
          }
        : {})
    }
  };
}

function mode2DrawRecords(points) {
  const colors = [
    { r: 0.12, g: 0.7, b: 1 },
    { r: 1, g: 0.92, b: 0.18 }
  ];
  return points.map((point, index) =>
    drawRecord({
      id: index,
      particleId: `mode2:${index}`,
      x: point.x,
      y: point.y,
      color: point.color ?? colors[index % colors.length],
      alpha: 0.78 - index * 0.14,
      blendMode: mode2LightenBlendMode,
      velocity: { x: index < 2 ? -0.03 : 0.03, y: index % 2 === 0 ? -0.015 : 0.015, z: 0 },
      size: { x: 0.38, y: 0.38 }
    })
  );
}

function beamRecord({ id, x, y, bodyNode = "BODY_NODE_CHEST", alpha, color, size }) {
  const colors = [
    { r: 1, g: 0.34, b: 0.08 },
    { r: 1, g: 0.88, b: 0.24 }
  ];
  const sizeYBySegment = [0.13877668745176566, 0.1173920422137304, 0.10008099215853551, 0.1138831659511907, 0.1372397527204092];
  return drawRecord({
    id,
    x,
    y,
    color: color ?? colors[id % colors.length],
    bodyNode,
    beamSegmentIndex: id,
    beamSegmentCount: 5,
    beamContextSource: "dev_effectbeam_context_diagnostic",
    atlasFrameIndex: [8, 11, 14, 1, 4][id] ?? id,
    size: size ?? { x: 0.34, y: sizeYBySegment[id] ?? 0.12 },
    alpha: alpha ?? 0.78 - id * 0.07,
    velocity: { x: 0.18, y: 0.04, z: 0 }
  });
}

function linkedRecord({ id, x, y, alpha, size }) {
  const colors = [
    { r: 0.22, g: 0.8, b: 1 },
    { r: 0.98, g: 0.92, b: 0.36 }
  ];
  const localSizes = [
    { x: 0.2592386130388749, y: 0.30776731915048144 },
    { x: 0.23617227337058894, y: 0.26341506356398936 },
    { x: 0.18784505898843645, y: 0.27620798939679814 },
    { x: 0.1897434324201817, y: 0.32616371759303114 },
    { x: 0.23890215975463805, y: 0.33525206882737724 }
  ];
  return drawRecord({
    id,
    x,
    y,
    lane: "linked_textured_quad",
    color: colors[id % colors.length],
    alpha,
    size: size ?? localSizes[id],
    velocity: { x: 0.05, y: 0.02 * Math.cos(id), z: 0 }
  });
}

function p2pArcDrawRecords({
  firstX = -0.48,
  xPositions,
  alphaValues,
  invertColors = false,
  sizeOverrides
} = {}) {
  const xs = xPositions ?? [firstX, -0.32, -0.16, 0, 0.16, 0.32, 0.48];
  const ys = [
    -0.2,
    0.05055555555555558,
    0.1888888888888889,
    0.215,
    0.12888888888888891,
    -0.06944444444444448,
    -0.38
  ];
  const localSizeEnvelope = [
    { x: 0.2196409454805547, y: 0.22534747056164772 },
    { x: 0.1938992840752223, y: 0.18249253538032367 },
    { x: 0.1464471268360043, y: 0.19822375830312267 },
    { x: 0.15140410873657828, y: 0.24796917951693545 },
    { x: 0.201027490343846, y: 0.25402711639030645 },
    { x: 0.217806213259595, y: 0.20693515254700529 },
    { x: 0.17553213669118778, y: 0.18025030569358086 }
  ];
  const blue = { r: 0.4, g: 0.74, b: 1 };
  const yellow = { r: 1, g: 0.7, b: 0.22 };

  return xs.map((x, index) =>
    drawRecord({
      id: index,
      x,
      y: ys[index],
      alpha: alphaValues?.[index],
      color: (index + (invertColors ? 1 : 0)) % 2 === 0 ? blue : yellow,
      size: sizeOverrides?.[index] ?? localSizeEnvelope[index]
    })
  );
}

function fountainProgressionFrame({ timeSeconds, seed, frameIndexes }) {
  const fountainAtlas = {
    emitterType: "Fountain",
    textureRef: "fx_canonical_fire",
    xgrid: 4,
    ygrid: 4,
    fps: 12,
    frameStart: 0,
    frameEnd: 15,
    randomFrameStart: true,
    retailPlaybackResolved: false
  };
  const drawRecords = frameIndexes.map((frameIndex, index) =>
    drawRecord({
      id: index,
      x: -0.25 + index * 0.1,
      y: -0.12 + index * 0.04,
      fountainAtlas: true,
      atlasFrameIndex: frameIndex
    })
  );
  const correlation = correlate({
    fixtureId: "vfx-retail-fountain-atlas-cot-fx01",
    timeSeconds,
    seed,
    drawParticleCount: 6,
    drawVertexCount: 36,
    fountainAtlas,
    drawRecords,
    drawParticles: 6,
    components: 4
  });

  return {
    correlation,
    snapshot: {
      fixtureId: "vfx-retail-fountain-atlas-cot-fx01",
      requestedFixtureId: "vfx-retail-fountain-atlas-cot-fx01",
      timeSeconds,
      seed,
      canonicalParityPromoted: false,
      renderContract: {
        fountainAtlas,
        drawRecords
      }
    }
  };
}
