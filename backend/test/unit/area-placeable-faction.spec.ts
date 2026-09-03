import {
  readExistingAreaPlaceableFactionMutation,
  readExistingAreaPlaceableFactionProvenance,
} from "../../src/modules/areas/domain/area-placeable-faction";

describe("Existing Area Placeable Faction contract", () => {
  const digest = "a".repeat(64);

  it("admits exact digest-bound DWord provenance and changed mutation pairs", () => {
    expect(readExistingAreaPlaceableFactionProvenance({
      expectedValue: 2,
      catalogSha256: digest,
      catalogFactionCount: 5,
    })).toEqual({ expectedValue: 2, catalogSha256: digest, catalogFactionCount: 5 });
    expect(readExistingAreaPlaceableFactionMutation({
      expectedValue: 2,
      value: 3,
      catalogSha256: digest,
      catalogFactionCount: 5,
    })).toEqual({ expectedValue: 2, value: 3, catalogSha256: digest, catalogFactionCount: 5 });
  });

  it.each([
    null,
    [],
    { expectedValue: 2, value: 3, catalogSha256: digest, catalogFactionCount: 5, extra: true },
    { expectedValue: 2, value: 2, catalogSha256: digest, catalogFactionCount: 5 },
    { expectedValue: -1, value: 2, catalogSha256: digest, catalogFactionCount: 5 },
    { expectedValue: 2, value: 5, catalogSha256: digest, catalogFactionCount: 5 },
    { expectedValue: 2, value: 3, catalogSha256: digest.toUpperCase(), catalogFactionCount: 5 },
    { expectedValue: 2, value: 3, catalogSha256: digest, catalogFactionCount: 0 },
  ])("rejects invalid mutation %p", (value) => {
    expect(readExistingAreaPlaceableFactionMutation(value)).toBeNull();
  });
});
