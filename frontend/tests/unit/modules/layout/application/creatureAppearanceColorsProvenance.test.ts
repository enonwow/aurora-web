import {
  canEditExistingCreatureAppearanceColor,
  materializeExistingCreatureAppearanceColors,
  reduceExistingCreatureAppearanceColor,
} from "../../../../../src/modules/layout/application/creatureAppearanceColorsProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const source: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureAppearanceColors: {
    skin: { present: true, nativeType: "byte", value: 1 },
    hair: { present: true, nativeType: "byte", value: 2 },
    tattoo1: { present: false },
    tattoo2: { present: true, nativeType: "byte", value: 4 },
  },
};

describe("existing Creature appearance color provenance", () => {
  it("activates only exact present native members", () => {
    expect(canEditExistingCreatureAppearanceColor(source, "skin")).toBe(true);
    expect(canEditExistingCreatureAppearanceColor(source, "tattoo1")).toBe(false);
  });

  it("reduces byte targets and preserves unsupported members", () => {
    expect(reduceExistingCreatureAppearanceColor(source, "skin", "1", 9)).toBe("9");
    expect(reduceExistingCreatureAppearanceColor(source, "skin", "1", "10")).toBe("10");
    expect(reduceExistingCreatureAppearanceColor(source, "skin", "1", "")).toBe("1");
    expect(reduceExistingCreatureAppearanceColor(source, "skin", "1", 256)).toBe("1");
    expect(reduceExistingCreatureAppearanceColor(source, "tattoo1", "0", 7)).toBe("0");
  });

  it("materializes only admitted retained members", () => {
    expect(materializeExistingCreatureAppearanceColors(
      source,
      { skin: "1", hair: "2", tattoo1: "0", tattoo2: "4" },
      { skin: "9", hair: "8", tattoo1: "7", tattoo2: "6" },
    )).toEqual({ skin: "9", hair: "8", tattoo1: "0", tattoo2: "6" });
  });
});
