import type { TemplateCatalogRepositoryPort } from
  "../../catalog/application/ports/template-catalog-repository.port";
import { isExactEffectiveCreatureClassSpellsTwoDaTable } from
  "../../catalog/domain/effective-creature-class-spells-two-da";

export type AreaCreatureClassSpellReplacementCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "table_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "target_row_missing"
  | "target_level_mismatch";

export class AreaCreatureClassSpellReplacementCatalogAdmissionError extends Error {
  constructor(
    readonly reason: AreaCreatureClassSpellReplacementCatalogAdmissionFailureReason,
  ) {
    super(`Creature class-spell replacement catalog admission failed: ${reason}.`);
    this.name = "AreaCreatureClassSpellReplacementCatalogAdmissionError";
  }
}

export interface AreaCreatureClassSpellReplacementCatalogBoundMutation {
  readonly kind: string;
  readonly classSpellReplacement?: {
    readonly expectedClassIds: readonly number[];
    readonly classesTableSha256: string;
    readonly classesRowCount: number;
    readonly spellsTableSha256: string;
    readonly spellsRowCount: number;
    readonly replacements: readonly Readonly<{
      classSlotIndex: number;
      spellLevel: number;
      targetSpellId: number;
    }>[];
  };
}

export async function admitCreatureClassSpellReplacementCatalogMutations(
  mutations: readonly AreaCreatureClassSpellReplacementCatalogBoundMutation[],
  catalog: Pick<TemplateCatalogRepositoryPort,
    "resolveEffectiveCreatureClassSpellsTwoDaTable">,
): Promise<void> {
  const replacements = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.classSpellReplacement
      ? [mutation.classSpellReplacement]
      : []);
  if (replacements.length === 0) return;
  const resolveTable = catalog.resolveEffectiveCreatureClassSpellsTwoDaTable;
  if (!resolveTable) {
    throw new AreaCreatureClassSpellReplacementCatalogAdmissionError("catalog_unavailable");
  }
  let table;
  try {
    table = await resolveTable.call(catalog);
  } catch {
    throw new AreaCreatureClassSpellReplacementCatalogAdmissionError("table_lookup_failed");
  }
  if (!table || !isExactEffectiveCreatureClassSpellsTwoDaTable(table)) {
    throw new AreaCreatureClassSpellReplacementCatalogAdmissionError("source_unavailable");
  }
  for (const mutation of replacements) {
    if (table.descriptor.sha256 !== mutation.spellsTableSha256 ||
      table.descriptor.rowCount !== mutation.spellsRowCount ||
      table.classesDescriptor.sha256 !== mutation.classesTableSha256 ||
      table.classesDescriptor.rowCount !== mutation.classesRowCount) {
      throw new AreaCreatureClassSpellReplacementCatalogAdmissionError("draft_source_changed");
    }
    for (const replacement of mutation.replacements) {
      const classId = mutation.expectedClassIds[replacement.classSlotIndex];
      const row = table.rows.find((candidate) => candidate.classId === classId &&
        candidate.rowIndex === replacement.targetSpellId &&
        candidate.displaySource === "strref");
      if (!row) {
        throw new AreaCreatureClassSpellReplacementCatalogAdmissionError("target_row_missing");
      }
      if (row.spellLevel !== replacement.spellLevel) {
        throw new AreaCreatureClassSpellReplacementCatalogAdmissionError(
          "target_level_mismatch",
        );
      }
    }
  }
}
