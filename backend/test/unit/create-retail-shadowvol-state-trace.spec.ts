import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(__dirname, "../../scripts/create-retail-shadowvol-state-trace.mjs");

describe("create-retail-shadowvol-state-trace", () => {
  it("writes a decompilation-backed retail shadow-volume state trace", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-shadowvol-trace-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const sourceAuditPath = join(tempRoot, "audit.json");
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      sourceAuditPath,
      `${JSON.stringify({
        shadowVolumeProjectionEvidence: {
          proofStatus:
            "source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked",
          stencilOpSequenceEvidence: {
            proofStatus: "source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped",
            wrapperFunction: "FUN_00a78344",
            targetFunction: "FUN_00a6f2b4",
            zPassOps: ["front:keep/decr", "back:keep/incr"],
            zFailOps: ["front:keep/incr", "back:keep/decr"],
            faceSlotMappingStatus: "source-backed-toolset-binary-face-slot-table-mapped",
            sequenceHits: [{ line: 913986, text: "FUN_00a78344(0,0,0,3);" }]
          },
          renderStateWrapperEvidence: {
            proofStatus: "source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-bracket-mapped",
            disableWrapper: "FUN_00a7818c(3)->FUN_00a6f0bc(3)",
            enableWrapper: "FUN_00a7816c(3)->FUN_00a6ef90(3)",
            stateStackPush: "FUN_00a780f0()->FUN_00a6c520",
            stateStackPop: "FUN_00a780e8()->FUN_00a6c44c",
            slotCapabilityStatus: "source-backed-toolset-binary-slot-3-gl-cull-face",
            sequenceHits: [{ line: 913929, text: "FUN_00a7818c(3);" }]
          },
          blendDepthColorMaskWrapperEvidence: {
            proofStatus: "source-backed-render-state-blend-depth-color-mask-wrappers-mapped",
            blendFuncWrapper: "FUN_00a6f1ec()->glBlendFunc",
            colorMaskWrapper: "FUN_00a6f3bc()->glColorMask",
            depthMaskWrapper: "FUN_00a6f4f8()->glDepthMask",
            depthFuncWrapper: "FUN_00a6f518()->glDepthFunc",
            blendFuncFacade: "FUN_00a7819c()->FUN_00a6f1ec()->glBlendFunc",
            colorMaskFacade: "FUN_00a78384()->FUN_00a6f3bc()->glColorMask",
            depthMaskFacade: "FUN_00a785bc()->FUN_00a6f4f8()->glDepthMask",
            depthFuncFacade: "FUN_00a78724()->FUN_00a6f518()->glDepthFunc",
            facadeWrapperHits: [{ line: 904153, semantic: "blendFunc", text: "FUN_00a7819c" }]
          },
          localDrawStateOrderEvidence: {
            proofStatus:
              "source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked",
            function: "FUN_00a878f8",
            lineWindow: "913914-914033",
            orderedCallSequence: ["disable-cull", "push-state", "draw", "pop-state"],
            expectedCallSequence: ["disable-cull", "push-state", "draw", "pop-state"],
            localBlendDepthColorMaskCallHits: [],
            blockedSemantics: ["indirect inherited state"]
          },
          activeLightRenderEnvelopeEvidence: {
            proofStatus:
              "source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked",
            function: "FUN_00a82464",
            lineWindow: "910553-910663",
            activeLightGlobal: "DAT_00d0233c",
            renderDispatchSlots: ["vtable+0x138", "vtable+0x108"],
            stateWrapperHits: [{ line: 910638, text: "FUN_00a78724();" }],
            vtableDispatchHits: [{ line: 910642, text: "(**(...+0x138))();" }],
            colorDepthMaskCallHits: []
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
        "--sourceAudit",
        sourceAuditPath
      ],
      { maxBuffer: 1024 * 1024 }
    );

    expect(JSON.parse(stdout)).toMatchObject({
      status: "source-backed-retail-decompilation-state-trace-ready-pixel-parity-blocked",
      stencilProofStatus: "source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped",
      activeLightEnvelopeProofStatus:
        "source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked"
    });
    const trace = JSON.parse(
      await readFile(join(absoluteArtifactDir, "retail-shadowvol-state-trace.json"), "utf8")
    );
    expect(trace).toMatchObject({
      version: "aurora-retail-shadowvol-state-trace/v1",
      canonicalParityPromoted: false,
      trace: {
        stencil: {
          faceSlotMappingStatus: "source-backed-toolset-binary-face-slot-table-mapped"
        },
        renderStateSlot3: {
          slotCapabilityStatus: "source-backed-toolset-binary-slot-3-gl-cull-face"
        },
        activeLightEnvelope: {
          colorDepthMaskCallHits: []
        }
      }
    });
  });
});
