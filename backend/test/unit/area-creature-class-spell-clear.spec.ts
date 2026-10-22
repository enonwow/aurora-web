import { readExistingAreaCreatureClassSpellClearMutation } from
  "../../src/modules/areas/domain/area-creature-class-spell-clear";

describe("existing Creature class spell-list clear mutation", () => {
  const valid = {
    expectedClassIds: [1, 9],
    expectedLevels: [3, 2],
    classListGraphSha256: "a".repeat(64),
    classSlotIndices: [0, 1],
    destructiveSpellClearConfirmed: true,
  };

  it("accepts and freezes an exact confirmed bounded mutation", () => {
    const mutation = readExistingAreaCreatureClassSpellClearMutation(valid);
    expect(mutation).toEqual(valid);
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.expectedClassIds)).toBe(true);
    expect(Object.isFrozen(mutation?.classSlotIndices)).toBe(true);
  });

  it.each([
    { ...valid, destructiveSpellClearConfirmed: false },
    { ...valid, classListGraphSha256: "A".repeat(64) },
    { ...valid, expectedClassIds: [] },
    { ...valid, expectedClassIds: [1, 1] },
    { ...valid, expectedLevels: [3] },
    { ...valid, expectedLevels: [181, 1] },
    { ...valid, classSlotIndices: [] },
    { ...valid, classSlotIndices: [1, 0] },
    { ...valid, classSlotIndices: [0, 0] },
    { ...valid, classSlotIndices: [2] },
    { ...valid, extra: true },
  ])("rejects malformed or non-canonical input %#", (candidate) => {
    expect(readExistingAreaCreatureClassSpellClearMutation(candidate)).toBeNull();
  });
});
