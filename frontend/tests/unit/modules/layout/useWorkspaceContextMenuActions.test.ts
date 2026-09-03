import { describe, expect, it } from "vitest";
import {
  resolveContextMenuAdjustLocationTargets,
  resolveContextMenuActionObject,
  resolveContextMenuDeleteTargetObject,
  resolveContextMenuDuplicateSourceObjects,
  resolveContextMenuReadOnlyTargetObject,
  resolveContextMenuResetTransformTargetObject,
  resolveVisibleContextMenuTargetObject,
  type ContextMenuState
} from "../../../../src/modules/layout/application/useWorkspaceContextMenuActions";
import {
  resolveAnchoredDialogDragTargetObject,
  resolveAnchoredDialogTargetObject
} from "../../../../src/modules/layout/application/useWorkspaceDialogLifecycle";
import { createDefaultToolbarState } from "../../../../src/modules/layout/roleTopbarPolicy";
import type { SceneObject } from "../../../../src/modules/layout/contracts";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

function createBackendSoundObject(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    ...createNewSceneObject("sounds", 2, 3, 7),
    id: "sound_area_007",
    name: "dia_hakon_add_12",
    tag: "SOUND_DIA_HAKON_ADD_12",
    resRef: "dia_hakon_add_12",
    soundPositioning: {
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 12,
      cutoffDistance: 24,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0,
      preserve: {
        timeWindow: "always",
        hourMask: "0xFFFFFF",
        active: true,
        whenToPlay: "always",
        dayNight: "both",
        hoursStart: 0,
        hoursEnd: 23,
        playStyle: "repeat",
        playOrder: "random",
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
    },
    ...overrides
  };
}

function createContextMenu(object: SceneObject): ContextMenuState {
  return {
    x: 100,
    y: 120,
    objectId: object.id,
    objectKind: object.kind,
    anchorOffsetX: 0,
    anchorOffsetY: 0
  };
}

