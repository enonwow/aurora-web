import type { TemplateCatalogRepositoryPort } from
  "../../catalog/application/ports/template-catalog-repository.port";

export type AreaCreatureSkillListCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "table_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed";

export class AreaCreatureSkillListCatalogAdmissionError extends Error {
  constructor(readonly reason: AreaCreatureSkillListCatalogAdmissionFailureReason) {
    super(`Creature SkillList catalog admission failed: ${reason}.`);
    this.name = "AreaCreatureSkillListCatalogAdmissionError";
  }
}

export interface AreaCreatureSkillListCatalogBoundMutation {
  readonly kind: string;
  readonly skillList?: {
    readonly tableSha256: string;
    readonly rowCount: number;
  };
}

export async function admitCreatureSkillListCatalogMutations(
  mutations: readonly AreaCreatureSkillListCatalogBoundMutation[],
  catalog: Pick<TemplateCatalogRepositoryPort, "resolveEffectiveCreatureSkillsTwoDaTable">,
): Promise<void> {
  const skillLists = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.skillList ? [mutation.skillList] : []);
  if (skillLists.length === 0) return;
  const resolveTable = catalog.resolveEffectiveCreatureSkillsTwoDaTable;
  if (!resolveTable) throw new AreaCreatureSkillListCatalogAdmissionError("catalog_unavailable");
  let table;
  try {
    table = await resolveTable.call(catalog);
  } catch {
    throw new AreaCreatureSkillListCatalogAdmissionError("table_lookup_failed");
  }
  if (!table) throw new AreaCreatureSkillListCatalogAdmissionError("source_unavailable");
  for (const skillList of skillLists) {
    if (table.descriptor.resourceName !== "skills.2da" ||
      table.descriptor.sha256 !== skillList.tableSha256 ||
      table.descriptor.rowCount !== skillList.rowCount) {
      throw new AreaCreatureSkillListCatalogAdmissionError("draft_source_changed");
    }
  }
}
