import type { TemplateCatalogRepositoryPort } from "../../catalog/application/ports/template-catalog-repository.port";

export type AreaCreaturePerceptionRangeCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "table_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "row_not_admitted";

export class AreaCreaturePerceptionRangeCatalogAdmissionError extends Error {
  constructor(
    readonly reason: AreaCreaturePerceptionRangeCatalogAdmissionFailureReason,
    readonly targetRow?: number,
  ) {
    super(`Creature PerceptionRange catalog admission failed: ${reason}.`);
    this.name = "AreaCreaturePerceptionRangeCatalogAdmissionError";
  }
}

export interface AreaCreaturePerceptionRangeCatalogBoundMutation {
  readonly kind: string;
  readonly perceptionRange?: {
    readonly value: number;
    readonly tableSha256: string;
    readonly rowCount: number;
  };
}

export async function admitCreaturePerceptionRangeCatalogMutations(
  mutations: readonly AreaCreaturePerceptionRangeCatalogBoundMutation[],
  catalog: Pick<TemplateCatalogRepositoryPort, "resolveEffectiveCreaturePerceptionRangesTwoDaTable">,
): Promise<void> {
  const ranges = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.perceptionRange
      ? [mutation.perceptionRange]
      : []);
  if (ranges.length === 0) return;
  const resolveTable = catalog.resolveEffectiveCreaturePerceptionRangesTwoDaTable;
  if (!resolveTable) {
    throw new AreaCreaturePerceptionRangeCatalogAdmissionError("catalog_unavailable");
  }
  let table;
  try {
    table = await resolveTable.call(catalog);
  } catch {
    throw new AreaCreaturePerceptionRangeCatalogAdmissionError("table_lookup_failed");
  }
  if (!table) {
    throw new AreaCreaturePerceptionRangeCatalogAdmissionError("source_unavailable");
  }
  for (const range of ranges) {
    if (table.descriptor.resourceName !== "ranges.2da" ||
      table.descriptor.sha256 !== range.tableSha256 ||
      table.descriptor.rowCount !== range.rowCount) {
      throw new AreaCreaturePerceptionRangeCatalogAdmissionError("draft_source_changed");
    }
    if (!table.rows.some((row) => row.rowIndex === range.value)) {
      throw new AreaCreaturePerceptionRangeCatalogAdmissionError("row_not_admitted", range.value);
    }
  }
}
