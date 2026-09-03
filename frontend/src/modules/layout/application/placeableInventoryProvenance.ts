import {
  ADMITTED_PLACEABLE_INVENTORY_TEMPLATE_RESREF,
  PLACEABLE_INVENTORY_COORDINATE_MAX,
  canEditExistingPlaceableInventory,
  createAdmittedPlaceableInventoryItem,
  movePlaceableInventoryEntry,
  normalizePlaceableInventoryCoordinate
} from "../../scene/domain/placeableInventory";
import type { PlaceablePropertiesDraft } from "./workspaceObjectPropertyDrafts";

export {
  ADMITTED_PLACEABLE_INVENTORY_TEMPLATE_RESREF,
  PLACEABLE_INVENTORY_COORDINATE_MAX,
  canEditExistingPlaceableInventory
};

export function appendAdmittedPlaceableInventoryItem(
  draft: PlaceablePropertiesDraft
): PlaceablePropertiesDraft {
  return {
    ...draft,
    inventoryItems: [...draft.inventoryItems, createAdmittedPlaceableInventoryItem()]
  };
}

export function updatePlaceableInventoryDraftCoordinate(
  draft: PlaceablePropertiesDraft,
  index: number,
  field: "x" | "y",
  value: number
): PlaceablePropertiesDraft {
  if (index < 0 || index >= draft.inventoryItems.length) return draft;
  const normalizedValue = normalizePlaceableInventoryCoordinate(value);
  if (draft.inventoryItems[index]?.[field] === normalizedValue) return draft;
  return {
    ...draft,
    inventoryItems: draft.inventoryItems.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, [field]: normalizedValue } : entry
    )
  };
}

export function movePlaceableInventoryDraftItem(
  draft: PlaceablePropertiesDraft,
  index: number,
  direction: "up" | "down"
): PlaceablePropertiesDraft {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (
    index < 0 ||
    index >= draft.inventoryItems.length ||
    targetIndex < 0 ||
    targetIndex >= draft.inventoryItems.length
  ) {
    return draft;
  }
  return {
    ...draft,
    inventoryItems: movePlaceableInventoryEntry(draft.inventoryItems, index, direction)
  };
}

export function removePlaceableInventoryDraftItem(
  draft: PlaceablePropertiesDraft,
  index: number
): PlaceablePropertiesDraft {
  if (index < 0 || index >= draft.inventoryItems.length) return draft;
  return {
    ...draft,
    inventoryItems: draft.inventoryItems.filter((_entry, entryIndex) => entryIndex !== index)
  };
}
