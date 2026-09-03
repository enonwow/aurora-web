import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AreasModePanel } from "../../../../src/modules/layout/components/AreasModePanel";
import { createSceneObjectCatalogQueryFacade } from "../../../../src/modules/layout/application/sceneObjectCatalogQueryFacade";
import { getWorkspaceModeById } from "../../../../src/modules/layout/workspaceModes";
import type { AreaApiLightingEvidenceReport } from "../../../../src/modules/areas/contracts";
import type { AreaApiPort } from "../../../../src/modules/areas/ports/areaApiPort";
import type { AreaCapabilityFacade } from "../../../../src/modules/areas/application/areaCapabilityFacade";
import { capabilityFixture } from "../areas/areaCapabilityFixture";

describe("AreasModePanel lighting evidence", () => {
  it("renders the authenticated Area capability catalog summary", async () => {
    const facade: AreaCapabilityFacade = {
      load: vi.fn().mockResolvedValue({ ok: true, value: capabilityFixture() }),
    };

    render(
      <AreasModePanel
        userId="user_test"
        objects={[]}
        activeMode={getWorkspaceModeById("areas_mode")}
        backendAccessToken="token_abc"
        areaApiPort={buildAreaApiPort({} as AreaApiLightingEvidenceReport)}
        areaCapabilityFacade={facade}
        areaListClientCacheRef={{ current: null }}
        sceneObjectCatalogQueryFacade={createSceneObjectCatalogQueryFacade()}
        trackTelemetryEvent={vi.fn()}
        onAreaCanvasLoadingChange={vi.fn()}
        onAreaSceneSelected={vi.fn()}
        onObjectCreate={vi.fn()}
        onTileProcessReadinessChange={vi.fn()}
      />
    );

    expect(await screen.findByText("1 available · 0 blocked · 1 hidden"))
      .toBeInTheDocument();
    expect(facade.load).toHaveBeenCalledWith("token_abc");
  });

  it("loads and renders the aggregated lighting evidence report", async () => {
    const report: AreaApiLightingEvidenceReport = {
      summary: {
        areasScanned: 2,
        tileLightTiles: 1,
        tileLightReferences: 4,
        tileLightAreas: 1,
        areaGlobalLightingAreas: 1,
        areaGlobalLightingFields: 3,
        areaShadowOpacityAreas: 1,
        placeableNameCandidates: 3,
        placeableNameCandidateAreas: 1,
        catalogLightSourceTemplates: 35,
        catalogLightColorTemplates: 35,
        catalogLightStateTemplates: 2,
        processedMdlLightTemplatesScanned: 24,
        processedMdlLightSourceTemplates: 1,
        processedMdlLightNodes: 2,
        processedMdlLightScanLimit: 24,
        auroraActiveLightSlotCap: 128,
        rendererCandidateLights: 129,
        rendererAcceptedLights: 128,
        rendererDroppedLights: 1,
        shadowDiagnosticEntries: 2,
        shadowMdlLightNodes: 1,
        shadowCatalogShadowSizeTemplates: 0,
        auditCoverageEntries: 5,
        auditCoverageSourceBacked: 4,
        auditCoveragePreviewOnly: 0,
        auditCoverageBlocked: 1,
        auditCoverageNotObserved: 0,
        auditGaps: 1,
        remainingRetailBlockers: 3
      },
      tileLights: [],
      areaGlobalLighting: [
        {
          areaId: "area_market",
          areaName: "Market",
          source: "are-root-fields",
          fields: [
            { field: "LightingScheme", value: 2 },
            { field: "ShadowOpacity", value: 80 },
            { field: "SunAmbientColor", value: 16764057 }
          ]
        }
      ],
      placeableNameCandidates: [],
      catalogLightSources: [
        {
          templateId: "plc_magic_yellow",
          resref: "plc_magic_yellow",
          name: "Magic Yellow",
          category: "light",
          tags: ["light_source"],
          evidence: ["catalog.light_source", "placeables.2da.LightColor"],
          source2daLightColorRaw: "7",
          source2daLightColorLabel: "Yellow"
        }
      ],
      processedMdlLightSources: [
        {
          templateId: "plc_magic_yellow",
          resref: "plc_magic_yellow",
          name: "Magic Yellow",
          cacheKey: "cache_magic_yellow",
          cacheHit: false,
          nodes: [
            {
              source: "aurora-mdl-ascii",
              sourceModelAssetId: "asset_plc_u07",
              sourceModelFileName: "plc_u07.mdl",
              sourceModelObjectKey: "modules/current/models/plc_u07.mdl",
              nodeName: "light01",
              sourceNodeKind: "placeablelight",
              radius: 6,
              quadraticAtten: 0.125,
              quadraticAttenSource:
                "C:/Projects/New Folder/export/decompiled_all.c:865404-865409 FUN_00a40b60 uploads lightQuadraticAtten = 9/(max(radius,0.1)^2*2)",
              quadraticAttenProofStatus: "source-backed-mdl-radius-quadratic-attenuation",
              color: { red: 1, green: 0.85, blue: 0.15 },
              shadow: true,
              lightPriority: 3
            },
            {
              source: "aurora-mdl-ascii",
              sourceModelAssetId: "asset_plc_u07",
              sourceModelFileName: "plc_u07.mdl",
              sourceModelObjectKey: "modules/current/models/plc_u07.mdl",
              nodeName: "light02"
            }
          ]
        }
      ],
      rendererLightBudget: {
        activeLightSlotCap: 128,
        candidateLights: 129,
        acceptedLights: 128,
        droppedLights: 1,
        sampledCandidateLights: 2,
        omittedCandidateLights: 127,
        priorityStrategy:
          "source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback",
        priorityStrategyProofStatus:
          "source-backed-mdl-lightmanager-score-diagnostic-cross-lane-fallback",
        retailMdlLightScoreSource:
          "C:/Projects/New Folder/export/decompiled_all.c:865838-865911 FUN_00a41850 writes per-light score at +0x84 from distance/radius/multiplier/priority fields",
        retailMdlLightSortSource:
          "C:/Projects/New Folder/export/decompiled_all.c:865710-865782 FUN_00a4165c/FUN_00a417bc sort active/shadow light lists with FUN_00a41694 comparator on +0x84",
        retailActiveLightSortScoreSource:
          "C:/Projects/New Folder/export/decompiled_all.c:865731-865735 FUN_00a41694 compares active-light score field +0x84 with '<'",
        retailActiveLightSortScoreFormula:
          "ascending +0x84 score; invalid radius/multiplier/extent -> 100000",
        retailActiveLightSortDirection: "ascending-score-field-0x84",
        retailActiveLightSortScoreProofStatus:
          "source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked",
        retailActiveLightUploadSource:
          "C:/Projects/New Folder/export/decompiled_all.c:866101-866201 FUN_00a41e50 applies min(configured,0x80)",
        retailOrderingStatus: "blocked-no-recovered-retail-cross-lane-active-light-ordering",
        candidates: [
          {
            candidateId: "mdl:plc_magic_yellow:modules/current/models/plc_u07.mdl:light01:0",
            source: "processed-mdl-light-node",
            label: "Magic Yellow:light01",
            priority: 300,
            rank: 1,
            accepted: true,
            templateId: "plc_magic_yellow",
            resref: "plc_magic_yellow",
            nodeName: "light01",
            lightPriority: 3,
            retailMdlScoreSource:
              "C:/Projects/New Folder/export/decompiled_all.c:865838-865911 FUN_00a41850 writes per-light score at +0x84",
            retailMdlScoreProofStatus:
              "source-backed-mdl-lightmanager-score-exact-runtime-inputs-not-available-in-area-audit",
            retailMdlPreviewScore: 0.17857142857142858,
            retailMdlPreviewScorePriority: 3,
            retailMdlPreviewScorePreviewDistance: 1.25,
            retailMdlPreviewScoreRangeTerm: 6,
            retailMdlPreviewScoreFormula:
              "invalid radius/multiplier/extent -> 100000; current-object lane -> -1; otherwise ((priority+1)*previewDistance)/((field0x70+4)*(rangeTerm+1)), rangeTerm=sourceRadius*multiplier*runtimeExtent",
            retailMdlPreviewScoreSource:
              "C:/Projects/New Folder/export/decompiled_all.c:865731-865735 FUN_00a41694 compares active-light score field +0x84 with '<'",
            retailMdlPreviewScoreProofStatus:
              "source-backed-retail-lightmanager-score-preview-input-fallback",
            retailMdlPreviewScoreSortDirection: "ascending-score-field-0x84-preview",
            retailMdlPreviewScoreFallback:
              "area-audit-object-local-distance-field0x70-zero-runtimeextent-one-cross-lane-callsite-blocked",
            prioritySource:
              "processed MDL lane uses recovered LightManager preview score for intra-lane order; cross-lane priority remains diagnostic because insertion order is unrecovered"
          },
          {
            candidateId: "name:area_market:obj_over_budget",
            source: "placeable-name-candidate",
            label: "Dropped Lamp",
            priority: 81,
            rank: 129,
            accepted: false,
            dropReason: "aurora-active-light-slot-cap",
            areaId: "area_market",
            areaName: "Market",
            templateId: "plc_dropped_lamp",
            resref: "plc_dropped_lamp"
          }
        ]
      },
      shadowDiagnostic: {
        entries: [
          {
            entryId: "area-shadow:area_market:ShadowOpacity",
            source: "area-root-shadow-field",
            label: "Market:ShadowOpacity",
            severity: "info",
            note: "ARE root shadow field preserved from area metadata.",
            areaId: "area_market",
            areaName: "Market",
            field: "ShadowOpacity",
            value: 80
          },
          {
            entryId: "mdl-shadow:plc_magic_yellow:light01:0",
            source: "processed-mdl-light-node",
            label: "Magic Yellow:light01",
            severity: "info",
            note: "MDL light node requests shadow.",
            templateId: "plc_magic_yellow",
            resref: "plc_magic_yellow",
            nodeName: "light01",
            shadow: true,
            rendererRank: 1,
            rendererAccepted: true
          }
        ],
        shadowRelevantEntries: 2,
        sampledEntries: 2,
        omittedEntries: 0,
        globalShadowFields: 1,
        areaShadowOpacityFields: 1,
        areaSunShadowFields: 0,
        areaMoonShadowFields: 0,
        mdlShadowLightNodes: 1,
        mdlExplicitNonShadowLightNodes: 0,
        catalogShadowSizeTemplates: 0
      },
      auditCoverage: [
        {
          key: "area-tile-light-color",
          label: "ARE tile light color",
          status: "source-backed",
          evidence: "1/1 non-zero tile light ids carry decoded 2DA RGB metadata (1 raw fields scanned; 0 decoded RGB entries are black and are not renderer candidates).",
          proof: "decompiled_all.c:255400-255409 reads Tile_MainLight*/Tile_SrcLight*; decompiled_all.c:40249-40266 loads lightcolor/tilecolor tables."
        },
        {
          key: "area-tile-light-position",
          label: "ARE tile light position",
          status: "source-backed",
          evidence:
            "1 main-light references bind exact source-MDL ml1/ml2 nodes; 1 source-light references bind exact source-MDL sl1/sl2 slots; 0 non-zero source references are intentionally omitted because Aurora reports no corresponding tile source slot; 0 renderable references still lack a source-node contract.",
          proof:
            "C:/Projects/New Folder/export/decompiled_all.c:453500-453602 source-slot count gate; frontend workspaceTerrainMesh consumes typed source-precedence MDL nativeNode/sourceNode contracts without a tile-center or GLB-node fallback."
        },
        {
          key: "area-tile-light-radius-falloff",
          label: "ARE tile light radius/falloff",
          status: "source-backed",
          evidence:
            "1 renderable main-light references use recovered static lightcolor.2da tile lane with no point radius/falloff; 1 renderable source-light references use recovered fx_flame01/AuroraLight01 radius/falloff.",
          proof:
            "C:/Projects/New Folder/export/decompiled_all.c:453281 loads lightcolor.2da for tile runtime; 453323-453528 resolves RGB channels for Tile_MainLight1/Tile_MainLight2 through FUN_00af3980; no FUN_00a546cc fx/AuroraLight carrier is created for main lights in this path; C:/Projects/New Folder/export/decompiled_all.c:453567-453602 creates fx_flame01 at sourcelight1/sourcelight2 tile source-light nodes; nwn_base.key fx_flame01.mdl AuroraLight01 radius 0x58 = 7, shadowradius 0x60 = 15, verticaldisplacement 0x64 = 2; C:/Projects/New Folder/export/decompiled_all.c:866543-866563 proves linear max(0,1-distance/radius) active-light falloff"
        },
        {
          key: "placeable-radius-falloff",
          label: "Placeable light radius/falloff",
          status: "source-backed",
          evidence:
            "Catalog light colors exist and retail placeable carrier radius/falloff is recovered from fx_placeable01/AuroraLight01 plus active-light falloff code.",
          proof:
            "nwmain.exe CNWCArea::AddPlaceableObjectLight uses fx_placeable01/AuroraLight01; nwn_base.key fx_placeable01.mdl controller radius 0x58 = 10, shadowradius 0x60 = 15, verticaldisplacement 0x64 = 3; C:/Projects/New Folder/export/decompiled_all.c:866543-866563 proves linear max(0,1-distance/radius) active-light falloff"
        },
        {
          key: "item-property-light-runtime-scheduler",
          label: "ItemPropertyLight runtime scheduler",
          status: "blocked",
          evidence:
            "Retail ApplyLight bridge to VFX_DUR_LIGHT rows, retail KEY/BIF item-light tables, progfx.2da Param3 item-light shadow toggle, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation, and generic MdlNodeLight PartLight creation/Gob-list attach are recovered and ItemPropertyLight parameter/color/radius/shadow-toggle family is represented in previews, but cross-lane insertion and retail shadow-volume projection parity are still not recovered.",
          proof:
            "nwserver.exe CNWSItemPropertyHandler::ApplyLight at 0x140405e40; nwmain.exe ApplyLight disassembly maps color byte [CNWItemProperty+9] and brightness word [CNWItemProperty+6] to VFX_DUR_LIGHT rows; nwn_base.key -> base_2da.bif contains iprp_lightcost.2da rows 1..4 Dim 5m/Low 10m/Normal 15m/Bright 20m and iprp_color.2da rows 0..6 Blue/Yellow/Purple/Red/Green/Orange/White",
          blocker:
            "Retail ApplyLight bridge, retail KEY/BIF item-light tables, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation through CNWCMessage/CNWCObject/NewCAurObject, generic MdlNodeLight PartLight creation/Gob-list attach, and progfx.2da Param3 item-light shadow toggle are recovered, but cross-lane insertion order and retail shadow-volume projection parity are not recovered"
        }
      ],
      auditGaps: [
        {
          key: "item-property-light-runtime-scheduler",
          label: "ItemPropertyLight runtime scheduler",
          status: "blocked",
          evidence:
            "Retail ApplyLight bridge to VFX_DUR_LIGHT rows, retail KEY/BIF item-light tables, progfx.2da Param3 item-light shadow toggle, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation, and generic MdlNodeLight PartLight creation/Gob-list attach are recovered and ItemPropertyLight parameter/color/radius/shadow-toggle family is represented in previews, but cross-lane insertion and retail shadow-volume projection parity are still not recovered.",
          proof:
            "nwserver.exe CNWSItemPropertyHandler::ApplyLight at 0x140405e40; nwmain.exe ApplyLight disassembly maps color byte [CNWItemProperty+9] and brightness word [CNWItemProperty+6] to VFX_DUR_LIGHT rows; nwn_base.key -> base_2da.bif contains iprp_lightcost.2da rows 1..4 Dim 5m/Low 10m/Normal 15m/Bright 20m and iprp_color.2da rows 0..6 Blue/Yellow/Purple/Red/Green/Orange/White",
          blocker:
            "Retail ApplyLight bridge, retail KEY/BIF item-light tables, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation through CNWCMessage/CNWCObject/NewCAurObject, generic MdlNodeLight PartLight creation/Gob-list attach, and progfx.2da Param3 item-light shadow toggle are recovered, but cross-lane insertion order and retail shadow-volume projection parity are not recovered",
          nextStep:
            "Retail ApplyLight bridge, retail KEY/BIF item-light tables, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation through CNWCMessage/CNWCObject/NewCAurObject, generic MdlNodeLight PartLight creation/Gob-list attach, and progfx.2da Param3 item-light shadow toggle are recovered, but cross-lane insertion order and retail shadow-volume projection parity are not recovered"
        }
      ],
      remainingRetailBlockers: [
        {
          key: "retail-shadow-volume-projection-parity",
          label: "Retail shadow-volume projection parity",
          status: "blocked",
          affectedCoverageKeys: [
            "area-shadow-volume-implementation",
            "placeable-2da-light-offset-shadow"
          ],
          evidence: "Retail shadow-volume inputs are source-backed.",
          proof:
            "shadowVolumeProjectionEvidence proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked",
          requiredEvidence: "FUN_00a78128 caster projection parity.",
          oracleCases: [
            {
              caseId: "shadowvol-campfire-pixel-geometry-opacity",
              purpose: "Compare projected shadow footprint and opacity.",
              requiredArtifacts: [
                "retail-or-toolset-shadowvol-campfire.png",
                "shadowvol-campfire-pixel-compare.json"
              ],
              acceptanceGate: "Retail and Aurora Web shadow pixels match tolerance.",
              currentStatus: "partial-local-proof",
              currentEvidence: ["placeable-campfire-shadowvol-state-proof-2026-07-03.frame.json"],
              blocker: "Retail/toolset shadow pixel oracle is missing."
            }
          ],
          nextStep: "Recover shadow-volume caster extrusion."
        },
        {
          key: "retail-cross-lane-active-light-ordering",
          label: "Retail cross-lane active light ordering",
          status: "blocked",
          affectedCoverageKeys: ["renderer-active-light-ordering"],
          evidence: "LightManager score is recovered.",
          proof: "requestedDirectCallXrefCount=0",
          requiredEvidence: "Cross-lane precedence oracle.",
          oracleCases: [
            {
              caseId: "cross-lane-all-required-lanes-retail-precedence",
              purpose: "Observe accepted and dropped lanes under a retail light budget.",
              requiredArtifacts: [
                "retail-cross-lane-active-slots.json",
                "cross-lane-precedence-compare.json"
              ],
              acceptanceGate: "Accepted and dropped lanes match retail.",
              currentStatus: "partial-local-proof",
              currentEvidence: [
                "cross-lane-all-light-lanes-runtime-probe-2026-07-05.frame.json"
              ],
              blocker: "Retail lane precedence is missing."
            }
          ],
          nextStep: "Continue LightManager xref audit."
        },
        {
          key: "progfx-type4-priority-proximity-vision-scheduler",
          label: "ProgFX Type 4 priority/proximity/vision scheduler",
          status: "blocked",
          affectedCoverageKeys: ["progfx-type4-runtime-scheduler"],
          evidence: "Param4/5/6 and vision tokens are preserved.",
          proof: "clientVisualEffectReceiveRenderEvidence proofStatus=source-backed",
          requiredEvidence: "Priority/proximity/vision runtime semantics.",
          oracleCases: [
            {
              caseId: "progfx-type4-priority-tie-and-zero-policy",
              purpose: "Observe retail priority and tie behavior.",
              requiredArtifacts: ["retail-progfx-priority-policy.json"],
              acceptanceGate: "Retail priority winner is known.",
              currentStatus: "partial-local-proof",
              currentEvidence: ["progfx-type4-multi-request-policy-runtime-probe-2026-07-03.frame.json"],
              blocker: "Retail priority/tie behavior is missing."
            }
          ],
          nextStep: "Trace Type 4 scheduler."
        }
      ]
    };
    const areaApiPort = buildAreaApiPort(report);
    const telemetry = vi.fn();

    render(
      <AreasModePanel
        userId="user_test"
        objects={[]}
        activeMode={getWorkspaceModeById("areas_mode")}
        backendAccessToken="token_abc"
        areaApiPort={areaApiPort}
        areaListClientCacheRef={{ current: null }}
        sceneObjectCatalogQueryFacade={createSceneObjectCatalogQueryFacade()}
        trackTelemetryEvent={telemetry}
        onAreaCanvasLoadingChange={vi.fn()}
        onAreaSceneSelected={vi.fn()}
        onObjectCreate={vi.fn()}
        onTileProcessReadinessChange={vi.fn()}
      />
    );

    const panel = screen.getByRole("region", { name: /area lighting evidence/i });
    fireEvent.click(within(panel).getByRole("button", { name: "Load Lighting Evidence" }));

    await waitFor(() =>
      expect(areaApiPort.getAreaLightingEvidence).toHaveBeenCalledWith("token_abc")
    );
    await waitFor(() => expect(panel).toHaveAttribute("data-mdl-node-count", "2"));
    await waitFor(() => expect(panel).toHaveAttribute("data-area-global-lighting-fields", "3"));
    await waitFor(() => expect(panel).toHaveAttribute("data-renderer-dropped-lights", "1"));
    await waitFor(() => expect(panel).toHaveAttribute("data-shadow-diagnostic-entries", "2"));
    await waitFor(() => expect(panel).toHaveAttribute("data-audit-coverage-blocked", "1"));
    await waitFor(() => expect(panel).toHaveAttribute("data-audit-gaps", "1"));
    await waitFor(() => expect(panel).toHaveAttribute("data-remaining-retail-blockers", "3"));

    expect(within(panel).getByText("2 MDL nodes")).toBeInTheDocument();
    expect(within(panel).getAllByText("Magic Yellow")).toHaveLength(2);
    expect(within(panel).getByText("2 nodes")).toBeInTheDocument();
    expect(within(panel).getByText("LightingScheme=2")).toBeInTheDocument();
    expect(within(panel).getByText("Market:ShadowOpacity")).toBeInTheDocument();
    expect(within(panel).getByText("processed-mdl-light-node #1")).toBeInTheDocument();
    expect(within(panel).getByText("128/129")).toBeInTheDocument();
    expect(
      within(panel).getByRole("list", { name: "remaining retail blockers" })
    ).toHaveTextContent("Retail shadow-volume projection parity");
    expect(
      within(panel).getByRole("list", { name: "remaining retail blockers" })
    ).toHaveTextContent("blocked / 1 oracle cases");
    expect(within(panel).getByText("Dropped Lamp")).toBeInTheDocument();
    expect(within(panel).queryByText("ARE tile light position")).not.toBeInTheDocument();
    expect(within(panel).getByText("ItemPropertyLight runtime scheduler")).toBeInTheDocument();
    expect(
      within(panel).queryByText("ARE tile light radius/falloff")
    ).not.toBeInTheDocument();
    expect(telemetry).toHaveBeenCalledWith(
      "ui.workspace.areas.lighting_evidence_loaded",
      expect.objectContaining({
        tileLightReferences: 4,
        catalogLightSourceTemplates: 35,
        processedMdlLightNodes: 2,
        areaGlobalLightingFields: 3,
        areaShadowOpacityAreas: 1,
        rendererCandidateLights: 129,
        rendererDroppedLights: 1,
        shadowDiagnosticEntries: 2,
        shadowMdlLightNodes: 1,
        auditCoverageBlocked: 1,
        auditCoverageNotObserved: 0,
        auditGaps: 1,
        remainingRetailBlockers: 3
      })
    );
  });
});

function buildAreaApiPort(report: AreaApiLightingEvidenceReport): AreaApiPort {
  return {
    login: vi.fn(async () => ({ accessToken: "token_abc" })),
    listAreas: vi.fn(async () => ({ items: [], total: 0, limit: 100, offset: 0 })),
    getAreaLightingEvidence: vi.fn(async () => report),
    getAreaById: vi.fn(),
    processArea: vi.fn(),
    getAreaTextureAtlasContracts: vi.fn()
  } as unknown as AreaApiPort;
}
