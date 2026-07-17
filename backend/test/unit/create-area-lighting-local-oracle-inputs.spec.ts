import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { deflateSync } from "node:zlib";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-area-lighting-local-oracle-inputs.mjs"
);

describe("create-area-lighting-local-oracle-inputs", () => {
  it("materializes campfire web input as diagnostic-only unless same retail camera or ROI is proven", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-local-oracle-inputs-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    await mkdir(absoluteArtifactDir, { recursive: true });

    await writeFile(
      join(absoluteArtifactDir, "retail-or-toolset-shadowvol-campfire.png"),
      makePngRgba(1280, 900, [80, 80, 80, 255])
    );
    await writeFile(
      join(
        absoluteArtifactDir,
        "aurora-web-catalog-campfire-plc-i06-light-shadow-proof-mp4-2026-07-06.png"
      ),
      makePngRgba(1424, 609, [20, 20, 20, 255])
    );
    await writeFile(
      join(absoluteArtifactDir, "cross-lane-all-light-lanes-runtime-probe-2026-07-05.frame.json"),
      "{}\n"
    );
    await writeFile(
      join(absoluteArtifactDir, "shadowvol-state-wrapper-audit-script-runtime-proof-2026-07-05-final.frame.json"),
      "{}\n"
    );
    await writeFile(
      join(absoluteArtifactDir, "shadowvol-render-state-call-sequence-runtime-proof-2026-07-05.frame.json"),
      "{}\n"
    );
    await writeFile(
      join(absoluteArtifactDir, "shadowvol-active-light-render-envelope-runtime-proof-2026-07-05.frame.json"),
      "{}\n"
    );

    const { stdout } = await execFileAsync(
      "node",
      [scriptPath, "--repoRoot", tempRoot, "--artifactDir", artifactDir],
      { maxBuffer: 1024 * 1024 }
    );

    expect(JSON.parse(stdout)).toMatchObject({
      status: "local-web-inputs-ready-retail-oracle-still-required",
      outputs: expect.arrayContaining(["aurora-web-shadowvol-campfire.png"])
    });
    const manifest = JSON.parse(
      await readFile(join(absoluteArtifactDir, "area-lighting-local-oracle-inputs-manifest.json"), "utf8")
    );
    const campfire = manifest.materialized.find(
      (entry: { target?: string }) => entry.target === "aurora-web-shadowvol-campfire.png"
    );
    expect(campfire).toMatchObject({
      kind: "aurora-web-shadowvol-campfire-pixel-input",
      selectedSource: "aurora-web-catalog-campfire-plc-i06-light-shadow-proof-mp4-2026-07-06.png",
      viewportCompatibilityStatus: "local-preview-not-retail-viewport",
      pixelDimensionCompatibilityStatus: "different-pixel-dimensions",
      samePixelDimensionsAsRetail: false,
      sameRetailCameraOrCalibratedRoi: false,
      calibratedRoiTransformStatus: "missing-calibrated-roi-transform",
      sourceDimensions: {
        width: 1424,
        height: 609
      },
      targetDimensions: {
        width: 1424,
        height: 609
      },
      retailReferenceDimensions: {
        width: 1280,
        height: 900
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
