import type {
  SceneObject,
  SceneObjectCreatureEquipmentTargetEntry
} from "../../scene/contracts";
import {
  canEditExistingCreatureEquipment,
  readCreatureEquipmentTargetEntries
} from "../../scene/domain/creatureEquipment";
import type { CreaturePropertiesDraft } from "./workspaceObjectPropertyDrafts";

export { canEditExistingCreatureEquipment };

export function updateCreatureEquipmentDraftFlag(
  draft: CreaturePropertiesDraft,
  index: number,
  field: "dropable" | "pickpocketable",
  value: boolean
): CreaturePropertiesDraft {
  if (
    draft.equippedItemsControlState !== "ACTIVE_NOW" ||
    index < 0 ||
    index >= draft.equippedItems.length ||
    draft.equippedItems[index]?.[field] === value
  ) {
    return draft;
  }
  return {
    ...draft,
    equippedItems: draft.equippedItems.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, [field]: value } : entry
    )
  };
}

export function removeCreatureEquipmentDraftItem(
  draft: CreaturePropertiesDraft,
  index: number
): CreaturePropertiesDraft {
  if (
    draft.equippedItemsControlState !== "ACTIVE_NOW" ||
    index < 0 ||
    index >= draft.equippedItems.length
  ) {
    return draft;
  }
  return {
    ...draft,
    equippedItems: draft.equippedItems.filter((_entry, entryIndex) => entryIndex !== index)
  };
}

export function materializeExistingCreatureEquipment(
  source: SceneObject,
  draft: CreaturePropertiesDraft
): readonly SceneObjectCreatureEquipmentTargetEntry[] | null {
  if (
    draft.equippedItemsControlState !== "ACTIVE_NOW" ||
    !canEditExistingCreatureEquipment(source.source) ||
    !source.source?.creatureEquippedItems
  ) {
    return null;
  }
  const target = readCreatureEquipmentTargetEntries(
    draft.equippedItems,
    source.source.creatureEquippedItems
  );
  return target ? target.map((entry) => ({ ...entry })) : null;
}
