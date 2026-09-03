import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

describe("Regression smoke: auth shell behavior", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("keeps anonymous users on login surface only", () => {
    renderAtPath("/");

    expect(
      screen.getByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save \(local draft\)/i })
    ).not.toBeInTheDocument();
  });

  it("guards direct /app route for anonymous users", async () => {
    renderAtPath("/app");

    expect(
      screen.getByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
  });

  it("retains role-gated navigation after login", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");
    expect(screen.getByLabelText(/workspace render canvas/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^module$/i }));
    expect(
      await screen.findByRole("button", { name: /save \(local draft\)/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^selection$/i }));
    expect(screen.getByRole("button", { name: /select terrain/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select object/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /spawn creature/i })).not.toBeInTheDocument();
  });

  it("returns to clean login state after logout", async () => {
    renderAtPath("/login");
    await signInAs("dm.user", "dm123");

    fireEvent.click(screen.getByRole("button", { name: /show debug panel/i }));
    expect(screen.getByRole("dialog", { name: /debug panel/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(
      await screen.findByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /debug panel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /spawn creature/i })).not.toBeInTheDocument();
  });

  it("keeps rejected credentials on login with an explicit error", async () => {
    renderAtPath("/login");

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "admin.user" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "bad-pass" }
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/login failed/i)
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });

  it("keeps sidebar collapse state after logout and relogin", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /collapse left panel/i }));
    fireEvent.click(screen.getByRole("button", { name: /collapse right panel/i }));

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();

    await signInAs("builder.user", "builder123");

    const leftSidebar = screen.getByLabelText(/left sidebar/i);
    const rightSidebar = screen.getByLabelText(/right sidebar/i);

    expect(leftSidebar.className).toContain("is-collapsed");
    expect(rightSidebar.className).toContain("is-collapsed");

    const storedRaw = window.localStorage.getItem(LAYOUT_SETTINGS_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw ?? "{}");
    expect(stored.leftSidebarCollapsed).toBe(true);
    expect(stored.rightSidebarCollapsed).toBe(true);
  });

  it("can hide controls hint from canvas menu", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    expect(screen.getByRole("note", { name: /controls hint/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/canvas runtime/i)).toBeInTheDocument();
    const canvasTab = screen.getByRole("button", { name: /^canvas$/i });
    fireEvent.click(canvasTab);
    // Stryker dry-runs can reorder/slow topbar transitions, so we gate on drawer presence.
    if (!screen.queryByLabelText(/canvas commands/i)) {
      fireEvent.click(canvasTab);
    }
    expect(await screen.findByLabelText(/canvas commands/i, {}, { timeout: 5000 })).toBeInTheDocument();
    const compactCommands = screen.getByLabelText(/canvas compact commands/i);
    fireEvent.click(within(compactCommands).getByText(/advanced debug/i, { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: /controls hint/i }));
    fireEvent.click(screen.getByRole("button", { name: /runtime popup/i }));
    expect(screen.queryByRole("note", { name: /controls hint/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/canvas runtime/i)).not.toBeInTheDocument();
  });

  it("shows DM command group for dm role and hides module save action", async () => {
    renderAtPath("/login");
    await signInAs("dm.user", "dm123");

    const dmTab = screen.getByRole("button", { name: /dm commands/i });
    fireEvent.click(dmTab);
    await waitFor(() => {
      expect(dmTab.className).toContain("is-active");
    });

    expect(await screen.findByRole("button", { name: /spawn creature/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save \(local draft\)/i })).not.toBeInTheDocument();
  });

  it("keeps viewer role read-only toolbar surface", async () => {
    renderAtPath("/login");
    await signInAs("viewer.user", "viewer123");

    const quickActions = screen.getByLabelText(/quick actions/i);
    expect(within(quickActions).getByRole("button", { name: /fit area/i })).toBeInTheDocument();
    expect(within(quickActions).queryByRole("button", { name: /delete selected/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dm commands/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^module$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^camera$/i })).toBeInTheDocument();
  });
});
