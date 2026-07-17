import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { deflateSync } from "node:zlib";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-area-lighting-pixel-diff-artifacts.mjs"
);

describe("create-area-lighting-pixel-diff-artifacts", () => {
  it("writes diagnostic heatmap PNGs and a non-parity JSON report", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-pixel-diff-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    await mkdir(absoluteArtifactDir, { recursive: true });

    const fixtures: Record<string, [number, number, [number, number, number, number]]> = {
      "retail-or-toolset-shadowvol-campfire.png": [4, 4, [80, 80, 80, 255]],
      "aurora-web-shadowvol-campfire.png": [2, 2, [20, 20, 20, 255]],
      "retail-progfx-blindvision-before.png": [4, 4, [10, 20, 30, 255]],
      "retail-progfx-blindvision-active.png": [4, 4, [40, 50, 60, 255]],
      "retail-cross-lane-all-lanes-before-budget.png": [4, 4, [5, 5, 5, 255]],
      "retail-cross-lane-all-lanes-after-budget.png": [4, 4, [50, 5, 5, 255]]
    };
    for (const [name, [width, height, color]] of Object.entries(fixtures)) {
      await writeFile(join(absoluteArtifactDir, name), makePngRgba(width, height, color));
    }

    const { stdout } = await execFileAsync(
      "node",
      [scriptPath, "--repoRoot", tempRoot, "--artifactDir", artifactDir],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    const report = JSON.parse(
      await readFile(join(absoluteArtifactDir, "area-lighting-pixel-diff-artifacts.json"), "utf8")
    );
    const shadowDiff = await readFile(
      join(absoluteArtifactDir, "shadowvol-campfire-retail-web-diff-normalized.png")
    );

    expect(cli).toMatchObject({
      status: "pixel-diff-artifacts-written-parity-still-blocked",
      summary: {
        caseCount: 3,
        generatedCaseCount: 3,
        missingInputCaseCount: 0
      }
    });
    expect(report).toMatchObject({
      passed: false,
      canonicalParityPromoted: false,
      summary: {
        generatedCaseCount: 3
      }
    });
    expect(report.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          caseId: "shadowvol-campfire-retail-vs-web-normalized",
          normalization: "different-dimensions-normalized-sampled-grid",
          dimensionCompatibilityStatus:
            "different-pixel-dimensions-diagnostic-normalization-only",
          output: expect.objectContaining({
            name: "shadowvol-campfire-retail-web-diff-normalized.png",
            width: 192,
            height: 128
          }),
          metric: expect.objectContaining({
            changedSampleRatioGt5: 1
          }),
          calibratedRoiAttempt: expect.objectContaining({
            status: "not-attempted-different-pixel-dimensions",
            passed: false,
            reason: "ROI calibration requires equal pixel dimensions"
          })
        }),
        expect.objectContaining({
          caseId: "blindvision-retail-before-active",
          normalization: "same-dimension-sampled-grid",
          dimensionCompatibilityStatus:
            "same-pixel-dimensions-camera-or-roi-still-required",
          blocker:
            "Inputs have the same pixel dimensions, but this diff is still diagnostic until the manifest proves the same retail camera/viewport or an explicit calibrated ROI transform."
        }),
        expect.objectContaining({
          caseId: "cross-lane-budget-retail-before-after"
        })
      ])
    );
    expect(shadowDiff.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });

  it("evaluates same-dimension campfire ROI with translation and uniform scale candidates", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-pixel-diff-roi-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    await mkdir(absoluteArtifactDir, { recursive: true });

    const fixtures: Record<string, [number, number, [number, number, number, number]]> = {
      "retail-or-toolset-shadowvol-campfire.png": [4, 4, [80, 80, 80, 255]],
      "aurora-web-shadowvol-campfire.png": [4, 4, [20, 20, 20, 255]],
      "retail-progfx-blindvision-before.png": [4, 4, [10, 20, 30, 255]],
      "retail-progfx-blindvision-active.png": [4, 4, [40, 50, 60, 255]],
      "retail-cross-lane-all-lanes-before-budget.png": [4, 4, [5, 5, 5, 255]],
      "retail-cross-lane-all-lanes-after-budget.png": [4, 4, [50, 5, 5, 255]]
    };
    for (const [name, [width, height, color]] of Object.entries(fixtures)) {
      await writeFile(join(absoluteArtifactDir, name), makePngRgba(width, height, color));
    }

    await execFileAsync(
      "node",
      [scriptPath, "--repoRoot", tempRoot, "--artifactDir", artifactDir],
      { maxBuffer: 1024 * 1024 }
    );

    const report = JSON.parse(
      await readFile(join(absoluteArtifactDir, "area-lighting-pixel-diff-artifacts.json"), "utf8")
    );
    const shadowCase = report.cases.find(
      (entry: { caseId: string }) =>
        entry.caseId === "shadowvol-campfire-retail-vs-web-normalized"
    );

    expect(shadowCase).toMatchObject({
      normalization: "same-dimension-sampled-grid",
      calibratedRoiAttempt: {
        status: "calibrated-roi-affine-attempted-failed-tolerance",
        passed: false,
        canonicalParityPromoted: false,
        method: "normalized-luma-grid-translation-and-uniform-scale-search",
        tolerance: {
          maxMeanAbsLumaDelta: 8,
          maxChangedSampleRatioGt5: 0.15
        },
        translationOnlyCandidate: expect.objectContaining({
          scale: 1
        }),
        uniformScaleTranslationCandidate: expect.objectContaining({
          scale: expect.any(Number)
        })
      }
    });
    expect(shadowCase.calibratedRoiAttempt.scaleFactors).toContain(1);
    expect(shadowCase.calibratedRoiAttempt.bestOffset).toEqual(
      expect.objectContaining({
        scale: expect.any(Number),
        meanAbsLumaDelta: expect.any(Number)
      })
    );
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
