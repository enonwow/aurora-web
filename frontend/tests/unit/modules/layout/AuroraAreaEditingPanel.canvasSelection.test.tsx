import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuroraAreaEditingPanel } from "../../../../src/modules/layout/components/AuroraAreaEditingPanel";
import {
  useWorkspaceAreaEditorMutationSignal,
  type WorkspaceAreaEditorMutationSignal
} from "../../../../src/modules/layout/components/WorkspaceCanvasViewport";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";
import {
  createAuroraAreaEditingState,
  hydrateAuroraAreaEditingState,
  placeAuroraAreaGroup,
  type AuroraAreaTilesetDefinition
} from "../../../../src/modules/scene/domain/auroraAreaEditing";
import { applyAuroraAreaEditingStateToScene } from "../../../../src/modules/scene/domain/auroraAreaEditingSceneMapper";
import {
  commitSceneHistory,
  createSceneHistory,
  redoSceneHistory,
  undoSceneHistory
} from "../../../../src/modules/scene/domain/sceneHistory";
import type { AreaScene } from "../../../../src/modules/scene/contracts";
import type { AreaTileProcessContractReadiness } from "../../../../src/modules/tiles/application/areaTileProcessContractReadiness";

function allCorners(terrain: string) {
  return {
    topLeft: terrain,
    topRight: terrain,
    bottomRight: terrain,
    bottomLeft: terrain
  };
}

const allHeights = {
  topLeft: 0,
  topRight: 0,
  bottomRight: 0,
  bottomLeft: 0
};

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
  transitionRules: [],
  crosserTypes: [{ id: "road", name: "Road feature" }],
  tiles: [
    {
      tileId: 0,
      terrain: allCorners("grass"),
      crossers: {},
      cornerHeights: allHeights
    },
    ...heightTransitionTiles
  ],
  groups: []
};

const groupDefinition: AuroraAreaTilesetDefinition = {
  ...definition,
  tiles: [
    ...definition.tiles,
    { tileId: 2, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights, groupId: "group0", mainLight1: 8, animLoop1: 1 },
    { tileId: 3, terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights, groupId: "group0", mainLight1: 9, animLoop1: 0 }
  ],
  groups: [{ id: "group0", name: "Two tile building", rows: 1, columns: 2, tileIds: [2, 3] }]
};

