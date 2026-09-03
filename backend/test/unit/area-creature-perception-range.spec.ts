import {
  bindEffectiveRangesTwoDaToCreaturePerceptionRange,
  readAreaCreaturePerceptionRangeStorage,
  readExistingAreaCreaturePerceptionRangeMutation,
} from "../../src/modules/areas/domain/area-creature-perception-range";

describe("Existing Area Creature PerceptionRange mutation", () => {
  const valid = {
    expectedValue: 11,
    value: 9,
    tableSha256: "a".repeat(64),
    rowCount: 12,
  };

  it("accepts one exact changed Toolset-admitted Byte pair", () => {
    expect(readExistingAreaCreaturePerceptionRangeMutation(valid)).toEqual(valid);
    expect(Object.isFrozen(readExistingAreaCreaturePerceptionRangeMutation(valid))).toBe(true);
  });

  it.each([
    null,
    [],
    { ...valid, displayName: "Medium" },
    { ...valid, value: 11 },
    { ...valid, expectedValue: 7 },
    { ...valid, value: 12 },
    { ...valid, rowCount: 11 },
    { ...valid, rowCount: 1_000_001 },
    { ...valid, tableSha256: "A".repeat(64) },
  ])("rejects malformed, unchanged, or non-selector mutation %#", (candidate) => {
    expect(readExistingAreaCreaturePerceptionRangeMutation(candidate)).toBeNull();
  });

  it("reads exact presence-sensitive Byte storage and binds only an admitted current row", () => {
    const unbound = readAreaCreaturePerceptionRangeStorage({
      present: true,
      nativeType: "byte",
      value: 11,
    });
    expect(unbound).toEqual({ present: true, nativeType: "byte", value: 11 });
    const bound = bindEffectiveRangesTwoDaToCreaturePerceptionRange(unbound!, {
      descriptor: {
        resourceName: "ranges.2da",
        sourceObjectKey: "modules/current/ranges.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 1220,
        rowCount: 12,
      },
      rows: [
        { rowIndex: 8, displayName: "Short", displaySource: "strref", nameStrRef: 6668 },
        { rowIndex: 11, displayName: "Default", displaySource: "strref", nameStrRef: 6671 },
      ],
    });
    expect(bound).toEqual({
      present: true,
      nativeType: "byte",
      value: 11,
      table: {
        resourceName: "ranges.2da",
        sourceObjectKey: "modules/current/ranges.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 1220,
        rowCount: 12,
        rowIndex: 11,
      },
    });
    expect(readAreaCreaturePerceptionRangeStorage(bound)).toEqual(bound);
    expect(readAreaCreaturePerceptionRangeStorage({ present: false })).toEqual({ present: false });
  });

  it("keeps unsupported or absent native state unbound", () => {
    const table = {
      descriptor: {
        resourceName: "ranges.2da" as const,
        sourceObjectKey: "modules/current/ranges.2da",
        sourceLayer: "module" as const,
        sha256: "b".repeat(64),
        sizeBytes: 1220,
        rowCount: 12,
      },
      rows: [{ rowIndex: 8, displayName: "Short", displaySource: "strref" as const, nameStrRef: 6668 }],
    };
    expect(bindEffectiveRangesTwoDaToCreaturePerceptionRange(
      { present: true, nativeType: "byte", value: 11 },
      table,
    )).toEqual({ present: true, nativeType: "byte", value: 11 });
    expect(bindEffectiveRangesTwoDaToCreaturePerceptionRange({ present: false }, table))
      .toEqual({ present: false });
  });

  it.each([
    { present: true, nativeType: "word", value: 11 },
    { present: true, nativeType: "byte", value: -1 },
    { present: true, nativeType: "byte", value: 0x100 },
    { present: true, nativeType: "byte", value: 11, extra: true },
    { present: false, value: 11 },
  ])("rejects malformed exact storage %#", (candidate) => {
    expect(readAreaCreaturePerceptionRangeStorage(candidate)).toBeNull();
  });
});
