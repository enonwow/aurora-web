import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Placeable editor Comments", () => {
  it("preserves immutable provenance and an independent target snapshot for cancel/undo", () => {
    const source = createNewSceneObject("placeables", 1, 2, 3);
    source.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "plc:0:plc_watertrough:source",
      placeableEditorComment: "Water Trough"
    };
    source.placeableProperties = {
      ...source.placeableProperties!,
      description: "Localized gameplay description",
      comments: "Water Trough"
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.placeableEditorComment).toBe("Water Trough");
    expect(cloned.source).not.toBe(source.source);
    expect(cloned.placeableProperties).not.toBe(source.placeableProperties);
    expect(cloned.placeableProperties).toMatchObject({
      description: "Localized gameplay description",
      comments: "Water Trough"
    });
  });
});
