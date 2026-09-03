import type { TemplateCatalogRepositoryPort } from
  "../../catalog/application/ports/template-catalog-repository.port";
import { isExactEffectiveCreatureRacialTypesTwoDaTable } from
  "../../catalog/domain/effective-creature-racial-types-two-da";

export type AreaCreatureHitPointCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "table_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "compile_source_changed"
  | "race_row_changed";

export class AreaCreatureHitPointCatalogAdmissionError extends Error {
  constructor(
    readonly reason: AreaCreatureHitPointCatalogAdmissionFailureReason,
    readonly raceRow?: number,
  ) {
    super(`Creature hit-point racialtypes.2da admission failed: ${reason}.`);
    this.name = "AreaCreatureHitPointCatalogAdmissionError";
  }
}

export interface AreaCreatureHitPointCatalogBoundMutation {
  readonly kind: string;
  readonly hitPoints?: {
    readonly race: number;
    readonly racialConstitutionAdjust: number;
    readonly racialTypesSha256: string;
    readonly racialTypesRowCount: number;
  };
}

type CreatureHitPointCatalogPort = Pick<
  TemplateCatalogRepositoryPort,
  "resolveEffectiveCreatureRacialTypesTwoDaTable"
>;

export async function admitCreatureHitPointCatalogMutations(
  mutations: readonly AreaCreatureHitPointCatalogBoundMutation[],
  catalog: CreatureHitPointCatalogPort,
): Promise<void> {
  const hitPoints = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.hitPoints ? [mutation.hitPoints] : []);
  if (hitPoints.length === 0) return;
  const resolveTable = catalog.resolveEffectiveCreatureRacialTypesTwoDaTable;
  if (!resolveTable) {
    throw new AreaCreatureHitPointCatalogAdmissionError("catalog_unavailable");
  }
  let table;
  try {
    table = await resolveTable.call(catalog);
  } catch {
    throw new AreaCreatureHitPointCatalogAdmissionError("table_lookup_failed");
  }
  if (!table) throw new AreaCreatureHitPointCatalogAdmissionError("source_unavailable");
  if (!isExactEffectiveCreatureRacialTypesTwoDaTable(table)) {
    throw new AreaCreatureHitPointCatalogAdmissionError("compile_source_changed");
  }
  for (const mutation of hitPoints) {
    if (table.descriptor.sha256 !== mutation.racialTypesSha256 ||
      table.descriptor.rowCount !== mutation.racialTypesRowCount) {
      throw new AreaCreatureHitPointCatalogAdmissionError("draft_source_changed");
    }
    const row = table.rows.find((candidate) => candidate.rowIndex === mutation.race);
    if (!row || row.constitutionAdjust !== mutation.racialConstitutionAdjust) {
      throw new AreaCreatureHitPointCatalogAdmissionError(
        "race_row_changed",
        mutation.race,
      );
    }
  }
}
