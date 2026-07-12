import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildCreaturePropertiesDraft } from "../../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { CreaturePropertiesDialog } from "../../../../../../src/modules/layout/components/properties/CreaturePropertiesDialog";
import { createNewSceneObject } from "../../../../../../src/modules/scene/domain/sceneFactory";

function renderInventoryDialog(options?: {
  includeEmbeddedItems?: boolean;
  slotMismatch?: boolean;
  activeTab?: "basic" | "inventory" | "advanced";
  variables?: Array<
    | { name: string; type: "int"; value: number }
    | { name: string; type: "float"; value: number }
    | { name: string; type: "string"; value: string }
  >;
  resourceOptions?: {
    portrait?: Array<{ resRef: string; label: string }>;
    conversation?: Array<{ resRef: string; label: string }>;
    soundset?: Array<{ resRef: string; label: string; soundSetFile: number }>;
  };
}) {
  const creatureObject = createNewSceneObject("creatures", 1, 2, 3);
  if (!creatureObject.creatureProperties) {
    throw new Error("Expected creature defaults");
  }
  creatureObject.creatureProperties = {
    ...creatureObject.creatureProperties,
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
      ...(options?.includeEmbeddedItems
        ? [
            {
              embeddedItem: {
                sourceStructTypeId: 4294967295,
                templateResRef: "emb_potion",
                tag: "EMB_POTION",
                localizedName: "Embedded Potion",
                localizedNameStrRef: 7001,
                baseItem: 49,
                itemPropertyListCount: 1,
                itemPropertyListEntries: [
                  {
                    propertyName: 15,
                    subtype: 0,
                    costTable: 2,
                    costValue: 5,
                    param1: 255,
                    param1Value: 0,
                    chanceAppear: 100
                  }
                ],
                fieldCount: 5
              },
              x: 7,
              y: 8,
              dropable: true,
              pickpocketable: false,
              infinite: false
            }
          ]
        : [])
    ],
    variables: options?.variables,
    equippedItems: [
      {
        resRef: "nw_wswmls001",
        randomResRef: "rnd_weapon",
        randomList: "rl_weapons",
        itemResRef: "nw_wswmls001",
        itemBaseItem: 1,
        itemBaseItemEquipableSlots: "0x10",
        slotMask: options?.slotMismatch ? 32 : 16,
        dropable: true,
        pickpocketable: false,
        infinite: false
      },
      ...(options?.includeEmbeddedItems
        ? [
            {
              embeddedItem: {
                sourceStructTypeId: 4294967295,
                templateResRef: "emb_sword",
                tag: "EMB_SWORD",
                localizedName: "Embedded Sword",
                baseItem: 1,
                itemPropertyListCount: 0,
                itemPropertyListEntries: [],
                fieldCount: 4
              },
              slotMask: 16,
              dropable: false,
              pickpocketable: false,
              infinite: true
            }
          ]
        : [])
    ]
  };

  const handlers = {
    addCreatureInventoryItem: vi.fn(),
    updateCreatureInventoryItem: vi.fn(),
    removeCreatureInventoryItem: vi.fn(),
    addCreatureVariable: vi.fn(),
    updateCreatureVariable: vi.fn(),
    removeCreatureVariable: vi.fn(),
    addCreatureEquippedItem: vi.fn(),
    updateCreatureEquippedItem: vi.fn(),
    removeCreatureEquippedItem: vi.fn(),
    updateCreaturePropertiesDraftField: vi.fn(),
    updateCreatureAdvancedField: vi.fn()
  };

  render(
    <CreaturePropertiesDialog
      creaturePropertiesDialog={{
        objectId: creatureObject.id,
        snapshotObject: creatureObject,
        draft: buildCreaturePropertiesDraft(creatureObject),
        activeTab: options?.activeTab ?? "inventory",
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false
      }}
      toggleCreaturePropertiesDialogCollapsed={vi.fn()}
      cancelCreaturePropertiesDialog={vi.fn()}
      setCreaturePropertiesActiveTab={vi.fn()}
      updateCreaturePropertiesDraftField={handlers.updateCreaturePropertiesDraftField}
      updateCreatureClassEntry={vi.fn()}
      updateCreatureSkillRank={vi.fn()}
      updateCreatureScriptSlot={vi.fn()}
      updateCreatureAppearancePart={vi.fn()}
      updateCreatureAdvancedField={handlers.updateCreatureAdvancedField}
      addCreatureVariable={handlers.addCreatureVariable}
      updateCreatureVariable={handlers.updateCreatureVariable}
      removeCreatureVariable={handlers.removeCreatureVariable}
      applyCreaturePropertiesDraft={vi.fn()}
      creatureFeatsFilter="All Feats"
      setCreatureFeatsFilter={vi.fn()}
      creatureSpellsLevelFilter="All Levels"
      setCreatureSpellsLevelFilter={vi.fn()}
      creatureSpellsMetaMagicFilter="All Metamagic"
      setCreatureSpellsMetaMagicFilter={vi.fn()}
      creatureSpellsClassFilterIndex={0}
      setCreatureSpellsClassFilterIndex={vi.fn()}
      creatureSpecialAbilitiesFilter="All Spells and Abilities"
      setCreatureSpecialAbilitiesFilter={vi.fn()}
      creatureResourceOptions={options?.resourceOptions}
      {...handlers}
    />
  );

  return handlers;
}

