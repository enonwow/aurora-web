import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ItemApiPaletteTreeResult } from "../../../../src/modules/items/contracts";
import { createSceneObjectCatalogQueryFacade } from "../../../../src/modules/layout/application/sceneObjectCatalogQueryFacade";
import { SceneObjectAddPanel } from "../../../../src/modules/layout/components/SceneObjectAddPanel";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";

describe("SceneObjectAddPanel", () => {
  const objects = createSeedAreaScene().objects;
  const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
  const trackTelemetryEvent = vi.fn();

  beforeEach(() => {
    trackTelemetryEvent.mockClear();
  });

  it("defaults selected type to a concrete type and excludes all", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const selector = screen.getByRole("combobox", { name: /add object type selector/i });
    expect(selector).toHaveValue("placeables");

    const options = within(selector).getAllByRole("option");
    expect(options.map((option) => option.getAttribute("value"))).not.toContain("all");
  });

  it("filters rows by tag or resref within selected type", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const selector = screen.getByRole("combobox", { name: /add object type selector/i });
    fireEvent.change(selector, { target: { value: "sounds" } });

    const input = screen.getByRole("searchbox", { name: /filter objects/i });
    fireEvent.change(input, { target: { value: "caves" } });

    expect(screen.getByText(/sound_caves_02/i)).toBeInTheDocument();
    expect(screen.queryByText(/sound_forest_01/i)).not.toBeInTheDocument();
  });

  it("shows add-object result counts and clears search filters locally", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const addObjectsSection = screen.getByRole("article", { name: /add objects section/i });
    const list = within(addObjectsSection).getByRole("list", { name: /placeables add list/i });
    const filterInput = within(addObjectsSection).getByRole("searchbox", {
      name: /filter objects/i
    });

    fireEvent.change(filterInput, { target: { value: "table" } });

    expect(within(addObjectsSection).getByText("1/4")).toBeInTheDocument();
    expect(within(list).getByText(/plc_table_02/i)).toBeInTheDocument();
    expect(within(list).queryByText(/plc_barrel_01/i)).not.toBeInTheDocument();

    fireEvent.click(within(addObjectsSection).getByRole("button", {
      name: /clear add objects filter/i
    }));

    expect(filterInput).toHaveValue("");
    expect(within(addObjectsSection).queryByText("1/4")).not.toBeInTheDocument();
    expect(within(list).getByText(/plc_barrel_01/i)).toBeInTheDocument();
  });

  it("keeps large add-object catalogs windowed while preserving full counts", () => {
    const placeables = Array.from({ length: 125 }, (_, index) => {
      const sequence = String(index + 1).padStart(3, "0");
      return {
        ...objects[0],
        id: `plc_template_bulk_${sequence}`,
        kind: "placeables" as const,
        name: `Bulk Placeable ${sequence}`,
        tag: `BULK_${sequence}`,
        resRef: `bulk_${sequence}`,
        source: {
          ...objects[0].source,
          templateId: `plc_bulk_${sequence}`,
          sourceObjectId: `plc_bulk_${sequence}`
        }
      };
    });

    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={placeables}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const addObjectsSection = screen.getByRole("article", { name: /add objects section/i });
    const list = within(addObjectsSection).getByRole("list", { name: /placeables add list/i });

    expect(within(addObjectsSection).getByText("Showing 120 of 125 matches.")).toBeInTheDocument();
    expect(within(addObjectsSection).getByText("125 templates")).toBeInTheDocument();
    expect(within(list).getAllByRole("listitem")).toHaveLength(120);
    expect(within(list).getAllByText(/bulk_120/i).length).toBeGreaterThan(0);
    expect(within(list).queryByText(/bulk_121/i)).not.toBeInTheDocument();
  });

  it("resets add-object search, source, and item category filters without changing family", () => {
    const customItemTemplate = {
      ...objects.find((object) => object.kind === "items")!,
      id: "item_custom_map",
      tag: "ITEM_CUSTOM_MAP",
      resRef: "custom_map",
      name: "ITEM_CUSTOM_MAP",
      source: {
        templateId: "custom:item_custom_map",
        sourceKind: "module_custom"
      }
    };

    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={[...objects, customItemTemplate]}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const familyRail = screen.getByRole("tablist", { name: /object family palette/i });
    fireEvent.click(within(familyRail).getByRole("tab", { name: /items family, 3 templates/i }));
    const addObjectsSection = screen.getByRole("article", { name: /add objects section/i });
    const sourceTabs = within(addObjectsSection).getByRole("tablist", {
      name: /blueprint source/i
    });
    const itemCategories = within(addObjectsSection).getByRole("group", {
      name: /item palette categories/i
    });
    const filterInput = within(addObjectsSection).getByRole("searchbox", {
      name: /filter objects/i
    });

    fireEvent.click(within(itemCategories).getByRole("button", { name: /miscellaneous 1/i }));
    fireEvent.click(within(sourceTabs).getByRole("tab", { name: /custom 1/i }));
    fireEvent.change(filterInput, { target: { value: "zzzz" } });

    expect(within(addObjectsSection).getByText("0/3")).toBeInTheDocument();
    expect(
      within(addObjectsSection).getByText("No items match the current filters.")
    ).toBeInTheDocument();

    fireEvent.click(within(addObjectsSection).getByRole("button", {
      name: /reset add object filters/i
    }));

    expect(filterInput).toHaveValue("");
    expect(screen.getByRole("combobox", { name: /add object type selector/i })).toHaveValue("items");
    expect(within(sourceTabs).getByRole("tab", { name: /standard 2/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(within(itemCategories).getByRole("button", { name: /all 2/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(within(addObjectsSection).queryByRole("button", {
      name: /reset add object filters/i
    })).not.toBeInTheDocument();
    expect(within(addObjectsSection).getByText(/item_sword_02/i)).toBeInTheDocument();
  });

  it("renders an Aurora-style palette family rail and switches family from it", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const addObjectsSection = screen.getByRole("article", { name: /add objects section/i });
    const activeFamilySummary = within(addObjectsSection).getByRole("group", {
      name: /active add object family/i
    });
    const familyRail = screen.getByRole("tablist", { name: /object family palette/i });

    expect(activeFamilySummary).toHaveTextContent("Placeables");
    expect(activeFamilySummary).toHaveTextContent("4 templates");
    const emptyVfxFamily = within(familyRail).getByRole("tab", {
      name: /vfx family, 0 templates/i
    });
    expect(emptyVfxFamily).toBeDisabled();
    fireEvent.click(emptyVfxFamily);
    expect(activeFamilySummary).toHaveTextContent("Placeables");

    fireEvent.click(within(familyRail).getByRole("tab", { name: /items family, 2 templates/i }));

    expect(activeFamilySummary).toHaveTextContent("Items");
    expect(activeFamilySummary).toHaveTextContent("2 templates");
    expect(screen.getByRole("combobox", { name: /add object type selector/i })).toHaveValue("items");
    expect(screen.getByRole("list", { name: /items add list/i })).toBeInTheDocument();
    expect(screen.getByText(/item_sword_02/i)).toBeInTheDocument();
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.add_objects.type_changed",
      expect.objectContaining({
        userId: "u_builder_001",
        objectType: "items",
        count: 2,
        source: "palette_rail"
      })
    );
  });

  it("exposes Standard/Custom source tabs and item palette categories", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const familyRail = screen.getByRole("tablist", { name: /object family palette/i });
    fireEvent.click(within(familyRail).getByRole("tab", { name: /items family, 2 templates/i }));

    const sourceTabs = screen.getByRole("tablist", { name: /blueprint source/i });
    expect(within(sourceTabs).getByRole("tab", { name: /standard 2/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    const itemCategories = screen.getByRole("group", { name: /item palette categories/i });
    fireEvent.click(within(itemCategories).getByRole("button", { name: /weapons 1/i }));
    expect(screen.getByText(/item_sword_02/i)).toBeInTheDocument();
    expect(screen.queryByText(/item_chest_01/i)).not.toBeInTheDocument();

    fireEvent.click(within(itemCategories).getByRole("button", { name: /miscellaneous 1/i }));
    expect(screen.getByText(/item_chest_01/i)).toBeInTheDocument();
    expect(screen.queryByText(/item_sword_02/i)).not.toBeInTheDocument();

    const emptyCustomSource = within(sourceTabs).getByRole("tab", { name: /custom 0/i });
    expect(emptyCustomSource).toBeDisabled();
    fireEvent.click(emptyCustomSource);
    expect(within(sourceTabs).getByRole("tab", { name: /standard 2/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("filters Add-to-Area items through the shared itempal tree", () => {
    const itemPaletteTree: ItemApiPaletteTreeResult = {
      generatedAt: "2026-06-30T00:00:00.000Z",
      activeSource: "itempalstd",
      sources: [],
      rootCount: 1,
      leafCount: 1,
      folderCount: 1,
      categoryLeafCount: 0,
      maxDepth: 1,
      roots: [
        {
          nodeId: "weapons",
          kind: "folder",
          depth: 0,
          label: "Weapons",
          strRef: 7,
          leafCount: 1,
          folderCount: 0,
          categoryLeafCount: 0,
          children: [
            {
              nodeId: "weapons/nw_wswm001",
              kind: "leaf",
              depth: 1,
              label: "Longsword",
              resRef: "nw_wswm001",
              name: "Longsword",
              leafCount: 1,
              folderCount: 0,
              categoryLeafCount: 0,
              children: []
            }
          ]
        }
      ]
    };

    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        defaultActiveType="items"
        itemPaletteTree={itemPaletteTree}
      />
    );

    expect(screen.getByText(/item_chest_01/i)).toBeInTheDocument();
    expect(screen.getByText(/item_sword_02/i)).toBeInTheDocument();

    const paletteSelector = screen.getByRole("combobox", {
      name: /add item palette category/i
    });
    fireEvent.change(paletteSelector, { target: { value: "weapons" } });

    expect(screen.queryByText(/item_chest_01/i)).not.toBeInTheDocument();
    expect(screen.getByText(/item_sword_02/i)).toBeInTheDocument();

    const itemCategories = screen.getByRole("group", { name: /item palette categories/i });
    expect(within(itemCategories).getByRole("button", { name: /weapons 1/i })).toBeInTheDocument();
    expect(
      within(itemCategories).getByRole("button", { name: /miscellaneous 0/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reset add object filters/i }));

    expect(paletteSelector).toHaveValue("all");
    expect(screen.getByText(/item_chest_01/i)).toBeInTheDocument();
    expect(screen.getByText(/item_sword_02/i)).toBeInTheDocument();
  });

  it("classifies add-item categories from Aurora StorePanel metadata before text fallback", () => {
    const baseItemTemplate = objects.find((object) => object.kind === "items")!;
    const itemTemplates = [
      {
        ...baseItemTemplate,
        id: "itm_store_panel_armor",
        tag: "MISC_BOX",
        resRef: "misc_box",
        name: "Misc Box",
        itemProperties: {
          ...baseItemTemplate.itemProperties,
          baseItemStorePanel: 0,
          baseItemStorePanelSort: 10
        }
      },
      {
        ...baseItemTemplate,
        id: "itm_store_panel_potion",
        tag: "PLAIN_VIAL",
        resRef: "plain_vial",
        name: "Plain Vial",
        itemProperties: {
          ...baseItemTemplate.itemProperties,
          baseItemStorePanel: 2,
          baseItemStorePanelSort: 0
        }
      },
      {
        ...baseItemTemplate,
        id: "itm_store_panel_magic",
        tag: "PLAIN_BAND",
        resRef: "plain_band",
        name: "Plain Band",
        itemProperties: {
          ...baseItemTemplate.itemProperties,
          baseItemStorePanel: 3,
          baseItemStorePanelSort: 0
        }
      },
      {
        ...baseItemTemplate,
        id: "itm_store_panel_creature_weapon",
        tag: "WEAPON_BITE",
        resRef: "weapon_bite",
        name: "Weapon Bite",
        itemProperties: {
          ...baseItemTemplate.itemProperties,
          baseItemLabel: "cslashweapon",
          baseItemItemClass: "it_cr_sla",
          baseItemStorePanel: 1,
          baseItemStorePanelSort: 0
        }
      }
    ];

    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={itemTemplates}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        allowedCatalogTypes={["items"]}
        defaultActiveType="items"
      />
    );

    const itemCategories = screen.getByRole("group", { name: /item palette categories/i });
    expect(within(itemCategories).getByRole("button", { name: /armor 1/i })).toBeInTheDocument();
    expect(within(itemCategories).getByRole("button", { name: /weapons 0/i })).toBeInTheDocument();
    expect(
      within(itemCategories).getByRole("button", { name: /potions \/ scrolls 1/i })
    ).toBeInTheDocument();
    expect(
      within(itemCategories).getByRole("button", { name: /magic items 1/i })
    ).toBeInTheDocument();
    expect(
      within(itemCategories).getByRole("button", { name: /creature items 1/i })
    ).toBeInTheDocument();

    fireEvent.click(within(itemCategories).getByRole("button", { name: /armor 1/i }));
    expect(screen.getByRole("button", { name: /preview misc_box/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /preview plain_vial/i })).not.toBeInTheDocument();

    fireEvent.click(within(itemCategories).getByRole("button", { name: /potions \/ scrolls 1/i }));
    expect(screen.getByRole("button", { name: /preview plain_vial/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /preview misc_box/i })).not.toBeInTheDocument();

    fireEvent.click(within(itemCategories).getByRole("button", { name: /magic items 1/i }));
    expect(screen.getByRole("button", { name: /preview plain_band/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /preview weapon_bite/i })).not.toBeInTheDocument();

    fireEvent.click(within(itemCategories).getByRole("button", { name: /creature items 1/i }));
    expect(screen.getByRole("button", { name: /preview weapon_bite/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /preview plain_band/i })).not.toBeInTheDocument();
  });

  it("writes expected drag payload into dataTransfer and sets copy effect", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const list = screen.getByRole("list", { name: /placeables add list/i });
    const row = within(list).getByRole("button", { name: /plc_barrel_01/i });

    const setData = vi.fn();
    const dataTransfer = {
      effectAllowed: "",
      setData
    } as unknown as DataTransfer;

    fireEvent.dragStart(row, { dataTransfer });

    expect(dataTransfer.effectAllowed).toBe("copy");
    expect(setData).toHaveBeenCalledTimes(1);
    expect(setData).toHaveBeenCalledWith(
      "application/x-aurora-object-template",
      JSON.stringify({
        id: "plc_barrel_01",
        kind: "placeables",
        tag: "PLC_BARREL_01",
        resRef: "plc_a01",
        name: "PLC_BARREL_01"
      })
    );
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.add_objects.drag_started",
      expect.objectContaining({
        userId: "u_builder_001",
        objectId: "plc_barrel_01",
        objectKind: "placeables",
        objectType: "placeables"
      })
    );
  });

  it("writes backend sound positioning into sound drag payload", () => {
    const soundTemplate = {
      ...objects.find((object) => object.kind === "sounds")!,
      id: "snd_template_sound_dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      name: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        elevation: 0,
        maxVolumeDistance: 12,
        cutoffDistance: 24,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          timeWindow: "always",
          hourMask: "0xFFFFFF",
          active: true,
          whenToPlay: "always" as const,
          dayNight: "both" as const,
          hoursStart: 0,
          hoursEnd: 23,
          playStyle: "repeat" as const,
          playOrder: "random" as const,
          intervalMs: 4000,
          intervalVariationMs: 500,
          volume: 80,
          volumeVariation: 10,
          pitchVariation: 0,
          priority: 5,
          flags: { backendBenchmark: false },
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };

    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={[...objects, soundTemplate]}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const selector = screen.getByRole("combobox", { name: /add object type selector/i });
    fireEvent.change(selector, { target: { value: "sounds" } });

    const list = screen.getByRole("list", { name: /sounds add list/i });
    const row = within(list).getByRole("button", { name: /sound_dia_hakon_add_12/i });
    const setData = vi.fn();
    const dataTransfer = {
      effectAllowed: "",
      setData
    } as unknown as DataTransfer;

    fireEvent.dragStart(row, { dataTransfer });

    const serialized = setData.mock.calls[0]?.[1] as string;
    expect(JSON.parse(serialized)).toMatchObject({
      id: "snd_template_sound_dia_hakon_add_12",
      kind: "sounds",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific",
        preserve: {
          flags: { backendBenchmark: false },
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
  });

  it("emits backend sound template through the create action", () => {
    const onObjectCreate = vi.fn();
    const soundTemplate = {
      ...objects.find((object) => object.kind === "sounds")!,
      id: "snd_template_sound_dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      name: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        elevation: 0,
        maxVolumeDistance: 12,
        cutoffDistance: 24,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          flags: { backendBenchmark: false },
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };

    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={[...objects, soundTemplate]}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        onObjectCreate={onObjectCreate}
      />
    );

    const selector = screen.getByRole("combobox", { name: /add object type selector/i });
    fireEvent.change(selector, { target: { value: "sounds" } });

    const list = screen.getByRole("list", { name: /sounds add list/i });
    const row = within(list).getByRole("button", { name: /preview sound_dia_hakon_add_12/i });
    const item = row.closest("li");
    expect(item).not.toBeNull();
    fireEvent.click(
      within(item as HTMLElement).getByRole("button", { name: /place object on canvas/i })
    );

    expect(onObjectCreate).toHaveBeenCalledTimes(1);
    expect(onObjectCreate.mock.calls[0][0]).toMatchObject({
      id: "snd_template_sound_dia_hakon_add_12",
      kind: "sounds",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        preserve: {
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    });
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.add_objects.create_clicked",
      expect.objectContaining({
        userId: "u_builder_001",
        objectId: "snd_template_sound_dia_hakon_add_12",
        objectKind: "sounds",
        objectType: "sounds"
      })
    );
  });

  it("arms placement from a palette row double click", () => {
    const onObjectCreate = vi.fn();

    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        onObjectCreate={onObjectCreate}
      />
    );

    const list = screen.getByRole("list", { name: /placeables add list/i });
    const row = within(list).getByRole("button", { name: /preview plc_barrel_01/i });

    fireEvent.doubleClick(row);

    expect(onObjectCreate).toHaveBeenCalledTimes(1);
    expect(onObjectCreate.mock.calls[0][0]).toMatchObject({
      id: "plc_barrel_01",
      kind: "placeables",
      tag: "PLC_BARREL_01"
    });
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.add_objects.create_clicked",
      expect.objectContaining({
        userId: "u_builder_001",
        objectId: "plc_barrel_01",
        objectKind: "placeables",
        objectType: "placeables",
        source: "row_double_click"
      })
    );
  });

  it("marks the template that is armed for canvas placement", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        activeCreateObjectId="plc_barrel_01"
        onObjectCreate={vi.fn()}
      />
    );

    const list = screen.getByRole("list", { name: /placeables add list/i });
    const armedRow = within(list).getByRole("button", { name: /preview plc_barrel_01/i });
    const inactiveRow = within(list).getByRole("button", { name: /preview plc_table_02/i });

    expect(armedRow).toHaveClass("is-armed");
    expect(armedRow).toHaveAttribute("aria-current", "true");
    expect(within(armedRow).getByText("Armed")).toBeInTheDocument();
    expect(inactiveRow).not.toHaveClass("is-armed");
    expect(inactiveRow).not.toHaveAttribute("aria-current");
  });

  it("shows empty state message for selected type", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const selector = screen.getByRole("combobox", { name: /add object type selector/i });
    fireEvent.change(selector, { target: { value: "vfx" } });

    expect(screen.getByText(/no vfx objects available/i)).toBeInTheDocument();
  });

  it("deduplicates add templates by object kind and resref", () => {
    const duplicateTemplate = {
      ...objects.find((entry) => entry.id === "plc_table_02")!,
      id: "plc_table_02_dup",
      name: "PLACEABLES_013",
      tag: "PLACEABLES_013"
    };

    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={[...objects, duplicateTemplate]}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const selector = screen.getByRole("combobox", { name: /add object type selector/i });
    expect(within(selector).getByRole("option", { name: /placeables \(4\)/i })).toBeInTheDocument();

    const list = screen.getByRole("list", { name: /placeables add list/i });
    expect(within(list).getByText(/plc_table_02/i)).toBeInTheDocument();
    expect(within(list).queryByText(/placeables_013/i)).not.toBeInTheDocument();
    expect(within(list).getAllByText(/plc_a02/i)).toHaveLength(1);
  });

  it("supports placeables-only constrained mode and hides unsupported options", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        allowedCatalogTypes={["placeables"]}
        defaultActiveType="sounds"
        hideUnsupportedCatalogTypes
      />
    );

    const selector = screen.getByRole("combobox", { name: /add object type selector/i });
    expect(selector).toHaveValue("placeables");

    const options = within(selector).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveValue("placeables");
    expect(screen.queryByRole("option", { name: /sounds/i })).not.toBeInTheDocument();

    const list = screen.getByRole("list", { name: /placeables add list/i });
    expect(within(list).getByText(/plc_barrel_01/i)).toBeInTheDocument();
    expect(within(list).queryByText(/crt_devourer_01/i)).not.toBeInTheDocument();
  });

  it("renders backend preview URL when present on object", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={[
          ...objects,
          {
            ...objects[0],
            id: "plc_preview_01",
            tag: "plc_preview_01",
            resRef: "plc_preview_01",
            previewImageUrl: "/preview/plc_preview_01.png"
          }
        ]}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const image = screen.getByRole("img", { name: /plc_preview_01 2D preview/i });
    expect(image).toHaveAttribute("src", "/preview/plc_preview_01.png");

    fireEvent.error(image);

    expect(image.getAttribute("src") ?? "").toContain("data:image/svg+xml");
  });

  it("falls back to generated SVG when preview URL is missing or blank", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={[
          ...objects,
          {
            ...objects[0],
            id: "plc_preview_02",
            tag: "plc_preview_02",
            resRef: "plc_preview_02",
            previewImageUrl: "   "
          }
        ]}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const image = screen.getByRole("img", { name: /plc_preview_02 2D preview/i });
    expect(image.getAttribute("src") ?? "").toContain("data:image/svg+xml");
  });

  it("keeps forbidden types disabled and non-selectable when constrained without hiding", () => {
    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        allowedCatalogTypes={["placeables"]}
        defaultActiveType="placeables"
      />
    );

    const selector = screen.getByRole("combobox", { name: /add object type selector/i });
    const soundsOption = within(selector).getByRole("option", { name: /sounds \(2\)/i });
    expect(soundsOption).toBeDisabled();

    fireEvent.change(selector, { target: { value: "sounds" } });
    expect(selector).toHaveValue("placeables");
    expect(screen.getByRole("list", { name: /placeables add list/i })).toBeInTheDocument();
  });

  it("supports hidden type selector with fixed placeables mode and row click callback", () => {
    const onObjectPreviewSelect = vi.fn();

    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        defaultActiveType="sounds"
        showTypeSelector={false}
        onObjectPreviewSelect={onObjectPreviewSelect}
      />
    );

    expect(
      screen.queryByRole("combobox", { name: /add object type selector/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^type$/i)).not.toBeInTheDocument();

    const list = screen.getByRole("list", { name: /placeables add list/i });
    expect(within(list).getByText(/plc_barrel_01/i)).toBeInTheDocument();
    expect(within(list).queryByText(/sound_forest_01/i)).not.toBeInTheDocument();

    const filterInput = screen.getByRole("searchbox", { name: /filter objects/i });
    fireEvent.change(filterInput, { target: { value: "table" } });
    expect(within(list).getByText(/plc_table_02/i)).toBeInTheDocument();
    expect(within(list).queryByText(/plc_barrel_01/i)).not.toBeInTheDocument();

    const row = within(list).getByRole("button", { name: /plc_table_02/i });
    expect(within(row).getByText("Standard")).toBeInTheDocument();
    fireEvent.click(row);

    expect(onObjectPreviewSelect).toHaveBeenCalledTimes(1);
    expect(onObjectPreviewSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "plc_table_02",
        kind: "placeables",
        tag: "PLC_TABLE_02",
        resRef: "plc_a02"
      })
    );
  });

  it("supports keyboard preview and placement from add-object rows", () => {
    const onObjectPreviewSelect = vi.fn();
    const onObjectCreate = vi.fn();

    render(
      <SceneObjectAddPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        showTypeSelector={false}
        onObjectPreviewSelect={onObjectPreviewSelect}
        onObjectCreate={onObjectCreate}
      />
    );

    const list = screen.getByRole("list", { name: /placeables add list/i });
    const row = within(list).getByRole("button", { name: /preview plc_barrel_01/i });
    expect(row).toHaveAttribute("aria-keyshortcuts", "Enter Space Control+Enter Shift+Enter");

    fireEvent.keyDown(row, { key: "Enter" });
    expect(onObjectPreviewSelect).toHaveBeenCalledTimes(1);
    expect(onObjectCreate).not.toHaveBeenCalled();
    expect(onObjectPreviewSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: "plc_barrel_01",
        kind: "placeables"
      })
    );

    fireEvent.keyDown(row, { key: " " });
    expect(onObjectPreviewSelect).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(row, { key: "Enter", ctrlKey: true });
    expect(onObjectPreviewSelect).toHaveBeenCalledTimes(2);
    expect(onObjectCreate).toHaveBeenCalledTimes(1);
    expect(onObjectCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: "plc_barrel_01",
        kind: "placeables"
      })
    );
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.add_objects.create_clicked",
      expect.objectContaining({
        objectId: "plc_barrel_01",
        source: "row_keyboard"
      })
    );
  });

  it("supports click and drag on the same row without triggering preview from drag end click", () => {
    vi.useFakeTimers();
    try {
      const onObjectPreviewSelect = vi.fn();

      render(
        <SceneObjectAddPanel
          userId="u_builder_001"
          objects={objects}
          sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
          trackTelemetryEvent={trackTelemetryEvent}
          showTypeSelector={false}
          onObjectPreviewSelect={onObjectPreviewSelect}
        />
      );

      const list = screen.getByRole("list", { name: /placeables add list/i });
      const row = within(list).getByRole("button", { name: /preview plc_barrel_01/i });

      fireEvent.click(row);
      expect(onObjectPreviewSelect).toHaveBeenCalledTimes(1);

      const setData = vi.fn();
      const dataTransfer = {
        effectAllowed: "",
        setData
      } as unknown as DataTransfer;

      fireEvent.dragStart(row, { dataTransfer });
      expect(dataTransfer.effectAllowed).toBe("copy");
      expect(setData).toHaveBeenCalledTimes(1);

      fireEvent.dragEnd(row);
      fireEvent.click(row);
      expect(onObjectPreviewSelect).toHaveBeenCalledTimes(1);

      vi.runAllTimers();
      fireEvent.click(row);
      expect(onObjectPreviewSelect).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
