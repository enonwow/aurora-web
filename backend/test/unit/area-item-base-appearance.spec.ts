import {
  bindEffectiveBaseItemsTwoDaToItemBaseAppearance,
  readExistingAreaItemBaseAppearanceMutation,
  readItemBaseAppearanceRawStorage,
} from "../../src/modules/areas/domain/area-item-base-appearance";

describe("Existing Area Item BaseItem/appearance mutation", () => {
  const table = {
    descriptor: {
      resourceName: "baseitems.2da" as const,
      sourceObjectKey: "modules/current/baseitems.2da",
      sourceLayer: "module" as const,
      sha256: "a".repeat(64),
      sizeBytes: 123,
      rowCount: 4,
    },
    rows: [
      { rowIndex: 0, modelType: 0 as const, displayName: "Single" },
      { rowIndex: 1, modelType: 1 as const, displayName: "Colored" },
      { rowIndex: 2, modelType: 2 as const, displayName: "Three" },
      { rowIndex: 3, modelType: 3 as const, displayName: "Armor" },
    ],
  };
  const colors = { leather1: 1, leather2: 2, cloth1: 3, cloth2: 4, metal1: 5, metal2: 6 };
  const armorParts = {
    rFoot: 1, lFoot: 2, rShin: 3, lShin: 4, lThigh: 5, rThigh: 6,
    pelvis: 7, torso: 8, belt: 9, neck: 10, rFArm: 11, lFArm: 12,
    rBicep: 13, lBicep: 14, rShoul: 15, lShoul: 16, rHand: 17,
    lHand: 18, robe: 19,
  };

  it("binds all four exact native profiles to immutable catalog provenance", () => {
    const cases = [
      [{ baseItem: 0, appearanceFields: { modelPart1: 10 }, appearanceFieldOrder: ["modelPart1"] }, { baseItem: 0, modelType: 0, appearance: { modelPart1: 10 } }],
      [{ baseItem: 1, appearanceFields: { modelPart1: 11, ...colors }, appearanceFieldOrder: ["modelPart1", "leather1", "leather2", "cloth1", "cloth2", "metal1", "metal2"] }, { baseItem: 1, modelType: 1, appearance: { modelPart1: 11, materialColors: colors } }],
      [{ baseItem: 2, appearanceFields: { modelPart1: 12, modelPart2: 13, modelPart3: 14 }, appearanceFieldOrder: ["modelPart1", "modelPart2", "modelPart3"] }, { baseItem: 2, modelType: 2, appearance: { modelPart1: 12, modelPart2: 13, modelPart3: 14 } }],
      [{ baseItem: 3, appearanceFields: { ...armorParts, ...colors }, appearanceFieldOrder: [...Object.keys(armorParts), ...Object.keys(colors)] }, { baseItem: 3, modelType: 3, appearance: { armorParts, materialColors: colors } }],
    ] as const;
    for (const [rawInput, expectedValue] of cases) {
      const raw = readItemBaseAppearanceRawStorage(rawInput);
      expect(raw).not.toBeNull();
      expect(bindEffectiveBaseItemsTwoDaToItemBaseAppearance(raw!, table)).toEqual({
        expectedValue,
        tableSha256: "a".repeat(64),
        tableRowCount: 4,
      });
    }
  });

  it("does not bind incomplete, extra-profile, unresolved, or malformed source storage", () => {
    for (const rawInput of [
      { baseItem: 0, appearanceFields: {}, appearanceFieldOrder: [] },
      { baseItem: 0, appearanceFields: { modelPart1: 1, modelPart2: 2 }, appearanceFieldOrder: ["modelPart1", "modelPart2"] },
      { baseItem: 1, appearanceFields: { modelPart1: 1, ...colors, metal2: undefined }, appearanceFieldOrder: ["modelPart1", ...Object.keys(colors)] },
      { baseItem: 4, appearanceFields: { modelPart1: 1 }, appearanceFieldOrder: ["modelPart1"] },
    ]) {
      const raw = readItemBaseAppearanceRawStorage(rawInput);
      if (raw) expect(bindEffectiveBaseItemsTwoDaToItemBaseAppearance(raw, table)).toBeNull();
    }
    expect(readItemBaseAppearanceRawStorage({ baseItem: -1, appearanceFields: {}, appearanceFieldOrder: [] })).toBeNull();
    expect(readItemBaseAppearanceRawStorage({ baseItem: 1, appearanceFields: { modelPart1: 65536 }, appearanceFieldOrder: ["modelPart1"] })).toBeNull();
  });

  it("accepts an explicit complete cross-ModelType target and rejects malformed/no-op vectors", () => {
    const valid = {
      expectedValue: { baseItem: 0, modelType: 0, appearance: { modelPart1: 10 } },
      value: { baseItem: 3, modelType: 3, appearance: { armorParts, materialColors: colors } },
      tableSha256: "a".repeat(64),
      tableRowCount: 4,
    };
    expect(readExistingAreaItemBaseAppearanceMutation(valid)).toEqual(valid);
    expect(Object.isFrozen(readExistingAreaItemBaseAppearanceMutation(valid))).toBe(true);
    for (const candidate of [
      { ...valid, extra: true },
      { ...valid, tableSha256: "A".repeat(64) },
      { ...valid, tableRowCount: 0 },
      { ...valid, value: valid.expectedValue },
      { ...valid, value: { baseItem: 3, modelType: 3, appearance: { armorParts } } },
      { ...valid, value: { baseItem: 2, modelType: 2, appearance: { modelPart1: 1, modelPart2: 2 } } },
      { ...valid, value: { baseItem: 4, modelType: 0, appearance: { modelPart1: 1 } } },
    ]) {
      expect(readExistingAreaItemBaseAppearanceMutation(candidate)).toBeNull();
    }
  });
});
