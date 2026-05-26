import { fireEvent, render, screen, within } from "@testing-library/react";
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
});
