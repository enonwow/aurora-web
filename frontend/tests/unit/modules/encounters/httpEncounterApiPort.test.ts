import { describe, expect, it, vi } from "vitest";
import {
  EncounterApiRequestError,
  HttpEncounterApiPort
} from "../../../../src/modules/encounters/adapters/httpEncounterApiPort";

describe("HttpEncounterApiPort", () => {
  it("lists encounter templates with metadata from the backend catalog", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                templateId: "enc_forest_ambush",
                resref: "enc_forest",
                name: "Forest Ambush",
                category: "encounter",
                tags: ["forest"],
                previewImageUrl: "/api/v1/catalog/encounters/enc_forest_ambush/thumbnail",
                metadata: {
                  active: true,
                  maxCreatures: 4,
                  encounterCreatureListEntries: "[{\"resRef\":\"nw_wolf001\"}]"
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
    const port = new HttpEncounterApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.listEncounters("token_123", {
      query: "ambush",
      category: "encounter",
      limit: 25,
      offset: 50
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/encounters?query=ambush&category=encounter&limit=25&offset=50",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer token_123"
        }
      }
    );
    expect(result.items[0]).toMatchObject({
      templateId: "enc_forest_ambush",
      metadata: {
        active: true,
        maxCreatures: 4,
        encounterCreatureListEntries: "[{\"resRef\":\"nw_wolf001\"}]"
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
    const port = new HttpEncounterApiPort(fetchFn, "https://aurora.test/api/v1");

    await expect(port.listEncounters("expired")).rejects.toMatchObject({
      name: "EncounterApiRequestError",
      status: 401,
      code: "AUTH_INVALID_SESSION",
      message: "Session expired."
    });
    await expect(port.listEncounters("expired")).rejects.toBeInstanceOf(
      EncounterApiRequestError
    );
  });
});
