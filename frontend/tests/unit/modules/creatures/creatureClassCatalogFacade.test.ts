import { describe, expect, it, vi } from "vitest";
import { createCreatureClassCatalogFacade } from
  "../../../../src/modules/creatures/application/creatureClassCatalogFacade";

describe("CreatureClassCatalogFacade", () => {
  it("exposes the exact digest-bound class query through the port boundary", async () => {
    const result = {
      resourceName: "classes.2da" as const,
      sha256: "a".repeat(64),
      rowCount: 64,
      items: [],
      total: 0,
      limit: 1,
      offset: 0,
    };
    const listCreatureClassRows = vi.fn().mockResolvedValue(result);
    const facade = createCreatureClassCatalogFacade({ listCreatureClassRows });
    const query = { tableSha256: "a".repeat(64), rowIndex: 4, limit: 1, offset: 0 };

    await expect(facade.queries.listRows("token", query)).resolves.toBe(result);
    expect(listCreatureClassRows).toHaveBeenCalledWith("token", query);
  });
});
