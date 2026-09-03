import type { TemplateCatalogRepositoryPort } from
  "../../catalog/application/ports/template-catalog-repository.port";
import { isExactEffectiveCreatureFeatsTwoDaTable } from
  "../../catalog/domain/effective-creature-feats-two-da";

export type AreaCreatureFeatListCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "table_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "row_missing"
  | "metamagic_coupling_required";

export class AreaCreatureFeatListCatalogAdmissionError extends Error {
  constructor(readonly reason: AreaCreatureFeatListCatalogAdmissionFailureReason) {
    super(`Creature FeatList catalog admission failed: ${reason}.`);
    this.name = "AreaCreatureFeatListCatalogAdmissionError";
  }
}

export interface AreaCreatureFeatListCatalogBoundMutation {
  readonly kind: string;
  readonly featList?: {
    readonly expectedFeatIds: readonly number[];
    readonly featIds: readonly number[];
    readonly tableSha256: string;
    readonly rowCount: number;
  };
}

export async function admitCreatureFeatListCatalogMutations(
  mutations: readonly AreaCreatureFeatListCatalogBoundMutation[],
  catalog: Pick<TemplateCatalogRepositoryPort, "resolveEffectiveCreatureFeatsTwoDaTable">,
): Promise<void> {
  const featLists = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.featList ? [mutation.featList] : []);
  if (featLists.length === 0) return;
  const resolveTable = catalog.resolveEffectiveCreatureFeatsTwoDaTable;
  if (!resolveTable) throw new AreaCreatureFeatListCatalogAdmissionError("catalog_unavailable");
  let table;
  try {
    table = await resolveTable.call(catalog);
  } catch {
    throw new AreaCreatureFeatListCatalogAdmissionError("table_lookup_failed");
  }
  if (!table) throw new AreaCreatureFeatListCatalogAdmissionError("source_unavailable");
  if (!isExactEffectiveCreatureFeatsTwoDaTable(table)) {
    throw new AreaCreatureFeatListCatalogAdmissionError("source_unavailable");
  }
  const rows = new Map(table.rows
    .filter((row) => row.displaySource === "strref")
    .map((row) => [row.rowIndex, row]));
  for (const featList of featLists) {
    if (table.descriptor.resourceName !== "feat.2da" ||
      table.descriptor.sha256 !== featList.tableSha256 ||
      table.descriptor.rowCount !== featList.rowCount) {
      throw new AreaCreatureFeatListCatalogAdmissionError("draft_source_changed");
    }
    if ([...featList.expectedFeatIds, ...featList.featIds].some((featId) => !rows.has(featId))) {
      throw new AreaCreatureFeatListCatalogAdmissionError("row_missing");
    }
    const targets = new Set(featList.featIds);
    if (featList.expectedFeatIds.some((featId) =>
      !targets.has(featId) && rows.get(featId)?.toolsCategory === 4)) {
      throw new AreaCreatureFeatListCatalogAdmissionError("metamagic_coupling_required");
    }
  }
}
