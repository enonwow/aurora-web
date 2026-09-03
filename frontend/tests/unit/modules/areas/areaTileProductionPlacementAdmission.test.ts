import { describe, expect, it } from "vitest";
import {
  collectChangedAuroraAreaTileDefinitionIds,
  evaluateAreaTileProductionPlacementAdmission,
  type AreaTileProductionCertificationSource,
} from "../../../../src/modules/areas/application/areaTileProductionPlacementAdmission";
import { buildAreaTileCatalogCertificationKey } from "../../../../src/modules/areas/application/areaTileCatalogFilter";
import type {
  TileCertificationProofs,
  TileCertificationRow,
} from "../../../../src/modules/areas/domain/tileCertificationPolicy";
import type { AuroraAreaEditingState } from "../../../../src/modules/scene/domain/auroraAreaEditing";

const verifiedProofs: TileCertificationProofs = {
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
  nwnRuntime: "missing",
};

function row(
  tileId: number,
  overrides: Partial<TileCertificationRow> = {},
): TileCertificationRow {
  return {
    rowId: `tile:testset:${tileId}`,
    eligibility: { status: "eligible" },
    proofs: verifiedProofs,
    ...overrides,
  };
}

function ready(
  rows: ReadonlyArray<readonly [number, TileCertificationRow]>,
  tilesetResRef = "testset",
): AreaTileProductionCertificationSource {
  return {
    status: "ready",
    tilesetResRef,
    index: new Map(rows.map(([tileId, certification]) => [
      buildAreaTileCatalogCertificationKey(tilesetResRef, tileId),
      certification,
    ])),
  };
}

