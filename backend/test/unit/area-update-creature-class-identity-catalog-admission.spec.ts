import { admitCreatureClassIdentityCatalogMutations } from
  "../../src/modules/areas/application/area-creature-class-identity-catalog-admission";

describe("AreaUpdateCandidateCompiler Creature class-identity catalog admission", () => {
  it("admits source and target class/package rows bound to unchanged effective tables", async () => {
    const catalog = createCatalog();

    await expect(admitCreatureClassIdentityCatalogMutations([mutation()], catalog))
      .resolves.toBeUndefined();

    expect(catalog.resolveEffectiveCreatureClassesTwoDaTable).toHaveBeenCalledTimes(1);
    expect(catalog.resolveEffectiveCreatureStartingPackagesTwoDaTable).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the effective classes table identity changed", async () => {
    const catalog = createCatalog({ classesSha256: "d".repeat(64) });

    await expect(admitCreatureClassIdentityCatalogMutations([mutation()], catalog))
      .rejects.toMatchObject({ reason: "draft_source_changed", resource: "classes.2da" });
  });

  it("fails closed when one target class row is not admitted", async () => {
    const catalog = createCatalog({ classRows: [4] });

    await expect(admitCreatureClassIdentityCatalogMutations([mutation()], catalog))
      .rejects.toMatchObject({ reason: "class_row_not_admitted", targetRow: 5 });
  });

  it("fails closed when the target package belongs to neither target class", async () => {
    const catalog = createCatalog({ packageRows: [{ rowIndex: 0, classId: 4 }, {
      rowIndex: 2,
      classId: 7,
    }] });

    await expect(admitCreatureClassIdentityCatalogMutations([mutation()], catalog))
      .rejects.toMatchObject({ reason: "package_row_not_admitted", targetRow: 2 });
  });

  it("does not resolve either table without a class-identity mutation", async () => {
    const catalog = createCatalog();

    await expect(admitCreatureClassIdentityCatalogMutations([], catalog))
      .resolves.toBeUndefined();

    expect(catalog.resolveEffectiveCreatureClassesTwoDaTable).not.toHaveBeenCalled();
    expect(catalog.resolveEffectiveCreatureStartingPackagesTwoDaTable).not.toHaveBeenCalled();
  });

  it("admits the source and appended target rows for a tail resize", async () => {
    const catalog = createCatalog({ classRows: [4, 5] });
    await expect(admitCreatureClassIdentityCatalogMutations([{
      kind: "creature",
      classSlotResize: {
        ...mutation().classIdentity,
        expectedClassIds: [4],
        expectedLevels: [3],
        classIds: [4, 5],
        levels: [3, 1],
        resizeMode: "append_tail",
        destructiveRemovedSlotsConfirmed: false,
      },
    }], catalog)).resolves.toBeUndefined();
  });
});

function createCatalog(options: Readonly<{
  classesSha256?: string;
  packagesSha256?: string;
  classRows?: readonly number[];
  packageRows?: ReadonlyArray<{ rowIndex: number; classId: number }>;
}> = {}) {
  return {
    resolveEffectiveCreatureClassesTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "classes.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/classes.2da",
        sourceLayer: "vanilla" as const,
        sha256: options.classesSha256 ?? "a".repeat(64),
        sizeBytes: 12_000,
        rowCount: 64,
      },
      rows: (options.classRows ?? [4, 5]).map((rowIndex) => ({
        rowIndex,
        displayName: `Class ${rowIndex}`,
        displaySource: "strref" as const,
        nameStrRef: rowIndex + 1000,
      })),
    })),
    resolveEffectiveCreatureStartingPackagesTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "packages.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
        sourceLayer: "vanilla" as const,
        sha256: options.packagesSha256 ?? "b".repeat(64),
        sizeBytes: 30_510,
        rowCount: 132,
      },
      rows: (options.packageRows ?? [
        { rowIndex: 0, classId: 4 },
        { rowIndex: 2, classId: 5 },
      ]).map((row) => ({
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
    classIdentity: {
      expectedClassIds: [4],
      classIds: [5],
      expectedLevels: [3],
      levels: [3],
      classListGraphSha256: "c".repeat(64),
      destructiveSpellClearConfirmed: true as const,
      expectedStartingPackage: 0,
      startingPackage: 2,
      classesTableSha256: "a".repeat(64),
      classesRowCount: 64,
      packagesTableSha256: "b".repeat(64),
      packagesRowCount: 132,
    },
  };
}
