import { act, renderHook } from "@testing-library/react";
import type { SetStateAction } from "react";
import { describe, expect, it, vi } from "vitest";
import { buildAreaTileCatalogCertificationKey } from "../../../../src/modules/areas/application/areaTileCatalogFilter";
import type { AreaTileProductionCertificationSource } from "../../../../src/modules/areas/application/areaTileProductionPlacementAdmission";
import { useAuroraAreaTileClipboardCommands } from "../../../../src/modules/layout/application/useAuroraAreaTileClipboardCommands";
import type { AreaScene, SceneHistoryState } from "../../../../src/modules/layout/contracts";
import {
  createAuroraAreaEditingState,
  placeAuroraAreaGroup,
  type AuroraAreaTilesetDefinition
} from "../../../../src/modules/scene/domain/auroraAreaEditing";
import { applyAuroraAreaEditingStateToScene } from "../../../../src/modules/scene/domain/auroraAreaEditingSceneMapper";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";

const corners = { topLeft: "floor", topRight: "floor", bottomRight: "floor", bottomLeft: "floor" };
const heights = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
const definition: AuroraAreaTilesetDefinition = {
  tilesetResRef: "hook_set",
  fingerprint: "e".repeat(64),
  defaultTerrain: "floor",
  transitionRules: [],
  tiles: [
    { tileId: 0, terrain: corners, crossers: {}, cornerHeights: heights },
    { tileId: 1, terrain: corners, crossers: {}, cornerHeights: heights, groupId: "pair" },
    { tileId: 2, terrain: corners, crossers: {}, cornerHeights: heights, groupId: "pair" }
  ],
  groups: [{ id: "pair", name: "Pair", rows: 1, columns: 2, tileIds: [1, 2] }]
};

function readyProductionCertification(
  tileIds: readonly number[] = definition.tiles.map((tile) => tile.tileId),
): AreaTileProductionCertificationSource {
  return {
    status: "ready",
    tilesetResRef: definition.tilesetResRef,
    index: new Map(tileIds.map((tileId) => [
      buildAreaTileCatalogCertificationKey(definition.tilesetResRef, tileId),
      {
        rowId: `tile:${definition.tilesetResRef}:${tileId}`,
        eligibility: { status: "eligible" as const },
        proofs: {
          inventory: "verified" as const,
          assetClosure: "verified" as const,
          render: "verified" as const,
          visualSeam: "missing" as const,
          setAdjacency: "missing" as const,
          pathReference: "missing" as const,
          pathConnect: "missing" as const,
          wokSeam: "missing" as const,
          persistence: "missing" as const,
          toolset: "missing" as const,
          nwnRuntime: "missing" as const,
        },
      },
    ])),
  };
}

function createScene(): AreaScene {
  const initial = createAuroraAreaEditingState({
    areaResRef: "hook_area",
    width: 4,
    height: 4,
    definition,
    selector: () => 0
  });
  if (!initial.ok) throw new Error(initial.message);
  const placed = placeAuroraAreaGroup(initial.state, definition, "pair", { row: 0, col: 0 }, 0, () => 0);
  if (!placed.ok) throw new Error(placed.message);
  return applyAuroraAreaEditingStateToScene(
    { ...createSeedAreaScene(4, 4), sceneId: "hook_area", objects: [] },
    placed.state,
    definition,
    "floor"
  );
}

