import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Placeable inventory", () => {
  it("keeps immutable ItemList provenance and the editable target independently cloned", () => {
    const source = createNewSceneObject("placeables", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "plc:0:plc_flrlever1:source",
      placeableInventoryItems: [
        { sourceIndex: 0, resRef: "s03proofamuletr2", x: 3, y: 4 }
      ]
    };
    source.placeableProperties = {
      plot: false,
      useable: true,
      hasInventory: false,
      inventoryItems: [
        { sourceIndex: 0, resRef: "s03proofamuletr2", x: 3, y: 4 }
      ]
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.placeableInventoryItems).toEqual(
      source.source.placeableInventoryItems
    );
    expect(cloned.source?.placeableInventoryItems).not.toBe(
      source.source.placeableInventoryItems
    );
    expect(cloned.source?.placeableInventoryItems?.[0]).not.toBe(
      source.source.placeableInventoryItems?.[0]
    );
    expect(cloned.placeableProperties?.inventoryItems).toEqual(
      source.placeableProperties.inventoryItems
    );
    expect(cloned.placeableProperties?.inventoryItems).not.toBe(
      source.placeableProperties.inventoryItems
    );
  });
});
