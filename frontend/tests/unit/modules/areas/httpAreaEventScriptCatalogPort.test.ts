import { describe, expect, it, vi } from "vitest";
import {
  AreaEventScriptCatalogRequestError,
  HttpAreaEventScriptCatalogPort,
} from "../../../../src/modules/areas/adapters/httpAreaEventScriptCatalogPort";
import { areaEventScriptCatalogFixture } from "./areaEventScriptCatalogFixture";

describe("HttpAreaEventScriptCatalogPort", () => {
  it("loads and validates the authenticated exact query", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      contractVersion: "1.0.0",
      requestId: "request-script-catalog",
      data: areaEventScriptCatalogFixture(),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaEventScriptCatalogPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1/",
    );

    await expect(port.list("access-token", { search: "enter", limit: 20, offset: 2 }))
      .resolves.toEqual(areaEventScriptCatalogFixture());
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/event-script-catalog?search=enter&limit=20&offset=2",
      {
        method: "GET",
        headers: { Accept: "application/json", Authorization: "Bearer access-token" },
      },
    );
  });

  it("fails closed before fetch for invalid token or query", async () => {
    const fetchStub = vi.fn();
    const port = new HttpAreaEventScriptCatalogPort(fetchStub as unknown as typeof fetch);

    await expect(port.list("", { search: "", limit: 100, offset: 0 }))
      .rejects.toEqual(expect.objectContaining({
        name: "AreaEventScriptCatalogRequestError",
        code: "AREA_EVENT_SCRIPT_CATALOG_ACCESS_TOKEN_INVALID",
      }));
    await expect(port.list("token", { search: "Upper", limit: 100, offset: 0 }))
      .rejects.toEqual(expect.objectContaining({
        code: "AREA_EVENT_SCRIPT_CATALOG_QUERY_INVALID",
      }));
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("rejects malformed catalog invariants and hides backend details", async () => {
    const malformed = structuredClone(areaEventScriptCatalogFixture()) as any;
    malformed.items[0].freshness = "compiled";
    const malformedFetch = vi.fn(async () => new Response(JSON.stringify({
      contractVersion: "1.0.0",
      requestId: "request-script-catalog",
      data: malformed,
    }), { status: 200 }));
    await expect(new HttpAreaEventScriptCatalogPort(
      malformedFetch as unknown as typeof fetch,
    ).list("token", { search: "", limit: 100, offset: 0 }))
      .rejects.toEqual(expect.objectContaining({
        code: "AREA_EVENT_SCRIPT_CATALOG_RESPONSE_INVALID",
      }));

    const errorFetch = vi.fn(async () => new Response(JSON.stringify({
      contractVersion: "1.0.0",
      requestId: "request-script-catalog",
      error: {
        code: "FORBIDDEN",
        message: "secret detail",
        details: [],
        retryable: false,
      },
    }), { status: 403 }));
    await expect(new HttpAreaEventScriptCatalogPort(
      errorFetch as unknown as typeof fetch,
    ).list("token", { search: "", limit: 100, offset: 0 }))
      .rejects.toEqual(new AreaEventScriptCatalogRequestError(
        "The Area event-script catalog request failed.",
        403,
        "FORBIDDEN",
      ));
  });
});
