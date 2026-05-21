import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
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
  });

  it("shows login view by default", () => {
    renderAtPath("/");
    expect(
      screen.getByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show debug panel/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /area/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /assets/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /render/i })).not.toBeInTheDocument();
  });

  it("redirects to main view after sign in", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");
    expect(window.location.pathname).toBe("/app");
    expect(
      screen.getByRole("heading", { name: /aurora web workspace/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/scene\.edit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /area/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /assets/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /render/i })).toBeInTheDocument();

    const topbarActions = screen.getByTestId("topbar-actions");
    expect(topbarActions).toContainElement(
      screen.getByRole("button", { name: /sign out/i })
    );
  });

  it("shows only builder topbar options for builder role", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    expect(screen.getByRole("button", { name: /^area$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^assets$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^render$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^dm$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^admin$/i })).not.toBeInTheDocument();
  });

  it("shows only viewer topbar options for viewer role", async () => {
    renderAtPath("/login");
    await signInAs("viewer.user", "viewer123");

    expect(screen.getByRole("button", { name: /^area$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^assets$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^render$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^dm$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^admin$/i })).not.toBeInTheDocument();
  });

  it("shows only DM topbar options for dm role", async () => {
    renderAtPath("/login");
    await signInAs("dm.user", "dm123");

    expect(screen.getByRole("button", { name: /^area$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^dm$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^render$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^assets$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^admin$/i })).not.toBeInTheDocument();
  });

  it("shows admin topbar options for admin role", async () => {
    renderAtPath("/login");
    await signInAs("admin.user", "admin123");

    expect(screen.getByRole("button", { name: /^area$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^assets$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^render$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^admin$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^dm$/i })).not.toBeInTheDocument();
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

  it("hides debug controls after sign out", async () => {
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
    expect(screen.queryByRole("button", { name: /area/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /assets/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /render/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toHaveValue("");
    expect(screen.getByLabelText(/password/i)).toHaveValue("");
    expect(screen.queryByText(/invalid username or password/i)).not.toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: /^area$/i })).not.toBeInTheDocument();
  });
});
