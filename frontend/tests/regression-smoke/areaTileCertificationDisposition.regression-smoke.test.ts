import { describe, expect, it, vi } from "vitest";
import { buildAreaTileCatalogCertificationKey } from "../../src/modules/areas/application/areaTileCatalogFilter";
import type { AreaTileProductionCertificationSource } from "../../src/modules/areas/application/areaTileProductionPlacementAdmission";
import { composeAreaTileProcessContractCandidates } from "../../src/modules/layout/application/areaTileProcessCandidateComposition";
import { resolveTerrainRenderStatus } from "../../src/modules/layout/adapters/three/workspaceTerrainMesh";
import { resolveAreaTileProcessContractReadinessForCandidates } from "../../src/modules/tiles/application/areaTileProcessContractReadiness";
import type { AreaScene } from "../../src/modules/scene/contracts";
import { createSeedAreaScene } from "../../src/modules/scene/domain/sceneFactory";
import type { TileApiPort } from "../../src/modules/tiles/ports/tileApiPort";

describe("Area tile certification disposition regression", () => {
  it("represents a typed excluded tile without model-name inference or backend processing", async () => {
    const tilesetResRef = "regression01";
    const tileId = 41;
    const certification: AreaTileProductionCertificationSource = {
      status: "ready",
      tilesetResRef,
      index: new Map([
        [
          buildAreaTileCatalogCertificationKey(tilesetResRef, tileId),
          {
            rowId: "tile:regression01:41",
            eligibility: {
              status: "excluded",
              reasonCode: "IMMUTABLE_TEST_EXCLUSION",
              reason: "Excluded by the immutable regression manifest."
            },
            proofs: {
              inventory: "missing",
              assetClosure: "missing",
              render: "missing",
              visualSeam: "missing",
              setAdjacency: "missing",
              pathReference: "missing",
              pathConnect: "missing",
              wokSeam: "missing",
              persistence: "missing",
              toolset: "missing",
              nwnRuntime: "missing"
            }
          }
        ]
      ])
    };
    const scene = {
      ...createSeedAreaScene(),
      sceneId: "area_certification_regression",
      source: "aurora_area",
      width: 1,
      height: 1,
      tileSource: { type: "aurora_tile_list", tilesetResRef, tileCount: 1 },
      tiles: [
        {
          id: "area_certification_regression:r0:c0",
          row: 0,
          col: 0,
          tileId,
          terrain: "floor",
          orientation: 0,
          rotateTexture: false,
          plot: false,
          source: "aurora_tile_list",
          modelResRef: "opaque_asset_name"
        }
      ]
    } as AreaScene;
    const candidates = composeAreaTileProcessContractCandidates(
      scene.tiles,
      tilesetResRef,
      certification
    );
    const processTiles = vi.fn();
    const tileApiPort: TileApiPort = {
      processTile: vi.fn(),
      processTiles,
      getTileTextureAtlasContracts: vi.fn()
    };

    const readiness = await resolveAreaTileProcessContractReadinessForCandidates(
      tileApiPort,
      "token",
      scene.sceneId,
      candidates
    );
    const renderStatus = resolveTerrainRenderStatus(scene, readiness);

    expect(processTiles).not.toHaveBeenCalled();
    expect(readiness.status).toBe("ready");
    expect(readiness.excludedTileDefinitionIds).toEqual([tileId]);
    expect(renderStatus.renderGenericMesh).toBe(false);
    expect(renderStatus.label).toBe("Aurora tile models loaded (1/1 tile cells)");
  });
});
