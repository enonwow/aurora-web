import { buildAreaLightingEvidenceReport } from "../../src/modules/areas/domain/area-lighting-evidence";
import type { AreaRecord } from "../../src/modules/areas/domain/area.types";

describe("area-lighting-evidence", () => {
  it("counts LightState=0 as source-backed UTP light state evidence", () => {
    const report = buildAreaLightingEvidenceReport(
      [],
      [
        {
          templateId: "plc_light_off",
          resref: "plc_light_off",
          name: "Off Light",
          category: "light",
          tags: ["light_source"],
          metadata: {
            lightState: 0
          }
        }
      ],
      {
        processedMdlLightTemplatesScanned: 0,
        processedMdlLightScanLimit: 24,
        processedMdlLightSources: []
      }
    );

    expect(report.summary.catalogLightSourceTemplates).toBe(1);
    expect(report.summary.catalogLightStateTemplates).toBe(1);
    expect(report.catalogLightSources[0]).toMatchObject({
      templateId: "plc_light_off",
      evidence: expect.arrayContaining(["catalog.light_source", "utp.LightState"]),
      lightState: 0
    });
  });

  it("keeps ShadowSize=0 as a valid small placeable shadow in area lighting evidence", () => {
    const report = buildAreaLightingEvidenceReport(
      [],
      [
        {
          templateId: "plc_small_shadow",
          resref: "plc_small_shadow",
          name: "Small Shadow",
          category: "light",
          tags: ["light_source"],
          metadata: {
            source2daShadowSize: 0
          }
        }
      ],
      {
        processedMdlLightTemplatesScanned: 0,
        processedMdlLightScanLimit: 24,
        processedMdlLightSources: []
      }
    );

    expect(report.summary.catalogLightSourceTemplates).toBe(1);
    expect(report.summary.shadowCatalogShadowSizeTemplates).toBe(1);
    expect(report.summary.shadowDiagnosticEntries).toBe(1);
    expect(report.shadowDiagnostic).toMatchObject({
      shadowRelevantEntries: 1,
      catalogShadowSizeTemplates: 1
    });
    expect(report.shadowDiagnostic.entries).toEqual([
      expect.objectContaining({
        entryId: "catalog-shadow:plc_small_shadow",
        source: "catalog-placeable-shadow-size",
        templateId: "plc_small_shadow",
        shadowSize: 0,
        note: "placeables.2da ShadowSize is present on this light-source template."
      })
    ]);
  });

  it("summarizes ARE tile lights and placeable name candidates", () => {
    const report = buildAreaLightingEvidenceReport(
      [
        buildArea({
          tiles: [
            {
              tileInstanceId: "area_market:tile:0",
              areaId: "area_market",
              tilesetResRef: "tno01",
              row: 0,
              col: 0,
              tileIndex: 0,
              tileId: 101,
              modelResRef: "tno01_a01_01",
              source: "are-tile-list",
              mainLight1: 3,
              sourceLight1: 5,
              mainLight1Color: {
                rowId: 3,
                red: 1,
                green: 0.75,
                blue: 0.25,
                sourceKey: "modules/current/__aurora/sources/vanilla/lightcolor.2da"
              },
              sourceLight1Color: {
                rowId: 5,
                red: 0.25,
                green: 0.5,
                blue: 1,
                sourceKey: "modules/current/__aurora/sources/vanilla/tilecolor.2da"
              },
              animLoop1: 1
            }
          ],
        objects: [
          {
            objectId: "obj_torch_001",
              kind: "placeable",
              templateId: "plc_wall_torch",
              resRef: "plc_wall_torch",
              tag: "TorchLight",
              x: 1,
              y: 2,
              z: 0,
              bearing: 0
            }
          ],
          lighting: {
            source: "are-root-fields",
            fields: [
              { field: "LightingScheme", value: 2 },
              { field: "ShadowOpacity", value: 80 },
              { field: "SunAmbientColor", value: 16764057 }
            ]
          }
        })
      ],
      [
        {
          templateId: "plc_magic_yellow",
          resref: "plc_magic_yellow",
          name: "Magic Yellow",
          category: "light",
          tags: ["light_source"],
          metadata: {
            source2daLightColorRaw: "7",
            source2daLightColorRow: 7,
            source2daLightColorLabel: "Yellow",
            source2daLightRed: 1.9,
            source2daLightGreen: 1.7,
            source2daLightBlue: 0.06,
            source2daLightOffsetZ: 4,
            source2daShadowSize: 1,
            source2daStatic: true,
            lightState: 2,
            modelResRef: "plc_u07"
          }
        }
      ],
      {
        processedMdlLightTemplatesScanned: 1,
        processedMdlLightScanLimit: 24,
        processedMdlLightSources: [
          {
            templateId: "plc_magic_yellow",
            resref: "plc_magic_yellow",
            name: "Magic Yellow",
            modelResRef: "plc_u07",
            cacheKey: "cache_plc_magic_yellow",
            cacheHit: false,
            nodes: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId: "asset_plc_u07",
                sourceModelFileName: "plc_u07.mdl",
                sourceModelObjectKey: "modules/current/models/plc_u07.mdl",
                nodeName: "light01",
                sourceNodeKind: "placeablelight",
                position: { x: 0, y: 0, z: 1.25 },
                radius: 6,
                quadraticAtten: 0.125,
                quadraticAttenSource:
                  "C:/Projects/New Folder/export/decompiled_all.c:865404-865409 FUN_00a40b60 uploads lightQuadraticAtten = 9/(max(radius,0.1)^2*2)",
                quadraticAttenProofStatus: "source-backed-mdl-radius-quadratic-attenuation",
                auroraLightFieldParserSource:
                  "C:/Projects/New Folder/export/decompiled_all.c:883029-883250 FUN_00a5872c parses AuroraLight color into +0x54, radius into +0x58, shadowradius into +0x60, verticaldisplacement into +0x64, multiplier into +0x8c, shadow into +0xc0, and lightpriority into +0xb0",
                auroraLightFieldParserProofStatus:
                  "source-backed-mdl-auroralight-field-parser",
                color: { red: 1, green: 0.85, blue: 0.15 },
                shadow: true,
                lightPriority: 3,
                animationNames: ["default"]
              }
            ]
          }
        ]
      }
    );

    expect(report.summary).toEqual({
      areasScanned: 1,
      tileLightTiles: 1,
      tileLightReferences: 2,
      tileLightAreas: 1,
      areaGlobalLightingAreas: 1,
      areaGlobalLightingFields: 3,
      areaShadowOpacityAreas: 1,
      placeableNameCandidates: 1,
      placeableNameCandidateAreas: 1,
      catalogLightSourceTemplates: 1,
      catalogLightColorTemplates: 1,
      catalogLightStateTemplates: 1,
      processedMdlLightTemplatesScanned: 1,
      processedMdlLightSourceTemplates: 1,
      processedMdlLightNodes: 1,
      processedMdlLightScanLimit: 24,
      auroraActiveLightSlotCap: 128,
      rendererCandidateLights: 5,
      rendererAcceptedLights: 5,
      rendererDroppedLights: 0,
      shadowDiagnosticEntries: 3,
      shadowMdlLightNodes: 1,
      shadowCatalogShadowSizeTemplates: 1,
      auditCoverageEntries: 18,
      auditCoverageSourceBacked: 12,
      auditCoveragePreviewOnly: 1,
      auditCoverageBlocked: 4,
      auditCoverageNotObserved: 1,
      auditGaps: 6,
      remainingRetailBlockers: 3
    });
    expect(report.tileLights[0]).toMatchObject({
      areaId: "area_market",
      tileInstanceId: "area_market:tile:0",
      mainLight1: 3,
      sourceLight1: 5,
      mainLight1Color: {
        rowId: 3,
        red: 1,
        green: 0.75,
        blue: 0.25
      },
      sourceLight1Color: {
        rowId: 5,
        red: 0.25,
        green: 0.5,
        blue: 1
      },
      animLoop1: 1
    });
    expect(report.areaGlobalLighting[0]).toMatchObject({
      areaId: "area_market",
      source: "are-root-fields",
      fields: expect.arrayContaining([
        { field: "LightingScheme", value: 2 },
        { field: "ShadowOpacity", value: 80 },
        { field: "SunAmbientColor", value: 16764057 }
      ])
    });
    expect(report.placeableNameCandidates[0]).toMatchObject({
      objectId: "obj_torch_001",
      templateId: "plc_wall_torch",
      matchedTokens: expect.arrayContaining(["torch"])
    });
    expect(report.catalogLightSources[0]).toMatchObject({
      templateId: "plc_magic_yellow",
      evidence: expect.arrayContaining(["placeables.2da.LightColor", "utp.LightState"]),
      source2daLightColorRow: 7,
      source2daLightColorLabel: "Yellow",
      source2daLightOffsetZ: 4,
      lightState: 2,
      modelResRef: "plc_u07"
    });
    expect(report.processedMdlLightSources[0]).toMatchObject({
      templateId: "plc_magic_yellow",
      cacheKey: "cache_plc_magic_yellow",
      nodes: [
        expect.objectContaining({
          nodeName: "light01",
          sourceNodeKind: "placeablelight",
          position: { x: 0, y: 0, z: 1.25 },
          color: { red: 1, green: 0.85, blue: 0.15 },
          quadraticAtten: 0.125,
          quadraticAttenProofStatus: "source-backed-mdl-radius-quadratic-attenuation",
          auroraLightFieldParserSource: expect.stringContaining("FUN_00a5872c"),
          auroraLightFieldParserProofStatus: "source-backed-mdl-auroralight-field-parser",
          shadow: true,
          lightPriority: 3
        })
      ]
    });
    expect(report.rendererLightBudget).toMatchObject({
      activeLightSlotCap: 128,
      candidateLights: 5,
      acceptedLights: 5,
      droppedLights: 0,
      priorityStrategy: "source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback",
      priorityStrategyProofStatus:
        "source-backed-mdl-lightmanager-score-diagnostic-cross-lane-fallback",
      retailMdlLightScoreSource: expect.stringContaining("FUN_00a41850"),
      retailMdlLightSortSource: expect.stringContaining("FUN_00a4165c/FUN_00a417bc"),
      retailActiveLightSortScoreSource: expect.stringContaining("FUN_00a41694"),
      retailActiveLightSortScoreFormula: expect.stringContaining("ascending +0x84 score"),
      retailActiveLightSortDirection: "ascending-score-field-0x84",
      retailActiveLightSortScoreProofStatus:
        "source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked",
      retailActiveLightUploadSource: expect.stringContaining("FUN_00a41e50"),
      retailOrderingStatus: "blocked-no-recovered-retail-cross-lane-active-light-ordering"
    });
    expect(report.rendererLightBudget.candidates[0]).toMatchObject({
      source: "processed-mdl-light-node",
      label: "Magic Yellow:light01",
      priority: 300,
      rank: 1,
      accepted: true,
      lightPriority: 3,
      retailMdlScoreSource: expect.stringContaining("FUN_00a41850"),
      retailMdlScoreProofStatus:
        "source-backed-mdl-lightmanager-score-exact-runtime-inputs-not-available-in-area-audit",
      retailMdlPreviewScorePriority: 3,
      retailMdlPreviewScorePreviewDistance: 1.25,
      retailMdlPreviewScoreRangeTerm: 6,
      retailMdlPreviewScoreFormula: expect.stringContaining(
        "((priority+1)*previewDistance)/((field0x70+4)*(rangeTerm+1))"
      ),
      retailMdlPreviewScoreSource: expect.stringContaining("FUN_00a41694"),
      retailMdlPreviewScoreProofStatus:
        "source-backed-retail-lightmanager-score-preview-input-fallback",
      retailMdlPreviewScoreSortDirection: "ascending-score-field-0x84-preview",
      retailMdlPreviewScoreFallback: expect.stringContaining("cross-lane-callsite-blocked"),
      prioritySource: expect.stringContaining(
        "processed MDL lane uses recovered LightManager preview score"
      )
    });
    expect(report.rendererLightBudget.candidates[0].retailMdlPreviewScore).toBeCloseTo(5 / 28);
    expect(report.rendererLightBudget.candidates.map((candidate) => candidate.source)).toEqual([
      "processed-mdl-light-node",
      "tile-light-reference",
      "tile-light-reference",
      "catalog-light-source-template",
      "placeable-name-candidate"
    ]);
    expect(report.shadowDiagnostic).toMatchObject({
      shadowRelevantEntries: 3,
      globalShadowFields: 1,
      areaShadowOpacityFields: 1,
      mdlShadowLightNodes: 1,
      catalogShadowSizeTemplates: 1
    });
    expect(report.shadowDiagnostic.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "area-root-shadow-field",
          field: "ShadowOpacity",
          value: 80
        }),
        expect.objectContaining({
          source: "processed-mdl-light-node",
          nodeName: "light01",
          shadow: true,
          rendererRank: 1,
          rendererAccepted: true
        }),
        expect.objectContaining({
          source: "catalog-placeable-shadow-size",
          templateId: "plc_magic_yellow",
          shadowSize: 1
        })
      ])
    );
    expect(report.auditCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "area-tile-light-color",
          status: "source-backed",
          evidence: "2/2 non-zero tile light ids carry decoded 2DA RGB metadata (2 raw fields scanned; 0 decoded RGB entries are black and are not renderer candidates)."
        }),
        expect.objectContaining({
          key: "area-tile-light-radius-falloff",
          status: "source-backed",
          proof: expect.stringContaining("Tile_MainLight1/Tile_MainLight2"),
          evidence:
            "1 renderable main-light references use recovered static lightcolor.2da tile lane with no point radius/falloff; 1 renderable source-light references use recovered fx_flame01/AuroraLight01 radius/falloff."
        }),
        expect.objectContaining({
          key: "area-tile-source-light-proxy",
          status: "source-backed",
          proof: expect.stringContaining("sourcelight1/sourcelight2")
        }),
        expect.objectContaining({
          key: "placeable-radius-falloff",
          status: "source-backed",
          proof: expect.stringContaining("fx_placeable01/AuroraLight01")
        }),
        expect.objectContaining({
          key: "placeable-lightstate-toggle",
          label: "Placeable illumination state",
          status: "source-backed",
          evidence: expect.stringContaining("Missing UTP LightState defaults to ON"),
          proof: expect.stringContaining(
            "0x1404484d0..0x14044a2ec contains LightState xref"
          )
        }),
        expect.objectContaining({
          key: "renderer-active-light-budget",
          status: "source-backed"
        }),
        expect.objectContaining({
          key: "area-shadow-volume-implementation",
          status: "blocked",
          proof: expect.stringContaining(
            "shadowVolumeProjectionEvidence proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked"
          ),
          blocker: expect.stringContaining("FUN_00a78128")
        }),
        expect.objectContaining({
          key: "mdl-light-node-radius-color-shadow",
          status: "source-backed",
          proof: expect.stringContaining("FUN_00a5872c")
        }),
        expect.objectContaining({
          key: "item-property-light-runtime-scheduler",
          status: "blocked",
          proof: expect.stringContaining("CNWSItemPropertyHandler::ApplyLight at 0x140405e40"),
          blocker: expect.stringContaining(
            "cross-lane insertion order and retail shadow-volume projection parity"
          )
        }),
        expect.objectContaining({
          key: "progfx-type4-runtime-scheduler",
          status: "blocked",
          proof: expect.stringContaining(
            "source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path"
          ),
          blocker: expect.stringContaining(
            "source-only decompiled_all.c still has no progfx.2da/fx_light_clr/Blind_Vision scheduler string hit"
          )
        }),
        expect.objectContaining({
          key: "renderer-active-light-ordering",
          status: "blocked",
          proof: expect.stringContaining("FUN_00a4128c"),
          blocker: expect.stringContaining("requestedDirectCallXrefCount=0")
        })
      ])
    );
    const itemSchedulerCoverage = report.auditCoverage.find(
      (entry) => entry.key === "item-property-light-runtime-scheduler"
    );
    expect(itemSchedulerCoverage?.proof).toContain(
      "backend/scripts/audit-retail-light-function-disasm.py disassembles nwmain.exe ApplyLight"
    );
    expect(itemSchedulerCoverage?.proof).toContain(
      "visualeffects.2da rows 153..180 to explicit progfx.2da Type 4 normal rows 300..327/fade rows 350..377"
    );
    expect(itemSchedulerCoverage?.proof).toContain(
      "progfx.2da Type 4 Param3 provides item-light cast-shadow toggle with 5m rows=0 and 10m/15m/20m rows=1"
    );
    expect(itemSchedulerCoverage?.proof).toContain(
      "iprp_lightcost.2da rows 1..4 Dim 5m/Low 10m/Normal 15m/Bright 20m"
    );
    expect(itemSchedulerCoverage?.proof).toContain(
      "color byte [CNWItemProperty+9] jump-table maps iprp_color values 0..6 to VFX_DUR_LIGHT base rows 153/157/161/165/177/169/173"
    );
    expect(itemSchedulerCoverage?.proof).toContain(
      "brightness word [CNWItemProperty+6] adds 0..3 for Dim/Low/Normal/Bright"
    );
    expect(itemSchedulerCoverage?.proof).toContain(
      "OnRemoveLight disassembles via linear fallback to mov eax,1; ret"
    );
    expect(itemSchedulerCoverage?.proof).toContain("mdlNodeLightPartLightLifecycle");
    expect(itemSchedulerCoverage?.proof).toContain("createdPartLightSizeBytes=192");
    expect(itemSchedulerCoverage?.proof).toContain("OnApplyVisualEffect 0x140434fc0..0x140435635");
    expect(itemSchedulerCoverage?.proof).toContain("CNWSObject::AddLoopingVisualEffect at 0x140435400");
    expect(itemSchedulerCoverage?.proof).toContain("CNWSObject+0x160 with count +0x168");
    expect(itemSchedulerCoverage?.proof).toContain(
      "source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path"
    );
    expect(itemSchedulerCoverage?.proof).toContain(
      "visual-effect loaders create CAurObject/Gob instances through NewCAurObject"
    );
    const progFxCoverage = report.auditCoverage.find(
      (entry) => entry.key === "progfx-type4-runtime-scheduler"
    );
    expect(progFxCoverage?.proof).toContain(
      "audit-retail-progfx-type4-table.ts over retail nwn_base.key reports progfx rowCount=1301, type4RowCount=68"
    );
    expect(progFxCoverage?.proof).toContain(
      "itemLightNormalRowCount=28, itemLightFadeRowCount=28, nonItemType4RowCount=12"
    );
    expect(progFxCoverage?.proof).toContain(
      "animationKindCounts light=56 vision=10 unknown=2"
    );
    expect(progFxCoverage?.proof).toContain("Param3 castShadows true=42 false=26");
    expect(progFxCoverage?.proof).toContain("Param5 proximity true=8 false=60");
    expect(progFxCoverage?.proof).toContain(
      "nonItemRows=[328,329,330,331,332,333,378,379,380,381,382,383]"
    );
    expect(progFxCoverage?.proof).toContain("nonItemCastShadowRows=[]");
    expect(progFxCoverage?.proof).toContain(
      "proximityRows=[328,329,330,332,378,379,380,382]"
    );
    expect(progFxCoverage?.proof).toContain("attachRows=[333,383]");
    expect(progFxCoverage?.proof).toContain(
      "visionRows=[328,329,330,331,333,378,379,380,381,383]"
    );
    expect(progFxCoverage?.proof).toContain(
      "type4OwnerPhaseCount=77, itemLightOwnerPhaseCount=56, nonItemOwnerPhaseCount=21"
    );
    expect(progFxCoverage?.proof).toContain("nonItemCastShadowOwnerPhaseCount=0");
    expect(progFxCoverage?.proof).toContain(
      "nonItemOwnerLabels=[VFX_DUR_BLACKOUT,VFX_DUR_DARKVISION,VFX_FNF_SOUND_BURST,VFX_FNF_STRIKE_HOLY,VFX_DUR_BLINDVISION,VFX_DUR_LOWLIGHTVISION,VFX_DUR_ULTRAVISION,VFX_DUR_BLIND,VFX_FNF_SOUND_BURST_SILENT,VFX_FNF_TELEPORT_IN,VFX_FNF_TELEPORT_OUT]"
    );
    expect(progFxCoverage?.proof).toContain(
      "clientObjectVisualEffectLifecycle proofStatus=source-backed-client-object-add-remove-refresh-looping-vfx-path"
    );
    expect(progFxCoverage?.proof).toContain(
      "visualEffectSourceModelLoaders proofStatus=source-backed-client-vfx-loadvisualeffect-newcaurobject-model-loader-path"
    );
    expect(progFxCoverage?.proof).toContain("clientVisualEffectDirectCallXrefCount=1502");
    expect(progFxCoverage?.proof).toContain(
      "clientVisualEffectObservedTargetFamilies=[message-readers,visual-transform-reader,looping-vfx-list-attach,progfx-source-loader,vfx-2da-row-loader,fx-light-loader-region,aurora-object-gob-construction,runtime-state-scene-helpers]"
    );
    expect(progFxCoverage?.proof).toContain(
      "clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path-scheduler-dataflow-blocked"
    );
    expect(progFxCoverage?.proof).toContain(
      "clientKnownFunctionCallgraph proofStatus=source-backed-capstone-free-client-vfx-message-owner-loader-callgraph"
    );
    expect(progFxCoverage?.proof).toContain(
      "clientVisualEffectSchedulerDataFlowProofStatus=blocked-capstone-free-callgraph-proves-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow"
    );
    expect(progFxCoverage?.proof).toContain(
      "legacyDirectCallScanSchedulerStatus=blocked-direct-call-targets-show-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow"
    );
    expect(progFxCoverage?.proof).toContain("NewCAurObject=116");
    expect(progFxCoverage?.proof).toContain(
      "progfxType4SourceSchedulerEvidence proofStatus=source-backed-visualeffects-loader-progfx-type4-scheduler-not-in-source-only-decompilation"
    );
    expect(progFxCoverage?.proof).toContain("runtimeSchedulerStringHitCount=0");
    expect(progFxCoverage?.blocker).toContain(
      "nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0"
    );
    expect(progFxCoverage?.blocker).toContain(
      "proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity"
    );
    const rendererOrderingCoverage = report.auditCoverage.find(
      (entry) => entry.key === "renderer-active-light-ordering"
    );
    expect(rendererOrderingCoverage?.proof).toContain(
      "absoluteVtableClusterEvidence proofStatus=retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite"
    );
    expect(rendererOrderingCoverage?.proof).toContain("cluster=0x140d85f78..0x140d85fd0");
    expect(rendererOrderingCoverage?.proof).toContain("requestedCoreSlotCount=4");
    expect(rendererOrderingCoverage?.proof).toContain(
      "indirectVtableSlotCallEvidence proofStatus=capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked"
    );
    expect(rendererOrderingCoverage?.proof).toContain(
      "slotCounts PrioritizeLights=5298/AddLight=617/RemoveLight=2520/UpdateLights=191"
    );
    expect(rendererOrderingCoverage?.proof).toContain(
      "sampledCandidateCount=192 sampledCandidatesWithKnownDirectCallContextCount=16"
    );
    expect(rendererOrderingCoverage?.proof).toContain(
      "sampledKnownDirectCallTargetSummary GetShadowLights=21/GetEmitterLighting=20"
    );
    expect(rendererOrderingCoverage?.blocker).toContain(
      "indirect slot-offset candidates plus their sampled same-function direct-call context are helper/render/collect inventory without receiver/lane data-flow"
    );
    const shadowVolumeCoverage = report.auditCoverage.find(
      (entry) => entry.key === "area-shadow-volume-implementation"
    );
    expect(shadowVolumeCoverage?.proof).toContain("vs_shadowvol/fs_shadowvol");
    expect(shadowVolumeCoverage?.proof).toContain(
      "shadowradius +0x60 when positive else radius +0x58"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "casterBufferGeometryEvidence proofStatus=source-backed-shadowvol-caster-geometry-paired-vertex-index-buffer-fill"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "stencilOpSequenceEvidence proofStatus=source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "toolsetFaceOpTableEvidence proofStatus=source-backed-toolset-binary-glstencilopseparate-face-op-table-mapped"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "renderStateWrapperEvidence proofStatus=source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-bracket-mapped"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "blendDepthColorMaskWrapperEvidence proofStatus=source-backed-render-state-blend-depth-color-mask-wrappers-mapped"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "immediateCallerBufferFlushEvidence proofStatus=source-backed-shadowvol-immediate-caller-buffer-flush-no-blend-depth-color-mask-state-wrapper"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "directCallerBufferBuilderEvidence proofStatus=source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "activeLightRenderEnvelopeEvidence proofStatus=source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked"
    );
    expect(shadowVolumeCoverage?.proof).toContain("colorDepthMaskCallHits=[]");
    expect(shadowVolumeCoverage?.proof).toContain(
      "localDrawStateOrderEvidence proofStatus=source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked"
    );
    expect(shadowVolumeCoverage?.proof).toContain("localBlendDepthColorMaskCallHits=[]");
    expect(shadowVolumeCoverage?.proof).toContain("blendDepthColorMaskCallHits=[]");
    expect(shadowVolumeCoverage?.proof).toContain(
      "toolsetCapabilityEvidence proofStatus=source-backed-toolset-binary-render-state-slot3-gl-cull-face-mapped"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "888069-888414 FUN_00a5fdb4 is the direct caller/buffer builder"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "910553-910663 FUN_00a82464 sets DAT_00d0233c=param_1"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "904335-904339 maps facade FUN_00a78384 to FUN_00a6f3bc"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "shaderUniformEvidence proofStatus=source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "913999 transforms the shadow light matrix through FUN_00a785d4"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "914001 binds DAT_00d0247c through FUN_00a788b0"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "904560-904969 FUN_00a785d4/FUN_00a788b0/FUN_00a78994/FUN_00a78980"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "900870-900884 FUN_00a7278c writes vec4 uniforms"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "913929-914033 local draw-state order, 888188-888213 immediate caller, 888069-888414 direct caller/buffer-builder, and 910553-910663 active-light render envelope have no color/depth-mask wrapper hit"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "898421-898425 maps FUN_00a6f1ec to glBlendFunc"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "898630-898634 maps FUN_00a6f518 to glDepthFunc"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "face table 0xcc9a38 slot 0=GL_FRONT/0x404 slot 1=GL_BACK/0x405"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "jump tables 0xa6efc4/0xa6f0f2 map render-state slot 3 to push 0x0b44"
    );
    expect(shadowVolumeCoverage?.proof).toContain("GL_CULL_FACE");
    expect(shadowVolumeCoverage?.proof).toContain(
      "frontendRuntimePortStatus=source-backed-shadowplane-shadowvol-shader-caster-path-zpass-zfail-stencil-render-state-slot3-preview-active-retail-face-op-mapped-parity-blocked"
    );
    expect(shadowVolumeCoverage?.proof).toContain(
      "FUN_00a78344(0,0,0,3)"
    );
    expect(shadowVolumeCoverage?.proof).toContain("indicesPerCasterEdge=6");
    expect(shadowVolumeCoverage?.proof).toContain("scene geometry buckets 0xd/0xe/0xb/0xc");
    expect(shadowVolumeCoverage?.blocker).toContain(
      "frontend helpers for the retail paired-vertex/six-index caster buffer schema, an equivalent Three BufferGeometry"
    );
    expect(shadowVolumeCoverage?.blocker).toContain("auroraShadowVolumeW");
    expect(shadowVolumeCoverage?.blocker).toContain(
      "placeable fast-shadow proxies bind a source-quad caster buffer"
    );
    expect(shadowVolumeCoverage?.blocker).toContain(
      "active Three ShaderMaterial w-pair extrusion preview"
    );
    expect(shadowVolumeCoverage?.blocker).toContain(
      "WebGL stencil front/back z-pass/z-fail receiver lane uses"
    );
    expect(shadowVolumeCoverage?.blocker).toContain(
      "retail-mapped GL_FRONT/GL_BACK plus GL_KEEP/GL_INCR/GL_DECR sequence"
    );
    expect(shadowVolumeCoverage?.blocker).toContain(
      "local draw-state order from FUN_00a878f8 is exposed"
    );
    expect(shadowVolumeCoverage?.blocker).toContain(
      "indirect vtable inherited state"
    );
    expect(shadowVolumeCoverage?.blocker).toContain(
      "pixel/geometry/complete wrapped render-state parity"
    );
    expect(report.auditGaps.map((entry) => entry.key)).toEqual(
      expect.arrayContaining([
        "area-tile-light-position",
        "area-shadow-volume-implementation",
        "item-property-light-runtime-scheduler",
        "progfx-type4-runtime-scheduler",
        "renderer-active-light-ordering"
      ])
    );
    expect(report.auditGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "item-property-light-runtime-scheduler",
          status: "blocked",
          nextStep: expect.stringContaining(
            "cross-lane insertion order and retail shadow-volume projection parity"
          )
        }),
        expect.objectContaining({
          key: "area-tile-light-position",
          status: "preview-only",
          nextStep: expect.stringContaining("tile-center preview")
        }),
        expect.objectContaining({
          status: "not-observed",
          nextStep: expect.stringContaining("Add a scanned area/resource fixture")
        })
      ])
    );
    expect(report.remainingRetailBlockers.map((entry) => entry.key)).toEqual([
      "retail-shadow-volume-projection-parity",
      "retail-cross-lane-active-light-ordering",
      "progfx-type4-priority-proximity-vision-scheduler"
    ]);
    expect(report.remainingRetailBlockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "retail-shadow-volume-projection-parity",
          affectedCoverageKeys: expect.arrayContaining([
            "area-shadow-volume-implementation",
            "placeable-2da-light-offset-shadow"
          ]),
          proof: expect.stringContaining("shadowVolumeProjectionEvidence"),
          requiredEvidence: expect.stringContaining("active WebGL stencil front/back z-pass/z-fail"),
          oracleCases: expect.arrayContaining([
            expect.objectContaining({
              caseId: "shadowvol-campfire-pixel-geometry-opacity",
              requiredArtifacts: expect.arrayContaining([
                "retail-or-toolset-shadowvol-campfire.png",
                "shadowvol-campfire-pixel-compare.json"
              ]),
              currentEvidence: expect.arrayContaining([
                "retail-or-toolset-shadowvol-campfire.png",
                "aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.png",
                "aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.frame.json",
                "aurora-web-shadowvol-campfire.png",
                "shadowvol-campfire-pixel-compare.json",
                "shadowvol-campfire-retail-web-diff-normalized.png"
              ]),
              currentStatus: "partial-local-proof",
              blocker: expect.stringContaining("Fresh Aurora Web campfire light/radius/LightState proof exists"),
              acceptanceGate: expect.stringContaining("opacity")
            }),
            expect.objectContaining({
              caseId: "shadowvol-retail-gl-state-order",
              acceptanceGate: expect.stringContaining("GL_KEEP/GL_INCR/GL_DECR")
            })
          ])
        }),
        expect.objectContaining({
          key: "retail-cross-lane-active-light-ordering",
          affectedCoverageKeys: expect.arrayContaining([
            "renderer-active-light-ordering",
            "item-property-light-runtime-scheduler",
            "progfx-type4-runtime-scheduler"
          ]),
          proof: expect.stringContaining("absoluteVtableClusterEvidence"),
          requiredEvidence: expect.stringContaining("common insertion/merge order"),
          oracleCases: expect.arrayContaining([
            expect.objectContaining({
              caseId: "cross-lane-all-required-lanes-retail-precedence",
              currentEvidence: expect.arrayContaining([
                "retail-cross-lane-openpad-smoke.png",
                "retail-ref-tile-main-light.png",
                "retail-ref-progfx-type4-light.png",
                "retail-cross-lane-maxlights-1-vs-2-before-roi-heatmap.png",
                "retail-cross-lane-maxlights-4-vs-5-after-roi-heatmap.png",
                "retail-cross-lane-maxlights-8-vs-32-after-roi-heatmap.png",
                "retail-cross-lane-no-item-ablation-maxlights-5-after-roi-heatmap.png",
                "retail-cross-lane-no-item-ablation-maxlights-5-own-budget-roi-heatmap.png",
                "cross-lane-all-light-lanes-runtime-probe-2026-07-07.png",
                "cross-lane-all-light-lanes-runtime-probe-2026-07-07.frame.json",
                "cross-lane-precedence-compare.json"
              ]),
              blocker: expect.stringContaining("local 5/5 lane coverage"),
              acceptanceGate: expect.stringContaining("accepted/dropped lanes")
            }),
            expect.objectContaining({
              caseId: "lightmanager-vtable-receiver-dispatch",
              requiredArtifacts: expect.arrayContaining([
                "lightmanager-vtable-receiver-xrefs.json"
              ])
            })
          ]),
          nextStep: expect.stringContaining("LightManager vtable callers")
        }),
        expect.objectContaining({
          key: "progfx-type4-priority-proximity-vision-scheduler",
          requiredEvidence: expect.stringContaining("vision mutation"),
          oracleCases: expect.arrayContaining([
            expect.objectContaining({
              caseId: "progfx-type4-priority-tie-and-zero-policy"
            }),
            expect.objectContaining({
              caseId: "progfx-type4-proximity-threshold"
            }),
            expect.objectContaining({
              caseId: "progfx-type4-attach-to-scene-restore"
            }),
            expect.objectContaining({
              caseId: "progfx-type4-blind-vision-pixels",
              currentEvidence: expect.arrayContaining([
                "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.frame.json"
              ])
            })
          ])
        })
      ])
    );
  });

  it("marks renderer candidates past the Aurora active light slot cap as dropped", () => {
    const report = buildAreaLightingEvidenceReport([], [], {
      processedMdlLightTemplatesScanned: 130,
      processedMdlLightScanLimit: 130,
      processedMdlLightSources: [
        {
          templateId: "plc_many_lights",
          resref: "plc_many_lights",
          name: "Many Lights",
          nodes: Array.from({ length: 130 }, (_, index) => ({
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset_many_lights",
            sourceModelFileName: "plc_many_lights.mdl",
            sourceModelObjectKey: "modules/current/models/plc_many_lights.mdl",
            nodeName: `light_${index.toString().padStart(3, "0")}`,
            position: { x: 0, y: 0, z: 1 + index * 0.01 },
            radius: 3,
            multiplier: 1,
            lightPriority: index === 129 ? 20 : index === 0 ? -10 : 0
          }))
        }
      ]
    });

    expect(report.summary).toMatchObject({
      rendererCandidateLights: 130,
      rendererAcceptedLights: 128,
      rendererDroppedLights: 2
    });
    expect(report.rendererLightBudget.candidates).toHaveLength(130);
    expect(report.rendererLightBudget.candidates[0]).toMatchObject({
      rank: 1,
      accepted: true,
      nodeName: "light_000",
      retailMdlPreviewScoreProofStatus:
        "source-backed-retail-lightmanager-score-preview-input-fallback",
      retailMdlPreviewScoreSortDirection: "ascending-score-field-0x84-preview"
    });
    expect(report.rendererLightBudget.candidates[127]).toMatchObject({
      rank: 128,
      accepted: true,
      nodeName: "light_127"
    });
    expect(report.rendererLightBudget.candidates[128]).toMatchObject({
      rank: 129,
      accepted: false,
      dropReason: "aurora-active-light-slot-cap",
      nodeName: "light_128"
    });
    expect(report.rendererLightBudget.candidates[129]).toMatchObject({
      rank: 130,
      accepted: false,
      dropReason: "aurora-active-light-slot-cap",
      nodeName: "light_129"
    });
  });

  it("ignores non-light tiles and non-placeable objects", () => {
    const report = buildAreaLightingEvidenceReport([
      buildArea({
        tiles: [
          {
            tileInstanceId: "area_market:tile:1",
            areaId: "area_market",
            tilesetResRef: "tno01",
            row: 0,
            col: 1,
            tileIndex: 1,
            source: "are-tile-list"
          }
        ],
        objects: [
          {
            objectId: "obj_door_light_name",
            kind: "door",
            templateId: "door_light_name",
            x: 1,
            y: 2,
            z: 0,
            bearing: 0
          }
        ]
      })
    ]);

    expect(report.summary.tileLightTiles).toBe(0);
    expect(report.summary.areaGlobalLightingFields).toBe(0);
    expect(report.summary.areaShadowOpacityAreas).toBe(0);
    expect(report.summary.placeableNameCandidates).toBe(0);
    expect(report.summary.catalogLightSourceTemplates).toBe(0);
    expect(report.summary.processedMdlLightNodes).toBe(0);
    expect(report.summary.rendererCandidateLights).toBe(0);
    expect(report.summary.rendererDroppedLights).toBe(0);
    expect(report.summary.shadowDiagnosticEntries).toBe(0);
    expect(report.tileLights).toEqual([]);
    expect(report.areaGlobalLighting).toEqual([]);
    expect(report.placeableNameCandidates).toEqual([]);
    expect(report.catalogLightSources).toEqual([]);
    expect(report.processedMdlLightSources).toEqual([]);
    expect(report.rendererLightBudget.candidates).toEqual([]);
    expect(report.shadowDiagnostic.entries).toEqual([]);
  });
});

function buildArea(overrides: Partial<AreaRecord> = {}): AreaRecord {
  return {
    areaId: "area_market",
    name: "Market",
    biome: "urban",
    width: 2,
    height: 2,
    tags: ["area", "urban"],
    benchmark: false,
    previewImageUrl: "/api/v1/areas/area_market/thumbnail",
    textureAtlasId: "atlas_tno01_v1",
    textureAtlasObjectKey: "modules/current/areas/market.are",
    textureAtlasContentType: "application/octet-stream",
    textureAtlasSizeBytes: 1024,
    textureAtlasFingerprint: "test",
    tileSet: "tno01",
    tiles: [],
    objects: [],
    soundscape: {
      bindingKeys: {
        areaKey: "GI_sound_area",
        randomKey: "GI_sound_rndm",
        positionalKey: "GI_sound_pos"
      },
      area: [],
      random: [],
      positional: []
    },
    updatedAt: "2026-06-28T00:00:00.000Z",
    ...overrides
  };
}
