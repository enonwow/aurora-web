import { describe, expect, it, vi } from "vitest";
import { createCreatureWalkRateCatalogFacade } from
  "../../../../src/modules/creatures/application/creatureWalkRateCatalogFacade";

describe("CreatureWalkRateCatalogFacade", () => {
  it("exposes the catalog query through the port boundary", async () => {
    const result = {
      resourceName: "creaturespeed.2da" as const,
      sha256: "d".repeat(64),
      rowCount: 9,
      items: [],
      total: 0,
      limit: 1,
      offset: 0,
    };
    const listCreatureWalkRateRows = vi.fn().mockResolvedValue(result);
    const facade = createCreatureWalkRateCatalogFacade({ listCreatureWalkRateRows });
    const query = {
      tableSha256: "d".repeat(64),
      rowIndex: 4,
      limit: 1,
      offset: 0,
    };

    await expect(facade.queries.listRows("token", query)).resolves.toBe(result);
    expect(listCreatureWalkRateRows).toHaveBeenCalledWith("token", query);
  });
});
