import { describe, expect, it } from "vitest";
import {
  applyItemApiProcessResultToSceneObject,
  compareItemSceneObjectsByAuroraStorePanel,
  mapItemApiBaseItemToSceneObject,
  mapItemApiListItemToSceneObject
} from "../../../../src/modules/items/application/itemSceneObjectMapper";
import { resolveItemTextureDeliveryUrlsByReference } from "../../../../src/modules/items/application/itemRenderAssetResolver";

describe("itemSceneObjectMapper", () => {
  it("maps backend UTI catalog metadata into a scene item object", () => {
    const object = mapItemApiListItemToSceneObject(
      {
        templateId: "item_nw_wswm001",
        resref: "nw_wswm001",
        name: "Longsword",
        category: "Weapons",
        tags: ["weapon"],
        previewImageUrl: "",
        metadata: {
          templateResRef: "nw_wswm001",
          localizedName: "Retail Longsword",
          localizedNameStrRef: 12840,
          tag: "longsword_tag",
          description: "Retail description",
          descriptionStrRef: 2001,
          identifiedDescription: "Retail identified",
          identifiedDescriptionStrRef: 2002,
          baseItem: 6,
          baseItem2daLabel: "Longsword",
          baseItem2daItemClass: "wswls",
          baseItemDefaultIcon: "iiw_sword",
          baseItemInvSlotWidth: 1,
          baseItemInvSlotHeight: 3,
          baseItemEquipableSlots: "0x10",
          baseItemBaseCost: 15,
          baseItemStacking: 1,
          baseItemItemMultiplier: 1,
          baseItemMaxProps: 8,
          baseItemMinProps: 0,
          baseItemPropColumn: "Weapon",
          baseItemStorePanel: 1,
          baseItemStorePanelSort: 6,
          baseItemModelType: "WSwLs",
          modelPart1: 2,
          modelPart2: 1,
          modelPart3: 3,
          bodyPartTorso: 43,
          armorPartCostModifierTorso: 4,
          armorPartCostModifierTotal: 4,
          armorPartCostModifierResolvedCount: 1,
          cost: 1648,
          stackSize: 1,
          identified: true,
          leather1Color: 12,
          metal1Color: 16,
          itemPropertyListEntries: JSON.stringify([
            {
              propertyName: 15,
              propertyLabel: "CastSpell",
              subtype: 66,
              subTypeTable: "iprp_spells",
              costTable: 3,
              costValue: 1,
              chanceAppear: 100,
              costTableDefinition: "iprp_chargecost",
              param1Table: "iprp_paramtable",
              propertyDefinitionSource2daRow: 15,
              propertyDefinitionSourceKey:
                "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da",
              nameStrRef: 1234,
              gameStrRef: 4321,
              descriptionStrRef: 4322
            }
          ])
        }
      },
      5
    );

    expect(object.kind).toBe("items");
    expect(object.id).toBe("itm_template_item_nw_wswm001");
    expect(object.resRef).toBe("nw_wswm001");
    expect(object.tag).toBe("LONGSWORD_TAG");
    expect(object.source).toMatchObject({
      type: "aurora_git",
      sourceKind: "item",
      templateId: "item_nw_wswm001"
    });
    expect(object.itemProperties).toMatchObject({
      localizedName: "Retail Longsword",
      localizedNameStrRef: 12840,
      description: "Retail description",
      descriptionStrRef: 2001,
      identifiedDescription: "Retail identified",
      identifiedDescriptionStrRef: 2002,
      baseItem: 6,
      baseItemLabel: "Longsword",
      baseItemItemClass: "wswls",
      baseItemDefaultIcon: "iiw_sword",
      baseItemInvSlotWidth: 1,
      baseItemInvSlotHeight: 3,
      baseItemEquipableSlots: "0x10",
      baseItemBaseCost: 15,
      baseItemStorePanel: 1,
      baseItemStorePanelSort: 6,
      baseItemModelType: "WSwLs",
      modelParts: [2, 1, 3],
      armorParts: {
        torso: 43
      },
      armorPartCostModifiers: {
        torso: 4
      },
      armorPartCostModifierTotal: 4,
      armorPartCostModifierResolvedCount: 1,
      cost: 1648,
      stackSize: 1,
      identified: true,
      materialColors: {
        leather1: 12,
        metal1: 16
      },
      propertyList: [
        {
          propertyName: 15,
          propertyLabel: "CastSpell",
          subtype: 66,
          subTypeTable: "iprp_spells",
          costTable: 3,
          costValue: 1,
          chanceAppear: 100,
          costTableDefinition: "iprp_chargecost",
          param1Table: "iprp_paramtable",
          propertyDefinitionSource2daRow: 15,
          propertyDefinitionSourceKey:
            "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da",
          nameStrRef: 1234,
          gameStrRef: 4321,
          descriptionStrRef: 4322
        }
      ]
    });
  });

  it("maps baseitems.2da rows into virtual item type templates for the wizard", () => {
    const object = mapItemApiBaseItemToSceneObject({
      baseItem: 0,
      sourceKey: "baseitems.2da",
      label: "shortsword",
      itemClass: "wswss",
      modelType: "wswss",
      defaultIcon: "iwswss",
      invSlotWidth: 1,
      invSlotHeight: 2,
      equipableSlots: "0x1C030",
      baseCost: 10,
      storePanel: 1,
      storePanelSort: 19,
      reqFeats: [45, 50]
    });

    expect(object).toMatchObject({
      id: "itm_baseitem_0",
      kind: "items",
      name: "shortsword",
      resRef: "shortsword",
      tag: "BASEITEM_0",
      source: {
        type: "aurora_git",
        sourceObjectId: "baseitems.2da:0",
        templateId: "baseitem_0",
        sourceFileType: "2DA"
      },
      itemProperties: {
        baseItem: 0,
        baseItemLabel: "shortsword",
        baseItemItemClass: "wswss",
        baseItemModelType: "wswss",
        baseItemDefaultIcon: "iwswss",
        baseItemInvSlotWidth: 1,
        baseItemInvSlotHeight: 2,
        baseItemEquipableSlots: "0x1C030",
        baseItemBaseCost: 10,
        baseItemStorePanel: 1,
        baseItemStorePanelSort: 19,
        baseItemReqFeats: [45, 50]
      }
    });
  });

  it("orders item scene objects by Aurora baseitems StorePanel metadata", () => {
    const armor = mapItemApiBaseItemToSceneObject({
      baseItem: 16,
      sourceKey: "baseitems.2da",
      label: "armor",
      storePanel: 2,
      storePanelSort: 1
    });
    const dagger = mapItemApiBaseItemToSceneObject({
      baseItem: 22,
      sourceKey: "baseitems.2da",
      label: "dagger",
      storePanel: 1,
      storePanelSort: 20
    });
    const longsword = mapItemApiBaseItemToSceneObject({
      baseItem: 6,
      sourceKey: "baseitems.2da",
      label: "longsword",
      storePanel: 1,
      storePanelSort: 6
    });
    const unknown = mapItemApiBaseItemToSceneObject({
      baseItem: 999,
      sourceKey: "baseitems.2da",
      label: "zzz_custom"
    });

    expect(
      [unknown, armor, dagger, longsword]
        .sort(compareItemSceneObjectsByAuroraStorePanel)
        .map((object) => object.itemProperties?.baseItemLabel)
    ).toEqual(["longsword", "dagger", "armor", "zzz_custom"]);
  });

  it("applies processed item model part asset candidates to the scene object", () => {
    const object = mapItemApiListItemToSceneObject({
      templateId: "item_cnr_b_dagger",
      resref: "cnr_b_dagger",
      name: "Bronze Dagger",
      category: "Weapons",
      tags: ["weapon"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "cnr_b_dagger",
        baseItem: 22,
        baseItemModelType: "wswdg",
        modelPart1: 11,
        modelPart2: 13,
        modelPart3: 63
      }
    });

    const processed = applyItemApiProcessResultToSceneObject(object, {
      cache: {
        key: "cache_item_dagger",
        hit: false,
        storedAt: "2026-06-29T10:00:00.000Z",
        hits: 0
      },
      item: {
        templateId: "item_cnr_b_dagger",
        kind: "item",
        resref: "cnr_b_dagger",
        name: "Bronze Dagger",
        category: "Weapons",
        benchmarkCandidate: false,
        metadata: {
          baseItemModelType: "wswdg"
        },
        render: {
          backendType: "item",
          frontendType: "item",
          rendererPreset: "item-standard"
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-06-29T10:00:00.000Z",
                assetCount: 2,
                candidatesScanned: 2,
                assets: [
                  {
                    assetId: "asset-wswdg-b",
              role: "model",
              fileName: "wswdg_b_011.glb",
              objectKey: "modules/current/__aurora/derived/models/wswdg_b_011.glb",
                    extension: "glb",
                    sizeBytes: 4808,
                    contentType: "model/gltf-binary"
                  },
                  {
                    assetId: "asset-wrap-brown",
                    role: "texture",
                    fileName: "ad_wrap_brown.tga",
                    objectKey: "modules/current/__aurora/sources/hak/cep3_reforge/ad_wrap_brown.tga",
                    extension: "tga",
                    sizeBytes: 1024,
                    contentType: "image/x-tga"
                  }
                ]
              },
        itemRuntime: {
          visual: {
            baseItemModelType: "wswdg",
            modelPart1: 11,
            modelPart2: 13,
            modelPart3: 63,
            modelParts: [11, 13, 63],
            modelPartResRefs: ["wswdg_b_011", "wswdg_m_013", "wswdg_t_063"],
            modelPartResRefRoles: ["blade", "middle", "top"]
          }
        },
        itemValidationIssues: [],
        processedAt: "2026-06-29T10:00:00.000Z"
      }
    });

    expect(processed.itemProperties?.modelPartResRefs).toEqual([
      "wswdg_b_011",
      "wswdg_m_013",
      "wswdg_t_063"
    ]);
    expect(processed.itemProperties?.modelPartCandidates).toEqual([
      expect.objectContaining({
        resRef: "wswdg_b_011",
        role: "blade",
        partId: 11,
        assetId: "asset-wswdg-b",
        glbUrl:
          "/api/v1/catalog/placeables/cache/cache_item_dagger/assets/asset-wswdg-b.glb"
      }),
      expect.objectContaining({
        resRef: "wswdg_m_013",
        role: "middle",
        partId: 13
      }),
      expect.objectContaining({
        resRef: "wswdg_t_063",
        role: "top",
        partId: 63
      })
    ]);
    expect(processed.itemProperties?.modelAssetCandidates).toEqual([
      expect.objectContaining({
        assetId: "asset-wswdg-b",
        role: "model",
        reference: "wswdg_b_011",
        sizeBytes: 4808,
        assetUrl:
          "/api/v1/catalog/placeables/cache/cache_item_dagger/assets/asset-wswdg-b.glb"
      }),
      expect.objectContaining({
        assetId: "asset-wrap-brown",
        role: "texture",
        reference: "ad_wrap_brown",
        assetUrl:
          "/api/v1/catalog/placeables/cache/cache_item_dagger/assets/asset-wrap-brown.tga"
      })
    ]);

    expect(
      Array.from(
        resolveItemTextureDeliveryUrlsByReference(
          processed,
          "https://aurora.test"
        ).entries()
      )
    ).toEqual([
      [
        "ad_wrap_brown",
        "https://aurora.test/api/v1/catalog/placeables/cache/cache_item_dagger/assets/asset-wrap-brown.tga"
      ]
    ]);
  });

  it("uses sibling model part assets as fallbacks for missing multipart item pieces", () => {
    const object = mapItemApiListItemToSceneObject({
      templateId: "itm_test_sierp",
      resref: "test_sierp",
      name: "TEST_SIERP",
      category: "Weapons",
      tags: ["weapon"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "test_sierp",
        baseItem: 60,
        baseItemModelType: "wspsc",
        modelPart1: 11,
        modelPart2: 10,
        modelPart3: 11
      }
    });

    const processed = applyItemApiProcessResultToSceneObject(object, {
      cache: {
        key: "cache_item_sickle",
        hit: false,
        storedAt: "2026-07-01T10:00:00.000Z",
        hits: 0
      },
      item: {
        templateId: "itm_test_sierp",
        kind: "item",
        resref: "test_sierp",
        name: "TEST_SIERP",
        category: "Weapons",
        benchmarkCandidate: false,
        metadata: {
          baseItemModelType: "wspsc"
        },
        render: {
          backendType: "item",
          frontendType: "item",
          rendererPreset: "item-standard"
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-07-01T10:00:00.000Z",
          assetCount: 3,
          candidatesScanned: 3,
          assets: [
            {
              assetId: "asset-wspsc-b",
              role: "model",
              fileName: "wspsc_b_011.glb",
              objectKey: "modules/current/__aurora/derived/models/wspsc_b_011.glb",
              extension: "glb",
              sizeBytes: 4808,
              contentType: "model/gltf-binary"
            },
            {
              assetId: "asset-wspsc-m-fallback",
              role: "model",
              fileName: "wspsc_m_011.glb",
              objectKey: "modules/current/__aurora/derived/models/wspsc_m_011.glb",
              extension: "glb",
              sizeBytes: 4808,
              contentType: "model/gltf-binary"
            },
            {
              assetId: "asset-wspsc-t",
              role: "model",
              fileName: "wspsc_t_011.glb",
              objectKey: "modules/current/__aurora/derived/models/wspsc_t_011.glb",
              extension: "glb",
              sizeBytes: 4808,
              contentType: "model/gltf-binary"
            }
          ]
        },
        itemRuntime: {
          visual: {
            baseItemModelType: "wspsc",
            modelPart1: 11,
            modelPart2: 10,
            modelPart3: 11,
            modelParts: [11, 10, 11],
            modelPartResRefs: ["wspsc_b_011", "wspsc_m_010", "wspsc_t_011"],
            modelPartResRefRoles: ["blade", "middle", "top"]
          }
        },
        itemValidationIssues: [],
        processedAt: "2026-07-01T10:00:00.000Z"
      }
    });

    expect(processed.itemProperties?.modelPartResRefs).toEqual([
      "wspsc_b_011",
      "wspsc_m_010",
      "wspsc_t_011"
    ]);
    expect(processed.itemProperties?.modelPartCandidates?.[1]).toMatchObject({
      resRef: "wspsc_m_011",
      role: "middle",
      partId: 10,
      assetId: "asset-wspsc-m-fallback",
      glbUrl:
        "/api/v1/catalog/placeables/cache/cache_item_sickle/assets/asset-wspsc-m-fallback.glb"
    });
  });

  it("preserves cloakmodel runtime refs and asset candidates", () => {
    const object = mapItemApiListItemToSceneObject({
      templateId: "itm_cloak_arcane",
      resref: "cloak_arcane",
      name: "Arcane Cloak",
      category: "Armor",
      tags: ["cloak"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "cloak_arcane",
        baseItem: 80,
        baseItemModelType: "cloak",
        modelPart1: 2
      }
    });

    const processed = applyItemApiProcessResultToSceneObject(object, {
      cache: {
        key: "cache_item_cloak",
        hit: false,
        storedAt: "2026-07-01T10:00:00.000Z",
        hits: 0
      },
      item: {
        templateId: "itm_cloak_arcane",
        kind: "item",
        resref: "cloak_arcane",
        name: "Arcane Cloak",
        category: "Armor",
        benchmarkCandidate: false,
        metadata: {
          baseItem: 80,
          baseItemModelType: "cloak",
          cloakHiddenSlots: "wing|rShoul"
        },
        render: {
          backendType: "item",
          frontendType: "item",
          rendererPreset: "item-standard"
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-07-01T10:00:00.000Z",
          assetCount: 2,
          candidatesScanned: 2,
          assets: [
            {
              assetId: "asset-cloak-glb",
              role: "model",
              fileName: "pmh0_cloak_001.glb",
              objectKey: "modules/current/__aurora/derived/models/pmh0_cloak_001.glb",
              extension: "glb",
              sizeBytes: 4096,
              contentType: "model/gltf-binary"
            },
            {
              assetId: "asset-cloak-texture",
              role: "texture",
              fileName: "pmh0_cloak_010.tga",
              objectKey: "modules/current/__aurora/sources/hak/lc_textures/pmh0_cloak_010.tga",
              extension: "tga",
              sizeBytes: 1024,
              contentType: "image/x-tga"
            }
          ]
        },
        itemRuntime: {
          visual: {
            baseItemModelType: "cloak",
            modelPart1: 2,
            modelParts: [2],
            modelPartResRefs: ["pmh0_cloak_001"],
            modelPartResRefRoles: ["cloak"],
            cloakModelRow: 2,
            cloakModel: 1,
            cloakTexture: 10,
            cloakIcon: 2,
            cloakModelResRef: "pmh0_cloak_001",
            cloakTextureResRef: "pmh0_cloak_010",
            cloakIconResRef: "icloak_m_002",
            cloakHiddenSlots: ["wing", "rShoul"]
          }
        },
        itemValidationIssues: [],
        processedAt: "2026-07-01T10:00:00.000Z"
      }
    });

    expect(processed.itemProperties).toMatchObject({
      modelPartResRefs: ["pmh0_cloak_001"],
      modelPartResRefRoles: ["cloak"],
      cloakModelRow: 2,
      cloakModel: 1,
      cloakTexture: 10,
      cloakIcon: 2,
      cloakModelResRef: "pmh0_cloak_001",
      cloakTextureResRef: "pmh0_cloak_010",
      cloakIconResRef: "icloak_m_002",
      cloakHiddenSlots: ["wing", "rShoul"]
    });
    expect(processed.itemProperties?.modelPartCandidates).toEqual([
      expect.objectContaining({
        resRef: "pmh0_cloak_001",
        role: "cloak",
        partId: 2,
        assetId: "asset-cloak-glb",
        glbUrl:
          "/api/v1/catalog/placeables/cache/cache_item_cloak/assets/asset-cloak-glb.glb"
      })
    ]);
  });

  it("applies processed armor body-part asset candidates to the scene object", () => {
    const object = mapItemApiListItemToSceneObject({
      templateId: "itm_aarcl009",
      resref: "aarcl009",
      name: "Hide Armor",
      category: "Armor",
      tags: ["armor"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "aarcl009",
        baseItem: 16,
        bodyPartTorso: 43
      }
    });

    const processed = applyItemApiProcessResultToSceneObject(object, {
      cache: {
        key: "cache_item_armor",
        hit: false,
        storedAt: "2026-06-29T10:00:00.000Z",
        hits: 0
      },
      item: {
        templateId: "itm_aarcl009",
        kind: "item",
        resref: "aarcl009",
        name: "Hide Armor",
        category: "Armor",
        benchmarkCandidate: false,
        metadata: {
          baseItem: 16
        },
        render: {
          backendType: "item",
          frontendType: "item",
          rendererPreset: "item-standard"
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-06-29T10:00:00.000Z",
          assetCount: 1,
          candidatesScanned: 1,
          assets: [
            {
              assetId: "asset-pmh0-chest",
              role: "model",
              fileName: "pmh0_chest043.glb",
              objectKey: "modules/current/__aurora/derived/models/pmh0_chest043.glb",
              extension: "glb",
              sizeBytes: 4096,
              contentType: "model/gltf-binary"
            }
          ]
        },
        itemRuntime: {
          visual: {
            armorParts: {
              torso: 43
            },
            materialColors: {
              leather1: 12,
              metal2: 21
            },
            armorPartModelCandidates: [
              {
                slot: "torso",
                partId: 43,
                partModelName: "chest",
                nodeName: "torso_g",
                modelPrefix: "pmh0_",
                modelResRef: "pmh0_chest043"
              }
            ]
          }
        },
        itemValidationIssues: [],
        processedAt: "2026-06-29T10:00:00.000Z"
      }
    });

    expect(processed.itemProperties?.armorParts).toEqual({
      torso: 43
    });
    expect(processed.itemProperties?.materialColors).toEqual({
      leather1: 12,
      metal2: 21
    });
    expect(processed.itemProperties?.armorPartModelCandidates).toEqual([
      expect.objectContaining({
        slot: "torso",
        partId: 43,
        partModelName: "chest",
        nodeName: "torso_g",
        modelPrefix: "pmh0_",
        modelResRef: "pmh0_chest043",
        assetId: "asset-pmh0-chest",
        glbUrl:
          "/api/v1/catalog/placeables/cache/cache_item_armor/assets/asset-pmh0-chest.glb"
      })
    ]);
  });

  it("uses armor preview context prefixes for armor fallback model assets", () => {
    const object = mapItemApiListItemToSceneObject({
      templateId: "itm_context_armor",
      resref: "context_armor",
      name: "Context Armor",
      category: "Armor",
      tags: ["armor"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "context_armor",
        baseItem: 16,
        bodyPartTorso: 43
      }
    });

    const processed = applyItemApiProcessResultToSceneObject(object, {
      cache: {
        key: "cache_item_context_armor",
        hit: false,
        storedAt: "2026-07-01T10:00:00.000Z",
        hits: 0
      },
      item: {
        templateId: "itm_context_armor",
        kind: "item",
        resref: "context_armor",
        name: "Context Armor",
        category: "Armor",
        benchmarkCandidate: false,
        metadata: {
          baseItem: 16
        },
        render: {
          backendType: "item",
          frontendType: "item",
          rendererPreset: "item-standard"
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-07-01T10:00:00.000Z",
          assetCount: 1,
          candidatesScanned: 1,
          assets: [
            {
              assetId: "asset-pfh2-chest-fallback",
              role: "model",
              fileName: "pfh2_chest001.glb",
              objectKey: "modules/current/__aurora/derived/models/pfh2_chest001.glb",
              extension: "glb",
              sizeBytes: 4096,
              contentType: "model/gltf-binary"
            }
          ]
        },
        itemRuntime: {
          visual: {
            armorPreviewContext: {
              modelPrefix: "pfh2_",
              sourceKey: "item-armor-preview.human-female-phenotype2.ArmorPart",
              label: "human-female-phenotype2",
              gender: 1,
              phenotype: 2,
              raceModel: "human"
            },
            armorParts: {
              torso: 43
            },
            armorPartModelCandidates: [
              {
                slot: "torso",
                partId: 43,
                partModelName: "chest",
                nodeName: "torso_g",
                modelPrefix: "pfh2_",
                modelResRef: "pfh2_chest043"
              }
            ]
          }
        },
        itemValidationIssues: [],
        processedAt: "2026-07-01T10:00:00.000Z"
      }
    });

    expect(processed.itemProperties?.armorPreviewContext).toEqual({
      modelPrefix: "pfh2_",
      sourceKey: "item-armor-preview.human-female-phenotype2.ArmorPart",
      label: "human-female-phenotype2",
      gender: 1,
      phenotype: 2,
      raceModel: "human"
    });
    expect(processed.itemProperties?.armorPartModelCandidates).toEqual([
      expect.objectContaining({
        slot: "torso",
        partId: 43,
        modelPrefix: "pfh2_",
        modelResRef: "pfh2_chest001",
        assetId: "asset-pfh2-chest-fallback",
        glbUrl:
          "/api/v1/catalog/placeables/cache/cache_item_context_armor/assets/asset-pfh2-chest-fallback.glb"
      })
    ]);
  });

  it("preserves robe hide masks from processed item runtime", () => {
    const object = mapItemApiListItemToSceneObject({
      templateId: "itm_robe_armor",
      resref: "robe_armor",
      name: "Robe Armor",
      category: "Armor",
      tags: ["armor"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "robe_armor",
        baseItem: 16,
        bodyPartTorso: 43,
        bodyPartRobe: 5
      }
    });

    const processed = applyItemApiProcessResultToSceneObject(object, {
      cache: {
        key: "cache_item_robe_armor",
        hit: false,
        storedAt: "2026-07-01T10:00:00.000Z",
        hits: 0
      },
      item: {
        templateId: "itm_robe_armor",
        kind: "item",
        resref: "robe_armor",
        name: "Robe Armor",
        category: "Armor",
        benchmarkCandidate: false,
        metadata: {
          baseItem: 16,
          armorRobeHiddenSlots: "torso|pelvis"
        },
        render: {
          backendType: "item",
          frontendType: "item",
          rendererPreset: "item-standard"
        },
        itemRuntime: {
          visual: {
            armorParts: {
              torso: 43,
              robe: 5
            },
            armorRobeHiddenSlots: ["torso", "pelvis"],
            armorPartModelCandidates: [
              {
                slot: "robe",
                partId: 5,
                partModelName: "robe",
                modelPrefix: "pmh0_",
                modelResRef: "pmh0_robe005"
              }
            ]
          }
        },
        itemValidationIssues: [],
        processedAt: "2026-07-01T10:00:00.000Z"
      }
    });

    expect(processed.itemProperties?.armorRobeHiddenSlots).toEqual(["torso", "pelvis"]);
    expect(processed.itemProperties?.armorPartModelCandidates).toEqual([
      expect.objectContaining({
        slot: "robe",
        modelResRef: "pmh0_robe005"
      })
    ]);
  });
});
