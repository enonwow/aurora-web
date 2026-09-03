import { describe, expect, it, vi } from "vitest";
import { HttpCreatureApiPort } from
  "../../../../src/modules/creatures/adapters/httpCreatureApiPort";

describe("HttpCreatureApiPort Creature SpecAbilityList catalog", () => {
  it("loads and detaches one digest-bound spells.2da page", async () => {
    const item = {
      rowIndex: 2,
      nameStrRef: 6_741,
      spellDescStrRef: 6_742,
      userType: 1,
      displayName: "Acid Fog",
    };
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ data: {
      resourceName: "spells.2da", sha256: "e".repeat(64), rowCount: 1_100,
      items: [item], total: 1, limit: 1, offset: 0,
    } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpCreatureApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.listCreatureSpecialAbilityRows("token_123", {
      tableSha256: "e".repeat(64), rowIndex: 2, limit: 1, offset: 0,
    });

    expect(fetchFn).toHaveBeenCalledWith(
      `https://aurora.test/api/v1/catalog/creatures/special-abilities?tableSha256=${"e".repeat(64)}&rowIndex=2&limit=1&offset=0`,
      { method: "GET", headers: { Authorization: "Bearer token_123" } },
    );
    expect(result.items).toEqual([item]);
    expect(result.items[0]).not.toBe(item);
  });

  it("rejects response metadata that does not match the requested digest", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ data: {
      resourceName: "spells.2da", sha256: "f".repeat(64), rowCount: 1,
      items: [], total: 0, limit: 100, offset: 0,
    } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpCreatureApiPort(fetchFn, "https://aurora.test/api/v1");
    await expect(port.listCreatureSpecialAbilityRows("token", {
      tableSha256: "e".repeat(64),
    })).rejects.toMatchObject({ code: "CREATURE_SPECIAL_ABILITY_PAGE_INVALID" });
  });
});
