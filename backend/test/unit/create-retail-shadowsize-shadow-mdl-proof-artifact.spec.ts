import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-retail-shadowsize-shadow-mdl-proof-artifact.mjs"
);

describe("create-retail-shadowsize-shadow-mdl-proof-artifact", () => {
  it("normalizes the recovered Fx_Shadow_S/M/L MDL emitter proof without promoting projection parity", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-shadowsize-proof-"));
    const reportPath = join(tempRoot, "source", "fx-shadow-mdl-parser-report.json");
    const outputPath = join(
      tempRoot,
      "backend/docs/aurora-reverse/artifacts/light-shadow/retail-shadowsize-shadow-mdl-proof.json"
    );
    await mkdir(join(tempRoot, "source"), { recursive: true });
    await writeFile(
      reportPath,
      `${JSON.stringify({
        report: [
          shadowEntry("fx_shadow_s", "Small", 1, 0.6000000238418579, "hash-small"),
          shadowEntry("fx_shadow_m", "Med", 1.600000023841858, 0.6000000238418579, "hash-med"),
          shadowEntry("fx_shadow_l", "Large", 3, 0.699999988079071, "hash-large")
        ]
      })}\n`
    );

    const { stdout } = await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--sourceReport",
        reportPath,
        "--out",
        outputPath
      ],
      { maxBuffer: 1024 * 1024 }
    );

    expect(JSON.parse(stdout)).toMatchObject({
      status:
        "source-backed-retail-shadowsize-shadow-mdl-selection-and-emitter-metadata-projection-parity-blocked",
      metadataPassed: true,
      canonicalParityPromoted: false
    });

    const proof = JSON.parse(await readFile(outputPath, "utf8"));
    expect(proof).toMatchObject({
      passed: false,
      canonicalParityPromoted: false,
      metadataPassed: true,
      selectionRule: {
        shadowSize0: "Fx_Shadow_S",
        shadowSize2: "Fx_Shadow_L",
        otherPresentNumericShadowSize: "Fx_Shadow_M"
      },
      projectionParityStatus:
        "blocked-retail-shadow-volume-projection-pixel-geometry-not-proven"
    });
    expect(proof.emitterMetadata).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resref: "fx_shadow_s",
          model: "Fx_Shadow_S",
          emitter: expect.objectContaining({
            nodeName: "Small",
            texture: "fxpa_Dot01",
            simulation: expect.objectContaining({ sizeStart: 1 })
          }),
          passed: true
        }),
        expect.objectContaining({
          resref: "fx_shadow_l",
          model: "Fx_Shadow_L",
          emitter: expect.objectContaining({
            nodeName: "Large",
            simulation: expect.objectContaining({ alphaStart: 0.699999988079071 })
          }),
          passed: true
        })
      ])
    );
  });
});

function shadowEntry(
  resref: string,
  nodeName: string,
  size: number,
  alpha: number,
  sha256: string
) {
  return {
    resref,
    found: true,
    size: 2800,
    sha256,
    sourceFormat: "aurora-mdl-binary",
    emitters: [
      {
        nodeName,
        texture: "fxpa_Dot01",
        emitterType: "Single",
        renderMode: "Billboard_to_Local_Z",
        blendMode: "Normal",
        position: [0, 0, 0.029999999329447746],
        simulation: {
          sizeStart: size,
          sizeEnd: size,
          alphaStart: alpha,
          alphaEnd: alpha,
          birthrate: 1
        },
        sourceState: {
          renderOrder: 0,
          twoSidedTexture: false,
          loop: false,
          isTinted: false,
          splat: false
        }
      }
    ],
    lights: []
  };
}
