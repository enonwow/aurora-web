import { act, render } from "@testing-library/react";
import type { DragEvent, MouseEvent, SetStateAction } from "react";
import { createWorkspaceChromeFacade } from "../../../../src/modules/layout/application/workspaceChromeFacade";
import {
  serializeObjectAddPayload,
  setCurrentObjectAddDragSourceTemplate,
  type ObjectAddDragPayload
} from "../../../../src/modules/layout/application/objectAddDragPayload";
import { DEFAULT_WORKSPACE_OPTION_SETTINGS } from "../../../../src/modules/layout/workspaceOptionSettings";
import { useWorkspaceObjectAddDragDrop } from "../../../../src/modules/layout/components/useWorkspaceObjectAddDragDrop";
import type { AreaScene, SceneHistoryState } from "../../../../src/modules/layout/contracts";
import type { SceneViewportPort } from "../../../../src/modules/scene/application/sceneViewportPort";
import { createNewSceneObject, createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";
import type { WorkspaceObjectAddRuntimePort } from "../../../../src/modules/layout/ports/workspaceRenderRuntimePort";

describe("useWorkspaceObjectAddDragDrop", () => {
  it("routes door drops through the hook-safe facade and reports a rejected hook", () => {
    const scene: AreaScene = { ...createSeedAreaScene(), objects: [] };
    const payload: ObjectAddDragPayload = {
      id: "door_catalog_template",
      kind: "doors",
      tag: "UNTRUSTED_DOOR_TAG",
      resRef: "untrusted_door_resref",
      name: "Door catalog entry",
    };
    const runtimeRef = { current: {} };
    const objectAddRuntimePort: WorkspaceObjectAddRuntimePort<object, object> = {
      clearObjectAddGhost: vi.fn(),
      syncObjectAddGhost: vi.fn(),
      resolveCanvasObjectAddPlacement: vi.fn(() => ({
        x: 0.25,
        y: 0.25,
        tileId: scene.tiles[0]?.id ?? null,
      })),
    };
    const createObject = vi.fn();
    const createDoorAtHook = vi.fn(() => undefined);
    const sceneViewportPort = {
      createObject,
      createDoorAtHook,
      appendObjects: vi.fn(),
      commitHistory: vi.fn(),
      getSceneScale: vi.fn(() => 1),
    } as unknown as SceneViewportPort;
    const setSceneHistory = vi.fn();
    const setSelectedObjectIds = vi.fn();
    const setSelectedTileId = vi.fn();
    const trackTelemetry = vi.fn();
    const nextObjectSequenceRef = { current: 9 };
    let handlers: ReturnType<typeof useWorkspaceObjectAddDragDrop<object, object>> | null = null;

    function Harness() {
      handlers = useWorkspaceObjectAddDragDrop({
        runtimeRef,
        objectAddRuntimePort,
        scene,
        sceneViewportPort,
        renderObjectIds: null,
        toolbarState: createWorkspaceChromeFacade().createDefaultToolbarState(),
        workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
        nextObjectSequenceRef,
        setSceneHistory,
        setSelectedObjectIds,
        setSelectedTileId,
        trackTelemetry,
        userId: "u_builder_001",
      });
      return null;
    }

    render(<Harness />);
    act(() => {
      handlers?.handleCanvasDrop({
        clientX: 20,
        clientY: 20,
        preventDefault: vi.fn(),
        dataTransfer: { getData: vi.fn(() => serializeObjectAddPayload(payload)) },
      } as unknown as DragEvent<HTMLDivElement>);
    });

    expect(createDoorAtHook).toHaveBeenCalledWith(scene, 0.25, 0.25, 9);
    expect(createObject).not.toHaveBeenCalled();
    expect(setSceneHistory).not.toHaveBeenCalled();
    expect(setSelectedObjectIds).not.toHaveBeenCalled();
    expect(handlers?.objectAddDropFeedback).toEqual({
      variant: "warning",
      message: "This tile has no supported free door hook.",
    });
    expect(trackTelemetry).toHaveBeenCalledWith(
      "scene.objects.add_blocked_door_hook",
      expect.objectContaining({ kind: "doors", source: "drop" }),
    );

    const safeDoor = createNewSceneObject("doors", 0.5, 0.576, 10);
    safeDoor.resRef = "nw_door_ttr_04";
    safeDoor.tag = "Barn1Door";
    safeDoor.name = "Barn 1 Door";
    safeDoor.bearing = 1.234;
    safeDoor.z = 0.456;
    createDoorAtHook.mockReturnValue(safeDoor);
    act(() => {
      handlers?.handleCanvasDrop({
        clientX: 20,
        clientY: 20,
        preventDefault: vi.fn(),
        dataTransfer: { getData: vi.fn(() => serializeObjectAddPayload(payload)) },
      } as unknown as DragEvent<HTMLDivElement>);
    });

    expect(createDoorAtHook).toHaveBeenLastCalledWith(scene, 0.25, 0.25, expect.any(Number));
    expect(safeDoor).toMatchObject({
      resRef: "nw_door_ttr_04",
      tag: "Barn1Door",
      name: "Barn 1 Door",
      bearing: 1.234,
      z: 0.456,
    });
    expect(setSceneHistory).toHaveBeenCalledOnce();
    expect(setSelectedObjectIds).toHaveBeenCalledWith([safeDoor.id]);
    expect(nextObjectSequenceRef.current).toBe(11);
  });

  it("preserves backend sound template positioning when dropped into an area scene", () => {
    const baseScene = createSeedAreaScene();
    const scene: AreaScene = {
      ...baseScene,
      objects: []
    };
    const soundPositioning = {
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
          auroraBindingKey: "GI_sound_rndm",
          auroraSourceField: "RandomSound",
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
    const runtimeRef = { current: {} };
    const objectAddRuntimePort: WorkspaceObjectAddRuntimePort<object, object> = {
      clearObjectAddGhost: vi.fn(),
      syncObjectAddGhost: vi.fn(),
      resolveCanvasObjectAddPlacement: vi.fn(() => ({
        x: 2,
        y: 3,
        tileId: scene.tiles[0]?.id ?? null
      }))
    };
    const sceneViewportPort = {
      createObject: vi.fn((kind, x, y, sequence) => {
        const created = createNewSceneObject(kind, x, y, sequence);
        created.bearing = 0.23;
        created.z = 0.27;
        return created;
      }),
      appendObjects: vi.fn((currentScene, objects) => ({
        ...currentScene,
        objects: [...currentScene.objects, ...objects]
      })),
      commitHistory: vi.fn((currentHistory, nextScene) => ({
        past: [...currentHistory.past, currentHistory.present],
        present: nextScene,
        future: []
      })),
      getSceneScale: vi.fn(() => 1)
    } as unknown as SceneViewportPort;
    let history: SceneHistoryState = { past: [], present: scene, future: [] };
    const setSceneHistory = vi.fn((updater: SetStateAction<SceneHistoryState>) => {
      history = typeof updater === "function" ? updater(history) : updater;
    });
    const setSelectedObjectIds = vi.fn();
    const setSelectedTileId = vi.fn();
    const trackTelemetry = vi.fn();
    let handlers: ReturnType<typeof useWorkspaceObjectAddDragDrop<object, object>> | null = null;

    function Harness() {
      handlers = useWorkspaceObjectAddDragDrop({
        runtimeRef,
        objectAddRuntimePort,
        scene,
        sceneViewportPort,
        renderObjectIds: null,
        toolbarState: createWorkspaceChromeFacade().createDefaultToolbarState(),
        workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
        nextObjectSequenceRef: { current: 99 },
        setSceneHistory,
        setSelectedObjectIds,
        setSelectedTileId,
        trackTelemetry,
        userId: "u_builder_001"
      });
      return null;
    }

    render(<Harness />);

    act(() => {
      handlers?.handleCanvasDrop({
        clientX: 240,
        clientY: 160,
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn(() => serializeObjectAddPayload(payload))
        }
      } as unknown as DragEvent<HTMLDivElement>);
    });

    const droppedSound = history.present.objects[0];
    expect(droppedSound).toMatchObject({
      kind: "sounds",
      resRef: "dia_hakon_add_12",
      name: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific",
        preserve: {
          flags: { backendBenchmark: true },
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            auroraBindingKey: "GI_sound_rndm",
            auroraSourceField: "RandomSound",
            soundTemplateSource: "backend-catalog"
          }
        }
      },
      bearing: Math.PI / 12,
      z: 0.5
    });
    expect(setSelectedObjectIds).toHaveBeenCalledWith([droppedSound?.id]);
    expect(setSelectedTileId).toHaveBeenCalledWith(scene.tiles[0]?.id);
    expect(trackTelemetry).toHaveBeenCalledWith(
      "scene.objects.add_from_panel",
      expect.objectContaining({
        kind: "sounds",
        sourceTemplateId: "snd_template_sound_dia_hakon_add_12"
      })
    );
  });

  it("preserves a backend creature template snapshot when dragged into an area scene", () => {
    const baseScene = createSeedAreaScene();
    const scene: AreaScene = {
      ...baseScene,
      objects: []
    };
    const creatureTemplate = {
      ...createNewSceneObject("creatures", 0, 0, 12),
      id: "cre_template_guard_captain",
      tag: "CRE_GUARD_CAPTAIN",
      resRef: "cre_guard_captain",
      name: "Guard Captain",
      creatureProperties: {
        firstName: "Guard",
        lastName: "Captain",
        race: "Human",
        appearance: "Human, Male",
        phenotype: "Normal",
        gender: "Male",
        description: "Backend catalog creature",
        challengeRating: 4,
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
          featListCount: 1,
          inventoryItemListCount: 1
        },
        localizedStringRefs: {
          firstName: 9101,
          description: 9102
        },
        localizedStrings: {
          displayName: "Guard Captain",
          identifiedDescription: "Backend catalog creature"
        },
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
            fortitudeBase: 4,
            fortitudeBonus: 1,
            reflexBase: 2,
            reflexBonus: 0,
            willBase: 1,
            willBonus: 0
          },
          naturalArmorClass: 1,
          baseArmorClass: 10,
          dexterityBonus: 1,
          sizeModifier: 0,
          baseHitPoints: 36,
          hitPointBonuses: 6,
          movementRate: "Normal"
        },
        advancedSettings: {
          blueprintResRef: "cre_guard_captain",
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
        classEntries: [{ className: "Fighter", level: 4 }],
        skills: [{ skill: "Discipline", rank: 7 }],
        feats: [{ name: "Power Attack", type: "general", assigned: true }]
      }
    };
    const payload: ObjectAddDragPayload = {
      id: creatureTemplate.id,
      kind: "creatures",
      tag: creatureTemplate.tag,
      resRef: creatureTemplate.resRef,
      name: creatureTemplate.name
    };
    const runtimeRef = { current: {} };
    const objectAddRuntimePort: WorkspaceObjectAddRuntimePort<object, object> = {
      clearObjectAddGhost: vi.fn(),
      syncObjectAddGhost: vi.fn(),
      resolveCanvasObjectAddPlacement: vi.fn(() => ({
        x: 6,
        y: 7,
        tileId: scene.tiles[0]?.id ?? null
      }))
    };
    const sceneViewportPort = {
      createObject: vi.fn((kind, x, y, sequence) => createNewSceneObject(kind, x, y, sequence)),
      appendObjects: vi.fn((currentScene, objects) => ({
        ...currentScene,
        objects: [...currentScene.objects, ...objects]
      })),
      commitHistory: vi.fn((currentHistory, nextScene) => ({
        past: [...currentHistory.past, currentHistory.present],
        present: nextScene,
        future: []
      })),
      getSceneScale: vi.fn(() => 1)
    } as unknown as SceneViewportPort;
    let history: SceneHistoryState = { past: [], present: scene, future: [] };
    const setSceneHistory = vi.fn((updater: SetStateAction<SceneHistoryState>) => {
      history = typeof updater === "function" ? updater(history) : updater;
    });
    const setSelectedObjectIds = vi.fn();
    const setSelectedTileId = vi.fn();
    const trackTelemetry = vi.fn();
    let handlers: ReturnType<typeof useWorkspaceObjectAddDragDrop<object, object>> | null = null;

    function Harness() {
      handlers = useWorkspaceObjectAddDragDrop({
        runtimeRef,
        objectAddRuntimePort,
        scene,
        sceneViewportPort,
        renderObjectIds: null,
        toolbarState: createWorkspaceChromeFacade().createDefaultToolbarState(),
        workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
        nextObjectSequenceRef: { current: 101 },
        setSceneHistory,
        setSelectedObjectIds,
        setSelectedTileId,
        trackTelemetry,
        userId: "u_builder_001"
      });
      return null;
    }

    render(<Harness />);
    setCurrentObjectAddDragSourceTemplate(creatureTemplate);

    act(() => {
      handlers?.handleCanvasDrop({
        clientX: 240,
        clientY: 160,
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn(() => serializeObjectAddPayload(payload))
        }
      } as unknown as DragEvent<HTMLDivElement>);
    });

    const droppedCreature = history.present.objects[0];
    expect(droppedCreature).toMatchObject({
      kind: "creatures",
      x: 6,
      y: 7,
      tag: "CRE_GUARD_CAPTAIN",
      resRef: "cre_guard_captain",
      creatureProperties: {
        firstName: "Guard",
        lastName: "Captain",
        statistics: {
          abilityScores: {
            strength: 16,
            dexterity: 13,
            constitution: 14,
            intelligence: 10,
            wisdom: 12,
            charisma: 8
          }
        },
        advancedSettings: {
          plot: true,
          faction: "Defender"
        },
        appearanceProfile: {
          sourceKey: "guard_captain",
          raceModel: "c_guard"
        },
        lookupProfile: {
          soundSetResRef: "ss_guard"
        },
        listCounts: {
          classListCount: 1,
          inventoryItemListCount: 1
        },
        localizedStringRefs: {
          firstName: 9101,
          description: 9102
        },
        localizedStrings: {
          displayName: "Guard Captain"
        },
        classEntries: [{ className: "Fighter", level: 4 }],
        skills: [{ skill: "Discipline", rank: 7 }]
      }
    });
    expect(droppedCreature?.creatureProperties).not.toBe(creatureTemplate.creatureProperties);
    expect(droppedCreature?.creatureProperties?.statistics?.abilityScores).not.toBe(
      creatureTemplate.creatureProperties.statistics?.abilityScores
    );
    expect(droppedCreature?.creatureProperties?.appearanceProfile).not.toBe(
      creatureTemplate.creatureProperties.appearanceProfile
    );
    expect(droppedCreature?.creatureProperties?.lookupProfile).not.toBe(
      creatureTemplate.creatureProperties.lookupProfile
    );
    expect(droppedCreature?.creatureProperties?.listCounts).not.toBe(
      creatureTemplate.creatureProperties.listCounts
    );
    expect(droppedCreature?.creatureProperties?.localizedStringRefs).not.toBe(
      creatureTemplate.creatureProperties.localizedStringRefs
    );
    expect(droppedCreature?.creatureProperties?.localizedStrings).not.toBe(
      creatureTemplate.creatureProperties.localizedStrings
    );
    expect(setSelectedObjectIds).toHaveBeenCalledWith([droppedCreature?.id]);
    expect(setSelectedTileId).toHaveBeenCalledWith(scene.tiles[0]?.id);
  });

  it("keeps an armed panel template active for repeated area tile placement until cancelled", () => {
    const baseScene = createSeedAreaScene();
    const scene: AreaScene = {
      ...baseScene,
      objects: []
    };
    const targetTileId = scene.tiles[0]?.id ?? "tile_0_0";
    const template = {
      ...createNewSceneObject("placeables", 0.5, 0.5, 7),
      id: "plc_template_chair",
      tag: "PLC_TEMPLATE_CHAIR",
      resRef: "plc_chair",
      name: "Template Chair",
      source: {
        type: "aurora_blueprint" as const,
        sourceKind: "placeable" as const,
        sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
        templateId: "plc_plc_chair",
        templateResRef: "plc_chair",
        sourceObjectKey: "modules/current/__aurora/sources/vanilla/templates/plc_chair.utp",
        sourceEtag: "a".repeat(64),
        sourceFileType: "UTP ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff
      },
      placeableProperties: {
        plot: true,
        useable: true,
        hasInventory: false
      }
    };
    const runtimeRef = { current: {} };
    const objectAddRuntimePort: WorkspaceObjectAddRuntimePort<object, object> = {
      clearObjectAddGhost: vi.fn(),
      syncObjectAddGhost: vi.fn(),
      resolveCanvasObjectAddPlacement: vi.fn(() => ({
        x: 4.25,
        y: 5.75,
        tileId: targetTileId
      }))
    };
    const sceneViewportPort = {
      createObject: vi.fn((kind, x, y, sequence) => createNewSceneObject(kind, x, y, sequence)),
      appendObjects: vi.fn((currentScene, objects) => ({
        ...currentScene,
        objects: [...currentScene.objects, ...objects]
      })),
      commitHistory: vi.fn((currentHistory, nextScene) => ({
        past: [...currentHistory.past, currentHistory.present],
        present: nextScene,
        future: []
      })),
      getSceneScale: vi.fn(() => 1)
    } as unknown as SceneViewportPort;
    let history: SceneHistoryState = { past: [], present: scene, future: [] };
    const setSceneHistory = vi.fn((updater: SetStateAction<SceneHistoryState>) => {
      history = typeof updater === "function" ? updater(history) : updater;
    });
    const setSelectedObjectIds = vi.fn();
    const setSelectedTileId = vi.fn();
    const trackTelemetry = vi.fn();
    let handlers: ReturnType<typeof useWorkspaceObjectAddDragDrop<object, object>> | null = null;

    function Harness() {
      handlers = useWorkspaceObjectAddDragDrop({
        runtimeRef,
        objectAddRuntimePort,
        scene,
        sceneViewportPort,
        renderObjectIds: null,
        toolbarState: createWorkspaceChromeFacade().createDefaultToolbarState(),
        workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
        nextObjectSequenceRef: { current: 33 },
        setSceneHistory,
        setSelectedObjectIds,
        setSelectedTileId,
        trackTelemetry,
        userId: "u_builder_001"
      });
      return null;
    }

    render(<Harness />);

    act(() => {
      handlers?.beginObjectAddPlacement(template, 123);
    });
    act(() => {
      handlers?.handleCanvasObjectAddMouseMove({
        clientX: 320,
        clientY: 220,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as unknown as MouseEvent<HTMLDivElement>);
    });

    expect(objectAddRuntimePort.syncObjectAddGhost).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          id: "plc_template_chair",
          kind: "placeables"
        }),
        placementX: 4.25,
        placementY: 5.75,
        isInsideCanvasArea: true
      })
    );

    act(() => {
      handlers?.handleCanvasObjectAddMouseDown({
        button: 0,
        clientX: 320,
        clientY: 220,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as unknown as MouseEvent<HTMLDivElement>);
    });

    const placedObject = history.present.objects[0];
    expect(placedObject).toMatchObject({
      kind: "placeables",
      x: 4.25,
      y: 5.75,
      tag: "PLC_TEMPLATE_CHAIR",
      resRef: "plc_chair",
      name: "Template Chair",
      placeableProperties: {
        plot: true,
        useable: true,
        hasInventory: false
      },
      source: {
        type: "aurora_blueprint",
        sourceKind: "placeable",
        sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
        templateId: "plc_plc_chair",
        templateResRef: "plc_chair",
        sourceObjectKey: "modules/current/__aurora/sources/vanilla/templates/plc_chair.utp",
        sourceEtag: "a".repeat(64)
      }
    });
    expect(setSelectedObjectIds).toHaveBeenCalledWith([placedObject?.id]);
    expect(setSelectedTileId).toHaveBeenCalledWith(targetTileId);
    expect(trackTelemetry).toHaveBeenCalledWith(
      "scene.objects.add_from_panel_placement_started",
      expect.objectContaining({
        sourceTemplateId: "plc_template_chair",
        revision: 123
      })
    );
    expect(trackTelemetry).toHaveBeenCalledWith(
      "scene.objects.add_from_panel",
      expect.objectContaining({
        kind: "placeables",
        source: "click",
        sourceTemplateId: "plc_template_chair"
      })
    );
    expect(handlers?.objectAddPlacementMode).toMatchObject({
      payload: expect.objectContaining({
        id: "plc_template_chair",
        kind: "placeables"
      }),
      revision: 123
    });

    act(() => {
      handlers?.handleCanvasObjectAddMouseDown({
        button: 0,
        clientX: 336,
        clientY: 236,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as unknown as MouseEvent<HTMLDivElement>);
    });

    expect(history.present.objects).toHaveLength(2);
    expect(history.present.objects[1]).toMatchObject({
      kind: "placeables",
      tag: "PLC_TEMPLATE_CHAIR",
      resRef: "plc_chair",
      name: "Template Chair"
    });

    act(() => {
      handlers?.handleCanvasObjectAddMouseDown({
        button: 2,
        clientX: 336,
        clientY: 236,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as unknown as MouseEvent<HTMLDivElement>);
    });

    expect(handlers?.objectAddPlacementMode).toBeNull();
  });

  it("clears armed placement when the user finishes placement manually", () => {
    const scene = createSeedAreaScene();
    const template = {
      ...createNewSceneObject("placeables", 0.5, 0.5, 7),
      id: "plc_template_table",
      tag: "PLC_TEMPLATE_TABLE",
      resRef: "plc_table",
      name: "Template Table"
    };
    const runtimeRef = { current: {} };
    const objectAddRuntimePort: WorkspaceObjectAddRuntimePort<object, object> = {
      clearObjectAddGhost: vi.fn(),
      syncObjectAddGhost: vi.fn(),
      resolveCanvasObjectAddPlacement: vi.fn(() => ({
        x: 2,
        y: 3,
        tileId: scene.tiles[0]?.id ?? null
      }))
    };
    const sceneViewportPort = {
      createObject: vi.fn((kind, x, y, sequence) => createNewSceneObject(kind, x, y, sequence)),
      appendObjects: vi.fn(),
      commitHistory: vi.fn(),
      getSceneScale: vi.fn(() => 1)
    } as unknown as SceneViewportPort;
    const setSceneHistory = vi.fn();
    const setSelectedObjectIds = vi.fn();
    const setSelectedTileId = vi.fn();
    const trackTelemetry = vi.fn();
    let handlers: ReturnType<typeof useWorkspaceObjectAddDragDrop<object, object>> | null = null;

    function Harness() {
      handlers = useWorkspaceObjectAddDragDrop({
        runtimeRef,
        objectAddRuntimePort,
        scene,
        sceneViewportPort,
        renderObjectIds: null,
        toolbarState: createWorkspaceChromeFacade().createDefaultToolbarState(),
        workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
        nextObjectSequenceRef: { current: 44 },
        setSceneHistory,
        setSelectedObjectIds,
        setSelectedTileId,
        trackTelemetry,
        userId: "u_builder_001"
      });
      return null;
    }

    render(<Harness />);

    act(() => {
      handlers?.beginObjectAddPlacement(template, 456);
    });
    expect(handlers?.objectAddPlacementMode).toMatchObject({
      payload: expect.objectContaining({
        id: "plc_template_table",
        kind: "placeables"
      }),
      revision: 456
    });

    act(() => {
      handlers?.cancelObjectAddPlacement("manual");
    });

    expect(handlers?.objectAddPlacementMode).toBeNull();
    expect(objectAddRuntimePort.clearObjectAddGhost).toHaveBeenCalled();
    expect(trackTelemetry).toHaveBeenCalledWith(
      "scene.objects.add_from_panel_placement_cancelled",
      expect.objectContaining({
        reason: "manual",
        revision: 456,
        sourceTemplateId: "plc_template_table"
      })
    );
  });

  it("places an armed item template at the area center while preserving item properties", () => {
    const baseScene = createSeedAreaScene();
    const scene: AreaScene = {
      ...baseScene,
      objects: []
    };
    const template = {
      ...createNewSceneObject("items", 0.5, 0.5, 7),
      id: "itm_template_hide_armor",
      tag: "NW_AARCL008",
      resRef: "aarcl009",
      name: "Hide Armor",
      previewImageUrl: "/api/v1/catalog/items/aarcl009/thumbnail",
      source: {
        type: "aurora_blueprint" as const,
        sourceKind: "item" as const,
        sourceProfileId: "effective-catalog-uti-item-copy-v1",
        templateId: "itm_aarcl009",
        templateResRef: "aarcl009",
        sourceObjectKey:
          "modules/current/__aurora/sources/vanilla/templates/aarcl009.uti",
        sourceSizeBytes: 4096,
        sourceEtag: "a".repeat(64),
        sourceFileType: "UTI ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
      itemProperties: {
        localizedName: "Hide Armor",
        baseItem: 16,
        baseItemLabel: "Armor",
        cost: 19463,
        stackSize: 1,
        identified: true,
        modelPart1: 66,
        armorParts: {
          torso: 43,
          pelvis: 8,
          rShoul: 15,
          lShoul: 15
        },
        materialColors: {
          leather1: 5,
          leather2: 7,
          cloth1: 2,
          cloth2: 3,
          metal1: 17,
          metal2: 8
        },
        propertyList: [
          {
            propertyName: 1,
            propertyLabel: "Armor",
            subtype: 0,
            costValue: 5
          }
        ],
        scripts: {
          onActivate: "itm_hide_activate"
        }
      }
    };
    const runtimeRef = { current: {} };
    const objectAddRuntimePort: WorkspaceObjectAddRuntimePort<object, object> = {
      clearObjectAddGhost: vi.fn(),
      syncObjectAddGhost: vi.fn(),
      resolveCanvasObjectAddPlacement: vi.fn(() => null)
    };
    const sceneViewportPort = {
      createObject: vi.fn((kind, x, y, sequence) => createNewSceneObject(kind, x, y, sequence)),
      appendObjects: vi.fn((currentScene, objects) => ({
        ...currentScene,
        objects: [...currentScene.objects, ...objects]
      })),
      commitHistory: vi.fn((currentHistory, nextScene) => ({
        past: [...currentHistory.past, currentHistory.present],
        present: nextScene,
        future: []
      })),
      getSceneScale: vi.fn(() => 1)
    } as unknown as SceneViewportPort;
    let history: SceneHistoryState = { past: [], present: scene, future: [] };
    const setSceneHistory = vi.fn((updater: SetStateAction<SceneHistoryState>) => {
      history = typeof updater === "function" ? updater(history) : updater;
    });
    const setSelectedObjectIds = vi.fn();
    const setSelectedTileId = vi.fn();
    const trackTelemetry = vi.fn();
    let handlers: ReturnType<typeof useWorkspaceObjectAddDragDrop<object, object>> | null = null;

    function Harness() {
      handlers = useWorkspaceObjectAddDragDrop({
        runtimeRef,
        objectAddRuntimePort,
        scene,
        sceneViewportPort,
        renderObjectIds: null,
        toolbarState: createWorkspaceChromeFacade().createDefaultToolbarState(),
        workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
        nextObjectSequenceRef: { current: 77 },
        setSceneHistory,
        setSelectedObjectIds,
        setSelectedTileId,
        trackTelemetry,
        userId: "u_builder_001"
      });
      return null;
    }

    render(<Harness />);

    act(() => {
      handlers?.beginObjectAddPlacement(template, 394);
    });
    act(() => {
      handlers?.placeObjectAddAtSceneCenter();
    });

    const placedItem = history.present.objects[0];
    expect(placedItem).toMatchObject({
      kind: "items",
      tag: "NW_AARCL008",
      resRef: "aarcl009",
      name: "Hide Armor",
      previewImageUrl: "/api/v1/catalog/items/aarcl009/thumbnail",
      source: {
        type: "aurora_blueprint",
        sourceKind: "item",
        sourceProfileId: "effective-catalog-uti-item-copy-v1",
        templateId: "itm_aarcl009",
        templateResRef: "aarcl009",
        sourceObjectKey:
          "modules/current/__aurora/sources/vanilla/templates/aarcl009.uti",
        sourceSizeBytes: 4096,
        sourceEtag: "a".repeat(64),
        sourceFileType: "UTI ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
      itemProperties: {
        localizedName: "Hide Armor",
        baseItem: 16,
        baseItemLabel: "Armor",
        cost: 19463,
        armorParts: {
          torso: 43,
          pelvis: 8,
          rShoul: 15,
          lShoul: 15
        },
        materialColors: {
          leather1: 5,
          leather2: 7,
          cloth1: 2,
          cloth2: 3,
          metal1: 17,
          metal2: 8
        },
        propertyList: [
          {
            propertyName: 1,
            propertyLabel: "Armor",
            subtype: 0,
            costValue: 5
          }
        ],
        scripts: {
          onActivate: "itm_hide_activate"
        }
      }
    });
    expect(placedItem?.itemProperties).not.toBe(template.itemProperties);
    expect(placedItem?.itemProperties?.armorParts).not.toBe(template.itemProperties.armorParts);
    expect(placedItem?.itemProperties?.materialColors).not.toBe(
      template.itemProperties.materialColors
    );
    expect(placedItem?.itemProperties?.propertyList).not.toBe(template.itemProperties.propertyList);
    expect(placedItem?.x).toBeGreaterThanOrEqual(0);
    expect(placedItem?.y).toBeGreaterThanOrEqual(0);
    expect(setSelectedObjectIds).toHaveBeenCalledWith([placedItem?.id]);
    expect(setSelectedTileId).toHaveBeenCalledWith(expect.any(String));
    expect(trackTelemetry).toHaveBeenCalledWith(
      "scene.objects.add_from_panel",
      expect.objectContaining({
        kind: "items",
        source: "click",
        sourceTemplateId: "itm_template_hide_armor"
      })
    );
    expect(handlers?.objectAddDropFeedback).toEqual({
      variant: "success",
      message: "Placed NW_AARCL008 at area center. Click another tile or press Esc."
    });
  });

  it("shows clear ASCII feedback when armed placement misses an area tile", () => {
    const scene = createSeedAreaScene();
    const template = {
      ...createNewSceneObject("placeables", 0.5, 0.5, 7),
      id: "plc_template_chair",
      tag: "PLC_TEMPLATE_CHAIR",
      resRef: "plc_chair",
      name: "Template Chair"
    };
    const runtimeRef = { current: {} };
    const objectAddRuntimePort: WorkspaceObjectAddRuntimePort<object, object> = {
      clearObjectAddGhost: vi.fn(),
      syncObjectAddGhost: vi.fn(),
      resolveCanvasObjectAddPlacement: vi.fn(() => ({
        x: 4.25,
        y: 5.75,
        tileId: null
      }))
    };
    const sceneViewportPort = {
      createObject: vi.fn((kind, x, y, sequence) => createNewSceneObject(kind, x, y, sequence)),
      appendObjects: vi.fn(),
      commitHistory: vi.fn(),
      getSceneScale: vi.fn(() => 1)
    } as unknown as SceneViewportPort;
    const setSceneHistory = vi.fn();
    const setSelectedObjectIds = vi.fn();
    const setSelectedTileId = vi.fn();
    const trackTelemetry = vi.fn();
    let handlers: ReturnType<typeof useWorkspaceObjectAddDragDrop<object, object>> | null = null;

    function Harness() {
      handlers = useWorkspaceObjectAddDragDrop({
        runtimeRef,
        objectAddRuntimePort,
        scene,
        sceneViewportPort,
        renderObjectIds: null,
        toolbarState: createWorkspaceChromeFacade().createDefaultToolbarState(),
        workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
        nextObjectSequenceRef: { current: 33 },
        setSceneHistory,
        setSelectedObjectIds,
        setSelectedTileId,
        trackTelemetry,
        userId: "u_builder_001"
      });
      return null;
    }

    render(<Harness />);

    act(() => {
      handlers?.beginObjectAddPlacement(template, 123);
    });
    act(() => {
      handlers?.handleCanvasObjectAddMouseDown({
        button: 0,
        clientX: 320,
        clientY: 220,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as unknown as MouseEvent<HTMLDivElement>);
    });

    expect(handlers?.objectAddDropFeedback).toEqual({
      variant: "warning",
      message: "Click directly on an area tile to place the object."
    });
    expect(handlers?.objectAddDropFeedback?.message).toMatch(/^[\x20-\x7E]+$/u);
    expect(setSceneHistory).not.toHaveBeenCalled();
  });
});
