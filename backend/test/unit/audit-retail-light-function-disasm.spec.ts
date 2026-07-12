import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

describe("audit-retail-light-function-disasm", () => {
  it("extracts source-backed shadow-volume projection evidence from decompiled source", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-shadowvol-evidence-"));
    const sourcePath = join(tempRoot, "decompiled_all.c");
    const lines = new Array<string>(914034).fill("");
    lines[898457] =
      "void __cdecl FUN_00a6f2b4(int param_1,int param_2,int param_3,int param_4)";
    lines[898487] = "(**(code **)PTR_DAT_00d3dd6c)();";
    lines[898494] = "(&DAT_00ccb008)[iVar1] = param_2;";
    lines[898501] = "(&DAT_00ccb008)[iVar1] = param_3;";
    lines[898508] = "(&DAT_00ccb008)[iVar1] = param_4;";
    lines[902866] =
      "void __cdecl FUN_00a75e3c(int param_1,int param_2,undefined4 param_3,int param_4,int param_5)";
    lines[902881] = "FUN_00a762e4(param_1);";
    lines[902891] = "FUN_00a6a648(param_1,param_2);";
    lines[902893] = "FUN_00a6a62c(param_1,param_2);";
    lines[902896] = "FUN_00a6a664(param_1,param_2);";
    lines[902898] = "(**(code **)PTR_DAT_00d3dda8)();";
    lines[902905] = "FUN_00a6a684(param_1,param_2);";
    lines[902910] = "glDrawArrays();";
    lines[904107] =
      "void __cdecl FUN_00a78128(int param_1,int param_2,undefined4 param_3,int param_4,int param_5)";
    lines[904110] = "FUN_00a75e3c(param_1,param_2,param_3,param_4,param_5);";
    lines[904307] = "void __cdecl FUN_00a78344(int param_1,int param_2,int param_3,int param_4)";
    lines[904310] = "FUN_00a6f2b4(param_1,param_2,param_3,param_4);";
    lines[904152] = "void __stdcall FUN_00a7819c(void)";
    lines[904155] = "FUN_00a6f1ec();";
    lines[904334] = "void __cdecl FUN_00a78384(char param_1,char param_2,char param_3,char param_4)";
    lines[904337] = "FUN_00a6f3bc(param_1,param_2,param_3,param_4);";
    lines[904541] = "void __cdecl FUN_00a785bc(char param_1)";
    lines[904544] = "FUN_00a6f4f8(param_1);";
    lines[904685] = "void __stdcall FUN_00a78724(void)";
    lines[904688] = "FUN_00a6f518();";
    lines[888068] = "undefined2 * __cdecl FUN_00a5fdb4(int param_1,float *param_2,undefined4 param_3,int param_4)";
    lines[888188] = "local_44 = 0x2aaa;";
    lines[888196] = "local_58 = local_30 * 6;";
    lines[888208] = "FUN_00a878f8(DAT_00d0233c);";
    lines[888210] = "*(undefined4 *)(*(int *)(param_1 + 0x70) + 0x68) = DAT_00cc95bc;";
    lines[888211] = "*(uint *)(*(int *)(param_1 + 0x70) + 100) = local_58;";
    lines[888212] = "local_48 = (undefined2 *)FUN_00a6a828(local_30 * 6);";
    lines[888245] = "puVar15 = FUN_00a69868(1,DAT_00e31e80 * 2 + 2,local_30 * 6,0x204,0);";
    lines[888249] = "FUN_00a6a5c8(*(int *)(param_4 + 0x80),*(int *)(param_4 + 0x84));";
    lines[888251] = "local_4c = FUN_00a6a370(*(int *)(param_4 + 0x80),DAT_00e31e80 * 2 + 2,local_58);";
    lines[888253] = "*(int *)(param_4 + 0x88) = local_30;";
    lines[888254] = "local_48 = (undefined2 *)FUN_00a6a6a4(*(int *)(param_4 + 0x80),local_4c);";
    lines[888255] = "iVar23 = FUN_00a6a6dc(*(int *)(param_4 + 0x80),local_4c);";
    lines[888320] = "FUN_00b2f49c(&local_100,local_f4 + 0x10,(float *)((uint)*puVar16 * 0xc + local_5c));";
    lines[888323] = "local_68 = 0x3f800000;";
    lines[888327] = "pfVar24 = (float *)(iVar23 + iVar18 * 0x20);";
    lines[888340] = "local_68 = 0;";
    lines[888342] = "pfVar24 = (float *)(iVar23 + 0x10 + iVar18 * 0x20);";
    lines[888353] = "FUN_00b2f49c(local_118 + 3,local_f4 + 0x10,local_118);";
    lines[888361] = "pfVar24 = (float *)(iVar23 + iVar18 * 0x20);";
    lines[888370] = "local_50 = uVar17 * 2;";
    lines[888371] = "local_54 = local_50 + 1;";
    lines[888374] = "local_61 = local_61 == false;";
    lines[888382] = "*puVar13 = (undefined2)local_50;";
    lines[888383] = "puVar13[1] = sVar8;";
    lines[888384] = "puVar13[2] = sVar9;";
    lines[888385] = "puVar13[3] = sVar8 + 1;";
    lines[888386] = "puVar13[4] = sVar9 + 1;";
    lines[888387] = "puVar13[5] = (undefined2)local_54;";
    lines[888396] = "puVar13 = puVar13 + 6;";
    lines[888366] = "FUN_00a6a798(*(int *)(param_4 + 0x80),local_4c,-1);";
    lines[888402] = "puVar13 = (undefined2 *)FUN_00a6a754(*(int *)(param_4 + 0x80),local_4c,local_58);";
    lines[910552] = "undefined4 __cdecl FUN_00a82464(int param_1)";
    lines[910599] = "DAT_00d0233c = param_1;";
    lines[910623] = "FUN_00a91200(param_1);";
    lines[910637] = "FUN_00a7816c(1);";
    lines[910638] = "FUN_00a78724();";
    lines[910640] = "FUN_00a7816c(0);";
    lines[910641] = "FUN_00a7819c();";
    lines[910642] = "(**(code **)(*(int *)(param_1 + 0xc) + 0x138))();";
    lines[910643] = "DAT_00d0233c = 0;";
    lines[910657] = "FUN_00a78a04();";
    lines[910658] = "FUN_00a7dda0(param_1);";
    lines[910659] = "(**(code **)(*(int *)(param_1 + 0xc) + 0x108))();";
    lines[910660] = "DAT_00d0233c = 0;";
    lines[910661] = "FUN_00a7816c(4);";
    lines[910662] = "FUN_00a7816c(5);";
    lines[897398] = "void __cdecl FUN_00a6dda4(undefined4 *param_1)";
    lines[897401] = "FUN_00a482a8(0xe320d0,param_1);";
    lines[897402] = "DAT_00e34710 = DAT_00e34710 + 1;";
    lines[896386] = "void __stdcall FUN_00a6c44c(void)";
    lines[896393] = "puVar3 = (undefined4 *)(*(int *)(&DAT_00e32024 + iVar1) + -0x40);";
    lines[896413] = "FUN_00a6c508(*(int *)(&DAT_00e32024 + iVar1) + -0x40,*(int *)(&DAT_00e32024 + iVar1));";
    lines[896428] = "void __stdcall FUN_00a6c520(void)";
    lines[896457] = "iVar4 = *(int *)(&DAT_00e32024 + iVar1);";
    lines[896465] = "*(int *)(&DAT_00e32024 + iVar1) = iVar4 + 0x40;";
    lines[898306] = "void __cdecl FUN_00a6ef90(undefined4 param_1)";
    lines[898313] = "_DAT_00d01c0c = _DAT_00d01c0c | 1 << ((byte)param_1 & 0x1f);";
    lines[898322] = "glEnable();";
    lines[898364] = "void __cdecl FUN_00a6f0bc(undefined4 param_1)";
    lines[898371] = "_DAT_00d01c0c = _DAT_00d01c0c & ~(1 << ((byte)param_1 & 0x1f));";
    lines[898383] = "glDisable();";
    lines[898420] = "void __stdcall FUN_00a6f1ec(void)";
    lines[898424] = "glBlendFunc();";
    lines[898532] = "void __cdecl FUN_00a6f3bc(char param_1,char param_2,char param_3,char param_4)";
    lines[898557] = "uVar3 = uVar3 | uVar1 | uVar2 | (uint)(param_4 != '\\0');";
    lines[898558] = "if (uVar3 != DAT_00ccb044) {";
    lines[898559] = "glColorMask();";
    lines[898560] = "DAT_00ccb044 = uVar3;";
    lines[898617] = "void __cdecl FUN_00a6f4f8(char param_1)";
    lines[898620] = "if (param_1 != DAT_00ccb04c) {";
    lines[898621] = "glDepthMask();";
    lines[898622] = "DAT_00ccb04c = param_1;";
    lines[898629] = "void __stdcall FUN_00a6f518(void)";
    lines[898632] = "glDepthFunc();";
    lines[900851] = "void __cdecl FUN_00a72764(int param_1,undefined4 param_2)";
    lines[900855] = "*(undefined4 *)(&DAT_00e346b4 + param_1 * 4) = param_2;";
    lines[900869] = "void __cdecl FUN_00a7278c(int param_1)";
    lines[900879] = "puVar3 = (undefined4 *)(&DAT_00cff71c + param_1 * 0x10);";
    lines[902169] = "void __cdecl FUN_00a74fd0(int param_1)";
    lines[902173] = "DAT_00cff754 = param_1;";
    lines[910672] = "void FUN_00a82d8c(void) { ShadowOpacity = ShadowOpacity; }";
    lines[911282] = "void FUN_00a83fec(void) { /* runtime extents */ }";
    lines[913853] = "void __cdecl FUN_00a878f8(int param_1)";
    lines[913916] =
      "(DAT_00d0247c = FUN_00a788c0((uint *)s_vs_shadowvol_00d02854,(uint *)s_fs_shadowvol_00d02861,0,0));";
    lines[913928] = "FUN_00a7818c(3);";
    lines[913929] = "if (*(float *)(*(int *)(param_1 + 0x34) + 0x58) <= 1000.0) {";
    lines[913931] = "if (*(float *)(iVar6 + 0x60) <= 0.0) {";
    lines[913936] = "local_50 = *(undefined4 *)(iVar6 + 0x60);";
    lines[913940] = "local_48 = *(undefined4 *)(iVar6 + 0x64);";
    lines[913985] = "FUN_00a78344(0,0,0,3);";
    lines[913986] = "FUN_00a78344(1,0,0,4);";
    lines[913995] = "FUN_00a780f0();";
    lines[913998] = "FUN_00a785d4((undefined4 *)(*(int *)(iVar4 + 0x70) + 0xc));";
    lines[913999] = "FUN_00a788b0(DAT_00d0247c);";
    lines[914000] = "FUN_00a78994(0);";
    lines[914011] = "FUN_00a78980(1,fVar2);";
    lines[914013] =
      "FUN_00a78128(*(int *)(iVar1 + 0x58),*(int *)(iVar1 + 0x5c),4,*(int *)(iVar1 + 100),*(int *)(iVar1 + 0x68));";
    lines[914024] = "FUN_00a780e8();";
    lines[914026] = "FUN_00a7816c(3);";
    lines[914031] = "FUN_00a78344(0,0,4,0);";
    lines[914032] = "FUN_00a78344(1,0,3,0);";
    lines[904559] = "void __cdecl FUN_00a785d4(undefined4 *param_1)";
    lines[904562] = "FUN_00a6dda4(param_1);";
    lines[904875] = "void __cdecl FUN_00a788b0(int param_1)";
    lines[904878] = "FUN_00a74fd0(param_1);";
    lines[904956] = "void __cdecl FUN_00a78980(int param_1,undefined4 param_2)";
    lines[904959] = "FUN_00a72764(param_1,param_2);";
    lines[904965] = "void __cdecl FUN_00a78994(int param_1)";
    lines[904968] = "FUN_00a7278c(param_1);";
    await writeFile(sourcePath, lines.join("\n"), "utf8");

    try {
      const scriptPath = resolve(process.cwd(), "scripts/audit-retail-light-function-disasm.py");
      const pythonSnippet = [
        "import importlib.util, json, pathlib, sys",
        "script = pathlib.Path(sys.argv[1])",
        "source = pathlib.Path(sys.argv[2])",
        "spec = importlib.util.spec_from_file_location('audit_light_disasm', script)",
        "module = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(module)",
        "print(json.dumps(module.scan_shadow_volume_projection_evidence(source)))"
      ].join("; ");

      const { stdout } = await execFileAsync(process.env.PYTHON ?? "python", [
        "-c",
        pythonSnippet,
        scriptPath,
        sourcePath
      ]);
      const evidence = JSON.parse(stdout) as {
        proofStatus: string;
        shaderNamesFound: string[];
        renderBuckets: string[];
        recoveredInputs: string[];
        remainingBlockedSemantics: string[];
        casterDrawCallSiteHits: Array<{ line: number; text: string }>;
        casterDrawWrapperEvidence: {
          wrapperFunction: string;
          targetFunction: string;
          proofStatus: string;
          wrapperHits: Array<{ line: number; text: string }>;
          dispatchHits: Array<{ line: number; text: string }>;
        };
        stencilOpSequenceEvidence: {
          wrapperFunction: string;
          targetFunction: string;
          proofStatus: string;
          faceSlotMappingStatus: string;
          toolsetFaceOpTableEvidence: {
            proofStatus: string;
            procPointerValue: string;
            expectedGlStencilOpSeparateProcPointer: string;
            faceSlotMap: Array<{ slot: number; value: string; name: string }>;
            opSlotMap: Array<{ slot: number; value: string; name: string }>;
            zPassResolvedOps: Array<{ sourceCall: string; face: string; depthPass: string }>;
            zFailResolvedOps: Array<{ sourceCall: string; face: string; depthFail: string }>;
          };
          zPassOps: string[];
          zFailOps: string[];
          wrapperHits: Array<{ line: number; text: string }>;
          dispatchHits: Array<{ line: number; text: string }>;
          cacheHits: Array<{ line: number; text: string }>;
          sequenceHits: Array<{ line: number; text: string }>;
        };
        renderStateWrapperEvidence: {
          disableWrapper: string;
          enableWrapper: string;
          stateStackPush: string;
          stateStackPop: string;
          proofStatus: string;
          slotCapabilityStatus: string;
          wrapperHits: Array<{ line: number; text: string }>;
          stackHits: Array<{ line: number; text: string }>;
          sequenceHits: Array<{ line: number; text: string }>;
          toolsetCapabilityEvidence: {
            proofStatus: string;
            glCapability: string;
            glCapabilityHex: string;
            disableCase: {
              pushImmediate: string;
              glCapability: string;
              callTargetVa: string;
              expectedCallTargetVa: string;
              callTargetStatus: string;
            };
            enableCase: {
              pushImmediate: string;
              glCapability: string;
              callTargetVa: string;
              expectedCallTargetVa: string;
              callTargetStatus: string;
            };
          };
        };
        blendDepthColorMaskWrapperEvidence: {
          blendFuncWrapper: string;
          colorMaskWrapper: string;
          depthMaskWrapper: string;
          depthFuncWrapper: string;
          blendFuncFacade: string;
          colorMaskFacade: string;
          depthMaskFacade: string;
          depthFuncFacade: string;
          proofStatus: string;
          wrapperHits: Array<{ line: number; text: string }>;
          facadeWrapperHits: Array<{
            line: number;
            semantic: string;
            function: string;
            target: string;
            text: string;
          }>;
        };
        immediateCallerBufferFlushEvidence: {
          callerLineWindow: string;
          callee: string;
          proofStatus: string;
          triggerHits: Array<{ line: number; text: string }>;
          blendDepthColorMaskCallHits: Array<{
            line: number;
            needle: string;
            text: string;
          }>;
        };
        directCallerBufferBuilderEvidence: {
          function: string;
          callerLineWindow: string;
          callee: string;
          proofStatus: string;
          builderHits: Array<{ line: number; text: string }>;
          blendDepthColorMaskCallHits: Array<{
            line: number;
            needle: string;
            text: string;
          }>;
        };
        activeLightRenderEnvelopeEvidence: {
          function: string;
          lineWindow: string;
          activeLightGlobal: string;
          renderDispatchSlots: string[];
          proofStatus: string;
          envelopeHits: Array<{ line: number; text: string }>;
          stateWrapperHits: Array<{ line: number; text: string }>;
          vtableDispatchHits: Array<{ line: number; text: string }>;
          colorDepthMaskCallHits: Array<{
            line: number;
            needle: string;
            text: string;
          }>;
        };
        localDrawStateOrderEvidence: {
          function: string;
          lineWindow: string;
          proofStatus: string;
          expectedCallSequence: string[];
          orderedCallSequence: Array<{
            line: number;
            call: string;
            role: string;
            text: string;
          }>;
          localBlendDepthColorMaskCallHits: Array<{
            line: number;
            needle: string;
            text: string;
          }>;
          blockedSemantics: string[];
        };
        shaderUniformEvidence: {
          transformUpload: string;
          shaderProgramBind: string;
          uniformSlot0: string;
          uniformSlot1: string;
          proofStatus: string;
          wrapperHits: Array<{ line: number; text: string }>;
          targetHits: Array<{ line: number; text: string }>;
          sequenceHits: Array<{ line: number; text: string }>;
        };
        casterBufferPreparationEvidence: {
          builderFunction: string;
          proofStatus: string;
          triggerHits: Array<{ line: number; text: string }>;
          allocationHits: Array<{ line: number; text: string }>;
          writeHits: Array<{ line: number; text: string }>;
        };
        casterBufferGeometryEvidence: {
          builderFunction: string;
          proofStatus: string;
          perSourceVertexRecords: number;
          indicesPerCasterEdge: number;
          maxCasterEdgeClamp: string;
          sourceVertexTransformHits: Array<{ line: number; text: string }>;
          pairedVertexWriteHits: Array<{ line: number; text: string }>;
          indexPatternHits: Array<{ line: number; text: string }>;
          bufferFinalizeHits: Array<{ line: number; text: string }>;
        };
        shadowVolumeRenderPathHits: Array<{ line: number; text: string }>;
        shadowVolumeLightProfileHits: Array<{ line: number; text: string }>;
      };

      expect(evidence.proofStatus).toBe(
        "source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked"
      );
      expect(evidence.shaderNamesFound).toEqual(["vs_shadowvol", "fs_shadowvol"]);
      expect(evidence.renderBuckets).toEqual(["0xd", "0xe", "0xb", "0xc"]);
      expect(evidence.recoveredInputs).toEqual(
        expect.arrayContaining([
          "ARE.ShadowOpacity",
          "light radius +0x58",
          "light shadowradius +0x60",
          "light verticaldisplacement +0x64",
          "FUN_00a878f8 caster buffer preparation",
          "FUN_00a5fdb4 direct caller/buffer-builder has no blend/depth/color-mask wrapper hits",
          "caster draw through FUN_00a78128",
          "FUN_00a78128 wrapper to FUN_00a75e3c draw dispatch",
          "FUN_00a78344 z-pass/z-fail stencil op sequence",
          "FUN_00a878f8 local draw-state order through z-pass stencil setup, state push, shader bind, draw wrapper, state pop, restore, and z-fail switch",
          "shadow-volume shader bind + transform/uniform slot writes",
          "nwtoolset.exe render-state slot 3 GL_CULL_FACE mapping"
        ])
      );
      expect(evidence.casterDrawCallSiteHits).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ line: 914014, text: expect.stringContaining("FUN_00a78128") })
        ])
      );
      expect(evidence.casterDrawWrapperEvidence).toMatchObject({
        wrapperFunction: "FUN_00a78128",
        targetFunction: "FUN_00a75e3c",
        proofStatus: "source-backed-shadowvol-caster-draw-wrapper-gl-dispatch",
        wrapperHits: expect.arrayContaining([
          expect.objectContaining({ line: 904108, text: expect.stringContaining("FUN_00a78128") }),
          expect.objectContaining({ line: 904111, text: expect.stringContaining("FUN_00a75e3c") })
        ]),
        dispatchHits: expect.arrayContaining([
          expect.objectContaining({ line: 902899, text: expect.stringContaining("PTR_DAT_00d3dda8") }),
          expect.objectContaining({ line: 902911, text: expect.stringContaining("glDrawArrays") })
        ])
      });
      expect(evidence.stencilOpSequenceEvidence).toMatchObject({
        wrapperFunction: "FUN_00a78344",
        targetFunction: "FUN_00a6f2b4",
        proofStatus:
          "source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped",
        faceSlotMappingStatus: "source-backed-toolset-binary-face-slot-0-front-1-back",
        zPassOps: ["FUN_00a78344(0,0,0,3)", "FUN_00a78344(1,0,0,4)"],
        zFailOps: ["FUN_00a78344(0,0,4,0)", "FUN_00a78344(1,0,3,0)"],
        wrapperHits: expect.arrayContaining([
          expect.objectContaining({ line: 904308, text: expect.stringContaining("FUN_00a78344") }),
          expect.objectContaining({ line: 904311, text: expect.stringContaining("FUN_00a6f2b4") })
        ]),
        dispatchHits: expect.arrayContaining([
          expect.objectContaining({ line: 898458, text: expect.stringContaining("FUN_00a6f2b4") }),
          expect.objectContaining({ line: 898488, text: expect.stringContaining("PTR_DAT_00d3dd6c") })
        ]),
        cacheHits: expect.arrayContaining([
          expect.objectContaining({ line: 898495, text: expect.stringContaining("DAT_00ccb008") }),
          expect.objectContaining({ line: 898502, text: expect.stringContaining("DAT_00ccb008") }),
          expect.objectContaining({ line: 898509, text: expect.stringContaining("DAT_00ccb008") })
        ]),
        sequenceHits: expect.arrayContaining([
          expect.objectContaining({ line: 913986, text: expect.stringContaining("FUN_00a78344(0,0,0,3)") }),
          expect.objectContaining({ line: 913987, text: expect.stringContaining("FUN_00a78344(1,0,0,4)") }),
          expect.objectContaining({ line: 914032, text: expect.stringContaining("FUN_00a78344(0,0,4,0)") }),
          expect.objectContaining({ line: 914033, text: expect.stringContaining("FUN_00a78344(1,0,3,0)") })
        ])
      });
      expect(evidence.stencilOpSequenceEvidence.toolsetFaceOpTableEvidence).toMatchObject({
        proofStatus: "source-backed-toolset-binary-glstencilopseparate-face-op-table-mapped",
        procPointerValue: "0xd12d20",
        expectedGlStencilOpSeparateProcPointer: "0xd12d20",
        faceSlotMap: expect.arrayContaining([
          expect.objectContaining({ slot: 0, value: "0x404", name: "GL_FRONT" }),
          expect.objectContaining({ slot: 1, value: "0x405", name: "GL_BACK" })
        ]),
        opSlotMap: expect.arrayContaining([
          expect.objectContaining({ slot: 0, value: "0x1e00", name: "GL_KEEP" }),
          expect.objectContaining({ slot: 3, value: "0x1e02", name: "GL_INCR" }),
          expect.objectContaining({ slot: 4, value: "0x1e03", name: "GL_DECR" })
        ]),
        zPassResolvedOps: expect.arrayContaining([
          expect.objectContaining({
            sourceCall: "FUN_00a78344(0,0,0,3)",
            face: "GL_FRONT",
            depthPass: "GL_INCR"
          }),
          expect.objectContaining({
            sourceCall: "FUN_00a78344(1,0,0,4)",
            face: "GL_BACK",
            depthPass: "GL_DECR"
          })
        ]),
        zFailResolvedOps: expect.arrayContaining([
          expect.objectContaining({
            sourceCall: "FUN_00a78344(0,0,4,0)",
            face: "GL_FRONT",
            depthFail: "GL_DECR"
          }),
          expect.objectContaining({
            sourceCall: "FUN_00a78344(1,0,3,0)",
            face: "GL_BACK",
            depthFail: "GL_INCR"
          })
        ])
      });
      expect(evidence.renderStateWrapperEvidence).toMatchObject({
        disableWrapper: "FUN_00a7818c(3)->FUN_00a6f0bc(3)",
        enableWrapper: "FUN_00a7816c(3)->FUN_00a6ef90(3)",
        stateStackPush: "FUN_00a780f0()->FUN_00a6c520",
        stateStackPop: "FUN_00a780e8()->FUN_00a6c44c",
        proofStatus: "source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-bracket-mapped",
        slotCapabilityStatus: "source-backed-toolset-binary-slot-3-gl-cull-face",
        wrapperHits: expect.arrayContaining([
          expect.objectContaining({ line: 898307, text: expect.stringContaining("FUN_00a6ef90") }),
          expect.objectContaining({ line: 898314, text: expect.stringContaining("_DAT_00d01c0c") }),
          expect.objectContaining({ line: 898365, text: expect.stringContaining("FUN_00a6f0bc") }),
          expect.objectContaining({ line: 898372, text: expect.stringContaining("_DAT_00d01c0c") })
        ]),
        stackHits: expect.arrayContaining([
          expect.objectContaining({ line: 896387, text: expect.stringContaining("FUN_00a6c44c") }),
          expect.objectContaining({ line: 896394, text: expect.stringContaining("-0x40") }),
          expect.objectContaining({ line: 896429, text: expect.stringContaining("FUN_00a6c520") }),
          expect.objectContaining({ line: 896466, text: expect.stringContaining("+ 0x40") })
        ]),
        sequenceHits: expect.arrayContaining([
          expect.objectContaining({ line: 913929, text: expect.stringContaining("FUN_00a7818c(3)") }),
          expect.objectContaining({ line: 913996, text: expect.stringContaining("FUN_00a780f0") }),
          expect.objectContaining({ line: 914025, text: expect.stringContaining("FUN_00a780e8") }),
          expect.objectContaining({ line: 914027, text: expect.stringContaining("FUN_00a7816c(3)") })
        ]),
        toolsetCapabilityEvidence: {
          proofStatus: "source-backed-toolset-binary-render-state-slot3-gl-cull-face-mapped",
          glCapability: "GL_CULL_FACE",
          glCapabilityHex: "0xb44",
          disableCase: {
            pushImmediate: "0xb44",
            glCapability: "GL_CULL_FACE",
            callTargetVa: "0xb9be5e",
            expectedCallTargetVa: "0xb9be5e",
            callTargetStatus: "matches-expected-gl-wrapper"
          },
          enableCase: {
            pushImmediate: "0xb44",
            glCapability: "GL_CULL_FACE",
            callTargetVa: "0xb9be70",
            expectedCallTargetVa: "0xb9be70",
            callTargetStatus: "matches-expected-gl-wrapper"
          }
        }
      });
      expect(evidence.blendDepthColorMaskWrapperEvidence).toMatchObject({
        blendFuncWrapper: "FUN_00a6f1ec()->glBlendFunc",
        colorMaskWrapper:
          "FUN_00a6f3bc(r,g,b,a)->glColorMask with DAT_00ccb044 cache",
        depthMaskWrapper: "FUN_00a6f4f8(flag)->glDepthMask with DAT_00ccb04c cache",
        depthFuncWrapper: "FUN_00a6f518()->glDepthFunc",
        blendFuncFacade: "FUN_00a7819c()->FUN_00a6f1ec()->glBlendFunc",
        colorMaskFacade:
          "FUN_00a78384(r,g,b,a)->FUN_00a6f3bc(r,g,b,a)->glColorMask",
        depthMaskFacade: "FUN_00a785bc(flag)->FUN_00a6f4f8(flag)->glDepthMask",
        depthFuncFacade: "FUN_00a78724()->FUN_00a6f518()->glDepthFunc",
        proofStatus: "source-backed-render-state-blend-depth-color-mask-wrappers-mapped",
        wrapperHits: expect.arrayContaining([
          expect.objectContaining({ line: 898421, text: expect.stringContaining("FUN_00a6f1ec") }),
          expect.objectContaining({ line: 898425, text: "glBlendFunc();" }),
          expect.objectContaining({ line: 898533, text: expect.stringContaining("FUN_00a6f3bc") }),
          expect.objectContaining({ line: 898560, text: "glColorMask();" }),
          expect.objectContaining({ line: 898618, text: expect.stringContaining("FUN_00a6f4f8") }),
          expect.objectContaining({ line: 898622, text: "glDepthMask();" }),
          expect.objectContaining({ line: 898630, text: expect.stringContaining("FUN_00a6f518") }),
          expect.objectContaining({ line: 898633, text: "glDepthFunc();" })
        ]),
        facadeWrapperHits: expect.arrayContaining([
          expect.objectContaining({
            line: 904153,
            semantic: "blendFunc",
            function: "FUN_00a7819c",
            target: "FUN_00a6f1ec"
          }),
          expect.objectContaining({
            line: 904156,
            semantic: "blendFunc",
            function: "FUN_00a7819c",
            target: "FUN_00a6f1ec"
          }),
          expect.objectContaining({
            line: 904335,
            semantic: "colorMask",
            function: "FUN_00a78384",
            target: "FUN_00a6f3bc"
          }),
          expect.objectContaining({
            line: 904338,
            semantic: "colorMask",
            function: "FUN_00a78384",
            target: "FUN_00a6f3bc"
          }),
          expect.objectContaining({
            line: 904542,
            semantic: "depthMask",
            function: "FUN_00a785bc",
            target: "FUN_00a6f4f8"
          }),
          expect.objectContaining({
            line: 904545,
            semantic: "depthMask",
            function: "FUN_00a785bc",
            target: "FUN_00a6f4f8"
          }),
          expect.objectContaining({
            line: 904686,
            semantic: "depthFunc",
            function: "FUN_00a78724",
            target: "FUN_00a6f518"
          }),
          expect.objectContaining({
            line: 904689,
            semantic: "depthFunc",
            function: "FUN_00a78724",
            target: "FUN_00a6f518"
          })
        ])
      });
      expect(evidence.immediateCallerBufferFlushEvidence).toMatchObject({
        callerLineWindow: "888188-888213",
        callee: "FUN_00a878f8(DAT_00d0233c)",
        proofStatus:
          "source-backed-shadowvol-immediate-caller-buffer-flush-no-blend-depth-color-mask-state-wrapper",
        blendDepthColorMaskCallHits: [],
        triggerHits: expect.arrayContaining([
          expect.objectContaining({
            line: 888209,
            text: "FUN_00a878f8(DAT_00d0233c);"
          }),
          expect.objectContaining({
            line: 888211,
            text: expect.stringContaining("+ 0x68")
          }),
          expect.objectContaining({
            line: 888212,
            text: expect.stringContaining("+ 100")
          })
        ])
      });
      expect(evidence.directCallerBufferBuilderEvidence).toMatchObject({
        function: "FUN_00a5fdb4",
        callerLineWindow: "888069-888414",
        callee: "FUN_00a878f8(DAT_00d0233c)",
        proofStatus:
          "source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper",
        blendDepthColorMaskCallHits: [],
        builderHits: expect.arrayContaining([
          expect.objectContaining({
            line: 888069,
            text: expect.stringContaining("FUN_00a5fdb4")
          }),
          expect.objectContaining({
            line: 888209,
            text: "FUN_00a878f8(DAT_00d0233c);"
          }),
          expect.objectContaining({
            line: 888246,
            text: expect.stringContaining("FUN_00a69868")
          }),
          expect.objectContaining({
            line: 888321,
            text: expect.stringContaining("FUN_00b2f49c")
          }),
          expect.objectContaining({
            line: 888403,
            text: expect.stringContaining("FUN_00a6a754")
          })
        ])
      });
      expect(evidence.activeLightRenderEnvelopeEvidence).toMatchObject({
        function: "FUN_00a82464",
        lineWindow: "910553-910663",
        activeLightGlobal: "DAT_00d0233c",
        renderDispatchSlots: ["vtable+0x138", "vtable+0x108"],
        proofStatus:
          "source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked",
        colorDepthMaskCallHits: [],
        envelopeHits: expect.arrayContaining([
          expect.objectContaining({
            line: 910600,
            text: "DAT_00d0233c = param_1;"
          }),
          expect.objectContaining({
            line: 910643,
            text: expect.stringContaining("+ 0x138")
          }),
          expect.objectContaining({
            line: 910660,
            text: expect.stringContaining("+ 0x108")
          })
        ]),
        stateWrapperHits: expect.arrayContaining([
          expect.objectContaining({
            line: 910639,
            text: "FUN_00a78724();"
          }),
          expect.objectContaining({
            line: 910642,
            text: "FUN_00a7819c();"
          }),
          expect.objectContaining({
            line: 910662,
            text: "FUN_00a7816c(4);"
          }),
          expect.objectContaining({
            line: 910663,
            text: "FUN_00a7816c(5);"
          })
        ]),
        vtableDispatchHits: expect.arrayContaining([
          expect.objectContaining({
            line: 910643,
            text: expect.stringContaining("+ 0x138")
          }),
          expect.objectContaining({
            line: 910660,
            text: expect.stringContaining("+ 0x108")
          })
        ])
      });
      expect(evidence.localDrawStateOrderEvidence).toMatchObject({
        function: "FUN_00a878f8",
        lineWindow: "913929-914033",
        proofStatus:
          "source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked",
        expectedCallSequence: [
          "FUN_00a7818c(3)",
          "FUN_00a78344(0,0,0,3)",
          "FUN_00a78344(1,0,0,4)",
          "FUN_00a780f0()",
          "FUN_00a785d4(light-matrix-pointer)",
          "FUN_00a788b0(DAT_00d0247c)",
          "FUN_00a78994(0)",
          "FUN_00a78980(1,fVar2)",
          "FUN_00a78128(buffer0x58,buffer0x5c,4,count0x64,buffer0x68)",
          "FUN_00a780e8()",
          "FUN_00a7816c(3)",
          "FUN_00a78344(0,0,4,0)",
          "FUN_00a78344(1,0,3,0)"
        ],
        orderedCallSequence: expect.arrayContaining([
          expect.objectContaining({
            line: 913929,
            call: "FUN_00a7818c(3)",
            role: "disable-render-state-slot-3-before-shadow-volume-traversal"
          }),
          expect.objectContaining({
            line: 913986,
            call: "FUN_00a78344(0,0,0,3)",
            role: "front-face-zpass-stencil-keep-keep-increment"
          }),
          expect.objectContaining({
            line: 913999,
            call: "FUN_00a785d4(light-matrix-pointer)",
            role: "upload-shadow-light-transform"
          }),
          expect.objectContaining({
            line: 914014,
            call: "FUN_00a78128(buffer0x58,buffer0x5c,4,count0x64,buffer0x68)",
            role: "draw-caster-buffer-through-FUN_00a75e3c"
          }),
          expect.objectContaining({
            line: 914033,
            call: "FUN_00a78344(1,0,3,0)",
            role: "back-face-zfail-stencil-keep-increment-keep"
          })
        ]),
        localBlendDepthColorMaskCallHits: []
      });
      expect(evidence.localDrawStateOrderEvidence.blockedSemantics).toContain(
        "FUN_00a878f8 local draw-state order is source-backed, but no local blend/depth/color-mask wrapper calls were found in 913929-914033; inherited outer render-state parity remains unproven"
      );
      expect(evidence.localDrawStateOrderEvidence.blockedSemantics).toContain(
        "FUN_00a878f8 immediate caller window 888188-888213 is source-backed as a caster-buffer flush/capacity path and contains no blend/depth/color-mask wrapper call; broader inherited render-state parity remains unproven"
      );
      expect(evidence.localDrawStateOrderEvidence.blockedSemantics).toContain(
        "FUN_00a5fdb4 direct caller/buffer-builder window 888069-888414 is source-backed and contains no blend/depth/color-mask raw or facade wrapper call; inherited render-state parity must be proven from a higher scene render path or retail oracle"
      );
      expect(evidence.localDrawStateOrderEvidence.blockedSemantics).toContain(
        "FUN_00a82464 active-light render envelope 910553-910663 sets DAT_00d0233c, exposes depthFunc/blendFunc facade calls and render-state slot restores around +0x138/+0x108 vtable dispatch, but contains no color/depth-mask wrapper call; exact inherited state through the indirect scene render target remains blocked"
      );
      expect(evidence.shaderUniformEvidence).toMatchObject({
        transformUpload:
          "FUN_00a785d4(light-matrix-pointer)->FUN_00a6dda4()->FUN_00a482a8(0xe320d0,param_1)",
        shaderProgramBind:
          "FUN_00a788b0(DAT_00d0247c)->FUN_00a74fd0 stores nonzero program in DAT_00cff754",
        uniformSlot0:
          "FUN_00a78994(0)->FUN_00a7278c copies 4 words into DAT_00cff71c + slot*0x10",
        uniformSlot1:
          "FUN_00a78980(1,fVar2)->FUN_00a72764 writes scalar into DAT_00e346b4 + slot*4",
        proofStatus:
          "source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed",
        wrapperHits: expect.arrayContaining([
          expect.objectContaining({ line: 904560, text: expect.stringContaining("FUN_00a785d4") }),
          expect.objectContaining({ line: 904563, text: expect.stringContaining("FUN_00a6dda4") }),
          expect.objectContaining({ line: 904876, text: expect.stringContaining("FUN_00a788b0") }),
          expect.objectContaining({ line: 904879, text: expect.stringContaining("FUN_00a74fd0") }),
          expect.objectContaining({ line: 904957, text: expect.stringContaining("FUN_00a78980") }),
          expect.objectContaining({ line: 904960, text: expect.stringContaining("FUN_00a72764") }),
          expect.objectContaining({ line: 904966, text: expect.stringContaining("FUN_00a78994") }),
          expect.objectContaining({ line: 904969, text: expect.stringContaining("FUN_00a7278c") })
        ]),
        targetHits: expect.arrayContaining([
          expect.objectContaining({ line: 897399, text: expect.stringContaining("FUN_00a6dda4") }),
          expect.objectContaining({ line: 897402, text: expect.stringContaining("FUN_00a482a8") }),
          expect.objectContaining({ line: 900852, text: expect.stringContaining("FUN_00a72764") }),
          expect.objectContaining({ line: 900856, text: expect.stringContaining("DAT_00e346b4") }),
          expect.objectContaining({ line: 900870, text: expect.stringContaining("FUN_00a7278c") }),
          expect.objectContaining({ line: 900880, text: expect.stringContaining("DAT_00cff71c") }),
          expect.objectContaining({ line: 902170, text: expect.stringContaining("FUN_00a74fd0") }),
          expect.objectContaining({ line: 902174, text: expect.stringContaining("DAT_00cff754") })
        ]),
        sequenceHits: expect.arrayContaining([
          expect.objectContaining({ line: 913999, text: expect.stringContaining("FUN_00a785d4") }),
          expect.objectContaining({ line: 914000, text: expect.stringContaining("FUN_00a788b0") }),
          expect.objectContaining({ line: 914001, text: expect.stringContaining("FUN_00a78994") }),
          expect.objectContaining({ line: 914012, text: expect.stringContaining("FUN_00a78980") })
        ])
      });
      expect(evidence.casterBufferPreparationEvidence).toMatchObject({
        builderFunction: "FUN_00a878f8",
        proofStatus: "source-backed-shadowvol-caster-buffer-prep-index-vertex-fill",
        triggerHits: expect.arrayContaining([
          expect.objectContaining({ line: 888209, text: expect.stringContaining("FUN_00a878f8") }),
          expect.objectContaining({ line: 888211, text: expect.stringContaining("+ 0x68") }),
          expect.objectContaining({ line: 888212, text: expect.stringContaining("+ 100") })
        ]),
        allocationHits: expect.arrayContaining([
          expect.objectContaining({ line: 888246, text: expect.stringContaining("FUN_00a69868") }),
          expect.objectContaining({ line: 888252, text: expect.stringContaining("FUN_00a6a370") }),
          expect.objectContaining({ line: 888255, text: expect.stringContaining("FUN_00a6a6a4") }),
          expect.objectContaining({ line: 888256, text: expect.stringContaining("FUN_00a6a6dc") })
        ]),
        writeHits: expect.arrayContaining([
          expect.objectContaining({ line: 888321, text: expect.stringContaining("FUN_00b2f49c") }),
          expect.objectContaining({ line: 888328, text: expect.stringContaining("iVar23") }),
          expect.objectContaining({ line: 888383, text: expect.stringContaining("puVar13") }),
          expect.objectContaining({ line: 888367, text: expect.stringContaining("FUN_00a6a798") }),
          expect.objectContaining({ line: 888403, text: expect.stringContaining("FUN_00a6a754") })
        ])
      });
      expect(evidence.casterBufferGeometryEvidence).toMatchObject({
        builderFunction: "FUN_00a878f8",
        proofStatus: "source-backed-shadowvol-caster-geometry-paired-vertex-index-buffer-fill",
        perSourceVertexRecords: 2,
        indicesPerCasterEdge: 6,
        maxCasterEdgeClamp: "0x2aaa",
        sourceVertexTransformHits: expect.arrayContaining([
          expect.objectContaining({ line: 888321, text: expect.stringContaining("FUN_00b2f49c") }),
          expect.objectContaining({ line: 888354, text: expect.stringContaining("FUN_00b2f49c") })
        ]),
        pairedVertexWriteHits: expect.arrayContaining([
          expect.objectContaining({ line: 888324, text: expect.stringContaining("0x3f800000") }),
          expect.objectContaining({ line: 888328, text: expect.stringContaining("iVar23 + iVar18 * 0x20") }),
          expect.objectContaining({ line: 888341, text: expect.stringContaining("local_68 = 0") }),
          expect.objectContaining({ line: 888343, text: expect.stringContaining("iVar23 + 0x10") })
        ]),
        indexPatternHits: expect.arrayContaining([
          expect.objectContaining({ line: 888371, text: expect.stringContaining("uVar17 * 2") }),
          expect.objectContaining({ line: 888372, text: expect.stringContaining("local_50 + 1") }),
          expect.objectContaining({ line: 888375, text: expect.stringContaining("local_61") }),
          expect.objectContaining({ line: 888383, text: expect.stringContaining("*puVar13") }),
          expect.objectContaining({ line: 888388, text: expect.stringContaining("puVar13[5]") }),
          expect.objectContaining({ line: 888397, text: expect.stringContaining("puVar13 + 6") })
        ]),
        bufferFinalizeHits: expect.arrayContaining([
          expect.objectContaining({ line: 888367, text: expect.stringContaining("FUN_00a6a798") }),
          expect.objectContaining({ line: 888403, text: expect.stringContaining("FUN_00a6a754") })
        ])
      });
      expect(evidence.shadowVolumeRenderPathHits).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ line: 913917, text: expect.stringContaining("vs_shadowvol") }),
          expect.objectContaining({ line: 913930, text: expect.stringContaining("+ 0x58") }),
          expect.objectContaining({ line: 914014, text: expect.stringContaining("FUN_00a78128") })
        ])
      );
      expect(evidence.shadowVolumeLightProfileHits).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ line: 913932, text: expect.stringContaining("+ 0x60") }),
          expect.objectContaining({ line: 913941, text: expect.stringContaining("+ 0x64") })
        ])
      );
      expect(evidence.remainingBlockedSemantics).not.toContain(
        "FUN_00a78344 recovers z-pass/z-fail stencil op triples, but slot 0/1 to GL_FRONT/GL_BACK mapping is not proven by source-only decompilation"
      );
      expect(evidence.remainingBlockedSemantics).not.toContain(
        "FUN_00a7818c/FUN_00a7816c bracket shadow-volume rendering through render-state slot 3, but the slot-to-GL-capability mapping is not proven by source-only decompilation"
      );
      expect(evidence.remainingBlockedSemantics).toContain(
        "FUN_00a878f8 local draw-state order is source-backed, but no local blend/depth/color-mask wrapper calls were found in 913929-914033; inherited outer render-state parity remains unproven"
      );
      expect(evidence.remainingBlockedSemantics).toContain(
        "retail caster paired-vertex/six-index buffer fill is source-backed, but active renderer integration is not proven by this extractor"
      );
      expect(evidence.remainingBlockedSemantics).toContain(
        "no pixel/geometry parity capture against retail shadow-volume output"
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("extracts LightManager source ordering evidence without claiming cross-lane insertion order", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-lightmanager-evidence-"));
    const sourcePath = join(tempRoot, "decompiled_all.c");
    const lines = new Array<string>(919961).fill("");
    lines[255945] =
      "FUN_00aefd1c(local_90,&local_b0,*(byte *)(iVar3 + 0x40),(uint *)s_Tile_MainLight1_00c29b39);";
    lines[453566] =
      "piVar2 = FUN_00a546cc((byte *)s_fx_flame01_00c9a90f,s_sourcelight1_00c9a91a,(int *)0x0);";
    lines[865533] = "void __cdecl FUN_00a4128c(int param_1,int *param_2)";
    lines[865537] = "FUN_00a4139c((int *)(param_1 + 8),param_2);";
    lines[865540] = "if (param_2[0x1c] == 0) {";
    lines[865541] = "FUN_00a4139c((int *)(param_1 + 0x20),param_2);";
    lines[865544] =
      "if ((param_2[0x10] != 0) && ((param_2[0x1c] != 0 || (param_2[0x1b] != 0)))) {";
    lines[865545] = "FUN_00a4139c((int *)(param_1 + 0x14),param_2);";
    lines[865713] = "void __cdecl FUN_00a4165c(int param_1)";
    lines[865730] = "bool __cdecl FUN_00a41694(int param_1,int param_2)";
    lines[865734] = "return *(float *)(param_1 + 0x84) < *(float *)(param_2 + 0x84);";
    lines[865798] = "void __cdecl FUN_00a417bc(int param_1)";
    lines[865837] = "void __cdecl FUN_00a41850(int *param_1,float *param_2)";
    lines[865909] = "*(float *)(iVar1 + 0x84) =";
    lines[866101] = "void __cdecl FUN_00a41e50(int param_1,int *param_2,int *param_3,int param_4)";
    lines[866199] = "FUN_00a40b60(iVar4,local_24);";
    lines[866324] = "if (*(int *)(param_1 + 0x70) == 0) {";
    lines[866361] = "FUN_00a40b60(*(int *)(param_1 + 0x70),0xffffffff,*local_8);";
    lines[866364] = "if (*(int *)(param_1 + 0x6c) == 0) {";
    lines[866401] = "FUN_00a40b60(*(int *)(param_1 + 0x6c),0xffffffff,*local_8);";
    lines[866404] = "if (DAT_00cc2314 != 0) {";
    lines[866405] = "FUN_00a41b30();";
    lines[866406] = "uVar7 = 2;";
    lines[866409] =
      "for (; (iVar6 < param_2[1] && (iVar4 = FUN_00a41e30(), (int)uVar7 < iVar4)); uVar7 = uVar7 + 1) {";
    lines[866420] = "FUN_00a40b60(*piVar1,uVar15,fVar16);";
    lines[866423] = "FUN_00a7817c(uVar7);";
    lines[867026] = "if (DAT_00cc2314 != 0) {";
    lines[867027] = "FUN_00a41b30();";
    lines[867030] = "iVar4 = *(int *)(param_1 + 0x70);";
    lines[867034] = "iVar4 = *(int *)(param_1 + 0x6c);";
    lines[867041] = "piVar2 = (int *)FUN_00a41648((int *)(param_1 + 8),iVar4);";
    lines[867066] = "FUN_00a40b60(iVar3,local_8,*(float *)(iVar3 + 0x78));";
    lines[867085] = "FUN_00a7817c(uVar5);";
    lines[905439] = "local_8 = (undefined4 *)FUN_00b83ab0();";
    lines[905442] = "FUN_00a40f10(local_8);";
    lines[905445] = "param_1[0x42] = (int)local_8;";
    lines[913208] = "(**(code **)(**(int **)(param_1 + 0x108) + 0x18))();";
    lines[918252] = "iVar6 = FUN_00a4131c(piVar7,iVar4);";
    lines[918254] = "FUN_00a4139c(piVar7,iVar4);";
    lines[918256] = "(**(code **)(**(int **)(param_1 + 0x108) + 0x10))();";
    lines[918386] = "FUN_00a4148c((int *)pfVar3[0x16],iVar2);";
    lines[918387] = "(**(code **)(**(int **)(param_1 + 0x108) + 0x14))();";
    lines[919883] = "FUN_00a8b474(param_1);";
    lines[919885] = "FUN_00a8db58(param_1);";
    lines[919887] = "(**(code **)(*piVar10 + 0x18))(piVar10,*piVar10,iVar13,piVar10);";
    lines[919888] = "(**(code **)(**(int **)(param_1 + 0x108) + 0x1c))();";
    lines[919892] = "puVar11 = (undefined4 *)FUN_00a41648((int *)(iVar12 + 0x14),iVar13);";
    lines[919893] = "FUN_00a8f134(param_1,(int *)*puVar11);";
    lines[919958] = "(**(code **)(**(int **)(param_1 + 0x108) + 4))();";
    lines[919959] = "_DAT_00e34bdc = *(undefined4 *)(*(int *)(param_1 + 0x108) + 0x30);";
    await writeFile(sourcePath, lines.join("\n"), "utf8");

    try {
      const scriptPath = resolve(process.cwd(), "scripts/audit-retail-light-function-disasm.py");
      const pythonSnippet = [
        "import importlib.util, json, pathlib, sys",
        "script = pathlib.Path(sys.argv[1])",
        "source = pathlib.Path(sys.argv[2])",
        "spec = importlib.util.spec_from_file_location('audit_light_disasm', script)",
        "module = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(module)",
        "print(json.dumps(module.scan_light_manager_source_ordering_evidence(source)))"
      ].join("; ");

      const { stdout } = await execFileAsync(process.env.PYTHON ?? "python", [
        "-c",
        pythonSnippet,
        scriptPath,
        sourcePath
      ]);
      const evidence = JSON.parse(stdout) as {
        proofStatus: string;
        firstHits: Record<string, { line: number; text: string }>;
        decompiledInsertionSymbolHits: Array<{ line: number; text: string }>;
        directInsertionCallHits: Array<{ line: number; text: string }>;
        internalInsertionEvidence: {
          proofStatus: string;
          listOffsets: string[];
          hits: Array<{ line: number; text: string }>;
        };
        scoreSortUploadEvidence: {
          proofStatus: string;
          hits: Array<{ line: number; text: string }>;
        };
        retailUploadOrderEvidence: {
          proofStatus: string;
          specialLightOffsets: string[];
          specialLightUploadSlot: string;
          fixedLightHits: Array<{ line: number; text: string }>;
          sortedSlotHits: Array<{ line: number; text: string }>;
        };
        frameRebuildOrderingEvidence: {
          proofStatus: string;
          managerPointerOffset: string;
          managerConstructor: string;
          vtableSlotHints: Record<string, string>;
          managerConstructionHits: Array<{ line: number; phase: string; text: string }>;
          frameOrderHits: Array<{ line: number; phase: string; text: string }>;
          vtableDispatchHits: Array<{ line: number; phase: string; text: string }>;
        };
        directProximityUploadEvidence: {
          proofStatus: string;
          function: string;
          hits: Array<{ line: number; phase: string; text: string }>;
        };
        laneSourceHints: Array<{ line: number; text: string }>;
        remainingBlockedSemantics: string[];
      };

      expect(evidence.proofStatus).toBe(
        "source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked"
      );
      expect(evidence.firstHits.insertFunction).toMatchObject({ line: 865534 });
      expect(evidence.firstHits.activeSortFunction).toMatchObject({ line: 865714 });
      expect(evidence.firstHits.shadowSortFunction).toMatchObject({ line: 865799 });
      expect(evidence.firstHits.scoreFunction).toMatchObject({ line: 865838 });
      expect(evidence.firstHits.uploadFunction).toMatchObject({ line: 866102 });
      expect(evidence.decompiledInsertionSymbolHits).toEqual([
        expect.objectContaining({ line: 865534, text: expect.stringContaining("FUN_00a4128c") })
      ]);
      expect(evidence.directInsertionCallHits).toEqual([]);
      expect(evidence.internalInsertionEvidence).toMatchObject({
        proofStatus: "source-backed-lightmanager-internal-insertion-lists",
        listOffsets: ["+0x8", "+0x20", "+0x14"],
        hits: expect.arrayContaining([
          expect.objectContaining({ line: 865538, text: expect.stringContaining("+ 8") }),
          expect.objectContaining({ line: 865542, text: expect.stringContaining("+ 0x20") }),
          expect.objectContaining({ line: 865546, text: expect.stringContaining("+ 0x14") })
        ])
      });
      expect(evidence.scoreSortUploadEvidence.proofStatus).toBe(
        "source-backed-lightmanager-score-sort-upload"
      );
      expect(evidence.scoreSortUploadEvidence.hits).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ line: 865735, text: expect.stringContaining("+ 0x84") }),
          expect.objectContaining({ line: 866102, text: expect.stringContaining("FUN_00a41e50") }),
          expect.objectContaining({ line: 866200, text: expect.stringContaining("FUN_00a40b60") })
        ])
      );
      expect(evidence.retailUploadOrderEvidence).toMatchObject({
        proofStatus: "source-backed-lightmanager-special-lights-before-sorted-slot-upload",
        specialLightOffsets: ["+0x70", "+0x6c"],
        specialLightUploadSlot: "0xffffffff",
        fixedLightHits: expect.arrayContaining([
          expect.objectContaining({ line: 866325, text: expect.stringContaining("+ 0x70") }),
          expect.objectContaining({ line: 866362, text: expect.stringContaining("0xffffffff") }),
          expect.objectContaining({ line: 866365, text: expect.stringContaining("+ 0x6c") }),
          expect.objectContaining({ line: 866402, text: expect.stringContaining("0xffffffff") })
        ]),
        sortedSlotHits: expect.arrayContaining([
          expect.objectContaining({ line: 866405, text: expect.stringContaining("DAT_00cc2314") }),
          expect.objectContaining({ line: 866407, text: expect.stringContaining("uVar7 = 2") }),
          expect.objectContaining({ line: 866410, text: expect.stringContaining("FUN_00a41e30") }),
          expect.objectContaining({ line: 866421, text: expect.stringContaining("FUN_00a40b60") }),
          expect.objectContaining({ line: 866424, text: expect.stringContaining("FUN_00a7817c") })
        ])
      });
      expect(evidence.frameRebuildOrderingEvidence).toMatchObject({
        proofStatus:
          "source-backed-lightmanager-frame-rebuild-vtable-dispatch-order-owner-lane-precedence-blocked",
        managerPointerOffset: "+0x108 / param_1[0x42]",
        managerConstructor: "FUN_00a40f10",
        vtableSlotHints: expect.objectContaining({
          "+4": expect.stringContaining("+0x30 active count"),
          "+0x10": expect.stringContaining("light add dispatch"),
          "+0x14": expect.stringContaining("light remove dispatch"),
          "+0x18": expect.stringContaining("reset/rebuild"),
          "+0x1c": expect.stringContaining("post-reset")
        }),
        managerConstructionHits: expect.arrayContaining([
          expect.objectContaining({ line: 905440, text: expect.stringContaining("FUN_00b83ab0") }),
          expect.objectContaining({ line: 905443, text: expect.stringContaining("FUN_00a40f10") }),
          expect.objectContaining({ line: 905446, text: expect.stringContaining("param_1[0x42]") })
        ]),
        frameOrderHits: expect.arrayContaining([
          expect.objectContaining({ line: 919884, text: expect.stringContaining("FUN_00a8b474") }),
          expect.objectContaining({ line: 919886, text: expect.stringContaining("FUN_00a8db58") }),
          expect.objectContaining({ line: 919888, text: expect.stringContaining("+ 0x18") }),
          expect.objectContaining({ line: 919889, text: expect.stringContaining("+ 0x1c") }),
          expect.objectContaining({ line: 919893, text: expect.stringContaining("+ 0x14") }),
          expect.objectContaining({ line: 919959, text: expect.stringContaining("+ 4") }),
          expect.objectContaining({ line: 919960, text: expect.stringContaining("+ 0x30") })
        ]),
        vtableDispatchHits: expect.arrayContaining([
          expect.objectContaining({ line: 913209, phase: "spatial-light-rebuild-reset-dispatch" }),
          expect.objectContaining({ line: 918257, phase: "spatial-cell-light-add-dispatch" }),
          expect.objectContaining({ line: 918388, phase: "spatial-cell-light-remove-dispatch" })
        ])
      });
      expect(evidence.directProximityUploadEvidence).toMatchObject({
        function: "FUN_00a42f5c",
        proofStatus: "source-backed-lightmanager-direct-proximity-upload-order",
        hits: expect.arrayContaining([
          expect.objectContaining({ line: 867027, text: expect.stringContaining("DAT_00cc2314") }),
          expect.objectContaining({ line: 867028, text: expect.stringContaining("FUN_00a41b30") }),
          expect.objectContaining({ line: 867031, text: expect.stringContaining("+ 0x70") }),
          expect.objectContaining({ line: 867035, text: expect.stringContaining("+ 0x6c") }),
          expect.objectContaining({ line: 867042, text: expect.stringContaining("+ 8") }),
          expect.objectContaining({ line: 867067, text: expect.stringContaining("FUN_00a40b60") }),
          expect.objectContaining({ line: 867086, text: expect.stringContaining("FUN_00a7817c") })
        ])
      });
      expect(evidence.laneSourceHints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ line: 255946, text: expect.stringContaining("Tile_MainLight1") }),
          expect.objectContaining({ line: 453567, text: expect.stringContaining("fx_flame01") })
        ])
      );
      expect(evidence.remainingBlockedSemantics).toContain(
        "source-only decompiled call scan finds no direct FUN_00a4128c callers, but frame-level LightManager +0x108 virtual dispatch order is now recovered"
      );
      expect(evidence.remainingBlockedSemantics).toContain(
        "source-only frame order covers scene rebuild/add/remove/sort/upload dispatch and special-before-sorted slots, not owner-lane creation precedence between tile/placeable/MDL/item/ProgFX"
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("extracts ProgFX Type 4 source scheduler absence from decompiled source", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-progfx-source-evidence-"));
    const referenceRoot = join(tempRoot, "reference");
    const sourcePath = join(referenceRoot, "export", "decompiled_all.c");
    await mkdir(join(referenceRoot, "export"), { recursive: true });
    await mkdir(join(referenceRoot, "item-retail-extract", "2da"), { recursive: true });
    const lines = new Array<string>(348261).fill("");
    lines[300146] =
      "uVar2 = FUN_00aeed68(param_2,&local_78,(uint *)s_Param1_00c47b34,&local_7c,0xff);";
    lines[300148] =
      "uVar2 = FUN_00aeed68(param_2,&local_78,(uint *)s_Param1Value_00c47b3b,&local_7c,0);";
    lines[322174] = "if (s_ReqParam1_00c4a7ee[0] == '\\0') {";
    lines[322237] = "if (s_ReqParam2_00c4a7ff[0] == '\\0') {";
    lines[348243] = "FUN_00addae0(local_f0,s_visualeffects_00c5c8df);";
    await writeFile(sourcePath, lines.join("\n"), "utf8");
    await writeFile(
      join(referenceRoot, "export", "strings_2da.tsv"),
      'DEFINED\t00c5c8df\ts_visualeffects_00c5c8df\tds "visualeffects"\t"visualeffects"\tstring\t14\ttrue\n',
      "utf8"
    );
    await writeFile(
      join(referenceRoot, "item-retail-extract", "2da", "baseitems.2da"),
      "2DA V2.0\n",
      "utf8"
    );

    try {
      const scriptPath = resolve(process.cwd(), "scripts/audit-retail-light-function-disasm.py");
      const pythonSnippet = [
        "import importlib.util, json, pathlib, sys",
        "script = pathlib.Path(sys.argv[1])",
        "source = pathlib.Path(sys.argv[2])",
        "spec = importlib.util.spec_from_file_location('audit_light_disasm', script)",
        "module = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(module)",
        "reference_root = pathlib.Path(sys.argv[3])",
        "print(json.dumps(module.scan_progfx_type4_source_scheduler_evidence(source, reference_root)))"
      ].join("; ");

      const { stdout } = await execFileAsync(process.env.PYTHON ?? "python", [
        "-c",
        pythonSnippet,
        scriptPath,
        sourcePath,
        referenceRoot
      ]);
      const evidence = JSON.parse(stdout) as {
        proofStatus: string;
        firstHits: Record<string, { line: number; text: string }>;
        visualEffectsTableLoaderHits: Array<{ line: number; text: string }>;
        templateParameterHits: Array<{ line: number; text: string }>;
        schedulerStringHits: Array<{ line: number; needle: string; text: string }>;
        runtimeSchedulerStringHitCount: number;
        localResourceDumpEvidence: {
          proofStatus: string;
          exactResourcePathHits: Array<{ resourceName: string; path: string; bytes: number }>;
          missingResourceNames: string[];
          indexStringHits: Array<{ file: string; line: number; needle: string; text: string }>;
        };
        remainingBlockedSemantics: string[];
      };

      expect(evidence.proofStatus).toBe(
        "source-backed-visualeffects-loader-progfx-type4-scheduler-not-in-source-only-decompilation"
      );
      expect(evidence.firstHits.visualEffectsTableLoader).toMatchObject({ line: 348244 });
      expect(evidence.firstHits.param1TemplateField).toMatchObject({ line: 300147 });
      expect(evidence.firstHits.param1ValueTemplateField).toMatchObject({ line: 300149 });
      expect(evidence.firstHits.requiredParam1Field).toMatchObject({ line: 322175 });
      expect(evidence.firstHits.requiredParam2Field).toMatchObject({ line: 322238 });
      expect(evidence.visualEffectsTableLoaderHits).toEqual([
        expect.objectContaining({ line: 348244, text: expect.stringContaining("visualeffects") })
      ]);
      expect(evidence.templateParameterHits).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ line: 300147, text: expect.stringContaining("Param1") }),
          expect.objectContaining({ line: 300149, text: expect.stringContaining("Param1Value") }),
          expect.objectContaining({ line: 322175, text: expect.stringContaining("ReqParam1") }),
          expect.objectContaining({ line: 322238, text: expect.stringContaining("ReqParam2") })
        ])
      );
      expect(evidence.schedulerStringHits).toEqual([]);
      expect(evidence.runtimeSchedulerStringHitCount).toBe(0);
      expect(evidence.localResourceDumpEvidence.proofStatus).toBe(
        "source-backed-local-reference-root-lacks-progfx-type4-scheduler-resource-dump"
      );
      expect(evidence.localResourceDumpEvidence.exactResourcePathHits).toEqual([]);
      expect(evidence.localResourceDumpEvidence.missingResourceNames).toEqual(
        expect.arrayContaining([
          "progfx.2da",
          "visualeffects.2da",
          "fx_light_clr.mdl",
          "fx_light_clr.mdb"
        ])
      );
      expect(evidence.localResourceDumpEvidence.indexStringHits).toEqual([
        expect.objectContaining({
          file: "export/strings_2da.tsv",
          line: 1,
          needle: "visualeffects",
          text: expect.stringContaining("visualeffects")
        })
      ]);
      expect(evidence.remainingBlockedSemantics).toContain(
        "source-only decompiled_all.c does not expose Param3/Param4/Param5/Param6 runtime scheduler semantics for ProgFX Type 4"
      );
      expect(evidence.remainingBlockedSemantics).toContain(
        "local C:/Projects/New Folder resource inventory does not expose progfx.2da/visualeffects.2da/fx_light_clr scheduler resource files in the available dump"
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("classifies LightManager core methods as an rdata vtable cluster without direct callsites", async () => {
    const scriptPath = resolve(process.cwd(), "scripts/audit-retail-light-function-disasm.py");
    const pythonSnippet = [
      "import importlib.util, json, pathlib, sys",
      "script = pathlib.Path(sys.argv[1])",
      "spec = importlib.util.spec_from_file_location('audit_light_disasm', script)",
      "module = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(module)",
      "class FakePath:",
      "    name = 'nwmain.exe'",
      "class FakeImage:",
      "    def __init__(self):",
      "        self.path = FakePath()",
      "        self.image_base = 0x140000000",
      "        self.data = bytearray(0x300)",
      "        self.sections = [",
      "            {'name': '.text', 'virtual_address': 0x1000, 'virtual_size': 0x100, 'raw_size': 0x100, 'raw_pointer': 0},",
      "            {'name': '.rdata', 'virtual_address': 0x2000, 'virtual_size': 0x200, 'raw_size': 0x200, 'raw_pointer': 0x100},",
      "        ]",
      "        self.pdata = [{'begin_rva': 0x1000, 'end_rva': 0x1008, 'unwind_rva': 0}]",
      "        self.exports = [",
      "            {'name': '?AddLight@LightManager@@UEAAXPEAVPartLight@@@Z', 'rva': 0x1010, 'va': self.image_base + 0x1010},",
      "            {'name': '?PrioritizeLights@LightManager@@UEAAXAEBVVector@@@Z', 'rva': 0x1020, 'va': self.image_base + 0x1020},",
      "            {'name': '?RemoveLight@LightManager@@UEAAXPEAVPartLight@@@Z', 'rva': 0x1030, 'va': self.image_base + 0x1030},",
      "            {'name': '?UpdateLights@LightManager@@UEAAXXZ', 'rva': 0x1040, 'va': self.image_base + 0x1040},",
      "            {'name': '?GetMaxLights@LightManager@@QEBAHXZ', 'rva': 0x1050, 'va': self.image_base + 0x1050},",
      "        ]",
      "        for index, target_rva in enumerate([0x1020, 0x1010, 0x1030, 0x1040]):",
      "            offset = 0x120 + index * 8",
      "            self.data[offset:offset + 8] = int(self.image_base + target_rva).to_bytes(8, 'little')",
      "        self.data[0:3] = bytes([0xff, 0x50, 0x08])",
      "        rel = (self.image_base + 0x1050) - (self.image_base + 0x1003 + 5)",
      "        self.data[3] = 0xe8",
      "        self.data[4:8] = int(rel).to_bytes(4, 'little', signed=True)",
      "        self.data[0x180:0x18d] = b'LightManager\\0'",
      "    def offset_to_rva(self, offset):",
      "        if 0 <= offset < 0x100:",
      "            return 0x1000 + offset",
      "        if 0x100 <= offset < 0x300:",
      "            return 0x2000 + offset - 0x100",
      "        return None",
      "    def rva_to_offset(self, rva):",
      "        if 0x1000 <= rva < 0x1100:",
      "            return rva - 0x1000",
      "        if 0x2000 <= rva < 0x2200:",
      "            return 0x100 + rva - 0x2000",
      "        return None",
      "    def find_function_entry(self, rva):",
      "        return next((entry for entry in self.pdata if entry['begin_rva'] <= rva < entry['end_rva']), None)",
      "image = FakeImage()",
      "print(json.dumps(module.scan_light_manager_xrefs(image, image.exports)))"
    ].join("\n");

    const { stdout } = await execFileAsync(process.env.PYTHON ?? "python", [
      "-c",
      pythonSnippet,
      scriptPath
    ]);
    const evidence = JSON.parse(stdout) as {
      proofStatus: string;
      directCallXrefCount: number;
      directCallTargetSummary: Array<{
        target: string;
        targetVa: string;
        callCount: number;
        callerFunctionCount: number;
        sampleCallerFunctions: Array<{
          functionBeginVa: string;
          functionEndVa: string;
          callSites: string[];
        }>;
      }>;
      requestedDirectCallXrefCount: number;
      requestedDirectCallTargetSummary: unknown[];
      absoluteAddressRefCount: number;
      absoluteVtableClusterEvidence: {
        proofStatus: string;
        clusterBeginVa: string;
        clusterEndVa: string;
        slotStrideBytes: number;
        slotCount: number;
        contiguousSlots: boolean;
        requestedCoreSlotCount: number;
        requestedCoreSlots: Array<{ slotVa: string; target: string; targetVa: string }>;
        lightManagerNameStringVa: string;
        lightManagerNameDistanceBytes: number;
        remainingBlockedSemantics: string[];
      };
      indirectVtableSlotCallEvidence: {
        proofStatus: string;
        candidateCount: number;
        sampledCandidateCount: number;
        sampledCandidatesWithKnownDirectCallContextCount: number;
        sampledKnownDirectCallTargetSummary: unknown[];
        slotCandidates: Array<{
          slotOffset: string;
          target: string;
          candidateCount: number;
          samples: Array<{
            at: string;
            instruction: string;
            baseRegister: string;
            functionBeginVa: string;
            functionEndVa: string;
            functionKnownDirectCallCount: number;
            functionKnownDirectCallTargetSummary: unknown[];
          }>;
        }>;
        remainingBlockedSemantics: string[];
      };
    };

    expect(evidence.proofStatus).toBe(
      "blocked-lightmanager-core-lane-ordering-no-add-prioritize-remove-update-direct-call-xrefs"
    );
    expect(evidence.directCallXrefCount).toBe(1);
    expect(evidence.directCallTargetSummary).toEqual([
      {
        target: "?GetMaxLights@LightManager@@QEBAHXZ",
        targetVa: "0x140001050",
        callCount: 1,
        callerFunctionCount: 1,
        sampleCallerFunctions: [
          {
            functionBeginVa: "0x140001000",
            functionEndVa: "0x140001008",
            callSites: ["0x140001003"]
          }
        ]
      }
    ]);
    expect(evidence.requestedDirectCallXrefCount).toBe(0);
    expect(evidence.requestedDirectCallTargetSummary).toEqual([]);
    expect(evidence.absoluteAddressRefCount).toBe(4);
    expect(evidence.absoluteVtableClusterEvidence).toMatchObject({
      proofStatus:
        "retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite",
      clusterBeginVa: "0x140002020",
      clusterEndVa: "0x140002038",
      slotStrideBytes: 8,
      slotCount: 4,
      contiguousSlots: true,
      requestedCoreSlotCount: 4,
      lightManagerNameStringVa: "0x140002080",
      lightManagerNameDistanceBytes: 0x60
    });
    expect(evidence.absoluteVtableClusterEvidence.requestedCoreSlots).toEqual([
      {
        slotVa: "0x140002020",
        target: "LightManager::PrioritizeLights",
        targetVa: "0x140001020"
      },
      {
        slotVa: "0x140002028",
        target: "LightManager::AddLight",
        targetVa: "0x140001010"
      },
      {
        slotVa: "0x140002030",
        target: "LightManager::RemoveLight",
        targetVa: "0x140001030"
      },
      {
        slotVa: "0x140002038",
        target: "LightManager::UpdateLights",
        targetVa: "0x140001040"
      }
    ]);
    expect(evidence.absoluteVtableClusterEvidence.remainingBlockedSemantics).toContain(
      "vtable cluster proves exported LightManager virtual slots, not lane owner call-sites"
    );
    expect(evidence.indirectVtableSlotCallEvidence).toMatchObject({
      proofStatus:
        "capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked",
      candidateCount: 1,
      sampledCandidateCount: 1,
      sampledCandidatesWithKnownDirectCallContextCount: 1,
      sampledKnownDirectCallTargetSummary: [
        {
          target: "?GetMaxLights@LightManager@@QEBAHXZ",
          callCount: 1
        }
      ],
      slotCandidates: expect.arrayContaining([
        expect.objectContaining({
          slotOffset: "0x8",
          target: "LightManager::AddLight",
          candidateCount: 1,
          samples: [
            expect.objectContaining({
              at: "0x140001000",
              instruction: "call qword ptr [rax + 0x8]",
              baseRegister: "rax",
              functionBeginVa: "0x140001000",
              functionEndVa: "0x140001008",
              functionKnownDirectCallCount: 1,
              functionKnownDirectCallTargetSummary: [
                expect.objectContaining({
                  target: "?GetMaxLights@LightManager@@QEBAHXZ",
                  targetVa: "0x140001050",
                  callCount: 1
                })
              ]
            })
          ]
        })
      ])
    });
    expect(evidence.indirectVtableSlotCallEvidence.remainingBlockedSemantics).toContain(
      "indirect calls by vtable slot offset are generic dispatch candidates; register receiver type is not proven"
    );
    expect(evidence.indirectVtableSlotCallEvidence.remainingBlockedSemantics).toContain(
      "same-function direct-call target summaries are context inventory only and do not prove the indirect receiver type"
    );
  });

  it("scans direct x64 E8 rel32 call targets without capstone", async () => {
    const scriptPath = resolve(process.cwd(), "scripts/audit-retail-light-function-disasm.py");
    const pythonSnippet = [
      "import importlib.util, json, pathlib, sys",
      "script = pathlib.Path(sys.argv[1])",
      "spec = importlib.util.spec_from_file_location('audit_light_disasm', script)",
      "module = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(module)",
      "class FakePath:",
      "    name = 'nwmain.exe'",
      "class FakeImage:",
      "    def __init__(self):",
      "        self.path = FakePath()",
      "        self.image_base = 0x140000000",
      "        self.data = bytearray(96)",
      "        self.sections = [{'name': '.text', 'virtual_address': 0x96cf00, 'virtual_size': 96, 'raw_size': 96, 'raw_pointer': 0}]",
      "        self.pdata = [{'begin_rva': 0x96cf00, 'end_rva': 0x96cf60, 'unwind_rva': 0}]",
      "        self.exports = []",
      "        for offset, target_va in [(0, 0x14096cf10), (16, 0x1402da450), (32, 0x1400931f0)]:",
      "            call_va = self.image_base + 0x96cf00 + offset",
      "            rel = target_va - (call_va + 5)",
      "            self.data[offset] = 0xe8",
      "            self.data[offset + 1:offset + 5] = int(rel).to_bytes(4, 'little', signed=True)",
      "    def offset_to_rva(self, offset):",
      "        return 0x96cf00 + offset if 0 <= offset < 96 else None",
      "    def rva_to_offset(self, rva):",
      "        return rva - 0x96cf00 if 0x96cf00 <= rva < 0x96cf60 else None",
      "    def find_function_entry(self, rva):",
      "        return self.pdata[0] if 0x96cf00 <= rva < 0x96cf60 else None",
      "image = FakeImage()",
      "print(json.dumps(module.scan_capstone_free_binary_call_target_evidence(image, [])))"
    ].join("\n");

    const { stdout } = await execFileAsync(process.env.PYTHON ?? "python", [
      "-c",
      pythonSnippet,
      scriptPath
    ]);
    const evidence = JSON.parse(stdout) as {
      proofStatus: string;
      clientVisualEffectDirectCallXrefCount: number;
      clientVisualEffectDirectCallXrefs: Array<{
        at: string;
        target: string;
        targetVa: string;
        functionBeginVa: string;
        functionEndVa: string;
        scan: string;
      }>;
      clientVisualEffectDirectCallTargetSummary: Array<{
        target: string;
        targetVa: string;
        callCount: number;
        callerFunctionCount: number;
        sampleCallerFunctions: Array<{
          functionBeginVa: string;
          functionEndVa: string;
          callSites: string[];
        }>;
      }>;
      clientVisualEffectObservedTargetFamilies: string[];
      clientVisualEffectSchedulerDataFlowProofStatus: string;
      remainingBlockedSemantics: string[];
    };

    expect(evidence.proofStatus).toBe(
      "capstone-free-binary-relative-call-target-scan-ran"
    );
    expect(evidence.clientVisualEffectDirectCallXrefCount).toBe(3);
    expect(evidence.clientVisualEffectDirectCallXrefs).toEqual([
      {
        at: "0x14096cf00",
        target: "CNWCVisualEffectOnObject::LoadVisualEffect-progfx-source-loader",
        targetVa: "0x14096cf10",
        functionBeginVa: "0x14096cf00",
        functionEndVa: "0x14096cf60",
        scan: "x64-e8-rel32"
      },
      {
        at: "0x14096cf10",
        target: "CNWMessage::ReadWORD",
        targetVa: "0x1402da450",
        functionBeginVa: "0x14096cf00",
        functionEndVa: "0x14096cf60",
        scan: "x64-e8-rel32"
      },
      {
        at: "0x14096cf20",
        target: "NewCAurObject",
        targetVa: "0x1400931f0",
        functionBeginVa: "0x14096cf00",
        functionEndVa: "0x14096cf60",
        scan: "x64-e8-rel32"
      }
    ]);
    expect(evidence.clientVisualEffectDirectCallTargetSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: "CNWCVisualEffectOnObject::LoadVisualEffect-progfx-source-loader",
          targetVa: "0x14096cf10",
          callCount: 1,
          callerFunctionCount: 1,
          sampleCallerFunctions: [
            {
              functionBeginVa: "0x14096cf00",
              functionEndVa: "0x14096cf60",
              callSites: ["0x14096cf00"]
            }
          ]
        }),
        expect.objectContaining({
          target: "CNWMessage::ReadWORD",
          callCount: 1
        }),
        expect.objectContaining({
          target: "NewCAurObject",
          callCount: 1
        })
      ])
    );
    expect(evidence.clientVisualEffectObservedTargetFamilies).toEqual(
      expect.arrayContaining([
        "message-readers",
        "progfx-source-loader",
        "aurora-object-gob-construction"
      ])
    );
    expect(evidence.clientVisualEffectSchedulerDataFlowProofStatus).toBe(
      "blocked-direct-call-targets-show-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow"
    );
    expect(evidence.remainingBlockedSemantics).toContain(
      "capstone-free scan does not recover register/data-flow conditions, vtable dispatch, or scheduler ordering"
    );
  });

  it("returns an explicit blocker report when capstone is unavailable for binary callgraph audit", async () => {
    const scriptPath = resolve(process.cwd(), "scripts/audit-retail-light-function-disasm.py");
    const pythonSnippet = [
      "import importlib.util, json, pathlib, sys",
      "script = pathlib.Path(sys.argv[1])",
      "spec = importlib.util.spec_from_file_location('audit_light_disasm', script)",
      "module = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(module)",
      "module._CAPSTONE_IMPORT_ERROR = RuntimeError('unit missing capstone')",
      "print(json.dumps(module.analyze_binary(pathlib.Path('missing-nwmain.exe'))))"
    ].join("; ");

    const { stdout } = await execFileAsync(process.env.PYTHON ?? "python", [
      "-c",
      pythonSnippet,
      scriptPath
    ]);
    const evidence = JSON.parse(stdout) as {
      proofStatus: string;
      clientVisualEffectReceiveRenderEvidence: {
        proofStatus: string;
        requiredPythonPackage: string;
        importError: string;
        remainingBlockedSemantics: string[];
      };
    };

    expect(evidence.proofStatus).toBe(
      "blocked-capstone-missing-retail-light-binary-disassembly-not-run"
    );
    expect(evidence.clientVisualEffectReceiveRenderEvidence).toMatchObject({
      proofStatus: "blocked-capstone-missing-client-vfx-binary-callgraph-not-audited",
      requiredPythonPackage: "capstone",
      importError: "unit missing capstone"
    });
    expect(
      evidence.clientVisualEffectReceiveRenderEvidence.remainingBlockedSemantics
    ).toContain(
      "client LoadVisualEffect/ProgFX Type 4 scheduler callgraph cannot be disassembled in this environment"
    );
  });
});
