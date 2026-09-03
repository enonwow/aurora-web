import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Placeable AnimationState", () => {
  it("preserves immutable provenance and independently clones the Advanced target for cancel/undo", () => {
    const source = createNewSceneObject("placeables", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "plc:0:plc_watertrough:source",
      placeableAnimationState: 0
    };
    source.placeableProperties!.advancedSettings = {
      initialState: "Closed"
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.placeableAnimationState).toBe(0);
    expect(cloned.placeableProperties?.advancedSettings).toEqual({ initialState: "Closed" });
    expect(cloned.placeableProperties?.advancedSettings).not.toBe(
      source.placeableProperties.advancedSettings
    );
  });
});
