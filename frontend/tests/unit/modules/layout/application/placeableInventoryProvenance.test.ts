import { describe, expect, it } from "vitest";
import {
  appendAdmittedPlaceableInventoryItem,
  movePlaceableInventoryDraftItem,
  removePlaceableInventoryDraftItem,
  updatePlaceableInventoryDraftCoordinate
} from "../../../../../src/modules/layout/application/placeableInventoryProvenance";
import { buildPlaceablePropertiesDraft } from "../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { createNewSceneObject } from "../../../../../src/modules/scene/domain/sceneFactory";

function draftWithInventory(hasInventory: boolean) {
  const object = createNewSceneObject("placeables", 0, 0, 1);
  if (!object.placeableProperties) throw new Error("Expected Placeable properties");
  object.placeableProperties.hasInventory = hasInventory;
  object.placeableProperties.inventoryItems = [
    { sourceIndex: 0, resRef: "s03proofamuletr2", x: 1, y: 2 }
  ];
  return buildPlaceablePropertiesDraft(object);
}

describe("placeableInventoryProvenance draft mutations", () => {
  it("adds only the admitted UTI without changing HasInventory", () => {
    const draft = draftWithInventory(false);
    const updated = appendAdmittedPlaceableInventoryItem(draft);

    expect(updated.hasInventory).toBe(false);
    expect(updated.inventoryItems).toHaveLength(2);
    expect(updated.inventoryItems[1]).toMatchObject({
      resRef: "nw_cloth022",
      itemResRef: "nw_cloth022",
      itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
      itemSourceFingerprint:
        "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
      x: 0,
      y: 0
    });
  });

  it("updates only a bounded repository coordinate", () => {
    const draft = appendAdmittedPlaceableInventoryItem(draftWithInventory(true));
    const updated = updatePlaceableInventoryDraftCoordinate(draft, 1, "x", 70_000);

    expect(updated.inventoryItems[0]).toEqual({
      sourceIndex: 0,
      resRef: "s03proofamuletr2",
      x: 1,
      y: 2
    });
    expect(updated.inventoryItems[1]?.x).toBe(65_535);
    expect(updated.hasInventory).toBe(true);
    expect(updatePlaceableInventoryDraftCoordinate(draft, 0, "y", 9).inventoryItems[0]?.y).toBe(
      9
    );
    expect(updatePlaceableInventoryDraftCoordinate(draft, -1, "x", 3)).toBe(draft);
    expect(
      updatePlaceableInventoryDraftCoordinate(draft, draft.inventoryItems.length, "x", 3)
    ).toBe(draft);
    expect(updatePlaceableInventoryDraftCoordinate(draft, 0, "x", 1)).toBe(draft);
  });

  it("reorders and removes entries without coupling list cardinality to HasInventory", () => {
    const withTwo = appendAdmittedPlaceableInventoryItem(draftWithInventory(true));
    const moved = movePlaceableInventoryDraftItem(withTwo, 0, "down");
    const removedOnce = removePlaceableInventoryDraftItem(moved, 0);
    const removedAll = removePlaceableInventoryDraftItem(removedOnce, 0);

    expect(moved.inventoryItems[0]?.resRef).toBe("nw_cloth022");
    expect(removedAll.inventoryItems).toEqual([]);
    expect(removedAll.hasInventory).toBe(true);
    expect(movePlaceableInventoryDraftItem(withTwo, 0, "up")).toBe(withTwo);
    expect(movePlaceableInventoryDraftItem(withTwo, 1, "up").inventoryItems[0]?.resRef).toBe(
      "nw_cloth022"
    );
    expect(movePlaceableInventoryDraftItem(withTwo, -1, "down")).toBe(withTwo);
    expect(movePlaceableInventoryDraftItem(withTwo, withTwo.inventoryItems.length, "up")).toBe(
      withTwo
    );
    expect(movePlaceableInventoryDraftItem(withTwo, 1, "down")).toBe(withTwo);
    expect(removePlaceableInventoryDraftItem(withTwo, 1).inventoryItems).toEqual([
      { sourceIndex: 0, resRef: "s03proofamuletr2", x: 1, y: 2 }
    ]);
    expect(removePlaceableInventoryDraftItem(withTwo, -1)).toBe(withTwo);
    expect(removePlaceableInventoryDraftItem(withTwo, withTwo.inventoryItems.length)).toBe(
      withTwo
    );
    expect(removePlaceableInventoryDraftItem(withTwo, 9)).toBe(withTwo);
  });
});
