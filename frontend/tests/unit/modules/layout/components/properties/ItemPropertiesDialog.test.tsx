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
      addCost: 0,
      charges: 1,
      stackSize: 1,
      identified: true,
      stolen: false,
      plot: false,
      cursed: false,
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

function withExactItemVariables(item: SceneObject): SceneObject {
  return {
    ...item,
    itemProperties: {
      ...item.itemProperties,
      variables: [
        { name: "Counter", type: "int", value: 1 },
        { name: "Label", type: "string", value: "before" },
      ],
    },
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:variables",
      itemVariables: {
        expectedEntries: [
          { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
          { sourceIndex: 1, name: "Label", type: "string", value: "before" },
        ],
      },
    },
  };
}

function withExactItemPropertyList(item: SceneObject): SceneObject {
  const first = {
    propertyName: 1,
    subtype: 2,
    costTable: 3,
    costValue: 4,
    param1: 255,
    param1Value: 0,
    chanceAppear: 100,
  };
  const second = {
    propertyName: 48,
    subtype: 5,
    costTable: 24,
    costValue: 6,
    param1: 7,
    param1Value: 8,
    chanceAppear: 75,
  };
  return {
    ...item,
    itemProperties: { ...item.itemProperties, propertyList: [first, second] },
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:property_list",
      itemPropertyList: {
        present: true,
        expectedEntries: [
          { sourceIndex: 0, ...first },
          { sourceIndex: 1, ...second },
        ],
      },
    },
  };
}

function withExactItemInventory(item: SceneObject): SceneObject {
  const inventoryItems = [
    { sourceIndex: 0, resRef: "nw_it_gold001", x: 1, y: 2 },
    { sourceIndex: 1, resRef: "nw_it_gem001", x: 3, y: 4 },
  ];
  return {
    ...item,
    itemProperties: { ...item.itemProperties, inventoryItems },
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:inventory",
      itemInventoryItems: inventoryItems.map((entry) => ({ ...entry })),
    },
  };
}

function withExactEmptyItemInventory(item: SceneObject): SceneObject {
  return {
    ...item,
    itemProperties: { ...item.itemProperties, inventoryItems: [] },
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:empty_inventory",
      itemInventoryItems: [],
    },
  };
}

const itemInventoryBlueprintOption = {
  templateObjectId: "itm_template_nw_cloth022",
  label: "Cloth Armor (nw_cloth022)",
} as const;

const itemBaseItemCatalog = {
  descriptor: {
    resourceName: "baseitems.2da" as const,
    sourceObjectKey: "modules/current/baseitems.2da",
    sourceLayer: "module" as const,
    sha256: "b".repeat(64),
    sizeBytes: 4096,
    rowCount: 3,
  },
  rows: [
    { rowIndex: 0, modelType: 0 as const, displayName: "Simple" },
    { rowIndex: 1, modelType: 2 as const, itemClass: "WSwLs", displayName: "Weapon" },
    { rowIndex: 2, modelType: 3 as const, itemClass: "AARM", displayName: "Armor" },
  ],
};

function withExactItemBaseAppearance(item: SceneObject): SceneObject {
  return {
    ...item,
    itemProperties: {
      ...item.itemProperties,
      baseItem: 0,
      modelPart1: 66,
      modelPart2: undefined,
      modelPart3: undefined,
      baseAppearance: {
        baseItem: 0,
        modelType: 0,
        appearance: { modelPart1: 66 },
      },
    },
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:base_appearance",
      itemBaseAppearance: {
        expectedValue: {
          baseItem: 0,
          modelType: 0,
          appearance: { modelPart1: 66 },
        },
        tableSha256: "b".repeat(64),
        tableRowCount: 3,
      },
    },
  };
}

function withItemWizardBlueprint(item: SceneObject): SceneObject {
  return {
    ...item,
    id: "itm_wizard_custom_hide_armor_1",
  };
}

function withExactItemInstanceState(item: SceneObject): SceneObject {
  return {
    ...item,
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:state",
      itemInstanceState: {
        presentFields: [
          "charges",
          "cost",
          "stolen",
          "stackSize",
          "plot",
          "addCost",
          "identified",
          "cursed",
        ],
        values: {
          charges: 1,
          cost: 19463,
          stolen: false,
          stackSize: 1,
          plot: false,
          addCost: 0,
          identified: true,
          cursed: false,
        },
      },
    },
  };
}

