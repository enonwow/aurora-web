import type {
  SceneObject,
  SceneObjectCreatureInventoryTargetEntry
} from "../../scene/contracts";
import {
  canEditExistingCreatureInventory,
  createAdmittedCreatureInventoryItem,
  moveCreatureInventoryEntry,
  normalizeCreatureInventoryCoordinate,
  readCreatureInventoryTargetEntries
} from "../../scene/domain/creatureInventory";
import type { CreaturePropertiesDraft } from "./workspaceObjectPropertyDrafts";

export { canEditExistingCreatureInventory };

export function appendAdmittedCreatureInventoryItem(
  draft: CreaturePropertiesDraft
): CreaturePropertiesDraft {
  if (draft.inventoryControlState !== "ACTIVE_NOW") return draft;
  return {
    ...draft,
    inventoryItems: [...draft.inventoryItems, createAdmittedCreatureInventoryItem()]
  };
}

export function updateCreatureInventoryDraftField(
  draft: CreaturePropertiesDraft,
  index: number,
  field: "x" | "y" | "dropable" | "pickpocketable",
  value: number | boolean
): CreaturePropertiesDraft {
  if (
    draft.inventoryControlState !== "ACTIVE_NOW" ||
    index < 0 ||
    index >= draft.inventoryItems.length
  ) {
    return draft;
  }
  const normalizedValue = field === "x" || field === "y"
    ? normalizeCreatureInventoryCoordinate(typeof value === "number" ? value : 0)
    : Boolean(value);
  if (draft.inventoryItems[index]?.[field] === normalizedValue) return draft;
  return {
    ...draft,
    inventoryItems: draft.inventoryItems.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, [field]: normalizedValue } : entry
    )
  };
}

export function moveCreatureInventoryDraftItem(
  draft: CreaturePropertiesDraft,
  index: number,
  direction: "up" | "down"
): CreaturePropertiesDraft {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (
    draft.inventoryControlState !== "ACTIVE_NOW" ||
    index < 0 ||
    index >= draft.inventoryItems.length ||
    targetIndex < 0 ||
    targetIndex >= draft.inventoryItems.length
  ) {
    return draft;
  }
  return {
    ...draft,
    inventoryItems: moveCreatureInventoryEntry(draft.inventoryItems, index, direction)
  };
}

export function removeCreatureInventoryDraftItem(
  draft: CreaturePropertiesDraft,
  index: number
): CreaturePropertiesDraft {
  if (
    draft.inventoryControlState !== "ACTIVE_NOW" ||
    index < 0 ||
    index >= draft.inventoryItems.length
  ) {
    return draft;
  }
  return {
    ...draft,
    inventoryItems: draft.inventoryItems.filter((_entry, entryIndex) => entryIndex !== index)
  };
}

export function materializeExistingCreatureInventory(
  source: SceneObject,
  draft: CreaturePropertiesDraft
): readonly SceneObjectCreatureInventoryTargetEntry[] | null {
  if (
    draft.inventoryControlState !== "ACTIVE_NOW" ||
    !canEditExistingCreatureInventory(source.source) ||
    !source.source?.creatureInventoryItems
  ) {
    return null;
  }
  const target = readCreatureInventoryTargetEntries(
    draft.inventoryItems,
    source.source.creatureInventoryItems
  );
  return target ? target.map((entry) => ({ ...entry })) : null;
}
