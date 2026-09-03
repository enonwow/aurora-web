import { describe, expect, it, vi } from "vitest";
import { createCreaturePhenotypeCatalogFacade } from
  "../../../../src/modules/creatures/application/creaturePhenotypeCatalogFacade";

describe("CreaturePhenotypeCatalogFacade", () => {
  it("exposes the two-table-bound catalog query without leaking the HTTP adapter", async () => {
    const result = {
      resourceName: "phenotype.2da" as const,
      sha256: "d".repeat(64),
      rowCount: 9,
      items: [],
      total: 0,
      limit: 1,
      offset: 0,
    };
    const listCreaturePhenotypeRows = vi.fn().mockResolvedValue(result);
    const facade = createCreaturePhenotypeCatalogFacade({ listCreaturePhenotypeRows });
    const query = {
      tableSha256: "d".repeat(64),
      appearanceTableSha256: "a".repeat(64),
      appearanceRowCount: 1_000,
      appearanceType: 18,
      rowIndex: 5,
      limit: 1,
      offset: 0,
    };

    await expect(facade.queries.listRows("token", query)).resolves.toBe(result);
    expect(listCreaturePhenotypeRows).toHaveBeenCalledWith("token", query);
  });
});
