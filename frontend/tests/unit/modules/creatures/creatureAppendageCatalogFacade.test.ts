import { describe, expect, it, vi } from "vitest";

import { createCreatureAppendageCatalogFacade } from
  "../../../../src/modules/creatures/application/creatureAppendageCatalogFacade";

describe("CreatureAppendageCatalogFacade", () => {
  it("keeps digest-bound wings/tail catalog reads behind the Creature port", async () => {
    const result = {
      resourceName: "wingmodel.2da" as const,
      sha256: "9".repeat(64),
      rowCount: 8,
      items: [{ rowIndex: 3, displayName: "Angel" }],
      total: 1,
      limit: 1,
      offset: 0,
    };
    const listCreatureAppendageRows = vi.fn().mockResolvedValue(result);
    const facade = createCreatureAppendageCatalogFacade({ listCreatureAppendageRows });
    const query = {
      kind: "wings" as const,
      tableSha256: result.sha256,
      rowIndex: 3,
      limit: 1,
      offset: 0,
    };

    await expect(facade.queries.listRows("token", query)).resolves.toEqual(result);
    expect(listCreatureAppendageRows).toHaveBeenCalledWith("token", query);
  });
});
