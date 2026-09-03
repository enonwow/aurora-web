import { describe, expect, it } from "vitest";
import {
  normalizeCreatureSavingThrowBonus,
  readCreatureSavingThrowBonusStorage,
  readCreatureSavingThrowBonusesStorage,
} from "../../../../../src/modules/scene/domain/creatureSavingThrowBonuses";

describe("Creature saving-throw bonus Short storage", () => {
  it.each([0, 1, 125, 250])("admits Toolset-bounded value %s", (value) => {
    expect(normalizeCreatureSavingThrowBonus(value)).toBe(value);
  });

  it.each([null, "1", Number.NaN, -1, -0.1, 1.5, 251, 32_767])(
    "rejects out-of-profile value %#",
    (value) => {
      expect(normalizeCreatureSavingThrowBonus(value)).toBeNull();
    },
  );

  it("reads exact immutable presence-sensitive storage", () => {
    const absent = readCreatureSavingThrowBonusStorage({ present: false });
    const present = readCreatureSavingThrowBonusStorage({
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
    undefined,
    {},
    { present: false, value: 1 },
    { present: true, nativeType: "word", value: 1 },
    { present: true, nativeType: "short", value: -1 },
    { present: true, nativeType: "short", value: 251 },
    { present: true, nativeType: "short", value: 1, extra: true },
  ])("rejects malformed storage %#", (value) => {
    expect(readCreatureSavingThrowBonusStorage(value)).toBeNull();
  });

  it("reads only one exact three-member group", () => {
    expect(readCreatureSavingThrowBonusesStorage({
      fortitude: { present: true, nativeType: "short", value: 3 },
      reflex: { present: false },
      will: { present: true, nativeType: "short", value: 5 },
    })).toEqual({
      fortitude: { present: true, nativeType: "short", value: 3 },
      reflex: { present: false },
      will: { present: true, nativeType: "short", value: 5 },
    });
    expect(readCreatureSavingThrowBonusesStorage({
      fortitude: { present: false },
      reflex: { present: false },
    })).toBeNull();
  });
});
