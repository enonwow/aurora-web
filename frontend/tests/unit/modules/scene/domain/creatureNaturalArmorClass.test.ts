import { describe, expect, it } from "vitest";
import {
  normalizeCreatureNaturalArmorClass,
  readCreatureNaturalArmorClassStorage,
} from "../../../../../src/modules/scene/domain/creatureNaturalArmorClass";

describe("Creature NaturalAC Byte storage", () => {
  it.each([0, 1, 127, 255])("admits storage-safe Byte value %s", (value) => {
    expect(normalizeCreatureNaturalArmorClass(value)).toBe(value);
  });

  it.each([null, "1", Number.NaN, -1, -0.1, 1.5, 256, 1_000])(
    "rejects out-of-profile value %#",
    (value) => {
      expect(normalizeCreatureNaturalArmorClass(value)).toBeNull();
    },
  );

  it("reads exact immutable presence-sensitive storage", () => {
    const absent = readCreatureNaturalArmorClassStorage({ present: false });
    const present = readCreatureNaturalArmorClassStorage({
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
    undefined,
    {},
    { present: false, value: 1 },
    { present: true, nativeType: "word", value: 1 },
    { present: true, nativeType: "byte", value: -1 },
    { present: true, nativeType: "byte", value: 256 },
    { present: true, nativeType: "byte", value: 1, extra: true },
  ])("rejects malformed storage %#", (value) => {
    expect(readCreatureNaturalArmorClassStorage(value)).toBeNull();
  });
});
