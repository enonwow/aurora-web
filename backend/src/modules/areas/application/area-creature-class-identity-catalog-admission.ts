import type {
  EffectiveCreatureClassesTwoDaTableResult,
  EffectiveCreatureStartingPackagesTwoDaTableResult,
  TemplateCatalogRepositoryPort,
} from "../../catalog/application/ports/template-catalog-repository.port";

export type AreaCreatureClassIdentityCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "table_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "class_row_not_admitted"
  | "package_row_not_admitted";

export type AreaCreatureClassIdentityCatalogResource = "classes.2da" | "packages.2da";
export type AreaCreatureClassIdentityCatalogPhase = "source" | "target";

export class AreaCreatureClassIdentityCatalogAdmissionError extends Error {
  constructor(
    readonly reason: AreaCreatureClassIdentityCatalogAdmissionFailureReason,
    readonly resource?: AreaCreatureClassIdentityCatalogResource,
    readonly phase?: AreaCreatureClassIdentityCatalogPhase,
    readonly targetRow?: number,
  ) {
    super(`Creature class-identity catalog admission failed: ${reason}.`);
    this.name = "AreaCreatureClassIdentityCatalogAdmissionError";
  }
}

export interface AreaCreatureClassIdentityCatalogBoundMutation {
  readonly kind: string;
  readonly classIdentity?: {
    readonly expectedClassIds: readonly number[];
    readonly classIds: readonly number[];
    readonly expectedStartingPackage: number;
    readonly startingPackage: number;
    readonly classesTableSha256: string;
    readonly classesRowCount: number;
    readonly packagesTableSha256: string;
    readonly packagesRowCount: number;
  };
  readonly classSlotResize?: {
    readonly expectedClassIds: readonly number[];
    readonly classIds: readonly number[];
    readonly expectedStartingPackage: number;
    readonly startingPackage: number;
    readonly classesTableSha256: string;
    readonly classesRowCount: number;
    readonly packagesTableSha256: string;
    readonly packagesRowCount: number;
  };
}

type ClassIdentityCatalog = Pick<
  TemplateCatalogRepositoryPort,
  | "resolveEffectiveCreatureClassesTwoDaTable"
  | "resolveEffectiveCreatureStartingPackagesTwoDaTable"
>;

export async function admitCreatureClassIdentityCatalogMutations(
  mutations: readonly AreaCreatureClassIdentityCatalogBoundMutation[],
  catalog: ClassIdentityCatalog,
): Promise<void> {
  const classIdentityMutations = mutations.flatMap((mutation) => {
    if (mutation.kind !== "creature") return [];
    return mutation.classIdentity ? [mutation.classIdentity]
      : mutation.classSlotResize ? [mutation.classSlotResize]
        : [];
  });
  if (classIdentityMutations.length === 0) return;

  const resolveClasses = catalog.resolveEffectiveCreatureClassesTwoDaTable;
  const resolvePackages = catalog.resolveEffectiveCreatureStartingPackagesTwoDaTable;
  if (!resolveClasses || !resolvePackages) {
    throw new AreaCreatureClassIdentityCatalogAdmissionError("catalog_unavailable");
  }

  let classesTable: EffectiveCreatureClassesTwoDaTableResult | null;
  try {
    classesTable = await resolveClasses.call(catalog);
  } catch {
    throw new AreaCreatureClassIdentityCatalogAdmissionError(
      "table_lookup_failed",
      "classes.2da",
    );
  }
  if (!classesTable) {
    throw new AreaCreatureClassIdentityCatalogAdmissionError(
      "source_unavailable",
      "classes.2da",
    );
  }

  let packagesTable: EffectiveCreatureStartingPackagesTwoDaTableResult | null;
  try {
    packagesTable = await resolvePackages.call(catalog);
  } catch {
    throw new AreaCreatureClassIdentityCatalogAdmissionError(
      "table_lookup_failed",
      "packages.2da",
    );
  }
  if (!packagesTable) {
    throw new AreaCreatureClassIdentityCatalogAdmissionError(
      "source_unavailable",
      "packages.2da",
    );
  }

  const admittedClassRows = new Set(classesTable.rows.map((row) => row.rowIndex));
  for (const mutation of classIdentityMutations) {
    if (classesTable.descriptor.resourceName !== "classes.2da" ||
      classesTable.descriptor.sha256 !== mutation.classesTableSha256 ||
      classesTable.descriptor.rowCount !== mutation.classesRowCount) {
      throw new AreaCreatureClassIdentityCatalogAdmissionError(
        "draft_source_changed",
        "classes.2da",
      );
    }
    if (packagesTable.descriptor.resourceName !== "packages.2da" ||
      packagesTable.descriptor.sha256 !== mutation.packagesTableSha256 ||
      packagesTable.descriptor.rowCount !== mutation.packagesRowCount) {
      throw new AreaCreatureClassIdentityCatalogAdmissionError(
        "draft_source_changed",
        "packages.2da",
      );
    }

    requireClassRows(admittedClassRows, mutation.expectedClassIds, "source");
    requireClassRows(admittedClassRows, mutation.classIds, "target");
    requirePackageRow(
      packagesTable,
      mutation.expectedStartingPackage,
      mutation.expectedClassIds,
      "source",
    );
    requirePackageRow(
      packagesTable,
      mutation.startingPackage,
      mutation.classIds,
      "target",
    );
  }
}

function requireClassRows(
  admittedRows: ReadonlySet<number>,
  rows: readonly number[],
  phase: AreaCreatureClassIdentityCatalogPhase,
): void {
  const missing = rows.find((row) => !admittedRows.has(row));
  if (missing !== undefined) {
    throw new AreaCreatureClassIdentityCatalogAdmissionError(
      "class_row_not_admitted",
      "classes.2da",
      phase,
      missing,
    );
  }
}

function requirePackageRow(
  table: EffectiveCreatureStartingPackagesTwoDaTableResult,
  rowIndex: number,
  classIds: readonly number[],
  phase: AreaCreatureClassIdentityCatalogPhase,
): void {
  if (!table.rows.some((row) => row.rowIndex === rowIndex && classIds.includes(row.classId))) {
    throw new AreaCreatureClassIdentityCatalogAdmissionError(
      "package_row_not_admitted",
      "packages.2da",
      phase,
      rowIndex,
    );
  }
}
