import { describe, expect, it, vi } from "vitest";
import { createCreatureAppearanceCatalogFacade } from "../../../../src/modules/creatures/application/creatureAppearanceCatalogFacade";

describe("CreatureAppearanceCatalogFacade", () => {
  it("exposes the catalog query without leaking the HTTP adapter into UI", async () => {
    const result = {
      resourceName: "appearance.2da" as const,
      sha256: "a".repeat(64),
      rowCount: 1_000,
      items: [],
      total: 0,
      limit: 1,
      offset: 0,
    };
    const listCreatureAppearanceRows = vi.fn().mockResolvedValue(result);
    const facade = createCreatureAppearanceCatalogFacade({ listCreatureAppearanceRows });
    const query = { tableSha256: "a".repeat(64), rowIndex: 249, limit: 1, offset: 0 };

    await expect(facade.queries.listRows("token", query)).resolves.toBe(result);
    expect(listCreatureAppearanceRows).toHaveBeenCalledWith("token", query);
  });
});
