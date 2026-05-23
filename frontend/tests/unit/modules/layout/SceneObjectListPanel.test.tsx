import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { createSceneObjectCatalogQueryFacade } from "../../../../src/modules/layout/application/sceneObjectCatalogQueryFacade";
import { SceneObjectListPanel } from "../../../../src/modules/layout/components/SceneObjectListPanel";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";

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
});
