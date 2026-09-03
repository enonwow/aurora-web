import { describe, expect, it, vi } from "vitest";
import { createCreatureSkillCatalogFacade } from
  "../../../../src/modules/creatures/application/creatureSkillCatalogFacade";

describe("CreatureSkillCatalogFacade", () => {
  it("exposes the digest-bound physical-row query through the port", async () => {
    const result = {
      resourceName: "skills.2da" as const,
      sha256: "d".repeat(64),
      rowCount: 28,
      items: [],
      total: 0,
      limit: 100,
      offset: 0,
    };
    const listCreatureSkillRows = vi.fn().mockResolvedValue(result);
    const facade = createCreatureSkillCatalogFacade({ listCreatureSkillRows });
    const query = { tableSha256: "d".repeat(64), limit: 100, offset: 0 };
    await expect(facade.queries.listRows("token", query)).resolves.toBe(result);
    expect(listCreatureSkillRows).toHaveBeenCalledWith("token", query);
  });
});
