import { describe, expect, it, vi } from "vitest";
import { createCreatureStartingPackageCatalogFacade } from
  "../../../../src/modules/creatures/application/creatureStartingPackageCatalogFacade";

describe("CreatureStartingPackageCatalogFacade", () => {
  it("exposes the exact class-bound catalog query through the port boundary", async () => {
    const result = {
      resourceName: "packages.2da" as const,
      sha256: "c".repeat(64),
      rowCount: 132,
      classIds: [4],
      items: [],
      total: 0,
      limit: 1,
      offset: 0,
    };
    const listCreatureStartingPackageRows = vi.fn().mockResolvedValue(result);
    const facade = createCreatureStartingPackageCatalogFacade({
      listCreatureStartingPackageRows,
    });
    const query = {
      tableSha256: "c".repeat(64),
      classIds: [4],
      rowIndex: 0,
      limit: 1,
      offset: 0,
    };

    await expect(facade.queries.listRows("token", query)).resolves.toBe(result);
    expect(listCreatureStartingPackageRows).toHaveBeenCalledWith("token", query);
  });
});
