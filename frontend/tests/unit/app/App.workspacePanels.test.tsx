import { fireEvent, render, screen, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import { LAYOUT_SETTINGS_STORAGE_KEY } from "../../../src/modules/layout/layoutSettings";
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
    left: ["Tile Catalog", "Paint Tools", "Asset Browser"],
    right: ["Properties", "Transform", "Render Telemetry"]
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
      within(leftSidebarAfterRelogin).queryByRole("heading", { name: /^tile catalog$/i })
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
});
