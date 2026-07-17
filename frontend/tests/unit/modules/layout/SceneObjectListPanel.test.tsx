import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { createSceneObjectCatalogQueryFacade } from "../../../../src/modules/layout/application/sceneObjectCatalogQueryFacade";
import { SceneObjectListPanel } from "../../../../src/modules/layout/components/SceneObjectListPanel";
import {
  createNewSceneObject,
  createSeedAreaScene
} from "../../../../src/modules/scene/domain/sceneFactory";

describe("SceneObjectListPanel", () => {
  const objects = createSeedAreaScene().objects;
  const sceneObjectCatalogQueryFacade = createSceneObjectCatalogQueryFacade();
  const trackTelemetryEvent = vi.fn();

  beforeEach(() => {
    trackTelemetryEvent.mockClear();
  });

  it("renders total object count and defaults to all types", () => {
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    expect(screen.getByRole("heading", { name: /^scene objects$/i })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();

    const selector = screen.getByRole("combobox", { name: /object type selector/i });
    expect(selector).toHaveValue("all");
    expect(screen.getByText(/plc_barrel_01/i)).toBeInTheDocument();
    expect(screen.getByText(/crt_devourer_01/i)).toBeInTheDocument();
  });

  it("shows an expanded thumbnail preview on hover", () => {
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const thumbnailImage = screen.getByRole("img", { name: /plc_barrel_01 2D preview/i });
    const thumbnail = thumbnailImage.closest(".scene-object-thumbnail");
    expect(thumbnail).not.toBeNull();

    fireEvent.mouseEnter(thumbnail as HTMLElement);

    const expandedPreview = document.querySelector(".thumbnail-hover-preview img");
    expect(expandedPreview).toHaveAttribute("src", thumbnailImage.getAttribute("src"));

    fireEvent.mouseLeave(thumbnail as HTMLElement);
    expect(document.querySelector(".thumbnail-hover-preview")).not.toBeInTheDocument();
  });

  it("uses a clean empty state for the all-objects view", () => {
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={[]}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    expect(screen.getByText("No objects in current area.")).toBeInTheDocument();
    expect(screen.queryByText(/no all objects/i)).not.toBeInTheDocument();
  });

  it("switches type groups and shows empty state for post-mvp categories", () => {
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const selector = screen.getByRole("combobox", { name: /object type selector/i });
    fireEvent.change(selector, { target: { value: "doors" } });
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.scene_objects.type_changed",
      expect.objectContaining({
        userId: "u_builder_001",
        objectType: "doors",
        source: "selector"
      })
    );
    expect(screen.getByText(/door_west_01/i)).toBeInTheDocument();
    expect(screen.queryByText(/plc_barrel_01/i)).not.toBeInTheDocument();

    fireEvent.change(selector, { target: { value: "vfx" } });
    expect(screen.getByText(/no vfx objects in current area/i)).toBeInTheDocument();
  });

  it("filters rows by tag or resref", () => {
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
      />
    );

    const input = screen.getByRole("searchbox", { name: /filter objects/i });
    fireEvent.change(input, { target: { value: "caves" } });
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.scene_objects.filter_changed",
      expect.objectContaining({
        userId: "u_builder_001",
        objectType: "all",
        query: "caves"
      })
    );
    expect(screen.getByText(/sound_caves_02/i)).toBeInTheDocument();
    expect(screen.queryByText(/sound_forest_01/i)).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "nw_battdevour" } });
    expect(screen.getByText(/crt_devourer_01/i)).toBeInTheDocument();
    expect(screen.queryByText(/plc_barrel_01/i)).not.toBeInTheDocument();
  });

  it("emits select and context-menu callbacks with object payload", () => {
    const onObjectSelect = vi.fn();
    const onObjectContextMenu = vi.fn();
    function ControlledPanel() {
      const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
      return (
        <SceneObjectListPanel
          userId="u_builder_001"
          objects={objects}
          sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
          trackTelemetryEvent={trackTelemetryEvent}
          selectedObjectIds={selectedObjectIds}
          onObjectSelect={(object, options) => {
            onObjectSelect(object, options);
            setSelectedObjectIds((current) => {
              if (!options?.additive) {
                return [object.id];
              }
              const allowedSet = new Set(options.allowedObjectIds);
              const scopedCurrent = current.filter((id) => allowedSet.has(id));
              if (scopedCurrent.includes(object.id)) {
                return scopedCurrent.filter((id) => id !== object.id);
              }
              return [...scopedCurrent, object.id];
            });
          }}
          onObjectContextMenu={onObjectContextMenu}
        />
      );
    }

    render(<ControlledPanel />);

    const list = screen.getByRole("list", { name: /all list/i });
    const row = within(list).getByRole("button", { name: /plc_barrel_01/i });

    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-selected", "true");
    expect(onObjectSelect).toHaveBeenCalledTimes(1);
    expect(onObjectSelect.mock.calls[0][0].id).toBe("plc_barrel_01");
    expect(onObjectSelect.mock.calls[0][1]).toMatchObject({
      additive: false,
      sourceType: "all"
    });
    expect(onObjectSelect.mock.calls[0][1]?.allowedObjectIds.length).toBe(12);
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.scene_objects.row_clicked",
      expect.objectContaining({
        userId: "u_builder_001",
        objectId: "plc_barrel_01",
        objectKind: "placeables",
        additive: false
      })
    );

    fireEvent.contextMenu(row, { clientX: 222, clientY: 144 });
    expect(onObjectContextMenu).toHaveBeenCalledTimes(1);
    expect(onObjectContextMenu.mock.calls[0][0].id).toBe("plc_barrel_01");
    expect(onObjectContextMenu.mock.calls[0][1]).toBe(222);
    expect(onObjectContextMenu.mock.calls[0][2]).toBe(144);
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.scene_objects.row_context_menu",
      expect.objectContaining({
        userId: "u_builder_001",
        objectId: "plc_barrel_01",
        objectKind: "placeables"
      })
    );
  });

  it("opens properties from a sound row through a stable row action", () => {
    const onObjectPropertiesOpen = vi.fn();
    const backendSoundObject = {
      ...createNewSceneObject("sounds", 4, 5, 77),
      id: "snd_template_sound_dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        x: 4,
        y: 5,
        z: 0,
        preserve: {
          flags: {},
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            category: "dialogue",
            format: "wav",
            spatialMode: "3d",
            playbackMode: "single",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={[backendSoundObject]}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        defaultActiveType="sounds"
        allowedCatalogTypes={["sounds"]}
        hideUnsupportedCatalogTypes
        onObjectPropertiesOpen={onObjectPropertiesOpen}
      />
    );

    const list = screen.getByRole("list", { name: /sounds list/i });
    const row = within(list).getByRole("button", { name: /sound_dia_hakon_add_12/i });
    const item = row.closest("li");
    expect(item).not.toBeNull();
    fireEvent.click(
      within(item as HTMLElement).getByRole("button", { name: /open object properties/i })
    );

    expect(onObjectPropertiesOpen).toHaveBeenCalledTimes(1);
    expect(onObjectPropertiesOpen.mock.calls[0][0]).toMatchObject({
      id: "snd_template_sound_dia_hakon_add_12",
      kind: "sounds",
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
      "ui.workspace.scene_objects.properties_opened",
      expect.objectContaining({
        userId: "u_builder_001",
        objectId: "snd_template_sound_dia_hakon_add_12",
        objectKind: "sounds",
        source: "scene_object_list"
      })
    );
  });

  it("opens properties from an item row through a stable row action", () => {
    const onObjectPropertiesOpen = vi.fn();
    const itemObject = {
      ...createNewSceneObject("items", 1.5, 5.5, 104),
      id: "itm_scene_nw_aarcl008",
      tag: "NW_AARCL008",
      resRef: "aarcl009",
      itemProperties: {
        localizedName: "Hide Armor",
        baseItem: 16,
        baseItemLabel: "Armor",
        cost: 19463,
        armorParts: {
          torso: 43,
          pelvis: 8
        },
        materialColors: {
          leather1: 5,
          metal1: 17
        }
      }
    };
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={[itemObject]}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        defaultActiveType="items"
        allowedCatalogTypes={["items"]}
        hideUnsupportedCatalogTypes
        onObjectPropertiesOpen={onObjectPropertiesOpen}
      />
    );

    const list = screen.getByRole("list", { name: /items list/i });
    const row = within(list).getByRole("button", { name: /nw_aarcl008/i });
    const item = row.closest("li");
    expect(item).not.toBeNull();
    fireEvent.click(
      within(item as HTMLElement).getByRole("button", { name: /open object properties/i })
    );

    expect(onObjectPropertiesOpen).toHaveBeenCalledTimes(1);
    expect(onObjectPropertiesOpen.mock.calls[0][0]).toMatchObject({
      id: "itm_scene_nw_aarcl008",
      kind: "items",
      itemProperties: {
        localizedName: "Hide Armor",
        baseItem: 16,
        baseItemLabel: "Armor",
        armorParts: {
          torso: 43,
          pelvis: 8
        }
      }
    });
    expect(trackTelemetryEvent).toHaveBeenCalledWith(
      "ui.workspace.scene_objects.properties_opened",
      expect.objectContaining({
        userId: "u_builder_001",
        objectId: "itm_scene_nw_aarcl008",
        objectKind: "items",
        source: "scene_object_list"
      })
    );
  });

  it("does not mark backend sound rows selected when selected ids are outside current rows", () => {
    const visibleBackendSound = {
      ...createNewSceneObject("sounds", 4, 5, 77),
      id: "snd_template_sound_dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        preserve: {
          flags: {},
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };
    const outOfSubsetBackendSound = {
      ...createNewSceneObject("sounds", 6, 7, 78),
      id: "snd_template_sound_dia_hakon_add_13",
      tag: "SOUND_DIA_HAKON_ADD_13",
      resRef: "dia_hakon_add_13",
      soundPositioning: {
        mode: "specific" as const,
        preserve: {
          flags: {},
          extra: {
            backendSoundId: "sound_dia_hakon_add_13",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };

    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={[visibleBackendSound]}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        defaultActiveType="sounds"
        allowedCatalogTypes={["sounds"]}
        hideUnsupportedCatalogTypes
        selectedObjectIds={[outOfSubsetBackendSound.id]}
      />
    );

    const list = screen.getByRole("list", { name: /sounds list/i });
    const row = within(list).getByRole("button", { name: /sound_dia_hakon_add_12/i });

    expect(row).toHaveAttribute("aria-selected", "false");
    expect(outOfSubsetBackendSound.soundPositioning.preserve.extra).toMatchObject({
      backendSoundId: "sound_dia_hakon_add_13",
      soundTemplateSource: "backend-catalog"
    });
  });

  it("marks rows selected from selectedObjectIds and supports ctrl multi-select intent", () => {
    const onObjectSelect = vi.fn();
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        selectedObjectIds={["plc_barrel_01", "plc_table_02"]}
        onObjectSelect={onObjectSelect}
      />
    );

    const list = screen.getByRole("list", { name: /all list/i });
    const rowA = within(list).getByRole("button", { name: /plc_barrel_01/i });
    const rowB = within(list).getByRole("button", { name: /plc_table_02/i });

    expect(rowA).toHaveAttribute("aria-selected", "true");
    expect(rowB).toHaveAttribute("aria-selected", "true");

    fireEvent.click(rowB, { ctrlKey: true });
    expect(onObjectSelect).toHaveBeenCalledTimes(1);
    expect(onObjectSelect.mock.calls[0][0].id).toBe("plc_table_02");
    expect(onObjectSelect.mock.calls[0][1]).toMatchObject({
      additive: true,
      sourceType: "all"
    });
  });

  it("sends category-scoped selection metadata when category is selected", () => {
    const onObjectSelect = vi.fn();
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        onObjectSelect={onObjectSelect}
      />
    );

    const selector = screen.getByRole("combobox", { name: /object type selector/i });
    fireEvent.change(selector, { target: { value: "doors" } });

    const list = screen.getByRole("list", { name: /doors list/i });
    const row = within(list).getByRole("button", { name: /door_west_01/i });
    fireEvent.click(row, { ctrlKey: true });

    expect(onObjectSelect).toHaveBeenCalledTimes(1);
    expect(onObjectSelect.mock.calls[0][1]).toMatchObject({
      additive: true,
      sourceType: "doors"
    });
    expect(onObjectSelect.mock.calls[0][1]?.allowedObjectIds.length).toBe(2);
  });

  it("keeps category scope ids even when filtered rows are narrower", () => {
    const onObjectSelect = vi.fn();
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        onObjectSelect={onObjectSelect}
      />
    );

    const selector = screen.getByRole("combobox", { name: /object type selector/i });
    const input = screen.getByRole("searchbox", { name: /filter objects/i });

    fireEvent.change(selector, { target: { value: "sounds" } });
    fireEvent.change(input, { target: { value: "caves" } });

    const list = screen.getByRole("list", { name: /sounds list/i });
    fireEvent.click(within(list).getByRole("button", { name: /sound_caves_02/i }));

    expect(onObjectSelect).toHaveBeenCalledTimes(1);
    expect(onObjectSelect.mock.calls[0][1]).toMatchObject({
      sourceType: "sounds"
    });
    expect(onObjectSelect.mock.calls[0][1]?.allowedObjectIds.length).toBe(2);
    expect(onObjectSelect.mock.calls[0][1]?.allowedObjectIds).toEqual(
      expect.arrayContaining(["snd_amb_01", "snd_amb_02"])
    );
  });

  it("emits catalog scope updates for all and selected category", () => {
    const onCatalogScopeChange = vi.fn();
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        onCatalogScopeChange={onCatalogScopeChange}
      />
    );

    expect(onCatalogScopeChange).toHaveBeenCalled();
    expect(onCatalogScopeChange.mock.calls[0][0]).toMatchObject({
      sourceType: "all"
    });
    expect(onCatalogScopeChange.mock.calls[0][0]?.allowedObjectIds.length).toBe(12);

    const selector = screen.getByRole("combobox", { name: /object type selector/i });
    fireEvent.change(selector, { target: { value: "doors" } });

    expect(onCatalogScopeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "doors",
        allowedObjectIds: expect.arrayContaining(["dr_nw_01", "dr_nw_02"])
      })
    );
  });

  it("supports placeables-only constrained mode and hides unsupported options", () => {
    const onCatalogScopeChange = vi.fn();
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        allowedCatalogTypes={["placeables"]}
        defaultActiveType="doors"
        hideUnsupportedCatalogTypes
        onCatalogScopeChange={onCatalogScopeChange}
      />
    );

    const selector = screen.getByRole("combobox", { name: /object type selector/i });
    expect(selector).toHaveValue("placeables");
    expect(screen.queryByRole("option", { name: /doors/i })).not.toBeInTheDocument();

    const list = screen.getByRole("list", { name: /placeables list/i });
    expect(within(list).getByText(/plc_barrel_01/i)).toBeInTheDocument();
    expect(within(list).queryByText(/door_west_01/i)).not.toBeInTheDocument();

    expect(onCatalogScopeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "placeables",
        allowedObjectIds: expect.arrayContaining([
          "plc_barrel_01",
          "plc_table_02",
          "plc_chair_03",
          "plc_crate_04"
        ])
      })
    );
  });

  it("keeps forbidden types disabled and non-selectable when constrained without hiding", () => {
    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={objects}
        sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
        trackTelemetryEvent={trackTelemetryEvent}
        allowedCatalogTypes={["placeables"]}
        defaultActiveType="placeables"
      />
    );

    const selector = screen.getByRole("combobox", { name: /object type selector/i });
    const doorsOption = within(selector).getByRole("option", { name: /doors \(2\)/i });
    expect(doorsOption).toBeDisabled();

    fireEvent.change(selector, { target: { value: "doors" } });
    expect(selector).toHaveValue("placeables");
    expect(screen.getByRole("list", { name: /placeables list/i })).toBeInTheDocument();
  });
});
