import { describe, expect, it } from "vitest";
import {
  createBlankAreaScene,
  createNewSceneObject,
  createSeedAreaScene,
  normalizeSceneObjectMetadata,
  rescaleSceneObjectsToSize
} from "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneFactory placeable preserve-only normalization", () => {
  it("creates a blank startup area without demo objects", () => {
    const scene = createBlankAreaScene(2, 2, 1700000000000);

    expect(scene.sceneId).toBe("blank_builder_v1");
    expect(scene.areaName).toBe("Untitled Area");
    expect(scene.width).toBe(2);
    expect(scene.height).toBe(2);
    expect(scene.tiles).toHaveLength(4);
    expect(scene.objects).toEqual([]);
    expect(scene.tileSource?.fallbackReason).toBe("blank-startup-scene");
    expect(scene.updatedAtUnixMs).toBe(1700000000000);
  });

  it("normalizes preserve-only script slots and disabled flags defensively", () => {
    const placeable = createNewSceneObject("placeables", 1, 1, 77);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      placeableProperties: {
        plot: true,
        useable: false,
        hasInventory: true,
        scriptSlots: {
          onOpen: "plc_on_open",
          onDeath: 42
        } as unknown as NonNullable<typeof placeable.placeableProperties>["scriptSlots"],
        disabledFlags: {
          plot: false,
          useable: "invalid",
          hasInventory: true
        } as unknown as NonNullable<typeof placeable.placeableProperties>["disabledFlags"]
      }
    });

    expect(normalized.placeableProperties).toEqual({
      plot: true,
      useable: false,
      hasInventory: true,
      scriptSlots: {
        onClick: "",
        onClosed: "",
        onDamaged: "",
        onDeath: "",
        onHeartbeat: "",
        onInvDisturbed: "",
        onLock: "",
        onMeleeAttacked: "",
        onOpen: "plc_on_open",
        onSpellCastAt: "",
        onUnlock: "",
        onUsed: "",
        onUserDefined: ""
      },
      disabledFlags: {
        plot: false,
        useable: true,
        hasInventory: true
      }
    });
  });

  it("keeps legacy placeable payload behavior unchanged for plot/useable/hasInventory", () => {
    const placeable = createNewSceneObject("placeables", 1.4, 0.7, 12);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      placeableProperties: {
        plot: true,
        useable: true,
        hasInventory: false
      }
    });

    expect(normalized.placeableProperties).toEqual({
      plot: true,
      useable: true,
      hasInventory: false
    });
    expect(normalized.placeableProperties?.scriptSlots).toBeUndefined();
    expect(normalized.placeableProperties?.disabledFlags).toBeUndefined();
  });

  it("preserves only a present unsigned DWord Placeable Appearance target", () => {
    const placeable = createNewSceneObject("placeables", 1, 1, 77);
    const exact = normalizeSceneObjectMetadata({
      ...placeable,
      placeableProperties: {
        plot: false,
        useable: false,
        hasInventory: false,
        appearanceType: 104
      } as NonNullable<typeof placeable.placeableProperties>
    });
    expect(exact.placeableProperties).toHaveProperty("appearanceType", 104);
    expect(normalizeSceneObjectMetadata(exact)).toBe(exact);

    for (const boundary of [0, 0xffff_ffff]) {
      const normalized = normalizeSceneObjectMetadata({
        ...placeable,
        placeableProperties: {
          plot: false,
          useable: false,
          hasInventory: false,
          appearanceType: boundary
        }
      });
      expect(normalized.placeableProperties).toHaveProperty("appearanceType", boundary);
    }

    for (const appearanceType of [undefined, -1, 1.5, 0x1_0000_0000, "104"]) {
      const invalid = normalizeSceneObjectMetadata({
        ...placeable,
        placeableProperties: {
          plot: false,
          useable: false,
          hasInventory: false,
          appearanceType
        } as unknown as NonNullable<typeof placeable.placeableProperties>
      });
      expect(invalid.placeableProperties).not.toHaveProperty("appearanceType");
      expect(invalid).not.toBe(placeable);
    }
  });

  it("preserves only a present integer Toolset-range Placeable HP target", () => {
    const placeable = createNewSceneObject("placeables", 1, 1, 78);
    for (const hitPoints of [1, 15, 10_000]) {
      const normalized = normalizeSceneObjectMetadata({
        ...placeable,
        placeableProperties: {
          plot: false,
          useable: false,
          hasInventory: false,
          hitPoints
        }
      });
      expect(normalized.placeableProperties).toHaveProperty("hitPoints", hitPoints);
      expect(normalizeSceneObjectMetadata(normalized)).toBe(normalized);
    }

    for (const hitPoints of [undefined, 0, 10_001, 1.5, "15"]) {
      const invalid = normalizeSceneObjectMetadata({
        ...placeable,
        placeableProperties: {
          plot: false,
          useable: false,
          hasInventory: false,
          hitPoints
        } as unknown as NonNullable<typeof placeable.placeableProperties>
      });
      expect(invalid.placeableProperties).not.toHaveProperty("hitPoints");
    }
  });

  it("preserves preserve-only fields across scene rescale roundtrip", () => {
    const scene = createSeedAreaScene(18, 18);
    const customized = scene.objects.map((object) => {
      if (object.id !== "plc_barrel_01") {
        return object;
      }
      return {
        ...object,
        placeableProperties: {
          plot: true,
          useable: false,
          hasInventory: true,
          scriptSlots: {
            onClick: "plc_click",
            onClosed: "",
            onDamaged: "",
            onDeath: "",
            onHeartbeat: "",
            onInvDisturbed: "",
            onLock: "plc_lock",
            onMeleeAttacked: "",
            onOpen: "",
            onSpellCastAt: "",
            onUnlock: "",
            onUsed: "plc_use",
            onUserDefined: ""
          },
          disabledFlags: {
            plot: true,
            useable: true,
            hasInventory: false
          }
        }
      };
    });

    const scaled = rescaleSceneObjectsToSize(customized, 18, 18, 2, 2);
    const placeable = scaled.find((object) => object.id === "plc_barrel_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: true,
      useable: false,
      hasInventory: true,
      scriptSlots: {
        onClick: "plc_click",
        onClosed: "",
        onDamaged: "",
        onDeath: "",
        onHeartbeat: "",
        onInvDisturbed: "",
        onLock: "plc_lock",
        onMeleeAttacked: "",
        onOpen: "",
        onSpellCastAt: "",
        onUnlock: "",
        onUsed: "plc_use",
        onUserDefined: ""
      },
      disabledFlags: {
        plot: true,
        useable: true,
        hasInventory: false
      }
    });
  });

  it("normalizes optional vfx preserve-only payload defensively", () => {
    const creature = createNewSceneObject("creatures", 2.2, 1.1, 88);
    const normalized = normalizeSceneObjectMetadata({
      ...creature,
      vfxPayload: {
        profile: "vfx_magic_a",
        emitter: 777,
        script: "fx_heartbeat",
        sourceKind: "placeable_preview",
        sourceProfile: "catalog-placeable-vfx",
        sourceTable: "placeable-template-catalog",
        sourceRowId: 286,
        sourceLabel: "Screen Shake",
        sourceResRef: "vfx_screen_shake",
        previewMode: "derived_model_preview",
        canonicalStatus: "preview_only",
        diagnostics: [
          {
            code: "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY",
            severity: "warn",
            message: "preview only"
          },
          {
            code: "",
            severity: "bad",
            message: 12
          }
        ],
        flags: {
          billboard: true,
          castShadow: "bad"
        },
        extra: {
          intensity: 0.7,
          group: "ambient",
          enabled: true,
          nullable: null,
          nested: { invalid: true }
        }
      } as unknown as NonNullable<typeof creature.vfxPayload>
    });

    expect(normalized.vfxPayload).toEqual({
      version: "scene-object-vfx-preserve/v1",
      profile: "vfx_magic_a",
      emitter: "",
      script: "fx_heartbeat",
      sourceKind: "placeable_preview",
      sourceProfile: "catalog-placeable-vfx",
      sourceTable: "placeable-template-catalog",
      sourceRowId: 286,
      sourceLabel: "Screen Shake",
      sourceResRef: "vfx_screen_shake",
      previewMode: "derived_model_preview",
      canonicalStatus: "preview_only",
      diagnostics: [
        {
          code: "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY",
          severity: "warn",
          message: "preview only"
        }
      ],
      flags: {
        billboard: true
      },
      extra: {
        intensity: 0.7,
        group: "ambient",
        enabled: true,
        nullable: null
      }
    });

    const roundtrip = normalizeSceneObjectMetadata(normalized);
    expect(roundtrip).toBe(normalized);
  });

  it("normalizes creature properties defensively and strips non-creature payloads", () => {
    const creature = createNewSceneObject("creatures", 2.2, 1.1, 88);
    const normalized = normalizeSceneObjectMetadata({
      ...creature,
      placeableProperties: {
        plot: true,
        useable: true,
        hasInventory: true
      },
      soundPositioning: {
        mode: "specific"
      } as unknown as NonNullable<typeof creature.soundPositioning>,
      doorTransition: {
        linkedTarget: "door_a"
      } as unknown as NonNullable<typeof creature.doorTransition>,
      creatureProperties: {
        firstName: "Battle Devourer",
        lastName: 11,
        race: "Aberration",
        appearance: "nw_battdevour",
        appearanceType: 249,
        challengeRating: -4,
        statistics: {
          abilityScores: {
            strength: 15,
            dexterity: "bad"
          },
          movementRate: 77
        },
        classEntries: [{ className: "Aberration", level: 9 }, { className: 42, level: -3 }],
        lookupProfile: {
          raceLabelSource2daRow: 6.9,
          raceLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da",
          genderLabelSource2daRow: 1.2,
          genderLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/gender.2da",
          portraitResolvedSource2daRow: 41.7,
          portraitResolvedSourceKey: "modules/current/__aurora/sources/hak/lc_2da/portraits.2da",
          soundSetResRef: "ss_guard",
          soundSetSource2daRow: 55.6,
          soundSetSourceKey: "modules/current/__aurora/sources/hak/lc_2da/soundset.2da"
        },
        listCounts: {
          classListCount: 2.9,
          skillListCount: 3.1,
          featListCount: 1.7,
          templateListCount: 0.4,
          specAbilityListCount: 4.6,
          inventoryItemListCount: 5.2,
          equipItemListCount: -2
        },
        localizedStringRefs: {
          firstName: 1001.9,
          lastName: 1002.2,
          localizedName: 1003.7,
          description: 2001.6,
          identifiedDescription: 2002.4,
          subrace: 3001.1,
          deity: 3002.8
        },
        localizedStrings: {
          localizedName: "Battle Devourer Localized",
          displayName: "Battle Devourer Display",
          identifiedDescription: "Identified devourer description"
        },
        scriptSlots: {
          onHeartbeat: "nw_crt_hb",
          onBlocked: 123
        },
        advancedSettings: {
          corpseDecayTimeSeconds: -10,
          plot: true,
          animationState: 2.8,
          animationName: " walk ",
          walkRateSource2daRow: 42.9,
          walkRateSource2daName: " appearance.2da ",
          walkRateSpeed2daRow: 7.2,
          walkRateAppearance2daSourceKey:
            " modules/current/__aurora/sources/hak/lc_2da/appearance.2da ",
          walkRateSpeed2daSourceKey:
            " modules/current/__aurora/sources/hak/lc_2da/creaturespeed.2da "
        }
      } as unknown as NonNullable<typeof creature.creatureProperties>
    });

    expect(normalized.placeableProperties).toBeUndefined();
    expect(normalized.soundPositioning).toBeUndefined();
    expect(normalized.doorTransition).toBeUndefined();
    expect(normalized.creatureProperties?.firstName).toBe("Battle Devourer");
    expect(normalized.creatureProperties?.lastName).toBe("");
    expect(normalized.creatureProperties?.appearanceType).toBe(249);
    expect(normalized.creatureProperties?.challengeRating).toBe(0);
    expect(normalized.creatureProperties?.statistics?.abilityScores.strength).toBe(15);
    expect(normalized.creatureProperties?.statistics?.abilityScores.dexterity).toBe(10);
    expect(normalized.creatureProperties?.statistics?.movementRate).toBe("Default");
    expect(normalized.creatureProperties?.classEntries).toEqual([
      { className: "Aberration", level: 9 },
      { className: "Class", level: 1 }
    ]);
    expect(normalized.creatureProperties?.lookupProfile).toEqual({
      raceLabelSource2daRow: 6,
      raceLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da",
      genderLabelSource2daRow: 1,
      genderLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/gender.2da",
      portraitResolvedSource2daRow: 41,
      portraitResolvedSourceKey: "modules/current/__aurora/sources/hak/lc_2da/portraits.2da",
      soundSetResRef: "ss_guard",
      soundSetSource2daRow: 55,
      soundSetSourceKey: "modules/current/__aurora/sources/hak/lc_2da/soundset.2da"
    });
    expect(normalized.creatureProperties?.listCounts).toEqual({
      classListCount: 2,
      skillListCount: 3,
      featListCount: 1,
      templateListCount: 0,
      specAbilityListCount: 4,
      inventoryItemListCount: 5,
      equipItemListCount: 0
    });
    expect(normalized.creatureProperties?.localizedStringRefs).toEqual({
      firstName: 1001,
      lastName: 1002,
      localizedName: 1003,
      description: 2001,
      identifiedDescription: 2002,
      subrace: 3001,
      deity: 3002
    });
    expect(normalized.creatureProperties?.localizedStrings).toEqual({
      localizedName: "Battle Devourer Localized",
      displayName: "Battle Devourer Display",
      identifiedDescription: "Identified devourer description"
    });
    expect(normalized.creatureProperties?.scriptSlots?.onHeartbeat).toBe("nw_crt_hb");
    expect(normalized.creatureProperties?.scriptSlots?.onBlocked).toBe("");
    expect(normalized.creatureProperties?.advancedSettings?.corpseDecayTimeSeconds).toBe(0);
    expect(normalized.creatureProperties?.advancedSettings?.plot).toBe(true);
    expect(normalized.creatureProperties?.advancedSettings?.animationState).toBe(2);
    expect(normalized.creatureProperties?.advancedSettings?.animationName).toBe("walk");
    expect(normalized.creatureProperties?.advancedSettings?.walkRateSource2daRow).toBe(42);
    expect(normalized.creatureProperties?.advancedSettings?.walkRateSource2daName).toBe("appearance.2da");
    expect(normalized.creatureProperties?.advancedSettings?.walkRateSpeed2daRow).toBe(7);
    expect(normalized.creatureProperties?.advancedSettings?.walkRateAppearance2daSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/appearance.2da"
    );
    expect(normalized.creatureProperties?.advancedSettings?.walkRateSpeed2daSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/creaturespeed.2da"
    );
  });

  it("preserves a valid Creature class spell-list clear profile across normalization", () => {
    const creature = createNewSceneObject("creatures", 2.2, 1.1, 188);
    const sourceReorder = {
      classSlotIndex: 0,
      listKind: "known" as const,
      spellLevel: 1,
      entryOrder: [1, 0],
    };
    const normalized = normalizeSceneObjectMetadata({
      ...creature,
      creatureProperties: {
        ...creature.creatureProperties!,
        classSpellClearSlotIndices: [0, 2],
        classSpellClearConfirmed: true,
        classSpellReorders: [sourceReorder],
        classSpellReorderConfirmed: true,
      },
    });

    expect(normalized.creatureProperties?.classSpellClearSlotIndices).toEqual([0, 2]);
    expect(normalized.creatureProperties?.classSpellClearConfirmed).toBe(true);
    expect(normalized.creatureProperties?.classSpellReorders).toEqual([{
      classSlotIndex: 0,
      listKind: "known",
      spellLevel: 1,
      entryOrder: [1, 0],
    }]);
    expect(normalized.creatureProperties?.classSpellReorderConfirmed).toBe(true);
    expect(normalizeSceneObjectMetadata(normalized)).toBe(normalized);
  });

  it("drops malformed Creature class spell-entry reorder metadata", () => {
    const creature = createNewSceneObject("creatures", 2.2, 1.1, 188);
    const normalized = normalizeSceneObjectMetadata({
      ...creature,
      creatureProperties: {
        ...creature.creatureProperties!,
        classSpellReorders: [{
          classSlotIndex: 0,
          listKind: "known",
          spellLevel: 1,
          entryOrder: [0, 0],
        }],
        classSpellReorderConfirmed: true,
      },
    });

    expect(normalized.creatureProperties?.classSpellReorders).toBeUndefined();
    expect(normalized.creatureProperties?.classSpellReorderConfirmed).toBe(true);
  });

  it("preserves only a present unsigned Byte Creature Gender target across normalization", () => {
    const creature = createNewSceneObject("creatures", 2.2, 1.1, 188);

    for (const genderId of [0, 0xff]) {
      const normalized = normalizeSceneObjectMetadata({
        ...creature,
        creatureProperties: {
          ...creature.creatureProperties!,
          genderId,
        },
      });

      expect(normalized.creatureProperties).toHaveProperty("genderId", genderId);
      expect(normalizeSceneObjectMetadata(normalized)).toBe(normalized);
    }

    for (const genderId of [undefined, -1, 0.5, 0x100, "0"]) {
      const normalized = normalizeSceneObjectMetadata({
        ...creature,
        creatureProperties: {
          ...creature.creatureProperties!,
          genderId,
        },
      } as unknown as typeof creature);

      expect(normalized.creatureProperties).not.toHaveProperty("genderId");
    }
  });

  it("preserves only a round-trippable unsigned Byte Creature Phenotype target", () => {
    const creature = createNewSceneObject("creatures", 2.2, 1.1, 189);

    for (const phenotypeId of [0, 2, 0xff]) {
      const normalized = normalizeSceneObjectMetadata({
        ...creature,
        creatureProperties: {
          ...creature.creatureProperties!,
          phenotypeId,
        },
      });

      expect(normalized.creatureProperties).toHaveProperty("phenotypeId", phenotypeId);
      expect(normalizeSceneObjectMetadata(normalized)).toBe(normalized);
    }

    for (const phenotypeId of [undefined, -1, 0.5, 1, 0x100, "0"]) {
      const normalized = normalizeSceneObjectMetadata({
        ...creature,
        creatureProperties: {
          ...creature.creatureProperties!,
          phenotypeId,
        },
      } as unknown as typeof creature);

      expect(normalized.creatureProperties).not.toHaveProperty("phenotypeId");
    }
  });

  it("normalizes inventory list count when it is the only changed creature list count", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 89);
    const normalized = normalizeSceneObjectMetadata({
      ...creature,
      creatureProperties: {
        ...creature.creatureProperties,
        listCounts: {
          inventoryItemListCount: 5.2
        }
      } as NonNullable<typeof creature.creatureProperties>
    });

    expect(normalized.creatureProperties?.listCounts).toEqual({
      inventoryItemListCount: 5
    });
  });

  it("normalizes embedded item property lists in creature inventory and equipment", () => {
    const creature = createNewSceneObject("creatures", 1, 1, 90);
    const normalized = normalizeSceneObjectMetadata({
      ...creature,
      creatureProperties: {
        ...creature.creatureProperties,
        inventoryItems: [
          {
            embeddedItem: {
              templateResRef: "emb_ring",
              localizedNameStrRef: 7001.9,
              description: "Embedded description",
              descriptionStrRef: 7002.2,
              identifiedDescription: "Embedded identified description",
              identifiedDescriptionStrRef: 7003.8,
              comments: "Embedded comments",
              paletteId: 4.9,
              plot: true,
              baseItem: 52.7,
              modelPart1: 11.2,
              modelPart2: 13.8,
              modelPart3: 63.1,
              cost: 250.6,
              addCost: 7.3,
              costTable: 2.1,
              costValue: 9.9,
              charges: 3.2,
              stackSize: 1.8,
              identified: true,
              stolen: false,
              cursed: true,
              bodyPartTorso: 43.9,
              leather1Color: 5.2,
              leather2Color: 7.7,
              cloth1Color: 2.1,
              cloth2Color: 3.5,
              metal1Color: 17.2,
              metal2Color: 8.4,
              itemPropertyListCount: 99,
              itemPropertyListEntries: [
                {
                  propertyName: 15.8,
                  propertyLabel: "Attack Bonus",
                  subtype: 66.2,
                  costTable: 3,
                  costValue: 7,
                  param1: 255,
                  param1Value: 0,
                  chanceAppear: 100,
                  propertyDefinitionSource2daRow: 15,
                  propertyDefinitionSourceKey: "itempropdef.2da",
                  subTypeTable: "iprp_abilcost.2da",
                  costTableDefinition: "iprp_costtable.2da",
                  param1Table: "iprp_paramtable.2da",
                  nameStrRef: 1001,
                  gameStrRef: 1002,
                  descriptionStrRef: 1003
                }
              ],
              scripts: {
                onheartbeat: "it_hb",
                empty: "",
                oninvdisturbed: "it_inv"
              }
            }
          }
        ],
        equippedItems: [
          {
            embeddedItem: {
              templateResRef: "emb_armor",
              itemPropertyListEntries: [
                {
                  propertyName: 1,
                  subtype: 2
                }
              ]
            }
          }
        ]
      } as NonNullable<typeof creature.creatureProperties>
    });

    expect(normalized.creatureProperties?.inventoryItems?.[0]?.embeddedItem).toMatchObject({
      templateResRef: "emb_ring",
      localizedNameStrRef: 7001,
      description: "Embedded description",
      descriptionStrRef: 7002,
      identifiedDescription: "Embedded identified description",
      identifiedDescriptionStrRef: 7003,
      comments: "Embedded comments",
      paletteId: 4,
      plot: true,
      baseItem: 52,
      modelPart1: 11,
      modelPart2: 13,
      modelPart3: 63,
      cost: 250,
      addCost: 7,
      costTable: 2,
      costValue: 9,
      charges: 3,
      stackSize: 1,
      identified: true,
      stolen: false,
      cursed: true,
      bodyPartTorso: 43,
      leather1Color: 5,
      leather2Color: 7,
      cloth1Color: 2,
      cloth2Color: 3,
      metal1Color: 17,
      metal2Color: 8,
      itemPropertyListCount: 1,
      scripts: {
        onheartbeat: "it_hb",
        oninvdisturbed: "it_inv"
      },
      itemPropertyListEntries: [
        {
          propertyName: 15,
          propertyLabel: "Attack Bonus",
          subtype: 66,
          costTable: 3,
          costValue: 7,
          param1: 255,
          param1Value: 0,
          chanceAppear: 100,
          propertyDefinitionSource2daRow: 15,
          propertyDefinitionSourceKey: "itempropdef.2da",
          subTypeTable: "iprp_abilcost.2da",
          costTableDefinition: "iprp_costtable.2da",
          param1Table: "iprp_paramtable.2da",
          nameStrRef: 1001,
          gameStrRef: 1002,
          descriptionStrRef: 1003
        }
      ]
    });
    expect(normalized.creatureProperties?.equippedItems?.[0]?.embeddedItem).toMatchObject({
      templateResRef: "emb_armor",
      itemPropertyListCount: 1,
      itemPropertyListEntries: [
        {
          propertyName: 1,
          subtype: 2
        }
      ]
    });

    const roundtrip = normalizeSceneObjectMetadata(normalized);
    expect(
      roundtrip.creatureProperties?.inventoryItems?.[0]?.embeddedItem?.itemPropertyListEntries?.[0]
    ).toEqual(
      normalized.creatureProperties?.inventoryItems?.[0]?.embeddedItem
        ?.itemPropertyListEntries?.[0]
    );
  });

  it("removes creature payload from non-creature kinds", () => {
    const placeable = createNewSceneObject("placeables", 1.4, 0.7, 12);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      creatureProperties: {
        firstName: "Wrong Payload"
      } as unknown as NonNullable<typeof placeable.creatureProperties>
    });

    expect(normalized.kind).toBe("placeables");
    expect(normalized.creatureProperties).toBeUndefined();
    expect(normalized.placeableProperties).toBeDefined();
  });

  it("normalizes placeable lock/trap/advanced/localized-string/comments payload defensively", () => {
    const placeable = createNewSceneObject("placeables", 1, 1, 77);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      placeableProperties: {
        plot: false,
        useable: true,
        hasInventory: false,
        lockSettings: {
          locked: true,
          canRelock: true,
          autoRemoveKeyAfterUse: "bad",
          keyRequiredToUnlockOrLock: true,
          openLockDc: 21,
          closeLockDc: "bad",
          keyTag: 55
        } as unknown as NonNullable<typeof placeable.placeableProperties>["lockSettings"],
        trapSettings: {
          isTrapped: true,
          trapType: "Spike Trap, Minor",
          detectionDc: 17,
          disarmDc: "bad",
          oneShot: false,
          detectable: true,
          disarmable: true,
          onDisarmScript: "trap_disarm",
          onTrapTriggeredScript: 42,
          setDc: 9,
          detectDcModWhenSetByRogue: 12,
          disarmDcModWhenSetByRogue: "bad"
        } as unknown as NonNullable<typeof placeable.placeableProperties>["trapSettings"],
        advancedSettings: {
          blueprintResRef: "plc_test_a",
          belongsToFaction: "Hostile",
          conversation: 77,
          noInterrupt: true,
          portraitResRef: "po_test_a",
          initialState: "Default",
          treasureModel: null
        } as unknown as NonNullable<typeof placeable.placeableProperties>["advancedSettings"],
        inventoryItems: [
          {
            resRef: " nw_it_mpotion001 ",
            randomResRef: " rnd_potion ",
            randomList: " rl_potions ",
            itemTemplateId: " item_nw_it_mpotion001 ",
            itemResRef: " nw_it_mpotion001 ",
            itemSourceFingerprint: " fingerprint-a ",
            itemSourceObjectKey: " templates/items/nw_it_mpotion001.uti ",
            x: 2.8,
            y: 3.2,
            dropable: true,
            pickpocketable: false,
            infinite: false
          },
          {
            x: "bad"
          }
        ],
        localizedName: 123,
        description: 123,
        comments: "hello"
      } as unknown as NonNullable<typeof placeable.placeableProperties>
    });

    expect(normalized.placeableProperties).toEqual({
      plot: false,
      useable: true,
      hasInventory: false,
      lockSettings: {
        locked: true,
        canRelock: true,
        autoRemoveKeyAfterUse: false,
        keyRequiredToUnlockOrLock: true,
        openLockDc: 21,
        closeLockDc: 0,
        keyTag: ""
      },
      trapSettings: {
        isTrapped: true,
        trapType: "Spike Trap, Minor",
        detectionDc: 17,
        disarmDc: 15,
        oneShot: false,
        detectable: true,
        disarmable: true,
        onDisarmScript: "trap_disarm",
        onTrapTriggeredScript: "",
        setDc: 9,
        detectDcModWhenSetByRogue: 12,
        disarmDcModWhenSetByRogue: 22
      },
      advancedSettings: {
        blueprintResRef: "plc_test_a",
        belongsToFaction: "Hostile",
        noInterrupt: true,
        portraitResRef: "po_test_a",
        initialState: "Default",
        treasureModel: "Default"
      },
      inventoryItems: [
        {
          resRef: "nw_it_mpotion001",
          randomResRef: "rnd_potion",
          randomList: "rl_potions",
          itemTemplateId: "item_nw_it_mpotion001",
          itemResRef: "nw_it_mpotion001",
          itemSourceFingerprint: "fingerprint-a",
          itemSourceObjectKey: "templates/items/nw_it_mpotion001.uti",
          x: 2,
          y: 3,
          dropable: true,
          pickpocketable: false,
          infinite: false
        }
      ],
      comments: "hello"
    });
    expect(normalized.placeableProperties).not.toHaveProperty("localizedName");
    expect(normalized.placeableProperties).not.toHaveProperty("description");

    const exactStringSource = {
      ...placeable,
      placeableProperties: {
        ...placeable.placeableProperties!,
        useable: "invalid" as unknown as boolean,
        localizedName: " Chest ",
        description: ""
      }
    };
    const exactStrings = normalizeSceneObjectMetadata(exactStringSource);
    expect(exactStrings).not.toBe(exactStringSource);
    expect(exactStrings.placeableProperties).toHaveProperty("localizedName", " Chest ");
    expect(exactStrings.placeableProperties).toHaveProperty("description", "");

    const unchangedStrings = {
      ...placeable,
      placeableProperties: {
        ...placeable.placeableProperties!,
        localizedName: "Chest",
        description: "Storage"
      }
    };
    expect(normalizeSceneObjectMetadata(unchangedStrings)).toBe(unchangedStrings);

    const invalidNameOnly = {
      ...placeable,
      placeableProperties: {
        ...placeable.placeableProperties!,
        localizedName: 7 as unknown as string
      }
    };
    const droppedInvalidName = normalizeSceneObjectMetadata(invalidNameOnly);
    expect(droppedInvalidName).not.toBe(invalidNameOnly);
    expect(droppedInvalidName.placeableProperties).not.toHaveProperty("localizedName");
  });

  it.each([
    [0, 0],
    [255, 255],
    [-1, undefined],
    [256, undefined],
    [1.5, undefined],
    ["1", undefined],
  ])("normalizes optional Placeable TrapType row %p to %p", (input, expected) => {
    const placeable = createNewSceneObject("placeables", 1, 1, 77);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      placeableProperties: {
        ...placeable.placeableProperties!,
        trapSettings: {
          ...placeable.placeableProperties!.trapSettings!,
          trapTypeRow: input,
        },
      },
    } as never);

    if (expected === undefined) {
      expect(normalized.placeableProperties?.trapSettings).not.toHaveProperty("trapTypeRow");
    } else {
      expect(normalized.placeableProperties?.trapSettings).toHaveProperty("trapTypeRow", expected);
    }
  });

  it.each([
    [0, 0],
    [255, 255],
    [-1, undefined],
    [256, undefined],
    [1.5, undefined],
    ["1", undefined],
  ])("normalizes optional Placeable Treasure Model row %p to %p", (input, expected) => {
    const placeable = createNewSceneObject("placeables", 1, 1, 78);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      placeableProperties: {
        ...placeable.placeableProperties!,
        advancedSettings: {
          treasureModelRow: input,
        },
      },
    } as never);

    if (expected === undefined) {
      expect(normalized.placeableProperties?.advancedSettings).not.toHaveProperty(
        "treasureModelRow",
      );
    } else {
      expect(normalized.placeableProperties?.advancedSettings).toHaveProperty(
        "treasureModelRow",
        expected,
      );
    }
  });

  it.each([
    [0, 0],
    [65535, 65535],
    [-1, undefined],
    [65536, undefined],
    [462.5, undefined],
    ["462", undefined],
  ])("normalizes optional Placeable PortraitId Word %p to %p", (input, expected) => {
    const placeable = createNewSceneObject("placeables", 1, 1, 79);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      placeableProperties: {
        ...placeable.placeableProperties!,
        advancedSettings: { portraitId: input },
      },
    } as never);

    if (expected === undefined) {
      expect(normalized.placeableProperties?.advancedSettings).not.toHaveProperty("portraitId");
    } else {
      expect(normalized.placeableProperties?.advancedSettings).toHaveProperty("portraitId", expected);
    }
  });

  it.each([
    [0, 0],
    [0xffffffff, 0xffffffff],
    [-1, undefined],
    [0x100000000, undefined],
    [1.5, undefined],
    ["1", undefined],
  ])("normalizes optional Placeable Faction DWord %p to %p", (input, expected) => {
    const placeable = createNewSceneObject("placeables", 1, 1, 80);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      placeableProperties: {
        ...placeable.placeableProperties!,
        advancedSettings: { factionId: input },
      },
    } as never);

    if (expected === undefined) {
      expect(normalized.placeableProperties?.advancedSettings).not.toHaveProperty("factionId");
    } else {
      expect(normalized.placeableProperties?.advancedSettings).toHaveProperty("factionId", expected);
    }
  });
});
