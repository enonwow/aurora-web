import type { TemplateCatalogRepositoryPort } from
  "../../catalog/application/ports/template-catalog-repository.port";

export type AreaCreaturePhenotypeCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "descriptor_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "appearance_source_changed"
  | "row_lookup_failed"
  | "compile_source_changed"
  | "row_not_admitted"
  | "appearance_lookup_failed"
  | "appearance_not_player_model";

export class AreaCreaturePhenotypeCatalogAdmissionError extends Error {
  constructor(
    readonly reason: AreaCreaturePhenotypeCatalogAdmissionFailureReason,
    readonly targetRow?: number,
  ) {
    super(`Creature Phenotype catalog admission failed: ${reason}.`);
    this.name = "AreaCreaturePhenotypeCatalogAdmissionError";
  }
}

export interface AreaCreaturePhenotypeCatalogBoundMutation {
  readonly kind: string;
  readonly phenotype?: {
    readonly value: number;
    readonly tableSha256: string;
    readonly rowCount: number;
    readonly appearanceExpectedValue: number;
    readonly appearanceTableSha256: string;
    readonly appearanceRowCount: number;
  };
}

type PhenotypeCatalogPort = Pick<
  TemplateCatalogRepositoryPort,
  | "resolveEffectiveCreaturePhenotypeTwoDaDescriptor"
  | "resolveEffectiveCreaturePhenotypeTwoDaRow"
  | "resolveEffectiveCreatureAppearanceTwoDaDescriptor"
  | "resolveCreatureAppearanceProfile"
>;

export async function admitCreaturePhenotypeCatalogMutations(
  mutations: readonly AreaCreaturePhenotypeCatalogBoundMutation[],
  catalog: PhenotypeCatalogPort,
): Promise<void> {
  const phenotypes = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.phenotype ? [mutation.phenotype] : []);
  if (phenotypes.length === 0) return;
  const resolvePhenotypeDescriptor = catalog.resolveEffectiveCreaturePhenotypeTwoDaDescriptor;
  const resolvePhenotypeRow = catalog.resolveEffectiveCreaturePhenotypeTwoDaRow;
  const resolveAppearanceDescriptor = catalog.resolveEffectiveCreatureAppearanceTwoDaDescriptor;
  const resolveAppearanceProfile = catalog.resolveCreatureAppearanceProfile;
  if (!resolvePhenotypeDescriptor || !resolvePhenotypeRow ||
    !resolveAppearanceDescriptor || !resolveAppearanceProfile) {
    throw new AreaCreaturePhenotypeCatalogAdmissionError("catalog_unavailable");
  }

  let phenotypeDescriptor;
  let appearanceDescriptor;
  try {
    [phenotypeDescriptor, appearanceDescriptor] = await Promise.all([
      resolvePhenotypeDescriptor.call(catalog),
      resolveAppearanceDescriptor.call(catalog),
    ]);
  } catch {
    throw new AreaCreaturePhenotypeCatalogAdmissionError("descriptor_lookup_failed");
  }
  if (!phenotypeDescriptor || !appearanceDescriptor) {
    throw new AreaCreaturePhenotypeCatalogAdmissionError("source_unavailable");
  }
  for (const phenotype of phenotypes) {
    if (
      phenotypeDescriptor.resourceName !== "phenotype.2da" ||
      phenotypeDescriptor.sha256 !== phenotype.tableSha256 ||
      phenotypeDescriptor.rowCount !== phenotype.rowCount
    ) throw new AreaCreaturePhenotypeCatalogAdmissionError("draft_source_changed");
    if (
      appearanceDescriptor.resourceName !== "appearance.2da" ||
      appearanceDescriptor.sha256 !== phenotype.appearanceTableSha256 ||
      appearanceDescriptor.rowCount !== phenotype.appearanceRowCount
    ) throw new AreaCreaturePhenotypeCatalogAdmissionError("appearance_source_changed");
  }

  const uniqueTargets = [...new Set(phenotypes.map((phenotype) => phenotype.value))];
  for (const targetRow of uniqueTargets) {
    let result;
    try {
      result = await resolvePhenotypeRow.call(catalog, targetRow);
    } catch {
      throw new AreaCreaturePhenotypeCatalogAdmissionError("row_lookup_failed", targetRow);
    }
    if (!result || result.descriptor.sha256 !== phenotypeDescriptor.sha256 ||
      result.descriptor.rowCount !== phenotypeDescriptor.rowCount) {
      throw new AreaCreaturePhenotypeCatalogAdmissionError("compile_source_changed", targetRow);
    }
    if (!result.row || result.row.rowIndex !== targetRow) {
      throw new AreaCreaturePhenotypeCatalogAdmissionError("row_not_admitted", targetRow);
    }
  }

  const uniqueAppearances = [...new Set(
    phenotypes.map((phenotype) => phenotype.appearanceExpectedValue),
  )];
  for (const appearanceType of uniqueAppearances) {
    let profile;
    try {
      profile = await resolveAppearanceProfile.call(catalog, appearanceType);
    } catch {
      throw new AreaCreaturePhenotypeCatalogAdmissionError(
        "appearance_lookup_failed", appearanceType,
      );
    }
    if (
      !profile ||
      profile.appearanceType !== appearanceType ||
      profile.appearanceSource2daRow !== appearanceType ||
      profile.appearanceSourceKey !== appearanceDescriptor.sourceObjectKey ||
      profile.modelType !== "P"
    ) {
      throw new AreaCreaturePhenotypeCatalogAdmissionError(
        "appearance_not_player_model", appearanceType,
      );
    }
  }
}
