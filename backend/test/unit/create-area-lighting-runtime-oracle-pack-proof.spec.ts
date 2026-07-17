import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-area-lighting-runtime-oracle-pack-proof.mjs"
);

const runtimeTargets = [
  "retail-or-toolset-shadowvol-campfire.png",
  "retail-cross-lane-all-lanes-before-budget.png",
  "retail-cross-lane-all-lanes-after-budget.png",
  "retail-cross-lane-active-slots.json",
  "retail-progfx-priority-policy-before.png",
  "retail-progfx-priority-policy-after.png",
  "retail-progfx-proximity-distance-sweep-contact-sheet.png",
  "retail-progfx-attach-scene-before.png",
  "retail-progfx-attach-scene-active.png",
  "retail-progfx-attach-scene-after-remove.png",
  "retail-progfx-blindvision-before.png",
  "retail-progfx-blindvision-active.png"
];

describe("create-area-lighting-runtime-oracle-pack-proof", () => {
  it("verifies all 12 runtime oracle artifacts without promoting parity", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-oracle-pack-"));
    const artifactDir = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    await mkdir(artifactDir, { recursive: true });
    for (const target of runtimeTargets) {
      if (target.endsWith(".png")) {
        await writeFile(join(artifactDir, target), makeMinimalPng(16, 8));
      } else {
        await writeFile(
          join(artifactDir, target),
          `${JSON.stringify({
            status: "blocked-no-direct-retail-active-slot-dump",
            passed: false,
            canonicalParityPromoted: false,
            directRetailSlotDumpAvailable: false,
            directRendererSlotOrderObserved: false,
            acceptedSlots: [],
            droppedSlots: [],
            laneOwners: []
          })}\n`
        );
      }
    }

    const outputPath = join(artifactDir, "area-lighting-retail-runtime-oracle-pack-proof.json");
    const { stdout } = await execFileAsync(
      "node",
      [scriptPath, "--repoRoot", tempRoot, "--artifactDir", artifactDir, "--out", outputPath],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    const proof = JSON.parse(await readFile(outputPath, "utf8"));
    expect(cli).toMatchObject({
      status: "runtime-oracle-pack-present-readable-parity-still-blocked",
      canonicalParityPromoted: false,
      summary: {
        requiredRuntimeArtifactCount: 12,
        presentRuntimeArtifactCount: 12,
        readableRuntimeArtifactCount: 12,
        missingRuntimeArtifactCount: 0,
        invalidRuntimeArtifactCount: 0,
        pngArtifactCount: 11,
        jsonArtifactCount: 1,
        pngReadableCount: 11,
        jsonReadableCount: 1
      }
    });
    expect(proof).toMatchObject({
      passed: false,
      canonicalParityPromoted: false,
      proofScope: {
        provesRequiredRuntimeArtifactsPresent: true,
        provesPngsAreReadable: true,
        provesStructuredActiveSlotJsonReadable: true,
        provesDirectRetailActiveSlotDump: false,
        provesRetailPixelParity: false,
        provesCanonicalParity: false
      }
    });
    expect(proof.targets).toHaveLength(12);
    expect(proof.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifact: "retail-or-toolset-shadowvol-campfire.png",
          status: "present-readable-png",
          width: 16,
          height: 8
        }),
        expect.objectContaining({
          artifact: "retail-cross-lane-active-slots.json",
          status: "present-readable-json",
          directRetailSlotDumpAvailable: false,
          acceptedSlotsCount: 0,
          droppedSlotsCount: 0
        })
      ])
    );
    expect(proof.blockedParityFacts).toEqual(
      expect.arrayContaining([
        "This proof validates presence/readability/hash/dimensions of the 12 runtime oracle capture targets only."
      ])
    );
  });
});

function makeMinimalPng(width: number, height: number): Buffer {
  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(6, 9);
  const ihdr = makeChunk("IHDR", ihdrData);
  const idat = makeChunk("IDAT", Buffer.from([0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01]));
  const iend = makeChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
