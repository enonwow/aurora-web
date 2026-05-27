import { describe, expect, it, vi } from "vitest";
import {
  AreaApiRequestError,
  HttpAreaApiPort
} from "../../../../src/modules/areas/adapters/httpAreaApiPort";

describe("HttpAreaApiPort", () => {
  it("logs in and returns backend access token", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            session: {
              accessToken: "token_123"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.login("viewer.user", "viewer123");

    expect(result.accessToken).toBe("token_123");
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/auth/login",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("lists areas with encoded query params", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                areaId: "area_001",
                name: "Area One",
                biome: "urban",
                width: 24,
                height: 24,
                tags: ["benchmark"],
                benchmark: true,
                updatedAt: "2026-05-27T10:00:00.000Z"
              }
            ],
            total: 1,
            limit: 20,
            offset: 0
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.listAreas("token_abc", {
      query: "market",
      benchmark: true,
      limit: 20,
      offset: 0
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.areaId).toBe("area_001");
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas?query=market&benchmark=true&limit=20&offset=0",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      })
    );
  });

  it("fetches area detail and maps object placements", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            areaId: "area_001",
            name: "Area One",
            biome: "urban",
            width: 24,
            height: 24,
            tags: ["city"],
            benchmark: false,
            updatedAt: "2026-05-27T10:00:00.000Z",
            objects: [
              {
                objectId: "obj_1",
                kind: "placeable",
                templateId: "plc_market_stall_001",
                x: 1,
                y: 2,
                z: 0,
                bearing: 90
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaById("token_abc", "area_001");

    expect(result.areaId).toBe("area_001");
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0]?.kind).toBe("placeable");
  });

  it("throws AreaApiRequestError with backend code on non-2xx response", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN_ROLE",
            message: "Forbidden for role."
          }
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.listAreas("token_bad")).rejects.toBeInstanceOf(AreaApiRequestError);
    await expect(port.listAreas("token_bad")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN_ROLE"
    });
  });
});
