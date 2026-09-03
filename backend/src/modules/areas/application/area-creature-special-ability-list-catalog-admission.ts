import type { TemplateCatalogRepositoryPort } from
  "../../catalog/application/ports/template-catalog-repository.port";
import { isExactEffectiveCreatureSpecialAbilitiesTwoDaTable } from
  "../../catalog/domain/effective-creature-special-abilities-two-da";

export type AreaCreatureSpecialAbilityListCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "table_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "row_missing"
  | "profile_invalid";

export class AreaCreatureSpecialAbilityListCatalogAdmissionError extends Error {
  constructor(readonly reason: AreaCreatureSpecialAbilityListCatalogAdmissionFailureReason) {
    super(`Creature SpecAbilityList catalog admission failed: ${reason}.`);
    this.name = "AreaCreatureSpecialAbilityListCatalogAdmissionError";
  }
}

export interface AreaCreatureSpecialAbilityListCatalogBoundMutation {
  readonly kind: string;
  readonly specialAbilityList?: {
    readonly expectedEntries: readonly Readonly<{
      spellId: number;
      uses: number;
      casterLevel: number;
    }>[];
    readonly entries: readonly Readonly<{
      spellId: number;
      uses: number;
      casterLevel: number;
    }>[];
    readonly tableSha256: string;
    readonly rowCount: number;
  };
}

export async function admitCreatureSpecialAbilityListCatalogMutations(
  mutations: readonly AreaCreatureSpecialAbilityListCatalogBoundMutation[],
  catalog: Pick<
    TemplateCatalogRepositoryPort,
    "resolveEffectiveCreatureSpecialAbilitiesTwoDaTable"
  >,
): Promise<void> {
  const specialAbilityLists = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.specialAbilityList
      ? [mutation.specialAbilityList]
      : []);
  if (specialAbilityLists.length === 0) return;
  const resolveTable = catalog.resolveEffectiveCreatureSpecialAbilitiesTwoDaTable;
  if (!resolveTable) {
    throw new AreaCreatureSpecialAbilityListCatalogAdmissionError("catalog_unavailable");
  }
  let table;
  try {
    table = await resolveTable.call(catalog);
  } catch {
    throw new AreaCreatureSpecialAbilityListCatalogAdmissionError("table_lookup_failed");
  }
  if (!table || !isExactEffectiveCreatureSpecialAbilitiesTwoDaTable(table)) {
    throw new AreaCreatureSpecialAbilityListCatalogAdmissionError("source_unavailable");
  }
  const rows = new Map(table.rows
    .filter((row) => row.displaySource === "strref")
    .map((row) => [row.rowIndex, row]));
  for (const mutation of specialAbilityLists) {
    if (table.descriptor.resourceName !== "spells.2da" ||
      table.descriptor.sha256 !== mutation.tableSha256 ||
      table.descriptor.rowCount !== mutation.rowCount) {
      throw new AreaCreatureSpecialAbilityListCatalogAdmissionError("draft_source_changed");
    }
    const profile = [...mutation.expectedEntries, ...mutation.entries];
    if (profile.some((entry) => !rows.has(entry.spellId))) {
      throw new AreaCreatureSpecialAbilityListCatalogAdmissionError("row_missing");
    }
    if (profile.some((entry) => {
      const row = rows.get(entry.spellId)!;
      return row.userType === 1
        ? entry.casterLevel < 1 || entry.casterLevel > 15
        : entry.casterLevel !== 0;
    })) {
      throw new AreaCreatureSpecialAbilityListCatalogAdmissionError("profile_invalid");
    }
  }
}
