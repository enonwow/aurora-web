import { describe, expect, it } from "vitest";
import { mapBackendAreaToScene } from "../../../../src/modules/areas/application/areaSceneMapper";
import type { AreaApiDetail } from "../../../../src/modules/areas/contracts";
import type { SceneObject, SceneObjectKind } from "../../../../src/modules/scene/contracts";

function countSceneObjectsByKind(objects: Array<{ kind: SceneObjectKind }>) {
  return objects.reduce(
    (counts, object) => {
      counts[object.kind] += 1;
      counts.total += 1;
      return counts;
    },
    {
      placeables: 0,
      doors: 0,
      creatures: 0,
      items: 0,
      sounds: 0,
      total: 0
    }
  );
}

function createCreatureTemplateObject(): SceneObject {
  return {
    id: "cre_template_cre_guard_01",
    kind: "creatures",
    name: "UTC Guard",
    resRef: "cre_guard_01",
    tag: "UTC_GUARD",
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
    source: {
      type: "aurora_git",
      sourceObjectId: "cre_guard_01",
      sourceKind: "creature",
      templateId: "cre_guard_01",
      appearanceType: 7
    },
    creatureProperties: {
      firstName: "UTC Guard",
      lastName: "Template",
      race: "Human",
      appearance: "UTC Appearance",
      phenotype: "Normal",
      gender: "Gender 0",
      description: "UTC description",
      challengeRating: 3,
      portraitResRef: "po_h_guard",
      conversation: "utc_conv",
      noInterrupt: false,
      alignment: "Lawful Good",
      statistics: {
        abilityScores: {
          strength: 12,
          dexterity: 13,
          constitution: 14,
          intelligence: 10,
          wisdom: 11,
          charisma: 9
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
          fortitudeBase: 0,
          fortitudeBonus: 2,
          reflexBase: 0,
          reflexBonus: 3,
          willBase: 0,
          willBonus: 4
        },
        naturalArmorClass: 1,
        baseArmorClass: 10,
        dexterityBonus: 0,
        sizeModifier: 0,
        baseHitPoints: 40,
        hitPointBonuses: 5,
        currentHitPoints: 33,
        maxHitPoints: 45,
        movementRate: "2"
      },
      appearanceProfile: {
        source2daRow: 7,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
        modelType: "P",
        raceModel: "Human",
        portrait2da: "po_h_guard",
        envMap: "default_env",
        defaultPhenotype: "0",
        bloodColor: "R",
        sizeCategory: 4,
        sizeCategoryLabel: "Large",
        sizeCategorySource2daRow: 4,
        sizeCategorySourceKey: "modules/current/__aurora/sources/hak/lc_2da/creaturesize.2da",
        raceAppearanceId: 7
      },
      lookupProfile: {
        raceLabelSource2daRow: 6,
        raceLabelSourceKey: "template/racialtypes.2da",
        soundSetResRef: "ss_template"
      },
      listCounts: {
        classListCount: 99,
        skillListCount: 99,
        featListCount: 99,
        templateListCount: 99,
        specAbilityListCount: 99,
        inventoryItemListCount: 99,
        equipItemListCount: 99
      },
      localizedStringRefs: {
        firstName: 100,
        description: 101,
        localizedName: 102,
        identifiedDescription: 103
      },
      localizedStrings: {
        localizedName: "UTC localized",
        displayName: "UTC display",
        identifiedDescription: "UTC identified description"
      },
      classEntries: [{ className: "Template Fighter", level: 2 }],
      templateEntries: [{ templateId: 99 }],
      skills: [{ skill: "Template Skill", rank: 9 }],
      feats: [{ name: "Template Feat", type: "feat", assigned: true }],
      spells: [
        {
          prepared: false,
          name: "Template Spell",
          spellLevel: 1,
          castingLevel: 2
        }
      ],
      specialAbilities: [
        {
          name: "Template Special",
          type: "special",
          casterLevel: 2,
          uses: 0
        }
      ],
      inventoryItems: [{ resRef: "template_inv", x: 0, y: 1 }],
      equippedItems: [{ resRef: "template_sword", slotMask: 16 }],
      scriptSlots: {
        onBlocked: "",
        onCombatRoundEnd: "",
        onConversation: "",
        onDamaged: "",
        onDeath: "",
        onDisturbed: "",
        onHeartbeat: "utc_hb",
        onPerception: "",
        onPhysicalAttacked: "",
        onRested: "",
        onSpawn: "utc_spawn",
        onSpellCastAt: "",
        onUserDefined: ""
      },
      advancedSettings: {
        blueprintResRef: "cre_guard_01",
        disarmable: true,
        plot: false,
        leavesLootableCorpse: true,
        noPermanentDeath: false,
        immortal: false,
        treasureModel: "",
        corpseDecayTimeSeconds: 0,
        faction: "Faction 1",
        subrace: "",
        deity: "",
        challengeRatingAdjustment: 0,
        soundSet: "SoundSet 12",
        perceptionRange: "11"
      }
    }
  };
}

