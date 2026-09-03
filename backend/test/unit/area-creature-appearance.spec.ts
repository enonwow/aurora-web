import {
  bindEffectiveAppearanceTwoDaToCreatureAppearance,
  readAreaCreatureAppearanceStorage,
  readExistingAreaCreatureAppearanceMutation,
} from "../../src/modules/areas/domain/area-creature-appearance";

describe("Existing Area Creature Appearance mutation", () => {
  const valid = {
    expectedValue: 249,
    value: 52,
    tableSha256: "a".repeat(64),
    rowCount: 16_500,
  };

  it("accepts one exact changed physical-row Word pair", () => {
    expect(readExistingAreaCreatureAppearanceMutation(valid)).toEqual(valid);
    expect(Object.isFrozen(readExistingAreaCreatureAppearanceMutation(valid))).toBe(true);
  });

  it("accepts exact Word and table-row boundaries", () => {
    expect(readExistingAreaCreatureAppearanceMutation({
      expectedValue: 0,
      value: 1,
      tableSha256: "0".repeat(64),
      rowCount: 2,
    })).not.toBeNull();
    expect(readExistingAreaCreatureAppearanceMutation({
      expectedValue: 0,
      value: 0xffff,
      tableSha256: "f".repeat(64),
      rowCount: 1_000_000,
    })).not.toBeNull();
  });

  it.each([
    ["null", null],
    ["array", []],
    ["unknown key", { ...valid, rowLabel: "DwarfMale" }],
    ["missing key", { expectedValue: 249, value: 52, tableSha256: "a".repeat(64) }],
    ["uppercase digest", { ...valid, tableSha256: "A".repeat(64) }],
    ["short digest", { ...valid, tableSha256: "a".repeat(63) }],
    ["zero rows", { ...valid, rowCount: 0 }],
    ["too many rows", { ...valid, rowCount: 1_000_001 }],
    ["negative expected", { ...valid, expectedValue: -1 }],
    ["fractional expected", { ...valid, expectedValue: 1.5 }],
    ["negative target", { ...valid, value: -1 }],
    ["fractional target", { ...valid, value: 1.5 }],
    ["Word overflow expected", { ...valid, expectedValue: 0x1_0000 }],
    ["Word overflow target", { ...valid, value: 0x1_0000 }],
    ["target equal to row count", { ...valid, value: 16_500 }],
    ["expected equal to row count", { ...valid, expectedValue: 16_500 }],
    ["unchanged", { ...valid, value: 249 }],
    ["prototype-bearing", Object.assign(Object.create(valid), valid)],
  ])("rejects %s", (_label, candidate) => {
    expect(readExistingAreaCreatureAppearanceMutation(candidate)).toBeNull();
  });

  it("reads exact presence-sensitive Word storage and binds immutable table provenance", () => {
    const unbound = readAreaCreatureAppearanceStorage({
      present: true,
      nativeType: "word",
      value: 249,
    });
    expect(unbound).toEqual({ present: true, nativeType: "word", value: 249 });
    const bound = bindEffectiveAppearanceTwoDaToCreatureAppearance(unbound!, {
      resourceName: "appearance.2da",
      sourceObjectKey: "modules/current/appearance.2da",
      sourceLayer: "module",
      sha256: "b".repeat(64),
      sizeBytes: 100,
      rowCount: 1000,
    });
    expect(bound).toEqual({
      present: true,
      nativeType: "word",
      value: 249,
      table: {
        resourceName: "appearance.2da",
        sourceObjectKey: "modules/current/appearance.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 100,
        rowCount: 1000,
        rowIndex: 249,
      },
    });
    expect(readAreaCreatureAppearanceStorage(bound)).toEqual(bound);
    expect(readAreaCreatureAppearanceStorage({ present: false })).toEqual({ present: false });
  });

  it.each([
    { present: true, nativeType: "dword", value: 249 },
    { present: true, nativeType: "word", value: -1 },
    { present: true, nativeType: "word", value: 0x1_0000 },
    { present: true, nativeType: "word", value: 249, extra: true },
    { present: false, value: 0 },
  ])("rejects malformed exact storage %#", (candidate) => {
    expect(readAreaCreatureAppearanceStorage(candidate)).toBeNull();
  });

  it("refuses to bind malformed, stale-row, or non-authoritative descriptors", () => {
    const storage = { present: true as const, nativeType: "word" as const, value: 249 };
    for (const descriptor of [
      null,
      {
        resourceName: "placeables.2da",
        sourceObjectKey: "modules/current/appearance.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 100,
        rowCount: 1000,
      },
      {
        resourceName: "appearance.2da",
        sourceObjectKey: "modules/current/appearance.2da",
        sourceLayer: "external_fixture",
        sha256: "b".repeat(64),
        sizeBytes: 100,
        rowCount: 1000,
      },
      {
        resourceName: "appearance.2da",
        sourceObjectKey: "modules/current/appearance.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 100,
        rowCount: 249,
      },
    ]) {
      expect(bindEffectiveAppearanceTwoDaToCreatureAppearance(storage, descriptor)).toEqual(storage);
    }
  });
});
