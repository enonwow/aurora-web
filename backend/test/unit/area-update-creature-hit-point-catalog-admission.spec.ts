import { admitCreatureHitPointCatalogMutations } from
  "../../src/modules/areas/application/area-creature-hit-point-catalog-admission";

describe("AreaUpdateCandidateCompiler Creature HP racialtypes.2da admission", () => {
  it("admits the exact retained Race row and ConAdjust", async () => {
    await expect(admitCreatureHitPointCatalogMutations(
      [mutation()],
      createCatalog(),
    )).resolves.toBeUndefined();
  });

  it("fails closed on a stale table identity, missing Race row, or changed adjustment", async () => {
    await expect(admitCreatureHitPointCatalogMutations(
      [mutation()],
      createCatalog({ sha256: "b".repeat(64) }),
    )).rejects.toMatchObject({ reason: "draft_source_changed" });
    await expect(admitCreatureHitPointCatalogMutations(
      [mutation()],
      createCatalog({ rowIndex: 2 }),
    )).rejects.toMatchObject({ reason: "race_row_changed", raceRow: 1 });
    await expect(admitCreatureHitPointCatalogMutations(
      [mutation()],
      createCatalog({ constitutionAdjust: 1 }),
    )).rejects.toMatchObject({ reason: "race_row_changed", raceRow: 1 });
  });

  it("does no catalog work without coupled HP mutations", async () => {
    const catalog = createCatalog();
    await expect(admitCreatureHitPointCatalogMutations([], catalog)).resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreatureRacialTypesTwoDaTable).not.toHaveBeenCalled();
  });
});

function mutation() {
  return {
    kind: "creature",
    hitPoints: {
      race: 1,
      racialConstitutionAdjust: 2,
      racialTypesSha256: "a".repeat(64),
      racialTypesRowCount: 3,
    },
  };
}

function createCatalog(options: {
  sha256?: string;
  rowIndex?: number;
  constitutionAdjust?: number;
} = {}) {
  return {
    resolveEffectiveCreatureRacialTypesTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "racialtypes.2da" as const,
        sourceObjectKey: "x/racialtypes.2da",
        sourceLayer: "module" as const,
        sha256: options.sha256 ?? "a".repeat(64),
        sizeBytes: 100,
        rowCount: 3,
      },
      rows: [{
        rowIndex: options.rowIndex ?? 1,
        constitutionAdjust: options.constitutionAdjust ?? 2,
      }],
    })),
  };
}
