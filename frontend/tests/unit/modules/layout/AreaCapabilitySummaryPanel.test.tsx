import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AreaCapabilityFacade } from "../../../../src/modules/areas/application/areaCapabilityFacade";
import { AreaCapabilitySummaryPanel } from "../../../../src/modules/layout/components/AreaCapabilitySummaryPanel";
import { capabilityFixture } from "../areas/areaCapabilityFixture";

describe("AreaCapabilitySummaryPanel", () => {
  it("shows exact derived implementation and release totals", async () => {
    const facade: AreaCapabilityFacade = {
      load: vi.fn().mockResolvedValue({ ok: true, value: capabilityFixture() }),
    };
    render(
      <AreaCapabilitySummaryPanel
        accessToken="token-1"
        facade={facade}
        trackTelemetryEvent={vi.fn()}
      />,
    );

    expect(screen.getByText("Loading capability catalog…")).toBeInTheDocument();
    await screen.findByText("1 available · 0 blocked · 1 hidden");
    expect(screen.getByText("1 implemented · 0 partial · 0 preserve-only · 1 not started"))
      .toBeInTheDocument();
    expect(screen.getByText("Catalog 2026-08-20.1 · 2 capabilities")).toBeInTheDocument();
    expect(facade.load).toHaveBeenCalledWith("token-1");
  });

  it("fails closed and retries only on an explicit action", async () => {
    const facade: AreaCapabilityFacade = {
      load: vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          error: { code: "PORT_FAILURE", message: "Could not load.", retryable: true },
        })
        .mockResolvedValueOnce({ ok: true, value: capabilityFixture() }),
    };
    render(
      <AreaCapabilitySummaryPanel
        accessToken="token-1"
        facade={facade}
        trackTelemetryEvent={vi.fn()}
      />,
    );
    await screen.findByText("Could not load.");
    expect(screen.getByText("Capability availability is blocked until the catalog loads."))
      .toBeInTheDocument();
    expect(facade.load).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry capability catalog" }));
    await screen.findByText("1 available · 0 blocked · 1 hidden");
    await waitFor(() => expect(facade.load).toHaveBeenCalledTimes(2));
  });

  it("does not query without an authenticated token", () => {
    const facade: AreaCapabilityFacade = { load: vi.fn() };
    render(
      <AreaCapabilitySummaryPanel
        accessToken={null}
        facade={facade}
        trackTelemetryEvent={vi.fn()}
      />,
    );
    expect(screen.getByText("Capability catalog requires an authenticated session."))
      .toBeInTheDocument();
    expect(facade.load).not.toHaveBeenCalled();
  });
});
