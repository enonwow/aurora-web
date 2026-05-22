import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import {
  LAYOUT_SETTINGS_STORAGE_KEY
} from "../../../src/modules/layout/layoutSettings";
import {
  WORKSPACE_OPTIONS_STORAGE_KEY
} from "../../../src/modules/layout/workspaceOptionSettings";
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

describe("Regression smoke: workspace interactions", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("keeps visibility drawer open while applying actions", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /^visibility$/i }));
    expect(await screen.findByLabelText(/visibility commands/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show creatures/i }));
    expect(await screen.findByLabelText(/visibility commands/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show items/i }));
    expect(await screen.findByLabelText(/visibility commands/i)).toBeInTheDocument();
  });

  it("applies show none and show all visibility matrix correctly", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /^visibility$/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));
    fireEvent.change(screen.getByLabelText(/grid step/i), {
      target: { value: "2.5" }
    });
    fireEvent.click(screen.getByLabelText(/autosave enabled/i));

    let raw = window.localStorage.getItem(WORKSPACE_OPTIONS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    let parsed = JSON.parse(raw ?? "{}");
    expect(parsed.snapGridStep).toBe(2.5);
    expect(parsed.autosaveEnabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();

    await signInAs("builder.user", "builder123");
    fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));
    expect(await screen.findByLabelText(/grid step/i)).toHaveValue(2.5);
    expect(screen.getByLabelText(/autosave enabled/i)).not.toBeChecked();
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

    fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));
    expect(await screen.findByRole("dialog", { name: /quick options/i })).toBeInTheDocument();

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
    expect(await screen.findByLabelText(/module commands/i)).toBeInTheDocument();

    const visibilityTab = screen.getByRole("button", { name: /^visibility$/i });
    fireEvent.mouseEnter(visibilityTab);
    expect(await screen.findByLabelText(/visibility commands/i)).toBeInTheDocument();
  });

  it("closes drawer when clicking outside topbar center", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /^module$/i }));
    expect(await screen.findByLabelText(/module commands/i)).toBeInTheDocument();

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

    fireEvent.click(screen.getByRole("button", { name: /^canvas$/i }));
    expect(await screen.findByLabelText(/canvas commands/i)).toBeInTheDocument();

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
});
