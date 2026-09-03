import {
  AREA_CREATURE_DECAY_MAX_MILLISECONDS,
  AREA_CREATURE_DECAY_MIN_MILLISECONDS,
  isCanonicalAreaCreatureDecayTimeMilliseconds,
  readAreaCreatureBodyBagStorage,
  readAreaCreatureDecayTimeStorage,
  readExistingAreaCreatureBodyBagMutation,
  readExistingAreaCreatureBodyBagProvenance,
  readExistingAreaCreatureDecayTimeProvenance,
  readExistingAreaCreatureDecayTimeMutation,
} from "../../src/modules/areas/domain/area-creature-death-remains";

describe("existing Area Creature death-remains settings", () => {
  it("retains exact presence-sensitive BodyBag Byte storage", () => {
    expect(readAreaCreatureBodyBagStorage({ present: false })).toEqual({ present: false });
    expect(readAreaCreatureBodyBagStorage({
      present: true,
      nativeType: "byte",
      value: 6,
    })).toEqual({ present: true, nativeType: "byte", value: 6 });
  });

  it.each([
    null,
    {},
    { present: false, value: 0 },
    { present: true, nativeType: "word", value: 1 },
    { present: true, nativeType: "byte", value: -1 },
    { present: true, nativeType: "byte", value: 256 },
    { present: true, nativeType: "byte", value: 1, extra: true },
  ])("rejects malformed BodyBag storage %#", (value) => {
    expect(readAreaCreatureBodyBagStorage(value)).toBeNull();
  });

  it("retains any exact unsigned DecayTime DWord while separating authoring admission", () => {
    expect(readAreaCreatureDecayTimeStorage({ present: false })).toEqual({ present: false });
    expect(readAreaCreatureDecayTimeStorage({
      present: true,
      nativeType: "dword",
      valueMilliseconds: 45,
    })).toEqual({ present: true, nativeType: "dword", valueMilliseconds: 45 });
    expect(isCanonicalAreaCreatureDecayTimeMilliseconds(45)).toBe(false);
    expect(isCanonicalAreaCreatureDecayTimeMilliseconds(AREA_CREATURE_DECAY_MIN_MILLISECONDS))
      .toBe(true);
    expect(isCanonicalAreaCreatureDecayTimeMilliseconds(AREA_CREATURE_DECAY_MAX_MILLISECONDS))
      .toBe(true);
  });

  it.each([
    null,
    {},
    { present: false, valueMilliseconds: 5000 },
    { present: true, nativeType: "int", valueMilliseconds: 5000 },
    { present: true, nativeType: "dword", valueMilliseconds: -1 },
    { present: true, nativeType: "dword", valueMilliseconds: 0x1_0000_0000 },
    { present: true, nativeType: "dword", valueMilliseconds: 5000.5 },
    { present: true, nativeType: "dword", valueMilliseconds: 5000, extra: true },
  ])("rejects malformed DecayTime storage %#", (value) => {
    expect(readAreaCreatureDecayTimeStorage(value)).toBeNull();
  });

  it("reuses the digest-bound physical-row CAS for Creature BodyBag", () => {
    expect(readExistingAreaCreatureBodyBagProvenance({
      expectedValue: 0,
      tableSha256: "a".repeat(64),
      tableRowCount: 7,
    })).toEqual({
      expectedValue: 0,
      tableSha256: "a".repeat(64),
      tableRowCount: 7,
    });
    const mutation = readExistingAreaCreatureBodyBagMutation({
      expectedValue: 0,
      value: 6,
      tableSha256: "a".repeat(64),
      tableRowCount: 7,
    });
    expect(mutation).toEqual({
      expectedValue: 0,
      value: 6,
      tableSha256: "a".repeat(64),
      tableRowCount: 7,
    });
    expect(Object.isFrozen(mutation)).toBe(true);
  });

  it("accepts only a changed canonical millisecond CAS", () => {
    expect(readExistingAreaCreatureDecayTimeProvenance({
      expectedMilliseconds: 5000,
    })).toEqual({ expectedMilliseconds: 5000 });
    const mutation = readExistingAreaCreatureDecayTimeMutation({
      expectedMilliseconds: 5000,
      valueMilliseconds: 32767000,
    });
    expect(mutation).toEqual({
      expectedMilliseconds: 5000,
      valueMilliseconds: 32767000,
    });
    expect(Object.isFrozen(mutation)).toBe(true);
  });

  it.each([
    null,
    {},
    { expectedMilliseconds: 5000 },
    { expectedMilliseconds: 5000, valueMilliseconds: 6000, extra: true },
    { expectedMilliseconds: 45, valueMilliseconds: 6000 },
    { expectedMilliseconds: 5000, valueMilliseconds: 45 },
    { expectedMilliseconds: 5000, valueMilliseconds: 5000 },
    { expectedMilliseconds: 4000, valueMilliseconds: 5000 },
    { expectedMilliseconds: 5000, valueMilliseconds: 32768000 },
  ])("rejects malformed, noncanonical, or unchanged DecayTime CAS %#", (value) => {
    expect(readExistingAreaCreatureDecayTimeMutation(value)).toBeNull();
  });

  it.each([
    null,
    {},
    { expectedMilliseconds: 45 },
    { expectedMilliseconds: 5000, extra: true },
  ])("rejects malformed or noncanonical DecayTime provenance %#", (value) => {
    expect(readExistingAreaCreatureDecayTimeProvenance(value)).toBeNull();
  });
});
