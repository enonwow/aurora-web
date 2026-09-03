import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Creature variables", () => {
  it("keeps immutable VarTable provenance and the editable target independently cloned", () => {
    const source = createNewSceneObject("creatures", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "cre:0:variables",
      creatureVariables: { expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      ] },
    };
    source.creatureProperties = {
      variables: [{ name: "Counter", type: "int", value: 2 }],
    };

    const cloned = cloneSceneObject(source);
    expect(cloned.source?.creatureVariables).toEqual(source.source.creatureVariables);
    expect(cloned.source?.creatureVariables).not.toBe(source.source.creatureVariables);
    expect(cloned.source?.creatureVariables?.expectedEntries).not.toBe(
      source.source.creatureVariables.expectedEntries,
    );
    expect(cloned.creatureProperties?.variables).toEqual(source.creatureProperties.variables);
    expect(cloned.creatureProperties?.variables).not.toBe(source.creatureProperties.variables);
  });
});
