import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-lightmanager-lane-owner-artifacts.mjs"
);

describe("create-lightmanager-lane-owner-artifacts", () => {
  it("materializes source-backed lane anchors without promoting cross-lane precedence", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-lightmanager-lanes-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const sourceAuditPath = join(absoluteArtifactDir, "source-audit.json");
    const decompiledSourcePath = join(tempRoot, "decompiled_all.c");
    const stringsSourcePath = join(tempRoot, "strings.tsv");
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      join(absoluteArtifactDir, "audit-retail-progfx-type4-table-2026-07-03.json"),
      `${JSON.stringify({
        status: "found",
        source: "C:/NWN/data/nwn_base.key",
        visualEffectsSource: "C:/NWN/data/nwn_base.key",
        summary: {
          proofStatus:
            "source-backed-progfx-type4-table-parameter-distribution-runtime-scheduler-blocked",
          type4RowCount: 68,
          itemLightNormalRowCount: 28,
          itemLightFadeRowCount: 28,
          nonItemType4RowCount: 12,
          animationKindCounts: { light: 56, vision: 10, unknown: 2 },
          castShadowsBooleanCounts: { true: 42, false: 26, unknown: 0 },
          priorityRawCounts: { "13": 2, "20": 56, "49": 2 },
          proximitySuppressionBooleanCounts: { true: 8, false: 60, unknown: 0 },
          attachToSceneBooleanCounts: { true: 2, false: 66, unknown: 0 }
        },
        visualEffectsOwnerSummary: {
          proofStatus:
            "source-backed-visualeffects-progfx-type4-owner-phase-map-runtime-scheduler-blocked",
          type4OwnerPhaseCount: 77,
          itemLightOwnerPhaseCount: 56,
          nonItemOwnerPhaseCount: 21,
          nonItemCastShadowOwnerPhaseCount: 0,
          nonItemAttachToSceneOwnerPhaseCount: 1,
          nonItemProximitySuppressionOwnerPhaseCount: 18,
          itemLightOwnerRows: [
            {
              visualEffectRowId: 168,
              visualEffectLabel: "VFX_DUR_LIGHT_RED_20",
              progFxRowId: 315,
              progFxLabel: "LightRed20m"
            }
          ],
          nonItemOwnerRows: [
            {
              visualEffectRowId: 5,
              visualEffectLabel: "VFX_DUR_BLACKOUT",
              progFxRowId: 333,
              progFxLabel: "LightAreaBlackout"
            }
          ]
        }
      })}\n`,
      "utf8"
    );
    await writeFile(
      join(absoluteArtifactDir, "audit-retail-item-light-tables-2026-07-05.json"),
      `${JSON.stringify({
        proofStatus: "source-backed-retail-key-bif-item-light-tables",
        readers: [{ keyPath: "C:/NWN/data/nwn_base.key", twoDaCount: 597 }],
        tables: [
          {
            resref: "itempropdef",
            status: "found",
            rows: [{ index: 44, cells: { Label: "Light", CostTableResRef: "18" } }]
          },
          {
            resref: "iprp_costtable",
            status: "found",
            rows: [{ index: 18, cells: { Name: "IPRP_LIGHTCOST", ClientLoad: "1" } }]
          },
          {
            resref: "iprp_paramtable",
            status: "found",
            rows: [{ index: 9, cells: { Lable: "Color", TableResRef: "IPRP_COLOR" } }]
          },
          {
            resref: "iprp_lightcost",
            status: "found",
            rows: [
              { index: 1, cells: { Label: "Type:_Dim_(5m)" } },
              { index: 4, cells: { Label: "Type:_Bright_(20m)" } }
            ]
          },
          {
            resref: "iprp_color",
            status: "found",
            rows: [
              { index: 0, cells: { Label: "Blue" } },
              { index: 3, cells: { Label: "Red" } }
            ]
          }
        ]
      })}\n`,
      "utf8"
    );
    await writeFile(
      join(absoluteArtifactDir, "audit-lightstate-default-retail-binary-2026-07-05.json"),
      `${JSON.stringify({
        proofStatus: "retail-binary-backed-nwserver-lightstate-default-on-xref",
        source: "C:/NWN/bin/win32/nwserver.exe",
        references: [
          {
            va: "0x140448ed0",
            defaultOnInstruction: {
              va: "0x140448eb5",
              meaning:
                "mov dword ptr [rbx+0x368], 1 before optional LightState read"
            }
          }
        ]
      })}\n`,
      "utf8"
    );
    await writeFile(
      sourceAuditPath,
      `${JSON.stringify({
        lightManagerSourceOrderingEvidence: {
          proofStatus:
            "source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked",
          directInsertionCallHits: [],
          laneSourceHints: [{ line: 453567, text: "fx_flame01 sourcelight1" }],
          internalInsertionEvidence: {
            proofStatus: "source-backed-lightmanager-internal-insertion-lists"
          },
          scoreSortUploadEvidence: {
            proofStatus: "source-backed-lightmanager-score-sort-upload"
          },
          retailUploadOrderEvidence: {
            proofStatus:
              "source-backed-lightmanager-special-lights-before-sorted-slot-upload"
          },
          frameRebuildOrderingEvidence: {
            proofStatus:
              "source-backed-lightmanager-frame-rebuild-vtable-dispatch-order-owner-lane-precedence-blocked"
          },
          directProximityUploadEvidence: {
            proofStatus: "source-backed-lightmanager-direct-proximity-upload-order"
          },
          remainingBlockedSemantics: [
            "retail cross-lane insertion precedence still requires receiver/owner data-flow"
          ]
        },
        reports: [
          {
            lightManagerRetailXrefs: {
              proofStatus:
                "blocked-lightmanager-core-lane-ordering-no-add-prioritize-remove-update-direct-call-xrefs",
              targetCount: 3,
              requestedTargetCount: 2,
              directCallXrefCount: 1,
              requestedDirectCallXrefCount: 0,
              absoluteAddressRefCount: 2,
              targets: [
                { name: "LightManager::AddLight", va: "0x14007dbd0" },
                {
                  name: "?GetEmitterLighting@LightManager@@QEAA?AVVector@@V2@PEAV?$List@PEAVPartLight@@@@@Z",
                  va: "0x14007ee50"
                },
                {
                  name: "?GetShadowLights@LightManager@@QEAAAEAV?$List@PEAVPartLight@@@@H@Z",
                  va: "0x14007f840"
                }
              ],
              directCallTargetSummary: [],
              requestedDirectCallTargetSummary: [],
              requestedDirectCallXrefs: [],
              absoluteVtableClusterEvidence: {
                proofStatus:
                  "retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite",
                requestedCoreSlots: [
                  {
                    slotVa: "0x140d85f90",
                    target: "LightManager::AddLight",
                    targetVa: "0x14007dbd0"
                  }
                ]
              },
              indirectVtableSlotCallEvidence: {
                proofStatus:
                  "capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked",
                candidateCount: 7,
                sampledCandidateCount: 3,
                sampledCandidatesWithKnownDirectCallContextCount: 1,
                sampledKnownDirectCallTargetSummary: [],
                slotCandidates: [],
                remainingBlockedSemantics: [
                  "no data-flow ties these candidates to lane owners"
                ]
              }
            }
          },
          {
            clientVisualEffectReceiveRenderEvidence: {
              proofStatus:
                "source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path",
              clientObjectVisualEffectVtableSlots: {
                itemSpecificAddTargetVa: "0x140765b00",
                itemSpecificRemoveTargetVa: "0x140765bd0"
              }
            }
          }
        ]
      })}\n`
    );
    await writeFile(
      decompiledSourcePath,
      [
        "string s_Tile_MainLight1_00c298b3;",
        "string s_Tile_MainLight2_00c298cf;",
        "string s_fx_flame01_00c9a90f;",
        "string s_sourcelight1_00c9a91a;",
        "FUN_00addae0(local_f0,s_visualeffects_00c5c8df);",
        "void __cdecl FUN_00a4128c(int param_1,int *param_2)",
        "FUN_00a4139c((int *)(param_1 + 8),param_2);",
        "bool __cdecl FUN_00a41694(int param_1,int param_2)",
        "return *(float *)(param_1 + 0x84) < *(float *)(param_2 + 0x84);",
        "void __cdecl FUN_00a417bc(int param_1)",
        "FUN_00a4139c((int *)(param_1 + 0x38),iVar1);",
        "FUN_00a416bc(puVar2,puVar2 + *(int *)(param_1 + 0x3c),iVar4 >> 2,FUN_00a41694);",
        "void __cdecl FUN_00a42b80(int param_1,float *param_2,float param_3)",
        "*(undefined4 *)(param_1 + 0x30) = 0;",
        "FUN_00a41648((int *)(param_1 + 8),local_8);",
        "(*(int *)(iVar1 + 0x6c) != 0) || (*(int *)(iVar1 + 0x70) != 0)",
        "(*(float *)(iVar1 + 0x4c) == 0.0) && (*(float *)(iVar1 + 0x50) == 0.0)",
        "*(float *)(iVar1 + 0x8c) < 0.0 == (*(float *)(iVar1 + 0x8c) == 0.0)",
        "*(float *)(iVar1 + 0x58) < 1000.0",
        "fVar2 * fVar2 + fVar3 * fVar3 + fVar4 * fVar4 < (float)lVar7 * (float)lVar7",
        "FUN_00a4139c((int *)(param_1 + 0x2c),iVar1);",
        "void __cdecl FUN_00a41850(int *param_1,float *param_2)",
        "local_3c = *(float *)(iVar1 + 0x9c) - param_2[2];",
        "*(float *)(iVar1 + 0x80) = (float)in_ST3;",
        "*(undefined4 *)(iVar1 + 0x84) = 0x47c35000;",
        "fVar2 = *(float *)(iVar1 + 0x58) * *(float *)(iVar1 + 0x8c) * local_8;",
        "iVar4 = *(int *)(iVar1 + 0x74);",
        "((float)(iVar4 + 1) * *(float *)(iVar1 + 0x80)) /",
        "*(undefined4 *)(iVar1 + 0x84) = 0xbf800000;",
        "int __cdecl FUN_00a42728(int param_1,int param_2)",
        "local_54 = (int *)FUN_00a42728(*(int *)(param_1 + 0x108),2);",
        "FUN_00a4139c((int *)(param_1 + 0x5c),iVar6);",
        "*(int *)(param_1 + 0x60) < DAT_00cc309c",
        "*(float *)(iVar6 + 0x80) <= fVar1",
        "undefined4 __stdcall FUN_00a41e30(void)",
        "local_4 = 0x80;",
        "if (DAT_00cc3098 < 0x81) {",
        "void __cdecl FUN_00a41e50(int param_1,int *param_2,int *param_3,int param_4)",
        "local_14 = FUN_00a41e30();",
        "local_14 = local_14 + -2;",
        "FUN_00a4139c(param_2,iVar4);",
        "FUN_00a40b60(*piVar1,uVar15,fVar16);",
        "FUN_00a7817c(uVar7);",
        "uint __cdecl FUN_00a42f5c(int param_1)",
        "FUN_00a40b60(iVar3,local_8,*(float *)(iVar3 + 0x78));",
        "void FUN_00a72ed8(undefined4 param_1,undefined4 param_2,undefined4 param_3,int *param_4)",
        "local_10c = &DAT_00cff7e0;",
        "while (iVar5 = FUN_00a41e30(), local_a4 < iVar5) {"
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      stringsSourcePath,
      [
        '15789\tDEFINED\t00cc3ff1\ts_placeablelight_00cc3ff1\tds "placeablelight"\t"placeablelight"\tstring\t15\ttrue',
        '207\tDEFINED\t0042aafc\t\tds "TNWPlaceableTemplate *"\t"TNWPlaceableTemplate *"\tstring\t23\ttrue'
      ].join("\n"),
      "utf8"
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
        sourceAuditPath,
        "--decompiledSource",
        decompiledSourcePath,
        "--stringsSource",
        stringsSourcePath
      ],
      { maxBuffer: 1024 * 1024 }
    );

    expect(JSON.parse(stdout)).toMatchObject({
      status: "lightmanager-lane-owner-artifacts-written-cross-lane-order-still-blocked",
      requestedDirectCallXrefCount: 0,
      sourceOrderingProofStatus:
        "source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked",
      activeSlotAlgorithmProofStatus:
        "source-backed-active-slot-cap-score-sort-prune-append-upload-shader-loop-lane-score-input-still-blocked",
      sourceFamilyProofStatuses: {
        "placeables-2da-light":
          "retail-table-binary-backed-placeable-lightcolor-lightstate-shadowsize-family-owner-order-blocked",
        "item-property-light":
          "retail-table-backed-itempropertylight-vfx-dur-light-progfx-fx-light-family-owner-order-blocked",
        "progfx-type4-light-or-vision":
          "retail-table-backed-progfx-type4-table-owner-phase-family-runtime-scheduler-blocked"
      }
    });
    const callgraph = JSON.parse(
      await readFile(join(absoluteArtifactDir, "lightmanager-lane-owner-callgraph.json"), "utf8")
    );
    expect(callgraph).toMatchObject({
      status: "blocked-common-lane-owner-precedence-not-recovered",
      passed: false,
      recoveredSourceOrdering: {
        proofStatus:
          "source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked",
        directInsertionCallHitCount: 0,
        frameRebuildOrderingProofStatus:
          "source-backed-lightmanager-frame-rebuild-vtable-dispatch-order-owner-lane-precedence-blocked"
      },
      activeSlotAlgorithmEvidence: {
        proofStatus:
          "source-backed-active-slot-cap-score-sort-prune-append-upload-shader-loop-lane-score-input-still-blocked",
        maxActiveLights: {
          hardCap: 128,
          configuredGlobal: "DAT_00cc3098"
        },
        candidateFilterSemantics: {
          function: "FUN_00a42b80",
          sourceList: "param_1+8",
          candidateSourceList: "param_1+0x2c",
          radiusField: "light+0x58",
          falloffOrIntensityField: "light+0x8c",
          finiteRadiusSentinel: 1000,
          activeSelectionCountCap: "DAT_00cc309c"
        },
        scoreComputationSemantics: {
          function: "FUN_00a41850",
          distanceField: "light+0x80",
          scoreField: "light+0x84",
          formula:
            "score = ((priority + 1) * distance) / ((class + 4) * (falloff + 1))",
          invalidScoreSentinel: "0x47c35000",
          specialScoreSentinel: "0xbf800000 (-1.0)"
        },
        decompiledCallsiteSearch: {
          proofStatus:
            "decompiled-lightmanager-callsite-search-complete-upstream-owner-calls-still-blocked",
          searchedTargetCount: 6,
          directCallTargetCount: 1,
          searchedTargets: expect.arrayContaining([
            expect.objectContaining({
              symbol: "FUN_00a4128c",
              occurrenceCount: 1,
              definitionCount: 1,
              directCallCount: 0,
              status: "no-direct-callsite-observed-in-decompiled-source"
            }),
            expect.objectContaining({
              symbol: "FUN_00a42728",
              occurrenceCount: 2,
              definitionCount: 1,
              directCallCount: 1,
              status: "direct-callsite-observed-in-decompiled-source"
            })
          ])
        }
      },
      laneOwnerSourceAnchorScan: {
        proofStatus: "source-backed-lane-owner-anchor-scan-ran"
      },
      laneOwnerStringTableAnchorScan: {
        proofStatus: "decompilation-string-table-anchor-scan-ran"
      }
    });
    expect(callgraph.requiredLaneOwners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lane: "terrain-tile-main-light",
          sourceAnchorStatus: "source-backed-lane-anchor-observed"
        }),
        expect.objectContaining({
          lane: "terrain-tile-source-light",
          sourceAnchorStatus: "source-backed-lane-anchor-observed"
        }),
        expect.objectContaining({
          lane: "progfx-type4-light-or-vision",
          sourceAnchorStatus: "source-backed-lane-anchor-observed"
        }),
        expect.objectContaining({
          lane: "placeables-2da-light",
          sourceAnchorStatus: "not-observed-in-source-only-decompilation",
          stringTableAnchorStatus: "decompilation-string-table-anchor-observed",
          sourceFamilyStatus: "retail-table-binary-family-owner-order-blocked",
          sourceFamilyProofStatus:
            "retail-table-binary-backed-placeable-lightcolor-lightstate-shadowsize-family-owner-order-blocked"
        }),
        expect.objectContaining({
          lane: "item-property-light",
          sourceFamilyStatus: "retail-table-family-owner-order-blocked",
          sourceFamilyProofStatus:
            "retail-table-backed-itempropertylight-vfx-dur-light-progfx-fx-light-family-owner-order-blocked"
        })
      ])
    );
    expect(callgraph.sourceFamilyArtifacts).toMatchObject({
      progFxAudit: { status: "present" },
      itemLightAudit: { status: "present" },
      lightStateAudit: { status: "present" }
    });
    expect(callgraph.sourceFamilyEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lane: "item-property-light",
          itemLightTables: expect.objectContaining({
            proofStatus: "source-backed-retail-key-bif-item-light-tables"
          }),
          progFxType4Table: expect.objectContaining({
            itemLightNormalRowCount: 28,
            itemLightFadeRowCount: 28,
            itemLightOwnerPhaseCount: 56
          })
        }),
        expect.objectContaining({
          lane: "placeables-2da-light",
          acceptedSourceBackedFacts: [],
          acceptedRetailResourceBackedFacts: expect.arrayContaining([
            "placeables.2da LightColor/LightOffset drives a real placeable point-light lane in Aurora Web diagnostics"
          ]),
          acceptedRetailBinaryBackedFacts: expect.arrayContaining([
            "missing UTP LightState defaults to ON when the LightState binary audit is present"
          ]),
          lightStateAudit: expect.objectContaining({
            proofStatus: "retail-binary-backed-nwserver-lightstate-default-on-xref",
            defaultOnInstructionCount: 1
          })
        }),
        expect.objectContaining({
          lane: "progfx-type4-light-or-vision",
          retailTable: expect.objectContaining({
            type4RowCount: 68,
            nonItemCastShadowOwnerPhaseCount: 0
          })
        })
      ])
    );
  });
});
