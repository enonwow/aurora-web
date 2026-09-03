import {
  readAreaCreatureFactionStorage,
  readExistingAreaCreatureFactionMutation,
  readExistingAreaCreatureFactionProvenance,
} from "../../src/modules/areas/domain/area-creature-faction";

describe("Existing Area Creature FactionID contract", () => {
  const digest = "a".repeat(64);

  it("admits exact canonical Word storage and digest-bound changed pairs", () => {
    expect(readAreaCreatureFactionStorage({
      present: true,
      nativeType: "word",
      value: 4,
    })).toEqual({ present: true, nativeType: "word", value: 4 });
    expect(readAreaCreatureFactionStorage({ present: false })).toEqual({ present: false });
    expect(readExistingAreaCreatureFactionProvenance({
      expectedValue: 1,
      catalogSha256: digest,
      catalogFactionCount: 5,
    })).toEqual({ expectedValue: 1, catalogSha256: digest, catalogFactionCount: 5 });
    expect(readExistingAreaCreatureFactionMutation({
      expectedValue: 1,
      value: 4,
      catalogSha256: digest,
      catalogFactionCount: 5,
    })).toEqual({
      expectedValue: 1,
      value: 4,
      catalogSha256: digest,
      catalogFactionCount: 5,
    });
  });

  it.each([
    null,
    [],
    { present: true, nativeType: "dword", value: 4 },
    { present: true, nativeType: "word", value: -1 },
    { present: true, nativeType: "word", value: 0x1_0000 },
    { present: true, nativeType: "word", value: 4, extra: true },
  ])("rejects noncanonical storage %p", (value) => {
    expect(readAreaCreatureFactionStorage(value)).toBeNull();
  });

  it.each([
    null,
    [],
    { expectedValue: 1, value: 4, catalogSha256: digest, catalogFactionCount: 5, extra: true },
    { expectedValue: 1, value: 1, catalogSha256: digest, catalogFactionCount: 5 },
    { expectedValue: -1, value: 4, catalogSha256: digest, catalogFactionCount: 5 },
    { expectedValue: 1, value: 5, catalogSha256: digest, catalogFactionCount: 5 },
    { expectedValue: 1, value: 4, catalogSha256: digest.toUpperCase(), catalogFactionCount: 5 },
    { expectedValue: 1, value: 4, catalogSha256: digest, catalogFactionCount: 0 },
  ])("rejects invalid mutation %p", (value) => {
    expect(readExistingAreaCreatureFactionMutation(value)).toBeNull();
  });
});
