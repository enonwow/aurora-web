import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspace Trigger editor Comment cloning", () => {
  it("preserves immutable paired-GIC provenance and an independent target snapshot", () => {
    const source = createNewSceneObject("triggers", 1, 2, 3);
    source.source = {
      type: "aurora_git",
      sourceKind: "trigger",
      sourceObjectId: "trigger:0:newgeneric:source",
      sourceIndex: 0,
      triggerEditorComment: "  Aurora source note\r\n  ",
    };
    source.triggerEditorComment = "  Aurora target note\r\n  ";

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.triggerEditorComment).toBe("  Aurora source note\r\n  ");
    expect(cloned.source).not.toBe(source.source);
    expect(cloned.triggerEditorComment).toBe("  Aurora target note\r\n  ");
  });
});
