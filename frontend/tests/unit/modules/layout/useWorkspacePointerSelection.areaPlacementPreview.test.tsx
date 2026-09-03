import { act, fireEvent, renderHook } from "@testing-library/react";
import { useCallback, useState } from "react";
import type { MouseEvent, SetStateAction } from "react";
import { describe, expect, it, vi } from "vitest";
import { createViewportFacade } from "../../../../src/modules/layout/application/viewportFacade";
import { buildAreaTileCatalogCertificationKey } from "../../../../src/modules/areas/application/areaTileCatalogFilter";
import type { AreaTileProductionCertificationSource } from "../../../../src/modules/areas/application/areaTileProductionPlacementAdmission";
import type { TileCertificationProofs } from "../../../../src/modules/areas/domain/tileCertificationPolicy";
import {
  createAuroraAreaPlacementSelector,
  resolveAuroraAreaBoxSelection,
  resolveAuroraAreaConnectedTerrainSelection,
  resolveAuroraAreaInspectSelection,
  useWorkspacePointerSelection
} from "../../../../src/modules/layout/application/useWorkspacePointerSelection";
import { createWorkspaceChromeFacade } from "../../../../src/modules/layout/application/workspaceChromeFacade";
import type {
  AreaScene,
  AuroraAreaEditingTool,
  SceneHistoryState
} from "../../../../src/modules/layout/contracts";
import type { WorkspacePointerRuntimePort } from "../../../../src/modules/layout/ports/workspaceRenderRuntimePort";
import { DEFAULT_WORKSPACE_OPTION_SETTINGS } from "../../../../src/modules/layout/workspaceOptionSettings";
import type { SceneViewportPort } from "../../../../src/modules/scene/application/sceneViewportPort";
import {
  createAuroraAreaEditingState,
  applyTerrainStroke,
  type AuroraAreaTilesetDefinition
} from "../../../../src/modules/scene/domain/auroraAreaEditing";
import { undoSceneHistory } from "../../../../src/modules/scene/domain/sceneHistory";
import {
  applyAuroraAreaCrosserBrush,
  applyAuroraAreaHeightBrush,
  applyAuroraAreaTerrainBrush,
  applyAuroraAreaEditingStateToScene,
  placeAuroraAreaGroupAtSceneTile
} from "../../../../src/modules/scene/domain/auroraAreaEditingSceneMapper";
import { createNewSceneObject, createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";

const allCorners = (terrain: string) => ({
  topLeft: terrain,
  topRight: terrain,
  bottomRight: terrain,
  bottomLeft: terrain
});

const allHeights = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
const heightTransitionTiles = Array.from({ length: 15 }, (_, index) => {
  const mask = index + 1;
  return {
    tileId: 100 + mask,
    terrain: allCorners("grass"),
    crossers: {},
    cornerHeights: {
      topLeft: mask & 1 ? 1 : 0,
      topRight: mask & 2 ? 1 : 0,
      bottomRight: mask & 4 ? 1 : 0,
      bottomLeft: mask & 8 ? 1 : 0
    }
  };
});

const definition: AuroraAreaTilesetDefinition = {
  tilesetResRef: "testset",
  fingerprint: "a".repeat(64),
  defaultTerrain: "grass",
  transitionRules: [
    {
      placedTerrain: "water",
      placedHeight: 0,
      adjacentTerrain: "grass",
      adjacentHeight: 0,
      changedTerrain: "water",
      changedHeight: 0
    }
  ],
  tiles: [
    { tileId: 0, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights },
    { tileId: 1, terrain: allCorners("water"), crossers: {}, cornerHeights: allHeights },
    { tileId: 4, terrain: allCorners("water"), crossers: {}, cornerHeights: allHeights },
    { tileId: 5, terrain: allCorners("grass"), crossers: { right: "road" }, cornerHeights: allHeights },
    { tileId: 6, terrain: allCorners("grass"), crossers: { left: "road" }, cornerHeights: allHeights },
    ...heightTransitionTiles,
    { tileId: 2, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights, groupId: "group0" },
    { tileId: 3, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights, groupId: "group0" }
  ],
  crosserTypes: [{ id: "road", name: "Road" }],
  groups: [{ id: "group0", name: "Two tile building", rows: 1, columns: 2, tileIds: [2, 3] }]
};

const renderReadyProofs: TileCertificationProofs = {
  inventory: "verified",
  assetClosure: "verified",
  render: "verified",
  visualSeam: "missing",
  setAdjacency: "missing",
  pathReference: "missing",
  pathConnect: "missing",
  wokSeam: "missing",
  persistence: "missing",
  toolset: "missing",
  nwnRuntime: "missing"
};

function readyProductionCertification(
  includedTileIds = definition.tiles.map((tile) => tile.tileId)
): AreaTileProductionCertificationSource {
  return {
    status: "ready",
    tilesetResRef: definition.tilesetResRef,
    index: new Map(includedTileIds.map((tileId) => [
      buildAreaTileCatalogCertificationKey(definition.tilesetResRef, tileId),
      {
        rowId: `tile:${definition.tilesetResRef}:${tileId}`,
        eligibility: { status: "eligible" as const },
        proofs: renderReadyProofs
      }
    ]))
  };
}

type PointerRay = { x: number; y: number };

function createEditableScene(selectedGroupId?: string): AreaScene {
  const initial = createAuroraAreaEditingState({
    areaResRef: "area_test",
    width: 2,
    height: 2,
    definition,
    selector: () => 0
  });
  if (!initial.ok) {
    throw new Error(initial.message);
  }
  const scene = applyAuroraAreaEditingStateToScene(
    { ...createSeedAreaScene(2, 2), sceneId: "area_test", areaName: "Test Area", objects: [] },
    initial.state,
    definition,
    "water"
  );
  return selectedGroupId
    ? {
        ...scene,
        auroraAreaEditing: {
          ...scene.auroraAreaEditing!,
          selectedGroupId,
          groupOrientation: 0
        }
      }
    : scene;
}

function pointerEvent(x: number, y: number, button = 0, buttons = 0): MouseEvent<HTMLDivElement> {
  return { clientX: x, clientY: y, button, buttons, nativeEvent: {} } as MouseEvent<HTMLDivElement>;
}

function createPointerRuntimePort(): WorkspacePointerRuntimePort<object, PointerRay> {
  return {
    setOrbitPointerBindings: vi.fn(),
    setControlsEnabled: vi.fn(),
    isTransformInteractionActive: vi.fn(() => false),
    isTransformDragging: vi.fn(() => false),
    pointerToLocal: vi.fn((_, event) => ({ x: event.clientX, y: event.clientY })),
    pointerToRay: vi.fn((_, event) => ({ x: event.clientX, y: event.clientY })),
    intersectionOnGround: vi.fn((_, ray) => ray),
    worldToScreen: vi.fn(() => ({ x: 0, y: 0 })),
    resolveContextMenuAnchorScreen: vi.fn(() => ({ x: 0, y: 0 })),
    findFirstObjectHitId: vi.fn(() => null)
  };
}

function renderPointerSelection(
  scene: AreaScene,
  areaEditingTool: AuroraAreaEditingTool = { kind: "terrain", terrain: "water" },
  selectionMode: "terrain" | "object" = "terrain",
  objectBrush: "placeables" | "creatures" | "doors" = "placeables",
  tileProductionCertification: AreaTileProductionCertificationSource =
    readyProductionCertification()
) {
  const syncAuroraAreaPlacementPreview = vi.fn();
  const clearAuroraAreaPlacementPreview = vi.fn();
  const onAuroraAreaEditingFeedback = vi.fn();
  const pointerRuntimePort = createPointerRuntimePort();
  const applyAuroraAreaTerrainBrushSpy = vi.fn(applyAuroraAreaTerrainBrush);
  const applyAuroraAreaCrosserBrushSpy = vi.fn(applyAuroraAreaCrosserBrush);
  const applyAuroraAreaHeightBrushSpy = vi.fn(applyAuroraAreaHeightBrush);
  const placeAuroraAreaGroupSpy = vi.fn(placeAuroraAreaGroupAtSceneTile);
  const trackTelemetry = vi.fn();
  const commitHistory = vi.fn((history: SceneHistoryState, nextScene: AreaScene) => ({
    past: [...history.past, history.present],
    present: nextScene,
    future: []
  }));
  const createObject = vi.fn();
  const createDoorAtHook = vi.fn(() => undefined);
  const appendObjects = vi.fn();
  const sceneViewportPort = {
    applyAuroraAreaTerrainBrush: applyAuroraAreaTerrainBrushSpy,
    applyAuroraAreaCrosserBrush: applyAuroraAreaCrosserBrushSpy,
    applyAuroraAreaHeightBrush: applyAuroraAreaHeightBrushSpy,
    placeAuroraAreaGroup: placeAuroraAreaGroupSpy,
    commitHistory,
    createObject,
    createDoorAtHook,
    appendObjects
  } as unknown as SceneViewportPort;
  let history: SceneHistoryState = { past: [], present: scene, future: [] };
  const setSceneHistory = vi.fn((updater: SetStateAction<SceneHistoryState>) => {
    history = typeof updater === "function" ? updater(history) : updater;
  });
  const toolbarState = {
    ...createWorkspaceChromeFacade().createDefaultToolbarState(),
    selectionMode
  };

  const setSelectedTileId = vi.fn();
  const hook = renderHook(({ currentScene }: { currentScene: AreaScene }) =>
    useWorkspacePointerSelection<object, PointerRay>({
      runtimeRef: { current: {} },
      pointerRuntimePort,
      anchoredOverlayRuntimePort: {} as never,
      scene: currentScene,
      sceneViewportPort,
      viewportFacade: createViewportFacade(),
      visibleObjects: [],
      selectedObjectIds: [],
      selectionBox: { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 },
      setSelectionBox: vi.fn(),
      setSelectedObjectIds: vi.fn(),
      setSelectedTileId,
      setSceneHistory,
      setContextMenu: vi.fn(),
      toolbarState,
      workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
      objectBrush,
      terrainBrush: "water",
      areaEditingTool,
      tileProductionCertification,
      syncAuroraAreaPlacementPreview,
      clearAuroraAreaPlacementPreview,
      onAuroraAreaEditingFeedback,
      lastPointerWorldRef: { current: null },
      nextObjectSequenceRef: { current: 1 },
      isSelectableByActiveFilters: () => true,
      moveSelectedObjectsByDelta: () => 0,
      trackTelemetry,
      userId: "u_builder_001"
    }), { initialProps: { currentScene: scene } }
  );

  clearAuroraAreaPlacementPreview.mockClear();
  return {
    ...hook,
    syncAuroraAreaPlacementPreview,
    clearAuroraAreaPlacementPreview,
    onAuroraAreaEditingFeedback,
    applyAuroraAreaTerrainBrushSpy,
    applyAuroraAreaCrosserBrushSpy,
    applyAuroraAreaHeightBrushSpy,
    placeAuroraAreaGroupSpy,
    commitHistory,
    createObject,
    createDoorAtHook,
    appendObjects,
    trackTelemetry,
    setSceneHistory,
    setSelectedTileId,
    get history() {
      return history;
    }
  };
}

function renderAreaMarquee(
  initialTileIds: string[] = [],
  scene: AreaScene = createEditableScene()
) {
  const pointerRuntimePort = createPointerRuntimePort();
  vi.mocked(pointerRuntimePort.worldToScreen).mockImplementation((_, x, y) => ({
    x: x * 100,
    y: y * 100
  }));
  const setSceneHistory = vi.fn();
  const trackTelemetry = vi.fn();
  const hook = renderHook(() => {
    const [selectionBox, setSelectionBox] = useState({
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    });
    const [selectedObjectIds, setSelectedObjectIds] = useState(["object_1"]);
    const [tileSelection, setTileSelection] = useState({
      anchorId: initialTileIds.at(-1) ?? null,
      ids: initialTileIds
    });
    const setSelectedTileId = useCallback((value: SetStateAction<string | null>) => {
      setTileSelection((current) => {
        const next = typeof value === "function" ? value(current.anchorId) : value;
        return { anchorId: next, ids: next ? [next] : [] };
      });
    }, []);
    const setSelectedTileIds = useCallback((value: SetStateAction<string[]>) => {
      setTileSelection((current) => {
        const ids = typeof value === "function" ? value(current.ids) : value;
        const anchorId = ids.at(-1) ?? null;
        return current.anchorId === anchorId &&
          current.ids.length === ids.length &&
          current.ids.every((id, index) => id === ids[index])
          ? current
          : { anchorId, ids };
      });
    }, []);
    const handlers = useWorkspacePointerSelection<object, PointerRay>({
      runtimeRef: { current: {} },
      pointerRuntimePort,
      anchoredOverlayRuntimePort: {} as never,
      scene,
      sceneViewportPort: { commitHistory: vi.fn() } as unknown as SceneViewportPort,
      viewportFacade: createViewportFacade(),
      visibleObjects: [],
      selectedObjectIds,
      selectedTileIds: tileSelection.ids,
      selectionBox,
      setSelectionBox,
      setSelectedObjectIds,
      setSelectedTileId,
      setSelectedTileIds,
      setSceneHistory,
      setContextMenu: vi.fn(),
      toolbarState: {
        ...createWorkspaceChromeFacade().createDefaultToolbarState(),
        selectionMode: "terrain"
      },
      workspaceOptions: DEFAULT_WORKSPACE_OPTION_SETTINGS,
      objectBrush: "placeables",
      terrainBrush: "water",
      areaEditingTool: { kind: "inspect" },
      tileProductionCertification: readyProductionCertification(),
      lastPointerWorldRef: { current: null },
      nextObjectSequenceRef: { current: 1 },
      isSelectableByActiveFilters: () => true,
      moveSelectedObjectsByDelta: () => 0,
      trackTelemetry,
      userId: "u_builder_001"
    });
    return { handlers, selectionBox, selectedObjectIds, tileSelection };
  });
  return { ...hook, scene, setSceneHistory, trackTelemetry };
}

describe("useWorkspacePointerSelection Aurora Area placement preview", () => {
  it("toggles arbitrary inspect tiles additively without duplicating IDs", () => {
    expect(resolveAuroraAreaInspectSelection(["tile-a"], "tile-b", true)).toEqual([
      "tile-a",
      "tile-b"
    ]);
    expect(resolveAuroraAreaInspectSelection(["tile-a", "tile-b"], "tile-a", true)).toEqual([
      "tile-b"
    ]);
    expect(resolveAuroraAreaInspectSelection(["tile-a", "tile-b"], "tile-c", false)).toEqual([
      "tile-c"
    ]);
  });
  it("resolves deterministic replace and additive box selections", () => {
    expect(resolveAuroraAreaBoxSelection(["old"], ["tile-a", "tile-b"], "replace"))
      .toEqual(["tile-a", "tile-b"]);
    expect(resolveAuroraAreaBoxSelection(["old"], ["tile-a", "tile-b"], "add"))
      .toEqual(["old", "tile-a", "tile-b"]);
  });
  it("resolves only the deterministic four-neighbour terrain component and retains the anchor", () => {
    const scene = createEditableScene();
    const anchor = scene.tiles.find((tile) => tile.row === 0 && tile.col === 0)!;
    const tiles = [
      ...scene.tiles.map((tile) => ({
        ...tile,
        terrain: tile.row === 1 && tile.col === 0 ? "water" as const : "grass" as const
      })),
      {
        ...anchor,
        id: "diagonal-only",
        row: 2,
        col: 0,
        terrain: "grass" as const
      }
    ];

    expect(resolveAuroraAreaConnectedTerrainSelection(tiles, anchor.id)).toEqual([
      scene.tiles.find((tile) => tile.row === 0 && tile.col === 1)!.id,
      scene.tiles.find((tile) => tile.row === 1 && tile.col === 1)!.id,
      anchor.id
    ]);
    expect(resolveAuroraAreaConnectedTerrainSelection(tiles, "missing")).toEqual([]);
    expect(resolveAuroraAreaConnectedTerrainSelection(
      [...tiles, { ...anchor, id: "duplicate-cell" }],
      anchor.id
    )).toEqual([]);
  });
  it("selects the connected terrain region on inspect double click without scene history", () => {
    const source = createEditableScene();
    const scene = {
      ...source,
      tiles: source.tiles.map((tile) => ({
        ...tile,
        terrain: tile.row === 1 && tile.col === 0 ? "water" as const : "grass" as const
      }))
    };
    const anchor = scene.tiles.find((tile) => tile.row === 0 && tile.col === 0)!;
    const mounted = renderAreaMarquee([], scene);

    act(() => mounted.result.current.handlers.handleDoubleClick(
      pointerEvent(anchor.col + 0.25, anchor.row + 0.25)
    ));

    expect(mounted.result.current.tileSelection.anchorId).toBe(anchor.id);
    expect(new Set(mounted.result.current.tileSelection.ids)).toEqual(new Set([
      anchor.id,
      scene.tiles.find((tile) => tile.row === 0 && tile.col === 1)!.id,
      scene.tiles.find((tile) => tile.row === 1 && tile.col === 1)!.id
    ]));
    expect(mounted.result.current.selectedObjectIds).toEqual([]);
    expect(mounted.setSceneHistory).not.toHaveBeenCalled();
    expect(mounted.trackTelemetry).toHaveBeenCalledWith(
      "scene.area_tiles.selection.connected_terrain",
      expect.objectContaining({
        anchorTileId: anchor.id,
        selectedCount: 3
      })
    );
  });
  it("selects intersecting Area cells with Shift marquee without mutating scene history", () => {
    const mounted = renderAreaMarquee();
    act(() => mounted.result.current.handlers.handleMouseDown({
      ...pointerEvent(10, 10),
      shiftKey: true
    } as MouseEvent<HTMLDivElement>));
    act(() => mounted.result.current.handlers.handleMouseMove(pointerEvent(190, 90, 0, 1)));
    act(() => mounted.result.current.handlers.handleMouseUp(pointerEvent(190, 90)));

    const expectedIds = mounted.scene.tiles
      .filter((tile) => tile.row === 0)
      .map((tile) => tile.id);
    expect(mounted.result.current.tileSelection).toEqual({
      anchorId: expectedIds.at(-1),
      ids: expectedIds
    });
    expect(mounted.result.current.selectedObjectIds).toEqual([]);
    expect(mounted.setSceneHistory).not.toHaveBeenCalled();
    expect(mounted.result.current.selectionBox.active).toBe(false);
  });
  it("adds marquee tiles with Ctrl and keeps a deterministic final anchor", () => {
    const scene = createEditableScene();
    const existingId = scene.tiles.find((tile) => tile.row === 1 && tile.col === 0)!.id;
    const mounted = renderAreaMarquee([existingId]);
    act(() => mounted.result.current.handlers.handleMouseDown({
      ...pointerEvent(10, 10),
      shiftKey: true
    } as MouseEvent<HTMLDivElement>));
    act(() => mounted.result.current.handlers.handleMouseMove(pointerEvent(190, 90, 0, 1)));
    act(() => mounted.result.current.handlers.handleMouseUp({
      ...pointerEvent(190, 90),
      ctrlKey: true
    } as MouseEvent<HTMLDivElement>));

    const addedIds = mounted.scene.tiles
      .filter((tile) => tile.row === 0)
      .map((tile) => tile.id);
    expect(mounted.result.current.tileSelection).toEqual({
      anchorId: addedIds.at(-1),
      ids: [existingId, ...addedIds]
    });
    expect(mounted.setSceneHistory).not.toHaveBeenCalled();
  });
  it("previews and commits a crosser on the nearest half-grid edge exactly once", () => {
    const mounted = renderPointerSelection(
      createEditableScene(),
      { kind: "crosser", crosser: "road" },
      "object"
    );

    act(() => {
      mounted.result.current.handleMouseMove(pointerEvent(0.95, 0.5));
      mounted.result.current.handleMouseDown(pointerEvent(0.95, 0.5));
    });

    expect(mounted.syncAuroraAreaPlacementPreview).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        cells: [
          { row: 0, col: 0, valid: true, elevation: 0 },
          { row: 0, col: 1, valid: true, elevation: 0 }
        ]
      })
    );
    expect(mounted.applyAuroraAreaCrosserBrushSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      "right",
      "road",
      expect.any(Function)
    );
    expect(mounted.commitHistory).toHaveBeenCalledOnce();
  });

  it("keeps raise/lower hover ephemeral and commits one successful height click", () => {
    const mounted = renderPointerSelection(
      createEditableScene(),
      { kind: "height", delta: 1 },
      "object"
    );
    act(() => mounted.result.current.handleMouseMove(pointerEvent(0.25, 0.25)));
    expect(mounted.commitHistory).not.toHaveBeenCalled();

    act(() => mounted.result.current.handleMouseDown(pointerEvent(0.25, 0.25)));
    expect(mounted.applyAuroraAreaHeightBrushSpy).toHaveBeenCalledOnce();
    expect(mounted.commitHistory).toHaveBeenCalledOnce();
  });

  it("shows a red lower preview at height zero and does not commit", () => {
    const mounted = renderPointerSelection(
      createEditableScene(),
      { kind: "height", delta: -1 },
      "object"
    );
    act(() => {
      mounted.result.current.handleMouseMove(pointerEvent(0.25, 0.25));
      mounted.result.current.handleMouseDown(pointerEvent(0.25, 0.25));
    });
    expect(mounted.syncAuroraAreaPlacementPreview).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ cells: [{ row: 0, col: 0, valid: false, elevation: 0 }] })
    );
    expect(mounted.applyAuroraAreaHeightBrushSpy).not.toHaveBeenCalled();
    expect(mounted.commitHistory).not.toHaveBeenCalled();
    expect(mounted.onAuroraAreaEditingFeedback).toHaveBeenLastCalledWith({
      variant: "error",
      message: "Tile height is already at Aurora's minimum of 0."
    });
  });
  it("keeps Select Terrain in inspect mode selection-only", () => {
    const scene = createEditableScene();
    const mounted = renderPointerSelection(scene, { kind: "inspect" });

    act(() => {
      mounted.result.current.handleMouseMove(pointerEvent(0.25, 0.25));
      mounted.result.current.handleMouseDown(pointerEvent(0.25, 0.25));
    });

    expect(mounted.syncAuroraAreaPlacementPreview).not.toHaveBeenCalled();
    expect(mounted.setSelectedTileId).toHaveBeenLastCalledWith(scene.tiles[0]?.id);
    expect(mounted.applyAuroraAreaTerrainBrushSpy).not.toHaveBeenCalled();
    expect(mounted.placeAuroraAreaGroupSpy).not.toHaveBeenCalled();
    expect(mounted.setSceneHistory).not.toHaveBeenCalled();
    expect(mounted.history.present).toBe(scene);
  });

  it("syncs a valid hover preview without creating a history entry", () => {
    const mounted = renderPointerSelection(createEditableScene());

    act(() => {
      mounted.result.current.handleMouseMove(pointerEvent(0.25, 0.25));
    });

    expect(mounted.syncAuroraAreaPlacementPreview).toHaveBeenCalledOnce();
    expect(mounted.syncAuroraAreaPlacementPreview).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        cells: [
          { row: 0, col: 0, valid: true, elevation: 0 },
          { row: 0, col: 1, valid: true, elevation: 0 },
          { row: 1, col: 0, valid: true, elevation: 0 },
          { row: 1, col: 1, valid: true, elevation: 0 }
        ]
      })
    );
    expect(mounted.setSceneHistory).not.toHaveBeenCalled();
    expect(mounted.commitHistory).not.toHaveBeenCalled();
  });

  it("lets an armed Aurora palette brush paint even when the object selection mode was previously active", () => {
    const mounted = renderPointerSelection(
      createEditableScene(),
      { kind: "terrain", terrain: "water" },
      "object"
    );

    act(() => {
      mounted.result.current.handleMouseMove(pointerEvent(0.25, 0.25));
      mounted.result.current.handleMouseDown(pointerEvent(0.25, 0.25));
    });

    expect(mounted.syncAuroraAreaPlacementPreview).toHaveBeenCalledTimes(2);
    expect(mounted.applyAuroraAreaTerrainBrushSpy).toHaveBeenCalledOnce();
    expect(mounted.commitHistory).toHaveBeenCalledOnce();
  });

  it("commits a valid left mouse-down exactly once", () => {
    const mounted = renderPointerSelection(createEditableScene());

    act(() => {
      mounted.result.current.handleMouseDown(pointerEvent(0.25, 0.25));
    });

    expect(mounted.setSceneHistory).toHaveBeenCalledOnce();
    expect(mounted.applyAuroraAreaTerrainBrushSpy).toHaveBeenCalledOnce();
    expect(mounted.commitHistory).toHaveBeenCalledOnce();
    expect(mounted.history.past).toHaveLength(1);
    expect(mounted.history.present).not.toBe(createEditableScene());
  });

  it("fails closed before history mutation while certification is unavailable", () => {
    const scene = createEditableScene();
    const mounted = renderPointerSelection(
      scene,
      { kind: "terrain", terrain: "water" },
      "object",
      "placeables",
      {
        status: "unavailable",
        tilesetResRef: definition.tilesetResRef,
        reasonCode: "LOAD_FAILED"
      }
    );

    act(() => mounted.result.current.handleMouseMove(pointerEvent(0.25, 0.25)));
    expect(mounted.syncAuroraAreaPlacementPreview).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({
        cells: expect.arrayContaining([
          expect.objectContaining({ valid: false })
        ])
      })
    );
    act(() => mounted.result.current.handleMouseDown(pointerEvent(0.25, 0.25)));
    act(() => mounted.result.current.handleMouseMove(pointerEvent(1.25, 0.25, 0, 1)));
    act(() => mounted.result.current.handleMouseUp(pointerEvent(1.25, 0.25)));

    expect(mounted.applyAuroraAreaTerrainBrushSpy).not.toHaveBeenCalled();
    expect(mounted.commitHistory).not.toHaveBeenCalled();
    expect(mounted.history).toEqual({ past: [], present: scene, future: [] });
    expect(mounted.history.present).toBe(scene);
    expect(mounted.onAuroraAreaEditingFeedback).toHaveBeenLastCalledWith({
      variant: "error",
      message: expect.stringContaining("AREA_TILE_CERTIFICATION_UNAVAILABLE")
    });
    expect(mounted.trackTelemetry).toHaveBeenCalledWith(
      "scene.area_tiles.production_admission.blocked",
      expect.objectContaining({
        code: "AREA_TILE_CERTIFICATION_UNAVAILABLE",
        operationKind: "terrain",
        tilesetResRef: "testset"
      })
    );
  });

  it("rejects a mixed SET group candidate atomically when one result Tile_ID has no row", () => {
    const scene = createEditableScene("group0");
    const mounted = renderPointerSelection(
      scene,
      { kind: "group", groupId: "group0", orientation: 0 },
      "object",
      "placeables",
      readyProductionCertification([0, 2])
    );

    act(() => mounted.result.current.handleMouseDown(pointerEvent(0.25, 0.25)));

    expect(mounted.placeAuroraAreaGroupSpy).not.toHaveBeenCalled();
    expect(mounted.commitHistory).not.toHaveBeenCalled();
    expect(mounted.history.present).toBe(scene);
    expect(mounted.onAuroraAreaEditingFeedback).toHaveBeenLastCalledWith({
      variant: "error",
      message: expect.stringMatching(/AREA_TILE_CERTIFICATION_ROW_MISSING.*Tile_ID 3/)
    });
  });

  it("commits a multi-cell paint drag as one history command", () => {
    const scene = createEditableScene();
    const mounted = renderPointerSelection(scene);
    mounted.applyAuroraAreaTerrainBrushSpy.mockImplementation((currentScene, tileId) => ({
      ...currentScene,
      areaName: `${currentScene.areaName}:${tileId}`
    }));

    act(() => mounted.result.current.handleMouseDown(pointerEvent(0.25, 0.25)));
    act(() => mounted.result.current.handleMouseMove(pointerEvent(1.25, 0.25, 0, 1)));
    act(() => mounted.result.current.handleMouseUp(pointerEvent(1.25, 0.25)));

    expect(mounted.applyAuroraAreaTerrainBrushSpy).toHaveBeenCalledTimes(2);
    expect(mounted.commitHistory).toHaveBeenCalledOnce();
    expect(mounted.history.past).toHaveLength(1);
    expect(mounted.history.present.areaName).toContain(
      scene.tiles.find((tile) => tile.row === 0 && tile.col === 0)!.id
    );
    expect(mounted.history.present.areaName).toContain(
      scene.tiles.find((tile) => tile.row === 0 && tile.col === 1)!.id
    );
  });

  it("keeps the admitted prefix and rejects a later uncertified drag candidate atomically", () => {
    const scene = createEditableScene();
    const mounted = renderPointerSelection(
      scene,
      { kind: "terrain", terrain: "water" },
      "object",
      "placeables",
      readyProductionCertification([0, 1, 4]),
    );
    let mutationCount = 0;
    mounted.applyAuroraAreaTerrainBrushSpy.mockImplementation(
      (currentScene, tileId, terrain, selector) => {
        mutationCount += 1;
        const nextScene = applyAuroraAreaTerrainBrush(
          currentScene,
          tileId,
          terrain,
          selector,
        );
        if (mutationCount === 1 || !nextScene.auroraAreaEditing) {
          return nextScene;
        }
        return {
          ...nextScene,
          auroraAreaEditing: {
            ...nextScene.auroraAreaEditing,
            state: {
              ...nextScene.auroraAreaEditing.state,
              tiles: nextScene.auroraAreaEditing.state.tiles.map((tile) =>
                tile.row === 0 && tile.col === 1
                  ? { ...tile, tileId: 999 }
                  : tile
              ),
            },
          },
        };
      },
    );

    act(() => mounted.result.current.handleMouseDown(pointerEvent(0.25, 0.25)));
    const admittedScene = mounted.history.present;
    act(() => mounted.result.current.handleMouseMove(pointerEvent(1.25, 0.25, 0, 1)));
    act(() => mounted.result.current.handleMouseUp(pointerEvent(1.25, 0.25)));

    expect(mounted.applyAuroraAreaTerrainBrushSpy).toHaveBeenCalledTimes(2);
    expect(mounted.commitHistory).toHaveBeenCalledOnce();
    expect(mounted.history.present).toBe(admittedScene);
    expect(mounted.history.present.auroraAreaEditing!.state.tiles).not.toEqual(
      scene.auroraAreaEditing!.state.tiles,
    );
    expect(mounted.history.present.auroraAreaEditing!.state.tiles).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ tileId: 999 })]),
    );
    expect(mounted.trackTelemetry).toHaveBeenCalledWith(
      "scene.area_tiles.production_admission.blocked",
      expect.objectContaining({
        code: "AREA_TILE_CERTIFICATION_ROW_MISSING",
        firstBlockedTileId: 999,
        operationKind: "terrain",
      }),
    );
  });

  it("commits a multi-cell crosser drag as one history command and undoes it exactly", () => {
    const scene = createEditableScene();
    const mounted = renderPointerSelection(
      scene,
      { kind: "crosser", crosser: "road" },
      "object"
    );

    act(() => mounted.result.current.handleMouseDown(pointerEvent(0.95, 0.5)));
    act(() => mounted.result.current.handleMouseMove(pointerEvent(0.95, 1.5, 0, 1)));
    act(() => mounted.result.current.handleMouseUp(pointerEvent(0.95, 1.5)));

    const beforeTiles = scene.auroraAreaEditing!.state.tiles;
    const afterTiles = mounted.history.present.auroraAreaEditing!.state.tiles;
    const changedCells = afterTiles.filter((tile) => {
      const before = beforeTiles.find((candidate) => candidate.row === tile.row && candidate.col === tile.col);
      return JSON.stringify(tile) !== JSON.stringify(before);
    });
    expect(changedCells.length).toBeGreaterThanOrEqual(2);
    expect(mounted.applyAuroraAreaCrosserBrushSpy).toHaveBeenCalledTimes(2);
    expect(mounted.commitHistory).toHaveBeenCalledOnce();
    expect(mounted.history.past).toHaveLength(1);
    expect(undoSceneHistory(mounted.history).present.auroraAreaEditing!.state).toEqual(
      scene.auroraAreaEditing!.state
    );
  });

  it("commits a multi-cell height drag as one history command and undoes it exactly", () => {
    const scene = createEditableScene();
    const mounted = renderPointerSelection(
      scene,
      { kind: "height", delta: 1 },
      "object"
    );

    act(() => mounted.result.current.handleMouseDown(pointerEvent(0.25, 0.25)));
    act(() => mounted.result.current.handleMouseMove(pointerEvent(1.25, 0.25, 0, 1)));
    act(() => mounted.result.current.handleMouseUp(pointerEvent(1.25, 0.25)));

    const beforeTiles = scene.auroraAreaEditing!.state.tiles;
    const afterTiles = mounted.history.present.auroraAreaEditing!.state.tiles;
    const changedCells = afterTiles.filter((tile) => {
      const before = beforeTiles.find((candidate) => candidate.row === tile.row && candidate.col === tile.col);
      return JSON.stringify(tile) !== JSON.stringify(before);
    });
    expect(changedCells.length).toBeGreaterThanOrEqual(2);
    expect(mounted.applyAuroraAreaHeightBrushSpy).toHaveBeenCalledTimes(2);
    expect(mounted.commitHistory).toHaveBeenCalledOnce();
    expect(mounted.history.past).toHaveLength(1);
    expect(undoSceneHistory(mounted.history).present.auroraAreaEditing!.state).toEqual(
      scene.auroraAreaEditing!.state
    );
  });

  it("does not mutate the Area when an out-of-bounds group preview is clicked", () => {
    const scene = createEditableScene("group0");
    const mounted = renderPointerSelection(scene, {
      kind: "group",
      groupId: "group0",
      orientation: 0
    });

    act(() => {
      mounted.result.current.handleMouseMove(pointerEvent(1.25, 1.25));
      mounted.result.current.handleMouseDown(pointerEvent(1.25, 1.25));
    });

    expect(mounted.syncAuroraAreaPlacementPreview).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        cells: [
          { row: 1, col: 1, valid: false, elevation: 0 },
          { row: 1, col: 2, valid: false, elevation: 0 }
        ]
      })
    );
    expect(mounted.setSceneHistory).not.toHaveBeenCalled();
    expect(mounted.placeAuroraAreaGroupSpy).not.toHaveBeenCalled();
    expect(mounted.commitHistory).not.toHaveBeenCalled();
    expect(mounted.history.present).toBe(scene);
    expect(mounted.onAuroraAreaEditingFeedback).toHaveBeenLastCalledWith({
      variant: "error",
      message: "Group placement falls outside the Area bounds."
    });
  });

  it("clears the preview overlay when the pointer leaves or Escape is pressed", () => {
    const mounted = renderPointerSelection(createEditableScene());

    act(() => {
      mounted.result.current.handleMouseMove(pointerEvent(0.25, 0.25));
      mounted.result.current.handleMouseLeave();
    });
    fireEvent.keyDown(window, { key: "Escape" });

    expect(mounted.clearAuroraAreaPlacementPreview).toHaveBeenCalledTimes(2);
    expect(mounted.clearAuroraAreaPlacementPreview).toHaveBeenNthCalledWith(1, expect.any(Object));
    expect(mounted.clearAuroraAreaPlacementPreview).toHaveBeenNthCalledWith(2, expect.any(Object));
  });

  it("commits the same deterministic compatible variant previewed for a cell", () => {
    const scene = createEditableScene();
    const tile = scene.tiles.find((candidate) => candidate.row === 0 && candidate.col === 0)!;
    const selector = createAuroraAreaPlacementSelector(scene.sceneId, 0, 0, {
      kind: "terrain",
      terrain: "water"
    });
    const expected = applyTerrainStroke(
      scene.auroraAreaEditing!.state,
      definition,
      [{ row: 0, col: 0 }],
      "water",
      selector
    );
    if (!expected.ok) throw new Error(expected.message);
    const randomSpy = vi.spyOn(Math, "random");
    const mounted = renderPointerSelection(scene);

    act(() => {
      mounted.result.current.handleMouseMove(pointerEvent(0.25, 0.25));
      mounted.result.current.handleMouseDown(pointerEvent(0.25, 0.25));
    });

    expect(randomSpy).not.toHaveBeenCalled();
    expect(mounted.history.present.auroraAreaEditing!.state.tiles).toEqual(expected.state.tiles);
    const replacement = mounted.history.present.tiles.find(
      (candidate) => candidate.row === tile.row && candidate.col === tile.col
    )!;
    expect(replacement.id).not.toBe(tile.id);

    act(() => {
      mounted.rerender({ currentScene: mounted.history.present });
    });
    expect(mounted.setSelectedTileId).toHaveBeenLastCalledWith(replacement.id);
    randomSpy.mockRestore();
  });

  it("routes Alt-click door authoring through the hook-safe facade and fails closed", () => {
    const scene = createEditableScene();
    const mounted = renderPointerSelection(
      scene,
      { kind: "inspect" },
      "object",
      "doors",
    );

    act(() => {
      mounted.result.current.handleMouseDown({
        ...pointerEvent(0.25, 0.25),
        altKey: true,
      } as MouseEvent<HTMLDivElement>);
    });

    expect(mounted.createDoorAtHook).toHaveBeenCalledWith(scene, 0, 0, 1);
    expect(mounted.createObject).not.toHaveBeenCalled();
    expect(mounted.setSceneHistory).not.toHaveBeenCalled();
    expect(mounted.trackTelemetry).toHaveBeenCalledWith(
      "scene.objects.add_blocked_door_hook",
      expect.objectContaining({ kind: "doors", source: "alt_click" }),
    );

    const safeDoor = createNewSceneObject("doors", 0.5, 0.576, 2);
    safeDoor.bearing = 1.234;
    safeDoor.z = 0.456;
    mounted.createDoorAtHook.mockReturnValue(safeDoor);
    mounted.appendObjects.mockImplementation((currentScene, objects) => ({
      ...currentScene,
      objects: [...currentScene.objects, ...objects],
    }));
    act(() => {
      mounted.result.current.handleMouseDown({
        ...pointerEvent(0.25, 0.25),
        altKey: true,
      } as MouseEvent<HTMLDivElement>);
    });
    expect(mounted.createDoorAtHook).toHaveBeenLastCalledWith(scene, 0, 0, 2);
    expect(safeDoor.bearing).toBe(1.234);
    expect(safeDoor.z).toBe(0.456);
    expect(mounted.appendObjects).toHaveBeenCalledWith(scene, [safeDoor]);
  });

  it("keeps non-door Alt-click on the generic constructor and applies enabled snapping", () => {
    const scene = createEditableScene();
    const mounted = renderPointerSelection(scene, { kind: "inspect" }, "object", "placeables");
    const placeable = createNewSceneObject("placeables", 0, 0, 1);
    placeable.bearing = 0.23;
    placeable.z = 0.27;
    mounted.createObject.mockReturnValue(placeable);
    mounted.appendObjects.mockImplementation((currentScene, objects) => ({
      ...currentScene,
      objects: [...currentScene.objects, ...objects],
    }));

    act(() => {
      mounted.result.current.handleMouseDown({
        ...pointerEvent(0.25, 0.25),
        altKey: true,
      } as MouseEvent<HTMLDivElement>);
    });

    expect(mounted.createObject).toHaveBeenCalledWith("placeables", 0, 0, 1);
    expect(mounted.createDoorAtHook).not.toHaveBeenCalled();
    expect(placeable.bearing).toBeCloseTo(Math.PI / 12, 12);
    expect(placeable.z).toBe(0.5);
  });
});
