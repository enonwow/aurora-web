import { describe, expect, it } from "vitest";
import {
  createNewSceneObject,
  createSeedAreaScene,
  rescaleSceneObjectsToSize
} from "../../../../src/modules/scene/domain/sceneFactory";

describe("sceneFactory", () => {
  it("creates deterministic 2x2 seed area with tiles and objects by default", () => {
    const scene = createSeedAreaScene();

    expect(scene.width).toBe(2);
    expect(scene.height).toBe(2);
    expect(scene.tiles).toHaveLength(2 * 2);
    expect(scene.objects.length).toBeGreaterThan(0);
    expect(scene.source).toBe("seed");
  });

  it("preserves legacy 18x18 object placement when requested explicitly", () => {
    const scene = createSeedAreaScene(18, 18);
    const barrel = scene.objects.find((object) => object.id === "plc_barrel_01");
    const eastDoor = scene.objects.find((object) => object.id === "dr_nw_02");

    expect(scene.width).toBe(18);
    expect(scene.height).toBe(18);
    expect(scene.tiles).toHaveLength(18 * 18);
    expect(barrel?.x).toBeCloseTo(3.2);
    expect(barrel?.y).toBeCloseTo(5.7);
    expect(eastDoor?.x).toBeCloseTo(17.2);
    expect(eastDoor?.y).toBeCloseTo(9.1);
  });

  it("rescales object coordinates proportionally between scene sizes", () => {
    const legacyScene = createSeedAreaScene(18, 18);
    const scaled = rescaleSceneObjectsToSize(legacyScene.objects, 18, 18, 2, 2);
    const barrel = scaled.find((object) => object.id === "plc_barrel_01");
    const eastDoor = scaled.find((object) => object.id === "dr_nw_02");

    expect(barrel?.x).toBeCloseTo((3.2 / 18) * 2, 5);
    expect(barrel?.y).toBeCloseTo((5.7 / 18) * 2, 5);
    expect(eastDoor?.x).toBeCloseTo((17.2 / 18) * 2, 5);
    expect(eastDoor?.y).toBeCloseTo((9.1 / 18) * 2, 5);
  });

  it("preserves existing sound/placeable metadata values while rescaling", () => {
    const scene = createSeedAreaScene(18, 18);
    const customized = scene.objects.map((object) => {
      if (object.id === "plc_barrel_01") {
        return {
          ...object,
          placeableProperties: {
            plot: true,
            useable: true,
            hasInventory: true
          }
        };
      }
      if (object.id === "snd_amb_01") {
        return {
          ...object,
          soundPositioning: {
            mode: "random" as const,
            elevation: 1.25,
            maxVolumeDistance: 12,
            cutoffDistance: 21,
            randomRangeWestEast: 3,
            randomRangeNorthSouth: 4
          }
        };
      }
      return object;
    });

    const scaled = rescaleSceneObjectsToSize(customized, 18, 18, 2, 2);
    const placeable = scaled.find((object) => object.id === "plc_barrel_01");
    const sound = scaled.find((object) => object.id === "snd_amb_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: true,
      useable: true,
      hasInventory: true
    });
    expect(sound?.soundPositioning).toEqual({
      mode: "random",
      elevation: 1.25,
      maxVolumeDistance: 12,
      cutoffDistance: 21,
      randomRangeWestEast: 3,
      randomRangeNorthSouth: 4
    });
  });

  it("preserves the exact sparse placeable Advanced payload without inventing preserve-only fields", () => {
    const scene = createSeedAreaScene();
    const customized = scene.objects.map((object) =>
      object.id === "plc_barrel_01"
        ? {
            ...object,
            placeableProperties: {
              ...object.placeableProperties,
              advancedSettings: { initialState: "Closed" }
            }
          }
        : object
    );

    const scaled = rescaleSceneObjectsToSize(customized, 2, 2, 2, 2);
    const placeable = scaled.find((object) => object.id === "plc_barrel_01");

    expect(placeable?.placeableProperties?.advancedSettings).toEqual({
      initialState: "Closed"
    });
  });

  it("normalizes invalid metadata payloads to safe clamped values while rescaling", () => {
    const scene = createSeedAreaScene();
    const corrupted = scene.objects.map((object) => {
      if (object.id === "plc_barrel_01") {
        return {
          ...object,
          placeableProperties: {
            plot: "yes",
            useable: null,
            hasInventory: 1
          } as unknown as typeof object.placeableProperties
        };
      }
      if (object.id === "snd_amb_01") {
        return {
          ...object,
          visualTransform: {
            ...object.visualTransform,
            offsetZ: -5
          },
          soundPositioning: {
            mode: "broken",
            elevation: -3,
            maxVolumeDistance: Number.POSITIVE_INFINITY,
            cutoffDistance: -1,
            randomRangeWestEast: 7,
            randomRangeNorthSouth: 8
          } as unknown as NonNullable<typeof object.soundPositioning>
        };
      }
      return object;
    });

    const normalized = rescaleSceneObjectsToSize(corrupted, 2, 2, 2, 2);
    const placeable = normalized.find((object) => object.id === "plc_barrel_01");
    const sound = normalized.find((object) => object.id === "snd_amb_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });
    expect(sound?.soundPositioning).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 1,
      cutoffDistance: 1,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });

  it("clamps sound ranges and enforces cutoff >= max volume for non-random modes", () => {
    const scene = createSeedAreaScene();
    const mutated = scene.objects.map((object) => {
      if (object.id !== "snd_amb_01") {
        return object;
      }
      return {
        ...object,
        soundPositioning: {
          mode: "everywhere",
          elevation: 2,
          maxVolumeDistance: 14,
          cutoffDistance: 9,
          randomRangeWestEast: 3,
          randomRangeNorthSouth: 4
        }
      };
    });

    const normalized = rescaleSceneObjectsToSize(mutated, 2, 2, 2, 2);
    const sound = normalized.find((object) => object.id === "snd_amb_01");

    expect(sound?.soundPositioning).toEqual({
      mode: "everywhere",
      elevation: 2,
      maxVolumeDistance: 14,
      cutoffDistance: 14,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });

  it("retains canonical Creature FactionID when another advanced field needs normalization", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 7);
    creature.creatureProperties = {
      advancedSettings: {
        blueprintResRef: "creature",
        paletteId: Number.NaN,
        disarmable: false,
        plot: false,
        playerCharacter: false,
        leavesLootableCorpse: false,
        noPermanentDeath: false,
        immortal: false,
        bodyBag: false,
        startingPackage: false,
        treasureModel: "Default",
        corpseDecayTimeSeconds: 5,
        factionId: 7,
        faction: "Faction 7",
        subrace: "",
        deity: "",
        challengeRatingAdjustment: 0,
        soundSet: "",
        perceptionRange: "Default",
      },
    };

    const [normalized] = rescaleSceneObjectsToSize([creature!], 2, 2, 4, 4);

    expect(normalized?.creatureProperties?.advancedSettings?.paletteId).toBeUndefined();
    expect(normalized?.creatureProperties?.advancedSettings).toMatchObject({
      factionId: 7,
      faction: "Faction 7",
    });
  });

  it("preserves source-backed creature optional data while normalizing scene objects", () => {
    const creature = {
      ...createNewSceneObject("creatures", 1, 1, 1),
      creatureProperties: {
        ...createNewSceneObject("creatures", 1, 1, 1).creatureProperties!,
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
            strength: 0,
            dexterity: 0,
            constitution: 0,
            intelligence: 0,
            wisdom: 0,
            charisma: 0
          },
          saves: {
            fortitudeBase: 0,
            fortitudeBonus: 3,
            reflexBase: 0,
            reflexBonus: 2,
            willBase: 0,
            willBonus: 1
          },
          naturalArmorClass: 2,
          baseArmorClass: 10,
          dexterityBonus: 1,
          sizeModifier: 0,
          baseHitPoints: 36,
          hitPointBonuses: 6,
          currentHitPoints: 31,
          maxHitPoints: 42,
          movementRate: "4"
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
        advancedSettings: {
          blueprintResRef: "cre_guard",
          paletteId: 9,
          disarmable: true,
          plot: true,
          playerCharacter: true,
          leavesLootableCorpse: true,
          noPermanentDeath: true,
          immortal: false,
          bodyBag: true,
          startingPackage: true,
          treasureModel: "Default",
          corpseDecayTimeSeconds: 33,
          factionId: 7,
          faction: "Faction 7",
          subrace: "veteran",
          deity: "Helm",
          challengeRatingAdjustment: 1,
          soundSet: "SoundSet 55",
          perceptionRange: "11"
        },
        templateEntries: [{ templateId: 77 }],
        spells: [
          {
            prepared: true,
            name: "Spell 202",
            spellLevel: 0,
            castingLevel: 5,
            metaMagic: 4,
            flags: 8
          }
        ],
        inventoryItems: [
          {
            resRef: "nw_wswmls001",
            itemTemplateId: "item_nw_wswmls001",
            itemResRef: "nw_wswmls001",
            itemSourceFingerprint: "uti-mainhand-fingerprint",
            itemSourceObjectKey: "templates/items/nw_wswmls001.uti",
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
            itemTemplateId: "item_nw_maarcl001",
            itemResRef: "nw_maarcl001",
            itemSourceFingerprint: "uti-armor-fingerprint",
            itemSourceObjectKey: "templates/items/nw_maarcl001.uti",
            slotMask: 2,
            dropable: false,
            pickpocketable: false,
            infinite: true
          }
        ]
      }
    };

    const [normalized] = rescaleSceneObjectsToSize([creature], 2, 2, 2, 2);

    expect(normalized?.creatureProperties).toMatchObject({
      alignment: "Lawful Good",
      statistics: {
        baseHitPoints: 36,
        hitPointBonuses: 6,
        currentHitPoints: 31,
        maxHitPoints: 42
      },
      appearanceSettings: {
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
      advancedSettings: {
        paletteId: 9,
        playerCharacter: true,
        bodyBag: true,
        startingPackage: true,
        factionId: 7,
        faction: "Faction 7"
      },
      templateEntries: [{ templateId: 77 }],
      spells: [
        {
          prepared: true,
          name: "Spell 202",
          spellLevel: 0,
          castingLevel: 5,
          metaMagic: 4,
          flags: 8
        }
      ],
      inventoryItems: [
        {
          resRef: "nw_wswmls001",
          itemTemplateId: "item_nw_wswmls001",
          itemResRef: "nw_wswmls001",
          itemSourceFingerprint: "uti-mainhand-fingerprint",
          itemSourceObjectKey: "templates/items/nw_wswmls001.uti",
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
          itemTemplateId: "item_nw_maarcl001",
          itemResRef: "nw_maarcl001",
          itemSourceFingerprint: "uti-armor-fingerprint",
          itemSourceObjectKey: "templates/items/nw_maarcl001.uti",
          slotMask: 2,
          dropable: false,
          pickpocketable: false,
          infinite: true
        }
      ]
    });
  });

  it("creates scene objects with expected defaults", () => {
    const object = createNewSceneObject("placeables", 4.5, 7.5, 21);

    expect(object.id).toBe("pla_021");
    expect(object.resRef).toBe("plc_watertrough");
    expect(object.tag).toBe("WaterTrough");
    expect(object.source).toEqual({
      type: "aurora_blueprint",
      sourceKind: "placeable",
      sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
      templateId: "plc_watertrough",
      sourceEtag: "a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531",
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    });
    expect(object.visualTransform.offsetX).toBe(0);
    expect(object.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });
    expect(object.soundPositioning).toBeUndefined();
    expect(object.x).toBe(4.5);
    expect(object.y).toBe(7.5);
  });

  it("assigns sound positioning baseline to sound objects", () => {
    const sound = createNewSceneObject("sounds", 1.2, 0.8, 3);

    expect(sound.id).toBe("sou_003");
    expect(sound.soundPositioning).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 1,
      cutoffDistance: 10,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
    expect(sound.placeableProperties).toBeUndefined();
    expect(sound).toMatchObject({
      resRef: "animalcriesday",
      tag: "AnimalCriesDay",
      bearing: 0,
      source: {
        type: "aurora_blueprint",
        sourceKind: "sound",
        sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
        templateId: "animalcriesday",
        sourceEtag: "a0d185c2813db9cd2649e104715e94c01511f83b97f3319a0ee3c31b8c3357b4",
        sourceFileType: "UTS ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });

  it("creates new waypoints from the exact admitted Aurora UTW blueprint profile", () => {
    const waypoint = createNewSceneObject("waypoints", 3.5, 4.75, 9);

    expect(waypoint).toMatchObject({
      id: "way_009",
      kind: "waypoints",
      resRef: "nw_waypoint001",
      tag: "NW_WAYPOINT001",
      x: 3.5,
      y: 4.75,
      source: {
        type: "aurora_blueprint",
        sourceKind: "waypoint",
        sourceProfileId: "nwn-base-key-utw-v1",
        templateId: "nw_waypoint001",
        sourceEtag: "13122a96b64f277c1c6aecb8984f1b5b9c133fb9fb514ce24a1bef564a53055a",
        sourceFileType: "UTW ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });

  it("creates new ground items from the exact admitted Aurora UTI blueprint profile", () => {
    expect(createNewSceneObject("items", 1.5, 2.25, 12)).toMatchObject({
      id: "ite_012",
      kind: "items",
      resRef: "nw_cloth022",
      tag: "NW_CLOTH022",
      x: 1.5,
      y: 2.25,
      source: {
        type: "aurora_blueprint",
        sourceKind: "item",
        sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
        templateId: "nw_cloth022",
        sourceEtag: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
        sourceFileType: "UTI ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });

  it("creates new creatures from the exact admitted Aurora UTC blueprint profile", () => {
    expect(createNewSceneObject("creatures", 1.5, 2.25, 13)).toMatchObject({
      id: "cre_013",
      kind: "creatures",
      resRef: "nw_chicken",
      tag: "NW_CHICKEN",
      x: 1.5,
      y: 2.25,
      source: {
        type: "aurora_blueprint",
        sourceKind: "creature",
        sourceProfileId: "nwn-base-key-utc-nw-chicken-v1",
        templateId: "nw_chicken",
        sourceEtag: "c1b0e194bb08b3e3d2946025c1e2f950b91e4cb844a32ba3b744c51a1d822a4a",
        sourceFileType: "UTC ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });

  it("creates new stores from the exact admitted Aurora UTM blueprint profile", () => {
    expect(createNewSceneObject("stores", 1.5, 2.25, 14)).toMatchObject({
      id: "sto_014",
      kind: "stores",
      resRef: "x2_merc_dye",
      tag: "x2_merc_dye",
      x: 1.5,
      y: 2.25,
      source: {
        type: "aurora_blueprint",
        sourceKind: "store",
        sourceProfileId: "nwn-base-key-utm-x2-merc-dye-v1",
        templateId: "x2_merc_dye",
        sourceEtag: "99b3050edf8697dfd053dbb335c12273de79ae1a16eebb242c354e727ae166e2",
        sourceFileType: "UTM ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });

  it("creates new triggers from the exact admitted Aurora UTT blueprint profile", () => {
    expect(createNewSceneObject("triggers", 3.547599411010742, 4.491108703613281, 15)).toMatchObject({
      id: "tri_015",
      kind: "triggers",
      resRef: "newgeneric",
      tag: "GenericTrigger",
      x: 3.547599411010742,
      y: 4.491108703613281,
      z: 0,
      bearing: 0,
      source: {
        type: "aurora_blueprint",
        sourceKind: "trigger",
        sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
        templateId: "newgeneric",
        sourceEtag: "e855ae85a9b8511aca84ada06b9779126ff615f9bd816df4dbf39e1a1544001c",
        sourceFileType: "UTT ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });

  it("creates new encounters from the exact admitted Aurora UTE blueprint profile", () => {
    expect(createNewSceneObject("encounters", 2.241201591491699, 4.51970329284668, 15)).toMatchObject({
      id: "enc_015",
      kind: "encounters",
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      x: 2.241201591491699,
      y: 4.51970329284668,
      z: 0,
      bearing: 0,
      source: {
        type: "aurora_blueprint",
        sourceKind: "encounter",
        sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
        templateId: "x2_gnoll001",
        sourceEtag: "f3941f1eb580b55247f3ac226e8e0aa72841c3c81ba205c61319b8958a5daeed",
        sourceFileType: "UTE ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });

  it("keeps placeable and sound baselines in seed snapshot", () => {
    const scene = createSeedAreaScene();
    const placeable = scene.objects.find((object) => object.id === "plc_barrel_01");
    const sound = scene.objects.find((object) => object.id === "snd_amb_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });
    expect(sound?.soundPositioning).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 1,
      cutoffDistance: 10,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });
});
