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
