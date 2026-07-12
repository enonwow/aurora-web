import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspaceSceneObjectClone creature properties", () => {
  it("deep clones creature provenance maps preserved from Aurora UTC/GIT metadata", () => {
    const source = {
      ...createNewSceneObject("creatures", 1, 1, 1),
      creatureProperties: {
        firstName: "Guard",
        lastName: "",
        race: "Human",
        appearance: "cre_guard",
        phenotype: "Normal",
        gender: "Male",
        description: "",
        challengeRating: 1,
        portraitResRef: "po_guard",
        conversation: "",
        noInterrupt: false,
        appearanceProfile: {
          source2daRow: 7,
          sourceKey: "appearance.2da",
          modelType: "P"
        },
        lookupProfile: {
          raceLabelSource2daRow: 6,
          raceLabelSourceKey: "racialtypes.2da",
          soundSetResRef: "ss_guard"
        },
        listCounts: {
          classListCount: 1,
          inventoryItemListCount: 2,
          equipItemListCount: 3
        },
        localizedStringRefs: {
          firstName: 9101,
          description: 9102
        },
        localizedStrings: {
          displayName: "Guard Display"
        },
        inventoryItems: [
          {
            embeddedItem: {
              templateResRef: "emb_sword",
              localizedName: "Embedded Sword",
              itemPropertyListCount: 1,
              itemPropertyListEntries: [
                {
                  propertyName: 15,
                  subtype: 66,
                  costTable: 3
                }
              ]
            }
          }
        ],
        equippedItems: [
          {
            embeddedItem: {
              templateResRef: "emb_armor",
              itemPropertyListCount: 1,
              itemPropertyListEntries: [
                {
                  propertyName: 1,
                  subtype: 2
                }
              ]
            }
          }
        ]
      }
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.creatureProperties?.appearanceProfile).toEqual({
      source2daRow: 7,
      sourceKey: "appearance.2da",
      modelType: "P"
    });
    expect(cloned.creatureProperties?.lookupProfile).toEqual({
      raceLabelSource2daRow: 6,
      raceLabelSourceKey: "racialtypes.2da",
      soundSetResRef: "ss_guard"
    });
    expect(cloned.creatureProperties?.listCounts).toEqual({
      classListCount: 1,
      inventoryItemListCount: 2,
      equipItemListCount: 3
    });
    expect(cloned.creatureProperties?.localizedStringRefs).toEqual({
      firstName: 9101,
      description: 9102
    });
    expect(cloned.creatureProperties?.localizedStrings).toEqual({
      displayName: "Guard Display"
    });
    expect(
      cloned.creatureProperties?.inventoryItems?.[0]?.embeddedItem?.itemPropertyListEntries
    ).toEqual([
      {
        propertyName: 15,
        subtype: 66,
        costTable: 3
      }
    ]);
    expect(
      cloned.creatureProperties?.equippedItems?.[0]?.embeddedItem?.itemPropertyListEntries
    ).toEqual([
      {
        propertyName: 1,
        subtype: 2
      }
    ]);

    expect(cloned.creatureProperties?.appearanceProfile).not.toBe(
      source.creatureProperties.appearanceProfile
    );
    expect(cloned.creatureProperties?.lookupProfile).not.toBe(
      source.creatureProperties.lookupProfile
    );
    expect(cloned.creatureProperties?.listCounts).not.toBe(source.creatureProperties.listCounts);
    expect(cloned.creatureProperties?.localizedStringRefs).not.toBe(
      source.creatureProperties.localizedStringRefs
    );
    expect(cloned.creatureProperties?.localizedStrings).not.toBe(
      source.creatureProperties.localizedStrings
    );
    expect(cloned.creatureProperties?.inventoryItems).not.toBe(
      source.creatureProperties.inventoryItems
    );
    expect(cloned.creatureProperties?.inventoryItems?.[0]?.embeddedItem).not.toBe(
      source.creatureProperties.inventoryItems[0].embeddedItem
    );
    expect(
      cloned.creatureProperties?.inventoryItems?.[0]?.embeddedItem?.itemPropertyListEntries?.[0]
    ).not.toBe(
      source.creatureProperties.inventoryItems[0].embeddedItem?.itemPropertyListEntries?.[0]
    );
    expect(
      cloned.creatureProperties?.equippedItems?.[0]?.embeddedItem?.itemPropertyListEntries?.[0]
    ).not.toBe(
      source.creatureProperties.equippedItems[0].embeddedItem?.itemPropertyListEntries?.[0]
    );

    source.creatureProperties.lookupProfile.soundSetResRef = "ss_mutated";
    source.creatureProperties.listCounts.inventoryItemListCount = 99;
    source.creatureProperties.localizedStringRefs.firstName = 42;
    source.creatureProperties.localizedStrings.displayName = "Mutated";
    source.creatureProperties.inventoryItems[0].embeddedItem!.itemPropertyListEntries![0].subtype =
      999;

    expect(cloned.creatureProperties?.lookupProfile?.soundSetResRef).toBe("ss_guard");
    expect(cloned.creatureProperties?.listCounts?.inventoryItemListCount).toBe(2);
    expect(cloned.creatureProperties?.localizedStringRefs?.firstName).toBe(9101);
    expect(cloned.creatureProperties?.localizedStrings?.displayName).toBe("Guard Display");
    expect(
      cloned.creatureProperties?.inventoryItems?.[0]?.embeddedItem?.itemPropertyListEntries?.[0]
        ?.subtype
    ).toBe(66);
  });

  it("deep clones item properties used by item wizard placement", () => {
    const source = {
      ...createNewSceneObject("items", 2, 3, 7),
      itemProperties: {
        baseItem: 57,
        baseItemModelType: "ashto",
        modelParts: [95],
        modelPartCandidates: [
          {
            resRef: "ashto_095",
            role: "part1",
            partId: 95,
            assetId: "model:ashto_095"
          }
        ],
        armorParts: {
          torso: 43,
          rShoul: 15
        },
        materialColors: {
          leather1: 5,
          metal1: 17
        },
        propertyList: [
          {
            propertyName: 1,
            subtype: 2,
            costTable: 3,
            costValue: 4
          }
        ],
        scripts: {
          onAcquire: "item_acquire"
        }
      }
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.itemProperties).toEqual(source.itemProperties);
    expect(cloned.itemProperties).not.toBe(source.itemProperties);
    expect(cloned.itemProperties?.modelParts).not.toBe(source.itemProperties.modelParts);
    expect(cloned.itemProperties?.modelPartCandidates).not.toBe(
      source.itemProperties.modelPartCandidates
    );
    expect(cloned.itemProperties?.modelPartCandidates?.[0]).not.toBe(
      source.itemProperties.modelPartCandidates[0]
    );
    expect(cloned.itemProperties?.armorParts).not.toBe(source.itemProperties.armorParts);
    expect(cloned.itemProperties?.materialColors).not.toBe(source.itemProperties.materialColors);
    expect(cloned.itemProperties?.propertyList?.[0]).not.toBe(source.itemProperties.propertyList[0]);
    expect(cloned.itemProperties?.scripts).not.toBe(source.itemProperties.scripts);

    source.itemProperties.modelParts[0] = 244;
    source.itemProperties.modelPartCandidates[0].resRef = "ashto_244";
    source.itemProperties.armorParts.torso = 99;
    source.itemProperties.materialColors.leather1 = 8;
    source.itemProperties.propertyList[0].propertyName = 42;
    source.itemProperties.scripts.onAcquire = "mutated";

    expect(cloned.itemProperties?.modelParts?.[0]).toBe(95);
    expect(cloned.itemProperties?.modelPartCandidates?.[0]?.resRef).toBe("ashto_095");
    expect(cloned.itemProperties?.armorParts?.torso).toBe(43);
    expect(cloned.itemProperties?.materialColors?.leather1).toBe(5);
    expect(cloned.itemProperties?.propertyList?.[0]?.propertyName).toBe(1);
    expect(cloned.itemProperties?.scripts?.onAcquire).toBe("item_acquire");
  });
});
