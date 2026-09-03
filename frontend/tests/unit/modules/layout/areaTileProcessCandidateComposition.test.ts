import { describe, expect, it } from "vitest";
import { buildAreaTileCatalogCertificationKey } from "../../../../src/modules/areas/application/areaTileCatalogFilter";
import type { AreaTileProductionCertificationSource } from "../../../../src/modules/areas/application/areaTileProductionPlacementAdmission";
import { composeAreaTileProcessContractCandidates } from "../../../../src/modules/layout/application/areaTileProcessCandidateComposition";

const verifiedProofs = {
  inventory: "verified",
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
} as const;

describe("areaTileProcessCandidateComposition", () => {
  it("maps immutable certification rows to generic process dispositions", () => {
    const tilesetResRef = "example01";
    const certification: AreaTileProductionCertificationSource = {
      status: "ready",
      tilesetResRef,
      index: new Map([
        [
          buildAreaTileCatalogCertificationKey(tilesetResRef, 1),
          {
            rowId: "tile:example01:1",
            eligibility: {
              status: "excluded" as const,
              reasonCode: "ARBITRARY_EXCLUDED_REASON",
              reason: "Excluded by immutable catalog"
            },
            proofs: { ...verifiedProofs, inventory: "missing" as const }
          }
        ],
        [
          buildAreaTileCatalogCertificationKey(tilesetResRef, 2),
          {
            rowId: "tile:example01:2",
            eligibility: { status: "eligible" as const },
            proofs: { ...verifiedProofs, inventory: "failed" as const }
          }
        ],
        [
          buildAreaTileCatalogCertificationKey(tilesetResRef, 3),
          {
            rowId: "tile:example01:3",
            eligibility: { status: "eligible" as const },
            proofs: verifiedProofs
          }
        ]
      ])
    };

    expect(
      composeAreaTileProcessContractCandidates(
        [
          { tileId: 1, modelResRef: "first_arbitrary_name" },
          { tileId: 2, modelResRef: "second_arbitrary_name" },
          { tileId: 3, modelResRef: "third_arbitrary_name" }
        ],
        tilesetResRef,
        certification
      )
    ).toEqual([
      {
        modelResRef: "first_arbitrary_name",
        tileDefinitionId: 1,
        disposition: "excluded",
        reasonCode: "ARBITRARY_EXCLUDED_REASON"
      },
      {
        modelResRef: "second_arbitrary_name",
        tileDefinitionId: 2,
        disposition: "blocked",
        reasonCode: "TILE_MODEL_INVENTORY_FAILED"
      },
      {
        modelResRef: "third_arbitrary_name",
        tileDefinitionId: 3,
        disposition: "process"
      }
    ]);
  });

  it("processes conservatively when certification is unavailable or unbound", () => {
    const unavailable: AreaTileProductionCertificationSource = {
      status: "unavailable",
      tilesetResRef: "example01",
      reasonCode: "LOAD_FAILED"
    };

    expect(
      composeAreaTileProcessContractCandidates(
        [{ tileId: 7, modelResRef: "renamed_without_policy" }],
        "example01",
        unavailable
      )
    ).toEqual([
      {
        modelResRef: "renamed_without_policy",
        tileDefinitionId: 7,
        disposition: "process"
      }
    ]);
  });
});
