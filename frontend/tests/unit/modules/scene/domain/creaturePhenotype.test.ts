import {
  canEditExistingCreaturePhenotype,
  readCreaturePhenotypeStorage,
} from "../../../../../src/modules/scene/domain/creaturePhenotype";

describe("Creature Phenotype provenance", () => {
  const table = {
    resourceName: "phenotype.2da" as const,
    sourceObjectKey: "runtime-source/vanilla/nwn_base.key/phenotype.2da",
    sourceLayer: "vanilla" as const,
    sha256: "a".repeat(64),
    sizeBytes: 337,
    rowCount: 9,
    rowIndex: 2,
  };

  it("reads exact bound Int storage", () => {
    expect(readCreaturePhenotypeStorage({
      present: true,
      nativeType: "int",
      value: 2,
      table,
    })).toEqual({ present: true, nativeType: "int", value: 2, table });
  });

  it("retains raw Int source state but does not admit normalized or lossy rows", () => {
    expect(readCreaturePhenotypeStorage({
      present: true, nativeType: "int", value: 1,
    })).toEqual({ present: true, nativeType: "int", value: 1 });
    expect(readCreaturePhenotypeStorage({
      present: true, nativeType: "int", value: 256,
    })).toEqual({ present: true, nativeType: "int", value: 256 });
  });

  it("requires exact Creature identity plus bound phenotype and appearance tables", () => {
    expect(canEditExistingCreaturePhenotype({
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creaturePhenotype: { present: true, nativeType: "int", value: 2, table },
      creatureAppearance: {
        present: true,
        nativeType: "word",
        value: 6,
        table: {
          resourceName: "appearance.2da",
          sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
          sourceLayer: "vanilla",
          sha256: "b".repeat(64),
          sizeBytes: 1000,
          rowCount: 100,
          rowIndex: 6,
        },
      },
    })).toBe(true);
  });

  it.each([
    { present: true, nativeType: "byte", value: 2 },
    { present: true, nativeType: "int", value: 2, extra: true },
    { present: true, nativeType: "int", value: 2, table: { ...table, rowIndex: 3 } },
    { present: false, value: 0 },
  ])("rejects malformed storage %#", (candidate) => {
    expect(readCreaturePhenotypeStorage(candidate)).toBeNull();
  });
});
