import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

function renderAtPath(pathname: string) {
  window.history.replaceState({}, "", pathname);
  return render(<App />);
}

describe("App auth mock flow", () => {
  it("shows login view by default", () => {
    renderAtPath("/");
    expect(
      screen.getByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
  });

  it("redirects to main view after sign in", () => {
    renderAtPath("/login");

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "demo-user" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "demo-pass" }
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(window.location.pathname).toBe("/app");
    expect(
      screen.getByRole("heading", { name: /aurora web workspace/i })
    ).toBeInTheDocument();
  });

  it("captures debug telemetry events for login flow", () => {
    renderAtPath("/login");

    fireEvent.click(screen.getByRole("button", { name: /show debug panel/i }));
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "demo-user" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "demo-pass" }
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/auth.login_submit/i)).toBeInTheDocument();
    expect(screen.getByText(/auth.login_success/i)).toBeInTheDocument();
    expect(screen.getByText(/route: \/app/i)).toBeInTheDocument();
  });
});
