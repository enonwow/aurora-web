import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspaceSceneObjectClone creature properties", () => {
  it("deep clones exact Creature appendage storage and table provenance", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_appendages",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creatureAppendages: {
        wings: {
          present: true,
          value: 1,
          modernDword: {
            present: true,
            nativeType: "dword",
            value: 1,
            table: {
              resourceName: "wingmodel.2da",
              sourceObjectKey: "runtime-source/vanilla/nwn_base.key/wingmodel.2da",
              sourceLayer: "vanilla",
              sha256: "a".repeat(64),
              sizeBytes: 1_024,
              rowCount: 8,
              rowIndex: 1,
            },
          },
          legacyByte: { present: true, nativeType: "byte", value: 2 },
        },
        tail: { present: false },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureAppendages).toEqual(source.source.creatureAppendages);
    expect(cloned.source?.creatureAppendages).not.toBe(source.source.creatureAppendages);
    if (cloned.source?.creatureAppendages?.wings.present &&
      source.source.creatureAppendages.wings.present &&
      cloned.source.creatureAppendages.wings.modernDword.present &&
      source.source.creatureAppendages.wings.modernDword.present) {
      expect(cloned.source.creatureAppendages.wings).not.toBe(
        source.source.creatureAppendages.wings,
      );
      expect(cloned.source.creatureAppendages.wings.modernDword.table).not.toBe(
        source.source.creatureAppendages.wings.modernDword.table,
      );
      expect(cloned.source.creatureAppendages.wings.legacyByte).not.toBe(
        source.source.creatureAppendages.wings.legacyByte,
      );
    }
  });

  it("deep clones exact Creature WalkRate storage and table provenance", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_walk_rate",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creatureWalkRate: {
        present: true,
        nativeType: "int",
        value: 4,
        table: {
          resourceName: "creaturespeed.2da",
          sourceObjectKey: "runtime-source/module/creaturespeed.2da",
          sourceLayer: "module",
          sha256: "f".repeat(64),
          sizeBytes: 4_096,
          rowCount: 9,
          rowIndex: 4,
          twoDaName: "NORM",
        },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureWalkRate).toEqual(source.source.creatureWalkRate);
    expect(cloned.source?.creatureWalkRate).not.toBe(source.source.creatureWalkRate);
    if (cloned.source?.creatureWalkRate?.present && source.source.creatureWalkRate.present) {
      expect(cloned.source.creatureWalkRate.table).not.toBe(
        source.source.creatureWalkRate.table,
      );
    }
  });

  it("deep clones exact Creature SoundSetFile storage and table provenance", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_sound_set",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
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

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureSoundSetFile).toEqual(source.source.creatureSoundSetFile);
    expect(cloned.source?.creatureSoundSetFile).not.toBe(source.source.creatureSoundSetFile);
    if (cloned.source?.creatureSoundSetFile?.present && source.source.creatureSoundSetFile.present) {
      expect(cloned.source.creatureSoundSetFile.table).not.toBe(
        source.source.creatureSoundSetFile.table,
      );
    }
  });

  it("deep clones exact Creature StartingPackage ClassList and table provenance", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_starting_package",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creatureStartingPackage: {
        present: true,
        nativeType: "byte",
        value: 0,
        classIds: [4],
        table: {
          resourceName: "packages.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
          sourceLayer: "vanilla",
          sha256: "c".repeat(64),
          sizeBytes: 30_510,
          rowCount: 132,
          rowIndex: 0,
          classId: 4,
        },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureStartingPackage).toEqual(
      source.source.creatureStartingPackage,
    );
    expect(cloned.source?.creatureStartingPackage).not.toBe(
      source.source.creatureStartingPackage,
    );
    if (cloned.source?.creatureStartingPackage?.present &&
      source.source.creatureStartingPackage.present) {
      expect(cloned.source.creatureStartingPackage.classIds).not.toBe(
        source.source.creatureStartingPackage.classIds,
      );
      expect(cloned.source.creatureStartingPackage.table).not.toBe(
        source.source.creatureStartingPackage.table,
      );
    }
  });

  it("deep clones exact Creature PortraitId selector and table provenance", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_portrait",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creaturePortrait: {
        present: true,
        nativeType: "word",
        value: 10,
        selectorContext: { genderValue: 0, raceValue: 4 },
        table: {
          resourceName: "portraits.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
          sourceLayer: "vanilla",
          sha256: "a".repeat(64),
          sizeBytes: 100_000,
          rowCount: 16_001,
          rowIndex: 10,
          baseResRef: "po_hm_guard",
        },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creaturePortrait).toEqual(source.source.creaturePortrait);
    expect(cloned.source?.creaturePortrait).not.toBe(source.source.creaturePortrait);
    if (cloned.source?.creaturePortrait?.present && source.source.creaturePortrait.present) {
      expect(cloned.source.creaturePortrait.selectorContext).not.toBe(
        source.source.creaturePortrait.selectorContext,
      );
      expect(cloned.source.creaturePortrait.table).not.toBe(
        source.source.creaturePortrait.table,
      );
    }
  });

  it("deep clones exact Creature ChallengeRating provenance", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_challenge_rating",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creatureChallengeRating: {
        present: true,
        nativeType: "float",
        value: 11.5,
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureChallengeRating).toEqual(
      source.source.creatureChallengeRating,
    );
    expect(cloned.source?.creatureChallengeRating).not.toBe(
      source.source.creatureChallengeRating,
    );
  });

  it("deep clones exact Creature NaturalAC provenance", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_natural_ac",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creatureNaturalArmorClass: {
        present: true,
        nativeType: "byte",
        value: 2,
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureNaturalArmorClass).toEqual(
      source.source.creatureNaturalArmorClass,
    );
    expect(cloned.source?.creatureNaturalArmorClass).not.toBe(
      source.source.creatureNaturalArmorClass,
    );
  });

  it("deep clones every exact Creature saving-throw provenance member", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_saving_throws",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creatureSavingThrowBonuses: {
        fortitude: { present: true, nativeType: "short", value: 3 },
        reflex: { present: true, nativeType: "short", value: 1 },
        will: { present: false },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureSavingThrowBonuses).toEqual(
      source.source.creatureSavingThrowBonuses,
    );
    expect(cloned.source?.creatureSavingThrowBonuses).not.toBe(
      source.source.creatureSavingThrowBonuses,
    );
    expect(cloned.source?.creatureSavingThrowBonuses?.fortitude).not.toBe(
      source.source.creatureSavingThrowBonuses.fortitude,
    );
  });

  it("deep clones both exact Creature alignment provenance members", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_alignment",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creatureAlignment: {
        goodEvil: { present: true, nativeType: "byte", value: 50 },
        lawfulChaotic: { present: true, nativeType: "byte", value: 100 },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureAlignment).toEqual(source.source.creatureAlignment);
    expect(cloned.source?.creatureAlignment).not.toBe(source.source.creatureAlignment);
    expect(cloned.source?.creatureAlignment?.goodEvil).not.toBe(
      source.source.creatureAlignment.goodEvil,
    );
    expect(cloned.source?.creatureAlignment?.lawfulChaotic).not.toBe(
      source.source.creatureAlignment.lawfulChaotic,
    );
  });

  it("deep clones every exact Creature base ability-score provenance member", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_ability_scores",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creatureAbilityScores: {
        strength: { present: true, nativeType: "byte", value: 15 },
        dexterity: { present: true, nativeType: "byte", value: 12 },
        constitution: { present: false },
        intelligence: { present: true, nativeType: "byte", value: 10 },
        wisdom: { present: true, nativeType: "byte", value: 11 },
        charisma: { present: true, nativeType: "byte", value: 8 },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureAbilityScores).toEqual(
      source.source.creatureAbilityScores,
    );
    expect(cloned.source?.creatureAbilityScores).not.toBe(
      source.source.creatureAbilityScores,
    );
    expect(cloned.source?.creatureAbilityScores?.strength).not.toBe(
      source.source.creatureAbilityScores.strength,
    );
    expect(cloned.source?.creatureAbilityScores?.constitution).not.toBe(
      source.source.creatureAbilityScores.constitution,
    );
  });

  it("deep clones every exact Creature appearance-color provenance member", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_appearance_colors",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creatureAppearanceColors: {
        skin: { present: true, nativeType: "byte", value: 11 },
        hair: { present: true, nativeType: "byte", value: 22 },
        tattoo1: { present: false },
        tattoo2: { present: true, nativeType: "byte", value: 44 },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureAppearanceColors).toEqual(
      source.source.creatureAppearanceColors,
    );
    expect(cloned.source?.creatureAppearanceColors).not.toBe(
      source.source.creatureAppearanceColors,
    );
    expect(cloned.source?.creatureAppearanceColors?.skin).not.toBe(
      source.source.creatureAppearanceColors.skin,
    );
    expect(cloned.source?.creatureAppearanceColors?.tattoo1).not.toBe(
      source.source.creatureAppearanceColors.tattoo1,
    );
  });

  it("deep clones nested Creature body-part compatibility provenance", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    const keys = [
      "rightFoot", "leftFoot", "rightShin", "leftShin", "leftThigh", "rightThigh",
      "pelvis", "torso", "belt", "neck", "rightForearm", "leftForearm",
      "rightBicep", "leftBicep", "rightShoulder", "leftShoulder", "rightHand",
      "leftHand", "head",
    ];
    const creatureBodyParts = Object.fromEntries(
      keys.map((key) => [key, { present: false }]),
    ) as Record<string, any>;
    creatureBodyParts.torso = {
      present: true,
      value: 4096,
      legacyByte: { present: true, nativeType: "byte", value: 0 },
      wideWord: { present: true, nativeType: "word", value: 4096 },
    };
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creatureBodyParts: creatureBodyParts as never,
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureBodyParts).toEqual(creatureBodyParts);
    expect(cloned.source?.creatureBodyParts).not.toBe(creatureBodyParts);
    expect(cloned.source?.creatureBodyParts?.torso).not.toBe(creatureBodyParts.torso);
    expect(cloned.source?.creatureBodyParts?.torso.present &&
      cloned.source.creatureBodyParts.torso.legacyByte).not.toBe(
        creatureBodyParts.torso.legacyByte,
      );
    expect(cloned.source?.creatureBodyParts?.torso.present &&
      cloned.source.creatureBodyParts.torso.wideWord).not.toBe(
        creatureBodyParts.torso.wideWord,
      );
  });

  it("deep clones the complete Creature HP triplet and racialtypes binding", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creatureHitPointState: {
        present: true,
        hitPoints: { nativeType: "short", value: 20 },
        currentHitPoints: { nativeType: "short", value: 77 },
        maxHitPoints: { nativeType: "short", value: 88 },
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
          constitutionAdjust: 0,
        },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureHitPointState).toEqual(
      source.source.creatureHitPointState,
    );
    expect(cloned.source?.creatureHitPointState).not.toBe(
      source.source.creatureHitPointState,
    );
    if (cloned.source?.creatureHitPointState?.present &&
      source.source.creatureHitPointState.present) {
      expect(cloned.source.creatureHitPointState.hitPoints).not.toBe(
        source.source.creatureHitPointState.hitPoints,
      );
      expect(cloned.source.creatureHitPointState.classLevels).not.toBe(
        source.source.creatureHitPointState.classLevels,
      );
      expect(cloned.source.creatureHitPointState.racialTypes).not.toBe(
        source.source.creatureHitPointState.racialTypes,
      );
    }
  });

  it("deep clones exact Creature ClassLevel entries", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
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
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureClassLevelState).toEqual(
      source.source.creatureClassLevelState,
    );
    expect(cloned.source?.creatureClassLevelState).not.toBe(
      source.source.creatureClassLevelState,
    );
    if (cloned.source?.creatureClassLevelState?.present &&
      source.source.creatureClassLevelState.present) {
      expect(cloned.source.creatureClassLevelState.entries).not.toBe(
        source.source.creatureClassLevelState.entries,
      );
      expect(cloned.source.creatureClassLevelState.entries[0]).not.toBe(
        source.source.creatureClassLevelState.entries[0],
      );
    }
  });

  it("deep clones exact Creature advanced flag provenance", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_advanced_flags",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creatureAdvancedFlags: {
        disarmable: { present: true, value: 1 },
        plot: { present: true, value: 0 },
        immortal: { present: false },
        lootable: { present: true, value: 1 },
        noPermanentDeath: { present: true, value: 0 },
      },
      creatureBodyBag: {
        expectedValue: 2,
        tableSha256: "e".repeat(64),
        tableRowCount: 3,
      },
      creatureDecayTime: { expectedMilliseconds: 12_000 },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureAdvancedFlags).toEqual(
      source.source.creatureAdvancedFlags,
    );
    expect(cloned.source?.creatureAdvancedFlags).not.toBe(
      source.source.creatureAdvancedFlags,
    );
    expect(cloned.source?.creatureAdvancedFlags?.plot).not.toBe(
      source.source.creatureAdvancedFlags.plot,
    );
    expect(cloned.source?.creatureBodyBag).toEqual(source.source.creatureBodyBag);
    expect(cloned.source?.creatureBodyBag).not.toBe(source.source.creatureBodyBag);
    expect(cloned.source?.creatureDecayTime).toEqual(source.source.creatureDecayTime);
    expect(cloned.source?.creatureDecayTime).not.toBe(source.source.creatureDecayTime);
  });

  it("deep clones exact Creature name localized-string provenance", () => {
    const source = createNewSceneObject("creatures", 1, 1, 1);
    source.source = {
      type: "aurora_git",
      areaId: "area_names",
      sourceObjectId: "creature:0:cre_guard_01:source",
      sourceIndex: 0,
      sourceKind: "creature",
      templateId: "cre_guard_01",
      creatureLocalizedStrings: {
        firstName: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "R3VhcmQ=" }],
        },
        lastName: { present: false },
        description: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "RGVzY3JpcHRpb24=" }],
        },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureLocalizedStrings).toEqual(
      source.source.creatureLocalizedStrings,
    );
    expect(cloned.source?.creatureLocalizedStrings).not.toBe(
      source.source.creatureLocalizedStrings,
    );
    expect(cloned.source?.creatureLocalizedStrings?.firstName).not.toBe(
      source.source.creatureLocalizedStrings.firstName,
    );
    expect(cloned.source?.creatureLocalizedStrings?.description).not.toBe(
      source.source.creatureLocalizedStrings.description,
    );
    if (
      cloned.source?.creatureLocalizedStrings?.firstName.present &&
      source.source.creatureLocalizedStrings.firstName.present
    ) {
      expect(cloned.source.creatureLocalizedStrings.firstName.entries).not.toBe(
        source.source.creatureLocalizedStrings.firstName.entries,
      );
      source.source.creatureLocalizedStrings.firstName.entries[0]!.textBytesBase64 = "TXV0YXRlZA==";
      expect(cloned.source.creatureLocalizedStrings.firstName.entries[0]?.textBytesBase64).toBe(
        "R3VhcmQ=",
      );
    }
  });

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
