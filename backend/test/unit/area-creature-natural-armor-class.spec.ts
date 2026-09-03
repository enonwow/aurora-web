import {
  isAreaCreatureNaturalArmorClass,
  readAreaCreatureNaturalArmorClassStorage,
  readExistingAreaCreatureNaturalArmorClassMutation,
} from "../../src/modules/areas/domain/area-creature-natural-armor-class";

describe("Existing Area Creature NaturalAC mutation", () => {
  it.each([0, 1, 127, 255])("admits storage-safe Byte value %s", (value) => {
    expect(isAreaCreatureNaturalArmorClass(value)).toBe(true);
  });

  it.each([null, "1", Number.NaN, -1, -0.1, 1.5, 256, 1_000])(
    "rejects out-of-profile value %#",
    (value) => {
      expect(isAreaCreatureNaturalArmorClass(value)).toBe(false);
    },
  );

  it("reads exact immutable presence-sensitive Byte storage", () => {
    const absent = readAreaCreatureNaturalArmorClassStorage({ present: false });
    const present = readAreaCreatureNaturalArmorClassStorage({
      present: true,
      nativeType: "byte",
      value: 255,
    });
    expect(absent).toEqual({ present: false });
    expect(present).toEqual({ present: true, nativeType: "byte", value: 255 });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(present)).toBe(true);
  });

  it.each([
    null,
    [],
    { present: false, value: 0 },
    { present: true, nativeType: "word", value: 1 },
    { present: true, nativeType: "byte", value: -1 },
    { present: true, nativeType: "byte", value: 256 },
    { present: true, nativeType: "byte", value: 1, extra: true },
  ])("rejects malformed exact storage %#", (value) => {
    expect(readAreaCreatureNaturalArmorClassStorage(value)).toBeNull();
  });

  it("reads one changed immutable CAS pair", () => {
    const mutation = readExistingAreaCreatureNaturalArmorClassMutation({
      expectedValue: 0,
      value: 2,
    });
    expect(mutation).toEqual({ expectedValue: 0, value: 2 });
    expect(Object.isFrozen(mutation)).toBe(true);
  });

  it.each([
    null,
    [],
    { expectedValue: 0 },
    { expectedValue: 0, value: 1, extra: true },
    { expectedValue: -1, value: 1 },
    { expectedValue: 0, value: 256 },
    { expectedValue: 1, value: 1 },
  ])("rejects malformed or unchanged mutation %#", (value) => {
    expect(readExistingAreaCreatureNaturalArmorClassMutation(value)).toBeNull();
  });
});
