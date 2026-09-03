import {
  AREA_CREATURE_ALIGNMENT_OPTIONS,
  isAreaCreatureAlignmentAxisValue,
  readAreaCreatureAlignmentStorage,
  readExistingAreaCreatureAlignmentMutation,
  resolveAreaCreatureAlignmentLabel,
  resolveAreaCreatureAlignmentPair,
} from "../../src/modules/areas/domain/area-creature-alignment";

describe("Existing Area Creature alignment mutation", () => {
  it("freezes the exact nine native Toolset mappings", () => {
    expect(AREA_CREATURE_ALIGNMENT_OPTIONS).toEqual([
      { label: "Lawful Good", goodEvil: 100, lawfulChaotic: 100 },
      { label: "Neutral Good", goodEvil: 100, lawfulChaotic: 50 },
      { label: "Chaotic Good", goodEvil: 100, lawfulChaotic: 0 },
      { label: "Lawful Neutral", goodEvil: 50, lawfulChaotic: 100 },
      { label: "True Neutral", goodEvil: 50, lawfulChaotic: 50 },
      { label: "Chaotic Neutral", goodEvil: 50, lawfulChaotic: 0 },
      { label: "Lawful Evil", goodEvil: 0, lawfulChaotic: 100 },
      { label: "Neutral Evil", goodEvil: 0, lawfulChaotic: 50 },
      { label: "Chaotic Evil", goodEvil: 0, lawfulChaotic: 0 },
    ]);
    expect(Object.isFrozen(AREA_CREATURE_ALIGNMENT_OPTIONS)).toBe(true);
    expect(AREA_CREATURE_ALIGNMENT_OPTIONS.every(Object.isFrozen)).toBe(true);
  });

  it.each([0, 50, 100])("admits canonical alignment axis value %s", (value) => {
    expect(isAreaCreatureAlignmentAxisValue(value)).toBe(true);
  });

  it.each([-1, 1, 49, 51, 99, 101, 1.5, "50", null])(
    "rejects non-canonical alignment axis value %#",
    (value) => expect(isAreaCreatureAlignmentAxisValue(value)).toBe(false),
  );

  it("maps each exact pair bidirectionally", () => {
    for (const option of AREA_CREATURE_ALIGNMENT_OPTIONS) {
      expect(resolveAreaCreatureAlignmentLabel(option.goodEvil, option.lawfulChaotic))
        .toBe(option.label);
      expect(resolveAreaCreatureAlignmentPair(option.label)).toEqual({
        goodEvil: option.goodEvil,
        lawfulChaotic: option.lawfulChaotic,
      });
    }
  });

  it.each([[25, 50], [50, 25], [100, 101], [0, -1]])(
    "does not normalize legacy intermediate pair %#/%#",
    (goodEvil, lawfulChaotic) => {
      expect(resolveAreaCreatureAlignmentLabel(goodEvil, lawfulChaotic)).toBeNull();
    },
  );

  it.each(["Unknown", " lawful good", "Lawful good", ""])(
    "rejects non-exact label %#",
    (label) => expect(resolveAreaCreatureAlignmentPair(label)).toBeNull(),
  );

  it("reads one exact immutable presence-sensitive Byte pair", () => {
    const storage = readAreaCreatureAlignmentStorage({
      goodEvil: { present: true, nativeType: "byte", value: 100 },
      lawfulChaotic: { present: false },
    });
    expect(storage).toEqual({
      goodEvil: { present: true, nativeType: "byte", value: 100 },
      lawfulChaotic: { present: false },
    });
    expect(Object.isFrozen(storage)).toBe(true);
    expect(Object.isFrozen(storage?.goodEvil)).toBe(true);
  });

  it.each([
    null,
    {},
    { goodEvil: { present: false } },
    {
      goodEvil: { present: true, nativeType: "word", value: 100 },
      lawfulChaotic: { present: false },
    },
    {
      goodEvil: { present: true, nativeType: "byte", value: 25 },
      lawfulChaotic: { present: true, nativeType: "byte", value: 50 },
    },
    {
      goodEvil: { present: false },
      lawfulChaotic: { present: false },
      extra: true,
    },
  ])("rejects malformed exact storage %#", (value) => {
    expect(readAreaCreatureAlignmentStorage(value)).toBeNull();
  });

  it("reads one changed immutable canonical pair mutation", () => {
    const mutation = readExistingAreaCreatureAlignmentMutation({
      expectedGoodEvil: 50,
      expectedLawfulChaotic: 50,
      goodEvil: 100,
      lawfulChaotic: 100,
    });
    expect(mutation).toEqual({
      expectedGoodEvil: 50,
      expectedLawfulChaotic: 50,
      goodEvil: 100,
      lawfulChaotic: 100,
    });
    expect(Object.isFrozen(mutation)).toBe(true);
  });

  it.each([
    null,
    {},
    { expectedGoodEvil: 50, expectedLawfulChaotic: 50, goodEvil: 50, lawfulChaotic: 50 },
    { expectedGoodEvil: 25, expectedLawfulChaotic: 50, goodEvil: 100, lawfulChaotic: 100 },
    { expectedGoodEvil: 50, expectedLawfulChaotic: 50, goodEvil: 100, lawfulChaotic: 25 },
    {
      expectedGoodEvil: 50,
      expectedLawfulChaotic: 50,
      goodEvil: 100,
      lawfulChaotic: 100,
      extra: true,
    },
  ])("rejects malformed or unchanged pair mutation %#", (value) => {
    expect(readExistingAreaCreatureAlignmentMutation(value)).toBeNull();
  });
});
