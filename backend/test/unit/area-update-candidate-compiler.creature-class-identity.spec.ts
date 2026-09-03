import {
  AreaUpdateCandidateCompiler,
  AreaUpdateCompilerFailure,
} from "../../src/modules/areas/application/area-update-candidate.compiler";
import type { ExistingAreaObjectPropertyMutation } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";

describe("AreaUpdateCandidateCompiler Creature class-identity admission wiring", () => {
  it("resolves and admits both effective tables through the compiler boundary", async () => {
    const catalog = createCatalog();
    const compiler = createCompiler(catalog);

    await expect(invokeClassIdentityAdmission(compiler, [mutation()]))
      .resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreatureClassesTwoDaTable).toHaveBeenCalledTimes(1);
    expect(catalog.resolveEffectiveCreatureStartingPackagesTwoDaTable).toHaveBeenCalledTimes(1);
  });

  it("maps an immutable classes-table drift to the public stale-source failure", async () => {
    const compiler = createCompiler(createCatalog({ classesSha256: "d".repeat(64) }));

    await expect(invokeClassIdentityAdmission(compiler, [mutation()])).rejects.toEqual(
      expect.objectContaining({
        name: "AreaUpdateCompilerFailure",
        code: "AREA_UPDATE_SOURCE_STALE",
        status: 409,
      }),
    );
    await expect(invokeClassIdentityAdmission(compiler, [mutation()]))
      .rejects.toBeInstanceOf(AreaUpdateCompilerFailure);
  });

  it("reuses the immutable class/package admission gate for a tail append", async () => {
    const catalog = createCatalog();
    const compiler = createCompiler(catalog);
    await expect(invokeClassIdentityAdmission(compiler, [resizeMutation()]))
      .resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreatureClassesTwoDaTable).toHaveBeenCalledTimes(1);
    expect(catalog.resolveEffectiveCreatureStartingPackagesTwoDaTable).toHaveBeenCalledTimes(1);
  });
});

function createCompiler(appearanceCatalog: ReturnType<typeof createCatalog>) {
  return new AreaUpdateCandidateCompiler({ appearanceCatalog } as never);
}

function invokeClassIdentityAdmission(
  compiler: AreaUpdateCandidateCompiler,
  mutations: readonly ExistingAreaObjectPropertyMutation[],
): Promise<void> {
  const boundary = compiler as unknown as {
    validateCreatureClassIdentityMutations(
      value: readonly ExistingAreaObjectPropertyMutation[],
    ): Promise<void>;
  };
  return boundary.validateCreatureClassIdentityMutations(mutations);
}

function createCatalog(options: Readonly<{ classesSha256?: string }> = {}) {
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
      rows: [4, 5].map((rowIndex) => ({
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
        sha256: "b".repeat(64),
        sizeBytes: 30_510,
        rowCount: 132,
      },
      rows: [
        { rowIndex: 0, classId: 4 },
        { rowIndex: 2, classId: 5 },
      ].map((row) => ({
        ...row,
        displayName: `Package ${row.rowIndex}`,
        displaySource: "label" as const,
        nameStrRef: null,
      })),
    })),
  };
}

function mutation(): ExistingAreaObjectPropertyMutation {
  return {
    kind: "creature",
    sourceIndex: 0,
    classIdentity: {
      expectedClassIds: [4],
      classIds: [5],
      expectedLevels: [3],
      levels: [3],
      classListGraphSha256: "c".repeat(64),
      destructiveSpellClearConfirmed: true,
      expectedStartingPackage: 0,
      startingPackage: 2,
      classesTableSha256: "a".repeat(64),
      classesRowCount: 64,
      packagesTableSha256: "b".repeat(64),
      packagesRowCount: 132,
    },
  };
}

function resizeMutation(): ExistingAreaObjectPropertyMutation {
  return {
    kind: "creature",
    sourceIndex: 0,
    classSlotResize: {
      expectedClassIds: [4],
      expectedLevels: [3],
      classIds: [4, 5],
      levels: [3, 1],
      classListGraphSha256: "c".repeat(64),
      resizeMode: "append_tail",
      destructiveRemovedSlotsConfirmed: false,
      expectedStartingPackage: 0,
      startingPackage: 2,
      classesTableSha256: "a".repeat(64),
      classesRowCount: 64,
      packagesTableSha256: "b".repeat(64),
      packagesRowCount: 132,
    },
  };
}
