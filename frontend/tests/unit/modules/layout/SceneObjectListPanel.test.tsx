import { fireEvent, render, screen, within } from "@testing-library/react";
import { SceneObjectListPanel } from "../../../../src/modules/layout/components/SceneObjectListPanel";
import { createSeedAreaScene } from "../../../../src/modules/scene/sceneFactory";

describe("SceneObjectListPanel", () => {
  const objects = createSeedAreaScene().objects;

  it("renders total object count and defaults to placeables", () => {
    render(<SceneObjectListPanel userId="u_builder_001" objects={objects} />);

    expect(screen.getByRole("heading", { name: /^scene objects$/i })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();

    const selector = screen.getByRole("combobox", { name: /object type selector/i });
    expect(selector).toHaveValue("placeables");
    expect(screen.getByText(/plc_barrel_01/i)).toBeInTheDocument();
  });

  it("switches type groups and shows empty state for post-mvp categories", () => {
    render(<SceneObjectListPanel userId="u_builder_001" objects={objects} />);

    const selector = screen.getByRole("combobox", { name: /object type selector/i });
    fireEvent.change(selector, { target: { value: "doors" } });
    expect(screen.getByText(/door_west_01/i)).toBeInTheDocument();
    expect(screen.queryByText(/plc_barrel_01/i)).not.toBeInTheDocument();

    fireEvent.change(selector, { target: { value: "triggers" } });
    expect(screen.getByText(/no triggers objects in current area/i)).toBeInTheDocument();
  });

  it("filters rows by tag or resref", () => {
    render(<SceneObjectListPanel userId="u_builder_001" objects={objects} />);

    const filter = screen.getByRole("searchbox", { name: /filter objects/i });
    fireEvent.change(filter, { target: { value: "chair" } });
    expect(screen.getByText(/plc_chair_03/i)).toBeInTheDocument();
    expect(screen.queryByText(/plc_barrel_01/i)).not.toBeInTheDocument();

    fireEvent.change(filter, { target: { value: "plc_a03" } });
    expect(screen.getByText(/plc_crate_04/i)).toBeInTheDocument();
    expect(screen.queryByText(/plc_chair_03/i)).not.toBeInTheDocument();
  });

  it("emits select and context-menu callbacks with object payload", () => {
    const onObjectSelect = vi.fn();
    const onObjectContextMenu = vi.fn();

    render(
      <SceneObjectListPanel
        userId="u_builder_001"
        objects={objects}
        onObjectSelect={onObjectSelect}
        onObjectContextMenu={onObjectContextMenu}
      />
    );

    const list = screen.getByRole("list", { name: /placeables list/i });
    const row = within(list).getByRole("button", { name: /plc_barrel_01/i });

    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-selected", "true");
    expect(onObjectSelect).toHaveBeenCalledTimes(1);
    expect(onObjectSelect.mock.calls[0][0].id).toBe("plc_barrel_01");

    fireEvent.contextMenu(row, { clientX: 222, clientY: 144 });
    expect(onObjectContextMenu).toHaveBeenCalledTimes(1);
    expect(onObjectContextMenu.mock.calls[0][0].id).toBe("plc_barrel_01");
    expect(onObjectContextMenu.mock.calls[0][1]).toBe(222);
    expect(onObjectContextMenu.mock.calls[0][2]).toBe(144);
  });
});

