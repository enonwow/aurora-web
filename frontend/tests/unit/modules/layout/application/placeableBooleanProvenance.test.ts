import { describe, expect, it } from "vitest";

import { canEditExistingPlaceableBoolean } from "../../../../../src/modules/layout/application/placeableBooleanProvenance";

describe("existing Placeable boolean provenance", () => {
  const source = {
    type: "aurora_git" as const,
    sourceKind: "placeable" as const,
    placeableStatic: false,
    placeableUseable: true,
    placeablePlot: false,
    placeableHasInventory: true
  };

  it.each([
    "isStatic",
    "useable",
    "plot",
    "hasInventory"
  ] as const)("admits exact %s provenance", (field) => {
    expect(canEditExistingPlaceableBoolean(source, field)).toBe(true);
  });

  it("rejects absent provenance and another source family", () => {
    expect(canEditExistingPlaceableBoolean({
      type: "aurora_git",
      sourceKind: "placeable"
    }, "plot")).toBe(false);
    expect(canEditExistingPlaceableBoolean({ ...source, type: "seed" }, "plot")).toBe(false);
    expect(canEditExistingPlaceableBoolean({ ...source, sourceKind: "creature" }, "plot"))
      .toBe(false);
  });
});
