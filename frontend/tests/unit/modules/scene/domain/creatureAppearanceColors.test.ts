import {
  CREATURE_APPEARANCE_COLOR_FIELDS,
  normalizeCreatureAppearanceColor,
  readCreatureAppearanceColorsStorage,
} from "../../../../../src/modules/scene/domain/creatureAppearanceColors";

describe("Creature appearance colors", () => {
  it("keeps the native field order and byte range", () => {
    expect(CREATURE_APPEARANCE_COLOR_FIELDS.map((entry) => entry.nativeLabel)).toEqual([
      "Color_Skin",
      "Color_Hair",
      "Color_Tattoo1",
      "Color_Tattoo2",
    ]);
    expect(normalizeCreatureAppearanceColor(0)).toBe(0);
    expect(normalizeCreatureAppearanceColor(255)).toBe(255);
    expect(normalizeCreatureAppearanceColor(-1)).toBeNull();
    expect(normalizeCreatureAppearanceColor(256)).toBeNull();
    expect(normalizeCreatureAppearanceColor(1.5)).toBeNull();
  });

  it("accepts only the complete exact presence-sensitive group", () => {
    const group = {
      skin: { present: true, nativeType: "byte" as const, value: 1 },
      hair: { present: true, nativeType: "byte" as const, value: 2 },
      tattoo1: { present: false as const },
      tattoo2: { present: true, nativeType: "byte" as const, value: 4 },
    };
    expect(readCreatureAppearanceColorsStorage(group)).toEqual(group);
    expect(readCreatureAppearanceColorsStorage({ ...group, extra: true })).toBeNull();
    expect(readCreatureAppearanceColorsStorage({
      ...group,
      hair: { present: true, nativeType: "word", value: 2 },
    })).toBeNull();
  });
});
