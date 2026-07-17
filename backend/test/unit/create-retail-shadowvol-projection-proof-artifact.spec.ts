import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-retail-shadowvol-projection-proof-artifact.mjs"
);

describe("create-retail-shadowvol-projection-proof-artifact", () => {
  it("compacts decompiled shadow-volume projection evidence without promoting parity", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-shadowvol-projection-proof-"));
    const artifactDir = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    await mkdir(artifactDir, { recursive: true });

    const auditPath = join(artifactDir, "audit-retail-light-function-disasm.json");
    await writeFile(
      auditPath,
      `\uFEFF${JSON.stringify(
        {
          shadowVolumeProjectionEvidence: {
            source: "C:/Projects/New Folder/export/decompiled_all.c",
            proofStatus:
              "source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked",
            shaderNamesFound: ["vs_shadowvol", "fs_shadowvol"],
            renderBuckets: ["0xd", "0xe", "0xb", "0xc"],
            recoveredInputs: [
              "ARE.ShadowOpacity",
              "light radius +0x58",
              "light shadowradius +0x60"
            ],
            shadowVolumeRenderPathHits: [
              { line: 913917, text: "vs_shadowvol/fs_shadowvol" }
            ],
            shadowVolumeLightProfileHits: [
              { line: 913930, text: "radius +0x58" }
            ],
            casterBufferGeometryEvidence: {
              proofStatus: "source-backed-shadowvol-caster-geometry-paired-vertex-index-buffer-fill",
              perSourceVertexRecords: 2,
              indicesPerCasterEdge: 6,
              sourceVertexTransformHits: [{ line: 888321, text: "FUN_00b2f49c" }],
              pairedVertexWriteHits: [{ line: 888326, text: "local_68 = 0x3f800000" }],
              indexPatternHits: [{ line: 888397, text: "puVar13 = puVar13 + 6" }]
            },
            stencilOpSequenceEvidence: {
              proofStatus: "source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped",
              zPassOps: ["FUN_00a78344(0,0,0,3)", "FUN_00a78344(1,0,0,4)"],
              zFailOps: ["FUN_00a78344(0,0,4,0)", "FUN_00a78344(1,0,3,0)"],
              sequenceHits: [{ line: 913986, text: "FUN_00a78344(0,0,0,3)" }],
              toolsetFaceOpTableEvidence: {
                proofStatus: "source-backed-toolset-binary-glstencilopseparate-face-op-table-mapped"
              }
            },
            localDrawStateOrderEvidence: {
              proofStatus:
                "source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked",
              expectedCallSequence: ["FUN_00a7818c(3)", "FUN_00a78128(...)"]
            },
            shaderUniformEvidence: {
              proofStatus: "source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed",
              transformUpload: "FUN_00a785d4(light-matrix-pointer)",
              shaderProgramBind: "FUN_00a788b0(DAT_00d0247c)",
              uniformSlot0: "FUN_00a78994(0)",
              uniformSlot1: "FUN_00a78980(1,fVar2)"
            },
            remainingBlockedSemantics: [
              "no pixel/geometry parity capture against retail shadow-volume output"
            ]
          }
        },
        null,
        2
      )}\n`
    );

    const outputPath = join(artifactDir, "retail-shadowvol-projection-proof.json");
    const { stdout } = await execFileAsync(
      "node",
      [scriptPath, "--repoRoot", tempRoot, "--audit", auditPath, "--out", outputPath],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    const proof = JSON.parse(await readFile(outputPath, "utf8"));
    expect(cli).toMatchObject({
      status: "source-backed-shadowvol-projection-caster-path-retail-pixel-parity-blocked",
      shaderNamesFound: ["vs_shadowvol", "fs_shadowvol"],
      renderBuckets: ["0xd", "0xe", "0xb", "0xc"],
      canonicalParityPromoted: false
    });
    expect(proof).toMatchObject({
      status: "source-backed-shadowvol-projection-caster-path-retail-pixel-parity-blocked",
      canonicalParityPromoted: false,
      source: "C:/Projects/New Folder/export/decompiled_all.c",
      sourceAnchors: {
        shaderProgram: "decompiled_all.c:913917",
        casterGeometry: "decompiled_all.c:888319-888403"
      },
      selectedEvidence: {
        casterGeometry: {
          proofStatus: "source-backed-shadowvol-caster-geometry-paired-vertex-index-buffer-fill",
          perSourceVertexRecords: 2,
          indicesPerCasterEdge: 6
        },
        stencilOps: {
          proofStatus: "source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped",
          toolsetFaceOpTableProof:
            "source-backed-toolset-binary-glstencilopseparate-face-op-table-mapped"
        },
        shaderUniforms: {
          proofStatus: "source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed"
        }
      },
      proofScope: {
        provesSourceBackedProjectionCasterPath: true,
        provesRetailPixels: false,
        provesProjectionPixelParity: false,
        provesShadowOpacityTolerance: false,
        provesCanonicalParity: false
      }
    });
    expect(proof.checks.every((check: { passed: boolean }) => check.passed)).toBe(true);
    expect(proof.blockedParityFacts).toEqual(
      expect.arrayContaining([
        "retail shadow-volume projection pixel geometry is not accepted without a normalized retail-vs-web evaluator"
      ])
    );
  });
});
