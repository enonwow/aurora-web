import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Trigger variables", () => {
  it("keeps immutable VarTable provenance and editable target independently cloned", () => {
    const source = createNewSceneObject("triggers", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "trigger",
      sourceIndex: 0,
      sourceObjectId: "trigger:0:variables",
      triggerVariables: { expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      ] },
    };
    source.triggerVariables = [{ name: "Counter", type: "int", value: 2 }];

    const cloned = cloneSceneObject(source);
    expect(cloned.source?.triggerVariables).toEqual(source.source.triggerVariables);
    expect(cloned.source?.triggerVariables).not.toBe(source.source.triggerVariables);
    expect(cloned.source?.triggerVariables?.expectedEntries).not.toBe(
      source.source.triggerVariables.expectedEntries,
    );
    expect(cloned.triggerVariables).toEqual(source.triggerVariables);
    expect(cloned.triggerVariables).not.toBe(source.triggerVariables);
  });
});
