import {
  bindEffectiveGenderTwoDaToCreatureGender,
  readAreaCreatureGenderStorage,
  readExistingAreaCreatureGenderMutation,
} from "../../src/modules/areas/domain/area-creature-gender";

describe("Existing Area Creature Gender mutation", () => {
  const valid = {
    expectedValue: 4,
    value: 0,
    tableSha256: "a".repeat(64),
    rowCount: 5,
  };

  it("accepts one exact changed physical-row Byte pair", () => {
    expect(readExistingAreaCreatureGenderMutation(valid)).toEqual(valid);
    expect(Object.isFrozen(readExistingAreaCreatureGenderMutation(valid))).toBe(true);
  });

  it("keeps complete table rowCount while constraining stored rows to Byte", () => {
    expect(readExistingAreaCreatureGenderMutation({
      expectedValue: 0,
      value: 0xff,
      tableSha256: "f".repeat(64),
      rowCount: 1_000_000,
    })).not.toBeNull();
  });

  it.each([
    null,
    [],
    { ...valid, displayName: "Male" },
    { ...valid, value: 4 },
    { ...valid, expectedValue: -1 },
    { ...valid, value: 0x100 },
    { ...valid, value: 5 },
    { ...valid, rowCount: 0 },
    { ...valid, rowCount: 1_000_001 },
    { ...valid, tableSha256: "A".repeat(64) },
  ])("rejects malformed, stale, unchanged, or non-Byte mutation %#", (candidate) => {
    expect(readExistingAreaCreatureGenderMutation(candidate)).toBeNull();
  });

  it("reads exact presence-sensitive Byte storage and binds immutable table provenance", () => {
    const unbound = readAreaCreatureGenderStorage({
      present: true,
      nativeType: "byte",
      value: 4,
    });
    expect(unbound).toEqual({ present: true, nativeType: "byte", value: 4 });
    const bound = bindEffectiveGenderTwoDaToCreatureGender(unbound!, {
      resourceName: "gender.2da",
      sourceObjectKey: "modules/current/gender.2da",
      sourceLayer: "module",
      sha256: "b".repeat(64),
      sizeBytes: 250,
      rowCount: 5,
    });
    expect(bound).toEqual({
      present: true,
      nativeType: "byte",
      value: 4,
      table: {
        resourceName: "gender.2da",
        sourceObjectKey: "modules/current/gender.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 250,
        rowCount: 5,
        rowIndex: 4,
      },
    });
    expect(readAreaCreatureGenderStorage(bound)).toEqual(bound);
    expect(readAreaCreatureGenderStorage({ present: false })).toEqual({ present: false });
  });

  it.each([
    { present: true, nativeType: "word", value: 4 },
    { present: true, nativeType: "byte", value: -1 },
    { present: true, nativeType: "byte", value: 0x100 },
    { present: true, nativeType: "byte", value: 4, extra: true },
    { present: false, value: 0 },
  ])("rejects malformed exact storage %#", (candidate) => {
    expect(readAreaCreatureGenderStorage(candidate)).toBeNull();
  });

  it("refuses malformed, stale-row, or non-authoritative descriptors", () => {
    const storage = { present: true as const, nativeType: "byte" as const, value: 4 };
    for (const descriptor of [
      null,
      {
        resourceName: "appearance.2da",
        sourceObjectKey: "modules/current/gender.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 250,
        rowCount: 5,
      },
      {
        resourceName: "gender.2da",
        sourceObjectKey: "modules/current/gender.2da",
        sourceLayer: "fixture",
        sha256: "b".repeat(64),
        sizeBytes: 250,
        rowCount: 5,
      },
      {
        resourceName: "gender.2da",
        sourceObjectKey: "modules/current/gender.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 250,
        rowCount: 4,
      },
    ]) {
      expect(bindEffectiveGenderTwoDaToCreatureGender(storage, descriptor)).toEqual(storage);
    }
  });
});
