import {
  admitCreatureSkillListCatalogMutations,
  AreaCreatureSkillListCatalogAdmissionError,
} from "../../src/modules/areas/application/area-creature-skill-list-catalog-admission";

describe("Area Creature SkillList catalog admission", () => {
  const table = {
    descriptor: {
      resourceName: "skills.2da" as const,
      sourceObjectKey: "runtime-source/module/skills.2da",
      sourceLayer: "module" as const,
      sha256: "a".repeat(64),
      sizeBytes: 100,
      rowCount: 2,
    },
    rows: [],
  };

  it("admits a full vector only against the current exact descriptor", async () => {
    await expect(admitCreatureSkillListCatalogMutations([{
      kind: "creature",
      skillList: { tableSha256: "a".repeat(64), rowCount: 2 },
    }], { resolveEffectiveCreatureSkillsTwoDaTable: async () => table })).resolves.toBeUndefined();
  });

  it("rejects stale table digest or row count", async () => {
    await expect(admitCreatureSkillListCatalogMutations([{
      kind: "creature",
      skillList: { tableSha256: "b".repeat(64), rowCount: 2 },
    }], { resolveEffectiveCreatureSkillsTwoDaTable: async () => table })).rejects.toEqual(
      expect.objectContaining<Partial<AreaCreatureSkillListCatalogAdmissionError>>({
        reason: "draft_source_changed",
      }),
    );
  });
});
