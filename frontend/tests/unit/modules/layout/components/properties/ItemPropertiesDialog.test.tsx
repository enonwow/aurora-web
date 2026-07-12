import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  buildItemPropertiesDraft,
  type ItemPropertiesTab
} from "../../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { ItemPropertiesDialog } from "../../../../../../src/modules/layout/components/properties/ItemPropertiesDialog";
import type { SceneObject } from "../../../../../../src/modules/scene/contracts";
import { createNewSceneObject } from "../../../../../../src/modules/scene/domain/sceneFactory";

function createItemObject(): SceneObject {
  return {
    ...createNewSceneObject("items", 2, 3, 9),
    id: "itm_custom_hide_armor_009",
    name: "Hide Armor",
    tag: "NW_AARCLO08",
    resRef: "aaarcl008",
    itemProperties: {
      localizedName: "Custom Hide Armor",
      localizedNameStrRef: 12840,
      description: "Description",
      descriptionStrRef: 2001,
      identifiedDescription: "Identified",
      identifiedDescriptionStrRef: 2002,
      comments: "Comments",
      paletteId: 3,
      baseItem: 16,
      baseItemEquipableSlots: "0x2",
      baseItemInvSlotWidth: 2,
      baseItemInvSlotHeight: 3,
      modelPart1: 66,
      modelPart2: 0,
      modelPart3: 0,
      cloakModelRow: 8,
      cloakModel: 12,
      cloakTexture: 34,
      cloakIcon: 56,
      cloakModelResRef: "cloak_model",
      cloakTextureResRef: "cloak_tex",
      cloakIconResRef: "cloak_icon",
      armorPreviewContext: {
        modelPrefix: "pmh0",
        label: "male human",
        gender: 1,
        phenotype: 2,
        raceModel: "p_hhm"
      },
      armorParts: {
        torso: 43,
        pelvis: 8
      },
      materialColors: {
        leather1: 5,
        metal1: 17
      },
      cost: 19463,
      charges: 1,
      stackSize: 1,
      identified: true,
      propertyList: [
        {
          propertyName: 1,
          propertyLabel: "AC Bonus",
          subtype: 2,
          costTable: 3,
          costValue: 4,
          param1: 255,
          param1Value: 0,
          chanceAppear: 100
        }
      ],
      scripts: {
        onAcquire: "nw_i0_acquire"
      }
    }
  };
}

function renderItemDialog(activeTab: ItemPropertiesTab = "basic") {
  const item = createItemObject();
  const handlers = {
    toggleItemPropertiesDialogCollapsed: vi.fn(),
    cancelItemPropertiesDialog: vi.fn(),
    setItemPropertiesActiveTab: vi.fn(),
    updateItemPropertiesDraftField: vi.fn(),
    updateItemArmorContextDraftField: vi.fn(),
    updateItemArmorPartDraftField: vi.fn(),
    updateItemMaterialColorDraftField: vi.fn(),
    addItemPropertyEntry: vi.fn(),
    updateItemPropertyEntry: vi.fn(),
    removeItemPropertyEntry: vi.fn(),
    addItemScriptEntry: vi.fn(),
    updateItemScriptEntry: vi.fn(),
    removeItemScriptEntry: vi.fn(),
    applyItemPropertiesDraft: vi.fn()
  };

  render(
    <ItemPropertiesDialog
      itemPropertiesDialog={{
        objectId: item.id,
        snapshotObject: item,
        draft: buildItemPropertiesDraft(item),
        activeTab,
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false
      }}
      {...handlers}
    />
  );

  return handlers;
}

