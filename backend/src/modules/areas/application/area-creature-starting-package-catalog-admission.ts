import type { TemplateCatalogRepositoryPort } from
  "../../catalog/application/ports/template-catalog-repository.port";

export type AreaCreatureStartingPackageCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "table_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "row_not_admitted";

export class AreaCreatureStartingPackageCatalogAdmissionError extends Error {
  constructor(
    readonly reason: AreaCreatureStartingPackageCatalogAdmissionFailureReason,
    readonly targetRow?: number,
  ) {
    super(`Creature StartingPackage catalog admission failed: ${reason}.`);
    this.name = "AreaCreatureStartingPackageCatalogAdmissionError";
  }
}

export interface AreaCreatureStartingPackageCatalogBoundMutation {
  readonly kind: string;
  readonly startingPackage?: {
    readonly value: number;
    readonly expectedClassIds: readonly number[];
    readonly tableSha256: string;
    readonly rowCount: number;
  };
}

export async function admitCreatureStartingPackageCatalogMutations(
  mutations: readonly AreaCreatureStartingPackageCatalogBoundMutation[],
  catalog: Pick<
    TemplateCatalogRepositoryPort,
    "resolveEffectiveCreatureStartingPackagesTwoDaTable"
  >,
): Promise<void> {
  const startingPackages = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.startingPackage
      ? [mutation.startingPackage]
      : []);
  if (startingPackages.length === 0) return;
  const resolveTable = catalog.resolveEffectiveCreatureStartingPackagesTwoDaTable;
  if (!resolveTable) {
    throw new AreaCreatureStartingPackageCatalogAdmissionError("catalog_unavailable");
  }
  let table;
  try {
    table = await resolveTable.call(catalog);
  } catch {
    throw new AreaCreatureStartingPackageCatalogAdmissionError("table_lookup_failed");
  }
  if (!table) throw new AreaCreatureStartingPackageCatalogAdmissionError("source_unavailable");
  for (const startingPackage of startingPackages) {
    if (table.descriptor.resourceName !== "packages.2da" ||
      table.descriptor.sha256 !== startingPackage.tableSha256 ||
      table.descriptor.rowCount !== startingPackage.rowCount) {
      throw new AreaCreatureStartingPackageCatalogAdmissionError("draft_source_changed");
    }
    if (!table.rows.some((row) => row.rowIndex === startingPackage.value &&
      startingPackage.expectedClassIds.includes(row.classId))) {
      throw new AreaCreatureStartingPackageCatalogAdmissionError(
        "row_not_admitted",
        startingPackage.value,
      );
    }
  }
}
