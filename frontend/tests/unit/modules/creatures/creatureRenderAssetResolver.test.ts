import { describe, expect, it } from "vitest";
import {
  resolveCreatureEquipmentModelPartResolutions,
  resolveCreatureModelResolution,
  resolveCreaturePartModelResolutions,
  resolveCreatureSkeletonModelResolution,
  resolveCreatureTextureDeliveryUrlsByReference
} from "../../../../src/modules/creatures/application/creatureRenderAssetResolver";
import type { CreatureViewportRenderPayload } from "../../../../src/modules/creatures/application/creatureRenderPayloadResolver";

function createCreatureViewportPayload(): CreatureViewportRenderPayload {
  return {
    templateId: "cre_bear_001",
    cacheKey: "creature-cache-key",
    cacheHit: false,
    storedAt: "2026-01-01T00:00:00.000Z",
    hits: 0,
    creature: {
      templateId: "cre_bear_001",
      kind: "creature",
      resref: "cre_bear",
      name: "Forest Bear",
      category: "animals",
      benchmarkCandidate: false,
      render: {
        backendType: "creature",
        frontendType: "creature",
        rendererPreset: "creature-standard"
      },
      processedAt: "2026-01-01T00:00:00.000Z"
    },
    renderPackage: {
      status: "ready",
      diagnostics: [
        {
          code: "CREATURE_RENDER_DIRECT_MODEL_READY",
          severity: "warn",
          message: "Direct creature model is ready."
        }
      ],
      rendererPreset: "creature-standard",
      sourceModelCandidates: [
        {
          resref: "n_bear",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model"
        }
      ],
      skeletonModelCandidates: [],
      partModelCandidates: [],
      assetRefs: {
        derivedModelAssetIds: ["asset-bear-glb"]
      },
      glbUrl: "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-bear-glb.glb",
      bodyParts: {},
      colors: {}
    }
  };
}

