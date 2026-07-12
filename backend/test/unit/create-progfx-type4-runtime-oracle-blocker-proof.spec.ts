import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-progfx-type4-runtime-oracle-blocker-proof.mjs"
);

describe("create-progfx-type4-runtime-oracle-blocker-proof", () => {
  it("summarizes ProgFX Type 4 runtime oracle observations while keeping parity blocked", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-progfx-blocker-proof-"));
    const artifactDir = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    await mkdir(artifactDir, { recursive: true });
    await writeJson(artifactDir, "retail-progfx-priority-policy.json", {
      status: "blocked-retail-runtime-priority-pixels-classified-tie-custom-zero-still-missing",
      passed: false,
      canonicalParityPromoted: false,
      runtimeObservation: {
        status: "retail-priority-before-after-pixels-classified",
        pixelClassification: {
          visibleType4VfxAppears: true,
          dominantCapturedSignal: "warm-yellow",
          beforeType4LightSignal: { count: 0 },
          afterType4LightSignal: { count: 245, dominantSignal: "warm-yellow" },
          beforeBlueVfxSignal: { count: 0 },
          afterBlueVfxSignal: { count: 245 }
        },
        tiePolicy: "unknown-retail-runtime-dataflow-blocked",
        equalPriorityTieCandidate: {
          status:
            "retail-pixel-candidate-equal-priority-yellow-over-blue-observed-dataflow-still-blocked",
          candidateObserved: true,
          sameTimestampBlueYellowRequests: true,
          blueBeforeYellowInScript: true,
          priority20HasTie: true,
          dominantCapturedSignal: "warm-yellow",
          afterWarmSignalCount: 245,
          afterBlueSignalCount: 0,
          candidateInterpretation:
            "Retail priority driver schedules VFX_DUR_LIGHT_BLUE_5 then VFX_DUR_LIGHT_YELLOW_5 at the same timestamp; both resolve to Type 4 Param4=20, and the after-capture classifier sees warm-yellow but no blue in the VFX ROI."
        },
        priorityZeroPolicy: "custom-param4-zero-override-pack-prepared-runtime-capture-missing",
        customProgFxZeroOverride: { prepared: true }
      }
    });
    await writeJson(artifactDir, "retail-progfx-proximity-distance-sweep.json", {
      status: "blocked-retail-runtime-proximity-pixels-classified-threshold-owner-still-missing",
      passed: false,
      canonicalParityPromoted: false,
      sweep: {
        status: "retail-near-mid-far-pixels-classified-threshold-bracket-only",
        pixelClassification: {
          status:
            "retail-proximity-pixels-classified-near-reduced-mid-far-active-threshold-bracket-only"
        },
        thresholdBracket: "near-to-mid",
        thresholdBracketAuroraUnits: {
          nearDistanceFromStageReferenceAuroraUnits: 10,
          midRestoredDistanceFromStageReferenceAuroraUnits: 10,
          farActiveDistanceFromStageReferenceAuroraUnits: 20,
          unit: "aurora-stage-xy-units"
        },
        sampleLocations: {
          near: {
            status: "fixture-start-location",
            location: { x: 65, y: 55, z: 0, facing: null },
            distanceFromStageReferenceAuroraUnits: 10
          },
          mid: {
            status: "explicit-stage-location",
            location: { x: 75, y: 65, z: 0, facing: 0 },
            distanceFromStageReferenceAuroraUnits: 10
          },
          far: {
            status: "explicit-stage-location",
            location: { x: 85, y: 65, z: 0, facing: 0 },
            distanceFromStageReferenceAuroraUnits: 20
          }
        },
        measuredThresholdMeters: null,
        measuredThresholdAuroraUnits: null,
        candidateSet: "unknown-retail-runtime-dataflow-blocked",
        restoreBehavior: "blue Type 4 signal is reduced at near sample and restored at mid/far samples"
      }
    });
    await writeJson(artifactDir, "retail-progfx-attach-scene-restore.json", {
      status: "blocked-retail-runtime-attach-pixels-classified-no-removal-observed-scheduler-still-missing",
      passed: false,
      canonicalParityPromoted: false,
      restoreObservation: {
        status: "retail-before-active-after-pixels-classified-no-scene-light-removal-observed",
        sceneLightsRemovedWhileActive: false,
        sceneLightRestoreTiming: "unknown-retail-runtime-dataflow-blocked"
      }
    });
    await writeJson(artifactDir, "retail-progfx-blindvision-pixel-compare.json", {
      status: "blocked-retail-blindvision-local-tolerance-evaluated-failed",
      passed: false,
      canonicalParityPromoted: false,
      retailMutationObserved: true,
      retailMutationTolerance: {
        status: "tolerance-passed",
        passed: true
      },
      localVsRetailTolerance: {
        status: "tolerance-failed",
        passed: false
      },
      localVsRetailMetric: {
        left: { name: "local.png", width: 1424, height: 609 },
        right: { name: "retail.png", width: 1280, height: 900 },
        meanAbsRgbDelta: 56.08,
        changedSampleRatioGt5: 1,
        rmsRgbDelta: 77.85
      },
      retailMutationMetric: {
        meanAbsRgbDelta: 1.12,
        changedSampleRatioGt5: 0.02
      },
      pixelDiffArtifact: { present: true }
    });

    const outputPath = join(artifactDir, "progfx-type4-runtime-oracle-blocker-proof.json");
    const { stdout } = await execFileAsync(
      "node",
      [scriptPath, "--repoRoot", tempRoot, "--artifactDir", artifactDir, "--out", outputPath],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    const proof = JSON.parse(await readFile(outputPath, "utf8"));
    expect(cli).toMatchObject({
      status: "blocked-progfx-type4-runtime-oracles-present-policy-parity-incomplete",
      prioritySignal: true,
      proximityBracket: true,
      blindvisionMutation: true,
      canonicalParityPromoted: false
    });
    expect(proof).toMatchObject({
      passed: false,
      canonicalParityPromoted: false,
      observations: {
        priority: {
          visibleType4VfxAppears: true,
          tiePolicy: "unknown-retail-runtime-dataflow-blocked",
          equalPriorityTieCandidate: expect.objectContaining({
            candidateObserved: true,
            dominantCapturedSignal: "warm-yellow",
            afterBlueSignalCount: 0
          }),
          customProgFxZeroOverridePrepared: true
        },
        proximity: {
          thresholdBracket: "near-to-mid",
          thresholdBracketAuroraUnits: expect.objectContaining({
            nearDistanceFromStageReferenceAuroraUnits: 10,
            midRestoredDistanceFromStageReferenceAuroraUnits: 10,
            farActiveDistanceFromStageReferenceAuroraUnits: 20
          }),
          sampleLocations: expect.objectContaining({
            mid: expect.objectContaining({
              location: expect.objectContaining({ x: 75, y: 65 })
            })
          }),
          measuredThresholdMeters: null,
          measuredThresholdAuroraUnits: null
        },
        attach: {
          sceneLightsRemovedWhileActive: false
        },
        blindvision: {
          retailMutationObserved: true,
          retailMutationToleranceStatus: "tolerance-passed",
          retailMutationTolerancePassed: true,
          localVsRetailToleranceStatus: "tolerance-failed",
          localVsRetailTolerancePassed: false,
          pixelDiffPresent: true
        }
      },
      proofScope: {
        provesPriorityVisibleType4PixelSignal: true,
        provesProximitySuppressionBracket: true,
        provesAttachSceneRemovalAndRestore: false,
        provesBlindvisionRetailPixelMutation: true,
        provesBlindvisionRetailMutationTolerance: true,
        provesLocalVsRetailBlindvisionParity: false,
        provesPriorityTiePolicy: false,
        provesPriorityTieCandidate: true,
        provesExactProximityThreshold: false,
        permitsProgFxType4SchedulerPromotion: false,
        provesCanonicalParity: false
      }
    });
    expect(proof.schedulerPromotionGate).toMatchObject({
      status: "blocked-progfx-type4-scheduler-policy-parity-incomplete",
      promotionAllowed: false,
      checks: expect.arrayContaining([
        expect.objectContaining({
          key: "priorityTiePolicyProven",
          passed: false
        }),
        expect.objectContaining({
          key: "stockPriorityZeroPolicyProven",
          passed: false
        }),
        expect.objectContaining({
          key: "exactProximityThresholdProven",
          passed: false
        }),
        expect.objectContaining({
          key: "attachToSceneRestorePolicyProven",
          passed: false
        }),
        expect.objectContaining({
          key: "blindvisionLocalVsRetailParity",
          passed: false
        })
      ])
    });
    expect(proof.schedulerPolicyMatrix).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: "param4-equal-priority-tie",
          status: "retail-runtime-tie-candidate-observed-general-policy-blocked",
          evidencePassed: true,
          promotedAsSchedulerPolicy: false
        }),
        expect.objectContaining({
          rule: "param5-proximity-suppression-threshold",
          status: "retail-runtime-proximity-bracket-observed-threshold-blocked",
          evidencePassed: true,
          promotedAsSchedulerPolicy: false,
          thresholdBracketAuroraUnits: expect.objectContaining({
            nearDistanceFromStageReferenceAuroraUnits: 10
          })
        }),
        expect.objectContaining({
          rule: "param6-attach-to-scene-restore",
          status: "blocked-no-scene-light-removal-observed",
          evidencePassed: false,
          promotedAsSchedulerPolicy: false
        })
      ])
    );
  });

  it("treats the captured custom Param4 zero override as present but non-stock parity", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-progfx-blocker-proof-zero-"));
    const artifactDir = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    await mkdir(artifactDir, { recursive: true });
    await writeJson(artifactDir, "retail-progfx-priority-policy.json", {
      status:
        "blocked-retail-runtime-priority-pixels-classified-tie-still-missing-custom-zero-captured",
      passed: false,
      canonicalParityPromoted: false,
      runtimeObservation: {
        status: "retail-priority-before-after-pixels-classified",
        pixelClassification: {
          visibleType4VfxAppears: true,
          dominantCapturedSignal: "warm-yellow"
        },
        tiePolicy: "unknown-retail-runtime-dataflow-blocked",
        priorityZeroPolicy:
          "custom-param4-zero-override-runtime-capture-present-not-stock-retail-parity",
        customProgFxZeroOverride: { prepared: true, runtimeCapturePresent: true }
      }
    });
    await writeJson(artifactDir, "retail-progfx-proximity-distance-sweep.json", {
      sweep: { thresholdBracket: "near-to-mid" }
    });
    await writeJson(artifactDir, "retail-progfx-attach-scene-restore.json", {
      restoreObservation: { sceneLightsRemovedWhileActive: false }
    });
    await writeJson(artifactDir, "retail-progfx-blindvision-pixel-compare.json", {
      retailMutationObserved: true,
      retailMutationTolerance: { status: "tolerance-passed", passed: true },
      localVsRetailTolerance: { status: "tolerance-failed", passed: false }
    });

    const outputPath = join(artifactDir, "progfx-type4-runtime-oracle-blocker-proof.json");
    await execFileAsync(
      "node",
      [scriptPath, "--repoRoot", tempRoot, "--artifactDir", artifactDir, "--out", outputPath],
      { maxBuffer: 1024 * 1024 }
    );

    const proof = JSON.parse(await readFile(outputPath, "utf8"));
    expect(proof).toMatchObject({
      proofScope: {
        provesPriorityZeroRuntimePolicy: true,
        permitsProgFxType4SchedulerPromotion: false,
        provesCanonicalParity: false
      },
      schedulerPromotionGate: {
        promotionAllowed: false
      },
      blockedParityFacts: expect.arrayContaining([
        "Stock retail has no Type 4 Param4=0 row; the custom zero override runtime capture is present but remains non-stock retail parity."
      ])
    });
    expect(proof.blockedParityFacts).not.toContain(
      "Stock retail has no Type 4 Param4=0 row; the custom zero override pack is prepared but runtime capture is missing."
    );
  });
});

async function writeJson(dir: string, name: string, value: unknown) {
  await writeFile(join(dir, name), `${JSON.stringify(value, null, 2)}\n`);
}
