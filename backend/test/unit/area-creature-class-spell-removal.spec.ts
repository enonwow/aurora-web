import { readExistingAreaCreatureClassSpellRemovalMutation } from
  "../../src/modules/areas/domain/area-creature-class-spell-removal";

describe("existing Creature class spell-entry removal mutation", () => {
  const valid = {
    expectedClassIds: [1, 9],
    expectedLevels: [3, 2],
    classListGraphSha256: "a".repeat(64),
    targets: [
      { classSlotIndex: 0, listKind: "known", spellLevel: 0, entryIndex: 1 },
      { classSlotIndex: 1, listKind: "memorized", spellLevel: 3, entryIndex: 0 },
    ],
    destructiveSpellRemovalConfirmed: true,
  } as const;

  it("accepts and freezes an exact confirmed canonical target vector", () => {
    const mutation = readExistingAreaCreatureClassSpellRemovalMutation(valid);
    expect(mutation).toEqual(valid);
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.targets)).toBe(true);
    expect(Object.isFrozen(mutation?.targets[0])).toBe(true);
  });

  it.each([
    { ...valid, destructiveSpellRemovalConfirmed: false },
    { ...valid, classListGraphSha256: "A".repeat(64) },
    { ...valid, expectedClassIds: [] },
    { ...valid, expectedClassIds: [1, 1] },
    { ...valid, expectedLevels: [3] },
    { ...valid, targets: [] },
    { ...valid, targets: [valid.targets[1], valid.targets[0]] },
    { ...valid, targets: [valid.targets[0], valid.targets[0]] },
    { ...valid, targets: [{ ...valid.targets[0], classSlotIndex: 2 }] },
    { ...valid, targets: [{ ...valid.targets[0], listKind: "prepared" }] },
    { ...valid, targets: [{ ...valid.targets[0], spellLevel: 14 }] },
    { ...valid, targets: [{ ...valid.targets[0], entryIndex: -1 }] },
    { ...valid, extra: true },
  ])("rejects malformed, duplicate, or non-canonical input %#", (candidate) => {
    expect(readExistingAreaCreatureClassSpellRemovalMutation(candidate)).toBeNull();
  });
});
