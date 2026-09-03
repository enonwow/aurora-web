import {
  bindEffectiveCreatureWalkRatesTwoDaToCreatureWalkRate,
  readAreaCreatureWalkRateStorage,
  readExistingAreaCreatureWalkRateMutation,
} from "../../src/modules/areas/domain/area-creature-walk-rate";

describe("Existing Area Creature WalkRate mutation", () => {
  const valid = {
    expectedValue: 7,
    value: 4,
    tableSha256: "a".repeat(64),
    rowCount: 9,
  };

  it("accepts one exact changed catalog-bound Int pair", () => {
    expect(readExistingAreaCreatureWalkRateMutation(valid)).toEqual(valid);
    expect(Object.isFrozen(readExistingAreaCreatureWalkRateMutation(valid))).toBe(true);
  });

  it.each([
    null,
    [],
    { ...valid, displayName: "Normal" },
    { ...valid, value: 7 },
    { ...valid, expectedValue: 0 },
    { ...valid, value: 9 },
    { ...valid, rowCount: 4 },
    { ...valid, tableSha256: "A".repeat(64) },
  ])("rejects malformed, unchanged, or non-selector mutation %#", (candidate) => {
    expect(readExistingAreaCreatureWalkRateMutation(candidate)).toBeNull();
  });

  it("reads exact presence-sensitive Int storage and binds an admitted row", () => {
    const unbound = readAreaCreatureWalkRateStorage({
      present: true,
      nativeType: "int",
      value: 7,
    });
    const bound = bindEffectiveCreatureWalkRatesTwoDaToCreatureWalkRate(unbound!, {
      descriptor: {
        resourceName: "creaturespeed.2da",
        sourceObjectKey: "modules/current/creaturespeed.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 520,
        rowCount: 9,
      },
      rows: [
        { rowIndex: 4, displayName: "Normal", displaySource: "strref", nameStrRef: 2322, twoDaName: "NORM" },
        { rowIndex: 7, displayName: "Default", displaySource: "strref", nameStrRef: 6614, twoDaName: "DEFAULT" },
      ],
    });
    expect(bound).toEqual({
      present: true,
      nativeType: "int",
      value: 7,
      table: {
        resourceName: "creaturespeed.2da",
        sourceObjectKey: "modules/current/creaturespeed.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 520,
        rowCount: 9,
        rowIndex: 7,
        twoDaName: "DEFAULT",
      },
    });
    expect(readAreaCreatureWalkRateStorage(bound)).toEqual(bound);
    expect(readAreaCreatureWalkRateStorage({ present: false })).toEqual({ present: false });
  });

  it("keeps absent, unsupported, and wrong-type native state unbound or invalid", () => {
    const table = {
      descriptor: {
        resourceName: "creaturespeed.2da" as const,
        sourceObjectKey: "modules/current/creaturespeed.2da",
        sourceLayer: "module" as const,
        sha256: "b".repeat(64),
        sizeBytes: 520,
        rowCount: 2,
      },
      rows: [{ rowIndex: 1, displayName: "Immobile", displaySource: "strref" as const, nameStrRef: 2319, twoDaName: "NOMOVE" }],
    };
    expect(bindEffectiveCreatureWalkRatesTwoDaToCreatureWalkRate(
      { present: true, nativeType: "int", value: 7 },
      table,
    )).toEqual({ present: true, nativeType: "int", value: 7 });
    expect(bindEffectiveCreatureWalkRatesTwoDaToCreatureWalkRate({ present: false }, table))
      .toEqual({ present: false });
    expect(readAreaCreatureWalkRateStorage({ present: true, nativeType: "byte", value: 7 }))
      .toBeNull();
  });
});
