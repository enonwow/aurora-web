import { describe, expect, it, vi } from "vitest";
import {
  HttpWaypointApiPort,
  WaypointApiRequestError
} from "../../../../src/modules/waypoints/adapters/httpWaypointApiPort";

describe("HttpWaypointApiPort", () => {
  it("lists physical waypoint.2da rows only for the requested digest and page", async () => {
    const digest = "a".repeat(64);
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({
      data: {
        resourceName: "waypoint.2da",
        sha256: digest,
        rowCount: 5,
        items: [{
          rowIndex: 4,
          modelResRef: "wpt_yellow",
          strRef: 126,
          label: "yellow",
          displayName: "Yellow Waypoint",
          displaySource: "strref",
        }],
        total: 1,
        limit: 256,
        offset: 0,
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpWaypointApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.listWaypointAppearanceRows("token_123", {
      tableSha256: digest,
      limit: 256,
      offset: 0,
    });

    expect(fetchFn).toHaveBeenCalledWith(
      `https://aurora.test/api/v1/catalog/waypoints/appearances?tableSha256=${digest}&limit=256&offset=0`,
      { method: "GET", headers: { Authorization: "Bearer token_123" } },
    );
    expect(result.items).toEqual([expect.objectContaining({
      rowIndex: 4,
      modelResRef: "wpt_yellow",
    })]);
  });

  it("lists waypoint templates with construction metadata from the backend catalog", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                templateId: "wpt_waypoint_dynamic",
                resref: "wpt_dynamic",
                name: "Dynamic Waypoint",
                category: "waypoint",
                tags: ["waypoint"],
                previewImageUrl: "/api/v1/catalog/waypoints/wpt_waypoint_dynamic/thumbnail",
                metadata: {
                  appearance: 4,
                  hasMapNote: true,
                  mapNoteEnabled: false
                }
              }
            ],
            total: 1,
            limit: 25,
            offset: 50
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpWaypointApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.listWaypoints("token_123", {
      query: "dynamic",
      category: "waypoint",
      limit: 25,
      offset: 50
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/waypoints?query=dynamic&category=waypoint&limit=25&offset=50",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer token_123"
        }
      }
    );
    expect(result.items[0]).toMatchObject({
      templateId: "wpt_waypoint_dynamic",
      metadata: {
        appearance: 4,
        hasMapNote: true,
        mapNoteEnabled: false
      }
    });
  });

  it("throws a typed request error for backend failures", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "AUTH_INVALID_SESSION",
            message: "Session expired."
          }
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpWaypointApiPort(fetchFn, "https://aurora.test/api/v1");

    await expect(port.listWaypoints("expired")).rejects.toMatchObject({
      name: "WaypointApiRequestError",
      status: 401,
      code: "AUTH_INVALID_SESSION",
      message: "Session expired."
    });
    await expect(port.listWaypoints("expired")).rejects.toBeInstanceOf(
      WaypointApiRequestError
    );
  });
});
