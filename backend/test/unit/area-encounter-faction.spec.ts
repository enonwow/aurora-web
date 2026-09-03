import {
  readAreaEncounterFactionStorage,
  readExistingAreaEncounterFactionMutation,
  readExistingAreaEncounterFactionProvenance,
} from "../../src/modules/areas/domain/area-encounter-faction";

describe("Existing Area Encounter Faction contract", () => {
  const digest = "a".repeat(64);

  it("admits exact DWord storage and a catalog-bound changed non-PC pair", () => {
    expect(readAreaEncounterFactionStorage({
      present: true,
      nativeType: "dword",
      value: 4,
    })).toEqual({ present: true, nativeType: "dword", value: 4 });
    expect(readAreaEncounterFactionStorage({ present: false })).toEqual({ present: false });
    expect(readExistingAreaEncounterFactionProvenance({
      expectedValue: 1,
      catalogSha256: digest,
      catalogFactionCount: 5,
    })).toEqual({ expectedValue: 1, catalogSha256: digest, catalogFactionCount: 5 });
    expect(readExistingAreaEncounterFactionMutation({
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
    { present: true, nativeType: "word", value: 1 },
    { present: true, nativeType: "dword", value: -1 },
    { present: true, nativeType: "dword", value: 0x1_0000_0000 },
    { present: true, nativeType: "dword", value: 1, extra: true },
  ])("rejects noncanonical storage %p", (value) => {
    expect(readAreaEncounterFactionStorage(value)).toBeNull();
  });

  it.each([
    null,
    [],
    { expectedValue: 1, value: 4, catalogSha256: digest, catalogFactionCount: 5, extra: true },
    { expectedValue: 1, value: 1, catalogSha256: digest, catalogFactionCount: 5 },
    { expectedValue: 0, value: 4, catalogSha256: digest, catalogFactionCount: 5 },
    { expectedValue: 1, value: 0, catalogSha256: digest, catalogFactionCount: 5 },
    { expectedValue: 1, value: 5, catalogSha256: digest, catalogFactionCount: 5 },
    { expectedValue: 1, value: 4, catalogSha256: digest.toUpperCase(), catalogFactionCount: 5 },
    { expectedValue: 1, value: 4, catalogSha256: digest, catalogFactionCount: 1 },
  ])("rejects invalid, PC-row, stale-shaped, or unchanged mutation %p", (value) => {
    expect(readExistingAreaEncounterFactionMutation(value)).toBeNull();
  });
});
