import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { deflateSync } from "node:zlib";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-area-lighting-retail-active-slot-observation.mjs"
);

const tinyPngHeader = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000200000003080200000000000000",
  "hex"
);

describe("create-area-lighting-retail-active-slot-observation", () => {
  it("writes an honest structured oracle without inventing renderer slot order", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-active-slots-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const logPath = join(tempRoot, "nwclientLog1.txt");
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-before-budget.png"),
      tinyPngHeader
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-after-budget.png"),
      tinyPngHeader
    );
    await writeFile(
      logPath,
      [
        "ALS_BEGIN cross-lane: tile/placeable/MDL/item/ProgFX lanes must all be visible",
        "ALS_OBSERVE cross-lane lane-map: tile-main=blue/red",
        "ALS_CAPTURE retail-cross-lane-active-slots.json requires direct renderer slot dump"
      ].join("\n")
    );

    const { stdout } = await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir,
        "--clientLog",
        logPath
      ],
      { maxBuffer: 1024 * 1024 }
    );

    expect(JSON.parse(stdout)).toMatchObject({
      status: "blocked-no-direct-retail-active-slot-dump",
      directRetailSlotDumpAvailable: false,
      runtimePixelEvidencePresent: true,
      runtimeLogCuePresent: true,
      canonicalParityPromoted: false
    });
    const report = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-cross-lane-active-slots.json"), "utf8")
    );
    expect(report).toMatchObject({
      status: "blocked-no-direct-retail-active-slot-dump",
      passed: false,
      canonicalParityPromoted: false,
      directRetailSlotDumpAvailable: false,
      directRendererSlotOrderObserved: false,
      slotOrderingProofStatus: "blocked-no-direct-retail-active-slot-dump",
      acceptedSlots: [],
      droppedSlots: []
    });
    expect(report.laneOwners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lane: "placeables-2da-light" }),
        expect.objectContaining({ lane: "item-property-light" }),
        expect.objectContaining({ lane: "progfx-type4-light-or-vision" })
      ])
    );
  });

  it("adds max-light variant pixel metrics while keeping accepted slots empty without references", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-active-slots-variants-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const variant3Dir = join(absoluteArtifactDir, "retail-maxlights-3");
    const variant32Dir = join(absoluteArtifactDir, "retail-maxlights-32");
    const logPath = join(tempRoot, "nwclientLog1.txt");
    await mkdir(variant3Dir, { recursive: true });
    await mkdir(variant32Dir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-before-budget.png"),
      tinyPngHeader
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-after-budget.png"),
      tinyPngHeader
    );
    await writeFile(
      logPath,
      [
        "ALS_BEGIN cross-lane: tile/placeable/MDL/item/ProgFX lanes must all be visible",
        "ALS_CAPTURE retail-cross-lane-all-lanes-before-budget.png",
        "ALS_CAPTURE retail-cross-lane-all-lanes-after-budget.png"
      ].join("\n")
    );
    const variants: Array<[string, [number, number, number, number]]> = [
      [variant3Dir, [10, 10, 10, 255]],
      [variant32Dir, [60, 30, 10, 255]]
    ];
    for (const [dir, color] of variants) {
      await writeFile(
        join(dir, "retail-cross-lane-all-lanes-before-budget.png"),
        makePngRgba(4, 4, [10, 10, 10, 255])
      );
      await writeFile(
        join(dir, "retail-cross-lane-all-lanes-after-budget.png"),
        makePngRgba(4, 4, color)
      );
    }
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-max-light-variant-observation.json"),
      `${JSON.stringify({
        status: "blocked-retail-max-light-variant-captures-present-slot-owner-classifier-required",
        directRetailSlotDumpAvailable: false,
        directRendererSlotOrderObserved: false,
        variants: [
          {
            maxLights: 3,
            captureStatus: "finished",
            capturedCount: 5,
            beforeBudget: {
              status: "present",
              path: `${artifactDir}/retail-maxlights-3/retail-cross-lane-all-lanes-before-budget.png`
            },
            afterBudget: {
              status: "present",
              path: `${artifactDir}/retail-maxlights-3/retail-cross-lane-all-lanes-after-budget.png`
            }
          },
          {
            maxLights: 32,
            captureStatus: "finished",
            capturedCount: 5,
            beforeBudget: {
              status: "present",
              path: `${artifactDir}/retail-maxlights-32/retail-cross-lane-all-lanes-before-budget.png`
            },
            afterBudget: {
              status: "present",
              path: `${artifactDir}/retail-maxlights-32/retail-cross-lane-all-lanes-after-budget.png`
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
        artifactDir,
        "--clientLog",
        logPath
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const report = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-cross-lane-active-slots.json"), "utf8")
    );
    expect(report).toMatchObject({
      passed: false,
      directRetailSlotDumpAvailable: false,
      acceptedSlots: [],
      droppedSlots: [],
      budget: {
        mode: "retail-max-light-variants-observed-no-direct-active-slot-dump",
        maxLightVariantsObserved: [3, 32]
      },
      observations: {
        maxLightVariantObservation: {
          status: "present",
          variantMetricsEvaluated: true,
          classifierGrade: false,
          budgetSensitivityStatus: "retail-max-light-variant-pixel-metrics-evaluated",
          strongerPixelOracleStatus: "blocked-isolated-lane-reference-captures-missing",
          missingIsolatedReferenceArtifacts: expect.arrayContaining([
            "retail-ref-tile-main-light.png",
            "retail-ref-progfx-type4-light.png"
          ])
        }
      }
    });
    expect(report.observations.maxLightVariantObservation.variantPixelMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          maxLights: 3,
          status: "variant-pixel-metric-evaluated",
          metric: expect.objectContaining({
            changedSampleRatioGt5: 0
          })
        }),
        expect.objectContaining({
          maxLights: 32,
          status: "variant-pixel-metric-evaluated",
          metric: expect.objectContaining({
            changedSampleRatioGt5: 1
          })
        })
      ])
    );
  });

  it("uses durable max-light active-slot cues when the live NWN client log has rotated", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-active-slots-durable-cue-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const variant3Dir = join(absoluteArtifactDir, "retail-maxlights-3");
    const variant32Dir = join(absoluteArtifactDir, "retail-maxlights-32");
    const rotatedLogPath = join(tempRoot, "missing-nwclientLog1.txt");
    await mkdir(variant3Dir, { recursive: true });
    await mkdir(variant32Dir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-before-budget.png"),
      tinyPngHeader
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-after-budget.png"),
      tinyPngHeader
    );
    for (const [dir, color] of [
      [variant3Dir, [40, 20, 10, 255]],
      [variant32Dir, [70, 40, 20, 255]]
    ] as Array<[string, [number, number, number, number]]>) {
      await writeFile(
        join(dir, "retail-cross-lane-all-lanes-before-budget.png"),
        makePngRgba(4, 4, [10, 10, 10, 255])
      );
      await writeFile(
        join(dir, "retail-cross-lane-all-lanes-after-budget.png"),
        makePngRgba(4, 4, color)
      );
    }
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-max-light-variant-observation.json"),
      `${JSON.stringify({
        status: "blocked-retail-max-light-variant-captures-present-slot-owner-classifier-required",
        directRetailSlotDumpAvailable: false,
        directRendererSlotOrderObserved: false,
        variants: [3, 32].map((maxLights) => ({
          maxLights,
          captureStatus: "finished",
          capturedCount: 5,
          beforeBudget: {
            status: "present",
            path: `${artifactDir}/retail-maxlights-${maxLights}/retail-cross-lane-all-lanes-before-budget.png`
          },
          afterBudget: {
            status: "present",
            path: `${artifactDir}/retail-maxlights-${maxLights}/retail-cross-lane-all-lanes-after-budget.png`
          },
          activeSlotCue: {
            artifactCue: "retail-cross-lane-active-slots.json",
            line:
              "ALS_CAPTURE retail-cross-lane-active-slots.json requires direct renderer slot dump or pixel-observation JSON; do not infer parity from this cue",
            captured: false,
            reason: "json-cue-not-fabricated"
          }
        }))
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
        "--clientLog",
        rotatedLogPath
      ],
      { maxBuffer: 1024 * 1024 }
    );

    expect(JSON.parse(stdout)).toMatchObject({
      status: "blocked-no-direct-retail-active-slot-dump",
      runtimePixelEvidencePresent: true,
      runtimeLogCuePresent: true,
      canonicalParityPromoted: false
    });
    const report = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-cross-lane-active-slots.json"), "utf8")
    );
    expect(report).toMatchObject({
      status: "blocked-no-direct-retail-active-slot-dump",
      acceptedSlots: [],
      droppedSlots: [],
      observations: {
        logEvidence: {
          status: "missing-log"
        },
        durableCaptureCueEvidence: {
          status: "cross-lane-active-slot-cues-present-in-maxlight-observation",
          cues: [
            expect.objectContaining({
              maxLights: 3,
              artifactCue: "retail-cross-lane-active-slots.json",
              captured: false,
              reason: "json-cue-not-fabricated"
            }),
            expect.objectContaining({
              maxLights: 32,
              artifactCue: "retail-cross-lane-active-slots.json"
            })
          ]
        },
        runtimeLogCueSource: "durable-maxlight-observation-active-slot-cue"
      }
    });
  });

  it("selects a valid fallback isolated reference when the canonical capture is not gameplay", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-active-slots-ref-fallback-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const variant3Dir = join(absoluteArtifactDir, "retail-maxlights-3");
    const variant32Dir = join(absoluteArtifactDir, "retail-maxlights-32");
    const logPath = join(tempRoot, "nwclientLog1.txt");
    await mkdir(variant3Dir, { recursive: true });
    await mkdir(variant32Dir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-before-budget.png"),
      tinyPngHeader
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-after-budget.png"),
      tinyPngHeader
    );
    await writeFile(
      logPath,
      [
        "ALS_BEGIN cross-lane: tile/placeable/MDL/item/ProgFX lanes must all be visible",
        "ALS_CAPTURE retail-cross-lane-all-lanes-before-budget.png",
        "ALS_CAPTURE retail-cross-lane-all-lanes-after-budget.png"
      ].join("\n")
    );
    for (const dir of [variant3Dir, variant32Dir]) {
      await writeFile(
        join(dir, "retail-cross-lane-all-lanes-before-budget.png"),
        makePngRgba(4, 4, [10, 10, 10, 255])
      );
      await writeFile(
        join(dir, "retail-cross-lane-all-lanes-after-budget.png"),
        makePngRgba(4, 4, [70, 40, 20, 255])
      );
    }
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-max-light-variant-observation.json"),
      `${JSON.stringify({
        status: "blocked-retail-max-light-variant-captures-present-slot-owner-classifier-required",
        directRetailSlotDumpAvailable: false,
        directRendererSlotOrderObserved: false,
        variants: [
          {
            maxLights: 3,
            captureStatus: "finished",
            capturedCount: 5,
            beforeBudget: {
              status: "present",
              path: `${artifactDir}/retail-maxlights-3/retail-cross-lane-all-lanes-before-budget.png`
            },
            afterBudget: {
              status: "present",
              path: `${artifactDir}/retail-maxlights-3/retail-cross-lane-all-lanes-after-budget.png`
            }
          },
          {
            maxLights: 32,
            captureStatus: "finished",
            capturedCount: 5,
            beforeBudget: {
              status: "present",
              path: `${artifactDir}/retail-maxlights-32/retail-cross-lane-all-lanes-before-budget.png`
            },
            afterBudget: {
              status: "present",
              path: `${artifactDir}/retail-maxlights-32/retail-cross-lane-all-lanes-after-budget.png`
            }
          }
        ]
      })}\n`
    );
    for (const reference of [
      "retail-ref-tile-main-light.png",
      "retail-ref-tile-source-light.png",
      "retail-ref-placeable-lightcolor.png",
      "retail-ref-mdl-source-light.png",
      "retail-ref-item-property-light.png"
    ]) {
      await writeFile(
        join(absoluteArtifactDir, reference),
        makePngRgba(640, 480, [55, 45, 35, 255])
      );
    }
    await writeFile(
      join(absoluteArtifactDir, "retail-ref-progfx-type4-light.png"),
      makePngRgba(640, 480, [0, 0, 0, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-ref-progfx-type4-light-openpad-fallback.png"),
      makePngRgba(640, 480, [55, 45, 35, 255])
    );

    await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir,
        "--clientLog",
        logPath
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const report = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-cross-lane-active-slots.json"), "utf8")
    );
    expect(report).toMatchObject({
      passed: false,
      directRetailSlotDumpAvailable: false,
      acceptedSlots: [],
      droppedSlots: [],
      observations: {
        maxLightVariantObservation: {
          classifierGrade: true,
          strongerPixelOracleStatus: "candidate-inputs-present-lane-owner-evaluator-still-required",
          fallbackIsolatedReferenceArtifacts: [
            {
              canonicalName: "retail-ref-progfx-type4-light.png",
              selectedName: "retail-ref-progfx-type4-light-openpad-fallback.png",
              canonicalVisualStatus: "invalid-loading-screen-or-black-frame"
            }
          ]
        },
        laneOwnerPixelClassifier: {
          status: "blocked-owner-classifier-ambiguous",
          passed: false,
          provesAcceptedDroppedOwnerMapping: false,
          selectedReferenceCount: 6
        }
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
