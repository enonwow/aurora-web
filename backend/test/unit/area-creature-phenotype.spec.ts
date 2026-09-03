import {
  bindEffectivePhenotypeTwoDaToCreaturePhenotype,
  readAreaCreaturePhenotypeStorage,
  readExistingAreaCreaturePhenotypeMutation,
} from "../../src/modules/areas/domain/area-creature-phenotype";

describe("Existing Area Creature Phenotype mutation", () => {
  const valid = {
    expectedValue: 0,
    value: 2,
    tableSha256: "a".repeat(64),
    rowCount: 9,
    appearanceExpectedValue: 6,
    appearanceTableSha256: "b".repeat(64),
    appearanceRowCount: 1000,
  };

  it("accepts one exact changed Int-backed physical-row pair", () => {
    expect(readExistingAreaCreaturePhenotypeMutation(valid)).toEqual(valid);
    expect(Object.isFrozen(readExistingAreaCreaturePhenotypeMutation(valid))).toBe(true);
  });

  it.each([
    null,
    [],
    { ...valid, label: "Large" },
    { ...valid, value: 0 },
    { ...valid, expectedValue: -1 },
    { ...valid, value: 1 },
    { ...valid, value: 0x100 },
    { ...valid, value: 9 },
    { ...valid, appearanceExpectedValue: -1 },
    { ...valid, appearanceExpectedValue: 0x1_0000 },
    { ...valid, appearanceRowCount: 6 },
    { ...valid, rowCount: 0 },
    { ...valid, tableSha256: "A".repeat(64) },
  ])("rejects malformed, stale, normalized, or out-of-range mutation %#", (candidate) => {
    expect(readExistingAreaCreaturePhenotypeMutation(candidate)).toBeNull();
  });

  it("retains exact Int source storage and binds only a round-trippable phenotype row", () => {
    const unbound = readAreaCreaturePhenotypeStorage({
      present: true,
      nativeType: "int",
      value: 2,
    });
    expect(unbound).toEqual({ present: true, nativeType: "int", value: 2 });
    const bound = bindEffectivePhenotypeTwoDaToCreaturePhenotype(unbound!, {
      resourceName: "phenotype.2da",
      sourceObjectKey: "modules/current/phenotype.2da",
      sourceLayer: "module",
      sha256: "c".repeat(64),
      sizeBytes: 337,
      rowCount: 9,
    });
    expect(bound).toEqual({
      present: true,
      nativeType: "int",
      value: 2,
      table: {
        resourceName: "phenotype.2da",
        sourceObjectKey: "modules/current/phenotype.2da",
        sourceLayer: "module",
        sha256: "c".repeat(64),
        sizeBytes: 337,
        rowCount: 9,
        rowIndex: 2,
      },
    });
    expect(readAreaCreaturePhenotypeStorage(bound)).toEqual(bound);
  });

  it("retains raw native Int values but refuses lossy or normalized catalog binding", () => {
    const descriptor = {
      resourceName: "phenotype.2da",
      sourceObjectKey: "modules/current/phenotype.2da",
      sourceLayer: "module",
      sha256: "c".repeat(64),
      sizeBytes: 337,
      rowCount: 300,
    };
    for (const value of [-1, 1, 0x100]) {
      const storage = readAreaCreaturePhenotypeStorage({
        present: true,
        nativeType: "int",
        value,
      });
      expect(storage).not.toBeNull();
      expect(bindEffectivePhenotypeTwoDaToCreaturePhenotype(storage!, descriptor)).toEqual(storage);
    }
  });

  it.each([
    { present: true, nativeType: "byte", value: 2 },
    { present: true, nativeType: "int", value: 0x8000_0000 },
    { present: true, nativeType: "int", value: 2, extra: true },
    { present: false, value: 0 },
  ])("rejects malformed exact storage %#", (candidate) => {
    expect(readAreaCreaturePhenotypeStorage(candidate)).toBeNull();
  });
});
