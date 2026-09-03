import { describe, expect, it } from "vitest";
import {
  createObjectAddPayloadFromSceneObject,
  getCurrentObjectAddDragPayload,
  getCurrentObjectAddDragSourceTemplate,
  OBJECT_ADD_DRAG_MIME,
  serializeObjectAddPayload,
  setCurrentObjectAddDragPayload,
  setCurrentObjectAddDragSourceTemplate,
  tryParseObjectAddPayload,
  type ObjectAddDragPayload
} from "../../../../src/modules/layout/application/objectAddDragPayload";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("objectAddDragPayload", () => {
  it("exports stable drag MIME and roundtrips valid payload", () => {
    expect(OBJECT_ADD_DRAG_MIME).toBe("application/x-aurora-object-template");

    const payload: ObjectAddDragPayload = {
      id: "obj_001",
      kind: "placeables",
      tag: "barrel_a",
      resRef: "plc_barrel01",
      name: "Barrel",
      previewImageUrl: "/api/v1/catalog/placeables/plc_barrel01/thumbnail"
    };

    const serialized = serializeObjectAddPayload(payload);
    expect(serialized).toContain("\"kind\":\"placeables\"");
    expect(tryParseObjectAddPayload(serialized)).toEqual(payload);
  });

  it("accepts payload without optional name", () => {
    const serialized = JSON.stringify({
      id: "obj_002",
      kind: "creatures",
      tag: "wolf_a",
      resRef: "cre_wolf01"
    });

    expect(tryParseObjectAddPayload(serialized)).toEqual({
      id: "obj_002",
      kind: "creatures",
      tag: "wolf_a",
      resRef: "cre_wolf01"
    });
  });

  it("accepts encounter templates as object add payloads", () => {
    const serialized = JSON.stringify({
      id: "enc_template_enc_forest_ambush",
      kind: "encounters",
      tag: "ENC_FOREST_AMBUSH",
      resRef: "enc_forest_ambush",
      name: "Forest Ambush"
    });

    expect(tryParseObjectAddPayload(serialized)).toEqual({
      id: "enc_template_enc_forest_ambush",
      kind: "encounters",
      tag: "ENC_FOREST_AMBUSH",
      resRef: "enc_forest_ambush",
      name: "Forest Ambush"
    });
  });

  it("retains dynamic Encounter provenance in the active drag template snapshot", () => {
    const encounter = createNewSceneObject("encounters", 0.5, 0.5, 3);
    encounter.source = {
      type: "aurora_blueprint",
      sourceKind: "encounter",
      sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
      templateId: "enc_enc_dynamic",
      templateResRef: "enc_dynamic",
      sourceObjectKey: "modules/current/blueprints/encounters/enc_dynamic.ute",
      sourceSizeBytes: 2048,
      sourceEtag: "b".repeat(64),
      sourceFileType: "UTE ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    };

    setCurrentObjectAddDragSourceTemplate(encounter);
    const snapshot = getCurrentObjectAddDragSourceTemplate();

    expect(snapshot?.source).toEqual(encounter.source);
    expect(snapshot?.source).not.toBe(encounter.source);
    setCurrentObjectAddDragPayload(null);
  });

  it("retains dynamic Waypoint provenance in the active drag template snapshot", () => {
    const waypoint = createNewSceneObject("waypoints", 0.5, 0.5, 4);
    waypoint.source = {
      type: "aurora_blueprint",
      sourceKind: "waypoint",
      sourceProfileId: "effective-catalog-utw-waypoint-copy-v1",
      templateId: "wpt_wp_dynamic",
      templateResRef: "wp_dynamic",
      sourceObjectKey: "modules/current/blueprints/waypoints/wp_dynamic.utw",
      sourceSizeBytes: 1024,
      sourceEtag: "c".repeat(64),
      sourceFileType: "UTW ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    };

    setCurrentObjectAddDragSourceTemplate(waypoint);
    const snapshot = getCurrentObjectAddDragSourceTemplate();

    expect(snapshot?.source).toEqual(waypoint.source);
    expect(snapshot?.source).not.toBe(waypoint.source);
    setCurrentObjectAddDragPayload(null);
  });

  it("accepts store templates as object add payloads", () => {
    const serialized = JSON.stringify({
      id: "sto_template_store_nw_storemagic001",
      kind: "stores",
      tag: "MAGIC_SHOP",
      resRef: "nw_storemagic001",
      name: "Magic Store"
    });

    expect(tryParseObjectAddPayload(serialized)).toEqual({
      id: "sto_template_store_nw_storemagic001",
      kind: "stores",
      tag: "MAGIC_SHOP",
      resRef: "nw_storemagic001",
      name: "Magic Store"
    });
  });

  it("returns null for nullish/invalid JSON/non-object input", () => {
    expect(tryParseObjectAddPayload(undefined)).toBeNull();
    expect(tryParseObjectAddPayload(null)).toBeNull();
    expect(tryParseObjectAddPayload("")).toBeNull();
    expect(tryParseObjectAddPayload("{")).toBeNull();
    expect(tryParseObjectAddPayload("\"text\"")).toBeNull();
    expect(tryParseObjectAddPayload("42")).toBeNull();
    expect(tryParseObjectAddPayload("[]")).toBeNull();
  });

  it("returns null when required fields are missing or empty", () => {
    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          kind: "items",
          tag: "item_a",
          resRef: "itm_a"
        })
      )
    ).toBeNull();

    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: "obj_003",
          kind: "items",
          tag: " ",
          resRef: "itm_a"
        })
      )
    ).toBeNull();

    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: "obj_003",
          kind: "items",
          tag: "item_a",
          resRef: ""
        })
      )
    ).toBeNull();
  });

  it("returns null for invalid kind and invalid field types", () => {
    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: "obj_004",
          kind: "vfx",
          tag: "fx_a",
          resRef: "fx_01"
        })
      )
    ).toBeNull();

    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: 7,
          kind: "doors",
          tag: "door_a",
          resRef: "dor_a"
        })
      )
    ).toBeNull();

    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: "obj_005",
          kind: "doors",
          tag: "door_a",
          resRef: "dor_a",
          name: 123
        })
      )
    ).toBeNull();
  });

  it("stores active payload for dragover fallback and clears it", () => {
    const payload: ObjectAddDragPayload = {
      id: "obj_006",
      kind: "sounds",
      tag: "SOUND_CAVES_02",
      resRef: "as_amb_caves"
    };

    setCurrentObjectAddDragPayload(payload);
    expect(getCurrentObjectAddDragPayload()).toEqual(payload);

    const snapshot = getCurrentObjectAddDragPayload();
    expect(snapshot).not.toBe(payload);

    setCurrentObjectAddDragPayload(null);
    expect(getCurrentObjectAddDragPayload()).toBeNull();
  });

  it("stores an active drag source template snapshot and clears it with the payload", () => {
    const creatureTemplate = {
      ...createNewSceneObject("creatures", 1, 2, 9),
      id: "cre_template_guard",
      tag: "CRE_GUARD",
      resRef: "cre_guard",
      creatureProperties: {
        firstName: "Guard",
        lastName: "Captain",
        race: "Human",
        appearance: "Human, Male",
        phenotype: "Normal",
        gender: "Male",
        description: "Template-backed guard",
        challengeRating: 3,
        portraitResRef: "po_hm_guard",
        conversation: "guard_talk",
        noInterrupt: true,
        appearanceProfile: {
          source2daRow: 42,
          sourceKey: "guard_captain",
          modelType: "P",
          raceModel: "c_guard",
          defaultPhenotype: "normal"
        },
        lookupProfile: {
          raceLabelSource2daRow: 6,
          genderLabelSource2daRow: 0,
          soundSetResRef: "ss_guard"
        },
        listCounts: {
          classListCount: 1,
          skillListCount: 1,
          inventoryItemListCount: 1,
          equipItemListCount: 1
        },
        localizedStringRefs: {
          firstName: 9101,
          description: 9102
        },
        localizedStrings: {
          displayName: "Guard Captain",
          identifiedDescription: "Template-backed guard"
        },
        statistics: {
          abilityScores: {
            strength: 16,
            dexterity: 12,
            constitution: 14,
            intelligence: 10,
            wisdom: 11,
            charisma: 9
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
            fortitudeBase: 3,
            fortitudeBonus: 1,
            reflexBase: 1,
            reflexBonus: 0,
            willBase: 1,
            willBonus: 0
          },
          naturalArmorClass: 1,
          baseArmorClass: 10,
          dexterityBonus: 1,
          sizeModifier: 0,
          baseHitPoints: 24,
          hitPointBonuses: 4,
          movementRate: "Normal"
        },
        advancedSettings: {
          blueprintResRef: "cre_guard",
          disarmable: true,
          plot: true,
          leavesLootableCorpse: true,
          noPermanentDeath: false,
          immortal: false,
          treasureModel: "Small",
          corpseDecayTimeSeconds: 30,
          faction: "Defender",
          subrace: "",
          deity: "",
          challengeRatingAdjustment: 0,
          soundSet: "Guard",
          perceptionRange: "Default"
        },
        inventoryItems: [
          {
            resRef: "nw_wswmls001",
            itemTemplateId: "item_nw_wswmls001",
            itemResRef: "nw_wswmls001",
            x: 2,
            y: 3,
            dropable: true
          }
        ],
        equippedItems: [
          {
            resRef: "nw_maarcl001",
            itemTemplateId: "item_nw_maarcl001",
            itemResRef: "nw_maarcl001",
            slotMask: 2,
            infinite: true
          }
        ]
      }
    };
    const payload = createObjectAddPayloadFromSceneObject(creatureTemplate);

    setCurrentObjectAddDragPayload(payload);
    setCurrentObjectAddDragSourceTemplate(creatureTemplate);

    const snapshot = getCurrentObjectAddDragSourceTemplate();
    expect(snapshot).toEqual(creatureTemplate);
    expect(snapshot).not.toBe(creatureTemplate);
    expect(snapshot?.creatureProperties).not.toBe(creatureTemplate.creatureProperties);
    expect(snapshot?.creatureProperties?.statistics?.abilityScores).not.toBe(
      creatureTemplate.creatureProperties.statistics?.abilityScores
    );
    expect(snapshot?.creatureProperties?.inventoryItems).not.toBe(
      creatureTemplate.creatureProperties.inventoryItems
    );
    expect(snapshot?.creatureProperties?.equippedItems).not.toBe(
      creatureTemplate.creatureProperties.equippedItems
    );
    expect(snapshot?.creatureProperties?.appearanceProfile).not.toBe(
      creatureTemplate.creatureProperties.appearanceProfile
    );
    expect(snapshot?.creatureProperties?.lookupProfile).not.toBe(
      creatureTemplate.creatureProperties.lookupProfile
    );
    expect(snapshot?.creatureProperties?.listCounts).not.toBe(
      creatureTemplate.creatureProperties.listCounts
    );
    expect(snapshot?.creatureProperties?.localizedStringRefs).not.toBe(
      creatureTemplate.creatureProperties.localizedStringRefs
    );
    expect(snapshot?.creatureProperties?.localizedStrings).not.toBe(
      creatureTemplate.creatureProperties.localizedStrings
    );
    expect(snapshot?.creatureProperties?.listCounts?.inventoryItemListCount).toBe(1);
    expect(snapshot?.creatureProperties?.localizedStringRefs?.firstName).toBe(9101);
    expect(snapshot?.creatureProperties?.localizedStrings?.displayName).toBe("Guard Captain");

    setCurrentObjectAddDragPayload(null);

    expect(getCurrentObjectAddDragPayload()).toBeNull();
    expect(getCurrentObjectAddDragSourceTemplate()).toBeNull();
  });

  it("roundtrips sound positioning metadata only for sound payloads", () => {
    const soundPositioning = {
      mode: "specific" as const,
      elevation: 1,
      maxVolumeDistance: 12,
      cutoffDistance: 24,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0,
      preserve: {
        timeWindow: "always",
        hourMask: "0xFFFFFF",
        active: true,
        whenToPlay: "always" as const,
        dayNight: "both" as const,
        hoursStart: 0,
        hoursEnd: 23,
        playStyle: "repeat" as const,
        playOrder: "random" as const,
        intervalMs: 4000,
        intervalVariationMs: 500,
        volume: 80,
        volumeVariation: 10,
        pitchVariation: 0,
        priority: 5,
        flags: { backendBenchmark: true },
        extra: {
          backendSoundId: "sound_dia_hakon_add_12",
          soundTemplateSource: "backend-catalog"
        }
      }
    };
    const payload: ObjectAddDragPayload = {
      id: "snd_template_sound_dia_hakon_add_12",
      kind: "sounds",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      name: "dia_hakon_add_12",
      soundPositioning
    };

    expect(tryParseObjectAddPayload(serializeObjectAddPayload(payload))).toEqual(payload);

    setCurrentObjectAddDragPayload(payload);
    const snapshot = getCurrentObjectAddDragPayload();
    expect(snapshot).toEqual(payload);
    expect(snapshot?.soundPositioning).not.toBe(soundPositioning);
    expect(snapshot?.soundPositioning?.preserve?.extra).not.toBe(
      soundPositioning.preserve.extra
    );
    setCurrentObjectAddDragPayload(null);

    expect(
      tryParseObjectAddPayload(
        JSON.stringify({
          id: "plc_001",
          kind: "placeables",
          tag: "PLC_001",
          resRef: "plc_001",
          soundPositioning
        })
      )
    ).toEqual({
      id: "plc_001",
      kind: "placeables",
      tag: "PLC_001",
      resRef: "plc_001"
    });
  });

  it("creates a stable add payload from a scene object template", () => {
    const soundTemplate = {
      ...createNewSceneObject("sounds", 1, 2, 7),
      id: "snd_template_sound_dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      name: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        elevation: 1,
        maxVolumeDistance: 12,
        cutoffDistance: 24,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: { backendBenchmark: true },
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };

    const payload = createObjectAddPayloadFromSceneObject(soundTemplate);

    expect(payload).toEqual({
      id: "snd_template_sound_dia_hakon_add_12",
      kind: "sounds",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      name: "dia_hakon_add_12",
      soundPositioning: soundTemplate.soundPositioning
    });
    expect(payload.soundPositioning).not.toBe(soundTemplate.soundPositioning);
    expect(payload.soundPositioning?.preserve?.extra).not.toBe(
      soundTemplate.soundPositioning.preserve?.extra
    );
  });
});
