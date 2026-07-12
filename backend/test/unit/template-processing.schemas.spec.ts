import { AppException } from "../../src/common/http/app-exception";
import {
  parseItemBlueprintCreatePayload,
  parsePlaceableBlueprintCreatePayload,
  parseStoreBlueprintCreatePayload,
  parseTemplateCacheKey,
  parseTemplateProcessPayload
} from "../../src/modules/catalog/adapters/inbound/http/template-processing.schemas";

describe("template-processing.schemas", () => {
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

  it("accepts item blueprint script slots as GFF-safe resrefs", () => {
    const parsed = parseItemBlueprintCreatePayload({
      templateResRef: "ctxarmor02",
      name: "Context Armor Scripts",
      baseItem: 16,
      scripts: {
        OnUsed: "itm_use",
        onheartbeat: "itm_hb",
        oninventorydisturbed: "itm_inv_dist"
      }
    });

    expect(parsed.scripts).toEqual({
      onused: "itm_use",
      onheartbeat: "itm_hb",
      oninvdisturbed: "itm_inv_dist"
    });
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
