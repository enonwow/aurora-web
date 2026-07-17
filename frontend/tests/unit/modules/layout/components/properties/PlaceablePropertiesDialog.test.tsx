import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildPlaceablePropertiesDraft } from "../../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { PlaceablePropertiesDialog } from "../../../../../../src/modules/layout/components/properties/PlaceablePropertiesDialog";
import { createNewSceneObject } from "../../../../../../src/modules/scene/domain/sceneFactory";

function renderInventoryDialog(options?: { includeEmbeddedItem?: boolean }) {
  const placeableObject = createNewSceneObject("placeables", 1, 2, 3);
  if (!placeableObject.placeableProperties) {
    throw new Error("Expected placeable defaults");
  }
  placeableObject.placeableProperties = {
    ...placeableObject.placeableProperties,
    hasInventory: true,
    inventoryItems: [
      {
        resRef: "nw_it_mpotion001",
        randomResRef: "rnd_potion",
        randomList: "rl_potions",
        itemResRef: "nw_it_mpotion001",
        x: 3,
        y: 4,
        dropable: true,
        pickpocketable: false,
        infinite: false
      },
      ...(options?.includeEmbeddedItem
        ? [
            {
              embeddedItem: {
                sourceStructTypeId: 4294967295,
                templateResRef: "emb_chest_ring",
                tag: "EMB_CHEST_RING",
                localizedName: "Embedded Ring",
                baseItem: 52,
                itemPropertyListCount: 1,
                fieldCount: 5
              },
              x: 7,
              y: 8,
              dropable: true,
              pickpocketable: false,
              infinite: true
            }
          ]
        : [])
    ]
  };

  const handlers = {
    addPlaceableInventoryItem: vi.fn(),
    updatePlaceableInventoryItem: vi.fn(),
    removePlaceableInventoryItem: vi.fn()
  };

  render(
    <PlaceablePropertiesDialog
      placeablePropertiesDialog={{
        objectId: placeableObject.id,
        snapshotObject: placeableObject,
        draft: buildPlaceablePropertiesDraft(placeableObject),
        activeTab: "inventory",
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false
      }}
      togglePlaceablePropertiesDialogCollapsed={vi.fn()}
      cancelPlaceablePropertiesDialog={vi.fn()}
      setPlaceablePropertiesActiveTab={vi.fn()}
      updatePlaceablePropertiesDraftField={vi.fn()}
      updatePlaceableScriptSlotDraftField={vi.fn()}
      updatePlaceableDisabledFlagDraftField={vi.fn()}
      updatePlaceableLockDraftField={vi.fn()}
      updatePlaceableTrapDraftField={vi.fn()}
      updatePlaceableAdvancedDraftField={vi.fn()}
      applyPlaceablePropertiesDraft={vi.fn()}
      {...handlers}
    />
  );

  return handlers;
}

describe("PlaceablePropertiesDialog", () => {
  it("edits decompiled UTP ItemList entries", () => {
    const handlers = renderInventoryDialog();

    fireEvent.click(screen.getByRole("button", { name: /add itemlist entry/i }));
    expect(handlers.addPlaceableInventoryItem).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Placeable inventory item 1 resref"), {
      target: { value: "nw_it_mneck021" }
    });
    expect(screen.getByLabelText("Placeable inventory item 1 random resref")).toHaveValue(
      "rnd_potion"
    );
    expect(screen.getByLabelText("Placeable inventory item 1 random list")).toHaveValue(
      "rl_potions"
    );
    fireEvent.change(screen.getByLabelText("Placeable inventory item 1 random resref"), {
      target: { value: "rnd_neck" }
    });
    fireEvent.change(screen.getByLabelText("Placeable inventory item 1 random list"), {
      target: { value: "rl_necks" }
    });
    fireEvent.change(screen.getByLabelText(/placeable inventory item 1 repo x/i), {
      target: { value: "7" }
    });
    fireEvent.click(screen.getByLabelText(/placeable inventory item 1 dropable/i));
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));

    expect(handlers.updatePlaceableInventoryItem).toHaveBeenCalledWith(
      0,
      "resRef",
      "nw_it_mneck021"
    );
    expect(handlers.updatePlaceableInventoryItem).toHaveBeenCalledWith(
      0,
      "randomResRef",
      "rnd_neck"
    );
    expect(handlers.updatePlaceableInventoryItem).toHaveBeenCalledWith(
      0,
      "randomList",
      "rl_necks"
    );
    expect(handlers.updatePlaceableInventoryItem).toHaveBeenCalledWith(0, "x", 7);
    expect(handlers.updatePlaceableInventoryItem).toHaveBeenCalledWith(
      0,
      "dropable",
      false
    );
    expect(handlers.removePlaceableInventoryItem).toHaveBeenCalledWith(0);
  });

  it("labels embedded Item structs in placeable inventory rows", () => {
    renderInventoryDialog({ includeEmbeddedItem: true });

    expect(
      screen.getByText("Embedded emb_chest_ring (Embedded Ring, Base 52, 1 props)")
    ).toBeInTheDocument();
  });
});