describe("useAuroraAreaTileClipboardCommands", () => {
  it("routes group copy/cut/paste through zero/one/one history commits", () => {
    let scene = createScene();
    let history: SceneHistoryState = { past: [], present: scene, future: [] };
    const commitHistory = vi.fn((current: SceneHistoryState, next: AreaScene) => ({
      past: [...current.past, current.present],
      present: next,
      future: []
    }));
    const setSceneHistory = vi.fn((update: SetStateAction<SceneHistoryState>) => {
      history = typeof update === "function" ? update(history) : update;
      scene = history.present;
    });
    const setSelectedTileId = vi.fn();
    const selectedGroupMember = scene.tiles.find((tile) => tile.row === 0 && tile.col === 1)!;
    const hook = renderHook(
      ({ currentScene, selectedTileId }: { currentScene: AreaScene; selectedTileId: string | null }) =>
        useAuroraAreaTileClipboardCommands({
          scene: currentScene,
          selectedTileId,
          sceneViewportPort: { commitHistory },
          tileProductionCertification: readyProductionCertification(),
          setSceneHistory,
          setSelectedObjectIds: vi.fn(),
          setSelectedTileId,
          userId: "builder",
          trackTelemetry: vi.fn()
        }),
      { initialProps: { currentScene: scene, selectedTileId: selectedGroupMember.id } }
    );

    act(() => expect(hook.result.current.copySelectedTilesToClipboard("keyboard")).toBe(true));
    expect(commitHistory).not.toHaveBeenCalled();
    expect(hook.result.current.hasClipboardTiles).toBe(true);
    expect(hook.result.current.clipboardFeedback).toEqual({
      variant: "success",
      message: "Copied 2 tile(s) from 1 SET group(s)."
    });

    act(() => expect(hook.result.current.cutSelectedTilesToClipboard("keyboard")).toBe(true));
    expect(commitHistory).toHaveBeenCalledTimes(1);
    expect(scene.auroraAreaEditing?.state.groupInstances).toHaveLength(0);
    expect(hook.result.current.clipboardFeedback).toEqual({
      variant: "success",
      message: "Cut 2 tile(s) to the Area clipboard; 4 Area cell(s) changed."
    });

    const pasteAnchor = scene.tiles.find((tile) => tile.row === 2 && tile.col === 1)!;
    hook.rerender({ currentScene: scene, selectedTileId: pasteAnchor.id });
    act(() => expect(hook.result.current.pasteClipboardTiles("keyboard")).toBe(true));
    expect(commitHistory).toHaveBeenCalledTimes(2);
    expect(scene.auroraAreaEditing?.state.groupInstances).toHaveLength(1);
    expect(scene.auroraAreaEditing?.state.groupInstances[0]?.cells).toEqual([
      { row: 2, col: 1 },
      { row: 2, col: 2 }
    ]);
    expect(setSelectedTileId).toHaveBeenLastCalledWith(
      scene.tiles.find((tile) => tile.row === 2 && tile.col === 1)?.id
    );
    expect(hook.result.current.clipboardFeedback).toEqual({
      variant: "success",
      message: "Pasted 2 tile(s) at row 2, column 1."
    });
  });

  it("deletes one editor group through its exact underlay when an unrelated source cell is non-canonical", () => {
    let scene = createScene();
    const payload = scene.auroraAreaEditing!;
    payload.state.topology.tokens[payload.state.topology.tokens.length - 1] =
      "source-only-terrain";
    let history: SceneHistoryState = { past: [], present: scene, future: [] };
    const commitHistory = vi.fn((current: SceneHistoryState, next: AreaScene) => ({
      past: [...current.past, current.present],
      present: next,
      future: []
    }));
    const setSceneHistory = vi.fn((update: SetStateAction<SceneHistoryState>) => {
      history = typeof update === "function" ? update(history) : update;
      scene = history.present;
    });
    const setSelectedTileId = vi.fn();
    const setSelectedTileIds = vi.fn();
    const selectedGroupMember = scene.tiles.find((tile) => tile.row === 0 && tile.col === 1)!;
    const hook = renderHook(() =>
      useAuroraAreaTileClipboardCommands({
        scene,
        selectedTileId: selectedGroupMember.id,
        selectedTileIds: [selectedGroupMember.id],
        sceneViewportPort: { commitHistory },
        tileProductionCertification: readyProductionCertification(),
        setSceneHistory,
        setSelectedObjectIds: vi.fn(),
        setSelectedTileId,
        setSelectedTileIds,
        userId: "builder",
        trackTelemetry: vi.fn()
      })
    );

    act(() => expect(hook.result.current.deleteSelectedTiles("toolbar")).toBe(true));

    expect(commitHistory).toHaveBeenCalledTimes(1);
    expect(scene.auroraAreaEditing?.state.groupInstances).toHaveLength(0);
    expect(scene.tiles.find((tile) => tile.row === 0 && tile.col === 0)?.tileId).toBe(0);
    expect(scene.tiles.find((tile) => tile.row === 0 && tile.col === 1)?.tileId).toBe(0);
    expect(setSelectedTileId).toHaveBeenLastCalledWith(null);
    expect(setSelectedTileIds).toHaveBeenLastCalledWith([]);
    expect(hook.result.current.clipboardFeedback).toEqual({
      variant: "success",
      message: "Removed the SET group; 4 Area cell(s) restored."
    });
  });

  it("returns the exact domain validation error for an invalid group paste", () => {
    let scene = createScene();
    let history: SceneHistoryState = { past: [], present: scene, future: [] };
    const setSceneHistory = vi.fn((update: SetStateAction<SceneHistoryState>) => {
      history = typeof update === "function" ? update(history) : update;
      scene = history.present;
    });
    const hook = renderHook(
      ({ currentScene, selectedTileId }: { currentScene: AreaScene; selectedTileId: string | null }) =>
        useAuroraAreaTileClipboardCommands({
          scene: currentScene,
          selectedTileId,
          sceneViewportPort: {
            commitHistory: (current, next) => ({
              past: [...current.past, current.present],
              present: next,
              future: []
            })
          },
          tileProductionCertification: readyProductionCertification(),
          setSceneHistory,
          setSelectedObjectIds: vi.fn(),
          setSelectedTileId: vi.fn(),
          userId: "builder",
          trackTelemetry: vi.fn()
        }),
      { initialProps: { currentScene: scene, selectedTileId: scene.tiles[0]!.id } }
    );

    act(() => hook.result.current.copySelectedTilesToClipboard("toolbar"));
    const bottomRight = scene.tiles.find((tile) => tile.row === 3 && tile.col === 3)!;
    hook.rerender({ currentScene: scene, selectedTileId: bottomRight.id });
    act(() => hook.result.current.pasteClipboardTiles("toolbar"));

    expect(setSceneHistory).not.toHaveBeenCalled();
    expect(hook.result.current.clipboardFeedback).toEqual({
      variant: "error",
      message: "Clipboard paste falls outside the Area bounds."
    });
  });

  it("copies every tile in an arbitrary viewport selection", () => {
    const scene = createScene();
    const selectedTileIds = [
      scene.tiles.find((tile) => tile.row === 2 && tile.col === 0)!.id,
      scene.tiles.find((tile) => tile.row === 3 && tile.col === 3)!.id
    ];
    const hook = renderHook(() =>
      useAuroraAreaTileClipboardCommands({
        scene,
        selectedTileId: selectedTileIds[1],
        selectedTileIds,
        sceneViewportPort: { commitHistory: vi.fn() },
        tileProductionCertification: readyProductionCertification(),
        setSceneHistory: vi.fn(),
        setSelectedObjectIds: vi.fn(),
        setSelectedTileId: vi.fn(),
        setSelectedTileIds: vi.fn(),
        userId: "builder",
        trackTelemetry: vi.fn()
      })
    );

    act(() => expect(hook.result.current.copySelectedTilesToClipboard("toolbar")).toBe(true));
    expect(hook.result.current.clipboardFeedback).toEqual({
      variant: "success",
      message: "Copied 2 tile(s)."
    });
  });

  it("fails closed before deleting topology while certification is unavailable", () => {
    const scene = createScene();
    let history: SceneHistoryState = { past: [], present: scene, future: [] };
    const commitHistory = vi.fn();
    const setSceneHistory = vi.fn((update: SetStateAction<SceneHistoryState>) => {
      history = typeof update === "function" ? update(history) : update;
    });
    const trackTelemetry = vi.fn();
    const selectedGroupMember = scene.tiles.find((tile) => tile.row === 0 && tile.col === 1)!;
    const hook = renderHook(() =>
      useAuroraAreaTileClipboardCommands({
        scene,
        selectedTileId: selectedGroupMember.id,
        sceneViewportPort: { commitHistory },
        tileProductionCertification: {
          status: "unavailable",
          tilesetResRef: definition.tilesetResRef,
          reasonCode: "LOAD_FAILED",
        },
        setSceneHistory,
        setSelectedObjectIds: vi.fn(),
        setSelectedTileId: vi.fn(),
        userId: "builder",
        trackTelemetry,
      })
    );

    act(() => expect(hook.result.current.deleteSelectedTiles("toolbar")).toBe(true));

    expect(commitHistory).not.toHaveBeenCalled();
    expect(history.present).toBe(scene);
    expect(hook.result.current.clipboardFeedback).toEqual({
      variant: "error",
      message: expect.stringContaining("AREA_TILE_CERTIFICATION_UNAVAILABLE"),
    });
    expect(trackTelemetry).toHaveBeenCalledWith(
      "scene.area_tiles.production_admission.blocked",
      expect.objectContaining({
        code: "AREA_TILE_CERTIFICATION_UNAVAILABLE",
        operationKind: "delete",
      }),
    );
  });

  it("rejects a mixed multi-tile paste atomically when one result Tile_ID has no row", () => {
    const scene = createScene();
    let history: SceneHistoryState = { past: [], present: scene, future: [] };
    const commitHistory = vi.fn();
    const setSceneHistory = vi.fn((update: SetStateAction<SceneHistoryState>) => {
      history = typeof update === "function" ? update(history) : update;
    });
    const sourceGroupMember = scene.tiles.find((tile) => tile.row === 0 && tile.col === 1)!;
    const target = scene.tiles.find((tile) => tile.row === 2 && tile.col === 1)!;
    const hook = renderHook(
      ({ selectedTileId }: { selectedTileId: string }) =>
        useAuroraAreaTileClipboardCommands({
          scene,
          selectedTileId,
          sceneViewportPort: { commitHistory },
          tileProductionCertification: readyProductionCertification([1]),
          setSceneHistory,
          setSelectedObjectIds: vi.fn(),
          setSelectedTileId: vi.fn(),
          userId: "builder",
          trackTelemetry: vi.fn(),
        }),
      { initialProps: { selectedTileId: sourceGroupMember.id } },
    );

    act(() => expect(hook.result.current.copySelectedTilesToClipboard("keyboard")).toBe(true));
    hook.rerender({ selectedTileId: target.id });
    act(() => expect(hook.result.current.pasteClipboardTiles("keyboard")).toBe(true));

    expect(commitHistory).not.toHaveBeenCalled();
    expect(history.present).toBe(scene);
    expect(hook.result.current.clipboardFeedback).toEqual({
      variant: "error",
      message: expect.stringMatching(/AREA_TILE_CERTIFICATION_ROW_MISSING.*Tile_ID 2/),
    });
  });
});
