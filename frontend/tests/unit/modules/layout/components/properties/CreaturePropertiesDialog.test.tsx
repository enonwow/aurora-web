import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildCreaturePropertiesDraft } from "../../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { CreaturePropertiesDialog } from "../../../../../../src/modules/layout/components/properties/CreaturePropertiesDialog";
import { createNewSceneObject } from "../../../../../../src/modules/scene/domain/sceneFactory";

function renderInventoryDialog(options?: {
  includeEmbeddedItems?: boolean;
  slotMismatch?: boolean;
  activeTab?: "basic" | "statistics" | "classes" | "skills" | "feats" | "spells" |
    "specialAbilities" | "inventory" | "scripts" | "advanced" | "appearance" | "comments";
  variables?: Array<
    | { name: string; type: "int"; value: number }
    | { name: string; type: "float"; value: number }
    | { name: string; type: "string"; value: string }
  >;
  resourceOptions?: {
    portrait?: Array<{ resRef: string; label: string }>;
    conversation?: Array<{ resRef: string; label: string }>;
    soundset?: Array<{ resRef: string; label: string; soundSetFile: number }>;
  };
  includeItemTemplates?: boolean;
  exactItemList?: boolean;
  exactEquipmentList?: boolean;
  exactTag?: boolean;
  exactConversation?: boolean;
  exactInterruptable?: boolean;
  exactAdvancedFlags?: boolean;
  exactDeathRemains?: boolean;
  exactCreatureNames?: boolean;
  exactAppearance?: boolean;
  exactGender?: boolean;
  exactAppendages?: boolean;
  exactPerceptionRange?: boolean;
  exactWalkRate?: boolean;
  exactSoundSet?: boolean;
  exactStartingPackage?: boolean;
  exactSkillList?: boolean;
  exactSpecialAbilityList?: boolean;
  exactVariables?: boolean;
  exactEditorComment?: boolean;
  exactPortrait?: boolean;
  exactPhenotype?: boolean;
  exactChallengeRating?: boolean;
  exactAbilityScores?: boolean;
  exactAppearanceColors?: boolean;
  exactBodyParts?: boolean;
  exactHitPoints?: boolean;
  exactClassLevels?: boolean;
  exactClassIdentity?: boolean;
  classSpellClearConfirmed?: boolean;
  classSpellRemovalConfirmed?: boolean;
  classSpellReorderConfirmed?: boolean;
  exactNaturalArmorClass?: boolean;
  exactSavingThrowBonuses?: boolean;
  exactAlignment?: boolean;
  retainedAbilityScoresAbsent?: boolean;
  exactFaction?: boolean;
  exactTemplateResRef?: boolean;
  exactSpecialIdentityStrings?: "both" | "subrace";
  exactScriptResRefs?: "heartbeat-spawn" | "spawn";
  appearanceCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  appearanceCatalogError?: string;
  genderCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  genderCatalogError?: string;
  appendageCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  appendageCatalogError?: string;
  perceptionRangeCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  perceptionRangeCatalogError?: string;
  walkRateCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  walkRateCatalogError?: string;
  soundSetCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  soundSetCatalogError?: string;
  startingPackageCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  startingPackageCatalogError?: string;
  skillCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  skillCatalogError?: string;
  specialAbilityCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  specialAbilityCatalogError?: string;
  phenotypeCatalogStatus?: "unavailable" | "loading" | "ready" | "error";
  phenotypeCatalogError?: string;
}) {
  const creatureObject = createNewSceneObject("creatures", 1, 2, 3);
  if (!creatureObject.creatureProperties) {
    throw new Error("Expected creature defaults");
  }
  creatureObject.creatureProperties = {
    ...creatureObject.creatureProperties,
    inventoryItems: [
      {
        resRef: "nw_it_mpotion001",
        randomResRef: "rnd_potion",
        randomList: "rl_potions",
        itemResRef: "nw_it_mpotion001",
        x: 3,
        y: 4,
        dropable: true,
        pickpocketable: false,
        infinite: false
      },
      ...(options?.includeEmbeddedItems
        ? [
            {
              embeddedItem: {
                sourceStructTypeId: 4294967295,
                templateResRef: "emb_potion",
                tag: "EMB_POTION",
                localizedName: "Embedded Potion",
                localizedNameStrRef: 7001,
                baseItem: 49,
                itemPropertyListCount: 1,
                itemPropertyListEntries: [
                  {
                    propertyName: 15,
                    subtype: 0,
                    costTable: 2,
                    costValue: 5,
                    param1: 255,
                    param1Value: 0,
                    chanceAppear: 100
                  }
                ],
                fieldCount: 5
              },
              x: 7,
              y: 8,
              dropable: true,
              pickpocketable: false,
              infinite: false
            }
          ]
        : [])
    ],
    variables: options?.variables,
    equippedItems: [
      {
        resRef: "nw_wswmls001",
        randomResRef: "rnd_weapon",
        randomList: "rl_weapons",
        itemResRef: "nw_wswmls001",
        itemBaseItem: 1,
        itemBaseItemEquipableSlots: "0x10",
        slotMask: options?.slotMismatch ? 32 : 16,
        dropable: true,
        pickpocketable: false,
        infinite: false
      },
      ...(options?.includeEmbeddedItems
        ? [
            {
              embeddedItem: {
                sourceStructTypeId: 4294967295,
                templateResRef: "emb_sword",
                tag: "EMB_SWORD",
                localizedName: "Embedded Sword",
                baseItem: 1,
                itemPropertyListCount: 0,
                itemPropertyListEntries: [],
                fieldCount: 4
              },
              slotMask: 16,
              dropable: false,
              pickpocketable: false,
              infinite: true
            }
          ]
        : [])
    ]
  };
  if (options?.exactItemList) {
    const exactInventory = [
      {
        sourceIndex: 0,
        resRef: "nw_it_mpotion001",
        x: 3,
        y: 4,
        dropable: true,
        pickpocketable: false
      },
      {
        sourceIndex: 1,
        resRef: "nw_cloth022",
        x: 0,
        y: 0,
        dropable: false,
        pickpocketable: true
      }
    ];
    creatureObject.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureInventoryItems: exactInventory
    };
    creatureObject.creatureProperties.inventoryItems = exactInventory.map((entry) => ({
      ...entry
    }));
  }
  if (options?.exactEquipmentList) {
    const exactEquipment = [
      {
        sourceIndex: 0,
        resRef: "nw_sword001",
        slotMask: 16,
        dropable: true,
        pickpocketable: false
      },
      {
        sourceIndex: 1,
        resRef: "nw_helm001",
        slotMask: 1,
        dropable: false,
        pickpocketable: false
      }
    ];
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureEquippedItems: exactEquipment
    };
    creatureObject.creatureProperties.equippedItems = [
      { ...exactEquipment[1]! },
      { ...exactEquipment[0]! }
    ];
  }
  if (options?.exactTag) {
    creatureObject.tag = "  NW_CHICKEN  ";
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureTag: { present: true, value: "  NW_CHICKEN  " }
    };
  }
  if (options?.exactConversation) {
    creatureObject.creatureProperties.conversation = "Guard_Dialog";
    creatureObject.creatureProperties.noInterrupt = true;
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureConversation: { present: true, value: "Guard_Dialog" }
    };
  }
  if (options?.exactInterruptable) {
    creatureObject.creatureProperties.noInterrupt = true;
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureInterruptable: { present: true, value: 0 },
    };
  }
  if (options?.exactAdvancedFlags) {
    creatureObject.creatureProperties.advancedSettings = {
      ...creatureObject.creatureProperties.advancedSettings!,
      disarmable: true,
      plot: false,
      immortal: false,
      leavesLootableCorpse: true,
      noPermanentDeath: false,
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
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
  }
  const bodyBagCatalog = {
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
  if (options?.exactDeathRemains) {
    creatureObject.creatureProperties.advancedSettings = {
      ...buildCreaturePropertiesDraft(creatureObject).advancedSettings,
      leavesLootableCorpse: true,
      treasureModelRow: 2,
      corpseDecayTimeSeconds: 12,
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
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
  }
  if (options?.exactCreatureNames) {
    creatureObject.creatureProperties.firstName = "  Current Guard  ";
    creatureObject.creatureProperties.firstNameEntries = [
      { languageId: 42, text: "Legacy target" },
      { languageId: 0, text: "  Current Guard  " },
      { languageId: 10, text: "Straznik" },
    ];
    creatureObject.creatureProperties.lastName = "Resolved TLK surname";
    creatureObject.creatureProperties.description = "  Current description  ";
    creatureObject.creatureProperties.descriptionEntries = [
      { languageId: 0, text: "  Current description  " },
    ];
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureLocalizedStrings: {
        firstName: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 42, textBytesBase64: "TGVnYWN5" },
            { languageId: 0, textBytesBase64: "ICBHdWFyZCAg" },
            { languageId: 10, textBytesBase64: "U3RyYXpuaWs=" },
          ],
        },
        lastName: { present: true, strRef: 12_416, entries: [] },
        description: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "ICBDdXJyZW50IGRlc2NyaXB0aW9uICA=" }],
        },
      },
    };
  }
  if (options?.exactAppearance) {
    creatureObject.creatureProperties.appearanceType = 249;
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
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
  }
  if (options?.exactGender) {
    creatureObject.creatureProperties.genderId = 4;
    creatureObject.creatureProperties.gender = "None";
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
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
  }
  if (options?.exactAppendages) {
    creatureObject.creatureProperties.appearanceSettings = {
      ...creatureObject.creatureProperties.appearanceSettings!,
      wings: "3",
      tail: "2",
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureAppendages: {
        wings: {
          present: true,
          value: 3,
          modernDword: {
            present: true,
            nativeType: "dword",
            value: 3,
            table: {
              resourceName: "wingmodel.2da",
              sourceObjectKey: "runtime-source/vanilla/nwn_base.key/wingmodel.2da",
              sourceLayer: "vanilla",
              sha256: "9".repeat(64),
              sizeBytes: 350,
              rowCount: 8,
              rowIndex: 3,
            },
          },
          legacyByte: { present: true, nativeType: "byte", value: 1 },
        },
        tail: {
          present: true,
          value: 2,
          modernDword: {
            present: true,
            nativeType: "dword",
            value: 2,
            table: {
              resourceName: "tailmodel.2da",
              sourceObjectKey: "runtime-source/vanilla/nwn_base.key/tailmodel.2da",
              sourceLayer: "vanilla",
              sha256: "8".repeat(64),
              sizeBytes: 300,
              rowCount: 6,
              rowIndex: 2,
            },
          },
          legacyByte: { present: false },
        },
      },
    };
  }
  if (options?.exactPerceptionRange) {
    creatureObject.creatureProperties.advancedSettings = {
      ...buildCreaturePropertiesDraft(creatureObject).advancedSettings,
      perceptionRangeId: 11,
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creaturePerceptionRange: {
        present: true,
        nativeType: "byte",
        value: 11,
        table: {
          resourceName: "ranges.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/ranges.2da",
          sourceLayer: "vanilla",
          sha256: "e".repeat(64),
          sizeBytes: 1220,
          rowCount: 13,
          rowIndex: 11,
        },
      },
    };
  }
  if (options?.exactWalkRate) {
    creatureObject.creatureProperties.statistics = {
      ...creatureObject.creatureProperties.statistics!,
      movementRate: "Normal",
    };
    creatureObject.creatureProperties.advancedSettings = {
      ...buildCreaturePropertiesDraft(creatureObject).advancedSettings,
      walkRateId: 4,
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureWalkRate: {
        present: true,
        nativeType: "int",
        value: 4,
        table: {
          resourceName: "creaturespeed.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/creaturespeed.2da",
          sourceLayer: "vanilla",
          sha256: "d".repeat(64),
          sizeBytes: 4_096,
          rowCount: 9,
          rowIndex: 4,
          twoDaName: "NORM",
        },
      },
    };
  }
  if (options?.exactSoundSet) {
    creatureObject.creatureProperties.advancedSettings = {
      ...buildCreaturePropertiesDraft(creatureObject).advancedSettings,
      soundSet: "Aasimar",
      soundSetFile: 0,
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureSoundSetFile: {
        present: true,
        nativeType: "word",
        value: 0,
        table: {
          resourceName: "soundset.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundset.2da",
          sourceLayer: "vanilla",
          sha256: "a".repeat(64),
          sizeBytes: 336_678,
          rowCount: 5_100,
          rowIndex: 0,
          resRef: "c_aasimar",
        },
      },
    };
  }
  if (options?.exactStartingPackage) {
    creatureObject.creatureProperties.advancedSettings = {
      ...buildCreaturePropertiesDraft(creatureObject).advancedSettings,
      startingPackageId: 0,
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureStartingPackage: {
        present: true,
        nativeType: "byte",
        value: 0,
        classIds: [6],
        table: {
          resourceName: "packages.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
          sourceLayer: "vanilla",
          sha256: "b".repeat(64),
          sizeBytes: 30_510,
          rowCount: 132,
          rowIndex: 0,
          classId: 6,
        },
      },
    };
  }
  if (options?.exactSkillList) {
    creatureObject.creatureProperties.skills = [
      { skillId: 0, skill: "Skill 1", rank: 4 },
      { skillId: 1, skill: "Skill 2", rank: 0 },
      { skillId: 2, skill: "Skill 3", rank: 0 },
    ];
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureSkillList: {
        present: true,
        nativeType: "list",
        structTypeId: 0,
        rankNativeType: "byte",
        ranks: [4, 0],
        opaqueSiblingFieldCounts: [1, 0],
        table: {
          resourceName: "skills.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/skills.2da",
          sourceLayer: "vanilla",
          sha256: "c".repeat(64),
          sizeBytes: 12_345,
          rowCount: 3,
        },
      },
    };
  }
  if (options?.exactSpecialAbilityList) {
    creatureObject.creatureProperties.specialAbilities = [
      { spellId: 0, name: "Acid Fog", type: "Spells", casterLevel: 3, uses: 2 },
      { spellId: 2, name: "Aura of Cold", type: "Monster Abilities", casterLevel: 0, uses: 1 },
    ];
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureSpecialAbilityList: {
        present: true,
        nativeType: "list",
        structTypeId: 4,
        entries: [
          { spellId: 0, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
          { spellId: 0, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
          { spellId: 2, spellFlags: 1, casterLevel: 0, opaqueSiblingFieldCount: 0 },
        ],
        table: {
          resourceName: "spells.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/spells.2da",
          sourceLayer: "vanilla",
          sha256: "e".repeat(64),
          sizeBytes: 456_789,
          rowCount: 3,
        },
      },
    };
  }
  if (options?.exactPortrait) {
    creatureObject.creatureProperties.genderId ??= 0;
    creatureObject.creatureProperties.portraitId = 10;
    creatureObject.creatureProperties.portraitResRef = "po_hm_guard";
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creaturePortrait: {
        present: true,
        nativeType: "word",
        value: 10,
        selectorContext: { genderValue: 0, raceValue: 4 },
        table: {
          resourceName: "portraits.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
          sourceLayer: "vanilla",
          sha256: "f".repeat(64),
          sizeBytes: 100_000,
          rowCount: 16_001,
          rowIndex: 10,
          baseResRef: "po_hm_guard",
        },
      },
    };
  }
  if (options?.exactPhenotype) {
    creatureObject.creatureProperties.phenotypeId = 5;
    creatureObject.creatureProperties.phenotype = "Large_M";
    creatureObject.creatureProperties.appearanceType = 18;
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureAppearance: {
        present: true,
        nativeType: "word",
        value: 18,
        table: {
          resourceName: "appearance.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
          sourceLayer: "vanilla",
          sha256: "a".repeat(64),
          sizeBytes: 200_000,
          rowCount: 1_000,
          rowIndex: 18,
        },
      },
      creaturePhenotype: {
        present: true,
        nativeType: "int",
        value: 5,
        table: {
          resourceName: "phenotype.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/phenotype.2da",
          sourceLayer: "vanilla",
          sha256: "d".repeat(64),
          sizeBytes: 337,
          rowCount: 9,
          rowIndex: 5,
        },
      },
    };
  }
  if (options?.exactChallengeRating) {
    creatureObject.creatureProperties.challengeRating = 11.5;
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureChallengeRating: {
        present: true,
        nativeType: "float",
        value: 11.5,
      },
    };
  }
  if (options?.exactAbilityScores) {
    creatureObject.creatureProperties.statistics = {
      ...creatureObject.creatureProperties.statistics!,
      abilityScores: {
        strength: 15,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 11,
        charisma: 8,
      },
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureAbilityScores: {
        strength: { present: true, nativeType: "byte", value: 15 },
        dexterity: { present: true, nativeType: "byte", value: 12 },
        constitution: { present: true, nativeType: "byte", value: 14 },
        intelligence: { present: false },
        wisdom: { present: true, nativeType: "byte", value: 11 },
        charisma: { present: true, nativeType: "byte", value: 8 },
      },
    };
  }
  if (options?.exactAppearanceColors) {
    creatureObject.creatureProperties.appearanceSettings = {
      ...creatureObject.creatureProperties.appearanceSettings!,
      colors: { skin: "11", hair: "22", tattoo1: "33", tattoo2: "44" },
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureAppearanceColors: {
        skin: { present: true, nativeType: "byte", value: 11 },
        hair: { present: true, nativeType: "byte", value: 22 },
        tattoo1: { present: false },
        tattoo2: { present: true, nativeType: "byte", value: 44 },
      },
    };
  }
  if (options?.exactBodyParts) {
    const creatureBodyParts = Object.fromEntries([
      "rightFoot", "leftFoot", "rightShin", "leftShin", "leftThigh", "rightThigh",
      "pelvis", "torso", "belt", "neck", "rightForearm", "leftForearm",
      "rightBicep", "leftBicep", "rightShoulder", "leftShoulder", "rightHand",
      "leftHand", "head",
    ].map((key) => [key, { present: false }])) as Record<string, any>;
    Object.assign(creatureBodyParts, {
      rightFoot: {
        present: true,
        value: 12,
        legacyByte: { present: true, nativeType: "byte", value: 12 },
        wideWord: { present: false },
      },
      torso: {
        present: true,
        value: 4096,
        legacyByte: { present: true, nativeType: "byte", value: 0 },
        wideWord: { present: true, nativeType: "word", value: 4096 },
      },
      rightShoulder: {
        present: true,
        value: 1023,
        legacyByte: { present: false },
        wideWord: { present: true, nativeType: "word", value: 1023 },
      },
    });
    creatureObject.creatureProperties.appearanceSettings = {
      ...creatureObject.creatureProperties.appearanceSettings!,
      partBasedAppearance: true,
      rightFoot: "12",
      torso: "4096",
      sourceOnlyParts: {
        ...(creatureObject.creatureProperties.appearanceSettings?.sourceOnlyParts ?? {}),
        rightShoulder: "1023",
        robe: "77",
      },
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureBodyParts: creatureBodyParts as never,
    };
  }
  if (options?.exactHitPoints) {
    creatureObject.creatureProperties.statistics = {
      abilityScores: {
        strength: 10,
        dexterity: 10,
        constitution: 4,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      racialModifiers: {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      },
      saves: {
        fortitudeBase: 0,
        fortitudeBonus: 0,
        reflexBase: 0,
        reflexBonus: 0,
        willBase: 0,
        willBonus: 0,
      },
      naturalArmorClass: 0,
      baseArmorClass: 10,
      dexterityBonus: 0,
      sizeModifier: 0,
      baseHitPoints: 20,
      hitPointBonuses: -15,
      currentHitPoints: 45,
      maxHitPoints: 5,
      movementRate: "Normal",
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureAbilityScores: {
        strength: { present: false },
        dexterity: { present: false },
        constitution: { present: true, nativeType: "byte", value: 4 },
        intelligence: { present: false },
        wisdom: { present: false },
        charisma: { present: false },
      },
      creatureHitPointState: {
        present: true,
        hitPoints: { nativeType: "short", value: 20 },
        currentHitPoints: { nativeType: "short", value: 77 },
        maxHitPoints: { nativeType: "short", value: 88 },
        constitution: { nativeType: "byte", value: 4 },
        race: { nativeType: "byte", value: 1 },
        classLevels: [3, 2],
        featRow40Present: false,
        racialTypes: {
          resourceName: "racialtypes.2da",
          sourceObjectKey: "runtime-source/module/racialtypes.2da",
          sourceLayer: "module",
          sha256: "a".repeat(64),
          sizeBytes: 400,
          rowCount: 3,
          rowIndex: 1,
          constitutionAdjust: 0,
        },
      },
    };
  }
  if (options?.exactClassLevels) {
    creatureObject.creatureProperties.classEntries = [
      { classId: 4, className: "Fighter", level: 3 },
      { classId: 7, className: "Wizard", level: 2 },
    ];
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureClassLevelState: {
        present: true,
        nativeType: "list",
        structTypeId: 2,
        classNativeType: "int",
        levelNativeType: "short",
        entries: [
          { classId: 4, level: 3, opaqueSiblingFieldCount: 2 },
          { classId: 7, level: 2, opaqueSiblingFieldCount: 1 },
        ],
      },
      creatureHitPointState: {
        present: true,
        hitPoints: { nativeType: "short", value: 10 },
        currentHitPoints: { nativeType: "short", value: 7 },
        maxHitPoints: { nativeType: "short", value: 25 },
        constitution: { nativeType: "byte", value: 14 },
        race: { nativeType: "byte", value: 1 },
        classLevels: [3, 2],
        featRow40Present: false,
        racialTypes: {
          resourceName: "racialtypes.2da",
          sourceObjectKey: "runtime-source/module/racialtypes.2da",
          sourceLayer: "module",
          sha256: "a".repeat(64),
          sizeBytes: 400,
          rowCount: 3,
          rowIndex: 1,
          constitutionAdjust: 2,
        },
      },
    };
  }
  if (options?.exactClassIdentity) {
    creatureObject.creatureProperties.classEntries = [
      { classId: 4, className: "Fighter", level: 3 },
    ];
    creatureObject.creatureProperties.classSpellClearConfirmed =
      options.classSpellClearConfirmed ?? false;
    creatureObject.creatureProperties.classSpellRemovalConfirmed =
      options.classSpellRemovalConfirmed ?? false;
    creatureObject.creatureProperties.classSpellReorderConfirmed =
      options.classSpellReorderConfirmed ?? false;
    creatureObject.creatureProperties.advancedSettings = {
      ...buildCreaturePropertiesDraft(creatureObject).advancedSettings,
      startingPackageId: 0,
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_guard:source",
      sourceIndex: 0,
      creatureClassIdentityState: {
        present: true,
        nativeType: "list",
        structTypeId: 2,
        classNativeType: "int",
        levelNativeType: "short",
        classListGraphSha256: "c".repeat(64),
        entries: [{
          classId: 4,
          level: 3,
          opaqueSiblingFieldCount: 1,
          canonicalSpellListFieldCount: 2,
          spellEntryCount: 3,
          spellLists: [
            {
              listKind: "memorized",
              spellLevel: 0,
              entries: [
                { spellId: 11, spellMetaMagic: 0, spellFlags: 1,
                  opaqueSiblingFieldCount: 0 },
                { spellId: 12, spellMetaMagic: 2, spellFlags: 1,
                  opaqueSiblingFieldCount: 1 },
              ],
            },
            {
              listKind: "memorized",
              spellLevel: 1,
              entries: [
                { spellId: 22, spellMetaMagic: 0, spellFlags: 1,
                  opaqueSiblingFieldCount: 0 },
              ],
            },
          ],
        }],
        classesTable: {
          resourceName: "classes.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/classes.2da",
          sourceLayer: "vanilla",
          sha256: "a".repeat(64),
          sizeBytes: 12_000,
          rowCount: 64,
        },
      },
      creatureClassLevelState: {
        present: true,
        nativeType: "list",
        structTypeId: 2,
        classNativeType: "int",
        levelNativeType: "short",
        entries: [{ classId: 4, level: 3, opaqueSiblingFieldCount: 1 }],
      },
      creatureStartingPackage: {
        present: true,
        nativeType: "byte",
        value: 0,
        classIds: [4],
        table: {
          resourceName: "packages.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
          sourceLayer: "vanilla",
          sha256: "b".repeat(64),
          sizeBytes: 30_510,
          rowCount: 132,
          rowIndex: 0,
          classId: 4,
        },
      },
      creatureHitPointState: {
        present: true,
        hitPoints: { nativeType: "short", value: 10 },
        currentHitPoints: { nativeType: "short", value: 10 },
        maxHitPoints: { nativeType: "short", value: 19 },
        constitution: { nativeType: "byte", value: 14 },
        race: { nativeType: "byte", value: 1 },
        classLevels: [3],
        featRow40Present: false,
        racialTypes: {
          resourceName: "racialtypes.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/racialtypes.2da",
          sourceLayer: "vanilla",
          sha256: "d".repeat(64),
          sizeBytes: 8_000,
          rowCount: 64,
          rowIndex: 1,
          constitutionAdjust: 2,
        },
      },
    };
  }
  if (options?.exactNaturalArmorClass) {
    creatureObject.creatureProperties.statistics = {
      ...creatureObject.creatureProperties.statistics!,
      naturalArmorClass: 0,
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureNaturalArmorClass: {
        present: true,
        nativeType: "byte",
        value: 0,
      },
    };
  }
  if (options?.exactSavingThrowBonuses) {
    creatureObject.creatureProperties.statistics = {
      ...creatureObject.creatureProperties.statistics!,
      saves: {
        fortitudeBase: 0,
        fortitudeBonus: 3,
        reflexBase: 0,
        reflexBonus: 1,
        willBase: 0,
        willBonus: 2,
      },
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureSavingThrowBonuses: {
        fortitude: { present: true, nativeType: "short", value: 3 },
        reflex: { present: true, nativeType: "short", value: 1 },
        will: { present: false },
      },
    };
  }
  if (options?.exactAlignment) {
    creatureObject.creatureProperties.alignment = "True Neutral";
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureAlignment: {
        goodEvil: { present: true, nativeType: "byte", value: 50 },
        lawfulChaotic: { present: true, nativeType: "byte", value: 50 },
      },
    };
  }
  if (options?.retainedAbilityScoresAbsent) {
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureAbilityScores: {
        strength: { present: false },
        dexterity: { present: false },
        constitution: { present: false },
        intelligence: { present: false },
        wisdom: { present: false },
        charisma: { present: false },
      },
    };
  }
  const factionCatalog = {
    descriptor: {
      resourceName: "repute.fac" as const,
      sourceObjectKey: "runtime-source/module/repute.fac",
      sha256: "f".repeat(64),
      sizeBytes: 256,
      factionCount: 3,
    },
    rows: [
      { factionId: 0, name: "Commoner", parentFactionId: 0xffff_ffff, isGlobal: true },
      { factionId: 1, name: "Hostile", parentFactionId: 0xffff_ffff, isGlobal: true },
      { factionId: 2, name: "Defender", parentFactionId: 0xffff_ffff, isGlobal: true },
    ],
  };
  if (options?.exactFaction) {
    creatureObject.creatureProperties.advancedSettings = {
      ...creatureObject.creatureProperties.advancedSettings!,
      factionId: 1,
      faction: "Hostile",
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      creatureFaction: {
        expectedValue: 1,
        catalogSha256: "f".repeat(64),
        catalogFactionCount: 3,
      },
    };
  }
  if (options?.exactTemplateResRef) {
    creatureObject.resRef = "renderer_identity";
    creatureObject.creatureProperties.advancedSettings = {
      ...creatureObject.creatureProperties.advancedSettings!,
      blueprintResRef: "nw_guard",
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_guard:source",
      sourceIndex: 0,
      creatureTemplateResRef: { expectedResRef: "nw_guard" },
    };
  }
  if (options?.exactSpecialIdentityStrings) {
    creatureObject.creatureProperties.advancedSettings = {
      ...creatureObject.creatureProperties.advancedSettings!,
      subrace: "Moon Elf",
      deity: "Mystra",
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_guard:source",
      sourceIndex: 0,
      creatureSpecialIdentityStrings: {
        subrace: { expectedValue: "Moon Elf" },
        ...(options.exactSpecialIdentityStrings === "both"
          ? { deity: { expectedValue: "Mystra" } }
          : {}),
      },
    };
  }
  if (options?.exactScriptResRefs) {
    creatureObject.creatureProperties.scriptSlots = {
      ...creatureObject.creatureProperties.scriptSlots!,
      onHeartbeat: "NW_C2_DEFAULT1",
      onSpawn: "nw_c2_default9",
      onBlocked: "presentation_only",
    };
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_guard:source",
      sourceIndex: 0,
      creatureScriptResRefs: {
        ...(options.exactScriptResRefs === "heartbeat-spawn"
          ? { onHeartbeat: { expectedResRef: "NW_C2_DEFAULT1" } }
          : {}),
        onSpawn: { expectedResRef: "nw_c2_default9" },
      },
    };
  }
  if (options?.exactVariables) {
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_guard:source",
      sourceIndex: 0,
      creatureVariables: {
        expectedEntries: creatureObject.creatureProperties.variables.map((entry, sourceIndex) => ({
          sourceIndex,
          ...entry,
        })),
      },
    };
  }
  if (options?.exactEditorComment) {
    creatureObject.creatureProperties.comments = " exact guard note ";
    creatureObject.source = {
      ...(creatureObject.source ?? { type: "aurora_git" as const }),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:nw_guard:source",
      sourceIndex: 0,
      creatureEditorComment: " exact guard note ",
    };
  }

  const handlers = {
    addCreatureInventoryItem: vi.fn(),
    addCreatureInventoryItemFromTemplate: vi.fn(),
    updateCreatureInventoryItem: vi.fn(),
    moveCreatureInventoryItem: vi.fn(),
    removeCreatureInventoryItem: vi.fn(),
    addCreatureVariable: vi.fn(),
    updateCreatureVariable: vi.fn(),
    moveCreatureVariable: vi.fn(),
    removeCreatureVariable: vi.fn(),
    updateCreatureClassEntry: vi.fn(),
    appendCreatureClassSlot: vi.fn(),
    truncateCreatureClassSlot: vi.fn(),
    addCreatureEquippedItem: vi.fn(),
    addCreatureEquippedItemFromTemplate: vi.fn(),
    updateCreatureEquipmentItem: vi.fn(),
    removeCreatureEquipmentItem: vi.fn(),
    updateCreaturePropertiesDraftField: vi.fn(),
    updateCreatureSkillRank: vi.fn(),
    updateCreatureFeatAssigned: vi.fn(),
    updateCreatureSpecialAbility: vi.fn(),
    updateCreatureAdvancedField: vi.fn(),
    updateCreatureScriptSlot: vi.fn(),
    updateCreatureAppearancePart: vi.fn(),
    updateCreatureAppearanceSourceOnlyPart: vi.fn(),
    updateCreatureAppearanceColor: vi.fn(),
    onCreatureAppearanceSearch: vi.fn(),
    onCreatureGenderSearch: vi.fn(),
    onCreatureWingsSearch: vi.fn(),
    onCreatureTailSearch: vi.fn(),
    onCreaturePerceptionRangeSearch: vi.fn(),
    onCreatureWalkRateSearch: vi.fn(),
    onCreatureSoundSetSearch: vi.fn(),
    onCreatureStartingPackageSearch: vi.fn(),
    onCreatureClassSearch: vi.fn(),
    onCreaturePhenotypeSearch: vi.fn(),
  };
  const itemTemplate = createNewSceneObject("items", 0, 0, 7);
  itemTemplate.id = "itm_template_nw_wswmls001";
  itemTemplate.name = "Longsword";
  itemTemplate.resRef = "nw_wswmls001";
  itemTemplate.source = {
    type: "aurora_git",
    sourceKind: "item",
    templateId: "uti:nw_wswmls001"
  };
  itemTemplate.itemProperties = {
    baseItem: 1,
    baseItemEquipableSlots: "0x30"
  };

  render(
    <CreaturePropertiesDialog
      creaturePropertiesDialog={{
        objectId: creatureObject.id,
        snapshotObject: creatureObject,
        draft: buildCreaturePropertiesDraft(
          creatureObject,
          options?.exactDeathRemains ? bodyBagCatalog : null,
          options?.exactFaction ? factionCatalog : null,
        ),
        activeTab: options?.activeTab ?? "inventory",
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false
      }}
      creatureBodyBagCatalog={options?.exactDeathRemains ? bodyBagCatalog : null}
      creatureFactionCatalog={options?.exactFaction ? factionCatalog : null}
      creatureAppearanceCatalog={options?.exactAppearance &&
        (options.appearanceCatalogStatus ?? "ready") === "ready" ? {
        tableSha256: "a".repeat(64),
        rowCount: 1_000,
        query: "",
        items: [
          { rowIndex: 52, displayName: "Badger", displaySource: "label", label: "Badger" },
          { rowIndex: 249, displayName: "Dwarf, Male", displaySource: "strref", strRef: 1234 },
        ],
      } : null}
      creatureAppearanceCatalogStatus={
        options?.appearanceCatalogStatus ?? (options?.exactAppearance ? "ready" : "unavailable")
      }
      creatureAppearanceCatalogError={options?.appearanceCatalogError}
      creatureGenderCatalog={options?.exactGender &&
        (options.genderCatalogStatus ?? "ready") === "ready" ? {
        tableSha256: "c".repeat(64),
        rowCount: 5,
        query: "",
        items: [
          {
            rowIndex: 0,
            displayName: "Male",
            displaySource: "strref",
            nameStrRef: 156,
            genderToken: "M",
            constant: "GENDER_MALE",
          },
          {
            rowIndex: 3,
            displayName: "Other",
            displaySource: "strref",
            nameStrRef: 159,
            genderToken: "O",
            constant: "GENDER_OTHER",
          },
          {
            rowIndex: 4,
            displayName: "None",
            displaySource: "strref",
            nameStrRef: 160,
            genderToken: "N",
            constant: "GENDER_NONE",
          },
        ],
      } : null}
      creatureGenderCatalogStatus={
        options?.genderCatalogStatus ?? (options?.exactGender ? "ready" : "unavailable")
      }
      creatureGenderCatalogError={options?.genderCatalogError}
      creatureWingsCatalog={options?.exactAppendages &&
        (options.appendageCatalogStatus ?? "ready") === "ready" ? {
        kind: "wings",
        resourceName: "wingmodel.2da",
        tableSha256: "9".repeat(64),
        rowCount: 8,
        query: "",
        items: [
          { rowIndex: 1, displayName: "Bat" },
          { rowIndex: 3, displayName: "Angel" },
          { rowIndex: 7, displayName: "Demon" },
        ],
      } : null}
      creatureWingsCatalogStatus={
        options?.appendageCatalogStatus ?? (options?.exactAppendages ? "ready" : "unavailable")
      }
      creatureWingsCatalogError={options?.appendageCatalogError}
      creatureTailCatalog={options?.exactAppendages &&
        (options.appendageCatalogStatus ?? "ready") === "ready" ? {
        kind: "tail",
        resourceName: "tailmodel.2da",
        tableSha256: "8".repeat(64),
        rowCount: 6,
        query: "",
        items: [
          { rowIndex: 0, displayName: "None" },
          { rowIndex: 2, displayName: "Lizard" },
          { rowIndex: 5, displayName: "Dragon" },
        ],
      } : null}
      creatureTailCatalogStatus={
        options?.appendageCatalogStatus ?? (options?.exactAppendages ? "ready" : "unavailable")
      }
      creatureTailCatalogError={options?.appendageCatalogError}
      creaturePerceptionRangeCatalog={options?.exactPerceptionRange &&
        (options.perceptionRangeCatalogStatus ?? "ready") === "ready" ? {
        tableSha256: "e".repeat(64),
        rowCount: 13,
        query: "",
        items: [
          { rowIndex: 8, displayName: "Short", displaySource: "strref", nameStrRef: 6668 },
          { rowIndex: 9, displayName: "Medium", displaySource: "strref", nameStrRef: 6669 },
          { rowIndex: 10, displayName: "Long", displaySource: "strref", nameStrRef: 6670 },
          { rowIndex: 11, displayName: "Default", displaySource: "strref", nameStrRef: 6671 },
        ],
      } : null}
      creaturePerceptionRangeCatalogStatus={
        options?.perceptionRangeCatalogStatus ??
        (options?.exactPerceptionRange ? "ready" : "unavailable")
      }
      creaturePerceptionRangeCatalogError={options?.perceptionRangeCatalogError}
      creatureWalkRateCatalog={options?.exactWalkRate &&
        (options.walkRateCatalogStatus ?? "ready") === "ready" ? {
        tableSha256: "d".repeat(64),
        rowCount: 9,
        query: "",
        items: [
          {
            rowIndex: 2,
            displayName: "Slow",
            displaySource: "strref",
            nameStrRef: 1002,
            twoDaName: "SLOW",
          },
          {
            rowIndex: 4,
            displayName: "Normal",
            displaySource: "strref",
            nameStrRef: 1004,
            twoDaName: "NORM",
          },
        ],
      } : null}
      creatureWalkRateCatalogStatus={
        options?.walkRateCatalogStatus ?? (options?.exactWalkRate ? "ready" : "unavailable")
      }
      creatureWalkRateCatalogError={options?.walkRateCatalogError}
      creatureSoundSetCatalog={options?.exactSoundSet &&
        (options.soundSetCatalogStatus ?? "ready") === "ready" ? {
        tableSha256: "a".repeat(64),
        rowCount: 5_100,
        query: "",
        items: [
          {
            rowIndex: 0,
            displayName: "Aasimar",
            displaySource: "strref",
            nameStrRef: 8291,
            resRef: "c_aasimar",
          },
          {
            rowIndex: 27,
            displayName: "Custom Dragon",
            displaySource: "label",
            nameStrRef: null,
            resRef: "c_dragon",
          },
        ],
      } : null}
      creatureSoundSetCatalogStatus={
        options?.soundSetCatalogStatus ?? (options?.exactSoundSet ? "ready" : "unavailable")
      }
      creatureSoundSetCatalogError={options?.soundSetCatalogError}
      creatureStartingPackageCatalog={(options?.exactStartingPackage || options?.exactClassIdentity) &&
        (options.startingPackageCatalogStatus ?? "ready") === "ready" ? {
        tableSha256: "b".repeat(64),
        rowCount: 132,
        classIds: [options?.exactClassIdentity ? 4 : 6],
        query: "",
        items: [
          {
            rowIndex: 0,
            classId: options?.exactClassIdentity ? 4 : 6,
            displayName: "Fighter",
            displaySource: "strref",
            nameStrRef: 2_000,
          },
          {
            rowIndex: 2,
            classId: options?.exactClassIdentity ? 4 : 6,
            displayName: "Fighter Commander",
            displaySource: "label",
            nameStrRef: null,
          },
        ],
      } : null}
      creatureStartingPackageCatalogStatus={
        options?.startingPackageCatalogStatus ??
        (options?.exactStartingPackage || options?.exactClassIdentity ? "ready" : "unavailable")
      }
      creatureStartingPackageCatalogError={options?.startingPackageCatalogError}
      creatureClassCatalog={options?.exactClassIdentity ? {
        tableSha256: "a".repeat(64),
        rowCount: 64,
        query: "",
        items: [
          { rowIndex: 4, displayName: "Fighter", displaySource: "strref", nameStrRef: 104 },
          { rowIndex: 5, displayName: "Wizard", displaySource: "strref", nameStrRef: 105 },
        ],
      } : null}
      creatureClassCatalogStatus={options?.exactClassIdentity ? "ready" : "unavailable"}
      creatureSkillCatalog={options?.exactSkillList &&
        (options.skillCatalogStatus ?? "ready") === "ready" ? {
        tableSha256: "c".repeat(64),
        rowCount: 3,
        items: [
          { rowIndex: 0, nameStrRef: 3_000, displayName: "Animal Empathy" },
          { rowIndex: 2, nameStrRef: 3_002, displayName: "Concentration" },
        ],
      } : null}
      creatureSkillCatalogStatus={
        options?.skillCatalogStatus ?? (options?.exactSkillList ? "ready" : "unavailable")
      }
      creatureSkillCatalogError={options?.skillCatalogError}
      creatureSpecialAbilityCatalog={options?.exactSpecialAbilityList &&
        (options.specialAbilityCatalogStatus ?? "ready") === "ready" ? {
        tableSha256: "e".repeat(64),
        rowCount: 3,
        items: [
          { rowIndex: 0, nameStrRef: 4_000, userType: 1, displayName: "Acid Fog" },
          { rowIndex: 2, nameStrRef: 4_002, userType: 2, displayName: "Aura of Cold" },
        ],
      } : null}
      creatureSpecialAbilityCatalogStatus={
        options?.specialAbilityCatalogStatus ??
        (options?.exactSpecialAbilityList ? "ready" : "unavailable")
      }
      creatureSpecialAbilityCatalogError={options?.specialAbilityCatalogError}
      creaturePhenotypeCatalog={options?.exactPhenotype &&
        (options.phenotypeCatalogStatus ?? "ready") === "ready" ? {
        tableSha256: "d".repeat(64),
        rowCount: 9,
        sourceRowIndex: 5,
        appearanceTableSha256: "a".repeat(64),
        appearanceRowCount: 1_000,
        appearanceType: 18,
        query: "",
        items: [
          { rowIndex: 0, displayName: "Normal", displaySource: "strref", nameStrRef: 2223 },
          { rowIndex: 2, displayName: "Large", displaySource: "strref", nameStrRef: 2225 },
          { rowIndex: 5, displayName: "Large_M", displaySource: "strref", nameStrRef: 111016 },
        ],
      } : null}
      creaturePhenotypeCatalogStatus={
        options?.phenotypeCatalogStatus ?? (options?.exactPhenotype ? "ready" : "unavailable")
      }
      creaturePhenotypeCatalogError={options?.phenotypeCatalogError}
      creaturePortraitCatalog={options?.exactPortrait ? {
        descriptor: {
          resourceName: "portraits.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
          sourceLayer: "vanilla",
          sha256: "f".repeat(64),
          sizeBytes: 100_000,
          rowCount: 16_001,
        },
        rows: [
          { rowIndex: 10, baseResRef: "po_hm_guard", sex: 0, race: 6, plot: 0 },
          { rowIndex: 11, baseResRef: "po_em_guard", sex: 0, race: 1, plot: 0 },
          { rowIndex: 12, baseResRef: "po_hf_guard", sex: 1, race: 6, plot: 0 },
        ],
      } : null}
      toggleCreaturePropertiesDialogCollapsed={vi.fn()}
      cancelCreaturePropertiesDialog={vi.fn()}
      setCreaturePropertiesActiveTab={vi.fn()}
      updateCreaturePropertiesDraftField={handlers.updateCreaturePropertiesDraftField}
      updateCreatureClassEntry={handlers.updateCreatureClassEntry}
      appendCreatureClassSlot={handlers.appendCreatureClassSlot}
      truncateCreatureClassSlot={handlers.truncateCreatureClassSlot}
      updateCreatureSkillRank={handlers.updateCreatureSkillRank}
      updateCreatureScriptSlot={handlers.updateCreatureScriptSlot}
      updateCreatureAppearancePart={handlers.updateCreatureAppearancePart}
      updateCreatureAppearanceSourceOnlyPart={handlers.updateCreatureAppearanceSourceOnlyPart}
      updateCreatureAppearanceColor={handlers.updateCreatureAppearanceColor}
      updateCreatureAdvancedField={handlers.updateCreatureAdvancedField}
      addCreatureVariable={handlers.addCreatureVariable}
      updateCreatureVariable={handlers.updateCreatureVariable}
      moveCreatureVariable={handlers.moveCreatureVariable}
      removeCreatureVariable={handlers.removeCreatureVariable}
      applyCreaturePropertiesDraft={vi.fn()}
      creatureFeatsFilter="All Feats"
      setCreatureFeatsFilter={vi.fn()}
      creatureSpellsLevelFilter="All Levels"
      setCreatureSpellsLevelFilter={vi.fn()}
      creatureSpellsMetaMagicFilter="All Metamagic"
      setCreatureSpellsMetaMagicFilter={vi.fn()}
      creatureSpellsClassFilterIndex={0}
      setCreatureSpellsClassFilterIndex={vi.fn()}
      creatureSpecialAbilitiesFilter="All Spells and Abilities"
      setCreatureSpecialAbilitiesFilter={vi.fn()}
      creatureResourceOptions={options?.resourceOptions}
      itemTemplateOptions={options?.includeItemTemplates ? [itemTemplate] : []}
      {...handlers}
    />
  );

  return handlers;
}

