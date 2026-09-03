import {
  admitCreaturePerceptionRangeCatalogMutations,
} from "../../src/modules/areas/application/area-creature-perception-range-catalog-admission";

describe("AreaUpdateCandidateCompiler Creature PerceptionRange catalog admission", () => {
  it("admits one Toolset row bound to the unchanged effective ranges.2da", async () => {
    const catalog = createCatalog();

    await expect(admitCreaturePerceptionRangeCatalogMutations([
      perceptionRangeMutation(),
    ], catalog)).resolves.toBeUndefined();

    expect(catalog.resolveEffectiveCreaturePerceptionRangesTwoDaTable)
      .toHaveBeenCalledTimes(1);
  });

  it("fails closed when the effective table digest changed", async () => {
    const catalog = createCatalog({ sha256: "d".repeat(64) });

    await expect(admitCreaturePerceptionRangeCatalogMutations([
      perceptionRangeMutation(),
    ], catalog)).rejects.toMatchObject({ reason: "draft_source_changed" });
  });

  it("fails closed when the target physical row is no longer Toolset-admitted", async () => {
    const catalog = createCatalog({}, [{ rowIndex: 8 }]);

    await expect(admitCreaturePerceptionRangeCatalogMutations([
      perceptionRangeMutation(),
    ], catalog)).rejects.toMatchObject({
      reason: "row_not_admitted",
      targetRow: 9,
    });
  });

  it("does not resolve the catalog without a PerceptionRange mutation", async () => {
    const catalog = createCatalog();

    await expect(admitCreaturePerceptionRangeCatalogMutations([], catalog))
      .resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreaturePerceptionRangesTwoDaTable).not.toHaveBeenCalled();
  });
});

function createCatalog(
  descriptorOverrides: Partial<ReturnType<typeof descriptor>> = {},
  rows: ReadonlyArray<{ rowIndex: number }> = [{ rowIndex: 8 }, { rowIndex: 9 }, { rowIndex: 10 }, { rowIndex: 11 }],
) {
  const effectiveDescriptor = descriptor(descriptorOverrides);
  return {
    resolveEffectiveCreaturePerceptionRangesTwoDaTable: jest.fn(async () => ({
      descriptor: effectiveDescriptor,
      rows: rows.map((row) => ({
        ...row,
        displayName: `Range row ${row.rowIndex}`,
        displaySource: "strref_id" as const,
        nameStrRef: 6600 + row.rowIndex,
      })),
    })),
  };
}

function descriptor(overrides: Partial<{
  resourceName: "ranges.2da";
  sourceObjectKey: string;
  sourceLayer: "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}> = {}) {
  return {
    resourceName: "ranges.2da" as const,
    sourceObjectKey: "modules/current/__aurora/sources/vanilla/ranges.2da",
    sourceLayer: "vanilla" as const,
    sha256: "c".repeat(64),
    sizeBytes: 1220,
    rowCount: 12,
    ...overrides,
  };
}

function perceptionRangeMutation() {
  return {
    kind: "creature",
    sourceIndex: 0,
    expectedTemplateResRef: "nw_guard",
    perceptionRange: {
      expectedValue: 11,
      value: 9,
      tableSha256: "c".repeat(64),
      rowCount: 12,
    },
  };
}
