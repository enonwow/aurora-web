import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Placeable Conversation/Interruptable", () => {
  it("preserves immutable provenance and independently clones the editable Advanced target", () => {
    const source = createNewSceneObject("placeables", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "plc:0:plc_watertrough:source",
      placeableConversation: "",
      placeableInterruptable: 0
    };
    source.placeableProperties = {
      plot: false,
      useable: true,
      hasInventory: false,
      advancedSettings: {
        blueprintResRef: "plc_watertrough",
        belongsToFaction: "Hostile",
        conversation: "",
        noInterrupt: true,
        portraitResRef: "",
        initialState: "Default",
        treasureModel: "Default"
      }
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.placeableConversation).toBe("");
    expect(cloned.source?.placeableInterruptable).toBe(0);
    expect(cloned.placeableProperties?.advancedSettings).toEqual(
      source.placeableProperties.advancedSettings
    );
    expect(cloned.placeableProperties?.advancedSettings).not.toBe(
      source.placeableProperties.advancedSettings
    );
  });
});
