import { describe, expect, it, vi } from "vitest";
import {
  CreatureApiRequestError,
  HttpCreatureApiPort
} from "../../../../src/modules/creatures/adapters/httpCreatureApiPort";

describe("HttpCreatureApiPort", () => {
  it("lists creature templates with metadata from the backend catalog", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                templateId: "cre_guard_captain",
                resref: "cre_guard",
                name: "Guard Captain",
                category: "npc",
                tags: ["guard"],
                previewImageUrl: "/api/v1/catalog/creatures/cre_guard_captain/thumbnail",
                metadata: {
                  strength: 16,
                  dexterity: 13,
                  plot: true,
                  classListEntries: "[{\"classId\":4,\"level\":5}]"
                }
              }
            ],
            total: 1,
            limit: 25,
            offset: 50
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpCreatureApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.listCreatures("token_123", {
      query: "guard",
      category: "npc",
      limit: 25,
      offset: 50
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/creatures?query=guard&category=npc&limit=25&offset=50",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer token_123"
        }
      }
    );
    expect(result.items[0]).toMatchObject({
      templateId: "cre_guard_captain",
      metadata: {
        strength: 16,
        dexterity: 13,
        plot: true,
        classListEntries: "[{\"classId\":4,\"level\":5}]"
      }
    });
  });

  it("loads validated Creature resource options from the backend catalog", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            kind: "soundset",
            items: [{ resRef: "ss_guard", label: "Guard", soundSetFile: 12 }],
            total: 1
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpCreatureApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.listCreatureResourceOptions("token_123", "soundset", "guard");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/creatures/resources?kind=soundset&limit=1000&query=guard",
      {
        method: "GET",
        headers: { Authorization: "Bearer token_123" }
      }
    );
    expect(result).toEqual({
      kind: "soundset",
      items: [{ resRef: "ss_guard", label: "Guard", soundSetFile: 12 }],
      total: 1
    });
  });

  it("throws a typed request error for backend failures", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "AUTH_INVALID_SESSION",
            message: "Session expired."
          }
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpCreatureApiPort(fetchFn, "https://aurora.test/api/v1");

    await expect(port.listCreatures("expired")).rejects.toMatchObject({
      name: "CreatureApiRequestError",
      status: 401,
      code: "AUTH_INVALID_SESSION",
      message: "Session expired."
    });
    await expect(port.listCreatures("expired")).rejects.toBeInstanceOf(
      CreatureApiRequestError
    );
  });

  it("creates and deletes module-backed creature blueprints", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              blueprint: {
                templateId: "cre_custom_guard",
                resref: "custom_guard",
                name: "Custom Guard",
                objectKey: "modules/current/custom_guard.utc",
                sizeBytes: 512,
                etag: "utc-etag",
                sourceFileType: "UTC ",
                sourceFileVersion: "V3.2"
              },
              cache: {
                key: "cache_custom_guard",
                hit: false,
                storedAt: "2026-07-10T09:00:00.000Z",
                hits: 0
              },
              creature: {
                templateId: "cre_custom_guard",
                kind: "creature",
                resref: "custom_guard",
                name: "Custom Guard",
                category: "custom",
                benchmarkCandidate: false,
                render: {
                  backendType: "creature",
                  frontendType: "creature",
                  rendererPreset: "creature-standard"
                },
                processedAt: "2026-07-10T09:00:00.000Z"
              }
            }
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              resref: "custom_guard",
              objectKey: "modules/current/custom_guard.utc",
              deleted: true
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    const port = new HttpCreatureApiPort(fetchFn, "https://aurora.test/api/v1");
    const payload = {
      templateResRef: "custom_guard",
      name: "Custom Guard",
      blueprint: { appearanceId: 6, firstName: "Custom" },
      overwrite: true
    };

    const created = await port.createCreatureBlueprint("token_123", payload);
    const deleted = await port.deleteCreatureBlueprint("token_123", "custom_guard");

    expect(fetchFn).toHaveBeenNthCalledWith(1, "https://aurora.test/api/v1/catalog/creatures/blueprints", {
      method: "POST",
      headers: {
        Authorization: "Bearer token_123",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      "https://aurora.test/api/v1/catalog/creatures/blueprints/custom_guard",
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer token_123"
        }
      }
    );
    expect(created.blueprint).toMatchObject({
      templateId: "cre_custom_guard",
      sourceFileType: "UTC "
    });
    expect(deleted).toEqual({
      resref: "custom_guard",
      objectKey: "modules/current/custom_guard.utc",
      deleted: true
    });
  });

  it("renames a module-backed creature blueprint through the dedicated endpoint", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            blueprint: {
              templateId: "cre_renamed_guard",
              resref: "renamed_guard",
              name: "Custom Guard",
              objectKey: "modules/current/renamed_guard.utc",
              sizeBytes: 512,
              etag: "utc-renamed-etag",
              sourceFileType: "UTC ",
              sourceFileVersion: "V3.2"
            },
            cache: {
              key: "cache_renamed_guard",
              hit: false,
              storedAt: "2026-07-10T09:00:00.000Z",
              hits: 0
            },
            creature: {
              templateId: "cre_renamed_guard",
              kind: "creature",
              resref: "renamed_guard",
              name: "Custom Guard",
              category: "custom",
              benchmarkCandidate: false,
              render: {
                backendType: "creature",
                frontendType: "creature",
                rendererPreset: "creature-standard"
              },
              processedAt: "2026-07-10T09:00:00.000Z"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpCreatureApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.renameCreatureBlueprint(
      "token_123",
      "custom_guard",
      "renamed_guard"
    );

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/creatures/blueprints/custom_guard/rename",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token_123",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ templateResRef: "renamed_guard" })
      }
    );
    expect(result.blueprint).toMatchObject({
      resref: "renamed_guard",
      objectKey: "modules/current/renamed_guard.utc"
    });
  });

  it("processes creature templates with renderer handoff payload", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: {
              key: "cache_cre_guard",
              hit: false,
              storedAt: "2026-06-26T10:00:00.000Z",
              hits: 0
            },
            creature: {
              templateId: "cre_guard_captain",
              kind: "creature",
              resref: "cre_guard",
              name: "Guard Captain",
              category: "npc",
              benchmarkCandidate: false,
              metadata: {
                appearanceId: 123
              },
              render: {
                backendType: "creature",
                frontendType: "creature",
                rendererPreset: "creature-standard"
              },
              creatureRenderPackage: {
                status: "missing_derived",
                rendererPreset: "creature-standard",
                diagnostics: [
                  {
                    code: "CREATURE_RENDER_SKINNED_GLB_MISSING",
                    severity: "error",
                    message: "No skinned GLB yet."
                  }
                ],
                appearanceProfile: {
                  appearanceType: 123,
                  modelType: "P",
                  raceModel: "Human",
                  sizeCategory: 4,
                  sizeCategoryLabel: "Large"
                },
                sourceModelCandidates: [
                  {
                    resref: "Human",
                    role: "appearance-race-model",
                    source: "appearance.2da.RACE",
                    confidence: "assembly-prefix",
                    assetId: "asset-human-glb",
                    glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-human-glb.glb",
                    supermodelResRef: "a_fa",
                    supermodelAssetId: "asset-a-fa-glb",
                    supermodelGlbUrl:
                      "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-a-fa-glb.glb"
                  }
                ],
                skeletonModelCandidates: [
                  {
                    resref: "pfh2",
                    role: "base-skeleton",
                    source: "part-model-prefix",
                    modelPrefix: "pfh2_",
                    confidence: "prefix-derived",
                    assetId: "asset-pfh2-glb",
                    glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-pfh2-glb.glb"
                  }
                ],
                partModelCandidates: [
                  {
                    slot: "head",
                    partId: 22,
                    partModelName: "head",
                    modelPrefix: "pfh2_",
                    modelResRef: "pfh2_head022",
                    modelResRefPattern: "aurora-player-body-part",
                    modelResRefPatternFormat: "p%c%c%s_%s_%03d",
                    assetId: "asset-head-glb",
                    glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-head-glb.glb",
                    source: "utc.Appearance_Head",
                    sourceKey: "modules/current/blueprints/creatures/cre_guard.utc"
                  },
                  {
                    slot: "rFoot",
                    partId: 4,
                    partModelName: "rfoot",
                    nodeName: "rfoot_g",
                    modelPrefix: "pfh2_",
                    modelResRef: "pfh2_rfoot004",
                    modelResRefPattern: "aurora-player-body-part",
                    modelResRefPatternFormat: "p%c%c%s_%s_%03d",
                    assetId: "asset-rfoot-glb",
                    glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-rfoot-glb.glb",
                    source: "capart.2da.MDLNAME",
                    source2daRow: 0,
                    sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
                  },
                  {
                    slot: "wings",
                    partId: 4,
                    partModelName: "Guard_Wings",
                    modelResRef: "wing_guard04",
                    assetId: "asset-wing-glb",
                    glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-wing-glb.glb",
                    source: "wingmodel.2da.MODEL",
                    source2daRow: 4,
                    sourceKey: "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da"
                  },
                  {
                    slot: "tail",
                    partId: 5,
                    partModelName: "Guard_Tail",
                    modelResRef: "tail_guard05",
                    assetId: "asset-tail-glb",
                    glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-tail-glb.glb",
                    source: "tailmodel.2da.MODEL",
                    source2daRow: 5,
                    sourceKey: "modules/current/__aurora/sources/hak/lc_2da/tailmodel.2da"
                  }
                ],
                equipmentModelCandidates: [
                  {
                    resref: "nw_wswmls001",
                    itemTemplateId: "itm_nw_wswmls001",
                    slotMask: 16,
                    slotLabels: ["right hand"],
                    attachmentTargets: ["rhand_g"],
                    primaryAttachmentTarget: "rhand_g",
                    baseItem: 6,
                    itemName: "Longsword",
                    itemModelType: "wsw",
                    itemModelParts: [2, 1, 3],
                    itemModelPartRoles: ["blade", "middle", "top"],
                    itemModelPartResRefs: ["wswb_002", "wswm_001", "wswt_003"],
                    itemModelPartCandidates: [
                      {
                        resref: "wswb_002",
                        role: "blade",
                        partId: 2,
                        assetId: "asset-wswb-glb",
                        glbUrl:
                          "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-wswb-glb.glb"
                      },
                      {
                        resref: "wswm_001",
                        role: "middle",
                        partId: 1
                      },
                      {
                        resref: "wswt_003",
                        role: "top",
                        partId: 3
                      }
                    ],
                    itemModelPartSourceKey:
                      "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
                    source: "utc.Equip_ItemList",
                    sourceModelStatus: "model-resrefs-ready"
                  }
                ],
                textureBindings: [
                  {
                    reference: "pfh2_body",
                    assetId: "asset-pfh2-body",
                    fileName: "pfh2_body.dds",
                    objectKey: "modules/current/textures/pfh2_body.dds",
                    deliveryUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-pfh2-body.dds",
                    txi: {
                      bumpmaptexture: "pfh2_body_b",
                      envmaptexture: "pfh2_body_e"
                    }
                  }
                ],
                bodyParts: {
                  torso: 2
                },
                colors: {
                  skin: 8
                },
                auroraLight: {
                  source: "source-mdl",
                  lights: [
                    {
                      source: "aurora-mdl-ascii",
                      sourceModelAssetId: "asset-light-mdl",
                      sourceModelFileName: "n_guard_light.mdl",
                      sourceModelObjectKey: "modules/current/models/n_guard_light.mdl",
                      nodeName: "pulse_l",
                      multiplier: 1,
                      animations: [
                        {
                          animationName: "default",
                          multiplierTimeline: [
                            { time: 0, value: 1 },
                            { time: 1, value: 3 }
                          ]
                        }
                      ]
                    }
                  ],
                  diagnostics: []
                },
                materialPipelineEvidence: {
                  source: "decompiled-aurora",
                  pltVertexShaderName: "vs_pltgen",
                  pltFragmentShaderName: "fs_pltgen",
                  pltSchemeUniformPattern: "PLTscheme[%d]",
                  pltSchemeUniformCount: 15,
                  pltReplacementUniformName: "pltreplacement",
                  skinPaletteResRef: "pal_skin01"
                },
                skeletonPipelineEvidence: {
                  source: "decompiled-aurora",
                  supermodelCommandName: "setsupermodel",
                  animationScaleCommandName: "setanimationscale",
                  skinnedMeshNodeType: "skinmesh",
                  requiresComposedSkeleton: true
                },
                sourceMdlInspection: {
                  source: "source-mdl",
                  models: [
                    {
                      source: "aurora-mdl-ascii",
                      sourceModelAssetId: "asset-pfh2-mdl",
                      sourceModelFileName: "pfh2.mdl",
                      sourceModelObjectKey: "modules/current/models/pfh2.mdl",
                      modelName: "pfh2",
                      supermodel: "a_fa",
                      animationScale: 1,
                      nodeCount: 2,
                      rootNodeNames: ["pfh2"],
                      nodeTypes: ["dummy", "skin"],
                      nodeTypeCounts: {
                        dummy: 1,
                        skin: 1
                      },
                      nodes: [
                        {
                          name: "pfh2",
                          nodeType: "dummy",
                          position: [0, 0, 0],
                          scale: 1
                        }
                      ],
                      animationCount: 1,
                      animationNames: ["walk"],
                      animations: [
                        {
                          name: "walk",
                          targetModel: "pfh2",
                          lengthSeconds: 1.2,
                          transitionSeconds: 0.25,
                          nodeCount: 1,
                          nodeNames: ["pfh2"],
                          positionKeyCount: 1,
                          orientationKeyCount: 1,
                          scaleKeyCount: 0,
                          alphaKeyCount: 0,
                          danglyNodeCount: 0,
                          animmeshNodeCount: 0
                        }
                      ],
                      meshCount: 1,
                      textureReferences: ["pfh2_body"]
                    }
                  ],
                  diagnostics: []
                }
              },
              creatureRuntime: {
                appearance: {
                  appearanceType: 123
                }
              },
              creatureValidationIssues: [],
              processedAt: "2026-06-26T10:00:01.000Z"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpCreatureApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.processCreature("token_123", {
      templateId: "cre_guard_captain",
      bypassCache: false
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/creatures/process",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token_123",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateId: "cre_guard_captain",
          bypassCache: false
        })
      }
    );
    expect(
      result.creature.creatureRenderPackage?.auroraLight?.lights[0]?.animations?.[0]
        ?.multiplierTimeline
    ).toEqual([
      { time: 0, value: 1 },
      { time: 1, value: 3 }
    ]);
    expect(result.creature.creatureRenderPackage?.textureBindings?.[0]?.txi).toMatchObject({
      bumpmaptexture: "pfh2_body_b",
      envmaptexture: "pfh2_body_e"
    });
    expect(result.cache.key).toBe("cache_cre_guard");
    expect(result.creature.creatureRenderPackage).toMatchObject({
      status: "missing_derived",
      rendererPreset: "creature-standard",
      appearanceProfile: {
        appearanceType: 123,
        modelType: "P",
        raceModel: "Human",
        sizeCategory: 4,
        sizeCategoryLabel: "Large"
      },
      sourceModelCandidates: [
        {
          resref: "Human",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "assembly-prefix",
          assetId: "asset-human-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-human-glb.glb",
          supermodelResRef: "a_fa",
          supermodelAssetId: "asset-a-fa-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-a-fa-glb.glb"
        }
      ],
      skeletonModelCandidates: [
        {
          resref: "pfh2",
          role: "base-skeleton",
          source: "part-model-prefix",
          modelPrefix: "pfh2_",
          confidence: "prefix-derived",
          assetId: "asset-pfh2-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-pfh2-glb.glb"
        }
      ],
      partModelCandidates: [
        {
          slot: "head",
          partId: 22,
          partModelName: "head",
          modelPrefix: "pfh2_",
          modelResRef: "pfh2_head022",
          modelResRefPattern: "aurora-player-body-part",
          modelResRefPatternFormat: "p%c%c%s_%s_%03d",
          assetId: "asset-head-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-head-glb.glb",
          source: "utc.Appearance_Head",
          sourceKey: "modules/current/blueprints/creatures/cre_guard.utc"
        },
        {
          slot: "rFoot",
          partId: 4,
          partModelName: "rfoot",
          nodeName: "rfoot_g",
          modelPrefix: "pfh2_",
          modelResRef: "pfh2_rfoot004",
          modelResRefPattern: "aurora-player-body-part",
          modelResRefPatternFormat: "p%c%c%s_%s_%03d",
          assetId: "asset-rfoot-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-rfoot-glb.glb",
          source: "capart.2da.MDLNAME",
          source2daRow: 0,
          sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
        },
        {
          slot: "wings",
          partId: 4,
          partModelName: "Guard_Wings",
          modelResRef: "wing_guard04",
          assetId: "asset-wing-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-wing-glb.glb",
          source: "wingmodel.2da.MODEL",
          source2daRow: 4,
          sourceKey: "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da"
        },
        {
          slot: "tail",
          partId: 5,
          partModelName: "Guard_Tail",
          modelResRef: "tail_guard05",
          assetId: "asset-tail-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-tail-glb.glb",
          source: "tailmodel.2da.MODEL",
          source2daRow: 5,
          sourceKey: "modules/current/__aurora/sources/hak/lc_2da/tailmodel.2da"
        }
      ],
      equipmentModelCandidates: [
        {
          resref: "nw_wswmls001",
          itemTemplateId: "itm_nw_wswmls001",
          slotMask: 16,
          slotLabels: ["right hand"],
          attachmentTargets: ["rhand_g"],
          primaryAttachmentTarget: "rhand_g",
          baseItem: 6,
          itemName: "Longsword",
          itemModelType: "wsw",
          itemModelParts: [2, 1, 3],
          itemModelPartRoles: ["blade", "middle", "top"],
          itemModelPartResRefs: ["wswb_002", "wswm_001", "wswt_003"],
          itemModelPartCandidates: [
            {
              resref: "wswb_002",
              role: "blade",
              partId: 2,
              assetId: "asset-wswb-glb",
              glbUrl:
                "/api/v1/catalog/placeables/cache/cache_cre_guard/assets/asset-wswb-glb.glb"
            },
            {
              resref: "wswm_001",
              role: "middle",
              partId: 1
            },
            {
              resref: "wswt_003",
              role: "top",
              partId: 3
            }
          ],
          itemModelPartSourceKey:
            "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
          source: "utc.Equip_ItemList",
          sourceModelStatus: "model-resrefs-ready"
        }
      ],
      bodyParts: {
        torso: 2
      },
      colors: {
        skin: 8
      },
      materialPipelineEvidence: {
        source: "decompiled-aurora",
        pltVertexShaderName: "vs_pltgen",
        pltFragmentShaderName: "fs_pltgen",
        pltSchemeUniformPattern: "PLTscheme[%d]",
        pltSchemeUniformCount: 15,
        pltReplacementUniformName: "pltreplacement",
        skinPaletteResRef: "pal_skin01"
      },
      skeletonPipelineEvidence: {
        source: "decompiled-aurora",
        supermodelCommandName: "setsupermodel",
        animationScaleCommandName: "setanimationscale",
        skinnedMeshNodeType: "skinmesh",
        requiresComposedSkeleton: true
      },
      sourceMdlInspection: {
        source: "source-mdl",
        models: [
          expect.objectContaining({
            sourceModelFileName: "pfh2.mdl",
            modelName: "pfh2",
            supermodel: "a_fa",
            nodeTypeCounts: {
              dummy: 1,
              skin: 1
            },
            animationNames: ["walk"],
            animations: [
              expect.objectContaining({
                name: "walk",
                lengthSeconds: 1.2,
                nodeCount: 1
              })
            ]
          })
        ]
      }
    });
  });

  it("loads processed creature payloads from cache", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: {
              key: "cache_cre_guard",
              hit: true,
              storedAt: "2026-06-26T10:00:00.000Z",
              hits: 2
            },
            creature: {
              templateId: "cre_guard_captain",
              kind: "creature",
              resref: "cre_guard",
              name: "Guard Captain",
              category: "npc",
              benchmarkCandidate: false,
              render: {
                backendType: "creature",
                frontendType: "creature",
                rendererPreset: "creature-standard"
              },
              creatureRenderPackage: {
                status: "missing_profile",
                rendererPreset: "creature-standard",
                diagnostics: [],
                bodyParts: {},
                colors: {}
              },
              processedAt: "2026-06-26T10:00:01.000Z"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpCreatureApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.getProcessedCreature("token_123", "cache_cre_guard");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/creatures/cache/cache_cre_guard",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer token_123"
        }
      }
    );
    expect(result.cache.hit).toBe(true);
    expect(result.creature.creatureRenderPackage?.status).toBe("missing_profile");
  });
});
