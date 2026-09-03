import { describe, expect, it } from "vitest";
import {
  applySoundPropertiesDraftToScene,
  buildSoundPropertiesDraft,
  type SoundPropertiesDialogState
} from "../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import {
  reconcileAdjustLocationDialogWithScene,
  reconcileSoundPropertiesDialogWithScene
} from "../../../../src/modules/layout/application/useWorkspaceObjectDialogEffects";
import { buildAdjustLocationDraft } from "../../../../src/modules/layout/application/workspaceSceneInteraction";
import { createSceneCanvasFacade } from "../../../../src/modules/scene/application/sceneCanvasFacade";
import type { AreaScene } from "../../../../src/modules/scene/contracts";
import { createNewSceneObject, createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";

describe("buildSoundPropertiesDraft", () => {
  it("round-trips provenance-bound retained Sound Active storage exactly", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 7),
      id: "area:sound:0",
      source: {
        type: "aurora_git" as const,
        sourceObjectId: "sound:0",
        sourceIndex: 0,
        sourceKind: "sound" as const,
        soundActiveStorage: { activeByte: 1 as const },
      },
      soundActive: { activeByte: 1 as const },
    };
    const draft = buildSoundPropertiesDraft(soundObject);
    expect(draft.active).toBe(true);
    const scene: AreaScene = { ...createSeedAreaScene(), objects: [soundObject] };
    const updated = applySoundPropertiesDraftToScene(scene, soundObject.id, {
      ...draft,
      active: false,
    });
    expect(updated.objects[0]?.soundActive).toEqual({ activeByte: 0 });
    expect(updated.objects[0]?.source?.soundActiveStorage).toEqual({ activeByte: 1 });
  });

  it("round-trips provenance-bound retained Sound Play Order storage exactly", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 7),
      id: "area:sound:0",
      source: {
        type: "aurora_git" as const,
        sourceObjectId: "sound:0",
        sourceIndex: 0,
        sourceKind: "sound" as const,
        soundPlayOrderStorage: { randomByte: 0 as const },
      },
      soundPlayOrder: { randomByte: 0 as const },
    };
    const draft = buildSoundPropertiesDraft(soundObject);
    expect(draft.playOrder).toBe("sequential");
    const scene: AreaScene = { ...createSeedAreaScene(), objects: [soundObject] };
    const updated = applySoundPropertiesDraftToScene(scene, soundObject.id, {
      ...draft,
      playOrder: "random",
    });
    expect(updated.objects[0]?.soundPlayOrder).toEqual({ randomByte: 1 });
    expect(updated.objects[0]?.source?.soundPlayOrderStorage).toEqual({ randomByte: 0 });
  });

  it("round-trips canonical Play Style and recomputes Priority without changing dependencies", () => {
    const storage = {
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, soundsCount: 2, intervalDword: 25_000,
      intervalVariationDword: 5_000,
    };
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 7),
      id: "area:sound:0",
      source: {
        type: "aurora_git" as const, sourceObjectId: "sound:0", sourceIndex: 0,
        sourceKind: "sound" as const, soundPlayStyleStorage: storage,
      },
      soundPlayStyle: storage,
    };
    const draft = buildSoundPropertiesDraft(soundObject);
    expect(draft.playStyle).toBe("repeat");
    const scene: AreaScene = { ...createSeedAreaScene(), objects: [soundObject] };
    const updated = applySoundPropertiesDraftToScene(scene, soundObject.id, {
      ...draft,
      playStyle: "loop",
    });
    expect(updated.objects[0]?.soundPlayStyle).toEqual({
      ...storage, loopingByte: 1, continuousByte: 0, priorityByte: 3,
    });
    expect(updated.objects[0]?.source?.soundPlayStyleStorage).toEqual(storage);
  });

  it("atomically round-trips exact Sound list and Play Style through playback storage", () => {
    const storage = {
      sounds: ["wind_a", "wind_b"],
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, intervalDword: 25_000,
      intervalVariationDword: 5_000,
    };
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 7),
      id: "area:sound:0",
      source: {
        type: "aurora_git" as const, sourceObjectId: "sound:0", sourceIndex: 0,
        sourceKind: "sound" as const, soundPlaybackStorage: storage,
      },
      soundPlayback: storage,
    };
    const draft = buildSoundPropertiesDraft(soundObject);
    expect(draft.soundList).toEqual(["wind_a", "wind_b"]);
    expect(draft.playStyle).toBe("repeat");
    const scene: AreaScene = { ...createSeedAreaScene(), objects: [soundObject] };
    const updated = applySoundPropertiesDraftToScene(scene, soundObject.id, {
      ...draft,
      soundList: ["wind_b", "wind_b", "wind_c"],
      playStyle: "loop",
    });
    expect(updated.objects[0]?.soundPlayback).toEqual({
      ...storage,
      sounds: ["wind_b", "wind_b", "wind_c"],
      loopingByte: 1,
      continuousByte: 0,
      priorityByte: 3,
    });
    expect(updated.objects[0]?.source?.soundPlaybackStorage).toEqual(storage);
    expect(updated.objects[0]?.soundPlayStyle).toBeUndefined();
  });

  it("atomically round-trips the authoritative Sound list, style, positioning and attenuation profile", () => {
    const profile = {
      sounds: ["wind_a", "wind_b"],
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, randomPositionByte: 0 as const,
      elevationFloat32: 0, maxDistanceFloat32: 14, minDistanceFloat32: 2,
      randomRangeXFloat32: 0, randomRangeYFloat32: 0,
      intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    const playback = {
      sounds: ["wind_a", "wind_b"],
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 7),
      id: "area:sound:0",
      soundPositioning: {
        mode: "specific" as const, elevation: 0, cutoffDistance: 14,
        maxVolumeDistance: 2, randomRangeWestEast: 0, randomRangeNorthSouth: 0,
      },
      source: {
        type: "aurora_git" as const, sourceObjectId: "sound:0", sourceIndex: 0,
        sourceKind: "sound" as const, soundProfileStorage: profile,
        soundPlaybackStorage: playback,
      },
      soundProfile: profile,
      soundPlayback: playback,
    };
    const draft = buildSoundPropertiesDraft(soundObject);
    expect(draft).toMatchObject({
      soundList: ["wind_a", "wind_b"], playStyle: "repeat", mode: "specific",
      elevation: 0, cutoffDistance: 14, maxVolumeDistance: 2,
      randomRangeWestEast: 0, randomRangeNorthSouth: 0,
    });
    const scene: AreaScene = { ...createSeedAreaScene(), objects: [soundObject] };
    const updated = applySoundPropertiesDraftToScene(scene, soundObject.id, {
      ...draft,
      soundList: ["wind_b", "wind_b", "wind_c"],
      playStyle: "loop",
      mode: "random",
      elevation: -1.25,
      cutoffDistance: 20,
      maxVolumeDistance: 4,
      randomRangeWestEast: 8,
      randomRangeNorthSouth: 9,
    });
    expect(updated.objects[0]?.soundProfile).toEqual({
      ...profile,
      sounds: ["wind_b", "wind_b", "wind_c"],
      loopingByte: 1, continuousByte: 0, priorityByte: 3,
      randomPositionByte: 1,
      elevationFloat32: -1.25, maxDistanceFloat32: 20, minDistanceFloat32: 4,
      randomRangeXFloat32: 8, randomRangeYFloat32: 9,
    });
    expect(updated.objects[0]?.source?.soundProfileStorage).toEqual(profile);
    expect(updated.objects[0]?.soundPlayback).toEqual(playback);
    expect(updated.objects[0]?.soundPositioning).toMatchObject({
      mode: "random", elevation: -1.25, cutoffDistance: 20, maxVolumeDistance: 4,
      randomRangeWestEast: 8, randomRangeNorthSouth: 9,
    });
  });

  it("round-trips provenance-bound retained Sound Hours/Times schedule storage exactly", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 7),
      id: "area:sound:0",
      source: {
        type: "aurora_git" as const,
        sourceObjectId: "sound:0",
        sourceIndex: 0,
        sourceKind: "sound" as const,
        soundScheduleStorage: { hoursMask: 0, timesByte: 3 },
      },
      soundSchedule: { hoursMask: 0, timesByte: 3 },
    };
    const draft = buildSoundPropertiesDraft(soundObject);
    expect(draft).toMatchObject({
      whenToPlay: "always",
      dayNight: "both",
      hourMask: "000000000000000000000000",
    });
    const scene: AreaScene = { ...createSeedAreaScene(), objects: [soundObject] };
    const updated = applySoundPropertiesDraftToScene(scene, soundObject.id, {
      ...draft,
      whenToPlay: "hours",
      dayNight: "both",
      hourMask: "100000000000000000000001",
    });
    expect(updated.objects[0]?.soundSchedule).toEqual({
      hoursMask: 0x800001,
      timesByte: 0,
    });
    expect(updated.objects[0]?.source?.soundScheduleStorage).toEqual({
      hoursMask: 0,
      timesByte: 3,
    });
  });

  it("round-trips provenance-bound retained Sound base-volume storage exactly", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 7),
      id: "area:sound:0",
      source: {
        type: "aurora_git" as const,
        sourceObjectId: "sound:0",
        sourceIndex: 0,
        sourceKind: "sound" as const,
        soundVolumeStorage: { volumeByte: 64 },
      },
      soundVolume: { volumeByte: 64 },
    };
    const draft = buildSoundPropertiesDraft(soundObject);
    expect(draft.volume).toBe(64 / 127);
    const scene: AreaScene = { ...createSeedAreaScene(), objects: [soundObject] };
    const updated = applySoundPropertiesDraftToScene(scene, soundObject.id, {
      ...draft,
      volume: 1,
    });
    expect(updated.objects[0]?.soundVolume).toEqual({ volumeByte: 127 });
    expect(updated.objects[0]?.source?.soundVolumeStorage).toEqual({ volumeByte: 64 });
  });

  it("round-trips provenance-bound retained Sound interval/variation storage exactly", () => {
    const expectedStorage = {
      intervalMilliseconds: 25_000,
      intervalVariationMilliseconds: 5_000,
      pitchVariationHundredths: 20,
      volumeVariationByte: 64,
    };
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 7),
      id: "area:sound:0",
      source: {
        type: "aurora_git" as const,
        sourceObjectId: "sound:0",
        sourceIndex: 0,
        sourceKind: "sound" as const,
        soundIntervalVariationStorage: expectedStorage,
      },
      soundIntervalVariation: { ...expectedStorage },
      soundPositioning: {
        mode: "specific" as const,
        elevation: 0,
        maxVolumeDistance: 12,
        cutoffDistance: 24,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          timeWindow: "always",
          hourMask: "0xFFFFFF",
          intervalMs: 1,
          intervalVariationMs: 2,
          volume: 0.8,
          volumeVariation: 0,
          pitchVariation: 0,
          priority: 1,
          flags: {},
          extra: {},
        },
      },
    };
    const draft = buildSoundPropertiesDraft(soundObject);
    expect(draft).toMatchObject({
      intervalMs: 25_000,
      intervalVariationMs: 5_000,
      pitchVariation: Math.fround(0.2),
      volumeVariation: 64 / 127,
    });

    const scene: AreaScene = { ...createSeedAreaScene(), objects: [soundObject] };
    const updated = applySoundPropertiesDraftToScene(scene, soundObject.id, {
      ...draft,
      intervalMs: 12_340,
      intervalVariationMs: 1_230,
      pitchVariation: 0.35,
      volumeVariation: 1,
      volume: 0.5,
    });
    expect(updated.objects[0]?.soundIntervalVariation).toEqual({
      intervalMilliseconds: 12_340,
      intervalVariationMilliseconds: 1_230,
      pitchVariationHundredths: 35,
      volumeVariationByte: 127,
    });
    expect(updated.objects[0]?.source?.soundIntervalVariationStorage).toEqual(expectedStorage);
  });

  it("does not invent exact Sound storage without immutable provenance", () => {
    const soundObject = createNewSceneObject("sounds", 1, 2, 7);
    const scene: AreaScene = { ...createSeedAreaScene(), objects: [soundObject] };
    const draft = {
      ...buildSoundPropertiesDraft(soundObject),
      intervalMs: 12_340,
      intervalVariationMs: 1_230,
      pitchVariation: 0.35,
      volumeVariation: 1,
    };
    expect(applySoundPropertiesDraftToScene(scene, soundObject.id, draft).objects[0])
      .not.toHaveProperty("soundIntervalVariation");
    expect(applySoundPropertiesDraftToScene(scene, soundObject.id, draft).objects[0])
      .not.toHaveProperty("soundVolume");
    expect(applySoundPropertiesDraftToScene(scene, soundObject.id, {
      ...draft,
      whenToPlay: "hours",
      hourMask: "100000000000000000000001",
    }).objects[0]).not.toHaveProperty("soundSchedule");
    expect(applySoundPropertiesDraftToScene(scene, soundObject.id, {
      ...draft,
      active: false,
    }).objects[0]).not.toHaveProperty("soundActive");
    expect(applySoundPropertiesDraftToScene(scene, soundObject.id, {
      ...draft,
      playOrder: "random",
    }).objects[0]).not.toHaveProperty("soundPlayOrder");
  });

  it("exposes backend sound template metadata as readonly draft fields", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 7),
      id: "sound_area_007",
      name: "dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        elevation: 0,
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
            category: "effect",
            format: "wav",
            spatialMode: "3d",
            playbackMode: "random",
            auroraBindingKey: "GI_sound_rndm",
            auroraSourceField: "RandomSound",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };

    const draft = buildSoundPropertiesDraft(soundObject);

    expect(draft).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      backendCategory: "effect",
      backendFormat: "wav",
      backendSpatialMode: "3d",
      backendPlaybackMode: "random"
    });
    expect(draft.extraSummary).toContain("\"backendSoundId\":\"sound_dia_hakon_add_12\"");
    expect(draft.extraSummary).toContain("\"soundTemplateSource\":\"backend-catalog\"");
  });

  it("preserves backend sound metadata through apply, serialization, and local draft save", () => {
    const droppedSound = {
      ...createNewSceneObject("sounds", 4, 5, 12),
      id: "sound_area_012",
      name: "dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        elevation: 0,
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
            category: "effect",
            format: "wav",
            spatialMode: "3d",
            playbackMode: "random",
            auroraBindingKey: "GI_sound_rndm",
            auroraSourceField: "RandomSound",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };
    const scene: AreaScene = {
      ...createSeedAreaScene(),
      objects: [droppedSound]
    };
    const draft = {
      ...buildSoundPropertiesDraft(droppedSound),
      tag: "SOUND_DIA_HAKON_ADD_12_EDITED",
      comments: "Designer note survives apply."
    };

    const updatedScene = applySoundPropertiesDraftToScene(scene, droppedSound.id, draft);
    const updatedSound = updatedScene.objects.find((object) => object.id === droppedSound.id);

    expect(updatedSound?.tag).toBe("SOUND_DIA_HAKON_ADD_12_EDITED");
    expect(updatedSound?.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      category: "effect",
      format: "wav",
      spatialMode: "3d",
      playbackMode: "random",
      auroraBindingKey: "GI_sound_rndm",
      auroraSourceField: "RandomSound",
      soundTemplateSource: "backend-catalog",
      auroraComments: "Designer note survives apply."
    });

    const serializedScene = JSON.parse(JSON.stringify(updatedScene)) as AreaScene;
    expect(
      serializedScene.objects[0]?.soundPositioning?.preserve?.extra
    ).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      playbackMode: "random",
      soundTemplateSource: "backend-catalog",
      auroraComments: "Designer note survives apply."
    });

    let savedScene: AreaScene | null = null;
    const canvasFacade = createSceneCanvasFacade({
      draftPort: {
        loadByUserId: () => null,
        saveByUserId: (_userId, nextScene) => {
          savedScene = nextScene;
        }
      },
      now: () => 1_700_000_000_000
    });
    canvasFacade.saveLocalDraft("u_builder_001", serializedScene);

    expect(savedScene?.objects[0]?.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      category: "effect",
      format: "wav",
      spatialMode: "3d",
      playbackMode: "random",
      soundTemplateSource: "backend-catalog",
      auroraComments: "Designer note survives apply."
    });
  });

  it("closes a sound properties dialog when a backend-created sound is hidden", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 4, 5, 12),
      id: "sound_area_012",
      name: "dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        elevation: 0,
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
            category: "effect",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };
    const dialog: SoundPropertiesDialogState = {
      objectId: soundObject.id,
      snapshotObject: soundObject,
      draft: buildSoundPropertiesDraft(soundObject),
      activeTab: "basic",
      windowX: 100,
      windowY: 120,
      collapsed: false
    };

    const reconciled = reconcileSoundPropertiesDialogWithScene({
      current: dialog,
      sceneObjects: [soundObject],
      visibleObjectIdsSet: new Set()
    });

    expect(reconciled).toBeNull();
    expect(soundObject.soundPositioning.preserve.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("refreshes a visible backend sound dialog from scene state while preserving backend metadata", () => {
    const originalSound = {
      ...createNewSceneObject("sounds", 4, 5, 12),
      id: "sound_area_012",
      name: "dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        elevation: 0,
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
            category: "effect",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };
    const liveSound = {
      ...originalSound,
      tag: "SOUND_DIA_HAKON_ADD_12_LIVE"
    };
    const dialog: SoundPropertiesDialogState = {
      objectId: originalSound.id,
      snapshotObject: originalSound,
      draft: buildSoundPropertiesDraft(originalSound),
      activeTab: "basic",
      windowX: 100,
      windowY: 120,
      collapsed: false
    };

    const reconciled = reconcileSoundPropertiesDialogWithScene({
      current: dialog,
      sceneObjects: [liveSound],
      visibleObjectIdsSet: new Set([liveSound.id])
    });

    expect(reconciled?.draft.tag).toBe("SOUND_DIA_HAKON_ADD_12_LIVE");
    expect(reconciled?.draft.backendSoundId).toBe("sound_dia_hakon_add_12");
    expect(liveSound.soundPositioning.preserve.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("closes an adjust location dialog when a backend sound is outside the visible render subset", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 4, 5, 12),
      id: "sound_area_012",
      name: "dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        elevation: 0,
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
    const scene: AreaScene = {
      ...createSeedAreaScene(),
      objects: [soundObject]
    };
    const dialog = {
      objectIds: [soundObject.id],
      snapshotObjects: [soundObject],
      draft: buildAdjustLocationDraft(soundObject, 10, scene.width, scene.height),
      showVisualTransforms: false,
      mixedStaticPlaceables: false,
      windowX: 100,
      windowY: 120,
      collapsed: false
    };

    const reconciled = reconcileAdjustLocationDialogWithScene({
      current: dialog,
      scene,
      visibleObjectIdsSet: new Set(),
      adjustLocationUnitsPerTile: 10
    });

    expect(reconciled).toBeNull();
    expect(soundObject.soundPositioning.preserve.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("refreshes a visible backend sound adjust location dialog without dropping metadata", () => {
    const originalSound = {
      ...createNewSceneObject("sounds", 4, 5, 12),
      id: "sound_area_012",
      name: "dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        elevation: 0,
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
    const liveSound = {
      ...originalSound,
      x: originalSound.x + 1,
      y: originalSound.y + 1
    };
    const scene: AreaScene = {
      ...createSeedAreaScene(),
      objects: [liveSound]
    };
    const dialog = {
      objectIds: [originalSound.id],
      snapshotObjects: [originalSound],
      draft: buildAdjustLocationDraft(originalSound, 10, scene.width, scene.height),
      showVisualTransforms: false,
      mixedStaticPlaceables: false,
      windowX: 100,
      windowY: 120,
      collapsed: false
    };

    const reconciled = reconcileAdjustLocationDialogWithScene({
      current: dialog,
      scene,
      visibleObjectIdsSet: new Set([liveSound.id]),
      adjustLocationUnitsPerTile: 10
    });

    expect(reconciled?.draft.x).toBe(buildAdjustLocationDraft(liveSound, 10, scene.width, scene.height).x);
    expect(liveSound.soundPositioning.preserve.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });
});
