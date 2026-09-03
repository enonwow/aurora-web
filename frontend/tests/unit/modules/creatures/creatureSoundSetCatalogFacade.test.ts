import { describe, expect, it, vi } from "vitest";
import { createCreatureSoundSetCatalogFacade } from
  "../../../../src/modules/creatures/application/creatureSoundSetCatalogFacade";

describe("CreatureSoundSetCatalogFacade", () => {
  it("exposes the exact catalog query through the port boundary", async () => {
    const result = {
      resourceName: "soundset.2da" as const,
      sha256: "a".repeat(64),
      rowCount: 5_100,
      items: [],
      total: 0,
      limit: 1,
      offset: 0,
    };
    const listCreatureSoundSetRows = vi.fn().mockResolvedValue(result);
    const facade = createCreatureSoundSetCatalogFacade({ listCreatureSoundSetRows });
    const query = {
      tableSha256: "a".repeat(64),
      rowIndex: 0,
      limit: 1,
      offset: 0,
    };

    await expect(facade.queries.listRows("token", query)).resolves.toBe(result);
    expect(listCreatureSoundSetRows).toHaveBeenCalledWith("token", query);
  });
});
