import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuroraAreaEditingPanel,
  resolveAuroraAreaReplaceableTiles
} from "../../../../src/modules/layout/components/AuroraAreaEditingPanel";
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
import type { AreaCreateFacade } from "../../../../src/modules/areas/application/areaCreateFacade";
import type { AreaEditingFacade } from "../../../../src/modules/areas/application/areaEditingFacade";
import type { AreaCreateProfile } from "../../../../src/modules/areas/areaCreateContracts";
import type { AreaUpdateFacade } from "../../../../src/modules/areas/application/areaUpdateFacade";
import { createBrowserAreaEditingFacade } from "../../../../src/modules/areas/composition/createBrowserAreaEditingFacade";
import type { AreaDraftSessionRegistry } from "../../../../src/modules/areas/ports/areaLifecyclePort";
import {
  buildAreaTileCatalogCertificationKey,
  type AreaTileCatalogCertificationIndex,
} from "../../../../src/modules/areas/application/areaTileCatalogFilter";
import type { AreaTileProductionCertificationSource } from "../../../../src/modules/areas/application/areaTileProductionPlacementAdmission";
import type { TileCertificationRow } from "../../../../src/modules/areas/domain/tileCertificationPolicy";

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

const catalogDefinition: AuroraAreaTilesetDefinition = {
  ...definition,
  tilesetResRef: "catalogset",
  tiles: [
    {
      tileId: 0,
      modelResRef: "cat01_floor_00",
      terrain: allCorners("grass"),
      crossers: {},
      cornerHeights: allHeights,
    },
    {
      tileId: 1,
      modelResRef: "cat01_road_01",
      terrain: allCorners("grass"),
      crossers: { top: "road" },
      cornerHeights: allHeights,
    },
    {
      tileId: 2,
      modelResRef: "cat01_house_02",
      terrain: allCorners("stone"),
      crossers: {},
      cornerHeights: allHeights,
      groupIds: ["house"],
    },
    {
      tileId: 3,
      terrain: allCorners("stone"),
      crossers: {},
      cornerHeights: allHeights,
      groupId: "house",
    },
  ],
  groups: [
    { id: "house", name: "Stone House", rows: 1, columns: 2, tileIds: [2, 3] },
  ],
};

const otherCatalogDefinition: AuroraAreaTilesetDefinition = {
  ...catalogDefinition,
  tilesetResRef: "otherset",
  fingerprint: "d".repeat(64),
  tiles: [
    {
      tileId: 77,
      modelResRef: "oth01_cliff_77",
      terrain: allCorners("cliff"),
      crossers: {},
      cornerHeights: allHeights,
    },
  ],
  groups: [],
};

