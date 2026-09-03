import { describe, expect, it } from "vitest";
import {
  CREATURE_ALIGNMENT_OPTIONS,
  isCreatureAlignmentAxisValue,
  normalizeCreatureAlignmentLabel,
  readCreatureAlignmentStorage,
  resolveCreatureAlignmentLabel,
  resolveCreatureAlignmentPair,
} from "../../../../../src/modules/scene/domain/creatureAlignment";

describe("creatureAlignment", () => {
  it("freezes all nine exact label/pair mappings", () => {
    expect(CREATURE_ALIGNMENT_OPTIONS).toHaveLength(9);
    expect(CREATURE_ALIGNMENT_OPTIONS).toContainEqual({
      label: "Lawful Good", goodEvil: 100, lawfulChaotic: 100,
    });
    expect(CREATURE_ALIGNMENT_OPTIONS).toContainEqual({
      label: "Chaotic Evil", goodEvil: 0, lawfulChaotic: 0,
    });
    expect(Object.isFrozen(CREATURE_ALIGNMENT_OPTIONS)).toBe(true);
    expect(CREATURE_ALIGNMENT_OPTIONS.every(Object.isFrozen)).toBe(true);
  });

  it.each([0, 50, 100])("admits canonical axis value %s", (value) => {
    expect(isCreatureAlignmentAxisValue(value)).toBe(true);
  });

  it.each([-1, 1, 49, 51, 99, 101, 1.5, "50", null])(
    "rejects non-canonical axis value %#",
    (value) => expect(isCreatureAlignmentAxisValue(value)).toBe(false),
  );

  it("maps every canonical pair bidirectionally", () => {
    for (const option of CREATURE_ALIGNMENT_OPTIONS) {
      expect(resolveCreatureAlignmentLabel(option.goodEvil, option.lawfulChaotic))
        .toBe(option.label);
      expect(resolveCreatureAlignmentPair(option.label)).toEqual({
        goodEvil: option.goodEvil,
        lawfulChaotic: option.lawfulChaotic,
      });
      expect(normalizeCreatureAlignmentLabel(option.label)).toBe(option.label);
    }
  });

  it.each(["Unknown", " lawful good", "Lawful good", "", null])(
    "rejects non-exact label %#",
    (value) => expect(normalizeCreatureAlignmentLabel(value)).toBeNull(),
  );

  it("reads one detached immutable exact storage pair", () => {
    const storage = readCreatureAlignmentStorage({
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
  ])("rejects malformed storage %#", (value) => {
    expect(readCreatureAlignmentStorage(value)).toBeNull();
  });
});
