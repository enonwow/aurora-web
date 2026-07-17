import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { deflateSync } from "node:zlib";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-retail-progfx-type4-policy-artifacts.mjs"
);

describe("create-retail-progfx-type4-policy-artifacts", () => {
  it("writes blocked policy artifacts from a retail ProgFX Type 4 table audit", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-progfx-policy-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const customOverrideManifestPath = join(
      absoluteArtifactDir,
      "custom-progfx-param4-zero-override-manifest.json"
    );
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "audit-retail-progfx-type4-table-2026-07-03.json"),
      `${JSON.stringify({
        status: "found",
        source: "C:/NWN/data/nwn_base.key",
        visualEffectsSource: "C:/NWN/data/nwn_base.key",
        summary: {
          type4RowCount: 68,
          priorityRawCounts: { "13": 2, "20": 56, "49": 2 },
          proximitySuppressionBooleanCounts: { true: 8, false: 60, unknown: 0 },
          proximitySuppressionRawCounts: { "0": 60, "1": 8 },
          attachToSceneBooleanCounts: { true: 2, false: 66, unknown: 0 },
          attachToSceneRawCounts: { "0": 66, "1": 2 },
          nonItemRows: [
            {
              rowId: 333,
              label: "LightAreaBlackout",
              priorityRaw: "13",
              proximitySuppressionRaw: "0",
              attachToSceneRaw: "1"
            }
          ],
          proximitySuppressionRows: [
            {
              rowId: 328,
              label: "LightDarkvision",
              priorityRaw: "51",
              proximitySuppressionRaw: "1",
              attachToSceneRaw: "0"
            }
          ],
          attachToSceneRows: [
            {
              rowId: 333,
              label: "LightAreaBlackout",
              priorityRaw: "13",
              proximitySuppressionRaw: "0",
              attachToSceneRaw: "1"
            }
          ]
        },
        visualEffectsOwnerSummary: {
          type4OwnerPhaseCount: 77,
          nonItemOwnerPhaseCount: 21,
          nonItemVisionOwnerPhaseCount: 19,
          nonItemProximitySuppressionOwnerPhaseCount: 18,
          nonItemAttachToSceneOwnerPhaseCount: 1,
          ownerPhaseCounts: { duration: 39, cessation: 38 },
          nonItemOwnerRows: [
            {
              visualEffectRowId: 5,
              visualEffectLabel: "VFX_DUR_BLACKOUT",
              progFxRowId: 333,
              progFxLabel: "LightAreaBlackout",
              priorityRaw: "13",
              proximitySuppressionRaw: "0",
              attachToSceneRaw: "1"
            }
          ]
        }
      })}\n`
    );
    await writeFile(
      customOverrideManifestPath,
      `${JSON.stringify({
        status: "custom-param4-zero-override-pack-prepared-not-stock-retail-parity",
        customOverrideRequired: true,
        installsOverrideFiles: false,
        canonicalParityPromoted: false,
        customRows: {
          visualeffects2da: {
            rowId: 1302,
            progFxDuration: 1302
          },
          progfx2da: {
            rowId: 1302,
            param4Priority: "0"
          }
        },
        outputs: {
          visualeffects2da: {
            path: "custom/visualeffects.2da",
            sha256: "sha256-visualeffects"
          },
          progfx2da: {
            path: "custom/progfx.2da",
            sha256: "sha256-progfx"
          }
        }
      })}\n`
    );

    const { stdout } = await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir,
        "--customProgFxZeroOverrideManifest",
        customOverrideManifestPath
      ],
      { maxBuffer: 1024 * 1024 }
    );

    expect(JSON.parse(stdout)).toMatchObject({
      status: "retail-progfx-type4-policy-artifacts-written-runtime-still-blocked",
      type4RowCount: 68,
      type4OwnerPhaseCount: 77,
      outputs: [
        "retail-progfx-priority-policy.json",
        "retail-progfx-proximity-distance-sweep.json",
        "retail-progfx-attach-scene-restore.json"
      ]
    });
    const priorityPolicy = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-progfx-priority-policy.json"), "utf8")
    );
    expect(priorityPolicy).toMatchObject({
      version: "aurora-retail-progfx-type4-priority-policy/v1",
      passed: false,
      tableEvidence: {
        type4RowCount: 68,
        priorityRawCounts: { "13": 2, "20": 56, "49": 2 },
        priorityTableEvidence: expect.objectContaining({
          priorityZeroPresentInRetailType4Table: false,
          priorityZeroStockCoverageStatus:
            "stock-retail-type4-param4-zero-row-absent-custom-row-required",
          priorityZeroRows: []
        })
      },
      runtimeObservation: expect.objectContaining({
        priorityZeroPolicy:
          "custom-param4-zero-override-pack-prepared-runtime-capture-missing",
        customProgFxZeroOverride: expect.objectContaining({
          prepared: true,
          canonicalParityPromoted: false,
          installsOverrideFiles: false,
          outputs: expect.objectContaining({
            progfx2da: expect.objectContaining({
              sha256: "sha256-progfx"
            })
          })
        })
      }),
      blockedRuntimeFacts: expect.arrayContaining([
        "equal-priority tie behavior",
        "custom Param4=0 Type 4 runtime behavior still requires a recorded capture using the prepared override hashes"
      ])
    });
    const proximitySweep = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-progfx-proximity-distance-sweep.json"), "utf8")
    );
    expect(proximitySweep.sweep).toMatchObject({
      status: "not-run-retail-runtime-required",
      measuredThresholdMeters: null
    });
    const attachRestore = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-progfx-attach-scene-restore.json"), "utf8")
    );
    expect(attachRestore.restoreObservation).toMatchObject({
      status: "not-run-retail-runtime-required",
      sceneLightsRemovedWhileActive: null
    });
  });

  it("records present runtime captures without promoting ProgFX parity", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-progfx-policy-runtime-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "audit-retail-progfx-type4-table-2026-07-03.json"),
      `${JSON.stringify({
        source: "C:/NWN/data/nwn_base.key",
        visualEffectsSource: "C:/NWN/data/nwn_base.key",
        summary: {
          type4RowCount: 68,
          nonItemRows: [],
          proximitySuppressionRows: [],
          attachToSceneRows: []
        },
        visualEffectsOwnerSummary: {
          type4OwnerPhaseCount: 77,
          nonItemOwnerRows: []
        }
      })}\n`
    );
    for (const artifact of [
      "retail-progfx-priority-policy-before.png",
      "retail-progfx-priority-policy-after.png",
      "retail-progfx-proximity-distance-sweep-contact-sheet.png",
      "retail-progfx-proximity-distance-sweep-contact-sheet-near.png",
      "retail-progfx-proximity-distance-sweep-contact-sheet-mid.png",
      "retail-progfx-proximity-distance-sweep-contact-sheet-far.png",
      "retail-progfx-attach-scene-before.png",
      "retail-progfx-attach-scene-active.png",
      "retail-progfx-attach-scene-after-remove.png"
    ]) {
      await writeFile(join(absoluteArtifactDir, artifact), "png");
    }

    await execFileAsync(
      "node",
      [scriptPath, "--repoRoot", tempRoot, "--artifactDir", artifactDir],
      { maxBuffer: 1024 * 1024 }
    );

    const priorityPolicy = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-progfx-priority-policy.json"), "utf8")
    );
    expect(priorityPolicy).toMatchObject({
      status: "blocked-retail-runtime-priority-captures-present-scheduler-verdict-missing",
      passed: false,
      runtimeObservation: expect.objectContaining({
        status: "retail-priority-before-after-captures-present"
      })
    });
    const proximitySweep = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-progfx-proximity-distance-sweep.json"), "utf8")
    );
    expect(proximitySweep.sweep).toMatchObject({
      status: "retail-near-mid-far-contact-sheet-present-threshold-not-measured",
      measuredThresholdMeters: null
    });
    const attachRestore = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-progfx-attach-scene-restore.json"), "utf8")
    );
    expect(attachRestore.restoreObservation).toMatchObject({
      status: "retail-before-active-after-captures-present-restore-not-classified",
      sceneLightsRemovedWhileActive: null
    });
  });

  it("classifies retail ProgFX PNG pixels while keeping incomplete policy cases blocked", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-progfx-policy-pixels-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const customOverrideManifestPath = join(
      absoluteArtifactDir,
      "custom-progfx-param4-zero-override-manifest.json"
    );
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "audit-retail-progfx-type4-table-2026-07-03.json"),
      `${JSON.stringify({
        source: "C:/NWN/data/nwn_base.key",
        visualEffectsSource: "C:/NWN/data/nwn_base.key",
        summary: {
          type4RowCount: 68,
          priorityRawCounts: { "20": 56 },
          proximitySuppressionBooleanCounts: { true: 8, false: 60, unknown: 0 },
          attachToSceneBooleanCounts: { true: 2, false: 66, unknown: 0 },
          nonItemRows: [],
          proximitySuppressionRows: [],
          attachToSceneRows: []
        },
        visualEffectsOwnerSummary: {
          type4OwnerPhaseCount: 77,
          nonItemProximitySuppressionOwnerPhaseCount: 18,
          nonItemAttachToSceneOwnerPhaseCount: 1,
          nonItemOwnerRows: []
        }
      })}\n`
    );
    const priorityDriverPath = join(
      tempRoot,
      "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/generated-scripts/als_pfxpri.nss"
    );
    await mkdir(join(priorityDriverPath, ".."), { recursive: true });
    await writeFile(
      priorityDriverPath,
      [
        'DelayCommand(1.0, AlsApplyVfxRow(VFX_DUR_LIGHT_BLUE_5, 8.0));',
        'DelayCommand(1.0, AlsApplyVfxRow(VFX_DUR_LIGHT_YELLOW_5, 8.0));',
        'DelayCommand(2.0, AlsCaptureCue("retail-progfx-priority-policy-after.png"));'
      ].join("\n")
    );
    const proximityDriverPath = join(
      tempRoot,
      "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/generated-scripts/als_pfxprox.nss"
    );
    await mkdir(join(proximityDriverPath, ".."), { recursive: true });
    await writeFile(
      proximityDriverPath,
      [
        "AlsApplyVfxRow(VFX_DUR_DARKVISION, 18.0);",
        'DelayCommand(1.0, AlsCaptureCue("retail-progfx-proximity-distance-sweep-contact-sheet.png sample=near"));',
        "DelayCommand(3.0, AssignCommand(oTarget, JumpToLocation(AlsStageLocation(75.0, 65.0, 0.0, 0.0))));",
        'DelayCommand(4.0, AlsCaptureCue("retail-progfx-proximity-distance-sweep-contact-sheet.png sample=mid"));',
        "DelayCommand(6.0, AssignCommand(oTarget, JumpToLocation(AlsStageLocation(85.0, 65.0, 0.0, 0.0))));",
        'DelayCommand(7.0, AlsCaptureCue("retail-progfx-proximity-distance-sweep-contact-sheet.png sample=far"));'
      ].join("\n")
    );
    const moduleInjectionSummaryPath = join(
      tempRoot,
      "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/compiled-driver-module-injection-summary.json"
    );
    await mkdir(join(moduleInjectionSummaryPath, ".."), { recursive: true });
    await writeFile(
      moduleInjectionSummaryPath,
      `${JSON.stringify({
        runtimeAutostart: {
          moduleStartLocation: {
            next: {
              area: "als_light_lab",
              x: 65,
              y: 55,
              z: 0,
              dirX: 0,
              dirY: 1
            }
          }
        },
        stageArea: {
          runtimeListsPruned: {
            git: { "Creature List": { previousCount: 1, nextCount: 0 } },
            gic: { "Creature List": { previousCount: 1, nextCount: 0 } }
          }
        }
      })}\n`
    );
    await writeFile(
      customOverrideManifestPath,
      `${JSON.stringify({
        status: "custom-param4-zero-override-pack-prepared-not-stock-retail-parity",
        customOverrideRequired: true,
        installsOverrideFiles: false,
        canonicalParityPromoted: false,
        customRows: {
          visualeffects2da: {
            rowId: 1302,
            progFxDuration: 1302
          },
          progfx2da: {
            rowId: 1302,
            param4Priority: "0"
          }
        },
        outputs: {
          visualeffects2da: {
            path: "custom/visualeffects.2da",
            sha256: "sha256-visualeffects"
          },
          progfx2da: {
            path: "custom/progfx.2da",
            sha256: "sha256-progfx"
          }
        }
      })}\n`
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-progfx-priority-policy-before.png"),
      makePngRgba(1000, 500, [40, 40, 40, 255], [])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-progfx-priority-policy-after.png"),
      makePngRgba(1000, 500, [40, 40, 40, 255], [
        { x: 720, y: 285, width: 20, height: 10, rgba: [170, 160, 65, 255] }
      ])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-progfx-priority-policy-custom-zero-before.png"),
      makePngRgba(1000, 500, [40, 40, 40, 255], [])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-progfx-priority-policy-custom-zero-after.png"),
      makePngRgba(1000, 500, [40, 40, 40, 255], [
        { x: 720, y: 285, width: 20, height: 10, rgba: [40, 170, 230, 255] }
      ])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-progfx-proximity-distance-sweep-contact-sheet.png"),
      makePngRgba(1000, 500, [40, 40, 40, 255], [])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-progfx-proximity-distance-sweep-contact-sheet-near.png"),
      makePngRgba(1000, 500, [40, 40, 40, 255], [
        { x: 720, y: 285, width: 5, height: 5, rgba: [40, 170, 230, 255] }
      ])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-progfx-proximity-distance-sweep-contact-sheet-mid.png"),
      makePngRgba(1000, 500, [40, 40, 40, 255], [
        { x: 720, y: 285, width: 30, height: 30, rgba: [40, 170, 230, 255] }
      ])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-progfx-proximity-distance-sweep-contact-sheet-far.png"),
      makePngRgba(1000, 500, [40, 40, 40, 255], [
        { x: 720, y: 285, width: 30, height: 30, rgba: [40, 170, 230, 255] }
      ])
    );
    for (const artifact of [
      "retail-progfx-attach-scene-before.png",
      "retail-progfx-attach-scene-active.png",
      "retail-progfx-attach-scene-after-remove.png"
    ]) {
      await writeFile(
        join(absoluteArtifactDir, artifact),
        makePngRgba(1000, 500, [40, 40, 40, 255], [
          { x: 560, y: 360, width: 50, height: 50, rgba: [240, 220, 80, 255] },
          { x: 820, y: 80, width: 50, height: 50, rgba: [240, 220, 80, 255] },
          { x: 720, y: 285, width: 30, height: 30, rgba: [40, 170, 230, 255] }
        ])
      );
    }

    await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir,
        "--customProgFxZeroOverrideManifest",
        customOverrideManifestPath
      ],
      { maxBuffer: 1024 * 1024 * 4 }
    );

    const priorityPolicy = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-progfx-priority-policy.json"), "utf8")
    );
    expect(priorityPolicy).toMatchObject({
      status:
        "blocked-retail-runtime-priority-pixels-classified-tie-candidate-custom-zero-captured",
      passed: false,
      runtimeObservation: {
        status: "retail-priority-before-after-pixels-classified",
        tiePolicy:
          "retail-pixel-candidate-equal-priority-yellow-over-blue-observed-dataflow-still-blocked",
        equalPriorityTieCandidate: expect.objectContaining({
          status:
            "retail-pixel-candidate-equal-priority-yellow-over-blue-observed-dataflow-still-blocked",
          candidateObserved: true,
          sameTimestampBlueYellowRequests: true,
          blueBeforeYellowInScript: true,
          priority20HasTie: true,
          dominantCapturedSignal: "warm-yellow",
          afterBlueSignalCount: 0
        }),
        pixelClassification: expect.objectContaining({
          status: "retail-priority-type4-light-signal-observed-after-simultaneous-requests",
          visibleType4VfxAppears: true,
          dominantCapturedSignal: "warm-yellow",
          afterType4LightSignal: expect.objectContaining({
            dominantSignal: "warm-yellow"
          })
        }),
        customPriorityZeroRuntimeObservation: expect.objectContaining({
          status: "custom-param4-zero-before-after-pixels-classified",
          stockRetailParityPromoted: false,
          pixelClassification: expect.objectContaining({
            status: "custom-param4-zero-blue-vfx-appears-with-override-loaded",
            visibleType4VfxAppears: true
          })
        }),
        priorityZeroPolicy:
          "custom-param4-zero-override-runtime-capture-present-not-stock-retail-parity"
      }
    });
    const proximitySweep = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-progfx-proximity-distance-sweep.json"), "utf8")
    );
    expect(proximitySweep).toMatchObject({
      status: "blocked-retail-runtime-proximity-pixels-classified-threshold-owner-still-missing",
      passed: false,
      sweep: {
        status: "retail-near-mid-far-pixels-classified-threshold-bracket-only",
        pixelClassification: expect.objectContaining({
          nearSuppressedOrReduced: true,
          midFarRestored: true,
          thresholdBracketAuroraUnits: expect.objectContaining({
            nearDistanceFromStageReferenceAuroraUnits: 10,
            midRestoredDistanceFromStageReferenceAuroraUnits: 10,
            farActiveDistanceFromStageReferenceAuroraUnits: 20
          })
        }),
        measuredThresholdMeters: null,
        measuredThresholdAuroraUnits: null,
        thresholdBracket: "between the scripted near sample and the scripted mid sample",
        thresholdBracketAuroraUnits: expect.objectContaining({
          nearDistanceFromStageReferenceAuroraUnits: 10,
          midRestoredDistanceFromStageReferenceAuroraUnits: 10,
          farActiveDistanceFromStageReferenceAuroraUnits: 20
        }),
        sampleLocations: expect.objectContaining({
          near: expect.objectContaining({
            status: "fixture-start-location",
            location: expect.objectContaining({ x: 65, y: 55, z: 0 }),
            distanceFromStageReferenceAuroraUnits: 10
          }),
          mid: expect.objectContaining({
            location: expect.objectContaining({ x: 75, y: 65, z: 0, facing: 0 }),
            distanceFromStageReferenceAuroraUnits: 10
          }),
          far: expect.objectContaining({
            location: expect.objectContaining({ x: 85, y: 65, z: 0, facing: 0 }),
            distanceFromStageReferenceAuroraUnits: 20
          })
        })
      }
    });
    const attachRestore = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-progfx-attach-scene-restore.json"), "utf8")
    );
    expect(attachRestore).toMatchObject({
      status:
        "blocked-retail-runtime-attach-pixels-classified-no-removal-observed-scheduler-still-missing",
      passed: false,
      restoreObservation: {
        status: "retail-before-active-after-pixels-classified-no-scene-light-removal-observed",
        sceneLightsRemovedWhileActive: false,
        afterRemoveState: "matches-active-and-before-within-selected-light-ROIs"
      }
    });
  });
});

function makePngRgba(
  width: number,
  height: number,
  background: [number, number, number, number],
  rects: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    rgba: [number, number, number, number];
  }>
) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      const color =
        rects.find(
          (rect) =>
            x >= rect.x &&
            x < rect.x + rect.width &&
            y >= rect.y &&
            y < rect.y + rect.height
        )?.rgba ?? background;
      const offset = rowOffset + 1 + x * 4;
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
      raw[offset + 3] = color[3];
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
