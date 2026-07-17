import { describe, expect, it, vi } from "vitest";
import {
  AreaApiRequestError,
  HttpAreaApiPort
} from "../../../../src/modules/areas/adapters/httpAreaApiPort";

describe("HttpAreaApiPort", () => {
  it("logs in and returns backend access token", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            session: {
              accessToken: "token_123"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.login("viewer.user", "viewer123");

    expect(result.accessToken).toBe("token_123");
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/auth/login",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("lists areas with encoded query params", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                areaId: "area_001",
                name: "Area One",
                biome: "urban",
                width: 24,
                height: 24,
                tags: ["benchmark"],
                benchmark: true,
                previewImageUrl: "/assets/previews/areas/area_001.webp",
                textureAtlasId: "atlas_area_001",
                objectCounts: {
                  placeables: 2,
                  doors: 1,
                  creatures: 3,
                  items: 4,
                  sounds: 5,
                  total: 15
                },
                updatedAt: "2026-05-27T10:00:00.000Z"
              }
            ],
            total: 1,
            limit: 20,
            offset: 0
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.listAreas("token_abc", {
      query: "market",
      benchmark: true,
      limit: 20,
      offset: 0
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.areaId).toBe("area_001");
    expect(result.items[0]).toMatchObject({
      previewImageUrl: "/assets/previews/areas/area_001.webp",
      textureAtlasId: "atlas_area_001",
      objectCounts: {
        placeables: 2,
        doors: 1,
        creatures: 3,
        items: 4,
        sounds: 5,
        total: 15
      }
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas?query=market&benchmark=true&limit=20&offset=0",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      })
    );
  });

  it("downloads placed area item GIT export bytes", async () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x54, 0x20, 0x56, 0x33, 0x2e, 0x32]);
    const fetchStub = vi.fn(async () =>
      new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes.byteLength),
          "Content-Disposition": 'inline; filename="area_001.items.git"',
          "X-Aurora-Area-Item-Count": "2"
        }
      })
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.exportAreaItemsGit("token_abc", "area_001");

    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/area_001/export/items.git",
      {
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      }
    );
    expect(result.contentType).toBe("application/octet-stream");
    expect(result.fileName).toBe("area_001.items.git");
    expect(result.itemCount).toBe(2);
    expect(result.sizeBytes).toBe(bytes.byteLength);
    expect([...new Uint8Array(result.bytes)]).toEqual([...bytes]);
  });

  it("downloads whole-area GIT export bytes", async () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x54, 0x20, 0x56, 0x33, 0x2e, 0x32]);
    const fetchStub = vi.fn(async () =>
      new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes.byteLength),
          "Content-Disposition": 'inline; filename="area_001.git"',
          "X-Aurora-Area-Object-Count": "9",
          "X-Aurora-Area-Item-Count": "2"
        }
      })
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.exportAreaGit("token_abc", "area_001");

    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/area_001/export/area.git",
      {
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      }
    );
    expect(result.fileName).toBe("area_001.git");
    expect(result.objectCount).toBe(9);
    expect(result.itemCount).toBe(2);
    expect(result.sizeBytes).toBe(bytes.byteLength);
  });

  it("downloads whole-area ARE export bytes", async () => {
    const bytes = new Uint8Array([0x41, 0x52, 0x45, 0x20, 0x56, 0x33, 0x2e, 0x32]);
    const fetchStub = vi.fn(async () =>
      new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes.byteLength),
          "Content-Disposition": 'inline; filename="area_001.are"',
          "X-Aurora-Area-Tile-Count": "144"
        }
      })
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.exportAreaAre("token_abc", "area_001");

    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/area_001/export/area.are",
      {
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      }
    );
    expect(result.fileName).toBe("area_001.are");
    expect(result.tileCount).toBe(144);
    expect(result.sizeBytes).toBe(bytes.byteLength);
  });

  it("fetches area lighting evidence", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            summary: {
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
              rendererCandidateLights: 129,
              rendererAcceptedLights: 128,
              rendererDroppedLights: 1,
              shadowDiagnosticEntries: 3,
              shadowMdlLightNodes: 1,
              shadowCatalogShadowSizeTemplates: 1,
              auditCoverageEntries: 5,
              auditCoverageSourceBacked: 2,
              auditCoveragePreviewOnly: 0,
              auditCoverageBlocked: 3,
              auditCoverageNotObserved: 0,
              auditGaps: 3,
              remainingRetailBlockers: 3
            },
            tileLights: [
              {
                areaId: "area_001",
                areaName: "Area One",
                tileInstanceId: "area_001:tile:0",
                row: 0,
                col: 0,
                tileIndex: 0,
                tileId: 101,
                tilesetResRef: "tno01",
                modelResRef: "tno01_a01_01",
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
            areaGlobalLighting: [
              {
                areaId: "area_001",
                areaName: "Area One",
                source: "are-root-fields",
                fields: [
                  { field: "LightingScheme", value: 2 },
                  { field: "ShadowOpacity", value: 80 },
                  { field: "SunAmbientColor", value: 16764057 }
                ]
              }
            ],
            placeableNameCandidates: [
              {
                areaId: "area_001",
                areaName: "Area One",
                objectId: "obj_torch_001",
                templateId: "plc_wall_torch",
                resRef: "plc_wall_torch",
                x: 1,
                y: 2,
                z: 0,
                matchedTokens: ["torch"]
              }
            ],
            catalogLightSources: [
              {
                templateId: "plc_magic_yellow",
                resref: "plc_magic_yellow",
                name: "Magic Yellow",
                category: "light",
                tags: ["light_source"],
                evidence: ["catalog.light_source", "placeables.2da.LightColor", "utp.LightState"],
                source2daLightColorRaw: "7",
                source2daLightColorRow: 7,
                source2daLightColorLabel: "Yellow",
                source2daLightRed: 1.9,
                source2daLightGreen: 1.7,
                source2daLightBlue: 0.06,
                source2daLightOffsetZ: 4,
                source2daShadowSize: 1,
                lightState: 2,
                modelResRef: "plc_u07"
              }
            ],
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
                  candidateId: "catalog:plc_magic_yellow",
                  source: "catalog-light-source-template",
                  label: "Magic Yellow",
                  priority: 122,
                  rank: 129,
                  accepted: false,
                  dropReason: "aurora-active-light-slot-cap",
                  templateId: "plc_magic_yellow",
                  resref: "plc_magic_yellow"
                }
              ]
            },
            shadowDiagnostic: {
              entries: [
                {
                  entryId: "area-shadow:area_001:ShadowOpacity",
                  source: "area-root-shadow-field",
                  label: "Area One:ShadowOpacity",
                  severity: "info",
                  note: "ARE root shadow field preserved from area metadata.",
                  areaId: "area_001",
                  areaName: "Area One",
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
                },
                {
                  entryId: "catalog-shadow:plc_magic_yellow",
                  source: "catalog-placeable-shadow-size",
                  label: "Magic Yellow",
                  severity: "info",
                  note: "placeables.2da ShadowSize is present on this light-source template.",
                  templateId: "plc_magic_yellow",
                  resref: "plc_magic_yellow",
                  shadowSize: 1
                }
              ],
              shadowRelevantEntries: 3,
              sampledEntries: 3,
              omittedEntries: 0,
              globalShadowFields: 1,
              areaShadowOpacityFields: 1,
              areaSunShadowFields: 0,
              areaMoonShadowFields: 0,
              mdlShadowLightNodes: 1,
              mdlExplicitNonShadowLightNodes: 0,
              catalogShadowSizeTemplates: 1
            },
            auditCoverage: [
              {
                key: "area-tile-light-color",
                label: "ARE tile light color",
                status: "source-backed",
                evidence: "2/2 non-zero tile light ids carry decoded 2DA RGB metadata (2 raw fields scanned; 0 decoded RGB entries are black and are not renderer candidates).",
                proof: "decompiled_all.c:255400-255409 reads Tile_MainLight*/Tile_SrcLight*; decompiled_all.c:40249-40266 loads lightcolor/tilecolor tables."
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
              },
              {
                key: "progfx-type4-runtime-scheduler",
                label: "ProgFX Type 4 runtime scheduler",
                status: "blocked",
                evidence:
                  "ProgFX Type 4 owner-phase metadata, Param1..Param7 source-table values, docs-backed Param4 priority/Param5 proximity/Param6 attach-to-scene/vision policy semantics, client receive/render object attach, source-model Gob instantiation, and vanilla absence of non-item cast-shadow rows are preserved for diagnostics, but exact retail owner grouping, proximity distance threshold, scene-light restore timing, vision mutation pixels, and cross-lane scheduling are still not recovered.",
                proof:
                  "C:/Projects/New Folder/export/decompiled_all.c:348244 loads visualeffects.2da; backend/scripts/audit-retail-light-function-disasm.py recovers object-level looping VFX owner add/remove, CNWSMessage game-object update serialization, and clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path",
                blocker:
                  "ProgFX Type 4 Param3 values are source-table backed, Param4/Param5/Param6/vision policy semantics are docs-backed from progfx.2da, and retail table/owner-phase audit reports nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0, so vanilla non-item Type 4 shadow-casting rows are source-backed absent; remaining blocked semantics are cross-lane insertion order, exact owner grouping, proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity"
              },
              {
                key: "renderer-active-light-ordering",
                label: "Renderer active light ordering",
                status: "blocked",
                evidence:
                  "Preview diagnostic orders candidates with source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback; retail cross-lane insertion order is not recovered.",
                proof:
                  "C:/Projects/New Folder/export/decompiled_all.c:865534-865548 FUN_00a4128c inserts a light into the manager lists",
                blocker:
                  "FUN_00a4128c internal insertion is recovered, but decompilation does not expose a direct symbolized call-site proving cross-lane precedence"
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
              },
              {
                key: "progfx-type4-runtime-scheduler",
                label: "ProgFX Type 4 runtime scheduler",
                status: "blocked",
                evidence:
                  "ProgFX Type 4 owner-phase metadata, Param1..Param7 source-table values, docs-backed Param4 priority/Param5 proximity/Param6 attach-to-scene/vision policy semantics, client receive/render object attach, source-model Gob instantiation, and vanilla absence of non-item cast-shadow rows are preserved for diagnostics, but exact retail owner grouping, proximity distance threshold, scene-light restore timing, vision mutation pixels, and cross-lane scheduling are still not recovered.",
                proof:
                  "C:/Projects/New Folder/export/decompiled_all.c:348244 loads visualeffects.2da; backend/scripts/audit-retail-light-function-disasm.py recovers object-level looping VFX owner add/remove, CNWSMessage game-object update serialization, and clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path",
                blocker:
                  "ProgFX Type 4 Param3 values are source-table backed, Param4/Param5/Param6/vision policy semantics are docs-backed from progfx.2da, and retail table/owner-phase audit reports nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0, so vanilla non-item Type 4 shadow-casting rows are source-backed absent; remaining blocked semantics are cross-lane insertion order, exact owner grouping, proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity",
                nextStep:
                  "ProgFX Type 4 Param3 values are source-table backed, Param4/Param5/Param6/vision policy semantics are docs-backed from progfx.2da, and retail table/owner-phase audit reports nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0, so vanilla non-item Type 4 shadow-casting rows are source-backed absent; remaining blocked semantics are cross-lane insertion order, exact owner grouping, proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity"
              },
              {
                key: "renderer-active-light-ordering",
                label: "Renderer active light ordering",
                status: "blocked",
                evidence:
                  "Preview diagnostic orders candidates with source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback; retail cross-lane insertion order is not recovered.",
                proof:
                  "C:/Projects/New Folder/export/decompiled_all.c:865534-865548 FUN_00a4128c inserts a light into the manager lists",
                blocker:
                  "FUN_00a4128c internal insertion is recovered, but decompilation does not expose a direct symbolized call-site proving cross-lane precedence",
                nextStep:
                  "FUN_00a4128c internal insertion is recovered, but decompilation does not expose a direct symbolized call-site proving cross-lane precedence"
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
                evidence:
                  "Retail shadow-plane/shadow-volume inputs are source-backed.",
                proof:
                  "backend/scripts/audit-retail-light-function-disasm.py shadowVolumeProjectionEvidence proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked",
                requiredEvidence:
                  "Port or prove equivalent caster traversal/extrusion/projection through FUN_00a78128.",
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
                    currentEvidence: [
                      "placeable-campfire-shadowvol-state-proof-2026-07-03.frame.json"
                    ],
                    blocker: "Retail/toolset shadow pixel oracle is missing."
                  }
                ],
                nextStep:
                  "Recover the shadow-volume caster extrusion path around FUN_00a78128."
              },
              {
                key: "retail-cross-lane-active-light-ordering",
                label: "Retail cross-lane active light ordering",
                status: "blocked",
                affectedCoverageKeys: [
                  "renderer-active-light-ordering",
                  "item-property-light-runtime-scheduler",
                  "progfx-type4-runtime-scheduler"
                ],
                evidence:
                  "Active-light score/sort/upload and LightManager insertion are recovered.",
                proof:
                  "LightManager targetCount=23/requestedTargetCount=4, directCallXrefCount=23, requestedDirectCallXrefCount=0",
                requiredEvidence:
                  "Recover common insertion/merge order between tile/placeable/MDL/item/VFX lanes.",
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
                nextStep: "Continue binary/xref audit around LightManager vtable callers."
              },
              {
                key: "progfx-type4-priority-proximity-vision-scheduler",
                label: "ProgFX Type 4 priority/proximity/vision scheduler",
                status: "blocked",
                affectedCoverageKeys: ["progfx-type4-runtime-scheduler"],
                evidence:
                  "Param4 priority, Param5 proximity suppression, Param6 scene attachment, and vision Param1 tokens are preserved.",
                proof:
                  "clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path",
                requiredEvidence:
                  "Recover priority ordering, proximity suppression, scene attachment/removal, and vision mutation semantics.",
                oracleCases: [
                  {
                    caseId: "progfx-type4-priority-tie-and-zero-policy",
                    purpose: "Observe retail priority and tie behavior.",
                    requiredArtifacts: ["retail-progfx-priority-policy.json"],
                    acceptanceGate: "Retail priority winner is known.",
                    currentStatus: "partial-local-proof",
                    currentEvidence: [
                      "progfx-type4-multi-request-policy-runtime-probe-2026-07-03.frame.json"
                    ],
                    blocker: "Retail priority/tie behavior is missing."
                  }
                ],
                nextStep:
                  "Trace ProgFX Type 4 scheduler after visualeffects/progfx table resolution."
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaLightingEvidence("token_abc");

    expect(result.summary.tileLightReferences).toBe(2);
    expect(result.summary.auditCoverageBlocked).toBe(3);
    expect(result.summary.auditGaps).toBe(3);
    expect(result.summary.remainingRetailBlockers).toBe(3);
    expect(result.tileLights[0]).toMatchObject({
      areaId: "area_001",
      mainLight1: 3,
      mainLight1Color: {
        rowId: 3,
        red: 1,
        green: 0.75,
        blue: 0.25
      }
    });
    expect(result.areaGlobalLighting[0]).toMatchObject({
      areaId: "area_001",
      fields: expect.arrayContaining([{ field: "ShadowOpacity", value: 80 }])
    });
    expect(result.placeableNameCandidates[0]?.matchedTokens).toEqual(["torch"]);
    expect(result.catalogLightSources[0]).toMatchObject({
      templateId: "plc_magic_yellow",
      evidence: expect.arrayContaining(["placeables.2da.LightColor", "utp.LightState"]),
      source2daLightColorRow: 7,
      source2daLightOffsetZ: 4,
      lightState: 2
    });
    expect(result.processedMdlLightSources[0]).toMatchObject({
      templateId: "plc_magic_yellow",
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
    expect(result.auditCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "placeable-radius-falloff",
          status: "source-backed",
          proof: expect.stringContaining("fx_placeable01/AuroraLight01")
        }),
        expect.objectContaining({
          key: "item-property-light-runtime-scheduler",
          status: "blocked",
          blocker: expect.stringContaining(
            "cross-lane insertion order and retail shadow-volume projection parity"
          )
        }),
        expect.objectContaining({
          key: "progfx-type4-runtime-scheduler",
          status: "blocked",
          proof: expect.stringContaining("visualeffects.2da")
        }),
        expect.objectContaining({
          key: "renderer-active-light-ordering",
          status: "blocked",
          proof: expect.stringContaining("FUN_00a4128c")
        })
      ])
    );
    expect(result.auditGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "item-property-light-runtime-scheduler",
          status: "blocked",
          nextStep: expect.stringContaining(
            "cross-lane insertion order and retail shadow-volume projection parity"
          )
        }),
        expect.objectContaining({
          key: "progfx-type4-runtime-scheduler",
          status: "blocked",
          nextStep: expect.stringContaining("Param4/Param5/Param6/vision policy semantics are docs-backed")
        }),
        expect.objectContaining({
          key: "renderer-active-light-ordering",
          status: "blocked",
          nextStep: expect.stringContaining("cross-lane precedence")
        })
      ])
    );
    expect(result.remainingRetailBlockers.map((entry) => entry.key)).toEqual([
      "retail-shadow-volume-projection-parity",
      "retail-cross-lane-active-light-ordering",
      "progfx-type4-priority-proximity-vision-scheduler"
    ]);
    expect(result.remainingRetailBlockers.map((entry) => entry.oracleCases[0]?.caseId)).toEqual([
      "shadowvol-campfire-pixel-geometry-opacity",
      "cross-lane-all-required-lanes-retail-precedence",
      "progfx-type4-priority-tie-and-zero-policy"
    ]);
    expect(result.remainingRetailBlockers[0]?.oracleCases[0]?.requiredArtifacts).toEqual(
      expect.arrayContaining([
        "retail-or-toolset-shadowvol-campfire.png",
        "shadowvol-campfire-pixel-compare.json"
      ])
    );
    expect(result.remainingRetailBlockers[0]).toMatchObject({
      status: "blocked",
      affectedCoverageKeys: [
        "area-shadow-volume-implementation",
        "placeable-2da-light-offset-shadow"
      ],
      requiredEvidence: expect.stringContaining("FUN_00a78128")
    });
    expect(result.rendererLightBudget).toMatchObject({
      activeLightSlotCap: 128,
      candidateLights: 129,
      acceptedLights: 128,
      droppedLights: 1,
      priorityStrategy: "source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback",
      priorityStrategyProofStatus:
        "source-backed-mdl-lightmanager-score-diagnostic-cross-lane-fallback",
      retailOrderingStatus: "blocked-no-recovered-retail-cross-lane-active-light-ordering"
    });
    expect(result.rendererLightBudget.candidates[1]).toMatchObject({
      accepted: false,
      dropReason: "aurora-active-light-slot-cap"
    });
    expect(result.shadowDiagnostic).toMatchObject({
      shadowRelevantEntries: 3,
      mdlShadowLightNodes: 1,
      catalogShadowSizeTemplates: 1
    });
    expect(result.shadowDiagnostic.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "area-root-shadow-field", field: "ShadowOpacity" }),
        expect.objectContaining({ source: "processed-mdl-light-node", rendererRank: 1 }),
        expect.objectContaining({ source: "catalog-placeable-shadow-size", shadowSize: 1 })
      ])
    );
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/lighting/evidence",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      })
    );
  });

  it("fetches area detail and maps object placements", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            areaId: "area_001",
            name: "Area One",
            biome: "urban",
            width: 24,
            height: 24,
            tags: ["city"],
            benchmark: false,
            previewImageUrl: "/assets/previews/areas/area_001.webp",
            textureAtlas: {
              atlasId: "atlas_area_001",
              cacheKey: "atlas_area_001:24x24",
              strategy: "blob-cache",
              objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
              contentType: "image/webp",
              sizeBytes: 262144,
              etag: "atlas-area-001"
            },
            tileSet: "tno01",
            tiles: [
              {
                tileInstanceId: "area_001:tile:0",
                areaId: "area_001",
                tilesetResRef: "tno01",
                row: 0,
                col: 0,
                tileIndex: 0,
                tileId: 101,
                modelResRef: "tno01_a01_01",
                modelSource: "set-tile-section",
                orientation: 1,
                height: 0.5,
                source: "are-tile-list"
              },
              {
                tileInstanceId: "area_001:tile:1",
                areaId: "area_001",
                tilesetResRef: "tno01",
                row: 0,
                col: 1,
                tileIndex: 1,
                tileId: 102,
                orientation: 2,
                source: "are-tile-list",
                fallbackReason: "tile-model-reference-missing"
              }
            ],
            composition: {
              placeables: 1,
              doors: 1,
              creatures: 1,
              items: 0,
              sounds: 1,
              total: 4
            },
            updatedAt: "2026-05-27T10:00:00.000Z",
            objects: [
              {
                objectId: "obj_1",
                kind: "placeable",
                templateId: "plc_market_stall_001",
                tag: "VALELightNodeOrange03m",
                localizedName: "[W] Balustrada",
                description: "[Q]Pallet, Empty",
                x: 1,
                y: 2,
                z: 0,
                bearing: 90,
                visualTransform: {
                  scale: 0.5,
                  scaleX: 0.25,
                  scaleY: 0.5,
                  scaleZ: 0.75,
                  offsetX: 0,
                  offsetY: 0,
                  offsetZ: 0,
                  pitch: 4.712389,
                  yaw: 1.570796,
                  roll: 0
                }
              },
              {
                objectId: "obj_door_1",
                kind: "door",
                templateId: "utd_city_gate_01",
                x: 2,
                y: 3,
                z: 0,
                bearing: 45
              },
              {
                objectId: "obj_cre_alligator_hatchling",
                kind: "creature",
                templateId: "cre_alligator_hatchl",
                resRef: "alligator_hatchl",
                tag: "alligator_hatchling",
                appearanceType: 6403,
                creatureMetadata: {
                  templateResRef: "alligator_hatchl",
                  tag: "alligator_hatchling",
                  appearanceId: 6403,
                  firstName: "Piskle aligatora",
                  plot: false,
                  strength: 12
                },
                x: 3,
                y: 4,
                z: 0,
                bearing: 180
              },
              {
                objectId: "obj_sound_1",
                kind: "sound",
                templateId: "sfx_forge_loop_heavy",
                x: 4,
                y: 5,
                z: 1,
                bearing: 0,
                soundPositioning: {
                  mode: "specific",
                  elevation: 1,
                  maxVolumeDistance: 2,
                  cutoffDistance: 16,
                  randomRangeWestEast: 0,
                  randomRangeNorthSouth: 0,
                  preserve: {
                    timeWindow: "",
                    hourMask: "",
                    active: true,
                    whenToPlay: "always",
                    dayNight: "both",
                    playStyle: "loop",
                    playOrder: "sequential",
                    intervalMs: 6000,
                    intervalVariationMs: 0,
                    volume: 0.85,
                    volumeVariation: 0,
                    pitchVariation: 0,
                    priority: 1,
                    flags: {
                      active: true,
                      looping: true,
                      positional: true
                    },
                    extra: {
                      auroraSoundList: "sfx_forge_loop_heavy"
                    }
                  }
                }
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaById("token_abc", "area_001");

    expect(result.areaId).toBe("area_001");
    expect(result.previewImageUrl).toBe("/assets/previews/areas/area_001.webp");
    expect(result.textureAtlas).toMatchObject({
      atlasId: "atlas_area_001",
      objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
      contentType: "image/webp"
    });
    expect(result.tileSet).toBe("tno01");
    expect(result.tiles).toEqual([
      {
        tileInstanceId: "area_001:tile:0",
        areaId: "area_001",
        tilesetResRef: "tno01",
        row: 0,
        col: 0,
        tileIndex: 0,
        tileId: 101,
        modelResRef: "tno01_a01_01",
        modelSource: "set-tile-section",
        orientation: 1,
        height: 0.5,
        source: "are-tile-list"
      },
      {
        tileInstanceId: "area_001:tile:1",
        areaId: "area_001",
        tilesetResRef: "tno01",
        row: 0,
        col: 1,
        tileIndex: 1,
        tileId: 102,
        orientation: 2,
        source: "are-tile-list",
        fallbackReason: "tile-model-reference-missing"
      }
    ]);
    expect(result.composition).toMatchObject({
      placeables: 1,
      doors: 1,
      creatures: 1,
      sounds: 1,
      total: 4
    });
    expect(result.objects).toHaveLength(4);
    expect(result.objects[0]?.kind).toBe("placeable");
    expect(result.objects[0]?.tag).toBe("VALELightNodeOrange03m");
    expect(result.objects[0]?.localizedName).toBe("[W] Balustrada");
    expect(result.objects[0]?.description).toBe("[Q]Pallet, Empty");
    expect(result.objects[0]?.visualTransform).toEqual({
      scale: 0.5,
      scaleX: 0.25,
      scaleY: 0.5,
      scaleZ: 0.75,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 4.712389,
      yaw: 1.570796,
      roll: 0
    });
    expect(result.objects[1]?.kind).toBe("door");
    expect(result.objects[2]).toMatchObject({
      objectId: "obj_cre_alligator_hatchling",
      kind: "creature",
      templateId: "cre_alligator_hatchl",
      resRef: "alligator_hatchl",
      tag: "alligator_hatchling",
      appearanceType: 6403,
      creatureMetadata: {
        templateResRef: "alligator_hatchl",
        tag: "alligator_hatchling",
        appearanceId: 6403,
        firstName: "Piskle aligatora",
        plot: false,
        strength: 12
      }
    });
    expect(result.objects[3]).toMatchObject({
      kind: "sound",
      soundPositioning: {
        mode: "specific",
        preserve: {
          playStyle: "loop",
          extra: {
            auroraSoundList: "sfx_forge_loop_heavy"
          }
        }
      }
    });
  });

  it("processes an area and preserves backend cache and processed metadata", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: {
              key: "4f8c2a1b9e7d6c5a",
              hit: false,
              storedAt: "2026-06-16T18:20:00.000Z",
              hits: 0
            },
            area: {
              areaId: "area_001",
              name: "Area One",
              biome: "urban",
              width: 24,
              height: 24,
              tags: ["city"],
              benchmark: false,
              previewImageUrl: "/assets/previews/areas/area_001.webp",
              textureAtlas: {
                atlasId: "atlas_area_001",
                cacheKey: "atlas_area_001:24x24",
                strategy: "blob-cache",
                objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
                contentType: "image/webp",
                sizeBytes: 262144,
                etag: "atlas-area-001"
              },
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
              composition: {
                placeables: 1,
                doors: 1,
                creatures: 1,
                items: 1,
                sounds: 1,
                total: 5
              },
              updatedAt: "2026-05-27T10:00:00.000Z",
              processedAt: "2026-06-16T18:20:00.000Z",
              objects: [
                {
                  objectId: "obj_sound_1",
                  kind: "sound",
                  templateId: "sfx_forge_loop_heavy",
                  x: 4,
                  y: 5,
                  z: 1,
                  bearing: 0,
                  soundPositioning: {
                    mode: "specific",
                    elevation: 1,
                    maxVolumeDistance: 2,
                    cutoffDistance: 16,
                    randomRangeWestEast: 0,
                    randomRangeNorthSouth: 0
                  }
                }
              ]
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.processArea("token_abc", "area_001", { bypassCache: true });

    expect(result.cache).toMatchObject({
      key: "4f8c2a1b9e7d6c5a",
      hit: false,
      hits: 0
    });
    expect(result.area).toMatchObject({
      areaId: "area_001",
      previewImageUrl: "/assets/previews/areas/area_001.webp",
      processedAt: "2026-06-16T18:20:00.000Z",
      composition: {
        placeables: 1,
        doors: 1,
        creatures: 1,
        items: 1,
        sounds: 1,
        total: 5
      }
    });
    expect(result.area.objects[0]).toMatchObject({
      kind: "sound",
      soundPositioning: {
        mode: "specific",
        elevation: 1
      }
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/area_001/process",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer token_abc",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bypassCache: true })
      })
    );
  });

  it("fetches proxy texture atlas delivery contracts for a processed area cache", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cacheKey: "4f8c2a1b9e7d6c5a",
            textureAtlas: {
              mode: "proxy",
              atlasId: "atlas_area_001",
              objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
              contentType: "image/webp",
              sizeBytes: 262144,
              etag: "atlas-area-001",
              proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
              proxyUrl: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaTextureAtlasContracts("token_abc", "4f8c2a1b9e7d6c5a");

    expect(result).toMatchObject({
      cacheKey: "4f8c2a1b9e7d6c5a",
      textureAtlas: {
        mode: "proxy",
        atlasId: "atlas_area_001",
        proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures"
      }
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures/contracts?mode=proxy",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      })
    );
  });

  it("fetches direct texture atlas delivery contracts when backend exposes direct delivery", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cacheKey: "4f8c2a1b9e7d6c5a",
            textureAtlas: {
              mode: "direct",
              atlasId: "atlas_area_001",
              objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
              contentType: "image/webp",
              sizeBytes: 262144,
              proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
              proxyUrl: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
              directUrl: "https://assets.example.test/modules/current/areas/atlases/atlas_area_001.webp",
              s3Url: "s3://aurora-modules/modules/current/areas/atlases/atlas_area_001.webp"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaTextureAtlasContracts(
      "token_abc",
      "4f8c2a1b9e7d6c5a",
      "direct"
    );

    expect(result.textureAtlas).toMatchObject({
      mode: "direct",
      directUrl: "https://assets.example.test/modules/current/areas/atlases/atlas_area_001.webp",
      s3Url: "s3://aurora-modules/modules/current/areas/atlases/atlas_area_001.webp"
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures/contracts?mode=direct",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("surfaces backend texture delivery contract failures without fallback behavior", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "AREA_DIRECT_DELIVERY_UNAVAILABLE",
            message: "Direct area delivery is unavailable without blob storage settings."
          }
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(
      port.getAreaTextureAtlasContracts("token_abc", "4f8c2a1b9e7d6c5a", "direct")
    ).rejects.toMatchObject({
      status: 422,
      code: "AREA_DIRECT_DELIVERY_UNAVAILABLE"
    });
  });

  it("throws AreaApiRequestError with backend code on non-2xx response", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN_ROLE",
            message: "Forbidden for role."
          }
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.listAreas("token_bad")).rejects.toBeInstanceOf(AreaApiRequestError);
    await expect(port.listAreas("token_bad")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN_ROLE"
    });
  });
});
