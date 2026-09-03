import type { TemplateCatalogRepositoryPort } from "../../catalog/application/ports/template-catalog-repository.port";

export type AreaCreatureWalkRateCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "table_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "row_not_admitted";

export class AreaCreatureWalkRateCatalogAdmissionError extends Error {
  constructor(
    readonly reason: AreaCreatureWalkRateCatalogAdmissionFailureReason,
    readonly targetRow?: number,
  ) {
    super(`Creature WalkRate catalog admission failed: ${reason}.`);
    this.name = "AreaCreatureWalkRateCatalogAdmissionError";
  }
}

export interface AreaCreatureWalkRateCatalogBoundMutation {
  readonly kind: string;
  readonly walkRate?: {
    readonly value: number;
    readonly tableSha256: string;
    readonly rowCount: number;
  };
}

export async function admitCreatureWalkRateCatalogMutations(
  mutations: readonly AreaCreatureWalkRateCatalogBoundMutation[],
  catalog: Pick<TemplateCatalogRepositoryPort, "resolveEffectiveCreatureWalkRatesTwoDaTable">,
): Promise<void> {
  const walkRates = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.walkRate ? [mutation.walkRate] : []);
  if (walkRates.length === 0) return;
  const resolveTable = catalog.resolveEffectiveCreatureWalkRatesTwoDaTable;
  if (!resolveTable) throw new AreaCreatureWalkRateCatalogAdmissionError("catalog_unavailable");
  let table;
  try {
    table = await resolveTable.call(catalog);
  } catch {
    throw new AreaCreatureWalkRateCatalogAdmissionError("table_lookup_failed");
  }
  if (!table) throw new AreaCreatureWalkRateCatalogAdmissionError("source_unavailable");
  for (const walkRate of walkRates) {
    if (table.descriptor.resourceName !== "creaturespeed.2da" ||
      table.descriptor.sha256 !== walkRate.tableSha256 ||
      table.descriptor.rowCount !== walkRate.rowCount) {
      throw new AreaCreatureWalkRateCatalogAdmissionError("draft_source_changed");
    }
    if (!table.rows.some((row) => row.rowIndex === walkRate.value)) {
      throw new AreaCreatureWalkRateCatalogAdmissionError("row_not_admitted", walkRate.value);
    }
  }
}