describe("ItemPropertiesDialog", () => {
  it("edits UTI identity, cost, stack and flags", () => {
    const handlers = renderItemDialog("basic");

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Custom Armor" }
    });
    fireEvent.change(screen.getByLabelText("Name StrRef"), {
      target: { value: "12841" }
    });
    fireEvent.change(screen.getByLabelText("Cost"), {
      target: { value: "20000" }
    });
    fireEvent.click(screen.getByLabelText("Plot"));
    fireEvent.click(screen.getByRole("button", { name: "Visual" }));

    expect(handlers.updateItemPropertiesDraftField).toHaveBeenCalledWith(
      "name",
      "Custom Armor"
    );
    expect(handlers.updateItemPropertiesDraftField).toHaveBeenCalledWith(
      "localizedNameStrRef",
      12841
    );
    expect(handlers.updateItemPropertiesDraftField).toHaveBeenCalledWith("cost", 20000);
    expect(handlers.updateItemPropertiesDraftField).toHaveBeenCalledWith("plot", true);
    expect(handlers.setItemPropertiesActiveTab).toHaveBeenCalledWith("visual");
  });

  it("edits localized description string references", () => {
    const handlers = renderItemDialog("comments");

    fireEvent.change(screen.getByLabelText("Description StrRef"), {
      target: { value: "2003" }
    });
    fireEvent.change(screen.getByLabelText("Identified StrRef"), {
      target: { value: "2004" }
    });

    expect(handlers.updateItemPropertiesDraftField).toHaveBeenCalledWith(
      "descriptionStrRef",
      2003
    );
    expect(handlers.updateItemPropertiesDraftField).toHaveBeenCalledWith(
      "identifiedDescriptionStrRef",
      2004
    );
  });

  it("edits model parts, armor context and armor slot parts", () => {
    const handlers = renderItemDialog("visual");

    fireEvent.change(screen.getByLabelText("Part 1"), {
      target: { value: "77" }
    });
    fireEvent.change(screen.getByLabelText("Prefix"), {
      target: { value: "pfh0" }
    });
    fireEvent.change(screen.getByLabelText("Torso"), {
      target: { value: "44" }
    });

    expect(handlers.updateItemPropertiesDraftField).toHaveBeenCalledWith("modelPart1", 77);
    expect(handlers.updateItemArmorContextDraftField).toHaveBeenCalledWith(
      "modelPrefix",
      "pfh0"
    );
    expect(handlers.updateItemArmorPartDraftField).toHaveBeenCalledWith("torso", 44);
  });

  it("keeps cloak derived model fields read-only while Model Row stays editable", () => {
    const handlers = renderItemDialog("visual");

    fireEvent.change(screen.getByLabelText("Model Row"), {
      target: { value: "9" }
    });

    expect(screen.getByLabelText("Model")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Texture")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Icon")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Model ResRef")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Texture ResRef")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Icon ResRef")).toHaveAttribute("readonly");
    expect(handlers.updateItemPropertiesDraftField).toHaveBeenCalledWith("cloakModelRow", 9);
  });

  it("edits material colors", () => {
    const handlers = renderItemDialog("colors");

    fireEvent.change(screen.getByLabelText("Leather 1"), {
      target: { value: "9" }
    });

    expect(handlers.updateItemMaterialColorDraftField).toHaveBeenCalledWith("leather1", 9);
  });

  it("edits ItemPropertyList entries", () => {
    const handlers = renderItemDialog("properties");

    fireEvent.click(screen.getByRole("button", { name: /add property/i }));
    fireEvent.change(screen.getByLabelText("Item property 1 label"), {
      target: { value: "Keen" }
    });
    fireEvent.change(screen.getByLabelText("Item property 1 property"), {
      target: { value: "43" }
    });
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));

    expect(handlers.addItemPropertyEntry).toHaveBeenCalledTimes(1);
    expect(handlers.updateItemPropertyEntry).toHaveBeenCalledWith(
      0,
      "propertyLabel",
      "Keen"
    );
    expect(handlers.updateItemPropertyEntry).toHaveBeenCalledWith(0, "propertyName", 43);
    expect(handlers.removeItemPropertyEntry).toHaveBeenCalledWith(0);
  });

  it("edits arbitrary item script slots", () => {
    const handlers = renderItemDialog("scripts");

    fireEvent.click(screen.getByRole("button", { name: /add script/i }));
    fireEvent.change(screen.getByLabelText("Item script 1 slot"), {
      target: { value: " onEquipped " }
    });
    fireEvent.change(screen.getByLabelText("Item script 1 value"), {
      target: { value: "nw_i0_equipped" }
    });
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));

    expect(handlers.addItemScriptEntry).toHaveBeenCalledTimes(1);
    expect(handlers.updateItemScriptEntry).toHaveBeenCalledWith(
      "onAcquire",
      "onEquipped",
      "nw_i0_acquire"
    );
    expect(handlers.updateItemScriptEntry).toHaveBeenCalledWith(
      "onAcquire",
      "onAcquire",
      "nw_i0_equipped"
    );
    expect(handlers.removeItemScriptEntry).toHaveBeenCalledWith("onAcquire");
  });

  it("normalizes item script labels and ResRefs to Aurora's 16-character limit", () => {
    const handlers = renderItemDialog("scripts");

    fireEvent.change(screen.getByLabelText("Item script 1 slot"), {
      target: { value: " very_long_script_slot_name " }
    });
    fireEvent.change(screen.getByLabelText("Item script 1 value"), {
      target: { value: "very_long_script_resref" }
    });

    expect(screen.getByLabelText("Item script 1 slot")).toHaveAttribute("maxlength", "16");
    expect(screen.getByLabelText("Item script 1 value")).toHaveAttribute("maxlength", "16");
    expect(handlers.updateItemScriptEntry).toHaveBeenCalledWith(
      "onAcquire",
      "very_long_script",
      "nw_i0_acquire"
    );
    expect(handlers.updateItemScriptEntry).toHaveBeenCalledWith(
      "onAcquire",
      "onAcquire",
      "very_long_script"
    );
  });
});
