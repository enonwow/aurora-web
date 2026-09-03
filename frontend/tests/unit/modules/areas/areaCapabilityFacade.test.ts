import { describe, expect, it, vi } from "vitest";
import { createAreaCapabilityFacade } from "../../../../src/modules/areas/application/areaCapabilityFacade";
import type { AreaCapabilityPort } from "../../../../src/modules/areas/ports/areaCapabilityPort";
import { capabilityFixture } from "./areaCapabilityFixture";

describe("createAreaCapabilityFacade", () => {
  it("returns the exact catalog through the query port", async () => {
    const port: AreaCapabilityPort = {
      getAreaCapabilities: vi.fn().mockResolvedValue(capabilityFixture()),
    };
    const facade = createAreaCapabilityFacade(port);
    await expect(facade.load("token-1")).resolves.toEqual({
      ok: true,
      value: capabilityFixture(),
    });
    expect(port.getAreaCapabilities).toHaveBeenCalledWith("token-1");
  });

  it("maps an adapter exception to one bounded retryable failure", async () => {
    const port: AreaCapabilityPort = {
      getAreaCapabilities: vi.fn().mockRejectedValue(new Error("network detail")),
    };
    const facade = createAreaCapabilityFacade(port);
    await expect(facade.load("token-1")).resolves.toEqual({
      ok: false,
      error: {
        code: "PORT_FAILURE",
        message: "The Area capability catalog could not be loaded.",
        retryable: true,
      },
    });
  });
});
