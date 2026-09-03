import { admitCreaturePhenotypeCatalogMutations } from
  "../../src/modules/areas/application/area-creature-phenotype-catalog-admission";

describe("AreaUpdateCandidateCompiler Creature Phenotype catalog admission", () => {
  it("admits one phenotype row for an unchanged player MODELTYPE appearance", async () => {
    const catalog = createCatalog();
    await expect(admitCreaturePhenotypeCatalogMutations([
      phenotypeMutation(),
    ], catalog)).resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreaturePhenotypeTwoDaRow).toHaveBeenCalledWith(2);
    expect(catalog.resolveCreatureAppearanceProfile).toHaveBeenCalledWith(6);
  });

  it("fails closed when either effective table identity changed", async () => {
    await expect(admitCreaturePhenotypeCatalogMutations([
      phenotypeMutation(),
    ], createCatalog({ phenotypeSha256: "d".repeat(64) }))).rejects.toMatchObject({
      reason: "draft_source_changed",
    });
    await expect(admitCreaturePhenotypeCatalogMutations([
      phenotypeMutation(),
    ], createCatalog({ appearanceSha256: "e".repeat(64) }))).rejects.toMatchObject({
      reason: "appearance_source_changed",
    });
  });

  it.each(["R", undefined])(
    "rejects current appearance MODELTYPE %s",
    async (modelType) => {
      await expect(admitCreaturePhenotypeCatalogMutations([
        phenotypeMutation(),
      ], createCatalog({ modelType }))).rejects.toMatchObject({
        reason: "appearance_not_player_model",
      });
    },
  );

  it("rejects an unadmitted target row and does no work without mutations", async () => {
    await expect(admitCreaturePhenotypeCatalogMutations([
      phenotypeMutation(),
    ], createCatalog({ phenotypeAdmitted: false }))).rejects.toMatchObject({
      reason: "row_not_admitted",
      targetRow: 2,
    });
    const catalog = createCatalog();
    await expect(admitCreaturePhenotypeCatalogMutations([], catalog)).resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreaturePhenotypeTwoDaDescriptor).not.toHaveBeenCalled();
  });
});

function createCatalog(options: {
  phenotypeSha256?: string;
  appearanceSha256?: string;
  modelType?: string;
  phenotypeAdmitted?: boolean;
} = {}) {
  const phenotypeDescriptor = {
    resourceName: "phenotype.2da" as const,
    sourceObjectKey: "runtime-source/vanilla/nwn_base.key/phenotype.2da",
    sourceLayer: "vanilla" as const,
    sha256: options.phenotypeSha256 ?? "a".repeat(64),
    sizeBytes: 337,
    rowCount: 9,
  };
  const appearanceDescriptor = {
    resourceName: "appearance.2da" as const,
    sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
    sourceLayer: "vanilla" as const,
    sha256: options.appearanceSha256 ?? "b".repeat(64),
    sizeBytes: 100_000,
    rowCount: 1000,
  };
  return {
    resolveEffectiveCreaturePhenotypeTwoDaDescriptor: jest.fn(async () => phenotypeDescriptor),
    resolveEffectiveCreaturePhenotypeTwoDaRow: jest.fn(async (rowIndex: number) => ({
      descriptor: phenotypeDescriptor,
      row: options.phenotypeAdmitted === false ? null : {
        rowIndex,
        displayName: `Phenotype ${rowIndex}`,
        displaySource: "strref_id" as const,
        nameStrRef: 2223,
      },
    })),
    resolveEffectiveCreatureAppearanceTwoDaDescriptor: jest.fn(async () => appearanceDescriptor),
    resolveCreatureAppearanceProfile: jest.fn(async (appearanceType: number) => ({
      appearanceType,
      appearanceSource2daRow: appearanceType,
      appearanceSourceKey: appearanceDescriptor.sourceObjectKey,
      modelType: Object.prototype.hasOwnProperty.call(options, "modelType")
        ? options.modelType
        : "P",
    })),
  };
}

function phenotypeMutation() {
  return {
    kind: "creature",
    phenotype: {
      expectedValue: 0,
      value: 2,
      tableSha256: "a".repeat(64),
      rowCount: 9,
      appearanceExpectedValue: 6,
      appearanceTableSha256: "b".repeat(64),
      appearanceRowCount: 1000,
    },
  };
}
