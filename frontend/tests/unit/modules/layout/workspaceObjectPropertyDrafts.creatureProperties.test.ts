import { describe, expect, it } from "vitest";
import { buildCreaturePropertiesDraft } from "../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspaceObjectPropertyDrafts creature properties", () => {
  it("keeps source-backed SkillList ranks when skill names match the dialog labels", () => {
    const creature = {
      ...createNewSceneObject("creatures", 1, 1, 1),
      creatureProperties: {
        firstName: "Guard",
        lastName: "",
        race: "Human",
        appearance: "cre_guard",
        phenotype: "",
        gender: "",
        description: "",
        challengeRating: 1,
        portraitResRef: "",
        conversation: "",
        noInterrupt: false,
        advancedSettings: {
          blueprintResRef: "cre_guard",
          paletteId: 9,
          disarmable: false,
          plot: false,
          playerCharacter: true,
          leavesLootableCorpse: false,
          noPermanentDeath: false,
          immortal: false,
          bodyBag: false,
          startingPackage: false,
          treasureModel: "Default",
          corpseDecayTimeSeconds: 0,
          faction: "Hostile",
          subrace: "",
          deity: "",
          challengeRatingAdjustment: 0,
          soundSet: "",
          perceptionRange: "Default",
          walkRateSource2daRow: 4,
          walkRateSource2daName: "Walk",
          walkRateSpeed2daRow: 9,
          walkRateAppearance2daSourceKey: "appearance.2da:WALKDIST",
          walkRateSpeed2daSourceKey: "creaturespeed.2da:Name",
          animationState: 2,
          animationName: "walk"
        },
        templateEntries: [{ templateId: 77 }],
        skills: [{ skill: "Animal Empathy", rank: 8 }],
        variables: [
          { name: "QuestStage", type: "int", value: 3 },
          { name: "Greeting", type: "string", value: "hello" }
        ]
      }
    };

    const draft = buildCreaturePropertiesDraft(creature);

    expect(draft.templateEntries).toEqual([{ templateId: 77 }]);
    expect(draft.skills[0]).toEqual({ skill: "Animal Empathy", rank: 8 });
    expect(draft.variables).toEqual([
      { name: "QuestStage", type: "int", value: 3 },
      { name: "Greeting", type: "string", value: "hello" }
    ]);
    expect(draft.variables).not.toBe(creature.creatureProperties.variables);
    expect(draft.advancedSettings.paletteId).toBe(9);
    expect(draft.advancedSettings.playerCharacter).toBe(true);
    expect(draft.advancedSettings.walkRateSource2daRow).toBe(4);
    expect(draft.advancedSettings.walkRateSource2daName).toBe("Walk");
    expect(draft.advancedSettings.walkRateSpeed2daRow).toBe(9);
    expect(draft.advancedSettings.walkRateAppearance2daSourceKey).toBe(
      "appearance.2da:WALKDIST"
    );
    expect(draft.advancedSettings.walkRateSpeed2daSourceKey).toBe("creaturespeed.2da:Name");
    expect(draft.advancedSettings.animationState).toBe(2);
    expect(draft.advancedSettings.animationName).toBe("walk");
  });

  it("deep clones embedded item property lists into creature drafts", () => {
    const creature = {
      ...createNewSceneObject("creatures", 1, 1, 2),
      creatureProperties: {
        inventoryItems: [
          {
            embeddedItem: {
              templateResRef: "emb_ring",
              localizedNameStrRef: 7001,
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
      } as NonNullable<ReturnType<typeof createNewSceneObject>["creatureProperties"]>
    };

    const draft = buildCreaturePropertiesDraft(creature);

    expect(draft.inventoryItems[0]?.embeddedItem?.itemPropertyListEntries).toEqual([
      {
        propertyName: 15,
        subtype: 66,
        costTable: 3
      }
    ]);
    expect(draft.inventoryItems[0]?.embeddedItem?.localizedNameStrRef).toBe(7001);
    expect(draft.inventoryItems[0]?.embeddedItem).not.toBe(
      creature.creatureProperties.inventoryItems?.[0]?.embeddedItem
    );
    expect(draft.inventoryItems[0]?.embeddedItem?.itemPropertyListEntries?.[0]).not.toBe(
      creature.creatureProperties.inventoryItems?.[0]?.embeddedItem?.itemPropertyListEntries?.[0]
    );
    expect(draft.equippedItems[0]?.embeddedItem?.itemPropertyListEntries?.[0]).not.toBe(
      creature.creatureProperties.equippedItems?.[0]?.embeddedItem?.itemPropertyListEntries?.[0]
    );

    creature.creatureProperties.inventoryItems![0]!.embeddedItem!.itemPropertyListEntries![0]!.subtype =
      999;
    expect(draft.inventoryItems[0]?.embeddedItem?.itemPropertyListEntries?.[0]?.subtype).toBe(66);
  });
});
