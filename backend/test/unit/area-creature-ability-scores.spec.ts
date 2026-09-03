import {
  AREA_CREATURE_ABILITY_SCORE_FIELDS,
  isAreaCreatureAbilityScore,
  readAreaCreatureAbilityScoreStorage,
  readAreaCreatureAbilityScoresStorage,
  readExistingAreaCreatureAbilityScoreMutations,
} from "../../src/modules/areas/domain/area-creature-ability-scores";

const present = (value: number) => ({ present: true, nativeType: "byte", value });
const absent = () => ({ present: false });

const completeStorage = () => ({
  strength: present(15),
  dexterity: present(13),
  constitution: present(16),
  intelligence: absent(),
  wisdom: present(12),
  charisma: present(8),
});

describe("Area Creature ability-score exact storage and mutation contract", () => {
  it("freezes the canonical native field mapping and order", () => {
    expect(AREA_CREATURE_ABILITY_SCORE_FIELDS).toEqual([
      { key: "strength", nativeLabel: "Str" },
      { key: "dexterity", nativeLabel: "Dex" },
      { key: "constitution", nativeLabel: "Con" },
      { key: "intelligence", nativeLabel: "Int" },
      { key: "wisdom", nativeLabel: "Wis" },
      { key: "charisma", nativeLabel: "Cha" },
    ]);
    expect(Object.isFrozen(AREA_CREATURE_ABILITY_SCORE_FIELDS)).toBe(true);
    expect(AREA_CREATURE_ABILITY_SCORE_FIELDS.every(Object.isFrozen)).toBe(true);
  });

  it.each([0, 1, 15, 254, 255])("admits the exact Byte score %p", (value) => {
    expect(isAreaCreatureAbilityScore(value)).toBe(true);
  });

  it.each([
    -1,
    256,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "15",
    null,
    undefined,
  ])("rejects a non-Byte score %p", (value) => {
    expect(isAreaCreatureAbilityScore(value)).toBe(false);
  });

  it("reads exact presence-sensitive member storage", () => {
    expect(readAreaCreatureAbilityScoreStorage(absent())).toEqual({ present: false });
    expect(readAreaCreatureAbilityScoreStorage(present(17))).toEqual({
      present: true,
      nativeType: "byte",
      value: 17,
    });
  });

  it.each([
    {},
    { present: false, value: 0 },
    { present: true, value: 15 },
    { present: true, nativeType: "word", value: 15 },
    { present: true, nativeType: "byte", value: 256 },
    { present: true, nativeType: "byte", value: 15, alias: "Str" },
    Object.create(null),
  ])("rejects malformed member storage %#", (value) => {
    expect(readAreaCreatureAbilityScoreStorage(value)).toBeNull();
  });

  it("reads and freezes the exact complete six-member storage group", () => {
    const result = readAreaCreatureAbilityScoresStorage(completeStorage());
    expect(result).toEqual(completeStorage());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.values(result ?? {}).every(Object.isFrozen)).toBe(true);
  });

  it("rejects incomplete, extended, or malformed storage groups", () => {
    const { charisma: _charisma, ...incomplete } = completeStorage();
    expect(readAreaCreatureAbilityScoresStorage(incomplete)).toBeNull();
    expect(readAreaCreatureAbilityScoresStorage({ ...completeStorage(), str: present(15) })).toBeNull();
    expect(readAreaCreatureAbilityScoresStorage({ ...completeStorage(), wisdom: present(300) })).toBeNull();
    expect(readAreaCreatureAbilityScoresStorage([])).toBeNull();
  });

  it("reads a changed subset in canonical key space", () => {
    const result = readExistingAreaCreatureAbilityScoreMutations({
      strength: { expectedValue: 15, value: 17 },
      charisma: { expectedValue: 8, value: 10 },
    });
    expect(result).toEqual({
      strength: { expectedValue: 15, value: 17 },
      charisma: { expectedValue: 8, value: 10 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.values(result ?? {}).every(Object.isFrozen)).toBe(true);
  });

  it.each([
    {},
    { str: { expectedValue: 15, value: 17 } },
    { strength: { expectedValue: 15, value: 15 } },
    { strength: { expectedValue: 15 } },
    { strength: { expectedValue: 15, value: 17, extra: true } },
    { strength: { expectedValue: -1, value: 17 } },
    { strength: { expectedValue: 15, value: 256 } },
    { strength: { expectedValue: 15, value: 17.5 } },
    [],
    null,
  ])("rejects malformed or unchanged mutation input %#", (value) => {
    expect(readExistingAreaCreatureAbilityScoreMutations(value)).toBeNull();
  });
});
