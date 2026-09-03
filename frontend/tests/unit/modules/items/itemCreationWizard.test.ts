import { describe, expect, it } from "vitest";
import type { SceneObject } from "../../../../src/modules/layout/contracts";
import {
  buildItemBlueprintCreatePayloadFromWizardSceneObject,
  buildItemVisualOverrideFromSceneObjectItem,
  createItemSceneObjectFromWizardDraft,
  createItemWizardDraft,
  mergeProcessedItemWizardSceneObject,
  resolveItemCreationBaseOptions,
  resolveItemCreationPropertyOptions,
  resolveItemCreationVisualMode,
  validateItemCreationDraft
} from "../../../../src/modules/items/application/itemCreationWizard";

function buildItemTemplate(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: "itm_template_item_nw_maarcl009",
    kind: "items",
    name: "Hide Armor",
    resRef: "nw_maarcl009",
    tag: "NW_MAARCL009",
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceObjectId: "item_nw_maarcl009",
      templateId: "item_nw_maarcl009"
    },
    x: 0.5,
    y: 0.5,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    itemProperties: {
      localizedName: "Hide Armor",
      description: "Base armor",
      identifiedDescription: "Identified base armor",
      baseItem: 16,
      baseItemLabel: "Armor",
      baseItemModelType: "AArCl",
      baseItemDefaultModel: "0",
      cost: 19463,
      stackSize: 1,
      charges: 0,
      identified: true,
      armorParts: {
        rFoot: 4,
        lFoot: 4,
        pelvis: 8,
        torso: 43,
        rShoul: 15,
        lShoul: 15
      },
      materialColors: {
        leather1: 5,
        leather2: 7,
        cloth1: 2,
        cloth2: 3,
        metal1: 17,
        metal2: 8
      },
      propertyList: [
        {
          propertyName: 15,
          propertyLabel: "CastSpell",
          subtype: 66,
          subTypeTable: "iprp_spells",
          costTable: 3,
          costValue: 1,
          costTableDefinition: "iprp_chargecost",
          chanceAppear: 100
        }
      ]
    },
    ...overrides
  };
}

