import type { TemplateCatalogRepositoryPort } from
  "../../catalog/application/ports/template-catalog-repository.port";
import {
  isEffectiveCreaturePortraitRowAdmitted,
  isExactEffectiveCreaturePortraitsTwoDaTable,
} from "../../catalog/domain/effective-creature-portraits-two-da";

export type AreaCreaturePortraitCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "table_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "compile_source_changed"
  | "row_not_admitted";

export class AreaCreaturePortraitCatalogAdmissionError extends Error {
  constructor(
    readonly reason: AreaCreaturePortraitCatalogAdmissionFailureReason,
    readonly targetRow?: number,
  ) {
    super(`Creature PortraitId catalog admission failed: ${reason}.`);
    this.name = "AreaCreaturePortraitCatalogAdmissionError";
  }
}

export interface AreaCreaturePortraitCatalogBoundMutation {
  readonly kind: string;
  readonly portrait?: {
    readonly value: number;
    readonly tableSha256: string;
    readonly rowCount: number;
    readonly genderExpectedValue: number;
    readonly raceExpectedValue: number;
  };
}

type CreaturePortraitCatalogPort = Pick<
  TemplateCatalogRepositoryPort,
  "resolveEffectiveCreaturePortraitsTwoDaTable"
>;

export async function admitCreaturePortraitCatalogMutations(
  mutations: readonly AreaCreaturePortraitCatalogBoundMutation[],
  catalog: CreaturePortraitCatalogPort,
): Promise<void> {
  const portraits = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.portrait ? [mutation.portrait] : []);
  if (portraits.length === 0) return;
  const resolveTable = catalog.resolveEffectiveCreaturePortraitsTwoDaTable;
  if (!resolveTable) {
    throw new AreaCreaturePortraitCatalogAdmissionError("catalog_unavailable");
  }
  let table;
  try {
    table = await resolveTable.call(catalog);
  } catch {
    throw new AreaCreaturePortraitCatalogAdmissionError("table_lookup_failed");
  }
  if (!table) throw new AreaCreaturePortraitCatalogAdmissionError("source_unavailable");
  if (!isExactEffectiveCreaturePortraitsTwoDaTable(table)) {
    throw new AreaCreaturePortraitCatalogAdmissionError("compile_source_changed");
  }
  for (const portrait of portraits) {
    if (table.descriptor.sha256 !== portrait.tableSha256 ||
      table.descriptor.rowCount !== portrait.rowCount) {
      throw new AreaCreaturePortraitCatalogAdmissionError("draft_source_changed");
    }
    const row = table.rows.find((candidate) => candidate.rowIndex === portrait.value);
    if (!row || !isEffectiveCreaturePortraitRowAdmitted(
      row,
      portrait.genderExpectedValue,
      portrait.raceExpectedValue,
    )) {
      throw new AreaCreaturePortraitCatalogAdmissionError("row_not_admitted", portrait.value);
    }
  }
}
