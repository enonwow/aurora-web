import {
  admitCreatureAppendageCatalogMutations,
} from "../../src/modules/areas/application/area-creature-appendage-catalog-admission";

describe("AreaUpdateCandidateCompiler Creature appendage catalog admission", () => {
  it("admits each physical row against its unchanged member-specific table", async () => {
    const catalog = createCatalog();
    await expect(admitCreatureAppendageCatalogMutations([
      mutation(),
    ], catalog)).resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreatureAppendageTwoDaDescriptor)
      .toHaveBeenCalledWith("wingmodel.2da");
    expect(catalog.resolveEffectiveCreatureAppendageTwoDaRow)
      .toHaveBeenCalledWith("wingmodel.2da", 3);
  });

  it("fails closed when one effective table digest changed", async () => {
    const catalog = createCatalog("d".repeat(64));
    await expect(admitCreatureAppendageCatalogMutations([
      mutation(),
    ], catalog)).rejects.toMatchObject({
      reason: "draft_source_changed",
      member: "wings",
    });
    expect(catalog.resolveEffectiveCreatureAppendageTwoDaRow).not.toHaveBeenCalled();
  });

  it("fails closed when the physical row is no longer Toolset-admitted", async () => {
    const catalog = createCatalog(undefined, false);
    await expect(admitCreatureAppendageCatalogMutations([
      mutation(),
    ], catalog)).rejects.toMatchObject({
      reason: "row_not_admitted",
      member: "wings",
      targetRow: 3,
    });
  });
});

function createCatalog(sha256 = "c".repeat(64), admitted = true) {
  const descriptor = (resourceName: "wingmodel.2da" | "tailmodel.2da") => ({
    resourceName,
    sourceObjectKey: `modules/current/__aurora/sources/vanilla/${resourceName}`,
    sourceLayer: "vanilla" as const,
    sha256,
    sizeBytes: 500,
    rowCount: 8,
  });
  return {
    resolveEffectiveCreatureAppendageTwoDaDescriptor: jest.fn(async (
      resourceName: "wingmodel.2da" | "tailmodel.2da",
    ) =>
      descriptor(resourceName)),
    resolveEffectiveCreatureAppendageTwoDaRow: jest.fn(async (
      resourceName: "wingmodel.2da" | "tailmodel.2da",
      rowIndex: number,
    ) => ({
      descriptor: descriptor(resourceName),
      row: admitted ? { rowIndex, displayName: `Row ${rowIndex}` } : null,
    })),
  };
}

function mutation() {
  return {
    kind: "creature",
    sourceIndex: 0,
    appendages: {
      wings: {
        expectedValue: 1,
        value: 3,
        tableSha256: "c".repeat(64),
        rowCount: 8,
      },
    },
  };
}
