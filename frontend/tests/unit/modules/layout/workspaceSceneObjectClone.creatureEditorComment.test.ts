import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Creature editor Comments", () => {
  it("preserves immutable GIC provenance and an independent target snapshot", () => {
    const source = createNewSceneObject("creatures", 1, 2, 3);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "cre:0:nw_guard:source",
      sourceIndex: 0,
      creatureEditorComment: "  Aurora source note\r\n  ",
    };
    source.creatureProperties = {
      ...source.creatureProperties!,
      comments: "  Aurora target note\r\n  ",
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureEditorComment).toBe("  Aurora source note\r\n  ");
    expect(cloned.source).not.toBe(source.source);
    expect(cloned.creatureProperties).not.toBe(source.creatureProperties);
    expect(cloned.creatureProperties?.comments).toBe("  Aurora target note\r\n  ");
  });
});