const verifiedTileCertificationProofs: TileCertificationRow["proofs"] = {
  inventory: "verified",
  assetClosure: "verified",
  render: "verified",
  visualSeam: "verified",
  setAdjacency: "verified",
  pathReference: "verified",
  pathConnect: "verified",
  wokSeam: "verified",
  persistence: "verified",
  toolset: "verified",
  nwnRuntime: "verified",
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

function createCatalogEditableScene() {
  const result = hydrateAuroraAreaEditingState({
    areaResRef: "area_catalog",
    width: 2,
    height: 2,
    definition: catalogDefinition,
    tiles: [
      { id: "tile_0_0", row: 0, col: 0, tileId: 0, orientation: 0, height: 0 },
      { id: "tile_0_1", row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
      { id: "tile_1_0", row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
      { id: "tile_1_1", row: 1, col: 1, tileId: 0, orientation: 0, height: 0 },
    ],
  });
  if (!result.ok) throw new Error(result.message);
  return applyAuroraAreaEditingStateToScene(
    {
      ...createSeedAreaScene(2, 2),
      sceneId: "area_catalog",
      areaName: "Catalog Area",
      objects: [],
    },
    result.state,
    catalogDefinition,
    "grass",
  );
}

function createCatalogCertificationIndex(): AreaTileCatalogCertificationIndex {
  const verified = (rowId: string): TileCertificationRow => ({
    rowId,
    eligibility: { status: "eligible" },
    proofs: verifiedTileCertificationProofs,
  });
  return new Map([
    [
      buildAreaTileCatalogCertificationKey(catalogDefinition.tilesetResRef, 0),
      verified("catalog-tile-0"),
    ],
    [
      buildAreaTileCatalogCertificationKey(catalogDefinition.tilesetResRef, 1),
      {
        ...verified("catalog-tile-1"),
        proofs: { ...verifiedTileCertificationProofs, visualSeam: "failed" as const },
      },
    ],
  ]);
}

function catalogProductionCertification(
  index: AreaTileCatalogCertificationIndex = createCatalogCertificationIndex(),
): AreaTileProductionCertificationSource {
  return {
    status: "ready",
    tilesetResRef: catalogDefinition.tilesetResRef,
    index,
  };
}

const atomicCreateProfile: AreaCreateProfile = {
  id: "aur-s05-05-microset-tiny-2x2.v1",
  evidenceScope: "aur-s05-05-structural-candidate",
  tilesetResRef: "tms01",
  width: 2,
  height: 2,
  initializerAlgorithmVersion: "aur-s05-05-observed-grid.v1",
  initializerSeed: 0,
  tiles: [2, 1, 3, 0].map((orientation, index) => ({
    row: Math.floor(index / 2),
    col: index % 2,
    tileId: 12,
    orientation: orientation as 0 | 1 | 2 | 3,
    height: 0,
    mainLight1: 0,
    mainLight2: 0,
    sourceLight1: 0,
    sourceLight2: 0,
    animLoop1: 1,
    animLoop2: 1,
    animLoop3: 1,
  })),
  groupInstances: [],
  fingerprintSha256: "b".repeat(64),
  setFingerprintSha256: "c".repeat(64),
  persistenceStatus: "native-certified",
  materializationAllowed: true,
  certificationId: "aur-s05-05-native-proof-test",
  blockingProofs: [],
};

function createAtomicProfileScene() {
  const atomicDefinition: AuroraAreaTilesetDefinition = {
    ...definition,
    tilesetResRef: "tms01",
    fingerprint: atomicCreateProfile.setFingerprintSha256,
    tiles: [
      {
        tileId: 12,
        terrain: allCorners("grass"),
        crossers: {},
        cornerHeights: allHeights,
      },
    ],
  };
  const result = hydrateAuroraAreaEditingState({
    areaResRef: "area_test",
    width: 2,
    height: 2,
    definition: atomicDefinition,
    tiles: atomicCreateProfile.tiles.map((tile) => ({
      id: `tile_${tile.row}_${tile.col}`,
      ...tile,
    })),
  });
  if (!result.ok) throw new Error(result.message);
  return applyAuroraAreaEditingStateToScene(
    {
      ...createSeedAreaScene(2, 2),
      sceneId: "area_test",
      areaName: "Created Area",
      objects: [],
    },
    result.state,
    atomicDefinition,
    "grass",
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
  it("fails closed with explicit diagnostics when the Area editing facade is absent", () => {
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createEditableScene()}
        tileProcessReadiness={createTileProcessReadiness()}
        onSceneSelected={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Verify Area" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Verify Area" })).toHaveAttribute(
      "title",
      "Area editing facade is unavailable.",
    );
    expect(
      screen.getByRole("button", { name: "Export edited ARE" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Export edited ARE" }),
    ).toHaveAttribute("title", "Area editing facade is unavailable.");
  });

  it("keeps only multi-cell SET members out of individual Tile_ID replacement", () => {
    const singletonGroupDefinition: AuroraAreaTilesetDefinition = {
      ...definition,
      tiles: [
        ...definition.tiles,
        { tileId: 118, modelResRef: "atj01_o07_01", terrain: allCorners("grass"), crossers: {}, cornerHeights: allHeights, groupId: "crystal" }
      ],
      groups: [{ id: "crystal", name: "Crystal", rows: 1, columns: 1, tileIds: [118] }]
    };

    expect(resolveAuroraAreaReplaceableTiles(groupDefinition).map((tile) => tile.tileId)).not.toEqual(
      expect.arrayContaining([2, 3])
    );
    expect(resolveAuroraAreaReplaceableTiles(singletonGroupDefinition).map((tile) => tile.tileId)).toContain(118);
  });

  it("combines tile definition search with category, capability, and certification filters", () => {
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createCatalogEditableScene()}
        tileCatalogCertificationIndex={createCatalogCertificationIndex()}
        tileProductionCertification={catalogProductionCertification()}
        onSceneSelected={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Search tile definitions" }), {
      target: { value: "catalogset road" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Tile category" }), {
      target: { value: "feature-crosser" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Tile capability" }), {
      target: { value: "model-referenced" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Tile certification" }), {
      target: { value: "failed" },
    });

    expect(screen.getByRole("button", { name: /Tile_ID 1.*cat01_road_01/i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Tile_ID 0.*cat01_floor_00/i })).toBeNull();
    expect(screen.getByLabelText("Tile catalog diagnostics")).toHaveAttribute(
      "data-tile-catalog-matched",
      "1",
    );
    expect(screen.getByLabelText("Tile catalog diagnostics")).toHaveTextContent(
      "1 of 4 tile definitions",
    );
  });

  it("disables a catalog candidate whose render closure is failed", () => {
    const index = new Map(createCatalogCertificationIndex());
    index.set(
      buildAreaTileCatalogCertificationKey(catalogDefinition.tilesetResRef, 1),
      {
        rowId: "catalog-tile-1-render-failed",
        eligibility: { status: "eligible" },
        proofs: { ...verifiedTileCertificationProofs, render: "failed" },
      },
    );
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createCatalogEditableScene()}
        tileCatalogCertificationIndex={index}
        tileProductionCertification={catalogProductionCertification(index)}
        onSceneSelected={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Search tile definitions" }), {
      target: { value: "cat01_road_01" },
    });
    const candidate = screen.getByRole("button", { name: /Tile_ID 1.*cat01_road_01/i });
    expect(candidate).toBeDisabled();
    expect(candidate).toHaveAttribute(
      "title",
      expect.stringContaining("AREA_TILE_CERTIFICATION_PROOF_FAILED"),
    );
  });

  it("blocks direct Tile_ID replacement before scene mutation when certification is missing", () => {
    const onSceneMutation = vi.fn();
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createCatalogEditableScene()}
        tileProductionCertification={catalogProductionCertification(new Map())}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Replace Tile_ID" }), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Tile_ID" }));

    expect(onSceneMutation).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "AREA_TILE_CERTIFICATION_ROW_MISSING",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Tile_ID 1");
  });

  it("admits direct Tile_ID replacement when the exact row has render closure", () => {
    const onSceneMutation = vi.fn();
    const index = new Map(createCatalogCertificationIndex());
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createCatalogEditableScene()}
        tileProductionCertification={catalogProductionCertification(index)}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Replace Tile_ID" }), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Tile_ID" }));

    expect(onSceneMutation).toHaveBeenCalledOnce();
    expect(onSceneMutation.mock.calls[0]?.[0].auroraAreaEditing.state.tiles[0].tileId)
      .toBe(1);
  });

  it("fails closed to missing certification when no immutable ledger row is supplied", () => {
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createCatalogEditableScene()}
        onSceneSelected={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Tile certification" }), {
      target: { value: "verified" },
    });
    expect(screen.getByText("No tile definitions match the active catalog filters.")).toBeVisible();

    fireEvent.change(screen.getByRole("combobox", { name: "Tile certification" }), {
      target: { value: "missing" },
    });
    expect(screen.getByLabelText("Tile catalog diagnostics")).toHaveTextContent(
      "4 of 4 tile definitions",
    );
    expect(screen.getByLabelText("Tile catalog diagnostics")).toHaveAttribute(
      "data-tile-catalog-certification-missing",
      "4",
    );
  });

  it("uses replaceable catalog results without enabling individual replacement for group-managed tiles", () => {
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createCatalogEditableScene()}
        onSceneSelected={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Search tile definitions" }), {
      target: { value: "cat01_floor_00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Tile_ID 0.*cat01_floor_00/i }));
    expect(screen.getByRole("combobox", { name: "Replace Tile_ID" })).toHaveValue("0");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search tile definitions" }), {
      target: { value: "Stone House" },
    });
    const groupManaged = screen.getAllByRole("button", { name: /Tile_ID [23]/i });
    expect(groupManaged).toHaveLength(2);
    expect(groupManaged.every((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(groupManaged[0]).toHaveAttribute(
      "title",
      "This Tile_ID belongs to a multi-cell SET group and cannot be replaced individually.",
    );
  });

  it("browses and filters another tileset catalog without making it replaceable in the active Area", async () => {
    const listTilesets = vi.fn().mockResolvedValue([
      { tilesetResRef: "catalogset", displayName: "Catalog Set" },
      { tilesetResRef: "otherset", displayName: "Other Set" },
    ]);
    const getTilesetDefinition = vi.fn().mockResolvedValue(otherCatalogDefinition);
    const getTileCertificationIndex = vi.fn().mockResolvedValue(new Map([
      [
        buildAreaTileCatalogCertificationKey("otherset", 77),
        {
          rowId: "tile:otherset:77",
          eligibility: { status: "eligible" },
          proofs: verifiedTileCertificationProofs,
        },
      ],
    ]));
    const areaEditingFacade = {
      queries: {
        listTilesets,
        getTilesetDefinition,
        getTileCertificationIndex,
        getDefinitionForArea: vi.fn(),
        verify: vi.fn(),
      },
      commands: { exportAndDownloadAre: vi.fn() },
    } as unknown as AreaEditingFacade;

    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createCatalogEditableScene()}
        areaEditingFacade={areaEditingFacade}
        onSceneSelected={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Browse catalog tilesets" }));
    expect(await screen.findByRole("option", { name: "Other Set (otherset)" })).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "Catalog tileset" }), {
      target: { value: "otherset" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load selected tile catalog" }));
    await waitFor(() => expect(getTilesetDefinition).toHaveBeenCalledWith("token", "otherset"));
    await waitFor(() => expect(getTileCertificationIndex).toHaveBeenCalledWith(
      "token",
      "otherset",
    ));

    fireEvent.change(screen.getByRole("searchbox", { name: "Search tile definitions" }), {
      target: { value: "oth01_cliff_77" },
    });
    expect(screen.getByLabelText("Tile catalog diagnostics")).toHaveAttribute(
      "data-tile-catalog-tileset",
      "otherset",
    );
    expect(screen.getByLabelText("Tile catalog diagnostics")).toHaveAttribute(
      "data-tile-catalog-certification-verified",
      "1",
    );
    const result = screen.getByRole("button", { name: /Tile_ID 77.*oth01_cliff_77/i });
    expect(result).toBeDisabled();
    expect(result).toHaveAttribute(
      "title",
      "This definition belongs to another tileset and cannot replace a tile in the active Area.",
    );
  });

  it("keeps a loaded catalog visible and fails closed to missing when certification delivery fails", async () => {
    const areaEditingFacade = {
      queries: {
        listTilesets: vi.fn().mockResolvedValue([
          { tilesetResRef: "catalogset", displayName: "Catalog Set" },
          { tilesetResRef: "otherset", displayName: "Other Set" },
        ]),
        getTilesetDefinition: vi.fn().mockResolvedValue(otherCatalogDefinition),
        getTileCertificationIndex: vi.fn().mockRejectedValue(
          new Error("sensitive transport detail"),
        ),
        getDefinitionForArea: vi.fn(),
        verify: vi.fn(),
      },
      commands: { exportAndDownloadAre: vi.fn() },
    } as unknown as AreaEditingFacade;

    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createCatalogEditableScene()}
        areaEditingFacade={areaEditingFacade}
        onSceneSelected={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Browse catalog tilesets" }));
    await screen.findByRole("option", { name: "Other Set (otherset)" });
    fireEvent.change(screen.getByRole("combobox", { name: "Catalog tileset" }), {
      target: { value: "otherset" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load selected tile catalog" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tile certification ledger is unavailable; certification remains missing.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("sensitive transport detail");
    expect(screen.getByLabelText("Tile catalog diagnostics")).toHaveAttribute(
      "data-tile-catalog-tileset",
      "otherset",
    );
    expect(screen.getByLabelText("Tile catalog diagnostics")).toHaveAttribute(
      "data-tile-catalog-certification-missing",
      "1",
    );
  });

  it("rejects a mismatched tileset definition response and keeps the prior catalog visible", async () => {
    const areaEditingFacade = {
      queries: {
        listTilesets: vi.fn().mockResolvedValue([
          { tilesetResRef: "catalogset", displayName: "Catalog Set" },
          { tilesetResRef: "otherset", displayName: "Other Set" },
        ]),
        getTilesetDefinition: vi.fn().mockResolvedValue(catalogDefinition),
        getDefinitionForArea: vi.fn(),
        verify: vi.fn(),
      },
      commands: { exportAndDownloadAre: vi.fn() },
    } as unknown as AreaEditingFacade;

    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createCatalogEditableScene()}
        areaEditingFacade={areaEditingFacade}
        onSceneSelected={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Browse catalog tilesets" }));
    await screen.findByRole("option", { name: "Other Set (otherset)" });
    fireEvent.change(screen.getByRole("combobox", { name: "Catalog tileset" }), {
      target: { value: "otherset" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load selected tile catalog" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tile catalog response returned catalogset for requested otherset.",
    );
    expect(screen.getByLabelText("Tile catalog diagnostics")).toHaveAttribute(
      "data-tile-catalog-tileset",
      "catalogset",
    );
  });

  it("creates a blank local Area when there is no active scene", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ tilesetResRef: "testset", displayName: "Test Set" }] })
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
        areaEditingFacade={createBrowserAreaEditingFacade()}
        onSceneSelected={onSceneSelected}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "New blank local Area" }));
    await screen.findByRole("group", { name: "New Area settings" });
    expect(screen.getByRole("option", { name: "Test Set (testset)" })).toBeInTheDocument();
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

  it("offers a visible development proof initializer that seeds every new Area cell from the first compatible SET candidate", async () => {
    const variantDefinition: AuroraAreaTilesetDefinition = {
      ...definition,
      tiles: [
        definition.tiles[0],
        {
          tileId: 9,
          terrain: allCorners("grass"),
          crossers: {},
          cornerHeights: allHeights
        }
      ]
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ tilesetResRef: "testset", displayName: "Test Set" }] })
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            tilesetResRef: variantDefinition.tilesetResRef,
            fingerprint: variantDefinition.fingerprint,
            defaults: { defaultTerrain: variantDefinition.defaultTerrain },
            transitionRules: variantDefinition.transitionRules,
            tiles: variantDefinition.tiles,
            groups: variantDefinition.groups
          }
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    const onSceneSelected = vi.fn();

    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={null}
        areaEditingFacade={createBrowserAreaEditingFacade()}
        tileProductionCertification={{
          status: "unavailable",
          tilesetResRef: "testset",
          reasonCode: "LOAD_FAILED",
        }}
        onSceneSelected={onSceneSelected}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "New blank local Area" }));
    await screen.findByRole("group", { name: "New Area settings" });
    fireEvent.change(screen.getByLabelText("Development proof initializer"), {
      target: { value: "first-compatible" }
    });
    fireEvent.change(screen.getByLabelText("Area resref"), { target: { value: "matrix_seed" } });
    fireEvent.click(screen.getByRole("button", { name: "Create local Area" }));

    await waitFor(() => expect(onSceneSelected).toHaveBeenCalledTimes(1));
    const createdScene = onSceneSelected.mock.calls[0]?.[0] as AreaScene;
    expect(createdScene.tiles).toHaveLength(16);
    expect(createdScene.tiles.map((tile) => tile.tileId)).toEqual(Array(16).fill(0));

    onSceneSelected.mockClear();
    fireEvent.change(screen.getByLabelText("Area resref"), {
      target: { value: "regular_seed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create local Area" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AREA_TILE_CERTIFICATION_UNAVAILABLE",
    );
    expect(onSceneSelected).not.toHaveBeenCalled();
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

  it("shows WOK geometry and native PathConnect as independent connectivity verdicts", () => {
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createEditableScene()}
        onSceneSelected={vi.fn()}
      />
    );

    const report = screen.getByRole("region", { name: "Area tile connectivity diagnostics" });
    expect(report).toHaveAttribute("data-area-path-connect-status", "missing");
    expect(report).toHaveAttribute("data-area-wok-geometric-contact-seams", "0");
    expect(report).toHaveAttribute("data-area-wok-unresolved-seams", "4");
    expect(report).toHaveTextContent("Native PathConnect missing");
    expect(report).toHaveTextContent("WOK geometric contacts 0/4");
    expect(report).toHaveTextContent("This is not a traversability claim");
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

  it("requires Verify and candidate validation before atomically creating ARE/GIT/GIC/IFO", async () => {
    const scene = createAtomicProfileScene();
    const areSha = "e".repeat(64);
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({
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
          tilesetFingerprint: atomicCreateProfile.setFingerprintSha256
        }
      }));
    vi.stubGlobal("fetch", fetchMock);
    const getProfiles = vi.fn(async () => ({
      ok: true as const,
      value: {
        moduleId: "workspace-module",
        moduleRevision: "a".repeat(64),
        profiles: [atomicCreateProfile],
      },
      metadata: { contractVersion: "1.0.0", requestId: "profiles-1" },
    }));
    const validate = vi.fn(async () => ({
      ok: true as const,
      value: {
        validationId: "validation-1",
        commandHash: "f".repeat(64),
        moduleId: "workspace-module",
        moduleRevision: "a".repeat(64),
        profileFingerprintSha256: atomicCreateProfile.fingerprintSha256,
        setFingerprintSha256: atomicCreateProfile.setFingerprintSha256,
        validatorVersion: "validator.v1",
        resources: ["are", "git", "gic"].map((extension) => ({
          extension: extension as "are" | "git" | "gic",
          fileName: `area_test.${extension}`,
          resourceType: 1,
          size: 10,
          sha256: extension === "are" ? areSha : "1".repeat(64),
        })),
        moduleIfo: { fileName: "module.ifo", size: 20, sha256: "2".repeat(64) },
        createdAt: "2026-08-07T12:00:00.000Z",
        expiresAt: "2026-08-07T12:05:00.000Z",
      },
      metadata: { contractVersion: "1.0.0", requestId: "validation-1" },
    }));
    const create = vi.fn(async () => ({
      ok: true as const,
      value: {
        idempotency: "created" as const,
        receipt: {
          schemaVersion: "area-create-receipt.v1" as const,
          transactionId: "transaction-1",
          areaId: "area_test",
          resRef: "area_test",
          name: "Created Area",
          tag: "area_test",
          moduleId: "workspace-module",
          previousModuleRevision: "a".repeat(64),
          newModuleRevision: "9".repeat(64),
          profileId: atomicCreateProfile.id,
          profileFingerprintSha256: atomicCreateProfile.fingerprintSha256,
          setFingerprintSha256: atomicCreateProfile.setFingerprintSha256,
          draftNormalizedSha256: "d".repeat(64),
          commandHash: "f".repeat(64),
          validatorVersion: "validator.v1",
          resources: ["are", "git", "gic"].map((extension) => ({
            extension: extension as "are" | "git" | "gic",
            key: `area_test.${extension}`,
            fileName: `area_test.${extension}`,
            resourceType: 1,
            size: 10,
            sha256: extension === "are" ? areSha : "1".repeat(64),
          })),
          moduleIfo: { key: "module.ifo", size: 20, sha256: "2".repeat(64) },
          readbackStatus: "verified" as const,
          warnings: [],
          createdAt: "2026-08-07T12:01:00.000Z",
        },
      },
      metadata: {
        contractVersion: "1.0.0",
        requestId: "create-1",
        moduleRevision: "9".repeat(64),
        etag: `"${"9".repeat(64)}"`,
      },
    }));
    const areaCreateFacade = {
      queries: { getProfiles },
      commands: { validate, create },
    } as AreaCreateFacade;
    const onSceneSelected = vi.fn();
    const onAreaWorkspaceStatusChange = vi.fn();
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        tileProcessReadiness={createTileProcessReadiness()}
        areaEditingFacade={createBrowserAreaEditingFacade()}
        areaCreateFacade={areaCreateFacade}
        onSceneSelected={onSceneSelected}
        onAreaWorkspaceStatusChange={onAreaWorkspaceStatusChange}
      />
    );

    const validateButton = screen.getByRole("button", { name: "Validate atomic Area Create" });
    expect(validateButton).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Verify Area" }));
    await waitFor(() => expect(validateButton).toBeEnabled());
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

    fireEvent.change(screen.getByLabelText("Area module tag"), {
      target: { value: "area_test" },
    });
    fireEvent.click(validateButton);
    await screen.findByLabelText("Atomic Area Create validation");
    const createButton = screen.getByRole("button", { name: "Create Area atomically" });
    expect(createButton).toBeEnabled();
    expect(getProfiles).toHaveBeenCalledWith("token");
    expect(validate).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: "token",
      moduleId: "workspace-module",
      command: expect.objectContaining({
        expectedModuleRevision: "a".repeat(64),
        area: { name: "Created Area", resRef: "area_test", tag: "area_test" },
      }),
    }));

    fireEvent.click(createButton);
    await waitFor(() => expect(onSceneSelected).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/_aurora/v1/areas/editing/verify"]);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: "token",
      moduleId: "workspace-module",
      idempotencyKey: expect.stringMatching(/^area-create-/u),
    }));
    expect(onSceneSelected.mock.calls[0]?.[0].auroraAreaEditing.state.sourceAreaFingerprint).toBe(
      areSha
    );
    expect(
      onAreaWorkspaceStatusChange.mock.calls.map(([event]) => [event.lane, event.state])
    ).toEqual([
      ["verification", "checking"],
      ["verification", "verified"],
      ["materialization", "validating"],
      ["materialization", "ready"],
      ["materialization", "materializing"],
      ["materialization", "verified"],
    ]);
  });

  it("keeps module materialization disabled after validation when the profile lacks native certification", async () => {
    const blockedProfile: AreaCreateProfile = {
      ...atomicCreateProfile,
      persistenceStatus: "structural-candidate-awaiting-native-certification",
      materializationAllowed: false,
      certificationId: null,
      blockingProofs: ["runtime-canvas", "toolset-save-build", "nwn-runtime-load"],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({
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
          maxHeight: 0,
        },
        tilesetFingerprint: blockedProfile.setFingerprintSha256,
      },
    })));
    const create = vi.fn();
    const areaCreateFacade = {
      queries: {
        getProfiles: vi.fn(async () => ({
          ok: true as const,
          value: {
            moduleId: "workspace-module",
            moduleRevision: "a".repeat(64),
            profiles: [blockedProfile],
          },
          metadata: { contractVersion: "1.0.0", requestId: "profiles-blocked" },
        })),
      },
      commands: {
        validate: vi.fn(async () => ({
          ok: true as const,
          value: {
            validationId: "validation-blocked",
            commandHash: "f".repeat(64),
            moduleId: "workspace-module",
            moduleRevision: "a".repeat(64),
            profileFingerprintSha256: blockedProfile.fingerprintSha256,
            setFingerprintSha256: blockedProfile.setFingerprintSha256,
            validatorVersion: "validator.v1",
            resources: ["are", "git", "gic"].map((extension) => ({
              extension: extension as "are" | "git" | "gic",
              fileName: `area_test.${extension}`,
              resourceType: 1,
              size: 10,
              sha256: "1".repeat(64),
            })),
            moduleIfo: {
              fileName: "module.ifo",
              size: 20,
              sha256: "2".repeat(64),
            },
            createdAt: "2026-08-07T12:00:00.000Z",
            expiresAt: "2026-08-07T12:05:00.000Z",
          },
          metadata: {
            contractVersion: "1.0.0",
            requestId: "validation-blocked",
          },
        })),
        create,
      },
    } as AreaCreateFacade;

    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={createAtomicProfileScene()}
        tileProcessReadiness={createTileProcessReadiness()}
        areaEditingFacade={createBrowserAreaEditingFacade()}
        areaCreateFacade={areaCreateFacade}
        onSceneSelected={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Verify Area" }));
    const validateButton = screen.getByRole("button", {
      name: "Validate atomic Area Create",
    });
    await waitFor(() => expect(validateButton).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Area module tag"), {
      target: { value: "area_test" },
    });
    fireEvent.click(validateButton);

    const createButton = await screen.findByRole("button", {
      name: "Create Area atomically",
    });
    expect(createButton).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "runtime-canvas, toolset-save-build, nwn-runtime-load",
    );
    fireEvent.click(createButton);
    expect(create).not.toHaveBeenCalled();
  });

  it("validates and atomically updates only the exact persisted production draft revision", async () => {
    const baseScene = createAtomicProfileScene();
    const scene: AreaScene = {
      ...baseScene,
      source: "aurora_area",
      updatedAtUnixMs: 1234,
      auroraAreaEditing: {
        ...baseScene.auroraAreaEditing!,
        state: {
          ...baseScene.auroraAreaEditing!.state,
          sourceAreaFingerprint: "a".repeat(64)
        }
      }
    };
    const sessions: AreaDraftSessionRegistry = {
      current: {
        area_test: {
          draftId: "draft-production-01",
          revision: 7,
          normalizedSha256: "c".repeat(64),
          persistedSceneUpdatedAtUnixMs: scene.updatedAtUnixMs,
          productionSource: {
            schemaVersion: "production-area-draft-payload.v1",
            sourceArea: {} as never,
            provenance: {
              areaId: "area_test",
              sourceUpdatedAt: "2026-08-18T20:00:00.000Z",
              processingCacheKey: "cache-01",
              sourceAreSha256: "a".repeat(64)
            }
          }
        }
      }
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({
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
        tilesetFingerprint: atomicCreateProfile.setFingerprintSha256
      }
    })));
    const getProfiles = vi.fn(async () => ({
      ok: true as const,
      value: {
        moduleId: "workspace-module",
        moduleRevision: "b".repeat(64),
        profiles: [atomicCreateProfile]
      },
      metadata: { contractVersion: "1.1.0", requestId: "profiles-update" }
    }));
    const validate = vi.fn(async () => ({
      ok: true as const,
      value: {
        validationId: "update-validation-01",
        moduleRevision: "b".repeat(64),
        areaResRef: "area_test",
        draft: {
          id: "draft-production-01",
          revision: 7,
          normalizedSha256: "c".repeat(64)
        },
        expiresAt: "2026-08-18T20:05:00.000Z"
      },
      metadata: {
        contractVersion: "1.1.0",
        requestId: "update-validation-01",
        moduleRevision: "b".repeat(64),
        etag: `"${"b".repeat(64)}"`
      }
    })) as AreaUpdateFacade["commands"]["validate"];
    const update = vi.fn(async () => ({
      ok: true as const,
      value: {
        transactionId: "update-transaction-01",
        areaResRef: "area_test",
        newModuleRevision: "d".repeat(64),
        candidateAreaSha256: "e".repeat(64),
        readbackStatus: "verified" as const
      },
      metadata: {
        contractVersion: "1.1.0",
        requestId: "update-transaction-01",
        moduleRevision: "d".repeat(64),
        etag: `"${"d".repeat(64)}"`,
        idempotencyStatus: "created" as const
      }
    })) as AreaUpdateFacade["commands"]["update"];
    const areaUpdateFacade = { commands: { validate, update } } as AreaUpdateFacade;
    const areaCreateFacade = {
      queries: { getProfiles },
      commands: { validate: vi.fn(), create: vi.fn() }
    } as AreaCreateFacade;
    const onSceneSelected = vi.fn();
    const onAreaMaterialized = vi.fn();

    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={scene}
        tileProcessReadiness={createTileProcessReadiness()}
        areaEditingFacade={createBrowserAreaEditingFacade()}
        areaCreateFacade={areaCreateFacade}
        areaUpdateFacade={areaUpdateFacade}
        areaDraftSessionRegistry={sessions}
        canMaterializeAreas
        onAreaMaterialized={onAreaMaterialized}
        onSceneSelected={onSceneSelected}
      />
    );

    const validateButton = screen.getByRole("button", {
      name: "Validate atomic Area Update"
    });
    expect(validateButton).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Verify Area" }));
    await waitFor(() => expect(validateButton).toBeEnabled());
    fireEvent.click(validateButton);

    await screen.findByLabelText("Atomic Area Update validation");
    expect(validate).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: "token",
      moduleId: "workspace-module",
      areaResRef: "area_test",
      command: {
        schemaVersion: "area-update-validation.v1",
        moduleId: "workspace-module",
        areaResRef: "area_test",
        expectedModuleRevision: "b".repeat(64),
        draft: {
          id: "draft-production-01",
          revision: 7,
          normalizedSha256: "c".repeat(64)
        },
        clientCommandId: expect.stringMatching(/^command-/u)
      }
    }));

    fireEvent.click(screen.getByRole("button", { name: "Update Area atomically" }));
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: expect.stringMatching(/^area-update-/u),
      command: expect.objectContaining({ schemaVersion: "area-update-command.v1" })
    }));
    expect(onSceneSelected.mock.calls[0]?.[0].auroraAreaEditing.state.sourceAreaFingerprint)
      .toBe("e".repeat(64));
    expect(onAreaMaterialized).toHaveBeenCalledOnce();
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
        areaEditingFacade={createBrowserAreaEditingFacade()}
        onSceneSelected={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Verify Area" }));
    const report = await screen.findByLabelText("Area verification report");
    expect(report).toHaveAttribute("data-area-verification-status", "invalid");
    expect(report).toHaveTextContent("Tile assets 3/4 ready; 1 blocked; status partial");
    expect(screen.getByRole("button", { name: "Validate atomic Area Create" })).toBeDisabled();
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
