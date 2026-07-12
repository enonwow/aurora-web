import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-cross-lane-active-slot-blocker-proof.mjs"
);

describe("create-cross-lane-active-slot-blocker-proof", () => {
  it("preserves local/source active-slot evidence while keeping retail precedence blocked", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-cross-lane-blocker-proof-"));
    const artifactDir = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    await mkdir(artifactDir, { recursive: true });
    await writeFile(
      join(artifactDir, "retail-cross-lane-active-slots.json"),
      `${JSON.stringify({
        status: "blocked-no-direct-retail-active-slot-dump",
        passed: false,
        canonicalParityPromoted: false,
        directRetailSlotDumpAvailable: false,
        directRendererSlotOrderObserved: false,
        slotOrderingProofStatus: "blocked-no-direct-retail-active-slot-dump",
        acceptedSlots: [],
        droppedSlots: []
      })}\n`
    );
    await writeFile(
      join(artifactDir, "cross-lane-precedence-compare.json"),
      `${JSON.stringify({
        status: "blocked-retail-active-slot-order-observation-not-direct",
        passed: false,
        canonicalParityPromoted: false,
        localSourceFamilyCoveragePassed: true,
        runtimeLaneCoveragePassed: true,
        sourceFamilyCoveragePassed: true,
        ownerPathsStillBlocked: true,
        retailMaxLightVariantClassifier: {
          status: "blocked-isolated-lane-reference-captures-missing",
          missingIsolatedReferenceArtifacts: ["retail-ref-placeable-lightcolor.png"]
        }
      })}\n`
    );
    await writeFile(
      join(artifactDir, "aurora-web-cross-lane-all-lanes.frame.json"),
      `${JSON.stringify({
        localOnlyNotRetailEvidence: true,
        domStatus: {
          fixtureScenePointLightRetailOrderingRuntimeProbeStatus:
            "local-cross-lane-runtime-probe-observed-required-lanes-retail-ordering-still-blocked",
          fixtureScenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount: "5",
          fixtureScenePointLightRetailOrderingRuntimeProbePointLightSampleCount: "4",
          fixtureScenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount: "1",
          fixtureScenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes:
            "item-property-light|placeables-2da-light",
          fixtureScenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes: "",
          fixtureScenePointLightRetailOrderingRuntimeProbeBudgetUnknownLanes: "",
          fixtureScenePointLightRetailOrderingRuntimeProbeLocalOrderSource:
            "local preview order only",
          fixtureScenePointLightRetailOrderingRuntimeProbeLocalOrderSamples:
            "lane=item-property-light;kind=point-light;name=VFX_DUR_LIGHT_RED_20;localOrderKey=1;traversalIndex=3;budgetRank=1;budgetAccepted=true;retailScore=60;priority=0;proof=source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked;retailOrdering=blocked|lane=placeables-2da-light;kind=point-light;name=PLC_I06;localOrderKey=2;traversalIndex=1;budgetRank=2;budgetAccepted=true;retailScore=90;priority=1;proof=source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked;retailOrdering=blocked"
        }
      })}\n`
    );
    await writeFile(
      join(artifactDir, "lightmanager-lane-owner-callgraph.json"),
      `${JSON.stringify({
        status: "blocked-common-lane-owner-precedence-not-recovered",
        passed: false,
        requiredLaneOwners: [
          {
            lane: "item-property-light",
            sourceAnchorStatus: "retail-binary-applylight-observed",
            sourceFamilyStatus: "retail-table-family-owner-order-blocked",
            sourceFamilyProofStatus:
              "retail-table-backed-itempropertylight-vfx-dur-light-progfx-fx-light-family-owner-order-blocked",
            lightManagerOwnerPath: "not-recovered"
          },
          {
            lane: "placeables-2da-light",
            sourceAnchorStatus: "not-observed-in-source-only-decompilation",
            stringTableAnchorStatus: "decompilation-string-table-anchor-observed",
            sourceFamilyStatus: "retail-table-binary-family-owner-order-blocked",
            sourceFamilyProofStatus:
              "retail-table-binary-backed-placeable-lightcolor-lightstate-shadowsize-family-owner-order-blocked",
            lightManagerOwnerPath: "not-recovered"
          }
        ],
        sourceFamilyEvidence: [
          {
            lane: "item-property-light",
            status: "retail-table-family-owner-order-blocked",
            proofStatus:
              "retail-table-backed-itempropertylight-vfx-dur-light-progfx-fx-light-family-owner-order-blocked",
            acceptedSourceBackedFacts: [],
            acceptedRetailResourceBackedFacts: [
              "ApplyLight maps item-property color/brightness to VFX_DUR_LIGHT rows"
            ],
            blockedSemantics: [
              "ApplyLight evidence does not prove item-light insertion order"
            ]
          },
          {
            lane: "placeables-2da-light",
            status: "retail-table-binary-family-owner-order-blocked",
            proofStatus:
              "retail-table-binary-backed-placeable-lightcolor-lightstate-shadowsize-family-owner-order-blocked",
            acceptedSourceBackedFacts: [],
            acceptedRetailResourceBackedFacts: [
              "placeables.2da LightColor drives a real point-light lane"
            ],
            acceptedRetailBinaryBackedFacts: [
              "LightState default ON is backed by retail binary xref"
            ],
            blockedSemantics: [
              "placeable LightColor owner precedence is not recovered"
            ]
          }
        ],
        activeSlotAlgorithmEvidence: {
          proofStatus:
            "source-backed-active-slot-cap-score-sort-prune-append-upload-shader-loop-lane-score-input-still-blocked",
          maxActiveLights: { hardCap: 128 },
          activeListSemantics: ["FUN_00a41850 computes the active score scalar"]
        },
        conclusion: {
          blockedSemantics: ["receiver/owner data-flow still missing"]
        }
      })}\n`
    );
    await writeFile(
      join(artifactDir, "cross-lane-retail-maxlight-roi-diagnostics.json"),
      `${JSON.stringify({
        status: "retail-maxlight-roi-diagnostics-written-owner-classifier-still-blocked",
        passed: false,
        canonicalParityPromoted: false,
        summary: {
          heatmapCount: 5,
          budgetSensitiveCaseCount: 5,
          provesBudgetSensitiveRetailPixels: true,
          provesAcceptedDroppedOwnerMapping: false,
          provesDirectRendererSlotOrder: false,
          provesCanonicalParity: false
        },
        cases: [
          {
            caseId: "maxlights-3-vs-32-after-budget",
            metric: {
              changedSampleRatioGt5: 0.25,
              changedBoundsGt5: { x: 2, y: 3, width: 10, height: 8 },
              weightedCentroidGt5: { x: 6, y: 7 },
              grid: {
                topHotCells: [{ column: 1, row: 2, changedSampleRatioGt5: 0.9 }]
              }
            }
          }
        ]
      })}\n`
    );

    const outputPath = join(artifactDir, "cross-lane-active-slot-blocker-proof.json");
    const { stdout } = await execFileAsync(
      "node",
      [scriptPath, "--repoRoot", tempRoot, "--artifactDir", artifactDir, "--out", outputPath],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    const proof = JSON.parse(await readFile(outputPath, "utf8"));
    expect(cli).toMatchObject({
      status: "blocked-direct-retail-active-slot-order-missing-local-source-model-present",
      localSampleCount: 2,
      directRetailSlotDumpAvailable: false,
      canonicalParityPromoted: false
    });
    expect(proof).toMatchObject({
      passed: false,
      canonicalParityPromoted: false,
      retailSlotOracle: {
        directRetailSlotDumpAvailable: false,
        directRendererSlotOrderObserved: false,
        acceptedSlotsCount: 0,
        droppedSlotsCount: 0
      },
      localRuntimeModel: {
        localOnlyNotRetailEvidence: true,
        requiredLaneCoverageCount: 5,
        pointLightSampleCount: 4,
        nonPointRequestSampleCount: 1,
        acceptedLanes: ["item-property-light", "placeables-2da-light"]
      },
      proofScope: {
        provesLocalRequiredLaneCoverage: true,
        provesSourceBackedActiveSlotAlgorithm: true,
        provesRetailBudgetSensitiveRoiPixels: true,
        provesRetailAblationLaneEffectMatrix: false,
        provesDirectRetailActiveSlotDump: false,
        provesDirectRendererSlotOrder: false,
        provesAcceptedDroppedOwnerMapping: false,
        provesAllRequiredLaneOwnerPathsRecovered: false,
        permitsRetailOrderingPromotion: false,
        provesRetailCrossLaneOwnerPrecedence: false,
        provesCanonicalParity: false
      }
    });
    expect(proof.sourceAlgorithm).toMatchObject({
      activeSelectionRadiusRule:
        "FUN_00a42728 accepts a sorted candidate only when light+0x80 <= (light+0x60 when positive, otherwise light+0x58)",
      activeSelectionRadiusSource:
        "C:/Projects/New Folder/export/decompiled_all.c:866625-866678"
    });
    expect(proof.retailOrderingPromotionGate).toMatchObject({
      status: "blocked-direct-slot-order-and-accepted-dropped-owner-map-missing",
      promotionAllowed: false,
      acceptedDroppedOwnerMappingProven: false,
      allRequiredLaneOwnerPathsRecovered: false,
      checks: expect.arrayContaining([
        expect.objectContaining({
          key: "sourceBackedActiveSlotAlgorithm",
          passed: true
        }),
        expect.objectContaining({
          key: "directRendererSlotOrder",
          passed: false
        }),
        expect.objectContaining({
          key: "acceptedDroppedOwnerMapping",
          passed: false
        })
      ])
    });
    expect(proof.lanePromotionMatrix).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lane: "item-property-light",
          localObserved: true,
          sourceFamilyBacked: true,
          ownerPathRecovered: false,
          promotionStatus: "blocked-owner-path-not-recovered",
          acceptedRetailResourceBackedFacts: [
            "ApplyLight maps item-property color/brightness to VFX_DUR_LIGHT rows"
          ],
          blockedSemantics: expect.arrayContaining([
            "ApplyLight evidence does not prove item-light insertion order",
            "direct LightManager owner path for this lane is not recovered"
          ])
        }),
        expect.objectContaining({
          lane: "placeables-2da-light",
          localObserved: true,
          sourceFamilyBacked: true,
          ownerPathRecovered: false,
          acceptedSourceBackedFacts: [],
          acceptedRetailResourceBackedFacts: [
            "placeables.2da LightColor drives a real point-light lane"
          ],
          acceptedRetailBinaryBackedFacts: [
            "LightState default ON is backed by retail binary xref"
          ]
        })
      ])
    );
    expect(proof.retailAblationLaneEffectMatrix).toMatchObject({
      status: "blocked-retail-ablation-lane-effect-matrix-incomplete",
      requiredLaneCount: 6,
      presentDiagnosticCount: 1,
      provesAllRequiredLanePixelEffects: false,
      provesAcceptedDroppedOwnerMapping: false,
      provesDirectRendererSlotOrder: false,
      provesCanonicalParity: false,
      missingDiagnostics: expect.arrayContaining([
        "cross-lane-retail-maxlight-roi-diagnostics-no-progfx.json",
        "cross-lane-retail-maxlight-roi-diagnostics-no-tile-source.json"
      ])
    });
    expect(proof.retailMaxLightRoiDiagnostics).toMatchObject({
      present: true,
      heatmapCount: 5,
      budgetSensitiveCaseCount: 5,
      provesBudgetSensitiveRetailPixels: true,
      provesAcceptedDroppedOwnerMapping: false
    });
    expect(proof.localRuntimeModel.localOrderSamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lane: "item-property-light",
          budgetAccepted: true,
          retailOrdering: "blocked"
        })
      ])
    );
  });
});
