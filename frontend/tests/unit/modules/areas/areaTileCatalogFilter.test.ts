import { describe, expect, it } from "vitest";

import {
  buildAreaTileCatalogCertificationKey,
  filterAreaTileCatalog,
  type AreaTileCatalogCertificationIndex,
} from "../../../../src/modules/areas/application/areaTileCatalogFilter";
import type {
  TileCertificationProofs,
  TileCertificationRow,
} from "../../../../src/modules/areas/domain/tileCertificationPolicy";
import type { AuroraAreaTilesetDefinition } from "../../../../src/modules/scene/domain/auroraAreaEditing";

const verifiedProofs: TileCertificationProofs = {
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

const definition: AuroraAreaTilesetDefinition = {
  tilesetResRef: "TestSET",
  fingerprint: "a".repeat(64),
  transitionRules: [],
  tiles: [
    {
      tileId: 0,
      modelResRef: "tst01_floor_00",
      terrain: { topLeft: "grass", topRight: "grass" },
      crossers: {},
      cornerHeights: { topLeft: 0, topRight: 0 },
    },
    {
      tileId: 1,
      modelResRef: "tst01_road_01",
      terrain: { topLeft: "grass", topRight: "grass" },
      crossers: { top: "road" },
      cornerHeights: { topLeft: 0, topRight: 0 },
    },
    {
      tileId: 2,
      modelResRef: "tst01_house_02",
      terrain: { topLeft: "stone", topRight: "stone" },
      crossers: {},
      cornerHeights: { topLeft: 0, topRight: 0 },
      groupIds: ["house"],
    },
    {
      tileId: 3,
      terrain: { topLeft: "stone", topRight: "stone" },
      crossers: {},
      cornerHeights: { topLeft: 0, topRight: 0 },
      groupId: "house",
    },
  ],
  groups: [
    {
      id: "house",
      name: "Stone House",
      rows: 1,
      columns: 2,
      tileIds: [2, 3],
    },
  ],
};

function row(
  rowId: string,
  overrides: Partial<TileCertificationRow> = {},
): TileCertificationRow {
  return {
    rowId,
    eligibility: { status: "eligible" },
    proofs: verifiedProofs,
    ...overrides,
  };
}

function certificationIndex(
  entries: ReadonlyArray<readonly [number, TileCertificationRow]>,
): AreaTileCatalogCertificationIndex {
  return new Map(
    entries.map(([tileId, certification]) => [
      buildAreaTileCatalogCertificationKey(definition.tilesetResRef, tileId),
      certification,
    ]),
  );
}

describe("areaTileCatalogFilter", () => {
  it("derives searchable SET categories and authoring capabilities without mutating the definition", () => {
    const before = structuredClone(definition);

    const result = filterAreaTileCatalog({ definition });

    expect(result.items.map((item) => ({
      tileId: item.tile.tileId,
      categories: item.categories,
      capabilities: item.capabilities,
      certification: item.certification,
    }))).toEqual([
      {
        tileId: 0,
        categories: ["terrain", "individual"],
        capabilities: ["replaceable", "model-referenced"],
        certification: "missing",
      },
      {
        tileId: 1,
        categories: ["terrain", "feature-crosser", "individual"],
        capabilities: ["replaceable", "model-referenced"],
        certification: "missing",
      },
      {
        tileId: 2,
        categories: ["terrain", "group"],
        capabilities: ["group-managed", "model-referenced"],
        certification: "missing",
      },
      {
        tileId: 3,
        categories: ["terrain", "group"],
        capabilities: ["group-managed", "model-reference-missing"],
        certification: "missing",
      },
    ]);
    expect(result.diagnostics).toEqual({
      total: 4,
      matched: 4,
      verified: 0,
      failed: 0,
      missing: 4,
      excluded: 0,
    });
    expect(definition).toEqual(before);
  });

  it("combines normalized search, category, capability, and certification filters deterministically", () => {
    const result = filterAreaTileCatalog({
      definition,
      query: " TESTset   ROAD ",
      category: "feature-crosser",
      capability: "model-referenced",
      certification: "failed",
      certificationIndex: certificationIndex([
        [
          1,
          row("road-failed", {
            proofs: { ...verifiedProofs, visualSeam: "failed" },
          }),
        ],
      ]),
    });

    expect(result.normalizedQuery).toBe("testset road");
    expect(result.items.map((item) => item.tile.tileId)).toEqual([1]);
    expect(result.diagnostics).toEqual({
      total: 4,
      matched: 1,
      verified: 0,
      failed: 1,
      missing: 0,
      excluded: 0,
    });
  });

  it("keeps verified, failed, missing, and excluded certification states independent", () => {
    const index = certificationIndex([
      [0, row("verified")],
      [1, row("failed", { proofs: { ...verifiedProofs, render: "failed" } })],
      [
        2,
        row("excluded", {
          eligibility: {
            status: "excluded",
            reasonCode: "intentional_placeholder",
            reason: "Not a selectable production tile.",
          },
        }),
      ],
    ]);

    expect(filterAreaTileCatalog({ definition, certificationIndex: index }).items.map(
      (item) => [item.tile.tileId, item.certification],
    )).toEqual([
      [0, "verified"],
      [1, "failed"],
      [2, "excluded"],
      [3, "missing"],
    ]);
    expect(filterAreaTileCatalog({
      definition,
      certification: "verified",
      certificationIndex: index,
    }).items.map((item) => item.tile.tileId)).toEqual([0]);
    expect(filterAreaTileCatalog({
      definition,
      certification: "missing",
      certificationIndex: index,
    }).items.map((item) => item.tile.tileId)).toEqual([3]);
  });

  it("searches Tile_ID, model, terrain, crosser, and group labels from explicit SET data", () => {
    expect(filterAreaTileCatalog({ definition, query: "tile_id 2" }).items.map(
      (item) => item.tile.tileId,
    )).toEqual([2]);
    expect(filterAreaTileCatalog({ definition, query: "stone house" }).items.map(
      (item) => item.tile.tileId,
    )).toEqual([2, 3]);
    expect(filterAreaTileCatalog({ definition, query: "grass road" }).items.map(
      (item) => item.tile.tileId,
    )).toEqual([1]);
    expect(filterAreaTileCatalog({ definition, query: "tst01_floor_00" }).items.map(
      (item) => item.tile.tileId,
    )).toEqual([0]);
  });

  it("keeps a one-cell SET group searchable as a group while retaining individual replacement", () => {
    const singletonDefinition: AuroraAreaTilesetDefinition = {
      ...definition,
      tiles: [
        {
          tileId: 118,
          modelResRef: "tst01_crystal_01",
          terrain: { topLeft: "stone" },
          crossers: {},
          cornerHeights: { topLeft: 0 },
          groupId: "crystal",
        },
      ],
      groups: [
        { id: "crystal", name: "Crystal", rows: 1, columns: 1, tileIds: [118] },
      ],
    };

    const [item] = filterAreaTileCatalog({
      definition: singletonDefinition,
      category: "group",
      capability: "replaceable",
    }).items;

    expect(item).toMatchObject({
      categories: ["terrain", "group", "individual"],
      capabilities: ["replaceable", "model-referenced"],
      groupIds: ["crystal"],
      groupNames: ["Crystal"],
    });
  });
});