describe("resolveContextMenuActionObject", () => {
  it("blocks hidden backend-created sounds from context menu action targets", () => {
    const sound = createBackendSoundObject();

    const target = resolveContextMenuActionObject({
      contextMenu: createContextMenu(sound),
      sceneObjects: [sound],
      visibleObjectIdsSet: new Set()
    });

    expect(target).toBeNull();
    expect(sound.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("allows visible backend-created sounds to remain context menu action targets", () => {
    const sound = createBackendSoundObject();

    const target = resolveContextMenuActionObject({
      contextMenu: createContextMenu(sound),
      sceneObjects: [sound],
      visibleObjectIdsSet: new Set([sound.id])
    });

    expect(target).toMatchObject({
      id: "sound_area_007",
      kind: "sounds",
      resRef: "dia_hakon_add_12"
    });
    expect(target?.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("blocks stale out-of-subset backend sound context menus when another sound is visible", () => {
    const visibleSound = createBackendSoundObject({
      id: "sound_area_visible_001",
      tag: "SOUND_VISIBLE_001",
      resRef: "visible_sound"
    });
    const hiddenSound = createBackendSoundObject({
      id: "sound_area_hidden_002",
      tag: "SOUND_HIDDEN_002",
      resRef: "hidden_sound"
    });

    const target = resolveContextMenuActionObject({
      contextMenu: createContextMenu(hiddenSound),
      sceneObjects: [visibleSound, hiddenSound],
      visibleObjectIdsSet: new Set([visibleSound.id])
    });

    expect(target).toBeNull();
    expect(hiddenSound.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });
});

describe("resolveVisibleContextMenuTargetObject", () => {
  it("provides the shared visible target contract for backend sound context actions", () => {
    const visibleSound = createBackendSoundObject({
      id: "sound_area_visible_001",
      tag: "SOUND_VISIBLE_001",
      resRef: "visible_sound"
    });
    const hiddenSound = createBackendSoundObject({
      id: "sound_area_hidden_002",
      tag: "SOUND_HIDDEN_002",
      resRef: "hidden_sound"
    });

    expect(
      resolveVisibleContextMenuTargetObject({
        contextMenu: createContextMenu(hiddenSound),
        sceneObjects: [visibleSound, hiddenSound],
        visibleObjectIdsSet: new Set([visibleSound.id])
      })
    ).toBeNull();
    expect(
      resolveVisibleContextMenuTargetObject({
        contextMenu: createContextMenu(visibleSound),
        sceneObjects: [visibleSound, hiddenSound],
        visibleObjectIdsSet: new Set([visibleSound.id])
      })
    ).toMatchObject({
      id: "sound_area_visible_001",
      kind: "sounds",
      soundPositioning: {
        preserve: {
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
    expect(hiddenSound.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });
});

describe("resolveAnchoredDialogTargetObject", () => {
  it("blocks stale out-of-subset backend sound dialog anchors", () => {
    const visibleSound = createBackendSoundObject({
      id: "sound_area_visible_001",
      tag: "SOUND_VISIBLE_001",
      resRef: "visible_sound"
    });
    const hiddenSound = createBackendSoundObject({
      id: "sound_area_hidden_002",
      tag: "SOUND_HIDDEN_002",
      resRef: "hidden_sound"
    });

    expect(
      resolveAnchoredDialogTargetObject({
        objectId: hiddenSound.id,
        objectKind: "sounds",
        sceneObjects: [visibleSound, hiddenSound],
        visibleObjectIdsSet: new Set([visibleSound.id])
      })
    ).toBeNull();
    expect(hiddenSound.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("allows visible backend sound dialog anchors", () => {
    const sound = createBackendSoundObject();

    expect(
      resolveAnchoredDialogTargetObject({
        objectId: sound.id,
        objectKind: "sounds",
        sceneObjects: [sound],
        visibleObjectIdsSet: new Set([sound.id])
      })
    ).toMatchObject({
      id: "sound_area_007",
      kind: "sounds",
      resRef: "dia_hakon_add_12"
    });
  });

  it("accepts either exact kind for a shared Trigger/Encounter polygon dialog", () => {
    const trigger = {
      ...createBackendSoundObject({ id: "trigger_001" }),
      kind: "triggers" as const,
    };
    const encounter = {
      ...createBackendSoundObject({ id: "encounter_001" }),
      kind: "encounters" as const,
    };

    expect(resolveAnchoredDialogTargetObject({
      objectId: trigger.id,
      objectKind: ["triggers", "encounters"],
      sceneObjects: [trigger, encounter],
      visibleObjectIdsSet: new Set([trigger.id, encounter.id]),
    })).toBe(trigger);
    expect(resolveAnchoredDialogTargetObject({
      objectId: encounter.id,
      objectKind: ["triggers", "encounters"],
      sceneObjects: [trigger, encounter],
      visibleObjectIdsSet: new Set([trigger.id, encounter.id]),
    })).toBe(encounter);
  });
});

describe("resolveAnchoredDialogDragTargetObject", () => {
  it("blocks stale out-of-subset backend sound drag anchors", () => {
    const visibleSound = createBackendSoundObject({
      id: "sound_area_visible_001",
      tag: "SOUND_VISIBLE_001",
      resRef: "visible_sound"
    });
    const hiddenSound = createBackendSoundObject({
      id: "sound_area_hidden_002",
      tag: "SOUND_HIDDEN_002",
      resRef: "hidden_sound"
    });

    expect(
      resolveAnchoredDialogDragTargetObject({
        objectId: hiddenSound.id,
        sceneObjects: [visibleSound, hiddenSound],
        visibleObjectIdsSet: new Set([visibleSound.id])
      })
    ).toBeNull();
    expect(hiddenSound.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("allows visible backend sound drag anchors while preserving backend metadata", () => {
    const sound = createBackendSoundObject();

    expect(
      resolveAnchoredDialogDragTargetObject({
        objectId: sound.id,
        sceneObjects: [sound],
        visibleObjectIdsSet: new Set([sound.id])
      })
    ).toMatchObject({
      id: "sound_area_007",
      kind: "sounds",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        preserve: {
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
  });
});

describe("resolveContextMenuAdjustLocationTargets", () => {
  it("keeps multi-selected backend sound adjust-location targets limited to visible subset sounds", () => {
    const visibleSound = createBackendSoundObject({
      id: "sound_area_visible_001",
      tag: "SOUND_VISIBLE_001",
      resRef: "visible_sound"
    });
    const hiddenSound = createBackendSoundObject({
      id: "sound_area_hidden_002",
      tag: "SOUND_HIDDEN_002",
      resRef: "hidden_sound"
    });

    const resolved = resolveContextMenuAdjustLocationTargets({
      contextObject: visibleSound,
      sceneObjects: [visibleSound, hiddenSound],
      selectedObjectIds: [visibleSound.id, hiddenSound.id],
      visibleObjectIdsSet: new Set([visibleSound.id]),
      toolbarState: createDefaultToolbarState()
    });

    expect(resolved.editableTargets.map((object) => object.id)).toEqual([visibleSound.id]);
    expect(resolved.resolvedTargetCount).toBe(1);
    expect(hiddenSound.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("keeps visible multi-selected backend sound adjust-location targets together", () => {
    const firstSound = createBackendSoundObject({
      id: "sound_area_visible_001",
      tag: "SOUND_VISIBLE_001",
      resRef: "visible_sound"
    });
    const secondSound = createBackendSoundObject({
      id: "sound_area_visible_002",
      tag: "SOUND_VISIBLE_002",
      resRef: "visible_sound_2"
    });

    const resolved = resolveContextMenuAdjustLocationTargets({
      contextObject: firstSound,
      sceneObjects: [firstSound, secondSound],
      selectedObjectIds: [firstSound.id, secondSound.id],
      visibleObjectIdsSet: new Set([firstSound.id, secondSound.id]),
      toolbarState: createDefaultToolbarState()
    });

    expect(resolved.editableTargets.map((object) => object.id)).toEqual([
      firstSound.id,
      secondSound.id
    ]);
    expect(resolved.resolvedTargetCount).toBe(2);
  });
});

describe("resolveContextMenuDuplicateSourceObjects", () => {
  it("rejects duplicate sources for out-of-subset backend sound context objects", () => {
    const visibleSound = createBackendSoundObject({
      id: "sound_area_visible_001",
      tag: "SOUND_VISIBLE_001",
      resRef: "visible_sound"
    });
    const hiddenSound = createBackendSoundObject({
      id: "sound_area_hidden_002",
      tag: "SOUND_HIDDEN_002",
      resRef: "hidden_sound"
    });

    const sources = resolveContextMenuDuplicateSourceObjects({
      contextMenu: createContextMenu(hiddenSound),
      sceneObjects: [visibleSound, hiddenSound],
      visibleObjectIdsSet: new Set([visibleSound.id])
    });

    expect(sources).toEqual([]);
    expect(hiddenSound.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("allows duplicate sources for visible backend sound context objects", () => {
    const sound = createBackendSoundObject();

    const sources = resolveContextMenuDuplicateSourceObjects({
      contextMenu: createContextMenu(sound),
      sceneObjects: [sound],
      visibleObjectIdsSet: new Set([sound.id])
    });

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      id: "sound_area_007",
      kind: "sounds",
      soundPositioning: {
        preserve: {
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
  });
});

describe("resolveContextMenuDeleteTargetObject", () => {
  it("rejects delete targets for out-of-subset backend sound context objects", () => {
    const visibleSound = createBackendSoundObject({
      id: "sound_area_visible_001",
      tag: "SOUND_VISIBLE_001",
      resRef: "visible_sound"
    });
    const hiddenSound = createBackendSoundObject({
      id: "sound_area_hidden_002",
      tag: "SOUND_HIDDEN_002",
      resRef: "hidden_sound"
    });

    const target = resolveContextMenuDeleteTargetObject({
      contextMenu: createContextMenu(hiddenSound),
      sceneObjects: [visibleSound, hiddenSound],
      visibleObjectIdsSet: new Set([visibleSound.id])
    });

    expect(target).toBeNull();
    expect(hiddenSound.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("allows delete targets for visible backend sound context objects", () => {
    const sound = createBackendSoundObject();

    const target = resolveContextMenuDeleteTargetObject({
      contextMenu: createContextMenu(sound),
      sceneObjects: [sound],
      visibleObjectIdsSet: new Set([sound.id])
    });

    expect(target).toMatchObject({
      id: "sound_area_007",
      kind: "sounds",
      soundPositioning: {
        preserve: {
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
  });
});

describe("resolveContextMenuReadOnlyTargetObject", () => {
  it("rejects read-only targets for out-of-subset backend sound context objects", () => {
    const visibleSound = createBackendSoundObject({
      id: "sound_area_visible_001",
      tag: "SOUND_VISIBLE_001",
      resRef: "visible_sound"
    });
    const hiddenSound = createBackendSoundObject({
      id: "sound_area_hidden_002",
      tag: "SOUND_HIDDEN_002",
      resRef: "hidden_sound"
    });

    const target = resolveContextMenuReadOnlyTargetObject({
      contextMenu: createContextMenu(hiddenSound),
      sceneObjects: [visibleSound, hiddenSound],
      visibleObjectIdsSet: new Set([visibleSound.id])
    });

    expect(target).toBeNull();
    expect(hiddenSound.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("allows read-only targets for visible backend sound context objects", () => {
    const sound = createBackendSoundObject();

    const target = resolveContextMenuReadOnlyTargetObject({
      contextMenu: createContextMenu(sound),
      sceneObjects: [sound],
      visibleObjectIdsSet: new Set([sound.id])
    });

    expect(target).toMatchObject({
      id: "sound_area_007",
      kind: "sounds",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        preserve: {
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
  });
});

describe("resolveContextMenuResetTransformTargetObject", () => {
  it("rejects reset-transform targets for out-of-subset backend sound context objects", () => {
    const visibleSound = createBackendSoundObject({
      id: "sound_area_visible_001",
      tag: "SOUND_VISIBLE_001",
      resRef: "visible_sound"
    });
    const hiddenSound = createBackendSoundObject({
      id: "sound_area_hidden_002",
      tag: "SOUND_HIDDEN_002",
      resRef: "hidden_sound"
    });

    const target = resolveContextMenuResetTransformTargetObject({
      contextMenu: createContextMenu(hiddenSound),
      sceneObjects: [visibleSound, hiddenSound],
      visibleObjectIdsSet: new Set([visibleSound.id])
    });

    expect(target).toBeNull();
    expect(hiddenSound.soundPositioning?.preserve?.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_12",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("allows reset-transform targets for visible backend sound context objects", () => {
    const sound = createBackendSoundObject();

    const target = resolveContextMenuResetTransformTargetObject({
      contextMenu: createContextMenu(sound),
      sceneObjects: [sound],
      visibleObjectIdsSet: new Set([sound.id])
    });

    expect(target).toMatchObject({
      id: "sound_area_007",
      kind: "sounds",
      soundPositioning: {
        preserve: {
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
  });
});
