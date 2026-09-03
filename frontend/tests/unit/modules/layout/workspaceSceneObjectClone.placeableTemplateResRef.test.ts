import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Placeable TemplateResRef", () => {
  it("preserves immutable provenance, renderer identity, and an independent Advanced snapshot", () => {
    const source = createNewSceneObject("placeables", 1, 2, 1);
    source.resRef = "renderer_identity";
    source.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "plc:0:source",
      placeableTemplateResRef: "plc_chest",
    };
    source.placeableProperties!.advancedSettings = {
      blueprintResRef: "plc_chest",
      conversation: "old_conv",
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.resRef).toBe("renderer_identity");
    expect(cloned.source?.placeableTemplateResRef).toBe("plc_chest");
    expect(cloned.placeableProperties?.advancedSettings).toEqual({
      blueprintResRef: "plc_chest",
      conversation: "old_conv",
    });
    expect(cloned.placeableProperties?.advancedSettings)
      .not.toBe(source.placeableProperties?.advancedSettings);
  });
});
