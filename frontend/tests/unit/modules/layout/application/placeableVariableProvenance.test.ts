import { describe, expect, it } from "vitest";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";
import {
  appendExistingPlaceableVariable,
  canEditExistingPlaceableVariables,
  materializeExistingPlaceableVariables,
  moveExistingPlaceableVariable,
  removeExistingPlaceableVariable,
  updateExistingPlaceableVariable,
} from "../../../../../src/modules/layout/application/placeableVariableProvenance";

describe("placeableVariableProvenance", () => {
  const source: SceneObjectSourceMetadata = {
    type: "aurora_git",
    sourceKind: "placeable",
    placeableVariables: { expectedEntries: [
      { sourceIndex: 0, name: "a", type: "int", value: 1 },
      { sourceIndex: 1, name: "b", type: "string", value: "two" },
    ] },
  };
  const current = [
    { name: "a", type: "int" as const, value: 1 },
    { name: "b", type: "string" as const, value: "two" },
  ];

  it("admits only exact existing Aurora GIT Placeable provenance", () => {
    expect(canEditExistingPlaceableVariables(source)).toBe(true);
    expect(canEditExistingPlaceableVariables({ ...source, sourceKind: "door" })).toBe(false);
    expect(canEditExistingPlaceableVariables({ ...source, placeableVariables: {
      expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 0 }],
    } })).toBe(false);
  });

  it("supports add, edit, remove and physical reorder without mutating the current list", () => {
    const added = appendExistingPlaceableVariable(source, current);
    expect(added).toHaveLength(3);
    expect(current).toHaveLength(2);
    expect(updateExistingPlaceableVariable(source, current, 0, {
      name: "a", type: "int", value: -3,
    })[0]).toEqual({ name: "a", type: "int", value: -3 });
    expect(removeExistingPlaceableVariable(source, current, 0)).toEqual([current[1]]);
    expect(moveExistingPlaceableVariable(source, current, 0, "down")).toEqual([current[1], current[0]]);
  });

  it("materializes only a complete valid candidate and preserves unproven state", () => {
    expect(materializeExistingPlaceableVariables(source, current, [
      { name: "x", type: "float", value: 1.5 },
    ])).toEqual([{ name: "x", type: "float", value: 1.5 }]);
    expect(materializeExistingPlaceableVariables(source, current, [
      { name: "x", type: "float", value: 0.1 },
    ])).toEqual(current);
    expect(materializeExistingPlaceableVariables(undefined, current, [])).toEqual(current);
  });
});
