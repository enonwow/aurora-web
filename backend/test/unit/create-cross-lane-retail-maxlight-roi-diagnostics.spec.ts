import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { deflateSync } from "node:zlib";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-cross-lane-retail-maxlight-roi-diagnostics.mjs"
);

describe("create-cross-lane-retail-maxlight-roi-diagnostics", () => {
  it("writes offline ROI heatmaps without promoting owner-order parity", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-cross-lane-roi-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const variant3Dir = join(absoluteArtifactDir, "retail-maxlights-3");
    const variant32Dir = join(absoluteArtifactDir, "retail-maxlights-32");
    const noItemVariant3Dir = join(absoluteArtifactDir, "retail-noitem-maxlights-3");
    const noItemVariant32Dir = join(absoluteArtifactDir, "retail-noitem-maxlights-32");
    await mkdir(variant3Dir, { recursive: true });
    await mkdir(variant32Dir, { recursive: true });
    await mkdir(noItemVariant3Dir, { recursive: true });
    await mkdir(noItemVariant32Dir, { recursive: true });

    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-before-budget.png"),
      makeSplitPngRgba(8, 8, [10, 10, 10, 255], [10, 10, 10, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-after-budget.png"),
      makeSplitPngRgba(8, 8, [10, 10, 10, 255], [80, 20, 20, 255])
    );
    await writeFile(
      join(variant3Dir, "retail-cross-lane-all-lanes-before-budget.png"),
      makeSplitPngRgba(8, 8, [10, 10, 10, 255], [10, 10, 10, 255])
    );
    await writeFile(
      join(variant3Dir, "retail-cross-lane-all-lanes-after-budget.png"),
      makeSplitPngRgba(8, 8, [10, 10, 10, 255], [30, 10, 10, 255])
    );
    await writeFile(
      join(variant32Dir, "retail-cross-lane-all-lanes-before-budget.png"),
      makeSplitPngRgba(8, 8, [10, 10, 10, 255], [10, 10, 10, 255])
    );
    await writeFile(
      join(variant32Dir, "retail-cross-lane-all-lanes-after-budget.png"),
      makeSplitPngRgba(8, 8, [10, 10, 10, 255], [90, 20, 10, 255])
    );
    await writeFile(
      join(noItemVariant3Dir, "retail-cross-lane-no-item-before-budget.png"),
      makeSplitPngRgba(8, 8, [10, 10, 10, 255], [10, 10, 10, 255])
    );
    await writeFile(
      join(noItemVariant3Dir, "retail-cross-lane-no-item-after-budget.png"),
      makeSplitPngRgba(8, 8, [10, 10, 10, 255], [12, 10, 10, 255])
    );
    await writeFile(
      join(noItemVariant32Dir, "retail-cross-lane-no-item-before-budget.png"),
      makeSplitPngRgba(8, 8, [10, 10, 10, 255], [10, 10, 10, 255])
    );
    await writeFile(
      join(noItemVariant32Dir, "retail-cross-lane-no-item-after-budget.png"),
      makeSplitPngRgba(8, 8, [10, 10, 10, 255], [12, 10, 10, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-max-light-variant-observation.json"),
      `${JSON.stringify({
        status: "blocked-retail-max-light-variant-captures-present-slot-owner-classifier-required",
        variants: [
          {
            maxLights: 3,
            beforeBudget: {
              path: `${artifactDir}/retail-maxlights-3/retail-cross-lane-all-lanes-before-budget.png`
            },
            afterBudget: {
              path: `${artifactDir}/retail-maxlights-3/retail-cross-lane-all-lanes-after-budget.png`
            }
          },
          {
            maxLights: 32,
            beforeBudget: {
              path: `${artifactDir}/retail-maxlights-32/retail-cross-lane-all-lanes-before-budget.png`
            },
            afterBudget: {
              path: `${artifactDir}/retail-maxlights-32/retail-cross-lane-all-lanes-after-budget.png`
            }
          }
        ]
      })}\n`
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-no-item-max-light-variant-observation.json"),
      `${JSON.stringify({
        status: "blocked-retail-max-light-variant-captures-present-slot-owner-classifier-required",
        variants: [
          {
            maxLights: 3,
            beforeBudget: {
              path: `${artifactDir}/retail-noitem-maxlights-3/retail-cross-lane-no-item-before-budget.png`
            },
            afterBudget: {
              path: `${artifactDir}/retail-noitem-maxlights-3/retail-cross-lane-no-item-after-budget.png`
            }
          },
          {
            maxLights: 32,
            beforeBudget: {
              path: `${artifactDir}/retail-noitem-maxlights-32/retail-cross-lane-no-item-before-budget.png`
            },
            afterBudget: {
              path: `${artifactDir}/retail-noitem-maxlights-32/retail-cross-lane-no-item-after-budget.png`
            }
          }
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
        artifactDir,
        "--sampleWidth",
        "24",
        "--sampleHeight",
        "18",
        "--ablationObservation",
        "retail-cross-lane-no-item-max-light-variant-observation.json"
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    const report = JSON.parse(
      await readFile(
        join(absoluteArtifactDir, "cross-lane-retail-maxlight-roi-diagnostics.json"),
        "utf8"
      )
    );
    const heatmap = await readFile(
      join(absoluteArtifactDir, "retail-cross-lane-maxlights-3-vs-32-after-roi-heatmap.png")
    );

    expect(cli).toMatchObject({
      status: "retail-maxlight-roi-diagnostics-written-owner-classifier-still-blocked",
      canonicalParityPromoted: false,
      summary: {
        caseCount: 5,
        generatedCaseCount: 5,
        ablationComparisonStatus: "ablation-roi-diagnostics-written-parity-still-blocked",
        ablationComparisonCaseCount: 6,
        ablationComparisonGeneratedCaseCount: 6,
        ablationProvesPixelEffect: true,
        budgetSensitiveCaseCount: 4,
        provesBudgetSensitiveRetailPixels: true,
        provesAcceptedDroppedOwnerMapping: false
      }
    });
    expect(report).toMatchObject({
      passed: false,
      canonicalParityPromoted: false,
      safety: {
        launchesRetailProcess: false,
        usesGlobalCursor: false
      },
      summary: {
        heatmapCount: 5,
        ablationComparisonStatus: "ablation-roi-diagnostics-written-parity-still-blocked",
        provesDirectRendererSlotOrder: false,
        provesCanonicalParity: false
      }
    });
    expect(report.ablationComparison).toMatchObject({
      status: "ablation-roi-diagnostics-written-parity-still-blocked",
      canonicalParityPromoted: false,
      summary: {
        generatedCaseCount: 6,
        provesAblationPixelEffect: true,
        provesAcceptedDroppedOwnerMapping: false,
        provesDirectRendererSlotOrder: false,
        provesCanonicalParity: false
      }
    });
    expect(report.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          caseId: "maxlights-3-vs-32-after-budget",
          metric: expect.objectContaining({
            changedSampleRatioGt5: expect.any(Number),
            changedBoundsGt5: expect.objectContaining({
              x: expect.any(Number),
              y: expect.any(Number)
            }),
            grid: expect.objectContaining({
              topHotCells: expect.arrayContaining([
                expect.objectContaining({
                  changedSampleRatioGt5: expect.any(Number)
                })
              ])
            })
          }),
          proofScope: {
            provesBudgetSensitiveRetailPixels: true,
            provesAcceptedDroppedOwnerMapping: false,
            provesDirectRendererSlotOrder: false,
            provesCanonicalParity: false
          }
        })
      ])
    );
    expect(heatmap.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });

  it("evaluates isolated lane-reference owner candidates without promoting canonical parity", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-cross-lane-owner-classifier-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const variant3Dir = join(absoluteArtifactDir, "retail-maxlights-3");
    const variant32Dir = join(absoluteArtifactDir, "retail-maxlights-32");
    await mkdir(variant3Dir, { recursive: true });
    await mkdir(variant32Dir, { recursive: true });

    const dark: [number, number, number, number] = [10, 10, 10, 255];
    const rightHot: [number, number, number, number] = [90, 20, 20, 255];
    const leftHot: [number, number, number, number] = [80, 80, 20, 255];
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-openpad-smoke.png"),
      makeSplitPngRgba(8, 8, dark, dark)
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-ref-tile-main-light.png"),
      makeSplitPngRgba(8, 8, leftHot, dark)
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-ref-tile-source-light.png"),
      makeSplitPngRgba(8, 8, dark, rightHot)
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-ref-placeable-lightcolor.png"),
      makeSplitPngRgba(8, 8, leftHot, dark)
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-ref-mdl-source-light.png"),
      makeSplitPngRgba(8, 8, leftHot, dark)
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-ref-item-property-light.png"),
      makeSplitPngRgba(8, 8, leftHot, dark)
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-ref-progfx-type4-light.png"),
      makeSplitPngRgba(8, 8, leftHot, dark)
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-before-budget.png"),
      makeSplitPngRgba(8, 8, dark, dark)
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-all-lanes-after-budget.png"),
      makeSplitPngRgba(8, 8, dark, rightHot)
    );
    await writeFile(
      join(variant3Dir, "retail-cross-lane-all-lanes-before-budget.png"),
      makeSplitPngRgba(8, 8, dark, dark)
    );
    await writeFile(
      join(variant3Dir, "retail-cross-lane-all-lanes-after-budget.png"),
      makeSplitPngRgba(8, 8, dark, rightHot)
    );
    await writeFile(
      join(variant32Dir, "retail-cross-lane-all-lanes-before-budget.png"),
      makeSplitPngRgba(8, 8, dark, dark)
    );
    await writeFile(
      join(variant32Dir, "retail-cross-lane-all-lanes-after-budget.png"),
      makeSplitPngRgba(8, 8, dark, rightHot)
    );
    await writeFile(
      join(absoluteArtifactDir, "retail-cross-lane-max-light-variant-observation.json"),
      `${JSON.stringify({
        status: "blocked-retail-max-light-variant-captures-present-slot-owner-classifier-required",
        variants: [
          {
            maxLights: 3,
            beforeBudget: {
              path: `${artifactDir}/retail-maxlights-3/retail-cross-lane-all-lanes-before-budget.png`
            },
            afterBudget: {
              path: `${artifactDir}/retail-maxlights-3/retail-cross-lane-all-lanes-after-budget.png`
            }
          },
          {
            maxLights: 32,
            beforeBudget: {
              path: `${artifactDir}/retail-maxlights-32/retail-cross-lane-all-lanes-before-budget.png`
            },
            afterBudget: {
              path: `${artifactDir}/retail-maxlights-32/retail-cross-lane-all-lanes-after-budget.png`
            }
          }
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
        artifactDir,
        "--sampleWidth",
        "24",
        "--sampleHeight",
        "18"
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    const report = JSON.parse(
      await readFile(
        join(absoluteArtifactDir, "cross-lane-retail-maxlight-roi-diagnostics.json"),
        "utf8"
      )
    );

    expect(cli).toMatchObject({
      status: "retail-maxlight-roi-diagnostics-written-owner-classifier-evaluated-still-blocked",
      canonicalParityPromoted: false
    });
    expect(report).toMatchObject({
      passed: false,
      canonicalParityPromoted: false,
      summary: {
        ownerClassifierEvaluated: true,
        provesPartialOwnerCandidates: true,
        provesAcceptedDroppedOwnerMapping: false,
        provesDirectRendererSlotOrder: false,
        provesCanonicalParity: false
      },
      ownerClassifier: {
        evaluated: true,
        canonicalParityPromoted: false,
        summary: {
          provesPartialOwnerCandidates: true,
          provesAcceptedDroppedOwnerMapping: false,
          provesDirectRendererSlotOrder: false,
          provesCanonicalParity: false
        }
      }
    });
    expect(report.ownerClassifier.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          strongCandidate: true,
          topLaneCandidate: "terrain-tile-source-light"
        })
      ])
    );
  });
});

function makeSplitPngRgba(
  width: number,
  height: number,
  leftRgba: [number, number, number, number],
  rightRgba: [number, number, number, number]
) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      const source = x < width / 2 ? leftRgba : rightRgba;
      const offset = rowOffset + 1 + x * 4;
      raw[offset] = source[0];
      raw[offset + 1] = source[1];
      raw[offset + 2] = source[2];
      raw[offset + 3] = source[3];
    }
  }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk(
      "IHDR",
      Buffer.from([
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
      ])
    ),
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
