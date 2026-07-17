import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { deflateSync } from "node:zlib";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-area-lighting-blocked-compare-reports.mjs"
);

describe("create-area-lighting-blocked-compare-reports", () => {
  it("evaluates shadow-volume source state order while keeping full parity blocked", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-compare-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "retail-shadowvol-state-trace.json"),
      `${JSON.stringify({
        trace: {
          stencil: {
            proofStatus:
              "source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped"
          },
          renderStateSlot3: {
            slotCapabilityStatus: "source-backed-toolset-binary-slot-3-gl-cull-face"
          },
          localDrawOrder: {
            expectedCallSequence: ["FUN_00a7818c(3)", "FUN_00a78128(...)"]
          },
          activeLightEnvelope: {
            proofStatus:
              "source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked"
          }
        }
      })}\n`
    );
    await writeFile(
      join(absoluteArtifactDir, "aurora-web-shadowvol-state-trace.json"),
      `${JSON.stringify({
        stateClaims: [
          "web-preview-uses-retail-mapped-front-back-zpass-zfail-stencil-sequence",
          "web-preview-exposes-local-shadowvol-render-state-order",
          "web-preview-exposes-active-light-render-envelope-depthfunc-blendfunc-state"
        ]
      })}\n`
    );

    const { stdout } = await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir
      ],
      { maxBuffer: 1024 * 1024 }
    );

    expect(JSON.parse(stdout)).toMatchObject({
      status: "blocked-compare-reports-written",
      outputs: expect.arrayContaining([
        expect.objectContaining({
          output: "shadowvol-state-order-compare.json",
          missingInputs: []
        })
      ])
    });
    const compare = JSON.parse(
      await readFile(join(absoluteArtifactDir, "shadowvol-state-order-compare.json"), "utf8")
    );
    expect(compare).toMatchObject({
      status: "blocked-source-state-order-parity-evaluated-pixel-opacity-parity-blocked",
      passed: false,
      canonicalParityPromoted: false,
      stateOrderSourceParityPassed: true,
      blockedParityFacts: expect.arrayContaining([
        "exact retail/toolset shadow-volume pixels"
      ])
    });
    expect(compare.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "stencilSequence", passed: true }),
        expect.objectContaining({ key: "renderStateSlot3", passed: true }),
        expect.objectContaining({ key: "localDrawOrder", passed: true }),
        expect.objectContaining({ key: "activeLightEnvelope", passed: true })
      ])
    );
  });

  it("evaluates local cross-lane source-family coverage without promoting retail precedence", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-cross-lane-compare-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "aurora-web-cross-lane-all-lanes.frame.json"),
      `${JSON.stringify({
        domStatus: {
          fixtureScenePointLightRetailOrderingRuntimeProbeStatus:
            "local-cross-lane-runtime-probe-observed-required-lanes-retail-ordering-still-blocked",
          fixtureScenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount: "5",
          fixtureScenePointLightRetailOrderingRuntimeProbePointLightSampleCount: "4",
          fixtureScenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount: "1",
          fixtureScenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes:
            "item-property-light|placeables-2da-light|source-mdl-light-node|terrain-tile-light"
        }
      })}\n`
    );
    await writeFile(
      join(absoluteArtifactDir, "lightmanager-lane-owner-callgraph.json"),
      `${JSON.stringify({
        activeSlotAlgorithmEvidence: {
          proofStatus:
            "source-backed-active-slot-cap-score-sort-prune-append-upload-shader-loop-lane-score-input-still-blocked"
        },
        requiredLaneOwners: [
          { lane: "terrain-tile-main-light", lightManagerOwnerPath: "not-recovered" },
          { lane: "terrain-tile-source-light", lightManagerOwnerPath: "not-recovered" },
          { lane: "placeables-2da-light", lightManagerOwnerPath: "not-recovered" },
          { lane: "mdl-source-light-node", lightManagerOwnerPath: "not-recovered" },
          { lane: "item-property-light", lightManagerOwnerPath: "not-recovered" },
          { lane: "progfx-type4-light-or-vision", lightManagerOwnerPath: "not-recovered" }
        ],
        sourceFamilyEvidence: [
          {
            lane: "terrain-tile-main-light",
            status: "source-backed-lane-family-owner-order-blocked",
            proofStatus: "source-backed-lane-anchor-observed"
          },
          {
            lane: "terrain-tile-source-light",
            status: "source-backed-lane-family-owner-order-blocked",
            proofStatus: "source-backed-lane-anchor-observed"
          },
          {
            lane: "placeables-2da-light",
            status: "retail-table-binary-family-owner-order-blocked",
            proofStatus:
              "retail-table-binary-backed-placeable-lightcolor-lightstate-shadowsize-family-owner-order-blocked"
          },
          {
            lane: "mdl-source-light-node",
            status: "source-backed-lane-family-owner-order-blocked",
            proofStatus: "retail-binary-backed-mdl-partlight-family-owner-order-blocked"
          },
          {
            lane: "item-property-light",
            status: "retail-table-family-owner-order-blocked",
            proofStatus:
              "retail-table-backed-itempropertylight-vfx-dur-light-progfx-fx-light-family-owner-order-blocked"
          },
          {
            lane: "progfx-type4-light-or-vision",
            status: "retail-table-family-owner-order-blocked",
            proofStatus:
              "retail-table-backed-progfx-type4-table-owner-phase-family-runtime-scheduler-blocked"
          }
        ]
      })}\n`
    );

    await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const compare = JSON.parse(
      await readFile(join(absoluteArtifactDir, "cross-lane-precedence-compare.json"), "utf8")
    );
    expect(compare).toMatchObject({
      status: "blocked-local-source-family-coverage-evaluated-retail-precedence-missing",
      passed: false,
      canonicalParityPromoted: false,
      localSourceFamilyCoveragePassed: true,
      runtimeLaneCoveragePassed: true,
      sourceFamilyCoveragePassed: true,
      ownerPathsStillBlocked: true,
      retailMaxLightVariantClassifier: {
        present: false,
        status: "missing-retail-max-light-variant-observation",
        classifierGrade: false
      },
      retailOrderingPromotionGate: {
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
            key: "localRequiredLaneCoverage",
            passed: true
          }),
          expect.objectContaining({
            key: "directRendererSlotOrder",
            passed: false
          })
        ])
      },
      proofScope: {
        provesLocalRequiredLaneCoverage: true,
        provesSourceBackedActiveSlotAlgorithm: true,
        provesDirectRetailActiveSlotDump: false,
        provesDirectRendererSlotOrder: false,
        permitsRetailOrderingPromotion: false,
        provesRetailCrossLaneOwnerPrecedence: false,
        provesCanonicalParity: false
      },
      missingRetailOrToolsetInputs: expect.arrayContaining([
        "retail-cross-lane-all-lanes-before-budget.png",
        "retail-cross-lane-all-lanes-after-budget.png",
        "retail-cross-lane-active-slots.json"
      ])
    });
    expect(compare.runtimeLaneChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "item-property-light", passed: true }),
        expect.objectContaining({ lane: "progfx-type4-light-or-vision", passed: true })
      ])
    );
    expect(compare.sourceFamilyChecks).toHaveLength(6);
  });

  it("carries ShadowSize retail MDL proof into the campfire shadow-volume compare without passing parity", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-shadowvol-shadowsize-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "retail-or-toolset-shadowvol-campfire.png"),
      makePngRgba(2, 2, [40, 40, 40, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "aurora-web-shadowvol-campfire.png"),
      makePngRgba(2, 2, [20, 20, 20, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-shadowsize-shadow-mdl-proof.json"),
      `${JSON.stringify({
        proofStatus:
          "source-backed-retail-shadowsize-shadow-mdl-selection-and-emitter-metadata-projection-parity-blocked",
        metadataPassed: true,
        canonicalParityPromoted: false,
        projectionParityStatus:
          "blocked-retail-shadow-volume-projection-pixel-geometry-not-proven",
        selectionRule: {
          shadowSize0: "Fx_Shadow_S",
          shadowSize2: "Fx_Shadow_L",
          otherPresentNumericShadowSize: "Fx_Shadow_M"
        },
        emitterMetadata: [
          { resref: "fx_shadow_m", model: "Fx_Shadow_M", passed: true }
        ]
      })}\n`
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-shadowvol-projection-proof.json"),
      `${JSON.stringify({
        status:
          "source-backed-shadowvol-projection-caster-path-retail-pixel-parity-blocked",
        proofStatus:
          "source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked",
        canonicalParityPromoted: false,
        shaderNamesFound: ["vs_shadowvol", "fs_shadowvol"],
        renderBuckets: ["0xd", "0xe", "0xb", "0xc"],
        sourceAnchors: {
          shaderProgram: "decompiled_all.c:913917",
          casterGeometry: "decompiled_all.c:888319-888403"
        },
        proofScope: {
          provesSourceBackedProjectionCasterPath: true,
          provesRetailPixels: false,
          provesProjectionPixelParity: false,
          provesCanonicalParity: false
        },
        blockedParityFacts: [
          "retail shadow-volume projection pixel geometry is not accepted without a normalized retail-vs-web evaluator"
        ]
      })}\n`
    );
    await writeFile(
      join(absoluteArtifactDir, "area-lighting-pixel-diff-artifacts.json"),
      `${JSON.stringify({
        cases: [
          {
            caseId: "shadowvol-campfire-retail-vs-web-normalized",
            status: "pixel-diff-generated-parity-still-blocked",
            canonicalParityPromoted: false,
            normalization: "same-dimension-sampled-grid",
            output: {
              name: "shadowvol-campfire-retail-web-diff-normalized.png",
              path: "backend/docs/aurora-reverse/artifacts/light-shadow/shadowvol-campfire-retail-web-diff-normalized.png"
            },
            metric: {
              meanAbsRgbDelta: 20,
              changedSampleRatioGt5: 1
            },
            calibratedRoiAttempt: {
              status: "calibrated-roi-affine-attempted-failed-tolerance",
              passed: false,
              canonicalParityPromoted: false,
              method: "normalized-luma-grid-translation-and-uniform-scale-search",
              bestOffset: {
                scale: 1,
                sampleOffsetX: 0,
                sampleOffsetY: 0,
                meanAbsLumaDelta: 20,
                changedSampleRatioGt5: 1
              }
            }
          }
        ]
      })}\n`
    );

    await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const compare = JSON.parse(
      await readFile(join(absoluteArtifactDir, "shadowvol-campfire-pixel-compare.json"), "utf8")
    );
    expect(compare).toMatchObject({
      status: "blocked-shadowvol-pixel-tolerance-evaluated-failed",
      passed: false,
      canonicalParityPromoted: false,
      shadowSizeRetailProof: {
        present: true,
        metadataPassed: true,
        canonicalParityPromoted: false,
        projectionParityStatus:
          "blocked-retail-shadow-volume-projection-pixel-geometry-not-proven",
        selectionRule: {
          shadowSize0: "Fx_Shadow_S",
          shadowSize2: "Fx_Shadow_L",
          otherPresentNumericShadowSize: "Fx_Shadow_M"
        }
      },
      shadowvolProjectionProof: {
        present: true,
        status:
          "source-backed-shadowvol-projection-caster-path-retail-pixel-parity-blocked",
        proofStatus:
          "source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked",
        canonicalParityPromoted: false,
        shaderNamesFound: ["vs_shadowvol", "fs_shadowvol"],
        renderBuckets: ["0xd", "0xe", "0xb", "0xc"],
        proofScope: {
          provesSourceBackedProjectionCasterPath: true,
          provesRetailPixels: false,
          provesProjectionPixelParity: false,
          provesCanonicalParity: false
        }
      },
      pixelDiffArtifact: {
        present: true,
        status: "pixel-diff-generated-parity-still-blocked",
        canonicalParityPromoted: false,
        normalization: "same-dimension-sampled-grid",
        metric: {
          meanAbsRgbDelta: 20,
          changedSampleRatioGt5: 1
        },
        calibratedRoiAttempt: {
          status: "calibrated-roi-affine-attempted-failed-tolerance",
          passed: false,
          method: "normalized-luma-grid-translation-and-uniform-scale-search"
        }
      },
      captureCompatibility: {
        status: "blocked-shadowvol-capture-viewport-or-roi-mismatch",
        passed: false,
        pixelDiffNormalization: "same-dimension-sampled-grid",
        checks: expect.arrayContaining([
          expect.objectContaining({
            key: "inputDimensionsMatch",
            passed: true,
            actual: true
          }),
          expect.objectContaining({
            key: "samePixelDimensionsAsRetail",
            passed: true,
            actual: true
          }),
          expect.objectContaining({
            key: "materializationClaimsRetailViewport",
            passed: false,
            actual: false
          }),
          expect.objectContaining({
            key: "calibratedRoiAttempted",
            passed: true,
            actual: true
          }),
          expect.objectContaining({
            key: "calibratedRoiAttemptPassed",
            passed: false,
            actual: false
          }),
          expect.objectContaining({
            key: "sameViewportOrCalibratedRoiPresent",
            passed: false,
            actual: false
          })
        ])
      },
      blocker:
        "Shadow-volume footprint/opacity tolerance cannot promote parity because the translation/uniform-scale ROI calibration attempt is not an accepted same-camera/ROI transform; a same retail viewport capture or stronger calibrated ROI is still required.",
      toleranceEvaluation: {
        status: "tolerance-failed",
        passed: false,
        policy: expect.objectContaining({
          name: "shadow-volume-campfire-footprint-opacity-v1",
          maxMeanAbsRgbDelta: 8,
          maxChangedSampleRatioGt5: 0.15
        }),
        checks: expect.arrayContaining([
          expect.objectContaining({
            key: "sameViewportOrCalibratedRoiPresent",
            passed: false,
            actual: false
          }),
          expect.objectContaining({
            key: "meanAbsRgbDelta",
            passed: false,
            actual: 20,
            max: 8
          }),
          expect.objectContaining({
            key: "changedSampleRatioGt5",
            passed: false,
            actual: 1,
            max: 0.15
          }),
          expect.objectContaining({
            key: "shadowSizeMetadataPresent",
            passed: true
          }),
          expect.objectContaining({
            key: "projectionSourcePathPresent",
            passed: true
          })
        ])
      },
      blockedParityFacts: expect.arrayContaining([
        "ShadowSize retail MDL selection is separately source-backed, but it does not prove projected shadow footprint or opacity",
        "Shadow-volume shader/caster/stencil source path can be source-backed while pixel projection parity remains blocked"
      ])
    });
  });

  it("allows shadow-volume pixel tolerance evaluation only when materialization explicitly proves same retail viewport", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-shadowvol-same-retail-viewport-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "retail-or-toolset-shadowvol-campfire.png"),
      makePngRgba(2, 2, [40, 40, 40, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "aurora-web-shadowvol-campfire.png"),
      makePngRgba(2, 2, [20, 20, 20, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "area-lighting-local-oracle-inputs-manifest.json"),
      `${JSON.stringify({
        materialized: [
          {
            kind: "aurora-web-shadowvol-campfire-pixel-input",
            target: "aurora-web-shadowvol-campfire.png",
            viewportCompatibilityStatus: "same-retail-viewport",
            retailPixelParityInputStatus: "same-retail-viewport-oracle-compatible",
            samePixelDimensionsAsRetail: true,
            sameRetailCameraOrCalibratedRoi: true
          }
        ]
      })}\n`
    );
    await writeFile(
      join(absoluteArtifactDir, "area-lighting-pixel-diff-artifacts.json"),
      `${JSON.stringify({
        cases: [
          {
            caseId: "shadowvol-campfire-retail-vs-web-normalized",
            status: "pixel-diff-generated-parity-still-blocked",
            canonicalParityPromoted: false,
            normalization: "same-dimension-sampled-grid",
            metric: {
              meanAbsRgbDelta: 20,
              rmsRgbDelta: 30,
              changedSampleRatioGt5: 1
            }
          }
        ]
      })}\n`
    );

    await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const compare = JSON.parse(
      await readFile(join(absoluteArtifactDir, "shadowvol-campfire-pixel-compare.json"), "utf8")
    );
    expect(compare).toMatchObject({
      captureCompatibility: {
        status: "shadowvol-capture-compatible",
        passed: true,
        checks: expect.arrayContaining([
          expect.objectContaining({
            key: "materializationClaimsRetailViewport",
            passed: true,
            actual: true
          }),
          expect.objectContaining({
            key: "sameViewportOrCalibratedRoiPresent",
            passed: true,
            actual: true
          })
        ])
      },
      toleranceEvaluation: {
        status: "tolerance-failed",
        passed: false
      },
      blocker:
        "Shadow-volume footprint/opacity tolerance is now evaluated, but the current retail/web image pair fails pixel-delta checks, so parity remains blocked."
    });
  });

  it("flags shadow-volume campfire pixel input when Aurora Web uses a local preview instead of the retail viewport", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-shadowvol-viewport-mismatch-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "retail-or-toolset-shadowvol-campfire.png"),
      makePngRgba(1280, 900, [40, 40, 40, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "aurora-web-shadowvol-campfire.png"),
      makePngRgba(1424, 609, [20, 20, 20, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "area-lighting-local-oracle-inputs-manifest.json"),
      `${JSON.stringify({
        status: "local-web-inputs-ready-retail-oracle-still-required",
        materialized: [
          {
            kind: "aurora-web-shadowvol-campfire-pixel-input",
            source: "placeable-campfire-shadowvol-state-proof-2026-07-03.png",
            target: "aurora-web-shadowvol-campfire.png",
            note: "Aurora Web campfire shadow-volume local preview copied for a future retail/toolset comparison."
          }
        ]
      })}\n`
    );
    await writeFile(
      join(absoluteArtifactDir, "area-lighting-pixel-diff-artifacts.json"),
      `${JSON.stringify({
        cases: [
          {
            caseId: "shadowvol-campfire-retail-vs-web-normalized",
            status: "pixel-diff-generated-parity-still-blocked",
            canonicalParityPromoted: false,
            normalization: "different-dimensions-normalized-sampled-grid",
            metric: {
              sampleWidth: 192,
              sampleHeight: 128,
              meanAbsRgbDelta: 31,
              rmsRgbDelta: 53,
              changedSampleRatioGt5: 1,
              changedBoundsGt5: { x: 0, y: 0, width: 192, height: 128 }
            },
            calibratedRoiAttempt: {
              status: "not-attempted-different-pixel-dimensions",
              passed: false,
              reason: "ROI calibration requires equal pixel dimensions"
            }
          }
        ]
      })}\n`
    );

    await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const compare = JSON.parse(
      await readFile(join(absoluteArtifactDir, "shadowvol-campfire-pixel-compare.json"), "utf8")
    );
    expect(compare).toMatchObject({
      status: "blocked-shadowvol-pixel-tolerance-evaluated-failed",
      passed: false,
      canonicalParityPromoted: false,
      captureCompatibility: {
        status: "blocked-shadowvol-capture-viewport-or-roi-mismatch",
        passed: false,
        retailInput: {
          width: 1280,
          height: 900
        },
        auroraWebInput: {
          width: 1424,
          height: 609
        },
        pixelDiffNormalization: "different-dimensions-normalized-sampled-grid",
        calibratedRoiAttempt: expect.objectContaining({
          status: "not-attempted-different-pixel-dimensions",
          passed: false
        }),
        localOracleMaterialization: expect.objectContaining({
          source: "placeable-campfire-shadowvol-state-proof-2026-07-03.png",
          target: "aurora-web-shadowvol-campfire.png"
        }),
        checks: expect.arrayContaining([
          expect.objectContaining({
            key: "inputDimensionsMatch",
            passed: false,
            actual: false
          }),
          expect.objectContaining({
            key: "auroraWebInputIsLocalPreviewArtifact",
            passed: false,
            actual: true,
            expected: false
          }),
          expect.objectContaining({
            key: "sameViewportOrCalibratedRoiPresent",
            passed: false,
            actual: false
          }),
          expect.objectContaining({
            key: "calibratedRoiAttempted",
            passed: false,
            actual: false
          })
        ])
      },
      toleranceEvaluation: {
        checks: expect.arrayContaining([
          expect.objectContaining({
            key: "sameViewportOrCalibratedRoiPresent",
            passed: false,
            actual: false
          })
        ])
      },
      blocker:
        "Shadow-volume footprint/opacity tolerance cannot promote parity because the current retail/web image pair is not the same viewport and has no calibrated ROI; a new Aurora Web full-viewport capture or explicit ROI transform is required."
    });
  });

  it("keeps cross-lane precedence blocked when active-slot JSON is observational only", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-cross-lane-observed-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(join(absoluteArtifactDir, "retail-cross-lane-all-lanes-before-budget.png"), "png");
    await writeFile(join(absoluteArtifactDir, "retail-cross-lane-all-lanes-after-budget.png"), "png");
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-active-slots.json"),
      `${JSON.stringify({
        status: "blocked-no-direct-retail-active-slot-dump",
        passed: false,
        directRetailSlotDumpAvailable: false,
        directRendererSlotOrderObserved: false,
        slotOrderingProofStatus: "blocked-no-direct-retail-active-slot-dump",
        observationKind: "retail-runtime-pixels-and-log-cues",
        acceptedSlots: [],
        droppedSlots: [],
        observations: {
          runtimePixelEvidencePresent: true,
          runtimeLogCuePresent: true,
          runtimeLogCueSource: "durable-maxlight-observation-active-slot-cue",
          logEvidence: {
            status: "cross-lane-cues-missing"
          },
          durableCaptureCueEvidence: {
            status: "cross-lane-active-slot-cues-present-in-maxlight-observation",
            cues: [
              {
                maxLights: 3,
                artifactCue: "retail-cross-lane-active-slots.json"
              },
              {
                maxLights: 32,
                artifactCue: "retail-cross-lane-active-slots.json"
              }
            ]
          }
        }
      })}\n`
    );
    await writeFile(
      join(absoluteArtifactDir, "aurora-web-cross-lane-all-lanes.frame.json"),
      `${JSON.stringify({
        domStatus: {
          fixtureScenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes:
            "item-property-light|placeables-2da-light|source-mdl-light-node|terrain-tile-light",
          fixtureScenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount: "1"
        }
      })}\n`
    );
    await writeFile(
      join(absoluteArtifactDir, "lightmanager-lane-owner-callgraph.json"),
      `${JSON.stringify({
        activeSlotAlgorithmEvidence: {
          proofStatus:
            "source-backed-active-slot-cap-score-sort-prune-append-upload-shader-loop-lane-score-input-still-blocked"
        },
        requiredLaneOwners: [
          { lane: "terrain-tile-main-light", lightManagerOwnerPath: "not-recovered" },
          { lane: "terrain-tile-source-light", lightManagerOwnerPath: "not-recovered" },
          { lane: "placeables-2da-light", lightManagerOwnerPath: "not-recovered" },
          { lane: "mdl-source-light-node", lightManagerOwnerPath: "not-recovered" },
          { lane: "item-property-light", lightManagerOwnerPath: "not-recovered" },
          { lane: "progfx-type4-light-or-vision", lightManagerOwnerPath: "not-recovered" }
        ],
        sourceFamilyEvidence: [
          { lane: "terrain-tile-main-light", status: "source-backed-lane-family-owner-order-blocked" },
          { lane: "terrain-tile-source-light", status: "source-backed-lane-family-owner-order-blocked" },
          { lane: "placeables-2da-light", status: "retail-table-binary-family-owner-order-blocked" },
          { lane: "mdl-source-light-node", status: "source-backed-lane-family-owner-order-blocked" },
          { lane: "item-property-light", status: "retail-table-family-owner-order-blocked" },
          { lane: "progfx-type4-light-or-vision", status: "retail-table-family-owner-order-blocked" }
        ]
      })}\n`
    );

    await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const compare = JSON.parse(
      await readFile(join(absoluteArtifactDir, "cross-lane-precedence-compare.json"), "utf8")
    );
    expect(compare).toMatchObject({
      status: "blocked-retail-active-slot-order-observation-not-direct",
      passed: false,
      canonicalParityPromoted: false,
      localSourceFamilyCoveragePassed: true,
      activeSlotOracle: expect.objectContaining({
        present: true,
        directRetailSlotDumpAvailable: false,
        directRendererSlotOrderObserved: false,
        observationKind: "retail-runtime-pixels-and-log-cues",
        runtimeLogCuePresent: true,
        runtimeLogCueSource: "durable-maxlight-observation-active-slot-cue",
        liveLogCueStatus: "cross-lane-cues-missing",
        durableCaptureCueStatus:
          "cross-lane-active-slot-cues-present-in-maxlight-observation",
        durableCaptureCueCount: 2
      }),
      retailMaxLightVariantClassifier: {
        present: false,
        status: "missing-retail-max-light-variant-observation",
        classifierGrade: false
      },
      retailOrderingPromotionGate: {
        status: "blocked-direct-slot-order-and-accepted-dropped-owner-map-missing",
        promotionAllowed: false,
        checks: expect.arrayContaining([
          expect.objectContaining({
            key: "directRetailActiveSlotDump",
            passed: false
          }),
          expect.objectContaining({
            key: "acceptedDroppedOwnerMapping",
            passed: false
          })
        ])
      },
      missingRetailOrToolsetInputs: []
    });
    expect(compare.blockedParityFacts).toEqual(
      expect.arrayContaining([
        "retail-cross-lane-active-slots.json is observational only and does not contain a direct renderer active-slot order"
      ])
    );
  });

  it("evaluates Blind_Vision retail mutation and fails local-vs-retail tolerance explicitly", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-blindvision-tolerance-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "retail-progfx-blindvision-before.png"),
      makePngRgba(2, 2, [10, 10, 10, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-progfx-blindvision-active.png"),
      makePngRgba(2, 2, [40, 40, 40, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.png"),
      makePngRgba(3, 2, [5, 5, 5, 255])
    );
    await writeFile(
      join(
        absoluteArtifactDir,
        "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.frame.json"
      ),
      `${JSON.stringify({
        localOnlyNotRetailEvidence: true,
        domStatus: {
          progFxType4RowId: "329",
          progFxType4Label: "LightBlindvision",
          progFxType4Animation: "Blind_Vision",
          progFxType4VisionMutationPolicyStatus:
            "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked"
        }
      })}\n`
    );

    await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const compare = JSON.parse(
      await readFile(
        join(absoluteArtifactDir, "retail-progfx-blindvision-pixel-compare.json"),
        "utf8"
      )
    );
    expect(compare).toMatchObject({
      status: "blocked-retail-blindvision-local-tolerance-evaluated-failed",
      passed: false,
      canonicalParityPromoted: false,
      retailMutationObserved: true,
      retailMutationTolerance: {
        status: "tolerance-passed",
        passed: true
      },
      localFrameStatus: {
        framePresent: true,
        localPreviewPngPresent: true,
        progFxType4RowId: "329",
        localOnlyNotRetailEvidence: true
      },
      localVsRetailTolerance: {
        status: "tolerance-failed",
        passed: false,
        policy: expect.objectContaining({
          name: "blindvision-local-vs-retail-active-viewport-v1",
          requiresLocalPreviewPng:
            "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.png"
        }),
        checks: expect.arrayContaining([
          expect.objectContaining({
            key: "localPreviewPngPresent",
            passed: true
          }),
          expect.objectContaining({
            key: "inputDimensionsMatch",
            passed: false
          }),
          expect.objectContaining({
            key: "localFrameIsNotRetailEvidence",
            passed: true
          })
        ])
      }
    });
  });
});

function makePngRgba(width: number, height: number, rgba: [number, number, number, number]) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = rowOffset + 1 + x * 4;
      raw[offset] = rgba[0];
      raw[offset + 1] = rgba[1];
      raw[offset + 2] = rgba[2];
      raw[offset + 3] = rgba[3];
    }
  }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", Buffer.from([
      (width >>> 24) & 0xff,
      (width >>> 16) & 0xff,
      (width >>> 8) & 0xff,
      width & 0xff,
      (height >>> 24) & 0xff,
      (height >>> 16) & 0xff,
      (height >>> 8) & 0xff,
      height & 0xff,
      8,
      6,
      0,
      0,
      0
    ])),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
