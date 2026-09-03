import {
  CREATURE_WIZARD_DYNAMIC_APPEARANCE_OPTIONS,
  buildCreatureBlueprintCreatePayloadFromSceneObject,
  createCreatureSceneObjectFromWizardDraft,
  createCreatureWizardDraft
} from "../../../../src/modules/creatures/application/creatureCreationWizard";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

function buildBaseCreature(): SceneObject {
  return {
    id: "cre_template_auctioneer",
    kind: "creatures",
    name: "Auctioneer",
    resRef: "auctioneer",
    tag: "AUCTIONEER",
    previewImageUrl: "/thumbs/auctioneer.png",
    source: {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "cre_auctioneer",
      templateId: "cre_auctioneer",
      appearanceType: 6
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
    creatureProperties: {
      firstName: "Auctioneer",
      lastName: "",
      race: "Human",
      appearance: "Human",
      phenotype: "Normal",
      gender: "Male",
      description: "Original description",
      challengeRating: 1,
      portraitResRef: "po_human",
      conversation: "auctioneer",
      noInterrupt: false,
      alignment: "Neutral",
      variables: [
        { name: "QuestStage", type: "int", value: 3 },
        { name: "Greeting", type: "string", value: "welcome" }
      ],
      statistics: {
        abilityScores: {
          strength: 11,
          dexterity: 12,
          constitution: 13,
          intelligence: 14,
          wisdom: 15,
          charisma: 16
        },
        racialModifiers: {
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0
        },
        saves: {
          fortitudeBase: 0,
          fortitudeBonus: 1,
          reflexBase: 0,
          reflexBonus: 2,
          willBase: 0,
          willBonus: 3
        },
        naturalArmorClass: 0,
        baseArmorClass: 10,
        dexterityBonus: 0,
        sizeModifier: 0,
        baseHitPoints: 8,
        hitPointBonuses: 0,
        currentHitPoints: 8,
        maxHitPoints: 8,
        movementRate: "0"
      },
      appearanceSettings: {
        partBasedAppearance: true,
        head: "12",
        neck: "1",
        torso: "2",
        pelvis: "3",
        rightBicep: "4",
        leftBicep: "5",
        rightForearm: "6",
        leftForearm: "7",
        rightHand: "8",
        leftHand: "9",
        rightThigh: "10",
        leftThigh: "11",
        rightShin: "12",
        leftShin: "13",
        rightFoot: "14",
        leftFoot: "15",
        wings: "0",
        tail: "0",
        colors: {
          skin: "4",
          hair: "5",
          tattoo1: "6",
          tattoo2: "7"
        },
        sourceOnlyParts: {
          belt: "19",
          robe: "26",
          rightShoulder: "20",
          leftShoulder: "21"
        }
      },
      advancedSettings: {
        blueprintResRef: "auctioneer",
        disarmable: true,
        plot: false,
        leavesLootableCorpse: false,
        noPermanentDeath: false,
        immortal: false,
        treasureModel: "",
        corpseDecayTimeSeconds: 0,
        faction: "Commoner",
        subrace: "",
        deity: "",
        challengeRatingAdjustment: 0,
        soundSet: "Human",
        perceptionRange: "11"
      }
    }
  };
}

describe("creatureCreationWizard", () => {
  it("seeds draft identity, body parts, colors, and stats from the base creature", () => {
    const base = buildBaseCreature();
    const draft = createCreatureWizardDraft(base, 2);

    expect(draft.baseObjectId).toBe("cre_template_auctioneer");
    expect(draft.resRef).toBe("auctioneer_002");
    expect(draft.firstName).toBe("Auctioneer");
    expect(draft.appearance).toBe("6");
    expect(draft.bodyParts.head).toBe("12");
    expect(draft.colors.hair).toBe("5");
    expect(draft.abilityScores.charisma).toBe(16);
  });

  it("exposes Aurora dynamic appearance rows for the wizard selector", () => {
    expect(CREATURE_WIZARD_DYNAMIC_APPEARANCE_OPTIONS).toEqual([
      { appearanceType: 0, label: "(Dynamic) Dwarf", raceModel: "D" },
      { appearanceType: 1, label: "(Dynamic) Elf", raceModel: "E" },
      { appearanceType: 2, label: "(Dynamic) Gnome", raceModel: "G" },
      { appearanceType: 3, label: "(Dynamic) Halfling", raceModel: "A" },
      { appearanceType: 4, label: "(Dynamic) Half-Elf", raceModel: "H" },
      { appearanceType: 5, label: "(Dynamic) Half-Orc", raceModel: "O" },
      { appearanceType: 6, label: "(Dynamic) Human", raceModel: "H" }
    ]);
  });

  it("creates a custom local creature while preserving the base template for render lookup", () => {
    const base = buildBaseCreature();
    const draft = createCreatureWizardDraft(base, 3);
    const created = createCreatureSceneObjectFromWizardDraft(
      {
        ...draft,
        name: "Market Captain",
        firstName: "Market",
        lastName: "Captain",
        resRef: "market captain",
        tag: "market captain",
        appearance: "2",
        hitPoints: 42,
        challengeRating: 2.5,
        plot: true,
        bodyParts: {
          ...draft.bodyParts,
          head: "44"
        },
        colors: {
          ...draft.colors,
          skin: "13"
        },
        abilityScores: {
          ...draft.abilityScores,
          strength: 18
        }
      },
      base,
      3
    );

    expect(created.kind).toBe("creatures");
    expect(created.name).toBe("Market Captain");
    expect(created.resRef).toBe("market_captain");
    expect(created.tag).toBe("MARKET_CAPTAIN");
    expect(created.source?.templateId).toBe("cre_auctioneer");
    expect(created.source?.sourceObjectId).toBe("cre_auctioneer");
    expect(created.source?.appearanceType).toBe(2);
    expect(created.creatureProperties?.appearance).toBe("2");
    expect(created.creatureProperties?.appearanceSettings?.head).toBe("44");
    expect(created.creatureProperties?.appearanceSettings?.colors?.skin).toBe("13");
    expect(created.creatureProperties?.statistics?.maxHitPoints).toBe(42);
    expect(created.creatureProperties?.statistics?.abilityScores.strength).toBe(18);
    expect(created.creatureProperties?.advancedSettings?.blueprintResRef).toBe("market_captain");
    expect(created.creatureProperties?.advancedSettings?.plot).toBe(true);
  });

  it("builds a durable UTC blueprint payload from the wizard object", () => {
    const base = buildBaseCreature();
    const draft = createCreatureWizardDraft(base, 4);
    const created = createCreatureSceneObjectFromWizardDraft(
      {
        ...draft,
        name: "Archive Guard",
        firstName: "Archive",
        lastName: "Guard",
        appearance: "6",
        resRef: "archive_guard",
        tag: "ARCHIVE_GUARD",
        hitPoints: 26,
        challengeRating: 2.5,
        plot: true
      },
      base,
      4
    );

    const payload = buildCreatureBlueprintCreatePayloadFromSceneObject(created);

    expect(payload).toMatchObject({
      templateResRef: "archive_guard",
      name: "Archive Guard",
      overwrite: true,
      blueprint: {
        firstName: "Archive",
        lastName: "Guard",
        tag: "ARCHIVE_GUARD",
        appearanceId: 6,
        plot: true,
        hitPoints: 26,
        currentHitPoints: 26,
        maxHitPoints: 26,
        challengeRating: 2.5,
        strength: 11,
        bodyPartTorso: 2,
        colorHair: 5,
        variableListEntries: [
          { name: "QuestStage", type: "int", value: 3 },
          { name: "Greeting", type: "string", value: "welcome" }
        ]
      }
    });
    expect(payload?.blueprint).not.toHaveProperty("bodyPartRobe");
    expect(payload?.blueprint).toMatchObject({
      bodyPartBelt: 19,
      bodyPartRShoul: 20,
      bodyPartLShoul: 21
    });
  });

  it("does not copy loose legacy bodyPartRobe metadata into Creature authoring", () => {
    const creature = buildBaseCreature();
    if (creature.source?.type !== "aurora_git") {
      throw new Error("Expected an Aurora GIT creature source.");
    }
    creature.source.creatureMetadata = {
      ...(creature.source.creatureMetadata ?? {}),
      bodyPartRobe: 99
    };

    const payload = buildCreatureBlueprintCreatePayloadFromSceneObject(creature);

    expect(payload?.blueprint).not.toHaveProperty("bodyPartRobe");
    expect(creature.creatureProperties?.appearanceSettings?.sourceOnlyParts?.robe).toBe("26");
  });

  it("serializes canonical class, feat, spell, and special ability IDs", () => {
    const creature = buildBaseCreature();
    creature.creatureProperties = {
      ...creature.creatureProperties!,
      classEntries: [{ classId: 1, className: "Wizard", level: 7 }],
      feats: [{ featId: 12, name: "Weapon Focus", type: "feat", assigned: true }],
      spells: [
        {
          spellId: 101,
          classIndex: 0,
          prepared: false,
          name: "Magic Missile",
          spellLevel: 1,
          castingLevel: 7,
          metaMagic: 2,
          flags: 5
        },
        {
          spellId: 102,
          classIndex: 0,
          prepared: true,
          name: "Shield",
          spellLevel: 1,
          castingLevel: 7,
          flags: 1
        }
      ],
      specialAbilities: [
        {
          spellId: 44,
          flags: 3,
          name: "Flame Weapon",
          type: "special",
          casterLevel: 9,
          uses: 0
        }
      ]
    };

    const payload = buildCreatureBlueprintCreatePayloadFromSceneObject(creature);

    expect(payload?.blueprint).toMatchObject({
      classListEntries: [
        {
          classId: 1,
          level: 7,
          knownSpells: [{ spellId: 101, spellLevel: 1, metaMagic: 2, flags: 5 }],
          memorizedSpells: [{ spellId: 102, spellLevel: 1, flags: 1 }]
        }
      ],
      featListEntries: [{ featId: 12 }],
      specAbilityListEntries: [{ spellId: 44, flags: 3, casterLevel: 9 }]
    });
  });
});
