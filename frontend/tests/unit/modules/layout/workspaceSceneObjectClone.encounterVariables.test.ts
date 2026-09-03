import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Encounter variables", () => {
  it("keeps immutable VarTable provenance and the editable target independently cloned", () => {
    const source = createNewSceneObject("encounters", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "encounter",
      sourceObjectId: "enc:0:variables",
      encounterVariables: { expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      ] },
    };
    source.encounterProperties = {
      variables: [{ name: "Counter", type: "int", value: 2 }],
    };

    const cloned = cloneSceneObject(source);
    expect(cloned.source?.encounterVariables).toEqual(source.source.encounterVariables);
    expect(cloned.source?.encounterVariables).not.toBe(source.source.encounterVariables);
    expect(cloned.source?.encounterVariables?.expectedEntries).not.toBe(
      source.source.encounterVariables.expectedEntries,
    );
    expect(cloned.encounterProperties?.variables).toEqual(source.encounterProperties.variables);
    expect(cloned.encounterProperties?.variables).not.toBe(source.encounterProperties.variables);
  });
});
