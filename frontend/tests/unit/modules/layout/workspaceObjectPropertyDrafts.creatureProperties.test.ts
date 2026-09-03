import { describe, expect, it } from "vitest";
import { buildCreaturePropertiesDraft } from "../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspaceObjectPropertyDrafts creature properties", () => {
  it("activates numeric Appearance_Type only for exact bound Creature provenance", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 1);
    creature.creatureProperties!.appearanceType = 249;
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creatureAppearance: {
        present: true,
        nativeType: "word",
        value: 249,
        table: {
          resourceName: "appearance.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
          sourceLayer: "vanilla",
          sha256: "a".repeat(64),
          sizeBytes: 200_000,
          rowCount: 1_000,
          rowIndex: 249,
        },
      },
    };

    expect(buildCreaturePropertiesDraft(creature)).toMatchObject({
      appearanceControlState: "ACTIVE_NOW",
      appearanceType: 249,
    });
    delete creature.source.creatureAppearance;
    expect(buildCreaturePropertiesDraft(creature).appearanceControlState).toBe("PRESERVE_ONLY");
  });

  it("activates numeric Gender only for exact bound Creature provenance", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 1);
    creature.creatureProperties!.genderId = 4;
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creatureGender: {
        present: true,
        nativeType: "byte",
        value: 4,
        table: {
          resourceName: "gender.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/gender.2da",
          sourceLayer: "vanilla",
          sha256: "c".repeat(64),
          sizeBytes: 250,
          rowCount: 5,
          rowIndex: 4,
        },
      },
    };

    expect(buildCreaturePropertiesDraft(creature)).toMatchObject({
      genderControlState: "ACTIVE_NOW",
      genderId: 4,
    });
    delete creature.source.creatureGender;
    expect(buildCreaturePropertiesDraft(creature).genderControlState).toBe("PRESERVE_ONLY");
  });

  it("activates numeric FactionID only for exact catalog-bound Creature provenance", () => {
    const catalog = {
      descriptor: {
        resourceName: "repute.fac" as const,
        sourceObjectKey: "modules/current/repute.fac",
        sha256: "f".repeat(64),
        sizeBytes: 1889,
        factionCount: 3,
      },
      rows: ["PC", "Hostile", "Commoner"].map(
        (name, factionId) => ({ factionId, name, parentFactionId: 0xffffffff, isGlobal: true }),
      ),
    };
    const creature = createNewSceneObject("creatures", 1, 1, 2);
    creature.creatureProperties!.advancedSettings = {
      ...creature.creatureProperties!.advancedSettings!,
      factionId: 1,
      faction: "Hostile",
    };
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creatureFaction: {
        expectedValue: 1,
        catalogSha256: "f".repeat(64),
        catalogFactionCount: 3,
      },
    };

    expect(buildCreaturePropertiesDraft(creature, undefined, catalog)).toMatchObject({
      factionControlState: "ACTIVE_NOW",
      advancedSettings: { factionId: 1, faction: "Hostile" },
    });
    expect(buildCreaturePropertiesDraft(creature, undefined, {
      ...catalog,
      descriptor: { ...catalog.descriptor, sha256: "e".repeat(64) },
    }).factionControlState).toBe("PRESERVE_ONLY");
  });

  it("activates Blueprint ResRef only for exact retained Creature provenance", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 2);
    creature.resRef = "renderer_identity";
    creature.creatureProperties!.advancedSettings = {
      ...creature.creatureProperties!.advancedSettings!,
      blueprintResRef: "nw_guard",
    };
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creatureTemplateResRef: { expectedResRef: "nw_guard" },
    };

    expect(buildCreaturePropertiesDraft(creature)).toMatchObject({
      templateResRefControlState: "ACTIVE_NOW",
      advancedSettings: { blueprintResRef: "nw_guard" },
    });

    delete creature.source.creatureTemplateResRef;
    expect(buildCreaturePropertiesDraft(creature).templateResRefControlState)
      .toBe("PRESERVE_ONLY");
  });

  it("activates Subrace and Deity independently from exact retained provenance", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 2);
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creatureSpecialIdentityStrings: {
        subrace: { expectedValue: "Moon Elf" },
      },
    };

    expect(buildCreaturePropertiesDraft(creature)).toMatchObject({
      subraceControlState: "ACTIVE_NOW",
      deityControlState: "PRESERVE_ONLY",
    });
  });

  it("derives Creature name controls independently from exact retained storage", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 8);
    creature.creatureProperties!.firstName = "Stale presentation";
    creature.creatureProperties!.lastName = "Resolved TLK surname";
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      creatureLocalizedStrings: {
        firstName: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "ICBHdWFyZCAg" }],
        },
        lastName: { present: true, strRef: 12_416, entries: [] },
      },
    };

    expect(buildCreaturePropertiesDraft(creature)).toMatchObject({
      firstNameControlState: "ACTIVE_NOW",
      lastNameControlState: "PRESERVE_ONLY",
      firstName: "Stale presentation",
      lastName: "Resolved TLK surname",
    });
  });

  it("activates Tag only for exact present retained Creature provenance", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 9);
    creature.tag = "  NW_CHICKEN  ";
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureTag: { present: true, value: "  NW_CHICKEN  " },
    };

    expect(buildCreaturePropertiesDraft(creature)).toMatchObject({
      tagControlState: "ACTIVE_NOW",
      tag: "  NW_CHICKEN  ",
    });

    creature.source.creatureTag = { present: false };
    expect(buildCreaturePropertiesDraft(creature).tagControlState).toBe("PRESERVE_ONLY");
    delete creature.source.creatureTag;
    expect(buildCreaturePropertiesDraft(creature).tagControlState).toBe("PRESERVE_ONLY");
  });

  it("activates Conversation only for exact present retained Creature provenance", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 10);
    creature.creatureProperties!.conversation = "Guard_Dialog";
    creature.creatureProperties!.noInterrupt = true;
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureConversation: { present: true, value: "Guard_Dialog" },
    };

    expect(buildCreaturePropertiesDraft(creature)).toMatchObject({
      conversationControlState: "ACTIVE_NOW",
      noInterruptControlState: "PRESERVE_ONLY",
      conversation: "Guard_Dialog",
      noInterrupt: true,
    });

    creature.source.creatureConversation = { present: false };
    expect(buildCreaturePropertiesDraft(creature)).toMatchObject({
      conversationControlState: "PRESERVE_ONLY",
      noInterruptControlState: "PRESERVE_ONLY",
    });

    delete creature.source.creatureConversation;
    expect(buildCreaturePropertiesDraft(creature).conversationControlState)
      .toBe("PRESERVE_ONLY");

    creature.source.creatureConversation = {
      present: true,
      value: "bad-dialog",
    };
    expect(buildCreaturePropertiesDraft(creature).conversationControlState)
      .toBe("PRESERVE_ONLY");
  });

  it("activates No Interrupt only for exact present retained Creature provenance", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 10);
    creature.creatureProperties!.noInterrupt = true;
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureInterruptable: { present: true, value: 0 },
    };

    expect(buildCreaturePropertiesDraft(creature)).toMatchObject({
      noInterruptControlState: "ACTIVE_NOW",
      noInterrupt: true,
    });

    creature.source.creatureInterruptable = { present: false };
    expect(buildCreaturePropertiesDraft(creature).noInterruptControlState)
      .toBe("PRESERVE_ONLY");
    creature.source.creatureInterruptable = { present: true, value: 2 } as never;
    expect(buildCreaturePropertiesDraft(creature).noInterruptControlState)
      .toBe("PRESERVE_ONLY");
  });

  it("derives all five advanced flag controls independently from exact retained provenance", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 10);
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureAdvancedFlags: {
        disarmable: { present: true, value: 1 },
        plot: { present: true, value: 0 },
        immortal: { present: false },
        lootable: { present: true, value: 1 },
        noPermanentDeath: { present: false },
      },
    };

    expect(buildCreaturePropertiesDraft(creature)).toMatchObject({
      disarmableControlState: "ACTIVE_NOW",
      plotControlState: "ACTIVE_NOW",
      immortalControlState: "PRESERVE_ONLY",
      lootableControlState: "ACTIVE_NOW",
      noPermanentDeathControlState: "PRESERVE_ONLY",
    });

    creature.source.creatureAdvancedFlags = {
      ...creature.source.creatureAdvancedFlags,
      plot: { present: true, value: 2 } as never,
    };
    expect(buildCreaturePropertiesDraft(creature)).toMatchObject({
      disarmableControlState: "PRESERVE_ONLY",
      plotControlState: "PRESERVE_ONLY",
      immortalControlState: "PRESERVE_ONLY",
      lootableControlState: "PRESERVE_ONLY",
      noPermanentDeathControlState: "PRESERVE_ONLY",
    });
  });

  it("activates Creature death-remains controls only for exact catalog/CAS and current Lootable", () => {
    const catalog = {
      descriptor: {
        resourceName: "bodybag.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/bodybag.2da",
        sourceLayer: "vanilla" as const,
        sha256: "e".repeat(64),
        sizeBytes: 502,
        rowCount: 3,
      },
      rows: [
        { rowIndex: 0, label: "Default", nameStrRef: 1, displayName: "Default", displaySource: "label" as const },
        { rowIndex: 1, label: "Bag", nameStrRef: 2, displayName: "Bag", displaySource: "label" as const },
        { rowIndex: 2, label: "Pile", nameStrRef: 3, displayName: "Pile", displaySource: "label" as const },
      ],
    };
    const creature = createNewSceneObject("creatures", 1, 1, 10);
    creature.creatureProperties!.advancedSettings = {
      ...buildCreaturePropertiesDraft(creature).advancedSettings,
    };
    creature.creatureProperties!.advancedSettings!.leavesLootableCorpse = true;
    creature.creatureProperties!.advancedSettings!.treasureModelRow = 2;
    creature.creatureProperties!.advancedSettings!.corpseDecayTimeSeconds = 12;
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureAdvancedFlags: {
        disarmable: { present: false },
        plot: { present: false },
        immortal: { present: false },
        lootable: { present: true, value: 1 },
        noPermanentDeath: { present: false },
      },
      creatureBodyBag: {
        expectedValue: 2,
        tableSha256: "e".repeat(64),
        tableRowCount: 3,
      },
      creatureDecayTime: { expectedMilliseconds: 12_000 },
    };

    expect(buildCreaturePropertiesDraft(creature, catalog)).toMatchObject({
      bodyBagControlState: "ACTIVE_NOW",
      decayTimeControlState: "ACTIVE_NOW",
      advancedSettings: { treasureModelRow: 2, corpseDecayTimeSeconds: 12 },
    });

    creature.creatureProperties!.advancedSettings!.leavesLootableCorpse = false;
    expect(buildCreaturePropertiesDraft(creature, catalog)).toMatchObject({
      bodyBagControlState: "PRESERVE_ONLY",
      decayTimeControlState: "PRESERVE_ONLY",
      advancedSettings: { treasureModelRow: 2, corpseDecayTimeSeconds: 12 },
    });

    creature.creatureProperties!.advancedSettings!.leavesLootableCorpse = true;
    expect(buildCreaturePropertiesDraft(creature, {
      ...catalog,
      descriptor: { ...catalog.descriptor, sha256: "f".repeat(64) },
    })).toMatchObject({
      bodyBagControlState: "PRESERVE_ONLY",
      decayTimeControlState: "ACTIVE_NOW",
    });
  });

  it("activates ItemList only for exact retained Creature provenance", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 10);
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureInventoryItems: [{
        sourceIndex: 0,
        resRef: "nw_cloth022",
        x: 0,
        y: 0,
        dropable: false,
        pickpocketable: false
      }]
    };
    creature.creatureProperties!.inventoryItems = creature.source.creatureInventoryItems.map(
      (entry) => ({ ...entry })
    );

    const draft = buildCreaturePropertiesDraft(creature);

    expect(draft.inventoryControlState).toBe("ACTIVE_NOW");
    expect(draft.equippedItemsControlState).toBe("PRESERVE_ONLY");
    expect(draft.inventoryItems).toEqual(creature.source.creatureInventoryItems);
    expect(draft.inventoryItems).not.toBe(creature.creatureProperties?.inventoryItems);
  });

  it("keeps non-source-backed Creature inventory controls preserve-only", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 11);

    const draft = buildCreaturePropertiesDraft(creature);

    expect(draft.inventoryControlState).toBe("PRESERVE_ONLY");
    expect(draft.equippedItemsControlState).toBe("PRESERVE_ONLY");
  });

  it("activates Equip_ItemList only for exact retained Creature provenance and target", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 12);
    creature.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureEquippedItems: [{
        sourceIndex: 0,
        resRef: "nw_helm001",
        slotMask: 1,
        dropable: false,
        pickpocketable: false
      }]
    };
    creature.creatureProperties!.equippedItems = sourceSortedEquipment(creature);

    const draft = buildCreaturePropertiesDraft(creature);

    expect(draft.equippedItemsControlState).toBe("ACTIVE_NOW");
    expect(draft.equippedItems).toEqual(creature.creatureProperties?.equippedItems);
    expect(draft.equippedItems).not.toBe(creature.creatureProperties?.equippedItems);

    creature.creatureProperties!.equippedItems = [{
      ...creature.source.creatureEquippedItems[0]!,
      slotMask: 2
    }];
    expect(buildCreaturePropertiesDraft(creature).equippedItemsControlState).toBe("PRESERVE_ONLY");
  });

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
          startingPackageId: 0,
          treasureModel: "Default",
          corpseDecayTimeSeconds: 0,
          faction: "Hostile",
          subrace: "",
          deity: "",
          challengeRatingAdjustment: 0,
          soundSet: "",
          perceptionRange: "Default",
          walkRateId: 4,
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
    expect(draft.advancedSettings.startingPackageId).toBe(0);
    expect(draft.advancedSettings.walkRateId).toBe(4);
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

function sourceSortedEquipment(
  creature: ReturnType<typeof createNewSceneObject>
) {
  return creature.source?.creatureEquippedItems?.map((entry) => ({ ...entry })) ?? [];
}
