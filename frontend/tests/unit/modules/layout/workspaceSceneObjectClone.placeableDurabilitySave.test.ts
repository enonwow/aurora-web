import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Placeable durability/save Bytes", () => {
  it("independently clones immutable provenance and preserves editable targets", () => {
    const source = createNewSceneObject("placeables", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "plc:0:plc_flrlever1:source",
      placeableDurabilitySaveBytes: {
        hardness: 5,
        fortitudeSave: 16,
        reflexSave: 0,
        willSave: 0
      }
    };
    source.placeableProperties = {
      plot: false,
      useable: true,
      hasInventory: false,
      hardness: 5,
      fortitudeSave: 16,
      reflexSave: 0,
      willSave: 0
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.placeableDurabilitySaveBytes).toEqual(
      source.source.placeableDurabilitySaveBytes
    );
    expect(cloned.source?.placeableDurabilitySaveBytes).not.toBe(
      source.source.placeableDurabilitySaveBytes
    );
    expect(cloned.placeableProperties).toMatchObject({
      hardness: 5,
      fortitudeSave: 16,
      reflexSave: 0,
      willSave: 0
    });
  });
});
