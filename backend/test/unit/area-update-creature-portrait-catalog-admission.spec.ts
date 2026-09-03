import { admitCreaturePortraitCatalogMutations } from
  "../../src/modules/areas/application/area-creature-portrait-catalog-admission";

describe("AreaUpdateCandidateCompiler Creature PortraitId catalog admission", () => {
  it("admits the exact target under retained Gender/Race context", async () => {
    await expect(admitCreaturePortraitCatalogMutations(
      [mutation()],
      createCatalog(),
    )).resolves.toBeUndefined();
  });

  it("fails closed on stale table identity or an unadmitted context", async () => {
    await expect(admitCreaturePortraitCatalogMutations(
      [mutation()],
      createCatalog({ sha256: "b".repeat(64) }),
    )).rejects.toMatchObject({ reason: "draft_source_changed" });
    await expect(admitCreaturePortraitCatalogMutations(
      [mutation()],
      createCatalog({ targetRace: 2 }),
    )).rejects.toMatchObject({ reason: "row_not_admitted", targetRow: 1 });
  });

  it("does no catalog work without PortraitId mutations", async () => {
    const catalog = createCatalog();
    await expect(admitCreaturePortraitCatalogMutations([], catalog)).resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreaturePortraitsTwoDaTable).not.toHaveBeenCalled();
  });
});

function mutation() {
  return {
    kind: "creature",
    portrait: {
      expectedValue: 0,
      value: 1,
      tableSha256: "a".repeat(64),
      rowCount: 3,
      genderExpectedValue: 0,
      raceExpectedValue: 4,
    },
  };
}

function createCatalog(options: { sha256?: string; targetRace?: number } = {}) {
  return {
    resolveEffectiveCreaturePortraitsTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "portraits.2da" as const,
        sourceObjectKey: "x/portraits.2da",
        sourceLayer: "module" as const,
        sha256: options.sha256 ?? "a".repeat(64),
        sizeBytes: 100,
        rowCount: 3,
      },
      rows: [
        { rowIndex: 0, baseResRef: "hu_m_01", sex: 0, race: 6, plot: 0 as const },
        {
          rowIndex: 1,
          baseResRef: "el_m_01",
          sex: 0,
          race: options.targetRace ?? 1,
          plot: 0 as const,
        },
      ],
    })),
  };
}
