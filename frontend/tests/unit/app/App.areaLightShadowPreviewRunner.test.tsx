import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../../../src/App";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

describe("App area light shadow preview route", () => {
  beforeEach(() => {
    clearTelemetry();
    window.localStorage.clear();
  });

  it("renders the dev Area light shadow proof route without auth redirecting", () => {
    window.history.replaceState(
      {},
      "",
      "/dev/area-light-shadow-preview?areaId=area__winds_study"
    );

    render(<App />);

    const runner = screen.getByTestId("area-light-shadow-preview-runner");
    expect(runner).toHaveAttribute("data-render-status", "skipped-test");
    expect(runner).toHaveAttribute("data-area-id", "area__winds_study");
    expect(runner).toHaveAttribute("data-use-area-lighting", "true");
    expect(runner).toHaveAttribute("data-display-fog", "false");
    expect(
      screen.queryByRole("heading", { name: /sign in to aurora web/i })
    ).not.toBeInTheDocument();
  });
});
