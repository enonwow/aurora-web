import {
  admitCreatureGenderCatalogMutations,
} from "../../src/modules/areas/application/area-creature-gender-catalog-admission";

describe("AreaUpdateCandidateCompiler Creature Gender catalog admission", () => {
  it("admits one physical Byte row bound to the unchanged effective gender.2da", async () => {
    const catalog = createCatalog();

    await expect(admitCreatureGenderCatalogMutations([
      genderMutation(),
    ], catalog)).resolves.toBeUndefined();

    expect(catalog.resolveEffectiveCreatureGenderTwoDaDescriptor)
      .toHaveBeenCalledTimes(1);
    expect(catalog.resolveEffectiveCreatureGenderTwoDaRow)
      .toHaveBeenCalledWith(0);
  });

  it("fails closed when the effective gender.2da digest changed", async () => {
    const catalog = createCatalog({ sha256: "d".repeat(64) });

    await expect(admitCreatureGenderCatalogMutations([
      genderMutation(),
    ], catalog)).rejects.toMatchObject({
      reason: "draft_source_changed",
    });

    expect(catalog.resolveEffectiveCreatureGenderTwoDaRow).not.toHaveBeenCalled();
  });

  it("fails closed when the requested physical row is not Toolset-admitted", async () => {
    const catalog = createCatalog({}, false);

    await expect(admitCreatureGenderCatalogMutations([
      genderMutation(),
    ], catalog)).rejects.toMatchObject({
      reason: "row_not_admitted",
      targetRow: 0,
    });
  });

  it("does not resolve the catalog when the update has no Creature Gender mutation", async () => {
    const catalog = createCatalog();

    await expect(admitCreatureGenderCatalogMutations([], catalog)).resolves.toBeUndefined();

    expect(catalog.resolveEffectiveCreatureGenderTwoDaDescriptor).not.toHaveBeenCalled();
    expect(catalog.resolveEffectiveCreatureGenderTwoDaRow).not.toHaveBeenCalled();
  });
});

function createCatalog(
  descriptorOverrides: Partial<ReturnType<typeof descriptor>> = {},
  admitted = true,
) {
  const effectiveDescriptor = descriptor(descriptorOverrides);
  return {
    resolveEffectiveCreatureGenderTwoDaDescriptor: jest.fn(async () => effectiveDescriptor),
    resolveEffectiveCreatureGenderTwoDaRow: jest.fn(async (rowIndex: number) => ({
      descriptor: effectiveDescriptor,
      row: admitted
        ? {
            rowIndex,
            displayName: `Gender row ${rowIndex}`,
            displaySource: "strref_id" as const,
            nameStrRef: 156 + rowIndex,
            genderToken: "M",
          }
        : null,
    })),
  };
}

function descriptor(overrides: Partial<{
  resourceName: "gender.2da";
  sourceObjectKey: string;
  sourceLayer: "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}> = {}) {
  return {
    resourceName: "gender.2da" as const,
    sourceObjectKey: "modules/current/__aurora/sources/vanilla/gender.2da",
    sourceLayer: "vanilla" as const,
    sha256: "c".repeat(64),
    sizeBytes: 250,
    rowCount: 5,
    ...overrides,
  };
}

function genderMutation() {
  return {
    kind: "creature",
    sourceIndex: 0,
    expectedTemplateResRef: "nw_guard",
    gender: {
      expectedValue: 4,
      value: 0,
      tableSha256: "c".repeat(64),
      rowCount: 5,
    },
  };
}
