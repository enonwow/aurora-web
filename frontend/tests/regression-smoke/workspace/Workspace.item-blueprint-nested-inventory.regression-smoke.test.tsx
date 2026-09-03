import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildItemPropertiesDraft } from
  "../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { ItemPropertiesDialog } from
  "../../../src/modules/layout/components/properties/ItemPropertiesDialog";
import { createNewSceneObject } from
  "../../../src/modules/scene/domain/sceneFactory";

function renderWizard(resRef: string) {
  const item = createNewSceneObject("items", 2, 3, 1);
  item.id = "itm_wizard_nested_inventory_1";
  item.resRef = "nested_bag";
  item.itemProperties = {
    ...item.itemProperties,
    localizedName: "Nested Bag",
    baseItem: 16,
    blueprintInventoryItems: [{ resRef, x: 3, y: 4 }],
    blueprintEquippedItems: [{ resRef: "itm_ring", slotMask: 4 }],
  };
  render(<ItemPropertiesDialog
    itemPropertiesDialog={{
      objectId: item.id,
      snapshotObject: item,
      draft: buildItemPropertiesDraft(item),
      activeTab: "properties",
      windowX: 20,
      windowY: 20,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      collapsed: false,
    }}
    toggleItemPropertiesDialogCollapsed={vi.fn()}
    cancelItemPropertiesDialog={vi.fn()}
    setItemPropertiesActiveTab={vi.fn()}
    updateItemPropertiesDraftField={vi.fn()}
    updateItemArmorContextDraftField={vi.fn()}
    updateItemArmorPartDraftField={vi.fn()}
    updateItemMaterialColorDraftField={vi.fn()}
    addItemPropertyEntry={vi.fn()}
    updateItemPropertyEntry={vi.fn()}
    moveItemPropertyEntry={vi.fn()}
    removeItemPropertyEntry={vi.fn()}
    updateItemInventoryCoordinate={vi.fn()}
    moveItemInventoryEntry={vi.fn()}
    removeItemInventoryEntry={vi.fn()}
    itemInventoryBlueprintOptions={[]}
    addItemInventoryBlueprintEntry={vi.fn()}
    addItemBlueprintInventoryEntry={vi.fn()}
    updateItemBlueprintInventoryEntry={vi.fn()}
    moveItemBlueprintInventoryEntry={vi.fn()}
    removeItemBlueprintInventoryEntry={vi.fn()}
    addItemBlueprintEquipmentEntry={vi.fn()}
    updateItemBlueprintEquipmentEntry={vi.fn()}
    removeItemBlueprintEquipmentEntry={vi.fn()}
    addItemVariable={vi.fn()}
    updateItemVariable={vi.fn()}
    moveItemVariable={vi.fn()}
    removeItemVariable={vi.fn()}
    applyItemPropertiesDraft={vi.fn()}
  />);
}

describe("Regression smoke: Item-wizard nested UTI references", () => {
  it("keeps both native reference lists active and publication-enabled when exact", () => {
    renderWizard("itm_potion");

    expect(screen.getByText("ItemList: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Equip_ItemList: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "OK" })).toBeEnabled();
  });

  it("blocks publication instead of normalizing an invalid reference", () => {
    renderWizard("ITM_UPPER");

    expect(screen.getByText("INCOMPLETE_BLUEPRINT_REFERENCE_TARGET")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });
});
