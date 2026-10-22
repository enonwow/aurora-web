import { readExistingAreaCreatureClassSpellReorderMutation } from
  "../../src/modules/areas/domain/area-creature-class-spell-reorder";

describe("existing Creature class spell-entry reorder mutation", () => {
  const valid = {
    expectedClassIds: [1, 9],
    expectedLevels: [3, 2],
    classListGraphSha256: "a".repeat(64),
    reorders: [
      {
        classSlotIndex: 0,
        listKind: "known",
        spellLevel: 0,
        entryOrder: [2, 0, 1],
      },
      {
        classSlotIndex: 1,
        listKind: "memorized",
        spellLevel: 3,
        entryOrder: [1, 0],
      },
    ],
    spellReorderConfirmed: true,
  } as const;

  it("accepts and freezes exact confirmed canonical list permutations", () => {
    const mutation = readExistingAreaCreatureClassSpellReorderMutation(valid);
    expect(mutation).toEqual(valid);
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.reorders)).toBe(true);
    expect(Object.isFrozen(mutation?.reorders[0])).toBe(true);
    expect(Object.isFrozen(mutation?.reorders[0]?.entryOrder)).toBe(true);
  });

  it.each([
    { ...valid, spellReorderConfirmed: false },
    { ...valid, classListGraphSha256: "A".repeat(64) },
    { ...valid, expectedClassIds: [] },
    { ...valid, expectedClassIds: [1, 1] },
    { ...valid, expectedLevels: [3] },
    { ...valid, reorders: [] },
    { ...valid, reorders: [valid.reorders[1], valid.reorders[0]] },
    { ...valid, reorders: [valid.reorders[0], valid.reorders[0]] },
    { ...valid, reorders: [{ ...valid.reorders[0], classSlotIndex: 2 }] },
    { ...valid, reorders: [{ ...valid.reorders[0], listKind: "prepared" }] },
    { ...valid, reorders: [{ ...valid.reorders[0], spellLevel: 14 }] },
    { ...valid, reorders: [{ ...valid.reorders[0], entryOrder: [0] }] },
    { ...valid, reorders: [{ ...valid.reorders[0], entryOrder: [0, 1, 2] }] },
    { ...valid, reorders: [{ ...valid.reorders[0], entryOrder: [2, 0, 0] }] },
    { ...valid, reorders: [{ ...valid.reorders[0], entryOrder: [3, 0, 1] }] },
    { ...valid, extra: true },
  ])("rejects malformed, duplicate, identity, or non-canonical input %#", (candidate) => {
    expect(readExistingAreaCreatureClassSpellReorderMutation(candidate)).toBeNull();
  });

  it("rejects a request carrying more than 256 total entry indices", () => {
    expect(readExistingAreaCreatureClassSpellReorderMutation({
      ...valid,
      reorders: [
        { ...valid.reorders[0], entryOrder: Array.from({ length: 256 }, (_, index) =>
          index === 0 ? 1 : index === 1 ? 0 : index) },
        { ...valid.reorders[1], entryOrder: [1, 0] },
      ],
    })).toBeNull();
  });
});
