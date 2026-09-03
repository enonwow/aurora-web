import {
  isAreaCreatureInterruptableValue,
  readAreaCreatureInterruptableStorage,
  readExistingAreaCreatureInterruptableMutation,
} from "../../src/modules/areas/domain/area-creature-interruptable";

describe("Existing Area Creature Interruptable domain", () => {
  it("admits and freezes exact absence and both native Byte values", () => {
    const absent = readAreaCreatureInterruptableStorage({ present: false });
    const zero = readAreaCreatureInterruptableStorage({ present: true, value: 0 });
    const one = readAreaCreatureInterruptableStorage({ present: true, value: 1 });

    expect(absent).toEqual({ present: false });
    expect(zero).toEqual({ present: true, value: 0 });
    expect(one).toEqual({ present: true, value: 1 });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(zero)).toBe(true);
    expect(Object.isFrozen(one)).toBe(true);
    expect(isAreaCreatureInterruptableValue(0)).toBe(true);
    expect(isAreaCreatureInterruptableValue(1)).toBe(true);
  });

  it.each([
    null,
    [],
    {},
    { present: false, value: 1 },
    { present: true },
    { present: true, value: -1 },
    { present: true, value: 2 },
    { present: true, value: false },
    { present: true, value: "1" },
    { present: true, value: 1, extra: true },
    Object.assign(Object.create({}), { present: true, value: 1 }),
  ])("rejects malformed storage %#", (candidate) => {
    expect(readAreaCreatureInterruptableStorage(candidate)).toBeNull();
  });

  it("admits and freezes one exact changed Byte pair", () => {
    const mutation = readExistingAreaCreatureInterruptableMutation({
      expectedValue: 1,
      value: 0,
    });

    expect(mutation).toEqual({ expectedValue: 1, value: 0 });
    expect(Object.isFrozen(mutation)).toBe(true);
  });

  it.each([
    null,
    [],
    1,
    {},
    { expectedValue: 1 },
    { value: 0 },
    { expectedValue: 1, value: 1 },
    { expectedValue: 0, value: 0 },
    { expectedValue: 2, value: 0 },
    { expectedValue: 1, value: 2 },
    { expectedValue: 1, value: 0, extra: true },
    Object.assign(Object.create({}), { expectedValue: 1, value: 0 }),
  ])("rejects malformed, unchanged, or non-binary mutation %#", (candidate) => {
    expect(readExistingAreaCreatureInterruptableMutation(candidate)).toBeNull();
  });
});
