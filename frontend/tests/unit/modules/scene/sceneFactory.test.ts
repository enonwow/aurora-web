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
        startingPackage: true
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
    expect(object.resRef).toBe("plc_a01");
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
