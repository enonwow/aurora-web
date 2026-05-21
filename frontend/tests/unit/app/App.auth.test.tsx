import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import { LAYOUT_THEME_STORAGE_KEY } from "../../../src/modules/layout/themeSettings";
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
  expect(await screen.findByText(/logged as/i)).toBeInTheDocument();
}

describe("App auth mock flow", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("shows login view by default with no workspace controls", () => {
    renderAtPath("/");
    expect(
      screen.getByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show debug panel/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save \(local draft\)/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /select object/i })).not.toBeInTheDocument();
  });

  it("redirects to workspace after sign in", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");
    expect(window.location.pathname).toBe("/app");
    expect(
      screen.getByRole("heading", { name: /aurora web workspace/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/scene\.edit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("enforces Aurora toolbar matrix for builder role", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    expect(screen.getByRole("button", { name: /^undo$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^redo$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^module$/i }));
    expect(screen.getByRole("button", { name: /save \(local draft\)/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create new module/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open existing module/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^selection$/i }));
    expect(screen.getByRole("button", { name: /select terrain/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select object/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^visibility$/i }));
    const showNoneButton = screen.getByRole("button", { name: /show none/i });
    expect(showNoneButton).toBeDisabled();
  });

  it("opens and closes keyboard shortcuts modal", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /shortcuts/i }));
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
    expect(screen.getByText(/ctrl\/cmd \+ z/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: /keyboard shortcuts/i })
    ).not.toBeInTheDocument();
  });

  it("opens quick options popup from top-right options button", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));
    expect(screen.getByRole("dialog", { name: /quick options/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /layout/i })).toBeInTheDocument();
    const styleSelect = screen.getByLabelText(/app style/i);
    expect(styleSelect).toHaveValue("aurora-deep-blue");
    expect(screen.getAllByRole("option")).toHaveLength(4);
    expect(screen.getByText(/expanded/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));
    expect(
      screen.queryByRole("dialog", { name: /quick options/i })
    ).not.toBeInTheDocument();
  });

  it("persists selected layout style in localStorage", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));
    const styleSelect = screen.getByLabelText(/app style/i);

    fireEvent.change(styleSelect, { target: { value: "forest-night" } });
    expect(styleSelect).toHaveValue("forest-night");
    expect(window.localStorage.getItem(LAYOUT_THEME_STORAGE_KEY)).toBe("forest-night");
    expect(document.documentElement.getAttribute("data-layout-theme")).toBe("forest-night");
  });

  it("loads saved layout style from localStorage on first render", async () => {
    window.localStorage.setItem(LAYOUT_THEME_STORAGE_KEY, "obsidian-slate");
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));
    expect(screen.getByLabelText(/app style/i)).toHaveValue("obsidian-slate");
    expect(document.documentElement.getAttribute("data-layout-theme")).toBe("obsidian-slate");
  });

  it("shows only role-appropriate toolbar groups for viewer", async () => {
    renderAtPath("/login");
    await signInAs("viewer.user", "viewer123");

    fireEvent.click(screen.getByRole("button", { name: /^camera$/i }));
    expect(screen.getByRole("button", { name: /reorient camera/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^visibility$/i }));
    expect(screen.getByRole("button", { name: /show all/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save \(local draft\)/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create new module/i })
    ).not.toBeInTheDocument();
  });

  it("shows DM runtime commands only for dm role", async () => {
    renderAtPath("/login");
    await signInAs("dm.user", "dm123");

    fireEvent.click(screen.getByRole("button", { name: /^dm commands$/i }));
    expect(screen.getByRole("button", { name: /spawn creature/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /spawn vfx/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save \(local draft\)/i })
    ).not.toBeInTheDocument();
  });

  it("shows auth error for invalid credentials", async () => {
    renderAtPath("/login");

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "builder.user" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrong-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/invalid username or password/i)
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });

  it("captures debug telemetry events and benchmark summary", async () => {
    renderAtPath("/login");

    await signInAs("admin.user", "admin123");
    fireEvent.click(screen.getByRole("button", { name: /show debug panel/i }));

    expect(await screen.findByText(/ui\.auth\.login_success/i)).toBeInTheDocument();
    expect(screen.getByText(/auth\.authenticate\.accepted/i)).toBeInTheDocument();
    expect(screen.getByText(/auth\.authorize\.completed/i)).toBeInTheDocument();
    expect(screen.getByText(/auth benchmark avg:/i)).toBeInTheDocument();
    expect(screen.getByText(/authorize benchmark avg:/i)).toBeInTheDocument();
  });

  it("hides workspace controls after sign out", async () => {
    renderAtPath("/login");

    await signInAs("dm.user", "dm123");

    fireEvent.click(screen.getByRole("button", { name: /show debug panel/i }));
    expect(screen.getByLabelText(/debug panel/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(
      await screen.findByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show debug panel/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/debug panel/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /spawn creature/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show all/i })).not.toBeInTheDocument();
  });

  it("guards direct /app access for anonymous user and rewrites route to /login", async () => {
    renderAtPath("/app");

    expect(
      screen.getByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save \(local draft\)/i })
    ).not.toBeInTheDocument();
  });
});