describe("creatureRenderAssetResolver", () => {
  it("resolves ready direct-model creature packages to a web model URL", () => {
    const resolution = resolveCreatureModelResolution(
      createCreatureViewportPayload(),
      "http://localhost:3000"
    );

    expect(resolution).toEqual({
      modelUrl:
        "http://localhost:3000/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-bear-glb.glb",
      modelCacheKey: "creature:creature-cache-key:derived:asset-bear-glb",
      status: "ready",
      fallbackReason: null,
      ready: true
    });
  });

  it("routes dev creature model delivery through the Vite proxy", () => {
    const originalLocation = globalThis.location;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: new URL("http://127.0.0.1:5176/app")
    });

    try {
      const resolution = resolveCreatureModelResolution(createCreatureViewportPayload());

      expect(resolution.modelUrl).toBe(
        "http://127.0.0.1:5176/_aurora/v1/catalog/placeables/cache/creature-cache-key/assets/asset-bear-glb.glb"
      );
    } finally {
      Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: originalLocation
      });
    }
  });

  it("resolves direct-model creature supermodel delivery for animation playback", () => {
    const payload = createCreatureViewportPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      sourceModelCandidates: [
        {
          resref: "c_bearbrwn",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-c-bearbrwn-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-c-bearbrwn-glb.glb",
          supermodelResRef: "bear_a",
          supermodelAssetId: "asset-bear-a-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-bear-a-glb.glb"
        }
      ]
    };

    expect(resolveCreatureModelResolution(payload, "http://localhost:3000")).toEqual({
      modelUrl:
        "http://localhost:3000/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-c-bearbrwn-glb.glb",
      modelCacheKey: "creature:creature-cache-key:derived:asset-c-bearbrwn-glb",
      status: "ready",
      fallbackReason: null,
      ready: true,
      assetId: "asset-c-bearbrwn-glb",
      supermodelResRef: "bear_a",
      supermodelModelUrl:
        "http://localhost:3000/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-bear-a-glb.glb",
      supermodelModelCacheKey: "creature:creature-cache-key:supermodel:asset-bear-a-glb",
      supermodelAssetId: "asset-bear-a-glb"
    });
  });

  it("keeps non-ready creature packages on the marker path", () => {
    const payload = createCreatureViewportPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      status: "missing_derived",
      glbUrl: undefined,
      assetRefs: undefined
    };

    expect(resolveCreatureModelResolution(payload, "http://localhost:3000")).toMatchObject({
      modelUrl: null,
      modelCacheKey: null,
      status: "missing_derived",
      ready: false
    });
  });

  it("resolves CAPart part model delivery URLs independently from composed readiness", () => {
    const payload = createCreatureViewportPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      status: "missing_derived",
      partModelCandidates: [
        {
          slot: "rFoot",
          partId: 4,
          partModelName: "rfoot",
          modelResRef: "pfh2_rfoot004",
          assetId: "asset-rfoot-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-rfoot-glb.glb",
          source: "capart.2da.MDLNAME",
          source2daRow: 0,
          sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da",
          materialColors: {
            leather1: 103,
            leather2: 11,
            cloth1: 102,
            cloth2: 8,
            metal1: 156,
            metal2: 157
          }
        }
      ]
    };

    expect(resolveCreaturePartModelResolutions(payload, "http://localhost:3000")).toEqual([
      {
        slot: "rFoot",
        partId: 4,
        modelResRef: "pfh2_rfoot004",
        modelUrl:
          "http://localhost:3000/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-rfoot-glb.glb",
        modelCacheKey: "creature:creature-cache-key:part:rFoot:asset-rfoot-glb",
        materialColors: {
          leather1: 103,
          leather2: 11,
          cloth1: 102,
          cloth2: 8,
          metal1: 156,
          metal2: 157
        }
      }
    ]);
  });

  it("adds a phenotype-zero default head fallback beside derived skeleton delivery URLs", () => {
    const payload = createCreatureViewportPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      status: "missing_derived",
      skeletonModelCandidates: [
        {
          resref: "pmh9",
          role: "base-skeleton",
          source: "part-model-prefix",
          modelPrefix: "pmh9_",
          confidence: "prefix-derived",
          assetId: "asset-pmh9-glb",
          glbUrl:
            "http://127.0.0.1:8888/buckets/aurora-module-assets/modules/current/__aurora/derived/models/pmh9.glb"
        }
      ],
      partModelCandidates: [
        {
          slot: "head",
          partId: 148,
          partModelName: "head",
          modelPrefix: "pmh9_",
          modelResRef: "pmh9_head148",
          source: "utc.Appearance_Head",
          sourceKey: "modules/current/npc_bimber2.utc"
        }
      ]
    };

    expect(resolveCreaturePartModelResolutions(payload, "http://localhost:3000")).toEqual([
      {
        slot: "head",
        partId: 1,
        modelResRef: "pmh0_head001",
        modelUrl:
          "http://127.0.0.1:8888/buckets/aurora-module-assets/modules/current/__aurora/derived/models/pmh0_head001.glb",
        modelCacheKey: "creature:creature-cache-key:part-fallback:head:pmh0_head001"
      }
    ]);
  });

  it("prefers a phenotype-zero same-head delivery URL over the default head fallback", () => {
    const payload = createCreatureViewportPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      status: "ready",
      skeletonModelCandidates: [
        {
          resref: "pmh9",
          role: "base-skeleton",
          source: "part-model-prefix",
          modelPrefix: "pmh9_",
          confidence: "prefix-derived",
          assetId: "asset-pmh9-glb",
          glbUrl:
            "http://127.0.0.1:8888/buckets/aurora-module-assets/modules/current/__aurora/derived/models/pmh9.glb"
        }
      ],
      partModelCandidates: [
        {
          slot: "head",
          partId: 148,
          partModelName: "head",
          modelPrefix: "pmh9_",
          modelResRef: "pmh9_head148",
          source: "utc.Appearance_Head",
          sourceKey: "modules/current/npc_bimber2.utc"
        },
        {
          slot: "head",
          partId: 148,
          partModelName: "head",
          modelPrefix: "pmh0_",
          modelResRef: "pmh0_head148",
          glbUrl:
            "http://127.0.0.1:8888/buckets/aurora-module-assets/modules/current/__aurora/derived/models/pmh0_head148.glb",
          source: "utc.Appearance_Head",
          sourceKey: "modules/current/npc_bimber2.utc"
        },
        {
          slot: "head",
          partId: 1,
          partModelName: "head",
          modelPrefix: "pmh0_",
          modelResRef: "pmh0_head001",
          glbUrl:
            "http://127.0.0.1:8888/buckets/aurora-module-assets/modules/current/__aurora/derived/models/pmh0_head001.glb",
          source: "utc.Appearance_Head",
          sourceKey: "modules/current/npc_bimber2.utc"
        }
      ]
    };

    expect(resolveCreaturePartModelResolutions(payload, "http://localhost:3000")).toEqual([
      {
        slot: "head",
        partId: 148,
        modelPrefix: "pmh0_",
        modelResRef: "pmh0_head148",
        modelUrl:
          "http://127.0.0.1:8888/buckets/aurora-module-assets/modules/current/__aurora/derived/models/pmh0_head148.glb",
        modelCacheKey: "creature:creature-cache-key:part:head:pmh0_head148"
      }
    ]);
  });

  it("resolves equipment model part delivery URLs from baseitems-derived candidates", () => {
    const payload = createCreatureViewportPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      equipmentModelCandidates: [
        {
          resref: "nw_wswmls001",
          slotLabels: ["right hand"],
          attachmentTargets: ["rhand", "rhand_g"],
          primaryAttachmentTarget: "rhand",
          itemModelType: "wsw",
          itemModelPartResRefs: ["wswb_002", "wswm_001"],
          itemModelPartCandidates: [
            {
              resref: "wswb_002",
              role: "blade",
              partId: 2,
              assetId: "asset-wswb-glb",
              glbUrl:
                "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-wswb-glb.glb"
            },
            {
              resref: "wswm_001",
              role: "middle",
              partId: 1,
              assetId: "asset-wswm-glb",
              glbUrl:
                "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-wswm-glb.glb"
            }
          ],
          source: "utc.Equip_ItemList",
          sourceModelStatus: "model-resrefs-ready"
        }
      ]
    };

    expect(
      resolveCreatureEquipmentModelPartResolutions(payload, "http://localhost:3000")
    ).toEqual([
      {
        equipmentResref: "nw_wswmls001",
        equipmentIndex: 0,
        partResref: "wswb_002",
        partIndex: 0,
        role: "blade",
        partId: 2,
        assetId: "asset-wswb-glb",
        attachmentTarget: "rhand_g",
        itemModelType: "wsw",
        slotLabels: ["right hand"],
        modelUrl:
          "http://localhost:3000/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-wswb-glb.glb",
        modelCacheKey:
          "creature:creature-cache-key:equipment:nw_wswmls001:asset-wswb-glb"
      },
      {
        equipmentResref: "nw_wswmls001",
        equipmentIndex: 0,
        partResref: "wswm_001",
        partIndex: 1,
        role: "middle",
        partId: 1,
        assetId: "asset-wswm-glb",
        attachmentTarget: "rhand_g",
        itemModelType: "wsw",
        slotLabels: ["right hand"],
        modelUrl:
          "http://localhost:3000/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-wswm-glb.glb",
        modelCacheKey:
          "creature:creature-cache-key:equipment:nw_wswmls001:asset-wswm-glb"
      }
    ]);
  });

  it("suppresses equipment visuals for special non-humanoid direct models", () => {
    const payload = createCreatureViewportPayload();
    const armorCandidate = {
      resref: "nw_aarcl002",
      slotMask: 0x02,
      slotLabels: ["armor"],
      attachmentTargets: ["torso"],
      primaryAttachmentTarget: "torso",
      baseItem: 16,
      itemModelType: "aarcl",
      itemModelPartCandidates: [
        {
          resref: "aarcl_002",
          role: "armor",
          partId: 2,
          assetId: "asset-aarcl-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-aarcl-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    const swordCandidate = {
      resref: "nw_wswss001",
      slotMask: 0x10,
      slotLabels: ["right hand"],
      attachmentTargets: ["rhand", "rhand_g"],
      primaryAttachmentTarget: "rhand",
      baseItem: 0,
      itemModelType: "wswss",
      itemModelPartCandidates: [
        {
          resref: "wswss_b_011",
          role: "blade",
          partId: 11,
          assetId: "asset-wswss-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-wswss-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        modelType: "S",
        raceModel: "zcp_horse_cart",
        appearanceLabel: "Travel: Waggon and Donkey* (CCP)"
      },
      equipmentModelCandidates: [armorCandidate, swordCandidate]
    };

    expect(
      resolveCreatureEquipmentModelPartResolutions(payload, "http://localhost:3000")
    ).toEqual([]);

    payload.renderPackage = {
      ...payload.renderPackage,
      appearanceProfile: {
        modelType: "P",
        raceModel: "H",
        appearanceLabel: "(Dynamic) Human"
      }
    };

    const humanoidResolutions = resolveCreatureEquipmentModelPartResolutions(
      payload,
      "http://localhost:3000"
    );
    expect(humanoidResolutions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipmentResref: "nw_wswss001",
          partResref: "wswss_b_011",
          attachmentTarget: "rhand_g"
        })
      ])
    );
  });

  it("anchors synthesized bow ammunition to the right hand when the launcher is held in the left hand", () => {
    const payload = createCreatureViewportPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      equipmentModelCandidates: [
        {
          resref: "nw_hen_shasb2",
          slotLabels: ["right hand"],
          attachmentTargets: ["lhand_g"],
          primaryAttachmentTarget: "lhand_g",
          baseItem: 11,
          weaponWield: 5,
          rangedWeapon: 20,
          itemModelType: "wbwsh",
          itemModelPartCandidates: [
            {
              resref: "wbwsh_b_011",
              role: "blade",
              partId: 11,
              assetId: "asset-wbwsh-b-glb",
              glbUrl:
                "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-wbwsh-b-glb.glb"
            },
            {
              resref: "wbwsh_m_011",
              role: "middle",
              partId: 11,
              assetId: "asset-wbwsh-m-glb",
              glbUrl:
                "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-wbwsh-m-glb.glb"
            }
          ],
          source: "utc.Equip_ItemList",
          sourceModelStatus: "model-resrefs-ready"
        }
      ]
    };

    expect(
      resolveCreatureEquipmentModelPartResolutions(payload, "http://localhost:3000", {
        includeAmmunitionVisual: true
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipmentResref: "nw_hen_shasb2",
          partResref: "wbwsh_b_011",
          attachmentTarget: "lhand_g"
        }),
        expect.objectContaining({
          equipmentResref: "nw_hen_shasb2:runtime-wamar",
          partResref: "wamar_m_011",
          modelUrl: "runtime://aurora-ammunition/wamar_m_011",
          attachmentTarget: "rhand_g",
          itemModelType: "wamar",
          role: "runtime-ammunition"
        })
      ])
    );
  });

  it("remaps Aurora crossbows from the source left-hand candidate to the right-hand dummy target", () => {
    const payload = createCreatureViewportPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      equipmentModelCandidates: [
        {
          resref: "nw_wbwxl001",
          slotLabels: ["right hand"],
          attachmentTargets: ["lhand_g"],
          primaryAttachmentTarget: "lhand_g",
          baseItem: 7,
          baseItemEquipableSlots: "0x00030",
          weaponWield: 6,
          weaponType: 1,
          weaponSize: 2,
          rangedWeapon: 25,
          rotateOnGround: 2,
          ammunitionType: 2,
          itemModelType: "wbwxl",
          itemModelPartCandidates: [
            {
              resref: "wbwxl_b_011",
              role: "blade",
              partId: 11,
              assetId: "asset-wbwxl-glb",
              glbUrl:
                "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-wbwxl-glb.glb"
            }
          ],
          source: "utc.Equip_ItemList",
          sourceModelStatus: "model-resrefs-ready"
        }
      ]
    };

    expect(
      resolveCreatureEquipmentModelPartResolutions(payload, "http://localhost:3000")
    ).toMatchObject([
      {
        equipmentResref: "nw_wbwxl001",
        partResref: "wbwxl_b_011",
        attachmentTarget: "rhand_g",
        baseItem: 7,
        baseItemEquipableSlots: "0x00030",
        weaponWield: 6,
        rangedWeapon: 25,
        ammunitionType: 2
      }
    ]);

    expect(
      resolveCreatureEquipmentModelPartResolutions(payload, "http://localhost:3000", {
        includeAmmunitionVisual: true
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipmentResref: "nw_wbwxl001",
          partResref: "wbwxl_b_011",
          attachmentTarget: "rhand_g"
        }),
        expect.objectContaining({
          equipmentResref: "nw_wbwxl001:runtime-wambo",
          partResref: "wambo_011",
          modelUrl: "runtime://aurora-ammunition/wambo_011",
          attachmentTarget: "rhand_g",
          itemModelType: "wambo",
          ammunitionType: 2,
          role: "runtime-ammunition"
        })
      ])
    );
  });

  it("resolves base skeleton model delivery URL for skeleton-aware part assembly", () => {
    const payload = createCreatureViewportPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      skeletonModelCandidates: [
        {
          resref: "pfh2",
          role: "base-skeleton",
          source: "part-model-prefix",
          modelPrefix: "pfh2_",
          confidence: "prefix-derived",
          assetId: "asset-pfh2-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-pfh2-glb.glb",
          supermodelResRef: "a_fa",
          supermodelAssetId: "asset-a-fa-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-a-fa-glb.glb"
        }
      ]
    };

    expect(resolveCreatureSkeletonModelResolution(payload, "http://localhost:3000")).toEqual({
      resref: "pfh2",
      modelUrl:
        "http://localhost:3000/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-pfh2-glb.glb",
      modelCacheKey: "creature:creature-cache-key:skeleton:asset-pfh2-glb",
      assetId: "asset-pfh2-glb",
      supermodelResRef: "a_fa",
      supermodelModelUrl:
        "http://localhost:3000/api/v1/catalog/placeables/cache/creature-cache-key/assets/asset-a-fa-glb.glb",
      supermodelModelCacheKey: "creature:creature-cache-key:supermodel:asset-a-fa-glb",
      supermodelAssetId: "asset-a-fa-glb"
    });
  });

  it("resolves creature texture delivery URLs by normalized Aurora references", () => {
    const payload = createCreatureViewportPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureUrls: [
        "/api/v1/catalog/placeables/cache/creature-cache-key/assets/pfh2_rfoot004.plt?etag=1",
        "/api/v1/catalog/placeables/cache/creature-cache-key/assets/pfh2_rfoot004_d.dds"
      ]
    };

    expect(
      Array.from(
        resolveCreatureTextureDeliveryUrlsByReference(
          payload,
          "http://localhost:3000"
        ).entries()
      )
    ).toEqual([
      [
        "pfh2_rfoot004",
        "http://localhost:3000/api/v1/catalog/placeables/cache/creature-cache-key/assets/pfh2_rfoot004.plt?etag=1"
      ],
      [
        "pfh2_rfoot004_d",
        "http://localhost:3000/api/v1/catalog/placeables/cache/creature-cache-key/assets/pfh2_rfoot004_d.dds"
      ]
    ]);
  });

  it("routes creature texture bindings with asset ids through the cache delivery endpoint", () => {
    const originalLocation = globalThis.location;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: new URL("http://127.0.0.1:5173/app")
    });
    const payload = createCreatureViewportPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureBindings: [
        {
          reference: "c2_batgia_b01",
          assetId: "asset-diffuse-dds",
          fileName: "c2_batgia_b01.dds",
          objectKey: "modules/current/__aurora/sources/hak/cep3_core1/c2_batgia_b01.dds",
          deliveryUrl:
            "http://127.0.0.1:8888/buckets/aurora-module-assets/modules/current/__aurora/sources/hak/cep3_core1/c2_batgia_b01.dds"
        }
      ]
    };

    try {
      expect(
        Array.from(resolveCreatureTextureDeliveryUrlsByReference(payload).entries())
      ).toEqual([
        [
          "c2_batgia_b01",
          "http://127.0.0.1:5173/_aurora/v1/catalog/placeables/cache/creature-cache-key/assets/asset-diffuse-dds.dds"
        ]
      ]);
    } finally {
      Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: originalLocation
      });
    }
  });
});
