import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject ground-Item variables", () => {
  it("clones immutable provenance and editable target independently", () => {
    const source = createNewSceneObject("items", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:variables",
      itemVariables: { expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      ] },
    };
    source.itemProperties = {
      variables: [{ name: "Counter", type: "int", value: 2 }],
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.itemVariables).toEqual(source.source.itemVariables);
    expect(cloned.source?.itemVariables).not.toBe(source.source.itemVariables);
    expect(cloned.source?.itemVariables?.expectedEntries)
      .not.toBe(source.source.itemVariables.expectedEntries);
    expect(cloned.itemProperties?.variables).toEqual(source.itemProperties.variables);
    expect(cloned.itemProperties?.variables).not.toBe(source.itemProperties.variables);
  });
});