function withExactItemLocalizedStrings(item: SceneObject): SceneObject {
  return {
    ...item,
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:localized_strings",
      itemLocalizedStrings: {
        localizedName: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "Q3VzdG9tIEhpZGUgQXJtb3I=" }],
        },
        description: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "RGVzY3JpcHRpb24=" }],
        },
        identifiedDescription: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "SWRlbnRpZmllZA==" }],
        },
      },
    },
  };
}

function renderItemDialog(
  activeTab: ItemPropertiesTab = "basic",
  prepareItem: (item: SceneObject) => SceneObject = (item) => item,
  baseItemCatalog = null as typeof itemBaseItemCatalog | null,
  itemInventoryBlueprintOptions = [] as readonly (typeof itemInventoryBlueprintOption)[],
) {
  const item = prepareItem(createItemObject());
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
    moveItemPropertyEntry: vi.fn(),
    removeItemPropertyEntry: vi.fn(),
    updateItemInventoryCoordinate: vi.fn(),
    moveItemInventoryEntry: vi.fn(),
    removeItemInventoryEntry: vi.fn(),
    addItemInventoryBlueprintEntry: vi.fn(),
    addItemBlueprintInventoryEntry: vi.fn(),
    updateItemBlueprintInventoryEntry: vi.fn(),
    moveItemBlueprintInventoryEntry: vi.fn(),
    removeItemBlueprintInventoryEntry: vi.fn(),
    addItemBlueprintEquipmentEntry: vi.fn(),
    updateItemBlueprintEquipmentEntry: vi.fn(),
    removeItemBlueprintEquipmentEntry: vi.fn(),
    addItemVariable: vi.fn(),
    updateItemVariable: vi.fn(),
    moveItemVariable: vi.fn(),
    removeItemVariable: vi.fn(),
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
      itemBaseItemCatalog={baseItemCatalog}
      itemInventoryBlueprintOptions={itemInventoryBlueprintOptions}
      {...handlers}
    />
  );

  return handlers;
}

