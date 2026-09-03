import { describe, expect, it } from "vitest";

import {
  bindItemBaseAppearanceProvenanceToCatalog,
  buildItemBaseAppearanceTarget,
  readItemBaseAppearanceProvenance,
  readItemBaseAppearanceValue,
  readItemBaseItemCatalog,
} from "../../../../../src/modules/scene/domain/itemBaseAppearance";

const armorParts = {
  rFoot: 1, lFoot: 2, rShin: 3, lShin: 4, lThigh: 5, rThigh: 6,
  pelvis: 7, torso: 8, belt: 9, neck: 10, rFArm: 11, lFArm: 12,
  rBicep: 13, lBicep: 14, rShoul: 15, lShoul: 16, rHand: 17,
  lHand: 18, robe: 19,
} as const;
const materialColors = {
  leather1: 1, leather2: 2, cloth1: 3, cloth2: 4, metal1: 5, metal2: 6,
} as const;

function catalog() {
  return {
    descriptor: {
      resourceName: "baseitems.2da",
      sourceObjectKey: "modules/current/baseitems.2da",
      sourceLayer: "module",
      sha256: "b".repeat(64),
      sizeBytes: 4096,
      rowCount: 4,
    },
    rows: [
      { rowIndex: 0, label: "simple", modelType: 0, displayName: "Simple" },
      { rowIndex: 1, nameStrRef: 101, modelType: 1, itemClass: "AShSw", displayName: "Layered" },
      { rowIndex: 2, label: "weapon", modelType: 2, itemClass: "WSwLs", displayName: "Weapon" },
      { rowIndex: 3, label: "armor", modelType: 3, itemClass: "AARM", displayName: "Armor" },
    ],
  } as const;
}

describe("ground-Item BaseItem/appearance domain", () => {
  it("admits and detaches one exact effective baseitems.2da catalog", () => {
    const source = catalog();
    const admitted = readItemBaseItemCatalog(source);

    expect(admitted).toEqual(source);
    expect(admitted).not.toBe(source);
    expect(admitted?.rows).not.toBe(source.rows);
    expect(Object.isFrozen(admitted)).toBe(true);
  });

  it.each([
    [0, { modelPart1: 66 }],
    [1, { modelPart1: 7, materialColors }],
    [2, { modelPart1: 7, modelPart2: 8, modelPart3: 9 }],
    [3, { armorParts, materialColors }],
  ] as const)("admits the complete exact ModelType %s profile", (modelType, appearance) => {
    expect(readItemBaseAppearanceValue({
      baseItem: modelType,
      modelType,
      appearance,
    })).toEqual({ baseItem: modelType, modelType, appearance });
  });

  it("fails closed for partial, extra-key, out-of-range, stale, or row-incoherent data", () => {
    expect(readItemBaseAppearanceValue({
      baseItem: 3,
      modelType: 3,
      appearance: { armorParts: { torso: 8 }, materialColors },
    })).toBeNull();
    expect(readItemBaseAppearanceValue({
      baseItem: 0,
      modelType: 0,
      appearance: { modelPart1: 66, extra: true },
    })).toBeNull();
    expect(readItemBaseAppearanceValue({
      baseItem: 1,
      modelType: 1,
      appearance: { modelPart1: 7, materialColors: { ...materialColors, leather1: 256 } },
    })).toBeNull();

    const provenance = {
      expectedValue: { baseItem: 0, modelType: 0, appearance: { modelPart1: 66 } },
      tableSha256: "b".repeat(64),
      tableRowCount: 4,
    } as const;
    expect(readItemBaseAppearanceProvenance(provenance)).toEqual(provenance);
    expect(bindItemBaseAppearanceProvenanceToCatalog(provenance, catalog()))
      .toEqual(provenance);
    expect(bindItemBaseAppearanceProvenanceToCatalog(
      { ...provenance, tableSha256: "c".repeat(64) },
      catalog(),
    )).toBeNull();
    expect(bindItemBaseAppearanceProvenanceToCatalog({
      ...provenance,
      expectedValue: { baseItem: 0, modelType: 2, appearance: {
        modelPart1: 1, modelPart2: 2, modelPart3: 3,
      } },
    }, catalog())).toBeNull();
  });

  it("builds only a complete target selected by the effective row ModelType", () => {
    expect(buildItemBaseAppearanceTarget({
      baseItem: 2,
      modelPart1: 10,
      modelPart2: 11,
      modelPart3: 12,
      armorParts: {},
      materialColors: {},
    }, catalog())).toEqual({
      baseItem: 2,
      modelType: 2,
      appearance: { modelPart1: 10, modelPart2: 11, modelPart3: 12 },
    });
    expect(buildItemBaseAppearanceTarget({
      baseItem: 3,
      armorParts: { torso: 8 },
      materialColors,
    }, catalog())).toBeNull();
  });
});