describe("CreaturePropertiesDialog", () => {
  it("edits Aurora VarTable entries with typed values", () => {
    const handlers = renderInventoryDialog({
      activeTab: "advanced",
      variables: [{ name: "HitCounter", type: "int", value: 4 }]
    });

    fireEvent.click(screen.getByRole("button", { name: /variables \(1\)/i }));
    fireEvent.change(screen.getByLabelText("Variable 1 name"), {
      target: { value: "HitCounterEdited" }
    });
    fireEvent.change(screen.getByLabelText("Variable 1 type"), {
      target: { value: "string" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add variable" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove variable 1" }));

    expect(handlers.updateCreatureVariable).toHaveBeenCalledWith(0, {
      name: "HitCounterEdited",
      type: "int",
      value: 4
    });
    expect(handlers.updateCreatureVariable).toHaveBeenCalledWith(0, {
      name: "HitCounter",
      type: "string",
      value: ""
    });
    expect(handlers.addCreatureVariable).toHaveBeenCalledTimes(1);
    expect(handlers.removeCreatureVariable).toHaveBeenCalledWith(0);
  });

  it("selects portrait and conversation values from module resource options", () => {
    const handlers = renderInventoryDialog({
      activeTab: "basic",
      resourceOptions: {
        portrait: [{ resRef: "po_hm_guard", label: "Human Guard" }],
        conversation: [{ resRef: "guard_talk", label: "Guard Talk" }]
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Browse portrait" }));
    fireEvent.change(screen.getByLabelText("Select portrait"), {
      target: { value: "po_hm_guard" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Browse conversation" }));
    fireEvent.change(screen.getByLabelText("Select conversation"), {
      target: { value: "guard_talk" }
    });

    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "portraitResRef",
      "po_hm_guard"
    );
    expect(handlers.updateCreaturePropertiesDraftField).toHaveBeenCalledWith(
      "conversation",
      "guard_talk"
    );
  });

  it("selects soundset ID and label from module resource options", () => {
    const handlers = renderInventoryDialog({
      activeTab: "advanced",
      resourceOptions: {
        soundset: [{ resRef: "ss_guard", label: "Guard", soundSetFile: 12 }]
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Browse sound set" }));
    fireEvent.change(screen.getByLabelText("Select sound set"), {
      target: { value: "12" }
    });

    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("soundSetFile", 12);
    expect(handlers.updateCreatureAdvancedField).toHaveBeenCalledWith("soundSet", "Guard");
  });

  it("edits decompiled ItemList and Equip_ItemList entries", () => {
    const handlers = renderInventoryDialog();

    fireEvent.click(screen.getByRole("button", { name: /add itemlist entry/i }));
    expect(handlers.addCreatureInventoryItem).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Inventory item 1 resref"), {
      target: { value: "nw_it_mneck021" }
    });
    expect(screen.getByLabelText("Inventory item 1 random resref")).toHaveValue("rnd_potion");
    expect(screen.getByLabelText("Inventory item 1 random list")).toHaveValue("rl_potions");
    fireEvent.change(screen.getByLabelText("Inventory item 1 random resref"), {
      target: { value: "rnd_neck" }
    });
    fireEvent.change(screen.getByLabelText("Inventory item 1 random list"), {
      target: { value: "rl_necks" }
    });
    fireEvent.change(screen.getByLabelText(/inventory item 1 repo x/i), {
      target: { value: "7" }
    });
    fireEvent.click(screen.getByLabelText(/inventory item 1 dropable/i));
    fireEvent.click(screen.getAllByRole("button", { name: /^remove$/i })[0]!);

    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(
      0,
      "resRef",
      "nw_it_mneck021"
    );
    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(
      0,
      "randomResRef",
      "rnd_neck"
    );
    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(
      0,
      "randomList",
      "rl_necks"
    );
    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(0, "x", 7);
    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(0, "dropable", false);
    expect(handlers.removeCreatureInventoryItem).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole("button", { name: /add equip_itemlist entry/i }));
    expect(handlers.addCreatureEquippedItem).toHaveBeenCalledTimes(1);

    expect(screen.getByLabelText("Equipped item 1 slot mask")).toHaveValue("16");
    expect(screen.getByLabelText("Equipped item 1 slot mask raw")).toHaveValue(16);
    expect(screen.getByText("0x10: Right Hand")).toBeInTheDocument();
    expect(
      screen.getByText("Slot OK: 0x10: Right Hand matches 0x10: Right Hand")
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Equipped item 1 slot mask"), {
      target: { value: "32" }
    });
    fireEvent.change(screen.getByLabelText("Equipped item 1 resref"), {
      target: { value: "nw_shield001" }
    });
    expect(screen.getByLabelText("Equipped item 1 random resref")).toHaveValue("rnd_weapon");
    expect(screen.getByLabelText("Equipped item 1 random list")).toHaveValue("rl_weapons");
    fireEvent.change(screen.getByLabelText("Equipped item 1 random resref"), {
      target: { value: "rnd_shield" }
    });
    fireEvent.change(screen.getByLabelText("Equipped item 1 random list"), {
      target: { value: "rl_shields" }
    });
    fireEvent.click(screen.getByLabelText(/equipped item 1 infinite/i));
    fireEvent.click(screen.getAllByRole("button", { name: /^remove$/i })[1]!);

    expect(handlers.updateCreatureEquippedItem).toHaveBeenCalledWith(0, "slotMask", 32);
    expect(handlers.updateCreatureEquippedItem).toHaveBeenCalledWith(
      0,
      "resRef",
      "nw_shield001"
    );
    expect(handlers.updateCreatureEquippedItem).toHaveBeenCalledWith(
      0,
      "randomResRef",
      "rnd_shield"
    );
    expect(handlers.updateCreatureEquippedItem).toHaveBeenCalledWith(
      0,
      "randomList",
      "rl_shields"
    );
    expect(handlers.updateCreatureEquippedItem).toHaveBeenCalledWith(0, "infinite", true);
    expect(handlers.removeCreatureEquippedItem).toHaveBeenCalledWith(0);
  });

  it("labels embedded Item structs in inventory and equipment rows", () => {
    renderInventoryDialog({ includeEmbeddedItems: true });

    expect(
      screen.getByText("Embedded emb_potion (Embedded Potion, Base 49, 1 props)")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Embedded emb_sword (Embedded Sword, Base 1, 0 props)")
    ).toBeInTheDocument();
  });

  it("edits embedded Item structs and property list entries", () => {
    const handlers = renderInventoryDialog({ includeEmbeddedItems: true });

    fireEvent.change(screen.getByLabelText("Inventory item 2 embedded template resref"), {
      target: { value: "emb_potion_edit" }
    });
    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(
      1,
      "embeddedItem",
      expect.objectContaining({
        templateResRef: "emb_potion_edit",
        itemPropertyListEntries: [
          expect.objectContaining({
            propertyName: 15,
            subtype: 0
          })
        ]
      })
    );

    fireEvent.change(screen.getByLabelText("Inventory item 2 embedded property 1 subtype"), {
      target: { value: "42" }
    });
    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(
      1,
      "embeddedItem",
      expect.objectContaining({
        itemPropertyListCount: 1,
        itemPropertyListEntries: [
          expect.objectContaining({
            propertyName: 15,
            subtype: 42,
            costTable: 2
          })
        ]
      })
    );

    fireEvent.change(screen.getByLabelText("Inventory item 2 embedded localized name strref"), {
      target: { value: "7002" }
    });
    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(
      1,
      "embeddedItem",
      expect.objectContaining({
        localizedName: "Embedded Potion",
        localizedNameStrRef: 7002
      })
    );

    const inventoryEmbeddedEditor = screen.getByRole("group", {
      name: /inventory item 2 embedded item/i
    });
    fireEvent.click(within(inventoryEmbeddedEditor).getByRole("button", { name: /add property/i }));
    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(
      1,
      "embeddedItem",
      expect.objectContaining({
        itemPropertyListCount: 2,
        itemPropertyListEntries: [expect.objectContaining({ propertyName: 15 }), {}]
      })
    );

    fireEvent.click(within(inventoryEmbeddedEditor).getByRole("button", { name: /^remove$/i }));
    expect(handlers.updateCreatureInventoryItem).toHaveBeenCalledWith(
      1,
      "embeddedItem",
      expect.objectContaining({
        itemPropertyListCount: 0,
        itemPropertyListEntries: []
      })
    );

    const equippedEmbeddedEditor = screen.getByRole("group", {
      name: /equipped item 2 embedded item/i
    });
    fireEvent.click(within(equippedEmbeddedEditor).getByRole("button", { name: /add property/i }));
    expect(handlers.updateCreatureEquippedItem).toHaveBeenCalledWith(
      1,
      "embeddedItem",
      expect.objectContaining({
        itemPropertyListCount: 1,
        itemPropertyListEntries: [{}]
      })
    );
  });

  it("warns when an equipped item slot does not match baseitems EquipableSlots", () => {
    renderInventoryDialog({ slotMismatch: true });

    expect(
      screen.getByText("Slot mismatch: 0x20: Left Hand is not in 0x10: Right Hand")
    ).toBeInTheDocument();
  });
});