describe("ItemPropertiesDialog", () => {
  it("activates an exact retained ground-item Tag with the native edit budget", () => {
    const handlers = renderItemDialog("basic", (item) => ({
      ...item,
      source: {
        type: "aurora_git",
        sourceKind: "item",
        sourceIndex: 0,
        sourceObjectId: "itm:0:tag",
        itemTag: { present: true, value: "NW_AARCLO08" },
      },
    }));

    const tag = screen.getByLabelText("Tag");
    expect(tag).not.toBeDisabled();
    expect(tag).toHaveAttribute("maxlength", "32");
    expect(tag).toHaveAttribute(
      "title",
      "ACTIVE_NOW: exact retained ground-item Tag",
    );
    fireEvent.change(tag, { target: { value: "  EXACT_TARGET  " } });
    expect(handlers.updateItemPropertiesDraftField)
      .toHaveBeenCalledWith("tag", "  EXACT_TARGET  ");
  });

  it.each([
    ["missing provenance", undefined],
    ["native absence", { present: false }],
  ])("keeps ground-item Tag preserve-only with %s", (_label, itemTag) => {
    renderItemDialog("basic", (item) => ({
      ...item,
      source: {
        type: "aurora_git",
        sourceKind: "item",
        sourceIndex: 0,
        sourceObjectId: "itm:0:tag",
        ...(itemTag ? { itemTag } : {}),
      },
    }));

    const tag = screen.getByLabelText("Tag");
    expect(tag).toBeDisabled();
    expect(tag).toHaveAttribute(
      "title",
      "PRESERVE_ONLY: exact retained ground-item Tag provenance is unavailable",
    );
  });

  it("activates an exact retained ground-item TemplateResRef with the native edit budget", () => {
    const handlers = renderItemDialog("basic", (item) => ({
      ...item,
      source: {
        type: "aurora_git",
        sourceKind: "item",
        sourceIndex: 0,
        sourceObjectId: "itm:0:template_resref",
        itemTemplateResRef: {
          present: true,
          nativeType: "resref",
          value: "aaarcl008",
        },
      },
    }));

    const resRef = screen.getByLabelText("ResRef");
    expect(resRef).not.toBeDisabled();
    expect(resRef).toHaveAttribute("maxlength", "16");
    expect(resRef).toHaveAttribute(
      "title",
      "ACTIVE_NOW: exact retained ground-item TemplateResRef",
    );
    fireEvent.change(resRef, { target: { value: "custom_sword" } });
    expect(handlers.updateItemPropertiesDraftField)
      .toHaveBeenCalledWith("resRef", "custom_sword");
  });

  it.each([
    ["missing provenance", undefined],
    ["native absence", { present: false }],
  ])("keeps ground-item TemplateResRef preserve-only with %s", (
    _label,
    itemTemplateResRef,
  ) => {
    renderItemDialog("basic", (item) => ({
      ...item,
      source: {
        type: "aurora_git",
        sourceKind: "item",
        sourceIndex: 0,
        sourceObjectId: "itm:0:template_resref",
        ...(itemTemplateResRef ? { itemTemplateResRef } : {}),
      },
    }));

    const resRef = screen.getByLabelText("ResRef");
    expect(resRef).toBeDisabled();
    expect(resRef).toHaveAttribute(
      "title",
      "PRESERVE_ONLY: exact retained ground-item TemplateResRef provenance is unavailable",
    );
  });

  it("edits UTI identity, cost, stack and flags for an Item-wizard blueprint", () => {
    const handlers = renderItemDialog("basic", withItemWizardBlueprint);

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

  it("activates each exact retained ground-item localized string with its native budget", () => {
    const basicHandlers = renderItemDialog("basic", withExactItemLocalizedStrings);
    const localizedName = screen.getByLabelText("Localized Name");
    expect(localizedName).not.toBeDisabled();
    expect(localizedName).toHaveAttribute("maxlength", "256");
    expect(localizedName).toHaveAttribute(
      "title",
      "ACTIVE_NOW: exact retained ground-item LocalizedName",
    );
    fireEvent.change(localizedName, { target: { value: " Exact Armor " } });
    expect(basicHandlers.updateItemPropertiesDraftField)
      .toHaveBeenCalledWith("localizedName", " Exact Armor ");

    const commentsHandlers = renderItemDialog("comments", withExactItemLocalizedStrings);
    const description = screen.getAllByLabelText("Description").at(-1);
    const identifiedDescription = screen.getByLabelText("Identified Description");
    expect(description).not.toBeDisabled();
    expect(description).toHaveAttribute("maxlength", "4096");
    expect(identifiedDescription).not.toBeDisabled();
    expect(identifiedDescription).toHaveAttribute("maxlength", "4096");
    fireEvent.change(description!, { target: { value: " exact description " } });
    fireEvent.change(identifiedDescription, { target: { value: " known armor " } });
    expect(commentsHandlers.updateItemPropertiesDraftField)
      .toHaveBeenCalledWith("description", " exact description ");
    expect(commentsHandlers.updateItemPropertiesDraftField)
      .toHaveBeenCalledWith("identifiedDescription", " known armor ");
  });

  it("keeps unsupported retained localized-string members preserve-only independently", () => {
    renderItemDialog("basic", (item) => {
      const exact = withExactItemLocalizedStrings(item);
      return {
        ...exact,
        source: {
          ...exact.source!,
          itemLocalizedStrings: {
            ...exact.source!.itemLocalizedStrings!,
            localizedName: { present: true, strRef: 42, entries: [] },
          },
        },
      };
    });

    const localizedName = screen.getByLabelText("Localized Name");
    expect(localizedName).toBeDisabled();
    expect(localizedName).toHaveAttribute(
      "title",
      "PRESERVE_ONLY: exact retained ground-item LocalizedName provenance is unavailable",
    );
  });

  it("activates only the eight exact instance-state scalars with native numeric ranges", () => {
    renderItemDialog("basic", withExactItemInstanceState);

    for (const label of [
      "Cost", "Add Cost", "Charges", "Stack Size",
      "Identified", "Stolen", "Plot", "Cursed",
    ]) {
      expect(screen.getByLabelText(label)).not.toBeDisabled();
    }
    expect(screen.getByLabelText("Charges")).toHaveAttribute("min", "0");
    expect(screen.getByLabelText("Charges")).toHaveAttribute("max", "255");
    expect(screen.getByLabelText("Stack Size")).toHaveAttribute("max", "65535");
    expect(screen.getByLabelText("Cost")).toHaveAttribute("max", "4294967295");
    expect(screen.getByLabelText("Add Cost")).toHaveAttribute("max", "4294967295");
    expect(screen.queryByLabelText("Cost Table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cost Value")).not.toBeInTheDocument();
  });

  it("keeps instance scalars preserve-only when exact storage provenance is absent", () => {
    renderItemDialog("basic");

    for (const label of [
      "Cost", "Add Cost", "Charges", "Stack Size",
      "Identified", "Stolen", "Plot", "Cursed",
    ]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    expect(screen.queryByLabelText("Cost Table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cost Value")).not.toBeInTheDocument();
  });

  it("edits localized description string references for an Item-wizard blueprint", () => {
    const handlers = renderItemDialog("comments", withItemWizardBlueprint);

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

  it("enables exact retained ground-item comments with the native budget", () => {
    const handlers = renderItemDialog("comments", (item) => ({
      ...item,
      source: {
        type: "aurora_git",
        sourceKind: "item",
        sourceIndex: 0,
        sourceObjectId: "itm:0",
        itemEditorComment: "Comments",
      },
    }));

    const comments = screen.getByLabelText("Comments");
    expect(comments).not.toBeDisabled();
    expect(comments).toHaveAttribute("maxlength", "4096");
    fireEvent.change(comments, { target: { value: " exact target " } });
    expect(handlers.updateItemPropertiesDraftField)
      .toHaveBeenCalledWith("comments", " exact target ");
  });

  it("keeps retained ground-item comments preserve-only without exact provenance", () => {
    renderItemDialog("comments", (item) => ({
      ...item,
      source: {
        type: "aurora_git",
        sourceKind: "item",
        sourceIndex: 0,
        sourceObjectId: "itm:0",
      },
    }));

    expect(screen.getByLabelText("Comments")).toBeDisabled();
    expect(screen.getAllByText("PRESERVE_ONLY").length).toBeGreaterThanOrEqual(1);
  });

  it("edits model parts, armor context and armor slot parts for an Item-wizard blueprint", () => {
    const handlers = renderItemDialog("visual", withItemWizardBlueprint);

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

  it("keeps cloak derived model fields read-only while a blueprint Model Row stays editable", () => {
    const handlers = renderItemDialog("visual", withItemWizardBlueprint);

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

  it("edits material colors for an Item-wizard blueprint", () => {
    const handlers = renderItemDialog("colors", withItemWizardBlueprint);

    fireEvent.change(screen.getByLabelText("Leather 1"), {
      target: { value: "9" }
    });

    expect(handlers.updateItemMaterialColorDraftField).toHaveBeenCalledWith("leather1", 9);
  });

  it("edits ItemPropertyList entries for an Item-wizard blueprint", () => {
    const handlers = renderItemDialog("properties", withItemWizardBlueprint);

    fireEvent.click(screen.getByRole("button", { name: /add property/i }));
    fireEvent.change(screen.getByLabelText("Item property 1 label"), {
      target: { value: "Keen" }
    });
    fireEvent.change(screen.getByLabelText("Item property 1 property"), {
      target: { value: "43" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove item property 1" }));

    expect(handlers.addItemPropertyEntry).toHaveBeenCalledTimes(1);
    expect(handlers.updateItemPropertyEntry).toHaveBeenCalledWith(
      0,
      "propertyLabel",
      "Keen"
    );
    expect(handlers.updateItemPropertyEntry).toHaveBeenCalledWith(0, "propertyName", 43);
    expect(handlers.removeItemPropertyEntry).toHaveBeenCalledWith(0);
  });

  it("edits and reorders an exact retained native PropertiesList", () => {
    const handlers = renderItemDialog("properties", withExactItemPropertyList);

    expect(screen.getByText("ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add property/i })).not.toBeDisabled();
    expect(screen.getByLabelText("Item property 1 label")).toBeDisabled();
    expect(screen.getByLabelText("Item property 1 property")).not.toBeDisabled();
    expect(screen.getByLabelText("Item property 1 property")).toHaveAttribute("min", "0");
    expect(screen.getByLabelText("Item property 1 property")).toHaveAttribute("max", "65535");
    expect(screen.getByLabelText("Item property 1 param 1")).toHaveAttribute("max", "255");

    fireEvent.click(screen.getByRole("button", { name: /add property/i }));
    fireEvent.change(screen.getByLabelText("Item property 1 cost table"), {
      target: { value: "24" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move item property 1 down" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove item property 1" }));

    expect(handlers.addItemPropertyEntry).toHaveBeenCalledTimes(1);
    expect(handlers.updateItemPropertyEntry).toHaveBeenCalledWith(0, "costTable", 24);
    expect(handlers.moveItemPropertyEntry).toHaveBeenCalledWith(0, "down");
    expect(handlers.removeItemPropertyEntry).toHaveBeenCalledWith(0);
  });

  it("blocks Apply and OK while a retained PropertiesList target is incomplete", () => {
    renderItemDialog("properties", (item) => {
      const exact = withExactItemPropertyList(item);
      return {
        ...exact,
        itemProperties: {
          ...exact.itemProperties,
          propertyList: [...exact.itemProperties!.propertyList!, {}],
        },
      };
    });

    expect(screen.getByText("INCOMPLETE_TARGET")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });

  it("edits retained ground-item ItemList coordinates, order, and membership", () => {
    const handlers = renderItemDialog("properties", withExactItemInventory);

    expect(screen.getByText("ItemList")).toBeInTheDocument();
    expect(screen.getByLabelText("Item inventory 1 resref")).toHaveValue("nw_it_gold001");
    expect(screen.getByLabelText("Item inventory 1 resref")).toBeDisabled();
    expect(screen.getByLabelText("Item inventory 1 repo x")).toHaveAttribute("max", "65535");

    fireEvent.change(screen.getByLabelText("Item inventory 1 repo x"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move inventory item 1 down" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove inventory item 1" }));

    expect(handlers.updateItemInventoryCoordinate).toHaveBeenCalledWith(0, "x", 12);
    expect(handlers.moveItemInventoryEntry).toHaveBeenCalledWith(0, "down");
    expect(handlers.removeItemInventoryEntry).toHaveBeenCalledWith(0);
  });

  it("adds an exact effective UTI selection to an absent retained ItemList", () => {
    const handlers = renderItemDialog(
      "properties",
      withExactEmptyItemInventory,
      null,
      [itemInventoryBlueprintOption],
    );

    expect(screen.getByText(/exact effective UTI catalog entries/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Inventory UTI template"), {
      target: { value: itemInventoryBlueprintOption.templateObjectId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add catalog inventory item" }));

    expect(handlers.addItemInventoryBlueprintEntry)
      .toHaveBeenCalledWith(itemInventoryBlueprintOption.templateObjectId);
  });

  it("blocks Apply and OK for an invalid retained ItemList target", () => {
    renderItemDialog("properties", (item) => {
      const exact = withExactItemInventory(item);
      return {
        ...exact,
        itemProperties: {
          ...exact.itemProperties,
          inventoryItems: [{
            ...exact.itemProperties!.inventoryItems![0]!,
            resRef: "different",
          }],
        },
      };
    });

    expect(screen.getByText("INCOMPLETE_INVENTORY_TARGET")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });

  it("authors reference-form ItemList and Equip_ItemList for an Item-wizard blueprint", () => {
    const handlers = renderItemDialog("properties", (item) => ({
      ...withItemWizardBlueprint(item),
      itemProperties: {
        ...item.itemProperties,
        blueprintInventoryItems: [
          { resRef: "itm_potion", x: 3, y: 4 },
          { resRef: "itm_scroll", x: 5, y: 6 },
        ],
        blueprintEquippedItems: [{ resRef: "itm_ring", slotMask: 4 }],
      },
    }));

    expect(screen.getByText("ItemList: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText("Equip_ItemList: ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByLabelText("Item blueprint inventory 1 resref")).toBeEnabled();
    expect(screen.getByLabelText("Item blueprint equipment 1 resref")).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Add inventory reference" }));
    fireEvent.change(screen.getByLabelText("Item blueprint inventory 1 resref"), {
      target: { value: "itm_heal" },
    });
    fireEvent.change(screen.getByLabelText("Item blueprint inventory 1 repo x"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move blueprint inventory item 1 down" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove blueprint inventory item 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Add equipment reference" }));
    fireEvent.change(screen.getByLabelText("Item blueprint equipment 1 slot"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove blueprint equipment item 1" }));

    expect(handlers.addItemBlueprintInventoryEntry).toHaveBeenCalledTimes(1);
    expect(handlers.updateItemBlueprintInventoryEntry).toHaveBeenCalledWith(
      0,
      "resRef",
      "itm_heal",
    );
    expect(handlers.updateItemBlueprintInventoryEntry).toHaveBeenCalledWith(0, "x", 12);
    expect(handlers.moveItemBlueprintInventoryEntry).toHaveBeenCalledWith(0, "down");
    expect(handlers.removeItemBlueprintInventoryEntry).toHaveBeenCalledWith(0);
    expect(handlers.addItemBlueprintEquipmentEntry).toHaveBeenCalledTimes(1);
    expect(handlers.updateItemBlueprintEquipmentEntry).toHaveBeenCalledWith(0, "slotMask", 8);
    expect(handlers.removeItemBlueprintEquipmentEntry).toHaveBeenCalledWith(0);
  });

  it("keeps retained Item blueprint-only basic fields preserve-only", () => {
    renderItemDialog("basic");

    for (const label of ["Name", "Name StrRef", "Palette", "Base Item"]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
  });

  it("keeps retained Item appearance fields preserve-only", () => {
    renderItemDialog("visual");

    for (const label of ["Part 1", "Part 2", "Part 3", "Prefix", "Torso", "Model Row"]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
  });

  it("activates the exact retained Base Item selector and only its ModelType fields", () => {
    const basicHandlers = renderItemDialog(
      "basic",
      withExactItemBaseAppearance,
      itemBaseItemCatalog,
    );
    const baseItem = screen.getByLabelText("Base Item");
    expect(baseItem).not.toBeDisabled();
    expect(baseItem.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "0 — Simple" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "1 — Weapon" })).toBeInTheDocument();
    fireEvent.change(baseItem, { target: { value: "1" } });
    expect(basicHandlers.updateItemPropertiesDraftField)
      .toHaveBeenCalledWith("baseItem", 1);

    renderItemDialog("visual", withExactItemBaseAppearance, itemBaseItemCatalog);
    expect(screen.getAllByLabelText("Part 1").at(-1)).not.toBeDisabled();
    expect(screen.getAllByLabelText("Part 2").at(-1)).toBeDisabled();
    expect(screen.getAllByLabelText("Part 3").at(-1)).toBeDisabled();
    expect(screen.getAllByLabelText("Torso").at(-1)).toBeDisabled();
  });

  it("blocks Apply and OK for an incomplete cross-ModelType appearance target", () => {
    renderItemDialog(
      "visual",
      (item) => {
        const exact = withExactItemBaseAppearance(item);
        return {
          ...exact,
          itemProperties: {
            ...exact.itemProperties,
            baseItem: 1,
            modelPart1: undefined,
            modelPart2: undefined,
            modelPart3: undefined,
            modelParts: [],
          },
        };
      },
      itemBaseItemCatalog,
    );

    expect(screen.getByText("INCOMPLETE_BASE_APPEARANCE_TARGET")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });

  it("keeps retained Item material colors preserve-only", () => {
    renderItemDialog("colors");

    expect(screen.getByLabelText("Leather 1")).toBeDisabled();
  });

  it("keeps retained Item PropertiesList preserve-only", () => {
    renderItemDialog("properties");

    expect(screen.getByRole("button", { name: /add property/i })).toBeDisabled();
    expect(screen.getByLabelText("Item property 1 label")).toBeDisabled();
    expect(screen.getByLabelText("Item property 1 property")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove item property 1" })).toBeDisabled();
    expect(screen.getAllByText("PRESERVE_ONLY").length).toBeGreaterThanOrEqual(1);
  });

  it("replaces the non-native Item Scripts shell with exact native Variables", () => {
    const handlers = renderItemDialog("variables", withExactItemVariables);

    expect(screen.queryByRole("button", { name: "Scripts" })).not.toBeInTheDocument();
    expect(screen.getByText("ACTIVE_NOW")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add variable" }));
    fireEvent.change(screen.getByLabelText("Item variable 1 value"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move item variable 1 down" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove item variable 1" }));

    expect(handlers.addItemVariable).toHaveBeenCalledTimes(1);
    expect(handlers.updateItemVariable).toHaveBeenCalledWith(0, {
      name: "Counter", type: "int", value: 2,
    });
    expect(handlers.moveItemVariable).toHaveBeenCalledWith(0, "down");
    expect(handlers.removeItemVariable).toHaveBeenCalledWith(0);
  });

  it("activates native Variables for an Item-wizard blueprint", () => {
    const handlers = renderItemDialog("variables", (item) => {
      const wizard = withItemWizardBlueprint(item);
      return {
        ...wizard,
        itemProperties: {
          ...wizard.itemProperties,
          variables: [{ name: "Counter", type: "int", value: 1 }],
        },
      };
    });

    expect(screen.getByText("ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add variable" })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Add variable" }));
    fireEvent.change(screen.getByLabelText("Item variable 1 value"), {
      target: { value: "2" },
    });

    expect(handlers.addItemVariable).toHaveBeenCalledTimes(1);
    expect(handlers.updateItemVariable).toHaveBeenCalledWith(0, {
      name: "Counter", type: "int", value: 2,
    });
  });

  it("keeps Variables preserve-only without exact retained Item provenance", () => {
    renderItemDialog("variables");

    expect(screen.getByText("PRESERVE_ONLY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add variable" })).toBeDisabled();
  });
});
