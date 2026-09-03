import {
  AREA_CREATURE_APPEARANCE_COLOR_FIELDS,
  readAreaCreatureAppearanceColorStorage,
  readAreaCreatureAppearanceColorsStorage,
  readExistingAreaCreatureAppearanceColorMutations,
} from "../../src/modules/areas/domain/area-creature-appearance-colors";

describe("Area Creature appearance colors", () => {
  it("freezes the exact native color labels in writer order", () => {
    expect(AREA_CREATURE_APPEARANCE_COLOR_FIELDS).toEqual([
      { key: "skin", nativeLabel: "Color_Skin" },
      { key: "hair", nativeLabel: "Color_Hair" },
      { key: "tattoo1", nativeLabel: "Color_Tattoo1" },
      { key: "tattoo2", nativeLabel: "Color_Tattoo2" },
    ]);
  });

  it("accepts exact present and absent Byte storage", () => {
    expect(readAreaCreatureAppearanceColorStorage({ present: false })).toEqual({
      present: false,
    });
    expect(readAreaCreatureAppearanceColorStorage({
      present: true,
      nativeType: "byte",
      value: 255,
    })).toEqual({ present: true, nativeType: "byte", value: 255 });
  });

  it("rejects malformed storage and out-of-byte values", () => {
    expect(readAreaCreatureAppearanceColorStorage({
      present: true,
      nativeType: "word",
      value: 1,
    })).toBeNull();
    expect(readAreaCreatureAppearanceColorStorage({
      present: true,
      nativeType: "byte",
      value: 256,
    })).toBeNull();
    expect(readAreaCreatureAppearanceColorStorage({
      present: false,
      value: 0,
    })).toBeNull();
  });

  it("requires the complete exact four-member provenance group", () => {
    const group = {
      skin: { present: true, nativeType: "byte", value: 1 },
      hair: { present: true, nativeType: "byte", value: 2 },
      tattoo1: { present: false },
      tattoo2: { present: true, nativeType: "byte", value: 4 },
    };
    expect(readAreaCreatureAppearanceColorsStorage(group)).toEqual(group);
    expect(readAreaCreatureAppearanceColorsStorage({
      ...group,
      tattoo2: undefined,
    })).toBeNull();
    expect(readAreaCreatureAppearanceColorsStorage({ ...group, extra: 1 })).toBeNull();
  });

  it("accepts a non-empty changed mutation subset and rejects no-op or unknown keys", () => {
    expect(readExistingAreaCreatureAppearanceColorMutations({
      skin: { expectedValue: 1, value: 9 },
      tattoo2: { expectedValue: 4, value: 0 },
    })).toEqual({
      skin: { expectedValue: 1, value: 9 },
      tattoo2: { expectedValue: 4, value: 0 },
    });
    expect(readExistingAreaCreatureAppearanceColorMutations({})).toBeNull();
    expect(readExistingAreaCreatureAppearanceColorMutations({
      hair: { expectedValue: 2, value: 2 },
    })).toBeNull();
    expect(readExistingAreaCreatureAppearanceColorMutations({
      skin: { expectedValue: 1, value: 2 },
      other: { expectedValue: 1, value: 2 },
    })).toBeNull();
  });
});
