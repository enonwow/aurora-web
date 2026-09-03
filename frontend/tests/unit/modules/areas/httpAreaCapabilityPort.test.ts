import { describe, expect, it, vi } from "vitest";
import { HttpAreaCapabilityPort } from "../../../../src/modules/areas/adapters/httpAreaCapabilityPort";
import { capabilityFixture } from "./areaCapabilityFixture";

describe("HttpAreaCapabilityPort", () => {
  it("loads and validates the authenticated capability catalog", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      contractVersion: "1.0.0",
      requestId: "request-1",
      data: capabilityFixture(),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaCapabilityPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1/",
    );

    await expect(port.getAreaCapabilities("access-token")).resolves.toEqual(capabilityFixture());
    expect(fetchStub).toHaveBeenCalledWith("http://localhost:3000/api/v1/areas/capabilities", {
      method: "GET",
      headers: { Accept: "application/json", Authorization: "Bearer access-token" },
    });
  });

  it("fails closed on a malformed success envelope", async () => {
    const malformed = structuredClone(capabilityFixture()) as any;
    malformed.summary.total = 3;
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      contractVersion: "1.0.0",
      requestId: "request-1",
      data: malformed,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaCapabilityPort(fetchStub as unknown as typeof fetch);
    await expect(port.getAreaCapabilities("access-token")).rejects.toMatchObject({
      name: "AreaCapabilityRequestError",
      code: "AREA_CAPABILITY_RESPONSE_INVALID",
    });
  });

  it("does not expose backend error details", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      contractVersion: "1.0.0",
      requestId: "request-1",
      error: { code: "FORBIDDEN", message: "secret detail", details: [], retryable: false },
    }), { status: 403, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaCapabilityPort(fetchStub as unknown as typeof fetch);
    await expect(port.getAreaCapabilities("access-token")).rejects.toMatchObject({
      name: "AreaCapabilityRequestError",
      status: 403,
      code: "FORBIDDEN",
      message: "The Area capability catalog request failed.",
    });
  });
});
