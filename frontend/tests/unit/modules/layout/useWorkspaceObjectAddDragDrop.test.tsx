import { act, render } from "@testing-library/react";
import type { DragEvent, MouseEvent, SetStateAction } from "react";
import { createWorkspaceChromeFacade } from "../../../../src/modules/layout/application/workspaceChromeFacade";
import {
  serializeObjectAddPayload,
  type ObjectAddDragPayload
} from "../../../../src/modules/layout/application/objectAddDragPayload";
import { DEFAULT_WORKSPACE_OPTION_SETTINGS } from "../../../../src/modules/layout/workspaceOptionSettings";
import { useWorkspaceObjectAddDragDrop } from "../../../../src/modules/layout/components/useWorkspaceObjectAddDragDrop";
import type { AreaScene, SceneHistoryState } from "../../../../src/modules/layout/contracts";
import type { SceneViewportPort } from "../../../../src/modules/scene/application/sceneViewportPort";
import { createNewSceneObject, createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";
import type { WorkspaceObjectAddRuntimePort } from "../../../../src/modules/layout/ports/workspaceRenderRuntimePort";

describe("useWorkspaceObjectAddDragDrop", () => {
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
      }
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
