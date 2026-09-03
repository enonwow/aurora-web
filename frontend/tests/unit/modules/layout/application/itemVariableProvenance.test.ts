import { describe, expect, it } from "vitest";
import {
  appendItemVariable,
  appendExistingItemVariable,
  canEditItemVariables,
  canEditExistingItemVariables,
  materializeItemVariables,
  materializeExistingItemVariables,
  moveItemVariable,
  moveExistingItemVariable,
  removeItemVariable,
  removeExistingItemVariable,
  updateItemVariable,
  updateExistingItemVariable,
} from "../../../../../src/modules/layout/application/itemVariableProvenance";
import type { SceneObject, SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const source: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "item",
  sourceIndex: 0,
  itemVariables: {
    expectedEntries: [
      { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      { sourceIndex: 1, name: "Label", type: "string", value: "before" },
    ],
  },
};

describe("itemVariableProvenance", () => {
  const current = source.itemVariables!.expectedEntries.map(
    ({ sourceIndex: _, ...entry }) => entry,
  );

  it("admits only exact retained Item provenance", () => {
    expect(canEditExistingItemVariables(source)).toBe(true);
    expect(canEditExistingItemVariables({ ...source, sourceKind: "placeable" })).toBe(false);
    expect(canEditExistingItemVariables({ ...source, itemVariables: undefined })).toBe(false);
  });

  it("adds, validates, removes, and reorders without mutating provenance", () => {
    expect(appendExistingItemVariable(source, current)).toEqual([
      ...current,
      { name: "", type: "int", value: 0 },
    ]);
    expect(updateExistingItemVariable(source, current, 0, {
      name: "Counter", type: "int", value: 2,
    })).toEqual([{ name: "Counter", type: "int", value: 2 }, current[1]]);
    expect(removeExistingItemVariable(source, current, 0)).toEqual([current[1]]);
    expect(moveExistingItemVariable(source, current, 0, "down")).toEqual([
      current[1], current[0],
    ]);
    expect(source.itemVariables!.expectedEntries[0]!.value).toBe(1);
  });

  it("materializes only an admitted complete target", () => {
    expect(materializeExistingItemVariables(source, current, [{
      name: "Counter", type: "int", value: 3,
    }])).toEqual([{ name: "Counter", type: "int", value: 3 }]);
    expect(materializeExistingItemVariables(source, current, [{
      name: "Counter", type: "float", value: 0.1,
    }])).toEqual(current);
  });

  it("admits Item-wizard blueprints without retained provenance", () => {
    const wizard = {
      id: "itm_wizard_variables_1",
      kind: "items",
      itemProperties: { variables: current },
    } as SceneObject;

    expect(canEditItemVariables(wizard)).toBe(true);
    expect(appendItemVariable(wizard, current)).toEqual([
      ...current,
      { name: "", type: "int", value: 0 },
    ]);
    expect(updateItemVariable(wizard, current, 0, {
      name: "Counter", type: "int", value: 2,
    })).toEqual([{ name: "Counter", type: "int", value: 2 }, current[1]]);
    expect(moveItemVariable(wizard, current, 0, "down")).toEqual([current[1], current[0]]);
    expect(removeItemVariable(wizard, current, 0)).toEqual([current[1]]);
    expect(materializeItemVariables(wizard, current, [{
      name: " exact ", type: "string", value: " value ",
    }])).toEqual([{ name: " exact ", type: "string", value: " value " }]);
  });
});
