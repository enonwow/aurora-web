import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWorkspaceObjectCommands } from "../../../../src/modules/layout/application/useWorkspaceObjectCommands";
import { createWorkspaceChromeFacade } from "../../../../src/modules/layout/application/workspaceChromeFacade";
import { DEFAULT_WORKSPACE_OPTION_SETTINGS } from "../../../../src/modules/layout/workspaceOptionSettings";
import type { SceneViewportPort } from "../../../../src/modules/scene/application/sceneViewportPort";
import { createNewSceneObject, createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";

describe("useWorkspaceObjectCommands hook-bound doors", () => {
  it("never duplicates a door through the generic copy constructor", () => {
    const door = createNewSceneObject("doors", 0.5, 0.5, 1);
    const scene = { ...createSeedAreaScene(), objects: [door] };
    const createObject = vi.fn();
    const trackTelemetry = vi.fn();
    createObject.mockImplementation((kind, x, y, sequence) => createNewSceneObject(kind, x, y, sequence));
    const appendObjects = vi.fn((currentScene, objects) => ({
      ...currentScene,
      objects: [...currentScene.objects, ...objects],
    }));
    const commitHistory = vi.fn((history, nextScene) => ({
      past: [...history.past, history.present],
      present: nextScene,
      future: [],
    }));
    const sceneViewportPort = {
      createObject,
      resolveCopyAnchor: vi.fn(() => ({ x: 1, y: 1 })),
      computeCopyTranslation: vi.fn(() => ({ x: 0.5, y: 0.5 })),
      appendObjects,
      commitHistory,
    } as unknown as SceneViewportPort;
    const setSceneHistory = vi.fn();
    const hook = renderHook(() => useWorkspaceObjectCommands({
      scene,
      visibleObjects: scene.objects,
      sceneViewportPort,
      selectedObjectIds: [door.id],
      setSelectedObjectIds: vi.fn(),
      setSelectedTileId: vi.fn(),
      setSceneHistory,
      toolbarState: createWorkspaceChromeFacade().createDefaultToolbarState(),
      workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
      userId: "u_builder_001",
      lastPointerWorldRef: { current: { x: 1, y: 1 } },
      nextObjectSequenceRef: { current: 2 },
      clipboardObjectsRef: { current: [] },
      trackTelemetry,
    }));

    let copies = [door];
    act(() => {
      copies = hook.result.current.duplicateObjects([door], "keyboard");
    });

    expect(copies).toEqual([]);
    expect(createObject).not.toHaveBeenCalled();
    expect(setSceneHistory).not.toHaveBeenCalled();
    expect(trackTelemetry).toHaveBeenCalledWith(
      "scene.objects.copy_blocked_door_hook",
      expect.objectContaining({ source: "keyboard", blockedCount: 1 }),
    );

    const placeable = createNewSceneObject("placeables", 0.25, 0.25, 3);
    act(() => {
      copies = hook.result.current.duplicateObjects([door, placeable], "mixed");
    });
    expect(copies).toHaveLength(1);
    expect(copies[0]).toMatchObject({ kind: "placeables" });
    expect(createObject).toHaveBeenCalledTimes(1);
    expect(trackTelemetry).toHaveBeenCalledWith(
      "scene.objects.copy_blocked_door_hook",
      expect.objectContaining({ source: "mixed", blockedCount: 1 }),
    );

    trackTelemetry.mockClear();
    act(() => {
      copies = hook.result.current.duplicateObjects([placeable], "placeable_only");
    });
    expect(copies).toHaveLength(1);
    expect(trackTelemetry).not.toHaveBeenCalledWith(
      "scene.objects.copy_blocked_door_hook",
      expect.anything(),
    );

    act(() => {
      copies = hook.result.current.duplicateObjects([], "empty");
    });
    expect(copies).toEqual([]);
    expect(trackTelemetry).toHaveBeenCalledWith(
      "scene.objects.copy_skipped",
      expect.objectContaining({ source: "empty", reason: "empty_source" }),
    );
  });
});
