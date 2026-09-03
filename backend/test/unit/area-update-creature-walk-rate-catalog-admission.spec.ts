import {
  admitCreatureWalkRateCatalogMutations,
} from "../../src/modules/areas/application/area-creature-walk-rate-catalog-admission";

describe("AreaUpdateCandidateCompiler Creature WalkRate catalog admission", () => {
  it("admits one physical row bound to unchanged creaturespeed.2da", async () => {
    const catalog = createCatalog();
    await expect(admitCreatureWalkRateCatalogMutations([walkRateMutation()], catalog))
      .resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreatureWalkRatesTwoDaTable).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the effective table identity changed", async () => {
    const catalog = createCatalog({ sha256: "d".repeat(64) });
    await expect(admitCreatureWalkRateCatalogMutations([walkRateMutation()], catalog))
      .rejects.toMatchObject({ reason: "draft_source_changed" });
  });

  it("fails closed when the target row is no longer admitted", async () => {
    const catalog = createCatalog({}, [{ rowIndex: 7 }]);
    await expect(admitCreatureWalkRateCatalogMutations([walkRateMutation()], catalog))
      .rejects.toMatchObject({ reason: "row_not_admitted", targetRow: 4 });
  });

  it("does not resolve the catalog without a WalkRate mutation", async () => {
    const catalog = createCatalog();
    await expect(admitCreatureWalkRateCatalogMutations([], catalog)).resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreatureWalkRatesTwoDaTable).not.toHaveBeenCalled();
  });
});

function createCatalog(
  descriptorOverrides: Record<string, unknown> = {},
  rows: ReadonlyArray<{ rowIndex: number }> = [{ rowIndex: 4 }, { rowIndex: 7 }],
) {
  return {
    resolveEffectiveCreatureWalkRatesTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "creaturespeed.2da" as const,
        sourceObjectKey: "modules/current/__aurora/sources/vanilla/creaturespeed.2da",
        sourceLayer: "vanilla" as const,
        sha256: "c".repeat(64),
        sizeBytes: 520,
        rowCount: 9,
        ...descriptorOverrides,
      },
      rows: rows.map((row) => ({
        ...row,
        displayName: `Speed row ${row.rowIndex}`,
        displaySource: "strref_id" as const,
        nameStrRef: 2300 + row.rowIndex,
        twoDaName: `ROW_${row.rowIndex}`,
      })),
    })),
  };
}

function walkRateMutation() {
  return {
    kind: "creature",
    sourceIndex: 0,
    walkRate: {
      expectedValue: 7,
      value: 4,
      tableSha256: "c".repeat(64),
      rowCount: 9,
    },
  };
}
