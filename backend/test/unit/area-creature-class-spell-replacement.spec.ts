import { readExistingAreaCreatureClassSpellReplacementMutation } from
  "../../src/modules/areas/domain/area-creature-class-spell-replacement";

describe("existing Creature class spell-entry replacement mutation", () => {
  const valid = {
    expectedClassIds: [1, 10],
    expectedLevels: [3, 2],
    classListGraphSha256: "a".repeat(64),
    classesTableSha256: "b".repeat(64),
    classesRowCount: 11,
    spellsTableSha256: "c".repeat(64),
    spellsRowCount: 900,
    replacements: [
      {
        classSlotIndex: 0,
        listKind: "known",
        spellLevel: 1,
        entryIndex: 0,
        expectedSpellId: 12,
        targetSpellId: 13,
      },
      {
        classSlotIndex: 1,
        listKind: "memorized",
        spellLevel: 2,
        entryIndex: 1,
        expectedSpellId: 20,
        targetSpellId: 21,
      },
    ],
    spellReplacementConfirmed: true,
  } as const;

  it("accepts and freezes exact confirmed canonical replacements", () => {
    const mutation = readExistingAreaCreatureClassSpellReplacementMutation(valid);
    expect(mutation).toEqual(valid);
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.replacements)).toBe(true);
    expect(Object.isFrozen(mutation?.replacements[0])).toBe(true);
  });

  it.each([
    { ...valid, spellReplacementConfirmed: false },
    { ...valid, classListGraphSha256: "A".repeat(64) },
    { ...valid, classesTableSha256: "x" },
    { ...valid, spellsTableSha256: "x" },
    { ...valid, classesRowCount: 10 },
    { ...valid, spellsRowCount: 13 },
    { ...valid, expectedClassIds: [] },
    { ...valid, expectedClassIds: [1, 1] },
    { ...valid, expectedLevels: [3] },
    { ...valid, replacements: [] },
    { ...valid, replacements: [valid.replacements[1], valid.replacements[0]] },
    { ...valid, replacements: [valid.replacements[0], valid.replacements[0]] },
    { ...valid, replacements: [{ ...valid.replacements[0], classSlotIndex: 2 }] },
    { ...valid, replacements: [{ ...valid.replacements[0], listKind: "memorized" }] },
    { ...valid, replacements: [{ ...valid.replacements[1], listKind: "known" }] },
    { ...valid, replacements: [{ ...valid.replacements[0], spellLevel: 14 }] },
    { ...valid, replacements: [{ ...valid.replacements[0], entryIndex: -1 }] },
    { ...valid, replacements: [{ ...valid.replacements[0], expectedSpellId: 13 }] },
    { ...valid, replacements: [{ ...valid.replacements[0], targetSpellId: 900 }] },
    { ...valid, expectedClassIds: [1, 4] },
    { ...valid, extra: true },
  ])("rejects malformed, stale, unsupported, or non-canonical input %#", (candidate) => {
    expect(readExistingAreaCreatureClassSpellReplacementMutation(candidate)).toBeNull();
  });
});
