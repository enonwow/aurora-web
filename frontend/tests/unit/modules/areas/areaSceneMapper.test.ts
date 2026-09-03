import { describe, expect, it } from "vitest";
import { mapBackendAreaToScene } from "../../../../src/modules/areas/application/areaSceneMapper";
import type { AreaApiDetail } from "../../../../src/modules/areas/contracts";
import type { SceneObject, SceneObjectKind } from "../../../../src/modules/scene/contracts";
import { effectiveAreaAudioCatalogBundle } from "./areaAudioCatalogFixture";
import { effectiveAreaLoadingScreenCatalog } from "./areaLoadingScreenCatalogFixture";
import { effectiveAreaVisualEnvironmentCatalogBundle } from "./areaVisualEnvironmentCatalogFixture";

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

function minimalAreaDetail(overrides: Partial<AreaApiDetail> = {}): AreaApiDetail {
  return {
    areaId: "area_audio_catalog_probe",
    name: "Audio Catalog Probe",
    biome: "interior",
    width: 1,
    height: 1,
    tags: [],
    benchmark: false,
    previewImageUrl: "",
    textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
    composition: {
      placeables: 0,
      doors: 0,
      creatures: 0,
      encounters: 0,
      items: 0,
      sounds: 0,
      stores: 0,
      triggers: 0,
      waypoints: 0,
      total: 0,
    },
    updatedAt: "2026-08-22T00:00:00.000Z",
    objects: [],
    ...overrides,
  };
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
  it("maps exact retained SpecAbilityList physical entries into detached grouped Creature state", () => {
    const storage = {
      present: true as const,
      nativeType: "list" as const,
      structTypeId: 4 as const,
      entries: [
        { spellId: 2, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
        { spellId: 2, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
        { spellId: 7, spellFlags: 1, casterLevel: 0, opaqueSiblingFieldCount: 0 },
      ],
      table: {
        resourceName: "spells.2da" as const,
        sourceObjectKey: "runtime-source/module/spells.2da",
        sourceLayer: "module" as const,
        sha256: "e".repeat(64),
        sizeBytes: 100,
        rowCount: 10,
      },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0", sourceIndex: 0, kind: "creature", templateId: "nw_guard",
        resRef: "nw_guard", x: 1, y: 2, z: 0, bearing: 0,
        creatureSpecialAbilityList: storage,
        creatureMetadata: {
          specAbilityListEntries: [{
            spellId: 2, flags: 1, casterLevel: 3,
          }, {
            spellId: 2, flags: 1, casterLevel: 3,
          }, {
            spellId: 7, flags: 1, casterLevel: 0,
          }],
        },
      }],
    });

    const sceneObject = mapBackendAreaToScene(area).objects[0]!;
    expect(sceneObject.creatureProperties?.specialAbilities).toEqual([
      { spellId: 2, name: "Special Ability 2", type: "", casterLevel: 3, uses: 2 },
      { spellId: 7, name: "Special Ability 7", type: "", casterLevel: 0, uses: 1 },
    ]);
    expect(sceneObject.source?.creatureSpecialAbilityList).toEqual(storage);
    expect(sceneObject.source?.creatureSpecialAbilityList).not.toBe(storage);
    expect(sceneObject.source?.creatureSpecialAbilityList?.present &&
      sceneObject.source.creatureSpecialAbilityList.entries).not.toBe(storage.entries);
  });

  it("detaches exact retained Sound interval/variation storage into current and source state", () => {
    const storage = {
      intervalMilliseconds: 25_000,
      intervalVariationMilliseconds: 5_000,
      pitchVariationHundredths: 20,
      volumeVariationByte: 64,
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 1, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sound:0",
        sourceIndex: 0,
        kind: "sound",
        templateId: "snd_wind",
        resRef: "wind",
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
        soundIntervalVariation: storage,
      }],
    });
    const sceneObject = mapBackendAreaToScene(area).objects[0]!;
    expect(sceneObject.soundIntervalVariation).toEqual(storage);
    expect(sceneObject.source?.soundIntervalVariationStorage).toEqual(storage);
    expect(sceneObject.soundIntervalVariation).not.toBe(storage);
    expect(sceneObject.source?.soundIntervalVariationStorage)
      .not.toBe(sceneObject.soundIntervalVariation);
  });
  it("detaches exact retained Sound base-volume storage into current and source state", () => {
    const storage = { volumeByte: 64 };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 1, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sound:0", sourceIndex: 0, kind: "sound", templateId: "snd_wind",
        resRef: "wind", x: 1, y: 2, z: 0, bearing: 0, soundVolume: storage,
      }],
    });
    const sceneObject = mapBackendAreaToScene(area).objects[0]!;
    expect(sceneObject.soundVolume).toEqual(storage);
    expect(sceneObject.source?.soundVolumeStorage).toEqual(storage);
    expect(sceneObject.soundVolume).not.toBe(storage);
    expect(sceneObject.source?.soundVolumeStorage).not.toBe(sceneObject.soundVolume);
  });
  it("detaches exact retained Sound Hours/Times schedule storage into current and source state", () => {
    const storage = { hoursMask: 0x800001, timesByte: 0 };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 1, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sound:0", sourceIndex: 0, kind: "sound", templateId: "snd_wind",
        resRef: "wind", x: 1, y: 2, z: 0, bearing: 0, soundSchedule: storage,
      }],
    });
    const sceneObject = mapBackendAreaToScene(area).objects[0]!;
    expect(sceneObject.soundSchedule).toEqual(storage);
    expect(sceneObject.source?.soundScheduleStorage).toEqual(storage);
    expect(sceneObject.soundSchedule).not.toBe(storage);
    expect(sceneObject.source?.soundScheduleStorage).not.toBe(sceneObject.soundSchedule);
  });
  it("detaches exact retained Sound Active storage into current and source state", () => {
    const storage = { activeByte: 1 as const };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 1, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sound:0", sourceIndex: 0, kind: "sound", templateId: "snd_wind",
        resRef: "wind", x: 1, y: 2, z: 0, bearing: 0, soundActive: storage,
      }],
    });
    const sceneObject = mapBackendAreaToScene(area).objects[0]!;
    expect(sceneObject.soundActive).toEqual(storage);
    expect(sceneObject.source?.soundActiveStorage).toEqual(storage);
    expect(sceneObject.soundActive).not.toBe(storage);
    expect(sceneObject.source?.soundActiveStorage).not.toBe(sceneObject.soundActive);
  });
  it("detaches exact retained Sound Play Order storage into current and source state", () => {
    const storage = { randomByte: 1 as const };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 1, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sound:0", sourceIndex: 0, kind: "sound", templateId: "snd_wind",
        resRef: "wind", x: 1, y: 2, z: 0, bearing: 0, soundPlayOrder: storage,
      }],
    });
    const sceneObject = mapBackendAreaToScene(area).objects[0]!;
    expect(sceneObject.soundPlayOrder).toEqual(storage);
    expect(sceneObject.source?.soundPlayOrderStorage).toEqual(storage);
    expect(sceneObject.soundPlayOrder).not.toBe(storage);
    expect(sceneObject.source?.soundPlayOrderStorage).not.toBe(sceneObject.soundPlayOrder);
  });
  it("detaches complete retained Sound Play Style storage into current and source state", () => {
    const storage = {
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, soundsCount: 2, intervalDword: 25_000,
      intervalVariationDword: 5_000,
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 1, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sound:0", sourceIndex: 0, kind: "sound", templateId: "snd_wind",
        resRef: "wind", x: 1, y: 2, z: 0, bearing: 0, soundPlayStyle: storage,
      }],
    });
    const sceneObject = mapBackendAreaToScene(area).objects[0]!;
    expect(sceneObject.soundPlayStyle).toEqual(storage);
    expect(sceneObject.source?.soundPlayStyleStorage).toEqual(storage);
    expect(sceneObject.soundPlayStyle).not.toBe(storage);
    expect(sceneObject.source?.soundPlayStyleStorage).not.toBe(sceneObject.soundPlayStyle);
  });
  it("deeply detaches complete retained Sound playback storage into current and source state", () => {
    const storage = {
      sounds: ["wind_a", "wind_b"],
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, intervalDword: 25_000,
      intervalVariationDword: 5_000,
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 1, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sound:0", sourceIndex: 0, kind: "sound", templateId: "snd_wind",
        resRef: "wind", x: 1, y: 2, z: 0, bearing: 0, soundPlayback: storage,
      }],
    });
    const sceneObject = mapBackendAreaToScene(area).objects[0]!;
    expect(sceneObject.soundPlayback).toEqual(storage);
    expect(sceneObject.source?.soundPlaybackStorage).toEqual(storage);
    expect(sceneObject.soundPlayback).not.toBe(storage);
    expect(sceneObject.soundPlayback?.sounds).not.toBe(storage.sounds);
    expect(sceneObject.source?.soundPlaybackStorage?.sounds).not.toBe(
      sceneObject.soundPlayback?.sounds,
    );
  });
  it("deeply detaches the authoritative Sound profile and projects its exact positioning", () => {
    const storage = {
      sounds: ["wind_a", "wind_b"],
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, randomPositionByte: 1 as const,
      elevationFloat32: -1.25, maxDistanceFloat32: 14, minDistanceFloat32: 2,
      randomRangeXFloat32: 3, randomRangeYFloat32: 4,
      intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 1, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sound:0", sourceIndex: 0, kind: "sound", templateId: "snd_wind",
        resRef: "wind", x: 1, y: 2, z: 0, bearing: 0, soundProfile: storage,
        soundPositioning: {
          mode: "specific", elevation: 0, maxVolumeDistance: 1, cutoffDistance: 10,
          randomRangeWestEast: 0, randomRangeNorthSouth: 0,
          preserve: {
            timeWindow: "", hourMask: "", active: true, whenToPlay: "always",
            dayNight: "both", playStyle: "repeat", playOrder: "sequential",
            intervalMs: 25_000, intervalVariationMs: 5_000,
            volume: 0.5, volumeVariation: 0, pitchVariation: 0, priority: 20,
            flags: {}, extra: {},
          },
        },
      }],
    });
    const sceneObject = mapBackendAreaToScene(area).objects[0]!;
    expect(sceneObject.soundProfile).toEqual(storage);
    expect(sceneObject.source?.soundProfileStorage).toEqual(storage);
    expect(sceneObject.soundProfile?.sounds).not.toBe(storage.sounds);
    expect(sceneObject.source?.soundProfileStorage?.sounds).not.toBe(
      sceneObject.soundProfile?.sounds,
    );
    expect(sceneObject.soundPositioning).toMatchObject({
      mode: "random",
      elevation: -1.25,
      cutoffDistance: 14,
      maxVolumeDistance: 2,
      randomRangeWestEast: 3,
      randomRangeNorthSouth: 4,
      preserve: expect.objectContaining({ active: true }),
    });
  });
  it("maps exact retained Trigger/Encounter polygon provenance into a separate editable target", () => {
    const triggerGeometry = {
      coordinateSpace: "native_local" as const,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
        { x: 4, y: 2, z: 2 },
        { x: 0, y: 2, z: 2 },
      ],
    };
    const encounterGeometry = {
      coordinateSpace: "native_local" as const,
      points: [
        { x: -1, y: -1, z: 0.25 },
        { x: 2, y: -1, z: 0.25 },
        { x: 0, y: 2, z: 0.25 },
      ],
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 1, items: 0,
        sounds: 0, stores: 0, triggers: 1, waypoints: 0, total: 2,
      },
      placeableFactionCatalog: {
        descriptor: {
          resourceName: "repute.fac",
          sourceObjectKey: "modules/current/repute.fac",
          sha256: "f".repeat(64),
          sizeBytes: 1889,
          factionCount: 5,
        },
        rows: [
          { factionId: 0, name: "PC", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 1, name: "Hostile", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 2, name: "Commoner", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 3, name: "Merchant", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 4, name: "Defender", parentFactionId: 0xffffffff, isGlobal: true },
        ],
      },
      encounterDifficultyCatalog: {
        schemaVersion: "area-encounter-difficulty-catalog.v1",
        descriptor: {
          resourceName: "encdifficulty.2da",
          sourceObjectKey: "modules/current/encdifficulty.2da",
          sourceLayer: "module",
          sha256: "d".repeat(64),
          sizeBytes: 256,
          rowCount: 5,
        },
        rows: [-2, -1, 1, 2, 3].map((value, rowIndex) => ({
          rowIndex,
          strRef: 1000 + rowIndex,
          value,
          displayName: `Difficulty ${rowIndex}`,
          displaySource: "strref" as const,
        })),
      },
      objects: [
        {
          objectId: "trigger:0",
          sourceIndex: 0,
          kind: "trigger",
          templateId: "trg_transition",
          tag: "exit_trigger",
          triggerTag: { present: true, value: "  EXIT_TRIGGER  " },
          polygonGeometry: triggerGeometry,
          x: 0.2,
          y: 0.1,
          z: 0.1,
          bearing: 0,
        },
        {
          objectId: "encounter:0",
          sourceIndex: 0,
          kind: "encounter",
          templateId: "enc_city_patrol",
          tag: "enc_patrol_tag",
          encounterTag: { present: true, value: "  ENCOUNTER_PATROL  " },
          encounterActive: { activeByte: 1 },
          encounterPlayerOnly: { playerOnlyByte: 1 },
          encounterReset: { resetByte: 1 },
          encounterResetTime: { resetTime: 60 },
          encounterSpawnOption: { spawnOption: 0 },
          encounterRespawns: { respawns: -1 },
          encounterCreatureCounts: { maxCreatures: 4, recCreatures: 2 },
          encounterScriptResRefs: {
            onEntered: "enc_enter",
            onExit: "enc_exit",
            onExhausted: "",
            onHeartbeat: "enc_heartbeat",
            onUserDefined: "enc_user",
          },
          encounterFaction: { present: true, nativeType: "dword", value: 1 },
          encounterDifficulty: {
            difficulty: { present: true, nativeType: "int", value: 1 },
            difficultyIndex: { present: true, nativeType: "int", value: 2 },
          },
          encounterLocalizedName: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "R25vbGwgQW1idXNo" }],
          },
          encounterMetadata: { editorComment: "  encounter note  ", opaque: 7 },
          encounterCreatureList: { expectedEntries: [
            {
              sourceIndex: 0,
              appearance: 388,
              challengeRating: 1,
              resRef: "nw_gnoll001",
              singleSpawnByte: 0,
            },
            {
              sourceIndex: 1,
              appearance: 389,
              challengeRating: 3,
              resRef: "nw_gnoll002",
              singleSpawnByte: 1,
            },
          ] },
          encounterSpawnPoints: { expectedEntries: [
            {
              sourceIndex: 0,
              nativeX: 22.5,
              nativeY: 45.25,
              nativeZ: 0,
              orientation: 1.5,
            },
            {
              sourceIndex: 1,
              nativeX: -3.75,
              nativeY: 9.5,
              nativeZ: 0.125,
              orientation: -2.25,
            },
          ] },
          polygonGeometry: encounterGeometry,
          x: 0.3,
          y: 0.4,
          z: 0,
          bearing: 0,
        },
      ],
    });

    const scene = mapBackendAreaToScene(area);
    const [trigger, encounter] = scene.objects;
    expect(scene.encounterDifficultyCatalog).toEqual(area.encounterDifficultyCatalog);
    expect(scene.encounterDifficultyCatalog).not.toBe(area.encounterDifficultyCatalog);
    expect(trigger?.kind).toBe("triggers");
    expect(trigger?.tag).toBe("  EXIT_TRIGGER  ");
    expect(trigger?.source?.triggerTag).toEqual({
      present: true,
      value: "  EXIT_TRIGGER  ",
    });
    expect(trigger?.source?.triggerTag).not.toBe(area.objects[0]?.triggerTag);
    expect(trigger?.polygonGeometry).toEqual(triggerGeometry);
    expect(trigger?.source?.polygonGeometry).toEqual(triggerGeometry);
    expect(trigger?.polygonGeometry).not.toBe(triggerGeometry);
    expect(trigger?.source?.polygonGeometry).not.toBe(trigger?.polygonGeometry);
    expect(encounter?.kind).toBe("encounters");
    expect(encounter?.tag).toBe("  ENCOUNTER_PATROL  ");
    expect(encounter?.source?.encounterTag).toEqual({
      present: true,
      value: "  ENCOUNTER_PATROL  ",
    });
    expect(encounter?.source?.encounterTag).not.toBe(area.objects[1]?.encounterTag);
    expect(encounter?.encounterActive).toEqual({ activeByte: 1 });
    expect(encounter?.source?.encounterActiveStorage).toEqual({ activeByte: 1 });
    expect(encounter?.encounterActive).not.toBe(area.objects[1]?.encounterActive);
    expect(encounter?.source?.encounterActiveStorage).not.toBe(encounter?.encounterActive);
    expect(encounter?.encounterPlayerOnly).toEqual({ playerOnlyByte: 1 });
    expect(encounter?.source?.encounterPlayerOnlyStorage)
      .toEqual({ playerOnlyByte: 1 });
    expect(encounter?.encounterPlayerOnly)
      .not.toBe(area.objects[1]?.encounterPlayerOnly);
    expect(encounter?.source?.encounterPlayerOnlyStorage)
      .not.toBe(encounter?.encounterPlayerOnly);
    expect(encounter?.encounterReset).toEqual({ resetByte: 1 });
    expect(encounter?.source?.encounterResetStorage).toEqual({ resetByte: 1 });
    expect(encounter?.encounterReset).not.toBe(area.objects[1]?.encounterReset);
    expect(encounter?.source?.encounterResetStorage)
      .not.toBe(encounter?.encounterReset);
    expect(encounter?.encounterResetTime).toEqual({ resetTime: 60 });
    expect(encounter?.source?.encounterResetTimeStorage).toEqual({ resetTime: 60 });
    expect(encounter?.encounterResetTime)
      .not.toBe(area.objects[1]?.encounterResetTime);
    expect(encounter?.source?.encounterResetTimeStorage)
      .not.toBe(encounter?.encounterResetTime);
    expect(encounter?.encounterSpawnOption).toEqual({ spawnOption: 0 });
    expect(encounter?.source?.encounterSpawnOptionStorage)
      .toEqual({ spawnOption: 0 });
    expect(encounter?.encounterSpawnOption)
      .not.toBe(area.objects[1]?.encounterSpawnOption);
    expect(encounter?.source?.encounterSpawnOptionStorage)
      .not.toBe(encounter?.encounterSpawnOption);
    expect(encounter?.encounterRespawns).toEqual({ respawns: -1 });
    expect(encounter?.source?.encounterRespawnsStorage)
      .toEqual({ respawns: -1 });
    expect(encounter?.encounterRespawns)
      .not.toBe(area.objects[1]?.encounterRespawns);
    expect(encounter?.source?.encounterRespawnsStorage)
      .not.toBe(encounter?.encounterRespawns);
    expect(encounter?.encounterCreatureCounts)
      .toEqual({ maxCreatures: 4, recCreatures: 2 });
    expect(encounter?.source?.encounterCreatureCountsStorage)
      .toEqual({ maxCreatures: 4, recCreatures: 2 });
    expect(encounter?.encounterCreatureCounts)
      .not.toBe(area.objects[1]?.encounterCreatureCounts);
    expect(encounter?.source?.encounterCreatureCountsStorage)
      .not.toBe(encounter?.encounterCreatureCounts);
    expect(encounter?.encounterScriptResRefs).toEqual({
      onEntered: "enc_enter",
      onExit: "enc_exit",
      onExhausted: "",
      onHeartbeat: "enc_heartbeat",
      onUserDefined: "enc_user",
    });
    expect(encounter?.source?.encounterScriptResRefsStorage)
      .toEqual(encounter?.encounterScriptResRefs);
    expect(encounter?.source?.encounterScriptResRefsStorage)
      .not.toBe(encounter?.encounterScriptResRefs);
    expect(encounter?.encounterFactionId).toBe(1);
    expect(encounter?.source?.encounterFaction).toEqual({
      expectedValue: 1,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    });
    expect(encounter?.encounterDifficulty).toEqual({
      difficulty: 1,
      difficultyIndex: 2,
    });
    expect(encounter?.source?.encounterDifficulty).toEqual({
      expectedValue: { difficulty: 1, difficultyIndex: 2 },
      catalogSha256: "d".repeat(64),
      catalogRowCount: 5,
    });
    expect(encounter?.encounterDifficulty)
      .not.toBe(encounter?.source?.encounterDifficulty?.expectedValue);
    expect(encounter?.encounterLocalizedName).toBe("Gnoll Ambush");
    expect(encounter?.source?.encounterLocalizedNameStorage).toEqual(
      area.objects[1]?.encounterLocalizedName,
    );
    expect(encounter?.source?.encounterLocalizedNameStorage).not.toBe(
      area.objects[1]?.encounterLocalizedName,
    );
    expect(encounter?.source?.encounterEditorComment).toBe("  encounter note  ");
    expect(encounter?.encounterProperties?.comments).toBe("  encounter note  ");
    expect(encounter?.source?.encounterCreatureList).toEqual(
      area.objects[1]?.encounterCreatureList,
    );
    expect(encounter?.source?.encounterCreatureList).not.toBe(
      area.objects[1]?.encounterCreatureList,
    );
    expect(encounter?.encounterProperties?.creatureList).toEqual([
      {
        appearance: 388,
        challengeRating: 1,
        resRef: "nw_gnoll001",
        singleSpawn: false,
      },
      {
        appearance: 389,
        challengeRating: 3,
        resRef: "nw_gnoll002",
        singleSpawn: true,
      },
    ]);
    expect(encounter?.source?.encounterSpawnPoints).toEqual(
      area.objects[1]?.encounterSpawnPoints,
    );
    expect(encounter?.source?.encounterSpawnPoints).not.toBe(
      area.objects[1]?.encounterSpawnPoints,
    );
    expect(encounter?.encounterProperties?.spawnPoints).toEqual([
      { nativeX: 22.5, nativeY: 45.25, nativeZ: 0, orientation: 1.5 },
      { nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
    ]);
    expect(encounter?.encounterProperties?.spawnPoints).not.toBe(
      encounter?.source?.encounterSpawnPoints?.expectedEntries,
    );
    expect(encounter?.polygonGeometry).toEqual(encounterGeometry);
    expect(encounter?.source?.polygonGeometry).toEqual(encounterGeometry);

    const malformed = mapBackendAreaToScene({
      ...area,
      objects: [{
        ...area.objects[0]!,
        polygonGeometry: { ...triggerGeometry, unexpected: true } as never,
      }],
    }).objects[0]!;
    expect(malformed).not.toHaveProperty("polygonGeometry");
    expect(malformed.source).not.toHaveProperty("polygonGeometry");

    const wrongFamily = mapBackendAreaToScene({
      ...area,
      objects: [{ ...area.objects[0]!, kind: "door" }],
    }).objects[0]!;
    expect(wrongFamily).not.toHaveProperty("polygonGeometry");
    expect(wrongFamily.source).not.toHaveProperty("polygonGeometry");
    expect(wrongFamily.source).not.toHaveProperty("triggerTag");
    expect(wrongFamily.source).not.toHaveProperty("encounterActiveStorage");
    expect(wrongFamily.source).not.toHaveProperty("encounterPlayerOnlyStorage");
    expect(wrongFamily.source).not.toHaveProperty("encounterResetStorage");
    expect(wrongFamily.source).not.toHaveProperty("encounterResetTimeStorage");
    expect(wrongFamily.source).not.toHaveProperty("encounterSpawnOptionStorage");
    expect(wrongFamily.source).not.toHaveProperty("encounterRespawnsStorage");
    expect(wrongFamily.source).not.toHaveProperty("encounterCreatureCountsStorage");
    expect(wrongFamily.source).not.toHaveProperty("encounterScriptResRefsStorage");
    expect(wrongFamily.source).not.toHaveProperty("encounterFaction");
    expect(wrongFamily.source).not.toHaveProperty("encounterDifficulty");
    expect(wrongFamily.source).not.toHaveProperty("encounterLocalizedNameStorage");
    expect(wrongFamily.source).not.toHaveProperty("encounterEditorComment");
    expect(wrongFamily.source).not.toHaveProperty("encounterCreatureList");
    expect(wrongFamily.source).not.toHaveProperty("encounterSpawnPoints");
  });

  it("maps exact Area-owned VarTable provenance into a separate editable target", () => {
    const expectedEntries = [
      { sourceIndex: 0, name: "State", type: "int" as const, value: 1 },
      { sourceIndex: 1, name: "Scale", type: "float" as const, value: Math.fround(1.25) },
      { sourceIndex: 2, name: "", type: "string" as const, value: "" },
    ];
    const scene = mapBackendAreaToScene(minimalAreaDetail({
      variables: { expectedEntries },
    }));

    expect(scene.areaVariables).toEqual([
      { name: "State", type: "int", value: 1 },
      { name: "Scale", type: "float", value: Math.fround(1.25) },
      { name: "", type: "string", value: "" },
    ]);
    expect(scene.areaVariables).not.toBe(expectedEntries);
    expect(mapBackendAreaToScene(minimalAreaDetail({
      variables: {
        expectedEntries: [{ sourceIndex: 1, name: "bad", type: "int", value: 1 }],
      },
    } as unknown as Partial<AreaApiDetail>))).not.toHaveProperty("areaVariables");
  });

  it("maps one exact Area loading-screen catalog without sharing mutable image provenance", () => {
    const catalog = effectiveAreaLoadingScreenCatalog();
    const scene = mapBackendAreaToScene(minimalAreaDetail({ loadingScreenCatalog: catalog }));

    expect(scene.areaLoadingScreenCatalog).toEqual(catalog);
    expect(scene.areaLoadingScreenCatalog).not.toBe(catalog);
    expect(scene.areaLoadingScreenCatalog?.rows[0]?.imageAsset)
      .not.toBe(catalog.rows[0]?.imageAsset);
    expect(mapBackendAreaToScene(minimalAreaDetail({
      loadingScreenCatalog: { ...catalog, rows: catalog.rows.slice(1) },
    }) as unknown as AreaApiDetail)).not.toHaveProperty("areaLoadingScreenCatalog");
  });

  it("maps one exact effective Area audio catalog bundle without sharing mutable rows", () => {
    const catalogs = effectiveAreaAudioCatalogBundle();
    const backendArea = minimalAreaDetail({ audioEnvironmentCatalogs: catalogs });
    const scene = mapBackendAreaToScene(backendArea);

    expect(scene.areaAudioEnvironmentCatalogs).toEqual(catalogs);
    expect(scene.areaAudioEnvironmentCatalogs?.ambientSound.rows)
      .not.toBe(catalogs.ambientSound.rows);
    expect(mapBackendAreaToScene(minimalAreaDetail({
      audioEnvironmentCatalogs: {
        ...catalogs,
        environmentalAudio: undefined,
      },
    }) as unknown as AreaApiDetail)).not.toHaveProperty("areaAudioEnvironmentCatalogs");
  });

  it("maps one exact effective Area visual catalog bundle without sharing nested targets", () => {
    const catalogs = effectiveAreaVisualEnvironmentCatalogBundle();
    const scene = mapBackendAreaToScene(minimalAreaDetail({
      visualEnvironmentCatalogs: catalogs,
    }));

    expect(scene.areaVisualEnvironmentCatalogs).toEqual(catalogs);
    expect(scene.areaVisualEnvironmentCatalogs).not.toBe(catalogs);
    expect(scene.areaVisualEnvironmentCatalogs?.lightingSchemes.rows[0]?.visualEnvironment.sun)
      .not.toBe(catalogs.lightingSchemes.rows[0]?.visualEnvironment.sun);
    expect(mapBackendAreaToScene(minimalAreaDetail({
      visualEnvironmentCatalogs: {
        ...catalogs,
        skyBoxes: undefined,
      },
    }) as unknown as AreaApiDetail)).not.toHaveProperty("areaVisualEnvironmentCatalogs");
  });

  it("maps only one exact retained visual catalog selection pair", () => {
    const selection = { lightingSchemeRowIndex: 2, skyBoxRowIndex: 1 };
    const scene = mapBackendAreaToScene(minimalAreaDetail({
      visualEnvironmentCatalogSelection: selection,
    }));
    expect(scene.areaVisualEnvironmentCatalogSelection).toEqual(selection);
    expect(scene.areaVisualEnvironmentCatalogSelection).not.toBe(selection);
    expect(mapBackendAreaToScene(minimalAreaDetail({
      visualEnvironmentCatalogSelection: { lightingSchemeRowIndex: 2 },
    }) as unknown as AreaApiDetail)).not.toHaveProperty(
      "areaVisualEnvironmentCatalogSelection",
    );
  });

  it("maps only one complete exact Area audio-environment tuple", () => {
    const audioEnvironment = {
      ambientSoundDayId: 41,
      ambientSoundNightId: 42,
      ambientSoundDayVolume: 101,
      ambientSoundNightVolume: 102,
      environmentAudioId: 7,
      musicBattleId: 13,
      musicDayId: 11,
      musicNightId: 12,
      musicDelayMilliseconds: 3000,
    };
    const backendArea: AreaApiDetail = {
      areaId: "area_audio_probe",
      name: "Audio Probe",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      audioEnvironment,
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0 },
      updatedAt: "2026-08-22T00:00:00.000Z",
      objects: [],
    };
    expect(mapBackendAreaToScene(backendArea).areaAudioEnvironment).toEqual(audioEnvironment);
    expect(mapBackendAreaToScene({
      ...backendArea,
      audioEnvironment: { ...audioEnvironment, ambientSoundDayVolume: 128 },
    } as AreaApiDetail)).not.toHaveProperty("areaAudioEnvironment");
  });

  it("maps exact Area Comments provenance without normalization and preserves empty string", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_comments_probe",
      name: "Comments Probe",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      comments: " exact\r\nnote ",
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_comments_probe",
        cacheKey: "atlas_comments_probe:1x1",
        strategy: "blob-cache",
      },
      composition: {
        placeables: 0,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 0,
      },
      updatedAt: "2026-08-21T20:00:00.000Z",
      objects: [],
    };

    expect(mapBackendAreaToScene(backendArea).areaComments).toBe(" exact\r\nnote ");
    expect(mapBackendAreaToScene({ ...backendArea, comments: "" }).areaComments).toBe("");
    expect(mapBackendAreaToScene({ ...backendArea, comments: undefined })).not.toHaveProperty(
      "areaComments",
    );
    expect(mapBackendAreaToScene({
      ...backendArea,
      comments: "bad\0note",
    } as AreaApiDetail)).not.toHaveProperty("areaComments");
  });

  it("maps exact per-slot Area event-script presence and rejects non-canonical values", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_event_probe",
      name: "Event Probe",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      eventScripts: { onEnter: "area_enter", onExit: "" },
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_event_probe",
        cacheKey: "atlas_event_probe:1x1",
        strategy: "blob-cache",
      },
      composition: {
        placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0,
      },
      updatedAt: "2026-08-21T20:00:00.000Z",
      objects: [],
    };
    expect(mapBackendAreaToScene(backendArea).areaEventScripts).toEqual({
      onEnter: "area_enter",
      onExit: "",
    });
    expect(mapBackendAreaToScene({
      ...backendArea,
      eventScripts: { onEnter: "Bad-Enter" },
    } as AreaApiDetail)).not.toHaveProperty("areaEventScripts");
  });

  it("maps exact bounded Area Name and Tag provenance into coherent scene identity", () => {
    const nameEntries = [
      { languageId: 3, text: "Nom" },
      { languageId: 0, text: " Exact Name " },
    ];
    const backendArea: AreaApiDetail = {
      areaId: "area_identity_probe",
      name: "Summary Name",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      basicIdentity: {
        name: " Exact Name ",
        nameProfile: "multi_entry_inline_ascii",
        nameEntries,
        tag: "EXACT_TAG",
      },
      advancedFlags: {
        terrainType: { interior: true, natural: false, subterranean: true },
        playerVsPlayer: 2,
        noRest: false,
        listenCheckModifier: -8,
        spotCheckModifier: 11,
        loadingScreenId: 0xffff,
      },
      moduleStartLocation: {
        areaResRef: "identity_probe",
        x: Math.fround(1.25),
        y: Math.fround(2.5),
        z: Math.fround(3.75),
        directionX: Math.fround(0),
        directionY: Math.fround(1),
      },
      moduleStartLocationTargets: ["identity_probe", "other_area"],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_identity_probe",
        cacheKey: "atlas_identity_probe:1x1",
        strategy: "blob-cache",
      },
      composition: {
        placeables: 0, doors: 0, creatures: 0, items: 0, sounds: 0, total: 0,
      },
      updatedAt: "2026-08-22T08:00:00.000Z",
      objects: [],
    };

    const mapped = mapBackendAreaToScene(backendArea);
    expect(mapped).toMatchObject({
      areaName: " Exact Name ",
      areaTag: "EXACT_TAG",
      areaBasicIdentity: {
        name: " Exact Name ",
        nameProfile: "multi_entry_inline_ascii",
        nameEntries: [
          { languageId: 3, text: "Nom" },
          { languageId: 0, text: " Exact Name " },
        ],
        tag: "EXACT_TAG",
      },
      areaAdvancedFlags: {
        terrainType: { interior: true, natural: false, subterranean: true },
        playerVsPlayer: 2,
        noRest: false,
        listenCheckModifier: -8,
        spotCheckModifier: 11,
        loadingScreenId: 0xffff,
      },
      moduleStartLocation: {
        areaResRef: "identity_probe",
        x: Math.fround(1.25),
        y: Math.fround(2.5),
        z: Math.fround(3.75),
        directionX: Math.fround(0),
        directionY: Math.fround(1),
      },
      moduleStartLocationTargets: ["identity_probe", "other_area"],
    });
    expect(mapped.areaBasicIdentity?.nameEntries).not.toBe(nameEntries);
    expect(mapped.areaBasicIdentity?.nameEntries?.[0]).not.toBe(nameEntries[0]);
    expect(mapBackendAreaToScene({
      ...backendArea,
      basicIdentity: { tag: "" },
    })).toMatchObject({
      areaName: "Summary Name",
      areaTag: "",
      areaBasicIdentity: { tag: "" },
    });
    expect(mapBackendAreaToScene({
      ...backendArea,
      basicIdentity: { name: "München", tag: "EXACT_TAG" },
    } as AreaApiDetail)).toMatchObject({
      areaName: "Summary Name",
      areaBasicIdentity: { tag: "EXACT_TAG" },
    });
    expect(mapBackendAreaToScene({
      ...backendArea,
      basicIdentity: { name: "Exact Name", tag: "EXACT_TAG" },
    } as AreaApiDetail)).toMatchObject({
      areaName: "Summary Name",
      areaBasicIdentity: { tag: "EXACT_TAG" },
    });
    expect(mapBackendAreaToScene({
      ...backendArea,
      basicIdentity: {
        name: "Exact Name",
        nameProfile: "tlk" as never,
        tag: "EXACT_TAG",
      },
    } as AreaApiDetail)).toMatchObject({
      areaName: "Summary Name",
      areaBasicIdentity: { tag: "EXACT_TAG" },
    });
    expect(mapBackendAreaToScene({
      ...backendArea,
      basicIdentity: {
        name: "Exact Name",
        nameProfile: "simple_inline_ascii",
        nameEntries: [
          { languageId: 0, text: "Exact Name" },
          { languageId: 2, text: "Other" },
        ],
        tag: "EXACT_TAG",
      },
    } as AreaApiDetail)).toMatchObject({
      areaName: "Summary Name",
      areaBasicIdentity: { tag: "EXACT_TAG" },
    });
    expect(mapBackendAreaToScene({
      ...backendArea,
      advancedFlags: { playerVsPlayer: 4 },
    } as unknown as AreaApiDetail)).not.toHaveProperty("areaAdvancedFlags");
    expect(mapBackendAreaToScene({
      ...backendArea,
      advancedFlags: { listenCheckModifier: -100 },
    } as unknown as AreaApiDetail)).not.toHaveProperty("areaAdvancedFlags");
    expect(mapBackendAreaToScene({
      ...backendArea,
      advancedFlags: { loadingScreenId: 0x1_0000 },
    } as unknown as AreaApiDetail)).not.toHaveProperty("areaAdvancedFlags");
    expect(mapBackendAreaToScene({
      ...backendArea,
      moduleStartLocation: {
        ...backendArea.moduleStartLocation!,
        directionY: Number.POSITIVE_INFINITY,
      },
    } as AreaApiDetail)).not.toHaveProperty("moduleStartLocation");
  });

  it("maps an exact existing-placeable OnUsed value into editable state and immutable provenance", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_onused_probe",
      name: "OnUsed Probe",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_onused_probe",
        cacheKey: "atlas_onused_probe",
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
      updatedAt: "2026-08-13T00:00:00.000Z",
      objects: [{
        objectId: "plc_lever",
        kind: "placeable",
        templateId: "plc_flrlever1",
        placeableMetadata: { "script.onUsed": "s04_plcprobe" },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0
      }]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000000000);

    expect(scene.objects[0]).toMatchObject({
      source: { placeableOnUsed: "s04_plcprobe" },
      placeableProperties: {
        scriptSlots: { onUsed: "s04_plcprobe" }
      }
    });
    expect(scene.objects[0]?.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false,
      scriptSlots: {
        onClick: "",
        onClosed: "",
        onDamaged: "",
        onDeath: "",
        onHeartbeat: "",
        onInvDisturbed: "",
        onLock: "",
        onMeleeAttacked: "",
        onOpen: "",
        onSpellCastAt: "",
        onUnlock: "",
        onUsed: "s04_plcprobe",
        onUserDefined: ""
      }
    });

    const withoutProvenance: AreaApiDetail = {
      ...backendArea,
      objects: [{ ...backendArea.objects[0]!, placeableMetadata: { "script.onUsed": true } }]
    };
    const withoutProvenanceScene = mapBackendAreaToScene(withoutProvenance);
    expect(withoutProvenanceScene.objects[0]?.source).not.toHaveProperty("placeableOnUsed");
    expect(withoutProvenanceScene.objects[0]?.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });

    const absentMetadata: AreaApiDetail = {
      ...backendArea,
      objects: [{
        objectId: "plc_without_metadata",
        kind: "placeable",
        templateId: "plc_flrlever1",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0
      }]
    };
    const absentMetadataObject = mapBackendAreaToScene(absentMetadata).objects[0];
    const absentMetadataSource = absentMetadataObject?.source;
    expect(Object.keys(absentMetadataSource ?? {})).not.toContain("placeableOnUsed");

    const wrongFamily: AreaApiDetail = {
      ...backendArea,
      objects: [{
        objectId: "snd_wrong_metadata",
        kind: "sound",
        templateId: "snd_probe",
        placeableMetadata: { "script.onUsed": "must_not_cross_family" },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0
      }]
    };
    const wrongFamilyObject = mapBackendAreaToScene(wrongFamily).objects[0];
    expect(Object.keys(wrongFamilyObject?.source ?? {})).not.toContain("placeableOnUsed");
    expect(wrongFamilyObject?.placeableProperties).toBeUndefined();
  });

  it("maps exact existing-placeable boolean bytes into editable state and immutable provenance", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_static_useable_probe",
      name: "Static Useable Probe",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_static_useable_probe",
        cacheKey: "atlas_static_useable_probe",
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
      updatedAt: "2026-08-17T00:00:00.000Z",
      objects: [{
        objectId: "plc_lever",
        kind: "placeable",
        templateId: "plc_flrlever1",
        isStatic: false,
        placeableMetadata: { static: false, useable: true, plot: true, hasInventory: true },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0
      }]
    };

    const object = mapBackendAreaToScene(backendArea).objects[0];
    expect(object).toMatchObject({
      isStatic: false,
      source: {
        placeableStatic: false,
        placeableUseable: true,
        placeablePlot: true,
        placeableHasInventory: true
      },
      placeableProperties: { plot: true, useable: true, hasInventory: true }
    });
    expect(object?.placeableProperties).toEqual({
      plot: true,
      useable: true,
      hasInventory: true
    });

    const invalid = mapBackendAreaToScene({
      ...backendArea,
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: { static: 0, useable: "true", plot: 1, hasInventory: "yes" }
      }]
    }).objects[0];
    expect(invalid?.source).not.toHaveProperty("placeableStatic");
    expect(invalid?.source).not.toHaveProperty("placeableUseable");
    expect(invalid?.source).not.toHaveProperty("placeablePlot");
    expect(invalid?.source).not.toHaveProperty("placeableHasInventory");
    expect(invalid?.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });

    const wrongFamily = mapBackendAreaToScene({
      ...backendArea,
      objects: [{
        objectId: "snd_wrong_flags",
        kind: "sound",
        templateId: "snd_probe",
        placeableMetadata: { static: true, useable: false, plot: true, hasInventory: true },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0
      }]
    }).objects[0];
    expect(wrongFamily?.source).not.toHaveProperty("placeableStatic");
    expect(wrongFamily?.source).not.toHaveProperty("placeableUseable");
    expect(wrongFamily?.source).not.toHaveProperty("placeablePlot");
    expect(wrongFamily?.source).not.toHaveProperty("placeableHasInventory");
  });

  it("maps every admitted existing-placeable script ResRef with empty-value provenance intact", () => {
    const metadata = {
      "script.onClick": "",
      "script.onClosed": "old_closed",
      "script.onDamaged": "old_damaged",
      "script.onDeath": "old_death",
      "script.onHeartbeat": "old_heartbeat",
      "script.onInventoryDisturbed": "old_inv",
      "script.onLock": "old_lock",
      "script.onMeleeAttacked": "old_melee",
      "script.onOpen": "old_open",
      "script.onSpellCastAt": "old_spell",
      "script.onUnlock": "old_unlock",
      "script.onUserDefined": "old_user"
    };
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_scripts",
      name: "Placeable Scripts",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_scripts",
        cacheKey: "atlas_placeable_scripts",
        strategy: "blob-cache",
        objectKey: "atlas.webp",
        contentType: "image/webp",
        sizeBytes: 0
      },
      composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-17T00:00:00.000Z",
      objects: [{
        objectId: "plc_scripts",
        kind: "placeable",
        templateId: "plc_flrlever1",
        placeableMetadata: metadata,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0
      }]
    };

    const object = mapBackendAreaToScene(backendArea).objects[0];
    expect(object?.source?.placeableScriptResRefs).toEqual({
      onClick: "",
      onClosed: "old_closed",
      onDamaged: "old_damaged",
      onDeath: "old_death",
      onHeartbeat: "old_heartbeat",
      onInvDisturbed: "old_inv",
      onLock: "old_lock",
      onMeleeAttacked: "old_melee",
      onOpen: "old_open",
      onSpellCastAt: "old_spell",
      onUnlock: "old_unlock",
      onUserDefined: "old_user"
    });
    expect(object?.placeableProperties?.scriptSlots).toMatchObject({
      onClick: "",
      onClosed: "old_closed",
      onDamaged: "old_damaged",
      onDeath: "old_death",
      onHeartbeat: "old_heartbeat",
      onInvDisturbed: "old_inv",
      onLock: "old_lock",
      onMeleeAttacked: "old_melee",
      onOpen: "old_open",
      onSpellCastAt: "old_spell",
      onUnlock: "old_unlock",
      onUsed: "",
      onUserDefined: "old_user"
    });

    const invalid = mapBackendAreaToScene({
      ...backendArea,
      objects: [{ ...backendArea.objects[0]!, placeableMetadata: { "script.onOpen": 7 } }]
    }).objects[0];
    expect(invalid?.source).not.toHaveProperty("placeableScriptResRefs");
    expect(invalid?.placeableProperties?.scriptSlots).toBeUndefined();

    const wrongFamily = mapBackendAreaToScene({
      ...backendArea,
      objects: [{ ...backendArea.objects[0]!, kind: "sound" }]
    }).objects[0];
    expect(wrongFamily?.source).not.toHaveProperty("placeableScriptResRefs");
    expect(wrongFamily?.placeableProperties).toBeUndefined();
  });

  it("maps exact existing-Placeable lock Bytes without inventing absent provenance", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_lock",
      name: "Placeable Lock",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_lock",
        cacheKey: "atlas_placeable_lock",
        strategy: "blob-cache",
        objectKey: "atlas.webp",
        contentType: "image/webp",
        sizeBytes: 0
      },
      composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-17T00:00:00.000Z",
      objects: [{
        objectId: "plc_lock",
        kind: "placeable",
        templateId: "plc_watertrough",
        placeableMetadata: {
          locked: false,
          lockable: true,
          autoRemoveKey: false,
          keyRequired: true,
          openLockDc: 18,
          closeLockDc: 0,
          keyName: "chest_key"
        },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0
      }]
    };

    const object = mapBackendAreaToScene(backendArea).objects[0];
    expect(object?.source?.placeableLockSettings).toEqual({
      locked: false,
      canRelock: true,
      autoRemoveKeyAfterUse: false,
      keyRequiredToUnlockOrLock: true,
      openLockDc: 18,
      closeLockDc: 0,
      keyTag: "chest_key"
    });
    expect(object?.placeableProperties?.lockSettings).toEqual({
      locked: false,
      canRelock: true,
      autoRemoveKeyAfterUse: false,
      keyRequiredToUnlockOrLock: true,
      openLockDc: 18,
      closeLockDc: 0,
      keyTag: "chest_key"
    });

    const partial = mapBackendAreaToScene({
      ...backendArea,
      objects: [{ ...backendArea.objects[0]!, placeableMetadata: { locked: false } }]
    }).objects[0];
    expect(partial?.source?.placeableLockSettings).toEqual({ locked: false });
    expect(partial?.placeableProperties?.lockSettings).toEqual({
      locked: false,
      canRelock: false,
      autoRemoveKeyAfterUse: false,
      keyRequiredToUnlockOrLock: false,
      openLockDc: 18,
      closeLockDc: 0,
      keyTag: ""
    });

    const partialWithoutLocked = mapBackendAreaToScene({
      ...backendArea,
      objects: [{ ...backendArea.objects[0]!, placeableMetadata: { lockable: true } }]
    }).objects[0];
    expect(partialWithoutLocked?.source?.placeableLockSettings).toEqual({ canRelock: true });
    expect(partialWithoutLocked?.placeableProperties?.lockSettings).toMatchObject({
      locked: false,
      canRelock: true
    });

    const explicitEmptyKeyName = mapBackendAreaToScene({
      ...backendArea,
      objects: [{ ...backendArea.objects[0]!, placeableMetadata: { keyName: "" } }]
    }).objects[0];
    expect(explicitEmptyKeyName?.source?.placeableLockSettings).toEqual({ keyTag: "" });
    expect(explicitEmptyKeyName?.placeableProperties?.lockSettings).toMatchObject({
      locked: false,
      keyTag: ""
    });

    const invalid = mapBackendAreaToScene({
      ...backendArea,
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: {
          locked: 0,
          openLockDc: 256,
          closeLockDc: 1.5,
          keyName: "K".repeat(33)
        }
      }]
    }).objects[0];
    expect(invalid?.source).not.toHaveProperty("placeableLockSettings");
    expect(invalid?.placeableProperties?.lockSettings).toBeUndefined();

    const wrongFamily = mapBackendAreaToScene({
      ...backendArea,
      objects: [{ ...backendArea.objects[0]!, kind: "sound" }]
    }).objects[0];
    expect(wrongFamily?.source).not.toHaveProperty("placeableLockSettings");
    expect(wrongFamily?.placeableProperties).toBeUndefined();
  });

  it("maps exact placeable trap script ResRefs without admitting other trap properties", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_trap_scripts",
      name: "Placeable Trap Scripts",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_trap_scripts",
        cacheKey: "atlas_placeable_trap_scripts",
        strategy: "blob-cache",
        objectKey: "atlas.webp",
        contentType: "image/webp",
        sizeBytes: 0
      },
      composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-17T00:00:00.000Z",
      objects: [{
        objectId: "plc_trap_scripts",
        kind: "placeable",
        templateId: "plc_flrlever1",
        placeableMetadata: {
          "script.onDisarm": "",
          "script.onTrapTriggered": "old_trap"
        },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0
      }]
    };

    const object = mapBackendAreaToScene(backendArea).objects[0];
    expect(object?.source?.placeableTrapScriptResRefs).toEqual({
      onDisarmScript: "",
      onTrapTriggeredScript: "old_trap"
    });
    expect(object?.placeableProperties?.trapSettings).toMatchObject({
      onDisarmScript: "",
      onTrapTriggeredScript: "old_trap"
    });

    const disarmOnly = mapBackendAreaToScene({
      ...backendArea,
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: { "script.onDisarm": "only_disarm" }
      }]
    }).objects[0];
    expect(disarmOnly?.source?.placeableTrapScriptResRefs).toEqual({
      onDisarmScript: "only_disarm"
    });
    expect(disarmOnly?.placeableProperties?.trapSettings).toMatchObject({
      onDisarmScript: "only_disarm",
      onTrapTriggeredScript: ""
    });

    const triggeredOnly = mapBackendAreaToScene({
      ...backendArea,
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: { "script.onTrapTriggered": "only_trigger" }
      }]
    }).objects[0];
    expect(triggeredOnly?.source?.placeableTrapScriptResRefs).toEqual({
      onTrapTriggeredScript: "only_trigger"
    });
    expect(triggeredOnly?.placeableProperties?.trapSettings).toMatchObject({
      onDisarmScript: "",
      onTrapTriggeredScript: "only_trigger"
    });

    const invalid = mapBackendAreaToScene({
      ...backendArea,
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: { "script.onDisarm": 1, "script.onTrapTriggered": false }
      }]
    }).objects[0];
    expect(invalid?.source).not.toHaveProperty("placeableTrapScriptResRefs");
    expect(invalid?.placeableProperties?.trapSettings).toBeUndefined();

    const wrongFamily = mapBackendAreaToScene({
      ...backendArea,
      objects: [{ ...backendArea.objects[0]!, kind: "sound" }]
    }).objects[0];
    expect(wrongFamily?.source).not.toHaveProperty("placeableTrapScriptResRefs");
    expect(wrongFamily?.placeableProperties).toBeUndefined();
  });

  it("overrides only template OnUsed while cloning all other placeable properties", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_onused_template",
      name: "OnUsed Template",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_onused_template",
        cacheKey: "atlas_onused_template",
        strategy: "blob-cache",
        objectKey: "atlas.webp",
        contentType: "image/webp",
        sizeBytes: 0
      },
      composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-13T00:00:00.000Z",
      objects: [{
        objectId: "plc_lever",
        kind: "placeable",
        templateId: "plc_flrlever1",
        placeableMetadata: { "script.onUsed": "instance_use" },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0
      }]
    };
    const template: SceneObject = {
      id: "plc_template",
      kind: "placeables",
      name: "Lever",
      resRef: "plc_flrlever1",
      tag: "PLC_LEVER",
      x: 0,
      y: 0,
      z: 0,
      bearing: 0,
      visualTransform: { scale: 1, offsetX: 0, offsetY: 0, offsetZ: 0, pitch: 0, yaw: 0, roll: 0 },
      placeableProperties: {
        plot: true,
        useable: true,
        hasInventory: false,
        scriptSlots: {
          onClick: "template_click",
          onClosed: "",
          onDamaged: "",
          onDeath: "",
          onHeartbeat: "",
          onInvDisturbed: "",
          onLock: "",
          onMeleeAttacked: "",
          onOpen: "template_open",
          onSpellCastAt: "",
          onUnlock: "",
          onUsed: "template_use",
          onUserDefined: ""
        }
      }
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000000000, {
      objectTemplateObjects: [template]
    });
    expect(scene.objects[0]?.placeableProperties).toMatchObject({
      plot: true,
      useable: true,
      scriptSlots: {
        onClick: "template_click",
        onOpen: "template_open",
        onUsed: "instance_use"
      }
    });
    expect(scene.objects[0]?.placeableProperties).not.toBe(template.placeableProperties);
    expect(scene.objects[0]?.placeableProperties?.scriptSlots)
      .not.toBe(template.placeableProperties?.scriptSlots);

    const otherInstanceScriptScene = mapBackendAreaToScene({
      ...backendArea,
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: { "script.onOpen": "instance_open" }
      }]
    }, () => 1770000000000, { objectTemplateObjects: [template] });
    expect(otherInstanceScriptScene.objects[0]?.placeableProperties?.scriptSlots).toMatchObject({
      onOpen: "instance_open",
      onUsed: "template_use"
    });

    const templateOnlyScene = mapBackendAreaToScene({
      ...backendArea,
      objects: [{ ...backendArea.objects[0]!, placeableMetadata: undefined }]
    }, () => 1770000000000, { objectTemplateObjects: [template] });
    expect(templateOnlyScene.objects[0]?.placeableProperties).toEqual(template.placeableProperties);
    expect(templateOnlyScene.objects[0]?.placeableProperties).not.toBe(template.placeableProperties);
    expect(templateOnlyScene.objects[0]?.placeableProperties?.scriptSlots)
      .not.toBe(template.placeableProperties?.scriptSlots);
  });

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
          sourceIndex: 0,
          kind: "item",
          templateId: "nw_it_mpotion001",
          resRef: "itm_potion_01",
          tag: "item_git_tag",
          itemTag: { present: true, value: "  exact_item_tag  " },
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
            comments: "presentation-only comment",
            editorComment: " exact paired GIC item comment ",
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
          itemInstanceState: {
            presentFields: [
              "charges",
              "cost",
              "stolen",
              "stackSize",
              "plot",
              "addCost",
              "identified",
              "cursed",
            ],
            values: {
              charges: 8,
              cost: 100,
              stolen: false,
              stackSize: 9,
              plot: false,
              addCost: 11,
              identified: false,
              cursed: true,
            },
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
      tag: "  exact_item_tag  ",
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
        sourceIndex: 0,
        templateId: "nw_it_mpotion001",
        localizedName: "Area Potion",
        description: "Potion on the ground",
        itemTag: { present: true, value: "  exact_item_tag  " },
        itemEditorComment: " exact paired GIC item comment ",
        itemInstanceState: {
          presentFields: [
            "charges",
            "cost",
            "stolen",
            "stackSize",
            "plot",
            "addCost",
            "identified",
            "cursed",
          ],
          values: {
            charges: 8,
            cost: 100,
            stolen: false,
            stackSize: 9,
            plot: false,
            addCost: 11,
            identified: false,
            cursed: true,
          },
        },
      }),
      itemProperties: expect.objectContaining({
        localizedName: "Area Potion",
        localizedNameStrRef: 711,
        description: "Potion on the ground",
        descriptionStrRef: 712,
        identifiedDescription: "Known potion",
        identifiedDescriptionStrRef: 713,
        comments: " exact paired GIC item comment ",
        paletteId: 9,
        baseItem: 49,
        modelPart1: 11,
        modelPart2: 13,
        modelPart3: 63,
        modelParts: [11, 13, 63],
        cost: 100,
        addCost: 11,
        charges: 8,
        stackSize: 9,
        identified: false,
        stolen: false,
        plot: false,
        cursed: true,
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

  it("maps GIT Placeable ItemList as immutable source provenance and an exact editable target", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_git_inventory",
      name: "Placed Container Inventory",
      biome: "interior",
      width: 1,
      height: 1,
      tags: ["inventory"],
      benchmark: false,
      previewImageUrl: "/assets/previews/areas/area_placeable_git_inventory.webp",
      textureAtlas: {
        atlasId: "atlas_placeable_git_inventory",
        cacheKey: "atlas_placeable_git_inventory:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 1,
        doors: 1,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 2
      },
      updatedAt: "2026-08-17T10:00:00.000Z",
      objects: [
        {
          objectId: "plc:0:plc_flrlever1:source",
          kind: "placeable",
          templateId: "plc_market_stall_001",
          x: 0.25,
          y: 0.75,
          z: 0,
          bearing: 90,
          placeableMetadata: {
            hasInventory: false,
            inventoryItemListCount: 1,
            inventoryItemListEntries: JSON.stringify([
              {
                sourceIndex: 0,
                resRef: "s03proofamuletr2",
                x: 3,
                y: 4
              }
            ])
          }
        },
        {
          objectId: "door_with_unrelated_placeable_metadata",
          kind: "door",
          templateId: "nw_door_ttr_11",
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
          placeableMetadata: {
            inventoryItemListEntries: JSON.stringify([
              { sourceIndex: 0, resRef: "nw_cloth022", x: 0, y: 0 }
            ])
          }
        }
      ]
    };
    const templateObject: SceneObject = {
      ...createPlaceableTemplateObject(),
      placeableProperties: {
        plot: false,
        useable: true,
        hasInventory: true,
        inventoryItems: [{ resRef: "template_only", x: 9, y: 9 }]
      }
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000004444, {
      objectTemplateObjects: [templateObject]
    });
    const placeable = scene.objects[0]!;

    expect(placeable.source?.placeableInventoryItems).toEqual([
      { sourceIndex: 0, resRef: "s03proofamuletr2", x: 3, y: 4 }
    ]);
    expect(placeable.placeableProperties).toMatchObject({
      hasInventory: false,
      inventoryItems: [{ sourceIndex: 0, resRef: "s03proofamuletr2", x: 3, y: 4 }]
    });
    expect(placeable.placeableProperties?.inventoryItems?.[0]).not.toBe(
      placeable.source?.placeableInventoryItems?.[0]
    );
    expect(placeable.placeableProperties?.inventoryItems?.[0]).not.toHaveProperty("dropable");
    expect(placeable.placeableProperties?.inventoryItems?.[0]).not.toHaveProperty(
      "pickpocketable"
    );
    expect(placeable.placeableProperties?.inventoryItems?.[0]).not.toHaveProperty("infinite");
    expect(scene.objects[1]?.source?.placeableInventoryItems).toBeUndefined();
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
    expect(creature.creatureProperties?.advancedSettings).not.toHaveProperty(
      "corpseDecayTimeSeconds",
    );
    expect(creature.creatureProperties?.classEntries).toEqual([
      { classId: 1, className: "Class 1", level: 4 }
    ]);
    expect(creature.creatureProperties?.skills).toEqual([
      { skill: "Animal Empathy", rank: 5 }
    ]);
    expect(creature.creatureProperties?.feats).toEqual([
      { featId: 1001, name: "Feat 1001", type: "feat", assigned: true }
    ]);
    expect(creature.creatureProperties?.templateEntries).toEqual([{ templateId: 2 }]);
    expect(creature.creatureProperties?.spells).toEqual([
      {
        spellId: 201,
        classIndex: 0,
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
        spellId: 401,
        flags: 1,
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

  it("maps exact existing Placeable durability/save Bytes into immutable provenance and editable targets", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_durability_bytes",
      name: "Placeable Durability Bytes",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_durability_bytes",
        cacheKey: "atlas_placeable_durability_bytes:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 1,
        doors: 1,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 2
      },
      updatedAt: "2026-08-17T12:00:00.000Z",
      objects: [
        {
          objectId: "plc:0:durability_probe",
          kind: "placeable",
          templateId: "plc_flrlever1",
          x: 1,
          y: 2,
          z: 0,
          bearing: 0,
          placeableMetadata: {
            hardness: 0,
            fortitudeSave: 255,
            reflexSave: 4,
            willSave: 12
          }
        },
        {
          objectId: "door:0:not_placeable",
          kind: "door",
          templateId: "nw_door_ttr_11",
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
          placeableMetadata: {
            hardness: 5,
            fortitudeSave: 16,
            reflexSave: 0,
            willSave: 0
          }
        }
      ]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000005555);
    const placeable = scene.objects[0]!;

    expect(placeable.source?.placeableDurabilitySaveBytes).toEqual({
      hardness: 0,
      fortitudeSave: 255,
      reflexSave: 4,
      willSave: 12
    });
    expect(placeable.placeableProperties).toMatchObject({
      hardness: 0,
      fortitudeSave: 255,
      reflexSave: 4,
      willSave: 12
    });
    expect(placeable.placeableProperties).not.toHaveProperty("hitPoints");
    expect(scene.objects[1]?.source?.placeableDurabilitySaveBytes).toBeUndefined();
  });

  it("keeps durability/save Byte mapping presence-sensitive and rejects invalid numeric metadata", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_partial_durability_bytes",
      name: "Partial Placeable Durability Bytes",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_partial_durability_bytes",
        cacheKey: "atlas_placeable_partial_durability_bytes:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-08-17T12:00:00.000Z",
      objects: [{
        objectId: "plc:0:partial_durability_probe",
        kind: "placeable",
        templateId: "plc_flrlever1",
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
        placeableMetadata: {
          hardness: 0,
          fortitudeSave: 256,
          reflexSave: 1.5,
          willSave: "9"
        }
      }]
    };

    const placeable = mapBackendAreaToScene(backendArea, () => 1770000005556).objects[0]!;

    expect(placeable.source?.placeableDurabilitySaveBytes).toEqual({ hardness: 0 });
    expect(placeable.placeableProperties).toMatchObject({ hardness: 0 });
    expect(placeable.placeableProperties).not.toHaveProperty("fortitudeSave");
    expect(placeable.placeableProperties).not.toHaveProperty("reflexSave");
    expect(placeable.placeableProperties).not.toHaveProperty("willSave");

    const invalidOnlyArea: AreaApiDetail = {
      ...backendArea,
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: {
          hardness: -1,
          fortitudeSave: 256,
          reflexSave: 1.5,
          willSave: "9"
        }
      }]
    };
    const invalidOnlyPlaceable = mapBackendAreaToScene(
      invalidOnlyArea,
      () => 1770000005557
    ).objects[0]!;
    expect(invalidOnlyPlaceable.source).not.toHaveProperty(
      "placeableDurabilitySaveBytes"
    );
    expect(invalidOnlyPlaceable.placeableProperties).not.toHaveProperty("hardness");
  });

  it("maps only one complete exact Placeable HP / CurrentHP pair into immutable provenance and HP target", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_hit_points",
      name: "Placeable Hit Points",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_hit_points",
        cacheKey: "atlas_placeable_hit_points:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 4,
        doors: 1,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 5
      },
      updatedAt: "2026-08-18T12:00:00.000Z",
      objects: [
        {
          objectId: "plc:0:hp_valid",
          kind: "placeable",
          templateId: "plc_chest",
          x: 1, y: 2, z: 0, bearing: 0,
          placeableMetadata: { hitPoints: 15, currentHitPoints: 45 }
        },
        {
          objectId: "plc:1:hp_missing_current",
          kind: "placeable",
          templateId: "plc_chest",
          x: 2, y: 2, z: 0, bearing: 0,
          placeableMetadata: { hitPoints: 15 }
        },
        {
          objectId: "plc:2:hp_zero",
          kind: "placeable",
          templateId: "plc_chest",
          x: 3, y: 2, z: 0, bearing: 0,
          placeableMetadata: { hitPoints: 0, currentHitPoints: 1 }
        },
        {
          objectId: "plc:3:hp_wrong_type",
          kind: "placeable",
          templateId: "plc_chest",
          x: 4, y: 2, z: 0, bearing: 0,
          placeableMetadata: { hitPoints: 15, currentHitPoints: "45" }
        },
        {
          objectId: "door:0:hp_cross_family",
          kind: "door",
          templateId: "nw_door_ttr_11",
          x: 5, y: 2, z: 0, bearing: 0,
          placeableMetadata: { hitPoints: 15, currentHitPoints: 45 }
        }
      ]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000005558);
    const valid = scene.objects[0]!;
    expect(valid.source?.placeableHitPointState).toEqual({
      hitPoints: 15,
      currentHitPoints: 45
    });
    expect(valid.placeableProperties).toHaveProperty("hitPoints", 15);
    expect(valid.source?.placeableHitPointState).not.toBe(
      backendArea.objects[0]?.placeableMetadata
    );
    for (const object of scene.objects.slice(1)) {
      expect(object.source).not.toHaveProperty("placeableHitPointState");
      expect(object.placeableProperties ?? {}).not.toHaveProperty("hitPoints");
    }
  });

  it("maps exact empty Conversation and native Interruptable through immutable provenance and inverse targets", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_conversation_interruptable",
      name: "Placeable Conversation Interruptable",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_conversation_interruptable",
        cacheKey: "atlas_placeable_conversation_interruptable:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 1,
        doors: 1,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 2
      },
      updatedAt: "2026-08-17T13:00:00.000Z",
      objects: [
        {
          objectId: "plc:0:conversation_probe",
          kind: "placeable",
          templateId: "plc_watertrough",
          x: 1,
          y: 2,
          z: 0,
          bearing: 0,
          placeableMetadata: { conversation: "", interruptable: 0 }
        },
        {
          objectId: "door:0:conversation_cross_family",
          kind: "door",
          templateId: "nw_door_ttr_11",
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
          placeableMetadata: { conversation: "door_conv", interruptable: 1 }
        }
      ]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000006666);
    const placeable = scene.objects[0]!;

    expect(placeable.source).toMatchObject({
      placeableConversation: "",
      placeableInterruptable: 0
    });
    expect(placeable.placeableProperties?.advancedSettings).toMatchObject({
      conversation: "",
      noInterrupt: true
    });
    expect(scene.objects[1]?.source).not.toHaveProperty("placeableConversation");
    expect(scene.objects[1]?.source).not.toHaveProperty("placeableInterruptable");

    const interruptableOneArea: AreaApiDetail = {
      ...backendArea,
      composition: { ...backendArea.composition, doors: 0, total: 1 },
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: { conversation: "valid_conv_01", interruptable: 1 }
      }]
    };
    const interruptableOne = mapBackendAreaToScene(
      interruptableOneArea,
      () => 1770000006667
    ).objects[0]!;
    expect(interruptableOne.source).toMatchObject({
      placeableConversation: "valid_conv_01",
      placeableInterruptable: 1
    });
    expect(interruptableOne.placeableProperties?.advancedSettings).toMatchObject({
      conversation: "valid_conv_01",
      noInterrupt: false
    });

    const interruptableOnlyArea: AreaApiDetail = {
      ...backendArea,
      composition: { ...backendArea.composition, doors: 0, total: 1 },
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: { interruptable: 1 }
      }]
    };
    const interruptableOnly = mapBackendAreaToScene(
      interruptableOnlyArea,
      () => 1770000006670
    ).objects[0]!;
    expect(interruptableOnly.source).not.toHaveProperty("placeableConversation");
    expect(interruptableOnly.source?.placeableInterruptable).toBe(1);
    expect(interruptableOnly.placeableProperties?.advancedSettings).not.toHaveProperty(
      "conversation"
    );
    expect(interruptableOnly.placeableProperties?.advancedSettings?.noInterrupt).toBe(false);
  });

  it("rejects invalid Conversation/Interruptable metadata and never invents absent targets", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_invalid_conversation_interruptable",
      name: "Invalid Placeable Conversation Interruptable",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_invalid_conversation_interruptable",
        cacheKey: "atlas_placeable_invalid_conversation_interruptable:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-08-17T13:00:00.000Z",
      objects: [{
        objectId: "plc:0:invalid_conversation_probe",
        kind: "placeable",
        templateId: "plc_watertrough",
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
        placeableMetadata: { conversation: "bad-conversation", interruptable: 2 }
      }]
    };

    const invalid = mapBackendAreaToScene(backendArea, () => 1770000006668).objects[0]!;
    expect(invalid.source).not.toHaveProperty("placeableConversation");
    expect(invalid.source).not.toHaveProperty("placeableInterruptable");
    expect(invalid.placeableProperties?.advancedSettings).toBeUndefined();

    const conversationOnlyArea: AreaApiDetail = {
      ...backendArea,
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: { conversation: "valid_conv", interruptable: "1" }
      }]
    };
    const conversationOnly = mapBackendAreaToScene(
      conversationOnlyArea,
      () => 1770000006669
    ).objects[0]!;
    expect(conversationOnly.source?.placeableConversation).toBe("valid_conv");
    expect(conversationOnly.source).not.toHaveProperty("placeableInterruptable");
    expect(conversationOnly.placeableProperties?.advancedSettings).toMatchObject({
      conversation: "valid_conv"
    });
    expect(conversationOnly.placeableProperties?.advancedSettings).not.toHaveProperty(
      "noInterrupt"
    );
    expect(conversationOnly.placeableProperties?.advancedSettings).not.toHaveProperty(
      "initialState"
    );
  });

  it("maps exact existing Placeable trap Bytes into immutable provenance and editable targets", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_trap_bytes",
      name: "Placeable Trap Bytes",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_trap_bytes",
        cacheKey: "atlas_placeable_trap_bytes:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 1,
        doors: 1,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 2
      },
      updatedAt: "2026-08-17T14:00:00.000Z",
      objects: [
        {
          objectId: "plc:0:trap_probe",
          kind: "placeable",
          templateId: "plc_watertrough",
          x: 1,
          y: 2,
          z: 0,
          bearing: 0,
          placeableMetadata: {
            trapFlag: 0,
            trapDetectable: 1,
            trapDisarmable: 0,
            trapOneShot: 1,
            detectDc: 0,
            disarmDc: 255
          }
        },
        {
          objectId: "door:0:trap_cross_family",
          kind: "door",
          templateId: "nw_door_ttr_11",
          x: 0,
          y: 0,
          z: 0,
          bearing: 0,
          placeableMetadata: { trapFlag: 1, detectDc: 12 }
        }
      ]
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000007777);
    expect(scene.objects[0]?.source?.placeableTrapSettings).toEqual({
      isTrapped: false,
      detectable: true,
      disarmable: false,
      oneShot: true,
      detectionDc: 0,
      disarmDc: 255
    });
    expect(scene.objects[0]?.placeableProperties?.trapSettings).toMatchObject({
      isTrapped: false,
      detectable: true,
      disarmable: false,
      oneShot: true,
      detectionDc: 0,
      disarmDc: 255
    });
    expect(scene.objects[1]?.source).not.toHaveProperty("placeableTrapSettings");
    expect(scene.objects[1]?.placeableProperties).toBeUndefined();
  });

  it("keeps trap Byte mapping independently presence-sensitive and rejects invalid metadata", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_partial_trap_bytes",
      name: "Partial Placeable Trap Bytes",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_partial_trap_bytes",
        cacheKey: "atlas_placeable_partial_trap_bytes:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-08-17T14:00:00.000Z",
      objects: [{
        objectId: "plc:0:partial_trap_probe",
        kind: "placeable",
        templateId: "plc_watertrough",
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
        placeableMetadata: {
          trapFlag: 0,
          trapDetectable: 2,
          trapDisarmable: false,
          trapOneShot: "1",
          detectDc: 17,
          disarmDc: 256
        }
      }]
    };

    const placeable = mapBackendAreaToScene(backendArea, () => 1770000007778).objects[0]!;
    expect(placeable.source?.placeableTrapSettings).toEqual({
      isTrapped: false,
      detectionDc: 17
    });
    expect(placeable.placeableProperties?.trapSettings).toMatchObject({
      isTrapped: false,
      detectionDc: 17
    });
    for (const field of ["detectable", "disarmable", "oneShot", "disarmDc"]) {
      expect(placeable.placeableProperties?.trapSettings).not.toHaveProperty(field);
    }

    const invalidOnly = mapBackendAreaToScene({
      ...backendArea,
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: { trapFlag: true, detectDc: -1 }
      }]
    }, () => 1770000007779).objects[0]!;
    expect(invalidOnly.source).not.toHaveProperty("placeableTrapSettings");
    expect(invalidOnly.placeableProperties?.trapSettings).toBeUndefined();

    const template = createPlaceableTemplateObject();
    template.resRef = "plc_watertrough";
    template.placeableProperties = {
      plot: false,
      useable: true,
      hasInventory: false,
      trapSettings: {
        isTrapped: true,
        trapType: "Template Trap Type",
        detectionDc: 44,
        disarmDc: 55,
        oneShot: false,
        detectable: false,
        disarmable: true,
        onDisarmScript: "template_disarm",
        onTrapTriggeredScript: "template_trigger",
        setDc: 8,
        detectDcModWhenSetByRogue: 9,
        disarmDcModWhenSetByRogue: 10
      }
    };
    const withTemplate = mapBackendAreaToScene({
      ...backendArea,
      objects: [{
        ...backendArea.objects[0]!,
        placeableMetadata: { trapFlag: 0 }
      }]
    }, () => 1770000007780, { objectTemplateObjects: [template] }).objects[0]!;
    expect(withTemplate.placeableProperties?.trapSettings).toMatchObject({
      isTrapped: false,
      detectable: false,
      disarmable: true,
      detectionDc: 44,
      trapType: "Template Trap Type"
    });
  });

  it("maps exact existing Placeable AnimationState into immutable provenance and frozen target token", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_animation_state",
      name: "Placeable Animation State",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_animation_state",
        cacheKey: "atlas_placeable_animation_state:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 3,
        doors: 1,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 4
      },
      updatedAt: "2026-08-17T15:00:00.000Z",
      objects: [0, 1, 2].map((animationState) => ({
        objectId: `plc:${animationState}:animation_probe`,
        kind: "placeable" as const,
        templateId: "plc_watertrough",
        x: animationState,
        y: 0,
        z: 0,
        bearing: 0,
        placeableMetadata: { animationState }
      })).concat([{
        objectId: "door:0:animation_cross_family",
        kind: "door" as const,
        templateId: "nw_door_ttr_11",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        placeableMetadata: { animationState: 1 }
      }])
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000008888);
    expect(scene.objects.slice(0, 3).map((object) => ({
      source: object.source?.placeableAnimationState,
      target: object.placeableProperties?.advancedSettings?.initialState,
      advanced: object.placeableProperties?.advancedSettings
    }))).toStrictEqual([
      { source: 0, target: "Closed", advanced: { initialState: "Closed" } },
      { source: 1, target: "Opened 1", advanced: { initialState: "Opened 1" } },
      { source: 2, target: "Opened 2", advanced: { initialState: "Opened 2" } }
    ]);
    expect(scene.objects[3]?.source).not.toHaveProperty("placeableAnimationState");
    expect(scene.objects[3]?.placeableProperties).toBeUndefined();
  });

  it("rejects invalid AnimationState without materializing any Advanced target", () => {
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_invalid_animation_state",
      name: "Invalid Placeable Animation State",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_invalid_animation_state",
        cacheKey: "atlas_placeable_invalid_animation_state:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-08-17T15:00:00.000Z",
      objects: [{
        objectId: "plc:0:invalid_animation_probe",
        kind: "placeable",
        templateId: "plc_watertrough",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        placeableMetadata: { animationState: "0" }
      }]
    };

    for (const invalid of ["0", -1, 3, 1.5, false]) {
      const object = mapBackendAreaToScene({
        ...backendArea,
        objects: [{
          ...backendArea.objects[0]!,
          placeableMetadata: { animationState: invalid }
        }]
      }, () => 1770000008889).objects[0]!;
      expect(object.source).not.toHaveProperty("placeableAnimationState");
      expect(object.placeableProperties?.advancedSettings).toBeUndefined();
    }
  });

  it("maps present exact editor Comments including empty without changing code units", () => {
    const exactComments = ["", "  Water\r\ne\u0301 🧪  ", "x".repeat(4096)];
    const backendArea: AreaApiDetail = {
      areaId: "area_placeable_editor_comments",
      name: "Placeable Editor Comments",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_editor_comments",
        cacheKey: "atlas_placeable_editor_comments:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 3,
        doors: 1,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 4
      },
      updatedAt: "2026-08-17T16:00:00.000Z",
      objects: exactComments.map((editorComment, index) => ({
        objectId: `plc:${index}:comment_probe`,
        kind: "placeable" as const,
        templateId: "plc_watertrough",
        x: index,
        y: 0,
        z: 0,
        bearing: 0,
        placeableMetadata: { editorComment }
      })).concat([{
        objectId: "door:0:comment_cross_family",
        kind: "door" as const,
        templateId: "nw_door_ttr_11",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        placeableMetadata: { editorComment: "door comment" }
      }])
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000009990);
    expect(scene.objects.slice(0, 3).map((object) => ({
      source: object.source?.placeableEditorComment,
      target: object.placeableProperties?.comments
    }))).toStrictEqual(exactComments.map((comment) => ({
      source: comment,
      target: comment
    })));
    expect(scene.objects[3]?.source).not.toHaveProperty("placeableEditorComment");
    expect(scene.objects[3]?.placeableProperties).toBeUndefined();
  });

  it("rejects invalid editor Comments without materializing source or target", () => {
    const baseArea: AreaApiDetail = {
      areaId: "area_placeable_invalid_editor_comments",
      name: "Invalid Placeable Editor Comments",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_invalid_editor_comments",
        cacheKey: "atlas_placeable_invalid_editor_comments:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-08-17T16:00:00.000Z",
      objects: [{
        objectId: "plc:0:invalid_comment_probe",
        kind: "placeable",
        templateId: "plc_watertrough",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        placeableMetadata: {}
      }]
    };

    for (const invalid of ["x".repeat(4097), "bad\u0000value", 7, false]) {
      const object = mapBackendAreaToScene({
        ...baseArea,
        objects: [{
          ...baseArea.objects[0]!,
          placeableMetadata: { editorComment: invalid }
        }]
      }, () => 1770000009991).objects[0]!;
      expect(object.source).not.toHaveProperty("placeableEditorComment");
      expect(object.placeableProperties).not.toHaveProperty("comments");
    }
  });

  it("maps exact Creature editor Comments from paired GIC provenance", () => {
    const exactComments = ["", "  Guard\r\ne\u0301  ", "x".repeat(4096)];
    const backendArea: AreaApiDetail = {
      areaId: "area_creature_editor_comments",
      name: "Creature Editor Comments",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_creature_editor_comments",
        cacheKey: "atlas_creature_editor_comments:1x1",
        strategy: "blob-cache",
      },
      composition: {
        placeables: 0,
        doors: 0,
        creatures: 3,
        items: 0,
        sounds: 0,
        total: 3,
      },
      updatedAt: "2026-08-28T22:00:00.000Z",
      objects: exactComments.map((editorComment, index) => ({
        objectId: `cre:${index}:comment_probe`,
        sourceIndex: index,
        kind: "creature" as const,
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        x: index,
        y: 0,
        z: 0,
        bearing: 0,
        creatureMetadata: { firstName: "Chicken", editorComment },
      })),
    };

    const scene = mapBackendAreaToScene(backendArea, () => 1770000010000);
    expect(scene.objects.map((object) => ({
      source: object.source?.creatureEditorComment,
      target: object.creatureProperties?.comments,
    }))).toStrictEqual(exactComments.map((comment) => ({
      source: comment,
      target: comment,
    })));
  });

  it("does not admit invalid Creature editor Comment provenance", () => {
    const baseArea: AreaApiDetail = {
      areaId: "area_creature_invalid_editor_comment",
      name: "Invalid Creature Editor Comment",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_creature_invalid_editor_comment",
        cacheKey: "atlas_creature_invalid_editor_comment:1x1",
        strategy: "blob-cache",
      },
      composition: {
        placeables: 0,
        doors: 0,
        creatures: 1,
        items: 0,
        sounds: 0,
        total: 1,
      },
      updatedAt: "2026-08-28T22:00:00.000Z",
      objects: [{
        objectId: "cre:0:invalid_comment",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        creatureMetadata: { firstName: "Chicken" },
      }],
    };

    for (const invalid of ["x".repeat(4097), "bad\u0000value", 7, false]) {
      const object = mapBackendAreaToScene({
        ...baseArea,
        objects: [{
          ...baseArea.objects[0]!,
          creatureMetadata: { firstName: "Chicken", editorComment: invalid },
        }],
      }, () => 1770000010001).objects[0]!;
      expect(object.source).not.toHaveProperty("creatureEditorComment");
      expect(object.creatureProperties?.comments).not.toBe(invalid);
    }
  });

  it("maps only exact Store editor Comments into detached provenance and target state", () => {
    const exactComments = ["", "  Storekeeper\r\ne\u0301  ", "x".repeat(4096)];
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 3, triggers: 0, waypoints: 0, total: 3,
      },
      objects: exactComments.map((editorComment, index) => ({
        objectId: `sto:${index}:comment_probe`,
        sourceIndex: index,
        kind: "store" as const,
        templateId: "x2_merc_dye",
        resRef: "x2_merc_dye",
        x: index,
        y: 0,
        z: 0,
        bearing: 0,
        storeMetadata: { editorComment },
      })),
    });

    const scene = mapBackendAreaToScene(area, () => 1770000010002);

    expect(scene.objects.map((object) => ({
      source: object.source?.storeEditorComment,
      target: object.storeProperties?.comments,
    }))).toStrictEqual(exactComments.map((comment) => ({
      source: comment,
      target: comment,
    })));
    expect(scene.objects[0]?.storeProperties).not.toBe(
      scene.objects[0]?.source,
    );
  });

  it("maps an exact Store commerce vector into detached immutable provenance and target", () => {
    const commerce = {
      markUp: 100,
      markDown: 65,
      blackMarket: false,
      blackMarketMarkDown: 25,
      identifyPrice: 100,
      maxBuyPrice: -1,
      storeGold: -1,
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 1, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sto:0:commerce_probe",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        resRef: "x2_merc_dye",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        storeMetadata: { commerce },
      }],
    });

    const object = mapBackendAreaToScene(area, () => 1770000010003).objects[0]!;

    expect(object.source?.storeCommerce).toStrictEqual(commerce);
    expect(object.storeProperties).toStrictEqual({ comments: "", commerce });
    expect(object.source?.storeCommerce).not.toBe(commerce);
    expect(object.storeProperties?.commerce).not.toBe(commerce);
    expect(object.source?.storeCommerce).not.toBe(object.storeProperties?.commerce);
  });

  it("maps an exact Store script-ResRef pair into detached immutable provenance and target", () => {
    const scriptResRefs = {
      onOpenStore: "store_open",
      onStoreClosed: "store_closed",
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 1, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sto:0:scripts_probe",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        resRef: "x2_merc_dye",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        storeMetadata: { scriptResRefs },
      }],
    });

    const object = mapBackendAreaToScene(area, () => 1770000010004).objects[0]!;

    expect(object.source?.storeScriptResRefs).toStrictEqual(scriptResRefs);
    expect(object.storeProperties).toStrictEqual({ comments: "", scriptResRefs });
    expect(object.source?.storeScriptResRefs).not.toBe(scriptResRefs);
    expect(object.storeProperties?.scriptResRefs).not.toBe(scriptResRefs);
    expect(object.source?.storeScriptResRefs).not.toBe(object.storeProperties?.scriptResRefs);
  });

  it("maps an exact retained Store VarTable into detached immutable provenance and target", () => {
    const variables = {
      expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int" as const, value: -4 },
        { sourceIndex: 1, name: "Label", type: "string" as const, value: "ready" },
      ],
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 1, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sto:0:variables_probe",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        resRef: "x2_merc_dye",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        storeMetadata: { variables },
      }],
    });

    const object = mapBackendAreaToScene(area, () => 1770000010005).objects[0]!;
    const target = variables.expectedEntries.map(({ sourceIndex: _, ...entry }) => entry);

    expect(object.source?.storeVariables).toStrictEqual(variables);
    expect(object.storeProperties).toStrictEqual({ comments: "", variables: target });
    expect(object.source?.storeVariables?.expectedEntries[0])
      .not.toBe(variables.expectedEntries[0]);
    expect(object.storeProperties?.variables?.[0])
      .not.toBe(object.source?.storeVariables?.expectedEntries[0]);
  });

  it("maps catalog-bound Store restrictions into detached provenance and ordered targets", () => {
    const itemBaseItemCatalog = {
      descriptor: {
        resourceName: "baseitems.2da" as const,
        sourceObjectKey: "modules/current/baseitems.2da",
        sourceLayer: "module" as const,
        sha256: "e".repeat(64),
        sizeBytes: 4096,
        rowCount: 4,
      },
      rows: Array.from({ length: 4 }, (_, rowIndex) => ({
        rowIndex,
        modelType: 0 as const,
        displayName: `Base item ${rowIndex}`,
      })),
    };
    const restrictions = {
      expectedValue: {
        willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
        willOnlyBuy: { present: false, baseItemIds: [] },
      },
      tableSha256: "e".repeat(64),
      tableRowCount: 4,
    };
    const area = minimalAreaDetail({
      itemBaseItemCatalog,
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 1, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sto:0:restrictions_probe",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        resRef: "x2_merc_dye",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        storeMetadata: { restrictions },
      }],
    });

    const object = mapBackendAreaToScene(area, () => 1770000010006).objects[0]!;

    expect(object.source?.storeRestrictions).toStrictEqual(restrictions);
    expect(object.storeProperties?.restrictions).toStrictEqual({
      willNotBuy: [2, 1, 2],
      willOnlyBuy: [],
    });
    expect(object.source?.storeRestrictions).not.toBe(restrictions);
    expect(object.storeProperties?.restrictions?.willNotBuy)
      .not.toBe(object.source?.storeRestrictions?.expectedValue.willNotBuy.baseItemIds);
  });

  it("keeps Store restrictions preserve-only when current baseitems.2da identity is stale", () => {
    const area = minimalAreaDetail({
      itemBaseItemCatalog: {
        descriptor: {
          resourceName: "baseitems.2da",
          sourceObjectKey: "modules/current/baseitems.2da",
          sourceLayer: "module",
          sha256: "f".repeat(64),
          sizeBytes: 4096,
          rowCount: 1,
        },
        rows: [{ rowIndex: 0, modelType: 0, displayName: "Base item 0" }],
      },
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 1, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sto:0:restrictions_stale",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        storeMetadata: {
          restrictions: {
            expectedValue: {
              willNotBuy: { present: false, baseItemIds: [] },
              willOnlyBuy: { present: false, baseItemIds: [] },
            },
            tableSha256: "e".repeat(64),
            tableRowCount: 1,
          },
        },
      }],
    });

    const object = mapBackendAreaToScene(area).objects[0]!;
    expect(object.source).not.toHaveProperty("storeRestrictions");
    expect(object.storeProperties).toBeUndefined();
  });

  it("maps retained Store inventory into detached provenance and five ordered targets", () => {
    const itemBaseItemCatalog = {
      descriptor: {
        resourceName: "baseitems.2da" as const,
        sourceObjectKey: "modules/current/baseitems.2da",
        sourceLayer: "module" as const,
        sha256: "e".repeat(64),
        sizeBytes: 4096,
        rowCount: 2,
      },
      rows: [0, 1].map((rowIndex) => ({
        rowIndex,
        modelType: 0 as const,
        displayName: `Base item ${rowIndex}`,
        invSlotWidth: 1,
        invSlotHeight: 1,
      })),
    };
    const inventory = {
      expectedBuckets: [
        {
          bucketTypeId: 0 as const,
          entries: [
            {
              sourceIndex: 0, resRef: "itm_a", baseItemId: 0,
              slotWidth: 1, slotHeight: 1, x: 0, y: 0, infinite: true,
            },
            {
              sourceIndex: 1, resRef: "itm_b", baseItemId: 1,
              slotWidth: 1, slotHeight: 1, x: 1, y: 0, infinite: false,
            },
          ],
        },
        { bucketTypeId: 4 as const, entries: [] },
        { bucketTypeId: 2 as const, entries: [] },
        { bucketTypeId: 3 as const, entries: [] },
        { bucketTypeId: 1 as const, entries: [] },
      ],
      tableSha256: "e".repeat(64),
      tableRowCount: 2,
    };
    const area = minimalAreaDetail({
      itemBaseItemCatalog,
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 1, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sto:0:inventory_probe",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        resRef: "x2_merc_dye",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        storeMetadata: { inventory },
      }],
    });

    const object = mapBackendAreaToScene(area, () => 1770000010007).objects[0]!;

    expect(object.source?.storeInventory).toStrictEqual(inventory);
    expect(object.storeProperties?.inventoryBuckets).toStrictEqual([
      {
        bucketTypeId: 0,
        entries: [
          { sourceIndex: 0, resRef: "itm_a", baseItemId: 0, infinite: true },
          { sourceIndex: 1, resRef: "itm_b", baseItemId: 1, infinite: false },
        ],
      },
      { bucketTypeId: 4, entries: [] },
      { bucketTypeId: 2, entries: [] },
      { bucketTypeId: 3, entries: [] },
      { bucketTypeId: 1, entries: [] },
    ]);
    expect(object.source?.storeInventory).not.toBe(inventory);
    expect(object.storeProperties?.inventoryBuckets)
      .not.toBe(object.source?.storeInventory?.expectedBuckets);
  });

  it("keeps retained Store inventory preserve-only when a slot dimension is stale", () => {
    const area = minimalAreaDetail({
      itemBaseItemCatalog: {
        descriptor: {
          resourceName: "baseitems.2da",
          sourceObjectKey: "modules/current/baseitems.2da",
          sourceLayer: "module",
          sha256: "e".repeat(64),
          sizeBytes: 4096,
          rowCount: 1,
        },
        rows: [{
          rowIndex: 0, modelType: 0, displayName: "Base item 0",
          invSlotWidth: 2, invSlotHeight: 1,
        }],
      },
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 1, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sto:0:inventory_stale",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
        storeMetadata: {
          inventory: {
            expectedBuckets: [
              {
                bucketTypeId: 0,
                entries: [{
                  sourceIndex: 0, resRef: "itm_a", baseItemId: 0,
                  slotWidth: 1, slotHeight: 1, x: 0, y: 0, infinite: false,
                }],
              },
              { bucketTypeId: 4, entries: [] },
              { bucketTypeId: 2, entries: [] },
              { bucketTypeId: 3, entries: [] },
              { bucketTypeId: 1, entries: [] },
            ],
            tableSha256: "e".repeat(64),
            tableRowCount: 1,
          },
        },
      }],
    });

    const object = mapBackendAreaToScene(area).objects[0]!;
    expect(object.source).not.toHaveProperty("storeInventory");
    expect(object.storeProperties).toBeUndefined();
  });

  it("does not admit malformed or wrong-family Store editor Comment provenance", () => {
    const base = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 1, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "sto:0:invalid_comment",
        sourceIndex: 0,
        kind: "store",
        templateId: "x2_merc_dye",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }],
    });

    for (const invalid of ["x".repeat(4097), "bad\u0000value", 7, false]) {
      const object = mapBackendAreaToScene({
        ...base,
        objects: [{ ...base.objects[0]!, storeMetadata: { editorComment: invalid } }],
      }).objects[0]!;
      expect(object.source).not.toHaveProperty("storeEditorComment");
      expect(object.storeProperties).toBeUndefined();
    }

    const wrongFamily = mapBackendAreaToScene({
      ...base,
      objects: [{
        ...base.objects[0]!,
        kind: "placeable",
        storeMetadata: { editorComment: "must not cross family" },
      }],
    }).objects[0]!;
    expect(wrongFamily.source).not.toHaveProperty("storeEditorComment");
    expect(wrongFamily.storeProperties).toBeUndefined();
  });

  it("maps only exact Placeable basic-identity storage provenance", () => {
    const baseArea: AreaApiDetail = {
      areaId: "area_placeable_basic_identity",
      name: "Placeable Basic Identity",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_basic_identity",
        cacheKey: "atlas_placeable_basic_identity:1x1",
        strategy: "blob-cache"
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1
      },
      updatedAt: "2026-08-17T16:30:00.000Z",
      objects: [{
        objectId: "plc:0:basic_identity",
        sourceIndex: 0,
        kind: "placeable",
        templateId: "plc_watertrough",
        appearanceType: 104,
        placeableBasicIdentity: {
          tag: { present: true, value: "WaterTrough" },
          appearance: {
            present: true,
            nativeType: "dword",
            value: 104,
            table: {
              resourceName: "placeables.2da",
              sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
              sourceLayer: "hak",
              sha256: "a".repeat(64),
              sizeBytes: 8192,
              rowCount: 16500,
              rowIndex: 104
            }
          }
        },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0
      }]
    };

    const exact = mapBackendAreaToScene(baseArea).objects[0]!;
    expect(exact.source?.sourceIndex).toBe(0);
    expect(exact.tag).toBe("WaterTrough");
    expect(exact.source?.placeableBasicIdentity).toEqual({
      tag: { present: true, value: "WaterTrough" },
      appearance: {
        present: true,
        nativeType: "dword",
        value: 104,
        table: {
          resourceName: "placeables.2da",
          sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
          sourceLayer: "hak",
          sha256: "a".repeat(64),
          sizeBytes: 8192,
          rowCount: 16500,
          rowIndex: 104
        }
      }
    });
    expect(exact.placeableProperties?.appearanceType).toBe(104);

    const malformed = mapBackendAreaToScene({
      ...baseArea,
      objects: [{
        ...baseArea.objects[0]!,
        placeableBasicIdentity: {
          tag: { present: true, value: "WaterTrough", extra: true },
          appearance: { present: true, nativeType: "dword", value: 104 }
        } as never
      }]
    }).objects[0]!;
    expect(malformed.source).not.toHaveProperty("placeableBasicIdentity");
    expect(malformed.placeableProperties).not.toHaveProperty("appearanceType");

    const exactEmptyTag = mapBackendAreaToScene({
      ...baseArea,
      objects: [{
        ...baseArea.objects[0]!,
        placeableBasicIdentity: {
          ...baseArea.objects[0]!.placeableBasicIdentity!,
          tag: { present: true, value: "" }
        }
      }]
    }).objects[0]!;
    expect(exactEmptyTag.tag).toBe("");
    expect(exactEmptyTag.source?.placeableBasicIdentity?.tag).toEqual({
      present: true,
      value: ""
    });

    for (const appearance of [
      {
        present: true,
        nativeType: "byte",
        value: 104
      },
      {
        present: true,
        nativeType: "dword",
        value: 104
      }
    ]) {
      const object = mapBackendAreaToScene({
        ...baseArea,
        objects: [{
          ...baseArea.objects[0]!,
          placeableBasicIdentity: {
            tag: { present: true, value: "WaterTrough" },
            appearance
          } as never
        }]
      }).objects[0]!;
      expect(object.placeableProperties).not.toHaveProperty("appearanceType");
    }

    const wrongFamily = mapBackendAreaToScene({
      ...baseArea,
      objects: [{ ...baseArea.objects[0]!, kind: "door" }]
    }).objects[0]!;
    expect(wrongFamily.source).not.toHaveProperty("placeableBasicIdentity");
    expect(wrongFamily.placeableProperties).toBeUndefined();
    expect(wrongFamily.tag).not.toBe("WaterTrough");

    for (const sourceIndex of [-1, 0.5, "0"] as const) {
      const invalidOrdinal = mapBackendAreaToScene({
        ...baseArea,
        objects: [{ ...baseArea.objects[0]!, sourceIndex: sourceIndex as never }]
      }).objects[0]!;
      expect(invalidOrdinal.source).not.toHaveProperty("sourceIndex");
    }
  });

  it("maps exact Placeable localized-string bytes only into immutable source provenance", () => {
    const localizedStrings = {
      locName: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, textBytesBase64: "Q2hlc3Q=" },
          { languageId: 0, textBytesBase64: "" },
        ],
      },
      description: {
        present: true as const,
        strRef: 0,
        entries: [{ languageId: 0xffff_ffff, textBytesBase64: "gP8=" }],
      },
    };
    const baseArea: AreaApiDetail = {
      areaId: "area_placeable_localized_strings",
      name: "Placeable Localized Strings",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_localized_strings",
        cacheKey: "atlas_placeable_localized_strings:1x1",
        strategy: "blob-cache",
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1,
      },
      updatedAt: "2026-08-19T00:00:00.000Z",
      objects: [{
        objectId: "plc:0:localized_strings",
        sourceIndex: 0,
        kind: "placeable",
        templateId: "plc_chest",
        localizedName: "display-only-name",
        description: "display-only-description",
        placeableLocalizedStrings: localizedStrings,
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }],
    };

    const exact = mapBackendAreaToScene(baseArea).objects[0]!;
    expect(exact.source?.placeableLocalizedStrings).toEqual(localizedStrings);
    expect(exact.source?.placeableLocalizedStrings).not.toBe(localizedStrings);
    expect(exact.source?.placeableLocalizedStrings?.locName).not.toBe(localizedStrings.locName);
    expect(exact.source?.placeableLocalizedStrings?.locName.present &&
      exact.source.placeableLocalizedStrings.locName.entries).not.toBe(localizedStrings.locName.entries);
    expect(exact.placeableProperties).not.toHaveProperty("name");
    expect(exact.placeableProperties).not.toHaveProperty("description");

    const invalid = mapBackendAreaToScene({
      ...baseArea,
      objects: [{
        ...baseArea.objects[0]!,
        placeableLocalizedStrings: {
          ...localizedStrings,
          extra: true,
        } as never,
      }],
    }).objects[0]!;
    expect(invalid.source).not.toHaveProperty("placeableLocalizedStrings");

    const wrongFamily = mapBackendAreaToScene({
      ...baseArea,
      objects: [{ ...baseArea.objects[0]!, kind: "door" }],
    }).objects[0]!;
    expect(wrongFamily.source).not.toHaveProperty("placeableLocalizedStrings");
  });

  it("projects only the bounded inline-English ASCII Placeable strings into editable targets", () => {
    const area: AreaApiDetail = {
      areaId: "area_placeable_editable_strings",
      name: "Placeable Editable Strings",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: {
        atlasId: "atlas_placeable_editable_strings",
        cacheKey: "atlas_placeable_editable_strings:1x1",
        strategy: "blob-cache",
      },
      composition: {
        placeables: 1,
        doors: 0,
        creatures: 0,
        items: 0,
        sounds: 0,
        total: 1,
      },
      updatedAt: "2026-08-19T00:00:00.000Z",
      objects: [{
        objectId: "plc:0:editable_strings",
        sourceIndex: 0,
        kind: "placeable",
        templateId: "plc_chest",
        localizedName: "display fallback",
        description: "display description",
        placeableLocalizedStrings: {
          locName: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "IENoZXN0IA==" }],
          },
          description: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [],
          },
        },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }],
    };

    const mapped = mapBackendAreaToScene(area).objects[0]!;
    expect(mapped.name).toBe(" Chest ");
    expect(mapped.placeableProperties).toHaveProperty("localizedName", " Chest ");
    expect(mapped.placeableProperties).toHaveProperty("description", "");

    const unsupported = mapBackendAreaToScene({
      ...area,
      objects: [{
        ...area.objects[0]!,
        placeableLocalizedStrings: {
          locName: { present: true, strRef: 123, entries: [] },
          description: { present: false },
        },
      }],
    }).objects[0]!;
    expect(unsupported.name).toBe("display fallback");
    expect(unsupported.placeableProperties).not.toHaveProperty("localizedName");
    expect(unsupported.placeableProperties).not.toHaveProperty("description");

    const wrongFamily = mapBackendAreaToScene({
      ...area,
      objects: [{ ...area.objects[0]!, kind: "door" }],
    }).objects[0]!;
    expect(wrongFamily.name).toBe("display fallback");
    expect(wrongFamily.source).not.toHaveProperty("placeableLocalizedStrings");
    expect(wrongFamily.placeableProperties).toBeUndefined();
  });

  it("binds exact TrapType storage to one effective traps.2da catalog without inventing derived fields", () => {
    const area: AreaApiDetail = {
      areaId: "area_trap_type",
      name: "Trap Type",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-19T00:00:00.000Z",
      placeableTrapTypeCatalog: {
        descriptor: {
          resourceName: "traps.2da",
          sourceObjectKey: "modules/current/traps.2da",
          sourceLayer: "module",
          sha256: "d".repeat(64),
          sizeBytes: 2048,
          rowCount: 2,
        },
        rows: [
          { rowIndex: 0, setDc: 10, detectDcMod: 0, disarmDcMod: 3, displayName: "Minor", displaySource: "label" },
          { rowIndex: 1, setDc: 20, detectDcMod: 2, disarmDcMod: 6, displayName: "Deadly", displaySource: "strref" },
        ],
      },
      objects: [{
        objectId: "plc:0:trap",
        sourceIndex: 0,
        kind: "placeable",
        templateId: "plc_chest",
        placeableTrapType: { present: true, nativeType: "byte", value: 1 },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }],
    };

    const scene = mapBackendAreaToScene(area);
    expect(scene.placeableTrapTypeCatalog).toEqual(area.placeableTrapTypeCatalog);
    expect(scene.objects[0]?.source?.placeableTrapType).toEqual({
      expectedValue: 1,
      tableSha256: "d".repeat(64),
      tableRowCount: 2,
    });
    expect(scene.objects[0]?.placeableProperties?.trapSettings).toMatchObject({
      trapTypeRow: 1,
      setDc: 20,
      detectDcModWhenSetByRogue: 2,
      disarmDcModWhenSetByRogue: 6,
    });

    const malformed = mapBackendAreaToScene({
      ...area,
      placeableTrapTypeCatalog: {
        ...area.placeableTrapTypeCatalog!,
        descriptor: { ...area.placeableTrapTypeCatalog!.descriptor, sha256: "D".repeat(64) },
      },
    });
    expect(malformed).not.toHaveProperty("placeableTrapTypeCatalog");
    expect(malformed.objects[0]?.source).not.toHaveProperty("placeableTrapType");
    expect(malformed.objects[0]?.placeableProperties?.trapSettings?.trapTypeRow).toBeUndefined();

    const wrongFamily = mapBackendAreaToScene({
      ...area,
      composition: { ...area.composition, placeables: 0, doors: 1 },
      objects: [{ ...area.objects[0]!, kind: "door" }],
    });
    expect(wrongFamily.objects[0]?.source).not.toHaveProperty("placeableTrapType");
    expect(wrongFamily.objects[0]?.placeableProperties).toBeUndefined();
  });

  it("binds exact BodyBag storage to one effective bodybag.2da catalog as a numeric Advanced row", () => {
    const area: AreaApiDetail = {
      areaId: "area_body_bag",
      name: "Body Bag",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-19T00:00:00.000Z",
      placeableBodyBagCatalog: {
        descriptor: {
          resourceName: "bodybag.2da",
          sourceObjectKey: "modules/current/bodybag.2da",
          sourceLayer: "module",
          sha256: "e".repeat(64),
          sizeBytes: 502,
          rowCount: 2,
        },
        rows: [
          { rowIndex: 0, label: "default", nameStrRef: 6671, displayName: "Default", displaySource: "strref" },
          { rowIndex: 1, label: "Treasure", nameStrRef: 66490, displayName: "Treasure", displaySource: "label" },
        ],
      },
      objects: [{
        objectId: "plc:0:bag",
        sourceIndex: 0,
        kind: "placeable",
        templateId: "plc_chest",
        placeableBodyBag: { present: true, nativeType: "byte", value: 1 },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }],
    };

    const scene = mapBackendAreaToScene(area);
    expect(scene.placeableBodyBagCatalog).toEqual(area.placeableBodyBagCatalog);
    expect(scene.objects[0]?.source?.placeableBodyBag).toEqual({
      expectedValue: 1,
      tableSha256: "e".repeat(64),
      tableRowCount: 2,
    });
    expect(scene.objects[0]?.placeableProperties?.advancedSettings?.treasureModelRow).toBe(1);
    expect(scene.objects[0]?.placeableProperties?.advancedSettings).not.toHaveProperty("treasureModel");

    const malformed = mapBackendAreaToScene({
      ...area,
      placeableBodyBagCatalog: {
        ...area.placeableBodyBagCatalog!,
        descriptor: { ...area.placeableBodyBagCatalog!.descriptor, sha256: "E".repeat(64) },
      },
    });
    expect(malformed).not.toHaveProperty("placeableBodyBagCatalog");
    expect(malformed.objects[0]?.source).not.toHaveProperty("placeableBodyBag");
    expect(malformed.objects[0]?.placeableProperties?.advancedSettings ?? {}).not.toHaveProperty(
      "treasureModelRow",
    );

    const wrongFamily = mapBackendAreaToScene({
      ...area,
      composition: { ...area.composition, placeables: 0, doors: 1 },
      objects: [{ ...area.objects[0]!, kind: "door" }],
    });
    expect(wrongFamily.objects[0]?.source).not.toHaveProperty("placeableBodyBag");
    expect(wrongFamily.objects[0]?.placeableProperties).toBeUndefined();
  });

  it("binds exact canonical PortraitId Word storage to a sparse effective portraits.2da catalog", () => {
    const area: AreaApiDetail = {
      areaId: "area_portrait",
      name: "Portrait",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-19T00:00:00.000Z",
      placeablePortraitCatalog: {
        descriptor: {
          resourceName: "portraits.2da",
          sourceObjectKey: "modules/current/portraits.2da",
          sourceLayer: "module",
          sha256: "a".repeat(64),
          sizeBytes: 4096,
          rowCount: 700,
        },
        rows: [
          { rowIndex: 462, baseResRef: "po_hu_m_01_" },
          { rowIndex: 463, baseResRef: "po_hu_m_02_" },
        ],
      },
      objects: [{
        objectId: "plc:0:portrait",
        sourceIndex: 0,
        kind: "placeable",
        templateId: "plc_chest",
        placeablePortraitId: { present: true, nativeType: "word", value: 462 },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }],
    };

    const scene = mapBackendAreaToScene(area);
    expect(scene.placeablePortraitCatalog).toEqual(area.placeablePortraitCatalog);
    expect(scene.objects[0]?.source?.placeablePortrait).toEqual({
      expectedValue: 462,
      tableSha256: "a".repeat(64),
      tableRowCount: 700,
    });
    expect(scene.objects[0]?.placeableProperties?.advancedSettings).toMatchObject({
      portraitId: 462,
      portraitResRef: "po_hu_m_01_",
    });

    const unsupported = mapBackendAreaToScene({
      ...area,
      objects: [{
        ...area.objects[0]!,
        placeablePortraitId: { present: true, nativeType: "word", value: 464 },
      }],
    });
    expect(unsupported.objects[0]?.source).not.toHaveProperty("placeablePortrait");
    expect(unsupported.objects[0]?.placeableProperties?.advancedSettings ?? {})
      .not.toHaveProperty("portraitId");

    const wrongFamily = mapBackendAreaToScene({
      ...area,
      composition: { ...area.composition, placeables: 0, doors: 1 },
      objects: [{ ...area.objects[0]!, kind: "door" }],
    });
    expect(wrongFamily.objects[0]?.source).not.toHaveProperty("placeablePortrait");
  });

  it("binds exact Faction DWord storage to the physical ordinal in module repute.fac", () => {
    const area: AreaApiDetail = {
      areaId: "area_faction",
      name: "Faction",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-19T00:00:00.000Z",
      placeableFactionCatalog: {
        descriptor: {
          resourceName: "repute.fac",
          sourceObjectKey: "modules/current/repute.fac",
          sha256: "b".repeat(64),
          sizeBytes: 1889,
          factionCount: 3,
        },
        rows: [
          { factionId: 0, name: "PC", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 1, name: "Hostile", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 2, name: "Commoner", parentFactionId: 0xffffffff, isGlobal: true },
        ],
      },
      objects: [{
        objectId: "plc:0:faction",
        sourceIndex: 0,
        kind: "placeable",
        templateId: "plc_chest",
        placeableFaction: { present: true, nativeType: "dword", value: 1 },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }],
    };

    const scene = mapBackendAreaToScene(area);
    expect(scene.placeableFactionCatalog).toEqual(area.placeableFactionCatalog);
    expect(scene.objects[0]?.source?.placeableFaction).toEqual({
      expectedValue: 1,
      catalogSha256: "b".repeat(64),
      catalogFactionCount: 3,
    });
    expect(scene.objects[0]?.placeableProperties?.advancedSettings).toMatchObject({
      factionId: 1,
      belongsToFaction: "Hostile",
    });

    const stale = mapBackendAreaToScene({
      ...area,
      placeableFactionCatalog: {
        ...area.placeableFactionCatalog!,
        descriptor: {
          ...area.placeableFactionCatalog!.descriptor,
          factionCount: 2,
        },
      },
    });
    expect(stale).not.toHaveProperty("placeableFactionCatalog");
    expect(stale.objects[0]?.source).not.toHaveProperty("placeableFaction");
    expect(stale.objects[0]?.placeableProperties?.advancedSettings ?? {})
      .not.toHaveProperty("factionId");

    const wrongFamily = mapBackendAreaToScene({
      ...area,
      composition: { ...area.composition, placeables: 0, doors: 1 },
      objects: [{ ...area.objects[0]!, kind: "door" }],
    });
    expect(wrongFamily.objects[0]?.source).not.toHaveProperty("placeableFaction");
  });

  it("maps an exact Placeable VarTable to immutable provenance and an editable ordered target", () => {
    const expectedEntries = [
      { sourceIndex: 0, name: "Counter", type: "int" as const, value: 1 },
      { sourceIndex: 1, name: "Scale", type: "float" as const, value: 1.5 },
      { sourceIndex: 2, name: "", type: "string" as const, value: "" },
    ];
    const area: AreaApiDetail = {
      areaId: "area_variables",
      name: "Variables",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-19T00:00:00.000Z",
      objects: [{
        objectId: "plc:0:variables",
        kind: "placeable",
        templateId: "plc_chest",
        sourceIndex: 0,
        placeableVariables: { expectedEntries },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }],
    };
    const scene = mapBackendAreaToScene(area);
    expect(scene.objects[0]?.source?.placeableVariables).toEqual({ expectedEntries });
    expect(scene.objects[0]?.source?.placeableVariables?.expectedEntries).not.toBe(expectedEntries);
    expect(scene.objects[0]?.placeableProperties?.variables).toEqual([
      { name: "Counter", type: "int", value: 1 },
      { name: "Scale", type: "float", value: 1.5 },
      { name: "", type: "string", value: "" },
    ]);

    const invalid = mapBackendAreaToScene({
      ...area,
      objects: [{
        ...area.objects[0]!,
        placeableVariables: { expectedEntries: [
          { sourceIndex: 1, name: "x", type: "int", value: 1 },
        ] },
      }],
    });
    expect(invalid.objects[0]?.source).not.toHaveProperty("placeableVariables");
    expect(invalid.objects[0]?.placeableProperties).not.toHaveProperty("variables");

    const wrongFamily = mapBackendAreaToScene({
      ...area,
      objects: [{ ...area.objects[0]!, kind: "door" }],
    });
    expect(wrongFamily.objects[0]?.source).not.toHaveProperty("placeableVariables");
  });

  it("maps an exact Creature VarTable to independent provenance and editable physical order", () => {
    const expectedEntries = [
      { sourceIndex: 0, name: "Counter", type: "int" as const, value: 1 },
      { sourceIndex: 1, name: "Counter", type: "float" as const, value: 1.5 },
      { sourceIndex: 2, name: "", type: "string" as const, value: "" },
    ];
    const area: AreaApiDetail = {
      areaId: "area_creature_variables",
      name: "Creature Variables",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 0, doors: 0, creatures: 1, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-28T00:00:00.000Z",
      objects: [{
        objectId: "cre:0:variables",
        kind: "creature",
        templateId: "nw_guard",
        sourceIndex: 0,
        creatureVariables: { expectedEntries },
        creatureMetadata: { firstName: "Guard", templateResRef: "nw_guard" },
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }],
    };

    const scene = mapBackendAreaToScene(area);
    expect(scene.objects[0]?.source?.creatureVariables).toEqual({ expectedEntries });
    expect(scene.objects[0]?.source?.creatureVariables?.expectedEntries).not.toBe(expectedEntries);
    expect(scene.objects[0]?.creatureProperties?.variables).toEqual([
      { name: "Counter", type: "int", value: 1 },
      { name: "Counter", type: "float", value: 1.5 },
      { name: "", type: "string", value: "" },
    ]);

    const invalid = mapBackendAreaToScene({
      ...area,
      objects: [{ ...area.objects[0]!, creatureVariables: { expectedEntries: [
        { sourceIndex: 1, name: "x", type: "int", value: 1 },
      ] } }],
    });
    expect(invalid.objects[0]?.source).not.toHaveProperty("creatureVariables");
    expect(invalid.objects[0]?.creatureProperties?.variables).toBeUndefined();
  });

  it("maps exact Placeable TemplateResRef to immutable provenance and a separate Advanced target", () => {
    const area: AreaApiDetail = {
      areaId: "area_template_resref",
      name: "Template ResRef",
      biome: "interior",
      width: 1,
      height: 1,
      tags: [],
      benchmark: false,
      previewImageUrl: "",
      textureAtlas: { atlasId: "atlas", cacheKey: "atlas:1x1", strategy: "blob-cache" },
      composition: { placeables: 1, doors: 0, creatures: 0, items: 0, sounds: 0, total: 1 },
      updatedAt: "2026-08-19T00:00:00.000Z",
      objects: [{
        objectId: "plc:0:template",
        sourceIndex: 0,
        kind: "placeable",
        templateId: "renderer_identity",
        resRef: "renderer_identity",
        placeableTemplateResRef: "plc_chest",
        x: 0,
        y: 0,
        z: 0,
        bearing: 0,
      }],
    };

    const [object] = mapBackendAreaToScene(area).objects;
    expect(object?.resRef).toBe("renderer_identity");
    expect(object?.source?.placeableTemplateResRef).toBe("plc_chest");
    expect(object?.placeableProperties?.advancedSettings?.blueprintResRef).toBe("plc_chest");

    const invalid = mapBackendAreaToScene({
      ...area,
      objects: [{ ...area.objects[0]!, placeableTemplateResRef: "PLC_CHEST" }],
    }).objects[0]!;
    expect(invalid.source).not.toHaveProperty("placeableTemplateResRef");
    expect(invalid.placeableProperties?.advancedSettings ?? {})
      .not.toHaveProperty("blueprintResRef");

    const wrongFamily = mapBackendAreaToScene({
      ...area,
      composition: { ...area.composition, placeables: 0, doors: 1 },
      objects: [{ ...area.objects[0]!, kind: "door" }],
    }).objects[0]!;
    expect(wrongFamily.source).not.toHaveProperty("placeableTemplateResRef");
  });

  it("maps exact Door transition storage to immutable source provenance and a separate editable target", () => {
    const storage = { linkedTo: "DESTINATION_TAG", linkedToFlags: 2, loadScreenId: 7 };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 1, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "obj_door_0",
        sourceIndex: 0,
        kind: "door",
        templateId: "nw_door",
        resRef: "nw_door",
        tag: "DOOR",
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
        doorTransition: {
          linkedTarget: "DESTINATION_TAG",
          linkedModule: "",
          linkedTag: "",
          linkedWaypoint: "",
          loadScreen: "",
          flags: {},
          storage,
        },
      }],
    });

    const [door] = mapBackendAreaToScene(area).objects;

    expect(door?.source?.doorTransitionStorage).toEqual(storage);
    expect(door?.doorTransition?.storage).toEqual(storage);
    expect(door?.source?.doorTransitionStorage).not.toBe(storage);
    expect(door?.doorTransition?.storage).not.toBe(storage);
    expect(door?.source?.doorTransitionStorage).not.toBe(door?.doorTransition?.storage);
  });

  it("keeps malformed Door transition storage out of source provenance and the editable target", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 1, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "obj_door_0",
        sourceIndex: 0,
        kind: "door",
        templateId: "nw_door",
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
        doorTransition: {
          linkedTarget: "DESTINATION_TAG",
          linkedModule: "",
          linkedTag: "",
          linkedWaypoint: "",
          loadScreen: "",
          flags: {},
          storage: { linkedTo: "DESTINATION_TAG", linkedToFlags: 2 } as never,
        },
      }],
    });

    const [door] = mapBackendAreaToScene(area).objects;

    expect(door?.source).not.toHaveProperty("doorTransitionStorage");
    expect(door?.doorTransition).not.toHaveProperty("storage");
    expect(door?.doorTransition?.linkedTarget).toBe("DESTINATION_TAG");
  });

  it("maps exact Creature Tag provenance and uses its verbatim value in the scene", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        tag: "LOOSE_DISPLAY_TAG",
        creatureTag: { present: true, value: "  NW_CHICKEN  " },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.tag).toBe("  NW_CHICKEN  ");
    expect(creature?.source?.creatureTag).toEqual({
      present: true,
      value: "  NW_CHICKEN  ",
    });
    expect(creature?.source?.creatureTag).not.toBe(area.objects[0]?.creatureTag);
  });

  it("maps exact Creature Conversation provenance and overrides loose presentation metadata", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureConversation: { present: true, value: "Guard_Dialog" },
        creatureMetadata: { conversation: "loose_dialog" },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureConversation).toEqual({
      present: true,
      value: "Guard_Dialog",
    });
    expect(creature?.source?.creatureConversation).not.toBe(
      area.objects[0]?.creatureConversation,
    );
    expect(creature?.creatureProperties?.conversation).toBe("Guard_Dialog");
  });

  it("maps exact Creature Interruptable provenance through inverse No Interrupt polarity", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureInterruptable: { present: true, value: 0 },
        creatureMetadata: { interruptable: true },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureInterruptable).toEqual({ present: true, value: 0 });
    expect(creature?.source?.creatureInterruptable).not.toBe(
      area.objects[0]?.creatureInterruptable,
    );
    expect(creature?.creatureProperties?.noInterrupt).toBe(true);
  });

  it("retains absent Creature Interruptable provenance without authorizing loose metadata", () => {
    const baseObject = {
      objectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      kind: "creature" as const,
      templateId: "nw_chicken",
      resRef: "nw_chicken",
      creatureMetadata: { interruptable: true },
      x: 4,
      y: 5,
      z: 0,
      bearing: 0,
    };
    const composition = {
      placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
      sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
    };
    const [absent] = mapBackendAreaToScene(minimalAreaDetail({
      composition,
      objects: [{ ...baseObject, creatureInterruptable: { present: false } }],
    })).objects;
    const [malformed] = mapBackendAreaToScene(minimalAreaDetail({
      composition,
      objects: [{
        ...baseObject,
        creatureInterruptable: { present: true, value: 2 } as never,
      }],
    })).objects;

    expect(absent?.source?.creatureInterruptable).toEqual({ present: false });
    expect(absent?.creatureProperties?.noInterrupt).toBe(false);
    expect(malformed?.source).not.toHaveProperty("creatureInterruptable");
    expect(malformed?.creatureProperties?.noInterrupt).toBe(false);
  });

  it("maps exact Creature advanced flag provenance and overrides loose presentation metadata", () => {
    const creatureAdvancedFlags = {
      disarmable: { present: true as const, value: 1 as const },
      plot: { present: true as const, value: 0 as const },
      immortal: { present: true as const, value: 1 as const },
      lootable: { present: true as const, value: 1 as const },
      noPermanentDeath: { present: true as const, value: 0 as const },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureAdvancedFlags,
        creatureMetadata: {
          disarmable: false,
          plot: true,
          isImmortal: false,
          lootable: false,
          noPermDeath: true,
        },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureAdvancedFlags).toEqual(creatureAdvancedFlags);
    expect(creature?.source?.creatureAdvancedFlags).not.toBe(creatureAdvancedFlags);
    expect(creature?.source?.creatureAdvancedFlags?.plot).not.toBe(creatureAdvancedFlags.plot);
    expect(creature?.creatureProperties?.advancedSettings).toMatchObject({
      disarmable: true,
      plot: false,
      immortal: true,
      leavesLootableCorpse: true,
      noPermanentDeath: false,
    });
  });

  it("binds exact Creature BodyBag and canonical DecayTime to numeric death-remains settings", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      placeableBodyBagCatalog: {
        descriptor: {
          resourceName: "bodybag.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/bodybag.2da",
          sourceLayer: "vanilla",
          sha256: "e".repeat(64),
          sizeBytes: 502,
          rowCount: 3,
        },
        rows: [
          { rowIndex: 0, label: "Default", nameStrRef: 1, displayName: "Default", displaySource: "label" },
          { rowIndex: 1, label: "Bag", nameStrRef: 2, displayName: "Bag", displaySource: "label" },
          { rowIndex: 2, label: "Pile", nameStrRef: 3, displayName: "Pile", displaySource: "label" },
        ],
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureAdvancedFlags: {
          disarmable: { present: true, value: 0 },
          plot: { present: true, value: 0 },
          immortal: { present: true, value: 0 },
          lootable: { present: true, value: 1 },
          noPermanentDeath: { present: true, value: 0 },
        },
        creatureBodyBag: { present: true, nativeType: "byte", value: 2 },
        creatureDecayTime: {
          present: true,
          nativeType: "dword",
          valueMilliseconds: 12_000,
        },
        creatureMetadata: { lootable: true },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureBodyBag).toEqual({
      expectedValue: 2,
      tableSha256: "e".repeat(64),
      tableRowCount: 3,
    });
    expect(creature?.source?.creatureDecayTime).toEqual({ expectedMilliseconds: 12_000 });
    expect(creature?.creatureProperties?.advancedSettings).toMatchObject({
      treasureModelRow: 2,
      corpseDecayTimeSeconds: 12,
    });

    const [preserveOnly] = mapBackendAreaToScene({
      ...area,
      objects: [{
        ...area.objects[0]!,
        creatureBodyBag: { present: false },
        creatureDecayTime: {
          present: true,
          nativeType: "dword",
          valueMilliseconds: 12_001,
        },
      }],
    }).objects;
    expect(preserveOnly?.source).not.toHaveProperty("creatureBodyBag");
    expect(preserveOnly?.source).not.toHaveProperty("creatureDecayTime");
    expect(preserveOnly?.creatureProperties?.advancedSettings).not.toHaveProperty(
      "treasureModelRow",
    );
    expect(preserveOnly?.creatureProperties?.advancedSettings).not.toHaveProperty(
      "corpseDecayTimeSeconds",
    );
  });

  it("retains an exact absent Creature advanced flag group and suppresses malformed provenance", () => {
    const baseObject = {
      objectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      kind: "creature" as const,
      templateId: "nw_chicken",
      resRef: "nw_chicken",
      creatureMetadata: { plot: true },
      x: 4,
      y: 5,
      z: 0,
      bearing: 0,
    };
    const composition = {
      placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
      sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
    };
    const absentStorage = {
      disarmable: { present: false as const },
      plot: { present: false as const },
      immortal: { present: false as const },
      lootable: { present: false as const },
      noPermanentDeath: { present: false as const },
    };
    const [absent] = mapBackendAreaToScene(minimalAreaDetail({
      composition,
      objects: [{ ...baseObject, creatureAdvancedFlags: absentStorage }],
    })).objects;
    const [malformed] = mapBackendAreaToScene(minimalAreaDetail({
      composition,
      objects: [{
        ...baseObject,
        creatureAdvancedFlags: { ...absentStorage, plot: { present: true, value: 2 } } as never,
      }],
    })).objects;

    expect(absent?.source?.creatureAdvancedFlags).toEqual(absentStorage);
    expect(absent?.creatureProperties?.advancedSettings?.plot).toBe(true);
    expect(malformed?.source).not.toHaveProperty("creatureAdvancedFlags");
    expect(malformed?.creatureProperties?.advancedSettings?.plot).toBe(true);
  });

  it("maps exact Creature Appearance provenance and overrides loose presentation metadata", () => {
    const creatureAppearance = {
      present: true as const,
      nativeType: "word" as const,
      value: 249,
      table: {
        resourceName: "appearance.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
        sourceLayer: "vanilla" as const,
        sha256: "a".repeat(64),
        sizeBytes: 200_000,
        rowCount: 1_000,
        rowIndex: 249,
      },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        appearanceType: 52,
        creatureAppearance,
        creatureMetadata: { appearanceId: 8810 },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureAppearance).toEqual(creatureAppearance);
    expect(creature?.source?.creatureAppearance).not.toBe(creatureAppearance);
    expect(creature?.source?.creatureAppearance?.present &&
      creature.source.creatureAppearance.table).not.toBe(creatureAppearance.table);
    expect(creature?.creatureProperties?.appearanceType).toBe(249);
    expect(creature?.source?.appearanceType).toBe(52);
  });

  it("maps exact Creature Gender provenance and overrides loose numeric presentation metadata", () => {
    const creatureGender = {
      present: true as const,
      nativeType: "byte" as const,
      value: 4,
      table: {
        resourceName: "gender.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/gender.2da",
        sourceLayer: "vanilla" as const,
        sha256: "c".repeat(64),
        sizeBytes: 250,
        rowCount: 5,
        rowIndex: 4,
      },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureGender,
        creatureMetadata: { gender: 0 },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureGender).toEqual(creatureGender);
    expect(creature?.source?.creatureGender).not.toBe(creatureGender);
    expect(creature?.source?.creatureGender?.present &&
      creature.source.creatureGender.table).not.toBe(creatureGender.table);
    expect(creature?.creatureProperties?.genderId).toBe(4);
  });

  it("maps exact Creature PerceptionRange provenance into advanced settings", () => {
    const creaturePerceptionRange = {
      present: true as const,
      nativeType: "byte" as const,
      value: 11,
      table: {
        resourceName: "ranges.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/ranges.2da",
        sourceLayer: "vanilla" as const,
        sha256: "d".repeat(64),
        sizeBytes: 1220,
        rowCount: 13,
        rowIndex: 11 as const,
      },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creaturePerceptionRange,
        creatureMetadata: { perceptionRange: "invented-loose-value" },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creaturePerceptionRange).toEqual(creaturePerceptionRange);
    expect(creature?.source?.creaturePerceptionRange).not.toBe(creaturePerceptionRange);
    expect(creature?.source?.creaturePerceptionRange?.present &&
      creature.source.creaturePerceptionRange.table).not.toBe(creaturePerceptionRange.table);
    expect(creature?.creatureProperties?.advancedSettings?.perceptionRangeId).toBe(11);
  });

  it("maps exact Creature WalkRate Int provenance into advanced settings", () => {
    const creatureWalkRate = {
      present: true as const,
      nativeType: "int" as const,
      value: 4,
      table: {
        resourceName: "creaturespeed.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/creaturespeed.2da",
        sourceLayer: "vanilla" as const,
        sha256: "e".repeat(64),
        sizeBytes: 4_096,
        rowCount: 9,
        rowIndex: 4,
        twoDaName: "NORM",
      },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureWalkRate,
        creatureMetadata: { walkRate: "invented-loose-value" },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureWalkRate).toEqual(creatureWalkRate);
    expect(creature?.source?.creatureWalkRate).not.toBe(creatureWalkRate);
    expect(creature?.source?.creatureWalkRate?.present &&
      creature.source.creatureWalkRate.table).not.toBe(creatureWalkRate.table);
    expect(creature?.creatureProperties?.advancedSettings?.walkRateId).toBe(4);
    expect(creature?.creatureProperties?.statistics?.movementRate).toBe("4");
  });

  it("maps exact Creature SoundSetFile Word provenance into advanced settings", () => {
    const creatureSoundSetFile = {
      present: true as const,
      nativeType: "word" as const,
      value: 0,
      table: {
        resourceName: "soundset.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundset.2da",
        sourceLayer: "vanilla" as const,
        sha256: "a".repeat(64),
        sizeBytes: 336_678,
        rowCount: 5_100,
        rowIndex: 0,
        resRef: "c_aasimar",
      },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_guard:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_guard",
        resRef: "nw_guard",
        creatureSoundSetFile,
        creatureMetadata: { soundSetFile: 27 },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureSoundSetFile).toEqual(creatureSoundSetFile);
    expect(creature?.source?.creatureSoundSetFile).not.toBe(creatureSoundSetFile);
    expect(creature?.source?.creatureSoundSetFile?.present &&
      creature.source.creatureSoundSetFile.table).not.toBe(creatureSoundSetFile.table);
    expect(creature?.creatureProperties?.advancedSettings?.soundSetFile).toBe(0);
  });

  it("maps exact Creature StartingPackage Byte and ClassList provenance into advanced settings", () => {
    const creatureStartingPackage = {
      present: true as const,
      nativeType: "byte" as const,
      value: 0,
      classIds: [4],
      table: {
        resourceName: "packages.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
        sourceLayer: "vanilla" as const,
        sha256: "c".repeat(64),
        sizeBytes: 30_510,
        rowCount: 132,
        rowIndex: 0,
        classId: 4,
      },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_guard:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_guard",
        resRef: "nw_guard",
        creatureStartingPackage,
        creatureMetadata: { startingPackage: true },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureStartingPackage).toEqual(creatureStartingPackage);
    expect(creature?.source?.creatureStartingPackage).not.toBe(creatureStartingPackage);
    if (creature?.source?.creatureStartingPackage?.present) {
      expect(creature.source.creatureStartingPackage.classIds).not.toBe(
        creatureStartingPackage.classIds,
      );
      expect(creature.source.creatureStartingPackage.table).not.toBe(
        creatureStartingPackage.table,
      );
    }
    expect(creature?.creatureProperties?.advancedSettings?.startingPackageId).toBe(0);
  });

  it("maps exact Creature PortraitId provenance and its detached admitted-row catalog", () => {
    const descriptor = {
      resourceName: "portraits.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
      sourceLayer: "vanilla" as const,
      sha256: "f".repeat(64),
      sizeBytes: 100_000,
      rowCount: 16_001,
    };
    const creaturePortrait = {
      present: true as const,
      nativeType: "word" as const,
      value: 10,
      selectorContext: { genderValue: 0, raceValue: 4 },
      table: { ...descriptor, rowIndex: 10, baseResRef: "po_hm_guard" },
    };
    const creaturePortraitCatalog = {
      descriptor,
      rows: [
        { rowIndex: 10, baseResRef: "po_hm_guard", sex: 0, race: 6, plot: 0 as const },
        { rowIndex: 11, baseResRef: "po_em_guard", sex: 0, race: 1, plot: 0 as const },
      ],
    };
    const area = minimalAreaDetail({
      creaturePortraitCatalog,
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creaturePortrait,
        creatureMetadata: { portraitId: 999, portraitResRef: "loose_value" },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const scene = mapBackendAreaToScene(area);
    const [creature] = scene.objects;

    expect(creature?.source?.creaturePortrait).toEqual(creaturePortrait);
    expect(creature?.source?.creaturePortrait).not.toBe(creaturePortrait);
    expect(creature?.source?.creaturePortrait?.present &&
      creature.source.creaturePortrait.selectorContext).not.toBe(
        creaturePortrait.selectorContext,
      );
    expect(creature?.creatureProperties?.portraitId).toBe(10);
    expect(creature?.creatureProperties?.portraitResRef).toBe("po_hm_guard");
    expect(scene.creaturePortraitCatalog).toEqual(creaturePortraitCatalog);
    expect(scene.creaturePortraitCatalog).not.toBe(creaturePortraitCatalog);
  });

  it("maps exact Creature Phenotype provenance and overrides loose numeric presentation metadata", () => {
    const creaturePhenotype = {
      present: true as const,
      nativeType: "int" as const,
      value: 5,
      table: {
        resourceName: "phenotype.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/phenotype.2da",
        sourceLayer: "vanilla" as const,
        sha256: "d".repeat(64),
        sizeBytes: 337,
        rowCount: 9,
        rowIndex: 5,
      },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creaturePhenotype,
        creatureMetadata: { phenotype: 0 },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creaturePhenotype).toEqual(creaturePhenotype);
    expect(creature?.source?.creaturePhenotype).not.toBe(creaturePhenotype);
    expect(creature?.source?.creaturePhenotype?.present &&
      creature.source.creaturePhenotype.table).not.toBe(creaturePhenotype.table);
    expect(creature?.creatureProperties?.phenotypeId).toBe(5);
  });

  it("maps exact Creature ChallengeRating provenance and overrides loose presentation metadata", () => {
    const creatureChallengeRating = {
      present: true as const,
      nativeType: "float" as const,
      value: 11.5,
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureChallengeRating,
        creatureMetadata: { challengeRating: 99 },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureChallengeRating).toEqual(creatureChallengeRating);
    expect(creature?.source?.creatureChallengeRating).not.toBe(creatureChallengeRating);
    expect(creature?.creatureProperties?.challengeRating).toBe(11.5);
  });

  it("maps exact Creature NaturalAC provenance and overrides loose metadata", () => {
    const creatureNaturalArmorClass = {
      present: true as const,
      nativeType: "byte" as const,
      value: 2,
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureNaturalArmorClass,
        creatureMetadata: { naturalAc: 99 },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureNaturalArmorClass).toEqual(
      creatureNaturalArmorClass,
    );
    expect(creature?.source?.creatureNaturalArmorClass).not.toBe(
      creatureNaturalArmorClass,
    );
    expect(creature?.creatureProperties?.statistics?.naturalArmorClass).toBe(2);
  });

  it("maps exact Creature saving-throw provenance and overrides loose metadata only for present members", () => {
    const creatureSavingThrowBonuses = {
      fortitude: { present: true as const, nativeType: "short" as const, value: 3 },
      reflex: { present: true as const, nativeType: "short" as const, value: 1 },
      will: { present: false as const },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureSavingThrowBonuses,
        creatureMetadata: { fortitudeBonus: 99, reflexBonus: 98, willBonus: 97 },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureSavingThrowBonuses).toEqual(
      creatureSavingThrowBonuses,
    );
    expect(creature?.source?.creatureSavingThrowBonuses).not.toBe(
      creatureSavingThrowBonuses,
    );
    expect(creature?.source?.creatureSavingThrowBonuses?.fortitude)
      .not.toBe(creatureSavingThrowBonuses.fortitude);
    expect(creature?.creatureProperties?.statistics?.saves).toMatchObject({
      fortitudeBonus: 3,
      reflexBonus: 1,
      willBonus: 97,
    });
  });

  it("maps exact Creature alignment provenance and overrides loose metadata only for a complete pair", () => {
    const creatureAlignment = {
      goodEvil: { present: true as const, nativeType: "byte" as const, value: 50 as const },
      lawfulChaotic: { present: true as const, nativeType: "byte" as const, value: 100 as const },
    };
    const area = minimalAreaDetail({
      composition: {
        ...minimalAreaDetail().composition,
        creatures: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureAlignment,
        creatureMetadata: { alignment: "Chaotic Evil" },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureAlignment).toEqual(creatureAlignment);
    expect(creature?.source?.creatureAlignment).not.toBe(creatureAlignment);
    expect(creature?.source?.creatureAlignment?.goodEvil).not.toBe(creatureAlignment.goodEvil);
    expect(creature?.creatureProperties?.alignment).toBe("Lawful Neutral");
  });

  it("maps exact Creature base ability-score provenance and overrides loose metadata only for present members", () => {
    const creatureAbilityScores = {
      strength: { present: true as const, nativeType: "byte" as const, value: 15 },
      dexterity: { present: true as const, nativeType: "byte" as const, value: 12 },
      constitution: { present: true as const, nativeType: "byte" as const, value: 14 },
      intelligence: { present: false as const },
      wisdom: { present: true as const, nativeType: "byte" as const, value: 11 },
      charisma: { present: true as const, nativeType: "byte" as const, value: 8 },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureAbilityScores,
        creatureMetadata: {
          strength: 99,
          dexterity: 99,
          constitution: 99,
          intelligence: 99,
          wisdom: 99,
          charisma: 99,
        },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureAbilityScores).toEqual(creatureAbilityScores);
    expect(creature?.source?.creatureAbilityScores).not.toBe(creatureAbilityScores);
    expect(creature?.source?.creatureAbilityScores?.strength)
      .not.toBe(creatureAbilityScores.strength);
    expect(creature?.creatureProperties?.statistics?.abilityScores).toEqual({
      strength: 15,
      dexterity: 12,
      constitution: 14,
      intelligence: 99,
      wisdom: 11,
      charisma: 8,
    });
  });

  it("maps exact Creature appearance-color provenance and overrides loose metadata only for present members", () => {
    const creatureAppearanceColors = {
      skin: { present: true as const, nativeType: "byte" as const, value: 11 },
      hair: { present: true as const, nativeType: "byte" as const, value: 22 },
      tattoo1: { present: false as const },
      tattoo2: { present: true as const, nativeType: "byte" as const, value: 44 },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureAppearanceColors,
        creatureMetadata: {
          colorSkin: 99,
          colorHair: 99,
          colorTattoo1: 99,
          colorTattoo2: 99,
        },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureAppearanceColors).toEqual(creatureAppearanceColors);
    expect(creature?.source?.creatureAppearanceColors).not.toBe(creatureAppearanceColors);
    expect(creature?.source?.creatureAppearanceColors?.skin)
      .not.toBe(creatureAppearanceColors.skin);
    expect(creature?.creatureProperties?.appearanceSettings?.colors).toEqual({
      skin: "11",
      hair: "22",
      tattoo1: "99",
      tattoo2: "44",
    });
  });

  it("maps exact Creature body-part compatibility provenance into direct and source-only settings", () => {
    const keys = [
      "rightFoot", "leftFoot", "rightShin", "leftShin", "leftThigh", "rightThigh",
      "pelvis", "torso", "belt", "neck", "rightForearm", "leftForearm",
      "rightBicep", "leftBicep", "rightShoulder", "leftShoulder", "rightHand",
      "leftHand", "head",
    ];
    const creatureBodyParts = Object.fromEntries(
      keys.map((key) => [key, { present: false }]),
    ) as Record<string, any>;
    creatureBodyParts.rightFoot = {
      present: true,
      value: 12,
      legacyByte: { present: true, nativeType: "byte", value: 12 },
      wideWord: { present: false },
    };
    creatureBodyParts.torso = {
      present: true,
      value: 4096,
      legacyByte: { present: true, nativeType: "byte", value: 0 },
      wideWord: { present: true, nativeType: "word", value: 4096 },
    };
    creatureBodyParts.rightShoulder = {
      present: true,
      value: 1023,
      legacyByte: { present: false },
      wideWord: { present: true, nativeType: "word", value: 1023 },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureBodyParts: creatureBodyParts as never,
        creatureMetadata: {
          bodyPartRFoot: 99,
          bodyPartLFoot: 98,
          bodyPartTorso: 97,
          bodyPartRShoul: 96,
          bodyPartRobe: 77,
        },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;
    expect(creature?.source?.creatureBodyParts).toEqual(creatureBodyParts);
    expect(creature?.source?.creatureBodyParts).not.toBe(creatureBodyParts);
    expect(creature?.source?.creatureBodyParts?.torso).not.toBe(creatureBodyParts.torso);
    expect(creature?.source?.creatureBodyParts?.torso.present &&
      creature.source.creatureBodyParts.torso.wideWord).not.toBe(creatureBodyParts.torso.wideWord);
    expect(creature?.creatureProperties?.appearanceSettings).toMatchObject({
      partBasedAppearance: true,
      rightFoot: "12",
      leftFoot: "98",
      torso: "4096",
      sourceOnlyParts: {
        rightShoulder: "1023",
        robe: "77",
      },
    });
  });

  it("maps exact Creature appendage provenance over loose metadata and detaches table bindings", () => {
    const wingTable = {
      resourceName: "wingmodel.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/wingmodel.2da",
      sourceLayer: "vanilla" as const,
      sha256: "a".repeat(64),
      sizeBytes: 1_024,
      rowCount: 8,
      rowIndex: 1,
    };
    const creatureAppendages = {
      wings: {
        present: true as const,
        value: 1,
        modernDword: {
          present: true as const,
          nativeType: "dword" as const,
          value: 1,
          table: wingTable,
        },
        legacyByte: { present: true as const, nativeType: "byte" as const, value: 2 },
      },
      tail: {
        present: true as const,
        value: 3,
        modernDword: { present: false as const },
        legacyByte: { present: true as const, nativeType: "byte" as const, value: 3 },
      },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureAppendages,
        creatureMetadata: { wingsNew: 99, tailNew: 98 },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureAppendages).toEqual(creatureAppendages);
    expect(creature?.source?.creatureAppendages).not.toBe(creatureAppendages);
    expect(creature?.source?.creatureAppendages?.wings).not.toBe(creatureAppendages.wings);
    expect(creature?.source?.creatureAppendages?.wings.present &&
      creature.source.creatureAppendages.wings.modernDword.present &&
      creature.source.creatureAppendages.wings.modernDword.table)
      .not.toBe(wingTable);
    expect(creature?.creatureProperties?.appearanceSettings).toMatchObject({
      wings: "1",
      tail: "3",
    });
  });

  it("loads Creature HP from Base HP and native dependencies, preserving a negative bonus", () => {
    const creatureHitPointState = {
      present: true as const,
      hitPoints: { nativeType: "short" as const, value: 20 },
      currentHitPoints: { nativeType: "short" as const, value: 77 },
      maxHitPoints: { nativeType: "short" as const, value: 88 },
      constitution: { nativeType: "byte" as const, value: 4 },
      race: { nativeType: "byte" as const, value: 1 },
      classLevels: [3, 2],
      featRow40Present: false,
      racialTypes: {
        resourceName: "racialtypes.2da" as const,
        sourceObjectKey: "runtime-source/module/racialtypes.2da",
        sourceLayer: "module" as const,
        sha256: "a".repeat(64),
        sizeBytes: 400,
        rowCount: 3,
        rowIndex: 1,
        constitutionAdjust: 0,
      },
    };
    const creatureClassLevelState = {
      present: true as const,
      nativeType: "list" as const,
      structTypeId: 2 as const,
      classNativeType: "int" as const,
      levelNativeType: "short" as const,
      entries: [
        { classId: 4, level: 3, opaqueSiblingFieldCount: 2 },
        { classId: 7, level: 2, opaqueSiblingFieldCount: 1 },
      ],
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        creatureAbilityScores: {
          strength: { present: false },
          dexterity: { present: false },
          constitution: { present: true, nativeType: "byte", value: 4 },
          intelligence: { present: false },
          wisdom: { present: false },
          charisma: { present: false },
        },
        creatureClassLevelState,
        creatureHitPointState,
        creatureMetadata: {
          constitution: 99,
          baseHitPoints: 999,
          hitPointBonuses: 999,
          currentHitPoints: 999,
          maxHitPoints: 999,
        },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureHitPointState).toEqual(creatureHitPointState);
    expect(creature?.source?.creatureHitPointState).not.toBe(creatureHitPointState);
    expect(creature?.source?.creatureClassLevelState).toEqual(creatureClassLevelState);
    expect(creature?.source?.creatureClassLevelState).not.toBe(creatureClassLevelState);
    expect(creature?.creatureProperties?.classEntries).toEqual([
      { classId: 4, className: "Class 4", level: 3 },
      { classId: 7, className: "Class 7", level: 2 },
    ]);
    expect(creature?.creatureProperties?.statistics).toMatchObject({
      abilityScores: { constitution: 4 },
      racialModifiers: { constitution: 0 },
      baseHitPoints: 20,
      hitPointBonuses: -15,
      currentHitPoints: 20,
      maxHitPoints: 5,
    });
  });

  it("binds exact Creature FactionID Word storage to the shared physical repute.fac row", () => {
    const factionCatalog = {
      descriptor: {
        resourceName: "repute.fac" as const,
        sourceObjectKey: "modules/current/repute.fac",
        sha256: "b".repeat(64),
        sizeBytes: 1889,
        factionCount: 3,
      },
      rows: [
        { factionId: 0, name: "PC", parentFactionId: 0xffffffff, isGlobal: true },
        { factionId: 1, name: "Hostile", parentFactionId: 0xffffffff, isGlobal: true },
        { factionId: 2, name: "Commoner", parentFactionId: 0xffffffff, isGlobal: true },
      ],
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      placeableFactionCatalog: factionCatalog,
      objects: [{
        objectId: "creature:0:nw_guard:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_guard",
        resRef: "nw_guard",
        creatureFaction: { present: true, nativeType: "word", value: 1 },
        creatureMetadata: { factionId: 2, firstName: "Guard" },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureFaction).toEqual({
      expectedValue: 1,
      catalogSha256: "b".repeat(64),
      catalogFactionCount: 3,
    });
    expect(creature?.creatureProperties?.advancedSettings).toMatchObject({
      factionId: 1,
      faction: "Hostile",
    });

    const [stale] = mapBackendAreaToScene({
      ...area,
      placeableFactionCatalog: {
        ...factionCatalog,
        descriptor: { ...factionCatalog.descriptor, factionCount: 2 },
      },
    }).objects;
    expect(stale?.source).not.toHaveProperty("creatureFaction");
    expect(stale?.creatureProperties?.advancedSettings ?? {}).not.toHaveProperty("factionId");
  });

  it("maps exact Creature TemplateResRef storage to immutable provenance and an independent Advanced target", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_guard:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "renderer_identity",
        resRef: "renderer_identity",
        creatureTemplateResRef: {
          present: true,
          nativeType: "resref",
          value: "nw_guard",
        },
        creatureMetadata: { templateResRef: "legacy_metadata" },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.resRef).toBe("renderer_identity");
    expect(creature?.source?.creatureTemplateResRef).toEqual({ expectedResRef: "nw_guard" });
    expect(creature?.creatureProperties?.advancedSettings?.blueprintResRef).toBe("nw_guard");

    const [absent] = mapBackendAreaToScene({
      ...area,
      objects: [{ ...area.objects[0]!, creatureTemplateResRef: { present: false } }],
    }).objects;
    expect(absent?.source).not.toHaveProperty("creatureTemplateResRef");
  });

  it("maps exact Creature Subrace/Deity storage to independent immutable provenance and Advanced targets", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_guard:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_guard",
        creatureSpecialIdentityStrings: {
          subrace: { present: true, nativeType: "cexostring", value: "Moon Elf" },
          deity: { present: true, nativeType: "cexostring", value: "" },
        },
        creatureMetadata: { subrace: "loose subrace", deity: "loose deity" },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureSpecialIdentityStrings).toEqual({
      subrace: { expectedValue: "Moon Elf" },
      deity: { expectedValue: "" },
    });
    expect(creature?.creatureProperties?.advancedSettings).toMatchObject({
      subrace: "Moon Elf",
      deity: "",
    });

    const [partlyAbsent] = mapBackendAreaToScene({
      ...area,
      objects: [{
        ...area.objects[0]!,
        creatureSpecialIdentityStrings: {
          subrace: { present: false },
          deity: { present: true, nativeType: "cexostring", value: "Mystra" },
        },
      }],
    }).objects;
    expect(partlyAbsent?.source?.creatureSpecialIdentityStrings).toEqual({
      deity: { expectedValue: "Mystra" },
    });
    expect(partlyAbsent?.creatureProperties?.advancedSettings?.subrace).toBe("loose subrace");
    expect(partlyAbsent?.creatureProperties?.advancedSettings?.deity).toBe("Mystra");
  });

  it("maps present Creature script ResRefs to immutable provenance and exact script-slot targets", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_guard:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_guard",
        creatureScriptResRefs: {
          onHeartbeat: { present: true, nativeType: "resref", value: "NW_C2_DEFAULT1" },
          onPerception: { present: false },
          onSpellCastAt: { present: false },
          onPhysicalAttacked: { present: false },
          onDamaged: { present: false },
          onDisturbed: { present: false },
          onCombatRoundEnd: { present: false },
          onConversation: { present: false },
          onSpawn: { present: true, nativeType: "resref", value: "nw_c2_default9" },
          onRested: { present: false },
          onDeath: { present: true, nativeType: "resref", value: "" },
          onUserDefined: { present: false },
          onBlocked: { present: false },
        },
        creatureMetadata: {
          "script.scriptheartbeat": "loose_hb",
          "script.scriptspawn": "loose_spawn",
          "script.scriptdeath": "loose_death",
          "script.scriptonblocked": "loose_blocked",
        },
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
      }],
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureScriptResRefs).toEqual({
      onHeartbeat: { expectedResRef: "NW_C2_DEFAULT1" },
      onSpawn: { expectedResRef: "nw_c2_default9" },
      onDeath: { expectedResRef: "" },
    });
    expect(creature?.creatureProperties?.scriptSlots).toMatchObject({
      onHeartbeat: "NW_C2_DEFAULT1",
      onSpawn: "nw_c2_default9",
      onDeath: "",
      onBlocked: "loose_blocked",
    });
    expect(Object.isFrozen(creature?.source?.creatureScriptResRefs)).toBe(true);
    expect(Object.isFrozen(creature?.source?.creatureScriptResRefs?.onSpawn)).toBe(true);
  });

  it("retains absent Creature Conversation provenance without authorizing loose metadata", () => {
    const baseObject = {
      objectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      kind: "creature" as const,
      templateId: "nw_chicken",
      resRef: "nw_chicken",
      creatureMetadata: { conversation: "loose_dialog" },
      x: 4,
      y: 5,
      z: 0,
      bearing: 0,
    };
    const composition = {
      placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
      sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
    };
    const [absent] = mapBackendAreaToScene(minimalAreaDetail({
      composition,
      objects: [{ ...baseObject, creatureConversation: { present: false } }],
    })).objects;
    const [malformed] = mapBackendAreaToScene(minimalAreaDetail({
      composition,
      objects: [{
        ...baseObject,
        creatureConversation: { present: true, value: "bad-dialog" } as never,
      }],
    })).objects;

    expect(absent?.source?.creatureConversation).toEqual({ present: false });
    expect(absent?.creatureProperties?.conversation).toBe("loose_dialog");
    expect(malformed?.source).not.toHaveProperty("creatureConversation");
    expect(malformed?.creatureProperties?.conversation).toBe("loose_dialog");
  });

  it("retains canonical absence but suppresses malformed Creature Tag provenance", () => {
    const baseObject = {
      objectId: "creature:0:nw_chicken:source",
      sourceIndex: 0,
      kind: "creature" as const,
      templateId: "nw_chicken",
      resRef: "nw_chicken",
      tag: "LOOSE_DISPLAY_TAG",
      x: 4,
      y: 5,
      z: 0,
      bearing: 0,
    };
    const composition = {
      placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
      sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
    };
    const [absent] = mapBackendAreaToScene(minimalAreaDetail({
      composition,
      objects: [{ ...baseObject, creatureTag: { present: false } }],
    })).objects;
    const [malformed] = mapBackendAreaToScene(minimalAreaDetail({
      composition,
      objects: [{
        ...baseObject,
        creatureTag: { present: true, value: "x".repeat(33) } as never,
      }],
    })).objects;

    expect(absent?.source?.creatureTag).toEqual({ present: false });
    expect(absent?.tag).toBe("LOOSE_DISPLAY_TAG");
    expect(malformed?.source).not.toHaveProperty("creatureTag");
    expect(malformed?.tag).toBe("LOOSE_DISPLAY_TAG");
  });

  it("maps exact Creature ItemList into detached immutable source and editable target arrays", () => {
    const inventoryEntries = [
      {
        sourceIndex: 0,
        resRef: "nw_it_potion",
        x: 3,
        y: 4,
        dropable: true,
        pickpocketable: false
      }
    ];
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:4:nw_chicken:source",
        sourceIndex: 4,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
        creatureMetadata: {
          inventoryItemListCount: 1,
          inventoryItemListEntries: JSON.stringify(inventoryEntries)
        }
      }]
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureInventoryItems).toEqual(inventoryEntries);
    expect(creature?.creatureProperties?.inventoryItems).toEqual(inventoryEntries);
    expect(creature?.source?.creatureInventoryItems).not.toBe(
      creature?.creatureProperties?.inventoryItems
    );
    expect(creature?.source?.creatureInventoryItems?.[0]).not.toBe(
      creature?.creatureProperties?.inventoryItems?.[0]
    );
    expect(creature?.creatureProperties?.inventoryItems?.[0]).not.toHaveProperty("infinite");
  });

  it("maps an absent Creature ItemList as exact empty provenance and overrides template inventory", () => {
    const template = createCreatureTemplateObject();
    template.creatureProperties = {
      ...template.creatureProperties!,
      inventoryItems: [{ resRef: "template_only", x: 9, y: 9, infinite: true }]
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
        creatureMetadata: {
          inventoryItemListCount: 0,
          inventoryItemListEntries: "[]"
        }
      }]
    });

    const [creature] = mapBackendAreaToScene(area, Date.now, {
      creatureTemplateObjects: [template]
    }).objects;

    expect(creature?.source?.creatureInventoryItems).toEqual([]);
    expect(creature?.creatureProperties?.inventoryItems).toEqual([]);
  });

  it("keeps malformed Creature ItemList preserve-only without mutation provenance", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
        creatureMetadata: {
          inventoryItemListCount: 1,
          inventoryItemListEntries: JSON.stringify([{
            sourceIndex: 0,
            resRef: "nw_cloth022",
            x: 0,
            y: 0,
            dropable: false,
            pickpocketable: false,
            infinite: false
          }])
        }
      }]
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source).not.toHaveProperty("creatureInventoryItems");
    expect(creature?.source?.creatureMetadata?.inventoryItemListEntries).toContain("infinite");
  });

  it("maps exact Creature Equip_ItemList into physical provenance and slot-sorted editable targets", () => {
    const equipmentEntries = [
      { sourceIndex: 0, resRef: "nw_sword001", slotMask: 16, dropable: true, pickpocketable: false },
      { sourceIndex: 1, resRef: "nw_helm001", slotMask: 1, dropable: false, pickpocketable: false }
    ];
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
        creatureMetadata: {
          equipItemListCount: 2,
          equipItemListMutationEntries: JSON.stringify(equipmentEntries)
        }
      }]
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source?.creatureEquippedItems).toEqual(equipmentEntries);
    expect(creature?.creatureProperties?.equippedItems).toEqual([
      equipmentEntries[1],
      equipmentEntries[0]
    ]);
    expect(creature?.source?.creatureEquippedItems).not.toBe(
      creature?.creatureProperties?.equippedItems
    );
    expect(creature?.source?.creatureEquippedItems?.[1]).not.toBe(
      creature?.creatureProperties?.equippedItems?.[0]
    );
  });

  it("maps absent Creature Equip_ItemList as exact empty provenance and overrides template equipment", () => {
    const template = createCreatureTemplateObject();
    template.creatureProperties = {
      ...template.creatureProperties!,
      equippedItems: [{ resRef: "template_helm", slotMask: 1, infinite: true }]
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
        creatureMetadata: {
          equipItemListCount: 0,
          equipItemListMutationEntries: "[]"
        }
      }]
    });

    const [creature] = mapBackendAreaToScene(area, Date.now, {
      creatureTemplateObjects: [template]
    }).objects;

    expect(creature?.source?.creatureEquippedItems).toEqual([]);
    expect(creature?.creatureProperties?.equippedItems).toEqual([]);
  });

  it("keeps malformed Creature Equip_ItemList preserve-only without exact mutation provenance", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:nw_chicken:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "nw_chicken",
        resRef: "nw_chicken",
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
        creatureMetadata: {
          equipItemListCount: 1,
          equipItemListMutationEntries: JSON.stringify([{
            sourceIndex: 0,
            resRef: "nw_helm001",
            slotMask: 3,
            dropable: false,
            pickpocketable: false
          }]),
          equipItemListEntries: JSON.stringify([{
            resRef: "nw_helm001",
            slotMask: 3,
            dropable: false,
            pickpocketable: false,
            infinite: false
          }])
        }
      }]
    });

    const [creature] = mapBackendAreaToScene(area).objects;

    expect(creature?.source).not.toHaveProperty("creatureEquippedItems");
    expect(creature?.creatureProperties?.equippedItems).toHaveLength(1);
  });

  it("maps editable Creature FirstName, LastName, and Description into detached properties", () => {
    const localizedStrings = {
      firstName: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "ICBHdWFyZCAg" }],
      },
      lastName: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "ICBDYXB0YWluICA=" }],
      },
      description: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "ICBEZXNjcmlwdGlvbiAg" }],
      },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:cre_guard_01:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "cre_guard_01",
        resRef: "cre_guard_01",
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
        creatureLocalizedStrings: localizedStrings,
      }],
    });

    const [creature] = mapBackendAreaToScene(area, Date.now, {
      creatureTemplateObjects: [createCreatureTemplateObject()],
    }).objects;

    expect(creature?.creatureProperties).toMatchObject({
      firstName: "  Guard  ",
      lastName: "  Captain  ",
      description: "  Description  ",
    });
    expect(creature?.source?.creatureLocalizedStrings).toEqual(localizedStrings);
    expect(creature?.source?.creatureLocalizedStrings).not.toBe(localizedStrings);
    expect(creature?.source?.creatureLocalizedStrings?.firstName).not.toBe(
      localizedStrings.firstName,
    );
    expect(creature?.source?.creatureLocalizedStrings?.firstName.present).toBe(true);
    if (creature?.source?.creatureLocalizedStrings?.firstName.present) {
      expect(creature.source.creatureLocalizedStrings.firstName.entries).not.toBe(
        localizedStrings.firstName.entries,
      );
      expect(creature.source.creatureLocalizedStrings.firstName.entries[0]).not.toBe(
        localizedStrings.firstName.entries[0],
      );
    }
  });

  it("preserves a TLK-backed Creature FirstName while independently mapping inline LastName", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:cre_guard_01:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "cre_guard_01",
        resRef: "cre_guard_01",
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
        creatureLocalizedStrings: {
          firstName: { present: true, strRef: 12_416, entries: [] },
          lastName: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "RXhhY3Q=" }],
          },
        },
      }],
    });

    const [creature] = mapBackendAreaToScene(area, Date.now, {
      creatureTemplateObjects: [createCreatureTemplateObject()],
    }).objects;

    expect(creature?.creatureProperties).toMatchObject({
      firstName: "UTC Guard",
      lastName: "Exact",
    });
    expect(creature?.source?.creatureLocalizedStrings?.firstName).toEqual({
      present: true,
      strRef: 12_416,
      entries: [],
    });
  });

  it("keeps malformed Creature localized-string storage preserve-only", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 1, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "creature:0:cre_guard_01:source",
        sourceIndex: 0,
        kind: "creature",
        templateId: "cre_guard_01",
        resRef: "cre_guard_01",
        x: 4,
        y: 5,
        z: 0,
        bearing: 0,
        creatureLocalizedStrings: {
          firstName: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "not canonical" }],
          },
          lastName: { present: false },
        } as never,
      }],
    });

    const [creature] = mapBackendAreaToScene(area, Date.now, {
      creatureTemplateObjects: [createCreatureTemplateObject()],
    }).objects;

    expect(creature?.source).not.toHaveProperty("creatureLocalizedStrings");
    expect(creature?.creatureProperties).toMatchObject({
      firstName: "UTC Guard",
      lastName: "Template",
    });
  });

  it("uses exact ground-item TemplateResRef as scene identity and detaches its provenance", () => {
    const itemTemplateResRef = {
      present: true as const,
      nativeType: "resref" as const,
      value: "nw_sword",
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 1,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "item:0:nw_sword",
        sourceIndex: 0,
        kind: "item",
        templateId: "catalog_identity",
        resRef: "loose_display_ref",
        itemTemplateResRef,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [item] = mapBackendAreaToScene(area).objects;

    expect(item?.resRef).toBe("nw_sword");
    expect(item?.source?.itemTemplateResRef).toStrictEqual(itemTemplateResRef);
    expect(item?.source?.itemTemplateResRef).not.toBe(itemTemplateResRef);
  });

  it("retains exact absent ground-item TemplateResRef provenance without overriding display identity", () => {
    const itemTemplateResRef = { present: false as const };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 1,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "item:0:absent",
        sourceIndex: 0,
        kind: "item",
        templateId: "catalog_identity",
        resRef: "loose_display_ref",
        itemTemplateResRef,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [item] = mapBackendAreaToScene(area).objects;

    expect(item?.resRef).toBe("loose_display_ref");
    expect(item?.source?.itemTemplateResRef).toStrictEqual({ present: false });
  });

  it("does not grant ground-item TemplateResRef provenance to another object family", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 1, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "placeable:0:foreign",
        sourceIndex: 0,
        kind: "placeable",
        templateId: "plc_chest",
        resRef: "plc_chest",
        itemTemplateResRef: {
          present: true,
          nativeType: "resref",
          value: "nw_sword",
        },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [placeable] = mapBackendAreaToScene(area).objects;

    expect(placeable?.resRef).toBe("plc_chest");
    expect(placeable?.source).not.toHaveProperty("itemTemplateResRef");
  });

  it("maps exact ground-item variables onto a detached editable target and provenance", () => {
    const itemVariables = { expectedEntries: [
      { sourceIndex: 0, name: "Counter", type: "int" as const, value: 1 },
      { sourceIndex: 1, name: "Label", type: "string" as const, value: "before" },
    ] };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 1,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "item:0:variables",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemVariables,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [item] = mapBackendAreaToScene(area).objects;

    expect(item?.itemProperties?.variables).toEqual([
      { name: "Counter", type: "int", value: 1 },
      { name: "Label", type: "string", value: "before" },
    ]);
    expect(item?.source?.itemVariables).toEqual(itemVariables);
    expect(item?.source?.itemVariables).not.toBe(itemVariables);
    expect(item?.source?.itemVariables?.expectedEntries)
      .not.toBe(itemVariables.expectedEntries);
    expect(item?.itemProperties?.variables)
      .not.toBe(item?.source?.itemVariables?.expectedEntries);
  });

  it("maps exact ground-item PropertiesList provenance as detached editable authority", () => {
    const itemPropertyList = {
      present: true,
      expectedEntries: [{
        sourceIndex: 0,
        propertyName: 48,
        subtype: 7,
        costTable: 24,
        costValue: 9,
        param1: 1,
        param1Value: 2,
        chanceAppear: 75,
      }],
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 1,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "item:0:properties_list",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemMetadata: {
          itemPropertyListEntries: JSON.stringify([{ propertyName: 999 }]),
        },
        itemPropertyList,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [item] = mapBackendAreaToScene(area).objects;

    expect(item?.itemProperties?.propertyList).toEqual([{
      propertyName: 48,
      subtype: 7,
      costTable: 24,
      costValue: 9,
      param1: 1,
      param1Value: 2,
      chanceAppear: 75,
    }]);
    expect(item?.source?.itemPropertyList).toEqual(itemPropertyList);
    expect(item?.source?.itemPropertyList).not.toBe(itemPropertyList);
    expect(item?.source?.itemPropertyList?.expectedEntries)
      .not.toBe(itemPropertyList.expectedEntries);
    expect(item?.itemProperties?.propertyList)
      .not.toBe(item?.source?.itemPropertyList?.expectedEntries);
  });

  it("maps exact retained ground-item inventory as detached editable authority", () => {
    const itemInventoryItems = [
      { sourceIndex: 0, resRef: "nw_it_gold001", x: 1, y: 2 },
      { sourceIndex: 1, resRef: "nw_it_gem001", x: 3, y: 4 },
    ];
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 1,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "item:0:inventory",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemInventoryItems,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [item] = mapBackendAreaToScene(area).objects;

    expect(item?.itemProperties?.inventoryItems).toEqual(itemInventoryItems);
    expect(item?.source?.itemInventoryItems).toEqual(itemInventoryItems);
    expect(item?.itemProperties?.inventoryItems).not.toBe(itemInventoryItems);
    expect(item?.source?.itemInventoryItems).not.toBe(itemInventoryItems);
    expect(item?.itemProperties?.inventoryItems)
      .not.toBe(item?.source?.itemInventoryItems);
  });

  it("maps exact retained ground-item static visual-transform source and target without re-deriving CAS", () => {
    const itemVisualTransform = {
      present: true,
      value: {
        scaleX: 0.5,
        scaleY: 0.75,
        scaleZ: 1.25,
        rotateX: -15,
        rotateY: 30,
        rotateZ: 90,
        translateX: 20,
        translateY: -30,
        translateZ: 40,
      },
    } as const;
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 1,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "item:0:visual_transform",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemVisualTransform,
        visualTransform: {
          scale: 0.8333333333333334,
          scaleX: 0.5,
          scaleY: 0.75,
          scaleZ: 1.25,
          offsetX: 2,
          offsetY: -3,
          offsetZ: 4,
          pitch: -Math.PI / 12,
          roll: Math.PI / 6,
          yaw: Math.PI / 2,
        },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [item] = mapBackendAreaToScene(area).objects;

    expect(item?.source?.itemVisualTransform).toStrictEqual(itemVisualTransform);
    expect(item?.itemProperties?.visualTransform).toStrictEqual(itemVisualTransform);
    expect(item?.source?.itemVisualTransform).not.toBe(itemVisualTransform);
    expect(item?.itemProperties?.visualTransform).not.toBe(itemVisualTransform);
    if (item?.source?.itemVisualTransform?.present && item.itemProperties?.visualTransform?.present) {
      expect(item.source.itemVisualTransform.value).not.toBe(itemVisualTransform.value);
      expect(item.itemProperties.visualTransform.value)
        .not.toBe(item.source.itemVisualTransform.value);
    }
    expect(item?.visualTransform).toMatchObject({
      scaleX: 0.5,
      scaleY: 0.75,
      scaleZ: 1.25,
      offsetX: 2,
      offsetY: -3,
      offsetZ: 4,
    });
  });

  it("binds an exact Item BaseItem/appearance vector to the effective catalog and render fields", () => {
    const itemBaseItemCatalog = {
      descriptor: {
        resourceName: "baseitems.2da" as const,
        sourceObjectKey: "modules/current/baseitems.2da",
        sourceLayer: "module" as const,
        sha256: "b".repeat(64),
        sizeBytes: 4096,
        rowCount: 2,
      },
      rows: [
        { rowIndex: 0, label: "simple", modelType: 0 as const, displayName: "Simple" },
        { rowIndex: 1, label: "weapon", modelType: 2 as const, itemClass: "WSwLs", displayName: "Weapon" },
      ],
    };
    const itemBaseAppearance = {
      expectedValue: {
        baseItem: 1,
        modelType: 2 as const,
        appearance: { modelPart1: 7, modelPart2: 8, modelPart3: 9 },
      },
      tableSha256: "b".repeat(64),
      tableRowCount: 2,
    };
    const area = minimalAreaDetail({
      itemBaseItemCatalog,
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 1,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "item:0:base_appearance",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemBaseAppearance,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const scene = mapBackendAreaToScene(area);
    const [item] = scene.objects;

    expect(scene.itemBaseItemCatalog).toEqual(itemBaseItemCatalog);
    expect(scene.itemBaseItemCatalog).not.toBe(itemBaseItemCatalog);
    expect(item?.source?.itemBaseAppearance).toEqual(itemBaseAppearance);
    expect(item?.source?.itemBaseAppearance).not.toBe(itemBaseAppearance);
    expect(item?.itemProperties).toMatchObject({
      baseItem: 1,
      modelPart1: 7,
      modelPart2: 8,
      modelPart3: 9,
      modelParts: [7, 8, 9],
      baseAppearance: itemBaseAppearance.expectedValue,
    });
  });

  it("does not activate stale or row-incoherent Item appearance provenance", () => {
    const area = minimalAreaDetail({
      itemBaseItemCatalog: {
        descriptor: {
          resourceName: "baseitems.2da",
          sourceObjectKey: "modules/current/baseitems.2da",
          sourceLayer: "module",
          sha256: "b".repeat(64),
          sizeBytes: 4096,
          rowCount: 1,
        },
        rows: [{ rowIndex: 0, modelType: 0, displayName: "Simple" }],
      },
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 1,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "item:0:base_appearance_stale",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemBaseAppearance: {
          expectedValue: { baseItem: 0, modelType: 0, appearance: { modelPart1: 66 } },
          tableSha256: "c".repeat(64),
          tableRowCount: 1,
        },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [item] = mapBackendAreaToScene(area).objects;

    expect(item?.source?.itemBaseAppearance).toBeUndefined();
    expect(item?.itemProperties?.baseAppearance).toBeUndefined();
  });

  it("maps exact ground-item localized strings onto editable targets and detached provenance", () => {
    const itemLocalizedStrings = {
      localizedName: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "IFN3b3JkIA==" }],
      },
      description: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [],
      },
      identifiedDescription: {
        present: true as const,
        strRef: 42,
        entries: [],
      },
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 1,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "item:0:localized_strings",
        sourceIndex: 0,
        kind: "item",
        templateId: "nw_sword",
        itemMetadata: {
          localizedName: "fallback name",
          description: "fallback description",
          identifiedDescription: "fallback identified description",
        },
        itemLocalizedStrings,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [item] = mapBackendAreaToScene(area).objects;

    expect(item?.itemProperties).toMatchObject({
      localizedName: " Sword ",
      description: "",
      identifiedDescription: "fallback identified description",
    });
    expect(item?.source?.itemLocalizedStrings).toEqual(itemLocalizedStrings);
    expect(item?.source?.itemLocalizedStrings).not.toBe(itemLocalizedStrings);
    expect(item?.source?.itemLocalizedStrings?.localizedName).not.toBe(
      itemLocalizedStrings.localizedName,
    );
    expect(item?.source?.itemLocalizedStrings?.localizedName.present &&
      item.source.itemLocalizedStrings.localizedName.entries)
      .not.toBe(itemLocalizedStrings.localizedName.entries);
  });

  it("does not grant ground-item localized-string provenance to another object family", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 1, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "placeable:0:foreign_item_strings",
        sourceIndex: 0,
        kind: "placeable",
        templateId: "plc_chest",
        itemLocalizedStrings: {
          localizedName: { present: true, strRef: 0xffff_ffff, entries: [] },
          description: { present: true, strRef: 0xffff_ffff, entries: [] },
          identifiedDescription: { present: true, strRef: 0xffff_ffff, entries: [] },
        },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [placeable] = mapBackendAreaToScene(area).objects;

    expect(placeable?.source).not.toHaveProperty("itemLocalizedStrings");
  });

  it("maps exact Waypoint Tag storage into a detached editable target", () => {
    const waypointTag = { present: true as const, value: "  PATROL_POINT_01  " };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 1, total: 1,
      },
      objects: [{
        objectId: "waypoint:0:tag",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        tag: "fallback_tag",
        waypointTag,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [waypoint] = mapBackendAreaToScene(area).objects;

    expect(waypoint?.kind).toBe("waypoints");
    expect(waypoint?.tag).toBe("  PATROL_POINT_01  ");
    expect(waypoint?.source?.waypointTag).toEqual(waypointTag);
    expect(waypoint?.source?.waypointTag).not.toBe(waypointTag);
  });

  it("maps exact Waypoint TemplateResRef to detached provenance and an identity-independent target", () => {
    const waypointTemplateResRef = {
      present: true as const,
      nativeType: "resref" as const,
      value: "nw_waypoint001",
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 1, total: 1,
      },
      objects: [{
        objectId: "waypoint:0:template_resref",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "renderer_identity",
        resRef: "renderer_identity",
        tag: "WAYPOINT",
        waypointTemplateResRef,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [waypoint] = mapBackendAreaToScene(area).objects;

    expect(waypoint?.kind).toBe("waypoints");
    expect(waypoint?.resRef).toBe("renderer_identity");
    expect(waypoint?.waypointTemplateResRef).toBe("nw_waypoint001");
    expect(waypoint?.source?.waypointTemplateResRef)
      .toStrictEqual(waypointTemplateResRef);
    expect(waypoint?.source?.waypointTemplateResRef)
      .not.toBe(waypointTemplateResRef);
  });

  it("maps exact Encounter TemplateResRef to detached provenance and an identity-independent target", () => {
    const encounterTemplateResRef = {
      present: true as const,
      nativeType: "resref" as const,
      value: "x2_gnoll001",
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 1, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "encounter:0:template_resref",
        sourceIndex: 0,
        kind: "encounter",
        templateId: "renderer_identity",
        resRef: "renderer_identity",
        tag: "ENCOUNTER",
        encounterTemplateResRef,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [encounter] = mapBackendAreaToScene(area).objects;

    expect(encounter?.kind).toBe("encounters");
    expect(encounter?.resRef).toBe("renderer_identity");
    expect(encounter?.encounterTemplateResRef).toBe("x2_gnoll001");
    expect(encounter?.source?.encounterTemplateResRef)
      .toStrictEqual(encounterTemplateResRef);
    expect(encounter?.source?.encounterTemplateResRef)
      .not.toBe(encounterTemplateResRef);
  });

  it("maps exact Trigger TemplateResRef to detached provenance and an identity-independent target", () => {
    const triggerTemplateResRef = {
      present: true as const,
      nativeType: "resref" as const,
      value: "newgeneric",
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 1, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "trigger:0:template_resref",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "renderer_identity",
        resRef: "renderer_identity",
        tag: "TRIGGER",
        triggerTemplateResRef,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [trigger] = mapBackendAreaToScene(area).objects;

    expect(trigger?.kind).toBe("triggers");
    expect(trigger?.resRef).toBe("renderer_identity");
    expect(trigger?.triggerTemplateResRef).toBe("newgeneric");
    expect(trigger?.source?.triggerTemplateResRef)
      .toStrictEqual(triggerTemplateResRef);
    expect(trigger?.source?.triggerTemplateResRef)
      .not.toBe(triggerTemplateResRef);
  });

  it("maps exact Trigger LocalizedName storage into detached source and target state", () => {
    const triggerLocalizedName = {
      present: true as const,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 1, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "trigger:0:name",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "renderer_identity",
        resRef: "renderer_identity",
        localizedName: "resolved fallback",
        triggerLocalizedName,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [trigger] = mapBackendAreaToScene(area).objects;

    expect(trigger?.kind).toBe("triggers");
    expect(trigger?.resRef).toBe("renderer_identity");
    expect(trigger?.triggerLocalizedName).toBe("Gate Trigger");
    expect(trigger?.source?.triggerLocalizedNameStorage).toEqual(triggerLocalizedName);
    expect(trigger?.source?.triggerLocalizedNameStorage).not.toBe(triggerLocalizedName);
    if (trigger?.source?.triggerLocalizedNameStorage?.present) {
      expect(trigger.source.triggerLocalizedNameStorage.entries)
        .not.toBe(triggerLocalizedName.entries);
    }
  });

  it("maps exact Trigger event-script storage into detached source and target tuples", () => {
    const triggerScriptResRefs = {
      onDisarm: "TRG_DISARM",
      onTrapTriggered: "trg_trapped",
      onClick: "",
      onHeartbeat: "trg_heartbeat",
      onEnter: "trg_enter",
      onExit: "trg_exit",
      onUserDefined: "trg_user",
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 1, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "trigger:0:scripts",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        triggerScriptResRefs,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [trigger] = mapBackendAreaToScene(area).objects;
    expect(trigger?.triggerScriptResRefs).toEqual(triggerScriptResRefs);
    expect(trigger?.source?.triggerScriptResRefsStorage).toEqual(triggerScriptResRefs);
    expect(trigger?.triggerScriptResRefs).not.toBe(triggerScriptResRefs);
    expect(trigger?.source?.triggerScriptResRefsStorage).not.toBe(triggerScriptResRefs);
    expect(trigger?.source?.triggerScriptResRefsStorage).not.toBe(trigger?.triggerScriptResRefs);
  });

  it("maps exact Trigger transition storage into detached source and target tuples", () => {
    const triggerTransitionStorage = {
      linkedTo: "east_gate",
      linkedToFlags: 2,
      loadScreenId: 321,
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 1, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "trigger:0:transition",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        triggerTransitionStorage,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [trigger] = mapBackendAreaToScene(area).objects;

    expect(trigger?.triggerTransitionStorage).toEqual(triggerTransitionStorage);
    expect(trigger?.source?.triggerTransitionStorage).toEqual(triggerTransitionStorage);
    expect(trigger?.triggerTransitionStorage).not.toBe(triggerTransitionStorage);
    expect(trigger?.source?.triggerTransitionStorage).not.toBe(triggerTransitionStorage);
    expect(trigger?.source?.triggerTransitionStorage)
      .not.toBe(trigger?.triggerTransitionStorage);
  });

  it("maps exact Trigger editor Comment into detached source and target state", () => {
    const triggerMetadata = { editorComment: "  gate note  ", opaque: 7 };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 1, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "trigger:0:comment",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "renderer_identity",
        resRef: "renderer_identity",
        triggerMetadata,
        x: 1, y: 2, z: 0, bearing: 0,
      }],
    });

    const [trigger] = mapBackendAreaToScene(area).objects;

    expect(trigger?.triggerEditorComment).toBe("  gate note  ");
    expect(trigger?.source?.triggerEditorComment).toBe("  gate note  ");
    expect(trigger?.source).not.toBe(area.objects[0]);
  });

  it("does not grant Trigger editor Comment provenance to another family", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 1, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "encounter:0:foreign_trigger_comment",
        sourceIndex: 0,
        kind: "encounter",
        templateId: "x2_gnoll001",
        triggerMetadata: { editorComment: "not owned" },
        x: 1, y: 2, z: 0, bearing: 0,
      }],
    });

    expect(mapBackendAreaToScene(area).objects[0]?.source)
      .not.toHaveProperty("triggerEditorComment");
  });

  it("maps exact Waypoint LocalizedName storage into detached source and target state", () => {
    const waypointLocalizedName = {
      present: true as const,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 1, total: 1,
      },
      objects: [{
        objectId: "waypoint:0:name",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        localizedName: "resolved fallback",
        waypointLocalizedName,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [waypoint] = mapBackendAreaToScene(area).objects;

    expect(waypoint?.name).toBe("Patrol Point");
    expect(waypoint?.waypointLocalizedName).toBe("Patrol Point");
    expect(waypoint?.source?.waypointLocalizedNameStorage)
      .toEqual(waypointLocalizedName);
    expect(waypoint?.source?.waypointLocalizedNameStorage)
      .not.toBe(waypointLocalizedName);
    expect(waypoint?.source?.waypointLocalizedNameStorage?.present &&
      waypoint.source.waypointLocalizedNameStorage.entries)
      .not.toBe(waypointLocalizedName.entries);
  });

  it("maps exact Waypoint Description storage without using it as the display name", () => {
    const waypointDescription = {
      present: true as const,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIHJvdXRl" }],
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 1, total: 1,
      },
      objects: [{
        objectId: "waypoint:0:description",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        localizedName: "resolved fallback",
        waypointDescription,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [waypoint] = mapBackendAreaToScene(area).objects;

    expect(waypoint?.name).toBe("resolved fallback");
    expect(waypoint?.waypointDescription).toBe("Patrol route");
    expect(waypoint?.source?.waypointDescriptionStorage)
      .toEqual(waypointDescription);
    expect(waypoint?.source?.waypointDescriptionStorage)
      .not.toBe(waypointDescription);
    expect(waypoint?.source?.waypointDescriptionStorage?.present &&
      waypoint.source.waypointDescriptionStorage.entries)
      .not.toBe(waypointDescription.entries);
  });

  it("maps one exact Waypoint MapNote vector into detached source and target state", () => {
    const waypointMapNote = {
      hasMapNoteByte: 0 as const,
      mapNoteStorage: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "T2xkIG1hcmtlcg==" }],
      },
      mapNoteEnabledByte: 1 as const,
    };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 1, total: 1,
      },
      objects: [{
        objectId: "waypoint:0:map_note",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        waypointMapNote,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [waypoint] = mapBackendAreaToScene(area).objects;

    expect(waypoint?.waypointMapNote).toEqual({
      hasMapNote: false,
      mapNoteText: "Old marker",
      mapNoteEnabled: true,
    });
    expect(waypoint?.source?.waypointMapNoteStorage).toEqual(waypointMapNote);
    expect(waypoint?.source?.waypointMapNoteStorage).not.toBe(waypointMapNote);
    expect(waypoint?.source?.waypointMapNoteStorage?.mapNoteStorage)
      .not.toBe(waypointMapNote.mapNoteStorage);
  });

  it("maps one exact ordered Waypoint VarTable into detached source and target state", () => {
    const waypointVariables = { expectedEntries: [
      { sourceIndex: 0, name: "dup", type: "int" as const, value: 1 },
      { sourceIndex: 1, name: "dup", type: "string" as const, value: "north" },
    ] };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 1, total: 1,
      },
      objects: [{
        objectId: "waypoint:0:variables",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        waypointVariables,
        x: 1, y: 2, z: 0, bearing: 0,
      }],
    });
    const [waypoint] = mapBackendAreaToScene(area).objects;
    expect(waypoint?.waypointVariables).toEqual([
      { name: "dup", type: "int", value: 1 },
      { name: "dup", type: "string", value: "north" },
    ]);
    expect(waypoint?.source?.waypointVariables).toEqual(waypointVariables);
    expect(waypoint?.source?.waypointVariables).not.toBe(waypointVariables);
    expect(waypoint?.source?.waypointVariables?.expectedEntries)
      .not.toBe(waypointVariables.expectedEntries);
  });

  it("maps exact Waypoint editor Comment into detached source and target state", () => {
    const waypointMetadata = { editorComment: "  patrol note  " };
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 1, total: 1,
      },
      objects: [{
        objectId: "waypoint:0:comment",
        sourceIndex: 0,
        kind: "waypoint",
        templateId: "nw_waypoint001",
        waypointMetadata,
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [waypoint] = mapBackendAreaToScene(area).objects;

    expect(waypoint?.waypointEditorComment).toBe("  patrol note  ");
    expect(waypoint?.source?.waypointEditorComment).toBe("  patrol note  ");
    expect(waypoint?.source).not.toBe(area.objects[0]);
  });

  it("does not grant Waypoint editor Comment provenance to another family", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 1, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "trigger:0:foreign_waypoint_comment",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        waypointMetadata: { editorComment: "not owned" },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });
    expect(mapBackendAreaToScene(area).objects[0]?.source)
      .not.toHaveProperty("waypointEditorComment");
  });

  it("does not grant Waypoint Tag provenance to another object family", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 1, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "trigger:0:foreign_waypoint_tag",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        waypointTag: { present: true, value: "FOREIGN" },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    const [trigger] = mapBackendAreaToScene(area).objects;

    expect(trigger?.source).not.toHaveProperty("waypointTag");
  });

  it("does not grant Waypoint LocalizedName provenance to another object family", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 1, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "trigger:0:foreign_waypoint_name",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        waypointLocalizedName: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [],
        },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    expect(mapBackendAreaToScene(area).objects[0]?.source)
      .not.toHaveProperty("waypointLocalizedNameStorage");
  });

  it("does not grant Waypoint Description provenance to another object family", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 1, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "trigger:0:foreign_waypoint_description",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        waypointDescription: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [],
        },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    expect(mapBackendAreaToScene(area).objects[0]?.source)
      .not.toHaveProperty("waypointDescriptionStorage");
  });

  it("does not grant Waypoint MapNote provenance to another object family", () => {
    const area = minimalAreaDetail({
      composition: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 1, waypoints: 0, total: 1,
      },
      objects: [{
        objectId: "trigger:0:foreign_waypoint_map_note",
        sourceIndex: 0,
        kind: "trigger",
        templateId: "newgeneric",
        waypointMapNote: {
          hasMapNoteByte: 0,
          mapNoteStorage: { present: true, strRef: 0xffff_ffff, entries: [] },
          mapNoteEnabledByte: 1,
        },
        x: 1,
        y: 2,
        z: 0,
        bearing: 0,
      }],
    });

    expect(mapBackendAreaToScene(area).objects[0]?.source)
      .not.toHaveProperty("waypointMapNoteStorage");
  });
});
