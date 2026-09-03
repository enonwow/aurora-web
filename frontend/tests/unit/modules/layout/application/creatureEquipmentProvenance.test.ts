import { describe, expect, it } from "vitest";
import {
  materializeExistingCreatureEquipment,
  removeCreatureEquipmentDraftItem,
  updateCreatureEquipmentDraftFlag
} from "../../../../../src/modules/layout/application/creatureEquipmentProvenance";
import { buildCreaturePropertiesDraft } from "../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { createNewSceneObject } from "../../../../../src/modules/scene/domain/sceneFactory";

function exactCreature() {
  const object = createNewSceneObject("creatures", 0, 0, 30);
  const sourceEntries = [
    { sourceIndex: 0, resRef: "nw_sword001", slotMask: 16, dropable: true, pickpocketable: false },
    { sourceIndex: 1, resRef: "nw_helm001", slotMask: 1, dropable: false, pickpocketable: false }
  ];
  object.source = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceObjectId: "creature:0:nw_guard:source",
    sourceIndex: 0,
    creatureEquippedItems: sourceEntries
  };
  object.creatureProperties!.equippedItems = [
    { ...sourceEntries[1]! },
    { ...sourceEntries[0]! }
  ];
  return object;
}

describe("creatureEquipmentProvenance", () => {
  it("edits only retained mode-0 flags in ACTIVE_NOW state", () => {
    const draft = buildCreaturePropertiesDraft(exactCreature());
    const updated = updateCreatureEquipmentDraftFlag(draft, 0, "pickpocketable", true);

    expect(updated.equippedItems[0]).toEqual({
      ...draft.equippedItems[0],
      pickpocketable: true
    });
    expect(updateCreatureEquipmentDraftFlag(draft, -1, "dropable", true)).toBe(draft);
    expect(updateCreatureEquipmentDraftFlag(draft, 0, "dropable", false)).toBe(draft);
  });

  it("removes retained equipment without adding or moving entries", () => {
    const draft = buildCreaturePropertiesDraft(exactCreature());
    const removed = removeCreatureEquipmentDraftItem(draft, 0);

    expect(removed.equippedItems).toEqual([draft.equippedItems[1]]);
    expect(removeCreatureEquipmentDraftItem(draft, 99)).toBe(draft);
    expect(removeCreatureEquipmentDraftItem({
      ...draft,
      equippedItemsControlState: "PRESERVE_ONLY"
    }, 0).equippedItems).toEqual(draft.equippedItems);
  });

  it("materializes a sorted exact retained target without mutating source provenance", () => {
    const object = exactCreature();
    const draft = updateCreatureEquipmentDraftFlag(
      buildCreaturePropertiesDraft(object),
      0,
      "pickpocketable",
      true
    );
    const sourceBefore = JSON.stringify(object.source);
    const target = materializeExistingCreatureEquipment(object, draft);

    expect(target).toEqual(draft.equippedItems);
    expect(target).not.toBe(draft.equippedItems);
    expect(JSON.stringify(object.source)).toBe(sourceBefore);
  });

  it("fails closed for a changed slot, reordered target, or stale source", () => {
    const object = exactCreature();
    const draft = buildCreaturePropertiesDraft(object);
    expect(materializeExistingCreatureEquipment(object, {
      ...draft,
      equippedItems: [{ ...draft.equippedItems[0]!, slotMask: 2 }]
    })).toBeNull();
    expect(materializeExistingCreatureEquipment(object, {
      ...draft,
      equippedItems: [...draft.equippedItems].reverse()
    })).toBeNull();
    object.source = { ...object.source!, creatureEquippedItems: [] };
    expect(materializeExistingCreatureEquipment(object, draft)).toBeNull();
  });
});