describe("Area tile production placement admission", () => {
  it("admits deduplicated Tile_IDs with render closure even while connection proofs remain missing", () => {
    const result = evaluateAreaTileProductionPlacementAdmission({
      tilesetResRef: "TESTSET",
      candidateTileIds: [7, 2, 7],
      certification: ready([[2, row(2)], [7, row(7)]]),
    });

    expect(result).toEqual({
      allowed: true,
      code: "AREA_TILE_PRODUCTION_PLACEMENT_ADMITTED",
      tilesetResRef: "testset",
      tileIds: [2, 7],
      diagnostics: [],
    });
  });

  it.each([
    [
      { status: "loading", tilesetResRef: "testset" } as const,
      "AREA_TILE_CERTIFICATION_LOADING",
    ],
    [
      {
        status: "unavailable",
        tilesetResRef: "testset",
        reasonCode: "LOAD_FAILED",
      } as const,
      "AREA_TILE_CERTIFICATION_UNAVAILABLE",
    ],
  ])("fails closed for a %s certification source", (certification, code) => {
    const result = evaluateAreaTileProductionPlacementAdmission({
      tilesetResRef: "testset",
      candidateTileIds: [2],
      certification,
    });

    expect(result).toMatchObject({
      allowed: false,
      code,
      tilesetResRef: "testset",
      tileIds: [2],
      diagnostics: [{ tileId: 2, stage: "source" }],
    });
  });

  it("rejects a ready index bound to another tileset", () => {
    expect(evaluateAreaTileProductionPlacementAdmission({
      tilesetResRef: "testset",
      candidateTileIds: [2],
      certification: ready([[2, row(2)]], "otherset"),
    })).toMatchObject({
      allowed: false,
      code: "AREA_TILE_CERTIFICATION_TILESET_MISMATCH",
      diagnostics: [{ tileId: 2, stage: "source" }],
    });
  });

  it("rejects a missing exact ledger row", () => {
    expect(evaluateAreaTileProductionPlacementAdmission({
      tilesetResRef: "testset",
      candidateTileIds: [9],
      certification: ready([]),
    })).toMatchObject({
      allowed: false,
      code: "AREA_TILE_CERTIFICATION_ROW_MISSING",
      diagnostics: [{ tileId: 9, stage: "row", status: "missing" }],
    });
  });

  it("rejects an excluded row without consulting its proof values", () => {
    expect(evaluateAreaTileProductionPlacementAdmission({
      tilesetResRef: "testset",
      candidateTileIds: [4],
      certification: ready([[4, row(4, {
        eligibility: {
          status: "excluded",
          reasonCode: "TILE_MODEL_INTENTIONAL_PLACEHOLDER",
          reason: "Intentional placeholder",
        },
        proofs: { ...verifiedProofs, render: "failed" },
      })]]),
    })).toMatchObject({
      allowed: false,
      code: "AREA_TILE_CERTIFICATION_EXCLUDED",
      diagnostics: [{
        tileId: 4,
        rowId: "tile:testset:4",
        stage: "eligibility",
        status: "excluded",
        reasonCode: "TILE_MODEL_INTENTIONAL_PLACEHOLDER",
      }],
    });
  });

  it.each(["inventory", "assetClosure", "render"] as const)(
    "rejects missing and failed %s proof independently",
    (stage) => {
      const missing = evaluateAreaTileProductionPlacementAdmission({
        tilesetResRef: "testset",
        candidateTileIds: [3],
        certification: ready([[3, row(3, {
          proofs: { ...verifiedProofs, [stage]: "missing" },
        })]]),
      });
      const failed = evaluateAreaTileProductionPlacementAdmission({
        tilesetResRef: "testset",
        candidateTileIds: [3],
        certification: ready([[3, row(3, {
          proofs: { ...verifiedProofs, [stage]: "failed" },
        })]]),
      });

      expect(missing).toMatchObject({
        allowed: false,
        code: "AREA_TILE_CERTIFICATION_PROOF_MISSING",
        diagnostics: [{ tileId: 3, stage, status: "missing" }],
      });
      expect(failed).toMatchObject({
        allowed: false,
        code: "AREA_TILE_CERTIFICATION_PROOF_FAILED",
        diagnostics: [{ tileId: 3, stage, status: "failed" }],
      });
    },
  );

  it("rejects a mixed multi-tile candidate atomically and orders diagnostics", () => {
    const result = evaluateAreaTileProductionPlacementAdmission({
      tilesetResRef: "testset",
      candidateTileIds: [8, 2, 6],
      certification: ready([
        [2, row(2)],
        [6, row(6, { proofs: { ...verifiedProofs, render: "missing" } })],
      ]),
    });

    expect(result).toMatchObject({
      allowed: false,
      code: "AREA_TILE_CERTIFICATION_PROOF_MISSING",
      tileIds: [2, 6, 8],
      diagnostics: [
        { tileId: 6, stage: "render", status: "missing" },
        { tileId: 8, stage: "row", status: "missing" },
      ],
    });
  });

  it("returns no topology candidates for property-only edits and includes result Tile_IDs for topology edits", () => {
    const before = state([
      tile(0, 0, 1),
      tile(0, 1, 2),
      tile(1, 0, 3),
    ]);
    const propertyOnly = state([
      { ...tile(0, 0, 1), mainLight1: 7 },
      tile(0, 1, 2),
      tile(1, 0, 3),
    ]);
    const topology = state([
      { ...tile(0, 0, 1), orientation: 1 },
      { ...tile(0, 1, 9), groupId: "house" },
      { ...tile(1, 0, 3), height: 1 },
    ]);

    expect(collectChangedAuroraAreaTileDefinitionIds(before, propertyOnly)).toEqual([]);
    expect(collectChangedAuroraAreaTileDefinitionIds(before, topology)).toEqual([1, 3, 9]);
  });
});

function tile(row: number, col: number, tileId: number) {
  return {
    id: `tile_${row}_${col}`,
    row,
    col,
    tileId,
    orientation: 0 as const,
    height: 0,
  };
}

function state(
  tiles: AuroraAreaEditingState["tiles"],
): AuroraAreaEditingState {
  return {
    areaResRef: "area_test",
    tilesetResRef: "testset",
    width: 2,
    height: 2,
    tiles,
    groups: [],
  };
}
