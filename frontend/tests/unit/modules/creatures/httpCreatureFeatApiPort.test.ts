import { describe, expect, it, vi } from "vitest";
import { HttpCreatureApiPort } from
  "../../../../src/modules/creatures/adapters/httpCreatureApiPort";

describe("HttpCreatureApiPort Creature FeatList catalog", () => {
  it("loads and detaches one digest-bound feat.2da page", async () => {
    const item = {
      rowIndex: 40,
      featNameStrRef: 6_741,
      descriptionStrRef: 6_742,
      toolsCategory: 4,
      displayName: "Toughness",
    };
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({
      data: {
        resourceName: "feat.2da",
        sha256: "d".repeat(64),
        rowCount: 1_100,
        items: [item],
        total: 1,
        limit: 1,
        offset: 0,
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpCreatureApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.listCreatureFeatRows("token_123", {
      tableSha256: "d".repeat(64),
      rowIndex: 40,
      limit: 1,
      offset: 0,
    });

    expect(fetchFn).toHaveBeenCalledWith(
      `https://aurora.test/api/v1/catalog/creatures/feats?tableSha256=${"d".repeat(64)}&rowIndex=40&limit=1&offset=0`,
      { method: "GET", headers: { Authorization: "Bearer token_123" } },
    );
    expect(result.items).toEqual([item]);
    expect(result.items[0]).not.toBe(item);
  });

  it("rejects response metadata that does not match the requested digest", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({
      data: {
        resourceName: "feat.2da",
        sha256: "e".repeat(64),
        rowCount: 1,
        items: [],
        total: 0,
        limit: 100,
        offset: 0,
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpCreatureApiPort(fetchFn, "https://aurora.test/api/v1");
    await expect(port.listCreatureFeatRows("token", {
      tableSha256: "d".repeat(64),
    })).rejects.toMatchObject({ code: "CREATURE_FEAT_PAGE_INVALID" });
  });
});
