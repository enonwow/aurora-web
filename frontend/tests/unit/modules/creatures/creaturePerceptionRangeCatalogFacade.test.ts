import { describe, expect, it, vi } from "vitest";
import { createCreaturePerceptionRangeCatalogFacade } from
  "../../../../src/modules/creatures/application/creaturePerceptionRangeCatalogFacade";

describe("CreaturePerceptionRangeCatalogFacade", () => {
  it("exposes the catalog query through the port boundary", async () => {
    const result = {
      resourceName: "ranges.2da" as const,
      sha256: "c".repeat(64),
      rowCount: 12,
      items: [],
      total: 0,
      limit: 1,
      offset: 0,
    };
    const listCreaturePerceptionRangeRows = vi.fn().mockResolvedValue(result);
    const facade = createCreaturePerceptionRangeCatalogFacade({
      listCreaturePerceptionRangeRows,
    });
    const query = {
      tableSha256: "c".repeat(64),
      rowIndex: 11 as const,
      limit: 1,
      offset: 0,
    };
    await expect(facade.queries.listRows("token", query)).resolves.toBe(result);
    expect(listCreaturePerceptionRangeRows).toHaveBeenCalledWith("token", query);
  });
});