function createTileProcessReadiness(
  overrides: Partial<AreaTileProcessContractReadiness> = {}
): AreaTileProcessContractReadiness {
  return {
    status: "ready",
    areaId: "area_test",
    checkedCandidateCount: 4,
    readyCandidateCount: 4,
    blockedCandidateCount: 0,
    candidateSample: "tile0",
    readySample: "tile0",
    sourceObjectKeySample: "tiles/tile0.mdl",
    sourceAssetContractSample: "tile0:ready",
    blockerSummary: "none",
    sourceAssetReadyCount: 4,
    sourceAssetBlockedCount: 0,
    mdlSourceReadyCount: 4,
    mdlSourceBlockedCount: 0,
    glbGeometryReadyCount: 4,
    glbGeometryBlockedCount: 0,
    materialTextureContractReadyCount: 4,
    materialBindingBlockedCount: 0,
    renderLoaderReadyCount: 4,
    renderLoaderBlockedCount: 0,
    textureMaterialBlockerSummary: "none",
    renderAssetContractBlockerSummary: "none",
    mdlGlbMaterialBlockerSummary: "none",
    entries: [],
    ...overrides
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function createEditableScene() {
  const result = hydrateAuroraAreaEditingState({
    areaResRef: "area_test",
    width: 2,
    height: 2,
    definition,
    tiles: [
      { id: "tile_0_0", row: 0, col: 0, tileId: 0, orientation: 0, height: 0 },
      { id: "tile_0_1", row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
      { id: "tile_1_0", row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
      { id: "tile_1_1", row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
    ]
  });
  if (!result.ok) {
    throw new Error(result.message);
  }
  return applyAuroraAreaEditingStateToScene(
    {
      ...createSeedAreaScene(2, 2),
      sceneId: "area_test",
      areaName: "Test Area",
      objects: []
    },
    result.state,
    definition,
    "grass"
  );
}

function createRectangularEditableScene() {
  const result = createAuroraAreaEditingState({
    areaResRef: "area_rectangular",
    width: 2,
    height: 3,
    definition,
    selector: () => 0
  });
  if (!result.ok) {
    throw new Error(result.message);
  }
  return applyAuroraAreaEditingStateToScene(
    {
      ...createSeedAreaScene(2, 3),
      sceneId: "area_rectangular",
      areaName: "Rectangular Area",
      objects: []
    },
    result.state,
    definition,
    "grass"
  );
}

const areaEditorHistoryPort = { commitHistory: commitSceneHistory };

function AreaRotateHistoryHarness({ initialScene }: { initialScene: AreaScene }) {
  const [history, setHistory] = useState(() => createSceneHistory(initialScene));
  const [signal, setSignal] = useState<WorkspaceAreaEditorMutationSignal | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const revisionRef = useRef(0);

  useWorkspaceAreaEditorMutationSignal(
    signal,
    history.present.sceneId,
    areaEditorHistoryPort,
    setHistory,
    setSelectedTileId
  );

  return (
    <>
      <div
        data-testid="area-history-proof"
        data-past-count={history.past.length}
        data-future-count={history.future.length}
        data-selected-tile-id={selectedTileId ?? "none"}
        data-area-state={JSON.stringify(history.present.auroraAreaEditing?.state)}
      />
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={history.present}
        onSceneSelected={vi.fn()}
        onSceneMutation={(scene, nextSelectedTileId) => {
          revisionRef.current += 1;
          setSignal({
            revision: revisionRef.current,
            scene,
            selectedTileId: nextSelectedTileId
          });
        }}
      />
      <button type="button" onClick={() => setHistory(undoSceneHistory)}>
        Harness Undo
      </button>
      <button type="button" onClick={() => setHistory(redoSceneHistory)}>
        Harness Redo
      </button>
    </>
  );
}

function createGroupedEditableScene(anchor: { row: number; col: number }) {
  const initial = createAuroraAreaEditingState({
    areaResRef: "area_test",
    width: 2,
    height: 2,
    definition: groupDefinition,
    selector: () => 0
  });
  if (!initial.ok) {
    throw new Error(initial.message);
  }
  const placed = placeAuroraAreaGroup(initial.state, groupDefinition, "group0", anchor, 0, () => 0);
  if (!placed.ok) {
    throw new Error(placed.message);
  }
  return applyAuroraAreaEditingStateToScene(
    {
      ...createSeedAreaScene(2, 2),
      sceneId: "area_test",
      areaName: "Test Area",
      objects: []
    },
    placed.state,
    groupDefinition,
    "grass"
  );
}

describe("AuroraAreaEditingPanel canvas selection", () => {
  it("creates a blank local Area when there is no active scene", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ tilesetResRef: "testset" }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            tilesetResRef: definition.tilesetResRef,
            fingerprint: definition.fingerprint,
            defaults: { defaultTerrain: definition.defaultTerrain },
            transitionRules: definition.transitionRules,
            tiles: definition.tiles,
            groups: definition.groups
          }
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    const onSceneSelected = vi.fn();

    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={null}
        onSceneSelected={onSceneSelected}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "New blank local Area" }));
    await screen.findByRole("group", { name: "New Area settings" });
    fireEvent.change(screen.getByLabelText("Area resref"), { target: { value: "fresh_area" } });
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Height"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Create local Area" }));

    await waitFor(() => expect(onSceneSelected).toHaveBeenCalledTimes(1));
    const createdScene = onSceneSelected.mock.calls[0]?.[0];
    expect(createdScene).toMatchObject({
      sceneId: "area_fresh_area",
      areaName: "fresh_area",
      width: 3,
      height: 2,
      source: "local_draft",
      objects: []
    });
    expect(createdScene.tiles).toHaveLength(6);
    expect(createdScene.auroraAreaEditing).toMatchObject({
      state: { areaResRef: "fresh_area", tilesetResRef: "testset", width: 3, height: 2 },
      terrainBrush: "grass"
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/areas/editing/tilesets"),
      expect.objectContaining({ headers: { Authorization: "Bearer token" } })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/areas/editing/tilesets/testset"),
      expect.objectContaining({ headers: { Authorization: "Bearer token" } })
    );
  });

  it("uses the selected canvas tile as the rotate and height property target", () => {
    const scene = createEditableScene();
    const selectedTile = scene.tiles.find((tile) => tile.row === 1 && tile.col === 0);
    expect(selectedTile).toBeDefined();
    const onSceneSelected = vi.fn();

    const { rerender } = render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        selectedTileId={selectedTile?.id}
        onSceneSelected={onSceneSelected}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("Canvas selection: Row 1, Column 0");
    expect(screen.getByLabelText("Row")).toHaveValue(1);
    expect(screen.getByLabelText("Column")).toHaveValue(0);

    fireEvent.click(screen.getByRole("button", { name: "Rotate tile left" }));

    expect(onSceneSelected).toHaveBeenCalledTimes(1);
    const rotatedScene = onSceneSelected.mock.calls[0]?.[0];
    const rotatedSelectedTile = rotatedScene.tiles.find(
      (tile) => tile.row === selectedTile?.row && tile.col === selectedTile?.col
    );
    expect(rotatedSelectedTile?.orientation).toBe(3);

    rerender(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={rotatedScene}
        selectedTileId={rotatedSelectedTile?.id}
        onSceneSelected={onSceneSelected}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Orientation 3, Height 0");

    fireEvent.click(screen.getByRole("button", { name: "Tile height +" }));
    const raisedScene = onSceneSelected.mock.calls[1]?.[0];
    expect(raisedScene.tiles.find((tile) => tile.row === 1 && tile.col === 0)?.height).toBe(1);
  });

  it("reports an invalid manual tile target instead of silently ignoring the operation", () => {
    const scene = createEditableScene();
    const onSceneMutation = vi.fn();
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />
    );

    fireEvent.change(screen.getByLabelText("Row"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Rotate tile right" }));

    expect(onSceneMutation).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose an integer tile cell inside rows 0..1 and columns 0..1."
    );
  });

  it("exposes resize and full Area rotation as one mutation per command", () => {
    const scene = createEditableScene();
    const onSceneMutation = vi.fn();
    const props = {
      accessToken: "token",
      onSceneSelected: vi.fn(),
      onSceneMutation
    };
    const { rerender } = render(
      <AuroraAreaEditingPanel {...props} scene={scene} />
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Top" }));
    expect(onSceneMutation).toHaveBeenCalledOnce();
    const resizedScene = onSceneMutation.mock.calls[0]?.[0];
    expect(resizedScene).toMatchObject({ width: 2, height: 3 });
    expect(resizedScene.tiles).toHaveLength(6);

    rerender(<AuroraAreaEditingPanel {...props} scene={resizedScene} />);
    const rotateButton = screen.getByRole("button", { name: "Rotate entire Area right" });
    fireEvent.mouseDown(rotateButton, { button: 0, buttons: 1 });
    fireEvent.mouseUp(rotateButton, { button: 0, buttons: 0 });
    fireEvent.click(rotateButton, { button: 0, detail: 1 });
    expect(onSceneMutation).toHaveBeenCalledTimes(2);
    const rotatedScene = onSceneMutation.mock.calls[1]?.[0];
    expect(rotatedScene).toMatchObject({ width: 3, height: 2 });
    expect(rotatedScene.tiles).toHaveLength(6);
  });

  it("commits Panel Area Rotate once through the viewport signal in StrictMode and round-trips Undo/Redo", async () => {
    const initialScene = createRectangularEditableScene();
    const initialState = JSON.stringify(initialScene.auroraAreaEditing?.state);
    render(
      <StrictMode>
        <AreaRotateHistoryHarness initialScene={initialScene} />
      </StrictMode>
    );

    const trustedRotateButton = screen.getByRole("button", { name: "Rotate entire Area right" });
    fireEvent.mouseDown(trustedRotateButton, { button: 0, buttons: 1 });
    fireEvent.mouseUp(trustedRotateButton, { button: 0, buttons: 0 });
    fireEvent.click(trustedRotateButton, { button: 0, detail: 1 });
    const proof = screen.getByTestId("area-history-proof");
    await waitFor(() => expect(proof).toHaveAttribute("data-past-count", "1"));
    expect(proof).toHaveAttribute("data-future-count", "0");
    const rotatedState = proof.getAttribute("data-area-state");
    expect(rotatedState).not.toBe(initialState);

    fireEvent.click(screen.getByRole("button", { name: "Harness Undo" }));
    await waitFor(() => expect(proof).toHaveAttribute("data-past-count", "0"));
    expect(proof).toHaveAttribute("data-future-count", "1");
    expect(proof).toHaveAttribute("data-area-state", initialState);

    fireEvent.click(screen.getByRole("button", { name: "Harness Redo" }));
    await waitFor(() => expect(proof).toHaveAttribute("data-past-count", "1"));
    expect(proof).toHaveAttribute("data-future-count", "0");
    expect(proof).toHaveAttribute("data-area-state", rotatedState);
  });

  it("inspects Tile_ID and all seven instance properties and commits one loose-tile dialog mutation", () => {
    const scene = createEditableScene();
    const selectedTile = scene.tiles.find((tile) => tile.row === 1 && tile.col === 0);
    expect(selectedTile).toBeDefined();
    const editableTile = scene.auroraAreaEditing.state.tiles.find(
      (tile) => tile.id === selectedTile?.id
    );
    if (!editableTile) throw new Error("missing selected editable tile");
    Object.assign(editableTile, {
      mainLight1: 4,
      mainLight2: 5,
      sourceLight1: 6,
      sourceLight2: 7,
      animLoop1: 1,
      animLoop2: 0,
      animLoop3: 1
    });
    const sceneWithProperties = applyAuroraAreaEditingStateToScene(
      scene,
      scene.auroraAreaEditing.state,
      definition,
      "grass"
    );
    const onSceneMutation = vi.fn();

    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={sceneWithProperties}
        selectedTileId={selectedTile?.id}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />
    );

    const inspector = screen.getByRole("status");
    expect(inspector).toHaveTextContent("Tile_ID 0");
    expect(inspector).toHaveTextContent("Main 1=4, Main 2=5, Source 1=6, Source 2=7");
    expect(inspector).toHaveTextContent("Animation loops: 1=1, 2=0, 3=1");

    fireEvent.click(screen.getByRole("button", { name: "Tile Properties" }));
    expect(screen.getByRole("dialog", { name: "Tile Properties" })).toHaveTextContent(
      "1 tile(s) selected"
    );
    fireEvent.change(screen.getByLabelText("Main Light 1"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onSceneMutation).toHaveBeenCalledTimes(1);
    const [nextScene, nextSelectedTileId] = onSceneMutation.mock.calls[0];
    expect(nextSelectedTileId).toBe(selectedTile?.id);
    expect(nextScene.auroraAreaEditing.state.tiles.find(
      (tile: { id: string }) => tile.id === selectedTile?.id
    )).toMatchObject({ mainLight1: 12 });
    expect(nextScene.auroraAreaEditing.state.tiles.filter(
      (tile: { id: string; mainLight1?: number }) =>
        tile.id !== selectedTile?.id && tile.mainLight1 === 12
    )).toEqual([]);
  });

  it("multi-applies Tile Properties to every selected SET group member in one mutation", () => {
    const scene = createGroupedEditableScene({ row: 0, col: 0 });
    const group = scene.auroraAreaEditing.state.groupInstances[0];
    const selectedTileId = group.tileIds[1];
    const onSceneMutation = vi.fn();

    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        selectedTileId={selectedTileId}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Tile Properties" }));
    expect(screen.getByRole("dialog", { name: "Tile Properties" })).toHaveTextContent(
      "2 tile(s) selected"
    );
    fireEvent.change(screen.getByLabelText("Source Light 2"), { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onSceneMutation).toHaveBeenCalledTimes(1);
    const [nextScene, preservedSelectedTileId] = onSceneMutation.mock.calls[0];
    expect(preservedSelectedTileId).toBe(selectedTileId);
    expect(nextScene.auroraAreaEditing.state.tiles
      .filter((tile: { id: string }) => group.tileIds.includes(tile.id))
      .every((tile: { sourceLight2?: number }) => tile.sourceLight2 === 42)).toBe(true);
  });

  it("multi-applies Tile Properties to an arbitrary loose-tile selection", () => {
    const scene = createEditableScene();
    const selectedTileIds = [scene.tiles[0].id, scene.tiles[3].id];
    const onSceneMutation = vi.fn();

    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        selectedTileId={selectedTileIds[1]}
        selectedTileIds={selectedTileIds}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("2 tiles; anchor");
    fireEvent.click(screen.getByRole("button", { name: "Tile Properties" }));
    expect(screen.getByRole("dialog", { name: "Tile Properties" })).toHaveTextContent(
      "2 tile(s) selected"
    );
    fireEvent.change(screen.getByLabelText("Animation Loop 3"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    const [nextScene, anchorId, preservedIds] = onSceneMutation.mock.calls[0];
    expect(anchorId).toBe(selectedTileIds[1]);
    expect(preservedIds).toEqual(selectedTileIds);
    expect(nextScene.auroraAreaEditing.state.tiles
      .filter((tile: { id: string }) => selectedTileIds.includes(tile.id))
      .every((tile: { animLoop3?: number }) => tile.animLoop3 === 9)).toBe(true);
  });

  it("keeps Cancel, invalid input, and stale dialog targets out of mutation history", () => {
    const scene = createEditableScene();
    const firstTileId = scene.tiles[0].id;
    const secondTileId = scene.tiles[1].id;
    const onSceneMutation = vi.fn();
    const props = {
      accessToken: "token",
      onSceneSelected: vi.fn(),
      onSceneMutation
    };
    const { rerender } = render(
      <AuroraAreaEditingPanel {...props} scene={scene} selectedTileId={firstTileId} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Tile Properties" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSceneMutation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Tile Properties" }));
    fireEvent.change(screen.getByLabelText("Main Light 2"), { target: { value: "256" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.getByRole("alert")).toHaveTextContent("mainLight2 must be an integer in the 0..255 range");
    expect(onSceneMutation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Tile Properties" }));
    rerender(
      <AuroraAreaEditingPanel {...props} scene={scene} selectedTileId={secondTileId} />
    );
    fireEvent.change(screen.getByLabelText("Main Light 1"), { target: { value: "13" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onSceneMutation).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "selection changed; no changes were committed"
    );
  });

  it("shows a selected SET group and applies its rotate and remove operations only after success", () => {
    const scene = createGroupedEditableScene({ row: 0, col: 0 });
    const selectedTile = scene.tiles.find((tile) => tile.row === 0 && tile.col === 1);
    expect(selectedTile).toBeDefined();
    const onSceneSelected = vi.fn();

    const { rerender } = render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        selectedTileId={selectedTile?.id}
        onSceneSelected={onSceneSelected}
      />
    );

    const groupDetails = screen.getByLabelText("Selected SET group");
    expect(groupDetails).toHaveTextContent("Template: Two tile building (group0)");
    expect(groupDetails).toHaveTextContent("Orientation: 0; members: 2");
    expect(screen.getByRole("button", { name: "Rotate tile right" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Rotate selected group right" }));

    expect(onSceneSelected).toHaveBeenCalledTimes(1);
    const rotatedScene = onSceneSelected.mock.calls[0]?.[0];
    expect(rotatedScene.auroraAreaEditing.state.groupInstances[0]).toMatchObject({ orientation: 1 });

    const rotatedSelectedTile = rotatedScene.tiles.find((tile: { row: number; col: number }) => tile.row === 1 && tile.col === 0);
    rerender(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={rotatedScene}
        selectedTileId={rotatedSelectedTile?.id}
        onSceneSelected={onSceneSelected}
      />
    );
    expect(screen.getByLabelText("Selected SET group")).toHaveTextContent("Orientation: 1; members: 2");

    fireEvent.click(screen.getByRole("button", { name: "Selected group height +" }));
    expect(onSceneSelected).toHaveBeenCalledTimes(2);
    const raisedScene = onSceneSelected.mock.calls[1]?.[0];
    const raisedGroupTileIds = new Set(raisedScene.auroraAreaEditing.state.groupInstances[0].tileIds);
    expect(
      raisedScene.auroraAreaEditing.state.tiles
        .filter((tile: { id: string }) => raisedGroupTileIds.has(tile.id))
        .map((tile: { height: number }) => tile.height)
    ).toEqual([1, 1]);

    rerender(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={raisedScene}
        selectedTileId={rotatedSelectedTile?.id}
        onSceneSelected={onSceneSelected}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Selected group height -" }));
    expect(onSceneSelected).toHaveBeenCalledTimes(3);
    const loweredScene = onSceneSelected.mock.calls[2]?.[0];
    const loweredGroupTileIds = new Set(loweredScene.auroraAreaEditing.state.groupInstances[0].tileIds);
    expect(
      loweredScene.auroraAreaEditing.state.tiles
        .filter((tile: { id: string }) => loweredGroupTileIds.has(tile.id))
        .map((tile: { height: number }) => tile.height)
    ).toEqual([0, 0]);

    rerender(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={loweredScene}
        selectedTileId={rotatedSelectedTile?.id}
        onSceneSelected={onSceneSelected}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove selected group" }));

    expect(onSceneSelected).toHaveBeenCalledTimes(4);
    const removedScene = onSceneSelected.mock.calls[3]?.[0];
    expect(removedScene.auroraAreaEditing.state.groupInstances).toEqual([]);
  });

  it("remaps a non-anchor group selection when rotation replaces runtime tile IDs", () => {
    const scene = createGroupedEditableScene({ row: 0, col: 0 });
    const group = scene.auroraAreaEditing.state.groupInstances[0];
    const selectedTileId = group.tileIds[1];
    const onSceneMutation = vi.fn();
    const onSceneSelected = vi.fn();

    const { rerender } = render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        selectedTileId={selectedTileId}
        onSceneSelected={onSceneSelected}
        onSceneMutation={onSceneMutation}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Rotate selected group right" }));

    expect(onSceneMutation).toHaveBeenCalledTimes(1);
    const [rotatedScene, remappedSelectedTileId] = onSceneMutation.mock.calls[0];
    expect(remappedSelectedTileId).toBe(
      rotatedScene.auroraAreaEditing.state.groupInstances[0].tileIds[1]
    );
    expect(remappedSelectedTileId).not.toBe(selectedTileId);
    expect(rotatedScene.tiles.some((tile: { id: string }) => tile.id === remappedSelectedTileId)).toBe(true);

    rerender(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={rotatedScene}
        selectedTileId={remappedSelectedTileId}
        onSceneSelected={onSceneSelected}
        onSceneMutation={onSceneMutation}
      />
    );
    expect(screen.getByLabelText("Selected SET group")).toHaveTextContent(
      "Orientation: 1; members: 2"
    );
  });

  it("keeps the scene unchanged and shows a domain error when selected group rotation fails", () => {
    const scene = createGroupedEditableScene({ row: 1, col: 0 });
    const selectedTile = scene.tiles.find((tile) => tile.row === 1 && tile.col === 1);
    expect(selectedTile).toBeDefined();
    const onSceneSelected = vi.fn();

    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        selectedTileId={selectedTile?.id}
        onSceneSelected={onSceneSelected}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Rotate selected group right" }));

    expect(onSceneSelected).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Group rotation falls outside the Area bounds.");
  });

  it("arms and rotates palette brushes without emitting a scene mutation", () => {
    const scene = createGroupedEditableScene({ row: 0, col: 0 });
    const onSceneMutation = vi.fn();
    const onActiveToolChange = vi.fn();
    const onSceneSelected = vi.fn();
    const { rerender } = render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        activeTool={{ kind: "inspect" }}
        onActiveToolChange={onActiveToolChange}
        onSceneSelected={onSceneSelected}
        onSceneMutation={onSceneMutation}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "grass" }));
    expect(onActiveToolChange).toHaveBeenLastCalledWith({ kind: "terrain", terrain: "grass" });

    fireEvent.click(screen.getByRole("button", { name: "Road feature" }));
    expect(onActiveToolChange).toHaveBeenLastCalledWith({ kind: "crosser", crosser: "road" });

    fireEvent.click(screen.getByRole("button", { name: "Raise terrain" }));
    expect(onActiveToolChange).toHaveBeenLastCalledWith({ kind: "height", delta: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Lower terrain" }));
    expect(onActiveToolChange).toHaveBeenLastCalledWith({ kind: "height", delta: -1 });
    fireEvent.click(screen.getByRole("button", { name: "Eraser" }));
    expect(onActiveToolChange).toHaveBeenLastCalledWith({ kind: "eraser" });

    fireEvent.click(screen.getByRole("button", { name: /Two tile building/ }));
    expect(onActiveToolChange).toHaveBeenLastCalledWith({
      kind: "group",
      groupId: "group0",
      orientation: 0
    });

    rerender(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        activeTool={{ kind: "group", groupId: "group0", orientation: 0 }}
        onActiveToolChange={onActiveToolChange}
        onSceneSelected={onSceneSelected}
        onSceneMutation={onSceneMutation}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Rotate group brush right" }));
    expect(onActiveToolChange).toHaveBeenLastCalledWith({
      kind: "group",
      groupId: "group0",
      orientation: 1
    });
    expect(onSceneMutation).not.toHaveBeenCalled();
    expect(onSceneSelected).not.toHaveBeenCalled();
  });

  it("exposes stable proof actions for eraser, source-group operations and Area rotation", () => {
    const placedScene = createGroupedEditableScene({ row: 0, col: 0 });
    const payload = placedScene.auroraAreaEditing!;
    const sourceScene = {
      ...placedScene,
      auroraAreaEditing: {
        ...payload,
        state: {
          ...payload.state,
          groupInstances: payload.state.groupInstances.map(({ underlay: _underlay, ...group }) => group)
        }
      }
    };
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={sourceScene}
        selectedTileId={sourceScene.tiles[0]!.id}
        onSceneSelected={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Eraser" }))
      .toHaveAttribute("data-area-editing-proof-action", "arm-eraser");
    expect(screen.getByRole("region", { name: "Selected SET group" }))
      .toHaveAttribute("data-area-editing-proof-group-origin", "source");
    const actions = [
      ["Rotate selected group left", "rotate-selected-group-left"],
      ["Rotate selected group right", "rotate-selected-group-right"],
      ["Selected group height -", "selected-group-height-down"],
      ["Selected group height +", "selected-group-height-up"],
      ["Remove selected group", "remove-selected-group"],
      ["Rotate entire Area left", "rotate-area-left"],
      ["Rotate entire Area right", "rotate-area-right"]
    ] as const;
    actions.forEach(([name, action]) => {
      expect(screen.getByRole("button", { name }))
        .toHaveAttribute("data-area-editing-proof-action", action);
    });
  });

  it("rerolls only a selected loose tile through one deterministic mutation", () => {
    const scene = createEditableScene();
    const selected = scene.tiles[0];
    const onSceneMutation = vi.fn();
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        selectedTileId={selected.id}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Reroll compatible tile variant" }));
    expect(onSceneMutation).toHaveBeenCalledOnce();
    const [nextScene, nextSelectedTileId] = onSceneMutation.mock.calls[0];
    expect(nextSelectedTileId).toBe(
      nextScene.tiles.find((tile: { row: number; col: number }) => tile.row === 0 && tile.col === 0)?.id
    );
  });

  it("requires a current successful Verify before persisting a new ARE/GIT/GIC triplet", async () => {
    const scene = createEditableScene();
    const fingerprint = "c".repeat(64);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        data: {
          valid: true,
          issues: [],
          stats: {
            width: 2,
            height: 2,
            expectedTileCount: 4,
            tileCount: 4,
            uniqueTileIds: 1,
            groupTileCount: 0,
            sourceProvenanceTileCount: 0,
            modelResolvedTileCount: 4,
            minHeight: 0,
            maxHeight: 0
          },
          tilesetFingerprint: definition.fingerprint
        }
      }))
      .mockResolvedValueOnce(Response.json({
        data: {
          areaResRef: "area_test",
          areaFingerprint: fingerprint,
          created: true,
          resources: [
            { extension: "are", key: "snapshot/area_test.are", size: 100 },
            { extension: "git", key: "snapshot/area_test.git", size: 40 },
            { extension: "gic", key: "snapshot/area_test.gic", size: 20 }
          ]
        }
      }));
    vi.stubGlobal("fetch", fetchMock);
    const onSceneSelected = vi.fn();
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        tileProcessReadiness={createTileProcessReadiness()}
        onSceneSelected={onSceneSelected}
      />
    );

    const persistButton = screen.getByRole("button", { name: "Persist new Area to module" });
    expect(persistButton).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Verify Area" }));
    await waitFor(() => expect(persistButton).toBeEnabled());
    const verificationReport = screen.getByLabelText("Area verification report");
    expect(verificationReport).toHaveTextContent("Tiles 4/4");
    expect(verificationReport).toHaveAttribute("data-area-verification-status", "valid");
    expect(JSON.parse(verificationReport.getAttribute("data-area-verification-stats") ?? "null"))
      .toMatchObject({
        expectedTileCount: 4,
        tileCount: 4,
        modelResolvedTileCount: 4,
        assetReadiness: {
          status: "ready",
          checkedCandidateCount: 4,
          readyCandidateCount: 4,
          blockedCandidateCount: 0
        }
      });
    expect(JSON.parse(verificationReport.getAttribute("data-area-verification-issues") ?? "null"))
      .toEqual([]);
    expect(verificationReport).toHaveAttribute(
      "data-area-verification-source-updated-at",
      String(scene.updatedAtUnixMs)
    );

    fireEvent.click(persistButton);
    await waitFor(() => expect(onSceneSelected).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/_aurora/v1/areas/editing/verify",
      "/_aurora/v1/areas/editing/persist/new-area"
    ]);
    expect(onSceneSelected.mock.calls[0]?.[0].auroraAreaEditing.state.sourceAreaFingerprint).toBe(
      fingerprint
    );
  });

  it("waits for current-scene tile asset readiness before enabling Verify", () => {
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createEditableScene()}
        tileProcessReadiness={createTileProcessReadiness({ areaId: "stale_previous_area" })}
        onSceneSelected={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Verify Area" })).toBeDisabled();
    expect(screen.getByText(/Waiting for settled tile asset readiness/)).toHaveTextContent(
      "Waiting for settled tile asset readiness"
    );
  });

  it("merges partial tile asset blocker summaries into final verification and blocks Persist", async () => {
    const scene = createEditableScene();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      data: {
        valid: true,
        issues: [],
        stats: {
          width: 2,
          height: 2,
          expectedTileCount: 4,
          tileCount: 4,
          uniqueTileIds: 1,
          groupTileCount: 0,
          sourceProvenanceTileCount: 0,
          modelResolvedTileCount: 4,
          minHeight: 0,
          maxHeight: 0
        },
        tilesetFingerprint: definition.fingerprint
      }
    })));
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        tileProcessReadiness={createTileProcessReadiness({
          status: "partial",
          readyCandidateCount: 3,
          blockedCandidateCount: 1,
          sourceAssetReadyCount: 3,
          sourceAssetBlockedCount: 1,
          renderLoaderReadyCount: 3,
          renderLoaderBlockedCount: 1,
          blockerSummary: "tile_bad: source asset blocked",
          renderAssetContractBlockerSummary: "tile_bad: GLB loader handoff missing"
        })}
        onSceneSelected={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Verify Area" }));
    const report = await screen.findByLabelText("Area verification report");
    expect(report).toHaveAttribute("data-area-verification-status", "invalid");
    expect(report).toHaveTextContent("Tile assets 3/4 ready; 1 blocked; status partial");
    expect(screen.getByRole("button", { name: "Persist new Area to module" })).toBeDisabled();
    expect(JSON.parse(report.getAttribute("data-area-verification-issues") ?? "null"))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: "TILE_ASSET_PROCESS_NOT_READY",
          message: expect.stringContaining("tile_bad: source asset blocked")
        }),
        expect.objectContaining({
          code: "TILE_ASSET_RENDER_CONTRACT_BLOCKERS",
          message: "tile_bad: GLB loader handoff missing"
        })
      ]));
    expect(JSON.parse(report.getAttribute("data-area-verification-asset-readiness") ?? "null"))
      .toMatchObject({
        status: "partial",
        checkedCandidateCount: 4,
        readyCandidateCount: 3,
        blockedCandidateCount: 1,
        renderLoaderBlockedCount: 1
      });
  });
});
