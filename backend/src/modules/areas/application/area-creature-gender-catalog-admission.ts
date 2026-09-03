import type { TemplateCatalogRepositoryPort } from "../../catalog/application/ports/template-catalog-repository.port";

export type AreaCreatureGenderCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "descriptor_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "row_lookup_failed"
  | "compile_source_changed"
  | "row_not_admitted";

export class AreaCreatureGenderCatalogAdmissionError extends Error {
  constructor(
    readonly reason: AreaCreatureGenderCatalogAdmissionFailureReason,
    readonly targetRow?: number,
  ) {
    super(`Creature Gender catalog admission failed: ${reason}.`);
    this.name = "AreaCreatureGenderCatalogAdmissionError";
  }
}

export interface AreaCreatureGenderCatalogBoundMutation {
  readonly kind: string;
  readonly gender?: {
    readonly value: number;
    readonly tableSha256: string;
    readonly rowCount: number;
  };
}

export async function admitCreatureGenderCatalogMutations(
  mutations: readonly AreaCreatureGenderCatalogBoundMutation[],
  catalog: Pick<
    TemplateCatalogRepositoryPort,
    | "resolveEffectiveCreatureGenderTwoDaDescriptor"
    | "resolveEffectiveCreatureGenderTwoDaRow"
  >,
): Promise<void> {
  const genders = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.gender ? [mutation.gender] : []);
  if (genders.length === 0) return;

  const resolveDescriptor = catalog.resolveEffectiveCreatureGenderTwoDaDescriptor;
  const resolveRow = catalog.resolveEffectiveCreatureGenderTwoDaRow;
  if (!resolveDescriptor || !resolveRow) {
    throw new AreaCreatureGenderCatalogAdmissionError("catalog_unavailable");
  }

  let descriptor;
  try {
    descriptor = await resolveDescriptor.call(catalog);
  } catch {
    throw new AreaCreatureGenderCatalogAdmissionError("descriptor_lookup_failed");
  }
  if (!descriptor) {
    throw new AreaCreatureGenderCatalogAdmissionError("source_unavailable");
  }

  for (const gender of genders) {
    if (
      descriptor.resourceName !== "gender.2da" ||
      descriptor.sha256 !== gender.tableSha256 ||
      descriptor.rowCount !== gender.rowCount
    ) {
      throw new AreaCreatureGenderCatalogAdmissionError("draft_source_changed");
    }
  }

  const uniqueTargets = [...new Set(genders.map((gender) => gender.value))];
  for (const targetRow of uniqueTargets) {
    let result;
    try {
      result = await resolveRow.call(catalog, targetRow);
    } catch {
      throw new AreaCreatureGenderCatalogAdmissionError("row_lookup_failed", targetRow);
    }
    if (
      !result ||
      result.descriptor.resourceName !== "gender.2da" ||
      result.descriptor.sha256 !== descriptor.sha256 ||
      result.descriptor.rowCount !== descriptor.rowCount
    ) {
      throw new AreaCreatureGenderCatalogAdmissionError("compile_source_changed", targetRow);
    }
    if (!result.row || result.row.rowIndex !== targetRow) {
      throw new AreaCreatureGenderCatalogAdmissionError("row_not_admitted", targetRow);
    }
  }
}
