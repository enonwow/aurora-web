import {
  isAreaCreatureSavingThrowBonus,
  readAreaCreatureSavingThrowBonusStorage,
  readAreaCreatureSavingThrowBonusesStorage,
  readExistingAreaCreatureSavingThrowBonusMutations,
} from "../../src/modules/areas/domain/area-creature-saving-throw-bonuses";

describe("Existing Area Creature saving-throw bonus mutations", () => {
  it.each([0, 1, 125, 250])("admits Toolset-bounded Short target %s", (value) => {
    expect(isAreaCreatureSavingThrowBonus(value)).toBe(true);
  });

  it.each([null, "1", Number.NaN, -1, -0.1, 1.5, 251, 32_767])(
    "rejects out-of-profile target %#",
    (value) => {
      expect(isAreaCreatureSavingThrowBonus(value)).toBe(false);
    },
  );

  it("reads exact immutable presence-sensitive Short storage", () => {
    const absent = readAreaCreatureSavingThrowBonusStorage({ present: false });
    const present = readAreaCreatureSavingThrowBonusStorage({
      present: true,
      nativeType: "short",
      value: 250,
    });
    expect(absent).toEqual({ present: false });
    expect(present).toEqual({ present: true, nativeType: "short", value: 250 });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(present)).toBe(true);
  });

  it.each([
    null,
    [],
    { present: false, value: 0 },
    { present: true, nativeType: "word", value: 1 },
    { present: true, nativeType: "short", value: -1 },
    { present: true, nativeType: "short", value: 251 },
    { present: true, nativeType: "short", value: 1, extra: true },
  ])("rejects malformed exact storage %#", (value) => {
    expect(readAreaCreatureSavingThrowBonusStorage(value)).toBeNull();
  });

  it("reads one exact immutable three-member storage group", () => {
    const storage = readAreaCreatureSavingThrowBonusesStorage({
      fortitude: { present: true, nativeType: "short", value: 3 },
      reflex: { present: false },
      will: { present: true, nativeType: "short", value: 5 },
    });
    expect(storage).toEqual({
      fortitude: { present: true, nativeType: "short", value: 3 },
      reflex: { present: false },
      will: { present: true, nativeType: "short", value: 5 },
    });
    expect(Object.isFrozen(storage)).toBe(true);
    expect(Object.isFrozen(storage?.fortitude)).toBe(true);
  });

  it.each([
    {},
    { fortitude: { present: false }, reflex: { present: false } },
    {
      fortitude: { present: false },
      reflex: { present: false },
      will: { present: false },
      extra: true,
    },
  ])("rejects an incomplete or extended storage group %#", (value) => {
    expect(readAreaCreatureSavingThrowBonusesStorage(value)).toBeNull();
  });

  it("reads a changed immutable mutation subset", () => {
    const mutation = readExistingAreaCreatureSavingThrowBonusMutations({
      reflex: { expectedValue: 1, value: 2 },
      fortitude: { expectedValue: 3, value: 4 },
    });
    expect(mutation).toEqual({
      reflex: { expectedValue: 1, value: 2 },
      fortitude: { expectedValue: 3, value: 4 },
    });
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.reflex)).toBe(true);
  });

  it.each([
    null,
    [],
    {},
    { fortitude: { expectedValue: 1, value: 1 } },
    { reflex: { expectedValue: -1, value: 1 } },
    { will: { expectedValue: 1, value: 251 } },
    { other: { expectedValue: 1, value: 2 } },
  ])("rejects malformed, empty, or unchanged mutation subset %#", (value) => {
    expect(readExistingAreaCreatureSavingThrowBonusMutations(value)).toBeNull();
  });
});
