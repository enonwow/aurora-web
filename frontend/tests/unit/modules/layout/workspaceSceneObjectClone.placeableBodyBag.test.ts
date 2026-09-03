import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Placeable BodyBag", () => {
  it("preserves immutable table provenance and independently clones the numeric Advanced target", () => {
    const source = createNewSceneObject("placeables", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "plc:0:plc_chest:source",
      placeableBodyBag: {
        expectedValue: 3,
        tableSha256: "e".repeat(64),
        tableRowCount: 7,
      },
    };
    source.placeableProperties!.advancedSettings = { treasureModelRow: 3 };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.placeableBodyBag).toEqual(source.source.placeableBodyBag);
    expect(cloned.source?.placeableBodyBag).not.toBe(source.source.placeableBodyBag);
    expect(cloned.placeableProperties?.advancedSettings).toEqual({ treasureModelRow: 3 });
    expect(cloned.placeableProperties?.advancedSettings).not.toBe(
      source.placeableProperties.advancedSettings,
    );
  });
});