function createPlaceableTemplateObject(): SceneObject {
  return {
    id: "plc_market_stall_001",
    kind: "placeables",
    name: "Template Market Stall",
    resRef: "plc_market_stall_001",
    tag: "PLC_MARKET_STALL_001",
    x: 0.5,
    y: 0.5,
    z: 0,
    bearing: 0,
    isStatic: true,
    visualTransform: {
      scale: 1.25,
      offsetX: 0.2,
      offsetY: -0.35,
      offsetZ: 0.45,
      pitch: 0.1,
      roll: -0.2,
      yaw: 0.3
    },
    source: {
      type: "aurora_git",
      sourceObjectId: "plc_market_stall_001",
      sourceKind: "placeable",
      templateId: "plc_market_stall_001"
    }
  };
}

describe("mapBackendAreaToScene", () => {
  it("preserves backend placeable static state instead of inferring it from kind", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_static_probe",
      name: "Static Probe",
      biome: "urban",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_static_probe",
        cacheKey: "atlas_static_probe",
        strategy: "blob-cache",
        objectKey: "atlas.webp",
        contentType: "image/webp",
        sizeBytes: 0
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-06-29T00:00:00.000Z",
      objects: [
        {
          objectId: "plc_useable",
          kind: "placeable",
          templateId: "plc_useable",
          isStatic: false,
          x: 0.25,
          y: 0.5,
          z: 0,
          bearing: 0
        }
      ]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000000000);

    expect(scene.objects[0]).toMatchObject({
      id: "area_static_probe:plc_useable",
      kind: "placeables",
      isStatic: false
    });
  });

  it("preserves ARE global lighting fields on the mapped AreaScene", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_lighting_probe",
      name: "Lighting Probe",
      biome: "urban",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_lighting_probe",
        cacheKey: "atlas_lighting_probe",
        strategy: "blob-cache",
        objectKey: "atlas.webp",
        contentType: "image/webp",
        sizeBytes: 0
      },
      lighting: {
        source: "are-root-fields",
        fields: [
          { field: "SunAmbientColor", value: 0x112233 },
          { field: "SunDiffuseColor", value: 0x445566 },
          { field: "FogClipDist", value: 80 },
          { field: "ShadowOpacity", value: 50 }
        ]
      },
      composition: {
        placeables: 0,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 0
      },
      updatedAt: "2026-06-30T00:00:00.000Z",
      objects: []
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000000100);

    expect(scene.lighting).toEqual({
      source: "are-root-fields",
      fields: [
        { field: "SunAmbientColor", value: 0x112233 },
        { field: "SunDiffuseColor", value: 0x445566 },
        { field: "FogClipDist", value: 80 },
        { field: "ShadowOpacity", value: 50 }
      ]
    });
    expect(scene.tileSource?.type).toBe("blocked_missing_tile_data");
  });

  it("maps backend area payload without synthesizing placeholder terrain when tiles are missing", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_city_001",
      name: "City Square",
      biome: "urban",
      width: 2,
      height: 2,
      tags: ["market"],
      benchmark: false,
      previewImageUrl: "/assets/previews/areas/area_city_001.webp",
      textureAtlas: {
        atlasId: "atlas_city_001",
        cacheKey: "atlas_city_001:2x2",
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_city_001.webp",
        contentType: "image/webp",
        sizeBytes: 4096,
        etag: "atlas-city-001"
      },
      composition: {
        placeables: 1,
        doors: 1,
        creatures: 1,
        items: 1,
        sounds: 1,
        total: 5
      },
      updatedAt: "2026-05-27T10:00:00.000Z",
      objects: [
        {
          objectId: "plc_001",
          kind: "placeable",
          templateId: "plc_market_stall_001",
          localizedName: "[W] Balustrada",
          description: "[Q]Pallet, Empty",
          x: 1,
          y: 2,
          z: 0,
          bearing: 90
        },
        {
          objectId: "dr_001",
          kind: "door",
          templateId: "nw_door_ttr_11",
          x: 2,
          y: 3,
          z: 0,
          bearing: 45
        },
        {
          objectId: "crt_001",
          kind: "creature",
          templateId: "nw_hguard",
          resRef: "cre_guard_01",
          tag: "guard_git_tag",
          appearanceType: 42,
          creatureMetadata: {
            templateResRef: "cre_guard_01",
            tag: "guard_git_tag",
            firstName: "GIT Guard",
            description: "Source creature instance",
            appearanceId: 42,
            race: 6,
            plot: true,
            strength: 15,
            hitPoints: 22,
            "script.scriptspawn": "nw_c2_guardspawn"
          },
          x: 3,
          y: 4,
          z: 0,
          bearing: 180
        },
        {
          objectId: "itm_001",
          kind: "item",
          templateId: "nw_it_mpotion001",
          resRef: "itm_potion_01",
          tag: "item_git_tag",
          localizedName: "Area Potion",
          description: "Potion on the ground",
          itemMetadata: {
            templateResRef: "itm_potion_01",
            tag: "item_git_tag",
            localizedName: "Area Potion",
            localizedNameStrRef: 711,
            description: "Potion on the ground",
            descriptionStrRef: 712,
            identifiedDescription: "Known potion",
            identifiedDescriptionStrRef: 713,
            comments: "instance comment",
            baseItem: 49,
            modelPart1: 11,
            modelPart2: 13,
            modelPart3: 63,
            cost: 42,
            addCost: 7,
            charges: 2,
            stackSize: 3,
            paletteId: 9,
            identified: true,
            stolen: true,
            plot: true,
            cursed: false,
            bodyPartTorso: 43,
            bodyPartRHand: 3,
            leather1Color: 5,
            metal2Color: 8,
            "script.onused": "it_onuse",
            itemPropertyListCount: 1,
            itemPropertyListEntries: JSON.stringify([
              {
                propertyName: 15,
                subtype: 66,
                costTable: 3,
                costValue: 1,
                param1: 255,
                param1Value: 0,
                chanceAppear: 100
              }
            ])
          },
          x: 5,
          y: 6,
          z: 0,
          bearing: 270
        },
        {
          objectId: "snd_001",
          kind: "sound",
          templateId: "sfx_forge_loop_heavy",
          x: 7,
          y: 8,
          z: 1.25,
          bearing: 0,
          soundPositioning: {
            mode: "random",
            elevation: 1.25,
            maxVolumeDistance: 2,
            cutoffDistance: 14,
            randomRangeWestEast: 3,
            randomRangeNorthSouth: 4,
            preserve: {
              timeWindow: "",
              hourMask: "",
              active: true,
              whenToPlay: "always",
              dayNight: "both",
              playStyle: "loop",
              playOrder: "random",
              intervalMs: 8000,
              intervalVariationMs: 1200,
              volume: 0.8,
              volumeVariation: 0.15,
              pitchVariation: 0.1,
              priority: 2,
              flags: {
                active: true,
                looping: true,
                random: true,
                positional: true,
                randomPosition: true
              },
              extra: {
                auroraSoundList: "forge_loop_a\nforge_loop_b"
              }
            }
          }
        }
      ]
    };
    const now = () => 1770000000000;

    const scene = mapBackendAreaToScene(backendArea, now);

    expect(scene.sceneId).toBe("area_city_001");
    expect(scene.areaName).toBe("City Square");
    expect(scene.width).toBe(2);
    expect(scene.height).toBe(2);
    expect(scene.biome).toBe("urban");
    expect(scene.tags).toEqual(["market"]);
    expect(scene.benchmark).toBe(false);
    expect(scene.previewImageUrl).toBe("/assets/previews/areas/area_city_001.webp");
    expect(scene.textureAtlas).toEqual({
      atlasId: "atlas_city_001",
      cacheKey: "atlas_city_001:2x2",
      strategy: "blob-cache",
      objectKey: "modules/current/areas/atlases/atlas_city_001.webp",
      contentType: "image/webp",
      sizeBytes: 4096,
      etag: "atlas-city-001"
    });
    expect(scene.composition).toEqual({
      placeables: 1,
      doors: 1,
      creatures: 1,
      items: 1,
      sounds: 1,
      total: 5
    });
    expect(scene.backendUpdatedAt).toBe("2026-05-27T10:00:00.000Z");
    expect(scene.tiles).toEqual([]);
    expect(scene.tileSource).toEqual({
      type: "blocked_missing_tile_data",
      tileCount: 0,
      fallbackReason: "area-api-tile-list-missing"
    });
    expect(scene.source).toBe("aurora_area");
    expect(scene.updatedAtUnixMs).toBe(1770000000000);
    expect(scene.objects).toHaveLength(5);
    expect(scene.objects[0]).toMatchObject({
      id: "area_city_001:plc_001",
      kind: "placeables",
      isStatic: true,
      x: 1,
      y: 2,
      z: 0,
      bearing: Math.PI / 2,
      source: expect.objectContaining({
        localizedName: "[W] Balustrada",
        description: "[Q]Pallet, Empty"
      })
    });
    expect(scene.objects[1]).toMatchObject({
      id: "area_city_001:dr_001",
      kind: "doors",
      isStatic: false,
      x: 2,
      y: 3,
      z: 0,
      bearing: Math.PI / 4
    });
    expect(scene.objects[2]).toMatchObject({
      id: "area_city_001:crt_001",
      kind: "creatures",
      isStatic: false,
      name: "GIT Guard",
      resRef: "cre_guard_01",
      tag: "guard_git_tag",
      x: 3,
      y: 4,
      z: 0,
      bearing: Math.PI,
      source: expect.objectContaining({
        type: "aurora_git",
        areaId: "area_city_001",
        sourceObjectId: "crt_001",
        sourceKind: "creature",
        templateId: "nw_hguard",
        appearanceType: 42,
        creatureMetadata: expect.objectContaining({
          templateResRef: "cre_guard_01",
          firstName: "GIT Guard",
          appearanceId: 42,
          strength: 15
        })
      }),
      creatureProperties: expect.objectContaining({
        firstName: "GIT Guard",
        race: "Race 6",
        appearance: "Appearance 42",
        description: "Source creature instance",
        scriptSlots: expect.objectContaining({
          onSpawn: "nw_c2_guardspawn"
        }),
        advancedSettings: expect.objectContaining({
          blueprintResRef: "cre_guard_01",
          plot: true
        }),
        statistics: expect.objectContaining({
          abilityScores: expect.objectContaining({
            strength: 15
          }),
          baseHitPoints: 22,
          currentHitPoints: 22,
          maxHitPoints: 22
        })
      })
    });
    expect(scene.objects[3]).toMatchObject({
      id: "area_city_001:itm_001",
      kind: "items",
      name: "Area Potion",
      resRef: "itm_potion_01",
      tag: "item_git_tag",
      isStatic: false,
      x: 5,
      y: 6,
      z: 0,
      bearing: (Math.PI * 3) / 2,
      source: expect.objectContaining({
        type: "aurora_git",
        areaId: "area_city_001",
        sourceObjectId: "itm_001",
        sourceKind: "item",
        templateId: "nw_it_mpotion001",
        localizedName: "Area Potion",
        description: "Potion on the ground"
      }),
      itemProperties: expect.objectContaining({
        localizedName: "Area Potion",
        localizedNameStrRef: 711,
        description: "Potion on the ground",
        descriptionStrRef: 712,
        identifiedDescription: "Known potion",
        identifiedDescriptionStrRef: 713,
        comments: "instance comment",
        paletteId: 9,
        baseItem: 49,
        modelPart1: 11,
        modelPart2: 13,
        modelPart3: 63,
        modelParts: [11, 13, 63],
        cost: 42,
        addCost: 7,
        charges: 2,
        stackSize: 3,
        identified: true,
        stolen: true,
        plot: true,
        cursed: false,
        armorParts: expect.objectContaining({
          torso: 43,
          rHand: 3
        }),
        materialColors: expect.objectContaining({
          leather1: 5,
          metal2: 8
        }),
        scripts: {
          onused: "it_onuse"
        },
        propertyList: [
          {
            propertyName: 15,
            subtype: 66,
            costTable: 3,
            costValue: 1,
            param1: 255,
            param1Value: 0,
            chanceAppear: 100
          }
        ]
      })
    });
    expect(scene.objects[4]).toMatchObject({
      id: "area_city_001:snd_001",
      kind: "sounds",
      isStatic: false,
      resRef: "sfx_forge_loop_heavy",
      x: 7,
      y: 8,
      z: 1.25,
      bearing: 0,
      soundPositioning: {
        mode: "random",
        elevation: 1.25,
        maxVolumeDistance: 2,
        cutoffDistance: 14,
        randomRangeWestEast: 3,
        randomRangeNorthSouth: 4,
        preserve: expect.objectContaining({
          active: true,
          playStyle: "loop",
          playOrder: "random",
          extra: {
            auroraSoundList: "forge_loop_a\nforge_loop_b"
          }
        })
      }
    });
  });

  it("does not inherit template visual transforms for GIT placeables without instance overrides", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_visual_transform_guard",
      name: "Visual Transform Guard",
      biome: "interior",
      width: 1,
      height: 1,
      tags: ["visual-transform"],
      benchmark: false,
      previewImageUrl: "/assets/previews/areas/area_visual_transform_guard.webp",
      textureAtlas: {
        atlasId: "atlas_visual_transform_guard",
        cacheKey: "atlas_visual_transform_guard:1x1",
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_visual_transform_guard.webp",
        contentType: "image/webp",
        sizeBytes: 1024,
        etag: "visual-transform-guard"
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-06-27T10:00:00.000Z",
      objects: [
        {
          objectId: "plc_001",
          kind: "placeable",
          templateId: "plc_market_stall_001",
          x: 0.25,
          y: 0.75,
          z: 0,
          bearing: 90
        }
      ]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000001111, {
      objectTemplateObjects: [createPlaceableTemplateObject()]
    });

    expect(scene.objects[0]).toMatchObject({
      id: "area_visual_transform_guard:plc_001",
      kind: "placeables",
      x: 0.25,
      y: 0.75,
      bearing: Math.PI / 2,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: 0
      }
    });
  });

  it("carries placeable UTP ItemList entries from template objects into area instances", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_inventory",
      name: "Placeable Inventory",
      biome: "interior",
      width: 1,
      height: 1,
      tags: ["inventory"],
      benchmark: false,
      previewImageUrl: "/assets/previews/areas/area_placeable_inventory.webp",
      textureAtlas: {
        atlasId: "atlas_placeable_inventory",
        cacheKey: "atlas_placeable_inventory:1x1",
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_placeable_inventory.webp",
        contentType: "image/webp",
        sizeBytes: 1024,
        etag: "placeable-inventory"
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-06-30T10:00:00.000Z",
      objects: [
        {
          objectId: "plc_chest_001",
          kind: "placeable",
          templateId: "plc_market_stall_001",
          x: 0.25,
          y: 0.75,
          z: 0,
          bearing: 90
        }
      ]
    };
    const templateObject: SceneObject = {
      ...createPlaceableTemplateObject(),
      placeableProperties: {
        plot: false,
        useable: true,
        hasInventory: true,
        inventoryItems: [
          {
            resRef: "nw_it_mpotion001",
            randomResRef: "rnd_potion",
            randomList: "rl_potions",
            itemTemplateId: "item_nw_it_mpotion001",
            itemResRef: "nw_it_mpotion001",
            x: 2,
            y: 3,
            dropable: true,
            pickpocketable: false,
            infinite: false
          }
        ]
      }
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000003333, {
      objectTemplateObjects: [templateObject]
    });

    expect(scene.objects[0]?.placeableProperties).toMatchObject({
      useable: true,
      hasInventory: true,
      inventoryItems: [
        {
          resRef: "nw_it_mpotion001",
          randomResRef: "rnd_potion",
          randomList: "rl_potions",
          itemResRef: "nw_it_mpotion001",
          x: 2,
          y: 3,
          dropable: true,
          pickpocketable: false,
          infinite: false
        }
      ]
    });
  });

  it("prefers GIT instance visual transforms over template visual transforms", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_visual_transform_instance",
      name: "Visual Transform Instance",
      biome: "interior",
      width: 1,
      height: 1,
      tags: ["visual-transform"],
      benchmark: false,
      previewImageUrl: "/assets/previews/areas/area_visual_transform_instance.webp",
      textureAtlas: {
        atlasId: "atlas_visual_transform_instance",
        cacheKey: "atlas_visual_transform_instance:1x1",
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_visual_transform_instance.webp",
        contentType: "image/webp",
        sizeBytes: 1024,
        etag: "visual-transform-instance"
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-06-27T10:00:00.000Z",
      objects: [
        {
          objectId: "plc_001",
          kind: "placeable",
          templateId: "plc_market_stall_001",
          x: 0.25,
          y: 0.75,
          z: 0,
          bearing: 90,
          visualTransform: {
            scale: 0.5,
            scaleX: 0.25,
            scaleY: 0.5,
            scaleZ: 0.75,
            offsetX: 0.1,
            offsetY: -0.2,
            offsetZ: 0.3,
            pitch: 4.712389,
            yaw: 1.570796,
            roll: 0
          }
        }
      ]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000002222, {
      objectTemplateObjects: [createPlaceableTemplateObject()]
    });

    expect(scene.objects[0]?.visualTransform).toEqual({
      scale: 0.5,
      scaleX: 0.25,
      scaleY: 0.5,
      scaleZ: 0.75,
      offsetX: 0.1,
      offsetY: -0.2,
      offsetZ: 0.3,
      pitch: 4.712389,
      yaw: 1.570796,
      roll: 0
    });
  });

  it("keeps non-default VisualTransform placeables in the non-static Aurora lane", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_visual_transform_static_guard",
      name: "Visual Transform Static Guard",
      biome: "interior",
      width: 1,
      height: 1,
      tags: ["visual-transform", "static"],
      benchmark: false,
      previewImageUrl: "/assets/previews/areas/area_visual_transform_static_guard.webp",
      textureAtlas: {
        atlasId: "atlas_visual_transform_static_guard",
        cacheKey: "atlas_visual_transform_static_guard:1x1",
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_visual_transform_static_guard.webp",
        contentType: "image/webp",
        sizeBytes: 1024,
        etag: "visual-transform-static-guard"
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-07-03T10:00:00.000Z",
      objects: [
        {
          objectId: "plc_vt_non_static",
          kind: "placeable",
          templateId: "plc_market_stall_001",
          isStatic: true,
          x: 0.25,
          y: 0.75,
          z: 0,
          bearing: 90,
          visualTransform: {
            scale: 0.5,
            scaleX: 0.5,
            scaleY: 0.5,
            scaleZ: 0.5,
            offsetX: 0,
            offsetY: 0,
            offsetZ: 0,
            pitch: 4.712389,
            yaw: 1.570796,
            roll: 0
          }
        }
      ]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000003334, {
      objectTemplateObjects: [createPlaceableTemplateObject()]
    });

    expect(scene.objects[0]).toMatchObject({
      id: "area_visual_transform_static_guard:plc_vt_non_static",
      kind: "placeables",
      isStatic: false,
      visualTransform: {
        scale: 0.5,
        scaleX: 0.5,
        scaleY: 0.5,
        scaleZ: 0.5,
        pitch: 4.712389,
        yaw: 1.570796,
        roll: 0
      }
    });
  });

  it("keeps public area scene snapshot counts traceable to mapped objects", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_snapshot_count_guard",
      name: "Snapshot Count Guard",
      biome: "interior",
      width: 3,
      height: 2,
      tags: ["snapshot", "count-fidelity"],
      benchmark: true,
      previewImageUrl: "/assets/previews/areas/area_snapshot_count_guard.webp",
      textureAtlas: {
        atlasId: "atlas_snapshot_count_guard",
        cacheKey: "atlas_snapshot_count_guard:3x2",
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_snapshot_count_guard.webp",
        contentType: "image/webp",
        sizeBytes: 16384,
        etag: "snapshot-count-guard"
      },
      tileSet: "tno01",
      tiles: [
        {
          tileInstanceId: "area_snapshot_count_guard:tile:0",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 0,
          col: 0,
          tileIndex: 0,
          tileId: 101,
          modelResRef: "tno01_a01_01",
          modelSource: "set-tile-section",
          imageMap2D: "mi_tno01_a01_01",
          orientation: 1,
          height: 0.5,
          source: "are-tile-list"
        },
        {
          tileInstanceId: "area_snapshot_count_guard:tile:1",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 0,
          col: 1,
          tileIndex: 1,
          tileId: 102,
          orientation: 2,
          source: "are-tile-list",
          fallbackReason: "tile-model-reference-missing"
        },
        {
          tileInstanceId: "area_snapshot_count_guard:tile:2",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 0,
          col: 2,
          tileIndex: 2,
          tileId: 103,
          orientation: 3,
          source: "are-tile-list",
          fallbackReason: "tile-model-reference-missing"
        },
        {
          tileInstanceId: "area_snapshot_count_guard:tile:3",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 1,
          col: 0,
          tileIndex: 3,
          tileId: 104,
          orientation: 0,
          source: "are-tile-list",
          fallbackReason: "tile-model-reference-missing"
        },
        {
          tileInstanceId: "area_snapshot_count_guard:tile:4",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 1,
          col: 1,
          tileIndex: 4,
          tileId: 105,
          orientation: 1,
          source: "are-tile-list",
          fallbackReason: "tile-model-reference-missing"
        },
        {
          tileInstanceId: "area_snapshot_count_guard:tile:5",
          areaId: "area_snapshot_count_guard",
          tilesetResRef: "tno01",
          row: 1,
          col: 2,
          tileIndex: 5,
          tileId: 106,
          orientation: 2,
          source: "are-tile-list",
          fallbackReason: "tile-model-reference-missing"
        }
      ],
      composition: {
        placeables: 2,
        doors: 1,
        creatures: 1,
        items: 1,
        sounds: 2,
        total: 7
      },
      updatedAt: "2026-06-17T01:07:38.361Z",
      objects: [
        {
          objectId: "plc_altar_01",
          kind: "placeable",
          templateId: "plc_altar_01",
          x: 0,
          y: 1,
          z: 0,
          bearing: 0
        },
        {
          objectId: "plc_chest_01",
          kind: "placeable",
          templateId: "plc_chest_01",
          x: 1,
          y: 1,
          z: 0,
          bearing: 45
        },
        {
          objectId: "door_exit_01",
          kind: "door",
          templateId: "nw_door_ttr_11",
          x: 2,
          y: 1,
          z: 0,
          bearing: 90
        },
        {
          objectId: "creature_guard_01",
          kind: "creature",
          templateId: "nw_hguard",
          x: 1,
          y: 0,
          z: 0,
          bearing: 180
        },
        {
          objectId: "item_potion_01",
          kind: "item",
          templateId: "nw_it_mpotion001",
          x: 2,
          y: 0,
          z: 0,
          bearing: 270
        },
        {
          objectId: "sound_room_01",
          kind: "sound",
          templateId: "amb_room_low",
          x: 0,
          y: 0,
          z: 0.5,
          bearing: 0,
          soundPositioning: {
            mode: "specific",
            elevation: 0.5,
            maxVolumeDistance: 3,
            cutoffDistance: 12,
            randomRangeWestEast: 0,
            randomRangeNorthSouth: 0,
            preserve: {
              timeWindow: "",
              hourMask: "",
              active: true,
              whenToPlay: "always",
              dayNight: "both",
              playStyle: "loop",
              playOrder: "sequential",
              intervalMs: 0,
              intervalVariationMs: 0,
              volume: 0.6,
              volumeVariation: 0,
              pitchVariation: 0,
              priority: 1,
              flags: {
                active: true,
                looping: true,
                random: false,
                positional: true,
                randomPosition: false
              },
              extra: {
                backendSoundId: "sound_room_01",
                soundTemplateSource: "area-payload"
              }
            }
          }
        },
        {
          objectId: "sound_room_02",
          kind: "sound",
          templateId: "amb_room_high",
          x: 2,
          y: 0,
          z: 1,
          bearing: 0,
          soundPositioning: {
            mode: "random",
            elevation: 1,
            maxVolumeDistance: 4,
            cutoffDistance: 16,
            randomRangeWestEast: 2,
            randomRangeNorthSouth: 1,
            preserve: {
              timeWindow: "",
              hourMask: "",
              active: true,
              whenToPlay: "always",
              dayNight: "both",
              playStyle: "repeat",
              playOrder: "random",
              intervalMs: 5000,
              intervalVariationMs: 500,
              volume: 0.5,
              volumeVariation: 0.1,
              pitchVariation: 0.05,
              priority: 2,
              flags: {
                active: true,
                looping: false,
                random: true,
                positional: true,
                randomPosition: true
              },
              extra: {
                backendSoundId: "sound_room_02",
                soundTemplateSource: "area-payload"
              }
            }
          }
        }
      ]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000001234);

    expect(scene).toMatchObject({
      sceneId: "area_snapshot_count_guard",
      areaName: "Snapshot Count Guard",
      width: 3,
      height: 2,
      biome: "interior",
      tags: ["snapshot", "count-fidelity"],
      benchmark: true,
      previewImageUrl: "/assets/previews/areas/area_snapshot_count_guard.webp",
      textureAtlas: {
        atlasId: "atlas_snapshot_count_guard",
        cacheKey: "atlas_snapshot_count_guard:3x2",
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_snapshot_count_guard.webp",
        contentType: "image/webp",
        sizeBytes: 16384,
        etag: "snapshot-count-guard"
      },
      composition: {
        placeables: 2,
        doors: 1,
        creatures: 1,
        items: 1,
        sounds: 2,
        total: 7
      },
      backendUpdatedAt: "2026-06-17T01:07:38.361Z",
      tileSource: {
        type: "aurora_tile_list",
        tilesetResRef: "tno01",
        tileCount: 6,
        fallbackReason: "tile-metadata-incomplete"
      },
      updatedAtUnixMs: 1770000001234
    });
    expect(scene.tiles).toHaveLength(6);
    expect(scene.source).toBe("aurora_area");
    expect(scene.tiles[0]).toMatchObject({
      id: "area_snapshot_count_guard:tile:0",
      source: "aurora_tile_list",
      areaId: "area_snapshot_count_guard",
      tilesetResRef: "tno01",
      row: 0,
      col: 0,
      tileIndex: 0,
      tileId: 101,
      modelResRef: "tno01_a01_01",
      modelSource: "set-tile-section",
      imageMap2D: "mi_tno01_a01_01",
      orientation: 1,
      height: 0.5
    });
    expect(scene.tiles[1]).toMatchObject({
      id: "area_snapshot_count_guard:tile:1",
      source: "aurora_tile_list",
      fallbackReason: "tile-model-reference-missing"
    });
    expect(scene.objects).toHaveLength(scene.composition?.total);
    expect(countSceneObjectsByKind(scene.objects)).toEqual(scene.composition);
    expect(scene.objects.map((object) => object.kind)).toEqual([
      "placeables",
      "placeables",
      "doors",
      "creatures",
      "items",
      "sounds",
      "sounds"
    ]);
    expect(scene.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "area_snapshot_count_guard:plc_altar_01", kind: "placeables" }),
        expect.objectContaining({ id: "area_snapshot_count_guard:plc_chest_01", kind: "placeables" }),
        expect.objectContaining({ id: "area_snapshot_count_guard:door_exit_01", kind: "doors" }),
        expect.objectContaining({ id: "area_snapshot_count_guard:creature_guard_01", kind: "creatures" }),
        expect.objectContaining({ id: "area_snapshot_count_guard:item_potion_01", kind: "items" })
      ])
    );
    expect(
      scene.objects.find((object) => object.id === "area_snapshot_count_guard:sound_room_02")
        ?.soundPositioning
    ).toEqual({
      mode: "random",
      elevation: 1,
      maxVolumeDistance: 4,
      cutoffDistance: 16,
      randomRangeWestEast: 2,
      randomRangeNorthSouth: 1,
      preserve: {
        timeWindow: "",
        hourMask: "",
        active: true,
        whenToPlay: "always",
        dayNight: "both",
        hoursStart: 0,
        hoursEnd: 23,
        playStyle: "repeat",
        playOrder: "random",
        intervalMs: 5000,
        intervalVariationMs: 500,
        volume: 0.5,
        volumeVariation: 0.1,
        pitchVariation: 0.05,
        priority: 2,
        flags: {
          active: true,
          looping: false,
          random: true,
          positional: true,
          randomPosition: true
        },
        extra: {
          backendSoundId: "sound_room_02",
          soundTemplateSource: "area-payload"
        }
      }
    });
  });

  it("overlays GIT creature instance fields on top of matching UTC template properties", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_creature_overlay",
      name: "Creature Overlay",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "/assets/previews/areas/area_creature_overlay.webp",
      textureAtlas: {
        atlasId: "atlas_overlay",
        cacheKey: "atlas_overlay:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 0,
        doors: 0,
        creatures: 1,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-06-26T08:00:00.000Z",
      objects: [
        {
          objectId: "creature_guard_01",
          kind: "creature",
          templateId: "cre_guard_01",
          resRef: "cre_guard_01",
          tag: "GIT_GUARD",
          creatureMetadata: {
            templateResRef: "cre_guard_01",
            tag: "GIT_GUARD",
            firstNameStrRef: 9101,
            descriptionStrRef: 9102,
            localizedName: "GIT localized",
            localizedNameStrRef: 9103,
            displayName: "GIT display",
            identifiedDescription: "GIT identified description",
            identifiedDescriptionStrRef: 9104,
            raceLabelSource2daRow: 6,
            raceLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da",
            soundSetResRef: "ss_guard",
            soundSetSource2daRow: 12,
            soundSetSourceKey: "modules/current/__aurora/sources/hak/lc_2da/soundset.2da",
            strength: 18,
            strengthAdjust: 7,
            wisdomAdjust: 8,
            plot: true,
            decayTime: 9,
            classListCount: 1,
            skillListCount: 1,
            featListCount: 1,
            templateListCount: 1,
            specAbilityListCount: 1,
            inventoryItemListCount: 1,
            equipItemListCount: 1,
            classListEntries: JSON.stringify([
              {
                classId: 1,
                level: 4,
                knownSpellCount: 1,
                knownSpells: [{ spellId: 201, spellLevel: 0, metaMagic: 0, flags: 1 }]
              }
            ]),
            skillListEntries: JSON.stringify([{ skillId: 0, rank: 5 }]),
            featListEntries: JSON.stringify([{ featId: 1001 }]),
            templateListEntries: JSON.stringify([{ templateId: 2 }]),
            specAbilityListEntries: JSON.stringify([
              { spellId: 401, flags: 1, casterLevel: 15 }
            ]),
            inventoryItemListEntries: JSON.stringify([
              {
                resRef: "nw_it_potion",
                x: 3,
                y: 4,
                dropable: true,
                pickpocketable: true,
                infinite: false
              }
            ]),
            equipItemListEntries: JSON.stringify([
              {
                resRef: "nw_wswss001",
                slotMask: 131072,
                dropable: false,
                pickpocketable: false,
                infinite: true
              }
            ]),
            "script.scriptspawn": "git_spawn"
          },
          x: 0.25,
          y: 0.5,
          z: 0,
          bearing: 90
        }
      ]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000002222, {
      creatureTemplateObjects: [createCreatureTemplateObject()]
    });
    const creature = scene.objects[0];

    expect(creature.name).toBe("UTC Guard");
    expect(creature.tag).toBe("GIT_GUARD");
    expect(creature.creatureProperties).toMatchObject({
      firstName: "UTC Guard",
      description: "UTC description",
      challengeRating: 3,
      statistics: expect.objectContaining({
        abilityScores: expect.objectContaining({
          strength: 18,
          dexterity: 13
        }),
        racialModifiers: expect.objectContaining({
          strength: 7,
          dexterity: 2,
          wisdom: 8,
          charisma: 6
        }),
        baseHitPoints: 40,
        currentHitPoints: 33,
        maxHitPoints: 45
      }),
      scriptSlots: expect.objectContaining({
        onHeartbeat: "utc_hb",
        onSpawn: "git_spawn"
      }),
      advancedSettings: expect.objectContaining({
        blueprintResRef: "cre_guard_01",
        plot: true,
        corpseDecayTimeSeconds: 9,
        faction: "Faction 1"
      }),
      appearanceProfile: expect.objectContaining({
        source2daRow: 7,
        modelType: "P",
        raceModel: "Human",
        portrait2da: "po_h_guard",
        envMap: "default_env",
        defaultPhenotype: "0",
        bloodColor: "R",
        sizeCategory: 4,
        sizeCategoryLabel: "Large",
        sizeCategorySource2daRow: 4,
        sizeCategorySourceKey: "modules/current/__aurora/sources/hak/lc_2da/creaturesize.2da",
        raceAppearanceId: 7
      }),
      lookupProfile: expect.objectContaining({
        raceLabelSource2daRow: 6,
        raceLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da",
        soundSetResRef: "ss_guard",
        soundSetSource2daRow: 12,
        soundSetSourceKey: "modules/current/__aurora/sources/hak/lc_2da/soundset.2da"
      }),
      listCounts: expect.objectContaining({
        classListCount: 1,
        skillListCount: 1,
        featListCount: 1,
        templateListCount: 1,
        specAbilityListCount: 1,
        inventoryItemListCount: 1,
        equipItemListCount: 1
      }),
      localizedStringRefs: expect.objectContaining({
        firstName: 9101,
        description: 9102,
        localizedName: 9103,
        identifiedDescription: 9104
      }),
      localizedStrings: expect.objectContaining({
        localizedName: "GIT localized",
        displayName: "GIT display",
        identifiedDescription: "GIT identified description"
      })
    });
    expect(creature.creatureProperties?.classEntries).toEqual([
      { className: "Class 1", level: 4 }
    ]);
    expect(creature.creatureProperties?.skills).toEqual([
      { skill: "Animal Empathy", rank: 5 }
    ]);
    expect(creature.creatureProperties?.feats).toEqual([
      { name: "Feat 1001", type: "feat", assigned: true }
    ]);
    expect(creature.creatureProperties?.templateEntries).toEqual([{ templateId: 2 }]);
    expect(creature.creatureProperties?.spells).toEqual([
      {
        prepared: false,
        name: "Spell 201",
        spellLevel: 0,
        castingLevel: 4,
        metaMagic: 0,
        flags: 1
      }
    ]);
    expect(creature.creatureProperties?.specialAbilities).toEqual([
      {
        name: "Spell 401",
        type: "Flags 1",
        casterLevel: 15,
        uses: 0
      }
    ]);
    expect(creature.creatureProperties?.inventoryItems).toEqual([
      {
        resRef: "nw_it_potion",
        x: 3,
        y: 4,
        dropable: true,
        pickpocketable: true,
        infinite: false
      }
    ]);
    expect(creature.creatureProperties?.equippedItems).toEqual([
      {
        resRef: "nw_wswss001",
        slotMask: 131072,
        dropable: false,
        pickpocketable: false,
        infinite: true
      }
    ]);
  });
});
