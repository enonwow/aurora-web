import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import {
  LAYOUT_SETTINGS_STORAGE_KEY
} from "../../../src/modules/layout/layoutSettings";
import {
  WORKSPACE_OPTIONS_STORAGE_KEY
} from "../../../src/modules/layout/workspaceOptionSettings";
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

async function openQuickOptionsDialog() {
  fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));
  return screen.findByRole("dialog", { name: /quick options/i }, { timeout: 5000 });
}

async function openCanvasCommands() {
  const canvasTab = screen.getByRole("button", { name: /^canvas$/i });
  fireEvent.click(canvasTab);
  await waitFor(() => {
    expect(canvasTab).toHaveAttribute("aria-expanded", "true");
  });
  expect(await screen.findByLabelText(/canvas commands/i, {}, { timeout: 5000 })).toBeInTheDocument();
}

describe("Regression smoke: workspace interactions", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("keeps visibility drawer open while applying actions", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const visibilityTab = screen.getByRole("button", { name: /^visibility$/i });
    fireEvent.click(visibilityTab);
    await waitFor(() => {
      expect(visibilityTab).toHaveAttribute("aria-expanded", "true");
    });
    expect(
      await screen.findByLabelText(/visibility commands/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show creatures/i }));
    expect(
      await screen.findByLabelText(/visibility commands/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show items/i }));
    expect(
      await screen.findByLabelText(/visibility commands/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();
  });

  it("applies show none and show all visibility matrix correctly", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const visibilityTab = screen.getByRole("button", { name: /^visibility$/i });
    fireEvent.click(visibilityTab);
    await waitFor(() => {
      expect(visibilityTab).toHaveAttribute("aria-expanded", "true");
    });

    const showNone = screen.getByRole("button", { name: /show none/i });
    fireEvent.click(showNone);
    expect(showNone.className).toContain("is-active");

    const visibilityButtons = [
      /show creatures/i,
      /show doors/i,
      /show items/i,
      /show placeables/i,
      /show sounds/i
    ];

    visibilityButtons.forEach((matcher) => {
      expect(screen.getByRole("button", { name: matcher }).className).not.toContain("is-active");
    });

    fireEvent.click(screen.getByRole("button", { name: /show all/i }));
    expect(showNone.className).not.toContain("is-active");
    visibilityButtons.forEach((matcher) => {
      expect(screen.getByRole("button", { name: matcher }).className).toContain("is-active");
    });
  });

  it("opens object context menu from scene list and closes it on Escape", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });

    expect(screen.getByRole("menu", { name: /object context menu/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("menu", { name: /object context menu/i })).not.toBeInTheDocument();
  });

  it("keeps object catalog interactive for type switch and filtering", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const typeSelector = within(rightSidebar).getByRole("combobox", {
      name: /object type selector/i
    });
    const filterInput = within(rightSidebar).getByRole("searchbox", {
      name: /filter objects/i
    });

    fireEvent.change(typeSelector, { target: { value: "sounds" } });
    expect(within(rightSidebar).getByText(/sound_forest_01/i)).toBeInTheDocument();

    fireEvent.change(filterInput, { target: { value: "caves" } });
    expect(within(rightSidebar).getByText(/sound_caves_02/i)).toBeInTheDocument();
    expect(within(rightSidebar).queryByText(/sound_forest_01/i)).not.toBeInTheDocument();

    fireEvent.change(filterInput, { target: { value: "" } });
    expect(within(rightSidebar).getByText(/sound_forest_01/i)).toBeInTheDocument();
    expect(within(rightSidebar).getByText(/sound_caves_02/i)).toBeInTheDocument();

    fireEvent.change(typeSelector, { target: { value: "vfx" } });
    expect(within(rightSidebar).getByText(/no vfx objects in current area/i)).toBeInTheDocument();
  });

  it("persists workspace options across logout/login without page refresh", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openQuickOptionsDialog();
    fireEvent.change(screen.getByLabelText(/grid step/i), {
      target: { value: "2.5" }
    });

    let raw = window.localStorage.getItem(WORKSPACE_OPTIONS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    let parsed = JSON.parse(raw ?? "{}");
    expect(parsed.snapGridStep).toBe(2.5);

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();

    await signInAs("builder.user", "builder123");
    await openQuickOptionsDialog();
    expect(await screen.findByLabelText(/grid step/i)).toHaveValue(2.5);
  });

  it("supports collapsing sidebars and restoring them by clicking collapsed strips", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /collapse left panel/i }));
    fireEvent.click(screen.getByRole("button", { name: /collapse right panel/i }));

    const leftSidebar = screen.getByLabelText(/left sidebar/i);
    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    expect(leftSidebar.className).toContain("is-collapsed");
    expect(rightSidebar.className).toContain("is-collapsed");

    fireEvent.click(leftSidebar);
    fireEvent.click(rightSidebar);

    expect(within(leftSidebar).getByRole("heading", { name: /^tile catalog$/i })).toBeInTheDocument();
    expect(within(rightSidebar).getByRole("heading", { name: /^scene objects$/i })).toBeInTheDocument();

    const storedRaw = window.localStorage.getItem(LAYOUT_SETTINGS_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw ?? "{}");
    expect(stored.leftSidebarCollapsed).toBe(false);
    expect(stored.rightSidebarCollapsed).toBe(false);
  });

  it("closes quick options dialog with Escape", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    expect(await openQuickOptionsDialog()).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /quick options/i })).not.toBeInTheDocument();
    });
  });

  it("closes debug panel with backdrop click", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /show debug panel/i }));
    expect(await screen.findByRole("dialog", { name: /debug panel/i })).toBeInTheDocument();

    fireEvent.mouseDown(document.querySelector(".debug-backdrop") as Element);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /debug panel/i })).not.toBeInTheDocument();
    });
  });

  it("switches active drawer group on hover when drawer is open", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const moduleTab = screen.getByRole("button", { name: /^module$/i });
    fireEvent.click(moduleTab);
    await waitFor(() => {
      expect(moduleTab).toHaveAttribute("aria-expanded", "true");
    });
    expect(await screen.findByLabelText(/module commands/i, {}, { timeout: 5000 })).toBeInTheDocument();

    const visibilityTab = screen.getByRole("button", { name: /^visibility$/i });
    fireEvent.mouseEnter(visibilityTab);
    expect(
      await screen.findByLabelText(/visibility commands/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();
  });

  it("closes drawer when clicking outside topbar center", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const moduleTab = screen.getByRole("button", { name: /^module$/i });
    fireEvent.click(moduleTab);
    await waitFor(() => {
      expect(moduleTab).toHaveAttribute("aria-expanded", "true");
    });
    expect(await screen.findByLabelText(/module commands/i, {}, { timeout: 5000 })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByLabelText(/module commands/i)).not.toBeInTheDocument();
    });
  });

  it("closes shortcuts dialog on backdrop click", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /shortcuts/i }));
    expect(await screen.findByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();

    fireEvent.mouseDown(document.querySelector(".shortcuts-backdrop") as Element);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
    });
  });

  it("copies and deletes selected object from canvas commands", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    const canvasTab = screen.getByRole("button", { name: /^canvas$/i });
    fireEvent.click(canvasTab);
    await waitFor(() => {
      expect(canvasTab).toHaveAttribute("aria-expanded", "true");
    });
    expect(await screen.findByLabelText(/canvas commands/i, {}, { timeout: 5000 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /copy sel/i }));
    const copiedRow = await within(rightSidebar).findByRole("button", {
      name: /plc_barrel_01_copy/i
    });
    expect(copiedRow).toBeInTheDocument();

    fireEvent.click(copiedRow);
    fireEvent.click(screen.getByRole("button", { name: /delete sel/i }));

    await waitFor(() => {
      expect(
        within(rightSidebar).queryByRole("button", { name: /plc_barrel_01_copy/i })
      ).not.toBeInTheDocument();
    });
  });

  it("supports undo and redo for copied object from canvas commands", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    const canvasTab = screen.getByRole("button", { name: /^canvas$/i });
    fireEvent.click(canvasTab);
    await waitFor(() => {
      expect(canvasTab).toHaveAttribute("aria-expanded", "true");
    });
    expect(await screen.findByLabelText(/canvas commands/i, {}, { timeout: 5000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /copy sel/i }));

    expect(
      await within(rightSidebar).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();

    const quickActions = screen.getByLabelText(/quick actions/i);
    fireEvent.click(within(quickActions).getByRole("button", { name: /^undo$/i }));
    await waitFor(() => {
      expect(
        within(rightSidebar).queryByRole("button", {
          name: /plc_barrel_01_copy/i
        })
      ).not.toBeInTheDocument();
    });

    fireEvent.click(within(quickActions).getByRole("button", { name: /^redo$/i }));
    expect(
      await within(rightSidebar).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();
  });

  it("saves local draft with copied object and restores it after relogin", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    const canvasTab = screen.getByRole("button", { name: /^canvas$/i });
    fireEvent.click(canvasTab);
    await waitFor(() => {
      expect(canvasTab).toHaveAttribute("aria-expanded", "true");
    });
    fireEvent.click(screen.getByRole("button", { name: /copy sel/i }));
    expect(
      await within(rightSidebar).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^module$/i }));
    expect(
      await screen.findByRole("button", { name: /save \(local draft\)/i }, { timeout: 5000 })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /save \(local draft\)/i }));

    const draft = loadLocalSceneDraft("u_builder_001", window.localStorage);
    expect(draft).not.toBeNull();
    expect(draft?.source).toBe("local_draft");
    expect(draft?.objects.some((object) => object.tag.endsWith("_COPY"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();

    await signInAs("builder.user", "builder123");
    const rightSidebarAfterRelog = screen.getByLabelText(/right sidebar/i);
    expect(
      await within(rightSidebarAfterRelog).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();
  });

  it("supports ctrl multi-select from scene object list in all scope", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const rowA = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const rowB = within(rightSidebar).getByRole("button", { name: /plc_table_02/i });

    fireEvent.click(rowA);
    await waitFor(() => {
      expect(rowA).toHaveAttribute("aria-selected", "true");
      expect(rowB).toHaveAttribute("aria-selected", "false");
    });

    fireEvent.click(rowB, { ctrlKey: true });
    await waitFor(() => {
      expect(rowA).toHaveAttribute("aria-selected", "true");
      expect(rowB).toHaveAttribute("aria-selected", "true");
    });
  });

  it("keeps selection scoped to active object type after switching category", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const typeSelector = within(rightSidebar).getByRole("combobox", {
      name: /object type selector/i
    });
    const placeableRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const creatureRow = within(rightSidebar).getByRole("button", { name: /crt_devourer_01/i });

    fireEvent.click(placeableRow);
    fireEvent.click(creatureRow, { ctrlKey: true });
    await waitFor(() => {
      expect(placeableRow).toHaveAttribute("aria-selected", "true");
      expect(creatureRow).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.change(typeSelector, { target: { value: "placeables" } });
    fireEvent.change(typeSelector, { target: { value: "all" } });

    const placeableRowAfter = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const creatureRowAfter = within(rightSidebar).getByRole("button", { name: /crt_devourer_01/i });
    await waitFor(() => {
      expect(placeableRowAfter).toHaveAttribute("aria-selected", "true");
      expect(creatureRowAfter).toHaveAttribute("aria-selected", "false");
    });
  });

  it("toggles off selected object when ctrl-clicking it again from scene list", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const rowA = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const rowB = within(rightSidebar).getByRole("button", { name: /plc_table_02/i });

    fireEvent.click(rowA);
    fireEvent.click(rowB, { ctrlKey: true });
    await waitFor(() => {
      expect(rowA).toHaveAttribute("aria-selected", "true");
      expect(rowB).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.click(rowB, { ctrlKey: true });
    await waitFor(() => {
      expect(rowA).toHaveAttribute("aria-selected", "true");
      expect(rowB).toHaveAttribute("aria-selected", "false");
    });
  });

  it("opens keyboard shortcuts with '?' and closes with Escape", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.keyDown(window, { key: "?" });
    expect(await screen.findByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
    });
  });

  it("saves local draft using Ctrl+S keyboard shortcut", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      expect(loadLocalSceneDraft("u_builder_001", window.localStorage)).not.toBeNull();
    });
    expect(loadLocalSceneDraft("u_builder_001", window.localStorage)?.source).toBe("local_draft");
  });

  it("supports undo and redo through keyboard shortcuts after copy", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    await openCanvasCommands();
    fireEvent.click(screen.getByRole("button", { name: /copy sel/i }));

    expect(
      await within(rightSidebar).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await waitFor(() => {
      expect(
        within(rightSidebar).queryByRole("button", { name: /plc_barrel_01_copy/i })
      ).not.toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(
      await within(rightSidebar).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();
  });

  it("cuts selected object with Ctrl+X and pastes it back with Ctrl+V", async () => {
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

  it("moves selected placeable with arrows and blocks movement for mixed selection with doors", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const placeableRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const doorRow = within(rightSidebar).getByRole("button", { name: /door_west_01/i });

    fireEvent.click(placeableRow);
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const beforeSingleMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const beforePlaceable = beforeSingleMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(beforePlaceable).toBeDefined();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const afterSingleMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const afterPlaceable = afterSingleMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect((afterPlaceable?.x ?? 0) - (beforePlaceable?.x ?? 0)).toBeGreaterThan(0);

    fireEvent.click(doorRow, { ctrlKey: true });
    await waitFor(() => {
      expect(placeableRow).toHaveAttribute("aria-selected", "true");
      expect(doorRow).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const beforeBlockedMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const beforeBlockedPlaceable = beforeBlockedMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    const beforeBlockedDoor = beforeBlockedMove?.objects.find((object) => object.tag === "DOOR_WEST_01");
    expect(beforeBlockedPlaceable).toBeDefined();
    expect(beforeBlockedDoor).toBeDefined();

    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const afterBlockedMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const afterBlockedPlaceable = afterBlockedMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    const afterBlockedDoor = afterBlockedMove?.objects.find((object) => object.tag === "DOOR_WEST_01");
    expect(afterBlockedPlaceable?.x).toBe(beforeBlockedPlaceable?.x);
    expect(afterBlockedPlaceable?.y).toBe(beforeBlockedPlaceable?.y);
    expect(afterBlockedDoor?.x).toBe(beforeBlockedDoor?.x);
    expect(afterBlockedDoor?.y).toBe(beforeBlockedDoor?.y);
  });

  it("duplicates and deletes an object from context menu actions", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    fireEvent.contextMenu(sourceRow, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^duplicate$/i }));

    const copiedRow = await within(rightSidebar).findByRole("button", {
      name: /plc_barrel_01_copy/i
    });
    expect(copiedRow).toBeInTheDocument();

    fireEvent.contextMenu(copiedRow, { clientX: 280, clientY: 220 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }));

    await waitFor(() => {
      expect(
        within(rightSidebar).queryByRole("button", { name: /plc_barrel_01_copy/i })
      ).not.toBeInTheDocument();
    });
  });

  it("blocks deleting selected placeable when placeables layer is locked", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    await openCanvasCommands();
    fireEvent.click(screen.getByRole("button", { name: /lock plc/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete sel/i }));

    expect(
      within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i })
    ).toBeInTheDocument();
  });

  it("persists app style theme across logout/login and reapplies document theme", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openQuickOptionsDialog();
    fireEvent.change(screen.getByLabelText(/app style/i), {
      target: { value: "forest-night" }
    });

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-layout-theme")).toBe("forest-night");
    });

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();

    await signInAs("builder.user", "builder123");
    await openQuickOptionsDialog();
    expect(screen.getByLabelText(/app style/i)).toHaveValue("forest-night");
    expect(document.documentElement.getAttribute("data-layout-theme")).toBe("forest-night");
  });

  it("persists selection box mode across logout/login", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openQuickOptionsDialog();
    fireEvent.change(screen.getByLabelText(/selection box mode/i), {
      target: { value: "add" }
    });
    expect(screen.getByLabelText(/selection box mode/i)).toHaveValue("add");

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();

    await signInAs("builder.user", "builder123");
    await openQuickOptionsDialog();
    expect(screen.getByLabelText(/selection box mode/i)).toHaveValue("add");
  });
});
