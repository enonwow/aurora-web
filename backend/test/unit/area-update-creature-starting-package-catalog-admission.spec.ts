import { admitCreatureStartingPackageCatalogMutations } from
  "../../src/modules/areas/application/area-creature-starting-package-catalog-admission";

describe("AreaUpdateCandidateCompiler Creature StartingPackage catalog admission", () => {
  it("admits a physical row bound to unchanged packages.2da and the retained ClassList", async () => {
    const catalog = createCatalog();
    await expect(admitCreatureStartingPackageCatalogMutations([mutation()], catalog))
      .resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreatureStartingPackagesTwoDaTable).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the effective table identity changed", async () => {
    const catalog = createCatalog({ sha256: "d".repeat(64) });
    await expect(admitCreatureStartingPackageCatalogMutations([mutation()], catalog))
      .rejects.toMatchObject({ reason: "draft_source_changed" });
  });

  it("fails closed when the target row is not compatible with the retained ClassList", async () => {
    const catalog = createCatalog({}, [{ rowIndex: 2, classId: 2 }]);
    await expect(admitCreatureStartingPackageCatalogMutations([mutation()], catalog))
      .rejects.toMatchObject({ reason: "row_not_admitted", targetRow: 2 });
  });

  it("does not resolve the table without a StartingPackage mutation", async () => {
    const catalog = createCatalog();
    await expect(admitCreatureStartingPackageCatalogMutations([], catalog))
      .resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreatureStartingPackagesTwoDaTable).not.toHaveBeenCalled();
  });
});

function createCatalog(
  descriptorOverrides: Record<string, unknown> = {},
  rows: ReadonlyArray<{ rowIndex: number; classId: number }> = [
    { rowIndex: 0, classId: 4 },
    { rowIndex: 2, classId: 4 },
  ],
) {
  return {
    resolveEffectiveCreatureStartingPackagesTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "packages.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
        sourceLayer: "vanilla",
        sha256: "c".repeat(64),
        sizeBytes: 30_510,
        rowCount: 132,
        ...descriptorOverrides,
      },
      rows: rows.map((row) => Object.freeze({
        ...row,
        displayName: `Package ${row.rowIndex}`,
        displaySource: "label" as const,
        nameStrRef: null,
      })),
    })),
  };
}

function mutation() {
  return {
    kind: "creature",
    sourceIndex: 0,
    startingPackage: {
      expectedValue: 0,
      value: 2,
      expectedClassIds: [4],
      tableSha256: "c".repeat(64),
      rowCount: 132,
    },
  };
}
