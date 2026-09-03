import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Placeable variables", () => {
  it("keeps immutable VarTable provenance and the editable target independently cloned", () => {
    const source = createNewSceneObject("placeables", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "plc:0:variables",
      placeableVariables: { expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      ] },
    };
    source.placeableProperties = {
      plot: false,
      useable: true,
      hasInventory: false,
      variables: [{ name: "Counter", type: "int", value: 2 }],
    };

    const cloned = cloneSceneObject(source);
    expect(cloned.source?.placeableVariables).toEqual(source.source.placeableVariables);
    expect(cloned.source?.placeableVariables).not.toBe(source.source.placeableVariables);
    expect(cloned.source?.placeableVariables?.expectedEntries).not.toBe(
      source.source.placeableVariables.expectedEntries,
    );
    expect(cloned.placeableProperties?.variables).toEqual(source.placeableProperties.variables);
    expect(cloned.placeableProperties?.variables).not.toBe(source.placeableProperties.variables);
  });
});
