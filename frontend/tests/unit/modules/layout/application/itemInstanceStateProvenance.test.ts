import { describe, expect, it } from "vitest";
import {
  canEditExistingItemInstanceState,
  materializeExistingItemInstanceState,
  reduceExistingItemInstanceStateField,
} from "../../../../../src/modules/layout/application/itemInstanceStateProvenance";

const values = {
  charges: 7,
  cost: 11,
  stolen: false,
  stackSize: 2,
  plot: false,
  addCost: 3,
  identified: true,
  cursed: false,
} as const;
const exactSource = {
  type: "aurora_git",
  sourceKind: "item",
  sourceIndex: 0,
  sourceObjectId: "itm:0",
  itemInstanceState: {
    presentFields: [
      "charges", "cost", "stolen", "stackSize", "plot", "addCost", "identified", "cursed",
    ],
    values,
  },
} as const;

describe("itemInstanceStateProvenance", () => {
  it("enables all eight fields only for exact retained Item provenance", () => {
    expect(canEditExistingItemInstanceState(exactSource)).toBe(true);
    expect(reduceExistingItemInstanceStateField(exactSource, "charges", 7, 255)).toBe(255);
    expect(reduceExistingItemInstanceStateField(exactSource, "plot", false, true)).toBe(true);
    expect(reduceExistingItemInstanceStateField(exactSource, "charges", 7, 256)).toBe(7);
    expect(reduceExistingItemInstanceStateField(exactSource, "plot", false, 1)).toBe(false);
  });

  it("materializes one complete validated target without changing immutable provenance", () => {
    const current = { localizedName: "Robe", ...values };
    const target = { ...values, charges: 12, stackSize: 5, cursed: true };
    expect(materializeExistingItemInstanceState(exactSource, current, target)).toEqual({
      localizedName: "Robe",
      ...target,
    });
    expect(exactSource.itemInstanceState.values).toEqual(values);
  });

  it("preserves current values without exact family, ordinal, or storage", () => {
    const current = { charges: 7, plot: false };
    for (const source of [
      undefined,
      { ...exactSource, sourceKind: "placeable" as const },
      { ...exactSource, sourceIndex: undefined },
      { ...exactSource, itemInstanceState: undefined },
    ]) {
      expect(canEditExistingItemInstanceState(source)).toBe(false);
      expect(reduceExistingItemInstanceStateField(source, "charges", 7, 12)).toBe(7);
      expect(materializeExistingItemInstanceState(source, current, values)).toBe(current);
    }
  });
});
