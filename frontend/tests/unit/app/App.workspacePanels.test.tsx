import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import { LAYOUT_SETTINGS_STORAGE_KEY } from "../../../src/modules/layout/layoutSettings";
import { loadLocalSceneDraft } from "../../../src/modules/scene/adapters/localDraftStore";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

function renderAtPath(pathname: string) {
  window.history.replaceState({}, "", pathname);
  return render(<App />);
}

async function signInAs(username: string, password: string) {
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: username }
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: password }
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByRole("button", { name: /sign out/i })).toBeInTheDocument();
}

const rolePanelExpectations = [
  {
    label: "viewer",
    username: "viewer.user",
    password: "viewer123",
    left: ["Area Navigator", "Visible Layers"],
    right: ["Area Snapshot", "Selection Inspector"]
  },
  {
    label: "builder",
    username: "builder.user",
    password: "builder123",
    left: ["Add Objects"],
    right: ["Scene Objects"]
  },
  {
    label: "dm",
    username: "dm.user",
    password: "dm123",
    left: ["Session Overview", "Spawn Palette"],
    right: ["Command Payload", "Delivery Status"]
  },
  {
    label: "admin",
    username: "admin.user",
    password: "admin123",
    left: ["Path Configuration", "Role Matrix", "Import/Export"],
    right: ["System Health", "Storage Buckets", "Audit Events"]
  }
] as const;

