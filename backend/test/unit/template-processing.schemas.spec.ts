import { AppException } from "../../src/common/http/app-exception";
import {
  parseCreatureBlueprintCreatePayload,
  parseItemBlueprintCreatePayload,
  parsePlaceableBlueprintCreatePayload,
  parseStoreBlueprintCreatePayload,
  parseTemplateCacheKey,
  parseTemplateProcessPayload
} from "../../src/modules/catalog/adapters/inbound/http/template-processing.schemas";

describe("template-processing.schemas", () => {
  it("rejects non-native BodyPart_Robe on a Creature blueprint", () => {
    expect(() => parseCreatureBlueprintCreatePayload({
      templateResRef: "cre_robe_probe",
      name: "Robe Probe",
      blueprint: { bodyPartRobe: 19 }
    })).toThrow(AppException);
  });

  it("accepts template process payload by templateId", () => {
    const parsed = parseTemplateProcessPayload({
      templateId: "cre_guard_human_001",
      bypassCache: false
    });

    expect(parsed.templateId).toBe("cre_guard_human_001");
    expect(parsed.bypassCache).toBe(false);
    expect(parsed.includeBenchmarkMetadata).toBe(true);
  });

  it("accepts template process payload by resref", () => {
    const parsed = parseTemplateProcessPayload({
      resref: "itm_health_potion_001"
    });

    expect(parsed.resref).toBe("itm_health_potion_001");
  });

  it("accepts item visual override payloads", () => {
    const parsed = parseTemplateProcessPayload({
      templateId: "itm_aarcl009",
      itemVisualOverride: {
        modelPart1: "12",
        armorContext: {
          modelPrefix: "PFH2_",
          label: "human-female-phenotype2",
          gender: "1",
          phenotype: "2",
          raceModel: "HUMAN"
        },
        armorParts: {
          torso: "43",
          rHand: 0
        },
        materialColors: {
          leather1: "7",
          metal2: 21
        }
      }
    });

    expect(parsed.itemVisualOverride).toEqual({
      modelPart1: 12,
      armorContext: {
        modelPrefix: "pfh2_",
        label: "human-female-phenotype2",
        gender: 1,
        phenotype: 2,
        raceModel: "human"
      },
      armorParts: {
        torso: 43,
        rHand: 0
      },
      materialColors: {
        leather1: 7,
        metal2: 21
      }
    });
  });

  it("accepts item blueprint armor preview context", () => {
    const parsed = parseItemBlueprintCreatePayload({
      templateResRef: "ctxarmor01",
      name: "Context Armor",
      baseItem: 16,
      armorContext: {
        modelPrefix: "PFH2_",
        label: "human-female-phenotype2",
        gender: "1",
        phenotype: "2",
        raceModel: "HUMAN"
      }
    });

    expect(parsed.armorContext).toEqual({
      modelPrefix: "pfh2_",
      label: "human-female-phenotype2",
      gender: 1,
      phenotype: 2,
      raceModel: "human"
    });
  });

  it.each([
    ["root CostTable", { costTable: 3 }],
    ["root CostValue", { costValue: 1 }],
    ["Item scripts", { scripts: { OnUsed: "itm_use" } }],
  ])("rejects non-native Item blueprint %s", (_label, extension) => {
    expect(() => parseItemBlueprintCreatePayload({
      templateResRef: "ctxarmor02",
      name: "Strict Context Armor",
      baseItem: 16,
      ...extension,
    })).toThrow();
  });

  it("continues to accept CostTable and CostValue inside PropertiesList", () => {
    expect(parseItemBlueprintCreatePayload({
      templateResRef: "ctxarmor02",
      name: "Native Property Costs",
      baseItem: 16,
      propertyList: [{ propertyName: 15, costTable: 3, costValue: 1 }],
    }).propertyList).toEqual([
      { propertyName: 15, costTable: 3, costValue: 1 },
    ]);
  });

  it("accepts exact ordered Item blueprint VarTable entries including duplicates", () => {
    const variableListEntries = [
      { name: " duplicate ", type: "int" as const, value: -0x80000000 },
      { name: "duplicate", type: "float" as const, value: Math.fround(1.25) },
      { name: "duplicate", type: "string" as const, value: " exact value " },
    ];

    expect(parseItemBlueprintCreatePayload({
      templateResRef: "ctxarmor04",
      name: "Native Variables",
      baseItem: 16,
      variableListEntries,
    }).variableListEntries).toEqual(variableListEntries);
  });

  it.each([
    ["unknown entry key", [{ name: "flag", type: "int", value: 1, extra: true }]],
    ["NUL in name", [{ name: "bad\0name", type: "int", value: 1 }]],
    ["non-binary32 float", [{ name: "float", type: "float", value: 0.1 }]],
    ["out-of-range integer", [{ name: "int", type: "int", value: 0x80000000 }]],
    ["NUL in string", [{ name: "text", type: "string", value: "bad\0value" }]],
  ])("rejects Item blueprint VarTable with %s", (_label, variableListEntries) => {
    expect(() => parseItemBlueprintCreatePayload({
      templateResRef: "ctxarmor05",
      name: "Invalid Variables",
      baseItem: 16,
      variableListEntries,
    })).toThrow();
  });

  it("rejects Item blueprint VarTable above the entry budget", () => {
    expect(() => parseItemBlueprintCreatePayload({
      templateResRef: "ctxarmor06",
      name: "Too Many Variables",
      baseItem: 16,
      variableListEntries: Array.from({ length: 1025 }, (_, index) => ({
        name: `entry_${index}`,
        type: "int",
        value: index,
      })),
    })).toThrow();
  });

  it("rejects Item blueprint VarTable above the aggregate text budget", () => {
    expect(() => parseItemBlueprintCreatePayload({
      templateResRef: "ctxarmor07",
      name: "Too Much Variable Text",
      baseItem: 16,
      variableListEntries: Array.from({ length: 257 }, (_, index) => ({
        name: `entry_${index}`,
        type: "string",
        value: "x".repeat(4096),
      })),
    })).toThrow();
  });

  it("accepts canonical Item blueprint ItemList and Equip_ItemList references", () => {
    const parsed = parseItemBlueprintCreatePayload({
      templateResRef: "nested_bag",
      name: "Nested Bag",
      baseItem: 16,
      inventoryItemListEntries: [
        { resRef: "itm_potion", x: 3, y: 4 },
        { resRef: "itm_scroll", x: 5, y: 6 },
      ],
      equipItemListEntries: [
        { resRef: "itm_ring", slotMask: 0x4 },
        { resRef: "itm_cloak", slotMask: 0x2000 },
      ],
    });

    expect(parsed.inventoryItemListEntries).toEqual([
      { resRef: "itm_potion", x: 3, y: 4 },
      { resRef: "itm_scroll", x: 5, y: 6 },
    ]);
    expect(parsed.equipItemListEntries).toEqual([
      { resRef: "itm_ring", slotMask: 0x4 },
      { resRef: "itm_cloak", slotMask: 0x2000 },
    ]);
  });

  it.each([
    ["unknown inventory key", {
      inventoryItemListEntries: [{ resRef: "itm_potion", x: 0, y: 0, infinite: true }],
    }],
    ["uppercase inventory ResRef", {
      inventoryItemListEntries: [{ resRef: "ITM_POTION", x: 0, y: 0 }],
    }],
    ["self inventory reference", {
      inventoryItemListEntries: [{ resRef: "nested_bag", x: 0, y: 0 }],
    }],
    ["non-Word repository coordinate", {
      inventoryItemListEntries: [{ resRef: "itm_potion", x: 0x10000, y: 0 }],
    }],
    ["non-one-hot equipment slot", {
      equipItemListEntries: [{ resRef: "itm_ring", slotMask: 3 }],
    }],
    ["duplicate equipment slot", {
      equipItemListEntries: [
        { resRef: "itm_ring", slotMask: 4 },
        { resRef: "itm_ring_2", slotMask: 4 },
      ],
    }],
    ["unordered equipment slots", {
      equipItemListEntries: [
        { resRef: "itm_cloak", slotMask: 0x2000 },
        { resRef: "itm_ring", slotMask: 4 },
      ],
    }],
  ])("rejects Item blueprint nested inventory with %s", (_label, extension) => {
    expect(() => parseItemBlueprintCreatePayload({
      templateResRef: "nested_bag",
      name: "Invalid Nested Bag",
      baseItem: 16,
      ...extension,
    })).toThrow();
  });

  it("accepts item blueprint localized string references for native UTI LocString fields", () => {
    const parsed = parseItemBlueprintCreatePayload({
      templateResRef: "ctxarmor03",
      name: "Context Armor LocString",
      localizedNameStrRef: "12840",
      baseItem: 16,
      description: "Fallback description",
      descriptionStrRef: "2001",
      identifiedDescription: "Identified fallback",
      identifiedDescriptionStrRef: "2002"
    });

    expect(parsed.localizedNameStrRef).toBe(12840);
    expect(parsed.descriptionStrRef).toBe(2001);
    expect(parsed.identifiedDescriptionStrRef).toBe(2002);
  });

  it("accepts high HAK creature appearance override indices", () => {
    const parsed = parseTemplateProcessPayload({
      templateId: "cre_tm_cr_hlfdragred",
      creatureAppearanceOverride: {
        wingsNew: 0,
        tailNew: "3602",
        bodyParts: {
          torso: "1204"
        }
      }
    });

    expect(parsed.creatureAppearanceOverride).toMatchObject({
      wingsNew: 0,
      tailNew: 3602,
      bodyParts: {
        torso: 1204
      }
    });
  });

  it("accepts admitted Creature Phenotype overrides and rejects row 1", () => {
    const parsed = parseTemplateProcessPayload({
      templateId: "cre_nw_hen_dae_01",
      creatureAppearanceOverride: { phenotype: "5" }
    });

    expect(parsed.creatureAppearanceOverride?.phenotype).toBe(5);
    expect(() => parseTemplateProcessPayload({
      templateId: "cre_nw_hen_dae_01",
      creatureAppearanceOverride: { phenotype: 1 }
    })).toThrow();
  });

  it("accepts enriched Aurora creature list metadata beyond the scalar text limit", () => {
    const equipItemListEntries = JSON.stringify([
      {
        resRef: "nw_halfdragon",
        itemTemplateMetadata: {
          serializedEvidence: "x".repeat(8_200)
        }
      }
    ]);

    const parsed = parseTemplateProcessPayload({
      templateId: "cre_nw_halfdra001",
      creatureMetadata: {
        equipItemListEntries
      }
    });

    expect(parsed.creatureMetadata?.equipItemListEntries).toBe(equipItemListEntries);
  });

  it("keeps ordinary creature metadata strings capped at 8000 characters", () => {
    expect(() =>
      parseTemplateProcessPayload({
        templateId: "cre_nw_halfdra001",
        creatureMetadata: {
          comments: "x".repeat(8_001)
        }
      })
    ).toThrow(AppException);
  });

  it("accepts embedded-only store and placeable item entries", () => {
    const storePayload = parseStoreBlueprintCreatePayload({
      resRef: "test_store",
      name: "Test Store",
      storeListEntries: [
        {
          itemListEntries: [
            {
              embeddedItem: {
                sourceStructTypeId: "4294967295",
                templateResRef: "emb_ring",
                localizedName: "Embedded Ring",
                tag: "EMB_RING",
                baseItem: "52",
                modelPart1: "11",
                cost: "250",
                stackSize: "2",
                identified: "true",
                leather1Color: "5",
                itemPropertyListEntries: [{ propertyName: "15", subtype: "2" }],
                scripts: {
                  oninventorydisturbed: "it_inv"
                }
              },
              x: "4",
              y: "5",
              infinite: true
            }
          ]
        }
      ]
    });

    expect(storePayload.storeListEntries?.[0]?.itemListEntries?.[0]).toMatchObject({
      embeddedItem: {
        sourceStructTypeId: 4294967295,
        templateResRef: "emb_ring",
        localizedName: "Embedded Ring",
        tag: "EMB_RING",
        baseItem: 52,
        modelPart1: 11,
        cost: 250,
        stackSize: 2,
        identified: true,
        leather1Color: 5,
        itemPropertyListEntries: [{ propertyName: 15, subtype: 2 }],
        scripts: {
          oninvdisturbed: "it_inv"
        }
      },
      x: 4,
      y: 5,
      infinite: true
    });

    const placeablePayload = parsePlaceableBlueprintCreatePayload({
      templateResRef: "plc_chest",
      name: "Chest",
      inventoryItemListEntries: [
        {
          embeddedItem: {
            templateResRef: "emb_gem",
            localizedName: "Embedded Gem",
            baseItem: 21
          },
          dropable: true
        }
      ]
    });

    expect(placeablePayload.inventoryItemListEntries?.[0]).toMatchObject({
      embeddedItem: {
        templateResRef: "emb_gem",
        localizedName: "Embedded Gem",
        baseItem: 21
      },
      dropable: true
    });
  });

  it("accepts the complete signed native Store commerce and script payload", () => {
    expect(parseStoreBlueprintCreatePayload({
      resRef: "signed_store",
      name: "Signed Store",
      markUp: "-10",
      markDown: "35",
      blackMarket: true,
      bmMarkDown: "-25",
      identifyPrice: "150",
      maxBuyPrice: "-1",
      storeGold: "2000000",
      onOpenStore: "on_store_open",
      onStoreClosed: "on_store_close",
      storeId: "255",
    })).toMatchObject({
      markUp: -10,
      markDown: 35,
      blackMarket: true,
      bmMarkDown: -25,
      identifyPrice: 150,
      maxBuyPrice: -1,
      storeGold: 2_000_000,
      onOpenStore: "on_store_open",
      onStoreClosed: "on_store_close",
      storeId: 255,
    });
  });

  it("rejects Store commerce outside signed Int and ID outside Byte storage", () => {
    expect(() => parseStoreBlueprintCreatePayload({
      resRef: "bad_store",
      name: "Bad Store",
      markUp: 0x8000_0000,
    })).toThrow(AppException);
    expect(() => parseStoreBlueprintCreatePayload({
      resRef: "bad_store",
      name: "Bad Store",
      storeId: 256,
    })).toThrow(AppException);
  });

  it("rejects payload without templateId/resref", () => {
    expect(() => parseTemplateProcessPayload({})).toThrow(AppException);
  });

  it("accepts hexadecimal cache key", () => {
    const key = "a".repeat(64);
    expect(parseTemplateCacheKey(key)).toBe(key);
  });

  it("rejects invalid cache key", () => {
    expect(() => parseTemplateCacheKey("bad:key")).toThrow(AppException);
  });
});
