import { admitCreatureSoundSetFileCatalogMutations } from
  "../../src/modules/areas/application/area-creature-sound-set-file-catalog-admission";

describe("AreaUpdateCandidateCompiler Creature SoundSetFile catalog admission", () => {
  it("admits row zero bound to unchanged soundset.2da", async () => {
    const catalog = createCatalog();
    await expect(admitCreatureSoundSetFileCatalogMutations([mutation()], catalog))
      .resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreatureSoundSetsTwoDaTable).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the effective table identity changed", async () => {
    const catalog = createCatalog({ sha256: "d".repeat(64) });
    await expect(admitCreatureSoundSetFileCatalogMutations([mutation()], catalog))
      .rejects.toMatchObject({ reason: "draft_source_changed" });
  });

  it("fails closed when the target row is no longer admitted", async () => {
    const catalog = createCatalog({}, [{ rowIndex: 2 }]);
    await expect(admitCreatureSoundSetFileCatalogMutations([mutation()], catalog))
      .rejects.toMatchObject({ reason: "row_not_admitted", targetRow: 0 });
  });

  it("does not resolve the table without a SoundSetFile mutation", async () => {
    const catalog = createCatalog();
    await expect(admitCreatureSoundSetFileCatalogMutations([], catalog)).resolves.toBeUndefined();
    expect(catalog.resolveEffectiveCreatureSoundSetsTwoDaTable).not.toHaveBeenCalled();
  });
});

function createCatalog(
  descriptorOverrides: Record<string, unknown> = {},
  rows: ReadonlyArray<{ rowIndex: number }> = [{ rowIndex: 0 }, { rowIndex: 2 }],
) {
  return {
    resolveEffectiveCreatureSoundSetsTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "soundset.2da" as const,
        sourceObjectKey: "modules/current/__aurora/sources/vanilla/soundset.2da",
        sourceLayer: "vanilla" as const,
        sha256: "c".repeat(64),
        sizeBytes: 4_096,
        rowCount: 5_100,
        ...descriptorOverrides,
      },
      rows: rows.map((row) => ({
        ...row,
        displayName: `Voice row ${row.rowIndex}`,
        displaySource: "strref_id" as const,
        nameStrRef: 8_000 + row.rowIndex,
        resRef: `voice_${row.rowIndex}`,
      })),
    })),
  };
}

function mutation() {
  return {
    kind: "creature",
    sourceIndex: 0,
    soundSetFile: {
      expectedValue: 2,
      value: 0,
      tableSha256: "c".repeat(64),
      rowCount: 5_100,
    },
  };
}