describe("App workspace side panels", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("keeps workspace panels hidden for anonymous users", () => {
    renderAtPath("/login");
    expect(screen.queryByLabelText(/workspace layout/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/workspace canvas/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/workspace render canvas/i)).not.toBeInTheDocument();
  });

  it.each(rolePanelExpectations)(
    "shows role-specific side panels for $label",
    async ({ username, password, left, right }) => {
      renderAtPath("/login");
      await signInAs(username, password);

      const leftSidebar = screen.getByLabelText(/left sidebar/i);
      const rightSidebar = screen.getByLabelText(/right sidebar/i);
      expect(screen.getByLabelText(/workspace render canvas/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/canvas runtime/i)).toBeInTheDocument();

      left.forEach((sectionHeading) => {
        expect(
          within(leftSidebar).getByRole("heading", {
            name: new RegExp(`^${sectionHeading}$`, "i")
          })
        ).toBeInTheDocument();
      });

      right.forEach((sectionHeading) => {
        expect(
          within(rightSidebar).getByRole("heading", {
            name: new RegExp(`^${sectionHeading}$`, "i")
          })
        ).toBeInTheDocument();
      });
    }
  );

  it("collapses and expands both side panels", async () => {
    renderAtPath("/login");
    await signInAs("admin.user", "admin123");

    const leftSidebar = screen.getByLabelText(/left sidebar/i);
    const rightSidebar = screen.getByLabelText(/right sidebar/i);

    expect(
      within(leftSidebar).getByRole("heading", { name: /^path configuration$/i })
    ).toBeInTheDocument();
    expect(
      within(rightSidebar).getByRole("heading", { name: /^system health$/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /collapse left panel/i }));
    fireEvent.click(screen.getByRole("button", { name: /collapse right panel/i }));

    expect(
      within(leftSidebar).queryByRole("heading", { name: /^path configuration$/i })
    ).not.toBeInTheDocument();
    expect(
      within(rightSidebar).queryByRole("heading", { name: /^system health$/i })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /expand left panel/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /expand right panel/i })
    ).not.toBeInTheDocument();

    fireEvent.click(leftSidebar);
    fireEvent.click(rightSidebar);

    expect(
      within(leftSidebar).getByRole("heading", { name: /^path configuration$/i })
    ).toBeInTheDocument();
    expect(
      within(rightSidebar).getByRole("heading", { name: /^system health$/i })
    ).toBeInTheDocument();
  });

  it("shows builder object lists grouped by type with 2d previews", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    expect(
      within(rightSidebar).getByRole("heading", { name: /^scene objects$/i })
    ).toBeInTheDocument();

    const typeSelector = within(rightSidebar).getByRole("combobox", {
      name: /object type selector/i
    });
    expect(typeSelector).toBeInTheDocument();
    expect(
      within(rightSidebar).getByRole("img", {
        name: /plc_barrel_01 2d preview/i
      })
    ).toBeInTheDocument();
    expect(within(rightSidebar).getByText(/plc_barrel_01/i)).toBeInTheDocument();
    expect(within(rightSidebar).getByText(/plc_a01/i)).toBeInTheDocument();

    fireEvent.change(typeSelector, { target: { value: "doors" } });

    expect(within(rightSidebar).getByText(/door_west_01/i)).toBeInTheDocument();
    expect(
      within(rightSidebar).getByRole("img", { name: /door_west_01 2d preview/i })
    ).toBeInTheDocument();
    expect(within(rightSidebar).queryByText(/plc_barrel_01/i)).not.toBeInTheDocument();

    fireEvent.change(typeSelector, { target: { value: "vfx" } });
    expect(within(rightSidebar).getByText(/no vfx objects in current area/i)).toBeInTheDocument();
  });

  it("filters builder scene objects by tag or resref", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const filterInput = within(rightSidebar).getByRole("searchbox", {
      name: /filter objects/i
    });

    fireEvent.change(filterInput, { target: { value: "chair" } });
    expect(within(rightSidebar).getByText(/plc_chair_03/i)).toBeInTheDocument();
    expect(within(rightSidebar).queryByText(/plc_barrel_01/i)).not.toBeInTheDocument();

    fireEvent.change(filterInput, { target: { value: "plc_a03" } });
    expect(within(rightSidebar).getByText(/plc_crate_04/i)).toBeInTheDocument();
    expect(within(rightSidebar).queryByText(/plc_chair_03/i)).not.toBeInTheDocument();
  });

  it("selects object on left click and opens context menu on right click from scene object list", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const targetRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    fireEvent.click(targetRow);
    expect(targetRow.className).toContain("is-selected");
    expect(targetRow).toHaveAttribute("aria-selected", "true");

    fireEvent.contextMenu(targetRow, { clientX: 220, clientY: 180 });
    expect(screen.getByRole("menu", { name: /object context menu/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^delete$/i })).toBeInTheDocument();
  });

  it("renders add panel type selector without all option", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const leftSidebar = screen.getByLabelText(/left sidebar/i);
    const addObjectsSection = within(leftSidebar).getByRole("article", {
      name: /add objects section/i
    });

    const addPanelSelector = within(addObjectsSection).getByRole("combobox", {
      name: /add object type selector/i
    }) as HTMLSelectElement;

    const optionValues = Array.from(addPanelSelector.options).map((option) =>
      option.value.toLowerCase()
    );
    expect(optionValues).not.toContain("all");
  });

  it("shows builder workspace mode switch and toggles panel behavior to placeables mode", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const leftSidebar = screen.getByLabelText(/left sidebar/i);
    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const areasModeButton = within(leftSidebar).getByRole("button", { name: /areas mode/i });
    const placeablesModeButton = within(leftSidebar).getByRole("button", {
      name: /placeables mode/i
    });

    expect(areasModeButton).toHaveAttribute("aria-pressed", "true");
    expect(
      within(leftSidebar).getByRole("heading", {
        name: /^areas$/i
      })
    ).toBeInTheDocument();
    expect(within(rightSidebar).getByText(/crt_devourer_01/i)).toBeInTheDocument();

    fireEvent.click(placeablesModeButton);

    expect(placeablesModeButton).toHaveAttribute("aria-pressed", "true");
    expect(
      within(leftSidebar).queryByRole("heading", {
        name: /^areas$/i
      })
    ).not.toBeInTheDocument();
    expect(within(rightSidebar).queryByText(/crt_devourer_01/i)).not.toBeInTheDocument();
    expect(within(rightSidebar).getByText(/plc_barrel_01/i)).toBeInTheDocument();
  });

  it("renders placeable, creature, and door properties panels from context flow", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const placeableRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.contextMenu(placeableRow, { clientX: 240, clientY: 180 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));

    const placeableDialog = await screen.findByRole("dialog", { name: /placeable properties/i });
    expect(within(placeableDialog).getByRole("button", { name: /^basic$/i })).toBeInTheDocument();
    expect(within(placeableDialog).getByRole("button", { name: /^scripts$/i })).toBeInTheDocument();
    expect(within(placeableDialog).getByRole("button", { name: /^advanced$/i })).toBeInTheDocument();
    fireEvent.click(within(placeableDialog).getByRole("button", { name: /^scripts$/i }));
    expect(within(placeableDialog).getByRole("textbox", { name: /onclick script/i })).toBeInTheDocument();
    fireEvent.click(within(placeableDialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i })).not.toBeInTheDocument();
    });

    const creatureRow = within(rightSidebar).getByRole("button", { name: /crt_devourer_01/i });
    fireEvent.contextMenu(creatureRow, { clientX: 270, clientY: 190 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));

    const creatureDialog = await screen.findByRole("dialog", { name: /creature properties/i });
    expect(within(creatureDialog).getByRole("button", { name: /^basic$/i })).toBeInTheDocument();
    expect(
      within(creatureDialog).getByRole("button", { name: /^statistics$/i })
    ).toBeInTheDocument();
    expect(within(creatureDialog).getByRole("button", { name: /^appearance$/i })).toBeInTheDocument();
    fireEvent.click(within(creatureDialog).getByRole("button", { name: /^scripts$/i }));
    expect(
      within(creatureDialog).getByRole("textbox", { name: /onblocked/i })
    ).toBeInTheDocument();
    fireEvent.click(within(creatureDialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i })).not.toBeInTheDocument();
    });

    const doorRow = within(rightSidebar).getByRole("button", { name: /door_west_01/i });
    fireEvent.contextMenu(doorRow, { clientX: 280, clientY: 210 });
    expect(screen.queryByRole("menuitem", { name: /^adjust location$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));

    const doorDialog = await screen.findByRole("dialog", { name: /door properties/i });
    fireEvent.click(within(doorDialog).getByRole("button", { name: /^area transition$/i }));
    expect(
      within(doorDialog).getByRole("textbox", { name: /destination tag/i })
    ).toBeInTheDocument();
  });

  it("restores collapsed sidebars after logout and next login", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /collapse left panel/i }));
    fireEvent.click(screen.getByRole("button", { name: /collapse right panel/i }));

    let storedRaw = window.localStorage.getItem(LAYOUT_SETTINGS_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();
    let stored = JSON.parse(storedRaw ?? "{}");
    expect(stored.leftSidebarCollapsed).toBe(true);
    expect(stored.rightSidebarCollapsed).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();

    await signInAs("builder.user", "builder123");

    const leftSidebarAfterRelogin = screen.getByLabelText(/left sidebar/i);
    const rightSidebarAfterRelogin = screen.getByLabelText(/right sidebar/i);
    expect(
      within(leftSidebarAfterRelogin).queryByRole("heading", { name: /^add objects$/i })
    ).not.toBeInTheDocument();
    expect(
      within(rightSidebarAfterRelogin).queryByRole("heading", { name: /^properties$/i })
    ).not.toBeInTheDocument();

    storedRaw = window.localStorage.getItem(LAYOUT_SETTINGS_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();
    stored = JSON.parse(storedRaw ?? "{}");
    expect(stored.leftSidebarCollapsed).toBe(true);
    expect(stored.rightSidebarCollapsed).toBe(true);
  });

  it("copies selected object via keyboard and deletes copied selection", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    const copiedRow = await within(rightSidebar).findByRole("button", {
      name: /plc_barrel_01_copy/i
    });
    expect(copiedRow).toBeInTheDocument();

    fireEvent.click(copiedRow);
    fireEvent.keyDown(window, { key: "Delete" });

    expect(
      within(rightSidebar).queryByRole("button", { name: /plc_barrel_01_copy/i })
    ).not.toBeInTheDocument();
  });

  it("cuts selected object via keyboard and pastes it back from clipboard", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    fireEvent.keyDown(window, { key: "x", ctrlKey: true });
    await waitFor(() => {
      expect(
        within(rightSidebar).queryByRole("button", { name: /plc_barrel_01/i })
      ).not.toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    expect(
      await within(rightSidebar).findByRole("button", { name: /plc_barrel_01/i })
    ).toBeInTheDocument();
  });

  it("moves selected placeable with arrow keys", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const placeableRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(placeableRow);
    fireEvent.contextMenu(placeableRow, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
    const propertiesDialog = await screen.findByRole("dialog", { name: /placeable properties/i });
    const staticCheckbox = within(propertiesDialog).getByRole("checkbox", {
      name: /static/i
    }) as HTMLInputElement;
    if (staticCheckbox.checked) {
      fireEvent.click(staticCheckbox);
    }
    fireEvent.click(within(propertiesDialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const beforeMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    expect(beforeMove).not.toBeNull();
    const beforeObject = beforeMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(beforeObject).toBeDefined();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    const afterMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    expect(afterMove).not.toBeNull();
    const afterObject = afterMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(afterObject).toBeDefined();
    expect((afterObject?.x ?? 0) - (beforeObject?.x ?? 0)).toBeGreaterThan(0);
    expect(afterObject?.y).toBe(beforeObject?.y);
  });

  it("blocks group move when selection contains a door", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const placeableRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const doorRow = within(rightSidebar).getByRole("button", { name: /door_west_01/i });
    fireEvent.click(placeableRow);
    fireEvent.click(doorRow, { ctrlKey: true });
    await waitFor(() => {
      expect(placeableRow).toHaveAttribute("aria-selected", "true");
      expect(doorRow).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const beforeMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    expect(beforeMove).not.toBeNull();
    const beforePlaceable = beforeMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    const beforeDoor = beforeMove?.objects.find((object) => object.tag === "DOOR_WEST_01");
    expect(beforePlaceable).toBeDefined();
    expect(beforeDoor).toBeDefined();

    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    const afterMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    expect(afterMove).not.toBeNull();
    const afterPlaceable = afterMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    const afterDoor = afterMove?.objects.find((object) => object.tag === "DOOR_WEST_01");
    expect(afterPlaceable?.x).toBe(beforePlaceable?.x);
    expect(afterPlaceable?.y).toBe(beforePlaceable?.y);
    expect(afterDoor?.x).toBe(beforeDoor?.x);
    expect(afterDoor?.y).toBe(beforeDoor?.y);
  });
});