describe("CreaturePropertiesDialog", () => {
  it("exposes exact retained Creature Comments as ACTIVE_NOW without normalization", () => {
    const handlers = renderInventoryDialog({
      activeTab: "comments",
      exactEditorComment: true,
    });
    const comments = screen.getByLabelText("Comments");
    expect(comments).toBeEnabled();
    expect(comments).toHaveAttribute("maxlength", "4096");
    expect(screen.getByText("Comments: ACTIVE_NOW")).toBeInTheDocument();

    fireEvent.change(comments, { target: { value: "  changed\ne\u0301  " } });
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "comments",
      "  changed\ne\u0301  ",
    );
  });

  it("keeps retained Creature Comments PRESERVE_ONLY without exact GIC provenance", () => {
    const handlers = renderInventoryDialog({ activeTab: "comments", exactTag: true });
    expect(screen.getByLabelText("Comments")).toBeDisabled();
    expect(screen.getByText("Comments: PRESERVE_ONLY")).toBeInTheDocument();
    expect(handlers.updateCreaturePropertiesDraftField).not.toHaveBeenCalled();
  });

  it("selects only catalog-bound Toolset Creature WalkRate rows", () => {
    const handlers = renderInventoryDialog({
      activeTab: "statistics",
      exactWalkRate: true,
    });
    const selector = screen.getByRole("combobox", { name: "Creature Walk Rate" });

    expect(selector).toBeEnabled();
    expect(selector).toHaveValue("4");
    expect(within(selector).getByRole("option", { name: "2 — Slow" })).toBeInTheDocument();
    expect(within(selector).queryByRole("option", { name: /0/u })).not.toBeInTheDocument();
    fireEvent.change(selector, { target: { value: "2" } });
    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("walkRateId", 2);

    fireEvent.change(screen.getByRole("searchbox", {
      name: "Creature Walk Rate Search",
    }), { target: { value: "slow" } });
    fireEvent.click(screen.getByRole("button", {
      name: "Search Creature Walk Rate rows",
    }));
    expect(handlers.onCreatureWalkRateSearch).toHaveBeenCalledWith("slow");
  });

  it("keeps retained WalkRate preserve-only and explains catalog failure", () => {
    renderInventoryDialog({
      activeTab: "statistics",
      exactWalkRate: true,
      walkRateCatalogStatus: "error",
      walkRateCatalogError: "The authoritative creaturespeed.2da identity changed.",
    });

    expect(screen.queryByRole("combobox", { name: "Creature Walk Rate" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Creature Walk Rate" })).toBeDisabled();
    expect(screen.getByRole("alert"))
      .toHaveTextContent("The authoritative creaturespeed.2da identity changed.");
  });

  it("selects only native Toolset Creature PerceptionRange rows", () => {
    const handlers = renderInventoryDialog({
      activeTab: "advanced",
      exactPerceptionRange: true,
    });
    const selector = screen.getByRole("combobox", { name: "Creature Perception Range" });

    expect(selector).toBeEnabled();
    expect(selector).toHaveValue("11");
    expect(within(selector).getByRole("option", { name: "8 — Short" })).toBeInTheDocument();
    expect(within(selector).queryByRole("option", { name: /7/u })).not.toBeInTheDocument();
    fireEvent.change(selector, { target: { value: "9" } });
    expect(handlers.updateCreatureAdvancedField)
      .toHaveBeenCalledWith("perceptionRangeId", 9);

    fireEvent.change(screen.getByRole("searchbox", {
      name: "Creature Perception Range Search",
    }), { target: { value: "medium" } });
    fireEvent.click(screen.getByRole("button", {
      name: "Search Creature Perception Range rows",
    }));
    expect(handlers.onCreaturePerceptionRangeSearch).toHaveBeenCalledWith("medium");
  });

  it("keeps PerceptionRange preserve-only and explains catalog failure", () => {
    renderInventoryDialog({
      activeTab: "advanced",
      exactPerceptionRange: true,
      perceptionRangeCatalogStatus: "error",
      perceptionRangeCatalogError: "The authoritative ranges.2da identity changed.",
    });

    expect(screen.queryByRole("combobox", { name: "Creature Perception Range" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Creature Perception Range" })).toBeDisabled();
    expect(screen.getByRole("alert"))
      .toHaveTextContent("The authoritative ranges.2da identity changed.");
  });

  it("selects only Toolset-admitted digest-bound Creature PortraitId rows", () => {
    const handlers = renderInventoryDialog({ activeTab: "basic", exactPortrait: true });
    const selector = screen.getByRole("combobox", { name: "Creature Portrait" });

    expect(selector).toBeEnabled();
    expect(selector).toHaveValue("10");
    expect(within(selector).getByRole("option", { name: "11 — po_em_guard" }))
      .toBeInTheDocument();
    expect(within(selector).queryByRole("option", { name: /12/u })).not.toBeInTheDocument();
    fireEvent.change(selector, { target: { value: "11" } });
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith("portraitId", 11);
    expect(screen.queryByRole("button", { name: "Browse portrait" })).not.toBeInTheDocument();
  });

  it("keeps retained PortraitId preserve-only when Gender no longer matches", () => {
    renderInventoryDialog({ activeTab: "basic", exactPortrait: true, exactGender: true });

    expect(screen.getByRole("combobox", { name: "Creature Portrait" })).toBeDisabled();
    expect(screen.getByText("Portrait: PRESERVE_ONLY")).toBeInTheDocument();
  });

  it("selects only Toolset-admitted digest-bound Creature Appearance rows", () => {
    const handlers = renderInventoryDialog({ activeTab: "basic", exactAppearance: true });
    const selector = screen.getByRole("combobox", { name: "Creature Appearance Type" });

    expect(selector).toBeEnabled();
    expect(selector).toHaveValue("249");
    expect(within(selector).getByRole("option", { name: "52 — Badger" })).toBeInTheDocument();
    fireEvent.change(selector, { target: { value: "52" } });
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith("appearanceType", 52);

    fireEvent.change(screen.getByRole("searchbox", { name: "Creature Appearance Search" }), {
      target: { value: "badger" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search Creature Appearance rows" }));
    expect(handlers.onCreatureAppearanceSearch).toHaveBeenCalledWith("badger");
  });

  it("keeps retained Creature Race visibly preserve-only until coupled recalculation is implemented", () => {
    const handlers = renderInventoryDialog({ activeTab: "basic" });

    expect(screen.getByText("Race: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Race" })).toBeDisabled();
    expect(handlers.updateCreaturePropertiesDraftField).not.toHaveBeenCalled();
  });

  it("keeps Appearance_Type preserve-only and explains a catalog failure", () => {
    renderInventoryDialog({
      activeTab: "basic",
      exactAppearance: true,
      appearanceCatalogStatus: "error",
      appearanceCatalogError: "The authoritative appearance.2da identity changed.",
    });

    expect(screen.queryByRole("combobox", { name: "Creature Appearance Type" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Creature Appearance Type" }))
      .toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Creature Appearance Type" }))
      .toHaveValue("249");
    expect(screen.getByRole("alert"))
      .toHaveTextContent("The authoritative appearance.2da identity changed.");
  });

  it("selects only Toolset-admitted digest-bound Creature Gender physical rows", () => {
    const handlers = renderInventoryDialog({ activeTab: "basic", exactGender: true });
    const selector = screen.getByRole("combobox", { name: "Creature Gender" });

    expect(selector).toBeEnabled();
    expect(selector).toHaveValue("4");
    expect(within(selector).getByRole("option", { name: "3 — Other" })).toBeInTheDocument();
    fireEvent.change(selector, { target: { value: "0" } });
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith("genderId", 0);

    fireEvent.change(screen.getByRole("searchbox", { name: "Creature Gender Search" }), {
      target: { value: "male" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search Creature Gender rows" }));
    expect(handlers.onCreatureGenderSearch).toHaveBeenCalledWith("male");
  });

  it("keeps Gender preserve-only and explains a catalog failure", () => {
    renderInventoryDialog({
      activeTab: "basic",
      exactGender: true,
      genderCatalogStatus: "error",
      genderCatalogError: "The authoritative gender.2da identity changed.",
    });

    expect(screen.queryByRole("combobox", { name: "Creature Gender" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Creature Gender" }))
      .toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Creature Gender" }))
      .toHaveValue("4");
    expect(screen.getByRole("alert"))
      .toHaveTextContent("The authoritative gender.2da identity changed.");
  });

  it("selects only Toolset-admitted digest-bound Creature Phenotype physical rows", () => {
    const handlers = renderInventoryDialog({ activeTab: "basic", exactPhenotype: true });
    const selector = screen.getByRole("combobox", { name: "Creature Phenotype" });

    expect(selector).toBeEnabled();
    expect(selector).toHaveValue("5");
    expect(within(selector).getByRole("option", { name: "2 — Large" })).toBeInTheDocument();
    expect(within(selector).queryByRole("option", { name: /^1/u })).not.toBeInTheDocument();
    fireEvent.change(selector, { target: { value: "2" } });
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith("phenotypeId", 2);

    fireEvent.change(screen.getByRole("searchbox", { name: "Creature Phenotype Search" }), {
      target: { value: "large" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search Creature Phenotype rows" }));
    expect(handlers.onCreaturePhenotypeSearch).toHaveBeenCalledWith("large");
  });

  it("keeps Phenotype preserve-only and explains a catalog failure", () => {
    renderInventoryDialog({
      activeTab: "basic",
      exactPhenotype: true,
      phenotypeCatalogStatus: "error",
      phenotypeCatalogError: "The authoritative phenotype.2da identity changed.",
    });

    expect(screen.queryByRole("combobox", { name: "Creature Phenotype" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Creature Phenotype" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Creature Phenotype" })).toHaveValue("5");
    expect(screen.getByRole("alert"))
      .toHaveTextContent("The authoritative phenotype.2da identity changed.");
  });

  it("edits ChallengeRating only with exact retained Float provenance", () => {
    const handlers = renderInventoryDialog({
      activeTab: "basic",
      exactChallengeRating: true,
    });

    expect(screen.getByText("Challenge Rating: ACTIVE_NOW")).toBeInTheDocument();
    const challengeRating = screen.getByRole("spinbutton", { name: "Challenge Rating" });
    expect(challengeRating).toBeEnabled();
    expect(challengeRating).toHaveAttribute("max", "1000");
    fireEvent.change(challengeRating, { target: { value: "0.1" } });
    expect(handlers.updateCreaturePropertiesDraftField)
      .toHaveBeenCalledWith("challengeRating", 0.1);
  });

  it("keeps unproven ChallengeRating visible and preserve-only", () => {
    renderInventoryDialog({ activeTab: "basic" });

    expect(screen.getByText("Challenge Rating: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Challenge Rating" })).toBeDisabled();
  });

  it("keeps CRAdjust preserve-only while editing proven ChallengeRating in Advanced", () => {
    const handlers = renderInventoryDialog({
      activeTab: "advanced",
      exactChallengeRating: true,
    });

    expect(screen.getByText("Adjustment: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Challenge Rating Adjustment" }))
      .toBeDisabled();
    const challengeRating = screen.getByRole("spinbutton", {
      name: "Challenge Rating",
    });
    expect(challengeRating).toBeEnabled();
    fireEvent.change(challengeRating, { target: { value: "7.25" } });
    expect(handlers.updateCreaturePropertiesDraftField)
      .toHaveBeenCalledWith("challengeRating", 7.25);
  });

  it("edits each base ability score only with its exact retained Byte provenance", () => {
    const handlers = renderInventoryDialog({
      activeTab: "statistics",
      exactAbilityScores: true,
    });

    expect(screen.getByText("Strength: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Intelligence: PRESERVE_ONLY")).toBeInTheDocument();
    const strength = screen.getByRole("spinbutton", { name: "Strength score" });
    expect(strength).toBeEnabled();
    expect(strength).toHaveAttribute("min", "0");
    expect(strength).toHaveAttribute("max", "255");
    expect(screen.getByRole("spinbutton", { name: "Intelligence score" })).toBeDisabled();
    fireEvent.change(strength, { target: { value: "17" } });
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith("strength", 17);
  });

  it("edits each appearance color only with its exact retained Byte provenance", () => {
    const handlers = renderInventoryDialog({
      activeTab: "appearance",
      exactAppearanceColors: true,
    });

    expect(screen.getByText("Skin: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Tattoo 1: PRESERVE_ONLY")).toBeInTheDocument();
    const skin = screen.getByRole("spinbutton", { name: "Skin color" });
    expect(skin).toBeEnabled();
    expect(skin).toHaveAttribute("min", "0");
    expect(skin).toHaveAttribute("max", "255");
    expect(screen.getByRole("spinbutton", { name: "Tattoo 1 color" })).toBeDisabled();
    fireEvent.change(skin, { target: { value: "12" } });
    expect(handlers.updateCreatureAppearanceColor).toHaveBeenCalledWith("skin", "12");
  });

  it("edits only exact retained Creature body parts with source-specific capacity", () => {
    const handlers = renderInventoryDialog({
      activeTab: "appearance",
      exactBodyParts: true,
    });

    expect(screen.getByText("Right Foot: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Left Foot: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByText("Torso: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Right Shoulder: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Robe: PRESERVE_ONLY")).toBeInTheDocument();
    const rightFoot = screen.getByRole("spinbutton", { name: "Creature Right Foot" });
    const torso = screen.getByRole("spinbutton", { name: "Creature Torso" });
    const leftFoot = screen.getByRole("spinbutton", { name: "Creature Left Foot" });
    const rightShoulder = screen.getByRole("spinbutton", {
      name: "Creature Right Shoulder",
    });
    expect(rightFoot).toBeEnabled();
    expect(rightFoot).toHaveAttribute("max", "255");
    expect(torso).toBeEnabled();
    expect(torso).toHaveAttribute("max", "65535");
    expect(leftFoot).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Use part-based appearance" })).toBeDisabled();
    fireEvent.change(rightFoot, { target: { value: "13" } });
    expect(handlers.updateCreatureAppearancePart).toHaveBeenCalledWith("rightFoot", "13");
    fireEvent.change(rightShoulder, { target: { value: "1024" } });
    expect(handlers.updateCreatureAppearanceSourceOnlyPart)
      .toHaveBeenCalledWith("rightShoulder", "1024");
  });

  it("selects only digest-bound Toolset wings and tail physical rows", () => {
    const handlers = renderInventoryDialog({
      activeTab: "appearance",
      exactAppendages: true,
    });

    expect(screen.getByText("Wings: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Tail: ACTIVE_NOW")).toBeInTheDocument();
    const wings = screen.getByRole("combobox", { name: "Creature Wings" });
    const tail = screen.getByRole("combobox", { name: "Creature Tail" });
    expect(wings).toHaveValue("3");
    expect(tail).toHaveValue("2");
    expect(within(wings).getByRole("option", { name: "7 — Demon" })).toBeInTheDocument();
    expect(within(tail).getByRole("option", { name: "5 — Dragon" })).toBeInTheDocument();

    fireEvent.change(wings, { target: { value: "7" } });
    fireEvent.change(tail, { target: { value: "5" } });
    expect(handlers.updateCreatureAppearancePart).toHaveBeenCalledWith("wings", "7");
    expect(handlers.updateCreatureAppearancePart).toHaveBeenCalledWith("tail", "5");

    fireEvent.change(screen.getByRole("searchbox", { name: "Creature Wings Search" }), {
      target: { value: "demon" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search Creature Wings rows" }));
    expect(handlers.onCreatureWingsSearch).toHaveBeenCalledWith("demon");
  });

  it("keeps retained wings and tail preserve-only when their catalog identity changed", () => {
    renderInventoryDialog({
      activeTab: "appearance",
      exactAppendages: true,
      appendageCatalogStatus: "error",
      appendageCatalogError: "The authoritative appendage table identity changed.",
    });

    expect(screen.queryByRole("combobox", { name: "Creature Wings" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Creature Wings" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Creature Tail" })).toBeDisabled();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.getAllByRole("alert")[0])
      .toHaveTextContent("The authoritative appendage table identity changed.");
  });

  it("keeps all racial modifiers and unproven base ability scores preserve-only", () => {
    renderInventoryDialog({
      activeTab: "statistics",
      retainedAbilityScoresAbsent: true,
    });

    expect(screen.getByText("Strength: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Strength score" })).toBeDisabled();
    expect(screen.getByText("Strength Racial Modifier: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Strength racial modifier" }))
      .toBeDisabled();
  });

  it("edits coupled Constitution/Base HP and keeps derived HP values read-only", () => {
    const handlers = renderInventoryDialog({
      activeTab: "statistics",
      exactHitPoints: true,
    });

    expect(screen.getByText("Constitution: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Base Hit Points: ACTIVE_NOW")).toBeInTheDocument();
    const baseHitPoints = screen.getByRole("spinbutton", { name: "Base Hit Points" });
    expect(baseHitPoints).toBeEnabled();
    expect(baseHitPoints).toHaveAttribute("min", "20");
    expect(baseHitPoints).toHaveAttribute("max", "10000");
    fireEvent.change(baseHitPoints, { target: { value: "21" } });
    expect(handlers.updateCreaturePropertiesDraftField)
      .toHaveBeenCalledWith("baseHitPoints", 21);

    expect(screen.getByRole("spinbutton", { name: "Hit Point Bonuses" }))
      .toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Hit Point Bonuses" }))
      .toHaveValue(-15);
    expect(screen.getByRole("spinbutton", { name: "Current Hit Points" }))
      .toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Max Hit Points" }))
      .toBeDisabled();
  });

  it("keeps retained Base HP and Constitution preserve-only without a bound table", () => {
    renderInventoryDialog({ activeTab: "statistics", exactAbilityScores: true });

    expect(screen.getByText("Constitution: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByText("Base Hit Points: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Constitution score" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Base Hit Points" })).toBeDisabled();
  });

  it("edits Natural AC only with exact retained Byte provenance", () => {
    const handlers = renderInventoryDialog({
      activeTab: "statistics",
      exactNaturalArmorClass: true,
    });

    expect(screen.getByText("Natural AC: ACTIVE_NOW")).toBeInTheDocument();
    const naturalArmorClass = screen.getByRole("spinbutton", { name: "Natural AC" });
    expect(naturalArmorClass).toBeEnabled();
    expect(naturalArmorClass).toHaveAttribute("min", "0");
    expect(naturalArmorClass).toHaveAttribute("max", "255");
    fireEvent.change(naturalArmorClass, { target: { value: "2" } });
    expect(handlers.updateCreaturePropertiesDraftField)
      .toHaveBeenCalledWith("naturalArmorClass", 2);
  });

  it("keeps unproven retained Natural AC visible and preserve-only", () => {
    renderInventoryDialog({ activeTab: "statistics", exactAbilityScores: true });

    expect(screen.getByText("Natural AC: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Natural AC" })).toBeDisabled();
  });

  it("edits only exact retained Creature saving-throw Shorts", () => {
    const handlers = renderInventoryDialog({
      activeTab: "statistics",
      exactSavingThrowBonuses: true,
    });

    expect(screen.getByText("Fortitude Bonus: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Reflex Bonus: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Will Bonus: PRESERVE_ONLY")).toBeInTheDocument();
    const fortitude = screen.getByRole("spinbutton", { name: "Fortitude bonus" });
    expect(fortitude).toBeEnabled();
    expect(fortitude).toHaveAttribute("min", "0");
    expect(fortitude).toHaveAttribute("max", "250");
    expect(screen.getByRole("spinbutton", { name: "Will bonus" })).toBeDisabled();
    fireEvent.change(fortitude, { target: { value: "5" } });
    expect(handlers.updateCreaturePropertiesDraftField)
      .toHaveBeenCalledWith("fortitudeBonus", 5);
  });

  it("keeps all unproven retained Creature saving-throw bonuses preserve-only", () => {
    renderInventoryDialog({ activeTab: "statistics", exactNaturalArmorClass: true });

    expect(screen.getByText("Fortitude Bonus: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Fortitude bonus" })).toBeDisabled();
    expect(screen.getByText("Reflex Bonus: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Reflex bonus" })).toBeDisabled();
    expect(screen.getByText("Will Bonus: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Will bonus" })).toBeDisabled();
  });

  it("edits Creature alignment only with a complete exact retained Byte pair", () => {
    const handlers = renderInventoryDialog({ activeTab: "classes", exactAlignment: true });

    expect(screen.getByText("Alignment: ACTIVE_NOW")).toBeInTheDocument();
    const alignment = screen.getByRole("combobox", { name: "Creature Alignment" });
    expect(alignment).toBeEnabled();
    fireEvent.change(alignment, { target: { value: "Lawful Good" } });
    expect(handlers.updateCreaturePropertiesDraftField)
      .toHaveBeenCalledWith("alignment", "Lawful Good");
  });

  it("keeps unproven retained Creature alignment visible and preserve-only", () => {
    renderInventoryDialog({ activeTab: "classes", exactNaturalArmorClass: true });

    expect(screen.getByText("Alignment: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Creature Alignment" })).toBeDisabled();
  });

  it("keeps retained Creature ClassList visible and preserve-only until exact coupled mutation is admitted", () => {
    renderInventoryDialog({ activeTab: "classes", exactNaturalArmorClass: true });

    expect(screen.getByText("ClassList: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Class 1 ID" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Class 1 name" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Class 1 level" })).toBeDisabled();
  });

  it("edits retained levels only with exact ClassList and coupled HP provenance", () => {
    const handlers = renderInventoryDialog({ activeTab: "classes", exactClassLevels: true });

    expect(screen.getByText("Class IDs/spells: PRESERVE_ONLY · levels: ACTIVE_NOW"))
      .toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Class 1 ID" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Class 1 name" })).toBeDisabled();
    const level = screen.getByRole("spinbutton", { name: "Class 1 level" });
    expect(level).toBeEnabled();
    expect(level).toHaveAttribute("max", "60");
    fireEvent.change(level, { target: { value: "4" } });
    expect(handlers.updateCreatureClassEntry).toHaveBeenCalledWith(0, "level", 4);
  });

  it("keeps class ID and level controls active under the combined exact contract", () => {
    const handlers = renderInventoryDialog({ activeTab: "classes", exactClassIdentity: true });

    expect(screen.getByText(
      "Class IDs/levels: ACTIVE_NOW · slot count: TAIL_ONLY · changed-slot spells: DESTRUCTIVE_CLEAR",
    )).toBeInTheDocument();
    const classId = screen.getByRole("combobox", { name: "Class 1 ID" });
    const level = screen.getByRole("spinbutton", { name: "Class 1 level" });
    expect(classId).toBeEnabled();
    expect(level).toBeEnabled();
    fireEvent.change(classId, { target: { value: "5" } });
    fireEvent.change(level, { target: { value: "4" } });
    expect(handlers.updateCreatureClassEntry).toHaveBeenCalledWith(0, "classId", 5);
    expect(handlers.updateCreatureClassEntry).toHaveBeenCalledWith(0, "level", 4);
  });

  it("exposes the bounded retained class spell-list clear only with exact source provenance", () => {
    const handlers = renderInventoryDialog({ activeTab: "spells", exactClassIdentity: true });

    expect(screen.getByText("Class spell-list clear: ACTIVE_NOW")).toBeInTheDocument();
    const confirmation = screen.getByRole("checkbox", {
      name: "Confirm class spell list clear",
    });
    expect(confirmation).toBeEnabled();
    expect(screen.getByRole("button", { name: "Clear Class Spell List" })).toBeDisabled();

    fireEvent.click(confirmation);
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "classSpellClearConfirmed",
      true,
    );
  });

  it("stages a confirmed clear for the selected spell-owning class slot", () => {
    const handlers = renderInventoryDialog({
      activeTab: "spells",
      exactClassIdentity: true,
      classSpellClearConfirmed: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear Class Spell List" }));

    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "classSpellClearSlotIndices",
      [0],
    );
  });

  it("stages and can undo one exact retained spell-entry removal", () => {
    const handlers = renderInventoryDialog({
      activeTab: "spells",
      exactClassIdentity: true,
      classSpellRemovalConfirmed: true,
    });

    expect(screen.getByText("Exact spell-entry removal: ACTIVE_NOW")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Remove Entry" })[0]!);
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "classSpellRemovalTargets",
      [{ classSlotIndex: 0, listKind: "memorized", spellLevel: 0, entryIndex: 0 }],
    );
  });

  it("stages an exact same-list spell-entry reorder", () => {
    const handlers = renderInventoryDialog({
      activeTab: "spells",
      exactClassIdentity: true,
      classSpellReorderConfirmed: true,
    });

    expect(screen.getByText("Exact spell-entry order: ACTIVE_NOW")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {
      name: "Move spell 11 down in memorized L0",
    }));
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "classSpellReorders",
      [{
        classSlotIndex: 0,
        listKind: "memorized",
        spellLevel: 0,
        entryOrder: [1, 0],
      }],
    );
  });

  it("keeps exact spell-entry reorder preserve-only without bounded provenance", () => {
    renderInventoryDialog({ activeTab: "spells" });

    expect(screen.getByText("Exact spell-entry order: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Confirm class spell entry reorder" }))
      .toBeDisabled();
  });

  it("keeps exact spell-entry removal preserve-only without bounded provenance", () => {
    renderInventoryDialog({ activeTab: "spells" });

    expect(screen.getByText("Exact spell-entry removal: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Confirm class spell entry removal" }))
      .toBeDisabled();
  });

  it("keeps class spell-list clear preserve-only without exact source provenance", () => {
    renderInventoryDialog({ activeTab: "spells" });

    expect(screen.getByText("Class spell-list clear: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Confirm class spell list clear" }))
      .toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear Class Spell List" })).toBeDisabled();
  });

  it("admits only a tail append and prevents truncating the last retained class slot", () => {
    const handlers = renderInventoryDialog({ activeTab: "classes", exactClassIdentity: true });

    const append = screen.getByRole("button", { name: "Add class slot" });
    const truncate = screen.getByRole("button", { name: "Remove last class slot" });
    expect(append).toBeEnabled();
    expect(truncate).toBeDisabled();
    fireEvent.click(append);
    expect(handlers.appendCreatureClassSlot).toHaveBeenCalledTimes(1);
    expect(handlers.truncateCreatureClassSlot).not.toHaveBeenCalled();
  });

  it("keeps local new-Creature ClassList controls active", () => {
    renderInventoryDialog({ activeTab: "classes" });

    expect(screen.getByText("ClassList: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Class 1 ID" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Class 1 name" })).toBeEnabled();
    expect(screen.getByRole("spinbutton", { name: "Class 1 level" })).toBeEnabled();
  });

  it("keeps retained Creature SkillList visible and preserve-only until exact ordinal mutation is admitted", () => {
    renderInventoryDialog({ activeTab: "skills", exactNaturalArmorClass: true });

    expect(screen.getByText("SkillList: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
    for (const rank of screen.getAllByRole("spinbutton")) {
      expect(rank).toBeDisabled();
    }
  });

  it("edits only Toolset-visible physical SkillList rows with exact catalog admission", () => {
    const handlers = renderInventoryDialog({ activeTab: "skills", exactSkillList: true });

    expect(screen.getByText("SkillList: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Animal Empathy rank" })).toBeEnabled();
    const concentration = screen.getByRole("spinbutton", { name: "Concentration rank" });
    expect(concentration).toBeEnabled();
    expect(screen.queryByRole("spinbutton", { name: "Skill 2 rank" })).not.toBeInTheDocument();
    fireEvent.change(concentration, { target: { value: "8" } });
    expect(handlers.updateCreatureSkillRank).toHaveBeenCalledWith(2, 8);
  });

  it("edits grouped SpecAbilityList uses and caster level only with exact catalog admission", () => {
    const handlers = renderInventoryDialog({
      activeTab: "specialAbilities",
      exactSpecialAbilityList: true,
    });

    expect(screen.getByText("SpecAbilityList: ACTIVE_NOW")).toBeInTheDocument();
    const acidUses = screen.getByRole("spinbutton", { name: "Uses for Acid Fog" });
    const acidCaster = screen.getByRole("spinbutton", { name: "Caster level for Acid Fog" });
    const auraUses = screen.getByRole("spinbutton", { name: "Uses for Aura of Cold" });
    const auraCaster = screen.getByRole("spinbutton", { name: "Caster level for Aura of Cold" });
    expect(acidUses).toBeEnabled();
    expect(acidCaster).toBeEnabled();
    expect(auraUses).toBeEnabled();
    expect(auraCaster).toBeDisabled();

    fireEvent.change(acidUses, { target: { value: "3" } });
    fireEvent.change(acidCaster, { target: { value: "5" } });
    fireEvent.change(auraUses, { target: { value: "0" } });
    expect(handlers.updateCreatureSpecialAbility).toHaveBeenNthCalledWith(
      1, 0, "uses", 3,
    );
    expect(handlers.updateCreatureSpecialAbility).toHaveBeenNthCalledWith(
      2, 0, "casterLevel", 5,
    );
    expect(handlers.updateCreatureSpecialAbility).toHaveBeenNthCalledWith(
      3, 2, "uses", 0,
    );
  });

  it("keeps local new-Creature SkillList controls active", () => {
    renderInventoryDialog({ activeTab: "skills" });

    expect(screen.getByText("SkillList: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
    for (const rank of screen.getAllByRole("spinbutton")) {
      expect(rank).toBeEnabled();
    }
  });

  it("keeps Tag preserve-only when exact retained Creature provenance is unavailable", () => {
    renderInventoryDialog({ activeTab: "basic" });

    expect(screen.getByText("Tag: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^tag$/i })).toBeDisabled();
    expect(screen.getByText("FirstName: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByText("LastName: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByText("Description: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /first name/i })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: /last name/i })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: /^description$/i })).toBeDisabled();
  });

  it("edits each Creature name only when that exact localized-string member is admitted", () => {
    const handlers = renderInventoryDialog({ activeTab: "basic", exactCreatureNames: true });
    const firstName = screen.getByRole("textbox", { name: /^first name$/i });
    const lastName = screen.getByRole("textbox", { name: /^last name$/i });
    const description = screen.getByRole("textbox", { name: /^description$/i });

    expect(screen.getByText("FirstName: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("LastName: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByText("Description: ACTIVE_NOW")).toBeInTheDocument();
    expect(firstName).toBeEnabled();
    expect(firstName).toHaveAttribute("maxlength", "256");
    expect(firstName).toHaveValue("  Current Guard  ");
    expect(lastName).toBeDisabled();
    expect(lastName).toHaveValue("Resolved TLK surname");
    expect(description).toBeEnabled();
    expect(description).toHaveAttribute("maxlength", "4096");
    expect(description).toHaveValue("  Current description  ");

    fireEvent.change(firstName, { target: { value: "  Captain  " } });
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "firstName",
      "  Captain  ",
    );
    fireEvent.change(description, { target: { value: "  New description  " } });
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "description",
      "  New description  ",
    );
  });

  it("edits, reorders, catalog-adds, and removes complete Creature localized-string lists", () => {
    const handlers = renderInventoryDialog({ activeTab: "basic", exactCreatureNames: true });
    const firstEntries = screen.getByRole("group", {
      name: "Creature First Name localized entries",
    });
    expect(within(firstEntries).getByRole("textbox", {
      name: "Creature First Name entry 42",
    })).toHaveValue("Legacy target");

    fireEvent.change(within(firstEntries).getByRole("textbox", {
      name: "Creature First Name entry 42",
    }), { target: { value: "Legacy edited" } });
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "firstNameEntries",
      [
        { languageId: 42, text: "Legacy edited" },
        { languageId: 0, text: "  Current Guard  " },
        { languageId: 10, text: "Straznik" },
      ],
    );

    fireEvent.click(within(firstEntries).getByRole("button", {
      name: "Move Creature First Name entry 0 up",
    }));
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "firstNameEntries",
      [
        { languageId: 0, text: "  Current Guard  " },
        { languageId: 42, text: "Legacy target" },
        { languageId: 10, text: "Straznik" },
      ],
    );

    const addFirstEntry = screen.getByRole("group", {
      name: "Add Creature First Name localized entry",
    });
    fireEvent.change(within(addFirstEntry).getByRole("combobox", {
      name: "Creature First Name entry to add",
    }), { target: { value: "2" } });
    fireEvent.change(within(addFirstEntry).getByRole("textbox", {
      name: "New Creature First Name entry text",
    }), { target: { value: "Garde" } });
    fireEvent.click(within(addFirstEntry).getByRole("button", {
      name: "Add Creature First Name entry",
    }));
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "firstNameEntries",
      [
        { languageId: 42, text: "Legacy target" },
        { languageId: 0, text: "  Current Guard  " },
        { languageId: 10, text: "Straznik" },
        { languageId: 2, text: "Garde" },
      ],
    );

    const descriptionEntries = screen.getByRole("group", {
      name: "Creature Description localized entries",
    });
    fireEvent.click(within(descriptionEntries).getByRole("button", {
      name: "Remove Creature Description entry 0",
    }));
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "descriptionEntries",
      [],
    );
  });

  it("edits an exact retained Creature Tag verbatim within Aurora's 32-code-unit limit", () => {
    const handlers = renderInventoryDialog({ activeTab: "basic", exactTag: true });

    expect(screen.getByText("Tag: ACTIVE_NOW")).toBeInTheDocument();
    const tagInput = screen.getByRole("textbox", { name: /^tag$/i });
    expect(tagInput).toBeEnabled();
    expect(tagInput).toHaveAttribute("maxlength", "32");

    fireEvent.change(tagInput, { target: { value: "  EXACT TAG  " } });
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "tag",
      "  EXACT TAG  "
    );
  });

  it("keeps unproven Creature Conversation and No Interrupt preserve-only", () => {
    renderInventoryDialog({ activeTab: "basic" });

    expect(screen.getByText("Conversation: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^conversation$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Browse conversation" })).toBeDisabled();
    expect(screen.getByText("No Interrupt: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "No Interrupt" })).toBeDisabled();
  });

  it("edits No Interrupt only for exact retained Creature Interruptable provenance", () => {
    const handlers = renderInventoryDialog({ activeTab: "basic", exactInterruptable: true });

    expect(screen.getByText("No Interrupt: ACTIVE_NOW")).toBeInTheDocument();
    const noInterrupt = screen.getByRole("checkbox", { name: "No Interrupt" });
    expect(noInterrupt).toBeEnabled();
    expect(noInterrupt).toBeChecked();
    fireEvent.click(noInterrupt);
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "noInterrupt",
      false,
    );
  });

  it("exposes each Creature advanced flag only when its exact native Byte is present", () => {
    const handlers = renderInventoryDialog({ activeTab: "advanced", exactAdvancedFlags: true });

    expect(screen.getByText(/Disarmable=ACTIVE_NOW/)).toBeInTheDocument();
    expect(screen.getByText(/Plot=ACTIVE_NOW/)).toBeInTheDocument();
    expect(screen.getByText(/Immortal=PRESERVE_ONLY/)).toBeInTheDocument();
    expect(screen.getByText(/Lootable=ACTIVE_NOW/)).toBeInTheDocument();
    expect(screen.getByText(/NoPermDeath=PRESERVE_ONLY/)).toBeInTheDocument();

    const disarmable = screen.getByRole("checkbox", { name: "Disarmable" });
    const plot = screen.getByRole("checkbox", { name: "Plot" });
    const lootable = screen.getByRole("checkbox", { name: "Leaves Lootable Corpse" });
    const immortal = screen.getByRole("checkbox", { name: "Immortal" });
    const noPermanentDeath = screen.getByRole("checkbox", { name: "No Permanent Death" });
    expect(disarmable).toBeEnabled();
    expect(plot).toBeEnabled();
    expect(lootable).toBeEnabled();
    expect(immortal).toBeDisabled();
    expect(noPermanentDeath).toBeDisabled();

    fireEvent.click(plot);
    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("plot", true);
  });

  it("uses catalog-bound Treasure Model and bounded DecayTime instead of the guessed Body Bag flag", () => {
    const handlers = renderInventoryDialog({ activeTab: "advanced", exactDeathRemains: true });

    expect(screen.getByText(/Treasure Model=ACTIVE_NOW/)).toBeInTheDocument();
    expect(screen.getByText(/DecayTime=ACTIVE_NOW/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Body Bag" })).not.toBeInTheDocument();

    const treasureModel = screen.getByRole("combobox", { name: "Treasure Model" });
    const decayTime = screen.getByRole("spinbutton", { name: "Corpse Decay Time (s)" });
    expect(treasureModel).toBeEnabled();
    expect(treasureModel).toHaveValue("2");
    expect(within(treasureModel).getByRole("option", { name: "Bag" })).toHaveValue("1");
    expect(decayTime).toBeEnabled();
    expect(decayTime).toHaveAttribute("min", "5");
    expect(decayTime).toHaveAttribute("max", "32767");

    fireEvent.change(treasureModel, { target: { value: "1" } });
    fireEvent.change(decayTime, { target: { value: "15" } });
    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("treasureModelRow", 1);
    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith(
      "corpseDecayTimeSeconds",
      15,
    );
  });

  it("selects Creature FactionID only from the exact repute.fac catalog", () => {
    const handlers = renderInventoryDialog({ activeTab: "advanced", exactFaction: true });

    expect(screen.getByText("FactionID: ACTIVE_NOW")).toBeInTheDocument();
    const faction = screen.getByRole("combobox", { name: "Faction" });
    expect(faction).toBeEnabled();
    expect(faction).toHaveValue("1");
    expect(within(faction).getByRole("option", { name: "0 — Commoner" })).toBeInTheDocument();
    expect(within(faction).getByRole("option", { name: "2 — Defender" })).toBeInTheDocument();

    fireEvent.change(faction, { target: { value: "2" } });
    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("factionId", 2);
  });

  it("keeps Creature FactionID preserve-only without exact catalog provenance", () => {
    renderInventoryDialog({ activeTab: "advanced" });

    expect(screen.getByText("FactionID: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Faction" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Faction" })).toBeDisabled();
  });

  it("edits Creature TemplateResRef only with exact retained provenance", () => {
    const handlers = renderInventoryDialog({ activeTab: "advanced", exactTemplateResRef: true });

    expect(screen.getByText("TemplateResRef: ACTIVE_NOW")).toBeInTheDocument();
    const blueprintResRef = screen.getByRole("textbox", { name: "Blueprint ResRef" });
    expect(blueprintResRef).toBeEnabled();
    expect(blueprintResRef).toHaveValue("nw_guard");
    expect(blueprintResRef).toHaveAttribute("maxlength", "16");

    fireEvent.change(blueprintResRef, { target: { value: "nw_guard_alt" } });
    expect(handlers.updateCreatureAdvancedField)
      .toHaveBeenCalledWith("blueprintResRef", "nw_guard_alt");
  });

  it("keeps Creature TemplateResRef visible and preserve-only without exact provenance", () => {
    renderInventoryDialog({ activeTab: "advanced" });

    expect(screen.getByText("TemplateResRef: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Blueprint ResRef" })).toBeDisabled();
  });

  it("gates every Creature script slot through its own retained ResRef provenance", () => {
    const handlers = renderInventoryDialog({
      activeTab: "scripts",
      exactScriptResRefs: "heartbeat-spawn",
    });

    expect(screen.getByText("OnHeartbeat: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("OnSpawn: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("OnBlocked: PRESERVE_ONLY")).toBeInTheDocument();
    const heartbeat = screen.getByRole("combobox", { name: "OnHeartbeat" });
    const spawn = screen.getByRole("combobox", { name: "OnSpawn" });
    const blocked = screen.getByRole("combobox", { name: "OnBlocked" });
    expect(heartbeat).toBeEnabled();
    expect(spawn).toBeEnabled();
    expect(blocked).toBeDisabled();
    expect(heartbeat).toHaveAttribute("maxlength", "16");
    expect(heartbeat).toHaveAttribute("pattern", "[a-z0-9_]*");

    fireEvent.change(heartbeat, { target: { value: "main" } });
    expect(handlers.updateCreatureScriptSlot).toHaveBeenCalledWith("onHeartbeat", "main");
  });

  it("keeps all unproven Creature script slots visible and preserve-only", () => {
    renderInventoryDialog({ activeTab: "scripts" });

    expect(screen.getByText("OnHeartbeat: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByText("OnSpawn: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "OnHeartbeat" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "OnSpawn" })).toBeDisabled();
  });

  it("edits Creature Subrace and Deity only through their exact per-field provenance", () => {
    const handlers = renderInventoryDialog({
      activeTab: "advanced",
      exactSpecialIdentityStrings: "both",
    });

    expect(screen.getByText("Subrace: ACTIVE_NOW; Deity: ACTIVE_NOW")).toBeInTheDocument();
    const subrace = screen.getByRole("textbox", { name: "Subrace" });
    const deity = screen.getByRole("textbox", { name: "Deity" });
    expect(subrace).toBeEnabled();
    expect(deity).toBeEnabled();
    expect(subrace).toHaveAttribute("maxlength", "256");
    fireEvent.change(subrace, { target: { value: "Sun Elf" } });
    fireEvent.change(deity, { target: { value: "Selune" } });
    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("subrace", "Sun Elf");
    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("deity", "Selune");
  });

  it("keeps each unproven Creature special-identity member preserve-only", () => {
    renderInventoryDialog({
      activeTab: "advanced",
      exactSpecialIdentityStrings: "subrace",
    });

    expect(screen.getByText("Subrace: ACTIVE_NOW; Deity: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Subrace" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Deity" })).toBeDisabled();
  });

  it("keeps unproven Creature death-remains controls visible and preserve-only", () => {
    renderInventoryDialog({ activeTab: "advanced" });

    expect(screen.getByText(/Treasure Model=PRESERVE_ONLY/)).toBeInTheDocument();
    expect(screen.getByText(/DecayTime=PRESERVE_ONLY/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Treasure Model" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Corpse Decay Time (s)" })).toBeDisabled();
  });

  it("edits Aurora VarTable entries with typed values", () => {
    const handlers = renderInventoryDialog({
      activeTab: "advanced",
      variables: [{ name: "HitCounter", type: "int", value: 4 }]
    });

    fireEvent.click(screen.getByRole("button", { name: /variables \(1\)/i }));
    fireEvent.change(screen.getByLabelText("Variable 1 name"), {
      target: { value: "HitCounterEdited" }
    });
    fireEvent.change(screen.getByLabelText("Variable 1 type"), {
      target: { value: "string" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add variable" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove variable 1" }));

    expect(handlers.updateCreatureVariable).toHaveBeenCalledWith(0, {
      name: "HitCounterEdited",
      type: "int",
      value: 4
    });
    expect(handlers.updateCreatureVariable).toHaveBeenCalledWith(0, {
      name: "HitCounter",
      type: "string",
      value: ""
    });
    expect(handlers.addCreatureVariable).toHaveBeenCalledTimes(1);
    expect(handlers.removeCreatureVariable).toHaveBeenCalledWith(0);
  });

  it("reorders an exact retained Creature VarTable and marks it active", () => {
    const handlers = renderInventoryDialog({
      activeTab: "advanced",
      exactVariables: true,
      variables: [
        { name: "First", type: "int", value: 1 },
        { name: "Second", type: "string", value: "two" },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: /variables \(2\)/i }));
    expect(screen.getByText("VarTable: ACTIVE_NOW")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Move variable 1 down" }));
    expect(handlers.moveCreatureVariable).toHaveBeenCalledWith(0, "down");
  });

  it("keeps retained Creature variables preserve-only without exact VarTable provenance", () => {
    const handlers = renderInventoryDialog({
      activeTab: "advanced",
      exactTemplateResRef: true,
      variables: [{ name: "Counter", type: "int", value: 1 }],
    });

    fireEvent.click(screen.getByRole("button", { name: /variables \(1\)/i }));
    expect(screen.getByText("VarTable: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByLabelText("Variable 1 name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add variable" })).toBeDisabled();
    expect(handlers.addCreatureVariable).not.toHaveBeenCalled();
  });

  it("selects conversation values from module resource options", () => {
    const handlers = renderInventoryDialog({
      activeTab: "basic",
      exactConversation: true,
      resourceOptions: {
        conversation: [{ resRef: "guard_talk", label: "Guard Talk" }]
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Browse conversation" }));
    expect(screen.getByText("Conversation: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^conversation$/i })).toHaveAttribute(
      "maxlength",
      "16"
    );
    expect(screen.getByText("No Interrupt: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "No Interrupt" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Select conversation"), {
      target: { value: "guard_talk" }
    });

    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "conversation",
      "guard_talk"
    );
  });

  it("selects soundset ID and label from module resource options", () => {
    const handlers = renderInventoryDialog({
      activeTab: "advanced",
      resourceOptions: {
        soundset: [{ resRef: "ss_guard", label: "Guard", soundSetFile: 12 }]
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Browse sound set" }));
    fireEvent.change(screen.getByLabelText("Select sound set"), {
      target: { value: "12" }
    });

    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("soundSetFile", 12);
    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("soundSet", "Guard");
  });

  it("selects only exact digest-bound Toolset Creature SoundSetFile rows", () => {
    const handlers = renderInventoryDialog({
      activeTab: "advanced",
      exactSoundSet: true,
    });

    expect(screen.getByText("Sound Set: ACTIVE_NOW")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Browse sound set" }));
    const selector = screen.getByRole("combobox", { name: "Creature Sound Set" });
    expect(selector).toHaveValue("0");
    expect(within(selector).getByRole("option", {
      name: "Aasimar [0] (c_aasimar)",
    })).toBeInTheDocument();
    expect(within(selector).getByRole("option", {
      name: "Custom Dragon [27] (c_dragon)",
    })).toBeInTheDocument();
    fireEvent.change(selector, { target: { value: "27" } });
    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("soundSetFile", 27);

    fireEvent.click(screen.getByRole("button", { name: "Browse sound set" }));
    fireEvent.change(screen.getByLabelText("Search Creature Sound Set rows"), {
      target: { value: "dragon" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(handlers.onCreatureSoundSetSearch).toHaveBeenCalledWith("dragon");
  });

  it("keeps retained SoundSetFile preserve-only and explains catalog failure", () => {
    renderInventoryDialog({
      activeTab: "advanced",
      exactSoundSet: true,
      soundSetCatalogStatus: "error",
      soundSetCatalogError: "The authoritative soundset.2da identity changed.",
    });

    expect(screen.getByText("Sound Set: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse sound set" })).toBeDisabled();
    expect(screen.getByRole("alert"))
      .toHaveTextContent("The authoritative soundset.2da identity changed.");
  });

  it("selects only exact class-bound Toolset Creature StartingPackage rows", () => {
    const handlers = renderInventoryDialog({
      activeTab: "advanced",
      exactStartingPackage: true,
    });

    expect(screen.getByText("Starting Package: ACTIVE_NOW")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Browse starting package" }));
    const selector = screen.getByRole("combobox", { name: "Creature Starting Package" });
    expect(selector).toHaveValue("0");
    expect(within(selector).getByRole("option", { name: "Fighter [0]" }))
      .toBeInTheDocument();
    expect(within(selector).getByRole("option", { name: "Fighter Commander [2]" }))
      .toBeInTheDocument();
    fireEvent.change(selector, { target: { value: "2" } });
    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("startingPackageId", 2);

    fireEvent.click(screen.getByRole("button", { name: "Browse starting package" }));
    fireEvent.change(screen.getByLabelText("Search Creature Starting Package rows"), {
      target: { value: "commander" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search starting packages" }));
    expect(handlers.onCreatureStartingPackageSearch).toHaveBeenCalledWith("commander");
  });

  it("keeps retained StartingPackage preserve-only and explains catalog failure", () => {
    renderInventoryDialog({
      activeTab: "advanced",
      exactStartingPackage: true,
      startingPackageCatalogStatus: "error",
      startingPackageCatalogError: "The authoritative packages.2da identity changed.",
    });

    expect(screen.getByText("Starting Package: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse starting package" })).toBeDisabled();
    expect(screen.getByRole("alert"))
      .toHaveTextContent("The authoritative packages.2da identity changed.");
  });

  it("edits only exact source-backed mode-0 ItemList fields", () => {
    const handlers = renderInventoryDialog({ exactItemList: true });

    expect(screen.getByText("ItemList: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Equip_ItemList: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByLabelText("Inventory item 1 resref")).toHaveAttribute("readonly");
    expect(screen.queryByLabelText("Inventory item 1 random resref")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Inventory item 1 infinite")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/inventory item 1 repo x/i), {
      target: { value: "7" }
    });
    fireEvent.click(screen.getByLabelText(/inventory item 1 dropable/i));
    fireEvent.click(screen.getByRole("button", { name: "Move inventory item 1 down" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove inventory item 1" }));

    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(0, "x", 7);
    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(0, "dropable", false);
    expect(handlers.moveCreatureInventoryItem).toHaveBeenCalledWith(0, "down");
    expect(handlers.removeCreatureInventoryItem).toHaveBeenCalledWith(0);
    expect(screen.queryByRole("button", { name: /add equip_itemlist/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Equipped item 1 slot mask")).not.toBeInTheDocument();
  });

  it("keeps unproven ItemList and all Equip_ItemList controls preserve-only", () => {
    const handlers = renderInventoryDialog();

    expect(screen.getByText("ItemList: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByText("Equip_ItemList: PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add nw_cloth022 uti/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Inventory item 1 resref")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Inventory item 1 repo x")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Remove inventory item 1" })).not.toBeInTheDocument();
    expect(handlers.updateCreatureInventoryItem).not.toHaveBeenCalled();
    expect(handlers.updateCreatureEquipmentItem).not.toHaveBeenCalled();
  });

  it("edits only flags and removal for exact retained Equip_ItemList entries", () => {
    const handlers = renderInventoryDialog({ exactEquipmentList: true });

    expect(screen.getByText("Equip_ItemList: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("0x1: Head")).toBeInTheDocument();
    expect(screen.queryByLabelText("Equipped item 1 slot mask")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add equip_itemlist/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Equipped item 1 infinite")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Equipped item 1 dropable"));
    fireEvent.click(screen.getByLabelText("Equipped item 1 pickpocketable"));
    fireEvent.click(screen.getByRole("button", { name: "Remove equipped item 1" }));

    expect(handlers.updateCreatureEquipmentItem).toHaveBeenCalledWith(0, "dropable", true);
    expect(handlers.updateCreatureEquipmentItem).toHaveBeenCalledWith(0, "pickpocketable", true);
    expect(handlers.removeCreatureEquipmentItem).toHaveBeenCalledWith(0);
  });

  it("labels embedded Item structs in inventory and equipment rows", () => {
    renderInventoryDialog({ includeEmbeddedItems: true });

    expect(
      screen.getByText("Embedded emb_potion (Embedded Potion, Base 49, 1 props)")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Embedded emb_sword (Embedded Sword, Base 1, 0 props)")
    ).toBeInTheDocument();
  });

  it("adds only the admitted immutable nw_cloth022 UTI", () => {
    const handlers = renderInventoryDialog({ exactItemList: true, includeItemTemplates: true });

    expect(screen.queryByLabelText("Inventory item template")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add nw_cloth022 UTI" }));

    expect(handlers.addCreatureInventoryItem).toHaveBeenCalledTimes(1);
    expect(handlers.addCreatureInventoryItemFromTemplate).not.toHaveBeenCalled();
    expect(handlers.addCreatureEquippedItemFromTemplate).not.toHaveBeenCalled();
  });

  it("shows embedded Item structs without exposing unsupported nested mutation", () => {
    const handlers = renderInventoryDialog({ includeEmbeddedItems: true });

    expect(screen.queryByRole("group", { name: /inventory item 2 embedded item/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /equipped item 2 embedded item/i })).not.toBeInTheDocument();
    expect(handlers.updateCreatureInventoryItem).not.toHaveBeenCalled();
    expect(handlers.updateCreatureEquipmentItem).not.toHaveBeenCalled();
  });

  it("warns when an equipped item slot does not match baseitems EquipableSlots", () => {
    renderInventoryDialog({ slotMismatch: true });

    expect(
      screen.getByText("Slot mismatch: 0x20: Left Hand is not in 0x10: Right Hand")
    ).toBeInTheDocument();
  });
});
