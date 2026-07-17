import { describe, expect, it } from "vitest";
import { mapCreatureApiListItemToSceneObject } from "../../../../src/modules/creatures/application/creatureSceneObjectMapper";
import type { CreatureApiListItem } from "../../../../src/modules/creatures/contracts";

describe("creatureSceneObjectMapper", () => {
  it("maps backend creature metadata into scene creature properties", () => {
    const item: CreatureApiListItem = {
      templateId: "cre_guard_captain",
      resref: "cre_guard",
      name: "Guard Captain",
      category: "npc",
      tags: ["guard"],
      previewImageUrl: "/api/v1/catalog/creatures/cre_guard_captain/thumbnail",
      metadata: {
        sourceEtag: "utc-etag-123",
        sourceFileType: "UTC",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 42,
        modelResRef: "raw_creature_model",
        templateResRef: "cre_guard",
        tag: "guard_captain",
        firstName: "Guard",
        firstNameStrRef: 1001,
        lastName: "Captain",
        lastNameStrRef: 1002,
        localizedName: "Guard Captain Localized",
        localizedNameStrRef: 1003,
        displayName: "Guard Captain Display",
        race: 6,
        raceLabel: "Human",
        raceLabelSource2daRow: 6,
        raceLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da",
        appearanceId: 123,
        appearanceLabel: "Guard_Human",
        appearanceLabelSource2daRow: 123,
        appearanceLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
        appearanceModelType: "P",
        appearanceRaceModel: "Human",
        appearancePortrait2da: "po_hm_guard",
        appearanceEnvMap: "default_env",
        appearanceDefaultPhenotype: "2",
        appearanceBloodColor: "R",
        appearanceSizeCategory: 4,
        appearanceSizeCategoryLabel: "Large",
        appearanceSizeCategorySource2daRow: 4,
        appearanceSizeCategorySourceKey: "modules/current/__aurora/sources/hak/lc_2da/creaturesize.2da",
        raceAppearanceId: 123,
        phenotype: 2,
        phenotypeLabel: "Large",
        gender: 0,
        genderLabel: "Female",
        genderLabelSource2daRow: 0,
        genderLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/gender.2da",
        description: "A source-backed guard.",
        descriptionStrRef: 2001,
        identifiedDescription: "Identified guard captain.",
        identifiedDescriptionStrRef: 2002,
        comments: "Palette guard comment",
        paletteId: 9,
        animationState: 2,
        animationName: "walk",
        challengeRating: 4,
        crAdjust: 1,
        portraitResRef: "po_hm_guard",
        portraitResolvedSource2daRow: 41,
        portraitResolvedSourceKey: "modules/current/__aurora/sources/hak/lc_2da/portraits.2da",
        conversation: "guard_talk",
        interruptable: false,
        plot: true,
        isPc: true,
        lootable: true,
        noPermDeath: true,
        isImmortal: false,
        bodyBag: true,
        startingPackage: true,
        disarmable: false,
        decayTime: 33,
        factionId: 7,
        subrace: "veteran",
        subraceStrRef: 3001,
        deity: "Helm",
        deityStrRef: 3002,
        soundSetFile: 55,
        soundSetLabel: "Guard",
        soundSetResRef: "ss_guard",
        soundSetSource2daRow: 55,
        soundSetSourceKey: "modules/current/__aurora/sources/hak/lc_2da/soundset.2da",
        perceptionRange: 11,
        goodEvil: 100,
        lawfulChaotic: 100,
        strength: 16,
        dexterity: 13,
        constitution: 14,
        intelligence: 10,
        wisdom: 12,
        charisma: 8,
        strengthAdjust: 1,
        dexterityAdjust: 2,
        constitutionAdjust: 3,
        intelligenceAdjust: 4,
        wisdomAdjust: 5,
        charismaAdjust: 6,
        fortitudeBonus: 3,
        reflexBonus: 2,
        willBonus: 1,
        naturalAc: 2,
        hitPoints: 36,
        currentHitPoints: 31,
        maxHitPoints: 42,
        walkRateEffective: 4,
        walkRateSource2daRow: 123,
        walkRateSource2daName: "appearance.2da",
        walkRateSpeed2daRow: 4,
        walkRateAppearance2daSourceKey: "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
        walkRateSpeed2daSourceKey: "modules/current/__aurora/sources/hak/lc_2da/creaturespeed.2da",
        appearanceHead: 9,
        bodyPartNeck: 1,
        bodyPartTorso: 2,
        bodyPartPelvis: 3,
        bodyPartBelt: 19,
        bodyPartRBicep: 4,
        bodyPartLBicep: 5,
        bodyPartRShoul: 20,
        bodyPartLShoul: 21,
        bodyPartRFArm: 6,
        bodyPartLFArm: 7,
        bodyPartRHand: 8,
        bodyPartLHand: 10,
        bodyPartRThigh: 11,
        bodyPartLThigh: 12,
        bodyPartRShin: 13,
        bodyPartLShin: 14,
        bodyPartRFoot: 15,
        bodyPartLFoot: 16,
        bodyPartRobe: 26,
        wingsNew: 17,
        tailNew: 18,
        colorSkin: 22,
        colorHair: 23,
        colorTattoo1: 24,
        colorTattoo2: 25,
        "script.scriptheartbeat": "nw_c2_default1",
        "script.scriptdialogue": "nw_c2_default4",
        classListCount: 1,
        classListEntries: JSON.stringify([
          {
            classId: 4,
            classLabel: "Fighter",
            level: 5,
            knownSpells: [
              {
                spellId: 101,
                spellLabel: "Magic_Missile",
                spellLevel: 2,
                metaMagic: 1,
                flags: 3
              }
            ],
            memorizedSpells: [
              {
                spellId: 202,
                spellLabel: "Cure_Light_Wounds",
                spellLevel: 3,
                metaMagic: 4,
                flags: 9
              }
            ]
          }
        ]),
        skillListCount: 2,
        skillListEntries: JSON.stringify([
          { skillId: 0, skillLabel: "Animal_Empathy", rank: 8 }
        ]),
        featListCount: 1,
        featListEntries: JSON.stringify([{ featId: 12, featLabel: "Weapon_Focus" }]),
        templateListCount: 1,
        templateListEntries: JSON.stringify([{ templateId: 77 }]),
        specAbilityListCount: 1,
        specAbilityListEntries: JSON.stringify([
          { spellId: 44, spellLabel: "Flame_Weapon", flags: 3, casterLevel: 9 }
        ]),
        inventoryItemListCount: 1,
        equipItemListCount: 1,
        inventoryItemListEntries: JSON.stringify([
          {
            resRef: "nw_wswmls001",
            randomResRef: "rnd_weapon",
            randomList: "rl_weapons",
            embeddedItem: {
              sourceStructTypeId: 4294967295,
              templateResRef: "emb_wswmls001",
              tag: "EMB_WSWMLS001",
              localizedName: "Embedded Longsword",
              baseItem: 1,
              itemPropertyListCount: 2,
              itemPropertyListEntries: [
                {
                  propertyName: 15,
                  subtype: 66,
                  costTable: 3,
                  costValue: 1,
                  chanceAppear: 100
                }
              ],
              fieldCount: 12
            },
            itemTemplateId: "item_nw_wswmls001",
            itemResref: "nw_wswmls001",
            itemSourceFingerprint: "uti-mainhand-fingerprint",
            itemSourceObjectKey: "templates/items/nw_wswmls001.uti",
            itemBaseItem: 1,
            itemBaseItemEquipableSlots: "0x30",
            x: 2,
            y: 3,
            dropable: true,
            pickpocketable: false,
            infinite: false
          }
        ]),
        equipItemListEntries: JSON.stringify([
          {
            resRef: "nw_maarcl001",
            randomResRef: "rnd_armor",
            randomList: "rl_armors",
            embeddedItem: {
              sourceStructTypeId: 4294967295,
              templateResRef: "emb_maarcl001",
              tag: "EMB_MAARCL001",
              localizedName: "Embedded Armor",
              baseItem: 16,
              itemPropertyListCount: 0,
              fieldCount: 19
            },
            itemTemplateId: "item_nw_maarcl001",
            itemResref: "nw_maarcl001",
            itemSourceFingerprint: "uti-armor-fingerprint",
            itemSourceObjectKey: "templates/items/nw_maarcl001.uti",
            itemBaseItem: 16,
            itemBaseItemEquipableSlots: "0x2",
            slotMask: 2,
            dropable: false,
            pickpocketable: false,
            infinite: true
          }
        ])
      }
    };

    const object = mapCreatureApiListItemToSceneObject(item, 7);

    expect(object).toMatchObject({
      id: "cre_template_cre_guard_captain",
      kind: "creatures",
      name: "Guard Captain",
      resRef: "cre_guard",
      tag: "GUARD_CAPTAIN",
      previewImageUrl: "/api/v1/catalog/creatures/cre_guard_captain/thumbnail",
      source: {
        sourceKind: "creature",
        templateId: "cre_guard_captain",
        sourceEtag: "utc-etag-123",
        sourceFileType: "UTC",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 42,
        sourceModelResRef: "raw_creature_model",
        appearanceType: 123
      },
      creatureProperties: {
        firstName: "Guard",
        lastName: "Captain",
        race: "Human",
        appearance: "Guard_Human",
        phenotype: "Large",
        gender: "Female",
        comments: "Palette guard comment",
        challengeRating: 4,
        conversation: "guard_talk",
        noInterrupt: true,
        alignment: "Lawful Good",
        statistics: {
          abilityScores: {
            strength: 16,
            dexterity: 13,
            constitution: 14,
            intelligence: 10,
            wisdom: 12,
            charisma: 8
          },
          racialModifiers: {
            strength: 1,
            dexterity: 2,
            constitution: 3,
            intelligence: 4,
            wisdom: 5,
            charisma: 6
          },
          saves: {
            fortitudeBonus: 3,
            reflexBonus: 2,
            willBonus: 1
          },
          naturalArmorClass: 2,
          baseHitPoints: 36,
          hitPointBonuses: 6,
          currentHitPoints: 31,
          maxHitPoints: 42,
          movementRate: "4"
        },
        scriptSlots: {
          onHeartbeat: "nw_c2_default1",
          onConversation: "nw_c2_default4"
        },
        appearanceSettings: {
          partBasedAppearance: true,
          head: "9",
          neck: "1",
          torso: "2",
          pelvis: "3",
          rightBicep: "4",
          leftBicep: "5",
          rightForearm: "6",
          leftForearm: "7",
          rightHand: "8",
          leftHand: "10",
          rightThigh: "11",
          leftThigh: "12",
          rightShin: "13",
          leftShin: "14",
          rightFoot: "15",
          leftFoot: "16",
          wings: "17",
          tail: "18",
          colors: {
            skin: "22",
            hair: "23",
            tattoo1: "24",
            tattoo2: "25"
          },
          sourceOnlyParts: {
            belt: "19",
            robe: "26",
            rightShoulder: "20",
            leftShoulder: "21"
          }
        },
        appearanceProfile: {
          source2daRow: 123,
          sourceKey: "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
          modelType: "P",
          raceModel: "Human",
          portrait2da: "po_hm_guard",
          envMap: "default_env",
          defaultPhenotype: "2",
          bloodColor: "R",
          sizeCategory: 4,
          sizeCategoryLabel: "Large",
          sizeCategorySource2daRow: 4,
          sizeCategorySourceKey: "modules/current/__aurora/sources/hak/lc_2da/creaturesize.2da",
          raceAppearanceId: 123
        },
        lookupProfile: {
          raceLabelSource2daRow: 6,
          raceLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da",
          genderLabelSource2daRow: 0,
          genderLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/gender.2da",
          portraitResolvedSource2daRow: 41,
          portraitResolvedSourceKey:
            "modules/current/__aurora/sources/hak/lc_2da/portraits.2da",
          soundSetResRef: "ss_guard",
          soundSetSource2daRow: 55,
          soundSetSourceKey: "modules/current/__aurora/sources/hak/lc_2da/soundset.2da"
        },
        listCounts: {
          classListCount: 1,
          skillListCount: 2,
          featListCount: 1,
          templateListCount: 1,
          specAbilityListCount: 1,
          inventoryItemListCount: 1,
          equipItemListCount: 1
        },
        localizedStringRefs: {
          firstName: 1001,
          lastName: 1002,
          localizedName: 1003,
          description: 2001,
          identifiedDescription: 2002,
          subrace: 3001,
          deity: 3002
        },
        localizedStrings: {
          localizedName: "Guard Captain Localized",
          displayName: "Guard Captain Display",
          identifiedDescription: "Identified guard captain."
        },
        advancedSettings: {
          blueprintResRef: "cre_guard",
          paletteId: 9,
          disarmable: false,
          plot: true,
          playerCharacter: true,
          leavesLootableCorpse: true,
          noPermanentDeath: true,
          bodyBag: true,
          startingPackage: true,
          corpseDecayTimeSeconds: 33,
          faction: "Faction 7",
          subrace: "veteran",
          deity: "Helm",
          challengeRatingAdjustment: 1,
          soundSet: "Guard",
          perceptionRange: "11",
          animationState: 2,
          animationName: "walk",
          walkRateSource2daRow: 123,
          walkRateSource2daName: "appearance.2da",
          walkRateSpeed2daRow: 4,
          walkRateAppearance2daSourceKey:
            "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
          walkRateSpeed2daSourceKey:
            "modules/current/__aurora/sources/hak/lc_2da/creaturespeed.2da"
        },
        classEntries: [{ classId: 4, className: "Fighter", level: 5 }],
        templateEntries: [{ templateId: 77 }],
        skills: [{ skill: "Animal_Empathy", rank: 8 }],
        feats: [{ featId: 12, name: "Weapon_Focus", type: "feat", assigned: true }],
        spells: [
          {
            spellId: 101,
            classIndex: 0,
            prepared: false,
            name: "Magic_Missile",
            spellLevel: 2,
            castingLevel: 5,
            metaMagic: 1,
            flags: 3
          },
          {
            spellId: 202,
            classIndex: 0,
            prepared: true,
            name: "Cure_Light_Wounds",
            spellLevel: 3,
            castingLevel: 5,
            metaMagic: 4,
            flags: 9
          }
        ],
        specialAbilities: [
          {
            spellId: 44,
            flags: 3,
            name: "Flame_Weapon",
            type: "Flags 3",
            casterLevel: 9,
            uses: 0
          }
        ],
        inventoryItems: [
          {
            resRef: "nw_wswmls001",
            randomResRef: "rnd_weapon",
            randomList: "rl_weapons",
            embeddedItem: {
              sourceStructTypeId: 4294967295,
              templateResRef: "emb_wswmls001",
              tag: "EMB_WSWMLS001",
              localizedName: "Embedded Longsword",
              baseItem: 1,
              itemPropertyListCount: 2,
              itemPropertyListEntries: [
                {
                  propertyName: 15,
                  subtype: 66,
                  costTable: 3,
                  costValue: 1,
                  chanceAppear: 100
                }
              ],
              fieldCount: 12
            },
            itemTemplateId: "item_nw_wswmls001",
            itemResRef: "nw_wswmls001",
            itemSourceFingerprint: "uti-mainhand-fingerprint",
            itemSourceObjectKey: "templates/items/nw_wswmls001.uti",
            itemBaseItem: 1,
            itemBaseItemEquipableSlots: "0x30",
            x: 2,
            y: 3,
            dropable: true,
            pickpocketable: false,
            infinite: false
          }
        ],
        equippedItems: [
          {
            resRef: "nw_maarcl001",
            randomResRef: "rnd_armor",
            randomList: "rl_armors",
            embeddedItem: {
              sourceStructTypeId: 4294967295,
              templateResRef: "emb_maarcl001",
              tag: "EMB_MAARCL001",
              localizedName: "Embedded Armor",
              baseItem: 16,
              itemPropertyListCount: 0,
              fieldCount: 19
            },
            itemTemplateId: "item_nw_maarcl001",
            itemResRef: "nw_maarcl001",
            itemSourceFingerprint: "uti-armor-fingerprint",
            itemSourceObjectKey: "templates/items/nw_maarcl001.uti",
            itemBaseItem: 16,
            itemBaseItemEquipableSlots: "0x2",
            slotMask: 2,
            dropable: false,
            pickpocketable: false,
            infinite: true
          }
        ]
      }
    });
  });

  it("maps typed Aurora VarTable metadata into scene properties", () => {
    const object = mapCreatureApiListItemToSceneObject({
      templateId: "cre_variables",
      resref: "cre_variables",
      name: "Variables Creature",
      category: "npc",
      tags: [],
      previewImageUrl: "",
      metadata: {
        variableListEntries: JSON.stringify([
          { name: "QuestStage", type: "int", value: 3 },
          { name: "Scale", type: "float", value: 1.25 },
          { name: "Greeting", type: "string", value: "hello" }
        ])
      }
    });

    expect(object.creatureProperties?.variables).toEqual([
      { name: "QuestStage", type: "int", value: 3 },
      { name: "Scale", type: "float", value: 1.25 },
      { name: "Greeting", type: "string", value: "hello" }
    ]);
  });

  it("uses Aurora load defaults for omitted source-backed ability and hit point fields", () => {
    const object = mapCreatureApiListItemToSceneObject({
      templateId: "cre_minimal",
      resref: "cre_minimal",
      name: "Minimal Creature",
      category: "npc",
      tags: [],
      previewImageUrl: "",
      metadata: {}
    });

    expect(object.creatureProperties?.statistics?.abilityScores).toEqual({
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0
    });
    expect(object.creatureProperties?.statistics?.baseHitPoints).toBe(0);
    expect(object.creatureProperties?.statistics?.currentHitPoints).toBe(0);
    expect(object.creatureProperties?.statistics?.maxHitPoints).toBe(0);
  });

  it("uses portraits.2da resolved resref when PortraitResRef is absent", () => {
    const object = mapCreatureApiListItemToSceneObject({
      templateId: "cre_portrait_only",
      resref: "cre_portrait",
      name: "Portrait Creature",
      category: "npc",
      tags: [],
      previewImageUrl: "",
      metadata: {
        portraitId: 41,
        portraitResolvedResRef: "po_hm_guard"
      }
    });

    expect(object.creatureProperties?.portraitResRef).toBe("po_hm_guard");
  });

  it("uses PortraitId as a source-backed fallback when no portrait resref is available", () => {
    const object = mapCreatureApiListItemToSceneObject({
      templateId: "cre_portrait_only",
      resref: "cre_portrait",
      name: "Portrait Creature",
      category: "npc",
      tags: [],
      previewImageUrl: "",
      metadata: {
        portraitId: 41
      }
    });

    expect(object.creatureProperties?.portraitResRef).toBe("Portrait 41");
  });

  it("uses effective Portrait id resolved from legacy Portrait resref when no portrait resref is available", () => {
    const object = mapCreatureApiListItemToSceneObject({
      templateId: "cre_portrait_effective",
      resref: "cre_portrait_effective",
      name: "Portrait Creature",
      category: "npc",
      tags: [],
      previewImageUrl: "",
      metadata: {
        portraitIdEffective: 41
      }
    });

    expect(object.creatureProperties?.portraitResRef).toBe("Portrait 41");
  });
});
