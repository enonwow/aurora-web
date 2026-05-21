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

describe("Regression smoke: auth shell behavior", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
  });

  it("keeps anonymous users on login surface only", () => {
    renderAtPath("/");

    expect(
      screen.getByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^area$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^assets$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^render$/i })).not.toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: /^area$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^assets$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^render$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^admin$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^dm$/i })).not.toBeInTheDocument();
  });

  it("returns to clean login state after logout", async () => {
    renderAtPath("/login");
    await signInAs("dm.user", "dm123");

    fireEvent.click(screen.getByRole("button", { name: /show debug panel/i }));
    expect(screen.getByLabelText(/debug panel/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(
      await screen.findByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/debug panel/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^dm$/i })).not.toBeInTheDocument();
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
      await screen.findByText(/invalid username or password/i)
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });
});