describe("itemCreationWizard", () => {
  it("resolves Aurora base item choices from loaded item templates", () => {
    const armor = buildItemTemplate();
    const dagger = buildItemTemplate({
      id: "itm_template_item_cnr_b_dagger",
      name: "Bronze Dagger",
      resRef: "cnr_b_dagger",
      tag: "CNR_B_DAGGER",
      itemProperties: {
        baseItem: 22,
        baseItemLabel: "Dagger",
        baseItemModelType: "WSwDg",
        baseItemDefaultModel: "0",
        modelPart1: 11,
        modelPart2: 13,
        modelPart3: 63,
        modelParts: [11, 13, 63]
      }
    });

    expect(resolveItemCreationBaseOptions([dagger, armor])).toEqual([
      expect.objectContaining({
        baseObjectId: armor.id,
        baseItem: 16,
        label: "Armor",
        modelType: "AArCl"
      }),
      expect.objectContaining({
        baseObjectId: dagger.id,
        baseItem: 22,
        label: "Dagger",
        modelType: "WSwDg"
      })
    ]);
    expect(resolveItemCreationVisualMode(armor)).toBe("armor");
    expect(resolveItemCreationVisualMode(dagger)).toBe("threePart");
    expect(resolveItemCreationPropertyOptions([armor])).toEqual([
      expect.objectContaining({
        propertyName: 15,
        label: "CastSpell",
        subTypeTable: "iprp_spells",
        costTableDefinition: "iprp_chargecost",
        sampleSubtype: 66,
        sampleCostTable: 3,
        sampleCostValue: 1
      })
    ]);
    expect(
      resolveItemCreationVisualMode(
        buildItemTemplate({
          itemProperties: {
            baseItem: 57,
            baseItemLabel: "Tower Shield",
            baseItemModelType: "AShTo",
            modelPart1: 95,
            modelParts: [95]
          }
        })
      )
    ).toBe("singlePart");
    expect(
      resolveItemCreationVisualMode(
        buildItemTemplate({
          itemProperties: {
            baseItem: 1,
            baseItemLabel: "Longsword",
            baseItemModelType: "wswls",
            baseItemItemClass: "wswls"
          }
        })
      )
    ).toBe("threePart");
  });

  it("merges backend IPRP dictionary choices into item property options", () => {
    const armor = buildItemTemplate();
    const options = resolveItemCreationPropertyOptions([armor], [
      {
        propertyName: 15,
        label: "CastSpell",
        propertyLabel: "CastSpell",
        subTypeTable: "iprp_spells",
        costTableIndex: 3,
        costTableLabel: "SpellUse",
        costTableDefinition: "iprp_chargecost",
        subtypeOptions: [
          {
            rowId: 66,
            label: "Cure_Light_Wounds",
            spellIndex: 32,
            icon: "iss_curlgtw",
            sourceKey: "iprp_spells.2da"
          }
        ],
        costValueOptions: [
          {
            rowId: 1,
            label: "Single_Use",
            cost: 0.1334,
            potionCost: 1,
            wandCost: 1,
            sourceKey: "iprp_chargecost.2da"
          }
        ],
        param1Options: []
      }
    ]);

    expect(options).toEqual([
      expect.objectContaining({
        propertyName: 15,
        label: "CastSpell",
        sampleSubtype: 66,
        sampleCostTable: 3,
        sampleCostValue: 1,
        costTableLabel: "SpellUse",
        costTableDefinition: "iprp_chargecost",
        subtypeOptions: [
          expect.objectContaining({
            value: 66,
            label: expect.stringContaining("Cure_Light_Wounds")
          })
        ],
        costValueOptions: [
          expect.objectContaining({
            value: 1,
            label: expect.stringContaining("Single_Use"),
            potionCost: 1,
            wandCost: 1
          })
        ]
      })
    ]);
  });

  it("creates a wizard item blueprint with UTI-style identity, armor parts, colors and properties", () => {
    const baseObject = buildItemTemplate();
    const draft = createItemWizardDraft(baseObject, 394);
    draft.name = "Custom Hide Armor";
    draft.resRef = "custom hide armor";
    draft.tag = "custom hide armor";
    draft.description = "Draft description";
    draft.identifiedDescription = "Identified draft";
    draft.armorContext = {
      modelPrefix: "pfh2_",
      label: "human-female-phenotype2",
      gender: "1",
      phenotype: "2",
      raceModel: "human"
    };
    draft.armorParts.torso = "44";
    draft.armorParts.pelvis = "9";
    draft.materialColors.leather1 = "12";
    draft.materialColors.metal1 = "18";
    draft.stackSize = "1";
    draft.charges = "0";
    draft.addCost = "250";
    draft.identified = true;
    draft.plot = true;
    draft.propertyList = [
      {
        propertyName: "15",
        propertyLabel: "CastSpell",
        subtype: "66",
        costTable: "3",
        costValue: "1",
        param1: "",
        param1Value: "",
        chanceAppear: "100",
        subTypeTable: "iprp_spells",
        costTableDefinition: "iprp_chargecost"
      }
    ];

    const created = createItemSceneObjectFromWizardDraft(draft, baseObject, 394, [
      {
        propertyName: 15,
        label: "CastSpell",
        propertyLabel: "CastSpell",
        subtypeOptions: [{ value: 66, label: "Cure Light Wounds", cost: 4500 }],
        costValueOptions: [{ value: 1, label: "Single Use", cost: 2 }],
        param1Options: []
      }
    ]);

    expect(created.id).toBe("itm_wizard_custom_hide_armo_394");
    expect(created.name).toBe("Custom Hide Armor");
    expect(created.resRef).toBe("custom_hide_armo");
    expect(created.tag).toBe("CUSTOM_HIDE_ARMOR");
    expect(created.source).toMatchObject({
      type: "aurora_git",
      sourceKind: "item",
      templateId: "item_nw_maarcl009",
      sourceModelResRef: "nw_maarcl009",
      localizedName: "Custom Hide Armor"
    });
    expect(created.itemProperties).toMatchObject({
      localizedName: "Custom Hide Armor",
      description: "Draft description",
      identifiedDescription: "Identified draft",
      baseItem: 16,
      baseItemLabel: "Armor",
      addCost: 250,
      cost: 9250,
      identified: true,
      plot: true,
      armorPreviewContext: {
        modelPrefix: "pfh2_",
        label: "human-female-phenotype2",
        gender: 1,
        phenotype: 2,
        raceModel: "human"
      },
      armorParts: {
        torso: 44,
        pelvis: 9
      },
      materialColors: {
        leather1: 12,
        metal1: 18
      },
      propertyList: [
        {
          propertyName: 15,
          propertyLabel: "CastSpell",
          subtype: 66,
          subTypeTable: "iprp_spells",
          costTable: 3,
          costValue: 1,
          costTableDefinition: "iprp_chargecost",
          chanceAppear: 100
        }
      ]
    });
    expect(buildItemVisualOverrideFromSceneObjectItem(created)).toMatchObject({
      armorContext: {
        modelPrefix: "pfh2_",
        label: "human-female-phenotype2",
        gender: 1,
        phenotype: 2,
        raceModel: "human"
      },
      armorParts: expect.objectContaining({
        torso: 44,
        pelvis: 9
      }),
      materialColors: expect.objectContaining({
        leather1: 12,
        metal1: 18
      })
    });
    const createdWithScripts = {
      ...created,
      name: "Internal Scene Label",
      itemProperties: {
        ...created.itemProperties,
        localizedNameStrRef: 12840,
        descriptionStrRef: 2001,
        identifiedDescriptionStrRef: 2002,
        scripts: {
          onused: "itm_on_use",
          OnHeartbeat: "itm_heartbeat",
          oninventorydisturbed: "itm_inv_dist"
        },
        variables: [
          { name: " duplicate ", type: "int" as const, value: -7 },
          { name: "duplicate", type: "float" as const, value: Math.fround(1.25) },
          { name: "duplicate", type: "string" as const, value: " exact value " }
        ],
        blueprintInventoryItems: [
          { resRef: "itm_potion", x: 3, y: 4 },
          { resRef: "itm_scroll", x: 5, y: 6 }
        ],
        blueprintEquippedItems: [{ resRef: "itm_ring", slotMask: 4 }]
      }
    };
    expect(buildItemBlueprintCreatePayloadFromWizardSceneObject(createdWithScripts)).toMatchObject({
      templateResRef: "custom_hide_armo",
      name: "Custom Hide Armor",
      localizedNameStrRef: 12840,
      tag: "CUSTOM_HIDE_ARMOR",
      description: "Draft description",
      descriptionStrRef: 2001,
      identifiedDescription: "Identified draft",
      identifiedDescriptionStrRef: 2002,
      baseItem: 16,
      cost: 9250,
      addCost: 250,
      stackSize: 1,
      charges: 0,
      identified: true,
      plot: true,
      overwrite: false,
      armorContext: {
        modelPrefix: "pfh2_",
        label: "human-female-phenotype2",
        gender: 1,
        phenotype: 2,
        raceModel: "human"
      },
      armorParts: expect.objectContaining({
        torso: 44,
        pelvis: 9
      }),
      materialColors: expect.objectContaining({
        leather1: 12,
        metal1: 18
      }),
      propertyList: [
        {
          propertyName: 15,
          subtype: 66,
          costTable: 3,
          costValue: 1,
          chanceAppear: 100
        }
      ],
      variableListEntries: [
        { name: " duplicate ", type: "int", value: -7 },
        { name: "duplicate", type: "float", value: 1.25 },
        { name: "duplicate", type: "string", value: " exact value " }
      ],
      inventoryItemListEntries: [
        { resRef: "itm_potion", x: 3, y: 4 },
        { resRef: "itm_scroll", x: 5, y: 6 }
      ],
      equipItemListEntries: [{ resRef: "itm_ring", slotMask: 4 }]
    });
    const strictPayload = buildItemBlueprintCreatePayloadFromWizardSceneObject(createdWithScripts);
    expect(strictPayload).not.toHaveProperty("costTable");
    expect(strictPayload).not.toHaveProperty("costValue");
    expect(strictPayload).not.toHaveProperty("scripts");
    expect(
      buildItemBlueprintCreatePayloadFromWizardSceneObject(created, { overwrite: true })
    ).toMatchObject({
      templateResRef: "custom_hide_armo",
      overwrite: true
    });

    expect(buildItemBlueprintCreatePayloadFromWizardSceneObject({
      ...created,
      itemProperties: {
        ...created.itemProperties,
        variables: [{ name: "Float", type: "float", value: 0.1 }],
      },
    })).toBeNull();
    expect(buildItemBlueprintCreatePayloadFromWizardSceneObject({
      ...created,
      itemProperties: {
        ...created.itemProperties,
        blueprintInventoryItems: [{ resRef: "ITM_UPPER", x: 0, y: 0 }],
      },
    })).toBeNull();
  });

  it("serializes OnHit with Aurora-forced cost table 24", () => {
    const baseObject = buildItemTemplate();
    const draft = createItemWizardDraft(baseObject, 394);
    draft.propertyList = [
      {
        propertyName: "48",
        propertyLabel: "OnHit",
        subtype: "3",
        costTable: "",
        costValue: "1",
        param1: "",
        param1Value: "",
        chanceAppear: "100",
        subTypeTable: "iprp_onhit"
      }
    ];

    const created = createItemSceneObjectFromWizardDraft(draft, baseObject, 394);

    expect(created.itemProperties?.propertyList).toEqual([
      expect.objectContaining({
        propertyName: 48,
        propertyLabel: "OnHit",
        subtype: 3,
        costTable: 24,
        costValue: 1
      })
    ]);
  });

  it("serializes cloak model row through native UTI ModelPart1", () => {
    const cloak = buildItemTemplate({
      id: "itm_template_cloak_001",
      name: "Arcane Cloak",
      resRef: "cloak_arcane",
      tag: "CLOAK_ARCANE",
      itemProperties: {
        localizedName: "Arcane Cloak",
        baseItem: 80,
        baseItemLabel: "Cloak",
        baseItemModelType: "cloak",
        cloakModelRow: 7,
        cloakModel: 1,
        cloakTexture: 10,
        cloakIcon: 2,
        cloakModelResRef: "pmh0_cloak_001",
        cloakTextureResRef: "pmh0_cloak_010",
        cloakIconResRef: "icloak_m_002",
        identified: true
      }
    });

    expect(buildItemBlueprintCreatePayloadFromWizardSceneObject(cloak)).toMatchObject({
      templateResRef: "cloak_arcane",
      baseItem: 80,
      modelPart1: 7
    });
  });

  it("validates wizard drafts against baseitems.2da limits", () => {
    const baseObject = buildItemTemplate({
      itemProperties: {
        baseItem: 0,
        baseItemLabel: "Shortsword",
        baseItemModelType: "wswss",
        baseItemStacking: 1,
        baseItemChargesStarting: 0,
        baseItemMaxProps: 1,
        baseItemMinProps: 0,
        baseItemReqFeats: [45, 50]
      }
    });
    const draft = createItemWizardDraft(baseObject, 7);
    draft.stackSize = "3";
    draft.charges = "2";
    draft.propertyList = [
      {
        propertyName: "1",
        subtype: "",
        costTable: "",
        costValue: "",
        param1: "",
        param1Value: "",
        chanceAppear: "100"
      },
      {
        propertyName: "2",
        subtype: "",
        costTable: "",
        costValue: "",
        param1: "",
        param1Value: "",
        chanceAppear: "100"
      }
    ];

    expect(validateItemCreationDraft(draft, baseObject)).toEqual([
      expect.objectContaining({
        code: "STACK_SIZE_EXCEEDS_BASEITEM_STACKING",
        severity: "error"
      }),
      expect.objectContaining({
        code: "CHARGES_ON_BASEITEM_WITHOUT_STARTING_CHARGES",
        severity: "warn"
      }),
      expect.objectContaining({
        code: "PROPERTY_COUNT_EXCEEDS_BASEITEM_MAX_PROPS",
        severity: "error"
      }),
      expect.objectContaining({
        code: "BASEITEM_REQUIRES_FEATS",
        severity: "info"
      })
    ]);
  });

  it("validates armor mannequin context and missing CAPART model sources", () => {
    const baseObject = buildItemTemplate({
      itemProperties: {
        ...buildItemTemplate().itemProperties,
        armorPreviewContext: {
          modelPrefix: "pmh0_",
          label: "human-male-phenotype0",
          gender: 0,
          phenotype: 0,
          raceModel: "human"
        },
        armorPartModelCandidates: [
          {
            slot: "torso",
            partId: 43,
            partModelName: "chest",
            modelPrefix: "pmh0_",
            modelResRef: "pmh0_chest043",
            modelUrl: "/api/v1/catalog/placeables/cache/armor/assets/torso.glb"
          }
        ],
        modelAssetCandidates: [
          {
            assetId: "torso-glb",
            role: "model",
            fileName: "pmh0_chest043.glb",
            objectKey: "modules/current/__aurora/derived/models/pmh0_chest043.glb",
            extension: "glb",
            reference: "pmh0_chest043",
            assetUrl: "/api/v1/catalog/placeables/cache/armor/assets/torso.glb"
          }
        ]
      }
    });
    const draft = createItemWizardDraft(baseObject, 7);
    draft.armorContext.modelPrefix = "bad";
    draft.armorParts.torso = "44";

    expect(validateItemCreationDraft(draft, baseObject)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ARMOR_CONTEXT_INVALID",
          severity: "error"
        }),
        expect.objectContaining({
          code: "ARMOR_PART_SOURCE_MISSING",
          severity: "warn",
          message: expect.stringContaining("Torso 44")
        })
      ])
    );
  });

  it("adds equip slot, ILR stack, and cost context from baseitems.2da", () => {
    const baseObject = buildItemTemplate({
      itemProperties: {
        baseItem: 0,
        baseItemLabel: "Shortsword",
        baseItemModelType: "wswss",
        baseItemStacking: 99,
        baseItemIlrStackSize: 1,
        baseItemEquipableSlots: "0x1C030",
        baseItemBaseCost: 10,
        baseItemItemMultiplier: 2
      }
    });
    const draft = createItemWizardDraft(baseObject, 7);
    draft.stackSize = "3";
    draft.addCost = "25";

    expect(validateItemCreationDraft(draft, baseObject)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "BASEITEM_EQUIPABLE_SLOTS_CONTEXT",
        severity: "info",
        message:
          "Base item equipable slots: 0x1C030: Right Hand, Left Hand, Creature Right Weapon, Creature Left Weapon, Creature Bite."
      }),
      expect.objectContaining({
        code: "STACK_SIZE_EXCEEDS_BASEITEM_ILR_STACK_SIZE",
        severity: "warn",
        message: "Stack size 3 exceeds baseitems.2da ILRStackSize 1."
      }),
      expect.objectContaining({
        code: "BASEITEM_COST_CONTEXT",
        severity: "info",
        message: "Base item cost 10, item multiplier 2, AddCost 25."
      })
    ]));
  });

  it("validates Aurora special item properties before serialization", () => {
    const baseObject = buildItemTemplate();
    const draft = createItemWizardDraft(baseObject, 7);
    draft.propertyList = [
      {
        propertyName: "15",
        propertyLabel: "CastSpell",
        subtype: "",
        costTable: "3",
        costValue: "",
        param1: "",
        param1Value: "",
        chanceAppear: "100",
        subTypeTable: "iprp_spells",
        costTableDefinition: "iprp_chargecost"
      },
      {
        propertyName: "44",
        propertyLabel: "Light",
        subtype: "",
        costTable: "18",
        costValue: "",
        param1: "",
        param1Value: "",
        chanceAppear: "100",
        costTableDefinition: "iprp_lightcost",
        param1Table: "iprp_color"
      },
      {
        propertyName: "48",
        propertyLabel: "OnHit",
        subtype: "",
        costTable: "",
        costValue: "",
        param1: "",
        param1Value: "",
        chanceAppear: "100"
      },
      {
        propertyName: "18",
        propertyLabel: "UnlimitedAmmo",
        subtype: "",
        costTable: "",
        costValue: "",
        param1: "",
        param1Value: "",
        chanceAppear: "100"
      },
      {
        propertyName: "19",
        propertyLabel: "Poison",
        subtype: "",
        costTable: "",
        costValue: "2",
        param1: "",
        param1Value: "",
        chanceAppear: "100"
      }
    ];

    expect(validateItemCreationDraft(draft, baseObject)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PROPERTY_CASTSPELL_REQUIRES_SPELL_AND_USES",
          severity: "error"
        }),
        expect.objectContaining({
          code: "PROPERTY_COST_VALUE_MISSING",
          severity: "warn",
          message: "CastSpell has a cost table but no cost value."
        }),
        expect.objectContaining({
          code: "PROPERTY_LIGHT_REQUIRES_BRIGHTNESS",
          severity: "warn"
        }),
        expect.objectContaining({
          code: "PROPERTY_LIGHT_REQUIRES_COLOR",
          severity: "warn"
        }),
        expect.objectContaining({
          code: "PROPERTY_ONHIT_REQUIRES_SUBTYPE",
          severity: "warn"
        }),
        expect.objectContaining({
          code: "PROPERTY_ONHIT_COST_TABLE_FORCED",
          severity: "info"
        }),
        expect.objectContaining({
          code: "PROPERTY_UNLIMITED_AMMO_REQUIRES_AMMO_TYPE",
          severity: "warn"
        }),
        expect.objectContaining({
          code: "PROPERTY_POISON_REQUIRES_POISON_TYPE",
          severity: "warn"
        }),
        expect.objectContaining({
          code: "PROPERTY_COST_TABLE_MISSING",
          severity: "warn",
          message: "Poison has a cost value but no cost table."
        }),
        expect.objectContaining({
          code: "PROPERTY_COST_UNRESOLVED",
          severity: "warn"
        })
      ])
    );
  });

  it("accepts fully specified CastSpell property metadata", () => {
    const baseObject = buildItemTemplate();
    const draft = createItemWizardDraft(baseObject, 7);
    draft.propertyList = [
      {
        propertyName: "15",
        propertyLabel: "CastSpell",
        subtype: "66",
        costTable: "3",
        costValue: "1",
        param1: "",
        param1Value: "",
        chanceAppear: "100",
        subTypeTable: "iprp_spells",
        costTableDefinition: "iprp_chargecost"
      }
    ];

    expect(validateItemCreationDraft(draft, baseObject)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PROPERTY_CASTSPELL_REQUIRES_SPELL_AND_USES"
        })
      ])
    );
  });

  it("accepts fully specified Light item-property metadata", () => {
    const baseObject = buildItemTemplate();
    const draft = createItemWizardDraft(baseObject, 7);
    draft.propertyList = [
      {
        propertyName: "44",
        propertyLabel: "Light",
        subtype: "",
        costTable: "18",
        costValue: "4",
        param1: "9",
        param1Value: "3",
        chanceAppear: "100",
        costTableDefinition: "iprp_lightcost",
        param1Table: "iprp_color"
      }
    ];

    expect(validateItemCreationDraft(draft, baseObject)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PROPERTY_LIGHT_REQUIRES_BRIGHTNESS"
        }),
        expect.objectContaining({
          code: "PROPERTY_LIGHT_REQUIRES_COLOR"
        })
      ])
    );
  });

  it("adds IPRP property cost context from selected cost value rows", () => {
    const baseObject = buildItemTemplate({
      itemProperties: {
        ...buildItemTemplate().itemProperties,
        baseItemBaseCost: 10
      }
    });
    const draft = createItemWizardDraft(baseObject, 7);
    draft.addCost = "25";
    draft.propertyList = [
      {
        propertyName: "15",
        propertyLabel: "CastSpell",
        subtype: "66",
        costTable: "3",
        costValue: "1",
        param1: "",
        param1Value: "",
        chanceAppear: "100",
        subTypeTable: "iprp_spells",
        costTableDefinition: "iprp_chargecost"
      },
      {
        propertyName: "16",
        propertyLabel: "Custom Cost Property",
        subtype: "",
        costTable: "2",
        costValue: "999",
        param1: "",
        param1Value: "",
        chanceAppear: "100"
      }
    ];

    expect(
      validateItemCreationDraft(draft, baseObject, [
        {
          propertyName: 15,
          label: "CastSpell",
          propertyLabel: "CastSpell",
          sampleCostTable: 3,
          costTableDefinition: "iprp_chargecost",
          costValueOptions: [{ value: 1, label: "Aid", cost: 2 }],
          subtypeOptions: [{ value: 66, label: "Aid", cost: 4500 }],
          param1Options: []
        },
        {
          propertyName: 16,
          label: "Custom Cost Property",
          costValueOptions: [],
          subtypeOptions: [],
          param1Options: []
        }
      ])
    ).toEqual([
      expect.objectContaining({
        code: "BASEITEM_COST_CONTEXT",
        severity: "info"
      }),
      expect.objectContaining({
        code: "PROPERTY_COST_CONTEXT",
        severity: "info",
        message:
          "Aurora cost estimate 9035: BaseCost 10, armor modifiers 0 from 0 part(s), property subtotal 0, CastSpell subtotal 9000, ItemMultiplier 1, StackSize 1, AddCost 25."
      })
    ]);
  });

  it("preserves custom item identity after backend processing adds render candidates", () => {
    const baseObject = buildItemTemplate();
    const created = createItemSceneObjectFromWizardDraft(
      createItemWizardDraft(baseObject, 394),
      baseObject,
      394
    );
    const processed: SceneObject = {
      ...created,
      id: "itm_template_item_nw_maarcl009",
      name: "Hide Armor",
      resRef: "nw_maarcl009",
      tag: "NW_MAARCL009",
      itemProperties: {
        ...created.itemProperties,
        modelAssetCandidates: [
          {
            assetId: "asset-aarcl-torso",
            role: "model",
            reference: "aarcl_t_043",
            assetUrl: "/cache/aarcl_t_043.glb"
          }
        ]
      }
    };

    const merged = mergeProcessedItemWizardSceneObject(created, processed);

    expect(merged.id).toBe(created.id);
    expect(merged.resRef).toBe(created.resRef);
    expect(merged.tag).toBe(created.tag);
    expect(merged.itemProperties?.modelAssetCandidates).toEqual(
      processed.itemProperties?.modelAssetCandidates
    );
  });
});
