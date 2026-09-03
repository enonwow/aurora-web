import { describe, expect, it, vi } from "vitest";
import { createCreatureGenderCatalogFacade } from "../../../../src/modules/creatures/application/creatureGenderCatalogFacade";

describe("CreatureGenderCatalogFacade", () => {
  it("exposes the catalog query without leaking the HTTP adapter into UI", async () => {
    const result = {
      resourceName: "gender.2da" as const,
      sha256: "c".repeat(64),
      rowCount: 5,
      items: [],
      total: 0,
      limit: 1,
      offset: 0,
    };
    const listCreatureGenderRows = vi.fn().mockResolvedValue(result);
    const facade = createCreatureGenderCatalogFacade({ listCreatureGenderRows });
    const query = { tableSha256: "c".repeat(64), rowIndex: 4, limit: 1, offset: 0 };

    await expect(facade.queries.listRows("token", query)).resolves.toBe(result);
    expect(listCreatureGenderRows).toHaveBeenCalledWith("token", query);
  });
});
