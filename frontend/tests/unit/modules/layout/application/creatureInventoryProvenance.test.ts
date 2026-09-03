import { describe, expect, it } from "vitest";
import {
  appendAdmittedCreatureInventoryItem,
  materializeExistingCreatureInventory,
  moveCreatureInventoryDraftItem,
  removeCreatureInventoryDraftItem,
  updateCreatureInventoryDraftField
} from "../../../../../src/modules/layout/application/creatureInventoryProvenance";
import { buildCreaturePropertiesDraft } from "../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { createNewSceneObject } from "../../../../../src/modules/scene/domain/sceneFactory";

function exactCreature() {
  const object = createNewSceneObject("creatures", 0, 0, 20);
  const sourceEntries = [{
    sourceIndex: 0,
    resRef: "nw_it_potion",
    x: 1,
    y: 2,
    dropable: true,
    pickpocketable: false
  }];
  object.source = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceObjectId: "creature:0:nw_chicken:source",
    sourceIndex: 0,
    creatureInventoryItems: sourceEntries
  };
  object.creatureProperties!.inventoryItems = sourceEntries.map((entry) => ({ ...entry }));
  return object;
}

describe("creatureInventoryProvenance", () => {
  it("adds only the admitted immutable mode-0 UTI in ACTIVE_NOW state", () => {
    const draft = buildCreaturePropertiesDraft(exactCreature());
    const updated = appendAdmittedCreatureInventoryItem(draft);

    expect(updated.inventoryItems).toHaveLength(2);
    expect(updated.inventoryItems[1]).toEqual({
      resRef: "nw_cloth022",
      itemResRef: "nw_cloth022",
      itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
      itemSourceFingerprint:
        "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
      x: 0,
      y: 0,
      dropable: false,
      pickpocketable: false
    });

    const preserveOnly = buildCreaturePropertiesDraft(createNewSceneObject("creatures", 0, 0, 21));
    expect(appendAdmittedCreatureInventoryItem(preserveOnly)).toBe(preserveOnly);
  });

  it("updates only bounded coordinates and mode-0 flags", () => {
    const draft = buildCreaturePropertiesDraft(exactCreature());
    const coordinate = updateCreatureInventoryDraftField(draft, 0, "x", 70_000);
    const flag = updateCreatureInventoryDraftField(coordinate, 0, "pickpocketable", true);

    expect(coordinate.inventoryItems[0]?.x).toBe(65_535);
    expect(flag.inventoryItems[0]?.pickpocketable).toBe(true);
    expect(updateCreatureInventoryDraftField(draft, -1, "x", 1)).toBe(draft);
    expect(updateCreatureInventoryDraftField(draft, 0, "x", 1)).toBe(draft);
  });

  it("reorders and removes only inside ACTIVE_NOW state", () => {
    const withTwo = appendAdmittedCreatureInventoryItem(
      buildCreaturePropertiesDraft(exactCreature())
    );
    const moved = moveCreatureInventoryDraftItem(withTwo, 0, "down");
    const removed = removeCreatureInventoryDraftItem(moved, 0);

    expect(moved.inventoryItems[0]?.resRef).toBe("nw_cloth022");
    expect(removed.inventoryItems).toEqual([withTwo.inventoryItems[0]]);
    expect(moveCreatureInventoryDraftItem(withTwo, 0, "up")).toBe(withTwo);
    expect(removeCreatureInventoryDraftItem(withTwo, 99)).toBe(withTwo);
  });

  it("materializes an exact target without changing immutable source provenance", () => {
    const object = exactCreature();
    const draft = appendAdmittedCreatureInventoryItem(buildCreaturePropertiesDraft(object));
    const sourceBefore = JSON.stringify(object.source);
    const target = materializeExistingCreatureInventory(object, draft);

    expect(target).toEqual(draft.inventoryItems);
    expect(target).not.toBe(draft.inventoryItems);
    expect(JSON.stringify(object.source)).toBe(sourceBefore);
  });

  it("fails closed for an invalid or stale target", () => {
    const object = exactCreature();
    const draft = buildCreaturePropertiesDraft(object);
    const invalid = {
      ...draft,
      inventoryItems: [{ ...draft.inventoryItems[0]!, infinite: false }]
    };
    expect(materializeExistingCreatureInventory(object, invalid)).toBeNull();
    object.source = { ...object.source!, creatureInventoryItems: [] };
    expect(materializeExistingCreatureInventory(object, draft)).toBeNull();
  });
});
