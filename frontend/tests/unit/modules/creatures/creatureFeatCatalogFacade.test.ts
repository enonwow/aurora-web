import { describe, expect, it, vi } from "vitest";
import { createCreatureFeatCatalogFacade } from
  "../../../../src/modules/creatures/application/creatureFeatCatalogFacade";

describe("CreatureFeatCatalogFacade", () => {
  it("exposes the digest-bound physical-row query through the port", async () => {
    const result = {
      resourceName: "feat.2da" as const,
      sha256: "d".repeat(64),
      rowCount: 1_100,
      items: [],
      total: 0,
      limit: 100,
      offset: 0,
    };
    const listCreatureFeatRows = vi.fn().mockResolvedValue(result);
    const facade = createCreatureFeatCatalogFacade({ listCreatureFeatRows });
    const query = { tableSha256: "d".repeat(64), limit: 100, offset: 0 };
    await expect(facade.queries.listRows("token", query)).resolves.toBe(result);
    expect(listCreatureFeatRows).toHaveBeenCalledWith("token", query);
  });
});
